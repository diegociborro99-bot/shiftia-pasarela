// La sección «Entrevistas» del administrador existe, es visible como pestaña y
// está marcada «en construcción» hasta que se importe su base de datos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(RAIZ, 'index.html'), 'utf8');

test('hay una pestaña Entrevistas en el menú del administrador', () => {
  assert.match(html, /class="tab" role="tab" data-v="entrevistas"/);
  assert.match(html, /<section class="view hidden" id="view-entrevistas">/);
});
test('la sección dice que está en construcción y qué llegará', () => {
  const sec = html.slice(html.indexOf('id="view-entrevistas"'), html.indexOf('</section>', html.indexOf('id="view-entrevistas"')));
  assert.match(sec, /EN CONSTRUCCIÓN/);
  const fn = html.slice(html.indexOf('function renderEntrevistas()'), html.indexOf('\n}', html.indexOf('function renderEntrevistas()')));
  assert.match(fn, /en construcción/i);
  assert.match(fn, /base de datos/i);
});
test('la navegación conoce la vista y el móvil la lista en «Más»', () => {
  assert.match(html, /const VISTAS = \[[^\]]*'entrevistas'/);
  assert.match(html, /const BNAV_EN_MAS = \[[^\]]*'entrevistas'/);
  assert.match(html, /fila\('entrevistas', /);
});
test('el empleado no la ve', () => {
  assert.match(html, /\.modo-empleado #view-entrevistas\{display:none!important\}/);
});
