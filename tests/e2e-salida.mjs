// «YA NO ESTÁ CON NOSOTROS» DE PUNTA A PUNTA (S0, 30/09). Diego: «cuando un trabajador lo deja, no deberíamos
// eliminarlo de la aplicación… que el administrador y el oficinista puedan seguir viendo los trabajadores que ya
// no están trabajando con nosotros en los turnos pasados, aunque lo borremos de equipo. Restaura en la aplicación
// el trabajador eliminado y vuelve a retomar su planilla». El caso real: Adrián (cocina titular de Zapatillera,
// «cubre a» Susi) se ha ido.
// 1) Sin servidor (?demo=1, sesión local de admin, reloj fijado en el jueves 24/09/2026 como en
//    e2e-libra-puntual.mjs): ficha → «Ya no está con nosotros…» con la fecha del miércoles 23 → aviso del mes
//    sin cerrar → confirmar → Equipo ya no le cuenta y la sección le lista → Hoy/Semana/Mes de un día anterior le
//    enseñan con sombreado rojo y aviso → el selector de una casilla posterior no le ofrece → el Generador no le
//    pone → la hoja impresa, el Excel, Horas y Ajustes del local → Ctrl+Z le devuelve → Restaurar.
// 2) Con el servidor real (patrón de e2e-servidor.mjs): el programador le da la salida y le borra del todo →
//    Cuenta → «Personas borradas» le lista → Recuperar → ficha y turnos de antes vuelven, marcado «ya no está», y
//    otro dispositivo lo ve igual; el usuario con esa pid ya no puede entrar.
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync, existsSync, statSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cargarChromium, contador, llega, hasta, prepararPagina } from './e2e-util.mjs';

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
const br = await chromium.launch({ executablePath: CHROMIUM, args: ['--no-sandbox'] });
const errores = [];
const X23 = '2026-09-23', M22 = '2026-09-22', S26 = '2026-09-26';

