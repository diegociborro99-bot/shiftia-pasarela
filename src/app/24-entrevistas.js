// ================= ENTREVISTAS Y ALERTA INTERNA =================
// Dos menús bien distinguidos, como pidió José el 17/09: «Entrevistas» con toda la base
// del grupo y «Alerta interna» con quien pide cita y no acude o ha dado problemas. Cada
// candidato lleva dos etiquetas —el puesto al que opta y la valoración— y se filtra por
// las dos a la vez («cocinero bien», «camarera en espera»…), con buscador por nombre o
// teléfono y una ficha por cajetines para registrar y editar.
const ENT = { lista: 'ent', q: '', puesto: '', val: '', motivo: '', hab: '', abierta: null };

// El icono de cada etiqueta, los mismos que el grupo usa en su base de Notion
const ICO_CAND = { cocina: () => SVG_COCINA, camarero: () => SVG_CAMARERO, bien: () => SVG_BIEN, mal: () => SVG_MAL, espera: () => SVG_ESPERA, veto: () => SVG_VETO,
  cafetera: () => SVG_CAFETERA, barril: () => SVG_BARRIL, jamon: () => SVG_JAMON, tpv: () => SVG_TPV, pda: () => SVG_PDA, llave: () => SVG_LLAVE, sol: () => SVG_SOL, luna: () => SVG_LUNA, doc: () => SVG_DOC,
  edad: () => SVG_EDAD, zona: () => SVG_ZONA, fecha: () => SVG_FECHA, exp: () => SVG_EXP, tipoCocina: () => SVG_TIPOCOCINA,
  incorp: () => SVG_INCORP, sueldo: () => SVG_SUELDO, horarios: () => SVG_HORARIO, cond: () => SVG_COND, obs: () => SVG_OBS,
  adj: () => SVG_ADJ, tel: () => SVG_TEL, wa: () => SVG_WA, nota: () => SVG_NOTA, aptitud: () => SVG_APTITUD };
const icoCand = k => (ICO_CAND[k] ? ICO_CAND[k]() : '');
const icoPuesto = id => { const x = PUESTOS_CAND.find(v => v.id === id); return x ? icoCand(x.ico) : ''; };
// las etiquetas de puesto de un candidato: una por cada uno al que opta, o «Sin puesto»
function chipsPuesto(c) {
  const ps = PUESTOS_CAND.filter(x => puestosDe(c).includes(x.id));
  if (!ps.length) return '<em class="entp p-no">Sin puesto</em>';
  return ps.map(x => `<em class="entp p-${esc(x.id)}">${icoCand(x.ico)}${esc(x.label)}</em>`).join('');
}
const icoVal = v => { const x = VAL_LBL[v]; return x ? icoCand(x.ico) : ''; };

function candidatos() { S.entrevistas = S.entrevistas || []; return S.entrevistas; }
function candidatoDe(id) { return candidatos().find(c => c.id === id) || null; }
function nuevoIdCand() {
  let i = 1; const usados = new Set(candidatos().map(c => c.id));
  while (usados.has('c' + i)) i++;
  return 'c' + i;
}
function guardarCand(txt) { registrarCambio(txt, 'entrevistas'); saveState(); renderEntrevistas(); }
function nombreCand(c) { return c.nombre || (c.tel ? `Sin nombre · ${c.tel}` : 'Sin nombre'); }
function telLimpio(t) { return String(t || '').replace(/\D/g, ''); }
function telBonito(t) { const n = telLimpio(t); return n.length === 9 ? `${n.slice(0, 3)} ${n.slice(3, 5)} ${n.slice(5, 7)} ${n.slice(7)}` : n; }

function irAEntrevistas(lista) { ENT.lista = lista || 'ent'; switchTab('entrevistas'); }

