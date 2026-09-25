// ================= GESTOR DE COBERTURA =================
// Pensado como el papel del encargado (reunión del 15/09): se mira la planilla, se
// pulsa a la persona que va a faltar, se marcan los días en una tira de dos semanas
// (cada día enseña sus turnos) y se pide «buscar quién cubre». La app propone el
// plan A (recomendado) y el plan B (alternativa) día a día: quién sale, quién entra
// y en qué turno, con marcas y avisos, o el hueco que queda y por qué. Al confirmar
// se aplica: la ausencia queda en la ficha, la persona sale de esos turnos y quien
// cubre entra con «por X». Ctrl+Z lo deshace. La misma hoja vive en la pestaña
// Cobertura (con selector de persona) y se abre desde Hoy, Semana y Mes.
const COB = { pid: null, tipo: 'LD', dias: [], base: null, franjas: [], detalle: '', sinFin: false, siempre: false, intercambio: true, res: null, aplicado: null, ovl: null, caducado: null, dejadas: null };
const COB_TIPO_LBL = { BAJ: 'Baja', VAC: 'Vacaciones', LD: 'Día libre', PERM: 'Permiso', OTRO: 'Otro motivo', CAMBIO: 'Cambio de turno' };
function resetCob(o) {
  const x = o || {};
  COB.res = null; COB.aplicado = null; COB.ovl = null; COB.caducado = null;
  if (x.pid) COB.pid = x.pid;
  if (x.tipo) COB.tipo = x.tipo;
  COB.dias = (x.dias || (x.desde ? [...rangoIso(x.desde, x.hasta || x.desde)] : [])).slice().sort();
  COB.base = mondayOf(COB.dias[0] || x.desde || isoDia());
  COB.franjas = x.franjas ? x.franjas.slice() : [];
  COB.detalle = x.detalle || ''; COB.sinFin = !!x.sinFin;
  // 24/09 (D13): lo que dejó pendiente una ausencia apuntada en Equipo: sus casillas, aunque ya no esté en
  // ellas (la ausencia ya está en su ficha y quien le cubre ya entró donde pudo)
  COB.dejadas = x.dejadas && x.pid ? { pid: x.pid, lista: x.dejadas.slice() } : null;
}
// las casillas que ya dejó esa persona en los días marcados (o ninguna): las que trae de Equipo y, revisión
// F3b, las de su semana tipo en los días en que ya está apuntada ausente (casillasDejadas, la misma lectura
// que planesCobertura). Tras un «Guardar» simple, el domingo que quedó pendiente decía «no tiene turnos»
function dejadasCob() {
  if (!COB.pid || !COB.dias.length || COB.tipo === 'CAMBIO') return [];
  const fr = COB.franjas.length === 1 ? COB.franjas : undefined;
  const de = COB.dejadas && COB.dejadas.pid === COB.pid ? COB.dejadas.lista.filter(d => COB.dias.includes(d.iso) && (!fr || partirTurno(d.tid).franja === fr[0])) : [];
  const dias = COB.dias.slice().sort(), d1 = dias[0], d2 = dias[dias.length - 1];
  const tipo = casillasDejadas(S, S.staff, estadoRango(d1, d2, false), COB.pid, d1, d2, { dias, franjas: fr });
  return de.concat(tipo.filter(t => !de.some(d => d.iso === t.iso && d.tid === t.tid)));
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
// objetos del mes al que pertenece; escribible=true los crea si faltan.
// 24/09 (S8): la propuesta trae semanas enteras (rangoNecesario: hasta dos meses marcados más la
// semana de antes y la de después), así que el tope pasa de 62 a 100 días.
const MAX_DIAS_RANGO = 100;
function estadoRango(desde, hasta, escribible) {
  const e = { y: +desde.slice(0, 4), m: +desde.slice(5, 7), days: [], asig: {}, apertura: {}, manual: {}, festivos: [], virtual: true };
  let n = 0;
  for (const iso of rangoIso(desde, hasta)) {
    if (++n > MAX_DIAS_RANGO) break;
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
  const dej = COB.tipo === 'CAMBIO' ? [] : dejadasCob();
  if (dej.length) inc.dejadas = dej;
  return inc;
}
// turnos de una persona un día (para la tira de días)
function turnosDia(pid, iso) {
  const e = estadoDeIso(iso);
  return turnosDe(S).filter(t => pidsEn(e, iso, t.id).includes(pid)).map(t => { const en = asignados(e, iso, t.id).find(x => x.pid === pid); return { tid: t.id, localId: t.localId, franja: t.franja, cocina: !!en.cocina, abre: primeroDe(S, S.staff, e, iso, t.id) === pid }; });
}
function renderCobertura() { pintaCob($('#cobRoot'), 'tab'); }
// 24/09 (reunión: «tú vas a equipo… Cubre a Iván… y ahora en el generador de cobertura debería ya
// sugerir… sigue poniendo a Dulce»): el plan que se enseña se calculó con una plantilla y una
// planilla concretas. Si cambian (en Equipo, en la planilla o con Ctrl+Z), ese plan ya no vale: no
// se vuelve a pintar el viejo, se avisa «La ficha ha cambiado: vuelve a buscar». La huella es la de
// la sincronización (huellaPlanilla): meses, fichas, locales, semana tipo, eventos y cierres.
function planCaducado() { return !!COB.res && COB.res.huella !== huellaPlanilla(S); }
const mismaIncidencia = (a, b) => !!a && !!b && a.pid === b.pid && a.tipo === b.tipo && JSON.stringify(a.dias) === JSON.stringify(b.dias) && JSON.stringify(a.franjas || []) === JSON.stringify(b.franjas || []);
function htmlCaducado() {
  return `<div class="cobcard cobvacia cobcaduca" id="cobCaduco" role="status"><span class="micro">EL PLAN DE ANTES YA NO VALE</span><h3>La ficha ha cambiado: vuelve a buscar</h3>
    <p class="revsub">Desde que se buscó quién cubre ha cambiado la plantilla o la planilla (en Equipo, en la planilla o con Ctrl+Z), así que ese plan podría no cumplir lo que hay ahora.</p>
    <button class="btn btn-cta" id="cobRebuscar">✦ Buscar otra vez</button></div>`;
}
function pintaCob(root, modo) {
  if (!COB.base) COB.base = mondayOf(isoDia());
  if (planCaducado()) { COB.caducado = COB.res.inc; COB.res = null; }
  const dias = []; for (let k = 0; k < 14; k++) dias.push(addDias(COB.base, k));
  const fin = dias[13];
  // se puede elegir a quien no está de baja TODOS los días de la tira (24/09, S6: antes, quien lo
  // estaba hoy); y la hoja nunca cambia de persona por su cuenta: si la elegida está de baja
  // algún día, la tira lo enseña y la cabecera lo avisa, pero sigue siendo ella
  const personas = S.staff.filter(q => q.id === COB.pid || !dias.every(iso => deBaja(q, iso))).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  if (!COB.pid || !personaDeId(COB.pid)) COB.pid = personas[0] ? personas[0].id : null;
  const p = personaDeId(COB.pid);
  const cambio = COB.tipo === 'CAMBIO';
  const hoy = isoHoy();
  const bajaTira = p ? dias.filter(iso => deBaja(p, iso)) : [];
  // los cambios de día libre de las semanas de la tira, para la cabecera: «(semana del 28/09: libra martes)»
  const lpTira = p ? [COB.base, addDias(COB.base, 7)].map(l => ({ l, lp: libraPuntualDe(p, l) })).filter(x => x.lp && activa(S, p, 'libra')) : [];
  const celda = iso => {
    const ts = p ? turnosDia(p.id, iso) : [];
    const aus = p ? ausenciaEn(p, iso) : null;
    const libra = p && estadoDia(S, p, iso).libra;   // el día libre de ESA semana
    const on = COB.dias.includes(iso);
    const dots = ts.map(t => `<i style="--lc:${colorLocal(t.localId)}" title="${esc(nombreLocal(t.localId) + ' · ' + FRANJA_LBL[t.franja].toLowerCase() + (t.abre ? ' · abre' : '') + (t.cocina ? ' · cocina' : ''))}">${t.franja}${t.cocina ? SVG_COCINA : ''}</i>`).join('');
    // una ausencia de media jornada (D10) deja ver el turno de la otra franja
    const media = aus && franjasAusencia(aus);
    const pie = aus && !media ? `<em class="a-${esc(aus.tipo)}">${esc((AUS_LBL[aus.tipo] || {}).label || aus.tipo)}</em>` : ts.length ? dots + (media ? `<em class="a-${esc(aus.tipo)}" title="${esc(motivoAusencia(aus))}">½</em>` : '') : aus ? `<em class="a-${esc(aus.tipo)}">${esc((AUS_LBL[aus.tipo] || {}).label || aus.tipo)} ½</em>` : `<em>${libra ? 'libra' : 'sin turno'}</em>`;
    return `<button type="button" class="cobdia${on ? ' on' : ''}${iso === hoy ? ' hoy' : ''}${iso < hoy ? ' pasado' : ''}${ts.length ? '' : ' vacio'}${isoDow(iso) >= 6 ? ' finde' : ''}" data-dia="${iso}" aria-pressed="${on ? 'true' : 'false'}" title="${esc(fmtLargo(iso))}"><small>${DIAS_L[isoDow(iso)].slice(0, 3)}</small><b>${+iso.slice(8, 10)}</b><span class="cobdots">${pie}</span></button>`;
  };
  const dejadas = cambio ? [] : dejadasCob();
  const nTurnos = (p ? COB.dias.reduce((a, iso) => a + turnosDia(p.id, iso).filter(t => !COB.franjas.length || COB.franjas.includes(t.franja)).length, 0) : 0) + dejadas.length;
  root.innerHTML = `<div class="cobsheet">
    ${modo === 'tab' ? `<div class="cobpick" role="listbox" aria-label="Persona">${personas.map(q => `<button type="button" class="cobpk${q.id === COB.pid ? ' on' : ''}" data-pk="${esc(q.id)}" style="--pc:${avColor(q.id)}" role="option" aria-selected="${q.id === COB.pid}"><span class="av">${esc(initials(q.nombre))}</span>${esc(nombreCorto(q.nombre))}</button>`).join('')}</div>` : ''}
    ${p ? `<div class="cobhead">
      <span class="av cobav" style="background:${avColor(p.id)}">${esc(initials(p.nombre))}</span>
      <div class="cobwho"><span class="micro">QUIÉN VA A FALTAR</span><b>${esc(p.nombre)}</b><small>${esc((PUESTOS.find(x => x.id === p.puesto) || {}).label || '')} · ${esc((p.locales || []).length ? p.locales.map(nombreLocal).join(', ') : 'sin local fijo, cualquier local')}${(p.libra || []).length ? ' · libra ' + p.libra.map(d => DIAS_L[d].toLowerCase()).join(' y ') : ''}${lpTira.map(x => ` (semana del ${fmtDDMM(x.l)}: ${textoCambioLibre(p, x.lp, true)})`).join('')}${bajaTira.length ? ` · de baja ${bajaTira.length === 1 ? 'el ' + fmtDM(bajaTira[0]) : `del ${fmtDM(bajaTira[0])} al ${fmtDM(bajaTira[bajaTira.length - 1])}`}` : ''}</small>${modo === 'ovl' ? `<select class="logininp cobsel2" id="cobPid" data-libre aria-label="Cambiar de persona">${personas.map(q => `<option value="${esc(q.id)}"${q.id === COB.pid ? ' selected' : ''}>${esc(q.nombre)}</option>`).join('')}</select>` : ''}</div>
      <div class="cobtipos" role="radiogroup" aria-label="Qué le pasa"><span class="micro">QUÉ LE PASA</span>${TIPOS_INCIDENCIA.map(t => `<button type="button" class="abschip a-${esc(t.id)}${COB.tipo === t.id ? ' on' : ''}" data-tipo="${esc(t.id)}" role="radio" aria-checked="${COB.tipo === t.id}">${esc(t.label)}</button>`).join('')}</div>
    </div>` : '<div class="genvacio">No hay nadie en activo.</div>'}
    ${dejadas.length ? `<p class="cobdejadas" role="note">Ya está apuntado en su ficha y quien le cubre ya entró donde pudo: aquí se busca quién cubre lo que quedó (${esc(pl(dejadas.length, 'turno', 'turnos'))}).</p>` : ''}
    <div class="cobdias">
      <div class="cobdh">
        <div class="arrows"><button type="button" class="mbtn" data-cobnav="-7" aria-label="Semana anterior">‹</button><button type="button" class="mbtn" data-cobnav="hoy" title="Semana de hoy">Hoy</button><button type="button" class="mbtn" data-cobnav="7" aria-label="Semana siguiente">›</button></div>
        <div><span class="dkick">${cambio ? 'Marca el día del turno que cambia' : 'Marca los días que falta'}</span><div class="dbig cobdbig"><b>${+COB.base.slice(8, 10)}${+COB.base.slice(5, 7) !== +fin.slice(5, 7) ? ' ' + MES3[+COB.base.slice(5, 7) - 1] : ''} – ${+fin.slice(8, 10)} de ${MESES[+fin.slice(5, 7) - 1].toLowerCase()}</b></div></div>
        <span class="cobcount${COB.dias.length ? ' on' : ''}">${COB.dias.length ? `${pl(COB.dias.length, 'día marcado', 'días marcados')} · ${pl(nTurnos, 'turno', 'turnos')}` : 'ningún día marcado'}</span>
        <div class="cobquick"><button type="button" class="btn-mini ghost" data-cobsel="semana">Toda la semana</button><button type="button" class="btn-mini ghost" data-cobsel="ninguno" ${COB.dias.length ? '' : 'disabled'}>Quitar la selección</button></div>
      </div>
      <div class="cobstrip">${dias.map(celda).join('')}</div>
      <div class="cobleg"><span><i class="cobli" style="--lc:var(--ink3)">M</i> mañana · <i class="cobli" style="--lc:var(--ink3)">T${SVG_COCINA}</i> tarde con cocina, en el color del local</span><span><em>libra</em> / <em>sin turno</em> no hace falta cubrir nada</span><span class="cobli2">pulsa un día para marcarlo o quitarlo</span></div>
    </div>
    <div class="cobopts">
      <div class="cobfr" role="group" aria-label="Turnos afectados"><span class="micro">${cambio ? 'QUÉ TURNO' : 'TURNOS AFECTADOS'}</span><button type="button" class="dowk${!COB.franjas.length ? ' on' : ''}" data-fr="">Todos</button><button type="button" class="dowk${COB.franjas.length === 1 && COB.franjas[0] === 'M' ? ' on' : ''}" data-fr="M">Mañana</button><button type="button" class="dowk${COB.franjas.length === 1 && COB.franjas[0] === 'T' ? ' on' : ''}" data-fr="T">Tarde</button></div>
      ${COB.tipo === 'BAJ' ? `<label class="genopt"><input type="checkbox" id="cobSinFin" ${COB.sinFin ? 'checked' : ''} data-libre> <span><b>Baja sin fecha de fin</b> · queda abierta desde el primer día marcado; se cubren los días marcados</span></label>` : ''}
      ${cambio ? `<label class="genopt"><input type="checkbox" id="cobInter" ${COB.intercambio ? 'checked' : ''} data-libre> <span><b>Proponer intercambio</b> · a cambio, ${p ? esc(nombreCorto(p.nombre)) : 'la persona'} hace un turno cercano de quien le cubre</span></label>` : `<label class="pinlbl cobdet">Detalle <small>(opcional)</small><input type="text" id="cobDet" class="logininp" value="${esc(COB.detalle)}" placeholder="p. ej. médico, boda" data-libre></label>`}
      <label class="genopt"><input type="checkbox" id="cobSiempre" ${COB.siempre ? 'checked' : ''} data-libre> <span><b>Reemplazar siempre</b> · aunque la casilla siga completa sin esa persona</span></label>
      <button class="btn btn-cta cobgo" id="cobProponer" ${p && COB.dias.length ? '' : 'disabled'}>✦ Buscar quién cubre${nTurnos ? ` (${pl(nTurnos, 'turno', 'turnos')})` : ''}</button>
    </div>
    <div class="genres" id="cobRes">${COB.aplicado ? htmlCoberturaAplicada(COB.aplicado) : COB.res ? htmlPlanesCobertura(COB.res) : mismaIncidencia(COB.caducado, incidenciaActual()) ? htmlCaducado() : ''}</div>
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
    if (e.target.id === 'cobProponer' || e.target.id === 'cobRebuscar') { proponerCobertura(root, modo); return; }
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
    // semanas enteras (S8): el modelo dice qué días necesita; con solo los días marcados contaba mal
    // «N turnos esa semana» (Mari Luz, 3 en vez de 8) y el cambio de turno no encontraba nada
    const rango = rangoNecesario(inc);
    const base = clonarEstado(estadoRango(rango.desde, rango.hasta, false));
    // (fase 5) y con S.meses, «M este mes» cuenta el mes entero, no solo las semanas que se traen
    const res = planesCobertura(S, S.staff, base, inc, { siempre: COB.siempre, intercambio: COB.tipo === 'CAMBIO' && COB.intercambio, meses: S.meses });
    res.inc = inc; res.ts = Date.now(); res.rango = rango; res.huella = huellaPlanilla(S);
    COB.res = res; COB.aplicado = null; COB.caducado = null;
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
    // revisión F3b: si la ausencia ya está en su ficha esos días, no se ofrece registrarla otra vez
    const p = personaDeId(inc.pid);
    const yaApuntada = inc.tipo !== 'CAMBIO' && !!p && inc.dias.every(iso => (inc.franjas || FRANJAS).every(f => ausenciaEn(p, iso, f, inc.tipo)));
    return `<div class="cobcard cobvacia"><span class="micro">${esc(tipoLbl.toUpperCase())} · ${esc(rango)}</span><h3>${esc(nombre)} no tiene turnos en la planilla ${inc.dias.length === 1 ? 'ese día' : 'esos días'}${inc.franjas ? ' en esa franja' : ''}</h3>
      <p class="revsub">No hay nada que cubrir. ${inc.tipo === 'CAMBIO' ? 'Marca un día en el que trabaje.' : yaApuntada ? 'La ausencia ya está apuntada en su ficha.' : 'Si quieres, se registra igualmente la ausencia en su ficha para que el generador no cuente con esa persona.'}</p>
      ${inc.tipo === 'CAMBIO' || yaApuntada ? '' : '<button class="btn btn-sec" id="cobSoloAus">Registrar solo la ausencia</button>'}</div>`;
  }
  const plan = P => {
    const filas = res.afectados.map(a => {
      const as = P.asignaciones.filter(x => x.iso === a.iso && x.tid === a.tid);
      const hs = P.huecos.filter(x => x.iso === a.iso && x.tid === a.tid);
      const sc = P.sinCubrir.find(x => x.iso === a.iso && x.tid === a.tid);
      // 24/09 (fase 3): el relevo (D3) sale como «ya estaba · cubre a Iván», con ABRE si pasa a abrir,
      // y no cuenta en «Entran»; el partido autorizado para cubrir a alguien (D1) es una nota, no un aviso
      const nota = x => (x.autorizados || []).length ? `<small class="cobnota">✓ ${esc(x.autorizados.map(a => a.texto).join(', '))}</small>` : '';
      const badges = x => `${x.abre ? ' <em class="bdg abre">ABRE</em>' : ''}${x.cocina ? ` <em class="bdg cocina">${SVG_COCINA} COCINA</em>` : ''}`;
      const entra = as.map(x => x.yaEstaba
        ? `<div class="cobrow relevo" data-pid="${esc(x.pid)}"><span class="av" style="background:${avColor(x.pid)}">${esc(initials(x.nombre))}</span><span class="cobtxt"><b>${esc(x.nombre)}${badges(x)}</b><small>ya estaba · ${esc(x.razones[0])}</small>${nota(x)}</span></div>`
        : `<div class="cobrow" data-pid="${esc(x.pid)}"><span class="av" style="background:${avColor(x.pid)}">${esc(initials(x.nombre))}</span><span class="cobtxt"><b>${esc(x.nombre)}${badges(x)}${x.avisos.length ? ` <em class="bdg forz" title="${esc(x.avisos.join(', '))}">!</em>` : ''}</b><small>${esc(x.razones.filter(r => !x.avisos.includes(r) && !(x.autorizados || []).some(a => a.texto === r)).slice(0, 3).join(' · '))}${x.avisos.length ? ` · <span class="cobaviso">aviso: ${esc(x.avisos.join(', '))}</span>` : ''}</small>${nota(x)}${x.intercambio ? `<small class="cobinter">⇄ a cambio, ${esc(nombreCorto(nombre))} hace ${dlCob(x.intercambio.iso)} ${lpCob(x.intercambio.tid)} de ${esc(nombreCorto(x.nombre))}</small>` : ''}</span></div>`).join('')
        + hs.map(h => { const pq = Object.entries(h.porQueNadie || {}).slice(0, 4).map(([m, q]) => `<b>${esc(m)}</b>: ${esc(q.slice(0, 4).join(', '))}${q.length > 4 ? ' +' + (q.length - 4) : ''}`).join(' · '); return `<div class="cobrow hueco"><span class="av">?</span><span class="cobtxt"><b>Hueco: ${esc(h.tipo === 'primero' ? 'nadie puede abrir (1.ª posición)' : h.tipo === 'cocina' ? 'sin cocina' : h.motivo)}</b><small>${pq || esc(h.motivo || 'nadie de la plantilla puede')}</small></span></div>`; }).join('')
        + (sc ? `<div class="cobrow sobra"><span class="av">✓</span><span class="cobtxt"><b>Nadie hace falta</b><small>${esc(sc.motivo)}</small></span></div>` : '');
      // quién se queda en la casilla («quedan Mari Luz y Leo, 2 de 3»)
      const quedan = (a.quedanPids || []).map(nombrePid);
      const quienes = quedan.length ? `quedan ${quedan.length > 1 ? quedan.slice(0, -1).join(', ') + ' y ' + quedan[quedan.length - 1] : quedan[0]}, ${a.quedan} de ${a.min}` : `quedan ${a.quedan} de ${a.min}`;
      // 24/09 (D13): si quien tiene «cubre a» no puede ese día, se dice por qué («Mari Luz no puede: nunca con Lavinia»)
      const noCubren = (a.noCubren || []).filter(q => !as.some(x => x.pid === q.pid));
      return `<div class="cobmv" data-cas="${a.iso}|${a.tid}"><div class="cobmvd"><b>${dlCob(a.iso)}</b>${lpCob(a.tid)}<small>${FRANJA_LBL[a.franja].toLowerCase()}${a.cocina ? ' · llevaba la cocina' : ''}${a.abre ? ' · abría' : ''}</small><button class="glink cobver" data-irdia="${a.iso}">ver el día</button></div>
        <div class="cobsale"><span class="av" style="background:${avColor(inc.pid)}">${esc(initials(nombre))}</span><span class="cobtxt"><b><s>${esc(nombre)}</s></b><small>${a.dejada ? 'ya salió' : 'sale'} · ${esc(quienes)}${a.necesario && !a.faltan ? (a.sinCocina ? ' · sin cocina' : ' · nadie abre') : ''}</small>${noCubren.map(q => `<small class="cobnocubre">${esc(q.nombre)} no puede: ${esc(q.porQue)}</small>`).join('')}</span></div>
        <div class="cobarrow" aria-hidden="true">→</div>
        <div class="cobentra">${entra}</div></div>`;
    }).join('');
    const estado = P.completo ? (P.avisos ? `<span class="evst p">cubre todo · ${pl(P.avisos, 'aviso', 'avisos')}</span>` : '<span class="evst ok">cubre todo</span>') : `<span class="evst x">${pl(P.huecos.length, 'hueco', 'huecos')}</span>`;
    return `<div class="cobplan${P.id === 'A' ? ' reco' : ''}">
      <div class="cobph"><span><span class="micro">${esc(P.titulo.toUpperCase())}</span><small>${esc(P.estrategia)}${P.distinto ? ` · ${pl(P.distinto, 'turno distinto', 'turnos distintos')} del plan A` : ''}</small></span>${estado}</div>
      <div class="cobmvs">${filas}</div>
      <div class="cobpf"><span class="cobpers2">${P.personas.length ? 'Entran: ' : ''}${P.personas.map(pid => `<span class="glchip" style="--pc:${avColor(pid)}">${esc(nombreCorto(nombrePid(pid)))}</span>`).join('') || '<em class="gnadie">no entra nadie nuevo</em>'}${(P.relevos || []).length ? `<span class="cobyaestan">ya estaban y pasan a cubrir: ${esc([...new Set(P.relevos.map(x => nombrePid(x.pid)))].join(', '))}</span>` : ''}</span><button class="btn ${P.id === 'A' ? 'btn-cta' : 'btn-sec'}" data-aplicar="${P.id}">Confirmar plan ${P.id}${P.completo ? '' : ` (${pl(P.huecos.length, 'hueco queda', 'huecos quedan')})`}</button></div>
    </div>`;
  };
  return `<div class="cobcard cobres">
      <span class="micro">${esc(tipoLbl.toUpperCase())} · ${esc(rango)}</span>
      <h3>${esc(nombre)}: ${pl(res.afectados.length, 'turno afectado', 'turnos afectados')}${res.necesarios < res.afectados.length ? `, ${res.necesarios} por cubrir` : ''}</h3>
      ${(res.designados || []).length ? `<p class="cobdesig">${esc(nombre)} tiene quien le cubra: <b>${esc(listaY([...new Set(res.designados.map(d => d.nombre))]))}</b> <small>(${esc(res.designados.map(d => `${d.nombre}: ${d.cuando}`).join('; '))}, hasta que se quite en su ficha). Va primero en el plan donde puede; donde no, se dice por qué.</small></p>` : ''}
      <p class="revsub" style="margin:4px 0 0">${res.posible ? 'Se puede cubrir todo.' : '<b style="color:var(--bad)">No se puede cubrir todo</b> sin romper una condición: lo que nadie puede ocupar queda como hueco (en rojo en Hoy y Semana) para ofrecérselo a quien pueda.'} ${res.planes.length > 1 ? 'Elige un plan; el otro es la alternativa.' : ''} Al confirmar se aplica en la planilla; Ctrl+Z lo deshace.</p>
    </div>
    <div class="cobplanes">${res.planes.map(plan).join('')}</div>`;
}
// «3 turnos de Iván cubiertos: 2 por Mari Luz, que ya estaba; entra Dulce (3)» (revisión F3: decía «5
// turnos cubiertos (2 por quien ya estaba)» con solo 3 turnos afectados: contaba plazas, no turnos)
function resumenCubiertos(r, nombre) {
  const turnos = new Set(r.asignados.map(x => x.iso + '|' + x.tid)).size;
  const cuenta = xs => { const m = new Map(); for (const x of xs) m.set(x.pid, (m.get(x.pid) || 0) + 1); return [...m]; };
  const ya = cuenta(r.asignados.filter(x => x.yaEstaba)).map(([pid, n]) => `${n} por ${nombrePid(pid)}, que ya estaba`);
  const entran = cuenta(r.asignados.filter(x => !x.yaEstaba)).map(([pid, n]) => `${nombrePid(pid)} (${n})`);
  const cab = r.quitados && turnos === r.quitados ? `${pl(r.quitados, 'turno', 'turnos')} de ${nombre} ${turnos === 1 ? 'cubierto' : 'cubiertos'}` : `${pl(turnos, 'turno cubierto', 'turnos cubiertos')}`;
  const detalle = [ya.join(' y '), entran.length ? `entra${entran.length > 1 ? 'n' : ''} ${entran.join(', ')}` : ''].filter(Boolean).join('; ');
  return turnos ? cab + (detalle ? ': ' + detalle : '') : 'ningún turno cubierto';
}
function htmlCoberturaAplicada(ap) {
  const r = ap.res, inc = ap.inc;
  const lista = r.asignados.map(x => `<li>${lpCob(x.tid)} <b>${dlCob(x.iso)}</b>: ${x.yaEstaba ? `${esc(nombrePid(x.pid))}, que ya estaba, pasa a cubrir a ${esc(nombrePid(inc.pid))}` : `entra ${esc(nombrePid(x.pid))}`}${x.avisos.length ? ` <span class="cobaviso">(aviso: ${esc(x.avisos.join(', '))})</span>` : ''}</li>`).join('')
    + r.intercambios.map(x => `<li>${lpCob(x.tid)} <b>${dlCob(x.iso)}</b>: ${esc(nombrePid(x.pid))} a cambio de ${esc(nombrePid(x.quita))}</li>`).join('')
    + r.rechazados.map(x => `<li class="bad">${lpCob(x.tid)} <b>${dlCob(x.iso)}</b>: ${esc(nombrePid(x.pid))} no se pudo poner (${esc(x.motivo)})</li>`).join('');
  return `<div class="cobcard cobok"><span class="micro">APLICADO · ${esc(ap.plan ? 'PLAN ' + ap.plan : 'SOLO LA AUSENCIA')}</span>
    <h3>${esc(nombrePid(inc.pid))}: ${inc.tipo === 'CAMBIO' ? 'cambio de turno hecho' : `${esc((COB_TIPO_LBL[inc.tipo] || inc.tipo).toLowerCase())} registrada en su ficha`}</h3>
    <p class="revsub">${esc(resumenCubiertos(r, nombrePid(inc.pid)))}${r.intercambios.length ? ` · ${pl(r.intercambios.length, 'intercambio', 'intercambios')}` : ''}${r.rechazados.length ? ` · <b style="color:var(--bad)">${pl(r.rechazados.length, 'no se pudo hacer', 'no se pudieron hacer')}</b>` : ''}${ap.huecos ? ` · <b style="color:var(--bad)">${pl(ap.huecos, 'hueco queda', 'huecos quedan')}</b> en rojo en Hoy y Semana` : ''}.</p>
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
  // con plan: se enseña primero la rejilla de quién sale y quién entra; sin plan (solo la
  // ausencia) no hay nada que dibujar y basta con preguntar
  if (plan) { openPreviaCobertura(res, plan, () => hacerCobertura(res, plan, root, modo)); return; }
  if (!confirm(`${COB_TIPO_LBL[inc.tipo] || inc.tipo} de ${nombre} ${cuando}: solo se registra la ausencia. ¿Confirmar? (Ctrl+Z lo deshace)`)) return;
  hacerCobertura(res, null, root, modo);
}
function hacerCobertura(res, plan, root, modo) {
  const inc = res.inc;
  const nombre = nombrePid(inc.pid);
  const cuando = inc.dias.length === 1 ? 'el ' + fmtDM(inc.desde) : `los días ${inc.dias.map(fmtDM).join(', ')}`;
  pushUndo(`cobertura de ${nombre}`, { staff: true, otrosMeses: true });
  // 24/09 (revisión F3): se aplica sobre los mismos días con los que se propuso (rangoNecesario, semanas
  // enteras): el turno a cambio de un cambio de turno es de otro día, y con solo los días marcados se
  // perdía sin avisar
  const rg = res.rango || rangoNecesario(inc);
  const real = estadoRango(rg.desde, rg.hasta, true);
  const r = aplicarCobertura(S, S.staff, real, inc, plan);
  const huecos = plan ? plan.huecos.length : 0;
  registrarCambio(`Cobertura (${plan ? 'plan ' + plan.id : 'solo ausencia'}): ${COB_TIPO_LBL[inc.tipo] || inc.tipo} de ${nombre} ${cuando} — ${r.quitados} turno(s) retirados, ${resumenCubiertos(r, nombre)}${r.intercambios.length ? `, ${r.intercambios.length} intercambio(s)` : ''}${huecos ? `, ${huecos} hueco(s)` : ''}${r.asignados.length ? ': ' + r.asignados.map(x => `${nombrePid(x.pid)}${x.yaEstaba ? ' (ya estaba)' : ''} ${fmtDM(x.iso)} ${nombreLocal(partirTurno(x.tid).localId)} ${FRANJA_LBL[partirTurno(x.tid).franja].toLowerCase()}`).join(', ') : ''}`, 'cobertura');
  if (mesCerrado(inc.desde)) registrarCambio(`Cambio en un mes cerrado (${inc.desde.slice(0, 7)})`, 'aviso');
  saveState();
  COB.aplicado = { plan: plan ? plan.id : null, inc, res: r, huecos };
  COB.res = null;
  toast(`${resumenCubiertos(r, nombre)}${r.rechazados.length ? ` · ${pl(r.rechazados.length, 'no se pudo hacer', 'no se pudieron hacer')}` : ''}${huecos ? `, ${huecos} hueco(s) quedan` : ''} · Ctrl+Z para deshacer`, huecos || r.rechazados.length ? 'warn' : 'ok');
  if (typeof pintaRevDot === 'function') pintaRevDot();
  if (modo === 'ovl' && COB.ovl) { COB.ovl.remove(); COB.ovl = null; renderVistaActiva(); return; }   // desde la planilla: se vuelve a ella con los cambios a la vista
  pintaCob(root, modo);
}

// ---------- vista previa del cambio ----------
// Antes de tocar la planilla se enseña, día a día, quién sale y quién entra: la misma
// idea que la vista previa del piloto de urología. Nada se guarda hasta confirmar.
function openPreviaCobertura(res, plan, alConfirmar) {
  const inc = res.inc, nombre = res.nombre;
  const ABREV = { BAJ: 'BAJA', VAC: 'VACAC.', LD: 'LIBRE', PERM: 'PERMISO', OTRO: 'AUSENTE', CAMBIO: 'CAMBIA' };
  const aus = ABREV[inc.tipo] || 'AUSENTE';
  const tur = tid => { const { localId, franja } = partirTurno(tid); return `${(localDe(S, localId) || {}).corto || localId}·${franja}`; };
  const lc = tid => colorLocal(partirTurno(tid).localId);
  // rejilla persona × día: qué sale, qué entra y qué se queda sin cubrir
  const filas = new Map();
  const fila = (pid, rol) => { if (!filas.has(pid)) filas.set(pid, { pid, rol, dias: {} }); return filas.get(pid); };
  const cel = (pid, iso, rol) => { const f = fila(pid, rol); return (f.dias[iso] = f.dias[iso] || { sale: [], entra: [] }); };
  fila(inc.pid, aus);
  for (const a of res.afectados) cel(inc.pid, a.iso, aus).sale.push(a.tid);
  for (const as of plan.asignaciones) {
    if (as.yaEstaba) { const c = cel(as.pid, as.iso, 'CUBRE'); (c.sigue = c.sigue || []).push(as.tid); continue; }   // D3: ya estaba
    cel(as.pid, as.iso, 'CUBRE').entra.push(as.tid);
    if (as.intercambio) { cel(as.pid, as.intercambio.iso, 'CUBRE').sale.push(as.intercambio.tid); cel(inc.pid, as.intercambio.iso, aus).entra.push(as.intercambio.tid); }
  }
  const huecosPorDia = {};
  for (const h of plan.huecos) (huecosPorDia[h.iso] = huecosPorDia[h.iso] || []).push(h);
  const dias = [...new Set([...Object.values([...filas.values()]).flatMap(f => Object.keys(f.dias)), ...Object.keys(huecosPorDia)])].sort();
  const celda = (f, iso) => {
    const c = f.dias[iso];
    const sigue = (c && c.sigue) || [];
    if (!c || (!c.sale.length && !c.entra.length && !sigue.length)) return '<td class="pvnada">·</td>';
    const esAus = f.rol !== 'CUBRE' && c.sale.length;
    return `<td class="${esAus ? 'pvsale' : c.entra.length || sigue.length ? 'pventra' : 'pvsale'}">
      ${c.sale.map(t => `<s style="--lc:${lc(t)}">${esc(tur(t))}</s>`).join('')}
      ${esAus ? `<b>${esc(aus)}</b>` : c.entra.map(t => `<b style="--lc:${lc(t)}">${esc(tur(t))}</b>`).join('')}
      ${sigue.map(t => `<b style="--lc:${lc(t)}">${esc(tur(t))}</b><small class="pvya">ya estaba</small>`).join('')}</td>`;
  };
  const cabeza = iso => `<th class="${isoDow(iso) >= 6 ? 'wk' : ''}"><small>${DIAS_L[isoDow(iso)].slice(0, 3)}</small>${+iso.slice(8, 10)}<i>${esc(MES3[+iso.slice(5, 7) - 1])}</i></th>`;
  const quienes = plan.personas.map(p => nombreCorto(nombrePid(p)));
  const relevos = [...new Set((plan.relevos || []).map(x => nombreCorto(nombrePid(x.pid))))];
  // «que cubren Dulce y Mari L., que ya estaba en la casilla y pasa a cubrir»: el verbo, con todos (revisión F3)
  const cubren = quienes.length + relevos.length > 1 ? 'cubren' : 'cubre';
  const resumen = `<b>${esc((COB_TIPO_LBL[inc.tipo] || inc.tipo).toLowerCase())}</b> de <b>${esc(nombre)}</b> → ${pl(res.afectados.length, 'turno', 'turnos')} en ${pl(inc.dias.length, 'día', 'días')}${quienes.length ? `, que ${cubren} <b>${esc(quienes.join(', '))}</b>` : relevos.length ? `, que ${cubren}` : ', <b>sin nadie que entre</b>'}${relevos.length ? `${quienes.length ? ' y' : ''} <b>${esc(relevos.join(', '))}</b>, que ya estaba${relevos.length > 1 ? 'n' : ''} en la casilla y pasa${relevos.length > 1 ? 'n' : ''} a cubrir` : ''}${plan.huecos.length ? ` · <span class="pvmal">${pl(plan.huecos.length, 'hueco sin cubrir', 'huecos sin cubrir')}</span>` : ''}`;
  const html = `<div class="pvhead"><span class="pvico"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="2.6"/></svg></span>
      <span><h2 class="revh2" style="margin:0">Vista previa del cambio</h2><p class="revsub" style="margin:2px 0 0">Así quedará la planilla con el ${esc('plan ' + plan.id)} aplicado. Nada se guarda hasta que confirmes.</p></span></div>
    <div class="pvres">${resumen}</div>
    <div class="pvleg"><span><i class="pvk entra"></i>Entra a cubrir</span><span><i class="pvk sale"></i>Sale de la casilla</span>${plan.huecos.length ? '<span><i class="pvk hueco"></i>Hueco sin cubrir</span>' : ''}<span><i class="pvk nada"></i>Sin cambio</span></div>
    <div class="pvwrap"><table class="pvt"><thead><tr><th class="pvp">Persona</th>${dias.map(cabeza).join('')}</tr></thead><tbody>
      ${[...filas.values()].map(f => `<tr><th class="pvp"><span class="av" style="background:${avColor(f.pid)}">${esc(initials(nombrePid(f.pid)))}</span><span><b>${esc(nombrePid(f.pid))}</b><em class="pvrol ${f.rol === 'CUBRE' ? 'ok' : 'bad'}">${esc(f.rol)}</em></span></th>${dias.map(iso => celda(f, iso)).join('')}</tr>`).join('')}
      ${plan.huecos.length ? `<tr class="pvhueca"><th class="pvp"><span class="av">?</span><span><b>Sin cubrir</b><em class="pvrol bad">HUECO</em></span></th>${dias.map(iso => { const hs = huecosPorDia[iso] || []; return hs.length ? `<td class="pvhueco">${hs.map(h => `<b style="--lc:${lc(h.tid)}" title="${esc(h.motivo || '')}">${esc(tur(h.tid))}</b>`).join('')}</td>` : '<td class="pvnada">·</td>'; }).join('')}</tr>` : ''}
    </tbody></table></div>
    <div class="pvbar"><button class="btn btn-sec" type="button" data-ovx>Cancelar</button><button class="btn btn-cta" type="button" id="pvOk">✓ Confirmar y aplicar</button></div>`;
  const ov = abrirOverlay('previaCobOvl', html, { ancho: 1000 });
  ov.querySelector('#pvOk').addEventListener('click', () => { ov.remove(); alConfirmar(); });
  return ov;
}
