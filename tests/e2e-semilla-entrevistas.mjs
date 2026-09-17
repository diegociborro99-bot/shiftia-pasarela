// A quien ya tenía la app en marcha, las 150 entrevistas de papel tienen que LLEGARLE.
// La semilla solo siembra la lista vacía, así que esta batería simula una instalación
// vieja —fichas de solo nombre y teléfono, ya guardadas en localStorage— y comprueba que
// tras recargar la sección Entrevistas enseña la entrevista entera. (Diego, 17/09:
// «subelo a main, que se muestre ya en entrevistas»).
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cargarChromium, contador, llega, prepararPagina } from './e2e-util.mjs';

const { chromium, CHROMIUM } = await cargarChromium();
const RAIZ = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'));
const { ok, resumen } = contador();

// servidor estático (nunca server.js): la app detecta que no hay backend y va en local
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.ico': 'image/x-icon' };
const srv = createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname.startsWith('/api/')) { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end('{"error":"sin servidor"}'); return; }
  const abs = resolve(join(RAIZ, u.pathname === '/' ? 'index.html' : u.pathname));
  if (!abs.startsWith(RAIZ) || !existsSync(abs) || statSync(abs).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(abs)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  res.end(readFileSync(abs));
});
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const URL_APP = `http://127.0.0.1:${srv.address().port}/index.html`;

const errores = [];
const nav = await chromium.launch({ executablePath: CHROMIUM, args: ['--no-sandbox'] });
const ctx = await nav.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.addInitScript(() => { try { sessionStorage.setItem('shiftia_pas_sesion', '1'); sessionStorage.setItem('shiftia_pas_rol', 'admin'); } catch (e) {} });
const pg = await ctx.newPage();
await prepararPagina(pg, errores, 'semilla');

// 1) arranque normal: se siembra la base entera
await pg.goto(URL_APP, { waitUntil: 'load' });
ok('arranca y siembra la base de entrevistas', await llega(pg, () => typeof S !== 'undefined' && !!(S.entrevistas || []).length) >= 0);
const conEntrevista = await pg.evaluate(() => (S.entrevistas || []).filter(c => c.exp).length);
ok(`la semilla trae ${conEntrevista} fichas con la experiencia contada`, conEntrevista >= 180, conEntrevista);

// 2) ahora la instalación VIEJA: mismas fichas pero sin nada de la entrevista, y con una
//    observación escrita por el encargado que no se puede perder
await pg.evaluate(() => {
  const viejo = JSON.parse(JSON.stringify(S));
  viejo.semillaEnt = 1;          // la versión anterior del volcado
  viejo.entrevistas = (viejo.entrevistas || []).map(c => ({
    id: c.id, nombre: c.nombre, tel: c.tel, lista: c.lista, puestos: [], hab: {},
  }));
  const mio = viejo.entrevistas.find(c => c.tel === '662082645');   // Emilia Hernández
  mio.obs = 'ESTO LO ESCRIBIÓ EL ENCARGADO';
  mio.val = 'regular';
  localStorage.setItem('shiftia_pasarela_v01', JSON.stringify(viejo));
});
await pg.reload({ waitUntil: 'load' });
ok('la app vuelve a cargar con los datos que ya había guardados',
  await llega(pg, () => typeof S !== 'undefined' && !!(S.entrevistas || []).length, null, 12000) >= 0);

const tras = await pg.evaluate(() => {
  const c = (S.entrevistas || []).find(x => x.tel === '662082645');
  return {
    total: (S.entrevistas || []).length,
    conExp: (S.entrevistas || []).filter(x => x.exp).length,
    conHab: (S.entrevistas || []).filter(x => Object.keys(x.hab || {}).length).length,
    valoradas: (S.entrevistas || []).filter(x => x.val).length,
    emilia: c && { edad: c.edad, exp: (c.exp || '').slice(0, 20), obs: c.obs, val: c.val, hab: c.hab },
    version: S.semillaEnt,
  };
});
ok(`las entrevistas llegan a la instalación que ya existía: ${tras.conExp} con experiencia`, tras.conExp >= 180, JSON.stringify(tras));
ok(`y las aptitudes también: ${tras.conHab} fichas`, tras.conHab >= 170, tras.conHab);
ok(`y las valoraciones: ${tras.valoradas}`, tras.valoradas >= 110, tras.valoradas);
ok('no se duplica ninguna ficha', tras.total === 275, tras.total);
ok('lo que escribió el encargado NO se pisa', tras.emilia.obs === 'ESTO LO ESCRIBIÓ EL ENCARGADO' && tras.emilia.val === 'regular', JSON.stringify(tras.emilia));
ok('pero lo que tenía en blanco sí se rellena', tras.emilia.edad === '41' && /La Paraeta/.test(tras.emilia.exp) && tras.emilia.hab.pda === 'no', JSON.stringify(tras.emilia));
ok('la fusión queda marcada para no repetirse', tras.version === 2, tras.version);

// 3) y se VE en pantalla, que es lo que pidió Diego
await pg.click('.tab[data-v="entrevistas"]');
ok('la pestaña Entrevistas se abre',
  await llega(pg, () => { const s = document.getElementById('view-entrevistas'); return !!s && !s.classList.contains('hidden'); }, null, 4000) >= 0);
await pg.fill('#entQ', '662082645'); await pg.waitForTimeout(300);
ok('el buscador la encuentra en la sección Entrevistas', await pg.$$eval('#entrevistasRoot .entrow', x => x.length) === 1,
  await pg.$$eval('#entrevistasRoot .entrow', x => x.length));
await pg.click('#entrevistasRoot .entrow'); await pg.waitForTimeout(350);
const ficha = await pg.$eval('#candOvl', e => e.textContent);
ok('su perfil enseña la entrevista entera: edad, zona, experiencia y sueldo',
  /41/.test(ficha) && /Elche/.test(ficha) && /La Paraeta/.test(ficha) && /1200/.test(ficha),
  ficha.slice(0, 300));
ok('y las aptitudes que dijo en el papel', await pg.$$eval('#candOvl .habchip', x => x.length) === 8,
  await pg.$$eval('#candOvl .habchip', x => x.length));

ok('sin errores de página', errores.length === 0, errores.join(' | '));
await nav.close();
srv.close();
resumen();
