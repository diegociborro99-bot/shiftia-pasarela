// ================= NAVEGACIÓN =================
const VISTAS = ['hoy', 'semana', 'mes', 'equipo', 'horas', 'generador', 'cobertura', 'entrevistas'];
function switchTab(v) {
  if (!VISTAS.includes(v)) v = 'hoy';
  cerrarPops();
  if (typeof closePicker === 'function') closePicker();
  document.querySelectorAll('.tab').forEach(x => x.setAttribute('aria-selected', x.dataset.v === v ? 'true' : 'false'));
  VISTAS.forEach(k => $('#view-' + k).classList.toggle('hidden', k !== v));
  const vw = $('#view-' + v);
  vw.style.animation = 'none'; void vw.offsetWidth; vw.style.animation = '';
  vw.classList.remove('stagger'); void vw.offsetWidth; vw.classList.add('stagger');
  setTimeout(() => vw.classList.remove('stagger'), 650);
  if (v !== 'hoy') $('#dSticky').classList.remove('on');
  pintaBnav(v);
  anotarHistorial(v);
  if (v === 'hoy') renderDia();
  if (v === 'semana') { S.semLunes = mondayOf(isoDia()); renderSemana(); }
  if (v === 'mes') renderMes();
  if (v === 'equipo') renderEquipo();
  if (v === 'horas') renderHoras();
  if (v === 'generador') renderGenerador();
  if (v === 'cobertura') renderCobertura();
  if (v === 'entrevistas') renderEntrevistas();
}
document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => switchTab(t.dataset.v)));
// ir a un día concreto (desde el mes, la revisión, el generador…)
function irAIso(iso) {
  const k = iso.slice(0, 7);
  if (k < MIN_MONTH || k > MAX_MONTH) return;
  if (k !== mesKey(S.y, S.m)) { S.y = +iso.slice(0, 4); S.m = +iso.slice(5, 7); cargarMes(); }
  S.day = +iso.slice(8, 10); S.semLunes = mondayOf(iso);
  saveState();
  if (document.body.classList.contains('modo-empleado')) { activarModoEmpleado(); return; }
  switchTab('hoy');
  scrollTo({ top: 0, behavior: 'smooth' });
}

