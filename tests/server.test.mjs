// Tests del servidor — Shiftia · Grupo Pasarela (node:test, sin dependencias).
// Lanza el server real con una BD temporal y lo golpea por HTTP.
// 14/09: nace de la batería del piloto (Urología) adaptada a los tres roles
// (programador/admin/empleado), a la forma nueva de la planilla (casillas de
// {pid,…} por local y franja) y a la pasarela al núcleo. Sin iCal (fase 3).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const ADMIN_PASS = 'pasarela2026x', PROG_PASS = 'programador2026', GENERICA = 'pasarela2026';
let servidor, BASE, dataDir;

// Arranca un server.js con PORT=0 (el sistema elige un puerto libre) y lo lee del
// log: así los dos ficheros de test, que node --test corre a la vez, no chocan.
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
function cliente(base) {
  let cookie = '';
  const fn = async (metodo, ruta, cuerpo, extra) => {
    const r = await fetch((base || BASE) + ruta, {
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
const admin = cliente();
const prog = cliente();
const jefe = cliente();
const emp = cliente();
const anon = cliente();

// Fechas RELATIVAS a hoy. Un test que fija «2026-09-10» nace con fecha de
// caducidad: es futuro el día que se escribe y pasado unos días después, y
// entonces se cae solo sin que nadie haya roto nada (14/09).
const diaMas = n => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
// mes en curso en hora de Madrid (el servidor decide «mes actual» con esa zona, no en UTC)
const mesMadrid = () => { const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit' }).formatToParts(new Date()); const g = t => p.find(x => x.type === t).value; return `${g('year')}-${g('month')}`; };
// index.html y login.html los produce el build: hasta que existan, «/» responde 404
const hayShell = () => existsSync(join(RAIZ, 'index.html')) && existsSync(join(RAIZ, 'login.html'));
// casilla con la forma de Pasarela: lista ORDENADA de {pid, cocina, abre, origen}
const casilla = (...pids) => pids.map(pid => ({ pid, cocina: false, abre: false, origen: 'manual' }));

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
  assert.equal(datos.app, 'shiftia-pasarela');
  assert.equal(datos.persistencia, 'volumen');
});

test('login con contraseña mala → 401; sin sesión la API cierra', async () => {
  const r = await anon('POST', '/api/login', { usuario: 'oficina', password: 'nope' });
  assert.equal(r.status, 401);
  const r2 = await anon('GET', '/api/estado');
  assert.equal(r2.status, 401);
});

test('login del encargado (admin) y /api/yo', async () => {
  const r = await admin('POST', '/api/login', { usuario: 'oficina', password: ADMIN_PASS });
  assert.equal(r.status, 200);
  assert.equal(r.datos.rol, 'admin');
  assert.equal(r.datos.cambiar, false, 'con ADMIN_PASSWORD no se le pide cambiarla');
  const yo = await admin('GET', '/api/yo');
  assert.equal(yo.datos.rol, 'admin');
});

test('login del programador (usuario «diego» por defecto) y /api/yo con rol programador', async () => {
  const r = await prog('POST', '/api/login', { usuario: 'diego', password: PROG_PASS });
  assert.equal(r.status, 200);
  assert.equal(r.datos.rol, 'programador');
  assert.equal(r.datos.cambiar, false, 'con PROGRAMADOR_PASSWORD no se le pide cambiarla');
  const yo = await prog('GET', '/api/yo');
  assert.equal(yo.status, 200); assert.equal(yo.datos.rol, 'programador'); assert.equal(yo.datos.usuario, 'diego');
});

test('estado: versión 0 al inicio, PUT sube, PUT desfasado → 409', async () => {
  const v0 = await admin('GET', '/api/estado');
  assert.equal(v0.datos.version, 0);
  const est = { staff: [{ id: 'lola', nombre: 'Lola', puesto: 'sala', locales: ['PASARELA'] }], locales: [], meses: {}, peticiones: [], avisos: [] };
  const put = await admin('PUT', '/api/estado', { baseVersion: 0, estado: est });
  assert.equal(put.status, 200);
  assert.equal(put.datos.version, 1);
  const stale = await admin('PUT', '/api/estado', { baseVersion: 0, estado: est });
  assert.equal(stale.status, 409);
  assert.equal(stale.datos.version, 1);
});

// 25/09 (revisión final, datos de producción): la pestaña que quedó abierta con la versión de antes seguía escribiendo
// tras el despliegue (el aviso de versión nueva se cierra con «Ahora no») y su código no sabe de los cierres por fechas
// ni de la lista de días libres puntuales: volvía a llenar el Mónaco cerrado, perdía semanas de «libra otro día» y
// resucitaba parejas «nunca con». La app de ahora guarda `esquema: 2`; en cuanto el servidor tiene un guardado así, un
// PUT de un esquema anterior se rechaza con 426 («recarga la app») y la pestaña vieja deja el cambio en su bandeja de
// salida, que la app nueva reenvía (migrado) al recargar. Mientras nadie haya guardado con la nueva, se acepta.
// Servidor propio: el resto de pruebas guarda estados sin esquema.
test('PUT /api/estado: tras el primer guardado con el esquema de ahora, el de una pestaña de antes se rechaza (426, recarga)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'shiftia-esquema-'));
  const srv = await arrancar(dir);
  try {
    const yo = cliente(srv.base);
    assert.equal((await yo('POST', '/api/login', { usuario: 'oficina', password: ADMIN_PASS })).status, 200);
    const est = e => ({ staff: [{ id: 'lola', nombre: 'Lola', puesto: 'sala', locales: ['PASARELA'] }], locales: [], meses: {}, peticiones: [], avisos: [], ...e });
    // lo que hay en producción: guardados de la versión de antes (esquema 1) — se siguen aceptando
    let r = await yo('PUT', '/api/estado', { baseVersion: 0, estado: est({ esquema: 1 }) });
    assert.equal(r.status, 200);
    r = await yo('PUT', '/api/estado', { baseVersion: 1, estado: est({ esquema: 2 }) });
    assert.equal(r.status, 200, 'la app de ahora guarda');
    for (const viejo of [est({ esquema: 1 }), est({})]) {
      const x = await yo('PUT', '/api/estado', { baseVersion: 2, estado: viejo });
      assert.equal(x.status, 426, JSON.stringify(x.datos));
      assert.match(x.datos.error, /rec[aá]rga/i);
      assert.equal(x.datos.recargar, true);
    }
    const g = await yo('GET', '/api/estado');
    assert.equal(g.datos.version, 2, 'no se guardó nada');
    assert.equal((await yo('PUT', '/api/estado', { baseVersion: 2, estado: est({ esquema: 2 }) })).status, 200);
  } finally { await srv.parar(); rmSync(dir, { recursive: true, force: true }); }
});

test('PUT /api/estado: la forma se comprueba (staff, locales, listas y meses)', async () => {
  const cur = await admin('GET', '/api/estado');
  const base = cur.datos.estado, v = cur.datos.version;
  const malo = async (parche, por) => assert.equal((await admin('PUT', '/api/estado', { baseVersion: v, estado: Object.assign({}, base, parche) })).status, 400, por);
  await malo({ staff: 'ups' }, 'staff debe ser array');
  await malo({ staff: [{ nombre: 'sin id' }] }, 'cada persona lleva id string');
  await malo({ locales: 'ups' }, 'locales debe ser array si viene');
  await malo({ meses: [] }, 'meses es un objeto, no un array');
  for (const k of ['peticiones', 'avisos', 'historial', 'festivos', 'eventos', 'extras', 'mesesPublicados']) await malo({ [k]: 'ups' }, k + ' debe ser array si viene');
  assert.equal((await admin('PUT', '/api/estado', { baseVersion: v, estado: Object.assign({}, base, { locales: undefined, extras: null }) })).status, 200, 'ausentes o null valen');
});

// 24/09 (D11): el cierre de un local por fechas viaja con el estado y el PUT comprueba su forma
test('PUT /api/estado: cierresPuntuales es una lista de cierres con local y días', async () => {
  const cur = await admin('GET', '/api/estado');
  const base = cur.datos.estado, v = cur.datos.version;
  const malo = async (parche, por) => assert.equal((await admin('PUT', '/api/estado', { baseVersion: v, estado: Object.assign({}, base, parche) })).status, 400, por);
  await malo({ cierresPuntuales: 'ups' }, 'debe ser array si viene');
  await malo({ cierresPuntuales: [{ localId: 5, dias: {} }] }, 'localId es texto');
  await malo({ cierresPuntuales: [{ localId: 'MONACO', dias: [] }] }, 'dias es un objeto { iso: [franjas] }');
  await malo({ cierresPuntuales: [{ localId: 'MONACO', dias: { '2026-09-28': 'T' } }] }, 'las franjas de cada día van en lista');
  const c = { id: 'cie_1', localId: 'MONACO', dias: { '2026-09-28': ['T'] }, motivo: 'reforma', detalle: '', decisiones: {}, retirados: [] };
  assert.equal((await admin('PUT', '/api/estado', { baseVersion: v, estado: Object.assign({}, base, { cierresPuntuales: [c] }) })).status, 200);
  assert.deepEqual((await admin('GET', '/api/estado')).datos.estado.cierresPuntuales, [c], 'y se guarda tal cual');
});

test('crear usuario empleado: contraseña GENÉRICA y cambio obligatorio al entrar', async () => {
  // 03/09 (piloto): al dar de alta se pone la genérica, la misma para todos, porque
  // hay que dar de alta a la plantilla entera de una vez. Sigue sin quedarse como
  // contraseña de nadie: la app obliga a cambiarla al entrar.
  const alta = await admin('POST', '/api/usuarios', { usuario: 'lola', rol: 'empleado', pid: 'lola' });
  assert.equal(alta.status, 200);
  assert.equal(alta.datos.password, GENERICA, 'la genérica, no una aleatoria');
  assert.equal(alta.datos.generica, true, 'y el alta lo dice, para que el texto de la app avise');
  assert.equal(alta.datos.inicial, true);
  const otra = await admin('POST', '/api/usuarios', { usuario: 'temporal', rol: 'empleado', pid: 'tere' });
  assert.equal(otra.datos.password, alta.datos.password, 'la misma para todos: es la genérica');
  const login = await emp('POST', '/api/login', { usuario: 'lola', password: alta.datos.password });
  assert.equal(login.status, 200);
  assert.equal(login.datos.pid, 'lola');
  assert.equal(login.datos.cambiar, true, 'al entrar con la inicial se le pide cambiarla');
  const shell = await fetch(BASE + '/', { headers: { Cookie: emp.cookie() } });
  if (hayShell()) { assert.match(await shell.text(), /cambioForm/, 'con la inicial se sirve la pantalla de acceso con el cambio, no la app'); assert.equal(shell.headers.get('x-shiftia-doc'), 'login'); }
  else assert.equal(shell.status, 404, 'sin build todavía: «/» no tiene nada que servir');
  // el servidor lo impone: con la genérica no hay planilla ni peticiones, solo /api/yo, /api/password y salir
  const bloqueado = await emp('GET', '/api/estado');
  assert.equal(bloqueado.status, 403); assert.equal(bloqueado.datos.cambiar, true);
  assert.equal((await emp('POST', '/api/peticiones', { tipo: 'VAC', desde: diaMas(20) })).status, 403);
  assert.equal((await emp('GET', '/api/yo')).status, 200);
  const cambio = await emp('POST', '/api/password', { actual: alta.datos.password, nueva: 'lolaclave1' });
  assert.equal(cambio.status, 200);
  assert.equal((await emp('GET', '/api/yo')).datos.cambiar, false);
  assert.equal((await emp('GET', '/api/estado')).status, 200, 'con contraseña propia ya entra');
});

test('la cuenta del jefe («admin») nace con permisos de encargado, pero sin Actividad', async () => {
  // 17/09: José, el jefe del grupo, entra con su propia cuenta —«admin» a secas, mientras
  // que la oficina (Aroa) entra con «oficina»—. Mismos permisos que el encargado (rol
  // admin) y, por tanto, sin auditoría: Actividad es del programador.
  const r = await jefe('POST', '/api/login', { usuario: 'admin', password: GENERICA });
  assert.equal(r.status, 200);
  assert.equal(r.datos.rol, 'admin', 'mismos permisos que el encargado');
  assert.equal(r.datos.cambiar, true, 'sin JEFE_PASSWORD nace con la genérica y la app le pide cambiarla');
  assert.equal((await jefe('GET', '/api/estado')).status, 403, 'con la genérica aún no entra');
  assert.equal((await jefe('POST', '/api/password', { actual: GENERICA, nueva: 'josepasarela1' })).status, 200);
  assert.equal((await jefe('GET', '/api/estado')).status, 200, 'con contraseña propia ve la planilla');
  assert.equal((await jefe('GET', '/api/auditoria')).status, 403, 'Actividad no: eso es del programador');
  assert.equal((await jefe('POST', '/api/usuarios', { usuario: 'altajefe', rol: 'empleado', pid: 'tere' })).status, 200, 'da altas como el encargado');
  assert.equal((await jefe('POST', '/api/usuarios', { usuario: 'dev3', rol: 'programador' })).status, 403, 'y tampoco crea programadores');
});

test('el jefe le quita los permisos a la oficina desde la app, y se los devuelve', async () => {
  // 17/09 (José): «el usuario de José puede eliminar permisos del usuario de Aroa desde
  // su perfil». Cambiar el rol de una cuenta ya creada no existía: había que hacerlo con
  // la variable ADMIN_PROMOTE y solo hacia arriba.
  const lista = () => jefe('GET', '/api/usuarios').then(r => r.datos.usuarios);
  const ofi = (await lista()).find(u => u.usuario === 'oficina');
  const yoJefe = (await lista()).find(u => u.usuario === 'admin');
  assert.ok(ofi && yoJefe);

  assert.equal((await jefe('POST', '/api/usuarios/rol', { id: yoJefe.id, rol: 'empleado', pid: 'tere' })).status, 400, 'nadie se quita los permisos a sí mismo');
  assert.equal((await jefe('POST', '/api/usuarios/rol', { id: ofi.id, rol: 'programador' })).status, 403, 'un encargado no reparte el rol de programador');
  assert.equal((await jefe('POST', '/api/usuarios/rol', { id: ofi.id, rol: 'empleado' })).status, 400, 'un empleado necesita su persona de la planilla');
  assert.equal((await jefe('POST', '/api/usuarios/rol', { id: 99999, rol: 'empleado', pid: 'tere' })).status, 404);

  const baja = await jefe('POST', '/api/usuarios/rol', { id: ofi.id, rol: 'empleado', pid: 'tere' });
  assert.equal(baja.status, 200);
  assert.equal(baja.datos.rol, 'empleado');
  assert.equal((await lista()).find(u => u.usuario === 'oficina').rol, 'empleado', 'la lista ya la enseña como empleada');
  assert.equal((await admin('GET', '/api/usuarios')).status, 401, 'y su sesión anterior muere: entra de nuevo y ya sin permisos');

  // el jefe se queda solo: ahora ya no puede quitarse a sí mismo ni quedarse el grupo sin encargado
  assert.equal((await jefe('POST', '/api/usuarios/rol', { id: yoJefe.id, rol: 'empleado', pid: 'tere' })).status, 400);

  const alta = await jefe('POST', '/api/usuarios/rol', { id: ofi.id, rol: 'admin' });
  assert.equal(alta.status, 200); assert.equal(alta.datos.rol, 'admin');
  assert.equal((await lista()).find(u => u.usuario === 'oficina').pid, 'tere', 'conserva su ficha de la planilla, como hace ADMIN_PROMOTE con el encargado que además trabaja');
  assert.equal((await admin('POST', '/api/login', { usuario: 'oficina', password: ADMIN_PASS })).status, 200, 'su contraseña no se ha tocado');
  assert.equal((await admin('GET', '/api/estado')).status, 200);
});

test('roles: la auditoría es solo del programador; el encargado crea empleados y encargados, nunca programadores', async () => {
  assert.equal((await admin('GET', '/api/auditoria')).status, 403, 'el encargado no ve la auditoría');
  assert.equal((await emp('GET', '/api/auditoria')).status, 403);
  const aud = await prog('GET', '/api/auditoria?n=50');
  assert.equal(aud.status, 200);
  assert.ok(Array.isArray(aud.datos.filas) && aud.datos.filas.some(f => f.accion === 'login') && aud.datos.total > 0, 'el programador sí');
  // altas del encargado
  const a1 = await admin('POST', '/api/usuarios', { usuario: 'ivan', rol: 'empleado', pid: 'ivan' });
  assert.equal(a1.status, 200); assert.equal(a1.datos.rol, 'empleado');
  const a2 = await admin('POST', '/api/usuarios', { usuario: 'encargado2', rol: 'admin' });
  assert.equal(a2.status, 200); assert.equal(a2.datos.rol, 'admin');
  const a3 = await admin('POST', '/api/usuarios', { usuario: 'dev2', rol: 'programador' });
  assert.equal(a3.status, 403, 'un encargado no crea programadores');
  assert.equal((await emp('POST', '/api/usuarios', { usuario: 'colado', rol: 'admin' })).status, 403, 'un empleado no crea nada');
  // el programador sí
  const a4 = await prog('POST', '/api/usuarios', { usuario: 'dev2', rol: 'programador' });
  assert.equal(a4.status, 200); assert.equal(a4.datos.rol, 'programador');
  const lista = (await admin('GET', '/api/usuarios')).datos.usuarios;
  const dev2 = lista.find(u => u.usuario === 'dev2'), diego = lista.find(u => u.usuario === 'diego'), enc2 = lista.find(u => u.usuario === 'encargado2');
  assert.ok(dev2 && diego && enc2);
  assert.equal(lista.filter(u => u.rol === 'programador').length, 2, 'la lista del encargado también muestra a los programadores');
  // el encargado no toca cuentas de programador
  assert.equal((await admin('POST', '/api/usuarios/reset', { id: dev2.id })).status, 403);
  assert.equal((await admin('DELETE', `/api/usuarios?id=${dev2.id}`)).status, 403);
  // el programador sí, y nunca se queda el grupo sin programador ni sin encargado
  assert.equal((await prog('POST', '/api/usuarios/reset', { id: dev2.id })).status, 200);
  assert.equal((await prog('DELETE', `/api/usuarios?id=${dev2.id}`)).status, 200);
  assert.equal((await prog('DELETE', `/api/usuarios?id=${diego.id}`)).status, 400, 'último programador');
  assert.equal((await prog('DELETE', `/api/usuarios?id=${enc2.id}`)).status, 200, 'el programador borra encargados');
  const jose = lista.find(u => u.usuario === 'admin');
  assert.ok(jose && jose.rol === 'admin', 'la cuenta del jefe sale en la lista con rol de encargado');
  assert.equal((await prog('DELETE', `/api/usuarios?id=${jose.id}`)).status, 200, 'se borra como cualquier encargado');
  const adminU = lista.find(u => u.usuario === 'oficina');
  assert.equal((await prog('DELETE', `/api/usuarios?id=${adminU.id}`)).status, 400, 'último encargado');
  // y el programador escribe la planilla, ve versiones y copia como el encargado
  const cur = await prog('GET', '/api/estado');
  assert.ok(Array.isArray(cur.datos.estado.staff), 'recibe el estado completo, no la proyección');
  assert.equal((await prog('PUT', '/api/estado', { baseVersion: cur.datos.version, estado: cur.datos.estado })).status, 200);
  assert.equal((await prog('GET', '/api/estado/versiones')).status, 200);
  assert.equal((await prog('GET', '/api/copia')).status, 200);
});

// 24/09 (fase 6, S21 y S31): las parejas «nunca con» (con su «flexible» y su interruptor, en las dos fichas) y el
// local habitual viajan en la ficha; el PUT comprueba su forma
test('PUT /api/estado: las parejas «nunca con» y el local habitual de cada ficha tienen su forma', async () => {
  const cur = await admin('GET', '/api/estado');
  const base = cur.datos.estado, v = cur.datos.version;
  const conFicha = extra => Object.assign({}, base, { staff: base.staff.map((p, i) => i ? p : Object.assign({}, p, extra)) });
  const malo = async (extra, por) => assert.equal((await admin('PUT', '/api/estado', { baseVersion: v, estado: conFicha(extra) })).status, 400, por);
  await malo({ nuncaCon: 'lavinia' }, 'nuncaCon es una lista');
  await malo({ nuncaConFlex: [5] }, 'nuncaConFlex, de ids');
  await malo({ nuncaConOff: { lavinia: true } }, 'nuncaConOff es una lista');
  await malo({ localHabitual: 3 }, 'localHabitual es el id de un local');
  assert.equal((await admin('PUT', '/api/estado', { baseVersion: v, estado: conFicha({ nuncaCon: ['x1'], nuncaConFlex: ['x1'], nuncaConOff: [], localHabitual: 'PASARELA' }) })).status, 200);
});
// (fase 6, S21) desde que la pareja está en las dos fichas, la ficha propia llevaría las parejas que declaró un
// compañero («Leo, nunca con Susana Capón»): el empleado no las recibe (no le hacen falta para leer su planilla)
test('el empleado no recibe las parejas «nunca con» de su ficha (son también de sus compañeros)', async () => {
  const cur = await admin('GET', '/api/estado');
  const estado = cur.datos.estado;
  estado.staff = estado.staff.map(p => p.id === 'lola' ? Object.assign(p, { nuncaCon: ['cristian'], nuncaConFlex: ['cristian'], nuncaConOff: ['cristian'] }) : p);
  assert.equal((await admin('PUT', '/api/estado', { baseVersion: cur.datos.version, estado })).status, 200);
  const lola = (await emp('GET', '/api/estado')).datos.estado.staff.find(p => p.id === 'lola');
  assert.ok(lola && lola.puesto, 'su ficha llega');
  assert.equal(lola.nuncaCon, undefined); assert.equal(lola.nuncaConFlex, undefined); assert.equal(lola.nuncaConOff, undefined);
  const guardada = (await admin('GET', '/api/estado')).datos.estado.staff.find(p => p.id === 'lola');
  assert.deepEqual(guardada.nuncaCon, ['cristian'], 'lo guardado no se toca');
});
test('el empleado recibe SOLO lo suyo: locales sí; sin patrón, cierres, historial ni datos de terceros', async () => {
  const cur = await admin('GET', '/api/estado');
  const estado = cur.datos.estado;
  if (!estado.staff.some(p => p.id === 'jenny')) estado.staff.push({ id: 'jenny', nombre: 'Jenny', puesto: 'cocina', locales: ['EL33', 'MONACO'], color: 3 });
  estado.staff = estado.staff.map(p => p.id === 'jenny' ? Object.assign(p, { nota: 'privado', ausencias: [{ tipo: 'BAJ', desde: '2026-09-01', hasta: '2026-09-05', detalle: 'baja médica' }], prefs: { nota: 'privado' }, contrato: { horasSemana: 40 }, cubreA: [{ pid: 'esmeralda', dow: 1 }] }) : p);
  estado.locales = [{ id: 'PASARELA', nombre: 'Pasarela', corto: 'PAS' }, { id: 'EL33', nombre: 'El 33', corto: '33' }];
  estado.patron = { 1: [{ t: 'PASARELA_M', p: 'lola' }] };
  estado.cierres = { '2026-12-25': ['EL33'] };
  estado.extras = [{ id: 'x1', pid: 'jenny', iso: '2026-09-20', horas: 2 }];
  estado.peticiones = [{ id: 'p_ajena', pid: 'jenny', tipo: 'VAC', desde: '2026-10-01', nota: 'cita médica', estado: 'pendiente', ts: 1 }];
  estado.avisos = [{ id: 'a_todos', texto: 'para todos', ts: 1, caducidad: 9999999999999, ocultoPor: ['jenny'] }, { id: 'a_jenny', paraPid: 'jenny', texto: 'solo jenny', ts: 1, caducidad: 9999999999999, ocultoPor: [] }];
  estado.historial = [{ ts: 1, rol: 'admin', txt: 'secreto' }];
  estado.festivos = ['2026-12-25'];
  estado.eventos = [{ id: 'e1', iso: '2026-10-10', equipoId: 'barcelona' }];
  assert.equal((await admin('PUT', '/api/estado', { baseVersion: cur.datos.version, estado })).status, 200);
  const e = (await emp('GET', '/api/estado')).datos.estado;
  const jenny = e.staff.find(p => p.id === 'jenny');
  assert.ok(jenny && jenny.nombre, 've el nombre del compañero (para proponer cambios)');
  assert.deepEqual(Object.keys(jenny).sort(), ['color', 'id', 'locales', 'nombre', 'puesto'], 'de los demás: solo id, nombre, color, puesto y locales');
  assert.equal(jenny.nota, undefined); assert.equal(jenny.ausencias, undefined); assert.equal(jenny.prefs, undefined); assert.equal(jenny.contrato, undefined);
  const lola = e.staff.find(p => p.id === 'lola');
  assert.equal(lola.puesto, 'sala', 'su propia ficha, completa');
  assert.deepEqual(e.locales.map(l => l.id), ['PASARELA', 'EL33'], 'los locales viajan enteros: son configuración del grupo');
  assert.equal(e.patron, undefined, 'la semana tipo no viaja');
  assert.equal(e.cierres, undefined, 'los cierres no viajan');
  assert.deepEqual(e.historial, []); assert.deepEqual(e.extras, []);
  assert.deepEqual(e.peticiones, []);
  assert.deepEqual(e.festivos, ['2026-12-25']); assert.equal(e.eventos.length, 1, 'festivos y eventos sí');
  assert.deepEqual(e.avisos.map(a => a.id), ['a_todos']);
  assert.deepEqual(e.avisos[0].ocultoPor, [], 'no ve quién más ocultó el aviso');
  estado.avisos.push({ id: 'a_varios', paraPids: ['lola', 'jenny', 'ivan'], texto: 'para tres', ts: 1, caducidad: 9999999999999, ocultoPor: [] });
  const cur2 = await admin('GET', '/api/estado');
  assert.equal((await admin('PUT', '/api/estado', { baseVersion: cur2.datos.version, estado })).status, 200);
  const av = (await emp('GET', '/api/estado')).datos.estado.avisos.find(a => a.id === 'a_varios');
  assert.deepEqual(av.paraPids, ['lola'], 'no ve a los demás destinatarios');
  assert.ok(Object.keys(e.meses || {}).length >= 0 && e.festivos, 'sí recibe planilla y festivos');
});

test('el empleado NO puede escribir la planilla completa', async () => {
  const r = await emp('PUT', '/api/estado', { baseVersion: 1, estado: { staff: [] } });
  assert.equal(r.status, 403);
});

test('el empleado crea peticiones solo para sí mismo (pid del cuerpo ignorado)', async () => {
  const r = await emp('POST', '/api/peticiones', { pid: 'otro', tipo: 'VAC', desde: diaMas(20), hasta: diaMas(22), nota: 'playa' });
  assert.equal(r.status, 200);
  assert.equal(r.datos.peticion.pid, 'lola');
  const est = await admin('GET', '/api/estado');
  const pets = est.datos.estado.peticiones.filter(x => x.pid === 'lola');
  assert.equal(pets.length, 1);
  assert.equal(pets[0].pid, 'lola');
  const mala = await emp('POST', '/api/peticiones', { tipo: 'HACK', desde: 'x' });
  assert.equal(mala.status, 400);
});

test('avisos: el empleado oculta el suyo y queda registrado', async () => {
  const est = await admin('GET', '/api/estado');
  est.datos.estado.avisos = [{ id: 'a1', texto: 'Reunión el lunes', ts: 1, caducidad: 9999999999999, ocultoPor: [] }];
  const put = await admin('PUT', '/api/estado', { baseVersion: est.datos.version, estado: est.datos.estado });
  assert.equal(put.status, 200);
  const oc = await emp('POST', '/api/avisos/ocultar', { ids: ['a1'] });
  assert.equal(oc.status, 200);
  const despues = await admin('GET', '/api/estado');
  assert.deepEqual(despues.datos.estado.avisos[0].ocultoPor, ['lola']);
});

test('SSE emite la versión al escribir', async () => {
  const cookie = (await (async () => {
    const r = await fetch(BASE + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario: 'oficina', password: ADMIN_PASS }) });
    return r.headers.get('set-cookie').split(';')[0];
  })());
  const ctl = new AbortController();
  const res = await fetch(BASE + '/api/eventos', { headers: { Cookie: cookie }, signal: ctl.signal });
  const lector = res.body.getReader();
  const decoder = new TextDecoder();
  let acumulado = '';
  const espera = (async () => {
    while (!/"version":\d+/.test(acumulado)) {
      const { value, done } = await lector.read();
      if (done) break;
      acumulado += decoder.decode(value);
    }
  })();
  await espera; // primer evento con la versión actual
  const antes = acumulado;
  const est = await admin('GET', '/api/estado');
  await admin('PUT', '/api/estado', { baseVersion: est.datos.version, estado: est.datos.estado });
  await new Promise(r => setTimeout(r, 300));
  const { value } = await lector.read();
  acumulado += decoder.decode(value || new Uint8Array());
  assert.ok(acumulado.length > antes.length && /"version":\d+/.test(acumulado), 'llegó el evento de versión');
  ctl.abort();
});

