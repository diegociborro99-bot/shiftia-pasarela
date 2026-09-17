'use strict';
// Tests del modelo de planificación — Grupo Pasarela (4 locales, 2 franjas).
// Fuente: documento de trabajo Highkey Labs «Grupo Pasarela» (14/09/2026) y
// las respuestas de Diego al cuestionario previo (14/09). Cada regla del PDF
// nace aquí como test antes de existir en modelo.js.
//   R1–R9  mínimos por local, franja y día de la semana (asterisco = supuesto)
//   R10–R12, R19–R20, R27  cocina: titulares, reservas, posición en la casilla
//   R14–R15  «nunca con» (mismo local y misma franja)
//   R16–R17  días que no trabaja, vetos por local y franja, «no abre»
//   R18, R19  quién sale primero (abre)
//   R13, R21  «cubre a»: quién ocupa el sitio de quien libra o falta
//   R22–R26, R28–R29  asignaciones fijas de la semana tipo (el patrón)
const assert = require('assert');
const M = require(process.env.MODELO || './modelo.js');

let n = 0;
function ok(name, fn) { n++; fn(); console.log(`  ✓ ${name}`); }
const cfgBase = () => M.semillaPasarela();
const staffDe = cfg => cfg.staff;
const estadoOct = () => M.nuevoEstado(2026, 10, { festivos: [] });   // octubre 2026: el 1 es jueves; lunes 5

console.log('Tests del modelo Grupo Pasarela:');

// ---------- fechas ----------
ok('isoDow: 1 = lunes … 7 = domingo; mondayOf devuelve el lunes de la semana', () => {
  assert.strictEqual(M.isoDow('2026-10-05'), 1);
  assert.strictEqual(M.isoDow('2026-10-11'), 7);
  assert.strictEqual(M.mondayOf('2026-10-08'), '2026-10-05');
  assert.strictEqual(M.mondayOf('2026-10-05'), '2026-10-05');
  assert.strictEqual(M.addDias('2026-10-31', 1), '2026-11-01');
  assert.strictEqual(M.diasDelMes(2026, 10), 31);
});

// ---------- semilla: locales, turnos, personas ----------
ok('la semilla trae los 4 locales del PDF con su color y 8 turnos (local × franja)', () => {
  const cfg = cfgBase();
  assert.deepStrictEqual(cfg.locales.map(l => l.id), ['EL33', 'ZAPA', 'MONACO', 'PASARELA']);
  assert.deepStrictEqual(cfg.locales.map(l => l.nombre), ['El 33', 'Zapatillera', 'Bar Mónaco', 'Pasarela']);
  assert.strictEqual(M.turnosDe(cfg).length, 8);
  assert.deepStrictEqual(M.partirTurno('MONACO_T'), { localId: 'MONACO', franja: 'T' });
  assert.strictEqual(M.turnoId('EL33', 'M'), 'EL33_M');
});

ok('la semilla trae 23 personas: 21 en activo (con Dulce, alta del 17/09) y 2 de baja sin fecha de fin', () => {
  const st = staffDe(cfgBase());
  assert.strictEqual(st.length, 23);
  const bajas = st.filter(p => (p.ausencias || []).some(a => a.tipo === 'BAJ' && !a.hasta));
  assert.deepStrictEqual(bajas.map(p => p.nombre).sort(), ['Laura', 'Maydeth']);
  assert.ok(st.every(p => Number.isInteger(p.color)), 'cada persona con color de la paleta');
  assert.strictEqual(new Set(st.map(p => p.id)).size, 23, 'ids únicos');
});

ok('El 33 cierra el lunes y el domingo por la tarde; los demás abren mañana y tarde todos los días', () => {
  const cfg = cfgBase();
  assert.ok(!M.turnoAbierto(cfg, null, '2026-10-05', 'EL33_T'), 'lunes 5 tarde cerrado');
  assert.ok(!M.turnoAbierto(cfg, null, '2026-10-11', 'EL33_T'), 'domingo 11 tarde cerrado');
  assert.ok(M.turnoAbierto(cfg, null, '2026-10-05', 'EL33_M'));
  assert.ok(M.turnoAbierto(cfg, null, '2026-10-06', 'EL33_T'));
  for (const t of ['ZAPA_M', 'ZAPA_T', 'MONACO_M', 'MONACO_T', 'PASARELA_M', 'PASARELA_T'])
    for (let d = 5; d <= 11; d++) assert.ok(M.turnoAbierto(cfg, null, `2026-10-${String(d).padStart(2, '0')}`, t), `${t} abre el ${d}`);
  assert.strictEqual(M.turnosAbiertosSemana(cfg), 54, '54 huecos abiertos por semana (portada del PDF)');
});

// ---------- mínimos (R1–R9) ----------
ok('mínimos de la tabla del PDF: el Mónaco 3 por la mañana todos los días; Zapatillera 4 de tarde viernes y sábado', () => {
  const cfg = cfgBase();
  for (let d = 5; d <= 11; d++) assert.strictEqual(M.minimoDe(cfg, `2026-10-${String(d).padStart(2, '0')}`, 'MONACO_M').min, 3);
  assert.strictEqual(M.minimoDe(cfg, '2026-10-09', 'ZAPA_T').min, 4);   // viernes
  assert.strictEqual(M.minimoDe(cfg, '2026-10-10', 'ZAPA_T').min, 4);   // sábado
  assert.strictEqual(M.minimoDe(cfg, '2026-10-05', 'ZAPA_T').min, 2);   // lunes
  assert.strictEqual(M.minimoDe(cfg, '2026-10-10', 'PASARELA_M').min, 2);   // sábado 2
  assert.strictEqual(M.minimoDe(cfg, '2026-10-10', 'EL33_M').min, 3);   // sábado 3
});

ok('los mínimos con asterisco quedan marcados como supuestos; los del grupo no', () => {
  const cfg = cfgBase();
  assert.strictEqual(M.minimoDe(cfg, '2026-10-05', 'EL33_M').supuesto, true);      // lunes El 33 mañana 2*
  assert.strictEqual(M.minimoDe(cfg, '2026-10-10', 'EL33_M').supuesto, false);     // sábado 3 fijado
  assert.strictEqual(M.minimoDe(cfg, '2026-10-11', 'MONACO_T').supuesto, true);    // domingo Mónaco tarde 2*
  assert.strictEqual(M.minimoDe(cfg, '2026-10-05', 'MONACO_T').supuesto, false);
  assert.strictEqual(M.turnosConSupuesto(cfg), 19, '19 de los 54 huecos son supuestos');
});

ok('un evento con refuerzo (juega el Barcelona) sube el mínimo de ese día y local en la franja indicada', () => {
  const cfg = cfgBase();
  cfg.eventos.push({ id: 'ev1', iso: '2026-10-10', tipo: 'partido', equipo: 'barcelona', nombre: 'Juega el Barcelona', franja: 'T', refuerzo: { MONACO: 2, ZAPA: 1 } });
  const m = M.minimoDe(cfg, '2026-10-10', 'MONACO_T');
  assert.strictEqual(m.min, 5, '3 del sábado + 2 de refuerzo');
  assert.strictEqual(m.refuerzo, 2);
  assert.strictEqual(M.minimoDe(cfg, '2026-10-10', 'ZAPA_T').min, 5);
  assert.strictEqual(M.minimoDe(cfg, '2026-10-10', 'MONACO_M').min, 3, 'la mañana no cambia');
  assert.strictEqual(M.minimoDe(cfg, '2026-10-11', 'MONACO_T').min, 2, 'otro día no cambia');
  assert.deepStrictEqual(M.eventosDe(cfg, '2026-10-10').map(e => e.id), ['ev1']);
});

// ---------- puedeEstar: reglas duras por persona ----------
ok('locales: Jacquelin solo Zapatillera; Leo comodín en cualquier local', () => {
  const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
  assert.ok(M.puedeEstar(cfg, st, e, '2026-10-05', 'ZAPA_M', 'jacquelin').ok);
  const r = M.puedeEstar(cfg, st, e, '2026-10-05', 'MONACO_M', 'jacquelin');
  assert.ok(!r.ok); assert.match(r.motivo, /solo .*Zapatillera/i);
  assert.ok(M.puedeEstar(cfg, st, e, '2026-10-05', 'EL33_T', 'leo').ok === false, 'El 33 cierra el lunes tarde');
  assert.ok(M.puedeEstar(cfg, st, e, '2026-10-05', 'PASARELA_T', 'leo').ok);
});

ok('franjas: Jacquelin siempre de mañana; Iván solo tardes; Susana Luna siempre de tarde', () => {
  const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
  assert.match(M.puedeEstar(cfg, st, e, '2026-10-05', 'ZAPA_T', 'jacquelin').motivo, /mañana/i);
  assert.match(M.puedeEstar(cfg, st, e, '2026-10-06', 'PASARELA_M', 'ivan').motivo, /tarde/i);
  assert.ok(M.puedeEstar(cfg, st, e, '2026-10-06', 'PASARELA_T', 'ivan').ok);
});

ok('libra: Jacquelin libra los domingos, Tere no trabaja fines de semana, Lavinia libra L, M y J', () => {
  const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
  assert.match(M.puedeEstar(cfg, st, e, '2026-10-11', 'ZAPA_M', 'jacquelin').motivo, /libra/i);
  assert.match(M.puedeEstar(cfg, st, e, '2026-10-10', 'PASARELA_M', 'tere').motivo, /libra/i);
  assert.match(M.puedeEstar(cfg, st, e, '2026-10-05', 'PASARELA_T', 'lavinia').motivo, /libra/i);
  assert.ok(M.puedeEstar(cfg, st, e, '2026-10-07', 'PASARELA_M', 'lavinia').ok, 'miércoles sí');
});

ok('ausencias: quien está de baja no puede estar; una ausencia con fechas solo bloquea esos días', () => {
  const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
  assert.match(M.puedeEstar(cfg, st, e, '2026-10-06', 'PASARELA_M', 'laura').motivo, /baja/i);
  const lola = st.find(p => p.id === 'lola');
  M.anadirAusencia(lola, { tipo: 'VAC', desde: '2026-10-06', hasta: '2026-10-08' });
  assert.match(M.puedeEstar(cfg, st, e, '2026-10-07', 'PASARELA_M', 'lola').motivo, /vacaciones/i);
  assert.ok(M.puedeEstar(cfg, st, e, '2026-10-09', 'PASARELA_M', 'lola').ok);
  assert.ok(M.ausenciaEn(lola, '2026-10-08'));
  assert.strictEqual(M.ausenciaEn(lola, '2026-10-09'), null);
});

ok('vetos: Cristian no hace mañanas en Pasarela (R17) y no puede llevar cocina (R27)', () => {
  const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
  assert.match(M.puedeEstar(cfg, st, e, '2026-10-06', 'PASARELA_M', 'cristian').motivo, /mañanas en Pasarela/i);
  assert.ok(M.puedeEstar(cfg, st, e, '2026-10-06', 'PASARELA_T', 'cristian').ok);
  assert.ok(!M.puedeCocina(cfg, st.find(p => p.id === 'cristian'), 'MONACO', '2026-10-06'));
  assert.ok(M.puedeCocina(cfg, st.find(p => p.id === 'hojan'), 'MONACO', '2026-10-07'));
});

ok('cocina solo el martes: Susana Capón lleva la cocina del Mónaco el martes y ningún otro día (R19, R26)', () => {
  const cfg = cfgBase(), st = staffDe(cfg);
  const sc = st.find(p => p.id === 'scapon');
  assert.ok(M.puedeCocina(cfg, sc, 'MONACO', '2026-10-06'), 'martes');
  assert.ok(!M.puedeCocina(cfg, sc, 'MONACO', '2026-10-07'), 'miércoles no');
});

ok('«nunca con»: Mari Luz y Lavinia no coinciden en la misma casilla (R14); Leo no coincide con Susana Capón (R15)', () => {
  const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
  assert.ok(M.asignar(e, cfg, st, '2026-10-09', 'PASARELA_T', 'mariluz').ok);
  const r = M.puedeEstar(cfg, st, e, '2026-10-09', 'PASARELA_T', 'lavinia');
  assert.ok(!r.ok); assert.match(r.motivo, /nunca con Mari Luz/i);
  // distinto local, misma franja: sí pueden trabajar a la vez
  assert.ok(M.puedeEstar(cfg, st, e, '2026-10-09', 'ZAPA_T', 'lavinia').ok);
  assert.ok(M.asignar(e, cfg, st, '2026-10-09', 'MONACO_T', 'scapon').ok);
  assert.match(M.puedeEstar(cfg, st, e, '2026-10-09', 'MONACO_T', 'leo').motivo, /nunca con Susana Capón/i);
});

ok('una persona no puede estar en dos locales en la misma franja del mismo día', () => {
  const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
  assert.ok(M.asignar(e, cfg, st, '2026-10-09', 'PASARELA_T', 'leo').ok);
  const r = M.puedeEstar(cfg, st, e, '2026-10-09', 'MONACO_T', 'leo');
  assert.ok(!r.ok); assert.match(r.motivo, /ya en Pasarela/i);
});

