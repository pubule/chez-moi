// node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { settimana, sfidaDellaSettimana, youtubeId } from './logic.js';
import { SFIDE, ATTREZZI } from './sfide.js';

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
