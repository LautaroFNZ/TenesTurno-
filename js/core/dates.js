// Fechas y horas. Las fechas viajan como texto 'AAAA-MM-DD' y las horas como 'HH:MM'.

export const DAYS = ['dom','lun','mar','mié','jue','vie','sáb'];
export const DAYS_LONG = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
export const MON = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
export const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
export const ORDER = [1,2,3,4,5,6,0]; // la semana empieza el lunes

export const pad = n => String(n).padStart(2, '0');
export const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
export const toTime = m => pad(Math.floor(m / 60)) + ':' + pad(m % 60);
export const fmt = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
export const parseDate = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const todayStr = () => fmt(new Date());
export const addDays = (s, n) => { const d = parseDate(s); d.setDate(d.getDate() + n); return fmt(d); };
export const weekStart = s => { const d = parseDate(s); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return fmt(d); };