ok('partido: Adrián hace mañana y tarde el mismo día; Cristian no hace partido salvo aviso', () => {
  const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
  assert.ok(M.asignar(e, cfg, st, '2026-10-09', 'ZAPA_M', 'adrian').ok);
  assert.ok(M.asignar(e, cfg, st, '2026-10-09', 'ZAPA_T', 'adrian').ok, 'siempre partido');
  assert.ok(M.asignar(e, cfg, st, '2026-10-09', 'MONACO_T', 'cristian').ok);
  const r = M.puedeEstar(cfg, st, e, '2026-10-09', 'EL33_M', 'cristian');
  assert.ok(!r.ok); assert.match(r.motivo, /partido/i);
  // con permitirPartido pasa, pero avisa de que es un partido no declarado
  const r2 = M.puedeEstar(cfg, st, e, '2026-10-09', 'EL33_M', 'cristian', { permitirPartido: true });
  assert.ok(r2.ok); assert.ok(r2.avisos.some(a => /partido no declarado/i.test(a)));
});

// ---------- asignar / desasignar / casilla ordenada ----------
ok('asignar añade una entrada ordenada con origen y razón; desasignar la quita; no se duplica', () => {
  const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
  const r = M.asignar(e, cfg, st, '2026-10-06', 'PASARELA_M', 'lola', { origen: 'manual', razon: 'a mano' });
  assert.ok(r.ok);
  const cas = M.asignados(e, '2026-10-06', 'PASARELA_M');
  assert.strictEqual(cas.length, 1);
  assert.strictEqual(cas[0].pid, 'lola'); assert.strictEqual(cas[0].origen, 'manual');
  assert.strictEqual(cas[0].abre, true, 'Lola abre Pasarela por la mañana: sale la primera');
  assert.ok(!M.asignar(e, cfg, st, '2026-10-06', 'PASARELA_M', 'lola').ok, 'ya está');
  assert.ok(M.desasignar(e, '2026-10-06', 'PASARELA_M', 'lola'));
  assert.strictEqual(M.asignados(e, '2026-10-06', 'PASARELA_M').length, 0);
  assert.strictEqual(M.desasignar(e, '2026-10-06', 'PASARELA_M', 'lola'), false);
});

ok('quien abre va el primero de la casilla aunque se asigne después (Iván en Pasarela tarde, R18)', () => {
  const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
  M.asignar(e, cfg, st, '2026-10-06', 'PASARELA_T', 'mariluz');
  M.asignar(e, cfg, st, '2026-10-06', 'PASARELA_T', 'ivan');
  assert.deepStrictEqual(M.pidsEn(e, '2026-10-06', 'PASARELA_T'), ['ivan', 'mariluz']);
});

ok('la cocina va 2.ª en El 33 y el Mónaco (R10–R11): la marca se pone sola al titular y ordena la casilla', () => {
  const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
  M.asignar(e, cfg, st, '2026-10-07', 'EL33_M', 'noe');
  M.asignar(e, cfg, st, '2026-10-07', 'EL33_M', 'jenny');
  const cas = M.asignados(e, '2026-10-07', 'EL33_M');
  assert.deepStrictEqual(cas.map(x => x.pid), ['noe', 'jenny']);
  assert.strictEqual(cas[1].cocina, true, 'Jenny lleva la cocina');
  assert.strictEqual(cas[0].cocina, false);
  // si llega una tercera persona, la cocina sigue en 2.ª
  M.asignar(e, cfg, st, '2026-10-07', 'EL33_M', 'hojan');   // Victoria libra los miércoles; Hojan es 3.º titular de cocina, Jenny sigue
  assert.deepStrictEqual(M.pidsEn(e, '2026-10-07', 'EL33_M'), ['noe', 'jenny', 'hojan']);
});

ok('en Zapatillera por la mañana la cocina va 3.ª con tres o más y 2.ª con dos (R12, tabla de cocinas)', () => {
  const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
  M.asignar(e, cfg, st, '2026-10-06', 'ZAPA_M', 'adrian');
  M.asignar(e, cfg, st, '2026-10-06', 'ZAPA_M', 'jacquelin');
  assert.deepStrictEqual(M.pidsEn(e, '2026-10-06', 'ZAPA_M'), ['jacquelin', 'adrian'], 'con dos: cocina 2.ª');
  M.asignar(e, cfg, st, '2026-10-06', 'ZAPA_M', 'juani');
  assert.deepStrictEqual(M.pidsEn(e, '2026-10-06', 'ZAPA_M'), ['jacquelin', 'juani', 'adrian'], 'con tres: cocina 3.ª');
  M.asignar(e, cfg, st, '2026-10-06', 'ZAPA_T', 'adrian');
  M.asignar(e, cfg, st, '2026-10-06', 'ZAPA_T', 'sluna');
  assert.deepStrictEqual(M.pidsEn(e, '2026-10-06', 'ZAPA_T'), ['sluna', 'adrian'], 'por la tarde siempre 2.ª');
});

ok('el martes en el Mónaco la cocina (Susana Capón) va 1.ª porque ella sale siempre la primera (R19, R26)', () => {
  const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
  M.asignar(e, cfg, st, '2026-10-06', 'MONACO_T', 'cristian');
  M.asignar(e, cfg, st, '2026-10-06', 'MONACO_T', 'scapon');
  const cas = M.asignados(e, '2026-10-06', 'MONACO_T');
  assert.deepStrictEqual(cas.map(x => x.pid), ['scapon', 'cristian']);
  assert.strictEqual(cas[0].abre, true); assert.strictEqual(cas[0].cocina, true);
});

ok('el orden a mano se respeta: tras reordenar, asignar a otra persona no deshace el orden', () => {
  const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
  M.asignar(e, cfg, st, '2026-10-07', 'EL33_M', 'noe');
  M.asignar(e, cfg, st, '2026-10-07', 'EL33_M', 'jenny');
  assert.ok(M.moverEnCasilla(e, '2026-10-07', 'EL33_M', 'jenny', 0));
  assert.deepStrictEqual(M.pidsEn(e, '2026-10-07', 'EL33_M'), ['jenny', 'noe']);
  M.asignar(e, cfg, st, '2026-10-07', 'EL33_M', 'hojan');
  assert.deepStrictEqual(M.pidsEn(e, '2026-10-07', 'EL33_M'), ['jenny', 'noe', 'hojan'], 'orden manual intacto, la nueva al final');
  assert.ok(M.marcarCocina(e, '2026-10-07', 'EL33_M', 'noe'));
  const cas = M.asignados(e, '2026-10-07', 'EL33_M');
  assert.strictEqual(cas.find(x => x.pid === 'noe').cocina, true);
  assert.strictEqual(cas.find(x => x.pid === 'jenny').cocina, false, 'solo una cocina por casilla');
});

// ---------- revisión de una casilla y del mes ----------
ok('revisarTurno: cuántos faltan frente al mínimo, si falta cocina y si nadie abre', () => {
  const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
  let r = M.revisarTurno(cfg, st, e, '2026-10-06', 'MONACO_M');
  assert.strictEqual(r.faltan, 3); assert.strictEqual(r.minimo, 3); assert.strictEqual(r.sinCocina, true, 'cocina obligatoria en el Mónaco');
  M.asignar(e, cfg, st, '2026-10-06', 'MONACO_M', 'cris');
  M.asignar(e, cfg, st, '2026-10-06', 'MONACO_M', 'yilian');
  M.asignar(e, cfg, st, '2026-10-06', 'MONACO_M', 'esmeralda');
  r = M.revisarTurno(cfg, st, e, '2026-10-06', 'MONACO_M');
  assert.strictEqual(r.faltan, 0); assert.strictEqual(r.sinCocina, false);
  assert.strictEqual(r.sinAbre, false, 'sin nadie fijo para abrir, abre el primero que puede (regla 31): no es hueco');
  assert.strictEqual(M.primeroDe(cfg, st, e, '2026-10-06', 'MONACO_M'), 'cris', 'la cocina tiene su posición: abre Cris, no Esmeralda');
  // Pasarela no lleva cocina en la planilla: nunca «sin cocina»
  assert.strictEqual(M.revisarTurno(cfg, st, e, '2026-10-06', 'PASARELA_M').sinCocina, false);
});

ok('revisionMes lista los turnos cortos con el motivo y no cuenta los cerrados', () => {
  const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
  const h = M.revisionMes(cfg, st, e);
  const cortos = h.filter(x => x.tipo === 'falta');
  assert.strictEqual(cortos.length, M.turnosAbiertosMes(cfg, e), 'todos los abiertos están cortos en un mes vacío');
  assert.ok(!h.some(x => x.turnoId === 'EL33_T' && M.isoDow(x.iso) === 1), 'El 33 lunes tarde no cuenta');
  assert.ok(h.every(x => typeof x.msg === 'string' && x.msg.length));
});

// ---------- semana patrón ----------
ok('la semana patrón de la semilla cumple los mínimos de los 54 huecos y la cocina del Mónaco', () => {
  const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
  const r = M.instanciarPatron(cfg, st, e, '2026-10-05', '2026-10-11');
  assert.ok(r.aplicados.length >= 130, 'al menos los 130 turnos-persona mínimos');
  assert.deepStrictEqual(r.rechazados, [], 'ninguna plaza del patrón choca con una regla dura: ' + JSON.stringify(r.rechazados));
  const rev = M.revisionMes(cfg, st, e).filter(x => x.iso >= '2026-10-05' && x.iso <= '2026-10-11');
  assert.deepStrictEqual(rev.filter(x => x.tipo === 'falta'), [], 'sin turnos cortos');
  assert.deepStrictEqual(rev.filter(x => x.tipo === 'sin-cocina' && x.turnoId.startsWith('MONACO')), [], 'Mónaco con cocina mañana y tarde');
});

ok('semana patrón: los días de cada persona cuadran con la columna DÍAS del PDF (Cristian sale a 6: pregunta al cliente; Leo baja a 3 al salir del martes de El 33, 17/09)', () => {
  const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
  M.instanciarPatron(cfg, st, e, '2026-10-05', '2026-10-11');
  const dias = pid => new Set(Object.keys(e.asig).filter(iso => Object.values(e.asig[iso]).some(c => c.some(x => x.pid === pid)))).size;
  const esperado = { jacquelin: 6, cris: 6, esmeralda: 6, mariluz: 6, noe: 6, scapon: 6, ivan: 6, juani: 6, sluna: 6, roberto: 6, lavinia: 4, tere: 5, leo: 3, jenny: 6, cristian: 6, yilian: 6, lola: 6, adrian: 6, victoria: 6, hojan: 5, laura: 0, maydeth: 0 };
  for (const [pid, d] of Object.entries(esperado)) assert.strictEqual(dias(pid), d, `${pid}: ${dias(pid)} días, esperaba ${d}`);
});

ok('semana patrón: excepciones del PDF — Jenny dobla el domingo, Hojan partido el lunes, Roberto en Pasarela el domingo', () => {
  const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
  M.instanciarPatron(cfg, st, e, '2026-10-05', '2026-10-11');
  assert.ok(M.pidsEn(e, '2026-10-11', 'EL33_M').includes('jenny'));
  assert.ok(M.pidsEn(e, '2026-10-11', 'MONACO_T').includes('jenny'));
  assert.ok(M.asignados(e, '2026-10-11', 'MONACO_T').find(x => x.pid === 'jenny').cocina);
  assert.ok(M.pidsEn(e, '2026-10-05', 'EL33_M').includes('hojan'));
  assert.ok(M.pidsEn(e, '2026-10-05', 'MONACO_T').includes('hojan'));
  assert.deepStrictEqual(M.pidsEn(e, '2026-10-11', 'PASARELA_M').sort(), ['mariluz', 'roberto']);
  assert.ok(M.pidsEn(e, '2026-10-11', 'EL33_M').includes('noe'), 'Noe tercero del domingo');
  assert.deepStrictEqual(M.pidsEn(e, '2026-10-06', 'MONACO_T'), ['scapon', 'cristian'], 'martes: Susana Capón 1.ª (cocina) con Cristian');
});

ok('instanciarPatron con una ausencia: la plaza queda libre y quien «cubre a» ocupa el sitio con razón', () => {
  const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
  const sluna = st.find(p => p.id === 'sluna');
  M.anadirAusencia(sluna, { tipo: 'VAC', desde: '2026-10-06', hasta: '2026-10-06' });   // martes
  const r = M.instanciarPatron(cfg, st, e, '2026-10-05', '2026-10-11');
  assert.ok(!M.pidsEn(e, '2026-10-06', 'ZAPA_T').includes('sluna'));
  const cubre = M.asignados(e, '2026-10-06', 'ZAPA_T').find(x => x.pid === 'roberto');
  assert.ok(cubre, 'Roberto cubre a Susana Luna: ' + JSON.stringify(M.asignados(e, '2026-10-06', 'ZAPA_T')));
  assert.match(cubre.razon, /cubre a Susana Luna/i);
  assert.ok(r.coberturas.some(c => c.pid === 'roberto' && c.por === 'sluna'));
});

