# Diseño y decisiones — Shiftia · {{nombre}}

Este documento recoge lo que se decidió al dar de alta a {{nombre}} en Shiftia (el
manifiesto `cliente.json`, {{fecha}}), lo que se asumió a falta de dato, y las preguntas que
siguen abiertas para el cliente. Es el documento vivo del proyecto: cada reunión con el
cliente añade aquí lo acordado antes de tocar código.

## Decisiones tomadas

| # | Pregunta | Decisión |
|---|---|---|
| B1 | Menú | {{pestanas}}. Hoy, Semana, Mes, Equipo y Cobertura son el núcleo; el resto se apaga o enciende en `cliente.json` (`modulos`). |
| B2 | Repositorio | `shiftia-{{slug}}`, generado con el motor de creación de Shiftia v{{motor.version}} sobre el arquetipo «{{motor.arquetipoNombre}}» (origen y commit en `motor.lock.json`). |
| B3 | Servidor y cuentas | Con servidor desde el primer despliegue: programador «{{cuentas.programador}}», encargado «{{cuentas.encargado}}» y jefe «{{cuentas.jefe}}» (permisos de encargado, sin Actividad). Empleados con proyección del estado (solo ven lo suyo). |
| B4 | Unidades | {{nUnidades}} {{unidadesPlural}}: {{#cada unidades}}**{{nombre}}** (`{{id}}`){{#no @ultimo}}, {{/no}}{{/cada}}. Cada una con sus aperturas, mínimos por franja y día, cocina, horarios y quién abre, editables en Equipo → Ajustes. |
| B5 | Franjas | {{#cada franjas}}{{.}}{{#no @ultimo}} y {{/no}}{{/cada}} (mañana y tarde): la noche entra dentro de la tarde. Cada casilla es una lista ordenada: el primero abre; la cocina va en su posición. |
| B6 | Puestos | {{puestosTexto}}. «Apoyo» es quien no tiene local fijo y puede ir donde falte. |
| B7 | Equipo | {{nEquipo}} personas precargadas desde el manifiesto como datos editables (Equipo → ficha). Lo que el cliente no ha confirmado se marca «supuesto». |
| B8 | Semana tipo | {{#si semanaTipo}}Precargada desde el manifiesto; el generador parte de ella y el encargado puede fijar otra desde Semana.{{/si}}{{#no semanaTipo}}Sin semana tipo de partida: el generador rellena los mínimos con candidatos y el encargado fija una semana como tipo cuando la tenga.{{/no}} |
| B9 | Eventos con refuerzo | {{#si eventos.equipos}}Botones de refuerzo para: {{#cada eventos.equipos}}{{nombre}}{{#no @ultimo}}, {{/no}}{{/cada}}.{{/si}}{{#no eventos.equipos}}Sin botones de refuerzo predefinidos: «＋ Evento» en Mes permite crearlos, y desde «Más» → Botones de fútbol se añaden equipos.{{/no}} |
| B10 | Logo | Shiftia en la barra superior{{#si marca.logo}} con el logo del cliente al lado (`{{marca.logoFichero}}`){{/si}}{{#no marca.logo}}; el nombre del cliente en texto hasta que llegue su logo (`assets/{{slug}}-logo.png`){{/no}}, y «coded by Highkey Labs» en el pie. |
| B11 | Reglas | Las diez reglas del arquetipo con interruptor en Equipo.{{#si reglasApagadas}} Apagadas de serie: {{reglasApagadasTexto}}.{{/si}} |
| B12 | Despliegue | {{despliegue.plataforma}}{{#si dominio}}, dominio `{{dominio}}`{{/si}}; núcleo Shiftia (CP-SAT) {{#si despliegue.nucleo}}configurado desde el primer despliegue{{/si}}{{#no despliegue.nucleo}}pendiente (el generador local funciona sin él){{/no}}. |

{{#si particularidades}}## Particularidades del cliente

Lo que el cliente ha pedido y que va más allá de lo que el arquetipo trae de serie. Cada una
se implementa como un test en rojo en `modelo.test.js` antes de tocar `modelo.js`, y se marca
aquí cuando está hecha.

| # | Petición | Estado |
|---|---|---|
{{#cada particularidades}}| {{n}} | {{texto}} | pendiente |
{{/cada}}
{{/si}}## Supuestos

Lo que la app da por hecho mientras el cliente no diga otra cosa. Todo lo de esta lista se
enseña en la app con la marca «supuesto» o se puede cambiar desde Equipo → Ajustes.

{{#cada supuestos}}- {{.}}
{{/cada}}{{#no supuestos}}- Ninguno: el manifiesto trae mínimos, horarios y duración de todas las unidades y una semana tipo.
{{/no}}- Horarios de partido (dos tramos que suman ocho horas: 5 + 3 entre semana, 4 + 4 el fin de semana) hasta que el cliente los confirme.
- Ocho horas por turno para la nómina, salvo que cada unidad diga otra cosa (Equipo → Ajustes → duración).

{{#si preguntas}}## Preguntas abiertas para el cliente

| # | Pregunta | Respuesta |
|---|---|---|
{{#cada preguntas}}| {{n}} | {{texto}} | — |
{{/cada}}
{{/si}}## Cómo se aplican las reglas

- **Interruptores**: cada regla y cada característica de una ficha se puede apagar desde
  Equipo; lo apagado no lo comprueba nadie (ni el generador, ni la revisión, ni el selector).
- **Duras** (nunca las rompe el generador; a mano solo con «forzar» y motivo, salvo cierres,
  ausencias y estar dos veces en la misma casilla, que no se pueden forzar): cierres de cada
  unidad por día, ausencias, franja que no trabaja, vetos, días que libra, «nunca con»,
  cocina obligatoria.
- **Blandas** (avisan): no es su local habitual, partido no declarado, día que evita, más
  turnos que su contrato, cocina de reserva en vez de titular.
- **Mínimos**: los del manifiesto; los que no se han fijado se marcan **supuesto** y se ven
  así en toda la app. Un evento con refuerzo sube el mínimo de esas casillas ese día.
- **Posición de la cocina** por unidad y franja; **quien abre** va el primero y se marca «ABRE».
- **Partido** = la misma persona mañana y tarde el mismo día; **dobla** = en dos unidades distintas.
- **Ausencias**: al marcar una, sus turnos de esos días salen de la planilla y quedan como
  huecos; el generador los propone («cubre a» primero, luego cualquier candidato con reglas,
  y si nadie, hueco explicado).
- **Cobertura**: antes de que la ausencia exista, el encargado pide plan A y plan B. Solo se
  cubre lo que hace falta; el orden de preferencia es «cubre a», apoyos, quien libra ese
  día antes que quien haría partido, el local habitual, la cocina si la persona la llevaba,
  quien puede abrir si abría, y menos turnos esa semana. Vaciar la semana o el mes nunca
  borra ausencias.
- **Horas**: cada turno cuenta lo que dura un turno (por unidad y franja), no lo que abre el
  local; el partido reparte esas horas entre sus dos tramos y el continuo se cuenta una vez;
  nocturnas informativas (22:00–06:00); domingos y festivos aparte; saldo frente a contrato;
  **Cerrar mes** guarda instantánea.

## Historial de decisiones

- **{{fecha}}** — Nace la app desde el manifiesto (motor v{{motor.version}}).
