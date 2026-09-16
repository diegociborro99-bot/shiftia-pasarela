// ================= VISTA HOY =================
// Las cuatro casillas de la mañana y las cuatro de la tarde del día en pantalla,
// con el orden real de la planilla: quien abre va el primero y la cocina en su
// posición. Es la pantalla que el encargado abre cada mañana.
const ORIGEN_LBL = { patron: 'semana tipo', generador: 'generador', manual: 'a mano', nucleo: 'núcleo', refuerzo: 'refuerzo', cubre: 'cobertura', cobertura: 'gestor de cobertura' };

function chipPersona(iso, tid, s, opts) {
  const p = personaDeId(s.pid); if (!p) return '';
  const est = estadoDeIso(iso);
  const e = asignados(est, iso, tid).find(x => x.pid === s.pid) || {};
  const { localId: lid, franja: fr } = partirTurno(tid);
  // el tramo del partido de esa persona ese día: quien abre una franja entra a abrir
  const hTramo = s.partido && !s.continuo ? horarioDe(localDe(S, lid), isoDow(iso), fr, true, turnoDelDia(S, est, iso, s.pid).abre) : null;
  const razon = [e.razon, e.avisos && e.avisos.length ? 'aviso: ' + e.avisos.join(', ') : '', s.supuesto ? 'plaza supuesta (pendiente de confirmar con el grupo)' : '', s.continuo ? 'turno continuo: abre la mañana y la tarde del mismo local' : s.partido ? `partido: mañana y tarde${hTramo ? ` · este tramo, ${hTramo.ini}–${hTramo.fin}` : ''}` : '', s.comodin ? 'comodín (sin local fijo)' : '', `origen: ${ORIGEN_LBL[s.origen] || s.origen || 'a mano'}`].filter(Boolean).join('\n');
  return `<span class="pchip${s.forzado ? ' forzado' : ''}${s.abre ? ' primero' : ''}" data-pid="${s.pid}" data-turno="${iso}|${tid}" style="--pc:${avColor(s.pid)}" data-tipstr="${esc(razon)}" role="button" tabindex="0">
    <span class="pos">${s.pos}</span><span class="avq">${esc(initials(p.nombre))}</span><span class="pnom">${s.abreFijo ? '<i class="mk fijo" title="sale el primero (fijo)">▸</i>' : ''}${esc(p.nombre)}${s.por ? `<small class="por">por ${esc(nombreCorto(nombrePid(s.por)))}</small>` : s.nota ? `<small class="por">${esc(s.nota)}</small>` : ''}</span>
    ${s.abre ? '<span class="bdg abre">ABRE</span>' : ''}${s.cocina ? `<span class="bdg cocina">${SVG_COCINA} COCINA</span>` : ''}${s.continuo ? '<span class="bdg cont" title="turno continuo: abre mañana y tarde">C</span>' : s.partido ? '<span class="bdg part" title="partido: mañana y tarde">P</span>' : ''}${s.comodin ? '<span class="bdg com" title="comodín">□</span>' : ''}${s.forzado ? '<span class="bdg forz" title="Asignación forzada: rompe una regla">!</span>' : ''}${s.supuesto ? '<span class="bdg sup" title="Supuesto: pendiente de confirmar">?</span>' : ''}${s.origen === 'refuerzo' ? '<span class="bdg ref">REFUERZO</span>' : ''}
    ${opts && opts.soloLectura ? '' : `<button class="rmx" data-un="${iso}|${tid}|${s.pid}" aria-label="Quitar a ${esc(p.nombre)}">×</button>`}
  </span>`;
}
// la 1.ª posición sin nadie que pueda abrir: hueco disponible (prototipo del 11/09)
function chipHueco(iso, tid, s, opts) {
  const { franja } = partirTurno(tid);
  return `<span class="pchip hueco" ${opts && opts.soloLectura ? '' : `data-pick="${iso}|${tid}" role="button" tabindex="0" aria-haspopup="true"`} data-tipstr="${esc(s.motivo || '')}">
    <span class="pos">${s.pos}</span><span class="pnom"><b>Hueco disponible</b><small class="por">abre la ${FRANJA_LBL[franja].toLowerCase()} · turno completo${s.motivo ? ' — ' + esc(s.motivo.replace(/^nadie de la casilla puede abrir:?\s*/i, '')) : ''}</small></span>
  </span>`;
}
function htmlCasilla(iso, tid, opts) {
  const e = estadoDeIso(iso);
  const { localId, franja } = partirTurno(tid);
  const l = localDe(S, localId);
  const abierto = turnoAbierto(S, e, iso, tid);
  const lista = asignados(e, iso, tid);
  const r = revisarTurno(S, S.staff, e, iso, tid);
  const h = horarioDe(l, isoDow(iso), franja);
  const cab = `<div class="cashd"><span class="fr">${FRANJA_LBL[franja]}</span>
    ${abierto ? `<span class="cnt ${r.faltan ? 'falta' : 'ok'}" data-tipstr="${r.faltan ? esc('Faltan ' + r.faltan) : 'Mínimo cubierto'}">${lista.length}/${r.minimo}</span>` : ''}
    ${abierto && r.supuesto ? '<span class="sup" data-tipstr="Mínimo supuesto por Highkey Labs: pendiente de confirmar con el grupo">supuesto</span>' : ''}
    ${abierto && r.refuerzo ? `<span class="ref" data-tipstr="${esc('Refuerzo: +' + r.refuerzo + ' por ' + minimoDe(S, iso, tid).eventos.map(x => x.nombre).join(', '))}">+${r.refuerzo}</span>` : ''}
    ${abierto && r.sinCocina ? `<span class="bdg ${r.cocinaObligatoria ? 'forz' : 'sup'}" data-tipstr="${r.cocinaObligatoria ? 'La cocina es obligatoria en este local' : 'Este local suele llevar cocina'}">sin cocina</span>` : ''}
    ${abierto && r.sinAbre ? '<span class="bdg forz" data-tipstr="' + esc(r.motivoAbre || '') + '">hueco</span>' : ''}
    ${h ? `<span class="hor">${esc(h.ini)}–${esc(h.fin)}${l.horarioSupuesto ? '*' : ''}</span>` : ''}</div>`;
  if (!abierto) return `<div class="casilla cerrada">${cab}<div class="cascerr">Cerrado ${DOW_PL[isoDow(iso)].replace('los ', 'el ')} ${opts && opts.soloLectura ? '' : `<button data-abrir="${iso}|${tid}">abrir hoy</button>`}</div></div>`;
  let cuerpo = posicionesDe(S, S.staff, e, iso, tid).map(x => x.hueco ? chipHueco(iso, tid, x, opts) : chipPersona(iso, tid, x, opts)).join('');
  if (!(opts && opts.soloLectura)) {
    if (r.faltan) {
      cuerpo += `<button class="addchip corta" data-pick="${iso}|${tid}" aria-haspopup="true">＋ Asignar · faltan ${r.faltan}</button>`;
      const c = candidatosPara(S, S.staff, e, iso, tid)[0];
      if (c) cuerpo += `<button class="addchip sust" data-sust="${iso}|${tid}|${c.pid}" title="${esc(c.razones.join(' · '))}">★ ${esc(nombreCorto(c.nombre))}</button>`;
    } else cuerpo += `<button class="addchip" data-pick="${iso}|${tid}" aria-haspopup="true">＋ Añadir</button>`;
  }
  return `<div class="casilla${r.faltan ? ' corta' : ''}" data-cas="${iso}|${tid}">${cab}<div class="caslista">${cuerpo}</div></div>`;
}
function htmlLocal(iso, l, opts) {
  return `<div class="loccard" style="--lc:${esc(l.color)}">
    <div class="lochd"><span class="ldot"></span><b>${esc(l.nombre)}</b>
      <span class="lmini">${opts && opts.soloLectura ? '' : `<button class="btn-mini ghost" data-printlocal="${l.id}" title="Imprimir la semana de este local">Imprimir</button><button class="btn-mini ghost" data-sharelocal="${l.id}" title="Imagen de la semana de este local para WhatsApp">Compartir</button>`}</span></div>
    ${htmlCasilla(iso, turnoId(l.id, 'M'), opts)}${htmlCasilla(iso, turnoId(l.id, 'T'), opts)}
  </div>`;
}
function renderDia() {
  const d = est.days[S.day - 1];
  const iso = d.iso;
  const hoy = isoHoy();
  $('#dKick').textContent = `${DIAS_L[d.dow]} · semana del ${fmtDM(mondayOf(iso))}${d.festivo ? ' · festivo' : ''}`;
  $('#dTitle').innerHTML = `<b>${d.d}</b> de ${MESES[S.m - 1].toLowerCase()} <small>${S.y}</small>${iso === hoy ? ' <span class="dchip dc-hoy">HOY</span>' : ` <span class="dchip dc-otro" title="Hoy es ${esc(fmtLargo(hoy))}">${esc(distanciaHoy(iso))}</span>`}${d.dow >= 6 ? ' <span class="dchip dc-finde">FIN DE SEMANA</span>' : ''}`;
  $('#dHoy').classList.toggle('lejos', iso !== hoy);
  $('#stKick').textContent = DIAS_L[d.dow]; $('#stTitle').textContent = `${d.d} de ${MESES[S.m - 1].toLowerCase()}`;
  // estadísticas del día
  let abiertos = 0, cortos = 0, sinCocina = 0, personas = new Set(), forzados = 0;
  for (const t of turnosDe(S)) {
    if (!turnoAbierto(S, est, iso, t.id)) continue;
    abiertos++;
    const r = revisarTurno(S, S.staff, est, iso, t.id);
    if (r.faltan) cortos++; if (r.sinCocina) sinCocina++; forzados += r.forzados;
    for (const x of asignados(est, iso, t.id)) personas.add(x.pid);
  }
  const ausentes = S.staff.filter(p => ausenciaEn(p, iso));
  $('#dStats').innerHTML = `<span class="dstat"><b>${abiertos}</b> casillas</span><span class="dstat ${cortos ? 'warn' : 'ok'}"><b>${cortos}</b> cortas</span><span class="dstat ${sinCocina ? 'warn' : 'ok'}"><b>${sinCocina}</b> sin cocina</span><span class="dstat"><b>${personas.size}</b> personas</span>${forzados ? `<span class="dstat sal"><b>${forzados}</b> forzadas</span>` : ''}`;
  // eventos del día y avisos
  const evs = eventosDe(S, iso);
  const rev = revisionMes(S, S.staff, est, { desde: iso, hasta: iso }).filter(x => x.nivel === 'alta');
  $('#diaWarn').innerHTML = (evs.length ? `<div class="evrow">${evs.map(chipEvento).join('')}</div>` : '') +
    (rev.length ? `<div class="warnbanner"><b>${pl(rev.length, 'aviso importante', 'avisos importantes')} hoy</b>${rev.slice(0, 4).map(x => esc(x.msg)).join(' · ')}${rev.length > 4 ? ` · y ${rev.length - 4} más` : ''}</div>` : '');
  $('#diaLocales').innerHTML = S.locales.map(l => htmlLocal(iso, l)).join('');
  // lateral
  const libres = activos().filter(p => !ausenciaEn(p, iso) && !turnosDe(S).some(t => pidsEn(est, iso, t.id).includes(p.id)));
  $('#diaSide').innerHTML = `
    <div class="scard"><span class="micro">Ausentes hoy · ${ausentes.length}</span><div class="lst">${ausentes.map(p => { const a = ausenciaEn(p, iso); return `<div class="srow"><span class="av" style="background:${avColor(p.id)};width:24px;height:24px;font-size:9px">${esc(initials(p.nombre))}</span><span class="nm">${esc(p.nombre)}</span><span class="abschip a-${esc(a.tipo)}">${esc((AUS_LBL[a.tipo] || {}).label || a.tipo)}</span></div>`; }).join('') || '<div class="szero">Nadie ausente.</div>'}</div></div>
    <div class="scard"><span class="micro">Libran hoy · ${libres.length}</span><div class="lst">${libres.map(p => `<div class="srow"><span class="av" style="background:${avColor(p.id)};width:24px;height:24px;font-size:9px">${esc(initials(p.nombre))}</span><span class="nm">${esc(p.nombre)}</span><small>${(p.libra || []).includes(d.dow) ? 'libra ' + DOW_PL[d.dow] : 'sin turno'}</small></div>`).join('') || '<div class="szero">Todo el equipo trabaja hoy.</div>'}</div></div>
    <div class="scard"><span class="micro">Semana tipo</span><p class="szero">El generador parte de la semana tipo del grupo y rellena lo que falte. <button class="glink" data-irgen="${iso}">Completar este día</button></p></div>`;
  $('#dSticky').classList.toggle('on', scrollY > 235 && !$('#view-hoy').classList.contains('hidden'));
  pintaRevDot();
}
function chipEvento(ev) {
  const eq = (S.equipos || []).find(x => x.id === ev.equipo);
  const color = (eq && eq.color) || '#1a5a96';
  const ref = Object.entries(ev.refuerzo || {}).filter(([, n]) => n > 0).map(([lid, n]) => `${(localDe(S, lid) || { corto: lid }).corto} +${n}`).join(' · ');
  return `<span class="evchip" style="--ec:${esc(color)}" data-ev="${esc(ev.id)}" data-evpop="${esc(ev.iso)}" role="button" tabindex="0" title="Ver o quitar el evento" data-tipstr="${esc((ev.hora ? ev.hora + ' · ' : '') + (ref || 'sin refuerzo'))}"><i>${ev.tipo === 'partido' ? '⚽' : '★'}</i>${esc(ev.nombre)}<small>${esc(ref)}</small><button class="rmx" data-rmev="${esc(ev.id)}" aria-label="Quitar evento">×</button></span>`;
}
// delegación de la vista Hoy (y de cualquier casilla pintada con htmlCasilla)
document.addEventListener('click', e => {
  const un = e.target.closest('[data-un]');
  if (un) {
    e.stopPropagation();
    const [iso, tid, pid] = un.dataset.un.split('|');
    if (matchMedia('(hover:none)').matches && !confirm(`¿Quitar a ${nombrePid(pid)} de esta casilla?`)) return;
    pushUndo(`quitar a ${nombrePid(pid)}`);
    if (desasignarUI(iso, tid, pid)) { renderVistaActiva(); toast(`${nombrePid(pid)} fuera de la casilla · Ctrl+Z para deshacer`, 'warn'); }
    return;
  }
  const pk = e.target.closest('[data-pick]');
  if (pk) { const [iso, tid] = pk.dataset.pick.split('|'); openPicker(iso, tid, pk); return; }
  const su = e.target.closest('[data-sust]');
  if (su) {
    const [iso, tid, pid] = su.dataset.sust.split('|');
    pushUndo(`poner a ${nombrePid(pid)}`);
    const c = candidatosPara(S, S.staff, estadoDeIso(iso), iso, tid).find(x => x.pid === pid);
    const r = asignarUI(iso, tid, pid, { origen: 'manual', razon: c ? c.razones.join(' · ') : 'recomendado' });
    if (r.ok) { renderVistaActiva(); toast(`${nombrePid(pid)} añadido`, 'ok'); } else toast(r.motivo, 'bad');
    return;
  }
  const ab = e.target.closest('[data-abrir]');
  if (ab) {
    const [iso, tid] = ab.dataset.abrir.split('|');
    pushUndo('abrir casilla');
    toggleApertura(estadoDeIso(iso, true), iso, tid, S);
    registrarCambio(`Casilla abierta a mano: ${nombreLocal(partirTurno(tid).localId)} ${FRANJA_LBL[partirTurno(tid).franja].toLowerCase()} del ${fmtDM(iso)}`, 'cambio');
    saveState(); renderVistaActiva();
    return;
  }
  const ch = e.target.closest('.pchip[data-turno]');
  if (ch && !e.target.closest('.rmx')) { const [iso, tid] = ch.dataset.turno.split('|'); openMenuTurno(iso, tid, ch.dataset.pid, ch); return; }
  const pr = e.target.closest('[data-printlocal]');
  if (pr) { if (typeof abrirImpresionLocal === 'function') abrirImpresionLocal(pr.dataset.printlocal); return; }
  const sh = e.target.closest('[data-sharelocal]');
  if (sh) { if (typeof compartirSemana === 'function') compartirSemana(sh.dataset.sharelocal); return; }
  const ig = e.target.closest('[data-irgen]');
  if (ig) { irAGenerador({ desde: ig.dataset.irgen, hasta: ig.dataset.irgen, titulo: 'Completar el día' }); return; }
  const rm = e.target.closest('[data-rmev]');
  if (rm) {
    const ev = (S.eventos || []).find(x => x.id === rm.dataset.rmev); if (!ev) return;
    if (!confirm(`¿Quitar «${ev.nombre}» del ${fmtDM(ev.iso)}? Los refuerzos ya asignados se quedan en la casilla.`)) return;
    cerrarPops();
    pushUndo('quitar evento', { eventos: true });
    S.eventos = S.eventos.filter(x => x.id !== ev.id);
    registrarCambio(`Evento retirado: ${ev.nombre} (${fmtDM(ev.iso)})`, 'cambio');
    saveState(); renderVistaActiva();
    toast(`«${ev.nombre}» quitado del ${fmtDM(ev.iso)} · Ctrl+Z para deshacer`, 'warn');
    return;
  }
});
$('#dEvento').addEventListener('click', () => openEvento({ iso: isoDia() }));
$('#dGenerar').addEventListener('click', () => irAGenerador({ desde: isoDia(), hasta: isoDia(), titulo: 'Completar el día' }));
