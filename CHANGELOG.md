# Changelog — Shiftia · Grupo Pasarela

## v0.6.0 · 17/09/2026 — Reunión con José y Aroa, y la base de entrevistas

- **Los puestos son tres: sala, cocina y apoyo.** El «comodín» desaparece como puesto
  (sigue existiendo «sin local fijo», que es otra cosa: quien puede ir a cualquier bar).
  Cada persona queda con el puesto que dictó José. Alta de **Dulce** (apoyo), que de
  momento no abre local mientras sea nueva.
- **Reglas nuevas del grupo**: dos apoyos no pueden quedarse solos en un turno (la
  casilla avisa); **Johan siempre cocina**; la cobertura no propone para sala a quien
  ese día lleva la cocina —el fallo que salió en directo al cubrir a Cris Parreño—; y
  los «nunca coincide» de Lavinia–Mari Luz y Leo–Susana Capón se respetan **si hay
  gente suficiente** y, si no, se relajan dejando el aviso.
- **Día libre puntual**: debajo de «libra», uno o dos días sueltos solo para esa
  semana. A la siguiente vuelve su día de siempre, sin tener que acordarse de nada.
- **El 33 los martes**: se quita el hueco que no correspondía. Es día flojo, se queda
  Noe solo y abre él viniendo de la mañana.
- **La cocina no se imprime**: sigue siendo variable interna, pero en el papel sobraba.
- **La vista Semana enseña nombres** en vez de iniciales.
- **Los iconos de la base del grupo**: sartén (cocinero), bandeja (camarero), pulgar
  arriba (bien), reloj de arena (en espera), pulgar abajo (mal) y **⛔ vetado**, dibujados a mano en la
  misma línea que la sartén de la cocina. Salen en la lista, en los filtros y en la ficha.
  *Los datos de esos iconos no vinieron en la exportación*: Notion no incluye el icono de
  cada ficha ni en el CSV ni en el Markdown, así que las etiquetas están por rellenar
  (ver DISEÑO.md).
- **La entrevista entera de cada candidato**, que estaba en la exportación y no se había
  usado: edad, zona, fecha, la experiencia contada, incorporación, lo que pide de sueldo,
  horarios, condiciones y observaciones, más las siete aptitudes que pregunta el grupo
  —cafetera, cambiar barril, bandeja, cocina, jamón, TPV y PDA— como sí / con dudas / no.
  Se filtra por aptitud y el buscador entra en todo el texto: buscar «Springfield»
  encuentra a quien lo contó en su experiencia.
- **Entrevistas y alerta interna**: dentro están ya las dos bases de Notion de José
  (194 candidatos y 81 en alerta). Dos menús separados, dos etiquetas
  por persona —puesto y valoración (bien / en espera / mal)—, filtros que combinan las
  dos, buscador por nombre o teléfono y ficha para registrar, editar o mover de lista.
- **Vacaciones para la nómina**: columna de días de vacaciones en el contador de horas,
  las fechas en el desglose de cada persona y un botón **«Vacaciones del año»** con
  toda la plantilla mes a mes, exportable a Excel.
- **Dulce en standby**: entra en la plantilla pero el generador no la coloca hasta que
  el grupo confirme sus días libres y sus locales. Se quita con un interruptor en su ficha.
- **La ficha del candidato es ahora un perfil**: al pulsar en alguien se abre su hoja de
  lectura con **todo** lo que trajimos de Notion —foto de color con sus iniciales, las dos
  etiquetas, el teléfono para llamar o abrir WhatsApp de un toque, seis tarjetas de dato
  (edad, zona, fecha de la entrevista, tipología de cocina, incorporación y lo que pide de
  sueldo), las siete aptitudes coloreadas por sí / con dudas / no, y la experiencia, los
  horarios, las condiciones, las observaciones y las notas en bloques—, **cada cosa con su
  icono dibujado a mano**, en el mismo trazo que la sartén y la bandeja. Para tocar algo:
  «Editar», que abre los cajetines de siempre y vuelve al perfil al guardar.
