// ================= VISTA MES =================
// Personas × días con una píldora por día (M, T o P = partido) en el color del
// local; ausencias; fila de control por local con los turnos cortos; y los
// botones de fútbol en la cabecera para marcar refuerzos.
function renderKPIs() {
  let abiertos = 0, cortos = 0, sinCocina = 0, forzados = 0;
  for (const d of est.days) for (const t of turnosDe(S)) {
    if (!turnoAbierto(S, est, d.iso, t.id)) continue;
    abiertos++;
    const r = revisarTurno(S, S.staff, est, d.iso, t.id);
    if (r.faltan) cortos++; if (r.sinCocina) sinCocina++; forzados += r.forzados;
  }
  const evs = eventosMes(est).length;
  $('#kpis').innerHTML = `
    <div class="kpi"><div class="micro">Casillas abiertas</div><div class="knum">${abiertos}</div><div class="kcap">local × franja × día este mes</div></div>
    <div class="kpi ${cortos ? 'k-warn' : 'k-ok'}"><div class="micro">Casillas cortas</div><div class="knum">${cortos}</div><div class="kcap">${cortos ? 'por debajo del mínimo' : 'todas cubiertas'}</div></div>
    <div class="kpi ${sinCocina ? 'k-warn' : 'k-ok'}"><div class="micro">Sin cocina</div><div class="knum">${sinCocina}</div><div class="kcap">casillas con cocina sin cocinero</div></div>
    <div class="kpi"><div class="micro">Eventos con refuerzo</div><div class="knum">${evs}</div><div class="kcap">${forzados ? forzados + ' asignaciones forzadas' : 'partidos y eventos del mes'}</div></div>`;
  $('#kpis').querySelectorAll('.knum').forEach(countUp);
}
function renderLegend() {
  $('#legend').innerHTML = S.locales.map(l => `<span class="lg"><span class="lp" style="background:${esc(l.color)}"></span>${esc(l.nombre)}</span>`).join('') +
    `<span class="lg"><span class="lgd pill pM" style="--lc:var(--ink3)">M</span>mañana</span><span class="lg"><span class="lgd pill pT" style="--lc:var(--ink3)">T</span>tarde</span><span class="lg"><span class="lgd pill pP" style="--lc:var(--ink3)">P</span>partido</span><span class="lg"><span class="lgd striped a-VAC">VAC</span>ausencia</span><span class="lg"><span class="lgd striped a-CIE">CIE</span>sin trabajo por un cierre</span><span class="lg"><span class="lgd" style="background:var(--warn-bg);color:var(--warn)">n</span>faltan</span>`;
}
function renderMes() {
  const kHoy = isoHoy().slice(0, 7), kMes = mesKey(S.y, S.m);
  $('#mTitle').innerHTML = `<b>${MESES[S.m - 1]}</b> <small>${S.y}</small>${kMes === kHoy ? ' <span class="dchip dc-hoy">ESTE MES</span>' : ` <span class="dchip dc-otro" title="Hoy es ${esc(fmtLargo(isoHoy()))}">${esc(distanciaHoy(isoDe(S.y, S.m, 1)))}</span>`}`;
  $('#mVisible').innerHTML = htmlBotonVisible('mVisibleBtn', [mesKey(S.y, S.m)]);
  renderKPIs(); renderLegend();
  $('#futbolBtns').innerHTML = (S.equipos || []).map(q => `<button class="btn btn-sec" data-futbol="${esc(q.id)}" style="--ec:${esc(q.color)}">⚽ Juega el ${esc(q.corto || q.nombre)}</button>`).join('') + '<button class="btn btn-ghost" data-futbol="" title="Otro evento con refuerzo">＋ Evento</button>';
  const hoy = isoHoy();
  const evs = eventosMes(est);
  const evPor = {}; for (const ev of evs) (evPor[ev.iso] = evPor[ev.iso] || []).push(ev);
  const wDia = getComputedStyle(document.documentElement).getPropertyValue('--w-dia').trim() || '62px';
  const wNom = getComputedStyle(document.documentElement).getPropertyValue('--w-nombre').trim() || '175px';
  let h = `<div class="mesev">${evs.map(chipEvento).join('')}</div><table class="plan" style="width:calc(${wNom} + ${est.days.length} * ${wDia})"><thead><tr><th class="pname">Persona</th>`;
  // un local cerrado por fechas ese día: una marca del color del local con el motivo (24/09, D11)
  const cierresDia = iso => cierresDe(S).filter(c => diasDeCierre(c).includes(iso));
  for (const d of est.days) { const cs = cierresDia(d.iso); h += `<th class="day${d.dow >= 6 ? ' wk' : ''}${evPor[d.iso] ? ' evday' : ''}" data-irdia="${d.iso}" title="Ir al día"><span class="dn">${DOW_C[d.dow]}</span><span class="dd">${d.d}</span>${evPor[d.iso] ? `<span class="evd" role="button" tabindex="0" data-evpop="${d.iso}" title="Ver o quitar el evento">⚽</span>` : ''}${cs.length ? `<span class="cied" style="--lc:${esc(colorLocal(cs[0].localId))}" data-tipstr="${esc(cs.map(c => textoCierre(S, c)).join('\n'))}">${esc(cs.map(c => (localDe(S, c.localId) || {}).corto || c.localId).join(' '))}</span>` : ''}</th>`; }
  h += '</tr></thead><tbody>';
  const grupos = [];
  // «De baja» = de baja todo el mes que se mira (24/09: antes, quien lo estaba HOY); una baja de
  // unos días se ve en su fila, día a día
  const bajaMes = p => est.days.every(d => deBaja(p, d.iso));
  for (const l of S.locales) grupos.push([l.nombre, S.staff.filter(p => !bajaMes(p) && (p.locales || [])[0] === l.id), l.color]);
  grupos.push(['Sin local fijo y varios locales', S.staff.filter(p => !bajaMes(p) && !(p.locales || []).length), 'var(--ink3)']);
  grupos.push(['De baja', S.staff.filter(bajaMes), 'var(--bad)']);
  // los que tienen varios locales van con su local principal (el primero); se listan ahí
  for (const [nombre, gente, color] of grupos) {
    if (!gente.length) continue;
    h += `<tr class="ghdr"><td colspan="${est.days.length + 1}"><span class="ghl"><span class="lp" style="background:${esc(color)};display:inline-block;width:8px;height:8px;border-radius:2px;margin-right:6px"></span>${esc(nombre)}</span></td></tr>`;
    for (const p of gente) {
      const n = turnosMes(est, p.id);
      h += `<tr class="prow"><td class="pname"><span class="pn" data-ficha="${p.id}" style="cursor:pointer"><b><span class="dot2" style="background:${avColor(p.id)}"></span>${esc(p.nombre)}</b><small>${esc((PUESTOS.find(x => x.id === p.puesto) || {}).label || '')} · ${n} turnos</small></span><button class="pnaus" data-mesaus="${p.id}" title="Ausencia (vacaciones, baja, día libre)" aria-label="Ausencia de ${esc(p.nombre)}">＋</button></td>`;
      for (const d of est.days) {
        const cas = casillasDe(est, d.iso, p.id);
        const aus = ausenciaEn(p, d.iso);
        const wk = d.dow >= 6 ? ' wk' : '';
        if (!cas.length) {
          if (aus) { h += `<td class="${wk.trim()}" data-asig="${p.id}|${d.iso}" role="button" tabindex="0"><span class="pill striped a-${esc(aus.tipo)}" data-tipstr="${esc(etiquetaAusencia(aus) + (aus.detalle ? ' · ' + aus.detalle : ''))}">${esc(aus.tipo)}</span></td>`; continue; }
          const ed = estadoDia(S, p, d.iso);
          // sin trabajo por el cierre de su local: pastilla «CIE» (24/09, D11)
          if (!ed.libra && ed.cierre && ed.cierre.tipo !== 'REFUERZA') { h += `<td class="${wk.trim()}" data-asig="${p.id}|${d.iso}" role="button" tabindex="0"><span class="pill striped a-CIE" data-tipstr="${esc(ed.texto)}">CIE</span></td>`; continue; }
          h += `<td class="${wk.trim()}" data-asig="${p.id}|${d.iso}" role="button" tabindex="0"><span class="pill vacio">${ed.libra ? 'libra' : ''}</span></td>`;
          continue;
        }
        const m = cas.find(c => partirTurno(c.tid).franja === 'M'), t = cas.find(c => partirTurno(c.tid).franja === 'T');
        const lm = m && localDe(S, partirTurno(m.tid).localId), lt = t && localDe(S, partirTurno(t.tid).localId);
        const cls = m && t ? 'pP' + (lm.id !== lt.id ? ' dobla' : '') : m ? 'pM' : 'pT';
        const txt = m && t ? (lm.id !== lt.id ? `${lm.corto}+${lt.corto}` : `P·${lm.corto}`) : m ? `M·${lm.corto}` : `T·${lt.corto}`;
        const forz = cas.some(c => c.entry.forzado);
        // la otra mitad del día sin trabajo por un cierre (Hojan: El 33 por la mañana, la tarde del Mónaco
        // cerrada): un punto en la pastilla y la franja en el aviso (24/09, revisión F2)
        const edc = cierresDe(S).length ? estadoDia(S, p, d.iso) : null;
        const cieF = edc && edc.cierre && edc.cierre.tipo !== 'REFUERZA' && !edc.libra ? edc : null;
        const tip = cas.map(c => `${FRANJA_LBL[partirTurno(c.tid).franja]}: ${nombreLocal(partirTurno(c.tid).localId)}${c.entry.abre ? ' (abre)' : ''}${c.entry.cocina ? ' (cocina)' : ''}${c.entry.avisos && c.entry.avisos.length ? ' · ' + c.entry.avisos.join(', ') : ''}`).concat(cieF ? [`${cieF.cierre.franjas.map(f => FRANJA_LBL[f]).join(' y ')}: ${cieF.texto}`] : []).join('\n');
        h += `<td class="${wk.trim()}" data-asig="${p.id}|${d.iso}" role="button" tabindex="0"><span class="pill ${cls}${evPor[d.iso] ? ' ev' : ''}" style="--lc:${esc((lm || lt).color)};--lc2:${esc((lt || lm).color)}" data-tipstr="${esc(tip)}">${forz ? '<i class="fz"></i>' : ''}${cieF ? '<i class="cief"></i>' : ''}${esc(txt)}</span></td>`;
      }
      h += '</tr>';
    }
  }
  // fila de control por local
  h += `<tr class="ghdr"><td colspan="${est.days.length + 1}">Control · casillas cortas por local y día</td></tr>`;
  for (const l of S.locales) {
    h += `<tr class="frow"><td class="pname"><span class="lp" style="background:${esc(l.color)}"></span>${esc(l.nombre)}</td>`;
    for (const d of est.days) {
      let faltan = 0, sc = 0;
      for (const f of FRANJAS) { const tid = turnoId(l.id, f); if (!turnoAbierto(S, est, d.iso, tid)) continue; const r = revisarTurno(S, S.staff, est, d.iso, tid); faltan += r.faltan; if (r.sinCocina) sc++; }
      h += `<td class="${d.dow >= 6 ? 'wk' : ''}" data-irdia="${d.iso}" style="cursor:pointer">${faltan ? `<span class="cwarn" data-tipstr="faltan ${faltan}${sc ? ' · sin cocina' : ''}">${faltan}</span>` : sc ? '<span class="cwarn" data-tipstr="sin cocina">c</span>' : '<span class="cok">✓</span>'}</td>`;
    }
    h += '</tr>';
  }
  h += '</tbody></table>';
  $('#mesRoot').innerHTML = h;
  pintaRevDot();
}
function shiftMonth(dir, dayPolicy) {
  let y = S.y, m = S.m + dir;
  if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; }
  const k = mesKey(y, m);
  if (k < MIN_MONTH || k > MAX_MONTH) return false;
  S.y = y; S.m = m; cargarMes(); S.day = dayPolicy === 'last' ? est.days.length : 1; S.semLunes = mondayOf(isoDia()); saveState();
  return true;
}
$('#mPrev').addEventListener('click', () => { if (shiftMonth(-1)) renderMes(); });
$('#mNext').addEventListener('click', () => { if (shiftMonth(1)) renderMes(); });
$('#mVisible').addEventListener('click', e => { if (e.target.closest('#mVisibleBtn')) alternarPublicado([mesKey(S.y, S.m)]); });
$('#mVaciar').addEventListener('click', () => vaciarRangoUI(est.days[0].iso, est.days[est.days.length - 1].iso, `${MESES[S.m - 1]} ${S.y}`, 'el mes'));
$('#mGenerar').addEventListener('click', () => irAGenerador({ desde: est.days[0].iso, hasta: est.days[est.days.length - 1].iso, titulo: `Generar ${MESES[S.m - 1].toLowerCase()}` }));
$('#futbolBtns').addEventListener('click', e => { const b = e.target.closest('[data-futbol]'); if (!b) return; openEvento({ equipo: b.dataset.futbol || undefined, iso: isoDia() }); });
$('#mesRoot').addEventListener('click', e => {
  const ir = e.target.closest('[data-irdia]');
  if (e.target.closest('[data-evpop]')) return;   // lo atiende el detalle del evento
  if (ir && !e.target.closest('[data-asig]')) { irAIso(ir.dataset.irdia); return; }
  const au = e.target.closest('[data-mesaus]');
  if (au) { openAusenciaMes(au.dataset.mesaus, au); return; }
  const f = e.target.closest('[data-ficha]');
  if (f) { openFicha(f.dataset.ficha); return; }
  const c = e.target.closest('[data-asig]');
  if (c) { const [pid, iso] = c.dataset.asig.split('|'); openDiaPersona(pid, iso, c); }
});
// hoja de una persona en un día: sus casillas, ir al día, ausencia
function openDiaPersona(pid, iso, anchor) {
  cerrarPops();
  const p = personaDeId(pid); if (!p) return;
  const e = estadoDeIso(iso);
  const cas = casillasDe(e, iso, pid);
  const aus = ausenciaEn(p, iso);
  const pop = document.createElement('div');
  pop.className = 'pop'; pop.id = 'diaPersPop'; pop.setAttribute('role', 'dialog');
  pop.innerHTML = `<div class="ph">${esc(p.nombre)}</div><div class="pd">${fmtLargo(iso)}${aus ? ` · <b>${esc(etiquetaAusencia(aus))}</b>` : ''}</div>
    ${cas.map(c => { const { localId, franja } = partirTurno(c.tid); return `<div class="festrow" style="border-left-color:${colorLocal(localId)}"><span class="festinfo"><b>${esc(nombreLocal(localId))} · ${FRANJA_LBL[franja].toLowerCase()}</b><small>${c.entry.abre ? 'abre · ' : ''}${c.entry.cocina ? 'cocina · ' : ''}${esc(c.entry.razon || ORIGEN_LBL[c.entry.origen] || '')}</small></span><button class="festrm" data-quita="${c.tid}" aria-label="Quitar">✕</button></div>`; }).join('') || '<div class="festvacio">Sin turno este día.</div>'}
    <button class="popb full" data-dp="dia">Ir al día</button>
    ${aus ? `<button class="popb full" data-dp="quitaraus">Quitar la ausencia de este día</button>` : `<button class="popb full" data-dp="aus">Marcar ausencia</button>`}
    ${cas.length ? `<button class="popb full rec" data-dp="cobertura">Buscar quién cubre este día…</button>` : ''}
    ${S.locales.map(l => FRANJAS.filter(f => turnoAbierto(S, e, iso, turnoId(l.id, f)) && !cas.some(c => c.tid === turnoId(l.id, f))).map(f => `<button class="popb full" data-pon="${turnoId(l.id, f)}" style="border-left:4px solid ${esc(l.color)}">Poner en ${esc(l.nombre)} · ${FRANJA_LBL[f].toLowerCase()}</button>`).join('')).join('')}`;
  document.body.appendChild(pop);
  colocarPop(pop, anchor);
  cierraFuera(pop);
  pop.addEventListener('click', ev => {
    const q = ev.target.closest('[data-quita]');
    if (q) { pop.remove(); pushUndo(`quitar a ${p.nombre}`); if (desasignarUI(iso, q.dataset.quita, pid)) renderVistaActiva(); return; }
    const pon = ev.target.closest('[data-pon]');
    if (pon) {
      pop.remove();
      const tid = pon.dataset.pon;
      const r0 = puedeEstar(S, S.staff, e, iso, tid, pid, { permitirPartido: true });
      let opts = { origen: 'manual', permitirPartido: true };
      // el aviso nombra la regla, no solo el motivo (Diego, 18/09); desde la revisión F4, TODAS las que se
      // incumplirían forzándola, cada una con la suya (siSeFuerza, como el selector)
      const f = r0.ok ? null : siSeFuerza(S, S.staff, e, iso, tid, pid, { permitirPartido: true });
      const inc = f && f.forzable && f.incumple.length ? f.incumple : (r0.ok ? [] : [{ k: r0.regla, motivo: r0.motivo }]);
      if (!r0.ok) { if (!confirm(`${p.nombre} incumpliría ${inc.length > 1 ? 'estas reglas' : 'esta regla'}:\n\n${lineasIncumple(inc)}\n\n¿Ponerlo de todas formas? Quedará constancia.`)) return; opts.forzar = true; opts.razon = `forzado desde el mes · ${inc.map(x => nombreRegla(x.k)).join(', ')}`; }
      pushUndo(`poner a ${p.nombre}`);
      const r = asignarUI(iso, tid, pid, opts);
      if (r.ok) { renderVistaActiva(); toast(r.avisos.length ? `Con aviso: ${conSuRegla(r.avisos, f ? f.incumple : [])}` : 'Añadido', r.avisos.length ? 'warn' : 'ok'); } else toast(r.motivo, 'bad');
      return;
    }
    const b = ev.target.closest('[data-dp]'); if (!b) return;
    pop.remove();
    if (b.dataset.dp === 'dia') irAIso(iso);
    else if (b.dataset.dp === 'aus') openAusenciaMes(pid, anchor, iso);
    else if (b.dataset.dp === 'cobertura') openCobertura({ pid, tipo: 'LD', dias: [iso] });
    else if (b.dataset.dp === 'quitaraus') { pushUndo('quitar ausencia', { staff: true }); p.ausencias = quitarDiaDeAusencia(p.ausencias, iso); registrarCambio(`Ausencia retirada: ${p.nombre} el ${fmtDM(iso)}`, 'aus'); saveState(); renderVistaActiva(); }
  });
}
function openAusenciaMes(pid, anchor, iso0) {
  cerrarPops();
  const p = personaDeId(pid); if (!p) return;
  const d1 = iso0 || isoDia();
  const pop = document.createElement('div');
  pop.className = 'pop'; pop.id = 'ausPop'; pop.setAttribute('role', 'dialog');
  pop.innerHTML = `<div class="ph">Ausencia de ${esc(p.nombre)}</div>
    <div class="austipos" style="display:flex;flex-wrap:wrap;gap:5px;margin:8px 0">${TIPOS_AUSENCIA.map((t, i) => `<button type="button" class="austipo abschip a-${t.id}${i === 1 ? ' on' : ''}" data-tipo="${t.id}" style="${i === 1 ? 'outline:2px solid var(--ink)' : ''}">${esc(t.label)}</button>`).join('')}</div>
    <div class="row2" style="display:grid;grid-template-columns:1fr 1fr;gap:6px"><label class="pinlbl">Desde<input type="date" id="ausD1" class="logininp" value="${d1}"></label><label class="pinlbl">Hasta<input type="date" id="ausD2" class="logininp" value="${d1}"></label></div>
    <label class="pinlbl">Cuándo${selFranjaAusencia('id="ausFr" class="logininp"')}</label>
    <label class="pinlbl">Detalle (opcional)<input type="text" id="ausDet" class="logininp" placeholder="p. ej. boda, médico"></label>
    <button class="popb full rec" id="ausOk">Guardar ausencia</button>`;
  document.body.appendChild(pop);
  colocarPop(pop, anchor);
  cierraFuera(pop);
  let tipo = 'VAC';
  pop.addEventListener('click', ev => {
    const t = ev.target.closest('[data-tipo]');
    if (t) { tipo = t.dataset.tipo; pop.querySelectorAll('[data-tipo]').forEach(x => { x.style.outline = x === t ? '2px solid var(--ink)' : ''; }); if (tipo === 'BAJ') pop.querySelector('#ausD2').value = ''; return; }
    if (ev.target.id === 'ausOk') {
      const desde = pop.querySelector('#ausD1').value, hasta = pop.querySelector('#ausD2').value || undefined, detalle = pop.querySelector('#ausDet').value.trim();
      // revisión F3b: la franja (D10), con el mismo selector que la ficha y la tarjeta: desde el Mes no se podía
      // apuntar «solo tarde»
      const fr = (pop.querySelector('#ausFr') || {}).value;
      if (!desde) { toast('Falta la fecha de inicio', 'warn'); return; }
      // 24/09 (D13): la misma alta que Equipo y la ficha (altaAusenciaUI): en días ya planificados sale de sus
      // turnos y entra quien le cubre por «cubre a», con la confirmación y un solo Ctrl+Z. Aquí se copiaba la
      // regla y solo quitaba a la persona.
      pop.remove();
      altaAusenciaUI(pid, { tipo, desde, hasta, detalle, franjas: fr ? [fr] : undefined }, () => renderVistaActiva());
    }
  });
}
