import Anthropic from '@anthropic-ai/sdk';
import { Hono } from 'hono';
import type { AppEnv } from '../lib/auth';

// Ogni richiesta costa qualche centesimo: oltre questo tetto al giorno lo Chef si ferma.
export const LIMITE_GIORNO = 20;

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['titolo', 'descrizione', 'tempo', 'ingredienti', 'passaggi', 'impiattamento'],
  properties: {
    titolo: { type: 'string' },
    descrizione: { type: 'string' },
    tempo: { type: 'string' },
    ingredienti: { type: 'array', items: { type: 'string' } },
    passaggi: { type: 'array', items: { type: 'string' } },
    impiattamento: { type: 'string' },
  },
};

const SISTEMA =
  'Sei uno chef di alta cucina. Aiuti un cuoco amatoriale esperto, che ha fatto corsi professionali, a ritrovare la passione per la cucina. ' +
  'Proponi una sola ricetta gourmet ma realizzabile in una cucina di casa, che metta in pratica una tecnica interessante. ' +
  'Usa gli attrezzi disponibili quando hanno senso. Per le cotture sottovuoto indica temperature e tempi sicuri dal punto di vista alimentare. ' +
  'Dosi in grammi. Scrivi in italiano.';

export type Richiesta = { ingredienti: string; richiesta: string; attrezzi: string[] };
export type Ricetta = { titolo: string; descrizione: string; tempo: string; ingredienti: string[]; passaggi: string[]; impiattamento: string };

export class Rifiuto extends Error {}

type Client = { beta: { messages: { create: (p: any) => Promise<any> } } };

export async function creaRicetta(client: Client, r: Richiesta): Promise<Ricetta> {
  const msg = await client.beta.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
    system: SISTEMA,
    messages: [{
      role: 'user',
      content: `Ingredienti disponibili: ${r.ingredienti || 'nessun vincolo, sorprendimi'}\nRichiesta: ${r.richiesta || 'nessuna'}\nAttrezzi: ${r.attrezzi.join(', ') || 'solo cucina di base'}`,
    }],
  });
  if (msg.stop_reason === 'refusal') throw new Rifiuto('Lo Chef non può rispondere a questa richiesta: prova a descrivere solo ingredienti e tipo di piatto.');
  if (msg.stop_reason === 'max_tokens') throw new Error('La risposta è stata troncata. Riprova.');
  const testo = msg.content.find((b: { type: string }) => b.type === 'text')?.text;
  return JSON.parse(testo);
}

function leggiRichiesta(b: any): Richiesta | null {
  const s = (v: unknown, max: number) => (v == null ? '' : typeof v === 'string' && v.length <= max ? v.trim() : null);
  const ingredienti = s(b?.ingredienti, 1000);
  const richiesta = s(b?.richiesta, 500);
  const attrezzi = Array.isArray(b?.attrezzi) && b.attrezzi.length <= 20 && b.attrezzi.every((a: unknown) => typeof a === 'string' && a.length <= 60) ? b.attrezzi : null;
  return ingredienti == null || richiesta == null || !attrezzi ? null : { ingredienti, richiesta, attrezzi };
}

export const chefRoutes = new Hono<AppEnv>();

chefRoutes.post('/', async (c) => {
  if (!c.env.ANTHROPIC_API_KEY) return c.json({ error: 'Manca la chiave Anthropic sul server (wrangler secret put ANTHROPIC_API_KEY).' }, 503);
  const r = leggiRichiesta(await c.req.json().catch(() => null));
  if (!r) return c.json({ error: 'Richiesta non valida.' }, 400);

  const oggi = new Date().toISOString().slice(0, 10);
  const uso = await c.env.DB.prepare('insert into ai_usage (giorno, n) values (?, 1) on conflict(giorno) do update set n = n + 1 returning n')
    .bind(oggi).first<{ n: number }>();
  if (uso!.n > LIMITE_GIORNO) return c.json({ error: `Oggi lo Chef ha già proposto ${LIMITE_GIORNO} ricette: torna domani.` }, 429);

  try {
    return c.json(await creaRicetta(new Anthropic({ apiKey: c.env.ANTHROPIC_API_KEY }), r));
  } catch (err) {
    if (err instanceof Rifiuto) return c.json({ error: err.message }, 422);
    if (err instanceof Anthropic.AuthenticationError) return c.json({ error: 'La chiave Anthropic sul server non è valida.' }, 502);
    if (err instanceof Anthropic.RateLimitError) return c.json({ error: 'Troppe richieste ad Anthropic: riprova tra un minuto.' }, 429);
    console.error('chef', String(err));
    return c.json({ error: 'Lo Chef non ha risposto. Riprova tra poco.' }, 502);
  }
});
