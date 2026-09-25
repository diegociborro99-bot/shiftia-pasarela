// INTERRUPTORES Y TEXTOS DE EQUIPO QUE DICEN LA VERDAD (24/09, fase 6; Diego: «que lea todas las variables»).
// Lo que Equipo enseña y promete es exactamente lo que aplican el Generador y la Cobertura. Con clics, en modo
// local (servidor estático propio, sesión abierta por addInitScript, ?demo=1, reloj el jueves 24/09/2026):
//  · S20: con una regla del grupo apagada («Días que libra»), la tarjeta la tacha diciendo que es del grupo y la
//    ficha dice «Apagada para todo el grupo (Equipo → Condiciones)» con su interruptor sin tocar;
//  · S23: el standby va fuera del bloque «Días que libra» («Alta pendiente de confirmar»): apagar «Días que
//    libra» no lo tacha, porque el standby se sigue aplicando;
//  · S21 y S24: «nunca con» es una pareja: quitar a Lavinia en la ficha de Mari Luz la quita también de la de
//    Lavinia (Ctrl+Z la devuelve a las dos), cada pareja tiene su interruptor y su «flexible», y apagar
//    Leo–Susana Capón en Equipo → Condiciones no apaga Leo–Lavinia;
//  · S22: «quien hace partido puede abrir la tarde» lleva a Ajustes del local;
//  · S16 (D5): apagar «Mínimos» dice lo que pasa;
//  · S17 (D6): «Contrato» sin interruptor (lo compara Horas);
//  · S30: el veto de Mari Luz es de los lunes en la tarjeta y en la ficha, y el alta deja poner otro día;
//  · S31: el local habitual de Roberto no cambia al quitar y volver a poner Zapatillera, y se elige;
//  · S29 (D7): «sin local fijo» es no tener locales (Tere tiene dos: no lo es; Leo, sí), en Equipo y en Horas.
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
setTimeout(() => { console.log('  ✗ tiempo agotado (120 s)'); process.exit(1); }, 120000).unref();
const br = await chromium.launch({ executablePath: CHROMIUM, args: ['--no-sandbox'] });
const errores = [];

