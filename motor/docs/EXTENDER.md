# Cómo funciona por dentro y cómo se extiende

## El pipeline (`lib/generar.mjs`)

```
cliente.json ──▶ manifiesto.mjs (valida, deriva el contexto)
                       │
arquetipo.json ──▶ arquetipo.mjs (qué ficheros entran: incluir − excluir + conservar; renombrar)
                       │
      por cada fichero de texto:  bloques (@semilla, @puestos)  →  sustituciones en orden
      por cada binario:           copia
                       │
plantillas/ ──▶ plantilla.mjs ({{…}} con el contexto + la semilla) → se escriben encima
                       │
logo, cliente.json, motor.lock.json
                       │
verificar.mjs: node --check · build · modelo.test.js · check-parity · tests/*.test.mjs · restos
```

El contexto que ven las plantillas y las sustituciones es lo que devuelve `contextoDe()` en
`lib/manifiesto.mjs` (identidad, cuentas, unidades, equipo, módulos, textos derivados…) más
`motor` (versión, arquetipo, commit de origen), `configCliente` y, en las plantillas,
`semilla`. Si una plantilla necesita un dato nuevo, se añade ahí y se cubre en
`test/motor.test.mjs`.

## Añadir o cambiar una sustitución

En `arquetipos/<id>/arquetipo.json`, lista `sustituciones`, **en orden** (las cadenas largas
antes que las cortas que contienen): `{ "de": "…", "a": "… {{campo}} …" }`, o con `"regex":
true` (`de` es una expresión regular con banderas `gu` por defecto; `a` admite `$1`). Con
`"soloEn": "src/app/_orden.json"` se limita a un fichero (glob). Después, añade a
`prohibidos` la palabra que ya no puede aparecer, para que el test del motor la vigile.

El bucle de trabajo: genera el ejemplo (`node motor/bin/crear-cliente.mjs
motor/clientes/ejemplo-cafeterias.json --destino /tmp/x --sin-tests`), mira la lista de
restos que imprime, y añade sustituciones hasta que quede a cero.

## Añadir un módulo apagable

1. En la app, la pestaña (en `src/index.template.html`), su vista (`src/app/NN-*.js`, en
   `_orden.json`) y su fila en «Más» (`31-navegacion.js`, `openMas`), igual que `horas`.
2. Todo lo que lleve a la vista pasa por `moduloActivo('clave')` (pestaña, fila de «Más»,
   botones desde otras vistas).
3. En `arquetipo.json`, `modulos.clave` con `titulo`, `descripcion`, `ficheros` y `defecto`.
4. Un test en `test/motor.test.mjs` que genere con el módulo apagado y compruebe que la app
   no lo enseña (como el de `entrevistas`).

## Añadir un arquetipo

Un arquetipo es una app existente más su tabla. Para el segundo (por ejemplo, el piloto de
Urología: catálogo de huecos por día, guardias con salientes, roles admin/empleado):

1. `arquetipos/<id>/arquetipo.json` con `origen.ruta` apuntando a la app (puede ser un
   repositorio hermano: `"ruta": "../../../../shiftia-urologia-pilot"`), `capacidades`,
   `modulos`, `reglas`, `incluir`/`excluir`, y la tabla de sustituciones y prohibidos de
   ESE cliente (nombres del hospital, del servicio, claves `shiftia_uro_`, contraseña
   genérica, personas del Word…).
2. `plantillas/`: README, DISEÑO, DEPLOY, CHANGELOG, package.json, manifest, CI, tests
   genéricos y la configuración de módulos, con el vocabulario de ese dominio.
3. La semilla: en ese modelo la semilla es el `CATALOGO` de huecos y el equipo; hace falta
   un `bloques` que la sustituya y una función en `lib/semilla.mjs` que construya esa forma
   desde el manifiesto (`unidades` serían los huecos con capacidad y días; `franjas`, los
   bloques ordinaria/tarde/complementaria). El validador (`manifiesto.mjs`) recibe el
   arquetipo y puede aceptar campos distintos por `capacidades`.
4. Un manifiesto de ejemplo y su test de generación completa.

La parametrización de la app de origen (módulos apagables, nombres en un solo sitio) se
hace en su repositorio con cambios mínimos y aditivos, como se hizo aquí con
`moduloActivo` en `01-core-utils.js` y `31-navegacion.js`.

## Meter en el motor una app que ya existe

`node motor/bin/extraer-manifiesto.mjs --desde ../shiftia-otro --slug otro --nombre "Otro"`
saca de su semilla (`modelo.js`) un manifiesto con unidades, equipo, semana tipo, equipos
de eventos, festivos y reglas. Así se hizo `clientes/pasarela.json`, y el test del motor
comprueba que la ida y vuelta es exacta. Sirve para tener el acta de un cliente antiguo en
el formato nuevo, o para clonar un cliente parecido a otro (copiar su manifiesto y cambiar
lo que difiera).

## Mantener el arquetipo y el motor en sintonía

`npm run test:motor` corre en el CI de este repositorio en cada push: genera el cliente de
ejemplo de verdad, lo ensambla, pasa sus tests y busca restos. Si un cambio en la app rompe
al motor (una cadena nueva con el nombre del cliente, un fichero con datos reales, una
firma que los tests genéricos usan), el CI lo dice en el momento, y la corrección suele ser
una línea en `arquetipo.json` o en una plantilla.

`arquetipo.json → origen.commitProbado` (opcional) guarda un commit con el que se probó a
mano; si está y el origen es otro, el generador avisa (no falla). El commit real de cada
generación queda en el `motor.lock.json` de la burbuja.

## Límites y decisiones

- **El motor crea, no actualiza.** Regenerar una burbuja en producción pisaría lo que el
  cliente ha editado. Las mejoras del arquetipo se portan a mano, módulo a módulo.
- **Un arquetipo, dos franjas.** Los turnos M/T/N o los catálogos de puestos son otro
  arquetipo, no una opción del manifiesto.
- **Los tests de las reglas del cliente de origen no se heredan** (`modelo.test.js`,
  `server.test.mjs`, `seguridad.test.mjs`, e2e): hablan de Pasarela. En su lugar van los
  genéricos de `plantillas/`, que prueban el motor de planificación sobre un escenario
  sintético y el servidor entero; los del cliente nuevo se escriben en la burbuja.
- **Los comentarios se anonimizan mecánicamente.** Preferimos un «[persona]» a perder el
  porqué de una regla; y preferimos eso a reescribir 2.000 líneas de comentarios a mano.
- **Sin dependencias.** Como el resto de Shiftia: Node ≥ 22, nada de npm.
