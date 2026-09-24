// EL DÍA LIBRE PUNTUAL DE PUNTA A PUNTA (reunión del 24/09, decisión D9).
// Diego, 24/09: «Esta semana libra martes en vez de miércoles. Pero aunque lo hayamos puesto en
// equipo, luego al generar no lo respeta… me salen los 2 días… luego no lo quita». Se recorre
// con clics reales lo que hizo el cliente: Generador en la semana siguiente → Equipo → ficha de
// Mari Luz → martes → Generar; la semana ya volcada (?demo=1) y Ctrl+Z; el cambio guardado para
// otra semana; la Cobertura, el Mes y Hoy leyendo el día libre de ESA semana; el acceso del
// Generador; y la baja mirada con el día que se mira, no con el reloj. Desde la revisión de la
// fase (24/09), también: la semana volcada en modo Periodo, Ctrl+Z con la ficha abierta, «Guardar
// como semana tipo», la semana en curso con un día ya pasado, el móvil y los textos.
// El reloj de la página se fija en el jueves 24/09/2026 (el día de la reunión): la semana
// siguiente es la del lunes 28/09, que cruza a octubre, y el demo trae septiembre y octubre.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cargarChromium, contador, llega, prepararPagina } from './e2e-util.mjs';

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
const L28 = '2026-09-28', M29 = '2026-09-29', X30 = '2026-09-30';

