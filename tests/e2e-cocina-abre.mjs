// COCINA Y QUIÉN ABRE, CON CLICS (fase 5, 24/09; Diego: «que lea todas las variables»).
// Lo que ve el encargado de la fase 5:
//  1) Ajustes del local → cocina (S36): el desplegable ofrece primero a quien ya es de cocina de ese local y
//     avisa de que a los demás los hará de cocina; añadir a Victoria de titular de El 33 la hace titular en
//     su ficha (y el Generador la nombra); quitar a Noe de los titulares se lo quita de la ficha; y al revés,
//     marcar en la ficha de Juani «titular de cocina en El 33» la pone en Ajustes. Ctrl+Z lo devuelve todo;
//  2) «Sale primero» del menú de la casilla (S18): sobre quien no puede abrir (Leo, «nunca de primero»)
//     pregunta como «forzar», con la regla y el motivo; queda, con el aviso en la casilla y en Revisar;
//  3) «Quién abre» de Pasarela tarde a Mari Luz (S18): al generar la semana con la semana tipo abre ella, y
//     el Generador lo comprueba; la marca «a» de la semana tipo ya no queda como puesta a mano;
//  4) apagar «Cocina» del grupo (S16, D5) dice la consecuencia; apagar «Cocina» en la ficha de Susana Capón
//     (S15) tacha «solo martes» y no «titular»;
//  5) Generador → Semana (S37): la cocina obligatoria que nadie puede llevar sale en «Huecos».
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

