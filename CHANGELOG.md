# Cambios

## 1.0.0
- Proyecto reordenado: HTML + CSS + módulos JS nativos (sin cambios visibles para el usuario).
- Datos guardados con número de versión del formato (3). Si los datos son de una versión más nueva que la app, la app se bloquea y no escribe nada.
- Si los datos guardados no se pueden leer, se guarda una copia (`turnos-v1-ilegible`) antes de empezar de cero.
- La versión de la app se muestra en Ajustes.
- Pruebas automáticas (unitarias y de pantalla).
