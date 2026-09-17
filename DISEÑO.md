# Diseño y decisiones — Shiftia · Grupo Pasarela

Este documento recoge lo que se decidió antes de escribir código (el
cuestionario del 14/09/2026 y las respuestas de Diego), lo que se asumió a
falta de dato, y las preguntas que siguen abiertas para el grupo.

## Decisiones tomadas (respuestas del 14/09)

| # | Pregunta | Decisión |
|---|---|---|
| B1 | Menú | Seis pestañas: **Hoy · Semana · Mes · Equipo · Horas · Generador**. Además hay botones «Generar» en Semana y Mes que abren el generador con ese periodo. |
| B2 | Repositorio | Repositorio nuevo `shiftia-pasarela`, patrón del piloto; los dos repos existentes no se tocan. |
| B3 | Servidor | Con servidor desde el primer despliegue: cuenta de **admin** (el encargado, cliente) y cuenta de **programador** (Diego). Empleados preparados (rol y proyección del estado) para la fase 3. |
| B4 | Alcance | Fase 1 del PDF + contador de horas + botones de fútbol, con ausencias simples (baja, vacaciones, día libre, permiso). |
| B5 | Generador | Generador propio: JavaScript determinista en el navegador, partiendo de la semana tipo editable precargada del PDF; **inteligente y potente**: razones por plaza, huecos explicados, candidatos con aviso, y opción de núcleo CP-SAT vía servidor. |
| B6 | Simulador del PDF | No existe: se construía con shiftia-core y las variables del PDF. La semana tipo y las reglas se han reconstruido del PDF y verificadas con tests. |
| B7 | Logo | Shiftia en la barra superior con el logo del Grupo Pasarela al lado en pequeño (mientras no llegue el original, un SVG hecho a imitación; `assets/pasarela-logo.png` manda cuando se suba) y «coded by Highkey Labs» en el pie. |
| B8 | Horas | Turnos × horario por local y franja (editable, marcado «supuesto» hasta que el grupo lo confirme), ajustes a mano por casilla y horas extra aparte. |
| B9 | Fútbol | Diálogo de refuerzo por local (tarde por defecto, con el último valor recordado por equipo) y «proponer quién viene». |
| B10 | Planilla actual | No la tienen: solo el PDF. Vistas e impresión siguen la estructura del piloto y el cuadrante 8 filas × 7 días. |

## El prototipo del 11/09 (planilla corregida del 14 al 20 de septiembre)

El cliente pasó el resultado que espera del generador semanal: por local, las
posiciones numeradas de cada casilla (el 1.º abre y hace turno completo, ▸ sale
el primero fijo, ◆ cocina en su posición, P partido, C continuo, □ comodín),
la cuenta n/mín* (asterisco = mínimo no fijado por el cliente), «por X» cuando
alguien cubre a otro, **hueco disponible** en la 1.ª posición cuando nadie de la
plantilla puede abrir sin romper una condición, qué ha cambiado, quién libra
cada día y la lista de las 32 condiciones comprobadas. Tres condiciones nuevas:

- **30** Cristian no hace turno de tarde completo: nunca es el primero de la tarde.
- **31** El primero de cada franja hace turno completo: quien ha trabajado la
  mañana no puede ser el primero de la tarde; los partidos entran a partir del
  segundo puesto; si sale primero en mañana y tarde del mismo local es turno
  continuo (C).
- **32** Leo no va nunca de primero, ni de mañana ni de tarde.
- **Excepción acordada el 15/09** (reunión con la encargada): en Pasarela, quien hace
  partido puede abrir la tarde. Es un interruptor por local (Ajustes de los locales →
  «Quién abre»); en El 33 sigue apagado porque José da el martes por insalvable si no
  entra otra persona o vuelve alguna de las bajas.
- **El lunes de Pasarela, aclarado por Aroa el 17/09**: Mari Luz **no hace partido los
  lunes**; hace **la tarde entera, de 16:00 a cierre**, y por eso esa mañana no puede
  trabajar. La mañana se queda con **Lola y Tere** y falta uno; la tarde, con **Mari Luz**
  y falta otro. Los dos los taparía una sola persona haciendo el partido —Aroa apunta a
  **Dulce**, «a lo mejor», cuando se vea cómo entra—. En la app es un **veto por día**
  (Mari Luz, mañanas de Pasarela, solo los lunes), así que ni el generador ni la cobertura
  la colocan ahí, y el hueco se ve en la planilla en vez de taparse solo.

