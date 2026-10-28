// Genera con Workers AI (FLUX, 4 passi) le foto dei prompt in foto-prompt.json che non sono ancora in foto.json,
// le carica in R2 con la miniatura, aggiorna foto.json e scrive foto.sql per collegarle alle ricette senza foto.
// Le chiavi 'sfida:<titolo>' sono le foto di esempio delle sfide: chiave già scritta in public/sfide.js, niente SQL.
// uso (cwd worker/seed, token con Workers AI e R2): node genera-foto.mjs && npx wrangler@4 d1 execute chez-moi-db --remote --file foto.sql
// Quota gratuita ~100 foto al giorno: oltre, Cloudflare rifiuta (4006) e lo script si ferma; rilanciarlo riprende da dove era.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const STILE = 'Professional editorial food photography for a fine dining cookbook, dark moody background of slate and walnut, ' +
  'soft natural side light, 50mm lens, shallow depth of field, appetizing, photorealistic, no text, no people';
const prompt = JSON.parse(readFileSync('foto-prompt.json', 'utf8'));
const foto = JSON.parse(readFileSync('foto.json', 'utf8'));
const uuid = s => createHash('sha1').update(s).digest('hex').slice(0, 32).replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
const q = s => `'${s.replace(/'/g, "''")}'`;
const url = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/black-forest-labs/flux-1-schnell`;
const put = (k, file) => execFileSync('npx', ['-y', 'wrangler@4.149.0', 'r2', 'object', 'put', `chez-moi-foto/${k}`, '--remote', '--file', file, '--content-type', 'image/jpeg'], { stdio: 'inherit' });
const sql = [];

for (const [t, p] of Object.entries(prompt)) {
  if (foto[t]) continue;
  const r = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` }, body: JSON.stringify({ prompt: `${p}. ${STILE}`, steps: 4 }) });
  const j = await r.json();
  if (!j.success) {
    console.error(t, JSON.stringify(j.errors));
    if (JSON.stringify(j.errors).includes('4006')) break;
    continue;
  }
  writeFileSync('ai.jpg', Buffer.from(j.result.image, 'base64'));
  // 4:3 al centro, come le altre foto del seed
  execFileSync('convert', ['ai.jpg', '-gravity', 'center', '-crop', '4:3', '+repage', '-resize', '1200x900>', '-strip', '-quality', '85', 'foto.jpg']);
  execFileSync('convert', ['foto.jpg', '-resize', '640x', '-quality', '80', 'mini.jpg']);
  const sfida = t.startsWith('sfida:');
  const k = `foto/${uuid(sfida ? t : 'ai:' + t)}`;
  put(k, 'foto.jpg');
  put(k.replace(/^foto\//, 'mini/'), 'mini.jpg');
  foto[t] = { foto: k, credito: 'immagine generata con AI (FLUX, Workers AI)', prompt: p };
  writeFileSync('foto.json', JSON.stringify(foto, null, 1));
  if (!sfida) sql.push(`update ricette set foto = ${q(k)}, foto_credito = ${q(foto[t].credito)} where id = ${q(uuid(t))} and foto is null;`);
  console.log('ok', t);
}
writeFileSync('foto.sql', sql.join('\n') + '\n');
