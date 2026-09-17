#!/usr/bin/env node
// Shiftia · Grupo Pasarela — servidor de producción (fase servidor).
// Cero dependencias: node:http + node:crypto + node:sqlite (Node >= 22.13).
//
// 14/09: nace del servidor del piloto (Shiftia Management Urología) adaptado al
// grupo de cuatro bares. Cambian los roles (programador/admin/empleado), la forma
// de la planilla (casillas ordenadas de personas por local y franja), desaparecen
// las notas de fábrica y el calendario iCal (fase 3), y aparece la pasarela al
// núcleo de optimización (shiftia-core, CP-SAT).
//
// Qué hace:
//  - Sirve la app (solo una lista blanca de ficheros: nunca los documentos
//    del cliente ni nada del repo que no esté en esa lista).
//  - Usuarios con contraseña (scrypt) y sesión firmada en cookie HttpOnly.
//  - Estado de la planilla en SQLite con versionado optimista (PUT con
//    baseVersion → 409 si otro escribió antes).
//  - El encargado (admin) y el programador escriben el estado completo; el
//    empleado solo puede crear peticiones propias, ocultar avisos y cambiar su
//    contraseña (los permisos se imponen AQUÍ, no en el cliente).
//  - /api/eventos: SSE para que todos los dispositivos repinten al momento.
//  - /api/nucleo/*: pasarela con sesión al servicio de optimización.

const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const M = require('./modelo.js');   // estado de cada mes, meses visibles, avisos
const { pushServidor } = require('./push-servidor.js');
const { estadoParaEmpleado } = require('./estado-servidor.js');   // el empleado nunca recibe datos de terceros
// 14/09: sin semilla-notas.js (las notas del Word eran del piloto) y sin iCal:
// el calendario personal suscribible llega en la fase 3, con generarICS en el modelo.
const APP_VER = (() => { try { return require('./package.json').version; } catch (e) { return '0'; } })();
// Huella del bundle que este servidor está sirviendo AHORA. Se lee del propio
// index.html (el build la deja en <meta name="shiftia-build">), así que no puede
// desalinearse con lo desplegado. Es lo que la app compara para saber si está vieja.
const APP_BUILD = (() => {
  try {
    const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    return (html.match(/name="shiftia-build" content="([^"]+)"/) || [])[1] || APP_VER;
  } catch (e) { return APP_VER; }
})();

const PORT = +(process.env.PORT || 8080);
const RAIZ = __dirname;
const DATA_DIR = process.env.DATA_DIR || path.join(RAIZ, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
// 'volumen' solo si DATA_DIR está de verdad en un sistema de ficheros distinto
// al del contenedor (o Railway declara ahí su volumen); si no, 'sin-montar'
function detectarPersistencia() {
  if (!process.env.DATA_DIR) return 'volatil';
  try {
    if (process.env.RAILWAY_VOLUME_MOUNT_PATH && path.resolve(process.env.RAILWAY_VOLUME_MOUNT_PATH) === path.resolve(DATA_DIR)) return 'volumen';
    return fs.statSync(DATA_DIR).dev !== fs.statSync(path.parse(RAIZ).root).dev ? 'volumen' : 'sin-montar';
  } catch (e) { return 'sin-montar'; }
}
const PERSISTENCIA = detectarPersistencia();

// 14/09: tres roles. `programador` (Diego) puede todo lo del encargado y además
// auditoría, cuentas de cualquier rol y el núcleo; `admin` es el encargado del
// grupo; `empleado` solo lee su planilla proyectada y pide.
const ROLES = ['programador', 'admin', 'empleado'];
const db = new DatabaseSync(path.join(DATA_DIR, 'shiftia.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS users(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT UNIQUE NOT NULL,
    hash TEXT NOT NULL, salt TEXT NOT NULL,
    rol TEXT NOT NULL CHECK(rol IN ('programador','admin','empleado')),
    pid TEXT, creado INTEGER NOT NULL,
    cambiar INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS estado(
    id INTEGER PRIMARY KEY CHECK(id=1),
    version INTEGER NOT NULL, json TEXT NOT NULL, actualizado INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS meta(k TEXT PRIMARY KEY, v TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS estado_hist(version INTEGER PRIMARY KEY, json TEXT NOT NULL, actualizado INTEGER NOT NULL, usuario TEXT);
  CREATE TABLE IF NOT EXISTS auditoria(id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, uid INTEGER, usuario TEXT, ip TEXT, accion TEXT NOT NULL, detalle TEXT);
`);
// (la tabla ical_tokens del piloto llega en la fase 3, con el calendario personal)
const HIST_MAX = 60;   // versiones anteriores de la planilla que se conservan en el servidor
// registro de escrituras (append-only, nunca expuesto a empleados ni al encargado) + una línea en el log
function auditar(quien, ip, accion, detalle) {
  try { db.prepare('INSERT INTO auditoria(ts,uid,usuario,ip,accion,detalle) VALUES (?,?,?,?,?,?)').run(Date.now(), quien ? quien.id : null, quien ? quien.usuario : null, ip || null, accion, detalle ? String(detalle).slice(0, 300) : null); } catch (e) {}
  console.log(`[shiftia] ${accion} · ${quien ? quien.usuario : '-'} · ${ip || '-'}${detalle ? ' · ' + String(detalle).slice(0, 120) : ''}`);
}
// instantánea diaria de la base de datos en DATA_DIR/copias (14 días)
function copiaDiaria() {
  try {
    const dir = path.join(DATA_DIR, 'copias'); fs.mkdirSync(dir, { recursive: true });
    const hoy = new Date().toISOString().slice(0, 10);
    const destino = path.join(dir, `shiftia-${hoy}.db`);
    if (!fs.existsSync(destino)) { db.exec(`VACUUM INTO '${destino.replace(/'/g, "''")}'`); console.log(`[shiftia] copia diaria: ${destino}`); }
    for (const f of fs.readdirSync(dir).filter(x => /^shiftia-\d{4}-\d{2}-\d{2}\.db$/.test(x)).sort().slice(0, -14)) fs.unlinkSync(path.join(dir, f));
  } catch (e) { console.error('[shiftia] copia diaria fallida:', e.message); }
}

// ---------- secreto de sesión (persistido; SESSION_SECRET lo sobreescribe) ----------
function secreto() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const fila = db.prepare('SELECT v FROM meta WHERE k=?').get('secret');
  if (fila) return fila.v;
  const s = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO meta(k,v) VALUES (?,?)').run('secret', s);
  return s;
}
const SECRETO = secreto();
const firmaRescate = txt => crypto.createHmac('sha256', SECRETO).update(txt).digest('hex');
try { db.exec('ALTER TABLE users ADD COLUMN cambiar INTEGER NOT NULL DEFAULT 0'); } catch (e) {}
try { db.exec('ALTER TABLE users ADD COLUMN gen INTEGER NOT NULL DEFAULT 0'); } catch (e) {}   // generación de sesión: subirla revoca todas las cookies
// contraseña genérica de alta: todos los usuarios nuevos la comparten hasta
// que cada uno la cambie desde su Cuenta (la app se lo pide al entrar)
const PASS_GENERICA = process.env.PASSWORD_GENERICA || 'pasarela2026';
const PASS_PROGRAMADOR = '12345678';   // provisional del programador hasta que la cambie (14/09)
const TRUST_PROXY = +(process.env.TRUST_PROXY || 1); // Railway/Cloudflare = 1 proxy delante
// notificaciones push (claves VAPID por entorno o generadas y guardadas en meta)
const PUSH = pushServidor(db, { publica: process.env.VAPID_PUBLIC, privada: process.env.VAPID_PRIVATE, contacto: process.env.VAPID_CONTACTO });
function ipCliente(req) {
  // la IP real es la que añade el proxy de confianza al final de XFF; nunca el
  // primer valor (arbitrario y falsificable por el cliente)
  const xff = (req.headers['x-forwarded-for'] || '').split(',').map(s => s.trim()).filter(Boolean);
  if (TRUST_PROXY > 0 && xff.length) return xff[Math.max(0, xff.length - TRUST_PROXY)];
  return req.socket.remoteAddress || '?';
}

