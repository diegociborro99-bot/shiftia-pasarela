// LAS HOJAS IMPRIMIBLES DE LA SEMANA (14/09). Modo local con `?demo=1` (el mes se
// genera con la semana tipo), semana del 14 al 20 de septiembre de 2026, la del
// prototipo del cliente del 11/09. Se comprueba:
//   (1) #printBtn en Semana pinta las casillas con posicionesDe: El 33 martes tarde
//       con «Hueco disponible» y Noe ◆ en 2.ª, Pasarela lunes tarde con Mari Luz la primera
//       haciendo la tarde entera (Aroa, 17/09), Lola con ▸, marcas P y C (Noe miércoles)
//       y «Quién libra» del viernes = nadie;
//   (2) abrirImpresionSemanaGenerada(generarSemana(…)) monta las dos páginas del
//       prototipo: título, 4 tablas de locales, «Qué ha cambiado», ≥ 30 condiciones
//       con cuatro NUEVA (30, 31, 32 y el partido que abre en Pasarela), y «Descargar PDF» (#pPdf) sigue ahí;
//   (3) con dos casillas vaciadas, la página 2 enseña el cambio (antes tachado /
//       ahora en negrita, «nueva» si la casilla estaba vacía);
//   (4) sin pageerror en toda la batería.
// Capturas (fullPage) en $CAPTURAS/print-generada-*.png si se pasa la variable.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { join, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cargarChromium, contador, llega, prepararPagina } from './e2e-util.mjs';

const { chromium, CHROMIUM } = await cargarChromium();
const RAIZ = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'));
const { ok, resumen } = contador();
const t0 = Date.now();
const CAPTURAS = process.env.CAPTURAS || '';
if (CAPTURAS) mkdirSync(CAPTURAS, { recursive: true });

// ── servidor estático (nunca server.js): la app detecta que no hay backend ──
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
setTimeout(() => { console.log('  ✗ tiempo agotado (90 s)'); process.exit(1); }, 88000).unref();

