// Batería de seguridad genérica — Shiftia · {{nombre}} (la escribe el motor de creación).
// Escenarios adversariales contra el servidor REAL: no comprueba que las funciones existan,
// comprueba que un atacante no consigue lo que busca. Sin dependencias: levanta server.js
// con una BD temporal en un puerto libre. Se agrupa por lo que intenta el atacante:
//   1. entrar sin credenciales   3. escalar de rol           5. saltarse el CSRF   7. inyectar
//   2. falsificar una sesión     4. leer datos de otra persona   6. reventar el servidor   8. sacar secretos
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const M = createRequire(import.meta.url)(join(RAIZ, 'modelo.js'));
const ENCARGADO = '{{cuentas.encargado}}', PROGRAMADOR = '{{cuentas.programador}}', GENERICA = '{{cuentas.passwordGenerica}}';
const ADMIN_PASS = 'adminseguro123', PROG_PASS = 'progseguro123';
let proc, BASE, dataDir;

function arrancar(dir) {
  return new Promise((listo, falla) => {
    const p = spawn('node', [join(RAIZ, 'server.js')],
      { env: { ...process.env, PORT: '0', DATA_DIR: dir, TRUST_PROXY: '0', ADMIN_PASSWORD: ADMIN_PASS, PROGRAMADOR_PASSWORD: PROG_PASS }, stdio: ['ignore', 'pipe', 'pipe'] });
    let log = '', puerto = null;
    const mira = d => { log += d; if (!puerto) { const m = log.match(/escuchando en :(\d+)/); if (m) puerto = +m[1]; } };
    p.stdout.on('data', mira); p.stderr.on('data', mira);
    const t = setInterval(async () => {
      if (!puerto) return;
      try { if ((await fetch(`http://127.0.0.1:${puerto}/api/salud`)).ok) { clearInterval(t); listo({ p, base: `http://127.0.0.1:${puerto}` }); } } catch (e) {}
    }, 60);
    setTimeout(() => { clearInterval(t); p.kill(); falla(new Error('el servidor no arrancó: ' + log)); }, 8000);
  });
}
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
    let datos = null; try { datos = await r.json(); } catch (e) {}
    return { status: r.status, datos, headers: r.headers };
  };
  fn.cookie = () => cookie;
  fn.tomaCookie = c => { cookie = c; };
  return fn;
}
const admin = cliente(), prog = cliente(), empleada = cliente(), anon = cliente();
const diaMas = n => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

function planilla() {
  const s = M.semillaCliente();
  const L = s.locales[0].id;
  const P = (id, nombre) => ({ id, nombre, puesto: M.PUESTOS[0].id, locales: [L], franjas: ['M', 'T'], libra: [], partido: { dias: [] }, cocina: { titular: [], reserva: [], soloDias: [] }, abre: {}, noAbre: [], nuncaCon: [], cubreA: [], vetos: [], contrato: { horasSemana: 40 }, ausencias: [], prefs: {}, nota: 'secreto de la ficha', supuestos: [] });
  s.staff.push(P('segauno', 'Segu Uno'), P('segados', 'Segu Dos'));
  M.asignarColores(s.staff);
  return Object.assign(s, { meses: {}, nextId: 1, peticiones: [], avisos: [], historial: [], mesesPublicados: [] });
}

before(async () => {
  dataDir = mkdtempSync(join(tmpdir(), 'shiftia-seg-'));
  ({ p: proc, base: BASE } = await arrancar(dataDir));
  assert.equal((await admin('POST', '/api/login', { usuario: ENCARGADO, password: ADMIN_PASS })).status, 200);
  assert.equal((await prog('POST', '/api/login', { usuario: PROGRAMADOR, password: PROG_PASS })).status, 200);
  const v = (await admin('GET', '/api/estado')).datos.version;
  assert.equal((await admin('PUT', '/api/estado', { baseVersion: v, estado: planilla() })).status, 200);
  const alta = (await admin('POST', '/api/usuarios', { usuario: 'segauno', rol: 'empleado', pid: 'segauno' })).datos;
  assert.equal((await empleada('POST', '/api/login', { usuario: 'segauno', password: alta.password })).status, 200);
  assert.equal((await empleada('POST', '/api/password', { actual: alta.password, nueva: 'segauno-clave-1' })).status, 200);
});
after(async () => { proc?.kill(); rmSync(dataDir, { recursive: true, force: true }); });

