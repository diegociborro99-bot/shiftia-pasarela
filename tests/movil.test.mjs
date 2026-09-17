// La pasada de móvil del 17/09: el fichero de estilos táctiles va el último (los
// estilos se concatenan por orden y tiene que ganar), nada por debajo de lo que
// pilla un dedo y lo nuevo de hoy —Entrevistas, vacaciones y el día libre puntual—
// adaptado a pantallas de 320 px en adelante.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(RAIZ, 'index.html'), 'utf8');
const ficheros = readdirSync(join(RAIZ, 'src/styles')).filter(f => f.endsWith('.css')).sort();
const movil = readFileSync(join(RAIZ, 'src/styles/26-pasarela-movil.css'), 'utf8');

test('los estilos táctiles van en el último fichero, para que ganen a los de arriba', () => {
  assert.equal(ficheros[ficheros.length - 1], '26-pasarela-movil.css');
  assert.match(movil, /@media \(pointer:coarse\), \(max-width:1024px\)/);
});
test('nada por debajo de lo que pilla un dedo: 34 px de botón y 38 de campo', () => {
  assert.match(movil, /\.btn-mini[^{]*\{min-height:34px\}/);
  assert.match(movil, /\.btn,\.btn-cta,\.btn-sec\{min-height:40px\}/);
  assert.match(movil, /input\.logininp[^{]*\{min-height:38px\}/);
  assert.match(movil, /input,select,textarea\{font-size:max\(16px,1em\)\}/, 'iOS no debe hacer zoom al enfocar un campo');
});
test('Entrevistas en el móvil: buscador y botón en una fila, filtros en tira deslizable', () => {
  assert.match(movil, /\.entacts\{flex-direction:row/);
  assert.match(movil, /\.entchips\{flex-wrap:nowrap;overflow-x:auto/);
  assert.match(movil, /\.entetq\{flex:1 0 100%/, 'las etiquetas bajan a su propia línea y no desbordan');
  assert.match(movil, /@media \(max-width:360px\)/, 'y una pasada más para pantallas de 320–360');
});
test('las vacaciones del año y el día libre puntual también caben', () => {
  assert.match(movil, /\.vactab\{min-width:640px\}/);
  assert.match(movil, /\.vactab td\.per\{position:sticky;left:0/, 'el nombre se queda fijo al deslizar los meses');
  assert.match(movil, /\.lpuntpie\{font-size/);
});
test('la píldora de la semana con nombre crece en táctil hasta la tablet', () => {
  assert.match(html, /@media \(max-width:820px\)\{ \.wav\{height:32px/);
});
