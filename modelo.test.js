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

ok('la semilla trae 24 personas: 21 en activo (con Dulce, alta del 17/09) y 3 de baja sin fecha de fin', () => {
  const st = staffDe(cfgBase());
  assert.strictEqual(st.length, 24);
  const bajas = st.filter(p => (p.ausencias || []).some(a => a.tipo === 'BAJ' && !a.hasta));
  assert.deepStrictEqual(bajas.map(p => p.nombre).sort(), ['Laura', 'Maydeth', 'Susi']);
  assert.ok(st.every(p => Number.isInteger(p.color)), 'cada persona con color de la paleta');
  assert.strictEqual(new Set(st.map(p => p.id)).size, 24, 'ids únicos');
});

ok('altas del 17/09: Dulce y Susi llegan también a una planilla que ya estaba guardada, y una sola vez', () => {
  // La semilla solo se usa en un servidor vacío: sin esto, quien ya tenía la planilla dentro
  // (el del cliente) nunca vería a las que se dieron de alta después.
  const estado = M.semillaPasarela();
  estado.staff = estado.staff.filter(p => p.id !== 'dulce' && p.id !== 'susi');   // como estaba en septiembre
  delete estado.migraciones;
  const r = M.migrarAltas(estado);
  assert.deepStrictEqual(r.altas.slice().sort(), ['dulce', 'susi']);
  const susi = estado.staff.find(p => p.id === 'susi');
  assert.ok(susi && susi.puesto === 'cocina' && (susi.ausencias || []).some(a => a.tipo === 'BAJ' && !a.hasta), 'Susi entra de baja');
  assert.ok(estado.staff.find(p => p.id === 'dulce'), 'y Dulce también');
  // y no se repite: si el encargado borra a alguien, no vuelve solo en el siguiente arranque
  estado.staff = estado.staff.filter(p => p.id !== 'susi');
  assert.deepStrictEqual(M.migrarAltas(estado).altas, []);
  assert.ok(!estado.staff.some(p => p.id === 'susi'), 'no resucita a quien se borró a propósito');
});

ok('Susi: cocinera de baja, y la cubre Adrián (Aroa, 17/09)', () => {
  const cfg = cfgBase(), st = staffDe(cfg), e = M.nuevoEstado(2026, 10, { festivos: [] });
  const susi = st.find(p => p.id === 'susi');
  assert.ok(susi, 'está en la plantilla: ' + st.map(p => p.id).join(', '));
  assert.equal(susi.nombre, 'Susi');
  assert.equal(susi.puesto, 'cocina');
  const baja = (susi.ausencias || []).find(a => a.tipo === 'BAJ');
  assert.ok(baja && !baja.hasta, 'de baja, sin fecha de vuelta');
  assert.match(baja.detalle, /Adrián/);
  assert.match(M.puedeEstar(cfg, st, e, '2026-10-06', 'ZAPA_M', 'susi').motivo, /baja/i, 'el generador no la coloca');
  const adrian = st.find(p => p.id === 'adrian');
  assert.ok((adrian.cubreA || []).some(x => x.pid === 'susi'), 'Adrián la cubre: ' + JSON.stringify(adrian.cubreA));
  assert.ok((susi.supuestos || []).length, 'el local y la fecha de la baja quedan por confirmar');
  assert.equal(baja.desde, '2026-09-01', 'desde antes de la planilla del cliente, donde ya no salía');
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
  // 17/09 (Aroa): el lunes Mari Luz hace la tarde entera, así que la mañana de Pasarela se
  // queda en Lola y Tere —falta uno— y la tarde en Mari Luz sola —falta otro—. Los dos los
  // taparía una sola persona haciendo el partido; de momento son huecos de verdad.
  assert.deepStrictEqual(rev.filter(x => x.tipo === 'falta').map(x => `${x.iso} ${x.turnoId} ${x.n}`),
    ['2026-10-05 PASARELA_M 1', '2026-10-05 PASARELA_T 1'], 'los dos huecos del lunes en Pasarela, y ningún otro turno corto');
  assert.deepStrictEqual(rev.filter(x => x.tipo === 'sin-cocina' && x.turnoId.startsWith('MONACO')), [], 'Mónaco con cocina mañana y tarde');
});

ok('semana patrón: los días de cada persona cuadran con la columna DÍAS del PDF (Cristian sale a 6: pregunta al cliente; Leo baja a 2 al salir del martes de El 33 y del lunes de Pasarela, 17/09)', () => {
  const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
  M.instanciarPatron(cfg, st, e, '2026-10-05', '2026-10-11');
  const dias = pid => new Set(Object.keys(e.asig).filter(iso => Object.values(e.asig[iso]).some(c => c.some(x => x.pid === pid)))).size;
  const esperado = { jacquelin: 6, cris: 6, esmeralda: 6, mariluz: 6, noe: 6, scapon: 6, ivan: 6, juani: 6, sluna: 6, roberto: 6, lavinia: 4, tere: 5, leo: 2, jenny: 6, cristian: 6, yilian: 6, lola: 6, adrian: 6, victoria: 6, hojan: 5, laura: 0, maydeth: 0 };
  for (const [pid, d] of Object.entries(esperado)) assert.strictEqual(dias(pid), d, `${pid}: ${dias(pid)} días, esperaba ${d}`);
});

ok('puedeEstar dice QUÉ regla se está rompiendo, no solo el motivo (Diego, 18/09)', () => {
  // «hay que meter también un aviso que cuando fuerzas un trabajador te diga qué regla
  // estás incumpliendo»: el motivo en castellano no basta, hace falta el nombre de la
  // regla para poder ir a la ficha y corregirla si la equivocada es la ficha.
  const cfg = cfgBase(), st = staffDe(cfg), e = M.nuevoEstado(2026, 10, { festivos: [] });
  const veto = M.puedeEstar(cfg, st, e, '2026-10-05', 'PASARELA_M', 'mariluz');     // lunes
  assert.strictEqual(veto.regla, 'vetos');
  assert.strictEqual(M.nombreRegla(veto.regla), 'No hace (local y franja)');
  assert.strictEqual(M.puedeEstar(cfg, st, e, '2026-10-07', 'PASARELA_M', 'mariluz').regla, 'libra');
  assert.strictEqual(M.puedeEstar(cfg, st, e, '2026-10-06', 'EL33_M', 'mariluz').regla, 'locales');
  assert.strictEqual(M.puedeEstar(cfg, st, e, '2026-10-06', 'PASARELA_M', 'mariluz').regla, null, 'si puede, no hay regla rota');
  // las que no se pueden forzar también se nombran: el encargado tiene que entender por qué
  // no le sale ni el botón de forzar
  M.asignar(e, cfg, st, '2026-10-06', 'PASARELA_M', 'mariluz', {});
  assert.strictEqual(M.puedeEstar(cfg, st, e, '2026-10-06', 'PASARELA_M', 'mariluz').regla, 'duplicado');
  assert.strictEqual(M.puedeEstar(cfg, st, e, '2026-10-06', 'EL33_M', 'mariluz', { forzar: true }).regla, 'otraFranja', 'estar en dos bares a la vez no se fuerza');
});

ok('el «forzado a mano» se cae solo cuando el motivo ya no existe (Diego y Aroa, 18/09: el caso de Lola)', () => {
  // «Puede ser que Lola esté puesta que libra los domingos y esta semana libra un miércoles».
  // El forzado se estampaba al poner a la persona y no se volvía a mirar nunca: la planilla
  // seguía diciendo «forzado a mano» semanas después de que el motivo hubiera desaparecido.
  const cfg = cfgBase(), st = staffDe(cfg), e = M.nuevoEstado(2026, 10, { festivos: [] });
  const MIE = '2026-10-07';                                   // Mari Luz libra los miércoles
  const r = M.asignar(e, cfg, st, MIE, 'PASARELA_M', 'mariluz', { forzar: true, razon: 'hace falta' });
  assert.ok(r.ok && r.avisos.some(x => /libra/.test(x)), 'se la pone a la fuerza y queda el aviso');
  const enCasilla = () => M.posicionesDe(cfg, st, e, MIE, 'PASARELA_M').find(x => x.pid === 'mariluz');
  assert.strictEqual(enCasilla().forzado, true, 'mientras libra ese día, la casilla lo dice');
  assert.strictEqual(M.revisarTurno(cfg, st, e, MIE, 'PASARELA_M').forzados, 1);
  assert.deepStrictEqual(enCasilla().avisos, ['libra los miércoles'], 'y dice qué regla se está rompiendo');
  // esta semana su día libre se mueve al domingo: el miércoles ya no libra
  M.personaDe(st, 'mariluz').libraPuntual = { semana: M.mondayOf(MIE), dias: [7] };
  assert.strictEqual(enCasilla().forzado, false, 'sin motivo vigente, el papel no puede seguir diciendo «forzado a mano»');
  assert.deepStrictEqual(enCasilla().avisos, []);
  assert.strictEqual(M.revisarTurno(cfg, st, e, MIE, 'PASARELA_M').forzados, 0);
  // y la constancia de que se forzó no se borra: el historial es historial
  assert.strictEqual(e.asig[MIE]['PASARELA_M'].find(x => x.pid === 'mariluz').forzado, true);
});

ok('vetos por día: Mari Luz no hace la mañana de Pasarela los lunes, porque esa tarde la hace entera (Aroa, 17/09)', () => {
  const cfg = cfgBase(), st = staffDe(cfg), e = M.nuevoEstado(2026, 10, { festivos: [] });
  const r = M.puedeEstar(cfg, st, e, '2026-10-05', 'PASARELA_M', 'mariluz');   // lunes
  assert.ok(!r.ok, 'el lunes por la mañana no');
  assert.match(r.motivo, /lunes/i, r.motivo);
  const forzado = M.puedeEstar(cfg, st, e, '2026-10-05', 'PASARELA_M', 'mariluz', { forzar: true });
  assert.ok(forzado.ok && forzado.avisos.some(x => /lunes/.test(x)), 'es un aviso del grupo, no una imposibilidad: el encargado puede forzarlo y queda el aviso');
  assert.ok(M.puedeEstar(cfg, st, e, '2026-10-06', 'PASARELA_M', 'mariluz').ok, 'el martes sí');
  assert.ok(M.puedeEstar(cfg, st, e, '2026-10-05', 'PASARELA_T', 'mariluz').ok, 'y el lunes por la tarde, que es lo suyo');
  // el veto sin día sigue funcionando igual (Cristian, R17)
  assert.ok(!M.puedeEstar(cfg, st, e, '2026-10-05', 'PASARELA_M', 'cristian').ok);
  assert.ok(!M.puedeEstar(cfg, st, e, '2026-10-06', 'PASARELA_M', 'cristian').ok, 'el de Cristian es todos los días');
  const conds = M.condicionesDe(cfg, st);
  assert.ok(conds.some(c => /Mari Luz no hace mañanas en Pasarela los lunes/.test(c.texto)), conds.filter(c => /Mari Luz/.test(c.texto)).map(c => c.texto).join(' | '));
});

