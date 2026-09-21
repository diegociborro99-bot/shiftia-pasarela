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

Puestos: **sala, cocina y apoyo**; el «comodín» se retira como puesto. Sala: Noe, Victoria, Jacquelin, Juani, Susana Luna, Cris Parreño, Susana Capón, Mari Luz, Iván, Lola y Roberto. Cocina: Adrián, Esmeralda, Jenny, Johan y Susi (de baja). Apoyo: Yilian, Lavinia, Leo, Cristian y Dulce (alta del 17/09). Lola es apoyo pero se queda en sala mientras cubra la baja de Laura. **Tere es apoyo** (Aroa, 17/09).

Reglas: **dos apoyos no pueden quedarse solos** en un turno; **Johan siempre cocina** y quien ese día lleva la cocina no se propone para reforzar sala; los «nunca coincide» de Lavinia–Mari Luz y Leo–Susana Capón se relajan con aviso cuando no hay gente suficiente; y el **día libre puntual** de una semana no toca el día de siempre.

El 33 los martes es día flojo: mínimo 1, se queda Noe y abre él viniendo de la mañana (`partidoAbre.T`), igual que Pasarela. La **cocina no se imprime**.

## Al imprimir, solo los nombres (18/09)

José lo repitió siete veces en la reunión: *«al imprimir que no aparezcan nunca horas»*, *«sin las horas y sin mañana y tarde»*, *«todo eso de forzado a mano, por Jenny, de partido, todo eso debería al imprimir quitarse»*, *«solo los nombres, ni los números ni nada, 12123»*, *«ni forzado»*, *«ni estimado ni por, solo nombres»*.

La clave es para quién es el papel. Aroa imprime **una** hoja, la recorta en cuatro y deja un trozo en cada bar. El papel es para el equipo, y al equipo solo le hace falta saber quién trabaja. Lo demás —posiciones, huecos, turnos cortos, forzados, mínimos supuestos— son señales de oficina, y la oficina mira la app.

**Un solo interruptor**, `PX.soloNombres`, que encienden las hojas del equipo con `pxHojaDelEquipo(...)` y que leen las piezas que arman la hoja. Sin eso, la condición habría que repetirla en veinte plantillas y la primera que se olvidara sería la que José viera impresa.

Desaparecen del papel: las horas del local (`horarioTxt` se calla en origen), la etiqueta `Mañana`/`Tarde` de la fila, el número de posición, las marcas ▸ □ P C, «por X», la nota, «forzado a mano», la cuenta `n/min*`, «+1 hueco», «faltan n», «corregido», el hueco sin cubrir entero, la leyenda, el rojo y el ámbar de las casillas, la regla de cocina del local, el «· tarde» del partido y el pie que explicaba las posiciones.

**Lo que NO cambia**, y es deliberado:

- **La hoja de HORAS** (`abrirImpresionHoras`): es la de la nómina y vive de las horas.
- **La del generador** (`abrirImpresionSemanaGenerada`): no se recorta ni se cuelga; es con la que Aroa repasa antes de volcar, y ahí el número de posición, el hueco y el «forzado» son justo lo que hay que mirar.
- **El tablón del MES**: es personas × días y su vocabulario entero es la píldora M/T/P. Quitarle la letra deja píldoras de color vacías, o sea una hoja que no dice nada. No es la hoja que se recorta para el bar, así que se queda como está hasta que el cliente diga lo contrario.

**La rejilla, regular** (Diego, 18/09: *«que quede más visual, las celdas con un espacio similar entre todos en la variante semanas»*). Con solo nombres en la casilla, la hoja se lee de un vistazo si nada baila: `abrirImpresion` y `abrirImpresionLocal` calculan cuántos nombres tiene la casilla más llena de esa semana y lo pasan al CSS como `--pxn`; cada casilla reserva ese alto y cada nombre ocupa una caja exacta de `1.38em`, así que todas las filas de turno miden lo mismo y el hueco entre nombres es idéntico en toda la hoja. Se calcula de los datos y no a ojo: el día que el grupo crezca, la rejilla se ajusta sola.

Dos detalles que costaron una vuelta: en la hoja de un local, la línea del partido (*«Juega el Barcelona»*) se reserva **todos** los días aunque esté vacía, porque si solo la llevara el día que hay fútbol esa fila crecería y rompería la rejilla; y la banda de color de cada bar adelgaza, que ahora solo lleva el nombre. Con eso la hoja general queda en 764 px de los 794 que caben en un A4 apaisado, sin que salte el compactado automático.

