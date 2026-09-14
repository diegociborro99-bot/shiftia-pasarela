// ================= EVENTOS CON REFUERZO (fútbol y otros) =================
// «Juega el Barcelona / Madrid / Elche»: al pulsarlo el encargado dice con cuántas
// personas refuerza cada local ese día. Se guarda como evento con refuerzo por
// local y franja, sube el mínimo de esas casillas y se ve en Hoy, Semana, Mes y en
// la planilla impresa. El refuerzo por defecto se recuerda por equipo (14/09).
function openEvento(opts) {
  const o = opts || {};
  const eq0 = o.equipo ? (S.equipos || []).find(x => x.id === o.equipo) : null;
  const iso0 = o.iso || isoDia();
  const html = `<span class="micro">EVENTO CON REFUERZO</span>
    <h2 class="revh2" style="margin-top:8px">${eq0 ? `Juega el ${esc(eq0.nombre)}` : 'Partido u otro evento'}</h2>
    <p class="revsub">Indica cuántas personas de refuerzo necesita cada local. El mínimo de esas casillas sube ese día y el generador y los avisos lo tienen en cuenta.</p>
    <form class="evform" id="evForm">
      <div class="eqrow" id="evEquipos">${(S.equipos || []).map(q => `<button type="button" class="eqk${eq0 && eq0.id === q.id ? ' on' : ''}" data-eq="${esc(q.id)}" style="--ec:${esc(q.color)}">⚽ ${esc(q.nombre)}</button>`).join('')}<button type="button" class="eqk${eq0 ? '' : ' on'}" data-eq="" style="--ec:var(--accent)">★ Otro evento</button></div>
      <label class="pinlbl">Nombre<input type="text" id="evNombre" class="logininp" value="${eq0 ? `Juega el ${esc(eq0.nombre)}` : ''}" placeholder="p. ej. Fiestas del barrio"></label>
      <div class="row2">
        <label class="pinlbl">Fecha<input type="date" id="evIso" class="logininp" value="${iso0}"></label>
        <label class="pinlbl">Hora (opcional)<input type="time" id="evHora" class="logininp"></label>
      </div>
      <label class="pinlbl">Franja que se refuerza<select id="evFranja" class="logininp"><option value="T">Tarde (y noche)</option><option value="M">Mañana</option><option value="MT">Mañana y tarde</option></select></label>
      <div class="pinlbl">Refuerzo por local</div>
      <div class="reflist" id="evRef">${S.locales.map(l => `<div class="refrow" style="--lc:${esc(l.color)}"><i></i><b>${esc(l.nombre)}</b><input type="number" min="0" max="9" data-ref="${l.id}" value="${eq0 && eq0.refuerzo ? (eq0.refuerzo[l.id] || 0) : 1}"></div>`).join('')}</div>
      <label class="genopt"><input type="checkbox" id="evProponer" checked> <span><b>Proponer quién viene</b> · tras guardar, el generador propone a los comodines libres para cubrir el refuerzo</span></label>
      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px"><button class="btn btn-cta" type="submit">Guardar evento</button></div>
    </form>`;
  const ov = abrirOverlay('evOvl', html, { ancho: 520 });
  let equipo = eq0 ? eq0.id : '';
  ov.querySelector('#evEquipos').addEventListener('click', e => {
    const b = e.target.closest('[data-eq]'); if (!b) return;
    equipo = b.dataset.eq;
    ov.querySelectorAll('.eqk').forEach(x => x.classList.toggle('on', x === b));
    const q = (S.equipos || []).find(x => x.id === equipo);
    ov.querySelector('#evNombre').value = q ? `Juega el ${q.nombre}` : '';
    if (q) { ov.querySelector('#evFranja').value = q.franja || 'T'; ov.querySelectorAll('[data-ref]').forEach(inp => { inp.value = (q.refuerzo && q.refuerzo[inp.dataset.ref]) || 0; }); }
  });
  ov.querySelector('#evForm').addEventListener('submit', e => {
    e.preventDefault();
    const iso = ov.querySelector('#evIso').value;
    const nombre = ov.querySelector('#evNombre').value.trim() || (equipo ? `Juega el ${equipo}` : 'Evento');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) { toast('Falta la fecha', 'warn'); return; }
    const refuerzo = {};
    ov.querySelectorAll('[data-ref]').forEach(inp => { const n = Math.max(0, Math.min(9, +inp.value || 0)); if (n) refuerzo[inp.dataset.ref] = n; });
    const ev = { id: 'ev_' + Date.now().toString(36), iso, tipo: equipo ? 'partido' : 'evento', equipo: equipo || undefined, nombre, franja: ov.querySelector('#evFranja').value, refuerzo, hora: ov.querySelector('#evHora').value || undefined, ts: Date.now() };
    pushUndo('evento con refuerzo', { eventos: true });
    (S.eventos = S.eventos || []).push(ev);
    // el refuerzo elegido queda como valor por defecto del equipo
    const q = (S.equipos || []).find(x => x.id === equipo);
    if (q) { q.refuerzo = Object.assign({}, q.refuerzo || {}); for (const l of S.locales) q.refuerzo[l.id] = refuerzo[l.id] || 0; q.franja = ev.franja; }
    registrarCambio(`Evento: ${nombre} el ${fmtDM(iso)} · refuerzo ${Object.entries(refuerzo).map(([k, n]) => nombreLocal(k) + ' +' + n).join(', ') || 'ninguno'}`, 'cambio');
    saveState(); ov.remove(); renderVistaActiva();
    toast(`${nombre}: refuerzo guardado para el ${fmtDM(iso)}`, 'ok');
    if (ov.querySelector('#evProponer').checked && Object.keys(refuerzo).length) irAGenerador({ desde: iso, hasta: iso, titulo: `Refuerzo: ${nombre}`, refuerzo: true });
  });
}
function eventosMes(e) { return (S.eventos || []).filter(x => x.iso >= e.days[0].iso && x.iso <= e.days[e.days.length - 1].iso).sort((a, b) => a.iso < b.iso ? -1 : 1); }
// ajustes de los equipos (nombre, color, refuerzo por defecto); se abre desde Ajustes
function openEquipos() {
  const pinta = () => `<span class="micro">BOTONES DE FÚTBOL</span>
    <h2 class="revh2" style="margin-top:8px">Equipos y refuerzo por defecto</h2>
    <p class="revsub">Cada botón guarda el último refuerzo que usaste. Puedes añadir más equipos o eventos habituales.</p>
    <div id="eqLista">${(S.equipos || []).map((q, i) => `<div class="festrow f-manual" style="border-left-color:${esc(q.color)}"><span class="festinfo"><b>${esc(q.nombre)}</b><small>${Object.entries(q.refuerzo || {}).filter(([, n]) => n > 0).map(([k, n]) => nombreLocal(k) + ' +' + n).join(' · ') || 'sin refuerzo por defecto'} · ${q.franja === 'M' ? 'mañana' : q.franja === 'MT' ? 'mañana y tarde' : 'tarde'}</small></span><input type="color" value="${esc(q.color)}" data-eqcolor="${i}" data-libre title="Color"><button class="festrm" data-eqrm="${i}" aria-label="Quitar">✕</button></div>`).join('')}</div>
    <div style="display:flex;gap:8px;align-items:flex-end;margin-top:10px"><label class="pinlbl" style="flex:1;margin:0">Nuevo equipo<input type="text" id="eqNuevo" class="logininp" placeholder="p. ej. Selección" data-libre></label><button class="btn btn-cta" id="eqAdd" type="button">Añadir</button></div>`;
  const ov = abrirOverlay('eqOvl', pinta(), { ancho: 520 });
  ov.addEventListener('click', e => {
    const rm = e.target.closest('[data-eqrm]');
    if (rm) { const q = S.equipos.splice(+rm.dataset.eqrm, 1)[0]; registrarCambio(`Equipo quitado: ${q.nombre}`, 'cambio'); saveState(); ov.querySelector('.ovcard').innerHTML = '<button class="ovx" data-ovx aria-label="Cerrar">✕</button>' + pinta(); renderVistaActiva(); return; }
    if (e.target.id === 'eqAdd') {
      const n = ov.querySelector('#eqNuevo').value.trim(); if (!n) return;
      S.equipos.push({ id: n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-'), nombre: n, corto: n, color: '#1a5a96', refuerzo: {}, franja: 'T' });
      registrarCambio(`Equipo añadido: ${n}`, 'cambio'); saveState();
      ov.querySelector('.ovcard').innerHTML = '<button class="ovx" data-ovx aria-label="Cerrar">✕</button>' + pinta(); renderVistaActiva();
    }
  });
  ov.addEventListener('change', e => { const c = e.target.closest('[data-eqcolor]'); if (c) { S.equipos[+c.dataset.eqcolor].color = c.value; saveState(); renderVistaActiva(); } });
}
