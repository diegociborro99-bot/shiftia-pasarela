// ================= VISTA SEMANA =================
// El cuadrante que el grupo conoce: una fila por local y franja (8 filas) y siete
// columnas, con los nombres en el orden de la casilla (el 1.º abre, la cocina con
// su marca) y el pie de descansos. Editable: cada bloque abre el menú y el ＋ el selector.
// «19:00» → «19», «11:30» se queda: en la casilla de la semana no cabe más
function horaCorta(h) { return String(h || '').replace(/:00$/, ''); }
function renderSemana() {
  if (!S.semLunes) S.semLunes = mondayOf(isoDia());
  const lunes = S.semLunes, fin = addDias(lunes, 6);
  const hoy = isoHoy();
  const cols = [];
  for (let k = 0; k < 7; k++) { const iso = addDias(lunes, k); cols.push({ iso, dow: isoDow(iso), d: +iso.slice(8, 10), e: estadoDeIso(iso), evs: eventosDe(S, iso) }); }
  const m1 = +lunes.slice(5, 7), m2 = +fin.slice(5, 7);
  const lunesHoy = mondayOf(hoy);
  $('#wTitle').innerHTML = `<b>${+lunes.slice(8, 10)}${m1 !== m2 ? ' ' + MES3[m1 - 1] : ''} – ${+fin.slice(8, 10)} de ${MESES[m2 - 1].toLowerCase()}</b> <small>${fin.slice(0, 4)}</small>${lunes === lunesHoy ? ' <span class="dchip dc-hoy">ESTA SEMANA</span>' : ` <span class="dchip dc-otro" title="Hoy es ${esc(fmtLargo(hoy))}">${esc(distanciaHoy(lunes))}</span>`}`;
  $('#wHoy').classList.toggle('lejos', lunes !== lunesHoy);
  let cortos = 0, sinCocina = 0, forzados = 0, turnos = 0;
  const celda = (c, tid) => {
    if (!turnoAbierto(S, c.e, c.iso, tid)) return `<td class="${c.dow >= 6 ? 'wk' : ''}${c.iso === hoy ? ' hoyc' : ''}"><span class="wcerr">cerrado</span></td>`;
    const lista = asignados(c.e, c.iso, tid);
    const r = revisarTurno(S, S.staff, c.e, c.iso, tid);
    if (r.faltan) cortos++; if (r.sinCocina) sinCocina++; forzados += r.forzados; turnos += lista.length;
    const bloques = posicionesDe(S, S.staff, c.e, c.iso, tid).map(x => x.hueco ? `<button class="wav whueco" data-pick="${c.iso}|${tid}" data-tipstr="${esc('Hueco disponible: ' + (x.motivo || ''))}" aria-label="Hueco disponible">1·?</button>` : `<button class="wav${x.abre ? ' abre' : ''}${x.cocina ? ' cocina' : ''}${x.forzado ? ' forzado' : ''}${x.comodin ? ' comodin' : ''}" style="--pc:${avColor(x.pid)}" data-wpers="${c.iso}|${tid}|${x.pid}" data-tipstr="${esc(x.pos + '. ' + x.nombre + (x.abre ? (x.abreFijo ? ' · sale el primero (fijo)' : ' · abre') : '') + (x.cocina ? ' · cocina' : '') + (x.continuo ? ' · turno continuo' : x.partido ? ' · partido' : '') + (x.por ? ' · por ' + nombrePid(x.por) : '') + (x.nota ? ' · ' + x.nota : ''))}">${esc(nombreCorto(x.nombre))}${x.partido ? '<sup>P</sup>' : x.continuo ? '<sup>C</sup>' : ''}${x.tramo ? `<small class="wtr">${esc(horaCorta(x.tramo.ini))}–${esc(horaCorta(x.tramo.fin))}</small>` : ''}</button>`).join('');
    return `<td class="${c.dow >= 6 ? 'wk' : ''}${c.iso === hoy ? ' hoyc' : ''}${r.faltan ? ' wcorta' : ''}"><div class="wcell"><div class="wrowp">${bloques}<button class="wadd" data-pick="${c.iso}|${tid}" aria-label="Añadir persona">＋</button></div>${r.faltan ? `<span class="wfalta">faltan ${r.faltan}${r.supuesto ? '*' : ''}</span>` : ''}${r.sinCocina ? '<span class="wfalta">sin cocina</span>' : ''}</div></td>`;
  };
  let h = `<table class="act semt"><thead><tr><th class="lbl">Local · franja</th>${cols.map(c => `<th class="${c.dow >= 6 ? 'wk' : ''}${c.iso === hoy ? ' hoyt' : ''}">${DIAS_L[c.dow].slice(0, 3)}<span class="dd">${c.d}</span>${c.evs.map(ev => `<span class="evb" role="button" tabindex="0" data-evpop="${c.iso}" data-tipstr="${esc(ev.nombre + ' · pulsa para ver o quitar')}">⚽ ${esc(ev.nombre.replace(/^Juega el /, ''))}</span>`).join('')}${c.e.days.find(d => d.iso === c.iso).festivo ? '<span class="fbdg">FEST</span>' : ''}</th>`).join('')}</tr></thead><tbody>`;
  for (const l of S.locales) {
    h += `<tr class="locsec" style="--lc:${esc(l.color)}"><td colspan="8"><span class="secl"><i></i>${esc(l.nombre)}</span></td></tr>`;
    for (const f of FRANJAS) {
      const tid = turnoId(l.id, f);
      const hr = l.horario && l.horario[f];
      h += `<tr><td class="lbl"><span class="fr">${FRANJA_LBL[f]}</span><small>${hr ? esc(hr.ini + '–' + hr.fin) : ''}${l.horarioSupuesto ? ' · horario supuesto' : ''}</small></td>${cols.map(c => celda(c, tid)).join('')}</tr>`;
    }
  }
  // pie de descansos: quién libra cada día y quién está ausente
  h += `<tr class="piedesc"><td class="lbl">Descansos</td>${cols.map(c => {
    const libres = activos().filter(p => !ausenciaEn(p, c.iso) && !turnosDe(S).some(t => pidsEn(c.e, c.iso, t.id).includes(p.id)));
    return `<td>${libres.map(p => `<span class="dn">${esc(nombreCorto(p.nombre))}</span>`).join('') || '<span class="wcerr">—</span>'}</td>`;
  }).join('')}</tr>`;
  h += `<tr class="piedesc"><td class="lbl">Ausencias</td>${cols.map(c => {
    const aus = S.staff.map(p => ({ p, a: ausenciaEn(p, c.iso) })).filter(x => x.a);
    return `<td>${aus.map(x => `<span class="dn">${esc(nombreCorto(x.p.nombre))}<em>${esc(x.a.tipo)}</em></span>`).join('') || '<span class="wcerr">—</span>'}</td>`;
  }).join('')}</tr>`;
  h += '</tbody></table>';
  $('#semRoot').innerHTML = h;
  $('#wVisible').innerHTML = htmlBotonVisible('wVisibleBtn', [lunes.slice(0, 7), fin.slice(0, 7)]);
  $('#wStats').innerHTML = `<span class="dstat"><b>${turnos}</b> turnos</span><span class="dstat ${cortos ? 'warn' : 'ok'}"><b>${cortos}</b> casillas cortas</span><span class="dstat ${sinCocina ? 'warn' : 'ok'}"><b>${sinCocina}</b> sin cocina</span>${forzados ? `<span class="dstat sal"><b>${forzados}</b> forzadas</span>` : ''}`;
  pintaRevDot();
}
function semanaIr(n) { S.semLunes = addDias(S.semLunes || mondayOf(isoDia()), n * 7); const k = S.semLunes.slice(0, 7); if (k !== mesKey(S.y, S.m)) { S.y = +k.slice(0, 4); S.m = +k.slice(5, 7); cargarMes(); } S.day = Math.max(1, Math.min(est.days.length, +S.semLunes.slice(8, 10))); saveState(); renderSemana(); }
$('#wPrev').addEventListener('click', () => semanaIr(-1));
$('#wNext').addEventListener('click', () => semanaIr(1));
$('#wHoy').addEventListener('click', () => { const hoy = isoHoy(); S.semLunes = mondayOf(hoy); S.y = +hoy.slice(0, 4); S.m = +hoy.slice(5, 7); cargarMes(); S.day = +hoy.slice(8, 10); saveState(); renderSemana(); });
$('#semRoot').addEventListener('click', e => {
  const w = e.target.closest('[data-wpers]');
  if (w) { const [iso, tid, pid] = w.dataset.wpers.split('|'); openMenuTurno(iso, tid, pid, w); }
});
$('#wVisible').addEventListener('click', e => { if (e.target.closest('#wVisibleBtn')) alternarPublicado([S.semLunes.slice(0, 7), addDias(S.semLunes, 6).slice(0, 7)]); });
$('#wVaciar').addEventListener('click', () => vaciarRangoUI(S.semLunes, addDias(S.semLunes, 6), `la semana del ${fmtDM(S.semLunes)} al ${fmtDM(addDias(S.semLunes, 6))}`, 'la semana'));
$('#wGenerar').addEventListener('click', () => irAGenerador({ desde: S.semLunes, hasta: addDias(S.semLunes, 6), titulo: 'Generar esta semana' }));
$('#wPatron').addEventListener('click', () => {
  const lunes = S.semLunes;
  if (!confirm(`¿Guardar la semana del ${fmtDM(lunes)} al ${fmtDM(addDias(lunes, 6))} como nueva semana tipo? El generador la usará a partir de ahora como base (lo que hay ahora en la semana tipo se sustituye; Ctrl+Z lo deshace).`)) return;
  const antes = JSON.stringify(S.patron);
  const nuevo = {};
  for (let k = 0; k < 7; k++) { const iso = addDias(lunes, k); const e = estadoDeIso(iso); const p = patronDesdeSemana(e, lunes); nuevo[isoDow(iso)] = p[isoDow(iso)] || []; }
  S.patron = nuevo;
  registrarCambio(`Semana tipo sustituida por la semana del ${fmtDM(lunes)} (${Object.values(nuevo).reduce((a, x) => a + x.length, 0)} plazas)`, 'cambio');
  saveState();
  toast('Semana tipo actualizada', 'ok');
  undoStack.push({ label: 'semana tipo anterior', y: S.y, m: S.m, apertura: JSON.parse(JSON.stringify(est.apertura)), asig: JSON.parse(JSON.stringify(est.asig)), manual: JSON.parse(JSON.stringify(est.manual || {})), patron: JSON.parse(antes) });
  actualizarUndoBtn();
});
