// UNA SOLA PUERTA DE REGLAS, CON CLICS (fase 4, 24/09; Diego: «que lea todas las variables»).
// Lo que el encargado ve de la puerta única del modelo (evaluarPlaza) en dos sitios que tenían su
// propia copia de las reglas:
//  1) el selector de la casilla (S35): si la casilla no tiene cocina, arriba quien puede llevarla (y
//     entra llevándola); en «NO PUEDEN» nadie sin motivo ni sin regla; «forzar» solo donde se puede;
//  2) la hoja impresa del Generador, «se destraparía si…» (S41): sale de la misma puerta: Dulce, en
//     standby, no se ofrece para abrir levantando «no sale el primero»; el veto de Mari Luz (los
//     lunes) no se le pone un martes; y cada pista es exactamente una regla que se puede forzar.
// Revisión F4 (los dos revisores):
//  3) en una casilla sin cocina, quien puede llevarla con aviso (Jenny, un partido no declarado) sale «con
//     aviso» marcada de cocina y entra llevándola; en «no pueden», quien lleva esa cocina se fuerza como
//     cocina; y «forzar» pregunta por TODAS las reglas que se incumplen, cada una con la suya;
//  4) la semana que cruza de mes (28/09-04/10): «N turnos esa semana» del selector, de la ★ de Hoy y del
//     Generador → Periodo cuenta la semana entera, no solo los días de ese mes.
// La hoja se comprueba primero con lo que enseña (funciones de la app que ya existían) y después se cruza
// con el modelo, para que contra el código de antes falle por lo que enseña y no por una función nueva.
// El reloj de la página se fija en el jueves 24/09/2026 (el día de la reunión). E2E_RAIZ permite
// pasar la batería por otra copia de la app (la de antes del cambio, para verla en rojo).
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
const LUNES = '2026-09-28';

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
// las filas del selector abierto, por grupo
const filasSelector = pg => pg.evaluate(() => {
  const out = []; let grupo = null;
  for (const el of document.querySelectorAll('#pickerPop .plist > *')) {
    if (el.classList.contains('pgroup')) { grupo = el.textContent.split('·')[0].trim(); continue; }
    if (!el.classList.contains('prowp')) continue;
    out.push({ grupo, pid: el.dataset.pickpid || (el.querySelector('[data-forzar]') || {}).dataset?.forzar || null, nombre: (el.querySelector('.pn2') || {}).firstChild?.textContent || '', regla: (el.querySelector('.prregla') || {}).textContent || '', motivo: (el.querySelector('.prsub') || {}).textContent || '', forzar: !!el.querySelector('[data-forzar]'), rec: el.classList.contains('rec'), cocina: el.dataset.cocina === '1', aviso: el.dataset.aviso === '1' });
  }
  return out;
});

