// Retoques de interfaz pedidos el 15/09: el menú superior entero sin arrastrar y sin
// comerse el logo, la sartén de la cocina, los botones de la barra juntos, la primera
// columna fija al desplazar y la vista previa del cambio antes de aplicar una cobertura.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(RAIZ, 'index.html'), 'utf8');
const css = html.slice(html.indexOf('<style>'), html.indexOf('</style>'));

test('las pestañas encogen por tramos y la marca no se recorta', () => {
  assert.match(css, /\.tab\{[^}]*font-size:13\.5px/);
  assert.match(css, /\.brand\{[^}]*flex:none/);
  // los @media tienen que ir DESPUÉS de la regla base o no ganan (misma especificidad)
  assert.ok(css.indexOf('@media (max-width:1700px){.tab{') > css.indexOf('.tab{position:relative'), 'los tramos van después de la regla base');
  for (const w of ['1700', '1460', '1280', '1120']) assert.match(css, new RegExp(`@media \\(max-width:${w}px\\)\\{\\.tab\\{`));
});
test('la cocina se marca con una sartén, no con un rombo', () => {
  assert.match(html, /const SVG_COCINA = '<svg class="icoc"/);
  assert.match(css, /\.icoc\{[^}]*stroke:currentColor/);
  for (const sitio of [/<span class="bdg cocina">\$\{SVG_COCINA\} COCINA<\/span>/, /<u class="gcoc" title="cocina">\$\{SVG_COCINA\}<\/u>/, /<b class="pxg-mk coc" title="Lleva la cocina">\$\{SVG_COCINA\}<\/b>/])
    assert.match(html, sitio);
  assert.ok(!/<span class="bdg cocina">◆/.test(html) && !/>◆<\/u>/.test(html), 'no queda ningún rombo de cocina');
});
test('los botones de la barra van todos al mismo lado', () => {
  assert.match(css, /\.dacts\{display:flex;flex-wrap:wrap;justify-content:flex-end/);
  assert.match(css, /\.dacts\{display:flex;order:4;flex:1 1 100%;flex-wrap:nowrap/, 'en el móvil siguen en una fila deslizable');
});
test('al desplazar de lado se quedan la persona, el local y la franja', () => {
  assert.match(html, /<tr class="ghdr"><td colspan="\$\{est\.days\.length \+ 1\}"><span class="ghl">/);
  assert.match(css, /tr\.ghdr \.ghl\{display:inline-flex;align-items:center;position:sticky;left:12px\}/);
  assert.match(css, /\.act td\.lbl,\.act th\.lbl\{position:sticky;left:0/);
  assert.match(css, /\.htab td\.per,\.htab th:first-child\{position:sticky;left:0/);
  // el fondo de la columna fija tiene que ser opaco, también con el tinte de la fila
  assert.match(css, /\.plan tr\.prow:hover td\.pname[^{]*\{background-color:var\(--surface\);background-image:linear-gradient/);
});
test('confirmar una cobertura enseña antes la vista previa del cambio', () => {
  assert.match(html, /function openPreviaCobertura\(res, plan, alConfirmar\)/);
  assert.match(html, /Vista previa del cambio/);
  assert.match(html, /Nada se guarda hasta que confirmes/);
  assert.match(html, /id="pvOk"[^>]*>✓ Confirmar y aplicar|✓ Confirmar y aplicar/);
  assert.match(html, /if \(plan\) \{ openPreviaCobertura\(res, plan, \(\) => hacerCobertura\(res, plan, root, modo\)\); return; \}/);
  assert.match(css, /\.pvt td\.pventra\{/);
  assert.match(css, /\.pvt td\.pvsale\{/);
});
test('cerrar dos capas a la vez no retrocede dos veces en el historial', () => {
  assert.match(html, /if \(CERRANDO_POR_HISTORIAL \|\| atrasPendiente\) return;/);
  assert.match(html, /let soltarAtras = \(\) => \{\};/);
});
