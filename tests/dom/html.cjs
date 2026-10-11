// Arma un HTML de un solo archivo a partir del proyecto, para probarlo con jsdom.
// jsdom no ejecuta módulos ES, así que se empaqueta js/main.js con esbuild y se mete el CSS adentro.
// Solo se usa en las pruebas: la app real no necesita ninguna herramienta de compilación.

const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const root = path.resolve(__dirname, '..', '..');

function loadHtml(){
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'css', 'styles.css'), 'utf8');
  const js = esbuild.buildSync({
    entryPoints: [path.join(root, 'js', 'main.js')], bundle: true, format: 'iife', write: false
  }).outputFiles[0].text;

  const linkTag = '<link rel="stylesheet" href="css/styles.css">';
  const scriptTag = '<script type="module" src="js/main.js"></script>';
  if(!html.includes(linkTag) || !html.includes(scriptTag)) throw new Error('index.html cambió: actualizar tests/dom/html.cjs');

  // se usan funciones como reemplazo porque el código contiene "$" y "$'" (que String.replace interpreta)
  return html.replace(linkTag, () => `<style>${css}</style>`).replace(scriptTag, () => `<script>${js}</script>`);
}

module.exports = {loadHtml};
