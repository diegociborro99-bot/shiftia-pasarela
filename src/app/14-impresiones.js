// ================= IMPRESIÓN =================
// Cinco hojas: la semana general (apaisada, los cuatro locales), la hoja de un solo
// local para colgar en el bar (vertical, letra grande), la planilla GENERADA con sus
// dos páginas (la planilla y «qué ha cambiado», el prototipo del cliente del 11/09),
// el tablón del mes personas × días y la tabla de horas del mes. Misma mecánica que
// el piloto: vista previa en #printRoot, «Imprimir» (window.print) o «Descargar PDF»
// (15-export-pdf.js), y una cabecera con la pareja de logos Shiftia + Grupo Pasarela.
// El color de cada local sale de l.color (llega al CSS como --lc en la fila) y los
// fondos se fuerzan al imprimir (print-color-adjust) para que salgan sin tocar
// «gráficos de fondo». Comparte con 15-export-xlsx.js las piezas de la semana
// (columnas, pie de descansos) para que el Excel y la hoja digan lo mismo.
// Las casillas se pintan con posicionesDe (modelo.js): número de posición, ▸ si sale
// el primero (fijo), ◆ cocina, □ comodín, P partido / C continuo, «por Fulana» y la
// nota en gris, y la 1.ª posición como HUECO DISPONIBLE en rojo cuando nadie de la
// casilla puede abrir.
function cerrarImpresion() {
  $('#printRoot').classList.add('hidden');
  document.body.classList.remove('printing');
  const ps = document.getElementById('pageStyle'); if (ps) ps.remove();
}
function montarImpresion(h, apaisado, nombre, opts) {
  PRINT_CTX = { apaisado: !!apaisado, nombre: nombre || 'Planilla' };
  const o = opts || {};
  const pr = $('#printRoot');
  // desde el generador: la hoja también deja volcar la propuesta a la planilla (reunión del 15/09: «me falta el botón que lo vuelque»)
  const volcar = o.volcar && o.volcar.n ? `<button class="btn btn-cta" id="pVolcar" title="Pasa la planilla propuesta a la semana">Volcar a la planilla (${pl(o.volcar.n, 'plaza nueva', 'plazas nuevas')})</button>` : '';
  pr.innerHTML = `<div class="pbar2">${volcar}<button class="btn ${volcar ? 'btn-sec' : 'btn-cta'}" id="pGo"><svg class="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 8.5V3.5h11v5"/><path d="M6.5 17H5a2 2 0 0 1-2-2v-4.5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2V15a2 2 0 0 1-2 2h-1.5"/><rect x="6.5" y="14" width="11" height="6.5" rx="1"/></svg> Imprimir (o Ctrl+P)</button><button class="btn btn-sec" id="pPdf" title="Descargar la hoja como PDF (también en el móvil, sin diálogo de imprimir)"><svg class="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Descargar PDF</button><button class="btn btn-sec" id="pClose">Cerrar</button><span class="pbnota">Sale en color: en el diálogo de impresión no hace falta marcar «gráficos de fondo».</span></div><div class="pxpage${apaisado ? ' apaisado' : ''}">` + h + '</div>';
  pr.classList.remove('hidden');
  pr.scrollTop = 0;
  document.body.classList.add('printing');
  const ps = document.getElementById('pageStyle'); if (ps) ps.remove();
  const st = document.createElement('style'); st.id = 'pageStyle';
  st.textContent = apaisado ? '@page{size:A4 landscape;margin:8mm 9mm}' : '@page{size:A4;margin:9mm 10mm}';
  document.head.appendChild(st);
  // si el contenido no cabe en la hoja (semana con muchas ausencias, mes de 31 días con
  // leyenda larga…), se compacta en dos pasos antes que partir en dos páginas. En una
  // hoja de varias páginas (.pxg-pag) se mide cada página por su contenido, no la suma.
  const pg = pr.querySelector('.pxpage');
  const altoHoja = (apaisado ? 210 : 297) * 96 / 25.4;
  const paginas = [...pg.querySelectorAll('.pxg-pag')];
  const margen = (apaisado ? 16 : 19) * 96 / 25.4;   // los 2 rellenos verticales de .pxpage
  const altoContenido = b => { const u = b.lastElementChild; return u ? u.getBoundingClientRect().bottom - b.getBoundingClientRect().top : b.scrollHeight; };
  for (const bloque of paginas.length ? paginas : [pg]) {
    const alto = () => paginas.length ? altoContenido(bloque) + margen : pg.scrollHeight;
    for (const cls of ['compacto', 'compacto2']) { if (alto() <= altoHoja) break; bloque.classList.add(cls); }
  }
  $('#pClose').addEventListener('click', cerrarImpresion);
  const pv = $('#pVolcar'); if (pv) pv.addEventListener('click', () => o.volcar.fn());
  $('#pGo').addEventListener('click', () => { try { window.print(); } catch (e) { toast('Usa Ctrl+P para imprimir', 'warn'); } });
  $('#pPdf').addEventListener('click', () => exportarPdfHoja());
}

