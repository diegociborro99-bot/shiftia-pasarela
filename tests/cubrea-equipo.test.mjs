// «Cubre a» hasta nueva orden (24/09, D13), lo que no es el modelo: lo que viaja al empleado.
// Revisión F3b: la marca `porDesignacion` de una entrada dice que un compañero tiene la designación de
// cubrir a otro («ni a quién cubren» es justo lo que se le oculta de las fichas). La casilla sigue
// diciendo «por Iván» (lo necesita para leerla), pero la marca interna no viaja.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { estadoParaEmpleado } = require(join(RAIZ, 'estado-servidor.js'));

const estado = () => ({
  staff: [{ id: 'ivan', nombre: 'Iván' }, { id: 'mariluz', nombre: 'Mari Luz', cubreA: [{ pid: 'ivan' }] }, { id: 'dulce', nombre: 'Dulce', cubreA: [{ pid: 'ivan' }] }],
  meses: { '2026-10': { asig: { '2026-10-02': { PASARELA_T: [
    { pid: 'mariluz', origen: 'cobertura', por: 'ivan', razon: 'cubre a Iván', relevo: true },
    { pid: 'dulce', origen: 'cobertura', por: 'ivan', razon: 'cubre a Iván', porDesignacion: true },
  ] } }, apertura: {}, manual: {} } },
});

test('el empleado ve «por Iván» en la casilla, pero no la marca de que venía de una designación de un compañero', () => {
  const src = estado();
  const e = estadoParaEmpleado(src, 'dulce', '2026-10');
  const cas = e.meses['2026-10'].asig['2026-10-02'].PASARELA_T;
  // (01/10, A6; auditoría G10) de la entrada de una compañera, el «por» sí y la razón no (dice la carga y las condiciones de otros)
  assert.deepEqual(cas.map(x => [x.pid, x.por, x.razon]), [['mariluz', 'ivan', undefined], ['dulce', 'ivan', 'cubre a Iván']]);
  assert.ok(!/porDesignacion/.test(JSON.stringify(e.meses)), 'la marca no viaja');
  assert.equal(e.staff.find(p => p.id === 'mariluz').cubreA, undefined, 'ni las designaciones de los compañeros');
  // no se toca el estado del servidor: el encargado la sigue teniendo
  assert.equal(src.meses['2026-10'].asig['2026-10-02'].PASARELA_T[1].porDesignacion, true);
});

// 25/09 (revisión final, datos de producción): los avisos que se guardan en una entrada forzada («nunca con Lavinia»,
// «nunca con Susana Capón») dicen las parejas «nunca con» de los compañeros, que al empleado se le quitan de las
// fichas (fase 6). Viajaban en la casilla: Lola, Iván o Susana Capón recibían «nunca con Lavinia» de Mari Luz. La
// vista del empleado no los usa (su casilla dice quién está, «por» quién y el tramo); la marca `forzado` se quedaba (desde la
// corrección de A6, tampoco: ver abajo).
test('el empleado no recibe los avisos de las entradas (dicen las parejas «nunca con» de los compañeros)', () => {
  const src = estado();
  src.meses['2026-10'].asig['2026-10-07'] = { PASARELA_M: [{ pid: 'mariluz', origen: 'manual', forzado: true, avisos: ['nunca con Lavinia'] }, { pid: 'lavinia', origen: 'patron' }] };
  const e = estadoParaEmpleado(src, 'dulce', '2026-10');
  assert.ok(!/nunca con/.test(JSON.stringify(e)), JSON.stringify(e.meses['2026-10'].asig['2026-10-07']));
  const en = e.meses['2026-10'].asig['2026-10-07'].PASARELA_M[0];
  // (corrección de A6; revisión de cliente S3) la marca `forzado` de una compañera tampoco viaja (su app no la enseña)
  assert.deepEqual([en.pid, en.forzado, en.origen], ['mariluz', undefined, undefined]);
  assert.deepEqual(src.meses['2026-10'].asig['2026-10-07'].PASARELA_M[0].avisos, ['nunca con Lavinia'], 'el estado del servidor no se toca');
  // ni la marca «flexible» de antes de la fase 6 en su propia ficha (llega mientras nadie guarde con la versión nueva)
  src.staff.find(p => p.id === 'dulce').nuncaConFlexible = true;
  assert.equal(estadoParaEmpleado(src, 'dulce', '2026-10').staff.find(p => p.id === 'dulce').nuncaConFlexible, undefined);
});

