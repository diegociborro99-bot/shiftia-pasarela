// Las entrevistas que solo existían en papel —escaneadas dentro de la base de Notion—
// están volcadas en la base de la web: se leyeron las 150 hojas manuscritas y cada una
// se cruzó por el teléfono escrito en el papel, no por el nombre de la página de Notion
// (había fichas con el escaneo de otra persona pegado). Ver DISEÑO.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const datos = readFileSync(join(RAIZ, 'src/app/23-entrevistas-datos.js'), 'utf8');
const filas = datos.split('\n').filter(l => l.trim().startsWith('C({'));
const cuantas = k => filas.filter(l => l.includes('"' + k + '":')).length;

test('la mayoría de las fichas ya traen la entrevista contestada, no solo nombre y teléfono', () => {
  assert.ok(cuantas('exp') >= 160, `experiencia contada en ${cuantas('exp')} fichas`);
  assert.ok(cuantas('edad') >= 160, `edad en ${cuantas('edad')} fichas`);
  assert.ok(cuantas('zona') >= 160, `zona en ${cuantas('zona')} fichas`);
  assert.ok(cuantas('doc') >= 110, `documentación en ${cuantas('doc')} fichas`);
  assert.ok(cuantas('hab') >= 150, `aptitudes en ${cuantas('hab')} fichas`);
});

test('las valoraciones del papel se suman a los emoticonos de Notion', () => {
  assert.ok(cuantas('val') >= 80, `valoradas ${cuantas('val')} fichas`);
});

test('una hoja concreta está entera: Emilia Hernández, 13/10/2025', () => {
  const fila = filas.find(l => l.includes('"662082645"'));
  assert.ok(fila, 'la ficha de Emilia Hernández existe');
  assert.match(fila, /"edad": "41"/);
  assert.match(fila, /La Paraeta/, 'la experiencia que contó');
  assert.match(fila, /"pda": "no"/, 'de PDA dijo que no');
  assert.match(fila, /1200/, 'lo que pide de sueldo');
});

test('lo que el grupo escribió a mano de alguien vetado se conserva tal cual', () => {
  const fila = filas.find(l => l.includes('"658084710"')); // Roberto Candel Tortosa
  assert.ok(fila, 'la ficha existe');
  assert.match(fila, /"val": "veto"/);
  assert.match(fila, /dej[oó] tirados/i, 'el motivo, con sus palabras');
});

test('los campos que se vuelcan son los que la ficha sabe pintar', () => {
  const modelo = readFileSync(join(RAIZ, 'modelo.js'), 'utf8');
  const campos = [...modelo.matchAll(/\{ k: '(\w+)'/g)].map(m => m[1]);
  const habs = [...modelo.matchAll(/\{ id: '(\w+)', label: '[^']*', ico: '(?:cafetera|barril|camarero|cocina|jamon|tpv|pda|llave)'/g)].map(m => m[1]);
  const extra = new Set();
  for (const l of filas) {
    for (const m of l.matchAll(/"(\w+)":/g)) extra.add(m[1]);
  }
  const propios = ['id', 'nombre', 'tel', 'lista', 'puesto', 'puestos', 'val', 'motivo', 'nota', 'adj', 'hab', 'busca'];
  for (const k of extra)
    assert.ok(campos.includes(k) || habs.includes(k) || propios.includes(k), `«${k}» no lo pinta ninguna ficha`);
});