test('estáticos: sin sesión la pantalla de acceso, con sesión la app; el resto del repo NUNCA', async () => {
  const acceso = await fetch(BASE + '/');
  if (hayShell()) {
    assert.equal(acceso.status, 200);
    const txtAcceso = await acceso.text();
    assert.match(txtAcceso, /loginForm/);
    assert.ok(!/MODELO_START|semillaPasarela/.test(txtAcceso), 'sin sesión no viaja la app ni la plantilla');
    assert.equal(acceso.headers.get('cache-control'), 'no-store');
    assert.equal(acceso.headers.get('x-shiftia-doc'), 'login');
    const app = await fetch(BASE + '/', { headers: { Cookie: admin.cookie() } });
    assert.equal(app.status, 200);
    const txtApp = await app.text();
    assert.match(txtApp, /MODELO_START/);
    assert.equal(app.headers.get('x-shiftia-doc'), 'app');
    for (const [k, v] of [['x-content-type-options', 'nosniff'], ['x-frame-options', 'DENY'], ['referrer-policy', 'same-origin']]) assert.equal(app.headers.get(k), v, k);
    assert.match(app.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  } else {
    // 14/09: el build (index.html/login.html) aún no existe en este repo: «/» da
    // 404 limpio y con cabeceras; cuando exista, la rama de arriba lo cubre
    assert.equal(acceso.status, 404);
    assert.equal((await fetch(BASE + '/', { headers: { Cookie: admin.cookie() } })).status, 404);
  }
  for (const [k, v] of [['x-content-type-options', 'nosniff'], ['x-frame-options', 'DENY'], ['referrer-policy', 'same-origin']]) assert.equal(acceso.headers.get(k), v, k + ' en «/»');
  assert.match(acceso.headers.get('content-security-policy'), /script-src 'self' 'unsafe-inline' https:\/\/cdnjs\.cloudflare\.com;/);
  assert.equal((await fetch(BASE + '/api/salud')).headers.get('x-content-type-options'), 'nosniff', 'también en la API');
  for (const ruta of ['/server.js', '/modelo.js', '/estado-servidor.js', '/package.json', '/.git/config', '/../server.js', '/data/shiftia.db', '/src/app/33-actualizacion.js', '/tests/server.test.mjs']) {
    const r = await fetch(BASE + ruta);
    assert.equal(r.status, 404, ruta + ' debe ser 404');
  }
  // lista blanca: sw.js, manifest, iconos, vendor y logotipos (si el fichero está)
  const sw = await fetch(BASE + '/sw.js');
  assert.equal(sw.status, 200); assert.match(sw.headers.get('content-type'), /javascript/);
  const logo = await fetch(BASE + '/assets/shiftia-logo.svg');
  if (existsSync(join(RAIZ, 'assets/shiftia-logo.svg'))) { assert.equal(logo.status, 200); assert.equal(logo.headers.get('content-type'), 'image/svg+xml'); }
  else assert.equal(logo.status, 404);
  const logoP = await fetch(BASE + '/assets/pasarela-logo.png');
  assert.equal(logoP.status, existsSync(join(RAIZ, 'assets/pasarela-logo.png')) ? 200 : 404, 'el logo del grupo solo si existe');
  assert.equal((await fetch(BASE + '/assets/otro.svg')).status, 404, 'fuera de la lista blanca, nada');
});

test('cambio de contraseña propio: la vieja deja de valer', async () => {
  const mal = await emp('POST', '/api/password', { actual: 'nope', nueva: 'nuevaclave1' });
  assert.equal(mal.status, 401);
  const corta = await emp('POST', '/api/password', { actual: 'x', nueva: 'corta' });
  assert.ok([400, 401].includes(corta.status));
});

test('el cambio de contraseña limpia la marca, veta la genérica y REVOCA las demás sesiones', async () => {
  const veto = await emp('POST', '/api/password', { actual: 'lolaclave1', nueva: GENERICA });
  assert.equal(veto.status, 400);
  const otroMovil = cliente();
  assert.equal((await otroMovil('POST', '/api/login', { usuario: 'lola', password: 'lolaclave1' })).status, 200);
  assert.equal((await otroMovil('GET', '/api/yo')).status, 200);
  const cambio = await emp('POST', '/api/password', { actual: 'lolaclave1', nueva: 'mipropiaclave1' });
  assert.equal(cambio.status, 200);
  assert.ok(cambio.headers.get('set-cookie'), 'este dispositivo recibe cookie nueva');
  const yo = await emp('GET', '/api/yo');
  assert.equal(yo.status, 200); assert.equal(yo.datos.cambiar, false);
  assert.equal((await otroMovil('GET', '/api/yo')).status, 401, 'el otro dispositivo queda fuera');
});

test('«salir de todos los dispositivos» revoca las cookies; «mantener sesión» decide la duración', async () => {
  const a = cliente(), b = cliente();
  assert.equal((await a('POST', '/api/login', { usuario: 'lola', password: 'mipropiaclave1', recordar: false })).status, 200);
  assert.ok(!/Max-Age/.test(a.cookie() + (await a('GET', '/api/yo')).headers.get('set-cookie')), 'sin recordar: cookie de sesión');
  const lb = await b('POST', '/api/login', { usuario: 'lola', password: 'mipropiaclave1' });
  assert.match(lb.headers.get('set-cookie'), /Max-Age=2592000/);
  assert.equal((await a('POST', '/api/logout', { todos: true })).status, 200);
  assert.equal((await b('GET', '/api/yo')).status, 401);
  assert.equal((await emp('GET', '/api/yo')).status, 401);
  assert.equal((await emp('POST', '/api/login', { usuario: 'lola', password: 'mipropiaclave1' })).status, 200);
});

test('reset de contraseña vuelve a una inicial y borrado del último encargado bloqueado', async () => {
  const lista = await admin('GET', '/api/usuarios');
  const lola = lista.datos.usuarios.find(u => u.usuario === 'lola');
  const propio = lista.datos.usuarios.find(u => u.usuario === 'oficina');
  assert.equal((await admin('POST', '/api/usuarios/reset', { id: propio.id })).status, 400, 'el encargado no se resetea a sí mismo');
  const reset = await admin('POST', '/api/usuarios/reset', { id: lola.id });
  assert.equal(reset.status, 200);
  assert.match(reset.datos.password, /^[a-z0-9]{10}$/);
  assert.equal((await emp('GET', '/api/yo')).status, 401, 'el reset expulsa al empleado de sus dispositivos');
  const relogin = await emp('POST', '/api/login', { usuario: 'lola', password: reset.datos.password });
  assert.equal(relogin.status, 200);
  assert.equal(relogin.datos.cambiar, true);
  assert.equal((await emp('POST', '/api/password', { actual: reset.datos.password, nueva: 'lolaclave2' })).status, 200);
  const adminU = lista.datos.usuarios.find(u => u.rol === 'admin');
  const borra = await admin('DELETE', `/api/usuarios?id=${adminU.id}`);
  assert.equal(borra.status, 400);
});

test('rate limit de login: a la novena va la vencida (429)', async () => {
  const otro = cliente();
  let ultimo = 0;
  for (let i = 0; i < 9; i++) {
    const r = await otro('POST', '/api/login', { usuario: 'oficina', password: 'mal' + i });
    ultimo = r.status;
  }
  assert.equal(ultimo, 429);
});

test('el rate limit NO se evade rotando X-Forwarded-For (misma IP de socket)', async () => {
  // 9 intentos fallidos con XFF distinto cada vez → debe acabar en 429 igual
  let ultimo = 0;
  for (let i = 0; i < 10; i++) {
    const r = await fetch(BASE + '/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': `1.2.3.${i}` },
      body: JSON.stringify({ usuario: 'oficina', password: 'malXFF' + i }),
    });
    ultimo = r.status;
  }
  assert.equal(ultimo, 429, 'rotar XFF no debe evadir el bloqueo por IP de socket');
});

