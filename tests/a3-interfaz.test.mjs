// Fase A3 de la auditoría del modelo (30/09, cierres y semana tipo): lo que la interfaz tiene que hacer con lo que ahora hace el
// modelo, comprobado sobre el index.html ensamblado (INDEX permite pasar la prueba por otra copia de la app, la de antes, para
// verla en rojo).
//  · el visor del cierre, al editar, sigue leyendo la semana tipo en los días que el cierre de antes leyó de ella (B1), y las
//    sugerencias de apoyo reciben los pendientes (B6);
//  · los textos del visor dicen lo que hace el modelo con las vacaciones de quien ese día tiene otro turno (media jornada), y
//    «Ver cierre» enseña la media jornada y dice «no se pudo poner» solo cuando ya estaba ausente (B5);
//  · «Guardar como semana tipo» avisa del cierre por fechas de esa semana (D1), de los días sin plazas (D6) y de los «Sale
//    primero» a mano que no se conservan (D3).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(process.env.INDEX || join(RAIZ, 'index.html'), 'utf8');

test('el visor, al editar un cierre, lee la semana tipo en los días que el cierre de antes leyó de ella (semanaTipoAlEditar), y las sugerencias de apoyo reciben los pendientes y esos días', () => {
  assert.match(html, /const deST = semanaTipoAlEditar\(previo, c\);/, 'una sola lectura, la del modelo');
  assert.match(html, /return \{ c, cfg, st, e, dias: ds, pend, deST, afectados: afectadosPorCierre\(cfg, st, e, c, \{ pendientes: pend, semanaTipo: deST \}\), sug: \{\} \};/, 'el contexto del visor');
  assert.match(html, /x\.sug\[pid\] = sugerenciasRefuerzo\(x\.cfg, x\.st, x\.e, x\.c, pid, \{ pendientes: x\.pend, semanaTipo: x\.deST \}\);/, 'las sugerencias, con lo mismo');
  assert.doesNotMatch(html, /sugerenciasRefuerzo\(x\.cfg, x\.st, x\.e, x\.c, pid\)/, 'ninguna llamada sin los pendientes');
});

