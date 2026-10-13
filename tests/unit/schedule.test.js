import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from '../../js/core/data.js';
import {
  dayInfo, range, weekTimes, dayTimes, inHours, getSlot, countBooked,
  halfTime, setSlotValue, freeTimes, availText, dayBilling
} from '../../js/core/schedule.js';

// 2026-10-13 es martes, 2026-10-14 miércoles, 2026-10-10 sábado, 2026-10-11 domingo
const TUE = '2026-10-13', WED = '2026-10-14';

test('range: de 9 a 20 cada 30 min son 22 horarios', () => {
  const r = range(defaults(), 9 * 60, 20 * 60);
  assert.equal(r.length, 22);
  assert.equal(r[0], '09:00');
  assert.equal(r[21], '19:30');
});

test('dayInfo usa el horario del día de la semana', () => {
  const db = defaults();
  db.settings.schedule[2] = {open: true, start: '10:00', end: '14:00'}; // martes
  assert.deepEqual(dayInfo(db, TUE), {open: true, start: '10:00', end: '14:00'});
  assert.deepEqual(dayInfo(db, WED), {open: true, start: '09:00', end: '20:00'});
});

test('dayInfo: una excepción manda sobre el horario habitual', () => {
  const db = defaults();
  db.dayState[TUE] = 'closed';
  assert.equal(dayInfo(db, TUE).open, false);
  db.settings.schedule[3].open = false; // miércoles cerrado habitual
  assert.equal(dayInfo(db, WED).open, false);
  db.dayState[WED] = 'open';
  assert.equal(dayInfo(db, WED).open, true);
});

test('inHours: el horario de cierre no entra', () => {
  const info = {open: true, start: '09:00', end: '20:00'};
  assert.equal(inHours(info, '09:00'), true);
  assert.equal(inHours(info, '19:30'), true);
  assert.equal(inHours(info, '20:00'), false);
  assert.equal(inHours(info, '08:30'), false);
  assert.equal(inHours({...info, open: false}, '10:00'), false);
});

test('dayTimes: día cerrado no tiene horarios, pero se ve lo ya cargado', () => {
  const db = defaults();
  db.dayState[TUE] = 'closed';
  assert.deepEqual(dayTimes(db, TUE), []);
  setSlotValue(db, TUE, '10:00', {a: {name: 'X'}});
  assert.deepEqual(dayTimes(db, TUE), ['10:00']);
});

test('dayTimes incluye lo cargado fuera del horario actual', () => {
  const db = defaults();
  db.settings.schedule[2] = {open: true, start: '10:00', end: '12:00'};
  setSlotValue(db, TUE, '18:00', {a: {name: 'X'}});
  assert.deepEqual(dayTimes(db, TUE), ['10:00', '10:30', '11:00', '11:30', '18:00']);
});

test('weekTimes une los horarios de toda la semana', () => {
  const db = defaults();
  db.settings.schedule[1] = {open: true, start: '10:00', end: '14:00'};
  db.settings.schedule[6] = {open: true, start: '08:00', end: '12:00'};
  const t = weekTimes(db, ['2026-10-12', TUE, WED, '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18']);
  assert.equal(t[0], '08:00');
  assert.equal(t[t.length - 1], '19:30');
});

test('countBooked cuenta los dos turnos de un horario y no los bloqueos', () => {
  const db = defaults();
  setSlotValue(db, TUE, '10:00', {a: {name: 'A'}});
  setSlotValue(db, TUE, '10:30', {a: {name: 'B'}, b: {name: 'C'}});
  setSlotValue(db, TUE, '11:00', {b: {name: 'D'}});
  setSlotValue(db, TUE, '11:30', {blocked: true});
  assert.equal(countBooked(db, TUE), 4);
  assert.equal(countBooked(db, WED), 0);
});

test('halfTime: el turno de la mitad cae 15 minutos después (el horario dura 30)', () => {
  const db = defaults();
  assert.equal(halfTime(db, '11:30'), '11:45');
  assert.equal(halfTime(db, '13:00'), '13:15');
  assert.equal(halfTime(db, '09:00'), '09:15');
});

test('setSlotValue guarda, borra y limpia el día cuando queda vacío', () => {
  const db = defaults();
  setSlotValue(db, TUE, '10:00', {a: {name: 'X'}});
  assert.deepEqual(getSlot(db, TUE, '10:00'), {a: {name: 'X'}});
  setSlotValue(db, TUE, '10:00', null);
  assert.equal(getSlot(db, TUE, '10:00'), undefined);
  assert.equal(TUE in db.slots, false);
});

test('freeTimes: solo horarios totalmente libres', () => {
  const db = defaults();
  setSlotValue(db, WED, '10:00', {a: {name: 'A'}});
  setSlotValue(db, WED, '12:00', {blocked: true});
  setSlotValue(db, WED, '13:00', {b: {name: 'Solo la mitad'}});
  const free = freeTimes(db, WED, new Date(2026, 9, 10, 14, 10));
  assert.equal(free.length, 22 - 3);
  for(const t of ['10:00', '12:00', '13:00']) assert.equal(free.includes(t), false);
});