// ---------- contraseñas ----------
const hashPass = (pass, salt) => crypto.scryptSync(String(pass), salt, 32).toString('hex');
const hashPassAsync = (pass, salt) => new Promise((res, rej) => crypto.scrypt(String(pass), salt, 32, (e, k) => e ? rej(e) : res(k.toString('hex'))));
function nuevaPassword() {
  // legible, sin ambiguos, 10 caracteres
  const abc = 'abcdefghjkmnpqrstuvwxyz23456789';
  return Array.from(crypto.randomBytes(10)).map(b => abc[b % abc.length]).join('');
}
const USUARIO_RE = /^[a-z0-9ñ._-]{3,30}$/;
function crearUsuario(usuario, pass, rol, pid, cambiar) {
  const salt = crypto.randomBytes(16).toString('hex');
  db.prepare('INSERT INTO users(usuario,hash,salt,rol,pid,creado,cambiar) VALUES (?,?,?,?,?,?,?)')
    .run(usuario.toLowerCase().trim(), hashPass(pass, salt), salt, rol, pid || null, Date.now(), cambiar ? 1 : 0);
}
if (!db.prepare('SELECT COUNT(*) c FROM users').get().c) {
  const passAdmin = process.env.ADMIN_PASSWORD || PASS_GENERICA;
  // sin ADMIN_PASSWORD el encargado entra con la genérica y la app le OBLIGA a cambiarla
  crearUsuario('admin', passAdmin, 'admin', null, !process.env.ADMIN_PASSWORD);
  console.log(process.env.ADMIN_PASSWORD
    ? '[shiftia] usuario admin creado con ADMIN_PASSWORD'
    : '[shiftia] AVISO: admin creado con la contraseña genérica — la app pedirá cambiarla al primer acceso; mejor define ADMIN_PASSWORD');
  // 14/09: el programador tiene cuenta propia desde el primer arranque (no comparte
  // la del encargado): PROGRAMADOR_USUARIO (por defecto «diego») y PROGRAMADOR_PASSWORD
  const usuProg = String(process.env.PROGRAMADOR_USUARIO || 'diego').toLowerCase().trim();
  if (usuProg === 'admin' || !USUARIO_RE.test(usuProg)) {
    console.error(`[shiftia] PROGRAMADOR_USUARIO «${usuProg}» no vale (3-30 minúsculas/números, distinto de admin): no se crea la cuenta del programador`);
  } else {
    // sin PROGRAMADOR_PASSWORD nace con la provisional 12345678 (petición de Diego,
    // 14/09) y sin cambio obligatorio: la cambia él desde Cuenta cuando quiera.
    crearUsuario(usuProg, process.env.PROGRAMADOR_PASSWORD || PASS_PROGRAMADOR, 'programador', null, false);
    console.log(process.env.PROGRAMADOR_PASSWORD
      ? `[shiftia] usuario programador «${usuProg}» creado con PROGRAMADOR_PASSWORD`
      : `[shiftia] AVISO: programador «${usuProg}» creado con la contraseña provisional ${PASS_PROGRAMADOR} — cámbiala desde Cuenta o define PROGRAMADOR_PASSWORD`);
  }
}

// ---------- la cuenta del jefe: «joseadmin» (17/09) ----------
// José entra con su propia cuenta, con los mismos permisos que el encargado: ve y toca
// todo menos Actividad, que es del programador. Se crea aunque la base ya tenga usuarios,
// porque el bloque de arriba solo corre en el primer arranque.
function asegurarJose() {
  const usu = String(process.env.JOSE_USUARIO || 'joseadmin').toLowerCase().trim();
  if (!USUARIO_RE.test(usu)) { console.error(`[shiftia] JOSE_USUARIO «${usu}» no vale: no se crea la cuenta del jefe`); return; }
  if (db.prepare('SELECT 1 FROM users WHERE usuario = ?').get(usu)) return;
  const pass = process.env.JOSE_PASSWORD || PASS_GENERICA;
  crearUsuario(usu, pass, 'admin', null, !process.env.JOSE_PASSWORD);
  console.log(process.env.JOSE_PASSWORD
    ? `[shiftia] usuario «${usu}» (jefe, permisos de encargado) creado con JOSE_PASSWORD`
    : `[shiftia] usuario «${usu}» (jefe, permisos de encargado) creado con la contraseña genérica — la app le pedirá cambiarla al entrar`);
}
asegurarJose();

// ---------- puerta de rescate: ADMIN_RESET ----------
// ADMIN_PASSWORD solo actúa la primera vez (tabla de usuarios vacía), así que si el
// encargado pierde su contraseña se queda fuera y /api/usuarios/reset no le sirve
// porque exige sesión de admin. Esta es la única forma de volver a entrar en una
// plataforma donde no hay consola: se define ADMIN_RESET en las variables del
// servicio y al arrancar se aplica UNA vez.
//   · deja `cambiar` puesto: al entrar, la app obliga a crear una personal, así que
//     el valor de la variable no es una contraseña duradera
//   · sube `gen`: cualquier sesión abierta de esa cuenta queda revocada
//   · deja marca en meta: la MISMA variable no vuelve a aplicarse en cada reinicio,
//     así que olvidarse de borrarla no reabre la puerta
if (process.env.ADMIN_RESET) {
  const nueva = String(process.env.ADMIN_RESET);
  const quien = String(process.env.ADMIN_RESET_USUARIO || 'admin').toLowerCase().trim();
  const marca = firmaRescate(quien + '|' + nueva);
  const previa = db.prepare('SELECT v FROM meta WHERE k=?').get('admin_reset');
  if (nueva.length < 8 || nueva === PASS_GENERICA) {
    console.error('[shiftia] ADMIN_RESET ignorado: necesita 8 caracteres o más y no puede ser la genérica');
  } else if (previa && previa.v === marca) {
    console.log('[shiftia] ADMIN_RESET ya aplicado con este valor: no se repite (puedes borrar la variable)');
  } else {
    const u = db.prepare('SELECT id,usuario,rol FROM users WHERE usuario=?').get(quien);
    if (!u) {
      const admins = db.prepare("SELECT usuario FROM users WHERE rol IN ('admin','programador') ORDER BY id").all().map(x => x.usuario);
      console.error(`[shiftia] ADMIN_RESET: no existe el usuario «${quien}». Administradores: ${admins.join(', ') || '(ninguno)'} — usa ADMIN_RESET_USUARIO`);
    } else {
      const salt = crypto.randomBytes(16).toString('hex');
      db.prepare('UPDATE users SET hash=?, salt=?, cambiar=1, gen=gen+1 WHERE id=?').run(hashPass(nueva, salt), salt, u.id);
      db.prepare('INSERT INTO meta(k,v) VALUES (?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v').run('admin_reset', marca);
      auditar(null, null, 'admin-reset', `${u.usuario} (ADMIN_RESET, sesiones revocadas)`);
      console.log(`[shiftia] ADMIN_RESET aplicado a «${u.usuario}»: entra con esa contraseña y la app te pedirá crear la tuya. Sesiones anteriores revocadas. BORRA la variable cuando hayas entrado.`);
    }
  }
}

// ---------- ascenso: ADMIN_PROMOTE (+ ADMIN_PROMOTE_ROL) ----------
// No hay endpoint para cambiar el rol de un usuario ya creado (POST /api/usuarios
// solo da de alta), así que un trabajador que además debe llevar el grupo —caso
// «encargado + trabajador»— se asciende con esta variable, que al arrancar aplica
// UNA vez el rol al usuario indicado CONSERVANDO su `pid` (sigue vinculado a su
// ficha de la planilla: su jornada personal, sus peticiones, etc.).
//   · 14/09: ADMIN_PROMOTE_ROL elige a qué se asciende: «admin» (por defecto) o
//     «programador». Nunca degrada: quien ya tiene ese rol o uno superior se queda.
//   · NO toca la contraseña ni la generación de sesión: el rol se lee de la BD en
//     cada petición, así que el cambio surte efecto en la próxima carga sin re-login
//   · deja marca en meta: la MISMA variable no vuelve a aplicarse en cada reinicio,
//     así que olvidarse de borrarla no reabre nada
const RANGO = { empleado: 0, admin: 1, programador: 2 };
if (process.env.ADMIN_PROMOTE) {
  const quien = String(process.env.ADMIN_PROMOTE).toLowerCase().trim();
  const rolNuevo = String(process.env.ADMIN_PROMOTE_ROL || 'admin').toLowerCase().trim() === 'programador' ? 'programador' : 'admin';
  const marca = firmaRescate('promote|' + quien + '|' + rolNuevo);
  const previa = db.prepare('SELECT v FROM meta WHERE k=?').get('admin_promote');
  if (previa && previa.v === marca) {
    console.log(`[shiftia] ADMIN_PROMOTE ya aplicado a «${quien}» (${rolNuevo}): no se repite (puedes borrar la variable)`);
  } else {
    const u = db.prepare('SELECT id,usuario,rol,pid FROM users WHERE usuario=?').get(quien);
    if (!u) {
      const gente = db.prepare('SELECT usuario FROM users ORDER BY usuario').all().map(x => x.usuario);
      console.error(`[shiftia] ADMIN_PROMOTE: no existe el usuario «${quien}». Usuarios: ${gente.join(', ') || '(ninguno)'}`);
    } else if (RANGO[u.rol] >= RANGO[rolNuevo]) {
      db.prepare('INSERT INTO meta(k,v) VALUES (?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v').run('admin_promote', marca);
      console.log(`[shiftia] ADMIN_PROMOTE: «${u.usuario}» ya es ${u.rol} — nada que cambiar. Puedes borrar la variable.`);
    } else {
      db.prepare('UPDATE users SET rol=? WHERE id=?').run(rolNuevo, u.id);
      db.prepare('INSERT INTO meta(k,v) VALUES (?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v').run('admin_promote', marca);
      auditar(null, null, 'admin-promote', `${u.usuario} → ${rolNuevo} (ADMIN_PROMOTE, conserva pid ${u.pid || '—'})`);
      console.log(`[shiftia] ADMIN_PROMOTE aplicado a «${u.usuario}»: ahora es ${rolNuevo} y conserva su persona asociada. Al recargar verá el panel de ${rolNuevo === 'programador' ? 'programador' : 'encargado'} y su jornada personal. BORRA la variable.`);
    }
  }
}

