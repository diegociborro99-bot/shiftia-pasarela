// CIERRE DE UN LOCAL POR FECHAS, DE PUNTA A PUNTA (reunión del 24/09 y mensaje de Diego; D11).
// «la semana que viene vamos a cerrar el Mónaco para hacer una pequeñita reforma… aunque tú le
// pongas que va a cerrar puntual, sigue generando para toda la semana» / «no tiene un botón de
// cerrar, de cerrar bares por vacaciones» / «que te salga un visor y te ponga apoyos o vacaciones o
// sin trabajo». Y Diego, después: «el Mónaco va a cerrar domingo por la tarde, lunes y martes… el
// domingo de la semana que viene ya sí que estaríamos abiertos». Se recorre con clics reales:
// Equipo → Ajustes de los locales → «＋ Cerrar unos días» → el visor (días, motivo, quién trabajaba,
// qué hace cada uno) → Hoy, Semana, Mes, Horas, Generador, la hoja impresa y la vista del empleado;
// Ctrl+Z, recargar, el aviso de «Cuándo abre», los accesos de Hoy y de la casilla, reabrir, «abrir
// hoy» con su mínimo, y el modo servidor (otro usuario lo ve; el empleado, solo su decisión).
// El reloj de la página se fija en el jueves 24/09/2026 (el día de la reunión).
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync, existsSync, statSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cargarChromium, contador, llega, hasta } from './e2e-util.mjs';

const { chromium, CHROMIUM } = await cargarChromium();
const RAIZ = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'));
const { ok, resumen } = contador();
const t0 = Date.now();

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.ico': 'image/x-icon' };
const srv = createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname.startsWith('/api/')) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end('{"error":"sin servidor"}'); return; }
  const abs = resolve(join(RAIZ, u.pathname === '/' ? 'index.html' : u.pathname));
  if (!abs.startsWith(RAIZ) || !existsSync(abs) || statSync(abs).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(abs)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  res.end(readFileSync(abs));
});
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${srv.address().port}`;
const br = await chromium.launch({ executablePath: CHROMIUM, args: ['--no-sandbox'] });
const errores = [];
const D27 = '2026-09-27', L28 = '2026-09-28', M29 = '2026-09-29', D04 = '2026-10-04';

// dialogos: lista donde se apuntan los mensajes; prompt: lo que se contesta a un prompt()
async function pagina(etiqueta, o) {
  const op = o || {};
  // op.movil: un teléfono táctil (revisión F2: el visor no respondía al primer toque en Android)
  const ctx = await br.newContext({ viewport: op.viewport || { width: 1280, height: 900 }, isMobile: !!op.movil, hasTouch: !!op.movil });
  await ctx.clock.setFixedTime(new Date('2026-09-24T10:00:00+02:00'));
  await ctx.addInitScript(() => { try { sessionStorage.setItem('shiftia_pas_sesion', '1'); sessionStorage.setItem('shiftia_pas_rol', 'admin'); } catch (e) {} });
  const pg = await ctx.newPage();
  pg.__prompt = null;
  pg.on('pageerror', e => errores.push(`${etiqueta}: ${e.message}`));
  pg.on('dialog', d => { if (op.dialogos) op.dialogos.push(d.message()); (d.type() === 'prompt' ? d.accept(pg.__prompt === null ? d.defaultValue() : String(pg.__prompt)) : d.accept()).catch(() => {}); });
  await pg.route(/googleapis|gstatic|cdnjs/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await pg.goto(BASE + '/index.html?demo=1');
  await pg.waitForSelector('#view-hoy .loccard', { timeout: 15000 });
  return pg;
}
const ev = (pg, sel, fn, arg) => pg.$eval(sel, fn, arg).catch(() => null);
const txt = (pg, sel) => ev(pg, sel, x => x.textContent.replace(/\s+/g, ' ').trim());
const clic = (pg, sel) => pg.click(sel, { timeout: 3000 }).then(() => true, () => false);
const vista = async (pg, v) => { await pg.click(`.tab[data-v="${v}"]`); return llega(pg, v => { const s = document.getElementById('view-' + v); return !!s && !s.classList.contains('hidden'); }, v, 4000); };
const irDia = async (pg, iso) => { await pg.evaluate(iso => irAIso(iso), iso); return llega(pg, iso => isoDia() === iso && !!document.querySelector('#view-hoy .loccard'), iso, 4000); };
const pidsCasilla = (pg, iso, tid) => pg.evaluate(([iso, tid]) => pidsEn(estadoDeIso(iso), iso, tid), [iso, tid]);
const trabaja = (pg, iso, pid, franja) => pg.evaluate(([iso, pid, franja]) => turnosDe(S).filter(t => (!franja || t.franja === franja) && pidsEn(estadoDeIso(iso), iso, t.id).includes(pid)).map(t => t.id), [iso, pid, franja]);
const casilla = (pg, iso, tid) => txt(pg, `#view-hoy [data-cas="${iso}|${tid}"]`);
// el visor, paso 1: días (inicio y fin con su franja) y motivo; luego «Siguiente»
async function rellenarPaso1(pg, o) {
  if (o.localId) await clic(pg, `#cierreOvl [data-cieloc="${o.localId}"]`);
  const T = { timeout: 4000 };
  await pg.fill('#cierreOvl #cieIni', o.ini, T); await pg.selectOption('#cierreOvl #cieIniF', o.iniF, T);
  await pg.fill('#cierreOvl #cieFin', o.fin, T); await pg.selectOption('#cierreOvl #cieFinF', o.finF, T);
  await pg.$eval('#cierreOvl #cieFin', x => x.dispatchEvent(new Event('change', { bubbles: true })));
  if (o.motivo) await clic(pg, `#cierreOvl [data-ciemot="${o.motivo}"]`);
}
const paso = pg => ev(pg, '#cierreOvl .ciepasos .on', x => x.dataset.paso);

