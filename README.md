# Shiftia · Grupo Pasarela

Aplicación de planificación de turnos de los cuatro locales del Grupo
Pasarela (El 33, Zapatillera, Bar Mónaco y Pasarela), construida sobre la
arquitectura y el estilo del piloto de Shiftia (Urología · HUCSC) y con el
modelo de dominio del grupo: dos franjas por local y día, casillas ordenadas
(quien abre va el primero, la cocina en su posición), partidos, dobles,
«nunca con», «cubre a», mínimos por día y refuerzos cuando hay fútbol.

Todo el conocimiento del PDF del grupo (20 personas en activo, 2 de baja,
29 condiciones personales, mínimos por local y día, quién abre y quién lleva
la cocina) viene precargado **como datos editables** desde la propia app.
Lo que el grupo no ha confirmado se marca «supuesto».

## Qué hace

- **Hoy**: las cuatro casillas de la mañana y las cuatro de la tarde del día,
  ordenadas, con quién abre, cocina, refuerzo, forzados y turnos cortos.
  Asignar con el selector (puede / con aviso / no puede, con «forzar» y motivo),
  reordenar, marcar cocina o quién abre, horario distinto en una casilla.
- **Semana**: el cuadrante que el grupo conoce (ocho filas local × franja por
  siete días) con el pie de descansos y ausencias, editable, imprimible,
  exportable a Excel y **compartible por WhatsApp** como imagen (general o por local). «Guardar como semana tipo» convierte la semana en la base
  del generador.
- **Mes**: personas × días con una píldora por día (M, T, P o doble, en el color
  del local), ausencias, fila de control por local y los botones
  **Juega el Barcelona / Madrid / Elche** (refuerzo por local; el generador
  propone quién viene).
- **Equipo**: ficha de cada persona con todas sus condiciones editables
  (locales, franjas, días que libra, partidos, cocina titular o reserva, quién
  abre, «nunca con», «cubre a», vetos, «no sale nunca el primero», contrato,
  ausencias, notas), cada una **activable o desactivable** por el administrador,
  las reglas del grupo con interruptor, el catálogo numerado de condiciones que
  comprueba el generador, y los ajustes de cada local (aperturas, mínimos,
  cocina, horarios, quién abre).
- **Contador de horas**: horas del mes por persona a partir de la planilla y de
  los ajustes del encargado (horas extra, horario distinto), con los horarios del
  grupo (mañana 07:00–16:00, fines de semana desde las 08:00; tarde 16:00 hasta el
  cierre) y el turno partido contado por tramos, con nocturnas,
  domingos y festivos, saldo frente a contrato, desglose por local, Excel,
  impresión y **cierre de mes** para la nómina.
- **Generador semanal**: la planilla de la semana con las condiciones del cliente
  (semana tipo + fichas + ajustes de cada local): posiciones numeradas (1.º abre y
  hace turno completo, ◆ cocina en su posición, P partido, C continuo, □ sin local fijo),
  huecos disponibles con motivo cuando nadie puede ocupar una posición, qué ha
  cambiado, quién libra cada día y las condiciones comprobadas; vista previa,
  aplicar con deshacer e impresión de la planilla propuesta. Modo «Periodo libre»
  para el mes, con motor local o **núcleo Shiftia (CP-SAT)** vía el servidor.
- **Gestor de cobertura**: desde la planilla (Semana, Hoy o Mes), sobre la persona
  que va a faltar, «Falta estos días…»: se marcan los días en una tira que enseña
  sus turnos, qué le pasa (baja, vacaciones, día libre, permiso, otro motivo o
  cambio de turno), y la app propone el **plan A** y el **plan B** día a día:
  quién sale → quién entra (o el hueco y por qué nadie puede); confirmar registra
  la ausencia, retira a la persona y pone a quien cubre con «por X», con deshacer.
  En un cambio de turno propone también el intercambio.
- **Visible para el equipo**: cada mes se hace visible a los trabajadores cuando
  la planilla está lista (el mes en curso siempre lo ven).
- **Vaciar la semana o el mes** (en Semana y Mes) respetando bajas, vacaciones y
  demás ausencias; el aviso de un partido se quita desde su chip.
- **Entrevistas**: sección del administrador reservada para la base de datos de
  entrevistas y sus funciones (por importar); de momento visible y «en construcción».
