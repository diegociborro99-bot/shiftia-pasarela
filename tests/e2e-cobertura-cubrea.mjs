// «CUBRE A» EN LA COBERTURA, CON CLICS (reunión del 24/09; decisiones D1, D2, D3 y S8).
// Diego: «La semana que viene Iván se va a coger viernes, sábado y domingo de vacaciones… me sale
// que lo podría cubrir Dulce. Pero preferimos que lo cubra Mariluz viernes y sábado por la tarde»;
// «tú vas a equipo… Cubre a Iván, cualquier día, cualquier turno… Sigue poniendo a Dulce».
// Se recorre lo que hizo el cliente: Dulce fuera de standby y Mari Luz «Cubre a» Iván en sus fichas;
// Cobertura → Iván → Vacaciones → 02, 03 y 04/10 → «Buscar quién cubre». El plan A enseña a Mari
// Luz «ya estaba · cubre a Iván · ABRE» (no entra nueva: no sale en «Entran»), quién se queda en la
// casilla y quién entra «para llegar al mínimo». El plan viejo no se queda en pantalla cuando cambia
// la ficha, tampoco tras Ctrl+Z. Al confirmar, la planilla enseña a Mari Luz «por Iván».
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
const VIE = '2026-10-02', SAB = '2026-10-03', DOM = '2026-10-04';

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
const vista = async (pg, v) => { await pg.click(`.tab[data-v="${v}"]`); return llega(pg, v => { const s = document.getElementById('view-' + v); return !!s && !s.classList.contains('hidden'); }, v, 4000); };
async function abrirFicha(pg, pid) {
  await vista(pg, 'equipo');
  await pg.waitForSelector(`#equipoRoot [data-pcard="${pid}"] .pmini`, { timeout: 8000 }).catch(() => null);
  await clic(pg, `#equipoRoot [data-pcard="${pid}"] .pmini`);
  await pg.waitForSelector('#fichaOvl .lpunt', { timeout: 5000 });
}
const cerrarFicha = async pg => { await clic(pg, '#fichaOvl [data-ovx]'); await llega(pg, () => !document.getElementById('fichaOvl'), null, 3000); };
// la tarjeta del plan A: por casilla, las filas de quien entra (o ya estaba) y lo que dice la columna de quien sale
const planA = pg => pg.evaluate(() => {
  const P = document.querySelector('#cobRes .cobplan.reco');
  if (!P) return null;
  const casillas = {};
  for (const mv of P.querySelectorAll('.cobmv[data-cas]')) {
    casillas[mv.dataset.cas] = {
      sale: (mv.querySelector('.cobsale') || {}).textContent || '',
      filas: [...mv.querySelectorAll('.cobentra .cobrow')].map(r => ({ pid: r.dataset.pid || null, relevo: r.classList.contains('relevo'), texto: r.textContent.replace(/\s+/g, ' ').trim(), aviso: !!r.querySelector('.bdg.forz'), nota: (r.querySelector('.cobnota') || {}).textContent || '' })),
    };
  }
  return { casillas, entran: [...P.querySelectorAll('.cobpers2 .glchip')].map(x => x.textContent.trim()), texto: P.textContent.replace(/\s+/g, ' ') };
});
async function buscarIvan(pg) {
  await vista(pg, 'cobertura');
  await clic(pg, '#cobRoot .cobpk[data-pk="ivan"]');
  await clic(pg, '#cobRoot [data-tipo="VAC"]');
  for (const iso of [VIE, SAB, DOM]) if (!await pg.evaluate(i => COB.dias.includes(i), iso)) await clic(pg, `#cobRoot .cobdia[data-dia="${iso}"]`);
  await clic(pg, '#cobRoot #cobProponer');
  return llega(pg, () => !!document.querySelector('#cobRes .cobplan.reco'), null, 8000);
}

