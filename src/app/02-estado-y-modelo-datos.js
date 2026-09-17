// ================= ESTADO =================
// S = estado persistente completo (la planilla). Mismo patrón que el piloto: en
// modo local vive en localStorage; con servidor, la verdad vive allí.
//   S.locales   configuración de cada local (mínimos, cocina, horarios, quién abre)
//   S.staff     personas con todas sus condiciones
//   S.patron    semana tipo (plazas por día de la semana)
//   S.meses     { 'YYYY-MM': { asig, apertura, manual } }
//   S.eventos   partidos y eventos con refuerzo; S.extras horas extra; S.cierres meses cerrados
//   S.equipos   los botones de fútbol (equipo → refuerzo por local recordado)
const LS_KEY = 'shiftia_pasarela_v01';
const NAV_KEY = 'shiftia_pas_nav';
const MIN_MONTH = '2026-01', MAX_MONTH = '2030-12';
let S = null, est = null;

function freshState() {
  const hoy = isoHoy();
  return Object.assign(semillaPasarela(), {
    y: +hoy.slice(0, 4), m: +hoy.slice(5, 7), day: +hoy.slice(8, 10),
    meses: {}, nextId: 1, peticiones: [], avisos: [], historial: [], mesesPublicados: [],
    semLunes: mondayOf(hoy), guiaOff: false, esquema: 1,
  });
}
function mesKey(y, m) { return claveMes(y, m); }
function vecinosVivos(e, y, m) {
  Object.defineProperty(e, 'vecinos', { enumerable: false, configurable: true, get() {
    let py = y, pm = m - 1; if (pm < 1) { pm = 12; py--; }
    let ny = y, nm = m + 1; if (nm > 12) { nm = 1; ny++; }
    return { anterior: estadoDesde(S.meses, S.festivos || [], py, pm), siguiente: estadoDesde(S.meses, S.festivos || [], ny, nm) };
  } });
  return e;
}
// estado de cualquier mes (el de pantalla es `est`); escribible=true registra la entrada en S.meses
function estadoMes(y, m, escribible) {
  if (y === S.y && m === S.m && est) return est;
  const e = vecinosVivos(estadoDesde(S.meses, S.festivos || [], y, m), y, m);
  if (escribible && !S.meses[mesKey(y, m)]) S.meses[mesKey(y, m)] = { apertura: e.apertura, asig: e.asig, manual: e.manual };
  return e;
}
function estadoDeIso(iso, escribible) { return estadoMes(+iso.slice(0, 4), +iso.slice(5, 7), escribible); }
function cargarMes() {
  est = vecinosVivos(estadoDesde(S.meses, S.festivos || [], S.y, S.m), S.y, S.m);
  S.meses[mesKey(S.y, S.m)] = { apertura: est.apertura, asig: est.asig, manual: est.manual };
  if (S.day > est.days.length) S.day = est.days.length;
}
function isoDia() { return est.days[S.day - 1].iso; }
// la navegación se recuerda aparte de la planilla
function guardarNav() {
  try { localStorage.setItem(NAV_KEY, JSON.stringify({ y: S.y, m: S.m, day: S.day, semLunes: S.semLunes, guiaOff: S.guiaOff, hY: S.hY, hM: S.hM, hoy: isoHoy() })); } catch (e) {}
}
// La app abre en hoy. Solo se vuelve al día que estabas mirando si lo dejaste hoy mismo
// (recargar no pierde el sitio); mañana, la pantalla vuelve a abrir en la fecha de hoy.
function restaurarNav() {
  let nav = null;
  try { nav = JSON.parse(localStorage.getItem(NAV_KEY) || 'null'); } catch (e) {}
  if (nav && nav.guiaOff !== undefined) S.guiaOff = nav.guiaOff;   // es una preferencia, no navegación
  const hoy = isoHoy();
  if (navVigente(nav, hoy, MIN_MONTH, MAX_MONTH)) {
    for (const k of ['y', 'm', 'day', 'semLunes', 'hY', 'hM']) if (nav[k] !== undefined && nav[k] !== null) S[k] = nav[k];
    return true;
  }
  S.y = +hoy.slice(0, 4); S.m = +hoy.slice(5, 7); S.day = +hoy.slice(8, 10); S.semLunes = mondayOf(hoy);
  S.hY = S.y; S.hM = S.m;
  return false;
}
let ultimoAvisoCuota = 0;
function saveState() {
  guardarNav();
  if (typeof SRV !== 'undefined' && SRV.on) { if (SRV.esAdmin) empujarEstadoDebounced(); return; }
  try { localStorage.setItem(LS_KEY, JSON.stringify(S)); }
  catch (e) {
    if (Date.now() - ultimoAvisoCuota > 60000) { ultimoAvisoCuota = Date.now(); toast('ATENCIÓN: no se está guardando en este dispositivo (espacio lleno). Descarga una copia de seguridad desde Cuenta', 'bad'); }
  }
  try { bcSync && bcSync.postMessage(1); } catch (e) {}
}
let estadoCorrupto = false;
function loadState() {
  let raw = null;
  try { raw = localStorage.getItem(LS_KEY); } catch (e) { return null; }
  if (!raw) return null;
  try {
    const j = JSON.parse(raw);
    if (!j || !Array.isArray(j.staff)) throw new Error('formato');
    return Object.assign(freshState(), j);
  } catch (e) {
    try { localStorage.setItem(LS_KEY + '_corrupto', raw); } catch (e2) {}
    estadoCorrupto = true;
    return null;
  }
}
// migraciones idempotentes: estados guardados con versiones anteriores del esquema
function migrarEstado(estado) {
  if (!estado) return;
  const base = semillaPasarela();
  estado.locales = Array.isArray(estado.locales) && estado.locales.length ? estado.locales : base.locales;
  for (const l of estado.locales) if (l.partidoAbre === undefined) { const b = base.locales.find(x => x.id === l.id); l.partidoAbre = b && b.partidoAbre ? Object.assign({}, b.partidoAbre) : { M: false, T: false }; }
  estado.patron = estado.patron && Object.keys(estado.patron).length ? estado.patron : base.patron;
  estado.equipos = Array.isArray(estado.equipos) && estado.equipos.length ? estado.equipos : base.equipos;
  for (const k of ['eventos', 'extras', 'festivos', 'peticiones', 'avisos', 'historial', 'mesesPublicados']) if (!Array.isArray(estado[k])) estado[k] = [];
  if (!estado.cierres || typeof estado.cierres !== 'object') estado.cierres = {};
  if (!estado.meses || typeof estado.meses !== 'object') estado.meses = {};
  for (const p of estado.staff) {
    p.locales = p.locales || []; p.franjas = p.franjas || ['M', 'T']; p.libra = p.libra || []; p.partido = p.partido || { dias: [] };
    p.cocina = p.cocina || { titular: [], reserva: [], soloDias: [] }; p.abre = p.abre || {}; p.noAbre = p.noAbre || []; p.nuncaCon = p.nuncaCon || [];
    p.cubreA = p.cubreA || []; p.vetos = p.vetos || []; p.contrato = p.contrato || { horasSemana: null }; p.ausencias = p.ausencias || []; p.prefs = p.prefs || {}; p.supuestos = p.supuestos || [];
  }
  migrarHorarios(estado);   // 15/09: los horarios que confirmó la encargada por WhatsApp
  migrarPuestos(estado);    // 17/09: el puesto «comodín» pasa a ser «apoyo»
  migrarAltas(estado);      // 17/09: Dulce y Susi, que entraron después del primer arranque
  // 17/09: la base de entrevistas de Notion (entrevistas + alerta interna)
  if (!Array.isArray(estado.entrevistas) || !estado.entrevistas.length) estado.entrevistas = JSON.parse(JSON.stringify(ENTREVISTAS_SEMILLA));
  migrarCandidatos(estado);   // 17/09: el puesto del candidato pasa de uno suelto a una lista
  limpiarLibrePuntual(estado.staff, isoHoy());   // los días libres puntuales caducan solos
  asignarColores(estado.staff);
  estado.esquema = 1;
}

