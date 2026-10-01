// Fase A5 de la auditoría del modelo (01/10, cobertura): lo que la interfaz tiene que hacer con lo que ahora hace el modelo,
// comprobado sobre el index.html ensamblado (INDEX permite pasar la prueba por otra copia de la app, la de antes, para verla en
// rojo). Lo que se ve con clics lo comprueba e2e-a5.
//  · la Cobertura propone y aplica «solo desde hoy» (desdeIso: isoHoy(), F1) y dice lo que ya ha pasado (en la tira, en el
//    resultado y al aplicar);
//  · el turno a cambio de un cambio de turno enseña sus avisos (F2) y lo que pasa del tope de días marcados se dice (F5);
//  · quien está en standby o de baja sin fin no «le cubre» en Equipo ni en la ficha, y se dice por qué (sospecha F).
// Y lo de la corrección tras las dos revisiones (01/10; M-Hx modelo, C-Hx / C-Sx cliente):
//  · la pestaña pasa la hora de Madrid con «hoy» (opts.ahoraHM, C-H1) y trae los días que pide el modelo por tramos
//    (diasNecesarios, M-H3), para proponer y para aplicar;
//  · el aviso del turno a cambio, el mismo texto en la fila, la vista previa, lo aplicado y el historial (C-H2, C-H3);
//  · la cabecera nombra a quien ahora no cubre (C-H5); Equipo mira las designadas desde hoy (M-H4) y el chip «Cubre a» de quien
//    cubre dice si está en standby (C-H6); al quitar una ausencia se dice quién entró por ella (C-H12);
//  · el CSS nuevo va en su fichero y 26-pasarela-movil.css sigue el último.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(process.env.INDEX || join(RAIZ, 'index.html'), 'utf8');

