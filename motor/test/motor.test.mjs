// Tests del motor de creación. Los rápidos prueban las piezas (plantillas, manifiesto,
// semilla); el lento genera el cliente de ejemplo de verdad en un directorio temporal y
// comprueba que la burbuja ensambla, pasa sus propios tests y no lleva ni rastro del
// cliente del que nace el arquetipo. Corre en el CI del arquetipo: si alguien toca la app
// de forma que el motor deja de producir una burbuja limpia, el CI se pone en rojo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { renderizar, ErrorPlantilla } from '../lib/plantilla.mjs';
import { validarManifiesto, contextoDe, cargarManifiesto, ManifiestoInvalido } from '../lib/manifiesto.mjs';
import { construirSemilla, extraerManifiesto, codigoSemilla } from '../lib/semilla.mjs';
import { cargarArquetipo, listarFicheros, coincideGlob } from '../lib/arquetipo.mjs';
import { generar, RAIZ_MOTOR, aplicarBloques } from '../lib/generar.mjs';
import { buscarRestos } from '../lib/verificar.mjs';

const require = createRequire(import.meta.url);
const EJEMPLO = join(RAIZ_MOTOR, 'clientes', 'ejemplo-cafeterias.json');
const arq = cargarArquetipo('hosteleria-multilocal', RAIZ_MOTOR);

// ---------- plantillas ----------
test('plantilla: valores, rutas con punto, json, condicionales y bucles con @i/@n/@ultimo', () => {
  const ctx = { nombre: 'Norte', cuentas: { jefe: 'admin' }, lista: ['a', 'b'], personas: [{ n: 'Ana' }, { n: 'Bea' }], vacio: [], si: true, no: false, obj: { x: 1 } };
  assert.equal(renderizar('Hola {{nombre}} / {{cuentas.jefe}}', ctx), 'Hola Norte / admin');
  assert.equal(renderizar('{{#cada lista}}{{@n}}:{{.}}{{#no @ultimo}}, {{/no}}{{/cada}}', ctx), '1:a, 2:b');
  assert.equal(renderizar('{{#cada personas}}{{n}}{{#si @ultimo}}.{{/si}}{{/cada}}', ctx), 'AnaBea.');
  assert.equal(renderizar('{{#si si}}A{{/si}}{{#si no}}B{{/si}}{{#no vacio}}C{{/no}}{{#si vacio}}D{{/si}}', ctx), 'AC');
  assert.equal(renderizar('{{json1 obj}}', ctx), '{"x":1}');
  assert.equal(renderizar('{{#cada personas}}{{../nombre}}-{{n}} {{/cada}}', ctx), 'Norte-Ana Norte-Bea ');
});
test('plantilla: un marcador desconocido o un bloque sin cerrar es un error, no un «undefined»', () => {
  assert.throws(() => renderizar('{{noexiste}}', {}), ErrorPlantilla);
  assert.throws(() => renderizar('{{#si x}}abierto', { x: 1 }), ErrorPlantilla);
  assert.throws(() => renderizar('{{obj}}', { obj: { a: 1 } }), ErrorPlantilla);
  assert.equal(renderizar('{{noexiste}}', {}, { laxo: true }), '{{noexiste}}');
});

