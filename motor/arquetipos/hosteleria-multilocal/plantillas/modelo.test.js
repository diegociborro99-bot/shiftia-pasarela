'use strict';
// Tests genéricos del modelo — Shiftia · {{nombre}} (los escribe el motor de creación).
// Comprueban que la semilla del cliente tiene la forma que espera la app y que las piezas
// del motor de planificación —reglas, asignación, generador, cobertura, horas, fusión—
// funcionan sobre ella. Las reglas propias del cliente se añaden aquí como tests nuevos,
// en rojo antes de tocar modelo.js. `node modelo.test.js`; MODELO=ruta para probar otro.
const assert = require('assert');
const M = require(process.env.MODELO || './modelo.js');

let n = 0;
function ok(name, fn) { n++; fn(); console.log(`  ✓ ${name}`); }
const TODOS = [1, 2, 3, 4, 5, 6, 7];
const cfgBase = () => M.semillaCliente();
const UNIDADES = [{{#cada unidades}}'{{id}}'{{#no @ultimo}}, {{/no}}{{/cada}}];
const PUESTOS = [{{#cada puestos}}'{{id}}'{{#no @ultimo}}, {{/no}}{{/cada}}];
const persona = (id, extra) => Object.assign({ id, nombre: id[0].toUpperCase() + id.slice(1), puesto: PUESTOS[0], locales: [], franjas: ['M', 'T'], libra: [], partido: { dias: [] }, cocina: { titular: [], reserva: [], soloDias: [] }, abre: {}, noAbre: [], nuncaCon: [], cubreA: [], vetos: [], contrato: { horasSemana: null }, ausencias: [], prefs: {}, nota: '', supuestos: [] }, extra || {});

// Escenario sintético sobre el primer local del cliente, con tres personas de prueba: así
// los tests no dependen de la plantilla real y valen para cualquier burbuja del motor.
// Octubre de 2026: el 1 es jueves; lunes 5; domingo 4.
function escenario() {
  const cfg = cfgBase();
  const l = cfg.locales[0];
  l.abre = { M: TODOS.slice(), T: TODOS.slice() };
  l.minimos = { M: {}, T: {} }; l.supuestos = { M: {}, T: {} };
  for (const d of TODOS) { l.minimos.M[d] = 1; l.minimos.T[d] = 1; }
  l.cocina = { obligatoria: { M: false, T: false }, titulares: { M: [], T: [] }, reservas: [], posicion: { M: 2, T: 2 }, posicionSiDesde: {} };
  l.primero = { M: null, T: null }; l.partidoAbre = { M: false, T: false };
  cfg.locales = [l];
  const st = [persona('ana', { locales: [l.id] }), persona('bea', { locales: [l.id], franjas: ['M'], libra: [7] }), persona('cesar', { locales: [l.id], franjas: ['T'], nuncaCon: ['ana'] })];
  M.asignarColores(st);
  cfg.staff = st; cfg.patron = {}; cfg.reglas = {}; cfg.eventos = []; cfg.festivos = []; cfg.extras = [];
  const e = M.nuevoEstado(2026, 10, { festivos: [] });
  return { cfg, st, e, l, TM: M.turnoId(l.id, 'M'), TT: M.turnoId(l.id, 'T') };
}

console.log('Tests del modelo — {{nombre}}:');

ok('fechas: isoDow (1 = lunes … 7 = domingo), mondayOf, addDias, diasDelMes, claveMes', () => {
  assert.strictEqual(M.isoDow('2026-10-05'), 1);
  assert.strictEqual(M.isoDow('2026-10-04'), 7);
  assert.strictEqual(M.mondayOf('2026-10-08'), '2026-10-05');
  assert.strictEqual(M.addDias('2026-10-31', 1), '2026-11-01');
  assert.strictEqual(M.diasDelMes(2026, 10), 31);
  assert.strictEqual(M.claveMes(2026, 3), '2026-03');
});

ok(`la semilla trae ${UNIDADES.length} unidad(es) con la forma que espera la app`, () => {
  const cfg = cfgBase();
  assert.deepStrictEqual(cfg.locales.map(l => l.id), UNIDADES);
  assert.strictEqual(M.turnosDe(cfg).length, UNIDADES.length * M.FRANJAS.length);
  for (const l of cfg.locales) {
    assert.ok(l.nombre && l.corto && /^#[0-9a-f]{6}$/i.test(l.color), `${l.id}: nombre, corto y color`);
    for (const f of M.FRANJAS) {
      assert.ok(Array.isArray(l.abre[f]), `${l.id}.abre.${f}`);
      for (const d of TODOS) assert.ok(Number.isInteger(l.minimos[f][d]) && l.minimos[f][d] >= 0, `${l.id}.minimos.${f}[${d}]`);
      assert.ok(l.horario[f] && l.horario[f].ini && l.horario[f].fin, `${l.id}.horario.${f}`);
      assert.ok(l.duracion[f] > 0, `${l.id}.duracion.${f}`);
      assert.ok(Array.isArray(l.cocina.titulares[f]), `${l.id}.cocina.titulares.${f}`);
      assert.ok(typeof l.cocina.obligatoria[f] === 'boolean', `${l.id}.cocina.obligatoria.${f}`);
    }
    assert.ok(typeof l.horarioSupuesto === 'boolean' && typeof l.duracionSupuesta === 'boolean', `${l.id}: marcas de supuesto`);
  }
  for (const k of ['patron', 'equipos', 'eventos', 'extras', 'festivos', 'cierres', 'reglas']) assert.ok(k in cfg, `la semilla trae ${k}`);
});

ok('la semilla trae {{nEquipo}} persona(s) con todos los campos de la ficha, color asignado y una semana tipo coherente', () => {
  const cfg = cfgBase();
  assert.strictEqual(cfg.staff.length, {{nEquipo}});
  assert.strictEqual(new Set(cfg.staff.map(p => p.id)).size, cfg.staff.length, 'ids únicos');
  for (const p of cfg.staff) {
    assert.ok(/^[a-z0-9]+$/.test(p.id) && p.nombre, p.id);
    assert.ok(PUESTOS.includes(p.puesto), `${p.id}: puesto «${p.puesto}»`);
    for (const k of ['locales', 'franjas', 'libra', 'noAbre', 'nuncaCon', 'cubreA', 'vetos', 'ausencias', 'supuestos']) assert.ok(Array.isArray(p[k]), `${p.id}.${k}`);
    for (const u of p.locales) assert.ok(UNIDADES.includes(u), `${p.id} trabaja en «${u}», que no es una unidad`);
    assert.ok(p.partido && Array.isArray(p.partido.dias) && p.cocina && p.contrato && p.prefs, `${p.id}: partido, cocina, contrato, prefs`);
    assert.ok(Number.isInteger(p.color), `${p.id}: color`);
  }
  const ids = new Set(cfg.staff.map(p => p.id)), turnos = new Set(M.turnosDe(cfg).map(t => t.id));
  for (const plazas of Object.values(cfg.patron)) for (const pl of plazas) { assert.ok(turnos.has(pl.t), `semana tipo: turno ${pl.t}`); assert.ok(ids.has(pl.p), `semana tipo: persona ${pl.p}`); }
});

ok('los puestos del modelo son los del manifiesto', () => {
  assert.deepStrictEqual(M.PUESTOS.map(p => p.id), PUESTOS);
});

ok('nuevoEstado y estadoDesde: el mes con sus días y festivos; lo guardado se recupera', () => {
  const e = M.nuevoEstado(2026, 10, { festivos: ['2026-10-12'] });
  assert.strictEqual(e.days.length, 31);
  assert.strictEqual(e.days[0].iso, '2026-10-01'); assert.strictEqual(e.days[0].dow, 4);
  assert.ok(e.days.find(d => d.iso === '2026-10-12').festivo);
  const meses = { '2026-10': { asig: { '2026-10-05': { X_M: [{ pid: 'ana' }] } }, apertura: {}, manual: {} } };
  assert.deepStrictEqual(M.pidsEn(M.estadoDesde(meses, [], 2026, 10), '2026-10-05', 'X_M'), ['ana']);
});

ok('puedeEstar: reglas duras (franja que no trabaja, día que libra, ausencia, «nunca con», duplicado)', () => {
  const { cfg, st, e, TM, TT } = escenario();
  assert.ok(M.puedeEstar(cfg, st, e, '2026-10-06', TM, 'ana').ok, 'ana hace mañanas');
  const r1 = M.puedeEstar(cfg, st, e, '2026-10-06', TT, 'bea');
  assert.ok(!r1.ok && r1.motivo, 'bea no hace tardes');
  assert.ok(!M.puedeEstar(cfg, st, e, '2026-10-04', TM, 'bea').ok, 'bea libra los domingos');
  M.anadirAusencia(st[1], { tipo: 'VAC', desde: '2026-10-19', hasta: '2026-10-23' });
  assert.ok(M.ausenciaEn(st[1], '2026-10-21'));
  assert.ok(!M.puedeEstar(cfg, st, e, '2026-10-21', TM, 'bea').ok, 'de vacaciones no se coloca');
  assert.ok(M.asignar(e, cfg, st, '2026-10-06', TT, 'ana').ok);
  assert.ok(!M.puedeEstar(cfg, st, e, '2026-10-06', TT, 'cesar').ok, '«nunca con» ana');
  assert.ok(!M.asignar(e, cfg, st, '2026-10-06', TT, 'ana').ok, 'ya está en la casilla');
});

ok('asignar y desasignar dejan la casilla como lista ordenada; revisarTurno y revisionMes ven lo que falta', () => {
  const { cfg, st, e, TM } = escenario();
  assert.strictEqual(M.revisarTurno(cfg, st, e, '2026-10-06', TM).faltan, 1);
  assert.ok(M.asignar(e, cfg, st, '2026-10-06', TM, 'ana', { origen: 'manual' }).ok);
  assert.deepStrictEqual(M.pidsEn(e, '2026-10-06', TM), ['ana']);
  assert.strictEqual(M.casillasDe(e, '2026-10-06', 'ana').length, 1);
  const rev = M.revisarTurno(cfg, st, e, '2026-10-06', TM);
  assert.strictEqual(rev.faltan, 0); assert.strictEqual(rev.n, 1);
  assert.ok(M.desasignar(e, '2026-10-06', TM, 'ana'));
  assert.deepStrictEqual(M.pidsEn(e, '2026-10-06', TM), []);
  assert.ok(M.revisionMes(cfg, st, e).some(x => x.tipo === 'falta'), 'la revisión del mes ve los huecos');
});

ok('generarSemana rellena los mínimos con candidatos, explica las condiciones y es aditivo', () => {
  const { cfg, st, e } = escenario();
  const g = M.generarSemana(cfg, st, e, '2026-10-05', {});
  assert.strictEqual(g.dias.length, 7); assert.strictEqual(g.locales.length, 1);
  assert.ok(g.aplicados > 0 && g.resumen.plazas > 0, 'coloca a alguien');
  assert.ok(Array.isArray(g.condiciones) && g.condiciones.every(c => typeof c.ok === 'boolean'));
  assert.ok(Array.isArray(g.huecos) && Array.isArray(g.cambios) && g.libran);
  const g2 = M.generarSemana(cfg, st, e, '2026-10-05', {});
  assert.strictEqual(g2.aplicados, 0, 'la segunda pasada no toca nada');
  assert.strictEqual(g2.resumen.plazas, g.resumen.plazas);
  assert.ok(Object.keys(M.patronDesdeSemana(e, '2026-10-05')).length, 'la semana se puede fijar como semana tipo');
});

ok('gestor de cobertura: plan A (y B) para una ausencia; aplicar deja ficha y planilla coherentes', () => {
  const { cfg, st, e, TM } = escenario();
  assert.ok(M.asignar(e, cfg, st, '2026-10-06', TM, 'ana').ok);
  const inc = { pid: 'ana', tipo: 'LD', desde: '2026-10-06', hasta: '2026-10-06' };
  const planes = M.planesCobertura(cfg, st, e, inc, {});
  assert.strictEqual(planes.afectados.length, 1);
  assert.ok(planes.planes.length >= 1 && planes.planes[0].id === 'A');
  const A = planes.planes[0];
  assert.ok(A.asignaciones.length + A.huecos.length >= 1, 'propone a alguien o explica el hueco');
  const res = M.aplicarCobertura(cfg, st, e, inc, A);
  assert.strictEqual(res.quitados, 1);
  assert.ok(!M.pidsEn(e, '2026-10-06', TM).includes('ana'));
  assert.ok(M.ausenciaEn(st[0], '2026-10-06'), 'la ausencia queda en la ficha');
  if (A.asignaciones.length) assert.ok(M.pidsEn(e, '2026-10-06', TM).includes(A.asignaciones[0].pid), 'quien cubre entra');
});

ok('horas del mes: cada turno cuenta la duración del local para la nómina', () => {
  const { cfg, st, e, l, TM } = escenario();
  for (const iso of ['2026-10-05', '2026-10-06', '2026-10-07']) assert.ok(M.asignar(e, cfg, st, iso, TM, 'ana').ok);
  const meses = { '2026-10': { asig: e.asig, apertura: e.apertura, manual: e.manual } };
  const h = M.horasPersonaMes(cfg, st, meses, 'ana', 2026, 10);
  assert.strictEqual(h.turnos, 3); assert.strictEqual(h.mananas, 3); assert.strictEqual(h.dias, 3);
  assert.strictEqual(h.minutos, 3 * l.duracion.M);
  assert.strictEqual(h.horas, Math.round(h.minutos / 6) / 10);
  assert.strictEqual(M.horasEquipoMes(cfg, st, meses, 2026, 10).length, st.length);
});

ok('vaciar la planilla quita las plazas y respeta las ausencias', () => {
  const { cfg, st, e, TM } = escenario();
  M.asignar(e, cfg, st, '2026-10-06', TM, 'ana');
  M.anadirAusencia(st[1], { tipo: 'BAJ', desde: '2026-10-01' });
  const r = M.vaciarPlanilla(e, '2026-10-01', '2026-10-31');
  assert.strictEqual(r.plazas, 1);
  assert.deepStrictEqual(M.pidsEn(e, '2026-10-06', TM), []);
  assert.ok(M.ausenciaEn(st[1], '2026-10-15'));
});

ok('fusionarEstado junta lo que hizo el empleado en el servidor con lo que hizo el encargado en local', () => {
  const base = { staff: [], locales: [], meses: {}, peticiones: [], avisos: [] };
  const servidor = Object.assign({}, base, { peticiones: [{ id: 'p1', pid: 'ana', tipo: 'VAC', estado: 'pendiente' }] });
  const local = Object.assign({}, base, { peticiones: [], avisos: [{ id: 'a1', texto: 'hola' }] });
  const r = M.fusionarEstado(base, servidor, local);
  assert.ok(r.ok, r.motivo);
  assert.deepStrictEqual(r.estado.peticiones.map(p => p.id), ['p1']);
  assert.deepStrictEqual(r.estado.avisos.map(a => a.id), ['a1']);
  assert.strictEqual(r.nuevasPeticiones, 1);
});

ok('sembrarDemo genera el mes en curso y el siguiente sin pisar lo que ya tenga algo', () => {
  const S = Object.assign(cfgBase(), { meses: {} });
  const r = M.sembrarDemo(S, '2026-10-10');
  assert.deepStrictEqual(r.meses, ['2026-10', '2026-11']);
  assert.ok(S.meses['2026-10'] && S.meses['2026-11']);
  if (r.aplicados > 0) assert.deepStrictEqual(M.sembrarDemo(S, '2026-10-10').meses, [], 'un mes con plazas no se vuelve a sembrar');
});

ok('condicionesDe y verificarSemana: el catálogo numerado, su comprobación y los interruptores de las reglas', () => {
  const { cfg, st, e } = escenario();
  const conds = M.condicionesDe(cfg, st);
  assert.ok(conds.length > 0 && conds.every((c, i) => c.num === i + 1 && c.id && c.texto));
  assert.ok(conds.some(c => c.id.startsWith('min:')), 'los mínimos son condiciones');
  assert.ok(conds.some(c => c.k === 'nuncaCon'), 'el «nunca con» de cesar es una condición');
  assert.strictEqual(M.verificarSemana(cfg, st, e, '2026-10-05').length, conds.length);
  cfg.reglas = { nuncaCon: false };
  assert.ok(!M.condicionesDe(cfg, st).some(c => c.k === 'nuncaCon'), 'una regla apagada desaparece del catálogo');
});

ok('visibilidad de los meses para el personal y usuario sugerido', () => {
  assert.ok(M.mesVisibleParaPersonal(['2026-12'], '2026-12', '2026-10'));
  assert.ok(!M.mesVisibleParaPersonal(['2026-12'], '2027-01', '2026-10'));
  assert.ok(M.mesVisibleParaPersonal([], '2026-09', '2026-10'), 'los meses pasados siempre');
  assert.deepStrictEqual(Object.keys(M.mesesVisibles({ meses: { '2026-09': {}, '2026-12': {}, '2027-01': {} }, mesesPublicados: ['2026-12'] }, '2026-10')), ['2026-09', '2026-12']);
  assert.strictEqual(M.sugerirUsuario('Ana Pérez', ['ana.perez']), 'ana.perez2');
});

console.log(`\n${n} tests OK`);