// ---------- sincronización entre pestañas del mismo navegador ----------
let bcSync = null;
try { bcSync = new BroadcastChannel('shiftia_pas_sync'); } catch (e) {}
let syncTimer = null;
const OVL_PERSISTENTES = ['cambioPassOvl', 'ctaOvl', 'pendienteOvl', 'migraOvl', 'sinConexionOvl'];
function cerrarTransitorios() {
  document.querySelectorAll('.ovl').forEach(o => { if (!OVL_PERSISTENTES.includes(o.id)) o.remove(); });
  cerrarPops();
}
const mesesConContenido = m => Object.fromEntries(Object.entries(m || {}).filter(([, v]) => v && (Object.keys(v.apertura || {}).length || Object.keys(v.asig || {}).length)));
const huellaPlanilla = e => JSON.stringify([mesesConContenido(e.meses), e.staff || [], e.locales || [], e.patron || {}, e.eventos || [], e.extras || [], e.festivos || [], e.cierres || {}]);
function aplicarEstadoExterno(nuevo) {
  const suave = !!S && huellaPlanilla(nuevo) === huellaPlanilla(S);
  const habiaOvl = !suave && !!document.querySelector('.ovl:not(#cambioPassOvl), .pop');
  if (!suave) { cerrarTransitorios(); undoStack.length = 0; actualizarUndoBtn(); }
  const nav = { y: S.y, m: S.m, day: S.day, semLunes: S.semLunes, guiaOff: S.guiaOff, hY: S.hY, hM: S.hM };
  S = Object.assign(freshState(), nuevo);
  for (const k of Object.keys(nav)) if (nav[k] !== undefined) S[k] = nav[k];
  migrarEstado(S);
  if (S.day > diasDelMes(S.y, S.m)) S.day = 1;
  cargarMes();
  if (document.body.classList.contains('modo-empleado')) { if (typeof activarModoEmpleado === 'function') activarModoEmpleado(); }
  else { renderVistaActiva(); if (habiaOvl) toast('Otro dispositivo guardó cambios: el panel abierto se ha cerrado para evitar pisarlos', 'warn'); }
}
function sincronizarDesdeFuera() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => { const nuevo = loadState(); if (!nuevo) return; aplicarEstadoExterno(nuevo); toast('Planilla actualizada desde otra ventana', 'ok'); }, 150);
}
if (bcSync) bcSync.addEventListener('message', sincronizarDesdeFuera);
window.addEventListener('storage', e => { if (e.key === LS_KEY && e.newValue) sincronizarDesdeFuera(); });

