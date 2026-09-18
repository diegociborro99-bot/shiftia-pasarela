// ================= SELECTOR DE PERSONAS Y MENÚ DE LA CASILLA =================
// El selector enseña a todo el equipo en tres grupos: quien puede (ordenado por
// prioridad, con la razón), quien puede con aviso (rompe una regla blanda: un
// partido no declarado) y quien no puede (con el motivo). El encargado distribuye
// «de la manera que quiera»: cualquiera se puede FORZAR, y queda constancia.
function closePicker() { const ex = document.getElementById('pickerPop'); if (ex) ex.remove(); document.querySelectorAll('.popfondo').forEach(f => f.remove()); }
// 18/09 (Diego): «que aparezca una lupita en el blop para buscarlo por nombre». El selector
// pinta a la plantilla ENTERA en tres grupos, así que con 21 personas hay que bajar
// buscando a ojo. Se filtra por nombre, sin tildes ni mayúsculas.
function pickNorm(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
const SVG_LUPA_PICK = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/></svg>';
function openPicker(iso, tid, anchor) {
  closePicker();
  const e = estadoDeIso(iso);
  const { localId, franja } = partirTurno(tid);
  const l = localDe(S, localId);
  const r = revisarTurno(S, S.staff, e, iso, tid);
  const ok = candidatosPara(S, S.staff, e, iso, tid);
  const conAviso = candidatosConAviso(S, S.staff, e, iso, tid);
  const yaOk = new Set([...ok, ...conAviso].map(c => c.pid));
  const noPueden = S.staff.filter(p => !yaOk.has(p.id) && !pidsEn(e, iso, tid).includes(p.id)).map(p => ({ p, r: puedeEstar(S, S.staff, e, iso, tid, p.id, { permitirPartido: true }) }));
  const fila = (c, cls, sub, extra) => `<button class="prowp ${cls}" data-pickpid="${c.pid}"${extra || ''}><span class="av" style="background:${avColor(c.pid)}">${esc(initials(c.nombre))}</span><span class="pn2">${esc(c.nombre)}<span class="prsub">${esc(sub)}</span></span>${cls === 'rec' ? '<span class="star">★ RECOMENDADO</span>' : ''}</button>`;
  const pop = document.createElement('div');
  pop.className = 'pop picker'; pop.id = 'pickerPop'; pop.setAttribute('role', 'dialog');
  const filaNo = ({ p, r }) => `<div class="prowp dis"><span class="av" style="background:${avColor(p.id)}">${esc(initials(p.nombre))}</span><span class="pn2">${esc(p.nombre)}<span class="prsub">${esc(r.motivo)}</span></span>${/no abre|ya en|ya está|de baja|vacaciones|permiso|día libre|ausente/i.test(r.motivo) ? '' : `<button class="forzar" data-forzar="${p.id}" title="Ponerlo de todas formas y dejar constancia">forzar</button>`}</div>`;
  // las filas ya filtradas por lo que se haya escrito en la lupa. Los grupos que se quedan
  // sin nadie desaparecen con su cabecera: un «PUEDEN · 0» solo estorba.
  const filasPicker = q => {
    const n = pickNorm(q);
    const pasa = nombre => !n || pickNorm(nombre).includes(n);
    const vOk = ok.filter(c => pasa(c.nombre));
    const vAviso = conAviso.filter(c => pasa(c.nombre));
    const vNo = noPueden.filter(x => pasa(x.p.nombre));
    if (n && !vOk.length && !vAviso.length && !vNo.length) return `<div class="pgroup">No hay nadie con ese nombre</div>`;
    return `${vOk.length ? `<div class="pgroup">PUEDEN · ${vOk.length}</div>${vOk.map((c, i) => fila(c, !n && i === 0 ? 'rec' : '', c.razones.join(' · '))).join('')}` : (n ? '' : '<div class="pgroup">NADIE PUEDE SIN ROMPER NADA</div>')}
      ${vAviso.length ? `<div class="pgroup">CON AVISO · ${vAviso.length}</div>${vAviso.map(c => fila(c, 'aviso', c.razones.join(' · '), ' data-aviso="1"')).join('')}` : ''}
      ${vNo.length ? `<div class="pgroup">NO PUEDEN · ${vNo.length}</div>${vNo.map(filaNo).join('')}` : ''}`;
  };
  pop.innerHTML = `<div class="ph">${esc(l.nombre)} · ${FRANJA_LBL[franja].toLowerCase()}</div>
    <div class="pd">${fmtLargo(iso)} · ${r.n} de ${r.minimo}${r.supuesto ? ' (mínimo supuesto)' : ''}${r.refuerzo ? ' · con refuerzo' : ''}${r.sinCocina ? ' · <b>sin cocina</b>' : ''}</div>
    <label class="pbusca">${SVG_LUPA_PICK}<input type="search" id="pickQ" placeholder="Buscar por nombre…" autocomplete="off" aria-label="Buscar a alguien por su nombre"></label>
    <div class="plist">${filasPicker('')}</div>`;
  document.body.appendChild(pop);
  colocarPop(pop, anchor);
  cierraFuera(pop);
  // repinta SOLO la lista: si se repintase el popover entero, el <input> se destruiría a
  // cada tecla y se perdería el cursor (y en el móvil se cerraría el teclado).
  function pintaListaPicker() {
    const lista = pop.querySelector('.plist');
    if (lista) lista.innerHTML = filasPicker($('#pickQ') ? $('#pickQ').value : '');
  }
  $('#pickQ').oninput = pintaListaPicker;
  // en el móvil NO se enfoca solo: el teclado subiría y taparía el propio selector
  if (matchMedia('(hover:hover)').matches) { const q = $('#pickQ'); if (q) q.focus(); }
  pop.addEventListener('click', ev => {
    const f = ev.target.closest('[data-forzar]');
    if (f) {
      const pid = f.dataset.forzar;
      const motivo = prompt(`Vas a poner a ${nombrePid(pid)} rompiendo una regla del grupo. Escribe el motivo (quedará en el historial):`);
      if (motivo === null) return;
      pushUndo(`forzar a ${nombrePid(pid)}`);
      const res = asignarUI(iso, tid, pid, { origen: 'manual', forzar: true, permitirPartido: true, razon: motivo.trim() || 'forzado por el encargado' });
      if (res.ok) { closePicker(); renderVistaActiva(); toast(`${nombrePid(pid)} puesto a la fuerza (${res.avisos.join(', ')})`, 'warn'); } else toast(res.motivo, 'bad');
      return;
    }
    const b = ev.target.closest('[data-pickpid]'); if (!b) return;
    const pid = b.dataset.pickpid;
    const c = [...ok, ...conAviso].find(x => x.pid === pid);
    pushUndo(`poner a ${nombrePid(pid)}`);
    const res = asignarUI(iso, tid, pid, { origen: 'manual', permitirPartido: !!b.dataset.aviso, razon: c ? c.razones.join(' · ') : undefined });
    if (!res.ok) { toast(res.motivo, 'bad'); return; }
    closePicker(); renderVistaActiva();
    toast(res.avisos.length ? `${nombrePid(pid)} añadido con aviso: ${res.avisos.join(', ')}` : `${nombrePid(pid)} añadido`, res.avisos.length ? 'warn' : 'ok');
  });
}
// menú de una persona ya sentada en la casilla: ficha, orden, abre, cocina, quitar
function openMenuTurno(iso, tid, pid, anchor) {
  cerrarPops();
  const e = estadoDeIso(iso);
  const lista = asignados(e, iso, tid);
  const i = lista.findIndex(x => x.pid === pid); if (i < 0) return;
  const entry = lista[i];
  const p = personaDeId(pid);
  const { localId, franja } = partirTurno(tid);
  const l = localDe(S, localId);
  const pop = document.createElement('div');
  pop.className = 'pop'; pop.id = 'menuTurnoPop'; pop.setAttribute('role', 'dialog');
  pop.innerHTML = `<div class="ph">${esc(p.nombre)}</div>
    <div class="pd">${esc(l.nombre)} · ${FRANJA_LBL[franja].toLowerCase()} · posición ${i + 1} de ${lista.length}${entry.razon ? `<br><small>${esc(entry.razon)}</small>` : ''}${entry.avisos && entry.avisos.length ? `<br><small style="color:var(--warn)">${esc(entry.avisos.join(' · '))}</small>` : ''}</div>
    <button class="popb full" data-mt="ficha">Ver y editar su ficha</button>
    <button class="popb full rec" data-mt="cobertura">Falta estos días… buscar quién cubre</button>
    ${i > 0 ? '<button class="popb full" data-mt="subir">▲ Subir en la casilla</button>' : ''}
    ${i < lista.length - 1 ? '<button class="popb full" data-mt="bajar">▼ Bajar en la casilla</button>' : ''}
    ${entry.abre ? '' : '<button class="popb full" data-mt="abre">Sale primero (abre el local)</button>'}
    ${localTieneCocina(l, franja) || entry.cocina ? (entry.cocina ? '<button class="popb full" data-mt="nococina">Quitar la marca de cocina</button>' : `<button class="popb full" data-mt="cocina">Lleva la cocina${puedeCocina(S, p, localId, iso) ? '' : ' (no es cocina de este local)'}</button>`) : ''}
    <button class="popb full" data-mt="hora">Horario distinto este día${entry.ini ? ` (${esc(entry.ini)}–${esc(entry.fin)})` : ''}</button>
    <button class="popb full peligro" data-mt="quitar">Quitar de la casilla</button>`;
  document.body.appendChild(pop);
  colocarPop(pop, anchor);
  cierraFuera(pop);
  pop.addEventListener('click', ev => {
    const b = ev.target.closest('[data-mt]'); if (!b) return;
    const a = b.dataset.mt;
    pop.remove();
    if (a === 'ficha') { openFicha(pid); return; }
    if (a === 'cobertura') { openCobertura({ pid, dias: [iso], tipo: 'LD' }); return; }
    if (!confirmarSiCerrado(iso)) return;
    const ew = estadoDeIso(iso, true);
    if (a === 'subir' || a === 'bajar') { pushUndo('reordenar casilla'); moverEnCasilla(ew, iso, tid, pid, i + (a === 'subir' ? -1 : 1)); registrarCambio(`${p.nombre} ${a === 'subir' ? 'sube' : 'baja'} en la casilla de ${l.nombre} ${FRANJA_LBL[franja].toLowerCase()} del ${fmtDM(iso)}`, 'asig'); }
    else if (a === 'abre') { pushUndo('quién abre'); marcarAbre(ew, iso, tid, pid, S); registrarCambio(`${p.nombre} abre ${l.nombre} ${FRANJA_LBL[franja].toLowerCase()} del ${fmtDM(iso)}`, 'asig'); }
    else if (a === 'cocina') { pushUndo('cocina'); marcarCocina(ew, iso, tid, pid); if (!manualDe(ew, iso, tid).orden) ew.asig[iso][tid] = ordenarCasilla(S, iso, tid, ew.asig[iso][tid]); registrarCambio(`${p.nombre} lleva la cocina de ${l.nombre} ${FRANJA_LBL[franja].toLowerCase()} del ${fmtDM(iso)}`, 'asig'); }
    else if (a === 'nococina') { pushUndo('cocina'); entry.cocina = false; marcarManual(ew, iso, tid, 'cocina'); registrarCambio(`${p.nombre} deja la cocina de ${l.nombre} del ${fmtDM(iso)}`, 'asig'); }
    else if (a === 'hora') {
      const v = prompt('Horario de entrada y salida de esta persona en este turno (p. ej. 12:00-20:00). Vacío = el del local.', entry.ini ? `${entry.ini}-${entry.fin}` : '');
      if (v === null) return;
      const m = v.trim().match(/^(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})$/);
      pushUndo('horario del turno');
      if (!v.trim()) { delete entry.ini; delete entry.fin; } else if (m) { entry.ini = m[1].padStart(5, '0'); entry.fin = m[2].padStart(5, '0'); } else { toast('Formato: 12:00-20:00', 'warn'); return; }
      registrarCambio(`Horario de ${p.nombre} el ${fmtDM(iso)}: ${entry.ini ? entry.ini + '–' + entry.fin : 'el del local'}`, 'asig');
    }
    else if (a === 'quitar') { pushUndo(`quitar a ${p.nombre}`); desasignarUI(iso, tid, pid); }
    saveState(); renderVistaActiva();
  });
}
