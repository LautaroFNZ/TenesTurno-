// Navegación entre semanas y días, y los toques sobre la pantalla principal.

import {state, persist} from '../store.js';
import {$} from './dom.js';
import {render} from './render.js';
import {openSlot} from './slot-dialog.js';
import {openBilling} from './billing-dialog.js';
import {copyText} from './clipboard.js';
import {addDays, parseDate, todayStr} from '../core/dates.js';
import {availText, dayInfo} from '../core/schedule.js';

function go(n){
  const v = state.view;
  v.date = addDays(v.date, v.mode === 'week' ? 7 * n : n);
  render();
}

function toggleDay(){
  const {db, view} = state, d = view.date, wd = parseDate(d).getDay(), open = dayInfo(db, d).open;
  const next = open ? 'closed' : 'open';
  // si coincide con el horario habitual no hace falta guardar una excepción
  if((next === 'open') === db.settings.schedule[wd].open) delete db.dayState[d]; else db.dayState[d] = next;
  persist(); render();
}

function copyAvailable(btn){
  const text = availText(state.db, state.view.date), label = btn.textContent;
  if(!text) return;
  copyText(text).then(ok => {
    if(ok){
      btn.textContent = '✓ ¡Copiado! Pegalo en WhatsApp';
      setTimeout(() => { if(btn.isConnected) btn.textContent = label; }, 2500);
    } else {
      $('copyArea').value = text; $('dlgCopy').showModal(); $('copyArea').select();
    }
  });
}

function onAppClick(e){
  const cell = e.target.closest('[data-t]');
  if(cell){ openSlot(cell.dataset.d, cell.dataset.t); return; }
  const head = e.target.closest('[data-day]');
  if(head){ state.view = {mode: 'day', date: head.dataset.day}; $('app').scrollTop = 0; render(); return; }
  if(e.target.closest('#billOpen')){ openBilling(); return; }
  const copy = e.target.closest('#copyAvail');
  if(copy){ copyAvailable(copy); return; }
  if(e.target.closest('#toggleDay')) toggleDay();
}

export function bindNavigation(){
  $('prev').onclick = () => go(-1);
  $('next').onclick = () => go(1);
  $('todayBtn').onclick = () => { state.view.date = todayStr(); render(); };
  document.querySelectorAll('.seg button').forEach(b => b.onclick = () => {
    state.view.mode = b.dataset.v; $('app').scrollTop = 0; render();
  });
  $('app').addEventListener('click', onAppClick);

  // deslizar a los costados para cambiar de semana/día
  let sx = 0, sy = 0;
  $('app').addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, {passive: true});
  $('app').addEventListener('touchend', e => {
    const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
    if(Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.8) go(dx < 0 ? 1 : -1);
  }, {passive: true});
}