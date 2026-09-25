// EL MOTOR NÚCLEO LEE LA FICHA POR LA MISMA PUERTA (25/09, fase 7, S25). Generador → Periodo con el motor
// «Núcleo Shiftia (CP-SAT)», de punta a punta con el servidor real (`node server.js`) y un núcleo de pega en
// SHIFTIA_CORE_URL. 25/09 (revisión de la fase 7): el núcleo de pega valida la petición con el mismo esquema que el
// de verdad (tests/nucleo-esquema.cjs, el SolveRequest de shiftia-core) y responde 422 si no cuadra; antes aceptaba
// cualquier cosa y `unavailable[i] = '*'` pasaba aquí y fallaba en el núcleo de verdad. Como el de verdad, no
// propone a nadie donde el problema lo veta (unavailable). Devuelve lo fijo más un partido que la puerta no deja
// poner en el modo estricto y el problema no puede prohibir (el núcleo no tiene una regla «esta persona, este día»):
// Cristian, que solo hace partido los sábados, de mañana y de tarde un día que tiene libre entero. Se comprueba:
//  · el problema: cumple el esquema; Dulce (standby) sigue en él con todo a ["*"]; la semana tipo entra fija por la
//    puerta; con la mañana del domingo fija, la tarde de Mari Luz ya va vetada en el modo estricto (ese día no hace
//    partido); la pareja «nunca con» flexible (Mari Luz y Lavinia) es dura en el modo estricto y blanda en el relajado;
//  · la segunda vuelta: lo que la puerta rechaza se veta en el problema y se vuelve a resolver; el hueco que queda
//    dice lo que el núcleo proponía («El núcleo proponía a Cristian (no hace partido los lunes)»);
//  · la vista previa: lo de la semana tipo cuenta como «de la semana tipo»; en el hueco, quien puede entrar sin
//    aviso («Pueden entrar») además de quien entra con aviso; la línea del núcleo en palabras, sin jerga ni JSON; el
//    porqué de cada hueco en una línea normal (no en rojo, uno por renglón);
//  · con «Permitir partidos no declarados», el partido de Cristian entra con su aviso (una sola vuelta); se vuelca y
//    Ctrl+Z lo quita;
//  · si el núcleo no acepta los datos (422), un aviso que se entiende (no «[object Object]»);
//  · «Solo desde hoy» llega al núcleo: el problema empieza hoy y nada de la vista previa es de días pasados.
// Cuenta como fallo un `pageerror` o un assert.
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { cargarChromium, contador, llega, hasta, prepararPagina } from './e2e-util.mjs';

const { erroresPeticion, todoFuera } = createRequire(import.meta.url)('./nucleo-esquema.cjs');
const { chromium, CHROMIUM } = await cargarChromium();
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const { ok, resumen } = contador();
const t0 = Date.now();

// el periodo: una semana lejos de los meses de muestra (vacía), de lunes a domingo
const pad = n => String(n).padStart(2, '0');
const isoDe = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const L = new Date(); L.setDate(L.getDate() + 84); while (L.getDay() !== 1) L.setDate(L.getDate() + 1);
const LUN = isoDe(L); const D = new Date(L); D.setDate(D.getDate() + 6); const DOM = isoDe(D);

