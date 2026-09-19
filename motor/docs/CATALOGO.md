# Catálogo: qué hay en cada proyecto de Shiftia

El inventario de las tres apps de cliente (más el núcleo y el hub), qué tienen en común y
qué es de cada uno. Es el mapa del que sale el arquetipo del motor y la guía para portar
un módulo de un proyecto a otro. Estado a 19/09/2026.

## Linaje

```
shiftia-nonwatio (jun–sep 2026)      la primera app: Express + Postgres, un index.html de 1,9 MB
        │  (ideas, no código)
shiftia-urologia-pilot (sep 2026)    la arquitectura actual: src/ + build → index.html, modelo.js, server sin dependencias
        │  (copia + adaptación a mano, 14/09)
shiftia-pasarela (sep 2026)          misma pila; tres roles, generador, horas, cobertura, compartir, entrevistas
        │  (motor/ — este repositorio)
shiftia-<cliente nuevo>              generado: la misma pila, la marca, y el dominio del cliente como datos
```

Aparte: **shiftia-core** (Python, CP-SAT: «el molde» genérico de optimización, con perfiles
de cliente como JSON) y **shiftia-hub** (landing y back-office de shiftia.es, Express +
Postgres). Ninguno de los dos es una burbuja de cliente.

## Ficha de cada proyecto

| | Nonwatio | Urología · HUCSC (piloto) | Grupo Pasarela |
|---|---|---|---|
| Repositorio | `shiftia-nonwatio` (privado) | `shiftia-urologia-pilot` (privado) | `shiftia-pasarela` (público) |
| Versión · commits | 7.5.0 · 55 (08/06 → 15/09) | 2.67.0 · 50 (07/09 → 19/09) | 0.5.0 · 51 (14/09 → 18/09) |
| Sector | industria (operadores a turnos rotativos) | hospital (servicio de urología: consultas, quirófanos, guardias) | hostelería (cuatro bares, dos franjas) |
| Pila | Express, Postgres (o SQLite), JWT + bcrypt, helmet, exceljs, multer, Sentry, R2, nodemailer | `node:http` + `node:sqlite`, cero dependencias; `src/` ensamblado por `tools/build.mjs` | idéntica al piloto |
| Frontend | `public/index.html` monolítico (landing + app), 10 `<script>` | `src/app/*.js` (34 módulos) + `src/styles/*.css` (21) → `index.html` | `src/app/*.js` (27) + `src/styles/*.css` (22) → `index.html` |
| Modelo de dominio | dentro de `index.html` (`generateScheduleAI`, `canAssignShift`…) | `modelo.js` (3.000 líneas, 120 tests) | `modelo.js` (1.950 líneas, 89 tests) |
| Unidad de planificación | código de turno por persona y día (M/T/N/D/VAC/PER + MT, TN, MR, M7H, M6R, M55, TP, EM/ET/EN) en 4 grupos | 29 huecos (catálogo del Excel) en tres bloques (ordinaria, tarde, complementaria) con capacidad; guardias con salientes | casilla ordenada por local × franja (M/T): el 1.º abre, la cocina en su posición |
| Roles | admin, worker, supervisor, viewer | admin, empleado | programador, admin (encargado y jefe), empleado |
| Vistas | dashboard, schedule, workers, solicitudes, import, conflicts, autogen, vacaciones, metrics, incidents, heatmap, guardia, compensarfest | Día, Semana, Actividad, Mes, Equipo, Cobertura, Vacaciones, ficha, peticiones, importador | Hoy, Semana, Mes, Equipo, Horas, Generador, Cobertura, Actividad, Entrevistas |
| Generación automática | `generateScheduleAI` con criterios del cliente (3 en noche/día, 2 findes libres/mes enteros, ≤ 6 seguidos, descanso tras bloque N, ≤ 8 N/mes, no T→M) | reparto automático de mañanas (aditivo), completar huecos del mes, equidad anual de guardias | semana tipo + relleno con candidatos y razones; núcleo CP-SAT opcional vía servidor |
| Cobertura de ausencias | swap entre trabajadores con consentimiento del compañero | gestor de cobertura v2 (plan A/B, simulación mes a mes, criterios personales) | gestor de cobertura (plan A/B por día, intercambio en cambio de turno) |
| Importación | Excel (`/api/parse-excel`, plantilla `/api/template-excel`) | Word/Excel del cuadrante oficial de guardias (lector nativo en el navegador) | — |
| Entradas del empleado | solicitudes (cambio, vacaciones, permiso, swap), reset por código | peticiones (vacaciones, días, cambio), calendario .ics, push | peticiones (vacaciones, día libre, cambio), modo empleado |
| Tests | `tests/autogen-criterios.test.js` (extrae funciones del HTML), `tests/e2e-sync.js` | 120 del modelo + ~40 servidor/push + 30 baterías e2e + auditorías de reglas | 89 del modelo + 153 servidor/seguridad/interfaz + 8 baterías e2e |
| Despliegue | Dockerfile + `railway.toml`, healthcheck `/api/health`, copias en R2, Sentry, SMTP/Resend | Railway (`nixpacks.toml` Node 22), Volume `/data`, workflow de Pages manual | igual que el piloto + `tools/comprobar-despliegue.mjs` |
| Documentación | `AUDIT_REPORT.md` | README, ARQUITECTURA, DEMO, DEPLOY, CHANGELOG (180 KB), `docs/manual/` | README, ARQUITECTURA, DISEÑO, DEPLOY, CHANGELOG |

## El núcleo común (piloto ↔ Pasarela)

Medido con `diff` entre los dos repositorios el 19/09: lo que es **igual o casi** (menos de un
15 % de líneas distintas, y esas por nombres del cliente) es el núcleo que el motor conserva
y que un tercer arquetipo también podrá conservar.

