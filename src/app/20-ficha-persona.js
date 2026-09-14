// ================= FICHA DE PERSONA =================
// Todas las condiciones de una persona, editables al vuelo: cada toque guarda
// (saveState) y deja una línea breve en el historial. Los campos llevan
// data-libre para que el overlay no pregunte «¿cambios sin guardar?» al cerrar:
// no hay nada sin guardar.
function openFicha(pid) {
  const p = personaDeId(pid); if (!p) return;
  if (typeof closePicker === 'function') closePicker();
  // campos que la ficha da por existentes (estados guardados con esquemas viejos)
  p.locales = p.locales || []; p.franjas = p.franjas || ['M', 'T']; p.libra = p.libra || []; p.partido = p.partido || { dias: [] }; p.partido.dias = p.partido.dias || [];
  p.cocina = p.cocina || { titular: [], reserva: [], soloDias: [] }; p.cocina.titular = p.cocina.titular || []; p.cocina.reserva = p.cocina.reserva || []; p.cocina.soloDias = p.cocina.soloDias || [];
  p.abre = p.abre || {}; p.noAbre = p.noAbre || []; p.nuncaCon = p.nuncaCon || []; p.cubreA = p.cubreA || []; p.vetos = p.vetos || [];
  p.contrato = p.contrato || { horasSemana: null }; p.ausencias = p.ausencias || []; p.prefs = p.prefs || {}; p.supuestos = p.supuestos || [];

  let tocada = false, undoHecho = false;
  // un registro por cambio; deshacer con una sola instantánea por ficha abierta
  const guarda = (campo, mut) => {
    if (!undoHecho) { pushUndo(`ficha de ${p.nombre}`, { staff: true }); undoHecho = true; }
    mut(p);
    tocada = true;
    registrarCambio(`Ficha de ${p.nombre}: ${campo}`, 'cambio');
    saveState();
  };
  const alterna = (arr, v) => { const i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v); if (typeof v === 'number') arr.sort((a, b) => a - b); };

  const ov = abrirOverlay('fichaOvl', `<div class="fichead">
      <span class="fichav" id="fichAv" style="background:${avColor(p.id)}">${esc(initials(p.nombre))}</span>
      <span style="flex:1;min-width:0">
        <input type="text" class="fichnombre" id="fichNombre" data-libre value="${esc(p.nombre)}" aria-label="Nombre" spellcheck="false">
        <span class="sub" id="fichSub"></span>
      </span></div>
    <div class="locgrid2 fichtop">
      <label class="pinlbl">Puesto<select class="logininp" id="fichPuesto" data-libre>${PUESTOS.map(x => `<option value="${x.id}"${p.puesto === x.id ? ' selected' : ''}>${esc(x.label)}</option>`).join('')}</select></label>
      <div><div class="pinlbl">Color en la planilla</div><div class="colorset" id="fichColores"></div></div>
    </div>
    <div id="fichBody"></div>
    <div class="fichfoot"><button type="button" class="btn btn-ghost" data-baja>Quitar del equipo</button><button type="button" class="btn btn-cta" data-ovx>Listo</button></div>`, { ancho: 640 });

  const body = ov.querySelector('#fichBody');
  const locChips = (sel, attr, opts) => S.locales.map(l => `<button type="button" class="locchip${sel.includes(l.id) ? ' on' : ''}" data-${attr}="${esc(l.id)}" data-libre style="--lc:${esc(l.color)}"><i class="ldot"></i>${esc(opts && opts.corto ? l.corto : l.nombre)}</button>`).join('');
  const franjaChips = (sel, attr) => FRANJAS.map(f => `<button type="button" class="segk${sel.includes(f) ? ' on' : ''}" data-${attr}="${f}" data-libre>${FRANJA_LBL[f]}</button>`).join('');
  const chk = (attr, on, txt) => `<label class="singchk chkrow"><input type="checkbox" data-chk="${attr}" data-libre${on ? ' checked' : ''}> ${txt}</label>`;
  const selPersonas = (id, excl) => `<select class="logininp" id="${id}" data-libre><option value="">— elegir persona —</option>${S.staff.filter(q => q.id !== p.id && !(excl || []).includes(q.id)).map(q => `<option value="${esc(q.id)}">${esc(q.nombre)}</option>`).join('')}</select>`;
  const selDia = (attr, sel) => `<select class="logininp" ${attr} data-libre><option value="">cualquier día</option>${TODOS.map(d => `<option value="${d}"${+sel === d ? ' selected' : ''}>${esc(DIAS_L[d])}</option>`).join('')}</select>`;
  const selTurno = (attr, sel) => `<select class="logininp" ${attr} data-libre><option value="">cualquier turno</option>${turnosDe(S).map(t => `<option value="${esc(t.id)}"${sel === t.id ? ' selected' : ''}>${esc(lblTurno(t.id))}</option>`).join('')}</select>`;
  const sec = (id, titulo, sub, html) => `<details class="pmore fsec" data-sec="${id}" open><summary>${esc(titulo)}${sub ? ` <small>${esc(sub)}</small>` : ''}</summary><div class="fsecb">${html}</div></details>`;
  const fila = (info, sub, ctrl, rmAttr) => `<div class="festrow"><span class="festinfo"><b>${info}</b>${sub ? `<small>${sub}</small>` : ''}</span>${ctrl || ''}<button type="button" class="festrm" ${rmAttr} aria-label="Quitar">✕</button></div>`;

  const pinta = () => {
    const abiertas = {}; body.querySelectorAll('details[data-sec]').forEach(d => { abiertas[d.dataset.sec] = d.open; });
    const c = p.cocina, pd = p.partido;
    let h = '';
    h += sec('donde', 'Dónde y cuándo', 'locales, franjas, libra y partido',
      `<div class="pinlbl">Locales <small>(ninguno = cualquiera, comodín)</small></div><div class="locset">${locChips(p.locales, 'tloc')}</div>
       <div class="pinlbl">Franjas</div><div class="segrow">${franjaChips(p.franjas, 'tfranja')}</div>
       <div class="pinlbl">Libra</div><div class="dowset">${dowSet(p.libra, 'tlibra')}</div>
       ${chk('libreVariable', !!p.libreVariable, 'Día libre variable (se decide cada semana)')}
       <div class="pinlbl">Hace partido (mañana y tarde el mismo día) los…</div><div class="dowset">${dowSet(pd.dias, 'tpartido')}</div>
       ${chk('partidoSiempre', !!pd.siempre, 'Siempre partido')}`);
    h += sec('cocina', 'Cocina', c.nunca ? 'nunca cocina' : `${c.titular.length + c.reserva.length ? 'titular o reserva' : p.puesto === 'cocina' ? 'por su puesto' : 'no cocina'}`,
      `<div class="pinlbl">Titular de cocina en</div><div class="locset">${locChips(c.titular, 'tcoct')}</div>
       <div class="pinlbl">Reserva de cocina en</div><div class="locset">${locChips(c.reserva, 'tcocr')}</div>
       <div class="pinlbl">Solo cocina estos días <small>(ninguno = cualquiera)</small></div><div class="dowset">${dowSet(c.soloDias, 'tcocd')}</div>
       ${chk('cocinaNunca', !!c.nunca, 'Nunca cocina')}`);
    h += sec('abre', 'Abre el local', 'quién sale primero',
      S.locales.map(l => `<div class="abrerow" style="--lc:${esc(l.color)}"><span class="abrenm"><i class="ldot"></i>${esc(l.nombre)}</span><span class="segrow" style="margin:0">${FRANJAS.map(f => `<button type="button" class="segk${((p.abre[l.id] || []).includes(f)) ? ' on' : ''}" data-tabre="${esc(l.id)}|${f}" data-libre>${FRANJA_LBL[f]}</button>`).join('')}</span></div>`).join('') +
      `<div class="pinlbl">No abre nunca en</div><div class="locset">${locChips(p.noAbre, 'tnoabre')}</div>`);
    h += sec('reglas', 'Reglas con otras personas', `${p.nuncaCon.length ? p.nuncaCon.length + ' incompatibles' : 'sin incompatibles'} · cubre a ${p.cubreA.length}`,
      `<div class="pinlbl">Nunca coincide con</div>
       <div class="chiprow">${p.nuncaCon.map((q, i) => `<span class="tchip warn"><i>${esc(nombrePid(q))}</i><button type="button" class="festrm" data-rmnunca="${i}" aria-label="Quitar">✕</button></span>`).join('') || '<span class="festvacio">Con nadie en especial.</span>'}</div>
       <span class="addrow">${selPersonas('fNuncaSel', p.nuncaCon)}<button type="button" class="btn-mini" data-addnunca>Añadir</button></span>
       <div class="pinlbl">Cubre a <small>(ocupa su sitio cuando falta)</small></div>
       ${p.cubreA.map((cb, i) => fila(esc(nombrePid(cb.pid)), '', `<span class="cubrectl">${selDia(`data-cubred="${i}"`, cb.dow)}${selTurno(`data-cubret="${i}"`, cb.turnoId)}</span>`, `data-rmcubre="${i}"`)).join('') || '<div class="festvacio">No cubre a nadie en concreto.</div>'}
       <span class="addrow addrow3">${selPersonas('fCubreP')}${selDia('id="fCubreD"')}${selTurno('id="fCubreT"')}<button type="button" class="btn-mini" data-addcubre>Añadir</button></span>`);
    h += sec('vetos', 'Vetos', p.vetos.length ? `${p.vetos.length} franja(s) que no hace` : 'ninguno',
      (p.vetos.map((v, i) => fila(`<i class="ldot" style="--lc:${esc(colorLocal(v.localId))}"></i>${esc(nombreLocal(v.localId))}`, `no hace ${v.franja === 'M' ? 'mañanas' : 'tardes'}`, '', `data-rmveto="${i}"`)).join('') || '<div class="festvacio">Sin vetos: puede ir a cualquier franja de sus locales.</div>') +
      `<span class="addrow"><select class="logininp" id="fVetoL" data-libre>${S.locales.map(l => `<option value="${esc(l.id)}">${esc(l.nombre)}</option>`).join('')}</select><select class="logininp" id="fVetoF" data-libre>${FRANJAS.map(f => `<option value="${f}">${FRANJA_LBL[f]}s</option>`).join('')}</select><button type="button" class="btn-mini" data-addveto>Añadir veto</button></span>`);
    h += sec('contrato', 'Contrato', p.contrato.horasSemana ? `${+p.contrato.horasSemana} h/semana` : 'sin horas fijadas',
      `<label class="pinlbl">Horas por semana <small>(el contador de horas compara con esto)</small><input type="number" class="logininp" min="0" max="60" step="0.5" inputmode="decimal" data-num="horasSemana" data-libre value="${p.contrato.horasSemana !== null && p.contrato.horasSemana !== undefined ? esc(p.contrato.horasSemana) : ''}" placeholder="sin fijar"></label>`);
    h += sec('prefs', 'Preferencias', 'no bloquean: el generador las respeta al priorizar',
      `<div class="pinlbl">Prefiere no trabajar los…</div><div class="dowset">${dowSet(p.prefs.evitaDows || [], 'tevita')}</div>
       <label class="pinlbl">Criterio personal<input type="text" class="logininp" data-txt="prefsNota" data-libre value="${esc(p.prefs.nota || '')}" placeholder="p. ej. concilia los lunes"></label>`);
    h += sec('aus', 'Ausencias', p.ausencias.length ? `${p.ausencias.length} registrada(s)` : 'ninguna',
      (p.ausencias.map((a, i) => fila(`<span class="abschip a-${esc(a.tipo)}">${esc((AUS_LBL[a.tipo] || { label: a.tipo }).label)}</span> del ${fmtDM(a.desde)}${a.hasta ? (a.hasta !== a.desde ? ' al ' + fmtDM(a.hasta) : '') : ' sin fecha de fin'}`, esc(a.detalle || ''), '', `data-rmaus="${i}"`)).join('') || '<div class="festvacio">Sin ausencias registradas.</div>') +
      `<div class="absform ausalta" style="display:grid">
        <div class="row2"><span><label>Tipo</label><select id="fAusTipo" data-libre>${TIPOS_AUSENCIA.map(t => `<option value="${t.id}"${t.id === 'VAC' ? ' selected' : ''}>${esc(t.label)}</option>`).join('')}</select></span>
        <span><label>Detalle</label><input type="text" id="fAusDet" data-libre placeholder="opcional"></span></div>
        <div class="row2"><span><label>Desde</label><input type="date" id="fAusD1" data-libre value="${isoHoy()}"></span>
        <span><label>Hasta <small>(en blanco: un día; una baja, sin fin)</small></label><input type="date" id="fAusD2" data-libre value="${isoHoy()}"></span></div>
        <div class="bar"><button type="button" class="btn-mini" data-addaus>Guardar ausencia</button></div></div>`);
    h += sec('notas', 'Notas y supuestos', p.supuestos.length ? `${p.supuestos.length} supuesto(s) por confirmar` : 'sin supuestos',
      `<label class="pinlbl">Nota <small>(lo que hay que saber de esta persona, con sus palabras)</small><textarea class="logininp" rows="3" data-txt="nota" data-libre>${esc(p.nota || '')}</textarea></label>
       <div class="pinlbl">Supuestos <small>(decisiones de Highkey pendientes de confirmar con el grupo)</small></div>
       ${p.supuestos.map((s, i) => fila(`<span class="ficb warn">SUPUESTO</span> ${esc(s)}`, '', '', `data-rmsup="${i}"`)).join('') || '<div class="festvacio">Nada por confirmar.</div>'}
       <span class="addrow"><input type="text" class="logininp" id="fSupTxt" data-libre placeholder="p. ej. partido los viernes (decisión Highkey)"><button type="button" class="btn-mini" data-addsup>Añadir</button></span>`);
    body.innerHTML = h;
    for (const d of body.querySelectorAll('details[data-sec]')) if (abiertas[d.dataset.sec] !== undefined) d.open = abiertas[d.dataset.sec];
    pintaCabecera();
  };
  const pintaCabecera = () => {
    ov.querySelector('#fichAv').style.background = avColor(p.id);
    ov.querySelector('#fichAv').textContent = initials(p.nombre);
    const locs = p.locales.length ? p.locales.map(nombreLocal).join(' y ') : 'cualquier local (comodín)';
    ov.querySelector('#fichSub').textContent = `${lblPuesto(p.puesto)} · ${locs} · ${lblFranjas(p.franjas).toLowerCase()}${deBaja(p) ? ' · de baja' : ''}`;
    ov.querySelector('#fichColores').innerHTML = PALETA_PERSONAS.map((col, i) => {
      const otros = S.staff.filter(q => q.id !== p.id && q.color === i).map(q => q.nombre);
      return `<button type="button" class="colsw${p.color === i ? ' on' : ''}${otros.length ? ' usado' : ''}" data-color="${i}" data-libre style="--pc:${col}" title="${otros.length ? 'Lo usa ' + esc(otros.join(', ')) : 'Libre'}" aria-label="Color ${i + 1}"></button>`;
    }).join('');
  };
  pinta();

  ov.querySelector('#fichNombre').addEventListener('change', e => {
    const v = e.target.value.trim();
    if (!v) { e.target.value = p.nombre; return; }
    if (v === p.nombre) return;
    const antes = p.nombre;
    guarda(`nombre «${antes}» → «${v}»`, x => { x.nombre = v; });
    pintaCabecera();
  });
  ov.querySelector('#fichPuesto').addEventListener('change', e => {
    guarda(`puesto ${lblPuesto(e.target.value).toLowerCase()}`, x => { x.puesto = e.target.value; if (x.puesto === 'comodin') x.comodin = true; });
    pinta();
  });
  ov.addEventListener('click', e => {
    const t = e.target;
    if (t === ov || t.closest('[data-ovx]')) { cerrar(); return; }
    if (t.closest('[data-baja]')) { if (bajaPersona(p.id)) { tocada = false; ov.remove(); } return; }
    const cs = t.closest('[data-color]');
    if (cs) { guarda('color', x => { x.color = +cs.dataset.color; }); pintaCabecera(); return; }
    const d = t.dataset || {};
    const el = t.closest('[data-tloc],[data-tfranja],[data-tlibra],[data-tpartido],[data-tcoct],[data-tcocr],[data-tcocd],[data-tabre],[data-tnoabre],[data-tevita],[data-rmnunca],[data-addnunca],[data-rmcubre],[data-addcubre],[data-rmveto],[data-addveto],[data-rmaus],[data-addaus],[data-rmsup],[data-addsup]');
    if (!el) return;
    const ds = el.dataset;
    if (ds.tloc !== undefined) { guarda(`local ${nombreLocal(ds.tloc)} ${p.locales.includes(ds.tloc) ? 'quitado' : 'añadido'}`, x => alterna(x.locales, ds.tloc)); pinta(); return; }
    if (ds.tfranja !== undefined) {
      if (p.franjas.length === 1 && p.franjas[0] === ds.tfranja) { toast('Tiene que hacer al menos una franja', 'warn'); return; }
      guarda(`franjas → ${lblFranjas(p.franjas.includes(ds.tfranja) ? p.franjas.filter(f => f !== ds.tfranja) : p.franjas.concat(ds.tfranja)).toLowerCase()}`, x => { alterna(x.franjas, ds.tfranja); x.franjas.sort(); }); pinta(); return;
    }
    if (ds.tlibra !== undefined) { guarda(`libra ${lblDowPl(+ds.tlibra)} ${p.libra.includes(+ds.tlibra) ? 'quitado' : 'añadido'}`, x => alterna(x.libra, +ds.tlibra)); pinta(); return; }
    if (ds.tpartido !== undefined) { guarda(`partido ${lblDowPl(+ds.tpartido)} ${p.partido.dias.includes(+ds.tpartido) ? 'quitado' : 'añadido'}`, x => alterna(x.partido.dias, +ds.tpartido)); pinta(); return; }
    if (ds.tcoct !== undefined) { guarda(`cocina titular en ${nombreLocal(ds.tcoct)} ${p.cocina.titular.includes(ds.tcoct) ? 'quitada' : 'añadida'}`, x => { alterna(x.cocina.titular, ds.tcoct); if (x.cocina.titular.includes(ds.tcoct)) { const i = x.cocina.reserva.indexOf(ds.tcoct); if (i >= 0) x.cocina.reserva.splice(i, 1); } }); pinta(); return; }
    if (ds.tcocr !== undefined) { guarda(`cocina reserva en ${nombreLocal(ds.tcocr)} ${p.cocina.reserva.includes(ds.tcocr) ? 'quitada' : 'añadida'}`, x => { alterna(x.cocina.reserva, ds.tcocr); if (x.cocina.reserva.includes(ds.tcocr)) { const i = x.cocina.titular.indexOf(ds.tcocr); if (i >= 0) x.cocina.titular.splice(i, 1); } }); pinta(); return; }
    if (ds.tcocd !== undefined) { guarda(`cocina solo ${lblDowPl(+ds.tcocd)} ${p.cocina.soloDias.includes(+ds.tcocd) ? 'quitado' : 'añadido'}`, x => alterna(x.cocina.soloDias, +ds.tcocd)); pinta(); return; }
    if (ds.tabre !== undefined) {
      const [lid, f] = ds.tabre.split('|');
      guarda(`abre ${nombreLocal(lid)} ${FRANJA_LBL[f].toLowerCase()} ${(p.abre[lid] || []).includes(f) ? 'quitado' : 'añadido'}`, x => { x.abre[lid] = x.abre[lid] || []; alterna(x.abre[lid], f); x.abre[lid].sort(); if (!x.abre[lid].length) delete x.abre[lid]; });
      pinta(); return;
    }
    if (ds.tnoabre !== undefined) { guarda(`no abre en ${nombreLocal(ds.tnoabre)} ${p.noAbre.includes(ds.tnoabre) ? 'quitado' : 'añadido'}`, x => alterna(x.noAbre, ds.tnoabre)); pinta(); return; }
    if (ds.tevita !== undefined) { guarda(`prefiere no ${lblDowPl(+ds.tevita)} ${(p.prefs.evitaDows || []).includes(+ds.tevita) ? 'quitado' : 'añadido'}`, x => { x.prefs.evitaDows = x.prefs.evitaDows || []; alterna(x.prefs.evitaDows, +ds.tevita); if (!x.prefs.evitaDows.length) delete x.prefs.evitaDows; }); pinta(); return; }
    if (ds.rmnunca !== undefined) { const q = p.nuncaCon[+ds.rmnunca]; guarda(`ya puede coincidir con ${nombrePid(q)}`, x => x.nuncaCon.splice(+ds.rmnunca, 1)); pinta(); return; }
    if (ds.addnunca !== undefined) {
      const q = ov.querySelector('#fNuncaSel').value; if (!q) { toast('Elige a alguien', 'warn'); return; }
      guarda(`nunca con ${nombrePid(q)}`, x => { if (!x.nuncaCon.includes(q)) x.nuncaCon.push(q); }); pinta(); return;
    }
    if (ds.rmcubre !== undefined) { const cb = p.cubreA[+ds.rmcubre]; guarda(`ya no cubre a ${nombrePid(cb.pid)}`, x => x.cubreA.splice(+ds.rmcubre, 1)); pinta(); return; }
    if (ds.addcubre !== undefined) {
      const q = ov.querySelector('#fCubreP').value; if (!q) { toast('Elige a quién cubre', 'warn'); return; }
      const dow = +ov.querySelector('#fCubreD').value || 0, tid = ov.querySelector('#fCubreT').value;
      const cb = { pid: q }; if (dow) cb.dow = dow; if (tid) cb.turnoId = tid;
      guarda(`cubre a ${nombrePid(q)}${dow ? ' ' + DOW_PL[dow] : ''}${tid ? ' en ' + lblTurno(tid) : ''}`, x => x.cubreA.push(cb)); pinta(); return;
    }
    if (ds.rmveto !== undefined) { const v = p.vetos[+ds.rmveto]; guarda(`veto quitado: ${nombreLocal(v.localId)} ${v.franja === 'M' ? 'mañanas' : 'tardes'}`, x => x.vetos.splice(+ds.rmveto, 1)); pinta(); return; }
    if (ds.addveto !== undefined) {
      const lid = ov.querySelector('#fVetoL').value, f = ov.querySelector('#fVetoF').value;
      if (p.vetos.some(v => v.localId === lid && v.franja === f)) { toast('Ese veto ya está', 'warn'); return; }
      guarda(`no hace ${f === 'M' ? 'mañanas' : 'tardes'} en ${nombreLocal(lid)}`, x => x.vetos.push({ localId: lid, franja: f })); pinta(); return;
    }
    if (ds.rmaus !== undefined) { if (quitarAusenciaUI(p.id, +ds.rmaus)) { tocada = true; pinta(); toast('Ausencia retirada', 'warn'); } return; }
    if (ds.addaus !== undefined) {
      const tipo = ov.querySelector('#fAusTipo').value, desde = ov.querySelector('#fAusD1').value; let hasta = ov.querySelector('#fAusD2').value;
      if (tipo !== 'BAJ' && !hasta) hasta = desde;
      if (altaAusenciaUI(p.id, { tipo, desde, hasta: hasta || undefined, detalle: ov.querySelector('#fAusDet').value.trim() })) { tocada = true; pinta(); }
      return;
    }
    if (ds.rmsup !== undefined) { const s = p.supuestos[+ds.rmsup]; guarda(`supuesto confirmado o retirado: ${s}`, x => x.supuestos.splice(+ds.rmsup, 1)); pinta(); return; }
    if (ds.addsup !== undefined) {
      const s = ov.querySelector('#fSupTxt').value.trim(); if (!s) { toast('Escribe el supuesto', 'warn'); return; }
      guarda(`supuesto añadido: ${s}`, x => x.supuestos.push(s)); pinta();
    }
  });
  ov.addEventListener('change', e => {
    const t = e.target; const ds = t.dataset || {};
    if (ds.chk) {
      const on = t.checked;
      if (ds.chk === 'libreVariable') guarda(`libre variable ${on ? 'sí' : 'no'}`, x => { if (on) x.libreVariable = true; else delete x.libreVariable; });
      else if (ds.chk === 'partidoSiempre') guarda(`siempre partido ${on ? 'sí' : 'no'}`, x => { if (on) x.partido.siempre = true; else delete x.partido.siempre; });
      else if (ds.chk === 'cocinaNunca') guarda(`nunca cocina ${on ? 'sí' : 'no'}`, x => { if (on) x.cocina.nunca = true; else delete x.cocina.nunca; });
      pinta(); return;
    }
    if (ds.num === 'horasSemana') {
      const v = t.value === '' ? null : Math.max(0, +t.value || 0);
      guarda(`contrato ${v ? v + ' h/semana' : 'sin horas'}`, x => { x.contrato.horasSemana = v; }); pinta(); return;
    }
    if (ds.txt === 'nota') { guarda('nota', x => { x.nota = t.value.trim(); }); return; }
    if (ds.txt === 'prefsNota') { guarda('criterio personal', x => { const v = t.value.trim(); if (v) x.prefs.nota = v; else delete x.prefs.nota; }); return; }
    if (ds.cubred !== undefined) { const cb = p.cubreA[+ds.cubred]; if (!cb) return; guarda(`cubre a ${nombrePid(cb.pid)}: día`, x => { const v = +t.value; if (v) x.cubreA[+ds.cubred].dow = v; else delete x.cubreA[+ds.cubred].dow; }); return; }
    if (ds.cubret !== undefined) { const cb = p.cubreA[+ds.cubret]; if (!cb) return; guarda(`cubre a ${nombrePid(cb.pid)}: turno`, x => { if (t.value) x.cubreA[+ds.cubret].turnoId = t.value; else delete x.cubreA[+ds.cubret].turnoId; }); return; }
    if (t.id === 'fAusTipo') { const h = ov.querySelector('#fAusD2'); h.value = t.value === 'BAJ' ? '' : (h.value || ov.querySelector('#fAusD1').value); }
  });
  let cerrado = false;
  // el listener de abrirOverlay (✕ y fondo) ya ha quitado el overlay cuando llega este: se repinta una sola vez
  function cerrar() {
    if (cerrado) return; cerrado = true;
    if (ov.isConnected) ov.remove();
    if (tocada) repintarTrasEquipo(); else renderEquipo();
  }
}