function renderEntrevistas() {
  const todos = candidatos();
  const res = LISTAS_CAND.map(l => ({ l, r: resumenCandidatos(todos, l.id) }));
  const vistos = filtrarCandidatos(todos, { lista: ENT.lista, q: ENT.q, puesto: ENT.puesto, val: ENT.val, motivo: ENT.motivo, hab: ENT.hab });
  const r = res.find(x => x.l.id === ENT.lista).r;
  const alerta = ENT.lista === 'alerta';

  const chip = (k, v, txt, n, ico) => `<button class="entchip${ENT[k] === v ? ' on' : ''}" data-entf="${k}|${esc(v)}">${ico || ''}${esc(txt)}${n !== undefined ? `<i>${n}</i>` : ''}</button>`;
  const puestoChips = `<div class="entchips" role="group" aria-label="Filtrar por puesto">
    ${chip('puesto', '', 'Todos', r.total)}${PUESTOS_CAND.map(x => chip('puesto', x.id, x.plural, r.puesto[x.id], icoCand(x.ico))).join('')}${chip('puesto', 'ninguno', 'Sin puesto', r.sinPuesto)}</div>`;
  const valChips = `<div class="entchips" role="group" aria-label="Filtrar por valoración">
    ${chip('val', '', 'Todas')}${VALORACIONES.map(v => chip('val', v.id, v.label, r[v.id], icoCand(v.ico))).join('')}${chip('val', 'ninguna', 'Sin valorar', r.sinValorar)}</div>`;
  const habChips = `<div class="entchips" role="group" aria-label="Filtrar por aptitud">
    ${chip('hab', '', 'Cualquier aptitud')}${HABILIDADES.filter(x => r.hab[x.id]).map(x => chip('hab', x.id, x.label, r.hab[x.id], icoCand(x.ico))).join('')}</div>`;
  const motChips = alerta ? `<div class="entchips" role="group" aria-label="Filtrar por motivo">
    ${chip('motivo', '', 'Todos los motivos')}${MOTIVOS_ALERTA.map(m => chip('motivo', m.id, m.label)).join('')}</div>` : '';

  $('#entrevistasRoot').innerHTML = `
  <div class="enthead">
    <div class="enttabs" role="tablist">
      ${res.map(({ l, r: rr }) => `<button class="enttab${ENT.lista === l.id ? ' on' : ''}" role="tab" aria-selected="${ENT.lista === l.id}" data-entlista="${l.id}">
        <b>${esc(l.label)}</b><span>${esc(l.sub)}</span><i>${rr.total}</i></button>`).join('')}
    </div>
    <div class="entacts">
      <label class="entbusca"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/></svg>
        <input type="search" id="entQ" placeholder="Buscar por nombre o teléfono…" value="${esc(ENT.q)}" aria-label="Buscar candidato"></label>
      ${puedeVerEntrevista()
        ? `<button class="btn btn-cta" id="entNuevo">+ Registrar</button>`
        : `<button class="btn btn-cta" id="entAlerta">+ A la lista negra</button>`}
    </div>
  </div>
  ${puedeVerEntrevista() ? '' : `<div class="entaviso">${SVG_CANDADO}<span><b>El contenido de cada entrevista es del jefe.</b> Aquí ves quién es, a qué puesto opta, cómo se le valoró y si ya se le entrevistó — lo justo para saber si hay que volver a llamarle. Lo que se habló dentro (condiciones, sueldo, observaciones) no sale del servidor. Sí puedes meter a alguien en la lista negra si no acude a la entrevista.</span></div>`}
  <div class="entfiltros">${puestoChips}${valChips}${motChips}${Object.values(r.hab).some(Boolean) ? habChips : ''}</div>
  <div class="entcount">${vistos.length === r.total ? `${r.total} ${r.total === 1 ? 'persona' : 'personas'}` : `${vistos.length} de ${r.total}`}${ENT.q || ENT.puesto || ENT.val || ENT.motivo || ENT.hab ? ' <button class="btn-mini ghost" id="entLimpiar">Quitar filtros</button>' : ''}</div>
  <div class="entlist">${vistos.length ? vistos.map(filaCand).join('') : `<div class="entzero"><b>No hay nadie con esos filtros.</b><span>Prueba a quitarlos o registra a alguien nuevo.</span></div>`}</div>`;

  $('#entQ').oninput = e => { ENT.q = e.target.value; pintaListaEnt(); };
  const btnNuevo = $('#entNuevo'); if (btnNuevo) btnNuevo.onclick = () => abrirFichaCand(null);
  const btnAl = $('#entAlerta'); if (btnAl) btnAl.onclick = altaAlertaRapida;
  const lim = $('#entLimpiar'); if (lim) lim.onclick = () => { ENT.q = ENT.puesto = ENT.val = ENT.motivo = ENT.hab = ''; renderEntrevistas(); };
}
// 18/09 (Diego): «el oficinista puede meter a gente en la lista negra (crear registros) si
// no acude una persona a la entrevista». Quien no ve el contenido de las entrevistas no
// tiene ficha que rellenar —el servidor no se la manda—, así que da de alta con lo justo:
// quién es, su teléfono y por qué no hay que volver a llamarle. El servidor solo acepta
// esos tres campos, aunque desde aquí se mandara algo más.
function altaAlertaRapida() {
  const nombre = (prompt('¿A quién metemos en la lista negra? (nombre y apellidos)') || '').trim();
  if (!nombre) return;
  const tel = (prompt(`Teléfono de ${nombre} (para no volver a llamarle por error):`) || '').trim();
  const opciones = MOTIVOS_ALERTA.map((m, i) => `${i + 1}) ${m.label}`).join('\n');
  const eleccion = (prompt(`¿Por qué?\n${opciones}`, '1') || '').trim();
  const m = MOTIVOS_ALERTA[(+eleccion || 1) - 1] || MOTIVOS_ALERTA[0];
  S.entrevistas = (S.entrevistas || []).concat([{ id: nuevoIdCand(), nombre, tel, lista: 'alerta', motivo: m.id }]);
  registrarCambio(`${nombre} a la lista de alerta: ${m.label.toLowerCase()}`, 'cambio');
  saveState();
  ENT.lista = 'alerta';
  renderEntrevistas();
  toast(`${nombre} está en la lista de alerta`, 'warn');
}
// repinta solo la lista al teclear, para no perder el foco del buscador
function pintaListaEnt() {
  const vistos = filtrarCandidatos(candidatos(), { lista: ENT.lista, q: ENT.q, puesto: ENT.puesto, val: ENT.val, motivo: ENT.motivo, hab: ENT.hab });
  const tot = resumenCandidatos(candidatos(), ENT.lista).total;
  $('#entrevistasRoot .entlist').innerHTML = vistos.length ? vistos.map(filaCand).join('') : `<div class="entzero"><b>No hay nadie con esos filtros.</b><span>Prueba a quitarlos o registra a alguien nuevo.</span></div>`;
  $('#entrevistasRoot .entcount').firstChild.textContent = vistos.length === tot ? `${tot} ${tot === 1 ? 'persona' : 'personas'}` : `${vistos.length} de ${tot}`;
}
// 18/09 (José): «no quiero que [Aroa] tenga acceso al contenido de cada entrevista […]
// pero no a lo que hay dentro de cada entrevista donde hablo de condiciones». Lo impone el
// servidor —a quien no lo tiene le llegan las fichas sin nada dentro—; esto es solo para
// no pintarle una ficha vacía ni botones que le van a dar un 403. Sin servidor (modo
// local, demo) no hay cuentas y se ve todo.
function puedeVerEntrevista() { return !SRV.on || SRV.verEntrevistas !== false; }
// el candado del aviso
const SVG_CANDADO = ICO('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>');

