const {JSDOM} = require('jsdom');
const html = require('./html.cjs').loadHtml();
const pad = n => String(n).padStart(2, '0');
const dstr = o => { const t = new Date(); t.setDate(t.getDate() + o); return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`; };
const today = dstr(-1), tomorrow = dstr(1); // 'today' = ayer, para no depender de la hora a la que corre la prueba
let ok = true; const check = (n, c) => { console.log(c ? 'PASS' : 'FAIL', n); if(!c) ok = false; };
const sched = {}; for(let i = 0; i < 7; i++) sched[i] = {open: true, start: '09:00', end: '20:00'};

function boot(slots){
  const errors = [];
  const dom = new JSDOM(html, {runScripts: 'dangerously', url: 'http://localhost/', pretendToBeVisual: true,
    beforeParse(w){
      w.HTMLDialogElement.prototype.showModal = function(){ this.setAttribute('open', ''); };
      w.HTMLDialogElement.prototype.close = function(){ this.removeAttribute('open'); };
      w.alert = m => errors.push(m); w.confirm = () => true;
      w.localStorage.setItem('turnos-v1', JSON.stringify({version: 3, settings: {step: 30, schedule: sched}, slots, dayState: {}}));
      w.addEventListener('error', e => errors.push(e.message));
    }});
  return {w: dom.window, d: dom.window.document, errors};
}
// Va a la vista Día y se mueve al día pedido (-1 = ayer, 1 = mañana, 0 = hoy)
const goDay = (d, off = -1) => {
  d.querySelector('.seg button[data-v="day"]').click();
  for(let i = 0; i < Math.abs(off); i++) d.getElementById(off < 0 ? 'prev' : 'next').click();
};

let a;
const link = () => a.d.getElementById('billOpen');
const dlg = () => a.d.getElementById('dlgBill');
const open = () => link().click();
const txt = id => a.d.getElementById(id).textContent.replace(/\s/g, '');

// Sin turnos: no hay enlace
a = boot({}); goDay(a.d);
check('día vacío: no hay "Ver facturación"', !link());

// Con turnos (ayer)
a = boot({[today]: {'10:00': {a: {name: 'A', price: 8000}}, '10:30': {a: {name: 'B'}, b: {name: 'C', price: 5000}}, '11:00': {blocked: true}}});
goDay(a.d);
check('fila resumen: "3 turnos · Ver facturación"', /^3turnos·Verfacturación/.test(a.d.querySelector('.summary').textContent.replace(/\s/g, '')));
check('cerrado: no se ve ningún monto en la pantalla', !/13\.000/.test(a.d.getElementById('app').textContent) && !dlg().hasAttribute('open'));
open();
check('al tocar se abre la ventana', dlg().hasAttribute('open'));
check('muestra el día', /\d/.test(a.d.getElementById('billDay').textContent));
check('total $13.000', txt('billTotal') === '$13.000');
check('1 turno sin precio', txt('billUnpriced') === '1');
check('sin precio resaltado', a.d.getElementById('billUnpriced').classList.contains('warn'));
check('sin pendientes: no aparece la fila', !a.d.getElementById('billPending'));
dlg().querySelector('[data-close]').click();
check('"Cerrar" la cierra', !dlg().hasAttribute('open'));
open();
dlg().querySelector('.sheetbox').click();
check('tocar adentro de la caja NO la cierra', dlg().hasAttribute('open'));
dlg().querySelector('#billTotal').click();
check('tocar un monto NO la cierra', dlg().hasAttribute('open'));
dlg().click();
check('tocar afuera (el diálogo mismo) la cierra', !dlg().hasAttribute('open'));

// Todos con precio: 0 y sin resaltar
a = boot({[today]: {'10:00': {a: {name: 'A', price: 8000}}}}); goDay(a.d); open();
check('todos con precio: 0 sin resaltar', txt('billUnpriced') === '0' && !a.d.getElementById('billUnpriced').classList.contains('warn'));

// Cargar el precio y volver a abrir: el total se actualiza
a = boot({[today]: {'10:00': {a: {name: 'A'}}}}); goDay(a.d); open();
check('antes: $0 y 1 sin precio', txt('billTotal') === '$0' && txt('billUnpriced') === '1');
dlg().removeAttribute('open');
a.d.querySelector(`.slot[data-t="10:00"]`).click();
const priceBtn = [...a.d.querySelectorAll('#dlgSlot button')].find(b => /Precio/i.test(b.textContent));
if(priceBtn) priceBtn.click();
const inp = a.d.querySelector('#sPriceForm input');
if(inp){
  inp.value = '9.000';
  a.d.getElementById('sPriceForm').dispatchEvent(new a.w.Event('submit', {cancelable: true, bubbles: true}));
}
a.d.getElementById('dlgSlot').removeAttribute('open');
open();
check('después: $9.000 y 0 sin precio', txt('billTotal') === '$9.000' && txt('billUnpriced') === '0');
dlg().removeAttribute('open');

// Un día futuro: los turnos sin precio son pendientes, no "sin precio"
a = boot({[tomorrow]: {'10:00': {a: {name: 'A'}}, '10:30': {a: {name: 'B'}}, '11:00': {a: {name: 'C', price: 3000}}}}); goDay(a.d, 1); open();
check('futuro: $3.000, 0 sin precio', txt('billTotal') === '$3.000' && txt('billUnpriced') === '0');
check('futuro: 2 pendientes', txt('billPending') === '2');

check('sin errores', a.errors.length === 0);
console.log(ok ? 'TODO OK' : 'HAY FALLAS'); process.exit(ok ? 0 : 1);