// ---------- sesiones (cookie firmada) ----------
const firma = txt => crypto.createHmac('sha256', SECRETO).update(txt).digest('hex');
const SESION_LARGA = 30 * 864e5, SESION_CORTA = 12 * 3600e3;
// token = uid.gen.exp.hmac — `gen` es la generación de sesión del usuario: cambiar la
// contraseña, el reset del admin o «salir de todos los dispositivos» la suben y
// todas las cookies anteriores dejan de valer al momento.
function emitirSesion(u, recordar) {
  const exp = Date.now() + (recordar ? SESION_LARGA : SESION_CORTA);
  const base = `${u.id}.${u.gen || 0}.${exp}`;
  return `${base}.${firma(base)}`;
}
function sesionDe(req) {
  let tok = null;
  for (const par of (req.headers.cookie || '').split(';')) {
    const i = par.indexOf('=');
    if (i < 0) continue;
    if (par.slice(0, i).trim() === 'sesion') { tok = par.slice(i + 1).trim(); break; }
  }
  if (!tok) return null;
  const [uid, gen, exp, mac] = tok.split('.');
  if (!uid || !gen || !exp || !mac) return null;
  const esperado = firma(`${uid}.${gen}.${exp}`);
  // la firma es siempre 64 hex: con 64 caracteres no ASCII la longitud coincidía
  // pero los buffers no, timingSafeEqual lanzaba y ese navegador recibía 500 en
  // todas las rutas, la pantalla de acceso incluida (auditoría 06/09)
  if (!/^[0-9a-f]{64}$/.test(mac) || !/^[0-9a-f]{64}$/.test(esperado) ||
      !crypto.timingSafeEqual(Buffer.from(mac, 'hex'), Buffer.from(esperado, 'hex'))) return null;
  if (+exp < Date.now()) return null;
  const u = db.prepare('SELECT id,usuario,rol,pid,cambiar,gen FROM users WHERE id=?').get(+uid);
  if (!u || +gen !== (u.gen || 0)) return null;
  u.recordar = +exp - Date.now() > SESION_CORTA;   // para reemitir la cookie con la misma duración
  return u;
}
const esHttps = req => (req.headers['x-forwarded-proto'] || '').includes('https');
// «Mantener la sesión» = cookie persistente 30 días; si no, cookie de sesión del navegador (12 h)
const cookieSesion = (req, valor, caduca, recordar) =>
  `sesion=${valor}; Path=/; HttpOnly; SameSite=Lax${caduca ? '; Max-Age=0' : recordar ? '; Max-Age=' + 30 * 86400 : ''}${esHttps(req) ? '; Secure' : ''}`;
// cabeceras de seguridad en TODAS las respuestas (la app es un único HTML con
// script y estilos inline: por eso 'unsafe-inline'; el resto queda cerrado)
const CSP = "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; connect-src 'self'; manifest-src 'self'; worker-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'";
function cabecerasSeguridad(req, res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Content-Security-Policy', CSP);
  if (esHttps(req)) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}

// ---------- estado con versionado ----------
function leerEstado() {
  const fila = db.prepare('SELECT version,json FROM estado WHERE id=1').get();
  if (!fila) return { version: 0, estado: null };
  try { return { version: fila.version, estado: JSON.parse(fila.json) }; }
  catch (e) { console.error('[shiftia] estado en BD corrupto'); return { version: fila.version, estado: null }; }
}
function versionActual() { const f = db.prepare('SELECT version FROM estado WHERE id=1').get(); return f ? f.version : 0; }
function guardarEstado(estado, version, antes, quien) {
  const txt = JSON.stringify(estado), ahora = Date.now();
  db.prepare(`INSERT INTO estado(id,version,json,actualizado) VALUES (1,?,?,?)
    ON CONFLICT(id) DO UPDATE SET version=excluded.version, json=excluded.json, actualizado=excluded.actualizado`)
    .run(version, txt, ahora);
  // historial de versiones (las últimas HIST_MAX): vuelta atrás desde Cuenta
  db.prepare('INSERT OR REPLACE INTO estado_hist(version,json,actualizado,usuario) VALUES (?,?,?,?)').run(version, txt, ahora, quien ? quien.usuario : null);
  db.prepare('DELETE FROM estado_hist WHERE version <= ?').run(version - HIST_MAX);
  difundir(version);
  // notificaciones en segundo plano: lo que cambió entre `antes` y `estado`
  if (antes) PUSH.notificar(antes, estado).catch(() => {});
}
// mutación delta segura (empleado): carga → muta → versión+1 → difunde
function mutarEstado(fn, quien) {
  const { version, estado } = leerEstado();
  if (!estado || !Array.isArray(estado.staff)) {
    // aún no hay planilla en el servidor: un delta de empleado no puede crearla
    const err = new Error('todavía-no-hay-planilla');
    err.code = 'SIN_ESTADO';
    throw err;
  }
  const antes = JSON.parse(JSON.stringify(estado));
  fn(estado);
  guardarEstado(estado, version + 1, antes, quien);
  return version + 1;
}

// ---------- límite de intentos de login (declarado antes del latido que lo poda) ----------
// por ip|usuario (8 fallos bloquean ESE usuario desde esa IP 10 min) y un freno
// mucho más alto por IP (60) contra fuerza bruta: la plantilla entera detrás del
// wifi de un local no se bloquea entre sí por teclear mal su contraseña.
const intentos = new Map(); // ip|usuario → {n, hasta} · ip → {n, hasta}
function loginBloqueado(ip, usuario) {
  const e = intentos.get(ip + '|' + usuario), g = intentos.get(ip);
  return (e && e.n >= 8 && Date.now() < e.hasta) || (g && g.n >= 60 && Date.now() < g.hasta);
}
function loginFallo(ip, usuario) {
  for (const k of [ip + '|' + usuario, ip]) { const e = intentos.get(k) || { n: 0, hasta: 0 }; e.n++; e.hasta = Date.now() + 10 * 60e3; intentos.set(k, e); }
}

// ---------- SSE ----------
const clientesSSE = new Set();
const SSE_MAX = 200, SSE_MAX_USUARIO = 6;   // una plantilla × varios dispositivos; nadie puede agotar el cupo solo
const sseDe = uid => { let n = 0; for (const r of clientesSSE) if (r.uidSSE === uid) n++; return n; };
function difundir(version) {
  for (const res of clientesSSE) {
    try { res.write(`event: version\ndata: {"version":${version}}\n\n`); } catch (e) { clientesSSE.delete(res); }
  }
}
setInterval(() => {
  // como EVENTO, no como comentario: los comentarios SSE no llegan al JavaScript
  // del cliente y el vigilante del canal no tenía nada que oír
  for (const res of clientesSSE) { try { res.write('event: latido\ndata: {}\n\n'); } catch (e) { clientesSSE.delete(res); } }
  const ahora = Date.now();
  for (const [k, v] of intentos) if (v.hasta < ahora) intentos.delete(k);
  if (intentos.size > 5000) for (const k of [...intentos.keys()].slice(0, 2500)) intentos.delete(k); // backstop anti-OOM: poda la mitad más antigua
}, 25000).unref();

