// deBaja(p, iso) SIEMPRE con la fecha (reunión del 24/09, decisiones.md principio 3).
// Hasta el 24/09 deBaja(p) sin fecha miraba el reloj (fechaMadrid()): el Generador dejaba de
// comprobar las condiciones de quien estaba de baja HOY aunque hubiera vuelto la semana que se
// generaba, y la Cobertura cambiaba de persona sola. El modelo ya lanza un error si falta la
// fecha; esta prueba lo impide antes: busca en modelo.js y en src/app cualquier llamada a
// deBaja con un solo argumento (o sin ninguno).
// 30/09 (auditoría A5/G15): lo mismo para haSalido(p, iso), fechaCandidato(c, hoy), ordenarCandidatos(cands, hoy, modo),
// primerDiaPlanificable(est, hoy), mesVisibleParaPersonal(mesesPublicados, clave, hoyClave) y sembrarDemo(S, hoyIso):
// la app las llamaba sin fecha (o con null) y el modelo miraba el reloj. Se vigila que el argumento de la fecha esté y no
// sea null ni undefined.
// 30/09 (revisión de A2, modelo 7): también server.js, y que dentro de modelo.js nadie vuelva a mirar el reloj por su cuenta:
// fechaMadrid( solo en su definición (el «hoy || fechaMadrid()» de antes no lo delataba ninguna llamada de la app).
// RAIZ permite pasar la prueba por otra copia del repo (para verla en rojo).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = process.env.RAIZ || join(dirname(fileURLToPath(import.meta.url)), '..');
const ficheros = ['modelo.js', 'server.js', ...readdirSync(join(RAIZ, 'src', 'app')).filter(f => f.endsWith('.js')).map(f => join('src', 'app', f))];
// función vigilada → posición (desde 0) del argumento que lleva la fecha
const VIGILADAS = { deBaja: 1, haSalido: 1, fechaCandidato: 1, ordenarCandidatos: 1, primerDiaPlanificable: 1, mesVisibleParaPersonal: 2, sembrarDemo: 1 };

// argumentos de primer nivel de la llamada que empieza en `i` (el paréntesis de apertura), como texto; null si no cierra
function argumentos(src, i) {
  let prof = 0, cad = null, ini = i + 1;
  const out = [];
  for (let k = i; k < src.length; k++) {
    const c = src[k];
    if (cad) { if (c === '\\') { k++; continue; } if (c === cad) cad = null; continue; }
    if (c === '"' || c === "'" || c === '`') { cad = c; continue; }
    if (c === '(' || c === '[' || c === '{') { prof++; continue; }
    if (c === ')' || c === ']' || c === '}') { prof--; if (prof === 0) { const u = src.slice(ini, k).trim(); if (u || out.length) out.push(u); return out; } continue; }
    if (prof === 1 && c === ',') { out.push(src.slice(ini, k).trim()); ini = k + 1; }
  }
  return null;
}
const sinFecha = (args, pos) => !args || args.length <= pos || /^(null|undefined)?$/.test(args[pos]);
// las líneas de un fuente sin lo que va tras «//» (los comentarios pueden nombrar fechaMadrid() sin llamarla)
const sinComentarios = src => src.split('\n').map(l => l.replace(/\/\/.*$/, ''));
// las llamadas a fechaMadrid( de modelo.js que no son su definición: [«n: línea»]
const relojEnModelo = src => sinComentarios(src).map((l, i) => ({ n: i + 1, l })).filter(x => /\bfechaMadrid\s*\(/.test(x.l) && !/^\s*function fechaMadrid\(/.test(x.l)).map(x => `${x.n}: ${x.l.trim().slice(0, 80)}`);

test('nadie llama a deBaja, haSalido, fechaCandidato, ordenarCandidatos, primerDiaPlanificable, mesVisibleParaPersonal ni sembrarDemo sin la fecha (modelo.js, server.js y src/app)', () => {
  const malas = [];
  for (const f of ficheros) {
    const src = readFileSync(join(RAIZ, f), 'utf8');
    for (const [fn, pos] of Object.entries(VIGILADAS)) {
      const re = new RegExp(`\\b${fn}\\s*\\(`, 'g');
      let m;
      while ((m = re.exec(src))) {
        const antes = src.slice(Math.max(0, m.index - 9), m.index);
        if (/function\s+$/.test(antes)) continue;   // la definición
        const args = argumentos(src, m.index + m[0].length - 1);
        if (sinFecha(args, pos)) malas.push(`${f}:${src.slice(0, m.index).split('\n').length} → ${src.slice(m.index, src.indexOf('\n', m.index)).trim().slice(0, 70)}`);
      }
    }
  }
  assert.deepEqual(malas, [], `llamadas sin fecha:\n  ${malas.join('\n  ')}`);
});

test('modelo.js no mira el reloj por su cuenta: fechaMadrid( solo en su definición', () => {
  const malas = relojEnModelo(readFileSync(join(RAIZ, 'modelo.js'), 'utf8'));
  assert.deepEqual(malas, [], `fechaMadrid( dentro del modelo:\n  ${malas.join('\n  ')}`);
});

test('la comprobación reconoce una llamada sin fecha, con null y con fecha, y el reloj escondido en el modelo', () => {
  const a = s => argumentos(s, s.indexOf('('));
  assert.deepEqual(a('deBaja(p)'), ['p']);
  assert.deepEqual(a('deBaja(personaDeId(x.pid))'), ['personaDeId(x.pid)']);
  assert.deepEqual(a('deBaja(p, iso)'), ['p', 'iso']);
  assert.deepEqual(a("deBaja(p, addDias(l, 6), 'x')"), ['p', 'addDias(l, 6)', "'x'"]);
  assert.deepEqual(a('deBaja()'), []);
  assert.deepEqual(a("ordenarCandidatos(todos, null, ENT.orden)"), ['todos', 'null', 'ENT.orden']);
  assert.equal(sinFecha(a('deBaja(p)'), 1), true);
  assert.equal(sinFecha(a('deBaja(p, iso)'), 1), false);
  assert.equal(sinFecha(a('ordenarCandidatos(todos, null, ENT.orden)'), 1), true, 'null no es una fecha');
  assert.equal(sinFecha(a('ordenarCandidatos(todos, isoHoy(), ENT.orden)'), 1), false);
  assert.equal(sinFecha(a('mesVisibleParaPersonal(lista, k)'), 2), true);
  assert.equal(sinFecha(a("mesVisibleParaPersonal(lista, k, isoHoy().slice(0, 7))"), 2), false);
  assert.equal(sinFecha(a('sembrarDemo(S, undefined)'), 1), true);
  assert.deepEqual(relojEnModelo("function fechaMadrid(fecha) {\n  const d = fecha || new Date();\n}\n// reloj (fechaMadrid()) y el Generador\nfunction x(hoy) { const h = hoy || fechaMadrid(); return h; }\n"), ['5: function x(hoy) { const h = hoy || fechaMadrid(); return h; }'], 'el «hoy || fechaMadrid()» se ve; la definición y los comentarios, no');
});