- **Dos cuentas de administrador, con nombre nuevo**: la oficina (Aroa) pasa a llamarse
  **`oficina`** y el jefe (José) se queda con **`admin`** a secas. Las dos con los mismos
  permisos y sin acceso a **Actividad**, que sigue siendo solo del programador. En un
  servidor que ya estaba en marcha se renombran solas al arrancar, conservando contraseña,
  rol y ficha; y si la del jefe no existe, nace (`JEFE_USUARIO` / `JEFE_PASSWORD`).
- **La entrevista pregunta por aperturas y cierres**: una aptitud más, «Aperturas o
  cierres», con su llave y sus tres respuestas (sí / con dudas / no). Es la que más dice de
  quien viene de otro local, y se puede filtrar como las demás: «quién ha hecho aperturas».
- **«El entrevistado busca»**, justo debajo de Horarios: mañanas, tardes, turno partido, fin
  de semana y «no tiene problemas». Se marcan **varias a la vez**; «no tiene problemas» va
  sola, que es lo que significa. Sale también en el perfil y el buscador entra en ello
  (buscar «fin de semana» encuentra a quien lo pidió).
- **Las mismas palabras en todas partes**: en la ficha y en cada persona, **Cocinero/a** y
  **Camarero/a**; en los filtros, que agrupan gente, **Cocineros** y **Camareros**. Antes la
  ficha decía «Cocinero/a» y el filtro «Cocina».
- **Un candidato puede ser camarero y cocinero a la vez** (Aroa: «hay algunos que son
  Camarero Cocinero»). El puesto deja de ser uno solo: en la ficha se pulsan los dos, en la
  lista salen las dos etiquetas y los filtros de Cocina y Sala encuentran a esa persona por
  las dos. Las fichas que ya había se convierten solas al abrir la app.
- **La ficha empieza por lo que se pregunta primero**: fecha, nombre, teléfono, edad, zona y
  **documentación en regla** (Sí / No / En trámite, de tres botones).
  La **fecha se pone sola** con la del día en que se registra a alguien, y es también la
  primera tarjeta del perfil; como se rellena sola, no cuenta por sí misma como «entrevista
  contestada». El resto de la entrevista —experiencia, horarios, condiciones…— va debajo.
- **El lunes de Pasarela, como lo contó Aroa**: Mari Luz no hace partido los lunes; hace la
  **tarde entera, de 16:00 a cierre**, así que esa mañana no puede trabajar. La mañana se
  queda con Lola y Tere —falta uno— y la tarde con Mari Luz —falta otro—; los dos los
  taparía una misma persona haciendo el partido, y Aroa apunta a Dulce «a lo mejor», a ver
  cómo entra. La planilla enseña los dos huecos en vez de rellenarlos con quien no toca.
- **Vetos por día**: «no hace mañanas en Pasarela» pasa a poder ser «no hace mañanas en
  Pasarela **los lunes**». Es lo que hace falta para el caso de Mari Luz, y el generador,
  la cobertura, el catálogo de condiciones y la exportación al núcleo lo respetan igual.
- **Tere es apoyo** (confirmado por Aroa; era la última persona con el puesto pendiente).
- **Los permisos se cambian desde la app**: en Cuenta → usuarios, cada cuenta lleva un
  selector para subirla a administrador o bajarla a empleado —al bajarla se le pide su
  ficha de la planilla, porque si no entraría y no vería nada suyo—. Nadie puede cambiarse
  el suyo ni dejar el grupo sin administrador o sin programador, las cuentas de programador
  solo las toca el programador, y a quien cambia de rol se le cierra la sesión para que
  vuelva a entrar ya con lo que le toca. Antes esto solo se podía hacer con una variable
  del servidor (`ADMIN_PROMOTE`) y únicamente hacia arriba.
- **Dos arreglos de estilo que venían de serie**: la sección de Entrevistas usaba dos
  variables de color que no existían (`--line`, `--bg2`), así que sus tarjetas salían sin
  borde ni fondo; y el pie de la ficha llevaba `btn-cta`/`btn-sec` sin la clase base `btn`,
  que es la que pone el tamaño. Hay dos tests nuevos para que no vuelva a pasar en toda la app.
