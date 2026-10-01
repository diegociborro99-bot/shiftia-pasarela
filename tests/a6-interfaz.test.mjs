// Fase A6 de la auditoría del modelo (01/10, horas, núcleo y empleado): lo que la interfaz tiene que hacer con lo que ahora hace
// el modelo, comprobado sobre el index.html ensamblado y sus fuentes (INDEX permite pasar la prueba por otra copia de la app, la de
// antes, para verla en rojo). Lo que se ve con clics lo comprueba e2e-a6.
//  · «Ajustar apoyo» / «Horario distinto este día» no guarda la misma hora de entrada y de salida (G9);
//  · la huella de la planilla es la lista del modelo (CLAVES_PLANILLA), con las reglas, los equipos y los meses visibles (G8);
//  · la app del empleado no da de alta a nadie por su cuenta (migrarAltas, G11) y su cabecera respeta «Días que libra» (G5);
//  · «Abrir hoy» pasa la configuración para no escribir bajo un cierre por fechas (A6).
// Corrección tras la revisión (01/10): el aviso de «16:00–16:00» va dentro del formulario; el plan de la Cobertura no caduca por
// los meses visibles (cliente H9); el Generador llama «cortas» solo a las casillas a las que les falta gente (modelo S2).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(process.env.INDEX || join(RAIZ, 'index.html'), 'utf8');

test('«Ajustar apoyo» no guarda un tramo con la misma hora de entrada y de salida (G9: pagaba 24 h)', () => {
  // (corrección de A6) el aviso va dentro del formulario, encima de «Guardar» (como aviso suelto lo tapaba en el móvil)
  assert.match(html, /if \(vi === vf\) \{ avisoTramo\('La hora de entrada y la de salida no pueden ser la misma'\); return; \}/);
  assert.match(html, /<p class="trerr" data-trerr role="alert" hidden><\/p>\s*<div class="trbar">/);
  // y el aviso va antes de apuntar nada (ni el paso de deshacer)
  const i = html.indexOf("if (vi === vf) {"), j = html.indexOf("pushUndo('horas del apoyo'); en.ini = vi; en.fin = vf;");
  assert.ok(i > 0 && j > i, 'antes de guardar');
});

