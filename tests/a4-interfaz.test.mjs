// Fase A4 de la auditoría del modelo (30/09, generador y retirada): lo que la interfaz tiene que hacer con lo que ahora hace el
// modelo, comprobado sobre el index.html ensamblado (INDEX permite pasar la prueba por otra copia de la app, la de antes, para
// verla en rojo).
//  · un hueco «nadie puede abrir» del Generador → Periodo pregunta a candidatosConAviso y candidatosPara con primero (así
//    «Con aviso» y «Pueden entrar» solo ofrecen a quien puede abrir), y las tres llamadas llevan los meses (E5, D2/E9);
//  · el pie del Generador → Semana y su hoja impresa pintan a los ausentes de cada día con su tipo (E4);
//  · «(lo puesto a mano no se toca)» solo cuando de verdad hay plazas a mano en la semana (E6);
//  · el texto del Generador dice que se retira lo automático que rompe una regla dura, no solo el día libre (H4, D15).
// 01/10 (corrección de A4 tras la revisión): los ausentes con la etiqueta del día del modelo (H-07, C14); «poner» desde el Mes
// pregunta a la puerta con el puesto de sala, como el selector (sospecha de la revisión de modelo); la hoja impresa ya no lleva
// la nota «Decisión del cliente, no nuestra.» (revisión de cliente, extra). Lo demás de la corrección lo comprueba e2e-a4.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(process.env.INDEX || join(RAIZ, 'index.html'), 'utf8');

test('el hueco de apertura del Periodo pide candidatos que puedan abrir (primero) y las tres llamadas llevan los meses', () => {
  assert.match(html, /const mesesGen = \(GEN\.previa && GEN\.previa\.meses\) \|\| S\.meses;/, 'los meses, una sola vez');
  assert.match(html, /const alt = h\.tipo === 'cocina' \? \[\] : candidatosConAviso\(S, S\.staff, e, h\.iso, h\.turnoId, \{ primero: h\.tipo === 'primero', meses: mesesGen \}\)\.slice\(0, 3\);/, '«Con aviso» con primero y meses');
  assert.match(html, /const limpios = h\.tipo === 'cocina' \? \[\] : candidatosPara\(S, S\.staff, e, h\.iso, h\.turnoId, \{ primero: h\.tipo === 'primero', meses: mesesGen \}\)\.slice\(0, 3\);/, '«Pueden entrar» también en un hueco de apertura, con primero');
  assert.match(html, /const filaHueco = ap\.closest\('\[data-hueco\]'\);\n\s*const primero = !!filaHueco && filaHueco\.dataset\.hueco\.split\('\|'\)\[2\] === 'primero';/, 'al pulsar, el hueco dice si es de apertura');
  assert.match(html, /const fila = \(limpio \? candidatosPara\(S, S\.staff, e, iso, tid, \{ primero, meses: mesesGen \}\) : candidatosConAviso\(S, S\.staff, e, iso, tid, \{ primero, meses: mesesGen \}\)\)\.find\(c => c\.pid === pid\);/, 'la fila que se pone es la misma que se enseñó');
});

test('el pie «Quién libra cada día» del Generador → Semana y la hoja impresa pintan a los ausentes de cada día con su tipo', () => {
  assert.match(html, /const ausDia = iso => \(res\.ausentes \|\| \{\}\)\[iso\] \|\| \[\];/, 'los ausentes del modelo');
  assert.match(html, /<th class="gfr">Ausentes<small>vacaciones · permisos · libres<\/small><\/th>/, 'la fila del pie');
  assert.match(html, /class="glchip gaus" style="--pc:\$\{avColor\(x\.pid\)\}">\$\{nc\(x\.pid\)\} · \$\{esc\(x\.etiqueta \|\| etiquetaAusencia\(x\)\.toLowerCase\(\)\)\}<\/span>/, 'cada chip con su tipo (y la media jornada; desde la corrección, la etiqueta del día del modelo)');
  assert.match(html, /<td class="pxg-lbl"><b>Ausentes<\/b><small>vacaciones · permisos · libres<\/small><\/td>/, 'la hoja impresa de la semana generada');
  assert.match(html, /<span class="aus">\$\{esc\(nombrePid\(x\.pid\)\)\} · \$\{esc\(x\.etiqueta \|\| etiquetaAusencia\(x\)\.toLowerCase\(\)\)\}<\/span>/, 'con el tipo en el papel');
});

test('«(lo puesto a mano no se toca)» solo cuando hay plazas a mano, y el Generador dice qué se retira (las reglas duras, no solo el día libre)', () => {
  assert.match(html, /\$\{r\.plazasAMano \? ' \(lo puesto a mano no se toca\)' : ''\}/);
  assert.doesNotMatch(html, /'condiciones no se cumplen'\)\}<\/b> \(lo puesto a mano no se toca\)\./);
  assert.match(html, /lo que puso la semana tipo, el generador o la Cobertura y ahora rompe una regla dura \(un día libre, una ausencia, un local o una franja que ya no hace, un veto, el standby, un «nunca con» estricto\) se retira y sale en «Qué ha cambiado»; lo que rompe algo relajable \(un partido no declarado\) se queda con su aviso\./);
});

test('corrección de A4: «poner» desde el Mes pregunta a la puerta con el puesto de sala (como el selector) y la hoja impresa ya no lleva la nota del programador', () => {
  assert.match(html, /const r0 = puedeEstar\(S, S\.staff, e, iso, tid, pid, Object\.assign\(\{ puesto: 'sala' \}, RELAJABLE\)\);\n\s*let opts = Object\.assign\(\{ origen: 'manual', puesto: 'sala' \}, RELAJABLE\);/, 'la puerta y lo que se pone, de sala');
  assert.match(html, /const f = r0\.ok \? null : siSeFuerza\(S, S\.staff, e, iso, tid, pid, Object\.assign\(\{ puesto: 'sala' \}, RELAJABLE\)\);/, 'y lo que se incumpliría forzándola, también de sala');
  assert.doesNotMatch(html, /Decisión del cliente, no nuestra/);
});
