// Tests genéricos del servidor — Shiftia · {{nombre}} (los escribe el motor de creación).
// Lanza el server.js real con una base de datos temporal y lo golpea por HTTP: cuentas de
// fábrica, sesiones, roles, versionado de la planilla, proyección del empleado, usuarios,
// peticiones, copia y eventos. Lo propio del cliente que pase por el servidor se añade aquí.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const M = createRequire(import.meta.url)(join(RAIZ, 'modelo.js'));
const ENCARGADO = '{{cuentas.encargado}}', PROGRAMADOR = '{{cuentas.programador}}', JEFE = '{{cuentas.jefe}}', GENERICA = '{{cuentas.passwordGenerica}}';
const ADMIN_PASS = 'encargado-2026-x', PROG_PASS = 'programador-2026-x';
let servidor, BASE, dataDir;

// Arranca un server.js con PORT=0 (el sistema elige un puerto libre) y lo lee del log: así
// los ficheros de test, que node --test corre a la vez, no chocan.
function arrancar(dir, env) {
  return new Promise((listo, falla) => {
    const p = spawn('node', [join(RAIZ, 'server.js')],
      { env: { ...process.env, PORT: '0', DATA_DIR: dir, TRUST_PROXY: '0', ADMIN_PASSWORD: ADMIN_PASS, PROGRAMADOR_PASSWORD: PROG_PASS, RAILWAY_VOLUME_MOUNT_PATH: dir, ...(env || {}) }, stdio: ['ignore', 'pipe', 'pipe'] });
    let log = '', puerto = null;
    const mira = d => { log += d; if (!puerto) { const m = log.match(/escuchando en :(\d+)/); if (m) puerto = +m[1]; } };
    p.stdout.on('data', mira); p.stderr.on('data', mira);
    const t = setInterval(async () => {
      if (!puerto) return;
      try { if ((await fetch(`http://127.0.0.1:${puerto}/api/salud`)).ok) { clearInterval(t); listo({ p, base: `http://127.0.0.1:${puerto}`, log: () => log, parar: () => new Promise(r => { if (p.exitCode !== null) return r(); p.once('exit', r); p.kill(); }) }); } } catch (e) {}
    }, 60);
    setTimeout(() => { clearInterval(t); p.kill(); falla(new Error('el servidor no arrancó: ' + log)); }, 8000);
  });
}

// mini-cliente con tarro de cookies por identidad
function cliente() {
  let cookie = '';
  const fn = async (metodo, ruta, cuerpo, extra) => {
    const r = await fetch(BASE + ruta, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...(extra || {}) },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
    const sc = r.headers.get('set-cookie');
    if (sc) cookie = sc.split(';')[0];
    let datos = null;
    try { datos = await r.json(); } catch (e) {}
    return { status: r.status, datos, headers: r.headers };
  };
  fn.cookie = () => cookie;
  return fn;
}
const admin = cliente(), prog = cliente(), jefe = cliente(), emp = cliente(), anon = cliente();
const diaMas = n => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const hayShell = () => existsSync(join(RAIZ, 'index.html')) && existsSync(join(RAIZ, 'login.html'));

// La planilla de prueba: la semilla del cliente más dos personas sintéticas, para que el
// test no dependa de que el manifiesto traiga equipo.
function planillaDePrueba() {
  const s = M.semillaCliente();
  const L = s.locales[0].id;
  const P = (id, nombre) => ({ id, nombre, puesto: M.PUESTOS[0].id, locales: [L], franjas: ['M', 'T'], libra: [], partido: { dias: [] }, cocina: { titular: [], reserva: [], soloDias: [] }, abre: {}, noAbre: [], nuncaCon: [], cubreA: [], vetos: [], contrato: { horasSemana: 40 }, ausencias: [{ tipo: 'VAC', desde: '2030-08-01', hasta: '2030-08-15' }], prefs: {}, nota: 'nota privada', supuestos: [] });
  s.staff.push(P('tstuno', 'Test Uno'), P('tstdos', 'Test Dos'));
  M.asignarColores(s.staff);
  return Object.assign(s, { meses: {}, nextId: 1, peticiones: [], avisos: [], historial: [], mesesPublicados: [] });
}

