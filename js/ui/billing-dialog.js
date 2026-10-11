// Ventana "Facturación del día": se abre desde la vista Día y se cierra con "Cerrar" o tocando afuera.

import {state} from '../store.js';
import {$} from './dom.js';
import {DAYS_LONG, MON, parseDate} from '../core/dates.js';
import {money} from '../core/text.js';
import {dayBilling} from '../core/schedule.js';

export function openBilling(){
  const {db, view} = state, b = dayBilling(db, view.date);
  const d = parseDate(view.date);
  $('billDay').textContent = `${DAYS_LONG[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
  const row = (label, value, id, warn) => `<div class="brow"><span>${label}</span><b id="${id}"${warn ? ' class="warn"' : ''}>${value}</b></div>`;
  $('billBody').innerHTML =
    row('Facturado', money(b.total), 'billTotal') +
    row('Turnos sin precio', b.unpriced, 'billUnpriced', b.unpriced > 0) +
    (b.pending ? row('Pendientes (todavía no llegaron)', b.pending, 'billPending') : '');
  $('dlgBill').showModal();
}

export function bindBilling(){
  const dlg = $('dlgBill');
  // la hoja ocupa toda la pantalla: si el toque cae en el diálogo mismo (y no en la caja), es "afuera"
  dlg.addEventListener('click', e => { if(e.target === dlg) dlg.close(); });
}