function filaCand(c) {
  const v = VAL_LBL[c.val];
  const mot = c.motivo && MOTIVOS_ALERTA.find(m => m.id === c.motivo);
  const habs = HABILIDADES.filter(h => (c.hab || {})[h.id] === 'si');
  const abre = puedeVerEntrevista();
  return `<${abre ? 'button' : 'div'} class="entrow${abre ? '' : ' entrow-cerrada'}"${abre ? ` data-entficha="${esc(c.id)}"` : ''}>
    <span class="entav" style="--pc:${avColor(c.id)}">${esc(initials(nombreCand(c)))}</span>
    <span class="enttxt"><b>${esc(nombreCand(c))}${tieneEntrevista(c) ? '<i class="entok" title="Entrevista contestada">●</i>' : ''}</b><small>${c.tel ? esc(telBonito(c.tel)) : 'sin teléfono'}${c.edad ? ' · ' + esc(c.edad) + ' años' : ''}${c.zona ? ' · ' + esc(c.zona.split(/[,.]/)[0].slice(0, 22)) : ''}</small></span>
    <span class="entetq">
      ${chipsPuesto(c)}
      ${v ? `<em class="entv v-${esc(v.id)}">${icoVal(v.id)}${esc(v.label)}</em>` : '<em class="entv v-no">Sin valorar</em>'}
      ${mot ? `<em class="entm">${esc(mot.label)}</em>` : ''}
    </span>
    ${habs.length ? `<span class="enthab" title="${esc(habs.map(h => h.label).join(', '))}">${habs.map(h => icoCand(h.ico)).join('')}</span>` : ''}
    </${abre ? 'button' : 'div'}>`;
}

