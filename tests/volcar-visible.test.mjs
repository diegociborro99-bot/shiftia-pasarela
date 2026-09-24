// Reunión del 15/09: «me falta el botón que lo vuelque» y «un botón visible/invisible
// para que la semana les llegue a los trabajadores cuando esté lista».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(RAIZ, 'index.html'), 'utf8');

test('el generador semanal vuelca a la planilla con un botón claro, también desde la hoja impresa', () => {
  // desde la revisión F3 el botón también cuenta los relevos «cubre a» (y el «por» que se quita)
  assert.match(html, /Volcar a la planilla \(\$\{\[res\.aplicados \? pl\(res\.aplicados, 'plaza nueva', 'plazas nuevas'\)/);
  assert.match(html, /pl\(res\.relevos, 'relevo «cubre a»', 'relevos «cubre a»'\)/);
  assert.match(html, /Ya está volcada en la planilla/);
  assert.match(html, /id="pVolcar"/);
  assert.match(html, /abrirImpresionSemanaGenerada\(GEN\.previa, \{ titulo: 'Planilla propuesta', volcar:/);
});
test('Semana y Mes llevan el botón «visible para el equipo» por mes; el mes en curso siempre se ve', () => {
  assert.match(html, /id="wVisible"/);
  assert.match(html, /id="mVisible"/);
  assert.match(html, /function alternarPublicado\(claves\)/);
  assert.match(html, /function mesSiemprePublico\(k\) \{ return k <= isoHoy\(\)\.slice\(0, 7\); \}/);
  assert.match(html, /registrarCambio\(hacerVisible \? `Planilla de \$\{nombre\} visible para el equipo`/);
});
