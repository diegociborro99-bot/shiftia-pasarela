// Batería de seguridad — Shiftia · Grupo Pasarela
//
// Escenarios adversariales contra el servidor REAL: no comprueba que las
// funciones existan, comprueba que un atacante no consigue lo que busca.
// Sin dependencias: levanta server.js con una BD temporal en un puerto libre.
// 14/09: adaptada del piloto a los tres roles (el encargado tampoco llega a lo
// del programador) y a la pasarela al núcleo; sin iCal (fase 3).
//
// Se agrupa por lo que intenta el atacante:
//   1. entrar sin credenciales           5. saltarse el CSRF
//   2. falsificar una sesión             6. reventar el servidor
//   3. escalar de rol                    7. inyectar
//   4. leer datos de otra persona        8. sacar secretos
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const ADMIN_PASS = 'adminseguro123', PROG_PASS = 'progseguro123', GENERICA = 'pasarela2026';
let proc, BASE, dataDir;

// PORT=0: el sistema elige un puerto libre y se lee del log (los dos ficheros de
// test corren a la vez y así no chocan)
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

// cliente con tarro de cookies; `extra` para trastear con cabeceras a mano
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
const admin = cliente(), prog = cliente(), empleada = cliente(), otra = cliente(), anon = cliente(), jefe = cliente();

// Fechas RELATIVAS a hoy: con fechas fijas estos tests caducan solos (el
// servidor rechaza una petición fuera de la ventana de hoy-31..hoy+400), y se
// caen sin que nadie haya roto nada (14/09).
const diaMas = n => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
let altaEmpleada, altaOtra;

before(async () => {
  dataDir = mkdtempSync(join(tmpdir(), 'shiftia-seg-'));
  const s = await arrancar(dataDir);
  proc = s.p; BASE = s.base;
  assert.equal((await admin('POST', '/api/login', { usuario: 'oficina', password: ADMIN_PASS })).status, 200);
  assert.equal((await prog('POST', '/api/login', { usuario: 'diego', password: PROG_PASS })).status, 200);
  // dos empleadas distintas: hacen falta para probar que una no ve a la otra
  altaEmpleada = (await admin('POST', '/api/usuarios', { usuario: 'lola', rol: 'empleado', pid: 'lola' })).datos;
  altaOtra = (await admin('POST', '/api/usuarios', { usuario: 'mariluz', rol: 'empleado', pid: 'mariluz' })).datos;
  for (const [c, alta] of [[empleada, altaEmpleada], [otra, altaOtra]]) {
    await c('POST', '/api/login', { usuario: alta.usuario, password: alta.password });
    await c('POST', '/api/password', { actual: alta.password, nueva: alta.usuario + 'Clave2026' });
  }
  // sin planilla guardada no hay copia ni peticiones: se siembra una mínima
  const staff = [
    { id: 'lola', nombre: 'Lola', puesto: 'sala', locales: ['PASARELA'], nota: 'abre el local', contrato: { horasSemana: 40 } },
    { id: 'mariluz', nombre: 'Mari Luz', puesto: 'sala', locales: ['PASARELA'], nota: 'siempre partido', ausencias: [{ tipo: 'BAJ', desde: '2026-09-01', detalle: 'baja' }] },
    { id: 'roberto', nombre: 'Roberto', puesto: 'apoyo', locales: ['ZAPA', 'PASARELA'] },
    { id: 'tere', nombre: 'Tere', puesto: 'apoyo', locales: ['PASARELA', 'MONACO'] },
    { id: 'jenny', nombre: 'Jenny', puesto: 'cocina', locales: ['EL33', 'MONACO'] },
  ];
  const r = await admin('PUT', '/api/estado', { baseVersion: 0, estado: { staff, locales: [{ id: 'PASARELA', nombre: 'Pasarela' }], patron: { 1: [] }, cierres: {}, meses: {}, peticiones: [] } }, { Origin: BASE });
  assert.equal(r.status, 200, 'planilla sembrada');
});

// las peticiones viven DENTRO del estado (no hay GET /api/peticiones): así se leen
const peticionesDe = async c => ((await c('GET', '/api/estado')).datos.estado || {}).peticiones || [];
after(() => { proc?.kill(); rmSync(dataDir, { recursive: true, force: true }); });

// ─────────────────────────────── 1. entrar sin credenciales
test('sin sesión no se sirve la app, ni la plantilla, ni el modelo', async () => {
  const r = await fetch(BASE + '/');
  // 14/09: hasta que el build produzca index.html/login.html, «/» responde 404;
  // en cualquier caso, lo que salga sin sesión no puede llevar la app ni nombres
  assert.ok(r.status === 200 || r.status === 404, `«/» sin sesión → ${r.status}`);
  const html = r.status === 200 ? await r.text() : '';
  if (r.status === 200) assert.ok(/id="loginForm"/.test(html), 'sin sesión se sirve la pantalla de acceso');
  assert.ok(!/MODELO_START|semillaPasarela/.test(html), 'el modelo de dominio no viaja sin sesión');
  for (const nombre of ['Mari Luz', 'Esmeralda', 'Jacquelin', 'siempre partido', 'la cubre']) {
    assert.ok(!html.includes(nombre), `«${nombre}» no debe aparecer sin sesión`);
  }
  // y ninguna ruta de datos contesta
  for (const ruta of ['/api/estado', '/api/yo', '/api/usuarios', '/api/copia', '/api/estado/versiones', '/api/peticiones', '/api/auditoria', '/api/nucleo/salud']) {
    assert.equal((await anon('GET', ruta)).status, 401, `${ruta} sin sesión`);
  }
});