async function pagina(etiqueta, dialogos, viewport, opts) {
  const o = opts || {};
  // táctil: como el móvil de Aroa (390×844, toques de verdad, sin ratón)
  const ctx = await br.newContext({ viewport: viewport || { width: 1280, height: 900 }, hasTouch: !!o.tactil, isMobile: !!o.tactil, deviceScaleFactor: o.tactil ? 2 : 1 });
  await ctx.clock.setFixedTime(new Date('2026-09-24T10:00:00+02:00'));
  await ctx.addInitScript(() => { try { sessionStorage.setItem('shiftia_pas_sesion', '1'); sessionStorage.setItem('shiftia_pas_rol', 'admin'); } catch (e) {} });
  const pg = await ctx.newPage();
  pg.on('pageerror', e => errores.push(`${etiqueta}: ${e.message}`));
  pg.on('dialog', d => { if (dialogos) dialogos.push(d.message()); d.accept().catch(() => {}); });
  await pg.route(/googleapis|gstatic|cdnjs/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await pg.goto(BASE + '/index.html?demo=1');
  await pg.waitForSelector('#view-hoy .loccard', { timeout: 15000 });
  return pg;
}
const ev = (pg, sel, fn, arg) => pg.$eval(sel, fn, arg).catch(() => null);
const hazlo = (pg, fn, arg) => pg.evaluate(fn, arg).catch(e => { errores.push('evaluate: ' + e.message.split('\n')[0]); });
const clic = (pg, sel) => pg.click(sel, { timeout: 3000 }).then(() => true, () => false);
const vista = async (pg, v) => { await pg.click(`.tab[data-v="${v}"]`); return llega(pg, v => { const s = document.getElementById('view-' + v); return !!s && !s.classList.contains('hidden'); }, v, 4000); };
// todas las plazas de una persona entre dos fechas, en la planilla guardada («iso|tid»)
const turnosDe = (pg, pid, desde, hasta) => pg.evaluate(([pid, desde, hasta]) => { const out = []; for (const k of Object.keys(S.meses)) for (const [iso, porT] of Object.entries(S.meses[k].asig || {})) { if (iso < desde || iso > hasta) continue; for (const [tid, l] of Object.entries(porT)) if (l.some(x => x.pid === pid)) out.push(iso + '|' + tid); } return out.sort(); }, [pid, desde, hasta]);
const salida = (pg, pid) => pg.evaluate(pid => salidaDe(personaDeId(pid)), pid);
async function abrirFicha(pg, pid) {
  await vista(pg, 'equipo');
  await pg.waitForSelector(`#equipoRoot [data-pcard="${pid}"] .pmini`, { timeout: 8000 }).catch(() => null);
  await clic(pg, `#equipoRoot [data-pcard="${pid}"] .pmini`);
  await pg.waitForSelector('#fichaOvl #fichBody', { timeout: 5000 });
}
async function generadorSemana(pg, lunes) {
  await vista(pg, 'generador');
  if (await pg.evaluate(() => GEN.modo !== 'semana')) await clic(pg, '[data-modo="semana"]');
  for (let i = 0; i < 10 && await pg.evaluate(l => GEN.lunes < l, lunes); i++) await clic(pg, '#gsNext');
  for (let i = 0; i < 10 && await pg.evaluate(l => GEN.lunes > l, lunes); i++) await clic(pg, '#gsPrev');
}
async function generar(pg) { await clic(pg, '#genPrevia'); return llega(pg, () => !!(GEN.previa && GEN.previa.semana), null, 15000); }

try {
  // ══ 1) sin servidor: la salida de Adrián desde el miércoles 23, con lo que se ve después ══
  console.log('── 1) ficha de Adrián → «Ya no está con nosotros…» desde el 23/09 → Equipo, Hoy, Semana, Mes, selector, Generador, hoja, Excel, Horas, Ajustes, Ctrl+Z, Restaurar');
  {
    const dialogos = [];
    const pg = await pagina('uno', dialogos);
    // agosto con turnos y sin cerrar: para el aviso «ciérralo antes» (el demo solo trae septiembre y octubre)
    await hazlo(pg, () => { const e = estadoDeIso('2026-08-10', true); generarPlanilla(S, S.staff, e, '2026-08-10', '2026-08-16', {}); saveState(); });
    const antes = await turnosDe(pg, 'adrian', '2026-08-01', '2026-10-31');
    ok('antes: Adrián tiene turnos antes y después del 23/09', antes.some(x => x < X23) && antes.some(x => x >= X23), JSON.stringify(antes.slice(0, 6)));
    await abrirFicha(pg, 'adrian');
    ok('la ficha ya no dice «Quitar del equipo»: dice «Ya no está con nosotros…»', /Ya no está con nosotros/.test(await ev(pg, '#fichaOvl [data-salida]', b => b.textContent) || '') && !(await pg.$('#fichaOvl [data-baja]')), await ev(pg, '#fichaOvl .fichfoot', x => x.textContent));
    // (revisión S0, cliente 8) la ficha mide más de 3.000 px: el pie con el botón va pegado abajo, se ve sin bajar
    const pie = await ev(pg, '#fichaOvl [data-salida]', b => { const r = b.getBoundingClientRect(); return { y: r.y, h: r.height }; });
    ok('el pie de la ficha (con «Ya no está con nosotros…») se ve sin bajar: va pegado al pie de la ficha', !!pie && pie.y >= 0 && pie.y + pie.h <= 900, JSON.stringify(pie));
    await clic(pg, '#fichaOvl [data-salida]');
    ok('se abre el diálogo con la fecha de hoy (24/09) y sin motivo', await llega(pg, () => !!document.querySelector('#salidaOvl #salDesde'), null, 3000) >= 0 && await ev(pg, '#salidaOvl #salDesde', i => i.value) === '2026-09-24' && await ev(pg, '#salidaOvl #salMotivo', i => i.value) === '');
    // (revisión S0, cliente 3) «Ir a Horas» desde el aviso cierra también la ficha (se quedaba abierta encima de Horas)
    await pg.fill('#salidaOvl #salDesde', '2026-10-05');
    await clic(pg, '#salidaOvl [data-irhoras]');
    ok('«Ir a Horas» cierra el diálogo Y la ficha, y abre Horas', await llega(pg, () => !document.getElementById('salidaOvl') && !document.getElementById('fichaOvl') && !document.getElementById('view-horas').classList.contains('hidden'), null, 4000) >= 0, await pg.evaluate(() => ({ ficha: !!document.getElementById('fichaOvl'), horas: !document.getElementById('view-horas').classList.contains('hidden') })));
    ok('y no ha apuntado nada', (await salida(pg, 'adrian')) === null);
    await hazlo(pg, () => { for (const id of ['salidaOvl', 'fichaOvl']) { const o = document.getElementById(id); if (o) o.remove(); } });
    await abrirFicha(pg, 'adrian');
    await clic(pg, '#fichaOvl [data-salida]');
    await llega(pg, () => !!document.querySelector('#salidaOvl #salDesde') && document.activeElement && document.activeElement.id === 'salDesde', null, 3000);   // el diálogo enfoca la fecha a los 50 ms
    await pg.fill('#salidaOvl #salDesde', X23);
    await pg.fill('#salidaOvl #salMotivo', 'se va a otro trabajo');
    const nDesde = antes.filter(x => x >= X23).length;
    const resTxt = String(await ev(pg, '#salidaOvl #salResumen', x => x.textContent) || '');
    ok(`el resumen cuenta lo que se retira: «se retiran ${nDesde} turnos desde el 23/9»`, new RegExp(`se retiran ${nDesde} turnos desde el 23/9`, 'i').test(resTxt), resTxt);
    const avTxt = String(await ev(pg, '#salidaOvl #salAviso', x => x.textContent) || '');
    ok('avisa de que agosto no está cerrado en Horas, con «Ir a Horas» y «Seguir igualmente»', /Agosto no está cerrado en Horas: ciérralo antes para que la nómina quede guardada/.test(avTxt) && !!(await pg.$('#salidaOvl [data-irhoras]')) && /Seguir igualmente/.test(await ev(pg, '#salidaOvl #salOk', b => b.textContent) || ''), avTxt);
    await clic(pg, '#salidaOvl #salOk');
    ok('al confirmar se cierran el diálogo y la ficha', await llega(pg, () => !document.getElementById('salidaOvl') && !document.getElementById('fichaOvl'), null, 4000) >= 0);
    ok('Adrián queda con salida desde el 23/09 y su motivo', JSON.stringify(await salida(pg, 'adrian')) === JSON.stringify({ desde: X23, motivo: 'se va a otro trabajo' }), JSON.stringify(await salida(pg, 'adrian')));
    const despues = await turnosDe(pg, 'adrian', '2026-08-01', '2026-10-31');
    ok('se retiran solo sus turnos desde el 23/09; los de antes siguen', JSON.stringify(despues) === JSON.stringify(antes.filter(x => x < X23)), JSON.stringify(despues.filter(x => x >= X23)));
    const hist = await pg.evaluate(() => (S.historial[0] || {}).txt || '');
    ok('queda en el historial («Ya no está con nosotros: Adrián desde el 23/9 · N turnos retirados»)', new RegExp(`Ya no está con nosotros: Adrián desde el 23/9 · ${nDesde} turnos retirados`).test(hist), hist);
    ok('y el aviso lo dice, con cómo deshacerlo', await pg.$$eval('#toasts .toast span', xs => xs.map(x => x.textContent)).then(ts => ts.some(t => /Adrián ya no está con nosotros/.test(t) && /Ctrl\+Z/.test(t))), await pg.$$eval('#toasts .toast span', xs => xs.map(x => x.textContent).join(' | ')));
    // Equipo
    await vista(pg, 'equipo');
    const enActivo = await pg.evaluate(() => { const b = [...document.querySelectorAll('#eqStats .dstat')].find(x => /en activo/.test(x.textContent)); return b ? +b.querySelector('b').textContent : -1; });
    const esperado = await pg.evaluate(() => staffEnPlantilla(S.staff, isoHoy()).filter(p => !deBaja(p, isoHoy())).length);
    ok(`Equipo ya no le cuenta en activo (${enActivo})`, enActivo === esperado && enActivo === 24 - 3 - 1, `${enActivo} ≠ ${esperado}`);
    ok('ni le lista en Zapatillera', !(await pg.$('#equipoRoot .eqsec:not(.eqsalidos) [data-pcard="adrian"]')));
    const sec = String(await ev(pg, '#eqSalidos', x => x.textContent.replace(/\s+/g, ' ')) || '');
    ok('la sección «Ya no están con nosotros (1)» le lista con la fecha, el motivo y «Restaurar»', /Ya no están con nosotros \(1\)/.test(sec) && /Adrián/.test(sec) && /desde el 23\/9/.test(sec) && /se va a otro trabajo/.test(sec) && !!(await pg.$('#eqSalidos [data-restaurar="adrian"]')), sec.slice(0, 200));
    ok('sin servidor (Diego probando) sale también «Borrar del todo»', !!(await pg.$('#eqSalidos [data-borrartodo="adrian"]')));
    // (revisión S0, cliente 5) la tarjeta avisa de que sigue en la semana tipo (el Generador salta sus plazas cada semana)
    const nPatron = await pg.evaluate(() => [1, 2, 3, 4, 5, 6, 7].reduce((a, d) => a + plazasDe(S, d).filter(pl => pl.p === 'adrian').length, 0));
    ok(`la tarjeta dice que sigue en la semana tipo (${nPatron} plazas)`, nPatron > 0 && new RegExp(`sigue en la semana tipo \\(${nPatron} plazas\\)`, 'i').test(sec), sec.slice(0, 400));
    ok('las tarjetas de Zapatillera dicen que Susi ya no tiene a Adrián', await pg.evaluate(() => /Adrián[^]*ya no está/.test((document.querySelector('#equipoRoot [data-pcard="susi"]') || { textContent: '' }).textContent)), await pg.evaluate(() => (document.querySelector('#equipoRoot [data-pcard="susi"] .traits') || { textContent: '' }).textContent.slice(0, 300)));
    // Hoy (martes 22): sombreado rojo y aviso
    await pg.evaluate(() => irAIso('2026-09-22'));
    await pg.waitForSelector('[data-cas="2026-09-22|ZAPA_M"] .pchip', { timeout: 8000 }).catch(() => null);
    const tip = await ev(pg, '[data-cas="2026-09-22|ZAPA_M"] .pchip[data-pid="adrian"]', x => ({ salido: x.classList.contains('salido'), tip: x.dataset.tipstr }));
    ok('Hoy (martes 22): su plaza sigue, con la clase «salido» y el aviso «ya no trabaja con nosotros (desde el 23/9)»', !!tip && tip.salido && /ya no trabaja con nosotros \(desde el 23\/9\)/.test(tip.tip), JSON.stringify(tip));
    // (revisión S0, cliente 9) el menú de su plaza del 22 dice que ya no está y no ofrece «Falta estos días…»
    await hazlo(pg, () => openMenuTurno('2026-09-22', 'ZAPA_M', 'adrian', document.querySelector('[data-cas="2026-09-22|ZAPA_M"] .pchip[data-pid="adrian"]')));
    const menu = await pg.evaluate(() => { const m = document.getElementById('menuTurnoPop'); return m ? { txt: m.textContent.replace(/\s+/g, ' '), cob: !!m.querySelector('[data-mt="cobertura"]') } : null; });
    ok('el menú de la plaza del 22 dice «ya no trabaja con nosotros desde el 23/9» y no ofrece «Falta estos días…»', !!menu && /ya no trabaja con nosotros desde el 23\/9/.test(menu.txt) && !menu.cob, JSON.stringify(menu));
    await hazlo(pg, () => cerrarPops());
    await pg.evaluate(() => irAIso('2026-09-24'));
    ok('Hoy (jueves 24): ya no está en Zapatillera', !(await pg.$('[data-cas="2026-09-24|ZAPA_M"] .pchip[data-pid="adrian"]')) && !(await pg.$('[data-cas="2026-09-24|ZAPA_T"] .pchip[data-pid="adrian"]')));
    ok('y «Libran hoy» no le lista como si librase', !(await pg.evaluate(() => [...document.querySelectorAll('#diaSide .srow')].some(r => /Adrián/.test(r.textContent)))));
    // Semana del 21/09
    await vista(pg, 'semana');
    await pg.waitForSelector('#semRoot .wav', { timeout: 8000 }).catch(() => null);
    const w = await ev(pg, '.wav[data-wpers="2026-09-22|ZAPA_M|adrian"]', x => ({ salido: x.classList.contains('salido'), tip: x.dataset.tipstr }));
    ok('Semana: la píldora del martes 22 lleva el sombreado y el aviso', !!w && w.salido && /ya no trabaja con nosotros/.test(w.tip), JSON.stringify(w));
    ok('y desde el miércoles 23 no está en ninguna casilla de la semana', await pg.evaluate(() => ![...document.querySelectorAll('.wav[data-wpers]')].some(x => x.dataset.wpers.endsWith('|adrian') && x.dataset.wpers.slice(0, 10) >= '2026-09-23')));
    ok('ni en el pie de descansos', await pg.evaluate(() => ![...document.querySelectorAll('#semRoot tr.piedesc .dn')].some(x => /Adri/.test(x.textContent))));
    // Mes
    await vista(pg, 'mes');
    await pg.waitForSelector('#view-mes td[data-asig="adrian|2026-09-22"]', { timeout: 8000 }).catch(() => null);
    const mes = await pg.evaluate(() => { const a = document.querySelector('#view-mes td[data-asig="adrian|2026-09-22"] .pill'), b = document.querySelector('#view-mes td[data-asig="adrian|2026-09-26"] .pill'); return { a: a ? a.className + '|' + a.dataset.tipstr : null, b: b ? b.className + '|' + b.textContent.trim() : null }; });
    ok('Mes: el 22 con sombreado y aviso; el 26, vacío', !!mes.a && /\bsalido\b/.test(mes.a) && /ya no trabaja con nosotros/.test(mes.a) && !!mes.b && /vacio/.test(mes.b), JSON.stringify(mes));
    // (revisión S0, cliente 2) la casilla vacía del 26 no ofrece «Poner en…» (no se puede: ya no está) y lo dice
    const nUndo = await pg.evaluate(() => undoStack.length), nDlg = dialogos.length;
    await hazlo(pg, () => openDiaPersona('adrian', '2026-09-26', document.querySelector('#view-mes td[data-asig="adrian|2026-09-26"]')));
    const popMes = await pg.evaluate(() => { const m = document.getElementById('diaPersPop'); return m ? { txt: m.textContent.replace(/\s+/g, ' '), pon: m.querySelectorAll('[data-pon]').length } : null; });
    ok('la hoja del 26 en el Mes dice que ya no está y no ofrece «Poner en…»', !!popMes && popMes.pon === 0 && /ya no trabaja con nosotros desde el 23\/9/.test(popMes.txt), JSON.stringify(popMes));
    await hazlo(pg, () => cerrarPops());
    ok('sin preguntar «¿Ponerlo de todas formas?» ni dejar nada en Deshacer', dialogos.length === nDlg && (await pg.evaluate(() => undoStack.length)) === nUndo, JSON.stringify({ dlg: dialogos.slice(nDlg), undo: await pg.evaluate(() => undoStack.length) }));
    // el selector de una casilla posterior
    await pg.evaluate(() => irAIso('2026-09-26'));
    await pg.waitForSelector('[data-cas="2026-09-26|ZAPA_M"]', { timeout: 8000 }).catch(() => null);
    await hazlo(pg, () => openPicker('2026-09-26', 'ZAPA_M', document.querySelector('[data-cas="2026-09-26|ZAPA_M"]')));
    await llega(pg, () => !!document.querySelector('#pickerPop'), null, 3000);
    // (el nombre puede salir dentro del motivo de otra persona: la baja de Susi dice «la cubre Adrián»; lo que no puede
    // haber es una fila suya en ningún grupo, tampoco en «no pueden»)
    const filasPick = await pg.evaluate(() => [...document.querySelectorAll('#pickerPop .prowp')].map(r => (r.querySelector('.pn2') || r).textContent.trim().split('\n')[0]));
    ok('el selector del sábado 26 no le ofrece en ningún grupo (ni en «no pueden»)', filasPick.length > 5 && !(await pg.$('#pickerPop [data-pickpid="adrian"]')) && !filasPick.some(t => /^Adrián/.test(t)), JSON.stringify(filasPick));
    await hazlo(pg, () => closePicker());
    // Generador de la semana del 28/09
    await generadorSemana(pg, '2026-09-28');
    ok('«Generar la semana» termina', await generar(pg) >= 0);
    const gen = await pg.evaluate(() => { const e = GEN.previa.estado; const dias = GEN.previa.dias || []; const suyos = []; for (const iso of dias) for (const t of turnosDe(S)) if (pidsEn(e, iso, t.id).includes('adrian')) suyos.push(iso + '|' + t.id); const coc = asignados(e, '2026-09-29', 'ZAPA_M').find(x => x.cocina); return { suyos, libra: dias.some(iso => (GEN.previa.libran[iso] || []).includes('adrian')), cocina: coc ? coc.pid : null, cond: GEN.previa.condiciones.some(c => c.pid === 'adrian') }; });
    ok('el Generador no le pone, no le lista librando y la cocina de Zapatillera la lleva otro (o queda como hueco)', gen.suyos.length === 0 && !gen.libra && gen.cocina !== 'adrian' && !gen.cond, JSON.stringify(gen));
    // (revisión S0, cliente 5 y modelo 9) sus plazas de la semana tipo que no se ponen salen agrupadas en una línea, no doce
    const rech = await pg.evaluate(() => { const g = [...document.querySelectorAll('#genRes .ghitem.gsalida')].map(x => x.textContent.replace(/\s+/g, ' ').trim()); const sueltos = [...document.querySelectorAll('#genRes .ghitem:not(.gsalida)')].filter(x => /Adrián/.test(x.textContent)).length; return { g, sueltos, n: GEN.previa.rechazados.filter(x => x.pid === 'adrian').length }; });
    ok(`sus ${rech.n} plazas de la semana tipo salen en UNA línea («N plazas de la semana tipo de Adrián · ya no trabaja con nosotros…»)`, rech.n > 1 && rech.g.length === 1 && new RegExp(`${rech.n} plazas de la semana tipo de Adrián`).test(rech.g[0]) && /ya no trabaja con nosotros desde el 23\/9/.test(rech.g[0]) && rech.sueltos === 0, JSON.stringify(rech));
    // «ninguna de las N personas»: sin contar a quien ya no está
    const nPers = await pg.evaluate(() => { const m = (document.querySelector('#genRes .gsres') || { textContent: '' }).textContent.match(/ninguna de las (\d+) personas/); return { txt: m ? +m[1] : null, esperado: staffEnPlantilla(S.staff, GEN.lunes).filter(p => !GEN.previa.resumen.deBaja.includes(p.id)).length, huecos: GEN.previa.resumen.huecos }; });
    ok('el texto de los huecos cuenta las personas sin quien ya no está', nPers.huecos === 0 || nPers.txt === nPers.esperado, JSON.stringify(nPers));
    ok('ninguna condición del Generador le nombra («Roberto cubre a Adrián» ya no es de esta semana)', await pg.evaluate(() => !GEN.previa.condiciones.some(c => /Adrián/.test(c.texto))), await pg.evaluate(() => JSON.stringify(GEN.previa.condiciones.filter(c => /Adrián/.test(c.texto)).map(c => c.texto))));
    // la hoja impresa de la semana del 21/09: el sombreado va también al papel
    await hazlo(pg, () => { S.semLunes = '2026-09-21'; abrirImpresion(); });
    const hoja = await pg.evaluate(() => { const s = [...document.querySelectorAll('#printRoot .pxg-s.salido')]; return { n: s.length, txt: s.map(x => x.textContent.replace(/\s+/g, ' ')).join(' | '), otros: [...document.querySelectorAll('#printRoot .pxg-s:not(.salido)')].length }; });
    ok('la hoja del equipo (solo nombres) marca sus posiciones del lunes 21 y el martes 22 con la clase «salido» (la trama), y solo las suyas', hoja.n >= 2 && hoja.txt.split(' | ').every(t => /^Adrián/.test(t)) && hoja.otros > 0, JSON.stringify(hoja));
    await hazlo(pg, () => cerrarImpresion());
    // y la posición con avisos (la hoja de la oficina) lo dice con palabras
    const slotTxt = await pg.evaluate(() => { const s = posicionesDe(S, S.staff, estadoDeIso('2026-09-22'), '2026-09-22', 'ZAPA_M').find(x => x.pid === 'adrian'); return pxSlot(s, 'M'); });
    ok('la posición con avisos lleva la clase «salido» y «ya no trabaja con nosotros (desde el 23/9)»', /class="pxg-s[^"]*salido/.test(slotTxt) && /ya no trabaja con nosotros \(desde el 23\/9\)/.test(slotTxt), slotTxt);
    // el Excel de la semana lo dice en texto (no hay estilos de celda)
    ok('el Excel de la semana le marca «(ya no está)»', /Adrián \(ya no está\)/.test(await pg.evaluate(() => xlsxNombres(asignados(estadoDeIso('2026-09-22'), '2026-09-22', 'ZAPA_M'))) || ''), await pg.evaluate(() => xlsxNombres(asignados(estadoDeIso('2026-09-22'), '2026-09-22', 'ZAPA_M'))));
    // Horas
    await hazlo(pg, () => { S.hY = 2026; S.hM = 9; switchTab('horas'); });
    await pg.waitForSelector('#view-horas tr.hrow[data-hx="adrian"]', { timeout: 8000 }).catch(() => null);
    const fila = await ev(pg, '#view-horas tr.hrow[data-hx="adrian"]', x => ({ salido: x.classList.contains('salido'), txt: x.querySelector('.pn2').textContent.replace(/\s+/g, ' ') }));
    ok('Horas de septiembre: su fila sigue (tiene turnos), marcada «ya no está»', !!fila && fila.salido && /ya no está/.test(fila.txt), JSON.stringify(fila));
    await hazlo(pg, () => { S.hM = 10; renderHoras(); });
    ok('Horas de octubre: sin nada suyo y ya fuera, no sale', await llega(pg, () => /Octubre/.test(document.getElementById('hTitle').textContent) && !document.querySelector('#view-horas tr.hrow[data-hx="adrian"]'), null, 4000) >= 0);
    // (revisión S0, cliente 6) Cobertura: Susi (su baja acaba el 20/9) tiene una plaza el 30/9; Adrián era quien la cubría
    await hazlo(pg, () => { const su = personaDeId('susi'); su.ausencias[0].hasta = '2026-09-20'; asignarUI('2026-09-30', 'ZAPA_M', 'susi', { origen: 'manual', forzar: true, razon: 'prueba' }); saveState(); });
    await vista(pg, 'cobertura');
    await pg.waitForSelector('#view-cobertura [data-pk="susi"]', { timeout: 8000 }).catch(() => null);
    await hazlo(pg, () => { COB.base = '2026-09-21'; renderCobertura(); });
    const pk1 = await pg.$$eval('#view-cobertura [data-pk]', bs => bs.map(b => b.dataset.pk)).catch(() => []);
    ok('con la tira desde el 21/9 (aún estaba) se le puede elegir en «Quién va a faltar»', pk1.includes('adrian'), JSON.stringify(pk1));
    await clic(pg, '#view-cobertura [data-pk="adrian"]');
    ok('y la cabecera dice que ya no está desde el 23/9', await llega(pg, () => /ya no trabaja con nosotros desde el 23\/9/.test((document.querySelector('#view-cobertura .cobwho') || { textContent: '' }).textContent), null, 3000) >= 0, await ev(pg, '#view-cobertura .cobwho', x => x.textContent));
    await clic(pg, '#view-cobertura [data-pk="susi"]');   // (la persona elegida se queda aunque cambie la tira: por diseño)
    await clic(pg, '[data-cobnav="7"]');
    const pk2 = await llega(pg, () => COB.base === '2026-09-28' && ![...document.querySelectorAll('#view-cobertura [data-pk]')].some(b => b.dataset.pk === 'adrian'), null, 3000);
    ok('con la tira desde el 28/9 ya no se le ofrece', pk2 >= 0, await pg.$$eval('#view-cobertura [data-pk]', bs => bs.map(b => b.dataset.pk).join(',')));
    await clic(pg, '[data-dia="2026-09-30"]');
    await clic(pg, '#cobProponer');
    await llega(pg, () => !!document.querySelector('#cobRes .cobcard'), null, 15000);
    const cobTxt = String(await ev(pg, '#cobRes', x => x.textContent.replace(/\s+/g, ' ')) || '');
    ok('la Cobertura de Susi el 30/9 no dice «tiene quien le cubra: Adrián» ni le propone', !/tiene quien le cubra: Adrián/.test(cobTxt) && !(await pg.$('#cobRes .cobrow[data-pid="adrian"]')), (cobTxt.match(/.{0,60}Adri.{0,60}/g) || []).join(' | '));
    // (revisión S0, cliente 7) las fichas: la de Susi dice que quien le cubría ya no está y sus selectores no le ofrecen
    await abrirFicha(pg, 'susi');
    const fs = await pg.evaluate(() => ({ lecubre: (document.querySelector('#fichaOvl [data-lecubre]') || { textContent: '' }).textContent.replace(/\s+/g, ' '), nunca: !!document.querySelector('#fichaOvl #fNuncaSel option[value="adrian"]'), cubre: !!document.querySelector('#fichaOvl #fCubreP option[value="adrian"]') }));
    ok('la ficha de Susi: «Si falta, le cubre Adrián · ya no está con nosotros» y los selectores no le ofrecen', /Adrián/.test(fs.lecubre) && /ya no está con nosotros/.test(fs.lecubre) && !fs.nunca && !fs.cubre, JSON.stringify(fs));
    await hazlo(pg, () => { const o = document.getElementById('fichaOvl'); if (o) o.remove(); });
    await hazlo(pg, () => openFicha('adrian'));
    await pg.waitForSelector('#fichaOvl #fichBody', { timeout: 5000 }).catch(() => null);
    const fa = await pg.evaluate(() => { const b = [...document.querySelectorAll('#fichaOvl .festrow')].find(x => /Cubre a Susi/.test(x.textContent)); return b ? b.textContent.replace(/\s+/g, ' ') : null; });
    ok('la ficha de Adrián: su «Cubre a Susi» dice que ya no se aplica', !!fa && /no se aplica/.test(fa) && /ya no/.test(fa), fa);
    await hazlo(pg, () => { const o = document.getElementById('fichaOvl'); if (o) o.remove(); });
    // Ajustes del local: las listas no se borran, se ven tachadas con el motivo
    await hazlo(pg, () => { localDe(S, 'ZAPA').primero.M = 'adrian'; openAjustesLocales('ZAPA'); });
    await pg.waitForSelector('#localesOvl .coclist', { timeout: 5000 }).catch(() => null);
    const aj = await pg.evaluate(() => { const f = [...document.querySelectorAll('#localesOvl .festrow.coc')].find(x => /Adrián/.test(x.textContent)); const o = document.querySelector('#localesOvl [data-primero="M"] option[value="adrian"]'); return { fila: f ? { salido: f.classList.contains('salido'), txt: f.textContent.replace(/\s+/g, ' ') } : null, opcion: o ? { sel: o.selected, txt: o.textContent } : null }; });
    ok('Ajustes de Zapatillera: Adrián sigue en la lista de cocina, tachado y con «ya no está con nosotros»', !!aj.fila && aj.fila.salido && /ya no está con nosotros desde el 23\/9/.test(aj.fila.txt), JSON.stringify(aj.fila));
    ok('y en «Quién abre» sigue elegido, pero dice que ya no está', !!aj.opcion && aj.opcion.sel && /ya no está con nosotros/.test(aj.opcion.txt), JSON.stringify(aj.opcion));
    await hazlo(pg, () => { const o = document.getElementById('localesOvl'); if (o) o.remove(); localDe(S, 'ZAPA').primero.M = null; });
    // Ctrl+Z: todo de una vez (ficha y planilla)
    await vista(pg, 'equipo');
    await pg.keyboard.press('Control+z');
    await llega(pg, () => !salidaDe(personaDeId('adrian')), null, 4000);
    ok('Ctrl+Z quita la salida', (await salida(pg, 'adrian')) === null);
    ok('y devuelve sus turnos', JSON.stringify(await turnosDe(pg, 'adrian', '2026-08-01', '2026-10-31')) === JSON.stringify(antes), JSON.stringify((await turnosDe(pg, 'adrian', '2026-08-01', '2026-10-31')).length) + ' vs ' + antes.length);
    ok('y vuelve a contarle en Equipo', await llega(pg, () => !!document.querySelector('#equipoRoot .eqsec:not(.eqsalidos) [data-pcard="adrian"]') && !document.querySelector('#eqSalidos [data-scard="adrian"]'), null, 4000) >= 0);
    // otra vez con salida y Restaurar desde la sección
    await hazlo(pg, () => darSalidaUI('adrian', '2026-09-23', 'prueba'));
    await vista(pg, 'equipo');
    await pg.waitForSelector('#eqSalidos [data-restaurar="adrian"]', { timeout: 5000 }).catch(() => null);
    const deAntes = await turnosDe(pg, 'adrian', '2026-08-01', '2026-10-31');
    ok('la sección viene plegada: se abre con un toque en su título', !(await ev(pg, '#eqSalidos', d => d.open)) && await clic(pg, '#eqSalidos summary') && await llega(pg, () => document.getElementById('eqSalidos').open, null, 2000) >= 0);
    await clic(pg, '#eqSalidos [data-restaurar="adrian"]');
    await llega(pg, () => !salidaDe(personaDeId('adrian')), null, 4000);
    ok('Restaurar: sin salida, otra vez en Zapatillera y sus turnos de antes siguen (los retirados no vuelven solos)', (await salida(pg, 'adrian')) === null && !!(await pg.$('#equipoRoot .eqsec:not(.eqsalidos) [data-pcard="adrian"]')) && JSON.stringify(await turnosDe(pg, 'adrian', '2026-08-01', '2026-10-31')) === JSON.stringify(deAntes));
    ok('el aviso dice «Adrián vuelve al equipo; sus turnos pasados siguen»', await pg.$$eval('#toasts .toast span', xs => xs.map(x => x.textContent)).then(ts => ts.some(t => /Adrián vuelve al equipo; sus turnos pasados siguen/.test(t))));
    // (revisión S0, cliente 4) y que los retirados no vuelven solos, con cómo recuperarlos
    ok('y que los turnos retirados desde el 23/9 no vuelven solos (Ctrl+Z o volver a generar)', await pg.$$eval('#toasts .toast span', xs => xs.map(x => x.textContent)).then(ts => ts.some(t => /Adrián vuelve al equipo/.test(t) && /desde el 23\/9 no vuelven solos/.test(t) && /Ctrl\+Z/.test(t) && /generar/.test(t))), await pg.$$eval('#toasts .toast span', xs => xs.map(x => x.textContent).join(' | ')));
    ok('y el historial lo apunta', /Vuelve al equipo: Adrián/.test(await pg.evaluate(() => (S.historial[0] || {}).txt || '')), await pg.evaluate(() => (S.historial[0] || {}).txt));
    // «Añadir persona» recuerda cerrar el mes
    await clic(pg, '#btnPersonas');
    const avAlta = String(await ev(pg, '#persOvl .salaviso', x => x.textContent) || '');
    ok('«Añadir persona» recuerda que agosto no está cerrado en Horas (sin bloquear)', /Agosto no está cerrado en Horas/.test(avAlta) && !!(await pg.$('#persOvl #persForm')), avAlta);
    await pg.context().close();
  }

  // ══ 1b) en el móvil (390×844, táctil): un solo toque abre el diálogo y otro confirma ══
  // (revisión S0, cliente 1): la ficha abre con el nombre enfocado y el sitio para el teclado dependía de :focus
  // (30vh de más en la tarjeta): al tocar un botón el campo perdía el foco, la tarjeta encogía y el botón se movía
  // bajo el dedo: había que tocar dos veces. Ahora el sitio del teclado sale de visualViewport (--kb).
  console.log('── 1b) móvil (390×844, táctil): un solo toque en «Ya no está con nosotros…» y otro en «Confirmar»');
  {
    const pg = await pagina('mov', null, { width: 390, height: 844 }, { tactil: true });
    const espera = ms => new Promise(r => setTimeout(r, ms));
    await hazlo(pg, () => openMas());
    await pg.waitForSelector('#masOvl [data-mas="equipo"]', { timeout: 4000 });
    await pg.tap('#masOvl [data-mas="equipo"]');
    await pg.waitForSelector('#equipoRoot [data-pcard="adrian"] .pmini', { timeout: 8000 });
    await pg.$eval('#equipoRoot [data-pcard="adrian"] .pmini', b => b.scrollIntoView({ block: 'center' }));
    await pg.tap('#equipoRoot [data-pcard="adrian"] .pmini');
    await pg.waitForSelector('#fichaOvl #fichBody', { timeout: 5000 });
    ok('móvil: la ficha abre con el nombre enfocado (el caso del fallo)', await llega(pg, () => document.activeElement && document.activeElement.id === 'fichNombre', null, 1500) >= 0, await pg.evaluate(() => document.activeElement && (document.activeElement.id || document.activeElement.tagName)));
    await espera(400);   // la hoja sube con animación
    const btn = await pg.$('#fichaOvl [data-salida]');
    const b0 = await btn.boundingBox();
    ok('móvil: el pie con el botón se ve sin bajar (pegado al pie de la ficha)', !!b0 && b0.y >= 0 && b0.y + b0.height <= 844, JSON.stringify(b0));
    await btn.scrollIntoViewIfNeeded(); await espera(250);
    await btn.tap();
    const t1 = await llega(pg, () => !!document.querySelector('#salidaOvl #salDesde'), null, 2500);
    ok('móvil: UN solo toque en «Ya no está con nosotros…» abre el diálogo', t1 >= 0);
    if (t1 < 0) { const b2 = await pg.$('#fichaOvl [data-salida]'); await b2.scrollIntoViewIfNeeded(); await espera(250); await b2.tap(); await llega(pg, () => !!document.querySelector('#salidaOvl #salDesde'), null, 3000); }
    const card = await ev(pg, '#salidaOvl .ovcard', x => { const r = x.getBoundingClientRect(); return { x: r.x, w: r.width, sw: x.scrollWidth, cw: x.clientWidth }; });
    ok('móvil: el diálogo cabe en 390 px sin scroll horizontal', !!card && card.x >= 0 && card.x + card.w <= 390.5 && card.sw <= card.cw + 1, JSON.stringify(card));
    await pg.fill('#salidaOvl #salDesde', X23);
    await pg.tap('#salidaOvl #salMotivo'); await pg.keyboard.type('se va a otro trabajo'); await espera(250);
    ok('móvil: el motivo tiene el foco (el caso del segundo fallo) y «Confirmar» se ve', await pg.evaluate(() => document.activeElement && document.activeElement.id === 'salMotivo') && !!(await ev(pg, '#salOk', b => { const r = b.getBoundingClientRect(); return r.y + r.height <= 844; })));
    await pg.tap('#salidaOvl #salOk');
    const t2 = await llega(pg, () => !document.getElementById('salidaOvl') && !document.getElementById('fichaOvl'), null, 2500);
    ok('móvil: UN solo toque en «Confirmar» cierra diálogo y ficha', t2 >= 0);
    if (t2 < 0) { await pg.tap('#salidaOvl #salOk').catch(() => {}); await llega(pg, () => !document.getElementById('salidaOvl'), null, 3000); }
    ok('móvil: guardado con fecha y motivo', JSON.stringify(await salida(pg, 'adrian')) === JSON.stringify({ desde: X23, motivo: 'se va a otro trabajo' }), JSON.stringify(await salida(pg, 'adrian')));
    ok('móvil: la página no tiene scroll horizontal', await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await pg.context().close();
  }

  // ══ 2) con el servidor real: borrar del todo y recuperar desde Cuenta ══
  console.log('── 2) servidor real: el programador le da la salida y le borra del todo → Cuenta → «Personas borradas» → Recuperar → otro dispositivo lo ve; su usuario no entra');
  {
    const PORT = 8880 + Math.floor(Math.random() * 80), SBASE = `http://127.0.0.1:${PORT}`;
    const dir = mkdtempSync(join(tmpdir(), 'shiftia-pas-e2e-salida-'));
    const ENV = { ...process.env, PORT: String(PORT), DATA_DIR: dir, TRUST_PROXY: '0', ADMIN_PASSWORD: 'clave12345', PROGRAMADOR_PASSWORD: '' };
    let logSrv = '';
    const proc = spawn('node', [join(RAIZ, 'server.js')], { env: ENV, stdio: ['ignore', 'pipe', 'pipe'] });
    proc.stdout.on('data', d => { logSrv += d; }); proc.stderr.on('data', d => { logSrv += d; });
    const jar = () => ({ cookie: '' });
    const api = async (j, m, ruta, cuerpo) => {
      const r = await fetch(SBASE + ruta, { method: m, headers: { 'Content-Type': 'application/json', Origin: SBASE, ...(j.cookie ? { Cookie: j.cookie } : {}) }, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) });
      const sc = r.headers.get('set-cookie'); if (sc) j.cookie = sc.split(';')[0];
      return { ok: r.ok, status: r.status, datos: await r.json().catch(() => null) };
    };
    // 30/09 (A4): «hoy» en la hora de Madrid, como lo calculan la app (isoHoy → fechaMadrid) y el servidor (borradoEn), no en la
    // del sistema: a partir de las 22:00 UTC Node iba un día por detrás
    const ISO_HOY = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });
    try {
      const salud = await hasta(async () => (await fetch(SBASE + '/api/salud')).ok, 20000, 150);
      ok(`el servidor arranca en ${PORT}`, !!salud.v, logSrv.slice(-300));
      if (!salud.v) throw new Error('el servidor no responde');
      const entrar = async (pg, usuario, pass) => { await pg.goto(SBASE + '/'); await pg.waitForSelector('#loginForm', { timeout: 10000 }); await pg.fill('#loginUser', usuario); await pg.fill('#loginPass', pass); await pg.click('#loginBtn'); };
      const appCargada = pg => llega(pg, () => typeof SRV !== 'undefined' && SRV.on && !!SRV.rol && !!document.querySelector('#view-hoy .loccard'), null, 15000);
      const ctxA = await br.newContext({ viewport: { width: 1280, height: 900 } });
      const A = await ctxA.newPage();
      await prepararPagina(A, errores, 'A (diego)');
      await entrar(A, 'diego', '12345678');
      ok('diego entra (programador)', await appCargada(A) >= 0 && await A.evaluate(() => SRV.rol === 'programador'));
      const jD = jar();
      await api(jD, 'POST', '/api/login', { usuario: 'diego', password: '12345678' });
      const primera = await hasta(async () => { const r = await api(jD, 'GET', '/api/estado'); return r.ok && r.datos.version >= 1 && r.datos.estado ? r.datos : null; }, 10000);
      ok('la app crea la planilla en el servidor, con Adrián y sus turnos', !!primera.v && primera.v.estado.staff.some(p => p.id === 'adrian'));
      const ctxB = await br.newContext({ viewport: { width: 1280, height: 900 } });
      const B = await ctxB.newPage();
      await prepararPagina(B, errores, 'B (oficina)');
      await entrar(B, 'oficina', 'clave12345');
      ok('la oficina entra en otro navegador', await appCargada(B) >= 0);
      // la salida desde hoy y «Borrar del todo» (doble confirmación, aceptada por prepararPagina)
      // (30/09, A4) sus turnos de antes de hoy, que la salida no toca: el día 1 del mes el demo (el mes en curso y el siguiente) no
      // tiene ninguno, el resto del mes sí; antes se exigía «más de 0» y el día 1 fallaba
      const antesDeHoy = await A.evaluate(iso => { let n = 0; for (const k of Object.keys(S.meses)) for (const [d, porT] of Object.entries(S.meses[k].asig || {})) if (d < iso) for (const l of Object.values(porT)) if (l.some(x => x.pid === 'adrian')) n++; return n; }, ISO_HOY);
      await A.evaluate(iso => darSalidaUI('adrian', iso, 'se va'), ISO_HOY);
      const nAntes = await A.evaluate(() => { let n = 0; for (const k of Object.keys(S.meses)) for (const porT of Object.values(S.meses[k].asig || {})) for (const l of Object.values(porT)) if (l.some(x => x.pid === 'adrian')) n++; return n; });
      ok(`con la salida desde hoy le quedan en el servidor exactamente sus turnos de antes (${antesDeHoy}) y ninguno desde hoy`, nAntes === antesDeHoy, `${nAntes} vs ${antesDeHoy}`);
      await A.click('.tab[data-v="equipo"]');
      await A.waitForSelector('#eqSalidos [data-borrartodo="adrian"]', { timeout: 8000, state: 'attached' });
      const vAntes = await A.evaluate(() => SRV.version);
      await A.click('#eqSalidos summary');
      await llega(A, () => document.getElementById('eqSalidos').open, null, 2000);
      await A.click('#eqSalidos [data-borrartodo="adrian"]');
      ok('«Borrar del todo» le quita de la plantilla y de la planilla', await llega(A, () => !S.staff.some(p => p.id === 'adrian'), null, 5000) >= 0);
      const borrado = await hasta(async () => { const r = await api(jD, 'GET', '/api/estado'); return r.ok && r.datos.version > vAntes && !r.datos.estado.staff.some(p => p.id === 'adrian') ? r.datos : null; }, 10000);
      ok(`y llega al servidor (versión ${borrado.v ? borrado.v.version : '?'})`, !!borrado.v);
      const lista = await api(jD, 'GET', '/api/estado/borrados');
      ok('la API lista a Adrián como borrado, con la última versión que le tenía', lista.ok && Array.isArray(lista.datos) && lista.datos.some(x => x.pid === 'adrian' && x.version >= 1 && x.borradoEn === ISO_HOY), JSON.stringify(lista.datos));
      // Cuenta → «Personas borradas» → Recuperar
      await A.click('#topCuenta');
      const tB = await llega(A, () => !!document.querySelector('#ctaOvl #borradosSrv [data-recuperar]'), null, 8000);
      ok(`Cuenta enseña «Personas borradas» con Adrián (${tB} ms)`, tB >= 0 && /Adrián/.test(await A.$eval('#ctaOvl #borradosSrv', x => x.textContent)), await A.$eval('#ctaOvl', x => (x.querySelector('#borradosSrv') || { textContent: 'sin bloque' }).textContent.slice(0, 200)).catch(() => 'sin Cuenta'));
      await A.click('#ctaOvl #borradosSrv [data-recuperar]');
      ok('Recuperar: la ficha vuelve, marcada «ya no está» desde el día en que se borró', await llega(A, () => S.staff.some(p => p.id === 'adrian'), null, 8000) >= 0 && await A.evaluate(iso => { const s = salidaDe(personaDeId('adrian')); return !!s && s.desde === iso && /recuperada/.test(s.motivo || ''); }, ISO_HOY), await A.evaluate(() => JSON.stringify(salidaDe(personaDeId('adrian')))));
      const nTras = await A.evaluate(() => { let n = 0; for (const k of Object.keys(S.meses)) for (const porT of Object.values(S.meses[k].asig || {})) for (const l of Object.values(porT)) if (l.some(x => x.pid === 'adrian')) n++; return n; });
      ok(`y sus turnos de antes de hoy vuelven (${nTras})`, nTras === nAntes, `${nTras} vs ${nAntes}`);
      ok('el historial lo apunta («Recuperada Adrián de la versión N: ficha y N turnos»)', /Recuperada Adrián de la versión \d+: ficha y \d+ turnos/.test(await A.evaluate(() => (S.historial[0] || {}).txt || '')), await A.evaluate(() => (S.historial[0] || {}).txt));
      await A.click('#ctaOvl [data-ovx]').catch(() => {});
      await A.click('.tab[data-v="equipo"]');
      ok('Equipo le lista en «Ya no están con nosotros»', await llega(A, () => !!document.querySelector('#eqSalidos [data-scard="adrian"]'), null, 5000) >= 0);
      const tSSE = await llega(B, () => S.staff.some(p => p.id === 'adrian') && !!salidaDe(personaDeId('adrian')), null, 10000);
      ok(`otro dispositivo (la oficina) lo ve igual sin recargar (${tSSE} ms)`, tSSE >= 0);
      const nB = await B.evaluate(() => { let n = 0; for (const k of Object.keys(S.meses)) for (const porT of Object.values(S.meses[k].asig || {})) for (const l of Object.values(porT)) if (l.some(x => x.pid === 'adrian')) n++; return n; });
      ok('con sus turnos', nB === nAntes, `${nB} vs ${nAntes}`);
      // su usuario ya no entra
      const alta = await api(jD, 'POST', '/api/usuarios', { usuario: 'adrian', rol: 'empleado', pid: 'adrian', password: 'adrianclave1' });
      ok('se crea la cuenta de Adrián', alta.ok, JSON.stringify(alta.datos));
      const lg = await api(jar(), 'POST', '/api/login', { usuario: 'adrian', password: 'adrianclave1' });
      ok('y ya no puede entrar: 403 «Ya no tienes acceso a la app»', lg.status === 403 && !!lg.datos && lg.datos.salida === true && /Ya no tienes acceso a la app/.test(lg.datos.error), JSON.stringify(lg));
      ok('sin errores de página en los dos navegadores', errores.length === 0, errores.slice(0, 4).join(' | '));
    } finally {
      try { proc.kill(); } catch (e) {}
      rmSync(dir, { recursive: true, force: true });
    }
  }
  ok('ningún error de página en toda la batería', !errores.length, errores.join(' | '));
} finally {
  await br.close(); srv.close();
}
console.log(`\ntiempo: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
resumen();