**Y los siete días, del mismo ancho** (Diego, 18/09, segunda pasada: *«de la tabla de semana en imprimir sigue quedando muy apretado algunas casillas como el viernes»*). Las filas ya medían lo mismo, pero el **ancho** seguía repartiéndose por contenido, y quien mandaba no eran los turnos sino los chips del pie de descansos: el lunes, con seis personas librando, se llevaba 192 px; el viernes, con ninguna, se quedaba en 73, y ahí «Susana Capón» llegaba a 1 px del borde. La tabla de la semana pasa a `table-layout:fixed`, así que los siete días miden 132 px pase lo que pase debajo. La columna del rótulo se queda en sus 128 px: es la única con texto largo (*«vacaciones · permisos · libres»*), y estrecharla lo sacaba encima del lunes. Como al fijar el ancho una columna ya no puede ensancharse, un nombre kilométrico se recorta dentro de su casilla en vez de meterse en el día siguiente. La hoja queda en 778 px de los 794.

**Fuera el pie de descansos, y la rejilla a llenar la hoja** (Diego, 18/09: *«la fila quien libra y quien de baja en el imprimible de la semana fuera también»*). El papel del bar es la rejilla de nombres y nada más: quién libra, quién está de vacaciones y quién de baja se mira en la app, que es donde se decide. La hoja de cada bar sí conserva su pie —ahí es la plantilla de ese local— y la del generador también, que es con la que la oficina repasa antes de volcar.

Al quitarlo sobraba un tercio de hoja, así que `montarImpresion` aprende el movimiento contrario al compactado: con `opts.crecer` sube el cuerpo de la tabla —13, 12,5, 12… px— y se queda con **la última talla que cabe** en el A4. Con la semana del 14 son 10,5 px en vez de 8,5, y los nombres pasan de 8,8 a 10,9 px: se leen de pie desde la barra. Además, en esta hoja la caja de cada nombre es `1,5` veces la letra (`--pxl`) y no `1,38` como en la del local, que ya va en cuerpo 12,5. Si la semana viene muy cargada no crece, y si aun así no cabe, sigue el compactado de siempre. Y como la columna del rótulo se queda sin una sola letra, se estrecha a 44 px —el rail de color del bar— y esos 84 px se reparten entre los siete días: 144 px cada uno.


Las etiquetas `Mañana`/`Tarde` se van **al pie de la letra** (decisión de Diego, 18/09): en la hoja de un local quedan dos columnas sin título, la de la izquierda es la mañana y la de la derecha la tarde. En la general, dos filas por bar en el mismo orden.

## La lupa del selector de personas (18/09)

Diego: *«ponemos en el menu semana al aplicar para cambiar un trabajador que aparezca una lupita en el blop para buscarlo por nombre»*.

El «blop» es `#pickerPop` (`11-selector.js`), el popover que abren el `＋` de una casilla y el hueco «1·?». Se abre desde **Semana** y desde **Hoy**: el manejador de `[data-pick]` está en `document`, no en la vista, cosa que no se ve leyendo `13-vista-semana.js` por su cuenta. Lista a la plantilla entera en tres grupos —PUEDEN, CON AVISO, NO PUEDEN— así que con 21 personas hay que bajar buscando a ojo.

Cuatro decisiones que no son obvias:

- **Repinta solo `.plist`**, como hace `pintaListaEnt` en Entrevistas. Repintar el popover entero destruiría el `<input>` en cada tecla: se pierde el cursor y, en el móvil, se cierra el teclado.
- **No se enfoca solo en el móvil** (`matchMedia('(hover:hover)')`): el teclado subiría y taparía el propio selector, que es lo que se está mirando.
- **Los grupos vacíos desaparecen con su cabecera.** Un «PUEDEN · 0» solo estorba. Y si no encaja nadie, se dice: «No hay nadie con ese nombre».
- **La estrella de RECOMENDADO solo sale sin filtro.** Con una búsqueda escrita, el primero de la lista es el que encaja con lo tecleado, no el recomendado del día; marcarlo confundiría.

## Entrevistas: los iconos y las hojas escaneadas (17/09)

El grupo marca cada ficha de su base con un emoticono, y ahí está toda la clasificación: **cocinero**, **camarero**, **pulgar arriba** (bien valorado), **pulgar abajo** (mal valorado) y **reloj de arena** (pendiente de valorar). La app tiene ese mismo esquema —puesto y valoración por separado— y lo enseña con iconos propios.

