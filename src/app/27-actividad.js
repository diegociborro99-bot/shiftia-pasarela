// ================= ACTIVIDAD (visor del programador) =================
// Qué está haciendo el encargado con la app, como un historial: accesos,
// guardados de la planilla, altas y bajas de usuarios, peticiones… Fusiona en
// una sola línea de tiempo dos fuentes: el historial de la planilla (S.historial,
// con quién hizo cada cambio) y la auditoría del servidor (GET /api/auditoria,
// que solo lee el programador). Solo la ve el programador (body.rol-programador,
// que fija 30-modo-servidor.js); sin servidor es Diego probando y se enseña el
// historial de esta planilla con una nota.
const ACT_GRUPO = {
  accesos: ['var(--teal)', 'Accesos'], planilla: ['var(--accent)', 'Planilla'], usuarios: ['#7c5fb8', 'Usuarios'],
  peticiones: ['var(--warn)', 'Peticiones'], otros: ['var(--ink3)', 'Otros'],
};
// acción de la auditoría del servidor → [grupo, etiqueta, texto legible (recibe el
// detalle), color propio si no es el del grupo]. Lo que no esté aquí sale tal cual.
const ACT_ACCION = {
  'login': ['accesos', 'ACCESO', () => 'Inicio de sesión'],
  'login-fallido': ['accesos', 'FALLIDO', d => `Acceso fallido${d ? ' con el usuario «' + d + '»' : ''}`, 'var(--bad)'],
  'login-bloqueado': ['accesos', 'BLOQUEADO', d => `Acceso bloqueado por intentos repetidos${d ? ' («' + d + '»)' : ''}`, 'var(--bad)'],
  'logout-todos': ['accesos', 'SALIDA', () => 'Cerró la sesión en todos sus dispositivos'],
  'estado': ['planilla', 'GUARDADO', d => `Guardó la planilla${d ? ' (' + d + ')' : ''}`],
  'copia': ['planilla', 'COPIA', () => 'Descargó una copia de seguridad de la planilla'],
  'password': ['usuarios', 'CONTRASEÑA', () => 'Cambió su contraseña'],
  'usuario-alta': ['usuarios', 'ALTA', d => `Alta de usuario${d ? ' ' + d : ''}`],
  'usuario-reset': ['usuarios', 'RESET', d => `Restableció la contraseña de ${d || 'un usuario'}`],
  'usuario-baja': ['usuarios', 'BAJA', d => `Baja de usuario${d ? ' ' + d : ''}`],
  'admin-reset': ['usuarios', 'RESET', d => `Encargado restablecido desde el servidor${d ? ': ' + d : ''}`],
  'admin-promote': ['usuarios', 'ROL', d => `Cambio de rol desde el servidor${d ? ': ' + d : ''}`],
  'peticion': ['peticiones', 'PETICIÓN', d => `Envió una petición${d ? ' (' + d + ')' : ''}`],
  'peticion-retirada': ['peticiones', 'RETIRADA', () => 'Retiró una petición'],
  'cambio-aceptado': ['peticiones', 'ACEPTADO', () => 'Aceptó un cambio de turno'],
  'cambio-rechazado': ['peticiones', 'RECHAZADO', () => 'Rechazó un cambio de turno'],
  'nucleo-solve': ['otros', 'NÚCLEO', d => `Generó con el núcleo Shiftia${d ? ' (' + d + ')' : ''}`],
  'csrf-rechazado': ['otros', 'RECHAZADO', d => `Petición rechazada por origen no permitido${d ? ' (' + d + ')' : ''}`, 'var(--bad)'],
};
const ACT_MAX = 300;   // filas pintadas de una vez; «Mostrar más» añade otras tantas
// filas: auditoría del servidor (null si no hay); ts: cuándo se leyó; admins: usuarios
// con rol de encargado (para «último acceso del encargado»); el resto son los filtros
const ACT = { filas: null, total: 0, ts: 0, cargando: false, error: null, admins: null, usuario: '', grupo: '', q: '', limite: ACT_MAX };

