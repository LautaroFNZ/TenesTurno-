// Ajustes: una lista con tres secciones, cada una en su pantalla.
//   Días y horarios · Respaldos (exportar / importar) · Reportes
// Es un solo diálogo (#dlgMenu) a pantalla completa; go() deja visible una sola sección.

import {state, persist} from '../store.js';
import {$} from './dom.js';
import {render} from './render.js';
import {showReports, bindReports} from './reports-screen.js';
import {APP_VERSION, SCHEMA_VERSION} from '../config.js';
import {DAYS_LONG, ORDER, toMin, parseDate, todayStr} from '../core/dates.js';
import {migrate, isNewerThanApp} from '../core/data.js';

const SCREENS = {mHome: 'Ajustes', mSched: 'Días y horarios', mBackup: 'Respaldos', mReports: 'Reportes'};
let current = 'mHome';

function go(id){
  current = id;
  Object.keys(SCREENS).forEach(k => { $(k).hidden = k !== id; });
  $('menuTitle').textContent = SCREENS[id];
  $('menuBack').style.visibility = id === 'mHome' ? 'hidden' : 'visible';
  $('menuBody').scrollTop = 0;
  if(id === 'mSched') fillSchedule();
  if(id === 'mReports') showReports();
}

function openMenu(){
  $('appVersion').textContent = 'Versión ' + APP_VERSION;
  go('mHome');
  $('dlgMenu').showModal();
}

// Al salir de "Días y horarios" se guardan los cambios. Devuelve false si hay un error y hay que quedarse.
function leaveCurrent(){ return current !== 'mSched' || saveSchedule(); }
function back(){ if(leaveCurrent()) go('mHome'); }
function closeMenu(){ if(leaveCurrent()){ $('dlgMenu').close(); render(); } }

/* ---------- Días y horarios ---------- */
function fillSchedule(){
  const {settings} = state.db;
  $('schedRows').innerHTML = ORDER.map(i => {
    const x = settings.schedule[i];
    return `<div class="srow${x.open ? '' : ' shut'}" data-row="${i}">
      <label class="chk"><input type="checkbox" data-o="${i}" ${x.open ? 'checked' : ''}> <span>${DAYS_LONG[i][0].toUpperCase() + DAYS_LONG[i].slice(1)}</span></label>
      <input type="time" data-s="${i}" value="${x.start}"><input type="time" data-e="${i}" value="${x.end}"></div>`;
  }).join('');
}

function saveSchedule(){
  const {db} = state, sch = {};
  let bad = false;
  for(let i = 0; i < 7; i++){
    const o = document.querySelector(`[data-o="${i}"]`).checked;
    const s = document.querySelector(`[data-s="${i}"]`).value, e = document.querySelector(`[data-e="${i}"]`).value;
    if(o && (!s || !e || toMin(e) <= toMin(s))) bad = true;
    sch[i] = {open: o, start: s || db.settings.schedule[i].start, end: e || db.settings.schedule[i].end};
  }
  if(bad){ alert('Revisá los horarios: el fin tiene que ser después del inicio.'); return false; }
  db.settings.schedule = sch;
  // si un día suelto coincide ahora con el horario habitual, ya no necesita excepción
  Object.keys(db.dayState).forEach(d => { if((db.dayState[d] === 'open') === sch[parseDate(d).getDay()].open) delete db.dayState[d]; });
  persist(); render();
  return true;
}

/* ---------- Respaldos ---------- */
function exportBackup(){
  const blob = new Blob([JSON.stringify({...state.db, version: SCHEMA_VERSION})], {type: 'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'turnos-respaldo-' + todayStr() + '.json';
  document.body.appendChild(a); a.click(); a.remove();
}

async function importBackup(e){
  const f = e.target.files[0]; if(!f) return;
  try{
    const parsed = JSON.parse(await f.text());
    if(isNewerThanApp(parsed)){
      alert('Este respaldo es de una versión más nueva de la app. Actualizá la app para poder importarlo.');
      e.target.value = '';
      return;
    }
    const d = migrate(parsed);
    if(!d) throw 0;
    if(confirm('Esto reemplaza los datos actuales. ¿Continuar?')){ state.db = d; persist(); render(); $('dlgMenu').close(); }
  }catch(_){ alert('El archivo no es un respaldo válido.'); }
  e.target.value = '';
}

export function bindSettings(){
  $('menuBtn').onclick = openMenu;
  $('menuBack').onclick = back;
  $('menuClose').onclick = closeMenu;
  $('dlgMenu').addEventListener('cancel', e => { e.preventDefault(); closeMenu(); });   // tecla Esc
  $('mHome').addEventListener('click', e => {
    const b = e.target.closest('[data-go]');
    if(b) go(b.dataset.go);
  });
  $('schedRows').addEventListener('change', e => {
    const o = e.target.closest('[data-o]');
    if(o) o.closest('.srow').classList.toggle('shut', !o.checked);
  });
  $('sDone').onclick = back;
  $('exportBtn').onclick = exportBackup;
  $('importBtn').onclick = () => $('importFile').click();
  $('importFile').onchange = importBackup;
  bindReports();
}