// ---------- compresión: index.html pesa cientos de KB sin comprimir ----------
// Cada apertura de la app los bajaba tal cual (segundos en un 4G flojo). Con
// brotli o gzip (los trae Node, sin dependencias) se quedan en una fracción.
// Se comprime una vez por fichero y fecha, y se sirve de memoria.
const zlib = require('node:zlib');
const COMPRIMIDOS = new Map();
function servirFichero(req, res, abs, cabeceras) {
  const st = fs.statSync(abs);
  const raw = fs.readFileSync(abs);
  const texto = /^(text\/|application\/(javascript|json|manifest)|image\/svg)/.test(cabeceras['Content-Type'] || '');
  const ae = String(req.headers['accept-encoding'] || '');
  let cuerpo = raw, enc = null;
  if (texto && raw.length > 1024) {
    const k = abs + ':' + st.mtimeMs + ':' + st.size;
    let c = COMPRIMIDOS.get(k);
    if (!c) { c = {}; COMPRIMIDOS.set(k, c); if (COMPRIMIDOS.size > 24) COMPRIMIDOS.delete(COMPRIMIDOS.keys().next().value); }
    if (/\bbr\b/.test(ae)) { c.br = c.br || zlib.brotliCompressSync(raw, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 7, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: raw.length } }); cuerpo = c.br; enc = 'br'; }
    else if (/\bgzip\b/.test(ae)) { c.gz = c.gz || zlib.gzipSync(raw, { level: 6 }); cuerpo = c.gz; enc = 'gzip'; }
  }
  const h = Object.assign({}, cabeceras, { 'Content-Length': cuerpo.length });
  if (enc) h['Content-Encoding'] = enc;
  if (texto) h.Vary = [cabeceras.Vary, 'Accept-Encoding'].filter(Boolean).join(', ');
  res.writeHead(200, h);
  res.end(req.method === 'HEAD' ? undefined : cuerpo);
}

// ---------- estáticos: SOLO lista blanca (nunca documentos del cliente) ----------
const PUBLICOS = {
  '/sw.js': ['sw.js', 'text/javascript; charset=utf-8'],
  '/manifest.webmanifest': ['manifest.webmanifest', 'application/manifest+json; charset=utf-8'],
  '/icons/icon-192.png': ['icons/icon-192.png', 'image/png'],
  '/icons/icon-512.png': ['icons/icon-512.png', 'image/png'],
  // librerías del «Descargar PDF», servidas por la propia app: sin CDN (en el wifi de
  // un bar los CDN a veces están capados) y sin depender de que el diálogo de imprimir exista
  '/vendor/html2canvas.min.js': ['vendor/html2canvas.min.js', 'text/javascript; charset=utf-8'],
  '/vendor/jspdf.umd.min.js': ['vendor/jspdf.umd.min.js', 'text/javascript; charset=utf-8'],
  // 14/09: logotipos (si el fichero no está, 404 como cualquier otro de la lista)
  '/assets/shiftia-logo.svg': ['assets/shiftia-logo.svg', 'image/svg+xml'],
  '/assets/pasarela-logo.png': ['assets/pasarela-logo.png', 'image/png'],
};

// ---------- utilidades http ----------
function json(res, code, obj, cabeceras) {
  if (res.headersSent) { try { res.end(); } catch (e) {} return; }
  const cuerpo = JSON.stringify(obj);
  res.writeHead(code, Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, cabeceras || {}));
  res.end(cuerpo);
}
function leerCuerpo(req, maxBytes) {
  const tope = maxBytes || 256 * 1024;
  return new Promise((resolve, reject) => {
    let total = 0; const trozos = [];
    req.on('data', d => {
      total += d.length;
      if (total > tope) { reject(new Error('cuerpo demasiado grande')); req.destroy(); return; }
      trozos.push(d);
    });
    req.on('end', () => {
      try { const v = trozos.length ? JSON.parse(Buffer.concat(trozos).toString('utf8')) : {}; resolve(v && typeof v === 'object' && !Array.isArray(v) ? v : {}); }
      catch (e) { reject(new Error('JSON inválido')); }
    });
    req.on('error', reject);
  });
}
const ISO = /^\d{4}-\d{2}-\d{2}$/;
// fecha real (rechaza 2026-02-30 o 2026-13-01) en formato yyyy-mm-dd
const fechaValida = iso => typeof iso === 'string' && ISO.test(iso) && new Date(iso + 'T00:00:00Z').toISOString().slice(0, 10) === iso;
const hoyIso = () => M.fechaMadrid();   // hora de Madrid, no UTC (auditoría 07/09)
const masDias = (iso, n) => new Date(new Date(iso + 'T00:00:00Z').getTime() + n * 864e5).toISOString().slice(0, 10);
// contador «n veces cada 10 minutos» reutilizando el mapa de intentos
function cupo(clave, max) {
  const c = intentos.get(clave) || { n: 0, hasta: Date.now() + 600e3 };
  if (c.hasta < Date.now()) { c.n = 0; c.hasta = Date.now() + 600e3; }
  c.n++; intentos.set(clave, c);
  return c.n <= max;
}

// ---------- núcleo de optimización: shiftia-core (Python, CP-SAT, contrato /v1) ----------
// 14/09: la planilla automática la calcula un servicio aparte. Este servidor solo
// hace de pasarela CON SESIÓN: el navegador nunca ve la URL ni la clave del
// núcleo, y sin sesión de encargado o programador no se le puede pedir nada.
//   SHIFTIA_CORE_URL        base del servicio (p. ej. https://core.example.railway.app)
//   SHIFTIA_CORE_KEY        va en la cabecera X-API-Key de cada llamada
//   SHIFTIA_CORE_TIMEOUT_S  tope de espera de /v1/solve (60 s por defecto)
const NUCLEO_URL = String(process.env.SHIFTIA_CORE_URL || '').trim().replace(/\/+$/, '');
const NUCLEO_KEY = String(process.env.SHIFTIA_CORE_KEY || '').trim();
const NUCLEO_TIMEOUT_MS = Math.max(1, +(process.env.SHIFTIA_CORE_TIMEOUT_S || 60) || 60) * 1000;
const NUCLEO_CUERPO_MAX = 4 * 1024 * 1024;   // un problema de un mes con 22 personas no llega a 1 MB
const cabecerasNucleo = () => Object.assign({ 'Content-Type': 'application/json', Accept: 'application/json' }, NUCLEO_KEY ? { 'X-API-Key': NUCLEO_KEY } : {});

// ---------- servidor ----------
// ---------- un solo dominio de verdad ----------
// El dominio propio y su www son el mismo sitio, pero la SESIÓN vive en uno solo:
// la cookie puesta en www no viaja al dominio raíz, así que entrar por el otro
// parecería que te ha echado. Por eso hay un canónico y el resto redirige —
// conservando la ruta y la query, y siempre a https.
// 06/09 (piloto): el apex ni siquiera llegaba aquí. Lo atendía una redirección del
// proveedor que solo cubría la raíz (todo lo demás daba 404) y que además mandaba
// a http://, con un salto de más. Con HOST_CANONICO puesto y el dominio apuntando
// al servicio, esto lo resuelve la app y deja de depender de esa configuración.
const HOST_CANONICO = String(process.env.HOST_CANONICO || '').trim().toLowerCase()
  .replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:(80|443)$/, '');
const hostPedido = req => String(req.headers['x-forwarded-host'] || req.headers.host || '')
  .split(',')[0].trim().toLowerCase().replace(/:(80|443)$/, '');
