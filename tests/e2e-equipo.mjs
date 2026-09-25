// EQUIPO: PANEL «CONDICIONES DEL GRUPO» Y FICHAS CON INTERRUPTORES (14/09).
// Modo local (servidor estático propio, sesión abierta por addInitScript, ?demo=1).
// En escritorio (1280×900): el botón «Condiciones» abre el catálogo que comprueba
// el generador (≥ 30 condiciones, las tres NUEVA), los interruptores de las reglas
// del grupo escriben S.reglas y el historial; en la ficha de Lavinia se apaga
// «Nunca con» con Mari Luz, la pareja (fase 6, S21: nuncaConOff en las dos fichas; la condición sale del
// catálogo y vuelve al reactivarla
// desde el panel); a Cristian se le pone «nunca el primero» de mañana desde la ficha
// y se ve en su tarjeta; deshacer y persistencia. En el móvil (400×820): el panel y
// la ficha sin desbordar y con filas tocables (≥ 44 px). Cuenta como fallo un
// `pageerror` o un assert. SHOTS_DIR=/carpeta guarda cuatro capturas equipo-*.png.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { join, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cargarChromium, contador, llega, prepararPagina } from './e2e-util.mjs';

const { chromium, CHROMIUM } = await cargarChromium();
const RAIZ = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'));
const { ok, resumen } = contador();
const t0 = Date.now();
const SHOTS = process.env.SHOTS_DIR || '';
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const captura = async (pg, nombre) => { if (!SHOTS) return; try { await pg.screenshot({ path: join(SHOTS, `equipo-${nombre}.png`) }); } catch (e) { console.log(`  (captura ${nombre} fallida: ${e.message})`); } };

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
setTimeout(() => { console.log('  ✗ tiempo agotado (90 s)'); process.exit(1); }, 90000).unref();

const errores = [];
const abrirContexto = async (br, viewport, movil) => {
  const ctx = await br.newContext(Object.assign({ viewport }, movil ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}));
  await ctx.addInitScript(() => { try { sessionStorage.setItem('shiftia_pas_sesion', '1'); sessionStorage.setItem('shiftia_pas_rol', 'admin'); } catch (e) {} });
  return ctx;
};
const visible = async (pg, sel) => pg.evaluate(s => { const el = document.querySelector(s); if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; }, sel);
const vista = async (pg, v) => { await pg.click(`.tab[data-v="${v}"]`); return llega(pg, v => { const s = document.getElementById('view-' + v); return !!s && !s.classList.contains('hidden'); }, v, 4000); };
const alto = async (pg, sel) => pg.evaluate(s => { const el = document.querySelector(s); return el ? Math.round(el.getBoundingClientRect().height) : -1; }, sel);
const persona = (pg, pid) => pg.evaluate(id => { const p = S.staff.find(x => x.id === id); return p ? { inactivas: p.inactivas || [], noPrimero: p.noPrimero || [] } : null; }, pid);
const nCondiciones = pg => pg.$$eval('#condOvl .condrow[data-cid]:not(.off)', x => x.length);
const contador2 = pg => pg.$eval('#condOvl #condCount', el => { const m = el.textContent.match(/(\d+)\s+condiciones activas\s+·\s+(\d+)\s+apagadas/); return m ? { activas: +m[1], apagadas: +m[2] } : null; });
const textoHistorial = pg => pg.evaluate(() => (S.historial || []).slice(0, 12).map(h => `${h.tipo}: ${h.txt}`));
const abrirPanel = async pg => { await pg.click('#btnCondiciones'); return llega(pg, () => !!document.querySelector('#condOvl #condBody .condrow'), null, 4000); };
const cerrarOvl = async (pg, id) => { await pg.click(`#${id} [data-ovx]`); return llega(pg, id => !document.getElementById(id), id, 3000); };

