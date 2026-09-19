# Shiftia · {{nombre}}

Aplicación de planificación de turnos de **{{nombre}}** ({{unidadesTexto}}), creada con el
**motor de creación de Shiftia** sobre el arquetipo «{{motor.arquetipoNombre}}»: la misma
arquitectura, el mismo estilo y la misma marca que el resto de burbujas de Shiftia, con el
modelo de dominio del cliente precargado **como datos editables** desde la propia app.

Lo que el cliente ha contado está en `cliente.json` (el manifiesto del que nace este
repositorio) y en `DISEÑO.md` (decisiones, supuestos y preguntas abiertas). Lo que aún
no ha confirmado se marca «supuesto» en la app.

## Qué hace

- **Hoy**: las casillas de la mañana y de la tarde de cada local, ordenadas: quién abre,
  cocina, refuerzo, forzados y turnos cortos. Asignar con el selector (puede / con aviso /
  no puede, con «forzar» y motivo), reordenar, marcar cocina o quién abre.
- **Semana**: el cuadrante local × franja × día con el pie de descansos y ausencias,
  editable, imprimible, exportable a Excel y compartible como imagen. «Fijar como semana
  tipo» convierte la semana en la base del generador.
- **Mes**: personas × días con una píldora por día (M, T, P o doble), ausencias, fila de
  control y eventos con refuerzo.
- **Equipo**: ficha de cada persona con todas sus condiciones editables y activables
  (locales, franjas, días que libra, partidos, cocina, quién abre, «nunca con», «cubre a»,
  vetos, contrato, ausencias, notas), las reglas del cliente con interruptor, el catálogo
  numerado de condiciones que comprueba el generador y los ajustes de cada local
  (aperturas, mínimos, cocina, horarios, quién abre).
{{#si modulos.horas}}- **Contador de horas**: horas del mes por persona a partir de la planilla y de los ajustes
  del encargado, con nocturnas, domingos y festivos, saldo frente a contrato, desglose por
  local, Excel, impresión y cierre de mes para la nómina.
{{/si}}{{#si modulos.generador}}- **Generador**: la planilla de la semana o del mes con las condiciones del cliente
  (semana tipo + fichas + ajustes): posiciones numeradas, huecos con motivo, qué ha
  cambiado, quién libra y las condiciones comprobadas; vista previa, aplicar con
  deshacer. Motor local o **núcleo Shiftia (CP-SAT)** vía el servidor.
{{/si}}- **Gestor de cobertura**: sobre la persona que va a faltar, «Falta estos días…»: la app
  propone el **plan A** y el **plan B** día a día (quién sale → quién entra, o el hueco y
  por qué nadie puede); confirmar registra la ausencia y coloca a quien cubre, con deshacer.
- **Visible para el equipo**: cada mes se hace visible a los trabajadores cuando está listo.
{{#si modulos.actividad}}- **Actividad** (solo el programador): qué hace el encargado con la app, con la auditoría
  del servidor traducida.
{{/si}}{{#si modulos.entrevistas}}- **Entrevistas**: base de candidatos y lista de alerta, con permiso por cuenta.
{{/si}}- **Revisar el mes**, historial de cambios, deshacer (Ctrl+Z), tema claro y oscuro, PWA
  instalable, móvil con barra inferior y **modo empleado** (cada persona ve solo lo suyo).

## Desarrollo

- `modelo.js` — toda la lógica de negocio, JS puro sin DOM. `index.html` lo embebe entre
  `/*MODELO_START*/…/*MODELO_END*/`. La semilla del cliente es el bloque `SEMILLA_CLIENTE`.
- `modelo.test.js` — tests del modelo (`node modelo.test.js`): los genéricos del motor y,
  a partir de aquí, cada regla propia del cliente (test en rojo → implementación → verde).
- `src/` — módulos de la app y estilos; `tools/build.mjs` los ensambla en `index.html` y
  `login.html` (ver `ARQUITECTURA.md`). `src/app/01-config-cliente.js` lleva los módulos
  activos.
- `server.js` — Node ≥ 22.13 sin dependencias: SQLite, usuarios con roles (programador,
  encargado, empleado), versionado de la planilla, SSE, proxy al núcleo. Tests en `tests/`.
- `npm run build` · `npm test` · `npm run test:e2e` (Playwright, se salta sin Chromium) · `npm start`.

Sin servidor, `index.html` funciona solo (los datos viven en el navegador). Con `?demo=1`
el mes en curso y el siguiente se generan con la semana tipo. Despliegue: `DEPLOY-SERVIDOR.md`;
comprobación desde fuera: `node tools/comprobar-despliegue.mjs URL`.

## Acceso

- **Programador**: usuario `{{cuentas.programador}}`, contraseña provisional `12345678` (se cambia desde
  Cuenta; o define `PROGRAMADOR_PASSWORD` antes del primer arranque).
- **Encargado**: usuario `{{cuentas.encargado}}`, contraseña `ADMIN_PASSWORD` o la genérica
  `{{cuentas.passwordGenerica}}` con cambio obligatorio al entrar.
- **Jefe**: usuario `{{cuentas.jefe}}`, contraseña `JEFE_PASSWORD` o la genérica con cambio
  obligatorio. Los mismos permisos que el encargado: ve y toca todo menos Actividad.
- Las cuentas se gestionan desde Cuenta → usuarios. Nadie puede cambiarse el rol a sí mismo
  ni dejar la app sin encargado; las cuentas de programador solo las toca el programador.
- Sin servidor (abrir `index.html` a pelo): usuario `admin`, contraseña `{{cuentas.passwordGenerica}}`.

## Logo

{{#si marca.logo}}`{{marca.logoFichero}}` es el logo del cliente; el build lo embebe en la barra superior, la
pantalla de acceso y las hojas impresas. Para cambiarlo, sustituye el fichero y ejecuta
`npm run build`.{{/si}}{{#no marca.logo}}Aún no hay logo del cliente: la barra superior y la pantalla de acceso enseñan su nombre
en texto. Cuando llegue, súbelo como `assets/{{slug}}-logo.png` (o `.svg`) y ejecuta
`npm run build`: el PNG manda sobre el SVG.{{/no}}

## Documentos

- `cliente.json` — el manifiesto: identidad, cuentas, unidades, equipo, semana tipo, módulos y particularidades.
- `motor.lock.json` — trazabilidad: versión del motor, arquetipo y commit de origen.
- `DISEÑO.md` — decisiones tomadas, supuestos y preguntas abiertas para el cliente.
- `ARQUITECTURA.md` — estructura del código y flujo de trabajo.
- `DEPLOY-SERVIDOR.md` — Railway, variables, usuarios y núcleo.
- `CHANGELOG.md`.

Coded by Highkey Labs.
