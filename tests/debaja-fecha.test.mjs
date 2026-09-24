// deBaja(p, iso) SIEMPRE con la fecha (reunión del 24/09, decisiones.md principio 3).
// Hasta el 24/09 deBaja(p) sin fecha miraba el reloj (fechaMadrid()): el Generador dejaba de
// comprobar las condiciones de quien estaba de baja HOY aunque hubiera vuelto la semana que se
// generaba, y la Cobertura cambiaba de persona sola. El modelo ya lanza un error si falta la
// fecha; esta prueba lo impide antes: busca en modelo.js y en src/app cualquier llamada a
// deBaja con un solo argumento (o sin ninguno).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const ficheros = ['modelo.js', ...readdirSync(join(RAIZ, 'src', 'app')).filter(f => f.endsWith('.js')).map(f => join('src', 'app', f))];

// argumentos de primer nivel de la llamada que empieza en `i` (el paréntesis de apertura)
function argumentos(src, i) {
  let prof = 0, n = 0, algo = false, cad = null;
  for (let k = i; k < src.length; k++) {
    const c = src[k];
    if (cad) { if (c === '\\') { k++; continue; } if (c === cad) cad = null; continue; }
    if (c === '"' || c === "'" || c === '`') { cad = c; algo = true; continue; }
    if (c === '(' || c === '[' || c === '{') { prof++; if (prof > 1) algo = true; continue; }
    if (c === ')' || c === ']' || c === '}') { prof--; if (prof === 0) return algo ? n + 1 : 0; continue; }
    if (prof === 1 && c === ',') { n++; continue; }
    if (prof === 1 && !/\s/.test(c)) algo = true;
  }
  return -1;
}

test('nadie llama a deBaja sin la fecha (modelo.js y src/app)', () => {
  const malas = [];
  for (const f of ficheros) {
    const src = readFileSync(join(RAIZ, f), 'utf8');
    const re = /\bdeBaja\s*\(/g;
    let m;
    while ((m = re.exec(src))) {
      const antes = src.slice(Math.max(0, m.index - 9), m.index);
      if (/function\s+$/.test(antes)) continue;   // la definición
      const n = argumentos(src, m.index + m[0].length - 1);
      if (n < 2) malas.push(`${f}:${src.slice(0, m.index).split('\n').length} → ${src.slice(m.index, src.indexOf('\n', m.index)).trim().slice(0, 70)}`);
    }
  }
  assert.deepEqual(malas, [], `deBaja sin fecha:\n  ${malas.join('\n  ')}`);
});

test('la comprobación reconoce una llamada sin fecha y una con fecha', () => {
  const n = s => argumentos(s, s.indexOf('('));
  assert.equal(n('deBaja(p)'), 1);
  assert.equal(n('deBaja(personaDeId(x.pid))'), 1);
  assert.equal(n('deBaja(p, iso)'), 2);
  assert.equal(n("deBaja(p, addDias(l, 6), 'x')"), 3);
  assert.equal(n('deBaja()'), 0);
});