// ---------- modo empleado: cada persona ve solo lo suyo ----------
// Su mes: qué días trabaja, dónde, si abre o lleva cocina, y sus horas. Sin
// botones de edición (el CSS esconde pestañas, barra y vistas del encargado).
function activarModoEmpleado() {
  const pidSesion = SRV.pid || (function () { try { return sessionStorage.getItem(PID_KEY); } catch (e) { return null; } })();
  const p = S.staff.find(x => x.id === pidSesion);
  document.body.classList.add('modo-empleado');
  let sec = document.getElementById('view-perfil');
  if (!sec) { sec = document.createElement('section'); sec.id = 'view-perfil'; sec.className = 'view'; document.querySelector('main').appendChild(sec); }
  if (!p) {
    sec.innerHTML = `<div class="revok" style="margin-top:20px"><b>Tu usuario no está asociado a ninguna persona de la planilla.</b><p class="revsub">Pide al encargado que te cree el acceso desde Cuenta → Usuarios.</p><button class="btn btn-ghost" id="perfSalir" style="margin-top:10px">Cerrar sesión</button></div>`;
    sec.querySelector('#perfSalir').addEventListener('click', () => cerrarSesion(true));
    return;
  }
  const hoy = isoHoy();
  const h = horasPersonaMes(S, S.staff, S.meses, p.id, S.y, S.m);
  const evPor = {}; for (const ev of eventosMes(est)) (evPor[ev.iso] = evPor[ev.iso] || []).push(ev);
  let dias = '';
  for (const d of est.days) {
    const cas = casillasDe(est, d.iso, p.id);
    const aus = ausenciaEn(p, d.iso);
    if (!cas.length && !aus) continue;
    dias += `<div class="festrow${d.iso === hoy ? ' f-manual' : ''}" style="border-left-color:${cas.length ? colorLocal(partirTurno(cas[0].tid).localId) : 'var(--warn)'}"><span class="festinfo"><b>${fmtLargo(d.iso)}${d.iso === hoy ? ' · hoy' : ''}${d.festivo ? ' · festivo' : ''}</b>${aus ? `<small>${esc((AUS_LBL[aus.tipo] || {}).label || aus.tipo)}${aus.detalle ? ' · ' + esc(aus.detalle) : ''}</small>` : ''}${cas.map(c => { const { localId, franja } = partirTurno(c.tid); const l = localDe(S, localId); const hr = c.entry.ini && c.entry.fin ? c.entry : horarioDe(l, d.dow, franja); return `<small><span class="lpill" style="--lc:${colorLocal(localId)}">${esc(l ? l.corto : localId)}</span> ${FRANJA_LBL[franja].toLowerCase()}${hr ? ` ${esc(hr.ini)}–${esc(hr.fin)}` : ''}${c.entry.abre ? ' · <b>abres</b>' : ''}${c.entry.cocina ? ' · cocina' : ''}${evPor[d.iso] ? ' · ⚽ ' + esc(evPor[d.iso].map(x => x.nombre).join(', ')) : ''}</small>`; }).join('')}</span></div>`;
  }
  const locs = (p.locales || []).map(id => nombreLocal(id)).join(', ') || 'todos los locales';
  sec.innerHTML = `<div class="fichead" style="margin-top:6px"><span class="fichav" style="background:${avColor(p.id)}">${esc(initials(p.nombre))}</span>
      <span><h2>${esc(p.nombre)}</h2><span class="sub">${esc((PUESTOS.find(x => x.id === p.puesto) || {}).label || '')} · ${esc(locs)}${p.libra && p.libra.length ? ' · libra ' + p.libra.map(d => DIAS_L[d].toLowerCase()).join(' y ') : ''}</span></span>
      <span style="margin-left:auto;display:flex;gap:6px"><button class="btn-mini ghost" id="perfCuenta">Contraseña</button><button class="btn-mini ghost" id="perfSalir">Salir</button></span></div>
    <div class="dnav" style="margin-top:12px"><div class="arrows"><button class="mbtn" id="perfPrev" aria-label="Mes anterior">‹</button><button class="mbtn" id="perfNext" aria-label="Mes siguiente">›</button></div><div><span class="dkick">Mi mes</span><div class="dbig"><b>${MESES[S.m - 1]}</b> <small>${S.y}</small></div></div></div>
    <div class="kpis" style="margin:10px 0 14px">
      <div class="kpi"><div class="micro">Turnos</div><div class="knum">${h.turnos}</div><div class="kcap">${h.mananas} mañanas · ${h.tardes} tardes${h.partidos ? ' · ' + h.partidos + ' partidos' : ''}</div></div>
      <div class="kpi"><div class="micro">Horas del mes</div><div class="knum">${fmtHoras(h.minutos / 60)}</div><div class="kcap">${h.extrasMin ? '+ ' + fmtHoras(h.extrasMin / 60) + ' extra' : 'según horario de cada local'}</div></div>
      <div class="kpi"><div class="micro">Domingos y festivos</div><div class="knum">${h.domingos + h.festivas}</div><div class="kcap">${fmtHoras((h.domingosMin + h.festivasMin) / 60)}</div></div>
    </div>
    ${dias || '<div class="festvacio">Este mes no tienes turnos en la planilla.</div>'}
    <p class="revsub" style="margin-top:14px">Si algo no cuadra, díselo al encargado: solo él puede cambiar la planilla.</p>`;
  const mueve = dir => { if (shiftMonth(dir)) activarModoEmpleado(); };
  sec.querySelector('#perfPrev').addEventListener('click', () => mueve(-1));
  sec.querySelector('#perfNext').addEventListener('click', () => mueve(1));
  sec.querySelector('#perfCuenta').addEventListener('click', openCuenta);
  sec.querySelector('#perfSalir').addEventListener('click', () => cerrarSesion(true));
  scrollTo({ top: 0 });
}

