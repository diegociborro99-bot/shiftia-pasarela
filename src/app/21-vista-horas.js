// ================= VISTA HORAS =================
// Contador mensual para pagar: lo que ha hecho cada persona en el mes (días, mañanas,
// tardes, partidos, horas, extras, festivos, domingos, nocturnas), su contrato
// prorrateado y el saldo; debajo, lo mismo por local. El mes de esta vista (S.hY/S.hM)
// va aparte del mes de la planilla: se mira la nómina de septiembre mientras se
// planifica octubre. Las horas las calcula modelo.js (horasEquipoMes); aquí solo se
// pintan. Las extras se apuntan a mano (S.extras) y el cierre del mes (S.cierres)
// guarda una copia de la tabla tal como estaba, para que la nómina no cambie sin que
// se sepa. Comparte con 14-impresiones.js y 15-export-xlsx.js: mesHoras,
// ordenPersonasMes, numHoras y puestoLbl (scope único; las funciones están hoisted).

const HORAS_ABIERTAS = new Set();   // filas desplegadas; sobreviven al repintado

function numHoras(h) { return (Math.round((+h || 0) * 10) / 10).toLocaleString('es-ES', { maximumFractionDigits: 1 }); }
function puestoLbl(p) {
  const base = (PUESTOS.find(x => x.id === p.puesto) || {}).label || '';
  return p.comodin ? `${base} · sin local fijo`.replace(/^ · /, '') : base;
}
// el mes de la vista; si aún no se ha elegido, el de la planilla en pantalla (y se recuerda)
function mesHoras() {
  if (!S.hY || !S.hM) { S.hY = S.y; S.hM = S.m; }
  return { y: S.hY, m: S.hM, k: claveMes(S.hY, S.hM), nombre: `${MESES[S.hM - 1]} ${S.hY}` };
}
// orden de las tablas: por nombre; quien está de baja en la fecha de referencia (el
// último día del mes) va al final, en gris
function ordenPersonasMes(isoRef) {
  const out = S.staff.map(p => ({ p, baja: deBaja(p, isoRef) }));
  out.sort((a, b) => (a.baja - b.baja) || a.p.nombre.localeCompare(b.p.nombre, 'es'));
  return out;
}
// huella de una tabla de horas: para saber si ha cambiado algo desde el cierre
function huellaHoras(tabla) { return JSON.stringify((tabla || []).map(f => [f.pid, f.dias, f.turnos, Math.round(f.minutos || 0), f.extrasMin || 0])); }

