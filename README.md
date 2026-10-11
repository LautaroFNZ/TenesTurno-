# Turnos

App web instalable (PWA) para gestionar los turnos de una peluquería desde el iPhone. Los datos viven solo en el teléfono (`localStorage`, clave `turnos-v1`).

## Qué hace
- Vista semanal (tipo Google Calendar) y vista de día.
- Tocar un horario para anotar un cliente; `+` agrega un segundo turno a la mitad (ej. 11:30 y 11:45).
- Precio por turno, cancelar turno, bloquear horarios, cerrar/abrir días.
- Copiar los turnos disponibles de un día para mandarlos por WhatsApp.
- Horarios por día de la semana e intervalo configurables; respaldo (exportar/importar).

## Tecnología
HTML + CSS + módulos JavaScript nativos. Sin build, sin dependencias en la app. `node_modules` es solo para las pruebas.

## Estructura
```
index.html            pantalla y diálogos
css/styles.css        estilos
js/config.js          versión de la app, clave de almacenamiento, versión del formato
js/store.js           estado y guardado (localStorage)
js/core/              lógica pura, sin DOM (fechas, datos/migraciones, horarios)
js/ui/                pantallas y eventos
sw.js                 service worker (offline)
manifest.webmanifest  datos de instalación
tests/unit/           pruebas de la lógica (node:test)
tests/dom/            pruebas de pantalla (jsdom)
```

## Correr localmente
No abrir con doble clic (`file://`): los módulos no cargan. Opciones:
- VS Code → extensión **Live Server** → "Go Live", o
- `python -m http.server 8080` (o `npm start`) y abrir http://localhost:8080

## Pruebas
Requiere Node.
```
npm install
npm test          # unitarias
npm run test:dom  # pantalla
npm run test:all
```

## Publicar una versión
1. Subir `APP_VERSION` en `js/config.js` y `CACHE` en `sw.js` (mismo número).
2. Si se agregó o quitó un archivo, actualizar `FILES` en `sw.js`.
3. Anotar en `CHANGELOG.md`, correr `npm run test:all`.
4. `git commit` + `git tag vX.Y.Z`.
5. Desplegar primero en el sitio **beta**, probar (con un respaldo de datos reales), y recién después en producción.

**Volver atrás:** en Netlify, Deploys → elegir el deploy anterior → *Publish deploy*; o `git checkout vX.Y.Z` y volver a desplegar.

## Datos y versiones
Formato actual: versión 3 (`js/core/data.js`). Una versión nueva lee datos viejos y los migra; una versión vieja **no** puede leer datos más nuevos (queda bloqueada y no escribe). Volver el código atrás no vuelve los datos del teléfono atrás: exportar un respaldo antes de cambiar de versión. Al cambiar el formato, subir `SCHEMA_VERSION` y agregar la migración en `migrate`.

## Privacidad
Los datos no salen del teléfono. Quedan atados al dominio donde se instaló la app: cambiar de dirección implica exportar/importar.

## Ideas a futuro
Página de reservas online, confirmación por WhatsApp, reportes de facturación con envío mensual por mail (requieren backend).
