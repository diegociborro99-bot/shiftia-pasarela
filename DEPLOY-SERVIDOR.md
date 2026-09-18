# Despliegue del servidor (Railway)

Railway detecta `package.json` y arranca `npm start` (`node server.js`).
Servidor Node con SQLite, usuarios y sincronización en tiempo real. **Cero
dependencias npm** (Node ≥ 22.13 estándar; `nixpacks.toml` fija Node 22).

## Variables de entorno

| Variable | Por defecto | Para qué |
|---|---|---|
| `PORT` | `8080` | Puerto (Railway la pone sola). |
| `DATA_DIR` | `./data` (volátil) | Carpeta de la base de datos. En Railway: `/data`, con un Volume montado ahí. |
| `SESSION_SECRET` | generado y guardado en la BD | Firma de las cookies de sesión. Mejor fijarla (cadena larga aleatoria). |
| `ADMIN_PASSWORD` | genérica + cambio obligatorio | Contraseña inicial de `oficina` (la cuenta del encargado). Solo actúa al crear la BD. |
| `PROGRAMADOR_USUARIO` | `diego` | Usuario de la cuenta del programador (3–30 minúsculas/números). |
| `PROGRAMADOR_PASSWORD` | `12345678` (provisional, sin cambio obligatorio) | Contraseña inicial del programador. Solo actúa al crear la BD; después se cambia desde Cuenta. |
| `JEFE_USUARIO` | `admin` | Usuario de la cuenta del jefe (José). Mismos permisos que la oficina: todo menos Actividad. |
| `JEFE_PASSWORD` | genérica + cambio obligatorio | Contraseña inicial del jefe. A diferencia de las de arriba, la cuenta se crea aunque la base ya exista (si falta, al arrancar). |
| `PASSWORD_GENERICA` | `pasarela2026` | Contraseña genérica de las altas (la app obliga a cambiarla al primer acceso) y valor vetado como contraseña definitiva. |
| `ADMIN_RESET` / `ADMIN_RESET_USUARIO` | — / `admin` | Puerta de rescate (ojo: por defecto abre `admin`, que es la cuenta del jefe; para la oficina, `ADMIN_RESET_USUARIO=oficina`): contraseña temporal (≥ 8 caracteres) que se aplica **una vez** al arrancar a esa cuenta y revoca sus sesiones. Bórrala después de entrar. |
| `ADMIN_PROMOTE` / `ADMIN_PROMOTE_ROL` | — / `admin` | Asciende un usuario existente a `admin` o `programador` al arrancar (una vez por valor). |
| `SHIFTIA_CORE_URL` | — | URL del servicio shiftia-core (CP-SAT). Sin ella, el motor «Núcleo» de la app aparece como no configurado y todo funciona con el generador local. |
| `SHIFTIA_CORE_KEY` | — | `X-API-Key` del servicio; nunca sale del servidor. |
| `SHIFTIA_CORE_TIMEOUT_S` | `30` | Tiempo máximo de espera al núcleo (504 si se pasa). |
| `HOST_CANONICO` | — | Si se define, redirige cualquier otro host a este. |
| `TRUST_PROXY` | `1` | Proxies de confianza delante (Railway = 1). |
| `VAPID_*`, `PUSH_HOSTS` | generadas | Notificaciones push (fase 3; heredado del piloto). |

## Pasos en Railway (una vez)

1. **Volume** (imprescindible): Volumes → *Add Volume*, mount path `/data`.
   Sin volumen la base de datos se borra en cada redeploy (la app lo avisa al
   admin al entrar).
2. **Variables**: `DATA_DIR=/data`, `SESSION_SECRET=…`, `ADMIN_PASSWORD=…`,
   `PROGRAMADOR_PASSWORD=…` (y `SHIFTIA_CORE_URL` + `SHIFTIA_CORE_KEY` si el
   núcleo está desplegado).
3. Redeploy. Comprueba `https://TU-URL/api/salud` →
   `{"ok":true,"persistencia":"volumen",…}`.
4. `railway.json` declara el *healthcheck* en `/api/salud` y el reinicio ante
   fallo.

## Checklist del despliegue (15/09, 8:00)

1. Railway → New Project → Deploy from GitHub → `diegociborro99-bot/shiftia-pasarela`, rama `main`.
2. Service → Volumes → Add Volume, mount path `/data`.
3. Service → Variables (hay una plantilla en `.env.example`): `DATA_DIR=/data`,
   `SESSION_SECRET` (cadena larga aleatoria), `ADMIN_PASSWORD` (la del encargado;
   si la dejas vacía nace con `pasarela2026` y cambio obligatorio). `PROGRAMADOR_PASSWORD`
   vacía = `12345678` provisional.
