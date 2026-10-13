// Reportes de facturación por día, semana o mes. Todo se calcula con los datos del teléfono.
// Funciones puras (reciben `db`, no tocan el navegador), así que se pueden probar sin pantalla.

import {DAYS, DAYS_LONG, MON, MONTHS, parseDate, fmt, addDays, weekStart} from './dates.js';
import {dayBilling, dayTimes, getSlot, halfTime} from './schedule.js';

export const MODES = ['day', 'week', 'month'];

const cap = s => s[0].toUpperCase() + s.slice(1);
const sum = (turns) => turns.reduce((n, t) => n + (t && t.price != null ? t.price : 0), 0);

// Mueve la fecha de referencia un período hacia adelante (n = 1) o atrás (n = -1).
export function shiftPeriod(mode, date, n){
  if(mode === 'day') return addDays(date, n);
  if(mode === 'week') return addDays(date, 7 * n);
  const d = parseDate(date);
  return fmt(new Date(d.getFullYear(), d.getMonth() + n, 1));
}

// Las fechas del período que contiene a `date`.
export function periodDates(mode, date){
  if(mode === 'day') return [date];
  if(mode === 'week'){ const ws = weekStart(date); return [0, 1, 2, 3, 4, 5, 6].map(i => addDays(ws, i)); }
  const d = parseDate(date), n = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(), out = [];
  for(let i = 1; i <= n; i++) out.push(fmt(new Date(d.getFullYear(), d.getMonth(), i)));
  return out;
}

export function periodTitle(mode, date, now = new Date()){
  const d = parseDate(date);
  if(mode === 'day') return `${DAYS_LONG[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
  if(mode === 'month') return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  const a = parseDate(weekStart(date)), b = parseDate(addDays(weekStart(date), 6));
  const y = b.getFullYear() !== now.getFullYear() ? ' ' + b.getFullYear() : '';
  return (a.getMonth() === b.getMonth()
    ? `${a.getDate()} – ${b.getDate()} ${MON[b.getMonth()]}`
    : `${a.getDate()} ${MON[a.getMonth()]} – ${b.getDate()} ${MON[b.getMonth()]}`) + y;
}

// Facturado por hora de un día (cada horario cuenta en su hora; el turno de la mitad, también).
function hourBars(db, date){
  const times = dayTimes(db, date);
  if(!times.length) return [];
  const lo = Number(times[0].slice(0, 2)), hi = Number(times[times.length - 1].slice(0, 2));
  const bars = [];
  for(let h = lo; h <= hi; h++) bars.push({label: String(h), value: 0});
  times.forEach(t => {
    const s = getSlot(db, date, t);
    if(!s || s.blocked) return;
    bars[Number(t.slice(0, 2)) - lo].value += sum([s.a, s.b]);
  });
  return bars;
}

// Devuelve todo lo que la pantalla necesita mostrar.
//   { mode, title, total, turns, priced, unpriced, pending, average, best, barsTitle, bars:[{label, value}] }
export function buildReport(db, mode, date, now = new Date()){
  const dates = periodDates(mode, date);
  let total = 0, priced = 0, unpriced = 0, pending = 0;
  const perDay = dates.map(d => {
    const b = dayBilling(db, d, now);
    total += b.total; priced += b.priced; unpriced += b.unpriced; pending += b.pending;
    return {date: d, total: b.total};
  });

  let bars, barsTitle, best = null;
  if(mode === 'day'){
    bars = hourBars(db, date); barsTitle = 'Facturado por hora';
  } else if(mode === 'week'){
    bars = perDay.map(x => ({label: cap(DAYS[parseDate(x.date).getDay()]), value: x.total})); barsTitle = 'Facturado por día';
  } else {
    const weeks = new Map();
    perDay.forEach(x => { const k = weekStart(x.date); weeks.set(k, (weeks.get(k) || 0) + x.total); });
    bars = [...weeks.values()].map((value, i) => ({label: 'S' + (i + 1), value})); barsTitle = 'Facturado por semana';
  }

  if(mode !== 'day'){
    const top = perDay.reduce((m, x) => x.total > (m ? m.total : 0) ? x : m, null);
    if(top){ const d = parseDate(top.date); best = {label: `${cap(DAYS[d.getDay()])} ${d.getDate()}`, total: top.total}; }
  }

  return {
    mode, title: periodTitle(mode, date, now),
    total, turns: priced + unpriced + pending, priced, unpriced, pending,
    average: priced ? total / priced : null,   // promedio de los turnos que tienen precio
    best, barsTitle, bars
  };
}