// ---------- 01/10 (A6; auditoría G5, G6, G10 y el añadido de A5): lo que le falta al empleado y lo que le sobra ----------
const M = require(join(RAIZ, 'modelo.js'));
// la semilla entera como estado del servidor: la semana del 5/10 generada, Dulce de apoyo con horas a mano el sábado y una
// entrada de la Cobertura con «por» y la marca de la ausencia
function estadoServidor() {
  const cfg = M.semillaPasarela(), st = cfg.staff;
  M.personaDe(st, 'dulce').standby = false;
  const e = M.nuevoEstado(2026, 10, { festivos: [] });
  M.generarPlanilla(cfg, st, e, '2026-10-01', '2026-10-11', {});
  const SAB = '2026-10-03';
  M.asignar(e, cfg, st, SAB, 'PASARELA_T', 'dulce', { forzar: true, permitirPartido: true, puesto: 'sala' });
  Object.assign(e.asig[SAB].PASARELA_T.find(x => x.pid === 'dulce'), { ini: '20:30', fin: '01:00', nota: 'llega del otro bar' });
  e.asig[SAB].PASARELA_T.push({ pid: 'roberto', origen: 'cobertura', por: 'ivan', razon: 'por Iván', porAusenciaDe: 'ivan', abre: false, cocina: false });
  return Object.assign({}, cfg, { meses: { '2026-10': { asig: e.asig, apertura: e.apertura, manual: e.manual } }, peticiones: [], avisos: [], historial: [], reglas: { libra: false, minimos: false }, mesesPublicados: [], migraciones: { altas1709: 1 }, esquema: 2 });
}

test('(A6, G5) el empleado recibe las reglas del grupo: su app no las da por encendidas', () => {
  const v = estadoParaEmpleado(estadoServidor(), 'ivan', '2026-10');
  assert.deepEqual(v.reglas, { libra: false, minimos: false });
  assert.equal(M.regla(v, 'libra'), false);
  assert.equal(M.estadoDia(v, v.staff.find(p => p.id === 'ivan'), '2026-10-05').texto, '', 'con «Días que libra» apagada no «libra los lunes»');
  assert.deepEqual(estadoParaEmpleado({ staff: [] }, 'ivan', '2026-10').reglas, {}, 'sin reglas guardadas, las de siempre (todas encendidas)');
});

test('(A6, G10 y A5) de las entradas de los compañeros no le llegan las horas a mano, la razón ni la marca de la ausencia; el «por» y la nota, sí. Las suyas, enteras', () => {
  const src = estadoServidor();
  const v = estadoParaEmpleado(src, 'ivan', '2026-10');
  const cas = v.meses['2026-10'].asig['2026-10-03'].PASARELA_T;
  const dulce = cas.find(x => x.pid === 'dulce'), rob = cas.find(x => x.pid === 'roberto');
  assert.deepEqual([dulce.ini, dulce.fin, dulce.razon, dulce.nota], [undefined, undefined, undefined, 'llega del otro bar'], JSON.stringify(dulce));
  assert.deepEqual([rob.por, rob.porAusenciaDe, rob.razon], ['ivan', undefined, undefined], JSON.stringify(rob));
  const todas = Object.values(v.meses['2026-10'].asig).flatMap(d => Object.values(d)).flat();
  assert.ok(todas.filter(x => x.pid !== 'ivan').every(x => x.ini === undefined && x.fin === undefined && x.razon === undefined && x.porAusenciaDe === undefined), 'en ninguna casilla');
  // las suyas: sus horas a mano y su razón (las usa su perfil para sus horas)
  const suya = src.meses['2026-10'].asig['2026-10-03'].PASARELA_T.find(x => x.pid === 'ivan');
  Object.assign(suya, { ini: '16:00', fin: '23:00' });
  const v2 = estadoParaEmpleado(src, 'ivan', '2026-10').meses['2026-10'].asig['2026-10-03'].PASARELA_T.find(x => x.pid === 'ivan');
  assert.deepEqual([v2.ini, v2.fin, !!v2.razon], ['16:00', '23:00', true]);
  assert.equal(src.meses['2026-10'].asig['2026-10-03'].PASARELA_T.find(x => x.pid === 'dulce').ini, '20:30', 'el estado del servidor no se toca');
});

