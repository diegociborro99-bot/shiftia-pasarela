// UNA PLANILLA GUARDADA CON LA FORMA DE ANTES Y UN AVISO DEL SERVIDOR (24/09, revisión de la fase 6). El servidor
// guarda el estado tal cual lo subió la versión de antes («nunca con» flexible de la persona, la marca p.comodin, el
// interruptor «Contrato»); la app lo migra al cargarlo, pero hasta que el encargado guarda algo el servidor sigue con
// la forma vieja. Cada aviso de versión (SSE: otro dispositivo, un empleado que pide un cambio) traía esa forma vieja y
// la app la comparaba con la suya ya migrada: parecía que la planilla había cambiado, así que vaciaba el deshacer y
// cerraba la ficha abierta de Mari Luz («Otro dispositivo guardó cambios: el panel abierto se ha cerrado»). Con
// `node server.js` real y una base de datos temporal:
//  · se sube por la API una planilla con la forma de antes;
//  · diego entra, abre la ficha de Mari Luz, y otro dispositivo guarda algo que no toca la planilla (el historial);
//  · la app recibe la versión nueva sin cerrar la ficha ni vaciar el deshacer.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { cargarChromium, contador, llega, hasta, prepararPagina } from './e2e-util.mjs';

const { chromium, CHROMIUM } = await cargarChromium();
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const M = createRequire(import.meta.url)(join(RAIZ, 'modelo.js'));
const { ok, resumen } = contador();
const t0 = Date.now();

const PORT = 8900 + Math.floor(Math.random() * 80), BASE = `http://127.0.0.1:${PORT}`;
const dir = mkdtempSync(join(tmpdir(), 'shiftia-pas-e2e-mig-'));
const ENV = { ...process.env, PORT: String(PORT), DATA_DIR: dir, TRUST_PROXY: '0', ADMIN_PASSWORD: 'clave12345', PROGRAMADOR_PASSWORD: '' };
let logSrv = '';
const srv = spawn('node', [join(RAIZ, 'server.js')], { env: ENV, stdio: ['ignore', 'pipe', 'pipe'] });
srv.stdout.on('data', d => { logSrv += d; }); srv.stderr.on('data', d => { logSrv += d; });
setTimeout(() => { console.log('  ✗ tiempo agotado (90 s)'); srv.kill(); process.exit(1); }, 90000).unref();
const salud = await hasta(async () => (await fetch(BASE + '/api/salud')).ok, 20000, 150);

const api = async (j, m, ruta, cuerpo) => {
  const r = await fetch(BASE + ruta, { method: m, headers: { 'Content-Type': 'application/json', Origin: BASE, ...(j.cookie ? { Cookie: j.cookie } : {}) }, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) });
  const sc = r.headers.get('set-cookie'); if (sc) j.cookie = sc.split(';')[0];
  return { ok: r.ok, status: r.status, datos: await r.json().catch(() => null) };
};
const errores = [];
const br = await chromium.launch({ executablePath: CHROMIUM, args: ['--no-sandbox'] });
try {
  ok(`el servidor arranca en ${PORT}`, !!salud.v, logSrv.slice(-400));
  if (!salud.v) throw new Error('el servidor no responde');
  const jD = { cookie: '' };
  ok('la API deja entrar a diego', (await api(jD, 'POST', '/api/login', { usuario: 'diego', password: '12345678' })).ok);
  // la planilla con la forma de antes de la fase 6: «flexible» de la persona, la marca de comodín y «Contrato» apagado
  const viejo = M.semillaPasarela();
  for (const p of viejo.staff) {
    if ((p.nuncaConFlex || []).length) { p.nuncaConFlexible = true; delete p.nuncaConFlex; }
    delete p.nuncaConOff;
  }
  M.personaDe(viejo.staff, 'leo').comodin = true;
  M.personaDe(viejo.staff, 'yilian').inactivas = ['contrato'];
  const sube = await api(jD, 'PUT', '/api/estado', { baseVersion: 0, estado: viejo });
  ok('se sube la planilla con la forma de antes (versión 1)', sube.ok && sube.datos.version === 1, JSON.stringify(sube.datos));

  const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.clock.setFixedTime(new Date('2026-09-24T10:00:00+02:00'));
  const A = await ctx.newPage();
  await prepararPagina(A, errores, 'A (diego)');
  await A.goto(BASE + '/');
  await A.waitForSelector('#loginForm', { timeout: 10000 });
  await A.fill('#loginUser', 'diego'); await A.fill('#loginPass', '12345678'); await A.click('#loginBtn');
  ok('diego entra y carga la planilla', await llega(A, () => typeof SRV !== 'undefined' && SRV.on && !!SRV.rol && SRV.version === 1 && !!document.querySelector('#view-hoy .loccard'), null, 15000) >= 0);
  ok('la app la tiene migrada (la pareja flexible, en las dos fichas)', await A.evaluate(() => (S.staff.find(p => p.id === 'mariluz').nuncaConFlex || []).includes('lavinia') && !('nuncaConFlexible' in S.staff.find(p => p.id === 'lavinia'))));
  const enSrv = (await api(jD, 'GET', '/api/estado')).datos;
  ok('y el servidor sigue con la forma de antes (nadie ha guardado)', enSrv.version === 1 && enSrv.estado.staff.find(p => p.id === 'lavinia').nuncaConFlexible === true, enSrv.version);
  await A.evaluate(() => openFicha('mariluz'));
  ok('diego abre la ficha de Mari Luz', await llega(A, () => !!document.querySelector('#fichaOvl #fichBody .fcar'), null, 5000) >= 0);
  // el deshacer lleva un paso (como si viniera de un cambio anterior que ya se envió)
  await A.evaluate(() => { pushUndo('paso de prueba'); });
  // otro dispositivo guarda algo que no es la planilla (una línea del historial), con la forma de antes
  const otro = JSON.parse(JSON.stringify(enSrv.estado));
  (otro.historial = otro.historial || []).unshift({ ts: Date.now(), tipo: 'cambio', txt: 'nota desde otro dispositivo' });
  const g2 = await api(jD, 'PUT', '/api/estado', { baseVersion: 1, estado: otro });
  ok('otro dispositivo guarda (versión 2)', g2.ok && g2.datos.version === 2, JSON.stringify(g2.datos));
  ok('la app recibe la versión 2 al momento (SSE)', await llega(A, () => SRV.version === 2 && (S.historial || []).some(h => h.txt === 'nota desde otro dispositivo'), null, 10000) >= 0, await A.evaluate(() => SRV.version));
  ok('la ficha de Mari Luz sigue abierta (la planilla no ha cambiado)', await A.evaluate(() => !!document.querySelector('#fichaOvl #fichBody .fcar')));
  ok('sin el aviso «el panel abierto se ha cerrado»', await A.evaluate(() => ![...document.querySelectorAll('.toast')].some(t => /panel abierto se ha cerrado/.test(t.textContent))));
  ok('y el deshacer no se ha vaciado', await A.evaluate(() => undoStack.length === 1), await A.evaluate(() => undoStack.length));
  ok('sin errores de página', errores.length === 0, errores.slice(0, 3).join(' | '));
} catch (err) {
  ok('la batería reventó', false, err.message + '\n' + (err.stack || '').split('\n').slice(1, 3).join('\n'));
} finally {
  await br.close().catch(() => {});
  srv.kill();
  try { rmSync(dir, { recursive: true, force: true }); } catch (e) {}
}
console.log(`\ntiempo: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
resumen();