async function pagina(etiqueta, op) {
  const o = op || {};
  const ctx = await br.newContext({ viewport: o.viewport || { width: 1280, height: 900 }, isMobile: !!o.movil, hasTouch: !!o.movil });
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
const abrirPanel = async pg => { await vista(pg, 'equipo'); await clic(pg, '#btnCondiciones'); return llega(pg, () => !!document.querySelector('#condOvl #condBody .condrow'), null, 4000); };
const persona = (pg, pid) => pg.evaluate(id => JSON.parse(JSON.stringify(S.staff.find(p => p.id === id) || null)), pid);
const chipsDe = (pg, pid) => pg.$$eval(`#equipoRoot [data-pcard="${pid}"] .tchip`, xs => xs.map(x => ({ txt: x.textContent.replace(/\s+/g, ' ').trim(), off: x.classList.contains('off'), title: x.getAttribute('title') || '' })));

try {
  const pg = await pagina('escritorio');

  // ── S20: la regla del grupo «Días que libra» apagada ──
  console.log('── S20 · una regla del grupo apagada, en la tarjeta y en la ficha');
  ok('Equipo → Condiciones abre', await abrirPanel(pg) >= 0);
  await clic(pg, '#condOvl [data-regla-row="libra"] .tglk');
  ok('apagar «Días que libra» escribe S.reglas.libra === false', await llega(pg, () => S.reglas.libra === false, null, 3000) >= 0);
  await cerrar(pg, 'condOvl');
  const libraChip = (await chipsDe(pg, 'mariluz')).find(x => /^Libra/.test(x.txt));
  ok('la tarjeta de Mari Luz tacha «Libra» y dice que es para todo el grupo', !!libraChip && libraChip.off && /todo el grupo/.test(libraChip.title), JSON.stringify(libraChip));
  ok('la ficha de Mari Luz se abre', await abrirFicha(pg, 'mariluz') >= 0);
  const bl = await pg.$eval('#fichaOvl .fcar[data-car="libra"]', x => ({ off: x.classList.contains('off'), aviso: (x.querySelector('.fcaroff') || {}).textContent || '', tgl: { disabled: x.querySelector('[data-car-tgl]').disabled, checked: x.querySelector('[data-car-tgl]').checked, title: x.querySelector('label.tgl').getAttribute('title') } })).catch(e => ({ error: e.message }));
  ok('el bloque «Libra» sale apagado y dice «Apagada para todo el grupo (Equipo → Condiciones)»', bl.off && /Apagada para todo el grupo \(Equipo → Condiciones\)/.test(bl.aviso), JSON.stringify(bl));
  ok('y su interruptor no se puede tocar desde la ficha (dice por qué)', bl.tgl && bl.tgl.disabled && /todo el grupo/.test(bl.tgl.title || ''), JSON.stringify(bl.tgl));
  ok('lo demás de la ficha sigue activo («Días de partido»)', await pg.$eval('#fichaOvl .fcar[data-car="partido"]', x => !x.classList.contains('off') && !x.querySelector('[data-car-tgl]').disabled));
  await cerrar(pg, 'fichaOvl');
  await abrirPanel(pg); await clic(pg, '#condOvl [data-regla-row="libra"] .tglk');
  ok('encenderla otra vez la quita de la tarjeta tachada', await llega(pg, () => S.reglas.libra === true, null, 3000) >= 0 && (await cerrar(pg, 'condOvl'), !((await chipsDe(pg, 'mariluz')).find(x => /^Libra/.test(x.txt)) || {}).off));

  // ── S23: el standby, fuera de «Días que libra» ──
  console.log('── S23 · el standby de Dulce');
  ok('la ficha de Dulce se abre', await abrirFicha(pg, 'dulce') >= 0);
  const sb = () => pg.evaluate(() => { const c = document.querySelector('#fichaOvl [data-chk="standby"]'); if (!c) return null; const b = c.closest('[data-bloque]'); return { checked: c.checked, disabled: c.disabled, enCar: !!c.closest('.fcar[data-car]'), enOff: !!c.closest('.off'), bloque: b ? b.dataset.bloque : null, titulo: b ? (b.querySelector('.fcart') || {}).textContent : '' }; });
  const sb1 = await sb();
  ok('la casilla de standby está en su bloque «Alta pendiente de confirmar», fuera de «Días que libra»', !!sb1 && sb1.checked && !sb1.enCar && sb1.bloque === 'standby' && /Alta pendiente de confirmar/.test(sb1.titulo || ''), JSON.stringify(sb1));
  await clic(pg, '#fichaOvl .fcar[data-car="libra"] .tgl .tglk');
  ok('apagar «Días que libra» en su ficha escribe p.inactivas', await llega(pg, () => (S.staff.find(p => p.id === 'dulce').inactivas || []).includes('libra'), null, 3000) >= 0);
  const sb2 = await sb();
  ok('y el standby no sale tachado ni desactivado: se sigue aplicando', !!sb2 && !sb2.enOff && !sb2.disabled && sb2.checked, JSON.stringify(sb2));
  ok('el modelo lo dice igual: Dulce sigue en standby', await pg.evaluate(() => { const iso = '2026-09-30'; return /standby/.test(puedeEstar(S, S.staff, estadoDeIso(iso), iso, 'PASARELA_M', 'dulce').motivo || ''); }));
  await cerrar(pg, 'fichaOvl');

  // ── S21 y S24: «nunca con» es una pareja ──
  console.log('── S21 y S24 · «nunca con», pareja a pareja');
  ok('la ficha de Mari Luz se abre', await abrirFicha(pg, 'mariluz') >= 0);
  const filaLav = await pg.evaluate(() => { const r = document.querySelector('#fichaOvl [data-par="lavinia"]'); return r ? { txt: r.textContent.replace(/\s+/g, ' ').trim(), flex: (r.querySelector('[data-parflex]') || {}).checked, tgl: (r.querySelector('[data-partgl]') || {}).checked } : null; });
  ok('«Nunca coincide con» enseña a Lavinia con «flexible» marcado y su interruptor encendido', !!filaLav && /Lavinia/.test(filaLav.txt) && filaLav.flex === true && filaLav.tgl === true, JSON.stringify(filaLav));
  ok('sin interruptor de la característica entera (es por pareja)', !(await pg.$('#fichaOvl .fcar[data-car="nuncaCon"] [data-car-tgl]')));
  await clic(pg, '#fichaOvl [data-par="lavinia"] [data-parflex]');
  ok('desmarcar «flexible» lo quita en las dos fichas', await llega(pg, () => !(S.staff.find(p => p.id === 'mariluz').nuncaConFlex || []).includes('lavinia') && !(S.staff.find(p => p.id === 'lavinia').nuncaConFlex || []).includes('mariluz'), null, 3000) >= 0, JSON.stringify([(await persona(pg, 'mariluz')).nuncaConFlex, (await persona(pg, 'lavinia')).nuncaConFlex]));
  await clic(pg, '#fichaOvl [data-par="lavinia"] [data-parflex]');
  ok('y marcarlo lo vuelve a poner en las dos', await llega(pg, () => (S.staff.find(p => p.id === 'mariluz').nuncaConFlex || []).includes('lavinia') && (S.staff.find(p => p.id === 'lavinia').nuncaConFlex || []).includes('mariluz'), null, 3000) >= 0);
  await clic(pg, '#fichaOvl [data-rmpar="lavinia"]');
  ok('quitar a Lavinia en la ficha de Mari Luz la quita también de la de Lavinia', await llega(pg, () => !S.staff.find(p => p.id === 'mariluz').nuncaCon.includes('lavinia') && !S.staff.find(p => p.id === 'lavinia').nuncaCon.includes('mariluz'), null, 3000) >= 0, JSON.stringify([(await persona(pg, 'mariluz')).nuncaCon, (await persona(pg, 'lavinia')).nuncaCon]));
  ok('el selector ya no pone a Lavinia en «no pueden · nunca con Mari Luz»', await pg.evaluate(() => { const iso = '2026-10-02', e = clonarEstado(estadoDeIso(iso)); e.asig[iso] = { PASARELA_T: [{ pid: 'mariluz', origen: 'manual' }] }; return puedeEstar(S, S.staff, e, iso, 'PASARELA_T', 'lavinia').ok; }));
  ok('el historial lo dice de las dos fichas', await pg.evaluate(() => (S.historial || []).some(h => /Mari Luz/.test(h.txt) && /ya puede coincidir con Lavinia/.test(h.txt) && /las dos fichas|también/.test(h.txt))), JSON.stringify(await pg.evaluate(() => (S.historial || []).slice(0, 2).map(h => h.txt))));
  await cerrar(pg, 'fichaOvl');
  await pg.keyboard.press('Control+z');
  ok('Ctrl+Z la devuelve a las dos fichas', await llega(pg, () => S.staff.find(p => p.id === 'mariluz').nuncaCon.includes('lavinia') && S.staff.find(p => p.id === 'lavinia').nuncaCon.includes('mariluz'), null, 3000) >= 0);
  // (S24) el selector ofrece a Lavinia «con aviso» en la tarde de Mari Luz y, al elegirla, entra con el aviso de la
  // pareja flexible (el viernes 2; sale antes de Zapatillera, donde la tiene la semana tipo)
  const sel = await pg.evaluate(() => {
    const iso = '2026-10-02', e = estadoDeIso(iso, true);
    retirarEntrada(e, S, S.staff, iso, 'ZAPA_T', 'lavinia');
    if (!pidsEn(e, iso, 'PASARELA_T').includes('mariluz')) asignar(e, S, S.staff, iso, 'PASARELA_T', 'mariluz', { forzar: true });
    const g = gruposSelector(S, S.staff, e, iso, 'PASARELA_T', { meses: S.meses });
    const c = g.conAviso.find(x => x.pid === 'lavinia');
    if (!c) return { enConAviso: false, grupos: Object.fromEntries(Object.entries(g).filter(([k]) => Array.isArray(g[k])).map(([k, v]) => [k, v.map(x => x.pid)])) };
    const r = ponerRecomendadoUI(iso, 'PASARELA_T', 'lavinia', c, true);
    return { enConAviso: true, ok: r.ok, avisos: r.avisos, motivo: r.motivo };
  });
  ok('el selector ofrece a Lavinia «con aviso» y, elegida, entra con Mari Luz y el aviso de la pareja flexible', sel.enConAviso && sel.ok && (sel.avisos || []).some(a => /nunca con Mari Luz \(pareja flexible/.test(a)), JSON.stringify(sel));
  await pg.keyboard.press('Control+z');
  // añadir desde la ficha de Leo: Lavinia, estricta
  ok('la ficha de Leo se abre', await abrirFicha(pg, 'leo') >= 0);
  ok('la ficha de Leo enseña su pareja con Susana Capón', !!(await pg.$('#fichaOvl [data-par="scapon"]')));
  await pg.selectOption('#fichaOvl #fNuncaSel', 'lavinia');
  await clic(pg, '#fichaOvl [data-addnunca]');
  ok('añadir a Lavinia desde la ficha de Leo la pone en las dos fichas', await llega(pg, () => S.staff.find(p => p.id === 'leo').nuncaCon.includes('lavinia') && S.staff.find(p => p.id === 'lavinia').nuncaCon.includes('leo'), null, 3000) >= 0);
  await cerrar(pg, 'fichaOvl');
  ok('la ficha de Susana Capón también enseña la pareja con Leo (la tenía solo la de Leo)', await abrirFicha(pg, 'scapon') >= 0 && !!(await pg.$('#fichaOvl [data-par="leo"]')));
  await cerrar(pg, 'fichaOvl');
  // apagar solo Leo–Susana Capón desde Equipo → Condiciones
  await abrirPanel(pg);
  const filaLeo = await pg.evaluate(() => { const r = [...document.querySelectorAll('#condOvl .condrow:not(.off)')].find(x => /Leo y Susana Capón no coinciden|Susana Capón y Leo no coinciden/.test(x.textContent)); return r ? { cid: r.dataset.cid, par: (r.querySelector('input[data-par]') || { dataset: {} }).dataset.par || null } : null; });
  ok('la fila de la pareja Leo–Susana Capón lleva el interruptor de la pareja', !!filaLeo && !!filaLeo.par, JSON.stringify(filaLeo));
  if (filaLeo) await clic(pg, `#condOvl .condrow[data-cid="${filaLeo.cid}"] .tglk`);
  ok('apagarla apaga solo esa pareja (en las dos fichas), sin tocar la característica entera', await llega(pg, () => (S.staff.find(p => p.id === 'leo').nuncaConOff || []).includes('scapon') && (S.staff.find(p => p.id === 'scapon').nuncaConOff || []).includes('leo') && S.staff.every(p => !(p.inactivas || []).includes('nuncaCon')), null, 3000) >= 0, JSON.stringify([(await persona(pg, 'leo')).nuncaConOff, (await persona(pg, 'leo')).inactivas]));
  ok('Leo–Lavinia y Lavinia–Mari Luz siguen activas', await pg.evaluate(() => { const ids = condicionesDe(S, S.staff).filter(c => c.k === 'nuncaCon').map(c => [c.pid, c.otro].sort().join('+')); return ids.includes('lavinia+leo') && ids.includes('lavinia+mariluz') && !ids.includes('leo+scapon'); }));
  const offLeo = await pg.evaluate(() => { const r = [...document.querySelectorAll('#condOvl .condrow.off')].find(x => /Leo y Susana Capón|Susana Capón y Leo/.test(x.textContent)); return r ? { cid: r.dataset.cid, txt: r.textContent.replace(/\s+/g, ' ').trim() } : null; });
  ok('la pareja pasa tachada a «apagadas», una vez, y dice que está apagada esa pareja', !!offLeo && /pareja/.test(offLeo.txt), JSON.stringify(offLeo));
  if (offLeo) await clic(pg, `#condOvl .condrow[data-cid="${offLeo.cid}"] .tglk`);
  ok('encenderla desde «apagadas» la devuelve', await llega(pg, () => !(S.staff.find(p => p.id === 'leo').nuncaConOff || []).includes('scapon') && condicionesDe(S, S.staff).some(c => c.k === 'nuncaCon' && [c.pid, c.otro].sort().join('+') === 'leo+scapon'), null, 3000) >= 0);

  // ── S22: «quien hace partido puede abrir la tarde» lleva a Ajustes del local ──
  console.log('── S22 · la condición del local');
  const bPa = await pg.$('#condOvl .condrow[data-cid="loc:PASARELA:partidoAbre:T"] [data-condlocal="PASARELA"]');
  ok('la condición «En Pasarela, quien hace partido puede abrir la tarde» lleva el botón «Ajustes del local»', !!bPa && !(await pg.$('#condOvl .condrow[data-cid="loc:PASARELA:partidoAbre:T"] [data-irregla]')));
  if (bPa) await bPa.click();
  ok('y abre los Ajustes de Pasarela', await llega(pg, () => !!document.querySelector('#localesOvl [data-loctab="PASARELA"].on'), null, 3000) >= 0);
  await cerrar(pg, 'localesOvl');

  // ── S16 (D5): «Mínimos» apagado dice lo que pasa ──
  console.log('── S16 · «Mínimos» apagado');
  await clic(pg, '#condOvl [data-regla-row="minimos"] .tglk');
  ok('apagar «Mínimos» escribe S.reglas.minimos === false', await llega(pg, () => S.reglas.minimos === false, null, 3000) >= 0);
  ok('la fila dice lo que pasa: nadie pide mínimos', /nadie/.test(await texto(pg, '#condOvl [data-regla-row="minimos"] .condinfo')), await texto(pg, '#condOvl [data-regla-row="minimos"]'));
  ok('y la Revisión deja de decir «falta»', await pg.evaluate(() => !revisionMes(S, S.staff, est).some(x => x.tipo === 'falta')));
  await clic(pg, '#condOvl [data-regla-row="minimos"] .tglk');
  await llega(pg, () => S.reglas.minimos === true, null, 3000);
  await cerrar(pg, 'condOvl');

  // ── S17 (D6): el contrato sin interruptor ──
  console.log('── S17 · el contrato');
  ok('la ficha de Yilian se abre', await abrirFicha(pg, 'yilian') >= 0);
  ok('el contrato no lleva interruptor y dice que lo compara el contador de horas', !(await pg.$('#fichaOvl [data-car-tgl="contrato"]')) && /contador de horas/.test(await texto(pg, '#fichaOvl [data-bloque="contrato"]')), await texto(pg, '#fichaOvl [data-bloque="contrato"]'));
  await cerrar(pg, 'fichaOvl');

  // ── S30: los vetos con su día ──
  console.log('── S30 · vetos con día');
  const vetoChip = (await chipsDe(pg, 'mariluz')).find(x => /^No hace/.test(x.txt));
  ok('la tarjeta de Mari Luz dice que no hace mañanas en Pasarela los lunes', !!vetoChip && /lunes/.test(vetoChip.txt), JSON.stringify(vetoChip));
  await abrirFicha(pg, 'mariluz');
  ok('la ficha también: «no hace mañanas los lunes»', /no hace mañanas los lunes/.test(await texto(pg, '#fichaOvl [data-sec="vetos"]')), await texto(pg, '#fichaOvl [data-sec="vetos"]'));
  const nVetos = async () => (await persona(pg, 'mariluz')).vetos.length;
  await pg.selectOption('#fichaOvl #fVetoL', 'PASARELA'); await pg.selectOption('#fichaOvl #fVetoF', 'M'); await pg.selectOption('#fichaOvl #fVetoD', '1');
  await clic(pg, '#fichaOvl [data-addveto]');
  ok('el mismo veto de los lunes otra vez no se añade («Ese veto ya está»)', await nVetos() === 1);
  await pg.selectOption('#fichaOvl #fVetoL', 'PASARELA'); await pg.selectOption('#fichaOvl #fVetoF', 'T'); await pg.selectOption('#fichaOvl #fVetoD', '2');
  await clic(pg, '#fichaOvl [data-addveto]');
  ok('uno de las tardes de los martes sí, con su día', await llega(pg, () => S.staff.find(p => p.id === 'mariluz').vetos.some(v => v.localId === 'PASARELA' && v.franja === 'T' && (v.dow === 2 || (Array.isArray(v.dow) && v.dow.includes(2)))), null, 3000) >= 0, JSON.stringify((await persona(pg, 'mariluz')).vetos));
  await pg.selectOption('#fichaOvl #fVetoL', 'PASARELA'); await pg.selectOption('#fichaOvl #fVetoF', 'M'); await pg.selectOption('#fichaOvl #fVetoD', '');
  await clic(pg, '#fichaOvl [data-addveto]');
  ok('y el de todos los días de las mañanas también (antes: «Ese veto ya está»)', await llega(pg, () => S.staff.find(p => p.id === 'mariluz').vetos.some(v => v.localId === 'PASARELA' && v.franja === 'M' && (v.dow === undefined || v.dow === null)), null, 3000) >= 0);
  await cerrar(pg, 'fichaOvl');
  ok('la tarjeta lo enseña: «tardes · los martes»', (await chipsDe(pg, 'mariluz')).some(x => /^No hace/.test(x.txt) && /tardes/.test(x.txt) && /martes/.test(x.txt)));
  ok('el modelo lo aplica solo el martes: Mari Luz no puede la tarde del martes 29 y sí la del jueves 1', await pg.evaluate(() => { const e = { asig: {}, apertura: {}, manual: {}, days: [] }; const a = puedeEstar(S, S.staff, e, '2026-09-29', 'PASARELA_T', 'mariluz'); const b = puedeEstar(S, S.staff, e, '2026-10-01', 'PASARELA_T', 'mariluz'); return a.regla === 'vetos' && b.regla !== 'vetos'; }));

  // ── S31: el local habitual ──
  console.log('── S31 · el local habitual de Roberto');
  await abrirFicha(pg, 'roberto');
  ok('la ficha dice su local habitual: Zapatillera', await pg.$eval('#fichaOvl [data-habitual]', x => x.value).catch(() => null) === 'ZAPA');
  await clic(pg, '#fichaOvl [data-tloc="ZAPA"]');
  await clic(pg, '#fichaOvl [data-tloc="ZAPA"]');
  ok('quitar y volver a poner Zapatillera no cambia el habitual', await llega(pg, () => localHabitualDe(S.staff.find(p => p.id === 'roberto')) === 'ZAPA' && S.staff.find(p => p.id === 'roberto').locales.includes('ZAPA'), null, 3000) >= 0 && await pg.$eval('#fichaOvl [data-habitual]', x => x.value).catch(() => null) === 'ZAPA', JSON.stringify(await persona(pg, 'roberto')));
  await pg.selectOption('#fichaOvl [data-habitual]', 'PASARELA');
  ok('elegir Pasarela lo cambia (y el Generador lo lee)', await llega(pg, () => localHabitualDe(S.staff.find(p => p.id === 'roberto')) === 'PASARELA', null, 3000) >= 0 && await pg.evaluate(() => { const c = candidatosPara(S, S.staff, { asig: {}, apertura: {}, manual: {}, days: [] }, '2026-10-01', 'PASARELA_T').find(x => x.pid === 'roberto'); return !!c && c.razones.includes('su local habitual es Pasarela'); }));
  await cerrar(pg, 'fichaOvl');

  // ── S29 (D7): «sin local fijo» = sin locales ──
  console.log('── S29 · sin local fijo');
  const sub = pid => texto(pg, `#equipoRoot [data-pcard="${pid}"] .pchead small`);
  ok('la tarjeta de Tere dice sus locales, no «sin local fijo»', !/sin local fijo/.test(await sub('tere')), await sub('tere'));
  ok('la de Leo, «sin local fijo»', /sin local fijo/.test(await sub('leo')), await sub('leo'));
  // (el número se anima al pintarse: se espera a que acabe)
  ok('el contador «sin local fijo» cuenta a quien no tiene locales', await llega(pg, () => { const b = [...document.querySelectorAll('#eqStats .dstat')].find(x => /sin local fijo/.test(x.textContent)); return !!b && +b.querySelector('b').textContent === S.staff.filter(p => !deBaja(p, isoHoy()) && !(p.locales || []).length).length; }, null, 4000) >= 0);
  ok('Horas dice lo mismo: Tere «Apoyo», Leo «Apoyo · sin local fijo»', await pg.evaluate(() => puestoLbl(S.staff.find(p => p.id === 'tere')) === 'Apoyo' && puestoLbl(S.staff.find(p => p.id === 'leo')) === 'Apoyo · sin local fijo'));
  ok('y nadie guarda ya la marca p.comodin', await pg.evaluate(() => S.staff.every(p => !('comodin' in p))));

  // ── móvil: las parejas caben ──
  console.log('── móvil 390×844');
  const pm = await pagina('móvil', { viewport: { width: 390, height: 844 }, movil: true });
  await pm.evaluate(() => { document.querySelector('.tab[data-v="equipo"]').click(); });
  await llega(pm, () => !!document.querySelector('#equipoRoot .cards'), null, 5000);
  await pm.evaluate(() => openFicha('mariluz'));
  await llega(pm, () => !!document.querySelector('#fichaOvl [data-par="lavinia"]'), null, 4000);
  ok('móvil: la fila de la pareja cabe sin desbordar y sus controles se tocan (≥ 40 px)', await pm.evaluate(() => { const c = document.querySelector('#fichaOvl .ovcard'); const r = document.querySelector('#fichaOvl [data-par="lavinia"]'); const t = r.querySelector('.tgl'); return c.scrollWidth <= c.clientWidth + 1 && r.getBoundingClientRect().right <= c.getBoundingClientRect().right + 1 && t.getBoundingClientRect().height >= 40; }));

  ok('sin errores de página en toda la batería', errores.length === 0, errores.slice(0, 4).join(' | '));
} catch (err) {
  ok('la batería reventó', false, err.message + '\n' + (err.stack || '').split('\n').slice(1, 3).join('\n'));
} finally {
  await br.close().catch(() => {});
  srv.close();
}
console.log(`\ntiempo: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
resumen();
