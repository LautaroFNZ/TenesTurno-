// Diálogo de un horario: anotar, elegir entre dos turnos, ver el detalle, poner precio, cancelar y bloquear.
//
// Una sola ventana (#dlgSlot) con varias "pantallas" internas; show() deja visible una sola:
//   fSlot       formulario para anotar (horario libre, o agregar el otro turno de un horario)
//   sPick       elegir cuál de los dos turnos modificar
//   sInfo       detalle de un turno: Volver | Cancelar turno | Precio
//   sPriceForm  cargar el precio
//   sBlocked    horario bloqueado

import {state, persist} from '../store.js';
import {$} from './dom.js';
import {render} from './render.js';
import {DAYS_LONG, parseDate} from '../core/dates.js';
import {esc, money, parsePrice} from '../core/text.js';
import {getSlot, canSplit, halfTime, setSlotValue} from '../core/schedule.js';

const VIEWS = ['fSlot', 'sPick', 'sInfo', 'sPriceForm', 'sBlocked'];
const show = id => VIEWS.forEach(v => { $(v).hidden = v !== id; });

// hora de cada turno del horario abierto: a = la hora, b = la mitad
const turnTime = which => which === 'a' ? state.ctx.t : halfTime(state.db, state.ctx.t);

function setTitle(time){
  const d = parseDate(state.ctx.date);
  $('sTitle').textContent = `${DAYS_LONG[d.getDay()]} ${d.getDate()} · ${time}`;
}

function commit(date, t, val){
  setSlotValue(state.db, date, t, val);
  persist();
}

export function openSlot(date, t){
  state.ctx = {date, t, which: null, fromPick: false, mode: null};
  const s = getSlot(state.db, date, t);
  if(!s) showForm('new');
  else if(s.blocked){ setTitle(t); show('sBlocked'); }
  else if(s.a && s.b) showPick();
  else showInfo(s.a ? 'a' : 'b', false);
  $('dlgSlot').showModal();
  if(!$('fSlot').hidden) (!$('wrapA').hidden ? $('sName') : $('sName2')).focus();
}

// mode: 'new' (horario libre) | 'addB' (agregar el turno de la mitad) | 'addA' (agregar el turno de la hora)
function showForm(mode){
  const {ctx, db} = state;
  ctx.mode = mode;
  $('sName').value = ''; $('sName2').value = '';
  $('wrapA').hidden = mode === 'addB';
  $('wrapB').hidden = mode !== 'addB';
  $('sPlus').hidden = !(mode === 'new' && canSplit(db));
  $('sPlus').textContent = '+';
  $('lblA').textContent = mode === 'addA' ? `Nombre ${ctx.t}` : 'Nombre';
  $('lblB').textContent = `Nombre ${halfTime(db, ctx.t)}`;
  $('sBlock').hidden = mode !== 'new';
  setTitle(mode === 'addB' ? halfTime(db, ctx.t) : ctx.t);
  show('fSlot');
}

function showPick(){
  const {ctx, db} = state, s = getSlot(db, ctx.date, ctx.t);
  setTitle(ctx.t);
  [['a', 'pickA', ctx.t], ['b', 'pickB', halfTime(db, ctx.t)]].forEach(([w, id, time]) => {
    const turn = s[w];
    $(id).innerHTML = `<span>${esc(time)} · ${esc(turn.name)}</span>` + (turn.price != null ? `<span>${money(turn.price)}</span>` : '');
    $(id).onclick = () => showInfo(w, true);
  });
  show('sPick');
}

function showInfo(which, fromPick){
  const {ctx, db} = state;
  ctx.which = which; ctx.fromPick = fromPick;
  const s = getSlot(db, ctx.date, ctx.t), turn = s[which], other = which === 'a' ? 'b' : 'a';
  setTitle(turnTime(which));
  $('iName').textContent = turn.name;
  $('iPrice').textContent = turn.price != null ? 'Precio: ' + money(turn.price) : 'Sin precio cargado';
  $('sAddHalf').hidden = !(canSplit(db) && !s[other]);
  $('sAddHalf').textContent = `Agregar turno ${turnTime(other)}`;
  show('sInfo');
}

export function bindSlotDialog(){
  // + / − : agregar o quitar el segundo nombre (el de la mitad del horario)
  $('sPlus').onclick = () => {
    const {ctx} = state, opening = $('wrapB').hidden;
    $('wrapB').hidden = !opening;
    $('sPlus').textContent = opening ? '−' : '+';
    $('lblA').textContent = opening ? `Nombre ${ctx.t}` : 'Nombre';
    if(opening) $('sName2').focus(); else $('sName2').value = '';
  };

  // Anotar
  $('fSlot').addEventListener('submit', e => {
    if(e.submitter && e.submitter.value !== 'ok') return;
    const {ctx, db} = state;
    const nA = $('sName').value.trim(), nB = $('sName2').value.trim();
    const a = !$('wrapA').hidden && nA ? {name: nA} : null;
    const b = !$('wrapB').hidden && nB ? {name: nB} : null;
    if(!a && !b){ e.preventDefault(); (!$('wrapA').hidden ? $('sName') : $('sName2')).focus(); return; }
    const cur = getSlot(db, ctx.date, ctx.t), next = cur && !cur.blocked ? {...cur} : {};
    if(a) next.a = a;
    if(b) next.b = b;
    commit(ctx.date, ctx.t, next);
    render();
  });

  // Bloquear / desbloquear
  $('sBlock').onclick = () => { const {ctx} = state; commit(ctx.date, ctx.t, {blocked: true}); $('dlgSlot').close(); render(); };
  $('sUnblock').onclick = () => { const {ctx} = state; commit(ctx.date, ctx.t, null); $('dlgSlot').close(); render(); };

  // Detalle de un turno
  $('iBack').onclick = () => { if(state.ctx.fromPick) showPick(); else $('dlgSlot').close(); };
  $('sAddHalf').onclick = () => showForm(state.ctx.which === 'a' ? 'addB' : 'addA');
  $('sCancelTurn').onclick = () => {
    const {ctx, db} = state, s = getSlot(db, ctx.date, ctx.t), turn = s[ctx.which];
    if(!confirm(`¿Cancelar el turno de ${turn.name} (${turnTime(ctx.which)})?`)) return;
    const next = {...s}; delete next[ctx.which];
    commit(ctx.date, ctx.t, (next.a || next.b) ? next : null);
    $('dlgSlot').close(); render();
  };

  // Precio
  $('sPriceBtn').onclick = () => {
    const {ctx, db} = state, turn = getSlot(db, ctx.date, ctx.t)[ctx.which];
    $('pName').textContent = `${turn.name} · ${turnTime(ctx.which)}`;
    $('sPrice').value = turn.price != null ? String(turn.price) : '';
    show('sPriceForm');
    $('sPrice').focus();
  };
  $('pBack').onclick = () => showInfo(state.ctx.which, state.ctx.fromPick);
  $('sPriceForm').addEventListener('submit', e => {
    e.preventDefault();
    const r = parsePrice($('sPrice').value);
    if(!r.ok){ alert('Escribí solo números, por ejemplo 12000.'); return; }
    const {ctx, db} = state, s = getSlot(db, ctx.date, ctx.t), turn = {...s[ctx.which]};
    if(r.value === null) delete turn.price; else turn.price = r.value;
    commit(ctx.date, ctx.t, {...s, [ctx.which]: turn});
    render();
    showInfo(ctx.which, ctx.fromPick);
  });
}
