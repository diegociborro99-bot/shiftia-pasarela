// «CUBRE A» HASTA NUEVA ORDEN, DE PUNTA A PUNTA DESDE EQUIPO, CON CLICS (24/09, decisión D13).
// Diego: «también tenemos que dar al encargado la posibilidad, como ya existe, pero que funcione real, de
// que pueda decir en equipo, tal persona cubre a tal persona, hasta nueva orden. Ahora mismo esa opción
// existe, lo que pasa es que antes no se hablaba bien equipo con generador ni con cobertura».
// Se recorre: ficha de Mari Luz → «Cubre a» Iván → la ficha y la tarjeta lo dicen por los dos lados
// («Cubre a Iván · siempre que falte · hasta que lo quites» / «Si falta, le cubre Mari Luz») → la
// Cobertura dice «Iván tiene quien le cubra» y por qué no el domingo → ficha de Iván → vacaciones del 2 al
// 4/10 solo por la tarde en la semana ya volcada (?demo=1) → la confirmación lo explica → Mari Luz «por
// Iván» el viernes y el sábado en Hoy y en la Semana → Ctrl+Z lo deshace de una vez → otra vez, ahora
// «buscar en la Cobertura lo que queda» → el Generador dice lo mismo → quitar la designación → ya no.
// Y en el móvil (390×844): la franja se elige, la confirmación cabe y se toca a la primera.
// El reloj de la página se fija en el jueves 24/09/2026 (el día de la reunión).
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cargarChromium, contador, llega } from './e2e-util.mjs';

const { chromium, CHROMIUM } = await cargarChromium();
const RAIZ = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'));
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
const L28 = '2026-09-28', VIE = '2026-10-02', SAB = '2026-10-03', DOM = '2026-10-04';

