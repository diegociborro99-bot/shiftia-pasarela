// LA APP EN MODO LOCAL (14/09). Sin servidor: el repo servido por un servidor
// estático propio, sesión local ya abierta y `?demo=1` (el mes en pantalla se
// genera con la semana tipo). Se recorren las siete vistas en escritorio (1280×900)
// y la barra inferior en el móvil (400×820): selector de Hoy, cuadrante de la
// Semana, botones de fútbol del Mes con deshacer, generador con historial,
// revisión, ficha, horas, entrevistas, gestor de cobertura (plan A / plan B, aplicar,
// deshacer), vaciar la semana, quitar el aviso del partido, tema oscuro, impresión y persistencia.
// Cuenta como fallo un `pageerror` o un assert; los errores de red de la consola, no.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cargarChromium, contador, llega, prepararPagina, asignarDesdeSelector } from './e2e-util.mjs';

const { chromium, CHROMIUM } = await cargarChromium();
const RAIZ = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'));
const { ok, resumen } = contador();
const t0 = Date.now();

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

const HOY = new Date(); const pad = n => String(n).padStart(2, '0');
const ISO_HOY = `${HOY.getFullYear()}-${pad(HOY.getMonth() + 1)}-${pad(HOY.getDate())}`, CLAVE = ISO_HOY.slice(0, 7);
const errores = [];
const masDias = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const abrirContexto = async (br, viewport, movil) => {
  const ctx = await br.newContext(Object.assign({ viewport }, movil ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}));
  // la app pide contraseña en modo local salvo que la sesión ya esté abierta en la pestaña
  await ctx.addInitScript(() => { try { sessionStorage.setItem('shiftia_pas_sesion', '1'); sessionStorage.setItem('shiftia_pas_rol', 'admin'); } catch (e) {} });
  return ctx;
};
const visible = async (pg, sel) => pg.evaluate(s => { const el = document.querySelector(s); if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; }, sel);
const vista = async (pg, v) => { await pg.click(`.tab[data-v="${v}"]`); return llega(pg, v => { const s = document.getElementById('view-' + v); return !!s && !s.classList.contains('hidden'); }, v, 4000); };
const br = await chromium.launch({ executablePath: CHROMIUM, args: ['--no-sandbox'] });
let asig = null;
try {
  // ══════════════ ESCRITORIO 1280×900 ══════════════
  console.log('── escritorio 1280×900 · modo local · ?demo=1');
  const ctx = await abrirContexto(br, { width: 1280, height: 900 });
  const pg = await ctx.newPage();
  await prepararPagina(pg, errores, 'escritorio');
  await pg.goto(BASE + '/index.html?demo=1');
  await pg.waitForSelector('#view-hoy .loccard', { timeout: 15000 });
  ok('la app arranca en modo local sin pedir contraseña (sesión ya abierta)', !(await pg.$('.lockscr')) && await pg.evaluate(() => SRV.on === false));
  const demo = await pg.evaluate(() => ({ asig: Object.keys(est.asig).length, mes: mesKey(S.y, S.m), plazas: Object.values(est.asig).reduce((a, d) => a + Object.values(d).reduce((b, l) => b + l.length, 0), 0) }));
  ok(`?demo=1 genera el mes en pantalla (${demo.mes}: ${demo.asig} días con ${demo.plazas} plazas)`, demo.asig > 0 && demo.mes === CLAVE, JSON.stringify(demo));

  // 1) las nueve vistas cargan sin errores de página (Actividad se ve en modo local: es Diego probando)
  ok('modo local: la pestaña Actividad se ve (body.rol-programador)', await llega(pg, () => document.body.classList.contains('rol-programador') && !!document.querySelector('.tab[data-v="actividad"]').offsetParent, null, 4000) >= 0);
  for (const v of ['hoy', 'semana', 'mes', 'equipo', 'horas', 'generador', 'cobertura', 'actividad', 'entrevistas']) {
    const antes = errores.length;
    const t = await vista(pg, v);
    ok(`vista «${v}» carga y se muestra sin errores de página`, t >= 0 && errores.length === antes, errores.slice(antes).join(' | '));
  }
  ok('Actividad sin servidor: solo el historial de la planilla (la siembra del demo) y la nota', await pg.evaluate(() => document.querySelectorAll('#actRoot .actrow[data-accion="hist-ia"]').length >= 1 && /Sin servidor/.test(document.getElementById('actMeta').textContent) && document.querySelectorAll('#actKpis .kpi').length === 5), await pg.evaluate(() => (document.getElementById('actRoot') || { textContent: '' }).textContent.slice(0, 160)));

  // 1b) las barras de Semana y Mes: los botones no se pisan ni se salen, a cualquier ancho
  // (Diego, 17/09: «el calendario ocupa mucho y descoloca los botones, unos se pisan a otros»)
  const barra = (v) => pg.evaluate(vista => {
    const bs = [...document.querySelectorAll(`#view-${vista} .dacts > *`)].filter(b => b.offsetParent && b.getBoundingClientRect().width > 0);
    const r = bs.map(b => ({ n: (b.textContent || b.id || '').replace(/\s+/g, ' ').trim().slice(0, 18), c: b.getBoundingClientRect() }));
    const pisan = [], fuera = [];
    for (let i = 0; i < r.length; i++) {
      if (r[i].c.left < -0.5 || r[i].c.right > innerWidth + 0.5) fuera.push(r[i].n);
      for (let j = i + 1; j < r.length; j++) {
        const a = r[i].c, b = r[j].c;
        if (a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5) pisan.push(r[i].n + ' × ' + r[j].n);
      }
    }
    // las filas se agrupan por solape vertical (cada botón tiene su alto) y todas tienen que
    // arrancar del mismo borde izquierdo: nada de filas sueltas a la derecha
    const filas = [];
    for (const x of r.slice().sort((a, b) => a.c.top - b.c.top)) {
      const f = filas.find(f => x.c.top < f.bot - 4 && f.top < x.c.bottom - 4);
      if (f) { f.bot = Math.max(f.bot, x.c.bottom); f.izq = Math.min(f.izq, x.c.left); f.n.push(x.n); }
      else filas.push({ top: x.c.top, bot: x.c.bottom, izq: x.c.left, n: [x.n] });
    }
    return { n: r.length, pisan, fuera, filas: filas.length, primerosDeFila: filas.map(f => Math.round(f.izq)), reparto: filas.map(f => f.n.join(' + ')) };
  }, v);
  for (const ancho of [1280, 1024]) {
    await pg.setViewportSize({ width: ancho, height: 900 });
    for (const v of ['semana', 'mes']) {
      await vista(pg, v); await pg.waitForTimeout(250);
      const b = await barra(v);
      ok(`barra de ${v} a ${ancho}px: ${b.n} botones, ninguno se pisa ni se sale`, !b.pisan.length && !b.fuera.length, JSON.stringify(b));
      ok(`barra de ${v} a ${ancho}px: todas las filas arrancan del mismo borde`, new Set(b.primerosDeFila).size === 1, JSON.stringify(b.primerosDeFila));
    }
  }
  await pg.setViewportSize({ width: 1280, height: 900 });

  // 2) Hoy: cuatro locales y el selector asigna a alguien de «pueden»
  await vista(pg, 'hoy');
  ok('Hoy enseña las tarjetas de los 4 locales', await pg.$$eval('#view-hoy .loccard', x => x.length) === 4, await pg.$$eval('#view-hoy .loccard', x => x.length));
  ok('cada local tiene sus dos casillas (mañana y tarde)', await pg.$$eval('#view-hoy .casilla', x => x.length) === 8, await pg.$$eval('#view-hoy .casilla', x => x.length));
  asig = await asignarDesdeSelector(pg);
  ok(`el selector se abre en una casilla y lista candidatos en «pueden» (${asig ? asig.via : '-'})`, !!asig, 'ningún [data-pick] visible con candidatos en «pueden», ni liberando una plaza');
  ok(`al elegir a ${asig ? asig.pid : '?'} la casilla gana una persona (${asig ? asig.antes + '→' + asig.despues : '-'})`, !!asig && asig.despues === asig.antes + 1, asig && JSON.stringify(asig));
  ok('el selector se cierra tras elegir', !(await pg.$('#pickerPop')));
  ok('la asignación queda en el estado con origen manual', !!asig && await pg.evaluate(a => (est.asig[a.iso] && est.asig[a.iso][a.tid] || []).some(x => x.pid === a.pid && x.origen === 'manual'), asig));

  // 2b) Registro de apoyos (José, 18/09: «al tocar en los que estén marcados como apoyo…
  // ajustar apoyo… a qué hora tiene que entrar, cada día»; «los apoyos son los extras que
  // hay que pagarle»). Se mete por la interfaz el «Leo de 19 a cierre» del correo de Aroa.
  const objetivo = await pg.evaluate(() => {
    for (const [iso, dia] of Object.entries(est.asig)) for (const [tid, lista] of Object.entries(dia)) for (const x of lista) if (esApoyo(personaDeId(x.pid)) && !x.ini) return { iso, tid, pid: x.pid };
    return null;
  });
  ok('en el mes hay algún apoyo colocado en una casilla', !!objetivo, 'ningún apoyo en la planilla del demo');
  await pg.evaluate(o => { S.day = +o.iso.slice(8, 10); renderDia(); }, objetivo);
  const selChip = `#view-hoy .pchip[data-pid="${objetivo.pid}"][data-turno="${objetivo.iso}|${objetivo.tid}"]`;
  await pg.click(selChip);
  ok('el chip de un apoyo abre su menú', await llega(pg, () => !!document.querySelector('#menuTurnoPop'), null, 3000) >= 0);
  ok('y «Ajustar apoyo» va el primero', await pg.$eval('#menuTurnoPop [data-mt]', b => b.dataset.mt === 'hora' && /Ajustar apoyo/.test(b.textContent)));
  await pg.click('#menuTurnoPop [data-mt="hora"]');
  ok('se despliega el formulario de entrada y salida, con «hasta el cierre»', await llega(pg, () => !!document.querySelector('#menuTurnoPop #trIni') && !!document.querySelector('#menuTurnoPop #trFin') && !!document.querySelector('#menuTurnoPop [data-trcierre]'), null, 3000) >= 0);
  await pg.fill('#menuTurnoPop #trIni', '19:00');
  await pg.click('#menuTurnoPop [data-trcierre]');
  const cierreEsperado = await pg.evaluate(o => cierreDe(localDe(S, partirTurno(o.tid).localId), isoDow(o.iso)), objetivo);
  const cierreForm = await pg.$eval('#menuTurnoPop #trFin', i => i.value);
  ok(`«hasta el cierre» rellena la hora de cierre del local ese día (${cierreForm})`, /^\d\d:\d\d$/.test(cierreForm) && cierreForm === cierreEsperado, JSON.stringify({ cierreForm, cierreEsperado }));
  await pg.click('#menuTurnoPop [data-trok]');
  ok('al guardar, el chip de Hoy enseña el tramo («de tal hora a tal hora»)', await llega(pg, ([sel, c]) => { const ch = document.querySelector(sel); return !!ch && ch.textContent.includes('19:00–' + c); }, [selChip, cierreForm], 3000) >= 0);
  ok('y queda en la asignación como ini/fin', await pg.evaluate(([o, c]) => { const x = est.asig[o.iso][o.tid].find(y => y.pid === o.pid); return x.ini === '19:00' && x.fin === c; }, [objetivo, cierreForm]));
  await vista(pg, 'semana');
  await pg.evaluate(o => { S.semLunes = mondayOf(o.iso); renderSemana(); }, objetivo);
  ok('en Semana el chip también lo lleva, compacto', await pg.evaluate(o => { const w = document.querySelector(`#semRoot [data-wpers="${o.iso}|${o.tid}|${o.pid}"]`); return !!w && /19/.test(w.textContent); }, objetivo));
  await vista(pg, 'horas');
  await pg.evaluate(() => { S.hY = S.y; S.hM = S.m; renderHoras(); });
  const regApoyo = await pg.evaluate(o => { const t = document.querySelector(`#horasRoot .hapoyos [data-apoyo="${o.pid}"]`); return t ? t.textContent.replace(/\s+/g, ' ') : null; }, objetivo);
  ok('Horas lleva el registro de apoyos, con ese día y ese tramo', !!regApoyo && regApoyo.includes('19:00') && regApoyo.includes(cierreForm), regApoyo);
  ok('y avisa de los tramos sin ajustar, que cuentan el turno entero', await pg.evaluate(() => /sin ajustar/i.test((document.querySelector('#horasRoot .hapoyos') || {}).textContent || '')));
  await vista(pg, 'hoy');

  // 3) Semana: 8 filas local×franja, sin desbordar, con pie de descansos
  await vista(pg, 'semana');
  await pg.waitForSelector('table.semt', { timeout: 5000 });
  const filas = await pg.$$eval('table.semt tbody tr:not(.locsec):not(.piedesc)', x => x.length);
  ok('Semana: 8 filas local × franja (4 locales × 2)', filas === 8, filas);
  ok('Semana: 4 cabeceras de local', await pg.$$eval('table.semt tr.locsec', x => x.length) === 4);
  const anchos = await pg.evaluate(() => ({ tabla: document.querySelector('table.semt').getBoundingClientRect().width, root: document.getElementById('semRoot').clientWidth }));
  ok(`Semana: el cuadrante no desborda a 1280 (tabla ${Math.round(anchos.tabla)} ≤ contenedor ${anchos.root} + 2)`, anchos.tabla <= anchos.root + 2, JSON.stringify(anchos));
  ok('Semana: existe el pie de descansos y ausencias', await pg.$$eval('table.semt tr.piedesc', x => x.length) >= 1);
  ok('Semana: la página no hace scroll horizontal', await pg.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));

  // 4) Mes: botones de fútbol, evento del Barcelona, KPI y deshacer
  await vista(pg, 'mes');
  await pg.waitForSelector('#mesRoot table.plan', { timeout: 5000 });
  const futbol = await pg.$$eval('#futbolBtns [data-futbol]', bs => bs.map(b => b.dataset.futbol).filter(Boolean));
  ok('Mes: tres botones de fútbol (Barcelona, Madrid, Elche)', futbol.length === 3 && futbol.includes('barcelona'), JSON.stringify(futbol));
  const kpiEventos = () => pg.evaluate(() => { const k = [...document.querySelectorAll('#kpis .kpi')].find(x => /eventos/i.test(x.textContent)); return k ? k.querySelector('.knum').textContent.trim() : null; });
  const evAntes = await pg.evaluate(() => ({ n: eventosMes(est).length, chips: document.querySelectorAll('#mesRoot .mesev .evchip').length }));
  ok(`Mes: el KPI «eventos» está pintado (${evAntes.n} antes)`, await llega(pg, n => { const k = [...document.querySelectorAll('#kpis .kpi')].find(x => /eventos/i.test(x.textContent)); return !!k && k.querySelector('.knum').textContent.trim() === String(n); }, evAntes.n, 3000) >= 0, await kpiEventos());
  await pg.click('#futbolBtns [data-futbol="barcelona"]');
  await pg.waitForSelector('#evOvl #evForm', { timeout: 4000 });
  ok('el botón del Barcelona abre el formulario del evento con su nombre', /Barcelona/.test(await pg.inputValue('#evOvl #evNombre')), await pg.inputValue('#evOvl #evNombre'));
  ok('el evento propone la fecha del día en pantalla', await pg.inputValue('#evOvl #evIso') === await pg.evaluate(() => isoDia()));
  ok('el refuerzo por local viene relleno del equipo (4 locales)', await pg.$$eval('#evOvl [data-ref]', x => x.length) === 4);
  await pg.uncheck('#evOvl #evProponer');   // sin saltar al generador: se comprueba el mes
  await pg.click('#evOvl #evForm button[type="submit"]');
  ok('al guardar se cierra el formulario', await llega(pg, () => !document.querySelector('#evOvl'), null, 3000) >= 0);
  ok('aparece el chip del evento en el mes', await llega(pg, n => document.querySelectorAll('#mesRoot .mesev .evchip').length === n, evAntes.chips + 1, 3000) >= 0, await pg.$$eval('#mesRoot .mesev .evchip', x => x.length));
  ok('el chip lleva el nombre del partido', await pg.$$eval('#mesRoot .mesev .evchip', x => x.some(c => /Barcelona/.test(c.textContent))));
  ok(`el KPI «eventos» sube a ${evAntes.n + 1}`, await llega(pg, n => { const k = [...document.querySelectorAll('#kpis .kpi')].find(x => /eventos/i.test(x.textContent)); return !!k && k.querySelector('.knum').textContent.trim() === String(n); }, evAntes.n + 1, 3000) >= 0, await kpiEventos());
  ok('el día queda marcado con ⚽ en la cabecera del mes', await pg.$$eval('#mesRoot th.day.evday', x => x.length) >= 1);
  await pg.keyboard.press('Control+z');
  ok('Ctrl+Z quita el evento (chip fuera)', await llega(pg, n => document.querySelectorAll('#mesRoot .mesev .evchip').length === n, evAntes.chips, 3000) >= 0, await pg.$$eval('#mesRoot .mesev .evchip', x => x.length));
  ok(`y el KPI vuelve a ${evAntes.n}`, await llega(pg, n => { const k = [...document.querySelectorAll('#kpis .kpi')].find(x => /eventos/i.test(x.textContent)); return !!k && k.querySelector('.knum').textContent.trim() === String(n); }, evAntes.n, 3000) >= 0, await kpiEventos());
  ok('el historial registra el evento y el deshecho', await pg.evaluate(() => (S.historial || []).some(h => /Evento: Juega el Barcelona/.test(h.txt)) && (S.historial || []).some(h => h.tipo === 'undo' && /evento/.test(h.txt))));

  // 4b) El aviso del partido se quita desde el chip (Hoy) o el ⚽ de la cabecera (Mes), con deshacer
  const evDemo = await pg.evaluate(() => (S.eventos || []).map(e => ({ id: e.id, iso: e.iso, nombre: e.nombre }))[0] || null);
  ok('hay un partido de muestra en el mes (sembrado con ?demo=1)', !!evDemo, JSON.stringify(await pg.evaluate(() => S.eventos)));
  if (evDemo) {
    await pg.click(`#mesRoot th.day .evd[data-evpop="${evDemo.iso}"]`);
    ok('el ⚽ de la cabecera del mes abre el detalle del evento (#evDiaPop) sin ir al día', await llega(pg, () => !!document.querySelector('#evDiaPop') && !document.getElementById('view-mes').classList.contains('hidden'), null, 3000) >= 0);
    ok('el detalle ofrece «Quitar el evento»', await pg.$$eval('#evDiaPop [data-rmev]', x => x.length >= 1));
    await pg.click('#evDiaPop .popb[data-rmev]');   // el confirm() se acepta solo
    ok('el evento desaparece y el detalle se cierra', await llega(pg, id => !(S.eventos || []).some(e => e.id === id) && !document.querySelector('#evDiaPop'), evDemo.id, 3000) >= 0);
    ok('el historial registra el evento retirado', await pg.evaluate(n => (S.historial || []).some(h => /Evento retirado/.test(h.txt) && h.txt.includes(n)), evDemo.nombre));
    await pg.keyboard.press('Control+z');
    ok('Ctrl+Z devuelve el partido', await llega(pg, id => (S.eventos || []).some(e => e.id === id), evDemo.id, 3000) >= 0);
    await pg.evaluate(iso => irAIso(iso), evDemo.iso);
    await pg.waitForSelector('#view-hoy .evchip[data-evpop]', { timeout: 4000 });
    await pg.click('#view-hoy .evchip[data-evpop]');
    ok('en Hoy, pulsar el chip del partido abre el mismo detalle', await llega(pg, () => !!document.querySelector('#evDiaPop'), null, 3000) >= 0);
    await pg.keyboard.press('Escape');
    await pg.evaluate(() => cerrarPops());
    if (asig) await pg.evaluate(iso => irAIso(iso), asig.iso);   // de vuelta al día de la asignación de Hoy (la persistencia lo comprueba al final)
  }

  // 4c) Vaciar la semana y el mes: todas las plazas fuera, las ausencias se quedan, Ctrl+Z lo deshace
  await vista(pg, 'semana');
  const plazasSemana = () => pg.evaluate(() => { let n = 0; for (let k = 0; k < 7; k++) { const iso = addDias(S.semLunes, k); for (const l of Object.values(estadoDeIso(iso).asig[iso] || {})) n += l.length; } return n; });
  const vac = { plazas: await plazasSemana(), ausentes: await pg.evaluate(() => S.staff.filter(p => (p.ausencias || []).length).length) };
  await pg.click('#wVaciar');   // el confirm() se acepta solo
  ok(`«Vaciar la semana…» retira las ${vac.plazas} plazas de la semana en pantalla`, vac.plazas > 0 && await llega(pg, () => { for (let k = 0; k < 7; k++) { const iso = addDias(S.semLunes, k); if (Object.values(estadoDeIso(iso).asig[iso] || {}).some(l => l.length)) return false; } return true; }, null, 4000) >= 0, await plazasSemana());
  ok('las bajas y ausencias siguen en las fichas', await pg.evaluate(n => S.staff.filter(p => (p.ausencias || []).length).length === n, vac.ausentes));
  ok('la semana vacía se pinta y el historial lo registra', await pg.evaluate(() => !!document.querySelector('table.semt') && /Vaciada la semana/.test((S.historial[0] || {}).txt)));
  await pg.keyboard.press('Control+z');
  ok(`Ctrl+Z devuelve las ${vac.plazas} plazas`, await llega(pg, n => { let p = 0; for (let k = 0; k < 7; k++) { const iso = addDias(S.semLunes, k); for (const l of Object.values(estadoDeIso(iso).asig[iso] || {})) p += l.length; } return p === n; }, vac.plazas, 4000) >= 0, await plazasSemana());
  await vista(pg, 'mes');
  const plazasMes = () => pg.evaluate(() => Object.values(est.asig).reduce((a, d) => a + Object.values(d).reduce((b, l) => b + l.length, 0), 0));
  const pm0 = await plazasMes();
  await pg.click('#mVaciar');
  ok(`«Vaciar el mes…» deja el mes sin plazas (había ${pm0})`, pm0 > 0 && await llega(pg, () => Object.values(est.asig).every(d => !Object.values(d).some(l => l.length)), null, 4000) >= 0, await plazasMes());
  await pg.keyboard.press('Control+z');
  ok('Ctrl+Z devuelve el mes', await llega(pg, n => Object.values(est.asig).reduce((a, d) => a + Object.values(d).reduce((b, l) => b + l.length, 0), 0) === n, pm0, 4000) >= 0, await plazasMes());

  // 4d) Visible para el equipo: el mes en curso siempre; el siguiente se publica y se oculta desde Mes (y desde Semana)
  await vista(pg, 'mes');
  ok('el mes en curso sale como visible fijo (siempre lo ve el equipo)', await pg.$eval('#mVisibleBtn', b => b.classList.contains('fijo') && /Visible para el equipo/.test(b.textContent)));
  await pg.click('#mNext');
  await pg.waitForSelector('#mesRoot table.plan', { timeout: 5000 });
  const kSig = await pg.evaluate(() => mesKey(S.y, S.m));
  ok(`el mes siguiente (${kSig}) sale oculto al equipo`, await pg.$eval('#mVisibleBtn', b => b.classList.contains('off') && /Oculto al equipo/.test(b.textContent)));
  await pg.click('#mVisibleBtn');
  ok('pulsar lo hace visible: queda en S.mesesPublicados y el botón cambia', await llega(pg, k => (S.mesesPublicados || []).includes(k) && document.querySelector('#mVisibleBtn').classList.contains('on'), kSig, 3000) >= 0);
  ok('el historial lo registra como publicación', await pg.evaluate(() => S.historial[0].tipo === 'pub' && /visible para el equipo/.test(S.historial[0].txt)));
  await pg.click('#mVisibleBtn');
  ok('volver a pulsar lo oculta', await llega(pg, k => !(S.mesesPublicados || []).includes(k) && document.querySelector('#mVisibleBtn').classList.contains('off'), kSig, 3000) >= 0);
  await pg.click('#mPrev');
  await pg.waitForSelector('#mesRoot table.plan', { timeout: 5000 });
  await vista(pg, 'semana');
  ok('Semana también lleva el botón de visibilidad', !!(await pg.$('#wVisibleBtn')));
  if (asig) await pg.evaluate(iso => irAIso(iso), asig.iso);   // de vuelta al día de la asignación de Hoy

  // 5) Generador semanal (modo por defecto): la planilla de la semana como el prototipo del cliente
  await vista(pg, 'generador');
  await pg.waitForSelector('#genPrevia', { timeout: 5000 });
  ok('Generador: arranca en modo Semana con el lunes de la semana en pantalla', await pg.evaluate(() => GEN.modo === 'semana' && !!GEN.lunes && isoDow(GEN.lunes) === 1 && !!document.querySelector('.segm [data-modo="semana"].on')));
  await pg.evaluate(() => { GEN.opts.desdeHoy = false; });
  await pg.click('#genPrevia');
  await pg.waitForSelector('.gsemwrap table.gsem', { timeout: 8000 });
  ok('semana: una tabla por local y la de «quién libra», 7 columnas de días', await pg.evaluate(() => document.querySelectorAll('.gsemwrap table.gsem').length === 5 && document.querySelector('table.gsem thead tr').children.length === 8));
  ok('semana: KPIs (turnos, plazas, huecos, condiciones, máximo de días, descansos) y botón «Volcar a la planilla»', await pg.evaluate(() => document.querySelectorAll('.genk').length === 6 && !!document.querySelector('#genAplicar')));
  ok('semana: las casillas llevan posiciones numeradas y la cocina marcada', await pg.evaluate(() => document.querySelectorAll('.gslot > b').length > 100 && document.querySelectorAll('.gslot .gcoc').length >= 20));
  ok('semana: la lista de condiciones comprobadas está y las nuevas van marcadas', await pg.evaluate(() => document.querySelectorAll('.gcond').length >= 30 && document.querySelectorAll('.gcond .gnueva').length >= 3));
  ok('semana: «Qué ha cambiado» y «Huecos» tienen su columna', await pg.evaluate(() => [...document.querySelectorAll('.gscol h3')].map(h => h.textContent).join('|').includes('Qué ha cambiado') && [...document.querySelectorAll('.gscol h3')].map(h => h.textContent).join('|').includes('Huecos')));
  ok('semana: «Condiciones que comprueba» abre el catálogo', await pg.click('#gsCond').then(() => pg.waitForSelector('#condGenOvl', { timeout: 3000 })).then(() => pg.evaluate(() => document.querySelectorAll('#condGenOvl .gcond').length >= 30)).catch(() => false));
  await pg.evaluate(() => { const o = document.getElementById('condGenOvl'); if (o) o.remove(); });

  // 6) Generador por periodo libre: vaciar el periodo, vista previa, aplicar e historial
  await pg.click('.segm [data-modo="periodo"]');
  await pg.waitForSelector('#genD1', { timeout: 5000 });
  const rango = await pg.evaluate(() => ({ desde: GEN.desde, hasta: GEN.hasta }));
  ok(`Generador: el periodo por defecto es la semana en pantalla (${rango.desde} → ${rango.hasta})`, !!rango.desde && !!rango.hasta && rango.desde <= rango.hasta);
  if (await pg.isChecked('#genDesdeHoy')) await pg.uncheck('#genDesdeHoy');   // toda la semana, no solo desde hoy
  const plazasEn = () => pg.evaluate(r => { let n = 0; for (const iso of rangoIso(r.desde, r.hasta)) { const e = estadoDeIso(iso); for (const l of Object.values(e.asig[iso] || {})) n += l.length; } return n; }, rango);
  const antesVaciar = await plazasEn();
  await pg.click('#genLimpiar');   // el confirm se acepta en el diálogo
  ok('«Vaciar lo generado en el periodo…» deja huecos (acepta el confirm)', await llega(pg, () => /retiradas/.test((document.querySelector('#toasts') || {}).textContent || ''), null, 3000) >= 0 && await plazasEn() < antesVaciar, `${antesVaciar} → ${await plazasEn()}`);
  ok('lo puesto a mano en Hoy sobrevive al vaciado', !!asig && await pg.evaluate(a => (estadoDeIso(a.iso).asig[a.iso] && estadoDeIso(a.iso).asig[a.iso][a.tid] || []).some(x => x.pid === a.pid), asig));
  await pg.click('#genPrevia');
  ok('«Generar vista previa» produce una propuesta con el botón «Volcar a la planilla»', await llega(pg, () => { const b = document.querySelector('#genAplicar'); return !!b && !b.disabled; }, null, 15000) >= 0, (await pg.$('#genRes') ? await pg.$eval('#genRes', x => x.textContent.slice(0, 200)) : ''));
  const previa = await pg.evaluate(() => GEN.previa ? { aplicados: GEN.previa.aplicados.length, huecos: GEN.previa.huecos.length, patron: GEN.previa.aplicados.filter(a => a.origen === 'patron').length } : null);
  ok(`la vista previa propone plazas (${previa ? previa.aplicados : '?'}, ${previa ? previa.patron : '?'} de la semana tipo, ${previa ? previa.huecos : '?'} casillas cortas)`, !!previa && previa.aplicados > 0, JSON.stringify(previa));
  ok('la vista previa lista los días con sus plazas y razones', await pg.$$eval('#genRes .gendia', x => x.length) >= 1 && await pg.$$eval('#genRes .genrow', x => x.length) >= 1);
  const histAntes = await pg.evaluate(() => (S.historial || []).length);
  await pg.click('#genAplicar');
  ok('«Volcar a la planilla» vuelca la propuesta', await llega(pg, n => !document.querySelector('#genAplicar') && (S.historial || []).length > n, histAntes, 5000) >= 0);
  ok('las plazas aplicadas están en el periodo', await plazasEn() >= antesVaciar - 2, `${await plazasEn()} frente a ${antesVaciar} antes de vaciar`);
  await pg.click('#topHist');
  await pg.waitForSelector('#histOvl', { timeout: 4000 });
  const hist = await pg.$$eval('#histOvl .histrow', x => x.map(r => r.textContent.replace(/\s+/g, ' ').trim()));
  ok('el historial (#topHist) registra la generación', hist.some(h => /GENERADOR/.test(h) && /plaza\(s\) aplicadas/.test(h)), hist.slice(0, 3).join(' | '));
  ok('y también el vaciado previo', hist.some(h => /Vaciado lo generado/.test(h)));
  await pg.click('#histOvl [data-ovx]');
  ok('el historial se cierra', await llega(pg, () => !document.querySelector('#histOvl'), null, 2000) >= 0);

  // 6) Revisión, ficha de Equipo, tabla de Horas y Entrevistas
  await vista(pg, 'mes');
  await pg.click('#topRevisar');
  await pg.waitForSelector('#revOvl', { timeout: 4000 });
  const rev = await pg.evaluate(() => ({ items: document.querySelectorAll('#revOvl .revitem').length, ordenado: /Todo en orden/.test(document.querySelector('#revOvl').textContent), titulo: (document.querySelector('#revOvl .revh2') || {}).textContent }));
  ok(`Revisión (#topRevisar) abre y lista entradas (${rev.items}: «${rev.titulo}»)`, rev.items >= 1 || rev.ordenado, JSON.stringify(rev));
  ok('cada entrada de la revisión lleva a su día', rev.items === 0 || await pg.$$eval('#revOvl .revitem [data-irdia]', x => x.length) === rev.items);
  await pg.click('#revOvl [data-ovx]');
  await vista(pg, 'equipo');
  await pg.waitForSelector('#equipoRoot .cards', { timeout: 5000 });
  ok('Equipo: hay tarjetas de persona', await pg.$$eval('#equipoRoot .cards > *', x => x.length) >= 20, await pg.$$eval('#equipoRoot .cards > *', x => x.length));
  const fichaBtn = (await pg.$$('#equipoRoot [data-ficha]')).filter(Boolean);
  let abierta = false;
  for (const b of fichaBtn) { if (await b.isVisible()) { await b.click(); abierta = true; break; } }
  ok('la ficha se abre desde la tarjeta ([data-ficha] / «Editar ficha»)', abierta && await llega(pg, () => !!document.querySelector('#fichaOvl #fichNombre'), null, 4000) >= 0);
  ok('la ficha lleva nombre, puesto y cuerpo de condiciones', await pg.evaluate(() => !!document.querySelector('#fichaOvl #fichPuesto') && !!document.querySelector('#fichaOvl #fichBody') && !!(document.querySelector('#fichaOvl #fichNombre') || {}).value));
  await pg.click('#fichaOvl [data-ovx]');
  ok('la ficha se cierra con «Listo»', await llega(pg, () => !document.querySelector('#fichaOvl'), null, 2000) >= 0);
  await vista(pg, 'horas');
  await pg.waitForSelector('#horasRoot table.htab', { timeout: 5000 });
  const nHoras = await pg.$$eval('#horasRoot table.htab tbody tr.hrow', x => x.length);
  ok(`Horas: la tabla tiene ≥ 20 filas de persona (${nHoras})`, nHoras >= 20, nHoras);
  ok('Horas: hay un total de horas del mes', await pg.$$eval('#horasRoot table.htab tfoot .hh', x => x.length >= 1));
  await vista(pg, 'entrevistas');
  ok('Entrevistas: la base de José está dentro y se reparte en dos listas', await pg.evaluate(() => (S.entrevistas || []).length) === 275, await pg.evaluate(() => (S.entrevistas || []).length));
  ok('Entrevistas: la lista arranca en «Entrevistas» con sus 194 personas', await pg.$$eval('#entrevistasRoot .entrow', x => x.length) === 194, await pg.$$eval('#entrevistasRoot .entrow', x => x.length));
  ok('Entrevistas: 35 traen la entrevista contestada, con sus aptitudes', await pg.evaluate(() => (S.entrevistas || []).filter(tieneEntrevista).length) >= 35, await pg.evaluate(() => (S.entrevistas || []).filter(tieneEntrevista).length));
  // 21/09 (José): «Si sale en orden alfabético me vuelvo loco. Para que las últimas por fecha
  // me aparezcan antes». Valorar a alguien lo sube arriba, y registrar a alguien también.
  const ordenAntes = await pg.$$eval('#entrevistasRoot .entrow b', x => x.slice(0, 3).map(y => y.firstChild.textContent.trim()));
  // las que nadie ha tocado van por la fecha de la entrevista (la que leyó el OCR de las
  // hojas), la más reciente antes; las que no la tienen, al final; y nunca por nombre
  const fechasOrden = await pg.evaluate(() => ordenarCandidatos(candidatos()).filter(c => c.lista === 'ent').map(c => fechaCandidato(c)));
  const conFecha = fechasOrden.filter(Boolean);
  ok(`Entrevistas: ${conFecha.length} de 194 tienen fecha legible y salen de la más reciente a la más antigua`, conFecha.length >= 160 && conFecha.every((f, i) => !i || f <= conFecha[i - 1]), JSON.stringify(fechasOrden.slice(0, 6)));
  ok('Entrevistas: las que no tienen fecha van al final, no mezcladas', fechasOrden.slice(conFecha.length).every(f => !f), JSON.stringify(fechasOrden.slice(conFecha.length, conFecha.length + 3)));
  ok(`Entrevistas: la primera fila (${ordenAntes[0]}) no es la primera del abecedario`, ordenAntes[0] !== 'Abril Agostra Sanchez', ordenAntes);
  const fechaFila = await pg.$eval('#entrevistasRoot .entrow small', e => e.textContent);
  ok(`Entrevistas: cada fila enseña la fecha de la entrevista («${fechaFila.slice(0, 14)}»)`, /^\d{1,2} [a-z]{3} 20\d\d/.test(fechaFila), fechaFila);
  const valorado = await pg.evaluate(() => {
    const lista = ordenarCandidatos(candidatos()).filter(c => c.lista === 'ent');
    const c = lista[lista.length - 1];                          // el último de la lista de hoy
    c.val = 'bien'; c.ts = Date.now();                          // lo que hace Guardar en la ficha
    renderEntrevistas();
    return nombreCand(c);
  });
  const ordenDespues = await pg.$$eval('#entrevistasRoot .entrow b', x => x.slice(0, 3).map(y => y.firstChild.textContent.trim()));
  ok(`valorar al último (${valorado}) lo pone el primero de la lista`, ordenDespues[0] === valorado && ordenAntes[0] !== valorado, JSON.stringify({ ordenAntes, ordenDespues }));
  await pg.click('#entrevistasRoot [data-entf="val|bien"]'); await pg.waitForTimeout(250);
  ok('y con el filtro «Bien» puesto sigue el primero', await pg.$eval('#entrevistasRoot .entrow b', e => e.firstChild.textContent.trim()) === valorado);
  ok('la lista dice que van las últimas primero', await pg.$eval('#entrevistasRoot .entcount', e => /últimas primero/.test(e.textContent)));
  await pg.click('#entrevistasRoot [data-entf="val|"]'); await pg.waitForTimeout(250);
  await pg.click('#entrevistasRoot [data-entf="hab|cafetera"]'); await pg.waitForTimeout(250);
  const nCaf = await pg.$$eval('#entrevistasRoot .entrow', x => x.length);
  ok(`Entrevistas: el filtro «cafetera» deja ${nCaf}`, nCaf > 10 && nCaf < 194, nCaf);
  await pg.fill('#entQ', 'springfield'); await pg.waitForTimeout(300);
  ok('Entrevistas: el buscador entra en el texto de la experiencia', await pg.$$eval('#entrevistasRoot .entrow b', x => x.length) === 1);
  await pg.click('#entLimpiar'); await pg.waitForTimeout(250);
  await pg.click('#entrevistasRoot [data-entlista="alerta"]'); await pg.waitForTimeout(250);
  ok('Entrevistas: «Alerta interna» enseña sus 81', await pg.$$eval('#entrevistasRoot .entrow', x => x.length) === 81);
  await pg.click('#entrevistasRoot [data-entf="puesto|cocina"]'); await pg.waitForTimeout(250);
  const nCoc = await pg.$$eval('#entrevistasRoot .entrow', x => x.length);
  ok(`Entrevistas: el filtro de cocina deja ${nCoc} de 81`, nCoc > 0 && nCoc < 81, nCoc);
  await pg.fill('#entQ', '625828119'); await pg.waitForTimeout(250);
  ok('Entrevistas: el buscador encuentra por teléfono', await pg.$$eval('#entrevistasRoot .entrow b', x => x.map(y => y.textContent).join('|')).then(t => /Janira/.test(t)));
  await pg.click('#entLimpiar').catch(() => {}); await pg.waitForTimeout(200);
  const quienEdita = await pg.$eval('#entrevistasRoot .entrow b', e => e.firstChild.textContent.trim());   // sin el «●» de entrevista contestada
  await pg.click('#entrevistasRoot .entrow'); await pg.waitForTimeout(300);
  ok('Entrevistas: pulsar en alguien abre su perfil (siete tarjetas de dato y las ocho aptitudes)',
    !!(await pg.$('#candOvl .cperf')) && await pg.$$eval('#candOvl .cperfk', x => x.length) === 7 && await pg.$$eval('#candOvl .habchip', x => x.length) === 8,
    JSON.stringify({ datos: await pg.$$eval('#candOvl .cperfk', x => x.length), aptitudes: await pg.$$eval('#candOvl .habchip', x => x.length) }));
  const perfil = await pg.evaluate(() => {
    const llenos = c => CAMPOS_ENTREVISTA.filter(x => c[x.k]).length;
    const c = (S.entrevistas || []).filter(tieneEntrevista).sort((a, b) => llenos(b) - llenos(a))[0];
    const h = fichaCandHTML(c);
    return { quien: c.nombre, datos: llenos(c), falta: CAMPOS_ENTREVISTA.filter(x => c[x.k] && !h.includes(esc(String(c[x.k])))).map(x => x.k) };
  });
  ok(`Entrevistas: el perfil saca los ${perfil.datos} datos de ${perfil.quien} sin dejarse ninguno`, perfil.falta.length === 0, JSON.stringify(perfil));
  await pg.click('#candOvl [data-cedit]'); await pg.waitForTimeout(250);
  ok('Entrevistas: «Editar» abre la entrevista entera para tocarla', await pg.$$eval('#candOvl [data-cin]', x => x.length) >= 12 && await pg.$$eval('#candOvl [data-chab]', x => x.length) === 24,
    JSON.stringify({ cajetines: await pg.$$eval('#candOvl [data-cin]', x => x.length), aptitudes: await pg.$$eval('#candOvl [data-chab]', x => x.length) }));
  for (const puesto of ['cocina', 'sala']) {
    const ya = await pg.$eval(`#candOvl [data-cpto="${puesto}"]`, b => b.classList.contains('on'));
    if (!ya) await pg.click(`#candOvl [data-cpto="${puesto}"]`);
  }
  ok('Entrevistas: los dos puestos se pueden pulsar a la vez (Aroa, 17/09)',
    await pg.$$eval('#candOvl [data-cpto].on', b => b.map(x => x.dataset.cpto).sort().join(',')) === 'cocina,sala');
  ok('Entrevistas: la ficha empieza por fecha, nombre, teléfono, edad y zona (Diego, 17/09)',
    await pg.$$eval('#candOvl [data-cin]', is => is.slice(0, 5).map(i => i.dataset.cin).join(',')) === 'fecha,nombre,tel,edad,zona',
    await pg.$$eval('#candOvl [data-cin]', is => is.map(i => i.dataset.cin).join(',')));
  await pg.click('#candOvl [data-cbus="T"]'); await pg.click('#candOvl [data-cbus="FDS"]');
  ok('Entrevistas: «el entrevistado busca» deja marcar varias a la vez (Aroa, 17/09)',
    await pg.$$eval('#candOvl [data-cbus].on', b => b.map(x => x.dataset.cbus).join(',')) === 'T,FDS');
  await pg.click('#candOvl [data-cbus="TODO"]');
  ok('Entrevistas: «No tiene problemas» se queda sola, que es lo que significa',
    await pg.$$eval('#candOvl [data-cbus].on', b => b.map(x => x.dataset.cbus).join(',')) === 'TODO');
  await pg.click('#candOvl [data-cbus="T"]'); await pg.click('#candOvl [data-cbus="FDS"]');
  ok('Entrevistas: la valoración va la última del todo, que es lo que se decide al terminar (Aroa, 17/09)',
    await pg.evaluate(() => {
      const ov = document.getElementById('candOvl');
      const nota = ov.querySelector('[data-cin="nota"]'), val = ov.querySelector('[data-cset^="val|"]');
      const ult = [...ov.querySelectorAll('[data-cin],[data-cset],[data-chab],[data-cbus],[data-cpto]')].pop();
      return !!nota && !!val && !!(nota.compareDocumentPosition(val) & Node.DOCUMENT_POSITION_FOLLOWING) && ult.dataset.cset === 'val|';
    }));
  await pg.click('#candOvl [data-cset="val|bien"]'); await pg.click('#candOvl [data-cok]'); await pg.waitForTimeout(350);
  const busca = await pg.evaluate(() => (S.entrevistas || []).filter(c => (c.busca || []).length).map(c => c.busca.join(',')));
  ok('Entrevistas: lo que busca se guarda', busca.length === 1 && busca[0] === 'T,FDS', JSON.stringify(busca));
  // hay más gente con los dos puestos y con valoración: sale de las entrevistas en papel que
  // se volcaron (Diego, 17/09), así que la prueba mira a quien acaba de tocar, no el total.
  const editado = await pg.evaluate(n => (S.entrevistas || []).find(c => c.nombre === n), quienEdita);
  ok(`Entrevistas: quien es camarero y cocinero se guarda con los dos (${quienEdita})`,
    (editado.puestos || []).slice().sort().join(',') === 'cocina,sala', JSON.stringify(editado.puestos));
  ok('Entrevistas: valorar a alguien se guarda, queda en el historial y vuelve al perfil ya valorado', editado.val === 'bien'
    && !!(await pg.$('#candOvl .cperfetq .entv.v-bien'))
    && await pg.evaluate(() => (S.historial || []).some(x => /Candidato actualizado/.test(x.txt || ''))),
    await pg.evaluate(() => JSON.stringify((S.historial || []).slice(0, 2))));
  await pg.click('#candOvl [data-ovx]'); await pg.waitForTimeout(200);
  await pg.click('#entrevistasRoot [data-entf="val|bien"]'); await pg.waitForTimeout(250);
  const bienEnLista = await pg.evaluate(() => (S.entrevistas || []).filter(c => c.lista === 'alerta' && c.val === 'bien').length);
  ok('Entrevistas: el filtro de valoración encuentra a quien acabamos de valorar',
    await pg.$$eval('#entrevistasRoot .entrow', x => x.length) === bienEnLista && bienEnLista > 0
    && await pg.$$eval('#entrevistasRoot .entrow b', (x, n) => x.some(y => y.textContent.trim().startsWith(n)), quienEdita),
    JSON.stringify({ filas: await pg.$$eval('#entrevistasRoot .entrow', x => x.length), bienEnLista, quienEdita }));
  await pg.click('#entLimpiar'); await pg.waitForTimeout(200);

  // 6a-bis) la lupa del selector en Semana (Diego, 18/09): el ＋ de una casilla abre el
  //   «blop» con toda la plantilla; escribir un nombre deja solo a quien encaja.
  await vista(pg, 'semana');
  await pg.waitForTimeout(250);
  const hayAdd = await pg.$('#semRoot .wadd, #semRoot .whueco');
  ok('en Semana, la casilla trae el ＋ para poner a alguien', !!hayAdd);
  await pg.click('#semRoot .wadd, #semRoot .whueco');
  ok('el ＋ de Semana abre el selector (#pickerPop)', await llega(pg, () => !!document.querySelector('#pickerPop .plist .prowp'), null, 4000) >= 0);
  ok('y trae la lupita para buscar por nombre', !!(await pg.$('#pickerPop #pickQ')));
  const antes = await pg.$$eval('#pickerPop .plist .prowp', x => x.length);
  const quien = await pg.$eval('#pickerPop .plist .prowp .pn2', e => e.textContent.trim().split('\n')[0]);
  await pg.fill('#pickerPop #pickQ', quien.slice(0, 4));
  await pg.waitForTimeout(250);
  const tras = await pg.$$eval('#pickerPop .plist .prowp', x => x.length);
  ok(`escribir «${quien.slice(0, 4)}» reduce la lista de ${antes} a ${tras}`, tras > 0 && tras < antes, JSON.stringify({ antes, tras }));
  ok('y quien queda es quien se buscaba', await pg.$$eval('#pickerPop .plist .prowp .pn2', (x, n) => x.some(y => y.textContent.includes(n)), quien.slice(0, 4)));
  await pg.fill('#pickerPop #pickQ', 'zzzznadie');
  await pg.waitForTimeout(250);
  ok('un nombre que no existe lo dice, en vez de dejar el hueco en blanco',
    /No hay nadie con ese nombre/.test(await pg.$eval('#pickerPop .plist', e => e.textContent)));
  await pg.fill('#pickerPop #pickQ', '');
  await pg.waitForTimeout(250);
  ok('al vaciar la lupa vuelve la lista entera', await pg.$$eval('#pickerPop .plist .prowp', x => x.length) === antes);
  // 18/09 (Diego): «un aviso que cuando fuerzas un trabajador te diga QUÉ REGLA estás
  // incumpliendo». En el grupo «no pueden» cada fila nombra la regla, no solo el motivo.
  const noPueden = await pg.evaluate(() => [...document.querySelectorAll('#pickerPop .plist .prowp.dis')].map(f => ({
    quien: (f.querySelector('.pn2') || {}).firstChild ? f.querySelector('.pn2').firstChild.textContent.trim() : '',
    regla: (f.querySelector('.prregla') || {}).textContent || '',
    motivo: (f.querySelector('.prsub') || {}).textContent || '',
    forzar: !!f.querySelector('[data-forzar]'),
  })));
  ok(`en «no pueden» cada fila nombra su regla (${noPueden.length} filas)`, noPueden.length > 0 && noPueden.every(f => f.regla.trim().length > 2 && f.motivo.trim().length > 2), JSON.stringify(noPueden.slice(0, 4)));
  ok('y quien se puede forzar lleva el botón junto a la regla que se salta', noPueden.some(f => f.forzar), JSON.stringify(noPueden.slice(0, 4)));
  // 18/09 (Diego): «cuando un usuario hace cualquier cambio en la planilla, al guardar, a
  // otro usuario que tiene una ventana abierta —por ejemplo el perfil de un empleado— se la
  // cierra forzosamente». Solo tiene que cerrarse el panel cuyo registro haya cambiado.
  await pg.evaluate(() => { const p = document.querySelector('#pickerPop'); if (p) p.remove(); });
  const ventana = await pg.evaluate(() => {
    const quien = S.staff[0].id, otro = S.staff[1].id;
    const clon = () => JSON.parse(JSON.stringify(S));
    openFicha(quien);
    const abierta = () => { const o = document.getElementById('fichaOvl'); return o ? (o.querySelector('#fichNombre') || {}).value : null; };
    const tras = {};
    tras.abre = abierta();
    // otro usuario toca la planilla: la ficha abierta no es suya, se queda
    const a = clon(); a.historial = [{ ts: Date.now(), tipo: 'asig', txt: 'otro usuario movió un turno' }].concat(a.historial || []);
    a.meses = a.meses || {}; const k = Object.keys(a.meses)[0];
    if (k) a.meses[k].asig = Object.assign({}, a.meses[k].asig, { '2026-01-02': { EL33_M: [] } });
    aplicarEstadoExterno(a);
    tras.trasPlanilla = abierta();
    // otro usuario toca a OTRA persona: tampoco es la suya
    const b = clon(); (b.staff.find(x => x.id === otro) || {}).nombre = 'Otro Nombre';
    aplicarEstadoExterno(b);
    tras.trasOtraFicha = abierta();
    // y ahora tocan justo a quien tiene abierto: eso sí se cierra
    const c = clon(); (c.staff.find(x => x.id === quien) || {}).nombre = 'Cambiado Desde Fuera';
    aplicarEstadoExterno(c);
    tras.trasSuFicha = abierta();
    const o = document.getElementById('fichaOvl'); if (o) o.remove();
    return tras;
  });
  ok('un cambio de otro usuario en la planilla no cierra la ficha abierta', !!ventana.abre && ventana.trasPlanilla === ventana.abre, JSON.stringify(ventana));
  ok('ni un cambio en la ficha de otra persona', ventana.trasOtraFicha === ventana.abre, JSON.stringify(ventana));
  ok('pero si cambian la ficha que tienes abierta, esa sí se cierra', ventana.trasSuFicha === null, JSON.stringify(ventana));
  // lo mismo con la ficha de una entrevista, que es la otra ventana en la que se está un rato
  const ventanaCand = await pg.evaluate(() => {
    S.entrevistas = S.entrevistas || [];
    if (!S.entrevistas.length) S.entrevistas.push({ id: 'C1', nombre: 'Prueba Uno', tel: '600000000', lista: 'activos', hab: {} });
    const c = S.entrevistas[0];
    const clon = () => JSON.parse(JSON.stringify(S));
    abrirPerfilCand(c);
    const abierta = () => !!document.getElementById('candOvl');
    const t = { abre: abierta() };
    const a = clon(); a.historial = [{ ts: Date.now(), tipo: 'asig', txt: 'otro usuario movió un turno' }].concat(a.historial || []);
    a.staff = a.staff.slice(); a.staff[1] = Object.assign({}, a.staff[1], { nombre: 'Otro Más' });
    aplicarEstadoExterno(a);
    t.trasOtroCambio = abierta();
    const b = clon(); b.entrevistas[0] = Object.assign({}, b.entrevistas[0], { nombre: 'Corregido Desde Fuera' });
    aplicarEstadoExterno(b);
    t.trasSuFicha = abierta();
    const o = document.getElementById('candOvl'); if (o) o.remove();
    return t;
  });
  ok('la ficha de una entrevista aguanta el cambio de otro usuario', ventanaCand.abre && ventanaCand.trasOtroCambio, JSON.stringify(ventanaCand));
  ok('y se cierra solo si tocan esa misma entrevista', ventanaCand.trasSuFicha === false, JSON.stringify(ventanaCand));

  // y sigue sirviendo para lo suyo: poner a alguien
  const pidPick = await pg.$eval('#pickerPop .plist [data-pickpid]', e => e.dataset.pickpid).catch(() => null);
  if (pidPick) {
    await pg.click(`#pickerPop [data-pickpid="${pidPick}"]`);
    ok('y al pulsar en alguien se le pone en la casilla y se cierra el selector',
      await llega(pg, () => !document.querySelector('#pickerPop'), null, 4000) >= 0);
  } else { await pg.click('body', { position: { x: 5, y: 5 } }).catch(() => {}); }

  // 6b) Gestor de cobertura desde la planilla: en Semana, «Falta estos días…» sobre una persona abre la hoja
  //     con ese día marcado; plan A / plan B como «quién sale → quién entra»; confirmar aplica y vuelve a la semana
  await vista(pg, 'semana');
  const cob = await pg.evaluate(ex => {   // una persona con turno esta semana (distinta de la puesta en Hoy) y su primer día
    for (let k = 0; k < 7; k++) { const iso = addDias(S.semLunes, k); const e = estadoDeIso(iso); for (const t of turnosDe(S)) for (const pid of pidsEn(e, iso, t.id)) if (pid !== ex) return { pid, iso, tid: t.id }; }
    return null;
  }, asig ? asig.pid : '');
  ok(`hay alguien con turno esta semana para la prueba (${cob && cob.pid} el ${cob && cob.iso})`, !!cob, JSON.stringify(cob));
  await pg.click(`table.semt [data-wpers="${cob.iso}|${cob.tid}|${cob.pid}"]`);
  ok('el bloque de la persona abre su menú con «Falta estos días…»', await llega(pg, () => !!document.querySelector('#menuTurnoPop [data-mt="cobertura"]'), null, 3000) >= 0);
  await pg.click('#menuTurnoPop [data-mt="cobertura"]');
  ok('se abre la hoja de cobertura (#cobOvl) con la persona y el día ya marcado', await llega(pg, c => { const ov = document.querySelector('#cobOvl'); return !!ov && COB.pid === c.pid && COB.dias.length === 1 && COB.dias[0] === c.iso && !!ov.querySelector(`.cobdia.on[data-dia="${c.iso}"]`); }, cob, 4000) >= 0, JSON.stringify(await pg.evaluate(() => ({ pid: COB.pid, dias: COB.dias }))));
  ok('la tira enseña 14 días con los turnos de la persona y los seis tipos de incidencia', await pg.evaluate(() => document.querySelectorAll('#cobOvl .cobdia').length === 14 && document.querySelectorAll('#cobOvl [data-tipo]').length === 6 && document.querySelectorAll('#cobOvl .cobdia .cobdots i').length >= 1));
  await pg.click(`#cobOvl .cobdia[data-dia="${masDias(cob.iso, 1)}"]`);   // marcar otro día y desmarcarlo
  ok('pulsar otro día lo marca', await pg.evaluate(() => COB.dias.length === 2 && document.querySelectorAll('#cobOvl .cobdia.on').length === 2));
  await pg.click(`#cobOvl .cobdia[data-dia="${masDias(cob.iso, 1)}"]`);
  ok('volver a pulsarlo lo desmarca', await pg.evaluate(c => COB.dias.length === 1 && COB.dias[0] === c.iso, cob));
  await pg.click('#cobOvl [data-tipo="LD"]');
  await pg.click('#cobOvl #cobProponer');
  ok('«Buscar quién cubre» pinta los turnos afectados y al menos un plan', await llega(pg, () => !!(COB.res && COB.res.afectados.length) && document.querySelectorAll('#cobOvl #cobRes .cobplan').length >= 1, null, 5000) >= 0, await pg.evaluate(() => COB.res && JSON.stringify({ af: COB.res.afectados.length, planes: COB.res.planes.length })));
  const planes = await pg.evaluate(() => COB.res.planes.map(p => ({ id: p.id, n: p.asignaciones.length, huecos: p.huecos.length, avisos: p.avisos, pids: p.asignaciones.map(a => a.pid) })));
  ok(`el plan A va primero y es el recomendado (${JSON.stringify(planes)})`, planes[0].id === 'A' && await pg.$eval('#cobOvl #cobRes .cobplan.reco .micro', x => /PLAN A/.test(x.textContent)));
  ok('cada turno afectado se enseña como «quién sale → quién entra» (o hueco, o nadie hace falta)', await pg.evaluate(() => { const n = COB.res.afectados.length; const A = document.querySelector('#cobOvl .cobplan.reco'); return A.querySelectorAll('.cobmv').length === n && A.querySelectorAll('.cobsale s').length === n && [...A.querySelectorAll('.cobentra')].every(x => x.querySelector('.cobrow')); }));
  ok('ninguna propuesta es la persona que falta', planes.every(p => !p.pids.includes(cob.pid)));
  ok('cada persona propuesta explica por qué', await pg.evaluate(() => COB.res.planes.every(p => p.asignaciones.every(a => a.razones.length))));
  const histCob = await pg.evaluate(() => (S.historial || []).length);
  await pg.click('#cobOvl [data-aplicar="A"]');
  ok('«Confirmar plan A» abre la vista previa del cambio con la rejilla de quién sale y quién entra', await llega(pg, () => { const o = document.querySelector('#previaCobOvl'); return !!o && !!o.querySelector('table.pvt td.pvsale') && !!o.querySelector('#pvOk'); }, null, 4000) >= 0, await pg.evaluate(() => !!document.querySelector('#previaCobOvl')));
  ok('la vista previa nombra a quien falta y aún no ha tocado la planilla', await pg.evaluate(c => { const o = document.querySelector('#previaCobOvl'); const p = S.staff.find(x => x.id === c.pid); return o.textContent.includes(p.nombre) && !(p.ausencias || []).some(a => a.desde === c.iso); }, cob));
  await pg.click('#previaCobOvl #pvOk');
  ok('confirmar el plan A cierra la hoja y vuelve a la semana', await llega(pg, () => !document.querySelector('#cobOvl') && !document.getElementById('view-semana').classList.contains('hidden'), null, 4000) >= 0, await pg.evaluate(() => ({ hoja: !!document.querySelector('#cobOvl'), previa: !!document.querySelector('#previaCobOvl'), vista: (document.querySelector('.tab[aria-selected="true"]') || {}).dataset && document.querySelector('.tab[aria-selected="true"]').dataset.v, aplicado: !!COB.aplicado })).then(JSON.stringify));
  ok('el día libre queda en la ficha', await pg.evaluate(c => { const p = S.staff.find(x => x.id === c.pid); return !!p && (p.ausencias || []).some(a => a.tipo === 'LD' && a.desde === c.iso); }, cob));
  ok('la persona sale de sus turnos de ese día (también en el cuadrante)', await pg.evaluate(c => turnosDe(S).every(t => !pidsEn(estadoDeIso(c.iso), c.iso, t.id).includes(c.pid)) && !document.querySelector(`table.semt [data-wpers="${c.iso}|${c.tid}|${c.pid}"]`), cob));
  ok('quien cubre entra con origen cobertura y «por»', planes[0].n === 0 || await pg.evaluate(c => turnosDe(S).some(t => asignados(estadoDeIso(c.iso), c.iso, t.id).some(x => x.origen === 'cobertura' && x.por === c.pid)), cob));
  ok('el historial registra la cobertura con su tipo', await pg.evaluate(n => (S.historial || []).length > n && S.historial[0].tipo === 'cobertura', histCob));
  await pg.keyboard.press('Control+z');
  ok('Ctrl+Z devuelve a la persona a sus turnos y quita el día libre', await llega(pg, c => turnosDe(S).some(t => pidsEn(estadoDeIso(c.iso), c.iso, t.id).includes(c.pid)) && !(S.staff.find(x => x.id === c.pid).ausencias || []).some(a => a.desde === c.iso), cob, 4000) >= 0);
  // la pestaña Cobertura: la misma hoja con selector de persona por avatares
  await vista(pg, 'cobertura');
  ok('la pestaña Cobertura enseña el selector de personas y la tira de días', await pg.evaluate(() => document.querySelectorAll('#cobRoot .cobpk').length >= 20 && document.querySelectorAll('#cobRoot .cobdia').length === 14 && !!document.querySelector('#cobRoot #cobProponer')));
  await pg.click(`#cobRoot .cobpk[data-pk="${cob.pid}"]`);
  ok('elegir a alguien lo marca y pinta sus turnos en la tira', await pg.evaluate(c => COB.pid === c.pid && !!document.querySelector(`#cobRoot .cobpk.on[data-pk="${c.pid}"]`), cob));
  await pg.click('#cobRoot [data-cobsel="ninguno"]');
  ok('«Quitar la selección» deja la tira sin días y apaga el botón', await pg.evaluate(() => COB.dias.length === 0 && !document.querySelector('#cobRoot .cobdia.on') && document.querySelector('#cobRoot #cobProponer').disabled));
  await pg.click('#cobRoot [data-cobsel="semana"]');
  ok('«Toda la semana» marca los siete días de la primera semana', await pg.evaluate(() => COB.dias.length === 7 && document.querySelectorAll('#cobRoot .cobdia.on').length === 7));

  // 7) Tema oscuro
  const errTema = errores.length;
  const temas = [];
  for (let i = 0; i < 3; i++) { await pg.click('#themeBtn'); temas.push(await pg.evaluate(() => document.documentElement.getAttribute('data-theme'))); }
  ok(`#themeBtn alterna data-theme (${temas.map(t => t || 'auto').join(' → ')}) sin errores`, temas[0] === 'dark' && temas[1] === 'light' && temas[2] === null && errores.length === errTema, JSON.stringify(temas));
  ok('el tema elegido se recuerda en localStorage', await pg.evaluate(() => localStorage.getItem('shiftia_pas_theme') === 'auto'));

  // 8) Impresión de la semana
  await vista(pg, 'semana');
  await pg.click('#printBtn');
  ok('#printBtn en Semana genera #printRoot .pxpage', await llega(pg, () => { const r = document.getElementById('printRoot'); return !!r && !r.classList.contains('hidden') && !!r.querySelector('.pxpage'); }, null, 4000) >= 0);
  ok('la hoja lleva cabecera, tabla de la semana y pie', await pg.evaluate(() => !!document.querySelector('#printRoot .pxhead') && !!document.querySelector('#printRoot table.pxsem') && !!document.querySelector('#printRoot .pxfoot')));
  // el pie de descansos se quedó en la app (Diego, 18/09: fuera del imprimible de la semana)
  ok('la hoja lleva los 4 locales y 7 días, y ya no el pie de descansos', await pg.evaluate(() => document.querySelectorAll('#printRoot table.pxsem tr.secrow.pxloc').length === 4 && document.querySelectorAll('#printRoot table.pxsem thead th.pxd').length === 7 && !document.querySelector('#printRoot table.pxsem tr.pxdesc')));
  await pg.click('#pClose');
  ok('«Cerrar» oculta la vista previa', await pg.$eval('#printRoot', r => r.classList.contains('hidden')));

  // 10) Persistencia local: tras recargar, la asignación de Hoy sigue
  const guardado = asig && await pg.evaluate(a => { try { const j = JSON.parse(localStorage.getItem('shiftia_pasarela_v01')); const m = j.meses[a.iso.slice(0, 7)]; return !!m && (m.asig[a.iso] && m.asig[a.iso][a.tid] || []).some(x => x.pid === a.pid); } catch (e) { return false; } }, asig);
  ok('localStorage shiftia_pasarela_v01 guarda la asignación de Hoy', !!guardado);
  await pg.reload();
  await pg.waitForSelector('#view-hoy .loccard', { timeout: 15000 });
  await vista(pg, 'hoy');
  ok('tras recargar, la persona sigue en su casilla de Hoy', !!asig && await llega(pg, a => !!document.querySelector(`[data-cas="${a.iso}|${a.tid}"] .pchip[data-pid="${a.pid}"]`), asig, 4000) >= 0);
  ok('tras recargar no se vuelve a generar el mes de muestra (el historial no duplica la generación)', await pg.evaluate(() => (S.historial || []).filter(h => /Mes de muestra/.test(h.txt)).length === 1));
  ok('la navegación (día en pantalla) también se recuerda', asig && await pg.evaluate(() => isoDia()) === asig.iso);
  await ctx.close();

  // 11) La app abre siempre en HOY: una navegación vieja guardada (alguien miró agosto una
  //     vez) no puede dejar la pantalla anclada en una fecha que no es la de hoy
  const ctxN = await abrirContexto(br, { width: 1280, height: 900 });
  await ctxN.addInitScript(() => { try { if (!localStorage.getItem('nav_sembrada')) { localStorage.setItem('shiftia_pas_nav', JSON.stringify({ y: 2026, m: 8, day: 1, semLunes: '2026-07-27', hoy: '2026-08-01' })); localStorage.setItem('nav_sembrada', '1'); } } catch (e) {} });   // solo en la primera carga: la recarga usa lo que guarde la app
  const pn = await ctxN.newPage();
  await prepararPagina(pn, errores, 'navegación');
  await pn.goto(BASE + '/index.html');
  await pn.waitForSelector('#view-hoy .loccard', { timeout: 15000 });
  const nav1 = await pn.evaluate(() => ({ iso: isoDia(), hoy: isoHoy(), chip: (document.querySelector('#dTitle .dchip') || {}).textContent, lejos: document.querySelector('#dHoy').classList.contains('lejos') }));
  ok(`con una navegación vieja guardada (1 de agosto) la app abre en hoy (${nav1.iso}) con la marca HOY`, nav1.iso === nav1.hoy && nav1.chip === 'HOY' && !nav1.lejos, JSON.stringify(nav1));
  await pn.evaluate(() => { S.y = 2026; S.m = 12; S.day = 4; cargarMes(); saveState(); renderDia(); });
  const nav2 = await pn.evaluate(() => ({ chip: (document.querySelector('#dTitle .dchip') || {}).textContent, lejos: document.querySelector('#dHoy').classList.contains('lejos') }));
  ok(`al irse a otra fecha se avisa de que no es hoy («${nav2.chip}») y el botón «Hoy» resalta`, /dentro de/.test(nav2.chip || '') && nav2.lejos, JSON.stringify(nav2));
  await pn.reload();
  await pn.waitForSelector('#view-hoy .loccard', { timeout: 15000 });
  ok('al recargar el mismo día se vuelve donde estabas (no se pierde el sitio)', await pn.evaluate(() => isoDia()) === '2026-12-04', await pn.evaluate(() => isoDia()));
  await ctxN.close();

  // ══════════════ MÓVIL 400×820 ══════════════
  console.log('── móvil 400×820');
  const ctxM = await abrirContexto(br, { width: 400, height: 820 }, true);
  const pm = await ctxM.newPage();
  await prepararPagina(pm, errores, 'móvil');
  await pm.goto(BASE + '/index.html?demo=1');
  await pm.waitForSelector('#view-hoy .loccard', { timeout: 15000 });
  ok('móvil: la barra inferior #bnav está', await visible(pm, '#bnav'));
  ok('móvil: las pestañas de escritorio no se ven', !(await visible(pm, '.tabs')));
  ok('móvil: la página no desborda a 400 px', await pm.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), await pm.evaluate(() => document.documentElement.scrollWidth + ' > ' + document.documentElement.clientWidth));
  for (const v of ['semana', 'mes', 'hoy']) {
    const antes = errores.length;
    await pm.click(`#bnav [data-bnav="${v}"]`);
    ok(`móvil: «${v}» desde la barra inferior, sin errores`, await llega(pm, v => !document.getElementById('view-' + v).classList.contains('hidden'), v, 4000) >= 0 && errores.length === antes, errores.slice(antes).join(' | '));
  }
  await pm.click('#bnavMas');
  ok('móvil: «Más» abre #masOvl', await llega(pm, () => !!document.querySelector('#masOvl'), null, 3000) >= 0);
  ok('móvil: «Más» ofrece Equipo, Horas, Generador, Cobertura, Actividad (modo local) y Entrevistas', await pm.evaluate(() => ['equipo', 'horas', 'generador', 'cobertura', 'actividad', 'entrevistas'].every(a => !!document.querySelector(`#masOvl [data-mas="${a}"]`))));
  await pm.click('#masOvl [data-mas="horas"]');
  ok('móvil: desde «Más» se llega a Horas', await llega(pm, () => !document.querySelector('#masOvl') && !document.getElementById('view-horas').classList.contains('hidden') && !!document.querySelector('#horasRoot table.htab'), null, 5000) >= 0);
  ok('móvil: la barra marca «Más» como activo en Horas', await pm.$eval('#bnavMas', b => b.classList.contains('on')));
  for (const v of ['equipo', 'generador', 'cobertura', 'actividad', 'entrevistas']) {
    const antes = errores.length;
    await pm.click('#bnavMas'); await pm.waitForSelector('#masOvl', { timeout: 3000 }); await pm.click(`#masOvl [data-mas="${v}"]`);
    ok(`móvil: «${v}» desde «Más», sin errores`, await llega(pm, v => !document.querySelector('#masOvl') && !document.getElementById('view-' + v).classList.contains('hidden'), v, 4000) >= 0 && errores.length === antes, errores.slice(antes).join(' | '));
  }
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
