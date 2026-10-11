// Corre todas las pruebas de pantalla (jsdom) una tras otra. Falla si alguna falla.
const {execFileSync} = require('child_process');
const path = require('path');

const files = ['weekly-view.cjs', 'availability.cjs', 'half-turns-and-price.cjs', 'data-safety.cjs', 'billing.cjs'];
let failed = false;
for(const f of files){
  console.log('\n===== ' + f + ' =====');
  try{ execFileSync(process.execPath, [path.join(__dirname, f)], {stdio: 'inherit'}); }
  catch(e){ failed = true; }
}
console.log(failed ? '\nHAY PRUEBAS QUE FALLAN' : '\nTODAS LAS PRUEBAS DE PANTALLA PASAN');
process.exit(failed ? 1 : 0);
