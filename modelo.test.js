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

ok('la semilla trae 22 personas: 20 en activo y 2 de baja (Laura y Maydeth) sin fecha de fin', () => {
  const st = staffDe(cfgBase());
  assert.strictEqual(st.length, 22);
  const bajas = st.filter(p => (p.ausencias || []).some(a => a.tipo === 'BAJ' && !a.hasta));
  assert.deepStrictEqual(bajas.map(p => p.nombre).sort(), ['Laura', 'Maydeth']);
  assert.ok(st.every(p => Number.isInteger(p.color)), 'cada persona con color de la paleta');
  assert.strictEqual(new Set(st.map(p => p.id)).size, 22, 'ids únicos');
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
  assert.strictEqual(r.sinAbre, true, 'nadie definido para abrir el Mónaco por la mañana: aviso, no error');
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

ok('semana patrón: los días de cada persona cuadran con la columna DÍAS del PDF', () => {
  const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
  M.instanciarPatron(cfg, st, e, '2026-10-05', '2026-10-11');
  const dias = pid => new Set(Object.keys(e.asig).filter(iso => Object.values(e.asig[iso]).some(c => c.some(x => x.pid === pid)))).size;
  const esperado = { jacquelin: 6, cris: 6, esmeralda: 6, mariluz: 6, noe: 6, scapon: 6, ivan: 6, juani: 6, sluna: 6, roberto: 6, lavinia: 4, tere: 5, leo: 4, jenny: 6, cristian: 5, yilian: 6, lola: 6, adrian: 6, victoria: 6, hojan: 5, laura: 0, maydeth: 0 };
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
  assert.deepStrictEqual(real.huecos, [], 'la semana tipo sale sin turnos cortos');
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
  mon.descansoMin = 30;
  assert.strictEqual(M.minutosTurno(mon, 1, 'M'), 360 - 30);
  assert.strictEqual(M.minutosTurno(mon, 1, 'T'), 420 - 30);
  assert.strictEqual(M.minutosTurno(mon, 5, 'T'), 510 - 30, 'viernes con excepción');
  assert.strictEqual(M.minutosNocturnos(mon, 5, 'T'), 270, 'de 22:00 a 02:30');
});

ok('horasPersonaMes suma mañanas, tardes, partidos, horas por local, festivos, domingos, extras y saldo frente a contrato', () => {
  const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
  for (const l of cfg.locales) { l.horario = { M: { ini: '09:00', fin: '16:00' }, T: { ini: '16:00', fin: '23:00' } }; l.descansoMin = 0; }
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
  assert.strictEqual(tabla.length, 22);
  assert.strictEqual(tabla.find(x => x.pid === 'laura').horas, 0);
});

// ---------- exportador al núcleo shiftia-core ----------
ok('toProblem produce un problema del núcleo en medios días: turnos por local, cobertura por día y reglas de incompatibilidad', () => {
  const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
  const pr = M.toProblem(cfg, st, e, '2026-10-05', '2026-10-11');
  assert.strictEqual(pr.horizon_days, 14, '7 días × 2 franjas');
  assert.deepStrictEqual(pr.shifts.map(s => s.code).sort(), ['EL33', 'MONACO', 'OFF', 'PASARELA', 'ZAPA']);
  assert.strictEqual(pr.workers.length, 20, 'las dos bajas no entran');
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

console.log(`\n${n} tests OK`);