// el núcleo de pega: valida como el de verdad; devuelve lo fijo y, si el problema no lo veta, el partido de Cristian
// (el primer día de la semana que tiene libre entero: mañana en el primer local que puede, tarde en Pasarela).
// `forzar` cambia la próxima respuesta (un 422 entero, o el estado y las relajaciones)
const recibidos = [];
let rechazadas = 0, forzar = null, diaCristian = null;
const nucleo = createServer((req, res) => {
  if (req.url === '/healthz') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":true}'); return; }
  let cuerpo = '';
  req.on('data', d => { cuerpo += d; });
  req.on('end', () => {
    const pet = JSON.parse(cuerpo || '{}'), pb = pet.problem;
    recibidos.push(pb);
    const responde = (http, j) => { res.writeHead(http, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(j)); };
    const errores = erroresPeticion(pet);
    if (errores.length) { rechazadas++; responde(422, { detail: errores }); return; }
    const f = forzar; forzar = null;
    if (f && f.http) { responde(f.http, f.cuerpo); return; }
    const schedule = {};
    for (const w of pb.workers) schedule[w.id] = Object.assign({}, w.fixed);
    const cr = pb.workers.find(w => w.id === 'cristian');
    const libre = (i, l) => i >= 0 && !cr.fixed[i] && !todoFuera(cr.unavailable[i]) && (!l || !(cr.unavailable[i] || []).includes(l));
    const idx = (iso, f) => pb.meta.indices.findIndex(x => x.iso === iso && x.franja === f);
    if (!diaCristian) diaCristian = pb.meta.indices.map(x => x.iso).find(iso => libre(idx(iso, 'M')) && libre(idx(iso, 'T'), 'PASARELA') && !pb.days[idx(iso, 'M')].is_holiday) || null;
    if (diaCristian) {
      const iM = idx(diaCristian, 'M'), iT = idx(diaCristian, 'T');
      const mLoc = cr.allowed_shifts.find(l => libre(iM, l));
      if (mLoc) schedule.cristian[iM] = mLoc;
      if (libre(iT, 'PASARELA')) schedule.cristian[iT] = 'PASARELA';
    }
    responde(200, Object.assign({ status: 'OPTIMAL', feasible: true, objective: 0, schedule, stats: { wall_time_s: 0.1 }, violations: [], relaxations: [] }, f && f.estado));
  });
});
await new Promise(r => nucleo.listen(0, '127.0.0.1', r));

const PORT = 8880 + Math.floor(Math.random() * 80), BASE = `http://127.0.0.1:${PORT}`;
const dir = mkdtempSync(join(tmpdir(), 'shiftia-pas-e2e-nucleo-'));
const ENV = { ...process.env, PORT: String(PORT), DATA_DIR: dir, TRUST_PROXY: '0', ADMIN_PASSWORD: 'clave12345', PROGRAMADOR_PASSWORD: '', SHIFTIA_CORE_URL: `http://127.0.0.1:${nucleo.address().port}` };
let logSrv = '';
const srv = spawn('node', [join(RAIZ, 'server.js')], { env: ENV, stdio: ['ignore', 'pipe', 'pipe'] });
srv.stdout.on('data', d => { logSrv += d; }); srv.stderr.on('data', d => { logSrv += d; });
const salud = await hasta(async () => (await fetch(BASE + '/api/salud')).ok, 20000, 150);