// ---------- manifiesto ----------
const base = () => JSON.parse(readFileSync(EJEMPLO, 'utf8'));
test('manifiesto: el ejemplo valida y el contexto deriva lo que las plantillas necesitan', () => {
  const m = base();
  const { avisos } = validarManifiesto(m, arq, { dirBase: dirname(EJEMPLO) });
  assert.deepEqual(avisos, []);
  const ctx = contextoDe(m, arq, { hoy: '2026-09-19T10:00:00Z' });
  assert.equal(ctx.slug_, 'cafeterias_norte');
  assert.equal(ctx.NOMBRE_MAYUS, 'CAFETERÍAS NORTE');
  assert.equal(ctx.unidadesTexto, 'Cafetería Centro · Cafetería Playa · Cafetería Estación');
  assert.equal(ctx.nUnidadesTexto, 'los tres locales');
  assert.equal(ctx.modulos.entrevistas, false);
  assert.equal(ctx.modulos.cobertura, true, 'el núcleo siempre está');
  assert.equal(ctx.hashPasswordLocal.length, 64);
  assert.equal(ctx.marca.logoFichero, 'assets/cafeterias-norte-logo.svg');
  assert.equal(ctx.pestanas, 'Hoy · Semana · Mes · Equipo · Cobertura · Horas · Generador · Actividad');
  assert.equal(ctx.fecha, '19/09/2026');
  assert.equal(ctx.equipo.find(p => p.id === 'elena').puesto, 'apoyo');
});
test('manifiesto: los errores se juntan y se explican; los campos del núcleo no se apagan', () => {
  const m = base();
  m.slug = 'Mal Slug'; m.nombre = 'Con (paréntesis)'; m.unidades[0].minimos.M = [1, 2]; m.equipo[0].unidades = ['NOEXISTE']; m.modulos = { cobertura: false, inventado: true }; m.reglas = { rara: true }; m.franjas = ['M', 'T', 'N'];
  m.equipo.push({ nombre: 'Ana Pérez' });   // id derivado «anaperez» — no choca, pero sin puesto vale el primero
  m.equipo.push({ nombre: 'Ana Pérez' });   // el segundo sí choca
  try { validarManifiesto(m, arq, { dirBase: dirname(EJEMPLO) }); assert.fail('tenía que fallar'); }
  catch (e) {
    assert.ok(e instanceof ManifiestoInvalido);
    const txt = e.errores.join('\n');
    for (const frag of ['slug:', 'nombre:', 'minimos.M', 'NOEXISTE', 'cobertura', 'inventado', 'reglas.rara', 'franjas:', 'repetido']) assert.match(txt, new RegExp(frag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), 'falta el error de ' + frag);
    assert.ok(e.errores.length >= 9, `${e.errores.length} errores`);
  }
});
test('manifiesto: lo mínimo (nombre, slug y una unidad) basta, y los valores por defecto son sensatos', () => {
  const dir = mkdtempSync(join(tmpdir(), 'motor-min-'));
  const ruta = join(dir, 'cliente.json');
  writeFileSync(ruta, JSON.stringify({ slug: 'bar-pepe', nombre: 'Bar Pepe', unidades: [{ id: 'PEPE', nombre: 'Bar Pepe' }] }));
  const { ctx, avisos } = cargarManifiesto(ruta, arq, { hoy: '2026-09-19T10:00:00Z' });
  assert.deepEqual(avisos, []);
  assert.equal(ctx.cuentas.passwordGenerica, 'barpepe2026');
  assert.equal(ctx.slugCorto, 'barpep');
  assert.equal(ctx.nUnidadesTexto, 'el local');
  assert.equal(ctx.nEquipo, 0);
  assert.equal(ctx.descripcion, 'planificación de turnos de el local: planilla, equipo, horas, generador y cobertura');
  assert.ok(ctx.supuestos.length >= 3, 'sin mínimos ni horarios, todo es supuesto');
  const s = construirSemilla(ctx);
  assert.equal(s.locales[0].minimos.M[1], 1); assert.equal(s.locales[0].supuestos.M[1], true);
  assert.equal(s.locales[0].horarioSupuesto, true); assert.equal(s.locales[0].duracion.T, 480);
  assert.deepEqual(s.staff, []); assert.deepEqual(s.patron, {});
  rmSync(dir, { recursive: true, force: true });
});