**Notion no exporta el icono de cada ficha**, ni en el CSV ni en el Markdown ni en los nombres de fichero (comprobado sobre el zip del 17/09: cero emoticonos en 273 fichas). Tampoco sale por consulta SQL de la base: solo por `GET /v1/pages/{id}` → `icon`, o por `POST /v1/databases/{id}/query`, que sí lo devuelve. Con el token de integración que pasó Diego se leyeron los 193 iconos de «Archivo de entrevistas» en dos llamadas: **⛔ 3 · 👍 13 · ⏳ 11 · 👎 13 · 👨‍🍳 1**, que son exactamente los 41 que ya se habían transcrito a mano de las capturas. No había ninguno más.

**Los emoticonos son cinco**, no tres: 👍 bien · ⏳ en espera · 👎 mal · ⛔ **vetado** (no volver a llamar; es más fuerte que el pulgar abajo) · 👨‍🍳 el puesto es cocinero. La ficha sin marcar lleva el icono de documento por defecto.

### El grueso de las entrevistas estaba en papel

Diego, el 17/09: *«el grueso de las entrevistas están adjuntadas digitalizando solo nombre y teléfono; luego la entrevista en sí está en un documento escaneado dentro de la base de datos. Necesitamos un lector OCR que nos permita extrapolar los datos de la ficha de cada empleado y pasarlos a nuestra base de datos, la de la web»*.

Eran **154 escaneos** (17 MB) repartidos por las fichas de Notion; 150 correspondían a entrevistas que la app no tenía. Se bajaron por la API (`GET /v1/blocks/{id}/children` da la URL firmada del bloque de imagen, **que caduca a los 5 minutos**) y se leyó cada hoja manuscrita, campo a campo.

Dos cosas que conviene tener presentes sobre ese volcado:

- **Se cruzó por el teléfono escrito en el papel**, no por el nombre de la página de Notion. Hay fichas con el escaneo de otra persona pegado: la de «Raquel perez ruiz» lleva el papel de Darlys Olaja, la de «Lavinia teodora stan» el de Raquel y la de «Darlys Olaja» el de Lavinia. Cruzando por nombre se habrían mezclado tres personas.
- **Diez hojas no casaban con ningún teléfono de la base**, porque en Notion está tecleado con un dígito cambiado (Sergio Navarro 602→607, Nicole Hoffman 667→662, Albedan Hurtado 641→691…). Esas se cruzaron por nombre y llevan en observaciones «En la hoja escaneada el teléfono es el …», para que el grupo decida cuál es el bueno.
- «Mar campello huedo» y «Mº angeles campello» comparten el 658852324: es la misma persona con dos hojas, de 6/9/2024 y 7/1/2025.

La hoja pregunta dos cosas que la ficha de la web no pinta —**copas/vinos** y **rapidez**—, así que van contadas dentro de observaciones.

### Cómo queda la base

De **275 fichas**: **192 con zona, 191 con edad, 188 con la experiencia contada, 177 con observaciones, 176 con las aptitudes y 143 con la documentación en regla** (antes eran 35 con entrevista y 31 con experiencia). Se filtra por aptitud («quién sabe cafetera») y el buscador entra en todo el texto, no solo en el nombre.

**117 fichas valoradas**: 44 bien, 25 en espera, 39 mal y 9 vetadas. Las nuevas salen de lo que el propio grupo escribió a mano al final de cada hoja —«ni de coña», «me gusta mucho y tiene mucha experiencia», «un impresentable que nos dejó tirados el día de entrar a trabajar»—, que es más rico que el emoticono. Las 158 restantes son hojas sin conclusión escrita.

### Que llegue a quien ya tenía la app abierta

La semilla de entrevistas solo se siembra cuando la lista está vacía (`if (!estado.entrevistas.length)`), que es lo correcto para no pisar la base del grupo en cada arranque. Pero eso dejaba fuera justo al que importa: la instalación de Railway ya tenía las 275 fichas, así que el volcado nuevo no le habría llegado y habría seguido viendo las tarjetas de solo nombre y teléfono.

`fundirSemillaEntrevistas(estado, semilla)` resuelve eso: recorre la semilla, busca cada ficha en la base guardada **por `id` y, si no aparece, por teléfono**, y rellena **solo los campos que estén en blanco**. Lo que el encargado haya escrito en la app —una observación, una valoración, un puesto— manda siempre sobre la hoja de papel. Las aptitudes se funden clave a clave, no se sustituye el bloque entero. Se ejecuta una sola vez, marcada con `estado.semillaEnt = SEMILLA_ENT_V`, y es idempotente: pasarla de nuevo no cambia nada.

