// ================= IMPRESIÓN =================
// Cuatro hojas: la semana general (apaisada, los cuatro locales), la hoja de un solo
// local para colgar en el bar (vertical, letra grande), el tablón del mes personas ×
// días y la tabla de horas del mes. Misma mecánica que el piloto: vista previa en
// #printRoot, «Imprimir» (window.print) o «Descargar PDF» (15-export-pdf.js), y una
// cabecera con la pareja de logos Shiftia + Grupo Pasarela. El color de cada local
// sale de l.color (llega al CSS como --lc en la fila) y los fondos se fuerzan al
// imprimir (print-color-adjust) para que salgan sin tocar «gráficos de fondo».
// Comparte con 15-export-xlsx.js las piezas de la semana (columnas, casillas, pie de
// descansos) para que el Excel y la hoja digan exactamente lo mismo.
function cerrarImpresion() {
  $('#printRoot').classList.add('hidden');
  document.body.classList.remove('printing');
  const ps = document.getElementById('pageStyle'); if (ps) ps.remove();
}
function montarImpresion(h, apaisado, nombre) {
  PRINT_CTX = { apaisado: !!apaisado, nombre: nombre || 'Planilla' };
  const pr = $('#printRoot');
  pr.innerHTML = `<div class="pbar2"><button class="btn btn-cta" id="pGo"><svg class="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 8.5V3.5h11v5"/><path d="M6.5 17H5a2 2 0 0 1-2-2v-4.5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2V15a2 2 0 0 1-2 2h-1.5"/><rect x="6.5" y="14" width="11" height="6.5" rx="1"/></svg> Imprimir (o Ctrl+P)</button><button class="btn btn-sec" id="pPdf" title="Descargar la hoja como PDF (también en el móvil, sin diálogo de imprimir)"><svg class="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Descargar PDF</button><button class="btn btn-sec" id="pClose">Cerrar</button><span class="pbnota">Sale en color: en el diálogo de impresión no hace falta marcar «gráficos de fondo».</span></div><div class="pxpage${apaisado ? ' apaisado' : ''}">` + h + '</div>';
  pr.classList.remove('hidden');
  pr.scrollTop = 0;
  document.body.classList.add('printing');
  const ps = document.getElementById('pageStyle'); if (ps) ps.remove();
  const st = document.createElement('style'); st.id = 'pageStyle';
  st.textContent = apaisado ? '@page{size:A4 landscape;margin:8mm 9mm}' : '@page{size:A4;margin:9mm 10mm}';
  document.head.appendChild(st);
  // si el contenido no cabe en la hoja (semana con muchas ausencias, mes de 31 días con
  // leyenda larga…), se compacta en dos pasos antes que partir en dos páginas
  const pg = pr.querySelector('.pxpage');
  const altoHoja = (apaisado ? 210 : 297) * 96 / 25.4;
  for (const cls of ['compacto', 'compacto2']) { if (pg.scrollHeight <= altoHoja) break; pg.classList.add(cls); }
  $('#pClose').addEventListener('click', cerrarImpresion);
  $('#pGo').addEventListener('click', () => { try { window.print(); } catch (e) { toast('Usa Ctrl+P para imprimir', 'warn'); } });
  $('#pPdf').addEventListener('click', () => exportarPdfHoja());
}