test('la Cobertura propone y aplica «solo desde hoy» (F1), con la hora de Madrid (corrección C-H1) y los días que pide el modelo (M-H3)', () => {
  assert.match(html, /const desdeHoyCob = \(\) => \(\{ desdeIso: isoHoy\(\), ahoraHM: horaMadrid\(\) \}\);/, 'hoy y la hora');
  assert.match(html, /function horaMadrid\(\) \{[^]*?timeZone: 'Europe\/Madrid'/, 'la hora de Madrid');
  assert.match(html, /const res = planesCobertura\(S, S\.staff, base, inc, Object\.assign\(\{ siempre: COB\.siempre, intercambio: COB\.tipo === 'CAMBIO' && COB\.intercambio, meses: S\.meses \}, desdeHoyCob\(\)\)\);/, 'proponer con desdeIso y ahoraHM');
  assert.match(html, /const r = aplicarCobertura\(S, S\.staff, real, inc, plan, desdeHoyCob\(\)\);/, 'aplicar con desdeIso y ahoraHM');
  assert.match(html, /const rango = rangoNecesario\(inc\), diasEstado = diasNecesarios\(inc\);\s*const base = clonarEstado\(estadoDias\(diasEstado, false\)\);/, 'proponer con los días por tramos');
  assert.match(html, /const real = estadoDias\(res\.diasEstado \|\| diasNecesarios\(inc\), true\);/, 'aplicar sobre los mismos días');
});

test('la tira, el resultado y lo aplicado dicen lo que ya ha pasado (F1)', () => {
  assert.match(html, /class="cobdejadas cobpasnota"/, 'la nota de la tira');
  // (corrección C-H10) la nota nombra los días («Del 22/9 al 23/9 ya han pasado: …») y, con la hora, lo de hoy ya terminado
  assert.match(html, /ya han pasado: se apuntan en su ficha y sale de esos turnos, pero no se cubren'\}: nadie entra en días ya trabajados\./, 'el texto de la tira');
  assert.match(html, /\$\{capi\(textoTramos\(pasMarcados\)\)\}/, 'con los días');
  assert.match(html, /Hoy, \$\{listaY\(hoyTerminadas\.map\(f => 'la ' \+ f\)\)\} ya ha terminado/, 'y lo de hoy ya terminado');
  assert.match(html, /class="cobdejadas cobpasados"/, 'el aviso del resultado');
  assert.match(html, /const pas = res\.pasados \|\| \[\];/, 'el resultado lee res.pasados');
  assert.match(html, /\(r\.pasados \|\| \[\]\)\.length/, 'lo aplicado lee r.pasados');
});

test('el turno a cambio enseña sus avisos (F2) y el tope de días marcados se dice (F5)', () => {
  assert.match(html, /x\.intercambio\.avisos/, 'los avisos del intercambio');
  // (corrección C-H2 y C-H3) un solo texto para el aviso del turno a cambio, también «sin turno a cambio», en la fila, la vista
  // previa, lo aplicado y el historial
  assert.match(html, /const avisoCambioCob = \(x, nombre\) => x\.sinIntercambio \? `sin turno a cambio: \$\{nombre\} se queda sin ese turno` : x\.intercambio && \(x\.intercambio\.avisos \|\| \[\]\)\.length \? `aviso: ese turno de \$\{nombreCorto\(x\.nombre \|\| nombrePid\(x\.pid\)\)\} se queda \$\{listaY\(x\.intercambio\.avisos\)\}` : '';/, 'en palabras de bar');
  assert.ok((html.match(/avisoCambioCob\(/g) || []).length >= 5, 'en la fila, la vista previa y lo aplicado');
  assert.match(html, /P\.avisosCambio \? '<span class="evst p">cubre todo, con aviso<\/span>'/, 'el plan con aviso del turno a cambio no es «cubre todo» a secas');
  assert.match(html, /class="cobdejadas cobtrunc"/, 'el aviso del tope');
  assert.match(html, /res\.truncado/, 'lee res.truncado');
});

test('quien está en standby o de baja sin fin no «le cubre» en Equipo ni en la ficha, y se dice por qué (sospecha F)', () => {
  assert.match(html, /quienLeCubre\(S, S\.staff, p\.id, isoHoy\(\)\)/, 'con la fecha de hoy');
  assert.match(html, /d\.inactiva/, 'el porqué');
  assert.doesNotMatch(html, /quienLeCubre\(S, S\.staff, p\.id\)[^,]/, 'ninguna llamada sin fecha');
  // (corrección M-H4) la confirmación de Equipo mira el primer día que se cubre: hoy, si la ausencia empezó antes
  assert.match(html, /quienLeCubre\(S, S\.staff, p\.id, a\.desde < hoy \? hoy : a\.desde\)/, 'desde hoy');
  // (corrección C-H5) la cabecera de la Cobertura nombra a quien ahora no cubre, con el porqué
  assert.match(html, /res\.designadosInactivos/, 'la cabecera');
  assert.match(html, /\$\{d\.nombre\} \(\$\{d\.inactiva\.replace\(\/\^está \/, ''\)\}: ahora no cubre\)/, '«Dulce (en standby: ahora no cubre)»');
  // (corrección C-H6) el lado de quien cubre: la tarjeta y la ficha
  assert.ok((html.match(/quienLeCubre\(S, S\.staff, cb\.pid, isoHoy\(\)\)\.find\(d => d\.pid === p\.id && d\.inactiva\)/g) || []).length === 2, 'tarjeta y ficha de quien cubre');
});

test('al quitar una ausencia, el aviso dice quién entró por ella y sale al volver a generar (corrección C-H12)', () => {
  assert.match(html, /function quitarAusenciaUI\(pid, idx\) \{[^]*?motivoRetirada\(S, S\.staff, e, iso, t\.id, x\)[^]*?entró por \$\{p\.nombre\} el \$\{quien\[0\]\.dias\}: sale al volver a generar la semana, o quítalo ahora/);
});

test('el CSS de la Cobertura va en su fichero, antes del del móvil (corrección C-H10 y la «×» del móvil)', () => {
  const css = readdirSync(join(RAIZ, 'src', 'styles')).filter(f => f.endsWith('.css')).sort();
  assert.ok(css.includes('25-pasarela-cobertura.css'), 'el fichero');
  assert.strictEqual(css[css.length - 1], '26-pasarela-movil.css', 'el del móvil, el último');
  assert.match(html, /\.cobdia\.pasado\{opacity:\.55;/, 'el día pasado, atenuado y rayado');
  assert.match(html, /#cobOvl \.ovcard \.ovx\{position:absolute;float:none;/, 'la «×» de la capa de la Cobertura no flota en el móvil');
});
