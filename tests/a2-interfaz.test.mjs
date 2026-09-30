// Fase A2 de la auditoría del modelo (30/09, ausencias): lo que la interfaz tiene que hacer con lo que ahora hace el modelo,
// comprobado sobre el index.html ensamblado (INDEX permite pasar la prueba por otra copia de la app, la de antes, para verla
// en rojo).
//  · el Mes, al quitar un día de una ausencia sin fecha de fin (la baja de Laura), avisa de que se quita solo ese día (A1);
//  · el selector «Cuándo» de la ausencia (tarjeta, ficha y Mes) solo ofrece las franjas que la persona trabaja (G7);
//  · Entrevistas pasa la fecha de hoy a fechaCandidato y ordenarCandidatos (A5/G15: el modelo ya no mira el reloj);
//  · la ficha enseña el cambio de día libre con el texto del modelo (A3: «libra además el viernes»);
//  · (corrección tras las revisiones, 30/09) un botón por ausencia del día en el Mes, todas las ausencias del día en Hoy/Mes/
//    Cobertura/perfil, los «y … y», los botones de la Cobertura por franjas, la salida futura en la tarjeta, «el 8/10», el alta
//    repetida, la ausencia en una franja que no es suya al cargar y «sin plaza» en «Quién libra cada día».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(process.env.INDEX || join(RAIZ, 'index.html'), 'utf8');