// ─────────────────────────────── 1. entrar sin credenciales
test('sin sesión no se sirve la app, ni el modelo, ni ninguna ruta de datos', async () => {
  for (const ruta of ['/api/estado', '/api/yo', '/api/usuarios', '/api/copia', '/api/auditoria', '/api/version', '/api/estado/versiones']) assert.equal((await anon('GET', ruta)).status, 401, ruta);
  const r = await fetch(BASE + '/index.html');
  assert.ok(!(await r.text()).includes('MODELO_START'), 'index.html sin sesión no lleva la app');
  assert.equal((await anon('GET', '/api/no-existe')).status, 401, 'una ruta desconocida no dice ni si existe');
});

// ─────────────────────────────── 2. falsificar una sesión
test('la cookie de sesión está firmada: manipularla no abre nada', async () => {
  const valor = admin.cookie().split('=')[1];
  const [uid, gen, exp, hmac] = valor.split('.');
  const prueba = async (etiqueta, tok) => { const c = cliente(); c.tomaCookie('sesion=' + tok); assert.equal((await c('GET', '/api/yo')).status, 401, etiqueta); };
  await prueba('otro uid con la misma firma', `999.${gen}.${exp}.${hmac}`);
  await prueba('caducidad estirada a un año', `${uid}.${gen}.${Date.now() + 31536000000}.${hmac}`);
  await prueba('generación cambiada', `${uid}.${+gen + 5}.${exp}.${hmac}`);
  await prueba('firma inventada', `${uid}.${gen}.${exp}.${'a'.repeat(64)}`);
  await prueba('token vacío', '');
  const progUid = prog.cookie().split('=')[1].split('.')[0];
  await prueba('uid del programador con la firma del encargado', `${progUid}.${gen}.${exp}.${hmac}`);
  assert.equal((await admin('GET', '/api/yo')).status, 200, 'la de verdad sigue funcionando');
});

test('cambiar la contraseña revoca las sesiones anteriores de esa persona', async () => {
  const otra = cliente();
  assert.equal((await otra('POST', '/api/login', { usuario: 'segauno', password: 'segauno-clave-1' })).status, 200);
  assert.equal((await otra('POST', '/api/password', { actual: 'segauno-clave-1', nueva: 'segauno-clave-2' })).status, 200);
  assert.equal((await empleada('GET', '/api/yo')).status, 401, 'la sesión vieja muere');
  assert.equal((await empleada('POST', '/api/login', { usuario: 'segauno', password: 'segauno-clave-2' })).status, 200);
});

// ─────────────────────────────── 3. escalar de rol
test('un empleado no alcanza NINGUNA ruta de administración ni del núcleo, ni eligiendo pid', async () => {
  for (const [m, ruta, cuerpo] of [['PUT', '/api/estado', { baseVersion: 0, estado: { staff: [] } }], ['GET', '/api/usuarios'], ['POST', '/api/usuarios', { usuario: 'colado', rol: 'admin' }], ['POST', '/api/usuarios/reset', { id: 1 }], ['POST', '/api/usuarios/rol', { id: 1, rol: 'admin' }], ['DELETE', '/api/usuarios?id=1'], ['GET', '/api/copia'], ['GET', '/api/auditoria'], ['GET', '/api/estado/versiones'], ['GET', '/api/nucleo/salud'], ['POST', '/api/nucleo/solve', {}]]) {
    assert.equal((await empleada(m, ruta, cuerpo)).status, 403, `${m} ${ruta}`);
  }
  assert.equal((await empleada('POST', '/api/peticiones', { tipo: 'VAC', desde: diaMas(10), pid: 'segados' })).status, 200);
  const pets = (await admin('GET', '/api/estado')).datos.estado.peticiones;
  assert.ok(pets.every(p => p.pid !== 'segados'), 'el empleado nunca elige pid: la petición es suya');
});

