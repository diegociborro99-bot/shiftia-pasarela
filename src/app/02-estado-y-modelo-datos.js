// ================= ESTADO =================
// S = estado persistente completo (la planilla). Mismo patrón que el piloto: en
// modo local vive en localStorage; con servidor, la verdad vive allí.
//   S.locales   configuración de cada local (mínimos, cocina, horarios, quién abre)
//   S.staff     personas con todas sus condiciones
//   S.patron    semana tipo (plazas por día de la semana)
//   S.meses     { 'YYYY-MM': { asig, apertura, manual } }
//   S.eventos   partidos y eventos con refuerzo; S.extras horas extra; S.cierres meses cerrados
//               para la nómina (no confundir con S.cierresPuntuales)
//   S.cierresPuntuales  un local cerrado unos días (reforma, vacaciones del local), con lo que
//               hace cada persona esos días (24/09, D11; ver modelo.js «cierres puntuales»)
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
  // 24/09 (D11): los cierres de un local por fechas; las planillas de antes no traen ninguno
  if (!Array.isArray(estado.cierresPuntuales)) estado.cierresPuntuales = [];
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
  // 17/09: las 150 entrevistas que estaban en papel. A quien ya tenía la app en marcha no
  // le llegaban, porque la semilla de arriba solo siembra la lista vacía: se funden aquí,
  // una sola vez y sin pisar nada de lo que el grupo haya escrito ya en la app.
  if ((estado.semillaEnt || 0) < SEMILLA_ENT_V) {
    fundirSemillaEntrevistas(estado, ENTREVISTAS_SEMILLA);
    estado.semillaEnt = SEMILLA_ENT_V;
  }
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
function cerrarTransitorios(salvar) {
  const vivos = salvar || [];
  document.querySelectorAll('.ovl').forEach(o => { if (!OVL_PERSISTENTES.includes(o.id) && !vivos.includes(o.id)) o.remove(); });
  cerrarPops();
}
// 18/09 (Diego): «cuando un usuario hace cualquier cambio en la planilla, al guardar, a otro
// usuario que tiene una ventana abierta —por ejemplo el perfil de un empleado— se la cierra
// forzosamente». Cerrarlo TODO al recibir un estado nuevo era pasarse: lo único que puede
// quedar desfasado es el panel cuyo registro ha cambiado. Cada panel dice qué mira
// (data-vigila) y cómo repintarse; si su registro llega igual, se vuelve a pintar contra el
// estado nuevo —no vale dejar el DOM viejo, que escribiría en objetos ya huérfanos— y el
// usuario ni se entera.
const VIGILADO = {
  staff: (e, id) => (e.staff || []).find(p => p.id === id),
  cand: (e, id) => (e.entrevistas || []).find(c => String(c.id) === String(id)),
  local: (e, id) => (e.locales || []).find(l => l.id === id),
};
function registroVigilado(estado, clave) {
  const i = String(clave || '').indexOf(':');
  if (i < 0 || !estado) return undefined;
  const f = VIGILADO[clave.slice(0, i)];
  return f ? JSON.stringify(f(estado, clave.slice(i + 1)) || null) : undefined;
}
function panelesVigilados(nuevo) {
  const out = [];
  for (const o of document.querySelectorAll('.ovl')) {
    if (OVL_PERSISTENTES.includes(o.id) || !o.dataset.vigila || !o._reabrir) continue;
    const antes = registroVigilado(S, o.dataset.vigila);
    if (antes === undefined) continue;
    const caja = o.querySelector('.ovcard');
    out.push({ id: o.id, fn: o._reabrir, top: caja ? caja.scrollTop : 0, igual: antes === registroVigilado(nuevo, o.dataset.vigila) });
  }
  return out;
}
const mesesConContenido = m => Object.fromEntries(Object.entries(m || {}).filter(([, v]) => v && (Object.keys(v.apertura || {}).length || Object.keys(v.asig || {}).length)));
const huellaPlanilla = e => JSON.stringify([mesesConContenido(e.meses), e.staff || [], e.locales || [], e.patron || {}, e.eventos || [], e.extras || [], e.festivos || [], e.cierres || {}, e.cierresPuntuales || []]);
function aplicarEstadoExterno(nuevo) {
  const suave = !!S && huellaPlanilla(nuevo) === huellaPlanilla(S);
  // los paneles que miran un registro concreto se juzgan por ese registro, cambie o no la
  // planilla: si sigue igual se repintan contra el estado nuevo, y si lo han tocado se
  // cierran aunque el resto no se mueva (una entrevista no entra en la huella de la planilla)
  const vigilados = panelesVigilados(nuevo);
  const siguen = vigilados.filter(x => x.igual), caen = vigilados.filter(x => !x.igual);
  const habiaOvl = !!caen.length || (!suave && !siguen.length && !!document.querySelector('.ovl:not(#cambioPassOvl), .pop'));
  for (const x of caen) { const o = document.getElementById(x.id); if (o) o.remove(); }
  if (!suave) { cerrarTransitorios(siguen.map(x => x.id)); undoStack.length = 0; actualizarUndoBtn(); }
  const nav = { y: S.y, m: S.m, day: S.day, semLunes: S.semLunes, guiaOff: S.guiaOff, hY: S.hY, hM: S.hM };
  S = Object.assign(freshState(), nuevo);
  for (const k of Object.keys(nav)) if (nav[k] !== undefined) S[k] = nav[k];
  migrarEstado(S);
  if (S.day > diasDelMes(S.y, S.m)) S.day = 1;
  cargarMes();
  if (document.body.classList.contains('modo-empleado')) { if (typeof activarModoEmpleado === 'function') activarModoEmpleado(); }
  else { renderVistaActiva(); if (habiaOvl) toast('Otro dispositivo guardó cambios: el panel abierto se ha cerrado para evitar pisarlos', 'warn'); }
  // los paneles que sobreviven se repintan contra el estado nuevo, conservando el scroll
  for (const x of siguen) { try { x.fn(); const c = document.querySelector('#' + x.id + ' .ovcard'); if (c) c.scrollTop = x.top; } catch (e) {} }
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
    // 24/09 (D11): cerrar un local por fechas toca los cierres, las fichas (vacaciones) y varios meses
    if (extra && extra.cierres) u.cierresPuntuales = JSON.parse(JSON.stringify(S.cierresPuntuales || []));
    if (extra && extra.locales) u.locales = JSON.parse(JSON.stringify(S.locales));
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
  // «Guardar como semana tipo» apila la semana tipo de antes y promete «Ctrl+Z lo deshace», pero
  // aquí no se devolvía (24/09, revisión)
  if (u.patron) S.patron = u.patron;
  if (u.cierresPuntuales) S.cierresPuntuales = u.cierresPuntuales;
  if (u.locales) S.locales = u.locales;
  registrarCambio('Deshecho: ' + u.label, 'undo');
  saveState(); renderVistaActiva();
  repintarPaneles();
  toast('Deshecho: ' + u.label, 'ok');
}
// Los paneles abiertos que saben volver a pintarse (la ficha, el día libre de la semana del
// Generador) se repintan contra el estado deshecho, conservando el scroll. Sin esto la ficha
// abierta seguía con la persona de antes de Ctrl+Z: enseñaba el cambio deshecho y lo que se tocaba
// después se perdía sin avisar (24/09, revisión; reunión: «Vamos a darle para atrás, CTRL+Z»).
// Deshacer no toca las entrevistas: sus paneles se dejan como están.
function repintarPaneles() {
  for (const o of [...document.querySelectorAll('.ovl')]) {
    if (OVL_PERSISTENTES.includes(o.id) || !o._reabrir || (o.dataset.vigila && !o.dataset.vigila.startsWith('staff:'))) continue;
    const caja = o.querySelector('.ovcard'), top = caja ? caja.scrollTop : 0;
    try { o._reabrir(); const c = document.querySelector('#' + o.id + ' .ovcard'); if (c) c.scrollTop = top; } catch (e) {}
    if (o.isConnected) o.remove();   // no se pudo volver a abrir (la persona ya no está): no se deja un panel viejo
  }
}
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !/input|textarea|select/i.test((e.target.tagName || ''))) { e.preventDefault(); deshacer(); }
});

// ---------- ayudas de dominio para las vistas ----------
const personaDeId = pid => S.staff.find(p => p.id === pid) || null;
const nombrePid = pid => (personaDeId(pid) || { nombre: pid }).nombre;
// quien no está de baja EL DÍA QUE SE MIRA (24/09, S6): hasta entonces se miraba siempre hoy,
// y quien estaba de baja hoy desaparecía de los descansos y de la Cobertura de otras semanas
const activos = iso => S.staff.filter(p => !deBaja(p, iso));
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
