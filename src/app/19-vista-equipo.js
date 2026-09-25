// ================= VISTA EQUIPO =================
// Las personas agrupadas por su local, con TODAS sus condiciones a la vista en
// forma de chips legibles (la ficha las edita; aquí se leen de un vistazo), sus
// ausencias, el alta de personas y los ajustes de cada local (mínimos, horarios,
// cocina, quién abre). Comparte scope con el resto de la app: sin import/export.

// ---------- etiquetas legibles ----------
function lblFranjas(franjas) {
  const f = Array.isArray(franjas) ? franjas : [];
  if (!f.length || (f.includes('M') && f.includes('T'))) return 'Mañana y tarde';
  return f.includes('M') ? 'Solo mañanas' : 'Solo tardes';
}
function lblDows(dows) { return (dows || []).slice().sort((a, b) => a - b).map(d => DOW_C[d]).join(' · '); }
// «los martes» → «martes»; para chips cortos
function lblDowPl(dow) { return DOW_PL[dow] ? DOW_PL[dow].replace(/^los /, '') : ''; }
function lblPuesto(id) { const p = PUESTOS.find(x => x.id === id); return p ? p.label : (id || 'Sala'); }
function lblTurno(tid) { const { localId, franja } = partirTurno(tid); return `${nombreLocal(localId)} ${FRANJA_LBL[franja] ? FRANJA_LBL[franja].toLowerCase() : franja}`; }
function chipLocal(localId, extra) {
  return `<i class="ldot" style="--lc:${esc(colorLocal(localId))}"></i>${esc(nombreLocal(localId))}${extra ? ' ' + esc(extra) : ''}`;
}
function tchip(lbl, txt, cls, title) {
  return `<span class="tchip${cls ? ' ' + cls : ''}"${title ? ` title="${esc(title)}"` : ''}><b>${esc(lbl)}</b><i>${txt}</i></span>`;
}

// etiqueta legible de una característica (CARACTERISTICAS del modelo)
function lblCaracteristica(k) { const c = CARACTERISTICAS.find(x => x.k === k); return c ? c.lbl : k; }
// «nunca 1.º de tarde»: texto corto de p.noPrimero para chips y fichas
function lblNoPrimero(fr) {
  const f = Array.isArray(fr) ? fr : [];
  if (f.includes('M') && f.includes('T')) return 'de mañana ni de tarde';
  return f.includes('M') ? 'de mañana' : f.includes('T') ? 'de tarde' : '';
}
// Enciende o apaga una característica en la ficha (p.inactivas). «Nunca con» es
// mutua (el modelo bloquea si cualquiera de los dos la tiene activa), así que se
// apaga o enciende también en la ficha de cada incompatible; devuelve sus nombres.
function setCaracteristica(p, k, activa) {
  const pon = x => {
    x.inactivas = Array.isArray(x.inactivas) ? x.inactivas : [];
    const i = x.inactivas.indexOf(k);
    if (!activa && i < 0) x.inactivas.push(k);
    if (activa && i >= 0) x.inactivas.splice(i, 1);
    if (!x.inactivas.length) delete x.inactivas;
  };
  pon(p);
  const otros = [];
  if (k === 'nuncaCon') for (const q of p.nuncaCon || []) { const qp = personaDeId(q); if (qp && caracteristicaActiva(qp, k) !== activa) { pon(qp); otros.push(qp.nombre); } }
  return otros;
}
// desde la interfaz (panel de condiciones): deshacer, historial y guardado
function alternarCaracteristicaUI(pid, k, activa) {
  const p = personaDeId(pid); if (!p) return false;
  pushUndo(`ficha de ${p.nombre}`, { staff: true });
  const otros = setCaracteristica(p, k, activa);
  registrarCambio(`Ficha de ${p.nombre}: «${lblCaracteristica(k)}» ${activa ? 'activada' : 'desactivada'}${otros.length ? ` (también en ${otros.join(', ')})` : ''}`, 'equipo');
  saveState();
  return true;
}

// Todas las condiciones de una persona como chips. Es la «hoja de condiciones»
// que el encargado revisa antes de generar: si algo no está aquí, el generador
// no lo sabe. Las características apagadas en la ficha salen tachadas.
function chipsCondiciones(p) {
  const h = [];
  const off = k => (caracteristicaActiva(p, k) ? '' : ' off');
  const tc = (k, lbl, txt, cls, title) => tchip(lbl, txt, (cls || '') + off(k), caracteristicaActiva(p, k) ? title : `${lblCaracteristica(k)}: desactivada en la ficha, el generador no la tiene en cuenta`);
  const locs = p.locales || [];
  if (locs.length) for (const id of locs) h.push(tc('locales', 'Local', chipLocal(id), 'loc'));
  else h.push(tchip('Local', 'cualquiera (sin local fijo)', 'teal'));
  h.push(tc('franjas', 'Franja', esc(lblFranjas(p.franjas))));
  const pd = p.partido || {};
  if (pd.siempre) h.push(tc('partido', 'Partido', 'siempre', 'fix'));
  else if ((pd.dias || []).length) h.push(tc('partido', 'Partido', esc(lblDows(pd.dias))));
  if (p.libreVariable) h.push(tc('libra', 'Libra', 'libre variable', 'warn'));
  else if ((p.libra || []).length) h.push(tc('libra', 'Libra', esc(lblDows(p.libra))));
  // 24/09 (reunión: «en el equipo te lo pone tal cual»): cada cambio de día libre guardado, con
  // su semana, para que se vea a qué semana se refiere
  const lunesHoy = lunesDe(isoHoy());
  for (const x of librasPuntuales(p).filter(x => x.dias.length && x.semana >= lunesHoy)) h.push(tc('libra', 'Libra', esc(`Semana del ${fmtDDMM(x.semana)}: ${textoCambioLibre(p, x)}`), 'warn'));
  // 24/09 (fase 5, S15): el interruptor «Cocina» de la ficha apaga sus límites (nunca, solo unos días, solo
  // hace cocina), no que sea titular o reserva de un local: eso no se tacha, como no lo quita la puerta
  const c = p.cocina || {};
  if (c.nunca) h.push(tc('cocina', 'Cocina', 'nunca', 'warn'));
  for (const id of c.titular || []) h.push(tchip('Cocina', chipLocal(id, '· titular'), 'loc'));
  for (const id of c.reserva || []) h.push(tchip('Cocina', chipLocal(id, '· reserva'), 'loc'));
  if (p.puesto === 'cocina' && !(c.titular || []).length && !(c.reserva || []).length) h.push(tchip('Cocina', 'por su puesto'));
  if ((c.soloDias || []).length) h.push(tc('cocina', 'Cocina', 'solo ' + esc(c.soloDias.map(lblDowPl).join(' y ')), 'warn'));
  if (p.soloCocina) h.push(tc('cocina', 'Cocina', 'solo hace cocina', 'warn', 'no refuerza la sala'));
  for (const [lid, fr] of Object.entries(p.abre || {})) if ((fr || []).length) h.push(tc('abre', 'Abre', chipLocal(lid, fr.map(f => FRANJA_LBL[f].toLowerCase()).join(' y ')), 'loc'));
  for (const lid of p.noAbre || []) h.push(tc('noAbre', 'No abre', chipLocal(lid), 'loc warn'));
  if ((p.noPrimero || []).length) h.push(tc('noPrimero', 'Nunca 1.º', esc(lblNoPrimero(p.noPrimero)), 'warn', 'no sale nunca el primero en esa franja: entra a partir del segundo puesto'));
  if ((p.nuncaCon || []).length) h.push(tc('nuncaCon', 'Nunca con', esc(p.nuncaCon.map(nombrePid).join(', ')), 'warn'));
  // 24/09 (D13, Diego: «tal persona cubre a tal persona, hasta nueva orden»): la designación se dice igual
  // que en la ficha, y por los dos lados: en la de quien cubre «Cubre a Iván · siempre que falte · hasta que
  // lo quites»; en la de quien falta, «Si falta, le cubre Mari Luz». La designación le autoriza el partido
  // para cubrirle (D1, y solo eso)
  for (const cb of p.cubreA || []) h.push(tc('cubreA', 'Cubre a', `${esc(nombrePid(cb.pid))} · ${esc(cuandoCubre(S, cb))} · hasta que lo quites`, 'fix cubrea', `ocupa el sitio de ${nombrePid(cb.pid)} cuando falta, hasta que se quite en esta ficha; si hace falta, puede hacer partido para cubrirle`));
  for (const d of quienLeCubre(S, S.staff, p.id)) h.push(tchip('Si falta, le cubre', `${esc(d.nombre)}${d.cuando !== 'siempre que falte' ? ` <small>(${esc(d.cuando)})</small>` : ''}`, 'fix cubrea' + (d.activa ? '' : ' off'), d.activa ? `${d.nombre} ocupa su sitio cuando falta (se cambia en la ficha de ${d.nombre})` : `«Cubre a» está apagado en la ficha de ${d.nombre} o en las reglas del grupo: ahora no se aplica`));
  for (const v of p.vetos || []) h.push(tc('vetos', 'No hace', chipLocal(v.localId, v.franja === 'M' ? 'mañanas' : 'tardes'), 'loc warn'));
  if (p.contrato && +p.contrato.horasSemana > 0) h.push(tc('contrato', 'Contrato', `${+p.contrato.horasSemana} h/semana`));
  if (p.prefs && (p.prefs.evitaDows || []).length) h.push(tc('prefs', 'Prefiere no', esc(lblDows(p.prefs.evitaDows)), 'teal', 'criterio personal: no bloquea, el generador lo respeta al priorizar'));
  if (p.prefs && p.prefs.nota) h.push(tc('prefs', 'Criterio', esc(p.prefs.nota), 'teal'));
  for (const s of p.supuestos || []) h.push(tchip('Supuesto', esc(s), 'warn', 'decidido por Highkey, pendiente de confirmar con el grupo'));
  if (p.nota) h.push(tchip('Nota', esc(p.nota), '', p.nota));
  return h.join('');
}
function chipsAusencias(p) {
  return (p.ausencias || []).map((a, i) => {
    const rango = a.hasta ? (a.hasta !== a.desde ? `${fmtDM(a.desde)}–${fmtDM(a.hasta)}` : fmtDM(a.desde)) : `desde ${fmtDM(a.desde)}`;
    const lbl = etiquetaAusencia(a);   // con la media jornada: «Permiso por la mañana» (revisión F3, D10)
    // una baja sin fecha de fin se cierra desde la ficha: aquí solo se ve
    const quitable = !(a.tipo === 'BAJ' && !a.hasta);
    return `<span class="abschip a-${esc(a.tipo)}" title="${esc(a.detalle || lbl)}">${esc(lbl)} ${rango}${quitable ? `<button type="button" data-rmabs="${esc(p.id)}:${i}" aria-label="Quitar ausencia">✕</button>` : ''}</span>`;
  }).join('');
}
function htmlAbsForm(p) {
  const hoy = isoHoy();
  return `<form class="absform hidden" data-absform="${esc(p.id)}">
    <div class="row2"><span><label>Tipo</label><select data-f="tipo">${TIPOS_AUSENCIA.map(t => `<option value="${t.id}"${t.id === 'VAC' ? ' selected' : ''}>${esc(t.label)}</option>`).join('')}</select></span>
    <span><label>Detalle</label><input type="text" data-f="detalle" placeholder="opcional"></span></div>
    <div class="row2"><span><label>Desde</label><input type="date" data-f="desde" value="${hoy}" required></span>
    <span><label>Hasta</label><input type="date" data-f="hasta" value="${hoy}"></span></div>
    <label>Cuándo</label>${selFranjaAusencia('data-f="franja"')}
    <p class="filltxt" style="margin:0">Una baja puede ir sin fecha de fin: deja «Hasta» vacío.</p>
    <div class="bar"><button type="button" class="btn-mini ghost" data-cancelabs="${esc(p.id)}">Cancelar</button><button type="submit" class="btn-mini">Guardar</button></div>
  </form>`;
}
function htmlTarjetaPersona(p, baja) {
  const locs = (p.locales || []).map(id => (localDe(S, id) || { corto: id }).corto).join(' · ');
  return `<div class="pcard${baja ? ' baja' : ''}" data-pcard="${esc(p.id)}">
    <div class="pchead"><span class="av" data-ficha="${esc(p.id)}" style="cursor:pointer;background:${avColor(p.id)}">${esc(initials(p.nombre))}</span>
      <span data-ficha="${esc(p.id)}" style="min-width:0;cursor:pointer"><b>${esc(p.nombre)}</b><small>${esc(lblPuesto(p.puesto))}${locs ? ' · ' + esc(locs) : ' · sin local fijo'}${baja ? ' · de baja' : p.standby ? ' · en standby' : ''}</small></span>
      <button type="button" class="pmini" data-ficha="${esc(p.id)}" title="Editar ficha" aria-label="Editar ficha de ${esc(p.nombre)}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z"/><path d="m13.5 6.5 3 3"/></svg></button></div>
    <div class="traits">${chipsCondiciones(p)}</div>
    <div class="abschips">${chipsAusencias(p)}</div>
    <button type="button" class="addabs" data-addabs="${esc(p.id)}">＋ Añadir ausencia</button>
    ${htmlAbsForm(p)}
    <div class="pcfoot"><button type="button" class="btn-mini ghost" data-ficha="${esc(p.id)}">Editar ficha</button></div>
  </div>`;
}