const sinWww = h => h.replace(/^www\./, '');

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const ruta = url.pathname;
  const ip = ipCliente(req);
  cabecerasSeguridad(req, res);
  // Solo dentro de la MISMA familia de dominio (apex ↔ www): así el dominio de
  // Railway y el healthcheck interno siguen respondiendo tal cual.
  if (HOST_CANONICO) {
    const h = hostPedido(req);
    if (h && h !== HOST_CANONICO && sinWww(h) === sinWww(HOST_CANONICO)) {
      // 301 para lectura y 308 para el resto: el 308 conserva método y cuerpo, así
      // que una escritura que llegue por el dominio equivocado no se convierte en
      // un GET silencioso
      res.writeHead(req.method === 'GET' || req.method === 'HEAD' ? 301 : 308,
        { Location: 'https://' + HOST_CANONICO + req.url, 'Cache-Control': 'no-store' });
      res.end();
      return;
    }
  }
  try {
    // --- la app completa solo con sesión; sin ella, la pantalla de acceso ---
    if ((req.method === 'GET' || req.method === 'HEAD') && (ruta === '/' || ruta === '/index.html')) {
      const quien = sesionDe(req);
      const fichero = quien && !quien.cambiar ? 'index.html' : 'login.html';   // con la contraseña inicial, la pantalla de acceso guía el cambio
      const abs = path.join(RAIZ, fichero);
      if (!fs.existsSync(abs)) { res.writeHead(404); res.end(); return; }
      // X-Shiftia-Doc: el service worker solo guarda como shell la app, nunca la
      // pantalla de acceso (tras cerrar sesión, «/» la devolvía y envenenaba la caché)
      servirFichero(req, res, abs, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', Vary: 'Cookie', 'X-Shiftia-Doc': fichero === 'index.html' ? 'app' : 'login' });
      return;
    }
    // --- estáticos ---
    if (req.method === 'GET' && PUBLICOS[ruta]) {
      const [fichero, tipo] = PUBLICOS[ruta];
      const abs = path.join(RAIZ, fichero);
      if (!fs.existsSync(abs)) { res.writeHead(404); res.end(); return; }
      servirFichero(req, res, abs, { 'Content-Type': tipo, 'Cache-Control': ruta === '/' || ruta === '/index.html' ? 'no-cache' : 'public, max-age=86400' });
      return;
    }
    if (!ruta.startsWith('/api/')) { json(res, 404, { error: 'no existe' }); return; }

    // --- API sin sesión ---
    // (el calendario personal por token, /api/ical/*, llega en la fase 3)
    if (ruta === '/api/salud') {
      if (!cupo('salud|' + ip, 3000)) { json(res, 429, { error: 'demasiadas peticiones' }, { 'Retry-After': '60' }); return; }
      json(res, 200, { ok: true, app: 'shiftia-pasarela', persistencia: PERSISTENCIA, version: versionActual() });
      return;
    }
    // A40: segunda barrera CSRF además de SameSite: origen y tipo de contenido en toda escritura
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      const origen = req.headers.origin, sitio = req.headers['sec-fetch-site'];
      // el dominio propio y su www son el MISMO sitio: si no, entrar por el apex y
      // postear al www daba «origen no permitido»
      const norm = h => String(h || '').trim().toLowerCase().replace(/:(80|443)$/, '');
      const raiz = h => norm(h).replace(/^www\./, '');
      const propios = new Set([req.headers.host, ...String(req.headers['x-forwarded-host'] || '').split(',')].map(raiz).filter(Boolean));
      let hostOrigen = null; try { if (origen && origen !== 'null') hostOrigen = raiz(new URL(origen).host); } catch (e) { hostOrigen = '?'; }
      // con cupo: sin sesión ni cupo, un solo cliente escribía 721 filas/s en la
      // auditoría (21 GB al día) y podía llenar el volumen (auditoría 06/09)
      if (sitio === 'cross-site' || (hostOrigen && !propios.has(hostOrigen))) { if (cupo('csrf|' + ip, 20)) auditar(null, ip, 'csrf-rechazado', `${ruta} origen=${origen || '-'} sitio=${sitio || '-'}`); json(res, 403, { error: 'origen no permitido' }); return; }
      if (!/^application\/json/i.test(req.headers['content-type'] || '')) { json(res, 415, { error: 'se espera application/json' }); return; }
    }
    if (ruta === '/api/login' && req.method === 'POST') {
      const { usuario, password, recordar } = await leerCuerpo(req, 8 * 1024);
      const usu = String(usuario || '').toLowerCase().trim();
      if (loginBloqueado(ip, usu)) { if (cupo('bloq|' + ip, 5)) auditar(null, ip, 'login-bloqueado', usu); json(res, 429, { error: 'Demasiados intentos: espera 10 minutos' }); return; }
      // el intento se cuenta ANTES del scrypt (que es asíncrono): si se contaba
      // después, una ráfaga de 300 peticiones a la vez pasaba entera el control
      // porque ninguna había fallado todavía (auditoría 06/09)
      loginFallo(ip, usu);
      const u = db.prepare('SELECT * FROM users WHERE usuario=?').get(usu);
      // mismo coste exista o no el usuario: el tiempo de respuesta no delata nombres
      const hash = await hashPassAsync(password || '', u ? u.salt : '0'.repeat(32));
      if (!u || hash !== u.hash) {
        auditar(null, ip, 'login-fallido', usu);
        json(res, 401, { error: 'Usuario o contraseña incorrectos' });
        return;
      }
      intentos.delete(ip + '|' + usu);
      { const g = intentos.get(ip); if (g && g.n > 0) g.n--; }   // un acceso correcto no deja lastre en la IP compartida
      auditar(u, ip, 'login');
      const rec = recordar !== false;
      json(res, 200, { rol: u.rol, pid: u.pid, usuario: u.usuario, cambiar: !!u.cambiar }, { 'Set-Cookie': cookieSesion(req, emitirSesion(u, rec), false, rec) });
      return;
    }

    // --- API con sesión ---
    const yo = sesionDe(req);
    if (!yo) { json(res, 401, { error: 'sin sesión' }); return; }
    // 14/09: `esAdmin` = encargado O programador (todo lo que puede el encargado lo
    // puede el programador); `esProg` = solo el programador (auditoría, cuentas de
    // cualquier rol).
    const esAdmin = ['admin', 'programador'].includes(yo.rol);
    const esProg = yo.rol === 'programador';

    if (ruta === '/api/logout' && req.method === 'POST') {
      try {
        const bl = await leerCuerpo(req, 8 * 1024);
        if (bl && typeof bl.endpoint === 'string') PUSH.baja(yo.id, bl.endpoint);
        // «salir de todos los dispositivos»: sube la generación → todas las cookies quedan revocadas
        if (bl && bl.todos) { db.prepare('UPDATE users SET gen = gen + 1 WHERE id=?').run(yo.id); PUSH.bajaUsuario(yo.id); auditar(yo, ip, 'logout-todos'); }
      } catch (e) {}
      json(res, 200, { ok: true }, { 'Set-Cookie': cookieSesion(req, 'x', true) });
      return;
    }
    // Qué versión sirve el servidor ahora. Con sesión: /api/salud (anónimo) se
    // queda como está, sin decir de qué versión es la instalación.
    if (ruta === '/api/version' && req.method === 'GET') {
      json(res, 200, { app: APP_VER, build: APP_BUILD });
      return;
    }
    if (ruta === '/api/yo') { json(res, 200, { rol: yo.rol, pid: yo.pid, usuario: yo.usuario, cambiar: !!yo.cambiar }); return; }
    // con la contraseña genérica solo se puede: ver quién soy, cambiarla y salir.
    // Lo impone el servidor: el botón «Ahora no» del cliente ya no existe.
    if (yo.cambiar && ruta !== '/api/password') { json(res, 403, { error: 'Crea tu contraseña personal para seguir', cambiar: true }); return; }

    if (ruta === '/api/estado' && req.method === 'GET') {
      const e = leerEstado();
      json(res, 200, esAdmin ? e : { version: e.version, estado: estadoParaEmpleado(e.estado, yo.pid) });
      return;
    }

    if (ruta === '/api/estado' && req.method === 'PUT') {
      if (!esAdmin) { json(res, 403, { error: 'solo el encargado escribe la planilla' }); return; }
      const { baseVersion, estado } = await leerCuerpo(req, 12 * 1024 * 1024);
      if (!estado || !Array.isArray(estado.staff)) { json(res, 400, { error: 'estado inválido' }); return; }
      // y con la forma que estado-servidor.js da por hecha: un guardado con
      // peticiones:"ups" se aceptaba y dejaba a toda la plantilla con 500
      // 14/09: la planilla de Pasarela añade locales y extras; meses[clave].asig[iso][turno]
      // es una lista ORDENADA de {pid, cocina, abre, origen…}, no de pids
      {
        const lista = k => estado[k] === undefined || estado[k] === null || Array.isArray(estado[k]);
        const bien = ['locales', 'peticiones', 'avisos', 'historial', 'festivos', 'eventos', 'extras', 'mesesPublicados'].every(lista)
          && estado.staff.every(p => p && typeof p === 'object' && typeof p.id === 'string')
          && (estado.meses === undefined || (estado.meses && typeof estado.meses === 'object' && !Array.isArray(estado.meses)));
        if (!bien) { json(res, 400, { error: 'estado inválido: alguna lista no tiene la forma esperada' }); return; }
      }
      const actual = leerEstado();
      if (+baseVersion !== actual.version) { json(res, 409, { error: 'conflicto', version: actual.version }); return; }
      guardarEstado(estado, actual.version + 1, actual.estado, yo);
      auditar(yo, ip, 'estado', `v${actual.version + 1} · ${estado.staff.length} personas · ${(estado.locales || []).length} locales · ${Object.keys(estado.meses || {}).length} meses`);
      // (en el piloto la versión 1 devolvía el estado completado con las notas de fábrica; aquí no hay nada que completar)
      json(res, 200, { version: actual.version + 1 });
      return;
    }
    // registro de escrituras: SOLO el programador. La auditoría se escribía en cada
    // acción y NO se leía desde ningún sitio: un registro que nadie puede consultar
    // no responde a «¿quién me cambió el turno?», que es justo para lo que está.
    if (ruta === '/api/auditoria' && req.method === 'GET') {
      if (!esProg) { json(res, 403, { error: 'solo el programador' }); return; }
      const n = Math.min(Math.max(+url.searchParams.get('n') || 200, 1), 1000);
      const accion = url.searchParams.get('accion');
      const filas = accion
        ? db.prepare('SELECT id,ts,usuario,ip,accion,detalle FROM auditoria WHERE accion=? ORDER BY id DESC LIMIT ?').all(String(accion).slice(0, 40), n)
        : db.prepare('SELECT id,ts,usuario,ip,accion,detalle FROM auditoria ORDER BY id DESC LIMIT ?').all(n);
      const total = db.prepare('SELECT COUNT(*) c FROM auditoria').get().c;
      json(res, 200, { filas, total });
      return;
    }
    // versiones anteriores de la planilla (encargado y programador): lista y contenido de una
    if (ruta === '/api/estado/versiones' && req.method === 'GET') {
      if (!esAdmin) { json(res, 403, { error: 'solo el encargado' }); return; }
      const v = url.searchParams.get('v');
      if (v) {
        const f = db.prepare('SELECT version,json,actualizado,usuario FROM estado_hist WHERE version=?').get(+v);
        if (!f) { json(res, 404, { error: 'esa versión ya no se conserva' }); return; }
        let estadoV = null; try { estadoV = JSON.parse(f.json); } catch (e) {}
        json(res, 200, { version: f.version, actualizado: f.actualizado, usuario: f.usuario, estado: estadoV });
        return;
      }
      json(res, 200, { versiones: db.prepare('SELECT version,actualizado,usuario,length(json) AS bytes FROM estado_hist ORDER BY version DESC').all() });
      return;
    }
    // copia completa (encargado y programador): planilla + usuarios + suscripciones push
    if (ruta === '/api/copia' && req.method === 'GET') {
      if (!esAdmin) { json(res, 403, { error: 'solo el encargado' }); return; }
      const e = leerEstado();
      auditar(yo, ip, 'copia');
      // sin secretos: ni hashes, ni claves push privadas (las cuentas se recrean con contraseña inicial nueva)
      json(res, 200, {
        formato: 'shiftia-copia-completa', creado: Date.now(), version: e.version, estado: e.estado,
        usuarios: db.prepare('SELECT usuario,rol,pid,creado,cambiar FROM users ORDER BY rol,usuario').all().map(u => Object.assign(u, { cambiar: !!u.cambiar })),
        inventario: { dispositivosPush: db.prepare('SELECT COUNT(*) c FROM push_subs').get().c, versionesGuardadas: db.prepare('SELECT COUNT(*) c FROM estado_hist').get().c },
      }, { 'Content-Disposition': `attachment; filename="shiftia-copia-completa-${new Date().toISOString().slice(0, 10)}.json"` });
      return;
    }

    if (ruta === '/api/peticiones' && req.method === 'POST') {
      const b = await leerCuerpo(req);
      const pid = esAdmin ? ((typeof b.pid === 'string' && /^[a-z0-9_.-]{1,40}$/i.test(b.pid) ? b.pid : null) || yo.pid) : yo.pid;   // el empleado NUNCA elige pid
      if (!pid) { json(res, 400, { error: 'sin persona asociada' }); return; }
      if (!['VAC', 'LD', 'cambio'].includes(b.tipo) || !fechaValida(b.desde) ||
          (b.hasta && !fechaValida(b.hasta))) { json(res, 400, { error: 'petición inválida' }); return; }
      if (b.tipo !== 'cambio') {
        const h = b.hasta || b.desde, hoy = hoyIso();
        if (h < b.desde) { json(res, 400, { error: 'la fecha final es anterior a la inicial' }); return; }
        if (h > masDias(b.desde, 92)) { json(res, 400, { error: 'una petición no puede abarcar más de 3 meses' }); return; }
        if (b.desde < masDias(hoy, -31) || b.desde > masDias(hoy, 400)) { json(res, 400, { error: 'revisa el año de la fecha' }); return; }
      }
      const txt = v => (typeof v === 'string' && /^[a-z0-9_.-]{1,40}$/i.test(v)) ? v : undefined;
      if (b.tipo === 'cambio' && b.conIso !== undefined && b.conIso !== null && b.conIso !== '' && !fechaValida(String(b.conIso))) { json(res, 400, { error: 'petición inválida' }); return; }
      const pet = {
        id: 'p_' + crypto.randomUUID().slice(0, 8), pid, tipo: b.tipo,
        desde: b.desde, hasta: b.hasta || undefined, conPid: txt(b.conPid),
        slotId: txt(b.slotId), conIso: b.tipo === 'cambio' && b.conIso ? String(b.conIso) : undefined, conSlotId: txt(b.conSlotId),
        nota: String(b.nota || '').replace(/\s+/g, ' ').trim().slice(0, 400), estado: 'pendiente', ts: Date.now(),
      };
      if (pet.conIso && (!pet.conPid || !pet.conSlotId)) { json(res, 400, { error: 'falta el turno del compañero' }); return; }
      if (pet.tipo === 'cambio') {
        const hoyIso = M.fechaMadrid();
        if (pet.conPid === pid) { json(res, 400, { error: 'no puedes proponerte un cambio a ti mismo' }); return; }
        if (pet.desde < hoyIso || (pet.conIso && pet.conIso < hoyIso)) { json(res, 400, { error: 'el turno ya ha pasado' }); return; }
        const estC = leerEstado().estado;
        if (estC) {
          // 07/09: sobre un mes que el encargado aún no ha publicado no se pide nada
          for (const iso of [pet.desde, pet.conIso].filter(Boolean)) if (!M.mesVisibleParaPersonal(estC.mesesPublicados, iso.slice(0, 7), hoyIso.slice(0, 7))) { json(res, 400, { error: 'ese mes aún no está publicado' }); return; }
          // 14/09: en Pasarela no hay categorías (el piloto exigía «misma categoría»):
          // basta con que el compañero exista en la plantilla
          const elP = pet.conPid && (estC.staff || []).find(p => p.id === pet.conPid);
          if (pet.conPid && !elP) { json(res, 400, { error: 'el compañero no existe' }); return; }
          // la casilla es una lista ordenada de {pid, cocina, abre, origen…}, no de pids
          const tiene = (iso, quien, slot) => { const e = M.estadoDesde(estC.meses || {}, estC.festivos || [], +iso.slice(0, 4), +iso.slice(5, 7)); const a = (e.asig[iso] || {})[slot]; return Array.isArray(a) && a.some(x => x && x.pid === quien); };
          if (pet.slotId && !tiene(pet.desde, pid, pet.slotId)) { json(res, 400, { error: 'ese turno ya no es tuyo' }); return; }
          if (pet.conIso && !tiene(pet.conIso, pet.conPid, pet.conSlotId)) { json(res, 400, { error: 'el compañero ya no tiene ese turno' }); return; }
        }
      }
      // límite por usuario: 10 peticiones cada 10 minutos y como mucho 20 pendientes
      { if (!cupo('pet|' + yo.id, 10)) { json(res, 429, { error: 'demasiadas peticiones seguidas: espera unos minutos' }); return; }
        const pend = ((leerEstado().estado || {}).peticiones || []).filter(x => x.pid === pid && x.estado === 'pendiente').length;
        if (pend >= 20) { json(res, 429, { error: 'tienes demasiadas peticiones pendientes' }); return; } }
      const v = mutarEstado(est => { (est.peticiones = est.peticiones || []).push(pet); }, yo);
      auditar(yo, ip, 'peticion', `${pet.tipo} ${pet.desde}`);
      json(res, 200, { version: v, peticion: pet });
      return;
    }

    // el propio solicitante retira una petición suya que sigue pendiente
    if (ruta === '/api/peticiones/retirar' && req.method === 'POST') {
      const b = await leerCuerpo(req);
      if (typeof b.id !== 'string') { json(res, 400, { error: 'petición inválida' }); return; }
      const { estado: estR } = leerEstado();
      const petR = estR && (estR.peticiones || []).find(x => x.id === b.id);
      if (!petR || petR.estado !== 'pendiente') { json(res, 404, { error: 'esa petición ya no está pendiente' }); return; }
      if (!esAdmin && petR.pid !== yo.pid) { json(res, 403, { error: 'solo quien la pidió puede retirarla' }); return; }
      const v = mutarEstado(estado => {
        const pet = (estado.peticiones || []).find(x => x.id === b.id);
        if (pet && pet.estado === 'pendiente') { pet.estado = 'retirada'; pet.resueltaTs = Date.now(); }
      }, yo);
      auditar(yo, ip, 'peticion-retirada', b.id);
      json(res, 200, { version: v });
      return;
    }

    // el compañero acepta o rechaza una propuesta de cambio de turno que le hacen
    if (ruta === '/api/peticiones/responder' && req.method === 'POST') {
      const b = await leerCuerpo(req);
      if (!yo.pid || typeof b.id !== 'string') { json(res, 400, { error: 'petición inválida' }); return; }
      const { estado: estAhora } = leerEstado();
      const petAhora = estAhora && (estAhora.peticiones || []).find(x => x.id === b.id);
      if (!petAhora || petAhora.tipo !== 'cambio' || petAhora.estado !== 'pendiente') { json(res, 404, { error: 'esa propuesta ya no está pendiente' }); return; }
      if (petAhora.conPid !== yo.pid) { json(res, 403, { error: 'solo el compañero propuesto puede responder' }); return; }
      if (b.aceptar && petAhora.aceptada) { json(res, 200, { version: versionActual() }); return; }   // ya aceptada: nada que cambiar
      const v = mutarEstado(estado => {
        const pet = (estado.peticiones || []).find(x => x.id === b.id);
        if (!pet) return;
        if (b.aceptar) { pet.aceptada = true; pet.aceptadaTs = Date.now(); }
        else {
          pet.estado = 'rechazada'; pet.rechazadaPor = 'companero'; pet.resueltaTs = Date.now();
          const q = (estado.staff || []).find(x => x.id === yo.pid);
          (estado.avisos = estado.avisos || []).push({ id: 'a_res_' + pet.id, paraPid: pet.pid, de: 'admin', texto: `${q ? q.nombre.split(' ')[0] : 'Tu compañero'} ha rechazado tu propuesta de cambio de turno del ${+pet.desde.slice(8, 10)}/${+pet.desde.slice(5, 7)}.`, ts: Date.now(), caducidad: Date.now() + 7 * 864e5, ocultoPor: [] });
        }
      }, yo);
      auditar(yo, ip, b.aceptar ? 'cambio-aceptado' : 'cambio-rechazado', b.id);
      json(res, 200, { version: v });
      return;
    }

    if (ruta === '/api/avisos/ocultar' && req.method === 'POST') {
      const { ids } = await leerCuerpo(req);
      if (!Array.isArray(ids) || ids.length > 200 || !yo.pid) { json(res, 400, { error: 'petición inválida' }); return; }
      const quiero = new Set(ids.filter(x => typeof x === 'string'));
      const cambia = a => quiero.has(a.id) && M.avisoEsPara(a, yo.pid) && !(a.ocultoPor || []).includes(yo.pid);   // solo los que van dirigidos a mí
      const { version: vAhora, estado: estOc } = leerEstado();
      // nada que cambiar → no se crea una versión nueva (evita repintar a todos por nada)
      if (!estOc || !(estOc.avisos || []).some(cambia)) { json(res, 200, { version: vAhora }); return; }
      const v = mutarEstado(est => {
        for (const a of est.avisos || []) if (cambia(a)) (a.ocultoPor = a.ocultoPor || []).push(yo.pid);
      }, yo);
      json(res, 200, { version: v });
      return;
    }

    // (los enlaces de calendario /api/ical/token y /api/ical/token/rotar llegan en la fase 3)
    // notificaciones push: clave pública, alta y baja de la suscripción de este dispositivo
    if (ruta === '/api/push/clave' && req.method === 'GET') { json(res, 200, { clave: PUSH.clave() }); return; }
    if (ruta === '/api/push/suscribir' && req.method === 'POST') {
      const b = await leerCuerpo(req);
      if (!cupo('push|' + yo.id, 20)) { json(res, 429, { error: 'demasiadas altas seguidas' }); return; }
      if (!PUSH.suscribir(yo.id, b.suscripcion, req.headers['user-agent'])) { json(res, 400, { error: 'suscripción inválida' }); return; }
      json(res, 200, { ok: true }); return;
    }
    if (ruta === '/api/push/baja' && req.method === 'POST') {
      const b = await leerCuerpo(req);
      PUSH.baja(yo.id, b.endpoint); json(res, 200, { ok: true }); return;
    }
    if (ruta === '/api/password' && req.method === 'POST') {
      const { actual, nueva } = await leerCuerpo(req, 8 * 1024);
      // 6 contraseñas actuales erróneas seguidas bloquean 10 minutos (los cambios correctos no cuentan)
      const kp = 'pass|' + yo.id, cp = intentos.get(kp);
      if (cp && cp.n >= 6 && Date.now() < cp.hasta) { json(res, 429, { error: 'demasiados intentos: espera unos minutos' }); return; }
      if (String(nueva || '').length < 8) { json(res, 400, { error: 'La nueva contraseña necesita al menos 8 caracteres' }); return; }
      if (String(nueva).length > 200) { json(res, 400, { error: 'Contraseña demasiado larga' }); return; }
      if (String(nueva) === PASS_GENERICA || String(nueva) === String(actual)) { json(res, 400, { error: 'Elige una contraseña distinta y solo tuya' }); return; }
      const u = db.prepare('SELECT * FROM users WHERE id=?').get(yo.id);
      if (await hashPassAsync(actual || '', u.salt) !== u.hash) {
        const c = intentos.get(kp) || { n: 0, hasta: 0 }; c.n++; c.hasta = Date.now() + 10 * 60e3; intentos.set(kp, c);
        json(res, 401, { error: 'La contraseña actual no es correcta' }); return;
      }
      intentos.delete(kp);
      const salt = crypto.randomBytes(16).toString('hex');
      // las demás sesiones del usuario caducan; la de este dispositivo se renueva en la respuesta
      db.prepare('UPDATE users SET hash=?, salt=?, cambiar=0, gen=gen+1 WHERE id=?').run(hashPass(nueva, salt), salt, yo.id);
      const u2 = db.prepare('SELECT id,gen FROM users WHERE id=?').get(yo.id);
      auditar(yo, ip, 'password');
      json(res, 200, { ok: true }, { 'Set-Cookie': cookieSesion(req, emitirSesion(u2, yo.recordar), false, yo.recordar) });
      return;
    }

    // --- gestión de usuarios (encargado y programador) ---
    // 14/09: el encargado da de alta empleados y otros encargados; SOLO el programador
    // crea, resetea o borra cuentas de programador. Nunca se borra el último de cada uno.
    if (ruta === '/api/usuarios' && req.method === 'GET') {
      if (!esAdmin) { json(res, 403, { error: 'solo el encargado' }); return; }
      json(res, 200, { usuarios: db.prepare('SELECT id,usuario,rol,pid,creado,cambiar FROM users ORDER BY rol,usuario').all().map(u => Object.assign(u, { cambiar: !!u.cambiar })) });
      return;
    }
    if (ruta === '/api/usuarios' && req.method === 'POST') {
      if (!esAdmin) { json(res, 403, { error: 'solo el encargado' }); return; }
      const b = await leerCuerpo(req);
      const usuario = String(b.usuario || '').toLowerCase().trim();
      if (!USUARIO_RE.test(usuario)) { json(res, 400, { error: 'usuario inválido (3-30, minúsculas/números)' }); return; }
      if (db.prepare('SELECT 1 FROM users WHERE usuario=?').get(usuario)) { json(res, 409, { error: 'ese usuario ya existe' }); return; }
      const rol = ROLES.includes(b.rol) ? b.rol : 'empleado';
      if (rol === 'programador' && !esProg) { json(res, 403, { error: 'solo el programador crea cuentas de programador' }); return; }
      if (rol === 'empleado' && !b.pid) { json(res, 400, { error: 'un empleado necesita persona asociada (pid)' }); return; }
      // 03/09 (piloto): al dar de alta se pone la contraseña GENÉRICA (la misma para
      // todos) con cambio obligatorio en el primer acceso. Es más práctico para dar
      // de alta a la plantilla entera de una vez que leerle a cada uno una clave
      // aleatoria; y como la app obliga a cambiarla al entrar, la genérica nunca
      // queda como contraseña de nadie. El reset individual sigue generando una
      // aleatoria, que es de uno en uno y se lee una sola vez.
      const inicial = !b.password;
      const password = inicial ? PASS_GENERICA : String(b.password);
      if (!inicial && (password.length < 8 || password === PASS_GENERICA)) { json(res, 400, { error: 'la contraseña necesita al menos 8 caracteres y no puede ser la genérica' }); return; }
      crearUsuario(usuario, password, rol, b.pid, inicial);
      auditar(yo, ip, 'usuario-alta', `${usuario} (${rol}${b.pid ? ', ' + b.pid : ''})`);
      json(res, 200, { usuario, rol, pid: b.pid || null, password, generica: inicial, inicial });   // `generica` avisa al frontend de que es la de todos
      return;
    }
    if (ruta === '/api/usuarios/reset' && req.method === 'POST') {
      if (!esAdmin) { json(res, 403, { error: 'solo el encargado' }); return; }
      const { id } = await leerCuerpo(req);
      const u = db.prepare('SELECT * FROM users WHERE id=?').get(+id);
      if (!u) { json(res, 404, { error: 'no existe' }); return; }
      if (u.id === yo.id) { json(res, 400, { error: 'para tu propia cuenta usa «Cambiar contraseña»' }); return; }
      if (u.rol === 'programador' && !esProg) { json(res, 403, { error: 'solo el programador gestiona cuentas de programador' }); return; }
      const password = nuevaPassword();   // inicial aleatoria y de un solo uso: la app obliga a cambiarla
      const salt = crypto.randomBytes(16).toString('hex');
      db.prepare('UPDATE users SET hash=?, salt=?, cambiar=1, gen=gen+1 WHERE id=?').run(hashPass(password, salt), salt, u.id);   // gen+1: fuera de todos sus dispositivos
      PUSH.bajaUsuario(+id);
      auditar(yo, ip, 'usuario-reset', u.usuario);
      json(res, 200, { usuario: u.usuario, password, generica: true, inicial: true });
      return;
    }
    if (ruta === '/api/usuarios' && req.method === 'DELETE') {
      if (!esAdmin) { json(res, 403, { error: 'solo el encargado' }); return; }
      const id = +url.searchParams.get('id');
      const u = db.prepare('SELECT * FROM users WHERE id=?').get(id);
      if (!u) { json(res, 404, { error: 'no existe' }); return; }
      if (u.rol === 'programador' && !esProg) { json(res, 403, { error: 'solo el programador gestiona cuentas de programador' }); return; }
      if (u.rol === 'programador' && db.prepare("SELECT COUNT(*) c FROM users WHERE rol='programador'").get().c <= 1) {
        json(res, 400, { error: 'no puedes borrar el último programador' });
        return;
      }
      if (u.rol === 'admin' && db.prepare("SELECT COUNT(*) c FROM users WHERE rol='admin'").get().c <= 1) {
        json(res, 400, { error: 'no puedes borrar el último encargado' });
        return;
      }
      db.prepare('DELETE FROM users WHERE id=?').run(id);
      PUSH.bajaUsuario(id);
      auditar(yo, ip, 'usuario-baja', u.usuario);
      json(res, 200, { ok: true });
      return;
    }

    // --- núcleo de optimización (encargado y programador) ---
    if (ruta === '/api/nucleo/salud' && req.method === 'GET') {
      if (!esAdmin) { json(res, 403, { error: 'solo el encargado' }); return; }
      if (!NUCLEO_URL) { json(res, 200, { configurado: false, url: null, ok: false }); return; }
      let ok = false;
      try { ok = (await fetch(NUCLEO_URL + '/healthz', { headers: cabecerasNucleo(), signal: AbortSignal.timeout(5000) })).ok; } catch (e) { ok = false; }
      json(res, 200, { configurado: true, url: NUCLEO_URL, ok });   // la clave nunca sale de aquí
      return;
    }
    if (ruta === '/api/nucleo/solve' && req.method === 'POST') {
      if (!esAdmin) { json(res, 403, { error: 'solo el encargado' }); return; }
      if (!NUCLEO_URL) { json(res, 503, { error: 'núcleo no configurado' }); return; }
      // 30 resoluciones cada 10 minutos por usuario: un CP-SAT de 60 s no es gratis
      if (!cupo('nucleo|' + yo.id, 30)) { json(res, 429, { error: 'demasiadas resoluciones seguidas: espera unos minutos' }, { 'Retry-After': '600' }); return; }
      const problema = await leerCuerpo(req, NUCLEO_CUERPO_MAX);   // el cuerpo se reenvía tal cual (mismo JSON)
      const t0 = Date.now();
      let r;
      try {
        r = await fetch(NUCLEO_URL + '/v1/solve', { method: 'POST', headers: cabecerasNucleo(), body: JSON.stringify(problema), signal: AbortSignal.timeout(NUCLEO_TIMEOUT_MS) });
      } catch (e) {
        const vencido = !!e && (e.name === 'TimeoutError' || e.name === 'AbortError');
        auditar(yo, ip, 'nucleo-solve', `${vencido ? 'timeout' : 'error'} · ${Date.now() - t0} ms`);
        json(res, vencido ? 504 : 502, { error: vencido ? 'el núcleo no ha respondido a tiempo' : 'núcleo no disponible' });
        return;
      }
      const texto = await r.text();
      let cuerpo = null; try { cuerpo = JSON.parse(texto); } catch (e) {}
      auditar(yo, ip, 'nucleo-solve', `HTTP ${r.status} · ${Date.now() - t0} ms · ${texto.length} bytes`);
      if (!cuerpo || typeof cuerpo !== 'object') { json(res, 502, { error: 'el núcleo no ha devuelto JSON', status: r.status }); return; }
      json(res, r.status, cuerpo);   // mismo código y mismo JSON que devolvió el núcleo
      return;
    }

    if (ruta === '/api/eventos' && req.method === 'GET') {
      if (clientesSSE.size >= SSE_MAX || sseDe(yo.id) >= SSE_MAX_USUARIO) { json(res, 503, { error: 'demasiadas conexiones abiertas' }, { 'Retry-After': '30' }); return; }
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
      res.uidSSE = yo.id;
      res.write(`event: version\ndata: {"version":${leerEstado().version}}\n\n`);
      clientesSSE.add(res);
      req.on('close', () => clientesSSE.delete(res));
      return;
    }

    json(res, 404, { error: 'no existe' });
  } catch (e) {
    if (e.message === 'cuerpo demasiado grande') { json(res, 413, { error: 'cuerpo demasiado grande' }); return; }
    if (e.message === 'JSON inválido') { json(res, 400, { error: 'JSON inválido' }); return; }
    if (e.code === 'SIN_ESTADO') { json(res, 409, { error: 'La planilla del grupo aún no está creada' }); return; }
    console.error('[shiftia] error:', e.message);   // detalle solo en el log del servidor
    json(res, 500, { error: 'error interno' });      // nunca el mensaje crudo al cliente
  }
});

