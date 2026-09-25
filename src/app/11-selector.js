// ================= SELECTOR DE PERSONAS Y MENÚ DE LA CASILLA =================
// El selector enseña a todo el equipo en grupos: si la casilla no tiene cocina, primero quien
// puede llevarla; quien puede (ordenado por prioridad, con la razón), quien puede con aviso
// (rompe una regla blanda: un partido no declarado) y quien no puede (con el motivo y la
// regla). El encargado distribuye «de la manera que quiera»: casi todo se puede FORZAR, y
// queda constancia. 24/09 (fase 4, S35): los grupos los da el modelo (gruposSelector), de la
// misma puerta y la misma puntuación que el Generador y la Cobertura; aquí solo se pintan.
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
  // los grupos, del modelo (S35): la cocina arriba si la casilla no la tiene; en «no pueden», cada
  // uno con su motivo y su regla (también «solo hace cocina» o «ya lleva la cocina ese día», S34).
  // 24/09 (revisión F4): con S.meses, «N turnos esa semana» cuenta la semana entera aunque cruce de mes
  // (el lunes 28 decía «2 turnos esa semana» de Cristian, que tenía 7)
  const g = gruposSelector(S, S.staff, e, iso, tid, { meses: S.meses });
  const cocina = g.cocina, ok = g.pueden, conAviso = g.conAviso, noPueden = g.noPueden;
  const fila = (c, cls, sub, extra) => `<button class="prowp ${cls}" data-pickpid="${c.pid}"${extra || ''}><span class="av" style="background:${avColor(c.pid)}">${esc(initials(c.nombre))}</span><span class="pn2">${esc(c.nombre)}<span class="prsub">${esc(sub)}</span></span>${/\brec\b/.test(cls) ? '<span class="star">★ RECOMENDADO</span>' : ''}</button>`;
  const pop = document.createElement('div');
  pop.className = 'pop picker'; pop.id = 'pickerPop'; pop.setAttribute('role', 'dialog');
  // cada fila dice QUÉ regla choca, no solo el motivo: es lo que se va a corregir en Equipo
  // si la equivocada es la ficha (Diego, 18/09). «forzar» solo donde se puede forzar (lo dice
  // la puerta: una ausencia, el local cerrado o estar ya en otro local esa franja, no)
  const porPid = new Map(noPueden.map(x => [x.pid, x]));
  // (revisión F4) en una casilla sin cocina, quien la lleva se evalúa y se fuerza como cocina (data-cocina)
  const filaNo = x => `<div class="prowp dis${x.cocina ? ' coc' : ''}"${x.cocina ? ' data-cocina="1"' : ''}><span class="av" style="background:${avColor(x.pid)}">${esc(initials(x.nombre))}</span><span class="pn2">${esc(x.nombre)}<span class="prregla">${esc(nombreRegla(x.regla))}${x.cocina ? ' · como cocina' : ''}</span><span class="prsub">${esc(x.motivo)}</span></span>${x.forzable ? `<button class="forzar" data-forzar="${x.pid}" title="Ponerlo de todas formas y dejar constancia">forzar</button>` : ''}</div>`;
  // las filas ya filtradas por lo que se haya escrito en la lupa. Los grupos que se quedan
  // sin nadie desaparecen con su cabecera: un «PUEDEN · 0» solo estorba. La ★ es la primera
  // de la cocina si la casilla no la tiene; si no, la primera de «pueden».
  const filasPicker = q => {
    const n = pickNorm(q);
    const pasa = nombre => !n || pickNorm(nombre).includes(n);
    const vCoc = cocina.filter(c => pasa(c.nombre));
    const vOk = ok.filter(c => pasa(c.nombre));
    const vAviso = conAviso.filter(c => pasa(c.nombre));
    const vNo = noPueden.filter(x => pasa(x.nombre));
    if (n && !vCoc.length && !vOk.length && !vAviso.length && !vNo.length) return `<div class="pgroup">No hay nadie con ese nombre</div>`;
    const recCoc = !n && vCoc.length > 0;
    return `${vCoc.length ? `<div class="pgroup">COCINA · ${vCoc.length} <small>la casilla no tiene cocina</small></div>${vCoc.map((c, i) => fila(c, `coc${recCoc && i === 0 ? ' rec' : ''}`, c.razones.join(' · '), ' data-cocina="1"')).join('')}` : ''}
      ${vOk.length ? `<div class="pgroup">PUEDEN · ${vOk.length}</div>${vOk.map((c, i) => fila(c, !n && !recCoc && i === 0 ? 'rec' : '', c.razones.join(' · '))).join('')}` : (n || vCoc.length ? '' : '<div class="pgroup">NADIE PUEDE SIN ROMPER NADA</div>')}
      ${vAviso.length ? `<div class="pgroup">CON AVISO · ${vAviso.length}</div>${vAviso.map(c => fila(c, c.cocina ? 'aviso coc' : 'aviso', c.razones.join(' · '), c.cocina ? ' data-aviso="1" data-cocina="1"' : ' data-aviso="1"')).join('')}` : ''}
      ${vNo.length ? `<div class="pgroup">NO PUEDEN · ${vNo.length}</div>${vNo.map(filaNo).join('')}` : ''}`;
  };
  pop.innerHTML = `<div class="ph">${esc(l.nombre)} · ${FRANJA_LBL[franja].toLowerCase()}</div>
    <div class="pd">${fmtLargo(iso)} · ${r.n} de ${r.minimo}${r.supuesto ? ' (mínimo supuesto)' : ''}${r.refuerzo ? ' · con refuerzo' : ''}${r.sinCocina ? ' · <b>sin cocina</b>' : ''}</div>
    <label class="pbusca">${SVG_LUPA_PICK}<input type="search" id="pickQ" placeholder="Buscar por nombre…" autocomplete="off" aria-label="Buscar a alguien por su nombre"></label>
    <div class="plist">${filasPicker('')}</div>
    <button type="button" class="popb full pcierra" data-cierrafr title="Cerrar el local unos días (reforma, vacaciones del local)">Cerrar esta franja…</button>`;
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
    // 24/09 (D11): cerrar el local desde la casilla: el visor sale con este local, día y franja
    if (ev.target.closest('[data-cierrafr]')) { closePicker(); openCierre({ localId, iso, franja }); return; }
    const f = ev.target.closest('[data-forzar]');
    if (f) {
      const pid = f.dataset.forzar;
      const rr = porPid.get(pid) || {};
      // 24/09 (revisión F4, cliente): TODAS las reglas que se incumplen, una por línea y cada una con la
      // suya (siSeFuerza); antes solo la primera, y el aviso de después se las atribuía todas a ella
      const inc = rr.incumple && rr.incumple.length ? rr.incumple : (rr.regla ? [{ k: rr.regla, motivo: rr.motivo }] : []);
      const cual = inc.length ? lineasIncumple(inc) : 'una regla del grupo';
      const motivo = prompt(`Vas a poner a ${nombrePid(pid)}${rr.cocina ? ' llevando la cocina' : ''} incumpliendo ${inc.length > 1 ? 'estas reglas' : 'esta regla'}:\n\n${cual}\n\nSi la equivocada es la ficha, se corrige en Equipo. Escribe por qué lo haces (quedará en el historial):`);
      if (motivo === null) return;
      // 24/09 (revisión F3): con el puesto de sala, como el resto del selector: sin él, «solo hace cocina»
      // no quedaba en la entrada como regla forzada y la Revisión no lo daba por forzado. Revisión F4: en una
      // casilla sin cocina, quien la lleva entra llevándola (la fila lo dice); antes quedaba de sala y la
      // casilla seguía sin cocina
      pushUndo(`forzar a ${nombrePid(pid)}`);
      const puesto = rr.cocina ? { puesto: 'cocina', cocina: true } : { puesto: 'sala' };
      const res = asignarUI(iso, tid, pid, Object.assign({ origen: 'manual', forzar: true, permitirPartido: true, razon: motivo.trim() || 'forzado por el encargado' }, puesto));
      if (res.ok) { closePicker(); renderVistaActiva(); toast(`${nombrePid(pid)} puesto a la fuerza · incumple ${conSuRegla(res.avisos, inc)}`, 'warn'); }
      else { undoStack.pop(); actualizarUndoBtn(); toast(`${nombreRegla(res.regla)} — ${res.motivo}`, 'bad'); }
      return;
    }
    const b = ev.target.closest('[data-pickpid]'); if (!b) return;
    const pid = b.dataset.pickpid;
    // cada persona sale en un solo grupo; la fila trae si entra llevando la cocina (c.cocina)
    const c = [...cocina, ...ok, ...conAviso].find(x => x.pid === pid);
    if (ponerRecomendadoUI(iso, tid, pid, c, !!b.dataset.aviso).ok) { closePicker(); renderVistaActiva(); }
  });
}
// Las reglas que se incumplen, una por línea («Regla — motivo»), y los avisos que quedan, cada uno con su
// regla («Regla: motivo»). inc: [{ k, motivo }] del modelo (siSeFuerza). Las usan el selector y el Mes.
function lineasIncumple(inc) { return inc.map(x => `${x.k ? nombreRegla(x.k) + ' — ' : ''}${x.motivo}`).join('\n'); }
function conSuRegla(avisos, inc) { return (avisos || []).map(t => { const x = (inc || []).find(y => y.motivo === t); return x && x.k ? `${nombreRegla(x.k)}: ${t}` : t; }).join(' · '); }
// Pone a quien se ha elegido de la lista tal como la recomienda candidatosPara: de sala, y si cubre a
// quien falta, con su «por» y el partido autorizado para cubrirle (D1). 24/09 (revisión F3, S11): antes la
// ★ de Mari Luz «cubre a Iván» se rechazaba al pulsarla («no hace partido los viernes») y, si entraba,
// iba sin «por». Revisión F3b: la ★ de un toque de Hoy tenía su propia copia sin nada de esto y volvía a
// fallar el domingo 4; ahora el selector y la ★ llaman aquí. Si no se puede poner, el paso de Ctrl+Z se
// retira (no queda un paso vacío) y se dice por qué. c: su fila de candidatosPara (o nada); conAviso: la
// fila es de «con aviso» (un partido no declarado). Fase 4 (S35): la fila del grupo de cocina (c.cocina)
// entra llevando la cocina, con el puesto de cocina. 24/09 (fase 6, S24): «con aviso» es también la pareja «nunca
// con» flexible (entra con su aviso); antes el selector no la ofrecía y, si se elegía, se rechazaba.
function ponerRecomendadoUI(iso, tid, pid, c, conAviso) {
  // (revisión final, 25/09) el paso de Ctrl+Z guarda el mes de la casilla: desde el Generador (Periodo) se pone en un
  // mes que puede no ser el de la pantalla, y el paso solo guardaba el de la pantalla (Ctrl+Z no la quitaba)
  pushUndo(`poner a ${nombrePid(pid)}`, iso.slice(0, 7) !== mesKey(S.y, S.m) ? { otrosMeses: true } : undefined);
  const cub = c && c.cubre ? { por: c.cubre, cubrePor: c.cubre } : {};
  const puesto = c && c.cocina ? { puesto: 'cocina', cocina: true } : { puesto: 'sala' };
  // (revisión de la fase 6) lo que relaja «con aviso» es la lista del modelo (RELAJABLE), la misma que al aplicar la
  // Cobertura, volcar el Generador o aceptar su propuesta «con aviso»
  const res = asignarUI(iso, tid, pid, Object.assign({ origen: 'manual', razon: c ? c.razones.join(' · ') : 'recomendado' }, conAviso ? RELAJABLE : {}, puesto, cub));
  if (!res.ok) { undoStack.pop(); actualizarUndoBtn(); toast(res.motivo, 'bad'); return res; }
  toast(res.avisos.length ? `${nombrePid(pid)} añadido con aviso: ${res.avisos.join(', ')}` : `${nombrePid(pid)} añadido`, res.avisos.length ? 'warn' : 'ok');
  return res;
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
  // los avisos se recalculan: los que se guardaron al ponerla pueden haber caducado
  // (Diego y Aroa, 18/09: el «forzado a mano» de Lola)
  const avisosAhora = avisosVigentes(S, S.staff, e, iso, tid, pid);
  // 18/09 (José): «al tocar en los que estén marcados como apoyo… ajustar apoyo… a qué hora
  // tiene que entrar, cada día». Para un apoyo es lo primero del menú; para el resto sigue
  // siendo «horario distinto este día», al final. Las horas se apuntan en la asignación
  // (ini/fin) y son las que cuenta la nómina y las que enseña Hoy; en el papel no salen.
  const tramoTxt = entry.ini ? `${esc(entry.ini)}–${esc(entry.fin)}` : '';
  const btnTramo = `<button class="popb full${esApoyo(p) ? ' rec' : ''}" data-mt="hora">${esApoyo(p) ? 'Ajustar apoyo' : 'Horario distinto este día'}${tramoTxt ? `<small>${tramoTxt}</small>` : esApoyo(p) ? '<small>de qué hora a qué hora, hoy</small>' : ''}</button>`;
  const pop = document.createElement('div');
  pop.className = 'pop'; pop.id = 'menuTurnoPop'; pop.setAttribute('role', 'dialog');
  pop.innerHTML = `<div class="ph">${esc(p.nombre)}</div>
    <div class="pd">${esc(l.nombre)} · ${FRANJA_LBL[franja].toLowerCase()} · posición ${i + 1} de ${lista.length}${entry.razon ? `<br><small>${esc(entry.razon)}</small>` : ''}${avisosAhora.length ? `<br><small style="color:var(--warn)">Incumple ${esc(avisosAhora.join(' · '))}</small>` : ''}</div>
    ${esApoyo(p) ? btnTramo : ''}
    <button class="popb full" data-mt="ficha">Ver y editar su ficha</button>
    <button class="popb full rec" data-mt="cobertura">Falta estos días… buscar quién cubre</button>
    ${i > 0 ? '<button class="popb full" data-mt="subir">▲ Subir en la casilla</button>' : ''}
    ${i < lista.length - 1 ? '<button class="popb full" data-mt="bajar">▼ Bajar en la casilla</button>' : ''}
    ${entry.abre ? (manualDe(e, iso, tid).abre ? '<button class="popb full" data-mt="noabre">Quitar «sale primero» a mano<small>que la casilla decida quién abre</small></button>' : '') : '<button class="popb full" data-mt="abre">Sale primero (abre el local)</button>'}
    ${localTieneCocina(l, franja, S, S.staff) || entry.cocina ? (entry.cocina ? '<button class="popb full" data-mt="nococina">Quitar la marca de cocina</button>' : `<button class="popb full" data-mt="cocina">Lleva la cocina${puedeCocina(S, p, localId, iso) ? '' : ' (no es cocina de este local)'}</button>`) : ''}
    ${esApoyo(p) ? '' : btnTramo}
    <button class="popb full" data-mt="cerrar">Cerrar esta franja…</button>
    <button class="popb full peligro" data-mt="quitar">Quitar de la casilla</button>`;
  document.body.appendChild(pop);
  colocarPop(pop, anchor);
  cierraFuera(pop);
  // el formulario del tramo, dentro del mismo popover: entra, sale, «hasta el cierre»
  const pintarTramo = () => {
    const dow = isoDow(iso);
    const cierre = cierreDe(l, dow);
    const hLocal = horarioDe(l, dow, franja);
    pop.innerHTML = `<div class="ph">${esApoyo(p) ? 'Ajustar apoyo' : 'Horario distinto'} · ${esc(p.nombre)}</div>
      <div class="pd">${esc(l.nombre)} · ${fmtLargo(iso)}${hLocal ? ` · el local, ${esc(hLocal.ini)}–${esc(hLocal.fin)}` : ''}</div>
      <div class="trform">
        <label>Entra<input type="time" id="trIni" data-libre value="${esc(entry.ini || '')}"></label>
        <label>Sale<input type="time" id="trFin" data-libre value="${esc(entry.fin || '')}"></label>
        ${cierre ? `<button type="button" class="btn-mini ghost" data-trcierre="${esc(cierre)}">hasta el cierre (${esc(cierre)})</button>` : ''}
      </div>
      <div class="trbar">${entry.ini ? '<button type="button" class="popb peligro" data-trquitar>Quitar las horas</button>' : ''}<button type="button" class="popb rec" data-trok>Guardar</button></div>`;
    const ini = pop.querySelector('#trIni'); if (ini && matchMedia('(hover:hover)').matches) ini.focus();
  };
  const guardarTramo = quitar => {
    if (!confirmarSiCerrado(iso)) return;
    const ew = estadoDeIso(iso, true);
    const en = asignados(ew, iso, tid).find(x => x.pid === pid); if (!en) { pop.remove(); return; }
    if (quitar) { pushUndo('horas del apoyo'); delete en.ini; delete en.fin; }
    else {
      const vi = (pop.querySelector('#trIni') || {}).value, vf = (pop.querySelector('#trFin') || {}).value;
      if (!/^\d\d:\d\d$/.test(vi || '') || !/^\d\d:\d\d$/.test(vf || '')) { toast('Hacen falta la hora de entrada y la de salida', 'warn'); return; }
      pushUndo('horas del apoyo'); en.ini = vi; en.fin = vf;
    }
    registrarCambio(`${esApoyo(p) ? 'Apoyo de' : 'Horario de'} ${p.nombre} en ${l.nombre} el ${fmtDM(iso)}: ${en.ini ? en.ini + '–' + en.fin : 'el del local'}`, 'asig');
    pop.remove(); saveState(); renderVistaActiva();
    toast(en.ini ? `${nombreCorto(p.nombre)}: de ${en.ini} a ${en.fin} en ${l.nombre}` : `${nombreCorto(p.nombre)}: el horario del local`, 'ok');
  };
  pop.addEventListener('click', ev => {
    const tc = ev.target.closest('[data-trcierre]'); if (tc) { const f = pop.querySelector('#trFin'); if (f) f.value = tc.dataset.trcierre; return; }
    if (ev.target.closest('[data-trok]')) { guardarTramo(false); return; }
    if (ev.target.closest('[data-trquitar]')) { guardarTramo(true); return; }
    const b = ev.target.closest('[data-mt]'); if (!b) return;
    const a = b.dataset.mt;
    // en el siguiente tick: cierraFuera mira si el botón pulsado sigue dentro del popover, y
    // si se repinta ahora mismo el botón ya no está en ningún sitio y lo cerraría
    if (a === 'hora') { setTimeout(pintarTramo, 0); return; }
    pop.remove();
    if (a === 'ficha') { openFicha(pid); return; }
    if (a === 'cobertura') { openCobertura({ pid, dias: [iso], tipo: 'LD' }); return; }
    if (a === 'cerrar') { openCierre({ localId, iso, franja }); return; }
    if (!confirmarSiCerrado(iso)) return;
    const ew = estadoDeIso(iso, true);
    if (a === 'subir' || a === 'bajar') { pushUndo('reordenar casilla'); moverEnCasilla(ew, iso, tid, pid, i + (a === 'subir' ? -1 : 1)); registrarCambio(`${p.nombre} ${a === 'subir' ? 'sube' : 'baja'} en la casilla de ${l.nombre} ${FRANJA_LBL[franja].toLowerCase()} del ${fmtDM(iso)}`, 'asig'); }
    else if (a === 'abre') {
      // 24/09 (fase 5, S18): sobre quien no puede abrir (Leo, «nunca de primero»; Cristian, que no abre El 33;
      // quien viene de hacer la mañana) avisa igual que «forzar», con la regla y el motivo (puedePrimero, la
      // misma lectura que el generador); si sigue, queda puesto a mano y la casilla y Revisar lo avisan
      const pr = puedePrimero(S, S.staff, ew, iso, tid, pid);
      let motivo = '';
      if (!pr.ok) {
        motivo = prompt(`Vas a poner a ${p.nombre} de primero (abre ${l.nombre} por la ${FRANJA_LBL[franja].toLowerCase()}) incumpliendo esta regla:\n\n${pr.regla ? nombreRegla(pr.regla) + ' — ' : ''}${pr.motivo}\n\nSi la equivocada es la ficha, se corrige en Equipo. Escribe por qué lo haces (quedará en el historial):`);
        if (motivo === null) return;
      }
      pushUndo('quién abre'); marcarAbre(ew, iso, tid, pid, S);
      registrarCambio(`${p.nombre} abre ${l.nombre} ${FRANJA_LBL[franja].toLowerCase()} del ${fmtDM(iso)}${pr.ok ? '' : ` · puesto a la fuerza (incumple ${pr.regla ? nombreRegla(pr.regla) + ': ' : ''}${pr.motivo})${motivo.trim() ? ' · ' + motivo.trim() : ''}`}`, 'asig');
      if (!pr.ok) toast(`${p.nombre} sale primero a la fuerza · incumple ${pr.regla ? nombreRegla(pr.regla) + ': ' : ''}${pr.motivo}`, 'warn');
    }
    // (revisión de la fase 5) quitar el «sale primero» puesto a mano: la casilla vuelve a decidir quién abre
    else if (a === 'noabre') { pushUndo('quién abre'); quitarAbreAMano(ew, S, S.staff, iso, tid); registrarCambio(`${p.nombre} ya no sale primero a mano en ${l.nombre} ${FRANJA_LBL[franja].toLowerCase()} del ${fmtDM(iso)}: abre ${nombrePid(primeroDe(S, S.staff, ew, iso, tid) || '') || 'nadie'}`, 'asig'); }
    else if (a === 'cocina') { pushUndo('cocina'); marcarCocina(ew, iso, tid, pid); if (!manualDe(ew, iso, tid).orden) ew.asig[iso][tid] = ordenarCasilla(S, iso, tid, ew.asig[iso][tid]); registrarCambio(`${p.nombre} lleva la cocina de ${l.nombre} ${FRANJA_LBL[franja].toLowerCase()} del ${fmtDM(iso)}`, 'asig'); }
    else if (a === 'nococina') { pushUndo('cocina'); entry.cocina = false; marcarManual(ew, iso, tid, 'cocina'); registrarCambio(`${p.nombre} deja la cocina de ${l.nombre} del ${fmtDM(iso)}`, 'asig'); }
    else if (a === 'quitar') { pushUndo(`quitar a ${p.nombre}`); desasignarUI(iso, tid, pid); }
    saveState(); renderVistaActiva();
  });
}
