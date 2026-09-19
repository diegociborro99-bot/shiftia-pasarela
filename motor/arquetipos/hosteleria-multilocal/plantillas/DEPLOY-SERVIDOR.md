# Despliegue del servidor (Railway)

Railway detecta `package.json` y arranca `npm start` (`node server.js`). Servidor Node con
SQLite, usuarios y sincronización en tiempo real. **Cero dependencias npm** (Node ≥ 22.13
estándar; `nixpacks.toml` fija Node 22).

## Variables de entorno

| Variable | Por defecto | Para qué |
|---|---|---|
| `PORT` | `8080` | Puerto (Railway la pone sola). |
| `DATA_DIR` | `./data` (volátil) | Carpeta de la base de datos. En Railway: `/data`, con un Volume montado ahí. |
| `SESSION_SECRET` | generado y guardado en la BD | Firma de las cookies de sesión. Mejor fijarla (cadena larga aleatoria). |
| `ADMIN_PASSWORD` | genérica + cambio obligatorio | Contraseña inicial de `{{cuentas.encargado}}` (la cuenta del encargado). Solo actúa al crear la BD. |
| `PROGRAMADOR_USUARIO` | `{{cuentas.programador}}` | Usuario de la cuenta del programador (3–30 minúsculas/números). |
| `PROGRAMADOR_PASSWORD` | `12345678` (provisional, sin cambio obligatorio) | Contraseña inicial del programador. Solo actúa al crear la BD; después se cambia desde Cuenta. |
| `JEFE_USUARIO` | `{{cuentas.jefe}}` | Usuario de la cuenta del jefe. Mismos permisos que el encargado: todo menos Actividad. |
| `JEFE_PASSWORD` | genérica + cambio obligatorio | Contraseña inicial del jefe. La cuenta se crea aunque la base ya exista (si falta, al arrancar). |
| `PASSWORD_GENERICA` | `{{cuentas.passwordGenerica}}` | Contraseña genérica de las altas (la app obliga a cambiarla al primer acceso) y valor vetado como contraseña definitiva. |
| `ADMIN_RESET` / `ADMIN_RESET_USUARIO` | — / `{{cuentas.jefe}}` | Puerta de rescate: contraseña temporal (≥ 8 caracteres) que se aplica **una vez** al arrancar a esa cuenta y revoca sus sesiones. Para el encargado, `ADMIN_RESET_USUARIO={{cuentas.encargado}}`. Bórrala después de entrar. |
| `ADMIN_PROMOTE` / `ADMIN_PROMOTE_ROL` | — / `admin` | Asciende un usuario existente a `admin` o `programador` al arrancar (una vez por valor). |
| `SHIFTIA_CORE_URL` | — | URL del servicio shiftia-core (CP-SAT). Sin ella, el motor «Núcleo» aparece como no configurado y todo funciona con el generador local. |
| `SHIFTIA_CORE_KEY` | — | `X-API-Key` del servicio; nunca sale del servidor. |
| `SHIFTIA_CORE_TIMEOUT_S` | `30` | Tiempo máximo de espera al núcleo (504 si se pasa). |
| `HOST_CANONICO` | — | Si se define, redirige cualquier otro host a este{{#si dominio}} (`{{dominio}}`){{/si}}. |
| `TRUST_PROXY` | `1` | Proxies de confianza delante (Railway = 1). |
| `VAPID_*`, `PUSH_HOSTS` | generadas | Notificaciones push. |

## Checklist del despliegue

1. Railway → New Project → Deploy from GitHub → `diegociborro99-bot/shiftia-{{slug}}`, rama `main`.
2. Service → Volumes → Add Volume, mount path `/data`. Sin volumen la base de datos se
   borra en cada redeploy (la app lo avisa al encargado al entrar).
3. Service → Variables (plantilla en `.env.example`): `DATA_DIR=/data`, `SESSION_SECRET`
   (cadena larga aleatoria), `ADMIN_PASSWORD` (la del encargado; vacía = genérica con cambio
   obligatorio), `PROGRAMADOR_PASSWORD` (vacía = `12345678` provisional). Si el núcleo está
   desplegado, `SHIFTIA_CORE_URL` + `SHIFTIA_CORE_KEY`.
4. Settings → Networking → Generate Domain{{#si dominio}} o el dominio propio `{{dominio}}` (entonces `HOST_CANONICO={{dominio}}`){{/si}}.
5. Deploy. En el log tiene que salir `usuario programador «{{cuentas.programador}}» creado`.
6. Desde el repo: `node tools/comprobar-despliegue.mjs https://TU-URL` → todo ✓ (salud,
   `persistencia: volumen`, acceso servido sin sesión, API cerrada, versión igual a la del
   repo, cabeceras). `railway.json` declara el *healthcheck* en `/api/salud`.
7. Entra como `{{cuentas.programador}}` / `12345678`: al ser el servidor nuevo, la app crea la planilla
   con la semilla del manifiesto y el mes en curso y el siguiente generados{{#si semanaTipo}} con la semana tipo{{/si}}.

## Primer arranque

- **Programador**: `{{cuentas.programador}}` / `12345678` (provisional hasta que la cambie desde
  Cuenta → Seguridad). **Encargado**: `{{cuentas.encargado}}` con `ADMIN_PASSWORD` o la genérica
  `{{cuentas.passwordGenerica}}` con cambio obligatorio al entrar. **Jefe**: `{{cuentas.jefe}}` con
  `JEFE_PASSWORD` o la genérica con cambio obligatorio.
- Crea los usuarios en **Cuenta → Usuarios**: rol (empleado, administrador o, desde la
  cuenta del programador, programador), persona de la planilla y usuario sugerido. La app
  muestra la contraseña inicial una sola vez; al entrar, la pantalla de acceso obliga a
  crear la propia.
{{#si modulos.entrevistas}}- **Entrevistas**: quién ve el contenido de las entrevistas va por cuenta, no por rol
  (Cuenta → Usuarios); de serie lo traen el programador y el jefe.
{{/si}}
## Sesiones, permisos y límites

- Cookie firmada HttpOnly (`Secure` con HTTPS, `SameSite=Lax`); «Mantener la sesión» 30 días,
  si no 12 h.
- El servidor impone los permisos: el empleado recibe solo su proyección del estado
  (`estado-servidor.js`) y no puede escribir la planilla; encargado y programador escriben el
  estado completo; la auditoría (`/api/auditoria`) es solo del programador. No se puede
  borrar al último administrador ni al último programador.
- Límites: fallos de acceso por usuario e IP, cupo de llamadas al núcleo, cuerpo máximo 4 MB
  para el núcleo.
- Instantánea diaria de la BD en `DATA_DIR/copias` (14 días) y últimas versiones de la
  planilla restaurables desde Cuenta.

## Núcleo Shiftia (opcional)

Con `SHIFTIA_CORE_URL` y `SHIFTIA_CORE_KEY`, el generador ofrece el motor «Núcleo Shiftia
(CP-SAT)»: la app construye el problema con `toProblem`, el servidor lo reenvía a
`POST /solve` del servicio y la respuesta se vuelca en la planilla con `desdeSolucion`.
`/api/nucleo/salud` dice si está configurado y responde.