test('una ruta de API desconocida no dice si existe ni filtra el HTML de la app', async () => {
  // sin sesión responde 401 antes de mirar la ruta: no se puede mapear la API desde fuera
  const fuera = await anon('GET', '/api/no-existe');
  assert.equal(fuera.status, 401);
  assert.equal(fuera.datos.error, 'sin sesión');
  assert.equal((await anon('GET', '/api/usuarios')).status, 401, 'una que SÍ existe responde igual');
  // con sesión ya distingue, pero sin soltar el HTML de la app
  const dentro = await admin('GET', '/api/no-existe');
  assert.equal(dentro.status, 404);
  assert.ok(!/<html|MODELO_START/.test(JSON.stringify(dentro.datos || '')));
});

// ─────────────────────────────── 2. falsificar una sesión
test('la cookie de sesión está firmada: manipularla no abre nada', async () => {
  const buena = admin.cookie();                       // sesion=uid.gen.exp.hmac
  const valor = buena.split('=')[1];
  const [uid, gen, exp, hmac] = valor.split('.');
  const prueba = async (etiqueta, tok) => {
    const c = cliente(); c.tomaCookie('sesion=' + tok);
    assert.equal((await c('GET', '/api/yo')).status, 401, etiqueta);
  };
  await prueba('otro uid con la misma firma', `999.${gen}.${exp}.${hmac}`);
  await prueba('caducidad estirada a un año', `${uid}.${gen}.${Date.now() + 31536000000}.${hmac}`);
  await prueba('generación cambiada', `${uid}.${+gen + 5}.${exp}.${hmac}`);
  await prueba('firma inventada', `${uid}.${gen}.${exp}.${'a'.repeat(64)}`);
  await prueba('firma vacía', `${uid}.${gen}.${exp}.`);
  await prueba('token sin partes', '1');
  await prueba('token vacío', '');
  await prueba('inyección en el uid', `1 OR 1=1.${gen}.${exp}.${hmac}`);
  // el uid del programador con la firma del encargado tampoco
  const progUid = prog.cookie().split('=')[1].split('.')[0];
  await prueba('uid del programador con la firma del encargado', `${progUid}.${gen}.${exp}.${hmac}`);
  // la de verdad sigue funcionando: la prueba no ha roto la sesión buena
  assert.equal((await admin('GET', '/api/yo')).status, 200);
});

test('cambiar la contraseña revoca las sesiones anteriores de esa persona', async () => {
  const c1 = cliente(), c2 = cliente();
  const alta = (await admin('POST', '/api/usuarios', { usuario: 'roberto', rol: 'empleado', pid: 'roberto' })).datos;
  await c1('POST', '/api/login', { usuario: 'roberto', password: alta.password });
  await c1('POST', '/api/password', { actual: alta.password, nueva: 'PrimeraClave26' });
  const robada = c1.cookie();                                  // sesión abierta en otro sitio
  c2.tomaCookie(robada);
  assert.equal((await c2('GET', '/api/yo')).status, 200, 'de momento vale');
  await c1('POST', '/api/password', { actual: 'PrimeraClave26', nueva: 'SegundaClave26' });
  assert.equal((await c2('GET', '/api/yo')).status, 401, 'la sesión robada muere al cambiar la contraseña');
});

test('el reset del encargado revoca las sesiones del usuario reseteado', async () => {
  const c = cliente();
  const alta = (await admin('POST', '/api/usuarios', { usuario: 'tere', rol: 'empleado', pid: 'tere' })).datos;
  await c('POST', '/api/login', { usuario: 'tere', password: alta.password });
  await c('POST', '/api/password', { actual: alta.password, nueva: 'ClaveTere2026' });
  assert.equal((await c('GET', '/api/yo')).status, 200);
  const lista = (await admin('GET', '/api/usuarios')).datos.usuarios;
  const id = lista.find(u => u.usuario === 'tere').id;
  assert.equal((await admin('POST', '/api/usuarios/reset', { id })).status, 200);
  assert.equal((await c('GET', '/api/yo')).status, 401, 'tras el reset la sesión anterior no vale');
});

// ─────────────────────────────── 3. escalar de rol
test('un empleado no alcanza NINGUNA ruta de administración ni del núcleo', async () => {
  const soloAdmin = [
    ['GET', '/api/usuarios'], ['POST', '/api/usuarios', { usuario: 'colada', rol: 'admin' }], ['POST', '/api/usuarios', { usuario: 'colada', rol: 'programador' }],
    ['POST', '/api/usuarios/reset', { id: 1 }], ['DELETE', '/api/usuarios?id=1'], ['GET', '/api/copia'],
    ['GET', '/api/estado/versiones'], ['GET', '/api/auditoria'],
    ['GET', '/api/nucleo/salud'], ['POST', '/api/nucleo/solve', { horizon: {} }],
  ];
  for (const [m, ruta, cuerpo] of soloAdmin) {
    const r = await empleada(m, ruta, cuerpo, { Origin: BASE });
    assert.ok(r.status === 403 || r.status === 404, `${m} ${ruta} → ${r.status} (esperaba 403/404)`);
  }
  // y no puede ascenderse a sí misma escribiendo el estado
  const est = await empleada('GET', '/api/estado');
  assert.equal(est.status, 200, 'el empleado sí lee su propio estado');
  const w = await empleada('PUT', '/api/estado', { version: 1, estado: { staff: [] } }, { Origin: BASE });
  assert.ok(w.status === 403 || w.status === 405 || w.status === 404, `escritura del estado por un empleado → ${w.status}`);
  // ni elegir por quién pide
  const p = await empleada('POST', '/api/peticiones', { pid: 'mariluz', tipo: 'VAC', desde: diaMas(15) }, { Origin: BASE });
  assert.equal(p.status, 200); assert.equal(p.datos.peticion.pid, 'lola', 'el pid del cuerpo se ignora');
});

