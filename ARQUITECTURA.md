# Arquitectura

Misma pila que el piloto de Shiftia: la app se **escribe compartimentada en
`src/`** y se **ensambla** en un único `index.html` con un build sin
dependencias. Ese fichero es lo que sirve el servidor y lo que funciona sin
conexión como PWA.

```
src/
  index.template.html      shell HTML (barra superior con los dos logos, pestañas,
                           siete vistas, barra inferior móvil) con marcadores
                           <!--INJECT:STYLES--> / <!--INJECT:SCRIPT--> / <!--INJECT:GLOGO-->
  login.template.html      pantalla de acceso → login.html (se sirve sin sesión)
  styles/*.css             estilos por área; 01–20 vienen del piloto (tokens, topbar,
                           nav, día, mes, equipo, overlays, semana, impresión, móvil…),
                           21–24 son de Pasarela (app, equipo, impresión, horas).
                           Se concatenan por orden de nombre.
  app/*.js                 la app, un fichero por sección; el orden lo fija
                           app/_orden.json. Comparten scope (un solo <script>): sin
                           import/export.
modelo.js                  modelo de dominio (fuente única). Se embebe sin su
                           module.exports; los tests y el servidor lo usan tal cual.
modelo.test.js             tests del modelo (node modelo.test.js)
server.js                  backend Node + SQLite, sin dependencias
estado-servidor.js         proyección del estado por rol (el empleado recibe lo suyo)
push*.js                   notificaciones push sin dependencias (del piloto; fase 3)
tools/build.mjs            ensambla src/ → index.html + login.html (embebe el logo)
tools/check-parity.mjs     el modelo embebido === modelo.js
tests/                     tests del servidor y de seguridad (node:test) y baterías
                           e2e-*.mjs (Playwright; se saltan sin Chromium); e2e-nucleo-real.mjs,
                           contra el núcleo de verdad (solo con SHIFTIA_CORE_REAL); nucleo-esquema.cjs,
                           el esquema del servicio del núcleo para las pruebas
tools/comprobar-despliegue.mjs  verifica un despliegue desde fuera (salud, volumen, acceso, versión)
assets/                    logos (shiftia-logo.svg; pasarela-logo.png si existe)
```

## Módulos de la app (`src/app`, en orden)

| Fichero | Qué hace |
|---|---|
| `00-pre.js` | `'use strict'`; delante va el modelo embebido. |
| `01-core-utils.js` | `$`, formatos de fecha, `esc`, toasts, tooltip, overlays y popovers, color por persona y por local. |
| `02-estado-y-modelo-datos.js` | Estado `S` (locales, staff, patrón, meses, eventos, extras, cierres, equipos), carga y guardado (localStorage o servidor), sincronía entre pestañas, historial, deshacer, `asignarUI` / `desasignarUI`, `vaciarRangoUI`, visible para el equipo (`alternarPublicado`), `renderVistaActiva`. |
| `10-vista-hoy.js` | Vista Hoy: tarjetas por local con las casillas ordenadas. |
| `11-selector.js` | Selector de persona (puede / con aviso / no puede + forzar) y menú de una persona en una casilla. |
| `13-vista-semana.js` | Cuadrante semanal (8 filas × 7 días) con pie de descansos; «guardar como semana tipo». |
| `14-impresiones.js` | Hojas imprimibles: semana general, por local, mes por persona, informe de horas. |
| `15-export-xlsx.js` · `15-export-pdf.js` | Excel de la semana y de las horas; PDF. |
| `16-compartir.js` | Compartir la semana (general o por local) como imagen PNG: hoja de compartir del móvil o descarga. |
| `17-vista-mes.js` | Mes personas × días, KPIs, leyenda, fila de control, ausencias, botones de fútbol. |
| `18-eventos.js` | Evento con refuerzo (partidos y otros): refuerzo por local, equipos editables, detalle del evento de un día (quitar el aviso). |
| `19-vista-equipo.js` · `20-ficha-persona.js` | Equipo: personas, altas y bajas, ficha con todas las condiciones editables, ajustes de los locales. |
| `21-vista-horas.js` | Contador de horas: tabla del mes, horas extra, cierre y reapertura del mes. |
| `22-generador.js` | Generador: periodo, opciones, motor local o núcleo (todo el camino del núcleo lo hace el modelo, `flujoNucleo`; la pantalla solo manda cada petición al servidor), vista previa, aplicar, vaciar lo generado. |
| `23-revision.js` | Revisión del mes y punto rojo de avisos. |
| `26-cobertura.js` | Gestor de cobertura: la hoja «quién sale → quién entra» (persona, qué le pasa, tira de días con sus turnos, plan A y plan B por día, confirmar con deshacer); en la pestaña Cobertura y como capa desde Hoy, Semana y Mes. |
| `27-actividad.js` | Actividad (visor del programador): qué hace el encargado con la app. Fusiona el historial de la planilla con la auditoría del servidor (`GET /api/auditoria`) traducida al español; tarjetas resumen, filtros por usuario y tipo, buscador. Solo con `body.rol-programador` (sin servidor también, para probar). |
| `24-entrevistas.js` | Sección Entrevistas (en construcción): vista previa de la base de datos que llegará de Notion. |
| `25-cuenta.js` | Contraseña, usuarios (servidor), copia de seguridad y versiones. |
| `29-avisos-e-historial.js` | Historial de cambios. |
| `30-modo-servidor.js` | Detección del servidor, sesión, envío del estado con versionado, SSE, conflictos. |
| `31-navegacion.js` | Pestañas, día a día, «Más» del móvil, teclado, foco de diálogos, «atrás», tema, PWA, modo empleado. |
| `32-arranque.js` | Inicio: carga, migración, navegación recordada, `?demo=1`. |
| `33-actualizacion.js` | Aviso de versión nueva y reinicio limpio. |