// ---------- piezas comunes ----------
const PX_MARCA = `<svg viewBox="0 0 32 32" width="34" height="34"><defs><linearGradient id="lgHP" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#4ecdc4"/><stop offset="1" stop-color="#2980b9"/></linearGradient></defs><rect width="32" height="32" rx="7" fill="url(#lgHP)"/><path d="M16 26c-6-1.5-10-6-9-12s7-9 13-7.5c-4.5-0.7-9 2.2-9.7 6.7s3 9 7.5 10.5" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M14.5 8c6 1.5 10 6 9 12s-7 9-13 7.5c4.5 0.7 9-2.2 9.7-6.7s-3-9-7.5-10.5" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`;
// marcas de la casilla: llave = abre / sale primero; «cocina» = lleva la cocina esa franja
const PX_MK_ABRE = `<em class="mk mk-abre" title="Abre / sale primero"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="12" r="4"/><path d="M12 12h9M18 12v3M15 12v2.5"/></svg>abre</em>`;
const PX_MK_COC = `<em class="mk mk-coc" title="Lleva la cocina">cocina</em>`;
// el logo del grupo lo inyecta el build como data URI (assets/pasarela-logo.png); hasta
// que Diego lo suba la variable está vacía y en su hueco va el nombre del grupo en texto
function pxLogoGrupo() { return typeof LOGO_PASARELA === 'string' ? LOGO_PASARELA : ''; }
function pxCabecera(titulo, sub, der1, der2) {
  const logo = pxLogoGrupo();
  return `<div class="pxhead">
    <span class="pxlogos">${PX_MARCA}<span class="pxbar"></span>${logo ? `<img class="pxglogo" src="${logo}" alt="Grupo Pasarela">` : '<span class="pxgword">Grupo <b>Pasarela</b></span>'}</span>
    <span class="pxtit"><b>${titulo}</b><small>${sub}</small></span>
    <span class="pxder"><b>${der1}</b><small>${der2}</small></span>
  </div>`;
}
function pxPie(centro) {
  // los nombres salen de la configuración: si un local cambia de nombre, el pie también
  const locales = (S && S.locales && S.locales.length ? S.locales.map(l => l.nombre) : ['El 33', 'Zapatillera', 'Bar Mónaco', 'Pasarela']).map(esc).join(' · ');
  return `<div class="pxfoot"><span>Grupo Pasarela · ${locales}</span><span>${centro || ''}</span><span>Generado con Shiftia · ${new Date().toLocaleDateString('es-ES')}</span></div>`;
}
// nombre con el color de la persona y, si toca, las marcas de la casilla o el tipo de ausencia
function pxNombre(pid, marcas) {
  const mk = marcas || {};
  const tipo = mk.tipo ? (AUS_LBL[mk.tipo] ? AUS_LBL[mk.tipo].label : mk.tipo) : '';
  return `<span class="nm${mk.tipo ? ' a-' + esc(mk.tipo) : ''}"><i style="background:${avColor(pid)}"></i>${esc(nombrePid(pid))}${mk.abre ? PX_MK_ABRE : ''}${mk.cocina ? PX_MK_COC : ''}${tipo ? `<em>${esc(tipo)}</em>` : ''}</span>`;
}
// la posición 1 de la casilla es quien abre / sale primero (vocabulario del grupo): si
// nadie lleva la marca puesta, en la hoja se señala al primero para que no salga sin abre
function abreEn(lista, i) { return !!(lista[i] && (lista[i].abre || (i === 0 && !lista.some(e => e.abre)))); }
// «09:00–16:00», o «16:00–23:00 · V S 16:00–00:00» cuando algún día de la semana cambia
function horarioTxt(l, franja) {
  const base = l && l.horario && l.horario[franja];
  if (!base) return '';
  const txt = h => `${h.ini}–${h.fin}`;
  const grupos = {};
  for (const dow of (l.abre && l.abre[franja]) || []) {
    const h = horarioDe(l, dow, franja);
    if (h && (h.ini !== base.ini || h.fin !== base.fin)) (grupos[txt(h)] = grupos[txt(h)] || []).push(DOW_C[dow]);
  }
  const extra = Object.entries(grupos).map(([t, ds]) => `${ds.join(' ')} ${t}`).join(' · ');
  return extra ? `${txt(base)} · ${extra}` : txt(base);
}
// «del 5 al 11 de octubre de 2026» / «del 28 de sep al 4 de oct de 2026»
function rangoSemanaTxt(lunes) {
  const fin = addDias(lunes, 6);
  const d1 = +lunes.slice(8, 10), d2 = +fin.slice(8, 10), m1 = +lunes.slice(5, 7), m2 = +fin.slice(5, 7), y2 = +fin.slice(0, 4);
  return m1 === m2 ? `del ${d1} al ${d2} de ${MESES[m1 - 1].toLowerCase()} de ${y2}` : `del ${d1} de ${MES3[m1 - 1]} al ${d2} de ${MES3[m2 - 1]} de ${y2}`;
}
// las siete columnas de una semana, cada una con el estado de SU mes (la semana puede cruzar de mes)
function pxColsSemana(lunes) {
  const cols = [];
  for (let k = 0; k < 7; k++) {
    const iso = addDias(lunes, k);
    cols.push({ iso, dow: k + 1, d: +iso.slice(8, 10), mes: +iso.slice(5, 7), est: estadoDeIso(iso), festivo: (S.festivos || []).includes(iso), eventos: eventosDe(S, iso) });
  }
  return cols;
}
// Pie de descansos: por día, quién libra (sin casilla ese día y sin ausencia) y las
// ausencias con su tipo. Quien está de baja toda la semana va en una sola línea aparte
// para no repetir el mismo nombre siete veces.
function pxDescansos(cols, personas) {
  const bajaToda = personas.filter(p => cols.every(c => { const a = ausenciaEn(p, c.iso); return a && a.tipo === 'BAJ'; }));
  const resto = personas.filter(p => !bajaToda.includes(p));
  const porDia = cols.map(c => {
    const libran = [], ausentes = [];
    for (const p of resto) {
      const a = ausenciaEn(p, c.iso);
      if (a) { ausentes.push({ p, a }); continue; }
      if (!casillasDe(c.est, c.iso, p.id).length) libran.push(p);
    }
    return { libran, ausentes };
  });
  return { porDia, bajaToda };
}
function pxFilasDescansos(cols, personas, colspan) {
  const { porDia, bajaToda } = pxDescansos(cols, personas);
  let h = `<tr class="secrow pxdesc"><td class="sec" colspan="${colspan}"><span>Pie de descansos</span></td></tr>`;
  h += `<tr class="pxdesc"><td class="lblp">Libran<small>sin turno ese día</small></td>${porDia.map(x => `<td>${x.libran.map(p => pxNombre(p.id)).join('') || '<span class="pxvacio">nadie</span>'}</td>`).join('')}</tr>`;
  h += `<tr class="pxdesc"><td class="lblp">Ausencias<small>vacaciones · permisos · libres</small></td>${porDia.map(x => `<td>${x.ausentes.map(({ p, a }) => pxNombre(p.id, { tipo: a.tipo })).join('') || '&nbsp;'}</td>`).join('')}</tr>`;
  if (bajaToda.length) h += `<tr class="pxdesc"><td class="lblp">De baja<small>toda la semana</small></td><td colspan="${colspan - 1}">${bajaToda.map(p => pxNombre(p.id, { tipo: 'BAJ' })).join('')}</td></tr>`;
  return h;
}
// una casilla (local × franja × día): nombres en el orden de la casilla, cerrado «—»,
// y fondo ámbar con «falta n» si no llega al mínimo del día (con refuerzo de eventos)
function pxCasilla(c, l, franja) {
  const tid = turnoId(l.id, franja);
  if (!turnoAbierto(S, c.est, c.iso, tid)) return '<td class="cerr">—</td>';
  const lista = asignados(c.est, c.iso, tid);
  const m = minimoDe(S, c.iso, tid);
  const faltan = Math.max(0, m.min - lista.length);
  const nombres = lista.map((e, i) => pxNombre(e.pid, { abre: abreEn(lista, i), cocina: !!e.cocina })).join('');
  const nota = faltan ? `<span class="falta">falta${faltan > 1 ? 'n' : ''} ${faltan}${m.supuesto ? ' <i>· mín. supuesto</i>' : ''}${m.refuerzo ? ' <i>· con refuerzo</i>' : ''}</span>` : '';
  return `<td${faltan ? ' class="corta"' : ''}>${nombres}${nota}</td>`;
}
function pxThDia(c) {
  return `<th class="pxd${c.dow >= 6 || c.festivo ? ' wk' : ''}"><b>${DIAS_L[c.dow].toUpperCase()}</b><span>${c.d}<small>${MES3[c.mes - 1]}</small></span>${c.festivo ? '<i>festivo</i>' : ''}${c.eventos.map(e => `<i class="ev">${esc(e.nombre || 'evento')}${e.franja && e.franja !== 'MT' && FRANJA_LBL[e.franja] ? ' · ' + FRANJA_LBL[e.franja].toLowerCase() : ''}</i>`).join('')}</th>`;
}
const PX_LEYENDA_SEMANA = () => `<div class="pxley"><span class="pxchip"><span class="nm">${PX_MK_ABRE}</span>abre / sale primero (posición 1 de la casilla)</span><span class="pxchip"><span class="nm">${PX_MK_COC}</span>lleva la cocina</span><span class="pxchip corta"><b>falta n</b>turno corto: faltan personas para el mínimo</span><span class="pxchip"><b>—</b>cerrado</span></div>`;

