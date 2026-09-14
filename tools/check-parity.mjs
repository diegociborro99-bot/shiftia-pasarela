// Verifica que el modelo embebido en index.html es EXACTAMENTE modelo.js
// y que los tests pasan contra ambos. Falla el CI si alguien toca uno sin el otro.
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const modelo = readFileSync(join(root, 'modelo.js'), 'utf8');

const m = html.match(/\/\*MODELO_START\*\/([\s\S]*?)\/\*MODELO_END\*\//);
if (!m) { console.error('✗ index.html no contiene el bloque MODELO_START/END'); process.exit(1); }

// el bloque embebido es modelo.js sin el module.exports final
const inner = modelo.replace(/\nif \(typeof module !== 'undefined'\) \{[\s\S]*?\n\}\n/, '\n');
const norm = s => s.replace(/\s+$/gm, '').trim();
if (norm(m[1]) !== norm(inner)) {
  console.error('✗ El modelo embebido en index.html NO coincide con modelo.js — reinyecta antes de commitear.');
  process.exit(1);
}
console.log('✓ paridad: el modelo embebido en index.html === modelo.js');

// tests contra el fichero y contra el bloque extraído
const exportsLine = modelo.match(/module\.exports = \{[\s\S]*?\};/)[0];
const tmp = mkdtempSync(join(tmpdir(), 'shiftia-'));
const extractedPath = join(tmp, 'extracted-modelo.js');
writeFileSync(extractedPath, m[1] + '\n' + exportsLine + '\n');
for (const [label, target] of [['modelo.js', join(root, 'modelo.js')], ['modelo embebido', extractedPath]]) {
  const out = execFileSync('node', [join(root, 'modelo.test.js')], { env: { ...process.env, MODELO: target } }).toString();
  const okLine = out.trim().split('\n').pop();
  console.log(`✓ tests contra ${label}: ${okLine.trim()}`);
}
