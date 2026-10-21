// Logica pura, senza DOM: testata da test.mjs

export function settimana(d = new Date()) {
  // numero di settimana ISO, unico per anno (es. 2026-43)
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const giorno = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - giorno);
  const inizio = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const n = Math.ceil(((t - inizio) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-${n}`;
}

export function sfidaDellaSettimana(sfide, attrezzi, chiave, salto = 0) {
  const ok = sfide.filter(s => s.attrezzi.every(a => attrezzi.includes(a)));
  if (!ok.length) return null;
  let h = 0;
  for (const c of chiave) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return ok[(h + salto) % ok.length];
}

export function youtubeId(url) {
  const m = String(url || '').match(/(?:youtu\.be\/|[?&]v=|\/shorts\/|\/embed\/)([\w-]{11})/);
  return m ? m[1] : null;
}
