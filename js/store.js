// Estado de la app y guardado en el teléfono (localStorage).

import {STORAGE_KEY, SCHEMA_VERSION} from './config.js';
import {defaults, migrate, isNewerThanApp} from './core/data.js';
import {todayStr} from './core/dates.js';

export const state = {
  db: defaults(),
  view: {mode: 'week', date: todayStr()},  // qué se está mirando
  ctx: null,                                // turno abierto en el diálogo: {date, t, which, fromPick, mode}
  locked: false                             // true si los datos guardados son de una versión más nueva
};

// Copia de seguridad de datos que no se pudieron leer, antes de empezar de cero.
const RESCUE_KEY = STORAGE_KEY + '-ilegible';

// Carga lo guardado. Con datos de una versión más nueva queda `locked` y no se escribe nada.
export function loadInto(s = state){
  let raw = null;
  try{ raw = localStorage.getItem(STORAGE_KEY); }catch(e){ return; }
  if(!raw) return;
  try{
    const parsed = JSON.parse(raw);
    if(isNewerThanApp(parsed)){ s.locked = true; return; }
    const d = migrate(parsed);
    if(d){ s.db = d; return; }
  }catch(e){}
  try{ localStorage.setItem(RESCUE_KEY, raw); }catch(e){}
}

export function persist(){
  if(state.locked) return false;
  try{
    state.db.version = SCHEMA_VERSION;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.db));
    return true;
  }catch(e){
    alert('No se pudo guardar. Exportá un respaldo y revisá el espacio del teléfono.');
    return false;
  }
}
