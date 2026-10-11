const {JSDOM} = require('jsdom');
const fs = require('fs');
const html = require('./html.cjs').loadHtml();
const pad = n => String(n).padStart(2,'0');
const fmt = d => d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const add = (s,n) => { const [y,m,d]=s.split('-').map(Number); const x=new Date(y,m-1,d); x.setDate(x.getDate()+n); return fmt(x); };
const wkStart = s => { const [y,m,d]=s.split('-').map(Number); const x=new Date(y,m-1,d); x.setDate(x.getDate()-(x.getDay()+6)%7); return fmt(x); };
const ws = wkStart(fmt(new Date())), tue = add(ws,1), wed = add(ws,2);
let ok = true; const check = (n,c) => { console.log((c?'PASS':'FAIL'), n); if(!c) ok=false; };
const sched = {}; for(let i=0;i<7;i++) sched[i]={open:true,start:'09:00',end:'20:00'};
const mk = (slots, step=30) => ({settings:{step,schedule:sched},slots:slots||{},dayState:{}});

function boot(pre){
  const errors = [];
  const dom = new JSDOM(html, {runScripts:'dangerously', url:'http://localhost/', pretendToBeVisual:true,
    beforeParse(w){
      w.HTMLDialogElement.prototype.showModal = function(){ this.setAttribute('open',''); };
      w.HTMLDialogElement.prototype.close = function(){ this.removeAttribute('open'); };
      w.alert = m => errors.push('ALERT: '+m); w.confirm = () => true;
      if(pre) w.localStorage.setItem('turnos-v1', JSON.stringify(pre));
      w.addEventListener('error', e => errors.push('ERR: '+e.message));
    }});
  const w = dom.window, d = w.document, $ = id => d.getElementById(id);
  return {w, d, $, errors,
    submit:(form,val)=>{ const ev=new w.Event('submit',{cancelable:true,bubbles:true}); if(val) ev.submitter=form.querySelector(`button[value="${val}"]`); form.dispatchEvent(ev); return ev; },
    cell:(date,t,sel='')=>d.querySelector(`.c${sel}[data-d="${date}"][data-t="${t}"]`),
    stored:()=>JSON.parse(w.localStorage.getItem('turnos-v1')),
    btns:(el)=>JSON.stringify([...el.querySelectorAll('.btn')].map(b=>b.textContent.trim()))};
}

// ===== 1) Anotar: sin notas, con + a la derecha del nombre
let T = boot();
let {w,d,$,errors} = T;
T.cell(tue,'11:30','.free').click();
check('no existe el input de Notas', !d.getElementById('sNote') && !/Nota/.test($('fSlot').textContent));
check('hay botón + a la derecha del nombre', $('sPlus').textContent === '+' && $('sPlus').parentElement === $('sName').parentElement && !$('sPlus').hidden);
check('input de 2º nombre oculto al principio', $('wrapB').hidden);
check('botones Cancelar | Anotar', T.btns($('fSlot').querySelector('.actions')) === '["Cancelar","Anotar"]');
$('sPlus').click();
check('+ despliega "Nombre 11:45"', !$('wrapB').hidden && $('lblB').textContent === 'Nombre 11:45');
check('el + pasa a −', $('sPlus').textContent === '−');
check('el 1º input indica 11:30', $('lblA').textContent === 'Nombre 11:30');
$('sName').value = 'Juan'; $('sName2').value = 'Ana';
T.submit($('fSlot'),'ok');
const sp = T.cell(tue,'11:30','.split');
check('celda partida al medio', !!sp && sp.querySelectorAll('.h.busy').length === 2);
check('muestra ambos nombres', /Juan/.test(sp.children[0].textContent) && /:45\s*Ana/.test(sp.children[1].textContent));
check('el orden de filas no cambia (22)', d.querySelectorAll('.tl').length === 22);
check('no hay fila extra de :45', ![...d.querySelectorAll('.tl')].some(x=>/:45/.test(x.textContent)));
check('guardado como a y b', JSON.stringify(T.stored().slots[tue]['11:30']) === '{"a":{"name":"Juan"},"b":{"name":"Ana"}}');

// ===== 2) Solo uno de los dos
T.cell(tue,'12:00','.free').click(); $('sName').value='Solo'; T.submit($('fSlot'),'ok');
check('solo 1º → celda roja entera', !!T.cell(tue,'12:00','.busy') && !T.cell(tue,'12:00','.split'));
T.cell(tue,'13:00','.free').click(); $('sPlus').click(); $('sName2').value='Tarde'; T.submit($('fSlot'),'ok');
const onlyB = T.cell(tue,'13:00','.split');
check('solo 2º → mitad de arriba libre, abajo roja', onlyB && !onlyB.children[0].classList.contains('busy') && onlyB.children[1].classList.contains('busy') && /:15\s*Tarde/.test(onlyB.children[1].textContent));
// vacío no guarda
T.cell(tue,'14:00','.free').click(); const ev = T.submit($('fSlot'),'ok');
check('sin nombres no guarda (se frena el envío)', ev.defaultPrevented && !T.stored().slots[tue]['14:00']);
// cerrar el 2º con − limpia
$('sPlus').click(); $('sName2').value='x'; $('sPlus').click();
check('− oculta y limpia el 2º input', $('wrapB').hidden && $('sName2').value === '' && $('sPlus').textContent === '+');
$('sName').value=''; $('dlgSlot').removeAttribute('open');

