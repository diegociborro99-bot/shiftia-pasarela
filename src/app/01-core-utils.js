// ================= UTILIDADES COMUNES =================
// Lo que usan todas las vistas: selector, escape, avatares, fechas en castellano,
// toasts, tooltip, popovers y overlays. Sin nada de dominio.
const $ = s => document.querySelector(s);
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MES3 = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS_L = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DOW_C = ['', 'L', 'M', 'X', 'J', 'V', 'S', 'D'];

// Marca de cocina: una sartén de trazo, más reconocible de un vistazo que el rombo del
// prototipo. Hereda el color del texto, así que vale en cualquier chip, en la leyenda y
// en las hojas impresas. Se dibuja con el tamaño de la letra que la rodea.
// Los iconos de la base de entrevistas, los mismos que el grupo usa en Notion pero
// dibujados a mano para que peguen con la sartén de la cocina: sartén (cocinero),
// bandeja (camarero), pulgar arriba (bien), pulgar abajo (mal) y reloj de arena
// (pendiente de valorar). Trazo, currentColor y 24×24, como el resto.
const ICO = (d, cls) => `<svg class="ico ${cls || ''}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${d}</svg>`;
const SVG_CAMARERO = ICO('<path d="M3.4 12.6h17.2a8.6 8.6 0 0 1-17.2 0Z"/><path d="M12 12.6V9.4"/><circle cx="12" cy="7.9" r="1.5"/><path d="M6.5 21.2h11"/>', 'icam');
const SVG_BIEN = ICO('<path d="M7.6 20.4V10.2l4.2-7a2 2 0 0 1 2.9 2.4l-1.3 4h4.9a2 2 0 0 1 2 2.4l-1.3 6.4a2.6 2.6 0 0 1-2.6 2h-8.8Z"/><path d="M7.6 10.4H4.2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3.4"/>', 'ibien');
const SVG_MAL = ICO('<path d="M7.6 3.6v10.2l4.2 7a2 2 0 0 0 2.9-2.4l-1.3-4h4.9a2 2 0 0 0 2-2.4L19 5.6a2.6 2.6 0 0 0-2.6-2H7.6Z"/><path d="M7.6 13.6H4.2a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1h3.4"/>', 'imal');
const SVG_VETO = ICO('<circle cx="12" cy="12" r="9.2"/><path d="M6.6 12h10.8"/>', 'ivet');
const SVG_ESPERA = ICO('<path d="M6.6 2.8h10.8M6.6 21.2h10.8"/><path d="M7.8 2.8v3.6c0 2.4 4.2 3.9 4.2 5.6s-4.2 3.2-4.2 5.6v3.6"/><path d="M16.2 2.8v3.6c0 2.4-4.2 3.9-4.2 5.6s4.2 3.2 4.2 5.6v3.6"/>', 'iesp');
// Las aptitudes que el grupo pregunta en la entrevista, cada una con su dibujo
const SVG_CAFETERA = ICO('<path d="M4.2 8.4h11.2v5.4a4.4 4.4 0 0 1-4.4 4.4H8.6a4.4 4.4 0 0 1-4.4-4.4Z"/><path d="M15.4 9.8h2.4a2.3 2.3 0 0 1 0 4.6h-2.4"/><path d="M7.4 5.4V3.2M11 5.4V3.2M3.4 21h12.8"/>', 'icaf');
const SVG_BARRIL = ICO('<rect x="5.4" y="3.2" width="13.2" height="17.6" rx="3.4"/><path d="M5.4 8.6h13.2M5.4 15.4h13.2"/>', 'ibar');
const SVG_JAMON = ICO('<path d="M17.6 4.4c2.6 2.6 2 7.2-1.4 10.6s-8 4-10.6 1.4 1-6.2 2.6-7.8 6.8-6.8 9.4-4.2Z"/><path d="m5.6 16.4-2.2 2.2M4.5 17.5l2 2"/>', 'ijam');
const SVG_TPV = ICO('<rect x="4.4" y="2.8" width="15.2" height="18.4" rx="2.6"/><path d="M7.6 6.6h8.8v4H7.6Z"/><path d="M8 14.4h.02M12 14.4h.02M16 14.4h.02M8 17.8h.02M12 17.8h.02M16 17.8h.02"/>', 'itpv');
const SVG_DOC = ICO('<rect x="2.6" y="4.6" width="18.8" height="14.8" rx="2.4"/><circle cx="8.6" cy="11" r="2.1"/><path d="M5.2 16.4a3.6 3.6 0 0 1 6.8 0M14.6 9.8h4.2M14.6 13h4.2"/>', 'idoc');
const SVG_SOL = ICO('<circle cx="12" cy="12" r="4.2"/><path d="M12 2.6v2.4M12 19v2.4M4.4 12H2M22 12h-2.4M6.3 6.3 4.6 4.6M19.4 19.4l-1.7-1.7M17.7 6.3l1.7-1.7M4.6 19.4l1.7-1.7"/>', 'isol');
const SVG_LUNA = ICO('<path d="M20.4 14.6A8.8 8.8 0 1 1 9.4 3.6a6.9 6.9 0 0 0 11 11Z"/>', 'ilun');
const SVG_LLAVE = ICO('<circle cx="8.4" cy="15.6" r="4.4"/><path d="m11.5 12.5 8.1-8.1"/><path d="m17.4 6.6 2.2 2.2M15.2 8.8l2.2 2.2"/>', 'illa');
const SVG_PDA = ICO('<rect x="6.6" y="2.6" width="10.8" height="18.8" rx="2.4"/><path d="M9.4 6h5.2v7.4H9.4Z"/><path d="M12 17.6h.02"/>', 'ipda');
const SVG_COCINA = '<svg class="icoc" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M2.9 10.3h12.3v2.4a5 5 0 0 1-5 5H7.9a5 5 0 0 1-5-5Z"/><path d="m15.4 11.2 5.7-2.8"/></svg>';
// 17/09: la ficha del candidato enseña la entrevista entera, y cada dato lleva el suyo
const SVG_EDAD = ICO('<circle cx="12" cy="7.6" r="3.9"/><path d="M4.6 20.6a7.4 7.4 0 0 1 14.8 0"/>', 'iedad');
const SVG_ZONA = ICO('<path d="M12 21.4c4.7-4.6 7-8.2 7-10.9a7 7 0 1 0-14 0c0 2.7 2.3 6.3 7 10.9Z"/><circle cx="12" cy="10.2" r="2.6"/>', 'izon');
const SVG_FECHA = ICO('<rect x="3.4" y="5" width="17.2" height="15.6" rx="2.6"/><path d="M3.4 9.8h17.2M8.4 2.8v4.2M15.6 2.8v4.2"/>', 'ifec');
const SVG_EXP = ICO('<rect x="2.8" y="7.4" width="18.4" height="12.8" rx="2.4"/><path d="M8.6 7.4V5.6a2 2 0 0 1 2-2h2.8a2 2 0 0 1 2 2v1.8M2.8 12.8h18.4"/>', 'iexp');
const SVG_TIPOCOCINA = ICO('<path d="M6.4 13.4a3.8 3.8 0 1 1 1.4-7.3 4.6 4.6 0 0 1 8.4 0 3.8 3.8 0 1 1 1.4 7.3Z"/><path d="M6.4 13.4v5.4a1.8 1.8 0 0 0 1.8 1.8h7.6a1.8 1.8 0 0 0 1.8-1.8v-5.4M6.6 17.2h10.8"/>', 'itco');
const SVG_INCORP = ICO('<path d="M13.6 3.4H18a2 2 0 0 1 2 2v13.2a2 2 0 0 1-2 2h-4.4"/><path d="M9.6 16.4 14 12 9.6 7.6M14 12H3.8"/>', 'iinc');
const SVG_SUELDO = ICO('<rect x="2.6" y="5.8" width="18.8" height="12.4" rx="2.4"/><path d="M14.6 9.6a3.3 3.3 0 1 0 0 4.8M9.4 11.2h4.2M9.4 12.8h4.2"/>', 'isue');
const SVG_HORARIO = ICO('<circle cx="12" cy="12" r="9"/><path d="M12 6.8V12l3.4 2"/>', 'ihor');
const SVG_COND = ICO('<path d="M13.4 2.8H7.2A2.2 2.2 0 0 0 5 5v14a2.2 2.2 0 0 0 2.2 2.2h9.6A2.2 2.2 0 0 0 19 19V8.4Z"/><path d="M13.4 2.8V8.4H19"/><path d="m8.8 15.2 2 2 3.8-4"/>', 'icnd');
const SVG_OBS = ICO('<path d="M20.4 14.8a2.4 2.4 0 0 1-2.4 2.4H8.6L3.6 21V5.6a2.4 2.4 0 0 1 2.4-2.4h12a2.4 2.4 0 0 1 2.4 2.4Z"/>', 'iobs');
const SVG_ADJ = ICO('<path d="M19.8 11.6 12.2 19.2a5 5 0 0 1-7.1-7.1l8-8a3.4 3.4 0 0 1 4.8 4.8l-7.9 7.9a1.8 1.8 0 0 1-2.5-2.5l7.3-7.3"/>', 'iadj');
const SVG_TEL = ICO('<path d="M20.4 16.9v2.5a1.9 1.9 0 0 1-2.1 1.9 18 18 0 0 1-7.8-2.8 17.6 17.6 0 0 1-5.4-5.4A18 18 0 0 1 2.3 5.3a1.9 1.9 0 0 1 1.9-2.1h2.5a1.9 1.9 0 0 1 1.9 1.6c.1.9.3 1.8.6 2.6a1.9 1.9 0 0 1-.4 2L7.7 10.5a14.4 14.4 0 0 0 5.4 5.4l1.1-1.1a1.9 1.9 0 0 1 2-.4c.8.3 1.7.5 2.6.6a1.9 1.9 0 0 1 1.6 1.9Z"/>', 'itel');
const SVG_WA = ICO('<path d="M3.2 20.8 4.6 16.1A8.6 8.6 0 1 1 8 19.4Z"/><path d="M9.1 8.6c.3 2.7 3.6 6 6.3 6.3.7.1 1.3-.5 1.3-1.2v-.6l-2-.9-1 1a7.8 7.8 0 0 1-2.9-2.9l1-1-.9-2h-.6c-.7 0-1.3.6-1.2 1.3Z"/>', 'iwa');
const SVG_NOTA = ICO('<path d="M5.6 4.6a2 2 0 0 1 2-2h8.8a2 2 0 0 1 2 2v16.6L12 17.4l-6.4 3.8Z"/>', 'inot');
const SVG_APTITUD = ICO('<path d="m12 3 2.6 5.5 5.9.8-4.3 4.3 1 6-5.2-2.9-5.2 2.9 1-6L3.5 9.3l5.9-.8Z"/>', 'iapt');
function esc(s) { return String(s === undefined || s === null ? '' : s).replace(/[&<>"'`]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' }[c])); }
function initials(n) { const p = String(n || '').trim().split(/\s+/); return ((p[0] && p[0][0] || '') + (p[1] ? p[1][0] : '')).toUpperCase(); }
function pl(n, sing, plur) { return `${n} ${n === 1 ? sing : plur}`; }
function isoHoy() { return fechaMadrid(); }
function fmtDM(iso) { return `${+iso.slice(8, 10)}/${+iso.slice(5, 7)}`; }
function fmtLargo(iso) { return `${DIAS_L[isoDow(iso)]} ${+iso.slice(8, 10)} de ${MESES[+iso.slice(5, 7) - 1].toLowerCase()}`; }
function fmtCorto(iso) { return `${DOW_C[isoDow(iso)]} ${+iso.slice(8, 10)}`; }
// «ayer», «hace 12 días», «dentro de 2 meses»: para que se vea cuándo lo que hay en
// pantalla no es hoy y nadie lea una fecha vieja como si fuera la de hoy
function distanciaHoy(iso) {
  const d = Math.round((fechaLocal(iso) - fechaLocal(isoHoy())) / 864e5);
  if (!d) return '';
  const n = Math.abs(d);
  if (n === 1) return d < 0 ? 'ayer' : 'mañana';
  if (n < 31) return d < 0 ? `hace ${n} días` : `dentro de ${n} días`;
  const ms = Math.round(n / 30);
  return d < 0 ? `hace ${pl(ms, 'mes', 'meses')}` : `dentro de ${pl(ms, 'mes', 'meses')}`;
}
function fmtHoras(h) { return (Math.round(h * 10) / 10).toLocaleString('es-ES', { maximumFractionDigits: 1 }) + ' h'; }
function nombreCorto(nombre) {
  const partes = String(nombre || '').trim().split(/\s+/).filter(Boolean);
  if (partes.length < 2) return partes[0] || '';
  return `${partes[0]} ${partes[1][0].toUpperCase()}.`;
}
// color fijo de la persona (paleta del modelo); si aún no tiene, se asigna
function avColor(pid) {
  const p = typeof S !== 'undefined' && S && S.staff ? S.staff.find(x => x.id === pid) : null;
  if (p) {
    if (!(Number.isInteger(p.color) && p.color >= 0 && p.color < PALETA_PERSONAS.length)) asignarColores(S.staff);
    return PALETA_PERSONAS[p.color];
  }
  let h = 0; for (const ch of pid + 'x') h = (h * 31 + ch.charCodeAt(0)) % 997;
  return `hsl(${(h * 137) % 360} 42% 46%)`;
}
function colorLocal(localId) { const l = typeof S !== 'undefined' && S ? localDe(S, localId) : null; return (l && l.color) || '#6e6e6e'; }
function nombreLocal(localId) { const l = typeof S !== 'undefined' && S ? localDe(S, localId) : null; return l ? l.nombre : localId; }

// ---------- toast / tooltip ----------
const TOAST_ICO = {
  ok: '<path d="m8.2 12.4 2.6 2.6 5-5.4"/><circle cx="12" cy="12" r="8.7"/>',
  warn: '<path d="M12 3.8 21.4 20H2.6Z"/><path d="M12 9.8v4.4"/><circle fill="currentColor" stroke="none" cx="12" cy="17" r="1.05"/>',
  bad: '<circle cx="12" cy="12" r="8.7"/><path d="m9 9 6 6M15 9l-6 6"/>',
  info: '<circle cx="12" cy="12" r="8.7"/><path d="M12 11v5"/><circle fill="currentColor" stroke="none" cx="12" cy="7.6" r="1.05"/>',
};
function toast(msg, kind) {
  const d = document.createElement('div');
  d.className = 'toast ' + (kind || '');
  if (kind === 'bad') d.setAttribute('role', 'alert');
  d.innerHTML = `<svg class="tico" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${TOAST_ICO[kind] || TOAST_ICO.info}</svg><span></span>`;
  d.querySelector('span').textContent = msg;
  $('#toasts').appendChild(d);
  setTimeout(() => { d.style.transition = 'opacity .4s'; d.style.opacity = '0'; setTimeout(() => d.remove(), 400); }, 3400);
}
const tip = $('#tip');
document.addEventListener('mouseover', e => {
  const t = e.target.closest && e.target.closest('[data-tipstr]');
  if (!t) { tip.classList.remove('on'); return; }
  tip.innerHTML = esc(t.dataset.tipstr).replace(/\n/g, '<br>');
  tip.classList.add('on');
});
document.addEventListener('mousemove', e => {
  if (!tip.classList.contains('on')) return;
  const pad = 14;
  let x = e.clientX + pad, y = e.clientY + pad;
  const r = tip.getBoundingClientRect();
  if (x + r.width > innerWidth - 8) x = e.clientX - r.width - pad;
  if (y + r.height > innerHeight - 8) y = e.clientY - r.height - pad;
  tip.style.left = x + 'px'; tip.style.top = y + 'px';
});
document.addEventListener('mouseout', e => { if (!e.relatedTarget || !e.relatedTarget.closest || !e.relatedTarget.closest('[data-tipstr]')) tip.classList.remove('on'); });
{
  let tTip = null;
  const esControl = el => el.matches('button,a,input,select,textarea,label,summary') || !!el.closest('button,a,label,summary');
  document.addEventListener('click', e => {
    if (!matchMedia('(hover:none)').matches) return;
    const t = e.target.closest && e.target.closest('[data-tipstr]');
    if (!t || esControl(t)) { tip.classList.remove('on'); return; }
    tip.innerHTML = esc(t.dataset.tipstr).replace(/\n/g, '<br>');
    tip.classList.add('on');
    const r = tip.getBoundingClientRect();
    let x = e.clientX - r.width / 2, y = e.clientY - r.height - 18;
    x = Math.max(8, Math.min(x, innerWidth - r.width - 8));
    if (y < 8) y = e.clientY + 18;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
    clearTimeout(tTip); tTip = setTimeout(() => tip.classList.remove('on'), 3200);
  });
}

// ---------- count-up de cifras (respeta reduced motion) ----------
function countUp(el) {
  const fin = parseInt(el.textContent, 10);
  if (!Number.isFinite(fin) || fin <= 0 || String(fin) !== el.textContent.trim()) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const t0 = performance.now(), dur = 340;
  const paso = t => { const k = Math.min(1, (t - t0) / dur); el.textContent = Math.round(fin * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(paso); };
  requestAnimationFrame(paso);
}

// ---------- overlays y popovers ----------
// ¿Se puede cerrar este diálogo sin perder nada? Si hay algo escrito, pregunta.
function cierraSiLimpio(cont) {
  let sucio = false;
  for (const el of cont.querySelectorAll('input,textarea,select')) {
    if (el.dataset.libre !== undefined) continue;   // campos que se guardan al vuelo
    if (el.type === 'checkbox' || el.type === 'radio') { if (el.checked !== el.defaultChecked) sucio = true; }
    else if (el.tagName === 'SELECT') { const d = [...el.options].findIndex(o => o.defaultSelected); if (el.selectedIndex !== (d < 0 ? 0 : d)) sucio = true; }
    else if (el.type !== 'hidden' && el.type !== 'submit' && el.type !== 'button' && el.value !== el.defaultValue) sucio = true;
    if (sucio) break;
  }
  return !sucio || confirm('Hay cambios sin guardar. ¿Cerrar de todas formas?');
}
document.addEventListener('click', e => {
  if (!(e.target instanceof Element) || !e.target.classList.contains('ovl')) return;
  if (!cierraSiLimpio(e.target)) { e.stopImmediatePropagation(); e.preventDefault(); }
}, true);
// crea (o sustituye) un overlay con una tarjeta; devuelve el elemento .ovl
function abrirOverlay(id, html, opts) {
  const ex = document.getElementById(id); if (ex) ex.remove();
  const ov = document.createElement('div');
  ov.className = 'ovl'; ov.id = id;
  ov.innerHTML = `<div class="ovcard big"${opts && opts.ancho ? ` style="max-width:${opts.ancho}px"` : ''}><button class="ovx" data-ovx aria-label="Cerrar">✕</button>${html}</div>`;
  // qué registro está mirando este panel («staff:pid», «cand:id») y cómo volver a pintarlo.
  // Con eso, un estado que llega de otro usuario solo cierra los paneles cuyo registro ha
  // cambiado de verdad, en vez de cerrarlos todos (Diego, 18/09).
  if (opts && opts.vigila) { ov.dataset.vigila = opts.vigila; if (opts.reabrir) ov._reabrir = opts.reabrir; }
  document.body.appendChild(ov);
  ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('[data-ovx]')) ov.remove(); });
  return ov;
}
// Popover: en el móvil como hoja inferior; en escritorio anclado al botón y dentro de la pantalla
function colocarPop(pop, anchor) {
  if (innerWidth <= 640) {
    pop.classList.add('sheet');
    if (!pop.querySelector('.plist')) pop.classList.add('sheetscroll');
    if (!pop.previousElementSibling || !pop.previousElementSibling.classList.contains('popfondo')) {
      const f = document.createElement('div');
      f.className = 'popfondo';
      f.addEventListener('click', ev => { ev.stopPropagation(); if (cierraSiLimpio(pop)) { pop.remove(); f.remove(); } });
      pop.parentNode.insertBefore(f, pop);
      new MutationObserver((m, obs) => { if (!pop.isConnected) { f.remove(); obs.disconnect(); } }).observe(document.body, { childList: true, subtree: true });
    }
    return;
  }
  const r = anchor ? anchor.getBoundingClientRect() : { left: innerWidth / 2 - 155, bottom: 80, top: 80 };
  const w = pop.offsetWidth || 310, h = pop.offsetHeight || 300;
  pop.style.left = Math.max(8, Math.min(r.left, innerWidth - w - 8)) + 'px';
  let y = r.bottom + 8;
  if (y + h > innerHeight - 10) y = Math.max(8, r.top - h - 8);
  pop.style.top = y + 'px';
}
function cerrarPops() { document.querySelectorAll('.pop').forEach(p => p.remove()); document.querySelectorAll('.popfondo').forEach(f => f.remove()); }
// cierra un popover al hacer clic fuera (escritorio)
function cierraFuera(pop) {
  if (pop.classList.contains('sheet')) return;
  setTimeout(() => document.addEventListener('click', function cierra(ev) { if (!pop.contains(ev.target)) { pop.remove(); document.removeEventListener('click', cierra); } }), 0);
}
// pastilla de día de la semana (L M X J V S D) con estado
const dowSet = (sel, name) => TODOS.map(d => `<button type="button" class="dowk${sel.includes(d) ? ' on' : ''}" data-${name}="${d}">${DOW_C[d]}</button>`).join('');