test('un delta de empleado NO puede crear la planilla si el servidor está vacío', async () => {
  // servidor propio con estado 0
  const dir2 = mkdtempSync(join(tmpdir(), 'shiftia-vac-'));
  const s2 = await arrancar(dir2);
  const call = cliente(s2.base);
  try {
    await call('POST', '/api/login', { usuario: 'oficina', password: ADMIN_PASS });
    const alta = await call('POST', '/api/usuarios', { usuario: 'emplola', rol: 'empleado', pid: 'lola' });
    assert.equal(alta.status, 200);
    const e = cliente(s2.base);
    const le = await e('POST', '/api/login', { usuario: 'emplola', password: alta.datos.password });
    assert.equal(le.status, 200);
    assert.equal((await e('POST', '/api/password', { actual: alta.datos.password, nueva: 'clavepropia9' })).status, 200);
    const pet = await e('POST', '/api/peticiones', { tipo: 'VAC', desde: diaMas(20) });
    assert.equal(pet.status, 409, 'sin planilla, el delta del empleado se rechaza');
    const salud = await fetch(s2.base + '/api/salud').then(r => r.json());
    assert.equal(salud.version, 0, 'no se ha creado ningún estado fantasma');
  } finally { await s2.parar(); rmSync(dir2, { recursive: true, force: true }); }
});

