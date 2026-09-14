// «Compartir semana» (14/09): el encargado pulsa Compartir y la app genera una IMAGEN
// PNG de la planilla de la semana (general o de un local) sin abrir la vista previa.
// En el móvil abre la hoja de compartir del sistema (WhatsApp…); en el ordenador, o si
// el navegador no sabe compartir ficheros, descarga el PNG. Se comprueba:
//   (1) en escritorio, Compartir → Toda la semana descarga Planilla_semana_….png (> 30 KB);
//   (2) con navigator.share simulado, Compartir → El 33 llama a share con un PNG «…33…»;
//   (3) el historial registra «compartida»; (4) en el móvil el popover es hoja inferior;
//   (5) sin pageerror. Servidor estático propio (nunca server.js): modo local con sesión.
// PNG_OUT=/ruta/fichero.png guarda una copia de la imagen descargada (para mirarla).
import { createServer } from 'node:http';
import { readFile, copyFile } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
let chromium;
try { ({ chromium } = await import('playwright-core')); }
catch (e) { try { ({ chromium } = (await import('node:module')).createRequire(import.meta.url)('/opt/node22/lib/node_modules/playwright/node_modules/playwright-core')); } catch (e2) { console.log('SALTADA: falta playwright-core'); process.exit(0); } }
const CHROMIUM = process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium';
if (!existsSync(CHROMIUM)) { console.log('SALTADA: sin Chromium'); process.exit(0); }

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8800 + Math.floor(Math.random() * 60), BASE = `http://127.0.0.1:${PORT}`;
let n = 0, malos = 0;
const ok = (t, c, x) => { n++; console.log(c ? `  ✓ ${t}` : `  ✗ ${t}${x ? ' → ' + String(x).slice(0, 300) : ''}`); if (!c) malos++; };
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon' };
const srv = createServer(async (req, res) => {
  let ruta = decodeURIComponent(new URL(req.url, BASE).pathname);
  if (ruta === '/') ruta = '/index.html';
  const fichero = resolve(join(RAIZ, ruta));
  if (!fichero.startsWith(RAIZ + '/')) { res.writeHead(403); res.end(); return; }
  try { const buf = await readFile(fichero); res.writeHead(200, { 'Content-Type': MIME[extname(fichero)] || 'application/octet-stream' }); res.end(buf); }
  catch (e) { res.writeHead(404); res.end('no'); }   // /api/salud → 404: la app arranca en modo local
});
await new Promise(r => srv.listen(PORT, '127.0.0.1', r));
setTimeout(() => { console.log('  ✗ tiempo agotado'); process.exit(1); }, 85000).unref();