// ---------- teclado ----------
document.addEventListener('keydown', e => {
  const t = e.target;
  if (!(t instanceof Element)) return;
  if ((e.key === 'Enter' || e.key === ' ') && t.matches('[role=button][tabindex]:not(button):not(a)')) { e.preventDefault(); t.click(); return; }
  if (t.matches('td[data-asig]') && (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
    e.preventDefault();
    let dest = null;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      dest = e.key === 'ArrowLeft' ? t.previousElementSibling : t.nextElementSibling;
      if (dest && !dest.matches('td[data-asig]')) dest = null;
    } else {
      const fila = t.parentElement, i = [...fila.children].indexOf(t);
      let f2 = e.key === 'ArrowUp' ? fila.previousElementSibling : fila.nextElementSibling;
      while (f2 && !f2.querySelector('td[data-asig]')) f2 = e.key === 'ArrowUp' ? f2.previousElementSibling : f2.nextElementSibling;
      dest = f2 ? f2.children[i] : null;
    }
    if (dest) { dest.focus(); dest.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
  }
});

// ---------- diálogos: foco y Escape ----------
{
  const FOC = 'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])';
  const pila = [];
  const visibles = ov => [...ov.querySelectorAll(FOC)].filter(el => el.offsetParent !== null || el.getClientRects().length);
  const prepara = ov => {
    if (ov.__vigilado) return; ov.__vigilado = true;
    const card = ov.querySelector('.ovcard') || ov;
    if (!card.getAttribute('role')) card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    if (!card.getAttribute('aria-label') && !card.getAttribute('aria-labelledby')) {
      const tit = card.querySelector('h1,h2,h3,.micro'); if (tit) card.setAttribute('aria-label', tit.textContent.trim().slice(0, 80));
    }
    pila.push({ ov, antes: document.activeElement });
    setTimeout(() => { if (!ov.isConnected || ov.contains(document.activeElement)) return; const f = visibles(ov).filter(el => !el.matches('.ovx,[data-ovx]')); (f[0] || visibles(ov)[0] || card).focus({ preventScroll: true }); }, 60);
  };
  const cierra = ov => { const x = ov.querySelector('[data-ovx],.ovx'); if (x) x.click(); else ov.remove(); };
  const esCapa = n => n instanceof Element && (n.classList.contains('ovl') || (n.classList.contains('pop') && n.classList.contains('sheet')));
  const anota = () => { try { if (!(history.state && history.state.capa)) history.pushState(Object.assign({}, history.state || { v: 'hoy' }, { capa: 1 }), '', location.pathname + location.search); } catch (e) {} };
  const retira = () => { if (CERRANDO_POR_HISTORIAL) return; if (!document.querySelector('.ovl, .pop.sheet') && history.state && history.state.capa) { try { history.back(); } catch (e) {} } };
  new MutationObserver(ms => {
    for (const m of ms) {
      for (const n of m.addedNodes) if (esCapa(n)) { if (n.classList.contains('ovl')) prepara(n); anota(); }
      for (const n of m.removedNodes) if (esCapa(n)) retira();
      for (const n of m.removedNodes) if (n instanceof Element && n.classList.contains('ovl')) {
        const i = pila.findIndex(x => x.ov === n);
        if (i >= 0) {
          let { antes } = pila.splice(i, 1)[0];
          if (antes && !antes.isConnected && antes.id) antes = document.getElementById(antes.id) || antes;
          if (antes && antes.isConnected && typeof antes.focus === 'function' && !document.querySelector('.ovl')) try { antes.focus({ preventScroll: true }); } catch (e) {}
        }
      }
    }
  }).observe(document.body, { childList: true });
  document.addEventListener('keydown', e => {
    const ovs = document.querySelectorAll('.ovl'); if (!ovs.length) return;
    const ov = ovs[ovs.length - 1];
    if (e.key === 'Escape') { if (!e.target.matches('input,textarea') || !e.target.value) { e.preventDefault(); cierra(ov); } return; }
    if (e.key !== 'Tab') return;
    const f = visibles(ov); if (!f.length) return;
    const primero = f[0], ultimo = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === primero || !ov.contains(document.activeElement))) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && (document.activeElement === ultimo || !ov.contains(document.activeElement))) { e.preventDefault(); primero.focus(); }
  });
}

