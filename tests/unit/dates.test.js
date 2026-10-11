import test from 'node:test';
import assert from 'node:assert/strict';
import {pad, toMin, toTime, fmt, parseDate, addDays, weekStart} from '../../js/core/dates.js';

test('toMin y toTime son inversas', () => {
  assert.equal(toMin('09:30'), 570);
  assert.equal(toMin('00:00'), 0);
  assert.equal(toTime(570), '09:30');
  assert.equal(toTime(toMin('19:45')), '19:45');
  assert.equal(pad(5), '05');
});

test('parseDate y fmt son inversas', () => {
  for(const s of ['2026-02-28', '2026-10-10', '2028-02-29', '2026-12-31']) assert.equal(fmt(parseDate(s)), s);
});

test('addDays cruza meses y años', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(addDays('2026-11-01', -1), '2026-10-31');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-10-10', 7), '2026-10-17');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
});

test('weekStart devuelve el lunes de esa semana', () => {
  assert.equal(weekStart('2026-10-05'), '2026-10-05'); // lunes
  assert.equal(weekStart('2026-10-10'), '2026-10-05'); // sábado
  assert.equal(weekStart('2026-10-11'), '2026-10-05'); // domingo: sigue en la semana que empezó el lunes
  assert.equal(weekStart('2026-10-12'), '2026-10-12'); // lunes siguiente
});
