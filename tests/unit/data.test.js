import test from 'node:test';
import assert from 'node:assert/strict';
import {SCHEMA_VERSION} from '../../js/config.js';
import {defaults, cleanTurn, normSlot, normSlots, migrate, isNewerThanApp} from '../../js/core/data.js';

const sched = (over = {}) => {
  const s = {};
  for(let i = 0; i < 7; i++) s[i] = {open: true, start: '09:00', end: '20:00', ...(over[i] || {})};
  return s;
};

test('defaults: todos los días abiertos, de 9 a 20, cada 30 min', () => {
  const d = defaults();
  assert.equal(d.version, SCHEMA_VERSION);
  assert.equal(d.settings.step, 30);
  for(let i = 0; i < 7; i++) assert.deepEqual(d.settings.schedule[i], {open: true, start: '09:00', end: '20:00'});
  assert.deepEqual(d.slots, {});
  assert.deepEqual(d.dayState, {});
});

test('defaults devuelve objetos nuevos cada vez', () => {
  const a = defaults(); a.settings.schedule[1].open = false;
  assert.equal(defaults().settings.schedule[1].open, true);
});

test('cleanTurn limpia nombre y precio', () => {
  assert.deepEqual(cleanTurn({name: '  Juan  '}), {name: 'Juan'});
  assert.deepEqual(cleanTurn({name: 'Ana', price: 12000}), {name: 'Ana', price: 12000});
  assert.deepEqual(cleanTurn({name: 'Ana', price: '9000'}), {name: 'Ana', price: 9000});
  assert.deepEqual(cleanTurn({name: 'Ana', price: 0}), {name: 'Ana', price: 0});
  assert.deepEqual(cleanTurn({name: 'Ana', price: 'abc'}), {name: 'Ana'});
  assert.deepEqual(cleanTurn({name: 'Ana', price: -1}), {name: 'Ana'});
  assert.deepEqual(cleanTurn({name: 'Ana', price: null}), {name: 'Ana'});
  assert.equal(cleanTurn({name: '   '}), null);
  assert.equal(cleanTurn({}), null);
  assert.equal(cleanTurn(null), null);
});

test('normSlot: formato 2 (name/note) pasa a { a } y descarta la nota', () => {
  assert.deepEqual(normSlot({name: 'Pedro', note: 'corte'}), {a: {name: 'Pedro'}});
});

test('normSlot: bloqueos, dos turnos, solo el de la mitad y vacíos', () => {
  assert.deepEqual(normSlot({blocked: true}), {blocked: true});
  assert.deepEqual(normSlot({a: {name: 'A'}, b: {name: 'B', price: 5}}), {a: {name: 'A'}, b: {name: 'B', price: 5}});
  assert.deepEqual(normSlot({b: {name: 'Solo'}}), {b: {name: 'Solo'}});
  assert.equal(normSlot({a: {name: ' '}}), null);
  assert.equal(normSlot(null), null);
  assert.equal(normSlot('x'), null);
});

test('normSlots descarta días y horarios vacíos', () => {
  const out = normSlots({'2026-10-13': {'10:00': {name: 'X'}, '11:00': {name: ''}}, '2026-10-14': {'10:00': {name: ' '}}});
  assert.deepEqual(out, {'2026-10-13': {'10:00': {a: {name: 'X'}}}});
});

test('migrate: formato 1 (días creados a mano)', () => {
  const old = {settings: {start: '10:00', end: '13:00', step: 30}, days: {'2026-10-11': {start: '10:00', end: '13:00', step: 30, slots: {'10:30': {name: 'Pedro', note: ''}}}}};
  const d = migrate(old);
  assert.equal(d.version, SCHEMA_VERSION);
  assert.equal(d.settings.schedule[3].start, '10:00');
  assert.equal(d.settings.schedule[3].end, '13:00');
  assert.deepEqual(d.slots, {'2026-10-11': {'10:30': {a: {name: 'Pedro'}}}});
  assert.equal(d.dayState['2026-10-11'], 'open');
});

test('migrate: formato 2 (name/note) pasa al formato actual', () => {
  const d = migrate({settings: {step: 30, schedule: sched()}, slots: {'2026-10-13': {'10:00': {name: 'Pedro', note: 'corte + barba'}, '10:30': {blocked: true}, '11:00': {name: '   '}}}, dayState: {}});
  assert.equal(d.version, SCHEMA_VERSION);
  assert.deepEqual(d.slots, {'2026-10-13': {'10:00': {a: {name: 'Pedro'}}, '10:30': {blocked: true}}});
});

test('migrate: el formato actual se conserva igual', () => {
  const src = {version: SCHEMA_VERSION, settings: {step: 20, schedule: sched()}, slots: {'2026-10-13': {'11:00': {a: {name: 'A', price: 1000}, b: {name: 'B'}}}}, dayState: {'2026-10-14': 'closed'}};
  const copia = JSON.parse(JSON.stringify(src));
  assert.deepEqual(migrate(src), copia);
});

test('migrate: devuelve null si no entiende los datos', () => {
  assert.equal(migrate(null), null);
  assert.equal(migrate('x'), null);
  assert.equal(migrate([]), null);
  assert.equal(migrate({basura: true}), null);
  assert.equal(migrate({settings: {step: 30}, slots: {}}), null);
  const sinDia = sched(); delete sinDia[3];
  assert.equal(migrate({settings: {step: 30, schedule: sinDia}, slots: {}, dayState: {}}), null);
});

test('migrate: el horario inicial anterior (domingo y lunes cerrados, sin tocar) pasa a todo abierto', () => {
  const d = migrate({settings: {step: 30, schedule: sched({0: {open: false}, 1: {open: false}})}, slots: {}, dayState: {}});
  assert.equal(d.settings.schedule[0].open, true);
  assert.equal(d.settings.schedule[1].open, true);
});

test('migrate: un horario personalizado se respeta', () => {
  const d = migrate({settings: {step: 30, schedule: sched({0: {open: false}, 1: {open: false}, 3: {start: '10:00'}})}, slots: {}, dayState: {}});
  assert.equal(d.settings.schedule[0].open, false);
  assert.equal(d.settings.schedule[1].open, false);
});

test('isNewerThanApp', () => {
  assert.equal(isNewerThanApp({version: SCHEMA_VERSION + 1}), true);
  assert.equal(isNewerThanApp({version: SCHEMA_VERSION}), false);
  assert.equal(isNewerThanApp({}), false);
  assert.equal(isNewerThanApp(null), false);
  assert.equal(isNewerThanApp('x'), false);
});
