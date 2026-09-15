// ================= GESTOR DE COBERTURA =================
// El encargado dice quién va a faltar (baja, vacaciones, día libre, permiso, otro
// motivo o un cambio de turno) y en qué días, y la app le propone el plan A
// (recomendado) y el plan B (alternativa) para cubrir cada turno afectado con
// las fichas y las reglas del grupo, o le explica por qué no se puede. Nada cambia
// hasta que aplica un plan; entonces la ausencia queda en la ficha, la persona
// sale de sus turnos y quien cubre entra con «por X». Ctrl+Z lo deshace.
const COB = { pid: null, tipo: 'LD', desde: null, hasta: null, sinFin: false, franjas: [], detalle: '', siempre: false, intercambio: true, res: null, aplicado: null };
const COB_TIPO_LBL = { BAJ: 'Baja', VAC: 'Vacaciones', LD: 'Día libre', PERM: 'Permiso', OTRO: 'Otro motivo', CAMBIO: 'Cambio de turno' };
function irACobertura(o) {
  Object.assign(COB, { res: null, aplicado: null }, o || {});
  if (COB.desde && !COB.hasta) COB.hasta = COB.desde;
  switchTab('cobertura');
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
  const inc = { pid: COB.pid, tipo: COB.tipo, desde: COB.desde, hasta: COB.tipo === 'CAMBIO' ? COB.desde : (COB.hasta || COB.desde) };
  if (inc.hasta < inc.desde) inc.hasta = inc.desde;
  if (COB.tipo === 'BAJ' && COB.sinFin) inc.sinFin = true;
  if (COB.franjas.length && COB.franjas.length < 2) inc.franjas = COB.franjas.slice();
  if (COB.detalle && COB.tipo !== 'CAMBIO') inc.detalle = COB.detalle;
  return inc;
}
function renderCobertura() {
  const root = $('#cobRoot');
  if (!COB.desde) { COB.desde = isoDia(); COB.hasta = COB.desde; }
  if (!COB.hasta) COB.hasta = COB.desde;
  const personas = activos().slice().sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  if (!COB.pid || !personas.some(p => p.id === COB.pid)) COB.pid = personas[0] ? personas[0].id : null;
  const p = personaDeId(COB.pid);
  const cambio = COB.tipo === 'CAMBIO';
  const dias = cambio ? 1 : Math.max(1, Math.round((fechaLocal(COB.hasta) - fechaLocal(COB.desde)) / 864e5) + 1);
  root.innerHTML = `<div class="gengrid cobgrid">
    <div class="genpanel">
      <span class="micro">QUIÉN VA A FALTAR</span>
      <label class="pinlbl">Persona<select id="cobPid" class="logininp" data-libre>${personas.map(q => `<option value="${esc(q.id)}"${q.id === COB.pid ? ' selected' : ''}>${esc(q.nombre)}</option>`).join('')}</select></label>
      ${p ? `<div class="cobpers"><span class="av" style="background:${avColor(p.id)}">${esc(initials(p.nombre))}</span><span><b>${esc(p.nombre)}</b><small>${esc((PUESTOS.find(x => x.id === p.puesto) || {}).label || '')} · ${esc((p.locales || []).length ? p.locales.map(nombreLocal).join(', ') : 'comodín, cualquier local')}${(p.libra || []).length ? ' · libra ' + p.libra.map(d => DIAS_L[d].toLowerCase()).join(' y ') : ''}</small></span></div>` : ''}
      <div class="pinlbl">Qué le pasa</div>
      <div class="cobtipos">${TIPOS_INCIDENCIA.map(t => `<button type="button" class="abschip a-${esc(t.id)}${COB.tipo === t.id ? ' on' : ''}" data-tipo="${esc(t.id)}">${esc(t.label)}</button>`).join('')}</div>
      <div class="row2" style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <label class="pinlbl" style="margin:0">${cambio ? 'Día' : 'Desde'}<input type="date" id="cobD1" class="logininp" value="${COB.desde}" data-libre></label>
        <label class="pinlbl" style="margin:0${cambio ? ';visibility:hidden' : ''}">${COB.tipo === 'BAJ' && COB.sinFin ? 'Cubrir hasta' : 'Hasta'}<input type="date" id="cobD2" class="logininp" value="${COB.hasta}" data-libre></label>
      </div>
      ${COB.tipo === 'BAJ' ? `<label class="genopt"><input type="checkbox" id="cobSinFin" ${COB.sinFin ? 'checked' : ''} data-libre> <span><b>Baja sin fecha de fin</b> · se registra abierta; los turnos se cubren hasta la fecha de arriba</span></label>` : ''}
      <div class="pinlbl">${cambio ? 'Qué turno cambia' : 'Turnos afectados'}</div>
      <div class="cobfr"><button type="button" class="dowk${!COB.franjas.length || COB.franjas.length === 2 ? ' on' : ''}" data-fr="">Todos</button><button type="button" class="dowk${COB.franjas.length === 1 && COB.franjas[0] === 'M' ? ' on' : ''}" data-fr="M">Mañana</button><button type="button" class="dowk${COB.franjas.length === 1 && COB.franjas[0] === 'T' ? ' on' : ''}" data-fr="T">Tarde</button></div>
      ${cambio ? '' : `<label class="pinlbl">Detalle <small>(opcional)</small><input type="text" id="cobDet" class="logininp" value="${esc(COB.detalle)}" placeholder="p. ej. médico, boda" data-libre></label>`}
      <label class="genopt"><input type="checkbox" id="cobSiempre" ${COB.siempre ? 'checked' : ''} data-libre> <span><b>Reemplazar siempre</b> · aunque la casilla siga completa sin esa persona</span></label>
      ${cambio ? `<label class="genopt"><input type="checkbox" id="cobInter" ${COB.intercambio ? 'checked' : ''} data-libre> <span><b>Proponer intercambio</b> · a cambio, ${p ? esc(nombreCorto(p.nombre)) : 'la persona'} hace un turno cercano de quien le cubre</span></label>` : ''}
      <p class="revsub" style="margin:0">Se usan las fichas y las reglas del grupo: «cubre a» manda, después comodines y apoyos que libren ese día, el local habitual, la cocina si hace falta y quien menos turnos lleve esa semana. ${cambio ? 'Un cambio de turno no es una ausencia: no se anota en la ficha.' : 'Al aplicar, la ausencia queda en la ficha y los turnos pasan a quien cubre.'}</p>
      <button class="btn btn-cta" id="cobProponer" ${p ? '' : 'disabled'}>✦ Proponer plan A y plan B</button>
    </div>
    <div class="genres" id="cobRes">${COB.aplicado ? htmlCoberturaAplicada(COB.aplicado) : COB.res ? htmlPlanesCobertura(COB.res) : `<div class="genvacio">Elige a la persona, qué le pasa y los días, y pulsa <b>Proponer plan A y plan B</b>. Verás cada turno afectado, quién puede cubrirlo y por qué, y lo que quedaría como hueco. ${dias > 1 ? `Ahora mismo: ${pl(dias, 'día', 'días')}.` : ''}</div>`}</div>
  </div>`;
  root.querySelector('#cobPid').addEventListener('change', e => { COB.pid = e.target.value; COB.res = null; COB.aplicado = null; renderCobertura(); });
  root.querySelector('#cobD1').addEventListener('change', e => { COB.desde = e.target.value || COB.desde; if (COB.hasta < COB.desde || COB.tipo === 'CAMBIO') COB.hasta = COB.desde; COB.res = null; COB.aplicado = null; renderCobertura(); });
  root.querySelector('#cobD2').addEventListener('change', e => { COB.hasta = e.target.value || COB.hasta; if (COB.hasta < COB.desde) COB.hasta = COB.desde; COB.res = null; COB.aplicado = null; renderCobertura(); });
  const sf = root.querySelector('#cobSinFin'); if (sf) sf.addEventListener('change', e => { COB.sinFin = e.target.checked; if (COB.sinFin && COB.hasta === COB.desde) COB.hasta = addDias(COB.desde, 13); COB.res = null; renderCobertura(); });
  const det = root.querySelector('#cobDet'); if (det) det.addEventListener('input', e => { COB.detalle = e.target.value; });
  root.querySelector('#cobSiempre').addEventListener('change', e => { COB.siempre = e.target.checked; COB.res = null; renderCobertura(); });
  const inter = root.querySelector('#cobInter'); if (inter) inter.addEventListener('change', e => { COB.intercambio = e.target.checked; COB.res = null; renderCobertura(); });
  root.querySelector('.cobgrid').addEventListener('click', e => {   // listener en el contenedor recién pintado: no se acumula
    const t = e.target.closest('[data-tipo]');
    if (t) { COB.tipo = t.dataset.tipo; if (COB.tipo === 'CAMBIO') COB.hasta = COB.desde; COB.res = null; COB.aplicado = null; renderCobertura(); return; }
    const fr = e.target.closest('[data-fr]');
    if (fr) { COB.franjas = fr.dataset.fr ? [fr.dataset.fr] : []; COB.res = null; renderCobertura(); return; }
    if (e.target.id === 'cobProponer') { proponerCobertura(); return; }
    const ap = e.target.closest('[data-aplicar]');
    if (ap) { aplicarPlanCobertura(ap.dataset.aplicar); return; }
    if (e.target.id === 'cobSoloAus') { aplicarPlanCobertura(null); return; }
    if (e.target.id === 'cobDeshacer') { deshacer(); COB.aplicado = null; COB.res = null; renderCobertura(); return; }
    if (e.target.id === 'cobOtra') { COB.aplicado = null; COB.res = null; renderCobertura(); return; }
    const ir = e.target.closest('[data-irdia]');
    if (ir) irAIso(ir.dataset.irdia);
  });
}
function proponerCobertura() {
  const inc = incidenciaActual();
  if (!inc.pid || !/^\d{4}-\d{2}-\d{2}$/.test(inc.desde)) { toast('Falta la persona o la fecha', 'warn'); return; }
  try {
    const base = clonarEstado(estadoRango(inc.desde, inc.hasta, false));
    const res = planesCobertura(S, S.staff, base, inc, { siempre: COB.siempre, intercambio: COB.tipo === 'CAMBIO' && COB.intercambio });
    res.inc = inc; res.ts = Date.now();
    COB.res = res; COB.aplicado = null;
  } catch (e) { toast('No se pudo proponer: ' + (e && e.message ? e.message : e), 'bad'); }
  renderCobertura();
  const r = $('#cobRes'); if (r && matchMedia('(max-width:980px)').matches) r.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
const lpCob = tid => { const { localId, franja } = partirTurno(tid); return `<span class="lpill" style="--lc:${colorLocal(localId)}">${esc((localDe(S, localId) || {}).corto || localId)}·${franja}</span>`; };
const dlCob = iso => `${DIAS_L[isoDow(iso)].slice(0, 3)} ${+iso.slice(8, 10)}${+iso.slice(5, 7) !== S.m ? ' ' + MES3[+iso.slice(5, 7) - 1] : ''}`;
function htmlPlanesCobertura(res) {
  const inc = res.inc;
  const nombre = res.nombre;
  const tipoLbl = COB_TIPO_LBL[inc.tipo] || inc.tipo;
  const rango = inc.desde === inc.hasta ? fmtLargo(inc.desde) : `del ${fmtDM(inc.desde)} al ${fmtDM(inc.hasta)}${inc.sinFin ? ' (baja sin fecha de fin)' : ''}`;
  if (!res.afectados.length) {
    return `<div class="cobcard cobvacia"><span class="micro">${esc(tipoLbl.toUpperCase())} · ${esc(rango)}</span><h3>${esc(nombre)} no tiene turnos en la planilla ${inc.desde === inc.hasta ? 'ese día' : 'en esos días'}</h3>
      <p class="revsub">No hay nada que cubrir. ${inc.tipo === 'CAMBIO' ? 'Elige el día en que trabaja.' : 'Si quieres, se registra igualmente la ausencia en su ficha para que el generador no cuente con esa persona.'}</p>
      ${inc.tipo === 'CAMBIO' ? '' : '<button class="btn btn-sec" id="cobSoloAus">Registrar solo la ausencia</button>'}</div>`;
  }
  const afect = res.afectados.map(a => `<span class="cobaf${a.necesario ? '' : ' ok'}" data-tipstr="${esc(a.necesario ? (a.faltan ? `sin ${nombreCorto(nombre)} faltan ${a.faltan} de ${a.min}` : a.sinCocina ? 'se queda sin cocina' : 'nadie puede abrir') : `la casilla sigue completa: ${a.quedan} de ${a.min}`)}">${lpCob(a.tid)} <b>${dlCob(a.iso)}</b>${a.cocina ? ' <u class="gcoc">◆</u>' : ''}${a.abre ? ' <i class="cobabre">abre</i>' : ''}${a.necesario ? '' : ' <small>sigue completa</small>'}</span>`).join('');
  const plan = P => {
    const porTurno = res.afectados.map(a => {
      const as = P.asignaciones.filter(x => x.iso === a.iso && x.tid === a.tid);
      const hs = P.huecos.filter(x => x.iso === a.iso && x.tid === a.tid);
      const sc = P.sinCubrir.find(x => x.iso === a.iso && x.tid === a.tid);
      const filas = as.map(x => `<div class="cobrow"><span class="av" style="background:${avColor(x.pid)}">${esc(initials(x.nombre))}</span><span class="cobtxt"><b>${esc(x.nombre)}${x.abre ? ' <em class="bdg abre">ABRE</em>' : ''}${x.cocina ? ' <em class="bdg cocina">◆ COCINA</em>' : ''}${x.avisos.length ? ` <em class="bdg forz" title="${esc(x.avisos.join(', '))}">!</em>` : ''}</b><small>${esc(x.razones.filter(r => !x.avisos.includes(r)).slice(0, 3).join(' · '))}${x.avisos.length ? ` · <span class="cobaviso">aviso: ${esc(x.avisos.join(', '))}</span>` : ''}</small>${x.intercambio ? `<small class="cobinter">⇄ a cambio, ${esc(nombreCorto(nombre))} hace ${dlCob(x.intercambio.iso)} ${lpCob(x.intercambio.tid)} de ${esc(nombreCorto(x.nombre))}</small>` : ''}</span></div>`).join('');
      const huecos = hs.map(h => { const pq = Object.entries(h.porQueNadie || {}).slice(0, 4).map(([m, q]) => `<b>${esc(m)}</b>: ${esc(q.slice(0, 4).join(', '))}${q.length > 4 ? ' +' + (q.length - 4) : ''}`).join(' · '); return `<div class="cobrow hueco"><span class="av">?</span><span class="cobtxt"><b>Hueco: ${esc(h.tipo === 'primero' ? 'nadie puede abrir (1.ª posición)' : h.tipo === 'cocina' ? 'sin cocina' : h.motivo)}</b><small>${pq || esc(h.motivo || 'nadie de la plantilla puede')}</small></span></div>`; }).join('');
      const sin = sc ? `<div class="cobrow sobra"><span class="av">✓</span><span class="cobtxt"><b>No hace falta nadie</b><small>${esc(sc.motivo)}</small></span></div>` : '';
      return `<div class="cobturno"><div class="cobth">${lpCob(a.tid)} <b>${dlCob(a.iso)}</b> · ${FRANJA_LBL[a.franja].toLowerCase()}<button class="glink gir" data-irdia="${a.iso}" title="Ver el día">→</button></div>${filas}${huecos}${sin}</div>`;
    }).join('');
    const estado = P.completo ? (P.avisos ? `<span class="evst p">cubre todo · ${pl(P.avisos, 'aviso', 'avisos')}</span>` : '<span class="evst ok">cubre todo</span>') : `<span class="evst x">${pl(P.huecos.length, 'hueco', 'huecos')}</span>`;
    return `<div class="cobplan${P.id === 'A' ? ' reco' : ''}">
      <div class="cobph"><span><span class="micro">${esc(P.titulo.toUpperCase())}</span><small>${esc(P.estrategia)}${P.distinto ? ` · ${pl(P.distinto, 'turno distinto', 'turnos distintos')} del plan A` : ''}</small></span>${estado}</div>
      ${porTurno}
      <div class="cobpf"><span class="cobpers2">${P.personas.map(pid => `<span class="glchip" style="--pc:${avColor(pid)}">${esc(nombreCorto(nombrePid(pid)))}</span>`).join('') || '<em class="gnadie">sin nadie nuevo</em>'}</span><button class="btn ${P.id === 'A' ? 'btn-cta' : 'btn-sec'}" data-aplicar="${P.id}">Aplicar plan ${P.id}${P.completo ? '' : ` (${pl(P.huecos.length, 'hueco queda', 'huecos quedan')})`}</button></div>
    </div>`;
  };
  return `<div class="cobcard">
      <span class="micro">${esc(tipoLbl.toUpperCase())} · ${esc(rango)}</span>
      <h3>${esc(nombre)}: ${pl(res.afectados.length, 'turno afectado', 'turnos afectados')}${res.necesarios < res.afectados.length ? `, ${res.necesarios} por cubrir` : ''}</h3>
      <div class="cobafs">${afect}</div>
      <p class="revsub" style="margin:8px 0 0">${res.posible ? 'Se puede cubrir todo.' : '<b style="color:var(--bad)">No se puede cubrir todo</b> sin romper una condición: lo que nadie puede ocupar queda señalado como hueco (en rojo en Hoy y Semana) para ofrecérselo a quien pueda.'} ${res.planes.length > 1 ? 'Elige un plan; el otro queda como alternativa.' : ''} Ctrl+Z deshace lo aplicado.</p>
    </div>
    <div class="cobplanes">${res.planes.map(plan).join('')}</div>`;
}
function htmlCoberturaAplicada(ap) {
  const r = ap.res, inc = ap.inc;
  const lista = r.asignados.map(x => `<li>${lpCob(x.tid)} <b>${dlCob(x.iso)}</b>: ${esc(nombrePid(x.pid))}${x.avisos.length ? ` <span class="cobaviso">(aviso: ${esc(x.avisos.join(', '))})</span>` : ''}</li>`).join('')
    + r.intercambios.map(x => `<li>${lpCob(x.tid)} <b>${dlCob(x.iso)}</b>: ${esc(nombrePid(x.pid))} a cambio de ${esc(nombrePid(x.quita))}</li>`).join('')
    + r.rechazados.map(x => `<li class="bad">${lpCob(x.tid)} <b>${dlCob(x.iso)}</b>: ${esc(nombrePid(x.pid))} no se pudo poner (${esc(x.motivo)})</li>`).join('');
  return `<div class="cobcard cobok"><span class="micro">APLICADO · ${esc(ap.plan ? 'PLAN ' + ap.plan : 'SOLO LA AUSENCIA')}</span>
    <h3>${esc(nombrePid(inc.pid))}: ${inc.tipo === 'CAMBIO' ? 'cambio de turno hecho' : `${esc((COB_TIPO_LBL[inc.tipo] || inc.tipo).toLowerCase())} registrada en su ficha`}</h3>
    <p class="revsub">${pl(r.quitados, 'turno retirado', 'turnos retirados')} · ${pl(r.asignados.length, 'turno cubierto', 'turnos cubiertos')}${r.intercambios.length ? ` · ${pl(r.intercambios.length, 'intercambio', 'intercambios')}` : ''}${ap.huecos ? ` · <b style="color:var(--bad)">${pl(ap.huecos, 'hueco queda', 'huecos quedan')}</b> en rojo en Hoy y Semana` : ''}.</p>
    ${lista ? `<ul class="gcamblist">${lista}</ul>` : ''}
    <div class="genbar" style="position:static;padding:6px 0 0"><button class="btn btn-sec" data-irdia="${inc.desde}">Ver el día</button><button class="btn btn-ghost" id="cobDeshacer">Deshacer</button><button class="btn btn-ghost" id="cobOtra">Otra cobertura</button></div></div>`;
}
function aplicarPlanCobertura(id) {
  const res = COB.res; if (!res) return;
  const inc = res.inc;
  const plan = id ? res.planes.find(p => p.id === id) : null;
  if (id && !plan) return;
  if (!confirmarSiCerrado(inc.desde)) return;
  const nombre = nombrePid(inc.pid);
  const txt = plan ? `${plan.asignaciones.length ? pl(plan.asignaciones.length, 'turno pasa', 'turnos pasan') + ' a quien cubre' : 'nadie nuevo entra'}${plan.huecos.length ? `, ${pl(plan.huecos.length, 'hueco queda', 'huecos quedan')} sin cubrir` : ''}` : 'solo se registra la ausencia';
  if (!confirm(`${COB_TIPO_LBL[inc.tipo] || inc.tipo} de ${nombre}${inc.desde === inc.hasta ? ' el ' + fmtDM(inc.desde) : ' del ' + fmtDM(inc.desde) + ' al ' + fmtDM(inc.hasta)}: ${txt}. ¿Aplicar${plan ? ' el plan ' + plan.id : ''}? (Ctrl+Z lo deshace)`)) return;
  pushUndo(`cobertura de ${nombre}`, { staff: true, otrosMeses: true });
  const real = estadoRango(inc.desde, inc.hasta, true);
  const r = aplicarCobertura(S, S.staff, real, inc, plan);
  const huecos = plan ? plan.huecos.length : 0;
  registrarCambio(`Cobertura (${plan ? 'plan ' + plan.id : 'solo ausencia'}): ${COB_TIPO_LBL[inc.tipo] || inc.tipo} de ${nombre}${inc.desde === inc.hasta ? ' el ' + fmtDM(inc.desde) : ' del ' + fmtDM(inc.desde) + ' al ' + fmtDM(inc.hasta)} — ${r.quitados} turno(s) retirados, ${r.asignados.length} cubiertos${r.intercambios.length ? `, ${r.intercambios.length} intercambio(s)` : ''}${huecos ? `, ${huecos} hueco(s)` : ''}${r.asignados.length ? ': ' + r.asignados.map(x => `${nombrePid(x.pid)} ${fmtDM(x.iso)} ${nombreLocal(partirTurno(x.tid).localId)} ${FRANJA_LBL[partirTurno(x.tid).franja].toLowerCase()}`).join(', ') : ''}`, 'cobertura');
  if (mesCerrado(inc.desde)) registrarCambio(`Cambio en un mes cerrado (${inc.desde.slice(0, 7)})`, 'aviso');
  saveState();
  COB.aplicado = { plan: plan ? plan.id : null, inc, res: r, huecos };
  COB.res = null;
  renderCobertura();
  if (typeof pintaRevDot === 'function') pintaRevDot();
  toast(`${nombre}: ${r.quitados} turno(s) retirados, ${r.asignados.length} cubiertos${huecos ? `, ${huecos} hueco(s) quedan` : ''} · Ctrl+Z para deshacer`, huecos || r.rechazados.length ? 'warn' : 'ok');
}
