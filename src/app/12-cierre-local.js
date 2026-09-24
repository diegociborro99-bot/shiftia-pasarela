// ================= CERRAR UN LOCAL UNOS DÍAS (CIERRE POR FECHAS) =================
// 24/09 (reunión): «creo que no tiene un botón de cerrar, de cerrar bares por vacaciones… Que te
// salga un visor y te ponga apoyos o vacaciones o sin trabajo». Y Diego, después: «el Mónaco va a
// cerrar domingo por la tarde, lunes y martes… que pueda elegir el día que cierra cada local y así
// hacer como intervalos… ¿quién se queda apoyando? ¿quién no trabaja? ¿quién tiene días libres?».
// Decisión D11 (decisiones.md). El visor tiene tres pasos:
//   1. el local, el intervalo (día y franja de inicio, día y franja de fin) y una tira con cada día,
//      que se puede dejar de mañana, de tarde, todo el día o abierto; el motivo y un detalle;
//   2. «Quién trabajaba esos días»: una tarjeta por persona con sus turnos cerrados y los avisos, y
//      qué hace: Apoyo · Sin trabajo · Día libre · Vacaciones. Sin trabajo por defecto: nadie se
//      redistribuye solo. Apoyo deja elegir el sitio de cada día, o «donde haga falta»;
//   3. el resumen en español llano y confirmar.
// Lo hace el modelo (aplicarCierre / quitarCierre); aquí solo se pregunta, se deshace con Ctrl+Z,
// queda en el historial y se guarda. Sirve también para editar y reabrir un cierre, y para cuando
// «Cuándo abre» cierra una casilla que ya tenía gente puesta en semanas planificadas.
const CIE = {};
const CIE_FR = [['M', 'Mañana'], ['T', 'Tarde'], ['MT', 'Todo el día'], ['0', 'Abierto']];
// «mar 29»: el último día cerrado, como se lee en la casilla
function hastaCortoCierre(c) { return hastaCierre(c).replace(/\/\d\d$/, ''); }
// los días del intervalo con su franja: el primero desde su franja, el último hasta la suya
function diasDelIntervalo(ini, iniF, fin, finF) {
  const out = {};
  if (!ini || !fin || fin < ini) return out;
  let n = 0;
  for (const iso of rangoIso(ini, fin)) {
    if (++n > MAX_DIAS_CIERRE) break;
    let fs = ['M', 'T'];
    if (iso === ini && iniF === 'T') fs = ['T'];
    if (iso === fin && finF === 'M') fs = fs.filter(f => f === 'M');
    if (fs.length) out[iso] = fs;
  }
  return out;
}
// Al cambiar una fecha o la franja de un extremo, la tira no se reinicia (24/09, revisión F2: al editar,
// cambiar solo la fecha de fin dejaba un cierre de tardes en «Todo el día» sin avisar):
//  · los días que ya estaban dentro conservan lo elegido (también «Abierto»), salvo el extremo cuya
//    franja se acaba de cambiar en su selector;
//  · los días nuevos toman la franja de los demás si todos eran de la misma («solo tardes» sigue
//    siendo de tardes); si no, lo que dicen los selectores (el día entero, o desde/hasta su franja).
function rehacerDias(prev, antes, ini, iniF, fin, finF) {
  const fresco = diasDelIntervalo(ini, iniF, fin, finF);
  const hab = Object.keys(prev || {}).filter(iso => (prev[iso] || []).length);
  const patron = hab.length >= 2 && hab.every(iso => prev[iso].length === 1 && prev[iso][0] === prev[hab[0]][0]) ? prev[hab[0]][0] : null;
  const out = {};
  let n = 0;
  for (const iso of rangoIso(ini, fin)) {
    if (++n > MAX_DIAS_CIERRE) break;
    const dentro = !!antes && iso >= antes.ini && iso <= antes.fin;
    const selector = !!antes && ((iso === ini && ini === antes.ini && iniF !== antes.iniF) || (iso === fin && fin === antes.fin && finF !== antes.finF));
    let fs;
    if (dentro && !selector) fs = (prev[iso] || []).slice();
    else if (!dentro && patron) {
      fs = [patron];
      if (iso === ini && iniF === 'T') fs = fs.filter(f => f === 'T');
      if (iso === fin && finF === 'M') fs = fs.filter(f => f === 'M');
      if (!fs.length) fs = fresco[iso] || [];
    } else fs = fresco[iso] || [];
    if (fs.length) out[iso] = fs;
  }
  return out;
}
function intervaloDeDias(dias) {
  const ds = Object.keys(dias || {}).filter(iso => (dias[iso] || []).length).sort();
  if (!ds.length) return null;
  const a = ds[0], b = ds[ds.length - 1];
  return { ini: a, iniF: dias[a].includes('M') ? 'M' : 'T', fin: b, finF: dias[b].includes('T') ? 'T' : 'M' };
}
const cieFecha = iso => `${DIAS_L[isoDow(iso)].slice(0, 3).toLowerCase()} ${+iso.slice(8, 10)}`;
// el cierre tal como está en el visor (sin tocar el guardado)
function cierreDelVisor() {
  const dias = {};
  for (const [iso, fs] of Object.entries(CIE.dias || {})) if (fs && fs.length) dias[iso] = fs.slice().sort();
  return { id: CIE.id || null, localId: CIE.localId, dias, motivo: CIE.motivo, detalle: (CIE.detalle || '').trim(), decisiones: {}, retirados: [] };
}
// Estado sobre el que se pregunta: la planilla de esos días y, si se edita, como quedaría sin el
// cierre de antes (se deshace sobre copias). Se calcula al pasar al paso 2 y se guarda en CIE.ctx.
function contextoCierre() {
  const c = cierreDelVisor();
  const previo = CIE.id ? cierresDe(S).find(x => x.id === CIE.id) : null;
  const ds = [...new Set(diasDeCierre(c).concat(previo ? diasDeCierre(previo) : []))].sort();
  if (!ds.length) return null;
  let cfg = S, st = S.staff, pend = [];
  const e = clonarEstado(estadoRango(ds[0], ds[ds.length - 1], false));
  if (previo) {
    cfg = Object.assign({}, S, { cierresPuntuales: JSON.parse(JSON.stringify(S.cierresPuntuales)) });
    st = JSON.parse(JSON.stringify(S.staff));
    // lo retirado que no puede volver a su casilla (se forzó a la persona en otra) y sigue dentro del
    // cierre: sigue contando como que estaba allí, como hace aplicarCierre (revisión F2)
    pend = quitarCierre(cfg, st, e, previo.id, { devolver: true, quitarVacaciones: true }).noDevueltos.filter(x => x.entry && dentroDeCierre(c, x.iso, x.tid));
  }
  return { c, cfg, st, e, dias: ds, pend, afectados: afectadosPorCierre(cfg, st, e, c, { pendientes: pend }), sug: {} };
}
function sugerenciasDe(pid) {
  const x = CIE.ctx;
  if (!x.sug[pid]) x.sug[pid] = sugerenciasRefuerzo(x.cfg, x.st, x.e, x.c, pid);
  return x.sug[pid];
}
const tipoDe = pid => (CIE.decisiones[pid] && CIE.decisiones[pid].tipo) || 'SIN';
// «dom 27 tarde, lun 28 mañana y tarde»: los días de una persona en el cierre
function diasTxt(turnos) {
  const porDia = {};
  for (const t of turnos) (porDia[t.iso] = porDia[t.iso] || []).push(t.franja);
  return Object.keys(porDia).sort().map(iso => `${cieFecha(iso)} ${porDia[iso].map(f => FRANJA_LBL[f].toLowerCase()).join(' y ')}`).join(', ');
}
// Lo que se va a hacer (paso 3) o se hizo (ver): quién apoya y dónde, sin trabajo, vacaciones, libres
function htmlDecisiones(lista) {
  const grupos = DECISIONES_CIERRE.map(d => ({ d, xs: lista.filter(x => x.tipo === d.id) })).filter(g => g.xs.length);
  if (!grupos.length) return '<p class="revsub">Nadie trabajaba en esas casillas.</p>';
  return `<ul class="cieres">${grupos.map(({ d, xs }) => `<li><b>${esc(d.largo)}:</b> ${xs.map(x => `${esc(x.nombre)}${x.extra ? ` (${esc(x.extra)})` : ''}`).join(', ')}.</li>`).join('')}</ul>`;
}
function destinosTxt(destinos, turnos) {
  const ds = [...new Set((turnos || []).map(t => t.iso))];
  const todos = [...new Set(ds.concat(Object.keys(destinos || {})))].sort();
  return todos.map(iso => { const t = destinos && destinos[iso]; const { localId, franja } = t ? partirTurno(t) : {}; return `${cieFecha(iso)}: ${t ? `${nombreLocal(localId)} · ${FRANJA_LBL[franja].toLowerCase()}` : 'donde haga falta'}`; }).join('; ');
}
// resumen de las decisiones de un cierre ya guardado, para la lista de Ajustes y «Ver cierre»
function listaDecisionesGuardadas(c) {
  return Object.entries(c.decisiones || {}).map(([pid, d]) => {
    const turnos = (d.turnos || []).map(k => { const [iso, franja] = k.split('|'); return { iso, franja }; });
    const extra = d.tipo === 'REFUERZA' ? destinosTxt(d.destinos, turnos) : (d.tipo === 'VAC' || d.tipo === 'LD') ? ((d.dias || []).length ? d.dias.map(cieFecha).join(' y ') : 'no se pudo poner: ese día tenía otro turno') : diasTxt(turnos);
    return { pid, nombre: nombrePid(pid), tipo: d.tipo, extra };
  }).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}
