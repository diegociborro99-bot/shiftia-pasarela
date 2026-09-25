// Revisión de la fase 5 (24/09): lo que la interfaz tiene que pasar al modelo para que la carga «M este mes»
// cuente el mes entero también fuera de la pestaña Cobertura (la ausencia apuntada en Equipo y el cambio de día
// libre de la ficha usan la misma puntuación), y que el guardado recalcule quién abre y la cocina al cambiar la
// configuración. INDEX permite pasar la prueba por otra copia de la app (la de antes, para verla en rojo).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(process.env.INDEX || join(RAIZ, 'index.html'), 'utf8');

test('Equipo (la ausencia apuntada) y la ficha (el día libre de una semana) pasan S.meses al modelo', () => {
  const llamadas = (fn) => [...html.matchAll(new RegExp(`\\b${fn}\\(S, [^;]*`, 'g'))].map(m => m[0]);
  const ca = llamadas('cubrirAusencia'), md = llamadas('moverDiaLibre');
  assert.ok(ca.length >= 2 && ca.every(c => /meses: S\.meses/.test(c)), ca.join('\n'));
  assert.ok(md.length >= 2 && md.every(c => /meses: S\.meses/.test(c)), md.join('\n'));
});
test('guardar recalcula quién abre y la cocina de hoy en adelante cuando cambia la configuración', () => {
  assert.match(html, /function saveState\(\) \{\s*refrescarMarcasSiCambia\(\);/);
  assert.match(html, /refrescarMarcas\(S, S\.staff, S\.meses, isoHoy\(\)\)/);
});