// ---------- semana general: los cuatro locales, mañana y tarde ----------
function abrirImpresion() {
  const lunes = S.semLunes || mondayOf(isoHoy());
  const cols = pxColsSemana(lunes);
  const supuesto = S.locales.some(l => l.horarioSupuesto);
  let h = pxCabecera('Planilla semanal', 'Grupo Pasarela · los cuatro locales · mañana y tarde · nombres en el orden de la casilla',
    `Semana ${rangoSemanaTxt(lunes)}`, supuesto ? 'Horarios de apertura aún sin confirmar por el grupo' : `${S.locales.length} locales`);
  h += `<table class="pxw pxsem"><thead><tr><th class="act">Local · franja</th>${cols.map(pxThDia).join('')}</tr></thead><tbody>`;
  for (const l of S.locales) {
    h += `<tr class="secrow pxloc" style="--lc:${esc(l.color)}"><td class="sec" colspan="8"><span>${esc(l.nombre)}</span></td></tr>`;
    for (const f of FRANJAS) {
      h += `<tr class="pxloc" style="--lc:${esc(l.color)}"><td class="lblp">${FRANJA_LBL[f]}<small>${esc(horarioTxt(l, f)) || '&nbsp;'}</small></td>${cols.map(c => pxCasilla(c, l, f)).join('')}</tr>`;
    }
  }
  h += pxFilasDescansos(cols, S.staff, 8);
  h += '</tbody></table>';
  h += PX_LEYENDA_SEMANA();
  h += pxPie('Cada nombre lleva el color de la persona. El pie de descansos dice quién libra cada día y quién está ausente.');
  montarImpresion(h, true, `Planilla_semana_${lunes}`);
}

