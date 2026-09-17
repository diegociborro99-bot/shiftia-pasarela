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
// Los tres puestos del grupo (José, 17/09): el «comodín» desaparece y pasa a ser apoyo.
// Quien no tiene local fijo se marca aparte (p.comodin), que es otra cosa.
const PUESTOS = [
  { id: 'sala', label: 'Sala' }, { id: 'cocina', label: 'Cocina' }, { id: 'apoyo', label: 'Apoyo' },
];
function esApoyo(p) { return !!p && p.puesto === 'apoyo'; }
// Un veto es «no hace esa franja en ese local». Desde el 17/09 puede llevar `dow` (un día o
// varios) para los casos como Mari Luz: la mañana de Pasarela solo se le veta los lunes,
// porque esa tarde la hace entera. Sin `dow`, el veto es de todos los días, como el de Cristian.
function dowsVeto(v) { return v.dow === undefined || v.dow === null ? null : (Array.isArray(v.dow) ? v.dow : [v.dow]); }
function vetoDe(p, localId, franja, dow) {
  return (p.vetos || []).find(v => v.localId === localId && v.franja === franja && (dowsVeto(v) === null || dowsVeto(v).includes(dow))) || null;
}
function textoVeto(v, nombreLocal) {
  const dows = dowsVeto(v);
  return `no hace ${v.franja === 'M' ? 'mañanas' : 'tardes'} en ${nombreLocal}${dows ? ' ' + dows.map(d => DOW_PL[d]).join(' y ') : ''}`;
}

// ---------- entrevistas (José, 17/09) ----------
// Dos menús: las entrevistas del grupo y la alerta interna (quien no acude a la cita o
// ha dado problemas). Cada candidato lleva dos etiquetas: el puesto al que opta y la
// valoración del encargado.
const LISTAS_CAND = [
  { id: 'ent', label: 'Entrevistas', sub: 'la base del grupo' },
  { id: 'alerta', label: 'Alerta interna', sub: 'no acuden o dan problemas' },
];
// Los tres estados que el grupo marca con un emoticono en su base: pulgar arriba,
// reloj de arena (pendiente de valorar) y pulgar abajo.
const VALORACIONES = [
  { id: 'bien', label: 'Bien', corto: 'bien', ico: 'bien' },
  { id: 'regular', label: 'En espera', corto: 'en espera', ico: 'espera' },
  { id: 'mal', label: 'Mal', corto: 'mal', ico: 'mal' },
  { id: 'veto', label: 'Vetado', corto: 'vetado', ico: 'veto' },
];
// El puesto al que opta: cocinero (sartén) o camarero (bandeja)
const PUESTOS_CAND = [
  { id: 'cocina', label: 'Cocinero/a', corto: 'Cocina', ico: 'cocina' },
  { id: 'sala', label: 'Camarero/a', corto: 'Sala', ico: 'camarero' },
];
// Lo que el grupo pregunta en la entrevista: si maneja cada cosa. Las respuestas del
// candidato se guardan como sí / con dudas / no.
const HABILIDADES = [
  { id: 'cafetera', label: 'Cafetera', ico: 'cafetera' },
  { id: 'barril', label: 'Cambiar barril', ico: 'barril' },
  { id: 'bandeja', label: 'Bandeja', ico: 'camarero' },
  { id: 'cocina', label: 'Cocina', ico: 'cocina' },
  { id: 'jamon', label: 'Jamón', ico: 'jamon' },
  { id: 'tpv', label: 'TPV', ico: 'tpv' },
  { id: 'pda', label: 'PDA', ico: 'pda' },
];
const HAB_ESTADO = { si: 'Sí', dudas: 'Con dudas', no: 'No' };
// El resto de la entrevista, tal como la tiene el grupo en su plantilla
// cada dato con su icono: la ficha del candidato los pinta con él (José, 17/09)
const CAMPOS_ENTREVISTA = [
  // la fecha va la primera de todas: es lo que Aroa mira al abrir la ficha (17/09)
  { k: 'fecha', label: 'Fecha de la entrevista', corto: true, ico: 'fecha', meta: true },
  { k: 'edad', label: 'Edad', corto: true, ico: 'edad' }, { k: 'zona', label: 'Zona', ico: 'zona' },
  { k: 'exp', label: 'Experiencia', largo: true, ico: 'exp' }, { k: 'tipoCocina', label: 'Tipología de cocina', ico: 'tipoCocina' },
  { k: 'incorp', label: 'Incorporación', ico: 'incorp' }, { k: 'sueldo', label: 'Expectativas salariales', ico: 'sueldo' },
  { k: 'horarios', label: 'Horarios', largo: true, ico: 'horarios' }, { k: 'cond', label: 'Condiciones', largo: true, ico: 'cond' },
  { k: 'obs', label: 'Observaciones', largo: true, ico: 'obs' },
];
const MOTIVOS_ALERTA = [
  { id: 'NOACUDE', label: 'No acude a la cita' },
  { id: 'PROBLEMA', label: 'Da problemas' },
  { id: 'OTRO', label: 'Otro motivo' },
];
const VAL_LBL = {}; VALORACIONES.forEach(v => { VAL_LBL[v.id] = v; });
// 17/09 (Aroa): «hay algunos que son Camarero Cocinero». El puesto deja de ser uno solo y
// pasa a ser una lista; `puesto` (el campo viejo, de un valor) se migra al cargar.
function puestosDe(c) {
  if (c && Array.isArray(c.puestos)) return c.puestos;
  return c && c.puesto ? [c.puesto] : [];
}
function textoPuestos(c) {
  const ps = PUESTOS_CAND.filter(x => puestosDe(c).includes(x.id));
  if (!ps.length) return 'Sin puesto';
  return ps.map((x, i) => i ? x.corto.toLowerCase() : x.corto).join(' y ');
}
function migrarCandidatos(estado) {
  const r = { candidatos: 0 };
  for (const c of (estado && estado.entrevistas) || []) {
    if (Array.isArray(c.puestos)) { delete c.puesto; continue; }
    c.puestos = c.puesto ? [c.puesto] : [];
    delete c.puesto;
    r.candidatos++;
  }
  return r;
}
// «Cocinero bien», «Camarera en espera», «Cocina y sala»…: la etiqueta que pidió José
function etiquetaCandidato(c) {
  const p = textoPuestos(c);
  const v = c && VAL_LBL[c.val];
  return v ? `${p} · ${v.corto}` : p;
}
// el buscador mira todo lo que hay escrito de esa persona, no solo el nombre
function textoCandidato(c) {
  return [c.nombre, c.tel, c.nota].concat(CAMPOS_ENTREVISTA.map(x => c[x.k])).filter(Boolean).join(' ').toLowerCase();
}
// filtro combinado: lista, texto libre (nombre o teléfono), puesto y valoración
function filtrarCandidatos(cands, f) {
  const o = f || {};
  const q = String(o.q || '').trim().toLowerCase();
  const qTel = q.replace(/\D/g, '');
  return (cands || []).filter(c => {
    if (o.lista && c.lista !== o.lista) return false;
    if (o.puesto) { const ps = puestosDe(c); if (o.puesto === 'ninguno' ? ps.length : !ps.includes(o.puesto)) return false; }
    if (o.val) { if (o.val === 'ninguna' ? c.val : c.val !== o.val) return false; }
    if (o.motivo && c.motivo !== o.motivo) return false;
    if (o.hab && ((c.hab || {})[o.hab] !== 'si')) return false;
    if (!q) return true;
    return textoCandidato(c).includes(q) || (!!qTel && String(c.tel || '').includes(qTel));
  });
}
function resumenCandidatos(cands, lista) {
  const out = { total: 0, sinPuesto: 0, sinValorar: 0, conEntrevista: 0, hab: {}, puesto: {} };
  for (const v of VALORACIONES) out[v.id] = 0;
  for (const h of HABILIDADES) out.hab[h.id] = 0;
  for (const x of PUESTOS_CAND) out.puesto[x.id] = 0;
  for (const c of cands || []) {
    if (lista && c.lista !== lista) continue;
    out.total++;
    const ps = puestosDe(c);
    if (!ps.length) out.sinPuesto++;
    for (const x of PUESTOS_CAND) if (ps.includes(x.id)) out.puesto[x.id]++;
    if (!c.val) out.sinValorar++; else if (out[c.val] !== undefined) out[c.val]++;
    if (tieneEntrevista(c)) out.conEntrevista++;
    for (const h of HABILIDADES) if ((c.hab || {})[h.id] === 'si') out.hab[h.id]++;
  }
  return out;
}
// ¿esta persona tiene la entrevista contestada? La fecha no cuenta: se pone sola al
// registrarla (Aroa, 17/09), así que por sí sola no dice que se le haya preguntado nada.
function tieneEntrevista(c) { return !!(c && (CAMPOS_ENTREVISTA.some(x => !x.meta && c[x.k]) || Object.keys(c.hab || {}).length)); }

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
// Día libre puntual (José, 17/09): una semana concreta se libra otro día, y a la semana
// siguiente se vuelve al de siempre. p.libraPuntual = { semana: <lunes iso>, dias: [dow] }
function lunesDe(iso) { return addDias(iso, 1 - isoDow(iso)); }
function libraPuntualVigente(p, iso) {
  const lp = p && p.libraPuntual;
  return !!(lp && lp.semana && Array.isArray(lp.dias) && lp.semana === lunesDe(iso));
}
function libraEn(p, iso) {
  if (!p) return false;
  if (libraPuntualVigente(p, iso)) return p.libraPuntual.dias.includes(isoDow(iso));
  return (p.libra || []).includes(isoDow(iso));
}
// al cargar la planilla se apagan los días libres puntuales de semanas ya pasadas
function limpiarLibrePuntual(staff, hoyIso) {
  const lunes = lunesDe(hoyIso); let n = 0;
  for (const p of staff || []) if (p.libraPuntual && p.libraPuntual.semana && p.libraPuntual.semana < lunes) { p.libraPuntual = null; n++; }
  return n;
}
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


