// 18/09 (José): «en la opción de entrevistas, Aroa funciona bien para antes de citar a
// alguien comprueba si previamente lo hemos descartado pero no quiero que tenga acceso al
// contenido de cada entrevista. Si sí le hemos entrevistado, si hemos puesto bien, mal o
// regular y demás pero no a lo que hay dentro de cada entrevista donde hablo de
// condiciones».
//
// El permiso lo impone el SERVIDOR (tests/seguridad.test.mjs): a quien no lo tiene no le
// llega el contenido. Aquí se comprueba que la app se comporta en consecuencia y no
// enseña una ficha a medias ni botones que no van a funcionar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(RAIZ, 'index.html'), 'utf8');
const srv = readFileSync(join(RAIZ, 'server.js'), 'utf8');
const proy = readFileSync(join(RAIZ, 'estado-servidor.js'), 'utf8');

test('el permiso viaja del servidor a la app y no se inventa en el cliente', () => {
  assert.match(srv, /verEntrevistas: veEntrevistas/, '/api/yo lo dice');
  assert.match(srv, /const veEntrevistas = !!yo\.verent/, 'sale de la cuenta, no del rol');
  assert.match(html, /SRV\.verEntrevistas = datos\.verEntrevistas !== false/, 'la app lo recoge al entrar');
  assert.match(html, /verEntrevistas: true/, 'sin servidor (local) se ve todo');
});

test('quien no lo tiene ni ve el botón de registrar ni puede abrir una ficha', () => {
  assert.match(html, /function puedeVerEntrevista\(\)/, 'una sola función lo decide');
  assert.match(html, /id="entNuevo"/);
  // el botón de registrar solo se pinta con permiso
  assert.match(html, /\$\{puedeVerEntrevista\(\) \? `<button class="btn btn-cta" id="entNuevo">\+ Registrar<\/button>` : ''\}/);
  // y la fila deja de ser un botón: sin contenido que abrir, no se pulsa
  assert.match(html, /const abre = puedeVerEntrevista\(\);/);
  assert.match(html, /<\$\{abre \? 'button' : 'div'\} class="entrow\$\{abre \? '' : ' entrow-cerrada'\}"/);
  // y aunque alguien llame a la ficha a mano, no se abre
  assert.match(html, /function abrirFichaCand\(id, editar\) \{[^{}]*if \(!puedeVerEntrevista\(\)\)/, 'la guarda es lo primero de la función');
});

test('se le explica por qué, en vez de dejarle una sección medio rota', () => {
  assert.match(html, /El contenido de cada entrevista/, 'un aviso en la cabecera');
  assert.match(html, /entaviso/, 'con su propio estilo');
});

test('la app recortada NO puede decir que la base ya está sembrada', () => {
  // Si Aroa es la primera en abrir un servidor vacío, su navegador crea la planilla. Con
  // la semilla vacía pero la VERSIÓN puesta, marcaría el estado como «ya sembrado» sin
  // sembrar nada, y José no recibiría nunca las 275 entrevistas. La versión va dentro del
  // bloque recortable justo por esto.
  const i = html.indexOf('/*ENTREVISTAS_START*/'), j = html.indexOf('/*ENTREVISTAS_END*/');
  assert.ok(i > 0 && j > i, 'el bloque está marcado');
  const recortada = html.slice(0, i) + 'const ENTREVISTAS_SEMILLA = []; const SEMILLA_ENT_V = 0;' + html.slice(j + '/*ENTREVISTAS_END*/'.length);
  const versiones = [...recortada.matchAll(/const SEMILLA_ENT_V = (\d+)/g)].map(m => +m[1]);
  assert.deepEqual(versiones, [0], `la app recortada declara la versión ${JSON.stringify(versiones)}: con algo distinto de [0] se pierde la siembra`);
  assert.match(srv, /const ENTREVISTAS_SEMILLA = \[\]; const SEMILLA_ENT_V = 0;/, 'y el servidor recorta exactamente eso');
});

test('la proyección del servidor deja pasar lo que ella necesita y nada más', () => {
  assert.match(proy, /function entrevistaSinContenido\(c\)/);
  // 18/09 (José, por Diego): nombre y teléfono, si ya se la entrevistó y cómo se la valoró.
  const fn = proy.slice(proy.indexOf('function entrevistaSinContenido'), proy.indexOf('function estadoSinContenidoEntrevistas'));
  const obj = fn.slice(fn.indexOf('const fuera = {'), fn.indexOf('  };'));
  const claves = [...new Set([...obj.matchAll(/(?:^|[{,]\s*|\n\s*)(\w+):/g)].map(m => m[1]))].sort();
  assert.deepEqual(claves, ['entrevistado', 'id', 'lista', 'motivo', 'nombre', 'sinContenido', 'tel', 'val'],
    `la proyección arma exactamente estas claves: ${JSON.stringify(claves)}`);
  // y ninguna de las de dentro, ni el puesto ni la fecha, que también salen de la entrevista
  for (const k of ['exp', 'sueldo', 'horarios', 'cond', 'obs', 'hab', 'edad', 'zona', 'doc', 'incorp', 'nota', 'busca', 'tipoCocina', 'puestos', 'puesto', 'fecha'])
    assert.ok(!claves.includes(k), `«${k}» NO puede salir del servidor`);
});
