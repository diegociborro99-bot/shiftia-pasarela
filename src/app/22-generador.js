// ================= GENERADOR DE PLANILLAS =================
// Dos motores sobre las mismas reglas: el generador local (semana tipo + coberturas
// + relleno de mínimos con razones, determinista, funciona sin conexión) y el
// núcleo Shiftia (CP-SAT, vía el servidor, cuando está configurado). Siempre con
// vista previa: nada se aplica sin verlo; todo se deshace con Ctrl+Z.
const GEN = { modo: 'semana', lunes: null, desde: null, hasta: null, titulo: '', motor: 'local', previa: null, opts: { desdeHoy: true, permitirPartido: false, sinPatron: false }, nucleo: null, ocupado: false };

function irAGenerador(o) {
  GEN.desde = o.desde; GEN.hasta = o.hasta; GEN.titulo = o.titulo || 'Generar'; GEN.previa = null; GEN.refuerzo = !!o.refuerzo;
  // una semana entera (lunes a domingo) va al generador semanal, el de la planilla del grupo
  if (o.desde && o.hasta && isoDow(o.desde) === 1 && o.hasta === addDias(o.desde, 6)) { GEN.modo = 'semana'; GEN.lunes = o.desde; }
  else if (o.desde) GEN.modo = 'periodo';
  switchTab('generador');
}
const htmlModoGen = () => `<div class="segm" role="tablist"><button type="button" class="${GEN.modo === 'semana' ? 'on' : ''}" data-modo="semana" role="tab">Semana</button><button type="button" class="${GEN.modo === 'periodo' ? 'on' : ''}" data-modo="periodo" role="tab">Periodo libre</button></div>`;
function rangoPorDefecto() {
  if (GEN.desde && GEN.hasta) return;
  GEN.desde = mondayOf(isoDia()); GEN.hasta = addDias(GEN.desde, 6); GEN.titulo = 'Generar esta semana';
}
async function comprobarNucleo() {
  if (!(typeof SRV !== 'undefined' && SRV.on)) { GEN.nucleo = { configurado: false, motivo: 'sin servidor' }; return; }
  try { const r = await api('GET', '/api/nucleo/salud'); GEN.nucleo = r.ok ? r.datos : { configurado: false }; } catch (e) { GEN.nucleo = { configurado: false }; }
}
function renderGenerador() {
  if (GEN.modo === 'semana') { renderGeneradorSemana(); return; }
  rangoPorDefecto();
  const root = $('#genRoot');
  const nDias = Math.round((fechaLocal(GEN.hasta) - fechaLocal(GEN.desde)) / 864e5) + 1;
  const hoy = isoHoy();
  const nuc = GEN.nucleo;
  root.innerHTML = `<div class="gengrid">
    <div class="genpanel">
      ${htmlModoGen()}
      <span class="micro">${esc(GEN.titulo)}</span>
      <div class="row2" style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <label class="pinlbl" style="margin:0">Desde<input type="date" id="genD1" class="logininp" value="${GEN.desde}" data-libre></label>
        <label class="pinlbl" style="margin:0">Hasta<input type="date" id="genD2" class="logininp" value="${GEN.hasta}" data-libre></label>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn-mini ghost" data-rango="semana">Esta semana</button><button class="btn-mini ghost" data-rango="mes">Este mes</button><button class="btn-mini ghost" data-rango="resto">Resto del mes</button></div>
      <label class="genopt"><input type="checkbox" id="genDesdeHoy" ${GEN.opts.desdeHoy ? 'checked' : ''} data-libre> <span><b>Solo desde hoy</b> · no toca los días ya pasados</span></label>
      <label class="genopt"><input type="checkbox" id="genPatron" ${GEN.opts.sinPatron ? '' : 'checked'} data-libre> <span><b>Partir de la semana tipo</b> · las plazas fijas del grupo primero; luego se rellena lo que falte</span></label>
      <label class="genopt"><input type="checkbox" id="genPartido" ${GEN.opts.permitirPartido ? 'checked' : ''} data-libre> <span><b>Permitir partidos no declarados</b> · si falta gente, propone partidos a quien no los tiene declarados y, si aun así no hay nadie más, junta parejas «nunca con» flexibles; lo avisa</span></label>
      <div class="pinlbl" style="margin-top:4px">Motor</div>
      <div class="motor">
        <button type="button" class="${GEN.motor === 'local' ? 'on' : ''}" data-motor="local"><b>Generador local</b><small>determinista, explica cada plaza, funciona sin conexión</small></button>
        <button type="button" class="${GEN.motor === 'nucleo' ? 'on' : ''}" data-motor="nucleo" ${nuc && nuc.configurado ? '' : 'disabled'}><b>Núcleo Shiftia (CP-SAT)</b><small>${nuc ? (nuc.configurado ? (nuc.ok ? 'optimización exacta vía el servidor' : 'configurado, sin respuesta ahora') : nuc.motivo === 'sin servidor' ? 'requiere el servidor de la app' : 'no configurado en el servidor') : 'comprobando…'}</small></button>
      </div>
      <p class="revsub" style="margin:0">Lo que pongas a mano o fuerces no lo quita nunca. Lo que puso la semana tipo o el propio generador y ya no vale (alguien que ahora libra ese día) se retira y sale en la vista previa. ${mesCerrado(GEN.desde) ? '<b style="color:var(--warn)">El mes de inicio está cerrado para la nómina.</b>' : ''}</p>
      <button class="btn btn-cta" id="genPrevia" ${GEN.ocupado ? 'disabled' : ''}>${GEN.ocupado ? 'Generando…' : '✦ Generar vista previa'}</button>
      <button class="btn btn-ghost" id="genLimpiar" title="Quita del periodo todo lo que no se puso a mano (semana tipo, generador, núcleo) para regenerar desde cero">Vaciar lo generado en el periodo…</button>
    </div>
    <div class="genres" id="genRes">${GEN.previa ? htmlPrevia(GEN.previa) : `<div class="genvacio">Elige el periodo y pulsa <b>Generar vista previa</b>. Verás cada plaza con su razón, los turnos que se quedan cortos y por qué, y podrás aplicarlo todo o solo parte.</div>`}</div>
  </div>`;
  root.querySelector('#genD1').addEventListener('change', e => { GEN.desde = e.target.value || GEN.desde; GEN.previa = null; renderGenerador(); });
  root.querySelector('#genD2').addEventListener('change', e => { GEN.hasta = e.target.value || GEN.hasta; GEN.previa = null; renderGenerador(); });
  root.querySelector('#genDesdeHoy').addEventListener('change', e => { GEN.opts.desdeHoy = e.target.checked; });
  root.querySelector('#genPatron').addEventListener('change', e => { GEN.opts.sinPatron = !e.target.checked; });
  root.querySelector('#genPartido').addEventListener('change', e => { GEN.opts.permitirPartido = e.target.checked; });
  root.querySelector('.gengrid').addEventListener('click', e => {   // en el contenedor recién pintado: cada render trae su listener, sin acumular
    const rg = e.target.closest('[data-rango]');
    if (rg) {
      const k = rg.dataset.rango;
      if (k === 'semana') { GEN.desde = mondayOf(hoy); GEN.hasta = addDias(GEN.desde, 6); GEN.titulo = 'Generar esta semana'; }
      else if (k === 'mes') { GEN.desde = est.days[0].iso; GEN.hasta = est.days[est.days.length - 1].iso; GEN.titulo = `Generar ${MESES[S.m - 1].toLowerCase()}`; }
      else { GEN.desde = hoy > est.days[0].iso ? hoy : est.days[0].iso; GEN.hasta = est.days[est.days.length - 1].iso; GEN.titulo = 'Resto del mes'; }
      GEN.previa = null; renderGenerador(); return;
    }
    const md = e.target.closest('[data-modo]');
    if (md) { GEN.modo = md.dataset.modo; GEN.previa = null; if (GEN.modo === 'semana' && !GEN.lunes) GEN.lunes = mondayOf(isoDia()); renderGenerador(); return; }
    const mo = e.target.closest('[data-motor]');
    if (mo && !mo.disabled) { GEN.motor = mo.dataset.motor; GEN.previa = null; renderGenerador(); return; }
    if (e.target.id === 'genPrevia') { generarPrevia(); return; }
    if (e.target.id === 'genLimpiar') { vaciarGenerado(); return; }
    if (e.target.id === 'genAplicar') { aplicarPrevia(); return; }
    const ap = e.target.closest('[data-aplicaruno]');
    // la propuesta «con aviso» la acepta el encargado con un clic: es decisión suya, así que se guarda
    // como puesta a mano y nadie la retira en automático (24/09, revisión). Se pone con lo que la propuesta
    // relaja (RELAJABLE del modelo, revisión de la fase 6): antes la pareja «nunca con» flexible se proponía y al
    // pulsar «Aplicar» salía «nunca con Mari Luz»
    if (ap) { const [iso, tid, pid] = ap.dataset.aplicaruno.split('|'); pushUndo(`poner a ${nombrePid(pid)}`); const r = asignarUI(iso, tid, pid, Object.assign({ origen: 'manual', razon: 'propuesta con aviso aceptada' }, RELAJABLE)); if (r.ok) { toast(r.avisos.length ? `${nombrePid(pid)} añadido con aviso: ${r.avisos.join(', ')}` : `${nombrePid(pid)} añadido`, r.avisos.length ? 'warn' : 'ok'); GEN.previa = null; renderGenerador(); } else { undoStack.pop(); actualizarUndoBtn(); toast(r.motivo, 'bad'); } return; }
    const ir = e.target.closest('[data-irdia]');
    if (ir) irAIso(ir.dataset.irdia);
  }, { once: false });
  if (!GEN.nucleo) comprobarNucleo().then(() => { if (!$('#view-generador').classList.contains('hidden')) renderGenerador(); });
}
// clona los meses del periodo en un estado «vivo» para simular sin tocar S
function estadosDelRango(desde, hasta, clonar) {
  const meses = {};
  for (const iso of rangoIso(desde, hasta)) {
    const k = iso.slice(0, 7);
    if (meses[k]) continue;
    const e = estadoDeIso(iso, !clonar);
    meses[k] = clonar ? clonarEstado(e) : e;
  }
  return meses;
}
// genera sobre varios meses (el periodo puede cruzar de mes): un estado por mes. 24/09 (revisión F4): con
// `meses` (lo que ya hay en S.meses y, encima, los meses que se están generando), «N turnos esa semana»
// cuenta la semana entera cuando cruza de mes; antes, en la del 28/09, solo los días de octubre
function generarSobre(meses, desde, hasta, simular) {
  const total = { aplicados: [], huecos: [], coberturas: [], rechazados: [], retirados: [], avisos: [] };
  const todos = Object.assign({}, S.meses, meses);
  for (const [k, e] of Object.entries(meses)) {
    const d1 = desde > e.days[0].iso ? desde : e.days[0].iso, d2 = hasta < e.days[e.days.length - 1].iso ? hasta : e.days[e.days.length - 1].iso;
    if (d1 > d2) continue;
    const r = generarPlanilla(S, S.staff, e, d1, d2, { simular: false, desdeIso: GEN.opts.desdeHoy ? isoHoy() : undefined, permitirPartido: GEN.opts.permitirPartido, sinPatron: GEN.opts.sinPatron, meses: todos });
    total.aplicados.push(...r.aplicados); total.huecos.push(...r.huecos); total.coberturas.push(...r.coberturas); total.rechazados.push(...r.rechazados);
    total.retirados.push(...r.retirados); for (const a of r.avisos) if (!total.avisos.some(x => x.pid === a.pid && x.semana === a.semana)) total.avisos.push(a);
  }
  return total;
}
async function generarPrevia() {
  if (GEN.ocupado) return;
  GEN.ocupado = true; renderGenerador();
  try {
    const meses = estadosDelRango(GEN.desde, GEN.hasta, true);
    let r;
    if (GEN.motor === 'nucleo') r = await generarConNucleo(meses);
    else r = generarSobre(meses, GEN.desde, GEN.hasta, true);
    if (!r) return;
    r.meses = meses; r.motor = GEN.motor; r.ts = Date.now();
    // avisos sobre la previa: casillas que siguen cortas, sin cocina…
    r.revision = [];
    for (const e of Object.values(meses)) r.revision.push(...revisionMes(S, S.staff, e, { desde: GEN.desde, hasta: GEN.hasta, hoy: isoHoy() }));
    GEN.previa = r;
  } catch (e) { toast('No se pudo generar: ' + (e && e.message ? e.message : e), 'bad'); }
  finally { GEN.ocupado = false; renderGenerador(); }
}
async function generarConNucleo(meses) {
  // el núcleo trabaja sobre el periodo entero; después se vuelca mes a mes
  const est0 = Object.values(meses)[0];
  // 24/09: antes de pasar lo ya asignado como fijo, se retira lo automático que ya no vale (un
  // día libre cambiado), igual que en el generador local; lo manual o forzado se queda
  const retirados = [];
  for (const e of Object.values(meses)) {
    const d1 = GEN.desde > e.days[0].iso ? GEN.desde : e.days[0].iso, d2 = GEN.hasta < e.days[e.days.length - 1].iso ? GEN.hasta : e.days[e.days.length - 1].iso;
    if (d1 <= d2) retirados.push(...retirarQueIncumplen(S, S.staff, e, d1, d2, { desdeIso: GEN.opts.desdeHoy ? isoHoy() : undefined }));
  }
  const problema = toProblem(S, S.staff, est0, GEN.desde, GEN.hasta, { conPatron: !GEN.opts.sinPatron });
  // lo ya asignado en el periodo va como fijo: el generador es aditivo también con el núcleo
  for (const e of Object.values(meses)) for (const [iso, porT] of Object.entries(e.asig)) {
    if (iso < GEN.desde || iso > GEN.hasta) continue;
    for (const [tid, lista] of Object.entries(porT)) for (const x of lista) {
      const w = problema.workers.find(z => z.id === x.pid); if (!w) continue;
      const i = problema.meta.indices.findIndex(z => z.iso === iso && z.franja === partirTurno(tid).franja);
      if (i >= 0) { w.fixed[i] = partirTurno(tid).localId; delete w.unavailable[i]; }
    }
  }
  toast('Enviando al núcleo Shiftia…', 'ok');
  const r = await api('POST', '/api/nucleo/solve', { problem: problema, config: { time_limit_s: 20, deterministic: true, objective: 'lexicographic', explain_infeasible: true, relax_on_infeasible: true } });
  if (!r.ok) { toast((r.datos && (r.datos.error || r.datos.detail)) || `El núcleo respondió ${r.status}`, 'bad'); return null; }
  const sol = r.datos;
  if (!sol || !sol.schedule) { toast('El núcleo no devolvió una planilla' + (sol && sol.conflict ? ': ' + JSON.stringify(sol.conflict).slice(0, 200) : ''), 'bad'); return null; }
  const total = { aplicados: [], huecos: [], coberturas: [], rechazados: [], retirados, avisos: [], nucleo: { status: sol.status, feasible: sol.feasible, objective: sol.objective, stats: sol.stats, violations: sol.violations, relaxations: sol.relaxations } };
  for (const e of Object.values(meses)) {
    const d1 = GEN.desde > e.days[0].iso ? GEN.desde : e.days[0].iso;
    const d2 = GEN.hasta < e.days[e.days.length - 1].iso ? GEN.hasta : e.days[e.days.length - 1].iso;
    const sub = { schedule: {} };
    for (const [pid, porIdx] of Object.entries(sol.schedule)) for (const [i, code] of Object.entries(porIdx)) { const x = problema.meta.indices[+i]; if (x && x.iso >= d1 && x.iso <= d2) (sub.schedule[pid] = sub.schedule[pid] || {})[i] = code; }
    const rr = desdeSolucion(S, S.staff, e, problema, sub);
    total.aplicados.push(...rr.aplicados); total.rechazados.push(...rr.rechazados);
    // lo que el núcleo no cubrió sigue siendo un hueco explicado
    for (const iso of rangoIso(d1, d2)) for (const t of turnosDe(S)) { if (!turnoAbierto(S, e, iso, t.id)) continue; const rv = revisarTurno(S, S.staff, e, iso, t.id); if (rv.faltan) total.huecos.push({ iso, turnoId: t.id, faltan: rv.faltan, minimo: rv.minimo, supuesto: rv.supuesto, porQueNadie: porQueNadie(S, S.staff, e, iso, t.id) }); }
  }
  return total;
}
// «Mari Luz en Pasarela mañana y tarde el 29/9: libra el martes esta semana»: una línea por persona,
// local, día y motivo, con sus franjas (24/09, revisión: se repetía la misma línea por la mañana y
// por la tarde sin decir cuál)
function lineasRetirados(xs) {
  const m = new Map();
  for (const r of xs) {
    const { localId, franja } = partirTurno(r.turnoId), k = [r.pid, localId, r.iso, r.motivo].join('|');
    if (!m.has(k)) m.set(k, { r, localId, franjas: [] });
    m.get(k).franjas.push(franja);
  }
  return [...m.values()].map(({ r, localId, franjas }) => `${esc(nombrePid(r.pid))} en ${esc(nombreLocal(localId))} ${FRANJAS.filter(f => franjas.includes(f)).map(f => FRANJA_LBL[f].toLowerCase()).join(' y ')} el ${fmtDM(r.iso)}: ${esc(r.motivo)}`);
}
function htmlPrevia(p) {
  const porDia = {};
  for (const a of p.aplicados) (porDia[a.iso] = porDia[a.iso] || { ap: [], hu: [] }).ap.push(a);
  for (const h of p.huecos) (porDia[h.iso] = porDia[h.iso] || { ap: [], hu: [] }).hu.push(h);
  const dias = Object.keys(porDia).sort();
  const nPatron = p.aplicados.filter(a => a.origen === 'patron').length, nGen = p.aplicados.length - nPatron;
  const conAviso = p.aplicados.filter(a => a.avisos && a.avisos.length).length;
  // D3: quien ya estaba y pasa a cubrir; solo los nuevos (revisión F3: el relevo ya volcado no es nada que volcar)
  const nRelevos = (p.coberturas || []).filter(c => c.yaEstaba && c.nuevo).length;
  const lp = tid => { const { localId } = partirTurno(tid); return `<span class="lpill" style="--lc:${colorLocal(localId)}">${esc((localDe(S, localId) || {}).corto || localId)}·${partirTurno(tid).franja}</span>`; };
  const fila = a => `<div class="genrow"><span class="av" style="background:${avColor(a.pid)}">${esc(initials(nombrePid(a.pid)))}</span><span class="gtxt"><b>${esc(nombrePid(a.pid))}</b><small>${esc(a.razon || '')}${a.avisos && a.avisos.length ? ' · <span style="color:var(--warn)">' + esc(a.avisos.join(', ')) + '</span>' : ''}${a.supuesto ? ' · <span style="color:var(--warn)">supuesto</span>' : ''}</small></span>${lp(a.turnoId)}</div>`;
  const hueco = h => {
    const e = p.meses[h.iso.slice(0, 7)];
    const alt = h.tipo === 'cocina' ? [] : candidatosConAviso(S, S.staff, e, h.iso, h.turnoId).slice(0, 3);
    const pq = Object.entries(h.porQueNadie || {}).slice(0, 5).map(([m, quienes]) => `<b>${esc(m)}</b>: ${esc(quienes.slice(0, 4).join(', '))}${quienes.length > 4 ? ` +${quienes.length - 4}` : ''}`).join(' · ');
    // (fase 5, S37) qué le falta a la casilla: gente, quien abra o la cocina obligatoria
    const titulo = h.tipo === 'cocina' ? 'Sin cocina (obligatoria)' : h.tipo === 'primero' ? 'Nadie puede abrir (1.ª posición)' : `Faltan ${h.faltan} de ${h.minimo}${h.supuesto ? ' (mínimo supuesto)' : ''}`;
    return `<div class="genrow hueco"><span class="av" style="background:var(--bad)">!</span><span class="gtxt"><b>${titulo}</b><small class="pqn">${pq || 'nadie disponible'}</small>${alt.length ? `<small>Con aviso: ${alt.map(c => `<button class="btn-mini ghost" data-aplicaruno="${h.iso}|${h.turnoId}|${c.pid}" title="${esc(c.razones.join(' · '))}">${esc(nombreCorto(c.nombre))}</button>`).join(' ')}</small>` : ''}</span>${lp(h.turnoId)}</div>`;
  };
  return `<div class="genkpis">
      <div class="genk ok"><b>${p.aplicados.length}</b><span>plazas propuestas</span></div>
      <div class="genk"><b>${nPatron}</b><span>de la semana tipo</span></div>
      <div class="genk"><b>${nGen}</b><span>rellenadas por el ${p.motor === 'nucleo' ? 'núcleo' : 'generador'}</span></div>
      <div class="genk ${p.huecos.length ? 'bad' : 'ok'}"><b>${p.huecos.length}</b><span>casillas que siguen cortas</span></div>
      ${conAviso ? `<div class="genk warn"><b>${conAviso}</b><span>con aviso</span></div>` : ''}
      ${p.coberturas.length ? `<div class="genk"><b>${p.coberturas.length}</b><span>coberturas «cubre a»</span></div>` : ''}
    </div>
    ${p.nucleo ? `<p class="revsub">Núcleo Shiftia: ${esc(p.nucleo.status || '')}${p.nucleo.stats && p.nucleo.stats.wall_time_s ? ` · ${Math.round(p.nucleo.stats.wall_time_s * 10) / 10} s` : ''}${p.nucleo.violations && p.nucleo.violations.length ? ` · ${p.nucleo.violations.length} regla(s) blanda(s) relajada(s)` : ''}${p.nucleo.relaxations && p.nucleo.relaxations.length ? ` · relajaciones: ${esc(JSON.stringify(p.nucleo.relaxations).slice(0, 160))}` : ''}</p>` : ''}
    ${(p.retirados || []).length ? `<div class="warnbanner gretlist"><b>${pl(p.retirados.length, 'plaza puesta en automático se retira', 'plazas puestas en automático se retiran')} (lo puesto a mano o forzado se queda)</b>${lineasRetirados(p.retirados).slice(0, 8).join(' · ')}${lineasRetirados(p.retirados).length > 8 ? ` · y ${lineasRetirados(p.retirados).length - 8} más` : ''}</div>` : ''}
    ${(p.avisos || []).map(a => `<div class="warnbanner">${esc(a.texto)}</div>`).join('')}
    ${p.rechazados.length ? `<div class="warnbanner"><b>${pl(p.rechazados.length, 'plaza de la semana tipo no se pudo poner', 'plazas de la semana tipo no se pudieron poner')}</b>${p.rechazados.slice(0, 5).map(r => `${esc(nombrePid(r.pid))} en ${esc(nombreLocal(partirTurno(r.turnoId).localId))} el ${fmtDM(r.iso)}: ${esc(r.motivo)}`).join(' · ')}</div>` : ''}
    ${!p.aplicados.length && !p.huecos.length && !(p.retirados || []).length ? '<div class="genvacio">Nada que proponer: el periodo ya está completo (o queda fuera de «solo desde hoy»).</div>' : ''}
    ${dias.map(iso => `<div class="gendia"><div class="gdh">${fmtLargo(iso)}<small>${pl(porDia[iso].ap.length, 'plaza', 'plazas')}${porDia[iso].hu.length ? ` · ${pl(porDia[iso].hu.length, 'casilla corta', 'casillas cortas')}` : ''} · <button class="glink" data-irdia="${iso}">ver el día</button></small></div>${porDia[iso].hu.map(hueco).join('')}${porDia[iso].ap.map(fila).join('')}</div>`).join('')}
    <div class="genbar"><button class="btn btn-cta" id="genAplicar" ${p.aplicados.length || (p.retirados || []).length || nRelevos ? '' : 'disabled'}>${p.aplicados.length || (p.retirados || []).length || nRelevos ? `Volcar a la planilla (${[p.aplicados.length ? pl(p.aplicados.length, 'plaza', 'plazas') : '', (p.retirados || []).length ? pl(p.retirados.length, 'retirada', 'retiradas') : '', nRelevos ? pl(nRelevos, 'relevo «cubre a»', 'relevos «cubre a»') : ''].filter(Boolean).join(', ')})` : 'Nada nuevo que volcar'}</button><span class="revsub" style="margin:0">Se puede deshacer con Ctrl+Z. Las casillas cortas quedan marcadas en rojo en Hoy, Semana y Mes.</span></div>`;
}
function aplicarPrevia() {
  const p = GEN.previa; if (!p || !(p.aplicados.length || (p.retirados || []).length || (p.coberturas || []).some(c => c.yaEstaba && c.nuevo))) return;
  if (!confirmarSiCerrado(GEN.desde)) return;
  pushUndo(`generar ${fmtDM(GEN.desde)}–${fmtDM(GEN.hasta)}`, { otrosMeses: true });
  // 24/09 (revisión F3): el volcado vive en el modelo (volcarPrevia), en el orden que no pierde el relevo:
  // lo que se retira (solo lo automático, con retirarEntrada), el «por» de quien ya no falta, las plazas
  // (cada una con su «por» y su nota) y, al final, los relevos «cubre a» con su marca. Antes los relevos se
  // marcaban antes de volcar las plazas y Mari Luz entraba «por Iván» sin la marca: al volver Iván, el
  // generador le retiraba su propia plaza
  const r = volcarPrevia(S, S.staff, iso => estadoDeIso(iso, true), p, { desde: GEN.desde, hasta: GEN.hasta, desdeIso: GEN.opts.desdeHoy ? isoHoy() : undefined, previaDe: iso => p.meses[iso.slice(0, 7)] });
  const n = r.aplicadas, fallos = r.fallos, nRet = r.retiradas;
  registrarCambio(`Generador (${p.motor === 'nucleo' ? 'núcleo Shiftia' : 'local'}): ${n} plaza(s) aplicadas del ${fmtDM(GEN.desde)} al ${fmtDM(GEN.hasta)}${nRet ? ` · ${nRet} retirada(s) que ya no valían` : ''}${r.relevos ? ` · ${pl(r.relevos, 'relevo «cubre a»', 'relevos «cubre a»')}` : ''}${p.huecos.length ? ` · ${p.huecos.length} casilla(s) siguen cortas` : ''}${fallos ? ` · ${fallos} no se pudieron poner` : ''}`, 'ia');
  saveState();
  GEN.previa = null;
  toast(`${n} plaza(s) aplicadas${nRet ? ` · ${pl(nRet, 'retirada', 'retiradas')}` : ''}${r.relevos ? ` · ${pl(r.relevos, 'relevo «cubre a»', 'relevos «cubre a»')}` : ''}${p.huecos.length ? ` · ${p.huecos.length} casilla(s) cortas por cubrir` : ''} · ${comoDeshacer()} para deshacer`, p.huecos.length ? 'warn' : 'ok');
  renderGenerador(); pintaRevDot();
}
function vaciarGenerado() {
  if (!confirm(`Se quita del ${fmtDM(GEN.desde)} al ${fmtDM(GEN.hasta)} todo lo que puso la semana tipo, el generador o el núcleo. Lo asignado a mano se queda. ¿Continuar? (Ctrl+Z lo deshace)`)) return;
  pushUndo('vaciar lo generado', { otrosMeses: true });
  let n = 0;
  for (const iso of rangoIso(GEN.desde, GEN.hasta)) {
    const e = estadoDeIso(iso, true);
    for (const [tid, lista] of Object.entries(e.asig[iso] || {})) {
      const keep = lista.filter(x => x.origen === 'manual' || x.forzado);
      n += lista.length - keep.length;
      if (keep.length) e.asig[iso][tid] = keep; else delete e.asig[iso][tid];
      if (e.manual && e.manual[iso]) delete e.manual[iso][tid];
    }
    if (e.asig[iso] && !Object.keys(e.asig[iso]).length) delete e.asig[iso];
  }
  registrarCambio(`Vaciado lo generado del ${fmtDM(GEN.desde)} al ${fmtDM(GEN.hasta)}: ${n} plaza(s)`, 'cambio');
  saveState(); GEN.previa = null; renderGenerador();
  toast(`${n} plaza(s) retiradas · Ctrl+Z para deshacer`, 'warn');
}