// ---------- semilla: ida y vuelta con la app de origen ----------
test('semilla: el manifiesto extraído de la semilla del arquetipo la reconstruye EXACTAMENTE (ida y vuelta)', () => {
  const M = require(join(arq.origenAbs, 'modelo.js'));
  const original = M.semillaPasarela();
  const m = extraerManifiesto(original, { slug: 'pasarela', nombre: 'Grupo Pasarela' });
  validarManifiesto(m, arq);
  const ctx = contextoDe(m, arq);
  const reconstruida = construirSemilla(ctx);
  M.asignarColores(reconstruida.staff);
  assert.deepEqual(reconstruida, original);
  const guardado = JSON.parse(readFileSync(join(RAIZ_MOTOR, 'clientes', 'pasarela.json'), 'utf8'));
  assert.deepEqual(guardado.unidades, m.unidades, 'clientes/pasarela.json está al día con la semilla del arquetipo (regenera con bin/extraer-manifiesto.mjs)');
  assert.deepEqual(guardado.equipo, m.equipo);
  assert.deepEqual(guardado.semanaTipo, m.semanaTipo);
});
test('semilla: el bloque generado sustituye a la función de la semilla del arquetipo y sigue siendo JS válido', () => {
  const ctx = contextoDe(base(), arq);
  const codigo = codigoSemilla(construirSemilla(ctx), ctx);
  const modelo = readFileSync(join(arq.origenAbs, 'modelo.js'), 'utf8');
  const nuevo = aplicarBloques(modelo, arq.bloques, 'modelo.js', { semilla: codigo, puestos: 'const PUESTOS = [\n  { id: \'sala\', label: \'Sala\' },\n];\n' }).split('semillaPasarela').join('semillaCliente');
  assert.ok(!nuevo.includes('function semillaPasarela'));
  assert.ok(nuevo.includes('const SEMILLA_CLIENTE = {') && nuevo.includes('function semillaCliente()'));
  const dir = mkdtempSync(join(tmpdir(), 'motor-modelo-'));
  writeFileSync(join(dir, 'modelo.js'), nuevo);
  const M2 = require(join(dir, 'modelo.js'));
  const s = M2.semillaCliente();
  assert.deepEqual(s.locales.map(l => l.id), ['CENTRO', 'PLAYA', 'ESTACION']);
  assert.equal(s.staff.length, 8);
  assert.ok(s.staff.every(p => Number.isInteger(p.color)));
  assert.deepEqual(M2.PUESTOS.map(p => p.id), ['sala']);
  rmSync(dir, { recursive: true, force: true });
});

// ---------- arquetipo ----------
test('arquetipo: globs, lista de ficheros (incluye lo que toca, excluye lo del cliente de origen, conserva e2e-util)', () => {
  assert.ok(coincideGlob('tests/e2e-*.mjs', 'tests/e2e-app.mjs'));
  assert.ok(!coincideGlob('tests/e2e-*.mjs', 'tests/sub/e2e-app.mjs'));
  assert.ok(coincideGlob('tools/__pycache__/**', 'tools/__pycache__/x/y.pyc'));
  const { ficheros, faltan } = listarFicheros(arq);
  assert.deepEqual(faltan, []);
  for (const f of ['modelo.js', 'server.js', 'src/app/31-navegacion.js', 'src/styles/01-tokens.css', 'tests/e2e-util.mjs', 'tools/build.mjs', 'icons/icon-192.png', 'vendor/jspdf.umd.min.js']) assert.ok(ficheros.includes(f), 'falta ' + f);
  for (const f of ['tests/e2e-app.mjs', 'tests/server.test.mjs', 'src/app/23-entrevistas-datos.js', 'index.html', 'modelo.test.js', 'DISEÑO.md', 'motor/lib/generar.mjs', 'package.json']) assert.ok(!ficheros.includes(f), 'sobra ' + f);
});

