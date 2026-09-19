# Motor de creación de Shiftia

Cuando entra un cliente nuevo, hasta ahora se copiaba a mano la app del cliente anterior y
se iba cambiando lo que tocaba: nombre, logo, cuentas, claves del navegador, semilla,
documentos, tests… (así nació Pasarela del piloto de Urología, en un día). El motor hace ese
trabajo en segundos, siempre igual, y comprueba que no queda ni rastro del cliente del que
nace: **un manifiesto (`cliente.json`) → una burbuja nueva** (un repositorio completo:
app, servidor, tests, documentación y despliegue) con el estilo, la marca y el logo de
Shiftia, y las peculiaridades del cliente como datos.

```
motor/clientes/<cliente>.json  ──►  node motor/bin/crear-cliente.mjs  ──►  ../shiftia-<slug>/
        (lo que ha contado)                (arquetipo + plantillas)          (build ✓ tests ✓ sin restos ✓)
```

## Dar de alta un cliente en cinco pasos

1. **Cuestionario** con el cliente → `motor/clientes/<slug>.json`. La guía de preguntas y
   cómo se traducen a campos está en [`docs/ONBOARDING.md`](docs/ONBOARDING.md); la
   referencia de cada campo, en [`docs/MANIFIESTO.md`](docs/MANIFIESTO.md). Con nombre,
   slug y una unidad ya nace una burbuja; el resto se puede rellenar después desde la app.
2. **Validar**: `node motor/bin/validar-cliente.mjs motor/clientes/<slug>.json` enseña lo que
   el motor entiende (unidades, personas, módulos, cuentas, supuestos) y junta todos los
   errores de una vez.
3. **Generar**: `node motor/bin/crear-cliente.mjs motor/clientes/<slug>.json --git`. Nace en
   `../shiftia-<slug>` (al lado de este repositorio), ensambla, pasa sus tests y busca restos.
   Sale con 1 si algo de eso falla, y dice qué.
4. **Repositorio y despliegue**: crear `diegociborro99-bot/shiftia-<slug>` (privado), push de
   `main`, y seguir el `DEPLOY-SERVIDOR.md` de la burbuja (Railway: Volume en `/data` y las
   variables de `.env.example`).
5. **Las peculiaridades**: lo que el cliente pide y el arquetipo no trae de serie está en el
   `DISEÑO.md` de la burbuja (P1, P2…). Se implementa allí, test a test, como siempre:
   test en rojo en `modelo.test.js` → `modelo.js` → verde.

```
npm run cliente:validar -- motor/clientes/ejemplo-cafeterias.json
npm run cliente:nuevo   -- motor/clientes/ejemplo-cafeterias.json --destino /tmp/prueba --sin-tests
npm run test:motor       # los tests del motor (genera el ejemplo de verdad)
```

## Qué contiene

```
motor/
  motor.json                     versión del motor y arquetipo por defecto
  bin/crear-cliente.mjs          el comando: manifiesto → burbuja (build, tests, restos, --git)
  bin/validar-cliente.mjs        solo validar y resumir un manifiesto
  bin/extraer-manifiesto.mjs     el camino de vuelta: de la semilla de una app existente a un manifiesto
  lib/manifiesto.mjs             validación (todos los errores juntos, en castellano) y contexto derivado
  lib/plantilla.mjs              plantillas {{…}} estrictas (un marcador que no resuelve es un error)
  lib/arquetipo.mjs              qué se copia, qué se excluye, qué se renombra
  lib/semilla.mjs                manifiesto → semilla (locales, equipo, semana tipo…) y semilla → manifiesto
  lib/generar.mjs                el pipeline
  lib/verificar.mjs              restos del cliente de origen + build + tests
  arquetipos/hosteleria-multilocal/
    arquetipo.json               la tabla: módulos, reglas, incluir/excluir, sustituciones, bloques, prohibidos
    plantillas/                  lo que se escribe nuevo: README, DISEÑO, DEPLOY, CHANGELOG, ARQUITECTURA,
                                 package.json, manifest, CI, .env.example, tests genéricos, config del cliente,
                                 base de entrevistas vacía
  clientes/                      manifiestos: el ejemplo (ficticio) y los de referencia (ver clientes/README.md)
  docs/                          CATALOGO (qué hay en cada proyecto), MANIFIESTO, ONBOARDING, EXTENDER
  test/motor.test.mjs            tests del motor; el CI los pasa en cada push
```

## Cómo funciona

El motor **no guarda una copia** de la app: transforma el arquetipo vivo (este repositorio)
en el momento de generar. Así el arquetipo y la tabla de sustituciones viven juntos y el CI
comprueba en cada push que la combinación sigue produciendo una burbuja limpia
(`npm run test:motor`). El pipeline, en `lib/generar.mjs`:

1. Carga y valida el manifiesto contra el arquetipo.
2. Copia los ficheros que entran (`incluir` menos `excluir`, salvo `conservar`), renombrando
   los que llevan el nombre del cliente de origen.
3. En los de texto: **bloques** (la semilla del cliente de origen se sustituye por la del
   manifiesto; los puestos también) y **sustituciones** en orden (identidad, cuentas, claves
   del navegador, logo, dominio, contraseña genérica y su hash, nombres de personas y de
   locales del cliente de origen que quedaban en comentarios).
4. Escribe las **plantillas** (todo lo que no tiene sentido heredar: documentación, tests
   de las reglas del cliente de origen, configuración de módulos, base de entrevistas).
5. Copia el logo, `cliente.json` y escribe `motor.lock.json` (motor, arquetipo, commit de origen).
6. Ensambla (`tools/build.mjs`), pasa `modelo.test.js`, la paridad y `tests/*.test.mjs`.
7. Busca los **tokens prohibidos** (el cliente de origen, sus locales, sus personas): con uno
   solo, la generación se da por fallida.

Lo que es **genérico** y viaja intacto: el servidor (cuentas, sesiones, roles, versionado,
SSE, auditoría, copias, proxy al núcleo), la sincronización, la navegación, la cuenta, el
historial, la PWA y las notificaciones, los estilos y la marca, las vistas (Hoy, Semana, Mes,
Equipo, Horas, Generador, Cobertura, Actividad) y el modelo de planificación (reglas con
interruptor, generador, cobertura, horas, fusión). Lo que es **del cliente** y sale del
manifiesto: identidad y marca, cuentas, unidades (con aperturas, mínimos, cocina, horarios,
quién abre), equipo (con todas sus condiciones), semana tipo, eventos con refuerzo, festivos,
reglas apagadas, módulos activos, particularidades y preguntas abiertas.

## Límites conocidos (v1)

- Un arquetipo: **hostelería multilocal** (dos franjas, mañana y tarde). Un cliente con tres
  franjas (M/T/N) o con turnos por catálogo de puestos (como el servicio de Urología) necesita
  otro arquetipo; cómo añadirlo, en [`docs/EXTENDER.md`](docs/EXTENDER.md).
- El vocabulario de la interfaz es el del arquetipo («local», «cocina», «partido», «abre»).
  Un cliente de retail lo entiende, pero no se traduce automáticamente.
- Los comentarios heredados del código que hablaban del cliente de origen se anonimizan
  mecánicamente («[persona]», «el local A»…): el porqué de cada regla sigue ahí, sin nombres.
- El motor **crea** burbujas; no las actualiza. Una burbuja en marcha evoluciona sola y las
  mejoras del arquetipo se portan módulo a módulo (`motor.lock.json` dice de qué commit nació).
- No genera baterías e2e (Playwright): se escriben con el cliente, sobre `tests/e2e-util.mjs`.
