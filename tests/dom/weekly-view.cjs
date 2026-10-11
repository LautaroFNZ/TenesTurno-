const {JSDOM} = require('jsdom');
const fs = require('fs');
const html = require('./html.cjs').loadHtml();
const pad = n => String(n).padStart(2,'0');
const fmt = d => d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const add = (s,n) => { const [y,m,d]=s.split('-').map(Number); const x=new Date(y,m-1,d); x.setDate(x.getDate()+n); return fmt(x); };
const wkStart = s => { const [y,m,d]=s.split('-').map(Number); const x=new Date(y,m-1,d); x.setDate(x.getDate()-(x.getDay()+6)%7); return fmt(x); };
const today = fmt(new Date());
const ws = wkStart(today);
const tue = add(ws,1), sun = add(ws,6), mon = ws;

function boot(pre){
  const errors = [];
  const dom = new JSDOM(html, {runScripts:'dangerously', url:'http://localhost/', pretendToBeVisual:true,
    beforeParse(w){
      w.HTMLDialogElement.prototype.showModal = function(){ this.setAttribute('open',''); };
      w.HTMLDialogElement.prototype.close = function(){ this.removeAttribute('open'); };
      w.alert = m => errors.push('ALERT: '+m);
      w.confirm = () => true;
      if(pre) w.localStorage.setItem('turnos-v1', JSON.stringify(pre));
      w.addEventListener('error', e => errors.push('ERR: '+e.message));
    }});
  return {w:dom.window, d:dom.window.document, errors};
}
let ok = true; const check = (n,c) => { console.log((c?'PASS':'FAIL'), n); if(!c) ok=false; };
const submit = (w,form,val) => { const ev=new w.Event('submit',{cancelable:true,bubbles:true}); ev.submitter=form.querySelector(`button[value="${val}"]`); form.dispatchEvent(ev); };

// ---- 1) Arranque limpio: la semana ya viene armada
let {w,d,errors} = boot();
const $ = id => d.getElementById(id);
check('arranca en vista semana', d.querySelector('.seg button.on').dataset.v === 'week');
check('7 encabezados de día', d.querySelectorAll('button.gh').length === 7);
check('22 filas de horario (9:00-20:00 c/30)', d.querySelectorAll('.tl').length === 22);
check('hoy resaltado', d.querySelectorAll('.gh.today').length === 1);
check('ningún día cerrado por defecto', d.querySelectorAll('.gh.closed').length === 0);
const freeCells = d.querySelectorAll('.c.free').length;
check('celdas libres = 7 días x 22', freeCells === 154);
check('no hay celdas fuera de horario', d.querySelectorAll('.c.off').length === 0);