// ---------- historial de cambios ----------
function registrarCambio(txt, tipo) {
  const entrada = { ts: Date.now(), tipo: tipo || 'cambio', txt };
  if (typeof SRV !== 'undefined' && SRV.on && SRV.usuario) entrada.usuario = SRV.usuario;
  (S.historial = S.historial || []).unshift(entrada);
  if (S.historial.length > 400) S.historial.length = 400;
}

// ---------- deshacer (pila de instantáneas) ----------
const undoStack = [];
function actualizarUndoBtn() {
  const b = $('#undoBtn'); if (!b) return;
  b.disabled = !undoStack.length;
  b.style.opacity = undoStack.length ? '1' : '.35';
  b.title = undoStack.length ? `Deshacer: ${undoStack[undoStack.length - 1].label} (Ctrl+Z)` : 'Nada que deshacer';
}
function pushUndo(label, extra) {
  try {
    const u = { label, y: S.y, m: S.m, apertura: JSON.parse(JSON.stringify(est.apertura)), asig: JSON.parse(JSON.stringify(est.asig)), manual: JSON.parse(JSON.stringify(est.manual || {})) };
    if (extra && extra.staff) u.staff = JSON.parse(JSON.stringify(S.staff));
    if (extra && extra.eventos) u.eventos = JSON.parse(JSON.stringify(S.eventos));
    if (extra && extra.extras) u.extras = JSON.parse(JSON.stringify(S.extras));
    if (extra && extra.otrosMeses) u.otrosMeses = JSON.parse(JSON.stringify(S.meses));
    undoStack.push(u);
    if (undoStack.length > 20) undoStack.shift();
    actualizarUndoBtn();
  } catch (e) {}
}
function deshacer() {
  const u = undoStack.pop();
  actualizarUndoBtn();
  if (!u) { toast('Nada que deshacer', 'warn'); return; }
  if (u.otrosMeses) S.meses = u.otrosMeses;
  if (u.y !== S.y || u.m !== S.m) { S.y = u.y; S.m = u.m; }
  cargarMes();
  est.apertura = u.apertura; est.asig = u.asig; est.manual = u.manual;
  S.meses[mesKey(S.y, S.m)] = { apertura: est.apertura, asig: est.asig, manual: est.manual };
  if (u.staff) S.staff = u.staff;
  if (u.eventos) S.eventos = u.eventos;
  if (u.extras) S.extras = u.extras;
  registrarCambio('Deshecho: ' + u.label, 'undo');
  saveState(); renderVistaActiva();
  toast('Deshecho: ' + u.label, 'ok');
}
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !/input|textarea|select/i.test((e.target.tagName || ''))) { e.preventDefault(); deshacer(); }
});