test('el encargado no alcanza lo que es solo del programador; el programador llega a todo', async () => {
  // 14/09: la auditoría y las cuentas de programador son del programador
  assert.equal((await admin('GET', '/api/auditoria')).status, 403, 'la auditoría no es del encargado');
  assert.equal((await admin('POST', '/api/usuarios', { usuario: 'colado', rol: 'programador' }, { Origin: BASE })).status, 403, 'no crea programadores');
  const diego = (await admin('GET', '/api/usuarios')).datos.usuarios.find(u => u.usuario === 'diego');
  assert.ok(diego && diego.rol === 'programador');
  assert.equal((await admin('POST', '/api/usuarios/reset', { id: diego.id }, { Origin: BASE })).status, 403, 'no resetea al programador');
  assert.equal((await admin('DELETE', '/api/usuarios?id=' + diego.id, undefined, { Origin: BASE })).status, 403, 'no borra al programador');
  assert.equal((await admin('GET', '/api/yo')).datos.rol, 'admin', 'y sigue siendo encargado');
  // el programador: auditoría, cuentas de cualquier rol, planilla, versiones, copia y núcleo
  assert.equal((await prog('GET', '/api/auditoria')).status, 200);
  const alta = await prog('POST', '/api/usuarios', { usuario: 'dev2', rol: 'programador' }, { Origin: BASE });
  assert.equal(alta.status, 200); assert.equal(alta.datos.rol, 'programador');
  const dev2 = (await prog('GET', '/api/usuarios')).datos.usuarios.find(u => u.usuario === 'dev2');
  assert.equal((await prog('DELETE', '/api/usuarios?id=' + dev2.id, undefined, { Origin: BASE })).status, 200);
  assert.equal((await prog('DELETE', '/api/usuarios?id=' + diego.id, undefined, { Origin: BASE })).status, 400, 'nunca sin programador');
  const est = await prog('GET', '/api/estado');
  assert.ok(est.datos.estado.patron, 've la planilla completa');
  assert.equal((await prog('PUT', '/api/estado', { baseVersion: est.datos.version, estado: est.datos.estado }, { Origin: BASE })).status, 200);
  assert.equal((await prog('GET', '/api/estado/versiones')).status, 200);
  assert.equal((await prog('GET', '/api/copia')).status, 200);
  assert.equal((await prog('GET', '/api/nucleo/salud')).status, 200);
});

test('crear y borrar usuarios es del encargado (y del programador), y el alta usa la genérica', async () => {
  // alta: el nombre de usuario sale del nombre, y la contraseña es la genérica con
  // cambio obligatorio (petición del cliente en el piloto, 03/09)
  const alta = await admin('POST', '/api/usuarios', { usuario: 'jenny', rol: 'empleado', pid: 'jenny' }, { Origin: BASE });
  assert.equal(alta.status, 200);
  assert.equal(alta.datos.generica, true, 'el alta avisa de que la contraseña es la de todos');
  assert.equal(alta.datos.password, GENERICA, 'y es la genérica, no una aleatoria');
  // entra con ella y la app le obliga a cambiarla
  const c = cliente();
  const entra = await c('POST', '/api/login', { usuario: 'jenny', password: GENERICA });
  assert.equal(entra.status, 200);
  assert.equal(entra.datos.cambiar, true, 'la genérica nunca queda como contraseña de nadie');
  // y con la genérica NO se puede hacer nada más: primero hay que cambiarla
  assert.equal((await c('GET', '/api/estado')).status, 403);
  assert.equal((await c('POST', '/api/password', { actual: GENERICA, nueva: GENERICA }, { Origin: BASE })).status, 400,
    'no puede «cambiarla» por la misma genérica');
  // el empleado no crea ni borra
  const id = (await admin('GET', '/api/usuarios')).datos.usuarios.find(u => u.usuario === 'jenny').id;
  assert.equal((await empleada('POST', '/api/usuarios', { usuario: 'colada', rol: 'admin' }, { Origin: BASE })).status, 403);
  assert.equal((await empleada('DELETE', '/api/usuarios?id=' + id, undefined, { Origin: BASE })).status, 403, 'un empleado no borra usuarios');
  assert.equal((await anon('DELETE', '/api/usuarios?id=' + id)).status, 401);
  // el encargado sí, y no puede quedarse el grupo sin encargado
  assert.equal((await admin('DELETE', '/api/usuarios?id=' + id, undefined, { Origin: BASE })).status, 200);
  // 17/09: de serie hay dos encargados, la oficina y el jefe; se van todos menos el que
  // tiene la sesión abierta, para comprobar que el último no se puede borrar
  const encargados = (await admin('GET', '/api/usuarios')).datos.usuarios.filter(u => u.rol === 'admin');
  assert.ok(encargados.length >= 2, 'la oficina y el jefe');
  const propio = encargados.find(u => u.usuario === 'oficina');
  assert.ok(propio, 'la cuenta de la oficina');
  for (const u of encargados.filter(u => u.id !== propio.id)) assert.equal((await admin('DELETE', '/api/usuarios?id=' + u.id, undefined, { Origin: BASE })).status, 200);
  assert.equal((await admin('DELETE', '/api/usuarios?id=' + propio.id, undefined, { Origin: BASE })).status, 400, 'no se borra el último encargado');
  // borrar a alguien le cierra la sesión al momento
  assert.equal((await c('GET', '/api/yo')).status, 401, 'la sesión del borrado muere');
});