// ---------- hoja de un solo local: para colgar en el bar ----------
// vertical y con letra grande: se lee de pie, desde la barra. Solo su plantilla en el
// pie de descansos (quien tiene ese local entre los suyos).
function abrirImpresionLocal(localId) {
  const l = localDe(S, localId);
  if (!l) { toast('Local desconocido', 'warn'); return; }
  const lunes = S.semLunes || mondayOf(isoHoy());
  const cols = pxColsSemana(lunes);
  const gente = S.staff.filter(p => (p.locales || []).includes(l.id));
  let h = pxCabecera(esc(l.nombre), 'Grupo Pasarela · planilla de la semana para colgar en el local', `Semana ${rangoSemanaTxt(lunes)}`,
    `Mañana ${esc(horarioTxt(l, 'M')) || '—'} · Tarde ${esc(horarioTxt(l, 'T')) || '—'}${l.horarioSupuesto ? ' (horario por confirmar)' : ''}`);
  h += `<table class="pxw pxlocal" style="--lc:${esc(l.color)}"><thead><tr><th class="act">Día</th><th class="pxd">Mañana<span>${esc(horarioTxt(l, 'M'))}</span></th><th class="pxd">Tarde<span>${esc(horarioTxt(l, 'T'))}</span></th></tr></thead><tbody>`;
  for (const c of cols) {
    const wk = c.dow >= 6 || c.festivo;
    h += `<tr${wk ? ' class="wk"' : ''}><td class="lbld"><b>${DIAS_L[c.dow]}</b><span>${c.d} de ${MESES[c.mes - 1].toLowerCase()}</span>${c.festivo ? '<i>festivo</i>' : ''}${c.eventos.map(e => `<i class="ev">${esc(e.nombre || 'evento')}</i>`).join('')}</td>${pxCasilla(c, l, 'M')}${pxCasilla(c, l, 'T')}</tr>`;
  }
  h += '</tbody></table>';
  const { porDia, bajaToda } = pxDescansos(cols, gente);
  h += `<h3 class="pxh3">Pie de descansos · plantilla de ${esc(l.nombre)}</h3><table class="pxw pxdesct" style="--lc:${esc(l.color)}"><thead><tr><th class="act">Día</th><th>Libran</th><th>Ausencias</th></tr></thead><tbody>`;
  cols.forEach((c, i) => {
    h += `<tr><td class="lbld"><b>${DIAS_L[c.dow]} ${c.d}</b></td><td>${porDia[i].libran.map(p => pxNombre(p.id)).join('') || '<span class="pxvacio">nadie</span>'}</td><td>${porDia[i].ausentes.map(({ p, a }) => pxNombre(p.id, { tipo: a.tipo })).join('') || '&nbsp;'}</td></tr>`;
  });
  if (bajaToda.length) h += `<tr><td class="lbld"><b>De baja</b></td><td colspan="2">${bajaToda.map(p => pxNombre(p.id, { tipo: 'BAJ' })).join('')}</td></tr>`;
  h += '</tbody></table>';
  h += PX_LEYENDA_SEMANA();
  h += pxPie(`${esc(l.nombre)} · quien está en la posición 1 abre y sale primero`);
  montarImpresion(h, false, `Planilla_${l.corto || l.nombre}_semana_${lunes}`);
}

