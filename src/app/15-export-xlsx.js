// ================= EXPORT .XLSX (SheetJS bajo demanda) =================
// Dos exportaciones: la semana (hoja general con los cuatro locales y una hoja por
// local, cada una con su pie de descansos) y las horas del mes (hoja «Horas» persona ×
// columnas y hoja «Locales»). SheetJS se descarga del CDN la primera vez, con hash de
// integridad: el navegador rechaza el fichero si no coincide. Sin red no hay Excel;
// queda Imprimir / PDF. Las piezas de la semana (columnas, casillas, pie de descansos)
// son las mismas que usa 14-impresiones.js: el Excel dice lo mismo que la hoja.
function cargarScript(src, integridad) {
  return new Promise((res, rej) => {
    const sc = document.createElement('script');
    sc.src = src; sc.onload = res; sc.onerror = () => rej(new Error('sin red o CDN bloqueado'));
    if (integridad) { sc.integrity = integridad; sc.crossOrigin = 'anonymous'; }   // el navegador rechaza el fichero si no coincide el hash
    document.head.appendChild(sc);
  });
}
const XLSX_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
const XLSX_SRI = 'sha384-vtjasyidUo0kW94K5MXDXntzOJpQgBKXmE7e2Ga4LG0skTTLeBi97eFAXsqewJjw';
async function asegurarXlsx() {
  if (window.XLSX) return;
  toast('Preparando el exportador…', 'ok');
  await cargarScript(XLSX_SRC, XLSX_SRI);
}
let exportando = false;

// ---------- piezas de la semana ----------
// «Victoria (abre) + Hojan (cocina)»: en el orden de la casilla, con las marcas en texto
function xlsxNombres(lista) {
  return lista.map((e, i) => nombrePid(e.pid) + (abreEn(lista, i) ? ' (abre)' : '') + (e.cocina ? ' (cocina)' : '')).join(' + ');
}
function xlsxCasilla(c, l, franja) {
  const tid = turnoId(l.id, franja);
  if (!turnoAbierto(S, c.est, c.iso, tid)) { const ci = cierreEn(S, c.iso, tid); return ci ? `CERRADO · ${etiquetaCierre(ci)}` : '—'; }   // el motivo, como en la hoja (24/09, D11)
  return xlsxNombres(asignados(c.est, c.iso, tid));
}
// «mañana 1 · tarde 2»: personas que faltan ese día para el mínimo de cada franja
function xlsxFaltan(c, l) {
  const partes = [];
  for (const f of FRANJAS) {
    const tid = turnoId(l.id, f);
    if (!turnoAbierto(S, c.est, c.iso, tid)) continue;
    // lo que falta lo dice la Revisión (revisarTurno): con «Mínimos» apagado no falta nadie (D5; revisión de la fase 6)
    const n = revisarTurno(S, S.staff, c.est, c.iso, tid).faltan;
    if (n) partes.push(`${FRANJA_LBL[f].toLowerCase()} ${n}`);
  }
  return partes.join(' · ');
}
function xlsxFilasLocal(l, cols) {
  return [
    [l.nombre.toUpperCase()],
    ...FRANJAS.map(f => [`${FRANJA_LBL[f]} ${horarioTxt(l, f)}`.trim(), ...cols.map(c => xlsxCasilla(c, l, f))]),
    ['Faltan', ...cols.map(c => xlsxFaltan(c, l))],
  ];
}
function xlsxFilasDescansos(cols, personas) {
  const { porDia, bajaToda } = pxDescansos(cols, personas);
  const tipo = a => (AUS_LBL[a.tipo] ? AUS_LBL[a.tipo].label : a.tipo).toLowerCase();
  const out = [
    ['PIE DE DESCANSOS'],
    ['Libran', ...porDia.map(x => x.libran.map(p => p.nombre).join(' + '))],
    ['Ausencias', ...porDia.map(x => x.ausentes.map(({ p, a }) => `${p.nombre} (${tipo(a)})`).join(' + '))],
  ];
  if (bajaToda.length) out.push(['De baja toda la semana', bajaToda.map(p => p.nombre).join(' + ')]);
  return out;
}
// Excel no admite [ ] : * ? / \ en el nombre de una hoja ni más de 31 caracteres
function xlsxNombreHoja(nombre, usados) {
  let base = String(nombre || 'Hoja').replace(/[\[\]:*?/\\]/g, ' ').trim().slice(0, 31) || 'Hoja';
  let n = base, i = 2;
  while (usados.includes(n)) n = `${base.slice(0, 28)} ${i++}`;
  usados.push(n);
  return n;
}
function xlsxCabeceraSemana(cols) {
  return ['LOCAL / FRANJA', ...cols.map(c => `${DIAS_L[c.dow].toUpperCase()} ${c.d}${c.festivo ? ' · FESTIVO' : ''}${c.eventos.length ? ' · ' + c.eventos.map(e => e.nombre || 'evento').join(', ') : ''}`)];
}

