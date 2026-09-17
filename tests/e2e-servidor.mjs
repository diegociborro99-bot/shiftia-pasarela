// LA APP CONTRA EL SERVIDOR REAL (14/09). `node server.js` con una base de datos
// temporal vacía: la pantalla de acceso, el programador «diego» con su provisional,
// la planilla que la app crea en el servidor al primer acceso, una asignación hecha
// en Hoy que llega al servidor y a otro navegador sin recargar (SSE), el alta de un
// empleado con contraseña genérica y cambio obligatorio, su vista de empleado, y
// el cierre de sesión. Cuenta como fallo un `pageerror` o un assert.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cargarChromium, contador, llega, hasta, prepararPagina, asignarDesdeSelector } from './e2e-util.mjs';

const { chromium, CHROMIUM } = await cargarChromium();
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const { ok, resumen } = contador();
const t0 = Date.now();

const PORT = 8800 + Math.floor(Math.random() * 80), BASE = `http://127.0.0.1:${PORT}`;
const dir = mkdtempSync(join(tmpdir(), 'shiftia-pas-e2e-'));
const ENV = { ...process.env, PORT: String(PORT), DATA_DIR: dir, TRUST_PROXY: '0', ADMIN_PASSWORD: 'clave12345', PROGRAMADOR_PASSWORD: '' };
let logSrv = '';
const srv = spawn('node', [join(RAIZ, 'server.js')], { env: ENV, stdio: ['ignore', 'pipe', 'pipe'] });
srv.stdout.on('data', d => { logSrv += d; }); srv.stderr.on('data', d => { logSrv += d; });
const salud = await hasta(async () => (await fetch(BASE + '/api/salud')).ok, 20000, 150);

// API desde Node con su propia cookie por usuario (Origin y JSON: las pide el servidor en toda escritura)
const jar = () => ({ cookie: '' });
const api = async (j, m, ruta, cuerpo) => {
  const r = await fetch(BASE + ruta, { method: m, headers: { 'Content-Type': 'application/json', Origin: BASE, ...(j.cookie ? { Cookie: j.cookie } : {}) }, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) });
  const sc = r.headers.get('set-cookie'); if (sc) j.cookie = sc.split(';')[0];
  return { ok: r.ok, status: r.status, datos: await r.json().catch(() => null) };
};
const HOY = new Date(); const pad = n => String(n).padStart(2, '0');
const ISO_HOY = `${HOY.getFullYear()}-${pad(HOY.getMonth() + 1)}-${pad(HOY.getDate())}`, CLAVE = ISO_HOY.slice(0, 7);
const errores = [];
// entra por el formulario real de login.html y espera a que la app cargue con sesión de servidor
const entrar = async (pg, usuario, pass) => {
  await pg.goto(BASE + '/');
  await pg.waitForSelector('#loginForm', { timeout: 10000 });
  await pg.fill('#loginUser', usuario); await pg.fill('#loginPass', pass);
  await pg.click('#loginBtn');
};
const appCargada = pg => llega(pg, () => typeof SRV !== 'undefined' && SRV.on && !!SRV.rol && !!document.querySelector('#view-hoy .loccard'), null, 15000);
const chipEn = (pg, a, tope) => llega(pg, a => !!document.querySelector(`[data-cas="${a.iso}|${a.tid}"] .pchip[data-pid="${a.pid}"]`), a, tope || 8000);
const enServidor = (estado, a) => !!(estado && estado.meses && estado.meses[a.iso.slice(0, 7)] && estado.meses[a.iso.slice(0, 7)].asig && estado.meses[a.iso.slice(0, 7)].asig[a.iso] && (estado.meses[a.iso.slice(0, 7)].asig[a.iso][a.tid] || []).some(x => x.pid === a.pid));

