// GENERADOR Y RETIRADA EN LA INTERFAZ TRAS LA FASE A4 DE LA AUDITORÍA (30/09), CON CLICS:
//  1) regenerar retira lo automático que ahora rompe una regla dura: Tere pasa a «solo Bar Mónaco» en su ficha, el Generador
//     → Semana del 28/09 lista «Se retira · Tere … solo Bar Mónaco», al volcar sale de Pasarela y Ctrl+Z la devuelve (H4, D15);
//     y «(lo puesto a mano no se toca)» solo cuando de verdad hay plazas a mano (E6);
//  2) el pie «Quién libra cada día» enseña a los ausentes con su tipo: Iván de vacaciones del 2 al 4 (E4);
//  3) la condición de cada veto es la suya: con un veto nuevo del Mónaco por la tarde, la de Cristian en Pasarela por la
//     mañana sigue en verde y solo la del Mónaco sale en rojo (E1);
//  4) un hueco «nadie puede abrir» del Generador → Periodo ya no ofrece «Con aviso» a Leo (nunca de primero) (E5); y (01/10,
//     corrección de A4, cliente 12) el porqué de cada «Con aviso» se lee en la fila, no solo al pasar el ratón.
// 01/10 (corrección de A4 tras la revisión de cliente):
//  5) Tere pasa a «solo Bar Mónaco» y se queda sin turnos: no «libra» (sale «sin plaza» en el pie y en la hoja), el Generador
//     dice «Tere se queda sin turnos esta semana», «Se retira» la agrupa en una línea, sin caja con scroll y sin repetirla en
//     «no se pudieron poner», y al volcar el aviso empieza por «Se han retirado…» con el historial agrupado (C1, C6, C7, C8, C9);
//     en el móvil, sin scroll dentro del scroll y con «Más → Deshacer» en vez de Ctrl+Z (C6, C8);
//  6) Periodo libre: la lista entera de lo que se retira, por persona, y el historial con quién y por qué (C2, C7, C9);
//  7) la hoja impresa tiene la fila «Sin trabajo · por un cierre» (C5);
//  8) los ausentes con las dos medias jornadas del día y «otro motivo» con su detalle o «no viene» (H-07, C14);
//  9) el aviso del cambio de día libre dice a quién cubría y a quién vuelve a cubrir (C10).
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
const L28 = '2026-09-28', J1 = '2026-10-01', V2 = '2026-10-02', M6 = '2026-10-06';

async function pagina(etiqueta, movil) {
  const ctx = await br.newContext(movil ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 900 } });
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
async function seccion(nombre, fn) {
  try { await fn(); } catch (e) { ok(`${nombre}: la sección no se interrumpe`, false, e && e.stack ? e.stack.split('\n').slice(0, 4).join(' | ') : e); }
}
const ev = (pg, sel, fn, arg) => pg.$eval(sel, fn, arg).catch(() => null);
const txt = (pg, sel) => ev(pg, sel, x => x.textContent.replace(/\s+/g, ' ').trim());
const clic = (pg, sel) => pg.click(sel, { timeout: 3000 }).then(() => true, () => false);
const vista = async (pg, v) => { if (!await pg.evaluate(v => { const t = document.querySelector(`.tab[data-v="${v}"]`); return !!(t && t.offsetParent); }, v)) await pg.evaluate(v => switchTab(v), v); else await pg.click(`.tab[data-v="${v}"]`); return llega(pg, v => { const s = document.getElementById('view-' + v); return !!s && !s.classList.contains('hidden'); }, v, 4000); };
// dónde está alguien un día en la planilla real
const donde = (pg, iso, pid) => pg.evaluate(([iso, pid]) => { const e = estadoDeIso(iso); return turnosDe(S).filter(t => pidsEn(e, iso, t.id).includes(pid)).map(t => t.id); }, [iso, pid]);
async function generadorSemana(pg, lunes) {
  await vista(pg, 'generador');
  if (await pg.evaluate(() => GEN.modo !== 'semana')) await clic(pg, '[data-modo="semana"]');
  for (let i = 0; i < 10 && await pg.evaluate(l => GEN.lunes < l, lunes); i++) await clic(pg, '#gsNext');
  for (let i = 0; i < 10 && await pg.evaluate(l => GEN.lunes > l, lunes); i++) await clic(pg, '#gsPrev');
}
async function generar(pg) { await clic(pg, '#genPrevia'); return llega(pg, () => !!(GEN.previa && GEN.previa.semana), null, 15000); }

