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
test('la sección son dos menús: entrevistas y alerta interna, con la base ya dentro', () => {
  const sec = html.slice(html.indexOf('id="view-entrevistas"'), html.indexOf('</section>', html.indexOf('id="view-entrevistas"')));
  assert.ok(!/EN CONSTRUCCIÓN/.test(sec), 'ya no está en construcción');
  assert.match(sec, /Entrevistas<\/b> y alerta interna/);
  assert.match(html, /const LISTAS_CAND = \[\s*\{ id: 'ent'/);
  assert.match(html, /const ENTREVISTAS_SEMILLA = \[/);
  assert.match(html, /data-entlista="\$\{l\.id\}"/);
});
test('los filtros combinan puesto y valoración, y el buscador va por nombre o teléfono', () => {
  assert.match(html, /const VALORACIONES = \[\s*\{ id: 'bien'[\s\S]*?\{ id: 'regular'[\s\S]*?\{ id: 'mal'/);
  assert.match(html, /function filtrarCandidatos\(cands, f\)/);
  assert.match(html, /placeholder="Buscar por nombre o teléfono…"/);
  assert.match(html, /const MOTIVOS_ALERTA = \[[\s\S]*?NOACUDE[\s\S]*?PROBLEMA/);
  assert.match(html, /function abrirFichaCand\(id\)/);
});
test('la navegación conoce la vista y el móvil la lista en «Más»', () => {
  assert.match(html, /const VISTAS = \[[^\]]*'entrevistas'/);
  assert.match(html, /const BNAV_EN_MAS = \[[^\]]*'entrevistas'/);
  assert.match(html, /fila\('entrevistas', /);
});
test('el empleado no la ve', () => {
  assert.match(html, /\.modo-empleado #view-entrevistas\{display:none!important\}/);
});
test('las etiquetas llevan los mismos iconos que el grupo usa en su base: sartén, bandeja, pulgares y reloj', () => {
  for (const k of ['SVG_CAMARERO', 'SVG_BIEN', 'SVG_MAL', 'SVG_ESPERA'])
    assert.match(html, new RegExp('const ' + k + ' = ICO\\('), k + ' definido');
  assert.match(html, /const PUESTOS_CAND = \[\s*\{ id: 'cocina'[^}]*ico: 'cocina'[\s\S]*?\{ id: 'sala'[^}]*ico: 'camarero'/);
  assert.match(html, /\{ id: 'bien'[^}]*ico: 'bien' \}/);
  assert.match(html, /\{ id: 'regular'[^}]*ico: 'espera' \}/, 'el reloj de arena es «en espera»');
  assert.match(html, /\{ id: 'mal'[^}]*ico: 'mal' \}/);
  assert.match(html, /const ICO_CAND = \{ cocina: [\s\S]*?espera: \(\) => SVG_ESPERA \}/);
  // y salen tanto en la lista como en los filtros y en la ficha
  assert.match(html, /<em class="entp p-\$\{esc\(c\.puesto \|\| 'no'\)\}">\$\{icoPuesto\(c\.puesto\)\}/);
  assert.match(html, /chip\('val', v\.id, v\.label, r\[v\.id\], icoCand\(v\.ico\)\)/);
  assert.match(html, /\$\{o\.ico \? icoCand\(o\.ico\) : ''\}/, 'la ficha también');
});
