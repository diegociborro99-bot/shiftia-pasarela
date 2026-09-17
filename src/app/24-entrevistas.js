// ================= ENTREVISTAS Y ALERTA INTERNA =================
// Dos menús bien distinguidos, como pidió José el 17/09: «Entrevistas» con toda la base
// del grupo y «Alerta interna» con quien pide cita y no acude o ha dado problemas. Cada
// candidato lleva dos etiquetas —el puesto al que opta y la valoración— y se filtra por
// las dos a la vez («cocinero bien», «camarera en espera»…), con buscador por nombre o
// teléfono y una ficha por cajetines para registrar y editar.
const ENT = { lista: 'ent', q: '', puesto: '', val: '', motivo: '', hab: '', abierta: null };

// El icono de cada etiqueta, los mismos que el grupo usa en su base de Notion
const ICO_CAND = { cocina: () => SVG_COCINA, camarero: () => SVG_CAMARERO, bien: () => SVG_BIEN, mal: () => SVG_MAL, espera: () => SVG_ESPERA, veto: () => SVG_VETO,
  cafetera: () => SVG_CAFETERA, barril: () => SVG_BARRIL, jamon: () => SVG_JAMON, tpv: () => SVG_TPV, pda: () => SVG_PDA };
const icoCand = k => (ICO_CAND[k] ? ICO_CAND[k]() : '');
const icoPuesto = p => { const x = PUESTOS_CAND.find(v => v.id === p); return x ? icoCand(x.ico) : ''; };
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
    ${chip('puesto', '', 'Todos', r.total)}${PUESTOS_CAND.map(x => chip('puesto', x.id, x.corto, undefined, icoCand(x.ico))).join('')}${chip('puesto', 'ninguno', 'Sin puesto', r.sinPuesto)}</div>`;
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
      <button class="btn-cta" id="entNuevo">+ Registrar</button>
    </div>
  </div>
  <div class="entfiltros">${puestoChips}${valChips}${motChips}${Object.values(r.hab).some(Boolean) ? habChips : ''}</div>
  <div class="entcount">${vistos.length === r.total ? `${r.total} ${r.total === 1 ? 'persona' : 'personas'}` : `${vistos.length} de ${r.total}`}${ENT.q || ENT.puesto || ENT.val || ENT.motivo || ENT.hab ? ' <button class="btn-mini ghost" id="entLimpiar">Quitar filtros</button>' : ''}</div>
  <div class="entlist">${vistos.length ? vistos.map(filaCand).join('') : `<div class="entzero"><b>No hay nadie con esos filtros.</b><span>Prueba a quitarlos o registra a alguien nuevo.</span></div>`}</div>`;

  $('#entQ').oninput = e => { ENT.q = e.target.value; pintaListaEnt(); };
  $('#entNuevo').onclick = () => abrirFichaCand(null);
  const lim = $('#entLimpiar'); if (lim) lim.onclick = () => { ENT.q = ENT.puesto = ENT.val = ENT.motivo = ENT.hab = ''; renderEntrevistas(); };
}
// repinta solo la lista al teclear, para no perder el foco del buscador
function pintaListaEnt() {
  const vistos = filtrarCandidatos(candidatos(), { lista: ENT.lista, q: ENT.q, puesto: ENT.puesto, val: ENT.val, motivo: ENT.motivo, hab: ENT.hab });
  const tot = resumenCandidatos(candidatos(), ENT.lista).total;
  $('#entrevistasRoot .entlist').innerHTML = vistos.length ? vistos.map(filaCand).join('') : `<div class="entzero"><b>No hay nadie con esos filtros.</b><span>Prueba a quitarlos o registra a alguien nuevo.</span></div>`;
  $('#entrevistasRoot .entcount').firstChild.textContent = vistos.length === tot ? `${tot} ${tot === 1 ? 'persona' : 'personas'}` : `${vistos.length} de ${tot}`;
}
function filaCand(c) {
  const v = VAL_LBL[c.val];
  const mot = c.motivo && MOTIVOS_ALERTA.find(m => m.id === c.motivo);
  const habs = HABILIDADES.filter(h => (c.hab || {})[h.id] === 'si');
  return `<button class="entrow" data-entficha="${esc(c.id)}">
    <span class="entav" style="--pc:${avColor(c.id)}">${esc(initials(nombreCand(c)))}</span>
    <span class="enttxt"><b>${esc(nombreCand(c))}${tieneEntrevista(c) ? '<i class="entok" title="Entrevista contestada">●</i>' : ''}</b><small>${c.tel ? esc(telBonito(c.tel)) : 'sin teléfono'}${c.edad ? ' · ' + esc(c.edad) + ' años' : ''}${c.zona ? ' · ' + esc(c.zona.split(/[,.]/)[0].slice(0, 22)) : ''}</small></span>
    <span class="entetq">
      <em class="entp p-${esc(c.puesto || 'no')}">${icoPuesto(c.puesto)}${c.puesto === 'cocina' ? 'Cocina' : c.puesto === 'sala' ? 'Sala' : 'Sin puesto'}</em>
      ${v ? `<em class="entv v-${esc(v.id)}">${icoVal(v.id)}${esc(v.label)}</em>` : '<em class="entv v-no">Sin valorar</em>'}
      ${mot ? `<em class="entm">${esc(mot.label)}</em>` : ''}
    </span>
    ${habs.length ? `<span class="enthab" title="${esc(habs.map(h => h.label).join(', '))}">${habs.map(h => icoCand(h.ico)).join('')}</span>` : ''}
    </button>`;
}