Va dentro de `migrarEstado`, que es por donde pasan los tres caminos de carga —arranque local, estado recibido del servidor y planilla nueva—, así que el encargado lo ve al recargar y queda guardado en el servidor con su siguiente cambio.

**Privacidad**: estas fichas llevan teléfonos de 275 personas y lo que el grupo opina de cada una por escrito. La proyección del empleado (`estadoParaEmpleado`) es una lista blanca de claves, así que `entrevistas` nunca ha viajado; ahora hay un test en `tests/seguridad.test.mjs` que lo fija, porque el día que alguien añada una clave a esa lista conviene que salte.

### El contenido de la entrevista es del jefe (18/09)

José: *«en la opción de entrevistas, Aroa funciona bien para antes de citar a alguien comprueba si previamente lo hemos descartado pero no quiero que tenga acceso al contenido de cada entrevista. Si sí le hemos entrevistado, si hemos puesto bien, mal o regular y demás pero no a lo que hay dentro de cada entrevista donde hablo de condiciones»*. Aroa es la cuenta `oficina`; José, `admin`.

El permiso va **por cuenta, no por rol** (`users.verent`): las dos siguen siendo `admin`, con el mismo mando sobre la planilla. De serie lo traen el programador y la cuenta del jefe; cualquier otra nace sin él. Lo concede **quien ya lo tiene** —o el programador—, nunca a sí mismo: si fuera «cualquier encargado», Aroa, que también es `admin`, se lo devolvería sola. El interruptor está en Cuenta → Usuarios.

Se impone en **tres sitios**, porque con uno solo no bastaba:

1. **`GET /api/estado`** proyecta cada ficha (`entrevistaSinContenido`): salen nombre, teléfono, lista, puesto, valoración, motivo del descarte y fecha de la entrevista — lo justo para «¿hay que volver a llamar a este?» — y nada de dentro: ni experiencia, ni sueldo, ni horarios, ni condiciones, ni observaciones, ni aptitudes.
2. **`PUT /api/estado`** conserva las entrevistas guardadas cuando escribe alguien sin permiso. Sin esto, el primer cambio de turno de Aroa habría devuelto las fichas vacías y **borrado el trabajo de José**: la app manda el estado entero, no un parche.
3. **`GET /`** sirve `index.html` con la semilla vaciada. Este fue el hallazgo gordo, y lo destapó la batería e2e: la base de entrevistas viaja **dentro del propio fichero de la app** (es la semilla del primer arranque) y el servidor lo sirve entero a cualquiera con sesión. Los 275 teléfonos y lo que el grupo opina por escrito de cada candidato estaban en el navegador de **todos los empleados**, por muy proyectado que estuviera el estado. El bloque va marcado con `/*ENTREVISTAS_START*/…/*ENTREVISTAS_END*/` —el mismo truco que `MODELO_START`— y al servir a quien no puede verlo se sustituye por `const ENTREVISTAS_SEMILLA = [];`. La constante sigue existiendo, así que la app no se rompe; la variante recortada se guarda en memoria.

De cada ficha salen **nombre, teléfono, si ya se la entrevistó, la valoración y el motivo del descarte**, y nada más. Ni la fecha de la entrevista ni el puesto al que opta: los dos son de dentro. José lo acotó así el 18/09, por Diego: *«tiene que saber a quiénes se le ha entrevistado también para no volverles a llamar, pero no el contenido de la entrevista fuera del nombre y teléfono»*. Como sin campos `tieneEntrevista()` daría falso y se perdería el punto verde de «ya entrevistado» —que es justo lo que ella necesita—, la proyección manda un booleano `entrevistado` y el modelo lo respeta cuando la ficha viene marcada `sinContenido`.

**Lo único que puede escribir**: dar de alta a alguien en la lista negra. Diego, 18/09: *«el oficinista puede meter a gente en la lista negra (crear registros) si no acude una persona a la entrevista»*. El servidor (`entrevistasTrasEscrituraSinPermiso`) conserva las fichas guardadas tal cual —ni se editan ni se borran— y de lo que llega nuevo acepta solo altas con `id`, `nombre`, `tel` y `motivo`, forzadas a la lista `alerta`. Todo lo demás que venga en ese alta se tira, aunque el cliente lo mande. Queda en la auditoría.