// ---------- piezas comunes ----------
const PX_MARCA = `<svg viewBox="0 0 32 32" width="34" height="34"><defs><linearGradient id="lgHP" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#4ecdc4"/><stop offset="1" stop-color="#2980b9"/></linearGradient></defs><rect width="32" height="32" rx="7" fill="url(#lgHP)"/><path d="M16 26c-6-1.5-10-6-9-12s7-9 13-7.5c-4.5-0.7-9 2.2-9.7 6.7s3 9 7.5 10.5" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M14.5 8c6 1.5 10 6 9 12s-7 9-13 7.5c4.5 0.7 9-2.2 9.7-6.7s-3-9-7.5-10.5" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`;
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
  return `<span class="nm${mk.tipo ? ' a-' + esc(mk.tipo) : ''}"><i style="background:${avColor(pid)}"></i>${mk.abre ? '<b class="pxg-mk abre">▸</b>' : ''}${mk.cocina ? '<b class="pxg-mk coc">◆</b>' : ''}${esc(nombrePid(pid))}${tipo ? `<em>${esc(tipo)}</em>` : ''}</span>`;
}
// la posición 1 de la casilla es quien abre / sale primero (vocabulario del grupo): si
// nadie lleva la marca puesta, en el Excel se señala al primero para que no salga sin abre
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
  let h = `<tr class="secrow pxdesc"><td class="sec" colspan="${colspan}"><span>Pie de descansos · quién libra cada día</span></td></tr>`;
  h += `<tr class="pxdesc"><td class="lblp">Libran<small>sin turno ese día</small></td>${porDia.map((x, i) => `<td data-libran="${cols[i].iso}"><div class="pxg-cnt">${x.libran.length} libra${x.libran.length === 1 ? '' : 'n'}</div>${x.libran.length ? `<div class="pxg-chips">${x.libran.map(p => `<span><i style="background:${avColor(p.id)}"></i>${esc(p.nombre)}</span>`).join('')}</div>` : '<span class="pxvacio">nadie</span>'}</td>`).join('')}</tr>`;
  h += `<tr class="pxdesc"><td class="lblp">Ausencias<small>vacaciones · permisos · libres</small></td>${porDia.map(x => `<td>${x.ausentes.map(({ p, a }) => pxNombre(p.id, { tipo: a.tipo })).join('') || '&nbsp;'}</td>`).join('')}</tr>`;
  if (bajaToda.length) h += `<tr class="pxdesc"><td class="lblp">De baja<small>toda la semana</small></td><td colspan="${colspan - 1}">${bajaToda.map(p => pxNombre(p.id, { tipo: 'BAJ' })).join('')}</td></tr>`;
  return h;
}

// ---------- la casilla tal como la enseña el prototipo del 11/09 ----------
// Una posición: número, ▸ si sale el primero (fijo), ◆ cocina, □ comodín, el nombre,
// P partido / C continuo, la palabra «cocina» y, debajo en gris, «por Fulana» y la nota.
// El hueco de la 1.ª posición va en rojo: «Hueco disponible · abre la tarde · turno completo».
function pxSlot(s, franja) {
  if (s.hueco) return `<div class="pxg-s hueco" title="${esc(s.motivo || '')}"><i class="pxg-n">${s.pos}</i><div class="pxg-b"><span class="pxg-hb">Hueco disponible</span><small class="pxg-sub bad">abre la ${franja === 'M' ? 'mañana' : 'tarde'} · turno completo</small></div></div>`;
  const mk = (s.abreFijo ? '<b class="pxg-mk abre" title="Sale el primero (fijo)">▸</b>' : '') + (s.cocina ? '<b class="pxg-mk coc" title="Lleva la cocina">◆</b>' : '') + (s.comodin ? '<b class="pxg-mk com" title="Comodín colocado por Shiftia">□</b>' : '');
  const tags = (s.continuo ? '<em class="pxg-tag c" title="Turno continuo: sale el primero de mañana y de tarde">C</em>' : s.partido ? '<em class="pxg-tag p" title="Turno partido: mañana y tarde">P</em>' : '') + (s.cocina ? '<span class="pxg-coc">cocina</span>' : '');
  const subs = (s.por ? `<small class="pxg-sub">por ${esc(nombrePid(s.por))}</small>` : '') + (s.nota ? `<small class="pxg-sub">${esc(s.nota)}</small>` : '') + (s.forzado ? '<small class="pxg-sub warn">forzado a mano</small>' : '');
  return `<div class="pxg-s${s.abre ? ' abre' : ''}"><i class="pxg-n">${s.pos}</i><div class="pxg-b"><span class="pxg-nm">${mk}${esc(s.nombre)}</span>${tags}${subs}</div></div>`;
}
// la cuenta «n/min*» de arriba a la izquierda: * = mínimo supuesto; «+1 hueco» si la
// 1.ª posición está vacante; «faltan n» si no llega al mínimo; «corregido» si cambió
function pxCuenta(d) {
  return `<div class="pxg-cnt">${d.n}/${d.min}${d.supuesto ? '<b>*</b>' : ''}${d.hueco ? '<em class="hue">+1 hueco</em>' : ''}${d.faltan ? `<em class="fal">falta${d.faltan > 1 ? 'n' : ''} ${d.faltan}${d.refuerzo ? ' · refuerzo' : ''}</em>` : ''}${d.cambiado ? '<em class="cor">corregido</em>' : ''}</div>`;
}
// una casilla (local × franja × día) de las hojas semanales: cerrado «—»; si no, la
// cuenta y las posiciones. Fondo ámbar si no llega al mínimo, rojo si hay hueco.
function pxCasilla(c, l, franja) {
  const tid = turnoId(l.id, franja);
  if (!turnoAbierto(S, c.est, c.iso, tid)) return `<td class="cerr" data-cas="${c.iso}|${tid}">—</td>`;
  const r = revisarTurno(S, S.staff, c.est, c.iso, tid);
  const slots = posicionesDe(S, S.staff, c.est, c.iso, tid);
  const hueco = slots.some(s => s.hueco);
  const cls = [hueco ? 'hueco' : '', r.faltan ? 'corta' : ''].filter(Boolean).join(' ');
  return `<td${cls ? ` class="${cls}"` : ''} data-cas="${c.iso}|${tid}">${pxCuenta({ n: r.n, min: r.minimo, supuesto: r.supuesto, faltan: r.faltan, refuerzo: r.refuerzo, hueco })}${slots.map(s => pxSlot(s, franja)).join('')}</td>`;
}
function pxThDia(c) {
  return `<th class="pxd${c.dow >= 6 || c.festivo ? ' wk' : ''}"><b>${DIAS_L[c.dow].toUpperCase()}</b><span>${c.d}<small>${MES3[c.mes - 1]}</small></span>${c.festivo ? '<i>festivo</i>' : ''}${c.eventos.map(e => `<i class="ev">${esc(e.nombre || 'evento')}${e.franja && e.franja !== 'MT' && FRANJA_LBL[e.franja] ? ' · ' + FRANJA_LBL[e.franja].toLowerCase() : ''}</i>`).join('')}</th>`;
}
// leyenda de las casillas (la misma en las tres hojas semanales); extra = chips propios de la hoja
function pxLeyendaCasilla(extra) {
  return `<div class="pxg-ley"><span><i class="pxg-n">1</i>orden en la casilla: el primero abre y hace turno completo; la cocina va en su posición</span><span><b class="pxg-mk abre">▸</b>sale el primero (fijo)</span><span><b class="pxg-mk coc">◆</b>cocina</span><span><em class="pxg-tag p">P</em>turno partido</span><span><em class="pxg-tag c">C</em>turno continuo</span><span><b class="pxg-mk com">□</b>comodín colocado por Shiftia</span><span><b class="ast">*</b>mínimo no fijado por el cliente</span>${extra || ''}<span class="hue"><b>rojo</b>· hueco disponible: nadie de la plantilla puede ocupar esa posición</span><span class="fal"><b>ámbar</b>· turno corto: faltan personas para el mínimo</span><span><b>—</b>cerrado</span></div>`;
}
const PX_LEYENDA_SEMANA = () => pxLeyendaCasilla('');