// ---------- «atrás» del sistema ----------
let NAV_DESDE_HISTORIAL = false, CERRANDO_POR_HISTORIAL = false;
function anotarHistorial(v) {
  if (NAV_DESDE_HISTORIAL) return;
  try {
    const url = location.pathname + location.search;
    if (history.state && history.state.v === v) return;
    if (!history.state || !history.state.v) history.replaceState({ v }, '', url);
    else history.pushState({ v }, '', url);
  } catch (e) {}
}
window.addEventListener('popstate', e => {
  const abiertos = document.querySelectorAll('.ovl, .pop');
  if (abiertos.length) {
    CERRANDO_POR_HISTORIAL = true;
    try {
      abiertos[abiertos.length - 1].remove();
      if (!document.querySelector('.pop')) document.querySelectorAll('.popfondo').forEach(f => f.remove());
    } finally { setTimeout(() => { CERRANDO_POR_HISTORIAL = false; }, 0); }
    return;
  }
  if (e.state && e.state.capa) return;
  const v = e.state && e.state.v;
  if (v && !document.body.classList.contains('modo-empleado') && document.getElementById('view-' + v)) {
    NAV_DESDE_HISTORIAL = true;
    try { switchTab(v); } finally { NAV_DESDE_HISTORIAL = false; }
  }
});