## Modelo de datos (resumen)

- **Local**: `{id, nombre, corto, color, abre:{M:[dows],T:[dows]}, minimos:{M:{dow:n},T:{…}}, supuestos, cocina:{obligatoria, titulares, reservas, posicion}, primero:{M,T}, partidoAbre:{M,T}, horario:{M,T,porDow}, horarioSupuesto, cierreAprox, horarioPartido:{M,T,porDow}, horarioPartidoSupuesto, duracion:{M,T}, duracionSupuesta, descansoMin}`. `horarioDe(l, dow, franja, partido, abre)` devuelve el tramo del partido cuando toca (`tramoPartidoDe`: las ocho horas repartidas 5+3 entre semana y 4+4 el finde, y quien abre entra a la hora de apertura con el tramo largo); `minutosTurno(l, dow, franja, override, partido, abre)` cuenta por este orden: horario de la casilla, tramo del partido, `duracion` fija (8 h de fábrica) y, si no hay nada, lo que abre el local menos `descansoMin`; `turnoDelDia(cfg, est, iso, pid)` dice si ese día es partido, continuo y qué franja abre, y es lo que usan las vistas y `horasPersonaMes` (vía `repartoDelDia`); `migrarHorarios` pasa las planillas guardadas a los horarios confirmados el 15/09 sin pisar lo editado a mano.
- **Persona**: `{id, nombre, puesto, locales, franjas, libra, partido:{dias}, cocina:{titular, reserva, soloDias}, abre:{localId:[franjas]}, noAbre, nuncaCon, nuncaConFlex, nuncaConOff, localHabitual, cubreA, vetos, contrato:{horasSemana}, ausencias:[{tipo,desde,hasta?}], prefs, nota, supuestos, color}`. Desde el 24/09 (fase 6): «nunca con» es una pareja y está en las dos fichas (`nuncaCon`), con «flexible» (`nuncaConFlex`) y el interruptor (`nuncaConOff`, las parejas apagadas) también por pareja; `localHabitual` es el local habitual elegido (si no, el primero de `locales`); «sin local fijo» es no tener `locales` (ya no hay `comodin`); y «Contrato» no es un interruptor (`inactivas` no lo lleva).
- **Casilla**: `est.asig[iso][turnoId] = [{pid, cocina, abre, origen, razon, supuesto, forzado?, avisos?, ini?, fin?, abrePatron?, cocinaAuto?}]`, con `turnoId = localId_franja`. Es una lista ordenada: la posición 1 abre. `est.manual[iso][turnoId]` recuerda lo que se tocó a mano. `abrePatron` (24/09, fase 5): la marca «a» de la semana tipo, una preferencia para `primeroDe`, no un «abre» a mano. `cocinaAuto` (revisión de la fase 5): la cocina que puso lo automático (semana tipo, Generador, Cobertura), una preferencia para `normalizarCasilla`. `cocina` y `abre` son lo que calcula `normalizarCasilla` (lo leen el Mes, el perfil, el Excel y las horas): al guardar, si cambian los locales, las fichas o las reglas, la app los recalcula de hoy en adelante (`refrescarMarcas`, desde `saveState`); las planillas de antes, donde lo automático quedaba «a mano», las migra una vez `migrarMarcasAutomaticas` (`estado.migraciones.marcasAuto2409`).
- **Semana tipo**: `S.patron[dow] = [{t: turnoId, p: pid, c?: cocina, a?: abre, s?: supuesto}]`. Desde la fase 5 la «a» solo se guarda si se puso a mano («Sale primero») o si, como preferencia, sigue decidiendo quién abre; las guardadas que solo repetían quién abría las quita una vez `migrarAbrePatron`.
- **Cocina**: la ficha (`p.cocina.titular/reserva`) y Ajustes del local (`l.cocina.titulares[franja]`, `l.cocina.reservas`) se escriben juntas (`ponerCocinaLocal`, `ponerCocinaFicha`); `puedeCocina` las lee las dos y `rangoCocina` saca el orden de la del local. `migrarCocinaLocales` las pone de acuerdo una vez.
- **Eventos**: `S.eventos = [{iso, nombre, equipo?, franja, refuerzo:{localId:n}, hora?}]`: suben el mínimo de esas casillas.
- **Horas**: se derivan de la planilla + `S.extras` (persona, fecha, minutos, motivo) + horario distinto por casilla; `S.cierres['YYYY-MM']` guarda la instantánea del cierre.