La semana tipo de la app es esa planilla corregida, y un test del modelo la
reproduce casilla a casilla, con el hueco de El 33 del martes por la tarde y los dos
del lunes en Pasarela. Las decisiones del prototipo que el cliente aún no ha confirmado
(Cristian a seis días, quién abre El 33, Zapatillera y el Mónaco por la mañana,
horarios reales) siguen marcadas como supuestos.

## Cómo se aplican las reglas

- **Interruptores**: cada regla del grupo y cada característica de una ficha se puede apagar desde Equipo; lo apagado no lo comprueba nadie (ni el generador, ni la revisión, ni el selector).
- **Duras** (nunca las rompe el generador; a mano solo con «forzar» y motivo, salvo cierres, ausencias y estar dos veces en la misma casilla, que no se pueden forzar): cierres de cada local por día, ausencias, franja que no trabaja, vetos local + franja (y, si lo llevan, solo ciertos días), días que libra, «nunca con», cocina obligatoria en el Mónaco.
- **Blandas** (avisan): no es su local habitual, partido no declarado, día que evita, más turnos que su contrato, cocina de reserva en vez de titular.
- **Mínimos**: los del PDF; los que llevaban asterisco se marcan **supuesto** y se ven así en toda la app. Un evento con refuerzo sube el mínimo de esas casillas ese día.
- **Posición de la cocina** por local y franja (2.ª en El 33 y Mónaco; 3.ª en Zapatillera mañana con tres o más, 2.ª por la tarde; 1.ª el mañana de Pasarela); **quien abre** va el primero y se marca «ABRE».
- **Partido** = la misma persona mañana y tarde el mismo día; **dobla** = en dos locales distintos (Jenny el domingo).
- **Ausencias**: al marcar una, sus turnos de esos días salen de la planilla y quedan como huecos; el generador los propone («cubre a» primero, luego cualquier candidato con reglas, y si nadie, hueco explicado).
- **Cobertura** (pestaña Cobertura): antes de que la ausencia exista, el encargado pide plan A y plan B para cubrirla. Solo se cubre lo que hace falta (si la casilla sigue completa sin la persona, «no hace falta nadie», salvo «reemplazar siempre»); el orden de preferencia es «cubre a», comodines y apoyos, quien libra ese día antes que quien haría partido, el local habitual, la cocina si la persona la llevaba, quien puede abrir si abría, y menos turnos esa semana. El plan relajado solo relaja los partidos no declarados (con aviso); nunca locales, franjas, días que libra, vetos ni «nunca con». Una baja sin fecha de fin se cubre hasta la fecha que se indique. Vaciar la semana o el mes nunca borra ausencias.
- **Horas**: cada turno cuenta lo que dura un turno (8 h de fábrica, por local y franja), no lo que abre el local; el partido reparte esas ocho horas entre sus dos tramos (5 y 3 entre semana, 4 y 4 el finde) y el continuo se cuenta una vez; descanso dentro del turno por local (a cero por defecto); nocturnas informativas (22:00–06:00); domingos y festivos aparte; saldo frente a contrato prorrateado por ausencias; **Cerrar mes** guarda instantánea y avisa antes de editar un mes cerrado.

## Horas: cómo se cuentan (15/09)

Los horarios del grupo los confirmó la encargada por WhatsApp: **mañana 07:00–16:00** (sábado y domingo desde las 08:00) y **tarde 16:00 hasta el cierre**, sobre las 00:00. Pero eso es lo que **abre el local**, no lo que hace cada persona: el cliente refiere **ocho horas por turno, «más o menos»**. Por eso la app separa la **apertura** (quién abre, qué franja cubre el turno, qué se imprime) de la **duración** (lo que se cuenta para nómina). De fábrica un turno cuenta **8 h** en las dos franjas, editable por local y franja en Equipo → Ajustes de los locales y marcado supuesto hasta que lo confirmen.

Manda, por este orden: **horario puesto a mano en la casilla** → **tramo del partido** → **duración del turno** (8 h) → lo que abre el local menos el descanso. Las **nocturnas** (22:00–06:00) se siguen calculando sobre el horario real, no sobre la duración.

El **turno partido no son dos jornadas enteras**: quien lo hace entra a mediodía y vuelve por la noche (Adrián «solo viene como al mediodía»). Son **las mismas ocho horas repartidas entre las dos franjas**, y el reparto lo dio el cliente el 16/09: **entre semana 5 y 3, el fin de semana 4 y 4**, «aunque depende a veces según la necesidad». De fábrica, eso son 11:00–16:00 y 21:00–00:00 de lunes a viernes, y 12:00–16:00 y 20:00–00:00 sábado y domingo.

