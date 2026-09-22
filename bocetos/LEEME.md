# Bocetos

Prototipos para enseñar al cliente. **No entran en el build**: `tools/build.mjs` solo
lee `src/`, así que nada de lo que hay aquí llega a `index.html`.

## `fichajes-horas.html`

Prototipo interactivo del sistema de fichajes por QR y del calendario de horas, hecho
para la reunión del 22/09/2026 con José. Se abre en el navegador tal cual, sin servidor.

Enseña, con los nombres y los turnos reales de la planilla y horas inventadas:

- El tablero de **Fichajes de hoy** de la oficina, con los cuatro bares y quién está dentro.
- El **móvil del trabajador**: su turno de hoy, fichar entrada y salida escaneando el QR,
  y su contador de horas. Lo que se pulsa en el móvil cambia el tablero al momento.
- El **cartel con el QR** de cada bar.
- El **calendario de horas** del mes, con los dos libros: el **registro oficial** (lo
  fichado, que no toca nadie) y el **contador** (lo fichado más lo que añade el encargado,
  que es lo que va a la nómina).
- El **informe oficial**, que lleva solo los fichajes reales.

Al final de la página quedan escritas las decisiones que salieron de las reuniones y las
tres que faltan por cerrar con José, entre ellas la de consultar a la gestoría si el
registro de jornada puede dejar fuera las horas que añade la empresa.
