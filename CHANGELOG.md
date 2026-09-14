# Changelog — Shiftia · Grupo Pasarela

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
