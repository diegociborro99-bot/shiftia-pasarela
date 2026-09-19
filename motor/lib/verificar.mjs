// Comprobaciones sobre la burbuja generada: que no quede ni rastro del cliente del que
// nace el arquetipo, que el build ensambla y que los tests pasan. Sin dependencias.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { spawnSync } from 'node:child_process';

const BINARIOS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.woff', '.woff2', '.ttf', '.otf', '.pdf', '.docx', '.xlsx', '.db', '.zip']);
const NO_ESCANEAR = new Set(['.git', 'node_modules', 'vendor', 'icons', 'data']);

export function esTexto(ruta) { return !BINARIOS.has(extname(ruta).toLowerCase()); }

export function andarTexto(base, rel = '', out = []) {
  for (const nombre of readdirSync(join(base, rel))) {
    if (NO_ESCANEAR.has(nombre)) continue;
    const r = rel ? `${rel}/${nombre}` : nombre;
    if (statSync(join(base, r)).isDirectory()) andarTexto(base, r, out);
    else if (esTexto(r)) out.push(r);
  }
  return out;
}

// un prohibido es {token, palabra?}: con palabra=true solo cuenta como palabra entera
// (letras y números alrededor lo descartan: «Leo» no salta en «Leonardo»); sin ella, como
// cadena tal cual (claves, dominios, prefijos)
export function regexProhibido(p) {
  const token = typeof p === 'string' ? p : p.token;
  const palabra = typeof p === 'string' ? true : p.palabra !== false;
  const esc = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(palabra ? `(?<![\\p{L}\\p{N}_])${esc}(?![\\p{L}\\p{N}_])` : esc, 'gu');
}

export function buscarRestos(destino, prohibidos, permitidosEn = []) {
  const restos = [];
  const res = prohibidos.map(p => ({ p, re: regexProhibido(p), token: typeof p === 'string' ? p : p.token }));
  for (const rel of andarTexto(destino)) {
    if (permitidosEn.some(x => x === rel)) continue;
    let txt;
    try { txt = readFileSync(join(destino, rel), 'utf8'); } catch (e) { continue; }
    const lineas = txt.split('\n');
    for (const { re, token } of res) {
      if (!re.test(txt)) continue;
      re.lastIndex = 0;
      lineas.forEach((l, i) => { re.lastIndex = 0; if (re.test(l)) restos.push({ fichero: rel, linea: i + 1, token, texto: l.trim().slice(0, 120) }); });
    }
  }
  return restos;
}

export function ejecutar(cmd, args, cwd, opts = {}) {
  // sin NODE_TEST_CONTEXT: si el motor corre dentro de node --test (su propio test), un
  // `node --test` hijo heredaría el contexto y se saltaría los ficheros («skipping running
  // files») saliendo con 0, y la comprobación sería mentira
  const env = Object.assign({}, process.env, opts.env || {});
  delete env.NODE_TEST_CONTEXT;
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', env, timeout: opts.timeout || 600000, maxBuffer: 64 * 1024 * 1024 });
  return { ok: r.status === 0, codigo: r.status, salida: (r.stdout || '') + (r.stderr || ''), error: r.error ? r.error.message : null };
}

// las comprobaciones que hace un contribuidor antes de subir: sintaxis, build, tests
export function comprobarGenerado(destino, opciones = {}) {
  const pasos = [];
  const paso = (nombre, fn) => { const r = fn(); pasos.push(Object.assign({ nombre }, r)); if (!r.ok && opciones.pararEnFallo !== false) return false; return true; };
  const sigue = paso('sintaxis de modelo.js', () => ejecutar('node', ['--check', 'modelo.js'], destino))
    && paso('build (src/ → index.html + login.html)', () => ejecutar('node', ['tools/build.mjs'], destino));
  if (sigue && opciones.tests !== false) {
    const tests = existsSync(join(destino, 'tests')) ? readdirSync(join(destino, 'tests')).filter(f => f.endsWith('.test.mjs')).map(f => 'tests/' + f) : [];
    paso('tests del modelo (node modelo.test.js)', () => ejecutar('node', ['modelo.test.js'], destino))
      && paso('paridad del modelo embebido', () => ejecutar('node', ['tools/check-parity.mjs'], destino))
      && paso(`tests del servidor y de la interfaz (${tests.length} ficheros)`, () => {
        if (!tests.length) return { ok: true, salida: 'sin tests' };
        const r = ejecutar('node', ['--test', ...tests], destino);
        // el runner tiene que haber corrido de verdad: N tests pasados y ninguno fallado
        const pasa = r.salida.match(/^# pass (\d+)$/m), falla = r.salida.match(/^# fail (\d+)$/m);
        if (r.ok && (!pasa || +pasa[1] === 0 || !falla || +falla[1] > 0 || /skipping running files/.test(r.salida))) return Object.assign(r, { ok: false, salida: r.salida + '\n✗ el runner no ejecutó los tests o no informó de ellos' });
        return Object.assign(r, { salida: r.salida + `\n${pasa ? pasa[1] : 0} tests del servidor y de la interfaz OK` });
      });
  }
  return { ok: pasos.every(p => p.ok), pasos };
}