test('el 500 nunca filtra el mensaje interno', async () => {
  // cookie con codificación porcentual inválida → no debe romper ni filtrar detalle
  const r = await fetch(BASE + '/api/yo', { headers: { Cookie: 'sesion=%E0%A4%A' } });
  assert.equal(r.status, 401, 'cookie malformada = sin sesión, no 500');
  const d = await r.json().catch(() => ({}));
  assert.ok(!/scrypt|sqlite|at Object|\\n/.test(JSON.stringify(d)), 'sin traza interna');
});

test('push: clave pública, alta y baja de suscripción', async () => {
  const k = await emp('GET', '/api/push/clave');
  assert.equal(k.status, 200); assert.equal(Buffer.from(k.datos.clave, 'base64url').length, 65);
  const mala = await emp('POST', '/api/push/suscribir', { suscripcion: { endpoint: 'http://x', keys: {} } });
  assert.equal(mala.status, 400);
  const ok = await emp('POST', '/api/push/suscribir', { suscripcion: { endpoint: 'https://fcm.googleapis.com/fcm/send/test1', keys: { p256dh: 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8', auth: 'BTBZMqHH6r4Tts7J_aSIgg' } } });
  assert.equal(ok.status, 200);
  assert.equal((await emp('POST', '/api/push/baja', { endpoint: 'https://fcm.googleapis.com/fcm/send/test1' })).status, 200);
  assert.equal((await anon('GET', '/api/push/clave')).status, 401);
});

test('cambio de turno entre compañeros: casillas de {pid,…}, sin categorías; solo el compañero propuesto responde', async () => {
  // el empleado lola propone un cambio con ivan (usuario creado en el test de roles)
  const ivan = cliente();
  assert.equal((await ivan('POST', '/api/login', { usuario: 'ivan', password: GENERICA })).status, 200);
  assert.equal((await ivan('POST', '/api/password', { actual: GENERICA, nueva: 'ivanclave1' })).status, 200);
  // asegurar que ivan y jenny están en la plantilla
  const cur = await admin('GET', '/api/estado');
  const estado = cur.datos.estado;
  if (!estado.staff.some(p => p.id === 'ivan')) estado.staff.push({ id: 'ivan', nombre: 'Iván', puesto: 'sala', locales: ['PASARELA'] });
  // Los dos turnos, SIEMPRE EN EL FUTURO (con fechas fijas el test caducaba solo, 14/09).
  const A = diaMas(7), B = diaMas(9);
  estado.meses = estado.meses || {};
  for (const iso of [A, B]) { const k = iso.slice(0, 7); estado.meses[k] = estado.meses[k] || { apertura: {}, asig: {} }; }
  // 14/09: la casilla es una lista ORDENADA de {pid, cocina, abre, origen}, no de pids
  estado.meses[A.slice(0, 7)].asig[A] = { PASARELA_M: casilla('lola', 'tere') };
  estado.meses[B.slice(0, 7)].asig[B] = { PASARELA_T: casilla('ivan'), EL33_M: casilla('jenny') };
  delete estado.mesesPublicados;
  assert.equal((await admin('PUT', '/api/estado', { baseVersion: cur.datos.version, estado })).status, 200);
  assert.equal((await emp('POST', '/api/login', { usuario: 'lola', password: 'lolaclave2' })).status, 200);
  const mal = await emp('POST', '/api/peticiones', { tipo: 'cambio', desde: A, slotId: 'PASARELA_M', conPid: 'ivan', conIso: 'no-fecha', conSlotId: 'PASARELA_T' });
  assert.equal(mal.status, 400);
  assert.equal((await emp('POST', '/api/peticiones', { tipo: 'cambio', desde: A, slotId: 'PASARELA_M', conPid: 'lola', conIso: B, conSlotId: 'PASARELA_T' })).status, 400, 'no a uno mismo');
  assert.equal((await emp('POST', '/api/peticiones', { tipo: 'cambio', desde: '2020-01-01', slotId: 'PASARELA_M' })).status, 400, 'turno pasado');
  assert.equal((await emp('POST', '/api/peticiones', { tipo: 'cambio', desde: A, slotId: 'ZAPA_M', conPid: 'ivan', conIso: B, conSlotId: 'PASARELA_T' })).status, 400, 'ese turno no es suyo');
  assert.equal((await emp('POST', '/api/peticiones', { tipo: 'cambio', desde: A, slotId: 'PASARELA_M', conPid: 'ivan', conIso: B, conSlotId: 'EL33_M' })).status, 400, 'el compañero no tiene ese turno');
  assert.equal((await emp('POST', '/api/peticiones', { tipo: 'cambio', desde: A, slotId: 'PASARELA_M', conPid: 'nadie', conIso: B, conSlotId: 'PASARELA_T' })).status, 400, 'el compañero no existe');
  // sin categorías: una de sala puede proponer un cambio a alguien de cocina
  const cruzado = await emp('POST', '/api/peticiones', { tipo: 'cambio', desde: A, slotId: 'PASARELA_M', conPid: 'jenny', conIso: B, conSlotId: 'EL33_M' });
  assert.equal(cruzado.status, 200, 'sala ↔ cocina vale: ' + (cruzado.datos && cruzado.datos.error));
  assert.equal((await emp('POST', '/api/peticiones/retirar', { id: cruzado.datos.peticion.id })).status, 200);
  const pet = await emp('POST', '/api/peticiones', { tipo: 'cambio', desde: A, slotId: 'PASARELA_M', conPid: 'ivan', conIso: B, conSlotId: 'PASARELA_T' });
  assert.equal(pet.status, 200, pet.datos && pet.datos.error); assert.equal(pet.datos.peticion.conIso, B);
  const id = pet.datos.peticion.id;
  assert.equal((await emp('POST', '/api/peticiones/responder', { id, aceptar: true })).status, 403, 'el proponente no puede aceptar por el otro');
  assert.equal((await ivan('POST', '/api/peticiones/responder', { id, aceptar: true })).status, 200);
  const est2 = (await admin('GET', '/api/estado')).datos.estado;
  assert.equal(est2.peticiones.find(x => x.id === id).aceptada, true);
  const vistaIvan = (await ivan('GET', '/api/estado')).datos.estado;
  assert.ok(vistaIvan.peticiones.some(x => x.id === id), 'el compañero propuesto ve la propuesta que le hacen');
  assert.equal((await ivan('POST', '/api/peticiones/responder', { id, aceptar: false })).status, 200, 'puede cambiar de idea mientras siga pendiente');
  const est3 = (await admin('GET', '/api/estado')).datos.estado;
  assert.equal(est3.peticiones.find(x => x.id === id).estado, 'rechazada');
  assert.ok(est3.avisos.some(a => a.paraPid === 'lola' && /rechazado/.test(a.texto)), 'lola recibe el aviso del rechazo');
  assert.equal((await ivan('POST', '/api/peticiones/responder', { id, aceptar: true })).status, 404, 'ya no está pendiente');
});

test('peticiones: fechas reales y con sentido; retirar la propia; ocultar sin cambios no crea versión', async () => {
  assert.equal((await emp('POST', '/api/peticiones', { tipo: 'VAC', desde: '2026-02-30' })).status, 400, 'fecha inexistente');
  assert.equal((await emp('POST', '/api/peticiones', { tipo: 'VAC', desde: diaMas(26), hasta: diaMas(21) })).status, 400, 'hasta < desde');
  assert.equal((await emp('POST', '/api/peticiones', { tipo: 'VAC', desde: diaMas(500) })).status, 400, 'año erróneo');
  assert.equal((await emp('POST', '/api/peticiones', { tipo: 'VAC', desde: diaMas(26), hasta: diaMas(200) })).status, 400, 'más de 3 meses');
  const ok = await emp('POST', '/api/peticiones', { tipo: 'LD', desde: diaMas(26), nota: '  varios   espacios  ' });
  assert.equal(ok.status, 200); assert.equal(ok.datos.peticion.nota, 'varios espacios');
  const otro = cliente();
  assert.equal((await otro('POST', '/api/login', { usuario: 'ivan', password: 'ivanclave1' })).status, 200);
  assert.equal((await otro('POST', '/api/peticiones/retirar', { id: ok.datos.peticion.id })).status, 403, 'solo quien la pidió');
  assert.equal((await emp('POST', '/api/peticiones/retirar', { id: ok.datos.peticion.id })).status, 200);
  const e = (await admin('GET', '/api/estado')).datos;
  assert.equal(e.estado.peticiones.find(x => x.id === ok.datos.peticion.id).estado, 'retirada');
  assert.equal((await emp('POST', '/api/peticiones/retirar', { id: ok.datos.peticion.id })).status, 404, 'ya no está pendiente');
  const oc = await emp('POST', '/api/avisos/ocultar', { ids: [] });
  assert.equal(oc.status, 200); assert.equal(oc.datos.version, e.version, 'sin cambios no sube la versión');
  assert.equal((await emp('POST', '/api/avisos/ocultar', { ids: new Array(201).fill('x') })).status, 400);
});

test('SSE: tope por usuario sin tumbar el servidor (la conexión de más recibe 503)', async () => {
  const ctl = new AbortController();
  const abiertas = [];
  for (let i = 0; i < 6; i++) abiertas.push(await fetch(BASE + '/api/eventos', { headers: { Cookie: emp.cookie() }, signal: ctl.signal }));
  assert.ok(abiertas.every(r => r.status === 200));
  const sobra = await fetch(BASE + '/api/eventos', { headers: { Cookie: emp.cookie() }, signal: ctl.signal });
  assert.equal(sobra.status, 503);
  ctl.abort();
  await new Promise(r => setTimeout(r, 100));
  assert.equal((await fetch(BASE + '/api/salud')).status, 200, 'el servidor sigue vivo');
});

test('cuerpos: 256 KB de tope fuera de la planilla del encargado (413), sin caer', async () => {
  const grande = 'x'.repeat(300 * 1024);
  const r = await fetch(BASE + '/api/peticiones', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: emp.cookie() }, body: JSON.stringify({ tipo: 'VAC', desde: diaMas(26), nota: grande }) }).catch(() => ({ status: 413 }));
  assert.ok([413, 400].includes(r.status));
  assert.equal((await fetch(BASE + '/api/salud')).status, 200);
});

test('CSRF: origen ajeno o cuerpo que no es JSON se rechazan; versiones y copia solo con sesión de encargado', async () => {
  const ajeno = await fetch(BASE + '/api/peticiones', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: emp.cookie(), Origin: 'https://evil.example' }, body: JSON.stringify({ tipo: 'VAC', desde: diaMas(26) }) });
  assert.equal(ajeno.status, 403);
  const texto = await fetch(BASE + '/api/peticiones', { method: 'POST', headers: { 'Content-Type': 'text/plain', Cookie: emp.cookie() }, body: JSON.stringify({ tipo: 'VAC', desde: diaMas(26) }) });
  assert.equal(texto.status, 415);
  const propio = await fetch(BASE + '/api/peticiones', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: emp.cookie(), Origin: BASE, 'Sec-Fetch-Site': 'same-origin' }, body: JSON.stringify({ tipo: 'LD', desde: diaMas(27) }) });
  assert.equal(propio.status, 200);
  assert.equal((await emp('GET', '/api/estado/versiones')).status, 403);
  assert.equal((await emp('GET', '/api/copia')).status, 403);
  const vs = await admin('GET', '/api/estado/versiones');
  assert.equal(vs.status, 200); assert.ok(vs.datos.versiones.length >= 2, 'el servidor conserva versiones anteriores');
  const una = await admin('GET', '/api/estado/versiones?v=' + vs.datos.versiones[1].version);
  assert.equal(una.status, 200); assert.ok(Array.isArray(una.datos.estado.staff));
  const copia = await admin('GET', '/api/copia');
  assert.equal(copia.status, 200); assert.equal(copia.datos.formato, 'shiftia-copia-completa');
  assert.ok(copia.datos.usuarios.some(u => u.usuario === 'lola') && copia.datos.usuarios.some(u => u.rol === 'programador') && copia.datos.estado);
  assert.ok(copia.datos.usuarios.every(u => u.hash === undefined && u.salt === undefined) && copia.datos.vapid === undefined && copia.datos.ical_tokens === undefined, 'la copia no lleva secretos');
  assert.equal(copia.datos.inventario.enlacesCalendario, undefined, 'sin iCal (fase 3) no hay enlaces que contar');
  assert.equal(typeof copia.datos.inventario.dispositivosPush, 'number');
  const nulo = await fetch(BASE + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: 'null' });
  assert.ok([401, 429].includes(nulo.status), 'un cuerpo null no es un 500');
  const ajenoHost = await fetch(BASE + '/api/peticiones', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: emp.cookie(), Origin: BASE, 'X-Forwarded-Host': 'otro.example, ' + BASE.replace('http://', '') }, body: JSON.stringify({ tipo: 'LD', desde: diaMas(28) }) });
  assert.equal(ajenoHost.status, 200, 'X-Forwarded-Host con varios valores: vale si uno coincide');
  const debil = await admin('POST', '/api/usuarios', { usuario: 'debil', rol: 'empleado', pid: 'tere', password: '1' });
  assert.equal(debil.status, 400, 'alta con contraseña débil');
  const lista = await admin('GET', '/api/usuarios');
  assert.ok(lista.datos.usuarios.every(u => typeof u.cambiar === 'boolean'), 'la lista dice quién sigue con la genérica');
});