// ---------- generación completa (lenta: ensambla y pasa los tests de la burbuja) ----------
test('generar: el cliente de ejemplo nace, ensambla, pasa sus tests y no lleva rastro del cliente de origen', { timeout: 600000 }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'motor-burbuja-'));
  const destino = join(dir, 'shiftia-cafeterias-norte');
  const informe = generar({ manifiesto: EJEMPLO, destino, tests: true, hoy: '2026-09-19T10:00:00Z' });
  const malos = informe.comprobaciones.pasos.filter(p => !p.ok).map(p => `${p.nombre}\n${p.salida.slice(-1500)}`).join('\n\n');
  assert.ok(informe.comprobaciones.ok, 'comprobaciones de la burbuja:\n' + malos);
  assert.deepEqual(informe.restos, [], 'restos del cliente de origen');
  assert.ok(informe.ok);
  for (const f of ['index.html', 'login.html', 'modelo.js', 'modelo.test.js', 'server.js', 'cliente.json', 'motor.lock.json', 'README.md', 'DISEÑO.md', 'DEPLOY-SERVIDOR.md', 'ARQUITECTURA.md', 'CHANGELOG.md', '.env.example', 'package.json', 'manifest.webmanifest', '.github/workflows/ci.yml', 'assets/cafeterias-norte-logo.svg', 'assets/shiftia-logo.svg', 'src/app/01-config-cliente.js', 'src/app/23-entrevistas-datos.js', 'src/styles/21-cafeterias-norte-app.css', 'tests/servidor.test.mjs', 'tests/seguridad.test.mjs', 'tests/e2e-util.mjs']) assert.ok(existsSync(join(destino, f)), 'falta ' + f);
  for (const f of ['tests/e2e-app.mjs', 'tests/server.test.mjs', 'tests/horarios.test.mjs', 'assets/pasarela-logo.svg', 'src/styles/21-pasarela-app.css']) assert.ok(!existsSync(join(destino, f)), 'sobra ' + f);
  const html = readFileSync(join(destino, 'index.html'), 'utf8');
  assert.ok(html.includes('<title>Shiftia · Cafeterías Norte</title>'));
  assert.ok(html.includes('Cafeterías <b>Norte</b>'), 'el texto del logo del cliente');
  assert.ok(html.includes('"entrevistas": false') && html.includes('const CONFIG_CLIENTE = {'), 'la configuración de módulos viaja en la app');
  assert.ok(html.includes('const SEMILLA_CLIENTE = {'));
  assert.ok(!html.includes('ENTREVISTAS_SEMILLA = [\n  C('), 'la base de entrevistas nace vacía');
  assert.ok(html.includes('shiftia_norte_') && html.includes('shiftia_cafeterias_norte_v01'), 'claves del navegador propias');
  const pkg = JSON.parse(readFileSync(join(destino, 'package.json'), 'utf8'));
  assert.equal(pkg.name, 'shiftia-cafeterias-norte'); assert.equal(pkg.version, '0.1.0');
  const lock = JSON.parse(readFileSync(join(destino, 'motor.lock.json'), 'utf8'));
  assert.equal(lock.arquetipo, 'hosteleria-multilocal'); assert.ok(lock.origen.commit && lock.manifiesto.sha256);
  const login = readFileSync(join(destino, 'login.html'), 'utf8');
  assert.ok(login.includes('Cafeterías Norte · Cafetería Centro · Cafetería Playa · Cafetería Estación'));
  assert.ok(!login.includes('pasarela2026') && login.includes('shiftia_norte_usuario'));
  const env = readFileSync(join(destino, '.env.example'), 'utf8');
  assert.ok(env.includes('HOST_CANONICO=turnos.cafeteriasnorte.es'));
  assert.ok(readFileSync(join(destino, 'DISEÑO.md'), 'utf8').includes('| P1 |'), 'las particularidades del cliente están en DISEÑO.md');
  // volver a generar encima sin --forzar se niega
  assert.throws(() => generar({ manifiesto: EJEMPLO, destino, tests: false }), /ya existe y no está vacío/);
  rmSync(dir, { recursive: true, force: true });
});

test('generar: un manifiesto sin equipo ni semana tipo también nace limpio y ensambla (sin tests, rápido)', { timeout: 120000 }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'motor-min-'));
  mkdirSync(join(dir, 'm'));
  const ruta = join(dir, 'm', 'cliente.json');
  writeFileSync(ruta, JSON.stringify({ slug: 'tienda-sol', nombre: 'Tienda Sol', sector: 'retail', unidades: [{ id: 'SOL', nombre: 'Tienda Sol', cocina: false }], modulos: { horas: false, generador: false, actividad: false } }));
  const informe = generar({ manifiesto: ruta, destino: join(dir, 'salida'), tests: false });
  assert.ok(informe.comprobaciones.ok, JSON.stringify(informe.comprobaciones.pasos.filter(p => !p.ok)).slice(0, 2000));
  assert.deepEqual(informe.restos, []);
  const html = readFileSync(join(dir, 'salida', 'index.html'), 'utf8');
  assert.ok(html.includes('"horas": false') && html.includes('"generador": false'));
  assert.ok(html.includes('Tienda <b>Sol</b>'));
  assert.deepEqual(buscarRestos(join(dir, 'salida'), ['Pasarela'], []), []);
  rmSync(dir, { recursive: true, force: true });
});
