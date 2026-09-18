// 18/09 (Diego): «ponemos en el menu semana al aplicar para cambiar un trabajador que
// aparezca una lupita en el blop para buscarlo por nombre».
//
// El «blop» es #pickerPop (11-selector.js): el popover que se abre desde Semana al pulsar
// el ＋ de una casilla o el hueco «1·?», y desde Hoy con «Añadir». Lista a TODA la
// plantilla en tres grupos —PUEDEN, CON AVISO, NO PUEDEN— así que con 21 personas hay que
// bajar buscando a ojo. Con la lupa se escribe el nombre y se queda lo que encaja.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(RAIZ, 'index.html'), 'utf8');
const css = readFileSync(join(RAIZ, 'src/styles/21-pasarela-app.css'), 'utf8');

test('el selector lleva un buscador con lupa, como el de Entrevistas', () => {
  assert.match(html, /id="pickQ"/, 'el cajetín de buscar');
  assert.match(html, /placeholder="Buscar por nombre…"/);
  assert.match(html, /class="pbusca"/, 'con su etiqueta y la lupa dentro');
  // la misma lupa que ya usa el buscador de Entrevistas: círculo + mango
  assert.match(html, /const SVG_LUPA_PICK = '<svg[^']*<circle cx="11" cy="11" r="7"\/><path d="m20 20-3\.6-3\.6"\/>/, 'la lupita');
  assert.match(html, /class="pbusca">\$\{SVG_LUPA_PICK\}/, 'y va dentro del cajetín');
});

test('filtra por nombre sin importar tildes ni mayúsculas', () => {
  assert.match(html, /function pickNorm\(s\)/);
  assert.match(html, /normalize\('NFD'\)/);
  assert.match(html, /const filasPicker = q => \{/, 'una función pinta las filas ya filtradas');
  assert.match(html, /const pasa = nombre => !n \|\| pickNorm\(nombre\)\.includes\(n\);/, 'y filtra por nombre');
});

test('repinta solo la lista, para no perder el foco mientras se teclea', () => {
  // el mismo patrón que pintaListaEnt en Entrevistas: si se repinta el popover entero,
  // el <input> se destruye a cada tecla y el cursor se pierde (y en el móvil se cierra el teclado)
  assert.match(html, /function pintaListaPicker\(/);
  assert.match(html, /\$\('#pickQ'\)\.oninput/, 'al teclear');
  const fn = html.slice(html.indexOf('function pintaListaPicker('), html.indexOf('function pintaListaPicker(') + 700);
  assert.match(fn, /\.plist/, 'toca la lista…');
  assert.ok(!/pickerPop.*innerHTML\s*=/.test(fn), '…y no el popover entero');
});

test('los grupos vacíos desaparecen y se avisa cuando no hay nadie con ese nombre', () => {
  assert.match(html, /No hay nadie con ese nombre/);
});

test('no roba el foco en el móvil: el teclado taparía el propio selector', () => {
  assert.match(html, /matchMedia\('\(hover:hover\)'\)\.matches && [^\n]*pickQ|hover:hover[^\n]*focus/,
    'solo se enfoca solo en escritorio');
});

test('la lupa tiene estilo propio y no rompe el popover', () => {
  assert.match(css, /\.pbusca\{/);
  assert.match(css, /\.pbusca input\{/);
});