test('CSRF: el dominio propio y su www son el mismo sitio', async () => {
  // Reproducido en producción (piloto): entrar por el apex y postear a www devolvía
  // 403 «origen no permitido» y no se podía entrar. Se prueba en /api/logout: pasa
  // por la misma barrera y no tiene limitador de intentos. Sin cookie devuelve 401,
  // así que el contraste es limpio: 403 = la barrera de origen lo rechazó ·
  // 401 = la pasó y llegó a la sesión. El host se simula con X-Forwarded-Host (que
  // es lo que hace Railway con un dominio a medida).
  const post = (origen, xfh) => fetch(BASE + '/api/logout', {
    method: 'POST',
    headers: Object.assign({ 'Content-Type': 'application/json', Origin: origen }, xfh ? { 'X-Forwarded-Host': xfh } : {}),
    body: '{}',
  });
  assert.equal((await post('https://grupopasarela.example', 'www.grupopasarela.example')).status, 401, 'ápice → www: pasa la barrera');
  assert.equal((await post('https://www.grupopasarela.example', 'grupopasarela.example')).status, 401, 'www → ápice: también');
  assert.equal((await post('https://evil.example', 'www.grupopasarela.example')).status, 403, 'otro dominio: rechazado');
  assert.equal((await post('https://wwwevil.example', 'www.grupopasarela.example')).status, 403, '«wwwevil» no es «evil»');
  assert.equal((await post('https://otro.grupopasarela.example', 'www.grupopasarela.example')).status, 403, 'solo www, no cualquier subdominio');
});