function esProgramador() { return !SRV.on || SRV.rol === 'programador'; }
// color estable por usuario (no depende de la planilla: diego y admin no son personas)
function actColor(u) { let h = 0; for (const ch of String(u || '') + 'act') h = (h * 31 + ch.charCodeAt(0)) % 997; return `hsl(${(h * 137) % 360} 44% 44%)`; }
function actNorm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
function actHora(ts) { const d = new Date(ts); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }
// «hoy 10:32», «ayer 18:05», «12/9 18:05»
function actCuando(ts) {
  const d = new Date(ts), k = d.toDateString();
  const dia = k === new Date().toDateString() ? 'hoy' : k === new Date(Date.now() - 864e5).toDateString() ? 'ayer' : `${d.getDate()}/${d.getMonth() + 1}`;
  return `${dia} ${actHora(ts)}`;
}
// una fila de la auditoría del servidor → entrada de la línea de tiempo
function actDesdeAuditoria(f) {
  const def = ACT_ACCION[f.accion];
  const grupo = def ? def[0] : 'otros';
  const detalle = f.detalle ? String(f.detalle) : '';
  return {
    ts: +f.ts || 0, usuario: f.usuario || '', ip: f.ip || '', grupo, accion: String(f.accion || ''), fuente: 'servidor',
    col: (def && def[3]) || ACT_GRUPO[grupo][0],
    lbl: def ? def[1] : String(f.accion || '').toUpperCase(),
    txt: def ? def[2](detalle) : `${f.accion}${detalle ? ' · ' + detalle : ''}`,
  };
}
// una entrada del historial de la planilla → entrada de la línea de tiempo
function actDesdeHistorial(x) {
  const [col, lbl] = HIST_TIPO[x.tipo] || HIST_TIPO.cambio;
  return { ts: +x.ts || 0, usuario: x.usuario || '', ip: '', grupo: 'planilla', accion: 'hist-' + (x.tipo || 'cambio'), fuente: 'planilla', col, lbl, txt: x.txt || '' };
}
// las dos fuentes juntas, de lo más reciente a lo más antiguo
function actEntradas() {
  const lista = (S.historial || []).map(actDesdeHistorial).concat((ACT.filas || []).map(actDesdeAuditoria));
  lista.sort((a, b) => b.ts - a.ts);
  return lista;
}
function actFiltrar(entradas) {
  const qq = actNorm(ACT.q.trim());
  return entradas.filter(x => (!ACT.usuario || x.usuario === ACT.usuario) && (!ACT.grupo || x.grupo === ACT.grupo)
    && (!qq || actNorm(`${x.txt} ${x.lbl} ${x.usuario} ${x.ip}`).includes(qq)));
}
// tarjetas resumen: último acceso del encargado, último guardado, cambios de hoy y
// de la semana (del historial de la planilla) y accesos fallidos de la semana
function actResumen() {
  const admins = new Set(ACT.admins && ACT.admins.length ? ACT.admins : ['admin']);
  const aud = ACT.filas || [];
  const hoy0 = new Date(); hoy0.setHours(0, 0, 0, 0);
  const desde7 = Date.now() - 7 * 864e5;
  const hist = S.historial || [];
  return {
    ultimoAcceso: aud.find(f => f.accion === 'login' && admins.has(f.usuario)) || null,
    ultimoGuardado: aud.find(f => f.accion === 'estado') || null,
    hoy: hist.filter(x => x.ts >= hoy0.getTime()).length,
    semana: hist.filter(x => x.ts >= desde7).length,
    fallidos: aud.filter(f => (f.accion === 'login-fallido' || f.accion === 'login-bloqueado') && f.ts >= desde7).length,
  };
}
// la auditoría del servidor (500 últimas filas) y, la primera vez, quién es encargado.
// Se reutiliza durante 30 s salvo con «Actualizar»: renderActividad se llama en
// cada repintado (SSE, cambios propios) y no hay que pedirla cada vez.
async function actCargar(forzar) {
  if (!(SRV.on && SRV.rol === 'programador')) { ACT.filas = null; return; }
  if (ACT.cargando) return;
  if (!forzar && ACT.filas && Date.now() - ACT.ts < 30000) return;
  ACT.cargando = true; ACT.error = null;
  actPintaMeta();
  try {
    const [aud, us] = await Promise.all([api('GET', '/api/auditoria?n=500'), ACT.admins ? null : api('GET', '/api/usuarios')]);
    if (aud.ok && aud.datos && Array.isArray(aud.datos.filas)) { ACT.filas = aud.datos.filas; ACT.total = +aud.datos.total || aud.datos.filas.length; ACT.ts = Date.now(); }
    else ACT.error = (aud.datos && aud.datos.error) || `HTTP ${aud.status}`;
    if (us && us.ok && us.datos && Array.isArray(us.datos.usuarios)) ACT.admins = us.datos.usuarios.filter(u => u.rol === 'admin').map(u => u.usuario);
  } catch (e) { ACT.error = 'sin respuesta del servidor'; }
  ACT.cargando = false;
  if (document.querySelector('#actRoot .actwrap')) actPinta();
}
function actPintaMeta() {
  const m = document.getElementById('actMeta'); if (!m) return;
  if (!SRV.on) { m.innerHTML = '<span class="actnota">Sin servidor: solo el historial de esta planilla.</span>'; return; }
  if (ACT.cargando && !ACT.filas) { m.textContent = 'Leyendo la auditoría del servidor…'; return; }
  if (ACT.error && !ACT.filas) { m.innerHTML = `<span class="actnota">No se pudo leer la auditoría del servidor (${esc(ACT.error)}): solo el historial de esta planilla.</span>`; return; }
  if (!ACT.filas) { m.textContent = ''; return; }
  m.textContent = `Auditoría del servidor: ${ACT.filas.length} de ${ACT.total} registros · leída a las ${actHora(ACT.ts)}${ACT.cargando ? ' · actualizando…' : ACT.error ? ' · no se pudo actualizar (' + ACT.error + ')' : ''}`;
}
function actPinta() {
  const root = document.getElementById('actRoot'); if (!root || !root.querySelector('.actwrap')) return;
  const r = actResumen(), entradas = actEntradas();
  // aviso: el encargado no ha entrado nunca (solo con la auditoría leída)
  root.querySelector('#actAviso').innerHTML = SRV.on && ACT.filas && !r.ultimoAcceso
    ? '<div class="actaviso"><b>El encargado aún no ha entrado en la app.</b> Cuando entre, su acceso y todo lo que haga aparecerán aquí.</div>' : '';
  const kpi = (id, t, n, cap, cls) => `<div class="kpi${cls ? ' ' + cls : ''}" data-kpi="${id}"><div class="micro">${t}</div><div class="knum">${n}</div><div class="kcap">${cap}</div></div>`;
  const ua = r.ultimoAcceso, ug = r.ultimoGuardado;
  const vg = ug && ug.detalle ? (String(ug.detalle).match(/^v(\d+)/) || [])[1] : null;
  root.querySelector('#actKpis').innerHTML =
    kpi('acceso', 'Último acceso del encargado', ua ? esc(ua.usuario) : '—', ua ? esc(actCuando(ua.ts)) : SRV.on ? (ACT.filas ? 'aún no ha entrado' : 'sin datos') : 'sin servidor', ua ? '' : SRV.on && ACT.filas ? 'k-warn' : '') +
    kpi('guardado', 'Último guardado de la planilla', ug ? (vg ? 'v' + vg : 'sí') : '—', ug ? `${esc(ug.usuario || '?')} · ${esc(actCuando(ug.ts))}` : SRV.on ? 'todavía nadie' : 'sin servidor') +
    kpi('hoy', 'Cambios de hoy', r.hoy, 'en la planilla') +
    kpi('semana', 'Últimos 7 días', r.semana, 'cambios en la planilla') +
    kpi('fallidos', 'Accesos fallidos', SRV.on ? r.fallidos : '—', SRV.on ? 'últimos 7 días' : 'sin servidor', r.fallidos ? 'k-warn' : '');
  // chips: usuarios que aparecen (encargados primero) y tipos
  const usuarios = [...new Set(entradas.map(x => x.usuario).filter(Boolean))];
  const admins = new Set(ACT.admins && ACT.admins.length ? ACT.admins : ['admin']);
  usuarios.sort((a, b) => (admins.has(b) - admins.has(a)) || a.localeCompare(b));
  if (ACT.usuario && !usuarios.includes(ACT.usuario)) ACT.usuario = '';
  const chip = (attr, val, on, txt, col) => `<button type="button" class="actchip${on ? ' on' : ''}" data-${attr}="${esc(val)}">${col ? `<i class="actdot" style="--uc:${col}"></i>` : ''}${txt}</button>`;
  root.querySelector('#actChipsU').innerHTML = chip('actu', '', !ACT.usuario, 'Todos') + usuarios.map(u => chip('actu', u, ACT.usuario === u, esc(u) + (admins.has(u) ? ' <small>encargado</small>' : ''), actColor(u))).join('');
  root.querySelector('#actChipsT').innerHTML = chip('actg', '', !ACT.grupo, 'Todo') + Object.entries(ACT_GRUPO).map(([g, [col, txt]]) => chip('actg', g, ACT.grupo === g, txt, col)).join('');
  actPintaMeta();
  actPintaLista(entradas);
}
// la línea de tiempo, agrupada por día como el historial; como mucho ACT.limite filas
function actPintaLista(entradas) {
  const body = document.getElementById('actBody'); if (!body) return;
  const lista = actFiltrar(entradas || actEntradas());
  if (!lista.length) {
    const hayAlgo = (S.historial || []).length || (ACT.filas || []).length;
    body.innerHTML = `<div class="revok"><b style="font-family:var(--font-d);font-size:15px">${hayAlgo ? 'Nada coincide con el filtro' : 'Aún no hay actividad registrada'}</b><p style="font-size:11.5px;color:var(--ink3);margin-top:6px">${hayAlgo ? 'Prueba con otro usuario, otro tipo o menos texto.' : 'Cada acceso, guardado de la planilla, alta de usuario o cambio quedará aquí con su hora y quién lo hizo.'}</p></div>`;
    return;
  }
  const hoyK = new Date().toDateString(), ayerK = new Date(Date.now() - 864e5).toDateString();
  let h = '', diaAct = null;
  for (const x of lista.slice(0, ACT.limite)) {
    const d = new Date(x.ts), k = d.toDateString();
    if (k !== diaAct) {
      diaAct = k;
      h += `<div class="cobday"><b>${k === hoyK ? 'Hoy' : k === ayerK ? 'Ayer' : `${d.getDate()} de ${MESES[d.getMonth()].toLowerCase()} ${d.getFullYear()}`}</b></div>`;
    }
    const ini = x.usuario ? esc(x.usuario.slice(0, 2).toUpperCase()) : '?';
    h += `<div class="actrow" data-grupo="${x.grupo}" data-accion="${esc(x.accion)}" data-usuario="${esc(x.usuario)}" data-ts="${x.ts}">
      <span class="acth">${actHora(x.ts)}</span>
      <span class="actav" style="--uc:${x.usuario ? actColor(x.usuario) : 'var(--ink3)'}" title="${esc(x.usuario || 'sin usuario')}">${ini}</span>
      <span class="histtag" style="background:color-mix(in srgb,${x.col} 14%,transparent);color:${x.col}">${esc(x.lbl)}</span>
      <span class="actx">${x.usuario ? `<b class="actu">${esc(x.usuario)}</b> · ` : ''}${esc(x.txt)}${x.fuente === 'planilla' ? '<small>historial de la planilla</small>' : ''}</span>
      ${x.ip ? `<small class="actip">${esc(x.ip)}</small>` : ''}</div>`;
  }
  if (lista.length > ACT.limite) h += `<div class="actpie"><button type="button" class="btn-mini ghost" id="actMas">Mostrar más</button><span>${ACT.limite} de ${lista.length}</span></div>`;
  else if (lista.length > 40) h += `<p class="filltxt actpie">${lista.length} entradas.</p>`;
  body.innerHTML = h;
}
function renderActividad() {
  const root = document.getElementById('actRoot'); if (!root) return;
  if (!esProgramador()) { root.innerHTML = '<div class="revok"><b style="font-family:var(--font-d);font-size:15px">Esta pestaña es solo del programador.</b></div>'; return; }
  if (!root.querySelector('.actwrap')) {
    root.innerHTML = `<div class="actwrap">
      <div id="actAviso"></div>
      <div class="kpis" id="actKpis"></div>
      <div class="actfiltros">
        <div class="actchips" id="actChipsU" aria-label="Filtrar por usuario"></div>
        <div class="actchips" id="actChipsT" aria-label="Filtrar por tipo"></div>
        <div class="actbusca">
          <input type="text" id="actQ" placeholder="Filtra por texto, usuario o IP…" data-libre aria-label="Filtrar la actividad">
          <button type="button" class="btn-mini ghost" id="actRefresh">Actualizar</button>
        </div>
      </div>
      <div class="actmeta" id="actMeta"></div>
      <div id="actBody"></div>
    </div>`;
    root.querySelector('#actQ').value = ACT.q;
    root.addEventListener('input', e => { if (e.target.id === 'actQ') { ACT.q = e.target.value; ACT.limite = ACT_MAX; actPintaLista(); } });
    root.addEventListener('click', e => {
      const c = e.target.closest('[data-actu],[data-actg]');
      if (c) { if ('actu' in c.dataset) ACT.usuario = c.dataset.actu; else ACT.grupo = c.dataset.actg; ACT.limite = ACT_MAX; actPinta(); return; }
      if (e.target.closest('#actRefresh')) { actCargar(true); return; }
      if (e.target.closest('#actMas')) { ACT.limite += ACT_MAX; actPintaLista(); }
    });
  }
  actPinta();
  actCargar(false);
}
