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

// Todas las condiciones de una persona como chips. Es la «hoja de condiciones»
// que el encargado revisa antes de generar: si algo no está aquí, el generador
// no lo sabe.
function chipsCondiciones(p) {
  const h = [];
  const locs = p.locales || [];
  if (locs.length) for (const id of locs) h.push(tchip('Local', chipLocal(id), 'loc'));
  else h.push(tchip('Local', 'cualquiera (comodín)', 'teal'));
  h.push(tchip('Franja', esc(lblFranjas(p.franjas))));
  const pd = p.partido || {};
  if (pd.siempre) h.push(tchip('Partido', 'siempre', 'fix'));
  else if ((pd.dias || []).length) h.push(tchip('Partido', esc(lblDows(pd.dias))));
  if (p.libreVariable) h.push(tchip('Libra', 'libre variable', 'warn'));
  else if ((p.libra || []).length) h.push(tchip('Libra', esc(lblDows(p.libra))));
  const c = p.cocina || {};
  if (c.nunca) h.push(tchip('Cocina', 'nunca', 'warn'));
  else {
    for (const id of c.titular || []) h.push(tchip('Cocina', chipLocal(id, '· titular'), 'loc'));
    for (const id of c.reserva || []) h.push(tchip('Cocina', chipLocal(id, '· reserva'), 'loc'));
    if (p.puesto === 'cocina' && !(c.titular || []).length && !(c.reserva || []).length) h.push(tchip('Cocina', 'por su puesto'));
    if ((c.soloDias || []).length) h.push(tchip('Cocina', 'solo ' + esc(c.soloDias.map(lblDowPl).join(' y ')), 'warn'));
  }
  for (const [lid, fr] of Object.entries(p.abre || {})) if ((fr || []).length) h.push(tchip('Abre', chipLocal(lid, fr.map(f => FRANJA_LBL[f].toLowerCase()).join(' y ')), 'loc'));
  for (const lid of p.noAbre || []) h.push(tchip('No abre', chipLocal(lid), 'loc warn'));
  if ((p.nuncaCon || []).length) h.push(tchip('Nunca con', esc(p.nuncaCon.map(nombrePid).join(', ')), 'warn'));
  for (const cb of p.cubreA || []) {
    const cuando = [cb.dow ? lblDowPl(cb.dow) : '', cb.turnoId ? lblTurno(cb.turnoId) : ''].filter(Boolean).join(' · ');
    h.push(tchip('Cubre a', esc(nombrePid(cb.pid)) + (cuando ? ` <small>(${esc(cuando)})</small>` : ''), 'fix'));
  }
  for (const v of p.vetos || []) h.push(tchip('No hace', chipLocal(v.localId, v.franja === 'M' ? 'mañanas' : 'tardes'), 'loc warn'));
  if (p.contrato && +p.contrato.horasSemana > 0) h.push(tchip('Contrato', `${+p.contrato.horasSemana} h/semana`));
  if (p.prefs && (p.prefs.evitaDows || []).length) h.push(tchip('Prefiere no', esc(lblDows(p.prefs.evitaDows)), 'teal', 'criterio personal: no bloquea, el generador lo respeta al priorizar'));
  if (p.prefs && p.prefs.nota) h.push(tchip('Criterio', esc(p.prefs.nota), 'teal'));
  for (const s of p.supuestos || []) h.push(tchip('Supuesto', esc(s), 'warn', 'decidido por Highkey, pendiente de confirmar con el grupo'));
  if (p.nota) h.push(tchip('Nota', esc(p.nota), '', p.nota));
  return h.join('');
}
function chipsAusencias(p) {
  return (p.ausencias || []).map((a, i) => {
    const rango = a.hasta ? (a.hasta !== a.desde ? `${fmtDM(a.desde)}–${fmtDM(a.hasta)}` : fmtDM(a.desde)) : `desde ${fmtDM(a.desde)}`;
    const lbl = (AUS_LBL[a.tipo] || { label: a.tipo }).label;
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
    <p class="filltxt" style="margin:0">Una baja puede ir sin fecha de fin: deja «Hasta» vacío.</p>
    <div class="bar"><button type="button" class="btn-mini ghost" data-cancelabs="${esc(p.id)}">Cancelar</button><button type="submit" class="btn-mini">Guardar</button></div>
  </form>`;
}
function htmlTarjetaPersona(p, baja) {
  const locs = (p.locales || []).map(id => (localDe(S, id) || { corto: id }).corto).join(' · ');
  return `<div class="pcard${baja ? ' baja' : ''}" data-pcard="${esc(p.id)}">
    <div class="pchead"><span class="av" data-ficha="${esc(p.id)}" style="cursor:pointer;background:${avColor(p.id)}">${esc(initials(p.nombre))}</span>
      <span data-ficha="${esc(p.id)}" style="min-width:0;cursor:pointer"><b>${esc(p.nombre)}</b><small>${esc(lblPuesto(p.puesto))}${locs ? ' · ' + esc(locs) : ' · comodín'}${baja ? ' · de baja' : ''}</small></span>
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
  const enActivo = S.staff.filter(p => !deBaja(p));
  const deBajaHoy = S.staff.filter(p => deBaja(p));
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
  h += seccion('Comodines y varios locales', varios, { sub: 'sin local fijo o con más de uno', vacio: 'Nadie trabaja en varios locales.' });
  if (deBajaHoy.length) h += seccion('De baja', deBajaHoy, { baja: true, sub: 'no cuentan para el generador' });
  root.innerHTML = h;
  const stats = $('#eqStats');
  if (stats) {
    const comodines = enActivo.filter(esComodin).length;
    const cocineros = enActivo.filter(p => p.puesto === 'cocina' || ((p.cocina || {}).titular || []).length).length;
    stats.innerHTML = `<span class="dstat"><b>${enActivo.length}</b> en activo</span>${deBajaHoy.length ? `<span class="dstat warn"><b>${deBajaHoy.length}</b> de baja</span>` : ''}<span class="dstat"><b>${comodines}</b> comodines</span><span class="dstat"><b>${cocineros}</b> cocina</span>`;
    stats.querySelectorAll('b').forEach(countUp);
  }
}
function vistaActivaId() { const t = document.querySelector('.tab[aria-selected="true"]'); return t ? t.dataset.v : 'hoy'; }
// tras tocar a una persona: Equipo siempre, y la vista que esté abierta si es otra
function repintarTrasEquipo() { renderEquipo(); if (vistaActivaId() !== 'equipo') renderVistaActiva(); }

// ---------- ausencias (la tarjeta y la ficha comparten esto) ----------
// Alta con deshacer, y sus turnos de esos días salen de la planilla para que
// queden como huecos (mismo criterio que el ＋ del cuadrante del mes).
function altaAusenciaUI(pid, aus) {
  const p = personaDeId(pid); if (!p) return null;
  if (!aus.desde) { toast('Falta la fecha de inicio', 'warn'); return null; }
  if (aus.hasta && aus.hasta < aus.desde) { toast('La fecha de fin es anterior a la de inicio', 'warn'); return null; }
  pushUndo(`ausencia de ${p.nombre}`, { staff: true, otrosMeses: true });
  const a = { tipo: aus.tipo, desde: aus.desde }; if (aus.hasta) a.hasta = aus.hasta; if (aus.detalle) a.detalle = aus.detalle;
  const r = anadirAusencia(p, a);
  let quitados = 0;
  for (const iso of rangoIso(r.ausencia.desde, r.ausencia.hasta || addDias(r.ausencia.desde, 60))) {
    const e = estadoDeIso(iso, true);
    for (const t of turnosDe(S)) if (desasignar(e, iso, t.id, pid)) quitados++;
  }
  registrarCambio(`${(AUS_LBL[a.tipo] || { label: a.tipo }).label}: ${p.nombre} del ${fmtDM(a.desde)}${a.hasta ? ' al ' + fmtDM(a.hasta) : ' (sin fecha de fin)'}${quitados ? ` · ${quitados} turno(s) retirados de la planilla` : ''}${a.detalle ? ' · ' + a.detalle : ''}`, 'aus');
  saveState();
  toast(quitados ? `Ausencia guardada · ${quitados} turno(s) quedan por cubrir` : (r.fusionada ? 'Ausencia unida a otra del mismo tipo' : 'Ausencia guardada'), quitados ? 'warn' : 'ok');
  return r;
}
function quitarAusenciaUI(pid, idx) {
  const p = personaDeId(pid); if (!p || !p.ausencias || !p.ausencias[idx]) return false;
  const a = p.ausencias[idx];
  pushUndo(`quitar ausencia de ${p.nombre}`, { staff: true });
  p.ausencias.splice(idx, 1);
  registrarCambio(`Ausencia retirada: ${p.nombre}, ${(AUS_LBL[a.tipo] || { label: a.tipo }).label} del ${fmtDM(a.desde)}${a.hasta ? ' al ' + fmtDM(a.hasta) : ''}`, 'aus');
  saveState();
  return true;
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
      <span><label>Locales (ninguno = cualquiera, comodín)</label><div class="locset" id="persLocs">${locChips}</div></span>
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
    if (puesto === 'comodin') np.comodin = true;
    pushUndo(`alta de ${nombre}`, { staff: true });
    S.staff.push(np);
    asignarColores(S.staff);
    registrarCambio(`Alta en el equipo: ${nombre} (${lblPuesto(puesto).toLowerCase()}${locales.length ? ', ' + locales.map(nombreLocal).join(' y ') : ', comodín'})`, 'cambio');
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

// ---------- ajustes de los locales ----------
// Un diálogo con una pestaña por local. Todo se guarda al vuelo (data-libre: el
// overlay no pregunta al cerrar) y al cerrar se deja UNA entrada en el historial
// por local tocado, con lo que cambió.
function openAjustesLocales(localId) {
  const cambios = {};   // localId → Set de campos tocados
  const anota = (l, campo) => { (cambios[l.id] = cambios[l.id] || new Set()).add(campo); saveState(); };
  let actual = S.locales.some(l => l.id === localId) ? localId : S.locales[0].id;
  const ov = abrirOverlay('localesOvl', `<span class="micro">LOCALES</span>
    <h2 class="revh2">Ajustes de los locales</h2>
    <p class="revsub">Cuándo abre cada local, cuánta gente necesita, horarios, cocina y quién abre. Se guarda al momento; el asterisco ámbar marca lo que Highkey supuso y el grupo aún no ha confirmado.</p>
    <div class="segrow loctabs" id="locTabs"></div>
    <div id="locBody"></div>
    <div class="bar" style="display:flex;justify-content:flex-end;margin-top:14px"><button type="button" class="btn btn-cta" data-ovx>Listo</button></div>`, { ancho: 760 });
  const pintaTabs = () => {
    ov.querySelector('#locTabs').innerHTML = S.locales.map(l => `<button type="button" class="segk${l.id === actual ? ' on' : ''}" data-loctab="${esc(l.id)}" style="--lc:${esc(l.color)}"><i class="ldot"></i>${esc(l.nombre)}</button>`).join('');
  };
  const personasSel = (sel, vacio) => `<option value="">${esc(vacio)}</option>` + activos().map(p => `<option value="${esc(p.id)}"${sel === p.id ? ' selected' : ''}>${esc(p.nombre)}</option>`).join('');
  // candidatos a cocina: primero quien ya cocina en ese local (o es de cocina), luego el resto por si acaso
  const selCocina = (l, excluidos) => {
    const libres = activos().filter(p => !excluidos.includes(p.id));
    const aptos = libres.filter(p => puedeCocina(S, p, l.id, null) || p.puesto === 'cocina');
    const otros = libres.filter(p => !aptos.includes(p));
    return `<option value="">— elegir persona —</option>` +
      (aptos.length ? `<optgroup label="Cocina de este local">${aptos.map(p => `<option value="${esc(p.id)}">${esc(p.nombre)}</option>`).join('')}</optgroup>` : '') +
      (otros.length ? `<optgroup label="Otras personas">${otros.map(p => `<option value="${esc(p.id)}">${esc(p.nombre)}</option>`).join('')}</optgroup>` : '');
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
      <div class="tscrollx"><table class="loctab abretab"><thead><tr><th></th>${TODOS.map(d => `<th>${DIAS_L[d].slice(0, 3)}</th>`).join('')}</tr></thead><tbody>${FRANJAS.map(filaAbre).join('')}</tbody></table></div>
      <div class="revgrp"><span class="dot" style="background:${esc(l.color)}"></span>PERSONAS MÍNIMAS POR CASILLA</div>
      <p class="filltxt" style="margin:0 0 6px">Cuántas personas hacen falta como mínimo cada día y franja (los eventos añaden refuerzo aparte). El <b class="supstar">*</b> ámbar marca un mínimo supuesto.</p>
      <div class="tscrollx"><table class="loctab mintab"><thead><tr><th></th>${TODOS.map(d => `<th>${DIAS_L[d].slice(0, 3)}</th>`).join('')}</tr></thead><tbody>${FRANJAS.map(filaMin).join('')}</tbody></table></div>
      <div class="revgrp"><span class="dot" style="background:${esc(l.color)}"></span>HORARIO</div>
      <div class="tscrollx"><table class="loctab hortab"><thead><tr><th></th><th>Entrada</th><th>Salida</th><th>Viernes</th><th>Sábado</th></tr></thead><tbody>
        ${FRANJAS.map(f => `<tr><th>${FRANJA_LBL[f]}</th>
          <td><input type="time" data-libre data-hor="${f}|ini" value="${esc((l.horario[f] || {}).ini || '')}" aria-label="Entrada ${esc(FRANJA_LBL[f])}"></td>
          <td><input type="time" data-libre data-hor="${f}|fin" value="${esc((l.horario[f] || {}).fin || '')}" aria-label="Salida ${esc(FRANJA_LBL[f])}"></td>
          ${[5, 6].map(d => `<td><span class="horx"><input type="time" data-libre data-horx="${d}|${f}|ini" value="${esc(hx(d, f, 'ini'))}" aria-label="Entrada ${esc(FRANJA_LBL[f])} ${esc(DOW_PL[d])}"><input type="time" data-libre data-horx="${d}|${f}|fin" value="${esc(hx(d, f, 'fin'))}" aria-label="Salida ${esc(FRANJA_LBL[f])} ${esc(DOW_PL[d])}"></span></td>`).join('')}</tr>`).join('')}
      </tbody></table></div>
      <p class="filltxt" style="margin:4px 0 6px">Viernes y sábado: solo si cambia (p. ej. la tarde hasta las 00:00); en blanco, el horario normal.</p>
      <div class="locgrid2">
        <label class="singchk chkrow"><input type="checkbox" data-libre data-lf="horarioConfirmado"${l.horarioSupuesto ? '' : ' checked'}> Horario confirmado por el grupo</label>
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
      arr.includes(dow) ? arr.splice(arr.indexOf(dow), 1) : arr.push(dow); arr.sort((a, b) => a - b);
      anota(l, 'apertura'); pintaLocal(); return;
    }
    const sp = t.closest('[data-sup]');
    if (sp) {
      const [f, d] = sp.dataset.sup.split('|');
      l.supuestos[f] = l.supuestos[f] || {};
      if (l.supuestos[f][d]) delete l.supuestos[f][d]; else l.supuestos[f][d] = true;
      anota(l, 'mínimos supuestos'); pintaLocal(); return;
    }
    const tk = t.closest('[data-tit]');
    if (tk) { const [f, op, i] = tk.dataset.tit.split('|'); mueve(l.cocina.titulares[f], op, +i); anota(l, `cocina de ${FRANJA_LBL[f].toLowerCase()}`); pintaLocal(); return; }
    for (const f of FRANJAS) {
      const ta = t.closest(`[data-titadd="${f}"]`);
      if (ta) {
        const pid = ov.querySelector(`[data-titsel="${f}"]`).value;
        if (!pid) { toast('Elige a alguien', 'warn'); return; }
        if (!l.cocina.titulares[f].includes(pid)) l.cocina.titulares[f].push(pid);
        anota(l, `cocina de ${FRANJA_LBL[f].toLowerCase()}`); pintaLocal(); return;
      }
    }
    const rk = t.closest('[data-res]');
    if (rk) { const [op, i] = rk.dataset.res.split('|'); mueve(l.cocina.reservas, op, +i); anota(l, 'reservas de cocina'); pintaLocal(); return; }
    if (t.closest('[data-resadd]')) {
      const pid = ov.querySelector('[data-ressel]').value;
      if (!pid) { toast('Elige a alguien', 'warn'); return; }
      if (!l.cocina.reservas.includes(pid)) l.cocina.reservas.push(pid);
      anota(l, 'reservas de cocina'); pintaLocal();
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
      return;
    }
    if (t.dataset.min) {
      const [f, d] = t.dataset.min.split('|');
      l.minimos[f] = l.minimos[f] || {}; l.minimos[f][d] = Math.max(0, Math.min(20, +t.value || 0)); t.value = l.minimos[f][d];
      anota(l, `mínimos de ${FRANJA_LBL[f].toLowerCase()}`); return;
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
      anota(l, `horario ${d === '5' ? 'del viernes' : 'del sábado'}`); return;
    }
    if (t.dataset.cocobl) { l.cocina.obligatoria[t.dataset.cocobl] = t.checked; anota(l, `cocina obligatoria de ${FRANJA_LBL[t.dataset.cocobl].toLowerCase()}`); return; }
    if (t.dataset.cocpos) { l.cocina.posicion[t.dataset.cocpos] = +t.value === 3 ? 3 : 2; anota(l, 'posición de la cocina'); return; }
    if (t.dataset.cocdesde) { const v = +t.value; if (v >= 2) l.cocina.posicionSiDesde[t.dataset.cocdesde] = v; else { delete l.cocina.posicionSiDesde[t.dataset.cocdesde]; t.value = ''; } anota(l, 'posición de la cocina'); return; }
    if (t.dataset.primero) { l.primero[t.dataset.primero] = t.value || null; anota(l, `quién abre de ${FRANJA_LBL[t.dataset.primero].toLowerCase()}`); }
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

// ---------- eventos de la vista ----------
document.addEventListener('click', e => {
  const root = $('#equipoRoot'); if (!root || !root.contains(e.target)) return;
  const t = e.target;
  const aj = t.closest('[data-locajustes]'); if (aj) { openAjustesLocales(aj.dataset.locajustes); return; }
  const rm = t.closest('[data-rmabs]');
  if (rm) {
    const [pid, i] = rm.dataset.rmabs.split(':');
    if (quitarAusenciaUI(pid, +i)) { repintarTrasEquipo(); toast('Ausencia retirada', 'warn'); }
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
  if (altaAusenciaUI(f.dataset.absform, { tipo, desde, hasta: hasta || undefined, detalle: v('detalle') })) repintarTrasEquipo();
});
document.addEventListener('change', e => {
  // en el formulario de ausencia, elegir «Baja» vacía el «Hasta»: lo normal es que no se sepa
  const f = e.target.closest && e.target.closest('[data-absform]');
  if (!f || e.target.dataset.f !== 'tipo') return;
  const h = f.querySelector('[data-f="hasta"]'); if (h) h.value = e.target.value === 'BAJ' ? '' : (h.value || f.querySelector('[data-f="desde"]').value);
});
{
  const bp = $('#btnPersonas'); if (bp) bp.addEventListener('click', () => openPersonas());
  const bl = $('#btnLocales'); if (bl) bl.addEventListener('click', () => openAjustesLocales());
}