- **Actividad** (solo el programador): qué está haciendo el encargado con la app,
  como un historial. Una sola línea de tiempo por días con los cambios de la
  planilla (quién y qué) y la auditoría del servidor traducida (inicios de sesión,
  accesos fallidos, guardados con su versión, altas y bajas de usuarios,
  peticiones…), con la IP; tarjetas resumen (último acceso del encargado, último
  guardado, cambios de hoy y de la semana, accesos fallidos), filtros por usuario
  y por tipo, buscador y aviso si el encargado aún no ha entrado. El encargado y
  los empleados no la ven.
- **Revisar el mes**, historial de cambios, deshacer (Ctrl+Z), tema claro y
  oscuro, PWA instalable, móvil con barra inferior.

## Desarrollo

- `modelo.js` — toda la lógica de negocio, JS puro sin DOM. `index.html` lo
  embebe entre `/*MODELO_START*/…/*MODELO_END*/`.
- `modelo.test.js` — tests del modelo (`node modelo.test.js`); cada regla nació
  como test en rojo.
- `src/` — módulos de la app y estilos; `tools/build.mjs` los ensambla en
  `index.html` y `login.html` (ver `ARQUITECTURA.md`).
- `server.js` — Node ≥ 22.13 sin dependencias: SQLite, usuarios con roles
  (programador, admin, empleado), versionado de la planilla, SSE, proxy al
  núcleo. Tests en `tests/`.
- `npm run build` · `npm test` · `npm run test:e2e` (Playwright, se salta sin Chromium) · `npm start`.
  `SHIFTIA_CORE_REAL=http://… node tests/e2e-nucleo-real.mjs` prueba el motor Núcleo contra un servicio
  shiftia-core de verdad (sin la variable, se salta).

Sin servidor, `index.html` funciona solo (los datos viven en el navegador;
contraseña inicial del modo local: `pasarela2026`). Con `?demo=1` el mes en
curso y el siguiente se generan con la semana tipo. En un servidor recién
creado la primera planilla nace igual de generada. Despliegue:
`DEPLOY-SERVIDOR.md`; comprobación desde fuera: `node tools/comprobar-despliegue.mjs URL`.

## Acceso

- **Programador** (Diego): usuario `diego`, contraseña provisional `12345678`
  (se cambia desde Cuenta; o define `PROGRAMADOR_PASSWORD` antes del primer arranque).
- **Oficina** (Aroa): usuario `oficina`, contraseña `ADMIN_PASSWORD` o la genérica
  `pasarela2026` con cambio obligatorio al entrar.
- **Jefe** (José): usuario `admin`, contraseña `JEFE_PASSWORD` o la genérica
  `pasarela2026` con cambio obligatorio. Los mismos permisos que la oficina:
  ve y toca todo menos **Actividad**, que es solo del programador. Si falta, el
  servidor la crea al arrancar (no hace falta empezar de cero).
- Las dos cuentas se **gestionan entre ellas** desde Cuenta → usuarios: el selector
  de permisos de cada fila sube a administrador o baja a empleado (al bajar pide su
  ficha de la planilla). Nadie puede cambiarse el suyo ni dejar el grupo sin
  administrador, y las cuentas de programador solo las toca el programador.
- Los servidores anteriores al 17/09 se renombran solos al arrancar: el `admin` de
  siempre pasa a `oficina` y `joseadmin` a `admin`, con su misma contraseña.
- Sin servidor (abrir `index.html` a pelo): usuario `admin`, contraseña `pasarela2026`. Es el acceso de ese dispositivo, sin relación con las cuentas del servidor.

## Logo del grupo

`assets/pasarela-logo.svg` imita el logo original (cuadrado gris, rombo y
«Grupo Pasarela» caligráfico). Cuando se suba el original como
`assets/pasarela-logo.png`, el build lo usará en su lugar: basta con subir el
fichero y ejecutar `npm run build`.

## Documentos

- `DISEÑO.md` — decisiones tomadas, supuestos y preguntas abiertas para el grupo.
- `ARQUITECTURA.md` — estructura del código y flujo de trabajo.
- `DEPLOY-SERVIDOR.md` — Railway, variables, usuarios y núcleo.
- `CHANGELOG.md`.

Coded by Highkey Labs.