- **Pasada de móvil** en 320, 360, 375, 390, 430 y tablet en vertical: ninguna pantalla
  desborda ni tiene botones por debajo de lo que pilla un dedo, el buscador de Entrevistas
  y «Registrar» van en una fila, los filtros en una tira que se desliza, las etiquetas de
  cada candidato bajan a su línea, la tabla de vacaciones deja el nombre fijo al deslizar
  los meses y los campos no hacen zoom al enfocarlos en el iPhone.

## v0.5.0 · 15/09/2026 — Lo que pidió el cliente en la reunión del 15/09

- **Pasada de interfaz**: el menú superior encoge la letra por tramos para que las nueve
  pestañas entren sin arrastrar y sin comerse el logo (los `@media` estaban escritos
  antes de la regla base y nunca se aplicaban); los botones de la barra de Semana y Mes
  van todos juntos a la derecha en vez de partirse en dos filas a lados distintos; al
  desplazar de lado se quedan a la vista la persona, el nombre del local y la franja (y
  su fondo ya es opaco: el tinte de la fila dejaba ver por debajo las casillas del otro
  lado); y la cocina se marca con una **sartén** en vez del rombo, en la app y en las
  hojas impresas.
- **Vista previa del cambio** al confirmar una cobertura, como en el piloto de urología:
  una rejilla de persona × día con quién sale (tachado, en rojo), quién entra (en verde)
  y qué queda sin cubrir, con «Cancelar» y «Confirmar y aplicar». Nada se toca hasta
  confirmar.
- Arreglado: al cerrarse dos capas a la vez la app retrocedía dos veces en el historial y
  cambiaba de pestaña sola.

- **Arreglado: la app abría en una fecha vieja.** Guardaba el día que estabas mirando y
  lo restauraba para siempre, así que quien un día retrocedió a agosto abría la app en
  «1 de agosto» todas las mañanas, con la planilla vacía y ocho avisos. Ahora abre
  siempre en hoy y solo vuelve a donde estabas si lo dejaste ese mismo día. Además, Hoy,
  Semana y Mes avisan en ámbar cuando lo que hay en pantalla no es hoy («hace 2 meses»,
  «dentro de 12 días») y el botón «Hoy» resalta.

- **Horarios reales del grupo** (WhatsApp de la encargada): mañana de 07:00 a 16:00, los
  fines de semana desde las 08:00, y tarde de 16:00 hasta el cierre, «sobre las 00:00,
  aunque depende» (queda marcado como aproximado). Ya no son horarios supuestos.
- **El turno partido deja de contar como dos jornadas enteras**: se cuentan los dos tramos
  del local (12:00–16:00 y 20:00–00:00 de fábrica, editables y marcados como supuestos),
  salvo en la franja que la persona **abre**, que hace entera, y salvo horario puesto a
  mano en la casilla. Adrián pasa de 358 h a 200 h en septiembre: cifras de un mes, no de
  un año. El contador de horas explica arriba con qué horarios cuenta.
- **Ocho horas por turno**, como dice el cliente: el local abre nueve horas por la mañana
  (07:00–16:00), pero cada persona hace su turno de 8 h, así que la app separa lo que
  **abre el local** de lo que **cuenta el turno**. Un **turno continuo** —la misma persona
  abre la mañana y la tarde del mismo local— es un turno seguido y se cuenta una vez, no
  dos. Con eso el equipo sale a 8 h por día trabajado, salvo quien abre una franja (la hace
  entera) y además hace el otro tramo del partido: Victoria 9,3 h y Mari Luz 8,6 h de media
  al día. Las horas que cuenta un turno se cambian por local y franja en Equipo → Ajustes de
  los locales, y van marcadas como supuestas hasta que el cliente confirme el «más o menos».
- **El turno partido reparte esas ocho horas** (cliente, 16/09: «4 y 4 o 5 y 3 […] entre
  semana es 5 y 3 y el finde 4 y 4»). De fábrica: 11:00–16:00 y 21:00–00:00 de lunes a
  viernes, 12:00–16:00 y 20:00–00:00 el fin de semana, con su propia fila por día en
  Ajustes de los locales. **Quien abre una franja** entra a la hora de apertura y hace el
  tramo largo de los dos, así que también le salen ocho horas: Mari Luz, que abre la tarde
  de Pasarela en partido, hace 16:00–21:00 y 13:00–16:00 en vez de doce horas. Ahora un día
  trabajado son ocho horas para todo el equipo, haga turno suelto, partido o continuo.