function renderHoras() {
  const { y, m, k, nombre } = mesHoras();
  const n = diasDelMes(y, m), finMes = isoDe(y, m, n);
  const filas = horasEquipoMes(S, S.staff, S.meses, y, m);
  const porPid = new Map(filas.map(f => [f.pid, f]));
  const orden = ordenPersonasMes(finMes);
  const cierre = (S.cierres || {})[k] || null;
  const supuestos = S.locales.filter(l => l.horarioSupuesto);
  const cierreAp = S.locales.filter(l => l.cierreAprox);
  const partidoSup = S.locales.filter(l => l.horarioPartidoSupuesto && l.horarioPartido && l.horarioPartido.M && l.horarioPartido.T);
  const durSup = S.locales.filter(l => l.duracionSupuesta && l.duracion && +l.duracion.M > 0);
  const extrasMes = (S.extras || []).filter(x => x.iso && x.iso.startsWith(k));
  const totHoras = filas.reduce((a, f) => a + f.horas, 0);
  const totExtras = filas.reduce((a, f) => a + f.extrasMin, 0) / 60;
  const conHoras = filas.filter(f => f.horas > 0).length;
  const mut = '<span class="cmut">·</span>';

  $('#hTitle').innerHTML = `<b>${MESES[m - 1]}</b> ${y}`;
  $('#hPrev').disabled = k <= MIN_MONTH;
  $('#hNext').disabled = k >= MAX_MONTH;
  $('#hStats').innerHTML = `<span class="dstat"><b>${fmtHoras(totHoras)}</b>del equipo</span>
    <span class="dstat"><b>${conHoras}</b>${conHoras === 1 ? 'persona con horas' : 'personas con horas'}</span>
    <span class="dstat${totExtras ? ' warn' : ''}"><b>${fmtHoras(totExtras)}</b>extras</span>
    <span class="dstat"><b>${fmtHoras(registroApoyos(S, S.staff, S.meses, y, m).reduce((a, r) => a + r.minutos, 0) / 60)}</b>de apoyos</span>
    <span class="dstat${cierre ? ' ok' : ''}"><b>${cierre ? 'Cerrado' : 'Abierto'}</b>${cierre ? 'para la nómina' : 'provisional'}</span>`;
  const bC = $('#hCerrar');
  bC.textContent = cierre ? 'Reabrir mes' : 'Cerrar mes';
  bC.classList.toggle('btn-cta', !cierre); bC.classList.toggle('btn-sec', !!cierre);
  bC.title = cierre ? `${nombre} está cerrado para la nómina: reabrirlo quita la copia guardada` : `Cerrar ${nombre} para la nómina: guarda la tabla tal como está y avisa si luego se toca`;

  let h = '';
  if (supuestos.length) {
    h += `<div class="haviso warn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.8 21.4 20H2.6Z"/><path d="M12 9.8v4.4"/><circle fill="currentColor" stroke="none" cx="12" cy="17" r="1.05"/></svg><span><b>Los horarios aún no están confirmados por el grupo: las horas son estimadas.</b> Falta confirmar ${supuestos.map(l => esc(l.nombre)).join(', ')}. Se ajustan en Equipo → Ajustes de los locales.</span></div>`;
  }
  if (!supuestos.length && (cierreAp.length || partidoSup.length || durSup.length)) {
    const l0 = partidoSup[0] || S.locales[0];
    const tp = l0 && l0.horarioPartido;
    const tpFin = tp && tp.porDow && tp.porDow[6] && tp.porDow[6].M && tp.porDow[6].T ? tp.porDow[6] : null;
    const dur = l0 && l0.duracion && +l0.duracion.M > 0 ? Math.round(+l0.duracion.M / 6) / 10 : null;
    h += `<div class="haviso info"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 11.3v5"/><circle fill="currentColor" stroke="none" cx="12" cy="8" r="1.05"/></svg><span><b>Se cuentan ${dur ? esc(fmtHoras(dur)) : 'las horas de apertura'} por turno.</b> El local abre ${esc(horarioTxt(l0, 'M'))} por la mañana y ${esc(horarioTxt(l0, 'T'))} por la tarde, pero cada persona hace su turno${dur ? ' de ' + esc(fmtHoras(dur)) : ''}.${tp ? ` Un <b>partido</b> son las mismas horas repartidas entre las dos franjas: entre semana ${esc(tramoTxt(tp))}${tpFin ? `, y el fin de semana ${esc(tramoTxt(tpFin))}` : ''}; quien abre una franja entra a la hora de abrir. Un <b>continuo</b> es un turno seguido y se cuenta una vez.` : ''}${cierreAp.length ? ' La hora de cierre es aproximada.' : ''} Se ajusta en Equipo → Ajustes de los locales, o casilla a casilla desde Hoy.</span></div>`;
  }
  if (cierre) {
    const cambiado = huellaHoras(cierre.tabla) !== huellaHoras(filas);
    h += `<div class="haviso ${cambiado ? 'warn' : 'ok'}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="10.5" width="16" height="10" rx="2.2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg><span><b>${esc(nombre)} está cerrado para la nómina</b> desde el ${new Date(cierre.ts).toLocaleDateString('es-ES')}${cierre.usuario ? ' (' + esc(cierre.usuario) + ')' : ''}.${cambiado ? ' <b>Ha cambiado algo después del cierre</b>: revisa el historial antes de pagar.' : ' La tabla coincide con la copia guardada.'}</span><button class="btn-mini ghost" type="button" data-reabrir>Reabrir</button></div>`;
  }

  // ---- tabla persona × columnas ----
  h += `<div class="tablewrap card"><div class="tscroll"><table class="htab"><thead><tr>
    <th>Persona</th><th class="num">Días</th><th class="num">Mañanas</th><th class="num">Tardes</th><th class="num">Partidos</th>
    <th class="num" title="Turnos + extras">Horas</th><th class="num">Extras (h)</th><th class="num" title="Días de vacaciones del mes (para la nómina)">Vacaciones</th><th class="num opt" title="Días trabajados en festivo">Festivos</th><th class="num opt" title="Domingos trabajados">Domingos</th><th class="num opt" title="Horas entre las 22:00 y las 06:00">Nocturnas (h)</th>
    <th class="num" title="Horas semanales del contrato prorrateadas al mes, descontadas las ausencias">Contrato (h)</th><th class="num" title="Horas − contrato">Saldo (h)</th></tr></thead><tbody>`;
  const tot = { dias: 0, mananas: 0, tardes: 0, partidos: 0, horas: 0, extras: 0, festivas: 0, domingos: 0, noct: 0, vac: 0, contrato: 0, saldo: 0, conContrato: 0 };
  for (const { p, baja } of orden) {
    const f = porPid.get(p.id); if (!f) continue;
    tot.dias += f.dias; tot.mananas += f.mananas; tot.tardes += f.tardes; tot.partidos += f.partidos; tot.horas += f.horas; tot.extras += f.extrasMin / 60;
    tot.festivas += f.festivas; tot.domingos += f.domingos; tot.noct += f.horasNocturnas; tot.vac += f.vacaciones;
    if (f.contratoHoras !== null) { tot.contrato += f.contratoHoras; tot.saldo += f.saldo; tot.conContrato++; }
    const abierta = HORAS_ABIERTAS.has(p.id);
    const sc = f.saldo === null ? '' : f.saldo > 0 ? 'pos' : f.saldo < 0 ? 'neg' : '';
    h += `<tr class="hrow${baja ? ' baja' : ''}${abierta ? ' open' : ''}" data-hx="${esc(p.id)}" role="button" tabindex="0" aria-expanded="${abierta}" title="Ver el desglose por local y las extras">
      <td class="per"><span class="av" style="background:${avColor(p.id)}">${esc(initials(p.nombre))}</span><span class="pn2"><b>${esc(p.nombre)}</b><small>${baja ? 'de baja' : esc(puestoLbl(p)) || '&nbsp;'}</small></span><span class="caret" aria-hidden="true">›</span></td>
      <td class="num">${f.dias || mut}</td><td class="num">${f.mananas || mut}</td><td class="num">${f.tardes || mut}</td><td class="num">${f.partidos || mut}</td>
      <td class="num hh"><b>${numHoras(f.horas)}</b></td>
      <td class="num">${f.extrasMin ? numHoras(f.extrasMin / 60) : mut}</td>
      <td class="num${f.vacaciones ? ' vac' : ''}" ${f.vacaciones ? `title="${esc(f.vacacionesDias.map(fmtDM).join(', '))}"` : ''}>${f.vacaciones || mut}</td>
      <td class="num opt">${f.festivas || mut}</td><td class="num opt">${f.domingos || mut}</td><td class="num opt">${f.nocturnosMin ? numHoras(f.horasNocturnas) : mut}</td>
      <td class="num">${f.contratoHoras === null ? '<span class="cmut" title="Sin horas de contrato en la ficha">—</span>' : numHoras(f.contratoHoras)}</td>
      <td class="num saldo ${sc}">${f.saldo === null ? '<span class="cmut">—</span>' : (f.saldo > 0 ? '+' : '') + numHoras(f.saldo)}</td>
    </tr>`;
    h += `<tr class="hdet" data-hdet="${esc(p.id)}"${abierta ? '' : ' hidden'}><td colspan="12">${detalleHoras(p, f, extrasMes)}</td></tr>`;
  }
  h += `</tbody><tfoot><tr><td>Total · ${pl(orden.length, 'persona', 'personas')}</td><td class="num">${tot.dias}</td><td class="num">${tot.mananas}</td><td class="num">${tot.tardes}</td><td class="num">${tot.partidos}</td><td class="num hh"><b>${numHoras(tot.horas)}</b></td><td class="num">${numHoras(tot.extras)}</td><td class="num">${tot.vac || ''}</td><td class="num opt">${tot.festivas}</td><td class="num opt">${tot.domingos}</td><td class="num opt">${numHoras(tot.noct)}</td><td class="num">${tot.conContrato ? numHoras(tot.contrato) : '—'}</td><td class="num saldo ${tot.saldo > 0 ? 'pos' : tot.saldo < 0 ? 'neg' : ''}">${tot.conContrato ? (tot.saldo > 0 ? '+' : '') + numHoras(tot.saldo) : '—'}</td></tr></tfoot></table></div></div>`;
  h += '<p class="hfoot">Horas = turnos + extras. Contrato = horas semanales de la ficha × días del mes, descontados los días de ausencia. Saldo = horas − contrato. Festivos y domingos cuentan días trabajados; nocturnas, las horas entre las 22:00 y las 06:00. Pulsa una fila para ver el desglose por local y sus extras.</p>';

  // ---- registro de apoyos (José, 18/09: «los apoyos son los extras que hay que pagarle») ----
  // cada apoyo con sus días: en qué bar, de qué hora a qué hora y cuántas horas. Las horas
  // son las mismas que arriba (las calcula el mismo modelo); aquí se ven día a día para pagar.
  const reg = registroApoyos(S, S.staff, S.meses, y, m);
  const totApoyos = reg.reduce((a, r) => a + r.minutos, 0) / 60;
  const sinAjustar = reg.reduce((a, r) => a + r.sinHoras, 0);
  h += `<div class="hsub"><span class="micro">Registro de apoyos</span></div><div class="tablewrap card hapoyos"><div class="tscroll"><table class="htab hapt"><thead><tr><th>Apoyo</th><th>Día</th><th>Bar</th><th>De · a</th><th class="num">Horas</th></tr></thead>`;
  for (const r of reg) {
    const p = personaDeId(r.pid) || { id: r.pid, nombre: r.nombre };
    h += `<tbody data-apoyo="${esc(r.pid)}"><tr class="hgrp"><td class="per"><span class="av" style="background:${avColor(p.id)}">${esc(initials(p.nombre))}</span><span class="pn2"><b>${esc(p.nombre)}</b><small>${r.dias.length ? pl(r.dias.length, 'día', 'días') : 'sin turnos este mes'}${r.sinHoras ? ` · ${r.sinHoras} sin ajustar` : ''}</small></span></td><td colspan="3"></td><td class="num hh"><b>${r.dias.length ? numHoras(r.horas) : mut}</b></td></tr>`;
    for (const d of r.dias) for (const t of d.tramos) {
      h += `<tr class="hdia"><td></td><td class="hor"><b>${fmtDM(d.iso)}</b> <small>${esc(DIAS_L[isoDow(d.iso)].slice(0, 3).toLowerCase())}</small></td><td class="per"><span class="hlocdot" style="--lc:${esc(colorLocal(t.localId))}"></span>${esc(nombreLocal(t.localId))} <small>${FRANJA_LBL[t.franja].toLowerCase()}</small></td><td class="hor">${t.ini ? `${esc(t.ini)}–${esc(t.fin)}` : '—'}${t.aMano ? '' : '<span class="hsup" title="No se ajustaron las horas: cuenta el turno entero del local">sin ajustar</span>'}</td><td class="num">${numHoras(t.minutos / 60)}</td></tr>`;
    }
    h += '</tbody>';
  }
  h += `<tfoot><tr><td>Total · ${pl(reg.length, 'apoyo', 'apoyos')}</td><td colspan="3">${sinAjustar ? `<span class="hsup">${sinAjustar} sin ajustar</span> cuentan el turno entero del local` : reg.some(r => r.dias.length) ? 'todas las horas ajustadas' : ''}</td><td class="num hh"><b>${numHoras(totApoyos)}</b></td></tr></tfoot></table></div></div>`;
  h += '<p class="hfoot">Los apoyos se pagan por horas: cada día lleva de qué hora a qué hora, y se ajusta desde Hoy o Semana tocando a la persona → «Ajustar apoyo». Un tramo sin ajustar cuenta el turno entero del local. En el papel del bar no salen horas.</p>';

  // ---- por local ----
  const locs = horasLocalMes(S, S.staff, S.meses, y, m);
  h += `<div class="hsub"><span class="micro">Por local</span></div><div class="tablewrap card"><div class="tscroll"><table class="htab hloct"><thead><tr><th>Local</th><th class="num">Turnos</th><th class="num">Horas</th><th class="num">Personas</th><th>Horario</th></tr></thead><tbody>`;
  for (const x of locs) {
    const l = localDe(S, x.localId);
    h += `<tr><td class="per"><span class="hlocdot" style="--lc:${esc(l ? l.color : '#888')}"></span><b>${esc(x.nombre)}</b></td><td class="num">${x.turnos || mut}</td><td class="num hh"><b>${numHoras(x.horas)}</b></td><td class="num">${x.personas || mut}</td><td class="hor">M ${esc(horarioTxt(l, 'M')) || '—'} · T ${esc(horarioTxt(l, 'T')) || '—'}${l && l.horarioSupuesto ? '<span class="hsup">por confirmar</span>' : ''}</td></tr>`;
  }
  h += `</tbody><tfoot><tr><td>Total</td><td class="num">${locs.reduce((a, x) => a + x.turnos, 0)}</td><td class="num hh"><b>${numHoras(locs.reduce((a, x) => a + x.horas, 0))}</b></td><td></td><td></td></tr></tfoot></table></div></div>`;

  $('#horasRoot').innerHTML = h;
  $('#hStats').querySelectorAll('.dstat b').forEach(countUp);
}
// desglose de una persona: turnos y horas por local, y sus extras del mes (con ✕ para quitar)
function detalleHoras(p, f, extrasMes) {
  const locs = Object.entries(f.porLocal).sort((a, b) => b[1].minutos - a[1].minutos);
  const mias = extrasMes.filter(x => x.pid === p.id).sort((a, b) => (a.iso < b.iso ? -1 : a.iso > b.iso ? 1 : 0));
  let h = `<div class="hdgrid"><div><span class="micro">Por local</span><div class="hlocs">${locs.length
    ? locs.map(([lid, v]) => `<span class="hloc" style="--lc:${colorLocal(lid)}"><b>${esc(nombreLocal(lid))}</b><span>${pl(v.turnos, 'turno', 'turnos')} · ${numHoras(v.minutos / 60)} h</span></span>`).join('')
    : '<span class="hnota">Sin turnos este mes</span>'}</div>`;
  const notas = [];
  if (f.ausencias) notas.push(`${pl(f.ausencias, 'día', 'días')} de ausencia (no cuentan para el contrato)`);
  if (f.continuos) notas.push(`${pl(f.continuos, 'día de turno continuo', 'días de turno continuo')} (un turno seguido, se cuenta una vez)`);
  if (f.forzados) notas.push(`${pl(f.forzados, 'asignación forzada', 'asignaciones forzadas')} a mano`);
  if (notas.length) h += `<p class="hnota">${notas.join(' · ')}</p>`;
  h += `</div><div><span class="micro">Horas extra</span><div class="hxtras">${mias.length
    ? mias.map(x => `<span class="hx"><b>${fmtDM(x.iso)}</b><span>${numHoras((+x.min || 0) / 60)} h</span><em>${esc(x.motivo || '')}</em><button class="hxdel" type="button" data-xdel="${esc(x.id)}" title="Quitar esta hora extra" aria-label="Quitar la hora extra del ${fmtDM(x.iso)}">✕</button></span>`).join('')
    : '<span class="hnota">Ninguna este mes</span>'}</div><button class="btn-mini ghost" type="button" data-xadd="${esc(p.id)}">＋ Hora extra a ${esc(nombreCorto(p.nombre))}</button></div>
    ${f.vacaciones || f.libres ? `<div class="hdet-b"><span class="micro">AUSENCIAS DEL MES</span><div class="hausl">
      ${f.vacaciones ? `<span class="hausx vac"><b>${f.vacaciones} ${f.vacaciones === 1 ? 'día' : 'días'} de vacaciones</b><small>${esc(f.vacacionesDias.map(fmtDM).join(' · '))}</small></span>` : ''}
      ${f.libres ? `<span class="hausx"><b>${f.libres} ${f.libres === 1 ? 'día libre' : 'días libres'}</b><small>${esc(f.libresDias.map(fmtDM).join(' · '))}</small></span>` : ''}
    </div></div>` : ''}</div>`;
  return h;
}
// despliega o pliega una fila sin repintar toda la tabla
function toggleFilaHoras(pid) {
  const root = $('#horasRoot');
  const row = root.querySelector(`[data-hx="${CSS.escape(pid)}"]`), det = root.querySelector(`[data-hdet="${CSS.escape(pid)}"]`);
  if (!row || !det) return;
  const abrir = !HORAS_ABIERTAS.has(pid);
  if (abrir) HORAS_ABIERTAS.add(pid); else HORAS_ABIERTAS.delete(pid);
  row.classList.toggle('open', abrir);
  row.setAttribute('aria-expanded', String(abrir));
  det.hidden = !abrir;
}