try {
  const pg = await pagina('cubrea');
  // ══ 1) lo que hizo el cliente en Equipo ══
  console.log('── 1) Equipo: Dulce fuera de standby; Mari Luz «Cubre a» Iván (cualquier día, cualquier turno)');
  await abrirFicha(pg, 'dulce');
  await clic(pg, '#fichaOvl input[data-chk="standby"]');
  ok('Dulce ya no está en standby', await pg.evaluate(() => !personaDeId('dulce').standby));
  await cerrarFicha(pg);
  await abrirFicha(pg, 'mariluz');
  ok('la ficha dice que «Cubre a» puede hacer partido para cubrirle', /partido para cubrirle/.test(await pg.$eval('#fichaOvl', x => x.textContent).catch(() => '')));
  await pg.selectOption('#fichaOvl #fCubreP', 'ivan');
  await clic(pg, '#fichaOvl [data-addcubre]');
  ok('Mari Luz cubre a Iván, sin día ni turno', await pg.evaluate(() => JSON.stringify(personaDeId('mariluz').cubreA) === JSON.stringify([{ pid: 'ivan' }])), await pg.evaluate(() => JSON.stringify(personaDeId('mariluz').cubreA)));
  await cerrarFicha(pg);
  ok('la tarjeta de Equipo de Mari Luz lo enseña y dice que puede hacer partido para cubrirle', await pg.evaluate(() => { const c = document.querySelector('#equipoRoot [data-pcard="mariluz"]'); return !!c && /Iván/.test(c.textContent) && [...c.querySelectorAll('[title],[data-tipstr]')].some(x => /partido para cubrirle/.test((x.getAttribute('title') || '') + (x.getAttribute('data-tipstr') || ''))); }));

  // ══ 2) Cobertura: Iván de vacaciones vie 2, sáb 3 y dom 4 ══
  console.log('── 2) Cobertura → Iván → Vacaciones → 02, 03 y 04/10 → Buscar quién cubre');
  ok('sale la propuesta', await buscarIvan(pg) >= 0);
  ok('la Cobertura trabaja con semanas enteras (rangoNecesario: del lunes 21/09 al domingo 11/10)', await pg.evaluate(() => !!COB.res && !!COB.res.rango && COB.res.rango.desde === '2026-09-21' && COB.res.rango.hasta === '2026-10-11'), await pg.evaluate(() => JSON.stringify(COB.res && COB.res.rango)));
  let A = await planA(pg);
  for (const iso of [VIE, SAB]) {
    const c = A && A.casillas[`${iso}|PASARELA_T`];
    const ml = c && c.filas.find(f => f.pid === 'mariluz');
    ok(`${iso.slice(8)}: el plan A enseña a Mari Luz «ya estaba · cubre a Iván · ABRE»`, !!ml && ml.relevo && /ya estaba/.test(ml.texto) && /cubre a Iván/.test(ml.texto) && /ABRE/.test(ml.texto), JSON.stringify(c));
    ok(`${iso.slice(8)}: sin aviso (su partido del viernes y el sábado está declarado)`, !!ml && !ml.aviso);
    ok(`${iso.slice(8)}: la columna de Iván dice quién se queda: «quedan Mari Luz y Leo, 2 de 3»`, !!c && /quedan Mari Luz y Leo, 2 de 3/.test(c.sale), c && c.sale);
    const otro = c && c.filas.find(f => !f.relevo);
    ok(`${iso.slice(8)}: y entra una persona más «para llegar al mínimo (había 2 de 3)», no «cubre a Iván»`, !!otro && /para llegar al mínimo \(había 2 de 3\)/.test(otro.texto) && !/cubre a Iván/.test(otro.texto), JSON.stringify(c && c.filas));
  }
  const d = A && A.casillas[`${DOM}|PASARELA_T`];
  ok('el domingo no sale Mari Luz (hace la mañana por Lola y «nunca con» Lavinia)', !!d && !d.filas.some(f => f.pid === 'mariluz'), JSON.stringify(d));
  ok('«Entran» no cuenta a Mari Luz: no es una plaza nueva', !!A && A.entran.length > 0 && !A.entran.some(x => /Mari Luz/.test(x)), JSON.stringify(A && A.entran));

  // ══ 3) el plan viejo no se queda en pantalla ══
  console.log('── 3) Cambiar la ficha deja el plan viejo sin validez (también Ctrl+Z)');
  await abrirFicha(pg, 'mariluz');
  await clic(pg, '#fichaOvl [data-rmcubre="0"]');
  ok('se le quita «Cubre a» Iván', await pg.evaluate(() => !(personaDeId('mariluz').cubreA || []).length));
  await cerrarFicha(pg);
  await vista(pg, 'cobertura');
  const caduco = () => pg.evaluate(() => { const c = document.querySelector('#cobRes #cobCaduco'); return !!c && /La ficha ha cambiado: vuelve a buscar/.test(c.textContent) && !document.querySelector('#cobRes .cobplan'); });
  ok('al volver a Cobertura: «La ficha ha cambiado: vuelve a buscar», sin el plan viejo', await caduco(), await pg.evaluate(() => document.querySelector('#cobRes') && document.querySelector('#cobRes').textContent.slice(0, 200)));
  await pg.click('body', { position: { x: 5, y: 5 } }).catch(() => {});
  await pg.keyboard.press('Control+z');
  ok('Ctrl+Z le devuelve «Cubre a» Iván', await llega(pg, () => (personaDeId('mariluz').cubreA || []).some(c => c.pid === 'ivan'), null, 3000) >= 0);
  ok('y el aviso sigue ahí hasta volver a buscar', await caduco());
  await clic(pg, '#cobRes #cobRebuscar');
  ok('«Buscar otra vez» vuelve a proponer, otra vez con Mari Luz de relevo', await llega(pg, () => { const P = document.querySelector('#cobRes .cobplan.reco'); return !!P && !!P.querySelector('.cobrow.relevo[data-pid="mariluz"]'); }, null, 8000) >= 0);
  await pg.click('body', { position: { x: 5, y: 5 } }).catch(() => {});
  await pg.keyboard.press('Control+z');   // deshace «cubre a Iván»: el plan en pantalla ya no vale
  ok('Ctrl+Z con un plan en pantalla también lo deja sin validez', await llega(pg, () => { const c = document.querySelector('#cobRes #cobCaduco'); return !!c && !document.querySelector('#cobRes .cobplan'); }, null, 3000) >= 0);
  // se vuelve a poner «Cubre a» Iván para confirmar
  await abrirFicha(pg, 'mariluz');
  await pg.selectOption('#fichaOvl #fCubreP', 'ivan');
  await clic(pg, '#fichaOvl [data-addcubre]');
  await cerrarFicha(pg);
  ok('vuelta a buscar con Mari Luz «Cubre a» Iván', await buscarIvan(pg) >= 0 && !!(await pg.$('#cobRes .cobplan.reco .cobrow.relevo[data-pid="mariluz"]')));

  // ══ 4) confirmar el plan A ══
  console.log('── 4) Confirmar el plan A: la planilla enseña a Mari Luz «por Iván»');
  await clic(pg, '#cobRes .cobplan.reco [data-aplicar="A"]');
  ok('la vista previa dice que Mari Luz ya estaba (no entra nueva)', await llega(pg, () => { const o = document.querySelector('#previaCobOvl'); return !!o && /Mari Luz/.test(o.textContent) && /ya estaba/.test(o.textContent); }, null, 4000) >= 0, await pg.evaluate(() => (document.querySelector('#previaCobOvl') || {}).textContent));
  await clic(pg, '#previaCobOvl #pvOk');
  ok('queda aplicado', await llega(pg, () => !!document.querySelector('#cobRes .cobok'), null, 5000) >= 0);
  const estado = await pg.evaluate(([v]) => asignados(estadoDeIso(v), v, 'PASARELA_T').map(x => ({ pid: x.pid, por: x.por || null })), [VIE]);
  ok('viernes: Iván sale y Mari Luz sigue una sola vez, ahora «por Iván»', !estado.some(x => x.pid === 'ivan') && estado.filter(x => x.pid === 'mariluz').length === 1 && estado.find(x => x.pid === 'mariluz').por === 'ivan', JSON.stringify(estado));
  ok('Iván queda de vacaciones del 2 al 4 en su ficha', await pg.evaluate(() => ['2026-10-02', '2026-10-03', '2026-10-04'].every(iso => { const a = ausenciaEn(personaDeId('ivan'), iso); return a && a.tipo === 'VAC'; })));
  await clic(pg, `#cobRes [data-irdia="${VIE}"]`);
  ok('«Ver el día en la planilla» lleva al viernes 2 en Hoy', await llega(pg, v => typeof isoDia === 'function' && isoDia() === v && !document.getElementById('view-hoy').classList.contains('hidden'), VIE, 4000) >= 0);
  const cas = await pg.evaluate(k => { const c = document.querySelector(`[data-cas="${k}"]`); return c ? c.textContent.replace(/\s+/g, ' ') : ''; }, `${VIE}|PASARELA_T`);
  ok('la casilla de la tarde de Pasarela enseña a Mari Luz «por Iván»', /Mari Luz/.test(cas) && /por Iván/.test(cas), cas);

  // ══ 5) la ficha enseña y deja cambiar «solo hace cocina» (S34) ══
  console.log('── 5) Ficha de Hojan: «Solo hace cocina» en la sección Cocina');
  await abrirFicha(pg, 'hojan');
  ok('la sección Cocina enseña «Solo hace cocina», marcado', await pg.evaluate(() => { const i = document.querySelector('#fichaOvl input[data-chk="soloCocina"]'); return !!i && i.checked; }));
  await clic(pg, '#fichaOvl input[data-chk="soloCocina"]');
  ok('desmarcarlo lo quita de la ficha', await pg.evaluate(() => !personaDeId('hojan').soloCocina));
  await clic(pg, '#fichaOvl input[data-chk="soloCocina"]');
  ok('y marcarlo lo vuelve a poner', await pg.evaluate(() => personaDeId('hojan').soloCocina === true));
  await cerrarFicha(pg);

  ok('ningún error de página en toda la batería', !errores.length, errores.join(' | '));
} catch (e) {
  ok('la batería no se interrumpe', false, e && e.stack ? e.stack.split('\n').slice(0, 4).join(' | ') : e);
} finally {
  await br.close();
  srv.close();
}
resumen();