test('el empleado no puede responder ni retirar peticiones que no son suyas', async () => {
  const p = await empleada('POST', '/api/peticiones', { tipo: 'VAC', desde: diaMas(20) }, { Origin: BASE });
  assert.equal(p.status, 200);
  const id = (await peticionesDe(empleada)).at(-1).id;
  // aprobarse sus propias vacaciones es cosa del encargado
  const auto = await empleada('POST', '/api/peticiones/responder', { id, estado: 'aprobada' }, { Origin: BASE });
  assert.ok(auto.status === 403 || auto.status === 404, `auto-aprobación → ${auto.status}`);
  // y otra empleada no puede retirar la petición ajena
  const ajena = await otra('POST', '/api/peticiones/retirar', { id }, { Origin: BASE });
  assert.ok(ajena.status === 403 || ajena.status === 404, `retirar la petición de otra → ${ajena.status}`);
});

// ─────────────────────────────── 4. leer datos de otra persona
test('el estado que recibe un empleado va proyectado: de los demás solo lo mínimo, y sin semana tipo', async () => {
  const { datos } = await empleada('GET', '/api/estado');
  const e = datos.estado;
  for (const p of e.staff.filter(p => p.id !== 'lola')) {
    assert.ok(p.nota === undefined && p.ausencias === undefined && p.contrato === undefined && p.prefs === undefined, `${p.id}: nota/ausencias/contrato no viajan a otra persona`);
  }
  assert.equal(e.staff.find(p => p.id === 'lola').nota, 'abre el local', 'lo suyo sí, completo');
  assert.equal(e.patron, undefined, 'la semana tipo es del encargado');
  assert.equal(e.cierres, undefined);
  assert.deepEqual(e.historial, []);
  assert.ok(Array.isArray(e.locales), 'los locales sí: son configuración del grupo');
  // si trae peticiones, son las suyas
  const pets = e.peticiones || [];
  assert.ok(pets.length && pets.every(x => x.pid === 'lola'), 'solo sus peticiones');
  const deOtra = await otra('GET', '/api/estado');
  assert.ok(!(deOtra.datos.estado.peticiones || []).some(x => x.pid === 'lola'), 'la otra no ve las de lola');
  // 17/09: la base de entrevistas lleva teléfonos de 275 personas y lo que el grupo
  // opina de cada una por escrito («un poco choni», «mala gente»). Es de RRHH: a un
  // empleado no le llega ni la lista ni una sola palabra de ella.
  assert.equal(e.entrevistas, undefined, 'las entrevistas no viajan al empleado');
  assert.ok(!/entrevista/i.test(JSON.stringify(e)), 'ni rastro en todo el estado proyectado');
});

// (el enlace del calendario personal y su revocación se prueban en la fase 3, con iCal)

// ─────────────────────────────── 4b. el contenido de las entrevistas es del jefe
// 18/09 (José): «en la opción de entrevistas, Aroa funciona bien para antes de citar a
// alguien comprueba si previamente lo hemos descartado pero no quiero que tenga acceso al
// contenido de cada entrevista. Si sí le hemos entrevistado, si hemos puesto bien, mal o
// regular y demás pero no a lo que hay dentro de cada entrevista donde hablo de
// condiciones». Aroa es la cuenta «oficina».
//
// El permiso NO se ata a un nombre de usuario: lo concede quien ya lo tiene (el jefe) o el
// programador, y nunca a sí mismo. Así sobrevive a que a José le cambien de cuenta.
const CANDIDATO = {
  id: 'cand1', nombre: 'Fulanita de Tal', tel: '600111222', lista: 'ent', puestos: ['sala'], val: 'mal',
  fecha: '13/10/2025', edad: '41', zona: 'Elche', doc: 'si', exp: 'La Paraeta, 4 meses',
  incorp: 'Ya', sueldo: '1200 €', horarios: 'De mananas', cond: 'Seis dias, ocho horas',
  obs: 'Un poco choni', nota: 'lo que apunto Jose', hab: { cafetera: 'si', pda: 'no' },
};
const SECRETOS = ['La Paraeta', '1200 €', 'Seis dias', 'Un poco choni', 'lo que apunto Jose', 'De mananas'];
const estadoCon = async c => ((await c('GET', '/api/estado')).datos || {}).estado || {};
const listaUsuarios = async c => (await c('GET', '/api/usuarios')).datos.usuarios;
let idAroa = null;