// ---------- la vista ----------
function renderEquipo() {
  const root = $('#equipoRoot'); if (!root) return;
  const hoy = isoHoy();   // Equipo enseña el equipo de hoy
  const enActivo = S.staff.filter(p => !deBaja(p, hoy));
  const deBajaHoy = S.staff.filter(p => deBaja(p, hoy));
  const seccion = (titulo, gente, opts) => {
    const o = opts || {};
    return `<section class="eqsec"${o.color ? ` style="--lc:${esc(o.color)}"` : ''}>
      <div class="sechdr">${o.color ? '<span class="ldot"></span>' : ''}<h2>${esc(titulo)}</h2><span class="micro">${gente.length ? `${gente.length} ${gente.length === 1 ? 'persona' : 'personas'}` : 'nadie'}${o.sub ? ' · ' + esc(o.sub) : ''}</span>
        ${o.localId ? `<button type="button" class="btn-mini ghost eqajustes" data-locajustes="${esc(o.localId)}">Ajustes del local</button>` : ''}</div>
      ${gente.length ? `<div class="cards">${gente.map(p => htmlTarjetaPersona(p, !!o.baja)).join('')}</div>` : `<div class="festvacio">${esc(o.vacio || 'Nadie asignado en exclusiva a este local.')}</div>`}
    </section>`;
  };
  let h = '';
  for (const l of S.locales) {
    const gente = enActivo.filter(p => (p.locales || []).length === 1 && p.locales[0] === l.id);
    h += seccion(l.nombre, gente, { color: l.color, localId: l.id, sub: `${FRANJA_LBL.M.toLowerCase()} ${lblDows(l.abre && l.abre.M) || '—'} · ${FRANJA_LBL.T.toLowerCase()} ${lblDows(l.abre && l.abre.T) || '—'}` });
  }
  const varios = enActivo.filter(p => (p.locales || []).length !== 1);
  h += seccion('Sin local fijo y varios locales', varios, { sub: 'sin local fijo o con más de uno', vacio: 'Nadie trabaja en varios locales.' });
  if (deBajaHoy.length) h += seccion('De baja', deBajaHoy, { baja: true, sub: 'no cuentan para el generador' });
  root.innerHTML = h;
  const stats = $('#eqStats');
  if (stats) {
    const sinLocal = enActivo.filter(esComodin).length;
    const cocineros = enActivo.filter(p => p.puesto === 'cocina' || cocinasTitular(p).length).length;   // la capa de lectura (revisión F4)
    stats.innerHTML = `<span class="dstat"><b>${enActivo.length}</b> en activo</span>${deBajaHoy.length ? `<span class="dstat warn"><b>${deBajaHoy.length}</b> de baja</span>` : ''}<span class="dstat"><b>${sinLocal}</b> sin local fijo</span><span class="dstat"><b>${cocineros}</b> cocina</span>`;
    stats.querySelectorAll('b').forEach(countUp);
  }
}
function vistaActivaId() { const t = document.querySelector('.tab[aria-selected="true"]'); return t ? t.dataset.v : 'hoy'; }
// tras tocar a una persona: Equipo siempre, y la vista que esté abierta si es otra
function repintarTrasEquipo() { renderEquipo(); if (vistaActivaId() !== 'equipo') renderVistaActiva(); }