// ---------- horas extra ----------
function openExtra(pid) {
  const { y, m, k } = mesHoras();
  const hoy = isoHoy();
  // fecha por defecto: hoy si la vista está en el mes en curso; si no, el día 1 del mes que se mira
  const fecha = hoy.slice(0, 7) === k ? hoy : isoDe(y, m, 1);
  const personas = S.staff.slice().sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  const sel = pid && personas.some(p => p.id === pid) ? pid : (personas[0] ? personas[0].id : '');
  const html = `<span class="micro">HORA EXTRA</span>
    <h2 class="revh2">Apuntar una hora extra</h2>
    <p class="revsub">Se suma a las horas del mes de esa persona: sale en el contador, en el Excel y en la impresión.</p>
    <div class="xform">
      <label>Persona<select id="xPid">${personas.map(p => `<option value="${esc(p.id)}"${p.id === sel ? ' selected' : ''}>${esc(p.nombre)}${deBaja(p) ? ' (de baja)' : ''}</option>`).join('')}</select></label>
      <label>Fecha<input type="date" id="xIso" value="${fecha}"></label>
      <div class="row2">
        <label>Horas<input type="number" id="xH" min="0" max="16" step="1" value="1" inputmode="numeric"></label>
        <label>Minutos<select id="xMin"><option value="0">0</option><option value="15">15</option><option value="30">30</option><option value="45">45</option></select></label>
      </div>
      <label>Motivo<input type="text" id="xMotivo" maxlength="120" placeholder="Cerró tarde · refuerzo por el partido · cubrió a…"></label>
      <div class="bar"><button class="btn btn-sec" type="button" data-ovx>Cancelar</button><button class="btn btn-cta" type="button" id="xGuardar">Guardar</button></div>
    </div>`;
  const ov = abrirOverlay('extraOvl', html, { ancho: 460 });
  const guardar = () => {
    const p = personaDeId(ov.querySelector('#xPid').value);
    const iso = ov.querySelector('#xIso').value;
    const min = Math.max(0, Math.round(+ov.querySelector('#xH').value || 0)) * 60 + (+ov.querySelector('#xMin').value || 0);
    const motivo = ov.querySelector('#xMotivo').value.trim();
    if (!p) { toast('Elige a la persona', 'warn'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) { toast('Pon la fecha', 'warn'); return; }
    if (!min) { toast('Pon cuánto tiempo: al menos 15 minutos', 'warn'); return; }
    if (!confirmarSiCerrado(iso)) return;
    pushUndo('hora extra', { extras: true });
    const x = { id: 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), pid: p.id, iso, min, motivo, ts: Date.now() };
    (S.extras = S.extras || []).push(x);
    registrarCambio(`Hora extra: ${p.nombre} · ${fmtDM(iso)} · ${numHoras(min / 60)} h${motivo ? ' · ' + motivo : ''}`, 'extra');
    if (mesCerrado(iso)) registrarCambio(`Hora extra en un mes cerrado (${iso.slice(0, 7)})`, 'aviso');
    // la vista salta al mes de la extra y deja la fila desplegada: se ve apuntada
    S.hY = +iso.slice(0, 4); S.hM = +iso.slice(5, 7); HORAS_ABIERTAS.add(p.id);
    saveState();
    ov.remove();
    renderHoras();
    toast(`${numHoras(min / 60)} h extra apuntadas a ${p.nombre}`, 'ok');
  };
  ov.querySelector('#xGuardar').addEventListener('click', guardar);
  ov.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('input')) { e.preventDefault(); guardar(); } });
  setTimeout(() => { const f = ov.querySelector(pid ? '#xH' : '#xPid'); if (f) f.focus(); }, 50);
}
function quitarExtra(id) {
  const x = (S.extras || []).find(e => e.id === id);
  if (!x) return;
  if (!confirmarSiCerrado(x.iso)) return;
  if (!confirm(`¿Quitar la hora extra de ${nombrePid(x.pid)} del ${fmtDM(x.iso)} (${numHoras((+x.min || 0) / 60)} h)?`)) return;
  pushUndo('quitar hora extra', { extras: true });
  S.extras = S.extras.filter(e => e.id !== id);
  registrarCambio(`Hora extra quitada: ${nombrePid(x.pid)} · ${fmtDM(x.iso)} · ${numHoras((+x.min || 0) / 60)} h${x.motivo ? ' · ' + x.motivo : ''}`, 'extra');
  if (mesCerrado(x.iso)) registrarCambio(`Cambio en un mes cerrado (${x.iso.slice(0, 7)})`, 'aviso');
  saveState(); renderHoras();
  toast('Hora extra quitada', 'ok');
}