test('el programador siembra a José: un encargado con acceso al contenido de las entrevistas', async () => {
  const alta = (await prog('POST', '/api/usuarios', { usuario: 'jose', rol: 'admin' }, { Origin: BASE })).datos;
  assert.ok(alta && alta.usuario === 'jose', JSON.stringify(alta));
  await jefe('POST', '/api/login', { usuario: 'jose', password: alta.password });
  assert.equal((await jefe('POST', '/api/password', { actual: alta.password, nueva: 'JoseClave2026' })).status, 200);
  await jefe('POST', '/api/login', { usuario: 'jose', password: 'JoseClave2026' });
  assert.equal((await jefe('GET', '/api/yo')).datos.usuario, 'jose');
  // nace sin el permiso, como cualquier encargado: se lo da el programador
  const suId = (await listaUsuarios(prog)).find(u => u.usuario === 'jose').id;
  assert.equal((await jefe('GET', '/api/yo')).datos.verEntrevistas, false, 'de serie, ningún encargado lo trae');
  assert.equal((await prog('POST', '/api/usuarios/entrevistas', { id: suId, ver: true }, { Origin: BASE })).status, 200);
  assert.equal((await jefe('GET', '/api/yo')).datos.verEntrevistas, true);
  idAroa = (await listaUsuarios(prog)).find(u => u.usuario === 'oficina').id;
  assert.ok(idAroa, 'la cuenta de la oficina (Aroa)');
  // y se siembra el candidato de prueba, con José escribiéndolo
  const v = (await jefe('GET', '/api/estado')).datos.version;
  const e = await estadoCon(jefe); e.entrevistas = [CANDIDATO];
  assert.equal((await jefe('PUT', '/api/estado', { baseVersion: v, estado: e }, { Origin: BASE })).status, 200);
});

test('la oficina ve QUIÉN está descartado, pero no una palabra de lo que hay dentro de la entrevista', async () => {
  const deAroa = await estadoCon(admin);
  const c = (deAroa.entrevistas || [])[0];
  assert.ok(c, 'la ficha sigue apareciendo: para eso la usa');
  assert.equal(c.nombre, 'Fulanita de Tal'); assert.equal(c.tel, '600111222');
  assert.equal(c.val, 'mal', 'la valoración sí: es lo que le dice si ya está descartada');
  assert.equal(c.fecha, '13/10/2025', 'y si se le entrevistó, y cuándo');
  assert.deepEqual(c.puestos, ['sala'], 'y a qué puesto opta');
  for (const k of ['exp', 'obs', 'cond', 'sueldo', 'horarios', 'incorp', 'edad', 'zona', 'doc', 'nota', 'hab'])
    assert.equal(c[k], undefined, `«${k}» no viaja a la oficina`);
  const txt = JSON.stringify(deAroa);
  for (const secreto of SECRETOS) assert.ok(!txt.includes(secreto), `«${secreto}» no puede salir del servidor`);
  assert.equal((await admin('GET', '/api/yo')).datos.verEntrevistas, false, 'y la app lo sabe para no pintar la ficha');
});

test('el jefe y el programador sí lo ven entero', async () => {
  for (const [quien, c] of [['el jefe', jefe], ['el programador', prog]]) {
    const f = ((await estadoCon(c)).entrevistas || [])[0];
    assert.ok(f, `${quien} recibe la ficha`);
    assert.equal(f.cond, 'Seis dias, ocho horas', `${quien} ve las condiciones`);
    assert.equal(f.obs, 'Un poco choni', `${quien} ve las observaciones`);
    assert.deepEqual(f.hab, { cafetera: 'si', pda: 'no' }, `${quien} ve las aptitudes`);
  }
});

test('y si la oficina guarda la planilla, NO se lleva por delante las entrevistas que no ve', async () => {
  // Aroa recibe las fichas sin contenido; al guardar un cambio de turno enviaría eso
  // mismo de vuelta y borraría lo de José. El servidor conserva lo suyo.
  const v = (await admin('GET', '/api/estado')).datos.version;
  const suyo = await estadoCon(admin);
  suyo.staff[0].nota = 'tocando la planilla';
  assert.equal((await admin('PUT', '/api/estado', { baseVersion: v, estado: suyo }, { Origin: BASE })).status, 200);
  const tras = await estadoCon(prog);
  assert.equal(tras.staff[0].nota, 'tocando la planilla', 'su cambio sí se guarda');
  const f = (tras.entrevistas || [])[0];
  assert.ok(f, 'la entrevista sigue ahí');
  assert.equal(f.cond, 'Seis dias, ocho horas', 'y entera');
  assert.equal(f.obs, 'Un poco choni');
});

test('ni inventándose el campo: la oficina no puede escribir el contenido de una entrevista', async () => {
  const v = (await admin('GET', '/api/estado')).datos.version;
  const suyo = await estadoCon(admin);
  suyo.entrevistas = [{ ...CANDIDATO, cond: 'LO QUE YO DIGA', obs: 'colado' }];
  assert.equal((await admin('PUT', '/api/estado', { baseVersion: v, estado: suyo }, { Origin: BASE })).status, 200);
  const f = ((await estadoCon(prog)).entrevistas || [])[0];
  assert.equal(f.cond, 'Seis dias, ocho horas', 'lo que mandó no entra');
  assert.equal(f.obs, 'Un poco choni');
});

test('la oficina no puede darse el permiso a sí misma, ni quitárselo al jefe', async () => {
  const usuarios = await listaUsuarios(admin);
  const yo = usuarios.find(u => u.usuario === 'oficina'), elJefe = usuarios.find(u => u.usuario === 'jose');
  assert.equal((await admin('POST', '/api/usuarios/entrevistas', { id: yo.id, ver: true }, { Origin: BASE })).status, 403);
  assert.equal((await admin('POST', '/api/usuarios/entrevistas', { id: elJefe.id, ver: false }, { Origin: BASE })).status, 403);
  assert.equal(((await estadoCon(admin)).entrevistas || [])[0].cond, undefined, 'sigue sin verlo');
  // y el jefe tampoco se lo quita a sí mismo por error
  assert.equal((await jefe('POST', '/api/usuarios/entrevistas', { id: elJefe.id, ver: false }, { Origin: BASE })).status, 400);
});