// ---------- perfil del candidato: la entrevista entera, de un vistazo ----------
// 17/09 (José): «que se vea premium y visual». Al pulsar en alguien se abre su perfil de
// lectura con TODO lo que trajimos de la base del grupo —etiquetas, datos, aptitudes y los
// textos largos de la entrevista—, cada cosa con su icono. Para tocar algo: «Editar».
function fichaCandHTML(c) {
  const v = VAL_LBL[c.val];
  const mot = c.motivo && MOTIVOS_ALERTA.find(m => m.id === c.motivo);
  const lista = LISTAS_CAND.find(l => l.id === c.lista) || LISTAS_CAND[0];
  const tel = telLimpio(c.tel);
  const cortos = CAMPOS_ENTREVISTA.filter(x => !x.largo);
  const largos = CAMPOS_ENTREVISTA.filter(x => x.largo).filter(x => c[x.k]);

  const etq = `${chipsPuesto(c)}
    ${v ? `<em class="entv v-${esc(v.id)}">${icoVal(v.id)}${esc(v.label)}</em>` : '<em class="entv v-no">Sin valorar</em>'}
    ${mot ? `<em class="entm">${esc(mot.label)}</em>` : ''}
    ${c.adj ? `<em class="entadj">${icoCand('adj')}${c.adj} ${c.adj === 1 ? 'foto o CV' : 'fotos y CV'} en Notion</em>` : ''}`;

  const acciones = tel
    ? `<a class="btn-mini" href="tel:${esc(tel)}">${icoCand('tel')}${esc(telBonito(tel))}</a>
       ${tel.length === 9 ? `<a class="btn-mini wa" href="https://wa.me/34${esc(tel)}" target="_blank" rel="noopener">${icoCand('wa')}WhatsApp</a>` : ''}`
    : '<span class="cperfsin">Sin teléfono</span>';

  const dato = x => { const t = textoCampo(c, x); return `<div class="cperfk${t ? '' : ' vacio'}">${icoCand(x.ico)}<em>${esc(x.label)}</em><b>${t ? esc(t) : '—'}</b></div>`; };
  const bloque = (ico, titulo, txt) => `<article class="cbloq"><h5>${icoCand(ico)}${esc(titulo)}</h5><p>${esc(txt)}</p></article>`;

  return `<div class="cperf">
    <header class="cperfhead" style="--pc:${avColor(c.id)}">
      <span class="cperfav">${esc(initials(nombreCand(c)))}</span>
      <div class="cperfid">
        <span class="micro">${esc(lista.label)}${tieneEntrevista(c) ? ' · entrevista contestada' : ''}</span>
        <h2>${esc(nombreCand(c))}</h2>
        <div class="cperfetq">${etq}</div>
      </div>
      <div class="cperfacts">${acciones}</div>
    </header>
    <div class="cperfkpis">${cortos.map(dato).join('')}</div>
    ${(c.busca || []).length ? `<section class="cperfsec">
      <h4>${icoCand('horarios')}Busca</h4>
      <div class="habgrid">${BUSCA.filter(x => c.busca.includes(x.id)).map(x => `<span class="habchip s-busca">${icoCand(x.ico)}${esc(x.label)}</span>`).join('')}</div>
    </section>` : ''}
    <section class="cperfsec">
      <h4>${icoCand('aptitud')}Aptitudes</h4>
      <div class="habgrid">${HABILIDADES.map(h => { const e = (c.hab || {})[h.id];
        return `<span class="habchip s-${e || 'vacio'}">${icoCand(h.ico)}${esc(h.label)}<i>${e ? esc(HAB_ESTADO[e]) : 'sin preguntar'}</i></span>`; }).join('')}</div>
    </section>
    ${largos.length || c.nota ? `<div class="cperfbloques">
      ${largos.map(x => bloque(x.ico, x.label, textoCampo(c, x))).join('')}
      ${c.nota ? bloque('nota', 'Notas', c.nota) : ''}</div>` : ''}
    ${tieneEntrevista(c) ? '' : '<div class="cperfvacia">Esta persona aún no tiene la entrevista contestada. Pulsa <b>Editar</b> para ir rellenándola.</div>'}
    <div class="candpie">
      <span class="candsp"></span>
      <button type="button" class="btn btn-sec" data-ovx>Cerrar</button>
      <button type="button" class="btn btn-cta" data-cedit>Editar</button>
    </div>
  </div>`;
}
function abrirPerfilCand(c) {
  const ov = abrirOverlay('candOvl', fichaCandHTML(c), { ancho: 780 });
  ov.addEventListener('click', ev => { if (ev.target.closest('[data-cedit]')) abrirFichaCand(c.id, true); });
}