before(async () => {
  dataDir = mkdtempSync(join(tmpdir(), 'shiftia-test-'));
  servidor = await arrancar(dataDir);
  BASE = servidor.base;
});
after(async () => { await servidor?.parar(); rmSync(dataDir, { recursive: true, force: true }); });

test('salud responde sin sesión y dice qué app es', async () => {
  const { status, datos } = await anon('GET', '/api/salud');
  assert.equal(status, 200);
  assert.equal(datos.ok, true);
  assert.equal(datos.app, 'shiftia-{{slug}}');
  assert.equal(datos.persistencia, 'volumen');
});

test('sin sesión la API cierra y la portada es la pantalla de acceso, nunca la app', async () => {
  assert.equal((await anon('GET', '/api/estado')).status, 401);
  assert.equal((await anon('GET', '/api/yo')).status, 401);
  if (!hayShell()) return;
  const r = await fetch(BASE + '/');
  const html = await r.text();
  assert.equal(r.status, 200);
  assert.match(html, /loginForm|logincard/);
  assert.ok(!html.includes('MODELO_START'), 'sin sesión no viaja el modelo');
});

test('las cuentas de fábrica: encargado, programador y jefe (con cambio obligatorio)', async () => {
  const a = await admin('POST', '/api/login', { usuario: ENCARGADO, password: ADMIN_PASS });
  assert.equal(a.status, 200); assert.equal(a.datos.rol, 'admin'); assert.equal(a.datos.cambiar, false);
  const p = await prog('POST', '/api/login', { usuario: PROGRAMADOR, password: PROG_PASS });
  assert.equal(p.status, 200); assert.equal(p.datos.rol, 'programador');
  const j = await jefe('POST', '/api/login', { usuario: JEFE, password: GENERICA });
  assert.equal(j.status, 200); assert.equal(j.datos.rol, 'admin'); assert.equal(j.datos.cambiar, true);
  assert.equal((await jefe('GET', '/api/estado')).status, 403, 'con la genérica no entra hasta cambiarla');
  assert.equal((await jefe('POST', '/api/password', { actual: GENERICA, nueva: 'jefe-clave-2026' })).status, 200);
  assert.equal((await jefe('GET', '/api/yo')).datos.rol, 'admin');
  assert.equal((await anon('POST', '/api/login', { usuario: ENCARGADO, password: 'mala' })).status, 401);
});

test('la planilla: primer guardado, versionado optimista, conflicto y forma exigida', async () => {
  const v0 = await admin('GET', '/api/estado');
  assert.equal(v0.status, 200); assert.equal(typeof v0.datos.version, 'number');
  const est = planillaDePrueba();
  const put = await admin('PUT', '/api/estado', { baseVersion: v0.datos.version, estado: est });
  assert.equal(put.status, 200); assert.equal(put.datos.version, v0.datos.version + 1);
  const stale = await admin('PUT', '/api/estado', { baseVersion: v0.datos.version, estado: est });
  assert.equal(stale.status, 409); assert.equal(stale.datos.version, put.datos.version);
  const cur = await admin('GET', '/api/estado');
  assert.equal(cur.datos.version, put.datos.version);
  assert.equal(cur.datos.estado.staff.length, est.staff.length);
  assert.deepEqual(cur.datos.estado.locales.map(l => l.id), est.locales.map(l => l.id));
  assert.equal((await admin('PUT', '/api/estado', { baseVersion: cur.datos.version, estado: { staff: 'x' } })).status, 400);
  assert.equal((await admin('PUT', '/api/estado', { baseVersion: cur.datos.version, estado: Object.assign({}, est, { peticiones: 'ups' }) })).status, 400);
});