// ---------- ayudas de dominio para las vistas ----------
const personaDeId = pid => S.staff.find(p => p.id === pid) || null;
const nombrePid = pid => (personaDeId(pid) || { nombre: pid }).nombre;
const activos = () => S.staff.filter(p => !deBaja(p));
// el mes está cerrado para la nómina: se avisa antes de tocarlo
function mesCerrado(iso) { return !!(S.cierres && S.cierres[iso.slice(0, 7)]); }
function confirmarSiCerrado(iso) {
  if (!mesCerrado(iso)) return true;
  const c = S.cierres[iso.slice(0, 7)];
  return confirm(`${MESES[+iso.slice(5, 7) - 1]} está cerrado para la nómina (cerrado el ${new Date(c.ts).toLocaleDateString('es-ES')}${c.usuario ? ' por ' + c.usuario : ''}). ¿Cambiarlo de todas formas? Quedará constancia en el historial.`);
}
// asignar desde la interfaz: undo + historial + guardado + repintado
function asignarUI(iso, tid, pid, opts) {
  if (!confirmarSiCerrado(iso)) return { ok: false, motivo: 'mes cerrado' };
  const e = estadoDeIso(iso, true);
  const o = Object.assign({ origen: 'manual' }, opts || {});
  const r = asignar(e, S, S.staff, iso, tid, pid, o);
  if (!r.ok) return r;
  const { localId, franja } = partirTurno(tid);
  registrarCambio(`${nombrePid(pid)} → ${nombreLocal(localId)} ${FRANJA_LBL[franja].toLowerCase()} del ${fmtDM(iso)}${o.forzar && r.avisos.length ? ' (forzado: ' + r.avisos.join(', ') + ')' : ''}${o.razon ? ' · ' + o.razon : ''}`, o.forzar ? 'forzado' : 'asig');
  if (mesCerrado(iso)) registrarCambio(`Cambio en un mes cerrado (${iso.slice(0, 7)})`, 'aviso');
  saveState();
  return r;
}
function desasignarUI(iso, tid, pid) {
  if (!confirmarSiCerrado(iso)) return false;
  const e = estadoDeIso(iso, true);
  if (!desasignar(e, iso, tid, pid)) return false;
  const { localId, franja } = partirTurno(tid);
  registrarCambio(`${nombrePid(pid)} sale de ${nombreLocal(localId)} ${FRANJA_LBL[franja].toLowerCase()} del ${fmtDM(iso)}`, 'asig');
  saveState();
  return true;
}
function renderVistaActiva() {
  const activa = document.querySelector('.tab[aria-selected="true"]');
  const v = activa ? activa.dataset.v : 'hoy';
  const f = { hoy: () => renderDia(), semana: () => renderSemana(), mes: () => renderMes(), equipo: () => renderEquipo(), horas: () => renderHoras(), generador: () => renderGenerador(), cobertura: () => renderCobertura(), actividad: () => renderActividad(), entrevistas: () => renderEntrevistas() }[v];
  if (f) f();
  if (typeof pintaRevDot === 'function') pintaRevDot();
}
// vaciar la planilla de un rango (semana o mes) desde la interfaz: todas las plazas,
// también las puestas a mano. Las bajas, vacaciones y demás ausencias viven en las
// fichas y se respetan; los eventos, cierres y aperturas se quedan. Ctrl+Z lo deshace.
function vaciarRangoUI(desde, hasta, titulo, que) {
  if (!confirmarSiCerrado(desde)) return;
  const previo = (() => { let n = 0; for (const iso of rangoIso(desde, hasta)) for (const lista of Object.values(estadoDeIso(iso).asig[iso] || {})) n += lista.length; return n; })();
  if (!previo) { toast(`No hay nada que vaciar en ${que}`, 'warn'); return; }
  const ausentes = S.staff.filter(p => [...rangoIso(desde, hasta)].some(iso => ausenciaEn(p, iso))).length;
  if (!confirm(`Se quitan las ${previo} plazas de ${titulo} (también las puestas a mano). ${ausentes ? `Las ${ausentes} persona(s) con baja, vacaciones u otra ausencia siguen igual en sus fichas. ` : 'Las ausencias siguen en las fichas. '}Los eventos, cierres y aperturas se quedan. ¿Vaciar ${que}? (Ctrl+Z lo deshace)`)) return;
  pushUndo(`vaciar ${que}`, { otrosMeses: true });
  let plazas = 0;
  for (const iso of rangoIso(desde, hasta)) plazas += vaciarPlanilla(estadoDeIso(iso, true), iso, iso).plazas;
  registrarCambio(`Vaciada ${titulo}: ${plazas} plaza(s) retiradas (ausencias respetadas)`, 'cambio');
  if (mesCerrado(desde)) registrarCambio(`Cambio en un mes cerrado (${desde.slice(0, 7)})`, 'aviso');
  saveState(); renderVistaActiva();
  toast(`${plazas} plaza(s) retiradas de ${que} · Ctrl+Z para deshacer`, 'warn');
}

