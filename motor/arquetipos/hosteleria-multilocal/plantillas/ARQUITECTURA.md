# Arquitectura

Misma pila que el resto de burbujas de Shiftia: la app se **escribe compartimentada en
`src/`** y se **ensambla** en un único `index.html` con un build sin dependencias. Ese
fichero es lo que sirve el servidor y lo que funciona sin conexión como PWA.

```
src/
  index.template.html      shell HTML (barra superior con los dos logos, pestañas, vistas,
                           barra inferior móvil) con marcadores <!--INJECT:STYLES--> /
                           <!--INJECT:SCRIPT--> / <!--INJECT:GLOGO-->
  login.template.html      pantalla de acceso → login.html (se sirve sin sesión)
  styles/*.css             estilos por área; se concatenan por orden de nombre
  app/*.js                 la app, un fichero por sección; el orden lo fija app/_orden.json.
                           Comparten scope (un solo <script>): sin import/export.
  app/01-config-cliente.js CONFIG_CLIENTE: módulos activos de esta burbuja (del manifiesto)
modelo.js                  modelo de dominio (fuente única). Se embebe sin su module.exports;
                           los tests y el servidor lo usan tal cual. SEMILLA_CLIENTE es el
                           estado de fábrica (del manifiesto).
modelo.test.js             tests del modelo (node modelo.test.js)
server.js                  backend Node + SQLite, sin dependencias
estado-servidor.js         proyección del estado por rol (el empleado recibe lo suyo)
push*.js                   notificaciones push sin dependencias
tools/build.mjs            ensambla src/ → index.html + login.html (embebe el logo)
tools/check-parity.mjs     el modelo embebido === modelo.js
tools/comprobar-despliegue.mjs  verifica un despliegue desde fuera (salud, volumen, acceso, versión)
tests/                     tests del servidor, de seguridad y de la interfaz (node:test);
                           tests/e2e-util.mjs para escribir baterías e2e (Playwright)
assets/                    logos (shiftia-logo.svg; el del cliente, {{slug}}-logo.*)
cliente.json               el manifiesto del que nació esta burbuja (motor de creación)
motor.lock.json            versión del motor, arquetipo y commit de origen
```

## Módulos de la app (`src/app`, en orden)

| Fichero | Qué hace |
|---|---|
| `00-pre.js` | `'use strict'`; delante va el modelo embebido. |
| `01-core-utils.js` | `$`, `moduloActivo`, formatos de fecha, `esc`, toasts, tooltip, overlays y popovers, color por persona y por local. |
| `01-config-cliente.js` | `CONFIG_CLIENTE` (módulos activos), generado desde `cliente.json`. |
| `02-estado-y-modelo-datos.js` | Estado `S`, carga y guardado (localStorage o servidor), sincronía entre pestañas, historial, deshacer, migraciones, `renderVistaActiva`. |
| `10-vista-hoy.js` · `11-selector.js` | Vista Hoy y selector de persona (puede / con aviso / no puede + forzar). |
| `13-vista-semana.js` · `14-impresiones.js` · `15-export-*.js` · `16-compartir.js` | Semana, hojas imprimibles, Excel, PDF y compartir como imagen. |
| `17-vista-mes.js` · `18-eventos.js` · `23-revision.js` | Mes, eventos con refuerzo, revisión del mes. |
| `19-vista-equipo.js` · `20-ficha-persona.js` | Equipo: personas, altas y bajas, ficha, reglas con interruptor, ajustes de las unidades. |
| `21-vista-horas.js` | Contador de horas (módulo `horas`). |
| `22-generador.js` | Generador (módulo `generador`): periodo, motor local o núcleo, vista previa, aplicar. |
| `26-cobertura.js` | Gestor de cobertura: plan A y plan B, confirmar con deshacer. |
| `27-actividad.js` | Actividad (módulo `actividad`, solo el programador). |
| `23-entrevistas-datos.js` · `24-entrevistas.js` | Entrevistas (módulo `entrevistas`; semilla vacía). |
| `25-cuenta.js` · `29-avisos-e-historial.js` | Cuenta, usuarios, copia de seguridad, versiones; historial. |
| `30-modo-servidor.js` · `31-navegacion.js` · `32-arranque.js` · `33-actualizacion.js` | Servidor (sesión, SSE, conflictos), pestañas y «Más» (respetan `CONFIG_CLIENTE.modulos`), arranque, aviso de versión nueva. |

## Modelo de datos (resumen)

- **Local** (unidad): `{id, nombre, corto, color, abre:{M:[dows],T:[dows]}, minimos:{M:{dow:n},T:{…}}, supuestos, cocina:{obligatoria, titulares, reservas, posicion}, primero:{M,T}, partidoAbre, horario, horarioPartido, duracion:{M,T}, descansoMin}`.
- **Persona**: `{id, nombre, puesto, locales, franjas, libra, partido:{dias}, cocina, abre, noAbre, nuncaCon, cubreA, vetos, contrato:{horasSemana}, ausencias:[{tipo,desde,hasta?}], prefs, nota, supuestos, inactivas}`.
- **Casilla**: `est.asig[iso][turnoId] = [{pid, cocina, abre, origen, razon, forzado?, ini?, fin?}]`, con `turnoId = localId_franja`. Lista ordenada: la posición 1 abre.
- **Semana tipo**: `S.patron[dow] = [{t: turnoId, p: pid, c?, a?, s?, por?, n?}]`.
- **Eventos**: `S.eventos = [{iso, nombre, equipo?, franja, refuerzo:{localId:n}}]` suben el mínimo de esas casillas.

## Reglas (en `modelo.js`)

`puedeEstar` devuelve `{ok, motivo, avisos}` con reglas **duras** (cierre, ausencia, ya en la
casilla, franja que no trabaja, veto, día que libra, «nunca con», cocina obligatoria) y
**blandas** (no es su local, partido no declarado…) que se pueden forzar con motivo.
`REGLAS` y `CARACTERISTICAS` son los interruptores (`cfg.reglas[k] === false`,
`p.inactivas`). `generarSemana` / `generarPlanilla` rellenan con razones y huecos explicados;
`planesCobertura` / `aplicarCobertura` son el gestor de cobertura; `horasPersonaMes` cuenta
la nómina; `toProblem` / `desdeSolucion` hablan con el núcleo Shiftia (CP-SAT).

## Flujo de trabajo

1. Edita el fichero de `src/` (o `modelo.js`) que corresponda.
2. `npm run build` → regenera `index.html` y `login.html`.
3. `npm test` → tests del modelo, del servidor y paridad.

> **No edites `index.html` a mano**: lo genera el build y CI lo verifica
> (`npm run build:check` falla si está desincronizado con `src/`).

## De dónde viene y cómo se actualiza

Este repositorio lo generó el motor de creación de Shiftia (`motor/` en el repositorio del
arquetipo) a partir de `cliente.json`. El motor **no se vuelve a ejecutar** sobre una burbuja
en marcha: a partir del primer commit, este repositorio evoluciona solo, y las mejoras del
arquetipo se portan a mano (módulo a módulo, gracias a la compartimentación de `src/`).
`motor.lock.json` dice de qué commit del arquetipo nació, que es el punto de partida para
comparar.