// ---------- ausencias (la tarjeta, la ficha y el Mes comparten esto) ----------
// 24/09 (D10): la ausencia puede ser del día entero o de una franja; «solo mañana» no le quita la tarde.
function selFranjaAusencia(attr) { return `<select ${attr} data-libre><option value="">Día entero</option><option value="M">Solo mañana</option><option value="T">Solo tarde</option></select>`; }
// «el viernes 2», «del viernes 2 al domingo 4», «desde el viernes 2 (sin fecha de fin)»
const diaLargoAus = iso => `${DIAS_L[isoDow(iso)].toLowerCase()} ${+iso.slice(8, 10)}`;
const listaY = xs => xs.length > 1 ? xs.slice(0, -1).join(', ') + ' y ' + xs[xs.length - 1] : (xs[0] || '');
function cuandoAusencia(a) {
  const fr = a.franjas && a.franjas.length === 1 ? ` por la ${FRANJA_LBL[a.franjas[0]].toLowerCase()}` : '';
  if (!a.hasta) return `desde el ${diaLargoAus(a.desde)} (sin fecha de fin)${fr}`;
  return (a.hasta === a.desde ? `el ${diaLargoAus(a.desde)}` : `del ${diaLargoAus(a.desde)} al ${diaLargoAus(a.hasta)}`) + fr;
}
// Lo que va a pasar en la planilla, en llano, para la confirmación (24/09, D13): «Iván no está del viernes 2 al
// domingo 4 por la tarde. Mari Luz le cubre (hasta nueva orden). El viernes 2 y el sábado 3 ya estaba en ese
// turno y pasa a cubrirle. El domingo 4 no puede: nunca con Lavinia», y lo que queda por cubrir. r: lo que
// devuelve cubrirAusencia. Revisión F3b: una frase por cosa —antes «entra en su sitio (ya estaba en ese
// turno)» se contradecía y el porqué iba entre paréntesis dentro de paréntesis—, y los días ya pasados se dicen
// aparte (ahí no entra nadie).
function lineasCubrirAusencia(p, a, r) {
  const dias = xs => listaY([...new Set(xs.map(x => x.iso))].sort().map(i => 'el ' + diaLargoAus(i)));
  const frase = s => s.charAt(0).toUpperCase() + s.slice(1) + '.';
  const donde = x => `${nombreLocal(partirTurno(x.tid).localId)} por la ${FRANJA_LBL[partirTurno(x.tid).franja].toLowerCase()}`;
  const out = { cabeza: `${p.nombre} no está ${cuandoAusencia(a)}.`, quien: [], quedan: [], pasados: '' };
  const designadas = [...new Set(quienLeCubre(S, S.staff, p.id).map(d => d.pid))];
  for (const qid of designadas) {
    const d = quienLeCubre(S, S.staff, p.id).filter(x => x.pid === qid);
    // con el interruptor apagado (en su ficha o en las reglas del grupo) la designación está, pero no se aplica
    if (!d.some(x => x.activa)) { out.quien.push({ pid: qid, txt: `${nombrePid(qid)} tiene «Cubre a» ${p.nombre}, pero está apagado: ahora no le cubre.` }); continue; }
    const nuevos = r.puestos.filter(x => x.pid === qid), ya = r.relevos.filter(x => x.pid === qid);
    const frases = [];
    if (nuevos.length) frases.push(frase(`${dias(nuevos)} entra en su sitio`));
    if (ya.length) frases.push(frase(`${dias(ya)} ya estaba en ese turno y pasa a cubrirle${ya.every(x => x.abre) ? ', abriendo' : ''}`));
    // un día que no puede, con su porqué («nunca con Lavinia»); agrupados por porqué
    const noPuede = new Map();
    for (const s of r.sinCubrir) { const q = s.quien.find(x => x.pid === qid); if (q) { if (!noPuede.has(q.porQue)) noPuede.set(q.porQue, []); noPuede.get(q.porQue).push(s); } }
    for (const [pq, xs] of noPuede) frases.push(frase(`${dias(xs)} no puede: ${pq}`));
    out.quien.push({ pid: qid, txt: `${nombrePid(qid)} le cubre (hasta nueva orden${d.every(x => x.cuando === 'siempre que falte') ? '' : ', ' + listaY(d.map(x => x.cuando))}). ${frases.join(' ') || 'No le toca ninguno de estos días.'}` });
  }
  if (!designadas.length) out.quien.push({ pid: null, txt: `Nadie tiene «Cubre a» ${p.nombre}: sus turnos de esos días quedan por cubrir.` });
  for (const h of r.huecos) out.quedan.push(`${diaLargoAus(h.iso)} en ${donde(h)} (${h.tipo === 'faltan' ? `${h.faltan === 1 ? 'falta' : 'faltan'} ${h.faltan} de ${h.minimo}` : h.tipo === 'primero' ? 'nadie abre' : 'sin cocina'})`);
  // los días ya pasados: sale de la planilla (no los trabajó), pero no se pone a nadie en su sitio
  const pas = r.pasados || [];
  if (pas.length) out.pasados = frase(`${dias(pas)} ${new Set(pas.map(x => x.iso)).size > 1 ? 'ya han pasado' : 'ya ha pasado'}: ${p.nombre} sale de la planilla esos días, pero no se pone a nadie en su sitio; si alguien le cubrió, ponlo a mano`);
  return out;
}
// Alta de una ausencia con deshacer. En días ya planificados, la persona sale de sus casillas y entra quien
// la cubre por «cubre a» (cubrirAusencia del modelo, la misma regla que la Cobertura y el Generador). Antes
// solo se quitaba a la persona y quedaba el hueco, y la designación no se enteraba hasta regenerar (D13:
// «antes no se hablaba bien equipo con generador ni con cobertura»). Se ensaya sobre copias y una
// confirmación lo cuenta; al guardar va todo en un solo Ctrl+Z (ficha y planilla) y una línea del
// historial, y lo que queda se puede llevar a la Cobertura (con las casillas que dejó). Sin días
// planificados se guarda sin preguntar, como siempre. hecho(r) se llama tras guardar (para repintar).
function altaAusenciaUI(pid, aus, hecho) {
  const p = personaDeId(pid); if (!p) return null;
  if (!aus.desde) { toast('Falta la fecha de inicio', 'warn'); return null; }
  if (aus.hasta && aus.hasta < aus.desde) { toast('La fecha de fin es anterior a la de inicio', 'warn'); return null; }
  const a = { tipo: aus.tipo, desde: aus.desde }; if (aus.hasta) a.hasta = aus.hasta; if (aus.detalle) a.detalle = aus.detalle;
  if (!a.hasta && a.tipo !== 'BAJ') a.hasta = a.desde;   // solo una baja va sin fecha de fin
  const fs = (aus.franjas || []).filter(f => FRANJAS.includes(f));
  if (fs.length === 1) a.franjas = fs;
  // una baja sin fecha de fin: los días ya planificados de los dos meses siguientes
  const hasta = a.hasta || addDias(a.desde, 60);
  // revisión F3b: semanas enteras, como la Cobertura (rangoNecesario, S8): con solo los días de la ausencia,
  // «N turnos esa semana» contaba mal y con dos personas designadas Equipo elegía a otra que la Cobertura.
  // cubrirAusencia solo toca las casillas de la ausencia. Y la fecha de hoy: en los días ya pasados sale de la
  // planilla, pero no se pone a nadie (antes metía a Roberto en días ya trabajados y le cambiaba las horas)
  const rg = rangoNecesario({ desde: a.desde, hasta });
  const hoy = isoHoy();
  const prueba = JSON.parse(JSON.stringify(S.staff));
  anadirAusencia(personaDe(prueba, pid), a);
  // (revisión F5) con S.meses, la carga «M este mes» de quien cubre cuenta el mes entero, como en la Cobertura
  const sim = cubrirAusencia(S, prueba, clonarEstado(estadoRango(rg.desde, rg.hasta, false)), pid, a.desde, hasta, a.franjas, { desdeIso: hoy, meses: S.meses });
  const guardar = conCobertura => {
    pushUndo(`ausencia de ${p.nombre}`, { staff: true, otrosMeses: true });
    const r0 = anadirAusencia(p, a);
    const r = cubrirAusencia(S, S.staff, estadoRango(rg.desde, rg.hasta, true), pid, a.desde, hasta, a.franjas, { desdeIso: hoy, meses: S.meses });
    const quien = r.puestos.concat(r.relevos);
    // las fechas en orden (revisión F3b: salían en el orden en que se cubrían: «20/9, 15/9, 22/9…»)
    const cubren = [...new Set(quien.map(x => x.pid))].map(q => `${nombrePid(q)} le cubre ${listaY([...new Set(quien.filter(x => x.pid === q).map(x => x.iso))].sort().map(fmtDM))}`);
    registrarCambio(`${(AUS_LBL[a.tipo] || { label: a.tipo }).label}: ${p.nombre} ${a.hasta ? (a.hasta !== a.desde ? `del ${fmtDM(a.desde)} al ${fmtDM(a.hasta)}` : `el ${fmtDM(a.desde)}`) : `desde el ${fmtDM(a.desde)} (sin fecha de fin)`}${a.franjas ? ` por la ${FRANJA_LBL[a.franjas[0]].toLowerCase()}` : ''}${r.quitados.length ? ` · sale de ${r.quitados.length} turno(s)` : ''}${r.pasados.length ? ` (${r.pasados.length} ya pasado(s), sin poner a nadie)` : ''}${cubren.length ? ` · ${cubren.join('; ')} (cubre a)` : ''}${r.sinCubrir.length ? ` · ${r.sinCubrir.length} sin quien le cubra` : ''}${r.huecos.length ? ` · ${r.huecos.length} hueco(s)` : ''}${a.detalle ? ' · ' + a.detalle : ''}`, 'aus');
    if (r.quitados.some(x => mesCerrado(x.iso))) registrarCambio(`Cambio en un mes cerrado (${a.desde.slice(0, 7)})`, 'aviso');
    saveState();
    const falta = r.pendiente ? r.pendiente.dejadas.length : 0;
    toast(!r.quitados.length ? (r0.fusionada ? 'Ausencia unida a otra del mismo tipo' : 'Ausencia guardada') : `Ausencia guardada${cubren.length ? ' · ' + cubren.join(' · ') : ''}${falta ? ` · ${pl(falta, 'turno queda', 'turnos quedan')} por cubrir` : ''} · ${comoDeshacer()} para deshacer`, falta ? 'warn' : 'ok');
    if (typeof hecho === 'function') hecho(r0, r);
    if (conCobertura && r.pendiente && typeof openCobertura === 'function') openCobertura(Object.assign({}, r.pendiente, { tipo: a.tipo, detalle: a.detalle }));
    return r0;
  };
  if (!sim.quitados.length) return guardar(false);
  if (!confirmarSiCerrado(a.desde)) return null;
  const t = lineasCubrirAusencia(p, a, sim);
  const pend = sim.pendiente;
  const ov = abrirOverlay('ausOvl', `<div class="ausconf">
      <span class="micro">${esc(((AUS_LBL[a.tipo] || {}).label || a.tipo).toUpperCase())} · DÍAS YA PLANIFICADOS</span>
      <h2 class="revh2">${esc(t.cabeza)}</h2>
      <p class="revsub">Sale de ${pl(sim.quitados.length, 'turno', 'turnos')} de la planilla.</p>
      <ul class="ausconfl">${t.quien.map(x => `<li${x.pid ? ` data-quien="${esc(x.pid)}"` : ''}>${esc(x.txt)}</li>`).join('')}</ul>
      ${t.pasados ? `<p class="ausquedan ausyapasados">${esc(t.pasados)}</p>` : ''}
      ${t.quedan.length ? `<p class="ausquedan"><b>Queda por cubrir:</b> ${esc(listaY(t.quedan))}.</p>` : ''}
      <p class="revsub">Se guarda todo junto: ${esc(comoDeshacer())} lo deshace de una vez.</p>
      <div class="pvbar ausbar"><button type="button" class="btn btn-ghost" data-ovx>Cancelar</button><button type="button" class="btn ${pend ? 'btn-sec' : 'btn-cta'}" data-ausok="guardar">Guardar</button>${pend ? `<button type="button" class="btn btn-cta" data-ausok="cobertura">Guardar y buscar en la Cobertura lo que queda</button>` : ''}</div></div>`, { ancho: 560 });
  ov.addEventListener('click', e => {
    const b = e.target.closest('[data-ausok]');
    if (!b) return;
    ov.remove();
    guardar(b.dataset.ausok === 'cobertura');
  });
  return null;
}
// Quita una ausencia de la ficha. Devuelve el aviso para el toast (o false). Revisión F3b: apuntarla mueve
// gente al momento y quitarla no (la persona vuelve a sus turnos al regenerar, como antes; lo puesto a mano
// no lo quita nadie), así que el aviso lo dice, igual que al quitar «Cubre a».
function quitarAusenciaUI(pid, idx) {
  const p = personaDeId(pid); if (!p || !p.ausencias || !p.ausencias[idx]) return false;
  const a = p.ausencias[idx];
  pushUndo(`quitar ausencia de ${p.nombre}`, { staff: true });
  p.ausencias.splice(idx, 1);
  registrarCambio(`Ausencia retirada: ${p.nombre}, ${(AUS_LBL[a.tipo] || { label: a.tipo }).label} del ${fmtDM(a.desde)}${a.hasta ? ' al ' + fmtDM(a.hasta) : ''}`, 'aus');
  saveState();
  // ¿tocaba días ya planificados? (una baja sin fin: los dos meses siguientes)
  let planificada = false, n = 0;
  for (const iso of rangoIso(a.desde, a.hasta || addDias(a.desde, 60))) { if (++n > 62 || planificada) break; planificada = diaConPlanilla(estadoDeIso(iso), iso); }
  return planificada ? `Ausencia retirada · ${p.nombre} vuelve a sus turnos al volver a generar la semana; si fue un error, ${comoDeshacer()} lo deshace` : 'Ausencia retirada';
}