const br = await chromium.launch({ executablePath: CHROMIUM, args: ['--no-sandbox'] });
try {
  ok(`el servidor arranca en ${PORT} con DATA_DIR temporal`, !!salud.v, logSrv.slice(-400));
  if (!salud.v) throw new Error('el servidor no responde en /api/salud');

  // ── 1) sin sesión, «/» es la pantalla de acceso; diego entra por el formulario real
  const ctxA = await br.newContext({ viewport: { width: 1280, height: 900 } });
  const A = await ctxA.newPage();
  await prepararPagina(A, errores, 'A (diego)');
  await A.goto(BASE + '/');
  ok('sin sesión, «/» sirve la pantalla de acceso (login.html)', !!(await A.$('#loginForm')) && /Acceso/.test(await A.title()) && !(await A.$('#view-hoy')), await A.title());
  await entrar(A, 'diego', '12345678');
  const tA = await appCargada(A);
  ok(`diego / 12345678 entra por el formulario y llega la app (${tA} ms)`, tA >= 0, (await A.$('#loginErr')) ? await A.$eval('#loginErr', e => e.textContent) : '');
  ok('las pestañas del programador se ven (las nueve: las ocho del encargado más Actividad)', await A.$$eval('.tab', ts => ts.filter(t => t.offsetParent).length) === 9, await A.$$eval('.tab', ts => ts.filter(t => t.offsetParent).map(t => t.dataset.v).join(',')));
  ok('la sesión es de programador (esAdmin) sin cambio obligatorio', await A.evaluate(() => SRV.rol === 'programador' && SRV.esAdmin === true && SRV.usuario === 'diego') && !(await A.$('#cambioPassOvl')));
  ok('entrar no deja errores de página', errores.length === 0, errores.join(' | '));

  // ── 2) primera conexión con el servidor vacío: la app crea la planilla
  const jD = jar();
  const lg = await api(jD, 'POST', '/api/login', { usuario: 'diego', password: '12345678' });
  ok('la API deja entrar a diego desde Node', lg.ok && lg.datos && lg.datos.rol === 'programador', JSON.stringify(lg.datos));
  const primera = await hasta(async () => { const r = await api(jD, 'GET', '/api/estado'); return r.ok && r.datos.version >= 1 && r.datos.estado ? r.datos : null; }, 10000);
  ok(`la app crea la planilla en el servidor (version ${primera.v ? primera.v.version : '?'} en ${primera.ms} ms)`, !!primera.v && primera.v.version >= 1);
  const e1 = primera.v ? primera.v.estado : null;
  ok('la planilla lleva las 23 personas del grupo', !!e1 && Array.isArray(e1.staff) && e1.staff.length === 23, e1 && e1.staff && e1.staff.length);
  ok('y los 4 locales', !!e1 && Array.isArray(e1.locales) && e1.locales.length === 4, e1 && e1.locales && e1.locales.length);
  const mesActual = e1 && e1.meses && e1.meses[CLAVE];
  const plazasMes = mesActual ? Object.values(mesActual.asig || {}).reduce((a, d) => a + Object.values(d).reduce((b, l) => b + l.length, 0), 0) : 0;
  console.log(`  · nota: la primera planilla ${plazasMes ? `viene con el mes ${CLAVE} generado (${plazasMes} plazas)` : `llega con el mes ${CLAVE} vacío`}`);
  ok('la app sabe la versión que tiene el servidor', await llega(A, v => SRV.version >= v, primera.v ? primera.v.version : 1, 5000) >= 0, await A.evaluate(() => SRV.version));
  ok('sin servidor de datos en localStorage (la planilla vive en el servidor)', await A.evaluate(() => !localStorage.getItem('shiftia_pasarela_v01')));

  // ── 3) asignar en Hoy → el estado llega al servidor
  const v0 = (await api(jD, 'GET', '/api/estado')).datos.version;
  const a1 = await asignarDesdeSelector(A);
  ok(`el selector de Hoy pone a alguien (${a1 ? a1.pid + ' en ' + a1.tid + ' el ' + a1.iso + ', ' + a1.via : '-'})`, !!a1 && a1.despues === a1.antes + 1, JSON.stringify(a1));
  if (!a1) throw new Error('sin asignación no se puede seguir');
  const sube = await hasta(async () => { const r = await api(jD, 'GET', '/api/estado'); return r.ok && r.datos.version > v0 ? r.datos : null; }, 10000);
  ok(`el estado llega al servidor: la versión sube de ${v0} a ${sube.v ? sube.v.version : '?'} (${sube.ms} ms)`, !!sube.v);
  ok(`la asignación está en estado.meses[${a1.iso.slice(0, 7)}].asig`, !!sube.v && enServidor(sube.v.estado, a1));
  ok('y queda en el historial con el usuario que la hizo', !!sube.v && (sube.v.estado.historial || []).some(h => h.usuario === 'diego' && h.tipo === 'asig'));

  // ── 3b) Actividad: el visor del programador fusiona el historial de la planilla con la auditoría del servidor
  ok('diego ve la pestaña Actividad y el body lleva rol-programador', await A.evaluate(() => !!document.querySelector('.tab[data-v="actividad"]').offsetParent && document.body.classList.contains('rol-programador')));
  await A.click('.tab[data-v="actividad"]');
  const tAct = await llega(A, () => !document.getElementById('view-actividad').classList.contains('hidden') && !!document.querySelector('#actRoot .actrow[data-accion="login"]'), null, 8000);
  ok(`Actividad se abre y pinta filas con la auditoría del servidor (${tAct} ms)`, tAct >= 0, await A.evaluate(() => (document.getElementById('actRoot') || { textContent: '' }).textContent.slice(0, 200)));
  const filas = await A.$$eval('#actRoot .actrow', rs => rs.map(r => ({ accion: r.dataset.accion, usuario: r.dataset.usuario, grupo: r.dataset.grupo, txt: r.textContent.replace(/\s+/g, ' ').trim() })));
  ok('lista el inicio de sesión de diego («Inicio de sesión»)', filas.some(f => f.accion === 'login' && f.usuario === 'diego' && f.grupo === 'accesos' && /Inicio de sesión/.test(f.txt)), JSON.stringify(filas.slice(0, 5)));
  ok('lista el guardado de la planilla de diego («Guardó la planilla (vN · …)»)', filas.some(f => f.accion === 'estado' && f.usuario === 'diego' && f.grupo === 'planilla' && /Guardó la planilla \(v\d+ · /.test(f.txt)), JSON.stringify(filas.filter(f => f.accion === 'estado').slice(0, 3)));
  ok('y la asignación del historial de la planilla, fusionada en la misma línea de tiempo', filas.some(f => f.accion === 'hist-asig' && f.usuario === 'diego' && /historial de la planilla/.test(f.txt)), JSON.stringify(filas.filter(f => /^hist-/.test(f.accion)).slice(0, 3)));
  ok('las filas del servidor llevan la IP', filas.some(f => f.accion === 'login' && /127\.0\.0\.1/.test(f.txt)));
  ok('las filas van de lo más reciente a lo más antiguo, agrupadas por día («Hoy»)', await A.evaluate(() => { const ts = [...document.querySelectorAll('#actRoot .actrow')].map(r => +r.dataset.ts); return ts.length > 1 && ts.every((t, i) => !i || t <= ts[i - 1]) && /^Hoy/.test((document.querySelector('#actRoot .cobday') || {}).textContent || ''); }));
  ok('las cinco tarjetas resumen están', await A.$$eval('#actKpis .kpi', k => k.length) === 5, await A.$$eval('#actKpis .kpi', k => k.map(x => x.dataset.kpi).join(',')));
  ok('«último guardado» enseña la versión y quién', await A.$eval('#actKpis [data-kpi="guardado"]', k => /^v\d+$/.test(k.querySelector('.knum').textContent.trim()) && /diego/.test(k.textContent)), await A.$eval('#actKpis', k => k.textContent));
  ok('«cambios de hoy» cuenta la asignación del historial', await A.$eval('#actKpis [data-kpi="hoy"] .knum', k => +k.textContent >= 1), await A.$eval('#actKpis [data-kpi="hoy"]', k => k.textContent));
  ok('avisa de que el encargado aún no ha entrado', await A.$eval('#actAviso', a => /aún no ha entrado/.test(a.textContent)) && await A.$eval('#actKpis [data-kpi="acceso"] .knum', k => k.textContent.trim() === '—'));
  ok('hay chips de usuario (diego) y de tipo (Accesos, Planilla, Usuarios, Peticiones, Otros)', await A.evaluate(() => !!document.querySelector('#actChipsU [data-actu="diego"]') && ['accesos', 'planilla', 'usuarios', 'peticiones', 'otros'].every(g => !!document.querySelector(`#actChipsT [data-actg="${g}"]`))));
  await A.click('#actChipsT [data-actg="accesos"]');
  ok('el chip «Accesos» deja solo accesos', await A.$$eval('#actRoot .actrow', rs => rs.length > 0 && rs.every(r => r.dataset.grupo === 'accesos')), await A.$$eval('#actRoot .actrow', rs => rs.map(r => r.dataset.grupo).join(',')));
  await A.click('#actChipsT [data-actg=""]');
  await A.fill('#actQ', 'guardó');
  ok('el buscador filtra por texto (sin distinguir acentos)', await llega(A, () => { const rs = [...document.querySelectorAll('#actRoot .actrow')]; return rs.length > 0 && rs.every(r => /Guardó/.test(r.textContent)); }, null, 3000) >= 0);
  await A.fill('#actQ', '');
  ok('abrir Actividad no deja errores de página', errores.length === 0, errores.join(' | '));

  // ── 4) recargar: sigue; otro navegador (admin) la ve; y una edición nueva le llega sin recargar
  await A.reload();
  ok('tras recargar, la app vuelve con sesión', await appCargada(A) >= 0);
  ok('tras recargar, la asignación sigue en su casilla', await chipEn(A, a1, 6000) >= 0);
  const ctxB = await br.newContext({ viewport: { width: 1280, height: 900 } });
  const B = await ctxB.newPage();
  await prepararPagina(B, errores, 'B (admin)');
  await entrar(B, 'oficina', 'clave12345');
  ok('oficina / clave12345 entra en otro navegador', await appCargada(B) >= 0 && await B.evaluate(() => SRV.rol === 'admin' && SRV.esAdmin));
  ok('el admin ve la asignación de diego', await chipEn(B, a1, 8000) >= 0);
  ok('el admin está en el mismo día que diego', await B.evaluate(() => isoDia()) === a1.iso, await B.evaluate(() => isoDia()));
  // la edición tiene que ser algo que B aún no tenga en pantalla: se quita a la
  // persona (B ve desaparecer el chip) y se vuelve a poner (B ve un chip «a mano»)
  const vB1 = await B.evaluate(() => SRV.version);
  await A.click(`[data-cas="${a1.iso}|${a1.tid}"] .rmx[data-un="${a1.iso}|${a1.tid}|${a1.pid}"]`);
  ok(`diego quita a ${a1.pid} de la casilla con el ×`, await llega(A, a => !document.querySelector(`[data-cas="${a.iso}|${a.tid}"] .pchip[data-pid="${a.pid}"]`), a1, 3000) >= 0);
  const tQ = await llega(B, a => !document.querySelector(`[data-cas="${a.iso}|${a.tid}"] .pchip[data-pid="${a.pid}"]`), a1, 8000);
  ok(`el chip desaparece en B sin recargar (SSE) en ≤ 8 s (${tQ} ms)`, tQ >= 0 && tQ <= 8000);
  const a2 = await asignarDesdeSelector(A);
  ok(`diego vuelve a poner a alguien desde el selector (${a2 ? a2.pid + ' en ' + a2.tid + ', ' + a2.via : '-'})`, !!a2 && a2.despues === a2.antes + 1, JSON.stringify(a2));
  const tB = a2 ? await llega(B, a => { const c = document.querySelector(`[data-cas="${a.iso}|${a.tid}"] .pchip[data-pid="${a.pid}"]`); return !!c && /a mano/.test(c.dataset.tipstr || ''); }, a2, 8000) : -1;
  ok(`la asignación nueva (origen «a mano») aparece en B sin recargar en ≤ 8 s (${tB} ms)`, tB >= 0 && tB <= 8000);
  const vA = await A.evaluate(() => SRV.version), vB = await B.evaluate(() => SRV.version);
  ok(`B va por la misma versión que A y por encima de la que tenía (${vB1} → ${vB})`, vA === vB && vB > vB1, `${vB} vs ${vA}`);

  // ── 4b) el admin no ve Actividad; el programador, tras «Actualizar», ve el acceso del admin
  ok('el admin ve las ocho pestañas del encargado: Actividad no (offsetParent null) y sin rol-programador', await B.$$eval('.tab', ts => ts.filter(t => t.offsetParent).length) === 8 && await B.$eval('.tab[data-v="actividad"]', t => t.offsetParent === null) && await B.evaluate(() => !document.body.classList.contains('rol-programador')), await B.$$eval('.tab', ts => ts.filter(t => t.offsetParent).map(t => t.dataset.v).join(',')));
  // abre «Más», mira si lista Actividad y lo cierra; espera a que el «atrás» que deja el overlay se asiente
  const enMas = pg => pg.evaluate(() => new Promise(res => { openMas(); const hay = !!document.querySelector('#masOvl [data-mas="actividad"]'); document.querySelector('#masOvl [data-ovx]').click(); setTimeout(() => res(hay), 350); }));
  ok('«Más» del admin no lista Actividad; el de diego sí', !(await enMas(B)) && await enMas(A));
  ok('el servidor no le da la auditoría al admin (403)', await B.evaluate(async () => (await fetch('/api/auditoria?n=5', { credentials: 'same-origin' })).status) === 403);
  ok('switchTab(«actividad») en el admin cae en Hoy', await B.evaluate(() => { switchTab('actividad'); return !document.getElementById('view-hoy').classList.contains('hidden') && document.getElementById('view-actividad').classList.contains('hidden'); }));
  await llega(A, () => !document.querySelector('#masOvl'), null, 2000);
  await A.click('.tab[data-v="actividad"]');
  await llega(A, () => !document.getElementById('view-actividad').classList.contains('hidden') && !!document.querySelector('#actRefresh'), null, 5000);
  await A.click('#actRefresh');
  const tAdm = await llega(A, () => !!document.querySelector('#actRoot .actrow[data-accion="login"][data-usuario="oficina"]'), null, 8000);
  ok(`tras «Actualizar», Actividad lista el inicio de sesión del admin (${tAdm} ms)`, tAdm >= 0, await A.$$eval('#actRoot .actrow', rs => rs.slice(0, 6).map(r => r.dataset.accion + ':' + r.dataset.usuario).join(',')));
  ok('la tarjeta «último acceso del encargado» dice oficina y el aviso desaparece', await A.$eval('#actKpis [data-kpi="acceso"] .knum', k => k.textContent.trim() === 'oficina') && await A.$eval('#actAviso', a => !/aún no ha entrado/.test(a.textContent)), await A.$eval('#actKpis [data-kpi="acceso"]', k => k.textContent));
  ok('el chip de usuario «oficina» va marcado como encargado', await A.$eval('#actChipsU [data-actu="oficina"]', c => /encargado/.test(c.textContent)));
  await A.click('#actChipsU [data-actu="oficina"]');
  ok('el chip de usuario «oficina» deja solo sus filas', await A.$$eval('#actRoot .actrow', rs => rs.length > 0 && rs.every(r => r.dataset.usuario === 'oficina')), await A.$$eval('#actRoot .actrow', rs => rs.map(r => r.dataset.usuario).join(',')));
  await A.click('#actChipsU [data-actu=""]');
  await A.click('.tab[data-v="hoy"]');

  // ── 5) empleado: alta con contraseña genérica, cambio obligatorio y vista de empleado
  const jAdm = jar();
  await api(jAdm, 'POST', '/api/login', { usuario: 'oficina', password: 'clave12345' });
  const alta = await api(jAdm, 'POST', '/api/usuarios', { usuario: 'noe', rol: 'empleado', pid: 'noe' });
  ok('el admin da de alta a «noe» (empleado, pid noe) y recibe la contraseña genérica', alta.ok && alta.datos && !!alta.datos.password && alta.datos.generica === true, JSON.stringify(alta.datos));
  const jNoe = jar();
  const lgNoe = await api(jNoe, 'POST', '/api/login', { usuario: 'noe', password: alta.datos.password });
  ok('con la genérica el servidor deja entrar pero marca cambiar=true', lgNoe.ok && lgNoe.datos && lgNoe.datos.cambiar === true, JSON.stringify(lgNoe.datos));
  const estNoe = await api(jNoe, 'GET', '/api/estado');
  ok('y no deja ver la planilla hasta cambiarla (403 cambiar)', estNoe.status === 403 && estNoe.datos && estNoe.datos.cambiar === true, JSON.stringify(estNoe));
  const ctxC = await br.newContext({ viewport: { width: 1280, height: 900 } });
  const C = await ctxC.newPage();
  await prepararPagina(C, errores, 'C (noe)');
  await entrar(C, 'noe', alta.datos.password);
  ok('la pantalla de acceso pasa al cambio obligatorio de contraseña', await llega(C, () => { const c = document.getElementById('cambioPassOvl'); return !!c && !c.hidden && document.getElementById('loginForm').hidden; }, null, 6000) >= 0);
  ok('no pide otra vez la contraseña inicial (ya la sabe del formulario)', await C.$eval('#cnv0', i => i.hidden));
  await C.fill('#cnv1', 'NoeClave2026'); await C.fill('#cnv2', 'NoeClave2026');
  await C.click('#cambioBtn');
  const tC = await llega(C, () => document.body.classList.contains('modo-empleado') && !!document.querySelector('#view-perfil'), null, 15000);
  ok(`tras cambiarla, la app carga en modo empleado (body.modo-empleado, #view-perfil) (${tC} ms)`, tC >= 0, (await C.$('#cambioErr')) ? await C.$eval('#cambioErr', e => e.textContent) : await C.url());
  ok('#view-perfil lleva su nombre', tC >= 0 && await C.$eval('#view-perfil', v => /Noe/.test((v.querySelector('h2') || v).textContent)), tC >= 0 ? await C.$eval('#view-perfil', v => v.textContent.slice(0, 120)) : '');
  ok('#view-perfil se ve', tC >= 0 && await C.$eval('#view-perfil', v => v.getBoundingClientRect().height > 0 && getComputedStyle(v).display !== 'none'));
  ok('no se ven las pestañas del encargado', tC >= 0 && await C.$$eval('.tab', ts => ts.every(t => !t.offsetParent)));
  ok('ni #view-hoy', tC >= 0 && await C.$eval('#view-hoy', v => getComputedStyle(v).display === 'none'));
  ok('ni la barra de acciones del encargado (revisar, historial, cuenta)', tC >= 0 && await C.evaluate(() => ['topRevisar', 'topHist', 'topCuenta'].every(id => !document.getElementById(id).offsetParent)));
  ok('el empleado recibe solo lo suyo: su ficha con ausencias, las ajenas sin ellas, sin historial', tC >= 0 && await C.evaluate(() => { const yo = S.staff.find(p => p.id === 'noe'); const otro = S.staff.find(p => p.id !== 'noe'); return !!yo && Array.isArray(yo.ausencias) && !!otro && !(S.historial || []).length; }));
  ok('el servidor recuerda la contraseña nueva (login con ella)', (await api(jar(), 'POST', '/api/login', { usuario: 'noe', password: 'NoeClave2026' })).ok);
  ok('y la genérica ya no vale', (await api(jar(), 'POST', '/api/login', { usuario: 'noe', password: alta.datos.password })).status === 401);

  // ── 5b) permisos desde Cuenta: la oficina asciende a noe y luego se lo quita (José, 17/09)
  await B.click('#topCuenta');
  await B.waitForSelector('#ctaOvl [data-usrrol]', { timeout: 5000 });
  ok('Cuenta lista un selector de permisos por cuenta, menos para la propia',
    await B.$$eval('#ctaOvl [data-usrrol]', ss => ss.length) >= 2
    && await B.evaluate(() => { const fila = [...document.querySelectorAll('#ctaOvl .festrow')].find(f => /\(tú\)/.test(f.textContent)); return !!fila && !fila.querySelector('[data-usrrol]'); }),
    await B.$$eval('#ctaOvl .festrow', fs => fs.map(f => f.textContent.replace(/\s+/g, ' ').trim()).join(' | ')));
  const idNoe = await B.evaluate(async () => (await (await fetch('/api/usuarios', { credentials: 'same-origin' })).json()).usuarios.find(u => u.usuario === 'noe').id);
  await B.evaluate(() => { window.confirm = () => true; });
  await B.selectOption(`#ctaOvl [data-usrrol="${idNoe}"]`, 'admin');
  const subido = await llega(B, async id => (await (await fetch('/api/usuarios', { credentials: 'same-origin' })).json()).usuarios.find(u => u.usuario === 'noe').rol === 'admin'
    && document.querySelector(`[data-usrrol="${id}"]`).value === 'admin', idNoe, 6000);
  ok('subir a «noe» a administradora desde el selector lo guarda en el servidor', subido >= 0);
  ok('y a noe le caduca la sesión al momento (vuelve a entrar ya con lo que le toca)',
    (await api(jNoe, 'GET', '/api/yo')).status === 401);
  await B.selectOption(`#ctaOvl [data-usrrol="${idNoe}"]`, 'empleado');
  const bajado = await llega(B, async () => { const u = (await (await fetch('/api/usuarios', { credentials: 'same-origin' })).json()).usuarios.find(u => u.usuario === 'noe'); return u.rol === 'empleado' && u.pid === 'noe'; }, null, 6000);
  ok('y quitárselos la devuelve a empleada conservando su ficha de la planilla', bajado >= 0,
    JSON.stringify(await B.evaluate(async () => (await (await fetch('/api/usuarios', { credentials: 'same-origin' })).json()).usuarios.find(u => u.usuario === 'noe'))));
  // y a una cuenta que no está atada a nadie de la planilla —la del jefe— se le pregunta
  // de quién es antes de dejarla como empleada
  const idJefe = await B.evaluate(async () => (await (await fetch('/api/usuarios', { credentials: 'same-origin' })).json()).usuarios.find(u => u.usuario === 'admin').id);
  await B.selectOption(`#ctaOvl [data-usrrol="${idJefe}"]`, 'empleado');
  const preguntó = await llega(B, () => !!document.querySelector('#usrPidOvl #usrPidSel'), null, 5000);
  ok('quitarle los permisos a una cuenta sin ficha pregunta primero de quién es', preguntó >= 0);
  const quien = await B.$eval('#usrPidOvl #usrPidSel option', o => o.value);
  await B.selectOption('#usrPidOvl #usrPidSel', quien);
  await B.click('#usrPidOvl #usrPidOk');
  const bajoJefe = await llega(B, async q => { const u = (await (await fetch('/api/usuarios', { credentials: 'same-origin' })).json()).usuarios.find(u => u.usuario === 'admin'); return u.rol === 'empleado' && u.pid === q; }, quien, 6000);
  ok('y al elegirla se guarda como empleada con esa persona', bajoJefe >= 0);
  await B.selectOption(`#ctaOvl [data-usrrol="${idJefe}"]`, 'admin');
  ok('devolverle los permisos la deja otra vez de administradora', await llega(B, async () => (await (await fetch('/api/usuarios', { credentials: 'same-origin' })).json()).usuarios.find(u => u.usuario === 'admin').rol === 'admin', null, 6000) >= 0);
  await B.click('#ctaOvl [data-ovx]');

  // ── 6) cerrar sesión devuelve a la pantalla de acceso
  await B.click('#topCuenta');
  await B.waitForSelector('#ctaOvl #pinSalir', { timeout: 4000 });
  await B.click('#ctaOvl #pinSalir');
  ok('admin: Cuenta → «Cerrar sesión» devuelve a la pantalla de acceso', await llega(B, () => !!document.getElementById('loginForm') && !document.getElementById('view-hoy'), null, 8000) >= 0);
  ok('y la cookie ya no sirve (401 en /api/yo)', await B.evaluate(async () => (await fetch('/api/yo', { credentials: 'same-origin' })).status) === 401);
  if (tC >= 0) {
    await C.click('#view-perfil #perfSalir');
    ok('empleado: «Salir» devuelve a la pantalla de acceso', await llega(C, () => !!document.getElementById('loginForm') && !document.getElementById('view-perfil'), null, 8000) >= 0);
  } else ok('empleado: «Salir» devuelve a la pantalla de acceso', false, 'no llegó a entrar en modo empleado');
  ok('A (diego) sigue dentro: cerrar sesión en B no le afecta', await A.evaluate(async () => (await fetch('/api/yo', { credentials: 'same-origin' })).ok));
  ok('/api/logout por API cierra la sesión de Node', (await api(jD, 'POST', '/api/logout', {})).ok && (await api(jD, 'GET', '/api/yo')).status === 401);

  ok('sin errores de página en ninguno de los navegadores', errores.length === 0, errores.slice(0, 4).join(' | '));
} catch (err) {
  ok('la batería reventó', false, err.message + '\n' + (err.stack || '').split('\n').slice(1, 3).join('\n') + '\n[servidor] ' + logSrv.slice(-600));
} finally {
  await br.close().catch(() => {});
  try { srv.kill(); } catch (e) {}
  rmSync(dir, { recursive: true, force: true });
}
console.log(`\ntiempo: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
resumen();
