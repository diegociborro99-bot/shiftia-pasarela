// ================= UTILIDADES COMUNES =================
// Lo que usan todas las vistas: selector, escape, avatares, fechas en castellano,
// toasts, tooltip, popovers y overlays. Sin nada de dominio.
const $ = s => document.querySelector(s);
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MES3 = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS_L = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DOW_C = ['', 'L', 'M', 'X', 'J', 'V', 'S', 'D'];

function esc(s) { return String(s === undefined || s === null ? '' : s).replace(/[&<>"'`]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' }[c])); }
function initials(n) { const p = String(n || '').trim().split(/\s+/); return ((p[0] && p[0][0] || '') + (p[1] ? p[1][0] : '')).toUpperCase(); }
function pl(n, sing, plur) { return `${n} ${n === 1 ? sing : plur}`; }
function isoHoy() { return fechaMadrid(); }
function fmtDM(iso) { return `${+iso.slice(8, 10)}/${+iso.slice(5, 7)}`; }
function fmtLargo(iso) { return `${DIAS_L[isoDow(iso)]} ${+iso.slice(8, 10)} de ${MESES[+iso.slice(5, 7) - 1].toLowerCase()}`; }
function fmtCorto(iso) { return `${DOW_C[isoDow(iso)]} ${+iso.slice(8, 10)}`; }
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