**Quien abre una franja** entra a la hora de apertura y hace el tramo largo de los dos; el otro tramo se queda con el corto, pegado al final de su franja. Así Mari Luz, que abre la tarde de Pasarela haciendo partido (acuerdo del 15/09), hace 16:00–21:00 y 13:00–16:00: ocho horas, como todo el mundo. Los lunes no: ese día hace la tarde seguida, de 16:00 a cierre, que son las mismas ocho.

Un **turno continuo** —la misma persona abre la mañana y la tarde del mismo local— es **un turno seguido y se cuenta una vez**: la mañana suma 0 y la tarde lleva las horas y las nocturnas del tirón. El contador de horas lo dice por persona («N días de turno continuo»).

Con esto, **un día trabajado son ocho horas para todo el equipo**, haga turno suelto, partido o continuo. En septiembre: 3.904 h entre veinte personas, y cada ficha cuadra exactamente en días × 8.

## Reunión del 17/09 (José y Aroa)

Puestos: **sala, cocina y apoyo**; el «comodín» se retira como puesto. Sala: Noe, Victoria, Jacquelin, Juani, Susana Luna, Cris Parreño, Susana Capón, Mari Luz, Iván, Lola y Roberto. Cocina: Adrián, Esmeralda, Jenny y Johan. Apoyo: Yilian, Lavinia, Leo, Cristian y Dulce (alta del 17/09). Lola es apoyo pero se queda en sala mientras cubra la baja de Laura. **Tere es apoyo** (Aroa, 17/09).

Reglas: **dos apoyos no pueden quedarse solos** en un turno; **Johan siempre cocina** y quien ese día lleva la cocina no se propone para reforzar sala; los «nunca coincide» de Lavinia–Mari Luz y Leo–Susana Capón se relajan con aviso cuando no hay gente suficiente; y el **día libre puntual** de una semana no toca el día de siempre.

El 33 los martes es día flojo: mínimo 1, se queda Noe y abre él viniendo de la mañana (`partidoAbre.T`), igual que Pasarela. La **cocina no se imprime**.

## Entrevistas: los iconos y el dato que falta (17/09)

El grupo marca cada ficha de su base con un emoticono, y ahí está toda la clasificación: **cocinero**, **camarero**, **pulgar arriba** (bien valorado), **pulgar abajo** (mal valorado) y **reloj de arena** (pendiente de valorar). La app tiene ese mismo esquema —puesto y valoración por separado— y lo enseña con iconos propios.

Lo que **no** llegó son los datos: **Notion no exporta el icono de cada ficha**, ni en el CSV ni en el Markdown ni en los nombres de fichero (comprobado sobre el zip del 17/09: cero emoticonos en 273 fichas). El icono de página solo sale por la API (`GET /v1/pages/{id}` → `icon`).

**Los emoticonos son cinco**, no tres (capturas del 17/09): 👍 bien · ⏳ en espera · 👎 mal · ⛔ **vetado** (no volver a llamar; es más fuerte que el pulgar abajo) · 👨‍🍳 el puesto es cocinero. La ficha sin marcar lleva el icono de documento por defecto.

De las capturas se transcribieron **41 valoraciones y un puesto**; las otras 234 fichas siguen sin marcar porque solo se veían esas en pantalla.

Dos maneras de recuperar el resto:

1. **Que José añada dos columnas en Notion** (dos «Select»: puesto y valoración) y vuelva a exportar a CSV. Es lo más limpio y el volcado se rehace en minutos.
2. **Por la API de Notion**: José crea una integración interna, la comparte con las dos bases y pasa el token. Así se leen los iconos tal cual están, sin que él toque nada.

Mientras tanto las 275 fichas están «sin puesto» y «sin valorar», salvo las 26 en las que el puesto venía escrito en el propio nombre («Janira Cocinera»).

**Lo que sí trajo la exportación y ya está dentro**: de cada ficha se saca todo lo que había escrito —edad, zona, fecha de la entrevista, la experiencia contada, tipología de cocina, incorporación, expectativas salariales, horarios, condiciones y observaciones— y las siete aptitudes que pregunta el grupo: **cafetera, cambiar barril, bandeja, cocina, jamón, TPV y PDA**, cada una como sí / con dudas / no. Son **275 fichas**, de las que **35 tienen la entrevista contestada** y 31 la experiencia escrita. Se puede filtrar por aptitud («quién sabe cafetera») y el buscador entra en todo el texto, no solo en el nombre.