// ---------- ficha de un candidato (cajetines) ----------
function abrirFichaCand(id) {
  const nuevo = !id;
  const c = nuevo ? { id: nuevoIdCand(), nombre: '', tel: '', puesto: null, val: null, motivo: null, nota: '', hab: {}, lista: ENT.lista } : candidatoDe(id);
  if (!c) return;
  const tmpHab = Object.assign({}, c.hab || {});
  const seg = (k, opts) => `<div class="segrow">${opts.map(o => `<button type="button" class="segk${(c[k] || '') === o.id ? ' on' : ''}" data-cset="${k}|${esc(o.id)}">${o.ico ? icoCand(o.ico) : ''}${esc(o.label)}</button>`).join('')}</div>`;
  const ov = abrirOverlay('candOvl', `
    <span class="micro">${nuevo ? 'ENTREVISTAS' : esc((LISTAS_CAND.find(l => l.id === c.lista) || {}).label || '')}</span>
    <h2 class="revh2">${nuevo ? 'Registrar candidato' : esc(nombreCand(c))}</h2>
    <div class="candform">
      <label class="pinlbl">Nombre<input class="logininp" data-cin="nombre" value="${esc(c.nombre || '')}" placeholder="Nombre y apellidos" autocomplete="off"></label>
      <label class="pinlbl">Teléfono<input class="logininp" data-cin="tel" inputmode="tel" value="${esc(c.tel || '')}" placeholder="600 00 00 00" autocomplete="off"></label>
      <div class="pinlbl">Puesto al que opta</div>
      ${seg('puesto', PUESTOS_CAND.map(x => ({ id: x.id, label: x.label, ico: x.ico })).concat([{ id: '', label: 'Sin decidir' }]))}
      <div class="pinlbl">Valoración</div>
      ${seg('val', VALORACIONES.concat([{ id: '', label: 'Sin valorar' }]))}
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
        ${CAMPOS_ENTREVISTA.map(x => `<label class="pinlbl${x.largo ? ' ancho' : ''}">${esc(x.label)}${x.largo
          ? `<textarea class="logininp" data-cin="${x.k}" rows="${(c[x.k] || '').length > 160 ? 5 : 2}" placeholder="—">${esc(c[x.k] || '')}</textarea>`
          : `<input class="logininp" data-cin="${x.k}" value="${esc(c[x.k] || '')}" placeholder="—">`}</label>`).join('')}
      </div>
      <label class="pinlbl">Notas<textarea class="logininp" data-cin="nota" rows="3" placeholder="Lo que quieras recordar de esta persona">${esc(c.nota || '')}</textarea></label>
      <div class="candpie">
        ${nuevo ? '' : `<button type="button" class="btn-mini ghost danger" data-cdel>Borrar de la base</button>`}
        <span class="candsp"></span>
        <button type="button" class="btn-sec" data-ovx>Cancelar</button>
        <button type="button" class="btn-cta" data-cok>${nuevo ? 'Registrar' : 'Guardar'}</button>
      </div>
    </div>`);

  const tmp = Object.assign({}, c);
  ov.addEventListener('click', ev => {
    const b = ev.target.closest('[data-cset],[data-cok],[data-cdel],[data-chab]');
    if (!b) return;
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
    tmp.tel = telLimpio(tmp.tel);
    if (!tmp.nombre && !tmp.tel) { alert('Pon al menos un nombre o un teléfono.'); return; }
    if (tmp.lista !== 'alerta') tmp.motivo = null;
    if (nuevo) { tmp.fecha = tmp.fecha || fmtLargo(isoHoy()); candidatos().push(tmp); }
    else Object.assign(c, tmp);
    ENT.lista = tmp.lista;
    ov.remove();
    guardarCand(`${nuevo ? 'Candidato registrado' : 'Candidato actualizado'}: ${nombreCand(tmp)} (${etiquetaCandidato(tmp)})`);
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