En la app, `puedeVerEntrevista()` decide: sin permiso no hay botón de «Registrar» —sale «+ A la lista negra», que abre el alta reducida—, la fila deja de ser un `<button>` (no hay nada que abrir) y sale un aviso explicando qué sí y qué no. Es solo cortesía visual: la verdad la impone el servidor, y `abrirFichaCand` lleva su propia guarda.

Sin servidor (modo local, demo) no hay cuentas y se ve todo, que es como Diego prueba.

**Pendiente**: la segunda base, «Alerta interna» (81 fichas), sigue sin duplicar en el espacio de Diego, así que sus escaneos no se han podido leer.

**Lo que pregunta la entrevista** (Aroa, 17/09): a las siete aptitudes de siempre se suma **«Aperturas o cierres»** —«para saber si ha hecho aperturas o cierres en otros locales, que ahí veo yo si tiene experiencia»—, con las mismas tres respuestas y su propio filtro. Y detrás del campo Horarios va **«El entrevistado busca»**: mañanas, tardes, turno partido, fin de semana y «no tiene problemas», varias a la vez; la última es excluyente porque quiere decir justo eso. Se guarda en `busca` (lista de ids) y entra en el buscador por su texto.

**Las mismas palabras en todas partes** (Diego, 17/09): `label` es de una persona («Cocinero/a», «Camarero/a») y se usa en la ficha y en la etiqueta de cada candidato; `plural` («Cocineros», «Camareros») solo en los filtros, que agrupan gente.

**El puesto es una lista, no uno solo** (Aroa, 17/09): «hay algunos que son Camarero Cocinero». En la ficha los dos botones se pulsan a la vez, `puestos` guarda los ids en el orden de siempre (cocina, sala) y `migrarCandidatos` convierte el campo antiguo `puesto` al cargar la app, una sola vez. El filtro de Cocina y el de Sala encuentran a quien lleva los dos, y el chip de cada uno lleva su cuenta.

**La valoración cierra la ficha** (Aroa, 17/09): «está la última del todo, que es lo que decido al terminar la entrevista». Va después de las notas, separada por una línea.

**La ficha empieza por fecha, nombre, teléfono, edad, zona y documentación en regla** (Diego, 17/09): los campos marcados `cabecera` en `CAMPOS_ENTREVISTA` suben arriba del todo y salen del bloque de la entrevista. Un campo con `opciones` se pinta de botones en vez de cajetín (documentación: Sí / No / En trámite); guarda el id y enseña la palabra, y el buscador lee la palabra. **La fecha se pone sola** al registrar a alguien (`fmtLargo(isoHoy())`) y va la primera de todo, tanto en la ficha como en el perfil. Como se rellena sola, va marcada `meta: true` y no cuenta para «entrevista contestada» — si no, cualquier alta recién creada figuraría como contestada.

**Cómo se enseña** (17/09): pulsar en alguien abre su **perfil**, no un formulario. Arriba, la foto de color con sus iniciales, el nombre, las dos etiquetas y el teléfono como dos botones —llamar y WhatsApp—. Debajo, seis tarjetas de dato (edad, zona, fecha, tipología de cocina, incorporación y sueldo), las siete aptitudes coloreadas por sí / con dudas / no, y los textos largos de la entrevista en bloques. Cada dato lleva **su icono**, dibujado en el mismo trazo que la sartén y la bandeja (`SVG_EDAD`, `SVG_ZONA`, `SVG_FECHA`, `SVG_EXP`, `SVG_TIPOCOCINA`, `SVG_INCORP`, `SVG_SUELDO`, `SVG_HORARIO`, `SVG_COND`, `SVG_OBS`, `SVG_ADJ`, `SVG_TEL`, `SVG_WA`, `SVG_NOTA`), y el icono de cada campo se declara en `CAMPOS_ENTREVISTA`, en el modelo, para que lista y ficha no se desincronicen. Los campos vacíos se ven igual, con el recuadro punteado y un guion: así se sabe de un vistazo qué queda por preguntar. Para editar, el botón «Editar» abre los cajetines de siempre y al guardar vuelve al perfil.

Las **153 fotos y CV** adjuntos (16 MB) no caben en la aplicación de un solo fichero: de momento solo se guarda cuántos tenía cada persona. Para verlos haría falta subirlos al servidor, que es otro paso.

## Supuestos (marcados «supuesto» en la app hasta confirmación)

