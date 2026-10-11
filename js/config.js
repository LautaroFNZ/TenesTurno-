// Configuración global de la app.

// Versión de la app. Subirla en cada publicación (y también CACHE en sw.js).
export const APP_VERSION = '1.0.0';

// Clave de localStorage. NO cambiarla: es lo que conecta la app con los datos
// que ya están guardados en el celular.
export const STORAGE_KEY = 'turnos-v1';

// Versión del formato de los datos guardados.
//   1 → prototipo inicial (los días se creaban a mano)
//   2 → { settings, slots:{ fecha:{ hora:{ name, note } } }, dayState }
//   3 → cada horario guarda hasta dos turnos: { a:{name, price?}, b:{name, price?} }
// Si algún día cambia el formato: subir este número y agregar el paso en core/data.js.
export const SCHEMA_VERSION = 3;