// ---------- semana ----------
async function exportarExcel() {
  if (exportando) return;
  exportando = true;
  try {
    await asegurarXlsx();
    const lunes = S.semLunes || mondayOf(isoHoy());
    const cols = pxColsSemana(lunes);
    const rango = rangoSemanaTxt(lunes);
    const cab = xlsxCabeceraSemana(cols);
    const wb = XLSX.utils.book_new();
    const usados = [];
    const hoja = (nombre, filas) => {
      const ws = XLSX.utils.aoa_to_sheet(filas);
      ws['!cols'] = [{ wch: 26 }].concat(cols.map(() => ({ wch: 34 })));
      XLSX.utils.book_append_sheet(wb, ws, xlsxNombreHoja(nombre, usados));
    };
    // hoja general: los cuatro locales y el pie de descansos de todo el equipo
    const general = [[`GRUPO PASARELA · Semana ${rango}`], cab];
    for (const l of S.locales) general.push(...xlsxFilasLocal(l, cols));
    general.push(...xlsxFilasDescansos(cols, S.staff));
    if (S.locales.some(l => l.horarioSupuesto)) general.push([], ['Horarios de apertura aún sin confirmar por el grupo']);
    hoja('Semana', general);
    // una hoja por local, con el pie de descansos de su plantilla
    for (const l of S.locales) {
      hoja(l.nombre, [[`${l.nombre.toUpperCase()} · Semana ${rango}`], cab, ...xlsxFilasLocal(l, cols), ...xlsxFilasDescansos(cols, S.staff.filter(p => (p.locales || []).includes(l.id)))]);
    }
    XLSX.writeFile(wb, `Planilla_semana_${lunes}.xlsx`);
    toast('Excel generado: una hoja general y una por local. Si el navegador no lo descarga, usa Imprimir / PDF.', 'ok');
  } catch (e) {
    toast('Aquí no se puede descargar (sin red o visor web). Usa Imprimir / PDF, o abre la app en un ordenador.', 'warn');
  } finally {
    exportando = false;
  }
}