| Pieza | Ficheros | Estado |
|---|---|---|
| Build y paridad | `tools/build.mjs`, `tools/check-parity.mjs` | iguales salvo el logo del cliente y la plantilla Word del piloto |
| Servidor | `server.js` (68 % igual), `estado-servidor.js`, `push*.js` (idénticos), `sw.js` (idéntico) | difieren en roles (2 vs 3), semilla de notas (piloto), iCal (piloto), núcleo y entrevistas (Pasarela) |
| Sincronización y sesión | `src/app/30-modo-servidor.js` (86 % igual), `33-actualizacion.js` (99 %), `32-arranque.js` | claves del navegador y textos con el nombre del cliente |
| Navegación, cuenta, historial | `31-navegacion.js` (64 %), `25-cuenta.js` (57 %), `29-avisos-e-historial.js` (81 %) | lista de vistas, textos |
| Estilos y marca | `src/styles/01-tokens.css`, `07-equipo`, `14-importador`, `17-hoy-vistazo`, `18-push`, `19-perfil` (idénticos); `03-nav`, `04-dia`, `06-mes`, `08-popover`, `09-ficha`, `12-semana`, `13-impresion`, `20-movil` (≥ 95 %) | los tokens de color, tipografía (Inter + DM Sans), sombras, chips y modo oscuro son la marca |
| Marca y PWA | `assets/shiftia-logo.svg`, `icons/`, `manifest.webmanifest`, `login.template.html` (90 %) | logo Shiftia (degradado teal→azul, dos arcos), «coded by Highkey Labs» |
| Despliegue | `nixpacks.toml`, `railway.json`, `.github/workflows/ci.yml` | idénticos |

Lo que **no** es común aunque se llame igual: las vistas (`10-vista-*`, `13-vista-semana`,
`17-vista-mes`, `19-vista-equipo`, `20-ficha-persona`, `14-impresiones`, `15-export-xlsx`)
están reescritas para cada dominio (un 90–100 % de líneas distintas), igual que `modelo.js`
y `02-estado-y-modelo-datos.js`. El concepto es el mismo (día, semana, mes, equipo,
cobertura), la implementación depende de cómo es una «casilla» en cada negocio.

## Módulos y dónde están (para portar)

### Arquetipo hostelería multilocal (Pasarela)

Los del motor (`arquetipos/hosteleria-multilocal/arquetipo.json`): hoy, semana, mes, equipo,
cobertura (núcleo); horas, generador, actividad, entrevistas (opcionales).

### Portables desde el piloto de Urología (`shiftia-urologia-pilot/src/app`)

| Módulo | Ficheros | Qué aporta |
|---|---|---|
| Importador del cuadrante oficial | `23-importar-guardias.js`, `14-importador-aptitudes.css`, modelo `parsearTablaMensual` / `aplicarTablaMensual` / `matchPersona` | leer Word/Excel/tabla pegada, vista previa con avisos, validación con motivo, deshacer |
| Peticiones del empleado y respuesta del encargado | `26-peticiones-admin.js`, servidor `/api/peticiones*` | vacaciones, días, cambio de turno con aprobación |
| Vacaciones del año | `29-vacaciones.js`, `16-vacaciones.css` | cuadro anual, `vacaciones_2026.json` de festivos |
| Calendario .ics | `29-calendario-ics.js`, servidor `/api/calendar`, modelo `generarICS` | suscripción del móvil al turno propio |
| Notificaciones push (cliente) | `30-push-cliente.js` | aviso de cambios y peticiones (el servidor push ya está en el arquetipo) |
| Equidad anual, reparto automático, completar huecos | `11-equidad-anual.js`, `12-reparto-automatico.js`, `22-completar-huecos.js`, `27-asignacion-manual.js`, `28-cargas-equipo.js` | reparto con razones y escenarios por persona/día |
| Plantilla oficial Word + manual en PDF | `plantillas/`, `docs/manual/` | documentos con la marca para el cliente |

### Ideas de Nonwatio (pila distinta: se reescriben, no se copian)

| Función | Dónde | Qué aporta |
|---|---|---|
| Autogen con criterios de convenio | `public/index.html` (`generateScheduleAI`), `tests/autogen-criterios.test.js` | noches por día, fines de semana enteros, tope de seguidos, descanso tras bloque, no T→M: reglas típicas de industria y sanidad |
| Swap con consentimiento del compañero | `/api/requests/:id/partner-consent` | cambio de turno en dos pasos |
| Restablecer contraseña por código | `/api/worker-reset-code-*` (SMTP/Resend) | autoservicio del empleado |
| Copias en R2, Sentry | `lib/r2-backup.js`, `server.js` | operación en producción con más de un cliente |
| Mapa de calor, métricas, compensación de festivos | vistas `heatmap`, `metrics`, `compensarfest` | análisis para el jefe |

## El núcleo (shiftia-core) y el hub

- **shiftia-core**: microservicio FastAPI sobre OR-Tools CP-SAT. Recibe un problema (días,
  turnos, personas, reglas duras/blandas con prioridad) y devuelve la planilla óptima. Tiene
  **perfiles de cliente como datos** (`profiles.py`, `examples/perfil_cliente_ejemplo.json`):
  turnos + reglas + citas legales. Pasarela ya lo usa desde el servidor (`/api/nucleo/*`,
  `toProblem` / `desdeSolucion`). Un manifiesto del motor y un perfil del núcleo describen
  al mismo cliente desde dos lados (la app y el optimizador); no se generan uno del otro
  todavía.
- **shiftia-hub**: landing de shiftia.es, demo, auditoría de cuadrantes, reservas de llamada,
  back-office. Es donde un cliente nuevo aparece antes de tener burbuja.