// ---------- ficha de un candidato (cajetines) ----------
function abrirFichaCand(id, editar) {
  // el servidor no le manda el contenido: abrir la ficha solo enseñaría huecos
  if (!puedeVerEntrevista()) { toast('El contenido de las entrevistas es del jefe', 'warn'); return; }
  const nuevo = !id;
  const c = nuevo ? { id: nuevoIdCand(), nombre: '', tel: '', puestos: [], val: null, motivo: null, nota: '', hab: {}, lista: ENT.lista, fecha: fmtLargo(isoHoy()) } : candidatoDe(id);
  if (!c) return;
  if (!nuevo && !editar) { abrirPerfilCand(c); return; }
  const tmpHab = Object.assign({}, c.hab || {});
  const tmpPtos = puestosDe(c).slice();
  const tmpBusca = (c.busca || []).slice();
  // «el entrevistado busca» (Aroa, 17/09): varias a la vez; «No tiene problemas» va sola
  const bloqueBusca = `
      <div class="pinlbl ancho">${icoCand('horarios')}El entrevistado busca <small>puedes marcar varias</small></div>
      <div class="segrow ancho">${BUSCA.map(x => `<button type="button" class="segk${tmpBusca.includes(x.id) ? ' on' : ''}" data-cbus="${esc(x.id)}">${icoCand(x.ico)}${esc(x.label)}</button>`).join('')}</div>`;
  // cada campo de la entrevista: de botones si tiene opciones, y si no, su cajetín
  const campoFicha = x => x.opciones
    ? `<div class="pinlbl${x.largo ? ' ancho' : ''}">${icoCand(x.ico)}${esc(x.label)}</div>${seg(x.k, x.opciones.concat([{ id: '', label: 'Sin indicar' }]))}`
    : `<label class="pinlbl${x.largo ? ' ancho' : ''}">${icoCand(x.ico)}${esc(x.label)}${x.largo
        ? `<textarea class="logininp" data-cin="${x.k}" rows="${(c[x.k] || '').length > 160 ? 5 : 2}" placeholder="—">${esc(c[x.k] || '')}</textarea>`
        : `<input class="logininp" data-cin="${x.k}" value="${esc(c[x.k] || '')}" placeholder="—">`}</label>`;
  const seg = (k, opts) => `<div class="segrow">${opts.map(o => `<button type="button" class="segk${(c[k] || '') === o.id ? ' on' : ''}" data-cset="${k}|${esc(o.id)}">${o.ico ? icoCand(o.ico) : ''}${esc(o.label)}</button>`).join('')}</div>`;
  const ov = abrirOverlay('candOvl', `
    <span class="micro">${nuevo ? 'ENTREVISTAS' : esc((LISTAS_CAND.find(l => l.id === c.lista) || {}).label || '')}</span>
    <h2 class="revh2">${nuevo ? 'Registrar candidato' : esc(nombreCand(c))}</h2>
    <div class="candform">
      <label class="pinlbl candfecha">${icoCand('fecha')}Fecha de la entrevista<input class="logininp" data-cin="fecha" value="${esc(c.fecha || '')}" placeholder="${esc(fmtLargo(isoHoy()))}">${nuevo ? '<small>la de hoy, puesta sola</small>' : ''}</label>
      <label class="pinlbl">Nombre<input class="logininp" data-cin="nombre" value="${esc(c.nombre || '')}" placeholder="Nombre y apellidos" autocomplete="off"></label>
      <label class="pinlbl">Teléfono<input class="logininp" data-cin="tel" inputmode="tel" value="${esc(c.tel || '')}" placeholder="600 00 00 00" autocomplete="off"></label>
      ${CAMPOS_ENTREVISTA.filter(x => x.cabecera && x.k !== 'fecha').map(campoFicha).join('')}
      <div class="pinlbl">Puesto al que opta <small>puedes marcar los dos</small></div>
      <div class="segrow">${PUESTOS_CAND.map(x => `<button type="button" class="segk${tmpPtos.includes(x.id) ? ' on' : ''}" data-cpto="${esc(x.id)}">${icoCand(x.ico)}${esc(x.label)}</button>`).join('')}<button type="button" class="segk${tmpPtos.length ? '' : ' on'}" data-cpto="">Sin decidir</button></div>
      <div class="pinlbl">Lista</div>
      ${seg('lista', LISTAS_CAND)}
      <div class="candalerta" ${c.lista === 'alerta' ? '' : 'hidden'}>
        <div class="pinlbl">Motivo de la alerta</div>
        ${seg('motivo', MOTIVOS_ALERTA.concat([{ id: '', label: 'Sin indicar' }]))}
      </div>
      <div class="candent">
        <div class="pinlbl">La entrevista <small>${tieneEntrevista(c) ? 'contestada' : 'sin contestar'}${c.adj ? ` · ${c.adj} ${c.adj === 1 ? 'foto o CV' : 'fotos o CV'} en Notion` : ''}</small></div>
        <div class="candhab">${HABILIDADES.map(h => `<span class="habrow"><em>${icoCand(h.ico)}${esc(h.label)}</em>
          <span class="segrow">${['si', 'dudas', 'no'].map(e => `<button type="button" class="segk mini${(tmpHab[h.id] || '') === e ? ' on e-' + e : ''}" data-chab="${h.id}|${e}">${esc(HAB_ESTADO[e])}</button>`).join('')}</span></span>`).join('')}</div>
        ${CAMPOS_ENTREVISTA.filter(x => !x.cabecera).map(x => campoFicha(x) + (x.k === 'horarios' ? bloqueBusca : '')).join('')}
      </div>
      <label class="pinlbl">Notas<textarea class="logininp" data-cin="nota" rows="3" placeholder="Lo que quieras recordar de esta persona">${esc(c.nota || '')}</textarea></label>
      <div class="candval">
        <div class="pinlbl">Valoración <small>lo que decides al terminar la entrevista</small></div>
        ${seg('val', VALORACIONES.concat([{ id: '', label: 'Sin valorar' }]))}
      </div>
      <div class="candpie">
        ${nuevo ? '' : `<button type="button" class="btn-mini ghost danger" data-cdel>Borrar de la base</button>`}
        <span class="candsp"></span>
        <button type="button" class="btn btn-sec" ${nuevo ? 'data-ovx' : 'data-cperf'}>${nuevo ? 'Cancelar' : 'Volver al perfil'}</button>
        <button type="button" class="btn btn-cta" data-cok>${nuevo ? 'Registrar' : 'Guardar'}</button>
      </div>
    </div>`);

  const tmp = Object.assign({}, c);
  ov.addEventListener('click', ev => {
    const b = ev.target.closest('[data-cset],[data-cok],[data-cdel],[data-chab],[data-cperf],[data-cpto],[data-cbus]');
    if (!b) return;
    if (b.dataset.cperf !== undefined) { abrirPerfilCand(c); return; }
    if (b.dataset.cbus !== undefined) {
      const id = b.dataset.cbus;
      if (id === 'TODO') { tmpBusca.length = 0; tmpBusca.push('TODO'); }
      else {
        const i = tmpBusca.indexOf('TODO'); if (i >= 0) tmpBusca.splice(i, 1);
        if (tmpBusca.includes(id)) tmpBusca.splice(tmpBusca.indexOf(id), 1); else tmpBusca.push(id);
      }
      ov.querySelectorAll('[data-cbus]').forEach(x => x.classList.toggle('on', tmpBusca.includes(x.dataset.cbus)));
      return;
    }
    if (b.dataset.cpto !== undefined) {
      const id = b.dataset.cpto;
      if (!id) tmpPtos.length = 0;
      else if (tmpPtos.includes(id)) tmpPtos.splice(tmpPtos.indexOf(id), 1);
      else tmpPtos.push(id);
      ov.querySelectorAll('[data-cpto]').forEach(x => x.classList.toggle('on', x.dataset.cpto ? tmpPtos.includes(x.dataset.cpto) : !tmpPtos.length));
      return;
    }
    if (b.dataset.chab !== undefined) {
      const [h, e] = b.dataset.chab.split('|');
      tmpHab[h] = tmpHab[h] === e ? undefined : e;
      if (!tmpHab[h]) delete tmpHab[h];
      ov.querySelectorAll(`[data-chab^="${h}|"]`).forEach(x => {
        const v = x.dataset.chab.split('|')[1];
        x.className = 'segk mini' + (tmpHab[h] === v ? ' on e-' + v : '');
      });
      return;
    }
    if (b.dataset.cset !== undefined) {
      const [k, v] = b.dataset.cset.split('|');
      tmp[k] = v || null;
      ov.querySelectorAll(`[data-cset^="${k}|"]`).forEach(x => x.classList.toggle('on', (tmp[k] || '') === x.dataset.cset.split('|')[1]));
      const al = ov.querySelector('.candalerta'); if (al) al.hidden = tmp.lista !== 'alerta';
      return;
    }
    if (b.dataset.cdel !== undefined) {
      if (!confirm(`¿Borrar a ${nombreCand(c)} de la base?`)) return;
      S.entrevistas = candidatos().filter(x => x.id !== c.id);
      ov.remove(); guardarCand(`Candidato borrado: ${nombreCand(c)}`); return;
    }
    ov.querySelectorAll('[data-cin]').forEach(i => { tmp[i.dataset.cin] = i.value.trim(); });
    tmp.hab = tmpHab;
    tmp.puestos = PUESTOS_CAND.filter(x => tmpPtos.includes(x.id)).map(x => x.id);   // en el orden de siempre
    tmp.busca = BUSCA.filter(x => tmpBusca.includes(x.id)).map(x => x.id);
    delete tmp.puesto;
    tmp.tel = telLimpio(tmp.tel);
    if (!tmp.nombre && !tmp.tel) { alert('Pon al menos un nombre o un teléfono.'); return; }
    if (tmp.lista !== 'alerta') tmp.motivo = null;
    if (nuevo) { tmp.fecha = tmp.fecha || fmtLargo(isoHoy()); candidatos().push(tmp); }   // por si la borró
    else Object.assign(c, tmp);
    ENT.lista = tmp.lista;
    ov.remove();
    guardarCand(`${nuevo ? 'Candidato registrado' : 'Candidato actualizado'}: ${nombreCand(tmp)} (${etiquetaCandidato(tmp)})`);
    if (!nuevo) abrirPerfilCand(c);
  });
}

// ---------- eventos de la vista ----------
document.addEventListener('click', e => {
  const t = e.target.closest('[data-entlista],[data-entf],[data-entficha]');
  if (!t || !t.closest('#entrevistasRoot')) return;
  if (t.dataset.entlista) { ENT.lista = t.dataset.entlista; ENT.motivo = ''; renderEntrevistas(); return; }
  if (t.dataset.entf) { const [k, v] = t.dataset.entf.split('|'); ENT[k] = ENT[k] === v ? '' : v; renderEntrevistas(); return; }
  if (t.dataset.entficha) abrirFichaCand(t.dataset.entficha);
});