test('los textos del visor: la ausencia de quien ese día tiene otro turno es solo de la franja cerrada (paso 2 y resumen), y «Ver cierre» enseña la media jornada', () => {
  assert.doesNotMatch(html, /la parte cerrada cuenta como sin trabajo/, 'el modelo no hace eso desde D10');
  assert.doesNotMatch(html, /no se le pone \$\{tipo === 'VAC' \? 'vacaciones' : 'día libre'\} \(es de día entero\)/);
  assert.doesNotMatch(html, /no se le ponen vacaciones ni día libre/);
  assert.doesNotMatch(html, /'no se pudo poner: ese día tenía otro turno'/);
  assert.match(html, /function avisosParcialCierre\(a, tipo\) \{[\s\S]{0,700}?así que \$\{tipo === 'VAC' \? 'las vacaciones son' : 'el día libre es'\} solo de la \$\{fs\}`;/, 'un aviso por día, con lo que hace el modelo');
  assert.match(html, /const parciales = avisosParcialCierre\(a, tipo\);/, 'la tarjeta del paso 2');
  // (corrección de A3; revisión del cliente 6) con vacaciones o día libre, el aviso de la media jornada sustituye al genérico
  assert.match(html, /const avisos = parciales\.length \? parciales\.map\(t => t \+ '\.'\) : a\.avisos;/, 'sustituye al genérico, no se suma');
  assert.match(html, /\$\{avisos\.map\(t => `<p class="cieaviso">\$\{esc\(t\.charAt\(0\)\.toUpperCase\(\) \+ t\.slice\(1\)\)\}<\/p>`\)\.join\(''\)\}/);
  assert.match(html, /const generico = a\.avisos\.find\(t => t\.startsWith\(`el \$\{diaYNum\(iso\)\} `\)\);/, 'reutiliza el texto del modelo (con el tramo del partido)');
  assert.match(html, /const parciales = x\.afectados\.map\(a => \(\{ a, xs: avisosParcialCierre\(a, tipoDe\(a\.pid\)\) \}\)\)\.filter\(x => x\.xs\.length\);/, 'el resumen del paso 3, por persona');
  assert.match(html, /function diasAusenciaCierreTxt\(d, turnos\) \{[\s\S]{0,600}?\(no se pudo poner: ya estaba ausente\)/, '«Ver cierre»: la media jornada (d.parciales) y «no se pudo poner» solo si ya estaba ausente');
  assert.match(html, /\(d\.tipo === 'VAC' \|\| d\.tipo === 'LD'\) \? diasAusenciaCierreTxt\(d, turnos\) : diasTxt\(turnos\)/);
});

test('«Guardar como semana tipo» calcula la semana tipo antes de preguntar y avisa del cierre por fechas, de los días sin plazas y de los «Sale primero» que no se conservan', () => {
  assert.match(html, /const nuevo = patronDesdeSemana\(estadoSemana\(lunes, false\), lunes, S, S\.staff, \{ avisos: avisosAbre \}\);/, 'con el colector de avisos del modelo');
  assert.match(html, /const cierres = cierresDe\(S\)\.filter\(c => diasDeCierre\(c\)\.some\(iso => iso >= lunes && iso <= fin\)\);/);
  assert.match(html, /Esta semana hay un cierre por fechas \(\$\{cierres\.map\(c => textoCierre\(S, c\)\)\.join\('; '\)\}\): en las casillas cerradas se guardan las plazas de la semana tipo de antes, y los apoyos por el cierre no se guardan como plazas fijas\./);
  assert.match(html, /const vacios = \[1, 2, 3, 4, 5, 6, 7\]\.filter\(d => !\(nuevo\[d\] \|\| \[\]\)\.length\);/);
  assert.match(html, /Ojo: \$\{textoDiasEl\(vacios\)\} no \$\{vacios\.length > 1 \? 'tienen' : 'tiene'\} ninguna plaza: la semana tipo se queda vacía esos días\./);
  assert.match(html, /const avisoAbre = avisosAbre\.length \? `\\n\\n\$\{avisosAbre\.join\('\\n'\)\}` : '';/);
  assert.match(html, /\$\{aviso\}\$\{avisoCierre\}\$\{avisoVacios\}\$\{avisoAbre\}`\)\) return;/, 'todo en la misma confirmación');
  assert.match(html, /las casillas cerradas, como en la semana tipo de antes/, 'y el historial lo apunta');
});