// ───────── feedback 07/09 (piloto): meses visibles u ocultos para el personal
test('meses publicados: el empleado no recibe los meses futuros ocultos; el actual y los pasados siempre', async () => {
  const cur = await admin('GET', '/api/estado');
  const estado = cur.datos.estado;
  estado.meses = estado.meses || {};
  const hoyK = mesMadrid();
  // dos meses futuros: uno publicado y otro no; el mes en curso, con turno de lola
  const [y, m] = hoyK.split('-').map(Number);
  const k1 = `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, '0')}`;
  const k2 = `${m >= 11 ? y + 1 : y}-${String(((m + 1) % 12) + 1).padStart(2, '0')}`;
  estado.meses[hoyK] = estado.meses[hoyK] || { apertura: {}, asig: {} };
  estado.meses[k1] = { apertura: {}, asig: { [k1 + '-05']: { PASARELA_M: casilla('lola') } } };
  estado.meses[k2] = { apertura: {}, asig: { [k2 + '-05']: { PASARELA_M: casilla('lola') } } };
  estado.mesesPublicados = [k2];
  assert.equal((await admin('PUT', '/api/estado', { baseVersion: cur.datos.version, estado })).status, 200);
  const e = (await emp('GET', '/api/estado')).datos.estado;
  assert.ok(e.meses[hoyK], 'el mes en curso siempre llega');
  assert.equal(e.meses[k1], undefined, `${k1} está oculto: no viaja`);
  assert.ok(e.meses[k2], `${k2} está publicado: sí viaja`);
  assert.deepEqual(e.mesesPublicados, [k2], 'la lista viaja para que el panel diga «aún no publicado»');
  const a = (await admin('GET', '/api/estado')).datos.estado;
  assert.ok(a.meses[k1] && a.meses[k2], 'el encargado lo ve todo');
  // y no se puede pedir un cambio de turno sobre un mes oculto
  const pet = await emp('POST', '/api/peticiones', { tipo: 'cambio', desde: k1 + '-05', slotId: 'PASARELA_M', conPid: 'ivan', conIso: k1 + '-06', conSlotId: 'PASARELA_M' });
  assert.equal(pet.status, 400); assert.match(pet.datos.error, /no está publicado/);
  // la forma del campo se comprueba en el PUT
  const cur2 = await admin('GET', '/api/estado');
  const mal = await admin('PUT', '/api/estado', { baseVersion: cur2.datos.version, estado: Object.assign({}, cur2.datos.estado, { mesesPublicados: 'ups' }) });
  assert.equal(mal.status, 400);
  // sin lista (planillas anteriores): todo visible
  const cur3 = await admin('GET', '/api/estado');
  const sinLista = Object.assign({}, cur3.datos.estado); delete sinLista.mesesPublicados;
  assert.equal((await admin('PUT', '/api/estado', { baseVersion: cur3.datos.version, estado: sinLista })).status, 200);
  const e2 = (await emp('GET', '/api/estado')).datos.estado;
  assert.ok(e2.meses[k1] && e2.meses[k2], 'sin lista, el empleado ve los dos');
});

