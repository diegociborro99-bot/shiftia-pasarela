// El pipeline del motor: manifiesto + arquetipo → burbuja nueva, comprobada.
//
//   1. carga y valida el manifiesto (cliente.json) contra el arquetipo
//   2. copia los ficheros del arquetipo que entran (incluir/excluir/conservar) renombrando
//      los que toque, y en los de texto aplica las sustituciones (identidad, cuentas, claves)
//      y los bloques (la semilla, los puestos, la lista de módulos)
//   3. escribe las plantillas (README, DISEÑO, tests genéricos, configuración…), el logo,
//      cliente.json y motor.lock.json
//   4. ensambla (build), pasa los tests y busca restos del cliente de origen
//   5. opcionalmente deja el repositorio iniciado en git
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, copyFileSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cargarManifiesto, ManifiestoInvalido } from './manifiesto.mjs';
import { cargarArquetipo, listarFicheros, estadoOrigen, coincideGlob } from './arquetipo.mjs';
import { renderizar } from './plantilla.mjs';
import { construirSemilla, codigoSemilla } from './semilla.mjs';
import { buscarRestos, comprobarGenerado, esTexto, ejecutar } from './verificar.mjs';

export const RAIZ_MOTOR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const VERSION_MOTOR = JSON.parse(readFileSync(join(RAIZ_MOTOR, 'motor.json'), 'utf8')).version;
export const ARQUETIPO_DEFECTO = JSON.parse(readFileSync(join(RAIZ_MOTOR, 'motor.json'), 'utf8')).arquetipoDefecto;

function escribir(ruta, contenido) { mkdirSync(dirname(ruta), { recursive: true }); writeFileSync(ruta, contenido); }
function dirVacio(ruta) { return !existsSync(ruta) || readdirSync(ruta).filter(f => f !== '.git').length === 0; }

function andar(base, rel = '', out = []) {
  for (const n of readdirSync(join(base, rel))) { const r = rel ? `${rel}/${n}` : n; if (statSync(join(base, r)).isDirectory()) andar(base, r, out); else out.push(r); }
  return out;
}

// sustituciones: [{de, a, regex?, banderas?, soloEn?}] en orden; `a` es una plantilla del contexto
export function aplicarSustituciones(texto, sustituciones, ctx, rel) {
  let t = texto;
  for (const s of sustituciones) {
    if (s.soloEn && !coincideGlob(s.soloEn, rel)) continue;
    const a = renderizar(s.a, ctx);
    if (s.regex) t = t.replace(new RegExp(s.de, s.banderas || 'gu'), a);
    else t = t.split(s.de).join(a);
  }
  return t;
}

// bloques: [{fichero, desde, hasta, con}] — sustituye desde la primera aparición de `desde`
// hasta la primera de `hasta` (incluida) por el contenido `con` (@semilla, @puestos… o texto)
export function aplicarBloques(texto, bloques, rel, contenidos) {
  let t = texto;
  for (const b of bloques.filter(x => x.fichero === rel)) {
    const i = t.indexOf(b.desde);
    if (i < 0) throw new Error(`bloque en ${rel}: no encuentro el inicio «${b.desde.slice(0, 60)}»`);
    const j = t.indexOf(b.hasta, i + b.desde.length);
    if (j < 0) throw new Error(`bloque en ${rel}: no encuentro el final «${b.hasta.slice(0, 60)}»`);
    const con = b.con.startsWith('@') ? contenidos[b.con.slice(1)] : b.con;
    if (con === undefined) throw new Error(`bloque en ${rel}: contenido «${b.con}» desconocido`);
    t = t.slice(0, i) + con + t.slice(j + b.hasta.length);
  }
  return t;
}

export function leerArquetipoDe(rutaManifiesto) {
  let m;
  try { m = JSON.parse(readFileSync(rutaManifiesto, 'utf8')); } catch (e) { throw new ManifiestoInvalido([`no puedo leer «${rutaManifiesto}» como JSON: ${e.message}`]); }
  return (m && m.arquetipo) || ARQUETIPO_DEFECTO;
}

