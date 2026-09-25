// QUIÉN ABRE Y LA COCINA EN LA PLANILLA YA VOLCADA, CON CLICS (revisión de la fase 5, 24/09; Diego: «que lea
// todas las variables»). Las dos revisiones de la fase 5 vieron que sus arreglos solo llegaban a las semanas que
// se generasen desde entonces:
//  1) la planilla que ya tiene el grupo (volcada con la versión de antes: quién abre y la cocina fijados «a
//     mano» en cada casilla) se abre con la versión nueva: nada queda «a mano» sin que el encargado lo pusiera,
//     y lo que sí puso (con su línea en el historial) se queda;
//  2) «Quién abre» de Pasarela tarde a Mari Luz: de hoy en adelante lo guardado dice lo mismo que Hoy (el Mes,
//     el Excel, el tramo de Hoy), sin tener que vaciar y volver a generar;
//  3) Lola «nunca de primero»: la ficha avisa de que es «Quién abre» de Pasarela y de su «Sale el primero», y
//     deja de abrir en lo ya volcado;
//  4) la cocina: Susana Capón «solo los miércoles» y la regla «Cocina» apagada llegan a lo ya volcado; Tere
//     titular de la mañana de Pasarela (sin cocina) y Mari Luz titular desde su ficha se preguntan antes;
//  5) Ctrl+Z de una ficha o de la cocina de Ajustes no deshace otros ajustes del local (el mínimo, quién abre);
//  6) «Sale primero» a mano sobre Leo: la Semana y el Mes lo avisan, y el menú deja quitarlo;
//  7) textos y avisos de contradicciones («Quién abre» = Leo, que nunca sale el primero).
// El reloj de la página se fija en el jueves 24/09/2026. E2E_RAIZ permite pasar la batería por otra copia de
// la app (la de antes del cambio, para verla en rojo).
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