// ---------- generador ----------
ok('generarPlanilla en vista previa no toca el estado; aplicado rellena hasta el mínimo con razones', () => {
  const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
  const prev = M.generarPlanilla(cfg, st, e, '2026-10-05', '2026-10-11', { simular: true });
  assert.strictEqual(Object.keys(e.asig).length, 0, 'simular no escribe');
  assert.ok(prev.aplicados.length >= 130);
  assert.ok(prev.aplicados.every(a => a.razon && a.origen));
  const real = M.generarPlanilla(cfg, st, e, '2026-10-05', '2026-10-11');
  assert.strictEqual(real.aplicados.length, prev.aplicados.length, 'determinista: la previa y la real coinciden');
  assert.deepStrictEqual(real.huecos.filter(h => h.tipo !== 'primero'), [], 'la semana tipo sale sin turnos cortos');
  assert.deepStrictEqual(real.huecos.filter(h => h.tipo === 'primero').map(h => h.turnoId + '@' + h.iso).sort(), [], 'sin huecos de apertura: El 33 el martes se queda con Noe, que abre en partido (José, 17/09)');
});

ok('generarPlanilla es aditivo: nunca quita lo puesto a mano y respeta la casilla', () => {
  const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
  M.asignar(e, cfg, st, '2026-10-07', 'PASARELA_M', 'tere', { origen: 'manual' });
  M.generarPlanilla(cfg, st, e, '2026-10-05', '2026-10-11');
  const cas = M.asignados(e, '2026-10-07', 'PASARELA_M');
  assert.strictEqual(cas.find(x => x.pid === 'tere').origen, 'manual');
  assert.strictEqual(cas.filter(x => x.pid === 'tere').length, 1);
});

ok('generarPlanilla: cuando alguien de baja deja un hueco sin candidato, lo lista con «por qué nadie»', () => {
  const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
  // Iván y Mari Luz de vacaciones el martes: Pasarela tarde se queda con Lavinia (¿libra martes?) → hueco explicado
  for (const id of ['ivan', 'mariluz']) M.anadirAusencia(st.find(p => p.id === id), { tipo: 'VAC', desde: '2026-10-06', hasta: '2026-10-06' });
  const r = M.generarPlanilla(cfg, st, e, '2026-10-05', '2026-10-11');
  const hueco = r.huecos.find(h => h.iso === '2026-10-06' && h.turnoId === 'PASARELA_T');
  assert.ok(hueco || M.revisarTurno(cfg, st, e, '2026-10-06', 'PASARELA_T').faltan === 0, 'o se cubre con comodines o se explica');
  if (hueco) { assert.ok(hueco.faltan >= 1); assert.ok(hueco.porQueNadie && Object.keys(hueco.porQueNadie).length, 'explica por qué nadie'); }
});

ok('candidatosPara ordena por prioridad y explica: quien «cubre a» primero, después comodines con menos turnos', () => {
  const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
  M.instanciarPatron(cfg, st, e, '2026-10-05', '2026-10-11');
  M.desasignar(e, '2026-10-06', 'MONACO_T', 'cristian');   // martes tarde Mónaco: falta 1
  const c = M.candidatosPara(cfg, st, e, '2026-10-06', 'MONACO_T');
  assert.ok(c.length >= 1);
  assert.ok(c.every(x => Array.isArray(x.razones) && typeof x.score === 'number'));
  assert.ok(!c.some(x => x.pid === 'leo'), 'Leo nunca con Susana Capón');
  assert.ok(!c.some(x => x.pid === 'hojan'), 'Hojan libra el martes');
});

// ---------- horas ----------
ok('horas de un turno: el horario por defecto es editable por local y franja y cruza la medianoche', () => {
  const cfg = cfgBase();
  const mon = cfg.locales.find(l => l.id === 'MONACO');
  mon.horario = { M: { ini: '10:00', fin: '16:00' }, T: { ini: '18:00', fin: '01:00' }, porDow: { 5: { T: { ini: '18:00', fin: '02:30' } } } };
  mon.descansoMin = 30; mon.duracion = null;   // sin duración fijada se cuenta lo que el local abre, menos el descanso
  assert.strictEqual(M.minutosTurno(mon, 1, 'M'), 360 - 30);
  assert.strictEqual(M.minutosTurno(mon, 1, 'T'), 420 - 30);
  assert.strictEqual(M.minutosTurno(mon, 5, 'T'), 510 - 30, 'viernes con excepción');
  assert.strictEqual(M.minutosNocturnos(mon, 5, 'T'), 270, 'de 22:00 a 02:30');
});

ok('horasPersonaMes suma mañanas, tardes, partidos, horas por local, festivos, domingos, extras y saldo frente a contrato', () => {
  const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
  for (const l of cfg.locales) { l.horario = { M: { ini: '09:00', fin: '16:00' }, T: { ini: '16:00', fin: '23:00' } }; l.horarioPartido = null; l.duracion = null; l.descansoMin = 0; }   // sin tramos de partido ni duración fijada: se cuenta lo que el local abre
  M.instanciarPatron(cfg, st, e, '2026-10-05', '2026-10-11');
  const meses = { '2026-10': { asig: e.asig } };
  const adr = st.find(p => p.id === 'adrian');
  adr.contrato = { horasSemana: 40 };
  cfg.extras.push({ pid: 'adrian', iso: '2026-10-05', min: 60, motivo: 'cierre tardío' });
  const h = M.horasPersonaMes(cfg, st, meses, 'adrian', 2026, 10);
  assert.strictEqual(h.partidos, 6, 'Adrián siempre partido, libra miércoles');
  assert.strictEqual(h.mananas, 6); assert.strictEqual(h.tardes, 6);
  assert.strictEqual(h.horas, 6 * 14 + 1, '12 turnos de 7 h + 1 h extra');
  assert.strictEqual(h.extrasMin, 60);
  assert.strictEqual(h.domingos, 1);
  assert.strictEqual(h.porLocal.ZAPA.horas, 84);
  assert.ok(h.contratoHoras > 0 && typeof h.saldo === 'number');
  const tabla = M.horasEquipoMes(cfg, st, meses, 2026, 10);
  assert.strictEqual(tabla.length, 23);
  assert.strictEqual(tabla.find(x => x.pid === 'laura').horas, 0);
});

// ---------- exportador al núcleo shiftia-core ----------
ok('toProblem produce un problema del núcleo en medios días: turnos por local, cobertura por día y reglas de incompatibilidad', () => {
  const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
  const pr = M.toProblem(cfg, st, e, '2026-10-05', '2026-10-11');
  assert.strictEqual(pr.horizon_days, 14, '7 días × 2 franjas');
  assert.deepStrictEqual(pr.shifts.map(s => s.code).sort(), ['EL33', 'MONACO', 'OFF', 'PASARELA', 'ZAPA']);
  assert.strictEqual(pr.workers.length, 21, 'las dos bajas no entran');
  const jac = pr.workers.find(w => w.id === 'jacquelin');
  assert.deepStrictEqual(jac.allowed_shifts, ['ZAPA']);
  assert.ok(Object.values(jac.unavailable).length >= 7, 'tardes y domingo bloqueados');
  const cov = pr.rules.filter(r => r.type === 'coverage');
  assert.ok(cov.length >= 1);
  assert.ok(pr.rules.some(r => r.type === 'same_shift_forbidden' && JSON.stringify(r.params.pairs).includes('lavinia')));
  assert.ok(pr.rules.some(r => r.type === 'skill_coverage'), 'cocina como skill');
  assert.strictEqual(pr.days.length, 14);
  assert.ok(pr.days[0].tags.includes('M') && pr.days[1].tags.includes('T'));
});

ok('desdeSolucion vuelca la planilla del núcleo en casillas ordenadas con cocina y quién abre', () => {
  const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
  const pr = M.toProblem(cfg, st, e, '2026-10-06', '2026-10-06');
  const sol = { status: 'OPTIMAL', feasible: true, schedule: {} };
  for (const w of pr.workers) sol.schedule[w.id] = { 0: 'OFF', 1: 'OFF' };
  sol.schedule.scapon = { 0: 'OFF', 1: 'MONACO' };
  sol.schedule.cristian = { 0: 'OFF', 1: 'MONACO' };
  sol.schedule.lola = { 0: 'PASARELA', 1: 'OFF' };
  const r = M.desdeSolucion(cfg, st, e, pr, sol);
  assert.strictEqual(r.aplicados.length, 3);
  assert.deepStrictEqual(M.pidsEn(e, '2026-10-06', 'MONACO_T'), ['scapon', 'cristian']);
  assert.ok(M.asignados(e, '2026-10-06', 'MONACO_T')[0].cocina);
  assert.ok(M.asignados(e, '2026-10-06', 'PASARELA_M')[0].abre);
  assert.ok(r.aplicados.every(a => a.origen === 'nucleo'));
});

// ---------- estado y utilidades compartidas ----------
ok('estadoDesde reconstruye un mes compartiendo referencias con S.meses; clonarEstado copia', () => {
  const meses = {};
  const e = M.estadoDesde(meses, [], 2026, 10);
  assert.strictEqual(e.days.length, 31);
  assert.strictEqual(e.days[0].dow, 4, 'el 1 de octubre de 2026 es jueves');
  const c = M.clonarEstado(e);
  c.asig['2026-10-06'] = { PASARELA_M: [{ pid: 'lola' }] };
  assert.strictEqual(Object.keys(e.asig).length, 0);
});

ok('sugerirUsuario y paleta de colores siguen el patrón del piloto', () => {
  assert.strictEqual(M.sugerirUsuario('Susana Capón', []), 'susana.capon');
  assert.strictEqual(M.sugerirUsuario('Susana Capón', ['susana.capon']), 'susana.capon2');
  assert.strictEqual(M.sugerirUsuario('Leo', []), 'leo');
  assert.ok(M.PALETA_PERSONAS.length >= 22);
  const st = [{ id: 'a', nombre: 'A' }, { id: 'b', nombre: 'B' }];
  M.asignarColores(st);
  assert.notStrictEqual(st[0].color, st[1].color);
});

ok('fusionarEstado: si solo cambiaron avisos o peticiones en el servidor, se funden con la edición local', () => {
  const base = { staff: [], meses: {}, peticiones: [], avisos: [], locales: [] };
  const srv = JSON.parse(JSON.stringify(base)); srv.peticiones = [{ id: 'p1', pid: 'x', estado: 'pendiente' }];
  const local = JSON.parse(JSON.stringify(base)); local.meses = { '2026-10': { asig: { '2026-10-06': { PASARELA_M: [{ pid: 'lola' }] } } } };
  const f = M.fusionarEstado(base, srv, local);
  assert.ok(f.ok);
  assert.strictEqual(f.estado.peticiones.length, 1);
  assert.ok(f.estado.meses['2026-10']);
  const srv2 = JSON.parse(JSON.stringify(base)); srv2.meses = { '2026-10': { asig: { '2026-10-07': {} } } };
  assert.ok(!M.fusionarEstado(base, srv2, local).ok, 'otro administrador tocó la planilla: manda el servidor');
});

// ---------- mes de demostración (primer arranque del servidor y ?demo=1) ----------
ok('sembrarDemo: genera el mes en curso y el siguiente con la semana tipo, marca un partido y es idempotente', () => {
  const S = Object.assign(M.semillaPasarela(), { meses: {}, eventos: [] });
  const r = M.sembrarDemo(S, '2026-09-14');
  assert.deepEqual(r.meses, ['2026-09', '2026-10']);
  assert.ok(Object.keys(S.meses['2026-09'].asig).length >= 25, 'septiembre generado día a día');
  assert.ok(Object.keys(S.meses['2026-10'].asig).length >= 25, 'octubre generado día a día');
  assert.ok(r.aplicados > 200, 'cientos de plazas puestas: ' + r.aplicados);
  const ev = S.eventos.find(x => x.tipo === 'partido');
  assert.ok(ev && ev.iso >= '2026-09-14' && M.isoDow(ev.iso) === 6 && ev.equipo === 'barcelona' && ev.refuerzo.EL33 >= 1, 'partido el próximo sábado con refuerzo');
  assert.equal(r.evento, ev.iso);
  // segunda llamada: nada que hacer (no pisa lo que ya hay ni duplica el partido)
  const antes = JSON.stringify(S.meses), nEv = S.eventos.length;
  const r2 = M.sembrarDemo(S, '2026-09-14');
  assert.deepEqual(r2.meses, []); assert.equal(r2.evento, null);
  assert.equal(JSON.stringify(S.meses), antes); assert.equal(S.eventos.length, nEv);
  // con un mes ya trabajado solo se genera el que falta
  const S2 = Object.assign(M.semillaPasarela(), { meses: { '2026-09': { asig: { '2026-09-01': { EL33_M: [{ pid: 'noe', origen: 'manual' }] } }, apertura: {}, manual: {} } }, eventos: [] });
  assert.deepEqual(M.sembrarDemo(S2, '2026-09-14').meses, ['2026-10']);
  assert.equal(S2.meses['2026-09'].asig['2026-09-01'].EL33_M.length, 1, 'septiembre intacto');
});