// ---------- visible para el equipo (publicar meses) ----------
// El mes en curso y los pasados siempre se ven; uno futuro solo cuando el encargado lo
// hace visible (reunión del 15/09: «cuando te gusta la semana le das a visible y les
// llega a los trabajadores»). Los empleados reciben solo los meses visibles.
function mesPublicado(k) { return mesVisibleParaPersonal(S.mesesPublicados || [], k, isoHoy().slice(0, 7)); }
function mesSiemprePublico(k) { return k <= isoHoy().slice(0, 7); }
function alternarPublicado(claves) {
  const ks = [...new Set(claves)].filter(k => !mesSiemprePublico(k));
  if (!ks.length) { toast('Ese mes ya lo ve el equipo: el mes en curso y los pasados son siempre visibles', 'warn'); return; }
  S.mesesPublicados = Array.isArray(S.mesesPublicados) ? S.mesesPublicados : [];
  const hacerVisible = ks.some(k => !S.mesesPublicados.includes(k));
  for (const k of ks) { const i = S.mesesPublicados.indexOf(k); if (hacerVisible && i < 0) S.mesesPublicados.push(k); if (!hacerVisible && i >= 0) S.mesesPublicados.splice(i, 1); }
  S.mesesPublicados.sort();
  const nombre = ks.map(k => `${MESES[+k.slice(5, 7) - 1].toLowerCase()} ${k.slice(0, 4)}`).join(' y ');
  registrarCambio(hacerVisible ? `Planilla de ${nombre} visible para el equipo` : `Planilla de ${nombre} oculta al equipo`, 'pub');
  saveState(); renderVistaActiva();
  toast(hacerVisible ? `${nombre}: visible para el equipo` : `${nombre}: oculto al equipo`, hacerVisible ? 'ok' : 'warn');
}
function htmlBotonVisible(id, claves) {
  const ks = [...new Set(claves)];
  const fijo = ks.every(mesSiemprePublico);
  const visible = ks.every(mesPublicado);
  const cls = fijo ? 'vis fijo' : visible ? 'vis on' : 'vis off';
  const txt = fijo ? 'Visible para el equipo' : visible ? 'Visible para el equipo' : 'Oculto al equipo';
  const tit = fijo ? 'El mes en curso y los pasados siempre los ve el equipo' : visible ? 'El equipo ve esta planilla. Pulsa para ocultarla mientras la cambias' : 'El equipo aún no ve esta planilla. Pulsa cuando esté lista para que les llegue';
  return `<button class="btn btn-sec ${cls}" id="${id}" title="${esc(tit)}" aria-pressed="${visible ? 'true' : 'false'}"><i></i>${txt}${fijo ? '' : visible ? ' · ocultar' : ' · hacer visible'}</button>`;
}