## Reglas (en `modelo.js`)

Desde el 24/09 (fase 4) hay **una sola puerta** y **una sola puntuación**: `evaluarPlaza(ctx, iso, tid, pid, opts)` evalúa todas las reglas de una plaza y devuelve todos sus bloqueos (con si se pueden forzar o relajar) y sus avisos; `puntuar` y `candidatos(ctx, iso, tid, { modo: 'relleno' | 'cobertura' })` ordenan con los pesos de `PESOS`. `puedeEstar`, `candidatosPara` y `candidatosCobertura` son sus envoltorios; el selector (`gruposSelector`), lo que se incumple al forzar (`siSeFuerza`, el selector y el Mes) y la hoja impresa (`destrapa`) salen de ahí. Lo que se relaja tiene dos piezas (revisión de la fase 6): `buscarRelajando`, la escalera de quien busca a alguien (el relleno del Generador y la Cobertura: la pareja «nunca con» flexible solo en el modo relajado y si no hay nadie más), y `RELAJABLE`, lo que se relaja al poner lo que ya se decidió con aviso (aplicar la Cobertura, volcar la vista previa, la propuesta «con aviso», el selector, el Mes y lo que vuelve al quitar un cierre). Si una plaza ocupa a quien está en ella ese día lo dice un solo helper, `plazaOcupa` (no, si la casilla está cerrada ese día por fechas o a mano), para la puerta y para Horas. La carga («N turnos esa semana · M este mes», −4 y −3 por turno) cuenta la semana entera y el mes entero: quien pasa el estado de un mes o de una semana pasa también `meses` (`S.meses`) para los días que caen fuera (el selector, la ★ de Hoy, el Generador semanal y el Periodo, y la Cobertura; también la ausencia apuntada en Equipo y el cambio de día libre de la ficha). La cocina y quién abre, con sus interruptores, se leen en un sitio cada una (fase 5): `puedeCocina` y `cocinaExigida` (la regla del grupo «Cocina» apagada no exige ni marca cocina en ningún camino, D5), y `abreFijo` y `primeroDe` (lo puesto a mano, «Quién abre» del local, «Sale el primero» de la ficha y la marca «a» de la semana tipo como preferencia; el 1.º puesto a mano que no puede abrir sale en la Revisión como `abre-no-apto`); con la regla «Cocina» apagada, buscar la cocina es buscar sala (`seBuscaCocina`, en `candidatos`, `designadaPara` y `cubreEnCasilla`). Lo automático deja preferencias (`abrePatron`, `cocinaAuto`), no marcas a mano, y la planilla guardada se recalcula de hoy en adelante al cambiar la configuración (`refrescarMarcas`, revisión de la fase 5; `tests/e2e-marcas.mjs`). Cada campo de la ficha y del local está en el registro `VARIABLES` (o en `SOLO_TEXTO`), de donde salen `condicionesDe` y `verificarSemana`; `tests/contrato-variables.test.mjs` comprueba que todos los caminos leen todas las variables (ver DISEÑO.md, «Una sola puerta de reglas»).

`puedeEstar` devuelve `{ok, motivo, avisos}`: **duras** (cierre del local ese día, ausencia, ya está en esa casilla, no trabaja esa franja, veto local+franja, libra ese día, «nunca con» alguien ya en la casilla, mínimo de cocina obligatoria…) y **blandas** (no es su local, partido no declarado, día que evita…) que se pueden **forzar** desde la interfaz con motivo, y quedan marcadas. `revisarTurno` / `revisionMes` resumen faltas, sin cocina, sin nadie que abra, incompatibles y forzados.

`puedePrimero` / `primeroDe` / `posicionesDe` deciden quién ocupa la 1.ª posición (abre y turno completo) y pintan la casilla con sus marcas; si nadie puede abrir, la 1.ª es un hueco. `condicionesDe` deriva el catálogo de condiciones de locales y fichas (respetando `cfg.reglas` y `p.inactivas`), `verificarSemana` lo comprueba sobre una semana y `generarSemana` devuelve la planilla semanal completa (locales × franjas × días con posiciones, huecos, cambios, quién libra, condiciones).

