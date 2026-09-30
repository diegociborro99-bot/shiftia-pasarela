// AUSENCIAS EN LA INTERFAZ TRAS LA FASE A2 DE LA AUDITORÍA (30/09), CON CLICS:
//  1) el Mes, al pulsar «Quitar la ausencia de este día» sobre un día de la baja sin fecha de fin de Laura, avisa de que se
//     quita solo ese día, y la baja sigue antes y después (antes no cambiaba nada, o borraba la baja entera) (A1/H8);
//  2) el selector «Cuándo» de la ausencia solo ofrece las franjas que la persona trabaja: Iván (solo tardes) tiene
//     «Día entero» y «Solo tarde», sin «Solo mañana»; Mari Luz (mañanas y tardes) tiene las dos (G7);
//  3) Entrevistas se pinta y se ordena por fecha con la fecha de hoy (el modelo ya no mira el reloj) (A5/G15);
//  4) la ficha y la tarjeta de Equipo dicen «libra además el viernes» cuando el cambio de día libre incluye el de siempre (A3).
//  Corrección tras las dos revisiones (30/09):
//  5) Mari Luz con permiso por la mañana y vacaciones por la tarde el 8/10: Hoy, el Mes (pastilla y hoja del día), la Cobertura
//     y el perfil enseñan las dos; en la hoja del día hay un botón por ausencia y se quita solo la elegida;
//  6) Lavinia (libra lunes, martes y jueves): ninguna de las cinco pantallas dice «lunes y martes y jueves»;
//  7) la Cobertura de Iván (solo tardes) no ofrece el botón «Mañana», y la franja marcada que no es suya se quita al cambiar;
//  8) la tarjeta de Equipo de quien tiene salida futura dice «se va el d/m»; la ficha dice «el 8/10» para un día; un alta idéntica
//     no repite el historial; una ausencia en una franja que no es suya se quita al cargar y queda en el historial;
//  9) el Generador: Lavinia esta semana trabaja el jueves y se queda sin turno → «sin plaza» en «Quién libra cada día» (y en la hoja).
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
const historial = (pg, n) => pg.evaluate(n => (S.historial || []).slice(0, n).map(h => h.txt), n);