// ---- 2) Reservar con un toque
const cell = d.querySelector(`.c.free[data-d="${tue}"][data-t="10:00"]`);
cell.click();
check('abre diálogo', $('dlgSlot').hasAttribute('open'));
check('título del diálogo', /martes/.test($('sTitle').textContent) && /10:00/.test($('sTitle').textContent));
$('sName').value = 'Juan';
submit(w, $('fSlot'), 'ok');
const busy = d.querySelector(`.c.busy[data-d="${tue}"][data-t="10:00"]`);
check('celda ocupada con nombre', busy && busy.textContent === 'Juan');
const saved = JSON.parse(w.localStorage.getItem('turnos-v1'));
check('persistido', saved.slots[tue]['10:00'].a.name === 'Juan');
// nombre vacío no guarda
d.querySelector(`.c.free[data-d="${tue}"][data-t="10:30"]`).click(); $('sName').value=''; submit(w,$('fSlot'),'ok');
check('nombre vacío no guarda', !d.querySelector(`.c.busy[data-d="${tue}"][data-t="10:30"]`));
$('dlgSlot').removeAttribute('open');
// XSS
d.querySelector(`.c.free[data-d="${tue}"][data-t="11:00"]`).click(); $('sName').value='<img src=x onerror=alert(1)>'; submit(w,$('fSlot'),'ok');
check('escapa HTML', !d.querySelector('.c.busy img'));
// diálogo de horario libre
d.querySelector(`.c.free[data-d="${tue}"][data-t="09:30"]`).click();
check('libre: formulario visible, sin info', !$('fSlot').hidden && $('sInfo').hidden && $('sBlocked').hidden);
check('libre: botones Cancelar | Anotar', JSON.stringify([...$('fSlot').querySelectorAll('.actions .btn')].map(b=>b.textContent.trim()))==='["Cancelar","Anotar"]');
$('fSlot').querySelector('[data-close]').click();
check('Cancelar cierra sin anotar', !$('dlgSlot').hasAttribute('open') && !d.querySelector(`.c.busy[data-d="${tue}"][data-t="09:30"]`));
// diálogo de turno ocupado
d.querySelector(`.c.busy[data-d="${tue}"][data-t="10:00"]`).click();
check('ocupado: muestra nombre', !$('sInfo').hidden && $('fSlot').hidden && $('iName').textContent==='Juan');
check('ocupado: botones Volver | Cancelar turno | Precio', JSON.stringify([...$('sInfo').querySelectorAll('.btn')].map(b=>b.textContent.trim()))==='["Volver","Cancelar turno","Precio"]');
$('iBack').click();
check('Volver no cambia nada', !$('dlgSlot').hasAttribute('open') && !!d.querySelector(`.c.busy[data-d="${tue}"][data-t="10:00"]`));
d.querySelector(`.c.busy[data-d="${tue}"][data-t="10:00"]`).click();
w.confirm = () => false; $('sCancelTurn').click();
check('responder "no" conserva el turno', !!d.querySelector(`.c.busy[data-d="${tue}"][data-t="10:00"]`));
w.confirm = () => true; $('sCancelTurn').click();
check('Cancelar turno libera el horario y cierra', !!d.querySelector(`.c.free[data-d="${tue}"][data-t="10:00"]`) && !$('dlgSlot').hasAttribute('open'));
// bloquear / desbloquear
d.querySelector(`.c.free[data-d="${tue}"][data-t="12:00"]`).click(); $('sBlock').click();
check('bloquear', !!d.querySelector(`.c.block[data-d="${tue}"][data-t="12:00"]`));
d.querySelector(`.c.block[data-d="${tue}"][data-t="12:00"]`).click();
check('bloqueado: Volver | Desbloquear', !$('sBlocked').hidden && $('fSlot').hidden && $('sInfo').hidden);
$('sUnblock').click();
check('desbloquear', !!d.querySelector(`.c.free[data-d="${tue}"][data-t="12:00"]`));

// ---- 3) Navegar semanas
const title0 = $('hTitle').textContent;
$('next').click();
check('semana siguiente cambia título', $('hTitle').textContent !== title0);
check('semana siguiente sin turnos (todo libre)', d.querySelectorAll('.c.busy').length === 0);
$('prev').click();
check('volver mantiene turno', d.querySelectorAll('.c.busy').length === 1);
$('next').click(); $('todayBtn').click();
check('Hoy vuelve a la semana actual', $('hTitle').textContent === title0);

// ---- 4) Vista día
d.querySelector(`button.gh[data-day="${tue}"]`).click();
check('tocar día abre vista Día', d.querySelector('.seg button.on').dataset.v === 'day');
check('lista con 22 horarios', d.querySelectorAll('.slot').length === 22);
d.querySelector('.slot[data-t="15:00"]').click(); $('sName').value='Ana'; submit(w,$('fSlot'),'ok');
check('reservar desde vista día', /Ana/.test(d.querySelector('.slot.busy[data-t="15:00"]').textContent));
$('next').click();
check('día siguiente = miércoles', /miércoles/.test($('hTitle').textContent));
// ---- 5) Cerrar / abrir día y excepciones
$('toggleDay').click();
check('cerrar día → vacío', /Este día está cerrado/.test($('app').textContent));
$('toggleDay').click();
check('reabrir día', d.querySelectorAll('.slot').length === 22);
check('sin excepción residual', Object.keys(JSON.parse(w.localStorage.getItem('turnos-v1')).dayState).length === 0);
// abrir un domingo (cerrado por defecto)
d.querySelector('.seg button[data-v="week"]').click();
d.querySelector(`button.gh[data-day="${sun}"]`).click();
check('domingo abierto en vista día', d.querySelectorAll('.slot.free').length === 22 && /Cerrar día/.test($('toggleDay').textContent));
$('toggleDay').click();
check('cerrar domingo (feriado) → vacío', /Este día está cerrado/.test($('app').textContent));
d.querySelector('.seg button[data-v="week"]').click();
check('domingo tachado en semana', d.querySelectorAll('.gh.closed').length === 1);
d.querySelector(`button.gh[data-day="${sun}"]`).click(); $('toggleDay').click();
d.querySelector('.seg button[data-v="week"]').click();
check('reabrir domingo', d.querySelectorAll('.gh.closed').length === 0);