// ---------- interruptores: reglas del grupo y características por persona ----------
// El encargado puede apagar una regla para todo el grupo (cfg.reglas[k] = false) o
// una característica concreta de una ficha (p.inactivas = ['nuncaCon', …]). Lo
// apagado no lo comprueba nadie: ni puedeEstar, ni el generador, ni la revisión.
const CARACTERISTICAS = [
  { k: 'locales', lbl: 'Locales donde trabaja' }, { k: 'franjas', lbl: 'Mañanas y tardes' }, { k: 'libra', lbl: 'Días que libra' },
  { k: 'partido', lbl: 'Días de partido' }, { k: 'vetos', lbl: 'No hace (local y franja)' }, { k: 'nuncaCon', lbl: 'Nunca con' },
  { k: 'cubreA', lbl: 'Cubre a' }, { k: 'cocina', lbl: 'Cocina' }, { k: 'abre', lbl: 'Sale el primero' }, { k: 'noAbre', lbl: 'No abre' },
  { k: 'noPrimero', lbl: 'Nunca de primero' }, { k: 'prefs', lbl: 'Preferencias' }, { k: 'contrato', lbl: 'Contrato' },
];
const REGLAS = [
  { k: 'minimos', lbl: 'Mínimos por local, franja y día' }, { k: 'cocina', lbl: 'Cocina: quién la lleva y en qué posición' },
  { k: 'nuncaCon', lbl: '«Nunca con»: no coinciden en la misma casilla' }, { k: 'libra', lbl: 'Días que libra cada persona' },
  { k: 'vetos', lbl: 'Vetos por local y franja' }, { k: 'partido', lbl: 'Partidos solo los días declarados' },
  { k: 'noPrimero', lbl: 'Quien no sale nunca el primero (Leo; Cristian por la tarde)', nueva: true },
  { k: 'primeroCompleto', lbl: 'El primero de cada franja hace turno completo: quien viene de la mañana no abre la tarde (salvo turno continuo, o partido donde el local lo permita)', nueva: true },
  { k: 'cubreA', lbl: '«Cubre a»: quién ocupa el sitio de quien falta' }, { k: 'abre', lbl: 'Quién sale el primero (fijo por local)' },
];
function regla(cfg, k) { return !(cfg && cfg.reglas && cfg.reglas[k] === false); }
function caracteristicaActiva(p, k) { return !(p && Array.isArray(p.inactivas) && p.inactivas.includes(k)); }

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
  const act = k => regla(cfg, k) && caracteristicaActiva(p, k);
  if (act('locales') && Array.isArray(p.locales) && p.locales.length && !p.locales.includes(localId)) m = forzable(`solo ${lblLocales(cfg, p.locales)}`);
  if (!m && act('franjas') && Array.isArray(p.franjas) && p.franjas.length && !p.franjas.includes(franja)) m = forzable(p.franjas.length === 1 ? (p.franjas[0] === 'M' ? 'siempre de mañana' : 'solo tardes') : 'franja no permitida');
  if (!m && p.standby) m = forzable('en standby: aún no entra en la planilla');
  if (!m && act('libra') && libraEn(p, iso)) m = forzable(libraPuntualVigente(p, iso) ? `libra ${DOW_PL[dow]} esta semana` : `libra ${DOW_PL[dow]}`);
  if (!m && act('vetos')) { const v = vetoDe(p, localId, franja, isoDow(iso)); if (v) m = forzable(textoVeto(v, l.nombre)); }
  if (!m && act('partido')) {
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
  if (!m && regla(cfg, 'nuncaCon')) {
    for (const q of asignados(est, iso, tid)) {
      const qp = personaDe(staff, q.pid);
      if (!qp) continue;
      const mio = caracteristicaActiva(p, 'nuncaCon') && (p.nuncaCon || []).includes(q.pid);
      const suyo = caracteristicaActiva(qp, 'nuncaCon') && (qp.nuncaCon || []).includes(pid);
      if (!mio && !suyo) continue;
      // «nunca coincide» flexible (José, 17/09): se respeta si hay gente suficiente; si no,
      // se relaja y queda el aviso para que el encargado lo vea
      if (o.relajarNuncaCon && (p.nuncaConFlexible || qp.nuncaConFlexible)) { avisos.push(`nunca con ${qp.nombre}: no había nadie más`); continue; }
      m = forzable(`nunca con ${qp.nombre}`); break;
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

// ---------- el primero de la casilla ----------
// La posición 1 abre y hace turno completo (regla 31 del prototipo del 11/09). Quien
// no puede salir el primero (Leo siempre, Cristian por la tarde, quien viene de hacer
// la mañana salvo turno continuo, quien «no abre» ese local) puede estar en la casilla
// pero no en la 1.ª. Si nadie de la casilla puede, la 1.ª es un HUECO DISPONIBLE.
function puedePrimero(cfg, staff, est, iso, tid, pid) {
  const p = personaDe(staff, pid);
  if (!p) return { ok: false, motivo: 'no existe' };
  const { localId, franja } = partirTurno(tid);
  const l = localDe(cfg, localId);
  if (regla(cfg, 'noPrimero') && caracteristicaActiva(p, 'noPrimero') && (p.noPrimero || []).includes(franja)) return { ok: false, motivo: `${p.nombre} no sale ${franja === 'M' ? 'el primero de la mañana' : 'el primero de la tarde'}` };
  if (caracteristicaActiva(p, 'noAbre') && (p.noAbre || []).includes(localId)) return { ok: false, motivo: `${p.nombre} no abre ${l ? l.nombre : localId}` };
  if (franja === 'T' && regla(cfg, 'primeroCompleto')) {
    for (const t of turnosDe(cfg)) {
      if (t.franja !== 'M' || !pidsEn(est, iso, t.id).includes(pid)) continue;
      if (t.local.id === localId && primeroDe(cfg, staff, est, iso, t.id) === pid) return { ok: true, continuo: true };
      if (partidoAbre(cfg, l, p, iso, franja)) return { ok: true, partido: true };
      return { ok: false, motivo: `${p.nombre} viene de hacer la mañana: el primero de la tarde hace turno completo` };
    }
  }
  return { ok: true };
}
// 15/09, reunión con el cliente: en Pasarela, si Iván libra, la tarde la hace Mari Luz en
// partido y no hace falta cobertura entera. Donde el local lo permite (l.partidoAbre[franja]),
// quien hace partido DECLARADO ese día puede abrir la tarde. El 33 no lo permite (José da
// el martes por insalvable).
function partidoAbre(cfg, l, p, iso, franja) {
  if (!(l && l.partidoAbre && l.partidoAbre[franja])) return false;
  if (!(regla(cfg, 'partido') && caracteristicaActiva(p, 'partido'))) return true;
  const pd = p.partido || {};
  return !!(pd.siempre || (pd.dias || []).includes(isoDow(iso)));
}
// quién sale el primero en una casilla: lo marcado a mano; si no, el fijo del local, quien
// tiene «sale el primero» en su ficha, o el primero de la lista que pueda. null = nadie puede.
function primeroDe(cfg, staff, est, iso, tid) {
  const lista = asignados(est, iso, tid);
  if (!lista.length) return null;
  const { localId, franja } = partirTurno(tid);
  const l = localDe(cfg, localId);
  const okP = e => puedePrimero(cfg, staff, est, iso, tid, e.pid).ok;
  const man = manualDe(est, iso, tid);
  const marcado = lista.find(e => e.abre);
  if (marcado && man.abre) return marcado.pid;   // fijado a mano: manda aunque rompa una regla (queda constancia)
  if (regla(cfg, 'abre') && l && l.primero && l.primero[franja]) { const e = lista.find(x => x.pid === l.primero[franja]); if (e && okP(e)) return e.pid; }
  if (regla(cfg, 'abre')) { const e = lista.find(x => { const p = personaDe(staff, x.pid); return p && caracteristicaActiva(p, 'abre') && p.abre && p.abre[localId] && p.abre[localId].includes(franja) && okP(x); }); if (e) return e.pid; }
  // la cocina tiene su propia posición: solo abre si nadie más puede (o si es la fija del local, como Susana Capón el martes)
  const e = lista.find(x => !x.cocina && okP(x)) || lista.find(okP);
  return e ? e.pid : null;
}
function motivoSinPrimero(cfg, staff, est, iso, tid) {
  const lista = asignados(est, iso, tid);
  const motivos = lista.map(e => puedePrimero(cfg, staff, est, iso, tid, e.pid).motivo).filter(Boolean);
  return `nadie de la casilla puede abrir${motivos.length ? ': ' + motivos.join('; ') : ''}`;
}
function porQueNadiePrimero(cfg, staff, est, iso, tid) {
  const out = {};
  for (const p of staff) {
    let r = puedeEstar(cfg, staff, est, iso, tid, p.id);
    if (r.ok || pidsEn(est, iso, tid).includes(p.id)) r = puedePrimero(cfg, staff, est, iso, tid, p.id);
    if (r.ok) continue;
    (out[r.motivo] = out[r.motivo] || []).push(p.nombre);
  }
  return out;
}
// orden completo de una casilla: el primero (o un hueco si nadie puede), la cocina en su
// posición, y el resto en su orden; con hueco, quien viene de partido va al final
function ordenCompleto(cfg, staff, est, iso, tid) {
  const lista = asignados(est, iso, tid);
  if (!lista.length) return { orden: [], primero: null, motivoHueco: null };
  const { franja } = partirTurno(tid);
  const primero = primeroDe(cfg, staff, est, iso, tid);
  const otra = franja === 'M' ? 'T' : 'M';
  const enOtra = pid => turnosDe(cfg).some(t => t.franja === otra && pidsEn(est, iso, t.id).includes(pid));
  const entradas = lista.map(e => Object.assign({}, e, { abre: !!primero && e.pid === primero }));
  let base = entradas, motivoHueco = null;
  if (!primero) {
    motivoHueco = motivoSinPrimero(cfg, staff, est, iso, tid);
    const coc = entradas.filter(e => e.cocina), resto = entradas.filter(e => !e.cocina);
    resto.sort((a, b) => (enOtra(a.pid) ? 1 : 0) - (enOtra(b.pid) ? 1 : 0));
    base = [{ hueco: true, abre: true, pid: null }, ...coc, ...resto];
  }
  return { orden: ordenarCasilla(cfg, iso, tid, base), primero, motivoHueco };
}
function esContinuo(cfg, staff, est, iso, localId, pid) {
  const tm = turnoId(localId, 'M'), tt = turnoId(localId, 'T');
  return turnoAbierto(cfg, est, iso, tm) && turnoAbierto(cfg, est, iso, tt) && primeroDe(cfg, staff, est, iso, tm) === pid && primeroDe(cfg, staff, est, iso, tt) === pid;
}
// posiciones tal como se enseñan y se imprimen: [{pos, pid, nombre, abre, abreFijo, cocina,
// partido, continuo, comodin, por, nota, supuesto, forzado, hueco, motivo}]
function posicionesDe(cfg, staff, est, iso, tid) {
  const { localId, franja } = partirTurno(tid);
  const l = localDe(cfg, localId);
  const { orden, primero, motivoHueco } = ordenCompleto(cfg, staff, est, iso, tid);
  const otra = franja === 'M' ? 'T' : 'M';
  const enOtra = pid => turnosDe(cfg).some(t => t.franja === otra && pidsEn(est, iso, t.id).includes(pid));
  return orden.map((e, i) => {
    if (e.hueco) return { pos: i + 1, hueco: true, motivo: motivoHueco, abre: true };
    const p = personaDe(staff, e.pid) || { nombre: e.pid };
    const continuo = e.pid === primero && esContinuo(cfg, staff, est, iso, localId, e.pid);
    const abreFijo = !!(l && l.primero && l.primero[franja] === e.pid) || !!(p.abre && p.abre[localId] && p.abre[localId].includes(franja));
    const por = e.por || ((e.razon || '').match(/^cubre a (.+)$/) ? (staff.find(q => q.nombre === e.razon.slice(8)) || {}).id || null : null);
    return { pos: i + 1, pid: e.pid, nombre: p.nombre, abre: e.pid === primero, abreFijo: e.pid === primero && abreFijo, cocina: !!e.cocina, partido: enOtra(e.pid) && !continuo, continuo, comodin: !(p.locales || []).length, por: por || null, nota: e.nota || null, supuesto: !!e.supuesto, forzado: !!e.forzado, origen: e.origen || 'manual' };
  });
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
  if (!man.abre) { const pr = primeroDe(cfg, staff, est, iso, tid); for (const e of lista) e.abre = !!pr && e.pid === pr; }
  if (!man.orden) {
    const { orden } = ordenCompleto(cfg, staff, est, iso, tid);
    const porPid = {}; for (const e of lista) porPid[e.pid] = e;
    est.asig[iso][tid] = orden.filter(e => !e.hueco).map(e => porPid[e.pid]);
  }
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
  if (o.por) entry.por = o.por;
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
    sinAbre: !!(abierto && n > 0 && !primeroDe(cfg, staff, est, iso, tid)),
    motivoAbre: abierto && n > 0 && !primeroDe(cfg, staff, est, iso, tid) ? motivoSinPrimero(cfg, staff, est, iso, tid) : null,
    // dos apoyos no pueden quedarse solos en un turno (José, 17/09): hace falta un veterano
    soloApoyos: !!(abierto && lista.length && lista.every(e => esApoyo(personaDe(staff, e.pid)))),
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
      if (r.sinAbre) out.push({ iso: d.iso, turnoId: t.id, tipo: 'sin-abre', nivel: 'alta', msg: `${donde}: hueco disponible en la 1.ª posición — ${r.motivoAbre}` });
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
      const a = asignar(est, cfg, staff, iso, pl.t, pl.p, { origen: 'patron', razon: pl.por ? `cubre a ${nombreDe(staff, pl.por)}` : 'plaza fija de la semana tipo', supuesto: !!pl.s, cocina: pl.c ? true : undefined, abre: pl.a ? true : undefined, por: pl.por, nota: pl.n });
      if (a.ok) r.aplicados.push({ iso, turnoId: pl.t, pid: pl.p, origen: 'patron', razon: a.entry.razon, supuesto: !!pl.s });
      else r.rechazados.push({ iso, turnoId: pl.t, pid: pl.p, motivo: a.motivo });
    }
    // quien «cubre a» la persona ausente ocupa su sitio (si puede)
    for (const { pl, p } of ausentes) {
      const candidatos = staff.filter(q => q.id !== p.id && (q.cubreA || []).some(c => c.pid === p.id && (!c.dow || c.dow === dow) && (!c.turnoId || c.turnoId === pl.t)));
      for (const q of candidatos) {
        if (pidsEn(est, iso, pl.t).includes(q.id)) break;
        const a = asignar(est, cfg, staff, iso, pl.t, q.id, { origen: 'patron', razon: `cubre a ${p.nombre}`, por: p.id, permitirPartido: true, cocina: pl.c && puedeCocina(cfg, q, partirTurno(pl.t).localId, iso) ? true : undefined });
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
      const pl = { t: tid, p: e.pid }; if (e.cocina) pl.c = 1; if (e.abre) pl.a = 1; if (e.supuesto) pl.s = 1; if (e.por) pl.por = e.por; if (e.nota) pl.n = e.nota;
      patron[dow].push(pl);
    }
  }
  return patron;
}

// ---------- candidatos y generador ----------
function turnosMes(est, pid) { let n = 0; for (const porT of Object.values(est.asig)) for (const lista of Object.values(porT)) if (lista.some(x => x.pid === pid)) n++; return n; }
// «sin local fijo»: puede ir a cualquier bar. No es un puesto, es una característica.
function esComodin(p) { return !!(p.comodin || !(p.locales || []).length); }
function candidatosPara(cfg, staff, est, iso, tid, opts) {
  const o = opts || {};
  const { localId, franja } = partirTurno(tid);
  const l = localDe(cfg, localId);
  const dow = isoDow(iso);
  const out = [];
  const ausentesHoy = staff.filter(q => ausenciaEn(q, iso)).map(q => q.id);
  for (const p of staff) {
    const r = puedeEstar(cfg, staff, est, iso, tid, p.id, { permitirPartido: !!o.permitirPartido, relajarNuncaCon: !!o.relajarNuncaCon });
    if (!r.ok) continue;
    // quien ese día lleva la cocina no puede reforzar la sala (Aroa, 17/09), y quien solo
    // hace cocina tampoco entra en un hueco que no lo es
    if (!o.cocina && (p.soloCocina || enCocinaEse(cfg, est, iso, p.id))) continue;
    let score = 50; const razones = [];
    if (o.primero) { const pr = puedePrimero(cfg, staff, est, iso, tid, p.id); if (!pr.ok) continue; if ((l.primero && l.primero[franja] === p.id) || (p.abre && p.abre[localId] && p.abre[localId].includes(franja))) { score += 25; razones.push('sale el primero'); } else razones.push('puede abrir (turno completo)'); }
    const cubre = (p.cubreA || []).find(c => ausentesHoy.includes(c.pid) && (!c.dow || c.dow === dow) && (!c.turnoId || c.turnoId === tid));
    if (cubre) { score += 60; razones.push(`cubre a ${nombreDe(staff, cubre.pid)}`); }
    if (esComodin(p)) { score += 30; razones.push('sin local fijo'); }
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
    // el primero de cada casilla hace turno completo: si nadie de los puestos puede abrir se
    // busca a alguien que pueda; si no lo hay, la 1.ª posición queda como hueco disponible
    for (const t of abiertos) {
      if (!asignados(target, iso, t.id).length || primeroDe(cfg, staff, target, iso, t.id)) continue;
      const c = candidatosPara(cfg, staff, target, iso, t.id, { primero: true, permitirPartido: !!o.permitirPartido })[0];
      if (c) {
        const a = asignar(target, cfg, staff, iso, t.id, c.pid, { origen: 'generador', razon: c.razones.join(' · '), permitirPartido: !!o.permitirPartido });
        if (a.ok) { r.aplicados.push({ iso, turnoId: t.id, pid: c.pid, origen: 'generador', razon: a.entry.razon, avisos: a.avisos }); continue; }
      }
      r.huecos.push({ iso, turnoId: t.id, pos: 1, tipo: 'primero', faltan: 0, minimo: minimoDe(cfg, iso, t.id).min, motivo: motivoSinPrimero(cfg, staff, target, iso, t.id), porQueNadie: porQueNadiePrimero(cfg, staff, target, iso, t.id) });
    }
  }
  return r;
}
// candidatos que solo romperían reglas blandas (partido no declarado) para un hueco
function candidatosConAviso(cfg, staff, est, iso, tid) {
  const sin = new Set(candidatosPara(cfg, staff, est, iso, tid).map(c => c.pid));
  return candidatosPara(cfg, staff, est, iso, tid, { permitirPartido: true }).filter(c => !sin.has(c.pid));
}


// ---------- condiciones del grupo, verificación y generador semanal ----------
// El catálogo sale de los datos (locales y fichas): cada mínimo, cada cocina y cada
// característica activa es una condición con su texto, y la verificación recorre la
// semana generada y dice cuál se cumple y cuál no. Es la lista que imprime el
// prototipo del 11/09 («las 32 condiciones que comprueba el simulador»).
const DOW_L1 = ['', 'L', 'M', 'X', 'J', 'V', 'S', 'D'];   // inicial de cada día (el DOW_C de la app vive fuera del modelo)
function resumenMinimos(l, f) {
  const partes = [];
  let grupo = null;
  for (const d of TODOS) {
    if (!(l.abre && l.abre[f] && l.abre[f].includes(d))) { if (grupo) { partes.push(grupo); grupo = null; } continue; }
    const v = ((l.minimos && l.minimos[f]) || {})[d] || 0, sup = !!((l.supuestos && l.supuestos[f]) || {})[d];
    if (grupo && grupo.v === v && grupo.sup === sup && grupo.hasta === d - 1) grupo.hasta = d;
    else { if (grupo) partes.push(grupo); grupo = { desde: d, hasta: d, v, sup }; }
  }
  if (grupo) partes.push(grupo);
  return partes.map(g => `${DOW_L1[g.desde]}${g.hasta !== g.desde ? '–' + DOW_L1[g.hasta] : ''} ${g.v}${g.sup ? '*' : ''}`).join(', ');
}
function descripcionCocina(cfg, l) {
  const nombres = ids => ids.map(id => (personaDe(cfg.staff || [], id) || { nombre: id }).nombre);
  const posTxt = f => { const p = (l.cocina && l.cocina.posicion && l.cocina.posicion[f]) || 2; const desde = l.cocina && l.cocina.posicionSiDesde && l.cocina.posicionSiDesde[f]; return `${p}.ª${desde ? ` con ${desde} o más` : ''}`; };
  if (!l.cocina || !(localTieneCocina(l, 'M') || localTieneCocina(l, 'T'))) return 'sin cocina propia';
  const ob = l.cocina.obligatoria || {};
  const pos = posTxt('M') === posTxt('T') ? `cocina en ${posTxt('M')} posición` : `cocina ${posTxt('M')} por la mañana · ${posTxt('T')} por la tarde`;
  return (ob.M && ob.T ? 'cocina obligatoria mañana y tarde · ' : '') + pos;
}
function condicionesDe(cfg, staff) {
  const st = staff || cfg.staff || [];
  const out = [];
  const add = (id, texto, x) => out.push(Object.assign({ id, num: out.length + 1, texto, ok: true, detalle: '' }, x || {}));
  const nom = pid => (personaDe(st, pid) || { nombre: pid }).nombre;
  const dowsTxt = ds => ds.map(d => DOW_PL[d].replace('los ', '')).join(', ');
  if (regla(cfg, 'minimos')) for (const l of cfg.locales) for (const f of FRANJAS) { const r = resumenMinimos(l, f); if (r) add(`min:${l.id}:${f}`, `${l.nombre} por la ${FRANJA_LBL[f].toLowerCase()}: ${r}`, { tipo: 'minimos', localId: l.id, franja: f }); }
  if (regla(cfg, 'cocina')) for (const l of cfg.locales) {
    if (!(localTieneCocina(l, 'M') || localTieneCocina(l, 'T'))) continue;
    const tit = [...new Set([...(l.cocina.titulares.M || []), ...(l.cocina.titulares.T || [])])].map(nom);
    const res = (l.cocina.reservas || []).filter(id => !tit.includes(nom(id))).map(nom);
    const ob = l.cocina.obligatoria || {};
    const quien = tit.length ? `la cocina la lleva${tit.length > 1 ? 'n' : ''} ${tit.join(', ').replace(/, ([^,]*)$/, ' o $1')}${res.length ? `; si falta, ${res.join(' u ')}` : ''}` : 'hay cocina';
    add(`coc:${l.id}`, `En ${l.nombre} ${ob.M && ob.T ? 'hay cocina mañana y tarde, todos los días: ' : ''}${quien} (${descripcionCocina(cfg, l).replace(/^cocina obligatoria mañana y tarde · /, '')})`, { tipo: 'cocina', localId: l.id });
  }
  const vistos = new Set();
  for (const p of st) {
    if (deBaja(p)) continue;
    const act = k => regla(cfg, k === 'locales' || k === 'franjas' || k === 'cocina' || k === 'noAbre' ? 'cocina' : k) && caracteristicaActiva(p, k);
    if (caracteristicaActiva(p, 'locales') && (p.locales || []).length) add(`p:${p.id}:locales`, `${p.nombre}: ${p.locales.length === 1 ? 'solo en ' : ''}${lblLocales(cfg, p.locales)}`, { tipo: 'persona', pid: p.id, k: 'locales' });
    if (caracteristicaActiva(p, 'franjas') && (p.franjas || []).length === 1) add(`p:${p.id}:franjas`, `${p.nombre} solo hace ${p.franjas[0] === 'M' ? 'mañanas' : 'tardes'}`, { tipo: 'persona', pid: p.id, k: 'franjas' });
    if (regla(cfg, 'libra') && caracteristicaActiva(p, 'libra') && (p.libra || []).length) add(`p:${p.id}:libra`, `${p.nombre} libra ${p.libra.map(d => DOW_PL[d]).join(' y ')}${p.libreVariable ? ' (día libre variable)' : ''}`, { tipo: 'persona', pid: p.id, k: 'libra' });
    if (regla(cfg, 'partido') && caracteristicaActiva(p, 'partido') && ((p.partido || {}).siempre || ((p.partido || {}).dias || []).length)) add(`p:${p.id}:partido`, `${p.nombre} hace partido ${p.partido.siempre ? 'siempre' : 'los ' + dowsTxt(p.partido.dias)}`, { tipo: 'persona', pid: p.id, k: 'partido' });
    if (regla(cfg, 'vetos') && caracteristicaActiva(p, 'vetos')) for (const v of p.vetos || []) add(`p:${p.id}:veto:${v.localId}:${v.franja}`, `${p.nombre} ${textoVeto(v, (localDe(cfg, v.localId) || {}).nombre || v.localId)}`, { tipo: 'persona', pid: p.id, k: 'vetos' });
    if (regla(cfg, 'nuncaCon') && caracteristicaActiva(p, 'nuncaCon')) for (const q of p.nuncaCon || []) { const key = [p.id, q].sort().join('|'); if (vistos.has(key)) continue; vistos.add(key); add(`p:${p.id}:nuncaCon:${q}`, `${p.nombre} y ${nom(q)} no coinciden`, { tipo: 'persona', pid: p.id, k: 'nuncaCon', otro: q }); }
    if (regla(cfg, 'cubreA') && caracteristicaActiva(p, 'cubreA')) for (const c of p.cubreA || []) add(`p:${p.id}:cubre:${c.pid}:${c.dow || ''}`, `${p.nombre} cubre a ${nom(c.pid)}${c.dow ? ' ' + DOW_PL[c.dow] : ''}${c.turnoId ? ' en ' + (localDe(cfg, partirTurno(c.turnoId).localId) || {}).nombre + ' por la ' + FRANJA_LBL[partirTurno(c.turnoId).franja].toLowerCase() : ''}`, { tipo: 'persona', pid: p.id, k: 'cubreA', informativa: true });
    if (regla(cfg, 'cocina') && caracteristicaActiva(p, 'cocina') && p.cocina) {
      if (p.cocina.nunca) add(`p:${p.id}:cocina`, `${p.nombre} nunca está en cocina`, { tipo: 'persona', pid: p.id, k: 'cocina' });
      else if ((p.cocina.soloDias || []).length) add(`p:${p.id}:cocina`, `${p.nombre} lleva la cocina solo ${p.cocina.soloDias.map(d => DOW_PL[d]).join(' y ')}`, { tipo: 'persona', pid: p.id, k: 'cocina' });
    }
    if (regla(cfg, 'abre') && caracteristicaActiva(p, 'abre')) for (const [lid, fs] of Object.entries(p.abre || {})) for (const f of fs) add(`p:${p.id}:abre:${lid}:${f}`, `${p.nombre} sale ${/a$/.test(p.nombre.split(' ')[0]) ? 'la primera' : 'el primero'} en ${(localDe(cfg, lid) || {}).nombre || lid} por la ${FRANJA_LBL[f].toLowerCase()}`, { tipo: 'persona', pid: p.id, k: 'abre', localId: lid, franja: f });
    if (caracteristicaActiva(p, 'noAbre')) for (const lid of p.noAbre || []) add(`p:${p.id}:noAbre:${lid}`, `${p.nombre} no abre ${(localDe(cfg, lid) || {}).nombre || lid}`, { tipo: 'persona', pid: p.id, k: 'noAbre', localId: lid });
    if (regla(cfg, 'noPrimero') && caracteristicaActiva(p, 'noPrimero') && (p.noPrimero || []).length) add(`p:${p.id}:noPrimero`, `${p.nombre} no sale nunca ${p.noPrimero.length === 2 ? 'el primero, ni de mañana ni de tarde' : p.noPrimero[0] === 'T' ? 'el primero de la tarde (no hace la tarde completa)' : 'el primero de la mañana'}`, { tipo: 'persona', pid: p.id, k: 'noPrimero', nueva: true });
  }
  if (regla(cfg, 'primeroCompleto')) add('reg:primeroCompleto', 'El primero de cada franja hace turno completo: quien ha trabajado la mañana no abre la tarde y los partidos entran a partir del segundo puesto (si sale primero en mañana y tarde del mismo local es turno continuo)', { tipo: 'regla', k: 'primeroCompleto', nueva: true });
  for (const l of cfg.locales) for (const f of FRANJAS) if (l.partidoAbre && l.partidoAbre[f]) add(`loc:${l.id}:partidoAbre:${f}`, `En ${l.nombre}, quien hace partido puede abrir la ${FRANJA_LBL[f].toLowerCase()}: no hace falta una cobertura entera (acordado con el grupo el 15/09)`, { tipo: 'regla', k: 'partidoAbre', localId: l.id, franja: f, nueva: true });
  return out;
}
function verificarSemana(cfg, staff, est, lunes) {
  const dias = []; for (let k = 0; k < 7; k++) dias.push(addDias(lunes, k));
  const conds = condicionesDe(cfg, staff);
  const dl = iso => `${DOW_LBL[isoDow(iso)]} ${+iso.slice(8, 10)}`;
  const slotsCache = {};
  const slots = (iso, tid) => slotsCache[iso + tid] || (slotsCache[iso + tid] = posicionesDe(cfg, staff, est, iso, tid));
  for (const c of conds) {
    const v = [];
    if (c.tipo === 'minimos') for (const iso of dias) { const tid = turnoId(c.localId, c.franja); if (!turnoAbierto(cfg, est, iso, tid)) continue; const r = revisarTurno(cfg, staff, est, iso, tid); if (r.faltan) v.push(`${dl(iso)}: ${r.n} de ${r.minimo}`); }
    else if (c.tipo === 'cocina') for (const iso of dias) for (const f of FRANJAS) {
      const tid = turnoId(c.localId, f), l = localDe(cfg, c.localId);
      if (!turnoAbierto(cfg, est, iso, tid) || !localTieneCocina(l, f)) continue;
      const r = revisarTurno(cfg, staff, est, iso, tid);
      if (r.sinCocina) { if (r.cocinaObligatoria || r.n) v.push(`${dl(iso)} ${FRANJA_LBL[f].toLowerCase()}: sin cocina`); continue; }
      if (r.cocinaNoApta) v.push(`${dl(iso)} ${FRANJA_LBL[f].toLowerCase()}: la cocina no es de este local`);
      const sl = slots(iso, tid); const coc = sl.find(x => x.cocina);
      if (coc && !coc.abre) { let pos = (l.cocina.posicion && l.cocina.posicion[f]) || 2; const desde = l.cocina.posicionSiDesde && l.cocina.posicionSiDesde[f]; if (desde && sl.filter(x => !x.hueco).length < desde) pos = Math.min(pos, 2); if (coc.pos !== Math.min(pos, sl.length)) v.push(`${dl(iso)} ${FRANJA_LBL[f].toLowerCase()}: cocina en ${coc.pos}.ª`); }
    }
    else if (c.tipo === 'persona') {
      const p = personaDe(staff, c.pid);
      for (const iso of dias) {
        const dow = isoDow(iso);
        const mis = turnosDe(cfg).filter(t => pidsEn(est, iso, t.id).includes(c.pid));
        if (c.k === 'locales') for (const t of mis) if (!p.locales.includes(t.local.id)) v.push(`${dl(iso)}: en ${t.local.nombre}`);
        if (c.k === 'franjas') for (const t of mis) if (!p.franjas.includes(t.franja)) v.push(`${dl(iso)}: ${FRANJA_LBL[t.franja].toLowerCase()}`);
        if (c.k === 'libra' && mis.length && p.libra.includes(dow)) v.push(`${dl(iso)}: trabaja`);
        if (c.k === 'partido' && mis.some(t => t.franja === 'M') && mis.some(t => t.franja === 'T') && !(p.partido.siempre || p.partido.dias.includes(dow))) v.push(`${dl(iso)}: partido no declarado`);
        if (c.k === 'vetos') for (const t of mis) if (vetoDe(p, t.local.id, t.franja, dow)) v.push(`${dl(iso)}: ${t.local.nombre} ${FRANJA_LBL[t.franja].toLowerCase()}`);
        if (c.k === 'nuncaCon') for (const t of mis) if (pidsEn(est, iso, t.id).includes(c.otro)) v.push(`${dl(iso)}: juntos en ${t.local.nombre}`);
        if (c.k === 'cocina') for (const t of mis) { const e = asignados(est, iso, t.id).find(x => x.pid === c.pid); if (e && e.cocina && !puedeCocina(cfg, p, t.local.id, iso)) v.push(`${dl(iso)}: lleva la cocina en ${t.local.nombre}`); }
        if (c.k === 'abre') { const tid = turnoId(c.localId, c.franja); if (pidsEn(est, iso, tid).includes(c.pid)) { const s = slots(iso, tid).find(x => x.pid === c.pid); if (s && s.pos !== 1) v.push(`${dl(iso)}: sale ${s.pos}.º`); } }
        if (c.k === 'noAbre') { const t = mis.find(x => x.local.id === c.localId); if (t) { const s = slots(iso, t.id).find(x => x.pid === c.pid); if (s && s.pos === 1) v.push(`${dl(iso)}: abre ${t.local.nombre}`); } }
        if (c.k === 'noPrimero') for (const t of mis) { if (!p.noPrimero.includes(t.franja)) continue; const s = slots(iso, t.id).find(x => x.pid === c.pid); if (s && s.pos === 1) v.push(`${dl(iso)}: primero en ${t.local.nombre} ${FRANJA_LBL[t.franja].toLowerCase()}`); }
      }
    }
    else if (c.tipo === 'regla' && c.k === 'primeroCompleto') for (const iso of dias) for (const t of turnosDe(cfg)) {
      if (t.franja !== 'T' || !turnoAbierto(cfg, est, iso, t.id)) continue;
      const s = slots(iso, t.id)[0]; if (!s || s.hueco) continue;
      const enM = turnosDe(cfg).some(x => x.franja === 'M' && pidsEn(est, iso, x.id).includes(s.pid));
      if (enM && !s.continuo && !puedePrimero(cfg, staff, est, iso, t.id, s.pid).ok) v.push(`${dl(iso)}: ${s.nombre} abre ${t.local.nombre} viniendo de la mañana`);
    }
    c.ok = !v.length; c.detalle = v.join(' · ');
  }
  return conds;
}
// Genera (o completa) la semana del lunes dado con la semana tipo y las fichas, y devuelve
// la planilla lista para enseñar e imprimir como el prototipo: posiciones por casilla,
// huecos disponibles con motivo, qué ha cambiado, quién libra y las condiciones comprobadas.
function generarSemana(cfg, staff, est, lunes, opts) {
  const o = opts || {};
  const target = o.simular ? clonarEstado(est) : est;
  const dias = []; for (let k = 0; k < 7; k++) dias.push(addDias(lunes, k));
  const foto = e => { const m = {}; for (const iso of dias) for (const t of turnosDe(cfg)) m[iso + '|' + t.id] = pidsEn(e, iso, t.id).slice(); return m; };
  const antes = foto(target);
  const g = generarPlanilla(cfg, staff, target, lunes, dias[6], { desdeIso: o.desdeIso, permitirPartido: !!o.permitirPartido, sinPatron: !!o.sinPatron });
  const despues = foto(target);
  const cambios = [];
  for (const k of Object.keys(despues)) { const [iso, tid] = k.split('|'); if (JSON.stringify(antes[k]) !== JSON.stringify(despues[k])) cambios.push({ iso, turnoId: tid, antes: antes[k], despues: despues[k] }); }
  const cambiado = new Set(cambios.map(c => c.iso + '|' + c.turnoId));
  const locales = cfg.locales.map(l => ({
    id: l.id, nombre: l.nombre, corto: l.corto, color: l.color, cocina: descripcionCocina(cfg, l),
    franjas: FRANJAS.map(f => ({ franja: f, dias: dias.map(iso => {
      const tid = turnoId(l.id, f);
      if (!turnoAbierto(cfg, target, iso, tid)) return { iso, tid, abierto: false };
      const r = revisarTurno(cfg, staff, target, iso, tid);
      return { iso, tid, abierto: true, n: r.n, min: r.minimo, supuesto: r.supuesto, refuerzo: r.refuerzo, faltan: r.faltan, cambiado: cambiado.has(iso + '|' + tid), slots: posicionesDe(cfg, staff, target, iso, tid) };
    }) })),
  }));
  const activosSem = staff.filter(p => !deBaja(p, lunes));
  const libran = {}, diasPorPersona = {};
  for (const iso of dias) {
    const trabajan = new Set();
    for (const t of turnosDe(cfg)) for (const pid of pidsEn(target, iso, t.id)) trabajan.add(pid);
    libran[iso] = activosSem.filter(p => !trabajan.has(p.id) && !ausenciaEn(p, iso) && !p.standby).map(p => p.id);
    for (const pid of trabajan) diasPorPersona[pid] = (diasPorPersona[pid] || 0) + 1;
  }
  const huecos = g.huecos.filter(h => dias.includes(h.iso)).map(h => Object.assign({ pos: null, tipo: 'faltan' }, h));
  const condiciones = verificarSemana(cfg, staff, target, lunes);
  const turnos = dias.reduce((a, iso) => a + turnosDe(cfg).filter(t => turnoAbierto(cfg, target, iso, t.id)).length, 0);
  const plazas = dias.reduce((a, iso) => a + turnosDe(cfg).reduce((b, t) => b + pidsEn(target, iso, t.id).length, 0), 0);
  return { lunes, dias, locales, libran, huecos, cambios, condiciones, aplicados: g.aplicados.length, rechazados: g.rechazados,
    resumen: { turnos, plazas, condiciones: condiciones.length, condicionesRotas: condiciones.filter(c => !c.ok).length, huecos: huecos.length, descansos: Object.values(libran).reduce((a, x) => a + x.length, 0), maxDias: Math.max(0, ...Object.values(diasPorPersona)), cambios: cambios.length, deBaja: staff.filter(p => deBaja(p, lunes)).map(p => p.id) },
    estado: target };
}

// ---------- gestor de cobertura: quién cubre a quien falta ----------
// El encargado dice que alguien va a tener baja, vacaciones, día libre, permiso u
// otro motivo (o un cambio de turno) en unos días, y la app propone dos planes para
// cubrir cada turno afectado: el plan A (recomendado) y el plan B (alternativa con
// otras personas, o relajando lo relajable: partidos no declarados, con aviso). Lo que
// nadie puede ocupar sin romper una condición queda como hueco con el porqué. Nada se
// aplica hasta que el encargado elige un plan; aplicar registra la ausencia en la
// ficha, quita a la persona de esos turnos y pone a quien cubre con «por X».
const TIPOS_INCIDENCIA = TIPOS_AUSENCIA.concat([{ id: 'CAMBIO', label: 'Cambio de turno', motivo: 'cambio de turno' }]);
const MAX_DIAS_COBERTURA = 62;
// turnos de la persona entre dos fechas (con cocina, si abre, y cómo queda la casilla sin ella)
function turnosAfectados(cfg, staff, est, pid, desde, hasta, opts) {
  const o = opts || {};
  const out = [];
  let n = 0;
  for (const iso of rangoIso(desde, hasta || desde)) {
    if (++n > MAX_DIAS_COBERTURA) break;
    if (o.dias && o.dias.length && !o.dias.includes(iso)) continue;
    for (const t of turnosDe(cfg)) {
      if (o.franjas && o.franjas.length && !o.franjas.includes(t.franja)) continue;
      if (o.turnos && o.turnos.length && !o.turnos.includes(iso + '|' + t.id)) continue;
      const e = asignados(est, iso, t.id).find(x => x.pid === pid);
      if (!e) continue;
      const rev = revisarTurno(cfg, staff, est, iso, t.id);
      out.push({ iso, tid: t.id, localId: t.localId, franja: t.franja, cocina: !!e.cocina, abre: primeroDe(cfg, staff, est, iso, t.id) === pid, n: rev.n, min: rev.minimo, supuesto: rev.supuesto });
    }
  }
  return out;
}
function turnosSemanaDe(est, pid, iso) {
  const lunes = mondayOf(iso);
  let n = 0;
  for (let k = 0; k < 7; k++) { const d = addDias(lunes, k); for (const lista of Object.values(est.asig[d] || {})) if (lista.some(x => x.pid === pid)) n++; }
  return n;
}
// candidatos para ocupar el sitio de faltaPid en una casilla, ordenados: «cubre a» primero,
// luego comodines y apoyos, quien libra ese día antes que quien haría partido, el local
// habitual, la cocina si hace falta, y menos turnos esa semana. opts: {cocina, primero,
// permitirPartido, evitar:[pids], excluir:[pids]}
// ¿esa persona lleva la cocina en alguna casilla de ese día?
function enCocinaEse(cfg, est, iso, pid) {
  for (const t of turnosDe(cfg)) if (asignados(est, iso, t.id).some(x => x.pid === pid && x.cocina)) return true;
  return false;
}
function candidatosCobertura(cfg, staff, est, iso, tid, faltaPid, opts) {
  const o = opts || {};
  const { localId, franja } = partirTurno(tid);
  const l = localDe(cfg, localId);
  const dow = isoDow(iso);
  const falta = personaDe(staff, faltaPid);
  const out = [];
  for (const p of staff) {
    if (p.id === faltaPid || (o.excluir || []).includes(p.id)) continue;
    const r = puedeEstar(cfg, staff, est, iso, tid, p.id, { permitirPartido: !!o.permitirPartido });
    if (!r.ok) continue;
    let score = 50; const razones = [];
    if (o.primero) {
      const pr = puedePrimero(cfg, staff, est, iso, tid, p.id);
      if (!pr.ok) continue;
      if ((l.primero && l.primero[franja] === p.id) || (p.abre && p.abre[localId] && p.abre[localId].includes(franja))) { score += 25; razones.push('sale el primero'); } else razones.push('puede abrir (turno completo)');
    }
    if (o.cocina) { const rc = rangoCocina(cfg, l, p, franja, iso); if (rc < 0) continue; score += 40 - Math.min(rc, 30); razones.push(rc < 100 ? `cocina titular de ${l.nombre}` : 'cocina de reserva'); }
    const cubre = regla(cfg, 'cubreA') && caracteristicaActiva(p, 'cubreA') && falta && (p.cubreA || []).find(c => c.pid === faltaPid && (!c.dow || c.dow === dow) && (!c.turnoId || c.turnoId === tid));
    if (cubre) { score += 60; razones.push(`cubre a ${falta.nombre}`); }
    if (esComodin(p)) { score += 30; razones.push('sin local fijo'); }
    else if (p.puesto === 'apoyo') { score += 15; razones.push('apoyo'); }
    if ((p.locales || []).length && p.locales[0] === localId) { score += 10; razones.push(`su local habitual es ${l.nombre}`); }
    const trabajaHoy = turnosDe(cfg).some(t => pidsEn(est, iso, t.id).includes(p.id));
    if (!trabajaHoy) { score += 20; razones.push('libre ese día'); } else razones.push('ya trabaja ese día (partido)');
    const ns = turnosSemanaDe(est, p.id, iso);
    score -= 4 * ns; razones.push(`${ns} turno${ns === 1 ? '' : 's'} esa semana`);
    if (p.prefs && (p.prefs.evitaDows || []).includes(dow)) { score -= 40; razones.push(`prefiere no trabajar ${DOW_PL[dow]}`); }
    if (r.avisos.length) { score -= 25; razones.push(...r.avisos); }
    if ((o.evitar || []).includes(p.id)) score -= 1000;   // alternativa: otra persona si la hay
    out.push({ pid: p.id, nombre: p.nombre, score, razones, avisos: r.avisos, libre: !trabajaHoy, turnosSemana: ns, cubre: !!cubre });
  }
  out.sort((a, b) => b.score - a.score || a.turnosSemana - b.turnosSemana || (a.pid < b.pid ? -1 : 1));
  return out;
}
// un plan: sobre una copia, quita a la persona de sus turnos y va cubriendo cada uno
// (primero los que menos candidatos tienen); estrategia = {permitirPartido, evitarDe: planBase}
function planCobertura(cfg, staff, est, inc, afectados, estrategia, opts) {
  const o = opts || {};
  const e = clonarEstado(est);
  const staffSim = inc.tipo === 'CAMBIO' ? staff : staff.map(p => p.id === inc.pid ? Object.assign({}, p, { ausencias: (p.ausencias || []).concat([{ tipo: inc.tipo, desde: inc.desde, hasta: inc.sinFin ? undefined : (inc.hasta || inc.desde) }]) }) : p);
  for (const a of afectados) desasignar(e, a.iso, a.tid, inc.pid);
  const plan = { id: null, titulo: '', estrategia: estrategia.permitirPartido ? 'con avisos: partidos no declarados' : 'con las reglas del grupo', relajado: !!estrategia.permitirPartido, asignaciones: [], huecos: [], sinCubrir: [], estado: e };
  const evitarEn = (iso, tid) => estrategia.evitarDe ? estrategia.evitarDe.asignaciones.filter(x => x.iso === iso && x.tid === tid).map(x => x.pid) : [];
  const sinLaPersona = pq => { const nombre = nombreDe(staff, inc.pid); for (const k of Object.keys(pq)) { pq[k] = pq[k].filter(n => n !== nombre); if (!pq[k].length) delete pq[k]; } return pq; };
  const nCand = a => candidatosCobertura(cfg, staffSim, e, a.iso, a.tid, inc.pid, { permitirPartido: !!estrategia.permitirPartido }).length;
  const orden = afectados.map(a => ({ a, n: nCand(a) })).sort((x, y) => x.n - y.n || (x.a.iso < y.a.iso ? -1 : x.a.iso > y.a.iso ? 1 : 0));
  const pon = (a, c, extra) => {
    const r = asignar(e, cfg, staffSim, a.iso, a.tid, c.pid, Object.assign({ origen: 'cobertura', razon: `cubre a ${nombreDe(staff, inc.pid)}`, por: inc.pid, permitirPartido: !!estrategia.permitirPartido }, extra || {}));
    if (!r.ok) return false;
    plan.asignaciones.push({ iso: a.iso, tid: a.tid, localId: a.localId, franja: a.franja, pid: c.pid, nombre: c.nombre, razones: c.razones, avisos: c.avisos, cocina: !!(extra && extra.cocina), abre: primeroDe(cfg, staffSim, e, a.iso, a.tid) === c.pid, libre: c.libre, score: c.score });
    return true;
  };
  for (const { a } of orden) {
    const { localId, franja } = partirTurno(a.tid);
    const l = localDe(cfg, localId);
    let rev = revisarTurno(cfg, staffSim, e, a.iso, a.tid);
    const necesitaCocina = rev.sinCocina && (rev.cocinaObligatoria || a.cocina || rev.faltan > 0) && l && localTieneCocina(l, franja);
    const necesario = rev.faltan > 0 || necesitaCocina || rev.sinAbre;
    if (!necesario && !o.siempre) { plan.sinCubrir.push({ iso: a.iso, tid: a.tid, localId, franja, n: rev.n, min: rev.minimo, motivo: `la casilla sigue completa (${rev.n} de ${rev.minimo})` }); continue; }
    const base = { permitirPartido: !!estrategia.permitirPartido, evitar: evitarEn(a.iso, a.tid) };
    if (necesitaCocina) {
      const c = candidatosCobertura(cfg, staffSim, e, a.iso, a.tid, inc.pid, Object.assign({ cocina: true }, base))[0];
      if (c) pon(a, c, { cocina: true });
      rev = revisarTurno(cfg, staffSim, e, a.iso, a.tid);
    }
    let vueltas = 0;
    while ((rev.faltan > 0 || (o.siempre && !plan.asignaciones.some(x => x.iso === a.iso && x.tid === a.tid))) && vueltas++ < 6) {
      const c = candidatosCobertura(cfg, staffSim, e, a.iso, a.tid, inc.pid, Object.assign({ primero: rev.sinAbre }, base))[0] || (rev.sinAbre ? candidatosCobertura(cfg, staffSim, e, a.iso, a.tid, inc.pid, base)[0] : null);
      if (!c || !pon(a, c)) break;
      rev = revisarTurno(cfg, staffSim, e, a.iso, a.tid);
    }
    if (rev.faltan > 0) plan.huecos.push({ iso: a.iso, tid: a.tid, localId, franja, tipo: 'faltan', faltan: rev.faltan, minimo: rev.minimo, supuesto: rev.supuesto, motivo: `faltan ${rev.faltan} de ${rev.minimo}`, porQueNadie: sinLaPersona(porQueNadie(cfg, staffSim, e, a.iso, a.tid)) });
    if (rev.sinCocina && necesitaCocina) plan.huecos.push({ iso: a.iso, tid: a.tid, localId, franja, tipo: 'cocina', motivo: 'sin cocina', porQueNadie: sinLaPersona(porQueNadie(cfg, staffSim, e, a.iso, a.tid)) });
    if (rev.sinAbre) {
      const c = candidatosCobertura(cfg, staffSim, e, a.iso, a.tid, inc.pid, Object.assign({ primero: true }, base))[0];
      if (!(c && pon(a, c))) plan.huecos.push({ iso: a.iso, tid: a.tid, localId, franja, tipo: 'primero', pos: 1, motivo: motivoSinPrimero(cfg, staffSim, e, a.iso, a.tid), porQueNadie: sinLaPersona(porQueNadiePrimero(cfg, staffSim, e, a.iso, a.tid)) });
    }
  }
  // cambio de turno: quien cubre puede ceder a cambio uno de sus turnos cercanos a la persona
  if (inc.tipo === 'CAMBIO' && o.intercambio !== false) {
    const usados = new Set();
    for (const as of plan.asignaciones) {
      const x = intercambioPara(cfg, staff, e, inc.pid, as, afectados, usados);
      if (x) { as.intercambio = x; usados.add(x.iso + '|' + x.tid); }
    }
  }
  plan.completo = !plan.huecos.length;
  plan.avisos = plan.asignaciones.reduce((a, x) => a + x.avisos.length, 0);
  plan.score = plan.asignaciones.reduce((a, x) => a + x.score, 0);
  plan.personas = [...new Set(plan.asignaciones.map(x => x.pid))];
  plan.resumen = { cubiertos: plan.asignaciones.length, huecos: plan.huecos.length, avisos: plan.avisos, sinCubrir: plan.sinCubrir.length, personas: plan.personas.length };
  plan.firma = plan.asignaciones.map(x => `${x.iso}|${x.tid}|${x.pid}|${x.intercambio ? x.intercambio.iso + x.intercambio.tid : ''}`).sort().join(';');
  return plan;
}
// turno de quien cubre que la persona podría hacer a cambio: la misma semana o la
// siguiente, el mismo local y franja si puede ser, el más cercano; sin romper reglas
function intercambioPara(cfg, staff, e, pid, as, afectados, usados) {
  const lunes = mondayOf(as.iso);
  const p = personaDe(staff, pid);
  const cands = [];
  for (let k = -7; k < 14; k++) {
    const iso = addDias(lunes, k);
    if (afectados.some(a => a.iso === iso) || ausenciaEn(p, iso)) continue;
    for (const t of turnosDe(cfg)) {
      if (!pidsEn(e, iso, t.id).includes(as.pid) || usados.has(iso + '|' + t.id)) continue;
      const sim = clonarEstado(e); desasignar(sim, iso, t.id, as.pid);
      const r = puedeEstar(cfg, staff, sim, iso, t.id, pid);
      if (!r.ok || r.avisos.length) continue;
      const dist = Math.abs(Math.round((fechaLocal(iso) - fechaLocal(as.iso)) / 864e5));
      cands.push({ iso, tid: t.id, localId: t.localId, franja: t.franja, quita: as.pid, puntos: (t.localId === as.localId ? 20 : 0) + (t.franja === as.franja ? 10 : 0) - dist });
    }
  }
  cands.sort((a, b) => b.puntos - a.puntos || (a.iso < b.iso ? -1 : 1));
  return cands[0] || null;
}
// planes para una incidencia: inc = {pid, tipo, desde, hasta, sinFin?, franjas?, turnos?, detalle?};
// opts = {siempre (reemplazar aunque la casilla siga completa), intercambio}
// inc.dias = días sueltos (la ausencia se registra por tramos contiguos); si no, desde..hasta
function rangoDeIncidencia(inc) {
  const dias = Array.isArray(inc.dias) && inc.dias.length ? inc.dias.slice().sort() : null;
  const desde = dias ? dias[0] : inc.desde, hasta = dias ? dias[dias.length - 1] : (inc.hasta || inc.desde);
  return { desde, hasta: hasta < desde ? desde : hasta, dias };
}
function planesCobertura(cfg, staff, est, inc, opts) {
  const o = opts || {};
  const p = personaDe(staff, inc.pid);
  const { desde, hasta, dias } = rangoDeIncidencia(inc);
  inc = Object.assign({}, inc, { desde, hasta });
  const afectados = p ? turnosAfectados(cfg, staff, est, inc.pid, desde, hasta, { franjas: inc.franjas, turnos: inc.turnos, dias }) : [];
  const out = { pid: inc.pid, nombre: p ? p.nombre : inc.pid, tipo: inc.tipo, desde, hasta, dias, afectados: [], planes: [], posible: true, necesarios: 0 };
  if (!p) return Object.assign(out, { posible: false, error: 'no existe' });
  // qué le pasa a cada casilla sin la persona
  const sin = clonarEstado(est);
  for (const a of afectados) desasignar(sin, a.iso, a.tid, inc.pid);
  for (const a of afectados) {
    const rev = revisarTurno(cfg, staff, sin, a.iso, a.tid);
    const l = localDe(cfg, a.localId);
    const necesitaCocina = rev.sinCocina && (rev.cocinaObligatoria || a.cocina || rev.faltan > 0) && l && localTieneCocina(l, a.franja);
    out.afectados.push(Object.assign({}, a, { quedan: rev.n, faltan: rev.faltan, sinCocina: !!necesitaCocina, sinAbre: rev.sinAbre, necesario: rev.faltan > 0 || !!necesitaCocina || rev.sinAbre }));
  }
  out.necesarios = out.afectados.filter(a => a.necesario).length;
  if (!afectados.length) return out;
  const A0 = planCobertura(cfg, staff, est, inc, afectados, { permitirPartido: false }, o);
  const B0 = planCobertura(cfg, staff, est, inc, afectados, { permitirPartido: false, evitarDe: A0 }, o);
  const A1 = planCobertura(cfg, staff, est, inc, afectados, { permitirPartido: true }, o);
  const B1 = planCobertura(cfg, staff, est, inc, afectados, { permitirPartido: true, evitarDe: A1 }, o);
  const vistos = new Set(); const planes = [];
  for (const pl of [A0, B0, A1, B1]) { if (vistos.has(pl.firma)) continue; vistos.add(pl.firma); planes.push(pl); }
  planes.sort((x, y) => x.huecos.length - y.huecos.length || x.avisos - y.avisos || y.score - x.score);
  out.planes = planes.slice(0, 2).map((pl, i) => Object.assign(pl, { id: i ? 'B' : 'A', titulo: i ? 'Plan B · alternativa' : 'Plan A · recomendado' }));
  if (out.planes[1]) out.planes[1].distinto = out.planes[1].asignaciones.filter(x => !out.planes[0].asignaciones.some(y => y.iso === x.iso && y.tid === x.tid && y.pid === x.pid)).length;
  out.posible = out.planes.some(pl => pl.completo);
  return out;
}
// aplica un plan sobre el estado real: ausencia en la ficha (salvo cambio de turno),
// la persona sale de sus turnos, entran quienes cubren (con «por») y los intercambios
function aplicarCobertura(cfg, staff, est, inc, plan) {
  const p = personaDe(staff, inc.pid);
  const res = { ausencia: null, quitados: 0, asignados: [], rechazados: [], intercambios: [] };
  if (!p) return res;
  const { desde, hasta, dias } = rangoDeIncidencia(inc);
  if (inc.tipo !== 'CAMBIO') {
    // tramos contiguos: con días sueltos, una ausencia por tramo; con baja sin fin, abierta desde el primero
    const tramos = [];
    for (const iso of dias || [...rangoIso(desde, hasta)]) { const u = tramos[tramos.length - 1]; if (u && addDias(u.hasta, 1) === iso) u.hasta = iso; else tramos.push({ desde: iso, hasta: iso }); }
    for (const tr of tramos) {
      const a = { tipo: inc.tipo, desde: tr.desde };
      if (!(inc.sinFin && tr === tramos[tramos.length - 1])) a.hasta = tr.hasta;
      if (inc.detalle) a.detalle = inc.detalle;
      res.ausencia = anadirAusencia(p, a).ausencia;
    }
  }
  for (const a of turnosAfectados(cfg, staff, est, inc.pid, desde, hasta, { franjas: inc.franjas, turnos: inc.turnos, dias })) if (desasignar(est, a.iso, a.tid, inc.pid)) res.quitados++;
  for (const as of (plan && plan.asignaciones) || []) {
    const r = asignar(est, cfg, staff, as.iso, as.tid, as.pid, { origen: 'cobertura', razon: `cubre a ${p.nombre}`, por: inc.pid, cocina: as.cocina ? true : undefined, permitirPartido: true });
    if (r.ok) res.asignados.push({ iso: as.iso, tid: as.tid, pid: as.pid, avisos: r.avisos }); else { res.rechazados.push({ iso: as.iso, tid: as.tid, pid: as.pid, motivo: r.motivo }); continue; }
    if (as.intercambio && inc.tipo === 'CAMBIO') {
      const x = as.intercambio;
      if (desasignar(est, x.iso, x.tid, as.pid)) {
        const r2 = asignar(est, cfg, staff, x.iso, x.tid, inc.pid, { origen: 'cobertura', razon: `cambio con ${nombreDe(staff, as.pid)}`, permitirPartido: true });
        if (r2.ok) res.intercambios.push({ iso: x.iso, tid: x.tid, pid: inc.pid, quita: as.pid });
        else { asignar(est, cfg, staff, x.iso, x.tid, as.pid, { origen: 'manual' }); res.rechazados.push({ iso: x.iso, tid: x.tid, pid: inc.pid, motivo: r2.motivo }); }
      }
    }
  }
  return res;
}
// vacía la planilla entre dos fechas: todas las plazas y marcas a mano; las ausencias
// (bajas, vacaciones…) viven en las fichas y se respetan, igual que aperturas y eventos
function vaciarPlanilla(est, desde, hasta) {
  const r = { plazas: 0, dias: 0 };
  for (const iso of rangoIso(desde, hasta || desde)) {
    const porT = est.asig[iso];
    if (porT) { for (const lista of Object.values(porT)) r.plazas += lista.length; if (r.plazas) r.dias++; delete est.asig[iso]; }
    if (est.manual && est.manual[iso]) delete est.manual[iso];
  }
  return r;
}

// ---------- horas ----------
function hm(s) { const [h, m] = String(s || '0:0').split(':').map(Number); return h * 60 + (m || 0); }
function hhmm(min) { const t = ((min % 1440) + 1440) % 1440; return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; }
// El tramo del turno partido de esa franja. Un partido son ocho horas repartidas entre
// las dos franjas: entre semana 5 y 3, el fin de semana 4 y 4 (cliente, 16/09), editable
// por local y por día. Quien hace partido entra a mediodía y se va a la hora de cerrar la
// noche, así que cada tramo va pegado al final de su franja. Con una excepción: quien
// ABRE una franja entra a la hora de apertura, y ese es su tramo largo de los dos.
function tramoPartidoDe(l, dow, franja, abre) {
  const hp = l && l.horarioPartido;
  if (!hp) return null;
  const base = (hp.porDow && hp.porDow[dow]) || hp;
  const mio = base[franja], otro = base[franja === 'M' ? 'T' : 'M'];
  if (!mio || !mio.ini || !mio.fin) return null;
  let dur = minutosEntre(mio.ini, mio.fin);
  if (abre === 'M' || abre === 'T') {
    const otroDur = otro && otro.ini && otro.fin ? minutosEntre(otro.ini, otro.fin) : dur;
    dur = abre === franja ? Math.max(dur, otroDur) : Math.min(dur, otroDur);
  }
  if (abre === franja) {
    const ap = horarioDe(l, dow, franja);
    if (!ap) return null;
    return { ini: ap.ini, fin: hhmm(hm(ap.ini) + dur) };
  }
  return { ini: hhmm(hm(mio.fin) - dur), fin: mio.fin };
}
// partido=true devuelve el tramo del turno partido de ese local (mediodía / noche), que
// es lo que hace de verdad quien trabaja las dos franjas del mismo día; abre es la franja
// que esa persona abre ese día, si abre alguna.
function horarioDe(l, dow, franja, partido, abre) {
  const h = l && l.horario;
  if (!h) return null;
  if (partido) { const hp = tramoPartidoDe(l, dow, franja, abre); if (hp) return hp; }
  const ex = h.porDow && h.porDow[dow] && h.porDow[dow][franja];
  return ex || h[franja] || null;
}
function minutosEntre(ini, fin) { let d = hm(fin) - hm(ini); if (d <= 0) d += 1440; return d; }
// Lo que cuenta un turno para las horas: el horario puesto a mano en la casilla manda;
// después, el tramo del partido; después, la duración fijada del turno (ocho horas);
// y si no hay ninguna, lo que el local esté abierto menos el descanso.
function minutosTurno(l, dow, franja, override, partido, abre) {
  if (override && override.ini && override.fin) return Math.max(0, minutosEntre(override.ini, override.fin) - (+(l && l.descansoMin) || 0));
  if (!partido) { const d = l && l.duracion && +l.duracion[franja]; if (d > 0) return d; }
  const h = horarioDe(l, dow, franja, partido, abre);
  if (!h) return 0;
  return Math.max(0, minutosEntre(h.ini, h.fin) - (+(l && l.descansoMin) || 0));
}
// minutos entre las 22:00 y las 06:00 del tramo (tarde que cruza la medianoche)
function minutosNocturnos(l, dow, franja, override, partido, abre) {
  const h = override && override.ini && override.fin ? override : horarioDe(l, dow, franja, partido, abre);
  if (!h) return 0;
  const a = hm(h.ini); let b = hm(h.fin); if (b <= a) b += 1440;
  let n = 0;
  for (const [x, y] of [[22 * 60, 30 * 60], [0, 6 * 60], [46 * 60, 54 * 60]]) n += Math.max(0, Math.min(b, y) - Math.max(a, x));
  return n;
}
// Cómo cuenta el día de una persona: partido si trabaja las dos franjas; continuo si
// además abre las dos del mismo local (un turno seguido, no dos); y la franja que abre,
// que es la que fija su tramo del partido (entra a abrir y hace el tramo largo).
function repartoDelDia(mias) {
  const partido = mias.some(x => x.franja === 'M') && mias.some(x => x.franja === 'T');
  const abren = mias.filter(x => x.e.abre);
  const continuo = partido && abren.length === 2 && abren[0].localId === abren[1].localId ? abren[0].localId : null;
  const fr = [...new Set(abren.map(x => x.franja))];
  return { partido, continuo, abre: partido && !continuo && fr.length === 1 ? fr[0] : null };
}
// lo mismo para las vistas, que parten de la persona y el día en vez de la planilla del mes
function turnoDelDia(cfg, est, iso, pid) {
  const mias = [];
  for (const t of turnosDe(cfg)) { const e = asignados(est, iso, t.id).find(x => x.pid === pid); if (e) mias.push({ e, localId: t.local.id, franja: t.franja }); }
  return repartoDelDia(mias);
}
// Días de un tipo de ausencia en un mes, con las fechas (José, 17/09: «que dándole a un
// botón vea los cinco días que se ha ido para ponérselo en su nómina»).
function diasAusenciaMes(p, y, m, tipo) {
  const out = [];
  const n = diasDelMes(y, m);
  for (let d = 1; d <= n; d++) {
    const iso = isoDe(y, m, d), a = ausenciaEn(p, iso);
    if (a && (!tipo || a.tipo === tipo)) out.push(iso);
  }
  return out;
}
// Las vacaciones de toda la plantilla en un año, mes a mes, para pasarlas a nómina
function vacacionesAno(staff, y, tipo) {
  const t = tipo || 'VAC';
  return (staff || []).map(p => {
    const meses = [];
    let total = 0;
    for (let m = 1; m <= 12; m++) { const d = diasAusenciaMes(p, y, m, t); meses.push(d); total += d.length; }
    return { pid: p.id, nombre: p.nombre, meses, total, fechas: meses.flat() };
  }).filter(x => x.total > 0).sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre, 'es'));
}
function horasPersonaMes(cfg, staff, meses, pid, y, m) {
  const p = personaDe(staff, pid);
  const k = claveMes(y, m);
  const asig = (meses && meses[k] && meses[k].asig) || {};
  const out = { pid, nombre: p ? p.nombre : pid, mananas: 0, tardes: 0, partidos: 0, continuos: 0, dias: 0, turnos: 0, minutos: 0, nocturnosMin: 0, festivas: 0, domingos: 0, festivasMin: 0, domingosMin: 0, extrasMin: 0, ausencias: 0, porLocal: {}, contratoHoras: null, saldo: null, refuerzos: 0, forzados: 0 };
  const n = diasDelMes(y, m);
  for (let d = 1; d <= n; d++) {
    const iso = isoDe(y, m, d), dow = isoDow(iso);
    const festivo = (cfg.festivos || []).includes(iso);
    // primero se mira todo el día: si trabaja en las dos franjas es partido, y entonces
    // cuentan los tramos del partido (ocho horas repartidas entre las dos franjas)
    const mias = [];
    for (const [tid, lista] of Object.entries(asig[iso] || {})) {
      const e = lista.find(x => x.pid === pid); if (!e) continue;
      mias.push(Object.assign({ e }, partirTurno(tid)));
    }
    // turno continuo: abre la mañana Y la tarde del mismo local. Es UN turno seguido, no
    // dos: se cuenta una sola vez (con la tarde, que es la que acaba al cierre).
    const { partido, continuo, abre: abreF } = repartoDelDia(mias);
    if (continuo) out.continuos++;
    const enPartido = partido && !continuo;
    let minDia = 0;
    for (const { e, localId, franja } of mias) {
      const l = localDe(cfg, localId);
      const seguido = continuo === localId && franja === 'M';   // la mañana del continuo ya va en la tarde
      const min = seguido ? 0 : minutosTurno(l, dow, franja, e, enPartido, abreF);
      out.turnos++; out.minutos += min; minDia += min;
      if (!seguido) out.nocturnosMin += minutosNocturnos(l, dow, franja, e, enPartido, abreF);
      if (franja === 'M') out.mananas++; else out.tardes++;
      const pl = out.porLocal[localId] = out.porLocal[localId] || { turnos: 0, minutos: 0, horas: 0 };
      pl.turnos++; pl.minutos += min; pl.horas = Math.round(pl.minutos / 6) / 10;
      if (e.origen === 'refuerzo') out.refuerzos++;
      if (e.forzado) out.forzados++;
    }
    if (mias.length) { out.dias++; if (partido) out.partidos++; if (festivo) { out.festivas++; out.festivasMin += minDia; } if (dow === 7) { out.domingos++; out.domingosMin += minDia; } }
    else if (p && ausenciaEn(p, iso)) out.ausencias++;
  }
  if (p) {
    out.vacacionesDias = diasAusenciaMes(p, y, m, 'VAC');
    out.vacaciones = out.vacacionesDias.length;
    out.libresDias = diasAusenciaMes(p, y, m, 'LD');
    out.libres = out.libresDias.length;
    out.bajaDias = diasAusenciaMes(p, y, m, 'BAJ').length;
  } else { out.vacacionesDias = []; out.vacaciones = 0; out.libresDias = []; out.libres = 0; out.bajaDias = 0; }
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
      const vet = (p.vetos || []).filter(v => v.franja === x.franja && (dowsVeto(v) === null || dowsVeto(v).includes(x.dow))).map(v => v.localId);
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
  // horarios que confirmó la encargada por WhatsApp (15/09): la mañana desde que abren
  // las cafeterías, a las 7 (los fines de semana a las 8) y hasta las 16; la tarde de las
  // 16 hasta que cierra el local, «a lo mejor sobre las 00, aunque depende» (cierreAprox).
  const horario = () => ({ M: { ini: '07:00', fin: '16:00' }, T: { ini: '16:00', fin: '00:00' }, porDow: { 6: { M: { ini: '08:00', fin: '16:00' } }, 7: { M: { ini: '08:00', fin: '16:00' } } } });
  // el partido no son dos turnos enteros: quien lo hace entra a mediodía y vuelve por la
  // noche (Adrián «solo viene como al mediodía»). Los tramos siguen siendo un supuesto.
  // un partido son ocho horas repartidas: entre semana 5 y 3, el fin de semana 4 y 4
  const horarioPartido = () => ({ M: { ini: '11:00', fin: '16:00' }, T: { ini: '21:00', fin: '00:00' }, porDow: { 6: { M: { ini: '12:00', fin: '16:00' }, T: { ini: '20:00', fin: '00:00' } }, 7: { M: { ini: '12:00', fin: '16:00' }, T: { ini: '20:00', fin: '00:00' } } } });
  // «8 horas por turno más o menos» (el cliente, 15/09): el local abre nueve por la
  // mañana, pero cada persona hace ocho. La apertura manda en quién abre y en lo que se
  // imprime; la duración es lo que se cuenta para la nómina.
  const duracion = () => ({ M: 480, T: 480 });
  const locales = [
    { id: 'EL33', nombre: 'El 33', corto: '33', color: '#b8741a', partidoAbre: { M: false, T: true },
      abre: { M: dows.slice(), T: [2, 3, 4, 5, 6] },
      minimos: { M: min([2, 2, 2, 2, 2, 3, 3]), T: min([0, 1, 2, 2, 2, 2, 0]) },
      supuestos: { M: sup([1, 1, 1, 1, 1, 0, 0]), T: sup([0, 1, 1, 1, 1, 1, 0]) },
      cocina: { obligatoria: { M: false, T: false }, titulares: { M: ['jenny', 'noe', 'hojan'], T: ['jenny', 'noe', 'hojan'] }, reservas: ['hojan'], posicion: { M: 2, T: 2 }, posicionSiDesde: {} },
      primero: { M: null, T: null }, horario: horario(), horarioSupuesto: false, cierreAprox: true, horarioPartido: horarioPartido(), horarioPartidoSupuesto: true, duracion: duracion(), duracionSupuesta: true, descansoMin: 0 },
    { id: 'ZAPA', nombre: 'Zapatillera', corto: 'ZAP', color: '#c2378f',
      abre: { M: dows.slice(), T: dows.slice() },
      minimos: { M: min([2, 2, 2, 2, 2, 2, 2]), T: min([2, 2, 2, 2, 4, 4, 2]) },
      supuestos: { M: sup([1, 1, 1, 1, 1, 1, 1]), T: sup([0, 0, 0, 0, 0, 0, 1]) },
      cocina: { obligatoria: { M: false, T: false }, titulares: { M: ['adrian', 'roberto', 'hojan'], T: ['adrian', 'roberto', 'hojan'] }, reservas: ['roberto', 'hojan'], posicion: { M: 3, T: 2 }, posicionSiDesde: { M: 3 } },
      primero: { M: null, T: null }, horario: horario(), horarioSupuesto: false, cierreAprox: true, horarioPartido: horarioPartido(), horarioPartidoSupuesto: true, duracion: duracion(), duracionSupuesta: true, descansoMin: 0 },
    { id: 'MONACO', nombre: 'Bar Mónaco', corto: 'MON', color: '#2f6db5',
      abre: { M: dows.slice(), T: dows.slice() },
      minimos: { M: min([3, 3, 3, 3, 3, 3, 3]), T: min([2, 2, 2, 2, 3, 3, 2]) },
      supuestos: { M: sup([0, 0, 0, 0, 0, 0, 0]), T: sup([0, 0, 0, 0, 0, 0, 1]) },
      cocina: { obligatoria: { M: true, T: true }, titulares: { M: ['esmeralda', 'jenny', 'hojan'], T: ['hojan', 'jenny', 'scapon'] }, reservas: ['hojan'], posicion: { M: 2, T: 2 }, posicionSiDesde: {} },
      primero: { M: null, T: 'scapon' }, horario: horario(), horarioSupuesto: false, cierreAprox: true, horarioPartido: horarioPartido(), horarioPartidoSupuesto: true, duracion: duracion(), duracionSupuesta: true, descansoMin: 0 },
    { id: 'PASARELA', nombre: 'Pasarela', corto: 'PAS', color: '#1f9a6e',
      abre: { M: dows.slice(), T: dows.slice() },
      minimos: { M: min([3, 3, 3, 3, 3, 2, 2]), T: min([2, 2, 2, 2, 3, 3, 2]) },
      supuestos: { M: sup([0, 0, 0, 0, 0, 0, 0]), T: sup([0, 0, 0, 0, 0, 0, 0]) },
      cocina: { obligatoria: { M: false, T: false }, titulares: { M: [], T: [] }, reservas: [], posicion: { M: 2, T: 2 }, posicionSiDesde: {} },
      primero: { M: 'lola', T: 'ivan' }, partidoAbre: { M: false, T: true }, horario: horario(), horarioSupuesto: false, cierreAprox: true, horarioPartido: horarioPartido(), horarioPartidoSupuesto: true, duracion: duracion(), duracionSupuesta: true, descansoMin: 0 },
  ];
  const P = (id, nombre, puesto, locales, franjas, libra, extra) => Object.assign({ id, nombre, puesto, locales, franjas, libra, partido: { dias: [] }, cocina: { titular: [], reserva: [], soloDias: [] }, abre: {}, noAbre: [], nuncaCon: [], cubreA: [], vetos: [], contrato: { horasSemana: null }, ausencias: [], prefs: {}, nota: '', supuestos: [] }, extra || {});
  const staff = [
    P('jacquelin', 'Jacquelin', 'sala', ['ZAPA'], ['M'], [7]),
    P('cris', 'Cris Parreño', 'sala', ['MONACO'], ['M'], [7], { nota: 'Yilian le hace el día libre' }),
    P('esmeralda', 'Esmeralda', 'cocina', ['MONACO'], ['M'], [1], { cocina: { titular: ['MONACO'], reserva: [], soloDias: [] }, nota: 'la sustituye Jenny los lunes' }),
    P('mariluz', 'Mari Luz', 'sala', ['PASARELA'], ['M', 'T'], [3], { partido: { dias: [2, 4, 5, 6] }, vetos: [{ localId: 'PASARELA', franja: 'M', dow: 1 }], nuncaCon: ['lavinia'], nuncaConFlexible: true, nota: 'casi siempre partido; el lunes hace la tarde entera, de 16:00 a cierre, y por eso no puede la mañana (Aroa, 17/09); el domingo hace la mañana' }),
    P('noe', 'Noe', 'sala', ['EL33'], ['M', 'T'], [1], { partido: { dias: [2, 3] }, cocina: { titular: ['EL33'], reserva: [], soloDias: [] }, cubreA: [{ pid: 'jenny', dow: 2 }, { pid: 'victoria', dow: 3 }], nota: 'siempre de tarde; cocina cuando cubre; el domingo estira el turno en El 33' }),
    P('scapon', 'Susana Capón', 'sala', ['MONACO'], ['T'], [1], { nuncaConFlexible: true, cocina: { titular: ['MONACO'], reserva: [], soloDias: [2] }, abre: { MONACO: ['T'] }, nota: 'sale la primera; camarera, no cocinera salvo el martes (día flojo) para que libre Hojan' }),
    P('ivan', 'Iván', 'sala', ['PASARELA'], ['T'], [1], { abre: { PASARELA: ['T'] }, nota: 'sale el primero' }),
    P('juani', 'Juani', 'sala', ['ZAPA'], ['M'], [6]),
    P('sluna', 'Susana Luna', 'sala', ['ZAPA'], ['T'], [4], { nota: 'la cubre Roberto los jueves' }),
    P('roberto', 'Roberto', 'sala', ['ZAPA', 'PASARELA'], ['M', 'T'], [1], { partido: { dias: [3, 5, 6] }, cocina: { titular: [], reserva: ['ZAPA'], soloDias: [] }, cubreA: [{ pid: 'sluna' }, { pid: 'adrian' }], nota: 'tercero de apoyo por las mañanas en Zapatillera; los jueves abre la tarde por Susana Luna; el domingo, Pasarela con Mari Luz' }),
    P('lavinia', 'Lavinia', 'apoyo', ['PASARELA', 'ZAPA'], ['M', 'T'], [1, 2, 4], { partido: { dias: [3, 7] }, nuncaCon: ['mariluz'], nuncaConFlexible: true, cubreA: [{ pid: 'mariluz', dow: 3 }], comodin: true, nota: 'el miércoles (libre de Mari Luz) hace partido en Pasarela; viernes y sábado, tarde en Zapatillera; el domingo dobla' }),
    P('tere', 'Tere', 'apoyo', ['PASARELA', 'MONACO'], ['M'], [6, 7], { comodin: true, nota: 'apoyo de mañanas; no trabaja fines de semana' }),
    P('leo', 'Leo', 'apoyo', [], ['T'], [3, 4, 7], { nuncaCon: ['scapon'], nuncaConFlexible: true, noPrimero: ['M', 'T'], comodin: true, supuestos: ['en la semana tipo solo le salen dos días (viernes y sábado): falta saber dónde hace los demás'], nota: 'apoyo de tardes en cualquier local; entra siempre a partir del segundo puesto' }),
    P('jenny', 'Jenny', 'cocina', ['EL33', 'MONACO'], ['M', 'T'], [2], { partido: { dias: [3, 4, 5, 6, 7] }, cocina: { titular: ['EL33', 'MONACO'], reserva: [], soloDias: [] }, cubreA: [{ pid: 'esmeralda', dow: 1 }], nota: 'cocina de El 33 en partido; los lunes cocina del Mónaco por Esmeralda; el domingo dobla (mañana El 33, tarde Mónaco)' }),
    P('cristian', 'Cristian', 'apoyo', [], ['M', 'T'], [3], { partido: { dias: [6] }, cocina: { titular: [], reserva: [], soloDias: [], nunca: true }, vetos: [{ localId: 'PASARELA', franja: 'M' }], noAbre: ['EL33'], noPrimero: ['T'], comodin: true, supuestos: ['seis días (la plantilla dice cinco): pendiente del cliente'], nota: 'apoyo de sala; no hace la tarde completa (nunca el primero de la tarde); el martes tarde fijo en el Mónaco' }),
    P('yilian', 'Yilian', 'apoyo', ['MONACO'], ['M', 'T'], [4], { libreVariable: true, cubreA: [{ pid: 'cris', dow: 7 }, { pid: 'scapon', dow: 1, turnoId: 'MONACO_T' }], nota: 'apoyo de Cris Parreño de mañana; le hace el domingo; el lunes abre la tarde por Susana Capón' }),
    P('lola', 'Lola', 'sala', ['PASARELA'], ['M'], [7], { abre: { PASARELA: ['M'] }, cubreA: [{ pid: 'laura' }], nota: 'abre el local; cubre la baja de Laura' }),
    P('adrian', 'Adrián', 'cocina', ['ZAPA'], ['M', 'T'], [3], { partido: { siempre: true, dias: [1, 2, 4, 5, 6, 7] }, cocina: { titular: ['ZAPA'], reserva: [], soloDias: [] }, nota: 'cocina de Zapatillera, siempre partido' }),
    P('victoria', 'Victoria', 'sala', ['EL33'], ['M', 'T'], [3], { partido: { dias: [5, 6] }, nota: 'de mañana; viernes y sábado partido; Noe la cubre el miércoles' }),
    P('hojan', 'Hojan', 'cocina', ['EL33', 'MONACO'], ['M', 'T'], [2, 7], { soloCocina: true, partido: { dias: [1] }, cocina: { titular: ['EL33', 'MONACO'], reserva: ['ZAPA'], soloDias: [] }, cubreA: [{ pid: 'maydeth' }], nota: 'cubre la baja de Maydeth; el lunes partido: cocina de El 33 y del Mónaco' }),
    P('dulce', 'Dulce', 'apoyo', ['PASARELA', 'MONACO'], ['M', 'T'], [], { standby: true, noPrimero: ['M', 'T'], supuestos: ['en standby hasta confirmar días libres y locales', 'no sale la primera mientras sea nueva', 'quizá el partido del lunes en Pasarela, que taparía los dos huecos; a ver cómo entra (Aroa, 17/09)'], nota: 'apoyo; alta del 17/09, de prueba el fin de semana. En standby: no entra en la planilla hasta que el grupo confirme sus días y sus locales' }),
    P('laura', 'Laura', 'sala', ['PASARELA'], ['M', 'T'], [], { ausencias: [{ tipo: 'BAJ', desde: '2026-09-01', detalle: 'la cubre Lola' }] }),
    P('maydeth', 'Maydeth', 'cocina', ['MONACO'], ['M', 'T'], [], { cocina: { titular: ['MONACO'], reserva: [], soloDias: [] }, ausencias: [{ tipo: 'BAJ', desde: '2026-09-01', detalle: 'la cubre Hojan' }] }),
  ];
  asignarColores(staff);
  // semana tipo = la planilla corregida del 11/09 (prototipo del cliente). Orden dentro de
  // cada casilla: el primero abre; c = cocina; a = sale el primero (fijo); s = plaza supuesta
  // por Highkey; por = a quién cubre; n = nota que se enseña bajo el nombre.
  const pl = (t, p, f, x) => { const o = { t, p }; if (f && f.includes('c')) o.c = 1; if (f && f.includes('a')) o.a = 1; if (f && f.includes('s')) o.s = 1; if (x && x.por) o.por = x.por; if (x && x.n) o.n = x.n; return o; };
  const patron = {
    1: [pl('EL33_M', 'victoria'), pl('EL33_M', 'hojan', 'c', { n: 'cocina de El 33' }),
        pl('ZAPA_M', 'jacquelin'), pl('ZAPA_M', 'juani'), pl('ZAPA_M', 'adrian', 'c'), pl('ZAPA_T', 'sluna'), pl('ZAPA_T', 'adrian', 'c'),
        pl('MONACO_M', 'cris'), pl('MONACO_M', 'jenny', 'c', { por: 'esmeralda' }), pl('MONACO_M', 'cristian', 's'), pl('MONACO_T', 'yilian', 'a', { por: 'scapon' }), pl('MONACO_T', 'hojan', 'c'),
        pl('PASARELA_M', 'lola', 'a'), pl('PASARELA_M', 'tere'), pl('PASARELA_T', 'mariluz', '', { n: 'la tarde entera, de 16:00 a cierre' })],
    2: [pl('EL33_M', 'victoria'), pl('EL33_M', 'noe', 'c', { por: 'jenny' }), pl('EL33_T', 'noe', 'c', { por: 'jenny' }),
        pl('ZAPA_M', 'jacquelin'), pl('ZAPA_M', 'juani'), pl('ZAPA_M', 'adrian', 'c'), pl('ZAPA_M', 'roberto'), pl('ZAPA_T', 'sluna'), pl('ZAPA_T', 'adrian', 'c'),
        pl('MONACO_M', 'cris'), pl('MONACO_M', 'esmeralda', 'c'), pl('MONACO_M', 'yilian'), pl('MONACO_T', 'scapon', 'ac', { n: 'excepción del martes' }), pl('MONACO_T', 'cristian'),
        pl('PASARELA_M', 'lola', 'a'), pl('PASARELA_M', 'mariluz'), pl('PASARELA_M', 'tere', 's'), pl('PASARELA_T', 'ivan', 'a'), pl('PASARELA_T', 'mariluz')],
    3: [pl('EL33_M', 'noe', '', { por: 'victoria' }), pl('EL33_M', 'jenny', 'c'), pl('EL33_T', 'noe', '', { por: 'victoria' }), pl('EL33_T', 'jenny', 'c'),
        pl('ZAPA_M', 'jacquelin'), pl('ZAPA_M', 'juani'), pl('ZAPA_M', 'roberto', 'c'), pl('ZAPA_T', 'sluna'), pl('ZAPA_T', 'roberto', 'c', { n: 'reserva' }),
        pl('MONACO_M', 'cris'), pl('MONACO_M', 'esmeralda', 'c'), pl('MONACO_M', 'yilian'), pl('MONACO_T', 'scapon', 'a'), pl('MONACO_T', 'hojan', 'c'),
        pl('PASARELA_M', 'lola', 'a'), pl('PASARELA_M', 'lavinia', '', { por: 'mariluz' }), pl('PASARELA_M', 'tere', 's'), pl('PASARELA_T', 'ivan', 'a'), pl('PASARELA_T', 'lavinia', '', { por: 'mariluz' })],
    4: [pl('EL33_M', 'victoria'), pl('EL33_M', 'jenny', 'c'), pl('EL33_T', 'noe'), pl('EL33_T', 'jenny', 'c'),
        pl('ZAPA_M', 'jacquelin'), pl('ZAPA_M', 'juani'), pl('ZAPA_M', 'adrian', 'c'), pl('ZAPA_T', 'roberto', '', { por: 'sluna' }), pl('ZAPA_T', 'adrian', 'c'),
        pl('MONACO_M', 'cris'), pl('MONACO_M', 'esmeralda', 'c'), pl('MONACO_M', 'cristian', 's'), pl('MONACO_T', 'scapon', 'a'), pl('MONACO_T', 'hojan', 'c'),
        pl('PASARELA_M', 'lola', 'a'), pl('PASARELA_M', 'mariluz'), pl('PASARELA_M', 'tere', 's'), pl('PASARELA_T', 'ivan', 'a'), pl('PASARELA_T', 'mariluz')],
    5: [pl('EL33_M', 'victoria'), pl('EL33_M', 'jenny', 'c'), pl('EL33_T', 'noe'), pl('EL33_T', 'jenny', 'c'), pl('EL33_T', 'victoria'),
        pl('ZAPA_M', 'jacquelin'), pl('ZAPA_M', 'juani'), pl('ZAPA_M', 'adrian', 'c'), pl('ZAPA_M', 'roberto'), pl('ZAPA_T', 'sluna'), pl('ZAPA_T', 'adrian', 'c'), pl('ZAPA_T', 'roberto'), pl('ZAPA_T', 'lavinia'),
        pl('MONACO_M', 'cris'), pl('MONACO_M', 'esmeralda', 'c'), pl('MONACO_M', 'yilian'), pl('MONACO_T', 'scapon', 'a'), pl('MONACO_T', 'hojan', 'c'), pl('MONACO_T', 'cristian', 's'),
        pl('PASARELA_M', 'lola', 'a'), pl('PASARELA_M', 'mariluz'), pl('PASARELA_M', 'tere', 's'), pl('PASARELA_T', 'ivan', 'a'), pl('PASARELA_T', 'mariluz'), pl('PASARELA_T', 'leo', 's')],
    6: [pl('EL33_M', 'victoria'), pl('EL33_M', 'jenny', 'c'), pl('EL33_M', 'cristian', 's'), pl('EL33_T', 'noe'), pl('EL33_T', 'jenny', 'c'), pl('EL33_T', 'victoria'),
        pl('ZAPA_M', 'jacquelin'), pl('ZAPA_M', 'roberto'), pl('ZAPA_M', 'adrian', 'c'), pl('ZAPA_T', 'sluna'), pl('ZAPA_T', 'adrian', 'c'), pl('ZAPA_T', 'roberto'), pl('ZAPA_T', 'lavinia'),
        pl('MONACO_M', 'cris'), pl('MONACO_M', 'esmeralda', 'c'), pl('MONACO_M', 'yilian'), pl('MONACO_T', 'scapon', 'a'), pl('MONACO_T', 'hojan', 'c'), pl('MONACO_T', 'cristian', 's'),
        pl('PASARELA_M', 'lola', 'a'), pl('PASARELA_M', 'mariluz'), pl('PASARELA_T', 'ivan', 'a'), pl('PASARELA_T', 'mariluz'), pl('PASARELA_T', 'leo', 's')],
    7: [pl('EL33_M', 'victoria'), pl('EL33_M', 'jenny', 'c'), pl('EL33_M', 'noe', '', { n: 'turno estirado' }),
        pl('ZAPA_M', 'juani'), pl('ZAPA_M', 'lavinia'), pl('ZAPA_M', 'adrian', 'c'), pl('ZAPA_T', 'sluna'), pl('ZAPA_T', 'adrian', 'c'),
        pl('MONACO_M', 'yilian', '', { por: 'cris' }), pl('MONACO_M', 'esmeralda', 'c'), pl('MONACO_M', 'cristian', 's'), pl('MONACO_T', 'scapon', 'a'), pl('MONACO_T', 'jenny', 'c', { por: 'hojan' }),
        pl('PASARELA_M', 'mariluz'), pl('PASARELA_M', 'roberto', '', { n: 'con Mari Luz' }), pl('PASARELA_T', 'ivan', 'a'), pl('PASARELA_T', 'lavinia')],
  };
  const equipos = [
    { id: 'barcelona', nombre: 'Barcelona', corto: 'Barça', color: '#a50044', refuerzo: { EL33: 1, ZAPA: 1, MONACO: 1, PASARELA: 1 }, franja: 'T' },
    { id: 'madrid', nombre: 'Madrid', corto: 'Madrid', color: '#3b3b3b', refuerzo: { EL33: 1, ZAPA: 1, MONACO: 1, PASARELA: 1 }, franja: 'T' },
    { id: 'elche', nombre: 'Elche', corto: 'Elche', color: '#0a7a3c', refuerzo: { EL33: 1, ZAPA: 1, MONACO: 1, PASARELA: 1 }, franja: 'T' },
  ];
  return { locales, staff, patron, equipos, eventos: [], extras: [], festivos: [], cierres: {}, reglas: {} };
}