const br = await chromium.launch({ executablePath: CHROMIUM, args: ['--no-sandbox'] });
try {
  // ══════════════ ESCRITORIO 1280×900 ══════════════
  console.log('── escritorio 1280×900 · modo local · ?demo=1');
  const ctx = await abrirContexto(br, { width: 1280, height: 900 });
  const pg = await ctx.newPage();
  await prepararPagina(pg, errores, 'escritorio');
  await pg.goto(BASE + '/index.html?demo=1');
  await pg.waitForSelector('#view-hoy .loccard', { timeout: 15000 });
  ok('la app arranca en modo local con la sesión abierta', !(await pg.$('.lockscr')) && await pg.evaluate(() => SRV.on === false));
  await vista(pg, 'equipo');
  await pg.waitForSelector('#equipoRoot .cards', { timeout: 5000 });

  // 1) el botón «Condiciones» junto a «Ajustes de los locales» y las tarjetas con «nunca 1.º»
  ok('Equipo: hay un botón «Condiciones» junto a «Ajustes de los locales»', await pg.evaluate(() => { const b = document.getElementById('btnCondiciones'), l = document.getElementById('btnLocales'); return !!b && !!l && b.parentElement === l.parentElement && b.nextElementSibling === l && /Condiciones/.test(b.textContent); }));
  ok('la tarjeta de Cristian pinta «Nunca 1.º · de tarde» (p.noPrimero de la semilla)', await pg.$$eval('#equipoRoot [data-pcard="cristian"] .tchip', xs => xs.some(x => /Nunca 1\.º/.test(x.textContent) && /de tarde/.test(x.textContent))), await pg.$$eval('#equipoRoot [data-pcard="cristian"] .tchip', xs => xs.map(x => x.textContent).join(' | ')));
  ok('la de Leo, «Nunca 1.º · de mañana ni de tarde»', await pg.$$eval('#equipoRoot [data-pcard="leo"] .tchip', xs => xs.some(x => /Nunca 1\.º/.test(x.textContent) && /mañana ni de tarde/.test(x.textContent))));
  ok('sin nada apagado, ninguna chip sale tachada', await pg.$$eval('#equipoRoot .tchip.off', x => x.length) === 0);

  // 2) el panel: catálogo ≥ 30 con las tres NUEVA, reglas del grupo, contador y grupos
  ok('«Condiciones» abre el panel #condOvl con el catálogo', await abrirPanel(pg) >= 0);
  const n1 = await nCondiciones(pg);
  const nModelo = await pg.evaluate(() => condicionesDe(S, S.staff).length);
  ok(`el catálogo lista ≥ 30 condiciones activas (${n1}), las mismas que condicionesDe (${nModelo})`, n1 >= 30 && n1 === nModelo, `${n1} / ${nModelo}`);
  const nuevas = await pg.$$eval('#condOvl .condrow[data-cid]:not(.off) .condnew', x => x.length);
  ok(`las condiciones NUEVA llevan su etiqueta (Leo, Cristian, el primero completo, el partido que abre en Pasarela y El 33, desde la revisión F3 «dos apoyos no se quedan solos» y desde la revisión F4 «quien lleva la cocina no refuerza la sala»): ${nuevas}`, nuevas === 8, nuevas);
  ok('la lista está numerada como el modelo (1…N, sin saltos)', await pg.$$eval('#condOvl .condrow[data-cid]:not(.off) .condnum', xs => xs.every((x, i) => +x.textContent === i + 1)));
  // (fase 6, S22) «quien hace partido puede abrir la tarde» es de los locales, no una regla del grupo
  ok('las condiciones van agrupadas por tipo: mínimos, cocina, personas, reglas y locales', await pg.$$eval('#condOvl .condgrp', xs => xs.map(x => x.dataset.grp).join(',')) === 'minimos,cocina,persona,regla,local', await pg.$$eval('#condOvl .condgrp', xs => xs.map(x => x.dataset.grp).join(',')));
  const nReglas = await pg.evaluate(() => REGLAS.length);
  ok(`arriba, una fila con interruptor por regla del grupo (${nReglas}), dos de ellas NUEVA`, await pg.$$eval('#condOvl [data-regla-row] input[role="switch"]', x => x.length) === nReglas && await pg.$$eval('#condOvl [data-regla-row] .condnew', x => x.length) === 2);
  ok('todas las reglas empiezan encendidas (aria-checked="true")', await pg.$$eval('#condOvl [data-regla-row] input[role="switch"]', xs => xs.every(x => x.checked && x.getAttribute('aria-checked') === 'true')));
  const c1 = await contador2(pg);
  ok(`el contador dice «${n1} condiciones activas · 0 apagadas»`, !!c1 && c1.activas === n1 && c1.apagadas === 0, JSON.stringify(c1));
  ok('cada condición de una ficha lleva su interruptor; las de mínimos y cocina enlazan a «Ajustes del local»; la regla, a su interruptor', await pg.evaluate(() => {
    const filas = [...document.querySelectorAll('#condOvl .condrow[data-cid]:not(.off)')];
    const por = t => filas.filter(f => f.dataset.cid.startsWith(t));
    // (fase 6, S21) las de «nunca con», el de su pareja (data-par)
    return por('p:').every(f => f.querySelector('input[data-car][role="switch"], input[data-par][role="switch"]')) && por('min:').concat(por('coc:')).concat(por('loc:')).every(f => f.querySelector('[data-condlocal]')) && por('reg:').every(f => f.querySelector('[data-irregla]'));
  }));
  ok('las condiciones informativas («cubre a») van marcadas en gris', await pg.$$eval('#condOvl .condrow.info', xs => xs.length >= 1 && xs.every(x => /informativa/.test(x.textContent))));

  // 3) apagar la regla primeroCompleto: S.reglas, historial, catálogo, guardado; y encenderla desde «apagadas»
  await pg.click('#condOvl [data-regla-row="primeroCompleto"] .tglk');
  ok('apagar «el primero hace turno completo» escribe S.reglas.primeroCompleto === false', await llega(pg, () => S.reglas && S.reglas.primeroCompleto === false, null, 3000) >= 0, JSON.stringify(await pg.evaluate(() => S.reglas)));
  ok('el historial lo registra como EQUIPO («Regla «…» desactivada»)', await pg.evaluate(() => (S.historial || []).some(h => h.tipo === 'equipo' && /^Regla «.*turno completo.*» desactivada$/.test(h.txt))), (await textoHistorial(pg)).slice(0, 2).join(' | '));
  ok('la condición 32 sale del catálogo activo y aparece tachada en «apagadas»', !(await pg.$('#condOvl .condrow[data-cid="reg:primeroCompleto"]')) && !!(await pg.$('#condOvl .condrow.off[data-cid="off:regla:reg:primeroCompleto"]')));
  ok('el interruptor de la regla queda apagado (aria-checked="false") y la fila marcada', await pg.$eval('#condOvl [data-regla-row="primeroCompleto"]', r => r.classList.contains('off') && r.querySelector('input').getAttribute('aria-checked') === 'false' && !r.querySelector('input').checked));
  const c2 = await contador2(pg);
  ok(`el contador baja a ${n1 - 1} activas · 1 apagada`, !!c2 && c2.activas === n1 - 1 && c2.apagadas === 1, JSON.stringify(c2));
  ok('se guarda en localStorage (shiftia_pasarela_v01.reglas)', await pg.evaluate(() => { try { return JSON.parse(localStorage.getItem('shiftia_pasarela_v01')).reglas.primeroCompleto === false; } catch (e) { return false; } }));
  ok('el modelo deja de aplicarla: puedePrimero ya no exige turno completo', await pg.evaluate(() => regla(S, 'primeroCompleto') === false));
  await pg.click('#condOvl .condrow.off[data-cid="off:regla:reg:primeroCompleto"] .tglk');
  ok('el interruptor de la fila tachada vuelve a encender la regla (S.reglas.primeroCompleto === true) y la condición vuelve', await llega(pg, () => S.reglas.primeroCompleto === true && !!document.querySelector('#condOvl .condrow[data-cid="reg:primeroCompleto"]:not(.off)'), null, 3000) >= 0);
  ok('…con su registro en el historial («activada»)', await pg.evaluate(() => (S.historial || []).some(h => h.tipo === 'equipo' && /^Regla «.*turno completo.*» activada$/.test(h.txt))));

  // 4) buscador y enlace «Regla del grupo ↑»
  await pg.fill('#condOvl #condQ', 'leo');
  const filtro = await pg.evaluate(() => { const v = [...document.querySelectorAll('#condOvl .condrow')].filter(r => !r.hidden); return { n: v.length, todasLeo: v.every(r => /leo/.test(r.dataset.q)) }; });
  ok(`el buscador filtra por texto: «leo» deja ${filtro.n} filas y todas hablan de Leo`, filtro.n >= 2 && filtro.todasLeo, JSON.stringify(filtro));
  await pg.fill('#condOvl #condQ', 'zzzz');
  ok('sin coincidencias avisa «Nada coincide con el filtro»', await llega(pg, () => !!document.querySelector('#condOvl #condSinRes'), null, 2000) >= 0);
  await pg.fill('#condOvl #condQ', '');
  ok('vaciar el filtro devuelve todas las filas', await pg.evaluate(() => [...document.querySelectorAll('#condOvl .condrow')].every(r => !r.hidden)));
  await pg.click('#condOvl [data-irregla="primeroCompleto"]');
  ok('«Regla del grupo ↑» resalta la fila de su interruptor', await llega(pg, () => document.querySelector('#condOvl [data-regla-row="primeroCompleto"]').classList.contains('flash'), null, 2000) >= 0);

  // 5) interruptor de una ficha desde el catálogo: los vetos de Cristian
  await pg.click('#condOvl .condrow[data-cid^="p:cristian:veto:"] .tglk');
  ok('apagar desde el catálogo «No hace» de Cristian escribe p.inactivas = ["vetos"]', await llega(pg, () => (S.staff.find(p => p.id === 'cristian').inactivas || []).includes('vetos'), null, 3000) >= 0, JSON.stringify(await persona(pg, 'cristian')));
  ok('la condición pasa tachada a «apagadas» con la nota de la ficha', await pg.$$eval('#condOvl .condrow.off[data-cid^="off:cristian:vetos:"]', xs => xs.length === 1 && /apagada en la ficha de Cristian/.test(xs[0].textContent)));
  ok('el historial: «Ficha de Cristian: «No hace (local y franja)» desactivada» (EQUIPO)', await pg.evaluate(() => (S.historial || []).some(h => h.tipo === 'equipo' && /^Ficha de Cristian: «No hace \(local y franja\)» desactivada$/.test(h.txt))), (await textoHistorial(pg)).slice(0, 2).join(' | '));
  ok('y en su tarjeta la chip «No hace» sale tachada', await pg.$$eval('#equipoRoot [data-pcard="cristian"] .tchip.off', xs => xs.length === 1 && /No hace/.test(xs[0].textContent)));
  await pg.click('#condOvl .condrow.off[data-cid^="off:cristian:vetos:"] .tglk');
  ok('reactivarla desde la fila tachada la devuelve al catálogo y limpia p.inactivas', await llega(pg, () => !(S.staff.find(p => p.id === 'cristian').inactivas || []).includes('vetos') && !!document.querySelector('#condOvl .condrow[data-cid^="p:cristian:veto:"]:not(.off)'), null, 3000) >= 0);
  ok('el panel se cierra con «Listo»', await cerrarOvl(pg, 'condOvl') >= 0);

  // 6) ficha de Lavinia: apagar la pareja «Nunca con» Mari Luz
  await pg.click('#equipoRoot .pcfoot [data-ficha="lavinia"]');
  ok('la ficha de Lavinia se abre', await llega(pg, () => !!document.querySelector('#fichaOvl #fichBody .fcar'), null, 4000) >= 0);
  // (fase 6) «Nunca con» lleva uno por pareja, no uno de la característica entera (S21)
  const nCar = await pg.evaluate(() => CARACTERISTICAS.filter(c => !c.porPareja).length);
  ok(`cada característica de la ficha lleva su interruptor «activa» (${nCar})`, await pg.$$eval('#fichaOvl [data-car-tgl]', x => x.length) === nCar && await pg.$$eval('#fichaOvl .fcar', xs => xs.every(x => !x.classList.contains('off'))), await pg.$$eval('#fichaOvl [data-car-tgl]', x => x.length));
  ok('hay bloque «No sale nunca el primero» con las chips Mañana y Tarde y la marca NUEVA', await pg.evaluate(() => { const b = document.querySelector('#fichaOvl .fcar[data-car="noPrimero"]'); return !!b && b.querySelectorAll('[data-tnoprimero]').length === 2 && !!b.querySelector('.condnew'); }));
  // (fase 6, S21) el interruptor es el de la pareja Lavinia–Mari Luz: se apaga en las dos fichas, sin tocar
  // la característica entera (antes, en cascada, apagaba también las demás parejas de las dos)
  await pg.click('#fichaOvl [data-par="mariluz"] .tgl .tglk');
  const off2 = () => pg.evaluate(() => ['lavinia', 'mariluz'].map(id => (S.staff.find(p => p.id === id).nuncaConOff || []).join(',')));
  ok('apagar la pareja con Mari Luz en la ficha de Lavinia la apaga en las dos fichas (nuncaConOff)', await llega(pg, () => (S.staff.find(p => p.id === 'lavinia').nuncaConOff || []).includes('mariluz') && (S.staff.find(p => p.id === 'mariluz').nuncaConOff || []).includes('lavinia'), null, 3000) >= 0, JSON.stringify(await off2()));
  ok('sin apagar la característica entera de nadie', await pg.evaluate(() => S.staff.every(p => !(p.inactivas || []).includes('nuncaCon'))));
  ok('la fila de la pareja se ve apagada con el aviso «el generador no la tiene en cuenta», y se sigue editando', await pg.evaluate(() => { const r = document.querySelector('#fichaOvl [data-par="mariluz"]'); const b = document.querySelector('#fichaOvl .fcar[data-car="nuncaCon"]'); return r.classList.contains('off') && /no la tiene en cuenta/.test(r.textContent) && !!b.querySelector('[data-addnunca]') && !b.querySelector('[data-addnunca]').disabled; }));
  ok('el catálogo (condicionesDe) ya no lleva la condición «Lavinia y Mari Luz no coinciden»', await pg.evaluate(() => !condicionesDe(S, S.staff).some(c => c.k === 'nuncaCon' && (c.pid === 'lavinia' || c.otro === 'lavinia'))));
  ok('el modelo lo aplica: Lavinia y Mari Luz ya pueden coincidir (puedeEstar en una tarde de Pasarela)', await pg.evaluate(() => {
    // un día del mes en que Pasarela abre por la tarde y Lavinia no libra (libra L, M y J)
    const e = clonarEstado(est);
    const d = est.days.find(x => [3, 5, 6, 7].includes(isoDow(x.iso)) && turnoAbierto(S, e, x.iso, 'PASARELA_T')); if (!d) return 'sin día';
    e.asig[d.iso] = { PASARELA_T: [{ pid: 'mariluz', origen: 'manual' }] };
    const r = puedeEstar(S, S.staff, e, d.iso, 'PASARELA_T', 'lavinia', {});
    return r.ok === true || r.motivo;
  }) === true, 'motivo devuelto (se esperaba ok)');
  ok('el historial: «Ficha de Lavinia: «nunca con» Mari Luz apagada (la pareja, en las dos fichas)» (EQUIPO)', await pg.evaluate(() => (S.historial || []).some(h => h.tipo === 'equipo' && /^Ficha de Lavinia: «nunca con» Mari Luz apagada \(la pareja, en las dos fichas\)$/.test(h.txt))), (await textoHistorial(pg)).slice(0, 2).join(' | '));
  ok('se guarda en localStorage (nuncaConOff de las dos fichas)', await pg.evaluate(() => { try { const st = JSON.parse(localStorage.getItem('shiftia_pasarela_v01')).staff; return st.find(p => p.id === 'lavinia').nuncaConOff.includes('mariluz') && st.find(p => p.id === 'mariluz').nuncaConOff.includes('lavinia'); } catch (e) { return false; } }));
  await pg.evaluate(() => document.querySelector('#fichaOvl .fcar[data-car="nuncaCon"]').scrollIntoView({ block: 'center' }));
  await captura(pg, 'ficha-escritorio');
  ok('la ficha se cierra con «Listo»', await cerrarOvl(pg, 'fichaOvl') >= 0);
  ok('en las tarjetas, «Nunca con» de esa pareja sale tachada en Lavinia y en Mari Luz', await pg.evaluate(() => [['lavinia', 'Mari Luz'], ['mariluz', 'Lavinia']].every(([id, otro]) => [...document.querySelectorAll(`#equipoRoot [data-pcard="${id}"] .tchip.off`)].some(x => /Nunca con/.test(x.textContent) && x.textContent.includes(otro)))));

  // 7) desde el panel: la apagada se ve tachada y se reactiva
  ok('el panel vuelve a abrirse', await abrirPanel(pg) >= 0);
  const c3 = await contador2(pg);
  ok(`el contador cuenta 1 apagada (la pareja) y ${n1 - 1} activas`, !!c3 && c3.apagadas === 1 && c3.activas === n1 - 1, JSON.stringify(c3));
  const filaOff = await pg.evaluate(() => { const r = [...document.querySelectorAll('#condOvl .condrow.off')].find(x => { const d = (x.querySelector('input[data-par]') || { dataset: {} }).dataset.par || ''; return d.split('|').sort().join('|') === 'lavinia|mariluz'; }); return r ? { cid: r.dataset.cid, txt: r.textContent.replace(/\s+/g, ' ').trim() } : null; });
  ok('«apagadas» pinta la condición tachada, una sola vez, diciendo que está apagada esa pareja', !!filaOff && /no coinciden/.test(filaOff.txt) && /pareja/.test(filaOff.txt) && await pg.$$eval('#condOvl .condrow.off', xs => xs.filter(x => /no coinciden/.test(x.textContent)).length) === 1, JSON.stringify(filaOff));
  await captura(pg, 'panel-escritorio');
  await pg.evaluate(() => { const r = document.querySelector('#condOvl .condrow.off'); if (r) r.scrollIntoView({ block: 'center' }); });
  await captura(pg, 'panel-escritorio-apagadas');
  await pg.click(`#condOvl .condrow.off[data-cid="${filaOff ? filaOff.cid : 'x'}"] .tglk`);
  ok('reactivarla desde el panel devuelve la condición al catálogo y limpia las dos fichas', await llega(pg, () => condicionesDe(S, S.staff).some(c => c.k === 'nuncaCon' && (c.pid === 'lavinia' || c.otro === 'lavinia')) && ['lavinia', 'mariluz'].every(id => !(S.staff.find(p => p.id === id).nuncaConOff || []).length), null, 3000) >= 0, JSON.stringify(await persona(pg, 'lavinia')));
  const c4 = await contador2(pg);
  ok(`el contador vuelve a ${n1} activas · 0 apagadas`, !!c4 && c4.activas === n1 && c4.apagadas === 0, JSON.stringify(c4));
  ok('«Ajustes del local» desde una condición de mínimos abre los ajustes de ese local', (await pg.click('#condOvl .condrow[data-cid^="min:EL33:"] [data-condlocal]'), await llega(pg, () => !!document.querySelector('#localesOvl [data-loctab="EL33"].on'), null, 3000) >= 0));
  await cerrarOvl(pg, 'localesOvl');
  ok('al cerrar los ajustes, el panel sigue abierto', !!(await pg.$('#condOvl #condBody .condrow')));
  await cerrarOvl(pg, 'condOvl');

  // 8) Cristian: «no sale nunca el primero» de mañana desde la ficha, tarjeta y deshacer
  await pg.click('#equipoRoot .pcfoot [data-ficha="cristian"]');
  await llega(pg, () => !!document.querySelector('#fichaOvl .fcar[data-car="noPrimero"]'), null, 4000);
  ok('la ficha de Cristian trae «Tarde» marcada y «Mañana» no', await pg.evaluate(() => document.querySelector('#fichaOvl [data-tnoprimero="T"]').classList.contains('on') && !document.querySelector('#fichaOvl [data-tnoprimero="M"]').classList.contains('on')));
  await pg.click('#fichaOvl [data-tnoprimero="M"]');
  ok('tocar «Mañana» deja p.noPrimero = ["M","T"]', await llega(pg, () => JSON.stringify(S.staff.find(p => p.id === 'cristian').noPrimero) === '["M","T"]', null, 3000) >= 0, JSON.stringify(await persona(pg, 'cristian')));
  ok('el historial lo anota en la ficha (EQUIPO)', await pg.evaluate(() => (S.historial || []).some(h => h.tipo === 'equipo' && /^Ficha de Cristian: nunca el primero de mañana añadido$/.test(h.txt))), (await textoHistorial(pg)).slice(0, 2).join(' | '));
  ok('el modelo lo aplica: Cristian ya no puede abrir una mañana', await pg.evaluate(() => puedePrimero(S, S.staff, est, isoDia(), 'MONACO_M', 'cristian').ok === false));
  await cerrarOvl(pg, 'fichaOvl');
  ok('la tarjeta de Cristian pasa a «Nunca 1.º · de mañana ni de tarde»', await pg.$$eval('#equipoRoot [data-pcard="cristian"] .tchip', xs => xs.some(x => /Nunca 1\.º/.test(x.textContent) && /de mañana ni de tarde/.test(x.textContent))), await pg.$$eval('#equipoRoot [data-pcard="cristian"] .tchip', xs => xs.map(x => x.textContent).join(' | ')));
  await pg.keyboard.press('Control+z');
  ok('Ctrl+Z deshace la ficha: p.noPrimero vuelve a ["T"] y la tarjeta también', await llega(pg, () => JSON.stringify(S.staff.find(p => p.id === 'cristian').noPrimero) === '["T"]' && [...document.querySelectorAll('#equipoRoot [data-pcard="cristian"] .tchip')].some(x => /Nunca 1\.º/.test(x.textContent) && /de tarde$/.test(x.textContent.trim())), null, 3000) >= 0, JSON.stringify(await persona(pg, 'cristian')));

  // 9) persistencia: una regla apagada sobrevive a la recarga
  await abrirPanel(pg);
  await pg.click('#condOvl [data-regla-row="cubreA"] .tglk');
  await llega(pg, () => S.reglas.cubreA === false, null, 3000);
  await pg.reload();
  await pg.waitForSelector('#view-hoy .loccard', { timeout: 15000 });
  ok('tras recargar, S.reglas.cubreA sigue apagada', await pg.evaluate(() => S.reglas && S.reglas.cubreA === false), JSON.stringify(await pg.evaluate(() => S.reglas)));
  await vista(pg, 'equipo'); await pg.waitForSelector('#equipoRoot .cards', { timeout: 5000 });
  await abrirPanel(pg);
  ok('y el panel la pinta apagada, con sus condiciones «cubre a» tachadas por la regla', await pg.evaluate(() => document.querySelector('#condOvl [data-regla-row="cubreA"]').classList.contains('off') && [...document.querySelectorAll('#condOvl .condrow.off')].some(x => /regla «.*Cubre a.*» está apagada/.test(x.textContent))));
  await ctx.close();

  // ══════════════ MÓVIL 400×820 ══════════════
  console.log('── móvil 400×820');
  const ctxM = await abrirContexto(br, { width: 400, height: 820 }, true);
  const pm = await ctxM.newPage();
  await prepararPagina(pm, errores, 'móvil');
  await pm.goto(BASE + '/index.html?demo=1');
  await pm.waitForSelector('#view-hoy .loccard', { timeout: 15000 });
  await pm.click('#bnavMas'); await pm.waitForSelector('#masOvl', { timeout: 3000 }); await pm.click('#masOvl [data-mas="equipo"]');
  ok('móvil: Equipo desde «Más»', await llega(pm, () => !document.querySelector('#masOvl') && !document.getElementById('view-equipo').classList.contains('hidden') && !!document.querySelector('#equipoRoot .cards'), null, 5000) >= 0);
  ok('móvil: el botón «Condiciones» está en la barra de acciones', await visible(pm, '#btnCondiciones'));
  ok('móvil: el panel abre', await abrirPanel(pm) >= 0);
  ok('móvil: la página no desborda a 400 px con el panel abierto', await pm.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1 && document.querySelector('#condOvl .ovcard').scrollWidth <= document.querySelector('#condOvl .ovcard').clientWidth + 1));
  const altos = await pm.evaluate(() => ({ fila: Math.round(document.querySelector('#condOvl [data-regla-row]').getBoundingClientRect().height), cond: Math.round(document.querySelector('#condOvl .condrow[data-cid]').getBoundingClientRect().height), tgl: Math.round(document.querySelector('#condOvl .tgl').getBoundingClientRect().height) }));
  ok(`móvil: filas e interruptores tocables (≥ 44 px): regla ${altos.fila}, condición ${altos.cond}, toggle ${altos.tgl}`, altos.fila >= 44 && altos.cond >= 44 && altos.tgl >= 44, JSON.stringify(altos));
  await pm.click('#condOvl [data-regla-row="noPrimero"] .tglk');
  ok('móvil: el interruptor responde al toque (regla noPrimero apagada)', await llega(pm, () => S.reglas.noPrimero === false, null, 3000) >= 0);
  await captura(pm, 'panel-movil');
  await cerrarOvl(pm, 'condOvl');
  await pm.click('#equipoRoot .pcfoot [data-ficha="lavinia"]');
  ok('móvil: la ficha de Lavinia abre como hoja', await llega(pm, () => !!document.querySelector('#fichaOvl .fcar[data-car="partido"]'), null, 4000) >= 0);
  await pm.click('#fichaOvl .fcar[data-car="partido"] .tgl .tglk');
  ok('móvil: apagar «Días de partido» desde la ficha escribe p.inactivas', await llega(pm, () => (S.staff.find(p => p.id === 'lavinia').inactivas || []).includes('partido') && document.querySelector('#fichaOvl .fcar[data-car="partido"]').classList.contains('off'), null, 3000) >= 0);
  ok('móvil: la cabecera de cada característica mide ≥ 44 px', (await alto(pm, '#fichaOvl .fcar[data-car="partido"] .fcarh')) >= 44, await alto(pm, '#fichaOvl .fcar[data-car="partido"] .fcarh'));
  ok('móvil: la ficha no desborda en horizontal', await pm.evaluate(() => { const c = document.querySelector('#fichaOvl .ovcard'); return c.scrollWidth <= c.clientWidth + 1; }));
  await pm.evaluate(() => document.querySelector('#fichaOvl .fcar[data-car="partido"]').scrollIntoView({ block: 'center' }));
  await captura(pm, 'ficha-movil');
  await ctxM.close();

  ok('sin errores de página en toda la batería', errores.length === 0, errores.slice(0, 4).join(' | '));
} catch (err) {
  ok('la batería reventó', false, err.message + '\n' + (err.stack || '').split('\n').slice(1, 3).join('\n'));
} finally {
  await br.close().catch(() => {});
  srv.close();
}
console.log(`\ntiempo: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
resumen();
