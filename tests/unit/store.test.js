import test, {beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {STORAGE_KEY, SCHEMA_VERSION} from '../../js/config.js';
import {defaults} from '../../js/core/data.js';
import {state, loadInto, persist} from '../../js/store.js';

// localStorage y alert falsos, para probar el guardado sin navegador
let mem, alerts;
const fakeStorage = () => ({
  getItem: k => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => { mem.set(k, String(v)); }
});

beforeEach(() => {
  mem = new Map(); alerts = [];
  globalThis.localStorage = fakeStorage();
  globalThis.alert = m => alerts.push(m);
  state.db = defaults(); state.locked = false;
});

const sched = () => { const s = {}; for(let i = 0; i < 7; i++) s[i] = {open: true, start: '09:00', end: '20:00'}; return s; };
const fresh = () => ({db: defaults(), locked: false});

test('sin datos guardados: queda la agenda vacía', () => {
  const s = fresh(); loadInto(s);
  assert.equal(s.locked, false);
  assert.deepEqual(s.db.slots, {});
});

test('lee datos del formato actual', () => {
  mem.set(STORAGE_KEY, JSON.stringify({version: SCHEMA_VERSION, settings: {step: 30, schedule: sched()}, slots: {'2026-10-13': {'10:00': {a: {name: 'Juan', price: 5000}}}}, dayState: {}}));
  const s = fresh(); loadInto(s);
  assert.equal(s.db.slots['2026-10-13']['10:00'].a.price, 5000);
});

test('lee datos viejos sin versión y los migra', () => {
  mem.set(STORAGE_KEY, JSON.stringify({settings: {step: 30, schedule: sched()}, slots: {'2026-10-13': {'10:00': {name: 'Pedro', note: 'x'}}}, dayState: {}}));
  const s = fresh(); loadInto(s);
  assert.deepEqual(s.db.slots['2026-10-13']['10:00'], {a: {name: 'Pedro'}});
  assert.equal(s.db.version, SCHEMA_VERSION);
});

test('datos de una versión más nueva: queda bloqueado y no se escribe nada', () => {
  const futuro = JSON.stringify({version: SCHEMA_VERSION + 1, settings: {step: 30, schedule: sched()}, slots: {}, dayState: {}});
  mem.set(STORAGE_KEY, futuro);
  loadInto(state);
  assert.equal(state.locked, true);
  assert.equal(persist(), false);
  assert.equal(mem.get(STORAGE_KEY), futuro);
});

test('datos ilegibles: se guarda una copia aparte y se arranca de cero', () => {
  for(const basura of ['esto no es json', '{"basura":true}']){
    mem = new Map([[STORAGE_KEY, basura]]);
    const s = fresh(); loadInto(s);
    assert.deepEqual(s.db.slots, {});
    assert.equal(mem.get(STORAGE_KEY + '-ilegible'), basura);
    assert.equal(mem.get(STORAGE_KEY), basura); // lo original no se pisa hasta el próximo guardado
  }
});

test('persist guarda con la versión del formato', () => {
  state.db.slots['2026-10-13'] = {'10:00': {a: {name: 'Juan'}}};
  assert.equal(persist(), true);
  const saved = JSON.parse(mem.get(STORAGE_KEY));
  assert.equal(saved.version, SCHEMA_VERSION);
  assert.equal(saved.slots['2026-10-13']['10:00'].a.name, 'Juan');
});

test('persist avisa si el teléfono no deja guardar', () => {
  globalThis.localStorage = {getItem: () => null, setItem: () => { throw new Error('cuota'); }};
  assert.equal(persist(), false);
  assert.equal(alerts.length, 1);
  assert.match(alerts[0], /No se pudo guardar/);
});