try {
  // ══ 1) el selector: la cocina arriba, nadie sin motivo, «forzar» solo donde se puede ══
  console.log('── 1) Selector de la tarde del Mónaco del miércoles 7/10 sin la cocina (Hojan fuera)');
  await seccion('selector', async () => {
    const pg = await pagina('selector');
    const MIE = '2026-10-07';
    const antes = await pg.evaluate(v => {
      const e = estadoDeIso(v, true);
      const cocinero = (asignados(e, v, 'MONACO_T').find(x => x.cocina) || {}).pid;
      if (cocinero) desasignar(e, v, 'MONACO_T', cocinero);
      saveState(); renderVistaActiva();
      openPicker(v, 'MONACO_T', document.body);
      return { cocinero, quedan: pidsEn(e, v, 'MONACO_T') };
    }, MIE);
    ok('la tarde del Mónaco se queda sin cocina (la cocina es obligatoria)', !!antes.cocinero, JSON.stringify(antes));
    await llega(pg, () => !!document.querySelector('#pickerPop .plist .prowp'), null, 4000);
    const filas = await filasSelector(pg);
    // la ★ de un toque de Hoy es la misma que la del selector
    const starHoy = await pg.evaluate(v => { closePicker(); irAIso(v); renderVistaActiva(); const b = document.querySelector(`#view-hoy [data-cas="${v}|MONACO_T"] [data-sust]`); const pid = b ? b.dataset.sust.split('|')[2] : null; openPicker(v, 'MONACO_T', document.body); return pid; }, MIE);
    await llega(pg, () => !!document.querySelector('#pickerPop .plist .prowp'), null, 4000);
    const coc = filas.filter(f => f.grupo === 'COCINA');
    ok('arriba, un grupo «COCINA» con quien puede llevarla', coc.length > 0, JSON.stringify(filas.slice(0, 5)));
    ok('la ★ recomendada es la primera de la cocina', coc.length > 0 && coc[0].rec, JSON.stringify(coc.slice(0, 2)));
    ok('y es alguien que lleva la cocina del Mónaco ese día', await pg.evaluate(([v, pid]) => !!pid && puedeCocina(S, personaDeId(pid), 'MONACO', v), [MIE, coc[0] && coc[0].pid]), coc[0] && coc[0].pid);
    ok('la ★ de Hoy en esa casilla es la misma', !!starHoy && starHoy === (coc[0] && coc[0].pid), JSON.stringify({ starHoy, sel: coc[0] && coc[0].pid }));
    const noP = filas.filter(f => f.grupo === 'NO PUEDEN');
    ok(`en «NO PUEDEN» (${noP.length}) nadie sin regla ni motivo`, noP.length > 0 && noP.every(f => f.regla.trim() && f.motivo.trim()), JSON.stringify(noP.filter(f => !f.regla.trim() || !f.motivo.trim())));
    // (revisión F4) quien lleva la cocina que falta se fuerza como cocina (la fila lo dice con data-cocina)
    const forz = await pg.evaluate(([v, filas]) => Object.fromEntries(filas.map(f => [f.pid, puedeEstar(S, S.staff, estadoDeIso(v), v, 'MONACO_T', f.pid, Object.assign({ forzar: true, permitirPartido: true }, f.cocina ? { puesto: 'cocina', cocina: true } : { puesto: 'sala' })).ok])), [MIE, noP]);
    const malForz = noP.filter(f => f.forzar !== !!forz[f.pid]);
    ok('«forzar» sale justo donde se puede forzar (no con una ausencia ni con otro local esa tarde)', !malForz.length, JSON.stringify(malForz));
    ok('quien tiene una ausencia ese día sale sin «forzar»', noP.filter(f => /vacaciones|baja|permiso|día libre/i.test(f.motivo)).every(f => !f.forzar), JSON.stringify(noP.filter(f => /vacaciones|baja|permiso|día libre/i.test(f.motivo))));
    // pulsar la fila de la cocina la pone llevando la cocina
    const pid = coc[0] && coc[0].pid;
    if (pid) {
      await pg.click(`#pickerPop .prowp.coc[data-pickpid="${pid}"]`);
      await llega(pg, () => !document.querySelector('#pickerPop'), null, 3000);
      const en = await pg.evaluate(([v, p]) => asignados(estadoDeIso(v), v, 'MONACO_T').find(x => x.pid === p) || null, [MIE, pid]);
      ok('al pulsarla entra llevando la cocina', !!en && en.cocina, JSON.stringify(en));
      ok('y la casilla ya no está «sin cocina»', await pg.evaluate(v => !revisarTurno(S, S.staff, estadoDeIso(v), v, 'MONACO_T').sinCocina, MIE));
    }
    await pg.context().close();
  });

  // ══ 2) la hoja impresa del Generador: «se destraparía si…» sale de la misma puerta ══
  console.log('── 2) Hoja impresa del Generador, semana del 28/09: «se destraparía si…»');
  await seccion('hoja', async () => {
    const pg = await pagina('hoja');
    const r = await pg.evaluate(lunes => {
      const res = generarSemana(S, S.staff, estadoSemana(lunes), lunes, { simular: true });
      abrirImpresionSemanaGenerada(res, {});
      const textos = [...document.querySelectorAll('#printRoot .pxg-des')].map(x => x.textContent);
      // (revisión F4, cliente) «Faltan un para el mínimo de 3»: con un hueco de uno, «Falta uno»
      const hu = res.huecos.find(h => h.tipo !== 'primero');
      const uno = hu ? pxgHuecos(Object.assign({}, res, { huecos: [Object.assign({}, hu, { faltan: 1, minimo: 3 })] })) : '';
      const dos = hu ? pxgHuecos(Object.assign({}, res, { huecos: [Object.assign({}, hu, { faltan: 2, minimo: 3 })] })) : '';
      const txt = h => { const d = document.createElement('div'); d.innerHTML = h; return d.textContent; };
      return { n: res.huecos.length, textos, uno: txt(uno), dos: txt(dos) };
    }, LUNES);
    ok(`la hoja se imprime con ${r.n} huecos y su «se destraparía / no se destrapa»`, r.textos.length === r.n && r.textos.every(t => /destrapa/.test(t)), JSON.stringify(r.textos.slice(0, 3)));
    ok('ninguna pista le propone a Dulce (en standby) levantar «no sale el primero»', !r.textos.some(t => /Dulce, que no sale el primero/.test(t)), JSON.stringify(r.textos.filter(t => /Dulce/.test(t))));
    ok('un hueco de uno dice «Falta uno para el mínimo de 3», no «Faltan un»', /Falta uno para el mínimo de 3/.test(r.uno) && !/Faltan un /.test(r.uno), r.uno.slice(0, 200));
    ok('y uno de dos, «Faltan dos para el mínimo de 3»', /Faltan dos para el mínimo de 3/.test(r.dos), r.dos.slice(0, 200));
    // (revisión F4, modelo) el caso en que la hoja de antes SÍ se lo proponía: la tarde del Mónaco del
    // miércoles 30 solo con Jenny, que viene de la mañana de El 33 (nadie abre). Dulce está en standby y
    // no sale la primera: dos condiciones, no una
    const dul = await pg.evaluate(() => {
      const v = '2026-09-30', e = estadoDeIso(v, true);
      for (const pid of pidsEn(e, v, 'MONACO_T')) desasignar(e, v, 'MONACO_T', pid);
      if (!pidsEn(e, v, 'EL33_M').includes('jenny')) asignar(e, S, S.staff, v, 'EL33_M', 'jenny', { forzar: true, permitirPartido: true });
      asignar(e, S, S.staff, v, 'MONACO_T', 'jenny', { forzar: true, permitirPartido: true });
      return { primero: primeroDe(S, S.staff, e, v, 'MONACO_T'), hoja: pxgDestrapa({ estado: e }, { iso: v, turnoId: 'MONACO_T', tipo: 'primero' }) };
    });
    ok('la tarde del Mónaco del 30/09 se queda sin quien abra (Jenny viene de la mañana de El 33)', !dul.primero, JSON.stringify(dul.primero));
    ok('la hoja no le propone a Dulce (standby y «no sale la primera») para abrirla', !dul.hoja.some(x => x.nombre === 'Dulce'), JSON.stringify(dul.hoja));
    // el veto de Mari Luz es de los lunes: el martes 29, con la mañana de Pasarela corta, la hoja no se lo pone
    const mar = await pg.evaluate(() => {
      const v = '2026-09-29', e = estadoDeIso(v, true);
      for (const pid of pidsEn(e, v, 'PASARELA_M')) if (pid !== 'lola') desasignar(e, v, 'PASARELA_M', pid);
      return pxgDestrapa({ estado: e }, { iso: v, turnoId: 'PASARELA_M', tipo: 'faltan' }).find(x => x.nombre === 'Mari Luz') || null;
    });
    ok('el martes 29 la hoja no le pone a Mari Luz su veto de los lunes', !mar || !/no hace mañanas/.test(mar.motivo), JSON.stringify(mar));
    // y después, el cruce con el modelo: cada pista es exactamente una regla forzable de la puerta
    const casos = await pg.evaluate(lunes => {
      const res = generarSemana(S, S.staff, estadoSemana(lunes), lunes, { simular: true });
      const ctx = crearContexto(S, S.staff, res.estado);
      return res.huecos.map(hu => {
        const hoja = pxgDestrapa(res, hu);
        const malas = hoja.filter(x => {
          const p = S.staff.find(q => q.nombre === x.nombre);
          const dentro = pidsEn(res.estado, hu.iso, hu.turnoId).includes(p.id);
          const ev = evaluarPlaza(ctx, hu.iso, hu.turnoId, p.id, { puesto: 'sala', apoyos: true, primero: hu.tipo === 'primero', yaDentro: dentro });
          const bl = dentro ? ev.bloqueos.filter(b => b.primero) : ev.bloqueos;
          return !(bl.length === 1 && bl[0].forzable);
        });
        return { hu: `${hu.iso} ${hu.turnoId} ${hu.tipo}`, hoja: hoja.map(x => `${x.nombre}: ${x.motivo}`), unaSola: !malas.length };
      });
    }, LUNES);
    ok('cada pista de la hoja es exactamente una regla forzable de la puerta', casos.every(c => c.unaSola), JSON.stringify(casos.filter(c => !c.unaSola)));
    await pg.context().close();
  });

  // ══ 3) (revisión F4) la cocina «con aviso» y «forzar» con todas las reglas ══
  console.log('── 3) Selector de la tarde del Mónaco del lunes 28/09 sin Hojan: la cocina con aviso y «forzar»');
  await seccion('cocina con aviso', async () => {
    const pg = await pagina('cocina');
    const V = '2026-09-28';
    const abrir = async () => {
      await pg.evaluate(v => { closePicker(); irAIso(v); renderVistaActiva(); }, V);
      await pg.click(`#view-hoy [data-pick="${V}|MONACO_T"]`);
      await llega(pg, () => !!document.querySelector('#pickerPop .plist .prowp'), null, 4000);
      return filasSelector(pg);
    };
    await pg.evaluate(v => { const e = estadoDeIso(v, true); desasignar(e, v, 'MONACO_T', 'hojan'); saveState(); }, V);
    let filas = await abrir();
    const jen = filas.find(f => f.pid === 'jenny');
    ok('Jenny (titular de esa cocina, que ese lunes lleva la de la mañana) sale «con aviso» marcada de cocina', !!jen && jen.grupo === 'CON AVISO' && jen.cocina && jen.aviso, JSON.stringify(jen));
    ok('con su razón de cocina y el aviso del partido', !!jen && /cocina titular de Bar Mónaco/.test(jen.motivo) && /partido no declarado/.test(jen.motivo), jen && jen.motivo);
    ok('y ya no en «no pueden» con un motivo de sala', !filas.some(f => f.pid === 'jenny' && f.grupo === 'NO PUEDEN'), JSON.stringify(filas.filter(f => f.pid === 'jenny')));
    // (si no está entre las que se pueden pulsar, se sigue con lo demás: la comprobación ya ha fallado)
    if (await pg.$('#pickerPop .prowp[data-pickpid="jenny"]')) {
      await pg.click('#pickerPop .prowp[data-pickpid="jenny"]');
      await llega(pg, () => !document.querySelector('#pickerPop'), null, 3000);
      const enJ = await pg.evaluate(v => ({ e: asignados(estadoDeIso(v), v, 'MONACO_T').find(x => x.pid === 'jenny') || null, sinCocina: revisarTurno(S, S.staff, estadoDeIso(v), v, 'MONACO_T').sinCocina }), V);
      ok('al pulsarla entra llevando la cocina, con el aviso del partido', !!enJ.e && enJ.e.cocina && (enJ.e.avisos || []).some(a => /partido/.test(a)) && !enJ.sinCocina, JSON.stringify(enJ));
      await pg.keyboard.press('Control+z');
      ok('Ctrl+Z la quita', await llega(pg, v => !pidsEn(estadoDeIso(v), v, 'MONACO_T').includes('jenny'), V, 3000) >= 0);
    } else ok('al pulsarla entra llevando la cocina, con el aviso del partido', false, 'Jenny no se puede pulsar');
    // Esmeralda: titular de la cocina del Mónaco, siempre de mañana: «no pueden», y «forzar» la pone de cocina
    filas = await abrir();
    const esm = filas.find(f => f.pid === 'esmeralda');
    ok('Esmeralda sale en «no pueden» marcada de cocina, con su regla', !!esm && esm.grupo === 'NO PUEDEN' && esm.cocina && /Mañanas y tardes/.test(esm.regla) && esm.forzar, JSON.stringify(esm));
    pg.dialogos.length = 0;
    await pg.click('#pickerPop [data-forzar="esmeralda"]');
    await llega(pg, () => !document.querySelector('#pickerPop'), null, 3000);
    const enE = await pg.evaluate(v => ({ e: asignados(estadoDeIso(v), v, 'MONACO_T').find(x => x.pid === 'esmeralda') || null, sinCocina: revisarTurno(S, S.staff, estadoDeIso(v), v, 'MONACO_T').sinCocina }), V);
    ok('«forzar» la pone llevando la cocina (la casilla deja de estar sin cocina)', !!enE.e && enE.e.cocina && enE.e.forzado && !enE.sinCocina, JSON.stringify(enE));
    await pg.keyboard.press('Control+z');
    await llega(pg, v => !pidsEn(estadoDeIso(v), v, 'MONACO_T').includes('esmeralda'), V, 3000);
    // Jacquelin: solo Zapatillera, siempre de mañana y ya en la mañana de Zapatillera (un partido)
    filas = await abrir();
    pg.dialogos.length = 0;
    await pg.click('#pickerPop [data-forzar="jacquelin"]');
    await llega(pg, () => !document.querySelector('#pickerPop'), null, 3000);
    const pregunta = pg.dialogos[0] || '';
    ok('la pregunta de «forzar» lista TODAS las reglas, cada una con la suya', /Locales donde trabaja — solo Zapatillera/.test(pregunta) && /Mañanas y tardes — siempre de mañana/.test(pregunta) && /Días de partido — partido no declarado los lunes/.test(pregunta), pregunta);
    const avisoFinal = await pg.evaluate(() => [...document.querySelectorAll('#toasts .toast')].map(t => t.textContent).pop() || '');
    ok('y el aviso de después pone cada aviso con su regla', /Locales donde trabaja: solo Zapatillera/.test(avisoFinal) && /Mañanas y tardes: siempre de mañana/.test(avisoFinal) && /Días de partido: partido no declarado los lunes/.test(avisoFinal), avisoFinal);
    // lo mismo desde el Mes (la hoja de una persona en un día → «Poner en…»)
    await pg.keyboard.press('Control+z');
    await llega(pg, v => !pidsEn(estadoDeIso(v), v, 'MONACO_T').includes('jacquelin'), V, 3000);
    pg.dialogos.length = 0;
    await pg.evaluate(v => { closePicker(); openDiaPersona('jacquelin', v, document.body); }, V);
    await llega(pg, () => !!document.querySelector('#diaPersPop [data-pon="MONACO_T"]'), null, 3000);
    await pg.click('#diaPersPop [data-pon="MONACO_T"]');
    await llega(pg, v => pidsEn(estadoDeIso(v), v, 'MONACO_T').includes('jacquelin'), V, 3000);
    const preguntaMes = pg.dialogos[0] || '';
    ok('en el Mes, la pregunta también lista todas las reglas', /Locales donde trabaja — solo Zapatillera/.test(preguntaMes) && /Mañanas y tardes — siempre de mañana/.test(preguntaMes) && /Días de partido — partido no declarado los lunes/.test(preguntaMes), preguntaMes);
    const avisoMes = await pg.evaluate(() => [...document.querySelectorAll('#toasts .toast')].map(t => t.textContent).pop() || '');
    ok('y su aviso, cada una con su regla', /Locales donde trabaja: solo Zapatillera/.test(avisoMes) && /Días de partido: partido no declarado los lunes/.test(avisoMes), avisoMes);
    await pg.context().close();
  });

  // ══ 4) (revisión F4) la semana que cruza de mes: la carga cuenta la semana entera ══
  console.log('── 4) La semana del 28/09 al 04/10 (cruza de mes): «N turnos esa semana» con la semana entera');
  await seccion('semana que cruza de mes', async () => {
    const pg = await pagina('semana cruzada');
    const r = await pg.evaluate(() => {
      const semana = []; for (let k = 0; k < 7; k++) semana.push(addDias('2026-09-28', k));
      const real = pid => semana.reduce((n, iso) => n + turnosDe(S).filter(t => pidsEn(estadoDeIso(iso), iso, t.id).includes(pid)).length, 0);
      const out = [];
      for (const [iso, tid] of [['2026-09-28', 'MONACO_T'], ['2026-10-01', 'EL33_T'], ['2026-10-04', 'PASARELA_T']]) {
        // un hueco en la casilla, para que Hoy enseñe la ★
        const e = estadoDeIso(iso, true), l = pidsEn(e, iso, tid); desasignar(e, iso, tid, l[l.length - 1]);
        irAIso(iso); renderVistaActiva();
        const b = document.querySelector(`#view-hoy [data-cas="${iso}|${tid}"] [data-sust]`);
        if (b) { const m = (b.title || '').match(/(\d+) turnos? esa semana/); const pid = b.dataset.sust.split('|')[2]; out.push({ iso, tid, pid, donde: '★ de Hoy', dice: m ? +m[1] : null, real: real(pid) }); }
        openPicker(iso, tid, document.body);
        for (const el of document.querySelectorAll('#pickerPop [data-pickpid]')) { const m = el.textContent.match(/(\d+) turnos? esa semana/); if (m) out.push({ iso, tid, pid: el.dataset.pickpid, donde: 'selector', dice: +m[1], real: real(el.dataset.pickpid) }); }
        closePicker();
      }
      return out;
    });
    const mal = r.filter(x => x.dice !== x.real);
    ok(`el selector dice los turnos de la semana entera (${r.filter(x => x.donde === 'selector').length} filas)`, r.filter(x => x.donde === 'selector').length > 5 && !mal.some(x => x.donde === 'selector'), JSON.stringify(mal.slice(0, 4)));
    ok('el lunes 28 Cristian sale con sus 7 turnos de esa semana', r.some(x => x.iso === '2026-09-28' && x.pid === 'cristian' && x.dice === 7), JSON.stringify(r.filter(x => x.pid === 'cristian')));
    ok(`la ★ de Hoy también (${r.filter(x => x.donde === '★ de Hoy').length} casillas)`, r.some(x => x.donde === '★ de Hoy') && !mal.some(x => x.donde === '★ de Hoy'), JSON.stringify(r.filter(x => x.donde === '★ de Hoy')));
    // el Generador → Periodo: el jueves 1 vacío y sin semana tipo; la razón del primero que entra cuenta
    // sus turnos de lunes a miércoles (septiembre) y de viernes a domingo
    const per = await pg.evaluate(() => {
      const v = '2026-10-01', e = estadoDeIso(v, true);
      for (const t of turnosDe(S)) for (const pid of pidsEn(e, v, t.id)) desasignar(e, v, t.id, pid);
      GEN.opts.sinPatron = true;
      const res = generarSobre(estadosDelRango(v, v, true), v, v, true);
      const a = res.aplicados[0];
      const semana = []; for (let k = 0; k < 7; k++) semana.push(addDias('2026-09-28', k));
      const real = semana.reduce((n, iso) => n + turnosDe(S).filter(t => pidsEn(estadoDeIso(iso), iso, t.id).includes(a.pid)).length, 0);
      const m = /(\d+) turnos? esa semana/.exec(a.razon || '');
      return { pid: a.pid, razon: a.razon, dice: m ? +m[1] : null, real };
    });
    ok('el Generador → Periodo cuenta también los días de la semana que caen en septiembre', per.dice !== null && per.dice === per.real, JSON.stringify(per));
    await pg.context().close();
  });
} finally {
  await br.close(); srv.close();
}
ok('sin errores de página', !errores.length, errores.join(' | '));
resumen();
