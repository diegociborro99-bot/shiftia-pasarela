// LA FASE A6 DE LA AUDITORÍA (01/10, horas, núcleo y empleado), CON CLICS:
//  1) las horas puestas a mano en un turno continuo (G2; corrección de A6, revisión de cliente H1): en una sola mitad son las de
//     todo el turno, lo pongas en la mañana o en la tarde (Noe «de 11:00 a 19:00»: 8 h, no 16), en las dos cada mitad lo suyo, y
//     el formulario de cualquiera de las dos mitades lo dice;
//  2) «Ajustar apoyo» no guarda la misma hora de entrada y de salida (G9: pagaba 24 h), y lo dice dentro del formulario, sin
//     tapar «Guardar» en el móvil (corrección de A6);
//  3) apagar «Mínimos» en Equipo da por viejo el plan de la Cobertura (G8: la huella de la planilla lleva las reglas), y hacer
//     visible un mes no (corrección de A6, revisión de cliente H9);
//  4) «forzar» dice y guarda todas las reglas que se saltan, también el partido del día que libra (C6, D16); la Revisión las
//     nombra todas, no repite la pareja «nunca con» y en la línea de lo forzado solo va lo forzado (C9);
//  5) la cocina puesta en Pasarela, que no tiene cocina, sale en la Revisión (C12);
//  7) Ajustes de los locales no guarda un horario o un tramo del partido con la misma hora de entrada y de salida (corrección de
//     A6, revisión de cliente S2);
//  6) con el servidor real: la app del empleado (Cristian) recibe las reglas del grupo y su «sin trabajo» de los cierres (también
//     el de la semana tipo), no recibe las horas a mano, la razón ni la marca de la ausencia de los compañeros, y no da de alta a
//     quien el encargado quitó (G5, G6, G10, G11 y el añadido de A5); y el motor Núcleo (con un núcleo de pega) no deja dos
//     apoyos solos: los rechaza, la vuelta siguiente los veta y el hueco lo dice (G4).
// El reloj de la página se fija en el lunes 5/10/2026 a las 10:00 (Madrid). E2E_RAIZ permite pasar la batería por otra copia.
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync, existsSync, statSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { cargarChromium, contador, llega, hasta } from './e2e-util.mjs';

const { chromium, CHROMIUM } = await cargarChromium();
const RAIZ = resolve(process.env.E2E_RAIZ || join(dirname(fileURLToPath(import.meta.url)), '..'));
const require = createRequire(import.meta.url);
const M = require(join(RAIZ, 'modelo.js'));
const { todoFuera } = require('./nucleo-esquema.cjs');
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
const errores = [], dialogos = [];
const j = x => JSON.stringify(x);
const RELOJ = '2026-10-05T10:00:00+02:00', MIE = '2026-10-07';