test('el hueco del Núcleo que se queda solo con apoyos tiene su título, y el de lo que falta dice por qué (G4)', () => {
  assert.match(html, /h\.tipo === 'apoyos' \? 'Solo apoyos: hace falta alguien de sala o de cocina'/);
  assert.match(html, /\$\{h\.motivo \? ' · ' \+ esc\(h\.motivo\) : ''\}`;/);
});

test('la app del empleado no da de alta a nadie al cargar (migrarAltas es del encargado, G11)', () => {
  const ini = html.indexOf('function migrarEstado(estado) {'), fin = html.indexOf('\n}\n', ini);
  const cuerpo = html.slice(ini, fin);
  assert.ok(ini > 0 && fin > ini);
  const iEmp = cuerpo.indexOf('const empleado = typeof SRV !== \'undefined\' && SRV.on && !SRV.esAdmin;'), iAltas = cuerpo.indexOf('if (!empleado) migrarAltas(estado);');
  assert.ok(iEmp > 0 && iAltas > iEmp, 'se sabe si es el empleado antes de las altas');
  assert.ok(!/\n\s*migrarAltas\(estado\);/.test(cuerpo), 'ninguna llamada sin la condición');
});

test('la cabecera del perfil del empleado respeta «Días que libra» apagada (G5, con las reglas que ahora recibe)', () => {
  assert.match(html, /\$\{activa\(S, p, 'libra'\) && p\.libra && p\.libra\.length \? ' · libra ' \+ textoDias\(p\.libra\) : ''\}/);
});

test('la huella de la planilla lee la lista del modelo (CLAVES_PLANILLA): apagar «Mínimos», cambiar un equipo o publicar un mes la cambian (G8)', async () => {
  assert.match(html, /const huellaPlanilla = e => JSON\.stringify\(CLAVES_PLANILLA\.map\(k => k === 'meses' \? mesesConContenido\(e\.meses\) : vacioHuella\(e\[k\]\) \? null : e\[k\]\)\);/);
  // la función tal cual, con la lista del modelo: lo que cambia y lo que no
  const { createRequire } = await import('node:module');
  const M = createRequire(import.meta.url)(join(RAIZ, 'modelo.js'));
  const linea = k => html.split('\n').find(l => l.startsWith('const ' + k + ' ='));
  const huellaPlanilla = new Function('CLAVES_PLANILLA', 'vacioHuella', linea('mesesConContenido') + '; ' + linea('huellaPlanilla') + '; return huellaPlanilla;')(M.CLAVES_PLANILLA, M.vacioHuella);
  const S = Object.assign(M.semillaPasarela(), { meses: {}, reglas: {}, mesesPublicados: [] });
  const h0 = huellaPlanilla(S);
  const cambia = f => { const c = JSON.parse(JSON.stringify(S)); f(c); return huellaPlanilla(c) !== h0; };
  assert.ok(cambia(c => { c.reglas.minimos = false; }), 'apagar «Mínimos»');
  assert.ok(cambia(c => { c.reglas.cocina = false; }), 'apagar «Cocina»');
  assert.ok(cambia(c => { c.mesesPublicados.push('2026-11'); }), 'publicar noviembre');
  assert.ok(cambia(c => { c.equipos[0].refuerzo.EL33 = 3; }), 'el refuerzo de un equipo');
  assert.ok(cambia(c => { c.cierresPuntuales.push({ id: 'x', localId: 'MONACO', dias: { '2026-10-05': ['T'] } }); }), 'un cierre por fechas');
  assert.ok(!cambia(c => { c.historial = [{ txt: 'x' }]; c.peticiones = [{ id: 'p' }]; c.y = 2030; }), 'el historial, las peticiones y la navegación no son la planilla');
  assert.ok(!cambia(c => { delete c.reglas; delete c.mesesPublicados; c.meses = { '2026-12': { asig: {}, apertura: {}, manual: {} } }; }), 'una clave que falta es lo mismo que vacía, y un mes vacío no cuenta');
});

test('«Abrir hoy» pasa la configuración: bajo un cierre por fechas no escribe nada y lo dice (A6)', () => {
  assert.match(html, /if \(!abrirCasilla\(estadoDeIso\(iso, true\), iso, tid, n, S\)\) \{ undoStack\.pop\(\); actualizarUndoBtn\(\); toast\('Ese día está cerrado por fechas: se abre desde «Ver cierre»', 'warn'\); return; \}/);
});

test('(corrección de A6, revisión de cliente H9) el plan de la Cobertura no caduca por los meses visibles: su huella es la de la planilla sin `mesesPublicados`', async () => {
  assert.match(html, /function planCaducado\(\) \{ return !!COB\.res && COB\.res\.huella !== huellaCobertura\(S\); \}/);
  assert.match(html, /res\.huella = huellaCobertura\(S\);/);
  assert.match(html, /<h3>Ha cambiado la planilla, una ficha o una regla del grupo: vuelve a buscar<\/h3>/);
  assert.ok(!/<h3>La ficha ha cambiado/.test(html), 'el texto de antes, fuera');
  const { createRequire } = await import('node:module');
  const M = createRequire(import.meta.url)(join(RAIZ, 'modelo.js'));
  const linea = k => html.split('\n').find(l => l.startsWith('const ' + k + ' ='));
  const huellaCobertura = new Function('CLAVES_PLANILLA', 'vacioHuella', [linea('mesesConContenido'), linea('huellaPlanilla'), linea('huellaCobertura')].join('; ') + '; return huellaCobertura;')(M.CLAVES_PLANILLA, M.vacioHuella);
  const S = Object.assign(M.semillaPasarela(), { meses: {}, reglas: {}, mesesPublicados: [] });
  const h0 = huellaCobertura(S);
  const cambia = f => { const c = JSON.parse(JSON.stringify(S)); f(c); return huellaCobertura(c) !== h0; };
  assert.ok(!cambia(c => { c.mesesPublicados.push('2026-11'); }), 'hacer visible noviembre no la cambia');
  assert.ok(cambia(c => { c.reglas.minimos = false; }), 'apagar «Mínimos», sí');
  assert.ok(cambia(c => { c.staff[0].libra = [3]; }), 'una ficha, sí');
});

test('(corrección de A6, revisión de modelo S2) el Generador llama «cortas» solo a las casillas a las que les falta gente; las que solo tienen apoyos, las que no tienen quien abra y las que no tienen su cocina obligatoria, con su frase', () => {
  const ini = html.indexOf('function cuentaHuecos('), fin = html.indexOf('\n}\n', html.indexOf('function textoHuecos(')) + 2;
  assert.ok(ini > 0 && fin > ini, 'cuentaHuecos y textoHuecos');
  const pl = (n, a, b) => `${n} ${n === 1 ? a : b}`;
  const { textoHuecos } = new Function('pl', html.slice(ini, fin) + '; return { textoHuecos };')(pl);
  const h = (iso, tid, x) => Object.assign({ iso, turnoId: tid, faltan: 0 }, x);
  assert.equal(textoHuecos([h('2026-10-07', 'PASARELA_T', { faltan: 2, motivo: 'solo apoyos: hace falta alguien de sala o de cocina' }), h('2026-10-07', 'PASARELA_T', { tipo: 'primero' })]), '1 casilla corta');
  assert.equal(textoHuecos([h('2026-10-07', 'PASARELA_T', { tipo: 'apoyos' })]), '1 casilla solo con apoyos', 'el hueco «solo apoyos» con su mínimo no es una casilla corta');
  assert.equal(textoHuecos([h('2026-10-07', 'PASARELA_T', { faltan: 1 }), h('2026-10-08', 'EL33_M', { faltan: 1 }), h('2026-10-08', 'ZAPA_T', { tipo: 'apoyos' }), h('2026-10-09', 'MONACO_T', { tipo: 'primero' }), h('2026-10-09', 'MONACO_M', { tipo: 'cocina' })]), '2 casillas cortas, 1 casilla solo con apoyos, 1 casilla sin quien abra, 1 casilla sin su cocina obligatoria');
  // lo usan la línea del núcleo, la cuenta de arriba, cada día, el historial y el aviso al volcar
  assert.equal((html.match(/textoHuecos\(/g) || []).length >= 5, true);
  assert.ok(!/pl\(p\.huecos\.length, 'casilla sigue corta'|pl\(cortas, 'casilla se queda corta'|pl\(porDia\[iso\]\.hu\.length, 'casilla corta'/.test(html), 'ya no cuenta como «cortas» todos los huecos');
});
