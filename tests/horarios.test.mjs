// Horarios que confirmó la encargada por WhatsApp (15/09): mañana de 07:00 a 16:00 (los
// fines de semana desde las 08:00) y tarde de 16:00 hasta el cierre, aproximadamente las
// 00:00. El turno partido cuenta dos tramos, no dos jornadas enteras.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(RAIZ, 'index.html'), 'utf8');

test('la planilla de fábrica trae los horarios reales y los tramos del partido', () => {
  assert.match(html, /M: \{ ini: '07:00', fin: '16:00' \}, T: \{ ini: '16:00', fin: '00:00' \}/);
  assert.match(html, /porDow: \{ 6: \{ M: \{ ini: '08:00', fin: '16:00' \} \}, 7: \{ M: \{ ini: '08:00', fin: '16:00' \} \} \}/);
  assert.match(html, /const horarioPartido = \(\) => \(\{ M: \{ ini: '12:00', fin: '16:00' \}, T: \{ ini: '20:00', fin: '00:00' \} \}\)/);
  assert.match(html, /horarioSupuesto: false, cierreAprox: true/);
});
test('una planilla ya guardada se migra al cargarla, sin pisar lo editado a mano', () => {
  assert.match(html, /migrarHorarios\(estado\);/);
  assert.match(html, /function migrarHorarios\(estado\)[\s\S]*?deFabrica[\s\S]*?l\.horarioSupuesto = false; l\.cierreAprox = true;/);
});
test('el contador de horas explica con qué horarios cuenta y qué sigue sin confirmar', () => {
  assert.match(html, /Horas del mes con los horarios del grupo/);
  assert.match(html, /La hora de cierre es aproximada/);
  assert.match(html, /no dos jornadas enteras; quien abre la franja la hace entera/);
});
test('los ajustes del local permiten cambiar los tramos del partido y el cierre aproximado', () => {
  assert.match(html, /data-horp="\$\{f\}\|ini"/);
  assert.match(html, /Tramos del partido confirmados/);
  assert.match(html, /La hora de cierre de la tarde es aproximada/);
  assert.match(html, /Sábado y domingo: solo si cambia \(la mañana abre a las 08:00\)/);
});
