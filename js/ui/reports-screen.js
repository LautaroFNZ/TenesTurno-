// Pantalla "Reportes" (dentro de Ajustes): facturación por día, semana o mes.

import {state} from '../store.js';
import {$} from './dom.js';
import {money, moneyShort} from '../core/text.js';
import {MODES, buildReport, shiftPeriod} from '../core/reports.js';

const rep = {mode: 'week', date: null};   // lo que se está mirando; el modo se recuerda entre aperturas

const card = (label, value, id, cls = '') => `<div class="k ${cls}"><small>${label}</small><b id="${id}">${value}</b></div>`;

function draw(){
  const r = buildReport(state.db, rep.mode, rep.date);
  document.querySelectorAll('#rTabs button').forEach(b => b.classList.toggle('on', b.dataset.m === rep.mode));
  $('rTitle').textContent = r.title;

  let h = '<div class="kpi">' +
    card('Facturado', money(r.total), 'rTotal', 'big') +
    card('Turnos', r.turns, 'rTurns') +
    card('Promedio por turno', r.average == null ? '—' : money(Math.round(r.average)), 'rAvg') +
    card('Sin precio (ya pasaron)', r.unpriced, 'rUnpriced', r.unpriced ? 'warn' : '') +
    card('Pendientes', r.pending, 'rPending');
  if(r.best) h += `<div class="k big"><small>Mejor día</small><b id="rBest">${r.best.label}</b><em>${money(r.best.total)}</em></div>`;
  h += '</div>';

  const max = Math.max(0, ...r.bars.map(b => b.value));
  if(max > 0){
    h += `<div class="chart"><h5>${r.barsTitle}</h5><div class="bars" id="rBars">` +
      r.bars.map(b => `<div${b.value === max ? ' class="top"' : ''}><span>${moneyShort(b.value)}</span><i style="height:${Math.max(2, Math.round(b.value / max * 100))}%"></i>${b.label}</div>`).join('') +
      '</div></div>';
  } else {
    h += '<p class="note" id="rEmpty">Todavía no hay turnos con precio en este período.</p>';
  }
  $('rBody').innerHTML = h;
}

// Se llama al entrar a la pantalla: arranca en el día que se estaba mirando.
export function showReports(){
  rep.date = state.view.date;
  draw();
}

export function bindReports(){
  $('rTabs').addEventListener('click', e => {
    const b = e.target.closest('button[data-m]');
    if(b && MODES.includes(b.dataset.m)){ rep.mode = b.dataset.m; draw(); }
  });
  $('rPrev').onclick = () => { rep.date = shiftPeriod(rep.mode, rep.date, -1); draw(); };
  $('rNext').onclick = () => { rep.date = shiftPeriod(rep.mode, rep.date, 1); draw(); };
}