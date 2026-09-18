// ================= CUENTA, CONTRASEÑA, USUARIOS Y COPIA =================
// Sin servidor: una contraseña protege este dispositivo (PIN local). Con servidor:
// cada usuario tiene su cuenta (programador, admin o empleado) y desde aquí el
// admin crea accesos, resetea contraseñas y baja o restaura copias.
const PIN_KEY = 'shiftia_pas_pin';
async function sha256(txt) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('shiftia·' + txt));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function pinGuardado() { try { return localStorage.getItem(PIN_KEY); } catch (e) { return null; } }

async function descargarCopia() {
  let contenido = null, nombre = `shiftia-pasarela-copia-${isoHoy()}.json`;
  if (SRV.on && SRV.esAdmin) {
    const r = await api('GET', '/api/copia');
    if (!r.ok) { toast('No se pudo generar la copia en el servidor', 'bad'); return; }
    contenido = r.datos; nombre = `shiftia-pasarela-copia-completa-${isoHoy()}.json`;
  } else contenido = S;
  const blob = new Blob([JSON.stringify(contenido, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  registrarCambio('Copia de seguridad descargada', 'cambio');
  saveState();
  toast(SRV.on ? 'Copia completa descargada (planilla y usuarios) — guárdala en lugar seguro' : 'Copia descargada — guárdala en lugar seguro', 'ok');
}
function restaurarCopia(fichero) {
  const fr = new FileReader();
  fr.onload = () => {
    try {
      let j = JSON.parse(fr.result);
      if (j && j.formato === 'shiftia-copia-completa' && j.estado) j = j.estado;
      if (!j || !Array.isArray(j.staff) || typeof j.meses !== 'object') throw new Error('formato');
      aplicarEstadoExterno(j);
      registrarCambio(`Copia de seguridad restaurada (${j.staff.length} personas, ${Object.keys(j.meses || {}).length} meses)`, 'cambio');
      saveState();
      toast('Copia restaurada en toda la aplicación', 'ok');
      const ov = document.getElementById('ctaOvl'); if (ov) ov.remove();
    } catch (e) { toast('Ese fichero no es una copia de Shiftia válida', 'bad'); }
  };
  fr.readAsText(fichero);
}
const bloqueCopia = () => `
    <div class="revgrp"><span class="dot" style="background:var(--teal)"></span>COPIA DE SEGURIDAD</div>
    <p class="revsub">Descarga toda la planilla (locales, personas, semana tipo, meses, eventos y horas extra) en un fichero y restáurala cuando haga falta.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">
      <button type="button" class="btn btn-sec" id="copiaBajar">Descargar copia</button>
      <button type="button" class="btn btn-ghost" id="copiaSubir">Restaurar copia…</button>
      <input type="file" id="copiaFile" accept=".json,application/json" hidden>
    </div>
    ${SRV.on && SRV.esAdmin ? '<div id="versionesSrv" style="margin-top:10px"><div class="festvacio">Cargando versiones anteriores…</div></div>' : ''}`;
const enlazaCopia = ov => {
  ov.querySelector('#copiaBajar').addEventListener('click', descargarCopia);
  const vs = ov.querySelector('#versionesSrv');
  if (vs) api('GET', '/api/estado/versiones').then(r => {
    if (!r.ok) { vs.innerHTML = ''; return; }
    const lista = (r.datos.versiones || []).filter(v => v.version !== SRV.version).slice(0, 8);
    if (!lista.length) { vs.innerHTML = '<p class="revsub">Aún no hay versiones anteriores en el servidor.</p>'; return; }
    const f = t => { const d = new Date(t); return `${d.getDate()}/${d.getMonth() + 1} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
    vs.innerHTML = `<p class="revsub" style="margin-bottom:6px">El servidor guarda las últimas ${r.datos.versiones.length} versiones de la planilla. Restaurar una crea una versión nueva (no se pierde nada).</p>` +
      lista.map(v => `<div class="festrow f-manual" style="border-left-color:var(--border)"><span class="festinfo"><b>Versión ${v.version}</b><small>${f(v.actualizado)}${v.usuario ? ' · ' + esc(v.usuario) : ''} · ${Math.round(v.bytes / 1024)} KB</small></span><button class="btn btn-ghost" data-restaurav="${v.version}">Restaurar</button></div>`).join('');
    vs.querySelectorAll('[data-restaurav]').forEach(b => b.addEventListener('click', async () => {
      if (!confirm(`Restaurar la versión ${b.dataset.restaurav} SUSTITUYE la planilla actual en todos los dispositivos. ¿Continuar?`)) return;
      const rv = await api('GET', '/api/estado/versiones?v=' + b.dataset.restaurav);
      if (!rv.ok || !rv.datos.estado) { toast('Esa versión ya no está disponible', 'bad'); return; }
      aplicarEstadoExterno(rv.datos.estado);
      registrarCambio(`Restaurada la versión ${b.dataset.restaurav} del servidor`, 'cambio');
      saveState(); ov.remove();
      toast(`Versión ${b.dataset.restaurav} restaurada`, 'ok');
    }));
  });
  const fi = ov.querySelector('#copiaFile');
  ov.querySelector('#copiaSubir').addEventListener('click', () => fi.click());
  fi.addEventListener('change', () => {
    if (!fi.files[0]) return;
    if (!confirm('Restaurar la copia SUSTITUYE la planilla actual en todos los dispositivos conectados. ¿Continuar?')) { fi.value = ''; return; }
    restaurarCopia(fi.files[0]);
  });
};
const ROL_LBL = { programador: 'programador', admin: 'administrador', empleado: 'empleado' };
// Al bajar a alguien a empleado hace falta su ficha de la planilla: sin ella entraría y no
// vería nada suyo. Devuelve el pid elegido, o null si se cierra sin elegir (José, 17/09).
function pedirPersonaUsuario(usuario) {
  return new Promise(resuelve => {
    const gente = (S.staff || []).slice().sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    const ov = abrirOverlay('usrPidOvl', `
      <span class="micro">PERMISOS</span>
      <h2 class="revh2">¿Quién es «${esc(usuario)}»?</h2>
      <p class="revsub">Deja de llevar el grupo y pasa a ver solo lo suyo, así que necesita su ficha de la planilla.</p>
      <label class="pinlbl">Persona<select class="logininp" id="usrPidSel">${gente.map(p => `<option value="${esc(p.id)}">${esc(p.nombre)}</option>`).join('')}</select></label>
      <div class="candpie"><span class="candsp"></span>
        <button type="button" class="btn btn-sec" data-ovx>Cancelar</button>
        <button type="button" class="btn btn-cta" id="usrPidOk">Continuar</button></div>`, { ancho: 430 });
    let listo = false;
    const acaba = v => { if (listo) return; listo = true; resuelve(v); };
    ov.querySelector('#usrPidOk').addEventListener('click', () => { const v = ov.querySelector('#usrPidSel').value || null; ov.remove(); acaba(v); });
    // cerrar de cualquier otra forma (✕, fondo, Escape) cuenta como cancelar
    const obs = new MutationObserver(() => { if (!ov.isConnected) { obs.disconnect(); acaba(null); } });
    obs.observe(document.body, { childList: true });
  });
}

async function openCuenta() {
  const ex = document.getElementById('ctaOvl'); if (ex) ex.remove();
  const ov = document.createElement('div');
  ov.className = 'ovl'; ov.id = 'ctaOvl';
  const esAdmin = !SRV.on || SRV.esAdmin;
  const esProg = SRV.on && SRV.rol === 'programador';
  const persona = SRV.pid ? S.staff.find(x => x.id === SRV.pid) : null;
  const titulo = SRV.on ? (SRV.rol === 'programador' ? 'Programador' : SRV.rol === 'admin' ? 'Administrador' : (persona || {}).nombre || SRV.usuario) : 'Administrador';
  ov.innerHTML = `<div class="ovcard big" style="max-width:540px">
    <button class="ovx" data-ovx aria-label="Cerrar">✕</button>
    <span class="micro">CUENTA${SRV.on ? ' · SERVIDOR' : ' · ESTE DISPOSITIVO'}</span>
    <div class="vercaja">
      <span class="verl">Versión instalada</span>
      <b class="verv" id="verAhora">${typeof APP_BUILD !== 'undefined' ? esc(APP_BUILD) : 'desconocida'}</b>
      <button class="btn-mini ghost" id="verBuscar">Buscar actualización</button>
      <span class="verestado" id="verEstado"></span>
    </div>
    ${(() => {
      if (!(SRV.on && SRV.esAdmin)) return '';
      let d = null; try { d = JSON.parse(localStorage.getItem(DESC_KEY) || 'null'); } catch (e) {}
      if (!d || !d.pend || !d.pend.estado) return '';
      const f = new Date(d.cuando || 0);
      return `<div class="vercaja" id="rescateCaja" style="border-color:var(--warn)">
        <span class="verl">Cambios descartados</span>
        <b class="verv">del ${f.getDate()}/${f.getMonth() + 1} a las ${String(f.getHours()).padStart(2, '0')}:${String(f.getMinutes()).padStart(2, '0')}</b>
        <button class="btn-mini" id="rescateEnviar" title="Vuelven a la bandeja de salida y se envían; si el servidor cambió, se te pregunta">Recuperarlos y enviarlos</button>
        <button class="btn-mini ghost" id="rescateOlvidar">Olvidarlos</button>
      </div>`;
    })()}
    <div class="fichead" style="margin-top:8px"><span class="fichav" style="background:var(--grad)">${esc(initials(titulo))}</span>
      <span><h2>${esc(titulo)}</h2><span class="sub">${SRV.on ? `usuario <b>${esc(SRV.usuario || 'admin')}</b> · ${ROL_LBL[SRV.rol] || SRV.rol} · conectado al servidor` : 'Grupo Pasarela · planilla guardada en este dispositivo'}</span></span></div>
    <div class="revgrp"><span class="dot" style="background:var(--accent)"></span>SEGURIDAD</div>
    <form id="pinForm">
      <label class="pinlbl">Contraseña actual<input type="password" id="pinOld" class="logininp" autocomplete="current-password"></label>
      <label class="pinlbl">Nueva contraseña (mínimo ${SRV.on ? 8 : 4} caracteres)<input type="password" id="pinN1" class="logininp" autocomplete="new-password"></label>
      <label class="pinlbl">Repítela<input type="password" id="pinN2" class="logininp" autocomplete="new-password"></label>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:12px;flex-wrap:wrap">
        <button type="button" class="btn btn-ghost" id="pinSalir">Cerrar sesión</button>
        ${SRV.on ? '<button type="button" class="btn btn-ghost" id="pinSalirTodos" title="Cierra la sesión en todos tus dispositivos">Salir de todos los dispositivos</button>' : ''}
        <button type="submit" class="btn btn-cta">Cambiar contraseña</button>
      </div>
    </form>
    ${esAdmin ? bloqueCopia() : ''}
    ${SRV.on && SRV.esAdmin ? `
    <div class="revgrp"><span class="dot" style="background:#7c5fb8"></span>USUARIOS</div>
    <p class="revsub">El <b>administrador</b> (el encargado del grupo) edita la planilla y las condiciones; el <b>empleado</b> solo ve sus turnos y sus horas${esProg ? '; el <b>programador</b> además ve la auditoría del servidor' : ''}.</p>
    <div id="usuariosLista" style="margin:8px 0"><div class="festvacio">Cargando…</div></div>
    <div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap">
      <label class="pinlbl" style="flex:1;min-width:120px;margin:0">Rol<select id="usrRol" class="logininp" style="padding:9px 11px"><option value="empleado">empleado</option><option value="admin">administrador</option>${esProg ? '<option value="programador">programador</option>' : ''}</select></label>
      <label class="pinlbl" style="flex:1;min-width:150px;margin:0">Persona<select id="usrPid" class="logininp" style="padding:9px 11px"></select></label>
      <label class="pinlbl" style="flex:1;min-width:120px;margin:0">Usuario<input type="text" id="usrNombre" class="logininp" spellcheck="false"></label>
      <button type="button" class="btn btn-cta" id="usrCrear">Crear</button>
    </div>
    <div id="usrClave" class="hidden" style="margin-top:10px;background:var(--warn-bg);border:1px solid var(--warn);border-radius:10px;padding:10px 12px;font-size:12px"></div>` : ''}
    ${SRV.on ? '' : `<p class="revsub" style="margin-top:12px">Sin servidor: la contraseña protege <b>este dispositivo</b>. Con la app desplegada en el servidor, el encargado y cada persona del grupo tienen su usuario real.</p>`}
  </div>`;
  document.body.appendChild(ov);
  const rEnv = ov.querySelector('#rescateEnviar'), rOlv = ov.querySelector('#rescateOlvidar');
  if (rEnv) rEnv.addEventListener('click', () => {
    try {
      const d = JSON.parse(localStorage.getItem(DESC_KEY) || 'null');
      if (d && d.pend) { localStorage.setItem(PEND_KEY, JSON.stringify(d.pend)); localStorage.removeItem(DESC_KEY); }
    } catch (e) {}
    ov.remove(); toast('Cambios recuperados: se envían ahora', 'ok'); reenviarPendiente();
  });
  if (rOlv) rOlv.addEventListener('click', () => { try { localStorage.removeItem(DESC_KEY); } catch (e) {} ov.querySelector('#rescateCaja').remove(); toast('Cambios descartados olvidados', 'warn'); });
  ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('[data-ovx]')) ov.remove(); });
  ov.querySelector('#pinSalir').addEventListener('click', () => cerrarSesion());
  const st = ov.querySelector('#pinSalirTodos');
  if (st) st.addEventListener('click', async () => {
    if (SRV.esAdmin && hayCambioLocalPendiente()) {
      if (!confirm('Hay cambios sin enviar: se envían ahora y después se cierra la sesión en TODOS tus dispositivos. ¿Continuar?')) return;
      await empujarEstado();
      if (hayCambioLocalPendiente()) { toast('No se pudieron enviar los cambios: la sesión sigue abierta', 'bad'); return; }
    } else if (!confirm('Se cerrará la sesión en TODOS tus dispositivos y tendrás que volver a entrar en cada uno. ¿Continuar?')) return;
    await api('POST', '/api/logout', { todos: true }).catch(() => {});
    cerrarSesion(true);
  });
  if (esAdmin) enlazaCopia(ov);
  ov.querySelector('#pinForm').addEventListener('submit', async e => {
    e.preventDefault();
    const n1 = ov.querySelector('#pinN1').value, n2 = ov.querySelector('#pinN2').value;
    if (n1 !== n2) { toast('Las dos contraseñas no coinciden', 'bad'); return; }
    if (SRV.on) {
      if (n1.length < 8) { toast('Mínimo 8 caracteres', 'warn'); return; }
      const r = await api('POST', '/api/password', { actual: ov.querySelector('#pinOld').value, nueva: n1 });
      if (r.ok) { ov.remove(); toast('Contraseña cambiada en el servidor', 'ok'); }
      else toast((r.datos && r.datos.error) || 'No se pudo cambiar', 'bad');
      return;
    }
    if (await sha256(ov.querySelector('#pinOld').value) !== hashActual()) { toast('La contraseña actual no es correcta', 'bad'); return; }
    if (n1.length < 4) { toast('Mínimo 4 caracteres', 'warn'); return; }
    try { localStorage.setItem(PIN_KEY, await sha256(n1)); } catch (e2) {}
    ov.remove(); toast('Contraseña cambiada: vale desde el próximo inicio de sesión', 'ok');
  });
  ov.querySelector('#verBuscar').addEventListener('click', async () => {
    const est2 = ov.querySelector('#verEstado');
    est2.textContent = 'comprobando…'; est2.className = 'verestado';
    if (!SRV.on) { est2.textContent = 'sin servidor: la versión es la del fichero abierto'; return; }
    try {
      const r = await api('GET', '/api/version');
      if (!r.ok) { est2.textContent = 'no he podido preguntar al servidor'; est2.className = 'verestado mal'; return; }
      if (r.datos.build === APP_BUILD) { est2.textContent = '✓ estás en la última versión'; est2.className = 'verestado bien'; }
      else {
        est2.innerHTML = `hay una nueva (${esc(r.datos.app)}) — <b style="text-decoration:underline;cursor:pointer" id="verIr">reiniciar ahora</b>`;
        est2.className = 'verestado nueva';
        est2.querySelector('#verIr').addEventListener('click', () => { if (typeof reiniciarLimpio === 'function') reiniciarLimpio(); else location.reload(); });
      }
    } catch (err) { est2.textContent = 'sin conexión con el servidor'; est2.className = 'verestado mal'; }
  });

  // --- gestión de usuarios (admin o programador en servidor) ---
  if (SRV.on && SRV.esAdmin) {
    let usados = [], USUARIOS = [];
    const esProg = SRV.rol === 'programador';
    const sugerencia = p => sugerirUsuario(p.nombre, usados) || p.id;
    const selRol = ov.querySelector('#usrRol'), sel = ov.querySelector('#usrPid'), inp = ov.querySelector('#usrNombre');
    const pintaUsuarios = async () => {
      const r = await api('GET', '/api/usuarios');
      if (!r.ok) { ov.querySelector('#usuariosLista').innerHTML = '<div class="festvacio">No se pudo cargar la lista.</div>'; return; }
      const usuarios = USUARIOS = r.datos.usuarios;
      usados = usuarios.map(u => u.usuario);
      const conUsuario = new Set(usuarios.map(u => u.pid).filter(Boolean));
      ov.querySelector('#usuariosLista').innerHTML = usuarios.map(u => {
        const per = S.staff.find(x => x.id === u.pid);
        const propio = u.usuario === SRV.usuario;
        // los permisos se cambian desde aquí (José, 17/09): el jefe le quita el mando a
        // quien haga falta sin tocar variables del servidor. Nadie se cambia el suyo, y
        // las cuentas de programador solo las toca el programador.
        const tocable = !propio && (u.rol !== 'programador' || esProg);
        const roles = esProg ? ['programador', 'admin', 'empleado'] : ['admin', 'empleado'];
        return `<div class="festrow f-manual" style="border-left-color:${u.rol === 'programador' ? '#7c5fb8' : u.rol === 'admin' ? 'var(--accent)' : 'var(--teal)'}">
          <span class="festinfo"><b>${esc(u.usuario)}</b>${propio ? ' <small>(tú)</small>' : ''}<small>${ROL_LBL[u.rol] || u.rol}${per ? ' · ' + esc(per.nombre) : u.pid ? ' · ' + esc(u.pid) : ''}</small></span>
          ${tocable ? `<select class="usrrol" data-usrrol="${u.id}" aria-label="Permisos de ${esc(u.usuario)}">${roles.map(r => `<option value="${r}"${u.rol === r ? ' selected' : ''}>${ROL_LBL[r]}</option>`).join('')}</select>` : ''}
          ${tocable && u.rol !== 'empleado' && puedeVerEntrevista() ? `<label class="usrent" title="Ver lo que hay dentro de cada entrevista (condiciones, sueldo, observaciones)"><input type="checkbox" data-usrent="${u.id}"${u.verEntrevistas ? ' checked' : ''}> entrevistas</label>` : ''}
          ${propio ? '' : `<button class="btn-mini ghost" data-usrreset="${u.id}" title="Generar contraseña nueva">reset</button><button class="festrm" data-usrdel="${u.id}" aria-label="Borrar usuario">✕</button>`}</div>`;
      }).join('') || '<div class="festvacio">Solo existe el administrador.</div>';
      const libres = S.staff.filter(p => !conUsuario.has(p.id));
      sel.innerHTML = '<option value="">(sin persona asociada)</option>' + libres.map(p => `<option value="${p.id}">${esc(p.nombre)}</option>`).join('');
      if (libres[0] && selRol.value === 'empleado') { sel.value = libres[0].id; inp.value = sugerencia(libres[0]); }
    };
    pintaUsuarios();
    sel.addEventListener('change', () => { const p = S.staff.find(x => x.id === sel.value); if (p) inp.value = sugerencia(p); });
    selRol.addEventListener('change', () => { if (selRol.value !== 'empleado') { sel.value = ''; inp.value = ''; } else sel.dispatchEvent(new Event('change')); });
    ov.addEventListener('change', async e => {
      // 18/09 (José): abrir o cerrar a una cuenta el contenido de las entrevistas. Solo
      // aparece para quien ya lo tiene; el servidor lo vuelve a comprobar de todos modos.
      const chk = e.target.closest('[data-usrent]');
      if (chk) {
        const id = +chk.dataset.usrent, ver = chk.checked;
        const u = USUARIOS.find(x => x.id === id);
        if (!u) return;
        const r = await api('POST', '/api/usuarios/entrevistas', { id, ver });
        if (!r.ok) { toast((r.datos && r.datos.error) || 'No se pudo cambiar', 'bad'); chk.checked = !ver; return; }
        u.verEntrevistas = ver;
        toast(ver ? `«${u.usuario}» ya ve el contenido de las entrevistas` : `«${u.usuario}» deja de ver el contenido de las entrevistas`, ver ? 'ok' : 'warn');
        registrarCambio(`Entrevistas de ${u.usuario}: ${ver ? 've el contenido' : 'solo la lista'}`, 'cambio');
        saveState();
        return;
      }
      const selr = e.target.closest('[data-usrrol]');
      if (!selr) return;
      const id = +selr.dataset.usrrol, rol = selr.value;
      const u = USUARIOS.find(x => x.id === id);
      if (!u || rol === u.rol) return;
      const vuelve = () => { selr.value = u.rol; };
      let pid;
      if (rol === 'empleado' && !u.pid) {
        // sin ficha en la planilla un empleado no vería nada suyo: se le pregunta cuál es
        pid = await pedirPersonaUsuario(u.usuario);
        if (!pid) { vuelve(); return; }
      }
      if (!confirm(`¿Dejar a «${u.usuario}» como ${ROL_LBL[rol]}? Saldrá de sus dispositivos y tendrá que volver a entrar.`)) { vuelve(); return; }
      const r = await api('POST', '/api/usuarios/rol', { id, rol, pid });
      if (!r.ok) { toast((r.datos && r.datos.error) || 'No se pudo cambiar', 'bad'); vuelve(); return; }
      // la lista en memoria se actualiza ya: repintar es asíncrono y, hasta que termina,
      // un segundo cambio sobre la misma fila se tomaba por «no ha cambiado nada»
      u.rol = rol; u.pid = r.datos.pid;
      toast(`«${u.usuario}» ahora es ${ROL_LBL[rol]}`, rol === 'empleado' ? 'warn' : 'ok');
      registrarCambio(`Permisos de ${u.usuario}: ${ROL_LBL[u.rol]} → ${ROL_LBL[rol]}`, 'cambio');
      saveState();
      pintaUsuarios();
    });
    ov.addEventListener('click', async e => {
      const del = e.target.closest('[data-usrdel]');
      if (del) {
        if (!confirm('¿Borrar este usuario? La persona seguirá en la planilla; solo pierde el acceso.')) return;
        const r = await api('DELETE', '/api/usuarios?id=' + del.dataset.usrdel);
        if (r.ok) { toast('Usuario borrado', 'warn'); pintaUsuarios(); }
        else toast((r.datos && r.datos.error) || 'No se pudo borrar', 'bad');
        return;
      }
      const rst = e.target.closest('[data-usrreset]');
      if (rst) {
        if (!confirm('Se generará una contraseña inicial nueva y ese usuario saldrá de todos sus dispositivos. ¿Continuar?')) return;
        const r = await api('POST', '/api/usuarios/reset', { id: +rst.dataset.usrreset });
        if (r.ok) {
          const c = ov.querySelector('#usrClave');
          c.classList.remove('hidden');
          c.innerHTML = `<b>${esc(r.datos.usuario)}</b> tiene contraseña inicial nueva (solo se muestra ahora): <b style="font-family:var(--mono);font-size:15px">${esc(r.datos.password)}</b><br><small>Al entrar, la app le pedirá crear la suya.</small>`;
        } else toast((r.datos && r.datos.error) || 'No se pudo generar', 'bad');
        return;
      }
      if (e.target.id === 'usrCrear') {
        const rol = selRol.value, pid = sel.value || undefined;
        const usuario = inp.value.trim().toLowerCase();
        if (!usuario) { toast('Escribe el nombre de usuario', 'warn'); return; }
        if (rol === 'empleado' && !pid) { toast('Un empleado necesita su persona de la planilla', 'warn'); return; }
        const r = await api('POST', '/api/usuarios', { usuario, rol, pid });
        if (r.ok) {
          const c = ov.querySelector('#usrClave');
          c.classList.remove('hidden');
          c.innerHTML = r.datos.generica
            ? `Usuario <b>${esc(r.datos.usuario)}</b> (${ROL_LBL[rol]}) creado con la <b>contraseña genérica</b>: <b style="font-family:var(--mono);font-size:15px">${esc(r.datos.password)}</b>. Al entrar por primera vez la app le obligará a crear la suya.`
            : `Usuario <b>${esc(r.datos.usuario)}</b> (${ROL_LBL[rol]}) creado. Contraseña inicial, solo se muestra ahora: <b style="font-family:var(--mono);font-size:15px">${esc(r.datos.password)}</b>`;
          registrarCambio(`Usuario creado: ${usuario} (${ROL_LBL[rol]})${pid ? ' para ' + nombrePid(pid) : ''}`, 'cambio');
          saveState();
          pintaUsuarios();
        } else toast((r.datos && r.datos.error) || 'No se pudo crear', 'bad');
      }
    });
  }
}
$('#topCuenta').addEventListener('click', openCuenta);
