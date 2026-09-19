// Un arquetipo es una app existente (el repositorio de un cliente) más una tabla que dice
// qué se copia, qué se excluye, qué se renombra, qué cadenas cambian por las del cliente
// nuevo y qué palabras no pueden quedar en el resultado. Vive en motor/arquetipos/<id>/.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, relative, sep } from 'node:path';
import { spawnSync } from 'node:child_process';

export function cargarArquetipo(id, raizMotor) {
  const dir = join(raizMotor, 'arquetipos', id);
  const fichero = join(dir, 'arquetipo.json');
  if (!existsSync(fichero)) throw new Error(`No existe el arquetipo «${id}» (falta ${fichero}). Arquetipos disponibles: ${listarArquetipos(raizMotor).join(', ') || 'ninguno'}`);
  const arq = JSON.parse(readFileSync(fichero, 'utf8'));
  arq.dir = dir;
  arq.plantillasDir = join(dir, 'plantillas');
  arq.origenAbs = resolve(dir, (arq.origen && arq.origen.ruta) || '../../..');
  if (!existsSync(join(arq.origenAbs, 'package.json'))) throw new Error(`El origen del arquetipo (${arq.origenAbs}) no parece un repositorio de Shiftia: falta package.json`);
  return arq;
}

export function listarArquetipos(raizMotor) {
  const dir = join(raizMotor, 'arquetipos');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(d => existsSync(join(dir, d, 'arquetipo.json')));
}

// glob sencillo: ** cualquier cosa, * cualquier cosa menos «/», ? un carácter
export function globARegex(patron) {
  let re = '';
  for (let i = 0; i < patron.length; i++) {
    const c = patron[i];
    if (c === '*') { if (patron[i + 1] === '*') { re += '.*'; i++; if (patron[i + 1] === '/') i++; } else re += '[^/]*'; }
    else if (c === '?') re += '[^/]';
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp('^' + re + '$');
}
export function coincideGlob(patron, ruta) { return globARegex(patron).test(ruta); }

function posix(p) { return p.split(sep).join('/'); }

function andar(base, rel, out) {
  const abs = join(base, rel);
  for (const nombre of readdirSync(abs)) {
    const r = rel ? `${rel}/${nombre}` : nombre;
    const st = statSync(join(base, r));
    if (st.isDirectory()) andar(base, r, out); else out.push(posix(r));
  }
  return out;
}

// los ficheros del origen que entran en la burbuja nueva, en orden estable
export function listarFicheros(arq) {
  const out = [];
  for (const entrada of arq.incluir || []) {
    const abs = join(arq.origenAbs, entrada);
    if (!existsSync(abs)) { out.push({ falta: entrada }); continue; }
    if (statSync(abs).isDirectory()) andar(arq.origenAbs, entrada, out); else out.push(entrada);
  }
  const faltan = out.filter(x => typeof x === 'object').map(x => x.falta);
  const conservar = arq.conservar || [];
  const excluir = arq.excluir || [];
  const lista = out.filter(x => typeof x === 'string')
    .filter(r => !r.split('/').includes('.git') && !r.split('/').includes('node_modules'))
    .filter(r => conservar.some(p => coincideGlob(p, r)) || !excluir.some(p => coincideGlob(p, r)));
  return { ficheros: [...new Set(lista)].sort(), faltan };
}

// commit y estado del repositorio de origen, para dejarlo escrito en motor.lock.json
export function estadoOrigen(arq) {
  const git = (...args) => { const r = spawnSync('git', ['-C', arq.origenAbs, ...args], { encoding: 'utf8' }); return r.status === 0 ? r.stdout.trim() : null; };
  const commit = git('rev-parse', 'HEAD');
  const sucio = git('status', '--porcelain');
  let version = null;
  try { version = JSON.parse(readFileSync(join(arq.origenAbs, 'package.json'), 'utf8')).version; } catch (e) {}
  return { commit, sucio: sucio === null ? null : sucio.split('\n').filter(Boolean).length, version, ruta: arq.origenAbs, relativa: posix(relative(process.cwd(), arq.origenAbs)) };
}
