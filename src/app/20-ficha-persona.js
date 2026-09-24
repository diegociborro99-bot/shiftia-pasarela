// ================= FICHA DE PERSONA =================
// Todas las condiciones de una persona, editables al vuelo: cada toque guarda
// (saveState) y deja una línea breve en el historial. Los campos llevan
// data-libre para que el overlay no pregunte «¿cambios sin guardar?» al cerrar:
// no hay nada sin guardar.
function openFicha(pid, opts) {
  const p = personaDeId(pid); if (!p) return;
  if (typeof closePicker === 'function') closePicker();
  // Día libre puntual (24/09, reunión: «aunque lo hayamos puesto en equipo, al generar no lo
  // respeta»): el bloque enseña SIEMPRE la semana a la que se refiere, con ‹ › para cambiarla, y
  // los cambios guardados para otras semanas. De partida, la semana que se está planificando; al
  // volver a abrirse (tras deshacer o un cambio de otro usuario), la que se estaba mirando. Nunca
  // una semana ya pasada (24/09, revisión): ese cambio no llegaba a ningún sitio y se borraba solo.
  const lpMin = lunesDe(isoHoy());
  let lpSem = (opts && opts.lpSem) || semanaPlanificada();
  if (lpSem < lpMin) lpSem = lpMin;
  const lpDias = q => (libraPuntualDe(q, lpSem) || { dias: [] }).dias;
  const lpTxt = q => {
    const d = lpDias(q);
    const sem = `semana del ${fmtDDMM(lpSem)}`;
    return d.length ? `La ${sem} libra ${d.map(x => lblDowPl(x)).join(' y ')} en vez de ${(q.libra || []).length ? q.libra.map(x => lblDowPl(x)).join(' y ') : 'nada'}.` : `Sin cambios en la ${sem}: libra ${(q.libra || []).length ? q.libra.map(x => lblDowPl(x)).join(' y ') : 'como siempre'}.`;
  };
  const lpOtras = q => librasPuntuales(q).filter(x => x.semana !== lpSem && x.dias.length && x.semana >= lunesDe(isoHoy()));
  // campos que la ficha da por existentes: los pone migrarEstado al cargar (normalizarFicha); aquí solo
  // hacen falta para quien se ha dado de alta en esta sesión (revisión F3)
  normalizarFicha(p);

  let tocada = false, undoHecho = false;
  // un registro por cambio; deshacer con una sola instantánea por ficha abierta
  const guarda = (campo, mut, tipo) => {
    if (!undoHecho) { pushUndo(`ficha de ${p.nombre}`, { staff: true }); undoHecho = true; }
    mut(p);
    tocada = true;
    registrarCambio(`Ficha de ${p.nombre}: ${campo}`, tipo || 'cambio');
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
    <div class="fichfoot"><button type="button" class="btn btn-ghost" data-baja>Quitar del equipo</button><button type="button" class="btn btn-cta" data-ovx>Listo</button></div>`, { ancho: 640, vigila: 'staff:' + p.id, reabrir: () => openFicha(p.id, { lpSem }) });

  const body = ov.querySelector('#fichBody');
  const locChips = (sel, attr, opts) => S.locales.map(l => `<button type="button" class="locchip${sel.includes(l.id) ? ' on' : ''}" data-${attr}="${esc(l.id)}" data-libre style="--lc:${esc(l.color)}"><i class="ldot"></i>${esc(opts && opts.corto ? l.corto : l.nombre)}</button>`).join('');
  const franjaChips = (sel, attr) => FRANJAS.map(f => `<button type="button" class="segk${sel.includes(f) ? ' on' : ''}" data-${attr}="${f}" data-libre>${FRANJA_LBL[f]}</button>`).join('');
  const chk = (attr, on, txt) => `<label class="singchk chkrow"><input type="checkbox" data-chk="${attr}" data-libre${on ? ' checked' : ''}> ${txt}</label>`;
  const selPersonas = (id, excl) => `<select class="logininp" id="${id}" data-libre><option value="">— elegir persona —</option>${S.staff.filter(q => q.id !== p.id && !(excl || []).includes(q.id)).map(q => `<option value="${esc(q.id)}">${esc(q.nombre)}</option>`).join('')}</select>`;
  const selDia = (attr, sel) => `<select class="logininp" ${attr} data-libre><option value="">cualquier día</option>${TODOS.map(d => `<option value="${d}"${+sel === d ? ' selected' : ''}>${esc(DIAS_L[d])}</option>`).join('')}</select>`;
  const selTurno = (attr, sel) => `<select class="logininp" ${attr} data-libre><option value="">cualquier turno</option>${turnosDe(S).map(t => `<option value="${esc(t.id)}"${sel === t.id ? ' selected' : ''}>${esc(lblTurno(t.id))}</option>`).join('')}</select>`;
  const sec = (id, titulo, sub, html) => `<details class="pmore fsec" data-sec="${id}" open><summary>${esc(titulo)}${sub ? ` <small>${esc(sub)}</small>` : ''}</summary><div class="fsecb">${html}</div></details>`;
  const fila = (info, sub, ctrl, rmAttr) => `<div class="festrow"><span class="festinfo"><b>${info}</b>${sub ? `<small>${sub}</small>` : ''}</span>${ctrl || ''}<button type="button" class="festrm" ${rmAttr} aria-label="Quitar">✕</button></div>`;
  // Cada característica (CARACTERISTICAS del modelo) va en un bloque con su
  // interruptor arriba a la derecha: apagada, el generador no la mira, pero se
  // sigue editando. Escribe p.inactivas.
  const act = k => caracteristicaActiva(p, k);
  const car = (k, titulo, sub, html, opts) => {
    const on = act(k), o = opts || {};
    return `<div class="fcar${on ? '' : ' off'}" data-car="${k}">
      <div class="fcarh"><span class="fcart">${titulo ? esc(titulo) : ''}${o.nueva ? ' <span class="condnew">NUEVA</span>' : ''}${sub ? ` <small>${sub}</small>` : ''}</span>
        <label class="tgl" title="${on ? 'Activa: el generador la tiene en cuenta' : 'Desactivada: el generador no la tiene en cuenta'}"><input type="checkbox" role="switch" aria-checked="${on ? 'true' : 'false'}" aria-label="«${esc(lblCaracteristica(k))}» activa" data-car-tgl="${k}" data-libre${on ? ' checked' : ''}><span class="tglk"></span><span class="tgll">${on ? 'Activa' : 'Apagada'}</span></label></div>
      <div class="fcarb">${html}</div>
      ${on ? '' : '<p class="fcaroff">Desactivada: el generador no la tiene en cuenta. Se puede seguir editando y volver a activar cuando haga falta.</p>'}</div>`;
  };
  const subOff = (k, sub) => (act(k) ? '' : 'desactivada · ') + sub;

  const pinta = () => {
    const abiertas = {}; body.querySelectorAll('details[data-sec]').forEach(d => { abiertas[d.dataset.sec] = d.open; });
    const c = p.cocina, pd = p.partido;
    let h = '';
    h += sec('donde', 'Dónde y cuándo', 'locales, franjas, libra y partido',
      car('locales', 'Locales', '(ninguno = cualquiera, sin local fijo)', `<div class="locset">${locChips(p.locales, 'tloc')}</div>`) +
      car('franjas', 'Franjas', '', `<div class="segrow">${franjaChips(p.franjas, 'tfranja')}</div>`) +
      car('libra', 'Libra', '', `<div class="dowset">${dowSet(p.libra, 'tlibra')}</div>
       ${chk('libreVariable', !!p.libreVariable, 'Día libre variable (se decide cada semana)')}
       ${chk('standby', !!p.standby, 'En standby: no entra en la planilla hasta confirmar sus condiciones')}
       <div class="lpunt">
         <div class="pinlbl">Esta semana libra otro día <small>(solo esa semana; después vuelve a su día de siempre. Si la semana ya está en la planilla, se cambia al momento)</small></div>
         <div class="lpsem"><button type="button" class="mbtn" data-lpsem="-1" aria-label="Semana anterior"${lpSem <= lpMin ? ' disabled title="Las semanas pasadas no se cambian"' : ''}>‹</button><b class="lpsemlbl" data-lunes="${lpSem}">Semana del ${fmtDDMM(lpSem)} al ${fmtDDMM(addDias(lpSem, 6))}</b><button type="button" class="mbtn" data-lpsem="1" aria-label="Semana siguiente">›</button></div>
         <div class="dowset">${dowSet(lpDias(p), 'tlpunt')}</div>
         <div class="lpuntpie">${lpTxt(p)}${lpDias(p).length ? ' <button type="button" class="btn-mini ghost" data-lpoff>Quitar</button>' : ''}</div>
         ${lpOtras(p).length ? `<div class="lpotras">Guardado para otras semanas: ${lpOtras(p).map(x => `<span class="lpotra"><button type="button" class="glink" data-lpir="${x.semana}">semana del ${fmtDDMM(x.semana)}</button>: ${esc(textoCambioLibre(p, x))} <button type="button" class="festrm" data-lpquita="${x.semana}" aria-label="Quitar el cambio de la semana del ${fmtDDMM(x.semana)}">✕</button></span>`).join(' · ')}</div>` : ''}
       </div>`) +
      car('partido', 'Hace partido', '(mañana y tarde el mismo día) los…', `<div class="dowset">${dowSet(pd.dias, 'tpartido')}</div>
       ${chk('partidoSiempre', !!pd.siempre, 'Siempre partido')}`));
    h += sec('cocina', 'Cocina', subOff('cocina', c.nunca ? 'nunca cocina' : `${c.titular.length + c.reserva.length ? 'titular o reserva' : p.puesto === 'cocina' ? 'por su puesto' : 'no cocina'}${p.soloCocina ? ' · solo cocina' : ''}`),
      car('cocina', '', '', `<div class="pinlbl">Titular de cocina en</div><div class="locset">${locChips(c.titular, 'tcoct')}</div>
       <div class="pinlbl">Reserva de cocina en</div><div class="locset">${locChips(c.reserva, 'tcocr')}</div>
       <div class="pinlbl">Solo cocina estos días <small>(ninguno = cualquiera)</small></div><div class="dowset">${dowSet(c.soloDias, 'tcocd')}</div>
       ${chk('cocinaNunca', !!c.nunca, 'Nunca cocina')}
       ${chk('soloCocina', !!p.soloCocina, 'Solo hace cocina: no refuerza la sala (el generador, la cobertura y el selector no la ponen de sala)')}`));
    h += sec('abre', 'Abre el local', 'quién sale primero, quién no',
      car('abre', 'Sale el primero en', '', S.locales.map(l => `<div class="abrerow" style="--lc:${esc(l.color)}"><span class="abrenm"><i class="ldot"></i>${esc(l.nombre)}</span><span class="segrow" style="margin:0">${FRANJAS.map(f => `<button type="button" class="segk${((p.abre[l.id] || []).includes(f)) ? ' on' : ''}" data-tabre="${esc(l.id)}|${f}" data-libre>${FRANJA_LBL[f]}</button>`).join('')}</span></div>`).join('')) +
      car('noAbre', 'No abre nunca en', '', `<div class="locset">${locChips(p.noAbre, 'tnoabre')}</div>`) +
      car('noPrimero', 'No sale nunca el primero', '(entra a partir del segundo puesto en esas franjas)', `<div class="segrow">${franjaChips(p.noPrimero, 'tnoprimero')}</div>${p.noPrimero.length ? `<div class="festvacio">Nunca 1.º ${esc(lblNoPrimero(p.noPrimero))}${p.noPrimero.includes('T') ? ': no hace la tarde completa' : ''}.</div>` : '<div class="festvacio">Puede salir el primero en las dos franjas.</div>'}`, { nueva: true }));
    h += sec('reglas', 'Reglas con otras personas', `${p.nuncaCon.length ? p.nuncaCon.length + ' incompatibles' : 'sin incompatibles'} · cubre a ${p.cubreA.length}`,
      car('nuncaCon', 'Nunca coincide con', '(es mutua: se apaga también en su ficha)', `<div class="chiprow">${p.nuncaCon.map((q, i) => `<span class="tchip warn"><i>${esc(nombrePid(q))}</i><button type="button" class="festrm" data-rmnunca="${i}" aria-label="Quitar">✕</button></span>`).join('') || '<span class="festvacio">Con nadie en especial.</span>'}</div>
       <span class="addrow">${selPersonas('fNuncaSel', p.nuncaCon)}<button type="button" class="btn-mini" data-addnunca>Añadir</button></span>`) +
      car('cubreA', 'Cubre a', '(ocupa su sitio cuando falta y, si hace falta, puede hacer partido para cubrirle; no se salta nada más)', `${p.cubreA.map((cb, i) => fila(esc(nombrePid(cb.pid)), '', `<span class="cubrectl">${selDia(`data-cubred="${i}"`, cb.dow)}${selTurno(`data-cubret="${i}"`, cb.turnoId)}</span>`, `data-rmcubre="${i}"`)).join('') || '<div class="festvacio">No cubre a nadie en concreto.</div>'}
       <span class="addrow addrow3">${selPersonas('fCubreP')}${selDia('id="fCubreD"')}${selTurno('id="fCubreT"')}<button type="button" class="btn-mini" data-addcubre>Añadir</button></span>`));
    h += sec('vetos', 'Vetos', subOff('vetos', p.vetos.length ? `${p.vetos.length} franja(s) que no hace` : 'ninguno'),
      car('vetos', '', '', (p.vetos.map((v, i) => fila(`<i class="ldot" style="--lc:${esc(colorLocal(v.localId))}"></i>${esc(nombreLocal(v.localId))}`, `no hace ${v.franja === 'M' ? 'mañanas' : 'tardes'}`, '', `data-rmveto="${i}"`)).join('') || '<div class="festvacio">Sin vetos: puede ir a cualquier franja de sus locales.</div>') +
      `<span class="addrow"><select class="logininp" id="fVetoL" data-libre>${S.locales.map(l => `<option value="${esc(l.id)}">${esc(l.nombre)}</option>`).join('')}</select><select class="logininp" id="fVetoF" data-libre>${FRANJAS.map(f => `<option value="${f}">${FRANJA_LBL[f]}s</option>`).join('')}</select><button type="button" class="btn-mini" data-addveto>Añadir veto</button></span>`));
    h += sec('contrato', 'Contrato', subOff('contrato', p.contrato.horasSemana ? `${+p.contrato.horasSemana} h/semana` : 'sin horas fijadas'),
      car('contrato', '', '', `<label class="pinlbl">Horas por semana <small>(el contador de horas compara con esto)</small><input type="number" class="logininp" min="0" max="60" step="0.5" inputmode="decimal" data-num="horasSemana" data-libre value="${p.contrato.horasSemana !== null && p.contrato.horasSemana !== undefined ? esc(p.contrato.horasSemana) : ''}" placeholder="sin fijar"></label>`));
    h += sec('prefs', 'Preferencias', subOff('prefs', 'no bloquean: el generador las respeta al priorizar'),
      car('prefs', '', '', `<div class="pinlbl">Prefiere no trabajar los…</div><div class="dowset">${dowSet(p.prefs.evitaDows || [], 'tevita')}</div>
       <label class="pinlbl">Criterio personal<input type="text" class="logininp" data-txt="prefsNota" data-libre value="${esc(p.prefs.nota || '')}" placeholder="p. ej. concilia los lunes"></label>`));
    h += sec('aus', 'Ausencias', p.ausencias.length ? `${p.ausencias.length} registrada(s)` : 'ninguna',
      (p.ausencias.map((a, i) => fila(`<span class="abschip a-${esc(a.tipo)}">${esc((AUS_LBL[a.tipo] || { label: a.tipo }).label)}</span> del ${fmtDM(a.desde)}${a.hasta ? (a.hasta !== a.desde ? ' al ' + fmtDM(a.hasta) : '') : ' sin fecha de fin'}${esc(textoFranjasAusencia(a))}`, esc(a.detalle || ''), '', `data-rmaus="${i}"`)).join('') || '<div class="festvacio">Sin ausencias registradas.</div>') +
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
    const locs = p.locales.length ? p.locales.map(nombreLocal).join(' y ') : 'cualquier local (sin local fijo)';
    ov.querySelector('#fichSub').textContent = `${lblPuesto(p.puesto)} · ${locs} · ${lblFranjas(p.franjas).toLowerCase()}${deBaja(p, isoHoy()) ? ' · de baja' : ''}`;
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
    guarda(`puesto ${lblPuesto(e.target.value).toLowerCase()}`, x => { x.puesto = e.target.value; });
    pinta();
  });
  ov.addEventListener('click', e => {
    const t = e.target;
    if (t === ov || t.closest('[data-ovx]')) { cerrar(); return; }
    if (t.closest('[data-baja]')) { if (bajaPersona(p.id)) { tocada = false; ov.remove(); } return; }
    const cs = t.closest('[data-color]');
    if (cs) { guarda('color', x => { x.color = +cs.dataset.color; }); pintaCabecera(); return; }
    const d = t.dataset || {};
    const el = t.closest('[data-tloc],[data-tfranja],[data-tlibra],[data-tlpunt],[data-lpoff],[data-lpsem],[data-lpir],[data-lpquita],[data-tpartido],[data-tcoct],[data-tcocr],[data-tcocd],[data-tabre],[data-tnoabre],[data-tnoprimero],[data-tevita],[data-rmnunca],[data-addnunca],[data-rmcubre],[data-addcubre],[data-rmveto],[data-addveto],[data-rmaus],[data-addaus],[data-rmsup],[data-addsup]');
    if (!el) return;
    const ds = el.dataset;
    if (ds.tnoprimero !== undefined) {
      const f = ds.tnoprimero, quita = p.noPrimero.includes(f);
      guarda(`nunca el primero de ${FRANJA_LBL[f].toLowerCase()} ${quita ? 'quitado' : 'añadido'}`, x => { alterna(x.noPrimero, f); x.noPrimero.sort(); }, 'equipo'); pinta(); return;
    }
    if (ds.tloc !== undefined) { guarda(`local ${nombreLocal(ds.tloc)} ${p.locales.includes(ds.tloc) ? 'quitado' : 'añadido'}`, x => alterna(x.locales, ds.tloc)); pinta(); return; }
    if (ds.tfranja !== undefined) {
      if (p.franjas.length === 1 && p.franjas[0] === ds.tfranja) { toast('Tiene que hacer al menos una franja', 'warn'); return; }
      guarda(`franjas → ${lblFranjas(p.franjas.includes(ds.tfranja) ? p.franjas.filter(f => f !== ds.tfranja) : p.franjas.concat(ds.tfranja)).toLowerCase()}`, x => { alterna(x.franjas, ds.tfranja); x.franjas.sort(); }); pinta(); return;
    }
    // el día libre de una semana: se guarda con cambiarDiaLibreUI, que si la semana ya está en
    // la planilla la cambia al momento (con confirmación y un solo Ctrl+Z)
    if (ds.lpsem !== undefined) { const n = addDias(lpSem, 7 * +ds.lpsem); if (n >= lpMin) { lpSem = n; pinta(); } return; }
    if (ds.lpir !== undefined) { lpSem = ds.lpir; pinta(); return; }
    if (ds.tlpunt !== undefined) {
      const d = +ds.tlpunt, dias = lpDias(p).slice();
      alterna(dias, d);
      if (cambiarDiaLibreUI(p.id, lpSem, dias)) tocada = true;
      pinta(); return;
    }
    if (ds.lpoff !== undefined) { if (cambiarDiaLibreUI(p.id, lpSem, [])) tocada = true; pinta(); return; }
    if (ds.lpquita !== undefined) { if (cambiarDiaLibreUI(p.id, ds.lpquita, [])) tocada = true; pinta(); return; }
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
    if (ds.carTgl) {
      // interruptor de una característica: escribe p.inactivas (y, en «nunca con», la de los incompatibles)
      const k = ds.carTgl, on = t.checked;
      const otros = k === 'nuncaCon' ? p.nuncaCon.map(personaDeId).filter(q => q && caracteristicaActiva(q, k) !== on).map(q => q.nombre) : [];
      guarda(`«${lblCaracteristica(k)}» ${on ? 'activada' : 'desactivada'}${otros.length ? ` (también en ${otros.join(', ')})` : ''}`, x => setCaracteristica(x, k, on), 'equipo');
      if (otros.length) toast(`«${lblCaracteristica(k)}» ${on ? 'activada' : 'desactivada'} también en ${otros.join(', ')}: la regla es mutua`, on ? 'ok' : 'warn');
      pinta(); return;
    }
    if (ds.chk) {
      const on = t.checked;
      if (ds.chk === 'libreVariable') guarda(`libre variable ${on ? 'sí' : 'no'}`, x => { if (on) x.libreVariable = true; else delete x.libreVariable; });
      if (ds.chk === 'standby') guarda(on ? 'en standby' : 'fuera de standby: ya entra en la planilla', x => { if (on) x.standby = true; else delete x.standby; });
      else if (ds.chk === 'partidoSiempre') guarda(`siempre partido ${on ? 'sí' : 'no'}`, x => { if (on) x.partido.siempre = true; else delete x.partido.siempre; });
      else if (ds.chk === 'cocinaNunca') guarda(`nunca cocina ${on ? 'sí' : 'no'}`, x => { if (on) x.cocina.nunca = true; else delete x.cocina.nunca; });
      // 24/09 (S34): «solo hace cocina» se veía en la semilla pero no se podía ni ver ni cambiar
      else if (ds.chk === 'soloCocina') guarda(`solo cocina ${on ? 'sí' : 'no'}`, x => { if (on) x.soloCocina = true; else delete x.soloCocina; });
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

// ---------- el día libre de una semana (ficha y Generador) ----------
// 24/09 (reunión, D9): «esta semana libra martes en vez de miércoles… en el equipo te lo pone
// tal cual, pero luego no lo quita». La semana del cambio es la que se está planificando: la del
// Generador semanal si se ha abierto; si no, la de la vista Semana. Y siempre se enseña.
function semanaPlanificada() { return lunesDe((typeof GEN !== 'undefined' && GEN.lunes) || S.semLunes || isoHoy()); }
function semanaVolcada(lunes) {
  for (let k = 0; k < 7; k++) { const iso = addDias(lunes, k); const a = estadoDeIso(iso).asig[iso]; if (a && Object.values(a).some(l => l.length)) return true; }
  return false;
}
// lo que va a pasar en la planilla, contado antes de tocarla (para la confirmación): quién sale y
// quién entra, lo que se queda por estar puesto a mano, los huecos, dónde no se la puede poner y
// por qué (24/09, revisión: con Lavinia puesta a mano el miércoles solo decía «sale del martes») y
// los avisos del modelo (un día que ya ha pasado, días que no se pueden emparejar)
function lineasMoverDiaLibre(p, r, e) {
  const dia = iso => `${DIAS_L[isoDow(iso)].toLowerCase()} ${+iso.slice(8, 10)}`;
  const grupos = xs => { const m = new Map(); for (const x of xs) { const k = x.pid + '|' + x.iso; if (!m.has(k)) m.set(k, { pid: x.pid, iso: x.iso, tids: [] }); m.get(k).tids.push(x.turnoId); } return [...m.values()]; };
  const donde = tids => { const loc = [...new Set(tids.map(t => partirTurno(t).localId))]; return loc.map(l => `${nombreLocal(l)} ${tids.filter(t => partirTurno(t).localId === l).map(t => FRANJA_LBL[partirTurno(t).franja].toLowerCase()).join(' y ')}`).join(', '); };
  // «nunca con Lavinia (plaza puesta a mano)»: si lo impide una plaza puesta a mano o forzada, que
  // nadie quita en automático, se dice, para que el encargado decida
  const porQue = x => {
    const m = /^nunca con (.+)$/.exec(x.motivo || '');
    const q = m && e ? asignados(e, x.iso, x.turnoId).find(y => nombrePid(y.pid) === m[1]) : null;
    return `${x.motivo}${q && !esAutomatica(q) ? ' (plaza puesta a mano)' : ''}`;
  };
  const lineas = [];
  for (const g of grupos(r.quitados)) lineas.push(g.pid === p.id ? `${p.nombre} sale del ${dia(g.iso)} (${donde(g.tids)})` : `${nombrePid(g.pid)} deja de cubrir a ${p.nombre} el ${dia(g.iso)} (${donde(g.tids)})`);
  for (const g of grupos(r.puestos)) lineas.push(g.pid === p.id ? `${p.nombre} entra el ${dia(g.iso)} en ${donde(g.tids)}` : `${nombrePid(g.pid)} cubre a ${p.nombre} el ${dia(g.iso)} (${donde(g.tids)})`);
  for (const g of grupos(r.quedan)) lineas.push(`se queda el ${dia(g.iso)} en ${donde(g.tids)} porque se puso a mano o forzado (con su aviso)`);
  for (const x of r.rechazados || []) lineas.push(`no se puede poner a ${nombrePid(x.pid)} el ${dia(x.iso)} en ${lblTurno(x.turnoId)}: ${porQue(x)}`);
  for (const h of r.huecos) lineas.push(`queda un hueco el ${dia(h.iso)} en ${lblTurno(h.turnoId)} (${h.faltan === 1 ? 'falta' : 'faltan'} ${h.faltan} de ${h.minimo}): genera la semana o busca quién cubre`);
  for (const a of r.avisos || []) lineas.push(a.texto);
  return lineas;
}
function textoMoverDiaLibre(p, lunes, dias, r, e) {
  const txtD = ds => ds.map(d => DIAS_L[d].toLowerCase()).join(' y ');
  const que = dias.length ? `${p.nombre} libra ${txtD(dias)}${(p.libra || []).length ? ' en vez de ' + txtD(p.libra) : ''}` : `${p.nombre} vuelve a su día libre de siempre`;
  return `La semana del ${fmtDDMM(lunes)} ya está en la planilla. Si ${que}:\n· ${lineasMoverDiaLibre(p, r, e).join('\n· ')}\n\n¿Cambiarlo? (${comoDeshacer()} lo deshace)`;
}
// Guarda el día libre de una semana (dias = [] lo quita). Si la semana ya está en la planilla,
// lo aplica con moverDiaLibre del modelo tras confirmarlo; ficha y planilla van en un solo
// pushUndo, con su línea en el historial. Devuelve false si se cancela o no hay nada que cambiar.
// Las semanas ya pasadas no se cambian (24/09, revisión): el cambio se borraba solo al recargar.
function cambiarDiaLibreUI(pid, lunes, dias) {
  const p = personaDeId(pid); if (!p) return false;
  const l0 = lunesDe(lunes), desdeIso = isoHoy();
  if (l0 < lunesDe(desdeIso)) { toast('Esa semana ya ha pasado: su día libre no se cambia', 'warn'); return false; }
  // marcar justo sus días de siempre no es un cambio (el modelo no lo guarda): no se pregunta nada
  const prueba = JSON.parse(JSON.stringify(p));
  ponerLibraPuntual(prueba, l0, dias);
  if (JSON.stringify(librasPuntuales(prueba)) === JSON.stringify(librasPuntuales(p))) {
    if (dias.length) toast(`${p.nombre} ya libra ${dias.map(d => DIAS_L[d].toLowerCase()).join(' y ')} de siempre: no hay nada que cambiar`, 'ok');
    return false;
  }
  let volcar = false;
  if (semanaVolcada(l0)) {
    // se ensaya sobre copias para contar lo que va a pasar antes de tocar nada
    const copia = clonarEstado(estadoSemana(l0, false));
    const sim = moverDiaLibre(S, JSON.parse(JSON.stringify(S.staff)), copia, pid, l0, dias, { desdeIso });
    if (sim.quitados.length || sim.puestos.length || sim.quedan.length || sim.rechazados.length || sim.avisos.length) {
      if (!confirmarSiCerrado(l0)) return false;
      if (!confirm(textoMoverDiaLibre(p, l0, dias, sim, copia))) return false;
      volcar = true;
    }
  }
  pushUndo(`día libre de ${p.nombre} (semana del ${fmtDDMM(l0)})`, { staff: true, otrosMeses: volcar });
  const real = volcar ? estadoSemana(l0, true) : null;
  const r = volcar ? moverDiaLibre(S, S.staff, real, pid, l0, dias, { desdeIso }) : null;
  if (!volcar) ponerLibraPuntual(p, l0, dias);
  const txtD = ds => ds.map(d => DIAS_L[d].toLowerCase()).join(' y ');
  const nRech = r ? r.rechazados.length : 0;
  registrarCambio(`Ficha de ${p.nombre}: ${dias.length ? `la semana del ${fmtDDMM(l0)} libra ${txtD(dias)}${(p.libra || []).length ? ' en vez de ' + txtD(p.libra) : ''}` : `la semana del ${fmtDDMM(l0)} vuelve a su día libre de siempre`}${r ? ` · planilla: ${r.quitados.length} plaza(s) fuera, ${r.puestos.length} dentro${r.huecos.length ? `, ${r.huecos.length} hueco(s) por cubrir` : ''}${nRech ? `, ${nRech} que no se ${nRech === 1 ? 'pudo' : 'pudieron'} poner (${r.rechazados.map(x => `${nombrePid(x.pid)} el ${fmtDM(x.iso)}: ${x.motivo}`).join('; ')})` : ''}${r.avisos.length ? ` · ${r.avisos.map(a => a.texto).join(' · ')}` : ''}` : ''}`, 'equipo');
  saveState();
  if (typeof GEN !== 'undefined' && GEN.previa && GEN.previa.semana && GEN.lunes === l0) GEN.previa = null;   // la vista previa de esa semana ya no vale
  if (r) toast(`${p.nombre}: la semana del ${fmtDDMM(l0)} ya está cambiada en la planilla${r.huecos.length ? ` · ${pl(r.huecos.length, 'hueco', 'huecos')} por cubrir` : ''}${nRech ? ` · ${nRech === 1 ? 'una plaza no se pudo poner' : `${nRech} plazas no se pudieron poner`}` : ''} · ${comoDeshacer()} para deshacer`, r.huecos.length || nRech ? 'warn' : 'ok');
  return true;
}