`turnosAfectados` / `candidatosCobertura` / `planesCobertura` / `aplicarCobertura` son el gestor de cobertura: para una incidencia (`{pid, tipo, desde, hasta, franjas?, sinFin?}`) calculan los turnos de la persona, cómo queda cada casilla sin ella (faltan, sin cocina, nadie que abra), y dos planes (estricto, alternativo con otras personas, y relajado con partidos no declarados avisados; se quedan los dos mejores como A y B) con sus asignaciones razonadas, huecos con «por qué nadie» e intercambio en un cambio de turno. `vaciarPlanilla` quita las plazas y marcas de un rango sin tocar las ausencias.

`generarPlanilla` es aditivo y determinista: primero lo fijo (`instanciarFijo`: la semana tipo, saltando ausentes y con «cubre a» como primera alternativa, y quien apoya por un cierre en su destino) y luego rellena los mínimos con `candidatosPara` (puntuación con razones). Devuelve aplicados, huecos con `porQueNadie` (`huecoFaltan`, `huecoCocina`, `huecoPrimero`), coberturas y rechazados.

`toProblem` / `desdeSolucion` traducen al formato del núcleo Shiftia (CP-SAT) y de vuelta, y desde el 25/09 (fase 7) leen la ficha por la misma puerta que el resto: quién puede estar en cada local cada medio día es lo que dice `evaluarPlaza` con la planilla vacía (de sala o de cocina); lo fijo del problema es lo ya puesto en la planilla del periodo (de cada mes, con `opts.meses`) más `instanciarFijo`; «nunca con» sale de `incompatibles` (la pareja flexible, blanda solo en el modo relajado del Generador, `opts.permitirPartido`), el partido de `partidoEn`, la cocina de `puedeCocina` por local y día (`skillCocina`), los mínimos con su regla y las preferencias con `evita`. `desdeSolucion` vuelca como el generador local: primero `instanciarFijo` y luego lo que propone el núcleo, por la puerta y con el modo del Generador; lo que no entra sale en `rechazados` (con su regla) y, si deja la casilla corta, en `huecos` (`huecosDeCasilla`) con lo que el núcleo proponía. `toProblem` también acepta `(ctx, desde, hasta, opts)` con el contexto de `crearContexto`. Desde la revisión de la fase 7 (probada con el servicio de verdad): `unavailable[i]` es siempre una lista (`["*"]` = ningún local), los mínimos son una regla blanda de tier 3 y las casillas cerradas una dura aparte, la otra mitad del día de quien tiene una mitad fija y ese día no hace partido no está disponible (modo estricto), y «Solo desde hoy» recorta el problema (`desdeEfectivo`). `flujoNucleo` es el camino entero como generador de JavaScript: retira lo que ya no vale, monta el problema y cede cada petición (`{ problem, config: CONFIG_NUCLEO }`) a quien habla con el servicio (la pantalla o `tests/e2e-nucleo-real.mjs`); si la puerta rechaza algo de la solución (`rechazosDelNucleo`, sobre copias), lo veta (`vetarRechazos`) y vuelve a pedir, hasta `VUELTAS_NUCLEO`; y vuelca con `desdeSolucion`. `tests/nucleo-esquema.cjs` repite el esquema del servicio para las pruebas.

## Flujo de trabajo

1. Edita el fichero de `src/` (o `modelo.js`) que corresponda.
2. `npm run build` → regenera `index.html` y `login.html`.
3. `npm test` → tests del modelo, del servidor y paridad.

> **No edites `index.html` a mano**: lo genera el build y CI lo verifica
> (`npm run build:check` falla si está desincronizado con `src/`).

## Servidor

`server.js` sirve una lista blanca de ficheros, guarda la planilla en SQLite con
versionado optimista (`PUT /api/estado` con `baseVersion` → 409 si otro escribió
antes; la app fusiona con `fusionarEstado`), usuarios con scrypt y cookie firmada,
SSE (`/api/eventos`) para repintar todos los dispositivos, copia diaria de la BD,
y el proxy al núcleo (`/api/nucleo/salud`, `/api/nucleo/solve`) con la clave del
servicio guardada solo en el servidor. Roles: **programador** (todo + auditoría),
**admin** (el encargado: planilla, condiciones, usuarios), **empleado** (solo lo
suyo, proyectado por `estado-servidor.js`). Con rol `admin` nacen dos cuentas: `oficina`
(el encargado) y `admin` (el jefe); esta última la crea `asegurarJefe()` en cada arranque
si falta, y `renombrarCuentas()` pone esos nombres una sola vez en los servidores que ya
estaban en marcha. El rol de una cuenta ya creada se cambia desde la app con
`POST /api/usuarios/rol` (sube `gen`, así que quien cambia vuelve a entrar).