function resumenDecisionesCorto(c) {
  const n = t => Object.values(c.decisiones || {}).filter(d => d.tipo === t).length;
  return [n('REFUERZA') && pl(n('REFUERZA'), 'de apoyo', 'de apoyo'), n('SIN') && `${n('SIN')} sin trabajo`, n('VAC') && pl(n('VAC'), 'de vacaciones', 'de vacaciones'), n('LD') && pl(n('LD'), 'con día libre', 'con día libre')].filter(Boolean).join(' · ') || 'nadie trabajaba esos días';
}
// la lista de cierres de un local en Ajustes (los que no han pasado del todo)
// Los que ya han pasado del todo salen debajo, los de los dos últimos meses, con «Ver» y «Reabrir»
// (revisión F2: un cierre de días pasados hecho por error desaparecía de aquí y no había cómo deshacerlo)
function htmlCierresLocal(localId) {
  const hoy = isoHoy(), desde = addDias(hoy, -MAX_DIAS_CIERRE);
  const cs = cierresDe(S).filter(c => c.localId === localId).sort((a, b) => (diasDeCierre(a)[0] < diasDeCierre(b)[0] ? -1 : 1));
  const ultimo = c => { const ds = diasDeCierre(c); return ds.length ? ds[ds.length - 1] : ''; };
  const vivos = cs.filter(c => ultimo(c) >= hoy);
  const recientes = cs.filter(c => ultimo(c) < hoy && ultimo(c) >= desde);
  const viejos = cs.length - vivos.length - recientes.length;
  const fila = (c, pasado) => `<div class="festrow cierrerow${pasado ? ' pasado' : ''}"><span class="festinfo"><b>${esc(textoCierre(S, c))}</b><small>${pasado ? 'ya pasó · ' : ''}${esc(resumenDecisionesCorto(c))}</small></span>${pasado ? `<button type="button" class="btn-mini ghost" data-ciever="${esc(c.id)}">Ver</button>` : `<button type="button" class="btn-mini ghost" data-cieedit="${esc(c.id)}">Editar</button>`}<button type="button" class="btn-mini ghost" data-ciereabrir="${esc(c.id)}">Reabrir</button></div>`;
  return (vivos.map(c => fila(c, false)).join('') || '<div class="festvacio">Ningún cierre por fechas.</div>')
    + (recientes.length ? `<div class="pinlbl">Ya pasados</div>${recientes.map(c => fila(c, true)).join('')}` : '')
    + (viejos ? `<small class="filltxt">${pl(viejos, 'cierre más antiguo', 'cierres más antiguos')} (siguen en el historial).</small>` : '');
}

