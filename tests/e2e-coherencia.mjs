// LO QUE SE DECIDE CON AVISO LLEGA A LA PLANILLA, Y TODOS LOS SITIOS DICEN LO MISMO (24/09, revisión de la fase 6;
// Diego: «que lea todas las variables»). Con clics, en modo local (servidor estático propio, sesión abierta por
// addInitScript, ?demo=1, reloj el jueves 24/09/2026):
//  · la pareja «nunca con» flexible (Mari Luz–Lavinia) que se decidió con aviso se pone igual al aceptar la
//    propuesta «con aviso» de un hueco del Generador → Periodo y desde el Mes (sin pedir forzarla, como el selector);
//  · el caso de Iván de la reunión (vacaciones del 2 al 4/10 por la tarde, Mari Luz «Cubre a» Iván): el domingo 4
//    Mari Luz no hace la tarde con Lavinia ni en la confirmación de Equipo ni en el Generador (Aroa: «el domingo
//    haría mañana»); con «Permitir partidos no declarados», el Generador hace lo del plan A de la Cobertura;
//  · el turno continuo de Victoria (8/10, El 33) no sale como partido en el Mes ni en la hoja impresa del mes (D4);
//  · con «Mínimos» apagado (D5) ni Hoy, ni la hoja del mes, ni el Excel, ni la Cobertura dicen que falta (o que
//    sobra) nadie para el mínimo;
//  · con la regla del grupo «Cocina» apagada, la tarjeta tacha la cocina de titular y de reserva (como la ficha).
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cargarChromium, contador, llega } from './e2e-util.mjs';

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
setTimeout(() => { console.log('  ✗ tiempo agotado (180 s)'); process.exit(1); }, 180000).unref();
const br = await chromium.launch({ executablePath: CHROMIUM, args: ['--no-sandbox'] });
const errores = [];

async function pagina(etiqueta) {
  const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } });
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
  return llega(pg, () => !!document.querySelector('#fichaOvl #fichBody .fcar'), null, 5000);
}
const cerrar = async (pg, id) => { await clic(pg, `#${id} [data-ovx]`); return llega(pg, id => !document.getElementById(id), id, 3000); };
const ultimoToast = pg => pg.evaluate(() => { const t = [...document.querySelectorAll('.toast')].pop(); return t ? t.textContent.replace(/\s+/g, ' ').trim() : ''; });
const apagarRegla = async (pg, k) => {
  await vista(pg, 'equipo'); await clic(pg, '#btnCondiciones');
  await llega(pg, () => !!document.querySelector('#condOvl #condBody .condrow'), null, 4000);
  await clic(pg, `#condOvl [data-regla-row="${k}"] .tglk`);
  const r = await llega(pg, k => S.reglas[k] === false, k, 3000);
  await cerrar(pg, 'condOvl');
  return r;
};
const VIE = '2026-10-02', DOM = '2026-10-04', L28 = '2026-09-28';

