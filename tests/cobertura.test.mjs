// El gestor de cobertura del administrador existe como pestaña, la navegación lo
// conoce, el móvil lo lista en «Más», el empleado no lo ve, y Semana y Mes llevan
// el botón de vaciar respetando las ausencias.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(RAIZ, 'index.html'), 'utf8');

test('hay una pestaña Cobertura con su sección y su raíz', () => {
  assert.match(html, /class="tab" role="tab" data-v="cobertura"/);
  assert.match(html, /<section class="view hidden" id="view-cobertura">/);
  assert.match(html, /id="cobRoot"/);
});
test('la sección propone plan A y plan B y aplica con deshacer', () => {
  const fn = html.slice(html.indexOf('function renderCobertura()'), html.indexOf('function aplicarPlanCobertura('));
  assert.match(fn, /Proponer plan A y plan B/);
  assert.match(fn, /TIPOS_INCIDENCIA/);
  assert.match(fn, /planesCobertura\(/);
  assert.match(html, /function aplicarPlanCobertura\(id\)[\s\S]*aplicarCobertura\(S, S\.staff, real, inc, plan\)/);
  assert.match(html, /pushUndo\(`cobertura de \$\{nombre\}`, \{ staff: true, otrosMeses: true \}\)/);
});
test('la navegación conoce la vista, el móvil la lista en «Más» y el historial tiene su tipo', () => {
  assert.match(html, /const VISTAS = \[[^\]]*'cobertura'/);
  assert.match(html, /const BNAV_EN_MAS = \[[^\]]*'cobertura'/);
  assert.match(html, /fila\('cobertura', /);
  assert.match(html, /cobertura: \[\S+, 'COBERTURA'\]/);
});
test('el empleado no la ve', () => {
  assert.match(html, /\.modo-empleado #view-cobertura\{display:none!important\}/);
});
test('Semana y Mes tienen el botón de vaciar, que respeta las ausencias', () => {
  assert.match(html, /id="wVaciar"/);
  assert.match(html, /id="mVaciar"/);
  assert.match(html, /function vaciarRangoUI\([\s\S]*vaciarPlanilla\(/);
  assert.match(html, /ausencias respetadas/);
});
test('el aviso del partido se puede quitar desde el chip o el ⚽ de Semana y Mes', () => {
  assert.match(html, /function openEventosDia\(iso, anchor\)/);
  assert.match(html, /class="evchip"[^>]*data-evpop=/);
  assert.match(html, /class="evb" role="button" tabindex="0" data-evpop=/);
  assert.match(html, /class="evd" role="button" tabindex="0" data-evpop=/);
});