async function pagina(etiqueta, o = {}) {
  const ctx = await br.newContext(o.movil ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 900 } });
  await ctx.clock.setFixedTime(new Date(RELOJ));
  await ctx.addInitScript(() => { try { sessionStorage.setItem('shiftia_pas_sesion', '1'); sessionStorage.setItem('shiftia_pas_rol', 'admin'); } catch (e) {} });
  const pg = await ctx.newPage();
  pg.on('pageerror', e => errores.push(`${etiqueta}: ${e.message}`));
  pg.on('dialog', d => { dialogos.push(d.message()); d.accept(d.type() === 'prompt' ? 'prueba A6' : undefined).catch(() => {}); });
  await pg.route(/googleapis|gstatic|cdnjs/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await pg.goto(BASE + '/index.html?demo=1');
  await pg.waitForSelector('#view-hoy .loccard', { timeout: 15000 });
  return pg;
}
async function seccion(nombre, fn) {
  try { await fn(); } catch (e) { ok(`${nombre}: la sección no se interrumpe`, false, e && e.stack ? e.stack.split('\n').slice(0, 4).join(' | ') : e); }
}
const clic = (pg, sel) => pg.click(sel, { timeout: 3000 }).then(() => true, () => false);
const vista = async (pg, v) => { if (!await pg.evaluate(v => { const t = document.querySelector(`.tab[data-v="${v}"]`); return !!(t && t.offsetParent); }, v)) await pg.evaluate(v => switchTab(v), v); else await pg.click(`.tab[data-v="${v}"]`); return llega(pg, v => { const s = document.getElementById('view-' + v); return !!s && !s.classList.contains('hidden'); }, v, 4000); };
const irDia = async (pg, iso) => { await vista(pg, 'hoy'); await pg.evaluate(iso => irAIso(iso), iso); return llega(pg, iso => isoDia() === iso && !!document.querySelector('#view-hoy .loccard'), iso, 4000); };
const toasts = pg => pg.evaluate(() => { window.__toasts = []; new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.classList && n.classList.contains('toast')) window.__toasts.push(n.textContent.replace(/\s+/g, ' ').trim()); }).observe(document.getElementById('toasts'), { childList: true }); });
const lineasRevision = async pg => {
  await clic(pg, '#topRevisar');
  await llega(pg, () => !!document.querySelector('#revOvl'), null, 4000);
  const ls = await pg.$$eval('#revOvl .revitem .msg', xs => xs.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  await clic(pg, '#revOvl [data-ovx]');
  return ls;
};

try {
  // ══ 1) G2 y la corrección de A6 (cliente H1) · el turno continuo con horas a mano ══
  console.log('── 1) Horas: el turno continuo con horas a mano (en una sola mitad, las de todo el turno)');
  {
    const pg = await pagina('continuo');
    await seccion('continuo', async () => {
      const c = await pg.evaluate(() => { for (const d of est.days) for (const p of S.staff) { const r = turnoDelDia(S, est, d.iso, p.id); if (r.continuo) return { iso: d.iso, pid: p.id, tidM: r.continuo + '_M', tidT: r.continuo + '_T' }; } return null; });
      ok('preparado: en el mes de demo alguien hace un turno continuo', !!c, j(c));
      const minutos = () => pg.evaluate(c => horasPersonaMes(S, S.staff, S.meses, c.pid, S.y, S.m).minutos, c);
      const antes = await minutos();
      // abre el formulario del tramo de esa mitad y devuelve lo que dice del continuo
      const abrir = async tid => {
        await irDia(pg, c.iso);
        await clic(pg, `#view-hoy .pchip[data-pid="${c.pid}"][data-turno="${c.iso}|${tid}"]`);
        await llega(pg, () => !!document.querySelector('#menuTurnoPop'), null, 3000);
        await clic(pg, '#menuTurnoPop [data-mt="hora"]');
        await llega(pg, () => !!document.querySelector('#menuTurnoPop #trIni'), null, 3000);
        return pg.evaluate(() => { const n = document.querySelector('#menuTurnoPop [data-trcont]'); return n ? n.textContent.trim() : ''; });
      };
      const guardar = async (ini, fin) => { await pg.fill('#menuTurnoPop #trIni', ini); await pg.fill('#menuTurnoPop #trFin', fin); await clic(pg, '#menuTurnoPop [data-trok]'); await llega(pg, () => !document.querySelector('#menuTurnoPop #trIni'), null, 3000); };
      const NOTA = 'Turno continuo: pon la hora de entrada y la de salida de todo el turno';
      const notaT0 = await abrir(c.tidT);
      ok('el formulario de la tarde del continuo dice «Turno continuo: pon la hora de entrada y la de salida de todo el turno»', notaT0 === NOTA, notaT0);
      await pg.keyboard.press('Escape');
      const notaM = await abrir(c.tidM);
      ok('y el de la mañana, lo mismo', notaM === NOTA, notaM);
      await guardar('11:00', '19:00');
      ok('la mañana queda con su horario a mano (11:00–19:00)', await llega(pg, c => { const x = asignados(estadoDeIso(c.iso), c.iso, c.tidM).find(y => y.pid === c.pid); return !!x && x.ini === '11:00' && x.fin === '19:00'; }, c, 3000) >= 0);
      const d1 = await minutos() - antes;
      ok('el turno entero de 11:00 a 19:00 apuntado en la mañana: 8 h ese día, como siempre (el revisor: 16 h)', d1 === 0, `${antes} → ${antes + d1}`);
      const notaT = await abrir(c.tidT);
      ok('con la mañana apuntada, el de la tarde dice que eso es todo el turno y que, si apuntas también la tarde, cada mitad cuenta lo suyo', notaT === 'Turno continuo: la mañana ya lleva 11:00–19:00 y cuenta como todo el turno; si apuntas también la tarde, cada mitad cuenta lo suyo', notaT);
      await pg.keyboard.press('Escape');
      // la mañana de 09:00 a 14:00 y la tarde de 14:00 a 17:00: cada tramo lo suyo (8 h)
      await abrir(c.tidM); await guardar('09:00', '14:00');
      ok('solo la mañana de 09:00 a 14:00: ese es el turno entero (5 h ese día; antes 5 h más las 8 de la tarde)', await minutos() - antes === 300 - 480, String(await minutos() - antes));
      await abrir(c.tidT);
      await guardar('14:00', '17:00');
      ok('y la tarde de 14:00 a 17:00: 8 h el día (09–14 + 14–17)', await minutos() - antes === 0, String(await minutos() - antes));
      const notaT2 = await abrir(c.tidT);
      ok('con las dos apuntadas, el formulario lo dice: cada mitad cuenta lo suyo', notaT2 === 'Turno continuo: la mañana lleva 09:00–14:00 y cada mitad cuenta lo suyo', notaT2);
      await pg.keyboard.press('Escape');
      await vista(pg, 'horas');
      await pg.evaluate(() => { S.hY = S.y; S.hM = S.m; renderHoras(); });
      const fila = await pg.$eval(`#view-horas tr.hrow[data-hx="${c.pid}"] .hh`, x => x.textContent.trim()).catch(() => '');
      const esperado = await pg.evaluate(c => numHoras(horasPersonaMes(S, S.staff, S.meses, c.pid, S.y, S.m).horas), c);
      ok(`la tabla de Horas lo enseña (${fila})`, !!fila && fila.includes(String(esperado).trim()), j({ fila, esperado }));
      if (!await pg.$eval(`#view-horas [data-hdet="${c.pid}"]`, x => !!x.offsetParent).catch(() => false)) await clic(pg, `#view-horas tr.hrow[data-hx="${c.pid}"]`);
      const det = await pg.$eval(`#view-horas [data-hdet="${c.pid}"]`, x => x.textContent.replace(/\s+/g, ' ')).catch(() => '');
      ok('y su desglose dice la misma regla del continuo', /se cuenta una vez; con horas a mano en una sola mitad, esas son las de todo el turno/.test(det), det.slice(0, 300));
    });
    await pg.context().close();
  }

  // ══ 2) G9 · «Ajustar apoyo» de 16:00 a 16:00 ══
  console.log('── 2) «Ajustar apoyo» con la misma hora de entrada y de salida');
  {
    const pg = await pagina('apoyo');
    await seccion('apoyo', async () => {
      const o = await pg.evaluate(() => { for (const [iso, dia] of Object.entries(est.asig)) for (const [tid, lista] of Object.entries(dia)) for (const x of lista) if (iso >= isoHoy() && esApoyo(personaDeId(x.pid)) && !x.ini) return { iso, tid, pid: x.pid }; return null; });
      ok('preparado: un apoyo colocado', !!o, j(o));
      await irDia(pg, o.iso);
      await toasts(pg);
      await clic(pg, `#view-hoy .pchip[data-pid="${o.pid}"][data-turno="${o.iso}|${o.tid}"]`);
      await llega(pg, () => !!document.querySelector('#menuTurnoPop'), null, 3000);
      await clic(pg, '#menuTurnoPop [data-mt="hora"]');
      await llega(pg, () => !!document.querySelector('#menuTurnoPop #trIni'), null, 3000);
      await pg.fill('#menuTurnoPop #trIni', '16:00'); await pg.fill('#menuTurnoPop #trFin', '16:00');
      await clic(pg, '#menuTurnoPop [data-trok]');
      // (corrección de A6) dentro del formulario, encima de «Guardar»: como aviso suelto, en el móvil tapaba el botón
      ok('lo dice dentro del formulario: «La hora de entrada y la de salida no pueden ser la misma»', await llega(pg, () => { const x = document.querySelector('#menuTurnoPop [data-trerr]'); return !!x && !x.hidden && /no pueden ser la misma/.test(x.textContent); }, null, 3000) >= 0, j(await pg.evaluate(() => [window.__toasts, (document.querySelector('#menuTurnoPop') || {}).textContent])));
      ok('y no guarda nada (ni 24 h en Horas)', await pg.evaluate(o => { const x = asignados(estadoDeIso(o.iso), o.iso, o.tid).find(y => y.pid === o.pid); return !!x && !x.ini && !x.fin && !!document.querySelector('#menuTurnoPop #trIni'); }, o));
    });
    await pg.context().close();
  }
  {
    // en el móvil: el aviso no tapa «Guardar» (el revisor lo vio tapado por el aviso suelto)
    const pg = await pagina('apoyo-movil', { movil: true });
    await seccion('apoyo-movil', async () => {
      const o = await pg.evaluate(() => { for (const [iso, dia] of Object.entries(est.asig)) for (const [tid, lista] of Object.entries(dia)) for (const x of lista) if (iso >= isoHoy() && esApoyo(personaDeId(x.pid)) && !x.ini) return { iso, tid, pid: x.pid }; return null; });
      await pg.evaluate(o => { irAIso(o.iso); }, o);
      await llega(pg, o => isoDia() === o.iso && !!document.querySelector(`#view-hoy .pchip[data-pid="${o.pid}"][data-turno="${o.iso}|${o.tid}"]`), o, 4000);
      await pg.evaluate(o => document.querySelector(`#view-hoy .pchip[data-pid="${o.pid}"][data-turno="${o.iso}|${o.tid}"]`).scrollIntoView(), o);
      await clic(pg, `#view-hoy .pchip[data-pid="${o.pid}"][data-turno="${o.iso}|${o.tid}"]`);
      await llega(pg, () => !!document.querySelector('#menuTurnoPop'), null, 3000);
      await clic(pg, '#menuTurnoPop [data-mt="hora"]');
      await llega(pg, () => !!document.querySelector('#menuTurnoPop #trIni'), null, 3000);
      await pg.fill('#menuTurnoPop #trIni', '16:00'); await pg.fill('#menuTurnoPop #trFin', '16:00');
      await clic(pg, '#menuTurnoPop [data-trok]');
      await llega(pg, () => { const x = document.querySelector('#menuTurnoPop [data-trerr]'); return !!x && !x.hidden; }, null, 3000);
      await pg.waitForTimeout(400);
      const libre = await pg.evaluate(() => { const b = document.querySelector('#menuTurnoPop [data-trok]'); if (!b) return 'sin botón'; const r = b.getBoundingClientRect(); const x = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return x === b || b.contains(x) ? true : (x ? x.className || x.tagName : 'nada'); });
      ok('en el móvil, con el aviso a la vista, «Guardar» se puede pulsar (nada lo tapa)', libre === true, j(libre));
    });
    await pg.context().close();
  }

  // ══ 3) G8 · apagar «Mínimos» da por viejo el plan de la Cobertura ══
  console.log('── 3) Cobertura: el plan caduca al apagar «Mínimos» en Equipo');
  {
    const pg = await pagina('huella');
    await seccion('huella', async () => {
      const dia = await pg.evaluate(() => { for (const d of est.days) if (d.iso > isoHoy() && casillasDe(est, d.iso, 'ivan').length) return d.iso; return null; });
      await vista(pg, 'cobertura');
      await clic(pg, '#cobRoot .cobpk[data-pk="ivan"]');
      await clic(pg, '#cobRoot [data-tipo="VAC"]');
      if (!await pg.evaluate(i => COB.dias.includes(i), dia)) await clic(pg, `#cobRoot .cobdia[data-dia="${dia}"]`);
      await clic(pg, '#cobRoot #cobProponer');
      ok(`hay plan para las vacaciones de Iván el ${dia}`, await llega(pg, () => !!document.querySelector('#cobRes .cobplan') && !!COB.res, null, 15000) >= 0);
      // (corrección de A6; revisión de cliente H9) hacer visible noviembre para el equipo no cambia quién trabaja en octubre: el plan sigue
      await vista(pg, 'mes');
      await pg.evaluate(() => shiftMonth(1));
      await llega(pg, () => !!document.querySelector('#mVisibleBtn'), null, 3000);
      await clic(pg, '#mVisibleBtn');
      ok('hacer visible noviembre en Mes lo publica', await llega(pg, () => (S.mesesPublicados || []).includes('2026-11'), null, 3000) >= 0, j(await pg.evaluate(() => S.mesesPublicados)));
      await pg.evaluate(() => shiftMonth(-1));
      await vista(pg, 'cobertura');
      await pg.waitForTimeout(300);
      ok('y la Cobertura sigue enseñando el plan (el revisor: «La ficha ha cambiado: vuelve a buscar»)', await pg.evaluate(() => !!document.querySelector('#cobRes .cobplan') && !document.querySelector('#cobCaduco')), await pg.evaluate(() => (document.querySelector('#cobRoot') || {}).textContent.replace(/\s+/g, ' ').slice(0, 300)));
      await vista(pg, 'equipo'); await clic(pg, '#btnCondiciones');
      await llega(pg, () => !!document.querySelector('#condOvl #condBody .condrow'), null, 4000);
      await clic(pg, '#condOvl [data-regla-row="minimos"] .tglk');
      ok('apagar «Mínimos» escribe S.reglas.minimos === false', await llega(pg, () => S.reglas.minimos === false, null, 3000) >= 0);
      await clic(pg, '#condOvl [data-ovx]');
      await vista(pg, 'cobertura');
      ok('la Cobertura ya no enseña el plan de antes y lo dice en general: «Ha cambiado la planilla, una ficha o una regla del grupo: vuelve a buscar»', await llega(pg, () => !!document.querySelector('#cobCaduco') && /Ha cambiado la planilla, una ficha o una regla del grupo: vuelve a buscar/.test(document.querySelector('#cobCaduco').textContent) && !/La ficha ha cambiado/.test(document.querySelector('#cobCaduco').textContent), null, 4000) >= 0, await pg.evaluate(() => (document.querySelector('#cobRoot') || {}).textContent.replace(/\s+/g, ' ').slice(0, 300)));
    });
    await pg.context().close();
  }

  // ══ 4) C6/D16 y C9 · «forzar» dice todas las reglas y la Revisión no repite la pareja ══
  console.log('── 4) Forzar a Mari Luz el miércoles que libra: todas las reglas, y la Revisión una vez cada cosa');
  {
    const pg = await pagina('forzar');
    await seccion('forzar', async () => {
      ok('preparado: Mari Luz libra el miércoles 7 y no está en ninguna casilla', await pg.evaluate(d => !casillasDe(estadoDeIso(d), d, 'mariluz').length && libraEn(personaDeId('mariluz'), d), MIE));
      const forzar = async tid => {
        await irDia(pg, MIE);
        dialogos.length = 0;
        await toasts(pg);
        await clic(pg, `#view-hoy [data-pick="${MIE}|${tid}"]`);
        await llega(pg, () => !!document.querySelector('#pickerPop [data-forzar="mariluz"]'), null, 4000);
        const fila = await pg.evaluate(() => { const b = document.querySelector('#pickerPop [data-forzar="mariluz"]'); const f = b && b.closest('.prowp'); return f ? f.textContent.replace(/\s+/g, ' ').trim() : ''; });
        await clic(pg, '#pickerPop [data-forzar="mariluz"]');
        await llega(pg, () => (window.__toasts || []).length > 0, null, 4000);
        return { prompt: dialogos.join(' | '), toast: await pg.evaluate(() => (window.__toasts || []).join(' | ')), fila };
      };
      const a = await forzar('PASARELA_T');
      ok('en la tarde de Pasarela, «forzar» dice el día libre y la pareja «nunca con»', /libra los miércoles/.test(a.prompt) && /nunca con Lavinia/.test(a.prompt), a.prompt);
      const b = await forzar('ZAPA_M');
      // (corrección de A6; revisión de cliente H4) la fila de quien no puede dice que hay más reglas, antes de pulsar «forzar»
      ok('en el selector, su fila dice la primera regla «y 2 más»', /solo Pasarela · y 2 más/.test(b.fila), b.fila);
      // (corrección de A6; revisión de cliente H3 y de modelo H4) el partido con una sola frase, la de la Revisión: «no hace partido los miércoles»
      ok('y en la mañana de Zapatillera dice las tres: sus locales, el día libre y el partido (antes, el partido se callaba), con la frase de la Revisión', /solo Pasarela/.test(b.prompt) && /libra los miércoles/.test(b.prompt) && /no hace partido los miércoles/.test(b.prompt) && !/partido no declarado/.test(b.prompt), b.prompt);
      ok('el aviso de después también dice el partido, igual', /no hace partido los miércoles/.test(b.toast) && !/partido no declarado/.test(b.toast), b.toast);
      const guardados = await pg.evaluate(d => (asignados(estadoDeIso(d), d, 'ZAPA_M').find(x => x.pid === 'mariluz') || {}).avisos || null, MIE);
      ok('y la entrada guarda las tres', j(guardados) === j(['solo Pasarela', 'libra los miércoles', 'no hace partido los miércoles']), j(guardados));
      const ls = (await lineasRevision(pg)).filter(l => /miércoles 7/.test(l));
      const zapa = ls.find(l => /^Zapatillera · mañana/.test(l)) || '', pas = ls.filter(l => /^Pasarela · tarde/.test(l));
      // (corrección de A6; revisión de cliente H2 y H4) «1 asignación forzada a mano — Mari Luz, puesto a la fuerza ("su motivo"): …», y el
      // partido de ese día una sola vez (en la primera casilla de las dos, con sus franjas y sus locales)
      ok('la Revisión nombra el partido del día que libra en la mañana de Zapatillera, una vez y con las dos franjas, y el motivo escrito al forzar', /: 1 asignación forzada a mano — Mari Luz, puesto a la fuerza \(“prueba A6”\): solo Pasarela, libra los miércoles, no hace partido los miércoles \(mañana en Zapatillera y tarde en Pasarela\)/.test(zapa), zapa);
      ok('y en la tarde de Pasarela la pareja «nunca con» flexible sale una vez, con lo forzado de Mari Luz (no también en Lavinia), sin repetir el partido', pas.length === 1 && (pas[0].match(/nunca con/g) || []).length === 1 && /: 1 asignación forzada a mano — Mari Luz, puesto a la fuerza \(“prueba A6”\): libra los miércoles, nunca con Lavinia \(pareja flexible/.test(pas[0]) && !/no hace partido/.test(pas[0]), j(pas));
    });
    await pg.context().close();
  }

  // ══ 5) C12 · la cocina en Pasarela ══
  console.log('── 5) La cocina puesta en Pasarela, que no tiene cocina');
  {
    const pg = await pagina('cocina');
    await seccion('cocina', async () => {
      const r = await pg.evaluate(() => {
        for (const d of est.days) {
          if (d.iso <= isoHoy()) continue;
          const e = estadoDeIso(d.iso, true);
          if (turnosDe(S).some(t => t.franja === 'M' && pidsEn(e, d.iso, t.id).includes('jenny'))) continue;
          const sf = siSeFuerza(S, S.staff, e, d.iso, 'PASARELA_M', 'jenny', { puesto: 'cocina', cocina: true });
          const a = asignar(e, S, S.staff, d.iso, 'PASARELA_M', 'jenny', { puesto: 'cocina', cocina: true, forzar: true, origen: 'manual' });
          saveState(); renderVistaActiva();
          return { iso: d.iso, incumple: sf.incumple, ok: a.ok, avisos: a.avisos };
        }
        return null;
      });
      ok('«forzar» lo dice («Cocina — Pasarela no tiene cocina») y, forzada, queda con ese aviso', !!r && r.incumple.some(x => x.k === 'cocina' && x.motivo === 'Pasarela no tiene cocina') && r.ok && r.avisos.includes('Pasarela no tiene cocina'), j(r));
      const ls = await lineasRevision(pg);
      ok('la Revisión lo dice: «Pasarela no tiene cocina y Jenny lleva la cocina»', ls.some(l => /Pasarela · mañana .*: Pasarela no tiene cocina y Jenny lleva la cocina/.test(l)), j(ls.filter(l => /Pasarela/.test(l)).slice(0, 5)));
    });
    await pg.context().close();
  }

  // ══ 7) corrección de A6 (revisión de cliente S2) · Ajustes de los locales: la misma hora de entrada y de salida ══
  console.log('── 7) Ajustes de los locales: «16:00–16:00» no se guarda (ahora contaría 0 horas sin avisar)');
  {
    const pg = await pagina('ajustes');
    await seccion('ajustes', async () => {
      await vista(pg, 'equipo');
      await pg.evaluate(() => openAjustesLocales('PASARELA'));
      await llega(pg, () => !!document.querySelector('#localesOvl [data-hor="T|fin"]'), null, 4000);
      await toasts(pg);
      const antes = await pg.evaluate(() => JSON.stringify([localDe(S, 'PASARELA').horario, localDe(S, 'PASARELA').horarioPartido]));
      const pon = async (sel, v) => { await pg.fill(sel, v); await pg.dispatchEvent(sel, 'change'); await pg.waitForTimeout(150); };
      const ini = await pg.$eval('#localesOvl [data-hor="T|ini"]', x => x.value);
      await pon('#localesOvl [data-hor="T|fin"]', ini);
      ok(`el horario de la tarde con la salida igual a la entrada (${ini}) no se guarda, y el campo vuelve a lo que era`, await pg.evaluate(() => localDe(S, 'PASARELA').horario.T.fin !== localDe(S, 'PASARELA').horario.T.ini) && await pg.$eval('#localesOvl [data-hor="T|fin"]', (x, i) => x.value !== i, ini), await pg.evaluate(() => JSON.stringify(localDe(S, 'PASARELA').horario.T)));
      ok('y lo dice: «La hora de entrada y la de salida no pueden ser la misma»', await llega(pg, () => (window.__toasts || []).some(t => /no pueden ser la misma/.test(t)), null, 3000) >= 0, j(await pg.evaluate(() => window.__toasts)));
      const pIni = await pg.$eval('#localesOvl [data-horp="T|ini"]', x => x.value);
      if (pIni) await pon('#localesOvl [data-horp="T|fin"]', pIni);
      const sIni = await pg.$eval('#localesOvl [data-horx="6|M|ini"]', x => x.value);
      if (sIni) await pon('#localesOvl [data-horx="6|M|fin"]', sIni);
      ok('ni el tramo del partido ni el sábado con la misma hora', await pg.evaluate(a => JSON.stringify([localDe(S, 'PASARELA').horario, localDe(S, 'PASARELA').horarioPartido]) === a, antes), await pg.evaluate(() => JSON.stringify([localDe(S, 'PASARELA').horario, localDe(S, 'PASARELA').horarioPartido])));
    });
    await pg.context().close();
  }

  ok('ningún error de página en la parte local', errores.length === 0, errores.join(' | '));

  // ══ 6) con el servidor real: la app del empleado y el motor Núcleo ══
  console.log('── 6) Con el servidor: lo que recibe Cristian y el Núcleo que no deja dos apoyos solos');
  {
    // el núcleo de pega: lo fijo y, en la primera vuelta, Lavinia y Dulce solas en la tarde de Pasarela (el primer día libre para las dos)
    const recibidos = [];
    let solas = null;
    const nucleo = createServer((req, res) => {
      if (req.url === '/healthz') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":true}'); return; }
      let cuerpo = '';
      req.on('data', d => { cuerpo += d; });
      req.on('end', () => {
        const pb = JSON.parse(cuerpo || '{}').problem;
        recibidos.push(pb);
        const schedule = {};
        for (const w of pb.workers) schedule[w.id] = Object.assign({}, w.fixed);
        const libre = (w, i) => !w.fixed[i] && !todoFuera(w.unavailable[i]) && !(w.unavailable[i] || []).includes('PASARELA') && w.allowed_shifts.includes('PASARELA');
        const lav = pb.workers.find(w => w.id === 'lavinia'), dul = pb.workers.find(w => w.id === 'dulce');
        if (solas === null) solas = pb.meta.indices.findIndex((x, i) => x.franja === 'T' && libre(lav, i) && libre(dul, i));
        if (solas >= 0 && libre(lav, solas) && libre(dul, solas)) { schedule.lavinia[solas] = 'PASARELA'; schedule.dulce[solas] = 'PASARELA'; }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'OPTIMAL', feasible: true, objective: 0, schedule, stats: { wall_time_s: 0.1 }, violations: [], relaxations: [] }));
      });
    });
    await new Promise(r => nucleo.listen(0, '127.0.0.1', r));
    const PORT = 8960 + Math.floor(Math.random() * 30), SB = `http://127.0.0.1:${PORT}`;
    const dir = mkdtempSync(join(tmpdir(), 'shiftia-pas-a6-'));
    let logSrv = '';
    const server = spawn('node', [join(RAIZ, 'server.js')], { env: { ...process.env, PORT: String(PORT), DATA_DIR: dir, TRUST_PROXY: '0', ADMIN_PASSWORD: 'clave12345', PROGRAMADOR_PASSWORD: '', SHIFTIA_CORE_URL: `http://127.0.0.1:${nucleo.address().port}` }, stdio: ['ignore', 'pipe', 'pipe'] });
    server.stdout.on('data', d => { logSrv += d; }); server.stderr.on('data', d => { logSrv += d; });
    try {
      const salud = await hasta(async () => (await fetch(SB + '/api/salud')).ok, 20000, 150);
      ok('el servidor arranca', !!salud.v, logSrv.slice(-300));
      const jar = () => ({ cookie: '' });
      const api = async (jj, m, ruta, cuerpo) => {
        const r = await fetch(SB + ruta, { method: m, headers: { 'Content-Type': 'application/json', Origin: SB, ...(jj.cookie ? { Cookie: jj.cookie } : {}) }, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) });
        const sc = r.headers.get('set-cookie'); if (sc) jj.cookie = sc.split(';')[0];
        return { ok: r.ok, status: r.status, datos: await r.json().catch(() => null) };
      };
      // la planilla del encargado: octubre generado con la semana tipo, «Días que libra» apagada, Susi ya no está en la plantilla,
      // Dulce fuera de standby, horas a mano y la marca de la Cobertura en compañeros, y dos cierres del Mónaco por la tarde: el
      // martes 13 cerrado antes de generar (leído de la semana tipo) y el 20 con la plaza de Cristian retirada, sin decisiones
      const cfg = M.semillaPasarela();
      cfg.staff = cfg.staff.filter(p => p.id !== 'susi');
      M.personaDe(cfg.staff, 'dulce').standby = false;
      const e = M.nuevoEstado(2026, 10, { festivos: [] });
      M.generarPlanilla(cfg, cfg.staff, e, '2026-10-01', '2026-10-31', {});
      const sc6 = e.asig['2026-10-06'].MONACO_T.find(x => x.pid === 'scapon'); Object.assign(sc6, { ini: '17:00', fin: '23:30' });
      e.asig['2026-10-06'].MONACO_T.push({ pid: 'yilian', origen: 'cobertura', por: 'scapon', razon: 'por Susana Capón', porAusenciaDe: 'scapon', abre: false, cocina: false });
      delete e.asig['2026-10-13'].MONACO_T;
      const ret20 = e.asig['2026-10-20'].MONACO_T.find(x => x.pid === 'cristian');
      e.asig['2026-10-20'].MONACO_T = e.asig['2026-10-20'].MONACO_T.filter(x => x.pid !== 'cristian');
      const estado = Object.assign(cfg, {
        meses: { '2026-10': { asig: e.asig, apertura: e.apertura, manual: e.manual } }, nextId: 1, peticiones: [], avisos: [], historial: [], mesesPublicados: ['2026-10', '2026-11'],
        reglas: { libra: false }, migraciones: { altas1709: 1 },
        cierresPuntuales: [
          { id: 'c13', localId: 'MONACO', dias: { '2026-10-13': ['T'] }, motivo: 'reforma', detalle: '', decisiones: {}, retirados: [], deSemanaTipo: { '2026-10-13': ['T'] } },
          { id: 'c20', localId: 'MONACO', dias: { '2026-10-20': ['T'] }, motivo: 'reforma', detalle: '', decisiones: {}, retirados: [{ iso: '2026-10-20', tid: 'MONACO_T', entry: ret20 }] },
        ],
      });
      const jA = jar();
      await api(jA, 'POST', '/api/login', { usuario: 'oficina', password: 'clave12345' });
      const v0 = (await api(jA, 'GET', '/api/estado')).datos.version;
      const put = await api(jA, 'PUT', '/api/estado', { baseVersion: v0, estado });
      ok('el encargado guarda esa planilla', put.ok, j(put));
      const alta = await api(jA, 'POST', '/api/usuarios', { usuario: 'cristian', rol: 'empleado', pid: 'cristian' });
      const jC = jar();
      await api(jC, 'POST', '/api/login', { usuario: 'cristian', password: alta.datos && alta.datos.password });
      await api(jC, 'POST', '/api/password', { actual: alta.datos && alta.datos.password, nueva: 'cristian-2026' });
      const entrar = async (usuario, pass) => {
        const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } });
        await ctx.clock.setFixedTime(new Date(RELOJ));
        const pg = await ctx.newPage();
        pg.on('pageerror', x => errores.push(`${usuario}: ${x.message}`));
        pg.on('dialog', d => d.accept().catch(() => {}));
        await pg.route(/googleapis|gstatic|cdnjs/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
        await pg.goto(SB + '/');
        await pg.waitForSelector('#loginForm', { timeout: 10000 });
        await pg.fill('#loginUser', usuario); await pg.fill('#loginPass', pass); await pg.click('#loginBtn');
        await llega(pg, () => typeof SRV !== 'undefined' && SRV.on && !!SRV.rol, null, 15000);
        return pg;
      };
      // ── la app del empleado
      const pc = await entrar('cristian', 'cristian-2026');
      ok('Cristian entra y ve su perfil', await llega(pc, () => document.body.classList.contains('modo-empleado') && !!document.querySelector('#view-perfil .fichead'), null, 15000) >= 0);
      const cab = await pc.$eval('#view-perfil .fichead .sub', x => x.textContent.replace(/\s+/g, ' ').trim()).catch(() => '');
      ok('con «Días que libra» apagada por el encargado, su cabecera no dice «libra los miércoles» (G5)', !!cab && !/libra/.test(cab) && await pc.evaluate(() => S.reglas.libra === false), cab);
      const filas = await pc.$$eval('#view-perfil .festrow', xs => xs.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
      const fila = d => filas.find(f => new RegExp(d).test(f)) || '';
      ok('el martes 13 (cerrado antes de generar, de la semana tipo) dice «cerrado por reforma · Sin trabajo» (G6)', /cerrado por reforma · Sin trabajo hasta que reabra/.test(fila('13 de octubre|martes 13')), j(filas.filter(f => /13/.test(f))));
      ok('y el martes 20 (su plaza retirada al cerrar) también', /cerrado por reforma · Sin trabajo hasta que reabra/.test(fila('20 de octubre|martes 20')), j(filas.filter(f => /20/.test(f))));
      const enApp = await pc.evaluate(() => ({ sin: horasPersonaMes(S, S.staff, S.meses, 'cristian', 2026, 10).sinTrabajoCierre.map(x => x.iso), susi: S.staff.some(p => p.id === 'susi'),
        ajenas: Object.values(S.meses['2026-10'].asig).flatMap(d => Object.values(d)).flat().filter(x => x.pid !== 'cristian' && (x.ini || x.fin || x.razon || x.porAusenciaDe)).length,
        yil: ((S.meses['2026-10'].asig['2026-10-06'] || {}).MONACO_T || []).find(x => x.pid === 'yilian') || null, deST: S.cierresPuntuales.map(c => c.deSemanaTipo) }));
      ok('Horas le cuenta los dos días sin trabajo, como al encargado', j(enApp.sin) === j(['2026-10-13', '2026-10-20']), j(enApp.sin));
      ok('de los compañeros no le llegan las horas a mano, la razón ni la marca de la ausencia; el «por», sí (G10 y A5)', enApp.ajenas === 0 && !!enApp.yil && enApp.yil.por === 'scapon', j(enApp));
      ok('su app no da de alta a Susi, que el encargado quitó de la plantilla (G11)', enApp.susi === false);
      ok('la semana tipo de los cierres no le llega', enApp.deST.every(x => x === undefined), j(enApp.deST));
      // (corrección de A6; revisión de cliente S1 y S3) lo que le llega de verdad, tal cual lo manda el servidor: de su ficha, solo lo
      // que usa su app (ni la nota del encargado ni los «supuestos»), y de los compañeros, ni `forzado` ni `origen`
      const crudo = await pc.evaluate(async () => { const r = await fetch('/api/estado', { credentials: 'same-origin' }); return r.ok ? (await r.json()).estado : null; });
      const suFicha = crudo && crudo.staff.find(p => p.id === 'cristian');
      ok('de su ficha no le llegan la nota del encargado ni los «supuestos» (ni sus reglas, preferencias o contrato)', !!suFicha && ['nota', 'supuestos', 'prefs', 'contrato', 'vetos', 'noAbre', 'noPrimero', 'cubreA'].every(k => suFicha[k] === undefined) && !!suFicha.nombre && Array.isArray(suFicha.libra), j(suFicha));
      const ajenasMarca = crudo ? Object.values(crudo.meses['2026-10'].asig).flatMap(d => Object.values(d)).flat().filter(x => x.pid !== 'cristian' && (x.forzado !== undefined || x.origen !== undefined)).length : -1;
      ok('de las plazas de los compañeros no le llega si se forzaron ni de dónde vienen', ajenasMarca === 0, String(ajenasMarca));
      ok('y su perfil se sigue viendo entero (cabecera, sus días y sus horas)', !!cab && filas.length > 0 && await pc.evaluate(() => horasPersonaMes(S, S.staff, S.meses, 'cristian', 2026, 10).turnos > 0));
      await pc.context().close();

      // ── el motor Núcleo: la tarde de Pasarela con dos apoyos solos
      const pa = await entrar('oficina', 'clave12345');
      ok('el encargado entra', await llega(pa, () => SRV.esAdmin && !!document.querySelector('#view-hoy .loccard'), null, 15000) >= 0);
      await vista(pa, 'generador');
      await clic(pa, '.segm [data-modo="periodo"]');
      await pa.waitForSelector('#genD1', { timeout: 5000 });
      await llega(pa, () => { const b = document.querySelector('[data-motor="nucleo"]'); return !!b && !b.disabled; }, null, 8000);
      await clic(pa, '[data-motor="nucleo"]');
      await pa.fill('#genD1', '2026-12-07'); await pa.dispatchEvent('#genD1', 'change');
      await pa.fill('#genD2', '2026-12-13'); await pa.dispatchEvent('#genD2', 'change');
      if (await pa.$eval('#genPatron', x => x.checked)) await clic(pa, '#genPatron');
      await clic(pa, '#genPrevia');
      ok('la vista previa llega del núcleo', await llega(pa, () => !!GEN.previa && GEN.previa.motor === 'nucleo' && !GEN.ocupado, null, 20000) >= 0, logSrv.slice(-200));
      const i = solas;
      const w2 = recibidos[1] && recibidos[1].workers;
      ok('el volcado rechaza a Lavinia y a Dulce solas en la tarde de Pasarela y la vuelta siguiente las veta ahí (G4)', recibidos.length === 2 && i >= 0 && ['lavinia', 'dulce'].every(id => (w2.find(w => w.id === id).unavailable[i] || []).includes('PASARELA')), j({ n: recibidos.length, i }));
      const iso = i >= 0 ? recibidos[0].meta.indices[i].iso : null;
      ok('no quedan solas en la planilla propuesta', await pa.evaluate(iso => !(GEN.previa.meses[iso.slice(0, 7)].asig[iso] || {}).PASARELA_T || !GEN.previa.meses[iso.slice(0, 7)].asig[iso].PASARELA_T.length, iso));
      const hueco = await pa.$eval(`#genRes .genrow.hueco[data-hueco="${iso}|PASARELA_T|faltan"]`, x => x.textContent.replace(/\s+/g, ' ').trim()).catch(() => '');
      // (corrección de A6; revisión de cliente H8) una frase agrupada, sin paréntesis dentro de paréntesis, y el porqué no se repite abajo
      ok('y el hueco lo dice en una frase: «El núcleo proponía a Lavinia y Dulce, pero dejarían la casilla solo con apoyos: hace falta alguien de sala o de cocina»', /El núcleo proponía a (Lavinia y Dulce|Dulce y Lavinia), pero dejarían la casilla solo con apoyos: hace falta alguien de sala o de cocina/.test(hueco) && (hueco.match(/solo con apoyos/g) || []).length === 1 && !/\(\(|\)\)/.test(hueco), hueco);
      ok('ningún error de página en modo servidor', !errores.length, errores.join(' | '));
      await pa.context().close();
    } finally {
      server.kill();
      nucleo.close();
      try { rmSync(dir, { recursive: true, force: true }); } catch (x) {}
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
