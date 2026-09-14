// PIEZAS COMUNES DE LAS BATERÍAS E2E (Playwright, 14/09).
// Mismo patrón que los tests/e2e-*.mjs del piloto de urología: si no hay
// playwright-core o no hay Chromium, la batería se salta sin fallar (SALTADA);
// un `ok(t, c, x)` por comprobación; y las esperas son siempre por condición.
import { existsSync } from 'node:fs';

// playwright-core: como dependencia normal o, en el contenedor, desde la
// instalación global de playwright (sin descargar nada)
export async function cargarChromium() {
  let chromium;
  try { ({ chromium } = await import('playwright-core')); }
  catch (e) {
    try { ({ chromium } = (await import('node:module')).createRequire(import.meta.url)('/opt/node22/lib/node_modules/playwright/node_modules/playwright-core')); }
    catch (e2) { console.log('SALTADA: falta playwright-core'); process.exit(0); }
  }
  const CHROMIUM = process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium';
  if (!existsSync(CHROMIUM)) { console.log('SALTADA: sin Chromium'); process.exit(0); }
  return { chromium, CHROMIUM };
}

// contador de comprobaciones: ok(título, condición, detalle si falla)
export function contador() {
  const c = { n: 0, malos: 0 };
  const ok = (t, cond, extra) => {
    c.n++;
    if (cond) console.log(`  ✓ ${t}`);
    else { c.malos++; console.log(`  ✗ ${t}${extra !== undefined && extra !== '' ? ' → ' + String(extra).slice(0, 400) : ''}`); }
    return !!cond;
  };
  const resumen = () => { console.log(`\n${c.n} comprobaciones, ${c.malos} fallos`); process.exit(c.malos ? 1 : 0); };
  return { ok, resumen, c };
}

// espera a que una condición sea cierta dentro de la página; devuelve los ms
// que tardó o -1 si no llegó en el tope
export async function llega(pg, fn, arg, tope = 8000) {
  const t0 = Date.now();
  while (Date.now() - t0 < tope) {
    if (await pg.evaluate(fn, arg).catch(() => false)) return Date.now() - t0;
    await new Promise(r => setTimeout(r, 120));
  }
  return -1;
}

// espera a que una función de Node devuelva algo verdadero (sondeos a la API)
export async function hasta(fn, tope = 10000, paso = 200) {
  const t0 = Date.now();
  while (Date.now() - t0 < tope) {
    const v = await fn().catch(() => null);
    if (v) return { v, ms: Date.now() - t0 };
    await new Promise(r => setTimeout(r, paso));
  }
  return { v: null, ms: -1 };
}

// página preparada: errores de página a la lista, diálogos aceptados y sin
// salidas a la red (fuentes de Google, cdnjs): se contestan vacías
export async function prepararPagina(pg, errores, etiqueta) {
  pg.on('pageerror', e => errores.push(`${etiqueta}: ${e.message}`));
  pg.on('dialog', d => d.accept().catch(() => {}));
  await pg.route(/googleapis|gstatic|cdnjs/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
}

// Pone a alguien en una casilla de Hoy desde el selector (11-selector.js), solo
// con la interfaz: pulsa un [data-pick] visible, espera #pickerPop y elige al
// primero del grupo «pueden» ([data-pickpid] sin data-aviso). Si todas las casillas
// del día están completas (mes de muestra), primero se libera una plaza con el ×
// del chip ([data-un]) y se vuelve a poner desde el selector. Devuelve
// {iso, tid, pid, antes, despues, via} o null si no hubo forma.
export async function asignarDesdeSelector(pg, excluirPid) {
  const chips = clave => pg.$$eval(`[data-cas="${clave}"] .pchip`, x => x.length).catch(() => -1);
  const elegir = async clave => {
    const b = await pg.$(`[data-pick="${clave}"]`);
    if (!b || !(await b.isVisible())) return null;
    await b.click();
    if (await llega(pg, () => !!document.querySelector('#pickerPop'), null, 3000) < 0) return null;
    const cand = await pg.evaluate(ex => { const b = [...document.querySelectorAll('#pickerPop [data-pickpid]:not([data-aviso])')].find(x => x.dataset.pickpid !== ex); return b ? b.dataset.pickpid : null; }, excluirPid || '');
    if (!cand) { await pg.evaluate(() => closePicker()); return null; }
    const antes = await chips(clave);
    await pg.click(`#pickerPop [data-pickpid="${cand}"]`);
    await llega(pg, ([c, n]) => document.querySelectorAll(`[data-cas="${c}"] .pchip`).length === n, [clave, antes + 1], 3000);
    const [iso, tid] = clave.split('|');
    return { iso, tid, pid: cand, antes, despues: await chips(clave) };
  };
  const claves = await pg.$$eval('[data-pick]', bs => bs.filter(b => b.offsetParent).map(b => b.dataset.pick));
  // A) una casilla con alguien en «pueden»
  for (const clave of claves) { const r = await elegir(clave); if (r) return Object.assign(r, { via: 'directo' }); }
  // B) todo el mundo está colocado: se libera una plaza y se vuelve a poner
  for (const clave of claves) {
    const x = await pg.$(`[data-cas="${clave}"] .pchip .rmx[data-un]`);
    if (!x) continue;
    const pid = (await x.getAttribute('data-un')).split('|')[2];
    if (excluirPid && pid === excluirPid) continue;
    const n0 = await chips(clave);
    await x.click();
    if (await llega(pg, ([c, n]) => document.querySelectorAll(`[data-cas="${c}"] .pchip`).length === n, [clave, n0 - 1], 3000) < 0) continue;
    const r = await elegir(clave);
    if (r) return Object.assign(r, { via: `liberando antes a ${pid}` });
  }
  return null;
}
