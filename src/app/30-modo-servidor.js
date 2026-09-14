// ================= MODO SERVIDOR (BD + usuarios + sincronización) =================
// Copiado del piloto de urología (v2.49) con los cambios de Pasarela: roles
// programador/admin/empleado (SRV.esAdmin), claves de almacenamiento propias y
// una sola cuenta local de encargado cuando no hay servidor.
// La app detecta el backend al arrancar. Sin servidor (file://, artifact,
// demo) todo funciona igual que siempre en local. Si este origen YA tuvo
// servidor y ahora no responde, no se cae a modo local: se avisa y se reintenta.
const SRV = { on: false, version: 0, rol: null, esAdmin: false, pid: null, usuario: null, persistencia: null, baseTxt: null };
const PID_KEY = 'shiftia_pas_pid';
const SRV_KEY = 'shiftia_pas_srv';          // «este origen tiene servidor»
const PEND_KEY = 'shiftia_pas_pendiente';   // bandeja de salida: último estado del admin aún no confirmado por el servidor
let sesionCaducada = false, saliendo = false;
const NAV_NULL = { y: null, m: null, day: null, semLunes: null, guiaOff: null, hY: null, hM: null };
const sinNav = e => JSON.stringify(Object.assign({}, e, NAV_NULL));   // huella del estado sin la navegación local
function sesionPerdida() {
  if (sesionCaducada) return;
  sesionCaducada = true;
  toast('Tu sesión ha caducado: vuelve a entrar', 'bad');
  setTimeout(() => location.replace('/'), 1500);
}
async function api(metodo, ruta, cuerpo) {
  const r = await fetch(ruta, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  let datos = null;
  try { datos = await r.json(); } catch (e) {}
  // el servidor no deja hacer nada con la contraseña genérica: se pide aquí mismo
  if (r.status === 403 && datos && datos.cambiar && ruta !== '/api/password' && !document.getElementById('cambioPassOvl')) pedirCambioPass(null).then(() => location.reload());
  // sesión caducada o revocada a mitad de uso (30 días, cambio de contraseña en otro
  // dispositivo, reset del admin): a la pantalla de acceso, no un toast mudo
  if (r.status === 401 && SRV.on && ruta !== '/api/login' && ruta !== '/api/password') sesionPerdida();
  return { ok: r.ok, status: r.status, datos };
}
async function detectarServidor() {
  if (location.protocol === 'file:') return false;
  try {
    const r = await fetch('/api/salud', { cache: 'no-store' });
    if (r.status === 429) return true;   // servidor vivo pero ocupado (cupo por IP compartida)
    if (!r.ok) return false;
    const d = await r.json();
    if (!d.ok) return false;
    SRV.persistencia = d.persistencia;
    try { localStorage.setItem(SRV_KEY, '1'); } catch (e) {}
    return true;
  } catch (e) { return false; }
}
function recibirEstado(datos) {
  SRV.version = datos.version;
  if (datos.estado) { SRV.baseTxt = JSON.stringify(datos.estado); SRV.baseSinNav = sinNav(datos.estado); aplicarEstadoExterno(datos.estado); }
}
async function traerEstado() {
  const r = await api('GET', '/api/estado');
  if (!r.ok) return false;
  recibirEstado(r.datos);
  return true;
}
async function traerSiNuevo() {
  const r = await api('GET', '/api/estado');
  if (!(r.ok && r.datos.version > SRV.version)) return;
  // Entre la petición y la respuesta el administrador ha podido tocar la
  // planilla (una guardia, una baja): sustituir S ahora se lo comería EN
  // SILENCIO —su pantalla y el servidor quedaban de acuerdo, los dos sin el
  // dato—. Se manda lo suyo y decide el versionado (409 → fusión). Es la misma
  // guarda del evento en vivo, aplicada del lado correcto del await (06/09).
  if (SRV.esAdmin && hayCambioLocalPendiente()) {
    refrescoPendiente = Math.max(refrescoPendiente, r.datos.version);
    if (!empujando) empujarEstado();
    return;
  }
  recibirEstado(r.datos);
}
// ---------- empuje del estado del administrador ----------
// cambiosLocales/enviados: contador de ediciones locales frente a las que ya
// confirmó el servidor. Un PUT en vuelo no se duplica; si mientras tanto hubo
// más cambios, se reenvía UNA vez al terminar. Los eventos SSE que llegan con un
// PUT en vuelo se posponen (son casi siempre el eco del propio PUT).
let empujeTimer = null, empujando = false, cambiosLocales = 0, enviados = 0, refrescoPendiente = 0, reintentoTimer = null, reintentoMs = 2000, conflictosSeguidos = 0;
function empujarEstadoDebounced() {
  cambiosLocales++;
  clearTimeout(empujeTimer);
  empujeTimer = setTimeout(() => { empujeTimer = null; empujarEstado(); }, 600);
}
function hayCambioLocalPendiente() { return cambiosLocales > enviados || empujando; }
function borrarPendiente() { try { localStorage.removeItem(PEND_KEY); } catch (e) {} }
function cuerpoEstado() { const estadoTxt = JSON.stringify(S); return { estadoTxt, huella: sinNav(S), cuerpo: `{"baseVersion":${SRV.version},"usuario":${JSON.stringify(SRV.usuario || '')},"estado":${estadoTxt}}` }; }
function programarReintento() {
  clearTimeout(reintentoTimer);
  reintentoTimer = setTimeout(() => { reintentoTimer = null; empujarEstado(); }, reintentoMs);
  reintentoMs = Math.min(reintentoMs * 2, 60000);
}
async function empujarEstado() {
  if (!SRV.on || !SRV.esAdmin || empujando || saliendo || sesionCaducada) return;
  if (empujeTimer) { clearTimeout(empujeTimer); empujeTimer = null; }
  empujando = true;
  const marca = cambiosLocales;
  const { estadoTxt, huella, cuerpo } = cuerpoEstado();
  // solo cambió la navegación (día, mes, pestaña): nada que enviar ni versión que crear
  if (SRV.baseSinNav && huella === SRV.baseSinNav) { enviados = Math.max(enviados, marca); empujando = false; borrarPendiente(); return; }
  try { localStorage.setItem(PEND_KEY, cuerpo); } catch (e) {}
  let resultado = 'reintentar';
  try {
    const r = await fetch('/api/estado', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: cuerpo });
    let datos = null; try { datos = await r.json(); } catch (e) {}
    if (r.ok) {
      SRV.version = datos.version; SRV.baseTxt = estadoTxt; SRV.baseSinNav = huella; enviados = Math.max(enviados, marca);
      reintentoMs = 2000; conflictosSeguidos = 0;
      // ediciones hechas durante el envío: la bandeja refleja lo actual, no lo enviado
      if (cambiosLocales > marca) { try { localStorage.setItem(PEND_KEY, cuerpoEstado().cuerpo); } catch (e) {} } else borrarPendiente();
      // el servidor completó la planilla al crearla (notas de fábrica): se adopta tal como quedó
      if (datos.estado) recibirEstado(datos);
      resultado = 'ok';
    } else if (r.status === 409) resultado = await resolverConflicto(marca);
    else if (r.status === 401) { sesionPerdida(); resultado = 'sesion'; }
    else if (r.status === 403 && datos && datos.cambiar) resultado = 'sesion';
    else if (r.status === 413) { toast('La planilla es demasiado grande para el servidor: avisa a soporte', 'bad'); resultado = 'sesion'; }
    else { if (reintentoMs === 2000) toast(`El servidor no pudo guardar (${r.status}): se reintenta solo`, 'warn'); }
  } catch (e) {
    if (reintentoMs === 2000) toast('Sin conexión: el cambio queda guardado en este dispositivo y se enviará al recuperar la red', 'warn');
  }
  empujando = false;
  if (resultado === 'reintentar') programarReintento();
  else if (resultado === 'ahora') empujarEstado();                       // conflicto fundido: reenviar sobre la versión nueva
  else if (resultado === 'ok' && cambiosLocales > enviados) empujarEstado();   // hubo más ediciones durante el envío
  if (refrescoPendiente > SRV.version && !hayCambioLocalPendiente()) { refrescoPendiente = 0; traerSiNuevo(); }
  else if (refrescoPendiente <= SRV.version) refrescoPendiente = 0;
}
// 409: alguien escribió antes. Si solo fueron deltas de empleados (peticiones,
// avisos ocultados), se funden con la edición local y se reenvía; si fue otro
// administrador, manda el servidor y se avisa.
async function resolverConflicto(marca) {
  const srv = await api('GET', '/api/estado');
  if (!srv.ok || !srv.datos.estado) return 'reintentar';
  let base = null; try { base = SRV.baseTxt ? JSON.parse(SRV.baseTxt) : null; } catch (e) {}
  const fusion = (base && conflictosSeguidos < 3) ? fusionarEstado(base, srv.datos.estado, S) : { ok: false };
  if (fusion.ok) {
    conflictosSeguidos++;
    S.peticiones = fusion.estado.peticiones; S.avisos = fusion.estado.avisos;
    SRV.version = srv.datos.version; SRV.baseTxt = JSON.stringify(srv.datos.estado);
    if (typeof pintaPetDot === 'function') pintaPetDot();
    if (fusion.nuevasPeticiones) toast(`${fusion.nuevasPeticiones} petición(es) nueva(s) del equipo mientras editabas: fundidas con tu cambio`, 'ok');
    return 'ahora';
  }
  conflictosSeguidos = 0;
  const perdidas = cambiosLocales - marca + 1;
  // lo local se sustituye entero, pero NO se destruye: la bandeja pasa a una
  // clave de rescate por si el jefe quiere recuperar lo que hizo sin cobertura
  guardarDescartado();
  enviados = cambiosLocales; borrarPendiente();
  recibirEstado(srv.datos);
  toast(fusion.motivo === 'peticion-cerrada-por-empleado' ? 'El empleado retiró o rechazó esa petición mientras la resolvías: planilla actualizada desde el servidor' : `Otro dispositivo guardó antes: planilla actualizada desde el servidor (${perdidas > 1 ? 'tus últimas ' + perdidas + ' ediciones no se aplicaron' : 'tu último cambio no se aplicó'})`, 'warn');
  return 'servidor';
}
// ---------- SSE ----------
let esSSE = null, sseTimer = null;
function arrancarSSE() {
  try {
    if (esSSE) { try { esSSE.close(); } catch (e) {} }
    const es = esSSE = new EventSource('/api/eventos');
    ultimoSSE = Date.now();
    es.onopen = () => { ultimoSSE = Date.now(); };
    es.addEventListener('latido', () => { ultimoSSE = Date.now(); });
    es.addEventListener('version', ev => {
      ultimoSSE = Date.now();
      let v = 0;
      try { v = JSON.parse(ev.data).version; } catch (e) { return; }
      if (v <= SRV.version || sesionCaducada || saliendo) return;
      if (SRV.esAdmin && hayCambioLocalPendiente()) {
        // mi propio PUT en vuelo (eco) o ediciones sin enviar: el versionado decide al enviar
        refrescoPendiente = Math.max(refrescoPendiente, v);
        if (!empujando) empujarEstado();
        return;
      }
      traerSiNuevo();
    });
    // un 5xx del proxy cierra el EventSource para siempre: se vuelve a abrir solo
    es.onerror = () => {
      if (es.readyState !== EventSource.CLOSED) return;
      clearTimeout(sseTimer);
      sseTimer = setTimeout(arrancarSSE, 4000 + Math.random() * 4000);
    };
  } catch (e) {}
}
window.addEventListener('online', () => {
  if (!SRV.on || sesionCaducada) return;
  if (!esSSE || esSSE.readyState === EventSource.CLOSED) arrancarSSE();
  // con una bandeja de salida (ediciones hechas sin cobertura) va por la vía que
  // sabe PREGUNTAR cuando el servidor cambió mientras tanto: el PUT directo
  // resolvía «manda el servidor» y destruía el trabajo entero (06/09)
  let bandeja = false; try { bandeja = !!localStorage.getItem(PEND_KEY); } catch (e) {}
  if (SRV.esAdmin && bandeja) {
    reintentoMs = 2000;
    // la versión local está vieja (se estuvo sin red): se refresca ANTES para que
    // reenviarPendiente compare contra la de verdad y, si hace falta, pregunte
    (async () => {
      const r = await api('GET', '/api/estado').catch(() => null);
      if (r && r.ok && r.datos.version > SRV.version) SRV.version = r.datos.version;
      reenviarPendiente();
    })();
    return;
  }
  if (SRV.esAdmin && hayCambioLocalPendiente()) { reintentoMs = 2000; empujarEstado(); } else traerSiNuevo();
});
// copia de rescate de una bandeja que se va a descartar (se ofrece en Cuenta)
const DESC_KEY = 'shiftia_pas_descartado';
function guardarDescartado() {
  try { const p = localStorage.getItem(PEND_KEY); if (p) localStorage.setItem(DESC_KEY, JSON.stringify({ cuando: Date.now(), pend: JSON.parse(p) })); } catch (e) {}
}
// vigilante del canal en vivo: un proxy o una red móvil pueden dejar la conexión
// abierta pero muda (readyState sigue en OPEN, onerror no se dispara nunca) y la
// trabajadora se quedaba con la planilla vieja para siempre. El servidor manda un
// latido cada 25 s como evento; si pasan 70 s sin nada, se reabre y se refresca.
let ultimoSSE = Date.now();
setInterval(() => {
  if (!SRV.on || sesionCaducada || saliendo || !esSSE) return;
  // 40 s = un latido perdido (25 s) más margen: reabrir y refrescar cuesta un GET
  if (Date.now() - ultimoSSE > 40000) { ultimoSSE = Date.now(); arrancarSSE(); traerSiNuevo(); }
}, 10000);
// y al moverse por la app (cambiar de pestaña o de mes) se comprueba la versión,
// como mucho una vez cada 10 s: un GET pequeño que cubre el canal mudo
let ultimaComprobacion = 0;
function comprobarVersion() {
  if (!SRV.on || sesionCaducada || saliendo || Date.now() - ultimaComprobacion < 10000) return;
  if (SRV.esAdmin && hayCambioLocalPendiente()) return;
  ultimaComprobacion = Date.now(); traerSiNuevo();
}
document.addEventListener('click', e => { if (e.target.closest('[data-ptab],[data-bnavp],[data-bnav],.tab,#perfilPrev,#perfilNext,.mbtn')) comprobarVersion(); }, true);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && SRV.on && !sesionCaducada && !(SRV.esAdmin && hayCambioLocalPendiente())) traerSiNuevo();
});
// flush del último cambio al cerrar/ocultar la pestaña (el debounce de 600ms
// no da tiempo si el usuario cierra o el móvil suspende). keepalive solo vale
// hasta 64 KB en Chromium: por encima va un envío normal, y la bandeja de
// salida en localStorage cubre el cierre (se reenvía al volver a abrir).
function flushEmpuje() {
  if (!(SRV.on && SRV.esAdmin) || saliendo || sesionCaducada || cambiosLocales <= enviados) return;
  clearTimeout(empujeTimer); empujeTimer = null;
  const marca = cambiosLocales;
  const { estadoTxt, huella, cuerpo } = cuerpoEstado();
  if (SRV.baseSinNav && huella === SRV.baseSinNav) { enviados = Math.max(enviados, marca); borrarPendiente(); return; }
  try { localStorage.setItem(PEND_KEY, cuerpo); } catch (e) {}   // siempre lo actual, aunque haya un PUT en vuelo
  if (empujando) return;
  empujando = true;
  const opciones = { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: cuerpo };
  if (cuerpo.length < 60000) opciones.keepalive = true;
  fetch('/api/estado', opciones).then(r => { if (r.status === 401) sesionPerdida(); return r.ok ? r.json() : null; }).then(d => {
    if (d && d.version) { SRV.version = d.version; SRV.baseTxt = estadoTxt; SRV.baseSinNav = huella; enviados = Math.max(enviados, marca); if (cambiosLocales > marca) { try { localStorage.setItem(PEND_KEY, cuerpoEstado().cuerpo); } catch (e) {} } else borrarPendiente(); }
  }).catch(() => {}).finally(() => { empujando = false; if (cambiosLocales > enviados && !sesionCaducada) programarReintento(); });
}
window.addEventListener('pagehide', flushEmpuje);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushEmpuje(); });
// bandeja de salida: cambios del admin que no llegaron al servidor (sin red, pestaña cerrada)
async function reenviarPendiente() {
  let pend = null;
  try { pend = JSON.parse(localStorage.getItem(PEND_KEY) || 'null'); } catch (e) {}
  if (!pend || !pend.estado || !Array.isArray(pend.estado.staff)) { borrarPendiente(); return; }
  if (pend.usuario && pend.usuario !== SRV.usuario) { borrarPendiente(); return; }   // de otro usuario en este navegador: no es suyo
  const enviar = async () => {
    const r = await api('PUT', '/api/estado', { baseVersion: SRV.version, estado: pend.estado });
    if (r.ok) { borrarPendiente(); recibirEstado({ version: r.datos.version, estado: r.datos.estado || pend.estado }); toast('Enviados al servidor los cambios que quedaron pendientes en este dispositivo', 'ok'); }
    else toast(`No se pudieron enviar los ${pend.n || ''} cambios pendientes: siguen guardados en este dispositivo y se reintenta al volver la red`, 'bad');
  };
  if (pend.baseVersion === SRV.version) { enviar(); return; }
  // ¿llegó ya y se perdió la respuesta al cerrar la pestaña? La versión siguiente a la base es idéntica a lo pendiente
  const sig = await api('GET', '/api/estado/versiones?v=' + (pend.baseVersion + 1));
  if (sig.ok && sig.datos.estado && sinNav(sig.datos.estado) === sinNav(pend.estado)) { borrarPendiente(); return; }
  // otros escribieron después: si solo fueron deltas de empleados, se funde sobre la base original y se envía
  const base = await api('GET', '/api/estado/versiones?v=' + pend.baseVersion);
  const actual = await api('GET', '/api/estado');
  if (base.ok && base.datos.estado && actual.ok && actual.datos.estado) {
    const f = fusionarEstado(base.datos.estado, actual.datos.estado, pend.estado);
    if (f.ok) { SRV.version = actual.datos.version; pend.estado = f.estado; enviar(); return; }
  }
  // el servidor cambió desde entonces: decide el administrador
  const ov = document.createElement('div');
  ov.className = 'ovl'; ov.id = 'pendienteOvl';
  ov.innerHTML = `<div class="ovcard" style="max-width:460px;text-align:left">
    <span class="micro">CAMBIOS SIN ENVIAR</span>
    <h2 class="revh2" style="margin-top:8px">Este dispositivo tiene cambios que no llegaron al servidor</h2>
    <p class="revsub">Se hicieron sobre la versión ${pend.baseVersion} y el servidor ya va por la ${SRV.version} (alguien guardó después). Puedes enviarlos igualmente (pisan lo guardado después) o descartarlos y quedarte con lo que hay en el servidor.</p>
    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:14px">
      <button class="btn btn-ghost" data-no>Descartar</button>
      <button class="btn btn-cta" data-si>Enviar mis cambios</button>
    </div></div>`;
  document.body.appendChild(ov);
  ov.addEventListener('click', e => {
    if (e.target.closest('[data-si]')) { ov.remove(); enviar(); }
    else if (e.target.closest('[data-no]')) { ov.remove(); borrarPendiente(); toast('Cambios pendientes descartados', 'warn'); }
  });
}
function ofrecerMigracion() {
  const empezar = async () => {
    // «Empezar de cero»: el servidor arranca con el equipo de fábrica y nada de
    // lo que hubiera en este navegador (demo, pruebas) — y se guarda ya
    S = freshState(); migrarEstado(S);
    const d = sembrarDemo(S, isoHoy());   // el mes en curso y el siguiente, generados con la semana tipo: la app enseña algo desde el primer minuto
    cargarMes();
    if (d.meses.length) registrarCambio(`Primer arranque: ${d.meses.join(' y ')} generados con la semana tipo (${d.aplicados} plazas)${d.evento ? ' y partido de muestra el ' + fmtDM(d.evento) : ''}`, 'ia');
    const r = await api('PUT', '/api/estado', { baseVersion: SRV.version, estado: S });
    if (r.ok) { recibirEstado({ version: r.datos.version, estado: r.datos.estado || S }); toast(d.meses.length ? 'Planilla creada en el servidor: el mes en curso y el siguiente vienen generados con la semana tipo (se pueden vaciar desde el Generador)' : 'Planilla nueva creada en el servidor', 'ok'); }
    else toast(r.datos && r.datos.error || 'No se pudo crear la planilla', 'bad');
  };
  if (!(S.staff || []).length || !Object.keys(S.meses || {}).some(k => Object.keys((S.meses[k] || {}).asig || {}).length)) { empezar(); return; }
  const ov = document.createElement('div');
  ov.className = 'ovl'; ov.id = 'migraOvl';
  ov.innerHTML = `<div class="ovcard" style="max-width:430px;text-align:left">
    <span class="micro">PRIMERA CONEXIÓN AL SERVIDOR</span>
    <h2 class="revh2" style="margin-top:8px">El servidor está vacío</h2>
    <p class="revsub">Este dispositivo tiene una planilla local (${S.staff.length} personas, ${Object.keys(S.meses || {}).length} mes(es)). ¿Quieres subirla al servidor para que sea la planilla del grupo, o empezar de cero con el equipo de fábrica?</p>
    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:14px">
      <button class="btn btn-ghost" data-no>Empezar de cero</button>
      <button class="btn btn-cta" data-si>Subir mis datos</button>
    </div></div>`;
  document.body.appendChild(ov);
  ov.addEventListener('click', async e => {
    if (e.target.closest('[data-si]')) {
      const r = await api('PUT', '/api/estado', { baseVersion: SRV.version, estado: S });
      if (r.ok) { recibirEstado({ version: r.datos.version, estado: r.datos.estado || S }); toast('Planilla subida al servidor: ya la ven todos los dispositivos', 'ok'); }
      else toast(r.datos && r.datos.error || 'No se pudo subir', 'bad');
      ov.remove();
    } else if (e.target.closest('[data-no]')) { ov.remove(); empezar(); }
  });
}
// sin red y con servidor conocido: nunca se cae al modo local (ni a la
// planilla cacheada como si fuera editable); se espera al servidor
function mostrarSinConexion() {
  const sc = document.createElement('div');
  sc.className = 'lockscr'; sc.id = 'sinConexionOvl';
  sc.innerHTML = `<div class="logincard"><div class="loginh">Sh<em>iftia</em></div>
    <div class="loginsub">Sin conexión con el servidor del grupo</div>
    <p class="revsub" style="margin:14px 0 16px">La planilla vive en el servidor: para verla o editarla hace falta conexión. Se reintenta solo cada pocos segundos.</p>
    <button class="btn btn-cta loginbtn" id="reintentarSrv">Reintentar ahora</button></div>`;
  document.body.appendChild(sc);
  const probar = async () => { if (await detectarServidor()) location.reload(); };
  sc.querySelector('#reintentarSrv').addEventListener('click', probar);
  setInterval(probar, 8000);
  window.addEventListener('online', probar);
}