try {
  // ── la pareja flexible decidida con aviso llega a la planilla ──
  console.log('── la pareja «nunca con» flexible, aceptada con aviso');
  const pg = await pagina('aviso');
  const lblPartido = async () => { await vista(pg, 'generador'); return texto(pg, '#genRoot label.genopt:has(#genPartido)'); };
  const lblSem = await lblPartido();
  ok('Generador (semana): «Permitir partidos no declarados» dice que también junta parejas «nunca con» flexibles si no hay nadie más', /flexible/.test(lblSem) && /nadie más/.test(lblSem), lblSem);
  await clic(pg, '#genRoot [data-modo="periodo"]');
  const lblPer = await texto(pg, '#genRoot label.genopt:has(#genPartido)');
  ok('Generador (periodo): lo mismo', /flexible/.test(lblPer) && /nadie más/.test(lblPer), lblPer);
  // el viernes 2 solo quedan Iván, Mari Luz y Lavinia (todos los demás de vacaciones), con un mínimo de 3 en la tarde de
  // Pasarela; Lavinia hace la mañana, así que por la tarde haría un partido no declarado y coincidiría con Mari Luz
  await pg.evaluate(D => {
    for (const p of S.staff) if (!['ivan', 'mariluz', 'lavinia'].includes(p.id)) anadirAusencia(p, { tipo: 'VAC', desde: D, hasta: D });
    localDe(S, 'PASARELA').minimos.T[5] = 3;
    const e = estadoDeIso(D);
    for (const t of turnosDe(S)) for (const x of asignados(e, D, t.id).slice()) desasignar(e, D, t.id, x.pid);
    asignar(e, S, S.staff, D, 'PASARELA_M', 'lavinia', {}); asignar(e, S, S.staff, D, 'PASARELA_T', 'ivan', {}); asignar(e, S, S.staff, D, 'PASARELA_T', 'mariluz', {});
    saveState();
    GEN.desde = D; GEN.hasta = D; GEN.titulo = 'Viernes 2'; GEN.previa = null; GEN.opts.permitirPartido = false; renderGenerador();
  }, VIE);
  await clic(pg, '#genRoot #genPrevia');
  await llega(pg, () => !!(GEN.previa && !GEN.ocupado), null, 15000);
  const bot = `#genRes [data-aplicaruno="${VIE}|PASARELA_T|lavinia"]`;
  ok('el hueco de la tarde de Pasarela propone a Lavinia «con aviso»', !!(await pg.$(bot)), await texto(pg, '#genRes'));
  await clic(pg, bot);
  await llega(pg, D => asignados(estadoDeIso(D), D, 'PASARELA_T').some(x => x.pid === 'lavinia'), VIE, 3000);
  const lav = await pg.evaluate(D => JSON.parse(JSON.stringify(asignados(estadoDeIso(D), D, 'PASARELA_T').find(x => x.pid === 'lavinia') || null)), VIE);
  ok('«Aplicar» la pone con Mari Luz y el aviso de la pareja flexible (antes: «nunca con Mari Luz»)', !!lav && (lav.avisos || []).some(a => /nunca con Mari Luz \(pareja flexible/.test(a)) && lav.origen === 'manual', JSON.stringify(lav) + ' · ' + await ultimoToast(pg));
  // desde el Mes, como el selector: con aviso, sin pedir forzarla
  await pg.evaluate(D => { desasignar(estadoDeIso(D), D, 'PASARELA_T', 'lavinia'); desasignar(estadoDeIso(D), D, 'PASARELA_M', 'lavinia'); saveState(); }, VIE);
  await vista(pg, 'mes');
  await pg.evaluate(() => { if (S.m !== 10) { S.y = 2026; S.m = 10; cargarMes(); renderVistaActiva(); } });
  await llega(pg, D => !!document.querySelector(`#mesRoot [data-asig="lavinia|${D}"]`), VIE, 4000);
  await clic(pg, `#mesRoot [data-asig="lavinia|${VIE}"]`);
  await llega(pg, () => !!document.querySelector('[data-pon="PASARELA_T"]'), null, 3000);
  await clic(pg, '[data-pon="PASARELA_T"]');
  await llega(pg, D => asignados(estadoDeIso(D), D, 'PASARELA_T').some(x => x.pid === 'lavinia'), VIE, 3000);
  const lavMes = await pg.evaluate(D => JSON.parse(JSON.stringify(asignados(estadoDeIso(D), D, 'PASARELA_T').find(x => x.pid === 'lavinia') || null)), VIE);
  ok('el Mes la pone con el aviso de la pareja flexible, sin forzarla (como el selector «con aviso»)', !!lavMes && !lavMes.forzado && (lavMes.avisos || []).some(a => /pareja flexible/.test(a)) && !/forzado/.test(lavMes.razon || ''), JSON.stringify(lavMes));
  // la ficha y la tarjeta dicen cuándo se junta la pareja flexible (no «se relaja» sin más: el Generador solo con la casilla)
  await vista(pg, 'equipo');
  const titFlex = ((await pg.$$eval('#equipoRoot [data-pcard="mariluz"] .tchip', xs => xs.map(x => ({ txt: x.textContent.replace(/\s+/g, ' ').trim(), title: x.getAttribute('title') || '' })))).find(x => /^Nunca con/.test(x.txt)) || {}).title || '';
  ok('la tarjeta de Mari Luz: la pareja flexible se junta con aviso, y dice cuándo', /Permitir partidos no declarados/.test(titFlex) && /con aviso/.test(titFlex), titFlex);
  await abrirFicha(pg, 'mariluz');
  const filaFlex = await texto(pg, '#fichaOvl [data-par="lavinia"] .festinfo');
  ok('la ficha lo dice igual', /Permitir partidos no declarados/.test(filaFlex) && !/se relaja y queda el aviso/.test(filaFlex), filaFlex);
  await cerrar(pg, 'fichaOvl');
  await pg.context().close();

  // ── el caso de Iván (reunión del 24/09) ──
  console.log('── Iván de vacaciones del 2 al 4/10 por la tarde; Mari Luz «Cubre a» Iván');
  const pi = await pagina('ivan');
  await abrirFicha(pi, 'mariluz');
  await pi.selectOption('#fichaOvl #fCubreP', 'ivan');
  await clic(pi, '#fichaOvl [data-addcubre]');
  ok('Mari Luz cubre a Iván', await llega(pi, () => (S.staff.find(p => p.id === 'mariluz').cubreA || []).some(c => c.pid === 'ivan'), null, 3000) >= 0);
  await cerrar(pi, 'fichaOvl');
  await abrirFicha(pi, 'ivan');
  await pi.selectOption('#fichaOvl #fAusTipo', 'VAC');
  await pi.fill('#fichaOvl #fAusD1', VIE); await pi.fill('#fichaOvl #fAusD2', DOM);
  await pi.selectOption('#fichaOvl #fAusFr', 'T').catch(() => {});
  await clic(pi, '#fichaOvl [data-addaus]');
  await llega(pi, () => !!document.getElementById('ausOvl'), null, 4000);
  const conf = await texto(pi, '#ausOvl');
  ok('la confirmación de Equipo dice que el domingo 4 Mari Luz no puede: nunca con Lavinia', /domingo 4[^.]*nunca con Lavinia/i.test(conf), conf.slice(0, 500));
  await clic(pi, '#ausOvl [data-ausok="guardar"]');
  await llega(pi, () => !document.getElementById('ausOvl'), null, 3000);
  await cerrar(pi, 'fichaOvl');
  const domT = (pv, iso) => pi.evaluate(([iso]) => asignados(GEN.previa.estado, iso, 'PASARELA_T').map(x => x.pid), [iso]);
  const generarSemana28 = async permitir => {
    await vista(pi, 'generador');
    if (await pi.evaluate(() => GEN.modo !== 'semana')) await clic(pi, '#genRoot [data-modo="semana"]');
    for (let i = 0; i < 6 && await pi.evaluate(l => GEN.lunes < l, L28); i++) await clic(pi, '#gsNext');
    if (await pi.$eval('#genPartido', x => x.checked) !== permitir) await clic(pi, '#genPartido');
    await clic(pi, '#genRoot #genPrevia');
    return llega(pi, () => !!(GEN.previa && GEN.previa.semana && !GEN.ocupado), null, 20000);
  };
  ok('el Generador de la semana del 28/09 genera', await generarSemana28(false) >= 0);
  const dom0 = await domT(null, DOM);
  ok('sin «Permitir partidos no declarados», el domingo 4 Mari Luz no hace la tarde con Lavinia (como dice Equipo)', !dom0.includes('mariluz'), dom0.join(','));
  const c25 = await pi.evaluate(() => (GEN.previa.condiciones || []).find(c => c.k === 'nuncaCon' && [c.pid, c.otro].sort().join('+') === 'lavinia+mariluz'));
  ok('y la condición «Mari Luz y Lavinia no coinciden» se cumple', !!c25 && c25.ok, JSON.stringify(c25));
  ok('con «Permitir partidos no declarados» tampoco (hay alguien más con aviso, como el plan A de la Cobertura)', await generarSemana28(true) >= 0 && !(await domT(null, DOM)).includes('mariluz'), (await domT(null, DOM)).join(','));
  await pi.context().close();

  // ── Victoria de corrido el jueves 8/10 en El 33 (D4) ──
  console.log('── el turno continuo de Victoria');
  const pv = await pagina('continuo');
  const J8 = '2026-10-08';
  await vista(pv, 'hoy');
  await pv.evaluate(iso => irAIso(iso), J8);
  await llega(pv, iso => !!document.querySelector(`[data-cas="${iso}|EL33_T"]`), J8, 4000);
  const quitar = await pv.evaluate(iso => asignados(estadoDeIso(iso), iso, 'EL33_T').filter(x => !x.cocina).map(x => x.pid), J8);
  for (const pid of quitar) { await clic(pv, `[data-un="${J8}|EL33_T|${pid}"]`); await llega(pv, ([i, p]) => !pidsEn(estadoDeIso(i), i, 'EL33_T').includes(p), [J8, pid], 3000); }
  await clic(pv, `#diaLocales [data-pick="${J8}|EL33_T"]`);
  await llega(pv, () => !!document.querySelector('#pickerPop'), null, 3000);
  await clic(pv, '#pickerPop [data-pickpid="victoria"]');
  const cont = await llega(pv, iso => pidsEn(estadoDeIso(iso), iso, 'EL33_T').includes('victoria') && !!turnoDelDia(S, estadoDeIso(iso), iso, 'victoria').continuo, J8, 3000);
  ok('Victoria hace la mañana y la tarde de El 33 de corrido (turno continuo)', cont >= 0, JSON.stringify(await pv.evaluate(iso => [asignados(estadoDeIso(iso), iso, 'EL33_M'), asignados(estadoDeIso(iso), iso, 'EL33_T')], J8)));
  await vista(pv, 'mes');
  await pv.evaluate(() => { if (S.m !== 10) { S.y = 2026; S.m = 10; cargarMes(); renderVistaActiva(); } });
  await llega(pv, iso => !!document.querySelector(`#mesRoot [data-asig="victoria|${iso}"] .pill`), J8, 4000);
  const pill = await pv.$eval(`#mesRoot [data-asig="victoria|${J8}"] .pill`, x => ({ txt: x.textContent.trim(), cls: x.className, tip: x.dataset.tipstr || '' })).catch(e => ({ error: e.message }));
  ok('Mes: la pastilla dice C·33 (turno continuo), no P·33', /^C·/.test(pill.txt || '') && !/\bpP\b/.test(pill.cls || ''), JSON.stringify(pill));
  ok('Mes: la leyenda explica la C', /turno continuo/.test(await texto(pv, '#legend')), await texto(pv, '#legend'));
  await pv.evaluate(() => abrirImpresionMes());
  await llega(pv, () => !!document.querySelector('#printRoot .pxm'), null, 4000);
  const imp = await pv.evaluate(() => { const r = [...document.querySelectorAll('#printRoot .pxm tbody tr')].find(x => /Victoria/.test(x.textContent)); const ths = [...document.querySelectorAll('#printRoot .pxm thead th')]; const i = ths.findIndex(t => t.querySelector('b') && t.querySelector('b').textContent === '8'); return { cel: r ? r.children[i].textContent.trim() : null, ley: (document.querySelector('#printRoot .pxley') || {}).textContent || '' }; });
  ok('hoja impresa del mes: Victoria el 8 lleva C, no P', imp.cel === 'C', JSON.stringify(imp.cel));
  ok('y la leyenda de la hoja explica la C (turno continuo)', /C\s*turno continuo/.test(imp.ley), imp.ley.slice(0, 300));
  await pv.context().close();

  // ── «Mínimos» apagado (D5) ──
  console.log('── «Mínimos» apagado: nadie dice que falte gente para el mínimo');
  const pm = await pagina('minimos');
  ok('apagar «Mínimos» en Equipo → Condiciones', await apagarRegla(pm, 'minimos') >= 0);
  const D6 = '2026-10-06';
  await vista(pm, 'hoy');
  await pm.evaluate(iso => irAIso(iso), D6);
  const cas = await pm.evaluate(iso => { const e = estadoDeIso(iso); for (const t of turnosDe(S)) { if (!turnoAbierto(S, e, iso, t.id)) continue; const n = asignados(e, iso, t.id).length, m = minimoDe(S, iso, t.id, e).min; if (n >= 2 && m >= 2) return { tid: t.id, pid: asignados(e, iso, t.id).slice(-1)[0].pid, n }; } return null; }, D6);
  await clic(pm, `[data-un="${D6}|${cas.tid}|${cas.pid}"]`);
  await llega(pm, ([i, t, n]) => asignados(estadoDeIso(i), i, t).length === n - 1, [D6, cas.tid, cas.n], 3000);
  const cnt = await pm.$eval(`[data-cas="${D6}|${cas.tid}"] .cnt`, x => ({ t: x.textContent, cls: x.className, tip: x.dataset.tipstr || '' })).catch(e => ({ error: e.message }));
  ok('Hoy: una casilla por debajo del mínimo no sale en verde «Mínimo cubierto»; dice que los mínimos están apagados', !/\bok\b/.test(cnt.cls || '') && /Mínimos/.test(cnt.tip) && /apagad/.test(cnt.tip), JSON.stringify(cnt));
  await vista(pm, 'mes');
  await pm.evaluate(() => { if (S.m !== 10) { S.y = 2026; S.m = 10; cargarMes(); renderVistaActiva(); } });
  await pm.evaluate(() => abrirImpresionMes());
  await llega(pm, () => !!document.querySelector('#printRoot .pxm'), null, 4000);
  const faltaImp = await pm.$$eval('#printRoot .pxm b.falta', xs => xs.length);
  ok('hoja impresa del mes: sin «personas que faltan para el mínimo»', faltaImp === 0, `${faltaImp} celdas`);
  await pm.keyboard.press('Escape');
  const xl = await pm.evaluate(() => { const out = []; for (const d of est.days) for (const l of S.locales) { const f = xlsxFaltan({ iso: d.iso, est }, l); if (f) out.push(`${d.iso} ${l.id}: ${f}`); } return out; });
  ok('Excel: la fila «Faltan» va vacía (como la Revisión)', xl.length === 0, xl.slice(0, 3).join(' | '));
  await pm.context().close();

  // ── la regla del grupo «Cocina» apagada ──
  console.log('── «Cocina» apagada para todo el grupo');
  const pc = await pagina('cocina');
  ok('apagar «Cocina» en Equipo → Condiciones', await apagarRegla(pc, 'cocina') >= 0);
  const chips = await pc.$$eval('#equipoRoot [data-pcard="jenny"] .tchip', xs => xs.map(x => ({ txt: x.textContent.replace(/\s+/g, ' ').trim(), off: x.classList.contains('off'), title: x.getAttribute('title') || '' })));
  const tit = chips.filter(x => /^Cocina/.test(x.txt) && /titular|reserva/.test(x.txt));
  ok('la tarjeta de Jenny tacha su cocina de titular y dice que es para todo el grupo (como su ficha)', tit.length > 0 && tit.every(x => x.off && /todo el grupo/.test(x.title)), JSON.stringify(tit));
  await pc.context().close();

  ok('sin errores de página en toda la batería', errores.length === 0, errores.slice(0, 4).join(' | '));
} catch (err) {
  ok('la batería reventó', false, err.message + '\n' + (err.stack || '').split('\n').slice(1, 3).join('\n'));
} finally {
  await br.close().catch(() => {});
  srv.close();
}
console.log(`\ntiempo: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
resumen();
