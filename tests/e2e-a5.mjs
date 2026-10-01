// LA COBERTURA TRAS LA FASE A5 DE LA AUDITORÍA (01/10), CON CLICS:
//  1) «solo desde hoy»: Susana Luna de baja desde el 14/09 (hoy, 24/09): la tira y el resultado dicen que lo pasado no se
//     cubre, el plan no mete a nadie en días ya trabajados, y al confirmar Roberto y Cristian siguen igual en ellos (F1);
//  2) el turno a cambio de un cambio de turno que deja corta la otra casilla se propone con su aviso (F2);
//  3) un cambio de turno no usa «cubre a»: ni «tiene quien le cubra», ni «ya estaba · cubre a Iván», sino «cambio con Iván» (F3, D17);
//  4) al volver Iván, regenerar retira lo que entró por su ausencia, también quien entró para llegar al mínimo (F4);
//  5) con más días marcados que el tope, la pestaña dice hasta dónde mira (F5);
//  6) una casilla cerrada ese día: «cerrada ese día: nada que cubrir», también con «Reemplazar siempre» (F6);
//  7) en el plan, quien entra «por Noe» lo dice: «cubre a Noe» (revisión de cliente de A4, C11);
//  8) quien está en standby no «le cubre» en Equipo, en la ficha ni en la Cobertura, y la Cobertura dice por qué (sospecha F);
// y lo arreglado tras las dos revisiones de la fase (01/10, «corrección»; M-Hx modelo, C-Hx / C-Sx cliente):
//  9) a las 20:00 la mañana de hoy ya está trabajada: no entra nadie, la fila de días y el botón lo cuentan aparte (C-H1, C-H10);
// 10) a las 22:30 el turno a cambio no es la tarde de hoy (C-H1);
// 11) un cambio de turno sin turno a cambio lo dice, y el plan no sale «cubre todo» a secas; la vista previa y lo aplicado hablan
//     de «cambio» y repiten el aviso (C-H2, C-H3, C-H9);
// 12) un cambio de turno de un día pasado: «ya pasado: no se cambia nada» (C-H8, M-H2);
// 13) la vista previa enseña los días pasados de los que sale; «Registrar la ausencia» dice que sale de sus turnos (C-H4, C-H11);
// 14) quien cubre en standby: su tarjeta y su ficha lo dicen (C-H6);
// 15) al quitar la ausencia, el aviso y la Revisión dicen qué pasa con quien entró por él (C-H12);
// 16) un día marcado lejano (el 31/12) se mira (M-H3); la cabecera agrupa los días en tramos; «vacaciones registradas»;
// 17) en el móvil, la «×» no tapa la fila de días y la ✓ no pisa el nombre del día.
// El reloj de la página se fija en el jueves 24/09/2026 (10:00, o la hora que diga la sección). E2E_RAIZ permite pasar la batería
// por otra copia de la app.
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
const errores = [], dialogos = [];
const j = x => JSON.stringify(x);
const HOY = '2026-09-24', V2 = '2026-10-02', S3 = '2026-10-03', D4 = '2026-10-04', M6 = '2026-10-06';

async function pagina(etiqueta, o = {}) {
  const ctx = await br.newContext(o.movil ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 900 } });
  await ctx.clock.setFixedTime(new Date(o.reloj || '2026-09-24T10:00:00+02:00'));
  await ctx.addInitScript(() => { try { sessionStorage.setItem('shiftia_pas_sesion', '1'); sessionStorage.setItem('shiftia_pas_rol', 'admin'); } catch (e) {} });
  const pg = await ctx.newPage();
  pg.on('pageerror', e => errores.push(`${etiqueta}: ${e.message}`));
  pg.on('dialog', d => { dialogos.push(d.message()); d.accept().catch(() => {}); });
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
const vista = async (pg, v) => { if (!await pg.evaluate(v => { const t = document.querySelector(`.tab[data-v="${v}"]`); return !!(t && t.offsetParent); }, v)) await pg.evaluate(v => switchTab(v), v); else await pg.click(`.tab[data-v="${v}"]`); return llega(pg, v => { const s = document.getElementById('view-' + v); return !!s && !s.classList.contains('hidden'); }, v, 4000); };
// los turnos de alguien entre dos fechas, en la planilla real («iso|turno»)
const turnos = (pg, pid, desde, hasta) => pg.evaluate(([pid, desde, hasta]) => [...rangoIso(desde, hasta)].flatMap(iso => turnosDe(S).filter(t => pidsEn(estadoDeIso(iso), iso, t.id).includes(pid)).map(t => iso + '|' + t.id)), [pid, desde, hasta]);
// Cobertura → persona → tipo → los días (navegando la tira hasta que se vean) → «Buscar quién cubre»
async function buscar(pg, pid, tipo, dias, opts) {
  const o = opts || {};
  await vista(pg, 'cobertura');
  await clic(pg, `#cobRoot .cobpk[data-pk="${pid}"]`);
  await clic(pg, `#cobRoot [data-tipo="${tipo}"]`);
  for (const iso of dias) {
    for (let i = 0; i < 6 && !await pg.$(`#cobRoot .cobdia[data-dia="${iso}"]`); i++) await clic(pg, `#cobRoot [data-cobnav="${iso < await pg.evaluate(() => COB.base) ? -7 : 7}"]`);
    if (!await pg.evaluate(i => COB.dias.includes(i), iso)) await clic(pg, `#cobRoot .cobdia[data-dia="${iso}"]`);
  }
  if (o.siempre && !await pg.evaluate(() => COB.siempre)) await clic(pg, '#cobRoot #cobSiempre');
  if (o.antes) await o.antes();
  await clic(pg, '#cobRoot #cobProponer');
  return llega(pg, () => !!document.querySelector('#cobRes .cobcard'), null, 15000);
}
// las filas de los planes: por plan, sus casillas con lo que dice cada fila
const planes = pg => pg.evaluate(() => [...document.querySelectorAll('#cobRes .cobplan')].map(P => ({
  reco: P.classList.contains('reco'),
  texto: P.textContent.replace(/\s+/g, ' '),
  casillas: [...P.querySelectorAll('.cobmv[data-cas]')].map(mv => ({ cas: mv.dataset.cas, filas: [...mv.querySelectorAll('.cobentra .cobrow')].map(r => ({ pid: r.dataset.pid || null, relevo: r.classList.contains('relevo'), texto: r.textContent.replace(/\s+/g, ' ').trim() })) })),
})));
async function confirmar(pg, id) {
  await clic(pg, `#cobRes [data-aplicar="${id}"]`);
  await llega(pg, () => !!document.querySelector('#previaCobOvl #pvOk'), null, 4000);
  await clic(pg, '#previaCobOvl #pvOk');
  return llega(pg, () => !!document.querySelector('#cobRes .cobok'), null, 5000);
}