// ---- 6) Ajustes: cambiar horario de martes y abrir lunes
$('menuBtn').click();
check('ajustes: los 7 días tildados', d.querySelectorAll('[data-o]:checked').length === 7);
check('ajustes con 7 filas', d.querySelectorAll('.srow').length === 7);
const orden = [...d.querySelectorAll('.srow .chk span')].map(s=>s.textContent).join(',');
check('orden lunes→domingo', orden === 'Lunes,Martes,Miércoles,Jueves,Viernes,Sábado,Domingo');
d.querySelector('[data-o="1"]').checked = false;
d.querySelector('[data-s="2"]').value = '10:00'; d.querySelector('[data-e="2"]').value = '14:00';
$('cClose').click();
check('lunes ahora cerrado desde ajustes', d.querySelectorAll('.gh.closed').length === 1);
check('martes 10-14: celdas fuera de horario inactivas', !!d.querySelector(`div.c.off`) );
const tueFree = [...d.querySelectorAll(`.c.free[data-d="${tue}"]`)].map(c=>c.dataset.t);
check('martes libre sólo 10:00-13:30 (+ reservas existentes)', tueFree.every(t=>t>='10:00'&&t<'14:00'));
// validación
$('menuBtn').click(); d.querySelector('[data-e="3"]').value='08:00'; $('cClose').click();
check('rechaza fin antes de inicio', errors.some(e=>/Revisá los horarios/.test(e)) && $('dlgMenu').hasAttribute('open'));
$('dlgMenu').removeAttribute('open');

// ---- 7) Reserva fuera de nuevo horario sigue visible
check('turno de las 15:00 del martes sigue visible fuera de horario', !!d.querySelector(`.c.busy[data-d="${tue}"]`));

// ---- 8) Migración desde el prototipo 1
const old = {settings:{start:'10:00',end:'13:00',step:30}, days:{[sun]:{start:'10:00',end:'13:00',step:30,slots:{'10:30':{name:'Pedro',note:''}}}}};
({w,d,errors} = boot(old));
check('migra: turno de Pedro visible', [...d.querySelectorAll('.c.busy')].some(c=>c.textContent==='Pedro'));
check('migra: día migrado queda abierto', d.querySelector(`button.gh[data-day="${sun}"]`) && !d.querySelector(`button.gh[data-day="${sun}"]`).classList.contains('closed'));
check('migra: sin errores', errors.length===0);

// ---- 9) Datos corruptos no rompen
({w,d,errors} = boot({basura:true}));
check('datos inválidos → defaults', d.querySelectorAll('.tl').length === 22 && errors.length===0);

// ---- 10) Datos guardados con el default anterior (dom y lun cerrados) pasan a todo abierto
const sch = {}; for(let i=0;i<7;i++) sch[i]={open:i!==0&&i!==1,start:'09:00',end:'20:00'};
({w,d,errors} = boot({settings:{step:30,schedule:sch},slots:{},dayState:{}}));
check('default viejo → todos los días abiertos', d.querySelectorAll('.gh.closed').length === 0 && d.querySelectorAll('.c.free').length === 154);
// pero si el peluquero configuró otro horario, se respeta
const sch2 = {}; for(let i=0;i<7;i++) sch2[i]={open:i!==0&&i!==1,start:'10:00',end:'19:00'};
({w,d,errors} = boot({settings:{step:30,schedule:sch2},slots:{},dayState:{}}));
check('horario personalizado se respeta', d.querySelectorAll('.gh.closed').length === 2);
// ---- 11) Colores: libre verde, ocupado/bloqueado rojo
const css = html.match(/<style>([\s\S]*?)<\/style>/)[1];
check('CSS: libre sin fondo de color (blanco)', !/gbg/.test(css) && !/\.c\.free\{background/.test(css));
check('CSS: ocupado rojo', /\.c\.busy\{background:var\(--rbg\)/.test(css) && /--rbg:#fecaca/.test(css));
check('CSS: bloqueado gris (no rojo)', /\.c\.block\{background:repeating-linear-gradient\(45deg,var\(--off\)/.test(css));
console.log(ok ? 'TODO OK' : 'HAY FALLOS');
process.exit(ok?0:1);
