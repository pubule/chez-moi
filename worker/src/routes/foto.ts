import { Hono } from 'hono';
import type { AppEnv } from '../lib/auth';
import type { Env } from '../index';

// Le foto stanno in R2 sotto "foto/<uuid>". La chiave non viene mai riusata,
// quindi il browser può tenerle in cache per sempre.

const CHIAVE = /^foto\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const isChiaveFoto = (k: string) => CHIAVE.test(k);
export const cancellaFoto = (env: Env, chiave: string) => (isChiaveFoto(chiave) ? env.FOTO.delete(chiave) : Promise.resolve());

const MAX_BYTE = 8 * 1024 * 1024; // il client le riduce a ~300 KB: è solo un tetto

// Tipo vero dai primi byte, mai quello dichiarato dal client (un SVG o un HTML qui sarebbe XSS).
export function tipoImmagine(b: Uint8Array): string | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (String.fromCharCode(...b.slice(8, 12)) === 'WEBP') return 'image/webp';
  return null;
}

export const fotoRoutes = new Hono<AppEnv>();

fotoRoutes.post('/', async (c) => {
  const byte = new Uint8Array(await c.req.arrayBuffer());
  if (byte.length > MAX_BYTE) return c.json({ error: 'Foto troppo grande.' }, 413);
  const tipo = tipoImmagine(byte);
  if (!tipo) return c.json({ error: 'Il file non è una foto.' }, 400);
  const chiave = `foto/${crypto.randomUUID()}`;
  await c.env.FOTO.put(chiave, byte, { httpMetadata: { contentType: tipo } });
  return c.json({ foto: chiave });
});

fotoRoutes.get('/:id', async (c) => {
  const chiave = `foto/${c.req.param('id')}`;
  if (!isChiaveFoto(chiave)) return c.notFound();
  const ogg = await c.env.FOTO.get(chiave);
  if (!ogg) return c.notFound();
  return new Response(ogg.body, {
    headers: {
      'content-type': ogg.httpMetadata?.contentType ?? 'application/octet-stream',
      'cache-control': 'private, max-age=31536000, immutable',
      'x-content-type-options': 'nosniff',
    },
  });
});
