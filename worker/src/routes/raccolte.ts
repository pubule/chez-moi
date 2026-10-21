import { Hono } from 'hono';
import type { AppEnv } from '../lib/auth';
import { cancellaFoto, isChiaveFoto } from './foto';

// Diario e ricette: stessa forma (lista, salva con sovrascrittura completa, elimina).
// Il client manda sempre il modulo intero, quindi PUT sovrascrive tutti i campi.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

type Riga = Record<string, string | number | null>;
type Valida = (b: any) => Riga | string; // riga pulita o messaggio d'errore

const testo = (v: unknown, max: number) => (typeof v === 'string' && v.length <= max ? v.trim() : null);
const opzionale = (v: unknown, max: number) => (v == null || v === '' ? null : testo(v, max));

function fotoValida(v: unknown): string | null | undefined {
  if (v == null) return null;
  return typeof v === 'string' && isChiaveFoto(v) ? v : undefined;
}

export const validaDiario: Valida = (b) => {
  const piatto = testo(b.piatto, 200);
  if (!piatto) return 'Scrivi il nome del piatto.';
  if (typeof b.data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(b.data)) return 'Data non valida.';
  if (!Number.isInteger(b.voto) || b.voto < 1 || b.voto > 5) return 'Il voto va da 1 a 5.';
  const note = testo(b.note ?? '', 5000);
  if (note == null) return 'Note troppo lunghe.';
  const foto = fotoValida(b.foto);
  if (foto === undefined) return 'Foto non valida.';
  return { piatto, data: b.data, voto: b.voto, note, sfida: opzionale(b.sfida, 200), settimana: opzionale(b.settimana, 10), foto };
};

export const validaRicetta: Valida = (b) => {
  const titolo = testo(b.titolo, 200);
  if (!titolo) return 'Scrivi il titolo della ricetta.';
  const ingredienti = testo(b.ingredienti ?? '', 10000);
  const procedimento = testo(b.procedimento ?? '', 20000);
  if (ingredienti == null || procedimento == null) return 'Testo troppo lungo.';
  const video = testo(b.video ?? '', 500);
  if (video == null || (video && !/^https:\/\//.test(video))) return 'Il link del video deve iniziare con https://';
  const foto = fotoValida(b.foto);
  if (foto === undefined) return 'Foto non valida.';
  return { titolo, ingredienti, procedimento, video, foto };
};

export function raccolta(tabella: 'diario' | 'ricette', valida: Valida, ordine: string) {
  const r = new Hono<AppEnv>();

  r.get('/', async (c) => {
    const { results } = await c.env.DB.prepare(`select * from ${tabella} order by ${ordine}`).all();
    return c.json(results);
  });

  r.put('/:id', async (c) => {
    const id = c.req.param('id');
    if (!UUID.test(id)) return c.json({ error: 'id non valido' }, 400);
    const riga = valida(await c.req.json().catch(() => ({})));
    if (typeof riga === 'string') return c.json({ error: riga }, 400);
    const prima = await c.env.DB.prepare(`select foto from ${tabella} where id = ?`).bind(id).first<{ foto: string | null }>();
    const campi = Object.keys(riga);
    await c.env.DB.prepare(
      `insert into ${tabella} (id, ${campi.join(', ')}) values (?, ${campi.map(() => '?').join(', ')})
       on conflict(id) do update set ${campi.map((k) => `${k} = excluded.${k}`).join(', ')}`,
    ).bind(id, ...Object.values(riga)).run();
    if (prima?.foto && prima.foto !== riga.foto) await cancellaFoto(c.env, prima.foto);
    return c.json({ id, ...riga });
  });

  r.delete('/:id', async (c) => {
    const riga = await c.env.DB.prepare(`delete from ${tabella} where id = ? returning foto`).bind(c.req.param('id')).first<{ foto: string | null }>();
    if (!riga) return c.json({ error: 'non trovato' }, 404);
    if (riga.foto) await cancellaFoto(c.env, riga.foto);
    return c.json({ ok: true });
  });

  return r;
}