export function generar(opts) {
  const log = opts.log || (() => {});
  const informe = { ok: false, pasos: [], avisos: [], restos: [], destino: null };
  const paso = (nombre, detalle) => { informe.pasos.push({ nombre, detalle }); log(nombre, detalle); };

  // 1. manifiesto + arquetipo
  const arq = cargarArquetipo(leerArquetipoDe(opts.manifiesto), RAIZ_MOTOR);
  const man = cargarManifiesto(opts.manifiesto, arq, { hoy: opts.hoy });
  const ctx = man.ctx;
  informe.avisos.push(...man.avisos);
  const origen = estadoOrigen(arq);
  ctx.motor = { version: VERSION_MOTOR, arquetipo: arq.id, arquetipoNombre: arq.nombre, origenRepo: (arq.origen && arq.origen.repo) || '', origenCommit: origen.commit || 'desconocido', origenVersion: origen.version || '' };
  ctx.configCliente = { slug: ctx.slug, nombre: ctx.nombre, nombreCorto: ctx.nombreCorto, sector: ctx.sector, arquetipo: arq.id, franjas: ctx.franjas, modulos: ctx.modulos, motor: VERSION_MOTOR, generado: ctx.fechaIso };
  paso('manifiesto', `${ctx.nombre} (${ctx.slug}) · ${ctx.nUnidades} ${ctx.unidadesPlural} · ${ctx.nEquipo} personas · arquetipo ${arq.id}`);
  if (arq.origen && arq.origen.commitProbado && origen.commit && !origen.commit.startsWith(arq.origen.commitProbado)) informe.avisos.push(`el arquetipo se probó con el commit ${arq.origen.commitProbado} y el origen está en ${origen.commit.slice(0, 10)}: si algo no cuadra, revisa motor/arquetipos/${arq.id}/arquetipo.json`);
  if (origen.sucio) informe.avisos.push(`el repositorio de origen tiene ${origen.sucio} fichero(s) con cambios sin commit: la burbuja nace de lo que hay en disco`);

  // 2. destino
  const destino = resolve(opts.destino || join(dirname(arq.origenAbs), 'shiftia-' + ctx.slug));
  informe.destino = destino;
  if (resolve(destino) === resolve(arq.origenAbs) || destino.startsWith(arq.origenAbs + '/')) throw new Error(`el destino (${destino}) no puede estar dentro del repositorio de origen`);
  if (!dirVacio(destino) && !opts.forzar) throw new Error(`el destino ${destino} ya existe y no está vacío (usa --forzar para escribir encima de lo generado)`);
  mkdirSync(destino, { recursive: true });

  // 3. ficheros del arquetipo
  const { ficheros, faltan } = listarFicheros(arq);
  for (const f of faltan) informe.avisos.push(`el arquetipo dice incluir «${f}» y no existe en el origen`);
  const semilla = construirSemilla(ctx);
  const contenidos = {
    semilla: codigoSemilla(semilla, ctx),
    puestos: `const PUESTOS = [\n  ${ctx.puestos.map(p => JSON.stringify({ id: p.id, label: p.label }).replace(/"(\w+)":/g, '$1: ').replace(/"/g, "'")).join(', ')},\n];\n`,
  };
  let nTexto = 0, nBin = 0;
  for (const rel of ficheros) {
    let destRel = rel;
    for (const r of arq.renombrar || []) {
      if (r.regex) { const re = new RegExp(r.de); if (re.test(rel)) destRel = rel.replace(re, renderizar(r.a, ctx)); }
      else if (coincideGlob(r.de, rel)) destRel = renderizar(r.a, ctx);
    }
    const abs = join(arq.origenAbs, rel);
    if (!esTexto(rel)) { mkdirSync(dirname(join(destino, destRel)), { recursive: true }); copyFileSync(abs, join(destino, destRel)); nBin++; continue; }
    let t = readFileSync(abs, 'utf8');
    t = aplicarBloques(t, arq.bloques || [], rel, contenidos);
    t = aplicarSustituciones(t, arq.sustituciones || [], ctx, rel);
    escribir(join(destino, destRel), t);
    nTexto++;
  }
  paso('arquetipo', `${nTexto} ficheros de texto adaptados y ${nBin} binarios copiados desde ${origen.relativa || arq.origenAbs}`);

  // 4. plantillas del arquetipo (pisan a lo copiado si coinciden)
  const plantillas = existsSync(arq.plantillasDir) ? andar(arq.plantillasDir) : [];
  for (const rel of plantillas) {
    const crudo = readFileSync(join(arq.plantillasDir, rel), 'utf8');
    escribir(join(destino, rel), renderizar(crudo, Object.assign({ semilla }, ctx)));
  }
  paso('plantillas', `${plantillas.length} ficheros escritos desde motor/arquetipos/${arq.id}/plantillas`);

  // 5. logo, manifiesto del cliente, lock
  if (ctx.marca.logo) { copyFileSync(resolve(man.dir, ctx.marca.logo), join(destino, ctx.marca.logoFichero)); paso('logo', ctx.marca.logoFichero); }
  else paso('logo', 'sin logo del cliente: la app enseña su nombre en texto (súbelo después a assets/ y ejecuta el build)');
  escribir(join(destino, 'cliente.json'), JSON.stringify(man.manifiesto, null, 2) + '\n');
  const lock = { motor: VERSION_MOTOR, arquetipo: arq.id, origen: { repo: (arq.origen && arq.origen.repo) || null, commit: origen.commit, version: origen.version }, manifiesto: { fichero: 'cliente.json', sha256: man.hash }, generado: (opts.hoy ? new Date(opts.hoy) : new Date()).toISOString(), modulos: ctx.modulos };
  escribir(join(destino, 'motor.lock.json'), JSON.stringify(lock, null, 2) + '\n');
  paso('cliente.json + motor.lock.json', `manifiesto y trazabilidad (motor ${VERSION_MOTOR}, origen ${(origen.commit || '?').slice(0, 10)})`);

  // 6. build + tests
  const comp = comprobarGenerado(destino, { tests: opts.tests !== false });
  for (const p of comp.pasos) paso(p.ok ? `✓ ${p.nombre}` : `✗ ${p.nombre}`, p.ok ? (p.salida.trim().split('\n').pop() || '').slice(0, 160) : p.salida.slice(-3000));
  informe.comprobaciones = comp;

  // 7. restos del cliente de origen
  informe.restos = buscarRestos(destino, arq.prohibidos || [], arq.prohibidosPermitidosEn || []);
  paso(informe.restos.length ? '✗ restos del cliente de origen' : '✓ sin restos del cliente de origen', informe.restos.length ? informe.restos.slice(0, 40).map(r => `${r.fichero}:${r.linea} «${r.token}» → ${r.texto}`).join('\n') : `${(arq.prohibidos || []).length} tokens vigilados`);

  // 8. git
  if (opts.git) {
    const g = (...a) => ejecutar('git', a, destino);
    if (!existsSync(join(destino, '.git'))) g('init', '-q', '-b', 'main');
    g('add', '-A');
    const c = g('-c', 'user.name=Motor Shiftia', '-c', 'user.email=motor@shiftia.es', 'commit', '-q', '-m', `Nace ${ctx.nombre} con el motor de creación de Shiftia (arquetipo ${arq.id})`);
    paso(c.ok ? 'git' : '✗ git', c.ok ? 'repositorio iniciado en main con el primer commit' : c.salida.slice(-500));
  }

  informe.ok = comp.ok && informe.restos.length === 0;
  informe.ctx = ctx;
  informe.resumen = { ficherosTexto: nTexto, binarios: nBin, plantillas: plantillas.length, unidades: ctx.nUnidades, personas: ctx.nEquipo, modulos: Object.entries(ctx.modulos).filter(([, v]) => v).map(([k]) => k) };
  return informe;
}