test('(A6, G6) del cierre de su local recibe lo suyo: sus plazas retiradas y las de la semana tipo de esos días, para ver «sin trabajo» y que Horas lo cuente', () => {
  const src = estadoServidor();
  src.reglas = {};
  // martes 6 por la tarde (con planilla): se retiró a Cristian (sin decisión) y a Susana Capón (vacaciones). Martes 13 por la tarde
  // (sin planilla al cerrar): se leyó la semana tipo, donde Cristian y Susana Capón tienen plaza
  src.cierresPuntuales = [
    { id: 'c1', localId: 'MONACO', dias: { '2026-10-06': ['T'] }, motivo: 'reforma', decisiones: { scapon: { tipo: 'VAC' } }, retirados: [{ iso: '2026-10-06', tid: 'MONACO_T', entry: { pid: 'cristian', origen: 'patron', razon: 'plaza fija de la semana tipo' } }, { iso: '2026-10-06', tid: 'MONACO_T', entry: { pid: 'scapon', origen: 'patron' } }] },
    { id: 'c2', localId: 'MONACO', dias: { '2026-10-13': ['T'] }, motivo: 'reforma', decisiones: {}, retirados: [], deSemanaTipo: { '2026-10-13': ['T'] } },
  ];
  const v = estadoParaEmpleado(src, 'cristian', '2026-10');
  assert.deepEqual(v.cierresPuntuales.map(c => c.retirados), [[{ iso: '2026-10-06', tid: 'MONACO_T', entry: { pid: 'cristian' } }], [{ iso: '2026-10-13', tid: 'MONACO_T', entry: { pid: 'cristian' } }]]);
  assert.ok(v.cierresPuntuales.every(c => c.deSemanaTipo === undefined), 'la semana tipo no viaja (su app tiene la de la semilla)');
  assert.ok(!/scapon|VAC/.test(JSON.stringify(v.cierresPuntuales)), 'ni rastro de lo de Susana Capón');
  // en su app, con lo que recibe (sin la semana tipo del grupo), lo ve y Horas lo cuenta
  for (const iso of ['2026-10-06', '2026-10-13']) assert.equal((M.decisionCierre(v, 'cristian', iso, 'T') || {}).tipo, 'SIN', iso);
  assert.deepEqual(M.horasPersonaMes(v, v.staff, v.meses, 'cristian', 2026, 10).sinTrabajoCierre.map(x => x.iso), ['2026-10-06', '2026-10-13']);
  assert.deepEqual(M.horasPersonaMes(v, v.staff, v.meses, 'cristian', 2026, 10).sinTrabajoCierre, M.horasPersonaMes(src, src.staff, src.meses, 'cristian', 2026, 10).sinTrabajoCierre, 'lo mismo que ve el encargado');
  // a quien no estaba no le llega nada
  assert.deepEqual(estadoParaEmpleado(src, 'ivan', '2026-10').cierresPuntuales.map(c => c.retirados), [[], []]);
});

