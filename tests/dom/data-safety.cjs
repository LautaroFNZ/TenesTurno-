// Protección de los datos guardados: versión del formato, datos ilegibles y versión en Ajustes.
const {JSDOM} = require('jsdom');
const html = require('./html.cjs').loadHtml();

let ok = true;
const check = (n, c) => { console.log((c ? 'PASS' : 'FAIL'), n); if(!c) ok = false; };

function boot(stored){
  const errors = [];
  const dom = new JSDOM(html, {runScripts: 'dangerously', url: 'http://localhost/', pretendToBeVisual: true,
    beforeParse(w){
      w.HTMLDialogElement.prototype.showModal = function(){ this.setAttribute('open', ''); };
      w.HTMLDialogElement.prototype.close = function(){ this.removeAttribute('open'); };
      w.alert = m => errors.push('ALERT: ' + m);
      w.confirm = () => true;
      if(stored !== undefined) w.localStorage.setItem('turnos-v1', stored);
      w.addEventListener('error', e => errors.push('ERR: ' + e.message));
    }});
  const w = dom.window, d = w.document;
  return {w, d, $: id => d.getElementById(id), errors, raw: () => w.localStorage.getItem('turnos-v1'), rescue: () => w.localStorage.getItem('turnos-v1-ilegible')};
}

const sched = {}; for(let i = 0; i < 7; i++) sched[i] = {open: true, start: '09:00', end: '20:00'};

// 1) Datos de una versión más nueva: no se abren ni se modifican
const futuro = JSON.stringify({version: 99, settings: {step: 30, schedule: sched}, slots: {'2026-10-13': {'10:00': {x: 1}}}, dayState: {}});
let T = boot(futuro);
check('versión más nueva: se muestra el aviso', /versión más nueva/.test(T.$('app').textContent));
check('versión más nueva: no hay grilla ni celdas', !T.d.querySelector('.c') && !T.d.querySelector('.grid'));
check('versión más nueva: el encabezado queda oculto por CSS (clase locked)', T.d.body.classList.contains('locked'));
check('versión más nueva: lo guardado no se toca', T.raw() === futuro);
check('versión más nueva: sin errores', T.errors.length === 0);

// 2) Datos ilegibles: se guarda una copia y se arranca de cero
for(const basura of ['esto no es json', '{"basura":true}', 'null', '[]']){
  T = boot(basura);
  check(`ilegible (${basura.slice(0, 12)}): arranca con la agenda vacía`, T.d.querySelectorAll('.tl').length === 22 && T.errors.length === 0);
  const guardada = T.rescue();
  check(`ilegible (${basura.slice(0, 12)}): se conserva una copia`, basura === 'null' ? guardada === 'null' : guardada === basura);
}

// 3) Sin datos guardados no se crea ninguna copia
T = boot(undefined);
check('sin datos: no hay copia de rescate', T.rescue() === null);

// 4) Al guardar queda la versión del formato
T = boot(undefined);
const iso = new Date(); const pad = n => String(n).padStart(2, '0');
T.d.querySelector('.c.free').click();
T.$('sName').value = 'Juan';
const ev = new T.w.Event('submit', {cancelable: true, bubbles: true}); ev.submitter = T.$('fSlot').querySelector('button[value="ok"]'); T.$('fSlot').dispatchEvent(ev);
const saved = JSON.parse(T.raw());
check('guardado con version 3', saved.version === 3);

// 5) Datos viejos sin version: se leen, se migran y se les agrega la versión al guardar
const viejo = JSON.stringify({settings: {step: 30, schedule: sched}, slots: {'2026-10-13': {'10:00': {name: 'Pedro', note: 'corte'}}}, dayState: {}});
T = boot(viejo);
T.d.querySelector('.c.free').click(); T.$('sName').value = 'Ana';
const ev2 = new T.w.Event('submit', {cancelable: true, bubbles: true}); ev2.submitter = T.$('fSlot').querySelector('button[value="ok"]'); T.$('fSlot').dispatchEvent(ev2);
const s2 = JSON.parse(T.raw());
check('sin version → queda en version 3 y conserva el turno viejo sin la nota', s2.version === 3 && JSON.stringify(s2.slots['2026-10-13']['10:00']) === '{"a":{"name":"Pedro"}}');

// 6) Versión visible en Ajustes
T = boot(undefined);
T.$('menuBtn').click();
check('Ajustes muestra la versión de la app', /^Versión \d+\.\d+\.\d+$/.test(T.$('appVersion').textContent));

console.log(ok ? 'TODO OK' : 'HAY FALLOS');
process.exit(ok ? 0 : 1);
