import test from 'node:test';
import assert from 'node:assert/strict';
import {esc, money, parsePrice} from '../../js/core/text.js';

test('esc escapa HTML', () => {
  assert.equal(esc('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
  assert.equal(esc(`a & "b" 'c'`), 'a &amp; &quot;b&quot; &#39;c&#39;');
  assert.equal(esc(12), '12');
});

test('money usa el formato argentino', () => {
  assert.equal(money(12000), '$12.000');
  assert.equal(money(0), '$0');
});

test('parsePrice entiende los formatos habituales', () => {
  assert.deepEqual(parsePrice('12000'), {ok: true, value: 12000});
  assert.deepEqual(parsePrice('12.000'), {ok: true, value: 12000});
  assert.deepEqual(parsePrice('8500,50'), {ok: true, value: 8500.5});
  assert.deepEqual(parsePrice('$ 9.000'), {ok: true, value: 9000});
  assert.deepEqual(parsePrice('0'), {ok: true, value: 0});
});

test('parsePrice: vacío significa "sin precio"', () => {
  assert.deepEqual(parsePrice(''), {ok: true, value: null});
  assert.deepEqual(parsePrice('   '), {ok: true, value: null});
});

test('parsePrice rechaza lo que no es un número', () => {
  assert.equal(parsePrice('abc').ok, false);
  assert.equal(parsePrice('-5').ok, false);
  assert.equal(parsePrice('12k').ok, false);
});

test('parsePrice toma el punto como separador de miles (12.5 vale 125)', () => {
  assert.deepEqual(parsePrice('12.5'), {ok: true, value: 125});
});