// ---------- navegación inferior móvil ----------
const BNAV_EN_MAS = ['equipo', 'horas', 'generador', 'cobertura', 'entrevistas'];
function pintaBnav(v) {
  const activo = BNAV_EN_MAS.includes(v) ? 'mas' : v;
  document.querySelectorAll('.bnav [data-bnav]').forEach(b => {
    const on = b.dataset.bnav === activo;
    b.classList.toggle('on', on);
    b.setAttribute('aria-current', on ? 'page' : 'false');
  });
}
document.getElementById('bnav').addEventListener('click', e => {
  const b = e.target.closest('[data-bnav]'); if (!b) return;
  if (b.dataset.bnav === 'mas') { openMas(); return; }
  switchTab(b.dataset.bnav);
});
pintaBnav('hoy');
try { if (!history.state || !history.state.v) history.replaceState({ v: 'hoy' }, '', location.pathname + location.search); } catch (e) {}
function openMas() {
  const ex = document.getElementById('masOvl'); if (ex) { ex.remove(); return; }
  const ov = document.createElement('div');
  ov.className = 'ovl'; ov.id = 'masOvl';
  const fila = (accion, svg, titulo, sub) => `<button class="masrow" data-mas="${accion}">
    <span class="masic">${svg}</span><span class="mast"><b>${titulo}</b>${sub ? `<small>${sub}</small>` : ''}</span></button>`;
  const I = (p) => `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  ov.innerHTML = `<div class="ovcard big" style="max-width:430px">
    <button class="ovx" data-ovx aria-label="Cerrar">✕</button>
    <span class="micro">MÁS OPCIONES</span>
    <div class="masgrid">
      ${fila('equipo', I('<circle cx="9" cy="8.2" r="3.4"/><path d="M3.5 19.5c.9-3.4 3-5.2 5.5-5.2s4.6 1.8 5.5 5.2"/><circle cx="17" cy="9.5" r="2.6"/><path d="M15.6 14.6c2.3.2 4 1.8 4.8 4.9"/>'), 'Equipo', 'personas, condiciones y locales')}
      ${fila('horas', I('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3.2 2"/>'), 'Contador de horas', 'horas del mes para la nómina')}
      ${fila('generador', I('<path d="M12 3.5l1.8 4.6 4.7.4-3.6 3.1 1.1 4.6-4-2.5-4 2.5 1.1-4.6-3.6-3.1 4.7-.4Z"/>'), 'Generador de planillas', 'semana tipo + relleno inteligente')}
      ${fila('cobertura', I('<path d="M12 3.5 5 6v5.5c0 4.2 3 7.6 7 9 4-1.4 7-4.8 7-9V6Z"/><path d="m9.3 12.2 1.9 1.9 3.6-3.8"/>'), 'Gestor de cobertura', 'baja, día libre o cambio: plan A y plan B')}
      ${fila('entrevistas', I('<path d="M4 5.5h16v10H9l-4 3.5v-3.5H4Z"/><path d="M8 9h8M8 12h5"/>'), 'Entrevistas', 'en construcción')}
      ${fila('evento', I('<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17M3.5 12h17"/>'), 'Partido u evento', 'refuerzo por local')}
      ${fila('revisar', I('<circle cx="10.7" cy="10.7" r="6.7"/><path d="m15.7 15.7 4.8 4.8"/>'), 'Revisar el mes', 'casillas cortas, sin cocina, forzados')}
      ${fila('deshacer', I('<path d="M8 5 3.5 9.5 8 14"/><path d="M3.5 9.5H15a5.5 5.5 0 1 1 0 11h-3"/>'), 'Deshacer', 'última acción de planilla')}
      ${fila('historial', I('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3.2 2"/>'), 'Historial de cambios', 'quién hizo qué y cuándo')}
      ${fila('equipos', I('<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5c3 2.5 3 14.5 0 17M12 3.5c-3 2.5-3 14.5 0 17M3.5 12h17"/>'), 'Botones de fútbol', 'equipos y refuerzo por defecto')}
      ${fila('cuenta', I('<circle cx="12" cy="8.2" r="4"/><path d="M4.5 20.5c1.2-4 4-6 7.5-6s6.3 2 7.5 6"/>'), 'Cuenta', SRV.on ? 'contraseña, usuarios y copia' : 'contraseña y copia de seguridad')}
      ${fila('tema', I('<path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5A6.6 6.6 0 0 1 12 3.5Z"/>'), 'Tema claro / oscuro', '')}
    </div>
  </div>`;
  document.body.appendChild(ov);
  ov.addEventListener('click', e => {
    if (e.target === ov || e.target.closest('[data-ovx]')) { ov.remove(); return; }
    const m = e.target.closest('[data-mas]');
    if (!m) return;
    ov.remove();
    const a = m.dataset.mas;
    if (a === 'equipo' || a === 'horas' || a === 'generador' || a === 'cobertura' || a === 'entrevistas') switchTab(a);
    else if (a === 'evento') openEvento({ iso: isoDia() });
    else if (a === 'revisar') { switchTab('mes'); openRevision(); }
    else if (a === 'deshacer') deshacer();
    else if (a === 'historial') openHistorial();
    else if (a === 'equipos') openEquipos();
    else if (a === 'cuenta') openCuenta();
    else if (a === 'tema') $('#themeBtn').click();
  });
}

// ---------- día a día ----------
$('#dHoy').addEventListener('click', () => {
  const hoy = isoHoy();
  const k = hoy.slice(0, 7);
  if (k < MIN_MONTH || k > MAX_MONTH) { toast('Hoy queda fuera del rango de planificación', 'warn'); return; }
  if (k !== mesKey(S.y, S.m)) { S.y = +hoy.slice(0, 4); S.m = +hoy.slice(5, 7); cargarMes(); }
  S.day = +hoy.slice(8, 10);
  saveState(); renderDia();
});
$('#dPrev').addEventListener('click', () => {
  if (S.day > 1) { S.day--; saveState(); renderDia(); } else if (shiftMonth(-1, 'last')) renderDia();
});
$('#dNext').addEventListener('click', () => {
  if (S.day < est.days.length) { S.day++; saveState(); renderDia(); } else if (shiftMonth(1)) renderDia();
});
$('#sPrev').addEventListener('click', () => $('#dPrev').click());
$('#sNext').addEventListener('click', () => $('#dNext').click());
addEventListener('scroll', () => {
  $('#dSticky').classList.toggle('on', !$('#view-hoy').classList.contains('hidden') && scrollY > 235);
}, { passive: true });
$('#undoBtn').addEventListener('click', deshacer);

// ---------- instalación como app (PWA) ----------
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js?b=' + (typeof APP_BUILD !== 'undefined' ? APP_BUILD : 'v1')).catch(() => {});
}
window.addEventListener('appinstalled', () => toast('Shiftia Pasarela instalada en este dispositivo', 'ok'));

// ---------- tema ----------
const THEME_KEY = 'shiftia_pas_theme';
$('#themeBtn').addEventListener('click', () => {
  document.documentElement.classList.add('themeing');
  setTimeout(() => document.documentElement.classList.remove('themeing'), 400);
  const cur = document.documentElement.getAttribute('data-theme') || 'auto';
  const next = cur === 'auto' ? 'dark' : cur === 'dark' ? 'light' : 'auto';
  if (next === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', next);
  try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
});
try { const tv = localStorage.getItem(THEME_KEY); if (tv && tv !== 'auto') document.documentElement.setAttribute('data-theme', tv); } catch (e) {}