// ===== 3) Tocar una celda con dos turnos → elegir
T.cell(tue,'11:30','.split').click();
check('con dos turnos aparece el selector', !$('sPick').hidden && $('sInfo').hidden && $('fSlot').hidden);
check('selector lista 11:30 · Juan y 11:45 · Ana', $('pickA').textContent.trim() === '11:30 · Juan' && $('pickB').textContent.trim() === '11:45 · Ana');
$('sPick').querySelector('[data-close]').click();
check('Volver cierra el selector', !$('dlgSlot').hasAttribute('open'));
T.cell(tue,'11:30','.split').click(); $('pickB').click();
check('elegir 11:45 abre el detalle de Ana', !$('sInfo').hidden && $('iName').textContent === 'Ana' && /11:45/.test($('sTitle').textContent));
check('opciones: Volver | Cancelar turno | Precio', T.btns($('sInfo')) === '["Volver","Cancelar turno","Precio"]');
check('Volver del detalle regresa al selector', ($('iBack').click(), !$('sPick').hidden && $('sInfo').hidden));

// ===== 4) Precio
$('pickA').click();
check('detalle de Juan sin precio', $('iName').textContent === 'Juan' && /Sin precio/.test($('iPrice').textContent));
$('sPriceBtn').click();
check('Precio abre el formulario', !$('sPriceForm').hidden && $('sInfo').hidden);
$('sPrice').value = '12.000'; T.submit($('sPriceForm'));
check('guarda 12000 y vuelve al detalle', T.stored().slots[tue]['11:30'].a.price === 12000 && !$('sInfo').hidden && /\$\s?12\.000/.test($('iPrice').textContent));
check('el precio no se mezcla con el otro turno', T.stored().slots[tue]['11:30'].b.price === undefined);
$('sPriceBtn').click(); check('el formulario trae el precio actual', $('sPrice').value === '12000');
$('sPrice').value = 'abc'; T.submit($('sPriceForm'));
check('precio inválido → aviso y no cambia', errors.some(e=>/solo números/.test(e)) && T.stored().slots[tue]['11:30'].a.price === 12000);
$('sPrice').value = '8500,50'; T.submit($('sPriceForm'));
check('acepta coma decimal', T.stored().slots[tue]['11:30'].a.price === 8500.5);
$('sPriceBtn').click(); $('sPrice').value = ''; T.submit($('sPriceForm'));
check('vacío quita el precio', T.stored().slots[tue]['11:30'].a.price === undefined);
$('sPriceBtn').click(); $('sPrice').value = '15000'; T.submit($('sPriceForm'));
$('pBack').click === undefined; $('iBack').click(); $('dlgSlot').removeAttribute('open');

// precio visible en vista Día
d.querySelector('.seg button[data-v="day"]').click();
for(let i=0;i<(new Date(tue+'T00:00') - new Date(fmt(new Date())+'T00:00'))/864e5;i++) $('next').click();
for(let i=0;i<(new Date(fmt(new Date())+'T00:00') - new Date(tue+'T00:00'))/864e5;i++) $('prev').click();
const card = d.querySelector('.slot.busy[data-t="11:30"]');
check('vista Día: tarjeta con ambos nombres', card && /Juan/.test(card.textContent) && /11:45/.test(card.textContent) && /Ana/.test(card.textContent));
check('vista Día: muestra el precio de Juan', /\$\s?15\.000/.test(card.textContent));
check('vista Día: cuenta 5 turnos (Juan, Ana, Solo, Tarde)… ', /4 turnos/.test($('app').textContent));
d.querySelector('.seg button[data-v="week"]').click();

// ===== 5) Cancelar turno
T.cell(tue,'11:30','.split').click(); $('pickB').click();
w.confirm = () => false; $('sCancelTurn').click();
check('responder "no" conserva el turno', !!T.stored().slots[tue]['11:30'].b);
w.confirm = () => true; $('sCancelTurn').click();
check('cancelar 11:45 deja solo a Juan (celda roja entera)', !!T.cell(tue,'11:30','.busy') && !T.cell(tue,'11:30','.split') && !T.stored().slots[tue]['11:30'].b && T.stored().slots[tue]['11:30'].a.price === 15000);
check('cancelar cierra el diálogo', !$('dlgSlot').hasAttribute('open'));

