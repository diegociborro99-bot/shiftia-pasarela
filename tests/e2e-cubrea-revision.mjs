// «CUBRE A» Y LA COBERTURA: LO QUE ENCONTRARON LOS DOS REVISORES DE LA FASE 3 (24/09), CON CLICS.
// Los caminos que la interfaz usa de verdad y fallaban sin avisar, uno por sección:
//  1) Generador → Periodo: el volcado deja el relevo con su marca y, al volver Iván, Mari Luz no
//     pierde su plaza (antes el generador se la retiraba: «ya no hay que cubrir su sitio»).
//  2) Cobertura → cambio de turno: el turno a cambio se hace al confirmar (antes se perdía).
//  3) Selector: la ★ de quien «cubre a» se puede poner (con su «por») y «forzar» guarda la regla de
//     cocina; un clic que no se puede poner no deja un paso vacío en Ctrl+Z.
//  4) Generador → Semana: si lo único nuevo es el relevo, se puede volcar.
//  5) Cobertura: abrir y cerrar una ficha sin tocar nada no deja el plan «viejo».
//  6) Revisión: el partido autorizado va en su grupo («Autorizado · para que lo sepas»), una línea
//     por persona y día; y los textos de lo aplicado, del historial y de la vista previa.
//  7) Media jornada: la tarjeta de Equipo, la Semana, Hoy, el perfil del empleado y la hoja impresa
//     dicen «por la mañana»; la hoja no deja fuera de la tarde a quien solo falta por la mañana.
// El reloj de la página se fija en el jueves 24/09/2026 (el día de la reunión).
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

