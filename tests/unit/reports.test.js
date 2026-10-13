import test from 'node:test';
import assert from 'node:assert/strict';
import {defaults} from '../../js/core/data.js';
import {setSlotValue} from '../../js/core/schedule.js';
import {shiftPeriod, periodDates, periodTitle, buildReport} from '../../js/core/reports.js';

// Octubre de 2026: el 1/10 es jueves, el 5 es lunes, el 7 miércoles, el 31 sábado.
const NOW = new Date(2026, 10, 15, 12, 0);   // 15/11: todo octubre ya pasó
const db = () => {
  const d = defaults();
  setSlotValue(d, '2026-10-07', '10:00', {a: {name: 'A', price: 8000}, b: {name: 'B', price: 5000}});  // mié 7: 13.000
  setSlotValue(d, '2026-10-07', '15:30', {a: {name: 'C'}});                                            // sin precio
  setSlotValue(d, '2026-10-09', '11:00', {a: {name: 'D', price: 6000}});                               // vie 9: 6.000
  setSlotValue(d, '2026-10-20', '09:00', {a: {name: 'E', price: 7000}});                               // mar 20 (semana 4 del mes)
  setSlotValue(d, '2026-10-09', '12:00', {blocked: true});
  return d;
};

test('shiftPeriod mueve día, semana y mes', () => {
  assert.equal(shiftPeriod('day', '2026-10-31', 1), '2026-11-01');
  assert.equal(shiftPeriod('week', '2026-10-07', 1), '2026-10-14');
  assert.equal(shiftPeriod('week', '2026-10-07', -1), '2026-09-30');
  assert.equal(shiftPeriod('month', '2026-10-31', 1), '2026-11-01');
  assert.equal(shiftPeriod('month', '2026-12-15', 1), '2027-01-01');
  assert.equal(shiftPeriod('month', '2026-01-15', -1), '2025-12-01');
});

test('periodDates: 1, 7 o todos los días del mes', () => {
  assert.deepEqual(periodDates('day', '2026-10-07'), ['2026-10-07']);
  const w = periodDates('week', '2026-10-07');
  assert.equal(w.length, 7); assert.equal(w[0], '2026-10-05'); assert.equal(w[6], '2026-10-11');
  const m = periodDates('month', '2026-02-10');
  assert.equal(m.length, 28); assert.equal(m[27], '2026-02-28');
  assert.equal(periodDates('month', '2028-02-10').length, 29);
});

test('periodTitle', () => {
  assert.equal(periodTitle('day', '2026-10-07'), 'miércoles 7 oct');
  assert.equal(periodTitle('week', '2026-10-07', new Date(2026, 5, 1)), '5 – 11 oct');
  assert.equal(periodTitle('week', '2026-10-28', new Date(2026, 5, 1)), '26 oct – 1 nov');
  assert.equal(periodTitle('week', '2027-01-05', new Date(2026, 5, 1)), '4 – 10 ene 2027');
  assert.equal(periodTitle('month', '2026-10-07'), 'octubre 2026');
});

test('reporte del día: total, turnos, promedio y barras por hora', () => {
  const r = buildReport(db(), 'day', '2026-10-07', NOW);
  assert.equal(r.total, 13000);
  assert.equal(r.turns, 3); assert.equal(r.priced, 2); assert.equal(r.unpriced, 1); assert.equal(r.pending, 0);
  assert.equal(r.average, 6500);
  assert.equal(r.best, null);
  assert.equal(r.barsTitle, 'Facturado por hora');
  assert.equal(r.bars[0].label, '9');
  assert.equal(r.bars.find(b => b.label === '10').value, 13000);   // los dos turnos del horario 10:00 (hora y mitad)
  assert.equal(r.bars.reduce((n, b) => n + b.value, 0), 13000);
});

test('reporte de la semana: barras por día y mejor día', () => {
  const r = buildReport(db(), 'week', '2026-10-07', NOW);
  assert.equal(r.total, 19000);
  assert.equal(r.turns, 4); assert.equal(r.unpriced, 1);
  assert.deepEqual(r.bars.map(b => b.label), ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']);
  assert.deepEqual(r.bars.map(b => b.value), [0, 0, 13000, 0, 6000, 0, 0]);
  assert.deepEqual(r.best, {label: 'Mié 7', total: 13000});
  assert.equal(r.average, 19000 / 3);
});

test('reporte del mes: barras por semana, solo con días del mes', () => {
  const r = buildReport(db(), 'month', '2026-10-15', NOW);
  assert.equal(r.total, 26000);
  assert.equal(r.barsTitle, 'Facturado por semana');
  assert.deepEqual(r.bars.map(b => b.label), ['S1', 'S2', 'S3', 'S4', 'S5']);
  assert.deepEqual(r.bars.map(b => b.value), [0, 19000, 0, 7000, 0]);
  assert.deepEqual(r.best, {label: 'Mié 7', total: 13000});
});

test('período sin turnos: todo en cero, sin mejor día ni promedio', () => {
  const r = buildReport(defaults(), 'week', '2026-10-07', NOW);
  assert.equal(r.total, 0); assert.equal(r.turns, 0);
  assert.equal(r.average, null); assert.equal(r.best, null);
  assert.ok(r.bars.every(b => b.value === 0));
});

test('turnos futuros sin precio son pendientes y no "sin precio"', () => {
  const d = defaults();
  setSlotValue(d, '2026-10-07', '10:00', {a: {name: 'A'}});
  const antes = buildReport(d, 'day', '2026-10-07', new Date(2026, 9, 7, 8, 0));
  assert.equal(antes.pending, 1); assert.equal(antes.unpriced, 0);
  const despues = buildReport(d, 'day', '2026-10-07', new Date(2026, 9, 7, 12, 0));
  assert.equal(despues.pending, 0); assert.equal(despues.unpriced, 1);
});

test('día cerrado y sin turnos: sin barras', () => {
  const d = defaults(); d.dayState['2026-10-07'] = 'closed';
  assert.deepEqual(buildReport(d, 'day', '2026-10-07', NOW).bars, []);
});