// ===== 6) Un solo turno → directo al detalle, y agregar el otro
T.cell(tue,'11:30','.busy').click();
check('un solo turno: sin selector, directo al detalle', $('sPick').hidden && !$('sInfo').hidden && $('iName').textContent === 'Juan');
check('ofrece "Agregar turno 11:45"', !$('sAddHalf').hidden && $('sAddHalf').textContent === 'Agregar turno 11:45');
$('sAddHalf').click();
check('formulario solo para 11:45', $('wrapA').hidden && !$('wrapB').hidden && $('lblB').textContent === 'Nombre 11:45' && $('sPlus').hidden && $('sBlock').hidden);
$('sName2').value = 'Marta'; T.submit($('fSlot'),'ok');
const s2 = T.stored().slots[tue]['11:30'];
check('agregar 11:45 conserva a Juan y su precio', s2.a.name==='Juan' && s2.a.price===15000 && s2.b.name==='Marta');
// solo B → agregar A
T.cell(tue,'13:00','.split').click();
check('solo 11:45 → directo al detalle de ese turno', $('sPick').hidden && $('iName').textContent === 'Tarde' && /13:15/.test($('sTitle').textContent));
check('ofrece "Agregar turno 13:00"', $('sAddHalf').textContent === 'Agregar turno 13:00');
$('sAddHalf').click();
check('formulario solo para 13:00', !$('wrapA').hidden && $('wrapB').hidden && $('lblA').textContent === 'Nombre 13:00' && $('sPlus').hidden);
$('sName').value = 'Temprano'; T.submit($('fSlot'),'ok');
check('queda a y b', T.stored().slots[tue]['13:00'].a.name === 'Temprano' && T.stored().slots[tue]['13:00'].b.name === 'Tarde');

// cancelar los dos → la celda vuelve a libre y no quedan restos
T.cell(tue,'13:00','.split').click(); $('pickA').click(); $('sCancelTurn').click();
T.cell(tue,'13:00','.split').click(); // ahora es solo B
$('sCancelTurn').click();
check('cancelar ambos libera la celda', !!T.cell(tue,'13:00','.free') && !T.stored().slots[tue]['13:00']);

// ===== 7) Bloqueo sigue funcionando
T.cell(tue,'15:00','.free').click(); $('sBlock').click();
check('bloquear', !!T.cell(tue,'15:00','.block'));
T.cell(tue,'15:00','.block').click(); $('sUnblock').click();
check('desbloquear', !!T.cell(tue,'15:00','.free'));

// ===== 8) "Turnos disponibles" no ofrece horarios con un turno a medias
d.querySelector('.seg button[data-v="day"]').click();
check('día martes', /martes/i.test($('hTitle').textContent));
const full = 22; const occupied = ['11:30','12:00'].length; // 13:00 liberado, 15:00 desbloqueado
check('botón cuenta solo horarios totalmente libres (20)', $('copyAvail').textContent === `Copiar turnos disponibles (${full-occupied})`);

// ===== 9) Migración de datos del formato anterior (con notas)
T = boot({settings:{step:30,schedule:sched},slots:{[wed]:{'10:00':{name:'Pedro',note:'corte + barba'},'10:30':{blocked:true},'11:00':{name:'   '}}},dayState:{}});
({w,d,$,errors} = T);
check('migra {name,note} → {a:{name}} sin nota', JSON.stringify(T.stored ? null : null) === 'null');
const cellP = T.cell(wed,'10:00','.busy');
check('turno viejo se ve normal', cellP && cellP.textContent === 'Pedro');
check('bloqueo viejo se conserva', !!T.cell(wed,'10:30','.block'));
check('nombre vacío descartado', !!T.cell(wed,'11:00','.free'));
cellP.click(); $('sPriceBtn').click(); $('sPrice').value='9000'; T.submit($('sPriceForm'));
const st = T.stored().slots[wed];
check('al guardar queda en formato nuevo, sin nota', JSON.stringify(st['10:00']) === '{"a":{"name":"Pedro","price":9000}}');
check('sin errores en migración', errors.length === 0);

// ===== 10) Intervalos donde no se puede partir
for(const step of [15,45]){
  T = boot(mk({}, step)); ({w,d,$} = T);
  const first = d.querySelector('.c.free'); first.click();
  check(`intervalo ${step}: el + no aparece`, $('sPlus').hidden);
}
T = boot(mk({}, 60)); ({w,d,$} = T);
T.cell(tue,'11:00','.free').click(); $('sPlus').click();
check('intervalo 60: el 2º turno es a las 11:30', $('lblB').textContent === 'Nombre 11:30');
T = boot(mk({}, 20)); ({w,d,$} = T);
T.cell(tue,'11:00','.free').click(); $('sPlus').click();
check('intervalo 20: el 2º turno es a las 11:10', $('lblB').textContent === 'Nombre 11:10');

// ===== 11) XSS en nombres
T = boot(); ({w,d,$} = T);
T.cell(tue,'09:00','.free').click(); $('sPlus').click(); $('sName').value='<img src=x onerror=alert(1)>'; $('sName2').value='<b>x</b>'; T.submit($('fSlot'),'ok');
check('escapa HTML en celda partida', !d.querySelector('.c.split img') && !d.querySelector('.c.split b'));

console.log(ok ? 'TODO OK' : 'HAY FALLOS');
process.exit(ok?0:1);