// ---------- pantalla de acceso (usuario único: admin) ----------
const HASH_DEFECTO = 'd39940c6f173a149e89f5aecac073c0d086ba3db808dcd118847749b609773c8';   // sha256('shiftia·pasarela2026'): contraseña inicial del modo local, se cambia desde Cuenta
const SES_KEY = 'shiftia_pas_sesion';
const ROL_KEY = 'shiftia_pas_rol';
function rolActual() { try { return sessionStorage.getItem(ROL_KEY) || localStorage.getItem(ROL_KEY) || 'admin'; } catch (e) { return 'admin'; } }
function hashActual() { return pinGuardado() || HASH_DEFECTO; }
function haySesion() {
  try { return sessionStorage.getItem(SES_KEY) === '1' || localStorage.getItem(SES_KEY) === '1'; } catch (e) { return false; }
}
function cerrarSesion(forzar) {
  if (!forzar && SRV.on && SRV.esAdmin && hayCambioLocalPendiente() && !confirm('Hay cambios que aún no han llegado al servidor. ¿Salir igualmente? (se perderían)')) return;
  saliendo = true; enviados = cambiosLocales; clearTimeout(empujeTimer); clearTimeout(reintentoTimer);   // ni flush ni reintentos al salir
  try { sessionStorage.removeItem(SES_KEY); localStorage.removeItem(SES_KEY); sessionStorage.removeItem(ROL_KEY); localStorage.removeItem(ROL_KEY); sessionStorage.removeItem(PID_KEY); } catch (e) {}
  if (SRV.on) {
    // nada de la planilla queda en este dispositivo al salir
    try { localStorage.removeItem(LS_KEY); localStorage.removeItem(LS_KEY + '_corrupto'); localStorage.removeItem(PEND_KEY); } catch (e) {}
    // el dispositivo deja de recibir notificaciones del usuario que se va
    fetch('/api/logout', { method: 'POST', credentials: 'same-origin', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: '{}' }).catch(() => {}).finally(() => location.reload());
    return;
  }
  location.reload();
}
// Con la genérica el servidor no deja hacer nada más: el cambio es obligatorio
// (sin «Ahora no»). Devuelve una promesa que se resuelve al guardarla.
function pedirCambioPass(actual) {
  return new Promise(resolve => {
    const ex = document.getElementById('cambioPassOvl'); if (ex) ex.remove();
    const ov = document.createElement('div');
    ov.className = 'ovl'; ov.id = 'cambioPassOvl';
    ov.innerHTML = `<div class="ovcard" style="max-width:410px;text-align:left">
      <span class="micro">TU CONTRASEÑA</span>
      <h2 class="revh2" style="margin-top:8px">Crea tu contraseña personal</h2>
      <p class="revsub">Estás entrando con una contraseña inicial de un solo uso. Elige la tuya (mínimo 8 caracteres) — solo la sabrás tú. Hasta entonces la app no muestra nada.</p>
      <form id="cambioForm" style="margin-top:8px">
        ${actual ? '' : '<label class="pinlbl">Contraseña actual (la inicial que te dieron)<input type="password" id="cnv0" class="logininp" autocomplete="current-password"></label>'}
        <label class="pinlbl">Nueva contraseña<input type="password" id="cnv1" class="logininp" autocomplete="new-password"></label>
        <label class="pinlbl">Repítela<input type="password" id="cnv2" class="logininp" autocomplete="new-password"></label>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:12px">
          <button type="button" class="btn btn-ghost" data-salir>Salir</button>
          <button type="submit" class="btn btn-cta">Guardar mi contraseña</button>
        </div>
      </form></div>`;
    document.body.appendChild(ov);
    ov.addEventListener('click', e => { if (e.target.closest('[data-salir]')) cerrarSesion(); });
    ov.querySelector('#cambioForm').addEventListener('submit', async e => {
      e.preventDefault();
      const n1 = ov.querySelector('#cnv1').value, n2 = ov.querySelector('#cnv2').value;
      const act = actual || (ov.querySelector('#cnv0') || {}).value || '';
      if (n1.length < 8) { toast('Mínimo 8 caracteres', 'warn'); return; }
      if (n1 !== n2) { toast('Las dos contraseñas no coinciden', 'bad'); return; }
      const r = await api('POST', '/api/password', { actual: act, nueva: n1 });
      if (r.ok) { ov.remove(); toast('Contraseña guardada — ya es solo tuya', 'ok'); resolve(true); }
      else toast((r.datos && r.datos.error) || 'No se pudo cambiar', 'bad');
    });
  });
}
async function entrarServidor(datos, passUsada) {
  SRV.on = true; SRV.rol = datos.rol; SRV.esAdmin = ['admin', 'programador'].includes(datos.rol); SRV.pid = datos.pid; SRV.usuario = datos.usuario;
  // con servidor nada de la planilla vive en localStorage (lo que dejó el arranque local se retira)
  try { localStorage.removeItem(LS_KEY); localStorage.removeItem(LS_KEY + '_corrupto'); } catch (e) {}
  if (datos.cambiar) await pedirCambioPass(passUsada || null);   // el servidor no deja cargar nada antes
  try {
    sessionStorage.setItem(SES_KEY, '1');
    sessionStorage.setItem(ROL_KEY, datos.rol);
    if (datos.pid) sessionStorage.setItem(PID_KEY, datos.pid); else sessionStorage.removeItem(PID_KEY);
  } catch (e) {}
  let r = null;
  for (let intento = 0; intento < 3 && !(r && r.ok); intento++) {
    if (intento) await new Promise(res => setTimeout(res, 700));
    try { r = await api('GET', '/api/estado'); } catch (e) { r = null; }
  }
  if (r && r.ok) {
    recibirEstado(r.datos);
    if (!r.datos.estado && SRV.esAdmin) {
      if (SRV.version === 0) setTimeout(ofrecerMigracion, 400);   // servidor recién creado
      else setTimeout(() => toast('La planilla del servidor no se puede leer: restaura una versión anterior desde Cuenta → Copia de seguridad', 'bad'), 400);   // fila ilegible: nunca pisarla con la de fábrica
    } else if (SRV.esAdmin) setTimeout(reenviarPendiente, 300);
  } else {
    toast('No se pudo cargar la planilla del servidor — recarga la página', 'bad');
  }
  arrancarSSE();
  const btnMiJornada = document.getElementById('topMiJornada');
  if (btnMiJornada) btnMiJornada.classList.toggle('hidden', !(SRV.esAdmin && SRV.pid));   // solo el admin que además es profesional (tiene persona asociada)
  if (!SRV.esAdmin) setTimeout(activarModoEmpleado, 0);
  if (SRV.esAdmin && SRV.persistencia === 'volatil') {
    setTimeout(() => toast('Servidor SIN volumen de datos: añade un Volume en Railway (DATA_DIR=/data) o la BD se pierde en cada redeploy', 'warn'), 1200);
  } else if (SRV.esAdmin && SRV.persistencia === 'sin-montar') {
    setTimeout(() => toast('DATA_DIR no parece un volumen montado: comprueba el Volume de Railway o la base de datos se perderá en el próximo redeploy', 'bad'), 1200);
  }
}
function mostrarLogin() {
  const sc = document.createElement('div');
  sc.className = 'lockscr';
  sc.innerHTML = `<div class="logincard">
    <div class="logincoop">
      <svg viewBox="0 0 32 32" width="46" height="46"><defs><linearGradient id="lgL" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#4ecdc4"/><stop offset="1" stop-color="#2980b9"/></linearGradient></defs><rect width="32" height="32" rx="7" fill="url(#lgL)"/><path d="M16 26c-6-1.5-10-6-9-12s7-9 13-7.5c-4.5-0.7-9 2.2-9.7 6.7s3 9 7.5 10.5" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M14.5 8c6 1.5 10 6 9 12s-7 9-13 7.5c4.5 0.7 9-2.2 9.7-6.7s-3-9-7.5-10.5" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
      <span class="coop" aria-hidden="true"></span>
      <span class="glogo big">${LOGO_PASARELA ? `<img width="46" height="46" alt="Grupo Pasarela" src="${LOGO_PASARELA}">` : '<span class="gword">Grupo <b>Pasarela</b></span>'}</span>
    </div>
    <div class="loginh">Sh<em>iftia</em></div>
    <div class="loginsub">Grupo Pasarela · El 33 · Zapatillera · Bar Mónaco · Pasarela</div>
    <form id="loginForm">
      <label class="loginlbl" for="loginUser">Usuario</label>
      <input class="logininp" id="loginUser" autocomplete="username" value="admin" spellcheck="false">
      <label class="loginlbl" for="loginPass">Contraseña</label>
      <input class="logininp" type="password" id="loginPass" autocomplete="current-password" autofocus>
      <label class="loginrec"><input type="checkbox" id="loginRec" checked> Mantener la sesión en este dispositivo</label>
      <button class="btn btn-cta loginbtn" type="submit">Entrar</button>
      <div class="loginerr" id="loginErr"></div>
    </form>
    <div class="loginfoot">© 2026 Shiftia<br><span class="hklab">coded by Highkey Labs</span></div>
  </div>`;
  document.body.appendChild(sc);
  sc.querySelector('#loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const u = sc.querySelector('#loginUser').value.trim().toLowerCase();
    const pass = sc.querySelector('#loginPass').value;
    const err = sc.querySelector('#loginErr');
    if (SRV.on) {
      err.textContent = '';
      const r = await api('POST', '/api/login', { usuario: u, password: pass, recordar: sc.querySelector('#loginRec').checked });
      if (!r.ok) { err.textContent = (r.datos && r.datos.error) || 'No se pudo entrar'; sc.querySelector('#loginPass').value = ''; return; }
      sc.style.transition = 'opacity .3s'; sc.style.opacity = '0';
      setTimeout(() => sc.remove(), 320);
      entrarServidor(r.datos, pass);
      return;
    }
    // modo local (sin servidor): una sola cuenta de encargado protegida por contraseña en este dispositivo
    if (u !== 'admin') { err.textContent = 'En este dispositivo solo existe el usuario «admin»'; return; }
    if (await sha256(pass) !== hashActual()) {
      err.textContent = 'Contraseña incorrecta';
      sc.querySelector('#loginPass').value = ''; sc.querySelector('#loginPass').focus();
      return;
    }
    try {
      sessionStorage.setItem(SES_KEY, '1'); sessionStorage.setItem(ROL_KEY, 'admin');
      if (sc.querySelector('#loginRec').checked) { localStorage.setItem(SES_KEY, '1'); localStorage.setItem(ROL_KEY, 'admin'); }
    } catch (e2) {}
    sc.style.transition = 'opacity .3s'; sc.style.opacity = '0';
    setTimeout(() => sc.remove(), 320);
  });
}
(async function arranqueSesion() {
  SRV.on = await detectarServidor();
  let conocido = false; try { conocido = localStorage.getItem(SRV_KEY) === '1'; } catch (e) {}
  if (!SRV.on && conocido) { mostrarSinConexion(); return; }
  if (SRV.on) {
    const yo = await api('GET', '/api/yo');
    if (yo.ok) { entrarServidor(yo.datos); return; }
    try { sessionStorage.removeItem(SES_KEY); } catch (e) {}
    if (yo.status === 401) { location.replace('/'); return; }   // el servidor sirve la pantalla de acceso
    mostrarLogin();
    return;
  }
  if (haySesion()) { if (rolActual() === 'empleado') setTimeout(activarModoEmpleado, 0); return; }
  mostrarLogin();
})();