- Un turno cuenta **8 h** («más o menos», dice el cliente: C2, pendiente), independientemente de las nueve horas que abre el local por la mañana. Editable por local y franja en Equipo → Ajustes de los locales.
- Reparto del turno partido: el cliente confirmó 5 y 3 entre semana y 4 y 4 el fin de semana; la **hora exacta** de cada tramo (11:00–16:00 y 21:00–00:00 / 12:00–16:00 y 20:00–00:00) y si cambia de un local a otro siguen siendo supuestos (C2). Sin descanso que no cuente dentro del turno. Editables por local y por día en Equipo → Ajustes de los locales.
- El 33 sábado mañana pide 3 y con el PDF solo pueden Victoria y Jenny: la semana tipo pone a **Hojan** como tercero, marcado supuesto.
- Roberto hace partido viernes y sábado; Yilian partido el lunes cubriendo a Susana Capón; Lavinia por defecto en Pasarela domingo tarde.
- Los festivos solo marcan el día: ni cierran locales ni recargan horas.
- Laura, Maydeth y Susi (Aroa, 17/09) siguen en el equipo con baja sin fecha de fin. Las altas posteriores al primer arranque (Dulce y Susi) las mete `migrarAltas` al cargar, una sola vez y con marca en `estado.migraciones`: la semilla solo se usa con el servidor vacío, así que sin eso no llegarían a la planilla del cliente. A Susi la cubre Adrián; su local (Zapatillera, porque la cubre él) y la fecha de inicio de la baja son supuestos.

## Preguntas abiertas para el grupo (C1–C29)

Horas y nómina: **C1 respondida** (WhatsApp de la encargada, 15/09): mañana desde la apertura, 07:00 (fines de semana 08:00), hasta las 16:00; tarde de 16:00 hasta el cierre, «a lo mejor sobre las 00:00, aunque depende» — falta la hora real de cierre por local y día, que en la app va marcada como aproximada. **C2 respondida en parte** (16/09): un partido son las ocho horas repartidas, «4 y 4 o 5 y 3 […] entre semana es 5 y 3 y el finde 4 y 4, aunque depende a veces según la necesidad» — falta la hora exacta de entrada y salida de cada tramo, si el reparto cambia de un local a otro y si hay descanso que no cuente; C3 el «estira el turno» de Noe el domingo; C4 horas de contrato (Lavinia, Leo, Tere, Cristian, Hojan); C5 cómo se paga y quién apunta las horas fuera de planilla; C6 festivos: apertura, municipio y si se pagan distinto.

Mínimos y aperturas: C7 confirmar los mínimos con asterisco; C8 Zapatillera mañana ¿3 o 2?; C9 Pasarela domingo ¿2 y 2?; C10 quién abre El 33, Zapatillera y Mónaco por la mañana; C11 quién sale primero cuando el titular libra.

Personas: C12 tercero de El 33 sábado mañana; C13 días de partido reales de Roberto; C14 Hojan en Zapatillera y sus mañanas libres; C15 semana de Jenny; C16 Noe los partidos de Jenny y Victoria; C17 día libre de Yilian y su domingo; C18 apoyo de Pasarela domingo tarde; C19 qué significa «no coinciden»; C20 Susana Capón el martes; C21 Cristian «no abre El 33» y partidos; C22 **respondida** (Aroa, 17/09): Tere es apoyo y está en la mañana de Pasarela; C23 Lavinia viernes, sábado y domingo; C24 vuelta de Laura, Maydeth y Susi, y desde cuándo está de baja Susi; C25 las tres decisiones de Highkey.

Fútbol y eventos: C26 refuerzo por equipo y local; C27 quién cubre (plantilla o extras); C28 otros días con refuerzo.

Planilla: C29 foto o archivo de la planilla que usan y cómo llega a cada trabajador.

Todas se pueden responder cambiando datos en la app (ficha de persona, ajustes del local, equipos): no hace falta tocar código.

## El forzado, y qué regla se rompe (18/09)

`puedeEstar` devolvía `{ok, motivo, avisos}`: un texto en castellano y poco más. Ahora devuelve también **`regla`**, la clave de la que choca (`locales`, `franjas`, `libra`, `vetos`, `partido`, `nuncaCon`, `standby`, y las que no se pueden forzar de ninguna manera: `cerrado`, `duplicado`, `ausencia`, `otraFranja`), y `nombreRegla(k)` le pone el nombre que ve el encargado. Con eso, la fila de «no pueden» del selector, el aviso antes de forzar, el del Mes y el menú de la casilla dicen *qué* regla se está incumpliendo y no solo el síntoma — Diego, 18/09: *«un aviso que cuando fuerzas un trabajador te diga QUÉ REGLA ESTÁS INCUMPLIENDO»*. Es la diferencia entre «no puedo poner a Adrián» y «Adrián tiene Zapatillera como único local: se corrige en su ficha».