test('el encargado no alcanza lo que es solo del programador; el encargado no crea ni toca programadores', async () => {
  assert.equal((await admin('GET', '/api/auditoria')).status, 403);
  assert.equal((await admin('POST', '/api/usuarios', { usuario: 'dev9', rol: 'programador' })).status, 403);
  const us = (await admin('GET', '/api/usuarios')).datos.usuarios;
  const p = us.find(u => u.usuario === PROGRAMADOR);
  assert.equal((await admin('POST', '/api/usuarios/reset', { id: p.id })).status, 403);
  assert.equal((await admin('DELETE', `/api/usuarios?id=${p.id}`)).status, 403);
  assert.equal((await prog('GET', '/api/auditoria')).status, 200);
});

// ─────────────────────────────── 4. leer datos de otra persona
test('el estado que recibe un empleado va proyectado: de los demás solo lo mínimo, y sin semana tipo', async () => {
  const e = (await empleada('GET', '/api/estado')).datos.estado;
  const otro = e.staff.find(p => p.id === 'segados');
  assert.ok(otro, 've a sus compañeros');
  assert.deepEqual(Object.keys(otro).sort(), ['color', 'id', 'locales', 'nombre', 'puesto']);
  assert.equal(e.patron, undefined);
  assert.equal(e.cierres, undefined);
  assert.equal(e.staff.find(p => p.id === 'segauno').nota, 'secreto de la ficha', 'lo suyo sí');
});

// ─────────────────────────────── 5. saltarse el CSRF
test('toda escritura exige origen propio y cuerpo JSON', async () => {
  for (const [m, ruta, cuerpo] of [['POST', '/api/peticiones', { tipo: 'LD', desde: diaMas(23) }], ['POST', '/api/logout', {}]]) {
    assert.equal((await empleada(m, ruta, cuerpo, { Origin: 'https://evil.example' })).status, 403, `${ruta} con origen ajeno`);
    assert.equal((await empleada(m, ruta, cuerpo, { Origin: BASE, 'Sec-Fetch-Site': 'cross-site' })).status, 403, `${ruta} cross-site`);
    const formulario = await fetch(BASE + ruta, { method: m, headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: empleada.cookie() }, body: 'tipo=LD' });
    assert.equal(formulario.status, 415, `${ruta} con cuerpo de formulario`);
  }
});

// ─────────────────────────────── 6. reventar el servidor
test('fuerza bruta: el login se bloquea por usuario, no global', async () => {
  let ultimo = 0;
  for (let i = 0; i < 9; i++) ultimo = (await anon('POST', '/api/login', { usuario: 'bruto', password: 'x' + i })).status;
  assert.equal(ultimo, 429, 'tras varios fallos, bloqueo temporal');
  assert.equal((await anon('POST', '/api/login', { usuario: ENCARGADO, password: 'mala' })).status, 401, 'los demás siguen pudiendo intentarlo');
});

test('cuerpos enormes y JSON roto se rechazan sin caerse', async () => {
  const enorme = await fetch(BASE + '/api/peticiones', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: empleada.cookie(), Origin: BASE }, body: JSON.stringify({ tipo: 'VAC', desde: diaMas(27), nota: 'A'.repeat(2 * 1024 * 1024) }) }).catch(() => ({ status: 413 }));
  assert.ok([400, 413].includes(enorme.status), `cuerpo de 2 MB → ${enorme.status}`);
  for (const roto of ['{', 'null', '[]', '"texto"', '{"a":']) {
    const r = await fetch(BASE + '/api/peticiones', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: empleada.cookie(), Origin: BASE }, body: roto });
    assert.ok(r.status < 500, `cuerpo «${roto}» no puede dar 500, dio ${r.status}`);
  }
  assert.equal((await anon('GET', '/api/salud')).status, 200, 'el servidor sigue en pie');
});

test('no se sirve nada fuera de la lista blanca', async () => {
  for (const ruta of ['/../server.js', '/..%2fserver.js', '/server.js', '/package.json', '/estado-servidor.js', '/modelo.js', '/.git/config', '/data/shiftia.db', '/cliente.json', '/motor.lock.json', '/.env']) {
    const r = await fetch(BASE + ruta, { headers: { Cookie: admin.cookie() } });
    const cuerpo = r.ok ? await r.text() : '';
    assert.ok(!/DatabaseSync|ADMIN_RESET|"dependencies"|semillaCliente|estadoParaEmpleado|"unidades"/.test(cuerpo), `${ruta} sirvió código o configuración`);
    assert.ok(!r.ok || /^\/(sw\.js|manifest|icons|vendor|assets)/.test(ruta), `${ruta} → ${r.status}: no está en la lista blanca`);
  }
});