async function pagina(etiqueta, ancho) {
  const ctx = await br.newContext({ viewport: { width: ancho || 1280, height: 900 } });
  await ctx.clock.setFixedTime(new Date('2026-09-24T10:00:00+02:00'));
  await ctx.addInitScript(() => { try { sessionStorage.setItem('shiftia_pas_sesion', '1'); sessionStorage.setItem('shiftia_pas_rol', 'admin'); } catch (e) {} });
  const pg = await ctx.newPage();
  pg.on('pageerror', e => errores.push(`${etiqueta}: ${e.message}`));
  pg.dialogos = [];
  pg.on('dialog', d => { pg.dialogos.push(d.message()); d.accept('prueba').catch(() => {}); });
  await pg.route(/googleapis|gstatic|cdnjs/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await pg.goto(BASE + '/index.html?demo=1');
  await pg.waitForSelector('#view-hoy .loccard', { timeout: 15000 });
  return pg;
}
async function seccion(nombre, fn) {
  try { await fn(); } catch (e) { ok(`${nombre}: la sección no se interrumpe`, false, e && e.stack ? e.stack.split('\n').slice(0, 4).join(' | ') : e); }
}
// lo que dice la ficha de una persona de la cocina de un local (sin depender de funciones nuevas)
const fichaCocina = (pg, pid, lid) => pg.evaluate(([p, l]) => { const c = (personaDeId(p) || {}).cocina || {}; return (c.titular || []).includes(l) ? 'titular' : (c.reserva || []).includes(l) ? 'reserva' : null; }, [pid, lid]);
const titulares = (pg, lid) => pg.evaluate(l => JSON.parse(JSON.stringify(localDe(S, l).cocina.titulares)), lid);

try {
  // ══ 1) Ajustes del local → cocina, y la ficha, de acuerdo en los dos sentidos ══
  console.log('── 1) Ajustes de El 33 → cocina: añadir a Victoria, quitar a Noe, y la ficha de Juani');
  await seccion('ajustes', async () => {
    const pg = await pagina('ajustes');
    await pg.evaluate(() => { switchTab('equipo'); openAjustesLocales('EL33'); });
    await pg.waitForSelector('#localesOvl [data-titsel="M"]', { timeout: 5000 });
    const grupos = await pg.evaluate(() => [...document.querySelectorAll('#localesOvl [data-titsel="M"] optgroup')].map(g => ({ label: g.label, ids: [...g.querySelectorAll('option')].map(o => o.value) })));
    // (revisión F5: el grupo se llama «Ya pueden llevarla»; «Cocina de este local» ofrecía a cocineros de otros locales)
    ok('el desplegable ofrece primero a quien ya puede llevar la cocina de El 33', grupos.length > 0 && /Ya pueden llevarla/.test(grupos[0].label) && await pg.evaluate(ids => ids.every(id => puedeCocina(S, personaDeId(id), 'EL33', null)), grupos[0].ids), JSON.stringify(grupos.map(g => g.label)));
    const otros = grupos.find(g => g.ids.includes('victoria'));
    ok('Victoria (no es de cocina) sale en un grupo que avisa de que pasará a serlo en su ficha', !!otros && /ficha/i.test(otros.label), otros && otros.label);
    await pg.selectOption('#localesOvl [data-titsel="M"]', 'victoria');
    await pg.click('#localesOvl [data-titadd="M"]');
    await llega(pg, () => localDe(S, 'EL33').cocina.titulares.M.includes('victoria'), null, 3000);
    ok('al añadirla lo pregunta, diciendo que su ficha pasa a decirlo', pg.dialogos.some(m => /Victoria/.test(m) && /ficha/i.test(m)), JSON.stringify(pg.dialogos));
    ok('queda la última de los titulares de la mañana de El 33', (await titulares(pg, 'EL33')).M.slice(-1)[0] === 'victoria', JSON.stringify(await titulares(pg, 'EL33')));
    ok('y su ficha dice «titular de cocina en El 33»', await fichaCocina(pg, 'victoria', 'EL33') === 'titular');
    // quitar a Noe de los titulares de mañana y de tarde con el ✕
    for (const f of ['M', 'T']) {
      const i = (await titulares(pg, 'EL33'))[f].indexOf('noe');
      if (i >= 0) await pg.click(`#localesOvl [data-tit="${f}|rm|${i}"]`);
      await llega(pg, ([fr]) => !localDe(S, 'EL33').cocina.titulares[fr].includes('noe'), [f], 3000);
    }
    ok('Noe ya no está en la cocina de El 33 en Ajustes', !JSON.stringify(await titulares(pg, 'EL33')).includes('noe'));
    ok('y tampoco en su ficha', await fichaCocina(pg, 'noe', 'EL33') === null, await fichaCocina(pg, 'noe', 'EL33'));
    const cond = await pg.evaluate(() => (condicionesDe(S, S.staff, '2026-09-28').find(c => c.id === 'coc:EL33') || {}).texto || '');
    ok('el Generador nombra a Victoria en la cocina de El 33, y no a Noe', /Victoria/.test(cond) && !/Noe/.test(cond), cond);
    // la ficha de Victoria lo enseña
    await pg.evaluate(() => { document.querySelectorAll('.ovl').forEach(o => o.remove()); openFicha('victoria'); });
    await pg.waitForSelector('#fichaOvl [data-tcoct="EL33"]', { timeout: 5000 });
    ok('en la ficha de Victoria sale marcado «Titular de cocina en El 33»', await pg.$eval('#fichaOvl [data-tcoct="EL33"]', b => b.classList.contains('on')));
    // Ctrl+Z: tres pasos (Victoria, Noe de mañana, Noe de tarde)
    await pg.evaluate(() => { document.querySelectorAll('.ovl').forEach(o => o.remove()); deshacer(); deshacer(); deshacer(); });
    ok('Ctrl+Z devuelve a Noe a Ajustes y a su ficha, y quita a Victoria', (await titulares(pg, 'EL33')).M.includes('noe') && (await titulares(pg, 'EL33')).T.includes('noe') && await fichaCocina(pg, 'noe', 'EL33') === 'titular' && await fichaCocina(pg, 'victoria', 'EL33') === null && !(await titulares(pg, 'EL33')).M.includes('victoria'), JSON.stringify(await titulares(pg, 'EL33')));
    // al revés: la ficha de Juani (solo mañanas) → titular de cocina en El 33 → sale en Ajustes, de mañana
    await pg.evaluate(() => openFicha('juani'));
    await pg.waitForSelector('#fichaOvl [data-tcoct="EL33"]', { timeout: 5000 });
    await pg.click('#fichaOvl [data-tcoct="EL33"]');
    await llega(pg, () => ((personaDeId('juani').cocina || {}).titular || []).includes('EL33'), null, 3000);
    const t2 = await titulares(pg, 'EL33');
    ok('marcar en la ficha de Juani «titular de cocina en El 33» la pone en Ajustes (de mañana, que es cuando trabaja)', t2.M.includes('juani') && !t2.T.includes('juani'), JSON.stringify(t2));
    await pg.click('#fichaOvl [data-tcoct="EL33"]');
    await llega(pg, () => !localDe(S, 'EL33').cocina.titulares.M.includes('juani'), null, 3000);
    ok('y quitarlo en la ficha la quita de Ajustes', !(await titulares(pg, 'EL33')).M.includes('juani'));
    await pg.context().close();
  });

  // ══ 2) «Sale primero» del menú, sobre quien no puede abrir ══
  console.log('── 2) «Sale primero» a mano: Leo («nunca de primero») en la tarde de Pasarela del lunes 28');
  await seccion('sale primero', async () => {
    const pg = await pagina('sale-primero');
    const iso = '2026-09-28';
    const puesto = await pg.evaluate(v => { const e = estadoDeIso(v, true); if (!pidsEn(e, v, 'PASARELA_T').includes('leo')) asignar(e, S, S.staff, v, 'PASARELA_T', 'leo', { forzar: true, permitirPartido: true, puesto: 'sala' }); saveState(); irAIso(v); renderVistaActiva(); return pidsEn(e, v, 'PASARELA_T').includes('leo') && primeroDe(S, S.staff, e, v, 'PASARELA_T') !== 'leo'; }, iso);
    ok('Leo está en la tarde de Pasarela, y no abre', puesto);
    pg.dialogos.length = 0;
    await pg.evaluate(v => openMenuTurno(v, 'PASARELA_T', 'leo', document.body), iso);
    await pg.waitForSelector('#menuTurnoPop [data-mt="abre"]', { timeout: 4000 });
    await pg.click('#menuTurnoPop [data-mt="abre"]');
    await llega(pg, v => primeroDe(S, S.staff, estadoDeIso(v), v, 'PASARELA_T') === 'leo', iso, 3000);
    ok('pregunta como «forzar», con la regla y el motivo', pg.dialogos.some(m => /Nunca de primero/.test(m) && /Leo no sale el primero de la tarde/.test(m)), JSON.stringify(pg.dialogos));
    ok('y Leo sale primero (lo decide el encargado)', await pg.evaluate(v => primeroDe(S, S.staff, estadoDeIso(v), v, 'PASARELA_T') === 'leo', iso));
    const slot = await pg.evaluate(v => posicionesDe(S, S.staff, estadoDeIso(v), v, 'PASARELA_T').find(x => x.pid === 'leo'), iso);
    ok('la casilla lo avisa (Hoy, Semana)', slot && slot.avisos.some(a => /no sale el primero/.test(a)), JSON.stringify(slot));
    const hoy = await pg.evaluate(v => { const el = document.querySelector(`#view-hoy [data-cas="${v}|PASARELA_T"]`); return el ? el.textContent : ''; }, iso);
    ok('Hoy enseña el aviso en la casilla', /no sale el primero/.test(hoy) || await pg.evaluate(v => !!document.querySelector(`#view-hoy [data-cas="${v}|PASARELA_T"] .warn, #view-hoy [data-cas="${v}|PASARELA_T"] [title*="no sale el primero"]`), iso), hoy.slice(0, 300));
    await pg.evaluate(() => openRevision());
    await pg.waitForSelector('#revOvl', { timeout: 4000 });
    const rev = await pg.$eval('#revOvl', el => el.textContent);
    ok('Revisar lo dice: sale primero Leo, marcado a mano, y no puede abrir', /sale primero Leo/.test(rev) && /no sale el primero de la tarde/.test(rev), rev.slice(0, 400));
    // con quien sí puede abrir, no pregunta nada
    await pg.evaluate(() => document.querySelectorAll('.ovl').forEach(o => o.remove()));
    const otro = await pg.evaluate(v => asignados(estadoDeIso(v), v, 'PASARELA_T').map(x => x.pid).find(p => p !== 'leo' && puedePrimero(S, S.staff, estadoDeIso(v), v, 'PASARELA_T', p).ok), iso);
    pg.dialogos.length = 0;
    if (otro) {
      await pg.evaluate(([v, p]) => openMenuTurno(v, 'PASARELA_T', p, document.body), [iso, otro]);
      await pg.waitForSelector('#menuTurnoPop [data-mt="abre"]', { timeout: 4000 });
      await pg.click('#menuTurnoPop [data-mt="abre"]');
      await llega(pg, ([v, p]) => primeroDe(S, S.staff, estadoDeIso(v), v, 'PASARELA_T') === p, [iso, otro], 3000);
    }
    ok(`con quien puede abrir (${otro}) no pregunta nada`, !!otro && !pg.dialogos.length, JSON.stringify(pg.dialogos));
    await pg.context().close();
  });

  // ══ 3) «Quién abre» de Pasarela tarde a Mari Luz, y generar la semana con la semana tipo ══
  console.log('── 3) «Quién abre» de Pasarela por la tarde: Mari Luz; Generador → Semana del 28/09');
  await seccion('quien abre', async () => {
    const pg = await pagina('quien-abre');
    await pg.evaluate(() => { switchTab('equipo'); openAjustesLocales('PASARELA'); });
    await pg.waitForSelector('#localesOvl [data-primero="T"]', { timeout: 5000 });
    await pg.selectOption('#localesOvl [data-primero="T"]', 'mariluz');
    await llega(pg, () => localDe(S, 'PASARELA').primero.T === 'mariluz', null, 3000);
    await pg.evaluate(() => { document.querySelectorAll('.ovl').forEach(o => o.remove()); GEN.opts.desdeHoy = false; irAGenerador({ desde: '2026-09-28', hasta: '2026-10-04' }); });
    await pg.waitForSelector('#genPrevia', { timeout: 5000 });
    await pg.click('#genPrevia');
    await llega(pg, () => !!(GEN.previa && GEN.previa.semana), null, 8000);
    const r = await pg.evaluate(() => {
      const p = GEN.previa, e = p.estado;
      const dias = p.dias.filter(d => pidsEn(e, d, 'PASARELA_T').includes('mariluz') && puedePrimero(S, S.staff, e, d, 'PASARELA_T', 'mariluz').ok);
      const abre = dias.map(d => primeroDe(S, S.staff, e, d, 'PASARELA_T'));
      const manuales = p.dias.reduce((a, d) => a + turnosDe(S).filter(t => manualDe(e, d, t.id).abre).length, 0);
      const cond = p.condiciones.find(c => /Mari Luz/.test(c.texto) && /Pasarela/.test(c.texto) && /(primer|abre)/.test(c.texto));
      return { dias, abre, manuales, cond: cond ? { texto: cond.texto, ok: cond.ok } : null, html: (document.querySelector('#genRes') || {}).textContent || '' };
    });
    ok('algún día de la semana Mari Luz puede abrir la tarde de Pasarela', r.dias.length > 0, JSON.stringify(r));
    ok('y esos días abre ella, aunque la semana tipo marque a Iván', r.abre.length > 0 && r.abre.every(p => p === 'mariluz'), JSON.stringify(r.abre));
    ok('el Generador lo comprueba como condición y se cumple', !!r.cond && r.cond.ok, JSON.stringify(r.cond));
    ok('la condición se enseña en la hoja del Generador', !!r.cond && r.html.includes(r.cond.texto));
    ok('ninguna casilla de la semana queda con quien abre fijado a mano', r.manuales === 0, r.manuales);
    await pg.context().close();
  });

  // ══ 4) los interruptores de la cocina dicen lo que apagan ══
  console.log('── 4) Apagar «Cocina» (del grupo y en la ficha de Susana Capón)');
  await seccion('interruptores', async () => {
    const pg = await pagina('interruptores');
    // la tarde del Mónaco del miércoles 7 sin su cocinero: Revisar pide la cocina (es obligatoria)
    const sinCoc = () => pg.evaluate(() => revisionMes(S, S.staff, estadoDeIso('2026-10-07'), { desde: '2026-10-07', hasta: '2026-10-07' }).some(x => x.tipo === 'sin-cocina' && x.turnoId === 'MONACO_T'));
    await pg.evaluate(() => { const e = estadoDeIso('2026-10-07', true); const c = asignados(e, '2026-10-07', 'MONACO_T').find(x => x.cocina); if (c) desasignar(e, '2026-10-07', 'MONACO_T', c.pid); saveState(); });
    ok('sin su cocinero, Revisar pide la cocina de la tarde del Mónaco del miércoles 7', await sinCoc());
    await pg.evaluate(() => { switchTab('equipo'); openCondiciones(); });
    await pg.waitForSelector('#condOvl [data-regla="cocina"]', { timeout: 5000 });
    await pg.click('#condOvl [data-regla-row="cocina"] .tgl');
    await llega(pg, () => S.reglas && S.reglas.cocina === false, null, 3000);
    const fila = await pg.$eval('#condOvl [data-regla-row="cocina"]', el => el.textContent);
    ok('apagada, la regla «Cocina» dice lo que pasa: nadie busca ni exige cocina, lo marcado a mano se queda', /nadie busca/i.test(fila) && /a mano/i.test(fila), fila);
    const toast = await pg.evaluate(() => [...document.querySelectorAll('.toast, #toast, [role="status"]')].map(x => x.textContent).join(' | '));
    ok('y el aviso al apagarla también', /nadie busca/i.test(toast), toast);
    ok('con «Cocina» apagada, Revisar ya no la pide', !(await sinCoc()));
    await pg.evaluate(() => { document.querySelectorAll('.ovl').forEach(o => o.remove()); S.reglas.cocina = true; });
    // la ficha de Susana Capón: «Cocina» apagada
    await pg.evaluate(() => { alternarCaracteristicaUI('scapon', 'cocina', false); renderEquipo(); });
    const chips = await pg.evaluate(() => [...document.querySelectorAll('[data-pcard="scapon"] .tchip')].filter(c => /Cocina/.test(c.textContent)).map(c => ({ t: c.textContent.replace(/\s+/g, ' ').trim(), off: c.classList.contains('off') })));
    ok('en su tarjeta, «titular» de Bar Mónaco no se tacha', chips.some(c => /titular/.test(c.t) && !c.off), JSON.stringify(chips));
    ok('y «solo martes» sí', chips.some(c => /solo martes/.test(c.t) && c.off), JSON.stringify(chips));
    await pg.evaluate(() => openFicha('scapon'));
    await pg.waitForSelector('#fichaOvl [data-car="cocina"]', { timeout: 4000 });
    const offTxt = await pg.$eval('#fichaOvl [data-car="cocina"]', el => el.textContent);
    ok('su ficha explica qué apaga: «solo estos días», «nunca» y «solo hace cocina», no ser titular', /solo estos días/i.test(offTxt) && /titular/i.test(offTxt) && /no se miran|no mira|deja de mirar/i.test(offTxt), offTxt.slice(0, 400));
    await pg.context().close();
  });

  // ══ 5) Generador → Semana: la cocina obligatoria que nadie puede llevar es un hueco ══
  console.log('── 5) Generador → Semana del 05/10 con los cocineros del Mónaco de vacaciones el miércoles 7');
  await seccion('hueco de cocina', async () => {
    const pg = await pagina('hueco-cocina');
    await pg.evaluate(() => {
      for (const id of ['esmeralda', 'jenny', 'hojan']) anadirAusencia(personaDeId(id), { tipo: 'VAC', desde: '2026-10-07', hasta: '2026-10-07' });
      saveState(); GEN.opts.desdeHoy = false; irAGenerador({ desde: '2026-10-05', hasta: '2026-10-11' });
    });
    await pg.waitForSelector('#genPrevia', { timeout: 5000 });
    await pg.click('#genPrevia');
    await llega(pg, () => !!(GEN.previa && GEN.previa.semana), null, 8000);
    const r = await pg.evaluate(() => ({ huecos: GEN.previa.huecos.filter(h => h.iso === '2026-10-07' && /^MONACO/.test(h.turnoId)).map(h => h.tipo), html: (document.querySelector('#genRes') || {}).textContent || '' }));
    ok('«Huecos» lista la cocina del Mónaco del miércoles 7', r.huecos.includes('cocina'), JSON.stringify(r.huecos));
    ok('con su texto: sin cocina (obligatoria)', /sin cocina \(obligatoria\)/i.test(r.html), r.html.slice(0, 200));
    await pg.context().close();
  });
} finally {
  ok('sin errores de página', !errores.length, errores.join(' | '));
  await br.close(); srv.close();
}
resumen();