try {
  // ══ 1) el caso real por el camino de Ajustes ══
  console.log('── 1) Equipo → Ajustes de los locales → Bar Mónaco → «＋ Cerrar unos días» (dom 27 tarde – mar 29)');
  {
    const pg = await pagina('uno');
    await vista(pg, 'equipo');
    await clic(pg, '#btnLocales');
    await pg.waitForSelector('#localesOvl', { timeout: 5000 });
    await clic(pg, '#localesOvl [data-loctab="MONACO"]');
    const aj = await txt(pg, '#localesOvl #locBody');
    ok('Ajustes: la sección «Cierres por fechas» va debajo de «Cuándo abre»', /CUÁNDO ABRE[\s\S]*CIERRES POR FECHAS/.test(aj || ''), (aj || '').slice(0, 300));
    ok('dice que «Cuándo abre» es para todas las semanas', /todas las semanas/.test(aj || ''));
    await clic(pg, '#localesOvl [data-cienuevo]');
    ok('«＋ Cerrar unos días» abre el visor en el paso 1 con el Mónaco elegido', await llega(pg, () => !!document.querySelector('#cierreOvl'), null, 3000) >= 0 && await paso(pg) === '1' && await ev(pg, '#cierreOvl [data-cieloc="MONACO"]', x => x.classList.contains('on')));
    await rellenarPaso1(pg, { ini: D27, iniF: 'T', fin: M29, finF: 'T', motivo: 'reforma' });
    const tira = await pg.$$eval('#cierreOvl .cietira [data-ciedia]', rs => rs.map(r => r.dataset.ciedia + ':' + ((r.querySelector('.on') || {}).dataset || {}).ciefr));
    ok('la tira de días: domingo 27 solo tarde, lunes 28 y martes 29 el día entero', JSON.stringify(tira) === JSON.stringify([`${D27}:${D27}|T`, `${L28}:${L28}|MT`, `${M29}:${M29}|MT`]), JSON.stringify(tira));
    ok('el resumen del paso 1 lo dice en español llano', /Bar Mónaco cerrado por reforma \(dom 27\/09 tarde – mar 29\/09\)/.test(await txt(pg, '#cierreOvl #ciePrevia') || ''), await txt(pg, '#cierreOvl #ciePrevia'));
    await clic(pg, '#cierreOvl #cieSig');
    ok('paso 2 «Quién trabajaba esos días»', await llega(pg, () => document.querySelector('#cierreOvl .ciepasos .on') && document.querySelector('#cierreOvl .ciepasos .on').dataset.paso === '2', null, 3000) >= 0 && /Quién trabajaba esos días/.test(await txt(pg, '#cierreOvl') || ''));
    const pids = await pg.$$eval('#cierreOvl .ciecard[data-ciepid]', cs => cs.map(c => c.dataset.ciepid).sort());
    ok('una tarjeta por persona que trabajaba en el Mónaco esos días', JSON.stringify(pids) === JSON.stringify(['cris', 'cristian', 'esmeralda', 'hojan', 'jenny', 'scapon', 'yilian']), JSON.stringify(pids));
    ok('todas empiezan en «Sin trabajo»: nadie se redistribuye solo', await pg.$$eval('#cierreOvl .ciecard', cs => cs.every(c => (c.querySelector('[data-ciedec].on') || {}).dataset.ciedec.endsWith('|SIN'))));
    ok('cada tarjeta tiene los cuatro botones: Apoyo · Sin trabajo · Día libre · Vacaciones', await pg.$$eval('#cierreOvl .ciecard[data-ciepid="hojan"] [data-ciedec]', bs => bs.map(b => b.textContent.trim()).join(' · ')) === 'Apoyo · Sin trabajo · Día libre · Vacaciones');
    const jenny = await txt(pg, '#cierreOvl .ciecard[data-ciepid="jenny"]');
    ok('los avisos de la tarjeta: «el domingo 27 también hace El 33 por la mañana»', /domingo 27 también hace El 33 por la mañana/.test(jenny || ''), jenny);
    await clic(pg, '#cierreOvl [data-ciedec="scapon|VAC"]');
    await clic(pg, '#cierreOvl [data-ciedec="yilian|REFUERZA"]');
    ok('«Apoyo» abre por día las sugerencias y «donde haga falta»', await llega(pg, () => !!document.querySelector(`#cierreOvl select[data-ciedest="yilian|2026-09-28"]`), null, 2000) >= 0 && await ev(pg, '#cierreOvl select[data-ciedest="yilian|2026-09-28"]', s => [...s.options].some(o => o.value === '' && /donde haga falta/.test(o.textContent)) && [...s.options].some(o => o.value === 'PASARELA_T')));
    await pg.selectOption('#cierreOvl select[data-ciedest="yilian|2026-09-28"]', 'PASARELA_T');
    await clic(pg, '#cierreOvl #cieSig');
    await llega(pg, () => document.querySelector('#cierreOvl .ciepasos .on').dataset.paso === '3', null, 3000);
    const res = await txt(pg, '#cierreOvl #cieResumen');
    ok('paso 3: el resumen dice quién apoya, quién está de vacaciones y quién sin trabajo', /Yilian/.test(res || '') && /Pasarela/.test(res || '') && /Vacaciones[^.]*Susana Capón/.test(res || '') && /Sin trabajo[^.]*Hojan/.test(res || '') && /Cristian/.test(res || ''), res);
    await clic(pg, '#cierreOvl #cieOk');
    ok('al confirmar se cierra el visor', await llega(pg, () => !document.querySelector('#cierreOvl'), null, 4000) >= 0);
    ok('el cierre se guarda en S.cierresPuntuales (nunca en S.cierres)', await pg.evaluate(() => S.cierresPuntuales.length === 1 && S.cierresPuntuales[0].localId === 'MONACO' && JSON.stringify(S.cierresPuntuales[0].dias) === JSON.stringify({ '2026-09-27': ['T'], '2026-09-28': ['M', 'T'], '2026-09-29': ['M', 'T'] }) && !Object.keys(S.cierres || {}).length), await pg.evaluate(() => JSON.stringify(S.cierresPuntuales)));
    ok('la lista de Ajustes lo enseña, con editar y reabrir', /Bar Mónaco cerrado por reforma/.test(await txt(pg, '#localesOvl .cielista') || '') && !!(await pg.$('#localesOvl [data-cieedit]')) && !!(await pg.$('#localesOvl [data-ciereabrir]')), await txt(pg, '#localesOvl .cielista'));
    await clic(pg, '#localesOvl [data-ovx]');
    ok('se retiran las plazas de las casillas cerradas', (await pidsCasilla(pg, D27, 'MONACO_T')).length === 0 && (await pidsCasilla(pg, L28, 'MONACO_M')).length === 0 && (await pidsCasilla(pg, M29, 'MONACO_T')).length === 0);
    ok('Susana Capón: vacaciones el 27 y el 29 (el 28 libra)', await pg.evaluate(() => { const p = personaDeId('scapon'); return ausenciaEn(p, '2026-09-27').tipo === 'VAC' && ausenciaEn(p, '2026-09-29').tipo === 'VAC' && !ausenciaEn(p, '2026-09-28'); }));
    ok('Yilian apoya en Pasarela la tarde del 28, sin forzar', await pg.evaluate(() => { const e = asignados(estadoDeIso('2026-09-28'), '2026-09-28', 'PASARELA_T').find(x => x.pid === 'yilian'); return !!e && e.origen === 'cierre' && !e.forzado; }));

    // ── Hoy
    await vista(pg, 'hoy'); await irDia(pg, D27);
    const c27 = await casilla(pg, D27, 'MONACO_T');
    ok('Hoy 27/09: «Cerrado · Reforma (hasta mar 29)» con «Ver cierre» y sin «abrir hoy»', /Cerrado · Reforma \(hasta mar 29\)/.test(c27 || '') && /Ver cierre/.test(c27 || '') && !/abrir hoy/.test(c27 || ''), c27);
    ok('Hoy 27/09: la mañana del Mónaco sigue abierta con su gente', (await pidsCasilla(pg, D27, 'MONACO_M')).length > 0 && !/Cerrado/.test(await casilla(pg, D27, 'MONACO_M') || ''));
    await irDia(pg, L28);
    ok('Hoy 28/09: mañana y tarde del Mónaco cerradas', /Cerrado · Reforma/.test(await casilla(pg, L28, 'MONACO_M') || '') && /Cerrado · Reforma/.test(await casilla(pg, L28, 'MONACO_T') || ''));
    ok('Hoy 28/09: el lateral cuenta el cierre (apoyos y sin trabajo)', /Bar Mónaco cerrado por reforma/.test(await txt(pg, '#diaSide') || '') && /Yilian/.test(await txt(pg, '#diaSide .cieside') || ''), await txt(pg, '#diaSide .cieside'));
    ok('Hoy 28/09: sin «aviso importante» de plazas en casillas cerradas', !/siguen puestas/.test(await txt(pg, '#diaWarn') || ''));
    await irDia(pg, '2026-09-21');
    ok('Hoy 21/09: el Mónaco abre la tarde (no es un cierre de todos los lunes)', !/Cerrado/.test(await casilla(pg, '2026-09-21', 'MONACO_T') || '') && (await pidsCasilla(pg, '2026-09-21', 'MONACO_T')).length > 0);
    await irDia(pg, D04);
    ok('Hoy 04/10: el Mónaco abre la tarde con normalidad', !/Cerrado/.test(await casilla(pg, D04, 'MONACO_T') || '') && (await pidsCasilla(pg, D04, 'MONACO_T')).includes('scapon'));

    // ── Semana (las dos semanas)
    await irDia(pg, D27); await vista(pg, 'semana');
    ok('Semana del 21: la tarde del domingo del Mónaco sale «cerrado · reforma»', await pg.$$eval('#semRoot .wcierre', xs => xs.length === 1 && /cerrado · reforma/.test(xs[0].textContent)), await pg.$$eval('#semRoot .wcierre', xs => xs.map(x => x.textContent).join('|')));
    await clic(pg, '#wNext');
    await llega(pg, () => S.semLunes === '2026-09-28', null, 3000);
    ok('Semana del 28: cuatro casillas «cerrado · reforma» (lunes y martes, mañana y tarde)', await pg.$$eval('#semRoot .wcierre', xs => xs.length === 4 && xs.every(x => /cerrado · reforma/.test(x.textContent))), await pg.$$eval('#semRoot .wcierre', xs => xs.length));
    const piesDesc = await pg.$$eval('#semRoot tr.piedesc', trs => trs.map(tr => [...tr.querySelectorAll('td')].map(td => td.textContent.replace(/\s+/g, ' ').trim())));
    ok('Semana: Susana en Ausencias el martes 29 (VAC)', /Susana C\.VAC/.test(piesDesc[1][2] || ''), JSON.stringify(piesDesc[1]));
    ok('Semana: Cristian en Descansos el martes 29 marcado «cierre»', await pg.$$eval('#semRoot tr.piedesc:first-of-type td', tds => { const td = tds[2]; return !!td && [...td.querySelectorAll('.dn.cie')].some(x => /Cristian/.test(x.textContent) && /cierre/.test(x.textContent)); }).catch(() => false) || /Cristiancierre/.test(piesDesc[0][2] || ''), JSON.stringify(piesDesc[0]));

    // ── Mes
    await vista(pg, 'mes');
    await pg.waitForSelector('#view-mes td[data-asig="scapon|2026-09-29"]', { timeout: 6000 }).catch(() => null);
    ok('Mes: Susana Capón el 29/09 = VAC', (await txt(pg, '#view-mes td[data-asig="scapon|2026-09-29"]')) === 'VAC');
    ok('Mes: Cristian el 29/09 = pastilla de cierre (sin trabajo)', (await txt(pg, '#view-mes td[data-asig="cristian|2026-09-29"]')) === 'CIE' && await ev(pg, '#view-mes td[data-asig="cristian|2026-09-29"] .pill', p => /sin trabajo/.test(p.dataset.tipstr || '')));
    ok('Mes: marca de cierre en el 27, 28 y 29 de la cabecera', await pg.$$eval('#view-mes th.day', ths => ths.filter(t => t.querySelector('.cied')).map(t => t.dataset.irdia).join()) === `${D27},${L28},${M29}`);

    // ── Horas: la tarde cerrada no cuenta; las vacaciones sí van a la nómina
    ok('Horas: Susana sin la tarde del 29 y con el 29 en vacaciones', await pg.evaluate(() => { const h = horasPersonaMes(S, S.staff, S.meses, 'scapon', 2026, 9); return h.vacacionesDias.includes('2026-09-29') && !pidsEn(estadoDeIso('2026-09-29'), '2026-09-29', 'MONACO_T').includes('scapon'); }));
    ok('Horas: Cristian con el 29 como día sin trabajo por el cierre (informativo)', await pg.evaluate(() => horasPersonaMes(S, S.staff, S.meses, 'cristian', 2026, 9).diasSinTrabajoCierre.includes('2026-09-29')));

    // ── Generador de la semana del 28
    await vista(pg, 'generador');
    if (await pg.evaluate(() => GEN.modo !== 'semana')) await clic(pg, '[data-modo="semana"]');
    for (let i = 0; i < 4 && await pg.evaluate(() => GEN.lunes < '2026-09-28'); i++) await clic(pg, '#gsNext');
    await clic(pg, '#genLimpiar');   // «Vaciar lo generado» (confirm aceptado)
    ok('«Vaciar lo generado» quita el apoyo de Yilian (origen cierre)', !(await trabaja(pg, L28, 'yilian')).length, JSON.stringify(await trabaja(pg, L28, 'yilian')));
    await clic(pg, '#genPrevia');
    ok('«Generar la semana» termina', await llega(pg, () => !!(GEN.previa && GEN.previa.semana), null, 15000) >= 0);
    const celdas = await pg.$$eval('#genRoot td.gcierre', tds => tds.map(t => t.textContent.trim()));
    ok('Generador: cuatro celdas «Cerrado · Reforma»', celdas.length === 4 && celdas.every(t => t === 'Cerrado · Reforma'), JSON.stringify(celdas));
    ok('Generador: una nota con los cierres de la semana', /Bar Mónaco cerrado por reforma/.test(await txt(pg, '#genRoot .gcierres') || ''), await txt(pg, '#genRoot .gcierres'));
    ok('Generador: los rechazados del cierre salen agrupados', /plazas? de la semana tipo[^·]*Bar Mónaco[^·]*cerrado por reforma/.test(await txt(pg, '#genRoot') || ''), (await txt(pg, '#genRoot .gscols') || '').slice(0, 400));
    ok('la propuesta no pone a nadie en las casillas cerradas', await pg.evaluate(() => ['2026-09-28', '2026-09-29'].every(iso => ['MONACO_M', 'MONACO_T'].every(t => !pidsEn(GEN.previa.estado, iso, t).length))));
    ok('Yilian vuelve a su apoyo en Pasarela la tarde del 28', await pg.evaluate(() => pidsEn(GEN.previa.estado, '2026-09-28', 'PASARELA_T').includes('yilian')));
    ok('nadie sin trabajo se redistribuye solo (Hojan, Cristian, Cris, Jenny, Esmeralda en sus franjas cerradas)', await pg.evaluate(() => { const c = S.cierresPuntuales[0]; return Object.entries(c.decisiones).filter(([, d]) => d.tipo !== 'REFUERZA').every(([pid, d]) => (d.turnos || []).filter(k => k >= '2026-09-28').every(k => { const [iso, f] = k.split('|'); return !turnosDe(S).some(t => t.franja === f && pidsEn(GEN.previa.estado, iso, t.id).includes(pid)); })); }));
    ok('«Quién libra» deja fuera a los que no trabajan por el cierre', await pg.evaluate(() => !GEN.previa.libran['2026-09-29'].includes('cristian') && GEN.previa.sinTrabajo['2026-09-29'].includes('cristian')));
    ok('el domingo 04/10 el Mónaco abre por la tarde con gente', await pg.evaluate(() => pidsEn(GEN.previa.estado, '2026-10-04', 'MONACO_T').length > 0));
    await clic(pg, '#genAplicar');
    await llega(pg, () => !GEN.previa, null, 6000);
    ok('al volcar, la planilla queda igual (Yilian en Pasarela, el Mónaco vacío)', (await pidsCasilla(pg, L28, 'PASARELA_T')).includes('yilian') && !(await pidsCasilla(pg, L28, 'MONACO_T')).length);
    // la otra semana del cierre (la del 21): el domingo 27 por la tarde
    await clic(pg, '#gsPrev');
    await clic(pg, '#genPrevia');
    await llega(pg, () => !!(GEN.previa && GEN.previa.semana && GEN.previa.lunes === '2026-09-21'), null, 15000);
    ok('Generador, semana del 21: el domingo por la tarde «Cerrado · Reforma» y sin nadie', await pg.$$eval('#genRoot td.gcierre', tds => tds.length === 1 && tds[0].textContent.trim() === 'Cerrado · Reforma') && await pg.evaluate(() => !pidsEn(GEN.previa.estado, '2026-09-27', 'MONACO_T').length));

    // ── Impresión de la semana del 28
    await pg.evaluate(() => { S.semLunes = '2026-09-28'; abrirImpresion(); });
    await pg.waitForSelector('#printRoot td.cerr', { timeout: 5000 }).catch(() => null);
    const imp = await pg.$$eval('#printRoot td.cerr.cierre', tds => tds.map(t => t.textContent.trim()));
    ok('Hoja semanal: «CERRADO · Reforma» en las casillas cerradas', imp.length === 4 && imp.every(t => t === 'CERRADO · Reforma'), JSON.stringify(imp));
    ok('la hoja sigue siendo solo nombres (sin horas ni números)', !/\d\d:\d\d/.test(await txt(pg, '#printRoot table.pxsem') || ''));
    await pg.evaluate(() => cerrarImpresion());

    // ── la vista del empleado: su casilla «Cerrado por reforma» y su decisión
    await pg.evaluate(() => { sessionStorage.setItem('shiftia_pas_pid', 'cristian'); S.y = 2026; S.m = 9; cargarMes(); activarModoEmpleado(); });
    const perf = await txt(pg, '#view-perfil');
    ok('Empleado (Cristian): el martes 29 «Bar Mónaco · tarde: cerrado por reforma» y «Sin trabajo»', /martes 29 de septiembre[^]*Bar Mónaco[^]*cerrado por reforma[^]*Sin trabajo/i.test(perf || ''), (perf || '').slice(0, 600));
    await pg.evaluate(() => { sessionStorage.removeItem('shiftia_pas_pid'); document.body.classList.remove('modo-empleado'); const s = document.getElementById('view-perfil'); if (s) s.remove(); switchTab('hoy'); });

    // ── recargar: se mantiene
    await pg.reload();
    await pg.waitForSelector('#view-hoy .loccard', { timeout: 15000 });
    await irDia(pg, L28);
    ok('al recargar, el cierre sigue (Hoy 28/09 cerrado por reforma)', /Cerrado · Reforma/.test(await casilla(pg, L28, 'MONACO_T') || '') && await pg.evaluate(() => S.cierresPuntuales.length === 1));
    await pg.context().close();
  }

  // ══ 2) Ctrl+Z lo deshace todo ══
  console.log('── 2) Ctrl+Z deshace el cierre entero (cierre, vacaciones, plazas y apoyos)');
  {
    const pg = await pagina('dos');
    const antes = await pg.evaluate(() => JSON.stringify([pidsEn(estadoDeIso('2026-09-29'), '2026-09-29', 'MONACO_T'), pidsEn(estadoDeIso('2026-09-28'), '2026-09-28', 'PASARELA_T'), personaDeId('scapon').ausencias]));
    await irDia(pg, L28);
    await clic(pg, '#view-hoy [data-cerrarlocal="MONACO"]');
    ok('Hoy: «Cerrar unos días» en la cabecera del local abre el visor con ese local', await llega(pg, () => !!document.querySelector('#cierreOvl [data-cieloc="MONACO"].on'), null, 3000) >= 0);
    await rellenarPaso1(pg, { ini: L28, iniF: 'T', fin: M29, finF: 'T', motivo: 'reforma' });
    ok('del lunes 28 por la tarde al martes: el lunes solo tarde, el martes entero', JSON.stringify(await pg.$$eval('#cierreOvl .cietira [data-ciedia] .on', xs => xs.map(x => x.dataset.ciefr))) === JSON.stringify([`${L28}|T`, `${M29}|MT`]));
    await clic(pg, `#cierreOvl [data-ciefr="${M29}|T"]`);
    ok('cada día de la tira se puede dejar en mañana, tarde, todo el día o abierto', JSON.stringify(await pg.$$eval('#cierreOvl .cietira [data-ciedia] .on', xs => xs.map(x => x.dataset.ciefr))) === JSON.stringify([`${L28}|T`, `${M29}|T`]) && await pg.$$eval(`#cierreOvl [data-ciedia="${M29}"] [data-ciefr]`, bs => bs.map(b => b.textContent.trim()).join('·')) === 'Mañana·Tarde·Todo el día·Abierto');
    await clic(pg, '#cierreOvl #cieSig');
    await llega(pg, () => document.querySelector('#cierreOvl .ciepasos .on').dataset.paso === '2', null, 3000);
    await clic(pg, '#cierreOvl [data-ciedec="scapon|VAC"]');
    await clic(pg, '#cierreOvl [data-ciedec="yilian|REFUERZA"]');
    await pg.selectOption('#cierreOvl select[data-ciedest="yilian|2026-09-28"]', 'PASARELA_T').catch(() => null);
    await clic(pg, '#cierreOvl #cieSig');
    await clic(pg, '#cierreOvl #cieOk');
    await llega(pg, () => !document.querySelector('#cierreOvl'), null, 4000);
    ok('cerrado: sin plazas en el Mónaco tarde y Susana de vacaciones el 29', !(await pidsCasilla(pg, M29, 'MONACO_T')).length && await pg.evaluate(() => (ausenciaEn(personaDeId('scapon'), '2026-09-29') || {}).tipo === 'VAC'));
    await pg.keyboard.press('Control+z');
    await llega(pg, () => !S.cierresPuntuales.length, null, 3000);
    const despues = await pg.evaluate(() => JSON.stringify([pidsEn(estadoDeIso('2026-09-29'), '2026-09-29', 'MONACO_T'), pidsEn(estadoDeIso('2026-09-28'), '2026-09-28', 'PASARELA_T'), personaDeId('scapon').ausencias]));
    ok('Ctrl+Z: sin cierre, las plazas vuelven, Yilian sale de Pasarela y Susana sin vacaciones', despues === antes && await pg.evaluate(() => !S.cierresPuntuales.length), `${antes} → ${despues}`);
    ok('Ctrl+Z: Hoy 28 vuelve a abrir la tarde del Mónaco', !/Cerrado/.test(await casilla(pg, L28, 'MONACO_T') || ''));
    await pg.context().close();
  }

  // ══ 3) «Cuándo abre» avisa de que es para todas las semanas ══
  console.log('── 3) Ajustes → Cuándo abre: desmarcar el domingo por la tarde');
  {
    const pg = await pagina('tres');
    await vista(pg, 'equipo');
    await clic(pg, '#btnLocales');
    await clic(pg, '#localesOvl [data-loctab="MONACO"]');
    await clic(pg, '#localesOvl [data-abre="T|7"]');
    const av = await txt(pg, '#abreAvisoOvl');
    ok('aviso: «Esto cierra TODOS los domingos por la tarde. ¿Querías cerrar solo unos días?»', /Esto cierra TODOS los domingos por la tarde/.test(av || '') && /solo unos días/.test(av || ''), av);
    ok('y el horario aún no ha cambiado', await pg.evaluate(() => localDe(S, 'MONACO').abre.T.includes(7)));
    await clic(pg, '#abreAvisoOvl [data-abreav="fechas"]');
    ok('«Cierre por fechas» abre el visor con el Mónaco y el próximo domingo por la tarde', await llega(pg, () => !!document.querySelector('#cierreOvl'), null, 3000) >= 0 && JSON.stringify(await pg.$$eval('#cierreOvl .cietira [data-ciedia] .on', xs => xs.map(x => x.dataset.ciefr))) === JSON.stringify([`${D27}|T`]));
    ok('y «Cuándo abre» sigue igual', await pg.evaluate(() => localDe(S, 'MONACO').abre.T.includes(7)));
    await clic(pg, '#cierreOvl [data-ovx]');
    await clic(pg, '#localesOvl [data-abre="T|7"]');
    await clic(pg, '#abreAvisoOvl [data-abreav="todas"]');
    ok('«Todos los domingos» con gente ya puesta en semanas planificadas pasa por el mismo visor', await llega(pg, () => !!document.querySelector('#cierreOvl .ciecard'), null, 4000) >= 0 && /Susana Capón/.test(await txt(pg, '#cierreOvl') || ''), (await txt(pg, '#cierreOvl') || '').slice(0, 300));
    await clic(pg, '#cierreOvl #cieSig');
    await clic(pg, '#cierreOvl #cieOk');
    await llega(pg, () => !document.querySelector('#cierreOvl'), null, 4000);
    ok('al confirmar, el Mónaco deja de abrir los domingos por la tarde', await pg.evaluate(() => !localDe(S, 'MONACO').abre.T.includes(7)));
    ok('y las tardes de domingo ya planificadas se quedan sin plazas fantasma', await pg.evaluate(() => ['2026-09-27', '2026-10-04', '2026-10-11'].every(iso => !pidsEn(estadoDeIso(iso), iso, 'MONACO_T').length)));
    ok('la revisión no avisa de plazas en casillas cerradas', await pg.evaluate(() => !revisionMes(S, S.staff, estadoDeIso('2026-10-04'), { desde: '2026-10-01', hasta: '2026-10-31' }).some(x => x.tipo === 'plaza-en-cerrado')));
    await pg.context().close();
  }

  // ══ 4) accesos desde la casilla, «Ver cierre» y reabrir ══
  console.log('── 4) «Cerrar esta franja…» desde la casilla; «Ver cierre» y reabrir');
  {
    const pg = await pagina('cuatro');
    await irDia(pg, M29);
    await clic(pg, `#view-hoy [data-cas="${M29}|MONACO_T"] .pchip[data-pid="cristian"]`);
    await clic(pg, '#menuTurnoPop [data-mt="cerrar"]');
    ok('menú de la casilla → «Cerrar esta franja…»: visor con el Mónaco y la tarde del martes', await llega(pg, () => !!document.querySelector('#cierreOvl'), null, 3000) >= 0 && JSON.stringify(await pg.$$eval('#cierreOvl .cietira [data-ciedia] .on', xs => xs.map(x => x.dataset.ciefr))) === JSON.stringify([`${M29}|T`]));
    await clic(pg, '#cierreOvl #cieSig');
    await clic(pg, '#cierreOvl [data-ciedec="scapon|VAC"]');
    await clic(pg, '#cierreOvl #cieSig');
    await clic(pg, '#cierreOvl #cieOk');
    await llega(pg, () => !document.querySelector('#cierreOvl'), null, 4000);
    ok('cerrada la tarde del martes', /Cerrado/.test(await casilla(pg, M29, 'MONACO_T') || ''));
    await clic(pg, `#view-hoy [data-cas="${M29}|MONACO_T"] [data-vercierre]`);
    ok('«Ver cierre» enseña el cierre con «Editar» y «Reabrir»', await llega(pg, () => !!document.querySelector('#cierreOvl #cieReabrir') && !!document.querySelector('#cierreOvl #cieEditar'), null, 3000) >= 0 && /Susana Capón/.test(await txt(pg, '#cierreOvl') || ''));
    await clic(pg, '#cierreOvl #cieReabrir');
    await llega(pg, () => !S.cierresPuntuales.length, null, 3000);
    ok('reabrir: el cierre desaparece y vuelven Susana y Cristian', !(await pg.evaluate(() => S.cierresPuntuales.length)) && JSON.stringify((await pidsCasilla(pg, M29, 'MONACO_T')).sort()) === JSON.stringify(['cristian', 'scapon']));
    ok('reabrir: Susana ya no está de vacaciones el 29', await pg.evaluate(() => !ausenciaEn(personaDeId('scapon'), '2026-09-29')));
    // el selector de una casilla abierta también lleva «Cerrar esta franja…»
    await clic(pg, `#view-hoy [data-pick="${M29}|ZAPA_T"]`);
    ok('el selector de la casilla lleva «Cerrar esta franja…»', await llega(pg, () => !!document.querySelector('#pickerPop [data-cierrafr]'), null, 3000) >= 0);
    await pg.evaluate(() => closePicker());
    await pg.context().close();
  }

  // ══ 5) «abrir hoy» pide el mínimo (S28) ══
  console.log('── 5) «abrir hoy» una casilla que no abre pide el mínimo');
  {
    const pg = await pagina('cinco');
    await irDia(pg, L28);
    const antes = await casilla(pg, L28, 'EL33_T');
    ok('El 33 no abre la tarde del lunes: «abrir hoy»', /Cerrado el lunes/.test(antes || '') && /abrir hoy/.test(antes || ''), antes);
    pg.__prompt = 2;
    await clic(pg, `#view-hoy [data-abrir="${L28}|EL33_T"]`);
    await llega(pg, () => turnoAbierto(S, estadoDeIso('2026-09-28'), '2026-09-28', 'EL33_T'), null, 3000);
    ok('abierta con el mínimo que se ha dicho: 0/2 y faltan 2', await pg.evaluate(() => revisarTurno(S, S.staff, estadoDeIso('2026-09-28'), '2026-09-28', 'EL33_T').faltan === 2) && /0\/2/.test(await casilla(pg, L28, 'EL33_T') || ''), await casilla(pg, L28, 'EL33_T'));
    await pg.context().close();
  }

  // ══ 7) móvil (390×844, táctil): cada botón del visor responde al PRIMER toque (revisión F2) ══
  // En Android el botón toma el foco al tocarlo; una regla antigua (.ovcard:focus-within) alargaba la
  // ventana 30vh entre el toque y el levantar el dedo, y el clic caía fuera del botón.
  console.log('── 7) móvil: los botones del visor responden al primer toque');
  {
    const pg = await pagina('siete', { viewport: { width: 390, height: 844 }, movil: true });
    await irDia(pg, M29);
    await pg.tap(`#view-hoy [data-cas="${M29}|MONACO_T"] .pchip[data-pid="cristian"]`);
    await pg.waitForSelector('#menuTurnoPop', { timeout: 3000 });
    await pg.tap('#menuTurnoPop [data-mt="cerrar"]');
    await pg.waitForSelector('#cierreOvl #cieSig', { timeout: 3000 });
    const estado = () => pg.evaluate(() => JSON.stringify([typeof CIE !== 'undefined' ? CIE.paso : null, !!document.querySelector('#cierreOvl'), S.cierresPuntuales.length]));
    const unToque = async sel => { const e = await pg.$(sel); if (!e) return false; await e.scrollIntoViewIfNeeded(); await new Promise(r => setTimeout(r, 300)); const antes = await estado(); await e.tap(); await new Promise(r => setTimeout(r, 400)); return antes !== await estado(); };
    ok('móvil: «Siguiente: quién trabajaba esos días» responde al primer toque', await unToque('#cierreOvl #cieSig'));
    ok('móvil: «Siguiente: resumen» responde al primer toque', await unToque('#cierreOvl #cieSig'));
    ok('móvil: «Cerrar Bar Mónaco» responde al primer toque y el cierre queda guardado', await unToque('#cierreOvl #cieOk') && await pg.evaluate(() => S.cierresPuntuales.length === 1));
    await irDia(pg, L28);
    const alto = await ev(pg, '#view-hoy [data-cerrarlocal="MONACO"]', b => Math.round(b.getBoundingClientRect().height));
    ok('móvil: «Cerrar unos días» cabe en una línea en la cabecera del local', alto !== null && alto <= 34, alto);
    await pg.context().close();
  }

  // ══ 8) editar: las franjas elegidas día a día se conservan y las decisiones son solo de quien sigue afectado ══
  console.log('── 8) editar un cierre: cambiar una fecha no reinicia la tira; quien ya no está afectado no se queda «sin trabajo»');
  {
    const pg = await pagina('ocho');
    await pg.evaluate(() => openCierre({ localId: 'MONACO', iso: '2026-09-28', franja: 'T' }));
    await pg.waitForSelector('#cierreOvl #cieIni', { timeout: 3000 });
    await rellenarPaso1(pg, { ini: L28, iniF: 'T', fin: M29, finF: 'T', motivo: 'reforma' });
    await clic(pg, `#cierreOvl [data-ciefr="${M29}|T"]`);
    await clic(pg, '#cierreOvl #cieSig'); await clic(pg, '#cierreOvl #cieSig'); await clic(pg, '#cierreOvl #cieOk');
    await llega(pg, () => S.cierresPuntuales.length === 1 && !document.querySelector('#cierreOvl'), null, 4000);
    const id = await pg.evaluate(() => S.cierresPuntuales[0].id);
    await pg.evaluate(id => openCierre({ id, editar: true }), id);
    await pg.waitForSelector('#cierreOvl #cieFin', { timeout: 3000 });
    await pg.fill('#cierreOvl #cieFin', '2026-09-30');
    await pg.$eval('#cierreOvl #cieFin', x => x.dispatchEvent(new Event('change', { bubbles: true })));
    const tira = await pg.$$eval('#cierreOvl .cietira [data-ciedia]', rs => rs.map(r => r.dataset.ciedia.slice(8) + '=' + ((r.querySelector('.on') || {}).dataset || {}).ciefr.split('|')[1]));
    ok('editar: alargar un cierre de «solo tardes» un día conserva las tardes (y el día nuevo también de tarde)', JSON.stringify(tira) === JSON.stringify(['28=T', '29=T', '30=T']), JSON.stringify(tira));
    await clic(pg, '#cierreOvl [data-ovx]');
    // del martes y el lunes por la tarde a solo el lunes por la tarde: Cristian (solo el martes) ya no está afectado
    await pg.evaluate(id => openCierre({ id, editar: true }), id);
    await pg.waitForSelector('#cierreOvl #cieFin', { timeout: 3000 });
    await pg.fill('#cierreOvl #cieFin', L28);
    await pg.$eval('#cierreOvl #cieFin', x => x.dispatchEvent(new Event('change', { bubbles: true })));
    await clic(pg, '#cierreOvl #cieSig');
    const tarjetas = await pg.$$eval('#cierreOvl .ciecard[data-ciepid]', cs => cs.map(c => c.dataset.ciepid).sort());
    ok('editar: el visor pregunta solo por quien trabajaba el lunes por la tarde', JSON.stringify(tarjetas) === JSON.stringify(['hojan', 'yilian']), JSON.stringify(tarjetas));
    await clic(pg, '#cierreOvl #cieSig'); await clic(pg, '#cierreOvl #cieOk');
    await llega(pg, () => !document.querySelector('#cierreOvl'), null, 4000);
    ok('editar: nadie se queda con una decisión de fuera del cierre (Cristian, Susana)', await pg.evaluate(() => { const c = S.cierresPuntuales[0]; return !c.decisiones.cristian && !c.decisiones.scapon && Object.values(c.decisiones).every(d => (d.turnos || []).length); }), await pg.evaluate(() => JSON.stringify(S.cierresPuntuales[0].decisiones)));
    ok('editar: Cristian puede ir a Pasarela el lunes por la tarde sin forzar', await pg.evaluate(() => puedeEstar(S, S.staff, estadoDeIso('2026-09-28'), '2026-09-28', 'PASARELA_T', 'cristian').regla !== 'cierre'));
    await pg.context().close();
  }

  // ══ 9) «Cuándo abre»: al volver a marcar el día se ofrece reabrir el cierre que dejó ══
  console.log('── 9) «Cuándo abre» → todos los domingos → volver a marcar el domingo reabre los ya planificados');
  {
    const dialogos = [];
    const pg = await pagina('nueve', { dialogos });
    await vista(pg, 'equipo');
    await clic(pg, '#btnLocales');
    await pg.waitForSelector('#localesOvl', { timeout: 5000 });
    await clic(pg, '#localesOvl [data-loctab="MONACO"]');
    await clic(pg, '#localesOvl [data-abre="T|7"]');
    await clic(pg, '#abreAvisoOvl [data-abreav="todas"]');
    await llega(pg, () => !!document.querySelector('#cierreOvl .ciecard'), null, 4000);
    await clic(pg, '#cierreOvl #cieSig'); await clic(pg, '#cierreOvl #cieOk');
    await llega(pg, () => !document.querySelector('#cierreOvl'), null, 4000);
    ok('el cierre de los domingos ya planificados guarda de dónde viene («Cuándo abre»)', await pg.evaluate(() => S.cierresPuntuales.length === 1 && JSON.stringify(S.cierresPuntuales[0].origen) === JSON.stringify({ abre: { franja: 'T', dow: 7 } })), await pg.evaluate(() => JSON.stringify(S.cierresPuntuales.map(c => c.origen))));
    const lista = await txt(pg, '#localesOvl .cielista');
    ok('la lista de Ajustes lo dice como «los domingos por la tarde del 27/09 al …», no como un intervalo seguido', /los domingos por la tarde del 27\/09 al/.test(lista || ''), lista);
    ok('Ctrl+Z con Ajustes abierto: la tabla de «Cuándo abre» se repinta (el domingo por la tarde vuelve a estar marcado)', await (async () => { await pg.keyboard.press('Control+z'); await llega(pg, () => !S.cierresPuntuales.length, null, 3000); return ev(pg, '#localesOvl [data-abre="T|7"]', b => b.classList.contains('on')); })(), await ev(pg, '#localesOvl [data-abre="T|7"]', b => b.className));
    // otra vez, y ahora se vuelve a marcar el domingo por la tarde (el aviso de «Deshecho» taparía
    // el botón del visor unos segundos: se quita, como si hubiera pasado el tiempo)
    await pg.evaluate(() => document.querySelectorAll('#toasts .toast').forEach(t => t.remove()));
    await clic(pg, '#localesOvl [data-abre="T|7"]');
    await llega(pg, () => !!document.querySelector('#abreAvisoOvl'), null, 3000);
    await clic(pg, '#abreAvisoOvl [data-abreav="todas"]');
    await llega(pg, () => !!document.querySelector('#cierreOvl .ciecard'), null, 4000);
    await clic(pg, '#cierreOvl #cieSig'); await clic(pg, '#cierreOvl #cieOk');
    ok('(otra vez) los domingos cerrados desde «Cuándo abre»', await llega(pg, () => !document.querySelector('#cierreOvl') && S.cierresPuntuales.length === 1 && !localDe(S, 'MONACO').abre.T.includes(7), null, 4000) >= 0, await pg.evaluate(() => JSON.stringify([S.cierresPuntuales.length, localDe(S, 'MONACO').abre.T, !!document.querySelector('#cierreOvl'), !!document.querySelector('#abreAvisoOvl')])));
    dialogos.length = 0;
    await clic(pg, '#localesOvl [data-abre="T|7"]');
    await llega(pg, () => localDe(S, 'MONACO').abre.T.includes(7), null, 3000);
    ok('al volver a marcar el domingo por la tarde, pregunta si reabrir los domingos ya planificados', dialogos.some(d => /Reabrir/i.test(d) && /domingos/.test(d)), JSON.stringify(dialogos));
    ok('y al aceptar: sin cierre, el 04/10 por la tarde abre y vuelve su gente', await pg.evaluate(() => !S.cierresPuntuales.length && turnoAbierto(S, estadoDeIso('2026-10-04'), '2026-10-04', 'MONACO_T') && pidsEn(estadoDeIso('2026-10-04'), '2026-10-04', 'MONACO_T').includes('scapon')));
    await pg.context().close();
  }

  // ══ 10) Horas enseña los días sin trabajo por el cierre; Hojan conserva su tramo del partido ══
  console.log('── 10) Horas: «sin trabajo por el cierre» en el detalle; Hojan, El 33 de 11:00 a 16:00');
  {
    const pg = await pagina('diez');
    const hojanAntes = await pg.evaluate(() => horasPersonaMes(S, S.staff, S.meses, 'hojan', 2026, 9).minutos);
    await pg.evaluate(() => openCierre({ localId: 'MONACO', iso: '2026-09-28', franja: 'T' }));
    await pg.waitForSelector('#cierreOvl #cieIni', { timeout: 3000 });
    await rellenarPaso1(pg, { ini: L28, iniF: 'T', fin: M29, finF: 'T', motivo: 'reforma' });
    await clic(pg, `#cierreOvl [data-ciefr="${M29}|T"]`);
    await clic(pg, '#cierreOvl #cieSig');
    await llega(pg, () => !!document.querySelector('#cierreOvl .ciecard[data-ciepid="hojan"]'), null, 3000);
    const tarjeta = await txt(pg, '#cierreOvl .ciecard[data-ciepid="hojan"]');
    ok('visor: a Hojan le dice que hacía partido y se queda con su mañana en El 33 de 11:00 a 16:00', /hacía partido/.test(tarjeta || '') && /11:00 a 16:00/.test(tarjeta || ''), tarjeta);
    await clic(pg, '#cierreOvl #cieSig'); await clic(pg, '#cierreOvl #cieOk');
    await llega(pg, () => !document.querySelector('#cierreOvl'), null, 4000);
    ok('Horas de Hojan: pierde las 3 h de la noche (no se queda igual)', await pg.evaluate(a => horasPersonaMes(S, S.staff, S.meses, 'hojan', 2026, 9).minutos === a - 180, hojanAntes));
    await vista(pg, 'horas');
    await clic(pg, '#horasRoot [data-hx="cristian"]');
    const detC = await txt(pg, '#horasRoot [data-hdet="cristian"]');
    ok('Horas: el detalle de Cristian dice «Sin trabajo por el cierre de Bar Mónaco: mar 29» y que no cuenta en las horas', /Sin trabajo por el cierre de Bar Mónaco: mar 29/.test(detC || '') && /no cuenta en las horas/.test(detC || ''), detC);
    await clic(pg, '#horasRoot [data-hx="hojan"]');
    const detH = await txt(pg, '#horasRoot [data-hdet="hojan"]');
    ok('Horas: el de Hojan, solo la tarde del lunes 28', /Sin trabajo por el cierre de Bar Mónaco: lun 28 por la tarde/.test(detH || ''), detH);
    // su perfil (vista del empleado): El 33 por la mañana de 11:00 a 16:00
    await pg.evaluate(() => { sessionStorage.setItem('shiftia_pas_pid', 'hojan'); S.y = 2026; S.m = 9; cargarMes(); activarModoEmpleado(); });
    const perf = await txt(pg, '#view-perfil');
    ok('Empleado (Hojan): el lunes 28, El 33 por la mañana de 11:00 a 16:00 (no de 07:00)', /lunes 28 de septiembre[^]*?mañana 11:00–16:00/i.test(perf || ''), (perf || '').slice(0, 900));
    await pg.context().close();
  }

  // ══ 11) apoyo «donde haga falta» sin sitio, días pasados y textos ══
  console.log('── 11) apoyo sin sitio, días ya pasados y textos del cierre');
  {
    const dialogos = [];
    const pg = await pagina('once', { dialogos });
    // el martes 29 por la mañana: Yilian de apoyo «donde haga falta» (nadie la coloca)
    await pg.evaluate(() => openCierre({ localId: 'MONACO', iso: '2026-09-29', franja: 'M' }));
    await clic(pg, '#cierreOvl #cieSig');
    await llega(pg, () => !!document.querySelector('#cierreOvl [data-ciedec="yilian|REFUERZA"]'), null, 3000);
    await clic(pg, '#cierreOvl [data-ciedec="yilian|REFUERZA"]');
    await clic(pg, '#cierreOvl #cieSig'); await clic(pg, '#cierreOvl #cieOk');
    await llega(pg, () => !document.querySelector('#cierreOvl') && S.cierresPuntuales.length === 1, null, 4000);
    await irDia(pg, M29);
    const lib = await txt(pg, '#diaSide');
    ok('Hoy 29: Yilian sale «apoyo · sin sitio», no «sin turno»', /Yilian\s*apoyo · sin sitio/.test(lib || ''), (lib || '').slice(0, 600));
    ok('la revisión avisa de que Yilian está de apoyo y aún sin sitio', await pg.evaluate(() => revisionMes(S, S.staff, estadoDeIso('2026-09-29'), { desde: '2026-09-29', hasta: '2026-09-29' }).some(x => x.tipo === 'apoyo-sin-sitio' && x.pid === 'yilian')));
    await vista(pg, 'semana');
    await llega(pg, () => S.semLunes === '2026-09-28', null, 3000);
    const descMar = await pg.$$eval('#semRoot tr.piedesc', trs => { const td = trs[0] && trs[0].querySelectorAll('td')[2]; return td ? [...td.querySelectorAll('.dn')].map(x => x.textContent) : []; });
    ok('Semana: en Descansos del martes, Yilian marcada «apoyo · sin sitio»', descMar.some(x => /Yilian/.test(x) && /apoyo · sin sitio/.test(x)), JSON.stringify(descMar));
    // «Ver cierre» fuera del modo servidor no dice «lo cerró local»
    await vista(pg, 'hoy'); await irDia(pg, M29);
    await clic(pg, `#view-hoy [data-cas="${M29}|MONACO_M"] [data-vercierre]`);
    await llega(pg, () => !!document.querySelector('#cierreOvl #cieReabrir'), null, 3000);
    ok('«Ver cierre» sin servidor no dice «lo cerró local»', !/cerró local/.test(await txt(pg, '#cierreOvl') || ''), await txt(pg, '#cierreOvl .revsub'));
    await clic(pg, '#cierreOvl [data-ovx]');
    ok('el historial dice «plazas retiradas» (sin «plaza(s)»)', await pg.evaluate(() => (S.historial || []).some(h => /plazas? retiradas?/.test(h.txt || h.texto || h.msg || JSON.stringify(h))) && !(S.historial || []).some(h => /plaza\(s\)/.test(JSON.stringify(h)))), await pg.evaluate(() => JSON.stringify((S.historial || []).slice(-2))));
    // cerrar días que ya han pasado avisa, en el paso 1 y en el resumen
    await pg.evaluate(() => openCierre({ localId: 'ZAPA', iso: '2026-09-21', franja: 'T' }));
    await pg.waitForSelector('#cierreOvl #cieSig', { timeout: 3000 });
    ok('paso 1: avisa de que el 21/09 ya ha pasado', /ya ha pasado|ya han pasado/.test(await txt(pg, '#cierreOvl') || ''), await txt(pg, '#cierreOvl .ciepas'));
    await clic(pg, '#cierreOvl #cieSig'); await clic(pg, '#cierreOvl #cieSig');
    await llega(pg, () => document.querySelector('#cierreOvl .ciepasos .on').dataset.paso === '3', null, 3000);
    ok('paso 3: el resumen lo repite y no dice «cuando pase, vuelve a abrir»', /ya ha pasado|ya han pasado/.test(await txt(pg, '#cierreOvl #cieResumen') || '') && !/Cuando pase/.test(await txt(pg, '#cierreOvl #cieResumen') || ''), await txt(pg, '#cierreOvl #cieResumen'));
    await clic(pg, '#cierreOvl #cieOk');
    await llega(pg, () => !document.querySelector('#cierreOvl') && S.cierresPuntuales.length === 2, null, 4000);
    await vista(pg, 'equipo');
    await clic(pg, '#btnLocales');
    await pg.waitForSelector('#localesOvl', { timeout: 5000 });
    await clic(pg, '#localesOvl [data-loctab="ZAPA"]');
    ok('Ajustes: un cierre ya pasado se sigue viendo, con «Reabrir»', !!(await pg.$('#localesOvl .cielista [data-ciereabrir]')) && /cerrado/.test(await txt(pg, '#localesOvl .cielista') || ''), await txt(pg, '#localesOvl .cielista'));
    await clic(pg, '#localesOvl [data-ovx]');
    await pg.context().close();
  }

  // ══ 12) la hoja por local y el Mes marcan el cierre ══
  console.log('── 12) hoja del Mónaco (pie de descansos) y Mes (media jornada sin trabajo)');
  {
    const pg = await pagina('doce');
    await pg.evaluate(() => openCierre({ localId: 'MONACO', iso: '2026-09-28', franja: 'T' }));
    await pg.waitForSelector('#cierreOvl #cieIni', { timeout: 3000 });
    await rellenarPaso1(pg, { ini: L28, iniF: 'T', fin: M29, finF: 'T', motivo: 'reforma' });
    await clic(pg, '#cierreOvl #cieSig'); await clic(pg, '#cierreOvl #cieSig'); await clic(pg, '#cierreOvl #cieOk');
    await llega(pg, () => !document.querySelector('#cierreOvl') && S.cierresPuntuales.length === 1, null, 4000);
    await pg.evaluate(() => { S.semLunes = '2026-09-28'; abrirImpresionLocal('MONACO'); });
    await pg.waitForSelector('#printRoot .pxdesct', { timeout: 5000 }).catch(() => null);
    const pie = await pg.$$eval('#printRoot .pxdesct tbody tr', trs => trs.map(tr => tr.textContent.replace(/\s+/g, ' ').trim()));
    ok('hoja del Mónaco: en el pie, quien no trabaja por el cierre va marcado «cierre», no como que libra', /Lunes 28.*Esmeralda\s*cierre/.test(pie[0] || '') || pie.some(r => /^Lunes 28/.test(r) && /cierre/.test(r)), JSON.stringify(pie.slice(0, 2)));
    await pg.evaluate(() => cerrarImpresion());
    await vista(pg, 'mes');
    await pg.waitForSelector('#view-mes td[data-asig="hojan|2026-09-28"]', { timeout: 6000 }).catch(() => null);
    ok('Mes: la casilla de Hojan el 28 marca la tarde sin trabajo por el cierre', await ev(pg, '#view-mes td[data-asig="hojan|2026-09-28"]', td => !!td.querySelector('.cief') && /sin trabajo/.test(td.querySelector('.pill').dataset.tipstr || '')));
    await pg.context().close();
  }

  ok('ningún error de página en la parte local', errores.length === 0, errores.join(' | '));

  // ══ 6) modo servidor: otro usuario lo ve; el empleado solo su decisión ══
  console.log('── 6) con el servidor real: otro usuario ve el cierre sin recargar; el empleado, solo lo suyo');
  {
    const PORT = 8900 + Math.floor(Math.random() * 80), SB = `http://127.0.0.1:${PORT}`;
    const dir = mkdtempSync(join(tmpdir(), 'shiftia-pas-cierre-'));
    let logSrv = '';
    const server = spawn('node', [join(RAIZ, 'server.js')], { env: { ...process.env, PORT: String(PORT), DATA_DIR: dir, TRUST_PROXY: '0', ADMIN_PASSWORD: 'clave12345', PROGRAMADOR_PASSWORD: '' }, stdio: ['ignore', 'pipe', 'pipe'] });
    server.stdout.on('data', d => { logSrv += d; }); server.stderr.on('data', d => { logSrv += d; });
    try {
      const salud = await hasta(async () => (await fetch(SB + '/api/salud')).ok, 20000, 150);
      ok('el servidor arranca', !!salud.v, logSrv.slice(-300));
      const jar = () => ({ cookie: '' });
      const api = async (j, m, ruta, cuerpo) => {
        const r = await fetch(SB + ruta, { method: m, headers: { 'Content-Type': 'application/json', Origin: SB, ...(j.cookie ? { Cookie: j.cookie } : {}) }, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) });
        const sc = r.headers.get('set-cookie'); if (sc) j.cookie = sc.split(';')[0];
        return { ok: r.ok, status: r.status, datos: await r.json().catch(() => null) };
      };
      const entrar = async (usuario, pass) => {
        const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } });
        await ctx.clock.setFixedTime(new Date('2026-09-24T10:00:00+02:00'));
        const pg = await ctx.newPage();
        pg.on('pageerror', e => errores.push(`${usuario}: ${e.message}`));
        pg.on('dialog', d => d.accept().catch(() => {}));
        await pg.route(/googleapis|gstatic|cdnjs/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
        await pg.goto(SB + '/');
        await pg.waitForSelector('#loginForm', { timeout: 10000 });
        await pg.fill('#loginUser', usuario); await pg.fill('#loginPass', pass); await pg.click('#loginBtn');
        await llega(pg, () => typeof SRV !== 'undefined' && SRV.on && !!SRV.rol && !!document.querySelector('#view-hoy .loccard'), null, 15000);
        return pg;
      };
      const A = await entrar('diego', '12345678');
      const jD = jar(); await api(jD, 'POST', '/api/login', { usuario: 'diego', password: '12345678' });
      await hasta(async () => { const r = await api(jD, 'GET', '/api/estado'); return r.ok && r.datos.version >= 1 ? r : null; }, 10000);
      const B = await entrar('oficina', 'clave12345');
      ok('dos usuarios dentro (diego y oficina)', await A.evaluate(() => SRV.esAdmin) && await B.evaluate(() => SRV.esAdmin));
      await irDia(A, M29); await irDia(B, M29);
      await clic(A, '#view-hoy [data-cerrarlocal="MONACO"]');
      await llega(A, () => !!document.querySelector('#cierreOvl'), null, 3000);
      await rellenarPaso1(A, { ini: L28, iniF: 'T', fin: M29, finF: 'T', motivo: 'reforma' });
      await clic(A, `#cierreOvl [data-ciefr="${M29}|T"]`);
      await clic(A, '#cierreOvl #cieSig');
      await clic(A, '#cierreOvl [data-ciedec="cristian|SIN"]');
      await clic(A, '#cierreOvl [data-ciedec="scapon|VAC"]');
      await clic(A, '#cierreOvl #cieSig');
      await clic(A, '#cierreOvl #cieOk');
      ok('diego cierra el Mónaco (tardes del 28 y el 29) desde Hoy', await llega(A, () => S.cierresPuntuales.length === 1 && !document.querySelector('#cierreOvl'), null, 5000) >= 0);
      const tB = await llega(B, () => S.cierresPuntuales.length === 1 && /Cerrado · Reforma/.test((document.querySelector('#view-hoy [data-cas="2026-09-29|MONACO_T"]') || {}).textContent || ''), null, 10000);
      ok(`oficina lo ve en Hoy sin recargar (${tB} ms)`, tB >= 0);
      const srvE = await hasta(async () => { const r = await api(jD, 'GET', '/api/estado'); return r.ok && (r.datos.estado.cierresPuntuales || []).length === 1 ? r.datos.estado : null; }, 8000);
      ok('el servidor lo guarda en cierresPuntuales', !!srvE.v && srvE.v.cierresPuntuales[0].localId === 'MONACO');
      // el empleado: alta, contraseña propia y su estado
      const jAdm = jar(); await api(jAdm, 'POST', '/api/login', { usuario: 'oficina', password: 'clave12345' });
      const alta = await api(jAdm, 'POST', '/api/usuarios', { usuario: 'cristian', rol: 'empleado', pid: 'cristian' });
      const jC = jar();
      await api(jC, 'POST', '/api/login', { usuario: 'cristian', password: alta.datos && alta.datos.password });
      await api(jC, 'POST', '/api/password', { actual: alta.datos && alta.datos.password, nueva: 'cristian-2026' });
      const eC = await api(jC, 'GET', '/api/estado');
      const cc = eC.ok && eC.datos.estado.cierresPuntuales;
      ok('el empleado recibe el cierre con su decisión y ninguna de los compañeros', Array.isArray(cc) && cc.length === 1 && JSON.stringify(Object.keys(cc[0].decisiones)) === '["cristian"]' && cc[0].decisiones.cristian.tipo === 'SIN' && cc[0].retirados === undefined, JSON.stringify(cc));
      ok('ningún error de página en modo servidor', !errores.length, errores.join(' | '));
      await A.context().close(); await B.context().close();
    } finally {
      server.kill();
      try { rmSync(dir, { recursive: true, force: true }); } catch (e) {}
    }
  }
} catch (e) {
  ok('la batería termina sin excepción', false, e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e);
} finally {
  await br.close();
  srv.close();
  console.log(`tiempo: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  resumen();
}
