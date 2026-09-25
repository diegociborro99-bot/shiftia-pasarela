// EL MOTOR NÚCLEO CONTRA EL NÚCLEO DE VERDAD (25/09, revisión de la fase 7). Las otras baterías usan un núcleo de
// pega; esta manda el problema al servicio shiftia-core de verdad (su esquema pydantic y su CP-SAT) por el mismo
// camino que la app (flujoNucleo, con su segunda vuelta) y compara con el generador local. Los revisores de la fase 7
// lo hicieron a mano y encontraron lo que el núcleo de pega no podía ver: el servicio rechazaba el problema (422,
// «*» como texto) y, arreglado eso, un solo medio día imposible le hacía relajar los mínimos de todo el periodo
// (7 casillas cortas en la semana del 5/10 frente a 1 del generador local; 32 frente a 4 en octubre).
// Se comprueba, en el modo estricto y en el relajado del Generador:
//  · el núcleo acepta cada petición (200, sin 422) y encuentra planilla, sin relajar los mínimos;
//  · el Núcleo no deja más casillas cortas que el generador local (la semana del 5/10, octubre entero y la semana
//    del 28/09 con el cierre del Mónaco, el día libre cambiado de Mari Luz, su «cubre a Iván» y las vacaciones de
//    Iván: el caso de la reunión del 24/09);
//  · en el cierre: nadie en el Mónaco cerrado, Dulce (standby) no entra y Susana Capón (vacaciones) tampoco.
// Solo corre con un núcleo de verdad en SHIFTIA_CORE_REAL (la URL del servicio: p. ej. `uvicorn service.app:app
// --port 8766` en una copia de shiftia-core, con ortools y pydantic); si no, se salta sin fallar (SALTADA).
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contador } from './e2e-util.mjs';

const URL_NUCLEO = process.env.SHIFTIA_CORE_REAL;
if (!URL_NUCLEO) { console.log('SALTADA: sin núcleo de verdad (SHIFTIA_CORE_REAL con la URL de shiftia-core)'); process.exit(0); }
const require = createRequire(import.meta.url);
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const M = require(process.env.MODELO || join(RAIZ, 'modelo.js'));
const { erroresPeticion } = require('./nucleo-esquema.cjs');
const { ok, resumen } = contador();
const t0 = Date.now();

let vivo = false;
try { vivo = (await fetch(URL_NUCLEO + '/healthz', { signal: AbortSignal.timeout(5000) })).ok; } catch (e) { vivo = false; }
ok(`el núcleo de verdad responde en ${URL_NUCLEO}`, vivo);
if (!vivo) resumen();

