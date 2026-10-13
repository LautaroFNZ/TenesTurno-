// Texto y dinero.

// Escapa HTML: los nombres los escribe el usuario y se insertan con innerHTML.
export const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export const money = n => '$' + Number(n).toLocaleString('es-AR');

// Lee un precio escrito a mano. Formato argentino: el punto separa miles y la coma los decimales.
//   '12000' → 12000 · '12.000' → 12000 · '8500,50' → 8500.5 · '' → null (sin precio)
// Devuelve { ok:true, value } o { ok:false } si no se entiende.
export function parsePrice(input){
  const raw = String(input).trim().replace(/[\s$]/g, '');
  if(!raw) return {ok: true, value: null};
  const n = Number(raw.replace(/\./g, '').replace(',', '.'));
  if(!isFinite(n) || n < 0) return {ok: false};
  return {ok: true, value: n};
}


// Dinero abreviado para etiquetas chicas (gráficos): 8500 → $8,5k · 52000 → $52k · 1250000 → $1,3M · 0 → —
export function moneyShort(n){
  if(!n) return '—';
  if(n >= 1e6) return '$' + (n / 1e6).toLocaleString('es-AR', {maximumFractionDigits: 1}) + 'M';
  if(n >= 1e4) return '$' + Math.round(n / 1000) + 'k';
  if(n >= 1000) return '$' + (n / 1000).toLocaleString('es-AR', {maximumFractionDigits: 1}) + 'k';
  return money(n);
}