- Las planillas ya guardadas se migran al cargarlas: solo se sustituyen los horarios que
  seguían siendo los supuestos de fábrica; lo que el encargado tocó a mano no se pisa.

- **Cobertura como en el papel**: desde Semana, Hoy o Mes, sobre la persona que va
  a faltar, «Falta estos días…» abre la hoja de cobertura con ella y el día ya
  marcados; una tira de dos semanas enseña sus turnos (M / T◆, en el color del
  local; libra / sin turno) y se marcan los días con un toque; «Buscar quién cubre»
  propone el plan A y el plan B **día a día: quién sale → quién entra** (con ABRE,
  ◆ cocina, avisos) o el hueco que queda y por qué; «Confirmar plan A» lo aplica y
  vuelve a la planilla con los cambios a la vista. La pestaña Cobertura es la
  misma hoja con la plantilla en avatares. Días sueltos se registran como
  ausencias por tramos.
- **Pasarela: quien hace partido puede abrir la tarde** (audio de la reunión: con
  Iván libre, la tarde del lunes la hace Mari Luz en partido y no hace falta un
  hueco de cobertura entera). Interruptor por local en Ajustes de los locales →
  «Quién abre»; condición nueva en el catálogo; El 33 sigue sin permitirlo (José
  da el martes por insalvable). La semana del prototipo pasa de dos huecos a uno.
- **«Volcar a la planilla»**: el botón del generador semanal dice lo que hace y,
  cuando no hay nada nuevo, «Ya está volcada en la planilla»; la hoja impresa de la
  planilla propuesta también lleva el botón de volcar.
- **Visible para el equipo**: en Semana y Mes, un botón por mes con el estado (el
  mes en curso y los pasados siempre visibles; los siguientes se hacen visibles
  cuando la planilla está lista y entonces les llega a los trabajadores; se puede
  volver a ocultar). Queda en el historial como publicación.
- **Actividad** (pestaña nueva, solo para el programador; en «Más» del móvil):
  qué está haciendo el encargado con la app, como un historial. Una sola línea de
  tiempo agrupada por días (Hoy / Ayer / fecha) que fusiona el historial de la
  planilla (quién hizo cada cambio) con la auditoría del servidor traducida al
  español: inicios de sesión, accesos fallidos y bloqueos, guardados de la planilla
  con su versión, copias, altas, bajas y reset de usuarios, contraseñas, peticiones,
  núcleo… con la IP en cada fila. Tarjetas resumen (último acceso del encargado,
  último guardado y quién, cambios de hoy, últimos 7 días, accesos fallidos),
  filtros por usuario y por tipo (Accesos, Planilla, Usuarios, Peticiones, Otros),
  buscador, «Actualizar», aviso si el encargado aún no ha entrado y «Mostrar más»
  a partir de 300 filas. Sin servidor enseña solo el historial de esta planilla.
  El encargado y los empleados no ven la pestaña (`body.rol-programador`).
  `tests/actividad.test.mjs`; baterías e2e del servidor y de la app ampliadas.

## v0.4.0 · 15/09/2026 — Gestor de cobertura, vaciar semana o mes, quitar el aviso del partido

- **Gestor de cobertura** (pestaña Cobertura, y en «Más» del móvil): el encargado
  dice quién va a faltar (baja, vacaciones, día libre, permiso, otro motivo o un
  cambio de turno), en qué días y en qué franja, y la app propone el **plan A**
  (recomendado) y el **plan B** (otras personas, o relajando lo relajable con
  aviso) para cubrir cada turno afectado con las fichas y las reglas del grupo:
  «cubre a» manda, luego comodines y apoyos que libren ese día, el local habitual,
  la cocina si hace falta, quien pueda abrir si la persona abría, y quien menos
  turnos lleve esa semana. Cada propuesta explica por qué; lo que nadie puede
  ocupar queda como hueco con el porqué (o «no hace falta nadie» si la casilla
  sigue completa). Aplicar registra la ausencia en la ficha, quita a la persona de
  esos turnos y pone a quien cubre con «por X»; Ctrl+Z lo deshace. En un cambio de
  turno puede proponer un **intercambio**: a cambio, la persona hace un turno
  cercano de quien le cubre. Desde la hoja de persona del Mes: «Buscar quién cubre
  este día…».