server.listen(PORT, () => {
  // se imprime el puerto REAL (con PORT=0 el sistema elige uno libre: los tests lo leen de aquí)
  console.log(`[shiftia] escuchando en :${server.address().port} · datos en ${DATA_DIR} (${PERSISTENCIA})`);
  if (PERSISTENCIA === 'volatil') {
    console.log('[shiftia] AVISO: sin volumen (DATA_DIR no definido) — la base de datos se pierde en cada redeploy.');
  } else if (PERSISTENCIA === 'sin-montar') {
    console.log(`[shiftia] AVISO: DATA_DIR=${DATA_DIR} no parece un volumen montado — comprueba el Volume de Railway o la BD se perderá en el próximo redeploy.`);
  }
  if (NUCLEO_URL) console.log(`[shiftia] núcleo de optimización: ${NUCLEO_URL} (${NUCLEO_KEY ? 'con clave' : 'SIN clave'}, tope ${NUCLEO_TIMEOUT_MS / 1000} s)`);
  else console.log('[shiftia] núcleo de optimización no configurado (SHIFTIA_CORE_URL): la planilla automática queda desactivada');
  copiaDiaria();
  setInterval(copiaDiaria, 6 * 3600e3).unref();
  // la tabla de auditoría no crece sin tope: al arrancar y cada 10 minutos
  const podar = () => { try { db.prepare('DELETE FROM auditoria WHERE id < (SELECT COALESCE(MAX(id),0) FROM auditoria) - 20000').run(); } catch (e) {} };
  podar(); setInterval(podar, 600e3).unref();
});

// ---------- cierre ordenado ----------
// Railway manda SIGTERM al despliegue viejo cuando el nuevo pasa el healthcheck. Sin
// manejador, node moría con 143 y Railway lo anotaba como «crashed» (un correo de
// alarma por cada despliegue correcto). Aquí: dejar de aceptar conexiones, cortar los
// canales SSE (son conexiones vivas que server.close() esperaría para siempre), cerrar
// la BD y salir con 0. Si algo se atasca, salida forzada a los 5 s.
let cerrando = false;
function cerrarOrdenado(senal) {
  if (cerrando) return;
  cerrando = true;
  console.log(`[shiftia] ${senal}: cerrando ordenadamente`);
  setTimeout(() => { console.error('[shiftia] cierre forzado tras 5 s'); process.exit(0); }, 5000).unref();
  for (const res of clientesSSE) { try { res.end(); } catch (e) {} }
  clientesSSE.clear();
  server.close(() => {
    try { db.close(); } catch (e) {}
    process.exit(0);
  });
  if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
}
process.on('SIGTERM', () => cerrarOrdenado('SIGTERM'));
process.on('SIGINT', () => cerrarOrdenado('SIGINT'));
