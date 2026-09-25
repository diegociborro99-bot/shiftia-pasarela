// REVISIÓN FINAL DEL TRABAJO DEL 24/09 (25/09), CON CLICS: lo que los tres revisores encontraron en la interfaz.
//  1) Generador → Periodo: el botón «Con aviso» de un hueco pone a la persona con su fila (su «por», el partido
//     autorizado para cubrir a quien falta, D1), como el selector y la ★ de Hoy. Antes Mari Luz «cubre a Iván»
//     entraba el domingo 4 sin «por Iván» y con «partido no declarado los domingos». Y las propuestas «Con aviso» van
//     por escalones: la pareja «nunca con» flexible, la última (José, 17/09); y el título dice el periodo elegido.
//  2) El selector de la casilla, igual: el domingo 4 por la tarde, Roberto antes que Mari Luz con Lavinia.
//  3) Horas de un mes cerrado: la comparación con la copia guardada mira la fila entera y dice las dos cifras (los
//     partidos de agosto que D4 pasó a continuos: antes, «La tabla coincide con la copia guardada»).
//  4) Compartir no promete un «pie de descansos» que la imagen no lleva desde el 18/09.
//  5) La app guarda el esquema de ahora (2): el servidor deja de aceptar lo que mande una pestaña de antes. Y en la
//     app del empleado no se vuelven a pasar las migraciones de las marcas sobre su copia recortada.
//  6) El perfil del empleado, en un mes que el encargado aún no ha publicado, no dice «no tienes turnos».
// INDEX permite pasar la batería por otra copia de la app (la de antes, para verla en rojo).
// El reloj de la página se fija en el viernes 25/09/2026.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cargarChromium, contador, llega } from './e2e-util.mjs';