**Cómo se enseña** (17/09): pulsar en alguien abre su **perfil**, no un formulario. Arriba, la foto de color con sus iniciales, el nombre, las dos etiquetas y el teléfono como dos botones —llamar y WhatsApp—. Debajo, seis tarjetas de dato (edad, zona, fecha, tipología de cocina, incorporación y sueldo), las siete aptitudes coloreadas por sí / con dudas / no, y los textos largos de la entrevista en bloques. Cada dato lleva **su icono**, dibujado en el mismo trazo que la sartén y la bandeja (`SVG_EDAD`, `SVG_ZONA`, `SVG_FECHA`, `SVG_EXP`, `SVG_TIPOCOCINA`, `SVG_INCORP`, `SVG_SUELDO`, `SVG_HORARIO`, `SVG_COND`, `SVG_OBS`, `SVG_ADJ`, `SVG_TEL`, `SVG_WA`, `SVG_NOTA`), y el icono de cada campo se declara en `CAMPOS_ENTREVISTA`, en el modelo, para que lista y ficha no se desincronicen. Los campos vacíos se ven igual, con el recuadro punteado y un guion: así se sabe de un vistazo qué queda por preguntar. Para editar, el botón «Editar» abre los cajetines de siempre y al guardar vuelve al perfil.

Las **153 fotos y CV** adjuntos (16 MB) no caben en la aplicación de un solo fichero: de momento solo se guarda cuántos tenía cada persona. Para verlos haría falta subirlos al servidor, que es otro paso.

## Supuestos (marcados «supuesto» en la app hasta confirmación)

- Un turno cuenta **8 h** («más o menos», dice el cliente: C2, pendiente), independientemente de las nueve horas que abre el local por la mañana. Editable por local y franja en Equipo → Ajustes de los locales.
- Reparto del turno partido: el cliente confirmó 5 y 3 entre semana y 4 y 4 el fin de semana; la **hora exacta** de cada tramo (11:00–16:00 y 21:00–00:00 / 12:00–16:00 y 20:00–00:00) y si cambia de un local a otro siguen siendo supuestos (C2). Sin descanso que no cuente dentro del turno. Editables por local y por día en Equipo → Ajustes de los locales.
- El 33 sábado mañana pide 3 y con el PDF solo pueden Victoria y Jenny: la semana tipo pone a **Hojan** como tercero, marcado supuesto.
- Roberto hace partido viernes y sábado; Yilian partido el lunes cubriendo a Susana Capón; Lavinia por defecto en Pasarela domingo tarde.
- Los festivos solo marcan el día: ni cierran locales ni recargan horas.
- Laura y Maydeth siguen en el equipo con baja sin fecha de fin.

## Preguntas abiertas para el grupo (C1–C29)

Horas y nómina: **C1 respondida** (WhatsApp de la encargada, 15/09): mañana desde la apertura, 07:00 (fines de semana 08:00), hasta las 16:00; tarde de 16:00 hasta el cierre, «a lo mejor sobre las 00:00, aunque depende» — falta la hora real de cierre por local y día, que en la app va marcada como aproximada. **C2 respondida en parte** (16/09): un partido son las ocho horas repartidas, «4 y 4 o 5 y 3 […] entre semana es 5 y 3 y el finde 4 y 4, aunque depende a veces según la necesidad» — falta la hora exacta de entrada y salida de cada tramo, si el reparto cambia de un local a otro y si hay descanso que no cuente; C3 el «estira el turno» de Noe el domingo; C4 horas de contrato (Lavinia, Leo, Tere, Cristian, Hojan); C5 cómo se paga y quién apunta las horas fuera de planilla; C6 festivos: apertura, municipio y si se pagan distinto.

Mínimos y aperturas: C7 confirmar los mínimos con asterisco; C8 Zapatillera mañana ¿3 o 2?; C9 Pasarela domingo ¿2 y 2?; C10 quién abre El 33, Zapatillera y Mónaco por la mañana; C11 quién sale primero cuando el titular libra.

Personas: C12 tercero de El 33 sábado mañana; C13 días de partido reales de Roberto; C14 Hojan en Zapatillera y sus mañanas libres; C15 semana de Jenny; C16 Noe los partidos de Jenny y Victoria; C17 día libre de Yilian y su domingo; C18 apoyo de Pasarela domingo tarde; C19 qué significa «no coinciden»; C20 Susana Capón el martes; C21 Cristian «no abre El 33» y partidos; C22 **respondida** (Aroa, 17/09): Tere es apoyo y está en la mañana de Pasarela; C23 Lavinia viernes, sábado y domingo; C24 vuelta de Laura y Maydeth; C25 las tres decisiones de Highkey.

Fútbol y eventos: C26 refuerzo por equipo y local; C27 quién cubre (plantilla o extras); C28 otros días con refuerzo.

Planilla: C29 foto o archivo de la planilla que usan y cómo llega a cada trabajador.

Todas se pueden responder cambiando datos en la app (ficha de persona, ajustes del local, equipos): no hace falta tocar código.