test('el programador ve y escribe todo; la auditoría es solo suya', async () => {
  const cur = await prog('GET', '/api/estado');
  assert.equal(cur.status, 200);
  assert.equal((await prog('PUT', '/api/estado', { baseVersion: cur.datos.version, estado: cur.datos.estado })).status, 200);
  const aud = await prog('GET', '/api/auditoria?n=50');
  assert.equal(aud.status, 200); assert.ok(Array.isArray(aud.datos.filas) && aud.datos.filas.some(f => f.accion === 'login'));
  assert.equal((await admin('GET', '/api/auditoria')).status, 403, 'el encargado no ve la auditoría');
  assert.equal((await admin('GET', '/api/estado/versiones')).status, 200, 'pero sí las versiones de la planilla');
});

test('alta de un empleado con la genérica, cambio obligatorio y estado proyectado', async () => {
  const alta = await admin('POST', '/api/usuarios', { usuario: 'tstuno', rol: 'empleado', pid: 'tstuno' });
  assert.equal(alta.status, 200); assert.equal(alta.datos.generica, true); assert.equal(alta.datos.password, GENERICA);
  assert.equal((await admin('POST', '/api/usuarios', { usuario: 'tstuno', rol: 'empleado', pid: 'tstuno' })).status, 409, 'usuario repetido');
  assert.equal((await admin('POST', '/api/usuarios', { usuario: 'sinficha', rol: 'empleado' })).status, 400, 'un empleado necesita su ficha');
  assert.equal((await admin('POST', '/api/usuarios', { usuario: 'dev2', rol: 'programador' })).status, 403, 'el encargado no crea programadores');
  const login = await emp('POST', '/api/login', { usuario: 'tstuno', password: GENERICA });
  assert.equal(login.status, 200); assert.equal(login.datos.cambiar, true);
  assert.equal((await emp('GET', '/api/estado')).status, 403, 'con la genérica aún no ve nada');
  assert.equal((await emp('POST', '/api/password', { actual: GENERICA, nueva: 'tstuno-clave-1' })).status, 200);
  const r = await emp('GET', '/api/estado');
  assert.equal(r.status, 200);
  const e = r.datos.estado;
  const yo = e.staff.find(p => p.id === 'tstuno'), otro = e.staff.find(p => p.id === 'tstdos');
  assert.equal(yo.nota, 'nota privada', 'lo suyo entero');
  assert.equal(otro.nota, undefined, 'de los demás, ni notas');
  assert.equal(otro.ausencias, undefined, 'ni ausencias');
  assert.equal(otro.contrato, undefined, 'ni contrato');
  assert.ok(otro.nombre && otro.puesto, 'solo identidad y puesto');
  assert.equal(e.patron, undefined, 'la semana tipo es del encargado');
  assert.ok(Array.isArray(e.locales));
  for (const [m, ruta] of [['PUT', '/api/estado'], ['GET', '/api/usuarios'], ['GET', '/api/auditoria'], ['GET', '/api/copia'], ['GET', '/api/estado/versiones'], ['GET', '/api/nucleo/salud']]) {
    const x = await emp(m, ruta, m === 'PUT' ? { baseVersion: 0, estado: e } : undefined);
    assert.equal(x.status, 403, `${m} ${ruta} para un empleado`);
  }
});

test('peticiones: el empleado pide, el encargado lo ve; las inválidas se rechazan', async () => {
  assert.equal((await emp('POST', '/api/peticiones', { tipo: 'VAC', desde: diaMas(20), hasta: diaMas(24), nota: 'unos días' })).status, 200);
  assert.equal((await emp('POST', '/api/peticiones', { tipo: 'OTRO', desde: diaMas(20) })).status, 400, 'tipo fuera de la lista');
  assert.equal((await emp('POST', '/api/peticiones', { tipo: 'VAC', desde: diaMas(24), hasta: diaMas(20) })).status, 400, 'fin antes que inicio');
  const cur = await admin('GET', '/api/estado');
  const mia = cur.datos.estado.peticiones.find(p => p.pid === 'tstuno');
  assert.ok(mia && mia.estado === 'pendiente' && mia.nota === 'unos días');
  assert.equal((await emp('GET', '/api/estado')).datos.estado.peticiones.length, 1, 'el empleado ve las suyas');
});

