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
  assert.deepEqual(cas.map(x => [x.pid, x.por, x.razon]), [['mariluz', 'ivan', 'cubre a Iván'], ['dulce', 'ivan', 'cubre a Iván']]);
  assert.ok(!/porDesignacion/.test(JSON.stringify(e.meses)), 'la marca no viaja');
  assert.equal(e.staff.find(p => p.id === 'mariluz').cubreA, undefined, 'ni las designaciones de los compañeros');
  // no se toca el estado del servidor: el encargado la sigue teniendo
  assert.equal(src.meses['2026-10'].asig['2026-10-02'].PASARELA_T[1].porDesignacion, true);
});
