// SQL che aggiorna ingredienti e passaggi delle ricette del seed cambiate, solo se Fabio non le ha modificate nell'app.
// uso: git show HEAD:worker/seed/ricette.mjs > vecchie.mjs
//      node worker/seed/aggiorna-sql.mjs vecchie.mjs worker/seed/ricette.mjs > aggiorna.sql
//      npx wrangler@4 d1 execute chez-moi-db --remote --file aggiorna.sql
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
const [vecchie, nuove] = await Promise.all(process.argv.slice(2, 4).map(p => import(pathToFileURL(p)).then(m => m.default)));
const q = s => `'${s.replace(/'/g, "''")}'`;
const id = t => createHash('sha1').update(t).digest('hex').slice(0, 32).replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
const prima = new Map(vecchie.map(r => [r.t, r]));
let n = 0;
for (const r of nuove) {
  const v = prima.get(r.t);
  if (!v) continue;
  const [vi, vp, ni, np] = [v.i.join('\n'), v.p.join('\n'), r.i.join('\n'), r.p.join('\n')];
  if (vi === ni && vp === np) continue;
  n++;
  console.log(`update ricette set ingredienti = ${q(ni)}, procedimento = ${q(np)} where id = ${q(id(r.t))} and ingredienti = ${q(vi)} and procedimento = ${q(vp)};`);
}
console.error(n, 'ricette cambiate');
