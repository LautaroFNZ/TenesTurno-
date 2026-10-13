# Cambios

## 1.0.0
- Proyecto reordenado: HTML + CSS + módulos JS nativos (sin cambios visibles para el usuario).
- Datos guardados con número de versión del formato (3). Si los datos son de una versión más nueva que la app, la app se bloquea y no escribe nada.
- Si los datos guardados no se pueden leer, se guarda una copia (`turnos-v1-ilegible`) antes de empezar de cero.
- La versión de la app se muestra en Ajustes.
- Pruebas automáticas (unitarias y de pantalla).

## 1.1.0
- Vista Día: recuadro con la facturación del día y la cantidad de turnos sin precio cargado.
- Los turnos que todavía no llegaron figuran como pendientes y no como sin precio.

## 1.2.0
- Ajustes se reorganiza en secciones, cada una en su pantalla: Días y horarios, Respaldos y Reportes.
- Nueva sección Reportes: facturación por día, semana y mes (facturado, turnos, promedio por turno, sin precio, pendientes, mejor día y gráfico de barras).
- El intervalo entre turnos deja de ser configurable: queda fijo en 30 minutos. El botón + (segundo turno en la mitad del horario) está siempre disponible. Los datos guardados con otro intervalo pasan a 30 sin perder turnos.
- Vista Día: "N turnos · Ver facturación" (hoja desde abajo, se cierra tocando afuera) y los turnos que todavía no llegaron cuentan como pendientes y no como "sin precio".