// ───────── 14/09: pasarela al núcleo de optimización (shiftia-core)
test('núcleo sin configurar: salud dice {configurado:false}, solve da 503; empleados y anónimos, fuera', async () => {
  const s = await admin('GET', '/api/nucleo/salud');
  assert.equal(s.status, 200);
  assert.deepEqual(s.datos, { configurado: false, url: null, ok: false });
  const sp = await prog('GET', '/api/nucleo/salud');
  assert.equal(sp.status, 200); assert.equal(sp.datos.configurado, false, 'el programador también lo consulta');
  const r = await admin('POST', '/api/nucleo/solve', { horizon: { start: diaMas(1), end: diaMas(7) } });
  assert.equal(r.status, 503); assert.equal(r.datos.error, 'núcleo no configurado');
  assert.equal((await prog('POST', '/api/nucleo/solve', {})).status, 503);
  assert.equal((await emp('GET', '/api/nucleo/salud')).status, 403, 'el empleado no pregunta al núcleo');
  assert.equal((await emp('POST', '/api/nucleo/solve', {})).status, 403);
  assert.equal((await anon('GET', '/api/nucleo/salud')).status, 401);
  assert.equal((await anon('POST', '/api/nucleo/solve', {})).status, 401);
});

test('núcleo configurado: salud sondea /healthz sin exponer la clave; solve reenvía con X-API-Key y devuelve código y JSON; timeout → 504', async () => {
  // núcleo FALSO en este mismo proceso: anota lo que recibe y contesta según el cuerpo
  const visto = [];
  const falso = createServer((q, r) => {
    let cuerpo = ''; q.on('data', d => { cuerpo += d; }); q.on('end', () => {
      visto.push({ url: q.url, metodo: q.method, clave: q.headers['x-api-key'], tipo: q.headers['content-type'], cuerpo });
      if (q.url === '/healthz') { r.writeHead(200, { 'Content-Type': 'application/json' }); r.end('{"status":"ok"}'); return; }
      if (q.url === '/v1/solve') {
        let b = {}; try { b = JSON.parse(cuerpo); } catch (e) {}
        if (b.lento) { setTimeout(() => { try { r.writeHead(200); r.end('{}'); } catch (e) {} }, 2500).unref(); return; }
        if (b.malo) { r.writeHead(422, { 'Content-Type': 'application/json' }); r.end(JSON.stringify({ error: 'problema inválido', detalle: ['falta horizon'] })); return; }
        if (b.texto) { r.writeHead(200, { 'Content-Type': 'text/plain' }); r.end('esto no es JSON'); return; }
        r.writeHead(200, { 'Content-Type': 'application/json' }); r.end(JSON.stringify({ status: 'OPTIMAL', assignments: [{ pid: 'lola', turno: 'PASARELA_M' }], eco: b })); return;
      }
      r.writeHead(404); r.end();
    });
  });
  await new Promise(r => falso.listen(0, '127.0.0.1', r));
  const urlCore = `http://127.0.0.1:${falso.address().port}`;
  const dir = mkdtempSync(join(tmpdir(), 'shiftia-nucleo-'));
  // la URL lleva barra final a propósito: el servidor la normaliza; tope de 1 s para probar el 504
  const s = await arrancar(dir, { SHIFTIA_CORE_URL: urlCore + '/', SHIFTIA_CORE_KEY: 'clave-secreta-del-nucleo', SHIFTIA_CORE_TIMEOUT_S: '1' });
  const a = cliente(s.base);
  try {
    assert.match(s.log(), /núcleo de optimización: .*con clave/);
    assert.equal((await a('POST', '/api/login', { usuario: 'oficina', password: ADMIN_PASS })).status, 200);
    const salud = await a('GET', '/api/nucleo/salud');
    assert.equal(salud.status, 200);
    assert.deepEqual(salud.datos, { configurado: true, url: urlCore, ok: true });
    assert.ok(!JSON.stringify(salud.datos).includes('clave-secreta'), 'la clave nunca sale');
    assert.equal(visto.at(-1).url, '/healthz'); assert.equal(visto.at(-1).clave, 'clave-secreta-del-nucleo', 'también el healthz va con la clave');
    // solve correcto: mismo cuerpo, misma clave, mismo código y JSON de vuelta
    const problema = { horizon: { start: diaMas(1), end: diaMas(7) }, personas: [{ id: 'lola' }], pesos: { descubiertos: 100 } };
    const r = await a('POST', '/api/nucleo/solve', problema);
    assert.equal(r.status, 200, JSON.stringify(r.datos));
    assert.equal(r.datos.status, 'OPTIMAL'); assert.deepEqual(r.datos.eco, problema, 'el cuerpo llega tal cual');
    const llamada = visto.at(-1);
    assert.equal(llamada.url, '/v1/solve'); assert.equal(llamada.metodo, 'POST');
    assert.equal(llamada.clave, 'clave-secreta-del-nucleo'); assert.match(llamada.tipo, /^application\/json/);
    assert.deepEqual(JSON.parse(llamada.cuerpo), problema);
    // el código del núcleo se respeta (422 con su JSON)
    const malo = await a('POST', '/api/nucleo/solve', { malo: true });
    assert.equal(malo.status, 422); assert.equal(malo.datos.error, 'problema inválido');
    // respuesta que no es JSON → 502, nunca un 500
    const texto = await a('POST', '/api/nucleo/solve', { texto: true });
    assert.equal(texto.status, 502);
    // más lento que el tope → 504
    const t0 = Date.now();
    const lento = await a('POST', '/api/nucleo/solve', { lento: true });
    assert.equal(lento.status, 504); assert.match(lento.datos.error, /tiempo/);
    assert.ok(Date.now() - t0 < 2400, 'cortó al segundo, no esperó al núcleo');
    // queda auditado (y solo lo lee el programador)
    const p = cliente(s.base);
    assert.equal((await p('POST', '/api/login', { usuario: 'diego', password: PROG_PASS })).status, 200);
    const aud = await p('GET', '/api/auditoria?accion=nucleo-solve');
    assert.ok(aud.datos.filas.length >= 4 && aud.datos.filas.some(f => /timeout/.test(f.detalle)) && aud.datos.filas.some(f => /HTTP 200/.test(f.detalle)), 'cada solve deja rastro');
    assert.equal((await a('GET', '/api/auditoria?accion=nucleo-solve')).status, 403);
  } finally {
    await s.parar();
    falso.closeAllConnections?.(); await new Promise(r => falso.close(r));
    rmSync(dir, { recursive: true, force: true });
  }
});

test('sin PROGRAMADOR_PASSWORD, el programador «diego» entra con 12345678 y no se le obliga a cambiarla (la cambia él cuando quiera)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'shiftia-prog-'));
  const entrar = (s, usuario, pass) => fetch(s.base + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario, password: pass }) });
  const s = await arrancar(dir, { PROGRAMADOR_PASSWORD: '', ADMIN_PASSWORD: '' });
  try {
    assert.match(s.log(), /programador «diego» creado con la contraseña provisional 12345678/);
    const r = await entrar(s, 'diego', '12345678');
    assert.equal(r.status, 200);
    const d = await r.json();
    assert.equal(d.rol, 'programador');
    assert.equal(d.cambiar, false, 'no hay cambio obligatorio: la cambia el programador desde Cuenta');
    // el encargado sigue naciendo con la genérica y cambio obligatorio: es la cuenta del cliente
    const a = await entrar(s, 'oficina', 'pasarela2026');
    assert.equal(a.status, 200); assert.equal((await a.json()).cambiar, true);
    assert.equal((await entrar(s, 'diego', 'pasarela2026')).status, 401, 'la genérica no abre la cuenta del programador');
  } finally { await s.parar(); rmSync(dir, { recursive: true, force: true }); }
});