// ---------- horas del mes ----------
// el mes es el de la vista Horas (S.hY/S.hM). Números sin formatear: que Excel pueda sumar.
async function exportarExcelHoras() {
  if (exportando) return;
  exportando = true;
  try {
    await asegurarXlsx();
    const { y, m, k, nombre } = mesHoras();
    const filas = horasEquipoMes(S, S.staff, S.meses, y, m);
    const porPid = new Map(filas.map(f => [f.pid, f]));
    const cierre = (S.cierres || {})[k];
    const r1 = v => Math.round((+v || 0) * 10) / 10;
    const aoa = [[`GRUPO PASARELA · Horas de ${nombre}${cierre ? ` · CERRADO el ${new Date(cierre.ts).toLocaleDateString('es-ES')}${cierre.usuario ? ' por ' + cierre.usuario : ''}` : ' · mes abierto, cifras provisionales'}`]];
    if (S.locales.some(l => l.horarioSupuesto)) aoa.push(['AVISO: los horarios de apertura aún no están confirmados por el grupo; las horas son estimadas']);
    aoa.push(['PERSONA', 'PUESTO', 'DÍAS', 'MAÑANAS', 'TARDES', 'PARTIDOS', 'HORAS', 'EXTRAS (h)', 'FESTIVOS (días)', 'DOMINGOS (días)', 'NOCTURNAS (h)', 'CONTRATO (h)', 'SALDO (h)', 'OBSERVACIONES']);
    const tot = { dias: 0, mananas: 0, tardes: 0, partidos: 0, horas: 0, extras: 0, festivas: 0, domingos: 0, noct: 0, contrato: 0, saldo: 0, conContrato: 0 };
    for (const { p, baja } of ordenPersonasMes(isoDe(y, m, diasDelMes(y, m)))) {
      const f = porPid.get(p.id); if (!f) continue;
      tot.dias += f.dias; tot.mananas += f.mananas; tot.tardes += f.tardes; tot.partidos += f.partidos; tot.horas += f.horas; tot.extras += f.extrasMin / 60;
      tot.festivas += f.festivas; tot.domingos += f.domingos; tot.noct += f.horasNocturnas;
      if (f.contratoHoras !== null) { tot.contrato += f.contratoHoras; tot.saldo += f.saldo; tot.conContrato++; }
      const obs = [baja ? 'de baja' : '', f.ausencias ? `${pl(f.ausencias, 'día', 'días')} de ausencia` : '', f.forzados ? `${pl(f.forzados, 'asignación forzada', 'asignaciones forzadas')}` : ''].filter(Boolean).join(' · ');
      aoa.push([p.nombre, puestoLbl(p), f.dias, f.mananas, f.tardes, f.partidos, r1(f.horas), r1(f.extrasMin / 60), f.festivas, f.domingos, r1(f.horasNocturnas), f.contratoHoras === null ? '' : f.contratoHoras, f.saldo === null ? '' : f.saldo, obs]);
    }
    aoa.push(['TOTAL', '', tot.dias, tot.mananas, tot.tardes, tot.partidos, r1(tot.horas), r1(tot.extras), tot.festivas, tot.domingos, r1(tot.noct), tot.conContrato ? r1(tot.contrato) : '', tot.conContrato ? r1(tot.saldo) : '', '']);
    aoa.push([], ['Horas = turnos + extras · Contrato = horas semanales × días del mes, descontadas las ausencias · Saldo = horas − contrato · Nocturnas = horas entre las 22:00 y las 06:00']);
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{ wch: 22 }, { wch: 10 }].concat(Array.from({ length: 11 }, () => ({ wch: 12 })), [{ wch: 36 }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Horas');
    const loc = [[`GRUPO PASARELA · Horas por local · ${nombre}`], ['LOCAL', 'TURNOS', 'HORAS', 'PERSONAS', 'HORARIO MAÑANA', 'HORARIO TARDE', 'HORARIO CONFIRMADO']];
    for (const x of horasLocalMes(S, S.staff, S.meses, y, m)) {
      const l = localDe(S, x.localId);
      loc.push([x.nombre, x.turnos, x.horas, x.personas, horarioTxt(l, 'M'), horarioTxt(l, 'T'), l && l.horarioSupuesto ? 'no (estimado)' : 'sí']);
    }
    const ws2 = XLSX.utils.aoa_to_sheet(loc);
    ws2['!cols'] = [{ wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 30 }, { wch: 30 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'Locales');
    XLSX.writeFile(wb, `Horas_${k}.xlsx`);
    toast(`Excel de horas de ${nombre} generado`, 'ok');
  } catch (e) {
    toast('Aquí no se puede descargar (sin red o visor web). Usa Imprimir / PDF, o abre la app en un ordenador.', 'warn');
  } finally {
    exportando = false;
  }
}
{ const b = $('#xlsxBtn'); if (b) b.addEventListener('click', exportarExcel); }