function openCierre(o) {
  const x = o || {};
  for (const k of Object.keys(CIE)) delete CIE[k];
  const previo = x.id ? cierresDe(S).find(c => c.id === x.id) : null;
  if (x.id && !previo) { toast('Ese cierre ya no existe', 'warn'); return; }
  if (previo) {
    Object.assign(CIE, { id: previo.id, localId: previo.localId, dias: JSON.parse(JSON.stringify(previo.dias)), motivo: previo.motivo, detalle: previo.detalle || '', paso: x.editar ? 1 : 'ver' });
    CIE.decisiones = {};
    for (const [pid, d] of Object.entries(previo.decisiones || {})) CIE.decisiones[pid] = { tipo: d.tipo, destinos: d.destinos ? JSON.parse(JSON.stringify(d.destinos)) : {} };
  } else {
    const iso = x.iso || isoDia();
    Object.assign(CIE, { id: null, localId: x.localId && localDe(S, x.localId) ? x.localId : S.locales[0].id, dias: x.dias ? JSON.parse(JSON.stringify(x.dias)) : { [iso]: x.franja ? [x.franja] : ['M', 'T'] }, motivo: x.motivo || 'reforma', detalle: x.detalle || '', paso: x.paso || 1, decisiones: {} });
  }
  CIE.abre = x.abre || null;         // viene de «Cuándo abre»: { franja, dow }
  CIE.despues = x.despues || null;   // quién repinta al terminar (la lista de Ajustes)
  Object.assign(CIE, intervaloDeDias(CIE.dias) || { ini: isoDia(), iniF: 'M', fin: isoDia(), finF: 'T' });
  if (CIE.paso === 2) CIE.ctx = contextoCierre();
  const ov = abrirOverlay('cierreOvl', '<div id="cieBody"></div>', { ancho: 860 });
  ov.addEventListener('click', clicCierre);
  ov.addEventListener('change', cambioCierre);
  ov.addEventListener('input', e => { if (e.target.id === 'cieDet') { CIE.detalle = e.target.value; const p = ov.querySelector('#ciePrevia'); if (p) p.textContent = previaTxt(); } });
  pintarCierre();
}
// «lun 21/09 ya ha pasado» (revisión F2): cerrar días pasados quita de la planilla y de las horas plazas
// que ya se trabajaron; se puede (para apuntar un cierre que ya pasó), pero se avisa
function avisoPasados(c) {
  const hoy = isoHoy(), ps = diasDeCierre(c).filter(iso => iso < hoy);
  if (!ps.length) return '';
  const lista = ps.slice(0, 4).map(fechaCortaCierre).join(', ') + (ps.length > 4 ? ` y ${ps.length - 4} más` : '');
  return `${ps.length === 1 ? `El ${lista} ya ha pasado` : `Hay días que ya han pasado (${lista})`}: al cerrar${ps.length === 1 ? 'lo' : 'los'} se retiran plazas que ya se trabajaron y salen de las horas del mes.`;
}
function previaTxt() {
  const c = cierreDelVisor();
  return diasDeCierre(c).length ? textoCierre(S, c) : 'Ningún día cerrado: marca al menos una mañana o una tarde.';
}
function pintarCierre() {
  const body = document.querySelector('#cierreOvl #cieBody'); if (!body) return;
  const l = localDe(S, CIE.localId);
  const pasos = `<div class="ciepasos">${[['1', 'Días y motivo'], ['2', 'Quién trabajaba'], ['3', 'Confirmar']].map(([k, t]) => `<span data-paso="${k}" class="${String(CIE.paso) === k ? 'on' : ''}">${k} · ${t}</span>`).join('')}</div>`;
  const cab = CIE.abre
    ? `<span class="micro">CUÁNDO ABRE · ${esc(l.nombre.toUpperCase())}</span><h2 class="revh2">${esc(l.nombre)} deja de abrir ${esc(DOW_PL[CIE.abre.dow])} por la ${esc(FRANJA_LBL[CIE.abre.franja].toLowerCase())}</h2><p class="revsub">En las semanas que ya están planificadas había gente puesta. Di qué hace cada uno esos días; al confirmar, esas plazas salen y el horario cambia para todas las semanas.</p>`
    : `<span class="micro">CERRAR UN LOCAL UNOS DÍAS</span><h2 class="revh2">${CIE.id ? 'Editar el cierre' : 'Cerrar unos días'}</h2>`;
  if (CIE.paso === 'ver') { body.innerHTML = htmlVerCierre(); return; }
  if (CIE.paso === 1) {
    const tira = [];
    for (const iso of rangoIso(CIE.ini, CIE.fin < CIE.ini ? CIE.ini : CIE.fin)) {
      if (tira.length >= MAX_DIAS_CIERRE) break;
      const cur = (CIE.dias[iso] || []).slice().sort().join('') || '0';
      tira.push(`<div class="ciedia${cur === '0' ? ' abierto' : ''}" data-ciedia="${iso}"><b>${esc(cieFecha(iso))}<small>${esc(MES3[+iso.slice(5, 7) - 1])}</small></b>${CIE_FR.map(([k, t]) => `<button type="button" class="ciefr${cur === k ? ' on' : ''}" data-ciefr="${iso}|${k}">${t}</button>`).join('')}</div>`);
    }
    const v = validarCierre(S, cierreDelVisor());
    body.innerHTML = `${cab}
      <p class="revsub">Como unas vacaciones del local: tiene principio y fin, y cuando pasa el local vuelve a abrir solo, con su horario de siempre. «Cuándo abre» (en Ajustes) es el horario de todas las semanas; esto no lo toca.</p>
      ${pasos}
      <div class="pinlbl">Local</div>
      <div class="segrow cielocs">${S.locales.map(x => `<button type="button" class="segk${x.id === CIE.localId ? ' on' : ''}" data-cieloc="${esc(x.id)}" style="--lc:${esc(x.color)}"><i class="ldot"></i>${esc(x.nombre)}</button>`).join('')}</div>
      <div class="cieint">
        <label class="pinlbl">Cierra el<input type="date" id="cieIni" class="logininp" data-libre value="${esc(CIE.ini)}"></label>
        <label class="pinlbl">desde<select id="cieIniF" class="logininp" data-libre><option value="M"${CIE.iniF === 'M' ? ' selected' : ''}>la mañana</option><option value="T"${CIE.iniF === 'T' ? ' selected' : ''}>la tarde</option></select></label>
        <label class="pinlbl">hasta el<input type="date" id="cieFin" class="logininp" data-libre value="${esc(CIE.fin)}"></label>
        <label class="pinlbl">incluida<select id="cieFinF" class="logininp" data-libre><option value="M"${CIE.finF === 'M' ? ' selected' : ''}>la mañana</option><option value="T"${CIE.finF === 'T' ? ' selected' : ''}>la tarde (todo el día)</option></select></label>
      </div>
      <div class="pinlbl">Cada día <small>(tócalo para dejarlo solo de mañana, solo de tarde, todo el día o abierto)</small></div>
      <div class="cietira">${tira.join('')}</div>
      <div class="pinlbl">Motivo</div>
      <div class="segrow ciemots">${MOTIVOS_CIERRE.map(m => `<button type="button" class="segk${m.id === CIE.motivo ? ' on' : ''}" data-ciemot="${m.id}">${esc(m.label)}</button>`).join('')}</div>
      <label class="pinlbl">Detalle <small>(opcional; con «Otro», es lo que se enseña)</small><input type="text" id="cieDet" class="logininp" data-libre maxlength="80" value="${esc(CIE.detalle)}" placeholder="p. ej. obra en la cocina"></label>
      <div id="ciePrevia" class="ciepre">${esc(previaTxt())}</div>
      ${avisoPasados(cierreDelVisor()) ? `<p class="cieaviso ciepas">${esc(avisoPasados(cierreDelVisor()))}</p>` : ''}
      ${v.ok ? '' : `<p class="cieerr">${esc(v.errores.join(' · '))}</p>`}
      <div class="ciebar">${CIE.id ? '<button type="button" class="btn btn-sec cierojo" id="cieReabrir">Reabrir el local</button>' : ''}<span style="flex:1"></span><button type="button" class="btn btn-cta" id="cieSig"${v.ok ? '' : ' disabled'}>Siguiente: quién trabajaba esos días</button></div>`;
    return;
  }
  const x = CIE.ctx;
  if (!x) { CIE.paso = 1; pintarCierre(); return; }
  if (CIE.paso === 2) {
    const tarjetas = x.afectados.map(a => {
      const tipo = tipoDe(a.pid);
      const noAus = (tipo === 'VAC' || tipo === 'LD') ? Object.entries(a.soloTurno).filter(([, v]) => !v).map(([iso]) => iso) : [];
      const dest = tipo === 'REFUERZA' ? [...new Set(a.turnos.map(t => t.iso))].map(iso => {
        const sel = ((CIE.decisiones[a.pid] || {}).destinos || {})[iso] || '';
        const ops = (sugerenciasDe(a.pid)[iso] || []).map(s => `<option value="${esc(s.tid)}"${s.tid === sel ? ' selected' : ''}>${esc(nombreLocal(s.localId))} · ${esc(FRANJA_LBL[s.franja].toLowerCase())} · ${esc(s.razon)}</option>`).join('');
        return `<label class="ciedest"><span>${esc(cieFecha(iso))}</span><select class="logininp" data-libre data-ciedest="${esc(a.pid)}|${iso}"><option value="">donde haga falta</option>${ops}</select></label>`;
      }).join('') : '';
      return `<div class="ciecard" data-ciepid="${esc(a.pid)}">
        <div class="ciehd"><span class="av" style="background:${avColor(a.pid)}">${esc(initials(a.nombre))}</span><b>${esc(a.nombre)}</b></div>
        <div class="ciechips">${a.turnos.map(t => `<span class="ciechip">${esc(cieFecha(t.iso))} · ${esc(FRANJA_LBL[t.franja].toLowerCase())}${t.abre ? ' · abre' : ''}${t.cocina ? ' · cocina' : ''}${t.fuente === 'semana tipo' ? ' · semana tipo' : ''}</span>`).join('')}</div>
        ${a.avisos.map(t => `<p class="cieaviso">${esc(t.charAt(0).toUpperCase() + t.slice(1))}</p>`).join('')}
        <div class="segrow ciedecs">${DECISIONES_CIERRE.map(d => `<button type="button" class="segk${tipo === d.id ? ' on' : ''}" data-ciedec="${esc(a.pid)}|${d.id}" title="${esc(d.largo)}">${esc(d.label)}</button>`).join('')}</div>
        ${dest ? `<div class="ciedests"><small>Dónde apoya cada día (primero donde falta gente):</small>${dest}</div>` : ''}
        ${noAus.length ? `<p class="cieaviso">${esc(noAus.map(cieFecha).join(' y '))}: ese día tiene otro turno, así que no se le pone ${tipo === 'VAC' ? 'vacaciones' : 'día libre'} (es de día entero): la parte cerrada cuenta como sin trabajo.</p>` : ''}
      </div>`;
    }).join('');
    body.innerHTML = `${cab}${CIE.abre ? '' : `<p class="revsub">${esc(textoCierre(S, x.c))}</p>`}${pasos}
      <h3 class="cieh3">Quién trabajaba esos días</h3>
      <p class="revsub">Por defecto, <b>sin trabajo</b>: nadie se redistribuye solo. <b>Apoyo</b>: esos días puede ir a otros locales sin forzar (sus vetos, franjas, días que libra, «nunca con» y partidos siguen valiendo). <b>Día libre</b> y <b>Vacaciones</b> van a su ficha y a la nómina.</p>
      <div class="ciecards">${tarjetas || '<div class="festvacio">Nadie trabajaba en esas casillas: se cierra sin más.</div>'}</div>
      <div class="ciebar">${CIE.abre ? '' : '<button type="button" class="btn btn-sec" id="cieAtras">Atrás</button>'}<span style="flex:1"></span><button type="button" class="btn btn-cta" id="cieSig">Siguiente: resumen</button></div>`;
    return;
  }
  // paso 3: el resumen en español llano
  const lista = x.afectados.map(a => {
    const tipo = tipoDe(a.pid);
    const extra = tipo === 'REFUERZA' ? destinosTxt((CIE.decisiones[a.pid] || {}).destinos, a.turnos) : diasTxt(a.turnos);
    return { pid: a.pid, nombre: a.nombre, tipo, extra };
  });
  const plazas = x.dias.reduce((n, iso) => n + ((x.c.dias[iso] || []).reduce((m, f) => m + pidsEn(x.e, iso, turnoId(x.c.localId, f)).length, 0)), 0) + (x.pend || []).length;
  const noAus = x.afectados.filter(a => ['VAC', 'LD'].includes(tipoDe(a.pid)) && Object.values(a.soloTurno).some(v => !v)).map(a => a.nombre);
  body.innerHTML = `${cab}${pasos}
    <div id="cieResumen" class="cieresumen">
      <p><b>${esc(textoCierre(S, x.c))}.</b> ${CIE.abre ? `Y desde ya, ${esc(l.nombre)} no abre ${esc(DOW_PL[CIE.abre.dow])} por la ${esc(FRANJA_LBL[CIE.abre.franja].toLowerCase())}.` : diasDeCierre(x.c).every(iso => iso < isoHoy()) ? '' : 'Cuando pase, el local vuelve a abrir con su horario de siempre.'}</p>
      ${avisoPasados(x.c) ? `<p class="cieaviso ciepas">${esc(avisoPasados(x.c))}</p>` : ''}
      <p>${plazas ? `Se ${plazas === 1 ? 'retira 1 plaza' : `retiran ${plazas} plazas`} de las casillas cerradas (si se reabre, vuelven a su sitio).` : 'No hay plazas que retirar.'}</p>
      ${htmlDecisiones(lista)}
      ${noAus.length ? `<p class="cieaviso">${esc(noAus.join(', '))}: algún día tiene otro turno; ese día no se le ponen vacaciones ni día libre y la parte cerrada cuenta como sin trabajo.</p>` : ''}
      <p class="revsub">El generador y la cobertura lo tendrán en cuenta. ${esc(comoDeshacer())} lo deshace todo.</p>
    </div>
    <div class="ciebar"><button type="button" class="btn btn-sec" id="cieAtras">Atrás</button><span style="flex:1"></span><button type="button" class="btn btn-cta" id="cieOk">${CIE.id ? 'Guardar los cambios' : CIE.abre ? 'Cambiar el horario y retirar esas plazas' : `Cerrar ${esc(l.nombre)}`}</button></div>`;
}
function htmlVerCierre() {
  const c = cierresDe(S).find(x => x.id === CIE.id);
  if (!c) return '<p class="revsub">Ese cierre ya no existe.</p>';
  const m = MOTIVOS_CIERRE.find(x => x.id === c.motivo);
  return `<span class="micro">CIERRE POR FECHAS · ${esc(nombreLocal(c.localId).toUpperCase())}</span>
    <h2 class="revh2">${esc(textoCierre(S, c))}</h2>
    <p class="revsub">${esc(m ? m.label : '')}${c.detalle ? ' · ' + esc(c.detalle) : ''}${c.ts ? (c.usuario && c.usuario !== 'local' ? ` · lo cerró ${esc(c.usuario)} el ` : ' · guardado el ') + new Date(c.ts).toLocaleDateString('es-ES') : ''}</p>
    ${htmlDecisiones(listaDecisionesGuardadas(c))}
    <p class="revsub">${pl((c.retirados || []).length, 'plaza retirada', 'plazas retiradas')} al cerrar: si se reabre, vuelven a su sitio si la persona puede estar.</p>
    <div class="ciebar"><button type="button" class="btn btn-sec cierojo" id="cieReabrir">Reabrir el local</button><span style="flex:1"></span><button type="button" class="btn btn-sec" id="cieEditar">Editar</button><button type="button" class="btn btn-cta" data-ovx>Cerrar</button></div>`;
}
function clicCierre(e) {
  const t = e.target;
  const loc = t.closest('[data-cieloc]');
  if (loc) { CIE.localId = loc.dataset.cieloc; pintarCierre(); return; }
  const fr = t.closest('[data-ciefr]');
  if (fr) { const [iso, k] = fr.dataset.ciefr.split('|'); if (k === '0') delete CIE.dias[iso]; else CIE.dias[iso] = k === 'MT' ? ['M', 'T'] : [k]; pintarCierre(); return; }
  const mo = t.closest('[data-ciemot]');
  if (mo) { CIE.motivo = mo.dataset.ciemot; pintarCierre(); return; }
  const de = t.closest('[data-ciedec]');
  if (de) { const [pid, tipo] = de.dataset.ciedec.split('|'); const prev = CIE.decisiones[pid] || {}; CIE.decisiones[pid] = { tipo, destinos: prev.destinos || {} }; pintarCierre(); return; }
  if (t.closest('#cieSig')) {
    if (CIE.paso === 1) { const v = validarCierre(S, cierreDelVisor()); if (!v.ok) { toast(v.errores.join(' · '), 'warn'); return; } CIE.ctx = contextoCierre(); CIE.paso = 2; }
    else if (CIE.paso === 2) CIE.paso = 3;
    pintarCierre(); document.querySelector('#cierreOvl .ovcard').scrollTop = 0; return;
  }
  if (t.closest('#cieAtras')) { CIE.paso = CIE.paso === 3 ? 2 : 1; pintarCierre(); return; }
  if (t.closest('#cieEditar')) { CIE.paso = 1; pintarCierre(); return; }
  if (t.closest('#cieOk')) { confirmarCierre(); return; }
  if (t.closest('#cieReabrir')) { reabrirCierreUI(CIE.id, CIE.despues); return; }
}
function cambioCierre(e) {
  const t = e.target;
  if (['cieIni', 'cieIniF', 'cieFin', 'cieFinF'].includes(t.id)) {
    const ov = document.getElementById('cierreOvl');
    const val = id => ov.querySelector('#' + id).value;
    const antes = { ini: CIE.ini, iniF: CIE.iniF, fin: CIE.fin, finF: CIE.finF };
    CIE.ini = val('cieIni') || CIE.ini; CIE.iniF = val('cieIniF'); CIE.fin = val('cieFin') || CIE.fin; CIE.finF = val('cieFinF');
    if (CIE.fin < CIE.ini) CIE.fin = CIE.ini;
    CIE.dias = rehacerDias(CIE.dias, antes, CIE.ini, CIE.iniF, CIE.fin, CIE.finF);
    pintarCierre(); return;
  }
  const d = t.closest('[data-ciedest]');
  if (d) {
    const [pid, iso] = d.dataset.ciedest.split('|');
    const dec = CIE.decisiones[pid] = CIE.decisiones[pid] || { tipo: 'REFUERZA', destinos: {} };
    dec.destinos = dec.destinos || {};
    if (d.value) dec.destinos[iso] = d.value; else delete dec.destinos[iso];
  }
}
function decisionesDelVisor() {
  // solo de quien sale ahora en el visor: al editar, CIE.decisiones trae también las de quien ya no
  // está en las casillas cerradas (revisión F2; aplicarCierre las ignora igual)
  const afectados = new Set(((CIE.ctx && CIE.ctx.afectados) || []).map(a => a.pid));
  const out = {};
  for (const [pid, d] of Object.entries(CIE.decisiones)) {
    if (!afectados.has(pid)) continue;
    out[pid] = { tipo: d.tipo };
    if (d.tipo === 'REFUERZA' && d.destinos && Object.keys(d.destinos).length) out[pid].destinos = Object.assign({}, d.destinos);
  }
  return out;
}
const mesesDe = ds => [...new Set(ds.map(iso => iso.slice(0, 7)))];
function confirmarCierre() {
  const c = cierreDelVisor();
  const v = validarCierre(S, c);
  if (!v.ok) { toast(v.errores.join(' · '), 'bad'); return; }
  const previo = CIE.id ? cierresDe(S).find(x => x.id === CIE.id) : null;
  const ds = [...new Set(diasDeCierre(c).concat(previo ? diasDeCierre(previo) : []))].sort();
  for (const k of mesesDe(ds)) if (!confirmarSiCerrado(k + '-01')) return;
  const l = localDe(S, c.localId);
  const etiqueta = previo ? `editar el cierre de ${l.nombre}` : CIE.abre ? `${l.nombre}: cuándo abre` : `cerrar ${l.nombre}`;
  pushUndo(etiqueta, { otrosMeses: true, staff: true, cierres: true, locales: !!CIE.abre });
  c.id = c.id || 'cie_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  c.ts = Date.now();
  // quién lo cerró, solo con usuarios de verdad (modo servidor); sin él, «Ver cierre» decía «lo cerró local»
  const usuario = (typeof SRV !== 'undefined' && SRV.on && SRV.usuario) || null;
  if (usuario) c.usuario = usuario;
  // de dónde viene: «Cuándo abre» (al volver a marcar el día se ofrece reabrirlo) o el de antes al editar
  const origen = CIE.abre ? { abre: { franja: CIE.abre.franja, dow: CIE.abre.dow } } : previo && previo.origen ? previo.origen : null;
  if (origen) c.origen = JSON.parse(JSON.stringify(origen));
  const e = estadoRango(ds[0], ds[ds.length - 1], true);
  const r = aplicarCierre(S, S.staff, e, c, decisionesDelVisor());
  if (!r.ok) { undoStack.pop(); actualizarUndoBtn(); toast(r.errores.join(' · '), 'bad'); return; }
  if (CIE.abre) {
    const arr = l.abre[CIE.abre.franja] = (l.abre[CIE.abre.franja] || []).filter(d => d !== CIE.abre.dow);
    arr.sort((a, b) => a - b);
    registrarCambio(`Ajustes de ${l.nombre}: deja de abrir ${DOW_PL[CIE.abre.dow]} por la ${FRANJA_LBL[CIE.abre.franja].toLowerCase()} (todas las semanas)`, 'cambio');
  }
  const n = t => Object.values(c.decisiones).filter(d => d.tipo === t).map(d => d);
  const quien = t => Object.entries(c.decisiones).filter(([, d]) => d.tipo === t).map(([pid]) => nombrePid(pid));
  const partes = [['REFUERZA', 'apoyo'], ['SIN', 'sin trabajo'], ['VAC', 'vacaciones'], ['LD', 'día libre']].filter(([t]) => n(t).length).map(([t, lbl]) => `${lbl}: ${quien(t).join(', ')}`);
  registrarCambio(`${textoCierre(S, c)}${previo ? ' (editado)' : ''} · ${pl(r.retirados, 'plaza retirada', 'plazas retiradas')}${partes.length ? ' · ' + partes.join(' · ') : ''}${r.rechazados.length ? ` · no se pudo poner: ${r.rechazados.map(x => `${nombrePid(x.pid)} el ${fmtDM(x.iso)} (${x.motivo})`).join('; ')}` : ''}${r.avisos.length ? ' · ' + r.avisos.join(' · ') : ''}`, 'local');
  for (const k of mesesDe(ds)) if (mesCerrado(k + '-01')) registrarCambio(`Cambio en un mes cerrado (${k})`, 'aviso');
  saveState();
  if (typeof GEN !== 'undefined') GEN.previa = null;   // una vista previa del Generador de antes del cierre ya no vale
  const ov = document.getElementById('cierreOvl'); if (ov) ov.remove();
  renderVistaActiva();
  if (CIE.despues) try { CIE.despues(); } catch (err) {}
  toast(`${textoCierre(S, c)} · ${pl(r.retirados, 'plaza retirada', 'plazas retiradas')}${r.avisos.length ? ` · ${pl(r.avisos.length, 'aviso', 'avisos')} en el historial` : ''}${r.rechazados.length ? ` · ${pl(r.rechazados.length, 'apoyo no se pudo poner', 'apoyos no se pudieron poner')}` : ''} · ${comoDeshacer()} para deshacer`, r.avisos.length || r.rechazados.length ? 'warn' : 'ok');
}
function reabrirCierreUI(id, despues) {
  const c = cierresDe(S).find(x => x.id === id); if (!c) { toast('Ese cierre ya no existe', 'warn'); return; }
  const ds = diasDeCierre(c);
  if (!confirm(`¿Reabrir? ${textoCierre(S, c)}.\n\nLas plazas que se retiraron al cerrar vuelven a su sitio si la persona puede estar, los días de vacaciones o libres que puso el cierre se quitan y los apoyos en otros locales salen. ${comoDeshacer()} lo deshace.`)) return;
  for (const k of mesesDe(ds)) if (!confirmarSiCerrado(k + '-01')) return;
  pushUndo(`reabrir ${nombreLocal(c.localId)}`, { otrosMeses: true, staff: true, cierres: true });
  const r = reabrirCierre(c, null);
  saveState();
  if (typeof GEN !== 'undefined') GEN.previa = null;
  const ov = document.getElementById('cierreOvl'); if (ov) ov.remove();
  renderVistaActiva();
  if (despues) try { despues(); } catch (err) {}
  toast(`${nombreLocal(c.localId)} reabierto · ${pl(r.devueltos.length, 'plaza vuelve', 'plazas vuelven')}${r.noDevueltos.length ? ` · ${r.noDevueltos.length} no ${r.noDevueltos.length === 1 ? 'pudo' : 'pudieron'} volver` : ''} · ${comoDeshacer()} para deshacer`, r.noDevueltos.length ? 'warn' : 'ok');
}
// Reabre sin preguntar (ya se ha preguntado y apilado el deshacer) y lo apunta en el historial. Con
// desde, solo a partir de esa fecha: lo anterior sigue cerrado (reabrirCierreDesde, del modelo).
function reabrirCierre(c, desde) {
  const ds = diasDeCierre(c), txt = textoCierre(S, c);
  const e = estadoRango(ds[0], ds[ds.length - 1], true);
  const r = desde ? reabrirCierreDesde(S, S.staff, e, c.id, desde) : quitarCierre(S, S.staff, e, c.id, { devolver: true, quitarVacaciones: true });
  registrarCambio(`${nombreLocal(c.localId)} reabierto (${txt})${r.parcial ? ` desde el ${fmtDM(desde)}; lo anterior sigue cerrado` : ''}: ${pl(r.devueltos.length, 'plaza devuelta', 'plazas devueltas')}${r.noDevueltos.length ? `, ${r.noDevueltos.length} no (${r.noDevueltos.map(x => `${nombrePid(x.pid)} el ${fmtDM(x.iso)}: ${x.motivo}`).join('; ')})` : ''}${r.vacacionesQuitadas.length ? `, ${pl(r.vacacionesQuitadas.length, 'día de vacaciones o libre quitado', 'días de vacaciones o libres quitados')}` : ''}${r.apoyosQuitados.length ? `, ${pl(r.apoyosQuitados.length, 'apoyo retirado', 'apoyos retirados')}` : ''}`, 'local');
  return r;
}
// «Cuándo abre»: al volver a marcar un día, los cierres que se hicieron al quitarlo (en las semanas ya
// planificadas) se ofrecen para reabrir desde hoy; lo ya pasado sigue cerrado (24/09, revisión F2:
// seguían mandando sobre el horario y el domingo 04/10 se quedaba cerrado sin que nada lo dijera).
// Devuelve true si se reabrió algo.
function ofrecerReabrirHorario(l, franja, dow) {
  const hoy = isoHoy();
  const cs = cierresDelHorario(S, l.id, franja, dow).filter(c => diasDeCierre(c).some(iso => iso >= hoy));
  if (!cs.length) return false;
  const fr = FRANJA_LBL[franja].toLowerCase();
  if (!confirm(`Al quitar ${DOW_PL[dow]} por la ${fr} de ${l.nombre} se cerraron también los que ya estaban planificados:\n${cs.map(c => '· ' + textoCierre(S, c)).join('\n')}\n\n¿Reabrirlos desde hoy? Las plazas que se retiraron vuelven a su sitio si la persona puede estar y se quitan los días de vacaciones o libres que puso el cierre. Lo que ya pasó sigue como está. ${comoDeshacer()} lo deshace.`)) return false;
  const ds = [...new Set(cs.flatMap(diasDeCierre))].filter(iso => iso >= hoy);
  for (const k of mesesDe(ds)) if (!confirmarSiCerrado(k + '-01')) return false;
  pushUndo(`reabrir ${DOW_PL[dow]} por la ${fr} de ${l.nombre}`, { otrosMeses: true, staff: true, cierres: true });
  let n = 0;
  for (const c of cs) n += reabrirCierre(c, hoy).devueltos.length;
  saveState();
  if (typeof GEN !== 'undefined') GEN.previa = null;
  renderVistaActiva();
  toast(`${l.nombre} vuelve a abrir ${DOW_PL[dow]} por la ${fr} · ${pl(n, 'plaza vuelve', 'plazas vuelven')} · ${comoDeshacer()} para deshacer`, 'ok');
  return true;
}
// «Cuándo abre» deja de abrir un día de la semana: las casillas de ese día que ya tienen gente en
// las semanas planificadas (desde hoy, hasta dos meses), para pasar por el mismo visor
function diasPlanificadosCon(localId, franja, dow) {
  const hoy = isoHoy(), tid = turnoId(localId, franja), out = {};
  for (const k of Object.keys(S.meses || {}).sort()) {
    const m = S.meses[k];
    for (const [iso, porT] of Object.entries((m && m.asig) || {})) {
      if (iso < hoy || isoDow(iso) !== dow || !(porT[tid] || []).length) continue;
      if (addDias(hoy, MAX_DIAS_CIERRE - 1) < iso) continue;
      out[iso] = [franja];
    }
  }
  return out;
}
// Cómo sale en Descansos, «Libran hoy» y el pie de la hoja quien no trabaja ese día por un cierre:
// «cierre» (sin trabajo) o «apoyo · sin sitio» (apoya «donde haga falta» y nadie lo ha colocado; el
// modelo lo dice con apoyosSinSitio). null si libra de verdad o no tiene nada que ver con un cierre.
// Una sola lectura para todas esas vistas (24/09, revisión F2: Yilian salía de apoyo en Hoy y en su
// perfil, y a la vez como que libraba en Semana, el Generador y la hoja).
function marcaCierreDia(p, iso, est) {
  if (!p || !cierresDe(S).length) return null;
  const x = estadoDia(S, p, iso);
  if (x.libra || x.ausencia || !x.cierre) return null;
  if (x.cierre.tipo !== 'REFUERZA') return { cls: 'cie', txt: 'cierre', largo: 'sin trabajo · cierre', tip: x.texto };
  if (apoyosSinSitio(S, S.staff, est, iso).some(a => a.pid === p.id)) return { cls: 'cie apoyo', txt: 'apoyo · sin sitio', largo: 'apoyo · sin sitio', tip: `De apoyo por el cierre de ${nombreLocal(x.cierre.cierre.localId)}: aún no tiene sitio` };
  return null;
}
// «Sin trabajo por el cierre de Bar Mónaco: lun 28 por la tarde y mar 29 (no cuenta en las horas)»:
// la nota del detalle de Horas (D11: informativo, no toca el pago). xs = horasPersonaMes().sinTrabajoCierre
function textoSinTrabajoCierre(pid, xs) {
  const porLocal = new Map();
  for (const x of xs || []) {
    const dc = decisionCierre(S, pid, x.iso, x.franjas[0]);
    const lid = dc ? dc.cierre.localId : '';
    if (!porLocal.has(lid)) porLocal.set(lid, []);
    porLocal.get(lid).push(`${cieFecha(x.iso)}${x.trabaja ? ` por la ${x.franjas.map(f => FRANJA_LBL[f].toLowerCase()).join(' y ')}` : ''}`);
  }
  const y = ds => ds.length > 1 ? `${ds.slice(0, -1).join(', ')} y ${ds[ds.length - 1]}` : ds[0];
  return [...porLocal].map(([lid, ds]) => `Sin trabajo por el cierre de ${lid ? nombreLocal(lid) : 'un local'}: ${y(ds)} (no cuenta en las horas)`).join(' · ');
}
