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

// Ricette scritte a mano: un ingrediente per riga ("320 g riso Carnaroli"), un passaggio per riga.
const DOSE = /^((?:\d+(?:[.,]\d+)?(?:\s*[–\/-]\s*\d+(?:[.,]\d+)?)?|½|mezz[oa])\s*(?:kg|g|ml|cl|dl|l|cucchiai(?:ni|no)?|cucchiaio|spicch[io]|fett[ae]|pizzico|pz)?\.?)\s+(?:di\s+)?(.+)$/i;

export function ingredienti(testo) {
  return righe(testo).map(r => {
    const m = r.match(DOSE);
    return m ? { dose: m[1].trim(), nome: m[2].trim() } : { dose: '', nome: r };
  });
}

export function passaggi(testo) {
  return righe(testo).map(r => r.replace(/^\d+[.)]\s*/, '')).filter(Boolean);
}

// minuti per il timer: il primo tempo citato nel passaggio, l'estremo basso se è un intervallo
export function minuti(passo) {
  const m = String(passo).match(/(\d+(?:[.,]\d+)?)\s*(?:[–-]\s*\d+(?:[.,]\d+)?\s*)?(minut[oi]|min|m|ore|ora|h)\b/i);
  if (!m) return null;
  const n = parseFloat(m[1].replace(',', '.'));
  return /^(ore|ora|h)$/i.test(m[2]) ? n * 60 : n;
}

const righe = t => String(t || '').split('\n').map(r => r.trim()).filter(Boolean);

// etichette dei filtri: chiave salvata nel database e nome mostrato
export const ETICHETTE = { fit: 'Fit', vegetariana: 'Vegetariana' };
export const etichetteDi = r => String(r?.etichette || '').split(',').filter(e => e in ETICHETTE);

// valori per porzione; quote = parte delle calorie dei tre macro (4, 4 e 9 kcal/g), per la barra
export function macroDi(r) {
  if (r?.kcal == null) return null;
  const [p, c, g] = [r.proteine ?? 0, r.carboidrati ?? 0, r.grassi ?? 0];
  const tot = p * 4 + c * 4 + g * 9 || 1;
  return { kcal: r.kcal, porzioni: r.porzioni, p, c, g, quote: [p * 4 / tot, c * 4 / tot, g * 9 / tot].map(x => Math.round(x * 100)) };
}

export const CATEGORIE = ['Cocktail', 'Colazione', 'Antipasti', 'Primi', 'Secondi', 'Sottovuoto', 'Pizza', 'Hamburger', 'Dolci'];

// [[categoria, ricette]] nell'ordine di un menu; le categorie nuove in ordine alfabetico, "Altre" in fondo
export function perCategoria(ricette) {
  const g = new Map();
  for (const r of ricette) {
    const c = r.categoria || 'Altre';
    if (!g.has(c)) g.set(c, []);
    g.get(c).push(r);
  }
  const peso = c => (c === 'Altre' ? 1e9 : CATEGORIE.includes(c) ? CATEGORIE.indexOf(c) : 100);
  return [...g].sort(([a], [b]) => peso(a) - peso(b) || a.localeCompare(b, 'it'));
}

// una casella per settimana dell'anno ISO fino a quella corrente: true = sfida fatta
export function sfideAnno(diario, chiave = settimana()) {
  const [anno, n] = chiave.split('-');
  const fatte = new Set(diario.filter(d => d.sfida && d.settimana?.startsWith(`${anno}-`)).map(d => +d.settimana.split('-')[1]));
  return Array.from({ length: +n }, (_, i) => fatte.has(i + 1));
}