async function pagina(etiqueta, query) {
  const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.clock.setFixedTime(new Date('2026-09-24T10:00:00+02:00'));
  await ctx.addInitScript(() => { try { sessionStorage.setItem('shiftia_pas_sesion', '1'); sessionStorage.setItem('shiftia_pas_rol', 'admin'); } catch (e) {} });
  const pg = await ctx.newPage();
  pg.on('pageerror', e => errores.push(`${etiqueta}: ${e.message}`));
  pg.dialogos = []; pg.aceptar = true;
  pg.on('dialog', d => { pg.dialogos.push(d.message()); if (pg.aceptar) d.accept(d.type() === 'prompt' ? 'prueba' : undefined).catch(() => {}); else d.dismiss().catch(() => {}); });
  await pg.route(/googleapis|gstatic|cdnjs/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await pg.goto(BASE + '/index.html' + (query === undefined ? '?demo=1' : query));
  await pg.waitForSelector('#view-hoy .loccard', { timeout: 15000 });
  return pg;
}
async function seccion(nombre, fn) {
  try { await fn(); } catch (e) { ok(`${nombre}: la sección no se interrumpe`, false, e && e.stack ? e.stack.split('\n').slice(0, 4).join(' | ') : e); }
}
// de hoy en adelante, en toda la planilla guardada: casillas donde lo guardado (e.abre) no es quien abre (primeroDe)
const desacuerdos = pg => pg.evaluate(() => {
  const out = [];
  for (const k of Object.keys(S.meses).sort()) {
    const e = estadoMes(+k.slice(0, 4), +k.slice(5, 7));
    for (const iso of Object.keys(e.asig).sort()) {
      if (iso < '2026-09-24') continue;
      for (const t of turnosDe(S)) {
        const lista = asignados(e, iso, t.id); if (!lista.length) continue;
        const g = (lista.find(x => x.abre) || {}).pid || null, p = primeroDe(S, S.staff, e, iso, t.id);
        if (g !== p) out.push(`${iso} ${t.id}: guardado ${g}, Hoy ${p}`);
      }
    }
  }
  return out;
});
const marcasAMano = (pg, k) => pg.evaluate(k => { const out = []; for (const g of Object.values(S.meses)) for (const [iso, porT] of Object.entries(g.manual || {})) for (const [tid, m] of Object.entries(porT || {})) if (m && m[k]) out.push(iso + '|' + tid); return out.sort(); }, k);
const ajustesLocal = async (pg, lid) => {
  await pg.evaluate(() => switchTab('equipo'));
  await pg.click('#btnLocales');
  await pg.waitForSelector(`#localesOvl [data-loctab="${lid}"]`, { timeout: 5000 });
  await pg.click(`#localesOvl [data-loctab="${lid}"]`);
  await pg.waitForSelector('#localesOvl [data-primero="T"]', { timeout: 5000 });
};
const fichaDe = async (pg, pid) => {
  await pg.evaluate(() => switchTab('equipo'));
  await pg.click(`[data-pcard="${pid}"] .pcfoot [data-ficha="${pid}"]`);
  await pg.waitForSelector('#fichaOvl [data-tnoprimero="M"]', { timeout: 5000 });
};

try {
  // ══ 1) la planilla de antes, abierta con la versión nueva ══
  console.log('── 1) la planilla volcada con la versión de antes (todo «a mano»), abierta con la nueva');
  await seccion('datos de antes', async () => {
    const pg = await pagina('antes');
    // lo que dejaba la versión de antes: quién abre y la cocina fijados en cada casilla, la semana tipo con sus
    // 19 «a», sin migraciones hechas. Y un «Sale primero» que sí puso el encargado (con su línea en el historial)
    const antes = await pg.evaluate(() => {
      S.patron = semillaPasarela().patron;
      for (const g of Object.values(S.meses)) for (const [iso, porT] of Object.entries(g.asig || {})) for (const [tid, lista] of Object.entries(porT)) {
        for (const e of lista) { delete e.abrePatron; delete e.cocinaAuto; }
        if (lista.some(e => e.abre)) marcarManual(g, iso, tid, 'abre');
        if (lista.some(e => e.cocina)) marcarManual(g, iso, tid, 'cocina');
      }
      const e = estadoDeIso('2026-10-06', true);
      marcarAbre(e, '2026-10-06', 'PASARELA_M', 'tere', S);
      registrarCambio('Tere abre Pasarela mañana del 6/10', 'asig');
      delete S.migraciones;
      localStorage.setItem(LS_KEY, JSON.stringify(S));
      let n = 0; for (const g of Object.values(S.meses)) for (const porT of Object.values(g.manual || {})) for (const m of Object.values(porT || {})) if (m && m.abre) n++;
      return n;
    });
    ok('la planilla de antes tiene quién abre fijado a mano en todas partes', antes > 100, antes);
    await pg.goto(BASE + '/index.html');
    await pg.waitForSelector('#view-hoy .loccard', { timeout: 15000 });
    const abre = await marcasAMano(pg, 'abre');
    ok('con la versión nueva solo queda a mano el «Sale primero» que puso el encargado', abre.length === 1 && abre[0] === '2026-10-06|PASARELA_M', abre.slice(0, 5).join(' '));
    ok('y la cocina, ninguna (nadie la marcó)', !(await marcasAMano(pg, 'cocina')).length, (await marcasAMano(pg, 'cocina')).slice(0, 5).join(' '));
    ok('la migración se apunta y no se repite', await pg.evaluate(() => !!(S.migraciones && S.migraciones.marcasAuto2409)));
    const avisosHoy = await pg.$$eval('#view-hoy .bdg.abre.warn', xs => xs.length);
    ok('Hoy no enseña ningún «ABRE ⚠» (nadie lo puso a mano)', avisosHoy === 0, avisosHoy);
    const rv = await pg.evaluate(() => revisionMes(S, S.staff, estadoMes(2026, 10), {}).filter(x => x.tipo === 'abre-no-apto').map(x => x.msg));
    ok('ni la Revisión de octubre dice «marcado a mano» salvo lo del encargado', rv.every(m => /Tere/.test(m)), rv.slice(0, 3).join(' | '));
    ok('«Guardar como semana tipo» de la semana del 28/09 no congela ninguna «a»', await pg.evaluate(() => Object.values(patronDesdeSemana(estadoRango('2026-09-28', '2026-10-04', false), '2026-09-28', S, S.staff)).flat().filter(pl => pl.a).length) === 0);
    await pg.context().close();
  });

  // ══ 2) «Quién abre» de Pasarela tarde a Mari Luz ══
  console.log('── 2) «Quién abre» de Pasarela tarde a Mari Luz, con clics: lo guardado sigue a Hoy');
  await seccion('quien abre', async () => {
    const pg = await pagina('quien-abre');
    await ajustesLocal(pg, 'PASARELA');
    await pg.selectOption('#localesOvl [data-primero="T"]', 'mariluz');
    await llega(pg, () => localDe(S, 'PASARELA').primero.T === 'mariluz', null, 3000);
    await pg.click('#localesOvl [data-ovx]');
    const des = await desacuerdos(pg);
    ok('de hoy en adelante, en toda la planilla, lo guardado dice quién abre igual que Hoy', !des.length, des.slice(0, 4).join(' | '));
    const dias = await pg.evaluate(() => { const out = []; for (const iso of rangoIso('2026-09-24', '2026-10-31')) { const e = estadoDeIso(iso); if (primeroDe(S, S.staff, e, iso, 'PASARELA_T') === 'mariluz') out.push(iso); } return out; });
    ok('Mari Luz abre la tarde de Pasarela varios días', dias.length > 3, dias.length);
    const d = dias[0];
    const v = await pg.evaluate(d => {
      const e = estadoDeIso(d), lista = asignados(e, d, 'PASARELA_T');
      return { xlsx: xlsxNombres(lista), turno: turnoDelDia(S, e, d, 'mariluz'), tramo: tramoDe(S, e, d, 'PASARELA_T', 'mariluz'), ivan: lista.some(x => x.pid === 'ivan') ? turnoDelDia(S, e, d, 'ivan') : null, horario: horarioDe(localDe(S, 'PASARELA'), isoDow(d), 'T') };
    }, d);
    ok(`el Excel del ${d} pone «Mari Luz (abre)»`, /^Mari Luz \(abre\)/.test(v.xlsx) && !/Iván \(abre\)/.test(v.xlsx), v.xlsx);
    ok('su tramo empieza cuando abre el local (no a las 21:00 del partido)', v.tramo && v.tramo.ini === v.horario.ini, JSON.stringify(v.tramo) + ' / ' + JSON.stringify(v.horario));
    // el Mes (su pastilla): «Tarde: Pasarela (abre)» para Mari Luz, no para Iván
    await pg.evaluate(d => { S.y = +d.slice(0, 4); S.m = +d.slice(5, 7); cargarMes(); switchTab('mes'); }, d);
    await pg.waitForSelector(`#view-mes [data-asig="mariluz|${d}"]`, { timeout: 5000 });
    const mes = await pg.evaluate(d => ({ ml: (document.querySelector(`#view-mes [data-asig="mariluz|${d}"] .pill`) || {}).dataset?.tipstr || '', iv: (document.querySelector(`#view-mes [data-asig="ivan|${d}"] .pill`) || {}).dataset?.tipstr || '' }), d);
    ok('el Mes dice que abre Mari Luz la tarde y no Iván', /Tarde: Pasarela \(abre\)/.test(mes.ml) && !/Tarde: Pasarela \(abre\)/.test(mes.iv), JSON.stringify(mes));
    await pg.context().close();
  });

  // ══ 3) Lola «nunca de primero» ══
  console.log('── 3) Lola «nunca de primero» de mañana, con clics');
  await seccion('lola', async () => {
    const pg = await pagina('lola');
    await fichaDe(pg, 'lola');
    pg.dialogos.length = 0;
    await pg.click('#fichaOvl [data-tnoprimero="M"]');
    await llega(pg, () => personaDeId('lola').noPrimero.includes('M'), null, 3000);
    ok('la ficha avisa de que es «Quién abre» de Pasarela y tiene «Sale el primero», y ofrece quitarlo', pg.dialogos.some(m => /Quién abre/.test(m) && /Sale el primero/.test(m) && /Pasarela/.test(m)), JSON.stringify(pg.dialogos));
    ok('al aceptar, deja de ser «Quién abre» de Pasarela por la mañana y se quita su «Sale el primero» ahí', await pg.evaluate(() => localDe(S, 'PASARELA').primero.M !== 'lola' && !((personaDeId('lola').abre || {}).PASARELA || []).includes('M')));
    await pg.click('#fichaOvl [data-ovx]');
    const r = await pg.evaluate(() => { const out = []; for (const iso of rangoIso('2026-09-24', '2026-10-31')) { const e = estadoDeIso(iso); const g = (asignados(e, iso, 'PASARELA_M').find(x => x.abre) || {}).pid; if (g === 'lola' || primeroDe(S, S.staff, e, iso, 'PASARELA_M') === 'lola') out.push(iso); } return out; });
    ok('de hoy en adelante Lola no abre Pasarela por la mañana (ni en Hoy ni en lo guardado)', !r.length, r.join(' '));
    ok('y Hoy no dice que alguien la puso «a mano»', !(await pg.$$eval('#view-hoy .bdg.abre.warn', xs => xs.length)));
    await pg.context().close();
  });

  // ══ 4) la cocina de lo ya volcado ══
  console.log('── 4) la cocina: Susana Capón «solo los miércoles», «Cocina» apagada, Tere y Mari Luz titulares de Pasarela');
  await seccion('cocina', async () => {
    const pg = await pagina('cocina');
    ok('el martes 29 la cocina de la tarde del Mónaco la lleva Susana Capón', await pg.evaluate(() => (asignados(estadoDeIso('2026-09-29'), '2026-09-29', 'MONACO_T').find(x => x.cocina) || {}).pid === 'scapon'));
    await fichaDe(pg, 'scapon');
    await pg.click('#fichaOvl [data-tcocd="3"]');
    await llega(pg, () => personaDeId('scapon').cocina.soloDias.includes(3), null, 3000);
    // (era «solo martes»: se quita el martes para dejar «solo los miércoles»)
    await pg.click('#fichaOvl [data-tcocd="2"]');
    await llega(pg, () => !personaDeId('scapon').cocina.soloDias.includes(2), null, 3000);
    await pg.click('#fichaOvl [data-ovx]');
    const coc = await pg.evaluate(() => (asignados(estadoDeIso('2026-09-29'), '2026-09-29', 'MONACO_T').find(x => x.cocina) || {}).pid || null);
    ok('sin regenerar, el martes 29 ya no la lleva ella', coc !== 'scapon', coc);
    ok('y la Revisión no dice «la cocina la lleva alguien que no es cocina de ese local»', !(await pg.evaluate(() => revisionMes(S, S.staff, estadoMes(2026, 9), { desde: '2026-09-24' }).some(x => x.tipo === 'cocina-no-apta'))));
    // «Cocina» del grupo apagada: de hoy en adelante nadie lleva la cocina marcada sola
    await pg.evaluate(() => { S.reglas = S.reglas || {}; S.reglas.cocina = false; saveState(); renderVistaActiva(); switchTab('hoy'); });
    ok('con «Cocina» apagada, Hoy ya no enseña «COCINA»', !(await pg.$$eval('#view-hoy .bdg.cocina', xs => xs.length)));
    ok('ni queda ninguna en lo guardado de hoy en adelante', await pg.evaluate(() => { for (const iso of rangoIso('2026-09-24', '2026-10-31')) { const e = estadoDeIso(iso); for (const t of turnosDe(S)) if (asignados(e, iso, t.id).some(x => x.cocina)) return false; } return true; }));
    await pg.evaluate(() => { S.reglas.cocina = true; saveState(); });
    // Tere titular de la mañana de Pasarela (que no tiene cocina): se pregunta, diciendo que Pasarela pasa a tener cocina
    await ajustesLocal(pg, 'PASARELA');
    await pg.waitForSelector('#localesOvl [data-titsel="M"]', { timeout: 5000 });
    pg.dialogos.length = 0; pg.aceptar = false;
    await pg.selectOption('#localesOvl [data-titsel="M"]', 'tere');
    await pg.click('#localesOvl [data-titadd="M"]');
    await new Promise(r => setTimeout(r, 300));
    ok('Ajustes avisa de que Pasarela pasará a tener cocina por la mañana', pg.dialogos.some(m => /Pasarela/.test(m) && /pasa a tener cocina/.test(m)), JSON.stringify(pg.dialogos));
    ok('y al cancelar no cambia nada', await pg.evaluate(() => !localDe(S, 'PASARELA').cocina || !(localDe(S, 'PASARELA').cocina.titulares || { M: [] }).M.includes('tere')));
    pg.aceptar = true;
    await pg.click('#localesOvl [data-ovx]');
    // Mari Luz, desde su ficha, «titular de cocina en Pasarela»: lo mismo
    await fichaDe(pg, 'mariluz');
    pg.dialogos.length = 0; pg.aceptar = false;
    await pg.click('#fichaOvl [data-tcoct="PASARELA"]');
    await new Promise(r => setTimeout(r, 300));
    ok('la ficha avisa de que Pasarela no tiene cocina y pasará a tenerla', pg.dialogos.some(m => /Pasarela/.test(m) && /pasa a tener cocina/.test(m)), JSON.stringify(pg.dialogos));
    ok('al cancelar, ni su ficha ni Pasarela cambian', await pg.evaluate(() => !cocinaDe(S, personaDeId('mariluz'), 'PASARELA') && !localTieneCocina(localDe(S, 'PASARELA'), 'M', S, S.staff)));
    pg.aceptar = true;
    await pg.click('#fichaOvl [data-tcoct="PASARELA"]');
    await llega(pg, () => cocinaDe(S, personaDeId('mariluz'), 'PASARELA') === 'titular', null, 3000);
    ok('al aceptar, es titular y Pasarela tiene cocina', await pg.evaluate(() => cocinaDe(S, personaDeId('mariluz'), 'PASARELA') === 'titular' && localTieneCocina(localDe(S, 'PASARELA'), 'M', S, S.staff)));
    await pg.context().close();
  });

  // ══ 5) Ctrl+Z ══
  console.log('── 5) Ctrl+Z de una ficha o de la cocina de Ajustes no deshace otros ajustes del local');
  await seccion('deshacer', async () => {
    const pg = await pagina('deshacer');
    await fichaDe(pg, 'juani');
    await pg.click('#fichaOvl [data-tnoprimero="T"]');
    await llega(pg, () => personaDeId('juani').noPrimero.includes('T'), null, 3000);
    await pg.click('#fichaOvl [data-ovx]');
    await ajustesLocal(pg, 'PASARELA');
    await pg.fill('#localesOvl [data-min="M|1"]', '4');
    await pg.dispatchEvent('#localesOvl [data-min="M|1"]', 'change');
    await llega(pg, () => +localDe(S, 'PASARELA').minimos.M[1] === 4, null, 3000);
    await pg.selectOption('#localesOvl [data-primero="T"]', 'mariluz');
    await llega(pg, () => localDe(S, 'PASARELA').primero.T === 'mariluz', null, 3000);
    await pg.click('#localesOvl [data-ovx]');
    await pg.evaluate(() => document.activeElement && document.activeElement.blur());
    await pg.keyboard.press('Control+z');
    await llega(pg, () => !personaDeId('juani').noPrimero.includes('T'), null, 3000);
    const r = await pg.evaluate(() => ({ min: +localDe(S, 'PASARELA').minimos.M[1], primero: localDe(S, 'PASARELA').primero.T, juani: personaDeId('juani').noPrimero.includes('T') }));
    ok('Ctrl+Z deshace la ficha de Juani', !r.juani, JSON.stringify(r));
    ok('y no toca el mínimo del lunes por la mañana ni «Quién abre» de la tarde de Pasarela', r.min === 4 && r.primero === 'mariluz', JSON.stringify(r));
    // cocina de El 33 en Ajustes y luego el mínimo del viernes por la tarde: Ctrl+Z deshace solo la cocina
    await ajustesLocal(pg, 'EL33');
    await pg.waitForSelector('#localesOvl [data-titsel="M"]', { timeout: 5000 });
    await pg.selectOption('#localesOvl [data-titsel="M"]', 'victoria');
    await pg.click('#localesOvl [data-titadd="M"]');
    await llega(pg, () => localDe(S, 'EL33').cocina.titulares.M.includes('victoria'), null, 3000);
    await pg.fill('#localesOvl [data-min="T|5"]', '4');
    await pg.dispatchEvent('#localesOvl [data-min="T|5"]', 'change');
    await llega(pg, () => +localDe(S, 'EL33').minimos.T[5] === 4, null, 3000);
    await pg.click('#localesOvl [data-ovx]');
    await pg.keyboard.press('Control+z');
    await llega(pg, () => !localDe(S, 'EL33').cocina.titulares.M.includes('victoria'), null, 3000);
    const r2 = await pg.evaluate(() => ({ min: +localDe(S, 'EL33').minimos.T[5], vic: localDe(S, 'EL33').cocina.titulares.M.includes('victoria'), ficha: cocinaDe(S, personaDeId('victoria'), 'EL33') }));
    ok('Ctrl+Z deshace la cocina de El 33 (la lista y la ficha de Victoria)', !r2.vic && !r2.ficha, JSON.stringify(r2));
    ok('y el mínimo del viernes por la tarde se queda en 4', r2.min === 4, JSON.stringify(r2));
    await pg.context().close();
  });

  // ══ 6) «Sale primero» a mano sobre Leo: la Semana y el Mes lo avisan; el menú lo quita ══
  console.log('── 6) «Sale primero» a mano sobre Leo el 25/09: Semana, Mes y quitarlo');
  await seccion('sale primero', async () => {
    const pg = await pagina('sale-primero');
    const d = '2026-09-25', tid = 'PASARELA_T';
    await pg.evaluate(([d, tid]) => { const e = estadoDeIso(d, true); if (!pidsEn(e, d, tid).includes('leo')) asignar(e, S, S.staff, d, tid, 'leo', { forzar: true, permitirPartido: true, puesto: 'sala' }); marcarAbre(e, d, tid, 'leo', S); saveState(); switchTab('semana'); }, [d, tid]);
    await pg.waitForSelector(`#view-semana [data-wpers="${d}|${tid}|leo"]`, { timeout: 5000 });
    const w = await pg.$eval(`#view-semana [data-wpers="${d}|${tid}|leo"]`, el => ({ tip: el.dataset.tipstr, cls: el.className }));
    ok('en la Semana, Leo lleva el aviso de que no puede abrir', /no puede abrir/.test(w.tip) && /Leo no sale el primero de la tarde/.test(w.tip) && /abrewarn/.test(w.cls), JSON.stringify(w));
    await pg.evaluate(d => { S.y = 2026; S.m = 9; cargarMes(); switchTab('mes'); }, d);
    await pg.waitForSelector(`#view-mes [data-asig="leo|${d}"] .pill`, { timeout: 5000 });
    const m = await pg.$eval(`#view-mes [data-asig="leo|${d}"] .pill`, el => ({ tip: el.dataset.tipstr, html: el.innerHTML }));
    ok('y en el Mes también', /no puede abrir/.test(m.tip) && /class="fz aw"/.test(m.html), JSON.stringify(m));
    // el menú de la casilla: «Quitar "sale primero" a mano»
    await pg.evaluate(([d, tid]) => { switchTab('hoy'); irAIso(d); }, [d, tid]);
    await pg.waitForSelector(`#view-hoy [data-cas="${d}|${tid}"] .pchip[data-pid="leo"]`, { timeout: 5000 });
    const hoyTip = await pg.$eval(`#view-hoy [data-cas="${d}|${tid}"] .pchip[data-pid="leo"]`, el => el.dataset.tipstr);
    ok('Hoy lo dice sin género: «“Sale primero” marcado a mano, pero no puede abrir»', /«Sale primero» marcado a mano, pero no puede abrir: Leo no sale el primero de la tarde/.test(hoyTip) && !/puesta a mano/.test(hoyTip), hoyTip);
    await pg.click(`#view-hoy [data-cas="${d}|${tid}"] .pchip[data-pid="leo"] .pnom`);
    await pg.waitForSelector('#menuTurnoPop', { timeout: 3000 });
    const hay = await pg.$('#menuTurnoPop [data-mt="noabre"]');
    ok('el menú ofrece «Quitar “sale primero” a mano»', !!hay);
    if (hay) {
      await hay.click();
      await llega(pg, ([d, tid]) => !manualDe(estadoDeIso(d), d, tid).abre, [d, tid], 3000);
      const r = await pg.evaluate(([d, tid]) => ({ man: !!manualDe(estadoDeIso(d), d, tid).abre, pr: primeroDe(S, S.staff, estadoDeIso(d), d, tid), hist: S.historial[0].txt }), [d, tid]);
      ok('al quitarlo, abre quien toca (no Leo) y queda en el historial', !r.man && r.pr !== 'leo' && /Leo/.test(r.hist) && /sale primero/i.test(r.hist), JSON.stringify(r));
      await pg.keyboard.press('Control+z');
      await llega(pg, ([d, tid]) => !!manualDe(estadoDeIso(d), d, tid).abre, [d, tid], 3000);
      ok('y Ctrl+Z lo devuelve', await pg.evaluate(([d, tid]) => !!manualDe(estadoDeIso(d), d, tid).abre && primeroDe(S, S.staff, estadoDeIso(d), d, tid) === 'leo', [d, tid]));
    }
    await pg.context().close();
  });

  // ══ 7) textos y contradicciones ══
  console.log('── 7) textos y avisos de contradicciones');
  await seccion('textos', async () => {
    const pg = await pagina('textos');
    await ajustesLocal(pg, 'EL33');
    await pg.waitForSelector('#localesOvl [data-titsel="M"]', { timeout: 5000 });
    const grupos = await pg.evaluate(() => [...document.querySelectorAll('#localesOvl [data-titsel="M"] optgroup')].map(g => ({ label: g.label, ids: [...g.querySelectorAll('option')].map(o => o.value) })));
    const g0 = grupos[0] || { label: '', ids: [] };
    ok('el primer grupo del desplegable de la cocina dice «Ya pueden llevarla» (Esmeralda y Adrián son del Mónaco y de Zapatillera)', /Ya pueden llevarla/.test(g0.label) && !/Cocina de este local/.test(g0.label), JSON.stringify(grupos.map(g => g.label)));
    // «Quién abre» = Leo, que nunca sale el primero: se avisa y se puede cancelar
    await pg.click('#localesOvl [data-loctab="PASARELA"]');
    await pg.waitForSelector('#localesOvl [data-primero="T"]', { timeout: 5000 });
    pg.dialogos.length = 0; pg.aceptar = false;
    await pg.selectOption('#localesOvl [data-primero="T"]', 'leo');
    await new Promise(r => setTimeout(r, 300));
    ok('elegir a Leo en «Quién abre» avisa de que nunca sale el primero de la tarde', pg.dialogos.some(m => /Leo/.test(m) && /no sale el primero de la tarde/.test(m)), JSON.stringify(pg.dialogos));
    ok('y al cancelar sigue Iván', await pg.evaluate(() => localDe(S, 'PASARELA').primero.T === 'ivan'));
    pg.aceptar = true;
    await pg.click('#localesOvl [data-ovx]');
    // el interruptor de la cocina de la ficha, apagado: su texto flotante no promete lo que no hace
    await pg.evaluate(() => { alternarCaracteristicaUI('scapon', 'cocina', false); openFicha('scapon'); });
    await pg.waitForSelector('#fichaOvl [data-car="cocina"] .tgl', { timeout: 4000 });
    const t = await pg.$eval('#fichaOvl [data-car="cocina"] .tgl', el => el.title);
    ok('el texto flotante del interruptor «Cocina» apagado dice lo mismo que el texto de debajo', !/el generador no la tiene en cuenta/.test(t) && /titular o reserva/.test(t), t);
    await pg.context().close();
  });
} finally {
  ok('sin errores de página', !errores.length, errores.join(' | '));
  await br.close(); srv.close();
}
resumen();
