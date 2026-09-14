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
  abre, «nunca con», «cubre a», vetos, contrato, ausencias, notas) y los ajustes
  de cada local (aperturas, mínimos, cocina, horarios, quién abre).
- **Contador de horas**: horas del mes por persona a partir de la planilla y de
  los ajustes del encargado (horas extra, horario distinto), con nocturnas,
  domingos y festivos, saldo frente a contrato, desglose por local, Excel,
  impresión y **cierre de mes** para la nómina.
- **Generador de planillas**: semana tipo + coberturas «cubre a» + relleno de
  mínimos con razón por plaza, vista previa antes de aplicar, huecos explicados
  (por qué nadie puede y candidatos con aviso a un clic), deshacer. Motor local
  determinista o **núcleo Shiftia (CP-SAT)** vía el servidor cuando está
  configurado.
- **Entrevistas**: sección del administrador reservada para la base de datos de
  entrevistas y sus funciones (por importar); de momento visible y «en construcción».
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

Sin servidor, `index.html` funciona solo (los datos viven en el navegador;
contraseña inicial del modo local: `pasarela2026`). Con `?demo=1` el mes en
curso y el siguiente se generan con la semana tipo. En un servidor recién
creado la primera planilla nace igual de generada. Despliegue:
`DEPLOY-SERVIDOR.md`; comprobación desde fuera: `node tools/comprobar-despliegue.mjs URL`.

## Acceso

- **Programador** (Diego): usuario `diego`, contraseña provisional `12345678`
  (se cambia desde Cuenta; o define `PROGRAMADOR_PASSWORD` antes del primer arranque).
- **Encargado**: usuario `admin`, contraseña `ADMIN_PASSWORD` o la genérica
  `pasarela2026` con cambio obligatorio al entrar.
- Sin servidor (abrir `index.html` a pelo): usuario `admin`, contraseña `pasarela2026`.

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