// ---------- cierre del mes para la nómina ----------
function cerrarMes() {
  const { y, m, k, nombre } = mesHoras();
  if (S.cierres && S.cierres[k]) { toast(`${nombre} ya está cerrado`, 'warn'); return; }
  if (!confirm(`¿Cerrar ${nombre} para la nómina?\n\nSe guarda una copia de la tabla de horas tal como está ahora. Si después se toca algo de ese mes, la app pide confirmación y lo deja en el historial.`)) return;
  S.cierres = S.cierres || {};
  S.cierres[k] = { ts: Date.now(), usuario: (typeof SRV !== 'undefined' && SRV.on && SRV.usuario) || 'local', tabla: horasEquipoMes(S, S.staff, S.meses, y, m) };
  registrarCambio(`${nombre} cerrado para la nómina`, 'cierre');
  saveState(); renderHoras();
  toast(`${nombre} cerrado para la nómina`, 'ok');
}
function reabrirMes() {
  const { k, nombre } = mesHoras();
  const c = S.cierres && S.cierres[k];
  if (!c) { toast(`${nombre} no está cerrado`, 'warn'); return; }
  const cuando = new Date(c.ts).toLocaleDateString('es-ES');
  if (!confirm(`¿Reabrir ${nombre}? Se cerró el ${cuando}${c.usuario ? ' (' + c.usuario + ')' : ''}. Se quita la copia guardada y el mes vuelve a ser provisional.`)) return;
  delete S.cierres[k];
  registrarCambio(`${nombre} reabierto (estaba cerrado desde el ${cuando}${c.usuario ? ' por ' + c.usuario : ''})`, 'cierre');
  saveState(); renderHoras();
  toast(`${nombre} reabierto`, 'ok');
}