test('freeTimes: hoy no ofrece lo que ya pasó', () => {
  const db = defaults();
  const free = freeTimes(db, '2026-10-10', new Date(2026, 9, 10, 14, 10));
  assert.equal(free[0], '14:30');
  assert.equal(free[free.length - 1], '19:30');
  // otro día no se recorta
  assert.equal(freeTimes(db, WED, new Date(2026, 9, 10, 14, 10))[0], '09:00');
});

test('freeTimes: día cerrado no ofrece nada', () => {
  const db = defaults();
  db.dayState[WED] = 'closed';
  assert.deepEqual(freeTimes(db, WED, new Date(2026, 9, 10, 14, 10)), []);
});

test('availText arma el mensaje para WhatsApp', () => {
  const db = defaults();
  db.settings.schedule[3] = {open: true, start: '09:00', end: '13:00'};
  setSlotValue(db, WED, '10:00', {a: {name: 'A'}});
  setSlotValue(db, WED, '12:00', {blocked: true});
  const txt = availText(db, WED, new Date(2026, 9, 10, 14, 10));
  assert.equal(txt, 'Turnos disponibles – Miércoles 14 de octubre:\n\n09:00 · 09:30\n10:30\n11:00 · 11:30\n12:30');
});

test('availText vacío si no hay nada libre', () => {
  const db = defaults();
  db.dayState[WED] = 'closed';
  assert.equal(availText(db, WED, new Date(2026, 9, 10, 14, 10)), '');
});

test('dayBilling: hoy, lo que todavía no llegó es pendiente y no "sin precio"', () => {
  const db = defaults(), hoy = '2026-10-10', now = new Date(2026, 9, 10, 14, 10);
  setSlotValue(db, hoy, '10:00', {a: {name: 'Ya pasó'}});                    // sin precio
  setSlotValue(db, hoy, '14:00', {a: {name: 'Pasó', price: 7000}, b: {name: 'Mitad'}}); // 14:00 pasó, 14:15 todavía no
  setSlotValue(db, hoy, '17:00', {a: {name: 'Futuro'}});                      // pendiente
  assert.deepEqual(dayBilling(db, hoy, now), {total: 7000, priced: 1, unpriced: 1, pending: 2});
});

test('dayBilling: un día futuro está todo pendiente; el precio ya cargado igual suma', () => {
  const db = defaults(), now = new Date(2026, 9, 10, 14, 10);
  setSlotValue(db, WED, '10:00', {a: {name: 'A'}});
  setSlotValue(db, WED, '11:00', {a: {name: 'B', price: 4000}});
  assert.deepEqual(dayBilling(db, WED, now), {total: 4000, priced: 1, unpriced: 0, pending: 1});
});

test('dayBilling suma precios y cuenta los turnos sin precio (día pasado)', () => {
  const db = defaults(), now = new Date(2026, 9, 20, 12, 0);
  setSlotValue(db, TUE, '10:00', {a: {name: 'A', price: 8000}});
  setSlotValue(db, TUE, '10:30', {a: {name: 'B'}, b: {name: 'C', price: 5000}});
  setSlotValue(db, TUE, '11:00', {a: {name: 'D', price: 0}});
  setSlotValue(db, TUE, '11:30', {blocked: true});
  assert.deepEqual(dayBilling(db, TUE, now), {total: 13000, priced: 3, unpriced: 1, pending: 0});
  assert.deepEqual(dayBilling(db, WED, now), {total: 0, priced: 0, unpriced: 0, pending: 0});
});

test('dayBilling: hoy, lo que todavía no llegó es pendiente y no "sin precio"', () => {
  const db = defaults(), hoy = '2026-10-10', now = new Date(2026, 9, 10, 14, 10);
  setSlotValue(db, hoy, '10:00', {a: {name: 'Ya pasó'}});                    // sin precio
  setSlotValue(db, hoy, '14:00', {a: {name: 'Pasó', price: 7000}, b: {name: 'Mitad'}}); // 14:00 pasó, 14:15 todavía no
  setSlotValue(db, hoy, '17:00', {a: {name: 'Futuro'}});                      // pendiente
  assert.deepEqual(dayBilling(db, hoy, now), {total: 7000, priced: 1, unpriced: 1, pending: 2});
});

test('dayBilling: un día futuro está todo pendiente; el precio ya cargado igual suma', () => {
  const db = defaults(), now = new Date(2026, 9, 10, 14, 10);
  setSlotValue(db, WED, '10:00', {a: {name: 'A'}});
  setSlotValue(db, WED, '11:00', {a: {name: 'B', price: 4000}});
  assert.deepEqual(dayBilling(db, WED, now), {total: 4000, priced: 3 - 2, unpriced: 0, pending: 1});
});