- **Vaciar la semana / vaciar el mes** en Semana y Mes: quita todas las plazas
  (también las puestas a mano) respetando bajas, vacaciones y demás ausencias, que
  siguen en las fichas; eventos, cierres y aperturas se quedan. Con confirmación,
  deshacer e historial.
- **Quitar el aviso del partido**: al pulsar el chip del evento en Hoy o el ⚽ de
  las cabeceras de Semana y Mes se abre el detalle con «Quitar el evento», «Ir al
  día» y «Otro evento ese día».
- Modelo: `TIPOS_INCIDENCIA`, `turnosAfectados`, `candidatosCobertura`,
  `planesCobertura`, `aplicarCobertura`, `vaciarPlanilla` (9 tests nuevos);
  `tests/cobertura.test.mjs`; batería e2e de la app ampliada.

## v0.3.0 · 15/09/2026 — Generador semanal con las condiciones del cliente

Sale del prototipo que pasó el cliente (planilla corregida del 14 al 20 de
septiembre, 11/09): el generador que el grupo quiere es el **semanal**, y su
resultado tiene que verse así.

- **Reglas nuevas** (30–32 del prototipo): el primero de cada franja hace turno
  completo (quien viene de la mañana no abre la tarde, salvo turno continuo, que
  se marca C); Cristian no hace la tarde completa; Leo nunca sale el primero.
  La cocina conserva su posición y solo abre si nadie más puede.
- **Posiciones en toda la app**: 1.º abre, ▸ sale el primero (fijo), ◆ cocina,
  P partido, C continuo, □ comodín, «por X» y notas, y **hueco disponible** en la
  1.ª posición cuando nadie de la plantilla puede abrir (Hoy, Semana, impresión).
- **Generador semanal** (pestaña Generador, modo Semana): planilla por local con
  la cuenta n/mín*, posiciones, huecos con motivo y por qué nadie puede, «qué ha
  cambiado» respecto a lo que había, quién libra cada día, las condiciones
  comprobadas (✓/✗, las nuevas marcadas), aplicar con deshacer e impresión de la
  planilla propuesta en dos páginas. El modo «Periodo libre» sigue para el mes.
- **Equipo modificable con interruptores**: reglas del grupo activables o
  desactivables, cada característica de una ficha se puede apagar (el generador
  deja de tenerla en cuenta), campo «no sale nunca el primero» y catálogo
  numerado de condiciones derivado de locales y fichas.
- **Semana tipo y fichas actualizadas** a la planilla corregida del 11/09; un
  test reproduce esa semana casilla a casilla (huecos incluidos).

## v0.2.0 · 15/09/2026 — Listo para desplegar: mes de demostración, e2e, compartir por WhatsApp

- **Primer arranque con contenido**: en un servidor recién creado (y con `?demo=1`
  en local) la planilla nace con el mes en curso y el siguiente generados con la
  semana tipo y un partido de muestra el próximo sábado (`sembrarDemo` en el
  modelo, con test). Se puede vaciar desde el Generador.
- **Compartir semana** por WhatsApp: botón en Semana (y en cada local de Hoy) que
  genera una imagen PNG nítida de la planilla, general o por local, y abre la hoja
  de compartir del móvil; en escritorio la descarga.
- **Baterías e2e en el repo** (`tests/e2e-app.mjs`, `tests/e2e-servidor.mjs`,
  `tests/e2e-compartir.mjs`): las siete vistas, selector, eventos, generador,
  impresión, móvil, y el modo servidor real (acceso del programador, persistencia,
  sincronización entre pestañas, modo empleado). `npm run test:e2e`; el CI ya no
  las ignora si fallan.
- **Despliegue**: `tools/comprobar-despliegue.mjs URL` verifica desde fuera un
  despliegue (salud, volumen, acceso servido sin sesión, API cerrada, versión,
  cabeceras); `.env.example` y checklist del despliegue en `DEPLOY-SERVIDOR.md`.