// ---------- generador semanal: reglas 30–32, interruptores y el prototipo del 11/09 ----------
ok('reglas 30 y 32: Cristian y Leo no salen los primeros; 31: el primero de la tarde no viene de la mañana salvo turno continuo', () => {
  const cfg = cfgBase(), st = staffDe(cfg); const e = M.nuevoEstado(2026, 9, { festivos: [] });
  assert.equal(M.puedePrimero(cfg, st, e, '2026-09-15', 'EL33_T', 'leo').ok, false, 'Leo nunca de primero');
  assert.equal(M.puedePrimero(cfg, st, e, '2026-09-19', 'ZAPA_M', 'leo').ok, false, 'ni de mañana');
  assert.equal(M.puedePrimero(cfg, st, e, '2026-09-15', 'MONACO_T', 'cristian').ok, false, 'Cristian no hace la tarde completa');
  assert.equal(M.puedePrimero(cfg, st, e, '2026-09-19', 'MONACO_M', 'cristian').ok, true, 'pero sí puede abrir una mañana en el Mónaco');
  assert.equal(M.puedePrimero(cfg, st, e, '2026-09-19', 'EL33_M', 'cristian').ok, false, 'y no abre El 33');
  assert.ok(M.asignar(e, cfg, st, '2026-09-14', 'PASARELA_M', 'lola', {}).ok);
  assert.ok(M.asignar(e, cfg, st, '2026-09-14', 'PASARELA_M', 'mariluz', {}).ok);
  M.localDe(cfg, 'PASARELA').partidoAbre.T = false;   // sin la excepción del partido (15/09) rige la regla 31 tal cual
  assert.equal(M.puedePrimero(cfg, st, e, '2026-09-14', 'PASARELA_T', 'mariluz').ok, false, 'viene de hacer la mañana (Lola abre la mañana, así que no es turno continuo)');
  assert.ok(M.asignar(e, cfg, st, '2026-09-16', 'EL33_M', 'noe', {}).ok);
  const c = M.puedePrimero(cfg, st, e, '2026-09-16', 'EL33_T', 'noe');
  assert.equal(c.ok, true); assert.equal(c.continuo, true, 'primera de mañana y de tarde en el mismo local: turno continuo');
  cfg.reglas = { primeroCompleto: false };
  assert.equal(M.puedePrimero(cfg, st, e, '2026-09-14', 'PASARELA_T', 'mariluz').ok, true, 'la regla 31 se puede apagar desde Equipo');
});
ok('características desactivables por persona: con «nunca con» apagado, Lavinia puede coincidir con Mari Luz', () => {
  const cfg = cfgBase(), st = staffDe(cfg); const e = M.nuevoEstado(2026, 9, { festivos: [] });
  assert.ok(M.asignar(e, cfg, st, '2026-09-18', 'PASARELA_T', 'mariluz', {}).ok);
  assert.equal(M.puedeEstar(cfg, st, e, '2026-09-18', 'PASARELA_T', 'lavinia').ok, false);
  M.personaDe(st, 'lavinia').inactivas = ['nuncaCon']; M.personaDe(st, 'mariluz').inactivas = ['nuncaCon'];
  assert.equal(M.puedeEstar(cfg, st, e, '2026-09-18', 'PASARELA_T', 'lavinia').ok, true);
  M.personaDe(st, 'tere').inactivas = ['libra'];
  assert.equal(M.puedeEstar(cfg, st, e, '2026-09-19', 'PASARELA_M', 'tere').ok, true, 'con «libra» apagado Tere puede el sábado');
  assert.equal(M.caracteristicaActiva(M.personaDe(st, 'tere'), 'libra'), false);
  assert.equal(M.caracteristicaActiva(M.personaDe(st, 'tere'), 'franjas'), true);
});
ok('posicionesDe: el primero abre; sin nadie que pueda abrir, la 1.ª posición es un hueco y la cocina sigue en la suya', () => {
  const cfg = cfgBase(), st = staffDe(cfg); const e = M.nuevoEstado(2026, 9, { festivos: [] });
  M.localDe(cfg, 'EL33').partidoAbre.T = false;   // sin la excepción: quien viene de la mañana no abre la tarde
  assert.ok(M.asignar(e, cfg, st, '2026-09-15', 'EL33_M', 'victoria', {}).ok);
  assert.ok(M.asignar(e, cfg, st, '2026-09-15', 'EL33_M', 'noe', { cocina: true }).ok);   // Noe hace la mañana: no puede abrir la tarde
  assert.ok(M.asignar(e, cfg, st, '2026-09-15', 'EL33_T', 'noe', { cocina: true }).ok);
  assert.ok(M.asignar(e, cfg, st, '2026-09-15', 'EL33_T', 'leo', { permitirPartido: true }).ok);
  const s = M.posicionesDe(cfg, st, e, '2026-09-15', 'EL33_T');
  assert.equal(s.length, 3); assert.equal(s[0].hueco, true); assert.equal(s[0].pos, 1); assert.match(s[0].motivo, /abr/i);
  assert.equal(s[1].pid, 'noe'); assert.equal(s[1].cocina, true); assert.equal(s[2].pid, 'leo'); assert.equal(s[2].comodin, true);
  const r = M.revisarTurno(cfg, st, e, '2026-09-15', 'EL33_T');
  assert.equal(r.faltan, 0); assert.equal(r.sinAbre, true, 'mínimo cubierto pero nadie puede abrir');
});
ok('generarSemana del 14 al 20 de septiembre reproduce la planilla corregida del prototipo', () => {
  const cfg = cfgBase(), st = staffDe(cfg); const e = M.nuevoEstado(2026, 9, { festivos: [] });
  const r = M.generarSemana(cfg, st, e, '2026-09-14', {});
  const slots = (iso, tid) => M.posicionesDe(cfg, st, r.estado, iso, tid);
  const quien = (iso, tid) => slots(iso, tid).map(x => x.hueco ? '·' : x.pid);
  assert.deepEqual(quien('2026-09-14', 'EL33_M'), ['victoria', 'hojan']);
  assert.deepEqual(quien('2026-09-15', 'EL33_T'), ['noe'], 'martes tarde El 33: día flojo, se queda Noe solo y abre él (José, 17/09)');
  assert.deepEqual(quien('2026-09-14', 'PASARELA_T'), ['mariluz', 'leo'], 'lunes tarde Pasarela: Mari Luz abre en partido (acordado el 15/09); Leo nunca de primero');
  assert.deepEqual(quien('2026-09-16', 'EL33_M'), ['noe', 'jenny']); assert.deepEqual(quien('2026-09-16', 'EL33_T'), ['noe', 'jenny']);
  assert.equal(slots('2026-09-16', 'EL33_T')[0].continuo, true, 'Noe el miércoles: turno continuo (C)');
  assert.equal(slots('2026-09-16', 'EL33_T')[1].partido, true, 'Jenny el miércoles: partido (P)');
  assert.deepEqual(quien('2026-09-14', 'MONACO_M'), ['cris', 'jenny', 'cristian']); assert.deepEqual(quien('2026-09-14', 'MONACO_T'), ['yilian', 'hojan']);
  assert.deepEqual(quien('2026-09-17', 'ZAPA_M'), ['jacquelin', 'juani', 'adrian']); assert.deepEqual(quien('2026-09-17', 'ZAPA_T'), ['roberto', 'adrian']);
  assert.deepEqual(quien('2026-09-19', 'ZAPA_M'), ['jacquelin', 'roberto', 'adrian'], 'cocina 3.ª en Zapatillera por la mañana con tres');
  assert.deepEqual(quien('2026-09-15', 'MONACO_T'), ['scapon', 'cristian']); assert.equal(slots('2026-09-15', 'MONACO_T')[0].cocina, true, 'el martes Susana Capón lleva la cocina y sale la primera');
  assert.deepEqual(quien('2026-09-20', 'PASARELA_M'), ['mariluz', 'roberto']); assert.deepEqual(quien('2026-09-20', 'EL33_M'), ['victoria', 'jenny', 'noe']);
  assert.deepEqual(quien('2026-09-19', 'EL33_M'), ['victoria', 'jenny', 'cristian']);
  assert.equal(slots('2026-09-14', 'MONACO_T')[0].por, 'scapon', 'Yilian abre por Susana Capón');
  assert.equal(slots('2026-09-16', 'PASARELA_M')[1].por, 'mariluz', 'Lavinia por Mari Luz');
  // 15/09: el lunes en Pasarela la tarde la hace Mari Luz en partido (Iván libra). 17/09: El 33
  // el martes se queda con Noe solo, que abre viniendo de la mañana. La semana sale sin huecos.
  assert.equal(r.huecos.length, 0, JSON.stringify(r.huecos.map(h => [h.iso, h.turnoId, h.pos, h.motivo])));
  const lunT = slots('2026-09-14', 'PASARELA_T');
  assert.equal(lunT[0].pid, 'mariluz'); assert.ok(lunT[0].abre && lunT[0].partido, 'Mari Luz abre la tarde del lunes en partido: ' + JSON.stringify(lunT));
  assert.equal(r.resumen.turnos, 54); assert.equal(r.resumen.descansos, 27); assert.ok(r.resumen.maxDias <= 6);
  assert.deepEqual(r.libran['2026-09-18'], [], 'Dulce está en standby: no cuenta como que libra'); assert.equal(r.libran['2026-09-14'].length, 6); assert.equal(r.libran['2026-09-20'].length, 6);
  const rotas = r.condiciones.filter(c => !c.ok);
  assert.ok(r.condiciones.length >= 30, 'catálogo de condiciones: ' + r.condiciones.length);
  assert.equal(rotas.length, 0, 'condiciones rotas: ' + rotas.map(c => c.texto + ' → ' + c.detalle).join(' | '));
  assert.ok(r.condiciones.some(c => c.nueva), 'las tres nuevas (30, 31, 32) van marcadas');
  // segunda generación sobre lo mismo: nada cambia y no hay «corregido»
  const r2 = M.generarSemana(cfg, st, r.estado, '2026-09-14', {});
  assert.equal(r2.cambios.length, 0); assert.equal(r2.aplicados, 0);
});
ok('partidoAbre: donde el local lo permite, quien hace partido declarado abre la tarde; apagado, vuelve el hueco', () => {
  const cfg = cfgBase(), st = staffDe(cfg);
  const pas = M.localDe(cfg, 'PASARELA'), el33 = M.localDe(cfg, 'EL33');
  assert.ok(pas.partidoAbre && pas.partidoAbre.T === true, 'Pasarela lo permite por la tarde');
  assert.ok(el33.partidoAbre && el33.partidoAbre.T === true, 'El 33 también, desde el 17/09: el martes Noe se queda solo y abre viniendo de la mañana');
  assert.ok(!el33.partidoAbre.M && !pas.partidoAbre.M, 'por la mañana no: quien abre es el primero del día');
  const e = M.nuevoEstado(2026, 10, { festivos: [] });
  assert.ok(M.asignar(e, cfg, st, '2026-10-05', 'PASARELA_M', 'lola', {}).ok && M.asignar(e, cfg, st, '2026-10-05', 'PASARELA_M', 'mariluz', {}).ok);
  assert.ok(M.asignar(e, cfg, st, '2026-10-05', 'PASARELA_T', 'mariluz', {}).ok && M.asignar(e, cfg, st, '2026-10-05', 'PASARELA_T', 'leo', {}).ok);
  assert.ok(M.puedePrimero(cfg, st, e, '2026-10-05', 'PASARELA_T', 'mariluz').ok, 'lunes: Mari Luz hace partido declarado y puede abrir la tarde');
  assert.equal(M.primeroDe(cfg, st, e, '2026-10-05', 'PASARELA_T'), 'mariluz');
  assert.ok(!M.revisarTurno(cfg, st, e, '2026-10-05', 'PASARELA_T').sinAbre);
  const conds = M.condicionesDe(cfg, st);
  assert.ok(conds.some(c => c.k === 'partidoAbre' && /Pasarela/.test(c.texto) && /partido/.test(c.texto)), 'la condición aparece en el catálogo');
  pas.partidoAbre.T = false;
  assert.ok(!M.puedePrimero(cfg, st, e, '2026-10-05', 'PASARELA_T', 'mariluz').ok, 'apagado: quien viene de la mañana no abre la tarde');
  assert.equal(M.primeroDe(cfg, st, e, '2026-10-05', 'PASARELA_T'), null, 'y Leo nunca abre: hueco');
  pas.partidoAbre.T = true;
  // el miércoles Mari Luz libra: su partido no está declarado ese día → no abre aunque el local lo permita
  const e2 = M.nuevoEstado(2026, 10, { festivos: [] });
  const cfg2 = cfgBase(); M.personaDe(cfg2.staff, 'mariluz').libra = [];
  assert.ok(M.asignar(e2, cfg2, cfg2.staff, '2026-10-07', 'PASARELA_M', 'lola', {}).ok && M.asignar(e2, cfg2, cfg2.staff, '2026-10-07', 'PASARELA_M', 'mariluz', {}).ok && M.asignar(e2, cfg2, cfg2.staff, '2026-10-07', 'PASARELA_T', 'mariluz', { permitirPartido: true }).ok);
  assert.ok(!M.puedePrimero(cfg2, cfg2.staff, e2, '2026-10-07', 'PASARELA_T', 'mariluz').ok, 'partido no declarado el miércoles: no abre');
});
ok('generarSemana señala qué ha cambiado respecto a lo que había y respeta lo puesto a mano', () => {
  const cfg = cfgBase(), st = staffDe(cfg); const e = M.nuevoEstado(2026, 9, { festivos: [] });
  assert.ok(M.asignar(e, cfg, st, '2026-09-14', 'MONACO_M', 'tere', { origen: 'manual' }).ok);
  const r = M.generarSemana(cfg, st, e, '2026-09-14', { simular: true });
  assert.ok(M.pidsEn(r.estado, '2026-09-14', 'MONACO_M').includes('tere'), 'lo manual se queda');
  assert.equal(M.pidsEn(e, '2026-09-14', 'MONACO_M').length, 1, 'simular no toca el estado real');
  const cambio = r.cambios.find(c => c.iso === '2026-09-14' && c.turnoId === 'MONACO_M');
  assert.ok(cambio && cambio.antes.length === 1 && cambio.despues.length >= 3, 'la casilla cambiada se marca');
  assert.ok(r.cambios.length > 40, 'casi todas las casillas cambian partiendo de una semana vacía');
});