El otro medio problema era el contrario: avisos que ya no valían. `entry.forzado` se estampaba al asignar y **no se volvía a mirar nunca**, así que la planilla imprimía «forzado a mano» semanas después de que el motivo se hubiera evaporado (Aroa, 18/09: *«puede ser que Lola esté puesta que libra los domingos y esta semana libra un miércoles»*). La solución no es limpiar el dato cuando algo cambia —habría que acordarse en cada sitio que toca una ficha—, sino no preguntárselo al dato: `avisosVigentes(cfg, staff, est, iso, tid, pid)` vuelve a pasar a esa persona por `puedeEstar` con `{forzar:true, yaDentro:true}` y devuelve las reglas que rompe **ahora**. `posicionesDe` y `revisarTurno` lo usan, así que la marca aparece y desaparece sola. `entry.forzado` se queda en el estado como lo que es: la constancia de que alguien lo forzó, para el historial.

## Un guardado ajeno ya no cierra tu ventana (18/09)

Diego, 18/09: *«cuando una persona hace cualquier tipo de cambio en la planilla, al guardar, si otro usuario tiene una ventana abierta, por ejemplo perfil de empleado, se la cierra forzosamente»*.

`aplicarEstadoExterno` cerraba **todos** los paneles en cuanto la huella de la planilla cambiaba. La intención era buena —que nadie guarde encima de lo que otro acaba de escribir— pero el precio lo pagaba quien no tenía nada que ver: Aroa mueve un turno y a José se le cierra la ficha que estaba leyendo.

Lo que de verdad puede quedar desfasado no es «un panel», es **el registro que ese panel está mirando**. Así que cada panel lo declara al abrirse: `abrirOverlay(id, html, { vigila: 'staff:adrian', reabrir: () => openFicha('adrian') })`. Al llegar un estado de fuera se compara ese registro antes y después:

- **Igual** → el panel sobrevive. No basta con no borrarlo: el DOM viejo guarda referencias a objetos del `S` anterior y, al tocar un campo, escribiría en un huérfano. Se vuelve a pintar con `reabrir()` contra el estado nuevo, conservando el scroll. Como el registro es idéntico, sale exactamente igual.
- **Distinto** → se cierra, con su aviso. Y se cierra *aunque la planilla no se haya movido*: una entrevista no entra en la huella de la planilla, y antes ese panel se quedaba abierto con datos viejos sin que nadie dijera nada.

Lo llevan hoy la ficha de persona (`staff:`) y la de una entrevista (`cand:`), que son las dos en las que se está un rato. Los popovers de casilla siguen cerrándose siempre: son menús de dos líneas anclados a una celda que se repinta.

## El registro de apoyos (18/09)

José: *«podemos poner que, dentro de la propia planilla semanal… al tocar en los que estén marcados como apoyo… aparece un contador que le ponga ajustar apoyo y ahí le pongas a qué hora tiene que entrar. Cada día»*. Y el porqué: *«a partir del día 1 de octubre… un registro, que los apoyos son los extras que hay que pagarle»*. Aroa manda las horas del fin de semana por correo: *«Dulce de 11:30 a 15 y de 20:30 a 01 · Leo de 19 a cierre · Yiliam de 10 a 16 · Cristian de 20 a cierre»*.

**No hacía falta un dato nuevo.** La asignación ya admitía `ini`/`fin` (el «horario distinto este día» del menú de la casilla) y `minutosTurno` ya lo ponía por delante del tramo del partido y del horario del local, así que la nómina ya contaba bien un tramo a mano. Lo que faltaba era hacerlo cómodo y visible:

