// ================= SELECTOR DE PERSONAS Y MENÚ DE LA CASILLA =================
// El selector enseña a todo el equipo en tres grupos: quien puede (ordenado por
// prioridad, con la razón), quien puede con aviso (rompe una regla blanda: un
// partido no declarado) y quien no puede (con el motivo). El encargado distribuye
// «de la manera que quiera»: cualquiera se puede FORZAR, y queda constancia.
function closePicker() { const ex = document.getElementById('pickerPop'); if (ex) ex.remove(); document.querySelectorAll('.popfondo').forEach(f => f.remove()); }
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
  pop.innerHTML = `<div class="ph">${esc(l.nombre)} · ${FRANJA_LBL[franja].toLowerCase()}</div>
    <div class="pd">${fmtLargo(iso)} · ${r.n} de ${r.minimo}${r.supuesto ? ' (mínimo supuesto)' : ''}${r.refuerzo ? ' · con refuerzo' : ''}${r.sinCocina ? ' · <b>sin cocina</b>' : ''}</div>
    <div class="plist">
      ${ok.length ? `<div class="pgroup">PUEDEN · ${ok.length}</div>${ok.map((c, i) => fila(c, i === 0 ? 'rec' : '', c.razones.join(' · '))).join('')}` : '<div class="pgroup">NADIE PUEDE SIN ROMPER NADA</div>'}
      ${conAviso.length ? `<div class="pgroup">CON AVISO · ${conAviso.length}</div>${conAviso.map(c => fila(c, 'aviso', c.razones.join(' · '), ' data-aviso="1"')).join('')}` : ''}
      ${noPueden.length ? `<div class="pgroup">NO PUEDEN · ${noPueden.length}</div>${noPueden.map(({ p, r }) => `<div class="prowp dis"><span class="av" style="background:${avColor(p.id)}">${esc(initials(p.nombre))}</span><span class="pn2">${esc(p.nombre)}<span class="prsub">${esc(r.motivo)}</span></span>${/no abre|ya en|ya está|de baja|vacaciones|permiso|día libre|ausente/i.test(r.motivo) ? '' : `<button class="forzar" data-forzar="${p.id}" title="Ponerlo de todas formas y dejar constancia">forzar</button>`}</div>`).join('')}` : ''}
    </div>`;
  document.body.appendChild(pop);
  colocarPop(pop, anchor);
  cierraFuera(pop);
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