try {
  // ══ 1) «solo desde hoy» ══
  console.log('── 1) Susana Luna de baja del 14 al 27/09 (hoy, jueves 24): lo pasado no se cubre');
  {
    const pg = await pagina('desdehoy');
    await seccion('desde hoy', async () => {
      const rob0 = await turnos(pg, 'roberto', '2026-09-01', '2026-09-23'), cri0 = await turnos(pg, 'cristian', '2026-09-01', '2026-09-23');
      const sl0 = await turnos(pg, 'sluna', '2026-09-14', '2026-09-27');
      ok('preparado: Susana Luna tiene turnos antes y después de hoy', sl0.some(k => k < HOY) && sl0.some(k => k >= HOY), j(sl0));
      await vista(pg, 'cobertura');
      await clic(pg, '#cobRoot .cobpk[data-pk="sluna"]');
      await clic(pg, '#cobRoot [data-tipo="BAJ"]');
      await clic(pg, '#cobRoot [data-cobnav="-7"]');
      await clic(pg, '#cobRoot [data-cobsel="semana"]');
      await clic(pg, '#cobRoot [data-cobnav="7"]');
      await clic(pg, '#cobRoot [data-cobsel="semana"]');
      ok('marcados del 14 al 27/09', await pg.evaluate(() => COB.dias.length === 14 && COB.dias[0] === '2026-09-14' && COB.dias[13] === '2026-09-27'), await pg.evaluate(() => JSON.stringify(COB.dias)));
      const nota = await txt(pg, '#cobRoot .cobpasnota');
      ok('la tira dice que lo ya pasado se apunta pero no se cubre', /ya han pasado: se apuntan en su ficha y sale de esos turnos, pero no se cubren: nadie entra en días ya trabajados/.test(nota || ''), nota);
      await clic(pg, '#cobRoot #cobProponer');
      ok('sale la propuesta', await llega(pg, () => !!document.querySelector('#cobRes .cobplan'), null, 15000) >= 0);
      const ps = await planes(pg);
      const casPasadas = ps.flatMap(P => P.casillas.map(c => c.cas)).filter(c => c < HOY);
      ok('ningún plan enseña casillas de días ya trabajados', ps.length && !casPasadas.length, j(casPasadas));
      const aviso = await txt(pg, '#cobRes .cobpasados');
      ok('el resultado dice cuántos turnos ya han pasado y que en ellos no entra nadie', /^(\d+) turnos que ya han pasado/.test(aviso || '') && /sale de esos turnos y se apunta en su ficha, pero no entra nadie/.test(aviso || ''), aviso);
      ok('preparado: el plan A cubre algún turno desde hoy', ps[0] && ps[0].casillas.some(c => c.filas.length), j(ps[0] && ps[0].casillas));
      ok('se confirma el plan A', await confirmar(pg, 'A') >= 0);
      ok('Roberto y Cristian, igual en los días ya trabajados', j(await turnos(pg, 'roberto', '2026-09-01', '2026-09-23')) === j(rob0) && j(await turnos(pg, 'cristian', '2026-09-01', '2026-09-23')) === j(cri0));
      ok('Susana Luna sale de todos sus turnos de la baja (también de los ya pasados)', !(await turnos(pg, 'sluna', '2026-09-14', '2026-09-27')).length);
      const apl = await txt(pg, '#cobRes .cobok');
      ok('lo aplicado dice los turnos ya pasados, sin cubrir', /\d+ turnos ya pasados, sin cubrir/.test(apl || ''), apl);
      ok('la baja está en su ficha desde el 14', await pg.evaluate(() => !!ausenciaEn(personaDeId('sluna'), '2026-09-14', 'T') && !!ausenciaEn(personaDeId('sluna'), '2026-09-27', 'T')));
    });
    await pg.context().close();
  }

  // ══ 2) el turno a cambio que deja corta la otra casilla, con su aviso ══
  console.log('── 2) Cristian cambia el martes 6/10; Susana Luna le cubre y a cambio Cristian haría su sábado (con Leo: dos apoyos que no abren)');
  {
    const pg = await pagina('intercambio');
    await seccion('intercambio', async () => {
      await pg.evaluate(() => {
        for (const iso of rangoIso('2026-09-28', '2026-10-18')) { const e = estadoDeIso(iso, true); for (const tid of Object.keys(e.asig[iso] || {})) delete e.asig[iso][tid]; if (e.manual) delete e.manual[iso]; }
        for (const [d, id, c] of [['2026-10-06', 'cristian'], ['2026-10-06', 'adrian', 1], ['2026-10-10', 'sluna'], ['2026-10-10', 'leo']]) asignar(estadoDeIso(d, true), S, S.staff, d, 'ZAPA_T', id, { cocina: !!c });
        saveState();
      });
      ok('se busca', await buscar(pg, 'cristian', 'CAMBIO', [M6], { siempre: true }) >= 0);
      const ps = await planes(pg);
      const fila = ps.flatMap(P => P.casillas.flatMap(c => c.filas)).find(f => f.pid === 'sluna' && /a cambio/.test(f.texto));
      ok('Susana Luna le cubre con su sábado a cambio', !!fila, j(ps.map(P => P.texto)));
      ok('y el plan avisa de cómo se queda ese sábado', !!fila && /aviso: ese turno de Susana L\.? se queda sin nadie que abra y solo con apoyos/.test(fila.texto), fila && fila.texto);
    });
    await pg.context().close();
  }

  // ══ 3) un cambio de turno no usa «cubre a» ══
  console.log('── 3) Iván cambia el viernes 2 (Mari Luz le cubre «siempre que falte» y ya está en su tarde; Dulce ya en activo)');
  {
    const pg = await pagina('cambio');
    await seccion('cambio', async () => {
      await pg.evaluate(() => { personaDeId('mariluz').cubreA = [{ pid: 'ivan' }]; delete personaDeId('dulce').standby; saveState(); });
      ok('se busca', await buscar(pg, 'ivan', 'CAMBIO', [V2]) >= 0);
      const res = await txt(pg, '#cobRes');
      ok('no dice que Iván «tiene quien le cubra»', !!res && !/tiene quien le cubra/.test(res), res);
      ok('ni «cubre a Iván», ni «ya estaba», ni el partido «para cubrir a Iván»', !!res && !/cubre a Iván|ya estaba|para cubrir a Iván/.test(res), res);
      ok('quien entra, «cambio con Iván»', /cambio con Iván/.test(res || ''), res);
    });
    await pg.context().close();
  }

  // ══ 4) al volver Iván, se retira lo que entró por él ══
  console.log('── 4) Iván de vacaciones del 2 al 4/10 por la tarde con la Cobertura; se quitan sus vacaciones y se regenera la semana');
  {
    const pg = await pagina('vuelve');
    await seccion('vuelve', async () => {
      await pg.evaluate(() => { personaDeId('mariluz').cubreA = [{ pid: 'ivan' }]; delete personaDeId('dulce').standby; saveState(); });
      ok('se busca', await buscar(pg, 'ivan', 'VAC', [V2, S3, D4]) >= 0);
      ok('se confirma el plan A', await confirmar(pg, 'A') >= 0);
      const puestos = await pg.evaluate(() => ['2026-10-02', '2026-10-03', '2026-10-04'].flatMap(iso => asignados(estadoDeIso(iso), iso, 'PASARELA_T').filter(x => x.porAusenciaDe === 'ivan').map(x => iso + ' ' + x.pid)));
      ok('lo que entró por Iván lleva la marca (también quien entró para llegar al mínimo)', puestos.length >= 2, j(puestos));
      await pg.evaluate(() => { personaDeId('ivan').ausencias = []; saveState(); });
      await vista(pg, 'generador');
      if (await pg.evaluate(() => GEN.modo !== 'semana')) await clic(pg, '[data-modo="semana"]');
      for (let i = 0; i < 10 && await pg.evaluate(() => GEN.lunes < '2026-09-28'); i++) await clic(pg, '#gsNext');
      await clic(pg, '#genPrevia');
      ok('se genera la vista previa', await llega(pg, () => !!(GEN.previa && GEN.previa.semana), null, 15000) >= 0);
      const lista = await txt(pg, '#genRoot .gretlist');
      const nombres = await pg.evaluate(xs => [...new Set(xs.map(x => nombrePid(x.split(' ')[1])))], puestos);
      ok('«Se retira» lista a quien entró por Iván: «Iván ya no falta…»', nombres.length && nombres.every(n => new RegExp(`${n} · Iván ya no falta`).test(lista || '')), j(nombres) + ' → ' + lista);
      // (corrección, C-H13) una línea por persona y motivo, con sus días: «Dulce · Iván ya no falta: … — vie 2 y sáb 3 tarde en Pasarela»
      const lineas = await pg.$$eval('#genRoot .gretlist li', xs => xs.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
      ok('una línea por persona, con los días juntos (sin «el viernes 2» en el motivo)', nombres.every(n => lineas.filter(l => l.startsWith(n + ' · Iván ya no falta')).length === 1) && lineas.some(l => /^Dulce · Iván ya no falta: ya no hay que cubrir su sitio — vie 2 y sáb 3 tarde en Pasarela$/.test(l)), j(lineas));
      await clic(pg, '#genAplicar');
      await llega(pg, () => !GEN.previa, null, 5000);
      const quedan = await pg.evaluate(() => ['2026-10-02', '2026-10-03', '2026-10-04'].flatMap(iso => asignados(estadoDeIso(iso), iso, 'PASARELA_T').filter(x => x.porAusenciaDe).map(x => iso + ' ' + x.pid)));
      ok('al volcar ya no queda nadie «por la ausencia de Iván»', !quedan.length, j(quedan));
      ok('e Iván vuelve a su tarde del viernes', await pg.evaluate(() => pidsEn(estadoDeIso('2026-10-02'), '2026-10-02', 'PASARELA_T').includes('ivan')));
    });
    await pg.context().close();
  }

  // ══ 5) el tope de días marcados ══
  console.log('── 5) Laura (de baja), 70 días marcados: la pestaña dice que solo mira los 62 primeros');
  {
    const pg = await pagina('tope');
    await seccion('tope', async () => {
      await vista(pg, 'cobertura');
      await pg.evaluate(() => { const dias = []; for (let k = 0; k < 70; k++) dias.push(addDias('2026-09-28', k)); irACobertura({ pid: 'laura', tipo: 'VAC', dias }); });
      await clic(pg, '#cobRoot #cobProponer');
      ok('sale el resultado', await llega(pg, () => !!document.querySelector('#cobRes .cobcard'), null, 30000) >= 0);
      const t = await txt(pg, '#cobRes .cobtrunc');
      ok('«Hay 70 días marcados: solo se miran los 62 primeros (hasta el 28/11)»', /Hay 70 días marcados: solo se miran los 62 primeros \(hasta el 28\/11\)/.test(t || ''), t);
    });
    await pg.context().close();
  }

  // ══ 6) casilla cerrada ese día ══
  console.log('── 6) El Mónaco cerrado a mano la tarde del martes 29 con Cristian dentro: Cristian libra ese día');
  {
    const pg = await pagina('cerrada');
    await seccion('cerrada', async () => {
      await pg.evaluate(() => { const e = estadoDeIso('2026-09-29', true); e.apertura['2026-09-29'] = Object.assign({}, e.apertura['2026-09-29'], { MONACO_T: false }); saveState(); });
      ok('preparado: Cristian sigue en el Mónaco esa tarde', await pg.evaluate(() => pidsEn(estadoDeIso('2026-09-29'), '2026-09-29', 'MONACO_T').includes('cristian')));
      for (const siempre of [false, true]) {
        ok('se busca' + (siempre ? ' con «Reemplazar siempre»' : ''), await buscar(pg, 'cristian', 'LD', ['2026-09-29'], { siempre }) >= 0);
        const ps = await planes(pg);
        const mv = ps.length ? await txt(pg, '#cobRes .cobplan.reco .cobmv[data-cas="2026-09-29|MONACO_T"]') : null;
        ok('la casilla dice «cerrada ese día: nada que cubrir»' + (siempre ? ' (también con «siempre»)' : ''), /cerrada ese día: nada que cubrir/.test(mv || ''), mv);
      }
    });
    await pg.context().close();
  }

  // ══ 7) «cubre a Noe» ══
  console.log('── 7) Leo y Victoria cubren a Noe; fiesta con refuerzo en El 33 el martes 6 por la tarde; Noe de permiso');
  {
    const pg = await pagina('cubreanoe');
    await seccion('cubre a Noe', async () => {
      await pg.evaluate(() => { for (const id of ['leo', 'victoria']) personaDeId(id).cubreA = [{ pid: 'noe' }]; (S.eventos = S.eventos || []).push({ id: 'ev_e2e_a5', iso: '2026-10-06', nombre: 'Fiesta del barrio', franja: 'T', refuerzo: { EL33: 1 } }); saveState(); });
      ok('se busca', await buscar(pg, 'noe', 'PERM', [M6]) >= 0);
      const ps = await planes(pg);
      const cas = ps.length ? ps[0].casillas.find(c => c.cas === `${M6}|EL33_T`) : null;
      const vic = cas && cas.filas.find(f => f.pid === 'victoria'), leo = cas && cas.filas.find(f => f.pid === 'leo');
      // (corrección, C-S1) Victoria tiene «Cubre a» Noe, pero Noe llevaba la cocina y ella entra de sala: entra «por Noe»
      ok('Victoria entra en lugar de Noe y lo dice: «por Noe»', !!vic && /por Noe/.test(vic.texto) && !/cubre a Noe/.test(vic.texto), cas && j(cas.filas));
      ok('y Leo entra «para llegar al mínimo»', !!leo && /para llegar al mínimo \(había 1 de 2\)/.test(leo.texto) && !/(cubre a|por) Noe/.test(leo.texto), cas && j(cas.filas));
      const man = ps.length ? ps[0].casillas.find(c => c.cas === `${M6}|EL33_M`) : null;
      const cri = man && man.filas.find(f => f.pid === 'cristian');
      ok('Cristian, sin la designación, tampoco «cubre a Noe»: «por Noe» (C-S1)', !!cri && /por Noe/.test(cri.texto) && !/cubre a Noe/.test(cri.texto), man && j(man.filas));
      ok('debajo de «Noe tiene quien le cubra: Leo y Victoria»', /Noe tiene quien le cubra: Leo y Victoria/.test(await txt(pg, '#cobRes .cobdesig') || ''), await txt(pg, '#cobRes .cobdesig'));
      ok('se confirma el plan A', await confirmar(pg, 'A') >= 0);
      ok('y la planilla dice lo mismo: «por Noe»', await pg.evaluate(d => ['victoria', 'cristian'].every(pid => turnosDe(S).some(t => asignados(estadoDeIso(d), d, t.id).some(e => e.pid === pid && e.razon === 'por Noe'))), M6));
    });
    await pg.context().close();
  }

  // ══ 8) quien está en standby no le cubre ══
  console.log('── 8) Dulce (en standby) tiene «Cubre a» Iván');
  {
    const pg = await pagina('standby');
    await seccion('standby', async () => {
      await pg.evaluate(() => { personaDeId('dulce').cubreA = [{ pid: 'ivan' }]; saveState(); });
      await vista(pg, 'equipo');
      await pg.waitForSelector('#equipoRoot [data-pcard="ivan"]', { timeout: 8000 }).catch(() => null);
      const card = await txt(pg, '#equipoRoot [data-pcard="ivan"]');
      ok('la tarjeta de Iván: «Si falta, le cubre Dulce · está en standby»', /Si falta, le cubre\s*Dulce · está en standby/.test(card || ''), card);
      await clic(pg, '#equipoRoot [data-pcard="ivan"] .pmini');
      await pg.waitForSelector('#fichaOvl [data-lecubre]', { timeout: 5000 }).catch(() => null);
      const fic = await txt(pg, '#fichaOvl [data-lecubre]');
      ok('su ficha: «Dulce (está en standby: ahora no le cubre)»', /Dulce \(está en standby: ahora no le cubre\)/.test(fic || ''), fic);
      await clic(pg, '#fichaOvl [data-ovx]');
      ok('se busca', await buscar(pg, 'ivan', 'VAC', [V2]) >= 0);
      const res = await txt(pg, '#cobRes');
      // (corrección, C-H5) la Cobertura sí la nombra, y dice por qué ahora no le cubre
      ok('y la Cobertura dice «Iván tiene quien le cubra: Dulce (en standby: ahora no cubre)»', /Iván tiene quien le cubra: Dulce \(en standby: ahora no cubre\)/.test(res || ''), res);
      ok('sin ponerla a cubrir en el plan', !(await planes(pg)).some(P => P.casillas.some(c => c.filas.some(f => f.pid === 'dulce'))));
    });
    await pg.context().close();
  }

  // ══════ corrección tras las dos revisiones (01/10) ══════
  // ══ 9) a las 20:00 la mañana de hoy ya está trabajada ══
  console.log('── 9) jueves 24 a las 20:00: Lola de baja del 22 al 25 (su mañana de hoy, de 7:00 a 16:00, ya trabajada)');
  {
    const pg = await pagina('noche', { reloj: '2026-09-24T20:00:00+02:00' });
    await seccion('noche', async () => {
      const rob0 = await turnos(pg, 'roberto', HOY, HOY), hoyM0 = await pg.evaluate(d => pidsEn(estadoDeIso(d), d, 'PASARELA_M'), HOY);
      ok('preparado: Lola tiene la mañana de hoy', hoyM0.includes('lola'), j(hoyM0));
      let tira = null, boton = null, dia22 = null;
      ok('se busca', await buscar(pg, 'lola', 'BAJ', ['2026-09-22', '2026-09-23', HOY, '2026-09-25'], { antes: async () => {
        tira = await txt(pg, '#cobRoot .cobpasnota'); boton = await txt(pg, '#cobRoot #cobProponer');
        dia22 = await ev(pg, '#cobRoot .cobdia[data-dia="2026-09-22"]', x => ({ cls: x.className, t: x.textContent.replace(/\s+/g, ' ') }));
      } }) >= 0);
      ok('la fila de días: el 22 se ve como «ya pasado» (C-H10)', !!dia22 && /\bpasado\b/.test(dia22.cls) && /ya pasado/.test(dia22.t), j(dia22));
      ok('la nota nombra los días pasados y dice que la mañana de hoy ya ha terminado', /del 22\/9 al 23\/9 ya han pasado/i.test(tira || '') && /hoy, la mañana ya ha terminado/i.test(tira || ''), tira);
      ok('el botón cuenta lo que queda desde ahora y aparte lo ya pasado: «(1 turno) · + 3 ya pasados»', /\(1 turno\)/.test(boton || '') && /\+ 3 ya pasados/.test(boton || ''), boton);
      const ps = await planes(pg);
      ok('ningún plan enseña la mañana de hoy', ps.length && !ps.some(P => P.casillas.some(c => c.cas === `${HOY}|PASARELA_M`)), j(ps.map(P => P.casillas.map(c => c.cas))));
      ok('el resultado cuenta 3 turnos ya pasados (del 22/9 al 24/9)', /3 turnos que ya han pasado \(del 22\/9 al 24\/9\)/.test(await txt(pg, '#cobRes .cobpasados') || ''), await txt(pg, '#cobRes .cobpasados'));
      ok('se confirma el plan A', await confirmar(pg, 'A') >= 0);
      const hoyM = await pg.evaluate(d => pidsEn(estadoDeIso(d), d, 'PASARELA_M'), HOY);
      ok('en la mañana de hoy no entra nadie; Lola sale (estaba de baja)', j(hoyM) === j(hoyM0.filter(x => x !== 'lola')), j(hoyM));
      ok('Roberto, igual hoy', j(await turnos(pg, 'roberto', HOY, HOY)) === j(rob0));
    });
    await pg.context().close();
  }

  // ══ 10) a las 22:30 el turno a cambio no es la tarde de hoy ══
  console.log('── 10) jueves 24 a las 22:30: cambio de turno de Victoria el sábado 26');
  {
    const pg = await pagina('2230', { reloj: '2026-09-24T22:30:00+02:00' });
    await seccion('2230', async () => {
      ok('se busca', await buscar(pg, 'victoria', 'CAMBIO', ['2026-09-26']) >= 0);
      const res = await txt(pg, '#cobRes');
      ok('ningún turno a cambio es de hoy (la tarde de Noe ya ha empezado)', !!res && !/hace jue 24/i.test(res), res);
    });
    await pg.context().close();
  }

  // ══ 11) cambio de turno sin turno a cambio, y con el aviso del intercambio ══
  console.log('── 11) cambio de turno de Susana Luna el martes 29: no hay turno a cambio; y el de Cristian del martes 6 con aviso');
  {
    const pg = await pagina('sinintercambio');
    await seccion('sin turno a cambio', async () => {
      ok('se busca', await buscar(pg, 'sluna', 'CAMBIO', ['2026-09-29']) >= 0);
      const ps = await planes(pg);
      const fila = ps.length ? ps[0].casillas.flatMap(c => c.filas).find(f => /cambio con Susana Luna/.test(f.texto)) : null;
      ok('la fila dice «sin turno a cambio: Susana Luna se queda sin ese turno»', !!fila && /sin turno a cambio: Susana Luna se queda sin ese turno/.test(fila.texto), fila && fila.texto);
      ok('y lleva «!»', await pg.evaluate(pid => !!document.querySelector(`#cobRes .cobplan.reco .cobrow[data-pid="${pid}"] .bdg.forz`), fila && fila.pid));
      const est = await txt(pg, '#cobRes .cobplan.reco .cobph .evst');
      ok('el plan no sale «cubre todo» a secas', !!est && est !== 'cubre todo', est);
      await clic(pg, '#cobRes [data-aplicar="A"]');
      await llega(pg, () => !!document.querySelector('#previaCobOvl #pvOk'), null, 4000);
      const pv = await txt(pg, '#previaCobOvl');
      ok('la vista previa habla de cambio, no de cubrir, y repite el aviso (C-H9, C-H2)', !!pv && /que cambia/.test(pv) && !/cubre|Entra a cubrir/i.test(pv) && /sin turno a cambio: Susana Luna se queda sin ese turno/.test(pv), pv);
      await clic(pg, '#previaCobOvl #pvOk');
      await llega(pg, () => !!document.querySelector('#cobRes .cobok'), null, 5000);
      const apl = await txt(pg, '#cobRes .cobok');
      ok('lo aplicado: «cambiado» y el aviso', !!apl && /cambiado/.test(apl) && !/cubierto/.test(apl) && /sin turno a cambio: Susana Luna se queda sin ese turno/.test(apl), apl);
      const h = await pg.evaluate(() => S.historial[0].txt);
      ok('y el historial lo apunta', /cambiado/.test(h) && /sin turno a cambio: Susana Luna se queda sin ese turno/.test(h), h);
    });
    await pg.context().close();
    const pg2 = await pagina('aviso');
    await seccion('aviso del intercambio', async () => {
      await pg2.evaluate(() => {
        for (const iso of rangoIso('2026-09-28', '2026-10-18')) { const e = estadoDeIso(iso, true); for (const tid of Object.keys(e.asig[iso] || {})) delete e.asig[iso][tid]; if (e.manual) delete e.manual[iso]; }
        for (const [d, id, c] of [['2026-10-06', 'cristian'], ['2026-10-06', 'adrian', 1], ['2026-10-10', 'sluna'], ['2026-10-10', 'leo']]) asignar(estadoDeIso(d, true), S, S.staff, d, 'ZAPA_T', id, { cocina: !!c });
        saveState();
      });
      ok('se busca', await buscar(pg2, 'cristian', 'CAMBIO', [M6], { siempre: true }) >= 0);
      const est = await txt(pg2, '#cobRes .cobplan.reco .cobph .evst');
      ok('el plan con el aviso del turno a cambio: «cubre todo, con aviso»', est === 'cubre todo, con aviso', est);
      const estB = await txt(pg2, '#cobRes .cobplan:not(.reco) .cobph .evst'), filaB = await txt(pg2, '#cobRes .cobplan:not(.reco) .cobrow[data-pid="roberto"]');
      ok('y el plan B, el de Roberto sin turno a cambio, también: «cubre todo, con aviso» y «sin turno a cambio: Cristian se queda sin ese turno»', estB === 'cubre todo, con aviso' && /sin turno a cambio: Cristian se queda sin ese turno/.test(filaB || ''), estB + ' · ' + filaB);
      ok('la fila lleva «!»', await pg2.evaluate(() => !!document.querySelector('#cobRes .cobplan.reco .cobrow[data-pid="sluna"] .bdg.forz')));
      await clic(pg2, '#cobRes [data-aplicar="A"]');
      await llega(pg2, () => !!document.querySelector('#previaCobOvl #pvOk'), null, 4000);
      const pv = await txt(pg2, '#previaCobOvl');
      ok('la vista previa repite el aviso', /aviso: ese turno de Susana L\.? se queda sin nadie que abra y solo con apoyos/.test(pv || ''), pv);
      await clic(pg2, '#previaCobOvl #pvOk');
      await llega(pg2, () => !!document.querySelector('#cobRes .cobok'), null, 5000);
      const apl = await txt(pg2, '#cobRes .cobok');
      ok('y lo aplicado también', /aviso: ese turno de Susana L\.? se queda sin nadie que abra y solo con apoyos/.test(apl || ''), apl);
    });
    await pg2.context().close();
  }

  // ══ 12) cambio de turno de un día ya pasado ══
  console.log('── 12) cambio de turno de Juani el martes 22 (ya pasado)');
  {
    const pg = await pagina('cambiopasado');
    await seccion('cambio pasado', async () => {
      const j0 = await turnos(pg, 'juani', '2026-09-22', '2026-09-22');
      ok('preparado: Juani trabajó el 22', j0.length > 0, j(j0));
      let tira = null;
      ok('se busca', await buscar(pg, 'juani', 'CAMBIO', ['2026-09-22'], { antes: async () => { tira = await txt(pg, '#cobRoot .cobpasnota'); } }) >= 0);
      const res = await txt(pg, '#cobRes');
      ok('la fila de días: «ya ha pasado: no se cambia nada»', /ya ha pasado: no se cambia nada/.test(tira || ''), tira);
      ok('el resultado dice lo mismo, y no que Juani sale de ese turno', /ya pasado: no se cambia nada/i.test(res || '') && !/sale de ese turno/.test(res || ''), res);
      ok('Juani sigue en su turno del 22', j(await turnos(pg, 'juani', '2026-09-22', '2026-09-22')) === j(j0));
    });
    await pg.context().close();
  }

  // ══ 13) la vista previa y «Registrar la ausencia» con días pasados ══
  console.log('── 13) Iván de vacaciones del martes 22 al miércoles 30 (hoy, jueves 24)');
  {
    const pg = await pagina('previapasados');
    await seccion('previa con pasados', async () => {
      ok('se busca', await buscar(pg, 'ivan', 'VAC', [...['2026-09-22', '2026-09-23', HOY, '2026-09-25', '2026-09-26', '2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30']]) >= 0);
      const cab = await txt(pg, '#cobRes .cobres .micro');
      ok('la cabecera agrupa los días en tramos: «del mar 22/9 al mié 30/9»', /del mar 22\/9 al mié 30\/9/.test(cab || ''), cab);
      await clic(pg, '#cobRes [data-aplicar="A"]');
      await llega(pg, () => !!document.querySelector('#previaCobOvl #pvOk'), null, 4000);
      const pv = await txt(pg, '#previaCobOvl');
      ok('la vista previa: «Iván sale también del mar 22 y mié 23 (ya pasados: no entra nadie)»', /Iván sale también del mar 22 y mié 23 \(ya pasados: no entra nadie\)/.test(pv || ''), pv);
      await clic(pg, '#previaCobOvl [data-ovx]');
      dialogos.length = 0;
      await pg.evaluate(() => { COB.dias = []; COB.res = null; });
      ok('solo días pasados: se busca', await buscar(pg, 'ivan', 'VAC', ['2026-09-22', '2026-09-23']) >= 0);
      await clic(pg, '#cobRes #cobSoloAus');
      await llega(pg, () => !!document.querySelector('#cobRes .cobok'), null, 5000);
      ok('«Registrar la ausencia» dice que sale de sus turnos (C-H11)', dialogos.some(m => /se registra la ausencia y sale de sus 2 turnos de esos días \(ya pasados\); no entra nadie/.test(m)), j(dialogos));
      const apl = await txt(pg, '#cobRes .cobok h3');
      ok('«vacaciones registradas» (concordancia)', /Iván: vacaciones registradas en su ficha/.test(apl || ''), apl);
    });
    await pg.context().close();
  }

  // ══ 14) quien cubre, en standby: su tarjeta y su ficha ══
  console.log('── 14) Dulce (en standby) «Cubre a» Iván: su tarjeta y su ficha');
  {
    const pg = await pagina('standby2');
    await seccion('standby, lado de quien cubre', async () => {
      await pg.evaluate(() => { personaDeId('dulce').cubreA = [{ pid: 'ivan' }]; saveState(); });
      await vista(pg, 'equipo');
      await pg.waitForSelector('#equipoRoot [data-pcard="dulce"]', { timeout: 8000 }).catch(() => null);
      const card = await txt(pg, '#equipoRoot [data-pcard="dulce"]');
      ok('su tarjeta: «Cubre a Iván · está en standby»', /Cubre a\s*Iván · está en standby/.test(card || ''), card);
      ok('y apagada', await pg.evaluate(() => { const c = [...document.querySelectorAll('#equipoRoot [data-pcard="dulce"] .cubrea')].find(x => /Cubre a/.test(x.textContent)); return !!c && c.classList.contains('off'); }));
      await pg.evaluate(() => openFicha('dulce'));
      await pg.waitForSelector('#fichaOvl', { timeout: 5000 }).catch(() => null);
      const fic = await txt(pg, '#fichaOvl');
      ok('su ficha: «Cubre a Iván» … «está en standby: ahora no le cubre»', /Cubre a Iván[^]*está en standby: ahora no le cubre/.test(fic || ''), fic && fic.slice(0, 600));
    });
    await pg.context().close();
  }

  // ══ 15) al quitar la ausencia ══
  console.log('── 15) Iván de vacaciones del 2 al 4/10 con la Cobertura; se quitan sus vacaciones en la ficha');
  {
    const pg = await pagina('quitar');
    await seccion('quitar la ausencia', async () => {
      await pg.evaluate(() => { personaDeId('mariluz').cubreA = [{ pid: 'ivan' }]; delete personaDeId('dulce').standby; saveState(); });
      ok('se busca', await buscar(pg, 'ivan', 'VAC', [V2, S3, D4]) >= 0);
      ok('se confirma el plan A', await confirmar(pg, 'A') >= 0);
      await pg.evaluate(() => openFicha('ivan'));
      await pg.waitForSelector('#fichaOvl [data-rmaus]', { timeout: 5000 }).catch(() => null);
      const idx = await pg.evaluate(() => personaDeId('ivan').ausencias.findIndex(a => a.tipo === 'VAC' && a.desde === '2026-10-02'));
      ok('preparado: las vacaciones en su ficha', idx >= 0, idx);
      await clic(pg, `#fichaOvl [data-rmaus="${idx}"]`);
      await llega(pg, () => [...document.querySelectorAll('#toasts .toast')].some(t => /Ausencia retirada/.test(t.textContent)), null, 4000);
      const t = await pg.evaluate(() => [...document.querySelectorAll('#toasts .toast')].map(x => x.textContent).find(x => /Ausencia retirada/.test(x)) || '');
      ok('el aviso dice quién entró por él y qué pasa (C-H12)', /Roberto/.test(t) && /dom 4/.test(t) && /Dulce/.test(t) && /entr\w+ por Iván/.test(t) && /al volver a generar la semana/.test(t) && /quít/.test(t), t);
      const rv = await pg.evaluate(() => revisionMes(S, S.staff, estadoDeIso('2026-10-04'), { desde: '2026-10-02', hasta: '2026-10-04' }).filter(x => x.tipo === 'por-presente').map(x => x.msg));
      ok('la Revisión, con la acción: «… que ya no falta ese día — sale al volver a generar la semana»', rv.some(m => /Roberto va por Iván, que ya no falta ese día — sale al volver a generar la semana/.test(m)), j(rv));
    });
    await pg.context().close();
  }

  // ══ 16) un día marcado lejano, y lo pequeño ══
  console.log('── 16) Iván, vacaciones el 2/10 y el 31/12 (con diciembre planificado); Juani de baja: «3 (mínimo 2)»; casilla cerrada');
  {
    const pg = await pagina('lejano');
    await seccion('día lejano', async () => {
      await pg.evaluate(() => { const e = estadoDeIso('2026-12-28', true); generarPlanilla(S, S.staff, e, '2026-12-28', '2026-12-31', {}); saveState(); });
      ok('preparado: Iván trabaja la tarde del 31/12', await pg.evaluate(() => pidsEn(estadoDeIso('2026-12-31'), '2026-12-31', 'PASARELA_T').includes('ivan')));
      await vista(pg, 'cobertura');
      await pg.evaluate(() => { irACobertura({ pid: 'ivan', tipo: 'VAC', dias: ['2026-10-02', '2026-12-31'], franjas: ['T'] }); });
      await clic(pg, '#cobRoot #cobProponer');
      ok('sale el resultado', await llega(pg, () => !!document.querySelector('#cobRes .cobplan'), null, 30000) >= 0);
      const cas = (await planes(pg)).flatMap(P => P.casillas.map(c => c.cas));
      ok('el 31/12 se mira (M-H3)', cas.includes('2026-12-31|PASARELA_T') && !await pg.$('#cobRes .cobtrunc'), j(cas));
      ok('se confirma el plan A', await confirmar(pg, 'A') >= 0);
      ok('e Iván sale de su tarde del 31/12', !await pg.evaluate(() => pidsEn(estadoDeIso('2026-12-31'), '2026-12-31', 'PASARELA_T').includes('ivan')));
    });
    await seccion('3 (mínimo 2)', async () => {
      await pg.evaluate(() => { COB.dias = []; COB.res = null; COB.franjas = []; });
      ok('se busca', await buscar(pg, 'juani', 'BAJ', ['2026-09-25']) >= 0);
      const mv = await txt(pg, '#cobRes .cobplan.reco .cobmv[data-cas="2026-09-25|ZAPA_M"]');
      ok('«quedan …, 3 (mínimo 2)» y «la casilla sigue completa (3, mínimo 2)», no «3 de 2»', !!mv && /3 \(mínimo 2\)/.test(mv) && !/3 de 2/.test(mv), mv);
    });
    await seccion('casilla cerrada', async () => {
      await pg.evaluate(() => { const e = estadoDeIso('2026-09-29', true); e.apertura['2026-09-29'] = Object.assign({}, e.apertura['2026-09-29'], { MONACO_T: false }); saveState(); });
      await pg.evaluate(() => { COB.dias = []; COB.res = null; });
      ok('se busca', await buscar(pg, 'cristian', 'LD', ['2026-09-29']) >= 0);
      const sale = await txt(pg, '#cobRes .cobplan.reco .cobmv[data-cas="2026-09-29|MONACO_T"] .cobsale');
      ok('con la casilla cerrada, la columna solo dice «cerrada ese día» (C-S5)', !!sale && /cerrada ese día/.test(sale) && !/quedan/.test(sale), sale);
    });
    await pg.context().close();
  }

  // ══ 17) en el móvil ══
  console.log('── 17) móvil: la Cobertura abierta desde Hoy');
  {
    const pg = await pagina('movil', { movil: true });
    await seccion('móvil', async () => {
      await pg.evaluate(() => openCobertura({ pid: 'juani', dias: ['2026-09-23'] }));
      await pg.waitForSelector('#cobOvl .cobstrip', { timeout: 5000 }).catch(() => null);
      const g = async () => pg.evaluate(() => {
        const r = el => { const b = el.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom }; };
        const x = document.querySelector('#cobOvl .ovx'), card = document.querySelector('#cobOvl .ovcard'), sheet = document.querySelector('#cobOvl .cobsheet');
        const dias = [...document.querySelectorAll('#cobOvl .cobdia')].map(r);
        const on = document.querySelector('#cobOvl .cobdia.on'), cs = getComputedStyle(on, '::after'), ro = r(on), sm = r(on.querySelector('small'));
        const chk = { l: ro.r - parseFloat(cs.right) - parseFloat(cs.width), r: ro.r - parseFloat(cs.right), t: ro.t + parseFloat(cs.top), b: ro.t + parseFloat(cs.top) + parseFloat(cs.height) };
        return { x: r(x), card: r(card), sheet: r(sheet), dias, chk, sm };
      });
      const cruza = (a, b) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
      let m = await g();
      ok('la hoja ocupa el ancho de la tarjeta (sin una columna para la «×»)', m.card.r - m.sheet.r < 30, j([m.card, m.sheet]));
      ok('la «×» no tapa ningún día', !m.dias.some(d => cruza(d, m.x)), j({ x: m.x, dom: m.dias[6] }));
      await pg.evaluate(() => { const c = document.querySelector('#cobOvl .ovcard'), s = document.querySelector('#cobOvl .cobstrip'); c.scrollTop += s.getBoundingClientRect().top - c.getBoundingClientRect().top - 4; });
      m = await g();
      ok('tampoco con la fila de días arriba del todo', !m.dias.some(d => cruza(d, m.x)), j({ x: m.x, dom: m.dias[6] }));
      ok('la ✓ del día marcado no pisa el nombre del día', !cruza(m.chk, m.sm), j({ chk: m.chk, sm: m.sm }));
    });
    await pg.context().close();
  }
} finally {
  await br.close();
  srv.close();
}
if (errores.length) { console.log('errores de página:'); for (const e of errores) console.log('  ' + e); }
ok('sin errores de página', errores.length === 0, errores.join(' | '));
resumen();
