const {JSDOM} = require('jsdom');
const html = require('./html.cjs').loadHtml();
const pad = n => String(n).padStart(2, '0');
const dstr = o => { const t = new Date(); t.setDate(t.getDate() + o); return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`; };
let ok = true; const check = (n, c) => { console.log(c ? 'PASS' : 'FAIL', n); if(!c) ok = false; };
const sched = {}; for(let i = 0; i < 7; i++) sched[i] = {open: true, start: '09:00', end: '20:00'};
const ayer = dstr(-1);

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
  const w = dom.window, d = w.document;
  return {w, d, errors, $: id => d.getElementById(id), txt: id => d.getElementById(id).textContent.replace(/\s/g, '')};
}

const T = boot({[ayer]: {'10:00': {a: {name: 'A', price: 8000}, b: {name: 'B', price: 5000}}, '11:00': {a: {name: 'C'}}, '12:00': {a: {name: 'D', price: 6000}}}});
const {d, $, txt, errors} = T;
const vis = id => !$(id).hidden;

// --- Estructura
$('menuBtn').click();
check('Ajustes abre en la lista', vis('mHome') && !vis('mSched') && !vis('mBackup') && !vis('mReports'));
check('título "Ajustes"', $('menuTitle').textContent === 'Ajustes');
check('lista con 3 secciones', d.querySelectorAll('#mHome [data-go]').length === 3);
check('muestra la versión', /^Versión \d+\.\d+\.\d+$/.test($('appVersion').textContent));
check('en la lista no hay botón de volver visible', $('menuBack').style.visibility === 'hidden');
check('ya no existe el intervalo entre turnos', !d.getElementById('cStep') && !/Intervalo entre turnos/.test(d.getElementById('dlgMenu').textContent));

// --- Días y horarios
d.querySelector('[data-go="mSched"]').click();
check('Días y horarios: título y 7 filas', $('menuTitle').textContent === 'Días y horarios' && d.querySelectorAll('.srow').length === 7 && $('menuBack').style.visibility === 'visible');
$('menuBack').click();
check('"‹ Ajustes" vuelve a la lista', vis('mHome'));

// --- Respaldos
d.querySelector('[data-go="mBackup"]').click();
check('Respaldos: título y botones', $('menuTitle').textContent === 'Respaldos' && !!$('exportBtn') && !!$('importBtn') && vis('mBackup'));
$('menuBack').click();

// --- Reportes
d.querySelector('[data-go="mReports"]').click();
check('Reportes: título', $('menuTitle').textContent === 'Reportes' && vis('mReports'));
check('Reportes arranca en Semana', d.querySelector('#rTabs button.on').dataset.m === 'week');
// Va a la semana de ayer: el período arranca en el día que se está mirando (hoy), así que se retrocede si ayer cayó en otra semana
const hoy = new Date(); const lunes = (hoy.getDay() + 6) % 7 === 0;   // si hoy es lunes, ayer es de la semana anterior
if(lunes) $('rPrev').click();
check('semana: facturado $19.000', txt('rTotal') === '$19.000');
check('semana: 3 turnos con precio + 1 sin precio = 4 turnos', txt('rTurns') === '4');
check('semana: promedio $6.333', txt('rAvg') === '$6.333');
check('semana: 1 sin precio, resaltado', txt('rUnpriced') === '1' && d.getElementById('rUnpriced').closest('.k').classList.contains('warn'));
check('semana: hay mejor día', !!$('rBest'));
check('semana: 7 barras', d.querySelectorAll('#rBars > div').length === 7);
check('semana: una sola barra destacada', d.querySelectorAll('#rBars > div.top').length === 1);

// --- cambiar a Día / Mes
d.querySelector('#rTabs [data-m="month"]').click();
check('mes: pestaña activa', d.querySelector('#rTabs button.on').dataset.m === 'month');
check('mes: título con el año', /\d{4}/.test($('rTitle').textContent));
d.querySelector('#rTabs [data-m="day"]').click();
$('rPrev').click();   // el día arranca en hoy; los datos de la prueba son de ayer
check('día de ayer: facturado $19.000', txt('rTotal') === '$19.000');
check('día: no hay "mejor día"', !d.getElementById('rBest'));
check('día: barras por hora', /hora/.test(d.querySelector('.chart h5').textContent));

// --- navegación de períodos
const t0 = $('rTitle').textContent;
$('rNext').click();
check('siguiente cambia el período', $('rTitle').textContent !== t0);
check('día siguiente sin turnos: mensaje vacío y sin barras', !!$('rEmpty') && !d.getElementById('rBars'));
$('rPrev').click();
check('anterior vuelve', $('rTitle').textContent === t0);

// --- cerrar y reabrir: vuelve a la lista (pero recuerda el modo)
$('menuClose').click();
check('Cerrar cierra Ajustes', !$('dlgMenu').hasAttribute('open'));
$('menuBtn').click();
check('al reabrir arranca en la lista', vis('mHome') && $('menuTitle').textContent === 'Ajustes');
d.querySelector('[data-go="mReports"]').click();
check('Reportes recuerda el último modo (Día)', d.querySelector('#rTabs button.on').dataset.m === 'day');
$('dlgMenu').removeAttribute('open');

check('sin errores de ejecución', errors.length === 0);
console.log(ok ? 'TODO OK' : 'HAY FALLAS'); process.exit(ok ? 0 : 1);