// Pie de la pantalla de acceso: solo el copyright de Shiftia y «coded by Highkey Labs»
// (el nombre del grupo ya va en el subtítulo con sus locales). Vale para login.html
// y para la pantalla de acceso del modo local embebida en index.html.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
for (const f of ['login.html', 'index.html']) {
  test(`${f}: el pie del acceso dice «© 2026 Shiftia» y «coded by Highkey Labs», sin «Grupo Pasarela»`, () => {
    const html = readFileSync(join(RAIZ, f), 'utf8');
    const pies = [...html.matchAll(/class="loginfoot">([\s\S]*?)<\/div>/g)].map(m => m[1]);
    assert.ok(pies.length >= 1, 'hay un pie de acceso');
    for (const pie of pies) {
      assert.match(pie, /© 2026 Shiftia<br>/);
      assert.match(pie, /coded by Highkey Labs/);
      assert.doesNotMatch(pie, /Grupo Pasarela/);
    }
  });
}
