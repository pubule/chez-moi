import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { app } from '../src/index';
import { creaRicetta, LIMITE_GIORNO, Rifiuto } from '../src/routes/chef';
import { LIMITE_FOTO_AI } from '../src/routes/foto';

const call = (path: string, init: RequestInit = {}, over: Record<string, unknown> = {}) => app.request(path, init, { ...env, ...over });
const json = (method: string, body: unknown): RequestInit => ({ method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const id = () => crypto.randomUUID();
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);

describe('accesso', () => {
  it('/health è aperto', async () => {
    expect((await call('/health', {}, { DEV_EMAIL: undefined })).status).toBe(200);
  });
  it('401 senza JWT di Access', async () => {
    expect((await call('/api/diario', {}, { DEV_EMAIL: undefined })).status).toBe(401);
  });
  it('401 con una mail non ammessa', async () => {
    expect((await call('/api/diario', {}, { DEV_EMAIL: 'altro@test.local' })).status).toBe(401);
  });
});

describe('diario', () => {
  const piatto = { piatto: 'Uovo 63°', data: '2026-10-21', voto: 4, note: 'ok', sfida: 'Uovo a 63°', settimana: '2026-43', foto: null };

  it('salva, sovrascrive, elenca ed elimina', async () => {
    const k = id();
    expect((await call(`/api/diario/${k}`, json('PUT', piatto))).status).toBe(200);
    expect((await call(`/api/diario/${k}`, json('PUT', { ...piatto, note: '', sfida: null }))).status).toBe(200);
    const lista = await (await call('/api/diario')).json<any[]>();
    expect(lista.find((d) => d.id === k)).toMatchObject({ piatto: 'Uovo 63°', note: '', sfida: null, voto: 4 });
    expect((await call(`/api/diario/${k}`, { method: 'DELETE' })).status).toBe(200);
    expect((await call(`/api/diario/${k}`, { method: 'DELETE' })).status).toBe(404);
  });

  it('rifiuta dati non validi', async () => {
    for (const cattivo of [{ ...piatto, voto: 6 }, { ...piatto, piatto: ' ' }, { ...piatto, data: 'ieri' }, { ...piatto, foto: 'backups/tutto.json' }]) {
      expect((await call(`/api/diario/${id()}`, json('PUT', cattivo))).status).toBe(400);
    }
    expect((await call('/api/diario/non-un-uuid', json('PUT', piatto))).status).toBe(400);
  });
});

describe('ricette e foto', () => {
  it('accetta solo immagini vere e cancella la foto sostituita o eliminata', async () => {
    expect((await call('/api/foto', { method: 'POST', body: '<svg onload=alert(1)>' })).status).toBe(400);
    const { foto: a } = await (await call('/api/foto', { method: 'POST', body: JPEG })).json<{ foto: string }>();
    const { foto: b } = await (await call('/api/foto', { method: 'POST', body: JPEG })).json<{ foto: string }>();
    const r = await call(`/api/${a}`);
    expect(r.headers.get('content-type')).toBe('image/jpeg');
    expect(r.headers.get('x-content-type-options')).toBe('nosniff');
    await r.arrayBuffer(); // un body R2 non letto rompe lo storage isolato dei test

    const k = id();
    const ricetta = { titolo: 'Anatra', ingredienti: '', procedimento: '', video: 'https://youtu.be/dQw4w9WgXcQ', foto: a };
    await call(`/api/ricette/${k}`, json('PUT', ricetta));
    await call(`/api/ricette/${k}`, json('PUT', { ...ricetta, foto: b }));
    expect(await env.FOTO.get(a)).toBeNull();
    await call(`/api/ricette/${k}`, { method: 'DELETE' });
    expect(await env.FOTO.get(b)).toBeNull();
  });

  it('serve la miniatura con ?mini, la foto intera se manca, e le cancella insieme', async () => {
    const { foto } = await (await call('/api/foto', { method: 'POST', body: JPEG })).json<{ foto: string }>();
    const MINI = new Uint8Array([0xff, 0xd8, 0xff, 0xe1]);
    expect(new Uint8Array(await (await call(`/api/${foto}?mini`)).arrayBuffer())).toEqual(JPEG);
    expect((await call(`/api/${foto}/mini`, { method: 'POST', body: MINI })).status).toBe(200);
    expect(new Uint8Array(await (await call(`/api/${foto}?mini`)).arrayBuffer())).toEqual(MINI);
    expect((await call(`/api/foto/${id()}/mini`, { method: 'POST', body: MINI })).status).toBe(404);
    expect((await call(`/api/${foto}/mini`, { method: 'POST', body: '<svg>' })).status).toBe(400);

    const k = id();
    await call(`/api/ricette/${k}`, json('PUT', { titolo: 'x', foto }));
    await call(`/api/ricette/${k}`, { method: 'DELETE' });
    expect(await env.FOTO.get(foto.replace('foto/', 'mini/'))).toBeNull();
  });

  it('salva la categoria, vuota se manca', async () => {
    const k = id();
    await call(`/api/ricette/${k}`, json('PUT', { titolo: 'Gazpacho', categoria: 'Antipasti' }));
    const j = id();
    await call(`/api/ricette/${j}`, json('PUT', { titolo: 'Senza' }));
    const lista = await (await call('/api/ricette')).json<any[]>();
    expect(lista.find((r) => r.id === k).categoria).toBe('Antipasti');
    expect(lista.find((r) => r.id === j).categoria).toBe('');
    expect((await call(`/api/ricette/${id()}`, json('PUT', { titolo: 'x', categoria: 'x'.repeat(61) }))).status).toBe(400);
  });

  it('salva le etichette note in ordine fisso e rifiuta le altre', async () => {
    const k = id();
    const r = await (await call(`/api/ricette/${k}`, json('PUT', { titolo: 'Hummus', etichette: 'vegetariana, fit' }))).json<any>();
    expect(r.etichette).toBe('fit,vegetariana');
    const senza = await (await call(`/api/ricette/${id()}`, json('PUT', { titolo: 'x' }))).json<any>();
    expect(senza.etichette).toBe('');
    expect((await call(`/api/ricette/${id()}`, json('PUT', { titolo: 'x', etichette: 'keto' }))).status).toBe(400);
  });

  it('salva i valori per porzione, vuoti se mancano, e rifiuta quelli non interi', async () => {
    const valori = { porzioni: 4, kcal: 633, proteine: 27, carboidrati: 66, grassi: 29 };
    const r = await (await call(`/api/ricette/${id()}`, json('PUT', { titolo: 'Carbonara', ...valori }))).json<any>();
    expect(r).toMatchObject(valori);
    const vuota = await (await call(`/api/ricette/${id()}`, json('PUT', { titolo: 'x', kcal: '' }))).json<any>();
    expect(vuota).toMatchObject({ porzioni: null, kcal: null, proteine: null });
    for (const cattivo of [{ kcal: 1.5 }, { grassi: -1 }, { porzioni: 0 }, { proteine: '27' }]) {
      expect((await call(`/api/ricette/${id()}`, json('PUT', { titolo: 'x', ...cattivo }))).status).toBe(400);
    }
  });

  it('il credito della foto sparisce insieme alla foto', async () => {
    const { foto } = await (await call('/api/foto', { method: 'POST', body: JPEG })).json<{ foto: string }>();
    const k = id();
    const con = await (await call(`/api/ricette/${k}`, json('PUT', { titolo: 'x', foto, foto_credito: 'Mario, CC BY 2.0' }))).json<any>();
    expect(con.foto_credito).toBe('Mario, CC BY 2.0');
    const senza = await (await call(`/api/ricette/${k}`, json('PUT', { titolo: 'x', foto: null, foto_credito: 'Mario, CC BY 2.0' }))).json<any>();
    expect(senza.foto_credito).toBe('');
  });

  it('il video deve essere un link https', async () => {
    const r = await call(`/api/ricette/${id()}`, json('PUT', { titolo: 'x', video: 'javascript:alert(1)' }));
    expect(r.status).toBe(400);
  });

  it('non serve file fuori da foto/', async () => {
    expect((await call('/api/foto/..%2Fbackups')).status).toBe(404);
  });
});

describe('foto con AI', () => {
  const genera = (corpo: unknown, AI: unknown) => call('/api/foto/genera', json('POST', corpo), { AI });
  const aiOk = (byte: Uint8Array) => ({ run: async () => ({ image: btoa(String.fromCharCode(...byte)) }) });

  it('salva in R2 la foto generata', async () => {
    let chiesto: any;
    const AI = { run: async (m: string, p: any) => { chiesto = { m, p }; return { image: btoa(String.fromCharCode(...JPEG)) }; } };
    const r = await genera({ descrizione: 'Risotto alla milanese' }, AI);
    const { foto } = await r.json<{ foto: string }>();
    expect(foto).toMatch(/^foto\//);
    expect(chiesto.m).toBe('@cf/black-forest-labs/flux-1-schnell');
    expect(chiesto.p.prompt).toContain('Risotto alla milanese');
    expect(new Uint8Array(await (await env.FOTO.get(foto))!.arrayBuffer())).toEqual(JPEG);
  });

  it('rifiuta descrizioni vuote e immagini non valide', async () => {
    expect((await genera({ descrizione: ' ' }, aiOk(JPEG))).status).toBe(400);
    expect((await genera({ descrizione: 'x'.repeat(601) }, aiOk(JPEG))).status).toBe(400);
    expect((await genera({ descrizione: 'x' }, aiOk(new TextEncoder().encode('<svg>')))).status).toBe(502);
  });

  it('quota di Cloudflare finita: 429 con un messaggio chiaro', async () => {
    const AI = { run: async () => { throw new Error('AiError: 4006: you have used up your daily free allocation'); } };
    expect((await genera({ descrizione: 'x' }, AI)).status).toBe(429);
  });

  it('si ferma oltre il tetto giornaliero', async () => {
    const giorno = `foto:${new Date().toISOString().slice(0, 10)}`;
    await env.DB.prepare('insert or replace into ai_usage (giorno, n) values (?, ?)').bind(giorno, LIMITE_FOTO_AI).run();
    expect((await genera({ descrizione: 'x' }, aiOk(JPEG))).status).toBe(429);
  });
});

describe('chef', () => {
  const richiesta = { ingredienti: 'uova', richiesta: '', attrezzi: ['Roner (sottovuoto)'] };

  it('senza chiave risponde 503', async () => {
    expect((await call('/api/chef', json('POST', richiesta), { ANTHROPIC_API_KEY: '' })).status).toBe(503);
  });

  it('si ferma oltre il tetto giornaliero', async () => {
    const oggi = new Date().toISOString().slice(0, 10);
    await env.DB.prepare('insert or replace into ai_usage (giorno, n) values (?, ?)').bind(oggi, LIMITE_GIORNO).run();
    const r = await call('/api/chef', json('POST', richiesta), { ANTHROPIC_API_KEY: 'sk-test' });
    expect(r.status).toBe(429);
  });

  it('chiede JSON strutturato con il ripiego e legge la ricetta', async () => {
    let inviato: any;
    const ricetta = { titolo: 'Uovo', descrizione: '', tempo: '1 ora', ingredienti: ['uova'], passaggi: ['63 °C'], impiattamento: '' };
    const client = { beta: { messages: { create: async (p: any) => { inviato = p; return { stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(ricetta) }] }; } } } };
    expect(await creaRicetta(client, richiesta)).toEqual(ricetta);
    expect(inviato).toMatchObject({ model: 'claude-opus-5-5', fallbacks: 'default', betas: ['server-side-fallback-2026-07-01'] });
    expect(inviato.output_config.format.type).toBe('json_schema');
  });

  it('un rifiuto diventa un messaggio comprensibile', async () => {
    const client = { beta: { messages: { create: async () => ({ stop_reason: 'refusal', content: [] }) } } };
    await expect(creaRicetta(client, richiesta)).rejects.toBeInstanceOf(Rifiuto);
  });
});
