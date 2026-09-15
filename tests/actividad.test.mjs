// El visor «Actividad» del programador existe como pestaña con su sección, la
// navegación lo conoce, el móvil lo lista en «Más», solo lo ve el programador
// (body.rol-programador; el empleado nunca) y fusiona el historial de la planilla
// con la auditoría del servidor (GET /api/auditoria) traducida al español.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(RAIZ, 'index.html'), 'utf8');
const modulo = html.slice(html.indexOf('// ================= ACTIVIDAD'), html.indexOf('// ================= ENTREVISTAS'));

test('hay una pestaña Actividad con su sección y su raíz, entre Cobertura y Entrevistas', () => {
  assert.match(html, /class="tab" role="tab" data-v="actividad"/);
  assert.match(html, /<section class="view hidden" id="view-actividad">/);
  assert.match(html, /id="actRoot"/);
  const tabs = [...html.matchAll(/class="tab" role="tab" data-v="([a-z]+)"/g)].map(m => m[1]);
  assert.deepEqual(tabs.slice(tabs.indexOf('cobertura'), tabs.indexOf('cobertura') + 3), ['cobertura', 'actividad', 'entrevistas']);
});
test('la navegación conoce la vista, el repintado la mapea y el móvil la lista en «Más» solo si el rol lo permite', () => {
  assert.match(html, /const VISTAS = \[[^\]]*'actividad'/);
  assert.match(html, /const BNAV_EN_MAS = \[[^\]]*'actividad'/);
  assert.match(html, /if \(v === 'actividad'\) renderActividad\(\);/);
  assert.match(html, /actividad: \(\) => renderActividad\(\)/);
  assert.match(html, /!SRV\.on \|\| SRV\.rol === 'programador' \? fila\('actividad', /);
});
test('solo la ve el programador: clase en <body> al saber el rol (y en modo local) y CSS que oculta la pestaña', () => {
  assert.match(html, /function marcarRolProgramador\(\) \{ document\.body\.classList\.toggle\('rol-programador', !SRV\.on \|\| SRV\.rol === 'programador'\); \}/);
  assert.match(html, /SRV\.rol = datos\.rol;[^\n]*\n\s*marcarRolProgramador\(\);/, 'al entrar con servidor');
  assert.match(html, /marcarRolProgramador\(\);\s*\/\/ modo local/, 'en el arranque sin servidor');
  assert.match(html, /body:not\(\.rol-programador\) \.tab\[data-v="actividad"\]\{display:none!important\}/);
  assert.match(html, /if \(v === 'actividad' && SRV\.on && SRV\.rol && SRV\.rol !== 'programador'\) v = 'hoy';/);
});
test('el empleado no la ve', () => {
  assert.match(html, /\.modo-empleado #view-actividad\{display:none!important\}/);
});
test('renderActividad pide la auditoría del servidor (500 filas, solo programador) y fusiona el historial de la planilla', () => {
  assert.match(modulo, /function renderActividad\(\)/);
  assert.match(modulo, /api\('GET', '\/api\/auditoria\?n=500'\)/);
  assert.match(modulo, /if \(!\(SRV\.on && SRV\.rol === 'programador'\)\)/);
  assert.match(modulo, /\(S\.historial \|\| \[\]\)\.map\(actDesdeHistorial\)\.concat\(\(ACT\.filas \|\| \[\]\)\.map\(actDesdeAuditoria\)\)/);
  assert.match(modulo, /HIST_TIPO\[x\.tipo\] \|\| HIST_TIPO\.cambio/);
  assert.match(modulo, /Sin servidor: solo el historial de esta planilla/);
});
test('traduce las acciones del servidor al español y las agrupa por tipo con sus colores', () => {
  assert.match(modulo, /'login': \['accesos', 'ACCESO', \(\) => 'Inicio de sesión'\]/);
  assert.match(modulo, /'estado': \['planilla', 'GUARDADO', d => `Guardó la planilla/);
  assert.match(modulo, /'login-fallido': \['accesos', 'FALLIDO', d => `Acceso fallido[^\]]*'var\(--bad\)'\]/);
  assert.match(modulo, /'usuario-alta': \['usuarios', 'ALTA', d => `Alta de usuario/);
  for (const a of ['login-bloqueado', 'logout-todos', 'copia', 'password', 'usuario-reset', 'usuario-baja', 'peticion', 'cambio-aceptado', 'cambio-rechazado', 'nucleo-solve', 'admin-reset', 'admin-promote', 'csrf-rechazado']) assert.match(modulo, new RegExp(`'${a}': \\[`), a);
  assert.match(modulo, /accesos: \['var\(--teal\)', 'Accesos'\], planilla: \['var\(--accent\)', 'Planilla'\], usuarios: \['#7c5fb8', 'Usuarios'\]/);
  assert.match(modulo, /peticiones: \[[^\]]*'Peticiones'\], otros: \['var\(--ink3\)', 'Otros'\]/);
});
test('tarjetas resumen, filtros, buscador, «Actualizar», aviso si el encargado no ha entrado y «Mostrar más» a partir de 300 filas', () => {
  for (const k of ['acceso', 'guardado', 'hoy', 'semana', 'fallidos']) assert.match(modulo, new RegExp(`kpi\\('${k}', `), k);
  assert.match(modulo, /id="actChipsU"/); assert.match(modulo, /id="actChipsT"/);
  assert.match(modulo, /id="actQ"/); assert.match(modulo, /id="actRefresh">Actualizar</);
  assert.match(modulo, /El encargado aún no ha entrado en la app/);
  assert.match(modulo, /const ACT_MAX = 300;/);
  assert.match(modulo, /id="actMas">Mostrar más</);
});
