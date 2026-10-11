// Dibuja la pantalla principal: vista Semana y vista Día.

import {state} from '../store.js';
import {$} from './dom.js';
import {DAYS, DAYS_LONG, MON, parseDate, addDays, weekStart, todayStr} from '../core/dates.js';
import {esc, money} from '../core/text.js';
import {dayInfo, weekTimes, dayTimes, inHours, countBooked, dayBilling, getSlot, halfTime, freeTimes} from '../core/schedule.js';

function weekTitle(){
  const {date} = state.view;
  const a = parseDate(weekStart(date)), b = parseDate(addDays(weekStart(date), 6));
  const y = b.getFullYear() !== new Date().getFullYear() ? ' ' + b.getFullYear() : '';
  return (a.getMonth() === b.getMonth()
    ? `${a.getDate()} – ${b.getDate()} ${MON[b.getMonth()]}`
    : `${a.getDate()} ${MON[a.getMonth()]} – ${b.getDate()} ${MON[b.getMonth()]}`) + y;
}

function dayTitle(){
  const d = parseDate(state.view.date);
  return `${DAYS_LONG[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
}

/* ---------- Semana ---------- */
function weekCell(d, t, s, info){
  const a = `data-d="${d}" data-t="${t}"`;
  if(s && s.blocked) return `<button class="c block" ${a} aria-label="Bloqueado"></button>`;
  if(s){
    const mm = ':' + halfTime(state.db, t).slice(3);
    if(s.a && s.b) return `<button class="c split" ${a}><span class="h busy">${esc(s.a.name)}</span><span class="h busy"><i>${mm}</i>${esc(s.b.name)}</span></button>`;
    if(s.a) return `<button class="c busy" ${a}><span>${esc(s.a.name)}</span></button>`;
    return `<button class="c split" ${a}><span class="h"></span><span class="h busy"><i>${mm}</i>${esc(s.b.name)}</span></button>`;
  }
  if(inHours(info, t)) return `<button class="c free" ${a} aria-label="Libre ${t}"></button>`;
  return '<div class="c off"></div>';
}

function weekHTML(){
  const {db, view} = state;
  const ws = weekStart(view.date), today = todayStr();
  const dates = [0, 1, 2, 3, 4, 5, 6].map(i => addDays(ws, i));
  const times = weekTimes(db, dates);
  let h = '<div class="grid"><div class="gh"></div>';
  dates.forEach(d => {
    const dt = parseDate(d), open = dayInfo(db, d).open;
    h += `<button class="gh${d === today ? ' today' : ''}${open ? '' : ' closed'}" data-day="${d}"><small>${DAYS[dt.getDay()]}</small><b>${dt.getDate()}</b></button>`;
  });
  times.forEach(t => {
    h += `<div class="tl">${t.endsWith(':00') ? t : ':' + t.slice(3)}</div>`;
    dates.forEach(d => { h += weekCell(d, t, getSlot(db, d, t), dayInfo(db, d)); });
  });
  return h + '</div>';
}

/* ---------- Día ---------- */
function dayCard(date, t, s){
  const a = `data-d="${date}" data-t="${t}"`;
  if(s && s.blocked) return `<button class="slot block" ${a}><span class="t">${t}</span><span class="n">Bloqueado</span></button>`;
  if(!s) return `<button class="slot free" ${a}><span class="t">${t}</span><span class="n">Libre</span></button>`;
  const ln = (at, turn) => `<span class="ln"><span class="nm">${at ? `<em class="at">${at}</em>` : ''}${esc(turn.name)}</span>` +
    `${turn.price != null ? `<span class="pr">${money(turn.price)}</span>` : ''}</span>`;
  const lines = (s.a ? ln('', s.a) : '<span class="ln"><span class="nm muted">Libre</span></span>') + (s.b ? ln(halfTime(state.db, t), s.b) : '');
  return `<button class="slot busy" ${a}><span class="t">${t}</span><span class="n">${lines}</span></button>`;
}

function dayHTML(){
  const {db, view} = state, date = view.date;
  const info = dayInfo(db, date), times = dayTimes(db, date), n = countBooked(db, date);
  let h = `<div class="pad"><div class="dayhead"><p class="summary">${n} turno${n === 1 ? '' : 's'}${info.open ? '' : ' · día cerrado'}</p>` +
          `<button class="btn sec sm" id="toggleDay">${info.open ? 'Cerrar día' : 'Abrir día'}</button></div>`;
  const nf = freeTimes(db, date).length;
  h += `<button class="btn block" id="copyAvail"${nf ? '' : ' disabled'}>${nf ? `Copiar turnos disponibles (${nf})` : 'No hay turnos disponibles'}</button>`;
  if(!times.length) h += '<div class="empty">Este día está cerrado.</div>';
  times.forEach(t => { h += dayCard(date, t, getSlot(db, date, t)); });
  return h + '</div>';
}

/* ---------- Pantalla ---------- */
function renderLocked(){
  document.body.classList.add('locked');
  $('app').innerHTML = '<div class="pad"><div class="empty"><b>Hay datos de una versión más nueva de la app.</b><br><br>' +
    'Para no dañarlos, esta versión no los abre ni los modifica. Cerrá la app y volvela a abrir; ' +
    'si sigue igual, instalá la versión más reciente.</div></div>';
}

export function render(){
  if(state.locked){ renderLocked(); return; }
  document.querySelectorAll('.seg button').forEach(b => b.classList.toggle('on', b.dataset.v === state.view.mode));
  $('hTitle').textContent = state.view.mode === 'week' ? weekTitle() : dayTitle();
  $('app').innerHTML = state.view.mode === 'week' ? weekHTML() : dayHTML();
}