// ---------- corrección de A3 tras la revisión (30/09): cliente 1, 2, 4, 5, 7 y modelo 7 en la interfaz ----------
test('el visor: destinos de cocina con su puesto, el motivo de quien no puede reforzar la sala y «Apoyo» desactivado sin ningún sitio; el aviso de más de 62 días; el resumen, el toast y el historial con lo que vuelve de la semana tipo; «semana sin planificar» en vez de «0 plazas retiradas»', () => {
  // cliente 2 / modelo 7: el valor de la opción lleva el puesto y el resumen lo dice
  assert.match(html, /const v = s\.puesto === 'cocina' \? `\$\{s\.tid\}\|cocina` : s\.tid;/, 'el destino guardado lleva el puesto');
  assert.match(html, /const \{ tid, puesto \} = destinoCierre\(t\); const \{ localId, franja \} = t \? partirTurno\(tid\) : \{\};/, 'destinosTxt lee el destino con destinoCierre');
  assert.match(html, /const \{ tid, puesto \} = destinoCierre\(dest\); return nombrePid\(pid\)/, 'y la tarjeta «Cerrado hoy» también');
  assert.match(html, /const motivos = dias\.map\(iso => \(sug\.motivos \|\| \{\}\)\[iso\]\)\.filter\(Boolean\);/, 'el motivo del modelo (sugerenciasRefuerzo.motivos)');
  assert.match(html, /const sinApoyo = motivos\.length > 0 && dias\.every\(iso => !\(sug\[iso\] \|\| \[\]\)\.length\);/);
  assert.match(html, /\$\{motivos\.map\(t => `<p class="cieaviso ciemotivo">\$\{esc\(t\)\}\.<\/p>`\)\.join\(''\)\}/, 'la tarjeta enseña el motivo');
  assert.match(html, /d\.id === 'REFUERZA' && sinApoyo && tipo !== 'REFUERZA' \? ` disabled title="\$\{esc\(motivos\.join\('\. '\)\)\}"`/, '«Apoyo» desactivado con el motivo');
  // cliente 4: más de 62 días
  assert.match(html, /const tope = addDias\(CIE\.ini, MAX_DIAS_CIERRE - 1\);/);
  assert.match(html, /un cierre no puede pasar de \$\{MAX_DIAS_CIERRE\} días: se cierra hasta el \$\{fechaCortaCierre\(tope\)\}/);
  assert.match(html, /id="cieFin" class="logininp" data-libre value="\$\{esc\(CIE\.fin\)\}" max="\$\{esc\(tope\)\}"/, 'max en el selector de fin');
  assert.match(html, /\$\{largo \? `<p class="cieerr">\$\{esc\(largo\)\}<\/p>` : ''\}/);
  // cliente 1: lo que vuelve de la semana tipo al acortar o reabrir
  assert.match(html, /function textoRepuestos\(r\) \{[\s\S]{0,900}?de la semana tipo`;/, 'una sola pieza para el toast y el historial');
  assert.match(html, /function casillasQueReabren\(previo, c\) \{[\s\S]{0,900}?franjasSemanaTipo\(previo, iso\)/, 'el resumen del paso 3 lo anticipa');
  assert.match(html, /const reabren = casillasQueReabren\(CIE\.id \? cierresDe\(S\)\.find\(c => c\.id === CIE\.id\) : null, x\.c\);/);
  assert.match(html, /vuelve a abrir\$\{r\.nombres\.length \? `: \$\{r\.nombres\.length > 1 \? 'vuelven' : 'vuelve'\} \$\{esc\(enumerar\(r\.nombres\)\)\} de la semana tipo \(si pueden estar\)`/);
  assert.match(html, /const repuestos = textoRepuestos\(r\);\n  registrarCambio\(`\$\{textoCierre\(S, c\)\}\$\{previo \? ' \(editado\)' : ''\} · \$\{retiradas\}/, 'el historial al guardar');
  assert.match(html, /reabierto \(\$\{txt\}\)[\s\S]{0,700}?\$\{repuestos \? ` · \$\{repuestos\}` : ''\}`, 'local'\);/, 'y al reabrir');
  assert.match(html, /reabierto · \$\{pl\(r\.devueltos\.length, 'plaza vuelve', 'plazas vuelven'\)\}[\s\S]{0,300}?\$\{repuestos \? ` · \$\{repuestos\}` : ''\}/, 'el toast al reabrir');
  // cliente 7: sobre una semana sin planificar
  assert.match(html, /semana sin planificar: \$\{pl\(Object\.keys\(c\.decisiones\)\.length, 'persona con decisión', 'personas con decisión'\)\} \(el generador lo respetará\)/);
  assert.doesNotMatch(html, /toast\(`\$\{textoCierre\(S, c\)\} · \$\{pl\(r\.retirados, 'plaza retirada', 'plazas retiradas'\)\}/, 'el toast ya no dice «0 plazas retiradas» sobre la semana tipo');
  // cliente 5: el apoyo sin sitio de quien trabaja la otra franja, en la fila «Sin trabajo por un cierre» del Generador
  assert.match(html, /sinSitioP = res\.apoyoSinSitioParcial \|\| \{\};/);
  assert.match(html, /\$\{nc\(x\.pid\)\} · \$\{esc\(x\.franjas\.map\(f => FRANJA_LBL\[f\]\.toLowerCase\(\)\)\.join\(' y '\)\)\} · apoyo sin sitio<\/span>/);
});
