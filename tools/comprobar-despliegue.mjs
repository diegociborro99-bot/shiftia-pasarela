#!/usr/bin/env node
// Comprueba un despliegue de Shiftia · Pasarela desde fuera, sin sesión:
//   node tools/comprobar-despliegue.mjs https://TU-URL.up.railway.app
// Verifica salud y persistencia, que sin sesión se sirve la pantalla de acceso (y
// nunca la app), que la API exige sesión, la versión desplegada frente a la del
// repo, y las cabeceras de seguridad. Sale con 1 si algo no cuadra.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const url = (process.argv[2] || '').replace(/\/+$/, '');
if (!/^https?:\/\//.test(url)) { console.error('Uso: node tools/comprobar-despliegue.mjs https://TU-URL'); process.exit(2); }
let n = 0, malos = 0;
const ok = (t, c, x) => { n++; console.log(c ? `  ✓ ${t}` : `  ✗ ${t}${x ? ' → ' + x : ''}`); if (!c) malos++; };
const get = async (ruta, opts) => {
  const r = await fetch(url + ruta, { redirect: 'manual', ...(opts || {}) });
  const txt = await r.text();
  return { status: r.status, headers: r.headers, txt, json: (() => { try { return JSON.parse(txt); } catch (e) { return null; } })() };
};
const buildRepo = (() => { try { return (readFileSync(join(RAIZ, 'index.html'), 'utf8').match(/name="shiftia-build" content="([^"]+)"/) || [])[1]; } catch (e) { return null; } })();
console.log(`Comprobando ${url}`);
try {
  const salud = await get('/api/salud');
  ok('/api/salud responde 200 con ok:true', salud.status === 200 && salud.json && salud.json.ok === true, `${salud.status} ${salud.txt.slice(0, 120)}`);
  const pers = salud.json && salud.json.persistencia;
  ok('la base de datos está en un volumen (persistencia: volumen)', pers === 'volumen', `persistencia: ${pers} — sin Volume en /data la BD se pierde en cada redeploy`);
  const raiz = await get('/');
  ok('sin sesión, / sirve la pantalla de acceso (loginForm) y no la app', raiz.status === 200 && /loginForm|logincard/.test(raiz.txt) && !/MODELO_START/.test(raiz.txt), `${raiz.status}`);
  const indexSin = await get('/index.html');
  ok('sin sesión, /index.html no entrega la app', !/MODELO_START/.test(indexSin.txt), `${indexSin.status}`);
  const yo = await get('/api/yo');
  ok('/api/yo sin sesión → 401', yo.status === 401, `${yo.status}`);
  const estado = await get('/api/estado');
  ok('/api/estado sin sesión → 401', estado.status === 401, `${estado.status}`);
  // la huella del build viaja en la propia pantalla de acceso (<meta name="shiftia-build">); /api/version exige sesión
  const build = (raiz.txt.match(/name="shiftia-build" content="([^"]+)"/) || [])[1] || null;
  ok('la pantalla de acceso lleva la huella del build', !!build, 'sin <meta name="shiftia-build">');
  if (buildRepo) ok(`la versión desplegada (${build}) es la del repo (${buildRepo})`, build === buildRepo, 'haz redeploy con el último main');
  const h = raiz.headers;
  ok('cabeceras de seguridad (CSP, nosniff, frame)', !!h.get('content-security-policy') && /nosniff/.test(h.get('x-content-type-options') || '') && !!(h.get('x-frame-options') || (h.get('content-security-policy') || '').includes('frame-ancestors')), [...h.keys()].join(', '));
  ok('HTTPS con HSTS', url.startsWith('https://') ? !!h.get('strict-transport-security') : true, 'sin strict-transport-security (Railway pone HTTPS; HSTS lo añade el servidor con HTTPS detrás del proxy)');
  const login = await get('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario: 'nadie', password: 'x' }) });
  ok('un acceso inválido devuelve 401 sin desvelar nada', login.status === 401 || login.status === 429, `${login.status} ${login.txt.slice(0, 80)}`);
  const manifest = await get('/manifest.webmanifest');
  ok('manifest de la PWA disponible', manifest.status === 200, `${manifest.status}`);
} catch (e) { ok('el servidor responde', false, e.message); }
console.log(`\n${n} comprobaciones, ${malos} fallo(s)`);
process.exit(malos ? 1 : 0);