test('el jefe sí puede abrírselo a la oficina y volver a cerrárselo', async () => {
  assert.equal((await jefe('POST', '/api/usuarios/entrevistas', { id: idAroa, ver: true }, { Origin: BASE })).status, 200);
  assert.equal(((await estadoCon(admin)).entrevistas || [])[0].cond, 'Seis dias, ocho horas', 'ahora sí lo ve');
  assert.equal((await admin('GET', '/api/yo')).datos.verEntrevistas, true);
  assert.equal((await jefe('POST', '/api/usuarios/entrevistas', { id: idAroa, ver: false }, { Origin: BASE })).status, 200);
  assert.equal(((await estadoCon(admin)).entrevistas || [])[0].cond, undefined, 'y se le vuelve a cerrar');
});

test('al empleado no le llega la lista siquiera, con permiso o sin él', async () => {
  const e = (await empleada('GET', '/api/estado')).datos.estado;
  assert.equal(e.entrevistas, undefined);
});

test('quitar y poner el permiso queda en la auditoría', async () => {
  const filas = (await prog('GET', '/api/auditoria?n=50')).datos.filas || [];
  assert.ok(filas.some(f => /entrevistas/.test(f.accion || '')), 'la auditoría lo registra');
});

// 18/09: la base de entrevistas venía DENTRO de index.html (la semilla del primer
// arranque), y el servidor sirve ese fichero entero a cualquiera que tenga sesión. O sea
// que los 275 teléfonos y lo que el grupo opina por escrito de cada uno estaban en el
// navegador de cada empleado, por mucho que el estado fuera proyectado. Lo pilló la
// batería e2e del permiso. Ahora el bloque se vacía al servir a quien no puede verlo.
const pagina = async c => {
  const r = await fetch(BASE + '/', { headers: { Cookie: c.cookie() } });
  return r.ok ? r.text() : '';
};
test('la app que se descarga NO lleva dentro la base de entrevistas, salvo para quien puede verla', async () => {
  const delJefe = await pagina(jefe);
  assert.ok(/La Paraeta/.test(delJefe), 'el jefe sí la recibe: es su base');
  for (const [quien, c] of [['la oficina', admin], ['una empleada', empleada]]) {
    const html = await pagina(c);
    assert.ok(html.length > 10000, `${quien} recibe la app`);
    assert.ok(/ENTREVISTAS_SEMILLA/.test(html), `${quien}: la app sigue funcionando (la constante existe)`);
    assert.ok(!/La Paraeta/.test(html), `${quien} NO puede descargarse la experiencia de nadie`);
    assert.ok(!/Un poco choni/.test(html), `${quien} NO puede descargarse las observaciones`);
    assert.ok(!/662082645/.test(html), `${quien} NO puede descargarse los teléfonos`);
  }
});

// ─────────────────────────────── 5. saltarse el CSRF
test('toda escritura exige origen propio y cuerpo JSON', async () => {
  const escrituras = [['POST', '/api/peticiones', { tipo: 'LD', desde: diaMas(23) }], ['POST', '/api/logout', {}], ['POST', '/api/nucleo/solve', {}]];
  for (const [m, ruta, cuerpo] of escrituras) {
    const ajeno = await empleada(m, ruta, cuerpo, { Origin: 'https://evil.example' });
    assert.equal(ajeno.status, 403, `${ruta} con origen ajeno`);
    const cross = await empleada(m, ruta, cuerpo, { Origin: BASE, 'Sec-Fetch-Site': 'cross-site' });
    assert.equal(cross.status, 403, `${ruta} con Sec-Fetch-Site cross-site`);
    const formulario = await fetch(BASE + ruta, {
      method: m, headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: empleada.cookie() }, body: 'tipo=LD',
    });
    assert.equal(formulario.status, 415, `${ruta} con cuerpo de formulario`);
  }
});

// ─────────────────────────────── 6. reventar el servidor
test('fuerza bruta: el login se bloquea y el bloqueo es por usuario, no global', async () => {
  const golpear = async usuario => {
    let ultimo = 0;
    for (let i = 0; i < 9; i++) ultimo = (await anon('POST', '/api/login', { usuario, password: 'x' + i })).status;
    return ultimo;
  };
  assert.equal(await golpear('lola'), 429, 'tras varios fallos, bloqueo temporal');
  // el bloqueo no deja fuera a los demás
  assert.equal((await anon('POST', '/api/login', { usuario: 'mariluz', password: 'mala' })).status, 401);
  // ni siquiera con la contraseña buena entra mientras dura el bloqueo
  assert.equal((await anon('POST', '/api/login', { usuario: 'lola', password: 'lolaClave2026' })).status, 429);
});

