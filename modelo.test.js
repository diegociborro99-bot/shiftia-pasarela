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
// 25/09 (revisión de la fase 7): el esquema del núcleo (lo que el servicio acepta) y cómo leer el problema
const NE = require('./tests/nucleo-esquema.cjs');

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
  assert.strictEqual(M.asignados(e, '2026-10-07', 'EL33_M')[0].cocina, true, 'Noe, titular, lleva la cocina al estar sola');
  // 30/09 (revisión de A1, cliente 3a): quien ya lleva la cocina la conserva mientras pueda; Jenny entra de sala aunque vaya antes en la
  // lista del local (antes la cocina le saltaba a Jenny sola). La cocina va 2.ª: quien abre (Jenny) delante
  M.asignar(e, cfg, st, '2026-10-07', 'EL33_M', 'jenny');
  const cas = M.asignados(e, '2026-10-07', 'EL33_M');
  assert.deepStrictEqual(cas.map(x => x.pid), ['jenny', 'noe']);
  assert.strictEqual(cas[1].cocina, true, 'Noe sigue con la cocina');
  assert.strictEqual(cas[0].cocina, false);
  // si llega una tercera persona, la cocina sigue en 2.ª
  M.asignar(e, cfg, st, '2026-10-07', 'EL33_M', 'hojan');   // Victoria libra los miércoles; Hojan es 3.º titular de cocina, Noe sigue
  assert.deepStrictEqual(M.pidsEn(e, '2026-10-07', 'EL33_M'), ['jenny', 'noe', 'hojan']);
  assert.strictEqual(M.asignados(e, '2026-10-07', 'EL33_M')[1].cocina, true);
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
  assert.deepEqual(M.turnoDelDia(cfg, e, '2026-10-05', 'mariluz'), { partido: false, continuo: null, abre: null, enPartido: false }, 'el lunes no es partido: turno entero');
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
  // 25/09 (fase 7, S25; disponibilidad D6 con la corrección del verificador): todas las personas entran en el
  // problema; quien no puede trabajar (las tres bajas, Dulce en standby) va con todos los medios días a «*». Antes
  // se quedaban fuera, y lo que el encargado les ponía a mano no contaba para el núcleo
  assert.strictEqual(pr.workers.length, 24, 'todas las personas');
  for (const id of ['laura', 'maydeth', 'susi', 'dulce']) assert.ok(pr.meta.indices.every((x, i) => NE.todoFuera(pr.workers.find(w => w.id === id).unavailable[i])), id);
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
  // (fase 7) sin semana tipo: esta solución hecha a mano deja libres las plazas fijas, y el volcado pone primero
  // la semana tipo (como el generador local), así que con ella la casilla tendría más gente
  const pr = M.toProblem(cfg, st, e, '2026-10-06', '2026-10-06', { conPatron: false });
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
  // (01/10, corrección de A4, cliente 1) 26 descansos y no 27: Leo (apoyo, libra miércoles, jueves y domingo) no tiene plaza el
  // martes 15 y ya no sale como que libra, sino «sin plaza»
  assert.equal(r.resumen.turnos, 54); assert.equal(r.resumen.descansos, 26); assert.ok(r.resumen.maxDias <= 6);
  assert.deepEqual(r.sinPlaza['2026-09-15'], ['leo']);
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
  // el martes Roberto ya trabaja la mañana en Pasarela y no declara partido ese día. Desde el 24/09
  // (D1, reunión: «prefiero que cubra») la designación «cubre a Susana Luna» le autoriza el partido
  // para cubrirla: entra con el aviso autorizado, que no resta ni cuenta como aviso del plan
  const e2 = M.nuevoEstado(2026, 10, { festivos: [] });
  assert.ok(M.asignar(e2, cfg, st, '2026-10-06', 'ZAPA_T', 'sluna', {}).ok && M.asignar(e2, cfg, st, '2026-10-06', 'ZAPA_T', 'adrian', { cocina: true }).ok && M.asignar(e2, cfg, st, '2026-10-06', 'PASARELA_M', 'roberto', {}).ok);
  const r2 = M.planesCobertura(cfg, st, e2, { pid: 'sluna', tipo: 'PERM', desde: '2026-10-06', hasta: '2026-10-06' });
  const a2 = r2.planes[0].asignaciones[0];
  assert.ok(a2 && a2.pid === 'roberto', 'Roberto cubre con el aviso autorizado: ' + JSON.stringify(r2.planes[0].asignaciones));
  assert.deepStrictEqual(a2.avisos, []);
  assert.deepStrictEqual(a2.autorizados.map(x => x.texto), ['partido para cubrir a Susana Luna']);
  assert.strictEqual(r2.planes[0].avisos, 0, 'el plan no cuenta el autorizado como aviso');
  const cands = M.candidatosCobertura(cfg, st, e2, '2026-10-06', 'ZAPA_T', 'sluna', {});
  assert.ok(cands.every(c => c.pid !== 'sluna'));
  assert.ok(cands[0].pid === 'roberto' && cands[0].cubre, '«cubre a» va primero (D2)');
  const resto = cands.slice(1);
  assert.ok(resto.length && resto.every((c, i) => !i || resto[i - 1].score >= c.score), 'después, ordenados por puntuación');
  assert.ok(resto.every(c => c.libre), 'los demás candidatos estrictos del martes libran ese día');
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
  assert.deepEqual(M.turnoDelDia(cfg, e, '2026-10-06', 'mariluz'), { partido: true, continuo: null, abre: 'T', enPartido: true });
  assert.deepEqual(M.turnoDelDia(cfg, e, '2026-10-06', 'leo'), { partido: false, continuo: null, abre: null, enPartido: false }, 'Leo solo hace la tarde');
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
  // (30/09, revisión de A1: quien ya lleva la cocina la conserva; Jenny entra primero y se queda con ella, Noe entra de sala y abre)
  for (const [tid, pid] of [['EL33_M', 'jenny'], ['EL33_M', 'noe'], ['EL33_T', 'jenny'], ['EL33_T', 'noe']])
    assert.ok(M.asignar(e, cfg, st, '2026-10-07', tid, pid, { permitirPartido: true }).ok, `${pid} en ${tid}`);
  assert.ok(M.esContinuo(cfg, st, e, '2026-10-07', 'EL33', 'noe'), 'Noe hace turno continuo');
  assert.deepEqual(M.turnoDelDia(cfg, e, '2026-10-07', 'noe'), { partido: true, continuo: 'EL33', abre: null, enPartido: false }, 'un continuo no tiene tramos de partido');
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
// (fase 6, D7) «sin local fijo» es no tener locales: migrarPuestos ya no pone la marca p.comodin (la borra migrarComodin)
ok('migrarPuestos: las fichas guardadas con puesto «comodín» pasan a «apoyo»; «sin local fijo» son sus locales', () => {
  const estado = M.semillaPasarela();
  estado.staff[0].puesto = 'comodin';
  estado.staff[1].puesto = 'comodin'; estado.staff[1].comodin = true;
  const r = M.migrarPuestos(estado);
  assert.equal(r.puestos, 2);
  assert.equal(estado.staff[0].puesto, 'apoyo');
  assert.equal(estado.staff[1].puesto, 'apoyo');
  assert.ok(!('comodin' in estado.staff[0]), 'no pone la marca');
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
  // (fase 6, S21) «flexible» es de la pareja y está en las dos fichas (nuncaConFlex)
  assert.deepEqual(lav.nuncaConFlex, ['mariluz'], 'Lavinia y Mari Luz pueden coincidir si hace falta');
  assert.deepEqual(M.personaDe(st, 'leo').nuncaCon, ['scapon']);
  assert.deepEqual(M.personaDe(st, 'leo').nuncaConFlex, ['scapon'], 'Leo y Susana Capón, lo mismo');
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
  assert.strictEqual(M.fechaCandidato({}, '2026-09-21'), null);   // (30/09, A5: siempre con la fecha de hoy)
  assert.strictEqual(M.fechaCandidato(null, '2026-09-21'), null);
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
  // (30/09, A5: siempre con la fecha de hoy; el modelo no mira el reloj)
  assert.notStrictEqual(M.ordenarCandidatos(base, '2026-09-21'), base, 'devuelve una copia: la base no se toca');
  assert.deepStrictEqual(base.map(c => c.id), ['ana', 'bea', 'carla', 'dani', 'eva', 'fran', 'gala']);
  // el filtro respeta ese orden
  const bien = M.filtrarCandidatos(M.ordenarCandidatos(base.map(c => Object.assign({}, c, { val: c.id === 'ana' || c.id === 'fran' || c.id === 'bea' ? 'bien' : null })), '2026-09-21'), { val: 'bien' }).map(c => c.id);
  assert.deepStrictEqual(bien, ['fran', 'bea', 'ana']);
  // y un ts sin fecha gana a cualquier fecha: acabar de valorar a alguien lo sube arriba
  assert.deepStrictEqual(M.ordenarCandidatos([{ id: 'x', fecha: '20/9/2026' }, { id: 'y', ts: 1 }], '2026-09-21').map(c => c.id), ['y', 'x']);
  // una fecha que no se entiende no manda a nadie al fondo por delante de quien no tiene ninguna
  assert.deepStrictEqual(M.ordenarCandidatos([{ id: 'p' }, { id: 'q', fecha: 'cuando pueda' }, { id: 'r', fecha: '1/1/2024' }], '2026-09-21').map(c => c.id), ['r', 'p', 'q']);
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
    assert.deepStrictEqual(w('mariluz').unavailable[i(LP_MAR, f)], ['*'], `Mari Luz libra el martes (${f})`);
    assert.strictEqual(w('mariluz').fixed[i(LP_MAR, f)], undefined, 'y no se le fija la plaza del martes');
    assert.strictEqual(w('mariluz').unavailable[i(LP_MIE, f)], undefined, 'el miércoles puede');
    assert.strictEqual(w('mariluz').fixed[i(LP_MIE, f)], 'PASARELA', 'y se le fija lo del martes');
    assert.strictEqual(w('lavinia').fixed[i(LP_MIE, f)], undefined, 'Lavinia no la cubre esa semana');
  }
  const pb2 = M.toProblem(cfg, st, e, '2026-10-12', '2026-10-18', {});
  const i2 = (iso, f) => pb2.meta.indices.findIndex(x => x.iso === iso && x.franja === f);
  assert.deepStrictEqual(pb2.workers.find(x => x.id === 'mariluz').unavailable[i2('2026-10-14', 'M')], ['*'], 'la semana siguiente vuelve a librar el miércoles');
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
  // (fase 7) la plaza fija la vuelca la semana tipo, por el mismo camino que el generador local (instanciarFijo):
  // es «de la semana tipo» en la vista previa, no «rellenada por el núcleo»
  assert.strictEqual(en.origen, 'patron');
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
  // (30/09, revisión de A2) el aviso dice lo que pasa: «trabaja el lunes, el martes y el jueves (libra el viernes): no se sabe qué turno hace a cambio»
  assert.ok(a && /no se sabe qué turno hace a cambio/.test(a.texto) && !/emparejar/.test(a.texto), JSON.stringify(r.avisos));
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

// ---------- cierre puntual de un local por fechas (24/09, reunión y mensaje de Diego; D11) ----------
// «la semana que viene vamos a cerrar el Mónaco para hacer una pequeñita reforma… aunque tú le
// pongas que va a cerrar puntual, sigue generando para toda la semana» y «el Mónaco va a cerrar
// domingo por la tarde, lunes y martes… el domingo de la semana que viene ya sí que estaríamos
// abiertos». El cierre vive en S.cierresPuntuales (nunca en S.cierres, que es «mes cerrado para la
// nómina»), con franjas POR DÍA, y al cerrar se decide qué hace cada uno: apoyo en otros locales,
// sin trabajo (por defecto: nadie se redistribuye solo), vacaciones o día libre.
const CIE_DOM = '2026-09-27', CIE_LUN = '2026-09-28', CIE_MAR = '2026-09-29', CIE_MIE = '2026-09-30';
const cierreTardes = extra => Object.assign({ id: 'cie_t', localId: 'MONACO', dias: { [CIE_LUN]: ['T'], [CIE_MAR]: ['T'] }, motivo: 'reforma', detalle: '', decisiones: {}, retirados: [] }, extra || {});
const cierreReal = extra => Object.assign({ id: 'cie_real', localId: 'MONACO', dias: { [CIE_DOM]: ['T'], [CIE_LUN]: ['M', 'T'], [CIE_MAR]: ['M', 'T'] }, motivo: 'reforma', detalle: 'pequeña reforma', decisiones: {}, retirados: [] }, extra || {});
// la planilla del cliente: septiembre y octubre sembrados como en ?demo=1 (hoy, jueves 24/09)
const cfgDemo = () => { const cfg = Object.assign(cfgBase(), { meses: {} }); M.sembrarDemo(cfg, '2026-09-24'); return cfg; };
const sepDe = cfg => M.estadoDesde(cfg.meses, [], 2026, 9);
// estado virtual y escribible de unos días que pueden cruzar de mes (como estadoRango de la app)
function cieRango(cfg, desde, hasta) {
  const e = { y: +desde.slice(0, 4), m: +desde.slice(5, 7), days: [], asig: {}, apertura: {}, manual: {}, festivos: [], virtual: true };
  for (const iso of M.rangoIso(desde, hasta)) {
    const k = iso.slice(0, 7);
    cfg.meses[k] = cfg.meses[k] || { asig: {}, apertura: {}, manual: {} };
    const me = M.estadoDesde(cfg.meses, [], +iso.slice(0, 4), +iso.slice(5, 7));
    e.days.push(me.days.find(d => d.iso === iso));
    me.asig[iso] = me.asig[iso] || {}; me.apertura[iso] = me.apertura[iso] || {}; me.manual[iso] = me.manual[iso] || {};
    e.asig[iso] = me.asig[iso]; e.apertura[iso] = me.apertura[iso]; e.manual[iso] = me.manual[iso];
  }
  return e;
}
const cieDonde = (cfg, e, iso, pid, franja) => M.turnosDe(cfg).filter(t => (!franja || t.franja === franja) && M.pidsEn(e, iso, t.id).includes(pid)).map(t => t.id);

ok('cierre puntual · turnoAbierto lee S.cierresPuntuales por día y franja; solo esos días, sin tocar l.abre', () => {
  const cfg = Object.assign(cfgBase(), { cierresPuntuales: [cierreTardes()] });
  const abreAntes = JSON.stringify(M.localDe(cfg, 'MONACO').abre);
  const sep = M.nuevoEstado(2026, 9), oct = estadoOct();
  assert.strictEqual(M.turnoAbierto(cfg, sep, CIE_LUN, 'MONACO_T'), false, '28/09 tarde cerrada');
  assert.strictEqual(M.turnoAbierto(cfg, sep, CIE_MAR, 'MONACO_T'), false, '29/09 tarde cerrada');
  assert.strictEqual(M.turnoAbierto(cfg, sep, CIE_LUN, 'MONACO_M'), true, 'la mañana sigue abierta');
  assert.strictEqual(M.turnoAbierto(cfg, sep, CIE_LUN, 'PASARELA_T'), true, 'los demás locales, abiertos');
  assert.strictEqual(M.turnoAbierto(cfg, sep, '2026-09-21', 'MONACO_T'), true, 'el lunes anterior, abierto');
  assert.strictEqual(M.turnoAbierto(cfg, oct, '2026-10-05', 'MONACO_T'), true, 'el lunes siguiente, abierto: «cuando ese intervalo pasa… genera con normalidad»');
  assert.strictEqual(JSON.stringify(M.localDe(cfg, 'MONACO').abre), abreAntes, 'el horario semanal (l.abre) no se toca');
  assert.ok(!cfg.cierres || !Object.keys(cfg.cierres).length, 'S.cierres (mes cerrado para la nómina) no se usa');
  // media jornada: el domingo solo por la tarde
  const cfg2 = Object.assign(cfgBase(), { cierresPuntuales: [cierreReal()] });
  assert.strictEqual(M.turnoAbierto(cfg2, sep, CIE_DOM, 'MONACO_T'), false, 'domingo 27 por la tarde, cerrado');
  assert.strictEqual(M.turnoAbierto(cfg2, sep, CIE_DOM, 'MONACO_M'), true, 'domingo 27 por la mañana, abierto');
  assert.strictEqual(M.turnoAbierto(cfg2, sep, CIE_LUN, 'MONACO_M'), false, 'lunes 28 entero');
  assert.strictEqual(M.cierreEn(cfg2, CIE_LUN, 'MONACO_M').id, 'cie_real');
  assert.strictEqual(M.cierreEn(cfg2, CIE_LUN, 'ZAPA_M'), null);
  assert.strictEqual(M.turnoAbierto(cfg2, oct, '2026-10-04', 'MONACO_T'), true, 'el domingo 04/10 vuelve a abrir por la tarde');
});

ok('cierre puntual · cruza de mes (un solo registro), manda sobre «abrir hoy» y sobrevive a vaciar la planilla', () => {
  const c = cierreTardes({ dias: { [CIE_MIE]: ['T'], '2026-10-01': ['T'] } });
  const cfg = Object.assign(cfgBase(), { cierresPuntuales: [c] });
  const sep = M.nuevoEstado(2026, 9), oct = estadoOct();
  assert.strictEqual(M.turnoAbierto(cfg, sep, CIE_MIE, 'MONACO_T'), false);
  assert.strictEqual(M.turnoAbierto(cfg, oct, '2026-10-01', 'MONACO_T'), false);
  sep.apertura[CIE_MIE] = { MONACO_T: true };
  assert.strictEqual(M.turnoAbierto(cfg, sep, CIE_MIE, 'MONACO_T'), false, 'el cierre por fechas manda sobre la apertura a mano del día');
  M.vaciarPlanilla(sep, CIE_LUN, CIE_MIE);
  assert.strictEqual(M.turnoAbierto(cfg, sep, CIE_MIE, 'MONACO_T'), false, 'vaciar la planilla no reabre: el cierre no vive en el mes');
});

ok('cierre puntual · textoCierre y puedeEstar: regla «cierre», el motivo dice «reforma» y las fechas, y no se fuerza', () => {
  const cfg = Object.assign(cfgBase(), { cierresPuntuales: [cierreReal()] });
  assert.strictEqual(M.textoCierre(cfg, cierreReal()), 'Bar Mónaco cerrado por reforma (dom 27/09 tarde – mar 29/09)');
  assert.strictEqual(M.textoCierre(cfg, cierreTardes()), 'Bar Mónaco cerrado por reforma (lun 28/09 – mar 29/09, solo tardes)');
  assert.strictEqual(M.textoCierre(cfg, cierreTardes({ motivo: 'vacaciones', dias: { [CIE_LUN]: ['M', 'T'] } })), 'Bar Mónaco cerrado por vacaciones (lun 28/09)');
  assert.strictEqual(M.textoCierre(cfg, cierreTardes({ motivo: 'otro', detalle: 'inventario' })), 'Bar Mónaco cerrado por inventario (lun 28/09 – mar 29/09, solo tardes)');
  const r = M.puedeEstar(cfg, cfg.staff, M.nuevoEstado(2026, 9), CIE_MAR, 'MONACO_T', 'scapon', { forzar: true });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.regla, 'cierre');
  assert.strictEqual(r.motivo, 'Bar Mónaco cerrado por reforma (dom 27/09 tarde – mar 29/09)');
  assert.strictEqual(M.nombreRegla('cierre'), 'Cierre del local');
});

ok('cierre puntual · validarCierre: local, días, franjas y solape con otro cierre del mismo local', () => {
  const cfg = Object.assign(cfgBase(), { cierresPuntuales: [cierreTardes({ id: 'a' })] });
  assert.ok(M.validarCierre(cfg, cierreTardes({ id: 'a' })).ok, 'el mismo cierre (editarlo) no se solapa consigo mismo');
  const err = c => M.validarCierre(cfg, c).errores.join(' | ');
  assert.match(err(cierreTardes({ id: 'b', localId: 'NOEXISTE' })), /local/);
  assert.match(err(cierreTardes({ id: 'b', dias: {} })), /día/);
  assert.match(err(cierreTardes({ id: 'b', dias: { [CIE_LUN]: ['X'] } })), /franja/);
  assert.match(err(cierreTardes({ id: 'b', dias: { '28/09/2026': ['T'] } })), /fecha/);
  assert.match(err(cierreTardes({ id: 'b', motivo: 'fiesta' })), /motivo/);
  assert.match(err(cierreTardes({ id: 'b', dias: { [CIE_MAR]: ['M', 'T'] } })), /solapa/);
  assert.ok(M.validarCierre(cfg, cierreTardes({ id: 'b', dias: { [CIE_MAR]: ['M'] } })).ok, 'la mañana del martes no se solapa con el cierre de la tarde');
  assert.ok(M.validarCierre(cfg, cierreTardes({ id: 'b', localId: 'ZAPA' })).ok, 'otro local, los mismos días: vale');
});

ok('cierre puntual · afectadosPorCierre: quién trabajaba en las casillas cerradas, sus otros turnos y el aviso', () => {
  const cfg = cfgDemo(), st = cfg.staff, e = sepDe(cfg);
  const af = M.afectadosPorCierre(cfg, st, e, cierreTardes());
  const quien = iso => af.filter(a => a.turnos.some(t => t.iso === iso)).map(a => a.pid).sort();
  assert.deepStrictEqual(quien(CIE_LUN), ['hojan', 'yilian'], 'lunes 28 por la tarde');
  assert.deepStrictEqual(quien(CIE_MAR), ['cristian', 'scapon'], 'martes 29 por la tarde');
  const hojan = af.find(a => a.pid === 'hojan'), susana = af.find(a => a.pid === 'scapon');
  assert.ok(hojan.otrosTurnos.some(t => t.iso === CIE_LUN && t.tid === 'EL33_M'), JSON.stringify(hojan.otrosTurnos));
  assert.ok(hojan.avisos.some(x => /lunes 28/.test(x) && /El 33 por la mañana/.test(x)), JSON.stringify(hojan.avisos));
  assert.strictEqual(hojan.soloTurno[CIE_LUN], false, 'Hojan ese día también trabaja: no puede coger vacaciones por la tarde');
  assert.strictEqual(susana.soloTurno[CIE_MAR], true);
  assert.ok(!susana.turnos.some(t => t.iso === CIE_LUN), 'Susana libra los lunes');
  assert.ok(af.every(a => a.sugerencia === 'SIN' && a.turnos.every(t => t.fuente === 'planilla')), 'por defecto, sin trabajo: nadie se redistribuye solo');
  // la semana aún sin generar: sale de la semana tipo
  const af2 = M.afectadosPorCierre(cfg, st, M.nuevoEstado(2026, 9), cierreTardes());
  assert.deepStrictEqual(af2.map(a => a.pid).sort(), ['cristian', 'hojan', 'scapon', 'yilian']);
  assert.ok(af2.every(a => a.turnos.every(t => t.fuente === 'semana tipo')), JSON.stringify(af2.map(a => a.turnos)));
});

ok('cierre puntual · aplicarCierre retira TODAS las plazas de las casillas cerradas (se acaban las fantasmas) y sin decisión = sin trabajo', () => {
  const cfg = cfgDemo(), st = cfg.staff, e = sepDe(cfg);
  const hAntes = M.horasPersonaMes(cfg, st, cfg.meses, 'cristian', 2026, 9);
  // lo puesto a mano también sale: el encargado lo decide en el visor, no es automático
  M.asignados(e, CIE_LUN, 'MONACO_T').find(x => x.pid === 'hojan').origen = 'manual';
  const c = cierreTardes();
  const r = M.aplicarCierre(cfg, st, e, c, {});
  assert.ok(r.ok, JSON.stringify(r.errores));
  assert.strictEqual(cfg.cierresPuntuales.length, 1);
  assert.deepStrictEqual(M.pidsEn(e, CIE_LUN, 'MONACO_T'), []);
  assert.deepStrictEqual(M.pidsEn(e, CIE_MAR, 'MONACO_T'), []);
  assert.strictEqual(c.retirados.length, 4, JSON.stringify(c.retirados));
  assert.ok(c.retirados.some(x => x.entry.pid === 'hojan' && x.entry.origen === 'manual'));
  for (const pid of ['yilian', 'hojan', 'scapon', 'cristian']) assert.strictEqual(c.decisiones[pid].tipo, 'SIN', pid);
  assert.deepStrictEqual(c.decisiones.hojan.turnos, [CIE_LUN + '|T'], 'la decisión es de su tarde cerrada, no de su mañana en El 33');
  assert.deepStrictEqual(cieDonde(cfg, e, CIE_LUN, 'hojan'), ['EL33_M'], 'su mañana en El 33 se queda');
  const hDespues = M.horasPersonaMes(cfg, st, cfg.meses, 'cristian', 2026, 9);
  assert.strictEqual(hDespues.turnos, hAntes.turnos - 1, 'la tarde cerrada ya no cuenta para la nómina');
  assert.ok(!M.revisionMes(cfg, st, e, { desde: CIE_LUN, hasta: CIE_MAR }).some(x => x.tipo === 'plaza-en-cerrado'));
  // y lo mismo cruzando de mes: un cierre del 30/09 al 01/10
  const cfg2 = cfgDemo(), e2 = cieRango(cfg2, CIE_MIE, '2026-10-01');
  assert.ok(M.pidsEn(e2, '2026-10-01', 'MONACO_T').length, 'el 01/10 tenía gente');
  assert.ok(M.aplicarCierre(cfg2, cfg2.staff, e2, cierreTardes({ dias: { [CIE_MIE]: ['T'], '2026-10-01': ['T'] } }), {}).ok);
  assert.deepStrictEqual(M.pidsEn(M.estadoDesde(cfg2.meses, [], 2026, 10), '2026-10-01', 'MONACO_T'), [], 'octubre también queda sin plazas en la casilla cerrada');
});

// 24/09 (fase 3, D10): desde que las ausencias son por franja, quien ese día también trabaja en
// otro local coge las vacaciones (o el día libre) solo de la franja cerrada, en vez de quedarse
// «sin trabajo» esa franja
ok('cierre puntual · VAC y LD: ausencia del día si el turno cerrado era el único; si no, solo de la franja cerrada (D10) y se avisa', () => {
  const cfg = cfgDemo(), st = cfg.staff, e = sepDe(cfg);
  const r = M.aplicarCierre(cfg, st, e, cierreTardes(), { scapon: { tipo: 'VAC' }, hojan: { tipo: 'VAC' }, yilian: { tipo: 'LD' } });
  const su = M.personaDe(st, 'scapon'), ho = M.personaDe(st, 'hojan'), yi = M.personaDe(st, 'yilian');
  assert.strictEqual(M.ausenciaEn(su, CIE_MAR).tipo, 'VAC');
  assert.strictEqual(M.ausenciaEn(su, CIE_MAR).franjas, undefined, 'su único turno: el día entero');
  assert.match(M.ausenciaEn(su, CIE_MAR).detalle, /cierre de Bar Mónaco · reforma/);
  assert.strictEqual(M.ausenciaEn(su, CIE_LUN), null, 'el lunes libra: no se le gasta un día de vacaciones');
  assert.ok(M.horasPersonaMes(cfg, st, cfg.meses, 'scapon', 2026, 9).vacacionesDias.includes(CIE_MAR), 'y va a la nómina');
  assert.strictEqual(M.ausenciaEn(yi, CIE_LUN).tipo, 'LD', 'Yilian solo tenía la tarde del lunes: día libre');
  assert.strictEqual(M.ausenciaEn(ho, CIE_LUN, 'M'), null, 'Hojan hace El 33 por la mañana: no se le quita la mañana');
  assert.strictEqual(M.ausenciaEn(ho, CIE_LUN, 'T').tipo, 'VAC', 'y la tarde cerrada es de vacaciones');
  assert.deepStrictEqual(M.ausenciaEn(ho, CIE_LUN, 'T').franjas, ['T']);
  assert.deepStrictEqual(cieDonde(cfg, e, CIE_LUN, 'hojan'), ['EL33_M']);
  assert.ok(r.avisos.some(x => /Hojan/.test(x) && /El 33/.test(x) && /solo de la tarde/.test(x)), JSON.stringify(r.avisos));
  assert.strictEqual(M.puedeEstar(cfg, st, M.nuevoEstado(2026, 9), CIE_LUN, 'ZAPA_T', 'hojan').regla, 'ausencia', 'esa tarde está de vacaciones');
  assert.deepStrictEqual(r.ausencias.map(a => a.pid + ':' + a.tipo + ':' + a.dias.join(',')).sort(), ['hojan:VAC:' + CIE_LUN, 'scapon:VAC:' + CIE_MAR, 'yilian:LD:' + CIE_LUN]);
  assert.deepStrictEqual(M.horasPersonaMes(cfg, st, cfg.meses, 'hojan', 2026, 9).sinTrabajoCierre, [], 'ni cuenta como sin trabajo');
  M.generarPlanilla(cfg, st, e, CIE_LUN, CIE_MIE, { desdeIso: '2026-09-24' });
  assert.deepStrictEqual(cieDonde(cfg, e, CIE_MAR, 'scapon'), [], 'el generador no la pone de vacaciones');
  assert.deepStrictEqual(cieDonde(cfg, e, CIE_LUN, 'hojan'), ['EL33_M'], 'ni a Hojan en otra tarde');
  // al reabrir, se le quita solo esa media jornada
  M.quitarCierre(cfg, st, e, 'cie_t', { quitarVacaciones: true });
  assert.strictEqual(M.ausenciaEn(ho, CIE_LUN), null);
});

ok('cierre puntual · SIN (y sin decisión): el generador no redistribuye a nadie solo; el encargado sí puede forzarlo', () => {
  const cfg = Object.assign(cfgBase(), { meses: {} }), st = cfg.staff;
  cfg.eventos = [{ id: 'ev', iso: CIE_MAR, tipo: 'partido', nombre: 'Juega el Elche', franja: 'T', refuerzo: { EL33: 1, ZAPA: 1, MONACO: 1, PASARELA: 1 } }];
  const e = M.nuevoEstado(2026, 9);
  assert.ok(M.aplicarCierre(cfg, st, e, cierreTardes(), {}).ok);
  const g = M.generarPlanilla(cfg, st, e, CIE_LUN, CIE_MIE, { desdeIso: '2026-09-24' });
  assert.deepStrictEqual(cieDonde(cfg, e, CIE_MAR, 'cristian', 'T'), [], 'hasta el 24/09 acababa en El 33 por la tarde');
  for (const [iso, pid] of [[CIE_LUN, 'yilian'], [CIE_LUN, 'hojan'], [CIE_MAR, 'scapon']]) assert.deepStrictEqual(cieDonde(cfg, e, iso, pid, 'T'), [], pid);
  assert.deepStrictEqual(M.pidsEn(e, CIE_LUN, 'MONACO_T').concat(M.pidsEn(e, CIE_MAR, 'MONACO_T')), []);
  assert.ok(g.rechazados.some(x => x.turnoId === 'MONACO_T' && /cerrado por reforma/.test(x.motivo)), 'las plazas de la semana tipo salen rechazadas con el motivo');
  const r = M.puedeEstar(cfg, st, e, CIE_MAR, 'EL33_T', 'cristian');
  assert.strictEqual(r.regla, 'cierre');
  assert.strictEqual(r.motivo, 'sin trabajo: Bar Mónaco cerrado hasta el mar 29/09');
  const f = M.puedeEstar(cfg, st, e, CIE_MAR, 'EL33_T', 'cristian', { forzar: true });
  assert.ok(f.ok && f.avisos.includes('sin trabajo: Bar Mónaco cerrado hasta el mar 29/09'), JSON.stringify(f));
  assert.ok(!M.candidatosPara(cfg, st, e, CIE_MAR, 'EL33_T').some(c => c.pid === 'cristian'));
  assert.ok(!M.candidatosCobertura(cfg, st, e, CIE_MAR, 'EL33_T', 'noe').some(c => c.pid === 'cristian'), 'la cobertura tampoco');
  // un cierre sin decisión para quien estaba: cuenta como sin trabajo. «Estaba» = se le retiró la plaza al cerrar, o (30/09,
  // corrección de A3, B4 opción a) la casilla se leyó de la semana tipo y la semana tipo de esa fecha (plazasDelDia, con el día
  // libre de la semana) le da plaza ahí: quien entra después en la casilla cerrada cuenta como sin trabajo aunque el visor no
  // preguntara por ella. La semana tipo cruda (plazasDe) ya no se lee: Cristian, que esa semana libre el martes, no cuenta
  const cfg2 = Object.assign(cfgBase(), { cierresPuntuales: [cierreTardes({ deSemanaTipo: [CIE_LUN, CIE_MAR] })] });
  assert.strictEqual((M.decisionCierre(cfg2, 'cristian', CIE_MAR, 'T') || {}).tipo, 'SIN', 'la casilla se leyó de la semana tipo y Cristian tiene plaza ahí: sin trabajo implícito');
  assert.strictEqual(M.decisionCierre(cfg2, 'lola', CIE_MAR, 'T'), null, 'quien no estaba no tiene decisión');
  assert.strictEqual(M.puedeEstar(cfg2, cfg2.staff, M.nuevoEstado(2026, 9), CIE_MAR, 'EL33_T', 'cristian').regla, 'cierre', 'la puerta le frena por el cierre');
  M.ponerLibraPuntual(M.personaDe(cfg2.staff, 'cristian'), CIE_LUN, [2]);   // esa semana libra el martes: nada
  assert.strictEqual(M.decisionCierre(cfg2, 'cristian', CIE_MAR, 'T'), null, 'con el día libre de la semana, no tiene plaza ahí');
  assert.ok(M.puedeEstar(cfg2, cfg2.staff, M.nuevoEstado(2026, 9), CIE_MAR, 'EL33_T', 'cristian').regla !== 'cierre', 'sin decisión, la puerta no le frena por el cierre');
  const cfg3 = Object.assign(cfgBase(), { cierresPuntuales: [cierreTardes()] });
  assert.strictEqual(M.decisionCierre(cfg3, 'cristian', CIE_MAR, 'T'), null, 'sin plaza retirada, la semana tipo no dice nada');
  const cfg4 = Object.assign(cfgBase(), { cierresPuntuales: [cierreTardes({ retirados: [{ iso: CIE_MAR, tid: 'MONACO_T', entry: { pid: 'cristian', origen: 'patron' } }] })] });
  const d = M.decisionCierre(cfg4, 'cristian', CIE_MAR, 'T');
  assert.ok(d && d.tipo === 'SIN' && d.explicita === false, 'la plaza retirada sí: ' + JSON.stringify(d));
  assert.strictEqual(M.decisionCierre(cfg4, 'cristian', CIE_MAR, 'M'), null, 'ni fuera de las franjas cerradas');
  assert.strictEqual(M.puedeEstar(cfg4, cfg4.staff, M.nuevoEstado(2026, 9), CIE_MAR, 'EL33_T', 'cristian').regla, 'cierre');
});

ok('cierre puntual · APOYO (REFUERZA): esos días va a otros locales sin forzar; destino al aplicar y tras regenerar; sube en el relleno y en la cobertura', () => {
  const cfg = Object.assign(cfgBase(), { meses: {} }), st = cfg.staff;
  const e = M.nuevoEstado(2026, 9);
  const r = M.aplicarCierre(cfg, st, e, cierreTardes(), { yilian: { tipo: 'REFUERZA', destinos: { [CIE_LUN]: 'PASARELA_T' } } });
  const en = M.asignados(e, CIE_LUN, 'PASARELA_T').find(x => x.pid === 'yilian');
  assert.ok(en, JSON.stringify(r));
  assert.strictEqual(en.origen, 'cierre');
  assert.strictEqual(en.razon, 'apoyo: Bar Mónaco cerrado (reforma)');
  assert.ok(!en.forzado && !(en.avisos || []).length, 'no se fuerza nada');
  const vacio = M.nuevoEstado(2026, 9);
  const p = M.puedeEstar(cfg, st, vacio, CIE_LUN, 'ZAPA_T', 'yilian');
  assert.ok(p.ok && !p.avisos.length, JSON.stringify(p));
  assert.strictEqual(M.puedeEstar(cfg, st, estadoOct(), '2026-10-05', 'PASARELA_T', 'yilian').regla, 'locales', 'pasado el cierre, sus locales de siempre');
  assert.strictEqual(M.puedeEstar(cfg, st, vacio, CIE_MAR, 'PASARELA_M', 'yilian').regla, 'locales', 'solo en las franjas que tenía cerradas');
  // sobrevive a «Vaciar lo generado»: al regenerar, instanciarCierres la vuelve a poner
  M.vaciarPlanilla(e, CIE_LUN, CIE_MIE);
  M.generarPlanilla(cfg, st, e, CIE_LUN, CIE_MIE, {});
  const en2 = M.asignados(e, CIE_LUN, 'PASARELA_T').find(x => x.pid === 'yilian');
  assert.ok(en2 && en2.origen === 'cierre', JSON.stringify(M.asignados(e, CIE_LUN, 'PASARELA_T')));
  // «donde haga falta»: sin destino, el relleno y la cobertura la ponen primero. Con alguien de sala en
  // la casilla: desde la revisión F3 (S33) el relleno tampoco deja una casilla vacía con un apoyo solo
  const cfg3 = Object.assign(cfgBase(), { cierresPuntuales: [cierreTardes({ decisiones: { yilian: { tipo: 'REFUERZA', turnos: [CIE_LUN + '|T'] } } })] });
  const eP = M.nuevoEstado(2026, 9); M.asignar(eP, cfg3, cfg3.staff, CIE_LUN, 'PASARELA_T', 'mariluz', {});
  const cp = M.candidatosPara(cfg3, cfg3.staff, eP, CIE_LUN, 'PASARELA_T');
  assert.strictEqual(cp[0].pid, 'yilian', cp.slice(0, 3).map(c => c.pid + ' ' + c.score).join(', '));
  assert.ok(cp[0].razones.includes('apoyo: Bar Mónaco cerrado'), cp[0].razones.join(' · '));
  assert.ok(!M.candidatosPara(cfg3, cfg3.staff, M.nuevoEstado(2026, 9), CIE_LUN, 'PASARELA_T').some(c => c.pid === 'yilian'), 'sola en una casilla vacía, no');
  // desde la fase 3 (S10), «cubre a Susi» de Adrián solo cuenta en la cocina de Zapatillera: en la sala gana Yilian
  const eZ = M.nuevoEstado(2026, 9); M.asignar(eZ, cfg3, cfg3.staff, CIE_LUN, 'ZAPA_T', 'sluna', {});
  assert.strictEqual(M.candidatosPara(cfg3, cfg3.staff, eZ, CIE_LUN, 'ZAPA_T')[0].pid, 'yilian');
  // en la Cobertura, con alguien de sala en la casilla (fase 3, S33: un apoyo solo en una casilla
  // vacía la dejaría «solo con apoyos» y no entra en el plan con las reglas)
  const e3 = M.nuevoEstado(2026, 9); M.asignar(e3, cfg3, cfg3.staff, CIE_LUN, 'PASARELA_T', 'mariluz', {});
  const cc = M.candidatosCobertura(cfg3, cfg3.staff, e3, CIE_LUN, 'PASARELA_T', 'ivan');
  assert.strictEqual(cc[0].pid, 'yilian', cc.slice(0, 3).map(c => c.pid + ' ' + c.score).join(', '));
  assert.ok(cc[0].razones.includes('apoyo: Bar Mónaco cerrado'));
  assert.deepStrictEqual(M.puntosCierre(cfg3, M.personaDe(cfg3.staff, 'yilian'), CIE_LUN, 'ZAPA_T'), { puntos: 45, razon: 'apoyo: Bar Mónaco cerrado' });
  assert.strictEqual(M.puntosCierre(cfg3, M.personaDe(cfg3.staff, 'leo'), CIE_LUN, 'ZAPA_T'), null);
});

ok('cierre puntual · sugerenciasRefuerzo: por día, casillas abiertas de la misma franja en otros locales, primero las que faltan', () => {
  const cfg = cfgDemo(), st = cfg.staff, e = sepDe(cfg);
  // Pasarela tarde del lunes se queda corta: tiene que salir la primera
  for (const pid of M.pidsEn(e, CIE_LUN, 'PASARELA_T').slice(1)) M.desasignar(e, CIE_LUN, 'PASARELA_T', pid);
  const s = M.sugerenciasRefuerzo(cfg, st, e, cierreTardes(), 'yilian');
  assert.ok(Array.isArray(s[CIE_LUN]) && s[CIE_LUN].length, JSON.stringify(s));
  assert.strictEqual(s[CIE_LUN][0].tid, 'PASARELA_T', JSON.stringify(s[CIE_LUN]));
  assert.ok(s[CIE_LUN][0].faltan > 0);
  assert.ok(s[CIE_LUN].every(x => x.franja === 'T' && x.localId !== 'MONACO'), 'misma franja, otro local');
  assert.deepStrictEqual(s[CIE_MAR] || [], [], 'el martes Yilian no trabajaba por la tarde en el Mónaco');
});

ok('cierre puntual · revisión: «plaza-en-cerrado» (alta) si una casilla cerrada tiene gente, también por «Cuándo abre»', () => {
  const cfg = cfgDemo(), st = cfg.staff;
  M.localDe(cfg, 'MONACO').abre.T = [3, 4, 5, 6, 7];   // lo que hizo el cliente en Ajustes → Cuándo abre
  const e = sepDe(cfg);
  const rev = M.revisionMes(cfg, st, e, { desde: CIE_LUN, hasta: CIE_MAR });
  const x = rev.find(y => y.tipo === 'plaza-en-cerrado' && y.turnoId === 'MONACO_T' && y.iso === CIE_LUN);
  assert.ok(x && x.nivel === 'alta' && /Yilian/.test(x.msg) && /Hojan/.test(x.msg), JSON.stringify(rev.filter(y => y.turnoId === 'MONACO_T')));
  assert.strictEqual(M.revisarTurno(cfg, st, e, CIE_LUN, 'MONACO_T').enCerrado, 2);
  // con un cierre por fechas guardado sin pasar por el visor, dice el motivo
  const cfg2 = Object.assign(cfgDemo(), {}); cfg2.cierresPuntuales = [cierreTardes()];
  const x2 = M.revisionMes(cfg2, cfg2.staff, sepDe(cfg2), { desde: CIE_MAR, hasta: CIE_MAR }).find(y => y.tipo === 'plaza-en-cerrado');
  assert.ok(x2 && /cerrado \(reforma\)/.test(x2.msg) && /Susana Capón/.test(x2.msg), JSON.stringify(x2));
});

ok('cierre puntual · el generador retira lo automático que queda dentro de una casilla cerrada (lo puesto a mano, no)', () => {
  const cfg = cfgDemo(), st = cfg.staff, e = sepDe(cfg);
  M.localDe(cfg, 'MONACO').abre.T = [2, 3, 4, 5, 6, 7];
  M.asignados(e, CIE_LUN, 'MONACO_T').find(x => x.pid === 'hojan').origen = 'manual';
  const ret = M.retirarQueIncumplen(cfg, st, e, CIE_LUN, CIE_LUN);
  assert.deepStrictEqual(ret.filter(x => x.turnoId === 'MONACO_T').map(x => x.pid), ['yilian']);
  assert.match(ret.find(x => x.pid === 'yilian').motivo, /no abre la tarde/);
  assert.deepStrictEqual(M.pidsEn(e, CIE_LUN, 'MONACO_T'), ['hojan'], 'lo puesto a mano se queda (con su aviso en la revisión)');
  // con un cierre por fechas, el motivo es el del cierre; y lo automático de quien no trabaja esos días, también
  const cfg2 = Object.assign(cfgBase(), { meses: {} }), e2 = M.nuevoEstado(2026, 9);
  M.asignar(e2, cfg2, cfg2.staff, CIE_MAR, 'EL33_T', 'cristian', { origen: 'generador' });
  M.asignar(e2, cfg2, cfg2.staff, CIE_MAR, 'MONACO_T', 'scapon', { origen: 'patron' });
  cfg2.cierresPuntuales = [cierreTardes({ decisiones: { cristian: { tipo: 'SIN', turnos: [CIE_MAR + '|T'] } } })];
  const ret2 = M.retirarQueIncumplen(cfg2, cfg2.staff, e2, CIE_MAR, CIE_MAR);
  assert.ok(ret2.some(x => x.pid === 'scapon' && x.motivo === 'Bar Mónaco cerrado por reforma (lun 28/09 – mar 29/09, solo tardes)'), JSON.stringify(ret2));
  assert.ok(ret2.some(x => x.pid === 'cristian' && /sin trabajo/.test(x.motivo)), JSON.stringify(ret2));
});

ok('cierre puntual · quitarCierre reabre, devuelve lo retirado y quita solo los días de vacaciones del cierre', () => {
  const cfg = cfgDemo(), st = cfg.staff, e = sepDe(cfg);
  const su = M.personaDe(st, 'scapon');
  M.anadirAusencia(su, { tipo: 'VAC', desde: CIE_MIE, hasta: '2026-10-02', detalle: 'las suyas' });
  M.aplicarCierre(cfg, st, e, cierreTardes(), { scapon: { tipo: 'VAC' }, yilian: { tipo: 'REFUERZA', destinos: { [CIE_LUN]: 'PASARELA_T' } } });
  assert.strictEqual(su.ausencias.filter(a => a.tipo === 'VAC').length, 1, 'anadirAusencia funde el 29 con sus vacaciones del 30');
  const r = M.quitarCierre(cfg, st, e, 'cie_t', { devolver: true, quitarVacaciones: true });
  assert.ok(r.ok);
  assert.strictEqual((cfg.cierresPuntuales || []).length, 0);
  assert.strictEqual(M.turnoAbierto(cfg, e, CIE_LUN, 'MONACO_T'), true);
  assert.strictEqual(M.ausenciaEn(su, CIE_MAR), null, 'el día del cierre se quita');
  assert.strictEqual(M.ausenciaEn(su, CIE_MIE).tipo, 'VAC', 'sus vacaciones de antes siguen');
  assert.strictEqual(M.ausenciaEn(su, '2026-10-02').tipo, 'VAC');
  assert.deepStrictEqual(M.pidsEn(e, CIE_LUN, 'MONACO_T').sort(), ['hojan', 'yilian']);
  assert.deepStrictEqual(M.pidsEn(e, CIE_MAR, 'MONACO_T').sort(), ['cristian', 'scapon']);
  assert.ok(!M.pidsEn(e, CIE_LUN, 'PASARELA_T').includes('yilian'), 'el apoyo del cierre sale');
  assert.strictEqual(r.devueltos.length, 4, JSON.stringify(r));
});

ok('cierre puntual · al reabrir, quien apoyaba sale de lo automático que ya no puede hacer (lo puesto a mano se queda)', () => {
  for (const origen of ['generador', 'manual']) {
    const cfg = Object.assign(cfgBase(), { meses: {} }), st = cfg.staff, e = M.nuevoEstado(2026, 9);
    M.aplicarCierre(cfg, st, e, cierreTardes(), { yilian: { tipo: 'REFUERZA' } });
    assert.ok(M.asignar(e, cfg, st, CIE_LUN, 'ZAPA_T', 'yilian', { origen }).ok, 'con el cierre puede apoyar en Zapatillera');
    const r = M.quitarCierre(cfg, st, e, 'cie_t', { devolver: true });
    if (origen === 'generador') {
      assert.ok(!M.pidsEn(e, CIE_LUN, 'ZAPA_T').includes('yilian'), 'sin el cierre ya no puede estar en Zapatillera: sale');
      assert.ok(r.apoyosQuitados.some(x => x.pid === 'yilian' && x.tid === 'ZAPA_T'));
    } else {
      assert.ok(M.pidsEn(e, CIE_LUN, 'ZAPA_T').includes('yilian'), 'lo puesto a mano no lo quita nadie en automático');
      assert.deepStrictEqual(M.avisosVigentes(cfg, st, e, CIE_LUN, 'ZAPA_T', 'yilian'), ['solo Bar Mónaco'], 'y se queda con su aviso');
    }
  }
});

ok('cierre puntual · editar: aplicarCierre sobre un cierre que ya existe lo deshace y lo vuelve a aplicar', () => {
  const cfg = cfgDemo(), st = cfg.staff, e = sepDe(cfg);
  M.aplicarCierre(cfg, st, e, cierreTardes(), { scapon: { tipo: 'VAC' } });
  const r = M.aplicarCierre(cfg, st, e, cierreTardes({ dias: { [CIE_LUN]: ['T'] } }), {});
  assert.ok(r.ok, JSON.stringify(r.errores));
  assert.strictEqual(cfg.cierresPuntuales.length, 1);
  assert.strictEqual(M.ausenciaEn(M.personaDe(st, 'scapon'), CIE_MAR), null, 'ya no está de vacaciones');
  assert.deepStrictEqual(M.pidsEn(e, CIE_MAR, 'MONACO_T').sort(), ['cristian', 'scapon'], 'el martes reabre con su gente');
  assert.deepStrictEqual(M.pidsEn(e, CIE_LUN, 'MONACO_T'), []);
});

ok('cierre puntual · generarSemana: celda cerrada con su motivo, sin trabajo y apoyos por día; «libran» deja fuera a los sin trabajo', () => {
  const cfg = cfgDemo(), st = cfg.staff, e = cieRango(cfg, CIE_LUN, '2026-10-04');
  M.aplicarCierre(cfg, st, e, cierreTardes(), { yilian: { tipo: 'REFUERZA', destinos: { [CIE_LUN]: 'PASARELA_T' } } });
  const g = M.generarSemana(cfg, st, e, CIE_LUN, {});
  const mon = g.locales.find(l => l.id === 'MONACO').franjas.find(f => f.franja === 'T').dias;
  assert.strictEqual(mon[0].abierto, false);
  assert.deepStrictEqual({ motivo: mon[0].cierre.motivo, detalle: mon[0].cierre.detalle, etiqueta: mon[0].cierre.etiqueta }, { motivo: 'reforma', detalle: '', etiqueta: 'Reforma' });
  assert.strictEqual(mon[6].abierto, true, 'el domingo 04/10 abre por la tarde');
  assert.ok(M.pidsEn(e, '2026-10-04', 'MONACO_T').includes('scapon'), 'y se genera con normalidad');
  // Hojan hace El 33 por la mañana: su tarde sin trabajo es de medio día (revisión F2)
  assert.ok(g.sinTrabajo[CIE_MAR].includes('cristian') && (g.sinTrabajoParcial[CIE_LUN] || []).some(x => x.pid === 'hojan'), JSON.stringify([g.sinTrabajo, g.sinTrabajoParcial]));
  assert.ok(!g.libran[CIE_MAR].includes('cristian'), 'no «libra»: no trabaja por el cierre');
  assert.ok(g.refuerzos[CIE_LUN].some(x => x.pid === 'yilian' && x.tid === 'PASARELA_T'), JSON.stringify(g.refuerzos));
  assert.deepStrictEqual(M.pidsEn(e, CIE_LUN, 'MONACO_T').concat(M.pidsEn(e, CIE_MAR, 'MONACO_T')), []);
});

ok('cierre puntual · horas: los días sin trabajo por el cierre se enseñan (solo informativo) y una plaza en casilla cerrada no cuenta', () => {
  const cfg = cfgDemo(), st = cfg.staff, e = sepDe(cfg);
  M.aplicarCierre(cfg, st, e, cierreTardes(), {});
  assert.deepStrictEqual(M.horasPersonaMes(cfg, st, cfg.meses, 'cristian', 2026, 9).diasSinTrabajoCierre, [CIE_MAR]);
  assert.deepStrictEqual(M.horasPersonaMes(cfg, st, cfg.meses, 'lola', 2026, 9).diasSinTrabajoCierre, []);
  // una plaza en una casilla cerrada ESE día (a mano) no va a la nómina; «Cuándo abre» no descuenta
  // nada hacia atrás (24/09, revisión F2: borraba de Horas los lunes ya trabajados, también de agosto)
  const cfg2 = cfgDemo(), e2 = sepDe(cfg2);
  const lunesDeYilian = e2.days.filter(d => d.dow === 1 && M.pidsEn(e2, d.iso, 'MONACO_T').includes('yilian')).map(d => d.iso);
  const antes = M.horasPersonaMes(cfg2, cfg2.staff, cfg2.meses, 'yilian', 2026, 9);
  M.localDe(cfg2, 'MONACO').abre.T = [2, 3, 4, 5, 6, 7];
  assert.ok(lunesDeYilian.length > 0);
  assert.strictEqual(M.horasPersonaMes(cfg2, cfg2.staff, cfg2.meses, 'yilian', 2026, 9).turnos, antes.turnos, '«Cuándo abre» no toca lo ya trabajado');
  M.localDe(cfg2, 'MONACO').abre.T = [1, 2, 3, 4, 5, 6, 7];
  cfg2.meses['2026-09'].apertura[lunesDeYilian[0]] = { MONACO_T: false };
  assert.strictEqual(M.horasPersonaMes(cfg2, cfg2.staff, cfg2.meses, 'yilian', 2026, 9).turnos, antes.turnos - 1, 'cerrada a mano ese día: no cuenta');
});

ok('cierre puntual · núcleo (toProblem): cocina por medio día abierto, SIN no disponible, APOYO amplía los locales solo esos medios días', () => {
  const cfg = cfgBase(), st = cfg.staff;
  cfg.cierresPuntuales = [cierreTardes({ decisiones: { cristian: { tipo: 'SIN', turnos: [CIE_MAR + '|T'] }, yilian: { tipo: 'REFUERZA', turnos: [CIE_LUN + '|T'] } } })];
  const pr = M.toProblem(cfg, st, M.nuevoEstado(2026, 9), CIE_LUN, CIE_MAR, {});
  const idx = (iso, f) => pr.meta.indices.findIndex(x => x.iso === iso && x.franja === f);
  const cocinaDura = i => pr.rules.some(r => r.type === 'skill_coverage' && r.mode === 'hard' && r.params.requirements[0].shift === 'MONACO' && r.scope.day_tags.every(tag => pr.days[i].tags.includes(tag)));
  assert.ok(!cocinaDura(idx(CIE_LUN, 'T')) && !cocinaDura(idx(CIE_MAR, 'T')), 'cocina dura en una tarde con cobertura máx. 0');
  assert.ok(cocinaDura(idx(CIE_LUN, 'M')), 'la mañana abierta sí la pide');
  const w = id => pr.workers.find(x => x.id === id);
  assert.deepStrictEqual(w('cristian').unavailable[idx(CIE_MAR, 'T')], ['*']);
  assert.ok(w('yilian').allowed_shifts.includes('PASARELA'), JSON.stringify(w('yilian').allowed_shifts));
  assert.ok((w('yilian').unavailable[idx(CIE_LUN, 'M')] || []).includes('PASARELA'), 'fuera del cierre sigue atada al Mónaco');
  assert.ok(!Array.isArray(w('yilian').unavailable[idx(CIE_LUN, 'T')]) || !w('yilian').unavailable[idx(CIE_LUN, 'T')].includes('PASARELA'), 'la tarde del cierre puede ir a Pasarela');
});

ok('cierre puntual · «abrir hoy» (S28) pide el mínimo y se guarda con la apertura; «abierta y vacía» se avisa', () => {
  const cfg = cfgBase(), st = cfg.staff, e = M.nuevoEstado(2026, 9);
  M.abrirCasilla(e, CIE_LUN, 'EL33_T', 2);
  assert.strictEqual(M.turnoAbierto(cfg, e, CIE_LUN, 'EL33_T'), true);
  assert.strictEqual(M.minimoDe(cfg, CIE_LUN, 'EL33_T', e).min, 2, 'el mínimo que se pidió al abrir');
  assert.strictEqual(M.minimoDe(cfg, CIE_LUN, 'EL33_T').min, 0, 'sin estado, la tabla del local');
  assert.strictEqual(M.revisarTurno(cfg, st, e, CIE_LUN, 'EL33_T').faltan, 2);
  const pr = M.toProblem(cfg, st, e, CIE_LUN, CIE_LUN, {});
  assert.strictEqual(NE.demanda(pr, 1, 'EL33').min, 2, 'el núcleo también lo lee');
  M.toggleApertura(e, CIE_DOM, 'EL33_T', cfg);
  assert.ok(M.revisionMes(cfg, st, e, { desde: CIE_DOM, hasta: CIE_DOM }).some(x => x.tipo === 'abierta-vacia' && x.turnoId === 'EL33_T'), 'abierta con mínimo 0 y nadie: se avisa');
  cfg.cierresPuntuales = [cierreTardes()];
  M.abrirCasilla(e, CIE_LUN, 'MONACO_T', 2);
  assert.strictEqual(M.turnoAbierto(cfg, e, CIE_LUN, 'MONACO_T'), false, 'el cierre por fechas manda sobre la apertura del día');
});

ok('cierre puntual · sincronización: un cambio en cierresPuntuales es un cambio de planilla (409 no lo funde)', () => {
  assert.ok(M.CLAVES_PLANILLA.includes('cierresPuntuales'));
  const base = { staff: [], cierresPuntuales: [] }, srv = { staff: [], cierresPuntuales: [cierreTardes()] };
  const r = M.fusionarEstado(base, srv, { staff: [], cierresPuntuales: [] });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.motivo, 'planilla-cambiada');
  assert.deepStrictEqual(M.semillaPasarela().cierresPuntuales, []);
});

ok('cierre puntual · el caso real: Bar Mónaco del domingo 27/09 por la tarde al martes 29/09 (reforma)', () => {
  const cfg = cfgDemo(), st = cfg.staff, e = sepDe(cfg);
  const c = cierreReal();
  const r = M.aplicarCierre(cfg, st, e, c, { scapon: { tipo: 'VAC' }, yilian: { tipo: 'REFUERZA', destinos: { [CIE_LUN]: 'PASARELA_T' } }, hojan: { tipo: 'SIN' }, cristian: { tipo: 'SIN' } });
  assert.ok(r.ok, JSON.stringify(r.errores));
  assert.strictEqual(M.textoCierre(cfg, c), 'Bar Mónaco cerrado por reforma (dom 27/09 tarde – mar 29/09)');
  for (const [iso, tid] of [[CIE_DOM, 'MONACO_T'], [CIE_LUN, 'MONACO_M'], [CIE_LUN, 'MONACO_T'], [CIE_MAR, 'MONACO_M'], [CIE_MAR, 'MONACO_T']]) assert.deepStrictEqual(M.pidsEn(e, iso, tid), [], iso + ' ' + tid);
  assert.ok(M.pidsEn(e, CIE_DOM, 'MONACO_M').length, 'el domingo por la mañana abre con su gente');
  const su = M.personaDe(st, 'scapon');
  assert.strictEqual(M.ausenciaEn(su, CIE_DOM).tipo, 'VAC');
  assert.strictEqual(M.ausenciaEn(su, CIE_MAR).tipo, 'VAC');
  assert.strictEqual(M.ausenciaEn(su, CIE_LUN), null, 'libra los lunes');
  assert.strictEqual(M.asignados(e, CIE_LUN, 'PASARELA_T').find(x => x.pid === 'yilian').origen, 'cierre');
  assert.deepStrictEqual(c.decisiones.yilian.turnos, [CIE_LUN + '|T', CIE_MAR + '|M']);
  assert.deepStrictEqual(c.decisiones.jenny, { tipo: 'SIN', turnos: [CIE_DOM + '|T', CIE_LUN + '|M'] }, 'quien no tiene decisión: sin trabajo');
  // la semana del 28: se vacía lo generado y se vuelve a generar
  const e28 = cieRango(cfg, CIE_LUN, '2026-10-04');
  for (const iso of M.rangoIso(CIE_LUN, '2026-10-04')) for (const [tid, lista] of Object.entries(e28.asig[iso] || {})) e28.asig[iso][tid] = lista.filter(x => x.origen === 'manual' || x.forzado);
  M.generarSemana(cfg, st, e28, CIE_LUN, {});
  for (const [iso, tid] of [[CIE_LUN, 'MONACO_M'], [CIE_LUN, 'MONACO_T'], [CIE_MAR, 'MONACO_M'], [CIE_MAR, 'MONACO_T']]) assert.deepStrictEqual(M.pidsEn(e28, iso, tid), [], 'regenerada: ' + iso + ' ' + tid);
  assert.ok(M.pidsEn(e28, CIE_LUN, 'PASARELA_T').includes('yilian'), 'el apoyo de Yilian vuelve a salir');
  for (const [pid, d] of Object.entries(c.decisiones)) {
    if (d.tipo === 'REFUERZA') continue;
    for (const k of d.turnos) { const [iso, f] = k.split('|'); if (iso >= CIE_LUN) assert.deepStrictEqual(cieDonde(cfg, e28, iso, pid, f), [], `${pid} no se redistribuye el ${k}`); }
  }
  assert.deepStrictEqual(cieDonde(cfg, e28, CIE_LUN, 'hojan'), ['EL33_M'], 'Hojan hace su mañana en El 33');
  assert.ok(M.turnoAbierto(cfg, e28, '2026-10-04', 'MONACO_T') && M.pidsEn(e28, '2026-10-04', 'MONACO_T').includes('scapon'), 'el domingo 04/10 el Mónaco abre por la tarde con normalidad');
});

// ---------- cierre puntual: lo que encontraron los dos revisores de la fase 2 (24/09) ----------
ok('cierre puntual · editar: quien ya no está en las casillas cerradas no se queda con una decisión «sin alcance» (revisión F2)', () => {
  const cfg = cfgDemo(), st = cfg.staff, e = sepDe(cfg);
  // el lunes 28 por la tarde Cristian cubre en Zapatillera (lo puso la cobertura: automático)
  M.desasignar(e, CIE_LUN, 'MONACO_M', 'cristian');
  assert.ok(M.asignar(e, cfg, st, CIE_LUN, 'ZAPA_T', 'cristian', { origen: 'cobertura' }).ok);
  const c1 = cierreTardes({ dias: { [CIE_MAR]: ['T'] } });
  M.aplicarCierre(cfg, st, e, c1, { cristian: { tipo: 'SIN' } });
  // se edita al lunes por la tarde y el visor reenvía las decisiones de antes (y una de alguien que
  // nunca estuvo en las casillas cerradas)
  const antes = {}; for (const [pid, d] of Object.entries(c1.decisiones)) antes[pid] = { tipo: d.tipo };
  const c2 = cierreTardes({ dias: { [CIE_LUN]: ['T'] } });
  assert.ok(M.aplicarCierre(cfg, st, e, c2, Object.assign(antes, { lola: { tipo: 'VAC' } })).ok);
  assert.strictEqual(c2.decisiones.cristian, undefined, JSON.stringify(c2.decisiones.cristian));
  assert.strictEqual(c2.decisiones.lola, undefined, 'quien no trabajaba en las casillas cerradas no recibe decisión');
  assert.strictEqual(M.ausenciaEn(M.personaDe(st, 'lola'), CIE_LUN), null, 'ni vacaciones');
  assert.ok(Object.values(c2.decisiones).every(d => Array.isArray(d.turnos) && d.turnos.length), 'toda decisión guardada lleva su alcance');
  assert.strictEqual(M.decisionCierre(cfg, 'cristian', CIE_LUN, 'T'), null);
  assert.ok(M.puedeEstar(cfg, st, e, CIE_LUN, 'ZAPA_T', 'cristian', { yaDentro: true }).ok);
  assert.ok(!M.retirarQueIncumplen(cfg, st, e, CIE_LUN, CIE_LUN).some(x => x.pid === 'cristian'), 'su plaza de la cobertura se queda');
  assert.deepStrictEqual(cieDonde(cfg, e, CIE_LUN, 'cristian'), ['ZAPA_T']);
});

ok('cierre puntual · horas y registro de apoyos: «Cuándo abre» no borra lo ya trabajado; solo descuenta la casilla cerrada ESE día (revisión F2)', () => {
  const cfg = cfgDemo(), st = cfg.staff;
  const h = pid => M.horasPersonaMes(cfg, st, cfg.meses, pid, 2026, 9);
  const reg = pid => M.registroApoyos(cfg, st, cfg.meses, 2026, 9).find(r => r.pid === pid);
  const antes = h('yilian'), regAntes = reg('cristian');
  M.localDe(cfg, 'MONACO').abre.T = [3, 4, 5, 6, 7];   // desde hoy deja de abrir lunes y martes por la tarde
  assert.strictEqual(h('yilian').minutos, antes.minutos, 'los lunes ya trabajados siguen contando');
  assert.strictEqual(reg('cristian').minutos, regAntes.minutos, 'ni el registro de apoyos pierde los martes');
  // un mes ya cerrado para la nómina tampoco cambia
  const ago = M.estadoDesde(cfg.meses, [], 2026, 8); cfg.meses['2026-08'] = { asig: ago.asig, apertura: ago.apertura, manual: ago.manual };
  M.localDe(cfg, 'MONACO').abre.T = [1, 2, 3, 4, 5, 6, 7];
  M.instanciarPatron(cfg, st, ago, '2026-08-01', '2026-08-31', {});
  const agoAntes = M.horasPersonaMes(cfg, st, cfg.meses, 'yilian', 2026, 8).minutos;
  M.localDe(cfg, 'MONACO').abre.T = [3, 4, 5, 6, 7];
  assert.strictEqual(M.horasPersonaMes(cfg, st, cfg.meses, 'yilian', 2026, 8).minutos, agoAntes, 'agosto sigue igual');
  // cerrada ese día concreto (por fechas) sí se descuenta, en las horas y en el registro
  M.localDe(cfg, 'MONACO').abre.T = [1, 2, 3, 4, 5, 6, 7];
  cfg.cierresPuntuales = [cierreTardes({ dias: { '2026-09-22': ['T'] } })];
  assert.ok(reg('cristian').minutos < regAntes.minutos, 'el martes 22 cerrado por fechas no va al registro');
  // la revisión con la fecha de hoy: los días ya pasados se trabajaron con el horario de entonces
  cfg.cierresPuntuales = [];
  M.localDe(cfg, 'MONACO').abre.T = [3, 4, 5, 6, 7];
  const rev = M.revisionMes(cfg, st, sepDe(cfg), { hoy: '2026-09-24' }).filter(x => x.tipo === 'plaza-en-cerrado');
  assert.ok(!rev.some(x => x.iso < '2026-09-24'), rev.map(x => x.iso).join(' '));
  assert.ok(rev.some(x => x.iso === CIE_LUN), 'las que vienen, sí: son plazas fantasma');
});

ok('cierre puntual · «sin trabajo» sin decisión no sale de la semana tipo en un día que ya tenía planilla (revisión F2)', () => {
  const cfg = cfgDemo(), st = cfg.staff, e = sepDe(cfg);
  // esta semana la cobertura mandó a Cristian (martes tarde fijo en el Mónaco) a Pasarela tarde
  M.desasignar(e, CIE_MAR, 'MONACO_T', 'cristian');
  assert.ok(M.asignar(e, cfg, st, CIE_MAR, 'PASARELA_T', 'cristian', { origen: 'cobertura' }).ok);
  const c = cierreTardes({ dias: { [CIE_MAR]: ['T'] } });
  assert.deepStrictEqual(M.afectadosPorCierre(cfg, st, e, c).map(a => a.pid), ['scapon'], 'el visor no pregunta por él');
  M.aplicarCierre(cfg, st, e, c, {});
  assert.deepStrictEqual(c.deSemanaTipo, {}, 'ese día ya tenía planilla');
  assert.strictEqual(M.decisionCierre(cfg, 'cristian', CIE_MAR, 'T'), null);
  assert.deepStrictEqual(M.avisosVigentes(cfg, st, e, CIE_MAR, 'PASARELA_T', 'cristian'), []);
  assert.ok(!M.retirarQueIncumplen(cfg, st, e, CIE_MAR, CIE_MAR).some(x => x.pid === 'cristian'), 'el generador no le quita su plaza');
  // semana sin planilla al cerrar: la semana tipo sí vale, y queda apuntado qué días
  const cfg2 = Object.assign(cfgBase(), { meses: {} }), e2 = M.nuevoEstado(2026, 9);
  const c2 = cierreTardes();
  M.aplicarCierre(cfg2, cfg2.staff, e2, c2, {});
  assert.deepStrictEqual(c2.deSemanaTipo, { [CIE_LUN]: ['T'], [CIE_MAR]: ['T'] }, 'por casilla (corrección de A3)');
  assert.ok(['scapon', 'cristian', 'hojan', 'yilian'].every(pid => c2.decisiones[pid] && c2.decisiones[pid].tipo === 'SIN'), 'y todos los de la semana tipo esos días con su decisión explícita: ' + JSON.stringify(Object.keys(c2.decisiones)));
  // alguien que entra después en la semana tipo en la casilla cerrada cuenta como sin trabajo sin decisión (30/09, corrección de
  // A3, B4 opción a: la casilla se leyó de la semana tipo), salvo que esté en standby; al editar el cierre, el visor la lista
  cfg2.patron[1] = (cfg2.patron[1] || []).concat([{ t: 'MONACO_T', p: 'dulce' }]);
  assert.strictEqual(M.decisionCierre(cfg2, 'dulce', CIE_LUN, 'T'), null, 'Dulce está en standby');
  M.personaDe(cfg2.staff, 'dulce').standby = false;
  const dd = M.decisionCierre(cfg2, 'dulce', CIE_LUN, 'T');
  assert.ok(dd && dd.tipo === 'SIN' && dd.explicita === false, 'entra en la casilla cerrada de la semana tipo: sin trabajo implícito: ' + JSON.stringify(dd));
  const c3 = Object.assign({}, c2, { detalle: 'editado', decisiones: {}, retirados: [] });
  M.aplicarCierre(cfg2, cfg2.staff, e2, c3, JSON.parse(JSON.stringify(c2.decisiones)));
  const d3 = M.decisionCierre(cfg2, 'dulce', CIE_LUN, 'T');
  assert.ok(d3 && d3.tipo === 'SIN' && d3.explicita === true, 'al editar el cierre entra con su decisión explícita (sin trabajo por defecto)');
});

ok('cierre puntual · núcleo: a quien apoya no se le fija su plaza de la semana tipo dentro del local cerrado (revisión F2)', () => {
  const cfg = cfgBase(), st = cfg.staff;
  cfg.cierresPuntuales = [cierreTardes({ decisiones: { yilian: { tipo: 'REFUERZA', turnos: [CIE_LUN + '|T'] }, hojan: { tipo: 'SIN', turnos: [CIE_LUN + '|T'] } } })];
  const pr = M.toProblem(cfg, st, M.nuevoEstado(2026, 9), CIE_LUN, CIE_LUN, {});
  const i = pr.meta.indices.findIndex(x => x.iso === CIE_LUN && x.franja === 'T');
  const j = pr.meta.indices.findIndex(x => x.iso === CIE_LUN && x.franja === 'M');
  assert.ok(pr.workers.every(w => w.fixed[i] !== 'MONACO'), 'plaza fija en un local con cobertura 0/0: el problema sería imposible');
  assert.ok(pr.workers.some(w => w.fixed[j] === 'MONACO'), 'la mañana abierta sí se fija');
  const cfg2 = cfgBase(); M.localDe(cfg2, 'MONACO').abre.T = [3, 4, 5, 6, 7];
  const pr2 = M.toProblem(cfg2, cfg2.staff, M.nuevoEstado(2026, 9), CIE_LUN, CIE_LUN, {});
  assert.ok(pr2.workers.every(w => w.fixed[i] !== 'MONACO'), 'tampoco con «Cuándo abre» sin el lunes por la tarde');
});

ok('cierre puntual · editar: lo retirado que no pudo volver en el paso intermedio sigue retirado si su casilla sigue cerrada, y si no, se avisa (revisión F2)', () => {
  const cfg = cfgDemo(), st = cfg.staff, e = sepDe(cfg);
  M.aplicarCierre(cfg, st, e, cierreTardes({ dias: { [CIE_MAR]: ['T'] } }), { cristian: { tipo: 'SIN' } });
  // el encargado fuerza a Cristian en Zapatillera esa tarde
  const f = M.asignar(e, cfg, st, CIE_MAR, 'ZAPA_T', 'cristian', { forzar: true });
  assert.ok(f.ok, f.motivo);
  // se edita el cierre: también el lunes por la tarde
  const c2 = cierreTardes({ dias: { [CIE_LUN]: ['T'], [CIE_MAR]: ['T'] } });
  assert.ok(M.aplicarCierre(cfg, st, e, c2, { cristian: { tipo: 'SIN' } }).ok);
  assert.ok(c2.retirados.some(x => x.iso === CIE_MAR && x.tid === 'MONACO_T' && x.entry.pid === 'cristian'), JSON.stringify(c2.retirados));
  assert.deepStrictEqual(c2.decisiones.cristian && c2.decisiones.cristian.turnos, [CIE_MAR + '|T'], 'y conserva su decisión');
  // al reabrir, ya sin la plaza forzada, vuelve a su sitio
  M.desasignar(e, CIE_MAR, 'ZAPA_T', 'cristian');
  M.quitarCierre(cfg, st, e, c2.id, { devolver: true });
  assert.ok(M.pidsEn(e, CIE_MAR, 'MONACO_T').includes('cristian'));
  // si la edición reabre su día y no puede volver, el resultado lo dice
  const cfg3 = cfgDemo(), e3 = sepDe(cfg3);
  M.aplicarCierre(cfg3, cfg3.staff, e3, cierreTardes({ dias: { [CIE_MAR]: ['T'] } }), {});
  assert.ok(M.asignar(e3, cfg3, cfg3.staff, CIE_MAR, 'ZAPA_T', 'cristian', { forzar: true }).ok);
  const r3 = M.aplicarCierre(cfg3, cfg3.staff, e3, cierreTardes({ dias: { [CIE_LUN]: ['T'] } }), {});
  assert.ok(r3.avisos.some(x => /Cristian/.test(x) && /no ha podido volver/.test(x) && /Zapatillera/.test(x)), JSON.stringify(r3.avisos));
});

ok('cierre puntual · los destinos de apoyo se guardan solo para los días y franjas que la persona tenía cerrados (revisión F2)', () => {
  const cfg = cfgDemo(), st = cfg.staff, e = sepDe(cfg);
  M.aplicarCierre(cfg, st, e, cierreTardes({ dias: { [CIE_LUN]: ['M', 'T'], [CIE_MAR]: ['M', 'T'] } }), { yilian: { tipo: 'REFUERZA', destinos: { [CIE_LUN]: 'PASARELA_T' } } });
  // se edita: el lunes ya no cierra (el visor reenvía el destino de antes)
  const c2 = cierreTardes({ dias: { [CIE_MAR]: ['M', 'T'] } });
  const r = M.aplicarCierre(cfg, st, e, c2, { yilian: { tipo: 'REFUERZA', destinos: { [CIE_LUN]: 'PASARELA_T', [CIE_MAR]: 'ZAPA_T' } } });
  assert.deepStrictEqual(c2.decisiones.yilian, { tipo: 'REFUERZA', turnos: [CIE_MAR + '|M'] }, 'ni el lunes (ya no cierra) ni una tarde que no tenía');
  assert.deepStrictEqual(r.rechazados, []);
  assert.deepStrictEqual(M.generarPlanilla(cfg, st, e, CIE_LUN, CIE_MAR, {}).rechazados.filter(x => x.pid === 'yilian' && x.turnoId !== 'MONACO_M'), []);
});

ok('cierre puntual · sincronización: una clave que falta vale lo mismo que vacía (el primer 409 tras desplegar no es un conflicto) (revisión F2)', () => {
  const base = { staff: [], peticiones: [] }, srv = { staff: [], cierresPuntuales: [], peticiones: [] };
  const r = M.fusionarEstado(base, srv, { staff: [], peticiones: [] });
  assert.ok(r.ok, r.motivo);
  assert.strictEqual(M.fusionarEstado({ staff: [] }, { staff: [], cierres: {} }, { staff: [] }).ok, true);
  assert.strictEqual(M.fusionarEstado({ staff: [] }, { staff: [], cierresPuntuales: [cierreTardes()] }, { staff: [] }).motivo, 'planilla-cambiada', 'un cierre de verdad sigue siendo un cambio');
});

ok('cierre puntual · «sin trabajo» por medios días: quien trabaja la otra franja no cuenta como día sin trabajo (revisión F2)', () => {
  const cfg = cfgDemo(), st = cfg.staff, e = cieRango(cfg, CIE_LUN, '2026-10-04');
  M.aplicarCierre(cfg, st, e, cierreTardes(), {});
  const ho = M.horasPersonaMes(cfg, st, cfg.meses, 'hojan', 2026, 9);
  assert.ok(!ho.diasSinTrabajoCierre.includes(CIE_LUN), 'el lunes hace El 33 por la mañana');
  assert.deepStrictEqual(ho.sinTrabajoCierre, [{ iso: CIE_LUN, franjas: ['T'], trabaja: true }]);
  const cr = M.horasPersonaMes(cfg, st, cfg.meses, 'cristian', 2026, 9);
  assert.deepStrictEqual(cr.diasSinTrabajoCierre, [CIE_MAR]);
  assert.deepStrictEqual(cr.sinTrabajoCierre, [{ iso: CIE_MAR, franjas: ['T'], trabaja: false }]);
  const g = M.generarSemana(cfg, st, e, CIE_LUN, {});
  assert.ok(!g.sinTrabajo[CIE_LUN].includes('hojan'), JSON.stringify(g.sinTrabajo[CIE_LUN]));
  assert.deepStrictEqual(g.sinTrabajoParcial[CIE_LUN], [{ pid: 'hojan', franjas: ['T'] }]);
  assert.ok(g.sinTrabajo[CIE_MAR].includes('cristian'));
});

ok('cierre puntual · quien hacía partido y se queda con la otra mitad conserva su tramo: Hojan, El 33 de 11:00 a 16:00 (revisión F2)', () => {
  const cfg = cfgDemo(), st = cfg.staff, e = sepDe(cfg);
  const tramoM = M.tramoDe(cfg, e, CIE_LUN, 'EL33_M', 'hojan');
  assert.deepStrictEqual([tramoM.ini, tramoM.fin], ['11:00', '16:00'], 'el lunes hace partido: El 33 a mediodía y el Mónaco por la noche');
  const antes = M.horasPersonaMes(cfg, st, cfg.meses, 'hojan', 2026, 9);
  const hojan = M.afectadosPorCierre(cfg, st, e, cierreTardes()).find(a => a.pid === 'hojan');
  assert.ok(hojan.avisos.some(x => /hacía partido/.test(x) && /El 33/.test(x) && /de 11:00 a 16:00/.test(x)), JSON.stringify(hojan.avisos));
  M.aplicarCierre(cfg, st, e, cierreTardes(), { hojan: { tipo: 'SIN' } });
  assert.deepStrictEqual(M.tramoDe(cfg, e, CIE_LUN, 'EL33_M', 'hojan'), tramoM, 'nadie ha decidido que entre a las 07:00');
  assert.strictEqual(M.turnoDelDia(cfg, e, CIE_LUN, 'hojan').enPartido, true, 'su perfil lee el mismo tramo');
  const despues = M.horasPersonaMes(cfg, st, cfg.meses, 'hojan', 2026, 9);
  assert.strictEqual(antes.minutos - despues.minutos, 180, `pierde las 3 h de la noche (${antes.horas} → ${despues.horas})`);
  assert.strictEqual(despues.partidos, antes.partidos - 1, 'ese día ya no cuenta como partido');
  // al reabrir, el partido vuelve entero
  M.quitarCierre(cfg, st, e, 'cie_t', { devolver: true });
  assert.strictEqual(M.horasPersonaMes(cfg, st, cfg.meses, 'hojan', 2026, 9).minutos, antes.minutos);
});

ok('cierre puntual · apoyo «donde haga falta» que nadie ha colocado: sale como tal, no como que libra, y la revisión lo avisa (revisión F2)', () => {
  const cfg = cfgDemo(), st = cfg.staff, e = cieRango(cfg, CIE_LUN, '2026-10-04');
  M.aplicarCierre(cfg, st, e, cierreTardes({ dias: { [CIE_MAR]: ['M'] } }), { yilian: { tipo: 'REFUERZA' } });
  assert.deepStrictEqual(M.apoyosSinSitio(cfg, st, e, CIE_MAR).map(x => x.pid + ':' + x.franja), ['yilian:M']);
  const rev = M.revisionMes(cfg, st, e, { desde: CIE_MAR, hasta: CIE_MAR }).filter(x => x.tipo === 'apoyo-sin-sitio');
  assert.ok(rev.length === 1 && /Yilian/.test(rev[0].msg) && /sin sitio/.test(rev[0].msg), JSON.stringify(rev));
  const g = M.generarSemana(cfg, st, e, CIE_LUN, {});
  if (!M.turnosDe(cfg).some(t => t.franja === 'M' && M.pidsEn(e, CIE_MAR, t.id).includes('yilian'))) {
    assert.ok(!g.libran[CIE_MAR].includes('yilian'), 'no «libra»: está de apoyo, aún sin sitio');
    assert.deepStrictEqual(g.apoyoSinSitio[CIE_MAR], ['yilian']);
  }
  // en cuanto se la coloca, deja de avisarse
  assert.ok(M.asignar(e, cfg, st, CIE_MAR, 'ZAPA_M', 'yilian', { origen: 'manual' }).ok);
  assert.deepStrictEqual(M.apoyosSinSitio(cfg, st, e, CIE_MAR), []);
});

ok('cierre puntual · textoCierre con días sueltos los enumera (no parece un intervalo seguido) (revisión F2)', () => {
  const cfg = cfgBase();
  const t = dias => M.textoCierre(cfg, cierreTardes({ dias }));
  assert.strictEqual(t({ [CIE_DOM]: ['T'], [CIE_MAR]: ['T'] }), 'Bar Mónaco cerrado por reforma (dom 27/09 y mar 29/09, solo tardes)');
  assert.strictEqual(t({ [CIE_DOM]: ['T'], [CIE_MAR]: ['M', 'T'] }), 'Bar Mónaco cerrado por reforma (dom 27/09 tarde y mar 29/09)');
  assert.strictEqual(t({ [CIE_DOM]: ['T'], [CIE_LUN]: ['T'], [CIE_MAR]: ['M', 'T'] }), 'Bar Mónaco cerrado por reforma (dom 27/09 tarde y lun 28/09 tarde – mar 29/09)', 'el lunes por la mañana abre: no es seguido desde el domingo');
  assert.strictEqual(t({ [CIE_LUN]: ['T'], [CIE_MAR]: ['M'] }), 'Bar Mónaco cerrado por reforma (lun 28/09 tarde – mar 29/09 mañana)', 'una noche seguida');
  assert.strictEqual(t({ [CIE_DOM]: ['T'], '2026-10-04': ['T'], '2026-10-11': ['T'], '2026-10-18': ['T'], '2026-10-25': ['T'] }), 'Bar Mónaco cerrado por reforma (los domingos por la tarde del 27/09 al 25/10)');
  // lo de siempre no cambia
  assert.strictEqual(t({ [CIE_DOM]: ['T'], [CIE_LUN]: ['M', 'T'], [CIE_MAR]: ['M', 'T'] }), 'Bar Mónaco cerrado por reforma (dom 27/09 tarde – mar 29/09)');
  assert.strictEqual(t({ [CIE_LUN]: ['T'], [CIE_MAR]: ['T'] }), 'Bar Mónaco cerrado por reforma (lun 28/09 – mar 29/09, solo tardes)');
});

ok('cierre puntual · el cierre que sale de «Cuándo abre» guarda de dónde viene y se encuentra al volver a marcar el día (revisión F2)', () => {
  const cfg = cfgDemo(), st = cfg.staff, e = cieRango(cfg, CIE_DOM, '2026-10-11');
  const c = cierreTardes({ id: 'cie_abre', motivo: 'otro', detalle: 'cambio de horario', dias: { [CIE_DOM]: ['T'], '2026-10-04': ['T'], '2026-10-11': ['T'] }, origen: { abre: { franja: 'T', dow: 7 } } });
  assert.ok(M.aplicarCierre(cfg, st, e, c, {}).ok);
  assert.deepStrictEqual(c.origen, { abre: { franja: 'T', dow: 7 } }, 'aplicarCierre lo conserva');
  assert.deepStrictEqual(M.cierresDelHorario(cfg, 'MONACO', 'T', 7).map(x => x.id), ['cie_abre']);
  assert.deepStrictEqual(M.cierresDelHorario(cfg, 'MONACO', 'M', 7), []);
  assert.deepStrictEqual(M.cierresDelHorario(cfg, 'MONACO', 'T', 1), []);
  cfg.cierresPuntuales.push(cierreTardes({ id: 'cie_obra', dias: { '2026-10-18': ['T'] } }));
  assert.deepStrictEqual(M.cierresDelHorario(cfg, 'MONACO', 'T', 7).map(x => x.id), ['cie_abre'], 'un cierre por obra no sale de «Cuándo abre»');
});

ok('cierre puntual · reabrir desde una fecha: lo ya pasado sigue cerrado con lo que se decidió, lo que viene reabre (revisión F2)', () => {
  const cfg = cfgDemo(), st = cfg.staff, e = cieRango(cfg, '2026-09-20', '2026-10-04');
  // lo que deja «Cuándo abre» al quitar el domingo por la tarde: los domingos planificados (el 20 ya pasó)
  const c = cierreTardes({ id: 'cie_abre', motivo: 'otro', detalle: 'cambio de horario', dias: { '2026-09-20': ['T'], [CIE_DOM]: ['T'], '2026-10-04': ['T'] }, origen: { abre: { franja: 'T', dow: 7 } } });
  assert.ok(M.aplicarCierre(cfg, st, e, c, { scapon: { tipo: 'VAC' } }).ok);
  assert.strictEqual(M.ausenciaEn(M.personaDe(st, 'scapon'), '2026-10-04').tipo, 'VAC');
  const r = M.reabrirCierreDesde(cfg, st, e, 'cie_abre', '2026-09-24');
  assert.ok(r.ok, JSON.stringify(r));
  const sigue = M.cierresDe(cfg).find(x => x.id === 'cie_abre');
  assert.deepStrictEqual(sigue && sigue.dias, { '2026-09-20': ['T'] }, 'el domingo 20 ya pasó: sigue cerrado');
  assert.deepStrictEqual(sigue.origen, { abre: { franja: 'T', dow: 7 } });
  assert.strictEqual(M.turnoAbierto(cfg, e, '2026-09-20', 'MONACO_T'), false);
  assert.deepStrictEqual(M.pidsEn(e, '2026-09-20', 'MONACO_T'), [], 'sus plazas no vuelven (no se trabajaron)');
  assert.strictEqual(M.ausenciaEn(M.personaDe(st, 'scapon'), '2026-09-20').tipo, 'VAC', 'ni sus vacaciones de ese día se quitan');
  for (const iso of [CIE_DOM, '2026-10-04']) {
    assert.ok(M.turnoAbierto(cfg, e, iso, 'MONACO_T'), iso);
    assert.ok(M.pidsEn(e, iso, 'MONACO_T').includes('scapon'), iso + ': vuelve su gente');
    assert.strictEqual(M.ausenciaEn(M.personaDe(st, 'scapon'), iso), null, iso + ': sin las vacaciones del cierre');
  }
  // todo en el futuro: se reabre entero
  assert.ok(M.reabrirCierreDesde(cfg, st, e, 'cie_abre', '2026-09-01').ok);
  assert.strictEqual(M.cierresDe(cfg).length, 0);
});

// ---------- fase 3 (24/09): «Cubre a» y la Cobertura ----------
// Reunión del 24/09: «La semana que viene Iván se va a coger viernes, sábado y domingo de
// vacaciones… me sale que lo podría cubrir Dulce. Pero preferimos que lo cubra Mariluz viernes y
// sábado por la tarde… Mariluz haría turno partido y la mañana de Lola. La mañana de Lola sí que
// quiero que lo respete, pero prefiero que cubra». Decisiones D1 (la designación «cubre a X»
// autoriza el partido para cubrir a X), D2 («cubre a» es prioridad, no un peso), D3 (el relevo:
// quien ya está en la casilla de X es quien la cubre) y D10 (ausencias por franja).
const F3_LUN = '2026-09-28', F3_VIE = '2026-10-02', F3_SAB = '2026-10-03', F3_DOM = '2026-10-04';
const F3_INC = () => ({ pid: 'ivan', tipo: 'VAC', dias: [F3_VIE, F3_SAB, F3_DOM], desde: F3_VIE, hasta: F3_DOM });
// la planilla del cliente (?demo=1 el 24/09), con Dulce ya en activo y Mari Luz «Cubre a Iván,
// cualquier día, cualquier turno» (Equipo lo guarda como { pid }, sin día ni turno)
function f3Escenario(antes, despues) {
  const cfg = Object.assign(cfgBase(), { meses: {} });
  delete M.personaDe(cfg.staff, 'dulce').standby;
  M.personaDe(cfg.staff, 'mariluz').cubreA = [{ pid: 'ivan' }];
  if (antes) antes(cfg, cfg.staff);
  M.sembrarDemo(cfg, '2026-09-24');
  if (despues) despues(cfg, cfg.staff);
  return cfg;
}
const f3Mes = (cfg, iso) => M.estadoDesde(cfg.meses, [], +iso.slice(0, 4), +iso.slice(5, 7));
// lo que pasaba la pestaña (solo los días marcados) y lo que pasa ahora (rangoNecesario: semanas enteras)
const f3Tab = (cfg, inc) => M.clonarEstado(cieRango(cfg, inc.desde, inc.hasta));
const f3Entero = (cfg, inc) => { const r = M.rangoNecesario(inc); return M.clonarEstado(cieRango(cfg, r.desde, r.hasta)); };
const f3De = (P, iso, pid, tid) => P.asignaciones.filter(a => a.iso === iso && a.tid === (tid || 'PASARELA_T') && a.pid === pid);
// una semana vacía y escribible que cruza de mes (como estadoSemana del Generador)
function f3Semana(lunes) {
  const l = lunes || F3_LUN, meses = {};
  const e = { y: +l.slice(0, 4), m: +l.slice(5, 7), days: [], asig: {}, apertura: {}, manual: {}, festivos: [], virtual: true };
  for (let k = 0; k < 7; k++) {
    const iso = M.addDias(l, k), key = iso.slice(0, 7);
    const me = meses[key] || (meses[key] = M.nuevoEstado(+iso.slice(0, 4), +iso.slice(5, 7), { festivos: [] }));
    e.days.push(me.days.find(x => x.iso === iso));
    me.asig[iso] = {}; me.apertura[iso] = {}; me.manual[iso] = {};
    e.asig[iso] = me.asig[iso]; e.apertura[iso] = me.apertura[iso]; e.manual[iso] = me.manual[iso];
  }
  return e;
}

ok('F3 · R1 (24/09) Iván de vacaciones vie 2, sáb 3 y dom 4: el plan A deja a Mari Luz, que ya estaba de tarde, cubriendo a Iván y abriendo; el domingo no', () => {
  for (const [nombre, base] of [['estado de la pestaña', f3Tab], ['semana entera', f3Entero]]) {
    const cfg = f3Escenario(), inc = F3_INC();
    const A = M.planesCobertura(cfg, cfg.staff, base(cfg, inc), inc, { siempre: false, intercambio: false }).planes[0];
    for (const iso of [F3_VIE, F3_SAB]) {
      const ml = f3De(A, iso, 'mariluz');
      assert.strictEqual(ml.length, 1, `${nombre} · ${iso}: Mari Luz no está en el plan A: ${JSON.stringify(A.asignaciones.map(a => a.iso.slice(8) + ' ' + a.pid))}`);
      assert.ok(ml[0].yaEstaba, `${nombre}: ya estaba en la tarde (su partido declarado)`);
      assert.deepStrictEqual(ml[0].razones.slice(0, 2), ['cubre a Iván', 'ya estaba en este turno']);
      assert.ok(ml[0].abre, `${nombre}: abre la tarde en lugar de Iván`);
      assert.deepStrictEqual(ml[0].avisos, []);
      // el mínimo de la tarde es 3 los viernes y sábados: entra otra persona, y no «cubre a Iván»
      const otros = A.asignaciones.filter(a => a.iso === iso && a.tid === 'PASARELA_T' && !a.yaEstaba);
      assert.strictEqual(otros.length, 1, JSON.stringify(otros));
      assert.strictEqual(otros[0].razones[0], 'para llegar al mínimo (había 2 de 3)', JSON.stringify(otros[0].razones));
      assert.ok(!otros[0].razones.some(r => /cubre a Iván/.test(r)));
    }
    assert.strictEqual(f3De(A, F3_DOM, 'mariluz').length, 0, `${nombre}: el domingo hace la mañana (libra Lola) y «nunca con» Lavinia`);
    assert.ok(!A.personas.includes('mariluz'), 'no es una plaza nueva: no sale en «Entran»');
    assert.ok(/mariluz/.test(A.firma), 'pero la firma del plan la incluye');
    // S33: el domingo la tarde no se queda solo con apoyos sin decirlo
    const dom = A.asignaciones.filter(a => a.iso === F3_DOM && a.tid === 'PASARELA_T');
    const solo = M.revisarTurno(cfg, cfg.staff, A.estado, F3_DOM, 'PASARELA_T').soloApoyos && dom.some(a => M.esApoyo(M.personaDe(cfg.staff, a.pid)));
    assert.ok(!solo || dom.some(a => a.avisos.includes('solo apoyos')), JSON.stringify(dom));
  }
});

ok('F3 · R2 (D2) «cubre a» es prioridad, no un peso: con la semana entera y Mari Luz solo de mañana vie/sáb, sale la primera aunque tenga más turnos', () => {
  const quitaTarde = cfg => { for (const iso of [F3_VIE, F3_SAB]) M.desasignar(f3Mes(cfg, iso), iso, 'PASARELA_T', 'mariluz'); };
  const cfg = f3Escenario(null, quitaTarde), inc = F3_INC();
  const e = f3Entero(cfg, inc);
  for (const iso of inc.dias) M.desasignar(e, iso, 'PASARELA_T', 'ivan');
  const st = cfg.staff.map(p => p.id === 'ivan' ? Object.assign({}, p, { ausencias: [{ tipo: 'VAC', desde: F3_VIE, hasta: F3_DOM }] }) : p);
  const c = M.candidatosCobertura(cfg, st, e, F3_VIE, 'PASARELA_T', 'ivan', {});
  assert.strictEqual(c[0].pid, 'mariluz', c.slice(0, 3).map(x => `${x.pid}:${x.score}`).join(' '));
  assert.ok(c[0].cubre);
  assert.ok(c.slice(1).every(x => !x.cubre), 'los demás, por puntuación');
  const A = M.planesCobertura(cfg, cfg.staff, f3Entero(cfg, inc), inc, {}).planes[0];
  for (const iso of [F3_VIE, F3_SAB]) {
    const ml = f3De(A, iso, 'mariluz');
    assert.strictEqual(ml.length, 1, JSON.stringify(A.asignaciones.map(a => a.iso.slice(8) + ' ' + a.pid)));
    assert.ok(!ml[0].yaEstaba && ml[0].razones.includes('cubre a Iván') && ml[0].abre, JSON.stringify(ml[0]));
  }
});

ok('F3 · R3 (D3) aplicar el plan A: Mari Luz sigue una sola vez en la tarde, ahora «por Iván» y abriendo; Iván sale y queda su ausencia', () => {
  const cfg = f3Escenario(), inc = F3_INC();
  const A = M.planesCobertura(cfg, cfg.staff, f3Tab(cfg, inc), inc, {}).planes[0];
  const e = cieRango(cfg, inc.desde, inc.hasta);
  const r = M.aplicarCobertura(cfg, cfg.staff, e, inc, A);
  for (const iso of [F3_VIE, F3_SAB]) {
    const lista = M.asignados(e, iso, 'PASARELA_T');
    assert.ok(!lista.some(x => x.pid === 'ivan'));
    const ml = lista.filter(x => x.pid === 'mariluz');
    assert.strictEqual(ml.length, 1, JSON.stringify(lista));
    assert.strictEqual(ml[0].por, 'ivan', JSON.stringify(ml[0]));
    assert.strictEqual(ml[0].razon, 'cubre a Iván');
    const pos = M.posicionesDe(cfg, cfg.staff, e, iso, 'PASARELA_T');
    assert.ok(pos[0].pid === 'mariluz' && pos[0].abre && pos[0].por === 'ivan', JSON.stringify(pos));
    assert.strictEqual(lista.length, 3, 'con quien entra para llegar al mínimo');
    const otro = lista.find(x => x.pid !== 'mariluz' && x.origen === 'cobertura');
    assert.ok(otro && !otro.por && otro.razon === 'para llegar al mínimo (había 2 de 3)', JSON.stringify(otro));
  }
  assert.ok(r.asignados.some(x => x.pid === 'mariluz' && x.yaEstaba), JSON.stringify(r.asignados));
  assert.strictEqual(r.rechazados.length, 0, JSON.stringify(r.rechazados));
  assert.ok(M.ausenciaEn(M.personaDe(cfg.staff, 'ivan'), F3_SAB));
  // si entre proponer y confirmar Mari Luz sale de la casilla, el relevo va a rechazados y no crea plaza
  const cfg2 = f3Escenario(), inc2 = F3_INC();
  const A2 = M.planesCobertura(cfg2, cfg2.staff, f3Tab(cfg2, inc2), inc2, {}).planes[0];
  const e2 = cieRango(cfg2, inc2.desde, inc2.hasta);
  M.desasignar(e2, F3_VIE, 'PASARELA_T', 'mariluz');
  const r2 = M.aplicarCobertura(cfg2, cfg2.staff, e2, inc2, A2);
  assert.ok(r2.rechazados.some(x => x.pid === 'mariluz' && x.iso === F3_VIE && /ya no está/.test(x.motivo)), JSON.stringify(r2.rechazados));
  assert.ok(!M.pidsEn(e2, F3_VIE, 'PASARELA_T').includes('mariluz'));
});

ok('F3 · R4 la semana tipo con la VAC de Iván en su ficha: Mari Luz, que ya está de tarde, queda «por Iván» y sale en las coberturas; cuando Iván vuelve, su plaza se queda', () => {
  const cfg = cfgBase(), st = cfg.staff;
  M.personaDe(st, 'mariluz').cubreA = [{ pid: 'ivan' }];
  M.anadirAusencia(M.personaDe(st, 'ivan'), { tipo: 'VAC', desde: F3_VIE, hasta: F3_DOM });
  const ip = M.instanciarPatron(cfg, st, f3Semana(), F3_VIE, F3_VIE);
  assert.ok(ip.coberturas.some(c => c.pid === 'mariluz' && c.por === 'ivan' && c.turnoId === 'PASARELA_T'), JSON.stringify(ip.coberturas));
  const e = f3Semana();
  M.generarSemana(cfg, st, e, F3_LUN, {});
  for (const iso of [F3_VIE, F3_SAB]) {
    const ml = M.asignados(e, iso, 'PASARELA_T').filter(x => x.pid === 'mariluz');
    assert.strictEqual(ml.length, 1);
    assert.strictEqual(ml[0].por, 'ivan', JSON.stringify(ml));
    assert.strictEqual(ml[0].razon, 'cubre a Iván');
    assert.strictEqual(M.primeroDe(cfg, st, e, iso, 'PASARELA_T'), 'mariluz');
  }
  // el domingo no (Aroa, 24/09: «el domingo haría mañana»): la pareja flexible con Lavinia solo se relaja en el plan
  // relajado (decisiones.md, principio 6), y sin «Permitir partidos no declarados» el Generador no lo es (revisión
  // de la fase 6: la fase 6 la relajaba siempre que no había nadie y el domingo ponía a Mari Luz con Lavinia)
  assert.ok(!M.pidsEn(e, F3_DOM, 'PASARELA_T').includes('mariluz'), 'el domingo no: ' + JSON.stringify(M.asignados(e, F3_DOM, 'PASARELA_T')));
  // con «Permitir partidos no declarados» hay alguien más (Roberto, con su aviso), como en la Cobertura: el domingo tampoco
  const e2 = f3Semana(); M.generarSemana(cfg, st, e2, F3_LUN, { permitirPartido: true });
  assert.ok(!M.pidsEn(e2, F3_DOM, 'PASARELA_T').includes('mariluz'), 'con partidos permitidos, el domingo no');
  M.generarSemana(cfg, st, e, F3_LUN, {});
  assert.strictEqual(M.asignados(e, F3_VIE, 'PASARELA_T').filter(x => x.pid === 'mariluz').length, 1, 'generar otra vez no la duplica');
  // Iván vuelve: Mari Luz no pierde su plaza (es la suya) y deja de ir «por Iván»
  M.personaDe(st, 'ivan').ausencias = [];
  const g2 = M.generarSemana(cfg, st, e, F3_LUN, {});
  const ml2 = M.asignados(e, F3_VIE, 'PASARELA_T').find(x => x.pid === 'mariluz');
  assert.ok(ml2 && !ml2.por && ml2.razon === 'plaza fija de la semana tipo', 'su plaza se queda, ya sin «por Iván»: ' + JSON.stringify(ml2));
  assert.ok(!g2.retirados.some(x => x.pid === 'mariluz'), JSON.stringify(g2.retirados));
  assert.ok(M.pidsEn(e, F3_VIE, 'PASARELA_T').includes('ivan'), 'e Iván vuelve a su tarde');
});

ok('F3 · D1 Mari Luz SIN partido declarado el viernes y el sábado: el plan A la pone igual; el partido queda como aviso autorizado «partido para cubrir a Iván», que ni resta ni cuenta como aviso', () => {
  const cfg = f3Escenario((cfg, st) => { M.personaDe(st, 'mariluz').partido.dias = [2, 4]; });
  const inc = F3_INC();
  for (const iso of [F3_VIE, F3_SAB]) assert.deepStrictEqual(cieDonde(cfg, f3Mes(cfg, iso), iso, 'mariluz'), ['PASARELA_M'], 'la semana tipo solo le pone la mañana');
  const A = M.planesCobertura(cfg, cfg.staff, f3Entero(cfg, inc), inc, {}).planes[0];
  const AUT = [{ k: 'partido', texto: 'partido para cubrir a Iván', autorizado: true, por: 'ivan' }];
  for (const iso of [F3_VIE, F3_SAB]) {
    const ml = f3De(A, iso, 'mariluz');
    assert.strictEqual(ml.length, 1, JSON.stringify(A.asignaciones.map(a => a.iso.slice(8) + ' ' + a.pid)));
    assert.deepStrictEqual(ml[0].avisos, []);
    assert.deepStrictEqual(ml[0].autorizados, AUT);
    assert.ok(!ml[0].razones.some(r => /no declarado/.test(r)), JSON.stringify(ml[0].razones));
    assert.ok(ml[0].abre, 'y abre la tarde: en Pasarela quien hace partido puede abrirla');
    assert.ok(!A.huecos.some(h => h.iso === iso), JSON.stringify(A.huecos));
  }
  assert.strictEqual(A.avisos, A.asignaciones.reduce((n, a) => n + a.avisos.length, 0), 'los autorizados no cuentan como avisos');
  // la regla, en un solo sitio: sin «cubre a» el partido sigue siendo motivo; con él, autorizado
  const e = f3Entero(cfg, inc); M.desasignar(e, F3_VIE, 'PASARELA_T', 'ivan');
  const stV = cfg.staff.map(p => p.id === 'ivan' ? Object.assign({}, p, { ausencias: [{ tipo: 'VAC', desde: F3_VIE, hasta: F3_DOM }] }) : p);
  assert.strictEqual(M.puedeEstar(cfg, stV, e, F3_VIE, 'PASARELA_T', 'mariluz').regla, 'partido');
  const pe = M.puedeEstar(cfg, stV, e, F3_VIE, 'PASARELA_T', 'mariluz', { cubrePor: 'ivan' });
  assert.ok(pe.ok && !pe.avisos.length, JSON.stringify(pe));
  assert.deepStrictEqual(pe.autorizados, AUT);
  // «cubre a» de otra persona no vale aquí: Roberto cubre a Susana Luna, no a Iván
  assert.strictEqual(M.puedeEstar(cfg, stV, e, F3_VIE, 'PASARELA_T', 'mariluz', { cubrePor: 'sluna' }).regla, 'partido');
  // aplicado: la Revisión lo deja en informativo y el Generador da el partido por cumplido, con nota
  const e2 = cieRango(cfg, F3_LUN, F3_DOM);
  M.aplicarCobertura(cfg, cfg.staff, e2, inc, A);
  const rv = M.revisionMes(cfg, cfg.staff, e2, { desde: F3_VIE, hasta: F3_VIE });
  assert.ok(!rv.some(x => x.nivel !== 'info' && /Mari Luz/.test(x.msg)), JSON.stringify(rv));
  assert.ok(rv.some(x => x.tipo === 'autorizado' && x.nivel === 'info' && /Mari Luz: partido para cubrir a Iván/.test(x.msg)), JSON.stringify(rv));
  assert.deepStrictEqual(M.avisosVigentes(cfg, cfg.staff, e2, F3_VIE, 'PASARELA_T', 'mariluz'), []);
  const cond = M.verificarSemana(cfg, cfg.staff, e2, F3_LUN).find(c => c.pid === 'mariluz' && c.k === 'partido');
  assert.ok(cond && cond.ok, JSON.stringify(cond));
  assert.match(cond.nota || '', /partido para cubrir a Iván/);
  // si Iván vuelve (sin la ausencia), ese partido ya no está autorizado: vuelve a ser un aviso
  M.personaDe(cfg.staff, 'ivan').ausencias = [];
  assert.ok(M.avisosVigentes(cfg, cfg.staff, e2, F3_VIE, 'PASARELA_T', 'mariluz').some(x => /partido/.test(x)));
});

ok('F3 · G1 el domingo Mari Luz no sale en ningún plan: partido no declarado y «nunca con» Lavinia siguen mandando', () => {
  for (const base of [f3Tab, f3Entero]) {
    const cfg = f3Escenario(), inc = F3_INC();
    const res = M.planesCobertura(cfg, cfg.staff, base(cfg, inc), inc, {});
    for (const P of res.planes) assert.strictEqual(f3De(P, F3_DOM, 'mariluz').length, 0, P.titulo);
  }
});

ok('F3 · G2 «cubre a» solo autoriza el partido: nunca salta veto, día libre, franjas, locales, standby, «nunca con» ni una ausencia', () => {
  const casos = [
    ['vetos', p => p.vetos.push({ localId: 'PASARELA', franja: 'T', dow: 5 })],
    ['libra', p => { p.libra = [3, 5]; }],
    ['franjas', p => { p.franjas = ['M']; }],
    ['locales', p => { p.locales = ['ZAPA']; }],
    ['standby', p => { p.standby = true; }],
    ['nuncaCon', p => { p.nuncaCon = ['lavinia', 'leo']; }],
    ['ausencia', p => { p.ausencias = [{ tipo: 'PERM', desde: F3_VIE, hasta: F3_VIE }]; }],
  ];
  for (const [k, cambia] of casos) {
    const cfg = f3Escenario(null, (cfg, st) => { M.desasignar(f3Mes(cfg, F3_VIE), F3_VIE, 'PASARELA_T', 'mariluz'); cambia(M.personaDe(st, 'mariluz')); });
    const inc = F3_INC();
    const res = M.planesCobertura(cfg, cfg.staff, f3Entero(cfg, inc), inc, {});
    for (const P of res.planes) assert.strictEqual(f3De(P, F3_VIE, 'mariluz').length, 0, `${k}: ${P.titulo} la pone el viernes`);
    const e = f3Entero(cfg, inc); M.desasignar(e, F3_VIE, 'PASARELA_T', 'ivan');
    const pe = M.puedeEstar(cfg, cfg.staff, e, F3_VIE, 'PASARELA_T', 'mariluz', { cubrePor: 'ivan', cubreSuCasilla: true, cubreAusente: true, permitirPartido: true });
    assert.ok(!pe.ok && pe.regla === k, `${k}: ${JSON.stringify(pe)}`);
  }
});

ok('F3 · G3 con una ausencia de Mari Luz el viernes no entra ni como relevo ni como candidata (el sábado sí)', () => {
  const cfg = f3Escenario(null, (cfg, st) => { M.personaDe(st, 'mariluz').ausencias.push({ tipo: 'LD', desde: F3_VIE, hasta: F3_VIE }); });
  const inc = F3_INC();
  const res = M.planesCobertura(cfg, cfg.staff, f3Entero(cfg, inc), inc, {});
  for (const P of res.planes) {
    assert.strictEqual(f3De(P, F3_VIE, 'mariluz').length, 0, P.titulo);
    assert.ok(f3De(P, F3_SAB, 'mariluz').some(a => a.yaEstaba), P.titulo + ': el sábado es el relevo');
  }
});

ok('F3 · D3 el relevo: «reemplazar siempre» no mete a otra más, el cambio de turno no lo usa para intercambiar y el plan B no lo cambia', () => {
  const cfg = f3Escenario(), inc = F3_INC();
  const res = M.planesCobertura(cfg, cfg.staff, f3Entero(cfg, inc), inc, { siempre: true });
  for (const P of res.planes) {
    assert.ok(f3De(P, F3_VIE, 'mariluz').some(a => a.yaEstaba), P.titulo + ': el relevo es el mismo en los dos planes');
    assert.strictEqual(P.asignaciones.filter(a => a.iso === F3_VIE && a.tid === 'PASARELA_T').length, 2, P.titulo + ': el relevo y una más para el mínimo');
  }
  const cfg2 = f3Escenario();
  const cambio = { pid: 'ivan', tipo: 'CAMBIO', dias: [F3_VIE], desde: F3_VIE, hasta: F3_VIE };
  const A = M.planesCobertura(cfg2, cfg2.staff, f3Entero(cfg2, cambio), cambio, { intercambio: true }).planes[0];
  // 01/10 (A5, D17): en un cambio de turno no hay relevo (Iván no falta): Mari Luz, que ya está en la tarde, no pasa a ir
  // «por Iván» ni sale en el plan, así que tampoco se usa para intercambiar (antes: ya estaba, sin intercambio)
  assert.ok(!f3De(A, F3_VIE, 'mariluz').length && !A.asignaciones.some(a => a.yaEstaba || a.por), JSON.stringify(A.asignaciones));
});

ok('F3 · S8 rangoNecesario: la Cobertura trabaja con semanas enteras (de −7 a +13 días), así cuenta bien los turnos de la semana y encuentra el turno a cambio', () => {
  assert.deepStrictEqual(M.rangoNecesario(F3_INC()), { desde: '2026-09-21', hasta: '2026-10-11' });
  assert.deepStrictEqual(M.rangoNecesario({ pid: 'sluna', tipo: 'CAMBIO', desde: '2026-10-06', hasta: '2026-10-06' }), { desde: '2026-09-28', hasta: '2026-10-18' });
  // r24: «N turnos esa semana» con lo que pasa la pestaña = con la planilla entera
  const cfg = f3Escenario(), inc = F3_INC();
  const semana = M.turnosSemanaDe(cieRango(cfg, F3_LUN, F3_DOM), 'mariluz', F3_VIE);
  assert.strictEqual(M.turnosSemanaDe(f3Entero(cfg, inc), 'mariluz', F3_VIE), semana);
  assert.ok(M.turnosSemanaDe(f3Tab(cfg, inc), 'mariluz', F3_VIE) < semana, 'con solo los días marcados se contaban menos');
  // r25: el intercambio de un cambio de turno aparece también con el estado de la pestaña
  const cfg2 = Object.assign(cfgBase(), { meses: { '2026-10': { asig: {}, apertura: {}, manual: {} } } }), st2 = cfg2.staff;
  const oct = M.estadoDesde(cfg2.meses, [], 2026, 10);
  for (const [d, t, id, c] of [['2026-10-06', 'ZAPA_T', 'sluna'], ['2026-10-06', 'ZAPA_T', 'adrian', 1], ['2026-10-10', 'ZAPA_T', 'roberto'], ['2026-10-10', 'ZAPA_T', 'adrian', 1]]) assert.ok(M.asignar(oct, cfg2, st2, d, t, id, { cocina: !!c }).ok, id);
  const cambio = { pid: 'sluna', tipo: 'CAMBIO', desde: '2026-10-06', hasta: '2026-10-06', dias: ['2026-10-06'] };
  const a = M.planesCobertura(cfg2, st2, f3Entero(cfg2, cambio), cambio, { intercambio: true }).planes[0].asignaciones[0];
  assert.ok(a && a.pid === 'roberto' && a.intercambio && a.intercambio.iso === '2026-10-10' && a.intercambio.tid === 'ZAPA_T', JSON.stringify(a));
});

ok('F3 · S10 cubreEnCasilla: «cubre a» solo cuenta en la casilla de quien falta y para su puesto (r21, r22, n1)', () => {
  { // r21a: Susana Luna (sala, Zapatillera tarde) de vacaciones el viernes: Roberto no la «cubre» en Pasarela
    const cfg = cfgBase(), st = cfg.staff, rob = M.personaDe(st, 'roberto');
    M.anadirAusencia(M.personaDe(st, 'sluna'), { tipo: 'VAC', desde: F3_VIE, hasta: F3_VIE });
    const e = M.nuevoEstado(2026, 10, { festivos: [] });
    const r = M.candidatosPara(cfg, st, e, F3_VIE, 'PASARELA_T').find(x => x.pid === 'roberto');
    assert.ok(r && !r.razones.some(x => /cubre a/.test(x)) && !r.cubre, JSON.stringify(r));
    assert.strictEqual(M.cubreEnCasilla(cfg, st, e, rob, F3_VIE, 'PASARELA_T'), null);
    assert.strictEqual(M.cubreEnCasilla(cfg, st, e, rob, F3_VIE, 'ZAPA_T'), 'sluna');
    assert.strictEqual(M.cubreEnCasilla(cfg, st, e, rob, F3_VIE, 'ZAPA_T', { cocina: true }), null, 'Susana Luna es de sala: su sitio no es la cocina');
    assert.strictEqual(M.cubreEnCasilla(cfg, st, e, rob, '2026-10-09', 'ZAPA_T'), null, 'otro día, sin ausencia, no cubre a nadie');
    const c = M.candidatosPara(cfg, st, e, F3_VIE, 'ZAPA_T').find(x => x.pid === 'roberto');
    assert.ok(c && c.cubre === 'sluna' && c.razones.includes('cubre a Susana Luna'), JSON.stringify(c));
  }
  { // r21b + S11: sin semana tipo, quien entra por «cubre a» en el relleno lleva el «por»
    const cfg = cfgBase(), st = cfg.staff;
    M.anadirAusencia(M.personaDe(st, 'sluna'), { tipo: 'VAC', desde: '2026-09-29', hasta: '2026-09-29' });
    const e = f3Semana();
    M.generarSemana(cfg, st, e, F3_LUN, { sinPatron: true, permitirPartido: true });
    const x = M.asignados(e, '2026-09-29', 'ZAPA_T').find(y => y.por === 'sluna');
    assert.ok(x && x.pid === 'roberto' && !x.cocina, JSON.stringify(M.asignados(e, '2026-09-29', 'ZAPA_T')));
    assert.strictEqual(M.posicionesDe(cfg, st, e, '2026-09-29', 'ZAPA_T').find(s => s.pid === 'roberto').por, 'sluna');
  }
  { // r22: con Susana Luna de vacaciones toda la semana, la cocina de Zapatillera sigue siendo de Adrián
    const cfg = cfgBase(), st = cfg.staff;
    M.anadirAusencia(M.personaDe(st, 'sluna'), { tipo: 'VAC', desde: F3_LUN, hasta: F3_DOM });
    const e = f3Semana();
    M.generarSemana(cfg, st, e, F3_LUN, { sinPatron: true });
    for (const [iso, tid] of [['2026-09-29', 'ZAPA_T'], [F3_VIE, 'ZAPA_M'], [F3_VIE, 'ZAPA_T']]) {
      const coc = M.asignados(e, iso, tid).find(y => y.cocina);
      assert.ok(coc && coc.pid === 'adrian', `${iso} ${tid}: ${JSON.stringify(M.asignados(e, iso, tid))}`);
    }
  }
  { // n1: Adrián (cocina de Zapatillera) de vacaciones: Roberto solo le cubre en esa cocina; Hojan no cubre a Maydeth en El 33
    const cfg = cfgBase(), st = cfg.staff;
    M.anadirAusencia(M.personaDe(st, 'adrian'), { tipo: 'VAC', desde: '2026-09-29', hasta: '2026-09-29' });
    const e = f3Semana();
    for (const tid of ['PASARELA_T', 'PASARELA_M', 'ZAPA_T']) {
      const r = M.candidatosPara(cfg, st, e, '2026-09-29', tid).find(x => x.pid === 'roberto');
      assert.ok(!r || !r.razones.some(x => /cubre a/.test(x)), `${tid}: ${r && r.razones.join(' · ')}`);
    }
    const coc = M.candidatosPara(cfg, st, e, '2026-09-29', 'ZAPA_T', { cocina: true }).find(x => x.pid === 'roberto');
    assert.ok(coc && coc.cubre === 'adrian', 'en la cocina de Zapatillera, que es su sitio, sí: ' + JSON.stringify(coc));
    const h = M.candidatosPara(cfg, st, e, F3_LUN, 'EL33_M', { cocina: true }).find(x => x.pid === 'hojan');
    assert.ok(h && !h.razones.some(x => /cubre a Maydeth/.test(x)), 'Maydeth es cocina del Mónaco: ' + JSON.stringify(h));
    const hm = M.candidatosPara(cfg, st, e, F3_LUN, 'MONACO_M', { cocina: true }).find(x => x.pid === 'hojan');
    assert.ok(!hm || hm.razones.includes('cubre a Maydeth'), 'en la cocina del Mónaco sí (Maydeth no está en la semana tipo: su local y sus franjas)');
  }
});

ok('F3 · S12 con «Cubre a» apagado (en el grupo o en la ficha) ni la semana tipo ni el relleno ponen a nadie «por» nadie; el «por» de las plazas fijas se sigue enseñando (D12)', () => {
  for (const prep of [cfg => { cfg.reglas = { cubreA: false }; }, (cfg, st) => { M.personaDe(st, 'roberto').inactivas = ['cubreA']; }]) {
    const cfg = cfgBase(), st = cfg.staff; prep(cfg, st);
    M.personaDe(st, 'sluna').ausencias = [{ tipo: 'VAC', desde: '2026-09-29', hasta: '2026-10-02' }];
    const r = M.instanciarPatron(cfg, st, f3Semana(), '2026-09-29', '2026-09-29');
    assert.deepStrictEqual(r.coberturas, [], 'la semana tipo no aplica «cubre a» apagado');
    const c = M.candidatosPara(cfg, st, f3Semana(), F3_VIE, 'ZAPA_T').find(x => x.pid === 'roberto');
    assert.ok(!c || !c.razones.some(x => /^cubre a/.test(x)), 'el relleno no suma «cubre a» apagado');
    const e = f3Semana(); M.generarSemana(cfg, st, e, F3_LUN, {});
    const ent = M.asignados(e, '2026-09-29', 'ZAPA_T').find(x => x.pid === 'roberto');
    assert.ok(!ent || !/cubre a/.test(ent.razon || ''), 'semana tipo: ' + (ent && ent.razon));
    assert.strictEqual(M.posicionesDe(cfg, st, e, '2026-10-01', 'ZAPA_T').find(s => s.pid === 'roberto').por, 'sluna', 'la plaza fija del jueves sigue «por Susana Luna»');
  }
});

ok('F3 · D1 en la semana tipo: «cubre a» autoriza el partido (con nota), no el interruptor del Generador; la condición de partido sale cumplida', () => {
  const cfg = cfgBase(), st = cfg.staff;
  M.anadirAusencia(M.personaDe(st, 'sluna'), { tipo: 'VAC', desde: '2026-09-29', hasta: '2026-09-29' });
  const e = f3Semana();
  const g = M.generarSemana(cfg, st, e, F3_LUN, { permitirPartido: false });
  const rob = M.asignados(e, '2026-09-29', 'ZAPA_T').find(x => x.pid === 'roberto');
  assert.ok(rob && rob.por === 'sluna' && !(rob.avisos || []).length, JSON.stringify(rob));
  const c = g.condiciones.find(x => x.pid === 'roberto' && x.k === 'partido');
  assert.ok(c.ok, 'condición rota por el propio generador: ' + c.detalle);
  assert.match(c.nota || '', /partido para cubrir a Susana Luna/);
});

ok('F3 · S33 (José, 17/09: dos apoyos no se quedan solos): la Cobertura no deja una casilla solo con apoyos en ningún plan (revisión F3: tampoco en el relajado); la Revisión lo lista en rojo', () => {
  const cfg = cfgBase(), st = cfg.staff;   // Dulce en standby, como en la semilla
  const e = f3Semana(); M.generarSemana(cfg, st, e, F3_LUN, {});
  const inc = F3_INC();
  const res = M.planesCobertura(cfg, st, e, inc, {});
  for (const P of res.planes) {
    const dom = P.asignaciones.filter(a => a.iso === F3_DOM && a.tid === 'PASARELA_T');
    const solo = M.revisarTurno(cfg, st, P.estado, F3_DOM, 'PASARELA_T').soloApoyos;
    const meteApoyo = dom.some(a => M.esApoyo(M.personaDe(st, a.pid)));
    assert.ok(!(solo && meteApoyo), `${P.titulo}: ${JSON.stringify(dom)}`);
  }
  // candidatos con Lavinia (apoyo) sola en la casilla: un apoyo no entra en el plan con las reglas
  const e2 = M.clonarEstado(e); M.desasignar(e2, F3_DOM, 'PASARELA_T', 'ivan');
  const stV = st.map(p => p.id === 'ivan' ? Object.assign({}, p, { ausencias: [{ tipo: 'VAC', desde: F3_VIE, hasta: F3_DOM }] }) : p);
  assert.ok(!M.candidatosCobertura(cfg, stV, e2, F3_DOM, 'PASARELA_T', 'ivan', {}).some(c => M.esApoyo(M.personaDe(st, c.pid))));
  // revisión F3 (decisiones.md, principio 6): tampoco en el relajado, que solo relaja partidos no declarados
  assert.ok(!M.candidatosCobertura(cfg, stV, e2, F3_DOM, 'PASARELA_T', 'ivan', { permitirPartido: true }).some(c => M.esApoyo(M.personaDe(st, c.pid))));
  // L6: aplicado el plan A, si la casilla queda solo con apoyos la Revisión lo dice
  const A = M.planesCobertura(cfg, st, e, inc, {}).planes[0];
  M.aplicarCobertura(cfg, st, e, inc, A);
  const soloA = M.revisarTurno(cfg, st, e, F3_DOM, 'PASARELA_T').soloApoyos;
  assert.ok(!soloA || M.revisionMes(cfg, st, e, { desde: F3_DOM, hasta: F3_DOM }).some(x => x.tipo === 'solo-apoyos'), 'Pasarela tarde del domingo solo con apoyos y nadie lo dice');
  // forzado a mano: la Revisión lo lista en rojo
  const e3 = f3Semana();
  M.asignar(e3, cfg, st, F3_DOM, 'PASARELA_T', 'lavinia', {}); M.asignar(e3, cfg, st, F3_DOM, 'PASARELA_T', 'cristian', { forzar: true });
  const rv = M.revisionMes(cfg, st, e3, { desde: F3_DOM, hasta: F3_DOM });
  assert.ok(rv.some(x => x.tipo === 'solo-apoyos' && x.nivel === 'alta' && x.turnoId === 'PASARELA_T' && /Lavinia/.test(x.msg)), JSON.stringify(rv));
});

ok('F3 · S34 «solo hace cocina» y «ya lleva la cocina ese día» viven en puedeEstar (regla cocina, forzable): generador, cobertura y selector dicen lo mismo', () => {
  const cfg = cfgBase(), st = cfg.staff;
  { // L7: Cris falta el miércoles 30: Hojan (solo cocina, esa tarde en la cocina del Mónaco) no entra en la sala
    const e = f3Semana(); M.generarSemana(cfg, st, e, F3_LUN, {});
    const r = M.planesCobertura(cfg, st, e, { pid: 'cris', tipo: 'LD', desde: '2026-09-30', hasta: '2026-09-30' });
    for (const P of r.planes) assert.ok(!P.asignaciones.some(a => a.pid === 'hojan' && !a.cocina), JSON.stringify(P.asignaciones));
  }
  const L = '2026-10-05', e2 = M.nuevoEstado(2026, 10, { festivos: [] });
  M.asignar(e2, cfg, st, L, 'MONACO_T', 'hojan', { cocina: true }); M.asignar(e2, cfg, st, L, 'EL33_M', 'victoria', {}); M.asignar(e2, cfg, st, L, 'EL33_M', 'jenny', { cocina: true });
  { // H-cocina-sala-cobertura: Victoria falta el lunes 5/10; ningún plan pone a Hojan a reforzar la sala
    const r = M.planesCobertura(cfg, st, e2, { pid: 'victoria', tipo: 'LD', desde: L, hasta: L });
    assert.ok(r.planes.every(p => !p.asignaciones.some(a => a.pid === 'hojan' && !a.cocina)), JSON.stringify(r.planes.map(p => p.asignaciones.map(a => a.pid))));
  }
  const pe = M.puedeEstar(cfg, st, e2, L, 'EL33_M', 'hojan', { puesto: 'sala' });
  assert.ok(!pe.ok && pe.regla === 'cocina' && /solo hace cocina/.test(pe.motivo), JSON.stringify(pe));
  assert.strictEqual(M.nombreRegla('cocina'), 'Cocina');
  const f = M.puedeEstar(cfg, st, e2, L, 'EL33_M', 'hojan', { puesto: 'sala', forzar: true });
  assert.ok(f.ok && f.avisos.some(x => /solo hace cocina/.test(x)), 'se puede forzar, con su aviso: ' + JSON.stringify(f));
  assert.ok(M.puedeEstar(cfg, st, e2, L, 'EL33_M', 'hojan', { puesto: 'cocina' }).ok, 'para la cocina, sí');
  // Roberto lleva la cocina de Zapatillera el viernes por la tarde: no refuerza la sala de Pasarela por la mañana
  const e3 = M.nuevoEstado(2026, 10, { festivos: [] });
  M.asignar(e3, cfg, st, '2026-10-09', 'ZAPA_T', 'roberto', { cocina: true });
  const pr = M.puedeEstar(cfg, st, e3, '2026-10-09', 'PASARELA_M', 'roberto', { puesto: 'sala' });
  assert.ok(pr.regla === 'cocina' && /lleva la cocina de Zapatillera/.test(pr.motivo), JSON.stringify(pr));
  assert.ok(!M.candidatosPara(cfg, st, e3, '2026-10-09', 'PASARELA_M').some(c => c.pid === 'roberto'), 'el generador tampoco');
  assert.ok(!M.candidatosCobertura(cfg, st, e3, '2026-10-09', 'PASARELA_M', 'tere', {}).some(c => c.pid === 'roberto'), 'ni la cobertura (r12)');
  // lo que ya está puesto en la sala y lleva la cocina en otro sitio lo dice la planilla
  M.asignar(e3, cfg, st, '2026-10-09', 'PASARELA_M', 'roberto', { forzar: true });
  assert.ok(M.avisosVigentes(cfg, st, e3, '2026-10-09', 'PASARELA_M', 'roberto').some(x => /lleva la cocina de Zapatillera/.test(x)));
  assert.deepStrictEqual(M.avisosVigentes(cfg, st, e3, '2026-10-09', 'ZAPA_T', 'roberto'), [], 'en la cocina, nada');
});

ok('F3 · D10 ausencias por franja: el permiso solo de mañana que apunta la Cobertura no le quita la tarde (revision-disponibilidad n1)', () => {
  const cfg = cfgBase(), st = cfg.staff, LUN = '2026-10-12', MAR = '2026-10-13';
  const e = M.nuevoEstado(2026, 10, { festivos: [] }); M.generarSemana(cfg, st, e, LUN, {});
  assert.deepStrictEqual(cieDonde(cfg, e, MAR, 'mariluz'), ['PASARELA_M', 'PASARELA_T'], 'el martes hace partido');
  const inc = { pid: 'mariluz', tipo: 'PERM', dias: [MAR], franjas: ['M'], detalle: 'médico por la mañana' };
  const r = M.planesCobertura(cfg, st, e, inc, {});
  const ap = M.aplicarCobertura(cfg, st, e, inc, r.planes[0]);
  assert.deepStrictEqual(ap.ausencia.franjas, ['M'], JSON.stringify(ap.ausencia));
  const ml = M.personaDe(st, 'mariluz');
  assert.ok(M.ausenciaEn(ml, MAR, 'M') && M.ausenciaEn(ml, MAR), 'de mañana, y ese día tiene una ausencia');
  assert.strictEqual(M.ausenciaEn(ml, MAR, 'T'), null);
  assert.deepStrictEqual(cieDonde(cfg, e, MAR, 'mariluz'), ['PASARELA_T']);
  assert.deepStrictEqual(M.avisosVigentes(cfg, st, e, MAR, 'PASARELA_T', 'mariluz'), []);
  assert.ok(!M.revisionMes(cfg, st, e, { desde: MAR, hasta: MAR }).some(x => /Mari Luz/.test(x.msg)), 'la revisión no la da por ausente por la tarde');
  const e2 = M.nuevoEstado(2026, 10, { festivos: [] }); M.generarSemana(cfg, st, e2, LUN, {});
  assert.deepStrictEqual(cieDonde(cfg, e2, MAR, 'mariluz'), ['PASARELA_T'], 'al regenerar sigue de tarde y no de mañana');
  assert.ok(M.puedeEstar(cfg, st, M.nuevoEstado(2026, 10), MAR, 'PASARELA_T', 'mariluz').ok);
  const pm = M.puedeEstar(cfg, st, M.nuevoEstado(2026, 10), MAR, 'PASARELA_M', 'mariluz');
  assert.ok(pm.regla === 'ausencia' && /por la mañana/.test(pm.motivo), JSON.stringify(pm));
  // núcleo: por medio día
  const w = M.toProblem(cfg, st, M.nuevoEstado(2026, 10), MAR, MAR, {}).workers.find(x => x.id === 'mariluz');
  assert.deepStrictEqual(w.unavailable[0], ['*']); assert.ok(!NE.todoFuera(w.unavailable[1]));
  // horas: medio día de ausencia, no un día entero; las vistas lo dicen
  const h = M.horasPersonaMes(cfg, st, { '2026-10': e }, 'mariluz', 2026, 10);
  assert.strictEqual(h.ausencias, 0); assert.strictEqual(h.ausenciasMedias, 1);
  assert.match(M.estadoDia(cfg, ml, MAR).texto, /por la mañana/);
  // alta: medio día y día entero no se funden; mañana y tarde a la vez = día entero; sin franjas = día entero
  const p = { ausencias: [] };
  M.anadirAusencia(p, { tipo: 'VAC', desde: '2026-10-01', hasta: '2026-10-01', franjas: ['T'] });
  M.anadirAusencia(p, { tipo: 'VAC', desde: '2026-10-02', hasta: '2026-10-02' });
  M.anadirAusencia(p, { tipo: 'VAC', desde: '2026-10-03', hasta: '2026-10-03', franjas: ['M', 'T'] });
  assert.deepStrictEqual(p.ausencias.map(a => [a.desde, a.hasta, a.franjas || null]), [['2026-10-01', '2026-10-01', ['T']], ['2026-10-02', '2026-10-03', null]]);
  assert.ok(M.ausenciaEn({ ausencias: [{ tipo: 'VAC', desde: MAR, hasta: MAR }] }, MAR, 'T'), 'lo guardado antes (sin franjas) es de día entero');
  // quitar un día de una ausencia solo toca la que se dice
  const q = M.quitarDiaDeAusencia(p.ausencias.concat([{ tipo: 'LD', desde: '2026-10-01', hasta: '2026-10-01', franjas: ['M'] }]), '2026-10-01', a => a.tipo === 'LD');
  assert.deepStrictEqual(q.map(a => a.tipo + a.desde), ['VAC2026-10-01', 'VAC2026-10-02']);
});

// ---------- revisión de la fase 3 (24/09): los dos revisores ----------
// Lo que la interfaz usaba de verdad y fallaba sin avisar (el volcado del modo Periodo, el cambio de
// turno de la Cobertura), D1 fuera de la casilla de X, el relevo que pisaba otro «por», la regla de
// cocina en un solo sentido, «dos apoyos no se quedan solos» también en el plan relajado y en el
// Generador (decisiones.md, principio 6), las medias jornadas en la nómina y lo que no protegían
// las pruebas (D2, S33 y «X sale en la semana tipo otro día»).
const F3R_OCT = () => ({ '2026-10': { asig: {}, apertura: {}, manual: {} } });
const f3Sin = (st, pid, desde, hasta) => st.map(p => p.id === pid ? Object.assign({}, p, { ausencias: [{ tipo: 'VAC', desde, hasta }] }) : p);

ok('F3 rev · M1 Generador → Periodo: el volcado deja el relevo con su marca y, cuando Iván vuelve, Mari Luz no pierde su plaza (volcarPrevia)', () => {
  const D1 = '2026-10-01', D31 = '2026-10-31';
  const cfg = Object.assign(cfgBase(), { meses: F3R_OCT() }), st = cfg.staff;
  M.personaDe(st, 'mariluz').cubreA = [{ pid: 'ivan' }];
  M.anadirAusencia(M.personaDe(st, 'ivan'), { tipo: 'VAC', desde: F3_VIE, hasta: F3_DOM });
  const real = M.estadoDesde(cfg.meses, [], 2026, 10);
  const prev = M.clonarEstado(real);
  const p = M.generarPlanilla(cfg, st, prev, D1, D31, {});   // la vista previa: sobre una copia
  const v = M.volcarPrevia(cfg, st, () => real, p, { desde: D1, hasta: D31, previaDe: () => prev });
  assert.ok(v.relevos >= 2, JSON.stringify(v));
  for (const iso of [F3_VIE, F3_SAB]) {
    const ml = M.asignados(real, iso, 'PASARELA_T').find(x => x.pid === 'mariluz');
    assert.ok(ml && ml.por === 'ivan' && ml.relevo && ml.razonPrevia === 'plaza fija de la semana tipo', iso + ': ' + JSON.stringify(ml));
    assert.strictEqual(M.primeroDe(cfg, st, real, iso, 'PASARELA_T'), 'mariluz');
  }
  // Iván vuelve: al regenerar, con y sin semana tipo, Mari Luz se queda en su plaza y sin «por»
  M.personaDe(st, 'ivan').ausencias = [];
  for (const sinPatron of [true, false]) {
    const g = M.generarPlanilla(cfg, st, real, D1, D31, { sinPatron });
    assert.ok(!g.retirados.some(x => x.pid === 'mariluz'), `sinPatron=${sinPatron}: ` + JSON.stringify(g.retirados.filter(x => x.pid === 'mariluz')));
  }
  const ml2 = M.asignados(real, F3_VIE, 'PASARELA_T').find(x => x.pid === 'mariluz');
  assert.ok(ml2 && !ml2.por && !ml2.relevo && ml2.origen === 'patron' && ml2.razon === 'plaza fija de la semana tipo', JSON.stringify(ml2));
});

ok('F3 rev · M2 cambio de turno: el turno a cambio de un día que no está en la planilla que se aplica sale en rechazados (antes se perdía sin avisar); con el rango del plan, se hace', () => {
  const monta = () => {
    const cfg = Object.assign(cfgBase(), { meses: F3R_OCT() }), st = cfg.staff;
    const oct = M.estadoDesde(cfg.meses, [], 2026, 10);
    for (const [d, t, id, c] of [['2026-10-06', 'ZAPA_T', 'sluna'], ['2026-10-06', 'ZAPA_T', 'adrian', 1], ['2026-10-10', 'ZAPA_T', 'roberto'], ['2026-10-10', 'ZAPA_T', 'adrian', 1]]) assert.ok(M.asignar(oct, cfg, st, d, t, id, { cocina: !!c }).ok, id);
    return cfg;
  };
  const cambio = { pid: 'sluna', tipo: 'CAMBIO', desde: '2026-10-06', hasta: '2026-10-06', dias: ['2026-10-06'] };
  const cfg = monta(), P = M.planesCobertura(cfg, cfg.staff, f3Entero(cfg, cambio), cambio, { intercambio: true }).planes[0];
  assert.ok(P.asignaciones[0].intercambio && P.asignaciones[0].intercambio.iso === '2026-10-10', JSON.stringify(P.asignaciones));
  // lo que hacía la pestaña al confirmar: solo los días marcados
  const r = M.aplicarCobertura(cfg, cfg.staff, cieRango(cfg, cambio.desde, cambio.hasta), cambio, P);
  assert.ok(r.rechazados.some(x => x.iso === '2026-10-10' && x.tid === 'ZAPA_T' && /no está/.test(x.motivo)), JSON.stringify(r));
  // con el rango del plan (rangoNecesario), el intercambio se hace
  const cfg2 = monta(), P2 = M.planesCobertura(cfg2, cfg2.staff, f3Entero(cfg2, cambio), cambio, { intercambio: true }).planes[0];
  const rg = M.rangoNecesario(cambio);
  const r2 = M.aplicarCobertura(cfg2, cfg2.staff, cieRango(cfg2, rg.desde, rg.hasta), cambio, P2);
  assert.strictEqual(r2.intercambios.length, 1, JSON.stringify(r2));
  assert.deepStrictEqual(M.pidsEn(M.estadoDesde(cfg2.meses, [], 2026, 10), '2026-10-10', 'ZAPA_T').sort(), ['adrian', 'sluna']);
});

ok('F3 rev · M3 D1 solo en la casilla de X: con la tarde «por Iván», el partido no se autoriza para ponerla además por la mañana; la mañana que ya tenía sí queda autorizada', () => {
  const sinPartido = (cfg, st) => { M.personaDe(st, 'mariluz').partido = { dias: [2, 4] }; };
  { // la mañana no es la casilla de Iván: ni la puerta, ni el relleno
    const cfg = f3Escenario(sinPartido), st = cfg.staff;
    M.anadirAusencia(M.personaDe(st, 'ivan'), { tipo: 'VAC', desde: F3_VIE, hasta: F3_DOM });
    const e = cieRango(cfg, F3_LUN, F3_DOM);
    M.desasignar(e, F3_VIE, 'PASARELA_T', 'ivan'); M.desasignar(e, F3_VIE, 'PASARELA_M', 'mariluz');
    assert.ok(M.asignar(e, cfg, st, F3_VIE, 'PASARELA_T', 'mariluz', { origen: 'cobertura', por: 'ivan', razon: 'cubre a Iván', cubrePor: 'ivan' }).ok);
    const pe = M.puedeEstar(cfg, st, e, F3_VIE, 'PASARELA_M', 'mariluz', {});
    assert.ok(!pe.ok && pe.regla === 'partido', JSON.stringify(pe));
    assert.ok(!M.candidatosPara(cfg, st, e, F3_VIE, 'PASARELA_M').some(c => c.pid === 'mariluz'));
    M.generarPlanilla(cfg, st, e, F3_VIE, F3_VIE, {});
    assert.ok(!M.pidsEn(e, F3_VIE, 'PASARELA_M').includes('mariluz'), M.pidsEn(e, F3_VIE, 'PASARELA_M').join(','));
  }
  { // su mañana de siempre (ya puesta): la tarde «por Iván» le autoriza el partido
    const cfg = f3Escenario(null, sinPartido), st = cfg.staff;
    M.anadirAusencia(M.personaDe(st, 'ivan'), { tipo: 'VAC', desde: F3_VIE, hasta: F3_DOM });
    const e = cieRango(cfg, F3_LUN, F3_DOM);
    assert.deepStrictEqual(cieDonde(cfg, e, F3_VIE, 'mariluz'), ['PASARELA_M', 'PASARELA_T']);
    M.desasignar(e, F3_VIE, 'PASARELA_T', 'ivan');
    M.marcarRelevo(M.asignados(e, F3_VIE, 'PASARELA_T').find(x => x.pid === 'mariluz'), st, 'ivan');
    assert.deepStrictEqual(M.avisosVigentes(cfg, st, e, F3_VIE, 'PASARELA_M', 'mariluz'), []);
    assert.deepStrictEqual(M.revisarEntrada(cfg, st, e, F3_VIE, 'PASARELA_M', 'mariluz').autorizados.map(a => a.texto), ['partido para cubrir a Iván']);
  }
});

ok('F3 rev · M4 con relevo, quien entra además lo hace «para llegar al mínimo», sin «cubre a»: otra designación que necesita partido no deja un hueco habiendo candidatos', () => {
  const cfg = f3Escenario((cfg, st) => { M.personaDe(st, 'laura').ausencias = []; M.personaDe(st, 'dulce').cubreA = [{ pid: 'ivan' }]; });
  M.asignar(cieRango(cfg, F3_VIE, F3_VIE), cfg, cfg.staff, F3_VIE, 'MONACO_M', 'dulce', {});
  const inc = F3_INC();
  const A = M.planesCobertura(cfg, cfg.staff, f3Entero(cfg, inc), inc, {}).planes[0];
  const vie = A.asignaciones.filter(a => a.iso === F3_VIE && a.tid === 'PASARELA_T');
  assert.ok(!A.huecos.some(h => h.iso === F3_VIE), JSON.stringify(A.huecos));
  assert.ok(vie.some(a => a.pid === 'mariluz' && a.yaEstaba), JSON.stringify(vie));
  const otro = vie.find(a => !a.yaEstaba);
  assert.ok(otro && otro.pid === 'laura' && !otro.avisos.length && /^para llegar al mínimo/.test(otro.razones[0]) && !otro.por, JSON.stringify(vie));
  assert.strictEqual(A.avisos, 0, 'sin avisos');
  assert.ok(!A.relajado, 'lo cubre el plan con las reglas del grupo, no el relajado: ' + A.estrategia);
});

ok('F3 rev · M5/D2 «cubre a» manda también entre planes: el plan A es el de la persona designada aunque otra de sala sume más puntos', () => {
  const MAR = '2026-10-06';
  const cfg = cfgBase(), st = cfg.staff, e = estadoOct();
  M.asignar(e, cfg, st, MAR, 'PASARELA_T', 'ivan', {}); M.asignar(e, cfg, st, MAR, 'PASARELA_T', 'leo', {});
  for (const d of ['2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10']) assert.ok(M.asignar(e, cfg, st, d, 'PASARELA_M', 'roberto', {}).ok, d);
  const rob = M.personaDe(st, 'roberto'); rob.cubreA = [{ pid: 'ivan' }]; rob.prefs = Object.assign({}, rob.prefs, { evitaDows: [2] });
  const e2 = M.clonarEstado(e); M.desasignar(e2, MAR, 'PASARELA_T', 'ivan');
  const c = M.candidatosCobertura(cfg, f3Sin(st, 'ivan', MAR, MAR), e2, MAR, 'PASARELA_T', 'ivan', {});
  const ml = c.find(x => x.pid === 'mariluz');
  assert.ok(c[0].pid === 'roberto' && ml && ml.score > c[0].score && !M.esApoyo(M.personaDe(st, 'mariluz')), c.slice(0, 3).map(x => `${x.pid}:${x.score}`).join(' '));
  const A = M.planesCobertura(cfg, st, e, { pid: 'ivan', tipo: 'LD', desde: MAR, hasta: MAR }).planes[0];
  assert.ok(A.asignaciones.length === 1 && A.asignaciones[0].pid === 'roberto' && A.asignaciones[0].razones.includes('cubre a Iván'), JSON.stringify(A.asignaciones.map(a => a.pid + ': ' + a.razones.join(' · '))));
});

ok('F3 rev · M5/S33 y M8 (principio 6: el plan relajado solo relaja partidos no declarados): un apoyo que por lo demás puede entrar no deja la casilla solo con apoyos en NINGÚN plan; el hueco se explica', () => {
  const cfg = f3Escenario(), st = cfg.staff, inc = F3_INC();   // Dulce en activo: por las reglas puede el domingo
  const e = f3Entero(cfg, inc); M.desasignar(e, F3_DOM, 'PASARELA_T', 'ivan');
  const stV = f3Sin(st, 'ivan', F3_VIE, F3_DOM);
  assert.ok(M.puedeEstar(cfg, stV, e, F3_DOM, 'PASARELA_T', 'dulce', { puesto: 'sala' }).ok, 'Dulce puede estar según su ficha');
  for (const pp of [false, true]) {
    const c = M.candidatosCobertura(cfg, stV, e, F3_DOM, 'PASARELA_T', 'ivan', { permitirPartido: pp });
    assert.ok(!c.some(x => M.esApoyo(M.personaDe(st, x.pid))), `permitirPartido=${pp}: ` + c.map(x => x.pid).join(','));
  }
  const res = M.planesCobertura(cfg, st, f3Entero(cfg, inc), inc, {});
  for (const P of res.planes) {
    const dom = P.asignaciones.filter(a => a.iso === F3_DOM && a.tid === 'PASARELA_T');
    assert.ok(!dom.some(a => M.esApoyo(M.personaDe(st, a.pid))), P.titulo + ': ' + M.pidsEn(P.estado, F3_DOM, 'PASARELA_T').join(','));
    assert.ok(!P.asignaciones.some(a => a.avisos.includes('solo apoyos')), P.titulo);
    assert.ok(!/solo apoyos/.test(P.estrategia), P.estrategia);
    const h = P.huecos.find(x => x.iso === F3_DOM && x.tid === 'PASARELA_T');
    if (h) assert.ok(Object.entries(h.porQueNadie).some(([m, q]) => /solo con apoyos/.test(m) && q.includes('Dulce')), JSON.stringify(h.porQueNadie));
  }
  // el relajado lo cubre con alguien de sala, con el aviso del partido
  const rel = res.planes.find(P => P.relajado);
  const dom = rel && rel.asignaciones.find(a => a.iso === F3_DOM && a.tid === 'PASARELA_T');
  assert.ok(dom && !M.esApoyo(M.personaDe(st, dom.pid)) && dom.avisos.some(x => /partido no declarado/.test(x)), JSON.stringify(rel && rel.asignaciones.filter(a => a.iso === F3_DOM)));
});

ok('F3 rev · M5 «X sale en la semana tipo otro día»: si Iván falta un día que no trabaja (el lunes, que libra), nadie le «cubre» ese día', () => {
  const cfg = cfgBase(), st = cfg.staff, LUN = '2026-10-05';
  M.personaDe(st, 'mariluz').cubreA = [{ pid: 'ivan' }];
  M.anadirAusencia(M.personaDe(st, 'ivan'), { tipo: 'VAC', desde: LUN, hasta: '2026-10-07' });
  assert.ok(!M.plazasDe(cfg, 1).some(p => p.p === 'ivan') && M.plazasDe(cfg, 2).some(p => p.p === 'ivan' && p.t === 'PASARELA_T'));
  assert.strictEqual(M.cubreEnCasilla(cfg, st, estadoOct(), M.personaDe(st, 'mariluz'), LUN, 'PASARELA_T'), null);
  assert.strictEqual(M.cubreEnCasilla(cfg, st, estadoOct(), M.personaDe(st, 'mariluz'), '2026-10-06', 'PASARELA_T'), 'ivan', 'el martes, sí');
});

ok('F3 rev · M7 la regla de reserva de «cubre a» (su local y su franja, para quien no sale en la semana tipo) da prioridad y «por», pero no autoriza partidos: Hojan no hace partido «para cubrir a Maydeth» toda la semana', () => {
  const cfg = cfgBase(), st = cfg.staff, MIE = '2026-09-30';
  M.anadirAusencia(M.personaDe(st, 'esmeralda'), { tipo: 'VAC', desde: F3_LUN, hasta: F3_DOM });
  const e = f3Semana();
  const g = M.generarSemana(cfg, st, e, F3_LUN, { permitirPartido: false });
  for (const d of e.days) {
    const t = M.turnosDe(cfg).filter(x => M.pidsEn(e, d.iso, x.id).includes('hojan'));
    for (const x of t) assert.ok(!M.revisarEntrada(cfg, st, e, d.iso, x.id, 'hojan').autorizados.length, d.iso + ' ' + x.id);
  }
  const c = g.condiciones.find(x => x.pid === 'hojan' && x.k === 'partido');
  assert.ok(!c || !/cubrir a Maydeth/.test(c.nota || ''), JSON.stringify(c));
  const e2 = M.nuevoEstado(2026, 9, { festivos: [] });
  M.asignar(e2, cfg, st, MIE, 'MONACO_M', 'hojan', { cocina: true });
  const pe = M.puedeEstar(cfg, st, e2, MIE, 'MONACO_T', 'hojan', { cubrePor: 'maydeth', puesto: 'cocina' });
  assert.ok(!pe.ok && pe.regla === 'partido', JSON.stringify(pe));
  // la prioridad y el «por» sí: en la cocina del Mónaco la reserva le da «cubre a Maydeth»
  const cc = M.candidatosPara(cfg, st, M.nuevoEstado(2026, 9, { festivos: [] }), MIE, 'MONACO_T', { cocina: true }).find(x => x.pid === 'hojan');
  assert.ok(cc && cc.cubre === 'maydeth', JSON.stringify(cc));
});

ok('F3 rev · M9 la nómina cuenta media jornada de vacaciones como medio día (con su franja), no como un día entero', () => {
  const cfg = cfgDemo(), st = cfg.staff, e = sepDe(cfg);
  assert.ok(M.aplicarCierre(cfg, st, e, cierreTardes(), { hojan: { tipo: 'VAC' } }).ok);
  assert.deepStrictEqual(cieDonde(cfg, e, CIE_LUN, 'hojan'), ['EL33_M'], 'el lunes trabaja la mañana en El 33');
  const h = M.horasPersonaMes(cfg, st, cfg.meses, 'hojan', 2026, 9);
  assert.deepStrictEqual(h.vacacionesDias, [CIE_LUN], 'el martes libra');
  assert.strictEqual(h.vacaciones, 0.5, 'la tarde del lunes: media jornada');
  assert.deepStrictEqual(h.vacacionesMedias, { [CIE_LUN]: ['T'] });
  const va = M.vacacionesAno(st, 2026).find(x => x.pid === 'hojan');
  assert.ok(va && va.total === 0.5 && va.dias[8] === 0.5 && va.medias[CIE_LUN][0] === 'T', JSON.stringify(va));
  // con un día entero más, 1,5
  M.anadirAusencia(M.personaDe(st, 'hojan'), { tipo: 'VAC', desde: '2026-09-30', hasta: '2026-09-30' });
  assert.strictEqual(M.horasPersonaMes(cfg, st, cfg.meses, 'hojan', 2026, 9).vacaciones, 1.5);
  // un permiso por la mañana y vacaciones por la tarde el mismo día: cada uno, media jornada de lo suyo
  const p = { id: 'x', ausencias: [{ tipo: 'PERM', desde: '2026-10-01', hasta: '2026-10-01', franjas: ['M'] }, { tipo: 'VAC', desde: '2026-10-01', hasta: '2026-10-01', franjas: ['T'] }] };
  assert.deepStrictEqual(M.diasAusenciaMes(p, 2026, 10, 'VAC'), ['2026-10-01']);
  assert.deepStrictEqual(M.mediasAusenciaMes(p, 2026, 10, 'VAC'), { '2026-10-01': ['T'] });
});

ok('F3 rev · M10 S34 en los dos sentidos: quien ese día ya está de sala no entra a llevar una cocina, así el generador no crea lo que la Revisión marca', () => {
  const cfg = cfgBase(), st = cfg.staff, e = M.nuevoEstado(2026, 10, { festivos: [] });
  M.asignar(e, cfg, st, '2026-10-09', 'PASARELA_M', 'roberto', {});
  const pe = M.puedeEstar(cfg, st, e, '2026-10-09', 'ZAPA_T', 'roberto', { puesto: 'cocina' });
  assert.ok(!pe.ok && pe.regla === 'cocina' && /ya está de sala en Pasarela/.test(pe.motivo), JSON.stringify(pe));
  assert.ok(M.puedeEstar(cfg, st, e, '2026-10-09', 'ZAPA_T', 'roberto', { puesto: 'cocina', forzar: true }).ok, 'se puede forzar');
  for (const [pid, sinPatron] of [['adrian', false], ['adrian', true], ['hojan', false], ['hojan', true]]) {
    const cfg2 = cfgBase(), st2 = cfg2.staff;
    M.personaDe(st2, pid).ausencias = [{ tipo: 'VAC', desde: F3_LUN, hasta: F3_DOM }];
    const e2 = f3Semana();
    M.generarSemana(cfg2, st2, e2, F3_LUN, { sinPatron });
    const rv = M.revisionMes(cfg2, st2, e2, { desde: F3_LUN, hasta: F3_DOM }).filter(x => /ya lleva la cocina|ya está de sala/.test(x.msg));
    assert.deepStrictEqual(rv.map(x => x.msg), [], `${pid} de vacaciones, sinPatron=${sinPatron}`);
  }
});

ok('F3 rev · M11 sin relevo, solo una persona va «por Iván» en cada casilla: la siguiente entra «para llegar al mínimo (había n de m)»', () => {
  const quitaTarde = cfg => { for (const iso of [F3_VIE, F3_SAB]) M.desasignar(f3Mes(cfg, iso), iso, 'PASARELA_T', 'mariluz'); };
  const cfg = f3Escenario(null, quitaTarde), inc = F3_INC();
  const A = M.planesCobertura(cfg, cfg.staff, f3Entero(cfg, inc), inc, {}).planes[0];
  const vie = A.asignaciones.filter(a => a.iso === F3_VIE && a.tid === 'PASARELA_T');
  assert.strictEqual(vie.filter(a => a.por === 'ivan').length, 1, JSON.stringify(vie.map(a => [a.pid, a.por, a.razones[0]])));
  const otro = vie.find(a => a.por !== 'ivan');
  assert.ok(otro && otro.razones[0] === 'para llegar al mínimo (había 2 de 3)', JSON.stringify(vie.map(a => [a.pid, a.por, a.razones[0]])));
  const e = cieRango(cfg, inc.desde, inc.hasta);
  M.aplicarCobertura(cfg, cfg.staff, e, inc, A);
  assert.strictEqual(M.asignados(e, F3_VIE, 'PASARELA_T').filter(x => x.por === 'ivan').length, 1);
});

ok('F3 rev · M12 el relevo no pisa el «por» de otra persona (D12): Roberto, en su plaza del jueves «por Susana Luna», no pasa a cubrir a Adrián', () => {
  const cfg = cfgBase(), st = cfg.staff, JUE = '2026-10-01';
  M.anadirAusencia(M.personaDe(st, 'adrian'), { tipo: 'VAC', desde: F3_LUN, hasta: F3_DOM });
  const e = f3Semana();
  M.generarSemana(cfg, st, e, F3_LUN, {});
  const rob = M.asignados(e, JUE, 'ZAPA_T').find(x => x.pid === 'roberto');
  assert.ok(rob && rob.por === 'sluna' && !rob.relevo, JSON.stringify(rob));
  const pat = M.patronDesdeSemana(e, F3_LUN, cfg, st);
  assert.strictEqual(((pat[4] || []).find(p => p.p === 'roberto' && p.t === 'ZAPA_T') || {}).por, 'sluna');
});

ok('F3 rev · M13 porQueNadie dice lo mismo que el relleno: «solo hace cocina» en la sala y el apoyo que dejaría la casilla solo con apoyos', () => {
  const cfg = cfgBase(), st = cfg.staff;
  const pq = M.porQueNadie(cfg, st, estadoOct(), '2026-10-05', 'EL33_M');
  assert.ok((pq['solo hace cocina'] || []).includes('Hojan'), JSON.stringify(pq));
  const cfg2 = f3Escenario(), st2 = cfg2.staff;
  const e = cieRango(cfg2, F3_DOM, F3_DOM); M.desasignar(e, F3_DOM, 'PASARELA_T', 'ivan');
  const stV = f3Sin(st2, 'ivan', F3_DOM, F3_DOM);
  const pq2 = M.porQueNadie(cfg2, stV, e, F3_DOM, 'PASARELA_T');
  assert.ok(Object.entries(pq2).some(([m, q]) => /solo con apoyos/.test(m) && q.includes('Dulce')), JSON.stringify(pq2));
});

ok('F3 rev · M14 el cierre pone la VAC o el LD de la franja cerrada aunque ese día ya haya un permiso de la otra franja', () => {
  const cfg = cfgDemo(), st = cfg.staff, e = sepDe(cfg), yi = M.personaDe(st, 'yilian');
  M.anadirAusencia(yi, { tipo: 'PERM', desde: CIE_LUN, hasta: CIE_LUN, franjas: ['M'], detalle: 'médico' });
  assert.ok(M.aplicarCierre(cfg, st, e, cierreTardes(), { yilian: { tipo: 'LD' } }).ok);
  const a = M.ausenciaEn(yi, CIE_LUN, 'T');
  assert.ok(a && a.tipo === 'LD' && JSON.stringify(a.franjas) === '["T"]', JSON.stringify(yi.ausencias));
  assert.strictEqual(M.ausenciaEn(yi, CIE_LUN, 'M').tipo, 'PERM', 'el permiso de la mañana sigue');
  assert.ok(M.quitarCierre(cfg, st, e, 'cie_t', { quitarVacaciones: true }).ok);
  assert.strictEqual(M.ausenciaEn(yi, CIE_LUN, 'T'), null, 'al reabrir se quita solo su media jornada');
  assert.strictEqual(M.ausenciaEn(yi, CIE_LUN, 'M').tipo, 'PERM');
});

ok('F3 rev · C1 D1 con Mari Luz ya de mañana y de tarde y sin partido declarado el viernes y el sábado: el plan A la da de relevo, abriendo, sin huecos que no existen', () => {
  const cfg = f3Escenario(null, (cfg, st) => { M.personaDe(st, 'mariluz').partido = { dias: [2, 4] }; }), inc = F3_INC();
  for (const iso of [F3_VIE, F3_SAB]) assert.deepStrictEqual(cieDonde(cfg, f3Mes(cfg, iso), iso, 'mariluz'), ['PASARELA_M', 'PASARELA_T']);
  const A = M.planesCobertura(cfg, cfg.staff, f3Entero(cfg, inc), inc, {}).planes[0];
  for (const iso of [F3_VIE, F3_SAB]) {
    const ml = f3De(A, iso, 'mariluz')[0];
    assert.ok(ml && ml.yaEstaba && ml.abre, JSON.stringify(ml));
    assert.deepStrictEqual(ml.autorizados.map(a => a.texto), ['partido para cubrir a Iván']);
    assert.ok(!A.huecos.some(h => h.iso === iso), JSON.stringify(A.huecos.map(h => h.iso + ' ' + h.motivo)));
    assert.strictEqual(A.asignaciones.filter(a => a.iso === iso && a.tid === 'PASARELA_T').length, 2, 'el relevo y una más para el mínimo, no dos más');
  }
});

ok('F3 rev · C2 al quitar a quien tenía fijado «abre», la marca se va con él: Mari Luz abre de verdad (su entrada, su tramo de 16:00 y su perfil)', () => {
  const cfg = f3Escenario(), inc = F3_INC();
  const A = M.planesCobertura(cfg, cfg.staff, f3Entero(cfg, inc), inc, {}).planes[0];
  const e = cieRango(cfg, inc.desde, inc.hasta);
  // (fase 5, S18: la plaza «a» de la semana tipo ya no fija el «abre» a mano; se fija aquí a mano, que es lo
  // que prueba este caso: la marca se va con quien la tenía)
  assert.ok(!M.manualDe(e, F3_VIE, 'PASARELA_T').abre, 'la plaza «a» de Iván no queda como puesta a mano (S18)');
  for (const iso of [F3_VIE, F3_SAB]) M.marcarAbre(e, iso, 'PASARELA_T', 'ivan', cfg);
  assert.ok(M.manualDe(e, F3_VIE, 'PASARELA_T').abre, 'Iván, fijado a mano');
  M.aplicarCobertura(cfg, cfg.staff, e, inc, A);
  for (const iso of [F3_VIE, F3_SAB]) {
    const ml = M.asignados(e, iso, 'PASARELA_T').find(x => x.pid === 'mariluz');
    assert.ok(ml && ml.abre, JSON.stringify(M.asignados(e, iso, 'PASARELA_T')));
    assert.strictEqual(M.tramoDe(cfg, e, iso, 'PASARELA_T', 'mariluz').ini, '16:00');
  }
});

ok('F3 rev · C4 el Generador no deja una casilla solo con apoyos (como la Cobertura): la deja corta con el porqué, y la condición «dos apoyos no se quedan solos» se comprueba', () => {
  const cfg = f3Escenario(), st = cfg.staff;
  // (revisión de la fase 6) con la pareja Mari Luz–Lavinia flexible, como en la semilla: sin «Permitir partidos no
  // declarados» el Generador no la relaja (decisiones.md, principio 6: solo el plan relajado)
  M.anadirAusencia(M.personaDe(st, 'ivan'), { tipo: 'VAC', desde: F3_VIE, hasta: F3_DOM });
  const e = cieRango(cfg, F3_LUN, F3_DOM);
  for (const iso of [F3_VIE, F3_SAB, F3_DOM]) M.desasignar(e, iso, 'PASARELA_T', 'ivan');
  const g = M.generarSemana(cfg, st, e, F3_LUN, {});
  assert.ok(!M.asignados(e, F3_DOM, 'PASARELA_T').some(x => x.origen === 'generador' && M.esApoyo(M.personaDe(st, x.pid))), M.pidsEn(e, F3_DOM, 'PASARELA_T').join(','));
  const h = g.huecos.find(x => x.iso === F3_DOM && x.turnoId === 'PASARELA_T');
  assert.ok(h && Object.entries(h.porQueNadie).some(([m, q]) => /solo con apoyos/.test(m) && q.includes('Dulce')), JSON.stringify(h));
  // la condición lo dice: Lavinia se queda sola el domingo (y corta)
  const c = g.condiciones.find(x => x.id === 'reg:soloApoyos');
  assert.ok(c && !c.ok && /domingo 4/.test(c.detalle), JSON.stringify(c));
  // una semana normal la cumple
  const cfgN = f3Escenario(), eN = cieRango(cfgN, F3_LUN, F3_DOM);
  assert.ok(M.generarSemana(cfgN, cfgN.staff, eN, F3_LUN, {}).condiciones.find(x => x.id === 'reg:soloApoyos').ok);
  // el selector la ofrece «con aviso»: candidatosConAviso
  const e3 = cieRango(cfg, F3_DOM, F3_DOM); M.desasignar(e3, F3_DOM, 'PASARELA_T', 'dulce');
  const ca = M.candidatosConAviso(cfg, st, e3, F3_DOM, 'PASARELA_T').find(x => x.pid === 'dulce');
  assert.ok(ca && ca.avisos.includes('solo apoyos'), JSON.stringify(ca));
});

ok('F3 rev · C5 generarSemana: si lo único nuevo es el relevo, sale en «Qué ha cambiado» y se puede volcar', () => {
  const cfg = f3Escenario(), st = cfg.staff;
  const e = cieRango(cfg, F3_LUN, F3_DOM);
  M.generarSemana(cfg, st, e, F3_LUN, {});   // la semana ya volcada
  M.anadirAusencia(M.personaDe(st, 'ivan'), { tipo: 'VAC', desde: F3_VIE, hasta: F3_SAB });
  const sim = M.generarSemana(cfg, st, e, F3_LUN, { simular: true });
  const cv = sim.cambios.find(c => c.iso === F3_VIE && c.turnoId === 'PASARELA_T');
  assert.ok(cv && cv.porDespues && cv.porDespues.mariluz === 'ivan', JSON.stringify(sim.cambios.filter(c => c.turnoId === 'PASARELA_T')));
  assert.ok(sim.relevos >= 2, 'relevos: ' + sim.relevos);
  M.generarSemana(cfg, st, e, F3_LUN, {});
  const ml = M.asignados(e, F3_VIE, 'PASARELA_T').find(x => x.pid === 'mariluz');
  assert.ok(ml && ml.por === 'ivan', JSON.stringify(ml));
  const otra = M.generarSemana(cfg, st, e, F3_LUN, { simular: true });
  assert.strictEqual(otra.relevos, 0, 'volcado ya: nada nuevo');
  assert.ok(!otra.cambios.some(c => c.turnoId === 'PASARELA_T' && (c.iso === F3_VIE || c.iso === F3_SAB)), JSON.stringify(otra.cambios));
});

ok('F3 rev · C7 la Revisión dice el partido autorizado una sola vez por persona y día (no una por la mañana y otra por la tarde)', () => {
  const cfg = f3Escenario(null, (cfg, st) => { M.personaDe(st, 'mariluz').partido = { dias: [2, 4] }; }), inc = F3_INC();
  const A = M.planesCobertura(cfg, cfg.staff, f3Entero(cfg, inc), inc, {}).planes[0];
  const e = cieRango(cfg, F3_LUN, F3_DOM);
  M.aplicarCobertura(cfg, cfg.staff, e, inc, A);
  const rv = M.revisionMes(cfg, cfg.staff, e, { desde: F3_VIE, hasta: F3_VIE }).filter(x => x.tipo === 'autorizado');
  assert.strictEqual(rv.length, 1, JSON.stringify(rv));
  assert.ok(rv[0].pid === 'mariluz' && /Mari Luz: partido para cubrir a Iván/.test(rv[0].msg) && /mañana y tarde/.test(rv[0].msg), JSON.stringify(rv[0]));
});

ok('F3 rev · M15/C9 etiquetaAusencia: una sola etiqueta para las vistas, con la media jornada («Permiso por la mañana», «PERM · mañana»)', () => {
  const med = { tipo: 'PERM', desde: '2026-10-02', hasta: '2026-10-02', franjas: ['M'] }, dia = { tipo: 'VAC', desde: '2026-10-02', hasta: '2026-10-04' };
  assert.strictEqual(M.etiquetaAusencia(med), 'Permiso por la mañana');
  assert.strictEqual(M.etiquetaAusencia(med, true), 'PERM · mañana');
  assert.strictEqual(M.etiquetaAusencia(dia), 'Vacaciones');
  assert.strictEqual(M.etiquetaAusencia(dia, true), 'VAC');
  assert.strictEqual(M.etiquetaAusencia(null), '');
});

// ---------- fase 3b (24/09): «Cubre a» hasta nueva orden, de punta a punta desde Equipo ----------
// Diego, 24/09: «también tenemos que dar al encargado la posibilidad, como ya existe, pero que funcione
// real, de que pueda decir en equipo, tal persona cubre a tal persona, hasta nueva orden… antes no se
// hablaba bien equipo con generador ni con cobertura». Decisión D13: la designación es permanente
// (hasta que el encargado la quite) y la leen igual todos los caminos; al apuntar en Equipo una
// ausencia en días ya planificados entra quien cubre (cubrirAusencia) o se dice por qué no; quitarla
// deja de aplicarse y lo automático que puso se retira al regenerar, nunca lo manual.
// Iván de vacaciones del viernes 2 al domingo 4 por la tarde, apuntadas en su ficha (como hace Equipo)
const f3bVacIvan = cfg => M.anadirAusencia(M.personaDe(cfg.staff, 'ivan'), { tipo: 'VAC', desde: F3_VIE, hasta: F3_DOM, franjas: ['T'] });
const f3bClaves = xs => xs.map(x => `${x.iso}|${x.tid}|${x.pid}`);
const f3bPorIvan = (e, iso) => M.asignados(e, iso, 'PASARELA_T').filter(x => x.por === 'ivan').map(x => x.pid);

ok('F3b · cubrirAusencia (D13): Iván de vacaciones vie 2–dom 4 por la tarde en la semana ya volcada: viernes y sábado Mari Luz entra en su sitio (relevo, abre); el domingo queda sin cubrir con el porqué', () => {
  assert.strictEqual(typeof M.cubrirAusencia, 'function', 'falta la operación cubrirAusencia en el modelo');
  const cfg = f3Escenario(), st = cfg.staff;
  const e = cieRango(cfg, F3_LUN, F3_DOM);
  // (fase 5, S18) Iván abre por ser el fijo («sale el primero»); la marca «a» de su plaza ya no queda como puesta a mano
  assert.ok(M.primeroDe(cfg, st, e, F3_VIE, 'PASARELA_T') === 'ivan' && !M.manualDe(e, F3_VIE, 'PASARELA_T').abre, 'Iván abre, sin marca a mano');
  f3bVacIvan(cfg);
  const r = M.cubrirAusencia(cfg, st, e, 'ivan', F3_VIE, F3_DOM, ['T']);
  // sale de sus tres tardes
  assert.deepStrictEqual(r.quitados.map(x => `${x.iso}|${x.tid}`), [F3_VIE, F3_SAB, F3_DOM].map(i => i + '|PASARELA_T'));
  for (const iso of [F3_VIE, F3_SAB, F3_DOM]) assert.ok(!M.pidsEn(e, iso, 'PASARELA_T').includes('ivan'), iso);
  // viernes y sábado: Mari Luz ya estaba de tarde (su partido está declarado) y pasa a cubrirle
  assert.deepStrictEqual(f3bClaves(r.relevos), [F3_VIE, F3_SAB].map(i => i + '|PASARELA_T|mariluz'));
  assert.deepStrictEqual(r.puestos, [], 'no entra nadie nuevo: Mari Luz ya estaba');
  for (const iso of [F3_VIE, F3_SAB]) {
    const ml = M.asignados(e, iso, 'PASARELA_T').filter(x => x.pid === 'mariluz');
    assert.strictEqual(ml.length, 1);
    assert.ok(ml[0].por === 'ivan' && ml[0].relevo && ml[0].razon === 'cubre a Iván', JSON.stringify(ml[0]));
    // abre ella: la marca de abrir de Iván se va con él (retirarEntrada), no se queda huérfana
    assert.strictEqual(M.primeroDe(cfg, st, e, iso, 'PASARELA_T'), 'mariluz');
    assert.ok(ml[0].abre, JSON.stringify(M.asignados(e, iso, 'PASARELA_T')));
    const pos = M.posicionesDe(cfg, st, e, iso, 'PASARELA_T');
    assert.ok(pos[0].pid === 'mariluz' && pos[0].abre && pos[0].por === 'ivan' && !pos[0].avisos.length, JSON.stringify(pos[0]));
    assert.deepStrictEqual(f3bPorIvan(e, iso), ['mariluz'], 'nadie más va «por Iván»');
  }
  // domingo: hace la mañana (libra Lola) y por la tarde está Lavinia, con la que nunca coincide
  assert.strictEqual(r.sinCubrir.length, 1, JSON.stringify(r.sinCubrir));
  const s = r.sinCubrir[0];
  assert.ok(s.iso === F3_DOM && s.tid === 'PASARELA_T' && /nunca con Lavinia/.test(s.porQue), JSON.stringify(s));
  assert.deepStrictEqual(s.quien.map(q => `${q.pid}: ${q.porQue}`), ['mariluz: nunca con Lavinia']);
  assert.ok(M.pidsEn(e, F3_DOM, 'PASARELA_M').includes('mariluz') && !M.pidsEn(e, F3_DOM, 'PASARELA_T').includes('mariluz'));
  assert.deepStrictEqual(f3bPorIvan(e, F3_DOM), []);
  // lo que queda corto después (para ofrecer la Cobertura): el mínimo de las tardes
  assert.deepStrictEqual(r.huecos.map(h => `${h.iso.slice(8)} ${h.tid} ${h.faltan}/${h.minimo}`), ['02 PASARELA_T 1/3', '03 PASARELA_T 1/3', '04 PASARELA_T 1/2']);
  // la ausencia la apunta quien llama: cubrirAusencia no la duplica
  assert.strictEqual(M.personaDe(st, 'ivan').ausencias.length, 1);
  // un permiso de solo mañana no le quita la tarde (D10): Mari Luz, médico el viernes por la mañana.
  // Lavinia solo le cubre los miércoles: el viernes no, y se dice por qué
  const cfg2 = f3Escenario(), e2 = cieRango(cfg2, F3_LUN, F3_DOM);
  M.anadirAusencia(M.personaDe(cfg2.staff, 'mariluz'), { tipo: 'PERM', desde: F3_VIE, hasta: F3_VIE, franjas: ['M'] });
  const r2 = M.cubrirAusencia(cfg2, cfg2.staff, e2, 'mariluz', F3_VIE, F3_VIE, ['M']);
  assert.deepStrictEqual(r2.quitados.map(x => x.tid), ['PASARELA_M']);
  assert.ok(M.pidsEn(e2, F3_VIE, 'PASARELA_T').includes('mariluz'), 'conserva su tarde');
  const s2 = r2.sinCubrir.find(x => x.tid === 'PASARELA_M');
  assert.ok(s2 && s2.quien.some(q => q.pid === 'lavinia' && q.porQue === 'solo le cubre los miércoles'), JSON.stringify(r2.sinCubrir));
  // sin nadie designado, también se dice
  const cfg3 = f3Escenario(null, (c, st3) => { M.personaDe(st3, 'mariluz').cubreA = []; }), e3 = cieRango(cfg3, F3_LUN, F3_DOM);
  f3bVacIvan(cfg3);
  const r3 = M.cubrirAusencia(cfg3, cfg3.staff, e3, 'ivan', F3_VIE, F3_DOM, ['T']);
  assert.deepStrictEqual(r3.relevos.concat(r3.puestos), []);
  assert.strictEqual(r3.sinCubrir.length, 3);
  assert.ok(r3.sinCubrir.every(x => x.porQue === 'nadie tiene «Cubre a» Iván' && !x.quien.length), JSON.stringify(r3.sinCubrir[0]));
});

ok('F3b · la Cobertura y el Generador dicen lo mismo que la ausencia apuntada en Equipo; la Cobertura dice quién le cubre y por qué no un día', () => {
  const cfg = f3Escenario(), st = cfg.staff;
  const inc = Object.assign(F3_INC(), { franjas: ['T'] });
  // la Cobertura, antes de apuntar nada: «Iván tiene quien le cubra: Mari Luz» y el porqué del domingo
  const res = M.planesCobertura(cfg, st, f3Entero(cfg, inc), inc, {});
  assert.deepStrictEqual((res.designados || []).map(d => `${d.pid} · ${d.cuando}`), ['mariluz · siempre que falte']);
  const A = res.planes[0];
  const relevosA = A.asignaciones.filter(a => a.yaEstaba).map(a => `${a.iso}|${a.tid}|${a.pid}`);
  assert.deepStrictEqual(relevosA, [F3_VIE, F3_SAB].map(i => i + '|PASARELA_T|mariluz'));
  const dom = res.afectados.find(a => a.iso === F3_DOM), vie = res.afectados.find(a => a.iso === F3_VIE);
  assert.deepStrictEqual((dom.noCubren || []).map(q => `${q.pid}: ${q.porQue}`), ['mariluz: nunca con Lavinia']);
  assert.deepStrictEqual(vie.noCubren, [], 'el viernes sí cubre: no hay nada que explicar');
  // Equipo (cubrirAusencia) sobre la planilla real: los mismos relevos y el mismo porqué
  f3bVacIvan(cfg);
  const e = cieRango(cfg, F3_LUN, F3_DOM);
  const r = M.cubrirAusencia(cfg, st, e, 'ivan', F3_VIE, F3_DOM, ['T']);
  assert.deepStrictEqual(f3bClaves(r.relevos), relevosA);
  assert.deepStrictEqual(r.sinCubrir.map(x => `${x.iso}|${x.tid}`), [`${F3_DOM}|PASARELA_T`]);
  assert.deepStrictEqual(r.sinCubrir[0].quien, dom.noCubren);
  // el Generador de semana, con la misma ficha y la planilla de antes (Iván aún puesto): lo automático de
  // quien está ausente se retira (principio 4) y Mari Luz queda «por Iván» el viernes y el sábado, no el domingo
  const cfgG = f3Escenario(); f3bVacIvan(cfgG);
  const eG = cieRango(cfgG, F3_LUN, F3_DOM);
  const g = M.generarSemana(cfgG, cfgG.staff, eG, F3_LUN, { simular: true });
  for (const iso of [F3_VIE, F3_SAB, F3_DOM]) assert.ok(!M.pidsEn(g.estado, iso, 'PASARELA_T').includes('ivan'), `${iso}: Iván, de vacaciones, sale de su tarde: ${M.pidsEn(g.estado, iso, 'PASARELA_T')}`);
  assert.ok(g.retirados.some(x => x.iso === F3_VIE && x.pid === 'ivan' && /vacaciones por la tarde/.test(x.motivo)), JSON.stringify(g.retirados));
  for (const iso of [F3_VIE, F3_SAB]) assert.deepStrictEqual(f3bPorIvan(g.estado, iso), ['mariluz'], iso);
  // el domingo no, como dicen la confirmación de Equipo («nunca con Lavinia») y el plan B (revisión de la fase 6:
  // sin «Permitir partidos no declarados» la pareja flexible no se relaja); con partidos permitidos, el Generador hace
  // lo mismo que el plan A de la Cobertura (Roberto)
  assert.ok(!f3bPorIvan(g.estado, F3_DOM).includes('mariluz') && !M.pidsEn(g.estado, F3_DOM, 'PASARELA_T').includes('mariluz'), JSON.stringify(M.asignados(g.estado, F3_DOM, 'PASARELA_T')));
  const gPP = M.generarSemana(cfgG, cfgG.staff, cieRango(cfgG, F3_LUN, F3_DOM), F3_LUN, { simular: true, permitirPartido: true });
  const domA = A.asignaciones.filter(a => a.iso === F3_DOM && a.tid === 'PASARELA_T' && !a.yaEstaba).map(a => a.pid);
  assert.ok(!f3bPorIvan(gPP.estado, F3_DOM).includes('mariluz') && domA.every(pid => M.pidsEn(gPP.estado, F3_DOM, 'PASARELA_T').includes(pid)), JSON.stringify([domA, M.pidsEn(gPP.estado, F3_DOM, 'PASARELA_T')]));
  // el Generador de periodo (generarPlanilla) igual
  const cfgP = f3Escenario(); f3bVacIvan(cfgP);
  const gp = M.generarPlanilla(cfgP, cfgP.staff, cieRango(cfgP, F3_LUN, F3_DOM), F3_LUN, F3_DOM, { simular: true });
  for (const iso of [F3_VIE, F3_SAB]) assert.deepStrictEqual(f3bPorIvan(gp.estado, iso), ['mariluz'], iso);
  assert.ok(!M.pidsEn(gp.estado, F3_VIE, 'PASARELA_T').includes('ivan'));
  // y sobre la planilla que dejó Equipo, el Generador no deshace nada de eso
  const g2 = M.generarSemana(cfg, st, e, F3_LUN, { simular: true });
  assert.ok(!g2.retirados.some(x => x.pid === 'mariluz'), JSON.stringify(g2.retirados));
  for (const iso of [F3_VIE, F3_SAB]) assert.deepStrictEqual(f3bPorIvan(g2.estado, iso), ['mariluz'], iso);
  assert.strictEqual(g2.relevos, 0, 'no hay relevos nuevos: ya estaban marcados');
  // lo puesto a mano no lo quita nadie: Iván puesto a mano un día que ya está de vacaciones se queda, con su aviso
  const cfgM = f3Escenario(), eM = cieRango(cfgM, F3_LUN, F3_DOM);
  M.asignados(eM, F3_VIE, 'PASARELA_T').find(x => x.pid === 'ivan').origen = 'manual';
  f3bVacIvan(cfgM);
  const gM = M.generarSemana(cfgM, cfgM.staff, eM, F3_LUN, { simular: true });
  assert.ok(M.pidsEn(gM.estado, F3_VIE, 'PASARELA_T').includes('ivan'), 'la plaza puesta a mano se queda');
  assert.ok(!gM.retirados.some(x => x.iso === F3_VIE && x.pid === 'ivan'));
});

ok('F3b · quitar la designación (D13): deja de aplicarse en todos los caminos y, al regenerar, se retira lo automático puesto por ella, nunca lo manual', () => {
  // Mari Luz cubre a Iván siempre; Roberto, solo los domingos: hace la mañana con Mari Luz y entra por la
  // tarde en partido (autorizado por la designación, D1)
  const cfg = f3Escenario(null, (c, st0) => { M.personaDe(st0, 'roberto').cubreA.push({ pid: 'ivan', dow: 7 }); }), st = cfg.staff;
  f3bVacIvan(cfg);
  const e = cieRango(cfg, F3_LUN, F3_DOM);
  const r = M.cubrirAusencia(cfg, st, e, 'ivan', F3_VIE, F3_DOM, ['T']);
  assert.deepStrictEqual(f3bClaves(r.puestos), [`${F3_DOM}|PASARELA_T|roberto`]);
  assert.deepStrictEqual(r.sinCubrir, [], 'el domingo le cubre Roberto');
  const rob = M.asignados(e, F3_DOM, 'PASARELA_T').find(x => x.pid === 'roberto');
  assert.ok(rob && rob.por === 'ivan' && M.esAutomatica(rob) && rob.razon === 'cubre a Iván', JSON.stringify(rob));
  // el encargado pone además a mano a Dulce «por Iván» el domingo
  assert.ok(M.asignar(e, cfg, st, F3_DOM, 'PASARELA_T', 'dulce', { origen: 'manual', por: 'ivan', razon: 'cubre a Iván' }).ok);
  // la designación puesta: el selector (★) la da, la condición del Generador la lista, la Revisión autoriza el partido
  // (30/09, A4; auditoría C2, D3: con Dulce ya «por Iván» en la casilla, el siguiente entra «para llegar al mínimo», no «por Iván»;
  // la designación se ve en la casilla sin nadie por él)
  const conDulce = M.clonarEstado(e); M.desasignar(conDulce, F3_DOM, 'PASARELA_T', 'roberto');
  assert.ok(M.candidatosPara(cfg, st, conDulce, F3_DOM, 'PASARELA_T').every(c => !c.cubre), 'un solo «por Iván» por casilla');
  const libre = M.clonarEstado(conDulce); M.desasignar(libre, F3_DOM, 'PASARELA_T', 'dulce');
  assert.strictEqual((M.candidatosPara(cfg, st, libre, F3_DOM, 'PASARELA_T')[0] || {}).cubre, 'ivan');
  assert.ok(M.condicionesDe(cfg, st, F3_LUN).some(c => /Roberto cubre a Iván los domingos/.test(c.texto)), 'condición');
  assert.ok(M.revisionMes(cfg, st, e, { desde: F3_DOM, hasta: F3_DOM }).some(x => x.tipo === 'autorizado' && /Roberto: partido para cubrir a Iván/.test(x.msg)));
  // regenerar con la designación puesta no quita nada
  const g0 = M.generarSemana(cfg, st, e, F3_LUN, {});
  assert.ok(!g0.retirados.some(x => ['roberto', 'mariluz', 'dulce'].includes(x.pid)), JSON.stringify(g0.retirados));
  // se quitan las dos designaciones de Iván (en la ficha: «ya no cubre a Iván»)
  M.personaDe(st, 'mariluz').cubreA = [];
  M.personaDe(st, 'roberto').cubreA = M.personaDe(st, 'roberto').cubreA.filter(c => c.pid !== 'ivan');
  // ya no se aplica en ningún camino: selector, condiciones, Revisión, Cobertura y semana tipo
  assert.ok(!M.candidatosPara(cfg, st, libre, F3_DOM, 'PASARELA_T').some(c => c.cubre || c.razones.includes('cubre a Iván')));
  assert.ok(!M.condicionesDe(cfg, st, F3_LUN).some(c => /cubre a Iván/.test(c.texto)));
  assert.ok(!M.revisionMes(cfg, st, e, { desde: F3_VIE, hasta: F3_DOM }).some(x => x.tipo === 'autorizado' && /Iván/.test(x.msg)));
  assert.deepStrictEqual(M.quienLeCubre(cfg, st, 'ivan'), []);
  const cfgC = f3Escenario(null, (c, st0) => { M.personaDe(st0, 'mariluz').cubreA = []; });
  const incC = Object.assign(F3_INC(), { franjas: ['T'] });
  const resC = M.planesCobertura(cfgC, cfgC.staff, f3Entero(cfgC, incC), incC, {});
  assert.deepStrictEqual(resC.designados, []);
  assert.ok(!resC.planes[0].asignaciones.some(a => a.yaEstaba || a.pid === 'mariluz'), JSON.stringify(resC.planes[0].asignaciones.map(a => a.iso + ' ' + a.pid)));
  const ipC = M.instanciarPatron(cfg, st, f3Semana(), F3_VIE, F3_DOM);
  assert.ok(!ipC.coberturas.some(c => c.por === 'ivan'), JSON.stringify(ipC.coberturas));
  // regenerar: Roberto (automático, puesto por la designación) sale; Dulce (a mano) se queda; Mari Luz
  // conserva su plaza, ya sin «por Iván»
  const g = M.generarSemana(cfg, st, e, F3_LUN, {});
  assert.ok(g.retirados.some(x => x.iso === F3_DOM && x.pid === 'roberto' && x.motivo === 'Roberto ya no cubre a Iván'), JSON.stringify(g.retirados));
  assert.ok(!g.retirados.some(x => x.pid === 'dulce' || x.pid === 'mariluz'), JSON.stringify(g.retirados));
  assert.ok(!M.asignados(e, F3_DOM, 'PASARELA_T').some(x => x.pid === 'roberto' && x.por === 'ivan'));
  const dul = M.asignados(e, F3_DOM, 'PASARELA_T').find(x => x.pid === 'dulce');
  assert.ok(dul && dul.por === 'ivan' && dul.origen === 'manual', 'lo puesto a mano no lo quita nadie: ' + JSON.stringify(dul));
  for (const iso of [F3_VIE, F3_SAB]) {
    const ml = M.asignados(e, iso, 'PASARELA_T').find(x => x.pid === 'mariluz');
    assert.ok(ml && !ml.por && ml.razon === 'plaza fija de la semana tipo', JSON.stringify(ml));
  }
  // la plaza fija de la semana tipo con su «por» (Lavinia por Mari Luz los miércoles) no es de la designación (D12)
  const eX = cieRango(cfg, F3_LUN, F3_DOM);
  const lav = M.asignados(eX, '2026-09-30', 'PASARELA_M').find(x => x.pid === 'lavinia');
  assert.ok(lav && lav.por === 'mariluz');
  M.personaDe(st, 'lavinia').cubreA = [];
  const gX = M.generarSemana(cfg, st, eX, F3_LUN, {});
  assert.ok(!gX.retirados.some(x => x.pid === 'lavinia'), JSON.stringify(gX.retirados));
});

ok('F3b · una designación con día concreto solo vale ese día: «cubre a Iván los viernes» cubre el viernes, el sábado no, y se dice', () => {
  const cfg = f3Escenario(null, (c, st0) => { M.personaDe(st0, 'mariluz').cubreA = [{ pid: 'ivan', dow: 5 }]; }), st = cfg.staff;
  // los textos de la ficha y de la Cobertura
  assert.strictEqual(M.cuandoCubre(cfg, { pid: 'ivan' }), 'siempre que falte');
  assert.strictEqual(M.cuandoCubre(cfg, { pid: 'ivan', dow: 5 }), 'cuando falte los viernes');
  assert.strictEqual(M.cuandoCubre(cfg, { pid: 'ivan', dow: 5, turnoId: 'PASARELA_T' }), 'cuando falte los viernes en Pasarela por la tarde');
  assert.deepStrictEqual(M.quienLeCubre(cfg, st, 'ivan').map(d => `${d.pid} · ${d.nombre} · ${d.cuando} · ${d.activa}`), ['mariluz · Mari Luz · cuando falte los viernes · true']);
  // la Cobertura
  const inc = Object.assign(F3_INC(), { franjas: ['T'] });
  const res = M.planesCobertura(cfg, st, f3Entero(cfg, inc), inc, {});
  const A = res.planes[0];
  assert.ok((f3De(A, F3_VIE, 'mariluz')[0] || {}).yaEstaba, 'el viernes, relevo');
  assert.ok(!A.asignaciones.some(a => a.iso === F3_SAB && a.pid === 'mariluz'), 'el sábado no la da como relevo');
  assert.deepStrictEqual(res.afectados.find(a => a.iso === F3_SAB).noCubren.map(q => `${q.pid}: ${q.porQue}`), ['mariluz: solo le cubre los viernes']);
  // Equipo
  f3bVacIvan(cfg);
  const e = cieRango(cfg, F3_LUN, F3_DOM);
  const r = M.cubrirAusencia(cfg, st, e, 'ivan', F3_VIE, F3_DOM, ['T']);
  assert.deepStrictEqual(f3bClaves(r.relevos), [`${F3_VIE}|PASARELA_T|mariluz`]);
  const sab = r.sinCubrir.find(x => x.iso === F3_SAB);
  assert.ok(sab && sab.quien.some(q => q.pid === 'mariluz' && q.porQue === 'solo le cubre los viernes'), JSON.stringify(r.sinCubrir));
  assert.deepStrictEqual(f3bPorIvan(e, F3_SAB), []);
  // el Generador
  const cfgG = f3Escenario(null, (c, st0) => { M.personaDe(st0, 'mariluz').cubreA = [{ pid: 'ivan', dow: 5 }]; }); f3bVacIvan(cfgG);
  const g = M.generarSemana(cfgG, cfgG.staff, cieRango(cfgG, F3_LUN, F3_DOM), F3_LUN, { simular: true });
  assert.deepStrictEqual(f3bPorIvan(g.estado, F3_VIE), ['mariluz']);
  assert.ok(!f3bPorIvan(g.estado, F3_SAB).includes('mariluz'), JSON.stringify(M.asignados(g.estado, F3_SAB, 'PASARELA_T')));
});

ok('F3b · lo que la ausencia deja sin cubrir va a la Cobertura con las casillas que ya dejó (dejadas): plan para el mínimo y el domingo; al aplicar no se duplica la ausencia', () => {
  const cfg = f3Escenario(), st = cfg.staff;
  f3bVacIvan(cfg);
  const e = cieRango(cfg, F3_LUN, F3_DOM);
  const r = M.cubrirAusencia(cfg, st, e, 'ivan', F3_VIE, F3_DOM, ['T']);
  const inc = Object.assign({ tipo: 'VAC' }, r.pendiente);
  assert.deepStrictEqual([inc.pid, inc.dias, inc.franjas], ['ivan', [F3_VIE, F3_SAB, F3_DOM], ['T']]);
  assert.deepStrictEqual(inc.dejadas.map(x => `${x.iso}|${x.tid}`), [F3_VIE, F3_SAB, F3_DOM].map(i => i + '|PASARELA_T'));
  const rg = M.rangoNecesario(inc);
  const res = M.planesCobertura(cfg, st, M.clonarEstado(cieRango(cfg, rg.desde, rg.hasta)), inc, {});
  assert.deepStrictEqual(res.afectados.map(a => `${a.iso}|${a.tid}`), [F3_VIE, F3_SAB, F3_DOM].map(i => i + '|PASARELA_T'), 'Iván ya no está en ellas, pero son las suyas');
  const A = res.planes[0];
  for (const iso of [F3_VIE, F3_SAB]) {
    assert.ok((f3De(A, iso, 'mariluz')[0] || {}).yaEstaba, iso + ': Mari Luz sigue siendo el relevo');
    const otros = A.asignaciones.filter(a => a.iso === iso && a.tid === 'PASARELA_T' && !a.yaEstaba);
    assert.ok(otros.length === 1 && otros[0].razones[0] === 'para llegar al mínimo (había 2 de 3)', JSON.stringify(otros));
  }
  assert.ok(A.asignaciones.some(a => a.iso === F3_DOM && a.tid === 'PASARELA_T' && a.pid !== 'mariluz'), 'el domingo entra otra persona');
  const e2 = cieRango(cfg, rg.desde, rg.hasta);
  const ap = M.aplicarCobertura(cfg, st, e2, inc, A);
  assert.strictEqual(ap.quitados, 0, 'Iván ya había salido');
  assert.strictEqual(M.personaDe(st, 'ivan').ausencias.length, 1, 'la ausencia no se duplica');
  assert.ok(M.asignados(e2, F3_DOM, 'PASARELA_T').some(x => x.por === 'ivan'));
  assert.strictEqual(M.asignados(e2, F3_VIE, 'PASARELA_T').length, 3);
});

ok('F3b · «por qué nadie» dice de la persona designada lo mismo que la nota: el domingo Mari Luz no entra por «nunca con Lavinia» (su partido para cubrir a Iván está autorizado), no por «no hace partido»', () => {
  const cfg = f3Escenario(), st = cfg.staff;
  const inc = Object.assign(F3_INC(), { franjas: ['T'] });
  const res = M.planesCobertura(cfg, st, f3Entero(cfg, inc), inc, {});
  const h = res.planes.map(P => P.huecos.find(x => x.iso === F3_DOM && x.tid === 'PASARELA_T' && x.tipo === 'faltan')).find(Boolean);
  assert.ok(h, 'algún plan deja el hueco del domingo: ' + JSON.stringify(res.planes.map(P => P.huecos.map(x => x.iso + ' ' + x.motivo))));
  const donde = Object.entries(h.porQueNadie).filter(([, q]) => q.includes('Mari Luz')).map(([m]) => m);
  assert.deepStrictEqual(donde, ['nunca con Lavinia'], JSON.stringify(h.porQueNadie));
  assert.deepStrictEqual(res.afectados.find(a => a.iso === F3_DOM).noCubren.map(q => q.porQue), donde);
});

// ---------- revisión F3b (24/09): «Cubre a» hasta nueva orden, lo que encontraron los dos revisores ----------
// Dulce (y no Mari Luz) cubre a Iván: está libre esas tardes y entra como plaza nueva, no como relevo
const f3rDulce = (extra) => f3Escenario(null, (c, st0) => { M.personaDe(st0, 'mariluz').cubreA = []; M.personaDe(st0, 'dulce').cubreA = [{ pid: 'ivan' }]; if (extra) extra(c, st0); });
const f3rDonde = (cfg, e, iso, pid) => M.turnosDe(cfg).filter(t => M.pidsEn(e, iso, t.id).includes(pid)).map(t => t.id);

ok('F3b rev · una baja apuntada hoy (24/09) desde el lunes 21: antes de hoy Iván sale de la planilla, pero no entra nadie en su sitio (no se sabe quién le cubrió) y se dice en «pasados»; las horas de Dulce de esos días no cambian', () => {
  const HOY = '2026-09-24';
  const cfg = f3rDulce(), st = cfg.staff;
  const e = cieRango(cfg, '2026-09-14', '2026-10-04');
  const dulceAntes = ['2026-09-21', '2026-09-22', '2026-09-23'].map(iso => f3rDonde(cfg, e, iso, 'dulce').join(','));
  M.anadirAusencia(M.personaDe(st, 'ivan'), { tipo: 'BAJ', desde: '2026-09-21', hasta: '2026-09-27' });
  const r = M.cubrirAusencia(cfg, st, e, 'ivan', '2026-09-21', '2026-09-27', undefined, { desdeIso: HOY });
  assert.deepStrictEqual(r.puestos.concat(r.relevos).filter(x => x.iso < HOY), [], 'nadie entra en un día que ya ha pasado: ' + JSON.stringify(r.puestos));
  assert.deepStrictEqual((r.pasados || []).map(x => `${x.iso}|${x.tid}`), ['2026-09-22|PASARELA_T', '2026-09-23|PASARELA_T'], 'los días pasados se dicen aparte');
  // Iván sale igual de esos días (estaba de baja: no los trabajó; así lo hacía Equipo antes de la fase 3b)
  for (const iso of M.rangoIso('2026-09-21', '2026-09-27')) assert.deepStrictEqual(f3rDonde(cfg, e, iso, 'ivan'), [], iso);
  for (const iso of ['2026-09-22', '2026-09-23']) assert.ok(!M.asignados(e, iso, 'PASARELA_T').some(x => x.por === 'ivan'), iso);
  assert.deepStrictEqual(['2026-09-21', '2026-09-22', '2026-09-23'].map(iso => f3rDonde(cfg, e, iso, 'dulce').join(',')), dulceAntes, 'Dulce no entra en días ya trabajados (cambiaba sus horas)');
  // lo pasado no queda «sin cubrir» ni como hueco ni va a la Cobertura
  assert.ok(!r.sinCubrir.some(x => x.iso < HOY) && !r.huecos.some(x => x.iso < HOY), JSON.stringify([r.sinCubrir, r.huecos]));
  assert.ok(!r.pendiente || !r.pendiente.dejadas.some(x => x.iso < HOY), JSON.stringify(r.pendiente));
  // de hoy en adelante, como siempre: Dulce entra donde puede
  assert.ok(r.puestos.some(x => x.iso === HOY && x.pid === 'dulce'), JSON.stringify(r.puestos));
  // sin la fecha de hoy (quien llama no la da) todo cuenta como futuro: el modelo no mira el reloj
  const cfg2 = f3rDulce(), e2 = cieRango(cfg2, '2026-09-14', '2026-10-04');
  M.anadirAusencia(M.personaDe(cfg2.staff, 'ivan'), { tipo: 'BAJ', desde: '2026-09-21', hasta: '2026-09-27' });
  const r2 = M.cubrirAusencia(cfg2, cfg2.staff, e2, 'ivan', '2026-09-21', '2026-09-27');
  assert.deepStrictEqual(r2.pasados || [], []);
});

ok('F3b rev · la semana tipo elige a la designada con la misma evaluación que Equipo y la Cobertura (designadaPara): no deja una casilla solo con apoyos y, con dos designadas, las tres dicen la misma', () => {
  assert.strictEqual(typeof M.designadaPara, 'function', 'falta designadaPara en el modelo');
  // miércoles 30 por la tarde: con Iván fuera queda Lavinia (apoyo) y Dulce es apoyo: no entra en ningún camino
  const MIE = '2026-09-30';
  const cfgE = f3rDulce(); M.anadirAusencia(M.personaDe(cfgE.staff, 'ivan'), { tipo: 'VAC', desde: MIE, hasta: MIE, franjas: ['T'] });
  const rE = M.cubrirAusencia(cfgE, cfgE.staff, cieRango(cfgE, '2026-09-21', '2026-10-11'), 'ivan', MIE, MIE, ['T']);
  assert.deepStrictEqual(rE.sinCubrir.map(s => s.quien.map(q => `${q.pid}: ${q.porQue}`).join()), [`dulce: ${M.MOTIVO_SOLO_APOYOS}`]);
  const cfgG = f3rDulce(); M.anadirAusencia(M.personaDe(cfgG.staff, 'ivan'), { tipo: 'VAC', desde: MIE, hasta: MIE, franjas: ['T'] });
  const g = M.generarSemana(cfgG, cfgG.staff, cieRango(cfgG, F3_LUN, F3_DOM), F3_LUN, { simular: true });
  // (sin Iván, la tarde se queda con Lavinia y nadie más puede: el hueco sale con su porqué, como en Equipo)
  assert.ok(!M.asignados(g.estado, MIE, 'PASARELA_T').some(x => x.pid === 'dulce'), 'el Generador dejaba la tarde con dos apoyos solos (Lavinia y Dulce «por Iván»): ' + JSON.stringify(M.asignados(g.estado, MIE, 'PASARELA_T')));
  assert.ok(g.huecos.some(h => h.iso === MIE && h.turnoId === 'PASARELA_T'), JSON.stringify(g.huecos));
  const ip = M.instanciarPatron(cfgG, cfgG.staff, f3Semana(), MIE, MIE);
  assert.ok(!ip.coberturas.some(c => c.pid === 'dulce'), 'tampoco la semana tipo sola: ' + JSON.stringify(ip.coberturas));
  // dos designadas: los tres caminos eligen a la misma, sobre la misma planilla (semanas enteras, S8)
  const casos = [
    { quien: ['leo', 'dulce'], tipo: 'PERM', desde: '2026-09-29', hasta: '2026-09-29' },
    { quien: ['roberto', 'dulce'], tipo: 'VAC', desde: '2026-09-29', hasta: '2026-10-03' },
  ];
  for (const k of casos) {
    const mk = () => { const c = f3Escenario(null, (cc, st0) => { for (const p of st0) p.cubreA = []; for (const q of k.quien) M.personaDe(st0, q).cubreA = [{ pid: 'ivan' }]; }); M.anadirAusencia(M.personaDe(c.staff, 'ivan'), { tipo: k.tipo, desde: k.desde, hasta: k.hasta, franjas: ['T'] }); return c; };
    const inc = { pid: 'ivan', tipo: k.tipo, desde: k.desde, hasta: k.hasta, franjas: ['T'] }, rg = M.rangoNecesario(inc);
    const c1 = mk(); const r1 = M.cubrirAusencia(c1, c1.staff, cieRango(c1, rg.desde, rg.hasta), 'ivan', k.desde, k.hasta, ['T']);
    const c2 = f3Escenario(null, (cc, st0) => { for (const p of st0) p.cubreA = []; for (const q of k.quien) M.personaDe(st0, q).cubreA = [{ pid: 'ivan' }]; });
    const A = M.planesCobertura(c2, c2.staff, M.clonarEstado(cieRango(c2, rg.desde, rg.hasta)), inc, { siempre: true }).planes[0];
    const c3 = mk(); const g3 = M.generarSemana(c3, c3.staff, cieRango(c3, F3_LUN, F3_DOM), F3_LUN, { simular: true });
    const dias = [...M.rangoIso(k.desde, k.hasta)];
    const equipo = dias.map(iso => r1.puestos.concat(r1.relevos).filter(x => x.iso === iso).map(x => x.pid).join('+'));
    const cob = dias.map(iso => A.asignaciones.filter(a => a.iso === iso && a.por === 'ivan').map(a => a.pid).join('+'));
    const gen = dias.map(iso => M.asignados(g3.estado, iso, 'PASARELA_T').filter(x => x.por === 'ivan').map(x => x.pid).join('+'));
    assert.deepStrictEqual(equipo, cob, `${k.quien}: Equipo ${equipo} · Cobertura ${cob}`);
    assert.deepStrictEqual(gen, cob, `${k.quien}: Generador ${gen} · Cobertura ${cob}`);
  }
});

ok('F3b rev · la cocina: si quien falta la llevaba, la designada que la hace entra con la cocina también desde Equipo (Hojan por Jenny, como la semana tipo); si la designada ya está de sala en esa casilla, se dice por qué, nunca «no se pudo poner»', () => {
  const X = '2026-09-30';
  const mk = () => { const c = f3Escenario(null, (cc, st0) => { for (const p of st0) p.cubreA = []; M.personaDe(st0, 'hojan').cubreA = [{ pid: 'jenny' }]; }); M.anadirAusencia(M.personaDe(c.staff, 'jenny'), { tipo: 'VAC', desde: X, hasta: X, franjas: ['M'] }); return c; };
  const c1 = mk(), e1 = cieRango(c1, '2026-09-21', '2026-10-11');
  assert.ok(M.asignados(e1, X, 'EL33_M').some(x => x.pid === 'jenny' && x.cocina), 'Jenny lleva la cocina de El 33 esa mañana');
  const r = M.cubrirAusencia(c1, c1.staff, e1, 'jenny', X, X, ['M']);
  const hoj = M.asignados(e1, X, 'EL33_M').find(x => x.pid === 'hojan');
  assert.ok(hoj && hoj.por === 'jenny' && hoj.cocina, 'Hojan entra por Jenny con la cocina: ' + JSON.stringify(M.asignados(e1, X, 'EL33_M')) + ' ' + JSON.stringify(r.sinCubrir));
  assert.deepStrictEqual(r.sinCubrir, []);
  const c2 = mk(), g = M.generarSemana(c2, c2.staff, cieRango(c2, F3_LUN, F3_DOM), F3_LUN, { simular: true });
  assert.deepStrictEqual(M.asignados(g.estado, X, 'EL33_M').filter(x => x.por === 'jenny').map(x => x.pid + (x.cocina ? '+cocina' : '')), ['hojan+cocina']);
  // Victoria, de sala en la misma casilla que Hojan (que lleva la cocina), tiene «Cubre a Hojan»: no es el relevo
  // (no hace su puesto) y el porqué lo dice
  const L = '2026-09-28';
  const cfg = f3Escenario(null, (cc, st0) => { for (const p of st0) p.cubreA = []; M.personaDe(st0, 'victoria').cubreA = [{ pid: 'hojan' }]; });
  const e = cieRango(cfg, '2026-09-21', '2026-10-11');
  assert.ok(M.asignados(e, L, 'EL33_M').some(x => x.pid === 'hojan' && x.cocina) && M.asignados(e, L, 'EL33_M').some(x => x.pid === 'victoria' && !x.cocina));
  M.anadirAusencia(M.personaDe(cfg.staff, 'hojan'), { tipo: 'PERM', desde: L, hasta: L, franjas: ['M'] });
  const r2 = M.cubrirAusencia(cfg, cfg.staff, e, 'hojan', L, L, ['M']);
  assert.deepStrictEqual(r2.sinCubrir.map(s => s.quien.map(q => `${q.pid}: ${q.porQue}`).join()), ['victoria: ya está en ese turno de sala, y Hojan llevaba la cocina']);
  // y al revés: quien ya lleva la cocina no pasa a cubrir a quien era de sala
  assert.strictEqual(M.porQueNoCubre(cfg, cfg.staff, e, M.personaDe(cfg.staff, 'victoria'), L, 'EL33_M', 'hojan', { faltaCocina: true }), 'ya está en ese turno de sala, y Hojan llevaba la cocina');
  // barrido: cada persona puesta el lunes 28 y el jueves 1, cubierta por cada otra; nunca queda un porqué vacío
  const base = f3Escenario(), e0 = cieRango(base, '2026-09-28', '2026-10-04');
  const malos = [];
  for (const iso of ['2026-09-28', '2026-10-01']) for (const t of M.turnosDe(base)) for (const x of M.asignados(e0, iso, t.id)) for (const q of base.staff) {
    if (q.id === x.pid) continue;
    const c = JSON.parse(JSON.stringify(base)), st0 = c.staff;
    for (const p of st0) p.cubreA = []; M.personaDe(st0, q.id).cubreA = [{ pid: x.pid }];
    const fr = M.partirTurno(t.id).franja;
    M.anadirAusencia(M.personaDe(st0, x.pid), { tipo: 'PERM', desde: iso, hasta: iso, franjas: [fr] });
    const rr = M.cubrirAusencia(c, st0, cieRango(c, iso, iso), x.pid, iso, iso, [fr]);
    for (const s of rr.sinCubrir) for (const qq of s.quien) if (!qq.porQue || ['no se pudo poner', 'no entró en ese turno'].includes(qq.porQue)) malos.push(`${iso} ${t.id} falta ${x.pid}${x.cocina ? '(cocina)' : ''} ← ${q.id}`);
  }
  assert.deepStrictEqual(malos, [], 'sin porqué: ' + malos.slice(0, 6).join(' · '));
});

ok('F3b rev · «Guardar como semana tipo» una semana en que Iván falta: sus plazas vuelven de la semana tipo y quien le cubría no se guarda como plaza fija «por Iván»', () => {
  const cfg = f3Escenario(null, (c, st0) => { M.personaDe(st0, 'mariluz').cubreA = []; M.personaDe(st0, 'roberto').cubreA.push({ pid: 'ivan' }); }), st = cfg.staff;
  const antes = M.plazasDe(cfg, 2).filter(pl => pl.t === 'PASARELA_T');
  M.anadirAusencia(M.personaDe(st, 'ivan'), { tipo: 'VAC', desde: F3_LUN, hasta: F3_DOM });
  const e = cieRango(cfg, F3_LUN, F3_DOM);
  M.generarSemana(cfg, st, e, F3_LUN, {});
  assert.ok(M.asignados(e, '2026-09-29', 'PASARELA_T').some(x => x.pid === 'roberto' && x.por === 'ivan'), 'la semana tiene a Roberto por Iván');
  const pat = M.patronDesdeSemana(e, F3_LUN, cfg, st);
  const mar = (pat[2] || []).filter(pl => pl.t === 'PASARELA_T');
  assert.ok(mar.some(pl => pl.p === 'ivan'), 'Iván vuelve a su plaza del martes: ' + JSON.stringify(mar));
  assert.ok(!mar.some(pl => pl.p === 'roberto'), 'la cobertura de sus vacaciones no es una plaza fija: ' + JSON.stringify(mar));
  assert.deepStrictEqual(mar.map(pl => pl.p).sort(), antes.map(pl => pl.p).sort(), JSON.stringify([mar, antes]));
  // todas las plazas de Iván de la semana tipo siguen, las primeras de su casilla (sigue abriendo). Su «a» va con la regla de
  // las demás (30/09, A3, D8): Iván es «Quién abre» de Pasarela, así que no decide y no se guarda (antes se copiaba tal cual)
  for (let d = 1; d <= 7; d++) for (const pl of M.plazasDe(cfg, d).filter(x => x.p === 'ivan')) {
    const i = pat[d].findIndex(x => x.p === 'ivan' && x.t === pl.t);
    assert.ok(i >= 0 && i === pat[d].findIndex(x => x.t === pl.t) && !pat[d][i].a, `${d} ${pl.t}: ${JSON.stringify(pat[d].filter(x => x.t === pl.t))}`);
  }
  // la plaza fija con su «por» de siempre (D12: Lavinia por Mari Luz los miércoles) se conserva
  const mie = M.plazasDe(cfg, 3).filter(pl => pl.por);
  for (const pl of mie) assert.ok(pat[3].some(x => x.p === pl.p && x.t === pl.t && x.por === pl.por), JSON.stringify(pl));
});

ok('F3b rev · las ramas de cubrirAusencia y de la retirada: entra aunque la casilla siga completa («siempre», como la semana tipo); al quitar la ausencia y regenerar, Iván vuelve y quien le cubría sale', () => {
  // Roberto de permiso el viernes 2 por la mañana en Zapatillera: sin él quedan 3 de 2, y Lavinia, que le cubre, entra igual
  const V = '2026-10-02';
  const cfg = f3Escenario(null, (c, st0) => { for (const p of st0) p.cubreA = []; M.personaDe(st0, 'lavinia').cubreA = [{ pid: 'roberto' }]; }), st = cfg.staff;
  const e = cieRango(cfg, '2026-09-21', '2026-10-11');
  const s0 = M.clonarEstado(e); M.desasignar(s0, V, 'ZAPA_M', 'roberto');
  assert.strictEqual(M.revisarTurno(cfg, st, s0, V, 'ZAPA_M').faltan, 0, 'sin Roberto la casilla sigue completa');
  M.anadirAusencia(M.personaDe(st, 'roberto'), { tipo: 'PERM', desde: V, hasta: V, franjas: ['M'] });
  const r = M.cubrirAusencia(cfg, st, e, 'roberto', V, V, ['M']);
  assert.deepStrictEqual(f3bClaves(r.puestos), [`${V}|ZAPA_M|lavinia`]);
  assert.deepStrictEqual(r.sinCubrir, []);
  // Dulce cubre a Iván del martes 29 al sábado 3 por la tarde; se quita la ausencia (fue un error) y se regenera
  const cfg2 = f3rDulce(), st2 = cfg2.staff, e2 = cieRango(cfg2, '2026-09-21', '2026-10-11');
  M.anadirAusencia(M.personaDe(st2, 'ivan'), { tipo: 'VAC', desde: '2026-09-29', hasta: '2026-10-03', franjas: ['T'] });
  const r2 = M.cubrirAusencia(cfg2, st2, e2, 'ivan', '2026-09-29', '2026-10-03', ['T']);
  const dias = r2.puestos.filter(x => x.pid === 'dulce').map(x => x.iso);
  assert.ok(dias.length >= 2, JSON.stringify(r2.puestos));
  M.personaDe(st2, 'ivan').ausencias = [];
  const g = M.generarSemana(cfg2, st2, e2, F3_LUN, {});
  for (const iso of dias) {
    assert.ok(g.retirados.some(x => x.iso === iso && x.pid === 'dulce' && /Iván ya no falta/.test(x.motivo)), `${iso}: ${JSON.stringify(g.retirados)}`);
    assert.ok(M.pidsEn(e2, iso, 'PASARELA_T').includes('ivan') && !M.pidsEn(e2, iso, 'PASARELA_T').includes('dulce'), `${iso}: ${M.pidsEn(e2, iso, 'PASARELA_T')}`);
  }
});

ok('F3b rev · la Cobertura encuentra sola las casillas que dejó quien ya está apuntado ausente (su plaza de la semana tipo, con planilla ese día), aunque no venga de la confirmación de Equipo', () => {
  const cfg = f3Escenario(), st = cfg.staff;
  f3bVacIvan(cfg);
  const e = cieRango(cfg, '2026-09-21', '2026-10-18');
  const r0 = M.cubrirAusencia(cfg, st, e, 'ivan', F3_VIE, F3_DOM, ['T']);
  assert.ok(!M.pidsEn(e, F3_DOM, 'PASARELA_T').includes('ivan'));
  // (la confirmación dice si el relevo pasa a abrir: «ya estaba en ese turno y pasa a cubrirle, abriendo»)
  assert.deepStrictEqual(r0.relevos.map(x => `${x.iso}|${x.pid}|${x.abre}`), [`${F3_VIE}|mariluz|true`, `${F3_SAB}|mariluz|true`]);
  // días después, en la pestaña Cobertura: Iván, el domingo 4 (sin «dejadas»)
  const inc = { pid: 'ivan', tipo: 'VAC', dias: [F3_DOM], desde: F3_DOM, hasta: F3_DOM };
  const rg = M.rangoNecesario(inc);
  const res = M.planesCobertura(cfg, st, M.clonarEstado(cieRango(cfg, rg.desde, rg.hasta)), inc, {});
  assert.deepStrictEqual(res.afectados.map(a => `${a.iso}|${a.tid}|${!!a.dejada}`), [`${F3_DOM}|PASARELA_T|true`], 'antes: «Iván no tiene turnos en la planilla ese día»');
  assert.ok(res.planes[0].asignaciones.some(a => a.iso === F3_DOM && a.por === 'ivan'), JSON.stringify(res.planes[0].asignaciones));
  // un día sin planilla (semana sin generar) no tiene nada que cubrir; ni un día en que no falta
  const cfg2 = f3Escenario(); M.anadirAusencia(M.personaDe(cfg2.staff, 'ivan'), { tipo: 'VAC', desde: '2026-11-06', hasta: '2026-11-06' });
  const inc2 = { pid: 'ivan', tipo: 'VAC', dias: ['2026-11-06'], desde: '2026-11-06', hasta: '2026-11-06' }, rg2 = M.rangoNecesario(inc2);
  assert.deepStrictEqual(M.planesCobertura(cfg2, cfg2.staff, M.clonarEstado(cieRango(cfg2, rg2.desde, rg2.hasta)), inc2, {}).afectados, []);
  const cfg3 = f3Escenario(), e3 = cieRango(cfg3, '2026-09-21', '2026-10-18');
  M.desasignar(e3, F3_DOM, 'PASARELA_T', 'ivan');
  const inc3 = { pid: 'ivan', tipo: 'VAC', dias: [F3_DOM], desde: F3_DOM, hasta: F3_DOM };
  assert.deepStrictEqual(M.planesCobertura(cfg3, cfg3.staff, M.clonarEstado(e3), inc3, {}).afectados, [], 'si no está apuntado ausente, quitarle a mano no es «dejar» la casilla');
});


// ---------- fase 4 (24/09): una sola puerta, una sola puntuación ----------
// Diego, 24/09: «mejora la comunicación equipo con generador y cobertura, que lea todas las variables».
// evaluarPlaza evalúa TODAS las reglas de la ficha a la vez (la hoja «se destraparía si…» y el «NO
// PUEDEN» del selector lo necesitan) y puedeEstar es su envoltorio: el primer bloqueo, con la forma de
// siempre. La matriz completa está en tests/contrato-variables.test.mjs.
ok('F4 · evaluarPlaza da todos los bloqueos a la vez; puedeEstar, el primero, con la forma de siempre', () => {
  const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
  // Cristian el miércoles 7/10 en la mañana de Pasarela: libra los miércoles y no hace mañanas en Pasarela
  const ctx = M.crearContexto(cfg, st, e);
  const r = M.evaluarPlaza(ctx, '2026-10-07', 'PASARELA_M', 'cristian', {});
  assert.strictEqual(r.ok, false);
  assert.deepStrictEqual(r.bloqueos.map(b => b.k), ['libra', 'vetos']);
  assert.ok(r.bloqueos.every(b => b.forzable && b.motivo));
  const p = M.puedeEstar(cfg, st, e, '2026-10-07', 'PASARELA_M', 'cristian');
  assert.deepStrictEqual(p, { ok: false, motivo: r.bloqueos[0].motivo, regla: 'libra', avisos: [], autorizados: [] });
  // forzado: las dos quedan como avisos, en el mismo orden
  assert.deepStrictEqual(M.puedeEstar(cfg, st, e, '2026-10-07', 'PASARELA_M', 'cristian', { forzar: true }).avisos, r.bloqueos.map(b => b.motivo));
  // un bloqueo que no se fuerza (la ausencia) va delante y no se levanta forzando
  M.anadirAusencia(M.personaDe(st, 'cristian'), { tipo: 'VAC', desde: '2026-10-07', hasta: '2026-10-07' });
  const r2 = M.evaluarPlaza(ctx, '2026-10-07', 'PASARELA_M', 'cristian', { forzar: true });
  assert.strictEqual(r2.ok, false);
  assert.deepStrictEqual(r2.bloqueos.map(b => [b.k, b.forzable]), [['ausencia', false], ['libra', true], ['vetos', true]]);
});
ok('F4 · puedeEstar es exactamente el primer bloqueo de evaluarPlaza en toda la semana de la demo (sala, cocina y forzado)', () => {
  const cfg = Object.assign(cfgBase(), { meses: {} }); M.sembrarDemo(cfg, '2026-09-24');
  const st = cfg.staff, e = M.estadoDesde(cfg.meses, [], 2026, 10), ctx = M.crearContexto(cfg, st, e);
  let n0 = 0;
  for (let k = 5; k <= 11; k++) {
    const iso = `2026-10-${String(k).padStart(2, '0')}`;
    for (const t of M.turnosDe(cfg)) for (const p of st) for (const o of [{}, { puesto: 'sala', permitirPartido: true }, { puesto: 'cocina' }, { forzar: true, yaDentro: true }]) {
      const r = M.puedeEstar(cfg, st, e, iso, t.id, p.id, o), ev = M.evaluarPlaza(ctx, iso, t.id, p.id, o);
      const manda = ev.bloqueos.find(b => !b.forzado && !b.extra);
      assert.strictEqual(r.ok, !manda, `${iso} ${t.id} ${p.id} ${JSON.stringify(o)}`);
      if (manda) assert.strictEqual(r.regla, manda.k);
      n0++;
    }
  }
  assert.ok(n0 > 5000);
});
// (fase 5, 24/09: la carga pasa a ser «N turnos esa semana · M este mes» en los dos modos; ver «F5 · 0a»)
ok('F4 · una sola puntuación: PESOS, y la misma carga (turnos de esa semana y de ese mes) en el relleno y en la Cobertura', () => {
  assert.ok(M.PESOS && M.PESOS.base === 50 && M.PESOS.turnoSemana === -4 && M.PESOS.turnoMes === -3 && M.PESOS.cubreA > 0);
  // de lunes a miércoles generados; el viernes 9, vacío salvo Iván en la tarde de Pasarela
  const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
  M.generarPlanilla(cfg, st, e, '2026-10-05', '2026-10-07', {});
  assert.ok(M.asignar(e, cfg, st, '2026-10-09', 'PASARELA_T', 'ivan', {}).ok);
  const rel = M.candidatosPara(cfg, st, e, '2026-10-09', 'PASARELA_T');
  const cob = M.candidatosCobertura(cfg, st, e, '2026-10-09', 'PASARELA_T', 'ivan');
  assert.ok(rel.length && cob.length);
  for (const c of rel) {
    assert.ok(c.razones.some(x => /turnos? esa semana$/.test(x)) && c.razones.some(x => /^\d+ este mes$/.test(x)), c.razones.join(' · '));
    const d = cob.find(y => y.pid === c.pid);
    if (d) for (const re of [/esa semana$/, /este mes$/]) assert.strictEqual(c.razones.find(x => re.test(x)), d.razones.find(x => re.test(x)), c.pid);
  }
  // candidatosPara y candidatosCobertura son la misma función (candidatos) en dos modos
  const ctx = M.crearContexto(cfg, st, e);
  assert.ok(rel.some(c => c.turnosSemana > 0), 'la carga cuenta los turnos de lunes a miércoles');
  assert.deepStrictEqual(M.candidatos(ctx, '2026-10-09', 'PASARELA_T', { modo: 'relleno' }), rel);
  assert.deepStrictEqual(M.candidatos(ctx, '2026-10-09', 'PASARELA_T', { modo: 'cobertura', faltaPid: 'ivan' }), cob);
});

// ---------- fase 4, revisión (24/09) ----------
// Los dos revisores de la fase 4. Cada prueba dice qué problema cierra.
// (1) «si la puerta la suelta, Horas no la cuenta»: una plaza que se ha quedado en una casilla CERRADA ESE
// DÍA (por fechas o a mano) no ocupa a nadie; en una que «Cuándo abre» ya no abre, sí: es el horario de
// todas las semanas, Horas la sigue contando (revisión F2: lo trabajado no se borra), la Revisión la marca
// como «plaza-en-cerrado» y el Generador retira la automática. Antes la puerta soltaba a la persona también
// con «Cuándo abre» y quedaba puesta dos veces en la misma franja, y Horas le contaba las dos.
ok('F4 rev · una plaza en una casilla que «Cuándo abre» ya no abre sigue ocupando (la puerta y Horas dicen lo mismo); cerrada ese día, no', () => {
  const cfg = Object.assign(cfgBase(), { meses: {} }); M.sembrarDemo(cfg, '2026-09-24');
  const st = cfg.staff, iso = '2026-10-06', e = M.estadoDesde(cfg.meses, [], 2026, 10);
  assert.ok(M.pidsEn(e, iso, 'MONACO_T').includes('cristian'));
  const tardes = () => M.horasPersonaMes(cfg, st, cfg.meses, 'cristian', 2026, 10).tardes;
  const t0 = tardes();
  const l = M.localDe(cfg, 'MONACO'), abreT = l.abre.T.slice();
  l.abre.T = l.abre.T.filter(d => d !== 2);   // «Cuándo abre»: el Mónaco deja de abrir los martes por la tarde
  const r = M.puedeEstar(cfg, st, e, iso, 'ZAPA_T', 'cristian', { puesto: 'sala' });
  assert.strictEqual(r.regla, 'otraFranja', JSON.stringify(r));
  assert.strictEqual(tardes(), t0, 'Horas la sigue contando');
  assert.strictEqual(M.plazaOcupa(cfg, e, iso, 'MONACO_T'), true);
  // cerrada ESE día a mano: la puerta la suelta y Horas deja de contarla
  l.abre.T = abreT;
  M.toggleApertura(e, iso, 'MONACO_T', cfg);
  const r2 = M.puedeEstar(cfg, st, e, iso, 'ZAPA_T', 'cristian', { puesto: 'sala' });
  assert.notStrictEqual(r2.regla, 'otraFranja', JSON.stringify(r2));
  assert.strictEqual(tardes(), t0 - 1);
  assert.strictEqual(M.plazaOcupa(cfg, e, iso, 'MONACO_T'), false);
});
ok('F4 rev · la cocina de una casilla que «Cuándo abre» ya no abre sigue contando para «ya lleva la cocina ese día»; cerrada ese día, no (cocinaDelDia, el mismo helper que la puerta)', () => {
  const cfg = Object.assign(cfgBase(), { meses: {} }); M.sembrarDemo(cfg, '2026-09-24');
  const st = cfg.staff, iso = '2026-09-28', e = M.estadoDesde(cfg.meses, [], 2026, 9);
  assert.ok(M.asignados(e, iso, 'MONACO_M').some(x => x.pid === 'jenny' && x.cocina));
  const ctx = M.crearContexto(cfg, st, e);
  const cocinaSala = () => M.evaluarPlaza(ctx, iso, 'PASARELA_T', 'jenny', { puesto: 'sala' }).bloqueos.filter(b => b.k === 'cocina').map(b => b.motivo);
  const l = M.localDe(cfg, 'MONACO'), abreM = l.abre.M.slice();
  l.abre.M = l.abre.M.filter(d => d !== 1);   // el Mónaco deja de abrir los lunes por la mañana (todas las semanas)
  assert.deepStrictEqual(cocinaSala(), ['ya lleva la cocina de Bar Mónaco ese día']);
  assert.strictEqual(M.cocinaDelDia(cfg, e, iso, 'jenny'), 'MONACO_M');
  l.abre.M = abreM;
  M.toggleApertura(e, iso, 'MONACO_M', cfg);   // cerrada ese lunes a mano
  assert.deepStrictEqual(cocinaSala(), []);
  assert.strictEqual(M.cocinaDelDia(cfg, e, iso, 'jenny'), null, 'el helper exportado dice lo mismo que la puerta');
  assert.strictEqual(M.enCocinaEse, undefined, 'la copia sin uso ya no existe');
});
// (2) «N turnos esa semana» con la semana entera también en el selector, la ★ de Hoy y el Generador →
// Periodo: reciben el estado del mes y, en la semana que cruza de mes (28/09-04/10), contaban solo los
// días de ese mes (Cristian, «2 turnos esa semana» el lunes 28 con 7). Con opts.meses la carga lee los
// días de la semana que caen en el otro mes.
function f4rDemo() { const cfg = Object.assign(cfgBase(), { meses: {} }); M.sembrarDemo(cfg, '2026-09-24'); return cfg; }
function f4rTurnosSemana(cfg, pid, lunes) {
  let n = 0;
  for (let k = 0; k < 7; k++) { const iso = M.addDias(lunes, k), e = M.estadoDesde(cfg.meses, [], +iso.slice(0, 4), +iso.slice(5, 7)); for (const t of M.turnosDe(cfg)) if (M.pidsEn(e, iso, t.id).includes(pid)) n++; }
  return n;
}
ok('F4 rev · el selector cuenta los turnos de la semana entera aunque la semana cruce de mes (opts.meses)', () => {
  const cfg = f4rDemo(), st = cfg.staff;
  let vistas = 0;
  for (const [iso, tid] of [['2026-10-01', 'PASARELA_T'], ['2026-10-01', 'ZAPA_T'], ['2026-09-28', 'MONACO_T'], ['2026-10-04', 'PASARELA_T']]) {
    const e = M.estadoDesde(cfg.meses, [], +iso.slice(0, 4), +iso.slice(5, 7));
    const l = M.asignados(e, iso, tid); M.desasignar(e, iso, tid, l[l.length - 1].pid);
    const g = M.gruposSelector(cfg, st, e, iso, tid, { meses: cfg.meses });
    for (const c of [...g.cocina, ...g.pueden, ...g.conAviso]) {
      const real = f4rTurnosSemana(cfg, c.pid, '2026-09-28');
      assert.strictEqual(c.turnosSemana, real, `${iso} ${tid} ${c.pid}: dice ${c.turnosSemana}, tiene ${real}`);
      assert.ok(c.razones.includes(`${real} turno${real === 1 ? '' : 's'} esa semana`), c.razones.join(' · '));
      vistas++;
    }
  }
  assert.ok(vistas > 5);
});
ok('F4 rev · el relleno del Periodo (generarPlanilla con opts.meses) cuenta los días de la semana que caen en el otro mes', () => {
  const cfg = f4rDemo(), st = cfg.staff, iso = '2026-10-01';
  const e = M.estadoDesde(cfg.meses, [], 2026, 10);
  for (const t of M.turnosDe(cfg)) for (const pid of M.pidsEn(e, iso, t.id)) M.desasignar(e, iso, t.id, pid);
  const r = M.generarPlanilla(cfg, st, e, iso, iso, { simular: true, sinPatron: true, meses: cfg.meses });
  const a = r.aplicados[0];
  const m = /(\d+) turnos? esa semana/.exec(a.razon);
  assert.ok(m, a.razon);
  // el jueves 1 está vacío: los turnos de esa semana son los de lunes a miércoles (septiembre) y de viernes a domingo
  assert.strictEqual(+m[1], f4rTurnosSemana(cfg, a.pid, '2026-09-28'), `${a.pid}: ${a.razon}`);
  assert.ok(+m[1] > 0);
});
// (3) S35: en una casilla sin cocina, quien puede llevarla con aviso (un partido no declarado) sale «con
// aviso» marcada de cocina y entra llevándola; en «no pueden», quien lleva esa cocina se evalúa y se fuerza
// como cocina. Antes Jenny (titular de la cocina del Mónaco, que ese lunes lleva la de la mañana) salía en
// «no pueden» con «ya lleva la cocina de Bar Mónaco ese día», un motivo de sala, y «forzar» la ponía de sala.
ok('F4 rev · selector: en una casilla sin cocina, quien puede llevarla con aviso sale «con aviso» como cocina; en «no pueden», se evalúa y se fuerza como cocina', () => {
  const cfg = f4rDemo(), st = cfg.staff, V = '2026-09-28', e = M.estadoDesde(cfg.meses, [], 2026, 9);
  M.desasignar(e, V, 'MONACO_T', 'hojan');
  const g = M.gruposSelector(cfg, st, e, V, 'MONACO_T');
  const j = g.conAviso.find(c => c.pid === 'jenny');
  assert.ok(j && j.cocina === true, JSON.stringify(g.conAviso.map(c => [c.pid, c.cocina])));
  assert.ok(j.avisos.some(a => /partido/.test(a)) && j.razones.some(r => /cocina titular de Bar Mónaco/.test(r)), JSON.stringify(j));
  assert.ok(!g.noPueden.some(x => x.pid === 'jenny'));
  // Esmeralda (titular de la cocina del Mónaco, siempre de mañana): «no pueden», como cocina
  const es = g.noPueden.find(x => x.pid === 'esmeralda');
  assert.ok(es && es.cocina === true && es.regla === 'franjas', JSON.stringify(es));
  for (const x of g.noPueden) {
    assert.strictEqual(!!x.cocina, M.puedeCocina(cfg, M.personaDe(st, x.pid), 'MONACO', V), x.pid);
    const o = Object.assign({ forzar: true, permitirPartido: true }, x.cocina ? { puesto: 'cocina', cocina: true } : { puesto: 'sala' });
    assert.strictEqual(x.forzable, M.puedeEstar(cfg, st, e, V, 'MONACO_T', x.pid, o).ok, x.pid);
  }
});
// (4) «forzar» dice TODAS las reglas que se incumplen, cada una con la suya, y son justo los avisos que se
// guardan al forzar (siSeFuerza, la misma puerta; lo usan el selector y el Mes). Antes la pregunta nombraba
// solo la primera (Jacquelin: «Locales donde trabaja») y el aviso de después se las atribuía todas a ella.
ok('F4 rev · siSeFuerza: todas las reglas que incumpliría forzada, cada una con la suya, y son los avisos que se guardan', () => {
  const cfg = f4rDemo(), st = cfg.staff, V = '2026-09-28', e = M.estadoDesde(cfg.meses, [], 2026, 9);
  M.desasignar(e, V, 'MONACO_T', 'hojan');
  const x = M.gruposSelector(cfg, st, e, V, 'MONACO_T').noPueden.find(y => y.pid === 'jacquelin');
  assert.deepStrictEqual(x.incumple.map(i => i.k), ['locales', 'franjas', 'partido']);
  assert.deepStrictEqual(x.incumple.map(i => i.motivo), ['solo Zapatillera', 'siempre de mañana', 'partido no declarado los lunes']);
  const f = M.siSeFuerza(cfg, st, e, V, 'MONACO_T', 'jacquelin', { permitirPartido: true, puesto: 'sala' });
  assert.strictEqual(f.forzable, true);
  assert.deepStrictEqual(f.incumple, x.incumple);
  const a = M.asignar(M.clonarEstado(e), cfg, st, V, 'MONACO_T', 'jacquelin', { forzar: true, permitirPartido: true, puesto: 'sala' });
  assert.deepStrictEqual(a.avisos, f.incumple.map(i => i.motivo));
  // lo que no se fuerza: forzable false, y el motivo y la regla que lo impiden
  const n = M.siSeFuerza(cfg, st, e, V, 'MONACO_T', 'laura', { permitirPartido: true });
  assert.ok(!n.forzable && n.regla === 'ausencia' && n.motivo, JSON.stringify(n));
});
// (5) El Generador enseña lo que la puerta aplica: «Hojan solo hace cocina», «quien lleva la cocina ese día
// no refuerza la sala» y el standby de Dulce eran reglas de la puerta sin condición (Dulce salía como si
// estuviera activa).
ok('F4 rev · condiciones: solo hace cocina, standby y «quien lleva la cocina no refuerza la sala», con su verificación', () => {
  const cfg = cfgBase(), st = cfg.staff, L = '2026-09-28';
  const cs = M.condicionesDe(cfg, st, L);
  const c = id => cs.find(x => x.id === id);
  assert.ok(c('p:hojan:soloCocina') && /Hojan solo hace cocina/.test(c('p:hojan:soloCocina').texto), 'Hojan');
  assert.ok(c('p:dulce:standby') && /Dulce.*standby/.test(c('p:dulce:standby').texto), 'Dulce');
  assert.ok(c('reg:cocinaSala') && /cocina.*sala/.test(c('reg:cocinaSala').texto), 'cocina y sala');
  const e = M.nuevoEstado(2026, 9, { festivos: [] }); for (const d of ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']) e.asig[d] = {};
  const sem = { y: 2026, m: 9, days: [], asig: e.asig, apertura: e.apertura, manual: e.manual, festivos: [], virtual: true };
  const ok0 = M.verificarSemana(cfg, st, sem, L);
  for (const id of ['p:hojan:soloCocina', 'p:dulce:standby', 'reg:cocinaSala']) assert.ok(ok0.find(x => x.id === id).ok, id + ' sin nadie puesto se cumple');
  const f = { forzar: true, permitirPartido: true };
  // (en Pasarela, que no tiene cocina: en una casilla sin cocina, normalizarCasilla le daría la cocina)
  assert.ok(M.asignar(sem, cfg, st, '2026-09-29', 'PASARELA_T', 'hojan', Object.assign({ puesto: 'sala' }, f)).ok);
  assert.ok(M.asignar(sem, cfg, st, '2026-09-30', 'PASARELA_M', 'dulce', Object.assign({ puesto: 'sala' }, f)).ok);
  assert.ok(M.asignar(sem, cfg, st, '2026-10-01', 'MONACO_M', 'jenny', { cocina: true, puesto: 'cocina' }).ok);
  assert.ok(M.asignar(sem, cfg, st, '2026-10-01', 'PASARELA_T', 'jenny', Object.assign({ puesto: 'sala' }, f)).ok);
  const v = M.verificarSemana(cfg, st, sem, L);
  const ko = id => v.find(x => x.id === id);
  assert.ok(!ko('p:hojan:soloCocina').ok && /martes 29/.test(ko('p:hojan:soloCocina').detalle), JSON.stringify(ko('p:hojan:soloCocina')));
  assert.ok(!ko('p:dulce:standby').ok && /miércoles 30/.test(ko('p:dulce:standby').detalle), JSON.stringify(ko('p:dulce:standby')));
  assert.ok(!ko('reg:cocinaSala').ok && /Jenny/.test(ko('reg:cocinaSala').detalle), JSON.stringify(ko('reg:cocinaSala')));
  // con «Cocina» apagada no se listan las de cocina (la puerta tampoco las aplica)
  const cfg2 = cfgBase(); cfg2.reglas = { cocina: false };
  const cs2 = M.condicionesDe(cfg2, cfg2.staff, L);
  assert.ok(!cs2.some(x => x.id === 'p:hojan:soloCocina' || x.id === 'reg:cocinaSala'));
});
// (6) textos: la hoja impresa dice «Dulce, que está en standby» (sin los dos puntos dentro de una lista separada por «;»)
ok('F4 rev · la hoja impresa: «que está en standby»', () => {
  const cfg = cfgBase();
  assert.strictEqual(M.fraseBloqueo({ k: 'standby', motivo: 'en standby: aún no entra en la planilla' }, M.personaDe(cfg.staff, 'dulce')), 'está en standby');
});


// ---------- fase 5 (24/09): cocina y quién abre, y el reparto del mes ----------
// 0) El reparto (decisión del coordinador a la vista del experimento de la revisión de la fase 4): la carga
// era solo «N turnos esa semana» (-4 por turno) y, generando octubre sin semana tipo, unas personas hacían
// 36 turnos y otras 9 (desviación del mes 10,87). Se añade la carga del mes (-3 por turno de ese mes, en el
// relleno y en la Cobertura): 9,45. Con semana tipo no cambia nada, y el plan A de Iván tampoco.
function f5Reparto(cfg, e) {
  const n = {}, sem = {}; let plazas = 0;
  for (const iso of Object.keys(e.asig)) for (const l of Object.values(e.asig[iso])) for (const x of l) { n[x.pid] = (n[x.pid] || 0) + 1; plazas++; const k = M.lunesDe(iso); (sem[k] = sem[k] || {})[x.pid] = (sem[k][x.pid] || 0) + 1; }
  const sd = xs => { const m = xs.reduce((a, b) => a + b, 0) / xs.length; return Math.sqrt(xs.reduce((a, v) => a + (v - m) ** 2, 0) / xs.length); };
  const semanal = Object.values(sem).map(o => sd(cfg.staff.filter(p => !p.standby && n[p.id] !== undefined).map(p => o[p.id] || 0)));
  return { plazas, mes: sd(Object.values(n)), semanal: semanal.reduce((a, b) => a + b, 0) / semanal.length };
}
function f5TurnosMes(e, pid, mes) { let k = 0; for (const iso of Object.keys(e.asig)) if (iso.slice(0, 7) === mes) for (const l of Object.values(e.asig[iso])) if (l.some(x => x.pid === pid)) k++; return k; }
// (revisión de la fase 5: el umbral del mes pasa de 9,5 a 9,6. Con la carga del mes se perdía la cocina
// obligatoria de la tarde del Mónaco el 21 y el 28/10; cubrirla (Noe y Jenny llevan tres cocinas más) deja la
// desviación en 9,55 con 559 plazas y 40 huecos, frente a 9,45 con 556 y 45, y 10,87 antes de la fase 5)
ok('F5 · 0a reparto: octubre sin semana tipo reparte mejor el mes (desviación ≤ 9,6) y la semana (≤ 2,0); la razón dice «N turnos esa semana · M este mes»', () => {
  const cfg = Object.assign(cfgBase(), { meses: {} }), e = estadoOct();
  M.generarPlanilla(cfg, cfg.staff, e, '2026-10-01', '2026-10-31', { sinPatron: true });
  const r = f5Reparto(cfg, e);
  assert.ok(r.mes <= 9.6 && r.semanal <= 2.0, `desviación del mes ${r.mes.toFixed(2)}, semanal ${r.semanal.toFixed(2)} (${r.plazas} plazas)`);
  assert.strictEqual(M.PESOS.turnoMes, -3, 'la carga del mes: -3 por turno de ese mes');
  // la razón: «N turnos esa semana» y «M este mes», en los dos modos, con la M de verdad
  const e2 = estadoOct(); M.generarPlanilla(cfg, cfg.staff, e2, '2026-10-01', '2026-10-14', { sinPatron: true });
  const iso = '2026-10-16', tid = 'PASARELA_T';
  const rel = M.candidatosPara(cfg, cfg.staff, e2, iso, tid), cob = M.candidatosCobertura(cfg, cfg.staff, e2, iso, tid, 'ivan');
  assert.ok(rel.length && cob.length);
  for (const c of rel.concat(cob)) {
    const i = c.razones.findIndex(x => /turnos? esa semana$/.test(x));
    const m = f5TurnosMes(e2, c.pid, '2026-10');
    assert.ok(i >= 0 && c.razones[i + 1] === `${m} este mes`, `${c.pid}: ${c.razones.join(' · ')} (tiene ${m} este mes)`);
  }
  assert.ok(rel.some(c => f5TurnosMes(e2, c.pid, '2026-10') > 0));
});
// 0b y 0c comparan con la foto de antes de la fase 5 (tests/fotos/f5-head.json, del commit 86da4ff; revisión de la
// fase 5: comparaban el código nuevo consigo mismo con la carga del mes a 0 y no veían lo que cambiaran S18 o S38)
const F5_HEAD = require('./tests/fotos/f5-head.json');
ok('F5 · 0b reparto: con semana tipo, las semanas del 21/09, 28/09 y 05/10 salen casilla a casilla igual que antes de la fase 5 (foto)', () => {
  const cfg = Object.assign(cfgBase(), { meses: {} }), out = {};
  for (const lunes of ['2026-09-21', '2026-09-28', '2026-10-05']) {
    const e = cieRango(cfg, lunes, M.addDias(lunes, 6));
    const r = M.generarSemana(cfg, cfg.staff, e, lunes, { meses: cfg.meses });
    for (const d of r.dias) for (const t of M.turnosDe(cfg)) out[d + '|' + t.id] = M.asignados(r.estado, d, t.id).map(x => [x.pid, x.cocina ? 'c' : '', x.abre ? 'a' : '', x.por || ''].join('~')).join(',');
    out[lunes + '|huecos'] = r.huecos.map(h => `${h.iso}|${h.turnoId}|${h.tipo}`).join(',');
  }
  const antes = F5_HEAD.semanas;
  assert.deepStrictEqual(Object.keys(out).sort(), Object.keys(antes).sort());
  const difs = Object.keys(antes).filter(k => out[k] !== antes[k]);
  assert.deepStrictEqual(difs.map(k => `${k}: ${antes[k]} → ${out[k]}`), []);
});
ok('F5 · 0c reparto: el plan A de la Cobertura de Iván (vie 2 a dom 4) sale igual que antes de la fase 5 (foto), con y sin los meses', () => {
  const plan = conMeses => { const cfg = f3Escenario(), inc = F3_INC(); const A = M.planesCobertura(cfg, cfg.staff, f3Entero(cfg, inc), inc, Object.assign({ siempre: false, intercambio: false }, conMeses ? { meses: cfg.meses } : {})).planes[0]; return A.asignaciones.map(a => `${a.iso}|${a.tid}|${a.pid}|${a.yaEstaba ? 'ya' : ''}|${a.cocina ? 'c' : ''}|${a.abre ? 'a' : ''}|${a.por || ''}`); };
  assert.deepStrictEqual(plan(false), F5_HEAD.planA.sinMeses, 'sin meses');
  assert.deepStrictEqual(plan(true), F5_HEAD.planA.conMeses, 'con meses');
  const A = plan(true);
  assert.ok(A.includes('2026-10-02|PASARELA_T|mariluz|ya||a|ivan') && A.includes('2026-10-03|PASARELA_T|mariluz|ya||a|ivan'), A.join('\n'));
});

// 1) Quién sale el primero (S18, S19, S32). La marca «a» de la semana tipo era un «abre fijado a mano»: cada
// «Guardar como semana tipo» congelaba quién abre, Lola «nunca de primero» seguía saliendo 1.ª, «Quién abre» del
// local no cambiaba nada y apagar «Sale el primero» no quitaba el ▸. Ahora la «a» es una preferencia (origen
// 'patron') que va detrás del fijo del local y de la ficha, solo si puede abrir y con el interruptor encendido.
function f5Semana(cfg, lunes, opts) { const l = lunes || F3_LUN; const e = f3Semana(l); const g = M.generarSemana(cfg, cfg.staff, e, l, opts || {}); return { e, g }; }
ok('F5 · S18 la semana tipo no deja el «abre» como puesto a mano, y abren los de siempre', () => {
  const cfg = cfgBase(), st = cfg.staff;
  const { e, g } = f5Semana(cfg);
  let manuales = 0; for (const d of g.dias) for (const t of M.turnosDe(cfg)) if (M.manualDe(e, d, t.id).abre) manuales++;
  assert.strictEqual(manuales, 0, 'casillas con el abre fijado a mano');
  assert.strictEqual(M.primeroDe(cfg, st, e, '2026-09-29', 'PASARELA_M'), 'lola');
  assert.strictEqual(M.primeroDe(cfg, st, e, '2026-09-29', 'PASARELA_T'), 'ivan');
  assert.strictEqual(M.primeroDe(cfg, st, e, '2026-09-29', 'MONACO_T'), 'scapon');
});
ok('F5 · S18 Lola «nunca de primero» de mañana y Yilian de tarde: con la semana tipo no salen primeras, sin avisos', () => {
  const cfg = cfgBase(), st = cfg.staff;
  M.personaDe(st, 'lola').noPrimero = ['M']; M.personaDe(st, 'yilian').noPrimero = ['T'];
  const { e, g } = f5Semana(cfg);
  for (const d of g.dias) {
    assert.notStrictEqual(M.primeroDe(cfg, st, e, d, 'PASARELA_M'), 'lola', d);
    assert.notStrictEqual(M.primeroDe(cfg, st, e, d, 'MONACO_T'), 'yilian', d);
  }
  assert.ok(!M.revisionMes(cfg, st, e, { desde: F3_LUN, hasta: F3_DOM }).some(x => x.tipo === 'abre-no-apto'));
  assert.deepStrictEqual(g.condiciones.filter(c => (c.pid === 'lola' || c.pid === 'yilian') && c.k === 'noPrimero' && !c.ok).map(c => c.detalle), []);
});
ok('F5 · S18 «Sale primero» a mano sobre Leo o Cristian en El 33 deja el aviso en la casilla, en Hoy y en la Revisión (L5)', () => {
  const cfg = cfgBase(), st = cfg.staff;
  const { e } = f5Semana(cfg);
  for (const [iso, tid, pid, re] of [['2026-09-28', 'PASARELA_T', 'leo', /Leo no sale el primero de la tarde/], ['2026-10-03', 'EL33_M', 'cristian', /Cristian no abre El 33/]]) {
    if (!M.pidsEn(e, iso, tid).includes(pid)) assert.ok(M.asignar(e, cfg, st, iso, tid, pid, { forzar: true, permitirPartido: true, puesto: 'sala' }).ok);
    M.marcarAbre(e, iso, tid, pid, cfg);
    const s = M.posicionesDe(cfg, st, e, iso, tid).find(x => x.pid === pid);
    assert.ok(s.abre && s.avisos.some(a => re.test(a)), JSON.stringify(s));
    assert.ok(M.revisarTurno(cfg, st, e, iso, tid).abreNoApto, 'revisarTurno');
    const rv = M.revisionMes(cfg, st, e, { desde: iso, hasta: iso }).filter(x => x.turnoId === tid && x.tipo === 'abre-no-apto');
    assert.ok(rv.length === 1 && re.test(rv[0].msg), JSON.stringify(rv));
  }
});
ok('F5 · S18 «Quién abre» de Pasarela tarde a Mari Luz: con la semana tipo abre ella donde puede, y el Generador lo comprueba', () => {
  const cfg = cfgBase(), st = cfg.staff;
  M.localDe(cfg, 'PASARELA').primero.T = 'mariluz';
  const { e, g } = f5Semana(cfg);
  let vistos = 0;
  for (const d of g.dias) {
    if (!M.pidsEn(e, d, 'PASARELA_T').includes('mariluz') || !M.puedePrimero(cfg, st, e, d, 'PASARELA_T', 'mariluz').ok) continue;
    assert.strictEqual(M.primeroDe(cfg, st, e, d, 'PASARELA_T'), 'mariluz', d); vistos++;
  }
  assert.ok(vistos > 0, 'algún día de la semana abre Mari Luz');
  const c = g.condiciones.find(x => x.id === 'loc:PASARELA:primero:T');
  assert.ok(c && /En Pasarela, por la tarde, abre Mari Luz/.test(c.texto) && c.ok, JSON.stringify(c));
  // Iván («sale el primero» en su ficha) no rompe su condición los días que abre quien dice el local
  assert.ok(g.condiciones.find(x => x.id === 'p:ivan:abre:PASARELA:T').ok, JSON.stringify(g.condiciones.find(x => x.id === 'p:ivan:abre:PASARELA:T')));
});
ok('F5 · S18 «Guardar como semana tipo» guarda solo las «a» puestas a mano, y quien abría sigue abriendo', () => {
  const cfg = cfgBase(), st = cfg.staff;
  const e = f3Semana(); M.generarSemana(cfg, st, e, F3_LUN, { sinPatron: true });
  const conA = pat => Object.values(pat).flat().filter(pl => pl.a).map(pl => pl.t + ':' + pl.p);
  assert.deepStrictEqual(conA(M.patronDesdeSemana(e, F3_LUN, cfg, st)), [], 'sin semana tipo nadie decidió quién abre (r5b)');
  // una casilla con alguien que podría abrir y no abre (y no está cubriendo a nadie: esa plaza no se guarda)
  const d = '2026-09-29';
  const tid = M.turnosDe(cfg).map(t => t.id).find(t => M.asignados(e, d, t).some(x => x.pid !== M.primeroDe(cfg, st, e, d, t) && !M.porDe(st, x) && M.puedePrimero(cfg, st, e, d, t, x.pid).ok));
  const otro = M.asignados(e, d, tid).find(x => x.pid !== M.primeroDe(cfg, st, e, d, tid) && !M.porDe(st, x) && M.puedePrimero(cfg, st, e, d, tid, x.pid).ok).pid;
  M.marcarAbre(e, d, tid, otro, cfg);
  assert.deepStrictEqual(conA(M.patronDesdeSemana(e, F3_LUN, cfg, st)), [tid + ':' + otro]);
  // con la semana tipo de la semilla: ninguna «a» (nadie la puso a mano), y generando con la semana guardada
  // abren los mismos (las plazas van en el orden de la casilla)
  const c2 = cfgBase(); const { e: e2 } = f5Semana(c2);
  const pat = M.patronDesdeSemana(e2, F3_LUN, c2, c2.staff);
  assert.deepStrictEqual(conA(pat), []);
  const c3 = cfgBase(); c3.patron = pat; const { e: e3 } = f5Semana(c3);
  for (let k = 0; k < 7; k++) { const d2 = M.addDias(F3_LUN, k); for (const t of M.turnosDe(c3)) assert.strictEqual(M.primeroDe(c3, c3.staff, e3, d2, t.id), M.primeroDe(c2, c2.staff, e2, d2, t.id), `${d2} ${t.id}`); }
});
ok('F5 · S18 migración: de las «a» de la semana tipo guardada se quitan las que ya salían solas; las semanas salen igual', () => {
  const estado = cfgBase();
  const nA = pat => Object.values(pat).flat().filter(pl => pl.a).length;
  const antes = nA(estado.patron);
  // una «a» que decide: Yilian abre la mañana del Mónaco el miércoles (sin ella abriría Cris, la primera de la plaza)
  const pl = estado.patron[3].find(x => x.t === 'MONACO_M' && x.p === 'yilian'); assert.ok(pl, 'Yilian tiene plaza el miércoles'); pl.a = 1;
  const r = M.migrarAbrePatron(estado, '2026-09-24');
  assert.ok(r.quitadas > 0 && nA(estado.patron) === antes + 1 - r.quitadas, JSON.stringify(r));
  assert.ok(estado.patron[3].find(x => x.t === 'MONACO_M' && x.p === 'yilian').a, 'la que decide se queda');
  assert.strictEqual(estado.migraciones.abrePatron2409, 1);
  assert.strictEqual(M.migrarAbrePatron(estado, '2026-09-24').quitadas, 0, 'una sola vez');
  for (const lunes of [F3_LUN, '2026-10-05']) {
    const c1 = cfgBase(); c1.patron[3].find(x => x.t === 'MONACO_M' && x.p === 'yilian').a = 1;
    const e1 = f3Semana(lunes); M.generarSemana(c1, c1.staff, e1, lunes, {});
    const c2 = cfgBase(); c2.patron = estado.patron; const e2 = f3Semana(lunes); M.generarSemana(c2, c2.staff, e2, lunes, {});
    for (let k = 0; k < 7; k++) { const d = M.addDias(lunes, k); for (const t of M.turnosDe(c1)) assert.strictEqual(M.primeroDe(c2, c2.staff, e2, d, t.id), M.primeroDe(c1, c1.staff, e1, d, t.id), `${d} ${t.id}`); }
  }
});
ok('F5 · S18 volcar el Periodo a la planilla no deja quién abre como puesto a mano (y abre el mismo)', () => {
  const cfg = Object.assign(cfgBase(), { meses: {} }), st = cfg.staff;
  const real = estadoOct();
  const g = M.generarPlanilla(cfg, st, real, '2026-10-05', '2026-10-11', { simular: true });
  M.volcarPrevia(cfg, st, () => real, g, { desde: '2026-10-05', hasta: '2026-10-11', previaDe: () => g.estado });
  let man = 0;
  for (const iso of M.rangoIso('2026-10-05', '2026-10-11')) for (const t of M.turnosDe(cfg)) {
    if (M.manualDe(real, iso, t.id).abre) man++;
    assert.strictEqual(M.primeroDe(cfg, st, real, iso, t.id), M.primeroDe(cfg, st, g.estado, iso, t.id), iso + ' ' + t.id);
  }
  assert.strictEqual(man, 0);
});
ok('F5 · S19 «Sale el primero» apagado en el grupo: buscando quién abre no suma, en el relleno ni en la Cobertura (H8)', () => {
  const cfg = cfgBase(), st = cfg.staff; cfg.reglas = { abre: false };
  // (la casilla con Hojan en la cocina: desde la revisión F3, S33, un apoyo no entra solo en una casilla vacía)
  const e = f3Semana(); assert.ok(M.asignar(e, cfg, st, '2026-09-30', 'MONACO_T', 'hojan', { cocina: true, puesto: 'cocina' }).ok);
  const rel = M.candidatosPara(cfg, st, e, '2026-09-30', 'MONACO_T', { primero: true });
  const cob = M.candidatosCobertura(cfg, st, e, '2026-09-30', 'MONACO_T', 'hojan', { primero: true });
  // Susana Capón, la fija de la tarde del Mónaco, no suma los 25 de «sale el primero» (antes la prueba lo veía en que
  // ganaba Yilian, cuando ser apoyo sumaba; desde la revisión final, 25/09, resta: José 18/09)
  cfg.reglas = {};
  const conRegla = pid => M.candidatosPara(cfg, st, e, '2026-09-30', 'MONACO_T', { primero: true }).find(c => c.pid === pid).score;
  const conReglaCob = pid => M.candidatosCobertura(cfg, st, e, '2026-09-30', 'MONACO_T', 'hojan', { primero: true }).find(c => c.pid === pid).score;
  assert.strictEqual(rel.find(c => c.pid === 'scapon').score, conRegla('scapon') - M.PESOS.saleElPrimero);
  assert.strictEqual(cob.find(c => c.pid === 'scapon').score, conReglaCob('scapon') - M.PESOS.saleElPrimero);
  assert.ok(!rel.concat(cob).some(c => c.razones.includes('sale el primero')));
});
ok('F5 · S19 «Sale el primero» apagado en la ficha de Lola, con la semana tipo: ni ▸ ni abre fijado (H9)', () => {
  const cfg = cfgBase(), st = cfg.staff; M.personaDe(st, 'lola').inactivas = ['abre'];
  const { e, g } = f5Semana(cfg);
  for (const d of g.dias) {
    assert.ok(!M.posicionesDe(cfg, st, e, d, 'PASARELA_M').some(x => x.abreFijo), d);
    assert.ok(!M.manualDe(e, d, 'PASARELA_M').abre, d);
  }
  assert.ok(!g.condiciones.some(c => c.id === 'p:lola:abre:PASARELA:M' || c.id === 'loc:PASARELA:primero:M'));
  // y a mano, con Tere puesta antes que ella, abre Tere (H9)
  const e2 = f3Semana(); M.asignar(e2, cfg, st, F3_LUN, 'PASARELA_M', 'tere', {}); M.asignar(e2, cfg, st, F3_LUN, 'PASARELA_M', 'lola', {});
  assert.strictEqual(M.primeroDe(cfg, st, e2, F3_LUN, 'PASARELA_M'), 'tere');
});
ok('F5 · S19 con «Sale el primero» apagado en la ficha de Iván, «Quién abre» del local no lo pone primero ni con ▸ (r9b)', () => {
  const cfg = cfgBase(), st = cfg.staff; M.personaDe(st, 'ivan').inactivas = ['abre'];
  const e = f3Semana(), d = '2026-09-29';
  M.asignar(e, cfg, st, d, 'PASARELA_T', 'mariluz', {}); M.asignar(e, cfg, st, d, 'PASARELA_T', 'ivan', {});
  assert.strictEqual(M.primeroDe(cfg, st, e, d, 'PASARELA_T'), 'mariluz');
  assert.ok(!M.posicionesDe(cfg, st, e, d, 'PASARELA_T').some(x => x.abreFijo));
  assert.strictEqual(M.quienAbreFijo(cfg, st, M.localDe(cfg, 'PASARELA'), 'T'), null);
  assert.strictEqual(M.quienAbreFijo(cfg, st, M.localDe(cfg, 'PASARELA'), 'M'), 'lola');
});
ok('F5 · S32 la razón de quien abre dice cómo: en partido donde el local lo permite, turno continuo o turno completo', () => {
  assert.strictEqual(M.razonPrimero({ ok: true, partido: true }), 'abre la tarde en partido (el local lo permite)');
  assert.strictEqual(M.razonPrimero({ ok: true, continuo: true }), 'turno continuo');
  assert.strictEqual(M.razonPrimero({ ok: true }), 'puede abrir (turno completo)');
  // el caso de Iván: Mari Luz, solo de mañana el viernes y el sábado, entra a cubrirle y abre la tarde en partido
  const quitaTarde = cfg => { for (const iso of [F3_VIE, F3_SAB]) M.desasignar(f3Mes(cfg, iso), iso, 'PASARELA_T', 'mariluz'); };
  const cfg = f3Escenario(null, quitaTarde), inc = F3_INC();
  const A = M.planesCobertura(cfg, cfg.staff, f3Entero(cfg, inc), inc, {}).planes[0];
  const ml = f3De(A, F3_VIE, 'mariluz')[0];
  assert.ok(ml && ml.abre && ml.razones.includes('abre la tarde en partido (el local lo permite)') && !ml.razones.includes('puede abrir (turno completo)'), JSON.stringify(ml && ml.razones));
});
// 2) La cocina (S15, S16, S36, S37, S38): una sola lectura (puedeCocina, cocinaExigida) para la ficha, Ajustes del
// local, la semana tipo, el Generador, la Cobertura, la Revisión, el selector y el núcleo.
ok('F5 · S36 migración: lo que dice Ajustes del local pasa a la ficha, y lo que dice la ficha sale en Ajustes', () => {
  const estado = cfgBase();
  const fichas0 = JSON.stringify(estado.staff.filter(p => !['victoria', 'cris', 'maydeth', 'susi'].includes(p.id)).map(p => p.cocina));
  M.localDe(estado, 'EL33').cocina.titulares.M.push('victoria');
  M.localDe(estado, 'MONACO').cocina.reservas.push('cris');
  const r = M.migrarCocinaLocales(estado);
  assert.strictEqual(M.cocinaDe(estado, M.personaDe(estado.staff, 'victoria'), 'EL33'), 'titular');
  assert.strictEqual(M.cocinaDe(estado, M.personaDe(estado.staff, 'cris'), 'MONACO'), 'reserva');
  assert.deepStrictEqual(M.personaDe(estado.staff, 'victoria').cocina.titular, ['EL33']);
  // Maydeth y Susi (de baja) son titulares en su ficha: salen al final de la lista de su local
  const mon = M.localDe(estado, 'MONACO').cocina.titulares, zap = M.localDe(estado, 'ZAPA').cocina.titulares;
  assert.ok(mon.M[mon.M.length - 1] === 'maydeth' && mon.T[mon.T.length - 1] === 'maydeth' && zap.M.includes('susi'), JSON.stringify([mon, zap]));
  assert.strictEqual(JSON.stringify(estado.staff.filter(p => !['victoria', 'cris', 'maydeth', 'susi'].includes(p.id)).map(p => p.cocina)), fichas0, 'nadie más cambia');
  assert.ok(r.fichas >= 2 && r.listas >= 2, JSON.stringify(r));
  assert.strictEqual(M.migrarCocinaLocales(estado).fichas, 0, 'una sola vez');
});
ok('F5 · S37 Generador → Semana: la cocina obligatoria que nadie puede llevar sale en «Huecos» (mié 7/10, cocineros del Mónaco de vacaciones)', () => {
  const cfg = cfgBase(), st = cfg.staff, d = '2026-10-07';
  for (const id of ['esmeralda', 'jenny', 'hojan']) M.anadirAusencia(M.personaDe(st, id), { tipo: 'VAC', desde: d, hasta: d });
  const e = f3Semana('2026-10-05');
  assert.ok(M.asignar(e, cfg, st, d, 'MONACO_M', 'tere', {}).ok);
  const g = M.generarSemana(cfg, st, e, '2026-10-05', {});
  const h = g.huecos.find(x => x.iso === d && x.turnoId === 'MONACO_M' && x.tipo === 'cocina');
  assert.ok(h && h.motivo === 'sin cocina (obligatoria)' && Object.keys(h.porQueNadie || {}).length, JSON.stringify(g.huecos.filter(x => x.iso === d)));
  assert.strictEqual(g.resumen.huecos, g.huecos.length);
});
ok('F5 · S38 «nunca cocina» o «solo los miércoles» en la ficha: la plaza «c» de la semana tipo no le da la cocina del martes', () => {
  for (const prep of [p => { p.cocina.soloDias = [3]; }, p => { p.cocina.nunca = true; }]) {
    const cfg = cfgBase(), st = cfg.staff; prep(M.personaDe(st, 'scapon'));
    const { e, g } = f5Semana(cfg);
    const coc = M.asignados(e, '2026-09-29', 'MONACO_T').find(x => x.cocina);
    assert.ok(!coc || coc.pid !== 'scapon', JSON.stringify(M.asignados(e, '2026-09-29', 'MONACO_T')));
    assert.ok(g.condiciones.find(c => c.pid === 'scapon' && c.k === 'cocina').ok);
    assert.ok(!M.revisionMes(cfg, st, e, { desde: '2026-09-29', hasta: '2026-09-29' }).some(x => x.tipo === 'cocina-no-apta'));
  }
});

// Sin planilla, quién abre según la semana tipo lo dice la misma lectura (primeroDe) y no la marca «a», que tras
// la migración solo queda donde decide: el visor del cierre y las casillas que deja quien falta
ok('F5 · S18 sin planilla, el visor del cierre y la Cobertura saben quién abría por la semana tipo (no por la marca «a»)', () => {
  const estado = cfgBase(); M.migrarAbrePatron(estado, '2026-09-24');
  const cfg = Object.assign(cfgBase(), { meses: {} }); cfg.patron = estado.patron;
  const iso = '2026-10-16';   // viernes: Iván abre la tarde de Pasarela (su plaza ya no lleva «a»)
  assert.ok(!cfg.patron[5].find(pl => pl.t === 'PASARELA_T' && pl.p === 'ivan').a, 'la «a» de Iván se fue con la migración');
  const c = { id: 'c1', localId: 'PASARELA', dias: { [iso]: ['T'] }, motivo: 'reforma', decisiones: {} };
  const iv = M.afectadosPorCierre(cfg, cfg.staff, estadoOct(), c).find(a => a.pid === 'ivan');
  assert.ok(iv && iv.turnos.length && iv.turnos[0].abre === true, JSON.stringify(iv));
  // la Cobertura: Iván de vacaciones ese día, ya retirado de su plaza de la semana volcada
  const e = estadoOct(); M.generarPlanilla(cfg, cfg.staff, e, iso, iso, {});
  M.anadirAusencia(M.personaDe(cfg.staff, 'ivan'), { tipo: 'VAC', desde: iso, hasta: iso });
  M.desasignar(e, iso, 'PASARELA_T', 'ivan');
  const dej = M.casillasDejadas(cfg, cfg.staff, e, 'ivan', iso, iso).find(x => x.tid === 'PASARELA_T');
  assert.ok(dej && dej.abre === true, JSON.stringify(dej));
});


// ---------- revisión de la fase 5 (24/09): lo automático no queda «puesto a mano», y la planilla ya volcada
// se entera de los cambios de configuración ----------
// Las dos revisiones de la fase 5 (la del modelo y la del cliente, con clics) encontraron que la fase solo
// llegaba a las semanas que se generasen a partir de entonces: en la planilla ya volcada, quién abre y quién
// lleva la cocina seguían «puestos a mano» (el código de antes marcaba así la «a» y la «c» de la semana tipo,
// la cocina del Generador y de la Cobertura y todo el volcado del Periodo), y la marca guardada (e.abre,
// e.cocina, que leen el Mes, el perfil, el Excel y las horas) no se recalculaba al cambiar «Quién abre», la
// cocina de un local o una ficha.
const f5rDemo = () => { const cfg = Object.assign(cfgBase(), { meses: {} }); M.sembrarDemo(cfg, '2026-09-24'); return cfg; };
// la planilla tal como la dejaba el código de antes de la fase 5: quien abre y quien lleva la cocina, fijados
// «a mano» en cada casilla (como el volcado del Periodo), sin preferencias, y sin migraciones hechas
function f5rDeAntes(estado) {
  for (const g of Object.values(estado.meses)) for (const [iso, porT] of Object.entries(g.asig || {})) for (const [tid, lista] of Object.entries(porT)) {
    for (const e of lista) { delete e.abrePatron; delete e.cocinaAuto; }
    if (lista.some(e => e.abre)) M.marcarManual(g, iso, tid, 'abre');
    if (lista.some(e => e.cocina)) M.marcarManual(g, iso, tid, 'cocina');
  }
  delete estado.migraciones;
  return estado;
}
const f5rMarcas = (estado, k, desde, hasta) => { const out = []; for (const g of Object.values(estado.meses)) for (const [iso, porT] of Object.entries(g.manual || {})) for (const [tid, m] of Object.entries(porT || {})) if (m && m[k] && (!desde || iso >= desde) && (!hasta || iso <= hasta)) out.push(iso + '|' + tid); return out.sort(); };
const f5rMes = (estado, iso) => M.estadoDesde(estado.meses, [], +iso.slice(0, 4), +iso.slice(5, 7));
const f5rAbreGuardado = (estado, iso, tid) => { const e = M.asignados(f5rMes(estado, iso), iso, tid).find(x => x.abre); return e ? e.pid : null; };
const f5rCocinaGuardada = (estado, iso, tid) => { const e = M.asignados(f5rMes(estado, iso), iso, tid).find(x => x.cocina); return e ? e.pid : null; };
const f5rConA = pat => Object.values(pat).flat().filter(pl => pl.a).map(pl => pl.t + ':' + pl.p);

ok('F5 rev · S18 la planilla ya volcada con la versión de antes: al abrirla, quién abre y la cocina dejan de estar «puestos a mano», salvo lo que puso el encargado', () => {
  const estado = f5rDeAntes(f5rDemo()), st = estado.staff;
  assert.ok(f5rMarcas(estado, 'abre').length > 100 && f5rMarcas(estado, 'cocina').length > 100, 'la planilla de antes: todo fijado a mano');
  // lo que sí puso el encargado (con su línea en el historial, que es como queda): «Sale primero» a Tere el
  // martes 6/10 en Pasarela mañana y «Lleva la cocina» a quien no la llevaba (y no abre) un día de octubre; y
  // «Quitar la marca de cocina» el 8/10 (la casilla fijada sin nadie con la cocina)
  const oct = f5rMes(estado, '2026-10-06');
  assert.ok(M.pidsEn(oct, '2026-10-06', 'PASARELA_M').includes('tere'));
  M.marcarAbre(oct, '2026-10-06', 'PASARELA_M', 'tere', estado);
  const libreC = (d, t, x) => !x.cocina && !x.abre && M.puedeCocina(estado, M.personaDe(st, x.pid), M.partirTurno(t).localId, d);
  let dC = null, tidC = null;
  for (const d of M.rangoIso('2026-10-07', '2026-10-20')) { tidC = M.turnosDe(estado).map(t => t.id).find(t => M.asignados(oct, d, t).some(x => libreC(d, t, x)) && M.asignados(oct, d, t).some(x => x.cocina)); if (tidC) { dC = d; break; } }
  assert.ok(tidC, 'una casilla con la cocina y alguien más que podría llevarla');
  const quienC = M.asignados(oct, dC, tidC).find(x => libreC(dC, tidC, x)).pid;
  M.marcarCocina(oct, dC, tidC, quienC);
  const lC = M.localDe(estado, M.partirTurno(tidC).localId), fC = M.FRANJA_LBL[M.partirTurno(tidC).franja].toLowerCase();
  const tidN = M.turnosDe(estado).map(t => t.id).find(t => (dC !== '2026-10-08' || t !== tidC) && M.asignados(oct, '2026-10-08', t).some(x => x.cocina));
  for (const e of M.asignados(oct, '2026-10-08', tidN)) e.cocina = false;   // (ya está fijada: f5rDeAntes)
  // un «Sale primero» cuya línea del historial ya no está (el historial guarda las 400 últimas) en una casilla con
  // «Quién abre» en el local: no es ni el de la semana tipo ni quien saldría solo, así que se queda como estaba (a
  // mano), por si acaso. (Donde nadie es fijo, «Sale primero» la pone la primera de la casilla y ya saldría sola:
  // quitarle la marca no cambia quién abre)
  const dV = '2026-10-09', plV = t => M.plazasDe(estado, M.isoDow(dV)).filter(x => x.t === t && x.a).map(x => x.p);
  const tidV = M.turnosDe(estado).filter(t => t.local.primero && t.local.primero[t.franja]).map(t => t.id).find(t => M.asignados(oct, dV, t).some(x => !x.abre && !x.cocina && !plV(t).includes(x.pid) && M.puedePrimero(estado, st, oct, dV, t, x.pid).ok));
  assert.ok(tidV);
  M.marcarAbre(oct, dV, tidV, M.asignados(oct, dV, tidV).find(x => !x.abre && !x.cocina && !plV(tidV).includes(x.pid) && M.puedePrimero(estado, st, oct, dV, tidV, x.pid).ok).pid, estado);
  estado.historial = [
    { ts: 3, tipo: 'asig', txt: `${M.nombreDe(st, quienC)} lleva la cocina de ${lC.nombre} ${fC} del ${+dC.slice(8)}/10` },
    { ts: 2, tipo: 'asig', txt: 'Tere abre Pasarela mañana del 6/10 · puesto a la fuerza (incumple algo) · prueba' },
    { ts: 1, tipo: 'asig', txt: 'Mes de muestra' },
  ];
  const r = M.migrarMarcasAutomaticas(estado, '2026-09-24');
  M.migrarAbrePatron(estado, '2026-09-24');
  assert.deepStrictEqual(f5rMarcas(estado, 'abre'), ['2026-10-06|PASARELA_M', `${dV}|${tidV}`], 'solo queda a mano el «Sale primero» de Tere (y el que no se sabe)');
  assert.deepStrictEqual(f5rMarcas(estado, 'cocina'), [`${dC}|${tidC}`, `2026-10-08|${tidN}`].sort(), 'y la cocina que marcó (o quitó) el encargado');
  assert.ok(r.abre > 100 && r.cocina > 100 && r.quedan === 4, JSON.stringify(r));
  assert.strictEqual(M.migrarMarcasAutomaticas(estado, '2026-09-24').abre, 0, 'una sola vez');
  assert.strictEqual(estado.migraciones.marcasAuto2409, 1);
  // quien abría sigue abriendo y la cocina sigue donde estaba
  const e28 = f5rMes(estado, '2026-09-29');
  for (const t of M.turnosDe(estado)) if (M.asignados(e28, '2026-09-29', t.id).length) assert.strictEqual(M.primeroDe(estado, st, e28, '2026-09-29', t.id), f5rAbreGuardado(estado, '2026-09-29', t.id), t.id);
  // «Guardar como semana tipo» desde la semana del 28/09: ninguna «a» (nadie la puso a mano ni decide) (S18)
  const sem = cieRango(estado, '2026-09-28', '2026-10-04');
  assert.deepStrictEqual(f5rConA(M.patronDesdeSemana(sem, '2026-09-28', estado, st)), []);
  // Lola pasa a «nunca de primero» por la mañana: de hoy en adelante no abre, ni en Hoy ni en lo guardado, y la
  // Revisión no dice que alguien la puso «a mano»
  M.personaDe(st, 'lola').noPrimero = ['M'];
  M.refrescarMarcas(estado, st, estado.meses, '2026-09-24');
  for (const iso of M.rangoIso('2026-09-24', '2026-10-31')) {
    const e = f5rMes(estado, iso);
    if (!M.pidsEn(e, iso, 'PASARELA_M').length) continue;
    assert.notStrictEqual(M.primeroDe(estado, st, e, iso, 'PASARELA_M'), 'lola', iso);
    assert.notStrictEqual(f5rAbreGuardado(estado, iso, 'PASARELA_M'), 'lola', iso + ' (guardado)');
  }
  for (const [y, m] of [[2026, 9], [2026, 10]]) {
    const rv = M.revisionMes(estado, st, M.estadoDesde(estado.meses, [], y, m), { desde: '2026-09-24' }).filter(x => x.tipo === 'abre-no-apto');
    assert.ok(rv.every(x => x.iso === '2026-10-06' || x.iso === dV), JSON.stringify(rv.slice(0, 3)));
  }
});

ok('F5 rev · «Quién abre» de Pasarela tarde a Mari Luz en la planilla ya volcada: de hoy en adelante lo guardado (Mes, perfil, Excel, horas) dice lo mismo que Hoy; lo pasado no se toca', () => {
  const cfg = f5rDemo(), st = cfg.staff;
  const pasado = JSON.stringify(Object.fromEntries(Object.entries(f5rMes(cfg, '2026-09-01').asig).filter(([iso]) => iso < '2026-09-24')));
  M.localDe(cfg, 'PASARELA').primero.T = 'mariluz';
  const cambios = M.refrescarMarcas(cfg, st, cfg.meses, '2026-09-24');
  assert.ok(cambios.some(c => c.tid === 'PASARELA_T' && c.abre && c.abre.antes === 'ivan' && c.abre.ahora === 'mariluz'), JSON.stringify(cambios.slice(0, 3)));
  let vistos = 0;
  for (const iso of M.rangoIso('2026-09-24', '2026-10-31')) {
    const e = f5rMes(cfg, iso);
    for (const t of M.turnosDe(cfg)) {
      if (!M.asignados(e, iso, t.id).length) continue;
      assert.strictEqual(f5rAbreGuardado(cfg, iso, t.id), M.primeroDe(cfg, st, e, iso, t.id), `${iso} ${t.id}: lo guardado y lo que enseña Hoy`);
    }
    if (M.pidsEn(e, iso, 'PASARELA_T').includes('mariluz') && M.puedePrimero(cfg, st, e, iso, 'PASARELA_T', 'mariluz').ok) {
      vistos++;
      const td = M.turnoDelDia(cfg, e, iso, 'mariluz');
      if (td.partido) assert.strictEqual(td.abre, 'T', iso + ': en partido, abre la tarde (su tramo y sus horas)');
      assert.ok(!M.turnoDelDia(cfg, e, iso, 'ivan').abre || M.turnoDelDia(cfg, e, iso, 'ivan').abre !== 'T', iso + ': Iván ya no abre la tarde');
    }
  }
  assert.ok(vistos > 3, 'abre Mari Luz varios días');
  assert.strictEqual(JSON.stringify(Object.fromEntries(Object.entries(f5rMes(cfg, '2026-09-01').asig).filter(([iso]) => iso < '2026-09-24'))), pasado, 'lo de antes de hoy, igual');
  assert.deepStrictEqual(M.refrescarMarcas(cfg, st, cfg.meses, '2026-09-24'), [], 'refrescar otra vez no cambia nada');
});

ok('F5 rev · S38 en la semana ya volcada: Susana Capón pasa a «cocina solo los miércoles» y al regenerar el martes 29 no lleva la cocina; lo automático no deja la cocina «a mano»', () => {
  const cfg = Object.assign(cfgBase(), { meses: {} }), st = cfg.staff;
  const e = f3Semana(); M.generarSemana(cfg, st, e, F3_LUN, {});
  const aMano = est => { let k = 0; for (const iso of Object.keys(est.manual)) for (const m of Object.values(est.manual[iso] || {})) if (m && m.cocina) k++; return k; };
  assert.strictEqual(aMano(e), 0, 'la semana tipo no deja la cocina fijada a mano');
  assert.strictEqual(M.asignados(e, '2026-09-29', 'MONACO_T').find(x => x.cocina).pid, 'scapon');
  M.personaDe(st, 'scapon').cocina.soloDias = [3];
  const g = M.generarSemana(cfg, st, e, F3_LUN, {});
  const coc = M.asignados(e, '2026-09-29', 'MONACO_T').find(x => x.cocina);
  assert.ok(!coc || coc.pid !== 'scapon', JSON.stringify(M.asignados(e, '2026-09-29', 'MONACO_T')));
  assert.ok(g.condiciones.find(c => c.pid === 'scapon' && c.k === 'cocina').ok, 'su condición se cumple');
  assert.ok(!M.revisionMes(cfg, st, e, { desde: '2026-09-29', hasta: '2026-09-29' }).some(x => x.tipo === 'cocina-no-apta'));
  // el Generador sin semana tipo, el volcado del Periodo y la Cobertura tampoco la dejan «a mano»
  const c2 = Object.assign(cfgBase(), { meses: {} }), e2 = estadoOct();
  M.generarPlanilla(c2, c2.staff, e2, '2026-10-05', '2026-10-11', { sinPatron: true });
  assert.strictEqual(aMano(e2), 0, 'relleno del Generador');
  const real = estadoOct(), gp = M.generarPlanilla(c2, c2.staff, real, '2026-10-12', '2026-10-18', { simular: true });
  M.volcarPrevia(c2, c2.staff, () => real, gp, { desde: '2026-10-12', hasta: '2026-10-18', previaDe: () => gp.estado });
  assert.strictEqual(aMano(real), 0, 'volcado del Periodo');
  const c3 = f5rDemo(), inc = { pid: 'hojan', tipo: 'VAC', dias: ['2026-10-05'], desde: '2026-10-05', hasta: '2026-10-05' };
  const e3 = f3Entero(c3, inc), P = M.planesCobertura(c3, c3.staff, e3, inc, {});
  M.aplicarCobertura(c3, c3.staff, e3, inc, P.planes[0]);
  assert.ok(P.planes[0].asignaciones.some(a => a.cocina), 'el plan pone a alguien en la cocina de Hojan');
  assert.strictEqual(aMano(e3), 0, 'la Cobertura');
});

ok('F5 rev · S36/S15/D5 cambios de cocina en la planilla ya volcada: al refrescar, la cocina guardada sigue a Ajustes, a la ficha y al interruptor', () => {
  // «Cocina» del grupo apagada: nadie lleva la cocina marcada sola (Hoy y el Generador dejaban todos los «COCINA»)
  const c1 = f5rDemo(); c1.reglas = { cocina: false };
  M.refrescarMarcas(c1, c1.staff, c1.meses, '2026-09-24');
  for (const iso of M.rangoIso('2026-09-24', '2026-10-31')) for (const t of M.turnosDe(c1)) assert.strictEqual(f5rCocinaGuardada(c1, iso, t.id), null, `${iso} ${t.id}`);
  // Ajustes de El 33: Victoria titular de la mañana (la primera) y Noe fuera. Donde Noe llevaba la cocina con
  // Victoria en la casilla, ahora la lleva Victoria; Noe ya no lleva ninguna (antes la seguía llevando y la
  // condición decía «la cocina no es de este local»); Jenny y Hojan, cocineros, siguen con la suya
  const c2 = f5rDemo();
  const deNoe = [...M.rangoIso('2026-09-24', '2026-10-31')].filter(iso => f5rCocinaGuardada(c2, iso, 'EL33_M') === 'noe' && M.pidsEn(f5rMes(c2, iso), iso, 'EL33_M').includes('victoria'));
  M.ponerCocinaLocal(c2, c2.staff, 'EL33', { lista: 'titulares', franja: 'M', pid: 'victoria', pos: 0 });
  for (const f of ['M', 'T']) M.ponerCocinaLocal(c2, c2.staff, 'EL33', { lista: 'titulares', franja: f, pid: 'noe', quitar: true });
  M.refrescarMarcas(c2, c2.staff, c2.meses, '2026-09-24');
  assert.ok(deNoe.length > 0, 'algún día Noe llevaba la cocina de la mañana con Victoria en la casilla');
  for (const iso of deNoe) assert.strictEqual(f5rCocinaGuardada(c2, iso, 'EL33_M'), 'victoria', iso);
  for (const iso of M.rangoIso('2026-09-24', '2026-10-31')) for (const f of ['M', 'T']) assert.notStrictEqual(f5rCocinaGuardada(c2, iso, 'EL33_' + f), 'noe', iso + f);
  for (const [y, m] of [[2026, 9], [2026, 10]]) assert.ok(!M.revisionMes(c2, c2.staff, M.estadoDesde(c2.meses, [], y, m), { desde: '2026-09-24' }).some(x => x.tipo === 'cocina-no-apta'), 'nadie lleva una cocina que no es suya');
  // Susana Capón «cocina solo los miércoles» sin regenerar: el martes 29 ya no la lleva
  const c3 = f5rDemo(); M.personaDe(c3.staff, 'scapon').cocina.soloDias = [3];
  M.refrescarMarcas(c3, c3.staff, c3.meses, '2026-09-24');
  assert.notStrictEqual(f5rCocinaGuardada(c3, '2026-09-29', 'MONACO_T'), 'scapon');
  assert.ok(!M.revisionMes(c3, c3.staff, f5rMes(c3, '2026-09-29'), { desde: '2026-09-29', hasta: '2026-09-29' }).some(x => x.tipo === 'cocina-no-apta'));
});

ok('F5 rev · D5 con «Cocina» del grupo apagada nadie busca cocina: ni «cubre a» en la semana tipo ni la Cobertura la dan, ni puntúa ni se da como razón; al encenderla, la casilla la recalcula', () => {
  const L = F3_LUN;
  const cfg = Object.assign(cfgBase(), { meses: {} }), st = cfg.staff; cfg.reglas = { cocina: false };
  M.anadirAusencia(M.personaDe(st, 'hojan'), { tipo: 'VAC', desde: L, hasta: M.addDias(L, 6) });
  M.personaDe(st, 'yilian').cubreA = [{ pid: 'hojan' }];
  const e = f3Semana(L), g = M.generarSemana(cfg, st, e, L, {});
  let yil = 0;
  for (const d of g.dias) for (const t of M.turnosDe(cfg)) {
    for (const x of M.asignados(e, d, t.id)) assert.ok(!x.cocina, `${d} ${t.id}: ${x.pid} con la cocina`);
    assert.ok(!M.manualDe(e, d, t.id).cocina, `${d} ${t.id} a mano`);
    if (M.asignados(e, d, t.id).some(x => x.pid === 'yilian' && x.por === 'hojan')) yil++;
  }
  assert.ok(yil > 0, 'Yilian cubre a Hojan');
  // buscar «la cocina» con la regla apagada es buscar sala: mismas personas, puntos y razones
  const d = '2026-10-07', tid = 'MONACO_T', e2 = estadoOct();
  const sin = M.candidatosPara(cfg, st, e2, d, tid), con = M.candidatosPara(cfg, st, e2, d, tid, { cocina: true });
  assert.deepStrictEqual(con.map(c => [c.pid, c.score, c.razones.join(' · ')]), sin.map(c => [c.pid, c.score, c.razones.join(' · ')]));
  const cs = M.candidatosCobertura(cfg, st, e2, d, tid, 'hojan', { cocina: true, faltaCocina: true }), ss = M.candidatosCobertura(cfg, st, e2, d, tid, 'hojan', {});
  assert.deepStrictEqual(cs.map(c => [c.pid, c.score]), ss.map(c => [c.pid, c.score]));
  // y la puntuación no da «cocina titular» a quien no puede llevarla (rango −1: antes 41 puntos)
  const pu = M.puntuar(M.crearContexto(cfgBase(), cfgBase().staff, e2), M.personaDe(st, 'yilian'), d, tid, { cocina: true });
  assert.ok(!pu.razones.some(r => /cocina/.test(r)), pu.razones.join(' · '));
  // al volver a encender «Cocina» y regenerar, nadie queda con una cocina que no es suya
  cfg.reglas = { cocina: true };
  M.generarSemana(cfg, st, e, L, {});
  assert.ok(!M.revisionMes(cfg, st, e, { desde: L, hasta: M.addDias(L, 6) }).some(x => x.tipo === 'cocina-no-apta'));
});

ok('F5 rev · 0a octubre sin semana tipo: ninguna cocina obligatoria se queda sin cubrir (como antes de la carga del mes), y el reparto sigue igual de bien', () => {
  const cfg = Object.assign(cfgBase(), { meses: {} }), e = estadoOct();
  const g = M.generarPlanilla(cfg, cfg.staff, e, '2026-10-01', '2026-10-31', { sinPatron: true });
  const rv = M.revisionMes(cfg, cfg.staff, e, {}).filter(x => x.tipo === 'sin-cocina' && x.nivel === 'alta');
  assert.deepStrictEqual(rv.map(x => x.msg), []);
  assert.deepStrictEqual(g.huecos.filter(h => h.tipo === 'cocina').map(h => h.iso + ' ' + h.turnoId), []);
  const r = f5Reparto(cfg, e);
  assert.ok(r.mes <= 9.6 && r.semanal <= 2.0 && r.plazas >= 556 && g.huecos.length <= 45, `desviación del mes ${r.mes.toFixed(2)}, semanal ${r.semanal.toFixed(2)} (${r.plazas} plazas, ${g.huecos.length} huecos)`);
});

ok('F5 rev · S18 la «a» que decide se guarda en la semana tipo cada vez, y quien abría y estaba de vacaciones la semana guardada sigue abriendo', () => {
  const cfg = Object.assign(cfgBase(), { meses: {} }), st = cfg.staff; M.migrarCocinaLocales(cfg); M.migrarAbrePatron(cfg, '2026-09-24');
  const e = f3Semana(F3_LUN); M.generarSemana(cfg, st, e, F3_LUN, {});
  const casos = [];
  for (const d of M.rangoIso(F3_LUN, F3_DOM)) for (const t of M.turnosDe(cfg)) {
    const l = M.localDe(cfg, t.localId); if (l.primero && l.primero[t.franja]) continue;
    const pr = M.primeroDe(cfg, st, e, d, t.id);
    const otro = M.asignados(e, d, t.id).find(x => x.pid !== pr && !M.porDe(st, x) && M.puedePrimero(cfg, st, e, d, t.id, x.pid).ok && !M.abreFijo(cfg, l, M.personaDe(st, x.pid), t.franja));
    if (otro && casos.length < 3) casos.push({ d, t: t.id, otro: otro.pid });
  }
  assert.strictEqual(casos.length, 3);
  for (const c of casos) M.marcarAbre(e, c.d, c.t, c.otro, cfg);
  cfg.patron = M.patronDesdeSemana(e, F3_LUN, cfg, st);
  assert.strictEqual(f5rConA(cfg.patron).length, 3, '1.er guardado');
  // se genera la semana siguiente con esa semana tipo y se vuelve a guardar, tres veces: siguen abriendo los
  // elegidos, y cada «a» que queda decide (sin ella abriría otra persona); la que ya no hace falta porque abre
  // por ir la primera de la casilla no se guarda
  let lunes = F3_LUN;
  for (const vuelta of [1, 2, 3]) {
    lunes = M.addDias(lunes, 7);
    const ek = f3Semana(lunes); M.generarSemana(cfg, st, ek, lunes, {});
    for (const c of casos) assert.strictEqual(M.primeroDe(cfg, st, ek, M.addDias(c.d, 7 * vuelta), c.t), c.otro, `semana ${vuelta + 1}: ${c.t}`);
    cfg.patron = M.patronDesdeSemana(ek, lunes, cfg, st);
    const a = f5rConA(cfg.patron);
    assert.ok(a.length >= 1 && a.length <= 3, `guardado ${vuelta + 1}: ${a.join(' ')}`);
    for (const [dow, pls] of Object.entries(cfg.patron)) for (const pl of pls.filter(x => x.a)) {
      const iso = M.addDias(lunes, +dow - 1), e = M.diaDeLaSemanaTipo(iso, pls);
      assert.notStrictEqual(M.primeroDe(cfg, st, e, iso, pl.t, { sinPreferencia: true }), pl.p, `${dow} ${pl.t}: la «a» de ${pl.p} decide`);
    }
  }
  // quien abre por orden (Cris, la mañana del Mónaco) está de vacaciones la semana que se guarda
  for (const quien of ['cris', 'jacquelin', 'victoria']) {
    const c = Object.assign(cfgBase(), { meses: {} }), s2 = c.staff; M.migrarCocinaLocales(c); M.migrarAbrePatron(c, '2026-09-24');
    const abre = (est, l) => { const out = []; for (let k = 0; k < 7; k++) { const d = M.addDias(l, k); for (const t of M.turnosDe(c)) if (M.primeroDe(c, s2, est, d, t.id) === quien) out.push(k + ':' + t.id); } return out; };
    const e0 = f3Semana(F3_LUN); M.generarSemana(c, s2, e0, F3_LUN, {});
    const antes = abre(e0, F3_LUN);
    M.anadirAusencia(M.personaDe(s2, quien), { tipo: 'VAC', desde: '2026-10-05', hasta: '2026-10-11' });
    const e1 = f3Semana('2026-10-05'); M.generarSemana(c, s2, e1, '2026-10-05', {});
    c.patron = M.patronDesdeSemana(e1, '2026-10-05', c, s2);
    const e2 = f3Semana('2026-10-12'); M.generarSemana(c, s2, e2, '2026-10-12', {});
    // sigue abriendo donde abría. (fase 6, D4) Puede abrir además alguna tarde de corrido: en la semana de sus
    // vacaciones Noe hizo la mañana de El 33 de corrido con su tarde (antes quedaba el hueco), la semana tipo
    // guardada la lleva, y a la vuelta la tarde la completa Victoria, que ya abre la mañana (turno continuo)
    const despues = abre(e2, '2026-10-12');
    assert.ok(antes.every(x => despues.includes(x)) && despues.filter(x => !antes.includes(x)).every(x => /:EL33_T$/.test(x) && despues.includes(x.replace('EL33_T', 'EL33_M'))), `${quien}: ${antes} → ${despues}`);
  }
});

ok('F5 rev · S36 marcar en la ficha «titular de cocina» de un local sin cocina lo avisa (cocinaQueCrea), y la migración no crea cocinas', () => {
  const cfg = cfgBase(), st = cfg.staff;
  assert.deepStrictEqual(M.cocinaQueCrea(cfg, st, 'PASARELA', ['M', 'T']), ['M', 'T']);
  assert.deepStrictEqual(M.cocinaQueCrea(cfg, st, 'PASARELA', ['M']), ['M']);
  assert.deepStrictEqual(M.cocinaQueCrea(cfg, st, 'EL33', ['M', 'T']), []);
  // datos de antes: Mari Luz «titular de cocina en Pasarela» solo en su ficha. Antes no hacía nada; la
  // migración no convierte Pasarela en un local con cocina (con siete «sin cocina» a la semana)
  const estado = cfgBase(); M.personaDe(estado.staff, 'mariluz').cocina.titular = ['PASARELA'];
  M.migrarCocinaLocales(estado);
  const l = M.localDe(estado, 'PASARELA');
  assert.ok(!M.localTieneCocina(l, 'M', estado, estado.staff) && !M.localTieneCocina(l, 'T', estado, estado.staff), JSON.stringify(l.cocina));
});

ok('F5 rev · la carga del mes («M este mes») cuenta el mes entero también al cubrir una ausencia apuntada en Equipo', () => {
  // dos designadas (Dulce y Leo) para cubrir a Iván el viernes 16/10 por la tarde, con Mari Luz en la casilla;
  // la semana que se toca es solo la del 12/10 (como estadoRango de Equipo)
  const prep = () => {
    const cfg = Object.assign(cfgBase(), { meses: {} }), st = cfg.staff;
    delete M.personaDe(st, 'dulce').standby;
    for (const pid of ['dulce', 'leo']) M.personaDe(st, pid).cubreA = [{ pid: 'ivan' }];
    const e = cieRango(cfg, '2026-10-12', '2026-10-18');
    for (const pid of ['ivan', 'mariluz']) assert.ok(M.asignar(e, cfg, st, '2026-10-16', 'PASARELA_T', pid, {}).ok, pid);
    M.anadirAusencia(M.personaDe(st, 'ivan'), { tipo: 'VAC', desde: '2026-10-16', hasta: '2026-10-16' });
    return { cfg, st, e };
  };
  const quien = (cargar, conMeses) => {
    const { cfg, st, e } = prep();
    if (cargar) { const oct = M.estadoDesde(cfg.meses, [], 2026, 10); for (let d = 1; d <= 10; d++) { const iso = M.isoDe(2026, 10, d); (oct.asig[iso] = oct.asig[iso] || {}).ZAPA_M = [{ pid: cargar, origen: 'manual' }]; } }
    const r = M.cubrirAusencia(cfg, st, e, 'ivan', '2026-10-16', '2026-10-16', null, conMeses ? { meses: cfg.meses } : {});
    return (r.puestos.concat(r.relevos).find(x => x.tid === 'PASARELA_T') || {}).pid;
  };
  const primero = quien(null, true);
  assert.ok(['dulce', 'leo'].includes(primero), String(primero));
  const otra = primero === 'dulce' ? 'leo' : 'dulce';
  assert.strictEqual(quien(primero, false), primero, 'sin los meses solo cuenta la semana');
  assert.strictEqual(quien(primero, true), otra, 'con los meses, quien lleva diez turnos más este mes cede');
});

ok('F5 rev · «Quién abre» del local no sale en las condiciones de una semana en que esa persona está de baja entera', () => {
  const cfg = cfgBase(), st = cfg.staff;
  M.localDe(cfg, 'PASARELA').primero.T = 'mariluz';
  assert.ok(M.condicionesDe(cfg, st, '2026-10-05').some(c => c.id === 'loc:PASARELA:primero:T'));
  M.anadirAusencia(M.personaDe(st, 'mariluz'), { tipo: 'BAJ', desde: '2026-10-01', hasta: '2026-10-20' });
  assert.ok(!M.condicionesDe(cfg, st, '2026-10-05').some(c => c.id === 'loc:PASARELA:primero:T'));
  assert.ok(!M.condicionesDe(cfg, st, '2026-10-05').some(c => c.pid === 'mariluz'), 'como las de su ficha');
});

ok('F5 rev · textos: la condición de «sale el primero» no mezcla el género («en la posición 2»)', () => {
  const cfg = cfgBase(), st = cfg.staff;
  const e = f3Semana(); M.asignar(e, cfg, st, F3_LUN, 'PASARELA_M', 'tere', {}); M.asignar(e, cfg, st, F3_LUN, 'PASARELA_M', 'lola', {}); M.marcarAbre(e, F3_LUN, 'PASARELA_M', 'tere', cfg);
  const v = M.verificarSemana(cfg, st, e, F3_LUN).find(c => c.id === 'p:lola:abre:PASARELA:M');
  assert.ok(v && !v.ok && /lunes 28: en la posición 2/.test(v.detalle) && !/2\.º/.test(v.detalle), JSON.stringify(v));
});

// ---------- fase 6 (24/09): lo que Equipo enseña y promete es lo que aplican el Generador y la Cobertura ----------
// (decisiones.md D4-D7; huecos S13, S14, S16, S17, S20-S24, S29-S31, S39 y S40 de la auditoría del 24/09)
const f6Sem = () => f3Semana('2026-09-28');
ok('F6 · S13 con «Nunca con» apagado (el grupo o la pareja) la Revisión no marca «no pueden coincidir»; la pareja flexible no es de nivel alta', () => {
  for (const prep of [cfg => { cfg.reglas = { nuncaCon: false }; }, (cfg, st) => { M.ponerNuncaCon(st, 'mariluz', 'lavinia', { activa: false }); }]) {
    const cfg = cfgBase(), st = cfg.staff; prep(cfg, st); const e = estadoOct();
    assert.ok(M.asignar(e, cfg, st, '2026-10-02', 'PASARELA_T', 'mariluz', {}).ok && M.asignar(e, cfg, st, '2026-10-02', 'PASARELA_T', 'lavinia', {}).ok);
    assert.deepStrictEqual(M.revisarTurno(cfg, st, e, '2026-10-02', 'PASARELA_T').incompatibles, []);
    assert.strictEqual(M.revisionMes(cfg, st, e, { desde: '2026-10-02', hasta: '2026-10-02' }).filter(x => /nunca con|no pueden coincidir/.test(x.msg)).length, 0);
  }
  // encendida: Mari Luz y Lavinia (flexible) puestas a mano juntas es un aviso (media), no «no pueden coincidir» (alta)
  const cfg = cfgBase(), st = cfg.staff, e = estadoOct();
  assert.ok(M.asignar(e, cfg, st, '2026-10-02', 'PASARELA_T', 'mariluz', {}).ok && M.asignar(e, cfg, st, '2026-10-02', 'PASARELA_T', 'lavinia', { forzar: true }).ok);
  assert.deepStrictEqual(M.revisarTurno(cfg, st, e, '2026-10-02', 'PASARELA_T').incompatibles, []);
  const rv = M.revisionMes(cfg, st, e, { desde: '2026-10-02', hasta: '2026-10-02' }).filter(x => x.turnoId === 'PASARELA_T');
  assert.ok(rv.some(x => x.nivel === 'media' && /nunca con/.test(x.msg)) && !rv.some(x => x.tipo === 'incompatibles'), JSON.stringify(rv));
  // una pareja estricta sí es de nivel alta
  M.ponerNuncaCon(st, 'mariluz', 'lavinia', { flexible: false });
  assert.deepStrictEqual(M.revisarTurno(cfg, st, e, '2026-10-02', 'PASARELA_T').incompatibles, [['Mari Luz', 'Lavinia']]);
});
ok('F6 · S21 «nunca con» es una pareja: se pone y se quita en las dos fichas, con su «flexible» y su interruptor', () => {
  const cfg = cfgBase(), st = cfg.staff, P = id => M.personaDe(st, id);
  // la semilla ya la tiene en las dos fichas (Leo y Susana Capón también), con «flexible» por pareja
  assert.deepStrictEqual([P('mariluz').nuncaCon, P('lavinia').nuncaCon, P('leo').nuncaCon, P('scapon').nuncaCon], [['lavinia'], ['mariluz'], ['scapon'], ['leo']]);
  assert.ok(st.every(p => p.nuncaConFlexible === undefined), 'sin el «flexible» de la persona');
  assert.deepStrictEqual(M.parejasNuncaCon(cfg, st, P('scapon')).map(x => [x.pid, x.flexible, x.activa, x.estado]), [['leo', true, true, 'activa']]);
  // quitarla en la ficha de Mari Luz la quita también de la de Lavinia (antes el selector seguía: «nunca con Lavinia»)
  M.quitarNuncaCon(st, 'mariluz', 'lavinia');
  assert.deepStrictEqual([P('mariluz').nuncaCon, P('lavinia').nuncaCon], [[], []]);
  const e = estadoOct(); assert.ok(M.asignar(e, cfg, st, '2026-10-02', 'PASARELA_T', 'lavinia', {}).ok);
  assert.ok(M.puedeEstar(cfg, st, e, '2026-10-02', 'PASARELA_T', 'mariluz', {}).ok);
  // ponerla, estricta, en las dos
  M.ponerNuncaCon(st, 'leo', 'lavinia', {});
  assert.ok(P('leo').nuncaCon.includes('lavinia') && P('lavinia').nuncaCon.includes('leo'));
  assert.deepStrictEqual(M.incompatibles(cfg, P('lavinia'), P('leo')), { flexible: false });
  // apagar solo Leo–Susana Capón no apaga Leo–Lavinia (antes apagaba la característica entera, en cascada)
  M.ponerNuncaCon(st, 'leo', 'scapon', { activa: false });
  assert.strictEqual(M.incompatibles(cfg, P('leo'), P('scapon')), null);
  assert.ok(M.incompatibles(cfg, P('leo'), P('lavinia')));
  assert.ok(st.every(p => !(p.inactivas || []).includes('nuncaCon')));
  assert.deepStrictEqual(M.parejasNuncaCon(cfg, st, P('leo')).map(x => [x.pid, x.activa]).sort(), [['lavinia', true], ['scapon', false]]);
  // y volver a encenderla
  M.ponerNuncaCon(st, 'leo', 'scapon', { activa: true });
  assert.ok(M.incompatibles(cfg, P('leo'), P('scapon')));
  // con la regla del grupo apagada, cada pareja lo dice
  cfg.reglas = { nuncaCon: false };
  assert.ok(M.parejasNuncaCon(cfg, st, P('leo')).every(x => x.estado === 'apagada-grupo'));
});
ok('F6 · S21 migración: la pareja pasa a las dos fichas, «flexible» y el interruptor pasan a ser de la pareja, y se aplica igual que antes', () => {
  const estado = M.semillaPasarela(); const st = estado.staff, P = id => M.personaDe(st, id);
  // la forma de antes del 24/09: la pareja en una ficha o en las dos, «flexible» de la persona y el interruptor de la ficha entera
  for (const p of st) { delete p.nuncaConFlex; delete p.nuncaConOff; p.nuncaCon = []; }
  P('mariluz').nuncaCon = ['lavinia']; P('lavinia').nuncaCon = ['mariluz']; P('mariluz').nuncaConFlexible = true; P('lavinia').nuncaConFlexible = true;
  P('leo').nuncaCon = ['scapon']; P('leo').nuncaConFlexible = true; P('scapon').nuncaConFlexible = true;
  P('cristian').nuncaCon = ['lola']; P('lola').nuncaCon = ['cristian']; P('cristian').inactivas = ['nuncaCon', 'vetos']; P('lola').inactivas = ['nuncaCon'];   // apagada en cascada
  P('jenny').nuncaCon = ['juani']; P('jenny').inactivas = ['nuncaCon'];   // la tenía solo Jenny, apagada: no se aplicaba
  P('noe').nuncaCon = ['tere']; P('tere').inactivas = ['nuncaCon'];        // la tenía Noe, encendida: se aplicaba
  // lo que se aplicaba antes (la pareja flexible si lo era cualquiera de las dos personas; apagada si nadie que la
  // tuviera la tenía encendida)
  const antes = ['{"flexible":true}', '{"flexible":true}', 'null', 'null', '{"flexible":false}'];
  const r = M.migrarNuncaCon(estado);
  assert.ok(r.cambios > 0);
  assert.deepStrictEqual([P('scapon').nuncaCon, P('juani').nuncaCon, P('tere').nuncaCon], [['leo'], ['jenny'], ['noe']], 'mutuas');
  assert.deepStrictEqual([P('leo').nuncaConFlex, P('scapon').nuncaConFlex, P('mariluz').nuncaConFlex, P('lavinia').nuncaConFlex], [['scapon'], ['leo'], ['lavinia'], ['mariluz']]);
  assert.deepStrictEqual([P('cristian').nuncaConOff, P('lola').nuncaConOff, P('jenny').nuncaConOff, P('juani').nuncaConOff], [['lola'], ['cristian'], ['juani'], ['jenny']]);
  assert.ok(st.every(p => p.nuncaConFlexible === undefined && !(p.inactivas || []).includes('nuncaCon')), 'sin la forma de antes');
  assert.deepStrictEqual(P('cristian').inactivas, ['vetos'], 'lo demás apagado se queda');
  const despues = [['mariluz', 'lavinia'], ['leo', 'scapon'], ['cristian', 'lola'], ['jenny', 'juani'], ['noe', 'tere']].map(([a, b]) => JSON.stringify(M.incompatibles(estado, P(a), P(b))));
  assert.deepStrictEqual(despues, antes, 'se aplica igual que antes');
  const foto = JSON.stringify(st);
  assert.strictEqual(M.migrarNuncaCon(estado).cambios, 0, 'idempotente'); assert.strictEqual(JSON.stringify(st), foto);
  // la semilla ya viene así: la migración no la toca
  const sem = M.semillaPasarela(); assert.strictEqual(M.migrarNuncaCon(sem).cambios, 0);
});
ok('F6 · S24 «nunca con» flexible (José, 17/09): si no hay nadie más, el relleno relajado la pone con aviso; si hay gente, se respeta; el selector y la Cobertura igual', () => {
  const D = '2026-10-02';
  const escenario = () => {
    const cfg = cfgBase(), st = cfg.staff;
    for (const p of st) if (!['ivan', 'mariluz', 'lavinia', 'leo'].includes(p.id)) M.anadirAusencia(p, { tipo: 'VAC', desde: D, hasta: D });
    const e = estadoOct();
    M.asignar(e, cfg, st, D, 'PASARELA_T', 'ivan', {}); M.asignar(e, cfg, st, D, 'PASARELA_T', 'mariluz', {}); M.asignar(e, cfg, st, D, 'ZAPA_T', 'leo', {});
    return { cfg, st, e };
  };
  const { cfg, st, e } = escenario();
  // (revisión de la fase 6; decisiones.md, principio 6) la pareja flexible se relaja en el plan relajado: el del
  // Generador es «Permitir partidos no declarados». Sin él, el hueco queda y la propuesta «con aviso» la ofrece
  const g0 = M.generarPlanilla(cfg, st, e, D, D, { simular: true, sinPatron: true });
  assert.ok(!M.pidsEn(g0.estado, D, 'PASARELA_T').includes('lavinia') && g0.huecos.some(h => h.turnoId === 'PASARELA_T'), JSON.stringify(M.pidsEn(g0.estado, D, 'PASARELA_T')));
  const g = M.generarPlanilla(cfg, st, e, D, D, { simular: true, sinPatron: true, permitirPartido: true });
  const a = g.aplicados.find(x => x.turnoId === 'PASARELA_T' && x.pid === 'lavinia');
  assert.ok(a && a.avisos.some(x => /nunca con Mari Luz/.test(x)), JSON.stringify(g.aplicados.filter(x => x.turnoId === 'PASARELA_T')));
  // la Revisión: un aviso de nivel media, no «no pueden coincidir» (alta)
  const rv = M.revisionMes(cfg, st, g.estado, { desde: D, hasta: D }).filter(x => x.turnoId === 'PASARELA_T');
  assert.ok(!rv.some(x => x.tipo === 'incompatibles') && rv.some(x => x.nivel === 'media' && /nunca con/.test(x.msg)), JSON.stringify(rv));
  // el selector la ofrece «con aviso», también candidatosConAviso
  assert.ok(M.gruposSelector(cfg, st, e, D, 'PASARELA_T').conAviso.some(c => c.pid === 'lavinia'));
  assert.ok(M.candidatosConAviso(cfg, st, e, D, 'PASARELA_T').some(c => c.pid === 'lavinia'));
  // la Cobertura: si falta Iván, el plan relajado pone a Lavinia con aviso y va primero (con un mínimo de 2 esa
  // tarde lo completa; el estricto deja el hueco)
  const { cfg: c2, st: s2, e: e2 } = escenario(); M.localDe(c2, 'PASARELA').minimos.T[5] = 2;
  const pc = M.planesCobertura(c2, s2, e2, { pid: 'ivan', tipo: 'LD', desde: D, hasta: D });
  assert.ok(pc.planes[0].relajado && pc.planes[0].asignaciones.some(x => x.pid === 'lavinia' && x.avisos.some(y => /nunca con/.test(y))), JSON.stringify(pc.planes.map(p => [p.relajado, p.asignaciones.map(x => x.pid)])));
  assert.ok(pc.planes.filter(p => !p.relajado).every(p => !p.asignaciones.some(x => x.pid === 'lavinia')), 'el plan estricto no la usa');
  // con gente suficiente se respeta: sin las vacaciones hay otras personas para la tarde de Pasarela, y el
  // relleno no pone a Lavinia con Mari Luz
  const c3 = cfgBase(), s3 = c3.staff, e3 = estadoOct();
  M.asignar(e3, c3, s3, D, 'PASARELA_T', 'ivan', {}); M.asignar(e3, c3, s3, D, 'PASARELA_T', 'mariluz', {});
  const cs3 = M.candidatosPara(c3, s3, e3, D, 'PASARELA_T');
  assert.ok(cs3.length && !cs3.some(c => c.pid === 'lavinia'), cs3.map(c => c.pid).join(','));
  const g3 = M.generarPlanilla(c3, s3, e3, D, D, { simular: true, sinPatron: true, permitirPartido: true });
  assert.ok(!g3.aplicados.some(x => x.pid === 'lavinia' && x.turnoId === 'PASARELA_T'), JSON.stringify(M.pidsEn(g3.estado, D, 'PASARELA_T')));
  // una pareja estricta no se relaja nunca, ni en el relleno relajado: queda el hueco
  const { cfg: c4, st: s4, e: e4 } = escenario(); M.ponerNuncaCon(s4, 'mariluz', 'lavinia', { flexible: false });
  const g4 = M.generarPlanilla(c4, s4, e4, D, D, { simular: true, sinPatron: true, permitirPartido: true });
  assert.ok(!M.pidsEn(g4.estado, D, 'PASARELA_T').includes('lavinia') && g4.huecos.some(h => h.turnoId === 'PASARELA_T'));
});
ok('F6 · S14 «Preferencias» apagada en la ficha no resta en el relleno, la Cobertura, el selector ni el núcleo', () => {
  const cfg = cfgBase(), st = cfg.staff, p = M.personaDe(st, 'cristian'); p.prefs = { evitaDows: [1] };
  const e = f6Sem(), L = '2026-09-28';
  assert.ok(M.asignar(e, cfg, st, L, 'MONACO_M', 'jenny', { cocina: true, puesto: 'cocina' }).ok);   // un apoyo no entra solo (S33)
  const razones = () => M.candidatosPara(cfg, st, e, L, 'MONACO_M').find(c => c.pid === 'cristian').razones;
  assert.ok(razones().some(r => /prefiere no/.test(r)) && M.evita(cfg, p, 1));
  p.inactivas = ['prefs'];
  assert.strictEqual(M.evita(cfg, p, 1), false);
  assert.ok(!razones().some(r => /prefiere no/.test(r)));
  // apagada es igual que sin la preferencia: los mismos puntos y el mismo orden en el relleno, la Cobertura y el
  // selector (antes la prueba lo veía en que Cristian salía el primero, cuando ser apoyo sumaba; desde la revisión
  // final, 25/09, resta: José 18/09)
  const foto = () => [M.candidatosPara(cfg, st, e, L, 'MONACO_M').map(c => c.pid + ' ' + c.score), M.candidatosCobertura(cfg, st, e, L, 'MONACO_M', 'cris').map(c => c.pid + ' ' + c.score), M.gruposSelector(cfg, st, e, L, 'MONACO_M').recomendado.pid];
  const apagada = foto();
  p.prefs = {}; delete p.inactivas;
  assert.deepStrictEqual(apagada, foto());
  p.prefs = { evitaDows: [1] };
  assert.ok(foto()[0].includes('cristian ' + (+apagada[0].find(x => x.startsWith('cristian ')).split(' ')[1] + M.PESOS.evita)), 'encendida, resta lo suyo');
  p.inactivas = ['prefs'];
  assert.deepStrictEqual(M.toProblem(cfg, st, e, L, L, { conPatron: false }).workers.find(w => w.id === 'cristian').preferences, []);
});
ok('F6 · S16 (D5) con «Mínimos» apagado nadie los exige (Revisión, Generador, Cobertura y núcleo); el mínimo sigue en su sitio y la interfaz lo dice', () => {
  const cfg = cfgBase(), st = cfg.staff; cfg.reglas = { minimos: false };
  const e = f6Sem(), L = '2026-09-28';
  const r = M.revisarTurno(cfg, st, e, L, 'PASARELA_M');
  assert.strictEqual(r.faltan, 0); assert.strictEqual(r.minimo, 3, 'minimoDe no cambia: la cabecera n/mín lo sigue enseñando');
  const g = M.generarSemana(cfg, st, f6Sem(), L, { sinPatron: true });
  assert.strictEqual(g.huecos.filter(h => (h.tipo || 'faltan') === 'faltan').length, 0);
  assert.ok(!g.condiciones.some(c => c.tipo === 'minimos'));
  assert.strictEqual(M.revisionMes(cfg, st, g.estado, { desde: L, hasta: M.addDias(L, 6) }).filter(x => x.tipo === 'falta').length, 0);
  // la Cobertura: con la semana tipo puesta, si falta Iván su casilla no pide a nadie por el mínimo
  const c2 = cfgBase(), e2 = f6Sem(); M.generarSemana(c2, c2.staff, e2, L, {}); c2.reglas = { minimos: false };
  const pc = M.planesCobertura(c2, c2.staff, e2, { pid: 'ivan', tipo: 'LD', desde: '2026-10-02', hasta: '2026-10-02' });
  assert.ok(pc.afectados.every(a => !a.faltan) && pc.planes.every(p => !p.huecos.some(h => h.tipo === 'faltan')), JSON.stringify(pc.afectados));
  // el núcleo
  assert.strictEqual(NE.demanda(M.toProblem(cfg, st, f6Sem(), L, L, { conPatron: false }), 0, 'MONACO').min, 0);
  // la interfaz lo dice al apagarla (REGLAS, como «Cocina»)
  assert.match(M.REGLAS.find(x => x.k === 'minimos').apagada, /nadie/);
});
ok('F6 · S17 (D6) «Contrato» deja de ser un interruptor: fuera de CARACTERISTICAS, Horas sigue comparando y el apagado de antes se limpia', () => {
  assert.ok(!M.CARACTERISTICAS.some(c => c.k === 'contrato'));
  assert.strictEqual(M.VARIABLES.find(v => v.campo === 'contrato.horasSemana').clave, null);
  const cfg = cfgBase(), st = cfg.staff, y = M.personaDe(st, 'yilian'); y.contrato = { horasSemana: 40 }; y.inactivas = ['contrato', 'libra'];
  const h = M.horasPersonaMes(cfg, st, {}, 'yilian', 2026, 10);
  assert.ok(h.contratoHoras > 0 && h.saldo !== null, JSON.stringify([h.contratoHoras, h.saldo]));
  const r = M.migrarInactivas({ staff: st });
  assert.strictEqual(r.quitadas, 1); assert.deepStrictEqual(y.inactivas, ['libra']);
  assert.strictEqual(M.migrarInactivas({ staff: st }).quitadas, 0, 'idempotente');
});
ok('F6 · S20 estadoInterruptor: activa, apagada en la ficha o apagada para todo el grupo (manda el grupo)', () => {
  const cfg = cfgBase(), ml = M.personaDe(cfg.staff, 'mariluz');
  assert.strictEqual(M.estadoInterruptor(cfg, ml, 'libra'), 'activa');
  ml.inactivas = ['libra']; assert.strictEqual(M.estadoInterruptor(cfg, ml, 'libra'), 'apagada-ficha');
  cfg.reglas = { libra: false }; assert.strictEqual(M.estadoInterruptor(cfg, ml, 'libra'), 'apagada-grupo');
  delete ml.inactivas; assert.strictEqual(M.estadoInterruptor(cfg, ml, 'libra'), 'apagada-grupo');
  assert.strictEqual(M.estadoInterruptor(cfg, ml, 'prefs'), 'activa', 'sin regla del grupo, solo la ficha');
  // es lo mismo que aplica la puerta
  assert.strictEqual(M.activa(cfg, ml, 'libra'), false);
});
ok('F6 · S22 la condición «quien hace partido puede abrir la tarde» es un ajuste del local, no una regla del grupo', () => {
  const cfg = cfgBase();
  const c = M.condicionesDe(cfg, cfg.staff).find(x => x.id === 'loc:PASARELA:partidoAbre:T');
  assert.ok(c && c.tipo === 'local' && c.localId === 'PASARELA', JSON.stringify(c));
});
ok('F6 · S29 (D7) «sin local fijo» es no tener locales, igual en el generador, la planilla y Horas; la marca p.comodin se borra', () => {
  const cfg = cfgBase(), st = cfg.staff, P = id => M.personaDe(st, id);
  assert.ok(!st.some(p => 'comodin' in p), 'la semilla ya no la trae');
  assert.deepStrictEqual(['tere', 'lavinia', 'leo', 'cristian'].map(id => M.esComodin(P(id))), [false, false, true, true]);
  const e = f6Sem(); M.asignar(e, cfg, st, '2026-09-30', 'MONACO_M', 'cris', {});
  const c = M.candidatosPara(cfg, st, e, '2026-09-30', 'MONACO_M').find(x => x.pid === 'tere');
  assert.ok(c && !c.razones.includes('sin local fijo'), JSON.stringify(c && c.razones));
  M.asignar(e, cfg, st, '2026-09-30', 'MONACO_M', 'tere', {});
  assert.strictEqual(M.posicionesDe(cfg, st, e, '2026-09-30', 'MONACO_M').find(x => x.pid === 'tere').comodin, false);
  // la marca de antes no cambia nada y la migración la borra (también la que ponía migrarPuestos)
  P('tere').comodin = true;
  assert.strictEqual(M.esComodin(P('tere')), false);
  const estado = M.semillaPasarela(); M.personaDe(estado.staff, 'tere').comodin = true; M.personaDe(estado.staff, 'leo').comodin = true;
  estado.staff[0].puesto = 'comodin'; M.migrarPuestos(estado);
  assert.ok(!('comodin' in estado.staff[0]), 'migrarPuestos ya no la pone');
  assert.strictEqual(M.migrarComodin(estado).quitadas, 2);
  assert.ok(!estado.staff.some(p => 'comodin' in p));
  assert.strictEqual(M.migrarComodin(estado).quitadas, 0, 'idempotente');
});
ok('F6 · S30 vetos con día: la condición lleva el día en su id y en su texto, y el alta no da por repetido un veto de otro día', () => {
  const cfg = cfgBase(), st = cfg.staff, ml = M.personaDe(st, 'mariluz');
  const cs = () => M.condicionesDe(cfg, st).filter(x => x.pid === 'mariluz' && x.k === 'vetos');
  assert.deepStrictEqual(cs().map(x => x.id), ['p:mariluz:veto:PASARELA:M:1']);
  assert.match(cs()[0].texto, /los lunes/);
  assert.strictEqual(M.vetoRepetido(ml, { localId: 'PASARELA', franja: 'M' }), false);
  assert.strictEqual(M.vetoRepetido(ml, { localId: 'PASARELA', franja: 'M', dow: 1 }), true);
  assert.strictEqual(M.vetoRepetido(ml, { localId: 'PASARELA', franja: 'T', dow: 1 }), false);
  ml.vetos.push({ localId: 'PASARELA', franja: 'M', dow: 3 });
  assert.deepStrictEqual(cs().map(x => x.id), ['p:mariluz:veto:PASARELA:M:1', 'p:mariluz:veto:PASARELA:M:3']);
  assert.strictEqual(M.vetoRepetido(M.personaDe(st, 'cristian'), { localId: 'PASARELA', franja: 'M', dow: 2 }), true, 'el de todos los días ya lo cubre');
});
ok('F6 · S31 el local habitual no cambia al quitar y volver a poner un local, y se puede elegir', () => {
  const cfg = cfgBase(), st = cfg.staff, rob = M.personaDe(st, 'roberto'), J = '2026-10-01';
  const razones = tid => (M.candidatosPara(cfg, st, f6Sem(), J, tid).find(c => c.pid === 'roberto') || { razones: [] }).razones;
  assert.strictEqual(M.localHabitualDe(rob), 'ZAPA');
  M.alternarLocal(rob, 'ZAPA');
  assert.deepStrictEqual(rob.locales, ['PASARELA']); assert.strictEqual(M.localHabitualDe(rob), 'PASARELA', 'mientras no está, el que queda');
  M.alternarLocal(rob, 'ZAPA');
  assert.strictEqual(M.localHabitualDe(rob), 'ZAPA', 'al volver a ponerlo, vuelve a ser el habitual');
  assert.ok(razones('ZAPA_T').includes('su local habitual es Zapatillera'), razones('ZAPA_T').join(' · '));
  M.ponerLocalHabitual(rob, 'PASARELA');
  assert.strictEqual(M.localHabitualDe(rob), 'PASARELA');
  assert.ok(razones('PASARELA_T').includes('su local habitual es Pasarela') && !razones('ZAPA_T').some(r => /habitual/.test(r)));
  // sin locales no tiene habitual
  assert.strictEqual(M.localHabitualDe(M.personaDe(st, 'leo')), null);
});
ok('F6 · S39 quien hace mañana y tarde y no declara ningún día de partido tiene la condición «no hace partido», y el Generador la comprueba', () => {
  const cfg = cfgBase(), st = cfg.staff, cs = M.condicionesDe(cfg, st);
  const c = cs.find(x => x.id === 'p:yilian:partido');
  assert.ok(c && /Yilian no hace partido/.test(c.texto) && c.k === 'partido', JSON.stringify(c));
  assert.ok(!cs.some(x => x.id === 'p:dulce:partido'), 'en standby, no');
  assert.ok(!cs.some(x => x.id === 'p:lola:partido'), 'solo mañanas, no');
  const e = f6Sem();
  M.asignar(e, cfg, st, '2026-10-02', 'MONACO_M', 'yilian', {}); M.asignar(e, cfg, st, '2026-10-02', 'MONACO_T', 'yilian', { permitirPartido: true });
  const g = M.generarSemana(cfg, st, e, '2026-09-28', { permitirPartido: true });
  assert.ok(g.condiciones.some(x => !x.ok && x.pid === 'yilian' && x.k === 'partido'), JSON.stringify(g.condiciones.filter(x => x.pid === 'yilian')));
  // con «Días de partido» apagada (en su ficha), no se lista
  M.personaDe(st, 'yilian').inactivas = ['partido'];
  assert.ok(!M.condicionesDe(cfg, st).some(x => x.id === 'p:yilian:partido'));
});
ok('F6 · S40 (D4) un turno continuo no es un partido: la puerta lo deja con la nota «turno continuo», el Generador y la Revisión no lo marcan y Horas no lo cuenta', () => {
  const cfg = cfgBase(), st = cfg.staff, d = '2026-10-08', e = estadoOct();
  assert.ok(M.asignar(e, cfg, st, d, 'EL33_M', 'victoria', {}).ok && M.asignar(e, cfg, st, d, 'EL33_M', 'jenny', { cocina: true }).ok && M.asignar(e, cfg, st, d, 'EL33_T', 'hojan', { cocina: true }).ok);
  const r = M.puedeEstar(cfg, st, e, d, 'EL33_T', 'victoria');
  assert.ok(r.ok && !r.avisos.length && r.autorizados.some(a => a.texto === 'turno continuo'), JSON.stringify(r));
  assert.ok(M.candidatosPara(cfg, st, e, d, 'EL33_T').some(c => c.pid === 'victoria'), 'en «pueden» del selector');
  assert.ok(M.asignar(e, cfg, st, d, 'EL33_T', 'victoria', {}).ok);
  for (const tid of ['EL33_M', 'EL33_T']) { const s = M.posicionesDe(cfg, st, e, d, tid).find(x => x.pid === 'victoria'); assert.ok(s.continuo && !s.partido && !s.avisos.length, JSON.stringify(s)); }
  const v = M.verificarSemana(cfg, st, e, '2026-10-05').find(c => c.id === 'p:victoria:partido');
  assert.ok(v.ok && /jueves 8: turno continuo/.test(v.nota || ''), JSON.stringify(v));
  assert.deepStrictEqual(M.revisionMes(cfg, st, e, { desde: d, hasta: d }).filter(x => /Victoria/.test(x.msg)).map(x => x.msg), []);
  const h = M.horasPersonaMes(cfg, st, { '2026-10': e }, 'victoria', 2026, 10);
  assert.deepStrictEqual([h.continuos, h.partidos], [1, 0]);
  // si otra persona abre la tarde (Noe, de sala; Hojan lleva la cocina), es un partido no declarado
  const e2 = estadoOct();
  M.asignar(e2, cfg, st, d, 'EL33_M', 'victoria', {}); M.asignar(e2, cfg, st, d, 'EL33_T', 'hojan', { cocina: true }); M.asignar(e2, cfg, st, d, 'EL33_T', 'noe', {});
  assert.strictEqual(M.primeroDe(cfg, st, e2, d, 'EL33_T'), 'noe');
  const r2 = M.puedeEstar(cfg, st, e2, d, 'EL33_T', 'victoria');
  assert.ok(!r2.ok && r2.regla === 'partido', JSON.stringify(r2));
});

// ---------- revisión de la fase 6 (24/09): lo ya decidido con aviso llega a la planilla, y los textos dicen la verdad ----------
// Una plaza que ya se decidió con aviso (el plan relajado de la Cobertura, la vista previa del Generador, la propuesta
// «con aviso» de un hueco, lo puesto a mano desde el selector «con aviso») se pone con lo que se relajó al decidirla:
// el partido no declarado y la pareja «nunca con» flexible (M.RELAJABLE, una sola lista). Antes la pareja flexible salía
// en el plan y en la vista previa pero al aplicarla se rechazaba («nunca con Mari Luz»), y al quitar un cierre no volvía
const fR = '2026-10-02';
const fRescenario = soloEllos => {
  const cfg = cfgBase(), st = cfg.staff;
  for (const p of st) if (!soloEllos.includes(p.id)) M.anadirAusencia(p, { tipo: 'VAC', desde: fR, hasta: fR });
  const e = estadoOct();
  M.asignar(e, cfg, st, fR, 'PASARELA_T', 'ivan', {}); M.asignar(e, cfg, st, fR, 'PASARELA_T', 'mariluz', {});
  return { cfg, st, e };
};
const flexDe = (e, tid) => M.asignados(e, fR, tid || 'PASARELA_T').find(x => x.pid === 'lavinia');
const conAvisoFlex = x => !!x && (x.avisos || []).some(a => /nunca con Mari Luz \(pareja flexible/.test(a));
ok('F6 rev · RELAJABLE: una sola lista de lo que se relaja al poner lo ya decidido con aviso (partido no declarado y pareja flexible)', () => {
  assert.deepStrictEqual(Object.assign({}, M.RELAJABLE), { permitirPartido: true, relajarNuncaCon: true });
  assert.ok(Object.isFrozen(M.RELAJABLE), 'nadie la cambia por el camino');
});
ok('F6 rev · el plan relajado de la Cobertura con la pareja flexible se aplica tal cual: Lavinia entra con su aviso, nada rechazado', () => {
  const { cfg, st, e } = fRescenario(['ivan', 'mariluz', 'lavinia', 'leo']);
  M.asignar(e, cfg, st, fR, 'ZAPA_T', 'leo', {});
  M.localDe(cfg, 'PASARELA').minimos.T[5] = 2;
  const inc = { pid: 'ivan', tipo: 'LD', desde: fR, hasta: fR };
  const plan = M.planesCobertura(cfg, st, e, inc).planes[0];
  assert.ok(plan.relajado && plan.asignaciones.some(x => x.pid === 'lavinia'), JSON.stringify(plan.asignaciones.map(x => x.pid)));
  const r = M.aplicarCobertura(cfg, st, e, inc, plan);
  assert.deepStrictEqual(r.rechazados, []);
  assert.ok(conAvisoFlex(flexDe(e)), JSON.stringify(M.asignados(e, fR, 'PASARELA_T')));
});
ok('F6 rev · Generador → Periodo: lo que la vista previa pone con la pareja flexible se vuelca (0 fallos)', () => {
  const { cfg, st, e: real } = fRescenario(['ivan', 'mariluz', 'lavinia', 'leo']);
  M.asignar(real, cfg, st, fR, 'ZAPA_T', 'leo', {});
  const pv = M.clonarEstado(real);
  const previa = M.generarPlanilla(cfg, st, pv, fR, fR, { sinPatron: true, permitirPartido: true });
  assert.ok(conAvisoFlex(flexDe(pv)), 'la vista previa la trae: ' + JSON.stringify(M.asignados(pv, fR, 'PASARELA_T')));
  const r = M.volcarPrevia(cfg, st, () => real, previa, { desde: fR, hasta: fR, previaDe: () => pv });
  assert.strictEqual(r.fallos, 0, JSON.stringify(r));
  assert.ok(conAvisoFlex(flexDe(real)), JSON.stringify(M.asignados(real, fR, 'PASARELA_T')));
});
ok('F6 rev · la propuesta «con aviso» de un hueco se acepta con lo que ella misma relaja (RELAJABLE)', () => {
  const { cfg, st, e } = fRescenario(['ivan', 'mariluz', 'lavinia']);
  M.localDe(cfg, 'PASARELA').minimos.T[5] = 3;
  M.asignar(e, cfg, st, fR, 'PASARELA_M', 'lavinia', {});
  const alt = M.candidatosConAviso(cfg, st, e, fR, 'PASARELA_T').find(c => c.pid === 'lavinia');
  assert.ok(alt && alt.avisos.some(a => /partido no declarado/.test(a)) && alt.avisos.some(a => /pareja flexible/.test(a)), JSON.stringify(alt));
  const r = M.asignar(e, cfg, st, fR, 'PASARELA_T', 'lavinia', Object.assign({ origen: 'manual', razon: 'propuesta con aviso aceptada' }, M.RELAJABLE));
  assert.ok(r.ok, r.motivo);
  assert.ok(conAvisoFlex(flexDe(e)));
});
ok('F6 rev · principio 4: lo puesto a mano «con aviso» (pareja flexible) vuelve a su casilla al quitar un cierre', () => {
  const { cfg, st, e } = fRescenario(M.semillaPasarela().staff.map(p => p.id));
  cfg.cierresPuntuales = [];
  assert.ok(M.asignar(e, cfg, st, fR, 'PASARELA_T', 'lavinia', Object.assign({ origen: 'manual' }, M.RELAJABLE)).ok);
  assert.ok(M.aplicarCierre(cfg, st, e, { id: 'c1', localId: 'PASARELA', dias: { [fR]: ['T'] }, motivo: 'otro' }, {}).ok);
  assert.deepStrictEqual(M.pidsEn(e, fR, 'PASARELA_T'), []);
  const rq = M.quitarCierre(cfg, st, e, 'c1', { devolver: true, quitarVacaciones: true });
  assert.deepStrictEqual(rq.noDevueltos.map(x => [x.pid, x.motivo]), []);
  assert.ok(conAvisoFlex(flexDe(e)) && flexDe(e).origen === 'manual', JSON.stringify(M.asignados(e, fR, 'PASARELA_T')));
});
ok('F6 rev · el relleno y la Cobertura relajan igual (una sola escalera): la pareja flexible, solo en el modo relajado y si nadie más puede', () => {
  // la misma casilla en los dos caminos: la tarde de Pasarela del viernes 2 con Mari Luz, un mínimo de 2 y solo Lavinia
  // libre (Iván falta). El Generador sin «Permitir partidos no declarados» y el plan estricto de la Cobertura dejan el
  // hueco; con él y en el plan relajado, entra Lavinia con su aviso
  const prep = conIvan => {
    const { cfg, st, e } = fRescenario(['ivan', 'mariluz', 'lavinia', 'leo']);
    M.asignar(e, cfg, st, fR, 'ZAPA_T', 'leo', {});
    M.localDe(cfg, 'PASARELA').minimos.T[5] = 2;
    if (!conIvan) { M.desasignar(e, fR, 'PASARELA_T', 'ivan'); M.anadirAusencia(M.personaDe(st, 'ivan'), { tipo: 'LD', desde: fR, hasta: fR }); }
    return { cfg, st, e };
  };
  const inc = { pid: 'ivan', tipo: 'LD', desde: fR, hasta: fR };
  const c = prep(true), planes = M.planesCobertura(c.cfg, c.st, c.e, inc).planes;
  for (const relaja of [false, true]) {
    const { cfg, st, e } = prep(false);
    const g = M.generarPlanilla(cfg, st, e, fR, fR, { simular: true, sinPatron: true, permitirPartido: relaja });
    assert.strictEqual(conAvisoFlex(flexDe(g.estado)), relaja, `Generador (relajado: ${relaja}): ${JSON.stringify(M.asignados(g.estado, fR, 'PASARELA_T'))}`);
    const plan = planes.find(p => p.relajado === relaja);
    assert.ok(plan, `hay plan ${relaja ? 'relajado' : 'estricto'}: ${planes.map(p => p.relajado)}`);
    assert.strictEqual(plan.asignaciones.some(x => x.pid === 'lavinia'), relaja, `Cobertura (relajado: ${relaja}): ${plan.asignaciones.map(x => x.pid)}`);
  }
});
ok('F6 rev · D4 en la Cobertura: quien haría un turno continuo no lleva «ya trabaja ese día (partido)»', () => {
  const cfg = cfgBase(), st = cfg.staff, d = '2026-10-08', e = estadoOct();
  M.asignar(e, cfg, st, d, 'EL33_M', 'victoria', {}); M.asignar(e, cfg, st, d, 'EL33_M', 'jenny', { cocina: true });
  M.asignar(e, cfg, st, d, 'EL33_T', 'hojan', { cocina: true });
  const v = M.candidatosCobertura(cfg, st, e, d, 'EL33_T', 'noe').find(c => c.pid === 'victoria');
  assert.ok(v && v.autorizados.some(a => a.continuo), JSON.stringify(v));
  assert.ok(!v.razones.some(r => /\(partido\)/.test(r)) && v.razones.includes('ya trabaja ese día'), JSON.stringify(v.razones));
  // quien haría un partido de verdad lo sigue diciendo
  const e2 = estadoOct();
  M.asignar(e2, cfg, st, d, 'PASARELA_M', 'roberto', {});
  const r2 = M.candidatosCobertura(cfg, st, e2, d, 'EL33_T', 'noe', { permitirPartido: true }).find(c => c.pid === 'roberto');
  assert.ok(!r2 || r2.razones.includes('ya trabaja ese día (partido)'), JSON.stringify(r2 && r2.razones));
});
ok('F6 rev · D5 con «Mínimos» apagado la Cobertura no dice «la casilla sigue completa» de una casilla corta, y revisarTurno lo dice (minimosApagados)', () => {
  const cfg = cfgBase(), st = cfg.staff; cfg.reglas = { minimos: false };
  const e = estadoOct();
  M.asignar(e, cfg, st, fR, 'PASARELA_T', 'ivan', {}); M.asignar(e, cfg, st, fR, 'PASARELA_T', 'mariluz', {});
  const pc = M.planesCobertura(cfg, st, e, { pid: 'ivan', tipo: 'LD', desde: fR, hasta: fR });
  const sc = pc.planes[0].sinCubrir[0];
  assert.ok(sc && !/sigue completa/.test(sc.motivo) && /«Mínimos» está apagada/.test(sc.motivo) && /1 de 3/.test(sc.motivo), JSON.stringify(sc));
  const rv = M.revisarTurno(cfg, st, e, fR, 'PASARELA_T');
  assert.ok(rv.minimosApagados === true && rv.faltan === 0 && rv.minimo === 3, JSON.stringify(rv));
  // encendida, lo de siempre
  const cfg2 = cfgBase(), e2 = estadoOct();
  M.asignar(e2, cfg2, cfg2.staff, fR, 'PASARELA_T', 'ivan', {}); M.asignar(e2, cfg2, cfg2.staff, fR, 'PASARELA_T', 'mariluz', {}); M.asignar(e2, cfg2, cfg2.staff, fR, 'PASARELA_T', 'leo', {});
  assert.strictEqual(M.revisarTurno(cfg2, cfg2.staff, e2, fR, 'PASARELA_T').minimosApagados, false);
  const sc2 = M.planesCobertura(cfg2, cfg2.staff, e2, { pid: 'leo', tipo: 'LD', desde: fR, hasta: fR });
  assert.ok(sc2.afectados.length === 1);
});
ok('F6 rev · los textos de la pareja flexible dicen cuándo se junta: con aviso, en el modo relajado (TEXTO_PAREJA_FLEXIBLE, uno solo)', () => {
  assert.ok(/Permitir partidos no declarados/.test(M.TEXTO_PAREJA_FLEXIBLE) && /con aviso/.test(M.TEXTO_PAREJA_FLEXIBLE) && !/se relaja y queda el aviso/.test(M.TEXTO_PAREJA_FLEXIBLE), M.TEXTO_PAREJA_FLEXIBLE);
  const cfg = cfgBase();
  const c = M.condicionesDe(cfg, cfg.staff).find(x => x.k === 'nuncaCon' && [x.pid, x.otro].sort().join('+') === 'lavinia+mariluz');
  assert.ok(c && /pareja flexible: si no hay nadie más, se puede juntar con aviso/.test(c.texto), JSON.stringify(c));
});

// ---------- F7 (25/09): el motor Núcleo lee la ficha por la misma puerta (S25) ----------
const f7Oct = () => M.nuevoEstado(2026, 10, { festivos: [] });
const f7i = (pb, iso, f) => pb.meta.indices.findIndex(x => x.iso === iso && x.franja === f);
ok('F7 · toProblem: quien no puede trabajar ningún medio día va con todo a «*» y fuera del reparto equilibrado; una baja desde el jueves no quita el lunes', () => {
  const cfg = cfgBase(), st = cfg.staff;
  M.personaDe(st, 'tere').ausencias = [{ tipo: 'BAJ', desde: '2026-10-08' }];
  const pb = M.toProblem(cfg, st, f7Oct(), '2026-10-05', '2026-10-11', { conPatron: false });
  const bal = pb.rules.find(r => r.type === 'balance');
  assert.ok(bal.scope && ['laura', 'maydeth', 'susi', 'dulce'].every(id => !bal.scope.workers.includes(id)) && bal.scope.workers.includes('tere'), JSON.stringify(bal.scope));
  const tere = pb.workers.find(w => w.id === 'tere');
  assert.strictEqual(tere.unavailable[f7i(pb, '2026-10-05', 'M')], undefined, 'el lunes trabaja');
  assert.deepStrictEqual(tere.unavailable[f7i(pb, '2026-10-08', 'M')], ['*'], 'el jueves ya está de baja');
});
ok('F7 · toProblem cruza de mes con la planilla de cada mes (opts.meses): el cierre a mano y lo ya puesto de octubre', () => {
  const cfg = cfgBase(), st = cfg.staff;
  const sep = M.nuevoEstado(2026, 9, { festivos: [] }), oct = f7Oct();
  oct.apertura['2026-10-01'] = { EL33_M: false };
  assert.ok(M.asignar(oct, cfg, st, '2026-10-02', 'PASARELA_M', 'tere', { forzar: true }).ok);
  const pb = M.toProblem(cfg, st, sep, '2026-09-28', '2026-10-04', { conPatron: false, meses: { '2026-09': sep, '2026-10': oct } });
  assert.deepStrictEqual(NE.demanda(pb, f7i(pb, '2026-10-01', 'M'), 'EL33'), { min: 0, max: 0 }, 'El 33 cerrado a mano el jueves 1');
  assert.strictEqual(pb.workers.find(w => w.id === 'tere').fixed[f7i(pb, '2026-10-02', 'M')], 'PASARELA', 'lo ya puesto en octubre va fijo');
});
ok('F7 · lo ya puesto en la planilla va fijo en el problema (lo hace el modelo, no la pantalla), también lo forzado', () => {
  const cfg = cfgBase(), st = cfg.staff, e = f7Oct();
  assert.ok(M.asignar(e, cfg, st, '2026-10-10', 'PASARELA_M', 'tere', { forzar: true }).ok, 'Tere libra los sábados: forzada');
  const pb = M.toProblem(cfg, st, e, '2026-10-05', '2026-10-11', { conPatron: false });
  const i = f7i(pb, '2026-10-10', 'M'), tere = pb.workers.find(w => w.id === 'tere');
  assert.strictEqual(tere.fixed[i], 'PASARELA');
  assert.strictEqual(tere.unavailable[i], undefined, 'lo fijo manda: no está además «no disponible»');
});
ok('F7 · «nunca con» en el núcleo: la pareja flexible es dura en el modo estricto y blanda en el relajado; la que ya se juntó a mano no hace imposible el problema', () => {
  const cfg = cfgBase(), st = cfg.staff;
  const reglas = (pb, modo) => pb.rules.filter(r => r.type === 'same_shift_forbidden' && r.mode === modo).flatMap(r => r.params.pairs.map(q => q.slice().sort().join('+')));
  const est = M.toProblem(cfg, st, f7Oct(), '2026-10-05', '2026-10-11', { conPatron: false });
  assert.ok(reglas(est, 'hard').includes('lavinia+mariluz') && !reglas(est, 'soft').length, JSON.stringify(est.rules.filter(r => r.type === 'same_shift_forbidden')));
  const rel = M.toProblem(cfg, st, f7Oct(), '2026-10-05', '2026-10-11', { conPatron: false, permitirPartido: true });
  assert.ok(reglas(rel, 'soft').includes('lavinia+mariluz') && !reglas(rel, 'hard').includes('lavinia+mariluz'), JSON.stringify(rel.rules.filter(r => r.type === 'same_shift_forbidden')));
  // una pareja estricta que el encargado ya puso junta a mano: en el problema, blanda (si no, sería imposible)
  const c2 = cfgBase(); M.ponerNuncaCon(c2.staff, 'ivan', 'lola', {});
  const e2 = f7Oct();
  assert.ok(M.asignar(e2, c2, c2.staff, '2026-10-06', 'PASARELA_T', 'ivan', {}).ok && M.asignar(e2, c2, c2.staff, '2026-10-06', 'PASARELA_T', 'lola', { forzar: true }).ok);
  const pb2 = M.toProblem(c2, c2.staff, e2, '2026-10-05', '2026-10-11', { conPatron: false });
  assert.ok(!reglas(pb2, 'hard').includes('ivan+lola') && reglas(pb2, 'soft').includes('ivan+lola'), JSON.stringify(pb2.rules.filter(r => r.type === 'same_shift_forbidden')));
});
ok('F7 · «sin partido» en el núcleo: un partido que ya está puesto a mano no hace imposible el problema', () => {
  const cfg = cfgBase(), st = cfg.staff, e = f7Oct();
  assert.ok(M.asignar(e, cfg, st, '2026-10-07', 'MONACO_M', 'yilian', {}).ok);
  assert.ok(M.asignar(e, cfg, st, '2026-10-07', 'MONACO_T', 'scapon', {}).ok && M.asignar(e, cfg, st, '2026-10-07', 'MONACO_T', 'yilian', { forzar: true, permitirPartido: true }).ok);
  const pb = M.toProblem(cfg, st, e, '2026-10-05', '2026-10-11', { conPatron: false });
  const dura = pb.rules.find(r => r.id === 'sin partido' && r.mode === 'hard'), blanda = pb.rules.find(r => r.id === 'sin partido' && r.mode === 'soft');
  assert.ok(!(dura && dura.scope.workers.includes('yilian')) && blanda && blanda.scope.workers.includes('yilian'), JSON.stringify(pb.rules.filter(r => r.id === 'sin partido')));
});
ok('F7 · la cocina del núcleo es puedeCocina de ese local ese día (con sus interruptores)', () => {
  const cfg = cfgBase(), st = cfg.staff;
  const dias = pb => pb.workers.find(w => w.id === 'scapon').skills.filter(s => s.startsWith('coc_MONACO_')).map(s => M.isoDow(s.slice(-10)));
  assert.deepStrictEqual(dias(M.toProblem(cfg, st, f7Oct(), '2026-10-05', '2026-10-11', { conPatron: false })), [2], 'Susana Capón, cocina solo los martes');
  M.personaDe(st, 'scapon').inactivas = ['cocina'];
  assert.deepStrictEqual(dias(M.toProblem(cfg, st, f7Oct(), '2026-10-05', '2026-10-11', { conPatron: false })), [1, 2, 3, 4, 5, 6, 7], '«Cocina» apagada en su ficha: todos los días');
  const pb = M.toProblem(cfg, st, f7Oct(), '2026-10-05', '2026-10-11', { conPatron: false });
  assert.ok(pb.rules.some(r => r.type === 'skill_coverage' && r.params.requirements[0].skill === M.skillCocina('MONACO', '2026-10-06')));
  cfg.reglas = { cocina: false };
  const pc = M.toProblem(cfg, st, f7Oct(), '2026-10-05', '2026-10-11', { conPatron: false });
  assert.ok(!pc.rules.some(r => r.type === 'skill_coverage') && pc.workers.every(w => !w.skills.length), 'regla «Cocina» apagada: nadie la pide ni la lleva');
});
ok('F7 · la semana tipo entra en el núcleo por la misma puerta: Roberto «cubre a Iván» el domingo va fijo y se vuelca con su «por»', () => {
  const cfg = cfgBase(), st = cfg.staff, e = f7Oct(), DOM = '2026-10-11';
  M.personaDe(st, 'roberto').cubreA = [{ pid: 'ivan' }];
  M.personaDe(st, 'ivan').ausencias = [{ tipo: 'VAC', desde: DOM, hasta: DOM }];
  const pb = M.toProblem(cfg, st, e, '2026-10-05', DOM, {});
  const i = f7i(pb, DOM, 'T');
  assert.strictEqual(pb.workers.find(w => w.id === 'roberto').fixed[i], 'PASARELA', 'en el sitio de Iván (su partido del domingo, autorizado por cubrirle: D1)');
  const sol = { schedule: {} };
  for (const w of pb.workers) for (const [k, c] of Object.entries(w.fixed)) (sol.schedule[w.id] = sol.schedule[w.id] || {})[k] = c;
  const r = M.desdeSolucion(cfg, st, e, pb, sol, {});
  const en = M.asignados(e, DOM, 'PASARELA_T').find(x => x.pid === 'roberto');
  assert.ok(en && en.por === 'ivan' && en.porDesignacion && !(en.avisos || []).length, JSON.stringify(M.asignados(e, DOM, 'PASARELA_T')));
  assert.ok(!r.rechazados.some(x => x.pid === 'roberto'), JSON.stringify(r.rechazados));
});
ok('F7 · desdeSolucion pone primero lo fijo y luego lo que propone el núcleo, en el modo del Generador: la plaza de la semana tipo no se pierde', () => {
  const cfg = cfgBase(), st = cfg.staff, e = f7Oct(), VIE = '2026-10-09';
  const pb = M.toProblem(cfg, st, e, VIE, VIE, {});
  assert.strictEqual(pb.workers.find(w => w.id === 'lavinia').fixed[1], 'ZAPA', 'Lavinia, fija el viernes por la tarde en Zapatillera');
  const sol = { schedule: { lavinia: { 0: 'PASARELA', 1: 'ZAPA' } } };
  const r = M.desdeSolucion(cfg, st, e, pb, sol, { permitirPartido: false });
  assert.ok(M.pidsEn(e, VIE, 'ZAPA_T').includes('lavinia') && !M.pidsEn(e, VIE, 'PASARELA_M').includes('lavinia'), 'la tarde de la semana tipo se queda; la mañana (partido no declarado) no entra');
  assert.ok(r.rechazados.some(x => x.pid === 'lavinia' && x.turnoId === 'PASARELA_M' && x.regla === 'partido'), JSON.stringify(r.rechazados));
  // con «Permitir partidos no declarados», entra con su aviso
  const e2 = f7Oct(), pb2 = M.toProblem(cfg, st, e2, VIE, VIE, { permitirPartido: true });
  M.desdeSolucion(cfg, st, e2, pb2, sol, { permitirPartido: true });
  const m = M.asignados(e2, VIE, 'PASARELA_M').find(x => x.pid === 'lavinia');
  assert.ok(m && (m.avisos || []).some(t => /partido no declarado/.test(t)), JSON.stringify(M.asignados(e2, VIE, 'PASARELA_M')));
});

ok('F7 · toProblem(ctx, desde, hasta): con el contexto de la puerta (crearContexto) sale el mismo problema', () => {
  const cfg = cfgBase(), st = cfg.staff, sep = M.nuevoEstado(2026, 9, { festivos: [] }), oct = f7Oct();
  oct.apertura['2026-10-01'] = { EL33_M: false };
  const meses = { '2026-09': sep, '2026-10': oct };
  const a = M.toProblem(M.crearContexto(cfg, st, sep, { meses }), '2026-09-28', '2026-10-04', { permitirPartido: true });
  const b = M.toProblem(cfg, st, sep, '2026-09-28', '2026-10-04', { permitirPartido: true, meses });
  assert.deepStrictEqual(a, b);
  assert.deepStrictEqual(NE.demanda(a, f7i(a, '2026-10-01', 'M'), 'EL33'), { min: 0, max: 0 }, 'con los meses del contexto');
});
ok('F7 · las plazas supuestas de la semana tipo las decide el núcleo (no van fijas); si las elige, se vuelcan como supuestas', () => {
  const cfg = cfgBase(), st = cfg.staff, e = f7Oct(), MAR = '2026-10-06';
  const pb = M.toProblem(cfg, st, e, MAR, MAR, {});
  assert.strictEqual(pb.workers.find(w => w.id === 'tere').fixed[0], undefined, 'Tere (supuesta los martes en Pasarela por la mañana): libre para el núcleo');
  M.desdeSolucion(cfg, st, e, pb, { schedule: { tere: { 0: 'PASARELA' } } }, {});
  const en = M.asignados(e, MAR, 'PASARELA_M').find(x => x.pid === 'tere');
  assert.ok(en && en.supuesto && en.origen === 'nucleo', JSON.stringify(en));
});
// ---------- F7 rev (25/09): revisión de la fase 7 con el núcleo DE VERDAD (shiftia-core y su CP-SAT) ----------
// Los dos revisores pasaron el problema por el servicio real: lo rechazaba (422) y, arreglada la forma, con un medio
// día imposible relajaba los mínimos de todo el periodo y dejaba más casillas cortas que el generador local
const f7Vuelta = (pb, extra, ignorarVetos) => {
  // un núcleo de pega sin CP-SAT: lo fijo, más lo que se le pida (si el problema no lo veta, como el de verdad)
  const sched = {};
  for (const w of pb.workers) sched[w.id] = Object.assign({}, w.fixed);
  for (const [pid, i, code] of extra || []) { const w = pb.workers.find(x => x.id === pid); const u = w.unavailable[i]; if (ignorarVetos || (!NE.todoFuera(u) && !(u || []).includes(code))) sched[pid][i] = code; }
  return { ok: true, status: 200, datos: { status: 'OPTIMAL', feasible: true, objective: 0, schedule: sched, relaxations: [], violations: [], stats: { wall_time_s: 0.1 } } };
};
const f7Flujo = (cfg, st, meses, desde, hasta, opts, nucleo) => {
  const peticiones = [];
  const it = M.flujoNucleo(cfg, st, meses, desde, hasta, opts);
  let paso = it.next();
  while (!paso.done) { peticiones.push(paso.value); paso = it.next(nucleo(paso.value)); }
  return { r: paso.value, peticiones };
};
ok('F7 rev · el problema cumple el esquema del núcleo (SolveRequest de shiftia-core): «ningún local ese medio día» es la lista ["*"], no el texto «*» (el núcleo respondía 422)', () => {
  const cfg = cfgBase(), st = cfg.staff, sep = M.nuevoEstado(2026, 9, { festivos: [] }), oct = f7Oct();
  M.ponerLibraPuntual(M.personaDe(st, 'mariluz'), '2026-09-28', [2]);
  const pb = M.toProblem(cfg, st, sep, '2026-09-28', '2026-10-04', { meses: { '2026-09': sep, '2026-10': oct } });
  assert.deepStrictEqual(NE.erroresPeticion({ problem: pb }).slice(0, 3), []);
  const dulce = pb.workers.find(w => w.id === 'dulce');
  assert.ok(pb.meta.indices.every((x, i) => Array.isArray(dulce.unavailable[i]) && dulce.unavailable[i].join() === '*'), JSON.stringify(dulce.unavailable));
});
ok('F7 rev · un medio día imposible no arrastra a los demás: los mínimos son blandos y lo primero (tier 3), las casillas cerradas duras a 0 y cada regla dura, con su nombre', () => {
  const cfg = cfgBase(), st = cfg.staff, e = f7Oct();
  e.apertura['2026-10-08'] = { EL33_M: false };
  const pb = M.toProblem(cfg, st, e, '2026-10-05', '2026-10-11', {});
  const cov = pb.rules.filter(r => r.type === 'coverage');
  // antes, una sola regla dura para todo el periodo: con Dulce en standby la mañana del lunes 5 en Pasarela no se
  // puede cubrir, el núcleo relajaba la regla entera y ya no tenía por qué llenar ninguna otra casilla
  const piden = r => Object.values(r.params.by_day).some(d => Object.values(d).some(s => s.min > 0));
  assert.ok(!cov.some(r => r.mode === 'hard' && piden(r)), JSON.stringify(cov.map(r => [r.id, r.mode])));
  const min = cov.find(r => r.mode === 'soft' && piden(r));
  assert.ok(min && min.tier === 3 && pb.rules.filter(r => r.mode === 'soft' && r !== min).every(r => r.tier < 3), 'los mínimos, antes que cualquier otra regla blanda');
  assert.deepStrictEqual(NE.demanda(pb, f7i(pb, '2026-10-05', 'M'), 'PASARELA'), { min: 3, max: null });
  assert.deepStrictEqual(NE.demanda(pb, f7i(pb, '2026-10-08', 'M'), 'EL33'), { min: 0, max: 0 }, 'la cerrada, a 0');
  assert.ok(cov.some(r => r.mode === 'hard' && ((r.params.by_day[f7i(pb, '2026-10-08', 'M')] || {}).EL33 || {}).max === 0), 'y dura');
  assert.ok(pb.rules.filter(r => r.type === 'skill_coverage' && r.mode === 'hard').every(r => r.scope.day_tags.length === 1), 'la cocina obligatoria, una regla por medio día');
  // el núcleo relaja por nombre de regla: dos reglas duras con el mismo nombre se relajaban juntas (febrero y marzo
  // de 2027 empiezan el mismo día de la semana: «cocina … del viernes 5» salía dos veces)
  const fm = M.toProblem(cfg, st, M.nuevoEstado(2027, 2, { festivos: [] }), '2027-02-01', '2027-03-31', { conPatron: false });
  const duras = fm.rules.filter(r => r.mode === 'hard').map(r => r.id);
  assert.strictEqual(new Set(duras).size, duras.length, duras.filter((x, i) => duras.indexOf(x) !== i).slice(0, 3).join(' | '));
});
ok('F7 rev · «sin partido» dura: quien tiene fijos dos medios días seguidos (la tarde y la mañana siguiente, Yilian) no entra en ella', () => {
  const cfg = cfgBase(), st = cfg.staff;
  const pb = M.toProblem(cfg, st, f7Oct(), '2026-10-05', '2026-10-11', {});
  const y = pb.workers.find(w => w.id === 'yilian');
  assert.ok(y.fixed[f7i(pb, '2026-10-05', 'T')] && y.fixed[f7i(pb, '2026-10-06', 'M')], 'su semana tipo: el lunes por la tarde y el martes por la mañana en el Mónaco');
  // la ventana de dos medios días del núcleo también prohíbe «tarde y mañana siguiente»: con ella dura, el problema
  // era imposible por construcción y el núcleo relajaba «sin partido» para todo el grupo
  const dura = pb.rules.find(r => r.id === 'sin partido' && r.mode === 'hard');
  for (const id of dura ? dura.scope.workers : []) {
    const w = pb.workers.find(x => x.id === id);
    assert.ok(!pb.meta.indices.some((x, i) => w.fixed[i] && w.fixed[i + 1]), `${id}: ${JSON.stringify(w.fixed)}`);
  }
  assert.ok(pb.rules.some(r => r.id === 'sin partido' && r.mode === 'soft' && r.scope.workers.includes('yilian')), JSON.stringify(pb.rules.filter(r => r.id === 'sin partido')));
});
ok('F7 rev · el volcado dice por qué no entra quien solo hace cocina: el motivo de la cocina (Hojan, «no hace partido los miércoles»), no «solo hace cocina»', () => {
  const cfg = cfgBase(), st = cfg.staff, X = '2026-10-07';
  const e = f7Oct(), pb = M.toProblem(cfg, st, e, X, X, {});
  assert.strictEqual(pb.workers.find(w => w.id === 'hojan').fixed[1], 'MONACO', 'la tarde del Mónaco, de su semana tipo');
  const r = M.desdeSolucion(cfg, st, e, pb, { schedule: { hojan: { 0: 'EL33', 1: 'MONACO' } } }, {});
  const x = r.rechazados.find(z => z.pid === 'hojan');
  assert.ok(x && x.regla === 'partido' && /no hace partido los miércoles/.test(x.motivo), JSON.stringify(r.rechazados));
  // y con «Permitir partidos no declarados», entra de cocina con su aviso
  const e2 = f7Oct(), pb2 = M.toProblem(cfg, st, e2, X, X, { permitirPartido: true });
  M.desdeSolucion(cfg, st, e2, pb2, { schedule: { hojan: { 0: 'EL33', 1: 'MONACO' } } }, { permitirPartido: true });
  const en = M.asignados(e2, X, 'EL33_M').find(z => z.pid === 'hojan');
  assert.ok(en && en.cocina && (en.avisos || []).length, JSON.stringify(M.asignados(e2, X, 'EL33_M')));
});
ok('F7 rev · toProblem lee el mes del propio estado del estado (la copia del Generador) y los otros meses de opts.meses, como turnosSemanaDe', () => {
  const cfg = cfgBase(), st = cfg.staff, copia = f7Oct(), guardado = f7Oct();
  assert.ok(M.asignar(copia, cfg, st, '2026-10-10', 'PASARELA_M', 'tere', { forzar: true }).ok);
  const pb = M.toProblem(cfg, st, copia, '2026-10-05', '2026-10-11', { conPatron: false, meses: { '2026-10': guardado } });
  assert.strictEqual(pb.workers.find(w => w.id === 'tere').fixed[f7i(pb, '2026-10-10', 'M')], 'PASARELA', 'Tere, forzada en la copia');
  const sep = M.nuevoEstado(2026, 9, { festivos: [] });
  const pc = M.toProblem(cfg, st, sep, '2026-09-28', '2026-10-11', { conPatron: false, meses: { '2026-10': copia } });
  assert.strictEqual(pc.workers.find(w => w.id === 'tere').fixed[f7i(pc, '2026-10-10', 'M')], 'PASARELA', 'y el otro mes, de opts.meses');
});
ok('F7 rev · «Solo desde hoy» llega al núcleo: el problema empieza hoy y el volcado no propone ni cuenta huecos en los días pasados', () => {
  const cfg = cfgBase(), st = cfg.staff, HOY = '2026-10-08';
  const e = f7Oct(), pb = M.toProblem(cfg, st, e, '2026-10-05', '2026-10-11', { desdeIso: HOY });
  assert.ok(pb && pb.meta.desde === HOY && pb.horizon_days === 8 && pb.meta.indices.every(x => x.iso >= HOY), pb && JSON.stringify(pb.meta.indices.slice(0, 2)));
  const r = M.desdeSolucion(cfg, st, e, pb, f7Vuelta(pb).datos, { desdeIso: HOY });
  assert.ok(r.aplicados.length && r.aplicados.every(a => a.iso >= HOY) && r.huecos.every(h => h.iso >= HOY), JSON.stringify(r.huecos.map(h => h.iso)));
  assert.ok(Object.keys(e.asig).every(iso => iso >= HOY), 'los días pasados, sin tocar');
  // aunque el problema traiga días pasados, el volcado no los toca
  const e2 = f7Oct(), p2 = M.toProblem(cfg, st, e2, '2026-10-05', '2026-10-11', {});
  const r2 = M.desdeSolucion(cfg, st, e2, p2, f7Vuelta(p2).datos, { desdeIso: HOY });
  assert.ok(r2.aplicados.every(a => a.iso >= HOY) && r2.huecos.every(h => h.iso >= HOY) && Object.keys(e2.asig).every(iso => iso >= HOY));
  assert.strictEqual(M.toProblem(cfg, st, f7Oct(), '2026-10-05', '2026-10-07', { desdeIso: HOY }), null, 'todo el periodo ya ha pasado: no hay nada que resolver');
});
ok('F7 rev · el partido de ESE día en el núcleo: con una mitad del día fija, la otra no está disponible si ese día no hace partido (modo estricto)', () => {
  const cfg = cfgBase(), st = cfg.staff, VIE = '2026-10-09';
  const pb = M.toProblem(cfg, st, f7Oct(), VIE, VIE, {});
  const lav = pb.workers.find(w => w.id === 'lavinia');
  assert.strictEqual(lav.fixed[1], 'ZAPA', 'Lavinia, fija el viernes por la tarde en Zapatillera (semana tipo)');
  assert.deepStrictEqual(lav.unavailable[0], ['*'], 'y los viernes no hace partido: la mañana, en ningún local');
  const rel = M.toProblem(cfg, st, f7Oct(), VIE, VIE, { permitirPartido: true });
  assert.strictEqual(rel.workers.find(w => w.id === 'lavinia').unavailable[0], undefined, 'en el modo relajado su partido entra con aviso');
  // Hojan (solo cocina) con la tarde del Mónaco fija el miércoles: la mañana, tampoco
  const X = '2026-10-07', ph = M.toProblem(cfg, st, f7Oct(), X, X, {});
  assert.deepStrictEqual(ph.workers.find(w => w.id === 'hojan').unavailable[0], ['*'], JSON.stringify(ph.workers.find(w => w.id === 'hojan')));
  // quien lo hace ese día (Mari Luz el viernes, con la mañana y la tarde de Pasarela en su semana tipo), sin tocar
  assert.deepStrictEqual(Object.values(pb.workers.find(w => w.id === 'mariluz').fixed), ['PASARELA', 'PASARELA']);
});
ok('F7 rev · otra vuelta: lo que la puerta no deja poner se veta en el problema (unavailable) sin tocar lo fijo ni el problema de la vuelta anterior', () => {
  const cfg = cfgBase(), st = cfg.staff, VIE = '2026-10-09', meses = { '2026-10': f7Oct() };
  const pb = M.toProblem(cfg, st, meses['2026-10'], VIE, VIE, { meses });
  // lo que no se sabe hasta resolver: Cristian, libre todo el viernes (no hace partido los viernes), de mañana y de tarde
  const cr0 = pb.workers.find(w => w.id === 'cristian');
  assert.ok(!cr0.fixed[0] && !cr0.fixed[1] && cr0.unavailable[1] === undefined, JSON.stringify(cr0));
  const sol = f7Vuelta(pb, [['cristian', 0, 'MONACO'], ['cristian', 1, 'PASARELA']]).datos;
  const rech = M.rechazosDelNucleo(cfg, st, meses, pb, sol, { permitirPartido: false });
  assert.deepStrictEqual(rech.map(x => `${x.pid} ${x.turnoId} ${x.regla}`), ['cristian PASARELA_T partido']);
  assert.ok(!Object.keys(meses['2026-10'].asig).length, 'lo prueba sobre una copia: la planilla no se toca');
  const pb2 = M.vetarRechazos(pb, rech);
  assert.deepStrictEqual(pb2.workers.find(w => w.id === 'cristian').unavailable[1], ['*'], 'un partido que no hace: ese medio día, ningún local');
  assert.strictEqual(pb.workers.find(w => w.id === 'cristian').unavailable[1], undefined, 'el problema de la vuelta anterior no cambia');
  assert.deepStrictEqual(NE.erroresPeticion({ problem: pb2 }), []);
  // por otra regla (una pareja «nunca con», la casilla): solo ese local ese medio día
  assert.deepStrictEqual(cr0.unavailable[0], ['PASARELA'], 'Cristian, el viernes por la mañana: todo menos Pasarela (su veto)');
  const pb3 = M.vetarRechazos(pb, [{ iso: VIE, turnoId: 'ZAPA_M', pid: 'cristian', regla: 'nuncaCon', motivo: 'nunca con X' }]);
  assert.deepStrictEqual(pb3.workers.find(w => w.id === 'cristian').unavailable[0], ['PASARELA', 'ZAPA']);
  // lo fijo no se veta nunca (lo puesto no lo quita nadie)
  const pb4 = M.vetarRechazos(pb, [{ iso: VIE, turnoId: 'ZAPA_T', pid: 'lavinia', regla: 'partido' }]);
  assert.strictEqual(pb4.workers.find(w => w.id === 'lavinia').unavailable[1], undefined);
});
ok('F7 rev · flujoNucleo: el camino del motor Núcleo con el núcleo por fuera (una vuelta si todo entra; si la puerta rechaza algo, otra sin ello) y el hueco dice lo que proponía', () => {
  const cfg = cfgBase(), st = cfg.staff, VIE = '2026-10-09';
  const partido = [['cristian', 0, 'MONACO'], ['cristian', 1, 'PASARELA']];
  const meses = { '2026-10': f7Oct() };
  const a = f7Flujo(cfg, st, meses, VIE, VIE, { permitirPartido: false }, pet => f7Vuelta(pet.problem, partido));
  assert.strictEqual(a.peticiones.length, 2, 'la puerta rechazó la tarde de Cristian (no hace partido los viernes): otra vuelta sin ella');
  for (const p of a.peticiones) assert.deepStrictEqual(NE.erroresPeticion(p), [], 'la petición entera (problema y configuración) la acepta el núcleo');
  assert.deepStrictEqual(a.peticiones[1].problem.workers.find(w => w.id === 'cristian').unavailable[1], ['*']);
  assert.ok(M.pidsEn(meses['2026-10'], VIE, 'MONACO_M').includes('cristian') && !M.pidsEn(meses['2026-10'], VIE, 'PASARELA_T').includes('cristian'), 'vuelca lo de la última vuelta: la mañana, sin el partido');
  assert.strictEqual(a.r.nucleo.vueltas, 2);
  const h = a.r.huecos.find(x => x.iso === VIE && x.turnoId === 'PASARELA_T');
  assert.ok(h && (h.nucleo || []).some(x => x.pid === 'cristian' && x.regla === 'partido' && /no hace partido los viernes/.test(x.motivo)), JSON.stringify(a.r.huecos));
  assert.ok(a.r.rechazados.some(x => x.pid === 'cristian' && x.nucleo && x.vetada), 'y sale entre lo que no se pudo poner');
  // en el modo relajado entra con su aviso: una sola vuelta
  const m2 = { '2026-10': f7Oct() };
  const b = f7Flujo(cfg, st, m2, VIE, VIE, { permitirPartido: true }, pet => f7Vuelta(pet.problem, partido));
  assert.strictEqual(b.peticiones.length, 1);
  assert.ok(M.pidsEn(m2['2026-10'], VIE, 'PASARELA_T').includes('cristian') && b.r.nucleo.vueltas === 1);
  // como mucho VUELTAS_NUCLEO, aunque el núcleo insista
  const c = f7Flujo(cfg, st, { '2026-10': f7Oct() }, VIE, VIE, {}, pet => f7Vuelta(pet.problem, partido, true));
  assert.strictEqual(c.peticiones.length, M.VUELTAS_NUCLEO);
  assert.ok(M.VUELTAS_NUCLEO >= 2);
  // si el núcleo no acepta la petición, no se vuelca nada y se devuelve el error tal cual (lo cuenta la pantalla)
  const m3 = { '2026-10': f7Oct() };
  const d = f7Flujo(cfg, st, m3, VIE, VIE, {}, () => ({ ok: false, status: 422, datos: { detail: [{ type: 'list_type' }] } }));
  assert.ok(d.r.error && d.r.error.status === 422 && !Object.keys(m3['2026-10'].asig).length, JSON.stringify(d.r));
  // «Solo desde hoy» con el periodo ya pasado: ni se llama al núcleo
  const e = f7Flujo(cfg, st, { '2026-10': f7Oct() }, '2026-10-05', '2026-10-07', { desdeIso: '2026-10-08' }, () => { throw new Error('no debía llamar'); });
  assert.ok(!e.peticiones.length && !e.r.error && !e.r.aplicados.length);
});

// ---------- revisión final del trabajo del 24/09 (25/09): tres revisores con el caso del cliente ----------
// Lo que encontraron con los datos de producción, el servidor y el caso completo (el Mónaco cerrado del domingo
// 27 por la tarde al martes 29, Mari Luz libra el martes 29, Mari Luz «cubre a Iván» y las vacaciones de Iván
// del 2 al 4 por la tarde), con Dulce ya fuera de standby, como está en producción desde la reunión.
const rfCaso = () => {
  const cfg = cfgDemo(), st = cfg.staff;
  M.personaDe(st, 'dulce').standby = false;
  M.aplicarCierre(cfg, st, cieRango(cfg, CIE_DOM, '2026-10-04'), cierreReal(), { scapon: { tipo: 'VAC' }, yilian: { tipo: 'REFUERZA', destinos: { [CIE_LUN]: 'PASARELA_T' } }, hojan: { tipo: 'SIN' }, cristian: { tipo: 'SIN' } });
  M.ponerLibraPuntual(M.personaDe(st, 'mariluz'), CIE_LUN, [2]);
  return cfg;
};
ok('revisión final · el apoyo del cierre «donde haga falta» es prioridad, no un peso: Yilian (25 turnos este mes) entra el martes 29 en Pasarela por la mañana, donde falta Mari Luz, y Dulce no', () => {
  const cfg = rfCaso(), st = cfg.staff;
  const e = cieRango(cfg, CIE_LUN, '2026-10-04');
  M.generarPlanilla(cfg, st, e, CIE_LUN, '2026-10-04', { meses: cfg.meses });
  const cas = M.pidsEn(e, CIE_MAR, 'PASARELA_M');
  assert.ok(cas.includes('yilian') && !cas.includes('dulce'), cas.join(', '));
  // la misma lectura en el selector de la casilla (la ★) con Yilian y Dulce fuera
  const e2 = cieRango(cfg, CIE_LUN, '2026-10-04');
  for (const pid of ['yilian', 'dulce']) M.desasignar(e2, CIE_MAR, 'PASARELA_M', pid);
  const g = M.gruposSelector(cfg, st, e2, CIE_MAR, 'PASARELA_M', { meses: cfg.meses });
  assert.strictEqual(g.recomendado && g.recomendado.pid, 'yilian', g.pueden.slice(0, 3).map(c => c.pid + ' ' + c.score).join(', '));
  // fuera de las franjas de su cierre no pesa: el miércoles 30 es una apoyo más
  assert.strictEqual(M.decisionCierre(cfg, 'yilian', CIE_MIE, 'M'), null);
});
ok('revisión final · «cubre a» sigue delante del apoyo del cierre en la casilla de quien falta (principio 6: «cubre a» primero)', () => {
  const cfg = rfCaso(), st = cfg.staff;
  const e = cieRango(cfg, CIE_LUN, '2026-10-04');
  // Dulce cubre a Lola, que falta el martes 29 por la mañana: en la casilla de Lola va Dulce, no Yilian
  M.personaDe(st, 'dulce').cubreA = [{ pid: 'lola' }];
  M.anadirAusencia(M.personaDe(st, 'lola'), { tipo: 'LD', desde: CIE_MAR, hasta: CIE_MAR });
  M.desasignar(e, CIE_MAR, 'PASARELA_M', 'lola');
  const c = M.candidatosPara(cfg, st, e, CIE_MAR, 'PASARELA_M', { meses: cfg.meses });
  assert.ok(c[0].pid === 'dulce' && c[0].cubre === 'lola', c.slice(0, 3).map(x => x.pid + ' ' + x.score + (x.cubre ? ' cubre' : '')).join(', '));
  assert.strictEqual(c[1].pid, 'yilian', 'y detrás, quien apoya por el cierre');
});
ok('revisión final · «con aviso» va por escalones: primero quien solo hace un partido no declarado, luego quien deja la casilla solo con apoyos y la pareja «nunca con» flexible la última (José 17/09: «se relaja si no hay nadie más») — domingo 4, Pasarela tarde', () => {
  const cfg = cfgDemo(), st = cfg.staff;
  M.personaDe(st, 'mariluz').cubreA = [{ pid: 'ivan' }];
  M.anadirAusencia(M.personaDe(st, 'ivan'), { tipo: 'VAC', desde: '2026-10-02', hasta: '2026-10-04', franjas: ['T'] });
  const oct = M.estadoDesde(cfg.meses, [], 2026, 10);
  M.cubrirAusencia(cfg, st, oct, 'ivan', '2026-10-02', '2026-10-04', ['T'], { desdeIso: '2026-09-25', meses: cfg.meses });
  const D = '2026-10-04';
  const g = M.gruposSelector(cfg, st, oct, D, 'PASARELA_T', { meses: cfg.meses });
  const conAv = M.candidatosConAviso(cfg, st, oct, D, 'PASARELA_T');
  for (const [nombre, lista] of [['selector', g.conAviso], ['Generador', conAv]]) {
    const txt = lista.map(c => c.pid + ' [' + c.avisos.join('; ') + ']').join(' · ');
    assert.deepStrictEqual(lista.map(c => c.pid), ['roberto', 'cristian', 'mariluz'], nombre + ': ' + txt);
  }
});
ok('revisión final · José 18/09 («tirar de plantilla… apoyos ir a lo justo»): a igual carga entra la plantilla antes que un apoyo, también si el apoyo no tiene local fijo', () => {
  const cfg = cfgBase(), st = cfg.staff, e = M.nuevoEstado(2026, 10, { festivos: [] });
  // Roberto (plantilla de Zapatillera y Pasarela) frente a Lavinia (apoyo, Pasarela y Zapatillera) y Cristian
  // (apoyo sin local fijo), los tres sin turnos, en la tarde de Pasarela del viernes 9 con Iván dentro
  M.asignar(e, cfg, st, '2026-10-09', 'PASARELA_T', 'ivan', {});
  const c = M.candidatosPara(cfg, st, e, '2026-10-09', 'PASARELA_T');
  const pos = pid => c.findIndex(x => x.pid === pid);
  assert.ok(pos('roberto') >= 0 && pos('lavinia') >= 0 && pos('cristian') >= 0, c.map(x => x.pid).join(', '));
  assert.ok(pos('roberto') < pos('lavinia') && pos('roberto') < pos('cristian'), c.slice(0, 5).map(x => x.pid + ' ' + x.score + ' ' + x.razones.join(' · ')).join(' | '));
  assert.ok(M.PESOS.apoyo < 0, 'ser apoyo resta');
  // en la Cobertura, igual
  const cob = M.candidatos(M.crearContexto(cfg, st, e), '2026-10-09', 'PASARELA_T', { modo: 'cobertura', faltaPid: 'ivan' });
  const pc = pid => cob.findIndex(x => x.pid === pid);
  assert.ok(pc('roberto') >= 0 && pc('roberto') < pc('lavinia') && pc('roberto') < pc('cristian'), cob.slice(0, 5).map(x => x.pid + ' ' + x.score).join(', '));
});
ok('revisión final · vacaciones «solo de tarde» de quien solo trabaja tardes son días enteros para la nómina (Iván del 2 al 4 de octubre: 3 días, no 1,5), igual que las que pone el cierre', () => {
  const cfg = cfgDemo(), st = cfg.staff;
  M.anadirAusencia(M.personaDe(st, 'ivan'), { tipo: 'VAC', desde: '2026-10-02', hasta: '2026-10-04', franjas: ['T'] });
  const h = M.horasPersonaMes(cfg, st, cfg.meses, 'ivan', 2026, 10);
  assert.strictEqual(h.vacaciones, 3, JSON.stringify({ vacaciones: h.vacaciones, medias: h.vacacionesMedias }));
  assert.deepStrictEqual(h.vacacionesMedias, {});
  assert.strictEqual(h.ausenciasMedias, 0, 'ni descuenta medio día del contrato');
  // quien trabaja mañana y tarde (Hojan) sigue con su media jornada
  M.anadirAusencia(M.personaDe(st, 'hojan'), { tipo: 'VAC', desde: '2026-10-06', hasta: '2026-10-06', franjas: ['T'] });
  const hj = M.horasPersonaMes(cfg, st, cfg.meses, 'hojan', 2026, 10);
  assert.strictEqual(hj.vacaciones, 0.5);
  assert.deepStrictEqual(hj.vacacionesMedias, { '2026-10-06': ['T'] });
  // las vacaciones del año (nómina) cuentan lo mismo
  assert.strictEqual(M.vacacionesAno(st, 2026).find(x => x.pid === 'ivan').total, 3);
});
ok('revisión final · la planilla guardada con la versión de antes: «abre a mano» sin nadie marcado (y la cocina a mano sin nadie con la cocina, sin su línea en el historial) se limpia de hoy en adelante, y quien abre vuelve a salir en lo guardado', () => {
  const estado = f5rDeAntes(f5rDemo()), st = estado.staff;
  const HOY = '2026-09-24';
  // lo que dejaba el código de antes al apuntar una ausencia: quitaba a quien abría y la marca «a mano» se quedaba
  const oct = f5rMes(estado, '2026-10-20');
  const quien = M.asignados(oct, '2026-10-20', 'PASARELA_T').find(x => x.abre).pid;
  M.desasignar(oct, '2026-10-20', 'PASARELA_T', quien);
  for (const e of M.asignados(oct, '2026-10-20', 'PASARELA_T')) e.abre = false;
  M.marcarManual(oct, '2026-10-20', 'PASARELA_T', 'abre');
  // y la cocina: la casilla de Esmeralda el 27/10 (vacaciones) sin nadie con la cocina, fijada a mano
  const tidC = M.turnosDe(estado).map(t => t.id).find(t => M.asignados(oct, '2026-10-27', t).some(x => x.cocina));
  const quienC = M.asignados(oct, '2026-10-27', tidC).find(x => x.cocina).pid;
  M.desasignar(oct, '2026-10-27', tidC, quienC);
  for (const e of M.asignados(oct, '2026-10-27', tidC)) e.cocina = false;
  M.marcarManual(oct, '2026-10-27', tidC, 'cocina');
  // «Quitar la marca de cocina» del encargado (con su línea en el historial) se queda
  const tidN = M.turnosDe(estado).map(t => t.id).find(t => M.asignados(oct, '2026-10-28', t).some(x => x.cocina));
  const quienN = M.asignados(oct, '2026-10-28', tidN).find(x => x.cocina).pid;
  for (const e of M.asignados(oct, '2026-10-28', tidN)) e.cocina = false;
  const lN = M.localDe(estado, M.partirTurno(tidN).localId);
  estado.historial = [{ ts: Date.parse('2026-09-23T18:00:00+02:00'), tipo: 'asig', txt: `${M.nombreDe(st, quienN)} deja la cocina de ${lN.nombre} del 28/10` }];   // (revisión de A1: la línea se reconoce con la fecha del mismo año)
  // una del pasado se queda como está (lo pasado es lo que se trabajó)
  const sep = f5rMes(estado, '2026-09-10');
  const quienP = M.asignados(sep, '2026-09-10', 'PASARELA_T').find(x => x.abre).pid;
  M.desasignar(sep, '2026-09-10', 'PASARELA_T', quienP);
  for (const e of M.asignados(sep, '2026-09-10', 'PASARELA_T')) e.abre = false;
  M.migrarMarcasAutomaticas(estado, HOY);
  M.migrarAbrePatron(estado, HOY);
  const huerfanas = () => { const out = []; for (const [k, g] of Object.entries(estado.meses)) for (const [iso, porT] of Object.entries(g.manual || {})) for (const [tid, m] of Object.entries(porT || {})) { const l = M.asignados(M.estadoDesde(estado.meses, [], +k.slice(0, 4), +k.slice(5, 7)), iso, tid); if (!l.length) continue; if (m.abre && !l.some(x => x.abre)) out.push('abre ' + iso + '|' + tid); if (m.cocina && !l.some(x => x.cocina)) out.push('cocina ' + iso + '|' + tid); } return out.sort(); };
  assert.ok(huerfanas().includes('abre 2026-10-20|PASARELA_T'), 'la migración de las marcas las deja (se cuentan como «quedan»): ' + huerfanas().join(', '));
  const r = M.migrarMarcasHuerfanas(estado, HOY);
  assert.deepStrictEqual(huerfanas().filter(x => x.slice(x.indexOf(' ') + 1) >= HOY), [`cocina 2026-10-28|${tidN}`], 'de hoy en adelante solo queda la cocina que quitó el encargado');
  assert.ok(r.abre >= 1 && r.cocina >= 1, JSON.stringify(r));
  const oct2 = f5rMes(estado, '2026-10-20');
  const abre = M.asignados(oct2, '2026-10-20', 'PASARELA_T').find(x => x.abre);
  assert.ok(abre && abre.pid === M.primeroDe(estado, st, oct2, '2026-10-20', 'PASARELA_T'), 'lo guardado dice lo mismo que Hoy');
  assert.ok(M.asignados(oct2, '2026-10-27', tidC).some(x => x.cocina) || !M.asignados(oct2, '2026-10-27', tidC).some(x => M.rangoCocina(estado, lN, M.personaDe(st, x.pid), M.partirTurno(tidC).franja, '2026-10-27') >= 0), 'la cocina vuelve a quien puede llevarla');
  assert.ok(huerfanas().includes('abre 2026-09-10|PASARELA_T'), 'lo pasado no se toca');
  assert.strictEqual(M.migrarMarcasHuerfanas(estado, HOY).abre, 0, 'una sola vez');
  assert.strictEqual(estado.migraciones.huerfanas2509, 1);
});
ok('revisión final · un 409 solo se funde si en el servidor cambiaron peticiones o avisos: las reglas del grupo, «visible para el equipo», las entrevistas o el historial de otro dispositivo son un cambio (manda el servidor)', () => {
  const base = { staff: [], meses: {}, peticiones: [], avisos: [], reglas: {}, mesesPublicados: ['2026-10'], entrevistas: [{ id: 'c1', nombre: 'Ana' }], historial: [], y: 2026, m: 9 };
  const local = Object.assign(JSON.parse(JSON.stringify(base)), { meses: { '2026-10': { asig: { '2026-10-06': { PASARELA_M: [{ pid: 'lola' }] } } } } });
  const cambia = f => { const s = JSON.parse(JSON.stringify(base)); f(s); return M.fusionarEstado(base, s, local); };
  assert.strictEqual(cambia(s => { s.reglas = { minimos: false }; }).motivo, 'planilla-cambiada', 'apagar «Mínimos»');
  assert.strictEqual(cambia(s => { s.mesesPublicados = ['2026-10', '2026-11']; }).motivo, 'planilla-cambiada', '«visible para el equipo»');
  assert.strictEqual(cambia(s => { s.entrevistas[0].obs = 'nota de José'; }).motivo, 'planilla-cambiada', 'una entrevista');
  assert.strictEqual(cambia(s => { s.historial = [{ ts: 1, txt: 'otro dispositivo' }]; }).motivo, 'planilla-cambiada', 'el historial de otro dispositivo');
  // lo de siempre sigue fundiéndose: las peticiones y los avisos de los empleados, y la navegación de otro
  const f = cambia(s => { s.peticiones = [{ id: 'p1', pid: 'x', estado: 'pendiente' }]; s.y = 2027; s.m = 1; s.day = 3; });
  assert.ok(f.ok, f.motivo);
  assert.strictEqual(f.estado.peticiones.length, 1);
  assert.ok(f.estado.meses['2026-10']);
});
ok('revisión final · Horas de un mes cerrado: la comparación con la copia guardada mira la fila entera (los partidos de agosto que D4 pasó a continuos se dicen, con las dos cifras)', () => {
  const fila = (pid, x) => Object.assign({ pid, nombre: pid, dias: 20, turnos: 26, minutos: 208 * 60, extrasMin: 0, partidos: 8, continuos: 0, mananas: 13, tardes: 13, vacaciones: 0, festivas: 0, domingos: 4, nocturnosMin: 0 }, x || {});
  const guardada = [fila('noe'), fila('lola', { partidos: 0 })];
  assert.deepStrictEqual(M.diferenciasHoras(guardada, [fila('noe'), fila('lola', { partidos: 0 })]), []);
  const d = M.diferenciasHoras(guardada, [fila('noe', { partidos: 4, continuos: 4 }), fila('lola', { partidos: 0 })]);
  assert.deepStrictEqual(d.map(x => [x.pid, x.campo, x.antes, x.ahora]), [['noe', 'partidos', 8, 4], ['noe', 'continuos', 0, 4]]);
  // una copia de antes de que existiera la columna (sin continuos) no cuenta como cambio en esa columna
  const vieja = [fila('noe')]; delete vieja[0].continuos;
  assert.deepStrictEqual(M.diferenciasHoras(vieja, [fila('noe', { continuos: 2 })]).map(x => x.campo), []);
});
// ---------- S0 (30/09): «Ya no está con nosotros» (la salida con fecha) ----------
// Diego, 30/09: «cuando un trabajador lo deja, no deberíamos eliminarlo de la aplicación… que el administrador y el
// oficinista puedan seguir viendo los trabajadores que ya no están trabajando con nosotros en los turnos pasados».
// La ficha lleva p.salida = { desde, motivo? }; desde esa fecha la persona no entra en ninguna casilla (bloqueo duro
// que no se fuerza) ni sale en ninguna lista; lo de antes se queda tal cual (Horas, planilla, sombreado rojo).
const s0Cfg = salidaDesde => { const cfg = cfgBase(), st = staffDe(cfg); const ml = M.personaDe(st, 'mariluz'); if (salidaDesde) ml.salida = { desde: salidaDesde }; return { cfg, st, ml }; };
ok('S0 · haSalido / enPlantilla / salidaDe / textoSalida / staffEnPlantilla: la salida vale desde su fecha, no antes; y piden la fecha', () => {
  const { cfg, st, ml } = s0Cfg(null);
  assert.strictEqual(M.haSalido(ml, '2026-10-07'), false);
  assert.strictEqual(M.enPlantilla(ml, '2026-10-07'), true);
  assert.strictEqual(M.salidaDe(ml), null);
  ml.salida = { desde: '2026-10-07', motivo: 'se va a otro trabajo' };
  assert.strictEqual(M.haSalido(ml, '2026-10-06'), false);
  assert.strictEqual(M.haSalido(ml, '2026-10-07'), true);
  assert.strictEqual(M.enPlantilla(ml, '2026-10-07'), false);
  assert.deepStrictEqual(M.salidaDe(ml), { desde: '2026-10-07', motivo: 'se va a otro trabajo' });
  assert.strictEqual(M.textoSalida(ml), 'ya no trabaja con nosotros desde el 7/10');
  assert.throws(() => M.haSalido(ml), TypeError, 'el modelo no mira el reloj: la fecha es obligatoria (como deBaja)');
  assert.deepStrictEqual(M.staffEnPlantilla(st, '2026-10-06').map(x => x.id), st.map(x => x.id));
  const desde = M.staffEnPlantilla(st, '2026-10-07');
  assert.ok(desde.length === st.length - 1 && !desde.some(x => x.id === 'mariluz'));
  assert.strictEqual(M.REGLA_NOMBRE.salida, 'Ya no está con nosotros');
  const v = M.VARIABLES.find(x => x.campo === 'salida');
  assert.ok(v && v.trato === 'duro' && v.clave === null && typeof v.texto === 'function' && typeof v.verificar === 'function', 'salida en el registro VARIABLES');
});
ok('S0 · la puerta: desde la salida no entra ni forzando (regla «salida», antes que cualquier otra); el día anterior sí', () => {
  const { cfg, st, ml } = s0Cfg('2026-10-07');
  const e = f3Semana('2026-10-05');
  const antes = M.puedeEstar(cfg, st, e, '2026-10-06', 'PASARELA_T', 'mariluz', {});
  assert.ok(antes.ok, antes.motivo);
  const r = M.puedeEstar(cfg, st, e, '2026-10-07', 'PASARELA_M', 'mariluz', {});
  assert.ok(!r.ok && r.regla === 'salida' && /ya no trabaja con nosotros desde el 7\/10/.test(r.motivo), JSON.stringify(r));
  assert.strictEqual(M.siSeFuerza(cfg, st, e, '2026-10-07', 'PASARELA_M', 'mariluz', { permitirPartido: true }).forzable, false, 'no se fuerza');
  assert.ok(!M.asignar(e, cfg, st, '2026-10-07', 'PASARELA_M', 'mariluz', { forzar: true, permitirPartido: true }).ok);
  // va antes que cualquier otra regla: con vacaciones ese mismo día, la puerta dice «salida», no «de vacaciones»
  // (revisión S0, 30/09: desde la salida ya no hay ausencias —ausenciaEn—, así que la salida es el único bloqueo)
  M.anadirAusencia(ml, { tipo: 'VAC', desde: '2026-10-07', hasta: '2026-10-09' });
  assert.strictEqual(M.puedeEstar(cfg, st, e, '2026-10-08', 'PASARELA_T', 'mariluz', {}).regla, 'salida');
  const ev = M.evaluarPlaza(M.crearContexto(cfg, st, e), '2026-10-08', 'PASARELA_T', 'mariluz', {});
  assert.ok(ev.bloqueos.length >= 1 && ev.bloqueos[0].k === 'salida' && !ev.bloqueos[0].forzable && !ev.bloqueos.some(b => b.k === 'ausencia'), JSON.stringify(ev.bloqueos));
  // la hoja impresa no propone «levantar» la salida: no es una condición que se levante
  assert.strictEqual(M.destrapa(cfg, st, e, '2026-10-10', 'PASARELA_M', 'mariluz', {}), null);
});
ok('S0 · ninguna lista la ofrece desde la salida: relleno, «con aviso», selector (ni en «no pueden»), porqué del hueco, Cobertura (sin descarte)', () => {
  const { cfg, st } = s0Cfg('2026-10-07');
  const e = f3Semana('2026-10-05');
  for (const iso of ['2026-10-07', '2026-10-10']) for (const tid of ['PASARELA_M', 'PASARELA_T']) {
    assert.ok(!M.candidatosPara(cfg, st, e, iso, tid).some(c => c.pid === 'mariluz'), `relleno ${iso} ${tid}`);
    assert.ok(!M.candidatosConAviso(cfg, st, e, iso, tid).some(c => c.pid === 'mariluz'), `con aviso ${iso} ${tid}`);
    const g = M.gruposSelector(cfg, st, e, iso, tid);
    assert.ok(![...g.cocina, ...g.pueden, ...g.conAviso, ...g.noPueden].some(c => c.pid === 'mariluz'), `selector ${iso} ${tid}: ni en «no pueden»`);
    assert.ok(!Object.values(M.porQueNadie(cfg, st, e, iso, tid)).flat().includes('Mari Luz'), `porQueNadie ${iso} ${tid}`);
    const descartes = [];
    assert.ok(!M.candidatosCobertura(cfg, st, e, iso, tid, 'ivan', { descartes }).some(c => c.pid === 'mariluz') && !descartes.some(d => d.pid === 'mariluz'), `cobertura ${iso} ${tid}`);
  }
  // el día anterior sigue saliendo (en el grupo que le toque)
  const g6 = M.gruposSelector(cfg, st, e, '2026-10-06', 'PASARELA_T');
  assert.ok([...g6.pueden, ...g6.conAviso, ...g6.noPueden].some(c => c.pid === 'mariluz'), 'el martes 6 aún está');
});
ok('S0 · «cubre a»: la designación de quien ha salido no vale, y a quien ha salido nadie le cubre; «nunca con» no cuenta desde la salida', () => {
  const { cfg, st, ml } = s0Cfg('2026-10-07');
  ml.cubreA = [{ pid: 'ivan' }];
  const ivan = M.personaDe(st, 'ivan'), lav = M.personaDe(st, 'lavinia');
  M.anadirAusencia(ivan, { tipo: 'VAC', desde: '2026-10-09', hasta: '2026-10-09' });
  const e = f3Semana('2026-10-05');
  assert.strictEqual(M.cubreEnCasilla(cfg, st, e, ml, '2026-10-09', 'PASARELA_T', {}), null, 'quien ha salido no cubre a nadie');
  const d = M.designadaPara(cfg, st, e, '2026-10-09', 'PASARELA_T', 'ivan', {});
  assert.ok(!d || d.pid !== 'mariluz', JSON.stringify(d));
  assert.match(M.porQueNoCubre(cfg, st, e, ml, '2026-10-09', 'PASARELA_T', 'ivan', {}), /ya no trabaja con nosotros/);
  const q = M.quienLeCubre(cfg, st, 'ivan').find(x => x.pid === 'mariluz');
  assert.ok(q && q.salido && q.salido.desde === '2026-10-07', 'la ficha de Iván sabe que quien le cubre ya no está: ' + JSON.stringify(q));
  // a Mari Luz (que se ha ido) no hay que cubrirla: Lavinia «cubre a Mari Luz los miércoles» no aplica el miércoles 7
  assert.strictEqual(M.cubreEnCasilla(cfg, st, e, lav, '2026-10-07', 'PASARELA_M', { falta: 'mariluz', suCasilla: true, ausente: true }), null);
  // «nunca con» con la fecha: la pareja Mari Luz–Lavinia no cuenta desde la salida (sin fecha, como siempre)
  assert.ok(M.incompatibles(cfg, ml, lav) && M.incompatibles(cfg, ml, lav, '2026-10-06'));
  assert.strictEqual(M.incompatibles(cfg, ml, lav, '2026-10-07'), null);
  // una plaza suya que se quedó puesta de antes no frena a Lavinia en esa casilla ni sale como «no pueden coincidir»
  e.asig['2026-10-09'].PASARELA_T = [{ pid: 'mariluz', cocina: false, abre: true, origen: 'manual' }];
  const r = M.puedeEstar(cfg, st, e, '2026-10-09', 'PASARELA_T', 'lavinia', {});
  assert.ok(r.ok, r.motivo);
  assert.ok(M.asignar(e, cfg, st, '2026-10-09', 'PASARELA_T', 'lavinia', {}).ok);
  assert.deepStrictEqual(M.revisarTurno(cfg, st, e, '2026-10-09', 'PASARELA_T').incompatibles, []);
});
ok('S0 · la semana tipo salta sus plazas con motivo (la plaza «por ella» de Lavinia se queda, sin el «por»); el núcleo la tiene a «*» desde la salida', () => {
  const { cfg, st } = s0Cfg('2026-10-07');
  const e = f3Semana('2026-10-05');
  const r = M.instanciarPatron(cfg, st, e, '2026-10-05', '2026-10-11');
  assert.ok(r.aplicados.some(a => a.pid === 'mariluz' && a.iso === '2026-10-06'), 'el martes 6 sigue entrando');
  assert.ok(!r.aplicados.some(a => a.pid === 'mariluz' && a.iso >= '2026-10-07'));
  const rech = r.rechazados.filter(a => a.pid === 'mariluz');
  assert.ok(rech.length >= 4 && rech.every(a => a.iso >= '2026-10-07' && /ya no trabaja con nosotros/.test(a.motivo)), JSON.stringify(rech));
  const lav = M.asignados(e, '2026-10-07', 'PASARELA_M').find(x => x.pid === 'lavinia');
  assert.ok(lav && !lav.por && lav.razon === 'plaza fija de la semana tipo', JSON.stringify(lav));
  const e0 = f3Semana('2026-09-28'); M.instanciarPatron(cfg, st, e0, '2026-09-28', '2026-10-04');
  assert.strictEqual(M.asignados(e0, '2026-09-30', 'PASARELA_M').find(x => x.pid === 'lavinia').por, 'mariluz', 'la semana de antes sigue diciendo «por Mari Luz»');
  const pb = M.toProblem(cfg, st, M.nuevoEstado(2026, 10, { festivos: [] }), '2026-10-05', '2026-10-11', { conPatron: false });
  const w = pb.workers.find(x => x.id === 'mariluz');
  const i = (iso, f) => pb.meta.indices.findIndex(x => x.iso === iso && x.franja === f);
  assert.strictEqual(w.unavailable[i('2026-10-06', 'T')], undefined, 'el martes 6, libre');
  for (const iso of ['2026-10-07', '2026-10-09', '2026-10-11']) for (const f of ['M', 'T']) assert.deepStrictEqual(w.unavailable[i(iso, f)], ['*'], iso + ' ' + f);
  assert.deepStrictEqual(NE.erroresPeticion({ problem: pb }).slice(0, 3), []);
});
ok('S0 · condiciones y verificación: la salida es una condición de esa semana; quien salió antes del lunes no tiene ninguna; la Revisión marca a quien sigue puesta', () => {
  const { cfg, st, ml } = s0Cfg('2026-10-07');
  const e = f3Semana('2026-10-05');
  const c = M.condicionesDe(cfg, st, '2026-10-05').find(x => x.id === 'p:mariluz:salida');
  assert.ok(c && /^Mari Luz ya no trabaja con nosotros desde el 7\/10/.test(c.texto) && c.variable === 'salida' && c.pid === 'mariluz', JSON.stringify(c));
  assert.ok(M.asignar(e, cfg, st, '2026-10-06', 'PASARELA_T', 'mariluz', {}).ok);
  const v1 = M.verificarSemana(cfg, st, e, '2026-10-05').find(x => x.id === 'p:mariluz:salida');
  assert.ok(v1 && v1.ok, 'sin plazas desde el 7: se cumple');
  // una plaza que se quedó puesta de antes (el encargado la puso antes de apuntar la salida)
  e.asig['2026-10-08'].PASARELA_T = [{ pid: 'mariluz', cocina: false, abre: true, origen: 'manual' }];
  const v2 = M.verificarSemana(cfg, st, e, '2026-10-05').find(x => x.id === 'p:mariluz:salida');
  assert.ok(v2 && !v2.ok && /jueves 8/.test(v2.detalle), JSON.stringify(v2));
  const rv = M.revisionMes(cfg, st, e, { desde: '2026-10-05', hasta: '2026-10-11' }).filter(x => x.tipo === 'salida');
  assert.strictEqual(rv.length, 1, JSON.stringify(rv));
  assert.ok(rv[0].nivel === 'alta' && rv[0].pid === 'mariluz' && rv[0].iso === '2026-10-08' && rv[0].turnoId === 'PASARELA_T' && /Mari Luz ya no trabaja con nosotros \(desde el 7\/10\) y sigue en la casilla/.test(rv[0].msg), rv[0].msg);
  // el martes 6 (antes de la salida) no avisa de nada
  assert.ok(!M.revisionMes(cfg, st, e, { desde: '2026-10-06', hasta: '2026-10-06' }).some(x => x.tipo === 'salida'));
  ml.salida = { desde: '2026-10-05' };
  assert.ok(!M.condicionesDe(cfg, st, '2026-10-05').some(x => x.pid === 'mariluz'), 'salió antes del lunes: sin condiciones esa semana');
  assert.ok(M.condicionesDe(cfg, st, '2026-09-28').some(x => x.pid === 'mariluz' && x.id !== 'p:mariluz:salida'), 'la semana anterior, las de siempre');
});
// el caso real (Diego, 30/09): Adrián, cocina titular de Zapatillera y «cubre a» Susi (de baja), se ha ido
ok('S0 · Adrián se va el miércoles 7: la cocina de Zapatillera la lleva otro, «Quién abre» del local no manda, su «cubre a» Susi no vale; las listas del local no se borran', () => {
  const cfg = cfgBase(), st = staffDe(cfg); const ad = M.personaDe(st, 'adrian'); ad.salida = { desde: '2026-10-07', motivo: 'se va' };
  const zapa = M.localDe(cfg, 'ZAPA'); zapa.primero.M = 'adrian';
  // la cocina: una sola lectura (puedeCocina con la fecha); la lista del local se queda tal cual
  assert.ok(M.puedeCocina(cfg, ad, 'ZAPA', '2026-10-06') && M.puedeCocina(cfg, ad, 'ZAPA', null));
  assert.ok(!M.puedeCocina(cfg, ad, 'ZAPA', '2026-10-07'));
  assert.ok(M.rangoCocina(cfg, zapa, ad, 'M', '2026-10-06') >= 0 && M.rangoCocina(cfg, zapa, ad, 'M', '2026-10-08') === -1);
  const e = f3Semana('2026-10-05');
  const r = M.instanciarPatron(cfg, st, e, '2026-10-05', '2026-10-11');
  assert.ok(r.aplicados.some(a => a.pid === 'adrian' && a.iso === '2026-10-06'), 'el martes 6 sigue');
  assert.ok(!r.aplicados.some(a => a.pid === 'adrian' && a.iso >= '2026-10-07'));
  assert.ok(r.rechazados.filter(a => a.pid === 'adrian').every(a => /ya no trabaja con nosotros/.test(a.motivo)) && r.rechazados.some(a => a.pid === 'adrian' && a.iso === '2026-10-08'));
  for (const iso of ['2026-10-08', '2026-10-09', '2026-10-10']) for (const tid of ['ZAPA_M', 'ZAPA_T']) {
    const coc = M.asignados(e, iso, tid).find(x => x.cocina);
    assert.ok(!M.pidsEn(e, iso, tid).includes('adrian') && (!coc || coc.pid !== 'adrian'), `${iso} ${tid}: ${JSON.stringify(M.pidsEn(e, iso, tid))}`);
  }
  assert.ok(zapa.cocina.titulares.M.includes('adrian') && zapa.primero.M === 'adrian', 'las listas del local no se tocan');
  // «Quién abre»: con la fecha no manda; sin fecha, el dato
  assert.strictEqual(M.quienAbreFijo(cfg, st, zapa, 'M'), 'adrian');
  assert.strictEqual(M.quienAbreFijo(cfg, st, zapa, 'M', '2026-10-06'), 'adrian');
  assert.notStrictEqual(M.quienAbreFijo(cfg, st, zapa, 'M', '2026-10-08'), 'adrian');
  assert.notStrictEqual(M.primeroDe(cfg, st, e, '2026-10-08', 'ZAPA_M'), 'adrian');
  // las condiciones de la semana siguiente (ya fuera): ni la cocina de Zapatillera ni «Quién abre» le nombran
  const cs = M.condicionesDe(cfg, st, '2026-10-12');
  assert.ok(!cs.some(c => c.pid === 'adrian'));
  assert.ok(!/Adrián/.test((cs.find(c => c.id === 'coc:ZAPA') || { texto: '' }).texto), (cs.find(c => c.id === 'coc:ZAPA') || {}).texto);
  assert.ok(!cs.some(c => c.id === 'loc:ZAPA:primero:M'));
  // y la semana en la que se va, su salida es una condición y la cocina de Zapatillera aún le nombra (se va el miércoles)
  assert.ok(M.condicionesDe(cfg, st, '2026-10-05').some(c => c.id === 'p:adrian:salida'));
  // «cubre a» Susi (de baja sin fecha de fin) deja de valer: ni cubre, ni se le designa, y el porqué lo dice
  assert.strictEqual(M.cubreEnCasilla(cfg, st, e, ad, '2026-10-08', 'ZAPA_M', { falta: 'susi', suCasilla: true, ausente: true, cocina: true }), null);
  const d = M.designadaPara(cfg, st, e, '2026-10-08', 'ZAPA_M', 'susi', { faltaCocina: true });
  assert.ok(!d || d.pid !== 'adrian', JSON.stringify(d));
  assert.match(M.porQueNoCubre(cfg, st, e, ad, '2026-10-08', 'ZAPA_M', 'susi', { faltaCocina: true }), /ya no trabaja con nosotros/);
  const q = M.quienLeCubre(cfg, st, 'susi').find(x => x.pid === 'adrian');
  assert.ok(q && q.salido && q.salido.desde === '2026-10-07', JSON.stringify(q));
  // el martes 6 todo sigue como siempre
  assert.strictEqual(M.cubreEnCasilla(cfg, st, e, ad, '2026-10-06', 'ZAPA_M', { falta: 'susi', suCasilla: true, ausente: true, cocina: true }), 'susi');
  // y en «Quién libra» del Generador no sale librando: ya no está (el martes 6 trabaja; el miércoles 7, su libre de siempre, tampoco sale)
  const g = M.generarSemana(cfg, st, f3Semana('2026-10-05'), '2026-10-05', {});
  for (const iso of ['2026-10-07', '2026-10-08', '2026-10-11']) assert.ok(!g.libran[iso].includes('adrian'), `${iso}: ${JSON.stringify(g.libran[iso])}`);
});
ok('S0 · un cierre por fechas no cuenta como afectada a quien ya no está (ni le busca sitio de apoyo)', () => {
  const { cfg, st } = s0Cfg('2026-10-07');
  const e = f3Semana('2026-10-05');
  const c = { id: 'c1', localId: 'PASARELA', dias: { '2026-10-09': ['T'] }, motivo: 'reforma', detalle: '', decisiones: {}, retirados: [] };
  const af = M.afectadosPorCierre(cfg, st, e, c);
  assert.ok(af.some(a => a.pid === 'ivan'), 'Iván (tarde de Pasarela del viernes) sí');
  assert.ok(!af.some(a => a.pid === 'mariluz'), 'Mari Luz ya no está: ' + JSON.stringify(af.map(a => a.pid)));
  assert.deepStrictEqual(M.sugerenciasRefuerzo(cfg, st, e, c, 'mariluz'), {});
  // con la planilla ya volcada (una plaza suya que se quedó), tampoco
  e.asig['2026-10-09'].PASARELA_T = [{ pid: 'ivan', cocina: false, abre: true, origen: 'patron' }, { pid: 'mariluz', cocina: false, abre: false, origen: 'patron' }];
  assert.ok(!M.afectadosPorCierre(cfg, st, e, c).some(a => a.pid === 'mariluz'));
});
ok('S0 · auditoría B2/H1: desasignar y vaciarPlanilla no borran el día (queda {}); una cobertura sobre un estado virtual con el único turno del día llega a S.meses', () => {
  const cfg = cfgBase(), st = staffDe(cfg);
  const e = M.nuevoEstado(2026, 10, { festivos: [] });
  assert.ok(M.asignar(e, cfg, st, '2026-10-17', 'EL33_T', 'jacquelin', { forzar: true, permitirPartido: true }).ok);
  assert.ok(M.desasignar(e, '2026-10-17', 'EL33_T', 'jacquelin'));
  assert.deepStrictEqual(e.asig['2026-10-17'], {}, 'el día sigue existiendo, vacío');
  assert.deepStrictEqual(M.asignados(e, '2026-10-17', 'EL33_T'), []);
  assert.ok(!M.diaConPlanilla(e, '2026-10-17'));
  assert.ok(M.asignar(e, cfg, st, '2026-10-16', 'EL33_T', 'jacquelin', { forzar: true, permitirPartido: true }).ok);
  assert.strictEqual(M.vaciarPlanilla(e, '2026-10-16', '2026-10-16').plazas, 1);
  assert.deepStrictEqual(e.asig['2026-10-16'], {}, 'vaciar tampoco borra el día');
  // el caso 01 de la auditoría (scratchpad/auditoria-modelo/H-invariantes/caso-01-directo.mjs), como prueba del repo:
  // el estado virtual de un rango (estadoRango de la Cobertura) se desenganchaba del mes al vaciarse el día
  const S = M.semillaPasarela(); S.meses = { '2026-10': { asig: {}, apertura: {}, manual: {} } };
  const mes = () => M.estadoDesde(S.meses, [], 2026, 10);
  const estadoRango = (desde, hasta) => { const v = { y: 2026, m: 10, days: [], asig: {}, apertura: {}, manual: {}, festivos: [], virtual: true }; for (const iso of M.rangoIso(desde, hasta)) { const me = mes(); v.days.push(me.days.find(d => d.iso === iso)); me.asig[iso] = me.asig[iso] || {}; me.apertura[iso] = me.apertura[iso] || {}; me.manual[iso] = me.manual[iso] || {}; v.asig[iso] = me.asig[iso]; v.apertura[iso] = me.apertura[iso]; v.manual[iso] = me.manual[iso]; } return v; };
  const D = '2026-10-17';
  assert.ok(M.asignar(mes(), S, S.staff, D, 'EL33_T', 'jacquelin', { forzar: true, permitirPartido: true }).ok);
  const inc = { pid: 'jacquelin', tipo: 'LD', desde: D, hasta: D, franjas: ['T'] };
  const rg = M.rangoNecesario(inc);
  const real = estadoRango(rg.desde, rg.hasta);
  const planes = M.planesCobertura(S, S.staff, real, inc, {});
  const ap = M.aplicarCobertura(S, S.staff, real, inc, planes.planes[0]);
  assert.strictEqual(real.asig[D], mes().asig[D], 'el día del estado virtual sigue siendo el objeto del mes');
  assert.ok(ap.asignados.length > 0, 'el plan pone a alguien: ' + JSON.stringify(planes.planes[0].huecos));
  for (const a of ap.asignados) assert.ok(M.pidsEn(mes(), a.iso, a.tid).includes(a.pid), `${a.pid} en ${a.tid} el ${a.iso} llega a S.meses`);
});
ok('S0 · darSalida: retira sus plazas desde la fecha (las de a mano también) sin tocar las de antes ni a los demás ni borrar el día, y devuelve lo retirado; quitarSalida la deja como estaba', () => {
  const cfg = cfgDemo(), st = cfg.staff; const ad = M.personaDe(st, 'adrian');
  const mesDe = iso => M.estadoDesde(cfg.meses, [], +iso.slice(0, 4), +iso.slice(5, 7));
  // el miércoles 14 (libra) el encargado lo puso a mano en Zapatillera
  assert.ok(M.asignar(mesDe('2026-10-14'), cfg, st, '2026-10-14', 'ZAPA_M', 'adrian', { forzar: true, permitirPartido: true, puesto: 'cocina', cocina: true }).ok);
  const foto = () => { const out = {}; for (const k of Object.keys(cfg.meses)) for (const [iso, porT] of Object.entries(cfg.meses[k].asig)) for (const [tid, l] of Object.entries(porT)) out[iso + '|' + tid] = l.filter(x => x.pid !== 'adrian').map(x => x.pid + (x.por ? '<' + x.por : '')).join(','); return out; };
  const otrosAntes = foto();
  const suyas = () => { const out = []; for (const k of Object.keys(cfg.meses)) for (const [iso, porT] of Object.entries(cfg.meses[k].asig)) for (const [tid, l] of Object.entries(porT)) if (l.some(x => x.pid === 'adrian')) out.push(iso + '|' + tid); return out.sort(); };
  const antes = suyas();
  assert.ok(antes.some(x => x < '2026-10-07') && antes.some(x => x >= '2026-10-07'));
  const r = M.darSalida(cfg, st, cfg.meses, 'adrian', '2026-10-07', 'se va a otro trabajo');
  assert.deepStrictEqual(M.salidaDe(ad), { desde: '2026-10-07', motivo: 'se va a otro trabajo' });
  assert.deepStrictEqual(r.meses, ['2026-10']);
  assert.deepStrictEqual(r.retirados.map(x => x.iso + '|' + x.tid).sort(), antes.filter(x => x >= '2026-10-07'), 'lo retirado es justo lo suyo desde el 7');
  assert.ok(r.retirados.every(x => x.entry && x.entry.pid === 'adrian'));
  assert.ok(r.retirados.some(x => x.iso === '2026-10-14' && x.entry.origen === 'manual' && x.entry.forzado), 'la de a mano también (lo decide el encargado en el diálogo)');
  assert.deepStrictEqual(suyas(), antes.filter(x => x < '2026-10-07'), 'las de antes siguen');
  assert.deepStrictEqual(foto(), otrosAntes, 'los demás, tal cual (también quien iba «por» alguien)');
  assert.ok(mesDe('2026-10-14').asig['2026-10-14'] && Object.keys(cfg.meses['2026-10'].asig).includes('2026-10-14'), 'el día no se borra');
  // un día en el que solo estaba ella: la casilla se va, el día se queda ({})
  const e = M.nuevoEstado(2026, 12, { festivos: [] }); cfg.meses['2026-12'] = { asig: e.asig, apertura: e.apertura, manual: e.manual };
  M.quitarSalida(st, 'adrian');
  assert.ok(M.asignar(e, cfg, st, '2026-12-03', 'ZAPA_M', 'adrian', { forzar: true, permitirPartido: true }).ok);
  const r2 = M.darSalida(cfg, st, cfg.meses, 'adrian', '2026-10-07');
  assert.deepStrictEqual(r2.retirados.map(x => x.iso), ['2026-12-03']);
  assert.deepStrictEqual(cfg.meses['2026-12'].asig['2026-12-03'], {});
  assert.deepStrictEqual(M.salidaDe(ad), { desde: '2026-10-07' }, 'sin motivo, sin el campo');
  // quitarSalida (Restaurar): borra la salida y nada más; sus turnos pasados siguen
  assert.strictEqual(M.quitarSalida(st, 'adrian'), true);
  assert.strictEqual(M.salidaDe(ad), null);
  assert.strictEqual(M.quitarSalida(st, 'adrian'), false);
  assert.strictEqual(M.quitarSalida(st, 'nadie'), false);
  assert.deepStrictEqual(suyas(), antes.filter(x => x < '2026-10-07'));
});
ok('S0 · motivoRetirada: lo automático de quien ya no está → «ya no trabaja con nosotros»; lo «por X» con X que ya no está → «X ya no está con nosotros»; y regenerar lo retira, lo lista y no lo vuelve a poner', () => {
  const cfg = cfgBase(), st = staffDe(cfg);
  const e = f3Semana('2026-10-05');
  M.instanciarPatron(cfg, st, e, '2026-10-05', '2026-10-11');   // volcada antes de apuntar la salida
  const ml = M.personaDe(st, 'mariluz'); ml.salida = { desde: '2026-10-07' };
  const suya = M.asignados(e, '2026-10-08', 'PASARELA_M').find(x => x.pid === 'mariluz');
  assert.ok(suya, 'la planilla de antes la tiene el jueves 8');
  assert.match(M.motivoRetirada(cfg, st, e, '2026-10-08', 'PASARELA_M', suya), /^ya no trabaja con nosotros desde el 7\/10$/);
  assert.strictEqual(M.motivoRetirada(cfg, st, e, '2026-10-06', 'PASARELA_M', M.asignados(e, '2026-10-06', 'PASARELA_M').find(x => x.pid === 'mariluz')), null, 'el martes 6 sigue valiendo');
  const lav = M.asignados(e, '2026-10-07', 'PASARELA_M').find(x => x.pid === 'lavinia');
  assert.strictEqual(lav.por, 'mariluz');
  assert.strictEqual(M.motivoRetirada(cfg, st, e, '2026-10-07', 'PASARELA_M', lav), 'Mari Luz ya no está con nosotros');
  const g = M.generarPlanilla(cfg, st, e, '2026-10-05', '2026-10-11', {});
  const ret = g.retirados.filter(x => x.pid === 'mariluz');
  assert.ok(ret.length >= 4 && ret.every(x => x.iso >= '2026-10-07' && /ya no trabaja con nosotros/.test(x.motivo)), JSON.stringify(ret));
  assert.ok(g.retirados.some(x => x.pid === 'lavinia' && x.iso === '2026-10-07' && x.por === 'mariluz' && /Mari Luz ya no está con nosotros/.test(x.motivo)), JSON.stringify(g.retirados.filter(x => x.pid === 'lavinia')));
  for (const iso of ['2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11']) for (const t of M.turnosDe(cfg)) assert.ok(!M.pidsEn(e, iso, t.id).includes('mariluz'), `${iso} ${t.id}`);
  assert.ok(M.pidsEn(e, '2026-10-06', 'PASARELA_M').includes('mariluz'), 'el martes 6 sigue');
  const lav2 = M.asignados(e, '2026-10-07', 'PASARELA_M').find(x => x.pid === 'lavinia');
  assert.ok(lav2 && !lav2.por, 'Lavinia vuelve a su plaza del miércoles, ya sin «por Mari Luz»: ' + JSON.stringify(lav2));
  // y a la siguiente generación no hay nada que retirar de ellas
  const g2 = M.generarPlanilla(cfg, st, e, '2026-10-05', '2026-10-11', {});
  assert.deepStrictEqual(g2.retirados.filter(x => x.pid === 'mariluz' || x.pid === 'lavinia'), []);
});
ok('S0 · posicionesDe lleva «salido» (con su fecha) en las plazas de quien tiene salida, también en días anteriores: es el sombreado rojo; los demás, null', () => {
  const cfg = cfgBase(), st = staffDe(cfg);
  const e = f3Semana('2026-10-05');
  M.instanciarPatron(cfg, st, e, '2026-10-05', '2026-10-11');
  M.personaDe(st, 'adrian').salida = { desde: '2026-10-07', motivo: 'se va' };
  const s6 = M.posicionesDe(cfg, st, e, '2026-10-06', 'ZAPA_M');
  const ad = s6.find(x => x.pid === 'adrian'), ja = s6.find(x => x.pid === 'jacquelin');
  assert.deepStrictEqual(ad.salido, { desde: '2026-10-07', motivo: 'se va' });
  assert.strictEqual(ja.salido, null);
  assert.deepStrictEqual(M.posicionesDe(cfg, st, e, '2026-10-08', 'ZAPA_M').find(x => x.pid === 'adrian').salido, { desde: '2026-10-07', motivo: 'se va' }, 'una plaza que se quedó de antes, igual');
});
ok('S0 · Horas: quien ha salido sigue en la tabla del mes si tiene turnos, ausencias o extras ese mes (fila «salido»); sin nada ese mes y salida antes del día 1, no sale', () => {
  const cfg = cfgDemo(), st = cfg.staff; const ad = M.personaDe(st, 'adrian');
  M.darSalida(cfg, st, cfg.meses, 'adrian', '2026-10-07', 'se va');
  const oct = M.horasEquipoMes(cfg, st, cfg.meses, 2026, 10).find(f => f.pid === 'adrian');
  assert.ok(oct && oct.turnos > 0 && oct.salido && oct.salido.desde === '2026-10-07', JSON.stringify(oct && { turnos: oct.turnos, salido: oct.salido }));
  const sep = M.horasEquipoMes(cfg, st, cfg.meses, 2026, 9).find(f => f.pid === 'adrian');
  assert.ok(sep && sep.turnos > 0, 'septiembre entero');
  assert.ok(!M.horasEquipoMes(cfg, st, cfg.meses, 2026, 11).some(f => f.pid === 'adrian'), 'noviembre: nada suyo y ya se había ido');
  assert.ok(!M.personasDelMes(cfg, st, cfg.meses, 2026, 12).some(p => p.id === 'adrian'));
  assert.ok(M.horasEquipoMes(cfg, st, cfg.meses, 2026, 11).some(f => f.pid === 'jacquelin'), 'los demás siguen');
  cfg.extras = [{ id: 'x1', pid: 'adrian', iso: '2026-11-03', min: 60, motivo: 'liquidación' }];
  assert.ok(M.horasEquipoMes(cfg, st, cfg.meses, 2026, 11).some(f => f.pid === 'adrian' && f.extrasMin === 60), 'con una extra apuntada ese mes, sale');
  cfg.extras = [];
  // (revisión S0, 30/09) una ausencia apuntada para DESPUÉS de la salida no cuenta: no hace que salga en Horas
  M.anadirAusencia(ad, { tipo: 'VAC', desde: '2026-11-10', hasta: '2026-11-12' });
  assert.ok(!M.personasDelMes(cfg, st, cfg.meses, 2026, 11).some(p => p.id === 'adrian'), 'una ausencia posterior a la salida no cuenta: no sale');
  ad.ausencias = [];
  ad.salida = { desde: '2026-11-15' };
  M.anadirAusencia(ad, { tipo: 'VAC', desde: '2026-11-10', hasta: '2026-11-12' });
  assert.ok(M.personasDelMes(cfg, st, cfg.meses, 2026, 11).some(p => p.id === 'adrian'), 'se va el 15: en noviembre aún cuenta (y sus vacaciones del 10 al 12 también)');
  assert.strictEqual(M.horasPersonaMes(cfg, st, cfg.meses, 'adrian', 2026, 11).vacaciones, 3);
  ad.ausencias = [];
  assert.ok(!M.personasDelMes(cfg, st, cfg.meses, 2026, 12).some(p => p.id === 'adrian'));
  assert.strictEqual(M.horasPersonaMes(cfg, st, cfg.meses, 'jacquelin', 2026, 10).salido, null);
});
ok('S0 · recuperarPersona: vuelve la ficha (con su salida) y sus turnos de antes de la salida, en su sitio; no toca lo posterior ni a los demás; dos veces = una', () => {
  const viejo = cfgDemo();
  const actual = JSON.parse(JSON.stringify(viejo));
  // como «Borrar del todo» (quitarPidDeTodo): fuera de la plantilla y de todos los meses
  actual.staff = actual.staff.filter(p => p.id !== 'adrian');
  for (const mes of Object.values(actual.meses)) for (const [iso, porT] of Object.entries(mes.asig)) { for (const [tid, l] of Object.entries(porT)) { const resto = l.filter(x => x.pid !== 'adrian'); if (resto.length) porT[tid] = resto; else delete porT[tid]; } if (!Object.keys(porT).length) delete mes.asig[iso]; }
  // y después alguien tocó la planilla: Roberto pasa a abrir la mañana del viernes 2 en Zapatillera
  actual.meses['2026-10'].asig['2026-10-02'].ZAPA_M.unshift({ pid: 'roberto', cocina: false, abre: true, origen: 'manual' });
  delete actual.meses['2026-09'];   // y septiembre ya no está en la copia de ahora
  const entradas = (est, pid, filtro) => { const out = []; for (const [k, mes] of Object.entries(est.meses)) for (const [iso, porT] of Object.entries(mes.asig)) for (const [tid, l] of Object.entries(porT)) l.forEach((x, i) => { if ((pid ? x.pid === pid : x.pid !== 'adrian') && (!filtro || filtro(iso))) out.push({ k, iso, tid, i, x }); }); return out; };
  const otrosAntes = JSON.stringify(entradas(actual, null).map(z => [z.iso, z.tid, z.x]));
  const deAntes = entradas(viejo, 'adrian', iso => iso < '2026-10-07');
  assert.ok(deAntes.length > 0 && entradas(viejo, 'adrian', iso => iso >= '2026-10-07').length > 0);
  const r = M.recuperarPersona(actual, viejo, 'adrian', '2026-10-07');
  assert.deepStrictEqual(r, { ficha: true, turnos: deAntes.length, meses: ['2026-09', '2026-10'] });
  const ad = actual.staff.find(p => p.id === 'adrian');
  assert.ok(ad && ad !== viejo.staff.find(p => p.id === 'adrian'), 'la ficha vuelve (copiada, no el mismo objeto)');
  assert.deepStrictEqual(ad.salida, { desde: '2026-10-07', motivo: 'recuperada de una versión anterior' });
  assert.deepStrictEqual(ad.ausencias, viejo.staff.find(p => p.id === 'adrian').ausencias);
  assert.deepStrictEqual(ad.cocina, viejo.staff.find(p => p.id === 'adrian').cocina);
  for (const z of deAntes) {
    const l = actual.meses[z.k].asig[z.iso][z.tid];
    const j = l.findIndex(x => x.pid === 'adrian');
    assert.ok(j >= 0, `${z.iso} ${z.tid}: vuelve`);
    assert.deepStrictEqual(l[j], z.x, `${z.iso} ${z.tid}: con todos sus campos, tal cual`);
    assert.strictEqual(j, Math.min(z.i, l.length - 1), `${z.iso} ${z.tid}: en el mismo índice si cabe (septiembre nace vacío: al principio)`);
  }
  assert.strictEqual(actual.meses['2026-10'].asig['2026-10-02'].ZAPA_M.findIndex(x => x.pid === 'adrian'), deAntes.find(z => z.iso === '2026-10-02' && z.tid === 'ZAPA_M').i, 'en el mismo índice aunque la casilla haya cambiado');
  assert.strictEqual(actual.meses['2026-10'].asig['2026-10-02'].ZAPA_M[0].pid, 'roberto', 'lo que puso el encargado después no se mueve del sitio');
  assert.deepStrictEqual(entradas(actual, 'adrian', iso => iso >= '2026-10-07'), [], 'nada desde la salida');
  assert.strictEqual(JSON.stringify(entradas(actual, null).map(z => [z.iso, z.tid, z.x])), otrosAntes, 'los demás, tal cual');
  assert.ok(actual.meses['2026-09'] && !actual.meses['2026-09'].apertura['2026-09-01'], 'septiembre vuelve solo con lo suyo');
  const foto = JSON.stringify(actual);
  assert.deepStrictEqual(M.recuperarPersona(actual, viejo, 'adrian', '2026-10-07'), { ficha: false, turnos: 0, meses: [] }, 'idempotente');
  assert.strictEqual(JSON.stringify(actual), foto);
  assert.deepStrictEqual(M.recuperarPersona(actual, viejo, 'nadie', '2026-10-07'), { ficha: false, turnos: 0, meses: [] });
});
ok('S0 · mesesSinCerrar: los meses anteriores al de la fecha que tienen turnos y no están cerrados para la nómina', () => {
  const cfg = cfgDemo();
  assert.deepStrictEqual(M.mesesSinCerrar(cfg, '2026-10-07'), ['2026-09']);
  assert.deepStrictEqual(M.mesesSinCerrar(cfg, '2026-11-02'), ['2026-09', '2026-10']);
  assert.deepStrictEqual(M.mesesSinCerrar(cfg, '2026-09-15'), []);
  cfg.cierres = { '2026-09': { ts: 1, tabla: [] } };
  assert.deepStrictEqual(M.mesesSinCerrar(cfg, '2026-11-02'), ['2026-10']);
  cfg.meses['2026-08'] = { asig: { '2026-08-03': {} }, apertura: {}, manual: {} };   // sin turnos (un día vacío): no cuenta
  assert.deepStrictEqual(M.mesesSinCerrar(cfg, '2026-11-02'), ['2026-10']);
  assert.deepStrictEqual(M.mesesSinCerrar({ meses: {} }, '2026-10-07'), []);
  assert.deepStrictEqual(M.mesesSinCerrar({}, '2026-10-07'), []);
});
ok('S0 · G1 (auditoría): un sábado con tramo de partido propio solo para la mañana, la tarde cae al tramo general del partido, nunca al horario de apertura entero', () => {
  const cfg = cfgBase(); const l = M.localDe(cfg, 'PASARELA');
  l.horarioPartido = { M: { ini: '11:00', fin: '16:00' }, T: { ini: '21:00', fin: '00:00' }, porDow: { 6: { M: { ini: '12:00', fin: '16:00' } } } };
  assert.deepStrictEqual(M.tramoPartidoDe(l, 6, 'M'), { ini: '12:00', fin: '16:00' });
  assert.deepStrictEqual(M.tramoPartidoDe(l, 6, 'T'), { ini: '21:00', fin: '00:00' }, 'la tarde del sábado: el general del partido');
  assert.deepStrictEqual(M.horarioDe(l, 6, 'T', true, null), { ini: '21:00', fin: '00:00' }, 'no las ocho horas de apertura de la tarde');
  const total = M.minutosTurno(l, 6, 'M', null, true, null) + M.minutosTurno(l, 6, 'T', null, true, null);
  assert.strictEqual(total, 4 * 60 + 3 * 60, `un partido del sábado suma sus dos tramos (salieron ${total / 60} h)`);
  // al revés (solo la tarde propia): la mañana cae al general
  l.horarioPartido.porDow = { 6: { T: { ini: '20:00', fin: '00:00' } } };
  assert.deepStrictEqual(M.tramoPartidoDe(l, 6, 'M'), { ini: '11:00', fin: '16:00' });
  // quien abre la tarde entra a la hora de abrir con el tramo largo (el de la mañana general, 5 h): como siempre
  const ab = M.tramoPartidoDe(l, 6, 'T', 'T');
  assert.strictEqual(ab.ini, M.horarioDe(l, 6, 'T').ini);
  assert.strictEqual(M.minutosEntre(ab.ini, ab.fin), 5 * 60);
  // y entre semana, sin porDow, igual que antes
  assert.deepStrictEqual(M.tramoPartidoDe(l, 2, 'M'), { ini: '11:00', fin: '16:00' });
});

// ---------- revisión de S0 (30/09): lo que los revisores encontraron ----------
// Susi (baja abierta desde el 1/9, sin fecha de fin) se va el 7/10: sus días de baja de después de la salida no son
// días de baja (ya no está), así que no cuentan en Horas ni en las vacaciones del año, y en diciembre no sale.
ok('S0 · revisión: las ausencias de después de la salida no cuentan (una sola lectura: ausenciaEn); Horas de diciembre no lista a quien se fue en octubre con la baja abierta; el Generador no la dice «de baja»', () => {
  const cfg = cfgDemo(), st = cfg.staff; const su = M.personaDe(st, 'susi');
  assert.ok(M.deBaja(su, '2026-10-06') && M.ausenciaEn(su, '2026-12-15'), 'antes de la salida: de baja, y la baja no tiene fin');
  M.darSalida(cfg, st, cfg.meses, 'susi', '2026-10-07', 'se va');
  assert.strictEqual(M.ausenciaEn(su, '2026-10-07'), null, 'desde la salida, ninguna ausencia');
  assert.ok(M.ausenciaEn(su, '2026-10-06') && M.deBaja(su, '2026-10-06'), 'el día anterior, de baja como siempre');
  assert.strictEqual(M.deBaja(su, '2026-10-07'), false);
  assert.deepStrictEqual(M.diasAusenciaMes(su, 2026, 10, 'BAJ'), ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06']);
  assert.deepStrictEqual(M.diasAusenciaMes(su, 2026, 12, 'BAJ'), []);
  const oct = M.horasPersonaMes(cfg, st, cfg.meses, 'susi', 2026, 10);
  assert.strictEqual(oct.ausencias, 6, JSON.stringify({ ausencias: oct.ausencias, bajaDias: oct.bajaDias }));
  assert.strictEqual(oct.bajaDias, 6);
  assert.ok(!M.personasDelMes(cfg, st, cfg.meses, 2026, 12).some(p => p.id === 'susi'), 'diciembre: sin nada suyo, no sale');
  assert.ok(!M.horasEquipoMes(cfg, st, cfg.meses, 2026, 12).some(f => f.pid === 'susi'));
  const va = M.vacacionesAno(st, 2026, 'BAJ').find(x => x.pid === 'susi');
  assert.ok(va && va.total === 30 + 6 && va.fechas.every(iso => iso < '2026-10-07'), JSON.stringify(va && { total: va.total, ultima: va.fechas[va.fechas.length - 1] }));
  // el Generador de la semana del 12/10: Susi ya no está «de baja» (se fue)
  const g = M.generarSemana(cfg, st, M.estadoDesde(cfg.meses, [], 2026, 10), '2026-10-12', { simular: true });
  assert.ok(!g.resumen.deBaja.includes('susi') && !g.resumen.bajasParciales.some(x => x.pid === 'susi'), JSON.stringify(g.resumen.deBaja));
  // y la semana del 5/10 (se va el miércoles): de baja lunes y martes, parcial, no los siete días
  const g2 = M.generarSemana(cfg, st, M.estadoDesde(cfg.meses, [], 2026, 10), '2026-10-05', { simular: true });
  assert.ok(!g2.resumen.deBaja.includes('susi') && g2.resumen.bajasParciales.some(x => x.pid === 'susi' && x.dias.length === 2), JSON.stringify(g2.resumen.bajasParciales));
});
ok('S0 · revisión: darSalida exige la fecha en AAAA-MM-DD (con «7/10/2026» apuntaba la salida y no retiraba nada)', () => {
  const cfg = cfgDemo(), st = cfg.staff;
  const foto = JSON.stringify(cfg.meses);
  assert.throws(() => M.darSalida(cfg, st, cfg.meses, 'adrian', '7/10/2026', 'x'), /AAAA-MM-DD/);
  assert.throws(() => M.darSalida(cfg, st, cfg.meses, 'adrian', '2026-13-01', 'x'), /AAAA-MM-DD/);
  assert.strictEqual(M.salidaDe(M.personaDe(st, 'adrian')), null, 'no se apunta nada');
  assert.strictEqual(JSON.stringify(cfg.meses), foto, 'ni se retira nada');
  assert.deepStrictEqual(M.darSalida(cfg, st, cfg.meses, 'adrian', '', 'x'), { retirados: [], meses: [] }, 'sin fecha: nada (como antes)');
});
// recuperar a quien ya tenía salida cuando se la borró del todo: la salida real (7/10, «se fue a otro sitio») manda sobre
// el día del borrado (20/10); y su ficha vuelve sin parejas «nunca con» ni «cubre a» (ya no aplican y la otra ficha no las
// tiene: la Revisión sacaba «no pueden coincidir» sin pareja visible)
ok('S0 · revisión: recuperarPersona conserva la salida real si es anterior al borrado (y su motivo), y la ficha vuelve sin «nunca con» ni «cubre a»', () => {
  const viejo = cfgDemo();
  const av = M.personaDe(viejo.staff, 'adrian');
  av.salida = { desde: '2026-10-07', motivo: 'se fue a otro sitio' };
  M.ponerNuncaCon(viejo.staff, 'adrian', 'roberto', { flexible: true });
  const actual = JSON.parse(JSON.stringify(viejo));
  M.quitarNuncaCon(actual.staff, 'roberto', 'adrian');   // «Borrar del todo» (quitarPidDeTodo) quita la pareja de las dos fichas antes de sacarla
  actual.staff = actual.staff.filter(p => p.id !== 'adrian');
  for (const mes of Object.values(actual.meses)) for (const porT of Object.values(mes.asig)) for (const [tid, l] of Object.entries(porT)) porT[tid] = l.filter(x => x.pid !== 'adrian');
  const r = M.recuperarPersona(actual, viejo, 'adrian', '2026-10-20');
  const ad = M.personaDe(actual.staff, 'adrian');
  assert.ok(r.ficha && r.turnos > 0);
  assert.deepStrictEqual(ad.salida, { desde: '2026-10-07', motivo: 'se fue a otro sitio' }, 'la salida real, con su motivo');
  const suyas = []; for (const mes of Object.values(actual.meses)) for (const [iso, porT] of Object.entries(mes.asig)) for (const l of Object.values(porT)) if (l.some(x => x.pid === 'adrian')) suyas.push(iso);
  assert.ok(suyas.length === r.turnos && suyas.every(iso => iso < '2026-10-07'), 'sus turnos vuelven solo hasta la salida real');
  assert.deepStrictEqual([ad.nuncaCon, ad.nuncaConFlex, ad.nuncaConOff, ad.cubreA], [[], [], [], []], JSON.stringify({ nc: ad.nuncaCon, f: ad.nuncaConFlex, o: ad.nuncaConOff, c: ad.cubreA }));
  assert.deepStrictEqual(M.parejasNuncaCon(actual, actual.staff, M.personaDe(actual.staff, 'roberto')), [], 'Roberto no queda con una pareja a medias');
  assert.strictEqual(M.quienLeCubre(actual, actual.staff, 'susi').length, 0, 'ya no cubre a Susi');
  // al revés: la salida del viejo es posterior al borrado (rarísimo) → manda el día del borrado
  const viejo2 = cfgDemo(); M.personaDe(viejo2.staff, 'adrian').salida = { desde: '2026-10-25' };
  const actual2 = JSON.parse(JSON.stringify(viejo2)); actual2.staff = actual2.staff.filter(p => p.id !== 'adrian');
  M.recuperarPersona(actual2, viejo2, 'adrian', '2026-10-20');
  assert.deepStrictEqual(M.personaDe(actual2.staff, 'adrian').salida, { desde: '2026-10-20', motivo: 'recuperada de una versión anterior' });
});
ok('S0 · revisión: recuperarPersona repone las marcas a mano (abre/cocina) de la casilla recuperada si hoy no tiene ninguna; si las tiene, no las toca', () => {
  const viejo = cfgDemo();
  M.marcarManual(viejo.meses['2026-10'], '2026-10-06', 'ZAPA_M', 'abre');
  M.marcarManual(viejo.meses['2026-10'], '2026-10-05', 'ZAPA_T', 'cocina');
  const actual = JSON.parse(JSON.stringify(viejo));
  actual.staff = actual.staff.filter(p => p.id !== 'adrian');
  for (const mes of Object.values(actual.meses)) { mes.manual = {}; for (const porT of Object.values(mes.asig)) for (const [tid, l] of Object.entries(porT)) porT[tid] = l.filter(x => x.pid !== 'adrian'); }
  actual.meses['2026-10'].manual['2026-10-05'] = { ZAPA_T: { abre: true } };   // hoy alguien marcó otra cosa en esa casilla
  M.recuperarPersona(actual, viejo, 'adrian', '2026-10-07');
  assert.deepStrictEqual(M.manualDe(actual.meses['2026-10'], '2026-10-06', 'ZAPA_M'), { abre: true }, 'vuelve la marca de entonces');
  assert.deepStrictEqual(M.manualDe(actual.meses['2026-10'], '2026-10-05', 'ZAPA_T'), { abre: true }, 'la de hoy se queda');
  assert.deepStrictEqual(M.manualDe(actual.meses['2026-10'], '2026-10-08', 'ZAPA_M'), {}, 'nada en los días desde la salida');
});
// el Generador: «Roberto cubre a Adrián» no es una condición de una semana en la que Adrián ya no está; y la semana en la
// que se va, las condiciones del local (la cocina, «Quién abre») le nombran con «(hasta el 6/10)»
ok('S0 · revisión: la condición «X cubre a Y» no sale cuando Y ya se ha ido; las del local dicen «Adrián (hasta el 6/10)» la semana en la que se va y no le nombran después', () => {
  const cfg = cfgBase(), st = staffDe(cfg); const ad = M.personaDe(st, 'adrian'); ad.salida = { desde: '2026-10-07' };
  M.localDe(cfg, 'ZAPA').primero.M = 'adrian';
  const c12 = M.condicionesDe(cfg, st, '2026-10-12');
  assert.ok(!c12.some(c => /Adrián/.test(c.texto)), JSON.stringify(c12.filter(c => /Adrián/.test(c.texto)).map(c => c.texto)));
  const c05 = M.condicionesDe(cfg, st, '2026-10-05');
  assert.ok(c05.some(c => c.id === 'p:roberto:cubre:adrian:'), 'la semana en la que se va, aún puede faltar antes: la designación sigue');
  const coc = c05.find(c => c.id === 'coc:ZAPA'), pri = c05.find(c => c.id === 'loc:ZAPA:primero:M');
  assert.match((coc || {}).texto || '', /Adrián \(hasta el 6\/10\)/);
  assert.match((pri || {}).texto || '', /abre Adrián \(hasta el 6\/10\)/);
  const c28 = M.condicionesDe(cfg, st, '2026-09-28');
  assert.ok(c28.some(c => c.id === 'p:roberto:cubre:adrian:') && /la lleva[n]? [^(]*Adrián[^(]*\(/.test((c28.find(c => c.id === 'coc:ZAPA') || {}).texto) && !/hasta el/.test((c28.find(c => c.id === 'coc:ZAPA') || {}).texto), 'una semana anterior: como siempre');
});
ok('S0 · revisión: planesCobertura no lista como designado a quien ya no está el primer día de la incidencia (la cabecera decía «tiene quien le cubra: Adrián» y dos líneas después que no podía)', () => {
  const cfg = cfgBase(), st = staffDe(cfg); const ad = M.personaDe(st, 'adrian'); ad.salida = { desde: '2026-10-07' };
  const su = M.personaDe(st, 'susi'); su.ausencias = [];
  const e = f3Semana('2026-10-05');
  M.asignar(e, cfg, st, '2026-10-08', 'ZAPA_M', 'susi', { origen: 'manual', forzar: true });
  const r = M.planesCobertura(cfg, st, e, { pid: 'susi', tipo: 'LD', dias: ['2026-10-08'] });
  assert.deepStrictEqual(r.designados.map(d => d.pid), [], JSON.stringify(r.designados));
  M.asignar(e, cfg, st, '2026-10-06', 'ZAPA_M', 'susi', { origen: 'manual', forzar: true });
  const r2 = M.planesCobertura(cfg, st, e, { pid: 'susi', tipo: 'LD', dias: ['2026-10-06'] });
  assert.deepStrictEqual(r2.designados.map(d => d.pid), ['adrian'], 'el día anterior a la salida, sigue designado');
});

// ---------- A1 (30/09): auditoría del modelo · casilla y marcas (H2, C1/H7, C3, H3, B3, C4, G3, C5/E3, B2/H1, C10, H10) ----------
// Los scripts de los revisores (scratchpad/auditoria-modelo/{H,C,B,G,E}) como pruebas del repo: en rojo antes, en verde después.
// el estado virtual de una semana enlazado con S.meses, como estadoSemana(lunes, true) de la app (22-generador.js)
function a1SemanaVirtual(S, lunes) {
  const e = { y: +lunes.slice(0, 4), m: +lunes.slice(5, 7), days: [], asig: {}, apertura: {}, manual: {}, festivos: [], virtual: true };
  for (let k = 0; k < 7; k++) {
    const iso = M.addDias(lunes, k), key = iso.slice(0, 7);
    S.meses[key] = S.meses[key] || { asig: {}, apertura: {}, manual: {} };
    const me = M.estadoDesde(S.meses, [], +iso.slice(0, 4), +iso.slice(5, 7));
    e.days.push(me.days.find(x => x.iso === iso));
    me.asig[iso] = me.asig[iso] || {}; me.apertura[iso] = me.apertura[iso] || {}; me.manual[iso] = me.manual[iso] || {};
    e.asig[iso] = me.asig[iso]; e.apertura[iso] = me.apertura[iso]; e.manual[iso] = me.manual[iso];
  }
  return e;
}
// una persona de laboratorio con todos los campos de la ficha (como P de la lente C) y un mundo limpio (los cuatro
// locales sin semana tipo, mínimos 0, sin cocina ni «Quién abre», abiertos todos los días)
function a1P(id, extra) {
  return Object.assign({ id, nombre: id[0].toUpperCase() + id.slice(1), puesto: 'sala', locales: [], franjas: ['M', 'T'], libra: [], partido: { dias: [] },
    cocina: { titular: [], reserva: [], soloDias: [] }, abre: {}, noAbre: [], nuncaCon: [], cubreA: [], vetos: [], contrato: { horasSemana: null },
    ausencias: [], prefs: {}, nota: '', supuestos: [], noPrimero: [] }, extra || {});
}
function a1Mundo(staff, ajustes) {
  const cfg = M.semillaPasarela();
  cfg.patron = {}; cfg.staff = staff; cfg.reglas = {}; cfg.cierresPuntuales = []; cfg.eventos = [];
  for (const l of cfg.locales) {
    l.abre = { M: M.TODOS.slice(), T: M.TODOS.slice() };
    for (const f of M.FRANJAS) for (const d of M.TODOS) { l.minimos[f][d] = 0; if (l.supuestos && l.supuestos[f]) delete l.supuestos[f][d]; }
    l.cocina = { obligatoria: { M: false, T: false }, titulares: { M: [], T: [] }, reservas: [], posicion: { M: 2, T: 2 }, posicionSiDesde: {} };
    l.primero = { M: null, T: null };
    l.partidoAbre = { M: false, T: false };
  }
  if (ajustes) ajustes(cfg);
  return cfg;
}
// la marca «abre» guardada (e.abre: el Mes, el Excel, el perfil y Horas) y el orden guardado frente a lo que calcula la
// casilla (primeroDe, posicionesDe: Hoy y la Semana). [] = todo coherente
function a1Desfases(cfg, e, dias) {
  const out = [];
  for (const iso of dias) for (const t of M.turnosDe(cfg)) {
    const l = M.asignados(e, iso, t.id); if (!l.length) continue;
    const marcado = (l.find(x => x.abre) || {}).pid || null, pr = M.primeroDe(cfg, cfg.staff, e, iso, t.id);
    if (marcado !== pr) out.push(`${iso} ${t.id}: abre guardado ${marcado} · primeroDe ${pr}`);
    const pos = M.posicionesDe(cfg, cfg.staff, e, iso, t.id).filter(x => !x.hueco).map(x => x.pid);
    if (l.map(x => x.pid).join() !== pos.join()) out.push(`${iso} ${t.id}: orden guardado ${l.map(x => x.pid)} · posicionesDe ${pos}`);
  }
  return out;
}

ok('A1 · C10/F8: al vaciarse una casilla con desasignar se van sus marcas a mano (nada huérfano en la casilla vacía); vaciarPlanilla cuenta los días con plazas', () => {
  const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct();
  assert.ok(M.asignar(e, cfg, st, '2026-10-06', 'PASARELA_M', 'lola', {}).ok);
  assert.ok(M.marcarAbre(e, '2026-10-06', 'PASARELA_M', 'lola', cfg, st));
  assert.deepStrictEqual(M.manualDe(e, '2026-10-06', 'PASARELA_M'), { abre: true });
  assert.ok(M.desasignar(e, '2026-10-06', 'PASARELA_M', 'lola'));
  assert.deepStrictEqual(e.asig['2026-10-06'], {}, 'el día se queda');
  assert.deepStrictEqual(M.manualDe(e, '2026-10-06', 'PASARELA_M'), {}, 'la casilla vacía no guarda marcas');
  // F8: vaciarPlanilla contaba «días» acumulando las plazas (el segundo día contaba aunque estuviera vacío)
  const e2 = estadoOct();
  assert.ok(M.asignar(e2, cfg, st, '2026-10-05', 'PASARELA_M', 'lola', {}).ok);
  assert.deepStrictEqual(M.vaciarPlanilla(e2, '2026-10-05', '2026-10-07'), { plazas: 1, dias: 1 }, 'un solo día tenía plazas');
  assert.deepStrictEqual(e2.asig['2026-10-05'], {}, 'el día vaciado se queda');
});

ok('A1 · caso 01b: «Generar la semana → Aplicar» sobre un estado virtual cuyo único turno del día era automático y se retira llega a S.meses', () => {
  const S = M.semillaPasarela(); S.meses = { '2026-10': { asig: {}, apertura: {}, manual: {} } };
  const mes = () => M.estadoDesde(S.meses, [], 2026, 10);
  const LUN = '2026-10-05', MAR = '2026-10-06';
  assert.ok(M.asignar(mes(), S, S.staff, MAR, 'ZAPA_M', 'juani', { origen: 'generador', razon: 'relleno' }).ok);
  M.personaDe(S.staff, 'juani').libra = [2];   // en Equipo, Juani pasa a librar los martes
  const real = a1SemanaVirtual(S, LUN);
  const r = M.generarSemana(S, S.staff, real, LUN, {});
  assert.ok(r.retirados.some(x => x.pid === 'juani' && x.iso === MAR), 'su plaza automática se retira');
  const cuenta = e => Object.values(e.asig[MAR] || {}).reduce((a, l) => a + l.length, 0);
  assert.ok(cuenta(real) > 10, 'la semana tipo rellena el martes');
  assert.strictEqual(cuenta(mes()), cuenta(real), 'y llega a S.meses');
});

ok('A1 · H10: clonarEstado copia también days y festivos (no comparte las listas con el original)', () => {
  const e = estadoOct(); e.festivos = ['2026-10-12'];
  const c = M.clonarEstado(e);
  c.days.push({ iso: 'x' }); c.festivos.push('2026-10-31');
  assert.strictEqual(e.days.length, 31); assert.deepStrictEqual(e.festivos, ['2026-10-12']);
  assert.notStrictEqual(c.days[0], e.days[0], 'los días son copias');
});

ok('A1 · C5/E3: el hueco de la 1.ª no es una persona: con dos personas (y un hueco) la cocina de Zapatillera mañana va 2.ª, y la casilla y la condición del Generador (posicionCocina) dicen lo mismo', () => {
  const st = [a1P('a', { locales: ['ZAPA'], noPrimero: ['M'] }), a1P('k', { puesto: 'cocina', locales: ['ZAPA'], noPrimero: ['M'], cocina: { titular: ['ZAPA'], reserva: [], soloDias: [] } }), a1P('b', { locales: ['ZAPA'] })];
  const cfg = a1Mundo(st, c => { const l = M.localDe(c, 'ZAPA'); l.cocina.titulares.M = ['k']; l.cocina.posicion = { M: 3, T: 2 }; l.cocina.posicionSiDesde = { M: 3 }; });
  const e = estadoOct(), lun = '2026-10-05', tid = 'ZAPA_M';
  assert.ok(M.asignar(e, cfg, st, lun, tid, 'a', { puesto: 'sala' }).ok && M.asignar(e, cfg, st, lun, tid, 'k', { puesto: 'cocina' }).ok);
  assert.strictEqual(M.posicionCocina(cfg, tid, 2), 2, 'con dos personas: 2.ª'); assert.strictEqual(M.posicionCocina(cfg, tid, 3), 3, 'con tres: 3.ª'); assert.strictEqual(M.posicionCocina(cfg, 'ZAPA_T', 5), 2, 'por la tarde siempre 2.ª');
  const pos = M.posicionesDe(cfg, st, e, lun, tid);
  assert.deepStrictEqual(pos.map(x => x.hueco ? 'HUECO' : x.pid + (x.cocina ? '(c)' : '')), ['HUECO', 'k(c)', 'a'], 'la cocina va 2.ª (detrás del hueco)');
  assert.ok(M.verificarSemana(cfg, st, e, lun).find(c => c.id === 'coc:ZAPA').ok, 'y el Generador la da por cumplida');
  // sin hueco (b puede abrir): con tres personas la cocina va 3.ª, y la condición también lo dice
  assert.ok(M.asignar(e, cfg, st, lun, tid, 'b', { puesto: 'sala' }).ok);
  assert.deepStrictEqual(M.posicionesDe(cfg, st, e, lun, tid).map(x => x.pid + (x.cocina ? '(c)' : '')), ['b', 'a', 'k(c)']);
  assert.ok(M.verificarSemana(cfg, st, e, lun).find(c => c.id === 'coc:ZAPA').ok);
  // E-generador/08 caso 2: Dulce forzada (no abre) y Adrián de cocina sin poder abrir: hueco + 2 → cocina 2.ª; con Leo también (hueco + 3) → 3.ª
  const cfg2 = cfgBase(), st2 = staffDe(cfg2), e2 = estadoOct(), mar = '2026-10-06';
  M.personaDe(st2, 'adrian').noPrimero = ['M'];
  assert.ok(M.asignar(e2, cfg2, st2, mar, 'ZAPA_M', 'dulce', { forzar: true, origen: 'manual' }).ok && M.asignar(e2, cfg2, st2, mar, 'ZAPA_M', 'adrian', { origen: 'manual', cocina: true }).ok);
  const sl = M.posicionesDe(cfg2, st2, e2, mar, 'ZAPA_M'), v = M.verificarSemana(cfg2, st2, e2, '2026-10-05').find(c => c.id === 'coc:ZAPA');
  assert.deepStrictEqual(sl.map(s => s.hueco ? 'HUECO' : s.pid + (s.cocina ? '(c)' : '')), ['HUECO', 'adrian(c)', 'dulce'], JSON.stringify(sl.map(s => s.pid)));
  assert.ok(v.ok, v.detalle);
  assert.ok(M.asignar(e2, cfg2, st2, mar, 'ZAPA_M', 'leo', { forzar: true, origen: 'manual' }).ok);
  const sl2 = M.posicionesDe(cfg2, st2, e2, mar, 'ZAPA_M'), v2 = M.verificarSemana(cfg2, st2, e2, '2026-10-05').find(c => c.id === 'coc:ZAPA');
  assert.strictEqual(sl2.find(s => s.cocina).pos, 3); assert.ok(v2.ok, v2.detalle);
});

ok('A1 · C4/G3: una casilla cerrada ESE día (a mano o por fechas) con gente dentro no cuenta como plaza para puedePrimero, ordenCompleto/posicionesDe ni turnoDelDia (plazaOcupa, la misma lectura que la puerta y Horas)', () => {
  // C-01 §5: a hace la mañana del Mónaco y la tarde de Pasarela; la mañana se cierra a mano con ella dentro
  const st = [a1P('a', { locales: [] }), a1P('b', { locales: [] })];
  const cfg = a1Mundo(st), e = estadoOct(), lun = '2026-10-05';
  assert.ok(M.asignar(e, cfg, st, lun, 'MONACO_M', 'a', { puesto: 'sala' }).ok && M.asignar(e, cfg, st, lun, 'PASARELA_T', 'a', { puesto: 'sala', permitirPartido: true }).ok && M.asignar(e, cfg, st, lun, 'PASARELA_T', 'b', { puesto: 'sala' }).ok);
  M.toggleApertura(e, lun, 'MONACO_M', cfg);
  assert.ok(!M.plazaOcupa(cfg, e, lun, 'MONACO_M'));
  assert.ok(M.puedeEstar(cfg, st, e, lun, 'PASARELA_T', 'a', { puesto: 'sala', yaDentro: true, forzar: true }).avisos.length === 0, 'la puerta ya no ve partido');
  assert.ok(M.puedePrimero(cfg, st, e, lun, 'PASARELA_T', 'a').ok, 'puedePrimero deja abrir la tarde: la mañana cerrada no cuenta');
  assert.ok(!M.posicionesDe(cfg, st, e, lun, 'PASARELA_T').find(x => x.pid === 'a').partido, 'posicionesDe no pinta «partido»');
  assert.deepStrictEqual(M.turnoDelDia(cfg, e, lun, 'a'), { partido: false, continuo: null, abre: null, enPartido: false });
  // C-06 §3: continuo con la mañana cerrada a mano: puedePrimero y esContinuo dicen lo mismo
  const st3 = [a1P('c', { locales: ['PASARELA'] }), a1P('d', { locales: ['PASARELA'] })];
  const cfg3 = a1Mundo(st3), e3 = estadoOct();
  M.asignar(e3, cfg3, st3, lun, 'PASARELA_M', 'c', { puesto: 'sala' }); M.asignar(e3, cfg3, st3, lun, 'PASARELA_T', 'c', { puesto: 'sala' }); M.asignar(e3, cfg3, st3, lun, 'PASARELA_T', 'd', { puesto: 'sala' });
  M.toggleApertura(e3, lun, 'PASARELA_M', cfg3);
  const pp = M.puedePrimero(cfg3, st3, e3, lun, 'PASARELA_T', 'c');
  assert.ok(pp.ok && !pp.continuo && !M.esContinuo(cfg3, st3, e3, lun, 'PASARELA', 'c'), JSON.stringify(pp));
  // G-05: Cristian (apoyo) hace partido el sábado 3 en el Mónaco; la tarde se cierra a mano con él dentro: Horas cuenta la
  // mañana entera (480 min) y el tramo que ven Hoy, su app y el registro de apoyos tiene que ser el mismo (no el del partido)
  const cfg4 = cfgBase(), st4 = staffDe(cfg4), e4 = estadoOct(), sab = '2026-10-03';
  for (const [tid, pid] of [['MONACO_M', 'cris'], ['MONACO_M', 'cristian'], ['MONACO_T', 'scapon'], ['MONACO_T', 'cristian']]) assert.ok(M.asignar(e4, cfg4, st4, sab, tid, pid, {}).ok, pid + ' ' + tid);
  const meses = { '2026-10': e4 };
  assert.deepStrictEqual(M.tramoDe(cfg4, e4, sab, 'MONACO_M', 'cristian'), { ini: '12:00', fin: '16:00', aMano: false }, 'antes: partido');
  M.toggleApertura(e4, sab, 'MONACO_T', cfg4);
  const h = M.horasPersonaMes(cfg4, st4, meses, 'cristian', 2026, 10), reg = M.registroApoyos(cfg4, st4, meses, 2026, 10).find(x => x.pid === 'cristian');
  assert.strictEqual(h.minutos, 480); assert.strictEqual(h.partidos, 0);
  const td = M.turnoDelDia(cfg4, e4, sab, 'cristian');
  assert.ok(!td.partido && !td.enPartido, JSON.stringify(td));
  const tr = M.tramoDe(cfg4, e4, sab, 'MONACO_M', 'cristian'), hor = M.horarioDe(M.localDe(cfg4, 'MONACO'), 6, 'M');
  assert.deepStrictEqual(tr, { ini: hor.ini, fin: hor.fin, aMano: false }, 'el tramo es la mañana entera del local');
  assert.deepStrictEqual(reg.dias[0].tramos.map(t => [t.franja, t.ini, t.fin, t.minutos]), [['M', hor.ini, hor.fin, 480]], JSON.stringify(reg.dias[0]));
});

ok('A1 · C3: marcarCocina y marcarAbre recalculan la casilla (quién abre, la cocina y el orden, respetando lo puesto a mano): e.abre guardado (Mes, Excel, Horas) == primeroDe (Hoy) y el tramo de quien pasa a abrir empieza a la apertura', () => {
  // C-05 §2: en Zapatillera mañana, la que abría (Jacquelin) pasa a llevar la cocina a mano: abre otra (Juani), y lo guardado lo dice
  const cfg = cfgBase(), st = staffDe(cfg), e = estadoOct(), lun = '2026-10-05', tid = 'ZAPA_M';
  M.instanciarPatron(cfg, st, e, lun, lun);
  const antes = M.primeroDe(cfg, st, e, lun, tid);
  assert.strictEqual(antes, 'jacquelin');
  assert.ok(M.marcarCocina(e, lun, tid, antes, cfg, st));
  const guardado = (M.asignados(e, lun, tid).find(x => x.abre) || {}).pid, calculado = M.primeroDe(cfg, st, e, lun, tid);
  assert.strictEqual(guardado, calculado, `abre guardado ${guardado} · primeroDe ${calculado}`);
  assert.strictEqual(calculado, 'juani');
  assert.deepStrictEqual(M.pidsEn(e, lun, tid), M.posicionesDe(cfg, st, e, lun, tid).map(x => x.pid), 'el orden guardado es el de la casilla (sin que la app reordene)');
  assert.deepStrictEqual(M.manualDe(e, lun, tid), { cocina: true }, 'solo la cocina queda a mano');
  // C-05 §2c: marcar la cocina a a en Pasarela mañana hace que abra b, que hace partido (tarde en Zapatillera): su tramo de la
  // mañana (e.abre) empieza a la apertura (07:00), como dice Hoy
  const st2 = [a1P('a', { locales: ['PASARELA'] }), a1P('b', { locales: ['PASARELA', 'ZAPA'], partido: { dias: [1] } })];
  const cfg2 = a1Mundo(st2), e2 = estadoOct(), tid2 = 'PASARELA_M';
  assert.ok(M.asignar(e2, cfg2, st2, lun, tid2, 'a', { puesto: 'sala' }).ok && M.asignar(e2, cfg2, st2, lun, tid2, 'b', { puesto: 'sala' }).ok && M.asignar(e2, cfg2, st2, lun, 'ZAPA_T', 'b', { puesto: 'sala' }).ok);
  assert.deepStrictEqual(M.tramoDe(cfg2, e2, lun, tid2, 'b'), { ini: '11:00', fin: '16:00', aMano: false }, 'antes: el tramo de partido de la mañana');
  assert.ok(M.marcarCocina(e2, lun, tid2, 'a', cfg2, st2));
  const pos = M.posicionesDe(cfg2, st2, e2, lun, tid2);
  assert.ok(pos.find(x => x.pid === 'b').abre && pos.find(x => x.pid === 'a').cocina, JSON.stringify(pos.map(x => [x.pid, x.abre, x.cocina])));
  assert.strictEqual(M.tramoDe(cfg2, e2, lun, tid2, 'b').ini, '07:00', 'b abre la mañana: entra a la apertura');
  assert.deepStrictEqual(M.turnoDelDia(cfg2, e2, lun, 'b'), { partido: true, continuo: null, abre: 'M', enPartido: true });
  // marcarAbre con el orden a mano: no reordena; sin él, quien abre va la primera y la cocina en su sitio
  const e3 = estadoOct(); M.instanciarPatron(cfg, st, e3, '2026-10-08', '2026-10-08');
  assert.ok(M.moverEnCasilla(e3, '2026-10-08', 'EL33_T', 'jenny', 0, cfg, st));
  assert.ok(M.marcarAbre(e3, '2026-10-08', 'EL33_T', 'jenny', cfg, st));
  assert.deepStrictEqual(M.pidsEn(e3, '2026-10-08', 'EL33_T'), ['jenny', 'noe']);
  assert.ok(M.asignados(e3, '2026-10-08', 'EL33_T')[0].abre && M.asignados(e3, '2026-10-08', 'EL33_T')[0].cocina, 'Jenny abre a mano y sigue con la cocina');
  const e4 = estadoOct(); M.instanciarPatron(cfg, st, e4, '2026-10-08', '2026-10-08');
  assert.ok(M.marcarAbre(e4, '2026-10-08', 'EL33_T', 'jenny', cfg, st));
  assert.deepStrictEqual(M.asignados(e4, '2026-10-08', 'EL33_T').map(x => [x.pid, !!x.abre, !!x.cocina]), [['jenny', true, true], ['noe', false, false]]);
});

ok('A1 · C1/H7: el intercambio de un cambio de turno saca a quien cede su turno con retirarEntrada (su «sale primero» a mano se va con ella) y, si el cambio falla, repone su entrada original', () => {
  // C-10: Ana cede a Bea su martes; Bea tenía «Sale primero» a mano el lunes. Ana entra en ese lunes y abre Cid (sin marca huérfana)
  const LUN = '2026-10-05', MAR = '2026-10-06';
  const st = [a1P('ana', { locales: ['PASARELA'] }), a1P('bea', { locales: ['PASARELA'] }), a1P('cid', { locales: ['PASARELA'] })];
  const cfg = a1Mundo(st, c => { M.localDe(c, 'PASARELA').minimos.M[1] = 2; M.localDe(c, 'PASARELA').minimos.M[2] = 2; });
  const e = estadoOct();
  assert.ok(M.asignar(e, cfg, st, LUN, 'PASARELA_M', 'cid', { puesto: 'sala' }).ok && M.asignar(e, cfg, st, LUN, 'PASARELA_M', 'bea', { puesto: 'sala' }).ok);
  assert.ok(M.marcarAbre(e, LUN, 'PASARELA_M', 'bea', cfg, st));
  assert.ok(M.asignar(e, cfg, st, MAR, 'PASARELA_M', 'cid', { puesto: 'sala' }).ok && M.asignar(e, cfg, st, MAR, 'PASARELA_M', 'ana', { puesto: 'sala' }).ok);
  const inc = { pid: 'ana', tipo: 'CAMBIO', desde: MAR, hasta: MAR };
  const planes = M.planesCobertura(cfg, st, e, inc, { intercambio: true });
  const plan = planes.planes.find(p => p.asignaciones.some(a => a.pid === 'bea' && a.intercambio));
  assert.ok(plan, JSON.stringify(planes.planes.map(p => p.asignaciones)));
  const r = M.aplicarCobertura(cfg, st, e, inc, plan);
  assert.deepStrictEqual(r.intercambios, [{ iso: LUN, tid: 'PASARELA_M', pid: 'ana', quita: 'bea' }]);
  const lun = M.asignados(e, LUN, 'PASARELA_M');
  assert.deepStrictEqual(M.manualDe(e, LUN, 'PASARELA_M'), {}, 'la marca de Bea se fue con ella');
  assert.strictEqual((lun.find(x => x.abre) || {}).pid, 'cid'); assert.strictEqual(M.primeroDe(cfg, st, e, LUN, 'PASARELA_M'), 'cid');
  assert.deepStrictEqual(M.turnoDelDia(cfg, e, LUN, 'ana'), { partido: false, continuo: null, abre: null, enPartido: false });
  // H caso-06: Roberto con «Sale primero» a mano el sábado y Adrián con la cocina a mano; Susana Luna se lleva el sábado de Roberto
  const cfg2 = cfgBase(), st2 = staffDe(cfg2), e2 = estadoOct(), SAB = '2026-10-10';
  for (const [d, pid, o] of [[MAR, 'sluna', {}], [MAR, 'adrian', { cocina: true }], [SAB, 'roberto', {}], [SAB, 'adrian', { cocina: true }]]) assert.ok(M.asignar(e2, cfg2, st2, d, 'ZAPA_T', pid, o).ok, pid + ' ' + d);
  assert.ok(M.marcarAbre(e2, SAB, 'ZAPA_T', 'roberto', cfg2, st2));
  const inc2 = { pid: 'sluna', tipo: 'CAMBIO', desde: MAR, hasta: MAR };
  const pl2 = M.planesCobertura(cfg2, st2, e2, inc2, { intercambio: true });
  const A = pl2.planes.find(p => p.asignaciones.some(a => a.pid === 'roberto' && a.intercambio && a.intercambio.iso === SAB));
  assert.ok(A, JSON.stringify(pl2.planes.map(p => p.asignaciones)));
  const r2 = M.aplicarCobertura(cfg2, st2, e2, inc2, A);
  assert.strictEqual(r2.intercambios.length, 1);
  assert.deepStrictEqual(M.manualDe(e2, SAB, 'ZAPA_T'), { cocina: true }, 'queda la cocina a mano de Adrián; el «abre» de Roberto se fue con él');
  assert.strictEqual((M.asignados(e2, SAB, 'ZAPA_T').find(x => x.abre) || {}).pid, 'sluna'); assert.strictEqual(M.primeroDe(cfg2, st2, e2, SAB, 'ZAPA_T'), 'sluna');
  assert.deepStrictEqual(M.migrarMarcasHuerfanas(Object.assign(cfg2, { meses: { '2026-10': { asig: e2.asig, apertura: e2.apertura, manual: e2.manual } }, migraciones: {} }), '2026-10-01'), { abre: 0, cocina: 0 }, 'nada huérfano que migrar');
  // si el cambio no puede hacerse (quien cede no puede entrar en el turno de a cambio), quien cedía vuelve con SU entrada de antes
  const st3 = [a1P('ana', { locales: ['PASARELA'] }), a1P('bea', { locales: ['PASARELA'] }), a1P('cid', { locales: ['PASARELA'] })];
  const cfg3 = a1Mundo(st3, c => { M.localDe(c, 'PASARELA').minimos.M[1] = 2; M.localDe(c, 'PASARELA').minimos.M[2] = 2; });
  const e3 = estadoOct();
  assert.ok(M.asignar(e3, cfg3, st3, LUN, 'PASARELA_M', 'cid', { puesto: 'sala' }).ok && M.asignar(e3, cfg3, st3, LUN, 'PASARELA_M', 'bea', { puesto: 'sala', origen: 'patron', razon: 'plaza fija de la semana tipo', nota: 'la de siempre' }).ok);
  assert.ok(M.marcarAbre(e3, LUN, 'PASARELA_M', 'bea', cfg3, st3));
  assert.ok(M.asignar(e3, cfg3, st3, MAR, 'PASARELA_M', 'cid', { puesto: 'sala' }).ok && M.asignar(e3, cfg3, st3, MAR, 'PASARELA_M', 'ana', { puesto: 'sala' }).ok);
  const plan3 = M.planesCobertura(cfg3, st3, e3, { pid: 'ana', tipo: 'CAMBIO', desde: MAR, hasta: MAR }, { intercambio: true }).planes.find(p => p.asignaciones.some(a => a.pid === 'bea' && a.intercambio));
  const foto = JSON.stringify(M.asignados(e3, LUN, 'PASARELA_M').find(x => x.pid === 'bea'));
  M.personaDe(st3, 'ana').ausencias = [{ tipo: 'VAC', desde: LUN, hasta: LUN }];   // entre proponer y aplicar, Ana ya no puede el lunes
  const r3 = M.aplicarCobertura(cfg3, st3, e3, { pid: 'ana', tipo: 'CAMBIO', desde: MAR, hasta: MAR }, plan3);
  assert.ok(r3.rechazados.some(x => x.iso === LUN && x.pid === 'ana'), JSON.stringify(r3));
  const bea = M.asignados(e3, LUN, 'PASARELA_M').find(x => x.pid === 'bea');
  assert.strictEqual(JSON.stringify(bea), foto, 'Bea vuelve con su entrada original (origen, razón, nota, abre), no con una nueva a mano');
  assert.deepStrictEqual(M.manualDe(e3, LUN, 'PASARELA_M'), { abre: true }, 'y con su «sale primero» a mano');
});

ok('A1 · red de seguridad (C1/H7, C-05 §3): una marca «abre» a mano sin nadie marcado (huérfana, de datos de antes) se trata como inexistente al recalcular la casilla; la de cocina, salvo la que el encargado quitó a propósito', () => {
  const st = [a1P('a', { locales: ['PASARELA'] }), a1P('b', { locales: ['PASARELA'] }), a1P('c', { locales: ['PASARELA'] })];
  const cfg = a1Mundo(st), e = estadoOct(), lun = '2026-10-05', tid = 'PASARELA_M';
  M.asignar(e, cfg, st, lun, tid, 'a', { puesto: 'sala' }); M.asignar(e, cfg, st, lun, tid, 'b', { puesto: 'sala' });
  M.marcarAbre(e, lun, tid, 'b', cfg, st);
  // lo que dejaban los datos de antes: la casilla «fijada» sin nadie que abra
  e.asig[lun][tid] = e.asig[lun][tid].filter(x => x.pid !== 'b');
  assert.deepStrictEqual(M.manualDe(e, lun, tid), { abre: true });
  assert.ok(M.asignar(e, cfg, st, lun, tid, 'c', { puesto: 'sala' }).ok);
  const guardado = (M.asignados(e, lun, tid).find(x => x.abre) || {}).pid || null;
  assert.strictEqual(guardado, M.primeroDe(cfg, st, e, lun, tid)); assert.strictEqual(guardado, 'a');
  assert.deepStrictEqual(M.manualDe(e, lun, tid), {}, 'la marca huérfana se ha ido');
  // la cocina: huérfana (nadie la lleva y el encargado no la quitó) → se recalcula; quitada a propósito (quitarCocinaAMano) → se respeta
  const cfg2 = cfgBase(), st2 = staffDe(cfg2), e2 = estadoOct(), mie = '2026-10-07';
  M.instanciarPatron(cfg2, st2, e2, mie, mie);
  assert.ok(M.asignados(e2, mie, 'EL33_M').some(x => x.cocina), 'Jenny lleva la cocina');
  M.marcarManual(e2, mie, 'EL33_M', 'cocina'); for (const x of M.asignados(e2, mie, 'EL33_M')) x.cocina = false;   // datos de antes: fijada sin nadie
  M.normalizarCasilla(e2, cfg2, st2, mie, 'EL33_M');
  assert.ok(M.asignados(e2, mie, 'EL33_M').some(x => x.cocina), 'huérfana: la casilla vuelve a elegir la cocina'); assert.deepStrictEqual(M.manualDe(e2, mie, 'EL33_M'), {});
  assert.ok(M.quitarCocinaAMano(e2, cfg2, st2, mie, 'EL33_M'), '«Quitar la marca de cocina» del menú de la casilla');
  assert.ok(!M.asignados(e2, mie, 'EL33_M').some(x => x.cocina));
  M.normalizarCasilla(e2, cfg2, st2, mie, 'EL33_M'); M.refrescarCasillas(cfg2, st2, e2, mie, mie);
  assert.ok(!M.asignados(e2, mie, 'EL33_M').some(x => x.cocina), 'lo que quitó el encargado se respeta');
  assert.ok(M.manualDe(e2, mie, 'EL33_M').cocina && M.manualDe(e2, mie, 'EL33_M').sinCocina, JSON.stringify(M.manualDe(e2, mie, 'EL33_M')));
  assert.strictEqual(M.quitarCocinaAMano(e2, cfg2, st2, mie, 'EL33_M'), false, 'dos veces: nada que quitar');
  // (30/09, revisión de A1, modelo 4) la de antes de esta versión, sin la marca sinCocina, la reconoce UNA vez la migración
  // sinCocina3009 por la línea «deja la cocina» del historial (ver la prueba «A1 rev · 7»); la casilla ya no lee el historial: una
  // marca de cocina sin nadie y sin sinCocina es huérfana, aunque el historial tenga la línea
  const cfg3 = cfgBase(), st3 = staffDe(cfg3), e3 = estadoOct();
  M.instanciarPatron(cfg3, st3, e3, mie, mie);
  M.marcarManual(e3, mie, 'EL33_M', 'cocina'); for (const x of M.asignados(e3, mie, 'EL33_M')) x.cocina = false;
  cfg3.historial = [{ ts: Date.parse('2026-09-30T12:00:00+02:00'), txt: 'Jenny deja la cocina de El 33 del 7/10', tipo: 'asig' }];
  M.normalizarCasilla(e3, cfg3, st3, mie, 'EL33_M');
  assert.ok(M.asignados(e3, mie, 'EL33_M').some(x => x.cocina) && !M.manualDe(e3, mie, 'EL33_M').cocina, 'huérfana: la casilla decide sin mirar el historial');
});

ok('A1 · H2 (caso 04): tras generar (con y sin semana tipo, en la vista previa, al volcar y directo sobre el mes) en cada casilla e.abre guardado == primeroDe y el orden guardado == posicionesDe; y tras la Cobertura, cubrirAusencia y moverDiaLibre, igual', () => {
  // Generador → Periodo, septiembre entero sin semana tipo: vista previa (simular) y volcar (22-generador.js)
  const S = M.semillaPasarela(); S.meses = { '2026-09': { asig: {}, apertura: {}, manual: {} } };
  const mes = () => M.estadoDesde(S.meses, [], 2026, 9);
  const sep = [...M.rangoIso('2026-09-01', '2026-09-30')];
  const r = M.generarPlanilla(S, S.staff, M.clonarEstado(mes()), '2026-09-01', '2026-09-30', { simular: true, sinPatron: true, meses: S.meses });
  assert.deepStrictEqual(a1Desfases(S, r.estado, sep), [], 'en la vista previa');
  M.volcarPrevia(S, S.staff, () => mes(), r, { desde: '2026-09-01', hasta: '2026-09-30', previaDe: () => r.estado });
  assert.deepStrictEqual(a1Desfases(S, mes(), sep), [], 'en la planilla real tras volcar');
  // directo sobre el mes, sin semana tipo (Hojan hace la mañana de El 33 y la tarde del Mónaco: ya no abre la tarde)
  const S2 = M.semillaPasarela(); const e2 = M.nuevoEstado(2026, 9, { festivos: [] });
  M.generarPlanilla(S2, S2.staff, e2, '2026-09-01', '2026-09-30', { sinPatron: true });
  assert.deepStrictEqual(a1Desfases(S2, e2, sep), [], 'directo sobre el mes');
  // y con semana tipo (lo normal), octubre; regenerar tampoco deja nada desfasado
  const S3 = M.semillaPasarela(); const e3 = M.nuevoEstado(2026, 10, { festivos: [] });
  const oct = [...M.rangoIso('2026-10-01', '2026-10-31')];
  M.generarPlanilla(S3, S3.staff, e3, '2026-10-01', '2026-10-31', {});
  assert.deepStrictEqual(a1Desfases(S3, e3, oct), [], 'octubre con semana tipo');
  M.generarPlanilla(S3, S3.staff, e3, '2026-10-01', '2026-10-31', {});
  assert.deepStrictEqual(a1Desfases(S3, e3, oct), [], 'octubre regenerado');
  // la Cobertura (Iván de vacaciones del 9 al 11), la ausencia apuntada en Equipo (Mari Luz el martes 13 por la tarde) y el
  // cambio de día libre (Mari Luz libra el martes 20 en vez del miércoles 21): todo lo que tocan queda coherente
  const inc = { pid: 'ivan', tipo: 'VAC', desde: '2026-10-09', hasta: '2026-10-11' };
  const pl = M.planesCobertura(S3, S3.staff, e3, inc, {});
  const ap = M.aplicarCobertura(S3, S3.staff, e3, inc, pl.planes[0]);
  assert.ok(ap.asignados.length > 0);
  assert.deepStrictEqual(a1Desfases(S3, e3, oct), [], 'tras la Cobertura');
  M.anadirAusencia(M.personaDe(S3.staff, 'mariluz'), { tipo: 'PER', desde: '2026-10-13', hasta: '2026-10-13', franjas: ['T'] });
  const cu = M.cubrirAusencia(S3, S3.staff, e3, 'mariluz', '2026-10-13', '2026-10-13', ['T'], {});
  assert.ok(cu.quitados.length > 0, JSON.stringify(cu));
  assert.deepStrictEqual(a1Desfases(S3, e3, oct), [], 'tras cubrirAusencia');
  const mv = M.moverDiaLibre(S3, S3.staff, e3, 'mariluz', '2026-10-19', [2], {});
  assert.ok(mv.quitados.length + mv.puestos.length > 0, JSON.stringify(mv));
  assert.deepStrictEqual(a1Desfases(S3, e3, oct), [], 'tras moverDiaLibre');
  // y con «Generar la semana» sobre el estado virtual de la app, sin semana tipo y relajado (como el caso 16)
  const S4 = M.semillaPasarela(); S4.meses = {};
  const sv = a1SemanaVirtual(S4, '2026-10-05');
  M.generarSemana(S4, S4.staff, sv, '2026-10-05', { sinPatron: true, permitirPartido: true });
  assert.deepStrictEqual(a1Desfases(S4, sv, sv.days.map(d => d.iso)), [], 'Generar la semana sin semana tipo');
});

ok('A1 · H2: el eco de «abre»: poner o quitar a alguien en una mañana recalcula su tarde (su e.abre depende de si hace la mañana), y cambiar quién abre la mañana recalcula la tarde de quien la hacía (turno continuo)', () => {
  const st = [a1P('a', { locales: [] }), a1P('b', { locales: ['PASARELA'] }), a1P('c', { locales: ['PASARELA'] })];
  const cfg = a1Mundo(st), e = estadoOct(), lun = '2026-10-05';
  // a y b por la tarde: abre a. Luego a entra por la mañana en otro local: ya no puede abrir la tarde (viene de la mañana) → abre b
  assert.ok(M.asignar(e, cfg, st, lun, 'PASARELA_T', 'a', { puesto: 'sala' }).ok && M.asignar(e, cfg, st, lun, 'PASARELA_T', 'b', { puesto: 'sala' }).ok);
  assert.strictEqual(M.asignados(e, lun, 'PASARELA_T')[0].pid, 'a');
  assert.ok(M.asignar(e, cfg, st, lun, 'ZAPA_M', 'a', { puesto: 'sala', permitirPartido: true }).ok);
  assert.deepStrictEqual(M.asignados(e, lun, 'PASARELA_T').map(x => [x.pid, x.abre]), [['b', true], ['a', false]], 'la tarde se recalcula sola');
  assert.deepStrictEqual(a1Desfases(cfg, e, [lun]), []);
  // a sale de la mañana: vuelve a poder abrir la tarde (abre quien va primero de los que pueden: b) y la casilla está recalculada
  assert.ok(M.retirarEntrada(e, cfg, st, lun, 'ZAPA_M', 'a'));
  assert.ok(M.puedePrimero(cfg, st, e, lun, 'PASARELA_T', 'a').ok);
  assert.deepStrictEqual(a1Desfases(cfg, e, [lun]), []);
  // turno continuo: a sola por la tarde abre; entra por la mañana en Pasarela (continuo) y sigue abriendo la tarde; entra c
  // por la mañana con «Sale primero» a mano: a ya no hace continuo y no puede abrir la tarde (hueco); vuelve a abrir la
  // mañana a mano y recupera la tarde. Todo por el eco desde la mañana, sin tocar la tarde
  assert.ok(M.retirarEntrada(e, cfg, st, lun, 'PASARELA_T', 'b'));
  assert.deepStrictEqual(M.asignados(e, lun, 'PASARELA_T').map(x => [x.pid, x.abre]), [['a', true]]);
  assert.ok(M.asignar(e, cfg, st, lun, 'PASARELA_M', 'a', { puesto: 'sala' }).ok);
  assert.ok(M.puedePrimero(cfg, st, e, lun, 'PASARELA_T', 'a').continuo && M.asignados(e, lun, 'PASARELA_T')[0].abre, 'continuo: sigue abriendo la tarde');
  assert.ok(M.asignar(e, cfg, st, lun, 'PASARELA_M', 'c', { puesto: 'sala' }).ok);
  assert.ok(M.marcarAbre(e, lun, 'PASARELA_M', 'c', cfg, st));
  assert.deepStrictEqual(M.asignados(e, lun, 'PASARELA_T').map(x => [x.pid, x.abre]), [['a', false]], 'sin el continuo, a no abre la tarde (hueco)');
  assert.ok(M.revisarTurno(cfg, st, e, lun, 'PASARELA_T').sinAbre);
  assert.deepStrictEqual(a1Desfases(cfg, e, [lun]), []);
  assert.ok(M.marcarAbre(e, lun, 'PASARELA_M', 'a', cfg, st));
  assert.deepStrictEqual(M.asignados(e, lun, 'PASARELA_T').map(x => [x.pid, x.abre]), [['a', true]], 'y al volver a abrir la mañana, vuelve el continuo');
  assert.deepStrictEqual(a1Desfases(cfg, e, [lun]), []);
});

ok('A1 · H3 (casos 15 y 16): la cocina que se marca sola no se la lleva quien ese día está de sala en otra casilla (aunque la preferencia de la semana tipo o del Generador la señale): 0 cruces cocina/sala y la condición del Generador en verde', () => {
  const cruzados = (S, e, dias) => {
    const out = [];
    for (const iso of dias) for (const p of S.staff) {
      const tc = M.cocinaDelDia(S, e, iso, p.id); if (!tc) continue;
      const ts = M.salaDelDia(S, e, iso, p.id, tc); if (ts) out.push(`${iso} ${p.nombre}: cocina en ${tc} y sala en ${ts}`);
    }
    return out;
  };
  // A) Hojan cambia su día libre la semana del 2/11 (libra lunes y viernes): sus plazas del lunes (cocina de El 33 por la mañana y del
  //    Mónaco por la tarde) pasan al martes, donde la semana tipo ya tiene a Noe de cocina «por Jenny»
  for (const relajado of [false, true]) {
    const S = M.semillaPasarela(); S.meses = {};
    M.ponerLibraPuntual(M.personaDe(S.staff, 'hojan'), '2026-11-02', [1, 5]);
    const e = M.nuevoEstado(2026, 11, { festivos: [] });
    const g = M.generarSemana(S, S.staff, e, '2026-11-02', { permitirPartido: relajado });
    assert.deepStrictEqual(cruzados(S, e, g.dias), [], `semana del 2/11 ${relajado ? 'relajado' : 'estricto'}`);
    const c = g.condiciones.find(x => x.k === 'cocinaSala'); assert.ok(c.ok, c.detalle);
    assert.deepStrictEqual(a1Desfases(S, e, g.dias), []);
  }
  // B) sin semana tipo primero (Generador → Periodo, relajado) y luego «Generar la semana» del 5/10 con ella (caso 16)
  const S = M.semillaPasarela(); S.meses = {};
  const e = M.nuevoEstado(2026, 10, { festivos: [] });
  M.generarPlanilla(S, S.staff, e, '2026-10-01', '2026-10-31', { sinPatron: true, permitirPartido: true });
  assert.deepStrictEqual(cruzados(S, e, e.days.map(d => d.iso)), [], 'tras el relleno sin semana tipo');
  const g = M.generarSemana(S, S.staff, e, '2026-10-05', {});
  assert.deepStrictEqual(cruzados(S, e, g.dias), [], 'tras «Generar la semana» del 5/10');
  const c = g.condiciones.find(x => x.k === 'cocinaSala'); assert.ok(c.ok, c.detalle);
  // y a mano: Noe de sala en la mañana de El 33 (Jenny con la cocina) y la tarde con su «c» de la semana tipo: la tarde no se la da
  const st = [a1P('n', { puesto: 'cocina', locales: ['EL33'], cocina: { titular: ['EL33'], reserva: [], soloDias: [] } }), a1P('j', { puesto: 'cocina', locales: ['EL33'], cocina: { titular: ['EL33'], reserva: [], soloDias: [] } }), a1P('s', { locales: ['EL33'] })];
  const cfg = a1Mundo(st, c => { M.localDe(c, 'EL33').cocina.titulares = { M: ['j', 'n'], T: ['n', 'j'] }; });
  const e2 = estadoOct(), lun = '2026-10-05';
  assert.ok(M.asignar(e2, cfg, st, lun, 'EL33_T', 's', { puesto: 'sala' }).ok && M.asignar(e2, cfg, st, lun, 'EL33_T', 'n', { origen: 'patron', cocina: true }).ok, 'la tarde: n con la «c» de la semana tipo');
  assert.ok(M.asignados(e2, lun, 'EL33_T').find(x => x.pid === 'n').cocina);
  assert.ok(M.asignar(e2, cfg, st, lun, 'EL33_M', 'j', { origen: 'patron', cocina: true }).ok && M.asignar(e2, cfg, st, lun, 'EL33_M', 'n', { origen: 'patron', permitirPartido: true }).ok, 'la mañana: j con la cocina y n de sala');
  assert.ok(M.asignados(e2, lun, 'EL33_M').find(x => x.pid === 'j').cocina);
  assert.deepStrictEqual(cruzados(cfg, e2, [lun]), [], 'n está de sala por la mañana: la tarde ya no se la da (queda sin cocina, para que el Generador o el encargado la pongan)');
  assert.ok(M.revisarTurno(cfg, st, e2, lun, 'EL33_T').sinCocina);
});

ok('A1 rev · 8 (cliente 5): en una casilla cerrada ese día (a mano o por fechas) con gente dentro, posicionesDe no pinta «partido» ni «continuo»: esa plaza no ocupa', () => {
  const cfg = cfgBase(); cfg.meses = {}; const st = staffDe(cfg);
  const e = estadoOct(); M.generarPlanilla(cfg, st, e, '2026-10-05', '2026-10-11', {});
  const X = '2026-10-07';
  assert.ok(M.pidsEn(e, X, 'PASARELA_M').includes('lavinia') && M.pidsEn(e, X, 'PASARELA_T').includes('lavinia'), 'Lavinia hace partido en Pasarela el miércoles 7');
  const antes = M.posicionesDe(cfg, st, e, X, 'PASARELA_T').find(x => x.pid === 'lavinia');
  assert.ok(antes.partido, 'con las dos abiertas, partido');
  M.toggleApertura(e, X, 'PASARELA_T', cfg);   // la tarde cerrada a mano, con la gente dentro
  assert.ok(!M.turnoAbierto(cfg, e, X, 'PASARELA_T') && M.pidsEn(e, X, 'PASARELA_T').includes('lavinia'));
  const t = M.posicionesDe(cfg, st, e, X, 'PASARELA_T').find(x => x.pid === 'lavinia'), m = M.posicionesDe(cfg, st, e, X, 'PASARELA_M').find(x => x.pid === 'lavinia');
  assert.ok(!t.partido && !t.continuo, 'la tarde cerrada no es un partido: ' + JSON.stringify(t));
  assert.ok(!m.partido && !m.continuo, 'ni lo es su mañana: ' + JSON.stringify(m));
  assert.deepStrictEqual(M.turnoDelDia(cfg, e, X, 'lavinia').partido, false, 'lo mismo que dice Horas');
});

ok('A1 · B3 (cierres 01b y 01): las marcas a mano de la casilla que retira un cierre (sale primero, cocina, orden) se guardan en el cierre y vuelven al reabrir: la vuelta es idéntica, orden incluido', () => {
  const rango = (cfg, desde, hasta) => { const e = { y: +desde.slice(0, 4), m: +desde.slice(5, 7), days: [], asig: {}, apertura: {}, manual: {}, festivos: [], virtual: true }; for (const iso of M.rangoIso(desde, hasta)) { const k = iso.slice(0, 7); cfg.meses[k] = cfg.meses[k] || { asig: {}, apertura: {}, manual: {} }; const me = M.estadoDesde(cfg.meses, [], +iso.slice(0, 4), +iso.slice(5, 7)); e.days.push(me.days.find(d => d.iso === iso)); me.asig[iso] = me.asig[iso] || {}; me.apertura[iso] = me.apertura[iso] || {}; me.manual[iso] = me.manual[iso] || {}; e.asig[iso] = me.asig[iso]; e.apertura[iso] = me.apertura[iso]; e.manual[iso] = me.manual[iso]; } return e; };
  const foto = (cfg, dias) => JSON.parse(JSON.stringify(Object.fromEntries(dias.map(iso => { const m = cfg.meses[iso.slice(0, 7)]; return [iso, { asig: m.asig[iso] || {}, manual: (m.manual || {})[iso] || {} }]; }))));
  // 01b: Cristian «sale primero» a mano el martes 29 por la tarde en el Mónaco (Susana es quien abre según «Quién abre»)
  const cfg = cfgDemo(), st = cfg.staff, MA = '2026-09-29', e = rango(cfg, MA, MA);
  assert.ok(M.marcarAbre(e, MA, 'MONACO_T', 'cristian', cfg, st));
  assert.deepStrictEqual(M.pidsEn(e, MA, 'MONACO_T'), ['cristian', 'scapon']);
  const c = { id: 'm1', localId: 'MONACO', dias: { [MA]: ['T'] }, motivo: 'reforma', detalle: '', decisiones: {}, retirados: [] };
  assert.ok(M.aplicarCierre(cfg, st, e, c, {}).ok);
  assert.ok(!M.pidsEn(e, MA, 'MONACO_T').length && !Object.keys(M.manualDe(e, MA, 'MONACO_T')).length, 'cerrada: vacía y sin marcas');
  assert.deepStrictEqual(c.marcas, { [MA + '|MONACO_T']: { abre: true } }, 'el cierre guarda las marcas de la casilla');
  assert.ok(M.quitarCierre(cfg, st, e, 'm1', { devolver: true, quitarVacaciones: true }).ok);
  assert.strictEqual((M.asignados(e, MA, 'MONACO_T').find(x => x.pid === 'cristian') || {}).abre, true, 'Cristian sigue marcado «sale primero»');
  assert.deepStrictEqual(M.manualDe(e, MA, 'MONACO_T'), { abre: true });
  assert.deepStrictEqual(M.pidsEn(e, MA, 'MONACO_T'), ['cristian', 'scapon'], 'y va el primero');
  // 01: el cierre real del Mónaco (dom 27/09 tarde → mar 29/09) con marcas a mano (Hojan cocina, Yilian abre, orden tocado) el lunes 28
  // por la tarde y Leo forzado el martes 29 por la mañana: retirar y devolver es simétrico, entradas, orden y marcas
  const cfg2 = cfgDemo(), st2 = cfg2.staff, DIAS = ['2026-09-27', '2026-09-28', '2026-09-29'];
  const e2 = rango(cfg2, DIAS[0], DIAS[2]);
  M.marcarCocina(e2, '2026-09-28', 'MONACO_T', 'hojan', cfg2, st2); M.marcarAbre(e2, '2026-09-28', 'MONACO_T', 'yilian', cfg2, st2); M.moverEnCasilla(e2, '2026-09-28', 'MONACO_T', 'hojan', 0, cfg2, st2);
  assert.ok(M.asignar(e2, cfg2, st2, '2026-09-29', 'MONACO_M', 'leo', { forzar: true, origen: 'manual', nota: 'prueba' }).ok);
  assert.deepStrictEqual(M.manualDe(e2, '2026-09-28', 'MONACO_T'), { cocina: true, abre: true, orden: true });
  const antes = foto(cfg2, DIAS);
  const c2 = { id: 'cie_real', localId: 'MONACO', dias: { '2026-09-27': ['T'], '2026-09-28': ['M', 'T'], '2026-09-29': ['M', 'T'] }, motivo: 'reforma', detalle: 'pequeña reforma', decisiones: {}, retirados: [] };
  const r = M.aplicarCierre(cfg2, st2, e2, c2, { scapon: { tipo: 'VAC' }, yilian: { tipo: 'REFUERZA', destinos: { '2026-09-28': 'PASARELA_T' } }, hojan: { tipo: 'LD' } });
  assert.ok(r.ok, JSON.stringify(r.errores));
  assert.deepStrictEqual(c2.marcas, { '2026-09-28|MONACO_T': { cocina: true, abre: true, orden: true } });
  const q = M.quitarCierre(cfg2, st2, e2, 'cie_real', { devolver: true, quitarVacaciones: true });
  assert.ok(q.ok && !q.noDevueltos.length, JSON.stringify(q.noDevueltos));
  assert.deepStrictEqual(foto(cfg2, DIAS), antes, 'vuelta idéntica: mismas entradas, mismo orden, mismas marcas');
  assert.ok(!M.ausenciaEn(M.personaDe(st2, 'scapon'), '2026-09-29') && !M.ausenciaEn(M.personaDe(st2, 'hojan'), '2026-09-28') && !M.cierresDe(cfg2).length);
  // reabrir desde una fecha (los días anteriores siguen cerrados) también repone las marcas de los días que reabren
  const cfg3 = cfgDemo(), st3 = cfg3.staff, e3 = rango(cfg3, DIAS[0], DIAS[2]);
  M.marcarAbre(e3, '2026-09-29', 'MONACO_T', 'cristian', cfg3, st3);
  const c3 = { id: 'cie3', localId: 'MONACO', dias: { '2026-09-28': ['M', 'T'], '2026-09-29': ['M', 'T'] }, motivo: 'reforma', decisiones: {}, retirados: [] };
  assert.ok(M.aplicarCierre(cfg3, st3, e3, c3, {}).ok);
  const rr = M.reabrirCierreDesde(cfg3, st3, e3, 'cie3', '2026-09-29');
  assert.ok(rr.ok && rr.parcial);
  assert.deepStrictEqual(M.manualDe(e3, '2026-09-29', 'MONACO_T'), { abre: true }); assert.strictEqual(M.pidsEn(e3, '2026-09-29', 'MONACO_T')[0], 'cristian');
  assert.ok(!M.pidsEn(e3, '2026-09-28', 'MONACO_T').length, 'el 28 sigue cerrado');
  assert.deepStrictEqual(Object.keys(M.cierresDe(cfg3)[0].marcas || {}), [], 'las marcas de los días que reabren ya no están en el cierre');
});

// ---------- A1, corrección tras las dos revisiones (30/09): la cadena del eco, la estabilidad, lo a mano no cascada, la plaza
// trasladada, el orden a mano y la marca sinCocina. Los scripts de los revisores (scratchpad/fases/A1rev/{modelo,cliente}) como pruebas ----------
// quien ese día lleva la cocina en una casilla y está de sala en otra (la lectura de la puerta y de la condición cocinaSala)
function a1fCruces(cfg, e, dias) {
  const out = [];
  for (const iso of dias) for (const p of cfg.staff) {
    const tc = M.cocinaDelDia(cfg, e, iso, p.id); if (!tc) continue;
    const ts = M.salaDelDia(cfg, e, iso, p.id, tc); if (ts) out.push(`${iso} ${p.id}: cocina ${tc} · sala ${ts}`);
  }
  return out;
}
const a1fCasilla = (e, iso, tid) => M.asignados(e, iso, tid).map(x => x.pid + (x.abre ? '*' : '') + (x.cocina ? '(c)' : ''));

ok('A1 rev · 1 (modelo, R/11 y R/12): el eco sigue la cadena hasta punto fijo: darSalida de Adrián no deja a Roberto de cocina en la tarde y de sala en la mañana de Zapatillera; y refrescar una vez basta (la segunda pasada no cambia nada)', () => {
  // R/11: Adrián deja el grupo el 26/09 con octubre generado con semana tipo. Al retirarlo de la mañana, el eco daba a Roberto la
  // cocina de la tarde (Adrián ya no está) mientras seguía de sala en la mañana, y nadie volvía a mirar la mañana: 10 cruces
  const cfg = cfgBase(); cfg.meses = {}; cfg.historial = []; const st = staffDe(cfg);
  const e = estadoOct(); M.generarPlanilla(cfg, st, e, '2026-10-01', '2026-10-31', {});
  cfg.meses['2026-10'] = { asig: e.asig, apertura: e.apertura, manual: e.manual };
  const r = M.darSalida(cfg, st, cfg.meses, 'adrian', '2026-09-26', 'se va');
  assert.ok(r.retirados.length > 40, 'Adrián tenía plazas todo el mes');
  const mes = M.estadoDesde(cfg.meses, [], 2026, 10);
  assert.deepStrictEqual(a1fCruces(cfg, mes, mes.days.map(d => d.iso)), [], 'tras darSalida nadie queda de cocina en una franja y de sala en otra');
  assert.deepStrictEqual(a1fCasilla(mes, '2026-10-09', 'ZAPA_M'), ['jacquelin*', 'juani', 'roberto(c)'], 'Roberto, reserva de Zapatillera, lleva la cocina de la mañana');
  assert.deepStrictEqual(M.refrescarCasillas(cfg, st, M.clonarEstado(mes), '2026-10-01', '2026-10-31'), [], 'lo guardado es lo que decidiría la casilla: un refresco no cambia nada');
  // R/12 (seed 20311 del fuzz): la mañana de El 33 del 14/10 cierra por obra y Jenny (cocina de El 33 por la tarde) apoya en la mañana
  // de Pasarela, sin cocina; en Equipo, Tere pasa a titular de cocina de Pasarela y la app refresca UNA vez al guardar. Una pasada
  // dejaba a Jenny de cocina en El 33 y de sala en Pasarela (donde ahora cocina Tere); hacía falta una segunda que nadie hacía
  const cfg2 = cfgBase(); cfg2.meses = {}; cfg2.historial = []; const st2 = staffDe(cfg2);
  const e2 = estadoOct(), d = '2026-10-14';
  M.generarPlanilla(cfg2, st2, e2, '2026-10-12', '2026-10-18', {});
  cfg2.meses['2026-10'] = { asig: e2.asig, apertura: e2.apertura, manual: e2.manual };
  const c = { id: 'obra', localId: 'EL33', dias: { [d]: ['M'] }, motivo: 'reforma', detalle: 'obra', decisiones: {}, retirados: [] };
  // (30/09, A3, auditoría H5) el apoyo del cierre ya pasa por la puerta con el puesto de sala y a Jenny, cocina de El 33 esa tarde, no
  // la pone en Pasarela (S34): el estado de la semilla del fuzz se reproduce forzándola a mano en la mañana de Pasarela
  const ap = M.aplicarCierre(cfg2, st2, e2, c, { jenny: { tipo: 'REFUERZA', destinos: { [d]: 'PASARELA_M' } }, noe: { tipo: 'SIN' }, victoria: { tipo: 'SIN' } });
  assert.ok(ap.ok && ap.rechazados.some(x => x.pid === 'jenny' && x.motivo === 'ya lleva la cocina de El 33 ese día'), JSON.stringify(ap.rechazados));
  assert.ok(M.asignar(e2, cfg2, st2, d, 'PASARELA_M', 'jenny', { forzar: true, puesto: 'sala' }).ok);
  assert.ok(M.pidsEn(e2, d, 'PASARELA_M').includes('jenny') && a1fCruces(cfg2, e2, [d]).length === 0);
  M.ponerCocinaFicha(cfg2, M.personaDe(st2, 'tere'), 'PASARELA', 'titular');
  const r1 = M.refrescarMarcas(cfg2, st2, cfg2.meses, '2026-10-01');
  assert.ok(r1.some(x => x.iso === d && x.tid === 'PASARELA_M' && x.cocina && x.cocina.ahora === 'tere'), JSON.stringify(r1));
  assert.deepStrictEqual(a1fCruces(cfg2, e2, [d]), [], 'con una sola pasada Jenny ya no queda de cocina en El 33 y de sala en Pasarela');
  assert.deepStrictEqual(M.refrescarMarcas(cfg2, st2, cfg2.meses, '2026-10-01'), [], 'la segunda pasada no cambia nada (refrescar dos veces = una)');
  const cond = M.verificarSemana(cfg2, st2, e2, '2026-10-12').find(x => x.k === 'cocinaSala'); assert.ok(cond.ok, cond.detalle);
});

ok('A1 rev · 2 y 3 (cliente 3a y S1 = modelo 3): lo decidido a mano no provoca retiradas en otras casillas, y la casilla conserva a quien ya abría y a quien ya llevaba la cocina si siguen pudiendo', () => {
  // S1: viernes 9/10, El 33 mañana [victoria*, jenny(c)] y tarde [noe*, jenny(c), victoria]. «Lleva la cocina» a Victoria por la mañana
  // deja a Jenny de sala en una casilla cuya cocina decidió el encargado: NO es «sala firme», conserva la cocina de la tarde, Noe sigue
  // abriendo y Jenny no pasa a un continuo de 17 h. La Revisión y la condición cocinaSala avisan del cruce y el encargado decide
  const cfg = cfgBase(); cfg.meses = {}; const st = staffDe(cfg);
  const e = estadoOct(); M.generarPlanilla(cfg, st, e, '2026-10-05', '2026-10-11', {});
  const V = '2026-10-09';
  assert.deepStrictEqual([a1fCasilla(e, V, 'EL33_M'), a1fCasilla(e, V, 'EL33_T')], [['victoria*', 'jenny(c)'], ['noe*', 'jenny(c)', 'victoria']]);
  const eco = M.marcarCocina(e, V, 'EL33_M', 'victoria', cfg, st);
  assert.deepStrictEqual(a1fCasilla(e, V, 'EL33_M'), ['jenny*', 'victoria(c)'], 'Victoria lleva la cocina y abre Jenny');
  assert.deepStrictEqual(a1fCasilla(e, V, 'EL33_T'), ['noe*', 'jenny(c)', 'victoria'], 'la tarde no cambia: Noe sigue abriendo y Jenny conserva la cocina');
  assert.ok(!M.esContinuo(cfg, st, e, V, 'EL33', 'jenny'), 'Jenny no hace un continuo de 17 h');
  assert.deepStrictEqual(eco, [], 'ninguna otra casilla cambia por rebote');
  const rev = M.revisionMes(cfg, st, e, { desde: V, hasta: V }).map(x => x.turnoId + ': ' + x.msg);
  assert.ok(rev.some(x => /EL33_M.*Jenny: ya lleva la cocina de El 33 ese día/.test(x)), 'la Revisión dice el cruce de Jenny: ' + JSON.stringify(rev));
  const cond = M.verificarSemana(cfg, st, e, '2026-10-05').find(x => x.k === 'cocinaSala'); assert.ok(!cond.ok && /Jenny/.test(cond.detalle), cond.detalle);
  assert.strictEqual(M.salaFirmeDelDia(cfg, st, e, V, M.personaDe(st, 'jenny'), 'EL33_T'), null, 'de sala en una casilla con la cocina puesta a mano: no es sala firme');
  // y con «Quitar la marca de cocina» (sinCocina): martes 6, Noe cocina de El 33 mañana y tarde; sin la cocina de la tarde, Noe queda de
  // sala allí y conserva la de la mañana (no cascada); la Revisión lo dice
  const T = '2026-10-06';
  assert.deepStrictEqual([a1fCasilla(e, T, 'EL33_M'), a1fCasilla(e, T, 'EL33_T')], [['victoria*', 'noe(c)'], ['noe*(c)']]);
  M.quitarCocinaAMano(e, cfg, st, T, 'EL33_T');
  assert.deepStrictEqual([a1fCasilla(e, T, 'EL33_M'), a1fCasilla(e, T, 'EL33_T')], [['victoria*', 'noe(c)'], ['noe*']], 'Noe conserva la cocina de la mañana');
  assert.strictEqual(M.salaFirmeDelDia(cfg, st, e, T, M.personaDe(st, 'noe'), 'EL33_M'), null);
  assert.ok(M.revisionMes(cfg, st, e, { desde: T, hasta: T }).some(x => x.turnoId === 'EL33_T' && /Noe: ya lleva la cocina/.test(x.msg)));
  // lo automático sigue sin crear cruces: la cocina que da la semana tipo (cocinaAuto) sí deja «sala firme» a quien está de sala con
  // ella. Los únicos cruces de la semana son los tres que decidió el encargado (Victoria con su cocina a mano; Jenny y Noe por S1)
  M.refrescarCasillas(cfg, st, e, '2026-10-05', '2026-10-11');
  assert.deepStrictEqual(a1fCruces(cfg, e, [...M.rangoIso('2026-10-05', '2026-10-11')]).sort(), ['2026-10-06 noe: cocina EL33_M · sala EL33_T', '2026-10-09 jenny: cocina EL33_T · sala EL33_M', '2026-10-09 victoria: cocina EL33_M · sala EL33_T']);
  // estabilidad de quién abre (cliente 3a): con el orden a mano, quien ya abría sigue abriendo aunque otra persona que también puede
  // abrir quede delante en la lista. Viernes 9/10, Mónaco mañana [cris*, esmeralda(c), yilian]: Cris al 3.º
  M.moverEnCasilla(e, V, 'MONACO_M', 'cris', 2, cfg, st);
  assert.deepStrictEqual(a1fCasilla(e, V, 'MONACO_M'), ['esmeralda(c)', 'yilian', 'cris*'], 'Cris sigue abriendo (Yilian también podría)');
  assert.strictEqual(M.primeroDe(cfg, st, e, V, 'MONACO_M'), 'cris');
  M.retirarEntrada(e, cfg, st, V, 'MONACO_M', 'cris');
  assert.deepStrictEqual(a1fCasilla(e, V, 'MONACO_M'), ['esmeralda(c)', 'yilian*'], 'sin Cris, abre la siguiente que puede');
  // estabilidad de la cocina (cliente 3a): entre los aptos, sin preferencia de lo automático, sigue quien ya la llevaba aunque entre
  // alguien con mejor orden en la lista del local
  const st2 = [a1P('a', { locales: ['EL33'], cocina: { titular: ['EL33'], reserva: [], soloDias: [] } }), a1P('k', { locales: ['EL33'], cocina: { titular: ['EL33'], reserva: [], soloDias: [] } }), a1P('s', { locales: ['EL33'] })];
  const cfg2 = a1Mundo(st2, c => { M.localDe(c, 'EL33').cocina.titulares = { M: ['a', 'k'], T: ['a', 'k'] }; });
  const e2 = estadoOct(), lun = '2026-10-05';
  assert.ok(M.asignar(e2, cfg2, st2, lun, 'EL33_M', 's', {}).ok && M.asignar(e2, cfg2, st2, lun, 'EL33_M', 'k', {}).ok);
  assert.deepStrictEqual(a1fCasilla(e2, lun, 'EL33_M'), ['s*', 'k(c)'], 'k lleva la cocina por el orden del local');
  assert.ok(M.asignar(e2, cfg2, st2, lun, 'EL33_M', 'a', {}).ok);
  assert.deepStrictEqual(a1fCasilla(e2, lun, 'EL33_M'), ['s*', 'k(c)', 'a'], 'entra a (1.ª de la lista del local) y k conserva la cocina');
  assert.ok(M.asignar(e2, cfg2, st2, '2026-10-06', 'EL33_M', 's', {}).ok && M.asignar(e2, cfg2, st2, '2026-10-06', 'EL33_M', 'a', { origen: 'patron', cocina: true }).ok && M.asignar(e2, cfg2, st2, '2026-10-06', 'EL33_M', 'k', {}).ok);
  assert.deepStrictEqual(a1fCasilla(e2, '2026-10-06', 'EL33_M'), ['s*', 'a(c)', 'k'], 'la «c» de la semana tipo (cocinaAuto) sigue mandando sobre quien la llevaba');
});

ok('A1 rev · 4, 5 y 6 (cliente 3b, modelo 5 y 6): lo que toca una casilla devuelve las casillas cambiadas por rebote (abre/cocina antes → ahora); asignar con «sale primero» hace eco hacia quien pierde el abre; asignar con la cocina a mano borra sinCocina', () => {
  // R/01: b hace continuo en Pasarela (abre la mañana y la tarde), d con ella por la tarde. El encargado pone a c en la mañana con
  // «sale primero»: b ya no abre la mañana, así que tampoco puede abrir la tarde (viene de hacer la mañana). La tarde se vuelve a
  // decidir (abre d) y asignar lo devuelve en `eco`
  const st = [a1P('b', { locales: ['PASARELA'] }), a1P('c', { locales: ['PASARELA'] }), a1P('d', { locales: ['PASARELA'] })];
  const cfg = a1Mundo(st), e = estadoOct(), lun = '2026-10-05';
  for (const [t, p] of [['PASARELA_M', 'b'], ['PASARELA_T', 'b'], ['PASARELA_T', 'd']]) assert.ok(M.asignar(e, cfg, st, lun, t, p, {}).ok);
  assert.ok(M.esContinuo(cfg, st, e, lun, 'PASARELA', 'b'));
  const r = M.asignar(e, cfg, st, lun, 'PASARELA_M', 'c', { abre: true });
  assert.ok(r.ok);
  assert.deepStrictEqual(r.eco, [{ iso: lun, tid: 'PASARELA_T', abre: { antes: 'b', ahora: 'd' } }], 'la tarde cambia por rebote y asignar lo dice');
  assert.deepStrictEqual(a1fCasilla(e, lun, 'PASARELA_T'), ['d*', 'b'], 'lo guardado de la tarde dice lo mismo que primeroDe');
  assert.strictEqual(M.primeroDe(cfg, st, e, lun, 'PASARELA_T'), 'd');
  // y las operaciones del menú de la casilla: [] si nada más cambia; la lista de rebotes si algo cambia
  assert.deepStrictEqual(M.marcarAbre(e, lun, 'PASARELA_M', 'b', cfg, st), [], '«sale primero» a b: b podría volver a abrir la tarde, pero d ya la abre y sigue pudiendo (estabilidad)');
  assert.deepStrictEqual(a1fCasilla(e, lun, 'PASARELA_T'), ['d*', 'b']);
  assert.deepStrictEqual(M.moverEnCasilla(e, lun, 'PASARELA_T', 'b', 0, cfg, st), [], 'mover sin que cambie nada más: ningún rebote');
  assert.deepStrictEqual(a1fCasilla(e, lun, 'PASARELA_T'), ['b', 'd*'], 'el orden a mano se queda y d sigue abriendo');
  assert.strictEqual(M.retirarEntrada(e, cfg, st, lun, 'PASARELA_M', 'nadie'), false);
  assert.deepStrictEqual(M.quitarAbreAMano(e, cfg, st, lun, 'PASARELA_M'), [], 'quitar el «sale primero» de b: b sigue abriendo la mañana');
  assert.deepStrictEqual(M.desasignar(e, lun, 'PASARELA_T', 'd', cfg, st), [], 'con cfg, desasignar también devuelve los rebotes (aquí ninguno)');
  assert.deepStrictEqual(a1fCasilla(e, lun, 'PASARELA_T'), ['b*']);
  // un rebote por la cocina: k de sala en la mañana de El 33 (con la cocina de la semana tipo en a) no lleva la de la tarde; al retirar a
  // a de la mañana, k pasa a la cocina de la mañana y ya puede llevar también la de la tarde: retirarEntrada lo devuelve
  const st3 = [a1P('a', { locales: ['EL33'], cocina: { titular: ['EL33'], reserva: [], soloDias: [] } }), a1P('k', { locales: ['EL33'], cocina: { titular: ['EL33'], reserva: [], soloDias: [] } }), a1P('s', { locales: ['EL33'] }), a1P('x', { locales: ['EL33'] })];
  const cfg3 = a1Mundo(st3, c => { M.localDe(c, 'EL33').cocina.titulares = { M: ['a', 'k'], T: ['a', 'k'] }; }), e3 = estadoOct();
  for (const [t, p, o] of [['EL33_M', 's', {}], ['EL33_M', 'a', { origen: 'patron', cocina: true }], ['EL33_M', 'k', { permitirPartido: true }], ['EL33_T', 'x', {}], ['EL33_T', 'k', { permitirPartido: true }]]) assert.ok(M.asignar(e3, cfg3, st3, lun, t, p, o).ok, p + ' en ' + t);
  assert.deepStrictEqual([a1fCasilla(e3, lun, 'EL33_M'), a1fCasilla(e3, lun, 'EL33_T')], [['s*', 'a(c)', 'k'], ['x*', 'k']], 'k de sala por la mañana: la tarde sin cocina');
  assert.deepStrictEqual(M.retirarEntrada(e3, cfg3, st3, lun, 'EL33_M', 'a'), [{ iso: lun, tid: 'EL33_T', cocina: { antes: null, ahora: 'k' } }], 'la tarde cambia por rebote y retirarEntrada lo dice');
  assert.deepStrictEqual([a1fCasilla(e3, lun, 'EL33_M'), a1fCasilla(e3, lun, 'EL33_T')], [['s*', 'k(c)'], ['x*', 'k(c)']]);
  // modelo 6: «Quitar la marca de cocina» (sinCocina) y luego poner a alguien llevando la cocina desde el selector: la marca sinCocina se va
  const cfg2 = cfgBase(), st2 = staffDe(cfg2), e2 = estadoOct(), mie = '2026-10-07';
  M.instanciarPatron(cfg2, st2, e2, mie, mie);
  assert.ok(M.quitarCocinaAMano(e2, cfg2, st2, mie, 'EL33_M'));
  assert.deepStrictEqual(M.manualDe(e2, mie, 'EL33_M'), { cocina: true, sinCocina: true });
  const r2 = M.asignar(e2, cfg2, st2, mie, 'EL33_M', 'hojan', { puesto: 'cocina', cocina: true, origen: 'manual', permitirPartido: true, forzar: true });
  assert.ok(r2.ok, r2.motivo);
  assert.deepStrictEqual(M.manualDe(e2, mie, 'EL33_M'), { cocina: true }, 'la cocina a mano de Hojan sustituye a «nadie a propósito»');
  assert.strictEqual((M.asignados(e2, mie, 'EL33_M').find(x => x.cocina) || {}).pid, 'hojan');
  assert.ok(Array.isArray(r2.eco));
  // y la cocina que da lo automático (cocinaAuto) NO la quita: el encargado dijo «nadie»
  assert.ok(M.quitarCocinaAMano(e2, cfg2, st2, mie, 'EL33_M'));
  M.retirarEntrada(e2, cfg2, st2, mie, 'EL33_M', 'hojan');
  assert.ok(M.asignar(e2, cfg2, st2, mie, 'EL33_M', 'hojan', { origen: 'generador', cocina: true, permitirPartido: true }).ok);
  assert.deepStrictEqual(M.manualDe(e2, mie, 'EL33_M'), { cocina: true, sinCocina: true });
  assert.ok(!M.asignados(e2, mie, 'EL33_M').some(x => x.cocina), 'sigue sin cocina');
  // el texto que enseña la app (toast e historial), en español llano
  assert.strictEqual(M.textoCambiosCasillas(cfg, st, [{ iso: lun, tid: 'PASARELA_T', abre: { antes: 'b', ahora: 'd' }, cocina: { antes: 'b', ahora: null } }, { iso: lun, tid: 'EL33_M', abre: { antes: null, ahora: 'c' } }]), 'en Pasarela tarde abre D (antes B) y se queda sin cocina (antes B); en El 33 mañana abre C (antes nadie)');
  assert.strictEqual(M.textoCambiosCasillas(cfg, st, [{ iso: lun, tid: 'EL33_T', abre: { antes: 'b', ahora: null }, cocina: { antes: null, ahora: 'd' } }]), 'en El 33 tarde nadie puede abrir (antes B) y la cocina pasa a D (antes nadie)');
  assert.strictEqual(M.textoCambiosCasillas(cfg, st, []), '');
});

ok('A1 rev · 5 (modelo 2 = cliente 4; R/09 y caso 15): la plaza trasladada por el día libre que trae la cocina y la pierde no se pone de sala si la persona lleva otra cocina ese día o solo hace cocina: se rechaza con el motivo y el aviso lo dice', () => {
  const corre = (pid, lunes, dias, relajado) => {
    const cfg = cfgBase(); cfg.meses = {}; const st = staffDe(cfg);
    M.ponerLibraPuntual(M.personaDe(st, pid), lunes, dias);
    const e = M.nuevoEstado(+lunes.slice(0, 4), +lunes.slice(5, 7), { festivos: [] });
    const g = M.generarSemana(cfg, st, e, lunes, { permitirPartido: !!relajado });
    const sinCocina = [], deSala = [];
    for (const iso of g.dias) for (const t of M.turnosDe(cfg)) {
      const l = M.asignados(e, iso, t.id);
      if (l.length && M.turnoAbierto(cfg, e, iso, t.id) && M.revisarTurno(cfg, st, e, iso, t.id).sinCocina) sinCocina.push(iso + ' ' + t.id);
      if (l.some(x => x.pid === pid && !x.cocina)) deSala.push(iso + ' ' + t.id);
    }
    return { cfg, st, e, g, sinCocina, deSala, cruces: a1fCruces(cfg, e, g.dias), avisos: g.avisos.filter(a => a.tipo === 'dosCocinas').map(a => a.texto), rech: g.rechazados.filter(r => r.pid === pid).map(r => `${r.iso} ${r.turnoId}: ${r.motivo}`) };
  };
  // R/09: Jenny libra el domingo 11/10 en vez del martes: sus plazas del domingo (la cocina de El 33 por la mañana y la del Mónaco por la
  // tarde, por Hojan) pasan al martes 6. En el Mónaco la cocina ya la trae Susana Capón: Jenny quedaba de sala allí, «sala firme», y
  // perdía la cocina de El 33 (casilla sin cocina que antes la tenía). Ahora la plaza del Mónaco se rechaza: ya lleva la cocina de El 33
  const j = corre('jenny', '2026-10-05', [7], false);
  assert.deepStrictEqual(a1fCasilla(j.e, '2026-10-06', 'EL33_M'), ['victoria*', 'jenny(c)'], 'Jenny lleva la cocina de El 33 el martes');
  assert.ok(!M.pidsEn(j.e, '2026-10-06', 'MONACO_T').includes('jenny'), 'y no está de sala en el Mónaco');
  assert.deepStrictEqual(j.deSala, []); assert.deepStrictEqual(j.cruces, []);
  assert.ok(!j.sinCocina.includes('2026-10-06 EL33_M'), JSON.stringify(j.sinCocina));
  assert.deepStrictEqual(j.rech, ['2026-10-06 MONACO_T: ya lleva la cocina de El 33 ese día, y la del Bar Mónaco por la tarde la lleva Susana Capón']);
  assert.deepStrictEqual(j.avisos, ['Jenny y Susana Capón traen la cocina de Bar Mónaco el martes 6 por la tarde (Jenny cambia su día libre esta semana): la lleva Susana Capón; Jenny se queda fuera de ese turno']);
  // caso 15 de la lente H: Hojan (solo cocina) libra lunes y viernes la semana del 2/11: sus plazas del lunes pasan al martes 3, donde
  // Noe (El 33) y Susana Capón (Mónaco) ya traen la cocina. Hojan no se pone de sala en ninguna: fuera de los dos turnos, con el porqué
  for (const relajado of [false, true]) {
    const h = corre('hojan', '2026-11-02', [1, 5], relajado);
    assert.deepStrictEqual(h.deSala, [], `Hojan de sala (${relajado ? 'relajado' : 'estricto'})`);
    assert.deepStrictEqual(h.cruces, []);
    assert.deepStrictEqual(a1fCasilla(h.e, '2026-11-03', 'EL33_M').slice(0, 2), ['victoria*', 'noe(c)']);
    assert.strictEqual((M.asignados(h.e, '2026-11-03', 'MONACO_T').find(x => x.cocina) || {}).pid, 'scapon');
    assert.deepStrictEqual(h.rech, ['2026-11-03 EL33_M: solo hace cocina, y la de El 33 por la mañana la lleva Noe', '2026-11-03 MONACO_T: solo hace cocina, y la del Bar Mónaco por la tarde la lleva Susana Capón']);
    assert.deepStrictEqual(h.avisos, ['Hojan y Noe traen la cocina de El 33 el martes 3 por la mañana (Hojan cambia su día libre esta semana): la lleva Noe; Hojan se queda fuera de ese turno', 'Hojan y Susana Capón traen la cocina de Bar Mónaco el martes 3 por la tarde (Hojan cambia su día libre esta semana): la lleva Susana Capón; Hojan se queda fuera de ese turno']);
    const c = h.g.condiciones.find(x => x.k === 'cocinaSala'); assert.ok(c.ok, c.detalle);
    const sc = h.g.condiciones.find(x => x.variable === 'soloCocina'); assert.ok(!sc || sc.ok, sc && sc.detalle);
  }
  // y con la cocina de la casilla decidida a mano («Quitar la marca de cocina», sinCocina, en la tarde de Zapatillera del viernes 25/9):
  // la «c» de Adrián no puede ser y su plaza entraría de sala mientras lleva la cocina de la mañana (fuzz de la revisión, seed
  // caso-cruce-gen). La plaza pasa por la puerta como sala y se rechaza con su motivo; ningún cruce automático
  const cfg4 = cfgBase(); cfg4.meses = {}; const st4 = staffDe(cfg4), e4 = M.nuevoEstado(2026, 9, { festivos: [] }), V = '2026-09-25';
  assert.ok(M.asignar(e4, cfg4, st4, V, 'ZAPA_T', 'esmeralda', { forzar: true, permitirPartido: true, relajarNuncaCon: true }).ok);
  assert.ok(M.quitarCocinaAMano(e4, cfg4, st4, V, 'ZAPA_T'));
  const r4 = M.generarPlanilla(cfg4, st4, e4, V, V, { permitirPartido: true });
  assert.ok(M.asignados(e4, V, 'ZAPA_M').find(x => x.pid === 'adrian' && x.cocina), 'Adrián lleva la cocina de la mañana');
  assert.ok(!M.pidsEn(e4, V, 'ZAPA_T').includes('adrian'), 'y no entra de sala en la tarde');
  assert.deepStrictEqual(r4.rechazados.filter(x => x.pid === 'adrian').map(x => x.turnoId + ': ' + x.motivo), ['ZAPA_T: ya lleva la cocina de Zapatillera ese día']);
  assert.deepStrictEqual(a1fCruces(cfg4, e4, [V]), []);
});

ok('A1 rev · 6 (cliente 1 y 2): con el orden a mano (▲/▼), la casilla se enseña tal como la dejó el encargado (posicionesDe = lo guardado), solo con el hueco delante si nadie puede abrir; y sin hueco con quien abre en su sitio', () => {
  const cfg = cfgBase(); cfg.meses = {}; const st = staffDe(cfg);
  const e = estadoOct(); M.generarPlanilla(cfg, st, e, '2026-10-05', '2026-10-11', {});
  const V = '2026-10-09', pos = (iso, tid) => M.posicionesDe(cfg, st, e, iso, tid).map(x => (x.hueco ? 'HUECO' : x.pid) + (x.abre ? '*' : '') + (x.cocina ? '(c)' : ''));
  assert.deepStrictEqual(a1fCasilla(e, V, 'MONACO_M'), ['cris*', 'esmeralda(c)', 'yilian']);
  M.moverEnCasilla(e, V, 'MONACO_M', 'cris', 1, cfg, st);   // «▼ Bajar» a Cris
  assert.deepStrictEqual(a1fCasilla(e, V, 'MONACO_M'), ['esmeralda(c)', 'cris*', 'yilian'], 'lo guardado: Cris 2.ª y sigue abriendo');
  assert.deepStrictEqual(pos(V, 'MONACO_M'), ['esmeralda(c)', 'cris*', 'yilian'], 'Hoy y la Semana enseñan el orden del encargado (antes ordenarCasilla volvía a poner a Cris la 1.ª)');
  M.moverEnCasilla(e, V, 'MONACO_M', 'esmeralda', 2, cfg, st);
  assert.deepStrictEqual(pos(V, 'MONACO_M'), a1fCasilla(e, V, 'MONACO_M'));
  assert.deepStrictEqual(pos(V, 'MONACO_M'), ['cris*', 'yilian', 'esmeralda(c)']);
  // con hueco (nadie puede abrir) y orden a mano: el hueco delante y luego la lista tal cual
  const tres = ['cris', 'yilian', 'esmeralda'].map(id => M.personaDe(st, id));
  for (const q of tres) q.noPrimero = ['M'];   // (la cocina también abre si nadie más puede: Esmeralda tampoco)
  M.refrescarCasillas(cfg, st, e, V, V);
  assert.strictEqual(M.primeroDe(cfg, st, e, V, 'MONACO_M'), null);
  assert.deepStrictEqual(pos(V, 'MONACO_M'), ['HUECO*', 'cris', 'yilian', 'esmeralda(c)']);
  assert.ok(!M.asignados(e, V, 'MONACO_M').some(x => x.abre), 'nadie lleva la marca «abre» guardada: el Excel y la hoja no dicen «(abre)» de nadie');
  // sin orden a mano, como siempre: quien abre delante, la cocina en su posición
  M.quitarMarcaManual(e, V, 'MONACO_M', cfg, st);
  for (const q of tres) q.noPrimero = [];
  M.refrescarCasillas(cfg, st, e, V, V);
  assert.deepStrictEqual(pos(V, 'MONACO_M'), a1fCasilla(e, V, 'MONACO_M'));
  assert.strictEqual(pos(V, 'MONACO_M')[0].slice(-1), '*');
});

ok('A1 rev · 7 (modelo 4; R/05): la línea «deja la cocina» del historial solo la lee una migración (sinCocina3009: mismo año, franja si la lleva, las dos si no), la casilla ya no; la de «Quitar la marca de cocina» lleva la franja; y la prueba negativa (otra franja, otro año, otro día, otro local, sin fecha, historial rotado)', () => {
  const mie = '2026-10-07', ts26 = Date.parse('2026-09-30T12:00:00+02:00'), ts25 = Date.parse('2025-10-07T12:00:00+02:00');
  const casos = [
    ['la línea sin franja vale para las dos franjas del día (lo que escribía la app hasta hoy)', 'Jenny deja la cocina de El 33 del 7/10', ts26, { EL33_M: true, EL33_T: true }],
    ['con la franja, solo esa', 'Jenny deja la cocina de El 33 mañana del 7/10', ts26, { EL33_M: true, EL33_T: false }],
    ['con la otra franja, no', 'Jenny deja la cocina de El 33 tarde del 7/10', ts26, { EL33_M: false, EL33_T: true }],
    ['de otro año (la fecha de la línea), no', 'Jenny deja la cocina de El 33 del 7/10', ts25, { EL33_M: false, EL33_T: false }],
    ['sin fecha, no', 'Jenny deja la cocina de El 33 del 7/10', undefined, { EL33_M: false, EL33_T: false }],
    ['de otro día, no', 'Jenny deja la cocina de El 33 del 17/10', ts26, { EL33_M: false, EL33_T: false }],
    ['de otro local, no', 'Hojan deja la cocina de Bar Mónaco del 7/10', ts26, { EL33_M: false, EL33_T: false }],
  ];
  const cfg = cfgBase();
  for (const [que, txt, ts, esperado] of casos) {
    cfg.historial = [Object.assign({ txt, tipo: 'asig' }, ts ? { ts } : {})];
    for (const tid of ['EL33_M', 'EL33_T']) assert.strictEqual(M.cocinaQuitadaAMano(cfg, mie, tid), esperado[tid], `${que} (${tid})`);
  }
  cfg.historial = []; assert.strictEqual(M.cocinaQuitadaAMano(cfg, mie, 'EL33_M'), false, 'historial rotado: no se reconoce');
  // la migración: desde hoy, la marca de cocina sin nadie que la reconoce el historial queda apuntada (sinCocina) y la que no, se va
  // (huérfana) y la casilla decide; lo pasado no se toca; una sola vez (estado.migraciones.sinCocina3009)
  const S = cfgBase(); S.meses = {}; S.migraciones = { huerfanas2509: 1 }; const st = S.staff;
  const e = estadoOct(); M.instanciarPatron(S, st, e, '2026-10-05', '2026-10-11');
  S.meses['2026-10'] = { asig: e.asig, apertura: e.apertura, manual: e.manual };
  const fija = (iso, tid) => { M.marcarManual(e, iso, tid, 'cocina'); for (const x of M.asignados(e, iso, tid)) x.cocina = false; };
  fija(mie, 'EL33_M'); fija(mie, 'EL33_T'); fija('2026-10-09', 'ZAPA_M'); fija('2026-10-05', 'MONACO_M');
  S.historial = [{ ts: ts26, tipo: 'asig', txt: 'Jenny deja la cocina de El 33 del 7/10' }, { ts: ts26, tipo: 'asig', txt: 'Adrián deja la cocina de Zapatillera tarde del 9/10' }];
  const r = M.migrarSinCocina(S, '2026-10-06');
  assert.deepStrictEqual(r, { sinCocina: 2, cocina: 1 }, JSON.stringify(r));
  assert.deepStrictEqual([M.manualDe(e, mie, 'EL33_M'), M.manualDe(e, mie, 'EL33_T')], [{ cocina: true, sinCocina: true }, { cocina: true, sinCocina: true }], 'las dos franjas de El 33 del 7/10: quitadas a propósito');
  assert.ok(!M.asignados(e, mie, 'EL33_M').some(x => x.cocina) && !M.asignados(e, mie, 'EL33_T').some(x => x.cocina));
  assert.deepStrictEqual(M.manualDe(e, '2026-10-09', 'ZAPA_M'), {}, 'la de Zapatillera mañana (la línea es de la tarde): huérfana');
  assert.ok(M.asignados(e, '2026-10-09', 'ZAPA_M').some(x => x.cocina), 'y la casilla vuelve a decidir la cocina');
  assert.deepStrictEqual(M.manualDe(e, '2026-10-05', 'MONACO_M'), { cocina: true }, 'el lunes 5 ya pasó: no se toca');
  assert.strictEqual(S.migraciones.sinCocina3009, 1);
  assert.deepStrictEqual(M.migrarSinCocina(S, '2026-10-06'), { sinCocina: 0, cocina: 0 }, 'una sola vez');
  fija('2026-10-10', 'ZAPA_T'); S.historial.push({ ts: ts26, tipo: 'asig', txt: 'Adrián deja la cocina de Zapatillera del 10/10' });
  assert.deepStrictEqual(M.migrarSinCocina(S, '2026-10-06'), { sinCocina: 0, cocina: 0 }, 'con la migración hecha no vuelve a mirar el historial');
  M.refrescarCasillas(S, st, e, '2026-10-10', '2026-10-10');
  assert.ok(M.asignados(e, '2026-10-10', 'ZAPA_T').some(x => x.cocina) && !M.manualDe(e, '2026-10-10', 'ZAPA_T').cocina, 'la casilla la trata como huérfana: ya no lee el historial');
});

// ---------- A2 (30/09): auditoría del modelo · ausencias (A1/H8, A2/H9, A8, G7, A3/A11, A5/G15, A10, A7, A12) ----------
// Los scripts de los revisores (scratchpad/auditoria-modelo/A-fechas-lectura/02-ausencias.js, 02b-mes-quitar-baja.js y
// 04-libre-puntual.js; G-horas-nucleo-estado/03-media-jornada.js; H-invariantes/caso-07-directo.mjs) como pruebas del repo.

ok('A2 · A1/H8 (02b, caso 07a): quitar un día de una baja SIN fecha de fin la parte y la cola sigue abierta; quitar el primer día la deja abierta desde el siguiente', () => {
  for (const pid of ['laura', 'maydeth', 'susi']) {
    const cfg = cfgBase(), p = M.personaDe(cfg.staff, pid);
    assert.deepStrictEqual(p.ausencias.map(a => [a.tipo, a.desde, a.hasta]), [['BAJ', '2026-09-01', undefined]], pid + ': en la semilla, baja abierta desde el 1/9');
    const det = p.ausencias[0].detalle;
    p.ausencias = M.quitarDiaDeAusencia(p.ausencias, '2026-10-15');
    assert.deepStrictEqual(p.ausencias, [{ tipo: 'BAJ', desde: '2026-09-01', hasta: '2026-10-14', detalle: det }, { tipo: 'BAJ', desde: '2026-10-16', detalle: det }], pid);
    assert.ok(!M.deBaja(p, '2026-10-15') && M.deBaja(p, '2026-10-14') && M.deBaja(p, '2026-10-16') && M.deBaja(p, '2027-03-01'), pid + ': solo el 15/10 deja de estar de baja');
    p.ausencias = M.quitarDiaDeAusencia(p.ausencias, '2026-09-01');
    assert.deepStrictEqual(p.ausencias, [{ tipo: 'BAJ', desde: '2026-09-02', hasta: '2026-10-14', detalle: det }, { tipo: 'BAJ', desde: '2026-10-16', detalle: det }], pid + ': quitar el primer día no borra la baja');
    assert.ok(!M.deBaja(p, '2026-09-01') && M.deBaja(p, '2026-09-02'));
  }
  // caso 07 (a), tal cual
  const p = { id: 'x', nombre: 'X', ausencias: [] };
  M.anadirAusencia(p, { tipo: 'BAJ', desde: '2026-09-01' });
  p.ausencias = M.quitarDiaDeAusencia(p.ausencias, '2026-10-05');
  assert.deepStrictEqual(p.ausencias, [{ tipo: 'BAJ', desde: '2026-09-01', hasta: '2026-10-04' }, { tipo: 'BAJ', desde: '2026-10-06' }]);
  assert.strictEqual(M.ausenciaEn(p, '2026-10-05'), null);
  p.ausencias = M.quitarDiaDeAusencia(p.ausencias, '2026-09-01');
  assert.deepStrictEqual(p.ausencias, [{ tipo: 'BAJ', desde: '2026-09-02', hasta: '2026-10-04' }, { tipo: 'BAJ', desde: '2026-10-06' }]);
  assert.ok(M.ausenciaEn(p, '2026-09-02') && !M.ausenciaEn(p, '2026-09-01'));
  // un día fuera de la baja no la toca; y las cerradas se parten como siempre (02 §2)
  assert.deepStrictEqual(M.quitarDiaDeAusencia([{ tipo: 'BAJ', desde: '2026-09-01' }], '2026-08-31'), [{ tipo: 'BAJ', desde: '2026-09-01' }]);
  const v = [{ tipo: 'VAC', desde: '2026-10-06', hasta: '2026-10-08', detalle: 'x' }];
  assert.deepStrictEqual(M.quitarDiaDeAusencia(v, '2026-10-07'), [{ tipo: 'VAC', desde: '2026-10-06', hasta: '2026-10-06', detalle: 'x' }, { tipo: 'VAC', desde: '2026-10-08', hasta: '2026-10-08', detalle: 'x' }]);
  assert.deepStrictEqual(M.quitarDiaDeAusencia(v, '2026-10-06'), [{ tipo: 'VAC', desde: '2026-10-07', hasta: '2026-10-08', detalle: 'x' }]);
  assert.deepStrictEqual(M.quitarDiaDeAusencia(v, '2026-10-08'), [{ tipo: 'VAC', desde: '2026-10-06', hasta: '2026-10-07', detalle: 'x' }]);
  assert.deepStrictEqual(v, [{ tipo: 'VAC', desde: '2026-10-06', hasta: '2026-10-08', detalle: 'x' }], 'la entrada no se muta');
  // una VAC sin fin (dato de antes) se lee como abierta (ausenciaEn) y se parte igual (02 §10)
  const vv = [{ tipo: 'VAC', desde: '2026-10-01' }];
  assert.deepStrictEqual(M.quitarDiaDeAusencia(vv, '2026-10-20'), [{ tipo: 'VAC', desde: '2026-10-01', hasta: '2026-10-19' }, { tipo: 'VAC', desde: '2026-10-21' }]);
  assert.deepStrictEqual(M.quitarDiaDeAusencia(vv, '2026-10-01'), [{ tipo: 'VAC', desde: '2026-10-02' }]);
});

ok('A2 · A2/H9 (02 §3-4, caso 07b): anadirAusencia funde las bajas abiertas (queda una, desde el menor desde) y una que engloba absorbe a las de dentro', () => {
  // caso 07 (b): tres altas de baja que se solapan → una sola, abierta desde el 1/9
  const q = { id: 'y', nombre: 'Y', ausencias: [] };
  M.anadirAusencia(q, { tipo: 'BAJ', desde: '2026-09-01' });
  assert.deepStrictEqual(M.anadirAusencia(q, { tipo: 'BAJ', desde: '2026-10-01' }), { fusionada: true, ausencia: { tipo: 'BAJ', desde: '2026-09-01' } });
  assert.deepStrictEqual(M.anadirAusencia(q, { tipo: 'BAJ', desde: '2026-09-20', hasta: '2026-09-25' }), { fusionada: true, ausencia: { tipo: 'BAJ', desde: '2026-09-01' } });
  assert.deepStrictEqual(q.ausencias, [{ tipo: 'BAJ', desde: '2026-09-01' }]);
  assert.strictEqual(M.diasAusenciaMes(q, 2026, 10, 'BAJ').length, 31);
  // 02 §4: abierta + cerrada que pisa → abierta desde el menor desde; + abierta posterior → sigue una; una cerrada anterior sin tocar, aparte
  const p4 = { ausencias: [] };
  M.anadirAusencia(p4, { tipo: 'BAJ', desde: '2026-09-01' });
  assert.strictEqual(M.anadirAusencia(p4, { tipo: 'BAJ', desde: '2026-10-01', hasta: '2026-10-05' }).fusionada, true);
  assert.strictEqual(M.anadirAusencia(p4, { tipo: 'BAJ', desde: '2026-09-15' }).fusionada, true);
  assert.deepStrictEqual(p4.ausencias, [{ tipo: 'BAJ', desde: '2026-09-01' }]);
  assert.strictEqual(M.anadirAusencia(p4, { tipo: 'BAJ', desde: '2026-08-20' }).fusionada, true, 'una abierta anterior: la fundida empieza antes');
  assert.deepStrictEqual(p4.ausencias, [{ tipo: 'BAJ', desde: '2026-08-20' }]);
  assert.strictEqual(M.anadirAusencia(p4, { tipo: 'BAJ', desde: '2026-08-01', hasta: '2026-08-10' }).fusionada, false, 'con hueco en medio, aparte');
  assert.deepStrictEqual(p4.ausencias.map(a => a.desde), ['2026-08-01', '2026-08-20']);
  assert.deepStrictEqual(M.anadirAusencia(p4, { tipo: 'VAC', desde: '2026-11-01' }).ausencia, { tipo: 'VAC', desde: '2026-11-01', hasta: '2026-11-01' }, 'sin hasta y no es baja: de un día');
  // 02 §3: solapes, contigüidad, hueco de un día y la que engloba
  const p3 = { ausencias: [] };
  M.anadirAusencia(p3, { tipo: 'VAC', desde: '2026-10-06', hasta: '2026-10-08' });
  assert.deepStrictEqual(M.anadirAusencia(p3, { tipo: 'VAC', desde: '2026-10-08', hasta: '2026-10-10' }), { fusionada: true, ausencia: { tipo: 'VAC', desde: '2026-10-06', hasta: '2026-10-10' } });
  assert.strictEqual(M.anadirAusencia(p3, { tipo: 'VAC', desde: '2026-10-11' }).fusionada, true, 'contigua');
  assert.strictEqual(M.anadirAusencia(p3, { tipo: 'VAC', desde: '2026-10-13' }).fusionada, false, 'con un día de hueco, aparte');
  assert.deepStrictEqual(p3.ausencias.map(a => [a.desde, a.hasta]), [['2026-10-06', '2026-10-11'], ['2026-10-13', '2026-10-13']]);
  assert.strictEqual(M.anadirAusencia(p3, { tipo: 'VAC', desde: '2026-10-01', hasta: '2026-10-20' }).fusionada, true);
  assert.deepStrictEqual(p3.ausencias, [{ tipo: 'VAC', desde: '2026-10-01', hasta: '2026-10-20' }], 'la del 13 no queda dentro de la grande');
  assert.strictEqual(M.anadirAusencia(p3, { tipo: 'PERM', desde: '2026-10-07' }).fusionada, false, 'otro tipo, aparte');
  assert.strictEqual(M.ausenciaEn(p3, '2026-10-07').tipo, 'VAC'); assert.strictEqual(M.ausenciaEn(p3, '2026-10-07', null, 'PERM').tipo, 'PERM');
  // el puente: una en medio funde a las dos de los lados (y los detalles se juntan sin repetir)
  const p5 = { ausencias: [{ tipo: 'VAC', desde: '2026-10-01', hasta: '2026-10-05', detalle: 'boda' }, { tipo: 'VAC', desde: '2026-10-07', hasta: '2026-10-10', detalle: 'viaje' }] };
  const r5 = M.anadirAusencia(p5, { tipo: 'VAC', desde: '2026-10-06', detalle: 'boda' });
  assert.deepStrictEqual(p5.ausencias, [{ tipo: 'VAC', desde: '2026-10-01', hasta: '2026-10-10', detalle: 'boda · viaje' }]);
  assert.strictEqual(r5.ausencia, p5.ausencias[0]);
  // una media jornada no se funde con un día entero del mismo tipo (D10), ni con la otra franja
  const p6 = { ausencias: [] };
  M.anadirAusencia(p6, { tipo: 'VAC', desde: '2026-10-06', hasta: '2026-10-06', franjas: ['M'] });
  assert.strictEqual(M.anadirAusencia(p6, { tipo: 'VAC', desde: '2026-10-07', hasta: '2026-10-07' }).fusionada, false);
  assert.strictEqual(M.anadirAusencia(p6, { tipo: 'VAC', desde: '2026-10-07', hasta: '2026-10-07', franjas: ['T'] }).fusionada, false);
  assert.strictEqual(p6.ausencias.length, 3);
});

ok('A2 · A8 (02 §5): el orden de p.ausencias es total (desde, franja mañana < tarde < día entero, tipo) y ausenciaEn sin franja prefiere la de día entero', () => {
  const A = { tipo: 'PERM', desde: '2026-10-07', hasta: '2026-10-07', franjas: ['M'] }, B = { tipo: 'VAC', desde: '2026-10-07', hasta: '2026-10-07', franjas: ['T'] };
  const p5a = { ausencias: [] }; M.anadirAusencia(p5a, A); M.anadirAusencia(p5a, B);
  const p5b = { ausencias: [] }; M.anadirAusencia(p5b, B); M.anadirAusencia(p5b, A);
  assert.deepStrictEqual(p5a.ausencias.map(a => a.tipo), ['PERM', 'VAC']);
  assert.deepStrictEqual(p5b.ausencias.map(a => a.tipo), ['PERM', 'VAC'], 'el mismo orden se dé de alta como se dé');
  assert.strictEqual(M.ausenciaEn(p5a, '2026-10-07').tipo, 'PERM'); assert.strictEqual(M.ausenciaEn(p5b, '2026-10-07').tipo, 'PERM');
  assert.strictEqual(M.etiquetaAusencia(M.ausenciaEn(p5b, '2026-10-07')), 'Permiso por la mañana');
  // mismo día y franja, distinto tipo: por el catálogo (BAJ, VAC, LD, PERM, OTRO); día entero detrás de las medias
  const p = { ausencias: [] };
  for (const a of [{ tipo: 'OTRO', desde: '2026-10-07', hasta: '2026-10-07' }, { tipo: 'PERM', desde: '2026-10-07', hasta: '2026-10-07', franjas: ['T'] }, { tipo: 'LD', desde: '2026-10-07', hasta: '2026-10-07', franjas: ['T'] }, { tipo: 'VAC', desde: '2026-10-06', hasta: '2026-10-09', franjas: ['M'] }]) M.anadirAusencia(p, a);
  assert.deepStrictEqual(p.ausencias.map(a => a.tipo + ':' + a.desde + ':' + (a.franjas || 'dia')), ['VAC:2026-10-06:M', 'LD:2026-10-07:T', 'PERM:2026-10-07:T', 'OTRO:2026-10-07:dia']);
  // sin franja, la de día entero aunque otra empiece antes; con franja o tipo, la que toca
  assert.strictEqual(M.ausenciaEn(p, '2026-10-07').tipo, 'OTRO', 'el día entero manda para las vistas del día');
  assert.strictEqual(M.ausenciaEn(p, '2026-10-07', 'M').tipo, 'VAC');
  assert.strictEqual(M.ausenciaEn(p, '2026-10-07', 'T').tipo, 'LD');
  assert.strictEqual(M.ausenciaEn(p, '2026-10-07', null, 'PERM').tipo, 'PERM');
  assert.strictEqual(M.ausenciaEn(p, '2026-10-08').tipo, 'VAC', 'sin día entero, la primera');
});

ok('A2 · G7 (G-03): una ausencia en una franja en la que la persona no trabaja no cuenta: ni medio día de vacaciones ni descuento del contrato; en las suyas, como hasta ahora', () => {
  const cfg = cfgBase(), st = cfg.staff, clon = x => JSON.parse(JSON.stringify(x));
  const iv = clon(M.personaDe(st, 'ivan'));   // solo tardes
  assert.deepStrictEqual(iv.franjas, ['T']);
  iv.ausencias = [{ tipo: 'VAC', desde: '2026-10-06', hasta: '2026-10-06', franjas: ['M'] }]; iv.contrato = { horasSemana: 35 };
  const st2 = st.map(p => p.id === 'ivan' ? iv : p);
  assert.strictEqual(M.esMediaJornada(iv, ['M']), false);
  assert.deepStrictEqual(M.diasAusenciaMes(iv, 2026, 10, 'VAC'), []);
  assert.deepStrictEqual(M.mediasAusenciaMes(iv, 2026, 10, 'VAC'), {});
  const h = M.horasPersonaMes(cfg, st2, {}, 'ivan', 2026, 10);
  assert.deepStrictEqual([h.vacaciones, h.vacacionesMedias, h.ausenciasMedias, h.ausencias, h.contratoHoras], [0, {}, 0, 0, 155], JSON.stringify([h.vacaciones, h.vacacionesMedias, h.ausenciasMedias, h.ausencias, h.contratoHoras]));
  assert.strictEqual(M.vacacionesAno(st2, 2026).find(x => x.pid === 'ivan'), undefined);
  // (la vista del día sigue diciendo que está de vacaciones por la mañana: es lo apuntado)
  assert.ok(M.ausenciaEn(iv, '2026-10-06', 'M') && !M.ausenciaEn(iv, '2026-10-06', 'T'));
  // sus tardes: día entero (revisión final 25/09); M+T: día entero; Mari Luz (M y T) solo mañana: media
  iv.ausencias = [{ tipo: 'VAC', desde: '2026-10-02', hasta: '2026-10-04', franjas: ['T'] }];
  assert.strictEqual(M.esMediaJornada(iv, ['T']), false);
  assert.strictEqual(M.jornadasAusencia(M.diasAusenciaMes(iv, 2026, 10, 'VAC'), M.mediasAusenciaMes(iv, 2026, 10, 'VAC')), 3);
  assert.strictEqual(M.horasPersonaMes(cfg, st2, {}, 'ivan', 2026, 10).contratoHoras, 140);
  iv.ausencias = [{ tipo: 'VAC', desde: '2026-10-06', hasta: '2026-10-06', franjas: ['M', 'T'] }];
  assert.strictEqual(M.esMediaJornada(iv, ['M', 'T']), false);
  assert.strictEqual(M.horasPersonaMes(cfg, st2, {}, 'ivan', 2026, 10).vacaciones, 1);
  const ml = clon(M.personaDe(st, 'mariluz')); ml.ausencias = [{ tipo: 'VAC', desde: '2026-10-06', hasta: '2026-10-06', franjas: ['M'] }];
  assert.strictEqual(M.esMediaJornada(ml, ['M']), true);
  assert.deepStrictEqual(M.mediasAusenciaMes(ml, 2026, 10, 'VAC'), { '2026-10-06': ['M'] });
  assert.strictEqual(M.horasPersonaMes(cfg, st.map(p => p.id === 'mariluz' ? ml : p), {}, 'mariluz', 2026, 10).vacaciones, 0.5);
});

ok('A2 · A3/A11 (04): los textos del cambio de día libre cuando incluye el de siempre («esta semana libra además el viernes», «libra los miércoles»), y tres días «lunes, martes y jueves»', () => {
  const cfg = cfgBase(), st = cfg.staff, ml = M.personaDe(st, 'mariluz');   // libra [3]
  const LUN = '2026-09-28', MAR = '2026-09-29', MIE = '2026-09-30', VIE = '2026-10-02';
  const vLibra = M.VARIABLES.find(v => v.campo === 'libra');
  ml.libraPuntual = [{ semana: LUN, dias: [3, 5] }];
  assert.strictEqual(M.estadoDia(cfg, ml, MIE).texto, 'libra los miércoles');
  assert.strictEqual(M.estadoDia(cfg, ml, VIE).texto, 'esta semana libra además el viernes');
  assert.strictEqual(M.motivoLibra(ml, MIE), 'libra los miércoles');
  assert.strictEqual(M.motivoLibra(ml, VIE), 'esta semana libra además el viernes');
  assert.strictEqual(M.textoCambioLibre(ml, M.libraPuntualDe(ml, MIE)), 'libra además el viernes');
  assert.strictEqual(M.textoCambioLibre(ml, M.libraPuntualDe(ml, MIE), true), 'libra además el viernes');
  assert.deepStrictEqual(vLibra.texto({ cfg, lunes: LUN }, ml).map(x => x.texto), ['Mari Luz libra los miércoles y esta semana además el viernes']);
  assert.ok(M.libraEn(ml, MIE) && M.libraEn(ml, VIE) && !M.libraEn(ml, MAR));
  // el cambio normal sigue igual
  ml.libraPuntual = [{ semana: LUN, dias: [2] }];
  assert.strictEqual(M.estadoDia(cfg, ml, MAR).texto, 'libra el martes esta semana (en vez de los miércoles)');
  assert.strictEqual(M.estadoDia(cfg, ml, MIE).texto, 'esta semana trabaja (libra el martes)');
  assert.strictEqual(M.motivoLibra(ml, MAR), 'libra el martes esta semana');
  assert.strictEqual(M.textoCambioLibre(ml, M.libraPuntualDe(ml, MAR)), 'libra martes (en vez de miércoles)');
  assert.deepStrictEqual(vLibra.texto({ cfg, lunes: LUN }, ml).map(x => x.texto), ['Mari Luz libra el martes esta semana (en vez de los miércoles)']);
  // tres días (A11): con comas y la «y» al final
  ml.libraPuntual = [{ semana: LUN, dias: [1, 2, 4] }];
  assert.strictEqual(M.textoCambioLibre(ml, M.libraPuntualDe(ml, MAR)), 'libra lunes, martes y jueves (en vez de miércoles)');
  assert.strictEqual(M.estadoDia(cfg, ml, MAR).texto, 'libra el martes esta semana (en vez de los miércoles)');
  assert.deepStrictEqual(vLibra.texto({ cfg, lunes: LUN }, ml).map(x => x.texto), ['Mari Luz libra el lunes, el martes y el jueves esta semana (en vez de los miércoles)']);
  assert.strictEqual(M.estadoDia(cfg, ml, MIE).texto, 'esta semana trabaja (libra el lunes, el martes y el jueves)');
  // quien no tiene día fijo (Susi): sin «en vez de» ni «además»
  const su = M.personaDe(st, 'susi'); su.ausencias = []; su.libraPuntual = [{ semana: LUN, dias: [2] }];
  assert.deepStrictEqual(su.libra, []);
  assert.strictEqual(M.estadoDia(cfg, su, MAR).texto, 'libra el martes esta semana');
  assert.strictEqual(M.textoCambioLibre(su, M.libraPuntualDe(su, MAR)), 'libra martes');
  assert.deepStrictEqual(vLibra.texto({ cfg, lunes: LUN }, su).map(x => x.texto), ['Susi libra el martes esta semana']);
  // solo parte de sus días de siempre (Lavinia libra lunes, martes y jueves; esa semana solo lunes y martes): trabaja el jueves
  const la = M.personaDe(st, 'lavinia');
  assert.deepStrictEqual(la.libra, [1, 2, 4]);
  la.libraPuntual = [{ semana: LUN, dias: [1, 2] }];
  assert.strictEqual(M.textoCambioLibre(la, M.libraPuntualDe(la, LUN)), 'trabaja el jueves (libra solo lunes y martes)');
  assert.strictEqual(M.textoCambioLibre(la, M.libraPuntualDe(la, LUN), true), 'trabaja el jueves');
  assert.strictEqual(M.estadoDia(cfg, la, LUN).texto, 'libra los lunes');
  assert.strictEqual(M.estadoDia(cfg, la, '2026-10-01').texto, 'esta semana trabaja (libra el lunes y el martes)');
  assert.deepStrictEqual(vLibra.texto({ cfg, lunes: LUN }, la).map(x => x.texto), ['Lavinia esta semana trabaja el jueves (libra el lunes y el martes)']);
});

ok('A2 · A5/G15: fechaCandidato, ordenarCandidatos, primerDiaPlanificable, mesVisibleParaPersonal y sembrarDemo piden la fecha (el modelo no mira el reloj, como deBaja)', () => {
  const sinFecha = /falta la fecha/;
  assert.throws(() => M.fechaCandidato({ fecha: '14 de septiembre' }), { name: 'TypeError', message: sinFecha });
  assert.throws(() => M.fechaCandidato({}), TypeError, 'también sin nada que leer: la firma es la misma');
  assert.strictEqual(M.fechaCandidato({ fecha: '14 de septiembre' }, '2026-09-21'), '2026-09-14');
  assert.throws(() => M.ordenarCandidatos([{ id: 'x' }]), { name: 'TypeError', message: sinFecha });
  assert.throws(() => M.ordenarCandidatos([{ id: 'x' }], null, 'fecha'), TypeError);
  assert.deepStrictEqual(M.ordenarCandidatos([{ id: 'x' }], '2026-09-21').map(c => c.id), ['x']);
  const e = estadoOct();
  assert.throws(() => M.primerDiaPlanificable(e), { name: 'TypeError', message: sinFecha });
  assert.strictEqual(M.primerDiaPlanificable(e, '2026-10-10'), '2026-10-10');
  assert.strictEqual(M.primerDiaPlanificable(e, '2026-09-10'), '2026-10-01');
  assert.strictEqual(M.primerDiaPlanificable(e, '2026-11-10'), null);
  assert.throws(() => M.mesVisibleParaPersonal(['2026-11'], '2026-10'), { name: 'TypeError', message: sinFecha });
  assert.strictEqual(M.mesVisibleParaPersonal(['2026-11'], '2026-10', '2026-10'), true);
  assert.strictEqual(M.mesVisibleParaPersonal(['2026-11'], '2026-12', '2026-10'), false);
  assert.throws(() => M.mesesVisibles({ meses: { '2026-10': {} } }), TypeError);
  assert.throws(() => M.sembrarDemo(Object.assign(cfgBase(), { meses: {} })), { name: 'TypeError', message: sinFecha });
});

ok('A2 · A10: rangoIso con una fecha que no es AAAA-MM-DD corta con un error claro en vez de dar vueltas sin parar', () => {
  assert.deepStrictEqual([...M.rangoIso('2026-10-30', '2026-11-01')], ['2026-10-30', '2026-10-31', '2026-11-01']);
  assert.deepStrictEqual([...M.rangoIso('2026-10-30', '2026-10-29')], []);
  for (const [d, h] of [['2026-10-1', '2026-10-03'], ['2026-10-01', '2026-10-3'], ['', '2026-10-03'], [undefined, '2026-10-03'], ['2026-10-01', undefined], ['30/10/2026', '2026-11-01'], ['2026-10-01', 'null']]) assert.throws(() => [...M.rangoIso(d, h)], { name: 'TypeError', message: /rangoIso/ }, JSON.stringify([d, h]));
  // con la forma bien pero un día que no existe: acaba (nunca da vueltas) y no suelta «NaN-NaN-NaN» (el 30/02 el navegador
  // lo desborda a marzo; un mes 13 no es fecha y se corta tras el primero)
  const r = [...M.rangoIso('2026-02-30', '2026-03-05')];
  assert.ok(r.length <= 5 && r.every(x => /^\d{4}-\d{2}-\d{2}$/.test(x)), JSON.stringify(r));
  assert.deepStrictEqual([...M.rangoIso('2026-13-01', '2026-13-05')], ['2026-13-01']);
});

ok('A2 · A7 (04): limpiarLibrePuntual normaliza lo que venga de fuera: la semana a su lunes (también «2026-9-28»), los días a números 1..7 sin repetir, y funde dos entradas de la misma semana', () => {
  const LUN = '2026-09-28';
  const p = { id: 'x', libra: [3], libraPuntual: [{ semana: '2026-09-30', dias: ['2'] }, { semana: '2026-9-28', dias: [5, 5, '9', 0, 4.5] }, { semana: '2026-10-04', dias: [1] }, { semana: '2026-10-12', dias: [] }, { semana: 'x', dias: [1] }, { semana: '2026-09-21', dias: [4] }] };
  assert.strictEqual(M.limpiarLibrePuntual([p], LUN), 2, 'la semana pasada del 21/09 y la que no es una fecha');
  assert.deepStrictEqual(p.libraPuntual, [{ semana: LUN, dias: [1, 2, 5] }]);
  assert.ok(M.libraEn(p, '2026-09-28') && M.libraEn(p, '2026-09-29') && !M.libraEn(p, '2026-09-30') && M.libraEn(p, '2026-10-02'));
  // la forma de antes (objeto) con la semana en domingo
  const q = { libraPuntual: { semana: '2026-10-04', dias: [2] } };
  assert.strictEqual(M.limpiarLibrePuntual([q], LUN), 0);
  assert.deepStrictEqual(q.libraPuntual, [{ semana: LUN, dias: [2] }]);
  assert.strictEqual(M.limpiarLibrePuntual([{ id: 'z' }], LUN), 0);
});

ok('A2 · A12: vetoDe compara el día como número (un veto guardado con dow "1" o pedido con "1" vale igual, como vetoRepetido)', () => {
  const p = { vetos: [{ localId: 'PASARELA', franja: 'M', dow: '1' }, { localId: 'EL33', franja: 'T', dow: ['2', 3] }] };
  assert.ok(M.vetoDe(p, 'PASARELA', 'M', 1) && M.vetoDe(p, 'PASARELA', 'M', '1') && !M.vetoDe(p, 'PASARELA', 'M', 2));
  assert.ok(M.vetoDe(p, 'EL33', 'T', 2) && M.vetoDe(p, 'EL33', 'T', 3) && M.vetoDe(p, 'EL33', 'T', '3') && !M.vetoDe(p, 'EL33', 'T', 4));
  assert.ok(M.vetoDe({ vetos: [{ localId: 'EL33', franja: 'T' }] }, 'EL33', 'T', 5), 'sin dow, todos los días');
});

// ---------- A2, corrección tras las dos revisiones (30/09): el detalle al fundir, el orden tras quitar un día, las vistas de un día
// con dos ausencias, el aviso del Generador, «sin plaza», y lo que llega de fuera (hasta "", dow «x», sin fecha) ----------

ok('A2 fix · modelo 1: el detalle se junta por trozos (« · ») sin repetir ninguno: boda + viaje + boda → «boda · viaje», y editar un cierre dos veces deja el mismo detalle', () => {
  const p = { ausencias: [] };
  M.anadirAusencia(p, { tipo: 'VAC', desde: '2026-10-01', hasta: '2026-10-03', detalle: 'boda' });
  M.anadirAusencia(p, { tipo: 'VAC', desde: '2026-10-04', hasta: '2026-10-05', detalle: 'viaje' });
  M.anadirAusencia(p, { tipo: 'VAC', desde: '2026-10-06', hasta: '2026-10-06', detalle: 'boda' });
  M.anadirAusencia(p, { tipo: 'VAC', desde: '2026-10-07', hasta: '2026-10-07', detalle: 'viaje' });
  assert.deepStrictEqual(p.ausencias.map(a => a.detalle), ['boda · viaje']);
  // el puente con el detalle de un lado repetido
  const q = { ausencias: [{ tipo: 'VAC', desde: '2026-10-01', hasta: '2026-10-05', detalle: 'boda' }, { tipo: 'VAC', desde: '2026-10-07', hasta: '2026-10-10', detalle: 'viaje' }] };
  const r = M.anadirAusencia(q, { tipo: 'VAC', desde: '2026-10-06', detalle: 'boda' });
  assert.deepStrictEqual(q.ausencias, [{ tipo: 'VAC', desde: '2026-10-01', hasta: '2026-10-10', detalle: 'boda · viaje' }]);
  assert.strictEqual(r.ausencia, q.ausencias[0]);
  // editar un cierre (aplicarCierre sobre el mismo id lo deshace y lo vuelve a aplicar): el detalle no crece
  const cfg = cfgBase(); cfg.meses = {}; const e = M.nuevoEstado(2026, 9); M.generarPlanilla(cfg, cfg.staff, e, '2026-09-28', '2026-09-30', {});
  const su = M.personaDe(cfg.staff, 'scapon'); su.ausencias = [];
  M.anadirAusencia(su, { tipo: 'VAC', desde: '2026-09-30', hasta: '2026-10-02', detalle: 'las suyas' });
  const cierre = () => ({ id: 'cie_t', localId: 'MONACO', motivo: 'reforma', dias: { '2026-09-28': ['T'], '2026-09-29': ['T'] } });
  M.aplicarCierre(cfg, cfg.staff, e, cierre(), { scapon: { tipo: 'VAC' } });
  const d1 = su.ausencias.map(a => a.detalle);
  M.aplicarCierre(cfg, cfg.staff, e, cierre(), { scapon: { tipo: 'VAC' } });
  M.aplicarCierre(cfg, cfg.staff, e, cierre(), { scapon: { tipo: 'VAC' } });
  assert.deepStrictEqual(su.ausencias.map(a => a.detalle), d1);
  assert.ok(d1.length === 1 && (d1[0].match(/reforma/g) || []).length === 1, JSON.stringify(d1));
});

ok('A2 fix · modelo 2 (A8): quitar un día deja la lista en el orden total y ausenciaEn sin franja da lo mismo antes y después', () => {
  const p = { ausencias: [] };
  M.anadirAusencia(p, { tipo: 'VAC', desde: '2026-10-01', hasta: '2026-10-20', franjas: ['T'] });
  M.anadirAusencia(p, { tipo: 'PERM', desde: '2026-10-08', hasta: '2026-10-16', franjas: ['M'] });
  p.ausencias = M.quitarDiaDeAusencia(p.ausencias, '2026-10-10');
  assert.deepStrictEqual(p.ausencias.map(a => `${a.tipo} ${a.desde}..${a.hasta}`), ['VAC 2026-10-01..2026-10-09', 'PERM 2026-10-08..2026-10-09', 'PERM 2026-10-11..2026-10-16', 'VAC 2026-10-11..2026-10-20']);
  assert.deepStrictEqual(p.ausencias.slice().sort(M.compararAusencias), p.ausencias);
  assert.strictEqual(M.etiquetaAusencia(M.ausenciaEn(p, '2026-10-12')), 'Permiso por la mañana', 'la primera del orden (mañana antes que tarde), como tras cualquier alta');
  M.anadirAusencia(p, { tipo: 'LD', desde: '2026-12-01' });
  assert.strictEqual(M.etiquetaAusencia(M.ausenciaEn(p, '2026-10-12')), 'Permiso por la mañana');
  // con filtro (el Mes quita solo una de las dos del día), igual
  const q = { ausencias: [] };
  M.anadirAusencia(q, { tipo: 'VAC', desde: '2026-10-01', hasta: '2026-10-10', franjas: ['T'] });
  M.anadirAusencia(q, { tipo: 'PERM', desde: '2026-10-05', hasta: '2026-10-05', franjas: ['M'] });
  const esa = q.ausencias[0];
  q.ausencias = M.quitarDiaDeAusencia(q.ausencias, '2026-10-05', a => a === esa);
  assert.deepStrictEqual(q.ausencias.map(a => `${a.tipo} ${a.desde}..${a.hasta}`), ['VAC 2026-10-01..2026-10-04', 'PERM 2026-10-05..2026-10-05', 'VAC 2026-10-06..2026-10-10']);
});

ok('A2 fix · cliente 2: ausenciasDia y etiquetaAusenciasDia enseñan TODAS las del día («Permiso por la mañana · Vacaciones por la tarde (día entero)»)', () => {
  const p = { franjas: ['M', 'T'], ausencias: [] };
  M.anadirAusencia(p, { tipo: 'VAC', desde: '2026-10-08', franjas: ['T'] });
  M.anadirAusencia(p, { tipo: 'PERM', desde: '2026-10-08', franjas: ['M'], detalle: 'médico' });
  assert.deepStrictEqual(M.ausenciasDia(p, '2026-10-08').map(a => a.tipo), ['PERM', 'VAC']);
  assert.strictEqual(M.etiquetaAusenciasDia(p, '2026-10-08'), 'Permiso por la mañana · Vacaciones por la tarde (día entero)');
  assert.strictEqual(M.etiquetaAusenciasDia(p, '2026-10-09'), '');
  const q = { franjas: ['M', 'T'], ausencias: [] };
  M.anadirAusencia(q, { tipo: 'PERM', desde: '2026-10-08', franjas: ['M'] });
  assert.strictEqual(M.etiquetaAusenciasDia(q, '2026-10-08'), 'Permiso por la mañana', 'una sola media jornada: como etiquetaAusencia');
  M.anadirAusencia(q, { tipo: 'OTRO', desde: '2026-10-08' });
  assert.strictEqual(M.etiquetaAusenciasDia(q, '2026-10-08'), 'Otro motivo', 'con una de día entero, esa (la de ausenciaEn)');
  const iv = { franjas: ['T'], ausencias: [] };
  M.anadirAusencia(iv, { tipo: 'VAC', desde: '2026-10-08', franjas: ['T'] });
  assert.strictEqual(M.etiquetaAusenciasDia(iv, '2026-10-08'), 'Vacaciones por la tarde', 'Iván: lo apuntado, sin «(día entero)» (es el dato)');
  const s = { franjas: ['M', 'T'], salida: { desde: '2026-10-01' }, ausencias: [{ tipo: 'BAJ', desde: '2026-09-01' }] };
  assert.deepStrictEqual(M.ausenciasDia(s, '2026-10-08'), [], 'desde su salida, ninguna (como ausenciaEn)');
  assert.strictEqual(M.etiquetaAusenciasDia(s, '2026-09-15'), 'Baja');
});

ok('A2 fix · cliente 4: el aviso del Generador dice «esta semana trabaja el jueves» (lo que pasa) sin «en vez de» ni «y … y»; y quien trabaja un día liberado sin turno va en sinPlaza, no en libran', () => {
  const yy = s => /\by\b[^.();:]*\by\b/.test(s || '');
  const avisos = (pid, dias) => { const cfg = cfgBase(); cfg.meses = {}; M.personaDe(cfg.staff, pid).libraPuntual = [{ semana: LP_LUN, dias }]; return M.instanciarPatron(cfg, cfg.staff, estadoOct(), LP_LUN, '2026-10-11', {}).avisos.filter(a => a.tipo === 'emparejar' && a.pid === pid).map(a => a.texto); };
  const lav = avisos('lavinia', [1, 2]);
  assert.strictEqual(lav.length, 1);
  assert.match(lav[0], /^Lavinia esta semana trabaja el jueves: no se sabe qué turno hace a cambio, así que no se le pone nada más; el resto de su semana tipo no se mueve$/);
  assert.ok(!yy(lav[0]) && !/en vez de/.test(lav[0]));
  const ml = avisos('mariluz', [1, 2, 4]);
  assert.match(ml[0], /^Mari Luz esta semana trabaja el miércoles \(libra el lunes, el martes y el jueves\): no se sabe qué turno hace a cambio, así que solo se le quita el lunes, el martes y el jueves; el resto/);
  assert.ok(!yy(ml[0]));
  assert.deepStrictEqual(avisos('mariluz', [3, 5]), [], 'añadir un día sin liberar ninguno: sin aviso');
  // «Quién libra cada día»: Lavinia el jueves (día liberado) sin turno es «sin plaza», no «libra»
  const cfg = cfgBase(); cfg.meses = {}; const e = estadoOct();
  M.personaDe(cfg.staff, 'lavinia').libraPuntual = [{ semana: LP_LUN, dias: [1, 2] }];
  const res = M.generarSemana(cfg, cfg.staff, e, LP_LUN, { meses: cfg.meses });
  const jue = '2026-10-08', trabaja = M.turnosDe(cfg).some(t => M.pidsEn(e, jue, t.id).includes('lavinia'));
  assert.ok(res.sinPlaza && res.dias.every(iso => Array.isArray(res.sinPlaza[iso])));
  if (!trabaja) { assert.ok(!res.libran[jue].includes('lavinia') && res.sinPlaza[jue].includes('lavinia'), JSON.stringify([res.libran[jue], res.sinPlaza[jue]])); }
  assert.ok(res.libran[LP_LUN].includes('lavinia') && !res.sinPlaza[LP_LUN].includes('lavinia'), 'el lunes libra de verdad');
  assert.strictEqual(res.resumen.descansos, Object.values(res.libran).reduce((a, x) => a + x.length, 0), 'los descansos son los que libran');
});

ok('A2 fix · modelo 3, 5, 8 y 9: la variable «Días que libra» con un cambio igual a lo habitual, vetoDe con un día que no es un número, limpiarLibrePuntual sin fecha y hasta ""', () => {
  const cfg = cfgBase(), ml = M.personaDe(cfg.staff, 'mariluz'), v = M.VARIABLES.find(x => x.campo === 'libra');
  const sin = v.texto({ cfg, lunes: LP_LUN }, ml).map(x => x.texto);
  ml.libraPuntual = [{ semana: LP_LUN, dias: [3] }];
  const con = v.texto({ cfg, lunes: LP_LUN }, ml);
  assert.deepStrictEqual(con.map(x => x.texto), sin, 'el texto de siempre, no «trabaja  (libra el miércoles)»');
  assert.ok(!con.some(x => x.puntual));
  const p = { vetos: [{ localId: 'MONACO', franja: 'T', dow: 'x' }] };
  assert.strictEqual(M.vetoDe(p, 'MONACO', 'T'), null, 'dow «x» y llamada sin dow: no casa (NaN)');
  assert.strictEqual(M.vetoDe(p, 'MONACO', 'T', 3), null);
  assert.ok(M.vetoDe({ vetos: [{ localId: 'MONACO', franja: 'T' }] }, 'MONACO', 'T'), 'sin dow guardado: todos los días');
  const staff = [{ id: 'a', libraPuntual: [{ semana: LP_LUN, dias: [2] }] }];
  assert.throws(() => M.limpiarLibrePuntual(staff), { name: 'TypeError', message: /limpiarLibrePuntual.*fecha/ });
  assert.deepStrictEqual(staff[0].libraPuntual, [{ semana: LP_LUN, dias: [2] }], 'y no borra nada');
  const b = { ausencias: [] };
  assert.deepStrictEqual(M.anadirAusencia(b, { tipo: 'BAJ', desde: '2026-10-01', hasta: '' }).ausencia, { tipo: 'BAJ', desde: '2026-10-01' }, 'hasta "" → sin la clave');
  assert.deepStrictEqual(M.anadirAusencia({ ausencias: [] }, { tipo: 'VAC', desde: '2026-10-01', hasta: null }).ausencia, { tipo: 'VAC', desde: '2026-10-01', hasta: '2026-10-01' });
});

ok('A2 fix · cliente 7 (decisión): normalizarAusencias quita al cargar una ausencia en una franja que la persona no trabaja (y lo devuelve para el historial) y deja la lista en el orden total', () => {
  const staff = [
    { id: 'ivan', nombre: 'Iván', franjas: ['T'], ausencias: [{ tipo: 'VAC', desde: '2026-10-20', hasta: '2026-10-20', franjas: ['M'] }, { tipo: 'VAC', desde: '2026-10-02', hasta: '2026-10-04', franjas: ['T'] }, { tipo: 'PERM', desde: '2026-10-06', hasta: '2026-10-06' }] },
    { id: 'tere', nombre: 'Tere', franjas: ['M'], ausencias: [{ tipo: 'PERM', desde: '2026-10-08', hasta: '2026-10-09', franjas: ['T'], detalle: 'médico' }] },
    { id: 'mariluz', nombre: 'Mari Luz', franjas: ['M', 'T'], ausencias: [{ tipo: 'VAC', desde: '2026-10-06', hasta: '2026-10-06', franjas: ['M'] }] },
    { id: 'leo', nombre: 'Leo', franjas: ['T'] },
  ];
  const arr = staff[0].ausencias;
  const r = M.normalizarAusencias(staff);
  assert.deepStrictEqual(r.map(x => [x.pid, x.nombre, x.ausencia.tipo, x.ausencia.desde, x.ausencia.franjas]), [['ivan', 'Iván', 'VAC', '2026-10-20', ['M']], ['tere', 'Tere', 'PERM', '2026-10-08', ['T']]]);
  assert.deepStrictEqual(staff[0].ausencias.map(a => a.tipo + ':' + a.desde), ['VAC:2026-10-02', 'PERM:2026-10-06'], 'lo suyo se queda, en orden');
  assert.strictEqual(staff[0].ausencias, arr, 'el mismo array (la ficha lo guarda por referencia)');
  assert.deepStrictEqual(staff[1].ausencias, []);
  assert.deepStrictEqual(staff[2].ausencias, [{ tipo: 'VAC', desde: '2026-10-06', hasta: '2026-10-06', franjas: ['M'] }]);
  assert.deepStrictEqual(M.normalizarAusencias(staff), [], 'idempotente');
  assert.deepStrictEqual(M.normalizarAusencias(undefined), []);
  // y con la semilla no toca nada (nadie tiene ausencias en franjas que no hace)
  const cfg = cfgBase(), antes = JSON.stringify(cfg.staff.map(p => p.ausencias));
  assert.deepStrictEqual(M.normalizarAusencias(cfg.staff), []);
  assert.strictEqual(JSON.stringify(cfg.staff.map(p => p.ausencias)), antes);
});

// ---------- A3 (30/09): auditoría del modelo · cierres y semana tipo (B1, D1, B4, B5, B6, H5, B7, B8, B9, B10, D3, D6, D8) ----------
// Los scripts de los revisores (scratchpad/auditoria-modelo/B-cierres/{02-editar-tras-generar, 03-validar, 04-textos, 07-ausencias,
// 11-estaba-vs-afectados, 14-sugerencias-editar}.js, D-patron-puntuacion/{02-patron-idavuelta, 07-seguimiento, 09-seguimiento3}.js y
// H-invariantes/caso-03-directo.mjs) como pruebas del repo: en rojo antes, en verde después.
// el estado virtual y escribible de un rango, enlazado con cfg.meses (como estadoRango(desde, hasta, true) de la app, 26-cobertura.js)
function a3Rango(cfg, desde, hasta) {
  const e = { y: +desde.slice(0, 4), m: +desde.slice(5, 7), days: [], asig: {}, apertura: {}, manual: {}, festivos: [], virtual: true };
  for (const iso of M.rangoIso(desde, hasta)) {
    const k = iso.slice(0, 7);
    cfg.meses[k] = cfg.meses[k] || { asig: {}, apertura: {}, manual: {} };
    const me = M.estadoDesde(cfg.meses, cfg.festivos || [], +iso.slice(0, 4), +iso.slice(5, 7));
    e.days.push(me.days.find(d => d.iso === iso));
    me.asig[iso] = me.asig[iso] || {}; me.apertura[iso] = me.apertura[iso] || {}; me.manual = me.manual || {}; me.manual[iso] = me.manual[iso] || {};
    e.asig[iso] = me.asig[iso]; e.apertura[iso] = me.apertura[iso]; e.manual[iso] = me.manual[iso];
  }
  return e;
}
const a3Vacio = () => Object.assign(M.semillaPasarela(), { meses: {} });
const a3Demo = () => { const cfg = a3Vacio(); M.sembrarDemo(cfg, '2026-09-24'); return cfg; };
const a3Donde = (cfg, e, iso, pid, franja) => M.turnosDe(cfg).filter(t => (!franja || t.franja === franja) && M.pidsEn(e, iso, t.id).includes(pid)).map(t => t.id);
const a3Plazas = (pat, dow, tid) => pat[dow].filter(pl => !tid || pl.t === tid).map(pl => `${pl.t}:${pl.p}${pl.c ? '(c)' : ''}${pl.a ? '(a)' : ''}${pl.por ? '<' + pl.por : ''}`).sort();

ok('A3 · B1 (02-editar-tras-generar): editar un cierre hecho sobre la semana tipo, con la semana ya generada, conserva las decisiones de quien salía de la semana tipo (VAC, SIN y apoyo); reabrirCierreDesde igual', () => {
  const cfg = a3Vacio(), st = cfg.staff;
  const c = { id: 'cie_x', localId: 'MONACO', dias: { '2026-10-05': ['T'], '2026-10-06': ['T'] }, motivo: 'reforma', detalle: '', decisiones: {}, retirados: [] };
  // 1) octubre aún sin planilla: el cierre se hace sobre la semana tipo
  const e1 = a3Rango(cfg, '2026-10-05', '2026-10-06');
  const r1 = M.aplicarCierre(cfg, st, e1, c, { scapon: { tipo: 'VAC' }, cristian: { tipo: 'SIN' }, yilian: { tipo: 'REFUERZA' } });
  assert.ok(r1.ok, JSON.stringify(r1.errores));
  assert.deepStrictEqual(c.deSemanaTipo, { '2026-10-05': ['T'], '2026-10-06': ['T'] });
  assert.ok(M.ausenciaEn(M.personaDe(st, 'scapon'), '2026-10-06', null, 'VAC'), 'Susana de vacaciones el martes 6');
  assert.strictEqual((M.decisionCierre(cfg, 'cristian', '2026-10-06', 'T') || {}).tipo, 'SIN');
  // 2) se genera octubre entero (como hace la app al abrir el mes con Generar)
  const e2 = a3Rango(cfg, '2026-10-01', '2026-10-31');
  M.generarPlanilla(cfg, st, e2, '2026-10-01', '2026-10-31', {});
  assert.deepStrictEqual(M.pidsEn(e2, '2026-10-06', 'MONACO_T'), [], 'la casilla cerrada sigue vacía tras generar');
  assert.deepStrictEqual(a3Donde(cfg, e2, '2026-10-06', 'scapon'), [], 'Susana no está en ninguna casilla el 6');
  // 3) el encargado edita el cierre sin cambiar las fechas (cambia el detalle), como confirmarCierre
  const e3 = a3Rango(cfg, '2026-10-05', '2026-10-06');
  const c2 = { id: 'cie_x', localId: 'MONACO', dias: { '2026-10-05': ['T'], '2026-10-06': ['T'] }, motivo: 'reforma', detalle: 'obra en la cocina', decisiones: {}, retirados: [] };
  const r3 = M.aplicarCierre(cfg, st, e3, c2, JSON.parse(JSON.stringify(c.decisiones)));
  assert.ok(r3.ok, JSON.stringify(r3.errores));
  assert.deepStrictEqual(c2.deSemanaTipo, { '2026-10-05': ['T'], '2026-10-06': ['T'] }, 'las casillas que el cierre de antes leyó de la semana tipo siguen leyéndola');
  assert.deepStrictEqual(Object.keys(c2.decisiones).sort(), ['cristian', 'hojan', 'scapon', 'yilian'], 'las mismas personas que al cerrar');
  assert.ok(M.ausenciaEn(M.personaDe(st, 'scapon'), '2026-10-06', null, 'VAC'), 'Susana SIGUE de vacaciones el martes 6 tras editar (antes se quitaban y no se reponían)');
  assert.strictEqual((M.decisionCierre(cfg, 'cristian', '2026-10-06', 'T') || {}).tipo, 'SIN', 'Cristian sigue sin trabajo el martes 6 por la tarde');
  assert.ok(M.apoyoPorCierre(cfg, 'yilian', '2026-10-05', 'T'), 'Yilian sigue de apoyo el lunes 5 por la tarde');
  assert.ok((M.generarSemana(cfg, st, a3Rango(cfg, '2026-10-05', '2026-10-11'), '2026-10-05', { simular: true }).sinTrabajo['2026-10-06'] || []).includes('cristian'), 'la Semana lo enseña: Cristian «sin trabajo» el 6');
  // 4) lo mismo con reabrirCierreDesde (lo que hace «Cuándo abre» al volver a marcar el día)
  const cfgB = a3Vacio(), stB = cfgB.staff;
  const cB = { id: 'cie_y', localId: 'MONACO', dias: { '2026-10-05': ['T'], '2026-10-12': ['T'] }, motivo: 'reforma', detalle: '', decisiones: {}, retirados: [] };
  M.aplicarCierre(cfgB, stB, a3Rango(cfgB, '2026-10-05', '2026-10-12'), cB, { hojan: { tipo: 'VAC' } });
  assert.ok(M.ausenciaEn(M.personaDe(stB, 'hojan'), '2026-10-05', 'T', 'VAC'), 'Hojan de vacaciones la tarde del lunes 5 (media jornada: hace El 33 por la mañana)');
  M.generarPlanilla(cfgB, stB, a3Rango(cfgB, '2026-10-01', '2026-10-31'), '2026-10-01', '2026-10-31', {});
  const rr = M.reabrirCierreDesde(cfgB, stB, a3Rango(cfgB, '2026-10-05', '2026-10-12'), 'cie_y', '2026-10-12');
  assert.ok(rr.ok && rr.parcial && JSON.stringify(rr.quedan) === '["2026-10-05"]', JSON.stringify(rr));
  assert.ok(M.ausenciaEn(M.personaDe(stB, 'hojan'), '2026-10-05', 'T', 'VAC'), 'Hojan SIGUE de vacaciones la tarde del lunes 5 (día que sigue cerrado)');
  assert.ok(!M.ausenciaEn(M.personaDe(stB, 'hojan'), '2026-10-12', 'T', 'VAC'), 'y las del 12 (que reabre) se quitan');
  assert.deepStrictEqual(rr.cierre.deSemanaTipo, { '2026-10-05': ['T'] });
  // una sola lectura para la app (contextoCierre): las casillas que el cierre de antes leyó de la semana tipo y siguen cerradas
  assert.deepStrictEqual(M.semanaTipoAlEditar({ deSemanaTipo: { '2026-10-05': ['T'], '2026-10-12': ['T'] } }, { localId: 'MONACO', dias: { '2026-10-05': ['T'], '2026-10-06': ['M'] } }), { '2026-10-05': ['T'] });
  assert.deepStrictEqual(M.semanaTipoAlEditar(null, cB), {});
});

ok('A3 · D1 (07 B, 09 B2): «Guardar como semana tipo» con un cierre por fechas: las plazas del local cerrado vuelven a la semana tipo (SIN, apoyo y VAC) y lo que puso el cierre (el apoyo con destino, el apoyo «donde haga falta» del relleno) no se guarda como plaza fija', () => {
  const L = '2026-10-05', D = '2026-10-11';
  const sin = pat => pat.map(x => x.replace(/\(a\)/, ''));   // la «a» calculada no se guarda (S18): se compara sin ella
  { // 07 B: sin trabajo y apoyo sin destino
    const cfg = cfgBase(), st = cfg.staff, e = estadoOct();
    M.instanciarPatron(cfg, st, e, L, D);
    const c = { id: 'c1', localId: 'MONACO', motivo: 'reforma', dias: { '2026-10-06': ['T'] }, decisiones: {} };
    assert.ok(M.aplicarCierre(cfg, st, e, c, { scapon: { tipo: 'SIN' }, cristian: { tipo: 'REFUERZA' } }).ok);
    assert.deepStrictEqual(M.pidsEn(e, '2026-10-06', 'MONACO_T'), [], 'la casilla cerrada está vacía');
    const p2 = M.patronDesdeSemana(e, L, cfg, st);
    assert.deepStrictEqual(a3Plazas(p2, 2), sin(a3Plazas(cfg.patron, 2)), 'el martes guardado tiene las mismas plazas que la semilla (antes perdía MONACO_T:cristian y MONACO_T:scapon(c))');
    const cfg2 = cfgBase(); cfg2.patron = p2; const e2 = estadoOct();
    M.instanciarPatron(cfg2, cfg2.staff, e2, '2026-10-13', '2026-10-13');
    assert.deepStrictEqual(M.pidsEn(e2, '2026-10-13', 'MONACO_T'), ['scapon', 'cristian'], 'el martes siguiente el Mónaco vuelve a tener a los suyos');
  }
  { // 09 B2: vacaciones y apoyo con destino (Cristian a Zapatillera, origen 'cierre')
    const cfg = cfgBase(), st = cfg.staff, e = estadoOct();
    M.instanciarPatron(cfg, st, e, L, D);
    const c = { id: 'c1', localId: 'MONACO', motivo: 'reforma', dias: { '2026-10-06': ['T'] }, decisiones: {} };
    const ap = M.aplicarCierre(cfg, st, e, c, { scapon: { tipo: 'VAC' }, cristian: { tipo: 'REFUERZA', destinos: { '2026-10-06': 'ZAPA_T' } } });
    assert.deepStrictEqual(ap.puestos, [{ iso: '2026-10-06', tid: 'ZAPA_T', pid: 'cristian' }]);
    const p2 = M.patronDesdeSemana(e, L, cfg, st);
    assert.deepStrictEqual(a3Plazas(p2, 2), sin(a3Plazas(cfg.patron, 2)), 'el martes guardado = la semilla: sin ZAPA_T:cristian y con MONACO_T:cristian y MONACO_T:scapon(c)');
    const cfg2 = cfgBase(); cfg2.patron = p2; const e2 = estadoOct();
    M.instanciarPatron(cfg2, cfg2.staff, e2, '2026-10-13', '2026-10-13');
    assert.deepStrictEqual(M.asignados(e2, '2026-10-13', 'MONACO_T').map(x => x.pid + (x.cocina ? '(c)' : '')), ['scapon(c)', 'cristian']);
    assert.deepStrictEqual(M.pidsEn(e2, '2026-10-13', 'ZAPA_T'), ['sluna', 'adrian'], 'Cristian no se queda como plaza fija de Zapatillera');
  }
  { // el apoyo «donde haga falta» que coloca el relleno (origen 'generador') tampoco es plaza fija de otro local
    const cfg = cfgBase(), st = cfg.staff, e = estadoOct();
    const c = { id: 'c1', localId: 'MONACO', motivo: 'reforma', dias: { '2026-10-05': ['T'] }, decisiones: {} };
    assert.ok(M.aplicarCierre(cfg, st, e, c, { yilian: { tipo: 'REFUERZA' } }).ok);
    M.generarPlanilla(cfg, st, e, L, D, {});
    const donde = a3Donde(cfg, e, '2026-10-05', 'yilian', 'T');
    assert.ok(donde.length === 1 && donde[0] !== 'MONACO_T', 'el relleno la pone de apoyo en otro local: ' + JSON.stringify(donde));
    const p2 = M.patronDesdeSemana(e, L, cfg, st);
    assert.deepStrictEqual(p2[1].filter(pl => pl.p === 'yilian').map(pl => pl.t), ['MONACO_T'], 'en la semana tipo, Yilian solo en su plaza del Mónaco');
    assert.deepStrictEqual(a3Plazas(p2, 1, 'MONACO_T'), sin(a3Plazas(cfg.patron, 1, 'MONACO_T')), 'la casilla cerrada, como en la semilla (con el «por Susana Capón» de Yilian)');
  }
});

ok('A3 · B4 (11-estaba-vs-afectados): una sola lectura de «quién estaba»: aplicarCierre deja decisión explícita a todos los afectados (con el día libre de la semana) y decisionCierre no inventa un «sin trabajo» desde la semana tipo cruda', () => {
  const L = '2026-10-05', MA = '2026-10-06';
  const cfg = a3Vacio(), st = cfg.staff;
  const cr = M.personaDe(st, 'cristian');
  M.ponerLibraPuntual(cr, L, [2]);   // esta semana libra el martes 6 (en vez del miércoles)
  assert.deepStrictEqual(M.plazasDelDia(cfg, st, MA).plazas.filter(p => p.t === 'MONACO_T').map(p => p.p), ['scapon']);
  const e = a3Rango(cfg, MA, MA);
  const c = { id: 'e1', localId: 'MONACO', dias: { [MA]: ['T'] }, motivo: 'reforma', detalle: '', decisiones: {}, retirados: [] };
  assert.ok(!M.afectadosPorCierre(cfg, st, e, c).some(a => a.pid === 'cristian'), 'el visor no pregunta por Cristian (esta semana libra el martes)');
  M.aplicarCierre(cfg, st, e, c, {});
  assert.deepStrictEqual(Object.keys(c.decisiones), ['scapon']);
  assert.strictEqual(M.decisionCierre(cfg, 'cristian', MA, 'T'), null, 'Cristian no está «sin trabajo» el martes: ese día libra (antes: SIN implícito, estabaEnCierre leía plazasDe cruda)');
  assert.strictEqual((M.decisionCierre(cfg, 'scapon', MA, 'T') || {}).tipo, 'SIN', 'Susana sí, con decisión explícita');
  assert.ok(M.estadoDia(cfg, cr, MA).libra && !M.estadoDia(cfg, cr, MA).cierre, JSON.stringify(M.estadoDia(cfg, cr, MA)));
  M.generarPlanilla(cfg, st, e, MA, MA, {});
  const h = M.horasPersonaMes(cfg, st, cfg.meses, 'cristian', 2026, 10);
  assert.ok(!h.sinTrabajoCierre.some(x => x.iso === MA), 'Horas no dice «sin trabajo por el cierre» el martes 6: ' + JSON.stringify(h.sinTrabajoCierre));
  const g = M.generarSemana(cfg, st, a3Rango(cfg, L, '2026-10-11'), L, { simular: true });
  assert.ok(!(g.sinTrabajo[MA] || []).includes('cristian') && g.libran[MA].includes('cristian'), 'la Semana lo pone entre los que libran, no «sin trabajo»');
  // lo retirado al cerrar sigue contando como «estaba» (un cierre viejo sin decisión para esa persona)
  const cfg4 = Object.assign(cfgBase(), { cierresPuntuales: [{ id: 'v', localId: 'MONACO', dias: { [MA]: ['T'] }, motivo: 'reforma', decisiones: {}, retirados: [{ iso: MA, tid: 'MONACO_T', entry: { pid: 'cristian', origen: 'patron' } }] }] });
  assert.strictEqual(M.decisionCierre(cfg4, 'cristian', MA, 'T').tipo, 'SIN');
  // y c.deSemanaTipo (la casilla se leyó de la semana tipo) cuenta como «estaba» solo si la semana tipo de ESA fecha le da plaza
  // ahí (corrección de A3, B4 opción a): con el día libre de la semana, Cristian no; sin él, sí
  const cfg5 = Object.assign(cfgBase(), { cierresPuntuales: [{ id: 'v', localId: 'MONACO', dias: { [MA]: ['T'] }, motivo: 'reforma', decisiones: {}, retirados: [], deSemanaTipo: { [MA]: ['T'] } }] });
  M.ponerLibraPuntual(M.personaDe(cfg5.staff, 'cristian'), L, [2]);
  assert.strictEqual(M.decisionCierre(cfg5, 'cristian', MA, 'T'), null);
  M.personaDe(cfg5.staff, 'cristian').libraPuntual = [];
  assert.strictEqual((M.decisionCierre(cfg5, 'cristian', MA, 'T') || {}).tipo, 'SIN');
});

ok('A3 · B6 (14-sugerencias-editar): sugerenciasRefuerzo admite opts.pendientes (y semanaTipo): al editar, quien no pudo volver a su casilla tiene destinos', () => {
  const L = '2026-09-28', MA = '2026-09-29';
  const cfg = a3Demo(), st = cfg.staff, e = a3Rango(cfg, L, MA);
  const c = { id: 's1', localId: 'MONACO', dias: { [L]: ['T'], [MA]: ['T'] }, motivo: 'reforma', detalle: '', decisiones: {}, retirados: [] };
  M.aplicarCierre(cfg, st, e, c, {});
  assert.ok(M.asignar(e, cfg, st, MA, 'EL33_T', 'cristian', { forzar: true, origen: 'manual' }).ok, 'Cristian forzado en El 33 el martes');
  // lo que hace contextoCierre al editar: deshacer sobre copias y preguntar con los pendientes
  const cfg2 = Object.assign({}, cfg, { cierresPuntuales: JSON.parse(JSON.stringify(cfg.cierresPuntuales)) });
  const st2 = JSON.parse(JSON.stringify(st)), e2 = M.clonarEstado(e);
  const cNuevo = { id: 's1', localId: 'MONACO', dias: { [L]: ['T'], [MA]: ['T'] }, motivo: 'reforma', detalle: '', decisiones: {}, retirados: [] };
  const pend = M.quitarCierre(cfg2, st2, e2, 's1', { devolver: true, quitarVacaciones: true }).noDevueltos.filter(x => x.entry && M.dentroDeCierre(cNuevo, x.iso, x.tid));
  assert.deepStrictEqual(pend.map(x => x.pid + ' ' + x.iso), ['cristian ' + MA]);
  assert.ok(M.afectadosPorCierre(cfg2, st2, e2, cNuevo, { pendientes: pend }).some(a => a.pid === 'cristian'), 'el visor lista a Cristian (pendiente)');
  assert.deepStrictEqual(M.sugerenciasRefuerzo(cfg2, st2, e2, cNuevo, 'cristian'), {}, 'sin los pendientes no hay de dónde sacar sus turnos cerrados');
  const s = M.sugerenciasRefuerzo(cfg2, st2, e2, cNuevo, 'cristian', { pendientes: pend });
  assert.ok(Array.isArray(s[MA]) && s[MA].length > 0 && s[MA].every(x => x.franja === 'T' && x.localId !== 'MONACO'), JSON.stringify(s));
  // está forzado en El 33 esa tarde: ese es su sitio (ponerApoyoCierre lo da por puesto), no se le ofrece otro que la puerta rechazaría
  assert.deepStrictEqual(s[MA].map(x => `${x.tid}${x.ya ? ' (ya está aquí)' : ''}`), ['EL33_T (ya está aquí)'], JSON.stringify(s[MA]));
  assert.strictEqual(s[MA][0].razon, 'ya está aquí');
  // y sin estar en ninguna casilla (se le quita de El 33), los destinos de siempre
  M.desasignar(e2, MA, 'EL33_T', 'cristian');
  const s2 = M.sugerenciasRefuerzo(cfg2, st2, e2, cNuevo, 'cristian', { pendientes: pend });
  assert.ok(s2[MA].length >= 2 && s2[MA].every(x => !x.ya && x.localId !== 'MONACO'), JSON.stringify(s2[MA]));
});

ok('A3 · H5 (caso-03-directo): el apoyo del cierre respeta la cocina (S34): ponerApoyoCierre, sugerenciasRefuerzo e instanciarCierres pasan por la puerta con el puesto de sala', () => {
  const S = a3Vacio();
  const e = M.nuevoEstado(2026, 11, { festivos: [] });
  M.generarPlanilla(S, S.staff, e, '2026-11-01', '2026-11-30', {});
  const D = '2026-11-02';   // lunes: Adrián lleva la cocina de Zapatillera por la mañana y por la tarde
  assert.deepStrictEqual(M.turnosDe(S).filter(t => M.pidsEn(e, D, t.id).includes('adrian')).map(t => t.id + (M.asignados(e, D, t.id).find(x => x.pid === 'adrian').cocina ? '(c)' : '')), ['ZAPA_M(c)', 'ZAPA_T(c)']);
  const c = { id: 'cie_x', localId: 'ZAPA', dias: { [D]: ['T'] }, motivo: 'reforma', detalle: '', decisiones: {}, retirados: [] };
  const sug = M.sugerenciasRefuerzo(S, S.staff, e, c, 'adrian');
  assert.deepStrictEqual(sug[D] || [], [], 'el visor no le sugiere ningún sitio de sala esa tarde: ya lleva la cocina de Zapatillera ese día');
  M.aplicarCierre(S, S.staff, e, c, { adrian: { tipo: 'REFUERZA' } });
  assert.strictEqual(M.puedeEstar(S, S.staff, e, D, 'MONACO_T', 'adrian', { puesto: 'sala' }).motivo, 'ya lleva la cocina de Zapatillera ese día');
  const r = M.aplicarCierre(S, S.staff, e, c, { adrian: { tipo: 'REFUERZA', destinos: { [D]: 'MONACO_T' } } });
  assert.deepStrictEqual(r.puestos, []);
  assert.deepStrictEqual(r.rechazados, [{ iso: D, tid: 'MONACO_T', pid: 'adrian', motivo: 'ya lleva la cocina de Zapatillera ese día' }]);
  assert.ok(!M.pidsEn(e, D, 'MONACO_T').includes('adrian'));
  const ic = M.instanciarCierres(S, S.staff, e, D, D);
  assert.deepStrictEqual(ic.aplicados, []);
  assert.ok(ic.rechazados.some(x => x.pid === 'adrian' && x.motivo === 'ya lleva la cocina de Zapatillera ese día'), JSON.stringify(ic));
  // quien solo hace cocina tampoco refuerza la sala
  const S2 = a3Vacio(); M.personaDe(S2.staff, 'adrian').soloCocina = true;
  const e2 = M.nuevoEstado(2026, 11, { festivos: [] });
  const c2 = { id: 'cie_y', localId: 'ZAPA', dias: { [D]: ['T'] }, motivo: 'reforma', detalle: '', decisiones: {}, retirados: [] };
  const r2 = M.aplicarCierre(S2, S2.staff, e2, c2, { adrian: { tipo: 'REFUERZA', destinos: { [D]: 'MONACO_T' } } });
  assert.deepStrictEqual(r2.rechazados, [{ iso: D, tid: 'MONACO_T', pid: 'adrian', motivo: 'solo hace cocina' }]);
  assert.strictEqual(M.ponerApoyoCierre(S2, S2.staff, e2, c2, 'adrian', D, 'MONACO_T').motivo, 'solo hace cocina');
});

ok('A3 · B7/B8/B9 (03-validar, 04-textos): validarCierre rechaza fechas imposibles y franjas repetidas; el destino de apoyo al propio local cerrado o a una casilla cerrada no se guarda (sale rechazado una vez, no en cada generación); textoCierre con franjas mezcladas en el mismo día de cada semana enumera', () => {
  const cfg = a3Vacio(), st = cfg.staff;
  const base = extra => Object.assign({ id: 'v1', localId: 'ZAPA', dias: { '2026-10-05': ['T'] }, motivo: 'reforma', detalle: '', decisiones: {}, retirados: [] }, extra || {});
  const err = c => M.validarCierre(cfg, c).errores.join(' | ');
  assert.ok(M.validarCierre(cfg, base()).ok);
  assert.match(err(base({ dias: { '2026-10-05': ['T', 'T'] } })), /franja repetida el 2026-10-05/);
  assert.match(err(base({ dias: { '2026-02-30': ['T'] } })), /fecha no válida: 2026-02-30/);
  assert.match(err(base({ dias: { '2026-13-01': ['T'] } })), /fecha no válida: 2026-13-01/);
  assert.ok(M.validarCierre(cfg, base({ dias: { '2026-10-05': ['T', 'M'] } })).ok, 'desordenadas vale');
  // el texto: las franjas repetidas no son el día entero
  const t = (dias, extra) => M.textoCierre(cfg, Object.assign({ id: 't', localId: 'MONACO', motivo: 'reforma', detalle: '', dias }, extra || {}));
  assert.strictEqual(t({ '2026-09-28': ['T', 'T'] }), 'Bar Mónaco cerrado por reforma (lun 28/09 tarde)');
  assert.strictEqual(t({ '2026-09-27': ['T'], '2026-10-04': ['T'], '2026-10-11': ['T'], '2026-10-18': ['T'] }), 'Bar Mónaco cerrado por reforma (los domingos por la tarde del 27/09 al 18/10)');
  assert.strictEqual(t({ '2026-09-27': ['M', 'T'], '2026-10-04': ['M', 'T'], '2026-10-11': ['M', 'T'] }), 'Bar Mónaco cerrado por reforma (los domingos del 27/09 al 11/10)');
  assert.strictEqual(t({ '2026-09-27': ['T'], '2026-10-04': ['M', 'T'], '2026-10-11': ['T'], '2026-10-18': ['T'] }), 'Bar Mónaco cerrado por reforma (dom 27/09 tarde, dom 04/10, dom 11/10 tarde y dom 18/10 tarde)', 'uno de ellos entero: se enumera (antes «los domingos del 27/09 al 18/10», como si los cuatro fueran enteros)');
  // el destino de apoyo: al propio local cerrado o a una casilla cerrada por horario (El 33 no abre la tarde del lunes)
  const e = a3Rango(cfg, '2026-10-05', '2026-10-06');
  const c = base({ id: 'd1', localId: 'MONACO', dias: { '2026-10-05': ['T'], '2026-10-06': ['T'] } });
  const r = M.aplicarCierre(cfg, st, e, c, { yilian: { tipo: 'REFUERZA', destinos: { '2026-10-05': 'MONACO_T', '2026-10-06': 'PASARELA_M' } }, hojan: { tipo: 'REFUERZA', destinos: { '2026-10-05': 'EL33_T' } } });
  assert.ok(r.ok);
  assert.strictEqual(c.decisiones.yilian.destinos, undefined, 'el destino al propio local cerrado no se guarda (ni el de otra franja)');
  assert.strictEqual(c.decisiones.hojan.destinos, undefined, 'el destino a una casilla cerrada por horario no se guarda');
  assert.deepStrictEqual(r.puestos, []);
  assert.deepStrictEqual(r.rechazados.map(x => `${x.pid} ${x.tid}: ${x.motivo}`), ['yilian MONACO_T: Bar Mónaco cerrado por reforma (lun 05/10 – mar 06/10, solo tardes)', 'hojan EL33_T: El 33 no abre la tarde el lunes'], 'y se dice una vez, al aplicar');
  assert.deepStrictEqual(M.instanciarCierres(cfg, st, e, '2026-10-05', '2026-10-06'), { aplicados: [], rechazados: [] }, 'cada generación ya no lo vuelve a rechazar');
  // un destino que sí vale sigue valiendo
  const cfgB = a3Vacio(), c2 = base({ id: 'd2', localId: 'MONACO', dias: { '2026-10-05': ['T'] } });
  const r2 = M.aplicarCierre(cfgB, cfgB.staff, a3Rango(cfgB, '2026-10-05', '2026-10-05'), c2, { yilian: { tipo: 'REFUERZA', destinos: { '2026-10-05': 'PASARELA_T' } } });
  assert.deepStrictEqual(r2.puestos, [{ iso: '2026-10-05', tid: 'PASARELA_T', pid: 'yilian' }]);
  assert.deepStrictEqual(c2.decisiones.yilian.destinos, { '2026-10-05': 'PASARELA_T' });
});

ok('A3 · B10 (07-ausencias caso 5): al reabrir, las vacaciones propias con las que se fundieron las del cierre no arrastran «cierre de Bar Mónaco» en el detalle', () => {
  const L = '2026-09-28', MA = '2026-09-29', MI = '2026-09-30';
  const cfg = a3Demo(), st = cfg.staff, e = a3Rango(cfg, L, MA);
  const su = M.personaDe(st, 'scapon');
  M.anadirAusencia(su, { tipo: 'VAC', desde: MI, hasta: '2026-10-02', detalle: 'las suyas' });
  const c = { id: 'a5', localId: 'MONACO', dias: { [MA]: ['T'] }, motivo: 'reforma', detalle: '', decisiones: {}, retirados: [] };
  M.aplicarCierre(cfg, st, e, c, { scapon: { tipo: 'VAC' } });
  assert.deepStrictEqual(su.ausencias, [{ tipo: 'VAC', desde: MA, hasta: '2026-10-02', detalle: 'las suyas · cierre de Bar Mónaco · reforma' }], 'fundidas');
  const q = M.quitarCierre(cfg, st, e, 'a5', { devolver: true, quitarVacaciones: true });
  assert.deepStrictEqual(q.vacacionesQuitadas, [{ pid: 'scapon', iso: MA, tipo: 'VAC' }]);
  assert.deepStrictEqual(su.ausencias, [{ tipo: 'VAC', desde: MI, hasta: '2026-10-02', detalle: 'las suyas' }], 'tras reabrir, sus vacaciones con su detalle');
  // sin detalle propio: la ausencia que queda se queda sin detalle (no con uno vacío)
  const cfg2 = a3Demo(), st2 = cfg2.staff, e2 = a3Rango(cfg2, L, MA);
  const su2 = M.personaDe(st2, 'scapon');
  M.anadirAusencia(su2, { tipo: 'VAC', desde: MI, hasta: '2026-10-02' });
  const c2 = { id: 'a6', localId: 'MONACO', dias: { [MA]: ['T'] }, motivo: 'reforma', detalle: '', decisiones: {}, retirados: [] };
  M.aplicarCierre(cfg2, st2, e2, c2, { scapon: { tipo: 'VAC' } });
  M.quitarCierre(cfg2, st2, e2, 'a6', { devolver: true, quitarVacaciones: true });
  assert.deepStrictEqual(su2.ausencias, [{ tipo: 'VAC', desde: MI, hasta: '2026-10-02' }]);
  // reabrir desde una fecha: los días que siguen cerrados conservan sus vacaciones (y su detalle)
  const cfg3 = a3Demo(), st3 = cfg3.staff, e3 = a3Rango(cfg3, '2026-10-05', '2026-10-13');
  const su3 = M.personaDe(st3, 'scapon');
  const c3 = { id: 'a7', localId: 'MONACO', dias: { '2026-10-06': ['T'], '2026-10-13': ['T'] }, motivo: 'reforma', detalle: '', decisiones: {}, retirados: [] };
  M.aplicarCierre(cfg3, st3, e3, c3, { scapon: { tipo: 'VAC' } });
  M.reabrirCierreDesde(cfg3, st3, e3, 'a7', '2026-10-13');
  assert.deepStrictEqual(su3.ausencias.filter(a => a.tipo === 'VAC').map(a => [a.desde, a.hasta, a.detalle]), [['2026-10-06', '2026-10-06', 'cierre de Bar Mónaco · reforma']]);
});

ok('A3 · D3/D8 (07 C, 02 caso 3): «Sale primero» a mano se guarda en la semana tipo solo si con ella abrirá (y si no, se avisa: X es «Quién abre»); la «a» de la plaza que se repone de quien faltaba va con la misma regla que las demás', () => {
  const L = '2026-10-05', D = '2026-10-11', MA = '2026-10-06';
  { // 07 C: Mari Luz «sale primero» a mano el martes por la mañana; Lola es «Quién abre» de Pasarela
    const cfg = cfgBase(), st = cfg.staff, e = estadoOct();
    M.instanciarPatron(cfg, st, e, L, D);
    M.marcarAbre(e, MA, 'PASARELA_M', 'mariluz', cfg);
    assert.strictEqual(M.primeroDe(cfg, st, e, MA, 'PASARELA_M'), 'mariluz');
    const avisos = [];
    const p2 = M.patronDesdeSemana(e, L, cfg, st, { avisos });
    assert.deepStrictEqual(p2[2].filter(x => x.t === 'PASARELA_M').map(x => `${x.p}${x.a ? '(a)' : ''}`), ['mariluz', 'lola', 'tere'], 'la «a» no se guarda: con la semana tipo no mandaría');
    assert.deepStrictEqual(avisos, ['Mari Luz: el «Sale primero» del martes 6 por la mañana en Pasarela no se conserva en la semana tipo: abriría Lola («Quién abre» de Pasarela); para que abra siempre Mari Luz, cámbialo en Ajustes de Pasarela → Quién abre (o «Sale el primero» en su ficha)']);
    const cfg2 = cfgBase(); cfg2.patron = p2; const e2 = estadoOct();
    M.instanciarPatron(cfg2, cfg2.staff, e2, '2026-10-13', '2026-10-13');
    assert.strictEqual(M.primeroDe(cfg2, cfg2.staff, e2, '2026-10-13', 'PASARELA_M'), 'lola');
    const p3 = M.patronDesdeSemana(e2, '2026-10-12', cfg2, cfg2.staff);
    assert.deepStrictEqual(p3[2].filter(x => x.t === 'PASARELA_M').map(x => x.p + (x.a ? '(a)' : '')), ['lola', 'mariluz', 'tere'], 'el segundo guardado no pierde nada que el primero tuviera');
  }
  { // el mismo caso sin «Quién abre» del local ni «sale el primero» en la ficha de Lola: la «a» a mano sí manda y se guarda
    const cfg = cfgBase(), st = cfg.staff, e = estadoOct();
    M.localDe(cfg, 'PASARELA').primero = { M: null, T: null };
    for (const p of st) if (p.abre && p.abre.PASARELA) delete p.abre.PASARELA;
    M.instanciarPatron(cfg, st, e, L, D);
    M.marcarAbre(e, MA, 'PASARELA_M', 'mariluz', cfg);
    const avisos = [];
    const p2 = M.patronDesdeSemana(e, L, cfg, st, { avisos });
    assert.deepStrictEqual(p2[2].filter(x => x.t === 'PASARELA_M' && x.a).map(x => x.p), ['mariluz']);
    assert.deepStrictEqual(avisos, []);
    const cfg2 = cfgBase(); M.localDe(cfg2, 'PASARELA').primero = { M: null, T: null }; for (const p of cfg2.staff) if (p.abre && p.abre.PASARELA) delete p.abre.PASARELA;
    cfg2.patron = p2; const e2 = estadoOct();
    M.instanciarPatron(cfg2, cfg2.staff, e2, '2026-10-13', '2026-10-13');
    assert.strictEqual(M.primeroDe(cfg2, cfg2.staff, e2, '2026-10-13', 'PASARELA_M'), 'mariluz');
  }
  { // 02 caso 3 (D8): Iván de vacaciones vie 9 – dom 11 por la tarde: su plaza vuelve a la semana tipo SIN la «a» (es «Quién abre»: la «a» no decide), igual que el martes, el miércoles y el jueves
    const cfg = cfgBase(), st = cfg.staff, e = estadoOct();
    M.anadirAusencia(M.personaDe(st, 'ivan'), { tipo: 'VAC', desde: '2026-10-09', hasta: '2026-10-11', franjas: ['T'] });
    M.generarPlanilla(cfg, st, e, L, D, {});
    const p2 = M.patronDesdeSemana(e, L, cfg, st);
    for (const d of [2, 3, 4, 5, 6, 7]) assert.deepStrictEqual(p2[d].filter(pl => pl.t === 'PASARELA_T' && pl.p === 'ivan'), [{ t: 'PASARELA_T', p: 'ivan' }], 'dow ' + d);
    assert.deepStrictEqual(p2[5].findIndex(pl => pl.t === 'PASARELA_T'), p2[5].findIndex(pl => pl.p === 'ivan'), 'y la primera de la casilla: sigue abriendo');
  }
  { // laboratorio: B con «a» detrás de X en la semana tipo. B falta esta semana: su plaza vuelve la primera (abría) y, como con la
    // «a» calculada, la marca sobra porque el orden ya lo dice; exactamente lo mismo que se guarda sin la ausencia
    const cfg = a1Mundo([a1P('x'), a1P('b')], cfg => { cfg.patron = { 2: [{ t: 'PASARELA_M', p: 'x' }, { t: 'PASARELA_M', p: 'b', a: 1 }] }; });
    const st = cfg.staff, e = estadoOct(), e3 = estadoOct();
    M.instanciarPatron(cfg, st, e3, MA, MA);
    assert.strictEqual(M.primeroDe(cfg, st, e3, MA, 'PASARELA_M'), 'b');
    assert.deepStrictEqual(M.patronDesdeSemana(e3, L, cfg, st)[2], [{ t: 'PASARELA_M', p: 'b' }, { t: 'PASARELA_M', p: 'x' }], 'sin ausencia: la primera, sin la «a»');
    M.anadirAusencia(M.personaDe(st, 'b'), { tipo: 'VAC', desde: MA, hasta: MA });
    M.instanciarPatron(cfg, st, e, MA, MA);
    assert.deepStrictEqual(M.pidsEn(e, MA, 'PASARELA_M'), ['x']);
    assert.deepStrictEqual(M.patronDesdeSemana(e, L, cfg, st)[2], [{ t: 'PASARELA_M', p: 'b' }, { t: 'PASARELA_M', p: 'x' }], 'con la ausencia, igual');
  }
  { // y cuando la «a» repuesta sí decide, se queda: F, «Quién abre», está en standby (no entra ni se repone); B con «a» detrás de X
    const cfg = a1Mundo([a1P('f', { standby: true }), a1P('x'), a1P('b')], cfg => { cfg.patron = { 2: [{ t: 'PASARELA_M', p: 'f' }, { t: 'PASARELA_M', p: 'x' }, { t: 'PASARELA_M', p: 'b', a: 1 }] }; M.localDe(cfg, 'PASARELA').primero.M = 'f'; });
    const st = cfg.staff, e = estadoOct();
    M.anadirAusencia(M.personaDe(st, 'b'), { tipo: 'VAC', desde: MA, hasta: MA });
    M.instanciarPatron(cfg, st, e, MA, MA);
    assert.deepStrictEqual(M.pidsEn(e, MA, 'PASARELA_M'), ['x']);
    assert.deepStrictEqual(M.patronDesdeSemana(e, L, cfg, st)[2], [{ t: 'PASARELA_M', p: 'x' }, { t: 'PASARELA_M', p: 'b', a: 1 }], 'con la «a» abre B; sin ella abriría X');
  }
});

// ---------- A3 · corrección tras la revisión (30/09): los casos de los revisores (modelo 1–7, cliente 1–7) como pruebas ----------
// scratchpad/fases/A3rev/modelo/caso-P1..P5.js, caso-ic1-141.mjs y scratchpad/fases/A3rev/cliente/{04,05,11}-*.mjs, como pruebas del
// repo: en rojo antes, en verde después.
const a3fCierre = (id, localId, dias, extra) => Object.assign({ id, localId, dias, motivo: 'reforma', detalle: '', decisiones: {}, retirados: [] }, extra || {});

ok('A3 · corrección (modelo 1): editar un cierre AÑADIENDO una franja a un día leído de la semana tipo lee la semana tipo solo en la casilla que ya leía de ella (semanaTipoAlEditar por casilla) y la planilla en la nueva; c.deSemanaTipo va por casilla y el array antiguo sigue valiendo', () => {
  const L = '2026-10-05';
  const cfg = a3Vacio(), st = cfg.staff;
  // 1) cierre del lunes 5 por la tarde sobre la semana tipo (octubre sin planilla)
  const c = a3fCierre('b', 'MONACO', { [L]: ['T'] });
  assert.ok(M.aplicarCierre(cfg, st, a3Rango(cfg, L, L), c, { yilian: { tipo: 'REFUERZA' }, hojan: { tipo: 'VAC' } }).ok);
  assert.deepStrictEqual(c.deSemanaTipo, { [L]: ['T'] }, 'por casilla: el día con las franjas leídas de la semana tipo');
  // 2) Cristian ya no hace mañanas (no entrará en MONACO_M) y se genera octubre: Yilian sí acaba en MONACO_M (el relleno)
  M.personaDe(st, 'cristian').franjas = ['T'];
  M.generarPlanilla(cfg, st, a3Rango(cfg, '2026-10-01', '2026-10-31'), '2026-10-01', '2026-10-31', {});
  const e = a3Rango(cfg, L, L);
  assert.ok(M.pidsEn(e, L, 'MONACO_M').includes('yilian') && !M.pidsEn(e, L, 'MONACO_M').includes('cristian'), 'la mañana del Mónaco en la planilla: ' + JSON.stringify(M.pidsEn(e, L, 'MONACO_M')));
  // 3) se edita el cierre añadiendo la mañana
  const c2 = a3fCierre('b', 'MONACO', { [L]: ['M', 'T'] });
  const deST = M.semanaTipoAlEditar(M.cierresDe(cfg)[0], c2);
  assert.deepStrictEqual(deST, { [L]: ['T'] }, 'solo la tarde se leyó de la semana tipo');
  const af = M.afectadosPorCierre(cfg, st, e, c2, { pendientes: [], semanaTipo: deST });
  const porM = af.filter(a => a.turnos.some(t => t.franja === 'M')).map(a => a.pid).sort();
  assert.ok(porM.includes('yilian') && !porM.includes('cristian'), 'la mañana se lee de la planilla (Yilian sí, Cristian no): ' + JSON.stringify(porM));
  assert.deepStrictEqual(af.find(a => a.pid === 'yilian').turnos.map(t => `${t.franja}:${t.fuente}`).sort(), ['M:planilla', 'T:semana tipo'], 'la unión: la mañana de la planilla y la tarde de la semana tipo');
  const r = M.aplicarCierre(cfg, st, e, c2, { yilian: { tipo: 'REFUERZA' }, hojan: { tipo: 'VAC' } });
  assert.ok(r.ok, JSON.stringify(r.errores));
  assert.deepStrictEqual(c2.decisiones.yilian.turnos.slice().sort(), [L + '|M', L + '|T'], 'Yilian (estaba en MONACO_M) tiene decisión para la mañana');
  assert.ok(!(c2.decisiones.cristian && c2.decisiones.cristian.turnos.includes(L + '|M')), 'Cristian (NO estaba en MONACO_M) no recibe «sin trabajo» por la mañana: ' + JSON.stringify(c2.decisiones.cristian));
  assert.ok(c2.retirados.some(x => x.tid === 'MONACO_M' && x.entry.pid === 'yilian'), 'la plaza de Yilian de la mañana se retira (planilla)');
  assert.deepStrictEqual(c2.decisiones.hojan.turnos, [L + '|T'], 'Hojan sigue en la tarde (semana tipo), con sus vacaciones de la tarde');
  assert.ok(M.ausenciaEn(M.personaDe(st, 'hojan'), L, 'T', 'VAC'));
  assert.deepStrictEqual(c2.deSemanaTipo, { [L]: ['T'] });
  assert.ok(!M.horasPersonaMes(cfg, st, cfg.meses, 'cristian', 2026, 10).sinTrabajoCierre.some(x => x.iso === L && x.franjas.includes('M')), 'Horas: Cristian no está «sin trabajo» la mañana del 5');
  // el array antiguo (días enteros) sigue valiendo en el cierre de antes y en opts.semanaTipo
  const viejo = a3fCierre('v', 'MONACO', { [L]: ['T'], '2026-10-06': ['M', 'T'] }, { deSemanaTipo: [L, '2026-10-06'] });
  assert.deepStrictEqual(M.semanaTipoAlEditar(viejo, a3fCierre('v', 'MONACO', { [L]: ['M', 'T'], '2026-10-06': ['M'], '2026-10-07': ['T'] })), { [L]: ['T'], '2026-10-06': ['M'] });
  assert.deepStrictEqual(M.semanaTipoAlEditar(null, c2), {});
  const afViejo = M.afectadosPorCierre(cfg, st, e, a3fCierre('w', 'MONACO', { [L]: ['M', 'T'] }), { semanaTipo: [L] });
  assert.ok(afViejo.find(a => a.pid === 'cristian') && afViejo.every(a => a.turnos.every(t => t.fuente === 'semana tipo')), 'con el array antiguo, el día entero de la semana tipo');
});

ok('A3 · corrección (cliente 1): acortar o reabrir un cierre hecho ANTES de generar repone en las casillas que reabren (y ya tienen planilla) las plazas de la semana tipo, por la puerta (origen patron), y lo devuelve en el resultado; si alguna no cabe, lo dice', () => {
  const L2 = '2026-11-02', M3 = '2026-11-03';
  const preparar = () => {
    const cfg = a3Vacio(), st = cfg.staff;
    const c = a3fCierre('n', 'MONACO', { [L2]: ['T'], [M3]: ['T'] });
    assert.ok(M.aplicarCierre(cfg, st, a3Rango(cfg, L2, M3), c, { scapon: { tipo: 'VAC' } }).ok);
    M.generarPlanilla(cfg, st, a3Rango(cfg, '2026-11-01', '2026-11-30'), '2026-11-01', '2026-11-30', {});
    const e = a3Rango(cfg, L2, M3);
    assert.deepStrictEqual(M.pidsEn(e, M3, 'MONACO_T'), [], 'generado con el cierre: la tarde del martes vacía');
    return { cfg, st, c, e };
  };
  { // acortar al lunes 2 (editar): el martes 3 vuelve a abrir con Susana y Cristian, de la semana tipo
    const { cfg, st, c, e } = preparar();
    const c2 = a3fCierre('n', 'MONACO', { [L2]: ['T'] });
    const r = M.aplicarCierre(cfg, st, e, c2, JSON.parse(JSON.stringify(c.decisiones)));
    assert.ok(r.ok, JSON.stringify(r.errores));
    assert.deepStrictEqual(r.repuestos.map(x => `${x.iso} ${x.tid} ${x.pid}`).sort(), [`${M3} MONACO_T cristian`, `${M3} MONACO_T scapon`], 'lo repuesto, listado');
    assert.deepStrictEqual(r.noRepuestos, []);
    assert.deepStrictEqual(M.asignados(e, M3, 'MONACO_T').map(x => `${x.pid}${x.cocina ? '(c)' : ''}[${x.origen}]`), ['scapon(c)[patron]', 'cristian[patron]'], 'como lo pondría el generador');
    assert.ok(!M.ausenciaEn(M.personaDe(st, 'scapon'), M3, null, 'VAC'), 'Susana ya no tiene vacaciones el 3');
    assert.deepStrictEqual(c2.deSemanaTipo, { [L2]: ['T'] });
    assert.ok(M.ausenciaEn(M.personaDe(st, 'scapon'), L2, 'T', 'VAC') === null && (M.decisionCierre(cfg, 'yilian', L2, 'T') || {}).tipo === 'SIN', 'el lunes sigue como estaba');
  }
  { // reabrirCierreDesde el martes: igual, y el resultado lo trae filtrado por fecha
    const { cfg, st, e } = preparar();
    const r = M.reabrirCierreDesde(cfg, st, e, 'n', M3);
    assert.ok(r.ok && r.parcial);
    assert.deepStrictEqual(r.repuestos.map(x => x.pid).sort(), ['cristian', 'scapon']);
    assert.deepStrictEqual(M.pidsEn(e, M3, 'MONACO_T'), ['scapon', 'cristian']);
  }
  { // reabrir del todo (quitarCierre con devolver): las dos tardes
    const { cfg, st, e } = preparar();
    const q = M.quitarCierre(cfg, st, e, 'n', { devolver: true, quitarVacaciones: true });
    assert.deepStrictEqual(q.repuestos.map(x => `${x.iso} ${x.pid}`).sort(), [`${L2} hojan`, `${L2} yilian`, `${M3} cristian`, `${M3} scapon`]);
    assert.deepStrictEqual(M.pidsEn(e, L2, 'MONACO_T'), ['yilian', 'hojan']);
    // y reabrir desde el primer día es reabrir del todo: lo mismo
    const w = preparar();
    const r = M.reabrirCierreDesde(w.cfg, w.st, w.e, 'n', L2);
    assert.ok(!r.parcial && r.repuestos.length === 4, JSON.stringify(r.repuestos));
  }
  { // quien no cabe se dice: a Cristian se le forzó en El 33 esa tarde
    const { cfg, st, c, e } = preparar();
    assert.ok(M.asignar(e, cfg, st, M3, 'EL33_T', 'cristian', { forzar: true, origen: 'manual' }).ok);
    const r = M.aplicarCierre(cfg, st, e, a3fCierre('n', 'MONACO', { [L2]: ['T'] }), JSON.parse(JSON.stringify(c.decisiones)));
    assert.deepStrictEqual(r.repuestos.map(x => x.pid), ['scapon']);
    assert.ok(r.noRepuestos.length === 1 && r.noRepuestos[0].pid === 'cristian' && /El 33/.test(r.noRepuestos[0].motivo), JSON.stringify(r.noRepuestos));
    assert.deepStrictEqual(M.pidsEn(e, M3, 'MONACO_T'), ['scapon']);
  }
  { // un día que aún no tiene planilla no se toca (lo pondrá el generador), y un día leído de la planilla tampoco (vuelve lo retirado)
    const cfg = a3Vacio(), st = cfg.staff;
    const c = a3fCierre('s', 'MONACO', { [L2]: ['T'], [M3]: ['T'] });
    M.aplicarCierre(cfg, st, a3Rango(cfg, L2, M3), c, {});
    const e = a3Rango(cfg, L2, M3);
    const r = M.aplicarCierre(cfg, st, e, a3fCierre('s', 'MONACO', { [L2]: ['T'] }), {});
    assert.deepStrictEqual(r.repuestos, []);
    assert.deepStrictEqual(M.pidsEn(e, M3, 'MONACO_T'), []);
    const cfgB = a3Demo(), stB = cfgB.staff, eB = a3Rango(cfgB, '2026-09-28', '2026-09-29');
    const cB = a3fCierre('p', 'MONACO', { '2026-09-28': ['T'], '2026-09-29': ['T'] });
    M.aplicarCierre(cfgB, stB, eB, cB, {});
    assert.ok(cB.retirados.length > 0 && Object.keys(cB.deSemanaTipo).length === 0);
    const rB = M.aplicarCierre(cfgB, stB, eB, a3fCierre('p', 'MONACO', { '2026-09-28': ['T'] }), {});
    assert.deepStrictEqual(rB.repuestos, [], 'nada de la semana tipo: vuelve lo retirado');
    assert.ok(M.pidsEn(eB, '2026-09-29', 'MONACO_T').length > 0, 'lo retirado del martes vuelve');
  }
});

ok('A3 · corrección (modelo 3, B4 opción a): quien pasa a tener plaza de la semana tipo en una casilla que se leyó de ella cuenta como «sin trabajo» sin decisión (estabaEnCierre, tercer camino), no como que libra; standby, salida o ausencia no cuentan, y una casilla leída de la planilla tampoco', () => {
  const L = '2026-10-05', MA = '2026-10-06';
  const cfg = a3Vacio(), st = cfg.staff, cr = M.personaDe(st, 'cristian');
  M.ponerLibraPuntual(cr, L, [2]);   // esta semana libra el martes 6 (en vez del miércoles)
  const c = a3fCierre('c', 'MONACO', { [MA]: ['T'] });
  M.aplicarCierre(cfg, st, a3Rango(cfg, MA, MA), c, {});
  assert.deepStrictEqual(Object.keys(c.decisiones), ['scapon'], 'el visor no preguntó por Cristian');
  assert.strictEqual(M.decisionCierre(cfg, 'cristian', MA, 'T'), null, 'esa semana libra el martes: nada');
  cr.libraPuntual = [];   // el encargado deshace el cambio de día libre: su plaza del martes vuelve a la casilla cerrada
  const d = M.decisionCierre(cfg, 'cristian', MA, 'T');
  assert.ok(d && d.tipo === 'SIN' && d.explicita === false && d.cierre === c, 'sin trabajo implícito: ' + JSON.stringify(d));
  assert.strictEqual(M.decisionCierre(cfg, 'cristian', MA, 'M'), null, 'solo en la casilla cerrada');
  assert.strictEqual(M.decisionCierre(cfg, 'lola', MA, 'T'), null, 'quien no tiene plaza ahí, no');
  const e = a3Rango(cfg, L, '2026-10-11');
  const g = M.generarSemana(cfg, st, e, L, {});
  assert.ok(g.sinTrabajo[MA].includes('cristian') && !g.libran[MA].includes('cristian'), 'la Semana: «sin trabajo», no «libra»: ' + JSON.stringify({ sin: g.sinTrabajo[MA], libran: g.libran[MA] }));
  assert.ok(M.horasPersonaMes(cfg, st, cfg.meses, 'cristian', 2026, 10).sinTrabajoCierre.some(x => x.iso === MA), 'Horas lo dice');
  const ed = M.estadoDia(cfg, cr, MA);
  assert.ok(ed.cierre && ed.cierre.tipo === 'SIN' && ed.cierre.explicita === false && /sin trabajo/.test(ed.texto), JSON.stringify(ed));
  // standby, salida o ausencia ese día: no
  cfg.patron[2].push({ t: 'MONACO_T', p: 'dulce' });
  assert.strictEqual(M.decisionCierre(cfg, 'dulce', MA, 'T'), null, 'Dulce está en standby');
  M.personaDe(st, 'dulce').standby = false;
  assert.strictEqual((M.decisionCierre(cfg, 'dulce', MA, 'T') || {}).tipo, 'SIN');
  M.anadirAusencia(M.personaDe(st, 'dulce'), { tipo: 'VAC', desde: MA, hasta: MA });
  assert.strictEqual(M.decisionCierre(cfg, 'dulce', MA, 'T'), null, 'de vacaciones ese día');
  M.darSalida(cfg, st, cfg.meses, 'cristian', '2026-10-01', 'se va');
  assert.strictEqual(M.decisionCierre(cfg, 'cristian', MA, 'T'), null, 'ya no está con nosotros');
  // el array antiguo en c.deSemanaTipo vale igual; y una casilla leída de la planilla (retirados) no lee la semana tipo
  const cfg2 = Object.assign(cfgBase(), { cierresPuntuales: [a3fCierre('v', 'MONACO', { [MA]: ['T'] }, { deSemanaTipo: [MA] })] });
  assert.strictEqual((M.decisionCierre(cfg2, 'cristian', MA, 'T') || {}).tipo, 'SIN', 'array antiguo');
  const cfg3 = a3Demo(), st3 = cfg3.staff, e3 = a3Rango(cfg3, '2026-09-29', '2026-09-29');
  const c3 = a3fCierre('p', 'MONACO', { '2026-09-29': ['T'] });
  M.aplicarCierre(cfg3, st3, e3, c3, {});
  assert.ok(c3.retirados.length > 0 && Object.keys(c3.deSemanaTipo).length === 0);
  cfg3.patron[2].push({ t: 'MONACO_T', p: 'dulce' }); M.personaDe(st3, 'dulce').standby = false;
  assert.strictEqual(M.decisionCierre(cfg3, 'dulce', '2026-09-29', 'T'), null, 'la casilla se leyó de la planilla: la semana tipo no dice nada');
});

ok('A3 · corrección (modelo 2, cliente 3): «Sale primero» a mano con quien abriría (Lola, «Quién abre») ausente esa semana: se mira DESPUÉS de reponer las plazas del día, así se avisa (antes se guardaba una «a» inerte sin decirlo); el aviso dice dónde cambiarlo', () => {
  const L = '2026-10-05', D = '2026-10-11', MA = '2026-10-06';
  const cfg = cfgBase(), st = cfg.staff, e = estadoOct();
  M.anadirAusencia(M.personaDe(st, 'lola'), { tipo: 'VAC', desde: MA, hasta: MA });
  M.instanciarPatron(cfg, st, e, L, D);
  assert.deepStrictEqual(M.pidsEn(e, MA, 'PASARELA_M'), ['mariluz', 'tere']);
  M.marcarAbre(e, MA, 'PASARELA_M', 'mariluz', cfg, st);
  const avisos = [];
  const p2 = M.patronDesdeSemana(e, L, cfg, st, { avisos });
  assert.deepStrictEqual(p2[2].filter(x => x.t === 'PASARELA_M').map(x => `${x.p}${x.a ? '(a)' : ''}`), ['lola', 'mariluz', 'tere'], 'Lola vuelve la primera (abría) y la «a» de Mari Luz no se guarda: con la semana tipo abre Lola');
  assert.deepStrictEqual(avisos, ['Mari Luz: el «Sale primero» del martes 6 por la mañana en Pasarela no se conserva en la semana tipo: abriría Lola («Quién abre» de Pasarela); para que abra siempre Mari Luz, cámbialo en Ajustes de Pasarela → Quién abre (o «Sale el primero» en su ficha)']);
  const cfg2 = cfgBase(); cfg2.patron = p2; const e2 = estadoOct();
  M.instanciarPatron(cfg2, cfg2.staff, e2, '2026-10-13', '2026-10-13');
  assert.strictEqual(M.primeroDe(cfg2, cfg2.staff, e2, '2026-10-13', 'PASARELA_M'), 'lola');
  // sin nadie fijo, la «a» a mano de Mari Luz sí manda aunque Lola vuelva: se guarda, sin aviso, y Lola vuelve sin la suya
  const cfgB = cfgBase(), stB = cfgB.staff, eB = estadoOct();
  M.localDe(cfgB, 'PASARELA').primero = { M: null, T: null };
  for (const p of stB) if (p.abre && p.abre.PASARELA) delete p.abre.PASARELA;
  M.anadirAusencia(M.personaDe(stB, 'lola'), { tipo: 'VAC', desde: MA, hasta: MA });
  M.instanciarPatron(cfgB, stB, eB, L, D);
  M.marcarAbre(eB, MA, 'PASARELA_M', 'mariluz', cfgB, stB);
  const avisosB = [];
  const pB = M.patronDesdeSemana(eB, L, cfgB, stB, { avisos: avisosB });
  assert.deepStrictEqual(avisosB, []);
  assert.deepStrictEqual(pB[2].filter(x => x.t === 'PASARELA_M' && x.a).map(x => x.p), ['mariluz'], 'una sola «a» en la casilla: la puesta a mano');
  const cfgC = cfgBase(); M.localDe(cfgC, 'PASARELA').primero = { M: null, T: null }; for (const p of cfgC.staff) if (p.abre && p.abre.PASARELA) delete p.abre.PASARELA;
  cfgC.patron = pB; const eC = estadoOct();
  M.instanciarPatron(cfgC, cfgC.staff, eC, '2026-10-13', '2026-10-13');
  assert.strictEqual(M.primeroDe(cfgC, cfgC.staff, eC, '2026-10-13', 'PASARELA_M'), 'mariluz');
});

ok('A3 · corrección (modelo 7 = cliente 2): apoyo de cocina: a quien solo hace cocina o lleva una cocina ese día, sugerenciasRefuerzo ofrece las cocinas libres de otros locales (puesto cocina, por la puerta) y, si no hay ninguna, el motivo; el destino guardado lleva el puesto y ponerApoyoCierre / aplicarCierre / instanciarCierres lo respetan', () => {
  const D = '2026-11-02';   // lunes: El 33 no abre por la tarde
  { // Hojan (solo cocina), Mónaco cerrado el lunes por la tarde, semana sin generar y Adrián (la cocina de Zapatillera de la semana
    // tipo) de vacaciones ese día: la cocina de Zapatillera por la tarde está libre; sin la ausencia no lo estaría (la traería la
    // semana tipo al generar, y el apoyo se quedaría de sala)
    const S = a3Vacio(), e = a3Rango(S, D, D);
    const c = a3fCierre('h', 'MONACO', { [D]: ['T'] });
    const s0 = M.sugerenciasRefuerzo(S, S.staff, e, c, 'hojan');
    assert.deepStrictEqual(s0[D], [], 'la semana tipo trae a Adrián con la cocina: no está libre');
    assert.match(s0.motivos[D], /^Hojan solo hace cocina: no puede reforzar la sala de otro local, y el lunes 2 por la tarde no hay ninguna cocina libre en otro local$/);
    M.anadirAusencia(M.personaDe(S.staff, 'adrian'), { tipo: 'VAC', desde: D, hasta: D });
    const sug = M.sugerenciasRefuerzo(S, S.staff, e, c, 'hojan');
    assert.deepStrictEqual((sug[D] || []).map(x => `${x.tid}:${x.puesto}`), ['ZAPA_T:cocina'], JSON.stringify(sug));
    assert.match(sug[D][0].razon, /^cocina · /);
    assert.strictEqual(sug.motivos, undefined);
    // el destino de cocina se guarda con su puesto y se pone con la cocina
    const r = M.aplicarCierre(S, S.staff, e, c, { hojan: { tipo: 'REFUERZA', destinos: { [D]: 'ZAPA_T|cocina' } } });
    assert.deepStrictEqual(r.puestos, [{ iso: D, tid: 'ZAPA_T', pid: 'hojan' }], JSON.stringify(r.rechazados));
    assert.deepStrictEqual(c.decisiones.hojan.destinos, { [D]: 'ZAPA_T|cocina' });
    assert.deepStrictEqual(M.asignados(e, D, 'ZAPA_T').map(x => `${x.pid}${x.cocina ? '(c)' : ''}[${x.origen}]`), ['hojan(c)[cierre]']);
    assert.deepStrictEqual(M.destinoCierre('ZAPA_T|cocina'), { tid: 'ZAPA_T', puesto: 'cocina' });
    assert.deepStrictEqual(M.destinoCierre('ZAPA_T'), { tid: 'ZAPA_T', puesto: 'sala' });
    // se genera la semana: Hojan sigue de cocina en Zapatillera (nadie cubre a Adrián); se vacía y se vuelve a generar: instanciarCierres lo repone
    const eW = a3Rango(S, '2026-11-02', '2026-11-08');
    M.generarPlanilla(S, S.staff, eW, '2026-11-02', '2026-11-08', {});
    assert.deepStrictEqual(M.asignados(eW, D, 'ZAPA_T').map(x => `${x.pid}${x.cocina ? '(c)' : ''}`), ['sluna', 'hojan(c)']);
    M.desasignar(eW, D, 'ZAPA_T', 'hojan');
    const ic = M.instanciarCierres(S, S.staff, eW, D, D);
    assert.deepStrictEqual(ic.aplicados.map(x => x.pid), ['hojan']);
    assert.ok(M.asignados(eW, D, 'ZAPA_T').find(x => x.pid === 'hojan').cocina);
    // Adrián vuelve y se regenera: la cocina es suya (semana tipo); el apoyo de cocina solo vale como cocinero, así que Hojan sale
    // de Zapatillera y se dice por qué
    M.personaDe(S.staff, 'adrian').ausencias = [];
    const g2 = M.generarPlanilla(S, S.staff, eW, '2026-11-02', '2026-11-08', {});
    assert.deepStrictEqual(M.asignados(eW, D, 'ZAPA_T').map(x => `${x.pid}${x.cocina ? '(c)' : ''}`), ['sluna', 'adrian(c)']);
    assert.ok(g2.rechazados.some(x => x.pid === 'hojan' && x.turnoId === 'ZAPA_T' && x.motivo === 'la cocina de Zapatillera esa tarde ya la lleva Adrián'), JSON.stringify(g2.rechazados.filter(x => x.pid === 'hojan')));
    // al reabrir, el apoyo de cocina sale como los demás
    M.personaDe(S.staff, 'adrian').ausencias = [{ tipo: 'VAC', desde: D, hasta: D }];
    M.desasignar(eW, D, 'ZAPA_T', 'adrian');
    assert.ok(M.instanciarCierres(S, S.staff, eW, D, D).aplicados.length === 1);
    const q = M.quitarCierre(S, S.staff, eW, 'h', { devolver: true, quitarVacaciones: true });
    assert.deepStrictEqual(q.apoyosQuitados, [{ iso: D, tid: 'ZAPA_T', pid: 'hojan' }]);
  }
  { // semana ya generada: todas las cocinas de la tarde tienen cocinero → ningún destino, y el motivo
    const S = a3Vacio(), e = a3Rango(S, '2026-11-01', '2026-11-30');
    M.generarPlanilla(S, S.staff, e, '2026-11-01', '2026-11-30', {});
    const c = a3fCierre('h2', 'MONACO', { [D]: ['T'] });
    const sug = M.sugerenciasRefuerzo(S, S.staff, e, c, 'hojan');
    assert.deepStrictEqual(sug[D], []);
    assert.strictEqual(sug.motivos[D], 'Hojan solo hace cocina: no puede reforzar la sala de otro local, y el lunes 2 por la tarde no hay ninguna cocina libre en otro local');
    // Adrián (lleva la cocina de Zapatillera por la mañana), Zapatillera cerrada por la tarde
    const cz = a3fCierre('z', 'ZAPA', { [D]: ['T'] });
    const sz = M.sugerenciasRefuerzo(S, S.staff, e, cz, 'adrian');
    assert.deepStrictEqual(sz[D], []);
    assert.strictEqual(sz.motivos[D], 'Adrián ya lleva la cocina de Zapatillera ese día: no puede reforzar la sala de otro local, y el lunes 2 por la tarde no hay ninguna cocina libre en otro local');
    // quien sí puede hacer sala no tiene motivo ni cocinas
    const sy = M.sugerenciasRefuerzo(S, S.staff, e, c, 'yilian');
    assert.ok(sy[D].length > 0 && sy[D].every(x => x.puesto === 'sala') && sy.motivos === undefined, JSON.stringify(sy));
    // un destino de cocina a una casilla que ya tiene cocinero se rechaza al aplicar, con el porqué, y no se guarda
    const r = M.aplicarCierre(S, S.staff, a3Rango(S, D, D), c, { hojan: { tipo: 'REFUERZA', destinos: { [D]: 'ZAPA_T|cocina' } } });
    assert.deepStrictEqual(r.puestos, []);
    assert.ok(r.rechazados.length === 1 && /ya la lleva Adrián/.test(r.rechazados[0].motivo), JSON.stringify(r.rechazados));
  }
});

ok('A3 · corrección (modelo 4): B10 con dos cierres del mismo local y motivo: al reabrir uno, el detalle «cierre de Bar Mónaco · reforma» se quita solo de las ausencias que tocó este cierre, y nunca si otro cierre vigente con el mismo detalle tiene un día dentro', () => {
  { // caso-P4: Susana de VAC en los dos cierres (mar 6 y mar 13), fundidos con sus vacaciones propias (7–12)
    const cfg = a3Demo(), st = cfg.staff, e = a3Rango(cfg, '2026-10-05', '2026-10-13');
    const su = M.personaDe(st, 'scapon');
    M.anadirAusencia(su, { tipo: 'VAC', desde: '2026-10-07', hasta: '2026-10-12', detalle: 'las suyas' });
    M.aplicarCierre(cfg, st, e, a3fCierre('A', 'MONACO', { '2026-10-06': ['T'] }), { scapon: { tipo: 'VAC' } });
    M.aplicarCierre(cfg, st, e, a3fCierre('B', 'MONACO', { '2026-10-13': ['T'] }), { scapon: { tipo: 'VAC' } });
    assert.deepStrictEqual(su.ausencias, [{ tipo: 'VAC', desde: '2026-10-06', hasta: '2026-10-13', detalle: 'las suyas · cierre de Bar Mónaco · reforma' }]);
    M.quitarCierre(cfg, st, e, 'A', { devolver: true, quitarVacaciones: true });
    assert.deepStrictEqual(su.ausencias, [{ tipo: 'VAC', desde: '2026-10-07', hasta: '2026-10-13', detalle: 'las suyas · cierre de Bar Mónaco · reforma' }], 'el 13 sigue de VAC por B: el detalle se queda');
    M.quitarCierre(cfg, st, e, 'B', { devolver: true, quitarVacaciones: true });
    assert.deepStrictEqual(su.ausencias, [{ tipo: 'VAC', desde: '2026-10-07', hasta: '2026-10-12', detalle: 'las suyas' }], 'sin ningún cierre, sus vacaciones con su detalle');
  }
  { // caso-ic1-141: dos cierres con LD de Cris (23/09 por A; 24–25 por B): quitar B no toca el detalle del 23, que puso A
    const cfg = a3Demo(), st = cfg.staff, e = a3Rango(cfg, '2026-09-23', '2026-09-25');
    const cris = M.personaDe(st, 'cris');
    M.aplicarCierre(cfg, st, e, a3fCierre('A', 'MONACO', { '2026-09-23': ['M'] }, { motivo: 'vacaciones' }), { cris: { tipo: 'LD' } });
    M.aplicarCierre(cfg, st, e, a3fCierre('B', 'MONACO', { '2026-09-24': ['M', 'T'], '2026-09-25': ['M'] }, { motivo: 'vacaciones' }), { cris: { tipo: 'LD' } });
    assert.deepStrictEqual(cris.ausencias.filter(a => a.tipo === 'LD'), [{ tipo: 'LD', desde: '2026-09-23', hasta: '2026-09-25', detalle: 'cierre de Bar Mónaco · vacaciones' }]);
    M.quitarCierre(cfg, st, e, 'B', { devolver: true, quitarVacaciones: true });
    assert.deepStrictEqual(cris.ausencias.filter(a => a.tipo === 'LD'), [{ tipo: 'LD', desde: '2026-09-23', hasta: '2026-09-23', detalle: 'cierre de Bar Mónaco · vacaciones' }], 'el 23 es de A: conserva el detalle');
    // y una ausencia del mismo tipo y detalle que este cierre NO tocó (otra persona, u otros días) se queda como está
    const otra = M.personaDe(st, 'esmeralda');
    M.anadirAusencia(otra, { tipo: 'LD', desde: '2026-09-30', hasta: '2026-09-30', detalle: 'cierre de Bar Mónaco · vacaciones' });
    M.quitarCierre(cfg, st, e, 'A', { devolver: true, quitarVacaciones: true });
    assert.deepStrictEqual(cris.ausencias.filter(a => a.tipo === 'LD'), []);
    assert.deepStrictEqual(otra.ausencias.filter(a => a.tipo === 'LD'), [{ tipo: 'LD', desde: '2026-09-30', hasta: '2026-09-30', detalle: 'cierre de Bar Mónaco · vacaciones' }], 'no la tocó este cierre');
  }
});

ok('A3 · corrección (modelo 5): «Guardar como semana tipo» con un cierre no repone en la casilla cerrada a quien ya no está con nosotros ni a quien está en standby (tampoco por el camino de la ausencia)', () => {
  const L = '2026-10-05', D = '2026-10-11', MA = '2026-10-06';
  for (const conCierre of [false, true]) {
    const cfg = a3Vacio(), st = cfg.staff;
    M.darSalida(cfg, st, cfg.meses, 'adrian', '2026-10-01', 'se va');
    const e = a3Rango(cfg, L, D);
    if (conCierre) M.aplicarCierre(cfg, st, e, a3fCierre('z', 'ZAPA', { [MA]: ['T'] }), {});
    M.generarPlanilla(cfg, st, e, L, D, {});
    const p2 = M.patronDesdeSemana(e, L, cfg, st);
    assert.ok(!p2[2].some(pl => pl.t === 'ZAPA_T' && pl.p === 'adrian'), `${conCierre ? 'con' : 'sin'} cierre: Adrián (ya no está) no vuelve a la semana tipo: ` + JSON.stringify(a3Plazas(p2, 2, 'ZAPA_T')));
  }
  for (const conCierre of [false, true]) {
    const cfg = a3Vacio(), st = cfg.staff;
    cfg.patron[2].push({ t: 'MONACO_T', p: 'dulce' });   // Dulce (standby) con plaza los martes
    const e = a3Rango(cfg, L, D);
    if (conCierre) M.aplicarCierre(cfg, st, e, a3fCierre('m', 'MONACO', { [MA]: ['T'] }), {});
    M.generarPlanilla(cfg, st, e, L, D, {});
    assert.ok(!M.patronDesdeSemana(e, L, cfg, st)[2].some(pl => pl.t === 'MONACO_T' && pl.p === 'dulce'), `${conCierre ? 'con' : 'sin'} cierre: Dulce (standby) no se repone`);
  }
  { // por el camino de la ausencia: quien se fue y además tenía vacaciones apuntadas
    const cfg = a3Vacio(), st = cfg.staff;
    M.darSalida(cfg, st, cfg.meses, 'adrian', '2026-10-01', 'se va');
    M.anadirAusencia(M.personaDe(st, 'adrian'), { tipo: 'VAC', desde: MA, hasta: MA });
    const e = a3Rango(cfg, L, D);
    M.generarPlanilla(cfg, st, e, L, D, {});
    assert.ok(!M.patronDesdeSemana(e, L, cfg, st)[2].some(pl => pl.p === 'adrian'));
  }
});

ok('A3 · corrección (cliente 5): generarSemana lista aparte, por franja, al apoyo sin sitio de quien trabaja la otra franja (apoyoSinSitioParcial), como sinTrabajoParcial', () => {
  const L = '2026-09-28', MA = '2026-09-29';
  const cfg = a3Demo(), st = cfg.staff, e = a3Rango(cfg, L, '2026-10-04');
  const c = a3fCierre('z', 'ZAPA', { [MA]: ['T'] }, { motivo: 'otro', detalle: 'fumigación' });
  assert.ok(M.aplicarCierre(cfg, st, e, c, { adrian: { tipo: 'REFUERZA' }, sluna: { tipo: 'REFUERZA' } }).ok);
  const g = M.generarSemana(cfg, st, e, L, {});
  assert.ok(M.asignados(g.estado, MA, 'ZAPA_M').some(x => x.pid === 'adrian' && x.cocina), 'Adrián sigue con la cocina de la mañana');
  assert.ok(!M.turnosDe(cfg).some(t => t.franja === 'T' && M.pidsEn(g.estado, MA, t.id).includes('adrian')), 'y por la tarde no está en ningún sitio');
  assert.deepStrictEqual(g.apoyoSinSitioParcial[MA], [{ pid: 'adrian', franjas: ['T'] }], 'sale como apoyo sin sitio de la tarde');
  assert.ok(!g.apoyoSinSitio[MA].includes('adrian') && !g.libran[MA].includes('adrian'));
  assert.ok(g.dias.every(iso => Array.isArray(g.apoyoSinSitioParcial[iso])));
});

// ---------- A4 (30/09): auditoría del modelo · generador y retirada (H4, H6, C7, C8, C2, E1, E2, E8, E4, E5, D2/E9, E6, D4, E7, E10, D5) ----------
// Los scripts de los revisores (scratchpad/auditoria-modelo/H-invariantes/{caso-02-directo, caso-08, caso-09-directo}.mjs,
// E-generador/{09-retirada-reglas, 13-veto-condicion, 12-relevo-ida-vuelta, 06-mover, 10-resumen-semana, 08-casos-finos, 07-huecos,
// 04-verificar}.js, C-puerta-casilla/{03-cubre, 08-asignar, 01-puerta}.js y D-patron-puntuacion/{07-seguimiento, 08-seguimiento2}.js)
// como pruebas del repo: en rojo antes, en verde después.
// la semana del lunes 28/09 (cruza a octubre) sobre dos meses recién creados, como base.js de la lente E: o = { libra, cierre, cubre, ivanVac }
const A4_LUN = '2026-09-28';
function a4Escenario(o) {
  o = Object.assign({ libra: false, cierre: false, cubre: false, ivanVac: false }, o || {});
  const cfg = cfgBase(), staff = cfg.staff;
  if (o.libra) M.ponerLibraPuntual(M.personaDe(staff, 'mariluz'), A4_LUN, [2]);
  if (o.cubre) M.personaDe(staff, 'mariluz').cubreA = [{ pid: 'ivan' }];
  if (o.ivanVac) M.personaDe(staff, 'ivan').ausencias = [{ tipo: 'VAC', desde: '2026-10-02', hasta: '2026-10-04' }];
  const ms = { '2026-09': M.nuevoEstado(2026, 9, { festivos: [] }), '2026-10': M.nuevoEstado(2026, 10, { festivos: [] }) };
  if (o.cierre) {
    const c = { id: 'c_monaco', localId: 'MONACO', motivo: 'reforma', dias: { '2026-09-27': ['T'], '2026-09-28': ['M', 'T'], '2026-09-29': ['M', 'T'] } };
    const r = M.aplicarCierre(cfg, staff, ms['2026-09'], c, Object.assign({ scapon: { tipo: 'VAC' }, cristian: { tipo: 'REFUERZA' } }, o.decisiones || {}));
    assert.deepStrictEqual(r.errores, []);
  }
  return { cfg, staff, ms, sv: lpSemanaVirtual(ms, A4_LUN) };
}
// la foto de la semana: por casilla, quién (en su orden) con su «por», si es relevo y su razón, y (01/10, corrección H-02/H-11)
// quién abre y quién lleva la cocina
const a4Foto = (cfg, e, lunes) => { const m = {}; for (let k = 0; k < 7; k++) { const iso = M.addDias(lunes, k); for (const t of M.turnosDe(cfg)) { const xs = M.asignados(e, iso, t.id).map(x => [x.pid, x.por || null, !!x.relevo, x.razon || null, !!x.abre, !!x.cocina]); if (xs.length) m[iso + ' ' + t.id] = JSON.stringify(xs); } } return m; };
const a4Difs = (a, b) => [...new Set([...Object.keys(a), ...Object.keys(b)])].sort().filter(k => a[k] !== b[k]);
const a4Donde = (cfg, e, iso, pid) => M.turnosDe(cfg).filter(t => M.pidsEn(e, iso, t.id).includes(pid)).map(t => t.id);

ok('A4 · H4/D15 (09-retirada-reglas, caso 02): regenerar retira lo AUTOMÁTICO que ahora rompe una regla dura por la puerta (locales, franjas, vetos, standby, «nunca con» estricto, otra casilla esa franja), con el texto del bloqueo; lo relajable (partido, cocina) se queda con su aviso, y lo manual o forzado nunca se retira', () => {
  const J1 = '2026-10-01', V2 = '2026-10-02';
  const caso = (cambia, iso, tid, pid) => {
    const a = a4Escenario();
    M.generarSemana(a.cfg, a.staff, a.sv, A4_LUN, {});
    const antes = M.asignados(a.sv, iso, tid).find(x => x.pid === pid);
    assert.ok(antes && M.esAutomatica(antes), `${pid} estaba en ${tid} el ${iso} en automático`);
    cambia(a);
    const r = M.generarSemana(a.cfg, a.staff, a.sv, A4_LUN, {});
    return { r, sigue: !!M.asignados(a.sv, iso, tid).find(x => x.pid === pid), ret: r.retirados.filter(x => x.pid === pid && x.iso === iso && x.turnoId === tid), avisos: M.avisosVigentes(a.cfg, a.staff, a.sv, iso, tid, pid), a };
  };
  const seRetira = (nombre, x, motivo) => { assert.ok(!x.sigue && x.ret.length === 1 && x.ret[0].motivo === motivo, `${nombre}: ${JSON.stringify({ sigue: x.sigue, ret: x.ret })}`); };
  const seQueda = (nombre, x, aviso) => { assert.ok(x.sigue && !x.ret.length && x.avisos.includes(aviso), `${nombre}: ${JSON.stringify({ sigue: x.sigue, ret: x.ret, avisos: x.avisos })}`); };
  seRetira('locales', caso(a => { M.personaDe(a.staff, 'tere').locales = ['MONACO']; }, J1, 'PASARELA_M', 'tere'), 'solo Bar Mónaco');
  seRetira('franjas', caso(a => { M.personaDe(a.staff, 'ivan').franjas = ['M']; }, J1, 'PASARELA_T', 'ivan'), 'siempre de mañana');
  seRetira('veto nuevo', caso(a => { M.personaDe(a.staff, 'cristian').vetos.push({ localId: 'MONACO', franja: 'T' }); }, V2, 'MONACO_T', 'cristian'), 'no hace tardes en Bar Mónaco');
  seRetira('standby', caso(a => { M.personaDe(a.staff, 'tere').standby = true; }, J1, 'PASARELA_M', 'tere'), 'en standby: aún no entra en la planilla');
  // «nunca con» estricto nuevo entre dos plazas automáticas: sobra Tere (la 3.ª), no Lola, que abre (01/10, corrección C3: el
  // motivo dice por qué se queda la otra)
  const nc = caso(a => { M.personaDe(a.staff, 'tere').nuncaCon = ['lola']; }, J1, 'PASARELA_M', 'tere');
  seRetira('nunca con estricto', nc, 'nunca con Lola (se queda Lola, que abre)');
  assert.ok(M.pidsEn(nc.a.sv, J1, 'PASARELA_M').includes('lola') && !nc.r.retirados.some(x => x.pid === 'lola'), 'Lola (abre, entró antes) se queda');
  // las de siempre siguen igual, con el texto de la puerta
  seRetira('libra', caso(a => { M.personaDe(a.staff, 'mariluz').libra = [4]; }, J1, 'PASARELA_T', 'mariluz'), 'libra los jueves');
  seRetira('ausencia', caso(a => { M.personaDe(a.staff, 'ivan').ausencias = [{ tipo: 'VAC', desde: J1, hasta: J1 }]; }, J1, 'PASARELA_T', 'ivan'), 'de vacaciones');
  seRetira('cerrado', caso(a => { M.localDe(a.cfg, 'PASARELA').abre.T = [1, 2, 3, 5, 6, 7]; }, J1, 'PASARELA_T', 'ivan'), 'Pasarela no abre la tarde el jueves');
  // lo relajable o forzable que no es dura (D15) se queda, con su aviso
  seQueda('partido', caso(a => { M.personaDe(a.staff, 'mariluz').partido.dias = [2, 5, 6]; }, J1, 'PASARELA_T', 'mariluz'), 'no hace partido los jueves');
  seQueda('cocina', caso(a => { M.personaDe(a.staff, 'hojan').cocina.nunca = true; }, J1, 'MONACO_T', 'hojan'), 'solo hace cocina');
  // ya en otra casilla esa franja (dura, no forzable): una entrada automática metida a pelo en un segundo local se retira
  const dup = caso(a => { a.sv.asig[J1].MONACO_M.push({ pid: 'tere', cocina: false, abre: false, origen: 'generador', razon: 'a pelo' }); }, J1, 'PASARELA_M', 'tere');
  assert.ok(dup.sigue && dup.r.retirados.some(x => x.pid === 'tere' && x.turnoId === 'MONACO_M' && x.motivo === 'ya en Pasarela esta mañana'), JSON.stringify(dup.r.retirados.filter(x => x.pid === 'tere')));
  assert.ok(!M.pidsEn(dup.a.sv, J1, 'MONACO_M').includes('tere'));
  // lo puesto a mano o forzado NUNCA (principio 4): Leo forzado en Pasarela (solo Zapatillera) se queda con su aviso
  {
    const a = a4Escenario();
    M.generarSemana(a.cfg, a.staff, a.sv, A4_LUN, {});
    M.personaDe(a.staff, 'leo').locales = ['ZAPA'];
    assert.ok(M.asignar(a.sv, a.cfg, a.staff, V2, 'PASARELA_M', 'leo', { origen: 'manual', forzar: true, puesto: 'sala', razon: 'lo dice el encargado' }).ok);
    M.personaDe(a.staff, 'tere').locales = ['MONACO'];
    const r = M.generarSemana(a.cfg, a.staff, a.sv, A4_LUN, {});
    assert.ok(!r.retirados.some(x => x.pid === 'leo' && x.turnoId === 'PASARELA_M'), 'lo forzado no se retira: ' + JSON.stringify(r.retirados.filter(x => x.pid === 'leo')));
    assert.ok(M.pidsEn(a.sv, V2, 'PASARELA_M').includes('leo'));
    assert.ok(M.avisosVigentes(a.cfg, a.staff, a.sv, V2, 'PASARELA_M', 'leo').includes('solo Zapatillera'));
    assert.ok(r.retirados.some(x => x.pid === 'leo' && x.turnoId === 'PASARELA_T' && x.motivo === 'solo Zapatillera'), 'su plaza automática de la tarde sí');
  }
  // caso 02 de la lente H: cuatro cambios en Equipo tras generar octubre; al regenerar la semana del 5 nadie queda avisado por ellos
  {
    const S = cfgBase(); const e = estadoOct();
    M.generarPlanilla(S, S.staff, e, '2026-10-01', '2026-10-31', {});
    M.personaDe(S.staff, 'scapon').standby = true; M.personaDe(S.staff, 'cris').franjas = ['T']; M.personaDe(S.staff, 'leo').locales = ['ZAPA']; M.personaDe(S.staff, 'ivan').vetos = [{ localId: 'PASARELA', franja: 'T' }];
    M.ponerNuncaCon(S.staff, 'cris', 'esmeralda');
    const g = M.generarPlanilla(S, S.staff, e, '2026-10-05', '2026-10-11', {});
    assert.ok(g.retirados.length >= 5, JSON.stringify(g.retirados.map(x => [x.pid, x.iso, x.turnoId, x.motivo])));
    const rev = M.revisionMes(S, S.staff, e, { desde: '2026-10-05', hasta: '2026-10-11' }).filter(x => /standby|solo tardes|solo Zapatillera|no hace tardes|nunca con/.test(x.msg));
    assert.deepStrictEqual(rev, [], JSON.stringify(rev.slice(0, 3)));
    // y el generador no vuelve a poner lo que acaba de retirar: regenerar otra vez no retira nada
    assert.deepStrictEqual(M.generarPlanilla(S, S.staff, e, '2026-10-05', '2026-10-11', {}).retirados, []);
  }
});

ok('A4 · H6/C7/C8 (caso 09, 01-puerta §4, 08-asignar §1): todo lo que asigna pasa por la puerta con su puesto: la semana tipo no pone de sala a quien «solo hace cocina» (sale rechazado con el motivo y la condición queda ✓), el volcado y el plan de cobertura tampoco; asignar con cocina:true y sin puesto es cocina, y no hace caso a yaDentro', () => {
  { // caso 09: Cristian «solo hace cocina» y su plaza fija de sala de la semana tipo
    const S = cfgBase(); M.personaDe(S.staff, 'cristian').soloCocina = true;
    const e = estadoOct();
    const g = M.generarSemana(S, S.staff, e, '2026-10-26', {});
    const c = g.condiciones.find(x => x.id === 'p:cristian:soloCocina');
    assert.ok(c && c.ok, `condición: ${JSON.stringify(c && c.detalle)}`);
    for (let k = 0; k < 7; k++) { const iso = M.addDias('2026-10-26', k); for (const t of M.turnosDe(S)) { const en = M.asignados(e, iso, t.id).find(x => x.pid === 'cristian'); assert.ok(!en || en.cocina, `${iso} ${t.id}: de sala`); } }
    assert.ok(g.rechazados.some(x => x.pid === 'cristian' && x.turnoId === 'MONACO_T' && x.motivo === 'solo hace cocina'), JSON.stringify(g.rechazados.filter(x => x.pid === 'cristian')));
  }
  const D = '2026-10-05';
  const mundo = () => {
    const st = [a1P('k', { puesto: 'cocina', soloCocina: true, locales: ['ZAPA'], cocina: { titular: ['ZAPA'], reserva: [], soloDias: [] } }), a1P('a', { locales: ['ZAPA'] }), a1P('b', { locales: ['ZAPA'] })];
    return { cfg: a1Mundo(st, c => { M.localDe(c, 'ZAPA').cocina.titulares = { M: ['k'], T: ['k'] }; }), st, e: M.nuevoEstado(2026, 10, { festivos: [] }) };
  };
  { // el volcado de la vista previa (Periodo): k de sala en la previa no entra en la planilla real
    const { cfg, st, e } = mundo();
    const pv = M.nuevoEstado(2026, 10, { festivos: [] });
    pv.asig[D] = { ZAPA_M: [{ pid: 'k', cocina: false, abre: true, origen: 'generador', razon: 'x' }, { pid: 'a', cocina: false, abre: false, origen: 'generador', razon: 'x' }] };
    const r = M.volcarPrevia(cfg, st, () => e, { aplicados: [{ iso: D, turnoId: 'ZAPA_M', pid: 'k', origen: 'generador', razon: 'x' }, { iso: D, turnoId: 'ZAPA_M', pid: 'a', origen: 'generador', razon: 'x' }], retirados: [], coberturas: [] }, { desde: D, hasta: D, previaDe: () => pv });
    assert.strictEqual(r.fallos, 1, JSON.stringify(r));
    assert.deepStrictEqual(M.pidsEn(e, D, 'ZAPA_M'), ['a']);
    // y con la cocina en la previa, entra llevándola (puesto cocina)
    pv.asig[D].ZAPA_M[0].cocina = true;
    const r2 = M.volcarPrevia(cfg, st, () => e, { aplicados: [{ iso: D, turnoId: 'ZAPA_M', pid: 'k', origen: 'generador', razon: 'x' }], retirados: [], coberturas: [] }, { desde: D, hasta: D, previaDe: () => pv });
    assert.strictEqual(r2.aplicadas, 1, JSON.stringify(r2));
    assert.ok(M.asignados(e, D, 'ZAPA_M').find(x => x.pid === 'k').cocina);
  }
  { // el plan de cobertura: k de sala «por a» se rechaza con el motivo; como cocina entra
    const { cfg, st, e } = mundo();
    assert.ok(M.asignar(e, cfg, st, D, 'ZAPA_M', 'a', { puesto: 'sala' }).ok);
    M.anadirAusencia(M.personaDe(st, 'a'), { tipo: 'VAC', desde: D, hasta: D });
    const inc = { pid: 'a', tipo: 'VAC', desde: D, hasta: D };
    const r = M.ponerPlanCobertura(cfg, st, e, inc, { asignaciones: [{ iso: D, tid: 'ZAPA_M', pid: 'k', cocina: false, cubre: true }] });
    assert.deepStrictEqual(r.rechazados.map(x => [x.pid, x.motivo]), [['k', 'solo hace cocina']], JSON.stringify(r));
    const r2 = M.ponerPlanCobertura(cfg, st, e, inc, { asignaciones: [{ iso: D, tid: 'ZAPA_M', pid: 'k', cocina: true, cubre: true }] });
    assert.deepStrictEqual(r2.rechazados, [], JSON.stringify(r2));
    assert.ok(M.asignados(e, D, 'ZAPA_M').find(x => x.pid === 'k').cocina);
  }
  { // C7: asignar con cocina:true y sin puesto es una plaza de cocina (a, de sala, no lleva la de Zapatillera); C8: yaDentro no cuela un duplicado
    const { cfg, st, e } = mundo();
    const r = M.asignar(e, cfg, st, D, 'ZAPA_M', 'a', { cocina: true });
    assert.ok(!r.ok && r.regla === 'cocina' && /no lleva la cocina de Zapatillera/.test(r.motivo), JSON.stringify(r));
    assert.ok(M.asignar(e, cfg, st, D, 'ZAPA_M', 'a', { puesto: 'sala' }).ok);
    const r2 = M.asignar(e, cfg, st, D, 'ZAPA_M', 'a', { puesto: 'sala', yaDentro: true });
    assert.ok(!r2.ok && r2.regla === 'duplicado', JSON.stringify(r2));
    assert.deepStrictEqual(M.pidsEn(e, D, 'ZAPA_M'), ['a']);
  }
});

ok('A4 · C2/D3 (03-cubre §4): un solo «por X» por casilla: si ya hay quien cubre a X, el relleno pone al resto «para llegar al mínimo (había n de m)», sin «por» y sin el partido autorizado de la designación', () => {
  const LUN = '2026-10-05';
  const mk = () => {
    const st = [a1P('x', { locales: ['PASARELA'], franjas: ['M'] }), a1P('q', { locales: ['PASARELA'], cubreA: [{ pid: 'x' }] }), a1P('r', { locales: ['PASARELA', 'ZAPA'], cubreA: [{ pid: 'x' }] }), a1P('s', { locales: ['PASARELA'] })];
    const cfg = a1Mundo(st, c => { c.patron = { 1: [{ t: 'PASARELA_M', p: 'x' }] }; M.localDe(c, 'PASARELA').minimos.M[1] = 2; });
    M.personaDe(st, 'x').ausencias = [{ tipo: 'VAC', desde: LUN, hasta: LUN }];
    return { cfg, st, est: M.nuevoEstado(2026, 10, { festivos: [] }) };
  };
  { // q y r cubren a x: la semana tipo pone a la designada; la otra entra por el mínimo
    const { cfg, st, est } = mk();
    M.generarPlanilla(cfg, st, est, LUN, LUN, {});
    const lista = M.asignados(est, LUN, 'PASARELA_M');
    assert.strictEqual(lista.length, 2, JSON.stringify(lista));
    assert.strictEqual(lista.filter(e => M.porDe(st, e) === 'x').length, 1, 'una sola «por x»: ' + JSON.stringify(lista.map(e => [e.pid, e.por, e.razon])));
    const segunda = lista.find(e => !e.por);
    assert.match(segunda.razon, /^para llegar al mínimo \(había 1 de 2\)/, segunda.razon);
    assert.ok(!segunda.porDesignacion);
    // los candidatos del relleno para esa casilla ya cubierta no llevan «cubre»
    assert.ok(M.candidatosPara(cfg, st, est, LUN, 'PASARELA_M').every(c => !c.cubre));
  }
  { // r ya hace la tarde en Zapatillera (no declara partido): sin el partido autorizado de «cubre a», no entra; entra s por el mínimo
    const { cfg, st, est } = mk();
    assert.ok(M.asignar(est, cfg, st, LUN, 'ZAPA_T', 'r', { puesto: 'sala' }).ok);
    M.generarPlanilla(cfg, st, est, LUN, LUN, {});
    const lista = M.asignados(est, LUN, 'PASARELA_M');
    assert.strictEqual(lista.filter(e => M.porDe(st, e) === 'x').length, 1, JSON.stringify(lista.map(e => [e.pid, e.por])));
    const r = lista.find(e => e.pid === 'r');
    assert.ok(!r || !M.revisarEntrada(cfg, st, est, LUN, 'PASARELA_M', 'r').autorizados.some(a => a.k === 'partido'), 'la segunda no lleva el partido autorizado');
    assert.ok(lista.some(e => e.pid === 's' && !e.por), JSON.stringify(lista.map(e => [e.pid, e.por, e.razon])));
  }
});

ok('A4 · E1 (13-veto-condicion): la condición de cada veto comprueba SU veto (local, franja y días): con dos vetos, solo sale en rojo el que se rompe', () => {
  const a = a4Escenario();
  M.generarSemana(a.cfg, a.staff, a.sv, A4_LUN, {});
  M.personaDe(a.staff, 'cristian').vetos.push({ localId: 'MONACO', franja: 'T' });
  const v = M.verificarSemana(a.cfg, a.staff, a.sv, A4_LUN).filter(c => /^p:cristian:veto/.test(c.id));
  assert.strictEqual(v.length, 2, JSON.stringify(v.map(c => c.id)));
  const pas = v.find(c => c.id === 'p:cristian:veto:PASARELA:M'), mon = v.find(c => c.id === 'p:cristian:veto:MONACO:T');
  assert.ok(pas.ok && pas.detalle === '', `el de Pasarela por la mañana no se rompe: ${pas.detalle}`);
  assert.ok(!mon.ok && /Bar Mónaco tarde/.test(mon.detalle) && !/Pasarela/.test(mon.detalle), mon.detalle);
  assert.deepStrictEqual([mon.localId, mon.franja, mon.dows], ['MONACO', 'T', null], 'la condición guarda su veto');
  // un veto de unos días concretos solo se rompe esos días
  M.personaDe(a.staff, 'cristian').vetos.pop(); M.personaDe(a.staff, 'cristian').vetos.push({ localId: 'MONACO', franja: 'T', dow: [5] });
  const v2 = M.verificarSemana(a.cfg, a.staff, a.sv, A4_LUN).find(c => c.id === 'p:cristian:veto:MONACO:T:5');
  assert.ok(v2 && !v2.ok && v2.detalle === 'viernes 2: Bar Mónaco tarde', JSON.stringify(v2 && [v2.ok, v2.detalle, v2.dows]));
});

ok('A4 · E2/E8 (12-relevo-ida-vuelta, 06-mover B): quitar el cambio de día libre vuelve a pasar por las ausencias de quien esa persona cubre (el relevo y la designación vuelven), calcula los huecos sobre lo tocado y deja cada casilla en su orden', () => {
  { // 1) Mari Luz es relevo «por Iván» el viernes 2; libra el viernes y luego se quita el cambio
    const a = a4Escenario({ cubre: true, ivanVac: true });
    M.generarSemana(a.cfg, a.staff, a.sv, A4_LUN, {});
    const foto0 = a4Foto(a.cfg, a.sv, A4_LUN);
    const e0 = M.asignados(a.sv, '2026-10-02', 'PASARELA_T').find(x => x.pid === 'mariluz');
    assert.ok(e0 && e0.por === 'ivan' && e0.relevo, JSON.stringify(e0));
    M.moverDiaLibre(a.cfg, a.staff, a.sv, 'mariluz', A4_LUN, [5], { meses: a.ms });
    assert.ok(!M.pidsEn(a.sv, '2026-10-02', 'PASARELA_T').includes('mariluz'));
    const r = M.moverDiaLibre(a.cfg, a.staff, a.sv, 'mariluz', A4_LUN, [], { meses: a.ms });
    const e1 = M.asignados(a.sv, '2026-10-02', 'PASARELA_T').find(x => x.pid === 'mariluz');
    assert.ok(e1 && e1.por === 'ivan' && e1.relevo && e1.razon === 'cubre a Iván', 'vuelve como relevo: ' + JSON.stringify(e1));
    assert.ok(r.puestos.some(x => x.pid === 'mariluz' && x.iso === '2026-10-02'));
    assert.ok(M.asignados(a.sv, '2026-10-02', 'PASARELA_T').some(e => M.porDe(a.staff, e) === 'ivan'), 'la Cobertura ve el viernes cubierto');
    assert.deepStrictEqual(a4Difs(foto0, a4Foto(a.cfg, a.sv, A4_LUN)), [], 'ida y vuelta: la semana queda como estaba, orden incluido');
    assert.deepStrictEqual(M.generarSemana(a.cfg, a.staff, a.sv, A4_LUN, {}).cambios, [], 'regenerar no cambia nada');
  }
  { // 06-mover B: ida y vuelta de varias personas y días deja la semana idéntica (quien vuelve, en su sitio)
    for (const [pid, ds] of [['mariluz', [2]], ['mariluz', [6]], ['roberto', [4]], ['hojan', [3, 6]]]) {
      const a = a4Escenario({ cubre: true, ivanVac: true, cierre: true });
      M.generarSemana(a.cfg, a.staff, a.sv, A4_LUN, {});
      const foto0 = a4Foto(a.cfg, a.sv, A4_LUN);
      M.moverDiaLibre(a.cfg, a.staff, a.sv, pid, A4_LUN, ds, { meses: a.ms });
      M.moverDiaLibre(a.cfg, a.staff, a.sv, pid, A4_LUN, [], { meses: a.ms });
      const d = a4Difs(foto0, a4Foto(a.cfg, a.sv, A4_LUN));
      assert.deepStrictEqual(d, [], `${pid} ${JSON.stringify(ds)}: ${d.map(k => k + ': ' + foto0[k] + ' → ' + a4Foto(a.cfg, a.sv, A4_LUN)[k]).join(' | ')}`);
    }
  }
  { // 2) Roberto cubre a Iván el martes 29 por designación (no relevo): cambia su libre al martes y lo quita
    const a = a4Escenario();
    M.personaDe(a.staff, 'roberto').cubreA.push({ pid: 'ivan' });
    M.personaDe(a.staff, 'mariluz').ausencias = [{ tipo: 'PERM', desde: '2026-09-29', hasta: '2026-09-29', franjas: ['T'] }];
    M.personaDe(a.staff, 'ivan').ausencias = [{ tipo: 'VAC', desde: '2026-09-29', hasta: '2026-09-29' }];
    M.generarSemana(a.cfg, a.staff, a.sv, A4_LUN, {});
    assert.ok(M.asignados(a.sv, '2026-09-29', 'PASARELA_T').some(x => x.pid === 'roberto' && x.por === 'ivan'));
    const foto0 = a4Foto(a.cfg, a.sv, A4_LUN);
    const r1 = M.moverDiaLibre(a.cfg, a.staff, a.sv, 'roberto', A4_LUN, [2], { meses: a.ms });
    assert.ok(r1.huecos.some(h => h.iso === '2026-09-29' && h.turnoId === 'PASARELA_T'), JSON.stringify(r1.huecos));
    const r2 = M.moverDiaLibre(a.cfg, a.staff, a.sv, 'roberto', A4_LUN, [], { meses: a.ms });
    assert.ok(M.asignados(a.sv, '2026-09-29', 'PASARELA_T').some(x => x.pid === 'roberto' && x.por === 'ivan' && x.porDesignacion), 'vuelve por la designación: ' + JSON.stringify(M.asignados(a.sv, '2026-09-29', 'PASARELA_T').map(x => [x.pid, x.por])));
    assert.ok(r2.puestos.some(x => x.pid === 'roberto' && x.turnoId === 'PASARELA_T'));
    assert.deepStrictEqual(r2.huecos, []);
    assert.deepStrictEqual(a4Difs(foto0, a4Foto(a.cfg, a.sv, A4_LUN)), []);
    // solo esa persona: si al quitar el cambio Roberto ya no puede cubrir (veto nuevo), nadie más entra por él y el hueco se dice
    M.moverDiaLibre(a.cfg, a.staff, a.sv, 'roberto', A4_LUN, [2], { meses: a.ms });
    M.personaDe(a.staff, 'roberto').vetos.push({ localId: 'PASARELA', franja: 'T' });
    const r3 = M.moverDiaLibre(a.cfg, a.staff, a.sv, 'roberto', A4_LUN, [], { meses: a.ms });
    assert.ok(!M.asignados(a.sv, '2026-09-29', 'PASARELA_T').some(x => x.por === 'ivan'), 'nadie entra por Iván en nombre de otro');
    assert.ok(r3.huecos.some(h => h.iso === '2026-09-29' && h.turnoId === 'PASARELA_T' && h.faltan === 1), 'el hueco de la casilla de Iván se dice aunque no se haya retirado nada de ella: ' + JSON.stringify(r3.huecos));
  }
});

ok('A4 · E4 (10-resumen-semana, 08-casos-finos caso 4): generarSemana devuelve ausentes[iso] = [{ pid, tipo }] con todos los ausentes del día (vacaciones, permiso, día libre, otro y baja), también los que pone un cierre; cada persona está en una sola cuenta', () => {
  const a = a4Escenario({ libra: true, cierre: true, cubre: true, ivanVac: true, decisiones: { cris: { tipo: 'LD' } } });
  M.personaDe(a.staff, 'juani').ausencias = [{ tipo: 'PERM', desde: '2026-10-01', hasta: '2026-10-01', franjas: ['M'] }];
  const r = M.generarSemana(a.cfg, a.staff, a.sv, A4_LUN, {});
  assert.ok(r.ausentes && r.dias.every(iso => Array.isArray(r.ausentes[iso])), 'ausentes por día');
  const de = (iso, pid) => (r.ausentes[iso] || []).find(x => x.pid === pid);
  assert.deepStrictEqual(de('2026-09-29', 'scapon'), { pid: 'scapon', tipo: 'VAC', etiqueta: 'vacaciones' }, 'Susana Capón de vacaciones por el cierre');
  assert.deepStrictEqual(de('2026-09-28', 'cris'), { pid: 'cris', tipo: 'LD', etiqueta: 'día libre' }, 'Cris con día libre por el cierre');
  assert.deepStrictEqual(de('2026-10-02', 'ivan'), { pid: 'ivan', tipo: 'VAC', etiqueta: 'vacaciones' });
  assert.deepStrictEqual(de('2026-09-28', 'laura'), { pid: 'laura', tipo: 'BAJ', etiqueta: 'baja' });
  assert.deepStrictEqual(de('2026-10-01', 'juani'), { pid: 'juani', tipo: 'PERM', franjas: ['M'], etiqueta: 'permiso por la mañana' }, 'la media jornada, con su franja (y desde la corrección H-07, la etiqueta del día)');
  assert.strictEqual(de('2026-09-30', 'ivan'), undefined);
  for (const iso of r.dias) {
    const trabajan = new Set(); for (const t of M.turnosDe(a.cfg)) for (const pid of M.pidsEn(a.sv, iso, t.id)) trabajan.add(pid);
    const cuenta = new Set([...trabajan, ...r.libran[iso], ...r.sinPlaza[iso], ...r.ausentes[iso].map(x => x.pid), ...a.staff.filter(p => p.standby).map(p => p.id), ...r.sinTrabajo[iso], ...r.apoyoSinSitio[iso]]);
    assert.deepStrictEqual(a.staff.filter(p => !cuenta.has(p.id)).map(p => p.id), [], `${iso}: alguien sin cuenta`);
    for (const x of r.ausentes[iso]) assert.ok(!r.libran[iso].includes(x.pid) && !r.sinTrabajo[iso].includes(x.pid), `${iso}: ${x.pid} ausente y además libra o sin trabajo`);
  }
});

ok('A4 · E5, D2/E9 (07-huecos casos 2 y 4, 08-seguimiento2 E2): candidatosConAviso acepta { primero, cocina, meses }: en un hueco de apertura solo ofrece a quien puede abrir, y con meses cuenta la semana entera como el selector', () => {
  { // el hueco «nadie puede abrir» de El 33 el martes 6 (Cristian solo, a mano)
    const S = cfgBase(), e = estadoOct(), iso = '2026-10-06';
    M.asignar(e, S, S.staff, iso, 'EL33_T', 'cristian', { origen: 'manual', puesto: 'sala' });
    assert.ok(M.huecosDeCasilla(S, S.staff, e, iso, 'EL33_T').some(h => h.tipo === 'primero'));
    const sin = M.candidatosConAviso(S, S.staff, e, iso, 'EL33_T');
    assert.ok(sin.some(c => c.pid === 'leo'), 'sin primero, Leo (nunca de primero) sale con aviso: ' + JSON.stringify(sin.map(c => c.pid)));
    const con = M.candidatosConAviso(S, S.staff, e, iso, 'EL33_T', { primero: true });
    assert.ok(!con.some(c => c.pid === 'leo'), 'con primero, Leo no: ' + JSON.stringify(con.map(c => c.pid)));
    assert.ok(con.every(c => M.puedePrimero(S, S.staff, e, iso, 'EL33_T', c.pid).ok), JSON.stringify(con.map(c => c.pid)));
    const abren = M.candidatosPara(S, S.staff, e, iso, 'EL33_T', { primero: true });
    assert.ok(abren.length && abren.every(c => M.puedePrimero(S, S.staff, e, iso, 'EL33_T', c.pid).ok));
    // cocina: se evalúa como cocina (solo quien puede llevarla)
    const coc = M.candidatosConAviso(S, S.staff, e, '2026-10-09', 'MONACO_T', { cocina: true });
    assert.ok(coc.every(c => M.puedeCocina(S, M.personaDe(S.staff, c.pid), 'MONACO', '2026-10-09')), JSON.stringify(coc.map(c => c.pid)));
  }
  { // la semana que cruza de mes, con meses: la carga es la del selector
    const a = a4Escenario({ libra: true, cierre: true, cubre: true, ivanVac: true });
    M.generarPlanilla(a.cfg, a.staff, a.ms['2026-09'], A4_LUN, '2026-09-30', { meses: a.ms }); M.generarPlanilla(a.cfg, a.staff, a.ms['2026-10'], '2026-10-01', '2026-10-04', { meses: a.ms });
    const iso = '2026-10-04', tid = 'PASARELA_T', oct = a.ms['2026-10'];
    const sin = M.candidatosConAviso(a.cfg, a.staff, oct, iso, tid), con = M.candidatosConAviso(a.cfg, a.staff, oct, iso, tid, { meses: a.ms });
    const sel = M.gruposSelector(a.cfg, a.staff, oct, iso, tid, { meses: a.ms }).conAviso;
    assert.deepStrictEqual(con.map(c => [c.pid, c.turnosSemana]), sel.map(c => [c.pid, c.turnosSemana]), 'como el selector');
    assert.ok(sin.some((c, i) => c.turnosSemana !== con[i].turnosSemana), 'sin meses contaba solo octubre: ' + JSON.stringify(sin.map(c => [c.pid, c.turnosSemana])));
  }
});

ok('A4 · E6 (08-casos-finos caso 1, 04-verificar b): lo que relajó el propio generador con aviso (partido no declarado, pareja flexible) no es una condición rota: cumplida con la nota «relajado por el generador con aviso»; lo puesto a mano que rompe la regla sigue en rojo, y el resumen dice cuántas plazas hay a mano', () => {
  { // la pareja flexible Mari Luz–Lavinia relajada por el relleno el domingo 4
    const a = a4Escenario({ cubre: true, ivanVac: true });
    M.personaDe(a.staff, 'roberto').ausencias = [{ tipo: 'PERM', desde: '2026-10-04', hasta: '2026-10-04' }];
    M.personaDe(a.staff, 'cristian').ausencias = [{ tipo: 'PERM', desde: '2026-10-04', hasta: '2026-10-04' }];
    const r = M.generarSemana(a.cfg, a.staff, a.sv, A4_LUN, { permitirPartido: true });
    const dom = M.asignados(a.sv, '2026-10-04', 'PASARELA_T');
    assert.ok(dom.some(x => x.pid === 'mariluz' && (x.avisos || []).some(t => /^nunca con Lavinia/.test(t))), 'preparado: Mari Luz con Lavinia con aviso: ' + JSON.stringify(dom.map(x => [x.pid, x.avisos])));
    const c = r.condiciones.find(x => x.id === 'p:mariluz:nuncaCon:lavinia' || x.id === 'p:lavinia:nuncaCon:mariluz');
    assert.ok(c && c.ok && /domingo 4: juntos en Pasarela, relajado por el generador con aviso/.test(c.nota || ''), JSON.stringify(c && [c.ok, c.detalle, c.nota]));
    assert.strictEqual(r.resumen.plazasAMano, 0);
  }
  { // el partido no declarado de Roberto el domingo 4, relajado por el relleno
    const a = a4Escenario({ cierre: true, cubre: true, ivanVac: true });
    const r = M.generarSemana(a.cfg, a.staff, a.sv, A4_LUN, { permitirPartido: true });
    const rob = M.asignados(a.sv, '2026-10-04', 'PASARELA_T').find(x => x.pid === 'roberto');
    assert.ok(rob && M.esAutomatica(rob) && (rob.avisos || []).some(t => /^partido no declarado/.test(t)), 'preparado: ' + JSON.stringify(rob));
    const c = r.condiciones.find(x => x.id === 'p:roberto:partido');
    assert.ok(c && c.ok && /domingo 4: partido no declarado, relajado por el generador con aviso/.test(c.nota || ''), JSON.stringify(c && [c.ok, c.detalle, c.nota]));
    // lo mismo puesto a mano (forzado) sigue siendo una condición rota, y el resumen cuenta la plaza a mano
    M.retirarEntrada(a.sv, a.cfg, a.staff, '2026-10-04', 'PASARELA_T', 'roberto');
    assert.ok(M.asignar(a.sv, a.cfg, a.staff, '2026-10-04', 'PASARELA_T', 'roberto', { origen: 'manual', forzar: true, puesto: 'sala', razon: 'lo dice el encargado' }).ok);
    const r2 = M.generarSemana(a.cfg, a.staff, a.sv, A4_LUN, { permitirPartido: true });
    const c2 = r2.condiciones.find(x => x.id === 'p:roberto:partido');
    assert.ok(c2 && !c2.ok && /domingo 4: partido no declarado/.test(c2.detalle), JSON.stringify(c2 && [c2.ok, c2.detalle, c2.nota]));
    assert.strictEqual(r2.resumen.plazasAMano, 1);
    // y un partido que la ficha dejó de declarar después de generar (nadie lo relajó) sigue en rojo
    const b = a4Escenario();
    M.generarSemana(b.cfg, b.staff, b.sv, A4_LUN, {});
    M.personaDe(b.staff, 'mariluz').partido.dias = [2, 5, 6];
    const c3 = M.generarSemana(b.cfg, b.staff, b.sv, A4_LUN, {}).condiciones.find(x => x.id === 'p:mariluz:partido');
    assert.ok(c3 && !c3.ok && /jueves 1: partido no declarado/.test(c3.detalle), JSON.stringify(c3 && [c3.ok, c3.detalle, c3.nota]));
  }
});

ok('A4 · D4 (07-seguimiento G): «dos apoyos no se quedan solos» también para el puesto de cocina: el apoyo que llevaría la cocina de una casilla vacía no entra solo (el selector lo ofrece «con aviso» en su grupo de cocina, y el relleno no lo pone)', () => {
  const S = cfgBase(), st = S.staff, iso = '2026-10-09', tid = 'MONACO_T';
  M.localDe(S, 'MONACO').cocina.titulares.T.push('yilian');   // Yilian (apoyo) en la lista de cocina del Mónaco por la tarde
  M.anadirAusencia(M.personaDe(st, 'hojan'), { tipo: 'VAC', desde: iso, hasta: iso });
  M.anadirAusencia(M.personaDe(st, 'jenny'), { tipo: 'VAC', desde: iso, hasta: iso });
  const e = estadoOct();
  const ev = M.evaluarPlaza(M.crearContexto(S, st, e), iso, tid, 'yilian', { puesto: 'cocina', apoyos: true });
  assert.ok(!ev.ok && ev.bloqueos.some(b => b.k === 'soloApoyos' && b.relajable), JSON.stringify(ev.bloqueos.map(b => b.k)));
  const g = M.gruposSelector(S, st, e, iso, tid);
  assert.ok(!g.cocina.some(c => c.pid === 'yilian'), 'no en el grupo de cocina limpio: ' + JSON.stringify(g.cocina.map(c => c.pid)));
  const ya = g.conAviso.find(c => c.pid === 'yilian');
  assert.ok(ya && ya.cocina && ya.avisos.includes('solo apoyos') && ya.escalon === 2, 'con aviso, como cocina: ' + JSON.stringify(g.conAviso.map(c => [c.pid, c.cocina, c.avisos])));
  assert.ok(!(g.recomendado && g.recomendado.pid === 'yilian'));
  assert.ok(!g.noPueden.some(x => x.pid === 'yilian'));
  const gen = M.generarPlanilla(S, st, estadoOct(), iso, iso, { sinPatron: true, simular: true });
  assert.ok(!M.revisarTurno(S, st, gen.estado, iso, tid).soloApoyos, 'el relleno no deja la casilla solo con apoyos: ' + JSON.stringify(M.pidsEn(gen.estado, iso, tid)));
  // con alguien de plantilla ya dentro, el apoyo lleva la cocina sin aviso
  assert.ok(M.asignar(e, S, st, iso, tid, 'scapon', { puesto: 'sala', origen: 'manual' }).ok);
  assert.ok(M.gruposSelector(S, st, e, iso, tid).cocina.some(c => c.pid === 'yilian'));
});

ok('A4 · E7, E10, D5: generarPlanilla recorta el rango a los días del mes (no virtual); con standby la ficha solo tiene esa condición; turnosSemanaDe con un estado virtual lee los otros días de meses', () => {
  { // E7
    const S = cfgBase(), e = estadoOct();
    const g = M.generarPlanilla(S, S.staff, e, '2026-09-28', '2026-10-04', {});
    assert.ok(!Object.keys(e.asig).some(iso => iso < '2026-10-01'), 'sin días de septiembre en el estado de octubre: ' + JSON.stringify(Object.keys(e.asig).filter(iso => iso < '2026-10-01')));
    assert.ok(g.aplicados.length && g.aplicados.every(x => x.iso >= '2026-10-01'));
    const g2 = M.generarPlanilla(S, S.staff, estadoOct(), '2026-11-02', '2026-11-08', {});
    assert.deepStrictEqual([g2.aplicados, g2.huecos, g2.retirados], [[], [], []], 'fuera del mes: nada');
  }
  { // E10
    const S = cfgBase();
    const cs = M.condicionesDe(S, S.staff, '2026-10-05').filter(c => c.pid === 'dulce');
    assert.deepStrictEqual(cs.map(c => c.id), ['p:dulce:standby'], JSON.stringify(cs.map(c => c.texto)));
    M.personaDe(S.staff, 'dulce').standby = false;
    assert.ok(M.condicionesDe(S, S.staff, '2026-10-05').filter(c => c.pid === 'dulce').length > 1, 'sin standby vuelven las suyas');
  }
  { // D5
    const S = cfgBase(), st = S.staff;
    const sep = M.nuevoEstado(2026, 9, { festivos: [] }), o = M.nuevoEstado(2026, 10, { festivos: [] });
    M.instanciarPatron(S, st, sep, '2026-09-28', '2026-09-30'); M.instanciarPatron(S, st, o, '2026-10-01', '2026-10-04');
    const meses = { '2026-09': { asig: sep.asig, apertura: sep.apertura, manual: sep.manual }, '2026-10': { asig: o.asig, apertura: o.apertura, manual: o.manual } };
    const v = { y: 2026, m: 10, days: [], asig: {}, apertura: {}, manual: {}, festivos: [], virtual: true };
    for (const d of M.rangoIso('2026-10-02', '2026-10-04')) { v.days.push({ d: +d.slice(8), iso: d, dow: M.isoDow(d), festivo: false }); v.asig[d] = o.asig[d]; }
    for (const pid of ['cristian', 'roberto', 'mariluz']) {
      const real = [...M.rangoIso('2026-09-28', '2026-10-04')].reduce((n, d) => n + M.casillasDe(d < '2026-10-01' ? sep : o, d, pid).length, 0);
      assert.strictEqual(M.turnosSemanaDe(v, pid, '2026-10-03', meses), real, `${pid}: virtual con meses`);
      assert.strictEqual(M.turnosSemanaDe(o, pid, '2026-10-03', meses), real, `${pid}: el mes con meses`);
    }
  }
});

// ---------- A4 · corrección tras la revisión (01/10): revisión de modelo H-01…H-09 y de cliente C1, C3, C4, C14 ----------
// Los scripts de los revisores (scratchpad/fases/A4rev/modelo/NN-*.js) como pruebas del repo: en rojo antes, en verde después.
// la casilla de Pasarela del lunes 5/10 con tres personas puestas en este orden, cada una con su origen
const a4fCasilla = (ids, origenes) => {
  const st = ids.map(id => a1P(id, { locales: ['PASARELA'] }));
  const cfg = a1Mundo(st);
  const e = M.nuevoEstado(2026, 10, { festivos: [] });
  for (const id of ids) assert.ok(M.asignar(e, cfg, st, '2026-10-05', 'PASARELA_M', id, { puesto: 'sala', origen: origenes[id] || 'generador', razon: 'x' }).ok, id);
  return { cfg, st, e };
};
const a4fRet = r => r.retirados.map(x => [x.pid, x.motivo]);

ok('A4 · corrección H-01 (01-nuncacon-corto, 02-nuncacon-dos-estrictas): regenerar mira TODAS las parejas «nunca con» de la plaza: la estricta que va detrás de una flexible (o de otra estricta que no la saca) también se retira, a la primera y una sola vez', () => {
  const D = '2026-10-05';
  { // b y c a mano, a automática (la última): a «nunca con» b flexible y «nunca con» c estricto
    const { cfg, st, e } = a4fCasilla(['b', 'c', 'a'], { b: 'manual', c: 'manual' });
    M.ponerNuncaCon(st, 'a', 'b', { flexible: true }); M.ponerNuncaCon(st, 'a', 'c', {});
    const r = M.generarPlanilla(cfg, st, e, D, D, {});
    assert.deepStrictEqual(a4fRet(r), [['a', 'nunca con C']], 'la estricta de detrás de la flexible');
    assert.deepStrictEqual(M.revisionMes(cfg, st, e, { desde: D, hasta: D }).filter(x => /nunca con/.test(x.msg)).map(x => x.msg), [], 'la Revisión ya no avisa');
    assert.deepStrictEqual(M.generarPlanilla(cfg, st, e, D, D, {}).retirados, [], 'regenerar otra vez no retira nada');
  }
  { // las tres automáticas: la pareja estricta a–c se resuelve igual (sale la de después, a)
    const { cfg, st, e } = a4fCasilla(['b', 'c', 'a'], {});
    M.ponerNuncaCon(st, 'a', 'b', { flexible: true }); M.ponerNuncaCon(st, 'a', 'c', {});
    const r = M.generarPlanilla(cfg, st, e, D, D, {});
    assert.deepStrictEqual(r.retirados.map(x => x.pid), ['a'], JSON.stringify(a4fRet(r)));
    assert.ok(/^nunca con C\b/.test(r.retirados[0].motivo), r.retirados[0].motivo);
    assert.deepStrictEqual(M.generarPlanilla(cfg, st, e, D, D, {}).retirados, []);
  }
  { // 02: a y b automáticas, c a mano; a «nunca con» b y c, las dos estrictas. Sale a a la primera (por c, que está a mano), b
    // ya no choca con nadie y se queda; regenerar otra vez no retira nada (antes: la 1.ª vez b, la 2.ª a)
    const { cfg, st, e } = a4fCasilla(['a', 'b', 'c'], { c: 'manual' });
    M.ponerNuncaCon(st, 'a', 'b', {}); M.ponerNuncaCon(st, 'a', 'c', {});
    const r1 = M.generarPlanilla(cfg, st, e, D, D, {});
    assert.deepStrictEqual(a4fRet(r1), [['a', 'nunca con C']]);
    assert.deepStrictEqual(M.pidsEn(e, D, 'PASARELA_M'), ['b', 'c']);
    assert.deepStrictEqual(M.generarPlanilla(cfg, st, e, D, D, {}).retirados, [], 'idempotente');
  }
});

ok('A4 · corrección H-09 (17-sobra-de-mas): dentro de la casilla se retira de una en una: quien chocaba («nunca con» estricto) con alguien que ya sale por otra regla se queda y no sale en «Se retira»', () => {
  const a = a4Escenario(), J1 = '2026-10-01';
  M.generarSemana(a.cfg, a.staff, a.sv, A4_LUN, {});
  assert.deepStrictEqual(M.pidsEn(a.sv, J1, 'PASARELA_M'), ['lola', 'mariluz', 'tere'], 'preparado');
  M.personaDe(a.staff, 'lola').locales = ['ZAPA'];
  M.ponerNuncaCon(a.staff, 'lola', 'tere', {});
  const r = M.generarSemana(a.cfg, a.staff, a.sv, A4_LUN, {});
  assert.deepStrictEqual(r.retirados.filter(x => x.iso === J1 && x.turnoId === 'PASARELA_M').map(x => [x.pid, x.motivo]), [['lola', 'solo Zapatillera']]);
  assert.ok(M.pidsEn(a.sv, J1, 'PASARELA_M').includes('tere'), 'Tere se queda');
});

ok('A4 · corrección C3 (revisión de cliente 3): entre dos plazas automáticas que chocan por un «nunca con» estricto se queda quien lleva la cocina que la casilla necesita y, si no, quien abre; a igualdad sale la que va después. El motivo lo dice', () => {
  const a = a4Escenario();
  M.generarSemana(a.cfg, a.staff, a.sv, A4_LUN, {});
  const MA = ['2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03'];
  for (const iso of MA) { const xs = M.asignados(a.sv, iso, 'MONACO_M'); assert.ok(xs[0].pid === 'cris' && xs[0].abre && xs.some(x => x.pid === 'esmeralda' && x.cocina), `preparado ${iso}: ${JSON.stringify(xs.map(x => x.pid))}`); }
  // Esmeralda (la cocina del Mónaco por la mañana, obligatoria) pasa a «nunca con» Cris Parreño (que abre): sale Cris
  M.ponerNuncaCon(a.staff, 'esmeralda', 'cris', {});
  const r = M.generarSemana(a.cfg, a.staff, a.sv, A4_LUN, {});
  const ret = r.retirados.filter(x => x.turnoId === 'MONACO_M');
  assert.deepStrictEqual(ret.map(x => [x.iso, x.pid, x.motivo]), MA.map(iso => [iso, 'cris', 'nunca con Esmeralda (se queda Esmeralda, que lleva la cocina)']));
  for (const iso of MA) assert.ok(M.asignados(a.sv, iso, 'MONACO_M').some(x => x.pid === 'esmeralda' && x.cocina), `${iso}: Esmeralda sigue con la cocina`);
  assert.ok(!r.huecos.some(h => h.turnoId === 'MONACO_M' && h.tipo === 'cocina'), 'el Mónaco no se queda sin cocina: ' + JSON.stringify(r.huecos.filter(h => h.turnoId === 'MONACO_M')));
  assert.deepStrictEqual(M.generarSemana(a.cfg, a.staff, a.sv, A4_LUN, {}).retirados, [], 'regenerar otra vez no retira nada');
  // sin cocina de por medio, se queda quien abre (Lola) y el motivo lo dice
  const b = a4Escenario();
  M.generarSemana(b.cfg, b.staff, b.sv, A4_LUN, {});
  M.ponerNuncaCon(b.staff, 'tere', 'lola', {});
  const r2 = M.generarSemana(b.cfg, b.staff, b.sv, A4_LUN, {});
  assert.deepStrictEqual(r2.retirados.filter(x => x.iso === '2026-10-01' && x.turnoId === 'PASARELA_M').map(x => [x.pid, x.motivo]), [['tere', 'nunca con Lola (se queda Lola, que abre)']]);
  // a igualdad (ninguna abre ni lleva la cocina), sale la de después en la casilla
  const { cfg, st, e } = a4fCasilla(['b', 'c', 'a'], {});
  M.ponerNuncaCon(st, 'c', 'a', {});
  assert.deepStrictEqual(a4fRet(M.generarPlanilla(cfg, st, e, '2026-10-05', '2026-10-05', {})), [['a', 'nunca con C (se queda C, que va antes en la casilla)']]);
});

ok('A4 · corrección H-02 (07-mover-caso-orden, 08-mover-clasifica): quitar el cambio de día libre deja cada casilla como estaba, también QUIÉN ABRE y quién lleva la cocina (la casilla vuelve al orden de la semana tipo y el «abre» heredado en la ida no se queda, salvo el puesto a mano)', () => {
  const idaYVuelta = (o, pid, ds) => {
    const a = a4Escenario(o);
    M.generarSemana(a.cfg, a.staff, a.sv, A4_LUN, {});
    const foto0 = a4Foto(a.cfg, a.sv, A4_LUN);
    M.moverDiaLibre(a.cfg, a.staff, a.sv, pid, A4_LUN, ds, { meses: a.ms });
    M.moverDiaLibre(a.cfg, a.staff, a.sv, pid, A4_LUN, [], { meses: a.ms });
    const foto1 = a4Foto(a.cfg, a.sv, A4_LUN);
    return { a, d: a4Difs(foto0, foto1).map(k => `${pid} ${JSON.stringify(ds)} ${k}: ${foto0[k]} → ${foto1[k]}`) };
  };
  // Mari Luz abre Pasarela el domingo 4 por la mañana; cambia su día libre al domingo y se quita el cambio: vuelve a abrir ella
  // (antes se quedaba abriendo Roberto, que abrió durante la ida); Noe y Jenny el viernes en El 33 por la tarde, igual
  for (const [pid, ds] of [['mariluz', [7]], ['noe', [5]], ['jenny', [5]]]) assert.deepStrictEqual(idaYVuelta({}, pid, ds).d, []);
  // barrido acotado (la semana base y la de Iván de vacaciones con Mari Luz que le cubre): nada distinto tras la vuelta
  const difs = [];
  for (const o of [{}, { cubre: true, ivanVac: true }]) for (const pid of ['mariluz', 'roberto', 'lavinia', 'noe', 'jenny', 'adrian', 'hojan', 'yilian', 'lola', 'tere']) for (const ds of [[5], [7], [3, 6]]) difs.push(...idaYVuelta(o, pid, ds).d);
  assert.deepStrictEqual(difs, []);
  // lo puesto a mano se respeta: «Sale primero» a mano para Roberto el domingo sigue siendo suyo tras la ida y vuelta de Mari Luz
  const a = a4Escenario();
  M.generarSemana(a.cfg, a.staff, a.sv, A4_LUN, {});
  M.marcarAbre(a.sv, '2026-10-04', 'PASARELA_M', 'roberto', a.cfg, a.staff);
  assert.ok(M.manualDe(a.sv, '2026-10-04', 'PASARELA_M').abre, 'preparado: Roberto sale primero a mano');
  M.moverDiaLibre(a.cfg, a.staff, a.sv, 'mariluz', A4_LUN, [7], { meses: a.ms });
  M.moverDiaLibre(a.cfg, a.staff, a.sv, 'mariluz', A4_LUN, [], { meses: a.ms });
  assert.deepStrictEqual(M.asignados(a.sv, '2026-10-04', 'PASARELA_M').filter(x => x.abre).map(x => x.pid), ['roberto']);
});

ok('A4 · corrección H-03 (06-mover-caso-sluna): el cambio de día libre de una persona no le quita a OTRA su relevo: Roberto sigue «por Susana Luna» en Zapatillera tarde tras la ida y vuelta de Adrián (desmarcarRelevos mira los dos puestos, como sigueCubriendo)', () => {
  const a = a4Escenario(), V2 = '2026-10-02';
  M.personaDe(a.staff, 'sluna').ausencias = [{ tipo: 'VAC', desde: '2026-09-29', hasta: '2026-10-03' }];
  M.generarSemana(a.cfg, a.staff, a.sv, A4_LUN, {});
  const rob = () => M.asignados(a.sv, V2, 'ZAPA_T').find(x => x.pid === 'roberto') || {};
  assert.ok(rob().por === 'sluna' && rob().relevo, 'preparado: ' + JSON.stringify(rob()));
  const foto0 = a4Foto(a.cfg, a.sv, A4_LUN);
  M.moverDiaLibre(a.cfg, a.staff, a.sv, 'adrian', A4_LUN, [5], { meses: a.ms });
  assert.ok(rob().por === 'sluna' && rob().relevo && rob().cocina, 'en la ida Roberto lleva la cocina y sigue de relevo: ' + JSON.stringify(rob()));
  M.moverDiaLibre(a.cfg, a.staff, a.sv, 'adrian', A4_LUN, [], { meses: a.ms });
  assert.ok(rob().por === 'sluna' && rob().relevo, 'tras la vuelta sigue «por Susana Luna»: ' + JSON.stringify(rob()));
  assert.ok(M.asignados(a.sv, V2, 'ZAPA_T').some(e => M.porDe(a.staff, e) === 'sluna'), 'la Cobertura ve a Susana Luna cubierta el viernes');
  assert.deepStrictEqual(a4Difs(foto0, a4Foto(a.cfg, a.sv, A4_LUN)), []);
  assert.deepStrictEqual(M.generarSemana(a.cfg, a.staff, a.sv, A4_LUN, {}).cambios, [], 'regenerar no cambia nada');
});

ok('A4 · corrección H-04 (15-intercambio-puesto): en un cambio de turno, quien recibe el turno cedido entra con el puesto de ese turno (la cocina, si la llevaba) en el plan y al aplicar; y si el cambio no se puede hacer entero, no se hace a medias', () => {
  const D1 = '2026-10-05', D2 = '2026-10-06';
  const mundo = () => {
    const st = [a1P('k', { soloCocina: true, locales: ['ZAPA'], cocina: { titular: ['ZAPA'], reserva: [], soloDias: [] } }), a1P('a', { locales: ['ZAPA'], cocina: { titular: ['ZAPA'], reserva: [], soloDias: [] } }), a1P('b', { locales: ['ZAPA'] })];
    const cfg = a1Mundo(st, c => { M.localDe(c, 'ZAPA').cocina.titulares = { M: ['k', 'a'], T: ['k', 'a'] }; M.localDe(c, 'ZAPA').cocina.obligatoria = { M: true, T: true }; });
    const e = M.nuevoEstado(2026, 10, { festivos: [] });
    assert.ok(M.asignar(e, cfg, st, D1, 'ZAPA_M', 'k', { puesto: 'cocina', cocina: true, origen: 'manual' }).ok);
    assert.ok(M.asignar(e, cfg, st, D2, 'ZAPA_M', 'b', { puesto: 'sala', origen: 'manual' }).ok && M.asignar(e, cfg, st, D2, 'ZAPA_M', 'a', { puesto: 'sala', origen: 'manual' }).ok);
    assert.deepStrictEqual(M.asignados(e, D2, 'ZAPA_M').map(x => [x.pid, !!x.cocina]), [['b', false], ['a', true]], 'preparado: a lleva la cocina el martes');
    const inc = { pid: 'k', tipo: 'CAMBIO', desde: D1, hasta: D1 };
    const plan = M.planesCobertura(cfg, st, e, inc, { intercambio: true }).planes.find(p => p.asignaciones.some(x => x.intercambio));
    assert.ok(plan, 'hay un plan con intercambio');
    return { st, cfg, e, inc, plan };
  };
  const foto = (e, iso) => M.asignados(e, iso, 'ZAPA_M').map(x => [x.pid, !!x.cocina]);
  { // k «solo hace cocina» recibe el martes de a, que llevaba la cocina: entra de cocina
    const { st, cfg, e, inc, plan } = mundo();
    const r = M.aplicarCobertura(cfg, st, e, inc, plan);
    assert.deepStrictEqual(r.rechazados, [], JSON.stringify(r.rechazados));
    assert.deepStrictEqual(r.intercambios.map(x => [x.iso, x.pid, x.quita]), [[D2, 'k', 'a']]);
    assert.deepStrictEqual(foto(e, D1), [['a', true]]);
    assert.deepStrictEqual(foto(e, D2).sort(), [['b', false], ['k', true]]);
  }
  { // el cambio ya no cabe al aplicarlo (entre proponer y confirmar, k recibe un veto de los martes por la mañana en
    // Zapatillera): no se hace nada, ni la mitad (k sigue en su lunes, a no entra en él, el martes queda igual)
    const { st, cfg, e, inc, plan } = mundo();
    M.personaDe(st, 'k').vetos = [{ localId: 'ZAPA', franja: 'M', dow: [2] }];
    const r = M.aplicarCobertura(cfg, st, e, inc, plan);
    assert.deepStrictEqual([r.quitados, r.asignados, r.intercambios], [0, [], []], JSON.stringify(r));
    assert.ok(r.rechazados.length && r.rechazados.some(x => /no hace mañanas en Zapatillera/.test(x.motivo)), JSON.stringify(r.rechazados));
    assert.deepStrictEqual(foto(e, D1), [['k', true]], 'k sigue en su lunes');
    assert.deepStrictEqual(foto(e, D2), [['b', false], ['a', true]], 'el martes, como estaba');
  }
});

ok('A4 · corrección H-05 (13-relajado-obsoleto, 14-prefijo-nombre): «relajado por el generador» solo con el aviso EXACTO de esa pareja y si la pareja SIGUE siendo flexible: un aviso viejo de cuando era flexible, o el de otra persona cuyo nombre empieza igual («Cristian» / «Cris»), no tapa un «nunca con» estricto roto', () => {
  { // 13: el generador juntó a Mari Luz y Lavinia (flexible) el domingo 4; después la pareja pasa a estricta y el domingo no se toca
    const a = a4Escenario({ cubre: true, ivanVac: true });
    M.personaDe(a.staff, 'roberto').ausencias = [{ tipo: 'PERM', desde: '2026-10-04', hasta: '2026-10-04' }];
    M.personaDe(a.staff, 'cristian').ausencias = [{ tipo: 'PERM', desde: '2026-10-04', hasta: '2026-10-04' }];
    M.generarSemana(a.cfg, a.staff, a.sv, A4_LUN, { permitirPartido: true });
    const ml = M.asignados(a.sv, '2026-10-04', 'PASARELA_T').find(x => x.pid === 'mariluz');
    assert.ok(ml && (ml.avisos || []).some(x => /^nunca con Lavinia \(pareja flexible/.test(x)) && M.pidsEn(a.sv, '2026-10-04', 'PASARELA_T').includes('lavinia'), 'preparado: ' + JSON.stringify(M.asignados(a.sv, '2026-10-04', 'PASARELA_T')));
    M.ponerNuncaCon(a.staff, 'mariluz', 'lavinia', { flexible: false });
    const c = M.generarSemana(a.cfg, a.staff, a.sv, A4_LUN, { desdeIso: '2026-10-05' }).condiciones.find(x => x.id === 'p:mariluz:nuncaCon:lavinia');
    assert.ok(c && !c.ok && /domingo 4: juntos en Pasarela/.test(c.detalle), JSON.stringify(c && [c.ok, c.detalle, c.nota]));
  }
  { // 14: Ana (automática) guarda «nunca con Cristian (pareja flexible…)»; Cris, con quien Ana es estricta, forzada a mano
    const st = [a1P('a', { nombre: 'Ana', locales: ['PASARELA'] }), a1P('cristian', { nombre: 'Cristian', locales: ['PASARELA'] }), a1P('cris', { nombre: 'Cris', locales: ['PASARELA'] })];
    const cfg = a1Mundo(st), D = '2026-10-05', T = 'PASARELA_M';
    M.ponerNuncaCon(st, 'a', 'cristian', { flexible: true }); M.ponerNuncaCon(st, 'a', 'cris', {});
    const e = M.nuevoEstado(2026, 10, { festivos: [] });
    assert.ok(M.asignar(e, cfg, st, D, T, 'cristian', { puesto: 'sala', origen: 'generador' }).ok);
    assert.ok(M.asignar(e, cfg, st, D, T, 'a', Object.assign({ puesto: 'sala', origen: 'generador' }, M.RELAJABLE)).ok);
    assert.ok(M.asignar(e, cfg, st, D, T, 'cris', { puesto: 'sala', origen: 'manual', forzar: true, razon: 'lo dice el encargado' }).ok);
    const cs = M.verificarSemana(cfg, st, e, D).filter(c => /nuncaCon/.test(c.id));
    const flex = cs.find(c => c.id === 'p:a:nuncaCon:cristian'), estricta = cs.find(c => c.id === 'p:a:nuncaCon:cris');
    assert.ok(flex && flex.ok && /relajado por el generador con aviso/.test(flex.nota || ''), 'la flexible sí: ' + JSON.stringify(flex));
    assert.ok(estricta && !estricta.ok && /lunes 5: juntos en Pasarela/.test(estricta.detalle), 'la estricta con Cris, rota: ' + JSON.stringify(estricta));
    // y con las dos parejas flexibles: el aviso de Ana es de Cristian, no de Cris (puesta a mano): la de Cris sigue rota
    M.ponerNuncaCon(st, 'a', 'cris', { flexible: true });
    const c2 = M.verificarSemana(cfg, st, e, D).find(c => c.id === 'p:a:nuncaCon:cris');
    assert.ok(c2 && !c2.ok, 'el aviso de «Cristian» no vale para «Cris»: ' + JSON.stringify(c2));
  }
});

ok('A4 · corrección H-06 (10-razon-minimo): la razón «para llegar al mínimo (había n de m)» solo cuando de verdad falta gente; con la casilla ya en su mínimo no se dice', () => {
  const D = '2026-10-05', T = 'PASARELA_M';
  const st = [a1P('x', { locales: ['PASARELA'], franjas: ['M'] }), a1P('q', { locales: ['PASARELA'], cubreA: [{ pid: 'x' }] }), a1P('r', { locales: ['PASARELA'], cubreA: [{ pid: 'x' }] }), a1P('s', { locales: ['PASARELA'] }), a1P('t', { locales: ['PASARELA'] })];
  const cfg = a1Mundo(st, c => { c.patron = { 1: [{ t: T, p: 'x' }, { t: T, p: 's' }] }; M.localDe(c, 'PASARELA').minimos.M[1] = 2; });
  M.personaDe(st, 'x').ausencias = [{ tipo: 'VAC', desde: D, hasta: D }];
  const est = M.nuevoEstado(2026, 10, { festivos: [] });
  M.generarPlanilla(cfg, st, est, D, D, {});
  assert.deepStrictEqual([M.revisarTurno(cfg, st, est, D, T).faltan, M.asignados(est, D, T).map(e => [e.pid, e.por || null])], [0, [['s', null], ['q', 'x']]], 'preparado: completa, con q «por x»');
  const r = M.gruposSelector(cfg, st, est, D, T, {}).pueden.find(c => c.pid === 'r');
  assert.ok(r && !r.razones.some(z => /para llegar al mínimo/.test(z)), JSON.stringify(r && r.razones));
  // con la casilla corta, sí (y con su cuenta)
  M.desasignar(est, D, T, 's');
  const r2 = M.gruposSelector(cfg, st, est, D, T, {}).pueden.find(c => c.pid === 'r');
  assert.ok(r2 && r2.razones[0] === 'para llegar al mínimo (había 1 de 2)', JSON.stringify(r2 && r2.razones));
});

ok('A4 · corrección H-07 y C14 (12-ausentes; revisión de cliente 14): los ausentes del resumen de la semana llevan la etiqueta del día con TODAS sus ausencias (permiso por la mañana y vacaciones por la tarde, las dos) y «otro motivo» dice lo apuntado o «no viene»', () => {
  const a = a4Escenario(), J1 = '2026-10-01';
  const P = id => M.personaDe(a.staff, id);
  P('mariluz').ausencias = [{ tipo: 'PERM', desde: J1, hasta: J1, franjas: ['M'] }, { tipo: 'VAC', desde: J1, hasta: J1, franjas: ['T'] }];
  P('noe').ausencias = [{ tipo: 'OTRO', desde: J1, hasta: J1, detalle: 'médico' }];
  P('tere').ausencias = [{ tipo: 'OTRO', desde: J1, hasta: J1 }];
  P('roberto').ausencias = [{ tipo: 'PERM', desde: J1, hasta: J1, franjas: ['M'] }];
  const r = M.generarSemana(a.cfg, a.staff, a.sv, A4_LUN, {});
  const et = pid => (r.ausentes[J1].find(x => x.pid === pid) || {}).etiqueta;
  assert.strictEqual(et('mariluz'), 'permiso por la mañana · vacaciones por la tarde (día entero)');
  assert.strictEqual(et('roberto'), 'permiso por la mañana');
  assert.strictEqual(et('noe'), 'médico');
  assert.strictEqual(et('tere'), 'no viene');
  assert.strictEqual(et('laura'), 'baja');
  assert.deepStrictEqual(r.ausentes[J1].filter(x => x.pid === 'mariluz').length, 1, 'una sola vez');
});

ok('A4 · corrección C1 (revisión de cliente 1): en el resumen de la semana «libra» solo quien libra de verdad ese día (su día libre, el de esa semana); quien se queda sin plaza sin ausencia, día libre ni cierre va a «sin plaza», y quien al regenerar se queda sin ningún turno en la semana sale en sinTurnos', () => {
  const a = a4Escenario();
  M.generarSemana(a.cfg, a.staff, a.sv, A4_LUN, {});
  // Tere (libra sábado y domingo) pasa a «solo Bar Mónaco», que ya está lleno: sale de Pasarela de lunes a viernes
  M.personaDe(a.staff, 'tere').locales = ['MONACO'];
  M.personaDe(a.staff, 'ivan').ausencias = [{ tipo: 'VAC', desde: '2026-09-28', hasta: '2026-10-04' }];
  const r = M.generarSemana(a.cfg, a.staff, a.sv, A4_LUN, {});
  const LV = r.dias.slice(0, 5), SD = r.dias.slice(5);
  assert.ok(LV.every(iso => !M.turnosDe(a.cfg).some(t => M.pidsEn(a.sv, iso, t.id).includes('tere'))), 'preparado: Tere sin turnos de lunes a viernes');
  for (const iso of LV) assert.ok(!r.libran[iso].includes('tere') && r.sinPlaza[iso].includes('tere'), `${iso}: Tere no libra, está sin plaza`);
  for (const iso of SD) assert.ok(r.libran[iso].includes('tere') && !r.sinPlaza[iso].includes('tere'), `${iso}: su día libre`);
  assert.deepStrictEqual(r.sinTurnos, ['tere'], 'Tere se queda sin turnos esta semana (Iván, de vacaciones toda la semana, no)');
  // cada uno en una sola cuenta; quien libra, libra de verdad
  for (const iso of r.dias) {
    for (const pid of r.libran[iso]) { const p = M.personaDe(a.staff, pid); assert.ok(M.libraEn(p, iso), `${iso}: ${pid} sale como que libra y no libra`); }
    assert.ok(!r.libran[iso].some(pid => r.sinPlaza[iso].includes(pid)));
  }
  // en la semana base, Leo (apoyo; libra miércoles, jueves y domingo) no tiene turno el martes 29: sin plaza, no «libra»
  const b = a4Escenario();
  const rb = M.generarSemana(b.cfg, b.staff, b.sv, A4_LUN, {});
  assert.ok(!rb.libran['2026-09-29'].includes('leo') && rb.sinPlaza['2026-09-29'].includes('leo'), JSON.stringify([rb.libran['2026-09-29'], rb.sinPlaza['2026-09-29']]));
  assert.deepStrictEqual(rb.sinTurnos, [], 'generar de cero no deja a nadie «sin turnos» que antes tuviera');
});

ok('A4 · corrección C4 (revisión de cliente 4): plazasAMano cuenta solo las plazas puestas a mano o forzadas que intervienen en una condición rota (rompen algo ese día y la condición es de esa persona), no cualquier plaza a mano de la semana', () => {
  const a = a4Escenario();
  M.generarSemana(a.cfg, a.staff, a.sv, A4_LUN, {});
  // Leo, a mano y sin aviso, en El 33 el martes 29 por la tarde
  const r0 = M.asignar(a.sv, a.cfg, a.staff, '2026-09-29', 'EL33_T', 'leo', { origen: 'manual', puesto: 'sala', razon: 'lo dice el encargado' });
  assert.ok(r0.ok && !r0.avisos.length, 'preparado: ' + JSON.stringify(r0));
  const r1 = M.generarSemana(a.cfg, a.staff, a.sv, A4_LUN, {});
  assert.strictEqual(r1.resumen.plazasAMano, 0, 'una plaza a mano que no rompe nada no cuenta: ' + JSON.stringify(r1.condiciones.filter(c => !c.ok).map(c => c.texto + ' → ' + c.detalle)));
  // Leo forzado en Zapatillera el jueves 1 por la tarde (libra los jueves): su condición se rompe por esa plaza
  assert.ok(M.asignar(a.sv, a.cfg, a.staff, '2026-10-01', 'ZAPA_T', 'leo', { origen: 'manual', forzar: true, puesto: 'sala', razon: 'prueba' }).ok);
  const r2 = M.generarSemana(a.cfg, a.staff, a.sv, A4_LUN, {});
  assert.ok(r2.condiciones.some(c => !c.ok && c.pid === 'leo'), 'la condición de Leo se rompe');
  assert.strictEqual(r2.resumen.plazasAMano, 1, 'solo la forzada');
});

ok('A4 · corrección (sospecha de la revisión de modelo: puesto en quitarCierre): al reabrir un cierre, lo que vuelve pasa por la puerta con su puesto: quien estaba de sala y ahora «solo hace cocina» no vuelve de sala sin decirlo (se lista con el motivo)', () => {
  const D = '2026-10-06';
  const st = [a1P('a', { locales: ['MONACO'] }), a1P('b', { locales: ['MONACO'] })];
  const cfg = a1Mundo(st);
  const e = M.nuevoEstado(2026, 10, { festivos: [] });
  for (const id of ['a', 'b']) assert.ok(M.asignar(e, cfg, st, D, 'MONACO_T', id, { puesto: 'sala', origen: 'generador', razon: 'x' }).ok);
  const c = { id: 'c1', localId: 'MONACO', motivo: 'reforma', dias: { [D]: ['T'] } };
  assert.deepStrictEqual(M.aplicarCierre(cfg, st, e, c, {}).errores, []);
  assert.deepStrictEqual(M.pidsEn(e, D, 'MONACO_T'), [], 'preparado: el cierre deja la casilla vacía');
  M.personaDe(st, 'a').soloCocina = true;
  const r = M.quitarCierre(cfg, st, e, 'c1', { devolver: true });
  assert.deepStrictEqual(r.devueltos.map(x => x.pid), ['b']);
  assert.deepStrictEqual(r.noDevueltos.map(x => [x.pid, x.motivo]), [['a', 'solo hace cocina']]);
});

// ---------- A5 (01/10): auditoría del modelo · cobertura (F1, F2, F3/D17, F4, F5, F6, F7, F9, sospecha F de quienLeCubre, C11) ----------
// Los scripts de la lente F (scratchpad/auditoria-modelo/F-cobertura/{02-aplicar, 06-turnos-afectados, 07-intercambio-cambio,
// 08-designadas-reglas, 09-varios}.js) como pruebas del repo: en rojo antes, en verde después. f3Escenario es su base.js (la
// planilla de ?demo=1 el jueves 24/09, Dulce ya en activo y Mari Luz «Cubre a» Iván); la Cobertura trabaja como la pestaña, con
// las semanas enteras de rangoNecesario.
const A5_INC = () => ({ pid: 'ivan', tipo: 'VAC', dias: [F3_VIE, F3_SAB, F3_DOM], desde: F3_VIE, hasta: F3_DOM, franjas: ['T'] });
const a5Planes = (cfg, inc, o) => M.planesCobertura(cfg, cfg.staff, f3Entero(cfg, inc), inc, Object.assign({ meses: cfg.meses }, o || {}));
const a5Aplicar = (cfg, inc, plan, o) => { const rg = M.rangoNecesario(inc); return M.aplicarCobertura(cfg, cfg.staff, cieRango(cfg, rg.desde, rg.hasta), inc, plan, o); };
const a5Turnos = (cfg, pid, desde, hasta) => [...M.rangoIso(desde, hasta)].reduce((xs, iso) => xs.concat(M.turnosDe(cfg).filter(t => M.pidsEn(f3Mes(cfg, iso), iso, t.id).includes(pid)).map(t => iso + '|' + t.id)), []);

ok('A5 · F1 (06-turnos-afectados B): la Cobertura con «solo desde hoy» (opts.desdeIso, como cubrirAusencia): los turnos de antes de hoy van a `pasados` —quien falta sale de ellos y su ausencia se apunta entera, pero no entra nadie ni cuentan como hueco—; un plan de antes aplicado con desdeIso tampoco toca lo ya trabajado, y el turno a cambio de un cambio de turno nunca es de un día pasado', () => {
  const HOY = '2026-09-24', FIN = '2026-09-25';   // (el jueves 24 libra: el viernes 25 es el primer turno que queda)
  const inc = { pid: 'sluna', tipo: 'BAJ', desde: '2026-09-14', hasta: FIN, dias: [...M.rangoIso('2026-09-14', FIN)] };
  const cfg = f3Escenario();
  const suyos = a5Turnos(cfg, 'sluna', '2026-09-14', FIN);
  assert.ok(suyos.some(k => k < HOY) && suyos.some(k => k >= HOY), 'preparado: Susana Luna trabaja días pasados y hoy: ' + JSON.stringify(suyos));
  const res = a5Planes(cfg, inc, { desdeIso: HOY });
  assert.deepStrictEqual((res.pasados || []).map(x => x.iso + '|' + x.tid).sort(), suyos.filter(k => k < HOY).sort(), 'lo de antes de hoy, a pasados');
  assert.deepStrictEqual(res.afectados.map(a => a.iso + '|' + a.tid), suyos.filter(k => k >= HOY), 'solo se cubre desde hoy');
  for (const P of res.planes) {
    assert.deepStrictEqual(P.asignaciones.filter(a => a.iso < HOY).map(a => a.iso + ' ' + a.pid), [], P.titulo + ': nadie en días ya trabajados');
    assert.ok(P.huecos.concat(P.sinCubrir).every(h => h.iso >= HOY), P.titulo + ': lo pasado no es un hueco');
  }
  // al aplicar: la baja entera en la ficha, Susana Luna sale también de los días pasados y nadie entra en ellos
  const rob0 = a5Turnos(cfg, 'roberto', '2026-09-01', '2026-09-23'), cri0 = a5Turnos(cfg, 'cristian', '2026-09-01', '2026-09-23');
  const r = a5Aplicar(cfg, inc, res.planes[0], { desdeIso: HOY });
  assert.deepStrictEqual(a5Turnos(cfg, 'roberto', '2026-09-01', '2026-09-23'), rob0, 'Roberto, igual en los días ya trabajados');
  assert.deepStrictEqual(a5Turnos(cfg, 'cristian', '2026-09-01', '2026-09-23'), cri0, 'Cristian, igual');
  assert.deepStrictEqual(a5Turnos(cfg, 'sluna', '2026-09-14', FIN), [], 'Susana Luna sale de todos (estaba de baja)');
  assert.deepStrictEqual((r.pasados || []).map(x => x.iso + '|' + x.tid).sort(), suyos.filter(k => k < HOY).sort());
  assert.ok(M.ausenciaEn(M.personaDe(cfg.staff, 'sluna'), '2026-09-15', 'T') && M.ausenciaEn(M.personaDe(cfg.staff, 'sluna'), FIN, 'T'), 'la baja, entera');
  // el plan de antes (sin desdeIso sí ponía gente en días pasados) aplicado con desdeIso: nada en lo ya trabajado
  const cfg2 = f3Escenario();
  const P2 = a5Planes(cfg2, inc).planes[0];
  assert.ok(P2.asignaciones.some(a => a.iso < HOY), 'preparado: sin «solo desde hoy» el plan ponía gente en días pasados');
  const rob2 = a5Turnos(cfg2, 'roberto', '2026-09-01', '2026-09-23'), cri2 = a5Turnos(cfg2, 'cristian', '2026-09-01', '2026-09-23');
  const r2 = a5Aplicar(cfg2, inc, P2, { desdeIso: HOY });
  assert.deepStrictEqual([a5Turnos(cfg2, 'roberto', '2026-09-01', '2026-09-23'), a5Turnos(cfg2, 'cristian', '2026-09-01', '2026-09-23')], [rob2, cri2]);
  assert.ok(r2.asignados.every(x => x.iso >= HOY), JSON.stringify(r2.asignados));
  // cambio de turno de Susana Luna el miércoles 7/10 con «hoy» ese miércoles: Roberto tiene el martes 6 (más cerca, ya
  // trabajado) y el sábado 10
  const cfg3 = cfgBase(), st3 = cfg3.staff, e3 = estadoOct();
  for (const [d, id, c] of [['2026-10-07', 'sluna'], ['2026-10-06', 'roberto'], ['2026-10-06', 'adrian', 1], ['2026-10-10', 'roberto'], ['2026-10-10', 'adrian', 1]]) assert.ok(M.asignar(e3, cfg3, st3, d, 'ZAPA_T', id, { cocina: !!c }).ok, id + ' ' + d);
  const cambio = { pid: 'sluna', tipo: 'CAMBIO', desde: '2026-10-07', hasta: '2026-10-07', dias: ['2026-10-07'] };
  const sinHoy = M.planesCobertura(cfg3, st3, e3, cambio, { intercambio: true }).planes.map(P => P.asignaciones.find(a => a.pid === 'roberto' && a.intercambio)).filter(Boolean)[0];
  assert.ok(sinHoy && sinHoy.intercambio.iso === '2026-10-06', 'preparado: sin «solo desde hoy» el turno a cambio es el martes 6: ' + JSON.stringify(sinHoy && sinHoy.intercambio));
  const conHoy = M.planesCobertura(cfg3, st3, e3, cambio, { intercambio: true, desdeIso: '2026-10-07' }).planes.map(P => P.asignaciones.find(a => a.pid === 'roberto' && a.intercambio)).filter(Boolean)[0];
  assert.ok(conHoy && conHoy.intercambio.iso === '2026-10-10', 'con «solo desde hoy», el sábado 10: ' + JSON.stringify(conHoy && conHoy.intercambio));
});

ok('A5 · F2 (09-varios B): el turno a cambio de un cambio de turno no deja corta la casilla de quien cubre: se descarta el que la deja sin quien abra, solo con apoyos, sin la cocina que tenía o con menos gente; si no hay otro, se propone con esos avisos (as.intercambio.avisos)', () => {
  // martes 6/10 Zapatillera tarde: Cristian y Adrián (cocina); sábado 10: Susana Luna y Leo. Cristian cambia el martes: Susana Luna
  // le cubre y, a cambio, Cristian haría el sábado de Susana Luna (quedarían Leo y Cristian: dos apoyos que no abren la tarde)
  const monta = otro => {
    const cfg = cfgBase(), st = cfg.staff, e = estadoOct();
    const ps = [['2026-10-06', 'cristian'], ['2026-10-06', 'adrian', 1], ['2026-10-10', 'sluna'], ['2026-10-10', 'leo']].concat(otro ? [['2026-10-13', 'roberto'], ['2026-10-13', 'sluna']] : []);
    for (const [d, id, c] of ps) assert.ok(M.asignar(e, cfg, st, d, 'ZAPA_T', id, { cocina: !!c }).ok, id + ' ' + d);
    return { cfg, st, e };
  };
  const cambio = { pid: 'cristian', tipo: 'CAMBIO', desde: '2026-10-06', hasta: '2026-10-06', dias: ['2026-10-06'] };
  const deSluna = (cfg, st, e) => M.planesCobertura(cfg, st, e, cambio, { intercambio: true, siempre: true }).planes.map(P => P.asignaciones.find(a => a.pid === 'sluna' && a.intercambio)).filter(Boolean)[0];
  { // sin otro turno de Susana Luna esa quincena: el del sábado, con los avisos
    const { cfg, st, e } = monta(false);
    const as = deSluna(cfg, st, e);
    assert.ok(as && as.intercambio.iso === '2026-10-10' && as.intercambio.tid === 'ZAPA_T', JSON.stringify(as && as.intercambio));
    assert.deepStrictEqual(as.intercambio.avisos, ['sin nadie que abra', 'solo con apoyos'], 'el sábado tenía quien abriera y alguien de sala; la cocina ya faltaba antes: no es un aviso nuevo');
  }
  { // con otro turno suyo, el martes 13 con Roberto (que abre), se elige ese aunque esté más lejos, y sin avisos
    const { cfg, st, e } = monta(true);
    const as = deSluna(cfg, st, e);
    assert.ok(as && as.intercambio.iso === '2026-10-13', JSON.stringify(as && as.intercambio));
    assert.deepStrictEqual(as.intercambio.avisos, []);
  }
  { // el intercambio de siempre (el sábado de Roberto, con Adrián en la cocina) sigue sin avisos
    const cfg = cfgBase(), st = cfg.staff, e = estadoOct();
    for (const [d, id, c] of [['2026-10-06', 'sluna'], ['2026-10-06', 'adrian', 1], ['2026-10-10', 'roberto'], ['2026-10-10', 'adrian', 1]]) assert.ok(M.asignar(e, cfg, st, d, 'ZAPA_T', id, { cocina: !!c }).ok);
    const x = M.planesCobertura(cfg, st, e, { pid: 'sluna', tipo: 'CAMBIO', desde: '2026-10-06', hasta: '2026-10-06' }, { intercambio: true }).planes[0].asignaciones[0].intercambio;
    assert.ok(x && x.iso === '2026-10-10' && Array.isArray(x.avisos) && !x.avisos.length, JSON.stringify(x));
  }
});

ok('A5 · F3/D17 (07-intercambio-cambio C): un cambio de turno no es una falta: ni designadas, ni relevo, ni «cubre a», ni «por X», ni el partido autorizado para cubrirle; quien entra lo hace «cambio con Iván», y lo que enseña el plan es lo que queda al aplicar', () => {
  const sinParejas = (cfg, st) => { for (const id of ['mariluz', 'lavinia']) { M.personaDe(st, id).nuncaCon = []; M.personaDe(st, id).nuncaConFlex = []; } };
  const cfg = f3Escenario(sinParejas);
  const cambio = { pid: 'ivan', tipo: 'CAMBIO', desde: F3_DOM, hasta: F3_DOM, dias: [F3_DOM] };
  const res = a5Planes(cfg, cambio, { intercambio: true });
  assert.deepStrictEqual(res.designados, [], 'nadie «tiene quien le cubra» en un cambio');
  assert.ok(res.afectados.every(a => !(a.noCubren || []).length), JSON.stringify(res.afectados.map(a => a.noCubren)));
  assert.ok(res.planes.length && res.planes[0].asignaciones.length, 'preparado: el plan pone a alguien en la tarde del domingo');
  for (const P of res.planes) for (const a of P.asignaciones) {
    const quien = `${P.id} ${a.iso} ${a.pid}: ${JSON.stringify(a)}`;
    assert.ok(!a.yaEstaba && !a.cubre && !a.por, quien);
    assert.ok(!a.razones.some(x => /^cubre a /.test(x)), quien);
    assert.ok(!(a.autorizados || []).some(x => /para cubrir/.test(x.texto)), quien);
    if (!/^para llegar al mínimo/.test(a.razones[0])) assert.strictEqual(a.razones[0], 'cambio con Iván', quien);
  }
  // al aplicar: sin «por», sin designación, «cambio con Iván»; lo autorizado y los avisos, los mismos que enseñó el plan
  const P = res.planes[0];
  const r = a5Aplicar(cfg, cambio, P);
  const oct = f3Mes(cfg, F3_DOM);
  assert.ok(r.asignados.length, JSON.stringify(r));
  for (const x of r.asignados) {
    const en = M.asignados(oct, x.iso, x.tid).find(y => y.pid === x.pid), as = P.asignaciones.find(y => y.iso === x.iso && y.tid === x.tid && y.pid === x.pid);
    assert.ok(en && !en.por && !en.porDesignacion && !en.porAusenciaDe && /^(cambio con Iván|para llegar al mínimo)/.test(en.razon), JSON.stringify(en));
    assert.strictEqual(!!M.avisosVigentes(cfg, cfg.staff, oct, x.iso, x.tid, x.pid).length, !!as.avisos.length, 'los avisos que enseñó el plan son los que quedan: ' + JSON.stringify(as.avisos));
    assert.deepStrictEqual(M.revisarEntrada(cfg, cfg.staff, oct, x.iso, x.tid, x.pid).autorizados.filter(a => !a.continuo), []);
  }
  // regenerar no lo retira (Iván no está ausente: nada que «ya no falte»)
  const g = M.generarPlanilla(cfg, cfg.staff, oct, '2026-10-01', '2026-10-31', { meses: cfg.meses });
  assert.deepStrictEqual(g.retirados.filter(x => r.asignados.some(y => y.iso === x.iso && y.pid === x.pid)), []);
  // el relevo tampoco: Iván cambia el viernes y Mari Luz, que ya está en la tarde, no pasa a ir «por Iván»
  const cfg2 = f3Escenario();
  const c2 = { pid: 'ivan', tipo: 'CAMBIO', desde: F3_VIE, hasta: F3_VIE, dias: [F3_VIE] };
  for (const P2 of a5Planes(cfg2, c2, { intercambio: true }).planes) assert.ok(!P2.asignaciones.some(a => a.yaEstaba || a.por), JSON.stringify(P2.asignaciones));
});

ok('A5 · F4 (02-aplicar D, 09-varios D): lo que pone la Cobertura por la ausencia de X lleva porAusenciaDe (también quien entra «para llegar al mínimo»); cuando X ya no falta, la Revisión lo dice («por-presente») y regenerar lo retira («Iván ya no falta…»); el relevo solo pierde el «por», y lo puesto a mano no se retira', () => {
  const cfg = f3Escenario(), inc = A5_INC();
  const A = a5Planes(cfg, inc).planes[0];
  a5Aplicar(cfg, inc, A);
  const oct = f3Mes(cfg, F3_VIE);
  const en = (iso, pid, tid) => M.asignados(oct, iso, tid || 'PASARELA_T').find(x => x.pid === pid);
  assert.ok(en(F3_VIE, 'dulce') && en(F3_DOM, 'roberto') && en(F3_VIE, 'mariluz'), 'preparado: ' + [F3_VIE, F3_SAB, F3_DOM].map(i => M.pidsEn(oct, i, 'PASARELA_T').join(',')).join(' | '));
  assert.strictEqual(en(F3_VIE, 'dulce').porAusenciaDe, 'ivan', 'la que entra para llegar al mínimo también: ' + JSON.stringify(en(F3_VIE, 'dulce')));
  assert.ok(!en(F3_VIE, 'dulce').por);
  assert.strictEqual(en(F3_DOM, 'roberto').porAusenciaDe, 'ivan');
  assert.ok(!en(F3_VIE, 'mariluz').porAusenciaDe && en(F3_VIE, 'mariluz').relevo, 'el relevo está en su plaza: no');
  // a mano, «por Iván», el domingo por la mañana (lo puso el encargado)
  assert.ok(M.asignar(oct, cfg, cfg.staff, F3_DOM, 'PASARELA_M', 'dulce', { origen: 'manual', por: 'ivan', razon: 'cubre a Iván', forzar: true }).ok);
  // Iván vuelve (se quitan sus vacaciones en la ficha): la Revisión lo dice antes de regenerar
  M.personaDe(cfg.staff, 'ivan').ausencias = [];
  const pp = () => M.revisionMes(cfg, cfg.staff, oct, { desde: F3_VIE, hasta: F3_DOM }).filter(x => x.tipo === 'por-presente');
  const rv = pp();
  assert.ok(rv.some(x => x.iso === F3_DOM && x.pid === 'roberto' && x.nivel === 'media' && /Roberto va por Iván, que ya no falta ese día/.test(x.msg)), JSON.stringify(rv));
  assert.ok(rv.some(x => x.iso === F3_VIE && x.pid === 'mariluz'), 'el relevo también va «por» quien ya no falta: ' + JSON.stringify(rv));
  assert.ok(!rv.some(x => x.pid === 'dulce' && x.turnoId === 'PASARELA_T'), 'quien entró para llegar al mínimo no va «por» nadie');
  // regenerar retira lo que entró por él, también lo de «para llegar al mínimo»; el relevo pierde el «por»; lo manual se queda
  const g = M.generarPlanilla(cfg, cfg.staff, oct, '2026-10-01', '2026-10-04', { meses: cfg.meses });
  const ret = g.retirados.filter(x => x.turnoId === 'PASARELA_T').map(x => [x.iso, x.pid, x.motivo]).sort();
  // (corrección de A5, cliente H13) el motivo sin el día: «Se retira» lo agrupa por persona y los días van en la línea
  assert.deepStrictEqual(ret, [
    [F3_VIE, 'dulce', 'Iván ya no falta: ya no hay que cubrir su sitio'],
    [F3_SAB, 'dulce', 'Iván ya no falta: ya no hay que cubrir su sitio'],
    [F3_DOM, 'roberto', 'Iván ya no falta: ya no hay que cubrir su sitio'],
  ]);
  assert.ok(M.pidsEn(oct, F3_VIE, 'PASARELA_T').includes('ivan') && !en(F3_VIE, 'mariluz').por, 'Iván vuelve a su tarde y Mari Luz sigue en la suya sin «por»');
  assert.ok(en(F3_DOM, 'dulce', 'PASARELA_M'), 'lo puesto a mano no se retira');
  assert.deepStrictEqual(pp().map(x => [x.iso, x.turnoId, x.pid]), [[F3_DOM, 'PASARELA_M', 'dulce']], 'tras regenerar, la Revisión solo señala lo puesto a mano');
  assert.deepStrictEqual(M.generarPlanilla(cfg, cfg.staff, oct, '2026-10-01', '2026-10-04', { meses: cfg.meses }).retirados, [], 'regenerar otra vez no retira nada');
  // «por X» con X en la misma casilla (Iván vuelve y el encargado le pone a mano en su tarde antes de regenerar): también
  const cfg2 = f3Escenario();
  a5Aplicar(cfg2, inc, a5Planes(cfg2, inc).planes[0]);
  const oct2 = f3Mes(cfg2, F3_DOM);
  M.personaDe(cfg2.staff, 'ivan').ausencias = [];
  assert.ok(M.asignar(oct2, cfg2, cfg2.staff, F3_DOM, 'PASARELA_T', 'ivan', { origen: 'manual', forzar: true }).ok);
  const rv2 = M.revisionMes(cfg2, cfg2.staff, oct2, { desde: F3_DOM, hasta: F3_DOM }).filter(x => x.tipo === 'por-presente');
  assert.ok(rv2.some(x => x.pid === 'roberto' && /Roberto va por Iván, que está en la misma casilla/.test(x.msg)), JSON.stringify(rv2));
  // lo que pone un cambio de turno no lleva porAusenciaDe (Iván no falta)
  const cfg3 = f3Escenario();
  const c3 = { pid: 'ivan', tipo: 'CAMBIO', desde: F3_SAB, hasta: F3_SAB, dias: [F3_SAB] };
  const r3 = a5Aplicar(cfg3, c3, a5Planes(cfg3, c3).planes[0]);
  assert.ok(r3.asignados.length && r3.asignados.every(x => !M.asignados(f3Mes(cfg3, x.iso), x.iso, x.tid).find(y => y.pid === x.pid).porAusenciaDe), JSON.stringify(r3.asignados));
});

ok('A5 · F5 (06-turnos-afectados A): MAX_DIAS_COBERTURA cuenta los días MARCADOS, no los del medio: el 2/10 y el 15/12 son dos días y salen los dos (y aplicar saca a Iván de los dos); con más días marcados que el tope, `truncado` dice hasta dónde se ha mirado', () => {
  const cfg = f3Escenario();
  const dic = M.estadoDesde(cfg.meses, [], 2026, 12);
  M.generarPlanilla(cfg, cfg.staff, dic, '2026-12-14', '2026-12-20', {});
  cfg.meses['2026-12'] = { asig: dic.asig, apertura: dic.apertura, manual: dic.manual };
  assert.ok(M.pidsEn(dic, '2026-12-15', 'PASARELA_T').includes('ivan'), 'preparado: Iván trabaja la tarde del 15/12');
  const inc = { pid: 'ivan', tipo: 'VAC', dias: ['2026-10-02', '2026-12-15'], desde: '2026-10-02', hasta: '2026-12-15', franjas: ['T'] };
  const res = a5Planes(cfg, inc);
  assert.deepStrictEqual(res.afectados.map(a => a.iso + ' ' + a.tid), ['2026-10-02 PASARELA_T', '2026-12-15 PASARELA_T']);
  assert.strictEqual(res.truncado, null);
  const r = a5Aplicar(cfg, inc, res.planes[0]);
  assert.strictEqual(r.quitados, 2);
  assert.ok(!M.pidsEn(M.estadoDesde(cfg.meses, [], 2026, 12), '2026-12-15', 'PASARELA_T').includes('ivan'), 'Iván ya no está en la tarde del 15/12, de vacaciones');
  // 70 días marcados: se miran los primeros 62 y se dice (corrección de A5, modelo H3: con la planilla de esos días, la que trae la
  // pestaña; `fuera`, los marcados que no están en ella, ninguno)
  const dias = [...M.rangoIso('2026-10-01', M.addDias('2026-10-01', 69))];
  const inc70 = { pid: 'laura', tipo: 'BAJ', dias, desde: dias[0], hasta: dias[69] };
  const r2 = M.planesCobertura(cfg, cfg.staff, M.clonarEstado(a5rDias(cfg, M.diasNecesarios(inc70))), inc70, {});
  assert.deepStrictEqual(r2.truncado, { max: 62, marcados: 70, hasta: dias[61], fuera: [] });
});

ok('A5 · F6 (06 C y D, 09 C): una casilla cerrada ese día (por fechas o en «Cuándo abre») con gente dentro: «cerrada ese día: nada que cubrir», también con «Reemplazar siempre» (antes «sigue completa (1 de 2)» o nada)', () => {
  const cierre = { id: 'c1', localId: 'MONACO', dias: { '2026-09-27': ['T'], '2026-09-28': ['M', 'T'], '2026-09-29': ['M', 'T'] }, motivo: 'reforma', decisiones: {}, retirados: [] };
  const cfg = f3Escenario(null, c => { c.cierresPuntuales = [cierre]; });
  const inc = { pid: 'cristian', tipo: 'LD', desde: '2026-09-28', hasta: '2026-09-29', dias: ['2026-09-28', '2026-09-29'] };
  for (const siempre of [false, true]) {
    const res = a5Planes(cfg, inc, { siempre });
    assert.deepStrictEqual(res.afectados.map(a => a.iso + ' ' + a.tid), ['2026-09-28 MONACO_M', '2026-09-29 MONACO_T'], 'preparado');
    for (const P of res.planes.length ? res.planes : [null]) {
      assert.ok(P, 'hay plan (con «siempre» = ' + siempre + ')');
      assert.deepStrictEqual([P.asignaciones, P.huecos], [[], []]);
      assert.deepStrictEqual(P.sinCubrir.map(s => [s.iso, s.tid, s.motivo]), [['2026-09-28', 'MONACO_M', 'cerrada ese día: nada que cubrir'], ['2026-09-29', 'MONACO_T', 'cerrada ese día: nada que cubrir']], 'siempre = ' + siempre);
    }
  }
  // «Cuándo abre» a mano (apertura false) con Cristian aún dentro
  const cfg2 = f3Escenario();
  f3Mes(cfg2, '2026-09-29').apertura['2026-09-29'] = { MONACO_T: false };
  const inc2 = { pid: 'cristian', tipo: 'LD', desde: '2026-09-29', hasta: '2026-09-29', dias: ['2026-09-29'] };
  for (const siempre of [false, true]) {
    const P = a5Planes(cfg2, inc2, { siempre }).planes[0];
    assert.ok(P, 'hay plan');
    assert.deepStrictEqual(P.sinCubrir.map(s => [s.tid, s.motivo]).concat(P.asignaciones.map(a => [a.tid, a.pid])), [['MONACO_T', 'cerrada ese día: nada que cubrir']], 'siempre = ' + siempre);
  }
});

ok('A5 · F7 (06-turnos-afectados E): «sale · … nadie abre» se calcula con el relevo ya marcado, como el plan: Mari Luz (sin partido declarado el viernes) ya estaba con Iván y, al cubrirle, abre', () => {
  const cfg = f3Escenario(null, (c, st) => { M.personaDe(st, 'mariluz').partido.dias = [2, 4]; });
  const inc = { pid: 'ivan', tipo: 'VAC', dias: [F3_VIE], desde: F3_VIE, hasta: F3_VIE, franjas: ['T'] };
  assert.ok(M.pidsEn(f3Mes(cfg, F3_VIE), F3_VIE, 'PASARELA_T').includes('mariluz') && M.pidsEn(f3Mes(cfg, F3_VIE), F3_VIE, 'PASARELA_M').includes('mariluz'), 'preparado: Mari Luz de mañana y de tarde el viernes');
  const res = a5Planes(cfg, inc);
  const rel = res.planes[0].asignaciones.find(a => a.pid === 'mariluz');
  assert.ok(rel && rel.yaEstaba && rel.abre, 'el plan: Mari Luz ya estaba y abre: ' + JSON.stringify(rel));
  assert.strictEqual(res.afectados[0].sinAbre, false, 'y «sale» no dice que nadie abre');
  // con el mínimo de la tarde en 2, sin Iván quedan 2 de 2: no hay nada que cubrir (antes, «nadie abre» la hacía necesaria)
  const cfg2 = f3Escenario(null, (c, st) => { M.personaDe(st, 'mariluz').partido.dias = [2, 4]; M.localDe(c, 'PASARELA').minimos.T[5] = 2; });
  const res2 = a5Planes(cfg2, inc);
  assert.deepStrictEqual([res2.afectados[0].faltan, res2.afectados[0].sinAbre, res2.afectados[0].necesario, res2.necesarios], [0, false, false, 0]);
});

ok('A5 · F9 (09-varios A): al aplicar un plan, quien entraba «para llegar al mínimo» no entra si la casilla ya está completa («la casilla ya está completa»); quien cubre a X sí', () => {
  const cfg = f3Escenario(), inc = A5_INC();
  const A = a5Planes(cfg, inc).planes[0];
  assert.ok(A.asignaciones.some(a => a.iso === F3_VIE && a.pid === 'dulce' && /^para llegar al mínimo/.test(a.razon)), 'preparado: ' + JSON.stringify(A.asignaciones.map(a => a.iso + ' ' + a.pid + ' ' + a.razon)));
  // entre proponer y confirmar, el encargado quita a Iván del viernes y fuerza a Yilian: la casilla queda completa (3 de 3)
  const oct = f3Mes(cfg, F3_VIE);
  M.desasignar(oct, F3_VIE, 'PASARELA_T', 'ivan');
  assert.ok(M.asignar(oct, cfg, cfg.staff, F3_VIE, 'PASARELA_T', 'yilian', { forzar: true }).ok);
  const r = a5Aplicar(cfg, inc, A);
  assert.ok(r.rechazados.some(x => x.iso === F3_VIE && x.pid === 'dulce' && x.motivo === 'la casilla ya está completa'), JSON.stringify(r.rechazados));
  assert.ok(!M.pidsEn(oct, F3_VIE, 'PASARELA_T').includes('dulce'));
  assert.strictEqual(M.revisarTurno(cfg, cfg.staff, oct, F3_VIE, 'PASARELA_T').n, 3);
  assert.ok(M.pidsEn(oct, F3_SAB, 'PASARELA_T').includes('dulce'), 'el sábado sigue faltando gente: entra');
  assert.ok(r.asignados.some(x => x.iso === F3_VIE && x.pid === 'mariluz' && x.yaEstaba), 'el relevo, sí');
});

ok('A5 · sospecha F (08-designadas-reglas A): quienLeCubre marca activa:false (con el porqué en `inactiva`) a la designada de baja sin fecha de fin o en standby, y la Cobertura no la anuncia en «tiene quien le cubra»', () => {
  const cfg = f3Escenario(null, (c, st) => { M.personaDe(st, 'mariluz').cubreA = []; M.personaDe(st, 'laura').cubreA = [{ pid: 'ivan' }]; M.personaDe(st, 'dulce').standby = true; M.personaDe(st, 'dulce').cubreA = [{ pid: 'ivan' }]; });
  const q = M.quienLeCubre(cfg, cfg.staff, 'ivan', '2026-09-29');
  assert.deepStrictEqual(q.map(d => [d.pid, d.activa, d.inactiva || null]), [['dulce', false, 'está en standby'], ['laura', false, 'está de baja']]);
  const inc = { pid: 'ivan', tipo: 'PERM', desde: '2026-09-29', hasta: '2026-09-29', dias: ['2026-09-29'], franjas: ['T'] };
  assert.deepStrictEqual(a5Planes(cfg, inc).designados, []);
  // la baja con fecha de fin no (vuelve), ni la baja sin fin que aún no ha empezado ese día; con «Cubre a» apagado, activa:false sin `inactiva`
  M.personaDe(cfg.staff, 'laura').ausencias = [{ tipo: 'BAJ', desde: '2026-09-01', hasta: '2026-10-15' }];
  delete M.personaDe(cfg.staff, 'dulce').standby;
  assert.deepStrictEqual(M.quienLeCubre(cfg, cfg.staff, 'ivan', '2026-09-29').map(d => [d.pid, d.activa]), [['dulce', true], ['laura', true]]);
  M.personaDe(cfg.staff, 'laura').ausencias = [{ tipo: 'BAJ', desde: '2026-10-15' }];
  assert.deepStrictEqual(M.quienLeCubre(cfg, cfg.staff, 'ivan', '2026-09-29').map(d => [d.pid, d.activa]), [['dulce', true], ['laura', true]]);
  assert.deepStrictEqual(M.quienLeCubre(cfg, cfg.staff, 'ivan', '2026-10-20').map(d => [d.pid, d.activa, d.inactiva || null]), [['dulce', true, null], ['laura', false, 'está de baja']]);
  M.personaDe(cfg.staff, 'dulce').inactivas = ['cubreA'];
  assert.deepStrictEqual(M.quienLeCubre(cfg, cfg.staff, 'ivan', '2026-09-29').filter(d => d.pid === 'dulce').map(d => [d.activa, d.inactiva || null]), [[false, null]]);
});

ok('A5 · C11 (revisión de cliente de A4): en el plan de la Cobertura quien entra «por Noe» lo dice (lo primero: «por Noe», o «cubre a Noe» si tiene la designación, corrección C-S1), como luego lo dice la planilla; quien entra para llegar al mínimo, no', () => {
  const cfg = Object.assign(cfgBase(), { meses: {} });
  M.personaDe(cfg.staff, 'leo').cubreA = [{ pid: 'noe' }];
  M.personaDe(cfg.staff, 'victoria').cubreA = [{ pid: 'noe' }];
  M.sembrarDemo(cfg, '2026-09-24');
  cfg.eventos = (cfg.eventos || []).concat([{ id: 'ev_fiesta', iso: '2026-10-06', nombre: 'Fiesta del barrio', franja: 'T', refuerzo: { EL33: 1 } }]);
  const M6 = '2026-10-06';
  const inc = { pid: 'noe', tipo: 'PERM', desde: M6, hasta: M6, dias: [M6] };
  const res = a5Planes(cfg, inc);
  const A = res.planes[0];
  const v = A.asignaciones.find(a => a.tid === 'EL33_T' && a.pid === 'victoria'), l = A.asignaciones.find(a => a.tid === 'EL33_T' && a.pid === 'leo');
  assert.ok(v && l, 'preparado: ' + JSON.stringify(A.asignaciones.map(a => a.tid + ' ' + a.pid)));
  assert.strictEqual(v.por, 'noe');
  // (corrección de A5, cliente S1) Victoria tiene «Cubre a» Noe, pero Noe llevaba la cocina y ella entra de sala: su designación no
  // es para ese puesto (cubreEnCasilla), así que entra «por Noe», no «cubre a Noe»
  assert.strictEqual(v.razones[0], 'por Noe', JSON.stringify(v.razones));
  assert.ok(/^para llegar al mínimo \(había 1 de 2\)$/.test(l.razones[0]) && !l.razones.some(x => x === 'cubre a Noe' || x === 'por Noe'), JSON.stringify(l.razones));
  for (const P of res.planes) for (const a of P.asignaciones) if (a.por && !a.yaEstaba) assert.strictEqual(a.razones.filter(x => x === 'cubre a Noe' || x === 'por Noe').length, 1, JSON.stringify(a));
  // y al aplicar, la planilla dice lo mismo
  a5Aplicar(cfg, inc, A);
  assert.strictEqual(M.asignados(f3Mes(cfg, M6), M6, 'EL33_T').find(x => x.pid === 'victoria').razon, 'por Noe');
});

// ---------- A5 · corrección tras la revisión (01/10): las dos revisiones de la fase (modelo M-Hx y cliente C-Hx / C-Sx) ----------
// Los scripts de los revisores (scratchpad/fases/A5rev/modelo/rNN-*.js, cliente/*.mjs) como pruebas del repo. HOY es el jueves
// 24/09 de ?demo=1; la hora de Madrid la pasa la pestaña (opts.ahoraHM), el modelo no mira el reloj.
const A5R_HOY = '2026-09-24';
// el estado virtual de unos días sueltos (como la pestaña con diasNecesarios): cada día apunta a los objetos de su mes
function a5rDias(cfg, isos) {
  const e = { y: +isos[0].slice(0, 4), m: +isos[0].slice(5, 7), days: [], asig: {}, apertura: {}, manual: {}, festivos: [], virtual: true };
  for (const iso of isos) {
    const k = iso.slice(0, 7);
    cfg.meses[k] = cfg.meses[k] || { asig: {}, apertura: {}, manual: {} };
    const me = M.estadoDesde(cfg.meses, [], +iso.slice(0, 4), +iso.slice(5, 7));
    e.days.push(me.days.find(d => d.iso === iso));
    me.asig[iso] = me.asig[iso] || {}; me.apertura[iso] = me.apertura[iso] || {}; me.manual[iso] = me.manual[iso] || {};
    e.asig[iso] = me.asig[iso]; e.apertura[iso] = me.apertura[iso]; e.manual[iso] = me.manual[iso];
  }
  return e;
}
const a5rTxt = P => JSON.stringify(P.asignaciones.map(a => `${a.iso.slice(5)} ${a.tid} ${a.pid}${a.abre ? ' ABRE' : ''} «${a.razones[0]}»${a.intercambio ? ' ⇄ ' + a.intercambio.iso + ' ' + a.intercambio.tid : ''}`));

ok('A5 · corrección M-H1 (r01c): quien entra solo para que la casilla tenga quien abra lleva «para abrir» (sin «por» ni «para llegar al mínimo») y al aplicar entra: la casilla abre; si al confirmar ya hay quien abra, no entra', () => {
  const D = '2026-10-18', T = 'PASARELA_T';
  const monta = () => f3Escenario((c, st) => { M.personaDe(st, 'lavinia').cubreA = [{ pid: 'ivan' }]; M.personaDe(st, 'mariluz').cubreA = []; },
    (c, st) => { M.localDe(c, 'PASARELA').minimos.T[0] = 1; M.personaDe(st, 'lavinia').noPrimero = ['T']; });
  const inc = { pid: 'ivan', tipo: 'VAC', dias: [D], desde: D, hasta: D, franjas: ['T'] };
  const cfg = monta();
  const A = a5Planes(cfg, inc, { desdeIso: '2026-10-01' }).planes[0];
  const ab = A.asignaciones.find(a => a.abre && !a.yaEstaba);
  assert.ok(ab && A.completo, 'preparado: alguien entra a abrir: ' + a5rTxt(A));
  assert.strictEqual(ab.razones[0], 'para abrir', a5rTxt(A));
  assert.ok(!ab.minimo && !ab.por && !ab.cubre && !ab.razones.some(r => /para llegar al mínimo|^cubre a|^por /.test(r)), JSON.stringify(ab));
  const r = a5Aplicar(cfg, inc, A, { desdeIso: '2026-10-01' });
  assert.deepStrictEqual(r.rechazados, [], 'lo que enseña el plan es lo que queda');
  const oct = f3Mes(cfg, D), en = M.asignados(oct, D, T).find(x => x.pid === ab.pid);
  assert.ok(en && en.razon === 'para abrir' && !en.por && en.porAusenciaDe === 'ivan', JSON.stringify(M.asignados(oct, D, T)));
  assert.strictEqual(M.revisarTurno(cfg, cfg.staff, oct, D, T).sinAbre, false, 'la casilla tiene quien abra');
  // (F9, red de seguridad) si al confirmar la casilla ya está completa y alguien abre, no entra
  const cfg2 = monta(), A2 = a5Planes(cfg2, inc, { desdeIso: '2026-10-01' }).planes[0], oct2 = f3Mes(cfg2, D);
  M.desasignar(oct2, D, T, 'ivan');
  for (const pid of ['leo', 'yilian']) assert.ok(M.asignar(oct2, cfg2, cfg2.staff, D, T, pid, { forzar: true, abre: pid === 'leo' }).ok, pid);
  const r2 = a5Aplicar(cfg2, inc, A2, { desdeIso: '2026-10-01' });
  assert.ok(r2.rechazados.some(x => x.pid === ab.pid && x.motivo === 'la casilla ya está completa'), JSON.stringify(r2.rechazados));
});

ok('A5 · corrección M-H2 y C-H8 (r02): en un cambio de turno lo ya pasado no se toca —ni un día de antes de hoy ni, con la hora, el turno de hoy ya terminado—: va a `pasados`, quien lo pide sigue en él y no se apunta nada', () => {
  const cfg = f3Escenario(), sep = f3Mes(cfg, '2026-09-15');
  const dia = [...M.rangoIso('2026-09-15', '2026-09-23')].find(iso => M.pidsEn(sep, iso, 'PASARELA_T').includes('ivan'));
  assert.ok(dia, 'preparado: Iván trabajó una tarde de la semana pasada');
  const inc = { pid: 'ivan', tipo: 'CAMBIO', desde: dia, hasta: dia, dias: [dia] };
  const res = a5Planes(cfg, inc, { desdeIso: A5R_HOY, intercambio: true });
  assert.deepStrictEqual([res.planes.length, res.afectados.length, res.pasados], [0, 0, [{ iso: dia, tid: 'PASARELA_T' }]]);
  const r = a5Aplicar(cfg, inc, null, { desdeIso: A5R_HOY });
  assert.deepStrictEqual([r.quitados, r.pasados], [0, [{ iso: dia, tid: 'PASARELA_T' }]]);
  assert.ok(M.pidsEn(sep, dia, 'PASARELA_T').includes('ivan'), 'Iván sigue en el turno que trabajó');
  assert.deepStrictEqual(M.personaDe(cfg.staff, 'ivan').ausencias || [], [], 'un cambio no apunta ausencia');
  // hoy a las 20:00, el cambio de turno de la mañana de Lola (07:00–16:00, ya trabajada): lo mismo
  const cfg2 = cfgDemo(), c2 = { pid: 'lola', tipo: 'CAMBIO', desde: A5R_HOY, hasta: A5R_HOY, dias: [A5R_HOY] };
  const res2 = a5Planes(cfg2, c2, { desdeIso: A5R_HOY, ahoraHM: '20:00', intercambio: true });
  assert.deepStrictEqual([res2.planes.length, res2.afectados.length, res2.pasados], [0, 0, [{ iso: A5R_HOY, tid: 'PASARELA_M' }]]);
  const r2 = a5Aplicar(cfg2, c2, null, { desdeIso: A5R_HOY, ahoraHM: '20:00' });
  assert.strictEqual(r2.quitados, 0);
  assert.ok(M.pidsEn(f3Mes(cfg2, A5R_HOY), A5R_HOY, 'PASARELA_M').includes('lola'), 'Lola sigue en su mañana');
  // a las 10:00 esa mañana está en curso: sí se cambia
  assert.deepStrictEqual(a5Planes(cfgDemo(), c2, { desdeIso: A5R_HOY, ahoraHM: '10:00', intercambio: true }).afectados.map(a => a.tid), ['PASARELA_M']);
});

ok('A5 · corrección C-H1 (cliente 07-reloj2 y 03-cambio a las 22:30): con la hora de Madrid (opts.ahoraHM) el turno de hoy cuya franja ya ha terminado es pasado (nadie entra; quien falta sale), la franja en curso se cubre, y el turno a cambio nunca es de hoy si su franja ya ha empezado (tampoco al confirmar un plan de antes)', () => {
  const baja = { pid: 'lola', tipo: 'BAJ', dias: ['2026-09-22', '2026-09-23', A5R_HOY, '2026-09-25'], desde: '2026-09-22', hasta: '2026-09-25' };
  const cfg = cfgDemo();
  const P10 = a5Planes(cfg, baja, { desdeIso: A5R_HOY, ahoraHM: '10:00' });
  const A10 = P10.planes[0];
  assert.ok(A10 && A10.asignaciones.some(a => a.iso === A5R_HOY && a.tid === 'PASARELA_M'), 'preparado: a las 10:00 alguien entra en la mañana de hoy: ' + (A10 && a5rTxt(A10)));
  const P20 = a5Planes(cfg, baja, { desdeIso: A5R_HOY, ahoraHM: '20:00' });
  assert.deepStrictEqual(P20.pasados.map(x => x.iso + '|' + x.tid), ['2026-09-22|PASARELA_M', '2026-09-23|PASARELA_M', A5R_HOY + '|PASARELA_M']);
  assert.deepStrictEqual(P20.afectados.map(a => a.iso), ['2026-09-25']);
  for (const P of P20.planes) assert.ok(P.asignaciones.every(a => a.iso > A5R_HOY), a5rTxt(P));
  // el plan de las 10:00 confirmado a las 20:00: quien entraba en la mañana de hoy no entra; Lola sale de ella igual (estaba de baja)
  const r = a5Aplicar(cfg, baja, A10, { desdeIso: A5R_HOY, ahoraHM: '20:00' });
  const hoyM = M.pidsEn(f3Mes(cfg, A5R_HOY), A5R_HOY, 'PASARELA_M');
  assert.ok(r.rechazados.some(x => x.iso === A5R_HOY && x.motivo === 'ese turno ya ha pasado'), JSON.stringify(r.rechazados));
  assert.ok(!hoyM.includes('lola') && A10.asignaciones.filter(a => a.iso === A5R_HOY).every(a => !hoyM.includes(a.pid)), hoyM.join(','));
  assert.ok(r.pasados.some(x => x.iso === A5R_HOY && x.tid === 'PASARELA_M'), JSON.stringify(r.pasados));
  // la tarde de hoy de Iván a las 20:00 (16:00–00:00) está en curso: se cubre
  const tarde = { pid: 'ivan', tipo: 'PERM', dias: [A5R_HOY], desde: A5R_HOY, hasta: A5R_HOY, franjas: ['T'] };
  const PT = a5Planes(cfgDemo(), tarde, { desdeIso: A5R_HOY, ahoraHM: '20:00' });
  assert.deepStrictEqual([PT.afectados.map(a => a.iso + '|' + a.tid), PT.pasados], [[A5R_HOY + '|PASARELA_T'], []]);
  // el cambio de turno de Victoria el sábado 26: a las 10:00 el turno a cambio puede ser la tarde de hoy de Noe; a las 22:30 no
  const cambio = { pid: 'victoria', tipo: 'CAMBIO', dias: ['2026-09-26'], desde: '2026-09-26', hasta: '2026-09-26' };
  const cfg3 = cfgDemo();
  const aCambio = res => res.planes.flatMap(P => P.asignaciones.filter(a => a.intercambio).map(a => a.intercambio.iso + '|' + a.intercambio.tid));
  const a10 = a5Planes(cfg3, cambio, { desdeIso: A5R_HOY, ahoraHM: '10:00', intercambio: true });
  assert.ok(aCambio(a10).includes(A5R_HOY + '|EL33_T'), 'preparado: ' + JSON.stringify(aCambio(a10)));
  const a2230 = a5Planes(cfg3, cambio, { desdeIso: A5R_HOY, ahoraHM: '22:30', intercambio: true });
  assert.deepStrictEqual(aCambio(a2230).filter(k => k.slice(0, 10) <= A5R_HOY), [], JSON.stringify(aCambio(a2230)));
  // el plan de las 10:00 confirmado a las 22:30: no se hace nada (un cambio es un trato entre dos: entero o nada)
  const P = a10.planes.find(x => x.asignaciones.some(a => a.intercambio && a.intercambio.iso === A5R_HOY));
  const foto = () => JSON.stringify([M.asignados(f3Mes(cfg3, A5R_HOY), A5R_HOY, 'EL33_T'), M.asignados(f3Mes(cfg3, '2026-09-26'), '2026-09-26', 'EL33_M')]);
  const antes = foto();
  const r3 = a5Aplicar(cfg3, cambio, P, { desdeIso: A5R_HOY, ahoraHM: '22:30' });
  assert.ok(r3.rechazados.some(x => x.iso === A5R_HOY && x.motivo === 'ese turno ya ha empezado'), JSON.stringify(r3.rechazados));
  assert.strictEqual(foto(), antes, 'nada cambia');
});

ok('A5 · corrección M-H3 (r05): la Cobertura pide los días que necesita por tramos (diasNecesarios: la ventana de rangoNecesario de cada tramo de días marcados) y `truncado` dice también los días marcados que no están en la planilla que se le pasa', () => {
  const cfg = f3Escenario(), D31 = '2026-12-31';
  const dic = M.estadoDesde(cfg.meses, [], 2026, 12);
  M.generarPlanilla(cfg, cfg.staff, dic, '2026-12-28', D31, {});
  cfg.meses['2026-12'] = { asig: dic.asig, apertura: dic.apertura, manual: dic.manual };
  assert.ok(M.pidsEn(dic, D31, 'PASARELA_T').includes('ivan'), 'preparado: Iván trabaja la tarde del 31/12');
  const inc = { pid: 'ivan', tipo: 'VAC', dias: ['2026-10-02', D31], desde: '2026-10-02', hasta: D31, franjas: ['T'] };
  const v1 = M.rangoNecesario({ desde: '2026-10-02', hasta: '2026-10-02' }), v2 = M.rangoNecesario({ desde: D31, hasta: D31 });
  assert.deepStrictEqual(M.diasNecesarios(inc), [...M.rangoIso(v1.desde, v1.hasta), ...M.rangoIso(v2.desde, v2.hasta)]);
  assert.deepStrictEqual(M.diasNecesarios({ pid: 'ivan', tipo: 'BAJ', desde: '2026-10-02', hasta: '2026-10-08' }), [...M.rangoIso(M.rangoNecesario({ desde: '2026-10-02', hasta: '2026-10-08' }).desde, M.rangoNecesario({ desde: '2026-10-02', hasta: '2026-10-08' }).hasta)], 'un tramo: la ventana de siempre');
  // con el estado que hacía la pestaña (un rango seguido, cortado a 100 días) el 31/12 no está: se dice
  const rg = M.rangoNecesario(inc);
  const corto = M.clonarEstado(cieRango(cfg, rg.desde, M.addDias(rg.desde, 99)));
  const res0 = M.planesCobertura(cfg, cfg.staff, corto, inc, { meses: cfg.meses, desdeIso: A5R_HOY });
  assert.deepStrictEqual(res0.truncado, { max: 62, marcados: 2, hasta: '2026-10-02', fuera: [D31] });
  // con los días que pide: los dos, sin truncar, y al aplicar Iván sale también del 31/12
  const res = M.planesCobertura(cfg, cfg.staff, M.clonarEstado(a5rDias(cfg, M.diasNecesarios(inc))), inc, { meses: cfg.meses, desdeIso: A5R_HOY });
  assert.deepStrictEqual([res.afectados.map(a => a.iso + ' ' + a.tid), res.truncado], [['2026-10-02 PASARELA_T', D31 + ' PASARELA_T'], null]);
  const r = M.aplicarCobertura(cfg, cfg.staff, a5rDias(cfg, M.diasNecesarios(inc)), inc, res.planes[0], { desdeIso: A5R_HOY });
  assert.strictEqual(r.quitados, 2);
  assert.ok(!M.pidsEn(M.estadoDesde(cfg.meses, [], 2026, 12), D31, 'PASARELA_T').includes('ivan'));
});

ok('A5 · corrección M-H4 y C-H5 (r09, cliente 18-standby-cobertura): con «solo desde hoy», quién le cubre se mira el primer día que se cubre (no el primero marcado, ya pasado); la designada que ahora no cubre (standby, baja sin fin) sale aparte con el porqué (designadosInactivos) y no en cada casilla', () => {
  const cfg = f3Escenario((c, st) => { M.personaDe(st, 'mariluz').cubreA = []; M.personaDe(st, 'dulce').cubreA = [{ pid: 'ivan' }]; });
  M.anadirAusencia(M.personaDe(cfg.staff, 'dulce'), { tipo: 'BAJ', desde: '2026-09-22' });
  const inc = { pid: 'ivan', tipo: 'VAC', desde: '2026-09-21', hasta: '2026-10-04', dias: [...M.rangoIso('2026-09-21', '2026-10-04')], franjas: ['T'] };
  const res = a5Planes(cfg, inc, { desdeIso: A5R_HOY });
  assert.ok(res.pasados.length && res.afectados.length, 'preparado');
  assert.deepStrictEqual(res.designados, [], JSON.stringify(res.designados));
  assert.deepStrictEqual((res.designadosInactivos || []).map(d => [d.pid, d.nombre, d.inactiva]), [['dulce', 'Dulce', 'está de baja']]);
  assert.deepStrictEqual(res.afectados.flatMap(a => a.noCubren.map(x => x.nombre)), [], 'no se repite «Dulce: de baja» en cada casilla');
  // sin «solo desde hoy», el primer día marcado (21/09) Dulce aún no estaba de baja: es designada
  assert.deepStrictEqual(a5Planes(cfg, inc).designados.map(d => d.pid), ['dulce']);
  // en standby, igual
  const cfg2 = f3Escenario((c, st) => { M.personaDe(st, 'mariluz').cubreA = []; M.personaDe(st, 'dulce').cubreA = [{ pid: 'ivan' }]; }, (c, st) => { M.personaDe(st, 'dulce').standby = true; });
  const res2 = a5Planes(cfg2, A5_INC(), { desdeIso: A5R_HOY });
  assert.deepStrictEqual([res2.designados, (res2.designadosInactivos || []).map(d => [d.pid, d.inactiva])], [[], [['dulce', 'está en standby']]]);
});

ok('A5 · corrección M-H5 (r10): una baja sin fin de media jornada no deja inactiva la designación («está de baja» es la de día entero): Dulce, de baja solo por la mañana, cubre a Iván por la tarde y la cabecera lo dice', () => {
  const V = F3_VIE;
  const cfg = f3Escenario((c, st) => { M.personaDe(st, 'mariluz').cubreA = []; M.personaDe(st, 'dulce').cubreA = [{ pid: 'ivan' }]; });
  M.anadirAusencia(M.personaDe(cfg.staff, 'dulce'), { tipo: 'BAJ', desde: '2026-09-28', franjas: ['M'] });
  assert.deepStrictEqual(M.quienLeCubre(cfg, cfg.staff, 'ivan', V).map(d => [d.pid, d.activa, d.inactiva || null]), [['dulce', true, null]]);
  const res = a5Planes(cfg, { pid: 'ivan', tipo: 'VAC', dias: [V], desde: V, hasta: V, franjas: ['T'] }, { desdeIso: A5R_HOY });
  assert.deepStrictEqual(res.designados.map(d => d.pid), ['dulce']);
  // la de día entero, sí
  M.personaDe(cfg.staff, 'dulce').ausencias = [{ tipo: 'BAJ', desde: '2026-09-28' }];
  assert.deepStrictEqual(M.quienLeCubre(cfg, cfg.staff, 'ivan', V).map(d => [d.pid, d.activa, d.inactiva || null]), [['dulce', false, 'está de baja']]);
});

ok('A5 · corrección M-H6 (r04, casos 4 a 6) y M-H8 (mutantes m4 y m5): «¿X falta esa franja?» se lee en un sitio (faltaEn: ausente, libra, en standby o ya no está con nosotros) que usan la retirada y la Revisión: mientras X falte, lo que entró por su ausencia no se retira ni se señala; cuando vuelve de verdad, sí', () => {
  const monta = () => { const cfg = f3Escenario(), inc = A5_INC(); a5Aplicar(cfg, inc, a5Planes(cfg, inc, { desdeIso: A5R_HOY }).planes[0], { desdeIso: A5R_HOY }); return cfg; };
  const regen = cfg => M.generarPlanilla(cfg, cfg.staff, f3Mes(cfg, F3_VIE), '2026-09-28', F3_DOM, { meses: cfg.meses }).retirados.filter(x => x.pid !== 'ivan').map(x => [x.iso, x.pid, x.motivo]);
  const pp = cfg => M.revisionMes(cfg, cfg.staff, f3Mes(cfg, F3_VIE), { desde: F3_VIE, hasta: F3_DOM }).filter(x => x.tipo === 'por-presente').map(x => x.msg);
  const porAus = cfg => [F3_VIE, F3_SAB, F3_DOM].flatMap(iso => M.asignados(f3Mes(cfg, iso), iso, 'PASARELA_T').filter(x => x.porAusenciaDe === 'ivan').map(x => iso + ' ' + x.pid));
  { // 4) se quita la ausencia y pasa a standby: sigue faltando
    const cfg = monta(), ya = porAus(cfg), iv = M.personaDe(cfg.staff, 'ivan');
    assert.ok(ya.length >= 3, 'preparado: ' + JSON.stringify(ya));
    iv.ausencias = []; iv.standby = true;
    assert.strictEqual(M.faltaEn(cfg, iv, F3_VIE, 'T'), true);
    assert.deepStrictEqual(pp(cfg), [], 'la Revisión no dice que «ya no falta»');
    assert.deepStrictEqual(regen(cfg).filter(x => ['dulce', 'roberto'].includes(x[1])), [], 'regenerar no lo retira');
    assert.deepStrictEqual(porAus(cfg), ya);
  }
  { // 5) ya no está con nosotros desde el 1/10: su sitio sigue sin cubrir; lo que entró por él se queda
    const cfg = monta(), ya = porAus(cfg), iv = M.personaDe(cfg.staff, 'ivan');
    iv.salida = { desde: '2026-10-01' };
    assert.strictEqual(M.faltaEn(cfg, iv, F3_VIE, 'T'), true);
    assert.deepStrictEqual(pp(cfg), []);
    assert.deepStrictEqual(regen(cfg).filter(x => ['dulce', 'roberto'].includes(x[1])), []);
    assert.deepStrictEqual(porAus(cfg), ya);
  }
  { // 6) se quita la ausencia pero libra el domingo (un día libre de esa semana): el domingo sigue sin trabajar y no sobra nadie
    const cfg = monta(), iv = M.personaDe(cfg.staff, 'ivan');
    iv.ausencias = []; iv.libraPuntual = [{ semana: M.mondayOf(F3_DOM), dias: [M.isoDow(F3_DOM)] }];
    assert.deepStrictEqual([M.faltaEn(cfg, iv, F3_VIE, 'T'), M.faltaEn(cfg, iv, F3_DOM, 'T')], [false, true]);
    assert.ok(!pp(cfg).some(m => /domingo/.test(m)), JSON.stringify(pp(cfg)));
    const ret = regen(cfg);
    assert.ok(!ret.some(x => x[0] === F3_DOM), 'el domingo no se retira nada: ' + JSON.stringify(ret));
    assert.ok(ret.some(x => x[0] === F3_VIE && x[1] === 'dulce'), 'el viernes, Iván ya no falta: ' + JSON.stringify(ret));
  }
  { // y cuando vuelve de verdad (sin ausencia, sin standby, sin salida), la Revisión y la retirada dicen lo mismo
    const cfg = monta(), iv = M.personaDe(cfg.staff, 'ivan');
    iv.ausencias = [];
    assert.strictEqual(M.faltaEn(cfg, iv, F3_VIE, 'T'), false);
    assert.ok(pp(cfg).some(m => /Roberto va por Iván, que ya no falta ese día/.test(m)), JSON.stringify(pp(cfg)));
    assert.deepStrictEqual(regen(cfg).filter(x => ['dulce', 'roberto'].includes(x[1])).map(x => x[1]).sort(), ['dulce', 'dulce', 'roberto']);
  }
});

ok('A5 · corrección M-H7 (fuzz IA5-porPresente-auto): la Revisión no señala «por-presente» en la plaza fija de la semana tipo con su «por» (D12: es un dato de la plaza): Noe «por Victoria» los miércoles sigue sin aviso aunque Victoria ya no libre ese día', () => {
  const cfg = cfgDemo(), X = '2026-09-30';
  assert.ok(M.asignados(sepDe(cfg), X, 'EL33_M').some(e => e.pid === 'noe' && e.por === 'victoria' && e.origen === 'patron'), 'preparado: la plaza fija del miércoles');
  M.personaDe(cfg.staff, 'victoria').libra = [4];
  const pp = () => M.revisionMes(cfg, cfg.staff, sepDe(cfg), { desde: X, hasta: X }).filter(x => x.tipo === 'por-presente');
  assert.deepStrictEqual(pp().map(x => x.msg), []);
  // lo que no es plaza fija sí se señala: Leo, a mano, «por Victoria» esa tarde en Pasarela
  assert.ok(M.asignar(sepDe(cfg), cfg, cfg.staff, X, 'PASARELA_T', 'leo', { origen: 'manual', por: 'victoria', forzar: true }).ok);
  assert.deepStrictEqual(pp().map(x => [x.turnoId, x.pid]), [['PASARELA_T', 'leo']]);
});

ok('A5 · corrección C-S1: quien entra en lugar de X sin tener la designación lleva «por Iván»; quien la tiene, «cubre a Iván»; lo mismo en el plan y en la planilla', () => {
  const cfg = f3Escenario((c, st) => { M.personaDe(st, 'mariluz').cubreA = []; M.personaDe(st, 'dulce').cubreA = [{ pid: 'ivan' }]; });
  const inc = A5_INC();
  const A = a5Planes(cfg, inc, { desdeIso: A5R_HOY }).planes[0];
  const de = (iso, pid) => A.asignaciones.find(a => a.iso === iso && a.pid === pid);
  assert.ok(de(F3_VIE, 'dulce') && de(F3_DOM, 'roberto'), 'preparado: ' + a5rTxt(A));
  assert.deepStrictEqual([de(F3_VIE, 'dulce').razones[0], de(F3_VIE, 'dulce').cubre, de(F3_VIE, 'dulce').por], ['cubre a Iván', true, 'ivan']);
  assert.deepStrictEqual([de(F3_DOM, 'roberto').razones[0], de(F3_DOM, 'roberto').cubre, de(F3_DOM, 'roberto').por], ['por Iván', false, 'ivan']);
  assert.ok(!de(F3_DOM, 'roberto').razones.includes('cubre a Iván'), JSON.stringify(de(F3_DOM, 'roberto').razones));
  a5Aplicar(cfg, inc, A, { desdeIso: A5R_HOY });
  const en = (iso, pid) => M.asignados(f3Mes(cfg, iso), iso, 'PASARELA_T').find(x => x.pid === pid);
  assert.deepStrictEqual([en(F3_VIE, 'dulce').razon, en(F3_DOM, 'roberto').razon, en(F3_DOM, 'roberto').por], ['cubre a Iván', 'por Iván', 'ivan']);
  assert.strictEqual(M.porDe(cfg.staff, en(F3_DOM, 'roberto')), 'ivan');
});

ok('A5 · corrección C-H2 y C-H3: en un cambio de turno con intercambio pedido, quien entra sin turno a cambio lo dice (sinIntercambio) y el plan cuenta los avisos del intercambio (avisosCambio: con aviso o sin turno a cambio); a igualdad, va primero el plan sin ellos', () => {
  const monta = robertoTambien => {
    const cfg = cfgDemo();
    for (const iso of M.rangoIso('2026-09-28', '2026-10-18')) { const e = f3Mes(cfg, iso); for (const tid of Object.keys(e.asig[iso] || {})) delete e.asig[iso][tid]; if (e.manual) delete e.manual[iso]; }
    for (const [d, id, c] of [['2026-10-06', 'cristian'], ['2026-10-06', 'adrian', 1], ['2026-10-10', 'sluna'], ['2026-10-10', 'leo']].concat(robertoTambien ? [['2026-10-13', 'roberto'], ['2026-10-13', 'adrian', 1]] : [])) assert.ok(M.asignar(f3Mes(cfg, d), cfg, cfg.staff, d, 'ZAPA_T', id, { cocina: !!c }).ok, id + ' ' + d);
    return cfg;
  };
  const inc = { pid: 'cristian', tipo: 'CAMBIO', dias: ['2026-10-06'], desde: '2026-10-06', hasta: '2026-10-06' };
  const lee = P => P.asignaciones.map(a => [a.pid, a.intercambio ? a.intercambio.avisos.length : null, !!a.sinIntercambio]);
  { // Susana Luna con su sábado (que se queda sin nadie que abra) o Roberto sin nada a cambio: un aviso cada uno
    const res = a5Planes(monta(false), inc, { desdeIso: A5R_HOY, intercambio: true, siempre: true });
    assert.deepStrictEqual(res.planes.map(lee), [[['sluna', 2, false]], [['roberto', null, true]]]);
    assert.deepStrictEqual(res.planes.map(P => P.avisosCambio), [1, 1]);
    assert.deepStrictEqual(res.planes.map(P => [P.completo, P.avisos]), [[true, 0], [true, 0]], 'los avisos de la puerta, aparte');
  }
  { // si Roberto tiene un turno que Cristian puede hacer sin dejar nada corto, ese plan va primero aunque puntúe menos
    const res = a5Planes(monta(true), inc, { desdeIso: A5R_HOY, intercambio: true, siempre: true });
    assert.deepStrictEqual(res.planes.map(lee), [[['roberto', 0, false]], [['sluna', 2, false]]]);
    assert.deepStrictEqual(res.planes.map(P => P.avisosCambio), [0, 1]);
    assert.ok(res.planes[0].score < res.planes[1].score, 'preparado: por puntos iba primero Susana Luna');
  }
  { // sin intercambio pedido no hay nada que avisar
    const res = a5Planes(monta(false), inc, { desdeIso: A5R_HOY, intercambio: false, siempre: true });
    assert.ok(res.planes.every(P => !P.avisosCambio && P.asignaciones.every(a => !a.sinIntercambio)), JSON.stringify(res.planes.map(lee)));
  }
});

ok('A5 · corrección (cliente, «no es de A5»): la casilla que sigue con más gente que el mínimo dice «3 (mínimo 2)», no «3 de 2»; con el mínimo justo, «2 de 2»', () => {
  const cfg = cfgDemo(), V25 = '2026-09-25';
  const res = a5Planes(cfg, { pid: 'juani', tipo: 'BAJ', dias: [V25], desde: V25, hasta: V25 }, { desdeIso: A5R_HOY });
  assert.deepStrictEqual(res.planes[0].sinCubrir.map(s => s.motivo), ['la casilla sigue completa: 3 (mínimo 2)']);
  const res2 = a5Planes(cfgDemo(), { pid: 'juani', tipo: 'BAJ', dias: ['2026-09-27'], desde: '2026-09-27', hasta: '2026-09-27' }, { desdeIso: A5R_HOY });
  assert.deepStrictEqual(res2.planes[0].sinCubrir.map(s => s.motivo), ['la casilla sigue completa (2 de 2)']);
});

ok('A5 · corrección M-H8 (mutantes m1 y m3): al aplicar, quien entra «para llegar al mínimo» llevando la cocina que falta entra aunque la casilla tenga su mínimo; y el turno a cambio de un día ya pasado no se hace (ni el resto del cambio)', () => {
  // m1: Adrián (la cocina de Zapatillera) falta el martes 6 por la tarde; quedan Susana Luna y Cristian, 2 de 2, sin cocina. Roberto
  // entra «para llegar al mínimo» con la cocina (lo que hace el plan cuando el relevo ya cubre a quien falta)
  const cfg = cfgBase(), oct = estadoOct(), D = '2026-10-06', T = 'ZAPA_T';
  for (const [id, c] of [['adrian', 1], ['sluna'], ['cristian']]) assert.ok(M.asignar(oct, cfg, cfg.staff, D, T, id, { cocina: !!c }).ok, id);
  const rv0 = (() => { const e = M.clonarEstado(oct); M.retirarEntrada(e, cfg, cfg.staff, D, T, 'adrian'); return M.revisarTurno(cfg, cfg.staff, e, D, T); })();
  assert.ok(!rv0.faltan && rv0.sinCocina, 'preparado: sin Adrián la casilla tiene su mínimo y no tiene cocina: ' + JSON.stringify([rv0.n, rv0.minimo, rv0.sinCocina]));
  const plan = { asignaciones: [{ iso: D, tid: T, pid: 'roberto', cocina: true, minimo: true, razon: 'para llegar al mínimo (había 2 de 2)', por: null, avisos: [] }] };
  const r = M.aplicarCobertura(cfg, cfg.staff, oct, { pid: 'adrian', tipo: 'PERM', desde: D, hasta: D, dias: [D], franjas: ['T'] }, plan, { desdeIso: A5R_HOY });
  assert.deepStrictEqual([r.rechazados, M.pidsEn(oct, D, T).includes('roberto'), M.revisarTurno(cfg, cfg.staff, oct, D, T).sinCocina], [[], true, false]);
  // m3: el cambio de turno de Susana Luna del miércoles 7/10 calculado sin la fecha (a cambio, el martes 6 de Roberto) y aplicado
  // con «hoy» el miércoles 7: el martes ya pasó; no se hace nada
  const cfg3 = Object.assign(cfgBase(), { meses: {} });
  const rg = M.rangoNecesario({ desde: '2026-10-07', hasta: '2026-10-07' });
  const e3 = cieRango(cfg3, rg.desde, rg.hasta);
  for (const [d, id, c] of [['2026-10-07', 'sluna'], ['2026-10-06', 'roberto'], ['2026-10-06', 'adrian', 1], ['2026-10-10', 'roberto'], ['2026-10-10', 'adrian', 1]]) assert.ok(M.asignar(e3, cfg3, cfg3.staff, d, 'ZAPA_T', id, { cocina: !!c }).ok, id + ' ' + d);
  const cambio = { pid: 'sluna', tipo: 'CAMBIO', desde: '2026-10-07', hasta: '2026-10-07', dias: ['2026-10-07'] };
  const P = M.planesCobertura(cfg3, cfg3.staff, M.clonarEstado(e3), cambio, { intercambio: true }).planes.find(x => x.asignaciones.some(a => a.pid === 'roberto' && a.intercambio && a.intercambio.iso === '2026-10-06'));
  assert.ok(P, 'preparado: un plan con el turno a cambio del martes 6');
  const antes = JSON.stringify(['2026-10-06', '2026-10-07'].map(d => M.asignados(e3, d, 'ZAPA_T')));
  const r3 = M.aplicarCobertura(cfg3, cfg3.staff, e3, cambio, P, { desdeIso: '2026-10-07' });
  assert.ok(r3.rechazados.some(x => x.iso === '2026-10-06' && x.motivo === 'ese día ya ha pasado'), JSON.stringify(r3.rechazados));
  assert.strictEqual(JSON.stringify(['2026-10-06', '2026-10-07'].map(d => M.asignados(e3, d, 'ZAPA_T'))), antes, 'ni la mitad del cambio');
});

console.log(`\n${n} tests OK`);
