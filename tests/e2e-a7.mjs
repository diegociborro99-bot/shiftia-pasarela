// LA FASE A7 DE LA AUDITORÍA (01/10: bajos y lo que dejaron apuntado las revisiones de A4, A5 y A6), EN LA APP:
//  1) Hoy: la plaza puesta a mano que ahora rompe una regla dura (un veto nuevo) lleva la misma marca «!» que lo forzado y su
//     título dice qué incumple; el «!» de lo forzado dice todo lo que incumple (revisión de cliente de A4, S1);
//  2) la Semana: el título de la ficha forzada dice qué incumple, y la que rompe una regla dura lleva el mismo borde (revisión de
//     cliente de A6);
//  3) la Revisión: lo que regenerar retira por una regla dura va en rojo («Hay que resolver»), con qué hacer (A4, S2); lo de los días
//     ya trabajados, aparte y en gris, «Ya pasado» (A4, S3, y A5, S2);
//  4) en el móvil, la casilla de marcar de las opciones del Generador va a la altura de la primera línea del texto (A4, S7);
//  5) el Mes, al quitar un día de una ausencia, dice quién entró por ella y sale al regenerar, como Equipo (corrección de A5);
//  6) Equipo, con la hora: a las 20:00, la mañana de hoy ya trabajada no se cubre (corrección de A5);
//  7) una casilla cerrada por un cierre de domingos sueltos dice «hasta» el final de su tramo, no el último domingo (auditoría B12).
// Y la corrección tras las dos revisiones (01/10; C-… cliente, M-… modelo, D-n decisiones del coordinador):
//  8) C-H1, C-H2, M-B3: a las 17:30, lo de hoy ya terminado no lleva marca, va a «Ya pasado» y el Generador no lo toca (horas de Tere);
//  9) M-1: de la pareja «nunca con», solo lleva la marca la que sale al regenerar;  10) C-H3: el menú del móvil dice qué hacer;
// 11) D-4b: el Mes marca lo que ya no puede estar;  12) C-H4: quitar un día ya pasado de una ausencia dice qué hacer a mano;
// 13) C-H5 y C-S2: la cocina quitada a mano (el aviso, la ★ y el selector) y Hojan de sala en ámbar;
// 14) C-B2, C-B3, C-B4: la Revisión (título sin lo pasado, una línea por casilla con sus días, el móvil);  15) C-B11: «VAC» en el Mes.
// El reloj de la página se fija en el jueves 15/10/2026 (a las 10:00; a las 20:00 en la sección 6; otras horas donde se dice).
// E2E_RAIZ permite pasar la batería por otra copia (la de antes, para verla en rojo).
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cargarChromium, contador, llega } from './e2e-util.mjs';

const { chromium, CHROMIUM } = await cargarChromium();
const RAIZ = resolve(process.env.E2E_RAIZ || join(dirname(fileURLToPath(import.meta.url)), '..'));
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
const HOY = '2026-10-15';

async function pagina(etiqueta, o = {}) {
  const ctx = await br.newContext(o.movil ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 900 } });
  await ctx.clock.setFixedTime(new Date(o.reloj || `${HOY}T10:00:00+02:00`));
  await ctx.addInitScript(() => { try { sessionStorage.setItem('shiftia_pas_sesion', '1'); sessionStorage.setItem('shiftia_pas_rol', 'admin'); } catch (e) {} });
  const pg = await ctx.newPage();
  pg.on('pageerror', e => errores.push(`${etiqueta}: ${e.message}`));
  pg.on('dialog', d => { dialogos.push(d.message()); d.accept().catch(() => {}); });
  await pg.route(/googleapis|gstatic|cdnjs/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await pg.goto(BASE + '/index.html?demo=1');
  await pg.waitForSelector('#view-hoy .loccard', { timeout: 15000 });
  await pg.evaluate(() => { window.__toasts = []; new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.classList && n.classList.contains('toast')) window.__toasts.push(n.textContent.replace(/\s+/g, ' ').trim()); }).observe(document.getElementById('toasts'), { childList: true }); });
  return pg;
}
async function seccion(nombre, fn) {
  try { await fn(); } catch (e) { ok(`${nombre}: la sección no se interrumpe`, false, e && e.stack ? e.stack.split('\n').slice(0, 4).join(' | ') : e); }
}
const clic = (pg, sel) => pg.click(sel, { timeout: 3000 }).then(() => true, () => false);
const vista = async (pg, v) => { await pg.evaluate(v => switchTab(v), v); return llega(pg, v => { const s = document.getElementById('view-' + v); return !!s && !s.classList.contains('hidden'); }, v, 4000); };
const irDia = async (pg, iso) => { await vista(pg, 'hoy'); await pg.evaluate(iso => irAIso(iso), iso); return llega(pg, iso => isoDia() === iso && !!document.querySelector('#view-hoy .loccard'), iso, 4000); };
// Leo puesto a mano (sin forzar) en una casilla que podía, del 15 en adelante; después, un veto nuevo de ese local y franja.
// Y Mari Luz forzada un miércoles (libra los miércoles). Devuelve dónde.
const prepara = pg => pg.evaluate(() => {
  let leo = null;
  for (const iso of rangoIso('2026-10-16', '2026-10-24')) for (const tid of ['PASARELA_T', 'PASARELA_M', 'EL33_T', 'MONACO_T']) {
    if (leo) break;
    const e = estadoDeIso(iso);
    if (puedeEstar(S, S.staff, e, iso, tid, 'leo', { puesto: 'sala' }).ok && asignar(e, S, S.staff, iso, tid, 'leo', { origen: 'manual', puesto: 'sala' }).ok) leo = { iso, tid };
  }
  const { localId, franja } = partirTurno(leo.tid);
  personaDeId('leo').vetos = (personaDeId('leo').vetos || []).concat([{ localId, franja }]);
  const MIE = '2026-10-21';
  const ml = asignar(estadoDeIso(MIE), S, S.staff, MIE, 'PASARELA_M', 'mariluz', { origen: 'manual', forzar: true, puesto: 'sala', razon: 'falta gente' }).ok ? { iso: MIE, tid: 'PASARELA_M' } : null;
  saveState(); renderVistaActiva();
  return { leo, ml, local: nombreLocal(localId), franja: FRANJA_LBL[franja].toLowerCase() };
});

