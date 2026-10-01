// Fase A7 de la auditoría del modelo (01/10, bajos y lo que dejaron apuntado A4, A5 y A6): lo que la interfaz tiene que hacer con
// lo que ahora hace el modelo, comprobado sobre el index.html ensamblado (INDEX permite pasar la prueba por otra copia de la app, la
// de antes, para verla en rojo). Lo que se ve con clics lo comprueba e2e-a7.
//  · B12: con dos cierres el mismo día (El 33 por la mañana y el Mónaco por la tarde), el Mes y «Libran hoy» leen cada cierre con sus
//    franjas (estadoDia().cierres) y la casilla cerrada de Hoy dice «hasta» el final de su tramo (hastaCortoCierre con el día);
//  · la marca «!» de Hoy y el título de la Semana salen de la misma lectura (textoIncumple), y la Revisión tiene su grupo «Ya pasado»;
//  · Equipo pasa la hora a cubrirAusencia (como la Cobertura) y el Mes dice quién entró por la ausencia que se quita (avisoQuitarAusencia);
//  · en el móvil, la casilla de las opciones del Generador mide lo suyo (26-pasarela-movil.css, el último).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(process.env.INDEX || join(RAIZ, 'index.html'), 'utf8');

test('B12: el Mes y «Libran hoy» miran cada cierre del día con sus franjas; Hoy, «hasta» el final del tramo', () => {
  assert.match(html, /const cieF = edc && edc\.cierres\.some\(x => x\.tipo !== 'REFUERZA'\) && !edc\.libra \? edc : null;/);
  assert.match(html, /cieF\.cierres\.filter\(x => x\.tipo !== 'REFUERZA'\)\.map\(x => `\$\{x\.franjas\.map\(f => FRANJA_LBL\[f\]\)\.join\(' y '\)\}: \$\{motivoSinTrabajo\(S, x\.cierre, d\.iso\)\}`\)/);
  assert.match(html, /if \(!ed\.libra && ed\.cierres\.some\(x => x\.tipo !== 'REFUERZA'\)\)/);
  assert.match(html, /if \(x\.cierres\.some\(c => c\.tipo !== 'REFUERZA'\)\) return \{ cls: 'cie'/);
  assert.match(html, /function hastaCortoCierre\(c, iso\) \{ return hastaCierre\(c, iso\)/);
  assert.match(html, /\(hasta \$\{esc\(hastaCortoCierre\(c, iso\)\)\}\)/);
  assert.doesNotMatch(html, /cieF\.cierre\.franjas/, 'la franja de un cierre ya no se apunta al otro');
});

test('Hoy y la Semana: la marca de lo forzado y lo que rompe una regla dura, con la misma lectura (textoIncumple)', () => {
  assert.match(html, /function textoIncumple\(s, iso, tid\) \{/);
  assert.match(html, /\$\{incumple \? `<span class="bdg forz" title="\$\{esc\(incumple\)\}">!<\/span>` : ''\}/);
  assert.doesNotMatch(html, /title="Asignación forzada: rompe una regla">!<\/span>/, 'el título ya dice qué incumple');
  assert.match(html, /\$\{!x\.forzado && textoIncumple\(x, c\.iso, tid\) \? ' rompe' : ''\}/);
  assert.match(html, /\(textoIncumple\(x, c\.iso, tid\) \? ' · ' \+ textoIncumple\(x, c\.iso, tid\) : ''\)/);
  assert.match(html, /\.pchip\.rompe\{/);
  assert.match(html, /\.wav\.rompe\{outline:2px solid var\(--bad\)/);
});

test('la Revisión: «Ya pasado» en gris y el último grupo; el punto rojo solo con lo de hoy en adelante', () => {
  assert.match(html, /pasado: \['var\(--ink3\)', 'Ya pasado · para que lo sepas'\]/);
  assert.match(html, /\['alta', 'media', 'info', 'autorizado', 'pasado'\]\.map\(n =>/);
  assert.match(html, /const grupo = x => x\.nivel === 'pasado' \? 'pasado' :/);
  assert.match(html, /\.revitem\.pasado\{border-left:4px solid var\(--ink3\)/);
});

test('Equipo pasa la hora a cubrirAusencia (como la Cobertura) y el Mes avisa de quién entró por la ausencia que se quita', () => {
  const llamadas = html.match(/cubrirAusencia\(S, [^;]*\{ desdeIso: hoy[^}]*\}/g) || [];
  assert.equal(llamadas.length, 2, 'la simulación y la de verdad');
  assert.ok(llamadas.every(x => /ahoraHM: horaMadrid\(\)/.test(x)), llamadas.join(' | '));
  assert.match(html, /function avisoQuitarAusencia\(p, isos\) \{/);
  assert.match(html, /return avisoQuitarAusencia\(p, \[\.\.\.rangoIso\(a\.desde, a\.hasta \|\| addDias\(a\.desde, 60\)\)\]\.slice\(0, 62\)\);/);
  assert.match(html, /toast\(avisoQuitarAusencia\(p, \[iso\]\), 'ok'\);/);
});

test('en el móvil, la casilla de las opciones del Generador mide lo suyo (el input de 46 px la bajaba)', () => {
  const i = html.lastIndexOf('/* 26-pasarela-movil.css */');
  assert.ok(i > 0, 'el fichero de móvil va en el index');
  assert.match(html.slice(i), /\.genopt input\[type="checkbox"\]\{min-height:0;width:20px;height:20px;margin:1px 0 0\}/);
});

// ── corrección tras la revisión (01/10) ──
test('corrección · C-H1 y M-B3: el Generador y la Revisión reciben la hora (lo de hoy ya terminado es lo ya trabajado)', () => {
  assert.match(html, /const desdeHoyGen = \(\) => GEN\.opts\.desdeHoy \? \{ desdeIso: isoHoy\(\), ahoraHM: horaMadrid\(\) \} : \{\};/);
  assert.equal((html.match(/desdeHoyGen\(\)/g) || []).length, 4, 'el Periodo, el núcleo, el volcado y la Semana');
  assert.doesNotMatch(html, /desdeIso: GEN\.opts\.desdeHoy \? isoHoy\(\) : undefined/);
  const revs = html.match(/revisionMes\(S, S\.staff, [a-z]+, \{[^}]*\}\)/g) || [];
  assert.ok(revs.length >= 4 && revs.every(x => /ahoraHM: horaMadrid\(\)/.test(x)), revs.join(' | '));
});

test('corrección · C-H2, C-H3 y D-4b: lo ya trabajado sin marca (turnoTrabajado); el menú con la frase entera; el Mes con la misma lectura', () => {
  assert.match(html, /function turnoTrabajado\(iso, tid\) \{/);
  assert.match(html, /const pasado = !!\(iso && tid && turnoTrabajado\(iso, tid\)\), duras = s\.duras \|\| \[\];/);
  assert.match(html, /if \(!duras\.length \|\| pasado\) return '';/);
  assert.match(html, /function htmlIncumpleMenu\(s, avisosAhora, iso, tid\) \{/);
  assert.match(html, /\$\{htmlIncumpleMenu\(posDe, avisosAhora, iso, tid\)\}/);
  assert.match(html, /textoIncumple\(\{ origen: c\.entry\.origen \|\| 'manual', duras: durasDe\(S, S\.staff, est, d\.iso, c\.tid, p\.id\) \}, d\.iso, c\.tid\)/);
});

test('corrección · B5 y B10: Cuenta sin género («se borró», «Se ha recuperado a …») y con el número de versiones que guarda el servidor', () => {
  assert.doesNotMatch(html, /<small>borrada el /);
  assert.doesNotMatch(html, /última versión con ella/);
  assert.doesNotMatch(html, /\$\{nombre\} recuperada:/);
  assert.match(html, /<small>se borró el \$\{esc\(fmtDM\(x\.borradoEn\)\)\}/);
  assert.match(html, /toast\(`Se ha recuperado a \$\{nombre\}: /);
  assert.doesNotMatch(html, /las últimas 60/, 'el número lo da el servidor');
  assert.match(html, /El servidor guarda las últimas \$\{r\.datos\.max\} versiones de la planilla/);
  assert.doesNotMatch(html, /\$\{nombrePid\(pid\)\} añadido/);
  assert.doesNotMatch(html, /\}, puesto a la fuerza\$\{/, 'la línea de lo forzado de la Revisión (el modelo embebido)');
  assert.match(html, /\}, a la fuerza\$\{x\.motivo/);
});

test('corrección · B2, B6 y B11: plurales de verdad; los avisos largos duran más; «Ya pasado» apagado también en oscuro; «VAC» sin repetir', () => {
  for (const x of ['aviso(s)', 'plaza(s)', 'persona(s)', 'turno(s)', 'franja(s)', 'supuesto(s)', 'hueco(s)', 'registrada(s)', 'petición(es)']) assert.ok(!html.includes(x), x);
  assert.match(html, /const ms = Math\.min\(12000, Math\.max\(3400, 1200 \+ String\(msg \|\| ''\)\.length \* 50\)\);/);
  assert.match(html, /#toasts,#toasts \.toast\{pointer-events:none\}/, 'y mientras están no tapan los botones de debajo');
  assert.match(html, /\.revitem\.pasado\{border-left:4px solid var\(--ink3\);color:var\(--ink3\);background:transparent;opacity:\.85\}/);
  assert.match(html, /\.revitem\.pasado \.lpill\{background:var\(--ink3\)\}/);
  assert.match(html, /function cortoAusenciasDia\(as\) \{/);
  assert.doesNotMatch(html, /as\.map\(a => a\.tipo\)\.join\('\+'\)/, 'el Mes ya no pone «VAC+VAC»');
});