try {
  // ══ 1) regenerar retira lo automático que rompe una regla dura, con Ctrl+Z; «(lo puesto a mano no se toca)» solo con plazas a mano ══
  console.log('── 1) Tere pasa a «solo Bar Mónaco»: el Generador de la semana del 28/09 la retira de Pasarela, volcar y Ctrl+Z');
  {
    const pg = await pagina('retirada');
    await seccion('retirada', async () => {
      ok('preparado: Tere está en Pasarela por la mañana el jueves 1 (semana tipo, en automático)', (await donde(pg, J1, 'tere')).includes('PASARELA_M') && await pg.evaluate(iso => esAutomatica(asignados(estadoDeIso(iso), iso, 'PASARELA_M').find(x => x.pid === 'tere')), J1));
      await pg.evaluate(() => { personaDeId('tere').locales = ['MONACO']; saveState(); });
      await generadorSemana(pg, L28);
      ok('el Generador está en la semana del 28/09', await pg.evaluate(() => GEN.lunes) === L28);
      const intro = await txt(pg, '#genRoot .genpanel');
      ok('el texto del Generador dice que se retira lo que rompe una regla dura, no solo el día libre', /ahora rompe una regla dura \(un día libre, una ausencia, un local o una franja que ya no hace, un veto, el standby, un «nunca con» estricto\) se retira/.test(intro || ''), intro);
      ok('se genera la vista previa', await generar(pg) >= 0);
      const ret = await pg.evaluate(() => (GEN.previa.retirados || []).filter(x => x.pid === 'tere').map(x => [x.iso, x.turnoId, x.motivo]));
      ok('la vista previa retira a Tere de Pasarela con el motivo de la puerta («solo Bar Mónaco»)', ret.length >= 3 && ret.every(x => x[1] === 'PASARELA_M' && x[2] === 'solo Bar Mónaco'), j(ret));
      const lista = await txt(pg, '#genRoot .gretlist');
      ok('«Se retira» lo lista: «Tere · solo Bar Mónaco: …» (01/10: agrupada por persona y motivo)', /Tere · solo Bar Mónaco: /.test(lista || ''), lista);
      const res = await txt(pg, '#genRoot .gsres');
      ok('sin plazas a mano, el resumen no dice «(lo puesto a mano no se toca)»', !!res && !/lo puesto a mano no se toca/.test(res), res);
      await clic(pg, '#genAplicar');
      ok('al volcar, Tere ya no está en Pasarela el jueves 1', await llega(pg, iso => !turnosDe(S).some(t => t.id === 'PASARELA_M' && pidsEn(estadoDeIso(iso), iso, t.id).includes('tere')), J1, 4000) >= 0, j(await donde(pg, J1, 'tere')));
      ok('el historial lo apunta con el motivo', await pg.evaluate(() => /Generador semanal.*retirad.*Tere · solo Bar Mónaco: .*jue 1\/10/.test((S.historial[0] || {}).txt)), await pg.evaluate(() => (S.historial[0] || {}).txt));
      await pg.keyboard.press('Control+z');
      ok('Ctrl+Z la devuelve a Pasarela', await llega(pg, iso => pidsEn(estadoDeIso(iso), iso, 'PASARELA_M').includes('tere'), J1, 4000) >= 0, j(await donde(pg, J1, 'tere')));
      // con una plaza puesta a mano en la semana, el resumen sí lo dice
      const forzado = await pg.evaluate(iso => { personaDeId('tere').locales = ['PASARELA', 'MONACO']; const e = estadoDeIso(iso); const r = asignar(e, S, S.staff, iso, 'ZAPA_T', 'leo', { origen: 'manual', forzar: true, puesto: 'sala', razon: 'prueba' }); saveState(); return r.ok; }, J1);
      ok('preparado: Leo forzado en Zapatillera el jueves 1 por la tarde (libra los jueves)', forzado);
      await generadorSemana(pg, L28);
      ok('se vuelve a generar', await generar(pg) >= 0);
      const res2 = await txt(pg, '#genRoot .gsres');
      ok('con una plaza a mano (Leo forzado), el resumen dice «(lo puesto a mano no se toca)»', /condici(ón|ones) no se cumple(n)? \(lo puesto a mano no se toca\)/.test(res2 || ''), res2);
    });
    await pg.context().close();
  }

  // ══ 2) los ausentes en el pie del Generador ══
  console.log('── 2) Iván de vacaciones del 2 al 4/10: el pie «Quién libra cada día» lo enseña con su tipo');
  {
    const pg = await pagina('ausentes');
    await seccion('ausentes', async () => {
      await pg.evaluate(() => { anadirAusencia(personaDeId('ivan'), { tipo: 'VAC', desde: '2026-10-02', hasta: '2026-10-04' }); anadirAusencia(personaDeId('juani'), { tipo: 'PERM', desde: '2026-10-01', hasta: '2026-10-01', franjas: ['M'] }); saveState(); });
      await generadorSemana(pg, L28);
      ok('se genera la vista previa', await generar(pg) >= 0);
      const aus = await pg.evaluate(() => Object.fromEntries(Object.entries(GEN.previa.ausentes || {}).map(([k, v]) => [k, v.map(x => x.pid + ':' + x.tipo + (x.franjas ? '/' + x.franjas.join('') : ''))])));
      ok('el modelo da los ausentes por día: Iván de vacaciones el viernes, Juani de permiso por la mañana el jueves, las bajas también', (aus[V2] || []).includes('ivan:VAC') && (aus[J1] || []).includes('juani:PERM/M') && (aus[L28] || []).includes('laura:BAJ'), j(aus));
      const fila = await txt(pg, '#genRoot .glib tr.gsaus');
      ok('el pie tiene la fila «Ausentes · vacaciones · permisos · libres»', /^Ausentes ?vacaciones · permisos · libres/.test(fila || ''), fila);
      ok('con «Iván · vacaciones» y «Juani · permiso por la mañana»', /Iván · vacaciones/.test(fila || '') && /Juani · permiso por la mañana/.test(fila || ''), fila);
      ok('y las bajas siguen en la cabecera, no en la fila', !/Laura/.test(fila || '') && /de baja: .*Laura/.test(await txt(pg, '#genRoot .glib thead') || ''), fila);
      ok('Iván no sale además como si librara el viernes', !(await pg.evaluate(() => GEN.previa.libran['2026-10-02'].includes('ivan'))));
    });
    await pg.context().close();
  }

  // ══ 3) la condición de cada veto es la suya ══
  console.log('── 3) Cristian con un veto nuevo del Mónaco por la tarde: solo esa condición sale en rojo');
  {
    const pg = await pagina('veto');
    await seccion('veto', async () => {
      // la semana ya está generada con Cristian en el Mónaco por la tarde; el veto se apunta después (para que no se retire, se mira
      // la vista previa sin retirar: lo que importa aquí es la condición, con la plaza puesta a mano)
      await pg.evaluate(() => { const e = estadoDeIso('2026-10-02'); const en = asignados(e, '2026-10-02', 'MONACO_T').find(x => x.pid === 'cristian'); if (en) { en.origen = 'manual'; } personaDeId('cristian').vetos.push({ localId: 'MONACO', franja: 'T' }); saveState(); });
      await generadorSemana(pg, L28);
      ok('se genera la vista previa', await generar(pg) >= 0);
      const conds = await pg.$$eval('#genRoot .gcond', xs => xs.filter(x => /Cristian no hace/.test(x.textContent)).map(x => ({ rota: x.classList.contains('rota'), txt: x.textContent.replace(/\s+/g, ' ').trim() })));
      const pas = conds.find(c => /Cristian no hace mañanas en Pasarela/.test(c.txt)), mon = conds.find(c => /Cristian no hace tardes en Bar Mónaco/.test(c.txt));
      ok('las dos condiciones de sus vetos están', !!pas && !!mon, j(conds));
      ok('la de Pasarela por la mañana sigue en verde', !!pas && !pas.rota && !/Bar Mónaco tarde/.test(pas.txt), pas && pas.txt);
      ok('y solo la del Mónaco por la tarde sale en rojo, con el día', !!mon && mon.rota && /viernes 2: Bar Mónaco tarde/.test(mon.txt), mon && mon.txt);
    });
    await pg.context().close();
  }

  // ══ 4) el hueco «nadie puede abrir» del Periodo ══
  console.log('── 4) El 33 el martes 6 por la tarde con Cristian a mano y Noe y Victoria de vacaciones: «Con aviso» no ofrece a Leo');
  {
    const pg = await pagina('primero');
    await seccion('primero', async () => {
      await pg.evaluate(iso => {
        const e = estadoDeIso(iso);
        for (const pid of pidsEn(e, iso, 'EL33_T').slice()) desasignar(e, iso, 'EL33_T', pid);
        desasignar(e, iso, 'MONACO_T', 'cristian');   // su plaza fija de los martes: si no, «ya en Bar Mónaco esta tarde»
        asignar(e, S, S.staff, iso, 'EL33_T', 'cristian', { origen: 'manual', puesto: 'sala', forzar: true, razon: 'prueba' });
        for (const pid of ['noe', 'victoria']) anadirAusencia(personaDeId(pid), { tipo: 'VAC', desde: iso, hasta: iso });
        saveState();
      }, M6);
      await vista(pg, 'generador');
      if (await pg.evaluate(() => GEN.modo !== 'periodo')) await clic(pg, '[data-modo="periodo"]');
      await pg.fill('#genD1', M6); await pg.$eval('#genD1', x => x.dispatchEvent(new Event('change', { bubbles: true })));
      await pg.fill('#genD2', M6); await pg.$eval('#genD2', x => x.dispatchEvent(new Event('change', { bubbles: true })));
      ok('preparado: Cristian a mano y solo en El 33 por la tarde el martes 6', await pg.evaluate(iso => pidsEn(estadoDeIso(iso), iso, 'EL33_T').join() === 'cristian', M6));
      ok('el Periodo es el martes 6', await pg.evaluate(() => GEN.desde === '2026-10-06' && GEN.hasta === '2026-10-06'), await pg.evaluate(() => [GEN.desde, GEN.hasta]));
      await clic(pg, '#genPrevia');
      ok('se genera la vista previa', await llega(pg, () => !!(GEN.previa && !GEN.previa.semana), null, 15000) >= 0);
      const huecos = await pg.$$eval('#genRes .genrow.hueco', xs => xs.map(x => ({ k: x.dataset.hueco, botones: [...x.querySelectorAll('[data-aplicaruno]')].map(b => b.dataset.aplicaruno.split('|').slice(2).join('|')), txt: x.textContent.replace(/\s+/g, ' ').trim() })));
      const hp = huecos.find(h => h.k === `${M6}|EL33_T|primero`);
      ok('El 33 por la tarde queda con el hueco «Nadie puede abrir (1.ª posición)»', !!hp, j(huecos.map(h => h.k)));
      ok('y «Con aviso» no ofrece a Leo (nunca de primero): nadie de la lista con aviso es alguien que no puede abrir', !!hp && !hp.botones.some(b => /^leo\b/.test(b)), hp && j(hp.botones));
      const abren = hp ? await pg.evaluate(([iso, pids]) => pids.map(b => b.split('|')[0]).every(pid => puedePrimero(S, S.staff, estadoDeIso(iso), iso, 'EL33_T', pid).ok), [M6, hp.botones]) : false;
      ok('todo el que se ofrece para ese hueco puede abrir', !!hp && abren, hp && j(hp.botones));
      // (corrección de A4, cliente 12) el porqué de «Con aviso» se lee en la fila (en el móvil no hay ratón para el title)
      const hm = huecos.find(h => h.k === `${M6}|MONACO_T|faltan`);
      ok('el hueco del Mónaco por la tarde ofrece «Con aviso» con el porqué escrito en la fila', !!hm && /Con aviso: .*Yilian.*partido no declarado los martes/.test(hm.txt), hm && hm.txt);
    });
    await pg.context().close();
  }
  // ══ 5) quien se queda sin turnos no «libra»; «Se retira» agrupada y entera; el aviso de volcar (C1, C6, C7, C8, C9) ══
  console.log('── 5) Tere pasa a «solo Bar Mónaco» y el Mónaco está lleno: sin plaza, «se queda sin turnos», «Se retira» en una línea');
  for (const movil of [false, true]) {
    const pg = await pagina(movil ? 'sinturnos-movil' : 'sinturnos', movil);
    const et = movil ? ' (móvil)' : '';
    await seccion('sin turnos' + et, async () => {
      await pg.evaluate(() => { personaDeId('tere').locales = ['MONACO']; saveState(); });
      await generadorSemana(pg, L28);
      ok('se genera la vista previa' + et, await generar(pg) >= 0);
      const lib = await pg.evaluate(() => ({ libran: GEN.previa.libran['2026-09-28'], sinPlaza: GEN.previa.sinPlaza['2026-09-28'], sinTurnos: GEN.previa.sinTurnos }));
      ok('el lunes 28 Tere no «libra»: está sin plaza' + et, !lib.libran.includes('tere') && lib.sinPlaza.includes('tere'), j(lib));
      const celda = await pg.evaluate(() => { const ths = [...document.querySelectorAll('#genRoot .glib thead th')]; const i = ths.findIndex(th => /Lun 28/.test(th.textContent)); const td = document.querySelectorAll('#genRoot .glib tbody tr')[0].children[i]; return td ? td.textContent.replace(/\s+/g, ' ').trim() : null; });
      ok('el pie lo enseña: «Tere · sin plaza», no en «libran»' + et, /Tere · sin plaza/.test(celda || '') && !/libran\s*Tere(?! ·)/.test(celda || ''), celda);
      const aviso = await txt(pg, '#genRoot .gsinturnos');
      ok('el Generador avisa: «Tere se queda sin turnos esta semana»' + et, /Tere se queda sin turnos esta semana/.test(aviso || ''), aviso);
      const lis = await pg.$$eval('#genRoot ul.gretlist li', xs => xs.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
      ok('«Se retira» la pone en UNA línea, con sus días, la franja y el local' + et, lis.filter(l => /Tere/.test(l)).length === 1 && lis.some(l => /^Tere · solo Bar Mónaco: lun 28, .*vie 2 mañana en Pasarela$/.test(l)), j(lis));
      const rech = await pg.evaluate(() => { const h3 = [...document.querySelectorAll('#genRoot .gscol h3')].find(h => /^Plazas de la semana tipo que no se pudieron poner/.test(h.textContent)); const out = []; for (let x = h3 && h3.nextElementSibling; x && x.tagName !== 'H3'; x = x.nextElementSibling) out.push(x.textContent.replace(/\s+/g, ' ').trim()); return out; });
      ok('y no la repite en «Plazas de la semana tipo que no se pudieron poner»' + et, !rech.some(r => /Tere/.test(r) && /solo Bar Mónaco/.test(r)), j(rech));
      const est = await pg.evaluate(() => { const ul = document.querySelector('#genRoot ul.gretlist'), h3 = [...document.querySelectorAll('#genRoot .gscol h3')].find(h => /^Se retira/.test(h.textContent)), cam = document.querySelector('#genRoot ul.gcamblist:not(.gretlist)'); const cs = x => x ? getComputedStyle(x) : {}; return { max: cs(ul).maxHeight, ov: cs(ul).overflowY, mt: parseFloat(cs(h3).marginTop), camMax: cs(cam).maxHeight, camOv: cs(cam).overflowY }; });
      ok('«Se retira» no va en una caja con scroll y su título se separa de la lista de arriba' + et, est.max === 'none' && est.ov === 'visible' && est.mt >= 12, j(est));
      if (movil) ok('en el móvil «Qué ha cambiado» tampoco hace scroll dentro del scroll', est.camMax === 'none' && est.camOv === 'visible', j(est));
      const barra = await txt(pg, '#genRoot .genbar .revsub');
      ok('el texto del botón de volcar dice cómo deshacer en esta pantalla' + et, movil ? !/Ctrl\+Z/.test(barra || '') && /Más → Deshacer/.test(barra || '') : /Ctrl\+Z/.test(barra || ''), barra);
      if (!movil) {
        await clic(pg, '#gsPrint');
        await llega(pg, () => !!document.querySelector('.pxg-lib td[data-libran]'), null, 6000);
        const hoja = await ev(pg, '.pxg-lib td[data-libran="2026-09-28"]', x => x.textContent.replace(/\s+/g, ' ').trim());
        ok('la hoja impresa tampoco la pone a librar: «Tere · sin plaza»', /Tere · sin plaza/.test(hoja || ''), hoja);
        await pg.evaluate(() => cerrarImpresion());
      }
      await clic(pg, '#genAplicar');
      await llega(pg, () => !GEN.previa, null, 5000);
      const toasts = await pg.$$eval('#toasts .toast span', xs => xs.map(x => x.textContent));
      ok('al volcar solo retiradas, el aviso empieza por «Se han retirado 5 plazas que ya no podían estar»' + et, toasts.some(t => /^Se han retirado 5 plazas que ya no podían estar/.test(t)), j(toasts));
      ok('y dice cómo deshacer en esta pantalla' + et, toasts.some(t => movil ? /Más → Deshacer/.test(t) && !/Ctrl\+Z/.test(t) : /Ctrl\+Z para deshacer/.test(t)), j(toasts));
      const hist = await pg.evaluate(() => (S.historial[0] || {}).txt);
      ok('el historial la apunta agrupada, con sus días' + et, /Tere · solo Bar Mónaco: lun 28\/9, .*vie 2\/10 mañana en Pasarela/.test(hist || ''), hist);
    });
    await pg.context().close();
  }

  // ══ 6) Periodo libre: toda la lista de lo que se retira, por persona, y el historial (C2, C7, C9) ══
  console.log('── 6) Periodo del 28/09 al 11/10 con Tere «solo Bar Mónaco» e Iván sin tardes en Pasarela: la lista entera y el historial');
  {
    const pg = await pagina('periodo');
    await seccion('periodo', async () => {
      await pg.evaluate(() => { personaDeId('tere').locales = ['MONACO']; personaDeId('ivan').vetos.push({ localId: 'PASARELA', franja: 'T' }); saveState(); });
      await vista(pg, 'generador');
      if (await pg.evaluate(() => GEN.modo !== 'periodo')) await clic(pg, '[data-modo="periodo"]');
      await pg.fill('#genD1', L28); await pg.$eval('#genD1', x => x.dispatchEvent(new Event('change', { bubbles: true })));
      await pg.fill('#genD2', '2026-10-11'); await pg.$eval('#genD2', x => x.dispatchEvent(new Event('change', { bubbles: true })));
      await pg.evaluate(() => { GEN.opts.desdeHoy = false; });
      const panel = await txt(pg, '#genRoot .genpanel');
      ok('el texto del panel dice que regenerar retira lo que ya no puede estar, no solo el día libre', /ya no puede estar \(un día libre, una ausencia, un local o una franja que ya no hace, un veto, el standby, un «nunca con» estricto\) se retira/.test(panel || ''), panel);
      await clic(pg, '#genPrevia');
      ok('se genera la vista previa', await llega(pg, () => !!(GEN.previa && !GEN.previa.semana), null, 20000) >= 0);
      const datos = await pg.evaluate(() => ({ n: GEN.previa.retirados.length, grupos: new Set(GEN.previa.retirados.map(x => x.pid + '|' + x.motivo)).size }));
      const lis = await pg.$$eval('#genRoot .warnbanner.gretlist li', xs => xs.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
      const ban = await txt(pg, '#genRoot .warnbanner.gretlist');
      ok('la lista de lo que se retira está entera: una línea por persona y motivo, sin «y N más»', lis.length === datos.grupos && datos.n > 8 && !/y \d+ más/.test(ban || ''), j({ datos, lis }));
      ok('con Tere y con Iván, cada uno con su motivo y sus días', lis.some(l => /^Tere · solo Bar Mónaco: lun 28\/9, .* mañana en Pasarela/.test(l)) && lis.some(l => /^Iván · no hace tardes en Pasarela: .* tarde en Pasarela/.test(l)), j(lis));
      const rech = await pg.$$eval('#genRoot .warnbanner', xs => xs.filter(x => /no se pudieron poner|no se pudo poner/.test(x.textContent)).map(x => x.textContent.replace(/\s+/g, ' ')));
      ok('«no se pudieron poner» no repite lo que ya sale en la lista de retiradas', !rech.some(r => /Tere en Pasarela.*solo Bar Mónaco|Iván en Pasarela.*no hace tardes/.test(r)), j(rech));
      await clic(pg, '#genAplicar');
      await llega(pg, () => !GEN.previa, null, 10000);
      const hist = await pg.evaluate(() => (S.historial[0] || {}).txt);
      ok('el historial dice quién y por qué, agrupado por persona', /retiradas que ya no valían \(.*Tere · solo Bar Mónaco: .*Iván · no hace tardes en Pasarela: /.test(hist || '') || /retiradas que ya no valían \(.*Iván · no hace tardes en Pasarela: .*Tere · solo Bar Mónaco: /.test(hist || ''), hist);
    });
    await pg.context().close();
  }

  // ══ 7) la hoja impresa con «Sin trabajo · por un cierre» (C5) ══
  console.log('── 7) el Mónaco cierra el 29 y el 30: la hoja de la semana generada dice quién se queda sin trabajo');
  {
    const pg = await pagina('sintrabajo');
    await seccion('sin trabajo', async () => {
      const r = await pg.evaluate(() => { const c = { id: 'c_e2e', localId: 'MONACO', motivo: 'reforma', dias: { '2026-09-29': ['M', 'T'], '2026-09-30': ['M', 'T'] } }; const res = aplicarCierre(S, S.staff, estadoDeIso('2026-09-29', true), c, {}); saveState(); return res.errores; });
      ok('preparado: el cierre del Mónaco', Array.isArray(r) && !r.length, j(r));
      await generadorSemana(pg, L28);
      ok('se genera la vista previa', await generar(pg) >= 0);
      const sinT = await pg.evaluate(() => (GEN.previa.sinTrabajo['2026-09-29'] || []).map(nombrePid));
      ok('el modelo da quién se queda sin trabajo el martes 29', sinT.length > 0, j(sinT));
      await clic(pg, '#gsPrint');
      await llega(pg, () => !!document.querySelector('.pxg-lib td[data-libran]'), null, 6000);
      const fila = await pg.evaluate(() => { const tr = [...document.querySelectorAll('.pxg-lib tr')].find(t => /Sin trabajo/.test(t.textContent)); return tr ? tr.textContent.replace(/\s+/g, ' ').trim() : null; });
      ok('la hoja tiene la fila «Sin trabajo · por un cierre» con esas personas', !!fila && /Sin trabajo ?por un cierre/.test(fila) && sinT.every(n => fila.includes(n)), fila);
    });
    await pg.context().close();
  }

  // ══ 8) ausentes: las dos medias jornadas y «otro motivo» (H-07, C14) ══
  console.log('── 8) Mari Luz de permiso por la mañana y de vacaciones por la tarde; Noe «otro motivo: médico»; Tere «otro motivo» sin detalle');
  {
    const pg = await pagina('ausentes2');
    await seccion('ausentes 2', async () => {
      await pg.evaluate(iso => { anadirAusencia(personaDeId('mariluz'), { tipo: 'PERM', desde: iso, hasta: iso, franjas: ['M'] }); anadirAusencia(personaDeId('mariluz'), { tipo: 'VAC', desde: iso, hasta: iso, franjas: ['T'] }); anadirAusencia(personaDeId('noe'), { tipo: 'OTRO', desde: iso, hasta: iso, detalle: 'médico' }); anadirAusencia(personaDeId('tere'), { tipo: 'OTRO', desde: iso, hasta: iso }); saveState(); }, J1);
      await generadorSemana(pg, L28);
      ok('se genera la vista previa', await generar(pg) >= 0);
      const fila = await txt(pg, '#genRoot .glib tr.gsaus');
      ok('el pie dice las dos medias jornadas de Mari Luz', /Mari L\. · permiso por la mañana · vacaciones por la tarde \(día entero\)/.test(fila || ''), fila);
      ok('«otro motivo» con su detalle («Noe · médico») o «no viene»', /Noe · médico/.test(fila || '') && /Tere · no viene/.test(fila || '') && !/otro motivo/.test(fila || ''), fila);
      await clic(pg, '#gsPrint');
      await llega(pg, () => !!document.querySelector('.pxg-lib td[data-ausentes]'), null, 6000);
      const hoja = await ev(pg, `.pxg-lib td[data-ausentes="${J1}"]`, x => x.textContent.replace(/\s+/g, ' ').trim());
      ok('y la hoja impresa igual', /Mari Luz · permiso por la mañana · vacaciones por la tarde \(día entero\)/.test(hoja || '') && /Noe · médico/.test(hoja || '') && /Tere · no viene/.test(hoja || ''), hoja);
    });
    await pg.context().close();
  }

  // ══ 9) el cambio de día libre dice a quién cubría (C10) ══
  console.log('── 9) Mari Luz «cubre a Iván», que está de vacaciones el viernes 2: cambiar su día libre al viernes y quitarlo');
  {
    const pg = await pagina('cubria');
    const dialogos = [];
    pg.on('dialog', d => dialogos.push(d.message()));
    await seccion('cubría', async () => {
      await pg.evaluate(() => { personaDeId('mariluz').cubreA = [{ pid: 'ivan' }]; anadirAusencia(personaDeId('ivan'), { tipo: 'VAC', desde: '2026-10-02', hasta: '2026-10-02' }); saveState(); });
      await generadorSemana(pg, L28);
      await generar(pg);
      await clic(pg, '#genAplicar');
      await llega(pg, () => !GEN.previa, null, 5000);
      ok('preparado: Mari Luz es relevo «por Iván» el viernes 2 por la tarde', await pg.evaluate(iso => { const e = asignados(estadoDeIso(iso), iso, 'PASARELA_T').find(x => x.pid === 'mariluz'); return !!e && e.por === 'ivan'; }, V2));
      dialogos.length = 0;
      await pg.evaluate(() => cambiarDiaLibreUI('mariluz', '2026-09-28', [5]));
      const ida = dialogos.find(d => /ya está en la planilla/.test(d)) || '';
      ok('al cambiar su día libre al viernes, el aviso dice que esa tarde cubría a Iván', /Mari Luz sale del viernes 2 \([^)]*\) y deja de cubrir a Iván/.test(ida), ida);
      dialogos.length = 0;
      await pg.evaluate(() => cambiarDiaLibreUI('mariluz', '2026-09-28', []));
      const vuelta = dialogos.find(d => /ya está en la planilla/.test(d)) || '';
      ok('y al quitarlo, que vuelve a cubrir a Iván', /Mari Luz entra el viernes 2 en [^\n]* y vuelve a cubrir a Iván/.test(vuelta), vuelta);
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