test('el Mes: un botón por ausencia del día (con dos, «Quitar el permiso de la mañana» / «Quitar las vacaciones de la tarde»), se quita solo esa, y el aviso de la baja abierta va sobre la elegida (en el primer día, «desde el día siguiente»)', () => {
  assert.match(html, /const ausDia = ausenciasDia\(p, iso\);/, 'la hoja del día lee TODAS las ausencias del día');
  assert.match(html, /ausDia\.map\(a => `<button class="popb full" data-dp="quitaraus" data-aus="\$\{p\.ausencias\.indexOf\(a\)\}">\$\{esc\(textoQuitarAusencia\(a, ausDia\.length > 1\)\)\}<\/button>`\)/, 'un botón por ausencia, con su índice');
  assert.match(html, /function textoQuitarAusencia\(a, varias\) \{\n\s*if \(!varias\) return 'Quitar la ausencia de este día';/, 'con una sola, el texto de siempre');
  assert.match(html, /const QUITAR_AUS = \{ BAJ: 'la baja', VAC: 'las vacaciones', LD: 'el día libre', PERM: 'el permiso', OTRO: 'la ausencia' \};/);
  assert.match(html, /b\.dataset\.dp === 'quitaraus'\) \{[\s\S]{0,900}?const esa = p\.ausencias\[\+b\.dataset\.aus\]; if \(!esa\) return;/, 'quita la elegida');
  assert.match(html, /p\.ausencias = quitarDiaDeAusencia\(p\.ausencias, iso, a => a === esa\);/, 'con filtro: solo esa');
  assert.match(html, /if \(abierta && !confirm\(`\$\{p\.nombre\} está \$\{motivoAusencia\(esa\)\} desde el \$\{fmtDM\(esa\.desde\)\} sin fecha de fin: se quita solo el \$\{fmtDM\(iso\)\} y sigue \$\{motivoAusencia\(esa\)\} \$\{esa\.desde === iso \? 'desde el día siguiente' : 'antes y después'\}/, 'la confirmación, sobre la elegida, y sin «antes» en el primer día');
  assert.match(html, /Ausencia retirada: \$\{p\.nombre\} el \$\{fmtDM\(iso\)\}\$\{ausDia\.length > 1 \? ` · \$\{etiquetaAusencia\(esa\)\}` : ''\}\$\{abierta \? ` \(solo ese día: sigue/, 'y el historial nombra cuál');
});

test('Hoy, el Mes (pastilla y hoja del día), la Cobertura y el perfil enseñan todas las ausencias del día (etiquetaAusenciasDia); la Cobertura sin «½» cuando cubren todas sus franjas', () => {
  assert.match(html, /<span class="abschip a-\$\{esc\(a\.tipo\)\}">\$\{esc\(etiquetaAusenciasDia\(p, iso\)\)\}<\/span>/, 'Hoy · Ausentes hoy');
  assert.match(html, /data-tipstr="\$\{esc\(etiquetaAusenciasDia\(p, d\.iso\) \+ as\.filter\(a => a\.detalle\)\.map\(a => ' · ' \+ a\.detalle\)\.join\(''\)\)\}"/, 'la pastilla del Mes: el tooltip con todas y sus detalles');
  assert.match(html, /\$\{fmtLargo\(iso\)\}\$\{ausDia\.length \? ` · <b>\$\{esc\(etiquetaAusenciasDia\(p, iso\)\)\}<\/b>` : ''\}/, 'la cabecera de la hoja del día');
  assert.match(html, /const entera = aus && \(!franjasAusencia\(aus\) \|\| franjasDeTrabajo\(p\)\.every\(f => fsAus\.includes\(f\)\)\);/, 'la Cobertura: entera si cubre todas sus franjas');
  assert.match(html, /const pie = entera \? `<em class="a-\$\{esc\(aus\.tipo\)\}" title="\$\{esc\(etiquetaAusenciasDia\(p, iso\)\)\}">\$\{esc\(as\.map\(lblAus\)\.join\(' · '\)\)\}<\/em>`/, 'y entonces sin «½»');
  assert.match(html, /\$\{aus \? `<small>\$\{esc\(etiquetaAusenciasDia\(p, d\.iso\)\)\}\$\{esc\(ausenciasDia\(p, d\.iso\)\.filter\(a => a\.detalle\)\.map\(a => ' · ' \+ a\.detalle\)\.join\(''\)\)\}<\/small>` : ''\}/, 'el perfil del empleado');
});

test('los cinco «y … y» de la app usan textoDias del modelo («lunes, martes y jueves»)', () => {
  assert.match(html, /`Sin cambios en la \$\{sem\}: libra \$\{\(q\.libra \|\| \[\]\)\.length \? textoDias\(q\.libra\) : 'como siempre'\}\.`/, 'el pie de la ficha sin cambio');
  assert.match(html, /toast\(`\$\{p\.nombre\} ya libra \$\{textoDias\(dias\)\} de siempre: no hay nada que cambiar`/, 'el aviso de la ficha al marcar sus días de siempre');
  assert.match(html, /' · libra ' \+ textoDias\(p\.libra\)/, 'la cabecera de la Cobertura y del perfil');
  assert.strictEqual((html.match(/' · libra ' \+ textoDias\(p\.libra\)/g) || []).length, 2, 'las dos (Cobertura y perfil)');
  assert.match(html, /\(de siempre: \$\{\(p\.libra \|\| \[\]\)\.length \? esc\(textoDias\(p\.libra\)\) : 'ningún día fijo'\}\)/, 'el Generador · cambiar el día libre');
  assert.doesNotMatch(html, /p\.libra\.map\(d => DIAS_L\[d\]\.toLowerCase\(\)\)\.join\(' y '\)/, 'ninguna lista de días de siempre a pelo con « y »');
  assert.doesNotMatch(html, /q\.libra\.map\(x => lblDowPl\(x\)\)\.join\(' y '\)/);
  assert.doesNotMatch(html, /dias\.map\(d => DIAS_L\[d\]\.toLowerCase\(\)\)\.join\(' y '\)/);
});

test('la Cobertura solo ofrece los turnos afectados que la persona trabaja (a Iván, «Todos» y «Tarde»), y una franja marcada que no es suya se quita al cambiar de persona', () => {
  assert.match(html, /\$\{\(p \? franjasDeTrabajo\(p\) : FRANJAS\)\.map\(f => `<button type="button" class="dowk\$\{COB\.franjas\.length === 1 && COB\.franjas\[0\] === f \? ' on' : ''\}" data-fr="\$\{f\}">\$\{FRANJA_LBL\[f\]\}<\/button>`\)\.join\(''\)\}/, 'los botones, por franjasDeTrabajo');
  assert.match(html, /if \(p && COB\.franjas\.some\(f => !franjasDeTrabajo\(p\)\.includes\(f\)\)\) COB\.franjas = \[\];/, 'la marcada que no es suya se quita');
  assert.doesNotMatch(html, /data-fr="M">Mañana<\/button><button type="button" class="dowk[^"]*" data-fr="T">Tarde<\/button>/, 'ya no van a pelo');
});

test('la tarjeta de Equipo de quien tiene salida futura dice «se va el d/m»; la ficha dice «el 8/10» para una ausencia de un día; el alta idéntica no repite el historial', () => {
  assert.match(html, /\$\{baja \? ' · de baja' : p\.standby \? ' · en standby' : ''\}\$\{salidaDe\(p\) && !haSalido\(p, isoHoy\(\)\) \? ` · se va el \$\{fmtDM\(salidaDe\(p\)\.desde\)\}` : ''\}/, 'la tarjeta');
  assert.match(html, /\$\{a\.hasta === a\.desde \? 'el ' \+ fmtDM\(a\.desde\) : 'del ' \+ fmtDM\(a\.desde\) \+ \(a\.hasta \? ' al ' \+ fmtDM\(a\.hasta\) : ' sin fecha de fin'\)\}/, 'la fila de la ficha');
  assert.match(html, /const yaEstaba = JSON\.stringify\(personaDe\(prueba, pid\)\.ausencias\) === JSON\.stringify\(p\.ausencias\);/, 'el alta mira si cambia algo');
  assert.match(html, /if \(yaEstaba && !sim\.quitados\.length && !sim\.puestos\.length && !sim\.relevos\.length\) \{ toast\(`\$\{p\.nombre\} ya tenía apuntada esa ausencia: no hay nada que cambiar`, 'ok'\); return null; \}/, 'y si no cambia nada, ni historial ni Ctrl+Z');
});

test('al cargar, una ausencia en una franja que la persona no trabaja se quita y queda en el historial; y «Quién libra cada día» enseña «sin plaza» aparte de «libra» (Generador y hoja impresa)', () => {
  assert.match(html, /for \(const x of normalizarAusencias\(estado\.staff\)\) if \(!empleado\) apuntarEn\(estado, `Ausencia quitada al cargar: \$\{x\.nombre\}, \$\{etiquetaAusencia\(x\.ausencia\)\} \$\{rangoAusencia\(x\.ausencia\)\}: no hace \$\{FRANJA_LBL\[x\.ausencia\.franjas\[0\]\]\.toLowerCase\(\)\}s, así que no contaba para nada`, 'aus'\);/, 'migrarEstado la quita y lo apunta');
  assert.match(html, /\$\{\(res\.sinPlaza\[iso\] \|\| \[\]\)\.map\(pid => `<span class="glchip gsinplaza" style="--pc:\$\{avColor\(pid\)\}" title="Esta semana trabaja este día \(su cambio de día libre\), pero no tiene turno: ponle uno o cambia su día libre">\$\{nc\(pid\)\} · sin plaza<\/span>`\)\.join\(''\)\}/, 'la tabla del Generador');
  assert.match(html, /\$\{sinPl\.map\(pid => `<span class="sinplaza">\$\{esc\(nombrePid\(pid\)\)\} · sin plaza<\/span>`\)\.join\(''\)\}/, 'la hoja impresa');
  assert.match(html, /\.glchip\.gsinplaza\{/, 'con su estilo');
});

test('el selector «Cuándo» de la ausencia solo ofrece las franjas que la persona trabaja, en la tarjeta, la ficha y el Mes', () => {
  assert.match(html, /function selFranjaAusencia\(attr, p\) \{\n\s*return `<select \$\{attr\} data-libre><option value="">Día entero<\/option>\$\{franjasDeTrabajo\(p\)\.map\(f => `<option value="\$\{f\}">Solo \$\{FRANJA_LBL\[f\]\.toLowerCase\(\)\}<\/option>`\)/, 'una sola pieza, con la persona: sus franjas (franjasDeTrabajo)');
  assert.match(html, /selFranjaAusencia\('data-f="franja"', p\)/, 'la tarjeta de Equipo');
  assert.match(html, /selFranjaAusencia\('id="fAusFr"', p\)/, 'la ficha');
  assert.match(html, /selFranjaAusencia\('id="ausFr" class="logininp"', p\)/, 'el Mes');
  assert.doesNotMatch(html, /selFranjaAusencia\('[^']*'\)/, 'ninguna llamada sin la persona');
});

test('Entrevistas pasa la fecha de hoy al modelo (fechaCandidato y ordenarCandidatos no miran el reloj)', () => {
  assert.match(html, /const iso = fechaCandidato\(c, isoHoy\(\)\);/);
  assert.match(html, /ordenarCandidatos\(todos, isoHoy\(\), ENT\.orden\)/);
  assert.match(html, /ordenarCandidatos\(listaCandidatos\(\), isoHoy\(\), ENT\.orden\)/);
  assert.doesNotMatch(html, /ordenarCandidatos\([^)]*, null, ENT\.orden\)/, 'ninguna llamada con null');
  assert.doesNotMatch(html, /fechaCandidato\(c\)/, 'ninguna llamada sin fecha');
});

test('la ficha enseña el cambio de día libre con el texto del modelo (textoCambioLibre), también en la confirmación y el historial', () => {
  assert.match(html, /return d\.length \? `La \$\{sem\} \$\{textoCambioLibre\(q, \{ semana: lpSem, dias: d \}\)\}\.`/, 'el pie de «Esta semana libra otro día»');
  assert.match(html, /function textoMoverDiaLibre\([^)]*\) \{[\s\S]{0,400}?\$\{p\.nombre\} \$\{textoCambioLibre\(p, \{ semana: lunes, dias \}\)\}/, 'la confirmación al mover el día libre');
  assert.match(html, /la semana del \$\{fmtDDMM\(l0\)\} \$\{textoCambioLibre\(p, \{ semana: l0, dias \}\)\}/, 'la línea del historial');
  assert.doesNotMatch(html, /' en vez de ' \+ txtD\(p\.libra\)/, 'sin el «en vez de» a pelo con todos sus días de siempre');
});