- **Pasada visual**: tema oscuro en todas las vistas, móvil (Mes con los botones de
  fútbol en fila, Equipo, Horas, Generador), vista del empleado con la navegación
  de mes corregida, y las cuatro hojas imprimibles.

## v0.1.2 · 14/09/2026 — Logo del grupo, sección Entrevistas visual y acceso del programador

- Pie de la pantalla de acceso: «© 2026 Shiftia» y «coded by Highkey Labs»; el nombre
  del grupo va solo en el subtítulo con sus locales. Test en `tests/login.test.mjs`.

- **Logo del Grupo Pasarela** en SVG (`assets/pasarela-logo.svg`), hecho a imitación
  del original: cuadrado gris, rombo y «Grupo Pasarela» en caligrafía convertida a
  trazados (no depende de fuentes). El build lo embebe en la barra superior, la
  pantalla de acceso y las hojas impresas; si se sube el PNG original
  (`assets/pasarela-logo.png`) manda sobre el SVG. La barra muestra el logo en vez
  del texto cuando existe.
- **Entrevistas** más visual: cabecera con el motivo del rombo, pasos (sección
  creada → importar la base de datos → funciones), y vista previa con datos de
  muestra de candidaturas, entrevistas de la semana y decisiones.
- **Acceso del programador**: sin `PROGRAMADOR_PASSWORD`, el usuario `diego` nace con
  la contraseña provisional `12345678` y sin cambio obligatorio (la cambia desde
  Cuenta). El encargado (`admin`) sigue con la genérica y cambio obligatorio.
  Test nuevo en `tests/server.test.mjs`.

## v0.1.1 · 14/09/2026 — Sección «Entrevistas» (en construcción)

- Nueva pestaña **Entrevistas** en el panel del administrador (y en «Más» del
  móvil), visible y marcada «en construcción»: ahí se importará más adelante la
  base de datos de entrevistas y sus funciones. El empleado no la ve. Test en
  `tests/entrevistas.test.mjs`.

## v0.1.0 · 14/09/2026 — Primera entrega

Nace la app del Grupo Pasarela sobre la arquitectura y el estilo del piloto de
Shiftia (Urología), sin tocar ninguno de los dos repositorios de referencia.

- **Modelo de dominio** (`modelo.js`, tests en `modelo.test.js`): cuatro locales
  con dos franjas, casillas ordenadas (quien abre, cocina en su posición),
  partidos y dobles, mínimos por día con marca «supuesto», cocina obligatoria o
  habitual, «nunca con», «cubre a», vetos, contratos, ausencias, eventos con
  refuerzo, semana tipo del PDF (satisface todos los mínimos y las 29
  condiciones), `puedeEstar` con reglas duras y blandas forzables, revisión del
  mes, generador aditivo y determinista con razones y huecos explicados, horas
  del mes (nocturnas, domingos, festivos, extras, saldo frente a contrato,
  desglose por local), exportador e importador del núcleo Shiftia (CP-SAT),
  fusión de estados concurrentes.
- **Interfaz**: Hoy, Semana (con pie de descansos y «guardar como semana tipo»),
  Mes (píldoras por local, ausencias, fila de control, botones Juega el
  Barcelona / Madrid / Elche), Equipo (fichas con todas las condiciones
  editables, altas y bajas, ajustes de los locales), Contador de horas (horas
  extra, cierre de mes, Excel e impresión), Generador (motor local o núcleo,
  vista previa, aplicar, vaciar lo generado), revisión del mes, historial,
  deshacer, cuenta, copia de seguridad, tema claro y oscuro, PWA, móvil con
  barra inferior, modo empleado.
- **Servidor** (`server.js`, sin dependencias): SQLite, roles programador /
  admin / empleado, cuentas iniciales `admin` y `diego`, versionado optimista,
  SSE, copias diarias, proxy al núcleo (`/api/nucleo/*`) con cupo y auditoría.
  Tests de API y de seguridad en `tests/`.
- **Documentación**: README, ARQUITECTURA, DISEÑO (decisiones, supuestos y
  preguntas abiertas C1–C29), DEPLOY-SERVIDOR.
