// node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { settimana, sfidaDellaSettimana, youtubeId, ingredienti, passaggi, minuti, perCategoria, sfideAnno } from '../public/logic.js';
import { SFIDE, ATTREZZI } from '../public/sfide.js';

test('settimana ISO', () => {
  assert.equal(settimana(new Date(2026, 0, 1)), '2026-1');
  assert.equal(settimana(new Date(2027, 0, 1)), '2026-53'); // venerdì: ultima settimana del 2026
  assert.equal(settimana(new Date(2026, 9, 21)), '2026-43');
});

test('sfida rispetta gli attrezzi, è stabile e cambia con il salto', () => {
  const a = sfidaDellaSettimana(SFIDE, [], '2026-43');
  assert.deepEqual(a.attrezzi, []);
  assert.equal(sfidaDellaSettimana(SFIDE, [], '2026-43'), a);
  assert.notEqual(sfidaDellaSettimana(SFIDE, [], '2026-43', 1), a);
  for (let i = 0; i < 50; i++) {
    const s = sfidaDellaSettimana(SFIDE, ['roner'], '2026-43', i);
    assert.ok(s.attrezzi.every(x => x === 'roner'));
  }
  assert.equal(sfidaDellaSettimana([], ['roner'], 'x'), null);
});

test('ogni sfida usa attrezzi esistenti', () => {
  for (const s of SFIDE) for (const a of s.attrezzi) assert.ok(ATTREZZI[a], `${s.titolo}: ${a}`);
});

