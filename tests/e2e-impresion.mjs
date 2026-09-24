// LAS HOJAS IMPRIMIBLES DE LA SEMANA (14/09). Modo local con `?demo=1` (el mes se
// genera con la semana tipo), semana del 14 al 20 de septiembre de 2026, la del
// prototipo del cliente del 11/09. Se comprueba:
//   (1) #printBtn en Semana pinta las casillas con posicionesDe: El 33 martes tarde
//       con «Hueco disponible» y Noe ◆ en 2.ª, Pasarela lunes tarde con Mari Luz la primera
//       haciendo la tarde entera (Aroa, 17/09), Lola con ▸, marcas P y C (Noe miércoles)
//       y «Quién libra» del viernes = nadie;
//   (2) abrirImpresionSemanaGenerada(generarSemana(…)) monta las dos páginas del
//       prototipo: título, 4 tablas de locales, «Qué ha cambiado», ≥ 30 condiciones
//       con cuatro NUEVA (30, 31, 32 y el partido que abre en Pasarela), y «Descargar PDF» (#pPdf) sigue ahí;
//   (3) con dos casillas vaciadas, la página 2 enseña el cambio (antes tachado /
//       ahora en negrita, «nueva» si la casilla estaba vacía);
//   (4) sin pageerror en toda la batería.
// Y la letra (24/09, Diego: «imprimible de semana con letra más grande»): la hoja semanal
// va a ≥ 13 px con cuatro nombres por casilla y sigue en UNA hoja y UNA página del PDF,
// también con partido, con 5 nombres (≥ 11 px) y con 6 (sin compactar); nada recortado;
// el PDF no parte una hoja semanal que se pasa por muy poco; y la hoja de un bar va a
// ≥ 12,5 px. Tras la revisión del mismo día: filas iguales sin redondear, aire bajo el último
// nombre, crecer no recorta un nombre que cabía, la defensa del PDF no toca el Mes, y la
// hoja de un bar con 6 u 8 nombres en una casilla baja la letra o compacta sin romper la
// rejilla.
// Capturas (fullPage) en $CAPTURAS/print-generada-*.png si se pasa la variable.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { join, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cargarChromium, contador, llega, prepararPagina } from './e2e-util.mjs';

const { chromium, CHROMIUM } = await cargarChromium();
const RAIZ = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'));
const { ok, resumen } = contador();
const t0 = Date.now();
const CAPTURAS = process.env.CAPTURAS || '';
if (CAPTURAS) mkdirSync(CAPTURAS, { recursive: true });

// ── servidor estático (nunca server.js): la app detecta que no hay backend ──
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
const BASE = `http://127.0.0.1:${srv.address().port}`;
setTimeout(() => { console.log('  ✗ tiempo agotado (90 s)'); process.exit(1); }, 88000).unref();

