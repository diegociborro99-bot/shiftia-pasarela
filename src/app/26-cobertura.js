// ================= GESTOR DE COBERTURA =================
// Pensado como el papel del encargado (reunión del 15/09): se mira la planilla, se
// pulsa a la persona que va a faltar, se marcan los días en una tira de dos semanas
// (cada día enseña sus turnos) y se pide «buscar quién cubre». La app propone el
// plan A (recomendado) y el plan B (alternativa) día a día: quién sale, quién entra
// y en qué turno, con marcas y avisos, o el hueco que queda y por qué. Al confirmar
// se aplica: la ausencia queda en la ficha, la persona sale de esos turnos y quien
// cubre entra con «por X». Ctrl+Z lo deshace. La misma hoja vive en la pestaña
// Cobertura (con selector de persona) y se abre desde Hoy, Semana y Mes.
const COB = { pid: null, tipo: 'LD', dias: [], base: null, franjas: [], detalle: '', sinFin: false, siempre: false, intercambio: true, res: null, aplicado: null, ovl: null };
const COB_TIPO_LBL = { BAJ: 'Baja', VAC: 'Vacaciones', LD: 'Día libre', PERM: 'Permiso', OTRO: 'Otro motivo', CAMBIO: 'Cambio de turno' };
function resetCob(o) {
  const x = o || {};
  COB.res = null; COB.aplicado = null; COB.ovl = null;
  if (x.pid) COB.pid = x.pid;
  if (x.tipo) COB.tipo = x.tipo;
  COB.dias = (x.dias || (x.desde ? [...rangoIso(x.desde, x.hasta || x.desde)] : [])).slice().sort();
  COB.base = mondayOf(COB.dias[0] || x.desde || isoDia());
  COB.franjas = x.franjas ? x.franjas.slice() : [];
  COB.detalle = ''; COB.sinFin = false;
}
// pestaña Cobertura
function irACobertura(o) { resetCob(o); switchTab('cobertura'); }
// desde Hoy, Semana o Mes: la misma hoja en una capa; al confirmar vuelve a la planilla
function openCobertura(o) {
  resetCob(o);
  const ov = abrirOverlay('cobOvl', '<div id="cobOvlBody"></div>', { ancho: 1000 });
  COB.ovl = ov;
  pintaCob(ov.querySelector('#cobOvlBody'), 'ovl');
}
// estado «virtual» de un rango de días (puede cruzar de mes): cada día apunta a los
// objetos del mes al que pertenece; escribible=true los crea si faltan
function estadoRango(desde, hasta, escribible) {
  const e = { y: +desde.slice(0, 4), m: +desde.slice(5, 7), days: [], asig: {}, apertura: {}, manual: {}, festivos: [], virtual: true };
  let n = 0;
  for (const iso of rangoIso(desde, hasta)) {
    if (++n > 62) break;
    const me = estadoDeIso(iso, escribible);
    e.days.push(me.days.find(x => x.iso === iso));
    if (escribible) { me.asig[iso] = me.asig[iso] || {}; me.apertura[iso] = me.apertura[iso] || {}; me.manual = me.manual || {}; me.manual[iso] = me.manual[iso] || {}; }
    if (me.asig[iso]) e.asig[iso] = me.asig[iso];
    if (me.apertura[iso]) e.apertura[iso] = me.apertura[iso];
    if (me.manual && me.manual[iso]) e.manual[iso] = me.manual[iso];
    if (me.festivos) for (const f of me.festivos) if (!e.festivos.includes(f)) e.festivos.push(f);
  }
  return e;
}
function incidenciaActual() {
  const dias = COB.dias.slice().sort();
  const inc = { pid: COB.pid, tipo: COB.tipo, dias, desde: dias[0], hasta: dias[dias.length - 1] };
  if (COB.tipo === 'BAJ' && COB.sinFin) inc.sinFin = true;
  if (COB.franjas.length === 1) inc.franjas = COB.franjas.slice();
  if (COB.detalle && COB.tipo !== 'CAMBIO') inc.detalle = COB.detalle;
  return inc;
}
// turnos de una persona un día (para la tira de días)
function turnosDia(pid, iso) {
  const e = estadoDeIso(iso);
  return turnosDe(S).filter(t => pidsEn(e, iso, t.id).includes(pid)).map(t => { const en = asignados(e, iso, t.id).find(x => x.pid === pid); return { tid: t.id, localId: t.localId, franja: t.franja, cocina: !!en.cocina, abre: primeroDe(S, S.staff, e, iso, t.id) === pid }; });
}
function renderCobertura() { pintaCob($('#cobRoot'), 'tab'); }
function pintaCob(root, modo) {
  const personas = activos().slice().sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  if (!COB.pid || !personas.some(p => p.id === COB.pid)) COB.pid = personas[0] ? personas[0].id : null;
  if (!COB.base) COB.base = mondayOf(isoDia());
  const p = personaDeId(COB.pid);
  const cambio = COB.tipo === 'CAMBIO';
  const hoy = isoHoy();
  const dias = []; for (let k = 0; k < 14; k++) dias.push(addDias(COB.base, k));
  const fin = dias[13];
  const celda = iso => {
    const ts = p ? turnosDia(p.id, iso) : [];
    const aus = p ? ausenciaEn(p, iso) : null;
    const libra = p && (p.libra || []).includes(isoDow(iso));
    const on = COB.dias.includes(iso);
    const dots = ts.map(t => `<i style="--lc:${colorLocal(t.localId)}" title="${esc(nombreLocal(t.localId) + ' · ' + FRANJA_LBL[t.franja].toLowerCase() + (t.abre ? ' · abre' : '') + (t.cocina ? ' · cocina' : ''))}">${t.franja}${t.cocina ? '◆' : ''}</i>`).join('');
    const pie = aus ? `<em class="a-${esc(aus.tipo)}">${esc((AUS_LBL[aus.tipo] || {}).label || aus.tipo)}</em>` : ts.length ? dots : `<em>${libra ? 'libra' : 'sin turno'}</em>`;
    return `<button type="button" class="cobday${on ? ' on' : ''}${iso === hoy ? ' hoy' : ''}${iso < hoy ? ' pasado' : ''}${ts.length ? '' : ' vacio'}${isoDow(iso) >= 6 ? ' finde' : ''}" data-dia="${iso}" aria-pressed="${on ? 'true' : 'false'}" title="${esc(fmtLargo(iso))}"><small>${DIAS_L[isoDow(iso)].slice(0, 3)}</small><b>${+iso.slice(8, 10)}</b><span class="cobdots">${pie}</span></button>`;
  };
  const nTurnos = p ? COB.dias.reduce((a, iso) => a + turnosDia(p.id, iso).filter(t => !COB.franjas.length || COB.franjas.includes(t.franja)).length, 0) : 0;
  root.innerHTML = `<div class="cobsheet">
    ${modo === 'tab' ? `<div class="cobpick" role="listbox" aria-label="Persona">${personas.map(q => `<button type="button" class="cobpk${q.id === COB.pid ? ' on' : ''}" data-pk="${esc(q.id)}" style="--pc:${avColor(q.id)}" role="option" aria-selected="${q.id === COB.pid}"><span class="av">${esc(initials(q.nombre))}</span>${esc(nombreCorto(q.nombre))}</button>`).join('')}</div>` : ''}
    ${p ? `<div class="cobhead">
      <span class="av cobav" style="background:${avColor(p.id)}">${esc(initials(p.nombre))}</span>
      <div class="cobwho"><span class="micro">QUIÉN VA A FALTAR</span><b>${esc(p.nombre)}</b><small>${esc((PUESTOS.find(x => x.id === p.puesto) || {}).label || '')} · ${esc((p.locales || []).length ? p.locales.map(nombreLocal).join(', ') : 'comodín, cualquier local')}${(p.libra || []).length ? ' · libra ' + p.libra.map(d => DIAS_L[d].toLowerCase()).join(' y ') : ''}</small>${modo === 'ovl' ? `<select class="logininp cobsel2" id="cobPid" data-libre aria-label="Cambiar de persona">${personas.map(q => `<option value="${esc(q.id)}"${q.id === COB.pid ? ' selected' : ''}>${esc(q.nombre)}</option>`).join('')}</select>` : ''}</div>
      <div class="cobtipos" role="radiogroup" aria-label="Qué le pasa"><span class="micro">QUÉ LE PASA</span>${TIPOS_INCIDENCIA.map(t => `<button type="button" class="abschip a-${esc(t.id)}${COB.tipo === t.id ? ' on' : ''}" data-tipo="${esc(t.id)}" role="radio" aria-checked="${COB.tipo === t.id}">${esc(t.label)}</button>`).join('')}</div>
    </div>` : '<div class="genvacio">No hay nadie en activo.</div>'}
    <div class="cobdias">
      <div class="cobdh">
        <div class="arrows"><button type="button" class="mbtn" data-cobnav="-7" aria-label="Semana anterior">‹</button><button type="button" class="mbtn" data-cobnav="hoy" title="Semana de hoy">Hoy</button><button type="button" class="mbtn" data-cobnav="7" aria-label="Semana siguiente">›</button></div>
        <div><span class="dkick">${cambio ? 'Marca el día del turno que cambia' : 'Marca los días que falta'}</span><div class="dbig cobdbig"><b>${+COB.base.slice(8, 10)}${+COB.base.slice(5, 7) !== +fin.slice(5, 7) ? ' ' + MES3[+COB.base.slice(5, 7) - 1] : ''} – ${+fin.slice(8, 10)} de ${MESES[+fin.slice(5, 7) - 1].toLowerCase()}</b></div></div>
        <span class="cobcount${COB.dias.length ? ' on' : ''}">${COB.dias.length ? `${pl(COB.dias.length, 'día marcado', 'días marcados')} · ${pl(nTurnos, 'turno', 'turnos')}` : 'ningún día marcado'}</span>
        <div class="cobquick"><button type="button" class="btn-mini ghost" data-cobsel="semana">Toda la semana</button><button type="button" class="btn-mini ghost" data-cobsel="ninguno" ${COB.dias.length ? '' : 'disabled'}>Quitar la selección</button></div>
      </div>
      <div class="cobstrip">${dias.map(celda).join('')}</div>
      <div class="cobleg"><span><i class="cobli" style="--lc:var(--ink3)">M</i> mañana · <i class="cobli" style="--lc:var(--ink3)">T◆</i> tarde con cocina, en el color del local</span><span><em>libra</em> / <em>sin turno</em> no hace falta cubrir nada</span><span class="cobli2">pulsa un día para marcarlo o quitarlo</span></div>
    </div>
    <div class="cobopts">
      <div class="cobfr" role="group" aria-label="Turnos afectados"><span class="micro">${cambio ? 'QUÉ TURNO' : 'TURNOS AFECTADOS'}</span><button type="button" class="dowk${!COB.franjas.length ? ' on' : ''}" data-fr="">Todos</button><button type="button" class="dowk${COB.franjas.length === 1 && COB.franjas[0] === 'M' ? ' on' : ''}" data-fr="M">Mañana</button><button type="button" class="dowk${COB.franjas.length === 1 && COB.franjas[0] === 'T' ? ' on' : ''}" data-fr="T">Tarde</button></div>
      ${COB.tipo === 'BAJ' ? `<label class="genopt"><input type="checkbox" id="cobSinFin" ${COB.sinFin ? 'checked' : ''} data-libre> <span><b>Baja sin fecha de fin</b> · queda abierta desde el primer día marcado; se cubren los días marcados</span></label>` : ''}
      ${cambio ? `<label class="genopt"><input type="checkbox" id="cobInter" ${COB.intercambio ? 'checked' : ''} data-libre> <span><b>Proponer intercambio</b> · a cambio, ${p ? esc(nombreCorto(p.nombre)) : 'la persona'} hace un turno cercano de quien le cubre</span></label>` : `<label class="pinlbl cobdet">Detalle <small>(opcional)</small><input type="text" id="cobDet" class="logininp" value="${esc(COB.detalle)}" placeholder="p. ej. médico, boda" data-libre></label>`}
      <label class="genopt"><input type="checkbox" id="cobSiempre" ${COB.siempre ? 'checked' : ''} data-libre> <span><b>Reemplazar siempre</b> · aunque la casilla siga completa sin esa persona</span></label>
      <button class="btn btn-cta cobgo" id="cobProponer" ${p && COB.dias.length ? '' : 'disabled'}>✦ Buscar quién cubre${nTurnos ? ` (${pl(nTurnos, 'turno', 'turnos')})` : ''}</button>
    </div>
    <div class="genres" id="cobRes">${COB.aplicado ? htmlCoberturaAplicada(COB.aplicado) : COB.res ? htmlPlanesCobertura(COB.res) : ''}</div>
  </div>`;
  const repinta = () => pintaCob(root, modo);
  const sel = root.querySelector('#cobPid'); if (sel) sel.addEventListener('change', e => { COB.pid = e.target.value; COB.res = null; COB.aplicado = null; repinta(); });
  const sf = root.querySelector('#cobSinFin'); if (sf) sf.addEventListener('change', e => { COB.sinFin = e.target.checked; COB.res = null; });
  const det = root.querySelector('#cobDet'); if (det) det.addEventListener('input', e => { COB.detalle = e.target.value; });
  root.querySelector('#cobSiempre').addEventListener('change', e => { COB.siempre = e.target.checked; COB.res = null; repinta(); });
  const inter = root.querySelector('#cobInter'); if (inter) inter.addEventListener('change', e => { COB.intercambio = e.target.checked; COB.res = null; repinta(); });
  root.querySelector('.cobsheet').addEventListener('click', e => {   // en el contenedor recién pintado: no se acumula
    const pk = e.target.closest('[data-pk]');
    if (pk) { COB.pid = pk.dataset.pk; COB.res = null; COB.aplicado = null; repinta(); return; }
    const t = e.target.closest('[data-tipo]');
    if (t) { COB.tipo = t.dataset.tipo; if (COB.tipo === 'CAMBIO' && COB.dias.length > 1) COB.dias = [COB.dias[0]]; COB.res = null; COB.aplicado = null; repinta(); return; }
    const d = e.target.closest('[data-dia]');
    if (d) {
      const iso = d.dataset.dia;
      if (COB.tipo === 'CAMBIO') COB.dias = COB.dias.includes(iso) ? [] : [iso];
      else if (COB.dias.includes(iso)) COB.dias = COB.dias.filter(x => x !== iso); else COB.dias = COB.dias.concat(iso).sort();
      COB.res = null; COB.aplicado = null; repinta(); return;
    }
    const nav = e.target.closest('[data-cobnav]');
    if (nav) { COB.base = nav.dataset.cobnav === 'hoy' ? mondayOf(isoHoy()) : addDias(COB.base, +nav.dataset.cobnav); repinta(); return; }
    const qs = e.target.closest('[data-cobsel]');
    if (qs) {
      if (qs.dataset.cobsel === 'ninguno') COB.dias = [];
      else { const sem = []; for (let k = 0; k < 7; k++) sem.push(addDias(COB.base, k)); COB.dias = COB.tipo === 'CAMBIO' ? [sem[0]] : [...new Set(COB.dias.concat(sem))].sort(); }
      COB.res = null; COB.aplicado = null; repinta(); return;
    }
    const fr = e.target.closest('[data-fr]');
    if (fr) { COB.franjas = fr.dataset.fr ? [fr.dataset.fr] : []; COB.res = null; repinta(); return; }
    if (e.target.id === 'cobProponer') { proponerCobertura(root, modo); return; }
    const ap = e.target.closest('[data-aplicar]');
    if (ap) { aplicarPlanCobertura(ap.dataset.aplicar, root, modo); return; }
    if (e.target.id === 'cobSoloAus') { aplicarPlanCobertura(null, root, modo); return; }
    if (e.target.id === 'cobDeshacer') { deshacer(); COB.aplicado = null; COB.res = null; repinta(); return; }
    if (e.target.id === 'cobOtra') { COB.aplicado = null; COB.res = null; COB.dias = []; repinta(); return; }
    const ir = e.target.closest('[data-irdia]');
    if (ir) { if (COB.ovl) COB.ovl.remove(); irAIso(ir.dataset.irdia); }
  });
}
function proponerCobertura(root, modo) {
  const inc = incidenciaActual();
  if (!inc.pid || !inc.dias.length) { toast('Marca al menos un día', 'warn'); return; }
  try {
    const base = clonarEstado(estadoRango(inc.desde, inc.hasta, false));
    const res = planesCobertura(S, S.staff, base, inc, { siempre: COB.siempre, intercambio: COB.tipo === 'CAMBIO' && COB.intercambio });
    res.inc = inc; res.ts = Date.now();
    COB.res = res; COB.aplicado = null;
  } catch (e) { toast('No se pudo proponer: ' + (e && e.message ? e.message : e), 'bad'); }
  pintaCob(root, modo);
  const r = root.querySelector('#cobRes'); if (r) r.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
const lpCob = tid => { const { localId, franja } = partirTurno(tid); return `<span class="lpill" style="--lc:${colorLocal(localId)}">${esc((localDe(S, localId) || {}).corto || localId)}·${franja}</span>`; };
const dlCob = iso => `${DIAS_L[isoDow(iso)].slice(0, 3)} ${+iso.slice(8, 10)}${+iso.slice(5, 7) !== S.m ? ' ' + MES3[+iso.slice(5, 7) - 1] : ''}`;
function htmlPlanesCobertura(res) {
  const inc = res.inc;
  const nombre = res.nombre;
  const tipoLbl = COB_TIPO_LBL[inc.tipo] || inc.tipo;
  const rango = inc.dias.length === 1 ? fmtLargo(inc.desde) : `${pl(inc.dias.length, 'día', 'días')}: ${inc.dias.map(fmtDM).join(', ')}${inc.sinFin ? ' (baja sin fecha de fin)' : ''}`;
  if (!res.afectados.length) {
    return `<div class="cobcard cobvacia"><span class="micro">${esc(tipoLbl.toUpperCase())} · ${esc(rango)}</span><h3>${esc(nombre)} no tiene turnos en la planilla ${inc.dias.length === 1 ? 'ese día' : 'esos días'}${inc.franjas ? ' en esa franja' : ''}</h3>
      <p class="revsub">No hay nada que cubrir. ${inc.tipo === 'CAMBIO' ? 'Marca un día en el que trabaje.' : 'Si quieres, se registra igualmente la ausencia en su ficha para que el generador no cuente con esa persona.'}</p>
      ${inc.tipo === 'CAMBIO' ? '' : '<button class="btn btn-sec" id="cobSoloAus">Registrar solo la ausencia</button>'}</div>`;
  }
  const plan = P => {
    const filas = res.afectados.map(a => {
      const as = P.asignaciones.filter(x => x.iso === a.iso && x.tid === a.tid);
      const hs = P.huecos.filter(x => x.iso === a.iso && x.tid === a.tid);
      const sc = P.sinCubrir.find(x => x.iso === a.iso && x.tid === a.tid);
      const entra = as.map(x => `<div class="cobrow"><span class="av" style="background:${avColor(x.pid)}">${esc(initials(x.nombre))}</span><span class="cobtxt"><b>${esc(x.nombre)}${x.abre ? ' <em class="bdg abre">ABRE</em>' : ''}${x.cocina ? ' <em class="bdg cocina">◆ COCINA</em>' : ''}${x.avisos.length ? ` <em class="bdg forz" title="${esc(x.avisos.join(', '))}">!</em>` : ''}</b><small>${esc(x.razones.filter(r => !x.avisos.includes(r)).slice(0, 3).join(' · '))}${x.avisos.length ? ` · <span class="cobaviso">aviso: ${esc(x.avisos.join(', '))}</span>` : ''}</small>${x.intercambio ? `<small class="cobinter">⇄ a cambio, ${esc(nombreCorto(nombre))} hace ${dlCob(x.intercambio.iso)} ${lpCob(x.intercambio.tid)} de ${esc(nombreCorto(x.nombre))}</small>` : ''}</span></div>`).join('')
        + hs.map(h => { const pq = Object.entries(h.porQueNadie || {}).slice(0, 4).map(([m, q]) => `<b>${esc(m)}</b>: ${esc(q.slice(0, 4).join(', '))}${q.length > 4 ? ' +' + (q.length - 4) : ''}`).join(' · '); return `<div class="cobrow hueco"><span class="av">?</span><span class="cobtxt"><b>Hueco: ${esc(h.tipo === 'primero' ? 'nadie puede abrir (1.ª posición)' : h.tipo === 'cocina' ? 'sin cocina' : h.motivo)}</b><small>${pq || esc(h.motivo || 'nadie de la plantilla puede')}</small></span></div>`; }).join('')
        + (sc ? `<div class="cobrow sobra"><span class="av">✓</span><span class="cobtxt"><b>Nadie hace falta</b><small>${esc(sc.motivo)}</small></span></div>` : '');
      return `<div class="cobmv"><div class="cobmvd"><b>${dlCob(a.iso)}</b>${lpCob(a.tid)}<small>${FRANJA_LBL[a.franja].toLowerCase()}${a.cocina ? ' · llevaba la cocina' : ''}${a.abre ? ' · abría' : ''}</small><button class="glink cobver" data-irdia="${a.iso}">ver el día</button></div>
        <div class="cobsale"><span class="av" style="background:${avColor(inc.pid)}">${esc(initials(nombre))}</span><span class="cobtxt"><b><s>${esc(nombre)}</s></b><small>sale${a.necesario ? (a.faltan ? ` · quedan ${a.quedan} de ${a.min}` : a.sinCocina ? ' · sin cocina' : ' · nadie abre') : ` · quedan ${a.quedan} de ${a.min}`}</small></span></div>
        <div class="cobarrow" aria-hidden="true">→</div>
        <div class="cobentra">${entra}</div></div>`;
    }).join('');
    const estado = P.completo ? (P.avisos ? `<span class="evst p">cubre todo · ${pl(P.avisos, 'aviso', 'avisos')}</span>` : '<span class="evst ok">cubre todo</span>') : `<span class="evst x">${pl(P.huecos.length, 'hueco', 'huecos')}</span>`;
    return `<div class="cobplan${P.id === 'A' ? ' reco' : ''}">
      <div class="cobph"><span><span class="micro">${esc(P.titulo.toUpperCase())}</span><small>${esc(P.estrategia)}${P.distinto ? ` · ${pl(P.distinto, 'turno distinto', 'turnos distintos')} del plan A` : ''}</small></span>${estado}</div>
      <div class="cobmvs">${filas}</div>
      <div class="cobpf"><span class="cobpers2">${P.personas.length ? 'Entran: ' : ''}${P.personas.map(pid => `<span class="glchip" style="--pc:${avColor(pid)}">${esc(nombreCorto(nombrePid(pid)))}</span>`).join('') || '<em class="gnadie">no entra nadie nuevo</em>'}</span><button class="btn ${P.id === 'A' ? 'btn-cta' : 'btn-sec'}" data-aplicar="${P.id}">Confirmar plan ${P.id}${P.completo ? '' : ` (${pl(P.huecos.length, 'hueco queda', 'huecos quedan')})`}</button></div>
    </div>`;
  };
  return `<div class="cobcard cobres">
      <span class="micro">${esc(tipoLbl.toUpperCase())} · ${esc(rango)}</span>
      <h3>${esc(nombre)}: ${pl(res.afectados.length, 'turno afectado', 'turnos afectados')}${res.necesarios < res.afectados.length ? `, ${res.necesarios} por cubrir` : ''}</h3>
      <p class="revsub" style="margin:4px 0 0">${res.posible ? 'Se puede cubrir todo.' : '<b style="color:var(--bad)">No se puede cubrir todo</b> sin romper una condición: lo que nadie puede ocupar queda como hueco (en rojo en Hoy y Semana) para ofrecérselo a quien pueda.'} ${res.planes.length > 1 ? 'Elige un plan; el otro es la alternativa.' : ''} Al confirmar se aplica en la planilla; Ctrl+Z lo deshace.</p>
    </div>
    <div class="cobplanes">${res.planes.map(plan).join('')}</div>`;
}
function htmlCoberturaAplicada(ap) {
  const r = ap.res, inc = ap.inc;
  const lista = r.asignados.map(x => `<li>${lpCob(x.tid)} <b>${dlCob(x.iso)}</b>: entra ${esc(nombrePid(x.pid))}${x.avisos.length ? ` <span class="cobaviso">(aviso: ${esc(x.avisos.join(', '))})</span>` : ''}</li>`).join('')
    + r.intercambios.map(x => `<li>${lpCob(x.tid)} <b>${dlCob(x.iso)}</b>: ${esc(nombrePid(x.pid))} a cambio de ${esc(nombrePid(x.quita))}</li>`).join('')
    + r.rechazados.map(x => `<li class="bad">${lpCob(x.tid)} <b>${dlCob(x.iso)}</b>: ${esc(nombrePid(x.pid))} no se pudo poner (${esc(x.motivo)})</li>`).join('');
  return `<div class="cobcard cobok"><span class="micro">APLICADO · ${esc(ap.plan ? 'PLAN ' + ap.plan : 'SOLO LA AUSENCIA')}</span>
    <h3>${esc(nombrePid(inc.pid))}: ${inc.tipo === 'CAMBIO' ? 'cambio de turno hecho' : `${esc((COB_TIPO_LBL[inc.tipo] || inc.tipo).toLowerCase())} registrada en su ficha`}</h3>
    <p class="revsub">${pl(r.quitados, 'turno retirado', 'turnos retirados')} · ${pl(r.asignados.length, 'turno cubierto', 'turnos cubiertos')}${r.intercambios.length ? ` · ${pl(r.intercambios.length, 'intercambio', 'intercambios')}` : ''}${ap.huecos ? ` · <b style="color:var(--bad)">${pl(ap.huecos, 'hueco queda', 'huecos quedan')}</b> en rojo en Hoy y Semana` : ''}.</p>
    ${lista ? `<ul class="gcamblist">${lista}</ul>` : ''}
    <div class="genbar" style="position:static;padding:6px 0 0"><button class="btn btn-sec" data-irdia="${inc.desde}">Ver el día en la planilla</button><button class="btn btn-ghost" id="cobDeshacer">Deshacer</button><button class="btn btn-ghost" id="cobOtra">Otra cobertura</button></div></div>`;
}
function aplicarPlanCobertura(id, root, modo) {
  const res = COB.res; if (!res) return;
  const inc = res.inc;
  const plan = id ? res.planes.find(p => p.id === id) : null;
  if (id && !plan) return;
  if (!confirmarSiCerrado(inc.desde)) return;
  const nombre = nombrePid(inc.pid);
  const cuando = inc.dias.length === 1 ? 'el ' + fmtDM(inc.desde) : `los días ${inc.dias.map(fmtDM).join(', ')}`;
  const txt = plan ? `${plan.asignaciones.length ? pl(plan.asignaciones.length, 'turno pasa', 'turnos pasan') + ' a quien cubre' : 'no entra nadie nuevo'}${plan.huecos.length ? `, ${pl(plan.huecos.length, 'hueco queda', 'huecos quedan')} sin cubrir` : ''}` : 'solo se registra la ausencia';
  if (!confirm(`${COB_TIPO_LBL[inc.tipo] || inc.tipo} de ${nombre} ${cuando}: ${txt}. ¿Confirmar${plan ? ' el plan ' + plan.id : ''}? (Ctrl+Z lo deshace)`)) return;
  pushUndo(`cobertura de ${nombre}`, { staff: true, otrosMeses: true });
  const real = estadoRango(inc.desde, inc.hasta, true);
  const r = aplicarCobertura(S, S.staff, real, inc, plan);
  const huecos = plan ? plan.huecos.length : 0;
  registrarCambio(`Cobertura (${plan ? 'plan ' + plan.id : 'solo ausencia'}): ${COB_TIPO_LBL[inc.tipo] || inc.tipo} de ${nombre} ${cuando} — ${r.quitados} turno(s) retirados, ${r.asignados.length} cubiertos${r.intercambios.length ? `, ${r.intercambios.length} intercambio(s)` : ''}${huecos ? `, ${huecos} hueco(s)` : ''}${r.asignados.length ? ': ' + r.asignados.map(x => `${nombrePid(x.pid)} ${fmtDM(x.iso)} ${nombreLocal(partirTurno(x.tid).localId)} ${FRANJA_LBL[partirTurno(x.tid).franja].toLowerCase()}`).join(', ') : ''}`, 'cobertura');
  if (mesCerrado(inc.desde)) registrarCambio(`Cambio en un mes cerrado (${inc.desde.slice(0, 7)})`, 'aviso');
  saveState();
  COB.aplicado = { plan: plan ? plan.id : null, inc, res: r, huecos };
  COB.res = null;
  toast(`${nombre}: ${r.quitados} turno(s) retirados, ${r.asignados.length} cubiertos${huecos ? `, ${huecos} hueco(s) quedan` : ''} · Ctrl+Z para deshacer`, huecos || r.rechazados.length ? 'warn' : 'ok');
  if (typeof pintaRevDot === 'function') pintaRevDot();
  if (modo === 'ovl' && COB.ovl) { COB.ovl.remove(); COB.ovl = null; renderVistaActiva(); return; }   // desde la planilla: se vuelve a ella con los cambios a la vista
  pintaCob(root, modo);
}