test('cuerpos enormes y JSON roto se rechazan sin caerse', async () => {
  const enorme = await fetch(BASE + '/api/peticiones', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: empleada.cookie(), Origin: BASE },
    body: JSON.stringify({ tipo: 'VAC', desde: diaMas(27), detalle: 'A'.repeat(2 * 1024 * 1024) }),
  }).catch(() => ({ status: 413 }));
  assert.ok([400, 413].includes(enorme.status), `cuerpo de 2 MB → ${enorme.status}`);
  for (const roto of ['{', 'null', '[]', '"texto"', '{"a":']) {
    const r = await fetch(BASE + '/api/peticiones', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: empleada.cookie(), Origin: BASE }, body: roto,
    });
    assert.ok(r.status < 500, `cuerpo «${roto}» no puede dar 500, dio ${r.status}`);
  }
  // el tope del núcleo (4 MB) también se corta sin caer, aun sin núcleo configurado
  const nucleo = await fetch(BASE + '/api/nucleo/solve', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: admin.cookie(), Origin: BASE },
    body: JSON.stringify({ x: 'A'.repeat(5 * 1024 * 1024) }),
  }).catch(() => ({ status: 413 }));
  assert.ok([413, 503].includes(nucleo.status), `cuerpo de 5 MB al núcleo → ${nucleo.status}`);
  assert.equal((await anon('GET', '/api/salud')).status, 200, 'el servidor sigue en pie');
});

test('no se sirve nada fuera de la lista blanca', async () => {
  for (const ruta of ['/../server.js', '/..%2fserver.js', '/%2e%2e/%2e%2e/etc/passwd', '/server.js', '/package.json', '/estado-servidor.js', '/modelo.js', '/.git/config', '/data/shiftia.db', '/tests/seguridad.test.mjs']) {
    const r = await fetch(BASE + ruta, { headers: { Cookie: admin.cookie() } });
    const cuerpo = r.ok ? await r.text() : '';
    assert.ok(!/DatabaseSync|ADMIN_RESET|"dependencies"|semillaPasarela|estadoParaEmpleado/.test(cuerpo), `${ruta} sirvió código fuente`);
    assert.ok(!r.ok || /^\/(sw\.js|manifest|icons|vendor|assets)/.test(ruta), `${ruta} → ${r.status}: no está en la lista blanca`);
  }
});

// ─────────────────────────────── 7. inyectar
test('la inyección SQL en el usuario no abre sesión ni rompe la tabla', async () => {
  for (const u of ["' OR '1'='1", "admin'--", "admin'; DROP TABLE users;--", "admin "]) {
    const r = await anon('POST', '/api/login', { usuario: u, password: "' OR '1'='1" });
    assert.ok([400, 401, 429].includes(r.status), `«${u}» → ${r.status}`);
  }
  assert.equal((await admin('GET', '/api/usuarios')).status, 200, 'la tabla de usuarios sigue ahí');
});

test('el payload XSS se guarda tal cual y vuelve como TEXTO, nunca como HTML', async () => {
  const veneno = '<img src=x onerror=alert(1)>"><script>alert(2)</script>';
  // el tipo va en lista blanca: lo que no está, no entra
  for (const tipo of ['OTRO', 'admin', '__proto__', '<script>']) {
    assert.equal((await empleada('POST', '/api/peticiones', { tipo, desde: diaMas(30) }, { Origin: BASE })).status, 400, `tipo «${tipo}»`);
  }
  const r = await empleada('POST', '/api/peticiones', { tipo: 'LD', desde: diaMas(30), nota: veneno }, { Origin: BASE });
  assert.equal(r.status, 200);
  const mia = [...await peticionesDe(admin)].reverse().find(x => x.nota && x.nota.includes('onerror'));
  assert.ok(mia, 'la petición se guarda: el servidor no censura, escapa quien pinta');
  assert.equal(mia.nota, veneno, 'se guarda literal, sin mutilar: censurar aquí daría falsa sensación de seguridad');
  assert.equal(mia.estado, 'pendiente');
  // la respuesta es JSON, no HTML: el navegador nunca la ejecuta al recibirla
  assert.match((await fetch(BASE + '/api/estado', { headers: { Cookie: admin.cookie() } })).headers.get('content-type'), /application\/json/);
  // el HTML de la app (cuando exista el build) tampoco lo lleva incrustado
  const app = await fetch(BASE + '/', { headers: { Cookie: admin.cookie() } });
  const html = app.status === 200 ? await app.text() : '';
  assert.ok(!html.includes('onerror=alert(1)'), 'el payload no acaba dentro del HTML servido');
});

// ─────────────────────────────── 8. sacar secretos
test('las cabeceras de seguridad están en TODAS las respuestas, no solo en la portada', async () => {
  // HSTS aparte: solo se emite sobre https (sobre http el navegador la ignora), y
  // el test corre en claro. En producción se comprueba contra el dominio real.
  const obligadas = ['content-security-policy', 'x-content-type-options', 'x-frame-options', 'referrer-policy', 'permissions-policy'];
  const respuestas = [
    ['portada', await fetch(BASE + '/')],
    ['api con sesión', await fetch(BASE + '/api/yo', { headers: { Cookie: admin.cookie() } })],
    ['api sin sesión', await fetch(BASE + '/api/estado')],
    ['404', await fetch(BASE + '/no-existe')],
    ['salud', await fetch(BASE + '/api/salud')],
    ['núcleo', await fetch(BASE + '/api/nucleo/salud', { headers: { Cookie: admin.cookie() } })],
  ];
  for (const [nombre, r] of respuestas) {
    for (const h of obligadas) assert.ok(r.headers.get(h), `falta ${h} en «${nombre}»`);
    assert.match(r.headers.get('content-security-policy'), /frame-ancestors 'none'/, `CSP débil en «${nombre}»`);
    assert.match(r.headers.get('content-security-policy'), /connect-src 'self';/, `el navegador solo habla con este origen (el núcleo va por el servidor) en «${nombre}»`);
    assert.equal(r.headers.get('x-frame-options'), 'DENY');
    assert.ok(!r.headers.get('strict-transport-security'), `HSTS sobre http en «${nombre}»: no sirve de nada`);
  }
  // y con la cabecera del proxy que Railway pone delante, sí sale
  const https = await fetch(BASE + '/api/salud', { headers: { 'X-Forwarded-Proto': 'https' } });
  assert.match(https.headers.get('strict-transport-security'), /max-age=31536000; includeSubDomains/);
});

