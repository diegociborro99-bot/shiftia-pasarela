// Cierre puntual de un local por fechas (24/09, reunión con Diego y su mensaje posterior; D11).
// «creo que no tiene un botón de cerrar, de cerrar bares por vacaciones» / «que te salga un visor
// y te ponga apoyos o vacaciones o sin trabajo». Aquí, lo que no es el modelo: lo que viaja al
// empleado (solo su decisión, nunca las de los compañeros ni las plazas retiradas), y que la app
// trae el visor, sus accesos, el aviso de «Cuándo abre» y la clave nueva en el estado, la huella,
// la migración y el deshacer.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { estadoParaEmpleado } = require(join(RAIZ, 'estado-servidor.js'));
const html = readFileSync(join(RAIZ, 'index.html'), 'utf8');
const fuente = f => readFileSync(join(RAIZ, 'src', 'app', f), 'utf8');

const CIERRE = {
  id: 'cie_1', localId: 'MONACO', dias: { '2026-09-27': ['T'], '2026-09-28': ['M', 'T'], '2026-09-29': ['M', 'T'] },
  motivo: 'reforma', detalle: 'pequeña reforma', ts: 1, usuario: 'oficina',
  decisiones: { cristian: { tipo: 'SIN', turnos: ['2026-09-29|T'] }, scapon: { tipo: 'VAC', turnos: ['2026-09-29|T'], dias: ['2026-09-29'] }, yilian: { tipo: 'REFUERZA', destinos: { '2026-09-28': 'PASARELA_T' }, turnos: ['2026-09-28|T'] } },
  retirados: [{ iso: '2026-09-29', tid: 'MONACO_T', entry: { pid: 'scapon', origen: 'patron' } }, { iso: '2026-09-29', tid: 'MONACO_T', entry: { pid: 'cristian', origen: 'patron' } }],
};
const estado = () => ({ staff: [{ id: 'cristian', nombre: 'Cristian' }, { id: 'scapon', nombre: 'Susana Capón' }, { id: 'yilian', nombre: 'Yilian' }, { id: 'lola', nombre: 'Lola' }], meses: {}, cierresPuntuales: [JSON.parse(JSON.stringify(CIERRE))] });

test('el empleado recibe el cierre (local, días, motivo) y SOLO su decisión: ni las de los compañeros ni las plazas retiradas', () => {
  const e = estadoParaEmpleado(estado(), 'cristian', '2026-09');
  assert.equal(e.cierresPuntuales.length, 1);
  const c = e.cierresPuntuales[0];
  assert.deepEqual({ id: c.id, localId: c.localId, dias: c.dias, motivo: c.motivo, detalle: c.detalle }, { id: 'cie_1', localId: 'MONACO', dias: CIERRE.dias, motivo: 'reforma', detalle: 'pequeña reforma' });
  assert.deepEqual(c.decisiones, { cristian: CIERRE.decisiones.cristian }, 'solo la suya');
  assert.equal(c.retirados, undefined, 'las plazas retiradas son de otros');
  assert.ok(!/scapon|yilian|VAC|REFUERZA/.test(JSON.stringify(e.cierresPuntuales)), 'ni rastro de lo que hacen los compañeros');
  const lola = estadoParaEmpleado(estado(), 'lola', '2026-09');
  assert.deepEqual(lola.cierresPuntuales[0].decisiones, {}, 'quien no está afectada ve el cierre y ninguna decisión');
  assert.deepEqual(estadoParaEmpleado({ staff: [] }, 'lola', '2026-09').cierresPuntuales, [], 'sin cierres, lista vacía');
  // revisión F2 (24/09): tampoco los días «de semana tipo» ni de dónde salió el cierre. Sin
  // deSemanaTipo, en su vista nadie sale «sin trabajo» por la semana tipo de la semilla (la real no le llega)
  const est2 = estado(); Object.assign(est2.cierresPuntuales[0], { deSemanaTipo: ['2026-09-27'], origen: { abre: { franja: 'T', dow: 7 } } });
  const c2 = estadoParaEmpleado(est2, 'cristian', '2026-09').cierresPuntuales[0];
  assert.equal(c2.deSemanaTipo, undefined);
  assert.equal(c2.origen, undefined);
});

test('el visor existe en su fichero, va detrás del selector, y tiene los tres pasos y las cuatro decisiones', () => {
  const orden = JSON.parse(fuente('_orden.json'));
  assert.equal(orden.indexOf('12-cierre-local.js'), orden.indexOf('11-selector.js') + 1);
  assert.match(html, /function openCierre\(/);
  const v = fuente('12-cierre-local.js');
  for (const x of ['Quién trabajaba esos días', 'donde haga falta', 'Todo el día', 'Abierto']) assert.ok(v.includes(x), x);
  // los motivos y las decisiones se leen del modelo (una sola lista), que va embebido en index.html
  assert.match(v, /MOTIVOS_CIERRE\.map/);
  assert.match(v, /DECISIONES_CIERRE\.map/);
  for (const x of ["label: 'Reforma'", "label: 'Vacaciones del local'", "label: 'Otro'", "label: 'Apoyo'", "label: 'Sin trabajo'", "label: 'Día libre'", "label: 'Vacaciones'"]) assert.ok(html.includes(x), x);
  assert.match(v, /aplicarCierre\(S, S\.staff/);
  assert.match(v, /quitarCierre\(S, S\.staff/);
  assert.match(v, /confirmarSiCerrado\(/);
  assert.match(v, /pushUndo\([^)]*cierres: true/);
  assert.match(v, /registrarCambio\(/);
});

test('accesos: Ajustes de los locales («Cierres por fechas» y el aviso de «Cuándo abre»), Hoy y el menú de la casilla', () => {
  const eq = fuente('19-vista-equipo.js');
  assert.match(eq, /CIERRES POR FECHAS/);
  assert.match(eq, /＋ Cerrar unos días/);
  assert.match(eq, /Esto cierra TODOS/);
  assert.match(eq, /Cierre por fechas/);
  assert.match(fuente('10-vista-hoy.js'), /Cerrar unos días/);
  assert.match(fuente('10-vista-hoy.js'), /Ver cierre/);
  assert.match(fuente('11-selector.js'), /Cerrar esta franja…/);
});

test('la clave nueva viaja en todo el estado: migración, huella, deshacer', () => {
  const est = fuente('02-estado-y-modelo-datos.js');
  assert.match(est, /estado\.cierresPuntuales = \[\]/);
  assert.match(est, /const huellaPlanilla = e => JSON\.stringify\(\[[^\n]*e\.cierresPuntuales/);
  assert.match(est, /extra\.cierres\) u\.cierresPuntuales =/);
  assert.match(est, /if \(u\.cierresPuntuales\) S\.cierresPuntuales = u\.cierresPuntuales/);
});
