// CIERRES Y SEMANA TIPO EN LA INTERFAZ TRAS LA FASE A3 DE LA AUDITORÍA (30/09), CON CLICS:
//  1) el visor del cierre dice lo que hace el modelo con las vacaciones de quien ese día tiene otro turno (Hojan, El 33 por la
//     mañana y el Mónaco por la tarde): solo de la tarde, en la tarjeta del paso 2 y en el resumen; «Ver cierre» enseña la media
//     jornada («lun 28 (solo la tarde)») y «no se pudo poner» solo cuando ya estaba ausente (Susana Capón con sus vacaciones) (B5);
//  2) «Guardar como semana tipo» la semana del cierre: la confirmación nombra el cierre, los días sin plazas y el «Sale primero»
//     de Mari Luz que no se conserva (Lola es «Quién abre»); la semana tipo guardada tiene el Mónaco como en la de antes (D1, D6, D3);
//  3) editar un cierre hecho sobre la semana tipo con la semana ya generada (noviembre): el visor sigue listando a quien salía de
//     la semana tipo y sus decisiones (vacaciones, sin trabajo, apoyo) sobreviven a la edición (B1); y acortarlo (corrección de A3,
//     revisión del cliente 1): la casilla que reabre recupera las plazas de la semana tipo y el resumen, el toast y el historial lo
//     dicen; sobre la semana sin planificar el toast dice «semana sin planificar: 4 personas con decisión» (cliente 7);
//  4) el apoyo de quien no puede reforzar la sala (Hojan, solo cocina; Adrián, cocina de Zapatillera ese día): la tarjeta dice el
//     motivo y «Apoyo» queda desactivado si no hay cocina libre en otro local (cliente 2 = modelo 7); Adrián de apoyo sale en la
//     fila «Sin trabajo por un cierre» del Generador como «tarde · apoyo sin sitio» (cliente 5); y un cierre de 88 días avisa de
//     que no puede pasar de 62 (cliente 4).
// El reloj de la página se fija en el jueves 24/09/2026. E2E_RAIZ permite pasar la batería por otra copia de la app.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cargarChromium, contador, llega } from './e2e-util.mjs';

const { chromium, CHROMIUM } = await cargarChromium();
const RAIZ = resolve(process.env.E2E_RAIZ || join(dirname(fileURLToPath(import.meta.url)), '..'));
const { ok, resumen } = contador();

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
const j = x => JSON.stringify(x);
const L28 = '2026-09-28', M29 = '2026-09-29';

