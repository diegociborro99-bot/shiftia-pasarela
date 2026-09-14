// ================= GENERADOR DE PLANILLAS =================
// Dos motores sobre las mismas reglas: el generador local (semana tipo + coberturas
// + relleno de mínimos con razones, determinista, funciona sin conexión) y el
// núcleo Shiftia (CP-SAT, vía el servidor, cuando está configurado). Siempre con
// vista previa: nada se aplica sin verlo; todo se deshace con Ctrl+Z.
const GEN = { desde: null, hasta: null, titulo: '', motor: 'local', previa: null, opts: { desdeHoy: true, permitirPartido: false, sinPatron: false }, nucleo: null, ocupado: false };

function irAGenerador(o) {
  GEN.desde = o.desde; GEN.hasta = o.hasta; GEN.titulo = o.titulo || 'Generar'; GEN.previa = null; GEN.refuerzo = !!o.refuerzo;
  switchTab('generador');
}
function rangoPorDefecto() {
  if (GEN.desde && GEN.hasta) return;
  GEN.desde = mondayOf(isoDia()); GEN.hasta = addDias(GEN.desde, 6); GEN.titulo = 'Generar esta semana';
}
async function comprobarNucleo() {
  if (!(typeof SRV !== 'undefined' && SRV.on)) { GEN.nucleo = { configurado: false, motivo: 'sin servidor' }; return; }
  try { const r = await api('GET', '/api/nucleo/salud'); GEN.nucleo = r.ok ? r.datos : { configurado: false }; } catch (e) { GEN.nucleo = { configurado: false }; }
}
function renderGenerador() {
  rangoPorDefecto();
  const root = $('#genRoot');
  const nDias = Math.round((fechaLocal(GEN.hasta) - fechaLocal(GEN.desde)) / 864e5) + 1;
  const hoy = isoHoy();
  const nuc = GEN.nucleo;
  root.innerHTML = `<div class="gengrid">
    <div class="genpanel">
      <span class="micro">${esc(GEN.titulo)}</span>
      <div class="row2" style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <label class="pinlbl" style="margin:0">Desde<input type="date" id="genD1" class="logininp" value="${GEN.desde}" data-libre></label>
        <label class="pinlbl" style="margin:0">Hasta<input type="date" id="genD2" class="logininp" value="${GEN.hasta}" data-libre></label>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn-mini ghost" data-rango="semana">Esta semana</button><button class="btn-mini ghost" data-rango="mes">Este mes</button><button class="btn-mini ghost" data-rango="resto">Resto del mes</button></div>
      <label class="genopt"><input type="checkbox" id="genDesdeHoy" ${GEN.opts.desdeHoy ? 'checked' : ''} data-libre> <span><b>Solo desde hoy</b> · no toca los días ya pasados</span></label>
      <label class="genopt"><input type="checkbox" id="genPatron" ${GEN.opts.sinPatron ? '' : 'checked'} data-libre> <span><b>Partir de la semana tipo</b> · las plazas fijas del grupo primero; luego se rellena lo que falte</span></label>
      <label class="genopt"><input type="checkbox" id="genPartido" ${GEN.opts.permitirPartido ? 'checked' : ''} data-libre> <span><b>Permitir partidos no declarados</b> · si falta gente, propone partidos a quien no los tiene declarados y lo avisa</span></label>
      <div class="pinlbl" style="margin-top:4px">Motor</div>
      <div class="motor">
        <button type="button" class="${GEN.motor === 'local' ? 'on' : ''}" data-motor="local"><b>Generador local</b><small>determinista, explica cada plaza, funciona sin conexión</small></button>
        <button type="button" class="${GEN.motor === 'nucleo' ? 'on' : ''}" data-motor="nucleo" ${nuc && nuc.configurado ? '' : 'disabled'}><b>Núcleo Shiftia (CP-SAT)</b><small>${nuc ? (nuc.configurado ? (nuc.ok ? 'optimización exacta vía el servidor' : 'configurado, sin respuesta ahora') : nuc.motivo === 'sin servidor' ? 'requiere el servidor de la app' : 'no configurado en el servidor') : 'comprobando…'}</small></button>
      </div>
      <p class="revsub" style="margin:0">El generador nunca quita a nadie de una casilla: solo añade. Lo que pongas a mano se respeta. ${mesCerrado(GEN.desde) ? '<b style="color:var(--warn)">El mes de inicio está cerrado para la nómina.</b>' : ''}</p>
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
  root.addEventListener('click', e => {
    const rg = e.target.closest('[data-rango]');
    if (rg) {
      const k = rg.dataset.rango;
      if (k === 'semana') { GEN.desde = mondayOf(hoy); GEN.hasta = addDias(GEN.desde, 6); GEN.titulo = 'Generar esta semana'; }
      else if (k === 'mes') { GEN.desde = est.days[0].iso; GEN.hasta = est.days[est.days.length - 1].iso; GEN.titulo = `Generar ${MESES[S.m - 1].toLowerCase()}`; }
      else { GEN.desde = hoy > est.days[0].iso ? hoy : est.days[0].iso; GEN.hasta = est.days[est.days.length - 1].iso; GEN.titulo = 'Resto del mes'; }
      GEN.previa = null; renderGenerador(); return;
    }
    const mo = e.target.closest('[data-motor]');
    if (mo && !mo.disabled) { GEN.motor = mo.dataset.motor; GEN.previa = null; renderGenerador(); return; }
    if (e.target.id === 'genPrevia') { generarPrevia(); return; }
    if (e.target.id === 'genLimpiar') { vaciarGenerado(); return; }
    if (e.target.id === 'genAplicar') { aplicarPrevia(); return; }
    const ap = e.target.closest('[data-aplicaruno]');
    if (ap) { const [iso, tid, pid] = ap.dataset.aplicaruno.split('|'); pushUndo(`poner a ${nombrePid(pid)}`); const r = asignarUI(iso, tid, pid, { origen: 'generador', permitirPartido: true, razon: 'propuesta con aviso aceptada' }); if (r.ok) { toast(`${nombrePid(pid)} añadido`, 'ok'); GEN.previa = null; renderGenerador(); } else toast(r.motivo, 'bad'); return; }
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
// genera sobre varios meses (el periodo puede cruzar de mes): un estado por mes
function generarSobre(meses, desde, hasta, simular) {
  const total = { aplicados: [], huecos: [], coberturas: [], rechazados: [] };
  for (const [k, e] of Object.entries(meses)) {
    const d1 = desde > e.days[0].iso ? desde : e.days[0].iso, d2 = hasta < e.days[e.days.length - 1].iso ? hasta : e.days[e.days.length - 1].iso;
    if (d1 > d2) continue;
    const r = generarPlanilla(S, S.staff, e, d1, d2, { simular: false, desdeIso: GEN.opts.desdeHoy ? isoHoy() : undefined, permitirPartido: GEN.opts.permitirPartido, sinPatron: GEN.opts.sinPatron });
    total.aplicados.push(...r.aplicados); total.huecos.push(...r.huecos); total.coberturas.push(...r.coberturas); total.rechazados.push(...r.rechazados);
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
    for (const e of Object.values(meses)) r.revision.push(...revisionMes(S, S.staff, e, { desde: GEN.desde, hasta: GEN.hasta }));
    GEN.previa = r;
  } catch (e) { toast('No se pudo generar: ' + (e && e.message ? e.message : e), 'bad'); }
  finally { GEN.ocupado = false; renderGenerador(); }
}
async function generarConNucleo(meses) {
  // el núcleo trabaja sobre el periodo entero; después se vuelca mes a mes
  const est0 = Object.values(meses)[0];
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
  const total = { aplicados: [], huecos: [], coberturas: [], rechazados: [], nucleo: { status: sol.status, feasible: sol.feasible, objective: sol.objective, stats: sol.stats, violations: sol.violations, relaxations: sol.relaxations } };
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
function htmlPrevia(p) {
  const porDia = {};
  for (const a of p.aplicados) (porDia[a.iso] = porDia[a.iso] || { ap: [], hu: [] }).ap.push(a);
  for (const h of p.huecos) (porDia[h.iso] = porDia[h.iso] || { ap: [], hu: [] }).hu.push(h);
  const dias = Object.keys(porDia).sort();
  const nPatron = p.aplicados.filter(a => a.origen === 'patron').length, nGen = p.aplicados.length - nPatron;
  const conAviso = p.aplicados.filter(a => a.avisos && a.avisos.length).length;
  const lp = tid => { const { localId } = partirTurno(tid); return `<span class="lpill" style="--lc:${colorLocal(localId)}">${esc((localDe(S, localId) || {}).corto || localId)}·${partirTurno(tid).franja}</span>`; };
  const fila = a => `<div class="genrow"><span class="av" style="background:${avColor(a.pid)}">${esc(initials(nombrePid(a.pid)))}</span><span class="gtxt"><b>${esc(nombrePid(a.pid))}</b><small>${esc(a.razon || '')}${a.avisos && a.avisos.length ? ' · <span style="color:var(--warn)">' + esc(a.avisos.join(', ')) + '</span>' : ''}${a.supuesto ? ' · <span style="color:var(--warn)">supuesto</span>' : ''}</small></span>${lp(a.turnoId)}</div>`;
  const hueco = h => {
    const e = p.meses[h.iso.slice(0, 7)];
    const alt = candidatosConAviso(S, S.staff, e, h.iso, h.turnoId).slice(0, 3);
    const pq = Object.entries(h.porQueNadie || {}).slice(0, 5).map(([m, quienes]) => `<b>${esc(m)}</b>: ${esc(quienes.slice(0, 4).join(', '))}${quienes.length > 4 ? ` +${quienes.length - 4}` : ''}`).join(' · ');
    return `<div class="genrow hueco"><span class="av" style="background:var(--bad)">!</span><span class="gtxt"><b>Faltan ${h.faltan} de ${h.minimo}${h.supuesto ? ' (mínimo supuesto)' : ''}</b><small class="pqn">${pq || 'nadie disponible'}</small>${alt.length ? `<small>Con aviso: ${alt.map(c => `<button class="btn-mini ghost" data-aplicaruno="${h.iso}|${h.turnoId}|${c.pid}" title="${esc(c.razones.join(' · '))}">${esc(nombreCorto(c.nombre))}</button>`).join(' ')}</small>` : ''}</span>${lp(h.turnoId)}</div>`;
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
    ${p.rechazados.length ? `<div class="warnbanner"><b>${pl(p.rechazados.length, 'plaza de la semana tipo no se pudo poner', 'plazas de la semana tipo no se pudieron poner')}</b>${p.rechazados.slice(0, 5).map(r => `${esc(nombrePid(r.pid))} en ${esc(nombreLocal(partirTurno(r.turnoId).localId))} el ${fmtDM(r.iso)}: ${esc(r.motivo)}`).join(' · ')}</div>` : ''}
    ${!p.aplicados.length && !p.huecos.length ? '<div class="genvacio">Nada que proponer: el periodo ya está completo (o queda fuera de «solo desde hoy»).</div>' : ''}
    ${dias.map(iso => `<div class="gendia"><div class="gdh">${fmtLargo(iso)}<small>${pl(porDia[iso].ap.length, 'plaza', 'plazas')}${porDia[iso].hu.length ? ` · ${pl(porDia[iso].hu.length, 'casilla corta', 'casillas cortas')}` : ''} · <button class="glink" data-irdia="${iso}">ver el día</button></small></div>${porDia[iso].hu.map(hueco).join('')}${porDia[iso].ap.map(fila).join('')}</div>`).join('')}
    <div class="genbar"><button class="btn btn-cta" id="genAplicar" ${p.aplicados.length ? '' : 'disabled'}>Aplicar ${p.aplicados.length} plaza(s)</button><span class="revsub" style="margin:0">Se puede deshacer con Ctrl+Z. Las casillas cortas quedan marcadas en rojo en Hoy, Semana y Mes.</span></div>`;
}
function aplicarPrevia() {
  const p = GEN.previa; if (!p || !p.aplicados.length) return;
  if (!confirmarSiCerrado(GEN.desde)) return;
  pushUndo(`generar ${fmtDM(GEN.desde)}–${fmtDM(GEN.hasta)}`, { otrosMeses: true });
  let n = 0, fallos = 0;
  for (const a of p.aplicados) {
    const e = estadoDeIso(a.iso, true);
    if (pidsEn(e, a.iso, a.turnoId).includes(a.pid)) continue;
    const prev = p.meses[a.iso.slice(0, 7)];
    const entry = (asignados(prev, a.iso, a.turnoId).find(x => x.pid === a.pid)) || {};
    const r = asignar(e, S, S.staff, a.iso, a.turnoId, a.pid, { origen: a.origen, razon: a.razon, supuesto: !!a.supuesto || !!entry.supuesto, permitirPartido: true, cocina: entry.cocina ? true : undefined, abre: entry.abre ? true : undefined });
    if (r.ok) n++; else fallos++;
  }
  registrarCambio(`Generador (${p.motor === 'nucleo' ? 'núcleo Shiftia' : 'local'}): ${n} plaza(s) aplicadas del ${fmtDM(GEN.desde)} al ${fmtDM(GEN.hasta)}${p.huecos.length ? ` · ${p.huecos.length} casilla(s) siguen cortas` : ''}${fallos ? ` · ${fallos} no se pudieron poner` : ''}`, 'ia');
  saveState();
  GEN.previa = null;
  toast(`${n} plaza(s) aplicadas${p.huecos.length ? ` · ${p.huecos.length} casilla(s) cortas por cubrir` : ''} · Ctrl+Z para deshacer`, p.huecos.length ? 'warn' : 'ok');
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