// ---------- navegación y botones ----------
function moverMesHoras(dir) {
  const { y, m } = mesHoras();
  let ny = y, nm = m + dir;
  if (nm < 1) { nm = 12; ny--; }
  if (nm > 12) { nm = 1; ny++; }
  const k = claveMes(ny, nm);
  if (k < MIN_MONTH || k > MAX_MONTH) return;
  S.hY = ny; S.hM = nm;
  HORAS_ABIERTAS.clear();
  saveState(); renderHoras();
}
{
  const on = (sel, f) => { const b = $(sel); if (b) b.addEventListener('click', f); };
  on('#hPrev', () => moverMesHoras(-1));
  on('#hNext', () => moverMesHoras(1));
  on('#hExtra', () => openExtra());
  on('#hExcel', () => exportarExcelHoras());
  on('#hVac', () => abrirVacacionesAno());
  on('#hPrint', () => abrirImpresionHoras());
  on('#hCerrar', () => { const { k } = mesHoras(); if (S.cierres && S.cierres[k]) reabrirMes(); else cerrarMes(); });
  const root = $('#horasRoot');
  if (root) {
    // una sola delegación: la tabla se repinta entera con cada cambio
    root.addEventListener('click', e => {
      const del = e.target.closest('[data-xdel]'); if (del) { quitarExtra(del.dataset.xdel); return; }
      const add = e.target.closest('[data-xadd]'); if (add) { openExtra(add.dataset.xadd); return; }
      if (e.target.closest('[data-reabrir]')) { reabrirMes(); return; }
      const row = e.target.closest('[data-hx]'); if (row) toggleFilaHoras(row.dataset.hx);
    });
    root.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-hx]')) { e.preventDefault(); toggleFilaHoras(e.target.dataset.hx); }
    });
  }
}

