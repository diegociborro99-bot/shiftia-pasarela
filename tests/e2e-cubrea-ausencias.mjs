// «CUBRE A» HASTA NUEVA ORDEN: LO QUE ENCONTRARON LOS DOS REVISORES DE LA FASE 3b, CON CLICS (24/09, D13).
// Cada bloque es un recorrido del cliente que fallaba:
//   1) la ★ de Hoy recomienda a Mari Luz «cubre a Iván» y al pulsarla fallaba («no hace partido los
//      domingos») o la ponía sin «por Iván»; ahora la pone como el selector (＋ Asignar).
//   2) Ctrl+Z después de apuntar una ausencia desde Equipo te llevaba a otro mes (Hoy saltaba al 2/09).
//   3) una baja apuntada con fecha pasada metía a quien cubre en días ya trabajados (cambiaba sus horas).
//   4) con dos personas designadas, Equipo elegía a otra que la Cobertura (le pasaba solo los días de la
//      ausencia y no las semanas enteras: «0 turnos esa semana»).
//   5) tras un «Guardar» simple, la pestaña Cobertura decía «Iván no tiene turnos ese día» del domingo que
//      la confirmación acababa de dar por pendiente.
//   6) los textos: «entra en su sitio (ya estaba…)», paréntesis dentro de paréntesis, fechas desordenadas
//      en el historial y «(siempre que falte)» sobrando en la ficha de Iván.
//   7) quitar la ausencia no decía que Iván vuelve al regenerar.
//   8) el alta de ausencias del Mes no dejaba elegir la franja.
// El reloj de la página se fija en el jueves 24/09/2026 (el día de la reunión); ?demo=1.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cargarChromium, contador, llega } from './e2e-util.mjs';

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
const VIE = '2026-10-02', SAB = '2026-10-03', DOM = '2026-10-04';

async function pagina(etiqueta) {
  const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } });
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
  await pg.waitForSelector('#fichaOvl .lpunt', { timeout: 5000 });
}
const cerrarFicha = async pg => { await clic(pg, '#fichaOvl [data-ovx]'); await llega(pg, () => !document.getElementById('fichaOvl'), null, 3000); };
const casilla = (pg, iso, tid) => pg.evaluate(([i, t]) => asignados(estadoDeIso(i), i, t).map(x => ({ pid: x.pid, por: x.por || null, abre: !!x.abre, origen: x.origen })), [iso, tid || 'PASARELA_T']);
const toasts = pg => pg.evaluate(() => [...document.querySelectorAll('.toast')].map(t => t.textContent.replace(/\s+/g, ' ')).join(' || '));
async function irHoy(pg, iso) {
  await vista(pg, 'hoy');
  for (let i = 0; i < 45 && await pg.evaluate(v => isoDia() < v, iso); i++) await clic(pg, '#dNext');
  for (let i = 0; i < 45 && await pg.evaluate(v => isoDia() > v, iso); i++) await clic(pg, '#dPrev');
  return pg.evaluate(() => isoDia());
}
// en la ficha: la ausencia (tipo, desde, hasta y franja: '' = día entero) y «Guardar ausencia»
async function ausenciaEnFicha(pg, pid, tipo, desde, hasta, franja) {
  await abrirFicha(pg, pid);
  await pg.selectOption('#fichaOvl #fAusTipo', tipo);
  await pg.fill('#fichaOvl #fAusD1', desde);
  await pg.fill('#fichaOvl #fAusD2', hasta || '');
  await pg.selectOption('#fichaOvl #fAusFr', franja || '');
  await clic(pg, '#fichaOvl [data-addaus]');
  return llega(pg, () => !!document.getElementById('ausOvl'), null, 4000);
}
async function cubreA(pg, quien, aQuien) {
  await abrirFicha(pg, quien);
  await pg.selectOption('#fichaOvl #fCubreP', aQuien);
  await clic(pg, '#fichaOvl [data-addcubre]');
  await cerrarFicha(pg);
}
// que Dulce ya no esté en standby (como el cliente el 24/09)
async function dulceEnActivo(pg) {
  await abrirFicha(pg, 'dulce');
  if (await pg.evaluate(() => !!personaDeId('dulce').standby)) await clic(pg, '#fichaOvl input[data-chk="standby"]');
  await cerrarFicha(pg);
}