const { chromium, CHROMIUM } = await cargarChromium();
const RAIZ = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'));
const INDEX = process.env.INDEX ? resolve(process.env.INDEX) : join(RAIZ, 'index.html');
const { ok, resumen } = contador();

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.ico': 'image/x-icon' };
const srv = createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname.startsWith('/api/')) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end('{"error":"sin servidor"}'); return; }
  const abs = u.pathname === '/' || u.pathname === '/index.html' ? INDEX : resolve(join(RAIZ, u.pathname));
  if ((abs !== INDEX && !abs.startsWith(RAIZ)) || !existsSync(abs) || statSync(abs).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(abs)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  res.end(readFileSync(abs));
});
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${srv.address().port}`;
const br = await chromium.launch({ executablePath: CHROMIUM, args: ['--no-sandbox'] });
const errores = [];
const DOM = '2026-10-04';

async function pagina(etiqueta) {
  const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.clock.setFixedTime(new Date('2026-09-25T10:00:00+02:00'));
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
const vista = async (pg, v) => { await pg.click(`.tab[data-v="${v}"]`); return llega(pg, v => { const s = document.getElementById('view-' + v); return !!s && !s.classList.contains('hidden'); }, v, 4000); };
const texto = (pg, sel) => pg.$eval(sel, x => x.textContent.replace(/\s+/g, ' ').trim()).catch(() => '');
const ultimoToast = pg => pg.$$eval('#toasts .toast span', xs => xs.map(x => x.textContent).pop() || '').catch(() => '');
// el caso del cliente: Mari Luz «cubre a Iván» y las vacaciones de Iván del 2 al 4 por la tarde, fuera de su casilla
const casoIvan = pg => pg.evaluate(() => {
  personaDeId('mariluz').cubreA = [{ pid: 'ivan' }];
  anadirAusencia(personaDeId('ivan'), { tipo: 'VAC', desde: '2026-10-02', hasta: '2026-10-04', franjas: ['T'] });
  for (const d of ['2026-10-02', '2026-10-03', '2026-10-04']) desasignar(estadoDeIso(d), d, 'PASARELA_T', 'ivan');
  saveState();
});
async function seccion(nombre, fn) {
  try { await fn(); } catch (e) { ok(`${nombre}: la sección no se interrumpe`, false, e && e.stack ? e.stack.split('\n').slice(0, 4).join(' | ') : e); }
}
try {
  console.log('── 1) Generador → Periodo: «Con aviso» del domingo 4 en la tarde de Pasarela');
  await seccion('generador', async () => {
    const pg = await pagina('generador');
    await casoIvan(pg);
    await vista(pg, 'generador');
    await clic(pg, '[data-modo="periodo"]');
    await pg.fill('#genD1', DOM); await pg.$eval('#genD1', x => x.dispatchEvent(new Event('change', { bubbles: true })));
    await pg.fill('#genD2', DOM); await pg.$eval('#genD2', x => x.dispatchEvent(new Event('change', { bubbles: true })));
    ok('el título dice el periodo elegido, no «Generar esta semana»', /Del 04\/10 al 04\/10/i.test(await texto(pg, '#genRoot .micro')), await texto(pg, '#genRoot .micro'));
    await clic(pg, '#genPrevia');
    await llega(pg, () => !!GEN.previa && !GEN.ocupado, null, 20000);
    const botones = await pg.$$eval(`#genRes [data-hueco^="${DOM}|PASARELA_T"] [data-aplicaruno]:not([data-aplicaruno$="|limpio"])`, xs => xs.map(x => x.dataset.aplicaruno.split('|')[2]));
    ok('«Con aviso»: primero quien solo hace un partido no declarado; Mari Luz con Lavinia (pareja flexible), la última', botones[0] === 'roberto' && botones[botones.length - 1] === 'mariluz', botones.join(', '));
    await clic(pg, `#genRes [data-aplicaruno="${DOM}|PASARELA_T|mariluz"]`);
    await llega(pg, D => asignados(estadoDeIso(D), D, 'PASARELA_T').some(x => x.pid === 'mariluz'), DOM, 4000);
    const ml = await pg.evaluate(D => JSON.parse(JSON.stringify(asignados(estadoDeIso(D), D, 'PASARELA_T').find(x => x.pid === 'mariluz') || null)), DOM);
    ok('entra «por Iván» y puesta a mano', !!ml && ml.por === 'ivan' && ml.origen === 'manual', JSON.stringify(ml));
    ok('sin «partido no declarado»: su partido es el autorizado para cubrir a Iván (solo queda el aviso de la pareja)', !!ml && !(ml.avisos || []).some(a => /partido no declarado/.test(a)), JSON.stringify(ml && ml.avisos) + ' · ' + await ultimoToast(pg));
    const rev = await pg.evaluate(D => { S.y = 2026; S.m = 10; cargarMes(); return revisionMes(S, S.staff, est, { hoy: isoHoy() }).filter(x => x.iso === D && /Mari Luz/.test(x.msg)).map(x => x.nivel + ': ' + x.msg); }, DOM);
    ok('la Revisión no la da por «no hace partido los domingos»', !rev.some(x => /no hace partido/.test(x)), rev.join(' | '));
    ok('Ctrl+Z la quita', await pg.evaluate(D => { deshacer(); return !asignados(estadoDeIso(D), D, 'PASARELA_T').some(x => x.pid === 'mariluz'); }, DOM));
    await pg.context().close();
  });

  console.log('── 2) El selector de la casilla, el domingo 4 por la tarde');
  await seccion('selector', async () => {
    const pg = await pagina('selector');
    await casoIvan(pg);
    await pg.evaluate(D => { S.y = 2026; S.m = 10; S.day = 4; cargarMes(); renderVistaActiva(); }, DOM);
    await llega(pg, D => !!document.querySelector(`[data-pick="${D}|PASARELA_T"]`), DOM, 4000);
    await clic(pg, `[data-pick="${DOM}|PASARELA_T"]`);
    await llega(pg, () => !!document.querySelector('#pickerPop'), null, 3000);
    const conAviso = await pg.$$eval('#pickerPop [data-pickpid][data-aviso]', xs => xs.map(x => x.dataset.pickpid));
    ok('«Con aviso» en el mismo orden que el Generador: Roberto primero, Mari Luz la última', conAviso[0] === 'roberto' && conAviso[conAviso.length - 1] === 'mariluz', conAviso.join(', '));
    await pg.context().close();
  });

  console.log('── 3) Horas de un mes cerrado: la fila entera, con las dos cifras');
  await seccion('horas', async () => {
    const pg = await pagina('horas');
    await pg.evaluate(() => {
      S.hY = 2026; S.hM = 9;
      S.cierres['2026-09'] = { ts: Date.now(), usuario: 'local', tabla: horasEquipoMes(S, S.staff, S.meses, 2026, 9) };
      saveState();
    });
    await vista(pg, 'horas');
    const bien = await texto(pg, '#horasRoot .haviso.ok');
    ok('recién cerrado: coincide', /coincide con la copia guardada/.test(bien), bien);
    // la copia se guardó con el código de antes de D4: a Noe le contaba 4 partidos más (sus turnos continuos)
    await pg.evaluate(() => { const f = S.cierres['2026-09'].tabla.find(x => x.pid === 'noe'); f.partidos += 4; saveState(); renderHoras(); });
    const aviso = await texto(pg, '#horasRoot .haviso.warn');
    ok('con los partidos distintos avisa, con las dos cifras', /Ha cambiado algo después del cierre/.test(aviso) && /Noe: partidos \d+ → \d+/.test(aviso), aviso);
    await pg.context().close();
  });

  console.log('── 4) Compartir: lo que promete el menú');
  await seccion('compartir', async () => {
    const pg = await pagina('compartir');
    const txt = await pg.evaluate(() => { const b = document.createElement('button'); document.body.appendChild(b); abrirPopCompartir(b); const t = document.getElementById('sharePop').textContent; cerrarPops(); b.remove(); return t.replace(/\s+/g, ' '); });
    ok('ni «pie de descansos» ni «descansos» (la imagen no los lleva)', !/descansos/.test(txt), txt);
    await pg.context().close();
  });

  console.log('── 5) El esquema que se guarda y la app del empleado');
  await seccion('esquema', async () => {
    const pg = await pagina('esquema');
    ok('la app guarda el esquema 2 (el servidor rechaza lo de una pestaña de antes)', await pg.evaluate(() => S.esquema === 2 && freshState().esquema === 2), await pg.evaluate(() => S.esquema));
    const r = await pg.evaluate(() => {
      const copia = JSON.parse(JSON.stringify(S)); delete copia.migraciones; copia.historial = [];
      SRV.on = true; SRV.esAdmin = false;
      try { migrarEstado(copia); } finally { SRV.on = false; SRV.esAdmin = true; }
      return copia.migraciones || {};
    });
    ok('en la app del empleado no se pasan las migraciones de las marcas (su copia viene recortada)', !r.marcasAuto2409 && !r.huerfanas2509, JSON.stringify(r));
    await pg.context().close();
  });

  console.log('── 6) Perfil del empleado en un mes sin publicar');
  await seccion('perfil', async () => {
    const pg = await pagina('perfil');
    const t = await pg.evaluate(() => {
      // lo que recibe Mari Luz: octubre aún no es visible para el equipo, así que el servidor no lo manda
      delete S.meses['2026-10']; S.mesesPublicados = ['2026-09'];
      SRV.pid = 'mariluz'; S.y = 2026; S.m = 10; cargarMes(); activarModoEmpleado();
      return document.getElementById('view-perfil').textContent.replace(/\s+/g, ' ');
    });
    ok('dice que el encargado aún no lo ha publicado, no «no tienes turnos»', /aún no ha publicado este mes/.test(t) && !/no tienes turnos/.test(t), t.slice(0, 300));
    await pg.context().close();
  });
  ok('sin errores de página', errores.length === 0, errores.join(' | '));
} finally { await br.close(); srv.close(); }
resumen();