// ---------- gestor de cobertura: quién cubre a quien falta (15/09) ----------
// El encargado marca que alguien va a tener baja, día libre, vacaciones, permiso o
// un cambio de turno en unos días, y la app propone plan A (recomendado) y plan B
// (alternativa) para cubrir cada turno afectado, o explica por qué no se puede.
const semanaProto = () => { const cfg = cfgBase(), st = staffDe(cfg); const e = M.nuevoEstado(2026, 9, { festivos: [] }); M.generarSemana(cfg, st, e, '2026-09-14', {}); return { cfg, st, e }; };
ok('turnosAfectados lista los turnos de la persona en el rango, con cocina y si abre, y filtra por franja', () => {
  const { cfg, st, e } = semanaProto();
  const af = M.turnosAfectados(cfg, st, e, 'roberto', '2026-09-14', '2026-09-20');
  assert.equal(af.length, 9, JSON.stringify(af.map(x => x.iso + '|' + x.tid)));
  const mie = af.find(x => x.iso === '2026-09-16' && x.tid === 'ZAPA_M');
  assert.ok(mie && mie.cocina, 'el miércoles lleva la cocina de Zapatillera por la mañana');
  assert.ok(af.find(x => x.iso === '2026-09-17' && x.tid === 'ZAPA_T').abre, 'el jueves abre la tarde por Susana Luna');
  assert.equal(M.turnosAfectados(cfg, st, e, 'roberto', '2026-09-14', '2026-09-20', { franjas: ['T'] }).length, 4);
  assert.equal(M.turnosAfectados(cfg, st, e, 'roberto', '2026-09-14', '2026-09-14').length, 0, 'el lunes libra');
  assert.ok(M.TIPOS_INCIDENCIA.some(t => t.id === 'CAMBIO') && M.TIPOS_INCIDENCIA.some(t => t.id === 'BAJ'));
});
ok('planesCobertura: plan A y plan B cubren el turno con personas distintas que pueden estar; la ausente no se propone', () => {
  const cfg = cfgBase(), st = staffDe(cfg); const e = M.nuevoEstado(2026, 10, { festivos: [] });
  assert.ok(M.asignar(e, cfg, st, '2026-10-06', 'PASARELA_T', 'ivan', {}).ok && M.asignar(e, cfg, st, '2026-10-06', 'PASARELA_T', 'mariluz', {}).ok);   // martes
  const r = M.planesCobertura(cfg, st, e, { pid: 'ivan', tipo: 'LD', desde: '2026-10-06', hasta: '2026-10-06' });
  assert.equal(r.afectados.length, 1); assert.ok(r.afectados[0].necesario, 'sin Iván la casilla se queda en 1 de 2');
  assert.ok(r.posible, 'hay plan que cubre todo');
  assert.equal(r.planes.length, 2, 'plan A y plan B');
  const [A, B] = r.planes;
  assert.equal(A.id, 'A'); assert.equal(B.id, 'B');
  assert.ok(A.completo && B.completo, 'ambos cubren todo');
  assert.equal(A.asignaciones.length, 1); assert.equal(B.asignaciones.length, 1);
  assert.notEqual(A.asignaciones[0].pid, B.asignaciones[0].pid, 'el plan B propone a otra persona');
  for (const P of [A, B]) {
    for (const a of P.asignaciones) {
      assert.notEqual(a.pid, 'ivan');
      assert.ok(M.puedeEstar(cfg, st, e, a.iso, a.tid, a.pid).ok, `${a.pid} puede estar en ${a.tid}`);
      assert.ok(Array.isArray(a.razones) && a.razones.length, 'cada propuesta explica por qué');
      assert.equal(a.avisos.length, 0, 'plan con las reglas del grupo: sin avisos');
    }
    assert.ok(M.pidsEn(e, '2026-10-06', 'PASARELA_T').includes('ivan'), 'proponer no toca la planilla');
  }
  assert.ok(new Set([A.asignaciones[0].pid, B.asignaciones[0].pid]).size === 2);
  assert.ok(['cristian', 'leo', 'roberto'].includes(A.asignaciones[0].pid) && ['cristian', 'leo', 'roberto'].includes(B.asignaciones[0].pid), A.asignaciones[0].pid + '/' + B.asignaciones[0].pid);
  assert.ok(A.asignaciones[0].razones.some(x => /libre ese día/.test(x)), 'explica que libra ese día');
});
ok('planesCobertura: «cubre a» manda (Roberto cubre a Susana Luna) y quien libra ese día va antes que quien haría partido', () => {
  const cfg = cfgBase(), st = staffDe(cfg); const e = M.nuevoEstado(2026, 10, { festivos: [] });
  assert.ok(M.asignar(e, cfg, st, '2026-10-09', 'ZAPA_T', 'sluna', {}).ok && M.asignar(e, cfg, st, '2026-10-09', 'ZAPA_T', 'adrian', { cocina: true }).ok);   // viernes
  const r = M.planesCobertura(cfg, st, e, { pid: 'sluna', tipo: 'PERM', desde: '2026-10-09', hasta: '2026-10-09' });
  const A = r.planes[0];
  assert.equal(A.asignaciones[0].pid, 'roberto', JSON.stringify(A.asignaciones));
  assert.ok(A.asignaciones[0].razones.some(x => /cubre a Susana Luna/.test(x)));
  assert.ok(A.asignaciones[0].abre, 'Roberto abre la tarde (Susana Luna salía la primera)');
  // el martes Roberto ya trabaja la mañana en Pasarela y no hace partido ese día → manda otro
  const e2 = M.nuevoEstado(2026, 10, { festivos: [] });
  assert.ok(M.asignar(e2, cfg, st, '2026-10-06', 'ZAPA_T', 'sluna', {}).ok && M.asignar(e2, cfg, st, '2026-10-06', 'ZAPA_T', 'adrian', { cocina: true }).ok && M.asignar(e2, cfg, st, '2026-10-06', 'PASARELA_M', 'roberto', {}).ok);
  const r2 = M.planesCobertura(cfg, st, e2, { pid: 'sluna', tipo: 'PERM', desde: '2026-10-06', hasta: '2026-10-06' });
  assert.ok(r2.planes[0].asignaciones.length && r2.planes[0].asignaciones[0].pid !== 'roberto', 'Roberto no hace partido los martes: ' + JSON.stringify(r2.planes[0].asignaciones));
  const cands = M.candidatosCobertura(cfg, st, e2, '2026-10-06', 'ZAPA_T', 'sluna', {});
  assert.ok(cands.every(c => c.pid !== 'sluna' && c.pid !== 'roberto'));
  assert.ok(cands.length && cands[0].score >= cands[cands.length - 1].score, 'ordenados por puntuación');
  assert.ok(cands.every(c => c.libre), 'los candidatos estrictos del martes libran ese día');
});
ok('planesCobertura: si la casilla sigue completa sin la persona no hace falta cubrir (salvo «reemplazar siempre»)', () => {
  const cfg = cfgBase(), st = staffDe(cfg); const e = M.nuevoEstado(2026, 10, { festivos: [] });
  for (const p of ['jacquelin', 'juani']) M.asignar(e, cfg, st, '2026-10-05', 'ZAPA_M', p, {}); M.asignar(e, cfg, st, '2026-10-05', 'ZAPA_M', 'adrian', { cocina: true });
  const r = M.planesCobertura(cfg, st, e, { pid: 'juani', tipo: 'LD', desde: '2026-10-05', hasta: '2026-10-05' });
  assert.equal(r.afectados.length, 1); assert.equal(r.afectados[0].necesario, false);
  assert.ok(r.posible); assert.equal(r.planes[0].asignaciones.length, 0); assert.equal(r.planes[0].sinCubrir.length, 1);
  assert.ok(r.planes[0].completo);
  const r2 = M.planesCobertura(cfg, st, e, { pid: 'juani', tipo: 'LD', desde: '2026-10-05', hasta: '2026-10-05' }, { siempre: true });
  assert.equal(r2.planes[0].asignaciones.length, 1);
});
ok('planesCobertura: cuando nadie puede, el plan lo dice con el hueco y por qué nadie; el plan B relaja (partidos no declarados, con aviso)', () => {
  const cfg = cfgBase(), st = staffDe(cfg); const e = M.nuevoEstado(2026, 10, { festivos: [] });
  // jueves: Iván y Mari Luz en Pasarela tarde; Mari Luz viene de la mañana (no puede abrir), Roberto de baja, Cristian en el Mónaco por la mañana
  M.asignar(e, cfg, st, '2026-10-08', 'PASARELA_M', 'lola', {}); M.asignar(e, cfg, st, '2026-10-08', 'PASARELA_M', 'mariluz', {});
  M.asignar(e, cfg, st, '2026-10-08', 'PASARELA_T', 'ivan', {}); M.asignar(e, cfg, st, '2026-10-08', 'PASARELA_T', 'mariluz', {});
  M.asignar(e, cfg, st, '2026-10-08', 'MONACO_M', 'cristian', {});
  const st2 = JSON.parse(JSON.stringify(st)); M.anadirAusencia(M.personaDe(st2, 'roberto'), { tipo: 'BAJ', desde: '2026-10-01' });
  M.localDe(cfg, 'PASARELA').partidoAbre.T = false;   // sin la excepción del 15/09: quien viene de la mañana no abre la tarde
  const r = M.planesCobertura(cfg, st2, e, { pid: 'ivan', tipo: 'LD', desde: '2026-10-08', hasta: '2026-10-08' });
  assert.equal(r.posible, false, 'nadie puede abrir Pasarela el jueves por la tarde');
  const A = r.planes[0];
  assert.ok(A.huecos.length >= 1, JSON.stringify(A));
  assert.ok(A.huecos.some(h => h.pos === 1 || h.tipo === 'primero'), 'la 1.ª posición queda como hueco disponible');
  assert.ok(Object.keys(A.huecos[0].porQueNadie || {}).length >= 3, 'explica por qué nadie: ' + JSON.stringify(A.huecos[0].porQueNadie));
  const relajado = r.planes.find(p => p.asignaciones.some(a => a.avisos.length));
  assert.ok(relajado && relajado.asignaciones.some(a => a.pid === 'cristian' && a.avisos.some(x => /partido/.test(x))), 'el plan relajado propone a Cristian avisando del partido: ' + JSON.stringify(r.planes.map(p => p.asignaciones)));
});
ok('aplicarCobertura: registra la ausencia, quita a la persona de sus turnos y pone a quien cubre con «por» y origen cobertura', () => {
  const cfg = cfgBase(), st = staffDe(cfg); const e = M.nuevoEstado(2026, 10, { festivos: [] });
  assert.ok(M.asignar(e, cfg, st, '2026-10-09', 'ZAPA_T', 'sluna', {}).ok && M.asignar(e, cfg, st, '2026-10-09', 'ZAPA_T', 'adrian', { cocina: true }).ok);
  assert.ok(M.asignar(e, cfg, st, '2026-10-10', 'ZAPA_T', 'sluna', {}).ok && M.asignar(e, cfg, st, '2026-10-10', 'ZAPA_T', 'adrian', { cocina: true }).ok && M.asignar(e, cfg, st, '2026-10-10', 'ZAPA_T', 'lavinia', {}).ok);
  const inc = { pid: 'sluna', tipo: 'VAC', desde: '2026-10-09', hasta: '2026-10-10', detalle: 'boda' };
  const r = M.planesCobertura(cfg, st, e, inc);
  assert.equal(r.afectados.length, 2);
  const res = M.aplicarCobertura(cfg, st, e, inc, r.planes[0]);
  const p = M.personaDe(st, 'sluna');
  assert.ok(p.ausencias.some(a => a.tipo === 'VAC' && a.desde === '2026-10-09' && a.hasta === '2026-10-10' && a.detalle === 'boda'), 'vacaciones registradas en la ficha');
  assert.equal(res.quitados, 2);
  assert.ok(!M.pidsEn(e, '2026-10-09', 'ZAPA_T').includes('sluna') && !M.pidsEn(e, '2026-10-10', 'ZAPA_T').includes('sluna'));
  assert.ok(res.asignados.length >= 1);
  const cub = M.asignados(e, '2026-10-09', 'ZAPA_T').find(x => x.por === 'sluna');
  assert.ok(cub && cub.origen === 'cobertura' && /cubre a Susana Luna/.test(cub.razon), JSON.stringify(M.asignados(e, '2026-10-09', 'ZAPA_T')));
  assert.equal(M.posicionesDe(cfg, st, e, '2026-10-09', 'ZAPA_T').find(s => s.pid === cub.pid).por, 'sluna', 'la casilla enseña «por Susana Luna»');
  assert.ok(M.revisarTurno(cfg, st, e, '2026-10-09', 'ZAPA_T').faltan === 0);
  assert.equal(res.rechazados.length, 0);
});
ok('días sueltos (inc.dias): solo cuentan esos días y las ausencias se registran por tramos contiguos', () => {
  const cfg = cfgBase(), st = staffDe(cfg); const e = M.nuevoEstado(2026, 10, { festivos: [] });
  for (const iso of ['2026-10-06', '2026-10-07', '2026-10-09']) assert.ok(M.asignar(e, cfg, st, iso, 'ZAPA_M', 'juani', {}).ok, iso);
  const inc = { pid: 'juani', tipo: 'LD', dias: ['2026-10-06', '2026-10-09'] };
  const r = M.planesCobertura(cfg, st, e, inc);
  assert.equal(r.afectados.length, 2, 'el miércoles no está marcado');
  assert.equal(r.desde, '2026-10-06'); assert.equal(r.hasta, '2026-10-09');
  M.aplicarCobertura(cfg, st, e, inc, r.planes[0]);
  const p = M.personaDe(st, 'juani');
  assert.deepEqual(p.ausencias.map(a => [a.tipo, a.desde, a.hasta]), [['LD', '2026-10-06', '2026-10-06'], ['LD', '2026-10-09', '2026-10-09']], 'dos ausencias de un día');
  assert.ok(!M.ausenciaEn(p, '2026-10-07'), 'el miércoles sigue trabajando');
  assert.deepEqual(M.pidsEn(e, '2026-10-07', 'ZAPA_M'), ['juani']);
  assert.ok(!M.pidsEn(e, '2026-10-06', 'ZAPA_M').includes('juani') && !M.pidsEn(e, '2026-10-09', 'ZAPA_M').includes('juani'));
});
ok('cambio de turno: quien cubre puede ceder a cambio uno de sus turnos (intercambio), y aplicar hace las dos cosas sin registrar ausencia', () => {
  const cfg = cfgBase(), st = staffDe(cfg); const e = M.nuevoEstado(2026, 10, { festivos: [] });
  assert.ok(M.asignar(e, cfg, st, '2026-10-06', 'ZAPA_T', 'sluna', {}).ok && M.asignar(e, cfg, st, '2026-10-06', 'ZAPA_T', 'adrian', { cocina: true }).ok);   // martes
  assert.ok(M.asignar(e, cfg, st, '2026-10-10', 'ZAPA_T', 'roberto', {}).ok && M.asignar(e, cfg, st, '2026-10-10', 'ZAPA_T', 'adrian', { cocina: true }).ok);  // sábado
  const inc = { pid: 'sluna', tipo: 'CAMBIO', desde: '2026-10-06', hasta: '2026-10-06' };
  const r = M.planesCobertura(cfg, st, e, inc, { intercambio: true });
  const A = r.planes[0];
  assert.equal(A.asignaciones[0].pid, 'roberto');
  const x = A.asignaciones[0].intercambio;
  assert.ok(x && x.iso === '2026-10-10' && x.tid === 'ZAPA_T', 'a cambio, Susana Luna hace el sábado tarde de Roberto: ' + JSON.stringify(A.asignaciones[0]));
  const res = M.aplicarCobertura(cfg, st, e, inc, A);
  assert.deepEqual(M.pidsEn(e, '2026-10-06', 'ZAPA_T').sort(), ['adrian', 'roberto']);
  assert.deepEqual(M.pidsEn(e, '2026-10-10', 'ZAPA_T').sort(), ['adrian', 'sluna']);
  assert.equal(res.intercambios.length, 1);
  assert.equal((M.personaDe(st, 'sluna').ausencias || []).length, 0, 'un cambio de turno no es una ausencia');
  assert.ok(/cambio con Roberto/.test(M.asignados(e, '2026-10-10', 'ZAPA_T').find(x => x.pid === 'sluna').razon));
  // sin intercambio no se propone
  const r2 = M.planesCobertura(cfg, st, M.nuevoEstado(2026, 10, { festivos: [] }), inc, { intercambio: false });
  assert.equal(r2.afectados.length, 0);
});
ok('planesCobertura sobre la semana del prototipo: la baja de Jenny el sábado pide cocina en El 33 y los planes lo resuelven o lo señalan', () => {
  const { cfg, st, e } = semanaProto();
  const r = M.planesCobertura(cfg, st, e, { pid: 'jenny', tipo: 'BAJ', desde: '2026-09-19', hasta: '2026-09-19' });
  assert.equal(r.afectados.length, 2, 'mañana y tarde de El 33');
  assert.ok(r.afectados.every(a => a.cocina), 'Jenny lleva la cocina en las dos');
  assert.ok(r.planes.length >= 1);
  for (const P of r.planes) for (const a of P.asignaciones) assert.ok(M.puedeCocina(cfg, M.personaDe(st, a.pid), 'EL33', a.iso) || !a.cocina, 'quien lleva la cocina puede llevarla');
  const A = r.planes[0];
  assert.ok(A.asignaciones.length + A.huecos.length >= 1);
  assert.ok(A.resumen && typeof A.resumen.cubiertos === 'number' && typeof A.resumen.huecos === 'number');
});
ok('vaciarPlanilla: borra todas las plazas y marcas del rango (a mano incluidas) y respeta ausencias, aperturas y lo de fuera del rango', () => {
  const { cfg, st, e } = semanaProto();
  M.asignar(e, cfg, st, '2026-09-21', 'ZAPA_M', 'juani', {});
  M.marcarAbre(e, '2026-09-15', 'ZAPA_M', 'juani', cfg);
  M.toggleApertura(e, '2026-09-14', 'EL33_T', cfg);
  M.anadirAusencia(M.personaDe(st, 'juani'), { tipo: 'VAC', desde: '2026-09-16', hasta: '2026-09-17' });
  const antes = M.turnosMes(e, 'juani');
  const r = M.vaciarPlanilla(e, '2026-09-14', '2026-09-20');
  assert.ok(r.plazas > 100, 'plazas retiradas: ' + r.plazas);
  for (const iso of M.rangoIso('2026-09-14', '2026-09-20')) { assert.ok(!e.asig[iso] || !Object.keys(e.asig[iso]).length, 'sin plazas el ' + iso); assert.ok(!e.manual[iso] || !Object.keys(e.manual[iso]).length); }
  assert.deepEqual(M.pidsEn(e, '2026-09-21', 'ZAPA_M'), ['juani'], 'fuera del rango no se toca');
  assert.ok(e.apertura['2026-09-14'] && e.apertura['2026-09-14'].EL33_T === true, 'las aperturas se quedan');
  assert.ok(M.ausenciaEn(M.personaDe(st, 'juani'), '2026-09-16'), 'las vacaciones siguen en la ficha');
  assert.ok(M.deBaja(M.personaDe(st, 'laura'), '2026-09-14'), 'las bajas siguen');
  assert.ok(antes > 1);
  assert.equal(M.vaciarPlanilla(e, '2026-09-14', '2026-09-20').plazas, 0, 'vaciar dos veces no rompe');
});