async function pagina(etiqueta, opts) {
  const o = opts || {};
  const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.clock.setFixedTime(new Date('2026-09-24T10:00:00+02:00'));
  await ctx.addInitScript(() => { try { sessionStorage.setItem('shiftia_pas_sesion', '1'); sessionStorage.setItem('shiftia_pas_rol', 'admin'); } catch (e) {} });
  const pg = await ctx.newPage();
  pg.on('pageerror', e => errores.push(`${etiqueta}: ${e.message}`));
  pg.on('dialog', d => { if (o.dialogos) o.dialogos.push(d.message()); d.accept().catch(() => {}); });
  await pg.route(/googleapis|gstatic|cdnjs/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await pg.goto(BASE + '/index.html?demo=1');
  await pg.waitForSelector('#view-hoy .loccard', { timeout: 15000 });
  return pg;
}
const clic = (pg, sel) => pg.click(sel, { timeout: 3000 }).then(() => true, () => false);
const vista = async (pg, v) => { await pg.click(`.tab[data-v="${v}"]`); return llega(pg, v => { const s = document.getElementById('view-' + v); return !!s && !s.classList.contains('hidden'); }, v, 4000); };
const casilla = (pg, iso, tid) => pg.evaluate(([iso, tid]) => asignados(estadoDeIso(iso), iso, tid).map(e => ({ pid: e.pid, por: e.por || null, relevo: !!e.relevo, origen: e.origen, razon: e.razon || '', abre: !!e.abre, forzado: !!e.forzado })), [iso, tid]);
// Mari Luz «Cubre a» Iván (lo que hizo el cliente en su ficha) y, si hace falta, Dulce fuera de standby
const preparar = (pg, o) => pg.evaluate(o => {
  personaDeId('mariluz').cubreA = [{ pid: 'ivan' }];
  if (o && o.dulce) delete personaDeId('dulce').standby;
  if (o && o.partido) personaDeId('mariluz').partido = { dias: o.partido };
  saveState();
}, o || {});

// cada sección con su página: si una se rompe, las demás siguen
async function seccion(nombre, fn) {
  try { await fn(); } catch (e) { ok(`${nombre}: la sección no se interrumpe`, false, e && e.stack ? e.stack.split('\n').slice(0, 4).join(' | ') : e); }
}
try {
  // ══ 1) Generador → Periodo: el relevo se vuelca como relevo ══
  console.log('── 1) Generador → Periodo con la VAC de Iván en su ficha y octubre sin volcar');
  await seccion('periodo', async () => {
    const pg = await pagina('periodo');
    await preparar(pg);
    // octubre vacío (sin volcar) y las vacaciones de Iván apuntadas en su ficha
    await pg.evaluate(() => {
      const e = estadoDeIso('2026-10-01', true);
      vaciarPlanilla(e, '2026-10-01', '2026-10-31');
      anadirAusencia(personaDeId('ivan'), { tipo: 'VAC', desde: '2026-10-02', hasta: '2026-10-04' });
      saveState();
    });
    const genera = async () => {
      await vista(pg, 'generador');
      await clic(pg, '#genRoot [data-modo="periodo"]');
      await pg.fill('#genRoot #genD1', '2026-10-01'); await pg.dispatchEvent('#genRoot #genD1', 'change');
      await pg.fill('#genRoot #genD2', '2026-10-31'); await pg.dispatchEvent('#genRoot #genD2', 'change');
      await clic(pg, '#genRoot #genPrevia');
      return llega(pg, () => !!GEN.previa && !!document.querySelector('#genRes #genAplicar'), null, 20000);
    };
    ok('sale la vista previa del periodo', await genera() >= 0);
    await clic(pg, '#genRes #genAplicar');
    await llega(pg, () => !GEN.previa, null, 8000);
    for (const iso of [VIE, SAB]) {
      const ml = (await casilla(pg, iso, 'PASARELA_T')).find(x => x.pid === 'mariluz');
      ok(`${iso.slice(8)}: Mari Luz queda en la planilla como relevo «por Iván» (con su marca)`, !!ml && ml.por === 'ivan' && ml.relevo, JSON.stringify(ml));
      ok(`${iso.slice(8)}: y abre la tarde`, !!ml && ml.abre, JSON.stringify(ml));
    }
    // Iván vuelve: se le quitan las vacaciones y se regenera el periodo
    await pg.evaluate(() => { personaDeId('ivan').ausencias = []; saveState(); });
    ok('regenerado con Iván de vuelta', await genera() >= 0);
    ok('la vista previa no retira a Mari Luz («ya no hay que cubrir su sitio»)', await pg.evaluate(() => !(GEN.previa.retirados || []).some(x => x.pid === 'mariluz')), await pg.evaluate(() => JSON.stringify((GEN.previa.retirados || []).filter(x => x.pid === 'mariluz'))));
    if (await pg.$eval('#genRes #genAplicar', b => !b.disabled).catch(() => false)) { await clic(pg, '#genRes #genAplicar'); await llega(pg, () => !GEN.previa, null, 8000); }
    const ml2 = (await casilla(pg, VIE, 'PASARELA_T')).find(x => x.pid === 'mariluz');
    ok('y su plaza sigue, ya sin «por Iván» y como plaza fija de la semana tipo', !!ml2 && !ml2.por && ml2.origen === 'patron' && /plaza fija/.test(ml2.razon), JSON.stringify(ml2));
    await pg.context().close();
  });

  // ══ 2) Cobertura → cambio de turno: el turno a cambio se hace ══
  console.log('── 2) Cobertura → Susana Luna → Cambio de turno el martes 6/10: el turno a cambio se aplica');
  await seccion('cambio', async () => {
    const pg = await pagina('cambio');
    await pg.evaluate(() => {
      for (const iso of rangoIso('2026-09-28', '2026-10-18')) { const e = estadoDeIso(iso, true); delete e.asig[iso]; if (e.manual) delete e.manual[iso]; }
      for (const [d, t, id, c] of [['2026-10-06', 'ZAPA_T', 'sluna'], ['2026-10-06', 'ZAPA_T', 'adrian', 1], ['2026-10-10', 'ZAPA_T', 'roberto'], ['2026-10-10', 'ZAPA_T', 'adrian', 1]]) asignar(estadoDeIso(d, true), S, S.staff, d, t, id, { cocina: !!c });
      saveState();
    });
    await vista(pg, 'cobertura');
    await clic(pg, '#cobRoot .cobpk[data-pk="sluna"]');
    await clic(pg, '#cobRoot [data-tipo="CAMBIO"]');
    await clic(pg, '#cobRoot [data-cobnav="7"]');
    await clic(pg, '#cobRoot .cobdia[data-dia="2026-10-06"]');
    ok('el día marcado es el martes 6', await pg.evaluate(() => JSON.stringify(COB.dias) === '["2026-10-06"]'), await pg.evaluate(() => JSON.stringify(COB.dias)));
    await clic(pg, '#cobRoot #cobProponer');
    ok('sale la propuesta', await llega(pg, () => !!document.querySelector('#cobRes .cobplan.reco'), null, 8000) >= 0);
    ok('el plan A propone el turno a cambio (⇄ el sábado 10 en Zapatillera)', await pg.evaluate(() => { const P = document.querySelector('#cobRes .cobplan.reco'); return !!P && /a cambio/.test(P.textContent); }));
    await clic(pg, '#cobRes .cobplan.reco [data-aplicar="A"]');
    await llega(pg, () => !!document.querySelector('#previaCobOvl #pvOk'), null, 4000);
    await clic(pg, '#previaCobOvl #pvOk');
    await llega(pg, () => !!document.querySelector('#cobRes .cobok'), null, 5000);
    const r = await pg.evaluate(() => COB.aplicado && COB.aplicado.res);
    ok('al confirmar, el intercambio se hace (no se pierde)', !!r && r.intercambios.length === 1 && !r.rechazados.length, JSON.stringify(r && { intercambios: r.intercambios, rechazados: r.rechazados }));
    const sab = (await casilla(pg, '2026-10-10', 'ZAPA_T')).map(x => x.pid).sort();
    ok('el sábado 10 hace Susana Luna la tarde de Zapatillera, en vez de Roberto', JSON.stringify(sab) === '["adrian","sluna"]', JSON.stringify(sab));
    await pg.context().close();
  });

  // ══ 3) Selector: la ★ de «cubre a» y «forzar» con la regla de cocina ══
  console.log('── 3) Selector: Mari Luz ★ para cubrir a Iván (sin partido declarado el viernes) y forzar a Hojan en la sala');
  await seccion('selector', async () => {
    const pg = await pagina('selector');
    await preparar(pg, { partido: [2, 4] });
    await pg.evaluate(v => {
      anadirAusencia(personaDeId('ivan'), { tipo: 'VAC', desde: v, hasta: v });
      const e = estadoDeIso(v, true);
      desasignar(e, v, 'PASARELA_T', 'ivan'); desasignar(e, v, 'PASARELA_T', 'mariluz');
      if (!pidsEn(e, v, 'PASARELA_M').includes('mariluz')) asignar(e, S, S.staff, v, 'PASARELA_M', 'mariluz', {});
      saveState(); renderVistaActiva();
      openPicker(v, 'PASARELA_T', document.body);
    }, VIE);
    await llega(pg, () => !!document.querySelector('#pickerPop .prowp.rec'), null, 4000);
    ok('la ★ recomendada es Mari Luz, que cubre a Iván', await pg.evaluate(() => (document.querySelector('#pickerPop .prowp.rec') || {}).dataset.pickpid === 'mariluz'));
    const undo0 = await pg.evaluate(() => undoStack.length);
    await clic(pg, '#pickerPop .prowp.rec');
    const ml = (await casilla(pg, VIE, 'PASARELA_T')).find(x => x.pid === 'mariluz');
    ok('al pulsarla entra (su partido está autorizado para cubrir a Iván) y lleva «por Iván»', !!ml && ml.por === 'ivan', JSON.stringify(ml));
    ok('un solo paso de Ctrl+Z', await pg.evaluate(n => undoStack.length === n + 1, undo0));
    // un clic que ya no se puede poner (entre abrir y pulsar, Leo coge un permiso) no deja un paso vacío
    await pg.evaluate(() => closePicker());
    const cas = await pg.evaluate(() => { for (const iso of rangoIso('2026-10-05', '2026-10-11')) for (const t of turnosDe(S)) { const c = candidatosPara(S, S.staff, estadoDeIso(iso), iso, t.id); if (c.length) return { iso, tid: t.id, pid: c[0].pid }; } return null; });
    await pg.evaluate(c => openPicker(c.iso, c.tid, document.body), cas);
    await llega(pg, c => !!document.querySelector(`#pickerPop .prowp[data-pickpid="${c.pid}"]`), cas, 4000);
    await pg.evaluate(c => { personaDeId(c.pid).ausencias = (personaDeId(c.pid).ausencias || []).concat([{ tipo: 'PERM', desde: c.iso, hasta: c.iso }]); }, cas);
    const undo1 = await pg.evaluate(() => undoStack.length);
    await clic(pg, `#pickerPop .prowp[data-pickpid="${cas.pid}"]`);
    ok('si no se puede poner, avisa y no apila un paso vacío en Ctrl+Z', await pg.evaluate(n => undoStack.length === n, undo1), await pg.evaluate(() => undoStack.map(u => u.label).join(' | ')));
    await pg.evaluate(() => closePicker());
    // forzar a Hojan («solo hace cocina») en la sala del Mónaco un día que no trabaja por la mañana
    // un día que no trabaja (sin partido de por medio) y en que lo único que choca es la sala
    const dia = await pg.evaluate(() => {
      personaDeId('hojan').libra = [];
      for (const iso of rangoIso('2026-10-05', '2026-10-25')) {
        const e = estadoDeIso(iso);
        if (turnosDe(S).some(t => pidsEn(e, iso, t.id).includes('hojan'))) continue;
        const r = puedeEstar(S, S.staff, e, iso, 'MONACO_M', 'hojan', { puesto: 'sala', forzar: true, permitirPartido: true });
        if (r.ok && r.avisos.length === 1 && /solo hace cocina/.test(r.avisos[0])) return iso;
      }
      return null;
    });
    ok('hay un día en que Hojan solo choca con «solo hace cocina» en la sala del Mónaco', !!dia, dia);
    await pg.evaluate(v => openPicker(v, 'MONACO_M', document.body), dia);
    await llega(pg, () => !!document.querySelector('#pickerPop [data-forzar="hojan"]'), null, 4000);
    ok('Hojan sale en «no pueden» con la regla Cocina', /Cocina/.test(await pg.evaluate(() => { const b = document.querySelector('#pickerPop [data-forzar="hojan"]'); return b ? b.closest('.prowp').textContent : ''; })));
    await clic(pg, '#pickerPop [data-forzar="hojan"]');
    const h = (await casilla(pg, dia, 'MONACO_M')).find(x => x.pid === 'hojan');
    ok('forzado: la entrada queda como forzada', !!h && h.forzado, JSON.stringify(h));
    ok('y la Revisión lo da por forzado a mano con «solo hace cocina»', await pg.evaluate(v => revisionMes(S, S.staff, estadoDeIso(v), { desde: v, hasta: v }).some(x => x.tipo === 'forzado' && /Hojan: solo hace cocina/.test(x.msg)), dia));
    await pg.context().close();
  });

  // ══ 4) Generador → Semana: el relevo solo ══
  console.log('── 4) Generador → Semana: la semana ya volcada y la VAC de Iván apuntada después');
  await seccion('semana', async () => {
    const pg = await pagina('semana');
    await preparar(pg);
    await vista(pg, 'generador');
    await clic(pg, '#genRoot [data-modo="semana"]');
    for (let k = 0; k < 3 && !(await pg.evaluate(() => GEN.lunes === '2026-09-28')); k++) await clic(pg, '#genRoot #gsNext');
    // la semana ya estaba volcada: Iván sale por sus vacaciones y el encargado rellena a mano sus huecos
    await pg.evaluate(() => {
      anadirAusencia(personaDeId('ivan'), { tipo: 'VAC', desde: '2026-10-02', hasta: '2026-10-04' });
      for (const iso of ['2026-10-02', '2026-10-03', '2026-10-04']) desasignar(estadoDeIso(iso, true), iso, 'PASARELA_T', 'ivan');
      for (const iso of ['2026-10-02', '2026-10-03']) asignar(estadoDeIso(iso, true), S, S.staff, iso, 'PASARELA_T', 'cristian', { origen: 'manual', forzar: true, permitirPartido: true });
      asignar(estadoDeIso('2026-10-04', true), S, S.staff, '2026-10-04', 'PASARELA_T', 'roberto', { origen: 'manual', forzar: true, permitirPartido: true });
      saveState();
    });
    await clic(pg, '#genRoot #genPrevia');
    await llega(pg, () => !!document.querySelector('#genRes .genkpis'), null, 20000);
    const b = await pg.evaluate(() => { const x = document.querySelector('#genRes #genAplicar'); return x ? { dis: x.disabled, txt: x.textContent } : null; });
    ok('el botón deja volcar el relevo («relevo «cubre a»»)', !!b && !b.dis && /relevo/.test(b.txt), JSON.stringify(b));
    ok('«Qué ha cambiado» enseña a Mari Luz «por Iván»', await pg.evaluate(() => [...document.querySelectorAll('#genRes .gcamblist li')].some(li => /Mari L/.test(li.textContent) && /por Iv/.test(li.textContent))), await pg.evaluate(() => [...document.querySelectorAll('#genRes .gcamblist li')].map(li => li.textContent).join(' | ')));
    await clic(pg, '#genRes #genAplicar');
    await llega(pg, () => !GEN.previa, null, 8000);
    const ml = (await casilla(pg, VIE, 'PASARELA_T')).find(x => x.pid === 'mariluz');
    ok('volcado: Mari Luz «por Iván» en la planilla', !!ml && ml.por === 'ivan', JSON.stringify(ml));
    await clic(pg, '#genRoot #genPrevia');
    await llega(pg, () => !!document.querySelector('#genRes .genkpis'), null, 20000);
    ok('y al generar otra vez ya no hay nada nuevo que volcar', await pg.evaluate(() => { const x = document.querySelector('#genRes #genAplicar'); return !!x && x.disabled; }));
    await pg.context().close();
  });

  // ══ 5) y 6) Cobertura: plan viejo, textos y Revisión ══
  console.log('── 5) Cobertura: abrir y cerrar una ficha sin tocar nada no deja el plan viejo');
  await seccion('cobertura', async () => {
    const pg = await pagina('cobertura');
    await preparar(pg, { dulce: true, partido: [2, 4] });
    const buscar = async () => {
      await vista(pg, 'cobertura');
      await clic(pg, '#cobRoot .cobpk[data-pk="ivan"]');
      await clic(pg, '#cobRoot [data-tipo="VAC"]');
      for (const iso of [VIE, SAB, DOM]) if (!await pg.evaluate(i => COB.dias.includes(i), iso)) await clic(pg, `#cobRoot .cobdia[data-dia="${iso}"]`);
      await clic(pg, '#cobRoot #cobProponer');
      return llega(pg, () => !!document.querySelector('#cobRes .cobplan.reco'), null, 8000);
    };
    ok('sale la propuesta', await buscar() >= 0);
    for (const pid of ['mariluz', 'ivan', 'lola']) {
      await vista(pg, 'equipo');
      await clic(pg, `#equipoRoot [data-pcard="${pid}"] .pmini`);
      await pg.waitForSelector('#fichaOvl', { timeout: 5000 }).catch(() => null);
      await clic(pg, '#fichaOvl [data-ovx]');
      await llega(pg, () => !document.getElementById('fichaOvl'), null, 3000);
    }
    await vista(pg, 'cobertura');
    ok('tras mirar las fichas de Mari Luz, Iván y Lola, el plan sigue ahí (no dice «La ficha ha cambiado»)', await pg.evaluate(() => !!document.querySelector('#cobRes .cobplan.reco') && !document.querySelector('#cobCaduco')));
    ok('el plan A no dice «2 huecos» que no existen: Mari Luz abre (partido autorizado para cubrir a Iván)', await pg.evaluate(() => { const P = document.querySelector('#cobRes .cobplan.reco'); const b = P && P.querySelector('[data-aplicar="A"]'); return !!b && !/hueco/.test(b.textContent) && !!P.querySelector('.cobrow.relevo[data-pid="mariluz"] .bdg.abre'); }), await pg.evaluate(() => (document.querySelector('#cobRes .cobplan.reco') || {}).textContent));
    ok('el domingo no entra ningún apoyo a quedarse solo con Lavinia', await pg.evaluate(d => { const mv = document.querySelector(`#cobRes .cobplan.reco .cobmv[data-cas="${d}|PASARELA_T"]`); return !!mv && ![...mv.querySelectorAll('.cobentra .cobrow[data-pid]')].some(r => esApoyo(personaDeId(r.dataset.pid))); }, DOM));
    console.log('── 6) Confirmar el plan A: textos de la vista previa, de lo aplicado y del historial; y la Revisión');
    await clic(pg, '#cobRes .cobplan.reco [data-aplicar="A"]');
    await llega(pg, () => !!document.querySelector('#previaCobOvl #pvOk'), null, 4000);
    const pv = await pg.evaluate(() => (document.querySelector('#previaCobOvl .pvres') || {}).textContent || '');
    ok('la vista previa: «que cubren …» en plural y Mari Luz «que ya estaba … y pasa a cubrir»', /que cubren/.test(pv) && /Mari L\.?, que ya estaba en la casilla y pasa a cubrir/.test(pv), pv);
    await clic(pg, '#previaCobOvl #pvOk');
    await llega(pg, () => !!document.querySelector('#cobRes .cobok'), null, 5000);
    const card = await pg.evaluate(() => (document.querySelector('#cobRes .cobok .revsub') || {}).textContent || '');
    ok('lo aplicado se cuenta por turnos de Iván: «3 turnos de Iván cubiertos: 2 por Mari Luz, que ya estaba; …»', /3 turnos de Iván cubiertos/.test(card) && /2 por Mari Luz, que ya estaba/.test(card) && !/5 turnos cubiertos/.test(card), card);
    const hist = await pg.evaluate(() => (S.historial.find(h => h.tipo === 'cobertura') || {}).txt || '');
    ok('el historial distingue a Mari Luz, que ya estaba', /Mari Luz \(ya estaba\)/.test(hist), hist);
    // la Revisión del mes de octubre
    await pg.evaluate(() => { irAIso('2026-10-02'); });
    await pg.evaluate(() => openRevision());
    await llega(pg, () => !!document.querySelector('#revOvl'), null, 4000);
    const rv = await pg.evaluate(() => document.querySelector('#revOvl').textContent);
    ok('la Revisión pone el partido autorizado en «Autorizado · para que lo sepas», no en «Pendiente de confirmar con el grupo»', /AUTORIZADO · PARA QUE LO SEPAS/.test(rv) && !/PENDIENTE DE CONFIRMAR CON EL GRUPO/.test(rv), rv.slice(0, 600));
    ok('una línea por persona y día (mañana y tarde juntas)', await pg.evaluate(() => [...document.querySelectorAll('#revOvl .revitem')].filter(x => /Mari Luz: partido para cubrir a Iván/.test(x.textContent) && /2\/10|02\/10/.test(x.textContent)).length === 1), await pg.evaluate(() => [...document.querySelectorAll('#revOvl .revitem')].filter(x => /partido para cubrir/.test(x.textContent)).map(x => x.textContent).join(' | ')));
    await pg.context().close();
  });

  // ══ 7) media jornada en las vistas ══
  console.log('── 7) Permiso de Mari Luz solo por la mañana del viernes 2/10');
  await seccion('media', async () => {
    const pg = await pagina('media');
    await pg.evaluate(v => {
      const p = personaDeId('mariluz');
      anadirAusencia(p, { tipo: 'PERM', desde: v, hasta: v, franjas: ['M'], detalle: 'médico' });
      desasignar(estadoDeIso(v, true), v, 'PASARELA_M', 'mariluz');
      saveState();
    }, VIE);
    await vista(pg, 'equipo');
    const chip = await pg.evaluate(() => { const c = document.querySelector('#equipoRoot [data-pcard="mariluz"]'); return c ? [...c.querySelectorAll('.abschip')].map(x => x.textContent).join(' | ') : ''; });
    ok('la tarjeta de Equipo dice «Permiso por la mañana»', /Permiso por la mañana/.test(chip), chip);
    await pg.evaluate(v => { irAIso(v); }, VIE);
    await llega(pg, () => !document.getElementById('view-hoy').classList.contains('hidden'), null, 4000);
    const hoy = await pg.evaluate(() => (document.querySelector('#diaSide') || {}).textContent || '');
    ok('Hoy, en «Ausentes hoy»: «Permiso por la mañana»', /Permiso por la mañana/.test(hoy), hoy.slice(0, 300));
    await vista(pg, 'semana');
    const fila = await pg.evaluate(() => { const r = [...document.querySelectorAll('tr.piedesc')].find(x => /Ausencias/.test(x.textContent)); return r ? r.textContent : ''; });
    ok('Semana, fila «Ausencias»: «PERM · mañana»', /PERM · mañana/.test(fila), fila.slice(0, 300));
    const pie = await pg.evaluate(v => { const cols = [{ iso: v, est: estadoDeIso(v) }]; return pxFilasDescansos(cols, S.staff, 2); }, VIE);
    ok('la hoja impresa, en «Ausencias»: «Permiso por la mañana»', /Permiso por la mañana/.test(pie), pie.slice(0, 300));
    // la hoja «se destraparía si…» (quien entraría si se levantase UNA condición) no deja fuera de la
    // tarde a quien solo falta por la mañana: con un veto a las tardes de Pasarela, Mari Luz sale ahí
    const des = await pg.evaluate(v => {
      const e = estadoDeIso(v, true);
      desasignar(e, v, 'PASARELA_T', 'mariluz');
      personaDeId('mariluz').vetos.push({ localId: 'PASARELA', franja: 'T' });
      const r = pxgDestrapa({ estado: e }, { iso: v, turnoId: 'PASARELA_T', tipo: 'faltan' });
      personaDeId('mariluz').vetos.pop();
      return r;
    }, VIE);
    ok('«se destraparía si…» cuenta a Mari Luz para la tarde (solo falta por la mañana)', des.some(x => x.nombre === 'Mari Luz'), JSON.stringify(des));
    // el perfil del empleado (Mari Luz entra con su usuario)
    await pg.evaluate(() => { try { sessionStorage.setItem(PID_KEY, 'mariluz'); } catch (e) {} SRV.pid = 'mariluz'; S.y = 2026; S.m = 10; cargarMes(); activarModoEmpleado(); });
    const perfil = await pg.evaluate(() => (document.getElementById('view-perfil') || {}).textContent || '');
    ok('el perfil de Mari Luz dice «Permiso por la mañana» el viernes 2', /Permiso por la mañana/.test(perfil), perfil.slice(0, 300));
    await pg.context().close();
  });

  ok('ningún error de página en toda la batería', !errores.length, errores.join(' | '));
} catch (e) {
  ok('la batería no se interrumpe', false, e && e.stack ? e.stack.split('\n').slice(0, 4).join(' | ') : e);
} finally {
  await br.close();
  srv.close();
}
resumen();
