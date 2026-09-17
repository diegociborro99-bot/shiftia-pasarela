// La sección «Entrevistas» del administrador existe, es visible como pestaña y
// está marcada «en construcción» hasta que se importe su base de datos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(RAIZ, 'index.html'), 'utf8');

test('hay una pestaña Entrevistas en el menú del administrador', () => {
  assert.match(html, /class="tab" role="tab" data-v="entrevistas"/);
  assert.match(html, /<section class="view hidden" id="view-entrevistas">/);
});
test('la sección son dos menús: entrevistas y alerta interna, con la base ya dentro', () => {
  const sec = html.slice(html.indexOf('id="view-entrevistas"'), html.indexOf('</section>', html.indexOf('id="view-entrevistas"')));
  assert.ok(!/EN CONSTRUCCIÓN/.test(sec), 'ya no está en construcción');
  assert.match(sec, /Entrevistas<\/b> y alerta interna/);
  assert.match(html, /const LISTAS_CAND = \[\s*\{ id: 'ent'/);
  assert.match(html, /const ENTREVISTAS_SEMILLA = \[/);
  assert.match(html, /data-entlista="\$\{l\.id\}"/);
});
test('los filtros combinan puesto y valoración, y el buscador va por nombre o teléfono', () => {
  assert.match(html, /const VALORACIONES = \[\s*\{ id: 'bien'[\s\S]*?\{ id: 'regular'[\s\S]*?\{ id: 'mal'/);
  assert.match(html, /function filtrarCandidatos\(cands, f\)/);
  assert.match(html, /placeholder="Buscar por nombre o teléfono…"/);
  assert.match(html, /const MOTIVOS_ALERTA = \[[\s\S]*?NOACUDE[\s\S]*?PROBLEMA/);
  assert.match(html, /function abrirFichaCand\(id, editar\)/);
});
test('la navegación conoce la vista y el móvil la lista en «Más»', () => {
  assert.match(html, /const VISTAS = \[[^\]]*'entrevistas'/);
  assert.match(html, /const BNAV_EN_MAS = \[[^\]]*'entrevistas'/);
  assert.match(html, /fila\('entrevistas', /);
});
test('el empleado no la ve', () => {
  assert.match(html, /\.modo-empleado #view-entrevistas\{display:none!important\}/);
});
test('las etiquetas llevan los mismos iconos que el grupo usa en su base: sartén, bandeja, pulgares y reloj', () => {
  for (const k of ['SVG_CAMARERO', 'SVG_BIEN', 'SVG_MAL', 'SVG_ESPERA'])
    assert.match(html, new RegExp('const ' + k + ' = ICO\\('), k + ' definido');
  assert.match(html, /const PUESTOS_CAND = \[\s*\{ id: 'cocina'[^}]*ico: 'cocina'[\s\S]*?\{ id: 'sala'[^}]*ico: 'camarero'/);
  assert.match(html, /\{ id: 'bien'[^}]*ico: 'bien' \}/);
  assert.match(html, /\{ id: 'regular'[^}]*ico: 'espera' \}/, 'el reloj de arena es «en espera»');
  assert.match(html, /\{ id: 'mal'[^}]*ico: 'mal' \}/);
  assert.match(html, /\{ id: 'veto'[^}]*ico: 'veto' \}/, 'el ⛔ de la base del grupo');
  assert.match(html, /const SVG_VETO = ICO\(/);
  assert.match(html, /const ICO_CAND = \{ cocina: [\s\S]*?espera: \(\) => SVG_ESPERA,/);
  // y salen tanto en la lista como en los filtros y en la ficha
  assert.match(html, /<em class="entp p-\$\{esc\(x\.id\)\}">\$\{icoCand\(x\.ico\)\}/, 'una etiqueta por cada puesto al que opta');
  assert.match(html, /chip\('val', v\.id, v\.label, r\[v\.id\], icoCand\(v\.ico\)\)/);
  assert.match(html, /\$\{o\.ico \? icoCand\(o\.ico\) : ''\}/, 'la ficha también');
});
test('la entrevista entera del grupo está dentro: aptitudes y campos', () => {
  assert.match(html, /const HABILIDADES = \[[\s\S]*?cafetera[\s\S]*?barril[\s\S]*?bandeja[\s\S]*?cocina[\s\S]*?jamon[\s\S]*?tpv[\s\S]*?pda[\s\S]*?apercierre/);
  assert.match(html, /const SVG_LLAVE = ICO\(/, 'la llave de «aperturas o cierres»');
  assert.match(html, /llave: \(\) => SVG_LLAVE/);
  assert.match(html, /const HAB_ESTADO = \{ si: 'Sí', dudas: 'Con dudas', no: 'No' \}/);
  assert.match(html, /const CAMPOS_ENTREVISTA = \[[\s\S]*?'edad'[\s\S]*?'zona'[\s\S]*?'exp'[\s\S]*?'sueldo'[\s\S]*?'obs'/);
  for (const k of ['SVG_CAFETERA', 'SVG_BARRIL', 'SVG_JAMON', 'SVG_TPV', 'SVG_PDA'])
    assert.match(html, new RegExp('const ' + k + ' = ICO\\('), k);
  assert.match(html, /if \(o\.hab && \(\(c\.hab \|\| \{\}\)\[o\.hab\] !== 'si'\)\) return false;/, 'se puede filtrar por aptitud');
  assert.match(html, /function tieneEntrevista\(c\)/);
  assert.match(html, /data-chab="\$\{h\.id\}\|\$\{e\}"/, 'sí / con dudas / no en la ficha');
});
test('el buscador mira toda la entrevista, no solo el nombre', () => {
  assert.match(html, /return \[c\.nombre, c\.tel, c\.nota\]\.concat\(CAMPOS_ENTREVISTA\.map\(x => c\[x\.k\]\)\)/);
});

test('la ficha se abre como perfil: toda la entrevista a la vista, con un icono por dato', () => {
  // 17/09 (José): «que se vea premium y visual». La ficha ya no es un formulario: es un
  // perfil de lectura con todo lo que sacamos de Notion, y se edita con «Editar».
  assert.match(html, /function fichaCandHTML\(c\)/);
  const campos = html.match(/const CAMPOS_ENTREVISTA = \[[\s\S]*?\n\];/)[0];
  for (const k of ['edad', 'zona', 'fecha', 'exp', 'tipoCocina', 'incorp', 'sueldo', 'horarios', 'cond', 'obs'])
    assert.match(campos, new RegExp(`k: '${k}'[^}]*ico: '`), `${k} lleva su icono en el modelo`);
  for (const k of ['SVG_EDAD', 'SVG_ZONA', 'SVG_FECHA', 'SVG_EXP', 'SVG_TIPOCOCINA', 'SVG_INCORP', 'SVG_SUELDO', 'SVG_HORARIO', 'SVG_COND', 'SVG_OBS', 'SVG_ADJ', 'SVG_TEL', 'SVG_WA', 'SVG_NOTA'])
    assert.match(html, new RegExp('const ' + k + ' = ICO\\('), k + ' definido');
  assert.match(html, /href="tel:\$\{/, 'el teléfono se llama desde la ficha');
  assert.match(html, /wa\.me\/34/, 'y se abre WhatsApp con el prefijo de España');
  assert.match(html, /data-cedit/, 'botón de editar');
  assert.match(html, /data-cperf/, 'y de volver al perfil desde el formulario');
});

test('el perfil del candidato tiene estilo propio (tarjetas de dato, aptitudes y bloques)', () => {
  for (const sel of ['.cperf{', '.cperfhead{', '.cperfk{', '.cperfk.vacio{', '.habchip{', '.cbloq{'])
    assert.ok(html.includes(sel), sel + ' en los estilos');
  assert.match(html, /\.habchip\.s-si\{/, 'las aptitudes se colorean por sí/dudas/no');
});

test('el puesto se marca doble (camarero y cocinero) y la fecha se pone sola al registrar', () => {
  // 17/09 (Aroa): «hay algunos que son Camarero Cocinero, pon la opción para que pueda
  // pulsar las dos» y «la fecha de la entrevista se podría hacer automática el día que abro
  // la casilla? Quizá aparezca lo primero del todo».
  assert.match(html, /function migrarCandidatos\(estado\)/, 'la migración del campo viejo va dentro');
  assert.match(html, /migrarCandidatos\(estado\)/, 'y se llama al cargar el estado');
  assert.match(html, /data-cpto="/, 'cada puesto se pulsa por su cuenta');
  assert.match(html, /puedes marcar los dos/, 'y la ficha lo dice');
  assert.match(html, /fecha: fmtLargo\(isoHoy\(\)\)/, 'al registrar a alguien la fecha ya viene puesta');
  const campos = html.match(/const CAMPOS_ENTREVISTA = \[[\s\S]*?\n\];/)[0];
  assert.match(campos, /\{ k: 'fecha'[^}]*\}[\s\S]*\{ k: 'edad'/, 'la fecha es el primer dato de todos, antes que la edad');
  assert.ok(campos.indexOf("k: 'fecha'") < campos.indexOf("k: 'nombre'") || !/k: 'nombre'/.test(campos));
  assert.ok(!/function icoPuesto|c\.puesto ===/.test(html.slice(html.indexOf('function filaCand'), html.indexOf('function abrirFichaCand'))), 'la fila ya no mira un puesto suelto');
});

test('«el entrevistado busca» va detrás de Horarios, con varias opciones a la vez', () => {
  // 17/09 (Aroa): «a continuación de horarios pondría un botón que ponga: el entrevistado
  // busca — mañanas, tardes, turno partido, fin de semana y otro que ponga no tiene
  // problemas», y Diego: «que puedas elegir también varias opciones, no solo una».
  assert.match(html, /El entrevistado busca/);
  assert.match(html, /puedes marcar varias/);
  assert.match(html, /data-cbus="/, 'cada opción se pulsa por su cuenta');
  assert.match(html, /x\.k === 'horarios'/, 'el bloque se cuela justo detrás del campo Horarios');
  assert.match(html, /const SVG_SOL = ICO\(/); assert.match(html, /const SVG_LUNA = ICO\(/);
  assert.match(html, /sol: \(\) => SVG_SOL, luna: \(\) => SVG_LUNA/);
});

test('las mismas palabras en la ficha y en los filtros: cocinero/camarero, y plural al filtrar', () => {
  assert.match(html, /chip\('puesto', x\.id, x\.plural/, 'los filtros agrupan gente: «Cocineros», «Camareros»');
  assert.match(html, /<em class="entp p-\$\{esc\(x\.id\)\}">\$\{icoCand\(x\.ico\)\}\$\{esc\(x\.label\)\}/, 'y cada persona lleva el suyo en singular');
  assert.ok(!/corto: 'Cocina'|corto: 'Sala'/.test(html), 'ya no quedan «Cocina»/«Sala» como etiqueta de puesto');
});