try {
  // ══ 1) el Mes y la baja sin fecha de fin ══
  console.log('── 1) Mes de octubre: «Quitar la ausencia de este día» sobre el jueves 15 de la baja abierta de Laura');
  await seccion('baja abierta', async () => {
    const pg = await pagina('mes');
    const antes = await pg.evaluate(() => ({ aus: personaDeId('laura').ausencias, baja15: deBaja(personaDeId('laura'), '2026-10-15') }));
    ok('antes: Laura tiene una sola baja, desde el 1/9 y sin fecha de fin', antes.aus.length === 1 && antes.aus[0].tipo === 'BAJ' && antes.aus[0].desde === '2026-09-01' && !antes.aus[0].hasta && antes.baja15, j(antes));
    await pg.evaluate(() => { S.y = 2026; S.m = 10; cargarMes(); switchTab('mes'); });
    ok('el Mes de octubre enseña su casilla del 15', await llega(pg, () => !!document.querySelector('#mesRoot [data-asig="laura|2026-10-15"]'), null, 5000) >= 0);
    await pg.click('#mesRoot [data-asig="laura|2026-10-15"]');
    ok('se abre su hoja del día con «Quitar la ausencia de este día»', await llega(pg, () => !!document.querySelector('#diaPersPop [data-dp="quitaraus"]'), null, 3000) >= 0);
    await pg.click('#diaPersPop [data-dp="quitaraus"]');
    await espera(300);
    const d = pg.dialogos.find(m => /sin fecha de fin/.test(m)) || '';
    ok('avisa: «Laura está de baja desde el 1/9 sin fecha de fin: se quita solo el 15/10…»', /^Laura está de baja desde el 1\/9 sin fecha de fin: se quita solo el 15\/10 y sigue de baja antes y después/.test(d), j(pg.dialogos));
    const despues = await pg.evaluate(() => { const p = personaDeId('laura'); return { aus: p.ausencias, b14: deBaja(p, '2026-10-14'), b15: deBaja(p, '2026-10-15'), b16: deBaja(p, '2026-10-16'), b2027: deBaja(p, '2027-03-01') }; });
    ok('la baja queda partida: hasta el 14/10 y, abierta, desde el 16/10', despues.aus.length === 2 && despues.aus[0].hasta === '2026-10-14' && despues.aus[1].desde === '2026-10-16' && !despues.aus[1].hasta, j(despues.aus));
    ok('el 15 ya no está de baja; el 14, el 16 y en marzo de 2027, sí', despues.b14 && !despues.b15 && despues.b16 && despues.b2027, j(despues));
    const h = await historial(pg, 1);
    ok('el historial dice que se quitó solo ese día', /^Ausencia retirada: Laura el 15\/10 \(solo ese día: sigue de baja desde el 1\/9 sin fecha de fin\)/.test(h[0]), j(h));
    const celda = await pg.$eval('#mesRoot [data-asig="laura|2026-10-15"]', x => x.textContent.trim()).catch(() => '?');
    ok('la casilla del 15 en el Mes ya no lleva la pastilla de baja', !/BAJ/.test(celda), celda);
    await pg.evaluate(() => deshacer());
    const undo = await pg.evaluate(() => personaDeId('laura').ausencias);
    ok('Ctrl+Z: la baja vuelve entera', undo.length === 1 && undo[0].desde === '2026-09-01' && !undo[0].hasta, j(undo));
    await pg.context().close();
  });

  // ══ 2) el selector «Cuándo» ══
  console.log('── 2) Equipo: «Cuándo» de la ausencia de Iván (solo tardes) y de Mari Luz (mañanas y tardes)');
  await seccion('franjas', async () => {
    const pg = await pagina('equipo');
    await pg.evaluate(() => switchTab('equipo'));
    ok('Equipo pintado', await llega(pg, () => !!document.querySelector('#equipoRoot [data-pcard="ivan"] select[data-f="franja"]'), null, 5000) >= 0);
    const opciones = pid => pg.$$eval(`#equipoRoot [data-pcard="${pid}"] select[data-f="franja"] option`, os => os.map(o => o.textContent.trim()));
    ok('Iván (solo tardes): «Día entero» y «Solo tarde», sin «Solo mañana»', j(await opciones('ivan')) === j(['Día entero', 'Solo tarde']), j(await opciones('ivan')));
    ok('Mari Luz (mañanas y tardes): «Día entero», «Solo mañana» y «Solo tarde»', j(await opciones('mariluz')) === j(['Día entero', 'Solo mañana', 'Solo tarde']), j(await opciones('mariluz')));
    // la ficha de Iván, lo mismo
    await pg.evaluate(() => openFicha('ivan'));
    ok('la ficha de Iván también', await llega(pg, () => !!document.querySelector('#fichaOvl #fAusFr'), null, 3000) >= 0 && j(await pg.$$eval('#fichaOvl #fAusFr option', os => os.map(o => o.textContent.trim()))) === j(['Día entero', 'Solo tarde']), j(await pg.$$eval('#fichaOvl #fAusFr option', os => os.map(o => o.textContent.trim())).catch(() => '?')));
    await pg.context().close();
  });

  // ══ 3) Entrevistas con la fecha de hoy ══
  console.log('── 3) Entrevistas: la lista se pinta y se ordena por fecha');
  await seccion('entrevistas', async () => {
    const pg = await pagina('entrevistas');
    await pg.evaluate(() => switchTab('entrevistas'));
    ok('la lista se pinta', await llega(pg, () => document.querySelectorAll('#entrevistasRoot .entrow').length > 50, null, 6000) >= 0, await pg.$$eval('#entrevistasRoot .entrow', x => x.length).catch(() => '?'));
    await pg.click('#entrevistasRoot [data-entord="fecha"]');
    await espera(300);
    const fecha = await pg.$eval('#entrevistasRoot .entrow small', e => e.textContent).catch(() => '');
    ok('ordenada por fecha, la primera fila lleva su fecha («14 sep 2026»)', /^\d{1,2} [a-z]{3} 20\d\d/.test(fecha), fecha);
    ok('la fecha se lee con la de hoy: «14 de Septiembre» sin año es del 2026', await pg.evaluate(() => fechaCandidato({ fecha: '14 de Septiembre' }, isoHoy())) === '2026-09-14');
    await pg.context().close();
  });

  // ══ 4) los textos del cambio de día libre que incluye el de siempre ══
  console.log('── 4) Mari Luz libra miércoles y, esta semana, también el viernes: la ficha y la tarjeta');
  await seccion('textos', async () => {
    const pg = await pagina('textos');
    await pg.evaluate(() => openFicha('mariluz'));
    ok('la ficha se abre', await llega(pg, () => !!document.querySelector('#fichaOvl .lpsemlbl'), null, 3000) >= 0);
    const lunes = await pg.$eval('#fichaOvl .lpsemlbl', x => x.dataset.lunes);
    const cerrarFicha = async () => { await pg.click('#fichaOvl [data-ovx]'); await llega(pg, () => !document.getElementById('fichaOvl'), null, 3000); };
    await cerrarFicha();
    await pg.evaluate(l => { personaDeId('mariluz').libraPuntual = [{ semana: l, dias: [3, 5] }]; saveState(); renderVistaActiva(); openFicha('mariluz'); }, lunes);
    await llega(pg, () => !!document.querySelector('#fichaOvl .lpuntpie'), null, 3000);
    const pie = await pg.$eval('#fichaOvl .lpuntpie', x => x.textContent.replace(/\s+/g, ' ').trim()).catch(() => '?');
    ok('el pie de la ficha: «La semana del … libra además el viernes.»', /^La semana del \d\d\/\d\d libra además el viernes\./.test(pie), pie);
    await cerrarFicha();
    await pg.evaluate(() => switchTab('equipo'));
    await llega(pg, () => !!document.querySelector('#equipoRoot [data-pcard="mariluz"]'), null, 4000);
    const chips = await pg.$$eval('#equipoRoot [data-pcard="mariluz"] .tchip', xs => xs.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
    ok('la tarjeta de Equipo: «Semana del …: libra además el viernes»', chips.some(t => /Semana del \d\d\/\d\d: libra además el viernes/.test(t)), j(chips));
    const dia = await pg.evaluate(l => ({ mie: estadoDia(S, personaDeId('mariluz'), addDias(l, 2)).texto, vie: estadoDia(S, personaDeId('mariluz'), addDias(l, 4)).texto }), lunes);
    ok('el miércoles «libra los miércoles» y el viernes «esta semana libra además el viernes»', dia.mie === 'libra los miércoles' && dia.vie === 'esta semana libra además el viernes', j(dia));
    await pg.context().close();
  });
  // ══ 5) dos ausencias el mismo día: Mari Luz, permiso por la mañana y vacaciones por la tarde el jueves 8/10 ══
  console.log('── 5) Mari Luz: permiso por la mañana + vacaciones por la tarde el 8/10 en Hoy, el Mes, la Cobertura y el perfil; quitar solo una');
  await seccion('dos ausencias', async () => {
    const pg = await pagina('dos');
    await pg.evaluate(() => { const p = personaDeId('mariluz'); anadirAusencia(p, { tipo: 'PERM', desde: '2026-10-08', franjas: ['M'], detalle: 'médico' }); anadirAusencia(p, { tipo: 'VAC', desde: '2026-10-08', franjas: ['T'] }); const e = estadoDeIso('2026-10-08', true); for (const t of turnosDe(S)) desasignar(e, '2026-10-08', t.id, 'mariluz'); saveState(); irAIso('2026-10-08'); });
    ok('Hoy 8/10 · «Ausentes hoy» enseña las dos: «Permiso por la mañana · Vacaciones por la tarde (día entero)»', await llega(pg, () => { const c = [...document.querySelectorAll('#diaSide .scard')].find(c => /Ausentes hoy/.test(c.textContent)); return !!c && /Mari Luz\s*Permiso por la mañana · Vacaciones por la tarde \(día entero\)/.test(c.textContent.replace(/\s+/g, ' ')); }, null, 4000) >= 0, await pg.evaluate(() => { const c = [...document.querySelectorAll('#diaSide .scard')].find(c => /Ausentes hoy/.test(c.textContent)); return c ? c.textContent.replace(/\s+/g, ' ').trim() : '?'; }));
    await pg.evaluate(() => { S.y = 2026; S.m = 10; cargarMes(); switchTab('mes'); });
    await llega(pg, () => !!document.querySelector('#mesRoot [data-asig="mariluz|2026-10-08"]'), null, 5000);
    const pill = await pg.$eval('#mesRoot [data-asig="mariluz|2026-10-08"]', x => ({ t: x.textContent.trim(), tip: (x.querySelector('.pill') || { dataset: {} }).dataset.tipstr || '' }));
    ok('el Mes 8/10: la pastilla «PERM+VAC» y el tooltip con las dos y el detalle', pill.t === 'PERM+VAC' && /^Permiso por la mañana · Vacaciones por la tarde \(día entero\) · médico$/.test(pill.tip), j(pill));
    await pg.$eval('#mesRoot [data-asig="mariluz|2026-10-08"]', x => x.scrollIntoView({ block: 'center', inline: 'center' }));
    await pg.click('#mesRoot [data-asig="mariluz|2026-10-08"]');
    ok('la hoja del día se abre con las dos en la cabecera', await llega(pg, () => !!document.querySelector('#diaPersPop') && /Permiso por la mañana · Vacaciones por la tarde \(día entero\)/.test(document.querySelector('#diaPersPop .pd').textContent), null, 3000) >= 0, await pg.$eval('#diaPersPop .pd', x => x.textContent).catch(() => '?'));
    const botones = await pg.$$eval('#diaPersPop [data-dp="quitaraus"]', bs => bs.map(b => b.textContent.trim()));
    ok('y un botón por ausencia: «Quitar el permiso de la mañana» y «Quitar las vacaciones de la tarde»', j(botones) === j(['Quitar el permiso de la mañana', 'Quitar las vacaciones de la tarde']), j(botones));
    const n0 = pg.dialogos.length;
    await (await pg.$$('#diaPersPop [data-dp="quitaraus"]'))[1].click();
    await espera(300);
    const tras = await pg.evaluate(() => personaDeId('mariluz').ausencias.map(a => a.tipo + ':' + a.desde + ':' + (a.franjas || 'dia')));
    ok('«Quitar las vacaciones de la tarde» quita solo esas: el permiso de la mañana sigue', j(tras) === j(['PERM:2026-10-08:M']) && pg.dialogos.length === n0, j(tras));
    const h = await historial(pg, 1);
    ok('el historial dice cuál: «Ausencia retirada: Mari Luz el 8/10 · Vacaciones por la tarde»', /^Ausencia retirada: Mari Luz el 8\/10 · Vacaciones por la tarde$/.test(h[0]), j(h));
    await pg.evaluate(() => deshacer());
    ok('Ctrl+Z devuelve las dos', (await pg.evaluate(() => personaDeId('mariluz').ausencias.length)) === 2);
    // la Cobertura: la celda del 8/10 sin «½» (entre las dos no queda turno) y con las dos
    await pg.evaluate(() => { switchTab('cobertura'); COB.pid = 'mariluz'; COB.base = '2026-10-05'; COB.dias = []; renderCobertura(); });
    ok('la Cobertura, celda del 8/10: «Permiso · Vacaciones», sin «½»', await llega(pg, () => { const c = document.querySelector('#cobRoot [data-dia="2026-10-08"] .cobdots'); return !!c && c.textContent.trim() === 'Permiso · Vacaciones'; }, null, 4000) >= 0, await pg.$eval('#cobRoot [data-dia="2026-10-08"] .cobdots', x => x.textContent.trim()).catch(() => '?'));
    // el perfil del empleado (Mari Luz)
    await pg.evaluate(() => { try { sessionStorage.setItem('shiftia_pas_pid', 'mariluz'); } catch (e) {} S.y = 2026; S.m = 10; cargarMes(); activarModoEmpleado(); });
    ok('el perfil de Mari Luz, 8/10: «Permiso por la mañana · Vacaciones por la tarde (día entero) · médico»', await llega(pg, () => /jueves 8 de octubre[^]*?Permiso por la mañana · Vacaciones por la tarde \(día entero\) · médico/i.test(document.querySelector('#view-perfil').textContent), null, 4000) >= 0, (await pg.$eval('#view-perfil', x => x.textContent.replace(/\s+/g, ' ')).catch(() => '?')).slice(0, 600));
    await pg.context().close();
  });

  // ══ 6) Lavinia, libra lunes, martes y jueves: las cinco pantallas sin «y … y» ══
  console.log('── 6) Lavinia (libra lunes, martes y jueves): la ficha (pie y aviso), la Cobertura, el perfil y el Generador sin «y … y»');
  await seccion('y … y', async () => {
    const pg = await pagina('yy');
    const yy = s => /\by\b[^.():]*\by\b/.test(s || '');
    const lunes = await pg.evaluate(() => lunesDe(addDias(isoHoy(), 7)));
    await pg.evaluate(() => openFicha('lavinia'));
    ok('el pie de la ficha sin cambio: «libra lunes, martes y jueves.»', await llega(pg, () => /Sin cambios en la semana del \d\d\/\d\d: libra lunes, martes y jueves\./.test((document.querySelector('#fichaOvl .lpuntpie') || {}).textContent || ''), null, 3000) >= 0, await pg.$eval('#fichaOvl .lpuntpie', x => x.textContent.trim()).catch(() => '?'));
    await pg.click('#fichaOvl [data-ovx]'); await llega(pg, () => !document.getElementById('fichaOvl'), null, 3000);
    await pg.evaluate(l => cambiarDiaLibreUI('lavinia', l, [1, 2, 4]), lunes);
    const toastTxt = await pg.evaluate(() => { const ts = [...document.querySelectorAll('.toast, #toast, [class*="toast"]')].filter(x => x.offsetParent); return ts.length ? ts[ts.length - 1].textContent.replace(/\s+/g, ' ').trim() : ''; });
    ok('el aviso al marcar sus días de siempre: «Lavinia ya libra lunes, martes y jueves de siempre»', /Lavinia ya libra lunes, martes y jueves de siempre/.test(toastTxt), toastTxt);
    await pg.evaluate(() => { switchTab('cobertura'); COB.pid = 'lavinia'; COB.dias = []; renderCobertura(); });
    await llega(pg, () => !!document.querySelector('#cobRoot .cobwho'), null, 4000);
    const cob = await pg.$eval('#cobRoot .cobwho small', x => x.textContent.replace(/\s+/g, ' ').trim()).catch(() => '?');
    ok('la cabecera de la Cobertura: «libra lunes, martes y jueves»', /libra lunes, martes y jueves/.test(cob) && !yy(cob), cob);
    await pg.evaluate(l => { switchTab('generador'); GEN.modo = 'semana'; GEN.lunes = l; GEN.previa = null; renderGenerador(); openLibraSemana(l, { pid: 'lavinia' }); }, lunes);
    const gen = await pg.$eval('#libraSemOvl #lsDias', x => x.textContent.replace(/\s+/g, ' ').trim()).catch(() => '?');
    ok('el Generador · «Cambiar el día libre»: «(de siempre: lunes, martes y jueves)»', /de siempre: lunes, martes y jueves/.test(gen) && !yy(gen), gen);
    await pg.evaluate(() => { const o = document.getElementById('libraSemOvl'); if (o) o.remove(); });
    await pg.evaluate(() => { try { sessionStorage.setItem('shiftia_pas_pid', 'lavinia'); } catch (e) {} activarModoEmpleado(); });
    const sub = await pg.$eval('#view-perfil .sub', x => x.textContent.replace(/\s+/g, ' ').trim()).catch(() => '?');
    ok('el perfil de Lavinia: «libra lunes, martes y jueves»', /libra lunes, martes y jueves/.test(sub) && !yy(sub), sub);
    await pg.context().close();
  });

  // ══ 7) la Cobertura de Iván sin «Mañana» ══
  console.log('── 7) Cobertura: a Iván (solo tardes) se le ofrece «Todos» y «Tarde», sin «Mañana»; la franja marcada que no es suya se quita al cambiar');
  await seccion('franjas cobertura', async () => {
    const pg = await pagina('cob');
    await pg.evaluate(() => { switchTab('cobertura'); COB.pid = 'mariluz'; COB.dias = []; COB.franjas = ['M']; renderCobertura(); });
    await llega(pg, () => !!document.querySelector('#cobRoot [data-fr]'), null, 4000);
    const ml = await pg.$$eval('#cobRoot [data-fr]', bs => bs.map(b => b.dataset.fr + ':' + b.textContent.trim() + (b.classList.contains('on') ? '*' : '')));
    ok('Mari Luz: «Todos», «Mañana» (marcada) y «Tarde»', j(ml) === j([':Todos', 'M:Mañana*', 'T:Tarde']), j(ml));
    await pg.click('#cobRoot .cobpk[data-pk="ivan"]');
    await llega(pg, () => COB.pid === 'ivan' && !!document.querySelector('#cobRoot [data-fr]'), null, 4000);
    const iv = await pg.$$eval('#cobRoot [data-fr]', bs => bs.map(b => b.dataset.fr + ':' + b.textContent.trim() + (b.classList.contains('on') ? '*' : '')));
    ok('Iván: «Todos» (marcado) y «Tarde», sin «Mañana»; la «Mañana» marcada con Mari Luz se ha quitado', j(iv) === j([':Todos*', 'T:Tarde']) && j(await pg.evaluate(() => COB.franjas)) === '[]', j(iv));
    await pg.context().close();
  });

  // ══ 8) la tarjeta con salida futura, «el 8/10», el alta repetida y la ausencia en una franja que no es suya al cargar ══
  console.log('── 8) Equipo: «se va el 5/10» en la tarjeta; la ficha «el 8/10»; el alta idéntica no repite el historial; la VAC «solo mañana» de Iván se quita al cargar');
  await seccion('equipo', async () => {
    const pg = await pagina('equipo');
    await pg.evaluate(() => { personaDeId('adrian').salida = { desde: '2026-10-05' }; personaDeId('mariluz').ausencias = [{ tipo: 'PERM', desde: '2026-10-08', hasta: '2026-10-08', franjas: ['M'] }]; saveState(); switchTab('equipo'); });
    ok('la tarjeta de Adrián (salida el 5/10, hoy 24/9) dice «se va el 5/10»', await llega(pg, () => { const c = document.querySelector('#equipoRoot [data-pcard="adrian"] .pchead small'); return !!c && /se va el 5\/10/.test(c.textContent); }, null, 4000) >= 0, await pg.$eval('#equipoRoot [data-pcard="adrian"] .pchead small', x => x.textContent).catch(() => '?'));
    await pg.evaluate(() => openFicha('mariluz'));
    ok('la ficha de Mari Luz: «Permiso el 8/10 por la mañana»', await llega(pg, () => [...document.querySelectorAll('#fichaOvl [data-rmaus]')].some(x => /Permiso el 8\/10 por la mañana/.test(x.closest('.festrow, div').textContent)), null, 3000) >= 0, await pg.$$eval('#fichaOvl [data-rmaus]', xs => xs.map(x => x.closest('.festrow, div').textContent.replace(/\s+/g, ' ').trim())).catch(() => '?'));
    await pg.click('#fichaOvl [data-ovx]'); await llega(pg, () => !document.getElementById('fichaOvl'), null, 3000);
    // el alta idéntica dos veces (Lola, VAC 22/10): una línea del historial y el aviso de que ya estaba
    const alta = async () => { await pg.evaluate(() => altaAusenciaUI('lola', { tipo: 'VAC', desde: '2026-10-22', hasta: '2026-10-22' }, () => renderVistaActiva())); await espera(300); if (await pg.$('#ausOvl')) { await pg.click('#ausOvl [data-ausok="guardar"]'); await llega(pg, () => !document.querySelector('#ausOvl'), null, 3000); } await espera(200); };
    const n0 = await pg.evaluate(() => S.historial.length);
    await alta(); await alta();
    const lineas = await pg.evaluate(n0 => S.historial.slice(0, S.historial.length - n0).map(h => h.txt).filter(t => /Lola/.test(t)), n0);
    ok('Lola: dos altas idénticas → una sola línea en el historial', lineas.length === 1 && /^Vacaciones: Lola el 22\/10/.test(lineas[0]), j(lineas));
    const t = await pg.evaluate(() => { const ts = [...document.querySelectorAll('.toast, #toast, [class*="toast"]')].filter(x => x.offsetParent); return ts.length ? ts[ts.length - 1].textContent.replace(/\s+/g, ' ').trim() : ''; });
    ok('y el aviso: «Lola ya tenía apuntada esa ausencia: no hay nada que cambiar»', /Lola ya tenía apuntada esa ausencia/.test(t), t);
    ok('sigue una sola ausencia', (await pg.evaluate(() => personaDeId('lola').ausencias.length)) === 1);
    // dato viejo: la VAC «solo mañana» de Iván (solo tardes) se quita al cargar y queda en el historial
    await pg.evaluate(() => { personaDeId('ivan').ausencias.push({ tipo: 'VAC', desde: '2026-10-20', hasta: '2026-10-20', franjas: ['M'] }); migrarEstado(S); });
    const iv = await pg.evaluate(() => ({ aus: personaDeId('ivan').ausencias.filter(a => a.desde === '2026-10-20'), h: S.historial.slice(0, 3).map(h => h.txt) }));
    ok('al cargar, la VAC «solo mañana» de Iván desaparece', iv.aus.length === 0, j(iv.aus));
    ok('y el historial lo cuenta: «Ausencia quitada al cargar: Iván, Vacaciones por la mañana el 20/10: no hace mañanas…»', iv.h.some(t => /^Ausencia quitada al cargar: Iván, Vacaciones por la mañana el 20\/10: no hace mañanas, así que no contaba para nada$/.test(t)), j(iv.h));
    await pg.context().close();
  });

  // ══ 9) «sin plaza» en «Quién libra cada día» ══
  console.log('── 9) Generador, semana del 5/10: Lavinia esta semana trabaja el jueves y se queda sin turno → «sin plaza», no «libra»');
  await seccion('sin plaza', async () => {
    const pg = await pagina('gen');
    const L = '2026-10-05', jue = '2026-10-08';
    await pg.evaluate(L => { personaDeId('lavinia').libraPuntual = [{ semana: L, dias: [1, 2] }]; saveState(); switchTab('generador'); GEN.modo = 'semana'; GEN.lunes = L; GEN.previa = null; renderGenerador(); }, L);
    await llega(pg, L => GEN.lunes === L && !!document.getElementById('genPrevia'), L, 4000);
    await pg.click('#genPrevia');
    ok('la semana se genera', await llega(pg, () => !!(GEN.previa && GEN.previa.semana), null, 25000) >= 0);
    const r = await pg.evaluate(jue => { const s = GEN.previa; const trabaja = turnosDe(S).some(t => pidsEn(s.estado, jue, t.id).includes('lavinia')); return { trabaja, libran: s.libran[jue], sinPlaza: s.sinPlaza && s.sinPlaza[jue] }; }, jue);
    if (r.trabaja) ok('(Lavinia tiene turno el jueves: nada que distinguir)', true);
    else {
      ok('el jueves Lavinia no está en «libran» y sí en «sinPlaza»', !r.libran.includes('lavinia') && (r.sinPlaza || []).includes('lavinia'), j(r));
      const chip = await pg.evaluate(() => { const c = [...document.querySelectorAll('#genRes .glib .glchip.gsinplaza')].find(x => /Lavinia/.test(x.textContent)); return c ? c.textContent.replace(/\s+/g, ' ').trim() : null; });
      ok('la tabla «Quién libra cada día» la enseña como «Lavinia · sin plaza»', chip === 'Lavinia · sin plaza', chip);
      await pg.click('#gsPrint');
      const imp = await llega(pg, () => !!document.querySelector('.pxg-lib td[data-libran]'), null, 6000);
      const celda = imp >= 0 ? await pg.$eval(`.pxg-lib td[data-libran="${jue}"]`, x => x.textContent.replace(/\s+/g, ' ').trim()).catch(() => '?') : '(no se abrió la hoja)';
      ok('y la hoja impresa también: «Lavinia · sin plaza»', /Lavinia · sin plaza/.test(celda), celda);
      await pg.evaluate(() => { if (typeof cerrarImpresion === 'function') cerrarImpresion(); });
    }
    const avisos = await pg.evaluate(() => (GEN.previa.avisos || []).map(a => a.texto));
    ok('el aviso del Generador: «Lavinia esta semana trabaja el jueves: no se sabe qué turno hace a cambio…»', avisos.some(t => /^Lavinia esta semana trabaja el jueves: no se sabe qué turno hace a cambio/.test(t)), j(avisos));
    await pg.context().close();
  });
} finally {
  ok('sin errores de página', !errores.length, errores.join(' | '));
  await br.close(); srv.close();
}
resumen();