test('usuarios: lista, reset con contraseña de un solo uso, cambio de rol y baja; nunca sin el último encargado', async () => {
  const lista = () => admin('GET', '/api/usuarios').then(r => r.datos.usuarios);
  const us = await lista();
  for (const u of [ENCARGADO, PROGRAMADOR, JEFE, 'tstuno']) assert.ok(us.some(x => x.usuario === u), `falta ${u}`);
  const tst = us.find(x => x.usuario === 'tstuno');
  const reset = await admin('POST', '/api/usuarios/reset', { id: tst.id });
  assert.equal(reset.status, 200); assert.ok(reset.datos.password && reset.datos.password !== GENERICA && reset.datos.password.length >= 8);
  assert.equal((await emp('GET', '/api/yo')).status, 401, 'el reset revoca sus sesiones');
  const yoAdmin = us.find(x => x.usuario === ENCARGADO), yoJefe = us.find(x => x.usuario === JEFE);
  assert.equal((await admin('POST', '/api/usuarios/rol', { id: yoAdmin.id, rol: 'empleado', pid: 'tstdos' })).status, 400, 'nadie se cambia el rol a sí mismo');
  assert.equal((await admin('POST', '/api/usuarios/rol', { id: yoJefe.id, rol: 'programador' })).status, 403, 'el encargado no reparte el rol de programador');
  assert.equal((await admin('POST', '/api/usuarios/rol', { id: 99999, rol: 'empleado', pid: 'tstdos' })).status, 404);
  const baja = await admin('POST', '/api/usuarios/rol', { id: yoJefe.id, rol: 'empleado', pid: 'tstdos' });
  assert.equal(baja.status, 200);
  assert.equal((await jefe('GET', '/api/yo')).status, 401, 'al cambiar de rol sale de sus dispositivos');
  assert.equal((await admin('POST', '/api/usuarios/rol', { id: yoJefe.id, rol: 'admin' })).status, 200, 'y vuelve a subir');
  assert.equal((await admin(`DELETE`, `/api/usuarios?id=${tst.id}`)).status, 200);
  assert.ok(!(await lista()).some(x => x.usuario === 'tstuno'));
  assert.equal((await admin('DELETE', `/api/usuarios?id=${yoJefe.id}`)).status, 200, 'el jefe se puede borrar mientras quede un encargado');
  assert.equal((await admin('DELETE', `/api/usuarios?id=${yoAdmin.id}`)).status, 400, 'pero no el último encargado');
});

test('copia de seguridad, versiones, sesión y eventos en vivo', async () => {
  const copia = await admin('GET', '/api/copia');
  assert.equal(copia.status, 200);
  assert.equal(copia.datos.formato, 'shiftia-copia-completa');
  assert.ok(copia.datos.estado && Array.isArray(copia.datos.usuarios));
  assert.ok(copia.datos.usuarios.every(u => !u.hash && !u.salt), 'sin secretos');
  const vers = await admin('GET', '/api/estado/versiones');
  assert.ok(Array.isArray(vers.datos.versiones) && vers.datos.versiones.length >= 1);
  const ac = new AbortController();
  const sse = await fetch(BASE + '/api/eventos', { headers: { Cookie: admin.cookie() }, signal: ac.signal });
  assert.equal(sse.status, 200); assert.match(sse.headers.get('content-type'), /text\/event-stream/);
  ac.abort();
  assert.equal((await admin('POST', '/api/logout', {})).status, 200);
  assert.equal((await admin('GET', '/api/yo')).status, 401, 'tras salir, la cookie ya no vale');
});