test('ADMIN_RESET y ADMIN_PROMOTE: la puerta de vuelta si el encargado pierde su contraseña, y el ascenso por variable', async () => {
  // ADMIN_PASSWORD solo actúa con la tabla de usuarios vacía, así que cambiarla no
  // recupera nada; y /api/usuarios/reset exige sesión de encargado. Sin esto, perder
  // la contraseña del encargado dejaba la instalación sin acceso.
  const dir = mkdtempSync(join(tmpdir(), 'shiftia-reset-'));
  const entrar = (s, usuario, pass) => fetch(s.base + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario, password: pass }) });

  try {
    // 1) primer arranque: el encargado nace con ADMIN_PASSWORD y el programador con la suya
    let s = await arrancar(dir, { ADMIN_PASSWORD: 'arranque123', PROGRAMADOR_PASSWORD: 'progarranque1', PROGRAMADOR_USUARIO: 'diego' });
    assert.match(s.log(), /programador «diego» creado con PROGRAMADOR_PASSWORD/);
    assert.equal((await entrar(s, 'oficina', 'arranque123')).status, 200);
    const rp = await entrar(s, 'diego', 'progarranque1');
    assert.equal(rp.status, 200); assert.equal((await rp.json()).rol, 'programador');
    // un empleado que luego ascenderemos
    const ck = (await entrar(s, 'oficina', 'arranque123')).headers.get('set-cookie').split(';')[0];
    const alta = await fetch(s.base + '/api/usuarios', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: ck }, body: JSON.stringify({ usuario: 'roberto', rol: 'empleado', pid: 'roberto' }) });
    assert.equal(alta.status, 200);
    await s.parar();

    // 2) cambiar ADMIN_PASSWORD y reiniciar NO cambia nada: la tabla ya tiene usuarios
    s = await arrancar(dir, { ADMIN_PASSWORD: 'otracosa999', PROGRAMADOR_PASSWORD: 'otraprog999' });
    assert.equal((await entrar(s, 'oficina', 'otracosa999')).status, 401, 'ADMIN_PASSWORD no reescribe un encargado que ya existe');
    assert.equal((await entrar(s, 'oficina', 'arranque123')).status, 200, 'la de verdad sigue siendo la primera');
    assert.equal((await entrar(s, 'diego', 'otraprog999')).status, 401, 'PROGRAMADOR_PASSWORD tampoco');
    await s.parar();

    // 3) valores que no se aceptan: cortos o la genérica
    s = await arrancar(dir, { ADMIN_RESET: 'corta' });
    assert.match(s.log(), /ADMIN_RESET ignorado/);
    assert.equal((await entrar(s, 'oficina', 'corta')).status, 401);
    await s.parar();

    // 4) ADMIN_RESET entra, obliga a crear una personal y revoca lo anterior. La cuenta
    // de la oficina se nombra con ADMIN_RESET_USUARIO: por defecto la puerta abre «admin»,
    // que desde el 17/09 es la del jefe.
    s = await arrancar(dir, { ADMIN_RESET: 'rescate12345', ADMIN_RESET_USUARIO: 'oficina' });
    assert.match(s.log(), /ADMIN_RESET aplicado a «oficina»/);
    const r = await entrar(s, 'oficina', 'rescate12345');
    assert.equal(r.status, 200);
    assert.equal((await r.json()).cambiar, true, 'la app le obliga a crear la suya');
    assert.equal((await entrar(s, 'oficina', 'arranque123')).status, 401, 'la anterior ya no vale');
    await s.parar();

    // 5) el mismo valor no se reaplica: olvidar la variable no reabre la puerta
    s = await arrancar(dir, { ADMIN_RESET: 'rescate12345', ADMIN_RESET_USUARIO: 'oficina' });
    assert.match(s.log(), /ya aplicado con este valor/);
    await s.parar();

    // 6) un usuario que no existe se dice, con la lista de administradores (encargados y programadores)
    s = await arrancar(dir, { ADMIN_RESET: 'otrorescate1', ADMIN_RESET_USUARIO: 'nadie' });
    assert.match(s.log(), /no existe el usuario «nadie»[\s\S]*oficina, diego, admin/);
    await s.parar();

    // 7) ADMIN_RESET también rescata al programador
    s = await arrancar(dir, { ADMIN_RESET: 'rescateprog1', ADMIN_RESET_USUARIO: 'diego' });
    assert.match(s.log(), /ADMIN_RESET aplicado a «diego»/);
    assert.equal((await entrar(s, 'diego', 'rescateprog1')).status, 200);
    await s.parar();

    // 8) ADMIN_PROMOTE: roberto pasa a encargado conservando su pid; con ADMIN_PROMOTE_ROL, a programador
    s = await arrancar(dir, { ADMIN_PROMOTE: 'roberto' });
    assert.match(s.log(), /ADMIN_PROMOTE aplicado a «roberto»: ahora es admin/);
    let rr = await entrar(s, 'roberto', GENERICA);
    assert.equal(rr.status, 200); let yo = await rr.json(); assert.equal(yo.rol, 'admin'); assert.equal(yo.pid, 'roberto', 'conserva su persona');
    await s.parar();
    s = await arrancar(dir, { ADMIN_PROMOTE: 'roberto' });
    assert.match(s.log(), /ADMIN_PROMOTE ya aplicado a «roberto» \(admin\)/, 'la misma variable no se reaplica en el siguiente arranque');
    await s.parar();
    s = await arrancar(dir, { ADMIN_PROMOTE: 'roberto', ADMIN_PROMOTE_ROL: 'programador' });
    assert.match(s.log(), /ADMIN_PROMOTE aplicado a «roberto»: ahora es programador/);
    rr = await entrar(s, 'roberto', GENERICA); yo = await rr.json(); assert.equal(yo.rol, 'programador');
    await s.parar();
    s = await arrancar(dir, { ADMIN_PROMOTE: 'roberto', ADMIN_PROMOTE_ROL: 'admin' });
    assert.match(s.log(), /ya es programador/, 'nunca degrada');
    await s.parar();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('SIGTERM cierra ordenadamente: código 0, aun con un canal SSE abierto', async () => {
  // Railway manda SIGTERM al despliegue viejo cuando el nuevo pasa el healthcheck. Sin
  // manejador, node moría con 143 y Railway lo contaba como «crashed»: un correo de
  // alarma por cada despliegue que en realidad había ido bien.
  const dir = mkdtempSync(join(tmpdir(), 'shiftia-sigterm-'));
  const s = await arrancar(dir);
  const p = s.p;
  try {
    // un canal SSE abierto es una conexión viva: server.close() solo no la cerraría nunca
    const rl = await fetch(s.base + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario: 'oficina', password: ADMIN_PASS }) });
    assert.equal(rl.status, 200);
    const galleta = rl.headers.get('set-cookie').split(';')[0];
    const ac = new AbortController();
    const rsse = await fetch(s.base + '/api/eventos', { headers: { Cookie: galleta }, signal: ac.signal });
    assert.equal(rsse.status, 200);
    await rsse.body.getReader().read();   // primer evento recibido: el canal está registrado

    const salida = new Promise(r => p.once('exit', (code, signal) => r({ code, signal })));
    const t0 = Date.now();
    p.kill('SIGTERM');
    const fin = await Promise.race([salida, new Promise(r => setTimeout(() => r({ code: 'timeout' }), 6000))]);
    ac.abort();
    assert.deepEqual(fin, { code: 0, signal: null }, 'salida: ' + JSON.stringify(fin) + '\n' + s.log());
    assert.ok(Date.now() - t0 < 5000, 'tardó demasiado en cerrar');
    assert.match(s.log(), /cerrando/);
  } finally {
    if (p.exitCode === null) p.kill('SIGKILL');
    rmSync(dir, { recursive: true, force: true });
  }
});

test('renombrado del 17/09: el encargado pasa a «oficina» y el jefe a «admin» sin tocar contraseñas', async () => {
  // Las instalaciones que ya existían tenían al encargado como «admin» y al jefe como
  // «joseadmin». Al arrancar se renombran una sola vez, conservando contraseña, rol y pid.
  const dir = mkdtempSync(join(tmpdir(), 'shiftia-nombres-'));
  const entrar = (s, usuario, pass) => fetch(s.base + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario, password: pass }) });
  try {
    let s = await arrancar(dir, { ADMIN_PASSWORD: 'oficina12345', JEFE_PASSWORD: 'jefe12345' });
    assert.equal((await entrar(s, 'oficina', 'oficina12345')).status, 200, 'de primeras ya nacen con los nombres nuevos');
    assert.equal((await entrar(s, 'admin', 'jefe12345')).status, 200);
    await s.parar();

    // lo dejamos como estaba antes del 17/09 y borramos la marca del renombrado
    const { DatabaseSync } = await import('node:sqlite');
    const bd = new DatabaseSync(join(dir, 'shiftia.db'));
    bd.prepare("UPDATE users SET usuario='joseadmin' WHERE usuario='admin'").run();
    bd.prepare("UPDATE users SET usuario='admin' WHERE usuario='oficina'").run();
    bd.prepare("DELETE FROM meta WHERE k='usuarios_1709'").run();
    bd.close();

    s = await arrancar(dir, { ADMIN_PASSWORD: 'oficina12345', JEFE_PASSWORD: 'jefe12345' });
    assert.match(s.log(), /«admin» pasa a llamarse «oficina»/);
    assert.match(s.log(), /«joseadmin» pasa a llamarse «admin»/);
    assert.equal((await entrar(s, 'oficina', 'oficina12345')).status, 200, 'la oficina entra con la contraseña de siempre');
    const j = await entrar(s, 'admin', 'jefe12345');
    assert.equal(j.status, 200, 'y el jefe con la suya');
    assert.equal((await j.json()).rol, 'admin');
    assert.equal((await entrar(s, 'joseadmin', 'jefe12345')).status, 401, 'el nombre viejo ya no existe');
    await s.parar();

    // si el nombre nuevo ya estuviera cogido, el renombrado no pisa nada y lo dice
    const bd2 = new DatabaseSync(join(dir, 'shiftia.db'));
    bd2.prepare("UPDATE users SET usuario='joseadmin' WHERE usuario='admin'").run();
    bd2.prepare("UPDATE users SET usuario='admin' WHERE usuario='oficina'").run();
    bd2.prepare("INSERT INTO users(usuario,hash,salt,rol,creado,cambiar) VALUES ('oficina','x','y','empleado',1,0)").run();
    bd2.prepare("DELETE FROM meta WHERE k='usuarios_1709'").run();
    bd2.close();
    s = await arrancar(dir, { ADMIN_PASSWORD: 'oficina12345', JEFE_PASSWORD: 'jefe12345' });
    assert.match(s.log(), /«admin» no se puede renombrar a «oficina»: ya hay alguien con ese nombre/);
    assert.equal((await entrar(s, 'admin', 'oficina12345')).status, 200, 'la oficina se queda como estaba, sin perder el acceso');
    await s.parar();
    // lo dejamos otra vez en su sitio para la última comprobación
    const bd3 = new DatabaseSync(join(dir, 'shiftia.db'));
    bd3.prepare("DELETE FROM users WHERE usuario='oficina'").run();
    bd3.prepare("UPDATE users SET usuario='oficina' WHERE usuario='admin'").run();
    bd3.prepare("UPDATE users SET usuario='admin' WHERE usuario='joseadmin'").run();
    bd3.close();

    // y no se repite: un arranque más lo deja todo igual
    s = await arrancar(dir, { ADMIN_PASSWORD: 'oficina12345', JEFE_PASSWORD: 'jefe12345' });
    assert.ok(!/pasa a llamarse/.test(s.log()), 'la segunda vez no toca nada');
    assert.equal((await entrar(s, 'oficina', 'oficina12345')).status, 200);
    await s.parar();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