const SESION = () => { try { sessionStorage.setItem('shiftia_pas_sesion', '1'); } catch (e) {} };
// simulación de la Web Share API: guarda lo que le llega en window.__compartido
const SHARE_FALSO = () => {
  window.__compartido = [];
  navigator.canShare = d => !!(d && d.files && d.files.length);
  navigator.share = async d => { window.__compartido.push({ title: d.title, text: d.text, files: [...d.files].map(f => ({ name: f.name, type: f.type, size: f.size })) }); };
};
const errores = [];
const prepara = async (pg, etiqueta) => {
  pg.on('pageerror', e => errores.push(`${etiqueta}: ${e.message}`));
  pg.on('dialog', d => d.accept());
  await pg.route(/googleapis|gstatic/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await pg.goto(`${BASE}/index.html?demo=1`);
  await pg.waitForSelector('#diaLocales .loccard', { timeout: 15000 });
};
const textoHistorial = async pg => {
  await pg.click('#topHist'); await pg.waitForSelector('#histOvl');
  const t = await pg.$$eval('#histOvl .histx', xs => xs.map(x => x.textContent).join(' | '));
  await pg.click('#histOvl [data-ovx]'); await pg.waitForTimeout(150);
  return t;
};

const br = await chromium.launch({ executablePath: CHROMIUM, args: ['--no-sandbox'] });
try {
  // ── (1) ESCRITORIO: Compartir → Toda la semana → descarga del PNG
  const ctxA = await br.newContext({ viewport: { width: 1500, height: 1000 }, acceptDownloads: true });
  await ctxA.addInitScript(SESION);
  const pgA = await ctxA.newPage();
  await prepara(pgA, 'escritorio');
  ok('la app entra en modo local con la semana de muestra', await pgA.$eval('#diaLocales', d => d.querySelectorAll('.pchip').length > 0));
  await pgA.click('.tab[data-v="semana"]'); await pgA.waitForSelector('#semRoot table, #semRoot .semk, #semRoot *', { timeout: 5000 });
  ok('la barra de la semana tiene el botón Compartir antes de Imprimir', await pgA.$eval('#wShare', b => b.nextElementSibling && b.nextElementSibling.id === 'printBtn' && b.offsetParent !== null));
  await pgA.click('#wShare'); await pgA.waitForSelector('#sharePop');
  const opciones = await pgA.$$eval('#sharePop [data-share]', bs => bs.map(b => ({ id: b.dataset.share, txt: b.textContent.trim(), lc: b.style.getPropertyValue('--lc').trim() })));
  ok('el popover ofrece Toda la semana y un local por fila, con su color', opciones.length === 5 && opciones[0].id === '' && /Toda la semana/.test(opciones[0].txt) && opciones.slice(1).every(o => o.id && /^#/.test(o.lc)), JSON.stringify(opciones));
  ok('el pie explica que se genera una imagen para WhatsApp', await pgA.$eval('#sharePop .sharepie', p => /imagen/i.test(p.textContent) && /WhatsApp/.test(p.textContent)));
  ok('en escritorio va anclado al botón (no es hoja inferior)', await pgA.$eval('#sharePop', p => !p.classList.contains('sheet')));
  const [descarga] = await Promise.all([pgA.waitForEvent('download', { timeout: 40000 }).catch(() => null), pgA.click('#sharePop [data-share=""]')]);
  ok('el popover se cierra al elegir', await pgA.$('#sharePop') === null);
  ok('«Toda la semana» descarga Planilla_semana_<lunes>.png', !!descarga && /^Planilla_semana_\d{4}-\d{2}-\d{2}\.png$/.test(descarga.suggestedFilename()), descarga ? descarga.suggestedFilename() : 'sin descarga');
  if (descarga) {
    const ruta = await descarga.path();
    const buf = readFileSync(ruta);
    ok('el fichero es un PNG de verdad de más de 30 KB', buf.slice(1, 4).toString() === 'PNG' && buf.length > 30 * 1024, `${buf.length} B`);
    // ancho y alto del IHDR: la hoja apaisada a escala 2 (297 mm ≈ 1123 px → ~2246 px)
    const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
    ok('la imagen es apaisada y nítida (escala 2: unos 2.200 px de ancho)', w > 2000 && w > h, `${w}×${h}`);
    if (process.env.PNG_OUT) await copyFile(ruta, process.env.PNG_OUT).catch(() => {});
  }
  await pgA.waitForTimeout(300);
  ok('la vista previa de impresión no se ha quedado abierta', await pgA.evaluate(() => document.getElementById('printRoot').classList.contains('hidden') && !document.getElementById('printRoot').classList.contains('capturando') && !document.body.classList.contains('printing')));
  ok('el botón vuelve a estar activo', await pgA.$eval('#wShare', b => !b.disabled));
  ok('la semana en pantalla no ha cambiado', await pgA.evaluate(() => S.semLunes === mondayOf(isoDia())));
  const histA = await textoHistorial(pgA);
  ok('el historial registra la semana compartida como imagen (general)', /Semana del .* compartida como imagen \(general\)/.test(histA), histA.slice(0, 200));

  // ── (2) CON navigator.share: Compartir de El 33 desde Hoy → share con un PNG «…33…»
  const ctxB = await br.newContext({ viewport: { width: 1500, height: 1000 }, acceptDownloads: true });
  await ctxB.addInitScript(SESION); await ctxB.addInitScript(SHARE_FALSO);
  const pgB = await ctxB.newPage();
  await prepara(pgB, 'share');
  ok('cada local de Hoy tiene su botón Compartir junto a Imprimir', await pgB.$$eval('#diaLocales .loccard', cs => cs.length >= 4 && cs.every(c => c.querySelector('[data-printlocal] + [data-sharelocal]'))));
  let descargaB = null; pgB.on('download', d => { descargaB = d; });
  await pgB.click('#diaLocales [data-sharelocal="EL33"]');
  ok('mientras genera, el botón está deshabilitado', await pgB.$eval('#diaLocales [data-sharelocal="EL33"]', b => b.disabled));
  await pgB.waitForFunction(() => window.__compartido && window.__compartido.length > 0, null, { timeout: 40000 }).catch(() => {});
  const comp = await pgB.evaluate(() => window.__compartido);
  ok('se llama a navigator.share con un solo fichero', comp.length === 1 && comp[0].files.length === 1, JSON.stringify(comp));
  const f = comp[0] && comp[0].files[0];
  ok('el fichero es image/png y su nombre lleva el 33 y la semana', !!f && f.type === 'image/png' && /33/.test(f.name) && /^Planilla_33_semana_\d{4}-\d{2}-\d{2}\.png$/.test(f.name) && f.size > 30 * 1024, f ? `${f.name} · ${f.size} B` : 'sin fichero');
  ok('el título de la hoja de compartir nombra el local y la semana', !!comp[0] && /El 33/.test(comp[0].title) && /semana del/.test(comp[0].title), comp[0] && comp[0].title);
  await pgB.waitForTimeout(400);
  ok('si el sistema comparte, no descarga además', descargaB === null);
  ok('el botón vuelve a estar activo', await pgB.$eval('#diaLocales [data-sharelocal="EL33"]', b => !b.disabled));
  const histB = await textoHistorial(pgB);
  ok('el historial registra la semana compartida como imagen (El 33)', /Semana del .* compartida como imagen \(El 33\)/.test(histB), histB.slice(0, 200));

  // ── (4) MÓVIL: el popover es hoja inferior con fondo
  const ctxM = await br.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctxM.addInitScript(SESION);
  const pgM = await ctxM.newPage();
  await prepara(pgM, 'movil');
  await pgM.evaluate(() => switchTab('semana')); await pgM.waitForTimeout(300);
  await pgM.evaluate(() => document.getElementById('wShare').click()); await pgM.waitForSelector('#sharePop');
  ok('en el móvil el popover se convierte en hoja inferior con fondo', await pgM.evaluate(() => { const p = document.getElementById('sharePop'); const r = p.getBoundingClientRect(); return p.classList.contains('sheet') && !!document.querySelector('.popfondo') && r.left === 0 && Math.round(r.width) === innerWidth && r.bottom <= innerHeight; }));
  ok('la hoja lleva las cinco opciones con altura de pulgar (≥ 44 px)', await pgM.$$eval('#sharePop [data-share]', bs => bs.length === 5 && bs.every(b => b.getBoundingClientRect().height >= 44)));
  await pgM.evaluate(() => document.querySelector('.popfondo').click()); await pgM.waitForTimeout(200);
  ok('tocar el fondo cierra la hoja', await pgM.$('#sharePop') === null && await pgM.$('.popfondo') === null);

  ok('sin errores de página', errores.length === 0, errores.join(' | '));
} finally {
  await br.close();
  srv.close();
}
console.log(`\n${n - malos}/${n} OK${malos ? ` · ${malos} FALLOS` : ''}`);
process.exit(malos ? 1 : 0);