// ---------- tablón del mes: personas × días ----------
// una píldora por día con el color del local: M mañana, T tarde, P partido; si dobla
// (partido en dos locales) la píldora lleva los dos colores. Ausencias con su tipo.
function abrirImpresionMes() {
  const y = S.y, m = S.m, dias = est.days, n = dias.length;
  const fest = dias.filter(d => d.festivo).map(d => d.d).join(', ');
  const orden = ordenPersonasMes(dias[n - 1].iso);
  let h = pxCabecera('Planilla mensual', 'Grupo Pasarela · tablón personas × días · M mañana · T tarde · P partido', `${MESES[m - 1]} ${y}`, `${n} días${fest ? ' · festivos: ' + fest : ''}`);
  h += `<table class="pxm"><thead><tr><th class="nomh">Persona</th>${dias.map(d => `<th class="${d.dow >= 6 || d.festivo ? 'wk2' : ''}${d.festivo ? ' fes' : ''}"><span>${DOW_C[d.dow]}</span><b>${d.d}</b></th>`).join('')}</tr></thead><tbody>`;
  for (const { p, baja } of orden) {
    h += `<tr${baja ? ' class="baja"' : ''}><td class="nom"><span class="nomw"><i style="background:${avColor(p.id)}"></i>${esc(p.nombre)}</span></td>`;
    for (const d of dias) {
      const wk = d.dow >= 6 || d.festivo ? 'wk2' : '';
      const cas = casillasDe(est, d.iso, p.id);
      if (!cas.length) {
        const a = ausenciaEn(p, d.iso);
        h += a ? `<td class="a-${esc(a.tipo)}${wk ? ' ' + wk : ''}"><span class="cod">${esc(a.tipo)}</span></td>` : `<td class="${wk}"></td>`;
        continue;
      }
      const franjas = new Set(cas.map(c => partirTurno(c.tid).franja));
      const locs = [...new Set(cas.map(c => partirTurno(c.tid).localId))];
      const cod = franjas.size === 2 ? 'P' : franjas.has('M') ? 'M' : 'T';
      const c1 = colorLocal(locs[0]), c2 = locs[1] ? colorLocal(locs[1]) : null;
      h += `<td class="${wk}"><span class="pm${c2 ? ' dobla' : ''}" style="--lc:${c1}${c2 ? ';--lc2:' + c2 : ''}">${cod}</span></td>`;
    }
    h += '</tr>';
  }
  // pie: por local, cuántas personas faltan cada día respecto al mínimo (y en qué franja)
  h += `<tr class="grp"><td colspan="${n + 1}"><span>Turnos cortos · personas que faltan para el mínimo (M mañana · T tarde)</span></td></tr>`;
  for (const l of S.locales) {
    h += `<tr><td class="nom"><span class="nomw"><i style="background:${esc(l.color)}"></i>${esc(l.nombre)}</span></td>`;
    for (const d of dias) {
      let faltan = 0; const fr = [];
      for (const f of FRANJAS) {
        const tid = turnoId(l.id, f);
        if (!turnoAbierto(S, est, d.iso, tid)) continue;
        const k = Math.max(0, minimoDe(S, d.iso, tid).min - asignados(est, d.iso, tid).length);
        if (k) { faltan += k; fr.push(f); }
      }
      h += `<td class="${d.dow >= 6 || d.festivo ? 'wk2' : ''}">${faltan ? `<b class="falta">${faltan}<small>${fr.join('')}</small></b>` : ''}</td>`;
    }
    h += '</tr>';
  }
  h += '</tbody></table>';
  h += `<div class="pxley">${S.locales.map(l => `<span class="pxchip"><span class="pm" style="--lc:${esc(l.color)}">M</span>${esc(l.nombre)}</span>`).join('')}<span class="pxchip"><b>M</b>mañana</span><span class="pxchip"><b>T</b>tarde</span><span class="pxchip"><b>P</b>partido (mañana y tarde)</span><span class="pxchip"><span class="pm dobla" style="--lc:#7a8a94;--lc2:#c3cbd1">P</span>dobla: dos locales el mismo día</span>${TIPOS_AUSENCIA.map(t => `<span class="pxchip a-${t.id}"><b>${t.id}</b>${esc(t.label)}</span>`).join('')}</div>`;
  h += pxPie('Un número en la fila de un local = personas que faltan ese día para llegar al mínimo.');
  montarImpresion(h, true, `Planilla_mes_${claveMes(y, m)}`);
}