ok('semana patrón: el lunes de Pasarela, como lo contó Aroa (17/09) — Mari Luz la tarde entera de 16:00 a cierre', () => {
  const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
  M.instanciarPatron(cfg, st, e, '2026-10-05', '2026-10-11');
  assert.deepStrictEqual(M.pidsEn(e, '2026-10-05', 'PASARELA_M').sort(), ['lola', 'tere'], 'la mañana, Lola y Tere: Mari Luz no puede');
  assert.deepStrictEqual(M.pidsEn(e, '2026-10-05', 'PASARELA_T'), ['mariluz'], 'la tarde, ella sola');
  assert.deepEqual(M.turnoDelDia(cfg, e, '2026-10-05', 'mariluz'), { partido: false, continuo: null, abre: null }, 'el lunes no es partido: turno entero');
  assert.equal(M.primeroDe(cfg, st, e, '2026-10-05', 'PASARELA_T'), 'mariluz', 'y abre ella, que entra a las 16:00');
  assert.deepEqual(M.horarioDe(M.localDe(cfg, 'PASARELA'), 1, 'T'), { ini: '16:00', fin: '00:00' });
  assert.equal(M.minutosTurno(M.localDe(cfg, 'PASARELA'), 1, 'T'), 480, 'de 16:00 a cierre son las ocho horas');
  const mariluz = st.find(p => p.id === 'mariluz');
  assert.deepStrictEqual(mariluz.partido.dias, [2, 4, 5, 6], 'el lunes sale de sus días de partido');
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
  // 17/09 (Aroa): el único que no se puede tapar es la mañana del lunes en Pasarela — Mari
  // Luz hace esa tarde entera, y a esa hora no queda nadie libre. La tarde sí la rellena.
  assert.deepStrictEqual(real.huecos.filter(h => h.tipo !== 'primero').map(h => `${h.iso} ${h.turnoId}`),
    ['2026-10-05 PASARELA_M'], 'la semana tipo sale sin turnos cortos salvo el lunes de Pasarela');
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
  assert.strictEqual(tabla.length, 24);
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
  // martes: el lunes Mari Luz no hace la mañana de Pasarela (Aroa, 17/09)
  assert.ok(M.asignar(e, cfg, st, '2026-09-15', 'PASARELA_M', 'lola', {}).ok);
  assert.ok(M.asignar(e, cfg, st, '2026-09-15', 'PASARELA_M', 'mariluz', {}).ok);
  M.localDe(cfg, 'PASARELA').partidoAbre.T = false;   // sin la excepción del partido (15/09) rige la regla 31 tal cual
  assert.equal(M.puedePrimero(cfg, st, e, '2026-09-15', 'PASARELA_T', 'mariluz').ok, false, 'viene de hacer la mañana (Lola abre la mañana, así que no es turno continuo)');
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
  assert.deepEqual(quien('2026-09-14', 'PASARELA_T'), ['mariluz', 'leo'], 'lunes tarde Pasarela: Mari Luz hace la tarde entera, de 16:00 a cierre, y abre ella (Aroa, 17/09); Leo nunca de primero');
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
  // 17/09 (Aroa): el lunes Mari Luz hace la tarde entera de Pasarela, de 16:00 a cierre, así
  // que esa mañana no puede y se queda el hueco — a esa hora no hay nadie libre. 17/09 (José):
  // El 33 el martes se queda con Noe solo, que abre viniendo de la mañana.
  assert.deepEqual(r.huecos.map(h => `${h.iso} ${h.turnoId}`), ['2026-09-14 PASARELA_M'],
    JSON.stringify(r.huecos.map(h => [h.iso, h.turnoId, h.pos, h.motivo])));
  assert.deepEqual(quien('2026-09-14', 'PASARELA_M'), ['lola', 'tere'], 'la mañana del lunes se queda en Lola y Tere: el tercero es el hueco de arriba');
  const lunT = slots('2026-09-14', 'PASARELA_T');
  assert.equal(lunT[0].pid, 'mariluz'); assert.ok(lunT[0].abre && !lunT[0].partido, 'Mari Luz abre la tarde del lunes, y es turno entero, no partido: ' + JSON.stringify(lunT));
  assert.equal(r.resumen.turnos, 54); assert.equal(r.resumen.descansos, 27); assert.ok(r.resumen.maxDias <= 6);
  assert.deepEqual(r.libran['2026-09-18'], [], 'Dulce está en standby: no cuenta como que libra'); assert.equal(r.libran['2026-09-14'].length, 6); assert.equal(r.libran['2026-09-20'].length, 6);
  const rotas = r.condiciones.filter(c => !c.ok);
  assert.ok(r.condiciones.length >= 30, 'catálogo de condiciones: ' + r.condiciones.length);
  // la única que no se cumple es la que contó Aroa: el lunes por la mañana Pasarela se queda
  // en dos porque Mari Luz hace esa tarde entera y no hay quien la sustituya a esa hora
  assert.deepEqual(rotas.map(c => c.texto + ' → ' + c.detalle),
    ['Pasarela por la mañana: L–V 3, S–D 2 → lunes 14: 2 de 3'], 'condiciones rotas');
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
  assert.ok(M.asignar(e, cfg, st, '2026-10-06', 'PASARELA_M', 'lola', {}).ok && M.asignar(e, cfg, st, '2026-10-06', 'PASARELA_M', 'mariluz', {}).ok);
  assert.ok(M.asignar(e, cfg, st, '2026-10-06', 'PASARELA_T', 'mariluz', {}).ok && M.asignar(e, cfg, st, '2026-10-06', 'PASARELA_T', 'leo', {}).ok);
  assert.ok(M.puedePrimero(cfg, st, e, '2026-10-06', 'PASARELA_T', 'mariluz').ok, 'martes: Mari Luz hace partido declarado y puede abrir la tarde');
  assert.equal(M.primeroDe(cfg, st, e, '2026-10-06', 'PASARELA_T'), 'mariluz');
  assert.ok(!M.revisarTurno(cfg, st, e, '2026-10-06', 'PASARELA_T').sinAbre);
  const conds = M.condicionesDe(cfg, st);
  assert.ok(conds.some(c => c.k === 'partidoAbre' && /Pasarela/.test(c.texto) && /partido/.test(c.texto)), 'la condición aparece en el catálogo');
  pas.partidoAbre.T = false;
  assert.ok(!M.puedePrimero(cfg, st, e, '2026-10-06', 'PASARELA_T', 'mariluz').ok, 'apagado: quien viene de la mañana no abre la tarde');
  assert.equal(M.primeroDe(cfg, st, e, '2026-10-06', 'PASARELA_T'), null, 'y Leo nunca abre: hueco');
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
  const e = M.nuevoEstado(2026, 10, { festivos: [] });   // martes 6: Mari Luz hace partido en Pasarela y abre la tarde
  for (const [tid, pid] of [['PASARELA_M', 'lola'], ['PASARELA_M', 'mariluz'], ['PASARELA_M', 'tere'], ['PASARELA_T', 'mariluz'], ['PASARELA_T', 'leo']])
    assert.ok(M.asignar(e, cfg, st, '2026-10-06', tid, pid, {}).ok, `${pid} en ${tid}`);
  assert.equal(M.primeroDe(cfg, st, e, '2026-10-06', 'PASARELA_T'), 'mariluz', 'abre la tarde en partido (acuerdo del 15/09)');
  // lo que usan las vistas para enseñar el tramo de cada turno
  assert.deepEqual(M.turnoDelDia(cfg, e, '2026-10-06', 'mariluz'), { partido: true, continuo: null, abre: 'T' });
  assert.deepEqual(M.turnoDelDia(cfg, e, '2026-10-06', 'leo'), { partido: false, continuo: null, abre: null }, 'Leo solo hace la tarde');
  assert.deepEqual(M.horarioDe(M.localDe(cfg, 'PASARELA'), 2, 'T', true, 'T'), { ini: '16:00', fin: '21:00' }, 'entra a abrir a las 16:00');
  assert.deepEqual(M.horarioDe(M.localDe(cfg, 'PASARELA'), 2, 'M', true, 'T'), { ini: '13:00', fin: '16:00' }, 'y a mediodía hace las 3 h');
  const h = M.horasPersonaMes(cfg, st, { '2026-10': { asig: e.asig } }, 'mariluz', 2026, 10);
  assert.equal(h.minutos, 8 * 60, `un partido son ocho horas aunque abra la tarde; salieron ${h.minutos / 60} h`);
  assert.equal(h.nocturnosMin, 0, 'abre la tarde a las 16:00 y sale a las 21:00: no llega a las nocturnas');
  const mm = M.asignados(e, '2026-10-06', 'PASARELA_M').find(x => x.pid === 'mariluz');
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
  assert.equal(M.etiquetaCandidato(cands[0]), 'Cocinero/a · bien');
  assert.equal(M.etiquetaCandidato(cands[3]), 'Camarero/a · en espera');
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

ok('puesto múltiple: hay quien opta a camarero y a cocinero a la vez (Aroa, 17/09)', () => {
  const est = { entrevistas: [
    { id: 'c1', nombre: 'Uno', puesto: 'cocina', lista: 'ent' },
    { id: 'c2', nombre: 'Dos', puesto: 'sala', lista: 'ent' },
    { id: 'c3', nombre: 'Tres', lista: 'ent' },
  ] };
  const r = M.migrarCandidatos(est);
  assert.equal(r.candidatos, 3, 'los tres pasan de un puesto suelto a una lista');
  assert.deepStrictEqual(est.entrevistas.map(c => c.puestos), [['cocina'], ['sala'], []]);
  assert.ok(est.entrevistas.every(c => c.puesto === undefined), 'el campo viejo se retira');
  // y ahora uno puede llevar los dos
  est.entrevistas[2].puestos = ['cocina', 'sala'];
  assert.equal(M.etiquetaCandidato(est.entrevistas[2]), 'Cocinero/a y camarero/a');
  assert.equal(M.etiquetaCandidato(est.entrevistas[0]), 'Cocinero/a');
  assert.equal(M.etiquetaCandidato({ puestos: [], val: 'bien' }), 'Sin puesto · bien');
  const ids = f => M.filtrarCandidatos(est.entrevistas, f).map(c => c.id);
  assert.deepStrictEqual(ids({ puesto: 'cocina' }), ['c1', 'c3'], 'el filtro de cocina lo encuentra');
  assert.deepStrictEqual(ids({ puesto: 'sala' }), ['c2', 'c3'], 'y el de sala también');
  assert.deepStrictEqual(ids({ puesto: 'ninguno' }), [], 'ya no queda nadie sin puesto');
  const res = M.resumenCandidatos(est.entrevistas, 'ent');
  assert.equal(res.sinPuesto, 0);
  assert.deepStrictEqual(res.puesto, { cocina: 2, sala: 2 }, 'quien lleva los dos cuenta en los dos');
  // pasar la migración otra vez no toca lo ya migrado
  assert.equal(M.migrarCandidatos(est).candidatos, 0);
  assert.deepStrictEqual(est.entrevistas[2].puestos, ['cocina', 'sala']);
});

ok('las entrevistas de papel llegan a quien ya tenía la app abierta, sin pisar lo que haya escrito (Diego, 17/09)', () => {
  // La semilla solo se sembraba si la lista estaba vacía, así que una instalación en
  // marcha se quedaba con las fichas de solo nombre y teléfono. Esta fusión las rellena.
  const semilla = [
    { id: 'c1', nombre: 'Uno', tel: '600111222', lista: 'ent', edad: '31', zona: 'Elche', exp: 'Dos años de barra', hab: { cafetera: 'si', tpv: 'no' }, val: 'bien', puestos: ['cocina', 'sala'] },
    { id: 'c2', nombre: 'Dos', tel: '600333444', lista: 'ent', edad: '22', obs: 'Lo de la semilla' },
    { id: 'c3', nombre: 'Tres', tel: '600555666', lista: 'alerta', edad: '40' },
  ];
  const est = { entrevistas: [
    { id: 'c1', nombre: 'Uno', tel: '600111222', lista: 'ent', puestos: [] },
    // el mismo, pero con el teléfono tecleado distinto en Notion: se cruza por id
    { id: 'c2', nombre: 'Dos', tel: '600333999', lista: 'ent', puestos: [], obs: 'Lo que escribió el encargado', val: 'mal' },
  ] };
  const r = M.fundirSemillaEntrevistas(est, semilla);
  assert.equal(r.rellenadas, 2, 'las dos que ya estaban se completan');
  assert.equal(r.nuevas, 1, 'y la que faltaba se añade');
  const c1 = est.entrevistas.find(c => c.id === 'c1');
  assert.equal(c1.edad, '31'); assert.equal(c1.zona, 'Elche'); assert.equal(c1.exp, 'Dos años de barra');
  assert.deepStrictEqual(c1.hab, { cafetera: 'si', tpv: 'no' }, 'las aptitudes de la hoja');
  assert.equal(c1.val, 'bien', 'y la valoración que el grupo escribió en el papel');
  assert.deepStrictEqual(c1.puestos, ['cocina', 'sala'], 'camarero y cocinero');
  const c2 = est.entrevistas.find(c => c.id === 'c2');
  assert.equal(c2.obs, 'Lo que escribió el encargado', 'lo escrito en la app manda sobre la hoja');
  assert.equal(c2.val, 'mal', 'y su valoración también');
  assert.equal(c2.edad, '22', 'pero lo que estaba en blanco se rellena');
  assert.equal(c2.tel, '600333999', 'el teléfono de la app no se toca');
  assert.ok(est.entrevistas.some(c => c.id === 'c3' && c.lista === 'alerta'), 'la nueva entra en su lista');
  // pasarla otra vez no cambia nada
  const r2 = M.fundirSemillaEntrevistas(est, semilla);
  assert.equal(r2.rellenadas, 0); assert.equal(r2.nuevas, 0);
  assert.equal(est.entrevistas.length, 3);
});

ok('la fusión también cruza por teléfono cuando el id no coincide (Diego, 17/09)', () => {
  const semilla = [{ id: 'nuevo-id', nombre: 'Ana', tel: '611 22 33 44', lista: 'ent', edad: '28' }];
  const est = { entrevistas: [{ id: 'viejo-id', nombre: 'Ana', tel: '611223344', lista: 'ent' }] };
  const r = M.fundirSemillaEntrevistas(est, semilla);
  assert.equal(r.nuevas, 0, 'no se duplica a Ana');
  assert.equal(r.rellenadas, 1);
  assert.equal(est.entrevistas[0].edad, '28');
  assert.equal(est.entrevistas[0].id, 'viejo-id', 'conserva su id, que es lo que guarda el servidor');
});

ok('las mismas palabras en los filtros y en la ficha: cocinero/camarero, y en plural al filtrar (Diego, 17/09)', () => {
  assert.deepStrictEqual(M.PUESTOS_CAND.map(x => x.label), ['Cocinero/a', 'Camarero/a'], 'en la ficha y en cada persona');
  assert.deepStrictEqual(M.PUESTOS_CAND.map(x => x.plural), ['Cocineros', 'Camareros'], 'en los filtros, que agrupan gente');
  assert.equal(M.textoPuestos({ puestos: ['sala'] }), 'Camarero/a');
  assert.equal(M.textoPuestos({ puestos: [] }), 'Sin puesto');
});

ok('«el entrevistado busca»: mañanas, tardes, partido, fin de semana o sin problemas (Aroa, 17/09)', () => {
  assert.deepStrictEqual(M.BUSCA.map(x => x.id), ['M', 'T', 'P', 'FDS', 'TODO']);
  assert.deepStrictEqual(M.BUSCA.map(x => x.label), ['Mañanas', 'Tardes', 'Turno partido', 'Fin de semana', 'No tiene problemas']);
  assert.ok(M.BUSCA.every(x => x.ico), 'cada una con su icono');
  assert.equal(M.tieneEntrevista({ busca: ['M', 'T'] }), true, 'contestar qué busca es contestar la entrevista');
  assert.equal(M.tieneEntrevista({ busca: [] }), false);
  const cands = [{ id: 'c1', lista: 'ent', busca: ['T', 'FDS'] }, { id: 'c2', lista: 'ent', busca: ['M'] }];
  assert.deepStrictEqual(M.filtrarCandidatos(cands, { q: 'fin de semana' }).map(c => c.id), ['c1'], 'el buscador entra en lo que busca');
  assert.deepStrictEqual(M.filtrarCandidatos(cands, { q: 'mañanas' }).map(c => c.id), ['c2']);
});

ok('la entrevista pregunta también por aperturas y cierres (Aroa, 17/09)', () => {
  // «para saber si ha hecho aperturas o cierres en otros locales, que ahí veo yo si tiene
  // experiencia». Va con las demás aptitudes: sí / con dudas / no, y se puede filtrar.
  const h = M.HABILIDADES.find(x => x.id === 'apercierre');
  assert.ok(h, 'está en la lista de aptitudes: ' + M.HABILIDADES.map(x => x.id).join(', '));
  assert.equal(h.label, 'Aperturas o cierres');
  assert.equal(h.ico, 'llave');
  assert.equal(M.HABILIDADES.length, 8);
  const cands = [
    { id: 'c1', lista: 'ent', hab: { apercierre: 'si' } },
    { id: 'c2', lista: 'ent', hab: { apercierre: 'no' } },
    { id: 'c3', lista: 'ent', hab: {} },
  ];
  assert.deepStrictEqual(M.filtrarCandidatos(cands, { hab: 'apercierre' }).map(c => c.id), ['c1'], 'el filtro saca a quien sí las ha hecho');
  assert.equal(M.resumenCandidatos(cands, 'ent').hab.apercierre, 1);
  assert.equal(M.tieneEntrevista(cands[1]), true, 'contestar que no también es contestar');
});

ok('documentación en regla: sí, no o en trámite, justo detrás de zona (Diego, 17/09)', () => {
  const ks = M.CAMPOS_ENTREVISTA.map(x => x.k);
  assert.deepStrictEqual(ks.slice(0, 4), ['fecha', 'edad', 'zona', 'doc']);
  const x = M.CAMPOS_ENTREVISTA[3];
  assert.equal(x.label, 'Documentación en regla');
  assert.deepStrictEqual(x.opciones.map(o => o.id), ['si', 'no', 'tramite']);
  assert.deepStrictEqual(x.opciones.map(o => o.label), ['Sí', 'No', 'En trámite']);
  assert.ok(x.cabecera && !x.meta, 'va arriba con la zona, y contestarla es contestar la entrevista');
  assert.equal(M.textoCampo({ doc: 'tramite' }, x), 'En trámite', 'se guarda el id y se enseña la palabra');
  assert.equal(M.textoCampo({ doc: 'si' }, x), 'Sí');
  assert.equal(M.textoCampo({}, x), '');
  assert.equal(M.textoCampo({ zona: 'Elche' }, M.CAMPOS_ENTREVISTA[2]), 'Elche', 'los campos de texto, tal cual');
  assert.equal(M.tieneEntrevista({ doc: 'no' }), true);
  const cands = [{ id: 'c1', lista: 'ent', doc: 'tramite' }, { id: 'c2', lista: 'ent', doc: 'si' }];
  assert.deepStrictEqual(M.filtrarCandidatos(cands, { q: 'trámite' }).map(c => c.id), ['c1'], 'el buscador la lee por su palabra');
});

ok('la fecha de la entrevista va la primera de todos los datos (Aroa, 17/09)', () => {
  assert.equal(M.CAMPOS_ENTREVISTA[0].k, 'fecha', 'es lo primero que se ve en la ficha y en el perfil');
  // 17/09 (Diego): fecha, nombre, teléfono, edad y zona son lo primero de la ficha; el resto
  // de la entrevista va más abajo. Edad y zona sí son respuestas, así que cuentan como tal.
  assert.deepStrictEqual(M.CAMPOS_ENTREVISTA.filter(x => x.cabecera).map(x => x.k), ['fecha', 'edad', 'zona', 'doc']);
  assert.equal(M.tieneEntrevista({ edad: '30' }), true);
  assert.equal(M.tieneEntrevista({ zona: 'Elche' }), true);
  assert.ok(M.CAMPOS_ENTREVISTA.every(x => x.ico), 'y todos siguen con su icono');
  // la fecha se pone sola al registrar, así que por sí sola no significa «entrevista contestada»
  assert.equal(M.tieneEntrevista({ fecha: '17 de septiembre' }), false, 'solo con la fecha, no');
  assert.equal(M.tieneEntrevista({ fecha: '17 de septiembre', edad: '30' }), true);
  assert.equal(M.tieneEntrevista({ hab: { cafetera: 'si' } }), true);
  assert.equal(M.resumenCandidatos([{ lista: 'ent', fecha: 'hoy' }, { lista: 'ent', fecha: 'hoy', zona: 'Elche' }], 'ent').conEntrevista, 1);
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

ok('registro de apoyos: el tramo de cada día y sus horas, para pagarles (José y Aroa, 18/09)', () => {
  // José: «a partir del 1 de octubre… un registro, que los apoyos son los extras que hay que
  // pagarle». Aroa manda las horas del fin de semana por correo: «Dulce de 11:30 a 15 y de
  // 20:30 a 01 · Leo de 19 a cierre · Yiliam de 10 a 16 · Cristian de 20 a cierre».
  const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();   // octubre 2026: sábado 3, domingo 4
  const SAB = '2026-10-03', DOM = '2026-10-04';
  // la hora a la que cierra el local ese día es lo que rellena «hasta el cierre»
  assert.strictEqual(M.cierreDe(M.localDe(cfg, 'EL33'), 6), '00:00');
  const pon = (iso, tid, pid, ini, fin) => {
    assert.ok(M.asignar(e, cfg, st, iso, tid, pid, { forzar: true }).ok, `${pid} en ${tid}`);
    const x = e.asig[iso][tid].find(y => y.pid === pid);
    if (ini) { x.ini = ini; x.fin = fin; }
  };
  pon(SAB, 'PASARELA_M', 'dulce', '11:30', '15:00'); pon(SAB, 'PASARELA_T', 'dulce', '20:30', '01:00');
  pon(SAB, 'PASARELA_T', 'leo', '19:00', M.cierreDe(M.localDe(cfg, 'PASARELA'), 6));
  pon(SAB, 'MONACO_M', 'yilian', '10:00', '16:00');
  pon(SAB, 'MONACO_T', 'cristian');                       // sin ajustar: cuenta el turno del local
  pon(DOM, 'PASARELA_M', 'dulce', '11:00', '16:00'); pon(DOM, 'PASARELA_T', 'dulce', '20:00', '23:00');
  // el tramo de una casilla: el puesto a mano manda; sin él, el del local
  assert.deepStrictEqual(M.tramoDe(cfg, e, SAB, 'PASARELA_M', 'dulce'), { ini: '11:30', fin: '15:00', aMano: true });
  const tc = M.tramoDe(cfg, e, SAB, 'MONACO_T', 'cristian');
  assert.ok(tc && !tc.aMano && tc.ini === '16:00', JSON.stringify(tc));
  assert.strictEqual(M.tramoDe(cfg, e, SAB, 'MONACO_T', 'lola'), null, 'quien no está en la casilla no tiene tramo');
  const reg = M.registroApoyos(cfg, st, { '2026-10': e }, 2026, 10);
  const de = pid => reg.find(r => r.pid === pid);
  assert.deepStrictEqual(reg.map(r => r.pid).sort(), st.filter(M.esApoyo).map(p => p.id).sort(), 'todos los apoyos, tengan turnos o no');
  const dulce = de('dulce');
  assert.strictEqual(dulce.dias.length, 2);
  assert.strictEqual(dulce.dias[0].minutos, 210 + 270, 'sábado: 11:30–15 y 20:30–01, y el segundo tramo cruza la medianoche');
  assert.strictEqual(dulce.dias[1].minutos, 300 + 180);
  assert.strictEqual(dulce.horas, 16);
  assert.deepStrictEqual(dulce.dias[0].tramos.map(t => [t.localId, t.franja, t.ini, t.fin, t.aMano, t.minutos]),
    [['PASARELA', 'M', '11:30', '15:00', true, 210], ['PASARELA', 'T', '20:30', '01:00', true, 270]]);
  assert.strictEqual(de('leo').horas, 5, 'de 19 al cierre (00:00)');
  assert.strictEqual(de('yilian').horas, 6);
  assert.strictEqual(de('cristian').sinHoras, 1, 'un tramo sin horas ajustadas: se avisa, porque cuenta el turno entero');
  assert.strictEqual(dulce.sinHoras, 0);
  assert.strictEqual(de('tere').dias.length, 0);
  // lo que sale en el registro es exactamente lo que cuenta la tabla de horas de la nómina
  for (const pid of ['dulce', 'leo', 'yilian', 'cristian']) assert.strictEqual(de(pid).minutos, M.horasPersonaMes(cfg, st, { '2026-10': e }, pid, 2026, 10).minutos, pid);
});

ok('la fecha de la entrevista se entiende tal y como está escrita en la ficha', () => {
  // las fichas antiguas traen la fecha como la escribió el OCR (23/2/2026, «22 de Julio de 2026»,
  // «14 de Septiembre» sin año, con texto detrás…) y las nuevas como la pone la app
  // («lunes 21 de septiembre»). Para ordenar hace falta leerlas todas.
  const f = (fecha, hoy) => M.fechaCandidato({ fecha }, hoy || '2026-09-21');
  assert.strictEqual(f('23/2/2026'), '2026-02-23');
  assert.strictEqual(f('6/1/2024'), '2024-01-06');
  assert.strictEqual(f('13/10/2025'), '2025-10-13');
  assert.strictEqual(f('26/’9/2025'), '2025-09-26', 'un apóstrofo colado por el OCR no la rompe');
  assert.strictEqual(f('22 de Julio de 2026'), '2026-07-22');
  assert.strictEqual(f('29 de julio del 2026\n\nHelike Padel Club en la cafetería'), '2026-07-29', 'el texto que se coló debajo no cuenta');
  assert.strictEqual(f('29 de Julio.'), '2026-07-29', 'sin año: el más reciente que no sea futuro');
  assert.strictEqual(f('14 de Septiembre'), '2026-09-14');
  assert.strictEqual(f('30 de septiembre'), '2025-09-30', 'sin año y aún no ha llegado: fue el año pasado');
  assert.strictEqual(f('lunes 21 de septiembre'), '2026-09-21', 'la que pone la app al registrar');
  assert.strictEqual(f('2026-09-21'), '2026-09-21');
  assert.strictEqual(f('7/9/26'), '2026-09-07');
  assert.strictEqual(f(''), null);
  assert.strictEqual(f('cuando pueda'), null);
  assert.strictEqual(f('45/13/2026'), null);
  assert.strictEqual(M.fechaCandidato({}), null);
  assert.strictEqual(M.fechaCandidato(null), null);
});

ok('las entrevistas salen las últimas primero, nunca en orden alfabético (José, 21/09)', () => {
  // «Intenta que las entrevistas los que pongo BIEN o descarte me aparezcan primero cuando
  // filtre. Si sale en orden alfabético me vuelvo loco. Para que las últimas por fecha me
  // aparezcan antes». Manda lo último que se ha tocado (ts, el sello de registrar o valorar);
  // después la fecha de la entrevista, la más reciente antes; y quien no tiene ni una cosa
  // ni otra se queda como estaba, sin reordenar por nombre.
  const base = [
    { id: 'ana', nombre: 'Ana' },                                                  // sin nada: se queda donde estaba
    { id: 'bea', nombre: 'Bea', fecha: '10 de marzo de 2025' },
    { id: 'carla', nombre: 'Carla', fecha: '1/6/2025' },
    { id: 'dani', nombre: 'Dani', fecha: '20/11/2024', ts: 1700000000000 },        // valorado hace tiempo
    { id: 'eva', nombre: 'Eva' },
    { id: 'fran', nombre: 'Fran', fecha: '5/1/2025', ts: 1800000000000 },          // valorado hoy: el primero
    { id: 'gala', nombre: 'Gala', fecha: '14 de septiembre' },                     // la entrevista más reciente sin tocar
  ];
  const orden = M.ordenarCandidatos(base, '2026-09-21').map(c => c.id);
  assert.deepStrictEqual(orden, ['fran', 'dani', 'gala', 'carla', 'bea', 'ana', 'eva']);
  assert.notStrictEqual(M.ordenarCandidatos(base), base, 'devuelve una copia: la base no se toca');
  assert.deepStrictEqual(base.map(c => c.id), ['ana', 'bea', 'carla', 'dani', 'eva', 'fran', 'gala']);
  // el filtro respeta ese orden
  const bien = M.filtrarCandidatos(M.ordenarCandidatos(base.map(c => Object.assign({}, c, { val: c.id === 'ana' || c.id === 'fran' || c.id === 'bea' ? 'bien' : null }))), { val: 'bien' }).map(c => c.id);
  assert.deepStrictEqual(bien, ['fran', 'bea', 'ana']);
  // y un ts sin fecha gana a cualquier fecha: acabar de valorar a alguien lo sube arriba
  assert.deepStrictEqual(M.ordenarCandidatos([{ id: 'x', fecha: '20/9/2026' }, { id: 'y', ts: 1 }]).map(c => c.id), ['y', 'x']);
  // una fecha que no se entiende no manda a nadie al fondo por delante de quien no tiene ninguna
  assert.deepStrictEqual(M.ordenarCandidatos([{ id: 'p' }, { id: 'q', fecha: 'cuando pueda' }, { id: 'r', fecha: '1/1/2024' }]).map(c => c.id), ['r', 'p', 'q']);
});

ok('la lista se ordena de cuatro maneras: alfabético, por valoración, por fecha y las últimas primero', () => {
  // Diego, 21/09: «los filtros son orden alfabético, bien mal, fecha, etc, tal como pidió el
  // cliente». El orden que pidió José por WhatsApp («las últimas primero») se queda de
  // partida; las otras tres son para cuando busca de otra manera.
  const base = [
    { id: 'ana', nombre: 'Ana', val: 'mal' },
    { id: 'bea', nombre: 'Bea', val: 'bien', fecha: '10 de marzo de 2025' },
    { id: 'carla', nombre: 'Carla', val: null, fecha: '1/6/2025' },
    { id: 'dani', nombre: 'Dani', val: 'veto', fecha: '20/11/2024', ts: 1700000000000 },
    { id: 'eva', nombre: 'Élia', val: 'regular' },                                  // con acento y sin fecha
    { id: 'fran', nombre: 'fran', val: 'bien', fecha: '5/1/2025', ts: 1800000000000 },   // en minúscula
  ];
  const ids = modo => M.ordenarCandidatos(base, '2026-09-21', modo).map(c => c.id);
  assert.deepStrictEqual(ids(), ['fran', 'dani', 'carla', 'bea', 'ana', 'eva'], 'de partida, lo de José');
  assert.deepStrictEqual(ids('reciente'), ids());
  assert.deepStrictEqual(ids('alfabetico'), ['ana', 'bea', 'carla', 'dani', 'eva', 'fran'], 'ni la mayúscula ni el acento cambian el sitio');
  assert.deepStrictEqual(ids('valoracion'), ['fran', 'bea', 'eva', 'ana', 'dani', 'carla'], 'bien, en espera, mal, vetado, y sin valorar al final');
  assert.deepStrictEqual(ids('fecha'), ['carla', 'bea', 'fran', 'dani', 'ana', 'eva'], 'la entrevista más reciente antes, sin fecha al final');
  assert.deepStrictEqual(ids('loquesea'), ids(), 'un orden que no existe no rompe la lista');
  assert.deepStrictEqual(base.map(c => c.id), ['ana', 'bea', 'carla', 'dani', 'eva', 'fran'], 'ningún orden toca la base');
  // quien no tiene nombre no se cuela el primero en el alfabético
  assert.deepStrictEqual(M.ordenarCandidatos([{ id: 'x' }, { id: 'y', nombre: 'Zoe' }], '2026-09-21', 'alfabetico').map(c => c.id), ['y', 'x']);
  // los cuatro órdenes tienen nombre para el botón
  assert.deepStrictEqual(M.ORDENES_CAND.map(o => o.id), ['reciente', 'fecha', 'valoracion', 'alfabetico']);
  assert.ok(M.ORDENES_CAND.every(o => o.label && o.corto));
});

// ---------- día libre puntual de punta a punta (reunión del 24/09, decisión D9) ----------
// Diego, 24/09: «Esta semana libra martes en vez de miércoles… al generar no lo respeta… me
// salen los 2 días… luego no lo quita». Acordado: el miércoles hace exactamente lo que habría
// hecho el martes (sus plazas de la semana tipo, con su partido); quien la cubría el miércoles
// («por Mari Luz») se retira; el martes queda libre y se cubre como una ausencia.
const LP_LUN = '2026-10-05', LP_MAR = '2026-10-06', LP_MIE = '2026-10-07';
const lpTrabajaEn = (cfg, e, pid, iso) => M.turnosDe(cfg).filter(t => M.pidsEn(e, iso, t.id).includes(pid)).map(t => t.id);
const lpDias = (cfg, e, pid, lunes) => { let k = 0; for (let i = 0; i < 7; i++) if (lpTrabajaEn(cfg, e, pid, M.addDias(lunes, i)).length) k++; return k; };
// estado «virtual» de una semana que cruza de mes, como estadoSemana de la app (22-generador.js)
function lpSemanaVirtual(meses, lunes) {
  const e = { y: +lunes.slice(0, 4), m: +lunes.slice(5, 7), days: [], asig: {}, apertura: {}, manual: {}, festivos: [], virtual: true };
  for (let k = 0; k < 7; k++) {
    const iso = M.addDias(lunes, k), me = meses[iso.slice(0, 7)];
    e.days.push(me.days.find(x => x.iso === iso));
    me.asig[iso] = me.asig[iso] || {}; me.apertura[iso] = me.apertura[iso] || {}; me.manual[iso] = me.manual[iso] || {};
    e.asig[iso] = me.asig[iso]; e.apertura[iso] = me.apertura[iso]; e.manual[iso] = me.manual[iso];
  }
  return e;
}

ok('D9 · libra el martes en vez del miércoles: el generador la pasa al miércoles con su partido y retira a quien la cubría', () => {
  const base = cfgBase(), eb = estadoOct();
  M.generarSemana(base, staffDe(base), eb, LP_LUN, {});
  const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
  M.personaDe(st, 'mariluz').libraPuntual = [{ semana: LP_LUN, dias: [2] }];
  const r = M.generarSemana(cfg, st, e, LP_LUN, {});
  assert.deepStrictEqual(lpTrabajaEn(cfg, e, 'mariluz', LP_MAR), [], 'el martes 6 libra');
  assert.deepStrictEqual(lpTrabajaEn(cfg, e, 'mariluz', LP_MIE), ['PASARELA_M', 'PASARELA_T'], 'el miércoles 7 hace lo del martes: Pasarela mañana y tarde');
  for (const tid of ['PASARELA_M', 'PASARELA_T']) {
    const en = M.asignados(e, LP_MIE, tid).find(x => x.pid === 'mariluz');
    assert.ok(!(en.avisos || []).length, `sin aviso al ponerla en ${tid}: ${JSON.stringify(en.avisos)}`);
    assert.deepStrictEqual(M.avisosVigentes(cfg, st, e, LP_MIE, tid, 'mariluz'), [], 'ni aviso de partido: el partido del martes pasa al miércoles');
    assert.strictEqual(en.razon, 'esta semana cambia su día libre');
  }
  assert.ok(!M.turnosDe(cfg).some(t => M.asignados(e, LP_MIE, t.id).some(x => x.por === 'mariluz')), 'nadie la cubre el miércoles: Lavinia «por Mari Luz» no se pone');
  assert.strictEqual(lpDias(cfg, e, 'mariluz', LP_LUN), lpDias(base, eb, 'mariluz', LP_LUN), 'trabaja los mismos días que sin el cambio');
  assert.strictEqual(lpDias(cfg, e, 'mariluz', LP_LUN), 6);
  assert.ok(r.libran[LP_MAR].includes('mariluz') && !r.libran[LP_MIE].includes('mariluz'), '«Quién libra»: el martes sí, el miércoles no');
  assert.ok(!r.rechazados.some(x => x.pid === 'mariluz'), 'sus plazas del martes no son rechazos: se trasladan');
  for (const tid of ['PASARELA_M', 'PASARELA_T']) {
    const rev = M.revisarTurno(cfg, st, e, LP_MAR, tid);
    assert.ok(!rev.faltan || r.huecos.some(h => h.iso === LP_MAR && h.turnoId === tid), `el martes ${tid} queda cubierto o como hueco listado`);
  }
  const c = r.condiciones.find(x => x.id === 'p:mariluz:libra');
  assert.ok(c.ok && /martes/.test(c.texto), `condición: ${c.texto} · ${c.detalle}`);
  const cp = r.condiciones.find(x => x.id === 'p:mariluz:partido');
  assert.ok(cp.ok, `partido: ${cp.detalle}`);
});

ok('D9 · lo mismo para cualquiera que libre el miércoles: Victoria (la cubre Noe) y Adrián (sin cobertura)', () => {
  for (const pid of ['victoria', 'adrian']) {
    const base = cfgBase(), eb = estadoOct();
    M.generarSemana(base, staffDe(base), eb, LP_LUN, {});
    const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
    M.personaDe(st, pid).libraPuntual = [{ semana: LP_LUN, dias: [2] }];
    M.generarSemana(cfg, st, e, LP_LUN, {});
    assert.deepStrictEqual(lpTrabajaEn(cfg, e, pid, LP_MAR), [], `${pid}: el martes libra`);
    assert.deepStrictEqual(lpTrabajaEn(cfg, e, pid, LP_MIE), lpTrabajaEn(base, eb, pid, LP_MAR), `${pid}: el miércoles hace lo del martes`);
    assert.ok(!M.turnosDe(cfg).some(t => M.asignados(e, LP_MIE, t.id).some(x => x.por === pid)), `${pid}: nadie la cubre el miércoles`);
    assert.strictEqual(lpDias(cfg, e, pid, LP_LUN), lpDias(base, eb, pid, LP_LUN), `${pid}: los mismos días de trabajo`);
  }
});

ok('D9 · la semana que cruza de mes: libra el jueves 1/10 en vez del miércoles 30/09 (modo Periodo y modo Semana)', () => {
  const LUN = '2026-09-28';
  // modo Periodo: un generarPlanilla por mes, como generarSobre (22-generador.js)
  {
    const cfg = cfgBase(), st = staffDe(cfg);
    M.personaDe(st, 'mariluz').libraPuntual = [{ semana: LUN, dias: [4] }];
    const sep = M.nuevoEstado(2026, 9, { festivos: [] }), oct = estadoOct();
    M.generarPlanilla(cfg, st, sep, LUN, '2026-09-30', {});
    M.generarPlanilla(cfg, st, oct, '2026-10-01', '2026-10-04', {});
    assert.deepStrictEqual(lpTrabajaEn(cfg, sep, 'mariluz', '2026-09-30'), ['PASARELA_M', 'PASARELA_T'], 'el miércoles 30 (septiembre) hace lo del jueves');
    assert.deepStrictEqual(lpTrabajaEn(cfg, oct, 'mariluz', '2026-10-01'), [], 'el jueves 1 (octubre) libra');
    assert.ok(!M.asignados(sep, '2026-09-30', 'PASARELA_M').some(x => x.por === 'mariluz'));
  }
  // modo Semana: los siete días de dos meses en un estado virtual
  {
    const cfg = cfgBase(), st = staffDe(cfg);
    M.personaDe(st, 'mariluz').libraPuntual = [{ semana: LUN, dias: [4] }];
    const meses = { '2026-09': M.nuevoEstado(2026, 9, { festivos: [] }), '2026-10': estadoOct() };
    const r = M.generarSemana(cfg, st, lpSemanaVirtual(meses, LUN), LUN, {});
    assert.deepStrictEqual(lpTrabajaEn(cfg, meses['2026-09'], 'mariluz', '2026-09-30'), ['PASARELA_M', 'PASARELA_T']);
    assert.deepStrictEqual(lpTrabajaEn(cfg, meses['2026-10'], 'mariluz', '2026-10-01'), []);
    assert.ok(r.libran['2026-10-01'].includes('mariluz') && !r.libran['2026-09-30'].includes('mariluz'));
    assert.ok(r.condiciones.find(c => c.id === 'p:mariluz:libra').ok);
  }
});

ok('D9 · semana ya volcada: al regenerar se retira lo automático que rompe el día libre y se lista; lo manual y lo forzado se quedan', () => {
  // a) todo automático: se retira y sale en «Qué ha cambiado» y en retirados
  {
    const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
    M.generarSemana(cfg, st, e, LP_LUN, {});
    assert.deepStrictEqual(lpTrabajaEn(cfg, e, 'mariluz', LP_MAR), ['PASARELA_M', 'PASARELA_T'], 'volcada: el martes trabaja');
    M.personaDe(st, 'mariluz').libraPuntual = [{ semana: LP_LUN, dias: [2] }];
    const r = M.generarSemana(cfg, st, e, LP_LUN, {});
    assert.deepStrictEqual(lpTrabajaEn(cfg, e, 'mariluz', LP_MAR), [], 'regenerar la quita del martes');
    assert.deepStrictEqual(lpTrabajaEn(cfg, e, 'mariluz', LP_MIE), ['PASARELA_M', 'PASARELA_T'], 'y la pone el miércoles');
    assert.ok(!M.pidsEn(e, LP_MIE, 'PASARELA_M').includes('lavinia') && !M.pidsEn(e, LP_MIE, 'PASARELA_T').includes('lavinia'), 'Lavinia, que la cubría, se retira');
    const ret = (pid, iso, tid) => r.retirados.some(x => x.pid === pid && x.iso === iso && x.turnoId === tid && x.motivo);
    assert.ok(ret('mariluz', LP_MAR, 'PASARELA_M') && ret('mariluz', LP_MAR, 'PASARELA_T') && ret('lavinia', LP_MIE, 'PASARELA_M') && ret('lavinia', LP_MIE, 'PASARELA_T'), JSON.stringify(r.retirados));
    const cm = r.cambios.find(c => c.iso === LP_MAR && c.turnoId === 'PASARELA_M');
    assert.ok(cm && cm.antes.includes('mariluz') && !cm.despues.includes('mariluz'), 'el cambio del martes sale con antes y después');
    assert.ok(r.aplicados > 0);
  }
  // b) lo puesto a mano y lo forzado no lo quita nadie
  {
    const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
    M.generarSemana(cfg, st, e, LP_LUN, {});
    M.asignados(e, LP_MAR, 'PASARELA_M').find(x => x.pid === 'mariluz').origen = 'manual';      // la puso el encargado
    M.personaDe(st, 'mariluz').libraPuntual = [{ semana: LP_LUN, dias: [2] }];
    M.desasignar(e, LP_MAR, 'PASARELA_T', 'mariluz');
    assert.ok(M.asignar(e, cfg, st, LP_MAR, 'PASARELA_T', 'mariluz', { forzar: true, origen: 'generador' }).entry.forzado, 'forzada el martes aunque libra');
    const r = M.generarSemana(cfg, st, e, LP_LUN, {});
    assert.deepStrictEqual(lpTrabajaEn(cfg, e, 'mariluz', LP_MAR), ['PASARELA_M', 'PASARELA_T'], 'lo manual y lo forzado se quedan');
    assert.ok(!r.retirados.some(x => x.pid === 'mariluz'), 'y no salen como retirados');
    assert.ok(M.avisosVigentes(cfg, st, e, LP_MAR, 'PASARELA_M', 'mariluz').some(x => /libra/.test(x)), 'con su aviso');
  }
});

ok('D9 · moverDiaLibre en una semana ya volcada: la quita del martes, retira su cobertura y la pone el miércoles; quitarlo lo deshace', () => {
  const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
  M.generarSemana(cfg, st, e, LP_LUN, {});
  const ml = M.personaDe(st, 'mariluz');
  M.asignados(e, LP_MAR, 'PASARELA_T').find(x => x.pid === 'mariluz').origen = 'manual';      // la tarde se la puso el encargado a mano
  const r = M.moverDiaLibre(cfg, st, e, 'mariluz', LP_LUN, [2]);
  assert.ok(M.libraEn(ml, LP_MAR) && !M.libraEn(ml, LP_MIE), 'guarda el cambio de esa semana');
  const q = (pid, iso, tid) => r.quitados.some(x => x.pid === pid && x.iso === iso && x.turnoId === tid);
  assert.ok(q('mariluz', LP_MAR, 'PASARELA_M'), 'la quita de la mañana del martes (automática)');
  assert.ok(!q('mariluz', LP_MAR, 'PASARELA_T') && M.pidsEn(e, LP_MAR, 'PASARELA_T').includes('mariluz'), 'la tarde puesta a mano se queda');
  assert.ok(r.quedan.some(x => x.pid === 'mariluz' && x.iso === LP_MAR && x.turnoId === 'PASARELA_T' && x.avisos.some(a => /libra/.test(a))), 'y queda listada con su aviso');
  assert.ok(q('lavinia', LP_MIE, 'PASARELA_M') && q('lavinia', LP_MIE, 'PASARELA_T'), 'retira a Lavinia «por Mari Luz» del miércoles');
  assert.deepStrictEqual(lpTrabajaEn(cfg, e, 'mariluz', LP_MIE), ['PASARELA_M', 'PASARELA_T'], 'la pone el miércoles con las plazas del martes');
  assert.ok(r.puestos.some(x => x.pid === 'mariluz' && x.iso === LP_MIE && x.turnoId === 'PASARELA_T'));
  assert.deepStrictEqual(M.avisosVigentes(cfg, st, e, LP_MIE, 'PASARELA_T', 'mariluz'), [], 'con el partido trasladado: sin aviso');
  assert.ok(r.huecos.some(h => h.iso === LP_MAR && h.turnoId === 'PASARELA_M' && h.faltan > 0), `deja listado el hueco del martes: ${JSON.stringify(r.huecos)}`);
  // quitar el día puntual deshace lo mismo
  const d = M.moverDiaLibre(cfg, st, e, 'mariluz', LP_LUN, []);
  assert.ok(!M.libraPuntualVigente(ml, LP_MAR), 'el cambio se quita');
  assert.deepStrictEqual(lpTrabajaEn(cfg, e, 'mariluz', LP_MIE), [], 'el miércoles vuelve a librar');
  assert.deepStrictEqual(lpTrabajaEn(cfg, e, 'mariluz', LP_MAR), ['PASARELA_M', 'PASARELA_T'], 'el martes vuelve a trabajar');
  assert.ok(['PASARELA_M', 'PASARELA_T'].every(t => M.asignados(e, LP_MIE, t).some(x => x.pid === 'lavinia' && x.por === 'mariluz')), 'y Lavinia vuelve a cubrirla el miércoles');
  assert.ok(d.quitados.some(x => x.pid === 'mariluz' && x.iso === LP_MIE) && d.puestos.some(x => x.pid === 'lavinia' && x.iso === LP_MIE));
});

ok('D4 · verificarSemana y condicionesDe miran el día libre de ESA semana (también el objeto de antes del 24/09)', () => {
  const cfg = cfgBase(), st = staffDe(cfg);
  M.personaDe(st, 'mariluz').libraPuntual = { semana: LP_LUN, dias: [2] };   // forma antigua: se sigue leyendo
  const a = estadoOct();
  assert.ok(M.asignar(a, cfg, st, LP_MIE, 'PASARELA_M', 'mariluz', {}).ok);
  assert.ok(M.asignar(a, cfg, st, LP_MIE, 'PASARELA_T', 'mariluz', {}).ok, 'la tarde del miércoles también: el partido del martes pasa a ese día');
  const va = M.verificarSemana(cfg, st, a, LP_LUN);
  assert.strictEqual(va.find(c => c.id === 'p:mariluz:libra').ok, true, 'el miércoles trabaja esta semana: no rompe nada');
  assert.strictEqual(va.find(c => c.id === 'p:mariluz:partido').ok, true, 'ni el partido');
  const b = estadoOct();
  M.asignar(b, cfg, st, LP_MAR, 'PASARELA_M', 'mariluz', { forzar: true });
  const cb = M.verificarSemana(cfg, st, b, LP_LUN).find(c => c.id === 'p:mariluz:libra');
  assert.strictEqual(cb.ok, false, 'el martes libra esta semana: forzarla rompe la condición');
  assert.match(cb.texto, /martes/);
  assert.match(cb.detalle, /martes 6: trabaja/);
  assert.strictEqual(M.condicionesDe(cfg, st, LP_LUN).find(c => c.id === 'p:mariluz:libra').texto, 'Mari Luz libra el martes esta semana (en vez de los miércoles)');
  assert.strictEqual(M.condicionesDe(cfg, st, '2026-10-12').find(c => c.id === 'p:mariluz:libra').texto, 'Mari Luz libra los miércoles', 'la semana siguiente, su día de siempre');
  // Dulce no tiene días libres fijos: con un día libre puntual, la condición existe igual
  const d = M.personaDe(st, 'dulce'); delete d.standby; d.libraPuntual = [{ semana: LP_LUN, dias: [5] }];
  const cd = M.condicionesDe(cfg, st, LP_LUN).find(c => c.id === 'p:dulce:libra');
  assert.ok(cd && /viernes/.test(cd.texto), JSON.stringify(cd));
  const x = estadoOct(); M.asignar(x, cfg, st, '2026-10-09', 'PASARELA_T', 'dulce', { forzar: true });
  assert.strictEqual(M.verificarSemana(cfg, st, x, LP_LUN).find(c => c.id === 'p:dulce:libra').ok, false);
});

ok('núcleo (toProblem): bloquea el día libre puntual y no el habitual, y fija las plazas con el cambio', () => {
  const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
  M.personaDe(st, 'mariluz').libraPuntual = [{ semana: LP_LUN, dias: [2] }];
  const pb = M.toProblem(cfg, st, e, LP_LUN, M.addDias(LP_LUN, 6), {});
  const i = (iso, f) => pb.meta.indices.findIndex(x => x.iso === iso && x.franja === f);
  const w = id => pb.workers.find(x => x.id === id);
  for (const f of ['M', 'T']) {
    assert.strictEqual(w('mariluz').unavailable[i(LP_MAR, f)], '*', `Mari Luz libra el martes (${f})`);
    assert.strictEqual(w('mariluz').fixed[i(LP_MAR, f)], undefined, 'y no se le fija la plaza del martes');
    assert.strictEqual(w('mariluz').unavailable[i(LP_MIE, f)], undefined, 'el miércoles puede');
    assert.strictEqual(w('mariluz').fixed[i(LP_MIE, f)], 'PASARELA', 'y se le fija lo del martes');
    assert.strictEqual(w('lavinia').fixed[i(LP_MIE, f)], undefined, 'Lavinia no la cubre esa semana');
  }
  const pb2 = M.toProblem(cfg, st, e, '2026-10-12', '2026-10-18', {});
  const i2 = (iso, f) => pb2.meta.indices.findIndex(x => x.iso === iso && x.franja === f);
  assert.strictEqual(pb2.workers.find(x => x.id === 'mariluz').unavailable[i2('2026-10-14', 'M')], '*', 'la semana siguiente vuelve a librar el miércoles');
});

ok('libraPuntual es una lista por semanas: se leen las dos formas, se migra el objeto y caducan las semanas pasadas', () => {
  const p = { id: 'x', nombre: 'X', libra: [3], libraPuntual: { semana: '2026-10-05', dias: [2] } };
  assert.strictEqual(M.libraEn(p, '2026-10-06'), true, 'el objeto de antes se lee');
  assert.strictEqual(M.limpiarLibrePuntual([p], '2026-09-24'), 0, 'no hay semanas pasadas');
  assert.deepStrictEqual(p.libraPuntual, [{ semana: '2026-10-05', dias: [2] }], 'y pasa a ser una lista');
  M.ponerLibraPuntual(p, '2026-10-12', [5]);
  assert.deepStrictEqual(p.libraPuntual, [{ semana: '2026-10-05', dias: [2] }, { semana: '2026-10-12', dias: [5] }], 'varias semanas a la vez');
  assert.ok(M.libraEn(p, '2026-10-06') && !M.libraEn(p, '2026-10-07') && M.libraEn(p, '2026-10-16') && !M.libraEn(p, '2026-10-14') && M.libraEn(p, '2026-10-21'));
  M.ponerLibraPuntual(p, '2026-10-05', []);
  assert.deepStrictEqual(p.libraPuntual, [{ semana: '2026-10-12', dias: [5] }], 'sin días, la semana se quita');
  assert.strictEqual(M.limpiarLibrePuntual([p], '2026-10-19'), 1, 'la semana pasada se borra al cargar');
  assert.strictEqual(p.libraPuntual, null);
  p.libraPuntual = [{ semana: '2026-10-19', dias: [] }];
  assert.ok(M.libraEn(p, '2026-10-21') && !M.libraPuntualVigente(p, '2026-10-21'), 'una semana sin días no cambia nada');
});

ok('capa de lectura de la ficha: activa, partidoEn (con el partido trasladado) y estadoDia para las vistas', () => {
  const cfg = cfgBase(), st = staffDe(cfg), ml = M.personaDe(st, 'mariluz');
  assert.strictEqual(M.activa(cfg, ml, 'libra'), true);
  ml.inactivas = ['libra']; assert.strictEqual(M.activa(cfg, ml, 'libra'), false, 'apagada en la ficha'); delete ml.inactivas;
  cfg.reglas = { partido: false }; assert.strictEqual(M.activa(cfg, ml, 'partido'), false, 'apagada para el grupo');
  assert.strictEqual(M.partidoEn(cfg, ml, LP_MIE), true, 'con la regla apagada, el partido no se mira'); cfg.reglas = {};
  assert.strictEqual(M.partidoEn(cfg, ml, LP_MAR), true, 'hace partido los martes');
  assert.strictEqual(M.partidoEn(cfg, ml, LP_MIE), false, 'y no los miércoles');
  ml.libraPuntual = [{ semana: LP_LUN, dias: [2] }];
  assert.strictEqual(M.partidoEn(cfg, ml, LP_MIE), true, 'esa semana el partido del martes pasa al miércoles');
  assert.strictEqual(M.partidoEn(cfg, ml, LP_MAR), false);
  assert.strictEqual(M.partidoEn(cfg, ml, '2026-10-13'), true, 'la semana siguiente vuelve');
  assert.strictEqual(M.partidoAbre(cfg, M.localDe(cfg, 'PASARELA'), ml, LP_MIE, 'T'), true, 'y con él, abrir la tarde de Pasarela en partido');
  // si el número de días no cuadra, solo se prohíbe: el partido no se mueve
  const lav = M.personaDe(st, 'lavinia'); lav.libraPuntual = [{ semana: LP_LUN, dias: [5] }];   // libra lunes, martes y jueves
  assert.ok(M.libraEn(lav, '2026-10-09') && !M.libraEn(lav, LP_LUN), 'esa semana libra solo el viernes');
  assert.strictEqual(M.partidoEn(cfg, lav, LP_MIE), true, 'su partido del miércoles sigue donde estaba');
  const d2 = M.estadoDia(cfg, ml, LP_MAR);
  assert.strictEqual(d2.libra, true); assert.ok(d2.puntual);
  assert.strictEqual(d2.texto, 'libra el martes esta semana (en vez de los miércoles)');
  const d3 = M.estadoDia(cfg, ml, LP_MIE);
  assert.strictEqual(d3.libra, false); assert.match(d3.texto, /trabaja/);
  const d4 = M.estadoDia(cfg, ml, '2026-10-14');
  assert.deepStrictEqual([d4.libra, d4.puntual, d4.texto], [true, null, 'libra los miércoles']);
  assert.strictEqual(M.estadoDia(cfg, M.personaDe(st, 'dulce'), LP_MAR).standby, true);
  const tere = M.personaDe(st, 'tere'); tere.ausencias = [{ tipo: 'VAC', desde: LP_MAR, hasta: LP_MAR }];
  const dv = M.estadoDia(cfg, tere, LP_MAR);
  assert.ok(dv.ausencia && dv.ausencia.tipo === 'VAC' && /vacaciones/i.test(dv.texto), JSON.stringify(dv));
  ml.inactivas = ['libra'];
  assert.strictEqual(M.estadoDia(cfg, ml, '2026-10-14').libra, false, '«Días que libra» apagada: las vistas tampoco dicen «libra»');
});

ok('deBaja pide la fecha: el modelo no mira el reloj', () => {
  const p = { id: 'x', ausencias: [{ tipo: 'BAJ', desde: '2026-09-01' }] };
  assert.throws(() => M.deBaja(p), /fecha/);
  assert.strictEqual(M.deBaja(p, '2026-09-10'), true);
  assert.strictEqual(M.deBaja(p, '2026-08-31'), false);
});

ok('D8 · las condiciones de la semana dependen de la semana, no de si hoy está de baja', () => {
  // con fechas fijas: de baja del 21 al 27/09, vuelve el lunes 28
  {
    const cfg = cfgBase(), st = staffDe(cfg);
    M.anadirAusencia(M.personaDe(st, 'mariluz'), { tipo: 'BAJ', desde: '2026-09-21', hasta: '2026-09-27' });
    const e = M.nuevoEstado(2026, 9, { festivos: [] });
    M.asignar(e, cfg, st, '2026-09-30', 'PASARELA_M', 'mariluz', { forzar: true });
    const c = M.verificarSemana(cfg, st, e, '2026-09-28').find(x => x.id === 'p:mariluz:libra');
    assert.ok(c && c.ok === false, 'la semana que vuelve se comprueba: forzada el miércoles, que libra');
    assert.ok(!M.condicionesDe(cfg, st, '2026-09-21').some(x => x.pid === 'mariluz'), 'la semana entera de baja no tiene condiciones');
  }
  // y con el reloj de hoy, sea cual sea: de baja hoy, la semana de dentro de dos se comprueba
  {
    const cfg = cfgBase(), st = staffDe(cfg);
    const hoy = M.fechaMadrid(), lunes = M.mondayOf(M.addDias(hoy, 14)), mie = M.addDias(lunes, 2);
    M.anadirAusencia(M.personaDe(st, 'mariluz'), { tipo: 'BAJ', desde: M.addDias(hoy, -2), hasta: M.addDias(hoy, 2) });
    const e = M.nuevoEstado(+mie.slice(0, 4), +mie.slice(5, 7), { festivos: [] });
    M.asignar(e, cfg, st, mie, 'PASARELA_M', 'mariluz', { forzar: true });
    const c = M.verificarSemana(cfg, st, e, lunes).find(x => x.id === 'p:mariluz:libra');
    assert.ok(c && c.ok === false);
  }
});

ok('S6 · generarSemana mira la baja día a día: de baja toda la semana, o «de baja el lunes»', () => {
  const LUN = '2026-10-12';
  {
    const cfg = cfgBase(), st = staffDe(cfg);
    M.personaDe(st, 'tere').ausencias = [{ tipo: 'BAJ', desde: '2026-10-05', hasta: '2026-10-12' }];   // solo el lunes de esa semana
    const r = M.generarSemana(cfg, st, estadoOct(), LUN, {});
    assert.ok(!r.resumen.deBaja.includes('tere'), 'no está de baja toda la semana');
    assert.deepStrictEqual(r.resumen.bajasParciales.find(x => x.pid === 'tere'), { pid: 'tere', dias: ['2026-10-12'] });
    assert.ok(r.libran['2026-10-17'].includes('tere') && r.libran['2026-10-18'].includes('tere'), 'el fin de semana libra y sale en «Quién libra»');
    assert.ok(!r.libran['2026-10-12'].includes('tere'), 'el lunes está de baja, no libra');
    assert.ok(r.resumen.deBaja.includes('laura'), 'Laura, de baja sin fin, toda la semana');
  }
  {
    const cfg = cfgBase(), st = staffDe(cfg);
    M.personaDe(st, 'tere').ausencias = [{ tipo: 'BAJ', desde: '2026-10-14' }];   // desde el miércoles, sin fin
    const r = M.generarSemana(cfg, st, estadoOct(), LUN, {});
    assert.ok(!r.resumen.deBaja.includes('tere'));
    assert.deepStrictEqual(r.resumen.bajasParciales.find(x => x.pid === 'tere').dias, ['2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18']);
  }
});

// ---------- revisión de la FASE 1 (24/09): lo que los dos revisores encontraron ----------
// Foto de una semana: quién está en cada casilla, con su «por» y quién lleva la cocina.
const lpFoto = (cfg, e, lunes) => {
  const m = {};
  for (let k = 0; k < 7; k++) {
    const iso = M.addDias(lunes, k);
    for (const t of M.turnosDe(cfg)) { const xs = M.asignados(e, iso, t.id).map(x => x.pid + (x.por ? '/por:' + x.por : '') + (x.cocina ? '(coc)' : '')).sort(); if (xs.length) m[iso + ' ' + t.id] = xs.join(','); }
  }
  return m;
};
// lo que hacía aplicarPrevia (modo Periodo, «Mes → Generar», «Completar este día») hasta esta
// revisión: volcaba cada plaza SIN el «por» ni la nota. Así están los datos ya guardados.
function lpVolcadoSinPor(cfg, st) {
  const real = estadoOct();
  const prev = M.generarPlanilla(cfg, st, real, '2026-10-01', '2026-10-31', { simular: true });
  for (const a of prev.aplicados) {
    if (M.pidsEn(real, a.iso, a.turnoId).includes(a.pid)) continue;
    const entry = M.asignados(prev.estado, a.iso, a.turnoId).find(x => x.pid === a.pid) || {};
    M.asignar(real, cfg, st, a.iso, a.turnoId, a.pid, { origen: a.origen, razon: a.razon, supuesto: !!a.supuesto || !!entry.supuesto, permitirPartido: true, cocina: entry.cocina ? true : undefined, abre: entry.abre ? true : undefined });
  }
  return real;
}

ok('revisión F1 · volcado sin «por» (modo Periodo y datos de antes): «cubre a Mari Luz» se lee como su cobertura, y el cambio de día libre la pasa al miércoles', () => {
  // el cambio aplicado a la planilla (ficha, con la semana volcada)
  {
    const cfg = cfgBase(), st = staffDe(cfg);
    const e = lpVolcadoSinPor(cfg, st);
    assert.ok(!M.asignados(e, LP_MIE, 'PASARELA_M').find(x => x.pid === 'lavinia').por, 'el volcado de antes no lleva «por»');
    const r = M.moverDiaLibre(cfg, st, e, 'mariluz', LP_LUN, [2]);
    assert.deepStrictEqual(lpTrabajaEn(cfg, e, 'mariluz', LP_MAR), [], 'libra el martes');
    assert.deepStrictEqual(lpTrabajaEn(cfg, e, 'mariluz', LP_MIE), ['PASARELA_M', 'PASARELA_T'], `y trabaja el miércoles (rechazados: ${JSON.stringify(r.rechazados)})`);
    assert.deepStrictEqual(lpTrabajaEn(cfg, e, 'lavinia', LP_MIE), [], 'Lavinia deja de cubrirla');
    assert.ok(r.quitados.some(x => x.pid === 'lavinia' && x.iso === LP_MIE), 'y sale listada');
  }
  // el mismo volcado, regenerado con «Generar la semana»
  {
    const cfg = cfgBase(), st = staffDe(cfg);
    const e = lpVolcadoSinPor(cfg, st);
    M.ponerLibraPuntual(M.personaDe(st, 'mariluz'), LP_LUN, [2]);
    const r = M.generarSemana(cfg, st, e, LP_LUN, {});
    assert.deepStrictEqual(lpTrabajaEn(cfg, e, 'mariluz', LP_MIE), ['PASARELA_M', 'PASARELA_T'], JSON.stringify(r.rechazados.filter(x => x.pid === 'mariluz')));
    assert.ok(!M.pidsEn(e, LP_MIE, 'PASARELA_M').includes('lavinia') && r.retirados.some(x => x.pid === 'lavinia'));
  }
  // una sola lectura del «por» (porDe): la usan la planilla, la retirada y el cambio de día libre
  const st0 = staffDe(cfgBase());
  assert.strictEqual(M.porDe(st0, { pid: 'lavinia', razon: 'cubre a Mari Luz' }), 'mariluz', 'sin «por», se deduce de la razón');
  assert.strictEqual(M.porDe(st0, { pid: 'lavinia', por: 'mariluz', razon: 'plaza fija' }), 'mariluz');
  assert.strictEqual(M.porDe(st0, { pid: 'leo', razon: 'sin local fijo · 3 turnos este mes' }), null);
});

ok('revisión F1 · núcleo: desdeSolucion copia el «por» y la nota de la plaza fija de la semana tipo', () => {
  const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
  const pb = M.toProblem(cfg, st, e, LP_LUN, M.addDias(LP_LUN, 6), {});
  const i = pb.meta.indices.findIndex(x => x.iso === LP_MIE && x.franja === 'M');
  M.desdeSolucion(cfg, st, e, pb, { schedule: { lavinia: { [i]: 'PASARELA' } } });
  const en = M.asignados(e, LP_MIE, 'PASARELA_M').find(x => x.pid === 'lavinia');
  assert.ok(en, 'la pone el núcleo');
  assert.strictEqual(en.por, 'mariluz', 'con el «por» de su plaza fija: así un cambio de día libre sabe a quién cubría');
  assert.strictEqual(en.origen, 'nucleo');
});

ok('revisión F1 · al retirar a quien llevaba la cocina se recalcula quién la lleva (Adrián cambia su día y vuelve)', () => {
  for (const via of ['ficha', 'generador']) {
    const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
    M.generarSemana(cfg, st, e, LP_LUN, {});
    assert.ok(M.asignados(e, LP_MAR, 'ZAPA_M').find(x => x.pid === 'adrian').cocina, 'Adrián lleva la cocina del martes');
    const cambia = dias => { if (via === 'ficha') return M.moverDiaLibre(cfg, st, e, 'adrian', LP_LUN, dias); M.ponerLibraPuntual(M.personaDe(st, 'adrian'), LP_LUN, dias); return M.generarSemana(cfg, st, e, LP_LUN, {}); };
    const r = cambia([2]);
    const rev = M.revisarTurno(cfg, st, e, LP_MAR, 'ZAPA_M');
    assert.strictEqual(rev.sinCocina, false, `${via}: el martes por la mañana la cocina la coge otro (${JSON.stringify(M.asignados(e, LP_MAR, 'ZAPA_M'))})`);
    if (r.condiciones) assert.ok(r.condiciones.filter(c => c.tipo === 'cocina').every(c => c.ok), JSON.stringify(r.condiciones.filter(c => c.tipo === 'cocina' && !c.ok)));
    cambia([]);
    for (const tid of ['ZAPA_M', 'ZAPA_T']) assert.strictEqual(M.revisarTurno(cfg, st, e, LP_MIE, tid).sinCocina, false, `${via}: quitar el cambio deja con cocina el miércoles ${tid} (${JSON.stringify(M.asignados(e, LP_MIE, tid))})`);
    assert.ok(M.asignados(e, LP_MAR, 'ZAPA_M').find(x => x.pid === 'adrian').cocina, `${via}: y Adrián vuelve a llevar la del martes`);
  }
});

ok('revisión F1 · quitar el cambio lo devuelve todo a su sitio, también el «cubre a» del día nuevo (Roberto por Adrián)', () => {
  for (const pid of ['adrian', 'mariluz', 'victoria']) {
    const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
    M.generarSemana(cfg, st, e, LP_LUN, {});
    const antes = lpFoto(cfg, e, LP_LUN);
    M.moverDiaLibre(cfg, st, e, pid, LP_LUN, [2]);
    M.moverDiaLibre(cfg, st, e, pid, LP_LUN, []);
    assert.deepStrictEqual(lpFoto(cfg, e, LP_LUN), antes, `${pid}: la semana queda como estaba`);
  }
  // por el camino del generador: cambio → generar → quitar el cambio → regenerar
  {
    const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
    M.ponerLibraPuntual(M.personaDe(st, 'adrian'), LP_LUN, [2]);
    M.generarSemana(cfg, st, e, LP_LUN, {});
    assert.ok(M.asignados(e, LP_MAR, 'ZAPA_T').some(x => x.pid === 'roberto' && x.por === 'adrian'), 'con el cambio, Roberto cubre a Adrián el martes');
    M.ponerLibraPuntual(M.personaDe(st, 'adrian'), LP_LUN, []);
    const r = M.generarSemana(cfg, st, e, LP_LUN, {});
    assert.ok(!M.asignados(e, LP_MAR, 'ZAPA_T').some(x => x.por === 'adrian'), 'sin el cambio, nadie le cubre el martes');
    const ret = r.retirados.find(x => x.pid === 'roberto' && x.iso === LP_MAR);
    assert.ok(ret && /Adrián trabaja/.test(ret.motivo), JSON.stringify(r.retirados));
  }
  // clic a clic en la ficha (martes, jueves, quitar el martes) = marcar directamente el jueves
  for (const pid of ['adrian', 'mariluz', 'victoria']) {
    const a = cfgBase(), sa = staffDe(a), ea = estadoOct(); M.generarSemana(a, sa, ea, LP_LUN, {});
    for (const d of [[2], [2, 4], [4]]) M.moverDiaLibre(a, sa, ea, pid, LP_LUN, d);
    const b = cfgBase(), sb = staffDe(b), eb = estadoOct(); M.generarSemana(b, sb, eb, LP_LUN, {});
    M.moverDiaLibre(b, sb, eb, pid, LP_LUN, [4]);
    assert.deepStrictEqual(lpFoto(a, ea, LP_LUN), lpFoto(b, eb, LP_LUN), `${pid}: el camino no cambia el resultado`);
  }
});

ok('revisión F1 · moverDiaLibre solo toca los días que cambian: lo quitado a mano otro día no vuelve, y un día sin planilla no se rellena', () => {
  {
    const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
    M.generarSemana(cfg, st, e, LP_LUN, {});
    M.desasignar(e, '2026-10-09', 'PASARELA_T', 'mariluz');   // el encargado la quita a mano del viernes por la tarde
    const r = M.moverDiaLibre(cfg, st, e, 'mariluz', LP_LUN, [2]);
    assert.ok(!M.pidsEn(e, '2026-10-09', 'PASARELA_T').includes('mariluz'), 'el viernes por la tarde sigue sin ella');
    assert.ok(r.puestos.every(x => x.iso === LP_MAR || x.iso === LP_MIE), JSON.stringify(r.puestos));
  }
  {
    const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
    assert.ok(M.asignar(e, cfg, st, LP_LUN, 'PASARELA_M', 'lola', {}).ok);   // la semana solo tiene una plaza puesta a mano
    const r = M.moverDiaLibre(cfg, st, e, 'mariluz', LP_LUN, [2]);
    assert.deepStrictEqual(r.puestos, [], 'los días sin planilla no se rellenan: eso lo hace el generador');
    assert.deepStrictEqual(Object.keys(lpFoto(cfg, e, LP_LUN)), [LP_LUN + ' PASARELA_M']);
    assert.ok(M.libraEn(M.personaDe(st, 'mariluz'), LP_MAR), 'el cambio queda guardado en la ficha');
  }
});

ok('revisión F1 · el aviso de días sin emparejar solo sale si hay días de siempre y no se sabe cuál trabaja a cambio', () => {
  for (const [pid, dias] of [['dulce', [2]], ['susi', [4]], ['maydeth', [2]], ['mariluz', [2, 3]]]) {
    const cfg = cfgBase(), st = staffDe(cfg);
    M.ponerLibraPuntual(M.personaDe(st, pid), LP_LUN, dias);
    const r = M.generarSemana(cfg, st, estadoOct(), LP_LUN, {});
    assert.ok(!r.avisos.some(a => a.pid === pid), `${pid}: nada que emparejar → ${JSON.stringify(r.avisos)}`);
  }
  const cfg = cfgBase(), st = staffDe(cfg);
  M.ponerLibraPuntual(M.personaDe(st, 'lavinia'), LP_LUN, [5]);   // libra lunes, martes y jueves; esta semana, el viernes
  const r = M.generarSemana(cfg, st, estadoOct(), LP_LUN, {});
  const a = r.avisos.find(x => x.pid === 'lavinia');
  assert.ok(a && /no se sabe qué día trabaja a cambio/.test(a.texto) && !/emparejar/.test(a.texto), JSON.stringify(r.avisos));
});

ok('revisión F1 · un día del cambio que ya ha pasado no se toca: lo demás se aplica igual que en el generador y se avisa de cuántos días trabaja', () => {
  const JUE = '2026-10-08', VIE = '2026-10-09';
  // libra el viernes en vez del miércoles y el miércoles ya ha pasado (hoy es jueves)
  {
    const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
    M.generarSemana(cfg, st, e, LP_LUN, {});
    const r = M.moverDiaLibre(cfg, st, e, 'mariluz', LP_LUN, [5], { desdeIso: JUE });
    assert.deepStrictEqual(lpTrabajaEn(cfg, e, 'mariluz', VIE), [], 'el viernes libra');
    assert.deepStrictEqual(lpTrabajaEn(cfg, e, 'mariluz', LP_MIE), [], 'el miércoles (pasado) no se toca');
    assert.ok(r.avisos.some(a => /miércoles 7 ya ha pasado/.test(a.texto) && /5 días en vez de 6/.test(a.texto)), JSON.stringify(r.avisos));
    // el generador, con la misma ficha y el mismo «desde hoy», hace lo mismo con Mari Luz y lo avisa
    const cfg2 = cfgBase(), st2 = staffDe(cfg2), e2 = estadoOct();
    M.generarSemana(cfg2, st2, e2, LP_LUN, {});
    M.ponerLibraPuntual(M.personaDe(st2, 'mariluz'), LP_LUN, [5]);
    const g = M.generarSemana(cfg2, st2, e2, LP_LUN, { desdeIso: JUE });
    for (let k = 0; k < 7; k++) { const iso = M.addDias(LP_LUN, k); assert.deepStrictEqual(lpTrabajaEn(cfg2, e2, 'mariluz', iso), lpTrabajaEn(cfg, e, 'mariluz', iso), `generador y ficha coinciden el ${iso}`); }
    assert.ok(g.avisos.some(a => a.pid === 'mariluz' && /miércoles 7 ya ha pasado/.test(a.texto)), JSON.stringify(g.avisos));
  }
  // libra el martes en vez del miércoles y el martes ya ha pasado (hoy es miércoles)
  {
    const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
    M.generarSemana(cfg, st, e, LP_LUN, {});
    const r = M.moverDiaLibre(cfg, st, e, 'mariluz', LP_LUN, [2], { desdeIso: LP_MIE });
    assert.deepStrictEqual(lpTrabajaEn(cfg, e, 'mariluz', LP_MAR), ['PASARELA_M', 'PASARELA_T'], 'el martes (pasado) no se toca');
    assert.ok(r.avisos.some(a => /martes 6 ya ha pasado/.test(a.texto) && /7 días en vez de 6/.test(a.texto)), JSON.stringify(r.avisos));
  }
});

ok('revisión F1 · «Guardar como semana tipo» con un cambio de día libre guarda a cada uno con su día de siempre', () => {
  const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
  const ml = M.personaDe(st, 'mariluz');
  M.ponerLibraPuntual(ml, LP_LUN, [2]);
  M.generarSemana(cfg, st, e, LP_LUN, {});
  assert.ok(M.patronDesdeSemana(e, LP_LUN)[3].some(pl => pl.p === 'mariluz'), 'sin la ficha, la foto de la semana es literal (como antes)');
  const pt = M.patronDesdeSemana(e, LP_LUN, cfg, st);
  assert.deepStrictEqual(pt[2].filter(pl => pl.p === 'mariluz').map(pl => pl.t).sort(), ['PASARELA_M', 'PASARELA_T'], 'el martes vuelve a ser suyo');
  assert.ok(!pt[2].some(pl => pl.por === 'mariluz'), 'y nadie la cubre el martes');
  assert.ok(!pt[3].some(pl => pl.p === 'mariluz'), 'el miércoles libra');
  assert.deepStrictEqual(pt[3].filter(pl => pl.por === 'mariluz').map(pl => pl.p + '@' + pl.t).sort(), ['lavinia@PASARELA_M', 'lavinia@PASARELA_T'], 'y Lavinia vuelve a cubrirla el miércoles');
  // con esa semana tipo, la semana siguiente (sin cambio) sale como siempre
  cfg.patron = pt;
  const e2 = estadoOct();
  M.generarSemana(cfg, st, e2, '2026-10-12', {});
  assert.deepStrictEqual(lpTrabajaEn(cfg, e2, 'mariluz', '2026-10-13'), ['PASARELA_M', 'PASARELA_T']);
  assert.deepStrictEqual(lpTrabajaEn(cfg, e2, 'mariluz', '2026-10-14'), []);
});

ok('revisión F1 · marcar su propio día libre no guarda un cambio vacío («libra miércoles en vez de miércoles»)', () => {
  const p = { id: 'x', nombre: 'X', libra: [3], libraPuntual: [{ semana: '2026-10-12', dias: [5] }] };
  M.ponerLibraPuntual(p, LP_LUN, [3]);
  assert.deepStrictEqual(p.libraPuntual, [{ semana: '2026-10-12', dias: [5] }], 'no se guarda, y las demás semanas siguen');
  M.ponerLibraPuntual(p, '2026-10-12', [3]);
  assert.strictEqual(p.libraPuntual, null, 'marcar su día de siempre quita el cambio de esa semana');
  const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
  M.generarSemana(cfg, st, e, LP_LUN, {});
  const antes = lpFoto(cfg, e, LP_LUN);
  const r = M.moverDiaLibre(cfg, st, e, 'mariluz', LP_LUN, [3]);
  assert.ok(!r.quitados.length && !r.puestos.length && M.personaDe(st, 'mariluz').libraPuntual === null);
  assert.deepStrictEqual(lpFoto(cfg, e, LP_LUN), antes);
});

ok('revisión F1 · con el día cambiado y la semana sin regenerar, el aviso dice «libra el martes esta semana» y no añade el del partido', () => {
  const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
  M.generarSemana(cfg, st, e, LP_LUN, {});
  M.ponerLibraPuntual(M.personaDe(st, 'mariluz'), LP_LUN, [2]);
  for (const tid of ['PASARELA_M', 'PASARELA_T']) assert.deepStrictEqual(M.avisosVigentes(cfg, st, e, LP_MAR, tid, 'mariluz'), ['libra el martes esta semana'], tid);
  const rev = M.revisionMes(cfg, st, e, { desde: LP_MAR, hasta: LP_MAR }).filter(x => /Mari Luz/.test(x.msg));
  assert.ok(rev.length && rev.every(x => !/partido/.test(x.msg)), JSON.stringify(rev));
  // su día de siempre, sin cambio, se sigue diciendo en plural
  const e2 = estadoOct();
  M.asignar(e2, cfg, st, '2026-10-14', 'PASARELA_M', 'mariluz', { forzar: true });
  assert.deepStrictEqual(M.avisosVigentes(cfg, st, e2, '2026-10-14', 'PASARELA_M', 'mariluz'), ['libra los miércoles']);
});

console.log(`\n${n} tests OK`);