// ---------- semana general: los cuatro locales, mañana y tarde ----------
function abrirImpresion() {
  const lunes = S.semLunes || mondayOf(isoHoy());
  const cols = pxColsSemana(lunes);
  const supuesto = S.locales.some(l => l.horarioSupuesto);
  let h = pxCabecera('Planilla semanal', 'Grupo Pasarela · los cuatro locales · mañana y tarde · posiciones de la casilla: el 1.º abre, la cocina en su sitio',
    `Semana ${rangoSemanaTxt(lunes)}`, supuesto ? 'Horarios de apertura aún sin confirmar por el grupo' : `${S.locales.length} locales`);
  h += `<table class="pxw pxsem"><thead><tr><th class="act">Local · franja</th>${cols.map(pxThDia).join('')}</tr></thead><tbody>`;
  for (const l of S.locales) {
    h += `<tr class="secrow pxloc" style="--lc:${esc(l.color)}"><td class="sec" colspan="8"><span>${esc(l.nombre)}</span><small>${esc(descripcionCocina(S, l))}</small></td></tr>`;
    for (const f of FRANJAS) {
      h += `<tr class="pxloc" style="--lc:${esc(l.color)}"><td class="lblp">${FRANJA_LBL[f]}<small>${esc(horarioTxt(l, f)) || '&nbsp;'}</small></td>${cols.map(c => pxCasilla(c, l, f)).join('')}</tr>`;
    }
  }
  h += pxFilasDescansos(cols, S.staff, 8);
  h += '</tbody></table>';
  h += PX_LEYENDA_SEMANA();
  h += pxPie('El 1.º de cada casilla abre y hace turno completo; la cocina va en su posición. El pie de descansos dice quién libra cada día y quién está ausente.');
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
  let h = pxCabecera(esc(l.nombre), `Grupo Pasarela · planilla de la semana para colgar en el local · ${esc(descripcionCocina(S, l))}`, `Semana ${rangoSemanaTxt(lunes)}`,
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
  h += pxPie(`${esc(l.nombre)} · quien está en la posición 1 abre y hace turno completo`);
  montarImpresion(h, false, `Planilla_${l.corto || l.nombre}_semana_${lunes}`);
}

// ---------- planilla generada: las dos páginas del prototipo del 11/09 ----------
// res = resultado de generarSemana (modelo.js): locales con sus franjas, días y
// posiciones; huecos con motivo y «por qué nadie»; cambios antes/después; quién libra;
// las condiciones comprobadas (las nuevas marcadas) y el resumen. Página 1: la planilla
// por local con la cuenta n/min*, las posiciones, los huecos en rojo, lo corregido en
// ámbar, quién libra cada día y la leyenda. Página 2: qué ha cambiado, los huecos que
// quedan disponibles (qué queda en la casilla y con qué se destraparía), las condiciones
// nuevas, las preguntas para el cliente, la lista numerada completa y la conclusión.
const PXG_NUM = ['ningún', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'];
const pxgNum = n => PXG_NUM[n] !== undefined ? PXG_NUM[n] : String(n);
// «lunes 14»
const pxgDia = iso => `${DIAS_L[isoDow(iso)].toLowerCase()} ${+iso.slice(8, 10)}`;
// «1.ª» / «2.º» según el nombre (misma heurística que el modelo para «la primera»)
const pxgOrd = (pos, nombre) => `${pos}.${/a$/i.test(String(nombre || '').split(' ')[0]) ? 'ª' : 'º'}`;
// «El 33, Zapatillera y Bar Mónaco»
const pxgLista = xs => xs.length < 2 ? xs.join('') : xs.slice(0, -1).join(', ') + ' y ' + xs[xs.length - 1];
const pxgCap = s => { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); };
function pxgLocal(res, localId) { return res.locales.find(l => l.id === localId) || { id: localId, nombre: nombreLocal(localId), color: colorLocal(localId) }; }
function pxgDiaDe(res, localId, franja, iso) {
  const l = res.locales.find(x => x.id === localId); if (!l) return null;
  const f = l.franjas.find(x => x.franja === franja); if (!f) return null;
  return f.dias.find(d => d.iso === iso) || null;
}
// «1.ª posición vacante · 2.ª Noe de cocina · 3.º Leo»
function pxgPosiciones(slots, nuevos) {
  return slots.map(s => s.hueco ? `<b class="bad">${s.pos}.ª posición vacante</b>` : `${pxgOrd(s.pos, s.nombre)} ${nuevos && nuevos.includes(s.pid) ? `<b>${esc(s.nombre)}</b>` : esc(s.nombre)}${s.cocina ? ' de cocina' : ''}${s.continuo ? ', turno continuo' : s.partido ? (s.cocina ? ', partido' : ' de partido') : ''}`).join(' · ');
}
function pxgCabecera(res, titulo, sub, resumen, pagina) {
  const kicker = `SHIFTIA · PLANILLA SEMANAL · ${res.locales.map(l => `<b style="color:${esc(l.color)}">${esc(l.nombre)}</b>`).join(' · ')}`;
  const logo = pxLogoGrupo();
  return `<div class="pxg-head"><span class="pxg-marca">${PX_MARCA}</span><div class="pxg-ht"><div class="pxg-kick">${kicker}</div><h1 class="pxg-h1">${esc(titulo)}<span> · ${sub}</span></h1><div class="pxg-sub">${resumen}</div></div><span class="pxg-hr">${logo ? `<img class="pxglogo" src="${logo}" alt="Grupo Pasarela">` : '<span class="pxgword">Grupo <b>Pasarela</b></span>'}<small>página ${pagina} de 2</small></span></div>`;
}
function pxgCabeceraTabla(res) {
  return `<thead><tr><th class="pxg-turno">Turno</th>${res.dias.map(iso => `<th>${DIAS_L[isoDow(iso)].toUpperCase()} <span>${+iso.slice(8, 10)}</span></th>`).join('')}</tr></thead>`;
}
function pxgTablaLocal(res, l) {
  const cfgL = localDe(S, l.id);
  const subLbl = f => cfgL && !cfgL.horarioSupuesto && horarioTxt(cfgL, f) ? esc(horarioTxt(cfgL, f)) : (f === 'M' ? 'apertura a mediodía' : 'tarde y noche');
  let h = `<div class="pxg-loc" style="--lc:${esc(l.color)}"><i></i><b>${esc(l.nombre)}</b><span>· ${esc(l.cocina)}</span></div>`;
  h += `<table class="pxg-tab pxg-local" style="--lc:${esc(l.color)}">${pxgCabeceraTabla(res)}<tbody>`;
  for (const f of l.franjas) {
    h += `<tr><td class="pxg-lbl"><b>${FRANJA_LBL[f.franja]}</b><small>${subLbl(f.franja)}</small></td>`;
    for (const d of f.dias) {
      if (!d.abierto) { h += `<td class="pxg-c cerr" data-cas="${d.iso}|${d.tid}"><span>Cerrado</span></td>`; continue; }
      const hueco = (d.slots || []).some(s => s.hueco);
      const cls = ['pxg-c', hueco ? 'hueco' : '', d.cambiado ? 'corr' : '', d.faltan ? 'corta' : ''].filter(Boolean).join(' ');
      h += `<td class="${cls}" data-cas="${d.iso}|${d.tid}">${pxCuenta({ n: d.n, min: d.min, supuesto: d.supuesto, faltan: d.faltan, refuerzo: d.refuerzo, hueco, cambiado: d.cambiado })}${(d.slots || []).map(s => pxSlot(s, f.franja)).join('')}</td>`;
    }
    h += '</tr>';
  }
  return h + '</tbody></table>';
}
function pxgLibran(res) {
  const deBaja = (res.resumen && res.resumen.deBaja || []).map(nombrePid);
  let h = `<div class="pxg-loc gris"><i></i><b>Quién libra cada día</b></div><table class="pxg-tab pxg-lib">${pxgCabeceraTabla(res)}<tbody><tr><td class="pxg-lbl"><b>Libran</b><small>${deBaja.length ? 'De baja: ' + esc(pxgLista(deBaja)) : 'sin turno ese día'}</small></td>`;
  for (const iso of res.dias) {
    const pids = res.libran[iso] || [];
    h += `<td class="pxg-c" data-libran="${iso}"><div class="pxg-cnt">${pids.length} libra${pids.length === 1 ? '' : 'n'}</div>${pids.length ? `<div class="pxg-chips">${pids.map(pid => `<span>${esc(nombrePid(pid))}</span>`).join('')}</div>` : '<span class="pxvacio">nadie</span>'}</td>`;
  }
  return h + '</tr></tbody></table>';
}
// frase de resumen de la página 1: qué se ha corregido, turnos y condiciones, huecos
function pxgResumen(res) {
  const partes = [];
  if (res.cambios.length) {
    const porDia = {};
    for (const c of res.cambios) { const { localId } = partirTurno(c.turnoId); (porDia[c.iso] = porDia[c.iso] || new Set()).add(pxgLocal(res, localId).nombre); }
    partes.push('Corregido ' + Object.keys(porDia).sort().map(iso => `el ${pxgDia(iso)} en ${pxgLista([...porDia[iso]])}`).join(', '));
  } else partes.push(res.aplicados ? `${res.aplicados} plazas nuevas sobre lo que había` : 'La semana ya estaba completa: nada que corregir');
  partes.push(`${res.resumen.turnos} turnos y ${res.resumen.condiciones} condiciones`);
  partes.push(res.huecos.length ? `${pxgNum(res.huecos.length)} hueco${res.huecos.length === 1 ? '' : 's'} que ninguna persona de la plantilla puede cubrir` : 'sin huecos');
  return partes.map(esc).join(' · ');
}
// ---- página 2 ----
function pxgCambios(res) {
  if (!res.cambios.length) return `<p class="pxg-p mut">Ningún turno cambia respecto a lo que ya había en la planilla${res.aplicados ? `: la propuesta solo añade ${res.aplicados} plaza${res.aplicados === 1 ? '' : 's'}` : ''}.</p>`;
  const grupos = new Map();
  for (const c of res.cambios) { const { localId, franja } = partirTurno(c.turnoId); const k = c.iso + '|' + localId; if (!grupos.has(k)) grupos.set(k, { iso: c.iso, localId, franjas: [] }); grupos.get(k).franjas.push({ franja, c }); }
  return [...grupos.values()].sort((a, b) => a.iso < b.iso ? -1 : a.iso > b.iso ? 1 : 0).map(g => {
    let h = `<div class="pxg-cambio"><h4>${esc(pxgLocal(res, g.localId).nombre)} · ${pxgDia(g.iso)}</h4>`;
    for (const { franja, c } of g.franjas.sort((a, b) => a.franja < b.franja ? -1 : 1)) {
      const d = pxgDiaDe(res, g.localId, franja, g.iso);
      const nuevos = c.despues.filter(p => !c.antes.includes(p)), fuera = c.antes.filter(p => !c.despues.includes(p));
      const fr = FRANJA_LBL[franja].toLowerCase();
      const quien = [nuevos.length ? `entra${nuevos.length > 1 ? 'n' : ''} ${pxgLista(nuevos.map(nombrePid))}` : '', fuera.length ? `sale${fuera.length > 1 ? 'n' : ''} ${pxgLista(fuera.map(nombrePid))}` : ''].filter(Boolean).join(' · ');
      h += `<p class="pxg-p">${pxgCap(fr)}: ${esc(quien)}.</p>`;
      h += `<div class="pxg-antes">${fr} · antes: ${c.antes.length ? `<s>${esc(c.antes.map(nombrePid).join(', '))}</s>` : '<s>vacía</s>'}</div>`;
      h += `<div class="pxg-ahora">${fr} · ahora: ${c.antes.length ? '' : '<em class="pxg-nueva-cas">nueva</em> '}${d && d.slots ? pxgPosiciones(d.slots, nuevos) : esc(c.despues.map(nombrePid).join(', '))}</div>`;
    }
    return h + '</div>';
  }).join('');
}
// los turnos continuos de la semana (la misma persona sale primera de mañana y de tarde)
function pxgContinuos(res) {
  const out = [];
  for (const l of res.locales) for (const f of l.franjas) { if (f.franja !== 'M') continue; for (const d of f.dias) for (const s of d.slots || []) if (s.continuo) out.push({ l, iso: d.iso, s }); }
  if (!out.length) return '';
  return `<h3 class="pxg-h2">${out.length === 1 ? 'El único turno continuo de la semana' : `Los ${pxgNum(out.length)} turnos continuos de la semana`}</h3>` + out.map(x => `<div class="pxg-cambio"><h4>${esc(x.l.nombre)} · ${pxgDia(x.iso)}</h4><p class="pxg-p">${esc(x.s.nombre)}${x.s.por ? ` cubre a ${esc(nombrePid(x.s.por))} y` : ''} sale ${/a$/i.test(x.s.nombre.split(' ')[0]) ? 'la primera' : 'el primero'} de mañana y de tarde: no es un partido, es un turno continuo y se marca <em class="pxg-tag c">C</em>.</p></div>`).join('');
}
// Personas a las que UNA sola condición les impide ocupar el hueco (y cuál): son la
// pista de «se destraparía si…». Quien está ausente o ya colocado esa franja en otro
// local no cuenta: eso no es una condición que se pueda levantar. Mismas reglas que
// puedeEstar / puedePrimero, pero contadas todas y no solo la primera que salta.
function pxgDestrapa(res, hu) {
  const { localId, franja } = partirTurno(hu.turnoId);
  const est = res.estado || estadoDeIso(hu.iso), iso = hu.iso, dow = isoDow(iso), l = localDe(S, localId);
  const enCasilla = pidsEn(est, iso, hu.turnoId);
  const otra = franja === 'M' ? 'T' : 'M';
  const out = [];
  for (const p of S.staff) {
    if (ausenciaEn(p, iso)) continue;
    const yaAqui = enCasilla.includes(p.id);
    if (yaAqui && hu.tipo !== 'primero') continue;
    if (turnosDe(S).some(t => t.franja === franja && t.id !== hu.turnoId && pidsEn(est, iso, t.id).includes(p.id))) continue;
    const act = k => regla(S, k) && caracteristicaActiva(p, k);
    const bl = [];
    if (!yaAqui) {
      if (act('locales') && (p.locales || []).length && !p.locales.includes(localId)) bl.push(`solo trabaja en ${lblLocales(S, p.locales)}`);
      if (act('franjas') && (p.franjas || []).length && !p.franjas.includes(franja)) bl.push(franja === 'M' ? 'solo hace tardes' : 'solo hace mañanas');
      if (act('libra') && (p.libra || []).includes(dow)) bl.push(`libra ${DOW_PL[dow]}`);
      if (act('vetos') && (p.vetos || []).some(v => v.localId === localId && v.franja === franja)) bl.push(`no hace ${franja === 'M' ? 'mañanas' : 'tardes'} en ${l ? l.nombre : localId}`);
      const enOtra = turnosDe(S).some(t => t.franja === otra && pidsEn(est, iso, t.id).includes(p.id));
      if (act('partido') && enOtra && !((p.partido || {}).siempre || ((p.partido || {}).dias || []).includes(dow))) bl.push(`no hace partido ${DOW_PL[dow]}`);
      if (regla(S, 'nuncaCon')) for (const q of enCasilla) { const qp = personaDeId(q); if (qp && ((caracteristicaActiva(p, 'nuncaCon') && (p.nuncaCon || []).includes(q)) || (caracteristicaActiva(qp, 'nuncaCon') && (qp.nuncaCon || []).includes(p.id)))) bl.push(`no coincide con ${qp.nombre}`); }
    }
    if (hu.tipo === 'primero') {
      if (regla(S, 'noPrimero') && caracteristicaActiva(p, 'noPrimero') && (p.noPrimero || []).includes(franja)) bl.push(`no sale ${franja === 'M' ? 'el primero de la mañana' : 'el primero de la tarde'}`);
      if (caracteristicaActiva(p, 'noAbre') && (p.noAbre || []).includes(localId)) bl.push(`no abre ${l ? l.nombre : localId}`);
      if (franja === 'T' && regla(S, 'primeroCompleto')) {
        const tm = turnosDe(S).find(t => t.franja === 'M' && pidsEn(est, iso, t.id).includes(p.id));
        if (tm && !(tm.local.id === localId && primeroDe(S, S.staff, est, iso, tm.id) === p.id)) bl.push('viene de hacer la mañana y el primero de la tarde hace turno completo');
      }
    }
    if (bl.length === 1) out.push({ nombre: p.nombre, motivo: bl[0] });
  }
  return out;
}
const PXG_DURO = /^ya en |^ya está|^de baja|^de vacaciones|^día libre|^de permiso|^ausente|^no existe|no abre la |^nadie de la casilla/;
function pxgHuecos(res) {
  if (!res.huecos.length) return '<p class="pxg-p mut">Todas las posiciones tienen nombre: no queda ningún hueco disponible.</p>';
  const nPlantilla = S.staff.filter(p => !deBaja(p, res.lunes)).length;
  return res.huecos.map(hu => {
    const { localId, franja } = partirTurno(hu.turnoId);
    const l = pxgLocal(res, localId), d = pxgDiaDe(res, localId, franja, hu.iso), slots = (d && d.slots) || [];
    const fr = FRANJA_LBL[franja].toLowerCase();
    let h = `<div class="pxg-hueco"><h4>${esc(l.nombre)} · ${pxgDia(hu.iso)} por la ${fr}</h4>`;
    if (hu.tipo === 'primero') h += `<p class="pxg-p">Ninguna de las ${pxgNum(nPlantilla)} personas puede abrir esa ${fr}. ${esc(pxgCap(String(hu.motivo || '').replace(/^nadie de la casilla puede abrir:?\s*/i, 'En la casilla, ')))}${/[.!?]$/.test(hu.motivo || '') ? '' : '.'}</p>`;
    else h += `<p class="pxg-p">Faltan ${pxgNum(hu.faltan)} para el mínimo de ${hu.minimo}${hu.supuesto ? ' (mínimo supuesto)' : ''}${d && d.refuerzo ? ', que ese día lleva refuerzo por el evento' : ''}: ninguna de las ${pxgNum(nPlantilla)} personas puede entrar.</p>`;
    // el resto de la plantilla, por motivo (solo los que son condiciones; los ya colocados y los de baja, en una frase)
    const pq = Object.entries(hu.porQueNadie || {}).filter(([m]) => !PXG_DURO.test(m) && !/viene de hacer la mañana|no sale el primero/.test(m));
    const colocados = Object.entries(hu.porQueNadie || {}).filter(([m]) => /^ya en /.test(m)).reduce((a, [, qs]) => a + qs.length, 0);
    if (pq.length && hu.tipo === 'primero') h += `<p class="pxg-p pq">El resto: ${pq.slice(0, 4).map(([m, qs]) => `<b>${esc(m)}</b> (${esc(pxgLista(qs))})`).join(' · ')}${pq.length > 4 ? ' · …' : ''}${colocados ? `; ${pxgNum(colocados)} más ya están colocados esa ${fr} en otro local` : ''}.</p>`;
    if (slots.length) h += `<p class="pxg-p"><b>Queda:</b> ${pxgPosiciones(slots)}.${hu.tipo === 'primero' && d && d.n >= d.min ? ` El mínimo de ${pxgNum(d.min)} está cubierto; lo que falta es quien abra.` : ''}</p>`;
    const des = pxgDestrapa(res, hu);
    h += `<p class="pxg-des">${des.length ? `Se destraparía si se levantara una sola condición: ${des.map(x => `<b>${esc(x.nombre)}</b>, que ${esc(x.motivo)}`).join('; ')}. Decisión del cliente, no nuestra.` : `No se destrapa levantando una sola condición: a cada persona de la plantilla la frenan dos o más, o ya está colocada esa ${fr}.`}</p>`;
    return h + '</div>';
  }).join('');
}
function pxgCondicionesNuevas(res) {
  const nuevas = res.condiciones.filter(c => c.nueva);
  if (!nuevas.length) return '<p class="pxg-p mut">Esta semana no hay condiciones nuevas.</p>';
  return nuevas.map(c => `<div class="pxg-nueva${c.ok ? '' : ' ko'}"><i>${c.num}</i><p><b>${esc(c.texto)}.</b>${c.ok ? '' : `<small class="bad">No se cumple: ${esc(c.detalle)}.</small>`}</p></div>`).join('');
}
function pxgPreguntas(res) {
  const out = [];
  const sin = { M: [], T: [] }, con = [];
  for (const l of S.locales) for (const f of FRANJAS) {
    if (!(l.abre && l.abre[f] && l.abre[f].length)) continue;
    const fijo = (l.primero && l.primero[f]) || S.staff.some(p => caracteristicaActiva(p, 'abre') && p.abre && p.abre[l.id] && p.abre[l.id].includes(f));
    if (fijo) con.push(`${l.nombre} (${FRANJA_LBL[f].toLowerCase()})`); else sin[f].push(l.nombre);
  }
  if (sin.M.length || sin.T.length) out.push(`<b>¿Quién sale el primero ${[sin.M.length ? `por la mañana en ${esc(pxgLista(sin.M))}` : '', sin.T.length ? `por la tarde en ${esc(pxgLista(sin.T))}` : ''].filter(Boolean).join(', y ')}?</b> ${con.length ? `Ya consta en ${esc(pxgLista(con))}. ` : ''}Ahora pesa más, porque el primero de la casilla define quién hace turno completo.`);
  for (const p of S.staff) for (const s of p.supuestos || []) out.push(`<b>${esc(p.nombre)}:</b> ${esc(s)}.`);
  const mins = [];
  for (const l of S.locales) for (const f of FRANJAS) { const r = resumenMinimos(l, f); if (r && r.includes('*')) mins.push(`${l.nombre} por la ${FRANJA_LBL[f].toLowerCase()}: ${r}`); }
  if (mins.length) out.push(`<b>¿Confirmáis los mínimos marcados con *?</b> Son los que no fijó el cliente: ${esc(mins.join(' · '))}.`);
  if (S.locales.some(l => l.horarioSupuesto)) out.push('<b>Horarios reales de entrada y salida.</b> Sin ellos, «turno completo», «partido» y «continuo» son etiquetas en un papel y no horas que se puedan contar para nóminas.');
  return out.length ? out.map(t => `<div class="pxg-preg"><i></i><p>${t}</p></div>`).join('') : '<p class="pxg-p mut">Sin preguntas pendientes.</p>';
}
function pxgCondicionesTodas(res) {
  return `<div class="pxg-conds${res.condiciones.length > 60 ? ' muchas' : ''}">${res.condiciones.map(c => `<div class="pxg-cond${c.ok ? '' : ' ko'}${c.informativa ? ' info' : ''}"><i>${c.num}</i><b class="${c.ok ? 'ok' : 'ko'}">${c.ok ? '✓' : '✗'}</b><span>${esc(c.texto)}${c.nueva ? ' <em class="nueva">NUEVA</em>' : ''}${c.ok ? '' : `<small>${esc(c.detalle)}</small>`}</span></div>`).join('')}</div>`;
}
function pxgConclusion(res) {
  const r = res.resumen, nH = res.huecos.length;
  const cortos = [];
  for (const l of res.locales) for (const f of l.franjas) for (const d of f.dias) if (d.abierto && d.faltan) cortos.push(`${l.nombre} ${pxgDia(d.iso)} por la ${FRANJA_LBL[f.franja].toLowerCase()}`);
  const sinCocina = res.condiciones.some(c => c.tipo === 'cocina' && !c.ok);
  const partes = [];
  partes.push(`<b>La semana sale ${nH ? `con ${pxgNum(nH)} hueco${nH === 1 ? '' : 's'}` : 'sin huecos'}.</b>`);
  partes.push(cortos.length ? `De los ${r.turnos} turnos, ${r.turnos - cortos.length} tienen su gente mínima y ${pxgNum(cortos.length)} se queda${cortos.length === 1 ? '' : 'n'} por debajo (${esc(pxgLista(cortos))})` : `Los ${r.turnos} turnos tienen su gente mínima${sinCocina ? '' : ' y su cocina'}`);
  partes.push(r.condicionesRotas ? `se cumplen ${r.condiciones - r.condicionesRotas} de las ${r.condiciones} condiciones (${pxgNum(r.condicionesRotas)} no)` : `se cumplen las ${r.condiciones} condiciones`);
  partes.push(`nadie pasa de ${pxgNum(r.maxDias)} días y los ${r.descansos} descansos caen donde tocan.`);
  let txt = partes[0] + ' ' + partes.slice(1, -1).join(', ') + ' y ' + partes[partes.length - 1];
  const primeros = res.huecos.filter(h => h.tipo === 'primero');
  if (primeros.length) txt += ` Lo único que no sale es quién abre ${esc(pxgLista(primeros.map(h => { const { localId, franja } = partirTurno(h.turnoId); return `la ${FRANJA_LBL[franja].toLowerCase()} del ${pxgDia(h.iso)} en ${pxgLocal(res, localId).nombre}`; })))}: ninguna persona de la plantilla puede hacerlo sin romper una condición, así que ${primeros.length === 1 ? 'queda señalado' : 'quedan señalados'} como turno disponible.`;
  return `<div class="pxg-fin">${txt}</div>`;
}
function abrirImpresionSemanaGenerada(res, opts) {
  if (!res || !Array.isArray(res.dias) || !Array.isArray(res.locales)) { toast('No hay planilla generada que imprimir', 'warn'); return; }
  const o = opts || {};
  const titulo = o.titulo || 'Planilla propuesta';
  const lunes = res.lunes || res.dias[0];
  const nH = res.huecos.length;
  // página 1: la planilla
  let h1 = pxgCabecera(res, titulo, `semana ${rangoSemanaTxt(lunes)}`, pxgResumen(res), 1);
  for (const l of res.locales) h1 += pxgTablaLocal(res, l);
  h1 += pxgLibran(res);
  h1 += pxLeyendaCasilla(`<span class="cor"><b>ámbar con marca</b>· turno corregido respecto a lo que había en la planilla</span>`);
  // página 2: qué ha cambiado
  const nC = res.cambios.length;
  const subt = `y ${nH ? `${nH === 1 ? 'el hueco que queda disponible' : `los ${pxgNum(nH)} huecos que quedan disponibles`}` : 'ningún hueco por cubrir'}`;
  const resumen2 = `${nC ? `${pxgCap(pxgNum(nC))} turno${nC === 1 ? '' : 's'} resuelto${nC === 1 ? '' : 's'}` : 'Ningún turno cambia'}, ${nH ? `${pxgNum(nH)} que ninguna persona de la plantilla puede cubrir` : 'ninguno sin cubrir'}, y las condiciones nuevas que lo gobiernan`;
  const nuevas = res.condiciones.filter(c => c.nueva).length;
  let h2 = pxgCabecera(res, 'Qué ha cambiado', subt, esc(resumen2), 2);
  h2 += `<div class="pxg-cols${nH > 2 ? ' muchos' : ''}">
    <div class="pxg-col"><h3 class="pxg-h2">${nC ? (nC === 1 ? 'El turno resuelto' : `Los ${pxgNum(nC)} turnos resueltos`) : 'Qué ha cambiado'}</h3>${pxgCambios(res)}${pxgContinuos(res)}</div>
    <div class="pxg-col"><h3 class="pxg-h2">${nH ? (nH === 1 ? 'El hueco que queda disponible' : `Los ${pxgNum(nH)} huecos que quedan disponibles`) : 'Huecos disponibles'}</h3>${pxgHuecos(res)}</div>
    <div class="pxg-col"><h3 class="pxg-h2">${nuevas ? (nuevas === 1 ? 'La condición nueva' : `Las ${pxgNum(nuevas)} condiciones nuevas`) : 'Condiciones nuevas'}</h3>${pxgCondicionesNuevas(res)}
      <h3 class="pxg-h2">Preguntas para el cliente</h3>${pxgPreguntas(res)}
      <h3 class="pxg-h2">Un turno sin solución no se rellena</h3><p class="pxg-p">Cuando nadie puede ocupar una posición sin romper una condición, el reparto no coloca a ningún nombre: deja la posición marcada como hueco disponible, con el motivo, y el turno queda a la vista para ofrecérselo a quien pueda cogerlo. Es preferible un hueco señalado a un nombre que no puede estar ahí.</p></div>
  </div>`;
  h2 += `<h3 class="pxg-h2 pxg-h2c">Las ${res.condiciones.length} condiciones que comprueba el simulador sobre cada semana que genera</h3>${pxgCondicionesTodas(res)}`;
  h2 += pxgConclusion(res);
  h2 += `<div class="pxg-foot">Propuesta generada por Shiftia con las condiciones facilitadas por el cliente · Highkey Labs · ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</div>`;
  montarImpresion(`<div class="pxg-pag">${h1}</div><div class="pxg-pag pxg-p2">${h2}</div>`, true, `Planilla_semana_generada_${lunes}`, { volcar: o.volcar });
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
