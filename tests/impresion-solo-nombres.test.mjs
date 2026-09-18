// 18/09, reunión con José. Lo repitió siete veces:
//   «Al imprimir. Que no aparezcan nunca horas.» · «Sin las horas y sin mañana y tarde.»
//   «Todo eso de forzado a mano, por Jenny, de partido, todo eso debería al imprimir
//   quitarse.» · «Solo los nombres. Ni los números ni nada. 12123.» · «Ni forzado.»
//   «Ni estimado ni por, solo nombres.»
//
// El papel no es para la oficina: Aroa imprime UNA hoja, la recorta en cuatro y deja un
// trozo en cada bar. Al equipo solo le hace falta saber quién trabaja. Lo que es de la
// oficina —huecos, casillas cortas, forzados, posiciones— se mira en la app.
//
// NO cambian: la hoja de HORAS (es de la nómina y vive de las horas) ni la del GENERADOR
// («Imprimir la planilla propuesta»), que es con la que Aroa repasa antes de volcar y donde
// el número de posición, el hueco y el «forzado» son justo lo que hay que mirar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(RAIZ, 'src/app/14-impresiones.js'), 'utf8');
const html = readFileSync(join(RAIZ, 'index.html'), 'utf8');

// el trozo de una función, de su cabecera a la línea que la cierra
const fn = (txt, nombre) => {
  const i = txt.indexOf(`function ${nombre}(`);
  assert.ok(i >= 0, `existe ${nombre}`);
  return txt.slice(i, txt.indexOf('\n}', i) + 2);
};

test('hay un solo interruptor, no la condición repetida por toda la hoja', () => {
  assert.match(src, /const PX = \{ soloNombres: false \}/, 'un único sitio donde se decide');
  assert.match(src, /function pxHojaDelEquipo\(/, 'y una función que lo pone y lo quita');
});

test('las hojas del equipo lo encienden; las de la oficina, no', () => {
  // las dos semanales son las que Aroa imprime y recorta para dejar en cada bar
  for (const f of ['abrirImpresion', 'abrirImpresionLocal'])
    assert.match(fn(src, f), /pxHojaDelEquipo\(/, `${f} imprime solo nombres`);
  // el tablón del MES es personas × días y su vocabulario entero es la píldora M/T/P:
  // quitarla deja píldoras de color vacías. No es la hoja que se recorta para el bar, así
  // que se queda como está hasta que el cliente diga lo contrario (ver DISEÑO.md).
  for (const f of ['abrirImpresionSemanaGenerada', 'abrirImpresionHoras', 'abrirImpresionMes'])
    assert.ok(!/pxHojaDelEquipo\(/.test(fn(src, f)), `${f} conserva el detalle`);
});

test('la casilla impresa no lleva número de posición, ni P/C, ni ▸ □, ni «por», ni «forzado»', () => {
  const s = fn(src, 'pxSlot');
  assert.match(s, /PX\.soloNombres/, 'pxSlot mira el interruptor');
  // con el interruptor puesto se devuelve pronto, antes de armar marcas y subtítulos
  const pronto = s.slice(0, s.indexOf('const mk ='));
  assert.match(pronto, /if \(PX\.soloNombres\)/, 'y corta antes de armar nada de eso');
  const i0 = pronto.indexOf('if (PX.soloNombres)');
  const devuelve = pronto.slice(i0, pronto.indexOf('\n', i0));   // solo esa línea, no la del hueco de abajo
  // «pxg-n"» es el número de posición; «pxg-nm» es el nombre y ese sí va
  for (const prohibido of ['pxg-n"', 'pxg-tag', 'pxg-mk', 'forzado a mano', 'Hueco disponible', 'por ${'])
    assert.ok(!devuelve.includes(prohibido), `«${prohibido}» no puede salir en la hoja del equipo`);
  assert.ok(devuelve.includes('pxg-nm'), 'y el nombre sí');
});

test('un hueco sin cubrir no se imprime: el equipo no tiene que arreglarlo', () => {
  const s = fn(src, 'pxSlot');
  assert.match(s, /Hueco disponible/, 'sigue existiendo para la hoja del generador');
  assert.match(s.slice(0, s.indexOf('Hueco disponible')), /if \(PX\.soloNombres\)/, 'pero antes se ha cortado');
});

test('tampoco la cuenta «n/min*», ni «faltan 2», ni «+1 hueco», ni «corregido»', () => {
  assert.match(fn(src, 'pxCuenta'), /if \(PX\.soloNombres\) return ''/);
});

test('ni la leyenda que explica símbolos que ya no salen', () => {
  assert.match(fn(src, 'pxLeyendaCasilla'), /if \(PX\.soloNombres\) return ''/);
});

test('ni las horas del local, ni «Mañana»/«Tarde» en la fila (José, al pie de la letra)', () => {
  assert.match(fn(src, 'horarioTxt'), /if \(PX\.soloNombres\) return ''/, 'las horas se callan en origen');
  assert.match(src, /PX\.soloNombres \? '' : FRANJA_LBL\[f\]/, 'y la etiqueta de la franja también');
});

test('ni el rojo del hueco ni el ámbar del turno corto: son avisos de oficina', () => {
  assert.match(fn(src, 'pxCasilla'), /PX\.soloNombres \? '' : \[hueco/);
});

test('la cabecera no habla de franjas, ni de posiciones, ni de la regla de cocina', () => {
  const f = fn(src, 'abrirImpresion');
  assert.ok(!/mañana y tarde/.test(f), 'el subtítulo ya no dice «mañana y tarde»');
  assert.ok(!/el 1\.º abre/.test(f), 'ni explica las posiciones');
  assert.match(src, /PX\.soloNombres \? 'Local' : 'Local · franja'/, 'la primera columna es solo «Local»');
  assert.match(src, /PX\.soloNombres \? '' : esc\(descripcionCocina/, 'y no lleva la regla de cocina del local');
});

test('ni el partido del sábado dice «· tarde»', () => {
  assert.match(fn(src, 'pxThDia'), /!PX\.soloNombres && e\.franja/);
});

test('lo que SÍ queda: el local, el día y los nombres', () => {
  const s = fn(src, 'pxSlot');
  assert.match(s, /esc\(s\.nombre\)/, 'el nombre');
  assert.match(fn(src, 'pxThDia'), /DIAS_L\[c\.dow\]/, 'el día');
});

test('la hoja de horas sigue llevando horas: es la de la nómina', () => {
  assert.ok(!/pxHojaDelEquipo/.test(fn(src, 'abrirImpresionHoras')));
  assert.match(html, /id="hPrint"/);
});