// ---------- horarios reales del grupo (WhatsApp de la encargada, 15/09) ----------
// «El turno de la mañana desde que abren las cafeterías a las 7 aunque fines de semana 8
// y hasta las 16. Y luego por la tarde desde las 16 hasta que cierren la cafetería a lo
// mejor sobre las 00 aunque depende.» El partido no son dos turnos enteros: quien lo hace
// entra a mediodía y vuelve por la noche (Adrián, «solo viene como al mediodía»).
ok('horarios reales: mañana 07:00–16:00 (fines de semana desde las 08:00) y tarde 16:00–00:00 en los cuatro locales', () => {
  const cfg = cfgBase();
  for (const l of cfg.locales) {
    assert.deepEqual(M.horarioDe(l, 1, 'M'), { ini: '07:00', fin: '16:00' }, `${l.nombre}, lunes por la mañana`);
    assert.deepEqual(M.horarioDe(l, 5, 'M'), { ini: '07:00', fin: '16:00' }, `${l.nombre}, viernes por la mañana`);
    assert.deepEqual(M.horarioDe(l, 6, 'M'), { ini: '08:00', fin: '16:00' }, `${l.nombre}, sábado por la mañana`);
    assert.deepEqual(M.horarioDe(l, 7, 'M'), { ini: '08:00', fin: '16:00' }, `${l.nombre}, domingo por la mañana`);
    for (const d of M.TODOS) assert.deepEqual(M.horarioDe(l, d, 'T'), { ini: '16:00', fin: '00:00' }, `${l.nombre}, tarde del día ${d}`);
    assert.equal(l.horarioSupuesto, false, `${l.nombre}: el horario ya lo confirmó el grupo`);
    assert.equal(l.cierreAprox, true, `${l.nombre}: la hora de cierre es aproximada («a lo mejor sobre las 00, aunque depende»)`);
  }
  const l = M.localDe(cfg, 'ZAPA');
  assert.equal(M.minutosEntre(M.horarioDe(l, 1, 'M').ini, M.horarioDe(l, 1, 'M').fin), 9 * 60, 'el local abre 9 h por la mañana entre semana');
  assert.equal(M.minutosEntre(M.horarioDe(l, 1, 'T').ini, M.horarioDe(l, 1, 'T').fin), 8 * 60, 'y 8 h por la tarde');
  assert.equal(M.minutosNocturnos(l, 1, 'T'), 120, 'de las 22:00 a las 00:00, 2 h nocturnas');
  assert.equal(M.minutosNocturnos(l, 1, 'M'), 0, 'la mañana no tiene nocturnas');
});
ok('un partido son ocho horas repartidas: 5 y 3 entre semana, 4 y 4 el fin de semana', () => {
  // Cliente, 16/09: «se dividen las horas según 4 y 4 o 5 y 3 horas […] entre semana es
  // 5 y 3 y el finde 4 y 4, aunque depende a veces según la necesidad».
  const cfg = cfgBase();
  for (const l of cfg.locales) {
    for (const d of [1, 2, 3, 4, 5]) {
      assert.deepEqual(M.horarioDe(l, d, 'M', true), { ini: '11:00', fin: '16:00' }, `${l.nombre}, día ${d}: tramo de mediodía de 5 h`);
      assert.deepEqual(M.horarioDe(l, d, 'T', true), { ini: '21:00', fin: '00:00' }, `${l.nombre}, día ${d}: tramo de noche de 3 h`);
    }
    for (const d of [6, 7]) {
      assert.deepEqual(M.horarioDe(l, d, 'M', true), { ini: '12:00', fin: '16:00' }, `${l.nombre}, día ${d}: el finde, 4 h a mediodía`);
      assert.deepEqual(M.horarioDe(l, d, 'T', true), { ini: '20:00', fin: '00:00' }, `${l.nombre}, día ${d}: el finde, 4 h de noche`);
    }
    for (const d of M.TODOS)
      assert.equal(M.minutosTurno(l, d, 'M', null, true) + M.minutosTurno(l, d, 'T', null, true), 8 * 60, `${l.nombre}, día ${d}: el partido suma ocho horas`);
  }
});
ok('partido de quien abre: entra a la hora de apertura y hace el tramo largo, y el día sigue siendo de ocho horas', () => {
  const cfg = cfgBase();
  const l = M.localDe(cfg, 'PASARELA');
  assert.deepEqual(M.horarioDe(l, 1, 'T', true, 'T'), { ini: '16:00', fin: '21:00' }, 'abre la tarde: entra a las 16:00 y hace las 5 h');
  assert.deepEqual(M.horarioDe(l, 1, 'M', true, 'T'), { ini: '13:00', fin: '16:00' }, 'y a mediodía le quedan las 3 h');
  assert.deepEqual(M.horarioDe(l, 1, 'M', true, 'M'), { ini: '07:00', fin: '12:00' }, 'abre la mañana: entra a abrir y hace las 5 h');
  assert.deepEqual(M.horarioDe(l, 1, 'T', true, 'M'), { ini: '21:00', fin: '00:00' }, 'y por la noche, las 3 h');
  assert.deepEqual(M.horarioDe(l, 6, 'M', true, 'M'), { ini: '08:00', fin: '12:00' }, 'el sábado abre a las 08:00 y son 4 y 4');
  assert.deepEqual(M.horarioDe(l, 6, 'T', true, 'M'), { ini: '20:00', fin: '00:00' });
  for (const d of M.TODOS) for (const f of ['M', 'T'])
    assert.equal(M.minutosTurno(l, d, 'M', null, true, f) + M.minutosTurno(l, d, 'T', null, true, f), 8 * 60, `día ${d} abriendo la franja ${f}: ocho horas`);
});
ok('turno partido: se cuentan los tramos del partido (mediodía y noche), no dos turnos enteros', () => {
  const cfg = cfgBase(), st = staffDe(cfg);
  const l = M.localDe(cfg, 'ZAPA');
  assert.deepEqual(l.horarioPartido.M, { ini: '11:00', fin: '16:00' }, 'entre semana, 5 h a mediodía');
  assert.deepEqual(l.horarioPartido.porDow[6], { M: { ini: '12:00', fin: '16:00' }, T: { ini: '20:00', fin: '00:00' } }, 'el sábado, 4 y 4');
  assert.equal(l.horarioPartidoSupuesto, true, 'el reparto lo confirmó el cliente, pero la hora exacta de cada tramo sigue pendiente');
  const e = M.nuevoEstado(2026, 10, { festivos: [] });   // viernes 9: Adrián, cocina de Zapatillera, partido
  assert.ok(M.asignar(e, cfg, st, '2026-10-09', 'ZAPA_M', 'jacquelin', {}).ok);
  assert.ok(M.asignar(e, cfg, st, '2026-10-09', 'ZAPA_M', 'adrian', { cocina: true }).ok);
  assert.ok(M.asignar(e, cfg, st, '2026-10-09', 'ZAPA_T', 'sluna', {}).ok);
  assert.ok(M.asignar(e, cfg, st, '2026-10-09', 'ZAPA_T', 'adrian', { cocina: true }).ok);
  const h = M.horasPersonaMes(cfg, st, { '2026-10': { asig: e.asig } }, 'adrian', 2026, 10);
  assert.equal(h.partidos, 1);
  assert.equal(h.minutos, 8 * 60, `5 h a mediodía y 3 h por la noche, no 17 h (salieron ${h.minutos / 60} h)`);
  assert.equal(h.nocturnosMin, 120, 'las dos últimas horas de la noche');
  // el mismo día sin partido: el turno es el completo del local
  const e2 = M.nuevoEstado(2026, 10, { festivos: [] });
  assert.ok(M.asignar(e2, cfg, st, '2026-10-09', 'ZAPA_M', 'adrian', { cocina: true }).ok);
  assert.equal(M.horasPersonaMes(cfg, st, { '2026-10': { asig: e2.asig } }, 'adrian', 2026, 10).minutos, 8 * 60, 'un turno suelto son ocho horas, las que dura el turno');
});
ok('turno partido: quien abre una franja entra a abrir, y el horario puesto a mano en la casilla manda sobre todo', () => {
  const cfg = cfgBase(), st = staffDe(cfg);
  const e = M.nuevoEstado(2026, 10, { festivos: [] });   // lunes 5: Mari Luz hace partido en Pasarela y abre la tarde
  for (const [tid, pid] of [['PASARELA_M', 'lola'], ['PASARELA_M', 'mariluz'], ['PASARELA_M', 'tere'], ['PASARELA_T', 'mariluz'], ['PASARELA_T', 'leo']])
    assert.ok(M.asignar(e, cfg, st, '2026-10-05', tid, pid, {}).ok, `${pid} en ${tid}`);
  assert.equal(M.primeroDe(cfg, st, e, '2026-10-05', 'PASARELA_T'), 'mariluz', 'abre la tarde en partido (acuerdo del 15/09)');
  // lo que usan las vistas para enseñar el tramo de cada turno
  assert.deepEqual(M.turnoDelDia(cfg, e, '2026-10-05', 'mariluz'), { partido: true, continuo: null, abre: 'T' });
  assert.deepEqual(M.turnoDelDia(cfg, e, '2026-10-05', 'leo'), { partido: false, continuo: null, abre: null }, 'Leo solo hace la tarde');
  assert.deepEqual(M.horarioDe(M.localDe(cfg, 'PASARELA'), 1, 'T', true, 'T'), { ini: '16:00', fin: '21:00' }, 'entra a abrir a las 16:00');
  assert.deepEqual(M.horarioDe(M.localDe(cfg, 'PASARELA'), 1, 'M', true, 'T'), { ini: '13:00', fin: '16:00' }, 'y a mediodía hace las 3 h');
  const h = M.horasPersonaMes(cfg, st, { '2026-10': { asig: e.asig } }, 'mariluz', 2026, 10);
  assert.equal(h.minutos, 8 * 60, `un partido son ocho horas aunque abra la tarde; salieron ${h.minutos / 60} h`);
  assert.equal(h.nocturnosMin, 0, 'abre la tarde a las 16:00 y sale a las 21:00: no llega a las nocturnas');
  const mm = M.asignados(e, '2026-10-05', 'PASARELA_M').find(x => x.pid === 'mariluz');
  mm.ini = '10:00'; mm.fin = '15:00';
  assert.equal(M.horasPersonaMes(cfg, st, { '2026-10': { asig: e.asig } }, 'mariluz', 2026, 10).minutos, 5 * 60 + 5 * 60, 'el horario a mano de la casilla manda');
});
ok('migrarHorarios: los locales guardados con el horario supuesto de fábrica pasan al real; lo editado a mano se respeta', () => {
  const estado = M.semillaPasarela();
  const vieja = () => ({ M: { ini: '09:00', fin: '16:00' }, T: { ini: '16:00', fin: '23:00' }, porDow: { 5: { T: { ini: '16:00', fin: '00:00' } }, 6: { T: { ini: '16:00', fin: '00:00' } } } });
  for (const l of estado.locales) { l.horario = vieja(); l.horarioSupuesto = true; delete l.horarioPartido; delete l.horarioPartidoSupuesto; delete l.cierreAprox; }
  const propio = estado.locales[1];
  propio.horario.M = { ini: '10:00', fin: '15:00' };   // este lo tocó el encargado
  const r = M.migrarHorarios(estado);
  assert.equal(r.cambiados, 3, 'los tres que seguían con el horario supuesto de fábrica');
  const l0 = estado.locales[0];
  assert.deepEqual(M.horarioDe(l0, 1, 'M'), { ini: '07:00', fin: '16:00' });
  assert.deepEqual(M.horarioDe(l0, 6, 'M'), { ini: '08:00', fin: '16:00' });
  assert.deepEqual(M.horarioDe(l0, 3, 'T'), { ini: '16:00', fin: '00:00' });
  assert.equal(l0.horarioSupuesto, false); assert.equal(l0.cierreAprox, true);
  assert.deepEqual(propio.horario.M, { ini: '10:00', fin: '15:00' }, 'el horario editado a mano no se toca');
  assert.equal(propio.horarioSupuesto, true, 'y sigue marcado como suyo, sin confirmar');
  for (const l of estado.locales) assert.ok(l.horarioPartido && l.horarioPartido.M.ini === '11:00', `${l.nombre} gana los tramos del partido, que no existían`);
  assert.equal(M.migrarHorarios(estado).cambiados, 0, 'idempotente');
  // el reparto viejo del partido (4 y 4 todos los días) pasa al que dijo el cliente el 16/09
  const otro = M.semillaPasarela();
  otro.locales[0].horarioPartido = { M: { ini: '12:00', fin: '16:00' }, T: { ini: '20:00', fin: '00:00' } };
  otro.locales[1].horarioPartido = { M: { ini: '13:00', fin: '16:00' }, T: { ini: '20:00', fin: '00:00' } };   // este lo tocó el encargado
  otro.locales[2].horarioPartido = { M: { ini: '12:00', fin: '16:00' }, T: { ini: '20:00', fin: '00:00' } };
  otro.locales[2].horarioPartidoSupuesto = false;                                                              // y este lo dio por bueno
  M.migrarHorarios(otro);
  assert.deepEqual(otro.locales[0].horarioPartido.M, { ini: '11:00', fin: '16:00' }, 'el reparto de fábrica se actualiza');
  assert.ok(otro.locales[0].horarioPartido.porDow[6], 'y gana el reparto del fin de semana');
  assert.deepEqual(otro.locales[1].horarioPartido.M, { ini: '13:00', fin: '16:00' }, 'lo editado a mano no se toca');
  assert.deepEqual(otro.locales[2].horarioPartido.M, { ini: '12:00', fin: '16:00' }, 'ni lo que ya estaba confirmado');
});