4. Settings → Networking → Generate Domain (o el dominio propio; entonces
   `HOST_CANONICO=ese-dominio`).
5. Deploy. En el log tiene que salir `usuario programador «diego» creado`.
6. Desde el repo: `node tools/comprobar-despliegue.mjs https://TU-URL` → todo ✓
   (salud, `persistencia: volumen`, acceso servido sin sesión, API cerrada,
   versión igual a la del repo, cabeceras).
7. Entra como `diego` / `12345678`: al ser el servidor nuevo, la app crea la planilla
   con el mes en curso y el siguiente ya generados con la semana tipo y un partido
   de muestra el próximo sábado (todo se puede vaciar desde el Generador).
8. Pásale la URL a Highkey para la pasada e2e contra el servidor real.

## Primer arranque

- **Quién ve el contenido de las entrevistas** (18/09): va por cuenta, no por rol. De serie
  lo traen el programador y la cuenta del jefe (`admin`); la oficina y cualquier cuenta nueva
  nacen sin él y ven la lista —nombre, teléfono, puesto, valoración, motivo y fecha— pero no
  lo que hay dentro de la ficha. Se abre y se cierra desde **Cuenta → Usuarios**, y solo lo
  puede hacer quien ya lo tiene (o el programador); nadie se lo da a sí mismo. A quien no lo
  tiene, el servidor le sirve `index.html` sin la base de entrevistas dentro.

- **Programador**: usuario `diego`, contraseña `12345678` (provisional hasta que la cambie desde Cuenta → Seguridad). **Encargado (la oficina)**: usuario `oficina` con `ADMIN_PASSWORD` o, si no se definió, la genérica `pasarela2026` con cambio obligatorio al entrar.
- **Jefe**: usuario `admin` con `JEFE_PASSWORD` o la genérica `pasarela2026` con cambio obligatorio. Tiene los permisos de la oficina y no ve Actividad. Es la única cuenta que se crea también en servidores que ya existían: al arrancar, si falta, nace.
- **Renombrado del 17/09**: en un servidor que ya estaba en marcha, al arrancar el `admin` de siempre pasa a llamarse `oficina` y `joseadmin` pasa a `admin`, conservando contraseña, rol y ficha. Se hace una sola vez y queda en la auditoría.
- Entra como `oficina` (el encargado), como `admin` (el jefe) o con el usuario del programador. Si el
  servidor está vacío, la app crea la planilla de fábrica (locales, equipo,
  semana tipo del PDF) o, si ese navegador tenía una planilla local con meses,
  ofrece subirla.
- Crea los usuarios en **Cuenta → Usuarios**: rol (empleado, administrador o,
  desde la cuenta del programador, programador), persona de la planilla y
  usuario sugerido. La app muestra la contraseña inicial una sola vez; al entrar,
  la pantalla de acceso obliga a crear la propia.

## Sesiones, permisos y límites

- Cookie firmada HttpOnly (`Secure` con HTTPS, `SameSite=Lax`); «Mantener la
  sesión» 30 días, si no 12 h.
- El servidor impone los permisos: el empleado recibe solo su proyección del
  estado (`estado-servidor.js`) y no puede escribir la planilla; admin y
  programador escriben el estado completo; la auditoría (`/api/auditoria`) es
  solo del programador. No se puede borrar al último administrador ni al
  último programador.
- Límites: fallos de acceso por usuario e IP, cupo de 30 llamadas al núcleo
  cada 10 minutos, cuerpo máximo 4 MB para el núcleo.
- Instantánea diaria de la BD en `DATA_DIR/copias` (14 días) y últimas
  versiones de la planilla restaurables desde Cuenta.

## Núcleo Shiftia (opcional)

Con `SHIFTIA_CORE_URL` y `SHIFTIA_CORE_KEY`, el generador ofrece el motor
«Núcleo Shiftia (CP-SAT)»: la app construye el problema con `toProblem`
(medio día = una franja; cada local es un turno; mínimos, ausencias, libres,
partidos declarados, «nunca con» y contratos como reglas duras o blandas),
el servidor lo reenvía a `POST /solve` del servicio y la respuesta se vuelca en
la planilla con `desdeSolucion` (la cocina y quién abre se colocan después
según las reglas de cada local). `/api/nucleo/salud` dice si está configurado
y responde.