async function pagina(etiqueta) {
  const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.clock.setFixedTime(new Date('2026-09-24T10:00:00+02:00'));
  await ctx.addInitScript(() => { try { sessionStorage.setItem('shiftia_pas_sesion', '1'); sessionStorage.setItem('shiftia_pas_rol', 'admin'); } catch (e) {} });
  const pg = await ctx.newPage();
  pg.on('pageerror', e => errores.push(`${etiqueta}: ${e.message}`));
  pg.dialogos = [];
  pg.on('dialog', d => { pg.dialogos.push(d.message()); d.accept(d.type() === 'prompt' ? 'prueba' : undefined).catch(() => {}); });
  await pg.route(/googleapis|gstatic|cdnjs/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await pg.goto(BASE + '/index.html?demo=1');
  await pg.waitForSelector('#view-hoy .loccard', { timeout: 15000 });
  return pg;
}
async function seccion(nombre, fn) {
  try { await fn(); } catch (e) { ok(`${nombre}: la sección no se interrumpe`, false, e && e.stack ? e.stack.split('\n').slice(0, 4).join(' | ') : e); }
}
const ev = (pg, sel, fn, arg) => pg.$eval(sel, fn, arg).catch(() => null);
const txt = (pg, sel) => ev(pg, sel, x => x.textContent.replace(/\s+/g, ' ').trim());
const clic = (pg, sel) => pg.click(sel, { timeout: 3000 }).then(() => true, () => false);
const vista = async (pg, v) => { await pg.click(`.tab[data-v="${v}"]`); return llega(pg, v => { const s = document.getElementById('view-' + v); return !!s && !s.classList.contains('hidden'); }, v, 4000); };
const paso = pg => ev(pg, '#cierreOvl .ciepasos .on', x => x.dataset.paso);
const cerrado = pg => llega(pg, () => !document.querySelector('#cierreOvl'), null, 4000);
// el visor, paso 1: días (inicio y fin con su franja) y motivo (como en e2e-cierre.mjs)
async function rellenarPaso1(pg, o) {
  if (o.localId) await clic(pg, `#cierreOvl [data-cieloc="${o.localId}"]`);
  const T = { timeout: 4000 };
  await pg.fill('#cierreOvl #cieIni', o.ini, T); await pg.selectOption('#cierreOvl #cieIniF', o.iniF, T);
  await pg.fill('#cierreOvl #cieFin', o.fin, T); await pg.selectOption('#cierreOvl #cieFinF', o.finF, T);
  await pg.$eval('#cierreOvl #cieFin', x => x.dispatchEvent(new Event('change', { bubbles: true })));
  if (o.motivo) await clic(pg, `#cierreOvl [data-ciemot="${o.motivo}"]`);
}
const historial = (pg, n) => pg.evaluate(n => (S.historial || []).slice(0, n).map(h => h.txt), n);
const toastUltimo = pg => pg.evaluate(() => { const ts = [...document.querySelectorAll('.toast')]; return ts.length ? ts[ts.length - 1].textContent.replace(/\s+/g, ' ').trim() : ''; }).catch(() => '');

try {
  // ══ 1) y 2) el visor con Hojan de vacaciones (media jornada) y «Guardar como semana tipo» la semana del cierre ══
  console.log('── 1) el visor: las vacaciones de Hojan (El 33 por la mañana) son solo de la tarde; «Ver cierre» con la media jornada');
  {
    const pg = await pagina('visor');
    await seccion('visor', async () => {
      // Susana Capón ya tiene sus vacaciones el martes 29: el cierre no le pone nada ese día
      await pg.evaluate(() => { anadirAusencia(personaDeId('scapon'), { tipo: 'VAC', desde: '2026-09-29', hasta: '2026-09-29', detalle: 'las suyas' }); });
      await pg.evaluate(() => openCierre({ localId: 'MONACO', iso: '2026-09-28', franja: 'T' }));
      await pg.waitForSelector('#cierreOvl #cieIni', { timeout: 3000 });
      await rellenarPaso1(pg, { ini: L28, iniF: 'T', fin: M29, finF: 'T', motivo: 'reforma' });
      await clic(pg, `#cierreOvl [data-ciefr="${M29}|T"]`);
      ok('paso 1: lunes 28 y martes 29, solo tardes', /lun 28\/09 – mar 29\/09, solo tardes/.test(await txt(pg, '#cierreOvl #ciePrevia') || ''), await txt(pg, '#cierreOvl #ciePrevia'));
      await clic(pg, '#cierreOvl #cieSig');
      ok('paso 2 con la tarjeta de Hojan', await llega(pg, () => !!document.querySelector('#cierreOvl .ciecard[data-ciepid="hojan"]'), null, 3000) >= 0 && await paso(pg) === '2');
      await clic(pg, '#cierreOvl [data-ciedec="hojan|VAC"]');
      await llega(pg, () => { const b = document.querySelector('#cierreOvl [data-ciedec="hojan|VAC"]'); return !!b && b.classList.contains('on'); }, null, 3000);
      const tarjeta = await txt(pg, '#cierreOvl .ciecard[data-ciepid="hojan"]');
      // (corrección de A3, cliente 6) una sola frase: la del modelo (con el tramo del partido) y lo que pasa con las vacaciones
      ok('la tarjeta dice lo que hace el modelo, en una sola frase: «El lunes 28 también hace El 33 por la mañana (hacía partido: …), así que las vacaciones son solo de la tarde.»', /El lunes 28 también hace El 33 por la mañana \(hacía partido: se queda con su mañana en El 33 de 11:00 a 16:00\), así que las vacaciones son solo de la tarde\./.test(tarjeta || '') && (tarjeta.match(/también hace El 33 por la mañana/g) || []).length === 1, tarjeta);
      ok('y ya no dice que no se le ponen ni que cuenta como sin trabajo', !/no se le pone/.test(tarjeta || '') && !/cuenta como sin trabajo/.test(tarjeta || ''), tarjeta);
      await clic(pg, '#cierreOvl [data-ciedec="scapon|VAC"]');
      await clic(pg, '#cierreOvl #cieSig');
      await llega(pg, () => (document.querySelector('#cierreOvl .ciepasos .on') || {}).dataset && document.querySelector('#cierreOvl .ciepasos .on').dataset.paso === '3', null, 3000);
      const res = await txt(pg, '#cierreOvl #cieResumen');
      ok('el resumen: «Hojan: el lunes 28 también hace El 33 por la mañana (…), así que las vacaciones son solo de la tarde.»', /Hojan: el lunes 28 también hace El 33 por la mañana \(hacía partido: se queda con su mañana en El 33 de 11:00 a 16:00\), así que las vacaciones son solo de la tarde\./.test(res || ''), res);
      ok('sin «cuenta como sin trabajo» ni «no se le ponen»', !/cuenta como sin trabajo/.test(res || '') && !/no se le ponen/.test(res || ''), res);
      await clic(pg, '#cierreOvl #cieOk');
      ok('se confirma', await cerrado(pg) >= 0);
      const dec = await pg.evaluate(() => { const c = S.cierresPuntuales[0]; return { hojan: c.decisiones.hojan, scapon: c.decisiones.scapon, aus: personaDeId('hojan').ausencias.filter(a => a.tipo === 'VAC') }; });
      ok('el modelo: Hojan con vacaciones solo de la tarde del 28 (d.parciales); Susana sin días (ya estaba ausente)', dec.hojan && j(dec.hojan.dias) === j([L28]) && j(dec.hojan.parciales) === j({ [L28]: ['T'] }) && dec.scapon && dec.scapon.dias.length === 0 && dec.aus.some(a => a.desde === L28 && j(a.franjas) === j(['T'])), j(dec));
      await pg.evaluate(() => openCierre({ id: S.cierresPuntuales[0].id }));
      await llega(pg, () => !!document.querySelector('#cierreOvl #cieEditar'), null, 3000);
      const ver = await txt(pg, '#cierreOvl');
      ok('«Ver cierre»: «Hojan (lun 28 (solo la tarde))»', /Hojan \(lun 28 \(solo la tarde\)\)/.test(ver || ''), ver);
      ok('y «Susana Capón (mar 29 (no se pudo poner: ya estaba ausente))»', /Susana Capón \(mar 29 \(no se pudo poner: ya estaba ausente\)\)/.test(ver || ''), ver);
      ok('sin el «ese día tenía otro turno» de antes', !/tenía otro turno/.test(ver || ''), ver);
      await clic(pg, '#cierreOvl [data-ovx]');
      await cerrado(pg);
    });

    console.log('── 2) «Guardar como semana tipo» la semana del 28/09 con el Mónaco cerrado, jueves a domingo sin plazas y Mari Luz «sale primero» a mano');
    await seccion('semana tipo', async () => {
      await pg.evaluate(() => {
        const e = estadoSemana('2026-09-28', true);
        marcarAbre(e, '2026-09-29', 'PASARELA_M', 'mariluz', S, S.staff);
        vaciarPlanilla(e, '2026-10-01', '2026-10-04');
        S.semLunes = '2026-09-28'; saveState();
      });
      ok('preparado: Mari Luz abre el martes 29 en Pasarela por la mañana (a mano) y del jueves al domingo no hay plazas', await pg.evaluate(() => primeroDe(S, S.staff, estadoDeIso('2026-09-29'), '2026-09-29', 'PASARELA_M') === 'mariluz' && !!manualDe(estadoDeIso('2026-09-29'), '2026-09-29', 'PASARELA_M').abre && rangoIso('2026-10-01', '2026-10-04').every(iso => !diaConPlanilla(estadoDeIso(iso), iso))));
      await vista(pg, 'semana'); await clic(pg, '#wNext');   // la vista abre en la semana de hoy (21/9): la siguiente es la del 28
      ok('la vista Semana está en la del 28/09', await llega(pg, () => S.semLunes === '2026-09-28', null, 3000) >= 0, await pg.evaluate(() => S.semLunes));
      const n0 = pg.dialogos.length;
      await clic(pg, '#wPatron');
      await llega(pg, () => (S.historial[0] || {}).txt && /Semana tipo sustituida/.test(S.historial[0].txt), null, 4000);
      const conf = pg.dialogos.slice(n0).join(' | ');
      ok('la confirmación nombra el cierre y dice qué pasa con las casillas cerradas', /Esta semana hay un cierre por fechas \(Bar Mónaco cerrado por reforma \(lun 28\/09 – mar 29\/09, solo tardes\)\): en las casillas cerradas se guardan las plazas de la semana tipo de antes, y los apoyos por el cierre no se guardan como plazas fijas\./.test(conf), conf);
      ok('avisa de los días sin plazas', /Ojo: el jueves, el viernes, el sábado y el domingo no tienen ninguna plaza: la semana tipo se queda vacía esos días\./.test(conf), conf);
      ok('y del «Sale primero» de Mari Luz que no se conserva (Lola es «Quién abre»)', /Mari Luz: el «Sale primero» del martes 29 por la mañana en Pasarela no se conserva en la semana tipo: abriría Lola \(«Quién abre» de Pasarela\)/.test(conf), conf);
      ok('y dice qué hacer si quiere que abra siempre Mari Luz (corrección de A3, cliente 3)', /para que abra siempre Mari Luz, cámbialo en Ajustes de Pasarela → Quién abre \(o «Sale el primero» en su ficha\)/.test(conf), conf);
      const pt = await pg.evaluate(() => {
        const s = semillaPasarela().patron, p = S.patron;
        const set = (pat, d, t) => (pat[d] || []).filter(x => x.t === t).map(x => x.p).sort().join();
        return { mon1: set(p, 1, 'MONACO_T'), mon1s: set(s, 1, 'MONACO_T'), mon2: set(p, 2, 'MONACO_T'), mon2s: set(s, 2, 'MONACO_T'), vacios: [4, 5, 6, 7].map(d => (p[d] || []).length), pasM: (p[2] || []).filter(x => x.t === 'PASARELA_M').map(x => x.p + (x.a ? '(a)' : '')), hist: (S.historial[0] || {}).txt };
      });
      ok('la semana tipo guardada tiene el Mónaco del lunes y del martes como la de antes (sin trabajo y vacaciones vuelven)', pt.mon1 === pt.mon1s && pt.mon2 === pt.mon2s && pt.mon2.length > 0, j(pt));
      ok('del jueves al domingo, vacía', j(pt.vacios) === j([0, 0, 0, 0]), j(pt.vacios));
      ok('Mari Luz sin la «a» en la mañana del martes de Pasarela', pt.pasM.includes('mariluz') && !pt.pasM.includes('mariluz(a)'), j(pt.pasM));
      ok('el historial apunta el cierre, los días sin plazas y el «Sale primero»', /con el cierre de Bar Mónaco/.test(pt.hist) && /sin plazas el jueves/.test(pt.hist) && /Mari Luz: el «Sale primero»/.test(pt.hist), pt.hist);
    });
    await pg.context().close();
  }

  // ══ 3) editar un cierre hecho sobre la semana tipo, con la semana ya generada ══
  console.log('── 3) noviembre sin planilla: cierre del Mónaco (lun 2 y mar 3 por la tarde) sobre la semana tipo; generar; editar el detalle');
  {
    const pg = await pagina('editar');
    await seccion('editar', async () => {
      await pg.evaluate(() => openCierre({ localId: 'MONACO', iso: '2026-11-02', franja: 'T' }));
      await pg.waitForSelector('#cierreOvl #cieIni', { timeout: 3000 });
      await rellenarPaso1(pg, { ini: '2026-11-02', iniF: 'T', fin: '2026-11-03', finF: 'T', motivo: 'reforma' });
      await clic(pg, '#cierreOvl [data-ciefr="2026-11-03|T"]');
      await clic(pg, '#cierreOvl #cieSig');
      ok('paso 2: las tarjetas salen de la semana tipo (noviembre aún no tiene planilla)', await llega(pg, () => !!document.querySelector('#cierreOvl .ciecard[data-ciepid="scapon"]'), null, 3000) >= 0 && /semana tipo/.test(await txt(pg, '#cierreOvl .ciecard[data-ciepid="scapon"] .ciechips') || ''), await txt(pg, '#cierreOvl .ciecard[data-ciepid="scapon"]'));
      await clic(pg, '#cierreOvl [data-ciedec="scapon|VAC"]');
      await clic(pg, '#cierreOvl [data-ciedec="yilian|REFUERZA"]');
      await clic(pg, '#cierreOvl #cieSig'); await clic(pg, '#cierreOvl #cieOk');
      ok('se cierra el Mónaco', await cerrado(pg) >= 0);
      const t0 = await toastUltimo(pg);
      ok('el toast: «semana sin planificar: 4 personas con decisión (el generador lo respetará)», no «0 plazas retiradas» (cliente 7)', /semana sin planificar: 4 personas con decisión \(el generador lo respetará\)/.test(t0) && !/0 plazas retiradas/.test(t0), t0);
      const c0 = await pg.evaluate(() => { const c = S.cierresPuntuales[0]; return { id: c.id, deST: c.deSemanaTipo, dec: Object.fromEntries(Object.entries(c.decisiones).map(([k, d]) => [k, d.tipo])), vac: !!ausenciaEn(personaDeId('scapon'), '2026-11-03', null, 'VAC') }; });
      ok('las dos casillas se leyeron de la semana tipo (por casilla); Susana de vacaciones el martes 3; Cristian sin trabajo; Yilian de apoyo', j(c0.deST) === j({ '2026-11-02': ['T'], '2026-11-03': ['T'] }) && c0.dec.scapon === 'VAC' && c0.dec.cristian === 'SIN' && c0.dec.yilian === 'REFUERZA' && c0.vac, j(c0));
      // se genera noviembre entero, como hace la app al abrir el mes con Generar
      const gen = await pg.evaluate(() => { S.y = 2026; S.m = 11; cargarMes(); const r = generarPlanilla(S, S.staff, est, '2026-11-01', '2026-11-30', {}); saveState(); return { n: r.aplicados.length, mon: pidsEn(est, '2026-11-03', 'MONACO_T'), scapon: turnosDe(S).filter(t => pidsEn(est, '2026-11-03', t.id).includes('scapon')).map(t => t.id) }; });
      ok('noviembre generado: la casilla cerrada vacía y Susana en ninguna (de vacaciones)', gen.n > 100 && gen.mon.length === 0 && gen.scapon.length === 0, j(gen));
      // editar: solo el detalle
      await pg.evaluate(id => openCierre({ id, editar: true }), c0.id);
      await pg.waitForSelector('#cierreOvl #cieDet', { timeout: 3000 });
      await pg.fill('#cierreOvl #cieDet', 'obra en la cocina');
      await clic(pg, '#cierreOvl #cieSig');
      ok('al editar, el visor sigue listando a Susana (de la semana tipo) con sus vacaciones marcadas', await llega(pg, () => !!document.querySelector('#cierreOvl .ciecard[data-ciepid="scapon"]'), null, 3000) >= 0 && await ev(pg, '#cierreOvl [data-ciedec="scapon|VAC"]', b => b.classList.contains('on')) === true && /semana tipo/.test(await txt(pg, '#cierreOvl .ciecard[data-ciepid="scapon"] .ciechips') || ''), await pg.$$eval('#cierreOvl .ciecard[data-ciepid]', cs => cs.map(c => c.dataset.ciepid)));
      ok('y a Cristian y a Yilian', await pg.$$eval('#cierreOvl .ciecard[data-ciepid]', cs => cs.map(c => c.dataset.ciepid)).then(xs => xs.includes('cristian') && xs.includes('yilian')));
      await clic(pg, '#cierreOvl #cieSig'); await clic(pg, '#cierreOvl #cieOk');
      ok('se guardan los cambios', await cerrado(pg) >= 0);
      const c1 = await pg.evaluate(() => { const c = S.cierresPuntuales[0]; return { detalle: c.detalle, deST: c.deSemanaTipo, dec: Object.fromEntries(Object.entries(c.decisiones).map(([k, d]) => [k, d.tipo])), vac: !!ausenciaEn(personaDeId('scapon'), '2026-11-03', null, 'VAC'), sin: (decisionCierre(S, 'cristian', '2026-11-03', 'T') || {}).tipo, apoyo: apoyoPorCierre(S, 'yilian', '2026-11-02', 'T'), hist: (S.historial[0] || {}).txt }; });
      ok('tras editar: el detalle nuevo, las mismas casillas de la semana tipo y las mismas decisiones', c1.detalle === 'obra en la cocina' && j(c1.deST) === j({ '2026-11-02': ['T'], '2026-11-03': ['T'] }) && c1.dec.scapon === 'VAC' && c1.dec.cristian === 'SIN' && c1.dec.yilian === 'REFUERZA', j(c1));
      ok('Susana SIGUE de vacaciones el martes 3 (antes se quitaban y no se reponían)', c1.vac, j(c1));
      ok('Cristian sigue sin trabajo y Yilian de apoyo', c1.sin === 'SIN' && c1.apoyo === true, j(c1));
      ok('el historial dice «(editado)»', /\(editado\)/.test(c1.hist), c1.hist);
    });

    console.log('── 3b) acortar el cierre al lunes 2: el martes 3 por la tarde vuelve a abrir con Susana Capón y Cristian, de la semana tipo (corrección de A3, cliente 1)');
    await seccion('acortar', async () => {
      const id = await pg.evaluate(() => S.cierresPuntuales[0].id);
      await pg.evaluate(id => openCierre({ id, editar: true }), id);
      await pg.waitForSelector('#cierreOvl #cieFin', { timeout: 3000 });
      await pg.fill('#cierreOvl #cieFin', '2026-11-02', { timeout: 4000 });
      await pg.$eval('#cierreOvl #cieFin', x => x.dispatchEvent(new Event('change', { bubbles: true })));
      ok('paso 1: solo el lunes 2 por la tarde', await llega(pg, () => /\(lun 02\/11 tarde\)/.test((document.querySelector('#cierreOvl #ciePrevia') || {}).textContent || ''), null, 3000) >= 0, await txt(pg, '#cierreOvl #ciePrevia'));
      await clic(pg, '#cierreOvl #cieSig');
      await llega(pg, () => !!document.querySelector('#cierreOvl .ciecard'), null, 3000);
      await clic(pg, '#cierreOvl #cieSig');
      await llega(pg, () => (document.querySelector('#cierreOvl .ciepasos .on') || { dataset: {} }).dataset.paso === '3', null, 3000);
      const res = await txt(pg, '#cierreOvl #cieResumen');
      ok('el resumen anticipa lo que vuelve: «El martes 3 por la tarde Bar Mónaco vuelve a abrir: vuelven Susana Capón y Cristian de la semana tipo (si pueden estar).»', /El martes 3 por la tarde Bar Mónaco vuelve a abrir: vuelven Susana Capón y Cristian de la semana tipo \(si pueden estar\)\./.test(res || ''), res);
      await clic(pg, '#cierreOvl #cieOk');
      ok('se guarda', await cerrado(pg) >= 0);
      const t1 = await toastUltimo(pg);
      ok('el toast lo dice: «el martes 3 por la tarde vuelven Susana Capón y Cristian de la semana tipo»', /el martes 3 por la tarde vuelven Susana Capón y Cristian de la semana tipo/.test(t1), t1);
      const c2 = await pg.evaluate(() => { const c = S.cierresPuntuales[0]; const e = estadoDeIso('2026-11-03'); return { deST: c.deSemanaTipo, marT: asignados(e, '2026-11-03', 'MONACO_T').map(x => `${x.pid}${x.cocina ? '(c)' : ''}[${x.origen}]`), vac: !!ausenciaEn(personaDeId('scapon'), '2026-11-03', null, 'VAC'), hist: (S.historial[0] || {}).txt }; });
      ok('la tarde del martes 3 tiene otra vez a Susana Capón (cocina) y a Cristian, con origen semana tipo; Susana sin vacaciones el 3', j(c2.marT) === j(['scapon(c)[patron]', 'cristian[patron]']) && !c2.vac, j(c2));
      ok('el cierre se queda con el lunes 2 leído de la semana tipo', j(c2.deST) === j({ '2026-11-02': ['T'] }), j(c2.deST));
      ok('y el historial lo apunta', /el martes 3 por la tarde vuelven Susana Capón y Cristian de la semana tipo/.test(c2.hist), c2.hist);
    });
    await pg.context().close();
  }

  // ══ 4) el apoyo de quien no puede reforzar la sala, el Generador con Adrián de apoyo, y el cierre de más de 62 días ══
  console.log('── 4) Hojan (solo cocina) y Adrián (cocina de Zapatillera) en «Apoyo»: el motivo y «Apoyo» desactivado; Adrián en el Generador; 88 días');
  {
    const pg = await pagina('cocina');
    await seccion('cocina', async () => {
      await pg.evaluate(() => openCierre({ localId: 'MONACO', iso: '2026-09-28' }));   // el día entero: al alargar, lunes y martes enteros
      await pg.waitForSelector('#cierreOvl #cieIni', { timeout: 3000 });
      await rellenarPaso1(pg, { ini: '2026-09-27', iniF: 'T', fin: M29, finF: 'T', motivo: 'reforma' });
      await clic(pg, '#cierreOvl #cieSig');
      ok('paso 2 con la tarjeta de Hojan', await llega(pg, () => !!document.querySelector('#cierreOvl .ciecard[data-ciepid="hojan"]'), null, 3000) >= 0);
      const hojan = await txt(pg, '#cierreOvl .ciecard[data-ciepid="hojan"] .ciemotivo');
      ok('la tarjeta de Hojan dice por qué no tiene sitios: «Hojan solo hace cocina: no puede reforzar la sala de otro local, y el lunes 28 por la tarde no hay ninguna cocina libre en otro local.»', /^Hojan solo hace cocina: no puede reforzar la sala de otro local, y el lunes 28 por la tarde no hay ninguna cocina libre en otro local\.$/.test(hojan || ''), hojan);
      ok('y «Apoyo» queda desactivado, con el motivo', await ev(pg, '#cierreOvl [data-ciedec="hojan|REFUERZA"]', b => b.disabled && /solo hace cocina/.test(b.title)) === true);
      const jenny = await pg.$$eval('#cierreOvl .ciecard[data-ciepid="jenny"] .ciemotivo', xs => xs.map(x => x.textContent.trim()));
      ok('Jenny (cocina de El 33 la mañana del domingo): el motivo del domingo, y «Apoyo» sigue activo porque el lunes sí tiene sitios', jenny.length === 1 && /^Jenny ya lleva la cocina de El 33 ese día: no puede reforzar la sala de otro local, y el domingo 27 por la tarde no hay ninguna cocina libre en otro local\.$/.test(jenny[0]) && await ev(pg, '#cierreOvl [data-ciedec="jenny|REFUERZA"]', b => b.disabled) === false, j(jenny));
      await clic(pg, '#cierreOvl [data-ciedec="jenny|REFUERZA"]');
      await llega(pg, () => !!document.querySelector('#cierreOvl [data-ciedest="jenny|2026-09-28"]'), null, 3000);
      const ops = await pg.evaluate(() => ({ dom: [...document.querySelectorAll('#cierreOvl [data-ciedest="jenny|2026-09-27"] option')].map(o => o.textContent), lun: [...document.querySelectorAll('#cierreOvl [data-ciedest="jenny|2026-09-28"] option')].map(o => o.textContent) }));
      ok('el domingo solo «donde haga falta»; el lunes, sitios de sala', ops.dom.length === 1 && ops.lun.length > 1 && !ops.lun.some(t => /cocina/.test(t)), j(ops));
      ok('Yilian (sala) no tiene motivo y «Apoyo» está activo', await pg.$$eval('#cierreOvl .ciecard[data-ciepid="yilian"] .ciemotivo', xs => xs.length) === 0 && await ev(pg, '#cierreOvl [data-ciedec="yilian|REFUERZA"]', b => b.disabled) === false);
      await pg.evaluate(() => { const o = document.getElementById('cierreOvl'); if (o) o.remove(); });
    });

    await seccion('adrian', async () => {
      await pg.evaluate(() => openCierre({ localId: 'ZAPA', iso: '2026-09-29', franja: 'T' }));
      await pg.waitForSelector('#cierreOvl #cieIni', { timeout: 3000 });
      await rellenarPaso1(pg, { ini: M29, iniF: 'T', fin: M29, finF: 'T', motivo: 'otro' });
      await pg.fill('#cierreOvl #cieDet', 'fumigación', { timeout: 3000 });
      await clic(pg, '#cierreOvl #cieSig');
      ok('paso 2 con la tarjeta de Adrián', await llega(pg, () => !!document.querySelector('#cierreOvl .ciecard[data-ciepid="adrian"]'), null, 3000) >= 0);
      const adrian = await txt(pg, '#cierreOvl .ciecard[data-ciepid="adrian"] .ciemotivo');
      ok('la tarjeta de Adrián: «Adrián ya lleva la cocina de Zapatillera ese día: no puede reforzar la sala de otro local, y el martes 29 por la tarde no hay ninguna cocina libre en otro local.»', /^Adrián ya lleva la cocina de Zapatillera ese día: no puede reforzar la sala de otro local, y el martes 29 por la tarde no hay ninguna cocina libre en otro local\.$/.test(adrian || ''), adrian);
      ok('«Apoyo» desactivado para Adrián y activo para Susana Luna', await ev(pg, '#cierreOvl [data-ciedec="adrian|REFUERZA"]', b => b.disabled) === true && await ev(pg, '#cierreOvl [data-ciedec="sluna|REFUERZA"]', b => b.disabled) === false);
      await pg.evaluate(() => { const o = document.getElementById('cierreOvl'); if (o) o.remove(); });
      // con la decisión de apoyo puesta por datos (como llega de otra pestaña), el Generador lo enseña como apoyo sin sitio de la tarde
      const puesto = await pg.evaluate(() => {
        const e = estadoRango('2026-09-29', '2026-09-29', true);
        const r = aplicarCierre(S, S.staff, e, { id: 'cie_zapa', localId: 'ZAPA', dias: { '2026-09-29': ['T'] }, motivo: 'otro', detalle: 'fumigación', decisiones: {}, retirados: [] }, { adrian: { tipo: 'REFUERZA' }, sluna: { tipo: 'REFUERZA' } });
        saveState(); GEN.previa = null;
        return r.ok && Object.keys(r.cierre.decisiones).sort().join();
      });
      ok('Zapatillera cerrada el martes 29 por la tarde con Adrián y Susana Luna de apoyo', puesto === 'adrian,sluna', j(puesto));
      await vista(pg, 'semana'); await clic(pg, '#wNext');
      await llega(pg, () => S.semLunes === '2026-09-28', null, 3000);
      await clic(pg, '#wGenerar');
      ok('el Generador en la semana del 28/09', await llega(pg, () => !document.getElementById('view-generador').classList.contains('hidden') && GEN.lunes === '2026-09-28', null, 5000) >= 0);
      await clic(pg, '#genPrevia');
      ok('se genera la vista previa', await llega(pg, () => !!(GEN.previa && GEN.previa.semana), null, 25000) >= 0);
      const g = await pg.evaluate(() => ({ fila: (document.querySelector('#genRoot tr.gsint') || {}).textContent, adrian: turnosDe(S).filter(t => pidsEn(GEN.previa.estado, '2026-09-29', t.id).includes('adrian')).map(t => t.id + (asignados(GEN.previa.estado, '2026-09-29', t.id).find(x => x.pid === 'adrian').cocina ? '(c)' : '')), parcial: (GEN.previa.apoyoSinSitioParcial || {})['2026-09-29'] }));
      ok('Adrián sigue con la cocina de la mañana y por la tarde no está en ningún sitio', j(g.adrian) === j(['ZAPA_M(c)']), j(g.adrian));
      ok('la fila «Sin trabajo por un cierre» lo lista como «Adrián · tarde · apoyo sin sitio» (cliente 5)', /Adrián · tarde · apoyo sin sitio/.test(g.fila || '') && j(g.parcial) === j([{ pid: 'adrian', franjas: ['T'] }]), j(g));
    });

    await seccion('62 días', async () => {
      await pg.evaluate(() => { GEN.previa = null; openCierre({ localId: 'MONACO', iso: '2026-10-05' }); });
      await pg.waitForSelector('#cierreOvl #cieIni', { timeout: 3000 });
      await rellenarPaso1(pg, { ini: '2026-10-05', iniF: 'M', fin: '2026-12-31', finF: 'T' });
      const e88 = await txt(pg, '#cierreOvl .cieerr');
      ok('88 días: «un cierre no puede pasar de 62 días: se cierra hasta el sáb 05/12» (cliente 4)', /un cierre no puede pasar de 62 días: se cierra hasta el sáb 05\/12/.test(e88 || ''), e88);
      ok('la vista previa acaba donde dice el aviso y el selector de fin no deja pasar del tope', /– sáb 05\/12\)/.test(await txt(pg, '#cierreOvl #ciePrevia') || '') && await ev(pg, '#cierreOvl #cieFin', x => x.getAttribute('max')) === '2026-12-05', await txt(pg, '#cierreOvl #ciePrevia'));
      await pg.evaluate(() => { const o = document.getElementById('cierreOvl'); if (o) o.remove(); });
    });
    await pg.context().close();
  }
} finally {
  await br.close();
  srv.close();
}
if (errores.length) { console.log('errores de página:', errores); }
ok('sin errores de JavaScript en la página', !errores.length, errores.join(' | '));
resumen();