// ---------- alta y baja ----------
// Una persona nueva con TODOS los campos que espera el modelo (misma forma que la
// semilla): así ninguna vista tiene que preguntar «¿y si no tiene cocina?».
function personaNueva(nombre, extra) {
  return Object.assign({
    id: '', nombre: String(nombre || '').trim(), puesto: 'sala', locales: [], franjas: ['M', 'T'], libra: [],
    partido: { dias: [] }, cocina: { titular: [], reserva: [], soloDias: [] }, abre: {}, noAbre: [], nuncaCon: [], cubreA: [],
    vetos: [], contrato: { horasSemana: null }, ausencias: [], prefs: {}, nota: '', supuestos: [],
  }, extra || {});
}
// el id sale del nombre (nombre.apellido) y sirve luego de usuario; si el nombre no da, uno numerado
function idParaPersona(nombre) {
  const usados = S.staff.map(p => p.id);
  const sug = sugerirUsuario(nombre, usados);
  if (sug) return sug;
  let n = 1; while (usados.includes('p' + n)) n++;
  return 'p' + n;
}
function openPersonas() {
  const locChips = S.locales.map(l => `<button type="button" class="locchip" data-loc="${esc(l.id)}" style="--lc:${esc(l.color)}"><i class="ldot"></i>${esc(l.nombre)}</button>`).join('');
  const ov = abrirOverlay('persOvl', `<span class="micro">EQUIPO</span>
    <h2 class="revh2">Añadir persona</h2>
    <p class="revsub">Lo básico para que salga en la planilla. El resto (libra, cocina, quién cubre a quién…) se rellena en su ficha, que se abre al guardar.</p>
    <form id="persForm" class="absform" style="display:grid">
      <div class="row2"><span><label>Nombre y apellidos</label><input type="text" id="persNombre" placeholder="Ana Morales" autocomplete="off" spellcheck="false" required></span>
      <span><label>Puesto</label><select id="persPuesto">${PUESTOS.map(x => `<option value="${x.id}">${esc(x.label)}</option>`).join('')}</select></span></div>
      <span><label>Locales (ninguno = cualquiera, sin local fijo)</label><div class="locset" id="persLocs">${locChips}</div></span>
      <span><label>Franjas</label><div class="segrow" id="persFranjas">${FRANJAS.map(f => `<button type="button" class="segk on" data-franja="${f}">${FRANJA_LBL[f]}</button>`).join('')}</div></span>
      <p class="filltxt" id="persPrev" style="margin:0">Escribe el nombre: el identificador (y su usuario, si entra en la app) se calcula solo.</p>
      <div class="bar"><button type="button" class="btn btn-ghost" data-ovx>Cancelar</button><button type="submit" class="btn btn-cta">Dar de alta</button></div>
    </form>`, { ancho: 520 });
  const nom = ov.querySelector('#persNombre');
  nom.addEventListener('input', () => {
    const n = nom.value.trim();
    ov.querySelector('#persPrev').innerHTML = n ? `Identificador: <b>${esc(idParaPersona(n))}</b>` : 'Escribe el nombre: el identificador (y su usuario, si entra en la app) se calcula solo.';
  });
  ov.addEventListener('click', e => {
    const lc = e.target.closest('[data-loc]'); if (lc) { lc.classList.toggle('on'); return; }
    const fk = e.target.closest('[data-franja]'); if (fk) { fk.classList.toggle('on'); }
  });
  ov.querySelector('#persForm').addEventListener('submit', e => {
    e.preventDefault();
    const nombre = nom.value.trim();
    if (!nombre) { toast('Escribe el nombre', 'warn'); nom.focus(); return; }
    if (S.staff.some(p => p.nombre.toLowerCase() === nombre.toLowerCase()) && !confirm(`Ya hay alguien llamado «${nombre}». ¿Dar de alta a otra persona con ese nombre?`)) return;
    const puesto = ov.querySelector('#persPuesto').value;
    const locales = [...ov.querySelectorAll('#persLocs .locchip.on')].map(b => b.dataset.loc);
    let franjas = [...ov.querySelectorAll('#persFranjas .segk.on')].map(b => b.dataset.franja);
    if (!franjas.length) franjas = FRANJAS.slice();
    const np = personaNueva(nombre, { id: idParaPersona(nombre), puesto, locales, franjas });
    pushUndo(`alta de ${nombre}`, { staff: true });
    S.staff.push(np);
    asignarColores(S.staff);
    registrarCambio(`Alta en el equipo: ${nombre} (${lblPuesto(puesto).toLowerCase()}${locales.length ? ', ' + locales.map(nombreLocal).join(' y ') : ', sin local fijo'})`, 'cambio');
    saveState();
    ov.remove();
    repintarTrasEquipo();
    toast(`${nombre} ya está en el equipo: completa su ficha`, 'ok');
    openFicha(np.id);
  });
  setTimeout(() => nom.focus(), 50);
}
// La persona desaparece de la plantilla y de la planilla de TODOS los meses, y
// también de donde se la nombra (semana tipo, cocina de los locales, «nunca con»
// y «cubre a» de los demás): sin referencias colgando que el generador no entienda.
function quitarPidDeTodo(pid) {
  let turnos = 0;
  for (const mes of Object.values(S.meses || {})) {
    for (const [iso, porT] of Object.entries(mes.asig || {})) {
      for (const [tid, lista] of Object.entries(porT)) {
        const n = lista.length;
        const resto = lista.filter(e => e.pid !== pid);
        turnos += n - resto.length;
        if (resto.length) porT[tid] = resto; else delete porT[tid];   // en sitio: est comparte el objeto
      }
      if (!Object.keys(porT).length) delete mes.asig[iso];
    }
  }
  for (const dow of Object.keys(S.patron || {})) S.patron[dow] = (S.patron[dow] || []).filter(pl => pl.p !== pid);
  for (const l of S.locales) {
    const c = l.cocina || {};
    for (const f of FRANJAS) if (c.titulares && c.titulares[f]) c.titulares[f] = c.titulares[f].filter(x => x !== pid);
    if (c.reservas) c.reservas = c.reservas.filter(x => x !== pid);
    for (const f of FRANJAS) if (l.primero && l.primero[f] === pid) l.primero[f] = null;
  }
  for (const q of S.staff) {
    if (q.nuncaCon) q.nuncaCon = q.nuncaCon.filter(x => x !== pid);
    if (q.cubreA) q.cubreA = q.cubreA.filter(x => x.pid !== pid);
  }
  return turnos;
}
function bajaPersona(pid) {
  const p = personaDeId(pid); if (!p) return false;
  if (!confirm(`¿Quitar a ${p.nombre} del equipo?\n\nSale de la plantilla y de sus turnos en TODOS los meses guardados. Si solo está de baja temporal, ponle una ausencia «Baja» en su lugar.`)) return false;
  pushUndo(`baja de ${p.nombre}`, { staff: true, otrosMeses: true });
  const turnos = quitarPidDeTodo(pid);
  S.staff = S.staff.filter(x => x.id !== pid);
  registrarCambio(`Baja del equipo: ${p.nombre}${turnos ? ` · ${turnos} turno(s) retirados de la planilla` : ''}`, 'cambio');
  saveState();
  repintarTrasEquipo();
  toast(`${p.nombre} ya no está en el equipo`, 'warn');
  return true;
}

// «Esto cierra TODOS los domingos por la tarde. ¿Querías cerrar solo unos días?» (24/09, D11).
// cerrar() quita el día de l.abre y avisa a Ajustes; repinta, repinta la lista de cierres.
function avisoCuandoAbre(l, f, dow, cerrar, repinta) {
  const fr = FRANJA_LBL[f].toLowerCase();
  const ov = abrirOverlay('abreAvisoOvl', `<span class="micro">CUÁNDO ABRE · ${esc(l.nombre.toUpperCase())}</span>
    <h2 class="revh2">Esto cierra TODOS ${esc(DOW_PL[dow])} por la ${esc(fr)}</h2>
    <p class="revsub">«Cuándo abre» es el horario de todas las semanas: ${esc(l.nombre)} dejaría de abrir ${esc(DOW_PL[dow])} por la ${esc(fr)} desde ya, también las semanas que vengan. ¿Querías cerrar solo unos días (una reforma, unas vacaciones del local)? Entonces es un cierre por fechas: al pasar, vuelve a abrir solo.</p>
    <div class="ciebar" style="flex-wrap:wrap"><button type="button" class="btn btn-cta" data-abreav="fechas">Solo unos días → Cierre por fechas</button><button type="button" class="btn btn-sec" data-abreav="todas">Sí, todos ${esc(DOW_PL[dow])} por la ${esc(fr)}</button><button type="button" class="btn btn-ghost" data-abreav="no">Cancelar</button></div>`, { ancho: 580 });
  ov.addEventListener('click', e => {
    const b = e.target.closest('[data-abreav]'); if (!b) return;
    ov.remove();
    if (b.dataset.abreav === 'fechas') {
      let iso = isoHoy(); while (isoDow(iso) !== dow) iso = addDias(iso, 1);
      openCierre({ localId: l.id, iso, franja: f, despues: repinta });
      return;
    }
    if (b.dataset.abreav !== 'todas') return;
    const dias = diasPlanificadosCon(l.id, f, dow);
    if (!Object.keys(dias).length) { l.abre[f] = (l.abre[f] || []).filter(d => d !== dow); cerrar(); return; }
    openCierre({ localId: l.id, dias, motivo: 'otro', detalle: `cambio de horario: deja de abrir ${DOW_PL[dow]} por la ${fr}`, abre: { franja: f, dow }, paso: 2, despues: repinta });
  });
}