// ---------- navegación ----------
// La app abre siempre en el día de hoy. El mes, el día y la semana que estabas mirando
// solo se recuperan si los dejaste ese mismo día: así al recargar no pierdes el sitio,
// pero al día siguiente la pantalla no se queda anclada en una fecha vieja (hasta el
// 15/09 se restauraba para siempre y la app podía abrir en agosto con todo vacío).
function navVigente(nav, hoyIso, minMes, maxMes) {
  if (!nav || !nav.y || !nav.m || nav.hoy !== hoyIso) return false;
  const k = claveMes(nav.y, nav.m);
  return !(minMes && k < minMes) && !(maxMes && k > maxMes);
}

// ---------- migración de los horarios (15/09) ----------
// Una planilla guardada antes de que la encargada confirmara los horarios sigue con los
// supuestos de fábrica (09:00–16:00 / 16:00–23:00). Solo se sustituyen esos: un horario
// que el encargado haya tocado a mano no se pisa nunca. Los tramos del partido, que no
// existían, se añaden a todos los locales que no los tengan.
const HORARIO_VIEJO = { M: { ini: '09:00', fin: '16:00' }, T: { ini: '16:00', fin: '23:00' } };
// los tramos de partido de fábrica de antes del 16/09: 4 y 4 todos los días, sin reparto por día
const PARTIDO_VIEJO = { M: { ini: '12:00', fin: '16:00' }, T: { ini: '20:00', fin: '00:00' } };
// Fichas guardadas con el puesto «comodín»: pasan a «apoyo» sin perder el sin-local-fijo.
function migrarPuestos(estado) {
  const r = { puestos: 0 };
  for (const p of estado.staff || []) if (p.puesto === 'comodin') { p.puesto = 'apoyo'; p.comodin = p.comodin === undefined ? true : p.comodin; r.puestos++; }
  return r;
}
function migrarHorarios(estado) {
  const r = { cambiados: 0, partido: 0 };
  const base = semillaPasarela().locales[0];
  for (const l of estado.locales || []) {
    const h = l.horario || {};
    const deFabrica = l.horarioSupuesto && h.M && h.T
      && h.M.ini === HORARIO_VIEJO.M.ini && h.M.fin === HORARIO_VIEJO.M.fin
      && h.T.ini === HORARIO_VIEJO.T.ini && h.T.fin === HORARIO_VIEJO.T.fin;
    if (deFabrica) {
      l.horario = JSON.parse(JSON.stringify(base.horario));
      l.horarioSupuesto = false; l.cierreAprox = true;
      r.cambiados++;
    }
    const hp = l.horarioPartido || null;
    const partidoDeFabrica = hp && !hp.porDow && l.horarioPartidoSupuesto && hp.M && hp.T
      && hp.M.ini === PARTIDO_VIEJO.M.ini && hp.M.fin === PARTIDO_VIEJO.M.fin
      && hp.T.ini === PARTIDO_VIEJO.T.ini && hp.T.fin === PARTIDO_VIEJO.T.fin;
    if (!hp || partidoDeFabrica) { l.horarioPartido = JSON.parse(JSON.stringify(base.horarioPartido)); l.horarioPartidoSupuesto = true; r.partido++; }
    if (!l.duracion) { l.duracion = JSON.parse(JSON.stringify(base.duracion)); l.duracionSupuesta = true; r.duracion = (r.duracion || 0) + 1; }
  }
  return r;
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
    minutosTurno, minutosNocturnos, minutosEntre, horarioDe, tramoPartidoDe, turnoDelDia,
    migrarPuestos, esApoyo, libraEn, libraPuntualVigente, limpiarLibrePuntual, lunesDe, enCocinaEse,
    LISTAS_CAND, VALORACIONES, PUESTOS_CAND, MOTIVOS_ALERTA, HABILIDADES, HAB_ESTADO, CAMPOS_ENTREVISTA, tieneEntrevista, VAL_LBL, etiquetaCandidato, filtrarCandidatos, resumenCandidatos,
    puestosDe, textoPuestos, migrarCandidatos,
    diasAusenciaMes, vacacionesAno, horasPersonaMes, horasEquipoMes, horasLocalMes,
    toProblem, desdeSolucion,
    fusionarEstado, sembrarDemo, migrarHorarios, navVigente,
    CARACTERISTICAS, REGLAS, regla, caracteristicaActiva, puedePrimero, partidoAbre, primeroDe, posicionesDe, motivoSinPrimero, porQueNadiePrimero, esContinuo,
    resumenMinimos, descripcionCocina, condicionesDe, verificarSemana, generarSemana, mesVisibleParaPersonal, mesesVisibles, destinatariosAviso, avisoEsPara,
    TIPOS_INCIDENCIA, turnosAfectados, turnosSemanaDe, candidatosCobertura, planesCobertura, aplicarCobertura, vaciarPlanilla,
    sugerirUsuario, PALETA_PERSONAS, asignarColores, semillaPasarela,
  };
}
