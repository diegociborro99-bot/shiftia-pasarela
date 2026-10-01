// LA CASILLA EN LA INTERFAZ TRAS LA REVISIÓN DE A1 (30/09), CON CLICS. Las dos revisiones de la fase A1 (lente modelo y lente
// cliente) pidieron:
//  1) el orden a mano (▲/▼) se ve igual en Hoy, en el Excel y en el menú de la casilla («posición N de M»); y con el hueco
//     de la 1.ª (nadie puede abrir) el Excel no dice «(abre)» de nadie;
//  2) lo que cambia en OTRAS casillas del día al tocar una (el eco) se dice en un toast y se apunta en el historial, en
//     español llano; y «Lleva la cocina» a mano no le quita la cocina de la tarde a quien queda de sala en esa casilla
//     (lo decidido a mano no provoca retiradas en otras casillas);
//  3) «Quitar la marca de cocina» deja en el historial la franja;
//  4) el perfil del empleado no lista una casilla cerrada ese día ni la pinta como partido.
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
const espera = ms => new Promise(r => setTimeout(r, ms));

async function pagina(etiqueta) {
  const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.clock.setFixedTime(new Date('2026-09-24T10:00:00+02:00'));
  await ctx.addInitScript(() => { try { sessionStorage.setItem('shiftia_pas_sesion', '1'); sessionStorage.setItem('shiftia_pas_rol', 'admin'); } catch (e) {} });
  const pg = await ctx.newPage();
  pg.on('pageerror', e => errores.push(`${etiqueta}: ${e.message}`));
  pg.dialogos = [];
  pg.on('dialog', d => { pg.dialogos.push(d.message()); d.accept(d.type() === 'prompt' ? 'prueba' : undefined).catch(() => {}); });
  await pg.route(/googleapis|gstatic|cdnjs/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await pg.goto(BASE + '/index.html?demo=1');
  await pg.waitForSelector('#view-hoy .loccard', { timeout: 15000 });
  return pg;
}
async function seccion(nombre, fn) {
  try { await fn(); } catch (e) { ok(`${nombre}: la sección no se interrumpe`, false, e && e.stack ? e.stack.split('\n').slice(0, 4).join(' | ') : e); }
}
// va a un día en Hoy
const irADia = async (pg, iso) => { await pg.evaluate(iso => { irAIso(iso); switchTab('hoy'); }, iso); return llega(pg, iso => isoDia() === iso && !!document.querySelector(`[data-cas^="${iso}|"]`), iso, 4000); };
// lo que ve el encargado en Hoy de una casilla: «1.cris* 2.esmeralda(c) 3.yilian»
const hoyCasilla = (pg, iso, tid) => pg.$$eval(`#view-hoy [data-cas="${iso}|${tid}"] .pchip`, cs => cs.map(c => (c.querySelector('.pos') || {}).textContent + '.' + (c.classList.contains('hueco') ? 'HUECO' : c.dataset.pid) + (c.querySelector('.bdg.abre') ? '*' : '') + (c.querySelector('.bdg.cocina') ? '(c)' : '')));
// lo guardado, el Excel de la semana (xlsxCasilla) y la hoja del equipo (abreEn) de la misma casilla
const lecturas = (pg, iso, tid) => pg.evaluate(([iso, tid]) => {
  const e = estadoDeIso(iso), l = asignados(e, iso, tid), { localId, franja } = partirTurno(tid);
  return { guardado: l.map(x => x.pid + (x.abre ? '*' : '') + (x.cocina ? '(c)' : '')), excel: xlsxCasilla({ est: e, iso }, localDe(S, localId), franja), hojaAbre: l.filter((x, i) => abreEn(l, i)).map(x => x.pid), manual: JSON.parse(JSON.stringify(manualDe(e, iso, tid))) };
}, [iso, tid]);
// abre el menú de una persona en la casilla de Hoy y pulsa una acción (data-mt)
async function accionMenu(pg, iso, tid, pid, mt) {
  await pg.click(`#view-hoy [data-cas="${iso}|${tid}"] .pchip[data-pid="${pid}"] .pnom`, { timeout: 4000 });
  if (await llega(pg, () => !!document.querySelector('#menuTurnoPop'), null, 3000) < 0) return 'sin menú';
  const cab = await pg.$eval('#menuTurnoPop .pd', x => x.textContent.replace(/\s+/g, ' ').trim()).catch(() => '?');
  if (!mt) { await pg.keyboard.press('Escape'); await pg.evaluate(() => { const m = document.getElementById('menuTurnoPop'); if (m) m.remove(); }); return cab; }
  const b = await pg.$(`#menuTurnoPop [data-mt="${mt}"]`);
  if (!b) { await pg.evaluate(() => { const m = document.getElementById('menuTurnoPop'); if (m) m.remove(); }); return 'sin botón ' + mt; }
  await b.click();
  await llega(pg, () => !document.querySelector('#menuTurnoPop'), null, 3000);
  await espera(150);
  return cab;
}
const toasts = pg => pg.$eval('#toasts', t => t.textContent).catch(() => '');
const historial = (pg, n) => pg.evaluate(n => (S.historial || []).slice(0, n).map(h => h.txt), n);

try {
  // ══ 1) el orden a mano: Hoy = guardado = Excel = menú ══
  console.log('── 1) viernes 9/10, Mónaco mañana [cris*, esmeralda(c), yilian]: «▼ Bajar» a Cris');
  await seccion('orden a mano', async () => {
    const pg = await pagina('orden');
    const V = '2026-10-09';
    await irADia(pg, V);
    ok('antes: Hoy enseña 1.cris* 2.esmeralda(c) 3.yilian', j(await hoyCasilla(pg, V, 'MONACO_M')) === j(['1.cris*', '2.esmeralda(c)', '3.yilian']), j(await hoyCasilla(pg, V, 'MONACO_M')));
    await accionMenu(pg, V, 'MONACO_M', 'cris', 'bajar');
    const hoy = await hoyCasilla(pg, V, 'MONACO_M'), l = await lecturas(pg, V, 'MONACO_M');
    ok('tras «Bajar»: Hoy enseña a Esmeralda la 1.ª y a Cris la 2.ª, y Cris sigue abriendo', j(hoy) === j(['1.esmeralda(c)', '2.cris*', '3.yilian']), j(hoy));
    ok('lo guardado dice lo mismo (orden a mano)', j(l.guardado) === j(['esmeralda(c)', 'cris*', 'yilian']) && l.manual.orden === true, j(l));
    ok('y el Excel de la semana también: «Esmeralda (cocina) + Cris Parreño (abre) + Yilian»', l.excel === 'Esmeralda (cocina) + Cris Parreño (abre) + Yilian', l.excel);
    const cab = await accionMenu(pg, V, 'MONACO_M', 'cris', null);
    ok('el menú de Cris dice «posición 2 de 3», la misma que Hoy', /posición 2 de 3/.test(cab), cab);
    // sin cambiar nada más en el día
    const otras = await pg.evaluate(V => (S.historial || []).slice(0, 2).map(h => h.txt), V);
    ok('el historial apunta la bajada y ninguna otra casilla cambia por rebote', /Cris Parreño baja en la casilla/.test(otras[0]) && !/Por /.test(otras[0]), j(otras));
    await pg.evaluate(() => deshacer());
    ok('Ctrl+Z: Cris vuelve a la 1.ª', j(await hoyCasilla(pg, V, 'MONACO_M')) === j(['1.cris*', '2.esmeralda(c)', '3.yilian']), j(await hoyCasilla(pg, V, 'MONACO_M')));
    // el hueco: nadie de la casilla puede abrir (los tres con «no sale el primero de la mañana»): el Excel no dice «(abre)» de nadie
    await pg.evaluate(V => { for (const id of ['cris', 'esmeralda', 'yilian']) personaDeId(id).noPrimero = ['M']; saveState(); renderVistaActiva(); }, V);
    const h2 = await hoyCasilla(pg, V, 'MONACO_M'), l2 = await lecturas(pg, V, 'MONACO_M');
    ok('Hoy enseña el hueco en la 1.ª y a los tres detrás', h2[0] === '1.HUECO' && h2.length === 4, j(h2));
    ok('el Excel no dice «(abre)» de nadie y la hoja del equipo tampoco marca a nadie', !/\(abre\)/.test(l2.excel) && !l2.hojaAbre.length, j(l2));
    ok('el menú de Esmeralda dice «posición 2 de 4» (con el hueco delante), como Hoy', /posición 2 de 4/.test(await accionMenu(pg, V, 'MONACO_M', 'esmeralda', null)), await accionMenu(pg, V, 'MONACO_M', 'esmeralda', null));
    await pg.context().close();
  });

  // ══ 2) el eco se dice, y lo a mano no cascada ══
  console.log('── 2) viernes 9/10, El 33: Victoria «Lleva la cocina» por la mañana (la tarde no cambia); Noe a la mañana (la tarde cambia y se dice)');
  await seccion('eco', async () => {
    const pg = await pagina('eco');
    const V = '2026-10-09';
    await irADia(pg, V);
    ok('antes: El 33 mañana [victoria*, jenny(c)] y tarde [noe*, jenny(c), victoria]', j(await hoyCasilla(pg, V, 'EL33_M')) === j(['1.victoria*', '2.jenny(c)']) && j(await hoyCasilla(pg, V, 'EL33_T')) === j(['1.noe*', '2.jenny(c)', '3.victoria']), j([await hoyCasilla(pg, V, 'EL33_M'), await hoyCasilla(pg, V, 'EL33_T')]));
    await accionMenu(pg, V, 'EL33_M', 'victoria', 'cocina');
    ok('Victoria lleva la cocina y abre Jenny', j(await hoyCasilla(pg, V, 'EL33_M')) === j(['1.jenny*', '2.victoria(c)']), j(await hoyCasilla(pg, V, 'EL33_M')));
    ok('la tarde no cambia: sigue abriendo Noe y Jenny conserva la cocina (lo a mano no provoca retiradas)', j(await hoyCasilla(pg, V, 'EL33_T')) === j(['1.noe*', '2.jenny(c)', '3.victoria']), j(await hoyCasilla(pg, V, 'EL33_T')));
    const t1 = await toasts(pg), h1 = await historial(pg, 2);
    ok('sin rebote no hay toast de «Por la cocina de…» ni línea de más en el historial', !/Por la cocina/.test(t1) && h1[0] === 'Victoria lleva la cocina de El 33 mañana del 9/10' && !/^Por /.test(h1[1] || ''), j({ t1, h1 }));
    const rev = await pg.evaluate(V => revisionMes(S, S.staff, estadoDeIso(V), { desde: V, hasta: V }).map(x => x.turnoId + ': ' + x.msg), V);
    // (corrección de A7; revisión de cliente S3) la cocina del mismo local, con su franja: «… de El 33 por la tarde» (antes «… ese día»)
    ok('la Revisión avisa del cruce de Jenny (cocina por la tarde, sala por la mañana) para que decida el encargado', rev.some(x => /EL33_M.*Jenny: ya lleva la cocina de El 33 por la tarde/.test(x)), j(rev));
    await pg.evaluate(() => deshacer());
    // Noe entra en la mañana de El 33 (a la fuerza: partido no declarado): ya no puede abrir la tarde, y la app lo dice
    const r = await pg.evaluate(V => { pushUndo('poner a Noe'); return asignarUI(V, 'EL33_M', 'noe', { origen: 'manual', forzar: true, permitirPartido: true, puesto: 'sala', razon: 'prueba' }); }, V);
    await pg.evaluate(() => renderVistaActiva());
    ok('Noe entra en la mañana', r.ok, r.motivo);
    const tarde = await hoyCasilla(pg, V, 'EL33_T');
    ok('la tarde cambia por rebote: Noe ya no abre (viene de la mañana), abre Victoria', tarde[0] === '1.victoria*' && !tarde[0].includes('noe'), j(tarde));
    const t2 = await toasts(pg), h2 = await historial(pg, 3);
    ok('el toast lo dice en español llano: «Por poner a Noe…: en El 33 tarde abre Victoria (antes Noe)»', /Por poner a Noe en El 33 mañana: en El 33 tarde abre Victoria \(antes Noe\)/.test(t2), t2);
    ok('y queda en el historial, justo después de la línea de la acción', /^Por poner a Noe en El 33 mañana: en El 33 tarde abre Victoria \(antes Noe\)/.test(h2[0]) && /Noe → El 33 mañana/.test(h2[1]), j(h2));
    await pg.evaluate(() => deshacer());
    ok('Ctrl+Z: el día vuelve como estaba', j(await hoyCasilla(pg, V, 'EL33_T')) === j(['1.noe*', '2.jenny(c)', '3.victoria']), j(await hoyCasilla(pg, V, 'EL33_T')));
    // quitar con el × a quien abre la mañana de Pasarela cuando otra persona pasa a abrir la tarde por ello: también se dice
    const X = '2026-10-07';
    await irADia(pg, X);
    const antes = await pg.evaluate(X => ({ m: asignados(estadoDeIso(X), X, 'PASARELA_M').map(x => x.pid + (x.abre ? '*' : '')), t: asignados(estadoDeIso(X), X, 'PASARELA_T').map(x => x.pid + (x.abre ? '*' : '')) }), X);
    console.log('  · miércoles 7 Pasarela: ' + j(antes));
    await pg.context().close();
  });

  // ══ 3) «Quitar la marca de cocina»: la franja en el historial ══
  console.log('── 3) viernes 9/10, Zapatillera tarde: «Quitar la marca de cocina» a Adrián');
  await seccion('sin cocina', async () => {
    const pg = await pagina('nococina');
    const V = '2026-10-09';
    await irADia(pg, V);
    await accionMenu(pg, V, 'ZAPA_T', 'adrian', 'nococina');
    const l = await lecturas(pg, V, 'ZAPA_T'), h = await historial(pg, 1);
    ok('nadie lleva la cocina y queda como decisión (sinCocina)', !l.guardado.some(x => /\(c\)/.test(x)) && l.manual.sinCocina === true, j(l));
    ok('la línea del historial lleva la franja: «Adrián deja la cocina de Zapatillera tarde del 9/10»', h[0] === 'Adrián deja la cocina de Zapatillera tarde del 9/10', j(h));
    ok('la mañana de Zapatillera (Adrián de cocina) no pierde su cocina por esto', (await lecturas(pg, V, 'ZAPA_M')).guardado.includes('adrian(c)'), j(await lecturas(pg, V, 'ZAPA_M')));
    await pg.context().close();
  });

  // ══ 4) el perfil del empleado con una casilla cerrada a mano ══
  console.log('── 4) miércoles 7/10, Pasarela tarde cerrada a mano con Iván y Lavinia dentro: el perfil de Lavinia');
  await seccion('perfil', async () => {
    const pg = await pagina('perfil');
    const X = '2026-10-07';
    const antes = await pg.evaluate(X => { const e = estadoDeIso(X); return { m: pidsEn(e, X, 'PASARELA_M'), t: pidsEn(e, X, 'PASARELA_T') }; }, X);
    ok('Lavinia hace partido en Pasarela el miércoles 7', antes.m.includes('lavinia') && antes.t.includes('lavinia'), j(antes));
    await pg.evaluate(X => { const e = estadoDeIso(X, true); toggleApertura(e, X, 'PASARELA_T', S); saveState(); }, X);
    await pg.evaluate(() => { sessionStorage.setItem('shiftia_pas_pid', 'lavinia'); S.y = 2026; S.m = 10; cargarMes(); activarModoEmpleado(); });
    const fila = await pg.$$eval('#view-perfil .festrow', fs => fs.map(f => f.textContent.replace(/\s+/g, ' ').trim()).find(t => /Miércoles 7 de octubre/i.test(t)) || '');
    ok('el perfil lista solo la mañana ese día, con el turno entero (07:00–16:00)', /PAS mañana 07:00–16:00/.test(fila) && !/tarde/.test(fila), fila);
    const h = await pg.evaluate(() => { const x = horasPersonaMes(S, S.staff, S.meses, 'lavinia', 2026, 10); return { turnos: x.turnos, partidos: x.partidos }; });
    const n = await pg.$$eval('#view-perfil .festrow small .lpill', xs => xs.length);
    ok('los turnos que lista el perfil son los que cuenta Horas', n === h.turnos, j({ perfil: n, horas: h }));
    await pg.context().close();
  });
} finally {
  ok('sin errores de página', !errores.length, errores.join(' | '));
  await br.close(); srv.close();
}
resumen();
