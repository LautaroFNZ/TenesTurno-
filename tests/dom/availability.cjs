const {JSDOM} = require('jsdom');
const fs = require('fs');
const html = require('./html.cjs').loadHtml();
let ok = true; const check = (n,c) => { console.log((c?'PASS':'FAIL'), n); if(!c) ok=false; };

function boot({pre, fake, clipboard, exec}){
  const errors = [];
  const dom = new JSDOM(html, {runScripts:'dangerously', url:'http://localhost/', pretendToBeVisual:true,
    beforeParse(w){
      w.HTMLDialogElement.prototype.showModal = function(){ this.setAttribute('open',''); };
      w.HTMLDialogElement.prototype.close = function(){ this.removeAttribute('open'); };
      w.alert = m => errors.push('ALERT: '+m); w.confirm = () => true;
      if(fake){ const R = w.Date; w.Date = class extends R { constructor(...a){ if(a.length) super(...a); else super(...fake); } }; }
      if(pre) w.localStorage.setItem('turnos-v1', JSON.stringify(pre));
      Object.defineProperty(w, 'isSecureContext', {value:true});
      if(clipboard) Object.defineProperty(w.navigator, 'clipboard', {value:clipboard, configurable:true});
      if(exec) w.document.execCommand = exec;
      w.addEventListener('error', e => errors.push('ERR: '+e.message));
    }});
  return {w:dom.window, d:dom.window.document, errors};
}
const sched = {}; for(let i=0;i<7;i++) sched[i]={open:true,start:'09:00',end:'20:00'};
const mkdb = slots => ({settings:{step:30,schedule:sched},slots,dayState:{}});
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  // fecha fija: hoy = sáb 2026-10-10 14:10 → miércoles 2026-10-14 es futuro
  const FAKE = [2026,9,10,14,10];
  const futuro = '2026-10-14';
  const db = mkdb({[futuro]:{'10:00':{name:'Juan'},'12:00':{blocked:true},'12:30':{name:'Ana'}}});

  // 1) Copia con Clipboard API
  let copied = null;
  let {w,d,errors} = boot({pre:db, fake:FAKE, clipboard:{writeText: async t => { copied = t; }}});
  d.querySelector('.seg button[data-v="day"]').click();
  // ir al miércoles 14 (hoy sábado 10 → +4 días)
  for(let i=0;i<4;i++) d.getElementById('next').click();
  check('título = miércoles 14 oct', /miércoles 14 oct/i.test(d.getElementById('hTitle').textContent));
  const btn = () => d.getElementById('copyAvail');
  // 22 horarios - 10:00 - 12:00 - 12:30 = 19
  check('botón muestra cantidad (19)', btn().textContent === 'Copiar turnos disponibles (19)');
  btn().click(); await wait(20);
  const times = []; for(let m=9*60;m<20*60;m+=30){ const t=String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0'); if(!['10:00','12:00','12:30'].includes(t)) times.push(t); }
  const by = {}; times.forEach(t => (by[t.slice(0,2)] = by[t.slice(0,2)]||[]).push(t));
  const expected = 'Turnos disponibles – Miércoles 14 de octubre:\n\n' + Object.keys(by).sort().map(h=>by[h].join(' · ')).join('\n');
  check('texto copiado correcto', copied === expected);
  console.log('--- texto copiado ---\n' + copied + '\n---------------------');
  check('no incluye turno ocupado ni bloqueado', !/10:00|12:00|12:30/.test(copied));
  check('feedback "Copiado"', /Copiado/.test(btn().textContent));
  await wait(2600);
  check('el botón vuelve a su texto', btn().textContent === 'Copiar turnos disponibles (19)');

  // 2) Sin Clipboard API → execCommand
  let viaExec = null;
  ({w,d,errors} = boot({pre:db, fake:FAKE, exec: () => { viaExec = d_ta(); return true; }}));
  function d_ta(){ return w.document.querySelector('textarea[readonly][style*="fixed"]').value; }
  d.querySelector('.seg button[data-v="day"]').click(); for(let i=0;i<4;i++) d.getElementById('next').click();
  d.getElementById('copyAvail').click(); await wait(20);
  check('fallback execCommand copia el mismo texto', viaExec === expected);
  check('fallback limpia el textarea temporal', !w.document.querySelector('textarea[style*="fixed"]'));

  // 3) Si falla todo → diálogo manual
  ({w,d,errors} = boot({pre:db, fake:FAKE, exec: () => false}));
  d.querySelector('.seg button[data-v="day"]').click(); for(let i=0;i<4;i++) d.getElementById('next').click();
  d.getElementById('copyAvail').click(); await wait(20);
  check('si falla, abre diálogo con el texto', d.getElementById('dlgCopy').hasAttribute('open') && d.getElementById('copyArea').value === expected);
  d.querySelector('#dlgCopy [data-close]').click();
  check('el diálogo se puede cerrar', !d.getElementById('dlgCopy').hasAttribute('open'));

  // 4) Hoy: no ofrece horarios que ya pasaron (son las 14:10)
  copied = null;
  ({w,d,errors} = boot({pre:mkdb({}), fake:FAKE, clipboard:{writeText: async t => { copied = t; }}}));
  d.querySelector('.seg button[data-v="day"]').click();
  check('hoy: título sábado 10', /sábado 10 oct/i.test(d.getElementById('hTitle').textContent));
  d.getElementById('copyAvail').click(); await wait(20);
  check('hoy: primer horario 14:30', /\n\n14:30\n15:00 · 15:30\n/.test(copied) && !/13:30|14:00/.test(copied));
  check('hoy: último 19:30', /19:00 · 19:30$/.test(copied));

  // 5) Día cerrado / sin turnos libres → botón deshabilitado
  ({w,d,errors} = boot({pre:mkdb({}), fake:FAKE}));
  d.querySelector('.seg button[data-v="day"]').click(); d.getElementById('next').click();
  d.getElementById('toggleDay').click();
  check('día cerrado: botón deshabilitado', d.getElementById('copyAvail').disabled && /No hay turnos/.test(d.getElementById('copyAvail').textContent));
  d.getElementById('toggleDay').click();
  check('reabrir: habilitado de nuevo', !d.getElementById('copyAvail').disabled);
  // todo ocupado
  const full = {}; for(let m=9*60;m<20*60;m+=30){ full[String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0')]={name:'X'}; }
  ({w,d,errors} = boot({pre:mkdb({[futuro]:full}), fake:FAKE}));
  d.querySelector('.seg button[data-v="day"]').click(); for(let i=0;i<4;i++) d.getElementById('next').click();
  check('día lleno: botón deshabilitado', d.getElementById('copyAvail').disabled);
  check('sin errores', errors.length === 0);

  console.log(ok ? 'TODO OK' : 'HAY FALLOS');
  process.exit(ok ? 0 : 1);
})();