// ================= GENERADOR SEMANAL (el de la planilla del grupo) =================
// Genera la semana con la semana tipo y las fichas y la enseña como el prototipo del
// cliente (11/09): una tabla por local con las posiciones numeradas (1.º abre y hace
// turno completo, ◆ cocina en su posición, P partido, C continuo, □ sin local fijo, «por X»),
// la cuenta n/mín* de cada casilla, los huecos disponibles con su motivo, qué ha
// cambiado respecto a lo que había, quién libra cada día y las condiciones comprobadas.
// estado «virtual» de una semana: sus siete días apuntan a los objetos del mes al que
// pertenecen (una semana puede cruzar de mes); escribible=true los crea si faltan
function estadoSemana(lunes, escribible) {
  const e = { y: +lunes.slice(0, 4), m: +lunes.slice(5, 7), days: [], asig: {}, apertura: {}, manual: {}, festivos: [], virtual: true };
  for (let k = 0; k < 7; k++) {
    const iso = addDias(lunes, k);
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
// 24/09 (fase 5): con S.meses, «M este mes» de la carga cuenta el mes entero y no solo los días de la semana
function opcionesSemana() { return { simular: false, desdeIso: GEN.opts.desdeHoy ? isoHoy() : undefined, permitirPartido: GEN.opts.permitirPartido, sinPatron: GEN.opts.sinPatron, meses: S.meses }; }
function tituloSemana(lunes) { const fin = addDias(lunes, 6); const m1 = +lunes.slice(5, 7), m2 = +fin.slice(5, 7); return `${+lunes.slice(8, 10)}${m1 !== m2 ? ' ' + MES3[m1 - 1] : ''} – ${+fin.slice(8, 10)} de ${MESES[m2 - 1].toLowerCase()} ${fin.slice(0, 4)}`; }
function renderGeneradorSemana() {
  if (!GEN.lunes) GEN.lunes = mondayOf(isoDia());
  const lunes = GEN.lunes;
  const root = $('#genRoot');
  root.innerHTML = `<div class="gengrid">
    <div class="genpanel">
      ${htmlModoGen()}
      <span class="micro">PLANILLA SEMANAL</span>
      <div class="dnav gsnav"><div class="arrows"><button class="mbtn" id="gsPrev" aria-label="Semana anterior">‹</button><button class="mbtn" id="gsHoy" title="Semana de hoy">Hoy</button><button class="mbtn" id="gsNext" aria-label="Semana siguiente">›</button></div><div><span class="dkick">Semana del</span><div class="dbig gsbig"><b>${esc(tituloSemana(lunes))}</b></div></div></div>
      <label class="genopt"><input type="checkbox" id="genDesdeHoy" ${GEN.opts.desdeHoy ? 'checked' : ''} data-libre> <span><b>Solo desde hoy</b> · no toca los días ya pasados</span></label>
      <label class="genopt"><input type="checkbox" id="genPatron" ${GEN.opts.sinPatron ? '' : 'checked'} data-libre> <span><b>Partir de la semana tipo</b> · las plazas fijas del grupo primero</span></label>
      <label class="genopt"><input type="checkbox" id="genPartido" ${GEN.opts.permitirPartido ? 'checked' : ''} data-libre> <span><b>Permitir partidos no declarados</b> · y, si no hay nadie más, juntar parejas «nunca con» flexibles; con aviso</span></label>
      <p class="revsub" style="margin:0">Usa las fichas y los ajustes de cada local: mínimos, cocina en su posición, quién abre (turno completo), «nunca con», partidos declarados, días que libra… Lo que no cuadra queda como <b>hueco disponible</b> con el motivo: es mejor un hueco señalado que un nombre que no puede estar ahí. Nunca quita lo puesto a mano ni lo forzado; lo que puso la semana tipo o el generador y ahora rompe un día libre se retira y sale en «Qué ha cambiado». ${mesCerrado(lunes) ? '<b style="color:var(--warn)">El mes está cerrado para la nómina.</b>' : ''}</p>
      ${htmlLibrasSemana(lunes)}
      <button class="btn btn-cta" id="genPrevia" ${GEN.ocupado ? 'disabled' : ''}>${GEN.ocupado ? 'Generando…' : '✦ Generar la semana'}</button>
      <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn-mini ghost" id="gsCond">Condiciones que comprueba</button><button class="btn-mini ghost" id="genLimpiar" title="Quita de la semana todo lo que no se puso a mano">Vaciar lo generado…</button></div>
    </div>
    <div class="genres" id="genRes">${GEN.previa && GEN.previa.semana ? htmlSemanaGenerada(GEN.previa) : `<div class="genvacio">Elige la semana y pulsa <b>Generar la semana</b>. Verás la planilla completa por local con las posiciones, los huecos que quedan disponibles y por qué, qué cambia respecto a lo que hay, quién libra cada día y las condiciones comprobadas. Nada se aplica hasta que lo confirmes.</div>`}</div>
  </div>`;
  root.querySelector('#genDesdeHoy').addEventListener('change', e => { GEN.opts.desdeHoy = e.target.checked; });
  root.querySelector('#genPatron').addEventListener('change', e => { GEN.opts.sinPatron = !e.target.checked; });
  root.querySelector('#genPartido').addEventListener('change', e => { GEN.opts.permitirPartido = e.target.checked; });
  root.querySelector('.gengrid').addEventListener('click', e => {   // en el contenedor recién pintado: cada render trae su listener, sin acumular
    const md = e.target.closest('[data-modo]');
    if (md) { GEN.modo = md.dataset.modo; GEN.previa = null; renderGenerador(); return; }
    if (e.target.id === 'gsPrev' || e.target.id === 'gsNext') { GEN.lunes = addDias(GEN.lunes, e.target.id === 'gsPrev' ? -7 : 7); GEN.previa = null; renderGeneradorSemana(); return; }
    if (e.target.id === 'gsHoy') { GEN.lunes = mondayOf(isoHoy()); GEN.previa = null; renderGeneradorSemana(); return; }
    if (e.target.id === 'genPrevia') { generarPreviaSemana(); return; }
    if (e.target.id === 'genLimpiar') { GEN.desde = GEN.lunes; GEN.hasta = addDias(GEN.lunes, 6); vaciarGenerado(); return; }
    if (e.target.id === 'gsCond') { openCondicionesGen(); return; }
    if (e.target.closest('#gsLibra')) { openLibraSemana(GEN.lunes); return; }
    if (e.target.id === 'genAplicar') { aplicarSemana(); return; }
    if (e.target.id === 'gsPrint') { if (typeof abrirImpresionSemanaGenerada === 'function' && GEN.previa) abrirImpresionSemanaGenerada(GEN.previa, { titulo: 'Planilla propuesta', volcar: GEN.previa.aplicados ? { n: GEN.previa.aplicados, fn: () => { cerrarImpresion(); aplicarSemana(); } } : null }); else toast('La hoja imprimible de la planilla generada estará disponible en breve', 'warn'); return; }
    const ir = e.target.closest('[data-irdia]');
    if (ir) irAIso(ir.dataset.irdia);
  });
}
function generarPreviaSemana() {
  if (GEN.ocupado) return;
  GEN.ocupado = true; renderGeneradorSemana();
  try {
    const base = clonarEstado(estadoSemana(GEN.lunes, false));
    const res = generarSemana(S, S.staff, base, GEN.lunes, opcionesSemana());
    res.semana = true; res.ts = Date.now();
    GEN.previa = res;
  } catch (e) { toast('No se pudo generar: ' + (e && e.message ? e.message : e), 'bad'); }
  finally { GEN.ocupado = false; renderGeneradorSemana(); }
}
function aplicarSemana() {
  // también si lo único nuevo es un relevo «cubre a» o un «por» que se quita (revisión F3: cambios lo cuenta)
  const p = GEN.previa; if (!p || !p.semana || !(p.aplicados || (p.retirados || []).length || p.cambios.length)) return;
  if (!confirmarSiCerrado(GEN.lunes)) return;
  pushUndo(`generar la semana del ${fmtDM(GEN.lunes)}`, { otrosMeses: true });
  const real = estadoSemana(GEN.lunes, true);
  const res = generarSemana(S, S.staff, real, GEN.lunes, opcionesSemana());
  const rel = res.relevos ? `, ${pl(res.relevos, 'relevo «cubre a»', 'relevos «cubre a»')}` : '';
  registrarCambio(`Generador semanal: semana del ${fmtDM(GEN.lunes)} al ${fmtDM(addDias(GEN.lunes, 6))} — ${res.aplicados} plaza(s) nuevas${res.retirados.length ? `, ${res.retirados.length} retirada(s) (${res.retirados.map(x => `${nombrePid(x.pid)} el ${fmtDM(x.iso)}: ${x.motivo}`).join('; ')})` : ''}${rel}, ${res.huecos.length} hueco(s) disponibles, ${res.resumen.condicionesRotas} condición(es) sin cumplir`, 'ia');
  saveState(); GEN.previa = null;
  toast(`${res.aplicados} plaza(s) aplicadas${res.retirados.length ? ` · ${res.retirados.length} retirada(s)` : ''}${rel ? ' ·' + rel.slice(1) : ''}${res.huecos.length ? ` · ${res.huecos.length} hueco(s) quedan disponibles` : ''} · Ctrl+Z para deshacer`, res.huecos.length ? 'warn' : 'ok');
  renderGeneradorSemana(); pintaRevDot();
}
function htmlSemanaGenerada(res) {
  const r = res.resumen;
  // revisión F3: los cambios de «por» (el relevo de Mari Luz «por Iván», o quitarlo cuando Iván vuelve)
  // también se vuelcan; antes solo contaban las plazas nuevas y las retiradas
  const nRet = (res.retirados || []).length, nPor = (res.relevos || 0) + (res.desmarcados || 0), hayQueVolcar = !!(res.aplicados || nRet || res.cambios.length);
  const dl = iso => `${DIAS_L[isoDow(iso)].slice(0, 3)} ${+iso.slice(8, 10)}`;
  const nc = pid => esc(nombreCorto(nombrePid(pid)));
  const lp = tid => { const { localId, franja } = partirTurno(tid); return `<span class="lpill" style="--lc:${colorLocal(localId)}">${esc((localDe(S, localId) || {}).corto || localId)}·${franja}</span>`; };
  const slot = s => s.hueco
    ? `<div class="gslot ghueco" data-tipstr="${esc(s.motivo || '')}"><b>${s.pos}</b><span><i class="gtit">Hueco disponible</i><small>abre · turno completo</small></span></div>`
    : `<div class="gslot${s.avisos && s.avisos.length ? ' gaviso' : ''}"${s.avisos && s.avisos.length ? ` title="${esc(s.avisos.join(' · '))}"` : ''}><b>${s.pos}</b><span style="--pc:${avColor(s.pid)}">${s.avisos && s.avisos.length ? '<em class="gm gav" aria-label="con aviso">⚠</em>' : ''}<i class="gdot"></i>${s.abreFijo ? '<u class="gfijo" title="sale el primero (fijo)">▸</u>' : ''}${s.cocina ? `<u class="gcoc" title="cocina">${SVG_COCINA}</u>` : ''}${esc(nombreCorto(s.nombre))}${s.partido ? '<em class="gm" title="partido">P</em>' : s.continuo ? '<em class="gm gc" title="turno continuo">C</em>' : ''}${s.comodin ? '<em class="gm" title="sin local fijo">□</em>' : ''}${s.cocina ? '<em class="gm gcoct">cocina</em>' : ''}${s.por ? `<small>por ${nc(s.por)}</small>` : s.nota ? `<small>${esc(s.nota)}</small>` : s.supuesto ? '<small>plaza supuesta</small>' : ''}</span></div>`;
  const celda = d => {
    if (!d.abierto) return d.cierre ? `<td class="gcerr gcierre" title="${esc(d.cierre.texto)}"><span>Cerrado · ${esc(d.cierre.etiqueta)}</span></td>` : '<td class="gcerr"><span>Cerrado</span></td>';
    const hueco = d.slots.some(x => x.hueco);
    return `<td class="${d.cambiado ? 'gcamb' : ''}${d.faltan ? ' gfalta' : ''}"><div class="gcab"><span class="gcnt${d.faltan ? ' bad' : ''}">${d.n}/${d.min}${d.supuesto ? '*' : ''}${d.refuerzo ? '<i title="refuerzo por evento"> +' + d.refuerzo + '</i>' : ''}</span>${hueco ? '<span class="ghk">+1 hueco</span>' : ''}${d.faltan ? `<span class="ghk">faltan ${d.faltan}</span>` : ''}${d.cambiado ? '<span class="gcorr">cambia</span>' : ''}<button class="glink gir" data-irdia="${d.iso}" title="Ver el día">→</button></div>${d.slots.map(slot).join('')}</td>`;
  };
  const tablas = res.locales.map(l => `<table class="gsem" style="--lc:${esc(l.color)}"><thead><tr><th class="gl"><i></i>${esc(l.nombre)}<small>${esc(l.cocina)}</small></th>${res.dias.map(iso => `<th>${dl(iso)}</th>`).join('')}</tr></thead><tbody>${l.franjas.map(f => `<tr><th class="gfr">${FRANJA_LBL[f.franja]}<small>${f.franja === 'M' ? 'apertura' : 'tarde y noche'}</small></th>${f.dias.map(celda).join('')}</tr>`).join('')}</tbody></table>`).join('');
  // quien no trabaja por el cierre de su local sale en su propia fila, no en «libran» (24/09, D11); con
  // la revisión F2, también quien no trabaja solo una franja (Hojan · tarde) y quien apoya «donde haga
  // falta» y nadie ha colocado (apoyo sin sitio)
  const sinT = res.sinTrabajo || {}, sinTP = res.sinTrabajoParcial || {}, sinSitio = res.apoyoSinSitio || {};
  const haySinT = res.dias.some(iso => (sinT[iso] || []).length || (sinTP[iso] || []).length || (sinSitio[iso] || []).length);
  const chipsCierre = iso => (sinT[iso] || []).map(pid => `<span class="glchip" style="--pc:${avColor(pid)}">${nc(pid)}</span>`)
    .concat((sinTP[iso] || []).map(x => `<span class="glchip" style="--pc:${avColor(x.pid)}">${nc(x.pid)} · ${esc(x.franjas.map(f => FRANJA_LBL[f].toLowerCase()).join(' y '))}</span>`))
    .concat((sinSitio[iso] || []).map(pid => `<span class="glchip gsinsitio" style="--pc:${avColor(pid)}" title="De apoyo por un cierre: aún sin sitio">${nc(pid)} · apoyo sin sitio</span>`)).join('');
  const libran = `<table class="gsem glib" style="--lc:var(--ink3)"><thead><tr><th class="gl"><i></i>Quién libra cada día<small>de baja: ${esc(lblBajasSemana(res).join(' · ')) || 'nadie'}</small></th>${res.dias.map(iso => `<th>${dl(iso)}</th>`).join('')}</tr></thead><tbody><tr><th class="gfr">Libran</th>${res.dias.map(iso => `<td><small class="gln">${res.libran[iso].length} libran</small>${res.libran[iso].map(pid => `<span class="glchip" style="--pc:${avColor(pid)}">${nc(pid)}</span>`).join('') || '<em class="gnadie">nadie</em>'}</td>`).join('')}</tr>${haySinT ? `<tr class="gsint"><th class="gfr">Sin trabajo<small>por un cierre</small></th>${res.dias.map(iso => `<td>${chipsCierre(iso) || '<em class="gnadie">—</em>'}</td>`).join('')}</tr>` : ''}</tbody></table>`;
  // los cierres por fechas de la semana: una nota con lo que hace cada uno
  const cierresSem = cierresDe(S).filter(c => diasDeCierre(c).some(iso => res.dias.includes(iso)));
  const notaCierres = cierresSem.length ? `<div class="warnbanner gcierres">${cierresSem.map(c => `<b>${esc(textoCierre(S, c))}</b> · ${esc(resumenDecisionesCorto(c))}`).join('<br>')}. Sus casillas no se rellenan y nadie se redistribuye solo; quien apoya va donde falta.</div>` : '';
  // las plazas de la semana tipo que no se ponen por un cierre, agrupadas: «4 plazas de la semana tipo del Bar Mónaco: cerrado por reforma»
  const rechCierre = {}, rechResto = [];
  for (const x of res.rechazados || []) { const c = cierreEn(S, x.iso, x.turnoId); if (c && x.motivo === textoCierre(S, c)) (rechCierre[c.id] = rechCierre[c.id] || { c, n: 0 }).n++; else rechResto.push(x); }
  const rechCierreTxt = Object.values(rechCierre).map(({ c, n }) => `<div class="ghitem gcierre"><b>${pl(n, 'plaza', 'plazas')} de la semana tipo del ${esc(nombreLocal(c.localId))}</b><p>${esc(textoCierre(S, c).replace(nombreLocal(c.localId) + ' ', ''))}</p></div>`).join('');
  // con su «por» (revisión F3): «Mari L. → Mari L. por Iván» es un cambio aunque la casilla tenga la misma gente
  const ncPor = (pid, por) => nc(pid) + (por ? ` <small>por ${nc(por)}</small>` : '');
  const cambios = res.cambios.map(c => `<li>${lp(c.turnoId)} <b>${dl(c.iso)}</b>: ${c.antes.length ? '<s>' + c.antes.map(pid => ncPor(pid, (c.porAntes || {})[pid])).join(', ') + '</s> → ' : '<em>nueva:</em> '}${c.despues.map(pid => ncPor(pid, (c.porDespues || {})[pid])).join(', ') || 'vacía'}</li>`).join('');
  // (fase 5, S37) la cocina obligatoria que nadie puede llevar también es un hueco
  const huecos = res.huecos.map(h => { const pq = Object.entries(h.porQueNadie || {}).slice(0, 6).map(([m, q]) => `<b>${esc(m)}</b>: ${esc(q.slice(0, 5).join(', '))}${q.length > 5 ? ' +' + (q.length - 5) : ''}`).join(' · '); return `<div class="ghitem">${lp(h.turnoId)} <b>${dl(h.iso)}</b> · ${h.tipo === 'primero' ? '1.ª posición vacante' : h.tipo === 'cocina' ? 'cocina' : `faltan ${h.faltan} de ${h.minimo}`}<p>${esc(h.motivo || '')}</p><small>${pq || 'nadie de la plantilla puede'}</small></div>`; }).join('');
  // (fase 6, S22) «local»: ajustes de los locales que no son mínimos, cocina ni quién abre
  const grupos = [['minimos', 'Mínimos'], ['cocina', 'Cocina'], ['primero', 'Quién abre'], ['persona', 'Fichas'], ['regla', 'Reglas del grupo'], ['local', 'Otros ajustes de los locales']];
  const conds = grupos.map(([t, lbl]) => { const xs = res.condiciones.filter(c => c.tipo === t); return xs.length ? `<div class="gcgrp">${lbl} · ${xs.length}</div>` + xs.map(c => `<div class="gcond${c.ok ? '' : ' rota'}"><i>${c.ok ? '✓' : '✗'}</i><span><b>${c.num}</b> ${esc(c.texto)}${c.nueva ? ' <em class="gnueva">NUEVA</em>' : ''}${c.ok ? (c.nota ? `<small class="gnota">✓ ${esc(c.nota)}</small>` : '') : `<small>${esc(c.detalle)}</small>`}</span></div>`).join('') : ''; }).join('');
  return `<div class="genkpis">
      <div class="genk ok"><b>${r.turnos}</b><span>turnos abiertos</span></div>
      <div class="genk"><b>${res.aplicados}</b><span>plazas nuevas</span></div>
      <div class="genk ${r.huecos ? 'bad' : 'ok'}"><b>${r.huecos}</b><span>huecos disponibles</span></div>
      <div class="genk ${r.condicionesRotas ? 'warn' : 'ok'}"><b>${r.condiciones - r.condicionesRotas}/${r.condiciones}</b><span>condiciones cumplidas</span></div>
      <div class="genk ${r.maxDias > 6 ? 'warn' : ''}"><b>${r.maxDias}</b><span>días como máximo por persona</span></div>
      <div class="genk"><b>${r.descansos}</b><span>descansos</span></div>
    </div>
    <p class="revsub gsres">${r.huecos ? `La semana sale con <b>${pl(r.huecos, 'hueco disponible', 'huecos disponibles')}</b>: ninguna de las ${S.staff.filter(p => !r.deBaja.includes(p.id)).length} personas puede ocupar esa posición sin romper una condición, así que se deja señalada para ofrecérsela a quien pueda.` : 'La semana sale completa: todos los turnos tienen su gente mínima, su cocina y quien abre.'} ${r.condicionesRotas ? `<b style="color:var(--warn)">${pl(r.condicionesRotas, 'condición no se cumple', 'condiciones no se cumplen')}</b> (lo puesto a mano no se toca).` : `Se cumplen las ${r.condiciones} condiciones.`} ${res.cambios.length ? `${pl(res.cambios.length, 'casilla cambia', 'casillas cambian')} respecto a lo que había.` : 'Nada cambia respecto a lo que había.'}</p>
    <div class="genbar"><button class="btn btn-cta" id="genAplicar" ${hayQueVolcar ? '' : 'disabled'} title="${hayQueVolcar ? 'Pasa la planilla propuesta a la semana: la verás en Hoy, Semana y Mes' : 'La semana ya está como la propone el generador: no hay nada nuevo que volcar'}">${hayQueVolcar ? `Volcar a la planilla (${[res.aplicados ? pl(res.aplicados, 'plaza nueva', 'plazas nuevas') : '', nRet ? pl(nRet, 'retirada', 'retiradas') : '', res.relevos ? pl(res.relevos, 'relevo «cubre a»', 'relevos «cubre a»') : '', res.desmarcados ? pl(res.desmarcados, '«por» que se quita', '«por» que se quitan') : '', !res.aplicados && !nRet && !nPor ? pl(res.cambios.length, 'cambio', 'cambios') : ''].filter(Boolean).join(' · ')})` : 'Ya está volcada en la planilla'}</button><button class="btn btn-sec" id="gsPrint">Imprimir la planilla propuesta</button><span class="revsub" style="margin:0">${hayQueVolcar ? 'Al volcar, la semana queda así en la planilla; Ctrl+Z lo deshace.' : 'Nada cambia respecto a lo que hay: vacía la semana si quieres regenerarla desde cero.'} Los huecos siguen en rojo en Hoy y Semana hasta que alguien los coja.</span></div>
    ${notaCierres}
    <div class="gsemwrap">${tablas}${libran}</div>
    <div class="gsleg"><span><b>1</b> orden en la casilla: el primero abre y hace turno completo</span><span><u class="gfijo">▸</u> sale el primero (fijo)</span><span><u class="gcoc">${SVG_COCINA}</u> cocina</span><span><em class="gm">P</em> partido</span><span><em class="gm gc">C</em> turno continuo</span><span><em class="gm">□</em> sin local fijo</span><span class="gcnt">n/mín*</span> mínimo supuesto</span><span class="gcorr">cambia</span> respecto a lo que había</span><span class="ghk">hueco</span> nadie puede ocupar la posición</span></div>
    <div class="gscols">
      <div class="gscol"><h3>Qué ha cambiado · ${res.cambios.length}</h3>${res.cambios.length ? `<ul class="gcamblist">${cambios}</ul>` : '<p class="revsub">Nada: la semana ya estaba como la propone el generador.</p>'}${(res.retirados || []).length ? `<h3>Se retira · ${res.retirados.length}</h3><ul class="gcamblist gretlist">${res.retirados.map(x => `<li>${lp(x.turnoId)} <b>${dl(x.iso)}</b>: sale ${nc(x.pid)} · ${esc(x.motivo)}</li>`).join('')}</ul>` : ''}${(res.avisos || []).length ? `<h3>Cambios de día libre: a tener en cuenta</h3>${res.avisos.map(a => `<p class="revsub">${esc(a.texto)}</p>`).join('')}` : ''}</div>
      <div class="gscol"><h3>Huecos que quedan disponibles · ${res.huecos.length}</h3>${huecos || '<p class="revsub">Ninguno.</p>'}${res.rechazados && res.rechazados.length ? `<h3>Plazas de la semana tipo que no se pudieron poner · ${res.rechazados.length}</h3>${rechCierreTxt}${rechResto.slice(0, 8).map(x => `<div class="ghitem">${lp(x.turnoId)} <b>${dl(x.iso)}</b> · ${nc(x.pid)}<p>${esc(x.motivo)}</p></div>`).join('')}` : ''}</div>
      <div class="gscol"><h3>Condiciones comprobadas · ${r.condiciones - r.condicionesRotas} de ${r.condiciones}</h3><div class="gcondlist">${conds}</div></div>
    </div>`;
}
function openCondicionesGen() {
  const cs = condicionesDe(S, S.staff, GEN.lunes || mondayOf(isoDia()));   // las de la semana del Generador (24/09)
  const grupos = [['minimos', 'Mínimos por local, franja y día'], ['cocina', 'Cocina'], ['primero', 'Quién abre cada local'], ['persona', 'Condiciones de las fichas'], ['regla', 'Reglas del grupo'], ['local', 'Otros ajustes de los locales']];
  const html = `<span class="micro">LO QUE COMPRUEBA EL GENERADOR</span><h2 class="revh2" style="margin-top:8px">${cs.length} condiciones activas</h2>
    <p class="revsub">Salen de los ajustes de cada local y de las fichas de Equipo. Cada una se puede apagar desde allí (o desde Equipo → Condiciones) y el generador deja de comprobarla.</p>
    ${grupos.map(([t, lbl]) => { const xs = cs.filter(c => c.tipo === t); return xs.length ? `<div class="revgrp"><span class="dot" style="background:var(--accent)"></span>${lbl.toUpperCase()} · ${xs.length}</div>${xs.map(c => `<div class="gcond"><i>·</i><span><b>${c.num}</b> ${esc(c.texto)}${c.nueva ? ' <em class="gnueva">NUEVA</em>' : ''}</span></div>`).join('')}` : ''; }).join('')}`;
  abrirOverlay('condGenOvl', html, { ancho: 680 });
}

// ---------- el día libre de la semana, desde el Generador ----------
// 24/09 (reunión, D9): la ficha no se abre desde el Generador, así que tiene su propio acceso,
// que escribe en la semana que se está generando (GEN.lunes), y la lista de los cambios de esa
// semana a la vista. Guarda con cambiarDiaLibreUI, igual que la ficha.
// Las semanas ya pasadas no se cambian (24/09, revisión), así que en ellas el acceso no se ofrece.
// Quién sale en la lista: lo lee cambiosDeLibreSemana, el mismo filtro para el panel del Generador
// y para esta ventana («Días que libra» apagada: su cambio no cuenta, como en el generador).
const cambiosDeLibreSemana = lunes => S.staff.map(p => ({ p, lp: activa(S, p, 'libra') ? libraPuntualDe(p, lunes) : null })).filter(x => x.lp);
function htmlLibrasSemana(lunes) {
  const xs = cambiosDeLibreSemana(lunes);
  const pasada = lunes < lunesDe(isoHoy());
  return `<div class="gslibras"><button type="button" class="btn-mini ghost" id="gsLibra"${pasada ? ' disabled title="Esa semana ya ha pasado: su día libre no se cambia"' : ''}>Cambiar el día libre de alguien esta semana</button>${xs.length ? `<ul>${xs.map(x => `<li><b>${esc(x.p.nombre)}</b> ${esc(textoCambioLibre(x.p, x.lp))}</li>`).join('')}</ul>` : '<small>Nadie cambia su día libre esta semana.</small>'}</div>`;
}
function openLibraSemana(lunes, opts) {
  let pid = (opts && opts.pid) || '';
  const ov = abrirOverlay('libraSemOvl', `<span class="micro">GENERADOR · SEMANA DEL ${fmtDDMM(lunes)}</span>
    <h2 class="revh2">Cambiar el día libre esta semana</h2>
    <p class="revsub">Solo para la semana del ${fmtDDMM(lunes)} al ${fmtDDMM(addDias(lunes, 6))}: después cada uno vuelve a su día de siempre. Si la semana ya está en la planilla, el cambio se aplica al momento (lo puesto a mano o forzado se queda) y ${comoDeshacer()} lo deshace.</p>
    <label class="pinlbl">Persona<select class="logininp" id="lsPid" data-libre><option value="">— elegir persona —</option>${S.staff.slice().sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')).map(q => `<option value="${esc(q.id)}"${q.id === pid ? ' selected' : ''}>${esc(q.nombre)}</option>`).join('')}</select></label>
    <div id="lsDias"></div>
    <div class="lslista"></div>
    <div class="bar" style="display:flex;justify-content:flex-end;margin-top:14px"><button type="button" class="btn btn-cta" data-ovx>Listo</button></div>`, { ancho: 560, reabrir: () => openLibraSemana(lunes, { pid }) });
  const pinta = () => {
    const p = personaDeId(pid);
    const d = p ? (libraPuntualDe(p, lunes) || { dias: [] }).dias : [];
    ov.querySelector('#lsDias').innerHTML = p ? `<div class="pinlbl">Esa semana ${esc(p.nombre)} libra… <small>(de siempre: ${(p.libra || []).length ? esc(p.libra.map(x => DIAS_L[x].toLowerCase()).join(' y ')) : 'ningún día fijo'})</small></div><div class="dowset">${dowSet(d, 'lsdia')}</div>` : '';
    const xs = cambiosDeLibreSemana(lunes);
    ov.querySelector('.lslista').innerHTML = `<div class="pinlbl">Cambios de esta semana</div>` + (xs.length ? xs.map(x => `<div class="festrow"><span class="festinfo"><b>${esc(x.p.nombre)}</b><small>${esc(textoCambioLibre(x.p, x.lp))}</small></span><button type="button" class="festrm" data-lsquita="${esc(x.p.id)}" aria-label="Quitar el cambio de ${esc(x.p.nombre)}">✕</button></div>`).join('') : '<div class="festvacio">Nadie cambia su día libre esta semana.</div>');
  };
  // al repintar, el botón pulsado desaparece; el foco se devuelve a su sustituto. Si no, vuelve a la
  // tarjeta, en el móvil salta la regla que le da sitio al teclado y «Listo» se mueve entre pulsar y
  // soltar: hacían falta dos toques para cerrar (24/09, revisión)
  const tras = foco => {
    pinta();
    if (!$('#view-generador').classList.contains('hidden')) renderGenerador();
    const b = foco && ov.querySelector(foco);
    if (b) b.focus({ preventScroll: true });
  };
  ov.querySelector('#lsPid').addEventListener('change', e => { pid = e.target.value; pinta(); });
  ov.addEventListener('click', e => {
    const b = e.target.closest('[data-lsdia]');
    if (b && pid) {
      const d = +b.dataset.lsdia, act = (libraPuntualDe(personaDeId(pid), lunes) || { dias: [] }).dias;
      cambiarDiaLibreUI(pid, lunes, act.includes(d) ? act.filter(x => x !== d) : act.concat(d));
      tras(`[data-lsdia="${d}"]`); return;
    }
    const q = e.target.closest('[data-lsquita]');
    if (q) { cambiarDiaLibreUI(q.dataset.lsquita, lunes, []); tras('#lsPid'); }
  });
  pinta();
}
// «Laura» (de baja toda la semana) y «Tere de baja el lunes» (24/09, S6: la baja se mira día a día)
function lblBajasSemana(res) {
  const r = res.resumen || {};
  const cuando = ds => ds.length === 1 ? `el ${DIAS_L[isoDow(ds[0])].toLowerCase()}` : `del ${DIAS_L[isoDow(ds[0])].toLowerCase()} al ${DIAS_L[isoDow(ds[ds.length - 1])].toLowerCase()}`;
  return (r.deBaja || []).map(nombrePid).concat((r.bajasParciales || []).map(x => `${nombrePid(x.pid)} de baja ${cuando(x.dias)}`));
}