// ─────────────────────────────── 7. inyectar
test('la inyección SQL en el usuario no abre sesión ni rompe la tabla; el XSS vuelve como texto', async () => {
  for (const u of ["' OR '1'='1", "admin'--", "admin'; DROP TABLE users;--"]) {
    assert.ok([400, 401, 429].includes((await anon('POST', '/api/login', { usuario: u, password: "' OR '1'='1" })).status), `«${u}»`);
  }
  assert.equal((await admin('GET', '/api/usuarios')).status, 200, 'la tabla de usuarios sigue ahí');
  const veneno = '<img src=x onerror=alert(1)>"><script>alert(2)</script>';
  assert.equal((await empleada('POST', '/api/peticiones', { tipo: 'LD', desde: diaMas(30), nota: veneno }, { Origin: BASE })).status, 200);
  const mia = (await admin('GET', '/api/estado')).datos.estado.peticiones.find(x => x.nota && x.nota.includes('onerror'));
  assert.ok(mia && mia.nota === veneno, 'se guarda literal: escapa quien pinta, no el servidor');
  assert.match((await fetch(BASE + '/api/estado', { headers: { Cookie: admin.cookie() } })).headers.get('content-type'), /application\/json/);
});

// ─────────────────────────────── 8. sacar secretos
test('las cabeceras de seguridad están en TODAS las respuestas y la cookie no la lee JavaScript', async () => {
  const obligadas = ['content-security-policy', 'x-content-type-options', 'x-frame-options', 'referrer-policy', 'permissions-policy'];
  for (const [nombre, r] of [['portada', await fetch(BASE + '/')], ['api con sesión', await fetch(BASE + '/api/yo', { headers: { Cookie: admin.cookie() } })], ['api sin sesión', await fetch(BASE + '/api/estado')], ['404', await fetch(BASE + '/no-existe')], ['salud', await fetch(BASE + '/api/salud')]]) {
    for (const h of obligadas) assert.ok(r.headers.get(h), `falta ${h} en «${nombre}»`);
    assert.match(r.headers.get('content-security-policy'), /frame-ancestors 'none'/, `CSP débil en «${nombre}»`);
    assert.equal(r.headers.get('x-frame-options'), 'DENY');
  }
  const https = await fetch(BASE + '/api/salud', { headers: { 'X-Forwarded-Proto': 'https' } });
  assert.match(https.headers.get('strict-transport-security'), /max-age=31536000/);
  const c = cliente();
  const r = await fetch(BASE + '/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario: ENCARGADO, password: ADMIN_PASS }) });
  assert.match(r.headers.get('set-cookie'), /HttpOnly/i);
  assert.match(r.headers.get('set-cookie'), /SameSite=Lax/i);
  void c;
});

test('la copia de seguridad, la salud y los errores no llevan secretos', async () => {
  const copia = (await admin('GET', '/api/copia')).datos;
  const txt = JSON.stringify(copia);
  assert.ok(!/"hash"|"salt"|"privada"|SESSION_SECRET/.test(txt), 'sin hashes ni claves');
  const salud = (await anon('GET', '/api/salud')).datos;
    assert.ok(!JSON.stringify(salud).includes('DATA_DIR'));
  const pol = cliente();
  const alta = (await admin('POST', '/api/usuarios', { usuario: 'segados', rol: 'empleado', pid: 'segados' })).datos;
  await pol('POST', '/api/login', { usuario: 'segados', password: alta.password });
  for (const mala of ['1234567', 'corta', GENERICA, alta.password]) assert.equal((await pol('POST', '/api/password', { actual: alta.password, nueva: mala }, { Origin: BASE })).status, 400, `aceptó «${mala}»`);
  assert.equal((await pol('POST', '/api/password', { actual: alta.password, nueva: 'UnaBuena2026' }, { Origin: BASE })).status, 200);
});
