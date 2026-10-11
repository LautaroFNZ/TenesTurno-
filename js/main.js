// Punto de entrada: carga los datos, conecta los botones y dibuja la pantalla.

import {loadInto} from './store.js';
import {render} from './ui/render.js';
import {bindNavigation} from './ui/events.js';
import {bindSlotDialog} from './ui/slot-dialog.js';
import {bindSettings} from './ui/settings-dialog.js';
import {bindBilling} from './ui/billing-dialog.js';

loadInto();
try{ navigator.storage && navigator.storage.persist && navigator.storage.persist(); }catch(e){}

// los botones "Cancelar" / "Volver" / "Cerrar" de cualquier diálogo
document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => b.closest('dialog').close());

bindNavigation();
bindSlotDialog();
bindSettings();
bindBilling();

if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
render();