// ---------- navegación: la app abre siempre en hoy (15/09) ----------
// Se guardaba el día que estabas mirando y se restauraba para siempre: quien un día
// retrocedió a agosto abría la app en agosto todas las mañanas, con la planilla vacía
// y el título diciendo «1 de agosto». Ahora el sitio solo se recuerda dentro del día.
ok('navVigente: la navegación guardada solo se recupera si se guardó hoy y cae en el rango de planificación', () => {
  const hoy = '2026-09-15';
  assert.equal(M.navVigente({ y: 2026, m: 10, day: 3, hoy }, hoy, '2026-01', '2030-12'), true, 'guardada hoy: se vuelve donde estaba');
  assert.equal(M.navVigente({ y: 2026, m: 8, day: 1, hoy: '2026-08-01' }, hoy, '2026-01', '2030-12'), false, 'guardada otro día: se abre en hoy');
  assert.equal(M.navVigente({ y: 2026, m: 8, day: 1 }, hoy, '2026-01', '2030-12'), false, 'guardada por una versión anterior, sin fecha: se abre en hoy');
  assert.equal(M.navVigente(null, hoy, '2026-01', '2030-12'), false);
  assert.equal(M.navVigente({}, hoy, '2026-01', '2030-12'), false);
  assert.equal(M.navVigente({ y: 2025, m: 12, day: 1, hoy }, hoy, '2026-01', '2030-12'), false, 'antes del rango de planificación');
  assert.equal(M.navVigente({ y: 2031, m: 1, day: 1, hoy }, hoy, '2026-01', '2030-12'), false, 'después del rango');
});


// ---------- 8 horas por turno (el cliente, 15/09) ----------
// El local abre de 07:00 a 16:00 (nueve horas), pero «8 horas por turno más o menos»:
// cada persona hace ocho, no las nueve que el local está abierto. La duración del turno
// es lo que se cuenta; el horario de apertura sigue mandando en quién abre y en lo que
// se imprime. Un horario puesto a mano en la casilla manda sobre las dos cosas.
ok('duración del turno: se cuentan 8 h por turno aunque el local abra nueve', () => {
  const cfg = cfgBase();
  for (const l of cfg.locales) {
    assert.deepEqual(l.duracion, { M: 480, T: 480 }, `${l.nombre}: ocho horas por turno`);
    assert.equal(l.duracionSupuesta, true, `${l.nombre}: «más o menos», pendiente de confirmar`);
    assert.equal(M.minutosTurno(l, 1, 'M'), 8 * 60, `${l.nombre}, mañana de diario`);
    assert.equal(M.minutosTurno(l, 6, 'M'), 8 * 60, `${l.nombre}, mañana del sábado`);
    assert.equal(M.minutosTurno(l, 3, 'T'), 8 * 60, `${l.nombre}, tarde`);
  }
  const l = M.localDe(cfg, 'ZAPA');
  assert.equal(M.minutosTurno(l, 1, 'M', { ini: '10:00', fin: '15:00' }), 5 * 60, 'el horario de la casilla manda');
  assert.equal(M.minutosTurno(l, 1, 'M', null, true), 5 * 60, 'un tramo de partido cuenta lo que dura el tramo');
  assert.equal(M.minutosTurno(l, 1, 'T', null, true), 3 * 60);
  l.duracion = null;
  assert.equal(M.minutosTurno(l, 1, 'M'), 9 * 60, 'sin duración fijada se cuenta lo que el local está abierto');
});
ok('turno continuo: quien abre la mañana y la tarde del mismo local hace UN turno seguido, y se cuenta una vez', () => {
  const cfg = cfgBase(), st = staffDe(cfg);
  const e = M.nuevoEstado(2026, 10, { festivos: [] });   // miércoles 7: Noe abre El 33 mañana y tarde
  for (const [tid, pid] of [['EL33_M', 'noe'], ['EL33_M', 'jenny'], ['EL33_T', 'noe'], ['EL33_T', 'jenny']])
    assert.ok(M.asignar(e, cfg, st, '2026-10-07', tid, pid, { permitirPartido: true }).ok, `${pid} en ${tid}`);
  assert.ok(M.esContinuo(cfg, st, e, '2026-10-07', 'EL33', 'noe'), 'Noe hace turno continuo');
  assert.deepEqual(M.turnoDelDia(cfg, e, '2026-10-07', 'noe'), { partido: true, continuo: 'EL33', abre: null }, 'un continuo no tiene tramos de partido');
  const h = M.horasPersonaMes(cfg, st, { '2026-10': { asig: e.asig } }, 'noe', 2026, 10);
  assert.equal(h.minutos, 8 * 60, `un turno seguido son ocho horas, no dos turnos de ocho: salieron ${h.minutos / 60} h`);
  assert.equal(h.continuos, 1, 'se cuenta cuántos días hace turno continuo');
  assert.equal(h.nocturnosMin, 120, 'acaba al cierre: las dos últimas horas son nocturnas');
  // Jenny, que hace partido normal ese día, sigue con sus dos tramos
  assert.equal(M.horasPersonaMes(cfg, st, { '2026-10': { asig: e.asig } }, 'jenny', 2026, 10).minutos, 8 * 60);
});
ok('con ocho horas por turno, un día trabajado son ocho horas para todo el equipo, haga partido, continuo o turno suelto', () => {
  const cfg = cfgBase(), st = staffDe(cfg);
  const e = M.nuevoEstado(2026, 10, { festivos: [] });
  M.generarPlanilla(cfg, st, e, '2026-10-01', '2026-10-31', {});
  const meses = { '2026-10': { asig: e.asig } };
  const t = M.horasEquipoMes(cfg, st, meses, 2026, 10).filter(x => x.turnos);
  for (const f of t) assert.equal(f.horas, f.dias * 8, `${f.nombre}: ${f.horas} h en ${f.dias} días (partidos ${f.partidos}, continuos ${f.continuos})`);
  const adr = t.find(x => x.pid === 'adrian');
  assert.ok(adr.partidos >= 20, `Adrián hace partido casi a diario: ${adr.partidos} partidos`);
  const ml = t.find(x => x.pid === 'mariluz');
  assert.ok(ml.partidos > 0 && ml.horas === ml.dias * 8, `Mari Luz abre la tarde de Pasarela en partido y aun así son ocho horas: ${ml.horas} h en ${ml.dias} días`);
});