// ---------- horas del mes: para la nómina ----------
// el mes es el de la vista Horas (S.hY/S.hM), no el de la planilla en pantalla
function abrirImpresionHoras() {
  const { y, m, k } = mesHoras();
  const filas = horasEquipoMes(S, S.staff, S.meses, y, m);
  const porPid = new Map(filas.map(f => [f.pid, f]));
  const orden = ordenPersonasMes(isoDe(y, m, diasDelMes(y, m)));
  const cierre = (S.cierres || {})[k];
  const supuesto = S.locales.some(l => l.horarioSupuesto);
  const mut = '<span class="mut">·</span>';
  let h = pxCabecera('Horas del mes', 'Grupo Pasarela · contador para la nómina · por persona y por local', `${MESES[m - 1]} ${y}`,
    cierre ? `Cerrado el ${new Date(cierre.ts).toLocaleDateString('es-ES')}${cierre.usuario ? ' · ' + esc(cierre.usuario) : ''}` : 'Mes abierto · cifras provisionales');
  if (supuesto) h += '<p class="pxaviso">Los horarios de apertura aún no están confirmados por el grupo: las horas son estimadas.</p>';
  h += `<table class="pxh"><thead><tr><th>Persona</th><th class="num">Días</th><th class="num">Mañanas</th><th class="num">Tardes</th><th class="num">Partidos</th><th class="num">Horas</th><th class="num">Extras (h)</th><th class="num">Festivos</th><th class="num">Domingos</th><th class="num">Nocturnas (h)</th><th class="num">Contrato (h)</th><th class="num">Saldo (h)</th></tr></thead><tbody>`;
  const tot = { dias: 0, mananas: 0, tardes: 0, partidos: 0, horas: 0, extras: 0, festivas: 0, domingos: 0, noct: 0, contrato: 0, saldo: 0, conContrato: 0 };
  for (const { p, baja } of orden) {
    const f = porPid.get(p.id); if (!f) continue;
    tot.dias += f.dias; tot.mananas += f.mananas; tot.tardes += f.tardes; tot.partidos += f.partidos; tot.horas += f.horas; tot.extras += f.extrasMin / 60;
    tot.festivas += f.festivas; tot.domingos += f.domingos; tot.noct += f.horasNocturnas;
    if (f.contratoHoras !== null) { tot.contrato += f.contratoHoras; tot.saldo += f.saldo; tot.conContrato++; }
    const sc = f.saldo === null ? 'mut' : f.saldo > 0 ? 'pos' : f.saldo < 0 ? 'neg' : '';
    h += `<tr${baja ? ' class="baja"' : ''}><td class="nom">${pxNombre(p.id)}${baja ? '<small class="mut"> · de baja</small>' : ''}</td><td class="num">${f.dias}</td><td class="num">${f.mananas}</td><td class="num">${f.tardes}</td><td class="num">${f.partidos}</td><td class="num hh">${numHoras(f.horas)}</td><td class="num">${f.extrasMin ? numHoras(f.extrasMin / 60) : mut}</td><td class="num">${f.festivas || mut}</td><td class="num">${f.domingos || mut}</td><td class="num">${f.nocturnosMin ? numHoras(f.horasNocturnas) : mut}</td><td class="num">${f.contratoHoras === null ? '<span class="mut">—</span>' : numHoras(f.contratoHoras)}</td><td class="num ${sc}">${f.saldo === null ? '—' : (f.saldo > 0 ? '+' : '') + numHoras(f.saldo)}</td></tr>`;
  }
  h += `</tbody><tfoot><tr><td>Total · ${pl(orden.length, 'persona', 'personas')}</td><td class="num">${tot.dias}</td><td class="num">${tot.mananas}</td><td class="num">${tot.tardes}</td><td class="num">${tot.partidos}</td><td class="num hh">${numHoras(tot.horas)}</td><td class="num">${numHoras(tot.extras)}</td><td class="num">${tot.festivas}</td><td class="num">${tot.domingos}</td><td class="num">${numHoras(tot.noct)}</td><td class="num">${tot.conContrato ? numHoras(tot.contrato) : '—'}</td><td class="num ${tot.saldo > 0 ? 'pos' : tot.saldo < 0 ? 'neg' : ''}">${tot.conContrato ? (tot.saldo > 0 ? '+' : '') + numHoras(tot.saldo) : '—'}</td></tr></tfoot></table>`;
  h += '<p class="pxnota">Horas = turnos + extras. Contrato = horas semanales del contrato × días del mes, descontados los días de ausencia. Saldo = horas − contrato. Festivos y domingos son días trabajados; nocturnas, las horas entre las 22:00 y las 06:00.</p>';
  const locs = horasLocalMes(S, S.staff, S.meses, y, m);
  h += `<h3 class="pxh3">Por local</h3><table class="pxh pxhloc"><thead><tr><th>Local</th><th class="num">Turnos</th><th class="num">Horas</th><th class="num">Personas</th><th>Horario</th></tr></thead><tbody>`;
  for (const x of locs) {
    const l = localDe(S, x.localId);
    h += `<tr><td class="loc" style="--lc:${esc(l ? l.color : '#888')}">${esc(x.nombre)}</td><td class="num">${x.turnos}</td><td class="num hh">${numHoras(x.horas)}</td><td class="num">${x.personas}</td><td>M ${esc(horarioTxt(l, 'M')) || '—'} · T ${esc(horarioTxt(l, 'T')) || '—'}${l && l.horarioSupuesto ? ' <span class="mut">(por confirmar)</span>' : ''}</td></tr>`;
  }
  h += `</tbody><tfoot><tr><td>Total</td><td class="num">${locs.reduce((a, x) => a + x.turnos, 0)}</td><td class="num hh">${numHoras(locs.reduce((a, x) => a + x.horas, 0))}</td><td></td><td></td></tr></tfoot></table>`;
  h += pxPie(cierre ? 'Mes cerrado: si algo cambia después del cierre queda en el historial de la app.' : 'Mes abierto: las cifras pueden cambiar hasta que se cierre.');
  montarImpresion(h, false, `Horas_${k}`);
}

{
  const b1 = $('#printBtn'); if (b1) b1.addEventListener('click', abrirImpresion);
  const b2 = $('#printMesBtn'); if (b2) b2.addEventListener('click', abrirImpresionMes);
}
