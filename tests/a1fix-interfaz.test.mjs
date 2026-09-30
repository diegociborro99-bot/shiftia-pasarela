// Revisión de A1 (30/09): lo que la interfaz tiene que hacer con lo que ahora devuelve el modelo, comprobado sobre el
// index.html ensamblado (INDEX permite pasar la prueba por otra copia de la app, la de antes, para verla en rojo).
//  · el eco (las casillas que cambian por rebote) se enseña en el toast y se apunta en el historial (cliente 3b);
//  · el Excel sale de posicionesDe y la hoja no marca «(abre)» al primero por serlo (cliente 1 y 2);
//  · el menú de la casilla dice la misma posición que Hoy (cliente 1);
//  · la línea del historial de «Quitar la marca de cocina» lleva la franja y la migración sinCocina3009 corre al cargar (modelo 4);
//  · el perfil del empleado no lista una casilla cerrada ese día (cliente 5) y el modo Periodo no tapa un segundo aviso (S3).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(process.env.INDEX || join(RAIZ, 'index.html'), 'utf8');

test('el eco se anuncia: asignarUI, desasignarUI y las acciones del menú de la casilla pasan al toast y al historial lo que cambió por rebote', () => {
  assert.match(html, /function anunciarEco\(eco, porQue\)/, 'la pieza común');
  assert.match(html, /function anunciarEco\(eco, porQue\) \{[\s\S]{0,300}?textoCambiosCasillas\(S, S\.staff, eco\)/, 'con el texto del modelo, en español llano');
  assert.match(html, /function asignarUI\([^)]*\) \{[\s\S]{0,900}?anunciarEco\(r\.eco,/, 'al poner a alguien');
  assert.match(html, /function desasignarUI\([^)]*\) \{[\s\S]{0,700}?anunciarEco\(eco,/, 'al quitar a alguien');
  for (const a of ['subir', 'noabre', 'cocina', 'nococina']) assert.ok(new RegExp(`a === '${a}'[^\\n]*anunciarEco\\(`).test(html), `la acción «${a}» del menú anuncia el eco`);
  assert.match(html, /a === 'abre'\) \{[\s\S]{0,1500}?anunciarEco\(eco, `el «sale primero» de/, 'la acción «abre» del menú anuncia el eco');
});
test('el Excel de la semana sale de posicionesDe y la hoja impresa no marca «(abre)» al primero solo por ir el primero', () => {
  assert.match(html, /function xlsxCasilla\([^)]*\) \{[\s\S]{0,400}?posicionesDe\(S, S\.staff, c\.est, c\.iso, tid\)/);
  assert.doesNotMatch(html, /function abreEn\(lista, i\) \{ return !!\(lista\[i\] && \(lista\[i\]\.abre \|\| \(i === 0/, 'sin el parche i === 0');
  assert.match(html, /function abreEn\(lista, i\) \{ return !!\(lista\[i\] && lista\[i\]\.abre\); \}/);
});
test('el menú de la casilla dice la posición que enseña Hoy (posicionesDe), también con el hueco delante', () => {
  assert.match(html, /function openMenuTurno\([^)]*\) \{[\s\S]{0,3000}?const posiciones = posicionesDe\(S, S\.staff, e, iso, tid\)/);
  assert.match(html, /posición \$\{posDe\.pos\} de \$\{posiciones\.length\}/);
});
test('«Quitar la marca de cocina» apunta la franja en el historial, y al cargar corre la migración sinCocina3009', () => {
  assert.match(html, /a === 'nococina'[^\n]*registrarCambio\(`\$\{p\.nombre\} deja la cocina de \$\{l\.nombre\} \$\{FRANJA_LBL\[franja\]\.toLowerCase\(\)\} del \$\{fmtDM\(iso\)\}`/);
  assert.match(html, /const mh = migrarMarcasHuerfanas\(estado, isoHoy\(\)\);[\s\S]{0,600}?const ms = migrarSinCocina\(estado, isoHoy\(\)\);/);
  assert.match(html, /if \(mm\.abre \|\| mm\.cocina \|\| mh\.abre \|\| mh\.cocina \|\| ms\.cocina\) refrescarMarcas\(estado/);
});
test('el perfil del empleado solo lista las casillas que ocupan ese día (plazaOcupa), y el modo Periodo no funde dos avisos distintos de la misma persona y semana', () => {
  assert.match(html, /function activarModoEmpleado\(\) \{[\s\S]{0,2500}?const cas = casillasDe\(est, d\.iso, p\.id\)\.filter\(c => plazaOcupa\(S, est, d\.iso, c\.tid\)\)/);
  assert.match(html, /total\.avisos\.some\(x => x\.pid === a\.pid && x\.semana === a\.semana && x\.tipo === a\.tipo && x\.texto === a\.texto\)/);
});