// los meses (vacíos) del periodo y la cuenta de lo que falta en sus casillas abiertas
const mesesDe = (desde, hasta) => { const m = {}; for (const iso of M.rangoIso(desde, hasta)) { const k = iso.slice(0, 7); if (!m[k]) m[k] = M.nuevoEstado(+k.slice(0, 4), +k.slice(5, 7), { festivos: [] }); } return m; };
const recorte = (e, desde, hasta) => [desde > e.days[0].iso ? desde : e.days[0].iso, hasta < e.days[e.days.length - 1].iso ? hasta : e.days[e.days.length - 1].iso];
function cortas(cfg, meses, desde, hasta) {
  let n = 0; const cs = [];
  for (const e of Object.values(meses)) {
    const [d1, d2] = recorte(e, desde, hasta);
    for (const iso of M.rangoIso(d1, d2)) for (const t of M.turnosDe(cfg)) {
      if (!M.turnoAbierto(cfg, e, iso, t.id)) continue;
      const f = M.revisarTurno(cfg, cfg.staff, e, iso, t.id).faltan;
      if (f > 0) { n += f; cs.push(`${iso.slice(5)} ${t.id}`); }
    }
  }
  return { n, cs };
}
// el generador local, como Generador → Periodo (generarSobre: mes a mes, con los otros meses para la carga)
function local(cfg, desde, hasta, relajado) {
  const meses = mesesDe(desde, hasta);
  for (const e of Object.values(meses)) { const [d1, d2] = recorte(e, desde, hasta); M.generarPlanilla(cfg, cfg.staff, e, d1, d2, { permitirPartido: relajado, meses }); }
  return cortas(cfg, meses, desde, hasta);
}
// el motor Núcleo, por el mismo camino que la app (flujoNucleo), con el servicio de verdad
async function nucleo(cfg, desde, hasta, relajado) {
  const meses = mesesDe(desde, hasta);
  const it = M.flujoNucleo(cfg, cfg.staff, meses, desde, hasta, { permitirPartido: relajado });
  const vueltas = [];
  let paso = it.next();
  while (!paso.done) {
    const pet = paso.value, esquema = erroresPeticion(pet);
    const t = Date.now();
    const r = await fetch(URL_NUCLEO + '/v1/solve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pet), signal: AbortSignal.timeout(120000) });
    const datos = await r.json().catch(() => null);
    vueltas.push({ http: r.status, esquema: esquema.length, status: datos && datos.status, relajadas: ((datos && datos.relaxations) || []).map(x => x.rule_id), ms: Date.now() - t, detalle: r.ok ? '' : JSON.stringify(datos).slice(0, 300) });
    paso = it.next({ ok: r.ok, status: r.status, datos });
  }
  return { r: paso.value, vueltas, meses, cortas: cortas(cfg, meses, desde, hasta) };
}
const COBERTURA = /mínimos|casillas cerradas/;
async function caso(nombre, preparar, desde, hasta, extra) {
  for (const relajado of [false, true]) {
    const modo = relajado ? 'relajado' : 'estricto';
    const cfg = M.semillaPasarela(); preparar(cfg);
    const n = await nucleo(cfg, desde, hasta, relajado);
    const cfgL = M.semillaPasarela(); preparar(cfgL);
    const l = local(cfgL, desde, hasta, relajado);
    const resumenV = n.vueltas.map(v => `${v.http} ${v.status || ''} ${v.ms} ms${v.relajadas.length ? ' · relaja ' + v.relajadas.join(', ') : ''}`).join(' | ');
    ok(`${nombre} (${modo}): el núcleo acepta cada petición y encuentra planilla (${resumenV})`, !n.r.error && n.vueltas.length && n.vueltas.every(v => v.http === 200 && !v.esquema && v.status !== 'INVALID'), n.vueltas.map(v => v.detalle).join(' | ') || JSON.stringify(n.r.error || {}).slice(0, 300));
    ok(`${nombre} (${modo}): no relaja los mínimos (un medio día imposible no arrastra a los demás)`, n.vueltas.every(v => !v.relajadas.some(id => COBERTURA.test(id))), resumenV);
    ok(`${nombre} (${modo}): el Núcleo no deja más casillas cortas que el generador local (núcleo ${n.cortas.n}, local ${l.n})`, n.cortas.n <= l.n, `núcleo: ${n.cortas.cs.join(', ')} · local: ${l.cs.join(', ')}`);
    if (extra) extra(ok, cfg, n, modo);
  }
}

try {
  await caso('semana del 5/10', () => {}, '2026-10-05', '2026-10-11');
  await caso('octubre', () => {}, '2026-10-01', '2026-10-31');
  // la reunión del 24/09 y el mensaje de Diego: el Mónaco cierra del domingo 27 por la tarde al martes 29 (Susana
  // Capón de vacaciones, Yilian de apoyo, el resto sin trabajo); Mari Luz libra el martes 29 en vez del miércoles
  // y cubre a Iván, que se coge de vacaciones del viernes 2 al domingo 4
  const cierre = cfg => {
    cfg.cierresPuntuales = [{ id: 'cie_real', localId: 'MONACO', motivo: 'reforma', detalle: '', dias: { '2026-09-27': ['T'], '2026-09-28': ['M', 'T'], '2026-09-29': ['M', 'T'] },
      decisiones: { scapon: { tipo: 'VAC', turnos: ['2026-09-27|T', '2026-09-29|T'], dias: ['2026-09-27', '2026-09-29'] }, jenny: { tipo: 'SIN', turnos: ['2026-09-27|T', '2026-09-28|M'] }, cris: { tipo: 'SIN', turnos: ['2026-09-28|M', '2026-09-29|M'] },
        cristian: { tipo: 'SIN', turnos: ['2026-09-28|M', '2026-09-29|T'] }, yilian: { tipo: 'REFUERZA', turnos: ['2026-09-28|T', '2026-09-29|M'] }, hojan: { tipo: 'SIN', turnos: ['2026-09-28|T'] }, esmeralda: { tipo: 'SIN', turnos: ['2026-09-29|M'] } } }];
    M.personaDe(cfg.staff, 'scapon').ausencias = [{ tipo: 'VAC', desde: '2026-09-27', hasta: '2026-09-27', detalle: 'cierre de Bar Mónaco · reforma' }, { tipo: 'VAC', desde: '2026-09-29', hasta: '2026-09-29', detalle: 'cierre de Bar Mónaco · reforma' }];
    const ml = M.personaDe(cfg.staff, 'mariluz'); M.ponerLibraPuntual(ml, '2026-09-28', [2]); ml.cubreA = [{ pid: 'ivan' }];
    M.personaDe(cfg.staff, 'ivan').ausencias = [{ tipo: 'VAC', desde: '2026-10-02', hasta: '2026-10-04' }];
  };
  await caso('semana del 28/09 con el cierre del Mónaco', cierre, '2026-09-28', '2026-10-04', (ok, cfg, n, modo) => {
    const en = (iso, tid) => { const e = n.meses[iso.slice(0, 7)]; return e ? M.pidsEn(e, iso, tid) : []; };
    const cerradas = [['2026-09-28', 'MONACO_M'], ['2026-09-28', 'MONACO_T'], ['2026-09-29', 'MONACO_M'], ['2026-09-29', 'MONACO_T']];
    ok(`cierre (${modo}): nadie en el Mónaco cerrado`, cerradas.every(([iso, tid]) => !en(iso, tid).length), JSON.stringify(cerradas.map(([iso, tid]) => en(iso, tid))));
    const todas = pid => [...M.rangoIso('2026-09-28', '2026-10-04')].flatMap(iso => M.turnosDe(cfg).filter(t => en(iso, t.id).includes(pid)).map(t => iso.slice(5) + ' ' + t.id));
    ok(`cierre (${modo}): Dulce (standby) no entra y Susana Capón no trabaja el martes 29 (vacaciones)`, !todas('dulce').length && !todas('scapon').some(x => x.startsWith('09-29')), JSON.stringify({ dulce: todas('dulce'), scapon: todas('scapon') }));
    ok(`cierre (${modo}): Mari Luz no trabaja el martes 29 (libra ese día esa semana) y cubre a Iván el viernes`, !todas('mariluz').some(x => x.startsWith('09-29')) && todas('mariluz').includes('10-02 PASARELA_T'), JSON.stringify(todas('mariluz')));
  });
} catch (e) {
  ok('la batería termina sin excepción', false, e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e);
}
console.log(`(${Math.round((Date.now() - t0) / 1000)} s)`);
resumen();