const LUNES = '2026-09-14';
const errores = [];
const br = await chromium.launch({ executablePath: CHROMIUM, args: ['--no-sandbox'] });
try {
  // viewport alto: #printRoot es fijo con scroll propio y la captura debe coger la hoja entera
  const ctx = await br.newContext({ viewport: { width: 1400, height: 1000 } });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('shiftia_pas_sesion', '1'); sessionStorage.setItem('shiftia_pas_rol', 'admin'); } catch (e) {} });
  const pg = await ctx.newPage();
  await prepararPagina(pg, errores, 'impresión');
  await pg.goto(BASE + '/index.html?demo=1');
  await pg.waitForSelector('#view-hoy .loccard', { timeout: 15000 });
  ok('la app arranca en modo local (?demo=1)', await pg.evaluate(() => SRV.on === false && !!S));

  // ── la Semana del 14/09/2026 (si el reloj no está en septiembre de 2026, se siembra igual) ──
  await pg.click('.tab[data-v="semana"]');
  await llega(pg, () => !document.getElementById('view-semana').classList.contains('hidden'), null, 4000);
  const sem = await pg.evaluate(lunes => {
    sembrarDemo(S, lunes);
    S.semLunes = lunes; S.y = +lunes.slice(0, 4); S.m = +lunes.slice(5, 7); cargarMes(); S.day = +lunes.slice(8, 10);
    renderSemana();
    return { titulo: document.querySelector('#wTitle').textContent.replace(/\s+/g, ' ').trim(), plazas: Object.values(estadoDeIso(lunes).asig[lunes] || {}).reduce((a, l) => a + l.length, 0) };
  }, LUNES);
  ok(`la vista Semana está en la del 14 al 20 de septiembre (${sem.titulo}) con plazas el lunes (${sem.plazas})`, /14 – 20 de septiembre/.test(sem.titulo) && sem.plazas > 0, JSON.stringify(sem));

  // ── (1) hoja semanal general desde #printBtn ──
  await pg.click('#printBtn');
  ok('#printBtn monta #printRoot .pxpage', await llega(pg, () => { const r = document.getElementById('printRoot'); return !!r && !r.classList.contains('hidden') && !!r.querySelector('.pxpage table.pxsem'); }, null, 4000) >= 0);
  const cas = (iso, tid) => pg.evaluate(([i, t]) => {
    const td = document.querySelector(`#printRoot .pxpage [data-cas="${i}|${t}"]`); if (!td) return null;
    const slots = [...td.querySelectorAll('.pxg-s')].map(s => ({ n: (s.querySelector('.pxg-n') || {}).textContent, hueco: s.classList.contains('hueco'), nombre: (s.querySelector('.pxg-nm') || {}).textContent || '', abre: !!s.querySelector('.pxg-mk.abre'), coc: !!s.querySelector('.pxg-mk.coc'), com: !!s.querySelector('.pxg-mk.com'), P: !!s.querySelector('.pxg-tag.p'), C: !!s.querySelector('.pxg-tag.c'), sub: [...s.querySelectorAll('.pxg-sub')].map(x => x.textContent) }));
    return { cls: td.className, cuenta: (td.querySelector('.pxg-cnt') || {}).textContent || '', txt: td.textContent, slots };
  }, [iso, tid]);
  const el33mt = await cas('2026-09-15', 'EL33_T');
  ok('El 33 martes tarde: día flojo, se queda Noe solo y sin hueco (José, 17/09)', !!el33mt && !/Hueco disponible/.test(el33mt.txt) && el33mt.slots.length === 1 && /Noe/.test(el33mt.slots[0].nombre), JSON.stringify(el33mt));
  // 18/09, José, siete veces: «al imprimir que no aparezcan nunca horas», «sin mañana y
  // tarde», «solo los nombres, ni los números ni nada», «ni forzado», «ni estimado ni por».
  // Aroa recorta esta hoja y deja un trozo en cada bar: al equipo solo le hace falta saber
  // quién trabaja. Lo de la oficina se mira en la app.
  ok('El 33 martes tarde: en el papel, Noe y nada más — ni número, ni «por Jenny», ni cocina',
    !!el33mt && el33mt.slots[0] && /Noe/.test(el33mt.slots[0].nombre) && !el33mt.slots[0].n
    && !el33mt.slots[0].sub.length && !el33mt.slots[0].coc, JSON.stringify(el33mt && el33mt.slots[0]));
  ok('El 33 martes tarde: tampoco la cuenta «1/1*»', !!el33mt && !/\d\/\d/.test(el33mt.cuenta || ''), JSON.stringify(el33mt && el33mt.cuenta));
  const pasLt = await cas('2026-09-14', 'PASARELA_T');
  ok('Pasarela lunes tarde: Mari Luz, sin la explicación de «la tarde entera, de 16:00 a cierre»',
    !!pasLt && pasLt.slots[0] && /Mari Luz/.test(pasLt.slots[0].nombre) && !pasLt.slots[0].sub.length, JSON.stringify(pasLt && pasLt.slots[0]));
  const pasLm = await cas('2026-09-14', 'PASARELA_M');
  ok('Pasarela lunes mañana: Lola sin el ▸ de «sale la primera»', !!pasLm && pasLm.slots[0] && /Lola/.test(pasLm.slots[0].nombre) && !pasLm.slots[0].abre, JSON.stringify(pasLm && pasLm.slots[0]));
  ok('Pasarela lunes mañana: Mari Luz no está (esa tarde la hace entera) y quedan Lola y Tere', !!pasLm && !pasLm.slots.some(s => /Mari Luz/.test(s.nombre)) && pasLm.slots.some(s => /Tere/.test(s.nombre)), JSON.stringify(pasLm && pasLm.slots));
  const el33xm = await cas('2026-09-16', 'EL33_M');
  ok('El 33 miércoles mañana: Noe y Jenny, sin la C, sin la P y sin «por Victoria»',
    !!el33xm && /Noe/.test(el33xm.slots[0].nombre) && /Jenny/.test(el33xm.slots[1].nombre)
    && !el33xm.slots.some(s => s.C || s.P || s.sub.length), JSON.stringify(el33xm && el33xm.slots));
  const monLm = await cas('2026-09-14', 'MONACO_M');
  ok('Bar Mónaco lunes mañana: Cristian sin el □ de comodín', !!monLm && monLm.slots[2] && /Cristian/.test(monLm.slots[2].nombre) && !monLm.slots[2].com, JSON.stringify(monLm && monLm.slots));
  const limpio = await pg.evaluate(() => {
    const t = document.querySelector('#printRoot table.pxsem');
    return { txt: t ? t.textContent : '', ley: !!document.querySelector('#printRoot .pxg-ley'), horas: (t ? t.textContent : '').match(/\d{1,2}:\d{2}/g) || [] };
  });
  ok('en toda la hoja no queda ni una hora', limpio.horas.length === 0, JSON.stringify(limpio.horas.slice(0, 6)));
  ok('ni «Mañana»/«Tarde» de etiqueta de fila', !/Mañana|Tarde/.test(limpio.txt), (limpio.txt.match(/Mañana|Tarde/g) || []).join(','));
  ok('ni «forzado», ni «Hueco disponible», ni «faltan»', !/forzado|Hueco disponible|faltan/i.test(limpio.txt));
  ok('ni leyenda explicando símbolos que ya no salen', !limpio.ley);
  // 18/09 (Diego): «la fila quien libra y quien de baja en el imprimible de la semana fuera
  // también». El papel del bar es la rejilla de nombres y nada más; quién libra, quién está
  // de vacaciones y quién de baja se mira en la app, que es donde se decide.
  const pie = await pg.evaluate(() => ({
    filas: document.querySelectorAll('#printRoot table.pxsem tr.pxdesc').length,
    txt: document.querySelector('#printRoot .pxpage').textContent.replace(/\s+/g, ' '),
  }));
  ok('la hoja del equipo ya no lleva pie de descansos', pie.filas === 0, String(pie.filas));
  ok('ni «Libran», ni «Ausencias», ni «De baja» en toda la hoja', !/Libran|Ausencias|De baja|Pie de descansos/i.test(pie.txt), (pie.txt.match(/Libran|Ausencias|De baja|Pie de descansos/gi) || []).join(','));
  ok('la hoja sigue llevando los 4 locales y los 7 días: eso sí hace falta en el bar', await pg.evaluate(() => document.querySelectorAll('#printRoot table.pxsem tr.secrow.pxloc').length === 4 && document.querySelectorAll('#printRoot table.pxsem thead th.pxd').length === 7));
  // 18/09 (Diego): «que quede más visual, las celdas con un espacio similar entre todos en
  // la variante semanas». Ahora que en la casilla solo van nombres, la rejilla tiene que
  // leerse de un vistazo: todas las filas de turno miden lo mismo, tenga la casilla dos
  // nombres o cuatro, y el hueco entre nombres es el mismo en todas.
  // 24/09 (revisión): las alturas se comparan sin redondear y con 0,1 px de tolerancia. Con
  // Math.round y 1 px de margen pasaba justo la desigualdad que hay que evitar: la casilla
  // llena 1 px más alta que las demás (70,75 frente a 71,75 px).
  const rejilla = await pg.evaluate(() => {
    const filas = [...document.querySelectorAll('#printRoot table.pxsem tbody tr')].filter(tr => tr.querySelector('td[data-cas]'));
    const alturas = filas.map(tr => tr.getBoundingClientRect().height);
    const huecos = [];
    for (const td of document.querySelectorAll('#printRoot table.pxsem td[data-cas]')) {
      const ns = [...td.querySelectorAll('.pxg-s')];
      for (let i = 1; i < ns.length; i++) huecos.push(Math.round((ns[i].getBoundingClientRect().top - ns[i - 1].getBoundingClientRect().bottom) * 10) / 10);
    }
    return { alturas, min: Math.min(...alturas), max: Math.max(...alturas), huecos: [...new Set(huecos)].sort((a, b) => a - b) };
  });
  ok(`todas las filas de turno miden lo mismo, sin redondear (${rejilla.min}–${rejilla.max}px)`, rejilla.max - rejilla.min <= 0.1, JSON.stringify(rejilla.alturas));
  ok(`el hueco entre nombres es el mismo en toda la hoja (${rejilla.huecos.join(', ')}px)`, rejilla.huecos.length <= 1, JSON.stringify(rejilla.huecos));
  // 24/09 (revisión): el último nombre no se apoya en el borde de abajo de la casilla. Con
  // Inter la caja del texto llena la del nombre, así que los descendentes («y», «g», «p»)
  // llegan al fondo de esa caja: sin relleno debajo, se montaban sobre el borde. Se mide lo
  // más bajo entre la caja del nombre y la de su texto, contra el borde (vale para
  // cualquier fuente).
  const aire = await pg.evaluate(() => {
    let peor = 99, quien = '';
    for (const td of document.querySelectorAll('#printRoot table.pxsem td[data-cas]')) {
      const ss = td.querySelectorAll('.pxg-s'); if (!ss.length) continue;
      const s = ss[ss.length - 1], nm = s.querySelector('.pxg-nm'); if (!nm) continue;
      const r = document.createRange(); r.selectNodeContents(nm);
      const fondo = Math.max(s.getBoundingClientRect().bottom, r.getBoundingClientRect().bottom);
      const borde = td.getBoundingClientRect().bottom - parseFloat(getComputedStyle(td).borderBottomWidth);
      if (borde - fondo < peor) { peor = Math.round((borde - fondo) * 100) / 100; quien = nm.textContent.trim(); }
    }
    return { peor, quien };
  });
  ok(`el último nombre de cada casilla deja aire sobre el borde de abajo (el más justo, ${aire.quien}, ${aire.peor}px)`, aire.peor >= 0.75, JSON.stringify(aire));

  // 18/09 (Diego, segunda pasada): «de la tabla de semana en imprimir sigue quedando muy
  // apretado algunas casillas como el viernes». La tabla repartía el ancho por contenido,
  // así que los días con nombres largos se quedaban estrechos y el viernes salía apretado
  // contra el borde. Los siete días tienen que medir lo mismo y el nombre más largo del día
  // no puede tocar el borde de su casilla.
  const anchos = await pg.evaluate(() => {
    const dias = [...document.querySelectorAll('#printRoot table.pxsem thead th.pxd')].map(th => Math.round(th.getBoundingClientRect().width));
    let holgura = 999, quien = '';
    for (const td of document.querySelectorAll('#printRoot table.pxsem td[data-cas]')) {
      const caja = td.getBoundingClientRect();
      const pd = parseFloat(getComputedStyle(td).paddingRight);
      for (const nm of td.querySelectorAll('.pxg-nm')) {
        const h = Math.round((caja.right - pd - nm.getBoundingClientRect().right) * 10) / 10;
        if (h < holgura) { holgura = h; quien = nm.textContent.trim(); }
      }
    }
    const rot = document.querySelector('#printRoot table.pxsem thead th.act');
    return { dias, rotulo: Math.round(rot.getBoundingClientRect().width), min: Math.min(...dias), max: Math.max(...dias), holgura, quien };
  });
  ok(`los siete días miden lo mismo (${anchos.min}px)`, anchos.max - anchos.min <= 1, JSON.stringify(anchos.dias));
  // sin el pie de descansos, la columna de la izquierda se queda sin una sola letra: es el
  // rail de color del bar y nada más, así que no puede llevarse el ancho de un día entero
  ok(`la columna del rótulo, ya vacía, no se lleva el ancho de un día (${anchos.rotulo}px frente a ${anchos.min}px)`, anchos.rotulo <= anchos.min / 2, JSON.stringify(anchos));
  ok(`ningún nombre roza el borde de su casilla (el más justo, ${anchos.quien}, deja ${anchos.holgura}px)`, anchos.holgura >= 3, JSON.stringify(anchos));
  // y la columna de la izquierda tiene que seguir cabiendo: «sin turno ese día» o
  // «vacaciones · permisos · libres» no pueden salirse del rótulo y montarse sobre el lunes
  const rotulos = await pg.evaluate(() => {
    const r = document.createRange();
    let peor = 0, texto = '';
    for (const td of document.querySelectorAll('#printRoot table.pxsem td.lblp')) {
      const dentro = td.clientWidth - parseFloat(getComputedStyle(td).paddingLeft) - parseFloat(getComputedStyle(td).paddingRight);
      for (const n of td.childNodes.length ? [td, ...td.querySelectorAll('*')] : []) {
        if (!n.textContent.trim()) continue;
        r.selectNodeContents(n);
        const sobra = Math.round((r.getBoundingClientRect().width - dentro) * 10) / 10;
        if (sobra > peor) { peor = sobra; texto = n.textContent.trim(); }
      }
    }
    return { peor, texto };
  });
  ok(`los rótulos de la izquierda caben en su columna${rotulos.texto ? ` (el peor, «${rotulos.texto}», se sale ${rotulos.peor}px)` : ''}`, rotulos.peor <= 0.5, JSON.stringify(rotulos));
  // con el ancho ya fijo, un nombre larguísimo no puede pisar el día de al lado: se corta
  // en su casilla. (Antes la tabla ensanchaba la columna y se llevaba por delante al resto.)
  const largo = await pg.evaluate(() => {
    const p = S.staff.find(x => x.nombre === 'Adrián');
    const antes = p.nombre;
    p.nombre = 'Adrián Fernández de la Torre y Quesada';
    cerrarImpresion(); abrirImpresion();
    // lo que de verdad se ve: el rectángulo del nombre recortado por los ancestros que
    // recortan (getBoundingClientRect por sí solo ignora el overflow:hidden de arriba)
    const pintado = el => {
      let der = el.getBoundingClientRect().right;
      for (let a = el.parentElement; a; a = a.parentElement) {
        if (getComputedStyle(a).overflow !== 'visible') der = Math.min(der, a.getBoundingClientRect().right);
      }
      return der;
    };
    let peor = 0;
    for (const td of document.querySelectorAll('#printRoot table.pxsem td[data-cas]')) {
      const caja = td.getBoundingClientRect();
      for (const nm of td.querySelectorAll('.pxg-nm')) peor = Math.max(peor, Math.round((pintado(nm) - caja.right) * 10) / 10);
    }
    const salio = [...document.querySelectorAll('#printRoot table.pxsem td[data-cas]')].some(td => /Adrián/.test(td.textContent));
    p.nombre = antes; cerrarImpresion(); abrirImpresion();
    return { peor, salio };
  });
  ok(`un nombre larguísimo se queda dentro de su casilla (se sale ${largo.peor}px) y sigue leyéndose`, largo.peor <= 0 && largo.salio, JSON.stringify(largo));
  // 24/09 (revisión): crecer no puede recortar un nombre que a la talla de base cabía. Un
  // nombre largo pero real («Mª Ángeles Rodríguez») salía entero a 10,9 px y, con la letra
  // grande, recortado con «…»: en el bar hay que leer quién trabaja. La escalera se para en
  // la talla en la que sigue cabiendo; el nombre kilométrico, que ya no cabía, no la frena.
  const largoReal = await pg.evaluate(() => {
    const p = S.staff.find(x => x.nombre === 'Adrián'), antes = p.nombre;
    const cortados = () => [...document.querySelectorAll('#printRoot table.pxsem td[data-cas] .pxg-b')].filter(b => b.scrollWidth > b.clientWidth).map(b => b.textContent.trim());
    const talla = () => parseFloat(getComputedStyle(document.querySelector('#printRoot table.pxsem')).fontSize);
    const r = {};
    try {
      for (const [clave, nombre] of [['real', 'Mª Ángeles Rodríguez'], ['kilometrico', 'Adrián Fernández de la Torre y Quesada']]) {
        p.nombre = nombre; cerrarImpresion(); abrirImpresion();
        r[clave] = { fs: talla(), cortados: cortados(), salio: [...document.querySelectorAll('#printRoot table.pxsem .pxg-nm')].some(n => n.textContent === nombre) };
      }
    } finally { p.nombre = antes; cerrarImpresion(); abrirImpresion(); }
    r.normal = talla();
    return r;
  });
  ok(`un nombre largo que a la talla de base cabía no se recorta al crecer (${largoReal.real.fs}px; recortados: ${largoReal.real.cortados.join(', ') || 'ninguno'})`, largoReal.real.salio && largoReal.real.cortados.length === 0 && largoReal.real.fs >= 9, JSON.stringify(largoReal));
  ok(`y el kilométrico, que no cabía ni a la de base, se recorta él solo sin frenar la letra (${largoReal.kilometrico.fs}px, como sin él: ${largoReal.normal}px)`, largoReal.kilometrico.salio && largoReal.kilometrico.cortados.length > 0 && largoReal.kilometrico.cortados.every(t => /Quesada/.test(t)) && largoReal.kilometrico.fs === largoReal.normal, JSON.stringify(largoReal));

  // sin el pie de descansos sobraba un tercio de hoja. La rejilla del bar crece hasta la
  // última talla que cabe: se lee de pie desde la barra y los nombres dejan de ir apretados.
  // 24/09: el límite es el del camino más estricto al papel, «Descargar PDF», que encaja la
  // hoja con su relleno en los 279 mm útiles del A4 apaisado (en una página caben 780,5 px
  // de hoja, no los 793,7 del A4), con 3 px de margen; y la escalera va de cuarto en cuarto.
  // Es el mismo límite y el mismo paso que crecerHoja (14-impresiones.js).
  const crece = await pg.evaluate(() => {
    const pag = document.querySelector('#printRoot .pxpage');
    const t = pag.querySelector('table.pxsem');
    const LIM = Math.min(210 * 96 / 25.4, 194 * 297 / 279 * 96 / 25.4) - 3;
    const f = parseFloat(getComputedStyle(t).fontSize);
    const cabe = pag.scrollHeight <= LIM;
    t.style.fontSize = (f + 0.25) + 'px';
    const cabeUnaMas = pag.scrollHeight <= LIM;
    t.style.fontSize = f + 'px';
    return { f, cabe, cabeUnaMas, alto: pag.scrollHeight, LIM: Math.round(LIM * 10) / 10 };
  });
  ok(`la rejilla crece hasta la última talla que cabe en una página del PDF (${crece.f}px; ${crece.f >= 16 ? 'el tope de la escalera' : 'un cuarto más ya no entra'})`, crece.f >= 13 && crece.cabe && (!crece.cabeUnaMas || crece.f >= 16), JSON.stringify(crece));
  const altoSem = await pg.evaluate(() => { const p = document.querySelector('#printRoot .pxpage'); return { alto: p.scrollHeight, hoja: Math.round(210 * 96 / 25.4), cls: p.className }; });
  ok(`la hoja semanal cabe en un A4 apaisado (${altoSem.alto}px ≤ ${altoSem.hoja}px · ${altoSem.cls})`, altoSem.alto <= altoSem.hoja + 2, JSON.stringify(altoSem));

  // ── 24/09 (Diego): «imprimible de semana con letra más grande» ──
  // Con cuatro nombres en la casilla más llena la letra se quedaba en 10,5 px (nombres a
  // 10,9): la reserva vertical de cada nombre (1,5 veces la letra), la cabecera y el pie se
  // comían el papel. Sigue siendo UNA hoja con los cuatro bares y la rejilla regular.
  const talla = await pg.evaluate(() => {
    const t = document.querySelector('#printRoot table.pxsem');
    const nms = [...t.querySelectorAll('.pxg-nm')].map(n => parseFloat(getComputedStyle(n).fontSize));
    return { tabla: parseFloat(getComputedStyle(t).fontSize), nombre: Math.round(Math.min(...nms) * 100) / 100, pxn: +t.style.getPropertyValue('--pxn'), cls: t.closest('.pxpage').className };
  });
  ok(`la letra de la hoja semanal es ≥ 13 px con ${talla.pxn} nombres en la casilla más llena (tabla ${talla.tabla}px, nombres ${talla.nombre}px)`, talla.pxn === 4 && talla.tabla >= 13 && talla.nombre >= 13.5 && !/compacto/.test(talla.cls), JSON.stringify(talla));
  // guardas: con la letra grande nada se recorta, el día no se queda por debajo de los
  // nombres y ningún nombre se sale por abajo de su casilla
  const guardas = await pg.evaluate(() => {
    const t = document.querySelector('#printRoot table.pxsem');
    const cortados = [...t.querySelectorAll('td[data-cas] .pxg-b')].filter(b => b.scrollWidth > b.clientWidth + 0.5).map(b => b.textContent.trim());
    const dia = Math.min(...[...t.querySelectorAll('thead th.pxd > span')].map(s => parseFloat(getComputedStyle(s).fontSize)));
    const nombre = Math.max(...[...t.querySelectorAll('.pxg-nm')].map(n => parseFloat(getComputedStyle(n).fontSize)));
    const bajo = [];
    for (const td of t.querySelectorAll('td[data-cas]')) { const c = td.getBoundingClientRect(); for (const s of td.querySelectorAll('.pxg-s')) if (s.getBoundingClientRect().bottom > c.bottom + 0.5) bajo.push(s.textContent.trim()); }
    return { cortados, dia: Math.round(dia * 100) / 100, nombre: Math.round(nombre * 100) / 100, bajo };
  });
  ok('a la talla elegida no se corta ningún nombre de la plantilla', guardas.cortados.length === 0, JSON.stringify(guardas.cortados));
  ok(`el número del día no queda más pequeño que los nombres (${guardas.dia}px frente a ${guardas.nombre}px)`, guardas.dia >= guardas.nombre, JSON.stringify(guardas));
  ok('ningún nombre se sale por debajo de su casilla', guardas.bajo.length === 0, JSON.stringify(guardas.bajo));
  // la semana con partido lleva una línea más en la cabecera del día. «Descargar PDF» ya la
  // partía en dos páginas: el crecer medía contra el A4 y no contra la página del PDF.
  const pdfPartido = await pg.evaluate(async () => {
    S.eventos.push({ id: 'ev_prueba', iso: '2026-09-19', tipo: 'partido', equipo: 'barcelona', nombre: 'Juega el Barcelona', franja: 'T', refuerzo: {} });
    try {
      cerrarImpresion(); abrirImpresion();
      const pag = document.querySelector('#printRoot .pxpage'), t = pag.querySelector('table.pxsem');
      const url = await exportarPdfHoja({ soloCanvas: true });
      const img = new Image(); await new Promise(r => { img.onload = r; img.src = url; });
      return { fs: parseFloat(getComputedStyle(t).fontSize), alto: pag.scrollHeight, cls: pag.className, lienzo: `${img.width}×${img.height}`, paginas: Math.ceil(img.height / Math.floor(194 / (279 / img.width))), ev: /Juega el Barcelona/.test(t.querySelector('thead').textContent) };
    } finally { S.eventos = S.eventos.filter(e => e.id !== 'ev_prueba'); cerrarImpresion(); abrirImpresion(); }
  });
  ok(`con un partido en la semana, «Descargar PDF» sale en UNA página (${pdfPartido.paginas}; alto ${pdfPartido.alto}px, lienzo ${pdfPartido.lienzo})`, pdfPartido.ev && pdfPartido.paginas === 1, JSON.stringify(pdfPartido));
  ok(`y con el partido la letra sigue ≥ 13 px (${pdfPartido.fs}px)`, pdfPartido.fs >= 13 && !/compacto/.test(pdfPartido.cls), JSON.stringify(pdfPartido));
  // semana cargada: se mete gente libre ese día en la mañana de Zapatillera del martes hasta
  // tener n nombres en la casilla (con forzar, sin tocar reglas) y se vuelve a abrir la hoja
  const conNombres = n => pg.evaluate(n => {
    const iso = '2026-09-15', tid = 'ZAPA_M', e = estadoDeIso(iso, true);
    window.__puestos = window.__puestos || [];
    const ocupados = new Set(turnosDe(S).flatMap(t => pidsEn(e, iso, t.id)));
    for (const p of S.staff) {
      if (asignados(e, iso, tid).length >= n) break;
      if (ocupados.has(p.id) || ausenciaEn(p, iso) || p.standby) continue;
      if (asignar(e, S, S.staff, iso, tid, p.id, { forzar: true }).ok) window.__puestos.push(p.id);
    }
    cerrarImpresion(); abrirImpresion();
    const pag = document.querySelector('#printRoot .pxpage'), t = pag.querySelector('table.pxsem');
    const cortados = [...t.querySelectorAll('td[data-cas] .pxg-b')].filter(b => b.scrollWidth > b.clientWidth + 0.5).length;
    const filas = [...t.querySelectorAll('tbody tr')].filter(tr => tr.querySelector('td[data-cas]')).map(tr => tr.getBoundingClientRect().height);
    return { casilla: asignados(e, iso, tid).length, pxn: +t.style.getPropertyValue('--pxn'), fs: parseFloat(getComputedStyle(t).fontSize), cls: pag.className, alto: pag.scrollHeight, cortados, filas: [Math.min(...filas), Math.max(...filas)] };
  }, n);
  const con5 = await conNombres(5);
  ok(`semana cargada: con 5 nombres en una casilla la letra sigue ≥ 11 px (${con5.fs}px) y cabe en una hoja (${con5.alto}px ≤ 780)`, con5.casilla === 5 && con5.pxn === 5 && con5.fs >= 11 && !/compacto/.test(con5.cls) && con5.alto <= 780 && con5.cortados === 0 && con5.filas[1] - con5.filas[0] <= 0.1, JSON.stringify(con5));
  const con6 = await conNombres(6);
  ok(`con 6 nombres en una casilla ya no compacta: ≥ 9 px (${con6.fs}px · ${con6.cls})`, con6.casilla === 6 && con6.pxn === 6 && con6.fs >= 9 && !/compacto/.test(con6.cls) && con6.alto <= 780 && con6.cortados === 0 && con6.filas[1] - con6.filas[0] <= 0.1, JSON.stringify(con6));
  await pg.evaluate(() => { const e = estadoDeIso('2026-09-15', true); for (const pid of window.__puestos || []) desasignar(e, '2026-09-15', 'ZAPA_M', pid); window.__puestos = []; cerrarImpresion(); abrirImpresion(); });
  // defensa del PDF: una hoja sin paginado propio que se pasa de la página por menos de un
  // 3 % sale en UNA página, encogida, en vez de dejar una tira de papel en la segunda. Si se
  // pasa de verdad, se sigue partiendo como siempre.
  const pdfJusto = await pg.evaluate(async () => {
    await exportarPdfHoja({ soloCanvas: true });   // carga html2canvas y jsPDF
    // espía: jsPDF pone sus métodos en cada documento, así que se envuelve el constructor
    const lib = window.jspdf, Orig = lib.jsPDF;
    let paginas = 0, imgs = [];
    lib.jsPDF = function (...a) {
      const d = new Orig(...a), addImage = d.addImage.bind(d), output = d.output.bind(d);
      d.addImage = (...x) => { imgs.push(x.slice(2, 6).map(v => Math.round(v * 100) / 100)); return addImage(...x); };
      d.output = (...x) => { paginas = d.getNumberOfPages(); return output(...x); };
      return d;
    };
    const pag = document.querySelector('#printRoot .pxpage');
    const r = {};
    try {
      for (const alto of [788, 900]) {   // 788: entre la página del PDF (780,5 px) y el A4 (793,7 px)
        paginas = 0; imgs = [];
        pag.style.minHeight = alto + 'px';
        const nombre = await exportarPdfHoja({ sinCompartir: true });
        r[alto] = { nombre, paginas, imgs };
      }
    } finally { lib.jsPDF = Orig; pag.style.minHeight = ''; }
    return r;
  });
  const j = pdfJusto[788] || {};
  ok(`una hoja que se pasa de la página del PDF por menos de un 3 % sale en UNA página, entera (${j.paginas} · ${JSON.stringify(j.imgs)})`, !!j.nombre && j.paginas === 1 && j.imgs.length === 1 && j.imgs[0][1] + j.imgs[0][3] <= 202.01 && j.imgs[0][0] >= 9 - 0.01 && j.imgs[0][0] + j.imgs[0][2] <= 288.01, JSON.stringify(pdfJusto));
  ok(`si se pasa de verdad, se sigue partiendo en dos (${(pdfJusto[900] || {}).paginas})`, (pdfJusto[900] || {}).paginas === 2, JSON.stringify(pdfJusto[900]));
  // 24/09 (revisión): esa defensa es de la hoja semanal y de nadie más. El tablón del Mes
  // (y Horas, y el generador) no se tocan en este cambio: en el mismo caso, 788 px, sale
  // como ha salido siempre.
  const pdfMes = await pg.evaluate(async () => {
    const lib = window.jspdf, Orig = lib.jsPDF;
    let paginas = 0;
    lib.jsPDF = function (...a) { const d = new Orig(...a), output = d.output.bind(d); d.output = (...x) => { paginas = d.getNumberOfPages(); return output(...x); }; return d; };
    try {
      cerrarImpresion(); abrirImpresionMes();
      const pag = document.querySelector('#printRoot .pxpage');
      pag.style.minHeight = '788px';
      const nombre = await exportarPdfHoja({ sinCompartir: true });
      return { nombre, paginas, cls: pag.className, mes: !!pag.querySelector('table.pxm') };
    } finally { lib.jsPDF = Orig; cerrarImpresion(); abrirImpresion(); }
  });
  ok(`la defensa es solo de la hoja semanal: el Mes, en el mismo caso, se parte como siempre (${pdfMes.paginas} páginas)`, pdfMes.mes && !!pdfMes.nombre && pdfMes.paginas === 2, JSON.stringify(pdfMes));
  if (CAPTURAS) { await pg.setViewportSize({ width: 1400, height: Math.max(1000, altoSem.alto + 80) }); await pg.screenshot({ path: join(CAPTURAS, 'print-generada-semana.png'), fullPage: true }); await pg.setViewportSize({ width: 1400, height: 1000 }); }
  await pg.click('#pClose');
  ok('«Cerrar» oculta la vista previa', await pg.$eval('#printRoot', r => r.classList.contains('hidden')));

  // ── (2) la planilla generada: las dos páginas del prototipo ──
  const gen = await pg.evaluate(lunes => {
    const res = generarSemana(S, S.staff, estadoDeIso(lunes), lunes, { simular: true });
    abrirImpresionSemanaGenerada(res, {});
    return { huecos: res.huecos.length, primeros: res.huecos.filter(h => h.tipo === 'primero').length, cambios: res.cambios.length, condiciones: res.condiciones.length, nuevas: res.condiciones.filter(c => c.nueva).length, resumen: res.resumen };
  }, LUNES);
  ok(`generarSemana simula la semana (${gen.condiciones} condiciones, ${gen.nuevas} nuevas, ${gen.huecos} huecos, ${gen.cambios} cambios)`, gen.condiciones >= 30 && gen.nuevas === 6);
  ok('abrirImpresionSemanaGenerada monta una hoja apaisada con dos páginas .pxg-pag', await llega(pg, () => { const r = document.getElementById('printRoot'); return !!r && !r.classList.contains('hidden') && r.querySelectorAll('.pxpage.apaisado .pxg-pag').length === 2; }, null, 4000) >= 0);
  const p1 = await pg.evaluate(() => {
    const pag = document.querySelectorAll('#printRoot .pxg-pag')[0];
    return { h1: pag.querySelector('.pxg-h1').textContent.replace(/\s+/g, ' ').trim(), kick: pag.querySelector('.pxg-kick').textContent, tablas: pag.querySelectorAll('table.pxg-tab.pxg-local').length, libran: !!pag.querySelector('table.pxg-lib'), libV: (pag.querySelector('[data-libran="2026-09-18"]') || {}).textContent, ley: (pag.querySelector('.pxg-ley') || {}).textContent, huecos: pag.querySelectorAll('td.pxg-c.hueco').length, sub: pag.querySelector('.pxg-sub').textContent };
  });
  ok(`página 1: título «${p1.h1}»`, /^Planilla propuesta · semana del 14 al 20 de septiembre de 2026$/.test(p1.h1), p1.h1);
  ok('página 1: la línea de cabecera nombra Shiftia y los cuatro locales', /SHIFTIA/.test(p1.kick) && /El 33/.test(p1.kick) && /Pasarela/.test(p1.kick), p1.kick);
  ok('página 1: 4 tablas de locales, «Quién libra cada día» y la leyenda', p1.tablas === 4 && p1.libran && /nadie/.test(p1.libV || '') && /Hueco disponible|hueco disponible/.test(p1.ley || ''), JSON.stringify(p1));
  ok(`página 1: casillas con hueco en rojo (${p1.huecos}) = huecos de 1.ª posición del modelo (${gen.primeros})`, p1.huecos === gen.primeros, JSON.stringify({ p1: p1.huecos, gen: gen.primeros }));
  const g33 = await cas('2026-09-15', 'EL33_T');
  ok('página 1: El 33 martes tarde sin hueco, con Noe solo y sin marca de cocina (José, 17/09)', !!g33 && g33.slots.length === 1 && !g33.slots[0].hueco && /Noe/.test(g33.slots[0].nombre) && !g33.slots[0].coc, JSON.stringify(g33));
  const p2 = await pg.evaluate(() => {
    const pag = document.querySelectorAll('#printRoot .pxg-pag')[1];
    return { h1: pag.querySelector('.pxg-h1').textContent.replace(/\s+/g, ' ').trim(), h2: [...pag.querySelectorAll('.pxg-h2')].map(x => x.textContent.trim()), conds: pag.querySelectorAll('.pxg-cond').length, nuevas: pag.querySelectorAll('.pxg-cond em.nueva').length, nuevasCol: pag.querySelectorAll('.pxg-nueva').length, huecos: pag.querySelectorAll('.pxg-hueco').length, queda: [...pag.querySelectorAll('.pxg-hueco')].map(x => x.textContent).filter(t => /Queda:/.test(t)).length, destrapa: [...pag.querySelectorAll('.pxg-des')].map(x => x.textContent.slice(0, 120)), preguntas: pag.querySelectorAll('.pxg-preg').length, pregTxt: [...pag.querySelectorAll('.pxg-preg')].map(x => x.textContent.slice(0, 60)), fin: (pag.querySelector('.pxg-fin') || {}).textContent, sinSol: /Un turno sin solución no se rellena/.test(pag.textContent), ok: pag.querySelectorAll('.pxg-cond b.ok').length, ko: pag.querySelectorAll('.pxg-cond.ko small').length };
  });
  ok(`página 2: título «${p2.h1}»`, /^Qué ha cambiado · y /.test(p2.h1), p2.h1);
  ok(`página 2: la lista numerada tiene ≥ 30 condiciones (${p2.conds}) con ✓/✗`, p2.conds >= 30 && p2.conds === gen.condiciones && p2.ok + p2.ko === p2.conds, JSON.stringify({ conds: p2.conds, ok: p2.ok, ko: p2.ko }));
  ok(`página 2: las NUEVA de la lista y de la columna coinciden`, p2.nuevas === 6 && p2.nuevasCol === 6, JSON.stringify({ lista: p2.nuevas, col: p2.nuevasCol }));
  ok(`página 2: ${p2.huecos} cajas de hueco, todas con «Queda:» y «Se destraparía / No se destrapa»`, p2.huecos === gen.huecos && p2.queda === p2.huecos && p2.destrapa.length === p2.huecos && p2.destrapa.every(t => /destrapa/.test(t)), JSON.stringify(p2.destrapa));
  ok('página 2: el hueco de El 33 del martes ya no existe (José lo quitó el 17/09)', !p2.destrapa.some(t => /Noe/.test(t)), JSON.stringify(p2.destrapa));
  ok(`página 2: preguntas para el cliente (${p2.preguntas}: quién sale el primero, supuestos, mínimos con *, cierre y tramos del partido)`, p2.preguntas >= 3 && p2.pregTxt.some(t => /Quién sale el primero/.test(t)) && p2.pregTxt.some(t => /Horarios reales|hora de cierre/.test(t)) && p2.pregTxt.some(t => /mínimos marcados/.test(t)), JSON.stringify(p2.pregTxt));
  ok('página 2: «Un turno sin solución no se rellena» y el pie de conclusión con turnos, condiciones y descansos', p2.sinSol && /La semana sale/.test(p2.fin || '') && new RegExp(`${gen.resumen.turnos} turnos`).test(p2.fin) && /descansos/.test(p2.fin) && /condiciones/.test(p2.fin), p2.fin);
  ok('«Descargar PDF» (#pPdf) e «Imprimir» (#pGo) siguen en la barra', await pg.evaluate(() => !!document.querySelector('#printRoot #pPdf') && !!document.querySelector('#printRoot #pGo')));
  const altos = await pg.evaluate(() => { const hoja = Math.round(210 * 96 / 25.4); const pags = [...document.querySelectorAll('#printRoot .pxg-pag')].map(p => { const u = p.lastElementChild; return Math.round(u.getBoundingClientRect().bottom - p.getBoundingClientRect().top + 16 * 96 / 25.4); }); return { pags, hoja, cls: document.querySelector('#printRoot .pxpage').className, total: document.querySelector('#printRoot .pxpage').scrollHeight }; });
  ok(`cada página cabe en un A4 apaisado (${altos.pags.join(' / ')} px ≤ ${altos.hoja} · ${altos.cls})`, altos.pags.every(a => a <= altos.hoja + 2), JSON.stringify(altos));
  if (CAPTURAS) {
    await pg.setViewportSize({ width: 1400, height: altos.total + 100 });
    await pg.screenshot({ path: join(CAPTURAS, 'print-generada-completa.png'), fullPage: true });
    const pags = await pg.$$('#printRoot .pxg-pag');
    await pags[0].screenshot({ path: join(CAPTURAS, 'print-generada-p1.png') });
    await pags[1].screenshot({ path: join(CAPTURAS, 'print-generada-p2.png') });
    await pg.setViewportSize({ width: 1400, height: 1000 });
  }
  await pg.click('#pClose');

  // ── (3) con casillas vaciadas: la página 2 enseña qué ha cambiado ──
  const cam = await pg.evaluate(lunes => {
    const e = clonarEstado(estadoDeIso(lunes));
    desasignar(e, lunes, 'MONACO_T', 'yilian'); desasignar(e, lunes, 'MONACO_T', 'hojan');   // casilla vacía → «nueva»
    desasignar(e, '2026-09-17', 'ZAPA_T', 'roberto');                                            // queda Adrián; vuelve Roberto
    const res = generarSemana(S, S.staff, e, lunes, { simular: true });
    abrirImpresionSemanaGenerada(res, { titulo: 'Planilla corregida' });
    const pag = document.querySelectorAll('#printRoot .pxg-pag')[1];
    return { cambios: res.cambios.map(c => c.turnoId + ':' + c.antes.length + '>' + c.despues.length), h1: document.querySelector('#printRoot .pxg-h1').textContent.replace(/\s+/g, ' ').trim(), sub: document.querySelector('#printRoot .pxg-sub').textContent, cajas: [...pag.querySelectorAll('.pxg-cambio')].map(x => x.textContent.replace(/\s+/g, ' ').trim().slice(0, 200)), tachado: pag.querySelectorAll('.pxg-antes s').length, negrita: pag.querySelectorAll('.pxg-ahora b').length, nueva: pag.querySelectorAll('.pxg-nueva-cas').length, corr: document.querySelectorAll('#printRoot .pxg-pag td.pxg-c.corr').length };
  }, LUNES);
  ok(`con dos casillas vaciadas generarSemana devuelve los dos cambios (${cam.cambios.join(', ')})`, cam.cambios.length === 2, JSON.stringify(cam.cambios));
  ok(`el título usa opts.titulo («${cam.h1.slice(0, 20)}…») y el resumen dice «Corregido el lunes en Bar Mónaco»`, /^Planilla corregida/.test(cam.h1) && /Corregido el lunes 14 en Bar Mónaco/.test(cam.sub), cam.sub);
  ok('página 2: cada cambio con «antes» tachado y «ahora» en negrita, y «nueva» en la casilla que estaba vacía', cam.tachado >= 2 && cam.negrita >= 2 && cam.nueva === 1, JSON.stringify(cam));
  ok('página 2: el cambio de Bar Mónaco del lunes nombra a Yilian y Hojan', cam.cajas.some(t => /Bar Mónaco · lunes 14/.test(t) && /Yilian/.test(t) && /Hojan/.test(t)), JSON.stringify(cam.cajas));
  ok('página 1: las casillas corregidas van en ámbar con la marca «corregido»', cam.corr === 2 && await pg.evaluate(() => [...document.querySelectorAll('#printRoot td.pxg-c.corr .pxg-cnt')].every(x => /corregido/.test(x.textContent))), cam.corr);
  if (CAPTURAS) { const pags = await pg.$$('#printRoot .pxg-pag'); await pags[1].screenshot({ path: join(CAPTURAS, 'print-generada-p2-cambios.png') }); }
  await pg.click('#pClose');

  // ── (4) la hoja de un local sigue funcionando con la casilla nueva ──
  await pg.evaluate(() => abrirImpresionLocal('PASARELA'));
  ok('abrirImpresionLocal(PASARELA) monta la hoja vertical con las casillas nuevas', await llega(pg, () => !!document.querySelector('#printRoot .pxpage:not(.apaisado) table.pxlocal') && document.querySelectorAll('#printRoot table.pxlocal .pxg-s').length > 10, null, 4000) >= 0);
  // se miden las CASILLAS, no las filas: el día del partido la fila crece porque la columna
  // del día lleva «Juega el Barcelona», y eso sí interesa en el bar
  // (24/09, revisión: sin redondear y con 0,1 px de tolerancia, como la semanal)
  const rejillaLocal = await pg.evaluate(() => {
    const alturas = [...document.querySelectorAll('#printRoot table.pxlocal td[data-cas]')].map(td => td.getBoundingClientRect().height);
    return { alturas, min: Math.min(...alturas), max: Math.max(...alturas) };
  });
  ok(`la hoja del local también lleva todas las casillas iguales, sin redondear (${rejillaLocal.min}–${rejillaLocal.max}px)`, rejillaLocal.max - rejillaLocal.min <= 0.1, JSON.stringify(rejillaLocal.alturas));
  // 24/09 (Diego): «letra más grande». La hoja de un bar es la de letra grande, pero los
  // nombres salían a 8,8 px: table.pxw{8.5px} ganaba a .pxlocal{12.5px} por especificidad.
  // Ahora va a 12,5 px como poco y crece, como la semanal, hasta la última talla que cabe
  // en su A4 vertical (con 3 px de margen, en cuartos de píxel).
  const letraLocal = await pg.evaluate(async () => {
    const pag = document.querySelector('#printRoot .pxpage'), t = pag.querySelector('table.pxlocal');
    const LIM = 297 * 96 / 25.4 - 3;
    const f = parseFloat(getComputedStyle(t).fontSize);
    const cabe = pag.scrollHeight <= LIM;
    t.style.fontSize = (f + 0.25) + 'px'; const cabeUnaMas = pag.scrollHeight <= LIM; t.style.fontSize = f + 'px';
    const nms = [...t.querySelectorAll('.pxg-nm')].map(n => parseFloat(getComputedStyle(n).fontSize));
    const dias = [...t.querySelectorAll('td.lbld > b')].map(b => parseFloat(getComputedStyle(b).fontSize));
    const url = await exportarPdfHoja({ soloCanvas: true });
    const img = new Image(); await new Promise(r => { img.onload = r; img.src = url; });
    return { tabla: f, nombre: Math.round(Math.min(...nms) * 100) / 100, nombreMax: Math.round(Math.max(...nms) * 100) / 100, dia: Math.round(Math.min(...dias) * 100) / 100, cabe, cabeUnaMas, alto: pag.scrollHeight, A4: Math.round(297 * 96 / 25.4 * 10) / 10, cls: pag.className, paginasPdf: Math.ceil(img.height / Math.floor(279 / (190 / img.width))) };
  });
  ok(`la hoja de un bar lleva los nombres a ≥ 12,5 px (${letraLocal.nombre}px)`, letraLocal.nombre >= 12.5, JSON.stringify(letraLocal));
  ok(`la hoja de un bar crece hasta la última talla que cabe (${letraLocal.tabla}px; ${letraLocal.tabla >= 18 ? 'el tope de su escalera' : 'un cuarto más ya no entra'})`, letraLocal.cabe && (!letraLocal.cabeUnaMas || letraLocal.tabla >= 18), JSON.stringify(letraLocal));
  ok(`y sigue en una sola página vertical (${letraLocal.alto}px ≤ ${letraLocal.A4}px; «Descargar PDF»: ${letraLocal.paginasPdf} página)`, letraLocal.alto <= letraLocal.A4 && letraLocal.paginasPdf === 1 && !/compacto/.test(letraLocal.cls), JSON.stringify(letraLocal));
  ok(`en la hoja de un bar el día no queda más pequeño que los nombres (${letraLocal.dia}px frente a ${letraLocal.nombreMax}px)`, letraLocal.dia >= letraLocal.nombreMax, JSON.stringify(letraLocal));
  // la hoja de un bar sí conserva su pie de descansos: Diego pidió quitarlo «del imprimible
  // de la semana», y esta es la que se cuelga en el local con su propia plantilla
  ok('la hoja del local conserva su pie de descansos', await pg.evaluate(() => !!document.querySelector('#printRoot table.pxdesct') && /Libran/.test(document.querySelector('#printRoot .pxpage').textContent)));
  const pl = await cas('2026-09-14', 'PASARELA_T');
  ok('hoja del local: Pasarela lunes tarde con Mari Luz la primera, sin hueco', !!pl && pl.slots[0] && !pl.slots[0].hueco && /Mari Luz/.test(pl.slots[0].nombre) && !/hueco/.test(pl.cls), JSON.stringify(pl));
  // 24/09 (revisión): la hoja de un bar con la semana cargada. Con seis nombres en una
  // casilla ya no cabía a 12,5 px, así que se compactaba antes de que la escalera pudiera
  // bajar: salía a 8 px y con la casilla llena 4 px más alta que las demás. Ahora la
  // escalera busca su talla antes de compactar, también por debajo de 12,5, y si ni a 9 px
  // cabe, la compactación conserva la rejilla. Mañana de Zapatillera del martes 15.
  const localCon = n => pg.evaluate(async n => {
    const iso = '2026-09-15', tid = 'ZAPA_M', e = estadoDeIso(iso, true), puestos = [];
    const ocupados = new Set(turnosDe(S).flatMap(t => pidsEn(e, iso, t.id)));
    for (const p of S.staff) {
      if (asignados(e, iso, tid).length >= n) break;
      if (ocupados.has(p.id) || ausenciaEn(p, iso) || p.standby) continue;
      if (asignar(e, S, S.staff, iso, tid, p.id, { forzar: true }).ok) puestos.push(p.id);
    }
    try {
      cerrarImpresion(); abrirImpresionLocal('ZAPA');
      const pag = document.querySelector('#printRoot .pxpage'), t = pag.querySelector('table.pxlocal');
      const cas = [...t.querySelectorAll('td[data-cas]')].map(td => td.getBoundingClientRect().height);
      const cortados = [...t.querySelectorAll('td[data-cas] .pxg-b')].filter(b => b.scrollWidth > b.clientWidth).length;
      const url = await exportarPdfHoja({ soloCanvas: true });
      const img = new Image(); await new Promise(r => { img.onload = r; img.src = url; });
      return { casilla: asignados(e, iso, tid).length, pxn: +t.style.getPropertyValue('--pxn'), fs: parseFloat(getComputedStyle(t).fontSize), cls: pag.className, alto: pag.scrollHeight, A4: Math.round(297 * 96 / 25.4 * 10) / 10, casillas: [Math.min(...cas), Math.max(...cas)], cortados, paginasPdf: Math.ceil(img.height / Math.floor(279 / (190 / img.width))) };
    } finally { for (const pid of puestos) desasignar(e, iso, tid, pid); cerrarImpresion(); }
  }, n);
  const loc6 = await localCon(6);
  ok(`hoja de un bar con 6 nombres en una casilla: baja la letra sin compactar (${loc6.fs}px ≥ 11 · ${loc6.cls})`, loc6.casilla === 6 && loc6.pxn === 6 && loc6.fs >= 11 && !/compacto/.test(loc6.cls), JSON.stringify(loc6));
  ok(`y sigue en una hoja con las casillas iguales (${loc6.alto}px ≤ ${loc6.A4}px · casillas ${loc6.casillas.join('–')}px · PDF ${loc6.paginasPdf})`, loc6.alto <= loc6.A4 && loc6.casillas[1] - loc6.casillas[0] <= 0.1 && loc6.paginasPdf === 1 && loc6.cortados === 0, JSON.stringify(loc6));
  const loc8 = await localCon(8);
  ok(`con 8 nombres no cabe ni a 9 px y compacta, pero con la rejilla regular (${loc8.fs}px · casillas ${loc8.casillas.join('–')}px · ${loc8.alto}px · PDF ${loc8.paginasPdf})`, loc8.casilla === 8 && loc8.alto <= loc8.A4 && loc8.casillas[1] - loc8.casillas[0] <= 0.1 && loc8.paginasPdf === 1 && loc8.cortados === 0, JSON.stringify(loc8));
  await pg.evaluate(() => abrirImpresionLocal('PASARELA'));
  if (CAPTURAS) { const alto = await pg.evaluate(() => document.querySelector('#printRoot .pxpage').scrollHeight); await pg.setViewportSize({ width: 1400, height: alto + 80 }); await pg.screenshot({ path: join(CAPTURAS, 'print-generada-local.png'), fullPage: true }); }
  await pg.click('#pClose');

  await ctx.close();
  ok('sin errores de página en toda la batería', errores.length === 0, errores.slice(0, 4).join(' | '));
} catch (err) {
  ok('la batería reventó', false, err.message + '\n' + (err.stack || '').split('\n').slice(1, 3).join('\n'));
} finally {
  await br.close().catch(() => {});
  srv.close();
}
console.log(`\ntiempo: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
resumen();
