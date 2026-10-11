// Horarios, turnos libres y el texto para WhatsApp. Todas las funciones reciben `db` como
// primer argumento y no tocan el navegador, así que se pueden probar (y reutilizar) sin pantalla.

import {toMin, toTime, fmt, parseDate, DAYS_LONG, MONTHS} from './dates.js';

// Horario de trabajo de una fecha: el habitual del día de la semana, salvo que tenga una excepción.
export function dayInfo(db, date){
  const sc = db.settings.schedule[parseDate(date).getDay()];
  const st = db.dayState[date];
  return {open: st ? st === 'open' : sc.open, start: sc.start, end: sc.end};
}

export function range(db, lo, hi){
  const out = [], step = db.settings.step;
  for(let m = lo; m < hi; m += step) out.push(toTime(m));
  return out;
}

// Horas que ya tienen algo cargado en alguna de las fechas.
export function bookedTimes(db, dates){
  const s = new Set();
  dates.forEach(d => Object.keys(db.slots[d] || {}).forEach(t => s.add(t)));
  return s;
}

// Filas de la grilla semanal: une los horarios de todos los días, más lo ya cargado fuera de horario.
export function weekTimes(db, dates){
  let lo = Infinity, hi = -Infinity;
  const take = i => { if(i.open && toMin(i.end) > toMin(i.start)){ lo = Math.min(lo, toMin(i.start)); hi = Math.max(hi, toMin(i.end)); } };
  for(let i = 0; i < 7; i++) take(db.settings.schedule[i]);
  dates.forEach(d => take(dayInfo(db, d)));
  if(lo === Infinity){ lo = 9 * 60; hi = 20 * 60; }
  const set = new Set(range(db, lo, hi));
  bookedTimes(db, dates).forEach(t => set.add(t));
  return [...set].sort();
}

// Filas de la vista Día.
export function dayTimes(db, date){
  const i = dayInfo(db, date), set = new Set();
  if(i.open) range(db, toMin(i.start), toMin(i.end)).forEach(t => set.add(t));
  bookedTimes(db, [date]).forEach(t => set.add(t));
  return [...set].sort();
}

export const inHours = (info, t) => info.open && toMin(t) >= toMin(info.start) && toMin(t) < toMin(info.end);
export const getSlot = (db, date, t) => (db.slots[date] || {})[t];

export function countBooked(db, date){
  return Object.values(db.slots[date] || {}).reduce((n, s) => n + (s.blocked ? 0 : (s.a ? 1 : 0) + (s.b ? 1 : 0)), 0);
}


// El segundo turno de un horario va en la mitad (11:30 → 11:45). Solo si la mitad cae en un minuto entero y redondo.
export const canSplit = db => db.settings.step >= 20 && db.settings.step % 2 === 0;
export const halfTime = (db, t) => toTime(toMin(t) + db.settings.step / 2);

// Guarda (o borra, con val = null) lo que hay en un horario, limpiando los días que quedan vacíos.
export function setSlotValue(db, date, t, val){
  if(!db.slots[date]) db.slots[date] = {};
  if(val) db.slots[date][t] = val; else delete db.slots[date][t];
  if(!Object.keys(db.slots[date]).length) delete db.slots[date];
}

// Horarios totalmente libres de un día. Si es hoy, solo los que todavía no pasaron.
export function freeTimes(db, date, now = new Date()){
  const info = dayInfo(db, date);
  if(!info.open) return [];
  const slots = db.slots[date] || {};
  const nowMin = now.getHours() * 60 + now.getMinutes(), isToday = date === fmt(now);
  return dayTimes(db, date).filter(t => !slots[t] && inHours(info, t) && (!isToday || toMin(t) > nowMin));
}

// Mensaje listo para pegar en WhatsApp. Vacío si no hay nada libre.
export function availText(db, date, now = new Date()){
  const times = freeTimes(db, date, now);
  if(!times.length) return '';
  const d = parseDate(date), wd = DAYS_LONG[d.getDay()];
  const byHour = {};
  times.forEach(t => { (byHour[t.slice(0, 2)] = byHour[t.slice(0, 2)] || []).push(t); });
  return `Turnos disponibles – ${wd[0].toUpperCase() + wd.slice(1)} ${d.getDate()} de ${MONTHS[d.getMonth()]}:\n\n` +
    Object.keys(byHour).sort().map(h => byHour[h].join(' · ')).join('\n');
}
