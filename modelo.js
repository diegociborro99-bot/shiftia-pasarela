// Modelo de planificación — Grupo Pasarela (El 33, Zapatillera, Bar Mónaco, Pasarela).
// Fuente: documento de trabajo Highkey Labs «Grupo Pasarela» (14/09/2026) y las
// respuestas de Diego al cuestionario previo (14/09/2026).
// JS puro, sin DOM. dow: 1=lunes … 7=domingo. Fechas siempre ISO yyyy-mm-dd.
//
// Vocabulario del grupo, usado tal cual: casilla (lista ORDENADA de personas de un
// local y una franja), abre / sale primero (posición 1), cocina (posición fija),
// partido (mañana y tarde el mismo día), dobla (partido en dos locales), libra,
// comodín, apoyo, reserva, turno descubierto, pie de descansos. La «noche» entra
// dentro de la tarde.

'use strict';

// ---------- fechas ----------
const MEMO_FECHA = new Map();
function fechaLocal(iso) {
  let t = MEMO_FECHA.get(iso);
  if (t === undefined) { t = new Date(iso + 'T12:00:00').getTime(); if (MEMO_FECHA.size > 4000) MEMO_FECHA.clear(); MEMO_FECHA.set(iso, t); }
  return new Date(t);
}
function isoDow(iso) { const d = fechaLocal(iso).getDay(); return d === 0 ? 7 : d; }
function addDias(iso, n) {
  const d = fechaLocal(iso); d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function diasDelMes(y, m) { return new Date(y, m, 0).getDate(); }
function isoDe(y, m, d) { return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`; }
function claveMes(y, m) { return `${y}-${String(m).padStart(2, '0')}`; }
function mondayOf(iso) { return addDias(iso, 1 - isoDow(iso)); }
const semanaDe = mondayOf;
function fechaMadrid(fecha) {
  const d = fecha || new Date();
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
  const g = t => p.find(x => x.type === t).value;
  return `${g('year')}-${g('month')}-${g('day')}`;
}
function* rangoIso(desde, hasta) { for (let iso = desde; iso <= hasta; iso = addDias(iso, 1)) yield iso; }

// ---------- catálogo ----------
const FRANJAS = ['M', 'T'];
const FRANJA_LBL = { M: 'Mañana', T: 'Tarde' };
const DOW_LBL = ['', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const DOW_PL = ['', 'los lunes', 'los martes', 'los miércoles', 'los jueves', 'los viernes', 'los sábados', 'los domingos'];
const TODOS = [1, 2, 3, 4, 5, 6, 7];
const TIPOS_AUSENCIA = [
  { id: 'BAJ', label: 'Baja', motivo: 'de baja' },
  { id: 'VAC', label: 'Vacaciones', motivo: 'de vacaciones' },
  { id: 'LD', label: 'Día libre', motivo: 'día libre' },
  { id: 'PERM', label: 'Permiso', motivo: 'de permiso' },
  { id: 'OTRO', label: 'Otro motivo', motivo: 'ausente' },
];
const AUS_LBL = {}; TIPOS_AUSENCIA.forEach(t => { AUS_LBL[t.id] = t; });
const PUESTOS = [
  { id: 'sala', label: 'Sala' }, { id: 'cocina', label: 'Cocina' },
  { id: 'apoyo', label: 'Apoyo' }, { id: 'comodin', label: 'Comodín' },
];

function turnoId(localId, franja) { return `${localId}_${franja}`; }
function partirTurno(tid) { const i = tid.lastIndexOf('_'); return { localId: tid.slice(0, i), franja: tid.slice(i + 1) }; }
function turnosDe(cfg) { const out = []; for (const l of cfg.locales) for (const f of FRANJAS) out.push({ id: turnoId(l.id, f), localId: l.id, franja: f, local: l }); return out; }
function localDe(cfg, localId) { return cfg.locales.find(l => l.id === localId) || null; }
function personaDe(staff, pid) { return staff.find(p => p.id === pid) || null; }
function nombreDe(staff, pid) { const p = personaDe(staff, pid); return p ? p.nombre : pid; }

// ---------- apertura y mínimos ----------
// abierto = el local abre esa franja ese día de la semana, salvo cierre puntual (est.apertura)
function turnoAbierto(cfg, est, iso, tid) {
  const { localId, franja } = partirTurno(tid);
  const l = localDe(cfg, localId);
  if (!l) return false;
  const ov = est && est.apertura && est.apertura[iso] && est.apertura[iso][tid];
  if (ov !== undefined && ov !== null) return !!ov;
  return ((l.abre && l.abre[franja]) || []).includes(isoDow(iso));
}
function toggleApertura(est, iso, tid, cfg) {
  const cur = turnoAbierto(cfg, est, iso, tid);
  (est.apertura[iso] = est.apertura[iso] || {})[tid] = !cur;
  return !cur;
}
function turnosAbiertosSemana(cfg) {
  let n = 0;
  for (const l of cfg.locales) for (const f of FRANJAS) n += ((l.abre && l.abre[f]) || []).length;
  return n;
}
function turnosAbiertosMes(cfg, est) {
  let n = 0;
  for (const d of est.days) for (const t of turnosDe(cfg)) if (turnoAbierto(cfg, est, d.iso, t.id)) n++;
  return n;
}
function turnosConSupuesto(cfg) {
  let n = 0;
  for (const l of cfg.locales) for (const f of FRANJAS) for (const dow of (l.abre && l.abre[f]) || []) if (l.supuestos && l.supuestos[f] && l.supuestos[f][dow]) n++;
  return n;
}
function eventosDe(cfg, iso) { return (cfg.eventos || []).filter(e => e.iso === iso); }
// mínimo de una casilla: el de la tabla del local + el refuerzo de los eventos del día
function minimoDe(cfg, iso, tid) {
  const { localId, franja } = partirTurno(tid);
  const l = localDe(cfg, localId);
  const dow = isoDow(iso);
  const base = l && l.minimos && l.minimos[franja] && l.minimos[franja][dow] !== undefined ? +l.minimos[franja][dow] : 0;
  const supuesto = !!(l && l.supuestos && l.supuestos[franja] && l.supuestos[franja][dow]);
  let refuerzo = 0; const evs = [];
  for (const e of eventosDe(cfg, iso)) {
    if (e.franja && e.franja !== 'MT' && e.franja !== franja) continue;
    const r = e.refuerzo && +e.refuerzo[localId];
    if (r > 0) { refuerzo += r; evs.push(e); }
  }
  return { min: base + refuerzo, base, supuesto, refuerzo, eventos: evs };
}

// ---------- estado mensual ----------
// est.asig[iso][turnoId] = [{ pid, cocina, abre, origen, razon, supuesto, forzado?, avisos?, ini?, fin?, nota? }]
// el ORDEN del array es la posición en la casilla y se persiste tal cual
function nuevoEstado(y, m, opts) {
  const festivos = (opts && opts.festivos) || [];
  const n = diasDelMes(y, m);
  const days = [];
  for (let d = 1; d <= n; d++) { const iso = isoDe(y, m, d); days.push({ d, iso, dow: isoDow(iso), festivo: festivos.includes(iso) }); }
  return { y, m, days, festivos, apertura: {}, asig: {}, manual: {} };
}
function estadoDesde(meses, festivos, y, m) {
  const e = nuevoEstado(y, m, { festivos: festivos || [] });
  const k = claveMes(y, m);
  const guardado = meses && meses[k];
  if (guardado) {
    guardado.asig = guardado.asig || {}; guardado.apertura = guardado.apertura || {}; guardado.manual = guardado.manual || {};
    e.asig = guardado.asig; e.apertura = guardado.apertura; e.manual = guardado.manual;
  }
  return e;
}
function clonarEstado(est) {
  return Object.assign({}, est, { asig: JSON.parse(JSON.stringify(est.asig || {})), apertura: JSON.parse(JSON.stringify(est.apertura || {})), manual: JSON.parse(JSON.stringify(est.manual || {})) });
}
function asignados(est, iso, tid) { return ((est.asig[iso] || {})[tid]) || []; }
function pidsEn(est, iso, tid) { return asignados(est, iso, tid).map(x => x.pid); }
function casillasDe(est, iso, pid) {
  const out = [];
  for (const [tid, lista] of Object.entries(est.asig[iso] || {})) { const e = lista.find(x => x.pid === pid); if (e) out.push({ tid, entry: e }); }
  return out;
}
function manualDe(est, iso, tid) { return (est.manual && est.manual[iso] && est.manual[iso][tid]) || {}; }
function marcarManual(est, iso, tid, k) { est.manual = est.manual || {}; ((est.manual[iso] = est.manual[iso] || {})[tid] = est.manual[iso][tid] || {})[k] = true; }
function primerDiaPlanificable(est, hoy) {
  const h = hoy || fechaMadrid();
  const d = est.days.find(x => x.iso >= h);
  return d ? d.iso : null;
}

// ---------- ausencias ----------
function ausenciaEn(persona, iso) {
  for (const a of persona.ausencias || []) if (iso >= a.desde && (!a.hasta || iso <= a.hasta)) return a;
  return null;
}
function quitarDiaDeAusencia(ausencias, iso) {
  const out = [];
  for (const a of ausencias || []) {
    const h = a.hasta || a.desde;
    if (iso < a.desde || iso > h) { out.push(a); continue; }
    if (a.desde < iso) out.push(Object.assign({}, a, { hasta: addDias(iso, -1) }));
    if (h > iso) out.push(Object.assign({}, a, { desde: addDias(iso, 1), hasta: a.hasta }));
  }
  return out;
}
// alta sin duplicados: si solapa o toca otra del mismo tipo, se alarga esa
function anadirAusencia(persona, aus) {
  const a = Object.assign({}, aus);
  if (!a.hasta && a.tipo !== 'BAJ') a.hasta = a.desde;
  if (a.hasta && a.hasta < a.desde) a.hasta = a.desde;
  persona.ausencias = persona.ausencias || [];
  const toca = (x, y) => (!x.hasta || !y.hasta) ? (x.tipo === y.tipo && x.tipo === 'BAJ') : !(addDias(x.hasta, 1) < y.desde || addDias(y.hasta, 1) < x.desde);
  const ex = persona.ausencias.find(x => x.tipo === a.tipo && toca(x, a));
  if (ex && ex.hasta && a.hasta) {
    ex.desde = ex.desde < a.desde ? ex.desde : a.desde;
    ex.hasta = ex.hasta > a.hasta ? ex.hasta : a.hasta;
    if (a.detalle && !(ex.detalle || '').includes(a.detalle)) ex.detalle = [ex.detalle, a.detalle].filter(Boolean).join(' · ');
    persona.ausencias.sort((x, y) => x.desde < y.desde ? -1 : 1);
    return { fusionada: true, ausencia: ex };
  }
  persona.ausencias.push(a);
  persona.ausencias.sort((x, y) => x.desde < y.desde ? -1 : 1);
  return { fusionada: false, ausencia: a };
}
function deBaja(persona, iso) { const a = ausenciaEn(persona, iso || fechaMadrid()); return !!(a && a.tipo === 'BAJ'); }

// ---------- cocina ----------
function localTieneCocina(l, franja) {
  if (!l || !l.cocina) return false;
  if (l.cocina.obligatoria && l.cocina.obligatoria[franja]) return true;
  return !!(l.cocina.titulares && l.cocina.titulares[franja] && l.cocina.titulares[franja].length);
}
// ¿puede llevar la cocina de ese local ese día? titular o reserva del local, y sin veto de días
function puedeCocina(cfg, persona, localId, iso) {
  if (!persona) return false;
  const c = persona.cocina || {};
  if (c.nunca) return false;
  const esDe = (c.titular || []).includes(localId) || (c.reserva || []).includes(localId);
  if (!esDe && persona.puesto !== 'cocina') return false;
  if (Array.isArray(c.soloDias) && c.soloDias.length && iso && !c.soloDias.includes(isoDow(iso))) return false;
  return true;
}
// prioridad de cocina en un local y franja: titulares por su orden, luego reservas
function rangoCocina(cfg, l, persona, franja, iso) {
  if (!puedeCocina(cfg, persona, l.id, iso)) return -1;
  const tit = (l.cocina && l.cocina.titulares && l.cocina.titulares[franja]) || [];
  const res = (l.cocina && l.cocina.reservas) || [];
  let i = tit.indexOf(persona.id); if (i >= 0) return i;
  i = res.indexOf(persona.id); if (i >= 0) return 100 + i;
  return 500;
}
function abrePorDefecto(cfg, l, persona, franja) {
  if (!persona) return false;
  if ((persona.noAbre || []).includes(l.id)) return false;
  if (l.primero && l.primero[franja] === persona.id) return true;
  return !!(persona.abre && persona.abre[l.id] && persona.abre[l.id].includes(franja));
}

// ---------- reglas duras por persona ----------
function motivoAusencia(a) { return a ? (AUS_LBL[a.tipo] ? AUS_LBL[a.tipo].motivo : 'ausente') : ''; }
function lblLocales(cfg, ids) { return ids.map(id => (localDe(cfg, id) || { nombre: id }).nombre).join(' o '); }
// Devuelve {ok, motivo, avisos[]}. Las reglas «forzables» (locales, franjas, libra,
// vetos, partido, nunca con) se convierten en avisos con opts.forzar: el encargado
// distribuye «de la manera que quiera» y la app deja constancia. Cierres, ausencias
// y estar ya en otro local en la misma franja no se fuerzan nunca.
function puedeEstar(cfg, staff, est, iso, tid, pid, opts) {
  const o = opts || {};
  const p = personaDe(staff, pid);
  if (!p) return { ok: false, motivo: 'no existe', avisos: [] };
  const { localId, franja } = partirTurno(tid);
  const l = localDe(cfg, localId);
  if (!l) return { ok: false, motivo: 'local desconocido', avisos: [] };
  const dow = isoDow(iso);
  const avisos = [];
  const forzable = motivo => { if (o.forzar) { avisos.push(motivo); return null; } return motivo; };
  if (!turnoAbierto(cfg, est, iso, tid)) return { ok: false, motivo: `${l.nombre} no abre la ${FRANJA_LBL[franja].toLowerCase()} ${DOW_PL[dow].replace('los ', 'el ')}`, avisos };
  if (pidsEn(est, iso, tid).includes(pid)) return { ok: false, motivo: 'ya está en esta casilla', avisos };
  const aus = ausenciaEn(p, iso);
  if (aus) return { ok: false, motivo: motivoAusencia(aus) + (aus.detalle ? ' · ' + aus.detalle : ''), avisos };
  for (const t of turnosDe(cfg)) if (t.franja === franja && t.id !== tid && pidsEn(est, iso, t.id).includes(pid)) return { ok: false, motivo: `ya en ${t.local.nombre} esta ${FRANJA_LBL[franja].toLowerCase()}`, avisos };
  let m = null;
  if (Array.isArray(p.locales) && p.locales.length && !p.locales.includes(localId)) m = forzable(`solo ${lblLocales(cfg, p.locales)}`);
  if (!m && Array.isArray(p.franjas) && p.franjas.length && !p.franjas.includes(franja)) m = forzable(p.franjas.length === 1 ? (p.franjas[0] === 'M' ? 'siempre de mañana' : 'solo tardes') : 'franja no permitida');
  if (!m && (p.libra || []).includes(dow)) m = forzable(`libra ${DOW_PL[dow]}`);
  if (!m && (p.vetos || []).some(v => v.localId === localId && v.franja === franja)) m = forzable(`no hace ${franja === 'M' ? 'mañanas' : 'tardes'} en ${l.nombre}`);
  if (!m) {
    const otra = franja === 'M' ? 'T' : 'M';
    const enOtra = turnosDe(cfg).some(t => t.franja === otra && pidsEn(est, iso, t.id).includes(pid));
    if (enOtra) {
      const pd = p.partido || {};
      const permitido = pd.siempre || (pd.dias || []).includes(dow);
      if (!permitido) {
        if (o.permitirPartido) avisos.push(`partido no declarado ${DOW_PL[dow]}`);
        else m = forzable(`no hace partido ${DOW_PL[dow]}`);
      }
    }
  }
  if (!m) {
    for (const q of asignados(est, iso, tid)) {
      const qp = personaDe(staff, q.pid);
      if (!qp) continue;
      if ((p.nuncaCon || []).includes(q.pid) || (qp.nuncaCon || []).includes(pid)) { m = forzable(`nunca con ${qp.nombre}`); break; }
    }
  }
  if (m) return { ok: false, motivo: m, avisos };
  return { ok: true, motivo: null, avisos };
}

// ---------- casilla: orden, cocina, abre ----------
function ordenarCasilla(cfg, iso, tid, entries) {
  const { localId, franja } = partirTurno(tid);
  const l = localDe(cfg, localId);
  const lista = entries.slice();
  const iAbre = lista.findIndex(e => e.abre);
  const abre = iAbre >= 0 ? lista.splice(iAbre, 1)[0] : null;
  const iCoc = lista.findIndex(e => e.cocina);
  const coc = iCoc >= 0 ? lista.splice(iCoc, 1)[0] : null;
  const out = [];
  if (abre) out.push(abre);
  if (coc && abre && coc === abre) { /* la misma persona */ }
  const total = entries.length;
  if (coc && coc !== abre) {
    let pos = (l && l.cocina && l.cocina.posicion && l.cocina.posicion[franja]) || 2;
    const desde = l && l.cocina && l.cocina.posicionSiDesde && l.cocina.posicionSiDesde[franja];
    if (desde && total < desde) pos = Math.min(pos, 2);
    const idx = Math.max(abre ? 1 : 0, Math.min(pos - 1, total - 1));
    while (out.length < idx && lista.length) out.push(lista.shift());
    out.push(coc);
  }
  while (lista.length) out.push(lista.shift());
  return out;
}
// recalcula cocina, abre y orden salvo lo que el encargado haya fijado a mano
function normalizarCasilla(est, cfg, staff, iso, tid) {
  const lista = asignados(est, iso, tid);
  if (!lista.length) return;
  const { localId, franja } = partirTurno(tid);
  const l = localDe(cfg, localId);
  const man = manualDe(est, iso, tid);
  if (!man.cocina && l && localTieneCocina(l, franja)) {
    let mejor = null, mejorR = Infinity;
    for (const e of lista) { const r = rangoCocina(cfg, l, personaDe(staff, e.pid), franja, iso); if (r >= 0 && r < mejorR) { mejorR = r; mejor = e; } }
    for (const e of lista) e.cocina = e === mejor;
  } else if (!man.cocina) for (const e of lista) e.cocina = false;
  if (!man.abre) {
    const yaHay = lista.find(e => e.abre && abrePorDefecto(cfg, l, personaDe(staff, e.pid), franja));
    for (const e of lista) e.abre = yaHay ? e === yaHay : false;
    if (!yaHay) { const c = lista.find(e => abrePorDefecto(cfg, l, personaDe(staff, e.pid), franja)); if (c) c.abre = true; }
  }
  if (!man.orden) est.asig[iso][tid] = ordenarCasilla(cfg, iso, tid, lista);
}
function asignar(est, cfg, staff, iso, tid, pid, opts) {
  const o = opts || {};
  const r = puedeEstar(cfg, staff, est, iso, tid, pid, o);
  if (!r.ok) return { ok: false, motivo: r.motivo, avisos: r.avisos };
  const entry = { pid, cocina: !!o.cocina, abre: !!o.abre, origen: o.origen || 'manual' };
  if (o.razon) entry.razon = o.razon;
  if (o.supuesto) entry.supuesto = true;
  if (r.avisos.length) { entry.avisos = r.avisos.slice(); if (o.forzar) entry.forzado = true; }
  if (o.nota) entry.nota = o.nota;
  const lista = ((est.asig[iso] = est.asig[iso] || {})[tid] = est.asig[iso][tid] || []);
  if (o.cocina) { for (const e of lista) e.cocina = false; marcarManual(est, iso, tid, 'cocina'); }
  if (o.abre) { for (const e of lista) e.abre = false; marcarManual(est, iso, tid, 'abre'); }
  lista.push(entry);
  normalizarCasilla(est, cfg, staff, iso, tid);
  return { ok: true, motivo: null, avisos: r.avisos, entry };
}
function desasignar(est, iso, tid, pid) {
  const lista = asignados(est, iso, tid);
  const i = lista.findIndex(x => x.pid === pid);
  if (i < 0) return false;
  lista.splice(i, 1);
  if (!lista.length) { delete est.asig[iso][tid]; if (!Object.keys(est.asig[iso]).length) delete est.asig[iso]; }
  return true;
}
function moverEnCasilla(est, iso, tid, pid, nuevaPos) {
  const lista = asignados(est, iso, tid);
  const i = lista.findIndex(x => x.pid === pid);
  if (i < 0) return false;
  const [e] = lista.splice(i, 1);
  lista.splice(Math.max(0, Math.min(nuevaPos, lista.length)), 0, e);
  marcarManual(est, iso, tid, 'orden');
  return true;
}
function marcarCocina(est, iso, tid, pid) {
  const lista = asignados(est, iso, tid);
  if (!lista.some(x => x.pid === pid)) return false;
  for (const e of lista) e.cocina = e.pid === pid;
  marcarManual(est, iso, tid, 'cocina');
  return true;
}
function marcarAbre(est, iso, tid, pid, cfg) {
  const lista = asignados(est, iso, tid);
  if (!lista.some(x => x.pid === pid)) return false;
  for (const e of lista) e.abre = e.pid === pid;
  marcarManual(est, iso, tid, 'abre');
  if (cfg && !manualDe(est, iso, tid).orden) est.asig[iso][tid] = ordenarCasilla(cfg, iso, tid, lista);
  return true;
}
function quitarMarcaManual(est, iso, tid) { if (est.manual && est.manual[iso]) delete est.manual[iso][tid]; }

// ---------- revisión ----------
function revisarTurno(cfg, staff, est, iso, tid) {
  const { localId, franja } = partirTurno(tid);
  const l = localDe(cfg, localId);
  const abierto = turnoAbierto(cfg, est, iso, tid);
  const lista = asignados(est, iso, tid);
  const m = minimoDe(cfg, iso, tid);
  const n = lista.length;
  const tieneCocina = l && localTieneCocina(l, franja);
  const coc = lista.find(e => e.cocina);
  const out = {
    abierto, n, minimo: m.min, supuesto: m.supuesto, refuerzo: m.refuerzo, faltan: abierto ? Math.max(0, m.min - n) : 0,
    sinCocina: !!(abierto && tieneCocina && !coc),
    cocinaObligatoria: !!(l && l.cocina && l.cocina.obligatoria && l.cocina.obligatoria[franja]),
    cocinaNoApta: !!(coc && !puedeCocina(cfg, personaDe(staff, coc.pid), localId, iso)),
    sinAbre: !!(abierto && n > 0 && !lista.some(e => e.abre)),
    forzados: lista.filter(e => e.forzado).length,
    avisos: lista.filter(e => e.avisos && e.avisos.length).map(e => `${nombreDe(staff, e.pid)}: ${e.avisos.join(', ')}`),
    incompatibles: [],
  };
  for (let i = 0; i < lista.length; i++) for (let j = i + 1; j < lista.length; j++) {
    const a = personaDe(staff, lista[i].pid), b = personaDe(staff, lista[j].pid);
    if (a && b && ((a.nuncaCon || []).includes(b.id) || (b.nuncaCon || []).includes(a.id))) out.incompatibles.push([a.nombre, b.nombre]);
  }
  return out;
}
function revisionMes(cfg, staff, est, opts) {
  const out = [];
  const desde = (opts && opts.desde) || est.days[0].iso, hasta = (opts && opts.hasta) || est.days[est.days.length - 1].iso;
  for (const d of est.days) {
    if (d.iso < desde || d.iso > hasta) continue;
    for (const t of turnosDe(cfg)) {
      if (!turnoAbierto(cfg, est, d.iso, t.id)) continue;
      const r = revisarTurno(cfg, staff, est, d.iso, t.id);
      const donde = `${t.local.nombre} · ${FRANJA_LBL[t.franja].toLowerCase()} del ${DOW_LBL[d.dow]} ${d.d}`;
      if (r.faltan) out.push({ iso: d.iso, turnoId: t.id, tipo: 'falta', nivel: r.supuesto ? 'media' : 'alta', n: r.faltan, msg: `${donde}: falta${r.faltan > 1 ? 'n' : ''} ${r.faltan} (hay ${r.n} de ${r.minimo}${r.supuesto ? ', mínimo supuesto' : ''}${r.refuerzo ? ', con refuerzo' : ''})` });
      if (r.sinCocina) out.push({ iso: d.iso, turnoId: t.id, tipo: 'sin-cocina', nivel: r.cocinaObligatoria ? 'alta' : 'media', msg: `${donde}: sin cocina${r.cocinaObligatoria ? ' (obligatoria)' : ''}` });
      if (r.cocinaNoApta) out.push({ iso: d.iso, turnoId: t.id, tipo: 'cocina-no-apta', nivel: 'media', msg: `${donde}: la cocina la lleva alguien que no es cocina de ese local` });
      if (r.sinAbre) out.push({ iso: d.iso, turnoId: t.id, tipo: 'sin-abre', nivel: 'info', msg: `${donde}: nadie definido para abrir` });
      for (const [a, b] of r.incompatibles) out.push({ iso: d.iso, turnoId: t.id, tipo: 'incompatibles', nivel: 'alta', msg: `${donde}: ${a} y ${b} no pueden coincidir` });
      if (r.forzados) out.push({ iso: d.iso, turnoId: t.id, tipo: 'forzado', nivel: 'media', msg: `${donde}: ${r.forzados} asignación(es) forzada(s) a mano — ${r.avisos.join(' · ')}` });
      else if (r.avisos.length) out.push({ iso: d.iso, turnoId: t.id, tipo: 'aviso', nivel: 'media', msg: `${donde}: ${r.avisos.join(' · ')}` });
    }
  }
  return out;
}

// ---------- semana patrón ----------
// cfg.patron[dow] = [{ t: turnoId, p: pid, c?: cocina, a?: abre, s?: supuesto }]
function plazasDe(cfg, dow) { return (cfg.patron && cfg.patron[dow]) || []; }
function instanciarPatron(cfg, staff, est, desde, hasta, opts) {
  const o = opts || {};
  const r = { aplicados: [], rechazados: [], coberturas: [], ausentes: [] };
  for (const iso of rangoIso(desde, hasta)) {
    if (o.desdeIso && iso < o.desdeIso) continue;
    const dow = isoDow(iso);
    const ausentes = [];
    for (const pl of plazasDe(cfg, dow)) {
      const p = personaDe(staff, pl.p);
      if (!p) { r.rechazados.push({ iso, turnoId: pl.t, pid: pl.p, motivo: 'no existe' }); continue; }
      const aus = ausenciaEn(p, iso);
      if (aus) { ausentes.push({ pl, p, aus }); r.ausentes.push({ iso, turnoId: pl.t, pid: pl.p, tipo: aus.tipo }); continue; }
      if (pidsEn(est, iso, pl.t).includes(pl.p)) continue;
      const a = asignar(est, cfg, staff, iso, pl.t, pl.p, { origen: 'patron', razon: 'plaza fija de la semana tipo', supuesto: !!pl.s, cocina: pl.c ? true : undefined, abre: pl.a ? true : undefined });
      if (a.ok) r.aplicados.push({ iso, turnoId: pl.t, pid: pl.p, origen: 'patron', razon: a.entry.razon, supuesto: !!pl.s });
      else r.rechazados.push({ iso, turnoId: pl.t, pid: pl.p, motivo: a.motivo });
    }
    // quien «cubre a» la persona ausente ocupa su sitio (si puede)
    for (const { pl, p } of ausentes) {
      const candidatos = staff.filter(q => q.id !== p.id && (q.cubreA || []).some(c => c.pid === p.id && (!c.dow || c.dow === dow) && (!c.turnoId || c.turnoId === pl.t)));
      for (const q of candidatos) {
        if (pidsEn(est, iso, pl.t).includes(q.id)) break;
        const a = asignar(est, cfg, staff, iso, pl.t, q.id, { origen: 'patron', razon: `cubre a ${p.nombre}`, permitirPartido: true, cocina: pl.c && puedeCocina(cfg, q, partirTurno(pl.t).localId, iso) ? true : undefined });
        if (a.ok) { r.aplicados.push({ iso, turnoId: pl.t, pid: q.id, origen: 'patron', razon: a.entry.razon, por: p.id }); r.coberturas.push({ iso, turnoId: pl.t, pid: q.id, por: p.id }); break; }
      }
    }
  }
  return r;
}
// captura una semana real como nueva semana patrón
function patronDesdeSemana(est, lunesIso) {
  const patron = {};
  for (let k = 0; k < 7; k++) {
    const iso = addDias(lunesIso, k);
    const dow = isoDow(iso);
    patron[dow] = [];
    for (const [tid, lista] of Object.entries(est.asig[iso] || {})) for (const e of lista) {
      const pl = { t: tid, p: e.pid }; if (e.cocina) pl.c = 1; if (e.abre) pl.a = 1; if (e.supuesto) pl.s = 1;
      patron[dow].push(pl);
    }
  }
  return patron;
}

// ---------- candidatos y generador ----------
function turnosMes(est, pid) { let n = 0; for (const porT of Object.values(est.asig)) for (const lista of Object.values(porT)) if (lista.some(x => x.pid === pid)) n++; return n; }
function esComodin(p) { return !!(p.comodin || p.puesto === 'comodin' || !(p.locales || []).length); }
function candidatosPara(cfg, staff, est, iso, tid, opts) {
  const o = opts || {};
  const { localId, franja } = partirTurno(tid);
  const l = localDe(cfg, localId);
  const dow = isoDow(iso);
  const out = [];
  const ausentesHoy = staff.filter(q => ausenciaEn(q, iso)).map(q => q.id);
  for (const p of staff) {
    const r = puedeEstar(cfg, staff, est, iso, tid, p.id, { permitirPartido: !!o.permitirPartido });
    if (!r.ok) continue;
    let score = 50; const razones = [];
    const cubre = (p.cubreA || []).find(c => ausentesHoy.includes(c.pid) && (!c.dow || c.dow === dow) && (!c.turnoId || c.turnoId === tid));
    if (cubre) { score += 60; razones.push(`cubre a ${nombreDe(staff, cubre.pid)}`); }
    if (esComodin(p)) { score += 30; razones.push('comodín'); }
    else if (p.puesto === 'apoyo') { score += 15; razones.push('apoyo'); }
    if ((p.locales || []).length && p.locales[0] === localId) { score += 10; razones.push(`su local habitual es ${l.nombre}`); }
    if (o.cocina) { const rc = rangoCocina(cfg, l, p, franja, iso); if (rc < 0) continue; score += 40 - Math.min(rc, 30); razones.push(rc < 100 ? 'cocina titular' : 'cocina de reserva'); }
    const n = turnosMes(est, p.id);
    score -= 3 * n; razones.push(`${n} turno${n === 1 ? '' : 's'} este mes`);
    if (p.prefs && (p.prefs.evitaDows || []).includes(dow)) { score -= 40; razones.push(`prefiere no trabajar ${DOW_PL[dow]}`); }
    if (r.avisos.length) { score -= 25; razones.push(...r.avisos); }
    out.push({ pid: p.id, nombre: p.nombre, score, razones, avisos: r.avisos, n });
  }
  out.sort((a, b) => b.score - a.score || a.n - b.n || (a.pid < b.pid ? -1 : 1));
  return out;
}
function porQueNadie(cfg, staff, est, iso, tid) {
  const out = {};
  for (const p of staff) {
    const r = puedeEstar(cfg, staff, est, iso, tid, p.id);
    if (r.ok) continue;
    (out[r.motivo] = out[r.motivo] || []).push(p.nombre);
  }
  return out;
}
// Genera (o completa) la planilla entre dos fechas: semana tipo + coberturas + relleno
// de mínimos con razones. Aditivo: nunca quita a nadie. opts.simular trabaja sobre
// una copia y devuelve el estado propuesto para la vista previa.
function generarPlanilla(cfg, staff, est, desde, hasta, opts) {
  const o = opts || {};
  const target = o.simular ? clonarEstado(est) : est;
  const r = { aplicados: [], huecos: [], coberturas: [], rechazados: [], estado: target };
  if (!o.sinPatron) {
    const p = instanciarPatron(cfg, staff, target, desde, hasta, { desdeIso: o.desdeIso });
    r.aplicados.push(...p.aplicados); r.coberturas.push(...p.coberturas); r.rechazados.push(...p.rechazados);
  }
  for (const iso of rangoIso(desde, hasta)) {
    if (o.desdeIso && iso < o.desdeIso) continue;
    // primero las casillas con menos candidatos (difícil primero)
    const abiertos = turnosDe(cfg).filter(t => turnoAbierto(cfg, target, iso, t.id));
    const pendientes = abiertos.map(t => ({ t, rev: revisarTurno(cfg, staff, target, iso, t.id) })).filter(x => x.rev.faltan || x.rev.sinCocina);
    pendientes.sort((a, b) => candidatosPara(cfg, staff, target, iso, a.t.id).length - candidatosPara(cfg, staff, target, iso, b.t.id).length);
    for (const { t } of pendientes) {
      let rev = revisarTurno(cfg, staff, target, iso, t.id);
      if (rev.sinCocina && (rev.cocinaObligatoria || rev.faltan)) {
        const c = candidatosPara(cfg, staff, target, iso, t.id, { cocina: true, permitirPartido: !!o.permitirPartido })[0];
        if (c) {
          const a = asignar(target, cfg, staff, iso, t.id, c.pid, { origen: 'generador', razon: c.razones.join(' · '), cocina: true, permitirPartido: !!o.permitirPartido });
          if (a.ok) r.aplicados.push({ iso, turnoId: t.id, pid: c.pid, origen: 'generador', razon: a.entry.razon, avisos: a.avisos });
        }
      }
      rev = revisarTurno(cfg, staff, target, iso, t.id);
      while (rev.faltan > 0) {
        const c = candidatosPara(cfg, staff, target, iso, t.id, { permitirPartido: !!o.permitirPartido })[0];
        if (!c) { r.huecos.push({ iso, turnoId: t.id, faltan: rev.faltan, minimo: rev.minimo, supuesto: rev.supuesto, porQueNadie: porQueNadie(cfg, staff, target, iso, t.id) }); break; }
        const a = asignar(target, cfg, staff, iso, t.id, c.pid, { origen: 'generador', razon: c.razones.join(' · '), permitirPartido: !!o.permitirPartido });
        if (!a.ok) { r.huecos.push({ iso, turnoId: t.id, faltan: rev.faltan, minimo: rev.minimo, supuesto: rev.supuesto, porQueNadie: porQueNadie(cfg, staff, target, iso, t.id) }); break; }
        r.aplicados.push({ iso, turnoId: t.id, pid: c.pid, origen: 'generador', razon: a.entry.razon, avisos: a.avisos });
        rev = revisarTurno(cfg, staff, target, iso, t.id);
      }
    }
  }
  return r;
}
// candidatos que solo romperían reglas blandas (partido no declarado) para un hueco
function candidatosConAviso(cfg, staff, est, iso, tid) {
  const sin = new Set(candidatosPara(cfg, staff, est, iso, tid).map(c => c.pid));
  return candidatosPara(cfg, staff, est, iso, tid, { permitirPartido: true }).filter(c => !sin.has(c.pid));
}

// ---------- horas ----------
function hm(s) { const [h, m] = String(s || '0:0').split(':').map(Number); return h * 60 + (m || 0); }
function horarioDe(l, dow, franja) {
  const h = l && l.horario;
  if (!h) return null;
  const ex = h.porDow && h.porDow[dow] && h.porDow[dow][franja];
  return ex || h[franja] || null;
}
function minutosEntre(ini, fin) { let d = hm(fin) - hm(ini); if (d <= 0) d += 1440; return d; }
function minutosTurno(l, dow, franja, override) {
  const h = override && override.ini && override.fin ? override : horarioDe(l, dow, franja);
  if (!h) return 0;
  return Math.max(0, minutosEntre(h.ini, h.fin) - (+(l && l.descansoMin) || 0));
}
// minutos entre las 22:00 y las 06:00 del tramo (tarde que cruza la medianoche)
function minutosNocturnos(l, dow, franja, override) {
  const h = override && override.ini && override.fin ? override : horarioDe(l, dow, franja);
  if (!h) return 0;
  const a = hm(h.ini); let b = hm(h.fin); if (b <= a) b += 1440;
  let n = 0;
  for (const [x, y] of [[22 * 60, 30 * 60], [0, 6 * 60], [46 * 60, 54 * 60]]) n += Math.max(0, Math.min(b, y) - Math.max(a, x));
  return n;
}
function horasPersonaMes(cfg, staff, meses, pid, y, m) {
  const p = personaDe(staff, pid);
  const k = claveMes(y, m);
  const asig = (meses && meses[k] && meses[k].asig) || {};
  const out = { pid, nombre: p ? p.nombre : pid, mananas: 0, tardes: 0, partidos: 0, dias: 0, turnos: 0, minutos: 0, nocturnosMin: 0, festivas: 0, domingos: 0, festivasMin: 0, domingosMin: 0, extrasMin: 0, ausencias: 0, porLocal: {}, contratoHoras: null, saldo: null, refuerzos: 0, forzados: 0 };
  const n = diasDelMes(y, m);
  for (let d = 1; d <= n; d++) {
    const iso = isoDe(y, m, d), dow = isoDow(iso);
    const festivo = (cfg.festivos || []).includes(iso);
    let man = false, tar = false, minDia = 0;
    for (const [tid, lista] of Object.entries(asig[iso] || {})) {
      const e = lista.find(x => x.pid === pid); if (!e) continue;
      const { localId, franja } = partirTurno(tid);
      const l = localDe(cfg, localId);
      const min = minutosTurno(l, dow, franja, e);
      out.turnos++; out.minutos += min; minDia += min;
      out.nocturnosMin += minutosNocturnos(l, dow, franja, e);
      if (franja === 'M') { out.mananas++; man = true; } else { out.tardes++; tar = true; }
      const pl = out.porLocal[localId] = out.porLocal[localId] || { turnos: 0, minutos: 0, horas: 0 };
      pl.turnos++; pl.minutos += min; pl.horas = Math.round(pl.minutos / 6) / 10;
      if (e.origen === 'refuerzo') out.refuerzos++;
      if (e.forzado) out.forzados++;
    }
    if (man || tar) { out.dias++; if (man && tar) out.partidos++; if (festivo) { out.festivas++; out.festivasMin += minDia; } if (dow === 7) { out.domingos++; out.domingosMin += minDia; } }
    else if (p && ausenciaEn(p, iso)) out.ausencias++;
  }
  for (const x of cfg.extras || []) if (x.pid === pid && x.iso && x.iso.startsWith(k)) out.extrasMin += +x.min || 0;
  out.horas = Math.round((out.minutos + out.extrasMin) / 6) / 10;
  out.horasNocturnas = Math.round(out.nocturnosMin / 6) / 10;
  if (p && p.contrato && +p.contrato.horasSemana > 0) {
    out.contratoHoras = Math.round((+p.contrato.horasSemana / 7) * (n - out.ausencias) * 10) / 10;
    out.saldo = Math.round((out.horas - out.contratoHoras) * 10) / 10;
  }
  return out;
}
function horasEquipoMes(cfg, staff, meses, y, m) { return staff.map(p => horasPersonaMes(cfg, staff, meses, p.id, y, m)); }
function horasLocalMes(cfg, staff, meses, y, m) {
  const out = {};
  for (const l of cfg.locales) out[l.id] = { localId: l.id, nombre: l.nombre, turnos: 0, horas: 0, personas: 0 };
  for (const h of horasEquipoMes(cfg, staff, meses, y, m)) for (const [lid, v] of Object.entries(h.porLocal)) { if (!out[lid]) continue; out[lid].turnos += v.turnos; out[lid].horas = Math.round((out[lid].horas + v.horas) * 10) / 10; out[lid].personas++; }
  return Object.values(out);
}

// ---------- exportador al núcleo shiftia-core (CP-SAT) ----------
// Codificación «medio día»: cada índice del horizonte es una franja (mañana o tarde)
// de un día; el código de turno es el local. El núcleo no conoce locales ni posición
// en la casilla: cobertura y cocina van como reglas, y el orden, quién abre y la
// cocina se ponen al volcar la solución (desdeSolucion). Ver ARQUITECTURA.md.
function toProblem(cfg, staff, est, desde, hasta, opts) {
  const o = opts || {};
  const activos = staff.filter(p => !(p.ausencias || []).some(a => a.tipo === 'BAJ' && !a.hasta));
  const days = [], indices = [];
  let idx = 0;
  for (const iso of rangoIso(desde, hasta)) {
    const dow = isoDow(iso);
    for (const f of FRANJAS) {
      days.push({ index: idx, date: iso, dow: dow - 1, is_weekend: dow >= 6, is_holiday: (cfg.festivos || []).includes(iso), tags: [f, 'd' + dow, iso, iso + '_' + f] });
      indices.push({ iso, franja: f, dow });
      idx++;
    }
  }
  const shifts = cfg.locales.map(l => ({ code: l.id, label: l.nombre, hours: 7, period: 'morning', tags: [] }));
  shifts.push({ code: 'OFF', label: 'Libre', hours: 0, is_work: false, is_rest: true });
  const todosLocales = cfg.locales.map(l => l.id);
  const skillDe = (localId, dow) => `coc_${localId}${activos.some(p => Array.isArray(p.cocina && p.cocina.soloDias) && p.cocina.soloDias.length && ((p.cocina.titular || []).includes(localId) || (p.cocina.reserva || []).includes(localId))) ? '_d' + dow : ''}`;
  const workers = activos.map(p => {
    const w = { id: p.id, name: p.nombre, allowed_shifts: (p.locales || []).length ? p.locales.slice() : todosLocales.slice(), skills: [], unavailable: {}, fixed: {}, preferences: [] };
    indices.forEach((x, i) => {
      const bloqueada = ausenciaEn(p, x.iso) || (p.libra || []).includes(x.dow) || ((p.franjas || []).length && !p.franjas.includes(x.franja));
      if (bloqueada) { w.unavailable[i] = '*'; return; }
      const vet = (p.vetos || []).filter(v => v.franja === x.franja).map(v => v.localId);
      if (vet.length) w.unavailable[i] = vet;
    });
    for (const l of cfg.locales) for (const dow of TODOS) if (puedeCocina(cfg, p, l.id, isoDe(2026, 10, 4 + dow))) { const s = skillDe(l.id, dow); if (!w.skills.includes(s)) w.skills.push(s); }
    if (p.prefs && (p.prefs.evitaDows || []).length) indices.forEach((x, i) => { if (p.prefs.evitaDows.includes(x.dow)) w.preferences.push({ day: i, shift: 'OFF', weight: 3 }); });
    return w;
  });
  // cobertura por medio día y local; cerrados a 0
  const by_day = {};
  indices.forEach((x, i) => {
    by_day[i] = {};
    for (const l of cfg.locales) {
      const tid = turnoId(l.id, x.franja);
      if (!turnoAbierto(cfg, est, x.iso, tid)) { by_day[i][l.id] = { min: 0, max: 0 }; continue; }
      by_day[i][l.id] = { min: minimoDe(cfg, x.iso, tid).min };
    }
  });
  const rules = [{ type: 'coverage', mode: 'hard', tier: 3, id: 'mínimos por local, día y franja', params: { demand: {}, by_day } }];
  // cocina: obligatoria = dura; con titulares definidos = blanda
  for (const l of cfg.locales) for (const f of FRANJAS) {
    if (!localTieneCocina(l, f)) continue;
    const dura = !!(l.cocina.obligatoria && l.cocina.obligatoria[f]);
    for (const dow of TODOS) {
      if (!((l.abre && l.abre[f]) || []).includes(dow)) continue;
      rules.push({ type: 'skill_coverage', mode: dura ? 'hard' : 'soft', weight: 5, tier: dura ? 3 : 1, id: `cocina ${l.nombre} ${FRANJA_LBL[f].toLowerCase()} ${DOW_PL[dow]}`, params: { requirements: [{ shift: l.id, skill: skillDe(l.id, dow), min: 1 }] }, scope: { day_tags: [f, 'd' + dow] } });
    }
  }
  // «nunca con»: mismo local y misma franja
  const pares = new Set();
  for (const p of activos) for (const q of p.nuncaCon || []) if (activos.some(x => x.id === q)) pares.add([p.id, q].sort().join('|'));
  if (pares.size) rules.push({ type: 'same_shift_forbidden', mode: 'hard', tier: 3, id: 'nunca con', params: { pairs: [...pares].map(s => s.split('|')), shifts: todosLocales.slice() } });
  // quien no hace partido nunca y tiene las dos franjas: como mucho un medio día por ventana de dos
  const sinPartido = activos.filter(p => (p.franjas || []).length !== 1 && !(p.partido && (p.partido.siempre || (p.partido.dias || []).length))).map(p => p.id);
  if (sinPartido.length) rules.push({ type: 'max_hours_in_window', mode: 'hard', tier: 2, id: 'sin partido', params: { days: 2, max_hours: 7 }, scope: { workers: sinPartido } });
  rules.push({ type: 'balance', mode: 'soft', weight: 2, tier: 1, id: 'reparto equilibrado', params: { dimension: 'work' } });
  rules.push({ type: 'preferences', mode: 'soft', weight: 1, tier: 1, id: 'criterios personales', params: {} });
  // plazas fijas de la semana tipo (no supuestas) como asignaciones fijas
  if (o.conPatron !== false) {
    indices.forEach((x, i) => {
      for (const pl of plazasDe(cfg, x.dow)) {
        if (pl.s) continue;
        const { localId, franja } = partirTurno(pl.t);
        if (franja !== x.franja) continue;
        const w = workers.find(z => z.id === pl.p);
        if (!w || w.unavailable[i]) continue;
        w.fixed[i] = localId;
      }
    });
  }
  return { horizon_days: indices.length, shifts, workers, days, rules, rest_code: 'OFF', meta: { indices, desde, hasta, app: 'shiftia-pasarela', weekend_dows: [5, 6] } };
}
function desdeSolucion(cfg, staff, est, problema, sol, opts) {
  const o = opts || {};
  const r = { aplicados: [], rechazados: [] };
  const indices = (problema.meta && problema.meta.indices) || [];
  for (const [pid, porIdx] of Object.entries(sol.schedule || {})) {
    for (const [i, code] of Object.entries(porIdx)) {
      if (!code || code === (problema.rest_code || 'OFF')) continue;
      const x = indices[+i]; if (!x) continue;
      const tid = turnoId(code, x.franja);
      if (pidsEn(est, x.iso, tid).includes(pid)) continue;
      const a = asignar(est, cfg, staff, x.iso, tid, pid, { origen: 'nucleo', razon: o.razon || 'propuesto por el núcleo Shiftia (CP-SAT)', permitirPartido: true });
      if (a.ok) r.aplicados.push({ iso: x.iso, turnoId: tid, pid, origen: 'nucleo', razon: a.entry.razon, avisos: a.avisos });
      else r.rechazados.push({ iso: x.iso, turnoId: tid, pid, motivo: a.motivo });
    }
  }
  return r;
}

// ---------- sincronización (servidor) ----------
const CLAVES_PLANILLA = ['meses', 'staff', 'locales', 'patron', 'eventos', 'equipos', 'extras', 'festivos', 'cierres'];
const huellaPlanillaDe = e => JSON.stringify(CLAVES_PLANILLA.map(k => e[k] === undefined ? null : e[k]));
// 409 del servidor: si entre `base` (lo que teníamos) y `servidor` solo cambiaron
// peticiones o avisos (deltas de empleados), se funden con la edición local; si
// cambió la planilla, manda el servidor.
function fusionarEstado(base, servidor, local) {
  if (!base || !servidor || !local) return { ok: false, motivo: 'faltan datos' };
  if (huellaPlanillaDe(base) !== huellaPlanillaDe(servidor)) return { ok: false, motivo: 'planilla-cambiada' };
  const estado = Object.assign({}, local);
  const porId = xs => { const m = new Map(); for (const x of xs || []) m.set(x.id, x); return m; };
  const pl = porId(local.peticiones), ps = porId(servidor.peticiones), pb = porId(base.peticiones);
  const peticiones = [];
  for (const [id, s] of ps) {
    const l = pl.get(id), b = pb.get(id);
    if (l && b && JSON.stringify(l) !== JSON.stringify(b)) {
      if (s.estado !== b.estado && s.estado !== 'pendiente' && l.estado !== s.estado) return { ok: false, motivo: 'peticion-cerrada-por-empleado' };
      peticiones.push(l);
    } else peticiones.push(s);
  }
  for (const [id, l] of pl) if (!ps.has(id) && !pb.has(id)) peticiones.push(l);
  estado.peticiones = peticiones;
  const al = porId(local.avisos), as = porId(servidor.avisos);
  const avisos = [];
  for (const [id, s] of as) { const l = al.get(id); avisos.push(l ? Object.assign({}, l, { ocultoPor: [...new Set([...(l.ocultoPor || []), ...(s.ocultoPor || [])])] }) : s); }
  for (const [id, l] of al) if (!as.has(id) && !porId(base.avisos).has(id)) avisos.push(l);
  estado.avisos = avisos;
  const nuevas = [...ps.keys()].filter(id => !pb.has(id) && !pl.has(id)).length;
  return { ok: true, estado, nuevasPeticiones: nuevas };
}
function mesVisibleParaPersonal(mesesPublicados, clave, hoyClave) {
  if (clave <= (hoyClave || fechaMadrid().slice(0, 7))) return true;
  return Array.isArray(mesesPublicados) ? mesesPublicados.includes(clave) : true;
}
function mesesVisibles(estado, hoyClave) {
  const out = {};
  for (const [k, v] of Object.entries(estado.meses || {})) if (mesVisibleParaPersonal(estado.mesesPublicados, k, hoyClave)) out[k] = v;
  return out;
}
function destinatariosAviso(a) { if (Array.isArray(a.paraPids) && a.paraPids.length) return a.paraPids; if (a.paraPid) return [a.paraPid]; return null; }
function avisoEsPara(a, pid) { const d = destinatariosAviso(a); return !d || d.includes(pid); }

// ---------- usuarios y colores ----------
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
function sugerirUsuario(nombre, existentes) {
  const partes = norm(nombre).replace(/[^a-z0-9ñ\s]/g, ' ').trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '';
  let base = partes.length === 1 ? partes[0] : `${partes[0]}.${partes[1]}`;
  base = base.slice(0, 30);
  const usados = new Set((existentes || []).map(u => String(u).toLowerCase()));
  if (!usados.has(base)) return base;
  for (let i = 2; i < 100; i++) if (!usados.has(base + i)) return base + i;
  return base + Date.now().toString(36);
}
// 24 colores generados en OKLCH con texto blanco legible (misma paleta que el piloto)
const PALETA_PERSONAS = ['#a1334a', '#668800', '#066894', '#009b8f', '#426f02', '#007e9d', '#808000', '#bc4b87', '#7a5b00', '#915dc5', '#3d9028', '#943877', '#616ed7', '#08724e', '#b14f9f', '#0e9254', '#6b4aa7', '#0096af', '#a03c05', '#3d77d7', '#c74a51', '#0361af', '#ae6700', '#168f70'];
function asignarColores(staff) {
  const usados = new Set();
  for (const p of staff) if (Number.isInteger(p.color) && p.color >= 0 && p.color < PALETA_PERSONAS.length && !usados.has(p.color)) usados.add(p.color); else p.color = undefined;
  let i = 0;
  for (const p of staff) {
    if (p.color !== undefined) continue;
    while (usados.has(i % PALETA_PERSONAS.length) && usados.size < PALETA_PERSONAS.length) i++;
    p.color = i % PALETA_PERSONAS.length; usados.add(p.color); i++;
  }
  return staff;
}

// ---------- semilla: el Grupo Pasarela tal como lo describe el PDF ----------
// Todo lo que el PDF marca con asterisco o «decidimos nosotros» entra con supuesto=true.
function semillaPasarela() {
  const dows = TODOS.slice();
  const min = (arr) => { const o = {}; dows.forEach((d, i) => { o[d] = arr[i]; }); return o; };
  const sup = (arr) => { const o = {}; dows.forEach((d, i) => { if (arr[i]) o[d] = true; }); return o; };
  const horario = () => ({ M: { ini: '09:00', fin: '16:00' }, T: { ini: '16:00', fin: '23:00' }, porDow: { 5: { T: { ini: '16:00', fin: '00:00' } }, 6: { T: { ini: '16:00', fin: '00:00' } } } });
  const locales = [
    { id: 'EL33', nombre: 'El 33', corto: '33', color: '#b8741a',
      abre: { M: dows.slice(), T: [2, 3, 4, 5, 6] },
      minimos: { M: min([2, 2, 2, 2, 2, 3, 3]), T: min([0, 2, 2, 2, 2, 2, 0]) },
      supuestos: { M: sup([1, 1, 1, 1, 1, 0, 0]), T: sup([0, 1, 1, 1, 1, 1, 0]) },
      cocina: { obligatoria: { M: false, T: false }, titulares: { M: ['jenny', 'noe', 'hojan'], T: ['jenny', 'noe', 'hojan'] }, reservas: ['hojan'], posicion: { M: 2, T: 2 }, posicionSiDesde: {} },
      primero: { M: null, T: null }, horario: horario(), horarioSupuesto: true, descansoMin: 0 },
    { id: 'ZAPA', nombre: 'Zapatillera', corto: 'ZAP', color: '#c2378f',
      abre: { M: dows.slice(), T: dows.slice() },
      minimos: { M: min([2, 2, 2, 2, 2, 2, 2]), T: min([2, 2, 2, 2, 4, 4, 2]) },
      supuestos: { M: sup([1, 1, 1, 1, 1, 1, 1]), T: sup([0, 0, 0, 0, 0, 0, 1]) },
      cocina: { obligatoria: { M: false, T: false }, titulares: { M: ['adrian', 'roberto', 'hojan'], T: ['adrian', 'roberto', 'hojan'] }, reservas: ['roberto', 'hojan'], posicion: { M: 3, T: 2 }, posicionSiDesde: { M: 3 } },
      primero: { M: null, T: null }, horario: horario(), horarioSupuesto: true, descansoMin: 0 },
    { id: 'MONACO', nombre: 'Bar Mónaco', corto: 'MON', color: '#2f6db5',
      abre: { M: dows.slice(), T: dows.slice() },
      minimos: { M: min([3, 3, 3, 3, 3, 3, 3]), T: min([2, 2, 2, 2, 3, 3, 2]) },
      supuestos: { M: sup([0, 0, 0, 0, 0, 0, 0]), T: sup([0, 0, 0, 0, 0, 0, 1]) },
      cocina: { obligatoria: { M: true, T: true }, titulares: { M: ['esmeralda', 'jenny', 'hojan'], T: ['hojan', 'jenny', 'scapon'] }, reservas: ['hojan'], posicion: { M: 2, T: 2 }, posicionSiDesde: {} },
      primero: { M: null, T: 'scapon' }, horario: horario(), horarioSupuesto: true, descansoMin: 0 },
    { id: 'PASARELA', nombre: 'Pasarela', corto: 'PAS', color: '#1f9a6e',
      abre: { M: dows.slice(), T: dows.slice() },
      minimos: { M: min([3, 3, 3, 3, 3, 2, 2]), T: min([2, 2, 2, 2, 3, 3, 2]) },
      supuestos: { M: sup([0, 0, 0, 0, 0, 0, 0]), T: sup([0, 0, 0, 0, 0, 0, 0]) },
      cocina: { obligatoria: { M: false, T: false }, titulares: { M: [], T: [] }, reservas: [], posicion: { M: 2, T: 2 }, posicionSiDesde: {} },
      primero: { M: 'lola', T: 'ivan' }, horario: horario(), horarioSupuesto: true, descansoMin: 0 },
  ];
  const P = (id, nombre, puesto, locales, franjas, libra, extra) => Object.assign({ id, nombre, puesto, locales, franjas, libra, partido: { dias: [] }, cocina: { titular: [], reserva: [], soloDias: [] }, abre: {}, noAbre: [], nuncaCon: [], cubreA: [], vetos: [], contrato: { horasSemana: null }, ausencias: [], prefs: {}, nota: '', supuestos: [] }, extra || {});
  const staff = [
    P('jacquelin', 'Jacquelin', 'sala', ['ZAPA'], ['M'], [7]),
    P('cris', 'Cris Parreño', 'sala', ['MONACO'], ['M'], [7], { nota: 'Yilian le hace el día libre' }),
    P('esmeralda', 'Esmeralda', 'cocina', ['MONACO'], ['M'], [1], { cocina: { titular: ['MONACO'], reserva: [], soloDias: [] }, nota: 'la sustituye Jenny los lunes' }),
    P('mariluz', 'Mari Luz', 'sala', ['PASARELA'], ['M', 'T'], [3], { partido: { dias: [1, 2, 4, 5, 6] }, nuncaCon: ['lavinia'], nota: 'siempre partido; el domingo hace la mañana' }),
    P('noe', 'Noe', 'sala', ['EL33'], ['M', 'T'], [1], { partido: { dias: [2, 3] }, cocina: { titular: ['EL33'], reserva: [], soloDias: [] }, cubreA: [{ pid: 'jenny', dow: 2 }, { pid: 'victoria', dow: 3 }], nota: 'siempre de tarde; cocina cuando cubre; el domingo tercero de la mañana y estira el turno' }),
    P('scapon', 'Susana Capón', 'sala', ['MONACO'], ['T'], [1], { cocina: { titular: ['MONACO'], reserva: [], soloDias: [2] }, abre: { MONACO: ['T'] }, nota: 'sale la primera; camarera, no cocinera salvo el martes (día flojo) para que libre Hojan' }),
    P('ivan', 'Iván', 'sala', ['PASARELA'], ['T'], [1], { abre: { PASARELA: ['T'] }, nota: 'sale el primero' }),
    P('juani', 'Juani', 'sala', ['ZAPA'], ['M'], [6]),
    P('sluna', 'Susana Luna', 'sala', ['ZAPA'], ['T'], [4], { nota: 'la cubre Roberto los jueves' }),
    P('roberto', 'Roberto', 'apoyo', ['ZAPA', 'PASARELA'], ['M', 'T'], [1], { partido: { dias: [4, 5, 6] }, cocina: { titular: [], reserva: ['ZAPA'], soloDias: [] }, cubreA: [{ pid: 'sluna' }, { pid: 'adrian' }], supuestos: ['partido viernes y sábado (decisión Highkey)'], nota: 'tercero de apoyo por las mañanas en Zapatillera; el domingo a Pasarela por la mañana con Mari Luz; cocina si descansa Adrián' }),
    P('lavinia', 'Lavinia', 'comodin', ['PASARELA', 'ZAPA'], ['M', 'T'], [1, 2, 4], { partido: { dias: [3, 7] }, nuncaCon: ['mariluz'], cubreA: [{ pid: 'mariluz', dow: 3 }], comodin: true, nota: 'el miércoles (libre de Mari Luz) hace partido en Pasarela; el domingo puede hacer partido pero no es obligatorio' }),
    P('tere', 'Tere', 'apoyo', ['PASARELA', 'MONACO'], ['M'], [6, 7], { comodin: true, nota: 'apoyo de mañanas; no trabaja fines de semana' }),
    P('leo', 'Leo', 'comodin', [], ['T'], [3, 4, 7], { nuncaCon: ['scapon'], comodin: true, nota: 'comodín de tardes en cualquier local' }),
    P('jenny', 'Jenny', 'cocina', ['EL33', 'MONACO'], ['M', 'T'], [2], { partido: { dias: [3, 4, 5, 6, 7] }, cocina: { titular: ['EL33', 'MONACO'], reserva: [], soloDias: [] }, cubreA: [{ pid: 'esmeralda', dow: 1 }], nota: 'cocina de El 33 en partido; los lunes en el Mónaco en el sitio de Esmeralda; el domingo dobla' }),
    P('cristian', 'Cristian', 'comodin', [], ['M', 'T'], [1, 3], { cocina: { titular: [], reserva: [], soloDias: [], nunca: true }, vetos: [{ localId: 'PASARELA', franja: 'M' }], noAbre: ['EL33'], comodin: true, nota: 'camarero comodín; el martes tarde fijo en el Mónaco con Susana Capón; no hace cocina' }),
    P('yilian', 'Yilian', 'apoyo', ['MONACO'], ['M', 'T'], [4], { libreVariable: true, partido: { dias: [1] }, cubreA: [{ pid: 'cris', dow: 7 }, { pid: 'scapon', dow: 1, turnoId: 'MONACO_T' }], supuestos: ['partido el lunes por Susana Capón (decisión Highkey)', 'día libre variable'], nota: 'apoyo de Cris Parreño de mañana; le hace el domingo; el lunes hace la tarde de Susana Capón' }),
    P('lola', 'Lola', 'sala', ['PASARELA'], ['M'], [7], { abre: { PASARELA: ['M'] }, cubreA: [{ pid: 'laura' }], nota: 'abre el local; cubre la baja de Laura' }),
    P('adrian', 'Adrián', 'cocina', ['ZAPA'], ['M', 'T'], [3], { partido: { siempre: true, dias: [1, 2, 4, 5, 6, 7] }, cocina: { titular: ['ZAPA'], reserva: [], soloDias: [] }, nota: 'cocina de Zapatillera, siempre partido' }),
    P('victoria', 'Victoria', 'sala', ['EL33'], ['M', 'T'], [3], { partido: { dias: [5, 6] }, nota: 'de mañana; viernes y sábado partido; Noe la cubre el miércoles' }),
    P('hojan', 'Hojan', 'cocina', ['EL33', 'MONACO'], ['M', 'T'], [2, 7], { partido: { dias: [1, 6] }, cocina: { titular: ['EL33', 'MONACO'], reserva: ['ZAPA'], soloDias: [] }, cubreA: [{ pid: 'maydeth' }], supuestos: ['tercero de El 33 el sábado por la mañana (partido)'], nota: 'cubre la baja de Maydeth; el lunes partido (El 33 mañana y Mónaco tarde); de miércoles a sábado cocina de tarde del Mónaco' }),
    P('laura', 'Laura', 'sala', ['PASARELA'], ['M', 'T'], [], { ausencias: [{ tipo: 'BAJ', desde: '2026-09-01', detalle: 'la cubre Lola' }] }),
    P('maydeth', 'Maydeth', 'cocina', ['MONACO'], ['M', 'T'], [], { cocina: { titular: ['MONACO'], reserva: [], soloDias: [] }, ausencias: [{ tipo: 'BAJ', desde: '2026-09-01', detalle: 'la cubre Hojan' }] }),
  ];
  asignarColores(staff);
  // semana tipo (recuento del PDF); s = plaza supuesta por Highkey, no fijada por el grupo
  const pl = (t, p, f) => { const o = { t, p }; if (f && f.includes('c')) o.c = 1; if (f && f.includes('a')) o.a = 1; if (f && f.includes('s')) o.s = 1; return o; };
  const patron = {
    1: [pl('EL33_M', 'victoria'), pl('EL33_M', 'hojan', 'c'), pl('ZAPA_M', 'jacquelin'), pl('ZAPA_M', 'juani'), pl('ZAPA_M', 'adrian', 'c'), pl('MONACO_M', 'jenny', 'c'), pl('MONACO_M', 'cris'), pl('MONACO_M', 'yilian'), pl('PASARELA_M', 'lola', 'a'), pl('PASARELA_M', 'mariluz'), pl('PASARELA_M', 'tere', 's'),
        pl('ZAPA_T', 'sluna'), pl('ZAPA_T', 'adrian', 'c'), pl('MONACO_T', 'hojan', 'c'), pl('MONACO_T', 'yilian', 's'), pl('PASARELA_T', 'mariluz'), pl('PASARELA_T', 'leo', 's')],
    2: [pl('EL33_M', 'victoria'), pl('EL33_M', 'noe', 'c'), pl('EL33_T', 'noe', 'c'), pl('EL33_T', 'leo', 's'), pl('ZAPA_M', 'jacquelin'), pl('ZAPA_M', 'juani'), pl('ZAPA_M', 'adrian', 'c'), pl('ZAPA_M', 'roberto'), pl('ZAPA_T', 'sluna'), pl('ZAPA_T', 'adrian', 'c'),
        pl('MONACO_M', 'esmeralda', 'c'), pl('MONACO_M', 'cris'), pl('MONACO_M', 'yilian'), pl('MONACO_T', 'scapon', 'ac'), pl('MONACO_T', 'cristian'), pl('PASARELA_M', 'lola', 'a'), pl('PASARELA_M', 'mariluz'), pl('PASARELA_M', 'tere', 's'), pl('PASARELA_T', 'ivan', 'a'), pl('PASARELA_T', 'mariluz')],
    3: [pl('EL33_M', 'jenny', 'c'), pl('EL33_M', 'noe'), pl('EL33_T', 'jenny', 'c'), pl('EL33_T', 'noe'), pl('ZAPA_M', 'jacquelin'), pl('ZAPA_M', 'juani'), pl('ZAPA_T', 'sluna'), pl('ZAPA_T', 'roberto', 'c'),
        pl('MONACO_M', 'esmeralda', 'c'), pl('MONACO_M', 'cris'), pl('MONACO_M', 'yilian'), pl('MONACO_T', 'scapon', 'a'), pl('MONACO_T', 'hojan', 'c'), pl('PASARELA_M', 'lola', 'a'), pl('PASARELA_M', 'lavinia'), pl('PASARELA_M', 'tere', 's'), pl('PASARELA_T', 'ivan', 'a'), pl('PASARELA_T', 'lavinia')],
    4: [pl('EL33_M', 'victoria'), pl('EL33_M', 'jenny', 'c'), pl('EL33_T', 'noe'), pl('EL33_T', 'jenny', 'c'), pl('ZAPA_M', 'jacquelin'), pl('ZAPA_M', 'juani'), pl('ZAPA_M', 'adrian', 'c'), pl('ZAPA_M', 'roberto'), pl('ZAPA_T', 'adrian', 'c'), pl('ZAPA_T', 'roberto'),
        pl('MONACO_M', 'esmeralda', 'c'), pl('MONACO_M', 'cris'), pl('MONACO_M', 'cristian', 's'), pl('MONACO_T', 'scapon', 'a'), pl('MONACO_T', 'hojan', 'c'), pl('PASARELA_M', 'lola', 'a'), pl('PASARELA_M', 'mariluz'), pl('PASARELA_M', 'tere', 's'), pl('PASARELA_T', 'ivan', 'a'), pl('PASARELA_T', 'mariluz')],
    5: [pl('EL33_M', 'victoria'), pl('EL33_M', 'jenny', 'c'), pl('EL33_T', 'noe'), pl('EL33_T', 'jenny', 'c'), pl('EL33_T', 'victoria'), pl('ZAPA_M', 'jacquelin'), pl('ZAPA_M', 'juani'), pl('ZAPA_M', 'adrian', 'c'), pl('ZAPA_M', 'roberto'), pl('ZAPA_T', 'sluna'), pl('ZAPA_T', 'adrian', 'c'), pl('ZAPA_T', 'roberto', 's'), pl('ZAPA_T', 'lavinia', 's'),
        pl('MONACO_M', 'esmeralda', 'c'), pl('MONACO_M', 'cris'), pl('MONACO_M', 'yilian'), pl('MONACO_T', 'scapon', 'a'), pl('MONACO_T', 'hojan', 'c'), pl('MONACO_T', 'cristian', 's'), pl('PASARELA_M', 'lola', 'a'), pl('PASARELA_M', 'mariluz'), pl('PASARELA_M', 'tere', 's'), pl('PASARELA_T', 'ivan', 'a'), pl('PASARELA_T', 'mariluz'), pl('PASARELA_T', 'leo', 's')],
    6: [pl('EL33_M', 'victoria'), pl('EL33_M', 'jenny', 'c'), pl('EL33_M', 'hojan', 's'), pl('EL33_T', 'noe'), pl('EL33_T', 'jenny', 'c'), pl('EL33_T', 'victoria'), pl('ZAPA_M', 'jacquelin'), pl('ZAPA_M', 'adrian', 'c'), pl('ZAPA_M', 'roberto'), pl('ZAPA_T', 'sluna'), pl('ZAPA_T', 'adrian', 'c'), pl('ZAPA_T', 'roberto', 's'), pl('ZAPA_T', 'lavinia', 's'),
        pl('MONACO_M', 'esmeralda', 'c'), pl('MONACO_M', 'cris'), pl('MONACO_M', 'yilian'), pl('MONACO_T', 'scapon', 'a'), pl('MONACO_T', 'hojan', 'c'), pl('MONACO_T', 'cristian', 's'), pl('PASARELA_M', 'lola', 'a'), pl('PASARELA_M', 'mariluz'), pl('PASARELA_T', 'ivan', 'a'), pl('PASARELA_T', 'mariluz'), pl('PASARELA_T', 'leo', 's')],
    7: [pl('EL33_M', 'victoria'), pl('EL33_M', 'jenny', 'c'), pl('EL33_M', 'noe'), pl('ZAPA_M', 'juani'), pl('ZAPA_M', 'adrian', 'c'), pl('ZAPA_T', 'sluna'), pl('ZAPA_T', 'adrian', 'c'),
        pl('MONACO_M', 'esmeralda', 'c'), pl('MONACO_M', 'yilian'), pl('MONACO_M', 'cristian', 's'), pl('MONACO_T', 'scapon', 'a'), pl('MONACO_T', 'jenny', 'c'), pl('PASARELA_M', 'mariluz'), pl('PASARELA_M', 'roberto'), pl('PASARELA_T', 'ivan', 'a'), pl('PASARELA_T', 'lavinia', 's')],
  };
  const equipos = [
    { id: 'barcelona', nombre: 'Barcelona', corto: 'Barça', color: '#a50044', refuerzo: { EL33: 1, ZAPA: 1, MONACO: 1, PASARELA: 1 }, franja: 'T' },
    { id: 'madrid', nombre: 'Madrid', corto: 'Madrid', color: '#3b3b3b', refuerzo: { EL33: 1, ZAPA: 1, MONACO: 1, PASARELA: 1 }, franja: 'T' },
    { id: 'elche', nombre: 'Elche', corto: 'Elche', color: '#0a7a3c', refuerzo: { EL33: 1, ZAPA: 1, MONACO: 1, PASARELA: 1 }, franja: 'T' },
  ];
  return { locales, staff, patron, equipos, eventos: [], extras: [], festivos: [], cierres: {} };
}

// ---------- mes de demostración ----------
// Primer arranque del servidor (o ?demo=1): el mes en curso y el siguiente se
// generan con la semana tipo, y se marca un partido el próximo sábado para que
// Hoy, Semana, Mes y Horas enseñen algo real desde el primer minuto. Nunca pisa
// un mes que ya tenga algo; si no había nada que generar, tampoco añade el partido.
function sembrarDemo(S, hoyIso) {
  const hoy = hoyIso || fechaMadrid();
  const r = { meses: [], aplicados: 0, evento: null };
  S.meses = S.meses || {};
  let y = +hoy.slice(0, 4), m = +hoy.slice(5, 7);
  for (let i = 0; i < 2; i++) {
    const k = claveMes(y, m);
    const e = estadoDesde(S.meses, S.festivos || [], y, m);
    if (!Object.keys(e.asig).length) {
      const g = generarPlanilla(S, S.staff, e, e.days[0].iso, e.days[e.days.length - 1].iso, {});
      S.meses[k] = { apertura: e.apertura, asig: e.asig, manual: e.manual };
      r.meses.push(k); r.aplicados += g.aplicados.length;
    }
    m++; if (m > 12) { m = 1; y++; }
  }
  if (r.meses.length) {
    const q = (S.equipos || [])[0];
    let sab = hoy; while (isoDow(sab) !== 6) sab = addDias(sab, 1);
    if (q && !(S.eventos || []).some(ev => ev.iso === sab)) {
      (S.eventos = S.eventos || []).push({ id: 'ev_demo_' + sab, iso: sab, tipo: 'partido', equipo: q.id, nombre: `Juega el ${q.nombre}`, franja: q.franja || 'T', refuerzo: Object.assign({}, q.refuerzo || {}), hora: '21:00', ts: Date.now() });
      r.evento = sab;
    }
  }
  return r;
}

if (typeof module !== 'undefined') {
  module.exports = {
    fechaLocal, isoDow, addDias, diasDelMes, isoDe, claveMes, mondayOf, semanaDe, fechaMadrid, rangoIso,
    FRANJAS, FRANJA_LBL, DOW_LBL, DOW_PL, TODOS, TIPOS_AUSENCIA, AUS_LBL, PUESTOS,
    turnoId, partirTurno, turnosDe, localDe, personaDe, nombreDe,
    turnoAbierto, toggleApertura, turnosAbiertosSemana, turnosAbiertosMes, turnosConSupuesto, eventosDe, minimoDe,
    nuevoEstado, estadoDesde, clonarEstado, asignados, pidsEn, casillasDe, manualDe, marcarManual, quitarMarcaManual, primerDiaPlanificable,
    ausenciaEn, quitarDiaDeAusencia, anadirAusencia, deBaja,
    localTieneCocina, puedeCocina, rangoCocina, abrePorDefecto,
    puedeEstar, ordenarCasilla, normalizarCasilla, asignar, desasignar, moverEnCasilla, marcarCocina, marcarAbre,
    revisarTurno, revisionMes,
    plazasDe, instanciarPatron, patronDesdeSemana,
    turnosMes, esComodin, candidatosPara, candidatosConAviso, porQueNadie, generarPlanilla,
    minutosTurno, minutosNocturnos, horarioDe, horasPersonaMes, horasEquipoMes, horasLocalMes,
    toProblem, desdeSolucion,
    fusionarEstado, sembrarDemo, mesVisibleParaPersonal, mesesVisibles, destinatariosAviso, avisoEsPara,
    sugerirUsuario, PALETA_PERSONAS, asignarColores, semillaPasarela,
  };
}