// ---------- 01/10 (corrección de A6; revisión de cliente S1 y S3): lo que viaja al móvil del empleado ----------
test('(corrección de A6, S1) de su propia ficha solo le llega lo que usa su app: ni la nota del encargado, ni los «supuestos», ni sus reglas, preferencias o contrato', () => {
  const src = estadoServidor();
  const cr = M.personaDe(src.staff, 'cristian');
  assert.ok(cr.nota && cr.supuestos.length, 'preparado: la ficha de Cristian lleva la nota del encargado y sus «supuestos»');
  Object.assign(cr, { prefs: { evita: ['PASARELA_M'] }, contrato: { horasSemana: 40 }, libraPuntual: [{ semana: '2026-10-05', dias: [4] }], inactivas: ['libra'], salida: { desde: '2026-12-01', motivo: 'se muda' } });
  cr.ausencias = [{ tipo: 'VAC', desde: '2026-10-20', hasta: '2026-10-21', detalle: 'boda' }];
  const v = estadoParaEmpleado(src, 'cristian', '2026-10');
  const suya = v.staff.find(p => p.id === 'cristian');
  assert.deepEqual(Object.keys(suya).sort(), ['ausencias', 'color', 'franjas', 'id', 'inactivas', 'libra', 'libraPuntual', 'locales', 'nombre', 'puesto', 'salida'].filter(k => suya[k] !== undefined).sort(), JSON.stringify(suya));
  for (const k of ['nota', 'supuestos', 'prefs', 'contrato', 'vetos', 'noAbre', 'noPrimero', 'cubreA', 'partido', 'cocina', 'abre', 'nuncaCon']) assert.equal(suya[k], undefined, k);
  assert.ok(!/apoyo de sala; no hace la tarde completa|pendiente del cliente/.test(JSON.stringify(v)), 'ni rastro de la nota ni de los «supuestos»');
  // lo que lee su perfil sigue ahí: su día libre (y el cambio de esa semana), el interruptor de su ficha, su salida y sus ausencias
  assert.deepEqual([suya.libra, suya.libraPuntual, suya.inactivas, suya.salida, suya.ausencias], [cr.libra, cr.libraPuntual, ['libra'], cr.salida, cr.ausencias]);
  assert.equal(M.etiquetaAusenciasDia(suya, '2026-10-20'), 'Vacaciones');
  assert.deepEqual(M.horasPersonaMes(v, v.staff, v.meses, 'cristian', 2026, 10).minutos, M.horasPersonaMes(src, src.staff, src.meses, 'cristian', 2026, 10).minutos, 'sus horas, las mismas que ve el encargado');
  assert.ok(src.staff.find(p => p.id === 'cristian').nota, 'el estado del servidor no se toca');
});

test('(corrección de A6, S3) de las entradas de los compañeros no le llega si se forzaron ni de dónde vienen (`forzado`, `origen`); el «por» y la nota, sí. Las suyas, enteras', () => {
  const src = estadoServidor();
  const SAB = '2026-10-03';
  const v = estadoParaEmpleado(src, 'ivan', '2026-10');
  const todas = Object.values(v.meses['2026-10'].asig).flatMap(d => Object.values(d)).flat();
  assert.ok(todas.filter(x => x.pid !== 'ivan').every(x => x.forzado === undefined && x.origen === undefined), JSON.stringify(todas.filter(x => x.pid !== 'ivan' && (x.forzado || x.origen)).slice(0, 3)));
  const cas = v.meses['2026-10'].asig[SAB].PASARELA_T;
  assert.deepEqual([cas.find(x => x.pid === 'dulce').nota, cas.find(x => x.pid === 'roberto').por], ['llega del otro bar', 'ivan']);
  // las suyas, con su origen (lo que hizo el encargado con su plaza le sirve a él); su `forzado`, también
  const suya = src.meses['2026-10'].asig[SAB].PASARELA_T.find(x => x.pid === 'ivan');
  suya.forzado = true;
  const v2 = estadoParaEmpleado(src, 'ivan', '2026-10').meses['2026-10'].asig[SAB].PASARELA_T.find(x => x.pid === 'ivan');
  assert.deepEqual([v2.origen, v2.forzado], [suya.origen, true]);
  assert.equal(src.meses['2026-10'].asig[SAB].PASARELA_T.find(x => x.pid === 'dulce').origen, 'manual', 'el estado del servidor no se toca');
});
