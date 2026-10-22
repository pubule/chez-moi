// node worker/seed/genera-sql.mjs > seed.sql
// npx wrangler d1 execute chez-moi-db --remote --file seed.sql
// id ricavato dal titolo: rilanciarlo non duplica e non sovrascrive le ricette già modificate nell'app.
// Le foto (foto.json) sono già in R2 sotto la loro chiave: qui si collegano solo alle ricette ancora senza foto.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import ricette from './ricette.mjs';

const foto = JSON.parse(readFileSync(new URL('./foto.json', import.meta.url), 'utf8'));
const q = s => `'${s.replace(/'/g, "''")}'`;
const id = t => createHash('sha1').update(t).digest('hex').slice(0, 32).replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');

for (const r of ricette) {
  const e = (r.e ?? []).join(',');
  console.log(`insert into ricette (id, titolo, categoria, etichette, ingredienti, procedimento) values (${q(id(r.t))}, ${q(r.t)}, ${q(r.c)}, ${q(e)}, ${q(r.i.join('\n'))}, ${q(r.p.join('\n'))}) on conflict(id) do nothing;`);
  // etichette aggiunte dopo il primo caricamento: solo dove Fabio non ne ha messe
  if (e) console.log(`update ricette set etichette = ${q(e)} where id = ${q(id(r.t))} and etichette = '';`);
  const f = foto[r.t];
  if (f) console.log(`update ricette set foto = ${q(f.foto)}, foto_credito = ${q(f.credito)} where id = ${q(id(r.t))} and foto is null;`);
}