// ---------- vacaciones de toda la plantilla en el año (José, 17/09) ----------
// «Un enlace rápido con las vacaciones de la gente de todo el año» para pasarlas a nómina.
function abrirVacacionesAno(ano) {
  const y = ano || S.hY || S.y;
  const filas = vacacionesAno(S.staff, y);
  const total = filas.reduce((a, x) => a + x.total, 0);
  const mesCorto = m => MESES[m].slice(0, 3);
  const ov = abrirOverlay('vacOvl', `<span class="micro">NÓMINA</span>
    <h2 class="revh2">Vacaciones de ${y}</h2>
    <p class="revsub">Los días de vacaciones de cada persona, mes a mes. Pasa el ratón por un número para ver las fechas. Se cuenta lo que hay registrado como <b>vacaciones</b> en la ficha o desde el gestor de cobertura.</p>
    <div class="vacacts">
      <button class="btn-mini ghost" data-vy="${y - 1}">‹ ${y - 1}</button>
      <button class="btn-mini ghost" data-vy="${y + 1}">${y + 1} ›</button>
      <span class="vacsp"></span>
      <span class="vactot"><b>${total}</b> ${total === 1 ? 'día' : 'días'} · ${filas.length} ${filas.length === 1 ? 'persona' : 'personas'}</span>
      <button class="btn-mini" data-vexcel>Excel</button>
    </div>
    ${filas.length ? `<div class="tscroll"><table class="htab vactab"><thead><tr><th>Persona</th>${MESES.map((m, i) => `<th class="num">${esc(mesCorto(i))}</th>`).join('')}<th class="num">Total</th></tr></thead><tbody>
      ${filas.map(f => `<tr><td class="per"><span class="av" style="background:${avColor(f.pid)}">${esc(initials(f.nombre))}</span><b>${esc(f.nombre)}</b></td>
        ${f.meses.map(d => `<td class="num${d.length ? ' vac' : ''}"${d.length ? ` title="${esc(d.map(fmtDM).join(', '))}"` : ''}>${d.length || '<span class="cmut">·</span>'}</td>`).join('')}
        <td class="num hh"><b>${f.total}</b></td></tr>`).join('')}
    </tbody></table></div>` : '<div class="entzero"><b>Nadie tiene vacaciones registradas en ' + y + '.</b><span>Se registran desde la ficha de la persona o marcando «Vacaciones» en el gestor de cobertura.</span></div>'}`, { ancho: 900 });
  ov.addEventListener('click', e => {
    const b = e.target.closest('[data-vy],[data-vexcel]');
    if (!b) return;
    if (b.dataset.vy) { ov.remove(); abrirVacacionesAno(+b.dataset.vy); return; }
    exportarVacacionesAno(y, filas);
  });
}
async function exportarVacacionesAno(y, filas) {
  await asegurarXlsx();
  const aoa = [[`GRUPO PASARELA · Vacaciones de ${y}`], [],
    ['PERSONA', ...MESES.map(m => m.toUpperCase()), 'TOTAL (días)', 'FECHAS']];
  for (const f of filas) aoa.push([f.nombre, ...f.meses.map(d => d.length || ''), f.total, f.fechas.map(fmtDM).join(' · ')]);
  aoa.push(['TOTAL', ...Array.from({ length: 12 }, (_, i) => filas.reduce((a, f) => a + f.meses[i].length, 0) || ''), filas.reduce((a, f) => a + f.total, 0), '']);
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 22 }, ...Array.from({ length: 12 }, () => ({ wch: 6 })), { wch: 12 }, { wch: 60 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Vacaciones ${y}`);
  XLSX.writeFile(wb, `Vacaciones_${y}.xlsx`);
  toast('Vacaciones del año exportadas', 'ok');
}