async function pagina(etiqueta, op) {
  const o = op || {};
  const ctx = await br.newContext({ viewport: o.viewport || { width: 1280, height: 900 }, isMobile: !!o.movil, hasTouch: !!o.movil });
  await ctx.clock.setFixedTime(new Date('2026-09-24T10:00:00+02:00'));
  await ctx.addInitScript(() => { try { sessionStorage.setItem('shiftia_pas_sesion', '1'); sessionStorage.setItem('shiftia_pas_rol', 'admin'); } catch (e) {} });
  const pg = await ctx.newPage();
  pg.on('pageerror', e => errores.push(`${etiqueta}: ${e.message}`));
  pg.on('dialog', d => d.accept().catch(() => {}));
  await pg.route(/googleapis|gstatic|cdnjs/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await pg.goto(BASE + '/index.html?demo=1');
  await pg.waitForSelector('#view-hoy .loccard', { timeout: 15000 });
  return pg;
}
const clic = (pg, sel) => pg.click(sel, { timeout: 3000 }).then(() => true, () => false);
const texto = (pg, sel) => pg.$eval(sel, x => x.textContent.replace(/\s+/g, ' ').trim()).catch(() => '');
const vista = async (pg, v) => { await pg.click(`.tab[data-v="${v}"]`); return llega(pg, v => { const s = document.getElementById('view-' + v); return !!s && !s.classList.contains('hidden'); }, v, 4000); };
async function abrirFicha(pg, pid) {
  await vista(pg, 'equipo');
  await pg.waitForSelector(`#equipoRoot [data-pcard="${pid}"] .pmini`, { timeout: 8000 }).catch(() => null);
  await clic(pg, `#equipoRoot [data-pcard="${pid}"] .pmini`);
  await pg.waitForSelector('#fichaOvl .lpunt', { timeout: 5000 });
}
const cerrarFicha = async pg => { await clic(pg, '#fichaOvl [data-ovx]'); await llega(pg, () => !document.getElementById('fichaOvl'), null, 3000); };
// lo que hay en la planilla de verdad (no la vista): quién está y por quién
const casilla = (pg, iso, tid) => pg.evaluate(([i, t]) => asignados(estadoDeIso(i), i, t).map(x => ({ pid: x.pid, por: x.por || null, abre: !!x.abre, origen: x.origen })), [iso, tid || 'PASARELA_T']);
const porIvan = async (pg, iso) => (await casilla(pg, iso)).filter(x => x.por === 'ivan').map(x => x.pid);
// en la ficha de Iván: vacaciones del 2 al 4 de octubre, solo por la tarde, y «Guardar ausencia»
async function vacacionesIvan(pg, franja) {
  await abrirFicha(pg, 'ivan');
  await pg.selectOption('#fichaOvl #fAusTipo', 'VAC');
  await pg.fill('#fichaOvl #fAusD1', VIE);
  await pg.fill('#fichaOvl #fAusD2', DOM);
  const hayFranja = !!(await pg.$('#fichaOvl #fAusFr'));
  if (hayFranja) await pg.selectOption('#fichaOvl #fAusFr', franja === undefined ? 'T' : franja);
  await clic(pg, '#fichaOvl [data-addaus]');
  return hayFranja;
}
async function irHoy(pg, iso) {
  await vista(pg, 'hoy');
  for (let i = 0; i < 45 && await pg.evaluate(v => isoDia() < v, iso); i++) await clic(pg, '#dNext');
  for (let i = 0; i < 45 && await pg.evaluate(v => isoDia() > v, iso); i++) await clic(pg, '#dPrev');
  return pg.evaluate(() => isoDia());
}
async function irSemana(pg, lunes) {
  await vista(pg, 'semana');
  for (let i = 0; i < 6 && await pg.evaluate(l => S.semLunes < l, lunes); i++) await clic(pg, '#wNext');
  for (let i = 0; i < 6 && await pg.evaluate(l => S.semLunes > l, lunes); i++) await clic(pg, '#wPrev');
  return pg.evaluate(() => S.semLunes);
}
async function generadorSemana(pg, lunes) {
  await vista(pg, 'generador');
  if (await pg.evaluate(() => GEN.modo !== 'semana')) await clic(pg, '[data-modo="semana"]');
  for (let i = 0; i < 10 && await pg.evaluate(l => GEN.lunes < l, lunes); i++) await clic(pg, '#gsNext');
  for (let i = 0; i < 10 && await pg.evaluate(l => GEN.lunes > l, lunes); i++) await clic(pg, '#gsPrev');
  await clic(pg, '#genPrevia');
  return llega(pg, () => !!(GEN.previa && GEN.previa.semana), null, 15000);
}
const porIvanPrevia = (pg, iso) => pg.evaluate(v => asignados(GEN.previa.estado, v, 'PASARELA_T').filter(x => x.por === 'ivan').map(x => x.pid), iso);

try {
  const pg = await pagina('equipo');

  // ══ 1) Equipo: Mari Luz «Cubre a» Iván, y se ve por los dos lados ══
  console.log('── 1) Ficha de Mari Luz → «Cubre a» Iván (cualquier día, cualquier turno); la ficha y la tarjeta lo dicen por los dos lados');
  // como el cliente el 24/09: Dulce ya no está en standby
  await abrirFicha(pg, 'dulce');
  await clic(pg, '#fichaOvl input[data-chk="standby"]');
  ok('Dulce ya no está en standby', await pg.evaluate(() => !personaDeId('dulce').standby));
  await cerrarFicha(pg);
  await abrirFicha(pg, 'mariluz');
  await pg.selectOption('#fichaOvl #fCubreP', 'ivan');
  await clic(pg, '#fichaOvl [data-addcubre]');
  ok('queda guardado como designación sin día ni turno', await pg.evaluate(() => JSON.stringify(personaDeId('mariluz').cubreA) === JSON.stringify([{ pid: 'ivan' }])));
  const filaMl = await texto(pg, '#fichaOvl [data-car="cubreA"]');
  ok('la ficha de Mari Luz dice «Cubre a Iván · siempre que falte · hasta que lo quites»', /Cubre a Iván/.test(filaMl) && /siempre que falte · hasta que lo quites/.test(filaMl), filaMl);
  await cerrarFicha(pg);
  const cardMl = await texto(pg, '#equipoRoot [data-pcard="mariluz"] .traits');
  ok('la tarjeta de Mari Luz lo dice igual: «Cubre a Iván · siempre que falte · hasta que lo quites»', /Cubre a/.test(cardMl) && /Iván · siempre que falte · hasta que lo quites/.test(cardMl), cardMl);
  const cardIv = await texto(pg, '#equipoRoot [data-pcard="ivan"] .traits');
  ok('la tarjeta de Iván dice «Si falta, le cubre Mari Luz»', /Si falta, le cubre/.test(cardIv) && /Mari Luz/.test(cardIv), cardIv);
  await abrirFicha(pg, 'ivan');
  const leCubre = await texto(pg, '#fichaOvl [data-lecubre]');
  // (revisión F3b: sin «(siempre que falte)», que sobraba; como la tarjeta)
  ok('la ficha de Iván dice «Si falta, le cubre Mari Luz»', /Si falta, le cubre Mari Luz/.test(leCubre) && !/siempre que falte/.test(leCubre), leCubre);
  ok('sin jerga: ni «cubreA», ni «designación», ni «pid»', !/cubreA|designaci|pid\b/.test(leCubre + filaMl + cardMl + cardIv));
  await clic(pg, '#fichaOvl [data-lecubre] [data-irficha="mariluz"]');
  ok('el nombre enlaza con la ficha de Mari Luz', await llega(pg, () => { const n = document.querySelector('#fichaOvl #fichNombre'); return !!n && n.value === 'Mari Luz'; }, null, 3000) >= 0);
  await cerrarFicha(pg);
  ok('y al cerrarla no queda otra ficha abierta debajo', await pg.evaluate(() => !document.getElementById('fichaOvl')));

  // ══ 2) la Cobertura, antes de apuntar nada ══
  console.log('── 2) Cobertura → Iván → Vacaciones → 02, 03 y 04/10 → Tarde: «Iván tiene quien le cubra: Mari Luz» y por qué no el domingo');
  await vista(pg, 'cobertura');
  await clic(pg, '#cobRoot .cobpk[data-pk="ivan"]');
  await clic(pg, '#cobRoot [data-tipo="VAC"]');
  for (const iso of [VIE, SAB, DOM]) if (!await pg.evaluate(i => COB.dias.includes(i), iso)) await clic(pg, `#cobRoot .cobdia[data-dia="${iso}"]`);
  await clic(pg, '#cobRoot [data-fr="T"]');
  await clic(pg, '#cobRoot #cobProponer');
  ok('sale la propuesta', await llega(pg, () => !!document.querySelector('#cobRes .cobplan.reco'), null, 8000) >= 0);
  const cabCob = await texto(pg, '#cobRes .cobres');
  ok('arriba dice «Iván tiene quien le cubra: Mari Luz»', /Iván tiene quien le cubra: Mari Luz/.test(cabCob), cabCob.slice(0, 300));
  const domCob = await texto(pg, `#cobRes .cobplan.reco .cobmv[data-cas="${DOM}|PASARELA_T"]`);
  ok('el domingo explica por qué no la pone: «Mari Luz no puede: nunca con Lavinia»', /Mari Luz no puede: nunca con Lavinia/.test(domCob), domCob);
  const vieCob = await texto(pg, `#cobRes .cobplan.reco .cobmv[data-cas="${VIE}|PASARELA_T"]`);
  ok('el viernes: Mari Luz «ya estaba · cubre a Iván», sin «no puede»', /ya estaba/.test(vieCob) && /cubre a Iván/.test(vieCob) && !/no puede/.test(vieCob), vieCob);

  // ══ 3) Equipo: vacaciones de Iván en la semana ya volcada ══
  console.log('── 3) Ficha de Iván → vacaciones del 2 al 4/10 solo por la tarde → la confirmación lo explica → Guardar');
  ok('la semana del 28/09 ya está en la planilla, con Iván en sus tardes', (await casilla(pg, VIE)).some(x => x.pid === 'ivan'));
  const hayFranja = await vacacionesIvan(pg, 'T');
  ok('el alta de ausencias de la ficha deja elegir la franja (día entero / solo mañana / solo tarde)', hayFranja && await pg.evaluate(() => [...document.querySelectorAll('#fichaOvl #fAusFr option')].map(o => o.textContent.trim()).join('|') === 'Día entero|Solo mañana|Solo tarde'), await pg.evaluate(() => [...document.querySelectorAll('#fichaOvl #fAusFr option')].map(o => o.textContent).join('|')));
  ok('sale la confirmación', await llega(pg, () => !!document.getElementById('ausOvl'), null, 4000) >= 0);
  const conf = await texto(pg, '#ausOvl');
  ok('dice «Iván no está del viernes 2 al domingo 4 por la tarde»', /Iván no está del viernes 2 al domingo 4 por la tarde/.test(conf), conf);
  ok('dice «Mari Luz le cubre (hasta nueva orden)»', /Mari Luz le cubre \(hasta nueva orden\)/.test(conf), conf);
  // (revisión F3b: el relevo no «entra»: ya estaba y pasa a cubrirle; y el porqué sin paréntesis anidados)
  ok('viernes y sábado: «ya estaba en ese turno y pasa a cubrirle»', /viernes 2 y el sábado 3 ya estaba en ese turno y pasa a cubrirle/.test(conf), conf);
  ok('el domingo: «no puede: nunca con Lavinia»', /domingo 4 no puede: nunca con Lavinia/.test(conf), conf);
  ok('dice lo que queda por cubrir (el mínimo de las tardes) y ofrece la Cobertura', /queda/i.test(conf) && !!(await pg.$('#ausOvl [data-ausok="cobertura"]')), conf);
  ok('y cómo deshacerlo (Ctrl+Z)', /Ctrl\+Z/.test(conf), conf);
  ok('antes de confirmar no se ha tocado nada', (await casilla(pg, VIE)).some(x => x.pid === 'ivan') && await pg.evaluate(() => !(personaDeId('ivan').ausencias || []).length));
  await clic(pg, '#ausOvl [data-ausok="guardar"]');
  ok('al guardar se cierra la confirmación', await llega(pg, () => !document.getElementById('ausOvl'), null, 3000) >= 0);
  ok('Iván queda de vacaciones del 2 al 4 solo por la tarde', await pg.evaluate(() => { const a = personaDeId('ivan').ausencias || []; return a.length === 1 && a[0].tipo === 'VAC' && a[0].desde === '2026-10-02' && a[0].hasta === '2026-10-04' && JSON.stringify(a[0].franjas) === '["T"]'; }), await pg.evaluate(() => JSON.stringify(personaDeId('ivan').ausencias)));
  for (const iso of [VIE, SAB]) {
    const c = await casilla(pg, iso);
    ok(`${iso.slice(8)}: Iván sale y Mari Luz queda «por Iván», abriendo`, !c.some(x => x.pid === 'ivan') && c.filter(x => x.pid === 'mariluz').length === 1 && c.find(x => x.pid === 'mariluz').por === 'ivan' && c.find(x => x.pid === 'mariluz').abre, JSON.stringify(c));
  }
  const cdom = await casilla(pg, DOM);
  ok('domingo: Iván sale y nadie queda «por Iván» (Mari Luz no puede)', !cdom.some(x => x.pid === 'ivan') && !cdom.some(x => x.por === 'ivan'), JSON.stringify(cdom));
  await cerrarFicha(pg);
  ok('la tarjeta de Iván enseña la ausencia de la tarde', /Vacaciones por la tarde/.test(await texto(pg, '#equipoRoot [data-pcard="ivan"] .abschips')));
  ok('el historial lo cuenta en una línea (la ausencia y quién le cubre)', await pg.evaluate(() => { const h = (S.historial || [])[0]; return !!h && /Iván/.test(h.txt) && /Vacaciones/.test(h.txt) && /Mari Luz/.test(h.txt); }), await pg.evaluate(() => JSON.stringify((S.historial || []).slice(0, 2))));

  // ══ 4) Hoy y Semana ══
  console.log('── 4) Hoy (viernes 2) y Semana (28/09): Mari Luz «por Iván»');
  ok('Hoy está en el viernes 2', await irHoy(pg, VIE) === VIE);
  const hoyCas = await texto(pg, `#view-hoy [data-cas="${VIE}|PASARELA_T"]`);
  ok('Hoy: la tarde de Pasarela enseña a Mari Luz «por Iván»', /Mari Luz/.test(hoyCas) && /por Iván/.test(hoyCas) && !/Iván Iván/.test(hoyCas), hoyCas);
  ok('la Semana está en la del 28/09', await irSemana(pg, L28) === L28);
  const semTip = await pg.$eval(`#view-semana [data-wpers="${SAB}|PASARELA_T|mariluz"]`, b => b.getAttribute('data-tipstr') || '').catch(() => '');
  ok('Semana: el sábado Mari Luz va «por Iván»', /por Iván/.test(semTip), semTip);

  // ══ 5) Ctrl+Z ══
  console.log('── 5) Ctrl+Z lo deshace todo de una vez: la ausencia y la planilla');
  await pg.click('body', { position: { x: 5, y: 5 } }).catch(() => {});
  await pg.keyboard.press('Control+z');
  ok('Iván vuelve a su tarde del viernes y Mari Luz ya no va «por Iván»', await llega(pg, () => { const e = estadoDeIso('2026-10-02'); const l = asignados(e, '2026-10-02', 'PASARELA_T'); return l.some(x => x.pid === 'ivan') && !l.some(x => x.por === 'ivan'); }, null, 3000) >= 0, JSON.stringify(await casilla(pg, VIE)));
  ok('y sin vacaciones en su ficha', await pg.evaluate(() => !(personaDeId('ivan').ausencias || []).length));
  ok('el domingo también vuelve', (await casilla(pg, DOM)).some(x => x.pid === 'ivan'));

  // ══ 6) otra vez, y ahora «buscar en la Cobertura lo que queda» ══
  console.log('── 6) Otra vez las vacaciones; ahora «Guardar y buscar en la Cobertura lo que queda»');
  await vacacionesIvan(pg, 'T');
  await llega(pg, () => !!document.getElementById('ausOvl'), null, 4000);
  await clic(pg, '#ausOvl [data-ausok="cobertura"]');
  ok('se abre la Cobertura con Iván, sus vacaciones y los días que quedan', await llega(pg, () => !!document.querySelector('#cobOvl') && COB.pid === 'ivan' && COB.tipo === 'VAC' && JSON.stringify(COB.dias) === JSON.stringify(['2026-10-02', '2026-10-03', '2026-10-04']) && JSON.stringify(COB.franjas) === '["T"]', null, 4000) >= 0, await pg.evaluate(() => JSON.stringify({ pid: COB.pid, tipo: COB.tipo, dias: COB.dias, fr: COB.franjas })));
  ok('las vacaciones ya están guardadas (un solo registro) y Mari Luz ya va «por Iván»', await pg.evaluate(() => (personaDeId('ivan').ausencias || []).length === 1) && (await porIvan(pg, VIE)).join() === 'mariluz');
  await clic(pg, '#cobOvl #cobProponer');
  ok('la Cobertura propone para lo que quedó (aunque Iván ya no esté en esas casillas)', await llega(pg, () => !!document.querySelector('#cobOvl .cobplan.reco'), null, 8000) >= 0, await texto(pg, '#cobOvl #cobRes'));
  const vieP = await texto(pg, `#cobOvl .cobplan.reco .cobmv[data-cas="${VIE}|PASARELA_T"]`);
  ok('viernes: Mari Luz sigue de relevo y entra una más «para llegar al mínimo»', /Mari Luz/.test(vieP) && /ya estaba/.test(vieP) && /para llegar al mínimo/.test(vieP), vieP);
  const domP = await texto(pg, `#cobOvl .cobplan.reco .cobmv[data-cas="${DOM}|PASARELA_T"]`);
  ok('domingo: dice por qué Mari Luz no puede y propone a otra persona', /Mari Luz no puede: nunca con Lavinia/.test(domP) && !/Hueco/.test(domP), domP);
  await clic(pg, '#cobOvl .cobplan.reco [data-aplicar="A"]');
  await llega(pg, () => !!document.querySelector('#previaCobOvl'), null, 4000);
  await clic(pg, '#previaCobOvl #pvOk');
  ok('al confirmar, el domingo queda cubierto «por Iván» y la ausencia no se duplica', await llega(pg, () => asignados(estadoDeIso('2026-10-04'), '2026-10-04', 'PASARELA_T').some(x => x.por === 'ivan') && (personaDeId('ivan').ausencias || []).length === 1, null, 5000) >= 0, JSON.stringify(await casilla(pg, DOM)));
  ok('viernes: Mari Luz sigue una sola vez «por Iván» y ya son 3', await pg.evaluate(() => { const l = asignados(estadoDeIso('2026-10-02'), '2026-10-02', 'PASARELA_T'); return l.filter(x => x.pid === 'mariluz' && x.por === 'ivan').length === 1 && l.length === 3; }), JSON.stringify(await casilla(pg, VIE)));
  ok('al cerrar la Cobertura se vuelve a la ficha de Iván, que sigue abierta', await pg.evaluate(() => !document.getElementById('cobOvl') && !!document.getElementById('fichaOvl')));
  await cerrarFicha(pg);

  // ══ 7) el Generador dice lo mismo ══
  console.log('── 7) Generador → semana del 28/09: lo mismo que Equipo y la Cobertura');
  ok('sale la vista previa de la semana', await generadorSemana(pg, L28) >= 0);
  for (const iso of [VIE, SAB]) ok(`${iso.slice(8)}: la vista previa deja a Mari Luz «por Iván»`, (await porIvanPrevia(pg, iso)).includes('mariluz'), JSON.stringify(await porIvanPrevia(pg, iso)));
  ok('no retira a Mari Luz ni a quien entró por la Cobertura', await pg.evaluate(() => !(GEN.previa.retirados || []).some(x => x.pid === 'mariluz' || x.por === 'ivan')), await pg.evaluate(() => JSON.stringify(GEN.previa.retirados)));
  ok('ni hay relevos nuevos que volcar (ya están)', await pg.evaluate(() => !GEN.previa.relevos));
  ok('Iván no vuelve a sus tardes', await pg.evaluate(() => ['2026-10-02', '2026-10-03', '2026-10-04'].every(i => !pidsEn(GEN.previa.estado, i, 'PASARELA_T').includes('ivan'))));

  // ══ 8) quitar la designación ══
  console.log('── 8) Ficha de Mari Luz → quitar «Cubre a» Iván → ya no se aplica en ningún sitio');
  await abrirFicha(pg, 'mariluz');
  await clic(pg, '#fichaOvl [data-rmcubre="0"]');
  ok('se quita de la ficha', await pg.evaluate(() => !(personaDeId('mariluz').cubreA || []).some(c => c.pid === 'ivan')));
  await cerrarFicha(pg);
  ok('la tarjeta de Iván ya no dice «Si falta, le cubre»', !/Si falta, le cubre/.test(await texto(pg, '#equipoRoot [data-pcard="ivan"] .traits')));
  await abrirFicha(pg, 'ivan');
  const leCubre2 = await texto(pg, '#fichaOvl [data-lecubre]');
  ok('la ficha de Iván tampoco (dice que nadie le cubre en concreto)', !/le cubre Mari Luz/.test(leCubre2) && /Nadie/.test(leCubre2), leCubre2);
  await cerrarFicha(pg);
  ok('el Generador ya no la tiene «por Iván»: vuelve a ser su plaza de siempre', await generadorSemana(pg, L28) >= 0 && (await porIvanPrevia(pg, VIE)).length === 0 && await pg.evaluate(() => { const m = asignados(GEN.previa.estado, '2026-10-02', 'PASARELA_T').find(x => x.pid === 'mariluz'); return !!m && !m.por; }), JSON.stringify(await pg.evaluate(() => asignados(GEN.previa.estado, '2026-10-02', 'PASARELA_T'))));
  ok('y no la saca de su plaza (era suya)', await pg.evaluate(() => !(GEN.previa.retirados || []).some(x => x.pid === 'mariluz')));
  ok('las condiciones del Generador ya no dicen «Mari Luz cubre a Iván»', await pg.evaluate(() => !GEN.previa.condiciones.some(c => /Mari Luz cubre a Iván/.test(c.texto))));
  await clic(pg, '#genAplicar');
  ok('se vuelca la semana', await llega(pg, () => !GEN.previa, null, 8000) >= 0);
  ok('la planilla ya no tiene a Mari Luz «por Iván» (sigue en su plaza)', !(await porIvan(pg, VIE)).includes('mariluz') && (await casilla(pg, VIE)).some(x => x.pid === 'mariluz'), JSON.stringify(await casilla(pg, VIE)));
  ok('Hoy está en el viernes 2', await irHoy(pg, VIE) === VIE, await pg.evaluate(() => JSON.stringify([isoDia(), [...document.querySelectorAll('.ovl,.pop')].map(o => o.id || o.className), document.querySelector('.tab[aria-selected="true"]').dataset.v])));
  const chipMl = await texto(pg, `#view-hoy [data-cas="${VIE}|PASARELA_T"] .pchip[data-pid="mariluz"]`);
  ok('Hoy: Mari Luz ya no va «por Iván»', !!chipMl && !/por Iván/.test(chipMl), chipMl || await texto(pg, `#view-hoy [data-cas="${VIE}|PASARELA_T"]`));
  // la Cobertura de otro día de Iván ya no la propone ni dice que tenga quien le cubra
  await vista(pg, 'cobertura');
  await clic(pg, '#cobRoot .cobpk[data-pk="ivan"]');
  await clic(pg, '#cobRoot [data-cobsel="ninguno"]');
  for (let i = 0; i < 3 && await pg.evaluate(() => COB.base < '2026-10-05'); i++) await clic(pg, '#cobRoot [data-cobnav="7"]');
  await clic(pg, '#cobRoot .cobdia[data-dia="2026-10-09"]');
  await clic(pg, '#cobRoot [data-fr=""]');
  await clic(pg, '#cobRoot #cobProponer');
  await llega(pg, () => !!document.querySelector('#cobRes .cobres, #cobRes .cobvacia'), null, 8000);
  const cob2 = await texto(pg, '#cobRes');
  ok('la Cobertura (viernes 9) ya no dice «tiene quien le cubra» ni pone a Mari Luz de relevo', !/tiene quien le cubra/.test(cob2) && !(await pg.$('#cobRes .cobrow.relevo[data-pid="mariluz"]')), cob2.slice(0, 300));
  await pg.context().close();

  // ══ 9) móvil 390×844 ══
  console.log('── 9) Móvil (390×844, táctil): la franja, la confirmación que cabe y responde al primer toque');
  {
    const pm = await pagina('movil', { viewport: { width: 390, height: 844 }, movil: true });
    await pm.evaluate(() => { const q = personaDeId('mariluz'); q.cubreA = [{ pid: 'ivan' }]; saveState(); switchTab('equipo'); });
    await pm.waitForSelector('#equipoRoot [data-pcard="ivan"] .pmini', { timeout: 8000 });
    await pm.tap('#equipoRoot [data-pcard="ivan"] .pmini');
    await pm.waitForSelector('#fichaOvl #fAusD1', { timeout: 5000 });
    ok('móvil: la ficha de Iván dice «Si falta, le cubre Mari Luz»', /Si falta, le cubre Mari Luz/.test(await texto(pm, '#fichaOvl [data-lecubre]')));
    await pm.selectOption('#fichaOvl #fAusTipo', 'VAC');
    await pm.fill('#fichaOvl #fAusD1', VIE);
    await pm.fill('#fichaOvl #fAusD2', DOM);
    const sel = await pm.$('#fichaOvl #fAusFr');
    ok('móvil: el selector de franja está y se ve', !!sel && await sel.isVisible());
    if (sel) await pm.selectOption('#fichaOvl #fAusFr', 'T');
    const bt = await pm.$('#fichaOvl [data-addaus]');
    await bt.scrollIntoViewIfNeeded(); await bt.tap();
    ok('móvil: sale la confirmación', await llega(pm, () => !!document.getElementById('ausOvl'), null, 4000) >= 0);
    const anchos = await pm.evaluate(() => { const c = document.querySelector('#ausOvl .ovcard'); return c ? [Math.round(c.getBoundingClientRect().left), Math.round(c.getBoundingClientRect().right), innerWidth, document.documentElement.scrollWidth] : null; });
    ok('móvil: la confirmación cabe a lo ancho (sin desplazamiento lateral)', !!anchos && anchos[0] >= 0 && anchos[1] <= anchos[2] && anchos[3] <= anchos[2], JSON.stringify(anchos));
    const cm = await texto(pm, '#ausOvl');
    ok('móvil: dice «Más → Deshacer», no Ctrl+Z', /Más → Deshacer/.test(cm) && !/Ctrl\+Z/.test(cm), cm.slice(-200));
    const g = await pm.$('#ausOvl [data-ausok="guardar"]');
    const alto = g ? await g.evaluate(b => Math.round(b.getBoundingClientRect().height)) : 0;
    ok('móvil: «Guardar» se toca bien (44 px o más)', alto >= 44, alto);
    await g.scrollIntoViewIfNeeded(); await new Promise(r => setTimeout(r, 300));
    await g.tap();
    ok('móvil: «Guardar» responde al primer toque', await llega(pm, () => !document.getElementById('ausOvl') && (personaDeId('ivan').ausencias || []).length === 1, null, 3000) >= 0);
    ok('móvil: Mari Luz queda «por Iván» el viernes', (await porIvan(pm, VIE)).join() === 'mariluz', JSON.stringify(await casilla(pm, VIE)));
    await pm.context().close();
  }

  ok('ningún error de página en toda la batería', !errores.length, errores.join(' | '));
} catch (e) {
  ok('la batería no se interrumpe', false, e && e.stack ? e.stack.split('\n').slice(0, 4).join(' | ') : e);
} finally {
  await br.close();
  srv.close();
}
resumen();