test('la cookie de sesión no es legible por JavaScript', async () => {
  const r = await fetch(BASE + '/api/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario: 'mariluz', password: 'mariluzClave2026' }),
  });
  const sc = r.headers.get('set-cookie') || '';
  assert.match(sc, /HttpOnly/i, 'HttpOnly: el XSS no puede leerla');
  assert.match(sc, /SameSite=Lax/i);
  assert.match(sc, /Path=\//);
  assert.ok(!/Domain=/i.test(sc), 'sin Domain: la cookie no se comparte con subdominios');
});

test('la copia de seguridad no lleva ni un secreto', async () => {
  const { status, datos } = await admin('GET', '/api/copia');
  assert.equal(status, 200);
  const txt = JSON.stringify(datos);
  for (const fuga of ['hash', 'salt', 'vapid', 'ical_tokens', 'secret', ADMIN_PASS, PROG_PASS, 'SHIFTIA_CORE']) {
    assert.ok(!new RegExp(fuga, 'i').test(txt), `la copia filtra «${fuga}»`);
  }
  assert.ok(datos.usuarios.length && datos.estado, 'pero sí lleva lo que hace falta para restaurar');
  assert.ok(datos.usuarios.some(u => u.rol === 'programador'), 'con todas las cuentas, la del programador incluida');
});

test('salud no delata versión de la app, rutas ni entorno; el núcleo no revela su clave', async () => {
  const { datos } = await anon('GET', '/api/salud');
  assert.deepEqual(Object.keys(datos).sort(), ['app', 'ok', 'persistencia', 'version']);
  assert.equal(typeof datos.version, 'number', 'version es la de la planilla, no la de la app');
  const nucleo = await admin('GET', '/api/nucleo/salud');
  assert.deepEqual(Object.keys(nucleo.datos).sort(), ['configurado', 'ok', 'url'], 'solo si está y si responde: nunca la clave');
});

test('un 500 nunca devuelve el mensaje crudo del error', async () => {
  const r = await fetch(BASE + '/api/estado', {
    method: 'PUT', headers: { 'Content-Type': 'application/json', Cookie: admin.cookie(), Origin: BASE },
    body: JSON.stringify({ version: 'no-es-un-numero', estado: { staff: 'tampoco' } }),
  });
  const txt = await r.text();
  assert.ok(!/at .*server\.js:|TypeError|SQLITE|node:internal/.test(txt), `traza filtrada: ${txt.slice(0, 200)}`);
});

test('la política de contraseñas no acepta las evidentes', async () => {
  const alta = (await admin('POST', '/api/usuarios', { usuario: 'victoria', rol: 'empleado', pid: 'victoria' })).datos;
  const c = cliente();
  await c('POST', '/api/login', { usuario: 'victoria', password: alta.password });
  for (const mala of ['1234567', 'corta', GENERICA, alta.password]) {
    const r = await c('POST', '/api/password', { actual: alta.password, nueva: mala }, { Origin: BASE });
    assert.equal(r.status, 400, `aceptó «${mala}»`);
  }
  assert.equal((await c('POST', '/api/password', { actual: alta.password, nueva: 'UnaBuena2026' }, { Origin: BASE })).status, 200);
});

test('la auditoría deja rastro de lo que importa y solo la ve el programador', async () => {
  const { status, datos } = await prog('GET', '/api/auditoria?n=1000');
  assert.equal(status, 200);
  const acciones = new Set(datos.filas.map(f => f.accion));
  for (const a of ['login', 'login-fallido', 'usuario-alta', 'usuario-reset', 'usuario-baja', 'csrf-rechazado', 'estado', 'password', 'copia', 'peticion']) {
    assert.ok(acciones.has(a), `la auditoría no registra «${a}» — tiene: ${[...acciones].sort().join(', ')}`);
  }
  // el intento de fuerza bruta queda registrado con IP y usuario
  const fallo = datos.filas.find(f => f.accion === 'login-fallido');
  assert.ok(fallo.ip && fallo.ts > 0 && fallo.detalle, 'un login fallido guarda IP, hora y a quién se intentó');
  // filtro y tope
  const soloLogin = await prog('GET', '/api/auditoria?accion=login-fallido&n=5');
  assert.ok(soloLogin.datos.filas.length <= 5 && soloLogin.datos.filas.every(f => f.accion === 'login-fallido'));
  assert.ok((await prog('GET', '/api/auditoria?n=99999')).datos.filas.length <= 1000, 'el tope no se puede saltar');
  assert.ok((await prog('GET', '/api/auditoria?n=-5')).datos.filas.length >= 1, 'un n negativo no rompe nada');
  // ni el encargado, ni un empleado, ni sin sesión
  assert.equal((await admin('GET', '/api/auditoria')).status, 403);
  assert.equal((await empleada('GET', '/api/auditoria')).status, 403);
  assert.equal((await anon('GET', '/api/auditoria')).status, 401);
});