// ---------- ajustes de los locales ----------
// Un diálogo con una pestaña por local. Todo se guarda al vuelo (data-libre: el
// overlay no pregunta al cerrar) y al cerrar se deja UNA entrada en el historial
// por local tocado, con lo que cambió.
// cambiosPrevios: al volver a pintarla tras Ctrl+Z (repintarPaneles), lo tocado hasta entonces sigue
// pendiente de apuntar en el historial al cerrar
function openAjustesLocales(localId, cambiosPrevios) {
  const cambios = cambiosPrevios || {};   // localId → Set de campos tocados
  const anota = (l, campo) => { (cambios[l.id] = cambios[l.id] || new Set()).add(campo); saveState(); };
  let actual = S.locales.some(l => l.id === localId) ? localId : S.locales[0].id;
  const ov = abrirOverlay('localesOvl', `<span class="micro">LOCALES</span>
    <h2 class="revh2">Ajustes de los locales</h2>
    <p class="revsub">Cuándo abre cada local, cuánta gente necesita, horarios, cocina y quién abre. Se guarda al momento; el asterisco ámbar marca lo que Highkey supuso y el grupo aún no ha confirmado.</p>
    <div class="segrow loctabs" id="locTabs"></div>
    <div id="locBody"></div>
    <div class="bar" style="display:flex;justify-content:flex-end;margin-top:14px"><button type="button" class="btn btn-cta" data-ovx>Listo</button></div>`, { ancho: 760, reabrir: () => openAjustesLocales(actual, cambios) });
  const pintaTabs = () => {
    ov.querySelector('#locTabs').innerHTML = S.locales.map(l => `<button type="button" class="segk${l.id === actual ? ' on' : ''}" data-loctab="${esc(l.id)}" style="--lc:${esc(l.color)}"><i class="ldot"></i>${esc(l.nombre)}</button>`).join('');
  };
  const personasSel = (sel, vacio) => `<option value="">${esc(vacio)}</option>` + activos(isoHoy()).map(p => `<option value="${esc(p.id)}"${sel === p.id ? ' selected' : ''}>${esc(p.nombre)}</option>`).join('');
  // candidatos a cocina: primero quien ya puede llevar la de ese local (puedeCocina: su ficha, esta lista o
  // ser de cocina); luego el resto, avisando de que al añadirlas pasan a serlo en su ficha (24/09, fase 5, S36:
  // la lista de Ajustes y la ficha son una sola cosa; antes se añadía a Victoria aquí y nadie le daba la cocina)
  const selCocina = (l, excluidos) => {
    const libres = activos(isoHoy()).filter(p => !excluidos.includes(p.id));
    const aptos = libres.filter(p => puedeCocina(S, p, l.id, null));
    const otros = libres.filter(p => !aptos.includes(p));
    return `<option value="">— elegir persona —</option>` +
      // (revisión F5: «Cocina de este local» ofrecía a Esmeralda y a Adrián, del Mónaco y de Zapatillera, que pueden
      // llevarla por ser de cocina pero no son de este local)
      (aptos.length ? `<optgroup label="Ya pueden llevarla (su ficha, esta lista o ser de cocina)">${aptos.map(p => `<option value="${esc(p.id)}">${esc(p.nombre)}</option>`).join('')}</optgroup>` : '') +
      (otros.length ? `<optgroup label="Otras personas · al añadirlas pasan a ser de cocina de ${esc(l.nombre)} en su ficha">${otros.map(p => `<option value="${esc(p.id)}">${esc(p.nombre)}</option>`).join('')}</optgroup>` : '');
  };
  // poner o quitar a alguien de la cocina del local: la lista y su ficha a la vez (ponerCocinaLocal), con su
  // paso de Ctrl+Z. A quien aún no puede llevarla se le pregunta antes, diciendo lo que cambia en su ficha
  const cambiaCocina = (l, o) => {
    const p = personaDeId(o.pid);
    // (revisión F5) si con ella el local pasa a tener cocina en esa franja (Tere, titular de la mañana de
    // Pasarela), se dice: desde entonces la Revisión avisará los días que falte
    const nueva = !o.quitar && o.lista !== 'reservas' ? cocinaQueCrea(S, S.staff, l.id, [o.franja]) : [];
    const avisoNueva = nueva.length ? `\n\n${l.nombre} no tiene cocina por la ${nueva.map(f => FRANJA_LBL[f].toLowerCase()).join(' ni por la ')}: con ${p ? p.nombre : 'ella'} de titular pasa a tener cocina ${nueva.length > 1 ? 'mañana y tarde' : 'por la ' + FRANJA_LBL[nueva[0]].toLowerCase()} todos los días que abre, y la Revisión avisará los días que no esté.` : '';
    if (!o.quitar && p && !puedeCocina(S, p, l.id, null)) {
      const papel = o.lista === 'reservas' ? 'reserva' : 'titular';
      const nunca = nuncaCocina(S, p);
      if (!confirm(`${p.nombre} no es de cocina de ${l.nombre}. Al añadirla pasa a ser ${papel} de la cocina de ${l.nombre} también en su ficha, y el Generador podrá darle la cocina.${nunca ? `\n\nOjo: su ficha dice «Nunca cocina»; mientras lo diga, no la llevará.` : ''}${avisoNueva}\n\n¿Seguir?`)) return false;
    } else if (avisoNueva && !confirm(avisoNueva.trim() + '\n\n¿Seguir?')) return false;
    pushUndo(`cocina de ${l.nombre}`, { staff: true, cocinaLocales: true });
    const antes = p ? cocinaDe(S, p, l.id) : null;
    ponerCocinaLocal(S, S.staff, l.id, o);
    const ahora = p ? cocinaDe(S, p, l.id) : null;
    anota(l, `${o.lista === 'reservas' ? 'reservas de cocina' : `cocina de ${FRANJA_LBL[o.franja].toLowerCase()}`}${p && antes !== ahora ? ` (${p.nombre}: en su ficha, ${ahora || 'ya no es de cocina de este local'})` : ''}`);
    return true;
  };
  const listaOrdenada = (ids, attr, pref) => ids.length ? ids.map((pid, i) => `<div class="festrow coc"><span class="av" style="background:${avColor(pid)}">${esc(initials(nombrePid(pid)))}</span>
      <span class="festinfo"><b>${i + 1}. ${esc(nombrePid(pid))}</b><small>${i === 0 ? 'primera opción' : 'si falta quien va antes'}</small></span>
      <button type="button" class="pmini" data-${attr}="${pref || ''}up|${i}" title="Subir" ${i === 0 ? 'disabled' : ''}>↑</button>
      <button type="button" class="pmini" data-${attr}="${pref || ''}down|${i}" title="Bajar" ${i === ids.length - 1 ? 'disabled' : ''}>↓</button>
      <button type="button" class="festrm" data-${attr}="${pref || ''}rm|${i}" aria-label="Quitar">✕</button></div>`).join('') : '<div class="festvacio">Nadie todavía.</div>';
  const pintaLocal = () => {
    const l = localDe(S, actual); if (!l) return;
    l.abre = l.abre || { M: [], T: [] }; l.minimos = l.minimos || { M: {}, T: {} }; l.supuestos = l.supuestos || { M: {}, T: {} };
    l.cocina = l.cocina || { obligatoria: {}, titulares: { M: [], T: [] }, reservas: [], posicion: {}, posicionSiDesde: {} };
    l.cocina.titulares = l.cocina.titulares || { M: [], T: [] }; l.cocina.reservas = l.cocina.reservas || []; l.cocina.obligatoria = l.cocina.obligatoria || {}; l.cocina.posicion = l.cocina.posicion || {}; l.cocina.posicionSiDesde = l.cocina.posicionSiDesde || {};
    l.primero = l.primero || { M: null, T: null }; l.horario = l.horario || { M: { ini: '09:00', fin: '16:00' }, T: { ini: '16:00', fin: '23:00' }, porDow: {} }; l.horario.porDow = l.horario.porDow || {};
    const hx = (dow, f, k) => (((l.horario.porDow[dow] || {})[f] || {})[k]) || '';
    const hpx = (dow, f, k) => ((((l.horarioPartido || {}).porDow || {})[dow] || {})[f] || {})[k] || '';
    // lo que suman ahora mismo los dos tramos, que es lo que el encargado quiere ver
    const repartoTxt = lo => {
      const tr = (dow, f) => (((lo.horarioPartido || {}).porDow || {})[dow] || {})[f] || (lo.horarioPartido || {})[f];
      const suma = dow => ['M', 'T'].map(f => { const t = tr(dow, f); return t && t.ini && t.fin ? minutosEntre(t.ini, t.fin) : 0; });
      const txt = dow => { const [a, b] = suma(dow); return a + b ? `${Math.round(a / 6) / 10} h + ${Math.round(b / 6) / 10} h = <b>${Math.round((a + b) / 6) / 10} h</b>` : 'sin tramos'; };
      return `Ahora mismo: entre semana ${txt(1)}; el fin de semana ${txt(6)}.`;
    };
    const filaAbre = f => `<tr><th>${FRANJA_LBL[f]}</th>${TODOS.map(d => `<td><button type="button" class="dowk${(l.abre[f] || []).includes(d) ? ' on' : ''}" data-abre="${f}|${d}" data-libre title="${esc(FRANJA_LBL[f])} ${esc(DOW_PL[d])}">${DOW_C[d]}</button></td>`).join('')}</tr>`;
    const filaMin = f => `<tr><th>${FRANJA_LBL[f]}</th>${TODOS.map(d => {
      const abierto = (l.abre[f] || []).includes(d);
      const sup = !!(l.supuestos[f] && l.supuestos[f][d]);
      return `<td class="${abierto ? '' : 'cerrado'}"><span class="mincell"><input type="number" min="0" max="20" inputmode="numeric" data-libre data-min="${f}|${d}" value="${l.minimos[f] && l.minimos[f][d] !== undefined ? +l.minimos[f][d] : 0}" aria-label="Mínimo ${esc(FRANJA_LBL[f])} ${esc(DOW_PL[d])}"><button type="button" class="supk${sup ? ' on' : ''}" data-sup="${f}|${d}" data-libre title="${sup ? 'Mínimo supuesto por Highkey: pulsa si el grupo lo confirma' : 'Marcar como supuesto (pendiente de confirmar)'}" aria-label="Supuesto">*</button></span></td>`;
    }).join('')}</tr>`;
    ov.querySelector('#locBody').innerHTML = `<div class="locpanel" style="--lc:${esc(l.color)}">
      <div class="revgrp"><span class="dot" style="background:${esc(l.color)}"></span>NOMBRE Y COLOR</div>
      <div class="locgrid2">
        <label class="pinlbl">Nombre<input type="text" class="logininp" data-libre data-lf="nombre" value="${esc(l.nombre)}"></label>
        <label class="pinlbl">Abreviatura<input type="text" class="logininp" data-libre data-lf="corto" maxlength="4" value="${esc(l.corto || '')}"></label>
        <label class="pinlbl">Color<input type="color" class="logininp colorinp" data-libre data-lf="color" value="${esc(l.color || '#6e6e6e')}"></label>
      </div>
      <div class="revgrp"><span class="dot" style="background:${esc(l.color)}"></span>CUÁNDO ABRE</div>
      <p class="filltxt" style="margin:0 0 6px">El horario de todas las semanas.</p>
      <div class="tscrollx"><table class="loctab abretab"><thead><tr><th></th>${TODOS.map(d => `<th>${DIAS_L[d].slice(0, 3)}</th>`).join('')}</tr></thead><tbody>${FRANJAS.map(filaAbre).join('')}</tbody></table></div>
      <div class="revgrp"><span class="dot" style="background:${esc(l.color)}"></span>CIERRES POR FECHAS</div>
      <p class="filltxt" style="margin:0 0 6px">«Cuándo abre» cambia todas las semanas. Para cerrar solo unos días (una reforma, las vacaciones del local), un cierre por fechas: al pasar, el local vuelve a abrir solo, y al cerrarlo se decide qué hace cada persona esos días.</p>
      <div class="cielista">${htmlCierresLocal(l.id)}</div>
      <button type="button" class="btn-mini" data-cienuevo style="margin-top:6px">＋ Cerrar unos días</button>
      <div class="revgrp"><span class="dot" style="background:${esc(l.color)}"></span>PERSONAS MÍNIMAS POR CASILLA</div>
      <p class="filltxt" style="margin:0 0 6px">Cuántas personas hacen falta como mínimo cada día y franja (los eventos añaden refuerzo aparte). El <b class="supstar">*</b> ámbar marca un mínimo supuesto.</p>
      <div class="tscrollx"><table class="loctab mintab"><thead><tr><th></th>${TODOS.map(d => `<th>${DIAS_L[d].slice(0, 3)}</th>`).join('')}</tr></thead><tbody>${FRANJAS.map(filaMin).join('')}</tbody></table></div>
      <div class="revgrp"><span class="dot" style="background:${esc(l.color)}"></span>HORARIO</div>
      <div class="tscrollx"><table class="loctab hortab"><thead><tr><th></th><th>Entrada</th><th>Salida</th><th>Sábado</th><th>Domingo</th></tr></thead><tbody>
        ${FRANJAS.map(f => `<tr><th>${FRANJA_LBL[f]}</th>
          <td><input type="time" data-libre data-hor="${f}|ini" value="${esc((l.horario[f] || {}).ini || '')}" aria-label="Entrada ${esc(FRANJA_LBL[f])}"></td>
          <td><input type="time" data-libre data-hor="${f}|fin" value="${esc((l.horario[f] || {}).fin || '')}" aria-label="Salida ${esc(FRANJA_LBL[f])}"></td>
          ${[6, 7].map(d => `<td><span class="horx"><input type="time" data-libre data-horx="${d}|${f}|ini" value="${esc(hx(d, f, 'ini'))}" aria-label="Entrada ${esc(FRANJA_LBL[f])} ${esc(DOW_PL[d])}"><input type="time" data-libre data-horx="${d}|${f}|fin" value="${esc(hx(d, f, 'fin'))}" aria-label="Salida ${esc(FRANJA_LBL[f])} ${esc(DOW_PL[d])}"></span></td>`).join('')}</tr>`).join('')}
      </tbody></table></div>
      <p class="filltxt" style="margin:4px 0 6px">Sábado y domingo: solo si cambia (la mañana abre a las 08:00); en blanco, el horario normal.</p>
      <div class="tscrollx"><table class="loctab hortab"><thead><tr><th>Turno partido</th><th>Entrada</th><th>Salida</th><th>Sábado</th><th>Domingo</th></tr></thead><tbody>
        ${FRANJAS.map(f => `<tr><th>${FRANJA_LBL[f]}</th>
          <td><input type="time" data-libre data-horp="${f}|ini" value="${esc(((l.horarioPartido || {})[f] || {}).ini || '')}" aria-label="Entrada del partido, ${esc(FRANJA_LBL[f])}"></td>
          <td><input type="time" data-libre data-horp="${f}|fin" value="${esc(((l.horarioPartido || {})[f] || {}).fin || '')}" aria-label="Salida del partido, ${esc(FRANJA_LBL[f])}"></td>
          ${[6, 7].map(d => `<td><span class="horx"><input type="time" data-libre data-horpx="${d}|${f}|ini" value="${esc(hpx(d, f, 'ini'))}" aria-label="Entrada del partido, ${esc(FRANJA_LBL[f])} ${esc(DOW_PL[d])}"><input type="time" data-libre data-horpx="${d}|${f}|fin" value="${esc(hpx(d, f, 'fin'))}" aria-label="Salida del partido, ${esc(FRANJA_LBL[f])} ${esc(DOW_PL[d])}"></span></td>`).join('')}</tr>`).join('')}
      </tbody></table></div>
      <p class="filltxt" style="margin:4px 0 6px">Un partido son <b>ocho horas repartidas entre las dos franjas</b>: entre semana 5 y 3, el fin de semana 4 y 4 (lo dijo el cliente el 16/09, «aunque depende a veces según la necesidad»). Quien <b>abre</b> una franja entra a la hora de apertura y hace el tramo largo. ${repartoTxt(l)} En blanco, el horario normal del local.</p>
      <div class="locgrid2">
        ${FRANJAS.map(f => `<label class="pinlbl">Horas que cuenta un turno de ${FRANJA_LBL[f].toLowerCase()}<input type="number" class="logininp" min="0" max="12" step="0.5" inputmode="decimal" data-libre data-dur="${f}" value="${(l.duracion && +l.duracion[f]) ? Math.round(+l.duracion[f] / 6) / 10 : ''}" placeholder="lo que el local abre"></label>`).join('')}
      </div>
      <p class="filltxt" style="margin:4px 0 6px">El local abre nueve horas por la mañana, pero el cliente dice <b>ocho horas por turno más o menos</b>: esto es lo que se cuenta para la nómina. En blanco se cuenta todo lo que el local está abierto. Un turno continuo (abre la mañana y la tarde del mismo local) es un solo turno seguido y se cuenta una vez.</p>
      <div class="locgrid2">
        <label class="singchk chkrow"><input type="checkbox" data-libre data-lf="horarioConfirmado"${l.horarioSupuesto ? '' : ' checked'}> Horario confirmado por el grupo</label>
        <label class="singchk chkrow"><input type="checkbox" data-libre data-lf="partidoConfirmado"${l.horarioPartidoSupuesto ? '' : ' checked'}> Tramos del partido confirmados</label>
        <label class="singchk chkrow"><input type="checkbox" data-libre data-lf="cierreAprox"${l.cierreAprox ? ' checked' : ''}> La hora de cierre de la tarde es aproximada</label>
        <label class="singchk chkrow"><input type="checkbox" data-libre data-lf="duracionConfirmada"${l.duracionSupuesta ? '' : ' checked'}> Horas por turno confirmadas</label>
        <label class="pinlbl">Descanso por turno (minutos)<input type="number" class="logininp" min="0" max="180" step="5" inputmode="numeric" data-libre data-lf="descansoMin" value="${+l.descansoMin || 0}"></label>
      </div>
      <div class="revgrp"><span class="dot" style="background:${esc(l.color)}"></span>COCINA</div>
      <div class="locgrid2">
        ${FRANJAS.map(f => `<label class="singchk chkrow"><input type="checkbox" data-libre data-cocobl="${f}"${l.cocina.obligatoria[f] ? ' checked' : ''}> Cocina obligatoria de ${FRANJA_LBL[f].toLowerCase()}</label>`).join('')}
      </div>
      <div class="locgrid2">
        ${FRANJAS.map(f => `<div><div class="pinlbl">Titulares de ${FRANJA_LBL[f].toLowerCase()} (por orden)</div>
          <div class="coclist">${listaOrdenada(l.cocina.titulares[f] || [], 'tit', f + '|')}</div>
          <span class="addrow"><select class="logininp" data-libre data-titsel="${f}">${selCocina(l, l.cocina.titulares[f] || [])}</select><button type="button" class="btn-mini" data-titadd="${f}">Añadir</button></span></div>`).join('')}
      </div>
      <div class="pinlbl">Reservas (cocinan si falta el titular, en cualquier franja)</div>
      <div class="coclist">${listaOrdenada(l.cocina.reservas, 'res')}</div>
      <span class="addrow"><select class="logininp" data-libre data-ressel>${selCocina(l, l.cocina.reservas)}</select><button type="button" class="btn-mini" data-resadd>Añadir</button></span>
      <div class="locgrid2" style="margin-top:8px">
        ${FRANJAS.map(f => `<div><label class="pinlbl">Posición de la cocina · ${FRANJA_LBL[f].toLowerCase()}<select class="logininp" data-libre data-cocpos="${f}"><option value="2"${(l.cocina.posicion[f] || 2) === 2 ? ' selected' : ''}>2.ª (tras quien abre)</option><option value="3"${l.cocina.posicion[f] === 3 ? ' selected' : ''}>3.ª</option></select></label>
          <label class="pinlbl">…a partir de cuántas personas<input type="number" class="logininp" min="2" max="10" inputmode="numeric" data-libre data-cocdesde="${f}" value="${l.cocina.posicionSiDesde[f] || ''}" placeholder="siempre"></label></div>`).join('')}
      </div>
      <div class="revgrp"><span class="dot" style="background:${esc(l.color)}"></span>QUIÉN ABRE (SALE PRIMERO)</div>
      <div class="locgrid2">
        ${FRANJAS.map(f => `<label class="pinlbl">${FRANJA_LBL[f]}<select class="logininp" data-libre data-primero="${f}">${personasSel(l.primero[f], '— quien tenga «abre» en su ficha —')}</select></label>`).join('')}
      </div>
      <label class="singchk chkrow" style="margin-top:8px"><input type="checkbox" data-libre data-lf="partidoAbreT"${l.partidoAbre && l.partidoAbre.T ? ' checked' : ''}> Quien hace partido puede abrir la tarde <small>(no hace falta una cobertura entera: si quien abre libra, la tarde la hace quien viene de la mañana en partido)</small></label>
    </div>`;
  };
  const pinta = () => { pintaTabs(); pintaLocal(); };
  pinta();
  const mueve = (arr, op, i) => {
    if (op === 'rm') arr.splice(i, 1);
    else if (op === 'up' && i > 0) { const [x] = arr.splice(i, 1); arr.splice(i - 1, 0, x); }
    else if (op === 'down' && i < arr.length - 1) { const [x] = arr.splice(i, 1); arr.splice(i + 1, 0, x); }
  };
  ov.addEventListener('click', e => {
    const t = e.target;
    if (t === ov || t.closest('[data-ovx]')) { cerrar(); return; }
    const tab = t.closest('[data-loctab]'); if (tab) { actual = tab.dataset.loctab; pinta(); return; }
    const l = localDe(S, actual); if (!l) return;
    const ab = t.closest('[data-abre]');
    if (ab) {
      const [f, d] = ab.dataset.abre.split('|'); const dow = +d;
      const arr = l.abre[f] = l.abre[f] || [];
      // 24/09 (reunión y mensaje de Diego): para cerrar el Mónaco «este domingo» lo quitó aquí y se
      // cerraron TODOS los domingos. Al desmarcar se avisa de que es para todas las semanas y se ofrece
      // el cierre por fechas; y si ya había gente puesta en semanas planificadas, pasa por el visor.
      if (arr.includes(dow)) { avisoCuandoAbre(l, f, dow, () => { anota(l, 'apertura'); pintaLocal(); }, pintaLocal); return; }
      arr.push(dow); arr.sort((a, b) => a - b);
      anota(l, 'apertura');
      // si al quitarlo se cerraron las semanas ya planificadas, se ofrece reabrirlas (revisión F2)
      ofrecerReabrirHorario(l, f, dow);
      pintaLocal(); return;
    }
    if (t.closest('[data-cienuevo]')) { openCierre({ localId: l.id, despues: pintaLocal }); return; }
    const ce = t.closest('[data-cieedit]'); if (ce) { openCierre({ id: ce.dataset.cieedit, editar: true, despues: pintaLocal }); return; }
    const cv = t.closest('[data-ciever]'); if (cv) { openCierre({ id: cv.dataset.ciever, despues: pintaLocal }); return; }
    const cr = t.closest('[data-ciereabrir]'); if (cr) { reabrirCierreUI(cr.dataset.ciereabrir, pintaLocal); return; }
    const sp = t.closest('[data-sup]');
    if (sp) {
      const [f, d] = sp.dataset.sup.split('|');
      l.supuestos[f] = l.supuestos[f] || {};
      if (l.supuestos[f][d]) delete l.supuestos[f][d]; else l.supuestos[f][d] = true;
      anota(l, 'mínimos supuestos'); pintaLocal(); return;
    }
    const tk = t.closest('[data-tit]');
    if (tk) {
      const [f, op, i] = tk.dataset.tit.split('|');
      // quitar, también de su ficha (fase 5, S36); subir y bajar solo cambian el orden
      if (op === 'rm') { const pid = l.cocina.titulares[f][+i]; if (pid) cambiaCocina(l, { lista: 'titulares', franja: f, pid, quitar: true }); }
      else { mueve(l.cocina.titulares[f], op, +i); anota(l, `cocina de ${FRANJA_LBL[f].toLowerCase()}`); }
      pintaLocal(); return;
    }
    for (const f of FRANJAS) {
      const ta = t.closest(`[data-titadd="${f}"]`);
      if (ta) {
        const pid = ov.querySelector(`[data-titsel="${f}"]`).value;
        if (!pid) { toast('Elige a alguien', 'warn'); return; }
        if (!l.cocina.titulares[f].includes(pid)) cambiaCocina(l, { lista: 'titulares', franja: f, pid });
        pintaLocal(); return;
      }
    }
    const rk = t.closest('[data-res]');
    if (rk) {
      const [op, i] = rk.dataset.res.split('|');
      if (op === 'rm') { const pid = l.cocina.reservas[+i]; if (pid) cambiaCocina(l, { lista: 'reservas', pid, quitar: true }); }
      else { mueve(l.cocina.reservas, op, +i); anota(l, 'reservas de cocina'); }
      pintaLocal(); return;
    }
    if (t.closest('[data-resadd]')) {
      const pid = ov.querySelector('[data-ressel]').value;
      if (!pid) { toast('Elige a alguien', 'warn'); return; }
      if (!l.cocina.reservas.includes(pid)) cambiaCocina(l, { lista: 'reservas', pid });
      pintaLocal();
    }
  });
  ov.addEventListener('change', e => {
    const t = e.target; const l = localDe(S, actual); if (!l) return;
    if (t.dataset.lf) {
      const k = t.dataset.lf;
      if (k === 'nombre') { const v = t.value.trim(); if (!v) { t.value = l.nombre; return; } l.nombre = v; anota(l, 'nombre'); pintaTabs(); }
      else if (k === 'corto') { l.corto = t.value.trim().toUpperCase().slice(0, 4) || l.corto; t.value = l.corto; anota(l, 'abreviatura'); }
      else if (k === 'color') { l.color = t.value; anota(l, 'color'); pinta(); }
      else if (k === 'descansoMin') { l.descansoMin = Math.max(0, +t.value || 0); anota(l, 'descanso'); }
      else if (k === 'horarioConfirmado') { l.horarioSupuesto = !t.checked; anota(l, t.checked ? 'horario confirmado' : 'horario marcado como supuesto'); }
      else if (k === 'partidoConfirmado') { l.horarioPartidoSupuesto = !t.checked; anota(l, t.checked ? 'tramos del partido confirmados' : 'tramos del partido marcados como supuestos'); }
      else if (k === 'cierreAprox') { l.cierreAprox = t.checked; anota(l, t.checked ? 'cierre de la tarde aproximado' : 'cierre de la tarde fijo'); }
      else if (k === 'duracionConfirmada') { l.duracionSupuesta = !t.checked; anota(l, t.checked ? 'horas por turno confirmadas' : 'horas por turno marcadas como supuestas'); }
      else if (k === 'partidoAbreT') { l.partidoAbre = Object.assign({ M: false, T: false }, l.partidoAbre || {}); l.partidoAbre.T = t.checked; anota(l, t.checked ? 'quien hace partido puede abrir la tarde' : 'el partido ya no abre la tarde'); }
      return;
    }
    if (t.dataset.min) {
      const [f, d] = t.dataset.min.split('|');
      l.minimos[f] = l.minimos[f] || {}; l.minimos[f][d] = Math.max(0, Math.min(20, +t.value || 0)); t.value = l.minimos[f][d];
      anota(l, `mínimos de ${FRANJA_LBL[f].toLowerCase()}`); return;
    }
    if (t.dataset.dur) {
      const f = t.dataset.dur, h = +t.value;
      l.duracion = l.duracion || {};
      l.duracion[f] = h > 0 ? Math.round(h * 60) : 0;
      anota(l, `horas por turno de ${FRANJA_LBL[f].toLowerCase()}`); return;
    }
    if (t.dataset.horp) {
      const [f, k] = t.dataset.horp.split('|');
      l.horarioPartido = l.horarioPartido || {};
      l.horarioPartido[f] = Object.assign({ ini: '', fin: '' }, l.horarioPartido[f] || {}, { [k]: t.value });
      anota(l, `tramo del partido de ${FRANJA_LBL[f].toLowerCase()}`); return;
    }
    if (t.dataset.horpx) {
      // la excepción solo existe con entrada Y salida; si falta una, se borra
      const [d, f] = t.dataset.horpx.split('|');
      const ini = ov.querySelector(`[data-horpx="${d}|${f}|ini"]`).value, fin = ov.querySelector(`[data-horpx="${d}|${f}|fin"]`).value;
      l.horarioPartido = l.horarioPartido || {};
      l.horarioPartido.porDow = l.horarioPartido.porDow || {};
      l.horarioPartido.porDow[d] = l.horarioPartido.porDow[d] || {};
      if (ini && fin) l.horarioPartido.porDow[d][f] = { ini, fin }; else delete l.horarioPartido.porDow[d][f];
      if (!Object.keys(l.horarioPartido.porDow[d]).length) delete l.horarioPartido.porDow[d];
      anota(l, `tramo del partido ${DOW_PL[d] || 'del fin de semana'}`); return;
    }
    if (t.dataset.hor) {
      const [f, k] = t.dataset.hor.split('|');
      l.horario[f] = l.horario[f] || { ini: '', fin: '' }; l.horario[f][k] = t.value;
      anota(l, `horario de ${FRANJA_LBL[f].toLowerCase()}`); return;
    }
    if (t.dataset.horx) {
      // la excepción solo existe con entrada Y salida; si falta una, se borra
      const [d, f] = t.dataset.horx.split('|');
      const ini = ov.querySelector(`[data-horx="${d}|${f}|ini"]`).value, fin = ov.querySelector(`[data-horx="${d}|${f}|fin"]`).value;
      l.horario.porDow[d] = l.horario.porDow[d] || {};
      if (ini && fin) l.horario.porDow[d][f] = { ini, fin }; else delete l.horario.porDow[d][f];
      if (!Object.keys(l.horario.porDow[d]).length) delete l.horario.porDow[d];
      anota(l, `horario ${DOW_PL[d] || 'del fin de semana'}`); return;
    }
    if (t.dataset.cocobl) { l.cocina.obligatoria[t.dataset.cocobl] = t.checked; anota(l, `cocina obligatoria de ${FRANJA_LBL[t.dataset.cocobl].toLowerCase()}`); return; }
    if (t.dataset.cocpos) { l.cocina.posicion[t.dataset.cocpos] = +t.value === 3 ? 3 : 2; anota(l, 'posición de la cocina'); return; }
    if (t.dataset.cocdesde) { const v = +t.value; if (v >= 2) l.cocina.posicionSiDesde[t.dataset.cocdesde] = v; else { delete l.cocina.posicionSiDesde[t.dataset.cocdesde]; t.value = ''; } anota(l, 'posición de la cocina'); return; }
    if (t.dataset.primero) {
      // (revisión F5) si su ficha no le deja abrir (Leo, «nunca de primero»; quien «no abre» este local) o está en
      // standby, se dice antes: su ficha manda y no abrirá mientras lo diga
      const f = t.dataset.primero, q = t.value ? personaDeId(t.value) : null;
      const imp = q ? fichaImpideAbrir(S, q, l.id, f) : null;
      const pega = imp ? `${imp.motivo} («${nombreRegla(imp.regla)}» en su ficha)` : q && q.standby ? `${q.nombre} está en standby: aún no entra en la planilla` : '';
      if (pega && !confirm(`${pega}. Si la pones en «Quién abre» de ${l.nombre} por la ${FRANJA_LBL[f].toLowerCase()}, no abrirá mientras su ficha lo diga.\n\n¿Ponerla igualmente?`)) { t.value = l.primero[f] || ''; return; }
      l.primero[f] = t.value || null; anota(l, `quién abre de ${FRANJA_LBL[f].toLowerCase()}`);
    }
  });
  let cerrado = false;
  // el listener de abrirOverlay (✕ y fondo) ya ha quitado el overlay cuando llega este: solo se anota una vez
  function cerrar() {
    if (cerrado) return; cerrado = true;
    if (ov.isConnected) ov.remove();
    const tocados = Object.keys(cambios);
    if (!tocados.length) return;
    for (const lid of tocados) registrarCambio(`Ajustes de ${nombreLocal(lid)}: ${[...cambios[lid]].join(', ')}`, 'cambio');
    saveState();
    repintarTrasEquipo();
    toast('Ajustes de los locales guardados', 'ok');
  }
}