const errores = [];
const br = await chromium.launch({ executablePath: CHROMIUM, args: ['--no-sandbox'] });
const vista = async (pg, v) => { await pg.click(`.tab[data-v="${v}"]`); return llega(pg, v => { const s = document.getElementById('view-' + v); return !!s && !s.classList.contains('hidden'); }, v, 4000); };
const texto = (pg, sel) => pg.$eval(sel, e => e.textContent.replace(/\s+/g, ' ').trim()).catch(() => '');
const lineaNucleo = pg => pg.evaluate(() => { const p = [...document.querySelectorAll('#genRes .revsub')].find(x => /Núcleo Shiftia/.test(x.textContent)); return p ? p.textContent.replace(/\s+/g, ' ').trim() : ''; });
const JERGA = /OPTIMAL|FEASIBLE|INFEASIBLE|[{}[\]]|rule_id|regla\(s\)|relajaci/;
const previa = async (pg, n) => { const antes = recibidos.length; await pg.click('#genPrevia'); return (await llega(pg, n => !!GEN.previa && GEN.previa.motor === 'nucleo' && !GEN.ocupado && GEN.previa.ts > (window.__tsPrevia || 0), null, 15000)) >= 0 && (n === undefined || recibidos.length - antes === n); };
const marcaPrevia = pg => pg.evaluate(() => { window.__tsPrevia = GEN.previa ? GEN.previa.ts : 0; });
try {
  ok(`el servidor arranca con el núcleo de pega en SHIFTIA_CORE_URL (periodo ${LUN} – ${DOM})`, !!salud.v, logSrv.slice(-400));
  if (!salud.v) throw new Error('el servidor no responde');
  const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } });
  const pg = await ctx.newPage();
  await prepararPagina(pg, errores, 'diego');
  await pg.goto(BASE + '/');
  await pg.waitForSelector('#loginForm', { timeout: 10000 });
  await pg.fill('#loginUser', 'diego'); await pg.fill('#loginPass', '12345678'); await pg.click('#loginBtn');
  ok('diego entra y carga la app', await llega(pg, () => typeof SRV !== 'undefined' && SRV.on && SRV.esAdmin && !!document.querySelector('#view-hoy .loccard'), null, 15000) >= 0);

  // ── Generador → Periodo, motor Núcleo, modo estricto
  await vista(pg, 'generador');
  await pg.click('.segm [data-modo="periodo"]');
  await pg.waitForSelector('#genD1', { timeout: 5000 });
  ok('el motor Núcleo está disponible (configurado y con respuesta)', await llega(pg, () => { const b = document.querySelector('[data-motor="nucleo"]'); return !!b && !b.disabled && /optimización exacta/.test(b.textContent); }, null, 8000) >= 0, await texto(pg, '[data-motor="nucleo"]'));
  await pg.click('[data-motor="nucleo"]');
  await pg.fill('#genD1', LUN); await pg.dispatchEvent('#genD1', 'change');
  await pg.fill('#genD2', DOM); await pg.dispatchEvent('#genD2', 'change');
  ok('el periodo es la semana elegida y «Permitir partidos no declarados» está apagado', await pg.evaluate(a => GEN.desde === a.LUN && GEN.hasta === a.DOM && GEN.motor === 'nucleo' && !GEN.opts.permitirPartido, { LUN, DOM }), await pg.evaluate(() => JSON.stringify({ d: GEN.desde, h: GEN.hasta, m: GEN.motor, o: GEN.opts })));
  await marcaPrevia(pg);
  const vueltas = await previa(pg);
  ok('la vista previa llega del núcleo (el núcleo acepta la petición: sin 422)', vueltas && rechazadas === 0, `${rechazadas} rechazadas · ${await texto(pg, '#genRes')}`.slice(0, 400));

  // el problema que mandó la app
  const pb = recibidos[0] || null;
  const idx = (p, iso, f) => p.meta.indices.findIndex(x => x.iso === iso && x.franja === f);
  const w = (p, id) => p.workers.find(x => x.id === id);
  ok('el núcleo recibe el problema del periodo', !!pb && pb.meta.desde === LUN && pb.meta.hasta === DOM && pb.horizon_days === 14, pb && JSON.stringify(pb.meta).slice(0, 200));
  ok('el problema cumple el esquema del núcleo de verdad (el SolveRequest de shiftia-core)', !!pb && erroresPeticion({ problem: pb }).length === 0, pb && JSON.stringify(erroresPeticion({ problem: pb }).slice(0, 2)));
  ok('Dulce (standby) sigue en el problema, con todos los medios días a ["*"] (una lista, como pide el núcleo)', !!pb && !!w(pb, 'dulce') && pb.meta.indices.every((x, i) => Array.isArray(w(pb, 'dulce').unavailable[i]) && todoFuera(w(pb, 'dulce').unavailable[i])), pb && JSON.stringify(w(pb, 'dulce')));
  ok('el modo del Generador va en el problema (estricto)', !!pb && pb.meta.permitirPartido === false);
  ok('la semana tipo entra fija por la puerta (Mari Luz, domingo por la mañana en Pasarela)', !!pb && w(pb, 'mariluz').fixed[idx(pb, DOM, 'M')] === 'PASARELA', pb && JSON.stringify(w(pb, 'mariluz').fixed));
  ok('con la mañana del domingo fija y sin partido ese día, la tarde de Mari Luz ya va vetada (modo estricto)', !!pb && JSON.stringify(w(pb, 'mariluz').unavailable[idx(pb, DOM, 'T')]) === '["*"]', pb && JSON.stringify(w(pb, 'mariluz').unavailable));
  const pareja = (p, modo) => p.rules.some(r => r.type === 'same_shift_forbidden' && r.mode === modo && r.params.pairs.some(q => q.slice().sort().join('+') === 'lavinia+mariluz'));
  ok('la pareja «nunca con» flexible (Mari Luz y Lavinia) es dura en el modo estricto', !!pb && pareja(pb, 'hard') && !pareja(pb, 'soft'));
  const pb2 = recibidos[1] || null;
  const DIA = diaCristian;
  ok(`segunda vuelta: la puerta rechaza la tarde de Cristian (${DIA}: no hace partido ese día) y el núcleo vuelve a resolver con ese medio día vetado`, !!DIA && recibidos.length === 2 && !!pb2 && JSON.stringify(w(pb2, 'cristian').unavailable[idx(pb2, DIA, 'T')]) === '["*"]' && !todoFuera(w(pb, 'cristian').unavailable[idx(pb, DIA, 'T')]),
    `${recibidos.length} peticiones · ${pb2 && DIA && JSON.stringify(w(pb2, 'cristian').unavailable[idx(pb2, DIA, 'T')])}`);

  // la vista previa
  const res = await texto(pg, '#genRes');
  ok('lo de la semana tipo cuenta como «de la semana tipo» (se vuelca por el mismo camino que el generador local)', await pg.evaluate(() => GEN.previa.aplicados.filter(a => a.origen === 'patron').length > 20), await pg.evaluate(() => JSON.stringify([...new Set(GEN.previa.aplicados.map(a => a.origen))])));
  ok('la propuesta del núcleo que la puerta no deja poner sale aparte, con su porqué (partido no declarado) y cómo dejarla entrar', /propuestas? del núcleo no se pud/.test(res) && /Cristian en Pasarela[^·]*no hace partido los \w+/.test(res) && /con «Permitir partidos no declarados» marcado, los partidos no declarados/.test(res), res.slice(0, 600));
  ok('Cristian entra por la mañana y no por la tarde (la última vuelta)', await pg.evaluate(d => GEN.previa.aplicados.some(a => a.pid === 'cristian' && a.iso === d && a.turnoId.endsWith('_M')) && !GEN.previa.aplicados.some(a => a.pid === 'cristian' && a.iso === d && a.turnoId === 'PASARELA_T'), DIA));
  const huecoCr = await pg.evaluate(d => GEN.previa.huecos.some(h => h.iso === d && h.turnoId === 'PASARELA_T'), DIA);
  ok('la tarde de Pasarela de ese día se queda corta, y el hueco lo dice: «El núcleo proponía a Cristian (no hace partido los …)»', huecoCr && await llega(pg, d => { const h = document.querySelector(`#genRes .genrow.hueco[data-hueco="${d}|PASARELA_T|faltan"]`); return !!h && /El núcleo proponía a Cristian \(no hace partido los \w+\)/.test(h.textContent); }, DIA, 3000) >= 0,
    await pg.evaluate(() => [...document.querySelectorAll('#genRes .genrow.hueco')].map(h => h.textContent.replace(/\s+/g, ' ')).slice(0, 4).join(' | ')));
  const linea = await lineaNucleo(pg);
  ok('la línea del núcleo, en palabras: cómo le ha ido y la segunda vuelta, sin jerga ni JSON', /Núcleo Shiftia/.test(linea) && /segunda vuelta/.test(linea) && !JERGA.test(linea), linea);
  // en cada hueco, quien puede entrar sin aviso (además de quien entra con aviso): el núcleo puede dejar una casilla
  // corta aunque alguien pudiera entrar (su ventana de dos medios días es más estricta que la puerta)
  const limpios = await pg.evaluate(() => {
    const out = [];
    for (const row of document.querySelectorAll('#genRes .genrow.hueco')) {
      const k = row.dataset.hueco; if (!k) continue;
      const [iso, tid, tipo] = k.split('|'); if (tipo !== 'faltan') continue;   // falta gente (no la cocina ni quien abra)
      const e = GEN.previa.meses[iso.slice(0, 7)];
      const cs = candidatosPara(S, S.staff, e, iso, tid).map(c => c.pid);
      out.push({ k, cs, texto: row.textContent.replace(/\s+/g, ' '), botones: [...row.querySelectorAll('[data-aplicaruno]')].map(x => x.dataset.aplicaruno.split('|')[2]) });
    }
    return out;
  });
  const conLimpios = limpios.filter(x => x.cs.length);
  ok('en cada hueco con alguien que puede entrar sin aviso, «Pueden entrar» con sus nombres (un clic lo pone)', limpios.length > 0 && conLimpios.length > 0 && conLimpios.every(x => /Pueden entrar/.test(x.texto) && x.cs.slice(0, 3).every(pid => x.botones.includes(pid))),
    JSON.stringify(limpios.slice(0, 3)).slice(0, 400));
  const estiloPq = await pg.evaluate(() => { const b = document.querySelector('#genRes .genrow.hueco .pqn b'); if (!b) return null; const cs = getComputedStyle(b), rojo = getComputedStyle(document.documentElement).getPropertyValue('--bad').trim(); const tmp = document.createElement('i'); tmp.style.color = rojo; document.body.appendChild(tmp); const cRojo = getComputedStyle(tmp).color; tmp.remove(); return { display: cs.display, color: cs.color, rojo: cRojo }; });
  ok('el porqué de cada hueco va seguido, en el color del texto (no un motivo por renglón y en rojo)', !!estiloPq && estiloPq.display === 'inline' && estiloPq.color !== estiloPq.rojo, JSON.stringify(estiloPq));

  // ── modo relajado: «Permitir partidos no declarados»
  await pg.check('#genPartido');
  await marcaPrevia(pg);
  ok('con «Permitir partidos no declarados», otra vista previa del núcleo, de una sola vuelta (la puerta no rechaza nada)', await previa(pg, 1) && await pg.evaluate(() => GEN.opts.permitirPartido));
  const pr = recibidos[recibidos.length - 1] || null;
  ok('el problema va en el modo relajado y la pareja flexible es blanda', !!pr && pr.meta.permitirPartido === true && pareja(pr, 'soft') && !pareja(pr, 'hard'));
  ok('en el modo relajado, la tarde de Mari Luz del domingo no va vetada (su partido entraría con aviso)', !!pr && w(pr, 'mariluz').unavailable[idx(pr, DOM, 'T')] === undefined, pr && JSON.stringify(w(pr, 'mariluz').unavailable[idx(pr, DOM, 'T')]));
  const cr = await pg.evaluate(d => GEN.previa.aplicados.find(a => a.pid === 'cristian' && a.iso === d && a.turnoId === 'PASARELA_T') || null, DIA);
  ok('el partido de Cristian entra, con su aviso', !!cr && (cr.avisos || []).some(t => /partido no declarado/.test(t)), JSON.stringify(cr));
  ok('Iván sigue sin entrar el lunes (libra: eso no lo relaja nadie)', await pg.evaluate(l => !GEN.previa.aplicados.some(a => a.pid === 'ivan' && a.iso === l), LUN));

  // ── volcar y deshacer
  await pg.click('#genAplicar');
  const puesto = () => pg.evaluate(d => { const e = S.meses[d.slice(0, 7)]; return !!e && ((e.asig[d] || {}).PASARELA_T || []).some(x => x.pid === 'cristian' && x.origen === 'nucleo' && (x.avisos || []).length); }, DIA);
  ok('«Volcar a la planilla» deja a Cristian esa tarde en Pasarela, con el aviso', await llega(pg, d => { const e = S.meses[d.slice(0, 7)]; return !!e && ((e.asig[d] || {}).PASARELA_T || []).some(x => x.pid === 'cristian' && x.origen === 'nucleo'); }, DIA, 5000) >= 0 && await puesto());
  ok('y la semana tipo, como plazas de la semana tipo', await pg.evaluate(d => { const e = S.meses[d.slice(0, 7)]; return !!e && ((e.asig[d] || {}).PASARELA_M || []).some(x => x.pid === 'mariluz' && x.origen === 'patron'); }, DOM));
  await pg.keyboard.press('Control+z');
  ok('Ctrl+Z lo quita todo de una vez', await llega(pg, ds => ds.every(d => { const e = S.meses[d.slice(0, 7)]; return !e || !Object.values(e.asig[d] || {}).some(l => l.length); }), [DOM, DIA], 5000) >= 0);

  // ── el núcleo relaja una regla dura: la línea lo cuenta en palabras
  forzar = { estado: { status: 'FEASIBLE_RELAXED', relaxations: [{ rule_id: 'sin partido', rule_type: 'max_hours_in_window', tier: 2, detail: "Regla dura 'sin partido' relajada para poder generar una planilla." }], violations: [{ rule_id: 'reparto equilibrado', rule_type: 'balance', tier: 1, amount: 3, weight: 2, cost: 6, detail: '' }] } };
  await marcaPrevia(pg);
  ok('otra vista previa, con una regla relajada por el núcleo', await previa(pg));
  const linea2 = await lineaNucleo(pg);
  ok('la línea dice qué regla se ha saltado, en palabras («sin partido»), sin el JSON ni contar el reparto como regla relajada', /sin partido/.test(linea2) && !JERGA.test(linea2), linea2);

  // ── el núcleo no acepta los datos (422, como lo devuelve pydantic): un aviso que se entiende
  forzar = { http: 422, cuerpo: { detail: [{ type: 'list_type', loc: ['body', 'problem', 'workers', 0, 'unavailable', '1'], msg: 'Input should be a valid list', input: '*' }, { type: 'list_type', loc: ['body', 'problem', 'workers', 0, 'unavailable', '3'], msg: 'Input should be a valid list', input: '*' }] } };
  await pg.evaluate(() => { window.__toasts = []; new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.classList && n.classList.contains('toast')) window.__toasts.push(n.textContent.replace(/\s+/g, ' ').trim()); }).observe(document.getElementById('toasts'), { childList: true }); });
  await pg.click('#genPrevia');
  await llega(pg, () => !GEN.ocupado && (window.__toasts || []).some(t => /núcleo/i.test(t) && !/Enviando/.test(t)), null, 10000);
  const avisos = await pg.evaluate(() => window.__toasts || []);
  ok('un 422 del núcleo se cuenta en palabras («no ha aceptado los datos (2 con formato incorrecto)»), sin «[object Object]»', avisos.some(t => /El núcleo no ha aceptado los datos \(2 con formato incorrecto\)/.test(t)) && !avisos.some(t => /object Object/.test(t)), JSON.stringify(avisos));

  // ── «Solo desde hoy»: el problema empieza hoy y nada de la vista previa es de días pasados
  const hoy = await pg.evaluate(() => isoHoy());
  const menos3 = await pg.evaluate(h => addDias(h, -3), hoy), mas3 = await pg.evaluate(h => addDias(h, 3), hoy);
  await pg.fill('#genD1', menos3); await pg.dispatchEvent('#genD1', 'change');
  await pg.fill('#genD2', mas3); await pg.dispatchEvent('#genD2', 'change');
  ok('«Solo desde hoy» sigue marcado', await pg.evaluate(() => GEN.opts.desdeHoy && document.getElementById('genDesdeHoy').checked));
  await marcaPrevia(pg);
  ok('vista previa del periodo que empieza hace tres días', await previa(pg));
  const ph = recibidos[recibidos.length - 1] || null;
  ok('«Solo desde hoy» llega al núcleo: el problema empieza hoy', !!ph && ph.meta.desde === hoy && ph.meta.indices.every(x => x.iso >= hoy), ph && JSON.stringify([ph.meta.desde, ph.meta.hasta, hoy]));
  ok('y nada de la vista previa (plazas ni huecos) es de un día pasado', await pg.evaluate(h => GEN.previa.aplicados.every(a => a.iso >= h) && GEN.previa.huecos.every(x => x.iso >= h) && (GEN.previa.rechazados || []).every(x => x.iso >= h), hoy),
    await pg.evaluate(h => JSON.stringify([...GEN.previa.aplicados, ...GEN.previa.huecos].filter(a => a.iso < h).slice(0, 3)), hoy));

  ok('sin errores de página', errores.length === 0, errores.join(' | '));
  await ctx.close();
} catch (e) {
  ok('la batería termina sin excepción', false, e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e);
} finally {
  await br.close();
  srv.kill();
  nucleo.close();
  try { rmSync(dir, { recursive: true, force: true }); } catch (e) {}
  console.log(`(${Math.round((Date.now() - t0) / 1000)} s)`);
}
resumen();