- **`Ajustar apoyo`** es lo primero del menú cuando la persona es apoyo (`esApoyo`, puesto = apoyo); para el resto sigue siendo «Horario distinto este día», al final. El `prompt('12:00-20:00')` se convierte en un formulario dentro del mismo popover —entra, sale, «hasta el cierre»— que rellena con `cierreDe(l, dow)`, la hora a la que ese local cierra ese día de la semana. Un detalle de mecánica: el popover se repinta en el siguiente tick, porque `cierraFuera` mira si el botón pulsado sigue dentro del popover y, si se repinta en el mismo click, el botón ya no está en ningún sitio y lo cerraría.
- **El tramo se ve.** `posicionesDe` devuelve `tramo` cuando está puesto a mano; el chip de Hoy lo enseña entero («19:00–01:00»), que es lo que José quiere ver *«en el menú de hoy de un vistazo en el móvil»*, y el de Semana en corto («19–01», `horaCorta` quita los `:00`). En el papel del bar no sale nada: la hoja es solo nombres.
- **El registro**, en Horas: `registroApoyos(cfg, staff, meses, y, m)` devuelve cada apoyo con sus días y cada día con sus tramos (bar, franja, de qué hora a qué hora, minutos, `aMano`). Los minutos se calculan con la misma `minutosTurno` y el mismo `repartoDelDia` que `horasPersonaMes`, y un test lo fija: lo que dice el registro es exactamente lo que cuenta la tabla de la nómina. `sinHoras` cuenta los tramos que nadie ajustó, porque esos **cuentan el turno entero del local** —el bloque los marca «sin ajustar» y el pie lo explica—; es preferible que se vea a que un apoyo cobre ocho horas por tres.
- **Dos tramos el mismo día** (Dulce, 11:30–15 y 20:30–01) son la casilla de la mañana y la de la tarde, cada una con su tramo; el de la noche cruza la medianoche y `minutosEntre` ya lo entendía. El test lo reproduce con el correo de Aroa tal cual: 8 h el sábado, 8 el domingo.

Lo que no se ha hecho, a propósito: el Excel de Horas no lleva aún el día a día de los apoyos (lleva los totales, que sí cuadran), y *«que se quede un registro desde el lunes 14, todo lo demás borrado para atrás»* es una operación sobre los datos de producción —«Vaciar la semana» sobre las anteriores—, no una pieza de la app.

## Entrevistas: las últimas primero (21/09)

José, por WhatsApp: *«Intenta que las entrevistas los que pongo BIEN o descarte me aparezcan primero cuando filtre. Si sale en orden alfabético me vuelvo loco. Para que las últimas por fecha me aparezcan antes»*.

La lista no ordenaba: pintaba `S.entrevistas` tal cual, y tal cual llegó de Notion era alfabético. `ordenarCandidatos(cands, hoy)` devuelve una copia ordenada por tres llaves: **`ts`** (el sello de «última vez tocada», descendente), después **la fecha de la entrevista** (`fechaCandidato`, la más reciente antes; sin fecha, al final), y si no hay ni una ni otra, el orden en que estaba. `filtrarCandidatos` se aplica sobre esa copia, así que el filtro «Bien» conserva el orden.

`ts` lo pone la app en tres sitios: al registrar a alguien, al meter a alguien en la lista negra desde la oficina (el servidor lo deja pasar en la lista blanca del alta, `CAMPOS_ALTA_ALERTA`), y al guardar una ficha **solo si cambió algo** —se compara el JSON antes y después—, para que abrir una ficha y darle a Guardar no la suba.

**La fecha de las antiguas.** Notion no la guardaba (la `createdTime` de las 275 es la misma: el minuto en que José duplicó la base), pero las hojas escaneadas sí, y el OCR la dejó en el campo `fecha` de 165 de las 194 fichas de Entrevistas, escrita como la leyó: `23/2/2026`, `6/1/2024`, `22 de Julio de 2026`, `29 de julio del 2026` con el texto de al lado colado debajo, `26/’9/2025` con un apóstrofo, y 22 sin año (`14 de Septiembre`, `29 de Julio.`). Las nuevas las registra la app como `lunes 21 de septiembre`, también sin año. `fechaCandidato(c, hoy)` lee todas esas formas (numérica, «d de mes [de[l] aaaa]», ISO) y devuelve ISO; sin año toma la última vez que cayó esa fecha (este año si ya pasó, si no el anterior), con `hoy` inyectable para los tests. Lo que no entiende devuelve `null`, y ese `null` no adelanta ni atrasa a nadie: se queda con los que no tienen fecha. La ficha no se toca: se lee para ordenar y para pintar la fecha corta («14 sep 2026») delante del teléfono en cada fila, que es lo que hace legible el orden. Un mes, un día y un año siempre presentes: un `45/13/2026` es `null`.

Las 114 fichas antiguas con valoración (43 bien, 25 en espera, 38 mal, 8 vetadas) la traen de las etiquetas de Notion y de las hojas; las 80 sin valorar son las que José irá poniendo, y cada una que valore sube arriba.