test('youtubeId', () => {
  assert.equal(youtubeId('https://youtu.be/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(youtubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10'), 'dQw4w9WgXcQ');
  assert.equal(youtubeId('https://youtube.com/shorts/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(youtubeId('https://example.com'), null);
  assert.equal(youtubeId(undefined), null);
});

test('ingredienti: dose e nome', () => {
  assert.deepEqual(ingredienti('320 g riso Carnaroli\n\n1,2 l brodo\n250 ml di albume\n2 limoni\n1 cucchiaio olio\nSale e pepe'), [
    { dose: '320 g', nome: 'riso Carnaroli' },
    { dose: '1,2 l', nome: 'brodo' },
    { dose: '250 ml', nome: 'albume' },
    { dose: '2', nome: 'limoni' },
    { dose: '1 cucchiaio', nome: 'olio' },
    { dose: '', nome: 'Sale e pepe' },
  ]);
  assert.deepEqual(ingredienti(''), []);
});

test('passaggi: uno per riga, senza numerazione', () => {
  assert.deepEqual(passaggi('1. Tosta il riso\n\n2) Sfuma\nManteca'), ['Tosta il riso', 'Sfuma', 'Manteca']);
});

test('minuti del timer', () => {
  assert.equal(minuti('Cuoci 3m con il coperchio'), 3);
  assert.equal(minuti('brodo per 16–18 minuti'), 16);
  assert.equal(minuti('2min per lato a fiamma altissima'), 2);
  assert.equal(minuti('riposa 2 ore sotto un panno'), 120);
  assert.equal(minuti('forno a 190° per 30 min'), 30);
  assert.equal(minuti('fiamma 8, poi gira'), null);
  assert.equal(minuti('1 h e mezza'), 60);
});

test('ogni sfida ha mise en place e una temperatura valida', () => {
  for (const s of SFIDE) {
    assert.ok(s.mise.length >= 3, s.titolo);
    assert.ok(s.temp === null || (s.temp > 20 && s.temp < 100), s.titolo);
    assert.ok(s.tempo, s.titolo);
  }
});

test('ricette per categoria in ordine di menu', () => {
  const g = perCategoria([{ titolo: 'a', categoria: 'Dolci' }, { titolo: 'b', categoria: '' }, { titolo: 'c', categoria: 'Antipasti' }, { titolo: 'd', categoria: 'Zuppe' }, { titolo: 'e', categoria: 'Antipasti' }]);
  assert.deepEqual(g.map(([c, xs]) => [c, xs.length]), [['Antipasti', 2], ['Dolci', 1], ['Zuppe', 1], ['Altre', 1]]);
});

test('sfide dell’anno', () => {
  const d = [{ sfida: 'x', settimana: '2026-2' }, { sfida: 'y', settimana: '2025-3' }, { sfida: null, settimana: '2026-1' }];
  assert.deepEqual(sfideAnno(d, '2026-4'), [false, true, false, false]);
});

test('le ricette del seed si leggono: dosi, passaggi e timer sensati', async () => {
  const { default: ricette } = await import('../worker/seed/ricette.mjs');
  const titoli = new Set();
  for (const r of ricette) {
    assert.ok(!titoli.has(r.t), `doppione: ${r.t}`);
    titoli.add(r.t);
    assert.ok(r.i.length && r.p.length, r.t);
    for (const p of r.p) {
      const m = minuti(p);
      assert.ok(m === null || (m > 0 && m <= 300), `${r.t}: ${p}`);
    }
  }
});

test('ogni foto del seed corrisponde a una ricetta e ha un credito', async () => {
  const { default: ricette } = await import('../worker/seed/ricette.mjs');
  const { readFileSync } = await import('node:fs');
  const foto = JSON.parse(readFileSync(new URL('../worker/seed/foto.json', import.meta.url), 'utf8'));
  const titoli = new Set(ricette.map(r => r.t));
  for (const [t, f] of Object.entries(foto)) {
    assert.ok(titoli.has(t), t);
    assert.match(f.foto, /^foto\/[0-9a-f-]{36}$/);
    assert.ok(f.credito, t);
  }
});

test('etichette: solo quelle note', async () => {
  const { etichetteDi } = await import('../public/logic.js');
  assert.deepEqual(etichetteDi({ etichette: 'fit,vegetariana' }), ['fit', 'vegetariana']);
  assert.deepEqual(etichetteDi({ etichette: 'keto,fit' }), ['fit']);
  assert.deepEqual(etichetteDi({ etichette: '' }), []);
  assert.deepEqual(etichetteDi({}), []);
});

test('valori per porzione del seed: ogni titolo esiste e le kcal tornano con i macro', async () => {
  const { default: ricette } = await import('../worker/seed/ricette.mjs');
  const { default: macro } = await import('../worker/seed/macro.mjs');
  const cocktail = new Set(ricette.filter(r => r.c === 'Cocktail').map(r => r.t));
  const titoli = new Set(ricette.map(r => r.t));
  for (const [t, [porzioni, kcal, p, c, g]] of Object.entries(macro)) {
    assert.ok(titoli.has(t), t);
    assert.ok(porzioni >= 1 && kcal > 0, t);
    // nei cocktail le kcal vengono quasi tutte dall'alcol, che non è un macro
    if (!cocktail.has(t)) assert.ok(Math.abs(p * 4 + c * 4 + g * 9 - kcal) / kcal < 0.15, t);
  }
});

test('macro: quote sulle calorie e ricette senza valori', async () => {
  const { macroDi } = await import('../public/logic.js');
  const m = macroDi({ kcal: 633, porzioni: 4, proteine: 27, carboidrati: 66, grassi: 29 });
  assert.deepEqual(m.quote, [17, 42, 41]);
  assert.equal(macroDi({ kcal: null }), null);
  assert.deepEqual(macroDi({ kcal: 160, proteine: 0, carboidrati: 0, grassi: 0 }).quote, [0, 0, 0]);
});

test('note del seed: ogni titolo esiste', async () => {
  const { default: ricette } = await import('../worker/seed/ricette.mjs');
  const { default: note } = await import('../worker/seed/note.mjs');
  const titoli = new Set(ricette.map(r => r.t));
  for (const [t, n] of Object.entries(note)) assert.ok(titoli.has(t) && n.length <= 2000, t);
});

test('ogni sfida ha i passaggi per la modalità cucina, con timer sensati', async () => {
  const { SFIDE } = await import('../public/sfide.js');
  for (const s of SFIDE) {
    assert.ok(s.passi?.length >= 4, s.titolo);
    for (const p of s.passi) {
      const m = minuti(p);
      assert.ok(m === null || (m > 0 && m <= 300), `${s.titolo}: ${p}`);
    }
  }
});