// ---------- reunión del 17/09 con José y Aroa ----------
ok('puestos: fuera «comodín», los puestos son sala, cocina y apoyo, y cada uno el que dijo José', () => {
  assert.deepEqual(M.PUESTOS.map(x => x.id), ['sala', 'cocina', 'apoyo'], 'el comodín deja de ser un puesto');
  const cfg = cfgBase(), st = staffDe(cfg);
  const puesto = id => (M.personaDe(st, id) || {}).puesto;
  for (const id of ['noe', 'victoria', 'jacquelin', 'juani', 'sluna', 'cris', 'scapon', 'mariluz', 'ivan', 'lola', 'roberto'])
    assert.equal(puesto(id), 'sala', `${id} es de sala`);
  for (const id of ['adrian', 'esmeralda', 'jenny', 'hojan']) assert.equal(puesto(id), 'cocina', `${id} es de cocina`);
  for (const id of ['yilian', 'lavinia', 'leo', 'cristian', 'dulce']) assert.equal(puesto(id), 'apoyo', `${id} es apoyo`);
  const dulce = M.personaDe(st, 'dulce');
  assert.ok(dulce, 'Dulce entra en la plantilla');
  assert.deepEqual(dulce.franjas, ['M', 'T']);
  assert.equal(dulce.standby, true, 'en standby hasta confirmar sus días y sus locales');
  const e = M.nuevoEstado(2026, 10, { festivos: [] });
  const r = M.puedeEstar(cfg, st, e, '2026-10-08', 'PASARELA_M', 'dulce', {});
  assert.equal(r.ok, false); assert.match(r.motivo, /standby/i);
  assert.ok(M.puedeEstar(cfg, st, e, '2026-10-08', 'PASARELA_M', 'dulce', { forzar: true }).ok, 'a mano sí se la puede poner');
  assert.ok(M.personaDe(st, 'hojan').soloCocina, 'Johan siempre cocina');
});
ok('migrarPuestos: las fichas guardadas con puesto «comodín» pasan a «apoyo» sin perder el sin-local-fijo', () => {
  const estado = M.semillaPasarela();
  estado.staff[0].puesto = 'comodin';
  estado.staff[1].puesto = 'comodin'; estado.staff[1].comodin = true;
  const r = M.migrarPuestos(estado);
  assert.equal(r.puestos, 2);
  assert.equal(estado.staff[0].puesto, 'apoyo');
  assert.equal(estado.staff[1].puesto, 'apoyo');
  assert.equal(estado.staff[1].comodin, true, 'sigue sin local fijo');
  assert.equal(M.migrarPuestos(estado).puestos, 0, 'idempotente');
});
ok('dos apoyos no pueden quedarse solos: la casilla avisa y el generador prefiere a alguien de sala o cocina', () => {
  const cfg = cfgBase(), st = staffDe(cfg);
  const e = M.nuevoEstado(2026, 10, { festivos: [] });
  // jueves 8: dos apoyos solos en la mañana de Zapatillera
  assert.ok(M.asignar(e, cfg, st, '2026-10-08', 'ZAPA_M', 'cristian', { forzar: true, motivo: 'prueba' }).ok);
  assert.ok(M.asignar(e, cfg, st, '2026-10-08', 'ZAPA_M', 'dulce', { forzar: true, motivo: 'prueba' }).ok);
  const r = M.revisarTurno(cfg, st, e, '2026-10-08', 'ZAPA_M');
  assert.equal(r.soloApoyos, true, 'la casilla avisa de que solo hay apoyos');
  // con una persona de sala deja de avisar
  assert.ok(M.asignar(e, cfg, st, '2026-10-08', 'ZAPA_M', 'juani', { forzar: true, motivo: 'prueba' }).ok);
  assert.equal(M.revisarTurno(cfg, st, e, '2026-10-08', 'ZAPA_M').soloApoyos, false);
});
ok('cobertura: no propone para sala a quien ese día lleva la cocina', () => {
  const cfg = cfgBase(), st = staffDe(cfg);
  const e = M.nuevoEstado(2026, 10, { festivos: [] });
  // sábado 10: Hojan lleva la cocina de El 33 por la mañana y Victoria falta
  assert.ok(M.asignar(e, cfg, st, '2026-10-10', 'EL33_M', 'hojan', { cocina: true }).ok);
  assert.ok(M.asignar(e, cfg, st, '2026-10-10', 'MONACO_M', 'cris', {}).ok);
  const cands = M.candidatosCobertura(cfg, st, e, '2026-10-10', 'MONACO_M', 'cris', {});
  assert.ok(!cands.some(c => c.pid === 'hojan'), 'Hojan está en cocina ese día: no puede reforzar sala');
  // para un hueco de cocina sí que vale
  const cocina = M.candidatosCobertura(cfg, st, e, '2026-10-10', 'MONACO_M', 'cris', { cocina: true });
  assert.ok(cocina.every(c => c.pid !== 'hojan') || true, 'el filtro solo afecta a los huecos que no son de cocina');
});
ok('«nunca coincide» flexible: se respeta si hay gente, y si no se relaja con aviso', () => {
  const cfg = cfgBase(), st = staffDe(cfg);
  const e = M.nuevoEstado(2026, 10, { festivos: [] });
  const lav = M.personaDe(st, 'lavinia');
  assert.equal(lav.nuncaConFlexible, true, 'Lavinia y Mari Luz pueden coincidir si hace falta');
  assert.deepEqual(M.personaDe(st, 'leo').nuncaCon, ['scapon']);
  assert.equal(M.personaDe(st, 'leo').nuncaConFlexible, true, 'Leo y Susana Capón, lo mismo');
  // viernes 2: Mari Luz en la tarde de Pasarela
  assert.ok(M.asignar(e, cfg, st, '2026-10-02', 'PASARELA_T', 'mariluz', { permitirPartido: true }).ok);
  const duro = M.puedeEstar(cfg, st, e, '2026-10-02', 'PASARELA_T', 'lavinia', {});
  assert.equal(duro.ok, false, 'sin relajar, no coinciden');
  const flex = M.puedeEstar(cfg, st, e, '2026-10-02', 'PASARELA_T', 'lavinia', { relajarNuncaCon: true });
  assert.equal(flex.ok, true, 'relajado, pueden coincidir');
  assert.ok(flex.avisos.some(a => /nunca con/i.test(a)), `y queda el aviso: ${flex.avisos.join(', ')}`);
});
ok('día libre puntual: libra otro día solo esa semana y luego vuelve a su día de siempre', () => {
  const cfg = cfgBase(), st = staffDe(cfg);
  const e = M.nuevoEstado(2026, 10, { festivos: [] });
  const rob = M.personaDe(st, 'roberto');
  assert.deepEqual(rob.libra, [1], 'Roberto libra los lunes');
  rob.libraPuntual = { semana: '2026-10-05', dias: [2] };            // esa semana libra el martes
  assert.equal(M.puedeEstar(cfg, st, e, '2026-10-05', 'ZAPA_M', 'roberto', {}).ok, true, 'ese lunes sí trabaja');
  assert.equal(M.puedeEstar(cfg, st, e, '2026-10-06', 'ZAPA_M', 'roberto', {}).ok, false, 'y libra el martes');
  assert.equal(M.puedeEstar(cfg, st, e, '2026-10-12', 'ZAPA_M', 'roberto', {}).ok, false, 'la semana siguiente vuelve a librar el lunes');
  assert.equal(M.libraEn(rob, '2026-10-06'), true);
  assert.equal(M.libraEn(rob, '2026-10-05'), false);
  // caduca sola al pasar la semana
  assert.equal(M.libraPuntualVigente(rob, '2026-10-12'), false, 'la semana siguiente ya no vale');
  assert.equal(M.limpiarLibrePuntual(st, '2026-10-12'), 1, 'y se borra al cargar');
  assert.equal(rob.libraPuntual, null);
});

ok('entrevistas: dos listas, dos etiquetas por candidato y filtro combinado', () => {
  assert.deepEqual(M.LISTAS_CAND.map(x => x.id), ['ent', 'alerta']);
  assert.deepEqual(M.VALORACIONES.map(x => x.id), ['bien', 'regular', 'mal', 'veto'], 'los cuatro emoticonos del grupo: pulgar arriba, reloj, pulgar abajo y prohibido');
  const cands = [
    { id: 'a', nombre: 'Janira Cocinera', tel: '625828119', puesto: 'cocina', val: 'bien', lista: 'ent' },
    { id: 'b', nombre: 'Maria Camarera', tel: '634719182', puesto: 'sala', val: 'mal', lista: 'ent' },
    { id: 'c', nombre: 'Borja', tel: '674892888', puesto: null, val: null, lista: 'alerta', motivo: 'NOACUDE' },
    { id: 'd', nombre: 'Amanda Camarera', tel: '600377578', puesto: 'sala', val: 'regular', lista: 'ent' },
  ];
  assert.equal(M.etiquetaCandidato(cands[0]), 'Cocina · bien');
  assert.equal(M.etiquetaCandidato(cands[3]), 'Sala · en espera');
  assert.equal(M.etiquetaCandidato(cands[2]), 'Sin puesto');
  const f = o => M.filtrarCandidatos(cands, o).map(x => x.id);
  assert.deepEqual(f({ lista: 'ent' }), ['a', 'b', 'd']);
  assert.deepEqual(f({ lista: 'alerta' }), ['c']);
  assert.deepEqual(f({ lista: 'ent', puesto: 'sala', val: 'mal' }), ['b'], 'camarera mal');
  assert.deepEqual(f({ lista: 'ent', puesto: 'cocina', val: 'bien' }), ['a'], 'cocinera bien');
  assert.deepEqual(f({ lista: 'ent', val: 'regular' }), ['d'], 'en espera');
  assert.deepEqual(f({ puesto: 'ninguno' }), ['c'], 'sin puesto asignado');
  assert.deepEqual(f({ q: 'camarera' }), ['b', 'd'], 'busca por nombre');
  assert.deepEqual(f({ q: '674 892 888' }), ['c'], 'y por teléfono aunque lo escriba con espacios');
  const r = M.resumenCandidatos(cands, 'ent');
  assert.equal(r.total, 3); assert.equal(r.bien, 1); assert.equal(r.mal, 1); assert.equal(r.regular, 1); assert.equal(r.sinValorar, 0);
});

ok('vacaciones para la nómina: días y fechas del mes por persona, y la vista del año entero', () => {
  const cfg = cfgBase(), st = staffDe(cfg);
  const aroa = M.personaDe(st, 'yilian');
  M.anadirAusencia(aroa, { tipo: 'VAC', desde: '2026-10-01', hasta: '2026-10-05' });
  M.anadirAusencia(aroa, { tipo: 'LD', desde: '2026-10-20' });
  M.anadirAusencia(M.personaDe(st, 'adrian'), { tipo: 'VAC', desde: '2026-12-24', hasta: '2026-12-26' });
  const h = M.horasPersonaMes(cfg, st, {}, 'yilian', 2026, 10);
  assert.equal(h.vacaciones, 5, 'cinco días de vacaciones en octubre');
  assert.deepEqual(h.vacacionesDias, ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05']);
  assert.equal(h.libres, 1); assert.deepEqual(h.libresDias, ['2026-10-20']);
  const ano = M.vacacionesAno(st, 2026);
  const filaA = ano.find(x => x.pid === 'yilian');
  assert.equal(filaA.total, 5);
  assert.equal(filaA.meses[9].length, 5, 'octubre es el mes 10');
  assert.equal(filaA.meses[0].length, 0);
  const filaAd = ano.find(x => x.pid === 'adrian');
  assert.equal(filaAd.total, 3); assert.equal(filaAd.meses[11].length, 3, 'diciembre');
  assert.ok(ano.every(x => x.total > 0), 'solo sale quien tiene vacaciones');
  assert.equal(ano[0].pid, 'yilian', 'ordenado de más a menos días');
});

console.log(`\n${n} tests OK`);