// ---------- condiciones del grupo ----------
// El catálogo que comprueba el generador (condicionesDe: mínimos, cocina, fichas y
// reglas), con un interruptor por regla del grupo (S.reglas[k]) y otro por
// característica de cada ficha (p.inactivas). Lo apagado se ve tachado y se
// puede volver a encender desde aquí. Cada toque guarda y deja huella en el historial.
// (fase 5: «Quién abre» de cada local es una condición, S18)
const TIPO_COND = { minimos: 'Mínimos por local', cocina: 'Cocina de los locales', primero: 'Quién abre cada local', persona: 'Personas (sus fichas)', regla: 'Reglas del grupo' };
// a qué regla del grupo obedece cada condición (null: no depende de ninguna)
function reglaDeCondicion(c) {
  if (c.tipo === 'minimos') return 'minimos';
  if (c.tipo === 'cocina') return 'cocina';
  if (c.tipo === 'primero') return 'abre';
  if (c.tipo === 'regla') return c.k;
  return ['libra', 'partido', 'vetos', 'nuncaCon', 'cubreA', 'cocina', 'abre', 'noPrimero'].includes(c.k) ? c.k : null;
}
// el mismo catálogo con TODO encendido: de ahí salen los textos de lo apagado
function condicionesTodas() {
  return condicionesDe(Object.assign({}, S, { reglas: {} }), S.staff.map(p => Object.assign({}, p, { inactivas: [] })));
}
function htmlToggle(on, attrs, lbl) {
  return `<label class="tgl"><input type="checkbox" role="switch" aria-checked="${on ? 'true' : 'false'}" aria-label="${esc(lbl)}" data-libre ${attrs}${on ? ' checked' : ''}><span class="tglk"></span><span class="tgll">${on ? 'Activa' : 'Apagada'}</span></label>`;
}
function openCondiciones() {
  S.reglas = S.reglas && typeof S.reglas === 'object' ? S.reglas : {};
  let q = '';
  const ov = abrirOverlay('condOvl', `<span class="micro">EQUIPO</span>
    <h2 class="revh2">Condiciones del grupo</h2>
    <p class="revsub">Lo que el generador comprueba, sacado de los locales y de las fichas. Apaga una regla para todo el grupo o una característica de una ficha; lo apagado no lo mira nadie (ni el generador, ni el selector, ni la revisión) hasta que lo vuelvas a encender. Se guarda al momento.</p>
    <div class="condtop"><span class="condcount" id="condCount" aria-live="polite"></span><input type="search" class="logininp condq" id="condQ" data-libre placeholder="Filtra por persona, local o texto…" aria-label="Filtrar condiciones"></div>
    <div id="condBody"></div>
    <div class="bar" style="display:flex;justify-content:flex-end;margin-top:14px"><button type="button" class="btn btn-cta" data-ovx>Listo</button></div>`, { ancho: 720 });
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const fila = (c, ctrl, extra) => {
    const x = extra || {};
    return `<div class="condrow${c.informativa ? ' info' : ''}${x.off ? ' off' : ''}" data-cid="${esc(c.id)}" data-q="${esc(norm(c.texto + ' ' + (x.q || '')))}">
      <span class="condnum">${x.off ? '—' : c.num}</span>
      <span class="condtx">${esc(c.texto)}${c.nueva ? ' <span class="condnew">NUEVA</span>' : ''}${c.informativa ? ' <small class="condinfo">informativa: no bloquea</small>' : ''}${x.nota ? ` <small class="condinfo">${esc(x.nota)}</small>` : ''}</span>
      ${ctrl || ''}</div>`;
  };
  const pinta = () => {
    const activas = condicionesDe(S, S.staff);
    const ids = new Set(activas.map(c => c.id));
    const todas = condicionesTodas();
    // ---- reglas del grupo ----
    let h = `<div class="revgrp"><span class="dot" style="background:var(--accent)"></span>REGLAS DEL GRUPO</div>
      <p class="filltxt" style="margin:0 0 6px">Cada regla vale para todo el grupo. Apagada, ninguna ficha ni local la aplica.</p>`;
    let reglasOff = 0;
    for (const r of REGLAS) {
      const on = regla(S, r.k); if (!on) reglasOff++;
      // 24/09 (fase 5, D5): apagada, dice lo que pasa (el texto sale del modelo, REGLAS)
      h += `<div class="condrow regla${on ? '' : ' off'}" data-regla-row="${r.k}" data-q="${esc(norm(r.lbl))}"><span class="condnum">${on ? '●' : '○'}</span><span class="condtx">${esc(r.lbl)}${r.nueva ? ' <span class="condnew">NUEVA</span>' : ''}${!on && r.apagada ? ` <small class="condinfo">${esc(r.apagada)}</small>` : ''}</span>${htmlToggle(on, `data-regla="${r.k}"`, `Regla: ${r.lbl}`)}</div>`;
    }
    // ---- condiciones activas, por tipo ----
    h += `<div class="revgrp" style="margin-top:18px"><span class="dot" style="background:var(--teal)"></span>CONDICIONES ACTIVAS · ${activas.length}</div>
      <p class="filltxt" style="margin:0 0 6px">Numeradas como en la hoja del generador. Las de una ficha se apagan aquí mismo; las de un local se cambian en sus ajustes.</p>`;
    for (const tipo of Object.keys(TIPO_COND)) {
      const lista = activas.filter(c => c.tipo === tipo);
      if (!lista.length) continue;
      h += `<div class="condgrp" data-grp="${tipo}"><b>${esc(TIPO_COND[tipo])}</b> <span class="micro">${lista.length}</span></div>`;
      for (const c of lista) {
        let ctrl = '';
        if (c.tipo === 'persona') {
          const p = personaDeId(c.pid);
          const q = c.k === 'nuncaCon' && c.otro ? ` y ${nombrePid(c.otro)}` : '';
          ctrl = htmlToggle(true, `data-car="${esc(c.pid)}|${esc(c.k)}"`, `«${lblCaracteristica(c.k)}» en la ficha de ${p ? p.nombre : c.pid}${q}`);
        } else if (c.tipo === 'minimos' || c.tipo === 'cocina' || c.tipo === 'primero') ctrl = `<button type="button" class="condlnk" data-condlocal="${esc(c.localId)}">Ajustes del local</button>`;
        else if (c.tipo === 'regla') ctrl = `<button type="button" class="condlnk" data-irregla="${esc(c.k)}">Regla del grupo ↑</button>`;
        h += fila(c, ctrl, { q: c.tipo === 'persona' ? nombrePid(c.pid) + ' ' + lblCaracteristica(c.k) : c.localId ? nombreLocal(c.localId) : '' });
      }
    }
    // ---- apagadas: características de fichas (p.inactivas) y reglas del grupo ----
    const off = [], porId = {};
    const lblRegla = rk => (REGLAS.find(r => r.k === rk) || { lbl: rk }).lbl;
    for (const p of S.staff) for (const k of p.inactivas || []) {
      // «nunca con» es un par: la misma condición puede estar apagada en las dos fichas y sale una vez
      const textos = todas.filter(c => c.tipo === 'persona' && c.k === k && (c.pid === p.id || c.otro === p.id));
      const porRegla = reglaDeCondicion({ tipo: 'persona', k }) && !regla(S, k);
      const base = { tipo: 'persona', pid: p.id, k, nueva: k === 'noPrimero', fichas: [p.nombre] };
      if (!textos.length) { off.push(Object.assign({ id: `off:${p.id}:${k}`, texto: `${p.nombre}: ${lblCaracteristica(k).toLowerCase()} (sin datos en la ficha)` }, base)); continue; }
      for (const c of textos) {
        if (porId[c.id]) { porId[c.id].fichas.push(p.nombre); continue; }
        off.push(porId[c.id] = Object.assign({}, c, base, { id: `off:${p.id}:${k}:${c.id}`, fichas: [p.nombre], porRegla }));
      }
    }
    for (const o of off) o.nota = `apagada en la${o.fichas.length > 1 ? 's fichas' : ' ficha'} de ${o.fichas.join(' y ')}${o.porRegla ? ' · y la regla del grupo también' : ''}`;
    // lo que falta del catálogo porque su regla del grupo está apagada
    for (const c of todas) {
      if (ids.has(c.id) || porId[c.id]) continue;
      const rk = reglaDeCondicion(c); if (!rk || regla(S, rk)) continue;
      if (c.tipo === 'persona' && off.some(o => o.pid === c.pid && o.k === c.k)) continue;
      off.push(Object.assign({}, c, { id: `off:regla:${c.id}`, rk, nota: `la regla «${lblRegla(rk)}» está apagada` }));
    }
    const nOffFichas = S.staff.reduce((a, p) => a + (p.inactivas || []).length, 0);
    h += `<div class="revgrp" style="margin-top:18px"><span class="dot" style="background:var(--ink3)"></span>APAGADAS · ${off.length}</div>`;
    if (!off.length) h += '<div class="festvacio">Nada apagado: el generador lo comprueba todo.</div>';
    else {
      h += '<p class="filltxt" style="margin:0 0 6px">Tachado lo que el generador no está mirando. Enciéndelo desde aquí cuando quieras.</p>';
      for (const c of off) {
        const ctrl = c.tipo === 'persona' && !c.rk ? htmlToggle(false, `data-car="${esc(c.pid)}|${esc(c.k)}"`, `«${lblCaracteristica(c.k)}» en la ficha de ${nombrePid(c.pid)}`)
          : htmlToggle(false, `data-regla="${esc(c.rk)}"`, `Regla: ${lblRegla(c.rk)}`);
        h += fila(c, ctrl, { off: true, nota: c.nota, q: c.pid ? nombrePid(c.pid) + ' ' + lblCaracteristica(c.k) : '' });
      }
    }
    ov.querySelector('#condBody').innerHTML = h;
    ov.querySelector('#condCount').innerHTML = `<b>${activas.length}</b> condiciones activas · <b>${nOffFichas + reglasOff}</b> apagadas${reglasOff ? ` <small>(${reglasOff} ${reglasOff === 1 ? 'regla' : 'reglas'})</small>` : ''}`;
    filtra();
  };
  const filtra = () => {
    const qq = norm(q).trim();
    let vistos = 0;
    for (const r of ov.querySelectorAll('.condrow')) { const ok = !qq || (r.dataset.q || '').includes(qq); r.hidden = !ok; if (ok) vistos++; }
    for (const g of ov.querySelectorAll('.condgrp')) { let n = g.nextElementSibling, alguno = false; while (n && n.classList.contains('condrow')) { if (!n.hidden) { alguno = true; break; } n = n.nextElementSibling; } g.hidden = !alguno; }
    const av = ov.querySelector('#condSinRes'); if (av) av.remove();
    if (qq && !vistos) ov.querySelector('#condBody').insertAdjacentHTML('beforeend', '<div class="festvacio" id="condSinRes">Nada coincide con el filtro.</div>');
  };
  pinta();
  ov.addEventListener('input', e => { if (e.target.id === 'condQ') { q = e.target.value; filtra(); } });
  ov.addEventListener('change', e => {
    const t = e.target; const ds = t.dataset || {};
    if (ds.regla) {
      const r = REGLAS.find(x => x.k === ds.regla); if (!r) return;
      const on = t.checked;
      S.reglas[r.k] = on;
      registrarCambio(`Regla «${r.lbl}» ${on ? 'activada' : 'desactivada'}`, 'equipo');
      saveState(); renderVistaActiva(); pinta();
      toast(`Regla ${on ? 'activada' : 'desactivada'} para todo el grupo${!on && r.apagada ? '. ' + r.apagada : ''}`, on ? 'ok' : 'warn');
      return;
    }
    if (ds.car) {
      const [pid, k] = ds.car.split('|');
      if (alternarCaracteristicaUI(pid, k, t.checked)) { renderVistaActiva(); pinta(); }
    }
  });
  ov.addEventListener('click', e => {
    const t = e.target;
    if (t === ov || t.closest('[data-ovx]')) return;   // lo cierra abrirOverlay
    const ll = t.closest('[data-condlocal]');
    if (ll) {
      openAjustesLocales(ll.dataset.condlocal);
      // al cerrar los ajustes (repintan Equipo) se refresca este catálogo: los mínimos pueden haber cambiado
      new MutationObserver((m, obs) => { if (!document.getElementById('localesOvl')) { obs.disconnect(); if (ov.isConnected) pinta(); } }).observe(document.body, { childList: true });
      return;
    }
    const ir = t.closest('[data-irregla]');
    if (ir) {
      const row = ov.querySelector(`[data-regla-row="${CSS.escape(ir.dataset.irregla)}"]`); if (!row) return;
      row.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      row.classList.add('flash'); setTimeout(() => row.classList.remove('flash'), 1400);
      const inp = row.querySelector('input'); if (inp) inp.focus({ preventScroll: true });
    }
  });
  setTimeout(() => { const i = ov.querySelector('#condQ'); if (i && !matchMedia('(hover:none)').matches) i.focus(); }, 60);
  return ov;
}