try {
  // ══ 1) Hoy: la plaza a mano que rompe una regla dura, con la marca de lo forzado y su porqué ══
  await seccion('1) Hoy', async () => {
    const pg = await pagina('1');
    const p = await prepara(pg);
    ok('preparación: Leo a mano en una casilla que podía, y Mari Luz forzada el miércoles 21', !!p.leo && !!p.ml, JSON.stringify(p));
    await irDia(pg, p.leo.iso);
    const ch = await pg.evaluate(a => { const c = document.querySelector(`[data-cas="${a.iso}|${a.tid}"] .pchip[data-pid="leo"]`); const b = c && c.querySelector('.bdg.forz'); return c ? { rompe: c.classList.contains('rompe'), forzado: c.classList.contains('forzado'), marca: b ? b.textContent : null, titulo: b ? b.getAttribute('title') : null, tip: c.dataset.tipstr } : null; }, p.leo);
    ok('la ficha de Leo lleva la marca «!» de lo forzado (sin estar forzada)', !!ch && ch.marca === '!' && ch.rompe && !ch.forzado, JSON.stringify(ch));
    const veto = `no hace ${p.franja === 'mañana' ? 'mañanas' : 'tardes'} en ${p.local}`;
    // (corrección de A7; revisión de cliente B1) el texto, sin repetirse: antes «Ya no puede estar aquí: … — puesta a mano: quítala tú si ya no puede estar»
    ok('y su título dice qué incumple y qué hacer (puesta a mano: no sale sola)', !!ch && ch.titulo === `Puesta a mano: ya no puede estar aquí (${veto}). No se quita sola: quítala tú`, ch && ch.titulo);
    ok('el tooltip de la ficha lo dice también', !!ch && (ch.tip || '').includes(`ya no puede estar aquí (${veto})`), ch && ch.tip);
    ok('Leo sigue en la casilla (lo puesto a mano no lo quita nadie)', await pg.evaluate(a => pidsEn(estadoDeIso(a.iso), a.iso, a.tid).includes('leo'), p.leo));
    await irDia(pg, p.ml.iso);
    const mf = await pg.evaluate(a => { const c = document.querySelector(`[data-cas="${a.iso}|${a.tid}"] .pchip[data-pid="mariluz"]`); const b = c && c.querySelector('.bdg.forz'); return c ? { forzado: c.classList.contains('forzado'), titulo: b ? b.getAttribute('title') : null } : null; }, p.ml);
    // (corrección de A7; B1) «se salta «libra los miércoles» y …» (antes «incumple libra los miércoles, …»)
    ok('el «!» de lo forzado dice todo lo que incumple (antes: «Asignación forzada: rompe una regla»)', !!mf && mf.forzado && /^Puesta a la fuerza: se salta «libra los miércoles» y «nunca con Lavinia/.test(mf.titulo || ''), JSON.stringify(mf));
    await pg.context().close();
  });

  // ══ 2) la Semana: el título de la forzada dice qué incumple; la que rompe una regla dura, el mismo borde y su porqué ══
  await seccion('2) Semana', async () => {
    const pg = await pagina('2');
    const p = await prepara(pg);
    await vista(pg, 'semana');   // (la pestaña abre la semana del día en pantalla: luego se va a la del 21)
    await pg.evaluate(l => { S.semLunes = mondayOf(l); renderSemana(); }, p.ml.iso);
    const w = await pg.evaluate(a => { const b = document.querySelector(`[data-wpers="${a.iso}|${a.tid}|mariluz"]`); return b ? { forzado: b.classList.contains('forzado'), tip: b.dataset.tipstr } : null; }, p.ml);
    ok('la ficha forzada de Mari Luz: su título dice qué incumple', !!w && w.forzado && /Puesta a la fuerza: se salta «libra los miércoles»/.test(w.tip || ''), JSON.stringify(w));
    await pg.evaluate(l => { S.semLunes = mondayOf(l); renderSemana(); }, p.leo.iso);
    const l = await pg.evaluate(a => { const b = document.querySelector(`[data-wpers="${a.iso}|${a.tid}|leo"]`); return b ? { rompe: b.classList.contains('rompe'), outline: getComputedStyle(b).outlineStyle, tip: b.dataset.tipstr } : null; }, p.leo);
    ok('la de Leo (a mano, con el veto nuevo) lleva el mismo borde que lo forzado y lo dice', !!l && l.rompe && l.outline === 'solid' && /Puesta a mano: ya no puede estar aquí \(no hace/.test(l.tip || ''), JSON.stringify(l));
    await pg.context().close();
  });

  // ══ 3) la Revisión: lo que regenerar retira, en rojo; lo ya pasado, aparte y en gris ══
  await seccion('3) Revisión', async () => {
    const pg = await pagina('3');
    const par = await pg.evaluate(() => {
      // Tere pasa a «solo Bar Mónaco»; y un «nunca con» nuevo entre las dos que más coinciden en octubre
      personaDeId('tere').locales = ['MONACO'];
      const e = estadoDeIso('2026-10-01'), cuenta = new Map();
      for (const porT of Object.values(e.asig)) for (const l of Object.values(porT)) for (let i = 0; i < l.length; i++) for (let k = i + 1; k < l.length; k++) { const key = [l[i].pid, l[k].pid].sort().join('|'); cuenta.set(key, (cuenta.get(key) || 0) + 1); }
      const [a, b] = [...cuenta.entries()].sort((x, y) => y[1] - x[1])[0][0].split('|');
      ponerNuncaCon(S.staff, a, b, {}); saveState(); renderVistaActiva();
      return [a, b];
    });
    await clic(pg, '#topRevisar');
    await llega(pg, () => !!document.querySelector('#revOvl .revitem'), null, 5000);
    const r = await pg.evaluate(() => ({
      grupos: [...document.querySelectorAll('#revOvl .revgrp')].map(g => g.textContent.trim()),
      items: [...document.querySelectorAll('#revOvl .revitem')].map(x => ({ nivel: ['alta', 'media', 'info', 'autorizado', 'pasado'].find(n => x.classList.contains(n)), iso: (x.querySelector('[data-irdia]') || {}).dataset.irdia, msg: x.querySelector('.msg').textContent })),
      sub: (document.querySelector('#revOvl .revsub') || {}).textContent || '',
    }));
    const tereRoja = r.items.filter(x => x.nivel === 'alta' && /: Tere: solo Bar Mónaco — sale al volver a generar la semana$/.test(x.msg));
    ok('Tere «solo Bar Mónaco» va en rojo, con qué hacer (regenerar la retira)', tereRoja.length > 0, JSON.stringify(r.items.filter(x => /Tere/.test(x.msg)).slice(0, 3)));
    ok('y ninguna línea de Tere en ámbar', !r.items.some(x => x.nivel === 'media' && /Tere: solo Bar Mónaco/.test(x.msg)));
    ok('nada de un día ya pasado en rojo ni en ámbar', !r.items.some(x => (x.nivel === 'alta' || x.nivel === 'media') && x.iso < '2026-10-15'), JSON.stringify(r.items.filter(x => (x.nivel === 'alta' || x.nivel === 'media') && x.iso < '2026-10-15').slice(0, 3)));
    const pas = r.items.filter(x => x.nivel === 'pasado');
    ok(`lo pasado va aparte, en gris (${pas.length} líneas, el «nunca con» de ${par.join(' y ')} incluido)`, pas.length > 0 && pas.every(x => x.iso < '2026-10-15') && pas.some(x => /no pueden coincidir/.test(x.msg)), JSON.stringify(pas.slice(0, 3)));
    ok('en su grupo, el último: «Ya pasado · para que lo sepas»', /^YA PASADO · PARA QUE LO SEPAS · \d+$/.test(r.grupos[r.grupos.length - 1] || ''), JSON.stringify(r.grupos));
    ok('lo de hoy en adelante del «nunca con», en rojo como siempre', r.items.some(x => x.nivel === 'alta' && x.iso >= '2026-10-15' && /no pueden coincidir/.test(x.msg)));
    ok('el texto de arriba lo explica', /quien ya no puede estar en su sitio/.test(r.sub) && /días ya pasados va al final, en gris/.test(r.sub), r.sub);
    const gris = await pg.evaluate(() => { const x = document.querySelector('#revOvl .revitem.pasado'); return x ? getComputedStyle(x).borderLeftColor : null; });
    const rojo = await pg.evaluate(() => { const x = document.querySelector('#revOvl .revitem.alta'); return x ? getComputedStyle(x).borderLeftColor : null; });
    ok('la línea pasada no lleva el borde rojo', !!gris && gris !== rojo, `${gris} / ${rojo}`);
    await pg.context().close();
  });

  // ══ 4) móvil: la casilla de las opciones del Generador, a la altura de la primera línea ══
  await seccion('4) Generador en el móvil', async () => {
    const pg = await pagina('4', { movil: true });
    await pg.evaluate(() => irAGenerador({ desde: '2026-10-12', hasta: '2026-10-18' }));
    await llega(pg, () => document.querySelectorAll('.genopt').length >= 3, null, 5000);
    const m = await pg.$$eval('.genopt', ls => ls.map(l => {
      // la primera línea del texto: la caja del primer carácter (el span es un elemento flex: su caja es la del párrafo entero)
      const i = l.querySelector('input').getBoundingClientRect(), s = l.querySelector('span');
      const tn = document.createTreeWalker(s, NodeFilter.SHOW_TEXT).nextNode();
      const r = document.createRange(); r.setStart(tn, 0); r.setEnd(tn, 1);
      const lin = r.getBoundingClientRect();
      return { txt: l.textContent.trim().slice(0, 18), centroCasilla: i.top + i.height / 2, centroLinea: lin.top + lin.height / 2, alto: i.height };
    }));
    ok('las tres casillas, centradas en la primera línea de su texto (±6 px)', m.length >= 3 && m.every(x => Math.abs(x.centroCasilla - x.centroLinea) <= 6), JSON.stringify(m));
    await pg.context().close();
  });

  // ══ 5) el Mes, al quitar un día de una ausencia, dice quién entró por ella ══
  await seccion('5) Mes', async () => {
    const pg = await pagina('5');
    // Susana Luna, de vacaciones del 16 al 18 desde Equipo: Roberto entra por ella el domingo 18 en Zapatillera por la tarde
    await pg.evaluate(() => altaAusenciaUI('sluna', { tipo: 'VAC', desde: '2026-10-16', hasta: '2026-10-18' }, () => {}));
    if (await llega(pg, () => !!document.querySelector('#ausOvl [data-ausok="guardar"]'), null, 3000) >= 0) await clic(pg, '#ausOvl [data-ausok="guardar"]');
    const rob = await pg.evaluate(() => asignados(estadoDeIso('2026-10-18'), '2026-10-18', 'ZAPA_T').find(x => x.pid === 'roberto'));
    ok('preparación: Roberto entra por Susana Luna el domingo 18', !!rob && (rob.porAusenciaDe === 'sluna' || rob.por === 'sluna'), JSON.stringify(rob));
    await vista(pg, 'mes');
    await pg.evaluate(() => { window.__toasts = []; });
    const celda = '[data-asig="sluna|2026-10-18"]';
    ok('la casilla de Susana Luna del 18 en el Mes', await clic(pg, celda));
    await llega(pg, () => !!document.querySelector('[data-dp="quitaraus"]'), null, 3000);
    ok('«Quitar la ausencia de este día»', await clic(pg, '[data-dp="quitaraus"]'));
    await llega(pg, () => (window.__toasts || []).length > 0, null, 3000);
    const t = await pg.evaluate(() => window.__toasts.join(' | '));
    ok('el aviso dice que vuelve y quién entró por ella (como Equipo)', /Ausencia retirada · Susana Luna vuelve a sus turnos al volver a generar la semana\. Roberto entró por Susana Luna el dom 18: sale al volver a generar la semana, o quítalo ahora\./.test(t), t);
    await pg.context().close();
  });

  // ══ 6) Equipo, con la hora: a las 20:00 la mañana de hoy ya está trabajada ══
  await seccion('6) Equipo a las 20:00', async () => {
    const pg = await pagina('6', { reloj: `${HOY}T20:00:00+02:00` });
    const antes = await pg.evaluate(() => ({ m: pidsEn(estadoDeIso('2026-10-15'), '2026-10-15', 'ZAPA_M'), t: pidsEn(estadoDeIso('2026-10-15'), '2026-10-15', 'ZAPA_T') }));
    ok('preparación: Adrián hoy en Zapatillera mañana y tarde; Roberto, solo por la tarde', antes.m.includes('adrian') && antes.t.includes('adrian') && !antes.m.includes('roberto'), JSON.stringify(antes));
    await pg.evaluate(() => altaAusenciaUI('adrian', { tipo: 'BAJ', desde: '2026-10-15', hasta: '2026-10-15' }, () => {}));
    await llega(pg, () => !!document.querySelector('#ausOvl'), null, 3000);
    const conf = await pg.evaluate(() => (document.querySelector('#ausOvl') || {}).textContent || '');
    ok('la confirmación dice que la mañana de hoy ya ha terminado y nadie entra en ella', /Hoy, la mañana ya ha terminado: Adrián sale de ese turno, pero no se pone a nadie en su sitio/.test(conf), conf.replace(/\s+/g, ' ').slice(0, 400));
    // (corrección de A7; revisión de cliente S1) y, con la ausencia del día entero, le sugiere apuntarla solo por la tarde
    ok('y sugiere: «¿Trabajó la mañana de hoy? Apunta hoy la ausencia solo por la tarde»', /¿Trabajó la mañana de hoy\? Apunta hoy la ausencia solo por la tarde\./.test(conf), conf.replace(/\s+/g, ' ').slice(0, 500));
    await clic(pg, '#ausOvl [data-ausok="guardar"]');
    await llega(pg, () => !document.querySelector('#ausOvl'), null, 3000);
    const despues = await pg.evaluate(() => pidsEn(estadoDeIso('2026-10-15'), '2026-10-15', 'ZAPA_M'));
    ok('Roberto no entra en la mañana ya trabajada (y Adrián sale de ella)', !despues.includes('roberto') && !despues.includes('adrian'), JSON.stringify(despues));
    await pg.context().close();
  });

  // ══ 7) un cierre de domingos sueltos: «hasta» el final de su tramo ══
  await seccion('7) Cierre de domingos', async () => {
    const pg = await pagina('7');
    await pg.evaluate(() => { S.cierresPuntuales = (S.cierresPuntuales || []).concat([{ id: 'cie_dom', localId: 'MONACO', dias: { '2026-10-18': ['T'], '2026-10-25': ['T'], '2026-11-01': ['T'] }, motivo: 'otro', detalle: 'inventario', decisiones: {}, retirados: [] }]); saveState(); });
    await irDia(pg, '2026-10-18');
    const txt = await pg.evaluate(() => { const c = document.querySelector('[data-cas="2026-10-18|MONACO_T"] .cascerr'); return c ? c.textContent.replace(/\s+/g, ' ').trim() : null; });
    ok('el domingo 18 el Mónaco está cerrado por la tarde «hasta dom 18» (el lunes abre), no «hasta dom 01»', !!txt && /\(hasta dom 18\)/.test(txt), txt);
    await pg.context().close();
  });

  // ══ CORRECCIÓN TRAS LA REVISIÓN (01/10) ══
  // 8) C-H1, C-H2 y M-B3: el miércoles 14 a las 17:30 Tere pasa a «solo Bar Mónaco». La mañana de hoy (07:00–16:00) ya se trabajó:
  //    ni «!» ni borde en ella ni en los días de antes, la Revisión la deja en «Ya pasado» y el Generador («Solo desde hoy») no la
  //    toca: sus horas de lo ya trabajado se quedan. Lo de mañana sí lleva la marca y sale al regenerar
  await seccion('8) C-H1 a las 17:30', async () => {
    const H = '2026-10-14';
    const pg = await pagina('8', { reloj: `${H}T17:30:00+02:00` });
    const horas = () => pg.evaluate(H => { const hasta = iso => { const c = JSON.parse(JSON.stringify(S.meses)); for (const k of Object.keys(c)) for (const iso2 of Object.keys(c[k].asig || {})) if (iso2 > iso) delete c[k].asig[iso2]; return horasPersonaMes(S, S.staff, c, 'tere', 2026, 10).minutos / 60; }; return { total: horasPersonaMes(S, S.staff, S.meses, 'tere', 2026, 10).minutos / 60, hastaHoy: hasta(H) }; }, H);
    const h0 = await horas();
    await pg.evaluate(() => { personaDeId('tere').locales = ['MONACO']; saveState(); renderVistaActiva(); });
    await irDia(pg, H);
    const marca = (iso, tid) => pg.evaluate(a => { const c = document.querySelector(`[data-cas="${a.iso}|${a.tid}"] .pchip[data-pid="tere"]`); return c ? { rompe: c.classList.contains('rompe'), bang: !!c.querySelector('.bdg.forz') } : null; }, { iso, tid });
    const hoyM = await marca(H, 'PASARELA_M');
    ok('Hoy (17:30): la mañana de hoy, ya trabajada, sin «!» ni borde', !!hoyM && !hoyM.rompe && !hoyM.bang, JSON.stringify(hoyM));
    await irDia(pg, '2026-10-13');
    const ayer = await marca('2026-10-13', 'PASARELA_M');
    ok('ni el martes 13, ya pasado', !!ayer && !ayer.rompe && !ayer.bang, JSON.stringify(ayer));
    await irDia(pg, '2026-10-15');
    const man = await marca('2026-10-15', 'PASARELA_M');
    ok('el jueves 15 sí: «!» y borde (sale al volver a generar)', !!man && man.rompe && man.bang, JSON.stringify(man));
    await vista(pg, 'semana');
    await pg.evaluate(l => { S.semLunes = l; renderSemana(); }, '2026-10-12');
    const sem = await pg.evaluate(() => ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15'].map(iso => { const b = document.querySelector(`[data-wpers="${iso}|PASARELA_M|tere"]`); return b ? [iso, b.classList.contains('rompe'), /Ya no puede estar aquí/.test(b.dataset.tipstr || '')] : [iso, null]; }));
    ok('la Semana: sin borde en el 12, el 13 y la mañana del 14; con borde y su porqué el 15', JSON.stringify(sem) === JSON.stringify([['2026-10-12', false, false], ['2026-10-13', false, false], ['2026-10-14', false, false], ['2026-10-15', true, true]]), JSON.stringify(sem));
    await clic(pg, '#topRevisar');
    await llega(pg, () => !!document.querySelector('#revOvl .revitem'), null, 5000);
    const rev = await pg.evaluate(() => [...document.querySelectorAll('#revOvl .revitem')].map(x => ({ nivel: ['alta', 'media', 'info', 'autorizado', 'pasado'].find(n => x.classList.contains(n)), iso: (x.querySelector('[data-irdia]') || {}).dataset.irdia, msg: x.querySelector('.msg').textContent })).filter(x => /Tere/.test(x.msg)));
    // (con C-B3, los días de una misma casilla van en una línea: el miércoles 14 cierra la de «Ya pasado» y la roja empieza el jueves 15)
    ok('la Revisión: la mañana de hoy de Tere va en «Ya pasado»; la del jueves 15, en rojo', rev.some(x => x.nivel === 'pasado' && /(al|el) mié 14: Tere: solo Bar Mónaco$/.test(x.msg)) && !rev.some(x => x.nivel !== 'pasado' && /mié 14|miércoles 14/.test(x.msg)) && rev.some(x => x.iso === '2026-10-15' && x.nivel === 'alta'), JSON.stringify(rev));
    await pg.evaluate(() => document.querySelector('#revOvl').remove());
    await vista(pg, 'generador');
    await pg.evaluate(() => { GEN.modo = 'semana'; GEN.lunes = mondayOf(isoHoy()); GEN.previa = null; renderGenerador(); });
    await clic(pg, '#genPrevia');
    await llega(pg, () => !!(GEN.previa && GEN.previa.semana), null, 15000);
    const ret = await pg.evaluate(() => (GEN.previa.retirados || []).filter(x => x.pid === 'tere').map(x => x.iso));
    ok('el Generador («Solo desde hoy», marcado) retira a Tere el 15 y el 16, no hoy', JSON.stringify(ret) === JSON.stringify(['2026-10-15', '2026-10-16']), JSON.stringify(ret));
    await clic(pg, '#genAplicar');
    await llega(pg, () => !GEN.previa, null, 5000);
    const h1 = await horas();
    ok(`las horas de Tere de lo ya trabajado se quedan (${h0.hastaHoy} h hasta hoy; el total, ${h0.total} → ${h1.total}: solo el 15 y el 16, que aún no se han trabajado)`, h1.hastaHoy === h0.hastaHoy && h1.total === h0.total - 16 && await pg.evaluate(H => pidsEn(estadoDeIso(H), H, 'PASARELA_M').includes('tere'), H), JSON.stringify([h0, h1]));
    await pg.context().close();
  });

  // 9) M-1: la pareja «nunca con» Cristian–Esmeralda en la mañana del Mónaco: la «!» solo en la que sale al regenerar (Cristian)
  await seccion('9) M-1 la pareja', async () => {
    const pg = await pagina('9');
    await pg.evaluate(() => { ponerNuncaCon(S.staff, 'cristian', 'esmeralda', {}); saveState(); renderVistaActiva(); });
    await irDia(pg, HOY);
    const m = await pg.evaluate(() => ['cristian', 'esmeralda'].map(pid => { const c = document.querySelector(`[data-cas="2026-10-15|MONACO_M"] .pchip[data-pid="${pid}"]`); const b = c && c.querySelector('.bdg.forz'); return [pid, c ? !!b : null, b ? b.getAttribute('title') : '']; }));
    ok('Cristian, con «!» y «sale al volver a generar»; Esmeralda (se queda, lleva la cocina), sin marca', m[0][1] === true && /sale al volver a generar/.test(m[0][2]) && m[1][1] === false, JSON.stringify(m));
    await pg.context().close();
  });

  // 10) C-H3: en el móvil, tocar la ficha con «!» abre el menú, y el menú dice la frase entera: qué incumple y qué hacer, en rojo
  await seccion('10) C-H3 menú en el móvil', async () => {
    const pg = await pagina('10', { movil: true });
    const p = await prepara(pg);
    await irDia(pg, p.leo.iso);
    await pg.tap(`[data-cas="${p.leo.iso}|${p.leo.tid}"] .pchip[data-pid="leo"] .pnom`);
    await llega(pg, () => !!document.querySelector('#menuTurnoPop'), null, 3000);
    const menu = await pg.evaluate(() => { const r = document.querySelector('#menuTurnoPop [data-incumple]'); return r ? { txt: r.textContent, color: getComputedStyle(r).color } : null; });
    const rojo = await pg.evaluate(() => { const d = document.createElement('span'); d.style.color = 'var(--bad)'; document.body.appendChild(d); const c = getComputedStyle(d).color; d.remove(); return c; });
    ok('el menú dice qué incumple y qué hacer (puesta a mano: no se quita sola), en rojo', !!menu && /^Puesta a mano: ya no puede estar aquí \(no hace (mañanas|tardes) en [^)]+\)\. No se quita sola: quítala tú/.test(menu.txt) && menu.color === rojo, JSON.stringify([menu, rojo]));
    await pg.context().close();
  });

  // 11) D-4b: el Mes marca lo que ya no puede estar con la misma lectura que Hoy y la Semana (y nada en lo ya trabajado)
  await seccion('11) D-4b el Mes', async () => {
    const pg = await pagina('11');
    await pg.evaluate(() => { personaDeId('tere').locales = ['MONACO']; saveState(); });
    await vista(pg, 'mes');
    const pills = await pg.evaluate(() => ['2026-10-14', '2026-10-15'].map(iso => { const c = document.querySelector(`[data-asig="tere|${iso}"] .pill`); return c ? [iso, !!c.querySelector('.fz'), /Ya no puede estar aquí/.test(c.dataset.tipstr || '')] : [iso, null]; }));
    ok('Tere en el Mes: el 14 (ya pasado) sin marca; el 15, con la marca roja y su porqué', JSON.stringify(pills) === JSON.stringify([['2026-10-14', false, false], ['2026-10-15', true, true]]), JSON.stringify(pills));
    await pg.context().close();
  });

  // 12) C-H4: quitar un día YA PASADO de una ausencia (desde el Mes y desde Equipo): regenerar no lo toca, así que el aviso dice qué
  //     hacer a mano. El jueves 15 se apuntaron las vacaciones de Susana Luna del 16 al 18 y Roberto entró por ella el domingo 18;
  //     el jueves 22 se sabe que el domingo sí trabajó
  await seccion('12) C-H4 ausencia ya pasada', async () => {
    const pg = await pagina('12', { reloj: '2026-10-22T10:00:00+02:00' });
    const prep = () => pg.evaluate(() => {
      const p = personaDeId('sluna');
      p.ausencias = (p.ausencias || []).filter(a => !(a.tipo === 'VAC' && a.desde === '2026-10-16'));
      anadirAusencia(p, { tipo: 'VAC', desde: '2026-10-16', hasta: '2026-10-18' });
      cubrirAusencia(S, S.staff, estadoRango('2026-10-16', '2026-10-18', true), 'sluna', '2026-10-16', '2026-10-18', null, { desdeIso: '2026-10-15', meses: S.meses });
      saveState(); renderVistaActiva();
      return asignados(estadoDeIso('2026-10-18'), '2026-10-18', 'ZAPA_T').find(x => x.pid === 'roberto');
    });
    const rob = await prep();
    ok('preparación: Roberto entró por Susana Luna el domingo 18', !!rob && (rob.porAusenciaDe === 'sluna' || rob.por === 'sluna'), JSON.stringify(rob));
    await vista(pg, 'mes');
    await pg.evaluate(() => { window.__toasts = []; });
    await clic(pg, '[data-asig="sluna|2026-10-18"]');
    await llega(pg, () => !!document.querySelector('[data-dp="quitaraus"]'), null, 3000);
    await clic(pg, '[data-dp="quitaraus"]');
    await llega(pg, () => (window.__toasts || []).length > 0, null, 3000);
    const t = await pg.evaluate(() => window.__toasts.join(' | '));
    ok('el Mes: «Ya ha pasado el dom 18: si trabajó Susana Luna, ponle su turno a mano y quita a Roberto», sin «al volver a generar»', /Ya ha pasado el dom 18: si trabajó Susana Luna, ponle su turno a mano y quita a Roberto\./.test(t) && !/al volver a generar/.test(t), t);
    // desde Equipo, las vacaciones enteras (ya pasadas)
    await prep();
    const aviso = await pg.evaluate(() => { const p = personaDeId('sluna'); const i = p.ausencias.findIndex(a => a.tipo === 'VAC' && a.desde === '2026-10-16'); return quitarAusenciaUI('sluna', i); });
    ok('Equipo: lo mismo con las vacaciones enteras ya pasadas', /Ya han pasado del vie 16 al dom 18: si trabajó Susana Luna, ponle su turno a mano y quita a Roberto\./.test(aviso || '') && !/al volver a generar/.test(aviso || ''), aviso);
    await pg.context().close();
  });

  // 13) C-H5: «Quitar la marca de cocina» a Hojan en la tarde del Mónaco del jueves 15, y luego quitarlo de la casilla: ni la ★ ni el
  //     selector lo recomiendan «para la cocina»; el selector dice que la cocina se quitó a mano y quitarla avisa de lo que significa
  await seccion('13) C-H5 cocina quitada a mano', async () => {
    const pg = await pagina('13');
    const C = '2026-10-15|MONACO_T';
    await irDia(pg, HOY);
    ok('preparación: Hojan lleva la cocina esa tarde', await pg.evaluate(() => asignados(estadoDeIso('2026-10-15'), '2026-10-15', 'MONACO_T').some(x => x.pid === 'hojan' && x.cocina)));
    await pg.evaluate(() => { window.__toasts = []; });
    await clic(pg, `[data-cas="${C}"] .pchip[data-pid="hojan"] .pnom`);
    await llega(pg, () => !!document.querySelector('#menuTurnoPop [data-mt="nococina"]'), null, 3000);
    await clic(pg, '#menuTurnoPop [data-mt="nococina"]');
    await llega(pg, () => (window.__toasts || []).some(t => /a mano/.test(t)), null, 3000);
    const t = await pg.evaluate(() => window.__toasts.join(' | '));
    await irDia(pg, HOY);
    const avi = await pg.evaluate(c => { const ch = document.querySelector(`[data-cas="${c}"] .pchip[data-pid="hojan"]`); const b = ch && ch.querySelector('.bdg.avi'); return ch ? { avi: b ? b.getAttribute('title') : null, bang: !!ch.querySelector('.bdg.forz'), color: b ? getComputedStyle(b).color : null } : null; }, C);
    const ambar = await pg.evaluate(() => { const d = document.createElement('span'); d.style.color = 'var(--warn)'; document.body.appendChild(d); const c = getComputedStyle(d).color; d.remove(); return c; });
    ok('C-S2: Hojan, de sala, lleva el aviso en ámbar en Hoy («solo hace cocina»), sin «!»', !!avi && avi.avi === 'Aviso: solo hace cocina' && !avi.bang && avi.color === ambar, JSON.stringify([avi, ambar]));
    ok('quitar la cocina avisa de lo que significa (nadie la pone sola; Hojan, que solo hace cocina, se queda de sala)', /Bar Mónaco, tarde del jue 15: sin cocina, porque la has quitado tú\. Nada de lo automático la vuelve a poner; Hojan, que solo hace cocina, se queda de sala\./.test(t), t);
    ok('y luego se quita a Hojan de la casilla', await pg.evaluate(() => { const r = desasignarUI('2026-10-15', 'MONACO_T', 'hojan'); renderVistaActiva(); return r && !pidsEn(estadoDeIso('2026-10-15'), '2026-10-15', 'MONACO_T').includes('hojan'); }));
    const star = await pg.evaluate(c => { const b = document.querySelector(`[data-cas="${c}"] [data-sust]`); return b ? b.dataset.sust : null; }, C);
    ok('la ★ de la casilla no es Hojan «para la cocina»', !star || !/\|hojan$/.test(star), star);
    await clic(pg, `[data-cas="${C}"] [data-pick]`);
    await llega(pg, () => !!document.querySelector('#pickerPop'), null, 3000);
    const sel = await pg.evaluate(() => ({ grupos: [...document.querySelectorAll('#pickerPop .pgroup')].map(g => g.textContent.replace(/\s+/g, ' ').trim()), rec: (document.querySelector('#pickerPop .prowp.rec') || {}).dataset ? (document.querySelector('#pickerPop .prowp.rec') || { dataset: {} }).dataset.pickpid : null, cocRec: !!document.querySelector('#pickerPop .prowp.coc.rec') }));
    // (C-S2) antes de quitarlo, Hojan se quedó de sala («solo hace cocina»): un aviso, en ámbar en su ficha de Hoy
    ok('el selector: sin grupo «COCINA … la casilla no tiene cocina» ni recomendación de cocina; dice que se quitó a mano', !sel.cocRec && sel.rec !== 'hojan' && !sel.grupos.some(g => /la casilla no tiene cocina/.test(g)) && sel.grupos.some(g => /^COCINA · quitada a mano/.test(g)), JSON.stringify(sel));
    await pg.context().close();
  });

  // 14) C-B2, C-B3 y C-B4: la Revisión con un «nunca con» y Tere «solo Bar Mónaco»: el título cuenta sin lo pasado; una línea por
  //     pareja (o persona) y casilla con sus días, con qué hacer y el orden de siempre; en el móvil la explicación va plegada y la «×»
  //     va en su barra, sin montarse sobre las líneas
  await seccion('14) C-B2/B3/B4 la Revisión', async () => {
    for (const movil of [false, true]) {
      const pg = await pagina('14' + (movil ? 'm' : ''), { movil });
      await pg.evaluate(() => { personaDeId('tere').locales = ['MONACO']; ponerNuncaCon(S.staff, 'victoria', 'jenny', {}); saveState(); renderVistaActiva(); pintaRevDot(); });
      const titulo = await pg.evaluate(() => document.getElementById('topRevisar').title);
      await pg.evaluate(() => openRevision());
      await llega(pg, () => !!document.querySelector('#revOvl .revitem'), null, 5000);
      const r = await pg.evaluate(() => ({
        h2: document.querySelector('#revOvl .revh2').textContent,
        items: [...document.querySelectorAll('#revOvl .revitem')].map(x => ({ nivel: ['alta', 'media', 'info', 'autorizado', 'pasado'].find(n => x.classList.contains(n)), msg: x.querySelector('.msg').textContent })),
        leyendaAbierta: (document.querySelector('#revOvl details.revleyenda') || {}).open,
        barra: (() => { const b = document.querySelector('#revOvl .revbarra'), x = document.querySelector('#revOvl .revbarra .ovx'); return b && x ? getComputedStyle(b).position : null; })(),
      }));
      const vivos = r.items.filter(x => x.nivel !== 'pasado').length, pasados = r.items.filter(x => x.nivel === 'pasado').length;
      if (!movil) {
        ok(`C-B2: el título cuenta sin lo pasado («${r.h2}») y el botón lo dice en plural de verdad («${titulo}»)`, r.h2 === `${vivos} cosas que mirar (y ${pasados} ya pasadas)` && /^Revisar el mes: \d+ avisos importantes$/.test(titulo), JSON.stringify([r.h2, vivos, pasados, titulo]));
        const pareja = r.items.filter(x => x.nivel === 'alta' && /no pueden coincidir/.test(x.msg));
        ok('C-B3: el «nunca con», siempre «Jenny y Victoria», con qué hacer y una línea por casilla con sus días', pareja.length > 0 && pareja.every(x => /Jenny y Victoria no pueden coincidir — sale (Jenny|Victoria) al volver a generar la semana$/.test(x.msg)) && pareja.some(x => /^El 33 · (mañanas|tardes) del /.test(x.msg)), JSON.stringify(pareja.slice(0, 3)));
        const tere = r.items.filter(x => x.nivel === 'alta' && /Tere: solo Bar Mónaco/.test(x.msg));
        ok('C-B3: Tere, en una línea con los días («Pasarela · mañanas del …: Tere: solo Bar Mónaco — sale al volver a generar la semana»)', tere.length === 1 && /^Pasarela · mañanas del jue 15 al /.test(tere[0].msg) && /: Tere: solo Bar Mónaco — sale al volver a generar la semana$/.test(tere[0].msg), JSON.stringify(tere));
        ok('C-B4: en el escritorio la explicación va abierta', r.leyendaAbierta === true);
      } else {
        ok('C-B4: en el móvil la explicación va plegada y la «×» en su barra fija', r.leyendaAbierta === false && r.barra === 'sticky', JSON.stringify(r.leyendaAbierta) + ' ' + r.barra);
        await pg.evaluate(() => { const c = document.querySelector('#revOvl .ovcard'); c.scrollTop = 600; });
        // la «×» se ve (es lo que hay en su centro) y ningún botón de fecha que se vea (lo que hay en su centro es él) cae debajo de ella
        const choca = await pg.evaluate(() => {
          const xx = document.querySelector('#revOvl .ovx'), x = xx.getBoundingClientRect();
          const enX = document.elementFromPoint(x.left + x.width / 2, x.top + x.height / 2);
          const visibles = [...document.querySelectorAll('#revOvl .revgo')].filter(b => { const r = b.getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return el && b.contains(el); });
          return { xVisible: !!enX && xx.contains(enX), bajo: visibles.filter(b => { const r = b.getBoundingClientRect(); return !(r.right < x.left || r.left > x.right || r.bottom < x.top || r.top > x.bottom); }).length, visibles: visibles.length };
        });
        ok('C-B4: al bajar, la «×» se ve y no se monta sobre los botones de fecha que se ven', choca.xVisible && !choca.bajo && choca.visibles > 0, JSON.stringify(choca));
      }
      await pg.context().close();
    }
  });

  // 15) C-B11: en el Mes, vacaciones de mañana y de tarde el mismo día dicen «VAC» (no «VAC+VAC»); dos distintas, cada una con su franja
  await seccion('15) C-B11 el Mes', async () => {
    const pg = await pagina('15');
    await pg.evaluate(() => {
      const p = personaDeId('ivan'), q = personaDeId('lola');
      anadirAusencia(p, { tipo: 'VAC', desde: '2026-10-28', hasta: '2026-10-28', franjas: ['M'] }); anadirAusencia(p, { tipo: 'VAC', desde: '2026-10-28', hasta: '2026-10-28', franjas: ['T'] });
      anadirAusencia(q, { tipo: 'PERM', desde: '2026-10-28', hasta: '2026-10-28', franjas: ['M'] }); anadirAusencia(q, { tipo: 'VAC', desde: '2026-10-28', hasta: '2026-10-28', franjas: ['T'] });
      for (const [pid, tid] of [['ivan', 'PASARELA_M'], ['ivan', 'PASARELA_T'], ['lola', 'PASARELA_M'], ['lola', 'PASARELA_T']]) retirarEntrada(estadoDeIso('2026-10-28', true), S, S.staff, '2026-10-28', tid, pid);
      saveState();
    });
    await vista(pg, 'mes');
    const t = await pg.evaluate(() => ['ivan', 'lola'].map(pid => { const c = document.querySelector(`[data-asig="${pid}|2026-10-28"] .pill`); return c ? c.textContent.trim() : null; }));
    ok('C-B11: «VAC» con las dos franjas; «PERM·M+VAC·T» con dos distintas', JSON.stringify(t) === JSON.stringify(['VAC', 'PERM·M+VAC·T']), JSON.stringify(t));
    await pg.context().close();
  });

  ok('ningún error de página', errores.length === 0, errores.join(' | '));
} finally {
  await br.close(); srv.close();
  console.log(`\n(${((Date.now() - t0) / 1000).toFixed(1)} s)`);
}
resumen();