try {
  // ══ 1) la ★ de Hoy pone a Mari Luz «por Iván», como el selector ══
  {
    console.log('── 1) La ★ de Hoy: Mari Luz «cubre a Iván» el domingo 4 por la tarde → la pone «por Iván»');
    const pg = await pagina('estrella');
    await cubreA(pg, 'mariluz', 'ivan');
    ok('Hoy en el domingo 4', await irHoy(pg, DOM) === DOM);
    await clic(pg, `#view-hoy [data-un="${DOM}|PASARELA_T|lavinia"]`);
    await ausenciaEnFicha(pg, 'ivan', 'VAC', DOM, DOM, '');
    await clic(pg, '#ausOvl [data-ausok="guardar"]');
    await cerrarFicha(pg);
    ok('Mari Luz entró «por Iván» (su partido para cubrirle está autorizado)', (await casilla(pg, DOM)).some(x => x.pid === 'mariluz' && x.por === 'ivan'), JSON.stringify(await casilla(pg, DOM)));
    await irHoy(pg, DOM);
    await clic(pg, `#view-hoy [data-un="${DOM}|PASARELA_T|mariluz"]`);
    ok('la tarde se queda vacía', !(await casilla(pg, DOM)).length, JSON.stringify(await casilla(pg, DOM)));
    const star = await pg.evaluate(d => { const b = document.querySelector(`#view-hoy [data-cas="${d}|PASARELA_T"] [data-sust]`); return b ? { sust: b.dataset.sust, title: b.title } : null; }, DOM);
    ok('la ★ recomienda a Mari Luz, «cubre a Iván»', !!star && /\|mariluz$/.test(star.sust) && /cubre a Iván/.test(star.title), JSON.stringify(star));
    const u0 = await pg.evaluate(() => undoStack.length);
    await clic(pg, `#view-hoy [data-cas="${DOM}|PASARELA_T"] [data-sust]`);
    await llega(pg, d => asignados(estadoDeIso(d), d, 'PASARELA_T').length > 0, DOM, 2000);
    const c = await casilla(pg, DOM);
    ok('al pulsar la ★, Mari Luz entra «por Iván»', c.length === 1 && c[0].pid === 'mariluz' && c[0].por === 'ivan', JSON.stringify(c) + ' · ' + await toasts(pg));
    ok('sin el error «no hace partido los domingos»', !/no hace partido/.test(await toasts(pg)), await toasts(pg));
    ok('un paso de Ctrl+Z', await pg.evaluate(n => undoStack.length === n + 1, u0));
    const chip = await texto(pg, `#view-hoy [data-cas="${DOM}|PASARELA_T"] .pchip[data-pid="mariluz"]`);
    ok('Hoy la enseña «por Iván»', /por Iván/.test(chip), chip);
    await pg.keyboard.press('Control+z');
    ok('Ctrl+Z la quita y Hoy sigue en el domingo 4', await llega(pg, d => !asignados(estadoDeIso(d), d, 'PASARELA_T').length && isoDia() === d, DOM, 3000) >= 0, await pg.evaluate(() => isoDia()));
    await pg.context().close();
  }

  // ══ 2) Ctrl+Z no cambia de mes ══
  {
    console.log('── 2) Vacaciones de Iván desde Equipo (el mes en pantalla es septiembre) → Hoy viernes 2/10 → Ctrl+Z');
    const pg = await pagina('deshacer');
    await cubreA(pg, 'mariluz', 'ivan');
    await ausenciaEnFicha(pg, 'ivan', 'VAC', VIE, DOM, 'T');
    await clic(pg, '#ausOvl [data-ausok="guardar"]');
    await cerrarFicha(pg);
    ok('Hoy en el viernes 2', await irHoy(pg, VIE) === VIE);
    await pg.click('body', { position: { x: 5, y: 5 } }).catch(() => {});
    await pg.keyboard.press('Control+z');
    ok('los datos vuelven: Iván en su tarde y sin vacaciones', await llega(pg, () => pidsEn(estadoDeIso('2026-10-02'), '2026-10-02', 'PASARELA_T').includes('ivan') && !(personaDeId('ivan').ausencias || []).length, null, 3000) >= 0);
    ok('y Hoy sigue en el viernes 2 (no salta al 2 de septiembre)', await pg.evaluate(() => isoDia()) === VIE, await pg.evaluate(() => isoDia() + ' · ' + S.y + '/' + S.m));
    const cab = await texto(pg, '#view-hoy');
    ok('lo que se ve es el viernes 2 de octubre', /octubre/i.test(cab) && !/septiembre/i.test(cab.slice(0, 200)), cab.slice(0, 120));
    await pg.context().close();
  }

  // ══ 3) una baja con fecha pasada ══
  {
    console.log('── 3) Baja de Susana Luna del 14 al 24/09 (hoy es 24/09): Roberto le cubre, pero no en días ya trabajados');
    const pg = await pagina('pasado');
    const turnosRoberto = () => pg.evaluate(() => { let n = 0; for (const iso of rangoIso('2026-09-01', '2026-09-23')) for (const t of turnosDe(S)) if (pidsEn(estadoDeIso(iso), iso, t.id).includes('roberto')) n++; return n; });
    const antes = await turnosRoberto();
    // (el jueves 17 Roberto ya iba «por Susana Luna»: es su plaza fija de la semana tipo, D12)
    const porSl = () => pg.evaluate(() => JSON.stringify([...rangoIso('2026-09-14', '2026-09-23')].map(iso => turnosDe(S).map(t => asignados(estadoDeIso(iso), iso, t.id).filter(x => x.por === 'sluna').map(x => iso + x.pid))).flat(2)));
    const porAntes = await porSl();
    ok('Roberto tiene «Cubre a Susana Luna» en la demo', await pg.evaluate(() => (personaDeId('roberto').cubreA || []).some(c => c.pid === 'sluna')));
    await ausenciaEnFicha(pg, 'sluna', 'BAJ', '2026-09-14', '2026-09-24', '');
    const conf = await texto(pg, '#ausOvl');
    ok('la confirmación dice que los días pasados solo se quitan de la planilla', /ya han pasado/.test(conf) && /a mano/.test(conf), conf);
    ok('ni «no se pudo poner»', !/no se pudo poner/.test(conf), conf);
    const queda = (/Queda por cubrir:(.*?)\./.exec(conf) || [])[1] || '';
    ok('lo que queda por cubrir no incluye días pasados', !/lunes 14|martes 15|miércoles 16|jueves 17|viernes 18|sábado 19|domingo 20|lunes 21|martes 22|miércoles 23/.test(queda), queda);
    await clic(pg, '#ausOvl [data-ausok="guardar"]');
    await cerrarFicha(pg);
    ok('los turnos de Roberto del 1 al 23/09 no cambian (sus horas tampoco)', await turnosRoberto() === antes, `${antes} → ${await turnosRoberto()}`);
    ok('Susana Luna sale de la planilla esos días (estaba de baja)', await pg.evaluate(() => [...rangoIso('2026-09-14', '2026-09-24')].every(iso => turnosDe(S).every(t => !pidsEn(estadoDeIso(iso), iso, t.id).includes('sluna')))));
    ok('y antes de hoy no entra nadie nuevo «por Susana Luna»', await porSl() === porAntes, `${porAntes} → ${await porSl()}`);
    await pg.context().close();
  }

  // ══ 4) dos designadas: Equipo elige como la Cobertura ══
  {
    console.log('── 4) Leo y Dulce cubren a Iván; permiso el martes 29 por la tarde: Equipo elige a la misma que la Cobertura');
    const pg = await pagina('rango');
    await dulceEnActivo(pg);
    await cubreA(pg, 'leo', 'ivan');
    await cubreA(pg, 'dulce', 'ivan');
    const esperado = await pg.evaluate(() => {
      const inc = { pid: 'ivan', tipo: 'PERM', desde: '2026-09-29', hasta: '2026-09-29', dias: ['2026-09-29'], franjas: ['T'] }, rg = rangoNecesario(inc);
      const A = planesCobertura(S, S.staff, clonarEstado(estadoRango(rg.desde, rg.hasta, false)), inc, { siempre: true }).planes[0];
      return A.asignaciones.filter(a => a.por === 'ivan').map(a => a.pid).join();
    });
    ok('la Cobertura (semanas enteras) propone a alguien', !!esperado, esperado);
    await ausenciaEnFicha(pg, 'ivan', 'PERM', '2026-09-29', '2026-09-29', 'T');
    await clic(pg, '#ausOvl [data-ausok="guardar"]');
    await cerrarFicha(pg);
    const puesto = (await casilla(pg, '2026-09-29')).filter(x => x.por === 'ivan').map(x => x.pid).join();
    ok(`Equipo pone a la misma que la Cobertura (${esperado})`, puesto === esperado, `Equipo: ${puesto} · Cobertura: ${esperado}`);
    await pg.context().close();
  }

  // ══ 5) la Cobertura encuentra lo que quedó tras un «Guardar» simple ══
  {
    console.log('── 5) Vacaciones de Iván 2–4/10 por la tarde, «Guardar»; luego Cobertura → Iván → domingo 4');
    const pg = await pagina('cobertura');
    await cubreA(pg, 'mariluz', 'ivan');
    await ausenciaEnFicha(pg, 'ivan', 'VAC', VIE, DOM, 'T');
    await clic(pg, '#ausOvl [data-ausok="guardar"]');
    await cerrarFicha(pg);
    ok('el domingo Iván ya no está y nadie va «por Iván»', !(await casilla(pg, DOM)).some(x => x.pid === 'ivan' || x.por === 'ivan'));
    await vista(pg, 'cobertura');
    await clic(pg, '#cobRoot .cobpk[data-pk="ivan"]');
    await clic(pg, '#cobRoot [data-tipo="VAC"]');
    await clic(pg, '#cobRoot [data-cobsel="ninguno"]');
    await clic(pg, `#cobRoot .cobdia[data-dia="${DOM}"]`);
    await clic(pg, '#cobRoot [data-fr="T"]');
    const boton = await texto(pg, '#cobRoot #cobProponer');
    ok('el botón cuenta el turno que dejó («1 turno»)', /1 turno/.test(boton), boton);
    await clic(pg, '#cobRoot #cobProponer');
    await llega(pg, () => !!document.querySelector('#cobRes .cobres, #cobRes .cobvacia'), null, 8000);
    const res = await texto(pg, '#cobRes');
    ok('no dice «no tiene turnos en la planilla»', !/no tiene turnos/.test(res), res.slice(0, 200));
    ok('propone quién cubre la tarde del domingo', !!(await pg.$(`#cobRes .cobplan.reco .cobmv[data-cas="${DOM}|PASARELA_T"]`)) && !/Registrar solo la ausencia/.test(res), res.slice(0, 300));
    // un día en que no trabaja y ya está apuntado: no ofrece «Registrar solo la ausencia»
    await clic(pg, '#cobRoot [data-cobsel="ninguno"]');
    await clic(pg, '#cobRoot [data-fr=""]');
    const libre = await pg.evaluate(() => { const iv = personaDeId('ivan'); return ['2026-10-02', '2026-10-03', '2026-10-04'].find(i => !turnosDe(S).some(t => pidsEn(estadoDeIso(i), i, t.id).includes('ivan')) && ausenciaEn(iv, i, 'M')) || null; });
    if (libre) {
      await clic(pg, `#cobRoot .cobdia[data-dia="${libre}"]`);
      await clic(pg, '#cobRoot [data-fr="M"]');
      await clic(pg, '#cobRoot #cobProponer');
      await llega(pg, () => !!document.querySelector('#cobRes .cobres, #cobRes .cobvacia'), null, 8000);
      const r2 = await texto(pg, '#cobRes');
      ok('un día ya apuntado sin turnos no ofrece «Registrar solo la ausencia»', !/Registrar solo la ausencia/.test(r2), r2.slice(0, 200));
    }
    await pg.context().close();
  }

  // ══ 6) los textos ══
  {
    console.log('── 6) Los textos de la confirmación, del historial y de la ficha');
    const pg = await pagina('textos');
    await cubreA(pg, 'mariluz', 'ivan');
    await abrirFicha(pg, 'ivan');
    const leCubre = await texto(pg, '#fichaOvl [data-lecubre]');
    ok('la ficha de Iván dice «Si falta, le cubre Mari Luz», sin «(siempre que falte)», como la tarjeta', /Si falta, le cubre Mari Luz/.test(leCubre) && !/siempre que falte/.test(leCubre), leCubre);
    await cerrarFicha(pg);
    await ausenciaEnFicha(pg, 'ivan', 'VAC', VIE, DOM, 'T');
    const conf = await texto(pg, '#ausOvl');
    ok('el relevo no «entra en su sitio»: ya estaba y pasa a cubrirle, abriendo', !/entra en su sitio \(ya estaba/.test(conf) && /viernes 2 y el sábado 3 ya estaba en ese turno y pasa a cubrirle, abriendo/.test(conf), conf);
    ok('el domingo: «no puede: nunca con Lavinia»', /domingo 4 no puede: nunca con Lavinia/.test(conf), conf);
    ok('sin paréntesis dentro de paréntesis', !/\([^)]*\(/.test(conf), conf);
    await clic(pg, '#ausOvl [data-ausok="cancelar"], #ausOvl [data-ovx]');
    await cerrarFicha(pg);
    // Dulce cubre a Iván el miércoles 30: con Lavinia dejaría la casilla solo con apoyos
    await dulceEnActivo(pg);
    await cubreA(pg, 'dulce', 'ivan');
    await ausenciaEnFicha(pg, 'ivan', 'PERM', '2026-09-30', '2026-09-30', 'T');
    const conf2 = await texto(pg, '#ausOvl');
    ok('«solo con apoyos» sin paréntesis anidados', /solo con apoyos/.test(conf2) && !/\([^)]*\(/.test(conf2), conf2);
    await clic(pg, '#ausOvl [data-ovx]');
    await cerrarFicha(pg);
    // el historial: las fechas en orden (Roberto cubre a Susana Luna de hoy al domingo 4)
    await ausenciaEnFicha(pg, 'sluna', 'VAC', '2026-09-24', '2026-10-04', '');
    await clic(pg, '#ausOvl [data-ausok="guardar"]');
    await cerrarFicha(pg);
    const h = await pg.evaluate(() => (S.historial || [])[0].txt);
    const fechas = ((/Roberto le cubre ([^·(]*)/.exec(h) || [])[1] || '').match(/\d+\/\d+/g) || [];
    const orden = fechas.map(f => { const [d, m] = f.split('/').map(Number); return m * 100 + d; });
    ok('el historial dice las fechas en orden', fechas.length > 1 && orden.every((x, i) => !i || orden[i - 1] < x), h);
    await pg.context().close();
  }

  // ══ 7) quitar la ausencia lo avisa ══
  {
    console.log('── 7) Ficha de Iván → quitar la ausencia (✕): el aviso dice que vuelve al regenerar');
    const pg = await pagina('quitar');
    await cubreA(pg, 'mariluz', 'ivan');
    await ausenciaEnFicha(pg, 'ivan', 'VAC', VIE, DOM, 'T');
    await clic(pg, '#ausOvl [data-ausok="guardar"]');
    await llega(pg, () => !document.getElementById('ausOvl'), null, 3000);
    await clic(pg, '#fichaOvl [data-rmaus="0"]');
    await llega(pg, () => !(personaDeId('ivan').ausencias || []).length, null, 3000);
    const t = await toasts(pg);
    ok('el aviso dice que Iván vuelve a sus turnos al volver a generar la semana y cómo deshacerlo', /Iván vuelve a sus turnos al volver a generar/.test(t) && /Ctrl\+Z/.test(t), t);
    await pg.context().close();
  }

  // ══ 8) el Mes deja elegir la franja ══
  {
    console.log('── 8) Mes → Iván el viernes 25/09 → Marcar ausencia → «Solo tarde»');
    const pg = await pagina('mes');
    await vista(pg, 'mes');
    await pg.waitForSelector('#view-mes td[data-asig="ivan|2026-09-25"]', { timeout: 8000 }).catch(() => null);
    await clic(pg, '#view-mes td[data-asig="ivan|2026-09-25"]');
    await llega(pg, () => !!document.getElementById('diaPersPop'), null, 3000);
    await clic(pg, '#diaPersPop [data-dp="aus"]');
    await llega(pg, () => !!document.getElementById('ausPop'), null, 3000);
    const hay = !!(await pg.$('#ausPop #ausFr'));
    ok('el alta del Mes tiene «Día entero / Solo mañana / Solo tarde»', hay && await pg.evaluate(() => [...document.querySelectorAll('#ausPop #ausFr option')].map(o => o.textContent.trim()).join('|') === 'Día entero|Solo mañana|Solo tarde'));
    if (hay) await pg.selectOption('#ausPop #ausFr', 'T');
    await clic(pg, '#ausPop #ausOk');
    if (await llega(pg, () => !!document.getElementById('ausOvl'), null, 3000) >= 0) await clic(pg, '#ausOvl [data-ausok="guardar"]');
    ok('queda solo por la tarde', await llega(pg, () => { const a = personaDeId('ivan').ausencias || []; return a.length === 1 && JSON.stringify(a[0].franjas) === '["T"]'; }, null, 3000) >= 0, await pg.evaluate(() => JSON.stringify(personaDeId('ivan').ausencias)));
    await pg.context().close();
  }

  ok('ningún error de página en toda la batería', !errores.length, errores.join(' | '));
} catch (e) {
  ok('la batería no se interrumpe', false, e && e.stack ? e.stack.split('\n').slice(0, 4).join(' | ') : e);
} finally {
  await br.close();
  srv.close();
}
resumen();