// ---------- eventos de la vista ----------
document.addEventListener('click', e => {
  const root = $('#equipoRoot'); if (!root || !root.contains(e.target)) return;
  const t = e.target;
  const aj = t.closest('[data-locajustes]'); if (aj) { openAjustesLocales(aj.dataset.locajustes); return; }
  const rm = t.closest('[data-rmabs]');
  if (rm) {
    const [pid, i] = rm.dataset.rmabs.split(':');
    const aviso = quitarAusenciaUI(pid, +i);
    if (aviso) { repintarTrasEquipo(); toast(aviso, 'warn'); }
    return;
  }
  const add = t.closest('[data-addabs]');
  if (add) {
    const f = root.querySelector(`[data-absform="${CSS.escape(add.dataset.addabs)}"]`);
    if (f) { f.classList.toggle('hidden'); add.classList.toggle('hidden'); const d = f.querySelector('[data-f="desde"]'); if (!f.classList.contains('hidden') && d) d.focus(); }
    return;
  }
  const cancel = t.closest('[data-cancelabs]');
  if (cancel) {
    const f = cancel.closest('[data-absform]'); if (f) { f.classList.add('hidden'); f.reset(); }
    const b = root.querySelector(`[data-addabs="${CSS.escape(cancel.dataset.cancelabs)}"]`); if (b) b.classList.remove('hidden');
    return;
  }
  const fi = t.closest('[data-ficha]'); if (fi) openFicha(fi.dataset.ficha);
});
document.addEventListener('submit', e => {
  const f = e.target.closest && e.target.closest('[data-absform]');
  if (!f || !$('#equipoRoot') || !$('#equipoRoot').contains(f)) return;
  e.preventDefault();
  const v = k => { const el = f.querySelector(`[data-f="${k}"]`); return el ? el.value.trim() : ''; };
  const tipo = v('tipo'), desde = v('desde'); let hasta = v('hasta');
  if (tipo !== 'BAJ' && !hasta) hasta = desde;
  altaAusenciaUI(f.dataset.absform, { tipo, desde, hasta: hasta || undefined, detalle: v('detalle'), franjas: v('franja') ? [v('franja')] : undefined }, () => repintarTrasEquipo());
});
document.addEventListener('change', e => {
  // en el formulario de ausencia, elegir «Baja» vacía el «Hasta»: lo normal es que no se sepa
  const f = e.target.closest && e.target.closest('[data-absform]');
  if (!f || e.target.dataset.f !== 'tipo') return;
  const h = f.querySelector('[data-f="hasta"]'); if (h) h.value = e.target.value === 'BAJ' ? '' : (h.value || f.querySelector('[data-f="desde"]').value);
});
{
  const bp = $('#btnPersonas'); if (bp) bp.addEventListener('click', () => openPersonas());
  const bl = $('#btnLocales');
  if (bl) {
    bl.addEventListener('click', () => openAjustesLocales());
    // el botón de las condiciones vive junto al de los locales (la plantilla no lo trae)
    if (!$('#btnCondiciones')) bl.insertAdjacentHTML('beforebegin', '<button type="button" class="btn btn-sec" id="btnCondiciones" title="Reglas del grupo y condiciones que comprueba el generador">Condiciones</button>');
    $('#btnCondiciones').addEventListener('click', () => openCondiciones());
  }
}
