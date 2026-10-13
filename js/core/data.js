// Forma de los datos y migración desde formatos anteriores. No toca el navegador.
//
//   db = {
//     version: 3,
//     settings: { step: 30 /* fijo */, schedule: { 0..6: { open, start:'09:00', end:'20:00' } } },
//     slots:    { 'AAAA-MM-DD': { 'HH:MM': { a:{name, price?}, b:{name, price?} } | { blocked:true } } },
//     dayState: { 'AAAA-MM-DD': 'open' | 'closed' }   // excepciones al horario habitual
//   }
//
// "a" es el turno de la hora; "b" es el turno en la mitad de ese horario (11:30 → 11:45).

import {SCHEMA_VERSION, SLOT_MINUTES} from '../config.js';

export function defaults(){
  const schedule = {};
  for(let i = 0; i < 7; i++) schedule[i] = {open: true, start: '09:00', end: '20:00'}; // todos los días abiertos
  return {version: SCHEMA_VERSION, settings: {step: SLOT_MINUTES, schedule}, slots: {}, dayState: {}};
}

export function cleanTurn(x){
  if(!x || typeof x.name !== 'string' || !x.name.trim()) return null;
  const t = {name: x.name.trim()};
  if(x.price !== undefined && x.price !== null && x.price !== '' && isFinite(Number(x.price)) && Number(x.price) >= 0) t.price = Number(x.price);
  return t;
}

export function normSlot(s){
  if(!s || typeof s !== 'object') return null;
  if(s.blocked) return {blocked: true};
  const a = cleanTurn(s.a || (s.name !== undefined ? s : null)), b = cleanTurn(s.b); // s.name: formato 2
  if(!a && !b) return null;
  const out = {};
  if(a) out.a = a;
  if(b) out.b = b;
  return out;
}

export function normSlots(slots){
  const out = {};
  Object.keys(slots || {}).forEach(d => {
    const day = {};
    Object.keys(slots[d] || {}).forEach(t => { const n = normSlot(slots[d][t]); if(n) day[t] = n; });
    if(Object.keys(day).length) out[d] = day;
  });
  return out;
}

// ¿Los datos los escribió una versión de la app más nueva que esta?
export const isNewerThanApp = d => !!d && typeof d === 'object' && Number(d.version) > SCHEMA_VERSION;

// Lleva datos de cualquier formato anterior al actual. Devuelve null si no se entienden.
export function migrate(d){
  if(!d || typeof d !== 'object') return null;

  if(d.days && !d.slots){ // formato 1: prototipo inicial
    const out = defaults(), s = d.settings || {};
    for(let i = 0; i < 7; i++){ out.settings.schedule[i].start = s.start || '09:00'; out.settings.schedule[i].end = s.end || '20:00'; }
    Object.keys(d.days).forEach(k => {
      out.slots[k] = (d.days[k] && d.days[k].slots) || {};
      out.dayState[k] = 'open';
    });
    out.slots = normSlots(out.slots);
    return out;
  }

  if(!d.slots || typeof d.slots !== 'object' || !d.settings || !d.settings.schedule) return null;
  for(let i = 0; i < 7; i++){ const x = d.settings.schedule[i]; if(!x || typeof x.start !== 'string' || typeof x.end !== 'string') return null; }
  d.settings.step = SLOT_MINUTES; // el intervalo ya no se elige: siempre 30 (el campo se mantiene por compatibilidad con respaldos)
  d.dayState = d.dayState || {};
  d.slots = normSlots(d.slots);

  // si el horario quedó con el valor inicial anterior (dom y lun cerrados, nunca tocado), abrir todos los días
  const sc = d.settings.schedule;
  const oldDefault = !sc[0].open && !sc[1].open && [2,3,4,5,6].every(i => sc[i].open) &&
    [0,1,2,3,4,5,6].every(i => sc[i].start === '09:00' && sc[i].end === '20:00');
  if(oldDefault){ sc[0].open = true; sc[1].open = true; }

  d.version = SCHEMA_VERSION;
  return d;
}