async function pagina(etiqueta, dialogos, viewport) {
  const ctx = await br.newContext({ viewport: viewport || { width: 1280, height: 900 } });
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
// sin pararse en el primer elemento que falte: así se ve todo lo que falla de una vez
const ev = (pg, sel, fn, arg) => pg.$eval(sel, fn, arg).catch(() => null);
const hazlo = (pg, fn, arg) => pg.evaluate(fn, arg).catch(e => { errores.push('evaluate: ' + e.message.split('\n')[0]); });
const clic = (pg, sel) => pg.click(sel, { timeout: 3000 }).then(() => true, () => false);
const vista = async (pg, v) => { await pg.click(`.tab[data-v="${v}"]`); return llega(pg, v => { const s = document.getElementById('view-' + v); return !!s && !s.classList.contains('hidden'); }, v, 4000); };
// turnos de Mari Luz (u otra) un día: en la planilla real o en la vista previa del Generador
const turnos = (pg, iso, pid = 'mariluz', previa = false) => pg.evaluate(([iso, pid, previa]) => { const e = previa ? GEN.previa.estado : estadoDeIso(iso); return turnosDe(S).filter(t => pidsEn(e, iso, t.id).includes(pid)).map(t => t.id); }, [iso, pid, previa]);
const porMariLuz = (pg, iso, previa = false) => pg.evaluate(([iso, previa]) => { const e = previa ? GEN.previa.estado : estadoDeIso(iso); return turnosDe(S).some(t => asignados(e, iso, t.id).some(x => x.por === 'mariluz')); }, [iso, previa]);
const lp = pg => pg.evaluate(() => JSON.stringify(personaDeId('mariluz').libraPuntual || null));
async function abrirFicha(pg, pid) {
  await vista(pg, 'equipo');
  await pg.waitForSelector(`#equipoRoot [data-pcard="${pid}"] .pmini`, { timeout: 8000 }).catch(() => null);
  await clic(pg, `#equipoRoot [data-pcard="${pid}"] .pmini`);
  await pg.waitForSelector('#fichaOvl .lpunt', { timeout: 5000 });
}
const cerrarFicha = async pg => { await clic(pg, '#fichaOvl [data-ovx]'); await llega(pg, () => !document.getElementById('fichaOvl'), null, 3000); };
async function generadorSemana(pg, lunes) {
  await vista(pg, 'generador');
  if (await pg.evaluate(() => GEN.modo !== 'semana')) await clic(pg, '[data-modo="semana"]');
  for (let i = 0; i < 10 && await pg.evaluate(l => GEN.lunes < l, lunes); i++) await clic(pg, '#gsNext');
  for (let i = 0; i < 10 && await pg.evaluate(l => GEN.lunes > l, lunes); i++) await clic(pg, '#gsPrev');
}
async function generar(pg) { await clic(pg, '#genPrevia'); return llega(pg, () => !!(GEN.previa && GEN.previa.semana), null, 15000); }

try {
  // ══ 1) lo que hizo el cliente: Generador › (28/09) → Equipo → ficha de Mari Luz → martes → generar ══
  console.log('── 1) Generador en la semana del 28/09 → ficha de Mari Luz → «esta semana libra el martes»');
  {
    const dialogos = [];
    const pg = await pagina('uno', dialogos);
    await generadorSemana(pg, L28);
    ok('el Generador está en la semana del 28/09', await pg.evaluate(() => GEN.lunes) === L28, await pg.evaluate(() => GEN.lunes));
    await abrirFicha(pg, 'mariluz');
    ok('la ficha enseña la semana a la que se refiere: la del Generador (28/09), no la de la vista Semana', await ev(pg, '#fichaOvl .lpsemlbl', x => x.dataset.lunes) === L28, await ev(pg, '#fichaOvl .lpunt', x => x.textContent.replace(/\s+/g, ' ').slice(0, 200)));
    ok('antes del cambio el martes 29 trabaja (la semana ya está volcada por el demo)', (await turnos(pg, M29)).length === 2, JSON.stringify(await turnos(pg, M29)));
    await clic(pg, '#fichaOvl [data-tlpunt="2"]');
    await llega(pg, () => (personaDeId('mariluz').libraPuntual || []).length > 0, null, 3000);
    ok('se guarda para la semana del 28/09 (lista por semanas)', await pg.evaluate(() => { const x = personaDeId('mariluz').libraPuntual; return Array.isArray(x) && x.some(e => e.semana === '2026-09-28' && e.dias.join() === '2'); }), await lp(pg));
    ok('al estar volcada, pide confirmación contando lo que va a pasar', dialogos.some(m => /martes/.test(m) && /miércoles/.test(m) && /Lavinia/.test(m)), JSON.stringify(dialogos));
    ok('la saca de la planilla del martes 29', (await turnos(pg, M29)).length === 0, JSON.stringify(await turnos(pg, M29)));
    ok('y la pone el miércoles 30 en Pasarela mañana y tarde', (await turnos(pg, X30)).join() === 'PASARELA_M,PASARELA_T', JSON.stringify(await turnos(pg, X30)));
    ok('Lavinia deja de cubrirla el miércoles 30', !(await porMariLuz(pg, X30)));
    ok('el pie de la ficha dice el cambio de esa semana', /libra martes/.test(await ev(pg, '#fichaOvl .lpuntpie', x => x.textContent)), await ev(pg, '#fichaOvl .lpuntpie', x => x.textContent));
    await cerrarFicha(pg);
    const chips = await pg.$$eval('#equipoRoot [data-pcard="mariluz"] .tchip', xs => xs.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
    ok('la tarjeta de Equipo enseña «Semana del 28/09: libra martes (en vez de miércoles)»', chips.some(t => /Semana del 28\/09: libra martes \(en vez de miércoles\)/.test(t)), JSON.stringify(chips));
    await generadorSemana(pg, L28);
    ok('el Generador lista los cambios de día libre de su semana', /Mari Luz/.test(await ev(pg, '#genRoot .gslibras', x => x.textContent).catch(() => '')));
    ok('«Generar la semana» termina', await generar(pg) >= 0);
    ok('en la planilla generada el martes 29 libra', (await turnos(pg, M29, 'mariluz', true)).length === 0, JSON.stringify(await turnos(pg, M29, 'mariluz', true)));
    ok('y el miércoles 30 trabaja mañana y tarde', (await turnos(pg, X30, 'mariluz', true)).join() === 'PASARELA_M,PASARELA_T');
    ok('«Quién libra»: el martes 29 sí, el miércoles 30 no', await pg.evaluate(() => GEN.previa.libran['2026-09-29'].includes('mariluz') && !GEN.previa.libran['2026-09-30'].includes('mariluz')));
    ok('la condición del Generador habla del martes de esta semana y se cumple', await pg.evaluate(() => { const c = GEN.previa.condiciones.find(c => c.id === 'p:mariluz:libra'); return !!c && c.ok && /martes esta semana/.test(c.texto); }));
    await pg.keyboard.press('Control+z');
    await llega(pg, () => !(personaDeId('mariluz').libraPuntual || []).length, null, 3000);
    ok('Ctrl+Z lo deshace de una vez: sin cambio guardado', await pg.evaluate(() => !(personaDeId('mariluz').libraPuntual || []).length), await lp(pg));
    ok('Ctrl+Z: vuelve el martes 29', (await turnos(pg, M29)).length === 2, JSON.stringify(await turnos(pg, M29)));
    ok('Ctrl+Z: el miércoles 30 vuelve a librar y Lavinia vuelve a cubrirla', (await turnos(pg, X30)).length === 0 && await porMariLuz(pg, X30));
    await pg.context().close();
  }

  // ══ 2) dos semanas seguidas con cambio: la segunda no borra la primera ══
  console.log('── 2) varias semanas: la vista Semana en el 28/09 y luego en el 05/10');
  {
    const pg = await pagina('dos');
    await vista(pg, 'semana'); await clic(pg, '#wNext');
    await abrirFicha(pg, 'mariluz');
    ok('sin Generador abierto, la ficha va a la semana de la vista Semana (28/09)', await ev(pg, '#fichaOvl .lpsemlbl', x => x.dataset.lunes) === L28);
    await clic(pg, '#fichaOvl [data-tlpunt="2"]'); await cerrarFicha(pg);
    await vista(pg, 'semana'); await clic(pg, '#wNext');   // la vista Semana vuelve al 28/09, donde se quedó
    await abrirFicha(pg, 'mariluz');
    ok('la ficha pasa a la semana del 05/10', await ev(pg, '#fichaOvl .lpsemlbl', x => x.dataset.lunes) === '2026-10-05');
    ok('y enseña el cambio guardado para la del 28/09 en vez de «Sin cambios»', /28\/09/.test(await ev(pg, '#fichaOvl .lpotras', x => x.textContent).catch(() => '')), await ev(pg, '#fichaOvl .lpunt', x => x.textContent.replace(/\s+/g, ' ')));
    await clic(pg, '#fichaOvl [data-tlpunt="5"]'); await cerrarFicha(pg);
    ok('dos semanas con cambio: libra el martes 29/09 y el viernes 09/10', await pg.evaluate(() => libraEn(personaDeId('mariluz'), '2026-09-29') && libraEn(personaDeId('mariluz'), '2026-10-09') && !libraEn(personaDeId('mariluz'), '2026-10-07')), await lp(pg));
    await pg.context().close();
  }

  // ══ 3) el cambio guardado para otra semana se enseña y las flechas cambian la semana ══
  console.log('── 3) la ficha enseña los cambios de otras semanas y deja cambiar la semana');
  {
    const pg = await pagina('tres');
    await hazlo(pg, () => { ponerLibraPuntual(personaDeId('mariluz'), '2026-10-05', [5]); saveState(); });
    await abrirFicha(pg, 'mariluz');
    const txt = await ev(pg, '#fichaOvl .lpunt', x => x.textContent.replace(/\s+/g, ' '));
    ok('por defecto, la semana de la planilla (21/09)', await ev(pg, '#fichaOvl .lpsemlbl', x => x.dataset.lunes) === '2026-09-21', txt);
    ok('y lista el cambio de la semana del 05/10 (viernes)', /05\/10/.test(txt) && /viernes/.test(txt), txt);
    await clic(pg, '#fichaOvl [data-lpsem="1"]'); await clic(pg, '#fichaOvl [data-lpsem="1"]');
    ok('las flechas llevan a la semana del 05/10, con el viernes marcado', await ev(pg, '#fichaOvl .lpsemlbl', x => x.dataset.lunes) === '2026-10-05' && await ev(pg, '#fichaOvl [data-tlpunt="5"]', x => x.classList.contains('on')));
    await pg.context().close();
  }

  // ══ 4) cambio guardado sin tocar la planilla (otro dispositivo): Generar lo retira y lo lista ══
  console.log('── 4) semana volcada + cambio ya guardado → «Generar la semana» retira lo automático');
  {
    const pg = await pagina('cuatro');
    await hazlo(pg, () => { ponerLibraPuntual(personaDeId('mariluz'), '2026-09-28', [2]); saveState(); });
    ok('la planilla aún la tiene el martes 29', (await turnos(pg, M29)).length === 2);
    await generadorSemana(pg, L28);
    ok('«Generar la semana» termina', await generar(pg) >= 0);
    ok('la vista previa la quita del martes y la pone el miércoles', (await turnos(pg, M29, 'mariluz', true)).length === 0 && (await turnos(pg, X30, 'mariluz', true)).join() === 'PASARELA_M,PASARELA_T', JSON.stringify([await turnos(pg, M29, 'mariluz', true), await turnos(pg, X30, 'mariluz', true)]));
    ok('y lista lo retirado (Mari Luz del martes, Lavinia del miércoles)', await pg.evaluate(() => (GEN.previa.retirados || []).filter(x => x.pid === 'mariluz' || x.pid === 'lavinia').length >= 4), await pg.evaluate(() => JSON.stringify(GEN.previa.retirados || null)));
    const qc = String(await ev(pg, '#genRoot .gretlist', x => x.textContent) || '');
    ok('«Qué ha cambiado» enseña los retirados y el motivo', /Mari Luz/.test(qc) && /Lavinia/.test(qc) && /libra/.test(qc), qc.slice(0, 300));
    ok('el texto del Generador ya no promete que nunca quita a nadie', !/Nunca quita a nadie/.test(await ev(pg, '#genRoot', x => x.textContent)));
    ok('el botón de volcar está activo', await ev(pg, '#genAplicar', b => !b.disabled));
    await clic(pg, '#genAplicar');
    await llega(pg, () => !GEN.previa, null, 5000);
    ok('al volcar, la planilla real queda igual que la previa', (await turnos(pg, M29)).length === 0 && (await turnos(pg, X30)).join() === 'PASARELA_M,PASARELA_T' && !(await porMariLuz(pg, X30)));
    await pg.keyboard.press('Control+z');
    await llega(pg, () => turnosDe(S).some(t => pidsEn(estadoDeIso('2026-09-29'), '2026-09-29', t.id).includes('mariluz')), null, 3000);
    ok('Ctrl+Z devuelve la semana como estaba', (await turnos(pg, M29)).length === 2 && await porMariLuz(pg, X30));
    await pg.context().close();
  }

  // ══ 5) el acceso del Generador: «Cambiar el día libre de alguien esta semana» ══
  console.log('── 5) Generador → «Cambiar el día libre de alguien esta semana»');
  {
    const dialogos = [];
    const pg = await pagina('cinco', dialogos);
    await generadorSemana(pg, L28);
    await clic(pg, '#gsLibra');
    ok('se abre el panel del día libre de esta semana', await llega(pg, () => !!document.querySelector('#libraSemOvl'), null, 3000) >= 0);
    ok('habla de la semana del Generador (28/09)', /28\/09/.test(await ev(pg, '#libraSemOvl', x => x.textContent)).valueOf());
    await pg.selectOption('#libraSemOvl #lsPid', 'mariluz', { timeout: 3000 }).catch(() => null);
    await clic(pg, '#libraSemOvl [data-lsdia="2"]');
    await llega(pg, () => (personaDeId('mariluz').libraPuntual || []).length > 0, null, 3000);
    ok('escribe en la semana del Generador', await pg.evaluate(() => libraEn(personaDeId('mariluz'), '2026-09-29') && !libraEn(personaDeId('mariluz'), '2026-09-30')), await lp(pg));
    ok('y aplica el cambio a la semana volcada', (await turnos(pg, M29)).length === 0 && (await turnos(pg, X30)).length === 2);
    ok('el panel lista los cambios de esa semana', /Mari Luz/.test(await ev(pg, '#libraSemOvl .lslista', x => x.textContent).catch(() => '')));
    await pg.context().close();
  }

  // ══ 6) Cobertura, Mes, Hoy y perfil leen el día libre de ESA semana ══
  console.log('── 6) las vistas usan el día libre de la semana (estadoDia)');
  {
    const pg = await pagina('seis');
    await hazlo(pg, () => { ponerLibraPuntual(personaDeId('mariluz'), '2026-09-28', [2]); const e = estadoDeIso('2026-09-29', true); for (const t of turnosDe(S)) desasignar(e, '2026-09-29', t.id, 'mariluz'); saveState(); irACobertura({ pid: 'mariluz', dias: [], desde: '2026-09-28' }); });
    await pg.waitForSelector('#cobRoot .cobdia[data-dia="2026-09-30"]', { timeout: 8000 }).catch(() => null);
    const tira = await pg.evaluate(() => ['2026-09-29', '2026-09-30'].map(iso => { const x = document.querySelector(`#cobRoot .cobdia[data-dia="${iso}"] .cobdots`); return x ? x.textContent.trim() : null; }));
    ok('Cobertura: el martes 29 «libra» y el miércoles 30 no', tira[0] === 'libra' && tira[1] !== 'libra', JSON.stringify(tira));
    const cab = String(await ev(pg, '#cobRoot .cobwho small', x => x.textContent));
    ok('Cobertura: la cabecera dice «(semana del 28/09: libra martes)»', /semana del 28\/09: libra martes/.test(cab), cab);
    // noviembre, sin planilla: Mes y Hoy
    await hazlo(pg, () => { ponerLibraPuntual(personaDeId('mariluz'), '2026-11-02', [2]); saveState(); S.y = 2026; S.m = 11; S.day = 3; cargarMes(); switchTab('mes'); });
    await pg.waitForSelector('#view-mes td[data-asig="mariluz|2026-11-03"]', { timeout: 8000 }).catch(() => null);
    const mes = await pg.evaluate(() => ['2026-11-03', '2026-11-04', '2026-11-11'].map(iso => { const x = document.querySelector(`#view-mes td[data-asig="mariluz|${iso}"]`); return x ? x.textContent.trim() : null; }));
    ok('Mes: «libra» el martes 03/11 y no el miércoles 04/11; el 11/11 vuelve a su miércoles', mes[0] === 'libra' && mes[1] === '' && mes[2] === 'libra', JSON.stringify(mes));
    await pg.evaluate(() => irAIso('2026-11-03'));
    await pg.waitForSelector('#diaSide .srow', { timeout: 8000 }).catch(() => null);
    const hoy = await pg.evaluate(() => { const r = [...document.querySelectorAll('#diaSide .srow')].find(x => /Mari Luz/.test(x.textContent)); return r ? r.querySelector('small').textContent : null; });
    ok('Hoy (martes 03/11): «libra el martes esta semana (en vez de los miércoles)»', hoy === 'libra el martes esta semana (en vez de los miércoles)', hoy);
    await pg.evaluate(() => irAIso('2026-11-04'));
    const hoy2 = await pg.evaluate(() => { const r = [...document.querySelectorAll('#diaSide .srow')].find(x => /Mari Luz/.test(x.textContent)); return r ? r.querySelector('small').textContent : null; });
    ok('Hoy (miércoles 04/11): no dice que libre los miércoles', hoy2 !== null && !/libra los miércoles/.test(hoy2), hoy2);
    await pg.context().close();
  }

  // ══ 7) la baja se mira con el día que se mira, no con el reloj (S6) ══
  console.log('── 7) Mari Luz de baja del 21 al 27/09 (hoy, 24/09, está de baja; el lunes 28 vuelve)');
  {
    const pg = await pagina('siete');
    await pg.evaluate(() => { personaDeId('mariluz').ausencias = [{ tipo: 'BAJ', desde: '2026-09-21', hasta: '2026-09-27' }]; saveState(); openCobertura({ pid: 'mariluz', dias: ['2026-10-06'] }); });
    await pg.waitForSelector('#cobOvl .cobwho b', { timeout: 8000 }).catch(() => null);
    ok('Cobertura no cambia de persona por su cuenta: sigue siendo Mari Luz', await pg.evaluate(() => COB.pid) === 'mariluz' && await ev(pg, '#cobOvl .cobwho b', x => x.textContent) === 'Mari Luz', await pg.evaluate(() => COB.pid));
    await pg.evaluate(() => { const o = document.getElementById('cobOvl'); if (o) o.remove(); irAIso('2026-09-30'); switchTab('semana'); });
    await pg.waitForSelector('#semRoot tr.piedesc', { timeout: 8000 }).catch(() => null);
    const pie = await pg.evaluate(() => { const f = document.querySelector('#semRoot tr.piedesc'); return f ? [...f.querySelectorAll('td')].slice(1).map(td => td.textContent) : []; });
    ok('Semana del 28/09, «Descansos» del miércoles 30: sale Mari Luz (ya ha vuelto y libra)', /Mari L/.test(pie[2]), JSON.stringify(pie[2]));   // nombre corto: «Mari L.»
    ok('«Descansos» no cuenta a Dulce, que está en standby', !pie.some(t => /Dulce/.test(t)), JSON.stringify(pie));
    await generadorSemana(pg, '2026-09-21');
    await generar(pg);
    ok('Generador (semana del 21/09): Mari Luz sale como de baja toda la semana', await pg.evaluate(() => GEN.previa.resumen.deBaja.includes('mariluz')));
    await generadorSemana(pg, L28);
    await generar(pg);
    ok('Generador (semana del 28/09): ya no está de baja y sus condiciones se comprueban', await pg.evaluate(() => !GEN.previa.resumen.deBaja.includes('mariluz') && GEN.previa.condiciones.some(c => c.id === 'p:mariluz:libra')));
    await pg.context().close();
  }

  // ══ 8) la planilla generada pinta los avisos de cada casilla; la migración del objeto ══
  console.log('── 8) avisos en la planilla generada y migración del día libre puntual de antes');
  {
    const pg = await pagina('ocho');
    await pg.evaluate(() => asignarUI('2026-09-30', 'MONACO_T', 'mariluz', { forzar: true }));
    await generadorSemana(pg, L28);
    await generar(pg);
    const av = await pg.evaluate(() => { const td = [...document.querySelectorAll('#genRoot .gslot.gaviso')].map(x => x.getAttribute('title') || x.textContent); return td; });
    ok('la casilla con una persona forzada lleva su aviso (⚠ y el motivo)', av.some(t => /libra|solo/.test(t)), JSON.stringify(av));
    const mig = await pg.evaluate(() => { const x = JSON.parse(JSON.stringify(S)); x.staff.find(p => p.id === 'mariluz').libraPuntual = { semana: '2026-09-28', dias: [2] }; x.staff.find(p => p.id === 'tere').libraPuntual = { semana: '2026-09-14', dias: [1] }; migrarEstado(x); return [x.staff.find(p => p.id === 'mariluz').libraPuntual, x.staff.find(p => p.id === 'tere').libraPuntual]; });
    ok('migrarEstado pasa el objeto de antes a una lista y borra las semanas pasadas', JSON.stringify(mig[0]) === '[{"semana":"2026-09-28","dias":[2]}]' && mig[1] === null, JSON.stringify(mig));
    await pg.context().close();
  }
  // ══ revisión de la fase (24/09): lo que encontraron los dos revisores ══
  // 9) «Mes → Generar noviembre» vuelca en modo Periodo; hasta ahora sin el «por», y luego el
  // cambio de día libre dejaba a Mari Luz sin trabajar ni el martes ni el miércoles
  console.log('── 9) Generar noviembre (modo Periodo) → Volcar → ficha → «la semana del 02/11 libra el martes»');
  {
    const dialogos = [];
    const pg = await pagina('nueve', dialogos);
    await pg.evaluate(() => irAGenerador({ desde: '2026-11-01', hasta: '2026-11-30', titulo: 'Generar noviembre' }));
    await clic(pg, '#genPrevia');
    await llega(pg, () => !!(GEN.previa && GEN.previa.aplicados && GEN.previa.aplicados.length), null, 20000);
    await clic(pg, '#genAplicar');
    await llega(pg, () => !GEN.previa, null, 10000);
    const lav = await pg.evaluate(() => { const x = asignados(estadoDeIso('2026-11-04'), '2026-11-04', 'PASARELA_M').find(e => e.pid === 'lavinia'); return x ? { por: x.por || null, razon: x.razon } : null; });
    ok('el volcado del modo Periodo guarda el «por» de la cobertura (Lavinia por Mari Luz el miércoles 04/11)', !!lav && lav.por === 'mariluz', JSON.stringify(lav));
    await abrirFicha(pg, 'mariluz');
    for (let i = 0; i < 12 && (await ev(pg, '#fichaOvl .lpsemlbl', x => x.dataset.lunes) || '') < '2026-11-02'; i++) await clic(pg, '#fichaOvl [data-lpsem="1"]');
    await clic(pg, '#fichaOvl [data-tlpunt="2"]');
    await llega(pg, () => libraEn(personaDeId('mariluz'), '2026-11-03'), null, 3000);
    ok('la confirmación cuenta que Lavinia deja de cubrirla y que ella entra el miércoles', dialogos.some(m => /Lavinia deja de cubrir/.test(m) && /entra el miércoles 4/.test(m)), JSON.stringify(dialogos));
    ok('martes 03/11: libra', (await turnos(pg, '2026-11-03')).length === 0, JSON.stringify(await turnos(pg, '2026-11-03')));
    ok('miércoles 04/11: trabaja mañana y tarde en Pasarela y Lavinia ya no está', (await turnos(pg, '2026-11-04')).join() === 'PASARELA_M,PASARELA_T' && !(await turnos(pg, '2026-11-04', 'lavinia')).length, JSON.stringify([await turnos(pg, '2026-11-04'), await turnos(pg, '2026-11-04', 'lavinia')]));
    await pg.context().close();
  }

  // 10) modo Periodo con retiradas; y la propuesta con aviso que acepta el encargado
  console.log('── 10) modo Periodo con retiradas: mañana o tarde sin repetir, el aviso final las cuenta; «con aviso» aceptada = puesta a mano');
  {
    const pg = await pagina('diez');
    await hazlo(pg, () => { ponerLibraPuntual(personaDeId('mariluz'), '2026-09-28', [2]); saveState(); irAGenerador({ desde: '2026-09-28', hasta: '2026-10-04', titulo: 'Periodo' }); GEN.modo = 'periodo'; renderGenerador(); });
    await clic(pg, '#genPrevia');
    await llega(pg, () => !!(GEN.previa && GEN.previa.retirados && GEN.previa.retirados.length), null, 20000);
    const ban = String(await ev(pg, '#genRoot .warnbanner.gretlist', x => x.textContent) || '');
    const partes = ban.split(' · ');
    ok('la lista de retirados dice mañana y tarde y no repite a nadie', /Mari Luz en Pasarela mañana y tarde el 29\/9/.test(ban) && new Set(partes).size === partes.length, ban);
    await clic(pg, '#genAplicar');
    await llega(pg, () => !GEN.previa, null, 10000);
    const toasts = await pg.$$eval('#toasts .toast span', xs => xs.map(x => x.textContent));
    ok('el aviso final cuenta las retiradas', toasts.some(t => /4 retiradas/.test(t)), JSON.stringify(toasts));
    // una propuesta «Con aviso» del hueco: la acepta el encargado con un clic → es suya (manual)
    const cand = await pg.evaluate(() => { const iso = '2026-11-03', tid = 'PASARELA_T'; const c = candidatosPara(S, S.staff, estadoDeIso(iso), iso, tid, { permitirPartido: true })[0]; return c ? `${iso}|${tid}|${c.pid}` : null; });
    await hazlo(pg, c => { document.getElementById('genRes').insertAdjacentHTML('beforeend', `<button type="button" id="pruebaAviso" data-aplicaruno="${c}">x</button>`); }, cand);
    await clic(pg, '#pruebaAviso');
    const [iso, tid, pid] = String(cand).split('|');
    const org = await pg.evaluate(([iso, tid, pid]) => { const x = asignados(estadoDeIso(iso), iso, tid).find(e => e.pid === pid); return x ? x.origen : null; }, [iso, tid, pid]);
    ok('la propuesta con aviso aceptada se guarda como puesta a mano (no la retira nadie en automático)', org === 'manual', `${cand} → ${org}`);
    await pg.context().close();
  }

  // 11) Ctrl+Z con la ficha abierta (reunión: «Vamos a darle para atrás, CTRL+Z»)
  console.log('── 11) Ctrl+Z con la ficha abierta: la ficha se pone al día y lo que se toca después no se pierde');
  {
    const dialogos = [];
    const pg = await pagina('once', dialogos);
    await generadorSemana(pg, L28);
    await abrirFicha(pg, 'mariluz');
    await clic(pg, '#fichaOvl [data-tlpunt="2"]');
    await llega(pg, () => libraEn(personaDeId('mariluz'), '2026-09-29'), null, 3000);
    await pg.keyboard.press('Control+z');
    await llega(pg, () => !libraEn(personaDeId('mariluz'), '2026-09-29'), null, 3000);
    const pie = String(await ev(pg, '#fichaOvl .lpuntpie', x => x.textContent) || '');
    ok('la ficha, abierta, dice «Sin cambios» tras Ctrl+Z', /Sin cambios/.test(pie), pie);
    ok('y el martes ya no está marcado', await ev(pg, '#fichaOvl [data-tlpunt="2"]', x => !x.classList.contains('on')) === true);
    ok('y sigue en la semana del 28/09', await ev(pg, '#fichaOvl .lpsemlbl', x => x.dataset.lunes) === L28);
    const n0 = dialogos.length;
    await clic(pg, '#fichaOvl [data-tlpunt="2"]');
    await llega(pg, () => libraEn(personaDeId('mariluz'), '2026-09-29'), null, 3000);
    ok('volver a pulsar el martes lo aplica otra vez, con su confirmación', dialogos.length === n0 + 1 && (await turnos(pg, M29)).length === 0, JSON.stringify([dialogos.length - n0, await turnos(pg, M29), await lp(pg)]));
    await pg.keyboard.press('Control+z');
    await llega(pg, () => !libraEn(personaDeId('mariluz'), '2026-09-29'), null, 3000);
    await clic(pg, '#fichaOvl [data-tfranja="M"]');
    ok('lo que se toca después de Ctrl+Z se guarda en la ficha de verdad', await pg.evaluate(() => personaDeId('mariluz').franjas.join()) === 'T', await pg.evaluate(() => JSON.stringify(personaDeId('mariluz').franjas)));
    await pg.context().close();
  }

  // 12) «Guardar como semana tipo» sobre la semana con el cambio
  console.log('── 12) «Guardar como semana tipo» sobre la semana en la que Mari Luz libra el martes');
  {
    const dialogos = [];
    const pg = await pagina('doce', dialogos);
    await hazlo(pg, () => { cambiarDiaLibreUI('mariluz', '2026-09-28', [2]); });
    await vista(pg, 'semana'); await clic(pg, '#wNext');
    ok('la vista Semana está en la del 28/09', await pg.evaluate(() => S.semLunes) === L28);
    const n0 = dialogos.length;
    await pg.evaluate(() => { window.__ptAntes = JSON.stringify(S.patron); });
    await clic(pg, '#wPatron');
    await llega(pg, () => !!(S.patron[2] || []).length, null, 3000);
    const conf = dialogos.slice(n0).join(' | ');
    ok('la confirmación avisa del cambio de día libre y de que se guarda con su día de siempre', /Mari Luz/.test(conf) && /día de siempre/.test(conf), conf);
    const pt = await pg.evaluate(() => ({ mar: (S.patron[2] || []).filter(x => x.p === 'mariluz').map(x => x.t).sort().join(), mie: (S.patron[3] || []).filter(x => x.p === 'mariluz').length, lav: (S.patron[3] || []).filter(x => x.por === 'mariluz').map(x => x.p + '@' + x.t).sort().join() }));
    ok('la semana tipo la guarda el martes (su día de trabajo de siempre)', pt.mar === 'PASARELA_M,PASARELA_T', JSON.stringify(pt));
    ok('y el miércoles libra, con Lavinia cubriéndola', pt.mie === 0 && pt.lav === 'lavinia@PASARELA_M,lavinia@PASARELA_T', JSON.stringify(pt));
    // la confirmación promete que Ctrl+Z lo deshace: que sea verdad
    await pg.evaluate(() => { window.__ptTrasGuardar = JSON.stringify(S.patron); });
    await pg.keyboard.press('Control+z');
    await llega(pg, () => JSON.stringify(S.patron) !== window.__ptTrasGuardar, null, 3000);
    ok('Ctrl+Z devuelve la semana tipo de antes', await pg.evaluate(() => JSON.stringify(S.patron) === window.__ptAntes), await pg.evaluate(() => JSON.stringify((S.patron[2] || []).filter(x => x.t.startsWith('PASARELA')))));
    await pg.context().close();
  }

  // 13) la semana en curso: hoy es jueves 24/09 y su miércoles 23 ya ha pasado
  console.log('── 13) semana en curso con su día de siempre ya pasado: se dice, y no se guardan semanas pasadas');
  {
    const dialogos = [];
    const pg = await pagina('trece', dialogos);
    await abrirFicha(pg, 'mariluz');
    ok('la ficha parte de la semana en curso (21/09)', await ev(pg, '#fichaOvl .lpsemlbl', x => x.dataset.lunes) === '2026-09-21');
    ok('‹ no lleva a semanas pasadas', await ev(pg, '#fichaOvl [data-lpsem="-1"]', b => b.disabled) === true);
    await clic(pg, '#fichaOvl [data-tlpunt="5"]');
    await llega(pg, () => libraEn(personaDeId('mariluz'), '2026-09-25'), null, 3000);
    ok('la confirmación dice que el miércoles 23 ya ha pasado y cuántos días trabaja esa semana', dialogos.some(m => /miércoles 23 ya ha pasado/.test(m) && /5 días en vez de 6/.test(m)), JSON.stringify(dialogos));
    await cerrarFicha(pg);
    const r = await pg.evaluate(() => { const hecho = cambiarDiaLibreUI('mariluz', '2026-09-14', [2]); return { hecho, lp: JSON.stringify(personaDeId('mariluz').libraPuntual) }; });
    ok('no se guarda un cambio para una semana que ya ha pasado', r.hecho === false && !/2026-09-14/.test(r.lp), JSON.stringify(r));
    await pg.context().close();
  }

  // 14) móvil: tras marcar un día, «Listo» cierra con un toque; el ✕ de otras semanas se toca bien
  console.log('── 14) móvil (640 px): «Listo» con un solo toque; el ✕ de «Guardado para otras semanas» de 44 px');
  {
    const dialogos = [];
    const pg = await pagina('catorce', dialogos, { width: 640, height: 900 });
    await hazlo(pg, () => { GEN.modo = 'semana'; GEN.lunes = '2026-09-28'; switchTab('generador'); });
    await pg.waitForSelector('#gsLibra', { timeout: 5000 }).catch(() => null);
    await clic(pg, '#gsLibra');
    await pg.selectOption('#libraSemOvl #lsPid', 'mariluz', { timeout: 3000 }).catch(() => null);
    await clic(pg, '#libraSemOvl [data-lsdia="2"]');
    await llega(pg, () => libraEn(personaDeId('mariluz'), '2026-09-29'), null, 3000);
    await clic(pg, '#libraSemOvl .btn-cta[data-ovx]');
    ok('un solo toque en «Listo» cierra el panel', await llega(pg, () => !document.getElementById('libraSemOvl'), null, 1500) >= 0);
    await hazlo(pg, () => { ponerLibraPuntual(personaDeId('mariluz'), '2026-10-05', [5]); saveState(); openFicha('mariluz'); });
    await pg.waitForSelector('#fichaOvl .lpotra .festrm', { timeout: 5000 }).catch(() => null);
    const tam = await ev(pg, '#fichaOvl .lpotra .festrm', b => { const r = b.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; });
    ok('el ✕ de «Guardado para otras semanas» mide 44 × 44 en el móvil', !!tam && tam[0] >= 44 && tam[1] >= 44, JSON.stringify(tam));
    // en el móvil no hay teclado ni barra de arriba: se deshace en «Más → Deshacer»
    ok('en el móvil la confirmación no habla de Ctrl+Z: dice «Más → Deshacer»', dialogos.length > 0 && dialogos.every(m => !/Ctrl\+Z/.test(m) && /Más → Deshacer/.test(m)), JSON.stringify(dialogos));
    await pg.context().close();
  }

  // 15) textos que el cliente ve
  console.log('── 15) textos: la Revisión, la semana con su fecha, su propio día no es un cambio, «falta 1 de 3», sin «emparejar»');
  {
    const dialogos = [];
    const pg = await pagina('quince', dialogos);
    // Revisión con la semana volcada y sin regenerar: solo el aviso del día libre, dicho bien
    await hazlo(pg, () => { ponerLibraPuntual(personaDeId('mariluz'), '2026-09-28', [2]); saveState(); });
    const rev = await pg.evaluate(() => revisionMes(S, S.staff, estadoDeIso('2026-09-29'), { desde: '2026-09-29', hasta: '2026-09-29' }).filter(x => /Mari Luz/.test(x.msg)).map(x => x.msg));
    ok('Revisión: «libra el martes esta semana», sin «no hace partido los martes»', rev.length > 0 && rev.every(m => /libra el martes esta semana/.test(m) && !/partido/.test(m)), JSON.stringify(rev));
    // la hoja impresa del Generador explica el hueco con el mismo texto
    const hoja = await pg.evaluate(() => { const e = clonarEstado(estadoSemana('2026-09-28', false)); for (const t of turnosDe(S)) desasignar(e, '2026-09-29', t.id, 'mariluz'); const x = pxgDestrapa({ estado: e }, { iso: '2026-09-29', turnoId: 'PASARELA_T', tipo: 'faltan' }).find(y => y.nombre === 'Mari Luz'); return x ? x.motivo : null; });
    ok('la hoja impresa dice «libra el martes esta semana» (el mismo texto, del modelo)', hoja === 'libra el martes esta semana', hoja);
    await hazlo(pg, () => { ponerLibraPuntual(personaDeId('mariluz'), '2026-09-28', []); saveState(); });
    await generadorSemana(pg, L28);
    await abrirFicha(pg, 'mariluz');
    const pie0 = String(await ev(pg, '#fichaOvl .lpuntpie', x => x.textContent) || '');
    ok('«Sin cambios en la semana del 28/09», con su fecha', /semana del 28\/09/.test(pie0) && !/L 28/.test(pie0), pie0);
    await clic(pg, '#fichaOvl [data-tlpunt="3"]');
    const pie1 = String(await ev(pg, '#fichaOvl .lpuntpie', x => x.textContent) || '');
    ok('marcar su propio día libre (miércoles) no guarda nada ni pregunta', await pg.evaluate(() => !(personaDeId('mariluz').libraPuntual || []).length) && !dialogos.length && !/miércoles en vez de miércoles/.test(pie1), JSON.stringify([await lp(pg), dialogos, pie1]));
    await clic(pg, '#fichaOvl [data-tlpunt="2"]');
    await llega(pg, () => libraEn(personaDeId('mariluz'), '2026-09-29'), null, 3000);
    ok('la confirmación dice «falta 1 de 3», no «faltan 1 de 3»', dialogos.some(m => /falta 1 de 3/.test(m)) && !dialogos.some(m => /faltan 1 de/.test(m)), JSON.stringify(dialogos));
    const pie2 = String(await ev(pg, '#fichaOvl .lpuntpie', x => x.textContent) || '');
    ok('el pie dice «La semana del 28/09 libra martes…»', /La semana del 28\/09 libra martes/.test(pie2), pie2);
    await cerrarFicha(pg);
    // Maydeth no tiene día fijo: marcarle un día esa semana no trae avisos de «emparejar»
    await hazlo(pg, () => { ponerLibraPuntual(personaDeId('maydeth'), '2026-09-28', [2]); saveState(); });
    await generadorSemana(pg, L28);
    await generar(pg);
    const gtxt = String(await ev(pg, '#genRoot', x => x.textContent) || '');
    ok('el Generador no habla de «emparejar» a quien no tiene día fijo', !/empareja/i.test(gtxt), (gtxt.match(/.{0,80}empareja.{0,80}/i) || [''])[0]);
    // la lista del panel del Generador obedece «Días que libra» apagada, como la del Generador
    await hazlo(pg, () => { personaDeId('maydeth').inactivas = ['libra']; saveState(); });
    await clic(pg, '#gsLibra');
    await pg.waitForSelector('#libraSemOvl .lslista', { timeout: 3000 }).catch(() => null);
    const lista = String(await ev(pg, '#libraSemOvl .lslista', x => x.textContent) || '');
    ok('la lista de cambios del panel no enseña a quien tiene «Días que libra» apagada', /Mari Luz/.test(lista) && !/Maydeth/.test(lista), lista);
    await pg.context().close();
  }

  // 16) la confirmación dice cuándo no se la puede poner el día nuevo
  console.log('── 16) Lavinia puesta a mano el miércoles 30: la confirmación dice que Mari Luz no se puede poner ese día y por qué');
  {
    const dialogos = [];
    const pg = await pagina('dieciseis', dialogos);
    await hazlo(pg, () => { for (const t of ['PASARELA_M', 'PASARELA_T']) { const x = asignados(estadoDeIso('2026-09-30'), '2026-09-30', t).find(e => e.pid === 'lavinia'); if (x) x.origen = 'manual'; } saveState(); });
    await hazlo(pg, () => { cambiarDiaLibreUI('mariluz', '2026-09-28', [2]); });
    ok('la confirmación lo dice: no se puede poner a Mari Luz el miércoles 30, nunca con Lavinia (plaza puesta a mano)', dialogos.some(m => /no se puede poner a Mari Luz el miércoles 30/.test(m) && /nunca con Lavinia \(plaza puesta a mano\)/.test(m)), JSON.stringify(dialogos));
    ok('y el historial lo apunta', await pg.evaluate(() => /no se pudo poner|no se pudieron poner/.test((S.historial[0] || {}).txt || '')), await pg.evaluate(() => (S.historial[0] || {}).txt));
    await pg.context().close();
  }

  ok('ningún error de página en toda la batería', !errores.length, errores.join(' | '));
} finally {
  await br.close(); srv.close();
}
resumen();