const LUNES = '2026-09-14';
const errores = [];
const br = await chromium.launch({ executablePath: CHROMIUM, args: ['--no-sandbox'] });
try {
  // viewport alto: #printRoot es fijo con scroll propio y la captura debe coger la hoja entera
  const ctx = await br.newContext({ viewport: { width: 1400, height: 1000 } });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('shiftia_pas_sesion', '1'); sessionStorage.setItem('shiftia_pas_rol', 'admin'); } catch (e) {} });
  const pg = await ctx.newPage();
  await prepararPagina(pg, errores, 'impresión');
  await pg.goto(BASE + '/index.html?demo=1');
  await pg.waitForSelector('#view-hoy .loccard', { timeout: 15000 });
  ok('la app arranca en modo local (?demo=1)', await pg.evaluate(() => SRV.on === false && !!S));

  // ── la Semana del 14/09/2026 (si el reloj no está en septiembre de 2026, se siembra igual) ──
  await pg.click('.tab[data-v="semana"]');
  await llega(pg, () => !document.getElementById('view-semana').classList.contains('hidden'), null, 4000);
  const sem = await pg.evaluate(lunes => {
    sembrarDemo(S, lunes);
    S.semLunes = lunes; S.y = +lunes.slice(0, 4); S.m = +lunes.slice(5, 7); cargarMes(); S.day = +lunes.slice(8, 10);
    renderSemana();
    return { titulo: document.querySelector('#wTitle').textContent.replace(/\s+/g, ' ').trim(), plazas: Object.values(estadoDeIso(lunes).asig[lunes] || {}).reduce((a, l) => a + l.length, 0) };
  }, LUNES);
  ok(`la vista Semana está en la del 14 al 20 de septiembre (${sem.titulo}) con plazas el lunes (${sem.plazas})`, /14 – 20 de septiembre/.test(sem.titulo) && sem.plazas > 0, JSON.stringify(sem));

  // ── (1) hoja semanal general desde #printBtn ──
  await pg.click('#printBtn');
  ok('#printBtn monta #printRoot .pxpage', await llega(pg, () => { const r = document.getElementById('printRoot'); return !!r && !r.classList.contains('hidden') && !!r.querySelector('.pxpage table.pxsem'); }, null, 4000) >= 0);
  const cas = (iso, tid) => pg.evaluate(([i, t]) => {
    const td = document.querySelector(`#printRoot .pxpage [data-cas="${i}|${t}"]`); if (!td) return null;
    const slots = [...td.querySelectorAll('.pxg-s')].map(s => ({ n: (s.querySelector('.pxg-n') || {}).textContent, hueco: s.classList.contains('hueco'), nombre: (s.querySelector('.pxg-nm') || {}).textContent || '', abre: !!s.querySelector('.pxg-mk.abre'), coc: !!s.querySelector('.pxg-mk.coc'), com: !!s.querySelector('.pxg-mk.com'), P: !!s.querySelector('.pxg-tag.p'), C: !!s.querySelector('.pxg-tag.c'), sub: [...s.querySelectorAll('.pxg-sub')].map(x => x.textContent) }));
    return { cls: td.className, cuenta: (td.querySelector('.pxg-cnt') || {}).textContent || '', txt: td.textContent, slots };
  }, [iso, tid]);
  const el33mt = await cas('2026-09-15', 'EL33_T');
  ok('El 33 martes tarde: día flojo, se queda Noe solo y sin hueco (José, 17/09)', !!el33mt && !/Hueco disponible/.test(el33mt.txt) && el33mt.slots.length === 1 && /Noe/.test(el33mt.slots[0].nombre), JSON.stringify(el33mt));
  // 18/09, José, siete veces: «al imprimir que no aparezcan nunca horas», «sin mañana y
  // tarde», «solo los nombres, ni los números ni nada», «ni forzado», «ni estimado ni por».
  // Aroa recorta esta hoja y deja un trozo en cada bar: al equipo solo le hace falta saber
  // quién trabaja. Lo de la oficina se mira en la app.
  ok('El 33 martes tarde: en el papel, Noe y nada más — ni número, ni «por Jenny», ni cocina',
    !!el33mt && el33mt.slots[0] && /Noe/.test(el33mt.slots[0].nombre) && !el33mt.slots[0].n
    && !el33mt.slots[0].sub.length && !el33mt.slots[0].coc, JSON.stringify(el33mt && el33mt.slots[0]));
  ok('El 33 martes tarde: tampoco la cuenta «1/1*»', !!el33mt && !/\d\/\d/.test(el33mt.cuenta || ''), JSON.stringify(el33mt && el33mt.cuenta));
  const pasLt = await cas('2026-09-14', 'PASARELA_T');
  ok('Pasarela lunes tarde: Mari Luz, sin la explicación de «la tarde entera, de 16:00 a cierre»',
    !!pasLt && pasLt.slots[0] && /Mari Luz/.test(pasLt.slots[0].nombre) && !pasLt.slots[0].sub.length, JSON.stringify(pasLt && pasLt.slots[0]));
  const pasLm = await cas('2026-09-14', 'PASARELA_M');
  ok('Pasarela lunes mañana: Lola sin el ▸ de «sale la primera»', !!pasLm && pasLm.slots[0] && /Lola/.test(pasLm.slots[0].nombre) && !pasLm.slots[0].abre, JSON.stringify(pasLm && pasLm.slots[0]));
  ok('Pasarela lunes mañana: Mari Luz no está (esa tarde la hace entera) y quedan Lola y Tere', !!pasLm && !pasLm.slots.some(s => /Mari Luz/.test(s.nombre)) && pasLm.slots.some(s => /Tere/.test(s.nombre)), JSON.stringify(pasLm && pasLm.slots));
  const el33xm = await cas('2026-09-16', 'EL33_M');
  ok('El 33 miércoles mañana: Noe y Jenny, sin la C, sin la P y sin «por Victoria»',
    !!el33xm && /Noe/.test(el33xm.slots[0].nombre) && /Jenny/.test(el33xm.slots[1].nombre)
    && !el33xm.slots.some(s => s.C || s.P || s.sub.length), JSON.stringify(el33xm && el33xm.slots));
  const monLm = await cas('2026-09-14', 'MONACO_M');
  ok('Bar Mónaco lunes mañana: Cristian sin el □ de comodín', !!monLm && monLm.slots[2] && /Cristian/.test(monLm.slots[2].nombre) && !monLm.slots[2].com, JSON.stringify(monLm && monLm.slots));
  const limpio = await pg.evaluate(() => {
    const t = document.querySelector('#printRoot table.pxsem');
    return { txt: t ? t.textContent : '', ley: !!document.querySelector('#printRoot .pxg-ley'), horas: (t ? t.textContent : '').match(/\d{1,2}:\d{2}/g) || [] };
  });
  ok('en toda la hoja no queda ni una hora', limpio.horas.length === 0, JSON.stringify(limpio.horas.slice(0, 6)));
  ok('ni «Mañana»/«Tarde» de etiqueta de fila', !/Mañana|Tarde/.test(limpio.txt), (limpio.txt.match(/Mañana|Tarde/g) || []).join(','));
  ok('ni «forzado», ni «Hueco disponible», ni «faltan»', !/forzado|Hueco disponible|faltan/i.test(limpio.txt));
  ok('ni leyenda explicando símbolos que ya no salen', !limpio.ley);
  const libV = await pg.evaluate(() => { const td = document.querySelector('#printRoot .pxpage tr.pxdesc [data-libran="2026-09-18"]'); return td ? td.textContent.replace(/\s+/g, ' ').trim() : null; });
  ok('«Quién libra» del viernes 18 dice nadie (0 libran)', !!libV && /nadie/.test(libV) && /0 libran/.test(libV), libV);
  ok('la hoja sigue llevando los 4 locales y los 7 días: eso sí hace falta en el bar', await pg.evaluate(() => document.querySelectorAll('#printRoot table.pxsem tr.secrow.pxloc').length === 4 && document.querySelectorAll('#printRoot table.pxsem thead th.pxd').length === 7));
  // 18/09 (Diego): «que quede más visual, las celdas con un espacio similar entre todos en
  // la variante semanas». Ahora que en la casilla solo van nombres, la rejilla tiene que
  // leerse de un vistazo: todas las filas de turno miden lo mismo, tenga la casilla dos
  // nombres o cuatro, y el hueco entre nombres es el mismo en todas.
  const rejilla = await pg.evaluate(() => {
    const filas = [...document.querySelectorAll('#printRoot table.pxsem tbody tr')].filter(tr => tr.querySelector('td[data-cas]'));
    const alturas = filas.map(tr => Math.round(tr.getBoundingClientRect().height));
    const huecos = [];
    for (const td of document.querySelectorAll('#printRoot table.pxsem td[data-cas]')) {
      const ns = [...td.querySelectorAll('.pxg-s')];
      for (let i = 1; i < ns.length; i++) huecos.push(Math.round((ns[i].getBoundingClientRect().top - ns[i - 1].getBoundingClientRect().bottom) * 10) / 10);
    }
    return { alturas, min: Math.min(...alturas), max: Math.max(...alturas), huecos: [...new Set(huecos)].sort((a, b) => a - b) };
  });
  ok(`todas las filas de turno miden lo mismo (${rejilla.min}px)`, rejilla.max - rejilla.min <= 1, JSON.stringify(rejilla.alturas));
  ok(`el hueco entre nombres es el mismo en toda la hoja (${rejilla.huecos.join(', ')}px)`, rejilla.huecos.length <= 1, JSON.stringify(rejilla.huecos));

  const altoSem = await pg.evaluate(() => { const p = document.querySelector('#printRoot .pxpage'); return { alto: p.scrollHeight, hoja: Math.round(210 * 96 / 25.4), cls: p.className }; });
  ok(`la hoja semanal cabe en un A4 apaisado (${altoSem.alto}px ≤ ${altoSem.hoja}px · ${altoSem.cls})`, altoSem.alto <= altoSem.hoja + 2, JSON.stringify(altoSem));
  if (CAPTURAS) { await pg.setViewportSize({ width: 1400, height: Math.max(1000, altoSem.alto + 80) }); await pg.screenshot({ path: join(CAPTURAS, 'print-generada-semana.png'), fullPage: true }); await pg.setViewportSize({ width: 1400, height: 1000 }); }
  await pg.click('#pClose');
  ok('«Cerrar» oculta la vista previa', await pg.$eval('#printRoot', r => r.classList.contains('hidden')));

  // ── (2) la planilla generada: las dos páginas del prototipo ──
  const gen = await pg.evaluate(lunes => {
    const res = generarSemana(S, S.staff, estadoDeIso(lunes), lunes, { simular: true });
    abrirImpresionSemanaGenerada(res, {});
    return { huecos: res.huecos.length, primeros: res.huecos.filter(h => h.tipo === 'primero').length, cambios: res.cambios.length, condiciones: res.condiciones.length, nuevas: res.condiciones.filter(c => c.nueva).length, resumen: res.resumen };
  }, LUNES);
  ok(`generarSemana simula la semana (${gen.condiciones} condiciones, ${gen.nuevas} nuevas, ${gen.huecos} huecos, ${gen.cambios} cambios)`, gen.condiciones >= 30 && gen.nuevas === 6);
  ok('abrirImpresionSemanaGenerada monta una hoja apaisada con dos páginas .pxg-pag', await llega(pg, () => { const r = document.getElementById('printRoot'); return !!r && !r.classList.contains('hidden') && r.querySelectorAll('.pxpage.apaisado .pxg-pag').length === 2; }, null, 4000) >= 0);
  const p1 = await pg.evaluate(() => {
    const pag = document.querySelectorAll('#printRoot .pxg-pag')[0];
    return { h1: pag.querySelector('.pxg-h1').textContent.replace(/\s+/g, ' ').trim(), kick: pag.querySelector('.pxg-kick').textContent, tablas: pag.querySelectorAll('table.pxg-tab.pxg-local').length, libran: !!pag.querySelector('table.pxg-lib'), libV: (pag.querySelector('[data-libran="2026-09-18"]') || {}).textContent, ley: (pag.querySelector('.pxg-ley') || {}).textContent, huecos: pag.querySelectorAll('td.pxg-c.hueco').length, sub: pag.querySelector('.pxg-sub').textContent };
  });
  ok(`página 1: título «${p1.h1}»`, /^Planilla propuesta · semana del 14 al 20 de septiembre de 2026$/.test(p1.h1), p1.h1);
  ok('página 1: la línea de cabecera nombra Shiftia y los cuatro locales', /SHIFTIA/.test(p1.kick) && /El 33/.test(p1.kick) && /Pasarela/.test(p1.kick), p1.kick);
  ok('página 1: 4 tablas de locales, «Quién libra cada día» y la leyenda', p1.tablas === 4 && p1.libran && /nadie/.test(p1.libV || '') && /Hueco disponible|hueco disponible/.test(p1.ley || ''), JSON.stringify(p1));
  ok(`página 1: casillas con hueco en rojo (${p1.huecos}) = huecos de 1.ª posición del modelo (${gen.primeros})`, p1.huecos === gen.primeros, JSON.stringify({ p1: p1.huecos, gen: gen.primeros }));
  const g33 = await cas('2026-09-15', 'EL33_T');
  ok('página 1: El 33 martes tarde sin hueco, con Noe solo y sin marca de cocina (José, 17/09)', !!g33 && g33.slots.length === 1 && !g33.slots[0].hueco && /Noe/.test(g33.slots[0].nombre) && !g33.slots[0].coc, JSON.stringify(g33));
  const p2 = await pg.evaluate(() => {
    const pag = document.querySelectorAll('#printRoot .pxg-pag')[1];
    return { h1: pag.querySelector('.pxg-h1').textContent.replace(/\s+/g, ' ').trim(), h2: [...pag.querySelectorAll('.pxg-h2')].map(x => x.textContent.trim()), conds: pag.querySelectorAll('.pxg-cond').length, nuevas: pag.querySelectorAll('.pxg-cond em.nueva').length, nuevasCol: pag.querySelectorAll('.pxg-nueva').length, huecos: pag.querySelectorAll('.pxg-hueco').length, queda: [...pag.querySelectorAll('.pxg-hueco')].map(x => x.textContent).filter(t => /Queda:/.test(t)).length, destrapa: [...pag.querySelectorAll('.pxg-des')].map(x => x.textContent.slice(0, 120)), preguntas: pag.querySelectorAll('.pxg-preg').length, pregTxt: [...pag.querySelectorAll('.pxg-preg')].map(x => x.textContent.slice(0, 60)), fin: (pag.querySelector('.pxg-fin') || {}).textContent, sinSol: /Un turno sin solución no se rellena/.test(pag.textContent), ok: pag.querySelectorAll('.pxg-cond b.ok').length, ko: pag.querySelectorAll('.pxg-cond.ko small').length };
  });
  ok(`página 2: título «${p2.h1}»`, /^Qué ha cambiado · y /.test(p2.h1), p2.h1);
  ok(`página 2: la lista numerada tiene ≥ 30 condiciones (${p2.conds}) con ✓/✗`, p2.conds >= 30 && p2.conds === gen.condiciones && p2.ok + p2.ko === p2.conds, JSON.stringify({ conds: p2.conds, ok: p2.ok, ko: p2.ko }));
  ok(`página 2: las NUEVA de la lista y de la columna coinciden`, p2.nuevas === 6 && p2.nuevasCol === 6, JSON.stringify({ lista: p2.nuevas, col: p2.nuevasCol }));
  ok(`página 2: ${p2.huecos} cajas de hueco, todas con «Queda:» y «Se destraparía / No se destrapa»`, p2.huecos === gen.huecos && p2.queda === p2.huecos && p2.destrapa.length === p2.huecos && p2.destrapa.every(t => /destrapa/.test(t)), JSON.stringify(p2.destrapa));
  ok('página 2: el hueco de El 33 del martes ya no existe (José lo quitó el 17/09)', !p2.destrapa.some(t => /Noe/.test(t)), JSON.stringify(p2.destrapa));
  ok(`página 2: preguntas para el cliente (${p2.preguntas}: quién sale el primero, supuestos, mínimos con *, cierre y tramos del partido)`, p2.preguntas >= 3 && p2.pregTxt.some(t => /Quién sale el primero/.test(t)) && p2.pregTxt.some(t => /Horarios reales|hora de cierre/.test(t)) && p2.pregTxt.some(t => /mínimos marcados/.test(t)), JSON.stringify(p2.pregTxt));
  ok('página 2: «Un turno sin solución no se rellena» y el pie de conclusión con turnos, condiciones y descansos', p2.sinSol && /La semana sale/.test(p2.fin || '') && new RegExp(`${gen.resumen.turnos} turnos`).test(p2.fin) && /descansos/.test(p2.fin) && /condiciones/.test(p2.fin), p2.fin);
  ok('«Descargar PDF» (#pPdf) e «Imprimir» (#pGo) siguen en la barra', await pg.evaluate(() => !!document.querySelector('#printRoot #pPdf') && !!document.querySelector('#printRoot #pGo')));
  const altos = await pg.evaluate(() => { const hoja = Math.round(210 * 96 / 25.4); const pags = [...document.querySelectorAll('#printRoot .pxg-pag')].map(p => { const u = p.lastElementChild; return Math.round(u.getBoundingClientRect().bottom - p.getBoundingClientRect().top + 16 * 96 / 25.4); }); return { pags, hoja, cls: document.querySelector('#printRoot .pxpage').className, total: document.querySelector('#printRoot .pxpage').scrollHeight }; });
  ok(`cada página cabe en un A4 apaisado (${altos.pags.join(' / ')} px ≤ ${altos.hoja} · ${altos.cls})`, altos.pags.every(a => a <= altos.hoja + 2), JSON.stringify(altos));
  if (CAPTURAS) {
    await pg.setViewportSize({ width: 1400, height: altos.total + 100 });
    await pg.screenshot({ path: join(CAPTURAS, 'print-generada-completa.png'), fullPage: true });
    const pags = await pg.$$('#printRoot .pxg-pag');
    await pags[0].screenshot({ path: join(CAPTURAS, 'print-generada-p1.png') });
    await pags[1].screenshot({ path: join(CAPTURAS, 'print-generada-p2.png') });
    await pg.setViewportSize({ width: 1400, height: 1000 });
  }
  await pg.click('#pClose');

  // ── (3) con casillas vaciadas: la página 2 enseña qué ha cambiado ──
  const cam = await pg.evaluate(lunes => {
    const e = clonarEstado(estadoDeIso(lunes));
    desasignar(e, lunes, 'MONACO_T', 'yilian'); desasignar(e, lunes, 'MONACO_T', 'hojan');   // casilla vacía → «nueva»
    desasignar(e, '2026-09-17', 'ZAPA_T', 'roberto');                                            // queda Adrián; vuelve Roberto
    const res = generarSemana(S, S.staff, e, lunes, { simular: true });
    abrirImpresionSemanaGenerada(res, { titulo: 'Planilla corregida' });
    const pag = document.querySelectorAll('#printRoot .pxg-pag')[1];
    return { cambios: res.cambios.map(c => c.turnoId + ':' + c.antes.length + '>' + c.despues.length), h1: document.querySelector('#printRoot .pxg-h1').textContent.replace(/\s+/g, ' ').trim(), sub: document.querySelector('#printRoot .pxg-sub').textContent, cajas: [...pag.querySelectorAll('.pxg-cambio')].map(x => x.textContent.replace(/\s+/g, ' ').trim().slice(0, 200)), tachado: pag.querySelectorAll('.pxg-antes s').length, negrita: pag.querySelectorAll('.pxg-ahora b').length, nueva: pag.querySelectorAll('.pxg-nueva-cas').length, corr: document.querySelectorAll('#printRoot .pxg-pag td.pxg-c.corr').length };
  }, LUNES);
  ok(`con dos casillas vaciadas generarSemana devuelve los dos cambios (${cam.cambios.join(', ')})`, cam.cambios.length === 2, JSON.stringify(cam.cambios));
  ok(`el título usa opts.titulo («${cam.h1.slice(0, 20)}…») y el resumen dice «Corregido el lunes en Bar Mónaco»`, /^Planilla corregida/.test(cam.h1) && /Corregido el lunes 14 en Bar Mónaco/.test(cam.sub), cam.sub);
  ok('página 2: cada cambio con «antes» tachado y «ahora» en negrita, y «nueva» en la casilla que estaba vacía', cam.tachado >= 2 && cam.negrita >= 2 && cam.nueva === 1, JSON.stringify(cam));
  ok('página 2: el cambio de Bar Mónaco del lunes nombra a Yilian y Hojan', cam.cajas.some(t => /Bar Mónaco · lunes 14/.test(t) && /Yilian/.test(t) && /Hojan/.test(t)), JSON.stringify(cam.cajas));
  ok('página 1: las casillas corregidas van en ámbar con la marca «corregido»', cam.corr === 2 && await pg.evaluate(() => [...document.querySelectorAll('#printRoot td.pxg-c.corr .pxg-cnt')].every(x => /corregido/.test(x.textContent))), cam.corr);
  if (CAPTURAS) { const pags = await pg.$$('#printRoot .pxg-pag'); await pags[1].screenshot({ path: join(CAPTURAS, 'print-generada-p2-cambios.png') }); }
  await pg.click('#pClose');

  // ── (4) la hoja de un local sigue funcionando con la casilla nueva ──
  await pg.evaluate(() => abrirImpresionLocal('PASARELA'));
  ok('abrirImpresionLocal(PASARELA) monta la hoja vertical con las casillas nuevas', await llega(pg, () => !!document.querySelector('#printRoot .pxpage:not(.apaisado) table.pxlocal') && document.querySelectorAll('#printRoot table.pxlocal .pxg-s').length > 10, null, 4000) >= 0);
  // se miden las CASILLAS, no las filas: el día del partido la fila crece porque la columna
  // del día lleva «Juega el Barcelona», y eso sí interesa en el bar
  const rejillaLocal = await pg.evaluate(() => {
    const alturas = [...document.querySelectorAll('#printRoot table.pxlocal td[data-cas]')].map(td => Math.round(td.getBoundingClientRect().height));
    return { alturas, min: Math.min(...alturas), max: Math.max(...alturas) };
  });
  ok(`la hoja del local también lleva todas las casillas iguales (${rejillaLocal.min}px)`, rejillaLocal.max - rejillaLocal.min <= 1, JSON.stringify(rejillaLocal.alturas));
  const pl = await cas('2026-09-14', 'PASARELA_T');
  ok('hoja del local: Pasarela lunes tarde con Mari Luz la primera, sin hueco', !!pl && pl.slots[0] && !pl.slots[0].hueco && /Mari Luz/.test(pl.slots[0].nombre) && !/hueco/.test(pl.cls), JSON.stringify(pl));
  if (CAPTURAS) { const alto = await pg.evaluate(() => document.querySelector('#printRoot .pxpage').scrollHeight); await pg.setViewportSize({ width: 1400, height: alto + 80 }); await pg.screenshot({ path: join(CAPTURAS, 'print-generada-local.png'), fullPage: true }); }
  await pg.click('#pClose');

  await ctx.close();
  ok('sin errores de página en toda la batería', errores.length === 0, errores.slice(0, 4).join(' | '));
} catch (err) {
  ok('la batería reventó', false, err.message + '\n' + (err.stack || '').split('\n').slice(1, 3).join('\n'));
} finally {
  await br.close().catch(() => {});
  srv.close();
}
console.log(`\ntiempo: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
resumen();
