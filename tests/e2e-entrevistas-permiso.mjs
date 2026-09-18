// EL CONTENIDO DE LAS ENTREVISTAS ES DEL JEFE (18/09) — contra el servidor REAL.
// José: «en la opción de entrevistas, Aroa funciona bien para antes de citar a alguien
// comprueba si previamente lo hemos descartado pero no quiero que tenga acceso al
// contenido de cada entrevista. Si sí le hemos entrevistado, si hemos puesto bien, mal o
// regular y demás pero no a lo que hay dentro de cada entrevista donde hablo de
// condiciones».
//
// Aroa es la cuenta «oficina». Se entra con su navegador de verdad y se mira la pantalla:
// que la lista le sirve para lo suyo, que no puede abrir ninguna ficha, y que lo de dentro
// no está ni en el HTML ni en la memoria de su pestaña.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cargarChromium, contador, llega, hasta, prepararPagina } from './e2e-util.mjs';

const { chromium, CHROMIUM } = await cargarChromium();
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const { ok, resumen } = contador();
const PORT = 8900 + Math.floor(Math.random() * 80), BASE = `http://127.0.0.1:${PORT}`;
const dir = mkdtempSync(join(tmpdir(), 'shiftia-perm-'));
const srv = spawn('node', [join(RAIZ, 'server.js')], {
  env: { ...process.env, PORT: String(PORT), DATA_DIR: dir, TRUST_PROXY: '0', ADMIN_PASSWORD: 'clave12345', JEFE_PASSWORD: 'jefeclave12345', PROGRAMADOR_PASSWORD: 'progclave12345' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let logSrv = ''; srv.stdout.on('data', d => { logSrv += d; }); srv.stderr.on('data', d => { logSrv += d; });
const salud = await hasta(async () => (await fetch(BASE + '/api/salud')).ok, 20000, 150);

const jar = () => ({ cookie: '' });
const api = async (j, m, ruta, cuerpo) => {
  const r = await fetch(BASE + ruta, { method: m, headers: { 'Content-Type': 'application/json', Origin: BASE, ...(j.cookie ? { Cookie: j.cookie } : {}) }, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) });
  const sc = r.headers.get('set-cookie'); if (sc) j.cookie = sc.split(';')[0];
  return { ok: r.ok, status: r.status, datos: await r.json().catch(() => null) };
};
const errores = [];
const entrar = async (pg, usuario, pass) => {
  await pg.goto(BASE + '/');
  await pg.waitForSelector('#loginForm', { timeout: 10000 });
  await pg.fill('#loginUser', usuario); await pg.fill('#loginPass', pass);
  await pg.click('#loginBtn');
  return llega(pg, () => typeof SRV !== 'undefined' && SRV.on && !!SRV.rol, null, 15000);
};
const SECRETOS = ['La Paraeta', '1200 €', 'Seis dias', 'Un poco choni', 'De mananas'];

const br = await chromium.launch({ executablePath: CHROMIUM, args: ['--no-sandbox'] });
try {
  ok(`el servidor arranca en ${PORT}`, !!salud.v, logSrv.slice(-400));

  // ── el jefe siembra la planilla y una entrevista con todo dentro
  const jJefe = jar();
  ok('el jefe entra por API', (await api(jJefe, 'POST', '/api/login', { usuario: 'admin', password: 'jefeclave12345' })).ok);
  const v0 = (await api(jJefe, 'GET', '/api/estado')).datos.version;
  const estado = {
    staff: [{ id: 'lola', nombre: 'Lola', puesto: 'sala', locales: ['PASARELA'] }],
    locales: [{ id: 'PASARELA', nombre: 'Pasarela' }], meses: {}, peticiones: [],
    entrevistas: [{
      id: 'c1', nombre: 'Fulanita de Tal', tel: '600111222', lista: 'ent', puestos: ['sala'], val: 'mal',
      fecha: '13/10/2025', edad: '41', zona: 'Elche', doc: 'si', exp: 'La Paraeta, 4 meses',
      sueldo: '1200 €', horarios: 'De mananas', cond: 'Seis dias, ocho horas', obs: 'Un poco choni',
      hab: { cafetera: 'si', pda: 'no' },
    }],
  };
  ok('siembra la planilla con una entrevista entera', (await api(jJefe, 'PUT', '/api/estado', { baseVersion: v0, estado })).ok);

  // ── 1) Aroa (oficina) entra y mira Entrevistas
  const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } });
  const pg = await ctx.newPage();
  await prepararPagina(pg, errores, 'Aroa');
  ok('Aroa entra con la cuenta «oficina»', await entrar(pg, 'oficina', 'clave12345') >= 0);
  ok('la app sabe que no ve el contenido', await llega(pg, () => SRV.verEntrevistas === false, null, 8000) >= 0,
    await pg.evaluate(() => String(SRV.verEntrevistas)));

  await pg.click('.tab[data-v="entrevistas"]');
  ok('la sección Entrevistas se abre', await llega(pg, () => { const s = document.getElementById('view-entrevistas'); return !!s && !s.classList.contains('hidden') && !!document.querySelector('#entrevistasRoot .entrow'); }, null, 6000) >= 0);

  const fila = await pg.$eval('#entrevistasRoot .entrow', e => e.textContent);
  ok('ve el nombre y el teléfono: para eso la usa', /Fulanita de Tal/.test(fila) && /600/.test(fila), fila);
  ok('ve que está descartada («Mal»)', /Mal/i.test(fila), fila);
  ok('ve el puesto al que optaba', /Camarer/i.test(fila), fila);

  // ── 2) lo de dentro NO está en su navegador
  const enMemoria = await pg.evaluate(() => JSON.stringify(S.entrevistas || []));
  for (const s of SECRETOS) ok(`«${s}» no está en la memoria de su pestaña`, !enMemoria.includes(s), enMemoria.slice(0, 200));
  const htmlVivo = await pg.content();
  for (const s of SECRETOS) ok(`«${s}» no está en el HTML de su pantalla`, !htmlVivo.includes(s));

  // ── 3) ni puede abrir la ficha ni registrar
  ok('la fila no es un botón: no se puede abrir', await pg.$eval('#entrevistasRoot .entrow', e => e.tagName.toLowerCase() === 'div' && e.classList.contains('entrow-cerrada')),
    await pg.$eval('#entrevistasRoot .entrow', e => e.tagName + ' ' + e.className));
  ok('no hay botón de registrar', !(await pg.$('#entNuevo')));
  await pg.click('#entrevistasRoot .entrow').catch(() => {});
  await pg.waitForTimeout(300);
  ok('pulsarla no abre ninguna ficha', !(await pg.$('#candOvl')));
  ok('se le explica por qué', /El contenido de cada entrevista es del jefe/.test(await pg.$eval('#entrevistasRoot', e => e.textContent)));

  // ── 4) si guarda la planilla, no borra las entrevistas de José
  await pg.evaluate(() => { S.staff[0].nota = 'Aroa toca la planilla'; saveState(); });
  const guardado = await hasta(async () => {
    const e = (await api(jJefe, 'GET', '/api/estado')).datos.estado;
    return e && e.staff[0].nota === 'Aroa toca la planilla' ? e : null;
  }, 9000, 250);
  ok('su cambio llega al servidor', !!guardado.v);
  ok('y la entrevista de José sigue entera', !!guardado.v && guardado.v.entrevistas[0].cond === 'Seis dias, ocho horas',
    JSON.stringify(guardado.v && guardado.v.entrevistas));

  // ── 5) el jefe sí la ve, y en su pantalla
  const ctxJ = await br.newContext({ viewport: { width: 1280, height: 900 } });
  const pgJ = await ctxJ.newPage();
  await prepararPagina(pgJ, errores, 'jefe');
  ok('el jefe entra', await entrar(pgJ, 'admin', 'jefeclave12345') >= 0);
  ok('y él sí tiene el permiso', await llega(pgJ, () => SRV.verEntrevistas === true, null, 8000) >= 0);
  await pgJ.click('.tab[data-v="entrevistas"]');
  await llega(pgJ, () => !!document.querySelector('#entrevistasRoot .entrow'), null, 6000);
  ok('para él la fila sí es un botón', await pgJ.$eval('#entrevistasRoot .entrow', e => e.tagName.toLowerCase() === 'button'));
  ok('y tiene el botón de registrar', !!(await pgJ.$('#entNuevo')));
  await pgJ.click('#entrevistasRoot .entrow'); await pgJ.waitForTimeout(400);
  const ficha = await pgJ.$eval('#candOvl', e => e.textContent).catch(() => '');
  ok('su ficha enseña las condiciones y las observaciones', /Seis dias/.test(ficha) && /Un poco choni/.test(ficha), ficha.slice(0, 200));

  // ── 6) José se lo abre a Aroa desde Usuarios, y ella lo ve al recargar
  const jAroa = jar();
  await api(jAroa, 'POST', '/api/login', { usuario: 'oficina', password: 'clave12345' });
  const idAroa = (await api(jJefe, 'GET', '/api/usuarios')).datos.usuarios.find(u => u.usuario === 'oficina').id;
  ok('el jefe le abre el permiso', (await api(jJefe, 'POST', '/api/usuarios/entrevistas', { id: idAroa, ver: true })).ok);
  await pg.reload({ waitUntil: 'load' });
  ok('al recargar, Aroa ya lo ve', await llega(pg, () => SRV.verEntrevistas === true, null, 12000) >= 0);
  await pg.click('.tab[data-v="entrevistas"]');
  await llega(pg, () => !!document.querySelector('#entrevistasRoot .entrow'), null, 6000);
  ok('y ahora la fila sí se puede abrir', await pg.$eval('#entrevistasRoot .entrow', e => e.tagName.toLowerCase() === 'button'));

  ok('sin errores de página', errores.length === 0, errores.join(' | '));
} finally {
  await br.close();
  srv.kill();
  rmSync(dir, { recursive: true, force: true });
}
resumen();
