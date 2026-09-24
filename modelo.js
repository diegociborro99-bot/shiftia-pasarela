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
// 17/09 (Diego): las mismas palabras en la ficha y en los filtros. `label` es de una
// persona («Cocinero/a»); `plural`, del filtro, que agrupa gente («Cocineros»).
const PUESTOS_CAND = [
  { id: 'cocina', label: 'Cocinero/a', plural: 'Cocineros', ico: 'cocina' },
  { id: 'sala', label: 'Camarero/a', plural: 'Camareros', ico: 'camarero' },
];
// 17/09 (Aroa): «a continuación de horarios, un botón que ponga: el entrevistado busca».
// Se pueden marcar varias; «No tiene problemas» va sola, que es lo que significa.
const BUSCA = [
  { id: 'M', label: 'Mañanas', ico: 'sol' },
  { id: 'T', label: 'Tardes', ico: 'luna' },
  { id: 'P', label: 'Turno partido', ico: 'horarios' },
  { id: 'FDS', label: 'Fin de semana', ico: 'fecha' },
  { id: 'TODO', label: 'No tiene problemas', ico: 'bien' },
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
  // 17/09 (Aroa): «para saber si ha hecho aperturas o cierres en otros locales, que ahí veo
  // yo si tiene experiencia». Es la que más le dice de alguien que viene de fuera.
  { id: 'apercierre', label: 'Aperturas o cierres', ico: 'llave' },
];
const HAB_ESTADO = { si: 'Sí', dudas: 'Con dudas', no: 'No' };
// El resto de la entrevista, tal como la tiene el grupo en su plantilla
// cada dato con su icono: la ficha del candidato los pinta con él (José, 17/09)
const CAMPOS_ENTREVISTA = [
  // `cabecera`: lo primero de la ficha, con el nombre y el teléfono (Diego, 17/09). La fecha
  // además es `meta`: se pone sola al registrar, así que no cuenta como entrevista contestada.
  { k: 'fecha', label: 'Fecha de la entrevista', corto: true, ico: 'fecha', meta: true, cabecera: true },
  { k: 'edad', label: 'Edad', corto: true, ico: 'edad', cabecera: true }, { k: 'zona', label: 'Zona', ico: 'zona', cabecera: true },
  // 17/09 (Diego): detrás de la zona, y de tres botones en vez de a mano
  { k: 'doc', label: 'Documentación en regla', corto: true, ico: 'doc', cabecera: true,
    opciones: [{ id: 'si', label: 'Sí' }, { id: 'no', label: 'No' }, { id: 'tramite', label: 'En trámite' }] },
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
  return ps.map((x, i) => i ? x.label.toLowerCase() : x.label).join(' y ');
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
// 17/09: las 150 entrevistas que estaban en papel dentro de Notion. La semilla solo se
// sembraba cuando la lista estaba vacía, así que a quien ya tenía la app en marcha no le
// llegaba nada: seguía viendo las fichas de solo nombre y teléfono. Esta fusión mete lo
// leído de las hojas en las fichas que ya existen, **sin pisar nada de lo que el grupo
// haya escrito en la app**: solo rellena lo que está en blanco. Se cruza por `id` y, si
// no, por teléfono (en Notion hay diez tecleados con un dígito cambiado).
function fundirSemillaEntrevistas(estado, semilla) {
  const r = { rellenadas: 0, nuevas: 0 };
  if (!estado || !Array.isArray(estado.entrevistas) || !Array.isArray(semilla)) return r;
  const tel = t => String(t || '').replace(/\D/g, '');
  const porId = new Map(), porTel = new Map();
  for (const c of estado.entrevistas) {
    if (c.id) porId.set(c.id, c);
    const t = tel(c.tel);
    if (t && !porTel.has(t)) porTel.set(t, c);
  }
  for (const s of semilla) {
    const c = porId.get(s.id) || porTel.get(tel(s.tel));
    if (!c) {
      estado.entrevistas.push(JSON.parse(JSON.stringify(s)));
      r.nuevas++;
      continue;
    }
    let tocada = false;
    for (const k of Object.keys(s)) {
      if (k === 'id' || k === 'tel' || k === 'lista' || k === 'hab' || k === 'puesto' || k === 'puestos') continue;
      if (s[k] == null || s[k] === '') continue;
      if (c[k] != null && c[k] !== '') continue;
      c[k] = JSON.parse(JSON.stringify(s[k])); tocada = true;
    }
    if (s.hab && typeof s.hab === 'object') {
      c.hab = c.hab || {};
      for (const [k, v] of Object.entries(s.hab)) if (!c.hab[k]) { c.hab[k] = v; tocada = true; }
    }
    const suyos = puestosDe(s);
    if (suyos.length && !puestosDe(c).length) { c.puestos = suyos.slice(); delete c.puesto; tocada = true; }
    if (tocada) r.rellenadas++;
  }
  return r;
}
// «Cocinero bien», «Camarera en espera», «Cocina y sala»…: la etiqueta que pidió José
function etiquetaCandidato(c) {
  const p = textoPuestos(c);
  const v = c && VAL_LBL[c.val];
  return v ? `${p} · ${v.corto}` : p;
}
// lo que se enseña de un campo: los de opciones guardan el id («tramite») y lucen su
// palabra («En trámite»); los de texto, lo escrito tal cual
function textoCampo(c, x) {
  const v = c && c[x.k];
  if (!v) return '';
  if (x.opciones) { const o = x.opciones.find(o => o.id === v); return o ? o.label : String(v); }
  return String(v);
}
// el buscador mira todo lo que hay escrito de esa persona, no solo el nombre
function textoCandidato(c) {
  const busca = BUSCA.filter(x => (c.busca || []).includes(x.id)).map(x => x.label);
  return [c.nombre, c.tel, c.nota].concat(CAMPOS_ENTREVISTA.map(x => textoCampo(c, x))).concat(busca).filter(Boolean).join(' ').toLowerCase();
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
// La fecha de la entrevista, tal y como está escrita en la ficha, pasada a ISO para poder
// ordenar. Las antiguas la traen como la leyó el OCR de las hojas —«23/2/2026», «22 de Julio
// de 2026», «14 de Septiembre» sin año, a veces con el texto de al lado colado debajo— y las
// nuevas como la pone la app al registrar («lunes 21 de septiembre», sin año). Sin año se toma
// la última vez que cayó esa fecha: este año si ya ha pasado, si no el anterior. Lo que no se
// entiende devuelve null y no manda a nadie a ningún sitio.
const MES_PREF = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function fechaCandidato(c, hoy) {
  const s = String((c && c.fecha) || '').split('\n')[0].trim().toLowerCase();
  if (!s) return null;
  let y = 0, m = 0, d = 0, r;
  if ((r = s.match(/^(\d{4})-(\d{2})-(\d{2})/))) { y = +r[1]; m = +r[2]; d = +r[3]; }
  else if ((r = s.match(/(\d{1,2})\s*\/\D{0,2}(\d{1,2})\s*\/\D{0,2}(\d{2,4})/))) { d = +r[1]; m = +r[2]; y = +r[3]; if (y < 100) y += 2000; }
  else if ((r = s.match(/(\d{1,2})\s+de\s+([a-záéíóúñ]+)(?:\s+(?:de|del)\s+(\d{4}))?/))) {
    const pref = r[2].normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 3);
    d = +r[1]; m = MES_PREF.indexOf(pref === 'set' ? 'sep' : pref) + 1; y = r[3] ? +r[3] : 0;
  } else return null;
  if (!(m >= 1 && m <= 12 && d >= 1 && d <= 31)) return null;
  if (!y) {
    const h = hoy || fechaMadrid();
    y = +h.slice(0, 4);
    if (isoDe(y, m, d) > h) y--;
  }
  return isoDe(y, m, d);
}
// 21/09 (José, por WhatsApp): «Intenta que las entrevistas los que pongo BIEN o descarte me
// aparezcan primero cuando filtre. Si sale en orden alfabético me vuelvo loco. Para que las
// últimas por fecha me aparezcan antes». Ese es el orden de partida, «reciente»: manda lo
// último que se ha tocado —`ts`, el sello que pone la app al registrar o al guardar una ficha
// con cambios—, después la fecha de la entrevista, y quien no tiene ni una cosa ni otra se
// queda en el orden en que estaba. Los otros tres son para cuando busca de otra manera, y se
// eligen desde la lista. Ninguno toca la base: siempre se devuelve una copia.
const ORDENES_CAND = [
  { id: 'reciente', label: 'Las últimas primero', corto: 'las últimas primero' },
  { id: 'fecha', label: 'Por fecha', corto: 'por fecha de entrevista' },
  { id: 'valoracion', label: 'Por valoración', corto: 'por valoración' },
  { id: 'alfabetico', label: 'Alfabético', corto: 'por orden alfabético' },
];
// para el alfabético: sin mayúsculas ni acentos, que si no «Élia» se va detrás de «Zoe»
function claveAlfabetica(c) {
  return String((c && c.nombre) || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}
function ordenarCandidatos(cands, hoy, modo) {
  const h = hoy || fechaMadrid();
  const vals = VALORACIONES.map(v => v.id);
  const lista = (cands || []).map((c, i) => ({ c, i, f: fechaCandidato(c, h) || '', n: claveAlfabetica(c) }));
  // sin fecha va al final, no al principio: '' es menor que cualquier fecha, así que se mira aparte
  const porFecha = (a, b) => (a.f === b.f ? a.i - b.i : !a.f || !b.f ? (a.f ? -1 : 1) : a.f < b.f ? 1 : -1);
  const reciente = (a, b) => {
    const ta = +a.c.ts || 0, tb = +b.c.ts || 0;
    return ta !== tb ? tb - ta : porFecha(a, b);
  };
  const COMPARA = {
    fecha: porFecha,
    valoracion: (a, b) => {
      const ia = vals.indexOf(a.c.val), ib = vals.indexOf(b.c.val);
      const pa = ia < 0 ? vals.length : ia, pb = ib < 0 ? vals.length : ib;
      return pa !== pb ? pa - pb : reciente(a, b);
    },
    alfabetico: (a, b) => (a.n === b.n ? a.i - b.i : !a.n || !b.n ? (a.n ? -1 : 1) : a.n < b.n ? -1 : 1),
  };
  lista.sort(COMPARA[modo] || reciente);
  return lista.map(x => x.c);
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
// 18/09: a quien no puede ver el contenido, el servidor le manda la ficha sin ningún campo
// y con `entrevistado` puesto: es lo que necesita para «no volverles a llamar».
function tieneEntrevista(c) {
  if (c && c.sinContenido) return !!c.entrevistado;
  return !!(c && (CAMPOS_ENTREVISTA.some(x => !x.meta && c[x.k]) || Object.keys(c.hab || {}).length || (c.busca || []).length));
}

function turnoId(localId, franja) { return `${localId}_${franja}`; }
function partirTurno(tid) { const i = tid.lastIndexOf('_'); return { localId: tid.slice(0, i), franja: tid.slice(i + 1) }; }
function turnosDe(cfg) { const out = []; for (const l of cfg.locales) for (const f of FRANJAS) out.push({ id: turnoId(l.id, f), localId: l.id, franja: f, local: l }); return out; }
function localDe(cfg, localId) { return cfg.locales.find(l => l.id === localId) || null; }
function personaDe(staff, pid) { return staff.find(p => p.id === pid) || null; }
function nombreDe(staff, pid) { const p = personaDe(staff, pid); return p ? p.nombre : pid; }

// ---------- apertura y mínimos ----------
// abierto = el local abre esa franja ese día de la semana (l.abre, «Cuándo abre»), salvo:
//  · un cierre por fechas (S.cierresPuntuales, ver abajo), que manda sobre todo lo demás;
//  · la apertura o el cierre a mano de ese día (est.apertura[iso][tid]): true/false o, desde el
//    24/09, { abierto: true, min } cuando se abre a mano con su mínimo («abrir hoy», S28).
function turnoAbierto(cfg, est, iso, tid) {
  const { localId, franja } = partirTurno(tid);
  const l = localDe(cfg, localId);
  if (!l) return false;
  if (cierreEn(cfg, iso, tid)) return false;
  const ov = aperturaDelDia(est, iso, tid);
  if (ov !== null) return ov;
  return ((l.abre && l.abre[franja]) || []).includes(isoDow(iso));
}
// la apertura o el cierre a mano de ESE día (est.apertura): true, false o null si no hay
function aperturaDelDia(est, iso, tid) {
  const ov = est && est.apertura && est.apertura[iso] && est.apertura[iso][tid];
  if (ov === undefined || ov === null) return null;
  return typeof ov === 'object' ? !!ov.abierto : !!ov;
}
// ¿Cerrada ESE día concreto, por un cierre por fechas o a mano? Es lo que descuentan las horas y el
// registro de apoyos. No mira «Cuándo abre» (l.abre), que es el horario de ahora en adelante: lo que
// se trabajó con el horario de entonces no se borra (24/09, revisión F2: quitar el lunes por la tarde
// del Mónaco quitaba de Horas los lunes ya trabajados, también los de agosto, cerrado para la nómina).
function cerradaEseDia(cfg, est, iso, tid) {
  return !!cierreEn(cfg, iso, tid) || aperturaDelDia(est, iso, tid) === false;
}
function toggleApertura(est, iso, tid, cfg) {
  const cur = turnoAbierto(cfg, est, iso, tid);
  (est.apertura[iso] = est.apertura[iso] || {})[tid] = !cur;
  return !cur;
}
// 24/09 (S28): «abrir hoy» una casilla que no abre ese día la dejaba con mínimo 0, así que nadie la
// rellenaba y la condición salía cumplida. Se abre con el mínimo que diga el encargado y se guarda
// con la apertura del día, como excepción por fecha que leen minimoDe y, con él, el generador, la
// cobertura, la revisión y el núcleo. No se inventa un mínimo: si dice 0, es 0 (y la revisión avisa
// de que está abierta y vacía).
function abrirCasilla(est, iso, tid, min) {
  const v = { abierto: true, min: Math.max(0, Math.round(+min) || 0) };
  (est.apertura[iso] = est.apertura[iso] || {})[tid] = v;
  return v;
}
// por qué una casilla está cerrada ese día, tal como lo dicen el selector, la retirada automática y
// la revisión: el cierre por fechas con su motivo, o el horario semanal del local
function motivoCerrado(cfg, iso, tid) {
  const c = cierreEn(cfg, iso, tid);
  if (c) return { regla: 'cierre', motivo: textoCierre(cfg, c), cierre: c };
  const { localId, franja } = partirTurno(tid);
  const l = localDe(cfg, localId);
  return { regla: 'cerrado', motivo: `${l ? l.nombre : localId} no abre la ${FRANJA_LBL[franja].toLowerCase()} ${DOW_PL[isoDow(iso)].replace('los ', 'el ')}`, cierre: null };
}

// ---------- cierres puntuales de un local (por fechas) ----------
// 24/09 (reunión: «la semana que viene vamos a cerrar el Mónaco para hacer una pequeñita reforma…
// aunque tú le pongas que va a cerrar puntual, sigue generando para toda la semana»; y el mensaje
// de Diego: «el Mónaco va a cerrar domingo por la tarde, lunes y martes… el domingo de la semana
// que viene ya sí que estaríamos abiertos… que pueda elegir el día que cierra cada local y así hacer
// como intervalos»). «Cuándo abre» (l.abre) es el horario de TODAS las semanas; esto es otra cosa:
// como unas vacaciones del local, con principio y fin, y al pasar el local vuelve solo a su horario.
//   S.cierresPuntuales = [{ id, localId, dias: { iso: ['M'] | ['T'] | ['M','T'] }, motivo, detalle,
//     decisiones: { pid: { tipo, destinos?: { iso: tid }, turnos?: ['iso|franja'], dias?: [iso] } },
//     retirados: [{ iso, tid, entry }], deSemanaTipo: [iso] (días sin planilla al cerrar),
//     origen?: { abre: { franja, dow } } (salió de «Cuándo abre»), ts, usuario? (solo con servidor) }]
// Las franjas van POR DÍA para que quepa «desde el domingo por la tarde hasta el martes». Nunca en
// S.cierres, que es «mes cerrado para la nómina». Vive fuera de S.meses: un solo registro aunque
// cruce semanas y meses, y sobrevive a vaciar la planilla. Decisión D11 (decisiones.md).
const MOTIVOS_CIERRE = [
  { id: 'reforma', label: 'Reforma', txt: 'reforma' },
  { id: 'vacaciones', label: 'Vacaciones del local', txt: 'vacaciones' },
  { id: 'otro', label: 'Otro', txt: '' },
];
// Qué hace cada persona mientras el local está cerrado (reunión: «que te salga un visor y te ponga
// apoyos o vacaciones o sin trabajo»; Diego: «¿quién se queda apoyando? ¿quién no trabaja? ¿quién
// tiene días libres?»). El apoyo se llama REFUERZA por dentro para no confundirlo con el puesto
// «apoyo» (esApoyo), que es el extra que se paga por horas. Sin decisión = SIN: «cierra el local,
// pero no tiene que redistribuir a los trabajadores».
const DECISIONES_CIERRE = [
  { id: 'REFUERZA', label: 'Apoyo', largo: 'Apoyo en otros locales' },
  { id: 'SIN', label: 'Sin trabajo', largo: 'Sin trabajo hasta que reabra' },
  { id: 'LD', label: 'Día libre', largo: 'Día libre' },
  { id: 'VAC', label: 'Vacaciones', largo: 'Vacaciones' },
];
const DOW_ABR = ['', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
const fechaCortaCierre = iso => `${DOW_ABR[isoDow(iso)]} ${iso.slice(8, 10)}/${iso.slice(5, 7)}`;   // «dom 27/09»
function cierresDe(cfg) { return cfg && Array.isArray(cfg.cierresPuntuales) ? cfg.cierresPuntuales : []; }
function diasDeCierre(c) { const d = (c && c.dias) || {}; return Object.keys(d).filter(iso => Array.isArray(d[iso]) && d[iso].length).sort(); }
// El cierre que cubre ese local, franja y día, o null. Lo llama turnoAbierto, que es el camino más
// transitado del generador: hay pocos cierres, y se descarta por local antes de mirar el día.
function cierreEn(cfg, iso, tid) {
  const cs = cierresDe(cfg);
  if (!cs.length) return null;
  const { localId, franja } = partirTurno(tid);
  for (const c of cs) {
    if (c.localId !== localId || !c.dias) continue;
    const fs = c.dias[iso];
    if (fs && fs.includes(franja)) return c;
  }
  return null;
}
// «reforma», «vacaciones» o lo que se escribió en «Otro»
function motivoCierreTxt(c) { const m = MOTIVOS_CIERRE.find(x => x.id === (c && c.motivo)); return (m && m.txt) || String((c && c.detalle) || '').trim(); }
// «Reforma», «Vacaciones del local»… lo que se enseña en la casilla cerrada
function etiquetaCierre(c) { const m = MOTIVOS_CIERRE.find(x => x.id === (c && c.motivo)); return m && m.id !== 'otro' ? m.label : (String((c && c.detalle) || '').trim() || 'Cierre'); }
// «mar 29/09»: el último día cerrado
function hastaCierre(c) { const ds = diasDeCierre(c); return ds.length ? fechaCortaCierre(ds[ds.length - 1]) : ''; }
// «Bar Mónaco cerrado por reforma (dom 27/09 tarde – mar 29/09)»: el texto de la regla, de los avisos
// y del historial. Dice las fechas para que nadie lo lea como un cierre de todas las semanas (la
// regla «cerrado» decía «no abre la tarde el lunes», que suena a horario fijo).
// Con días sueltos los enumera («dom 27/09 y mar 29/09, solo tardes»; «los domingos por la tarde del
// 27/09 al 25/10»): un guion entre el primero y el último se leía como si cerrara todo lo de en medio
// (24/09, revisión F2).
function textoCierre(cfg, c) {
  const l = localDe(cfg, c.localId);
  const m = motivoCierreTxt(c);
  const cab = `${l ? l.nombre : c.localId} cerrado${m ? ' por ' + m : ''}`;
  const ds = diasDeCierre(c);
  if (!ds.length) return cab;
  const una = iso => c.dias[iso].length === 1 ? c.dias[iso][0] : null;   // 'M' o 'T'; null = el día entero
  const sg = { M: 'mañana', T: 'tarde' }, pl = { M: 'mañanas', T: 'tardes' };
  const soloUna = una(ds[0]) && ds.every(iso => una(iso) === una(ds[0])) ? una(ds[0]) : null;
  // tramos seguidos: con una sola franja, días consecutivos; si no, cada día empieza por la mañana y
  // el anterior acaba por la tarde (así «dom 27 tarde – mar 29» no esconde un lunes solo de tarde)
  const tramos = [];
  for (const iso of ds) {
    const u = tramos[tramos.length - 1], prev = u && u[u.length - 1];
    const sigue = prev && addDias(prev, 1) === iso && (soloUna || (c.dias[prev].includes('T') && c.dias[iso].includes('M')));
    if (sigue) u.push(iso); else tramos.push([iso]);
  }
  const conF = iso => fechaCortaCierre(iso) + (!soloUna && una(iso) ? ' ' + sg[una(iso)] : '');
  const y = xs => xs.length > 1 ? `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}` : xs[0];
  let rango;
  if (ds.length === 1) rango = fechaCortaCierre(ds[0]) + (una(ds[0]) ? ' ' + sg[una(ds[0])] : '');
  else if (tramos.length === 1) rango = soloUna ? `${fechaCortaCierre(ds[0])} – ${fechaCortaCierre(ds[ds.length - 1])}, solo ${pl[soloUna]}` : `${conF(ds[0])} – ${conF(ds[ds.length - 1])}`;
  else if (ds.length >= 3 && ds.every((iso, i) => !i || addDias(ds[i - 1], 7) === iso)) {
    // el mismo día cada semana (lo que deja «Cuándo abre» en las semanas ya planificadas)
    rango = `${DOW_PL[isoDow(ds[0])]}${soloUna ? ' por la ' + sg[soloUna] : ''} del ${ds[0].slice(8, 10)}/${ds[0].slice(5, 7)} al ${ds[ds.length - 1].slice(8, 10)}/${ds[ds.length - 1].slice(5, 7)}`;
  } else rango = y(tramos.map(t => t.length === 1 ? conF(t[0]) : `${conF(t[0])} – ${conF(t[t.length - 1])}`)) + (soloUna ? `, solo ${pl[soloUna]}` : '');
  return `${cab} (${rango})`;
}
// lo que se le dice a quien no trabaja esos días (regla, forzar y retirada automática)
function motivoSinTrabajo(cfg, c) { const l = localDe(cfg, c.localId); return `sin trabajo: ${l ? l.nombre : c.localId} cerrado hasta el ${hastaCierre(c)}`; }
const MAX_DIAS_CIERRE = 62;   // como la tira de la Cobertura: dos meses
function validarCierre(cfg, c) {
  const errores = [];
  if (!c || typeof c !== 'object') return { ok: false, errores: ['falta el cierre'] };
  const l = localDe(cfg, c.localId);
  if (!l) errores.push('el local no existe');
  const dias = c.dias && typeof c.dias === 'object' && !Array.isArray(c.dias) ? c.dias : {};
  const isos = Object.keys(dias);
  if (!isos.some(iso => Array.isArray(dias[iso]) && dias[iso].length)) errores.push('hay que cerrar al menos un día');
  for (const iso of isos) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || isNaN(new Date(iso + 'T12:00:00').getTime())) { errores.push(`fecha no válida: ${iso}`); continue; }
    if (!Array.isArray(dias[iso]) || dias[iso].some(f => !FRANJAS.includes(f))) errores.push(`franja no válida el ${iso}`);
  }
  const ds = diasDeCierre({ dias }).filter(iso => /^\d{4}-\d{2}-\d{2}$/.test(iso));
  if (ds.length && addDias(ds[0], MAX_DIAS_CIERRE - 1) < ds[ds.length - 1]) errores.push(`un cierre no puede pasar de ${MAX_DIAS_CIERRE} días`);
  if (!MOTIVOS_CIERRE.some(m => m.id === c.motivo)) errores.push('motivo no válido');
  if (l && !errores.length) for (const o of cierresDe(cfg)) {
    if (o === c || (c.id && o.id === c.id) || o.localId !== c.localId) continue;
    if (isos.some(iso => ((o.dias && o.dias[iso]) || []).some(f => dias[iso].includes(f)))) { errores.push(`se solapa con otro cierre: ${textoCierre(cfg, o)}`); break; }
  }
  return { ok: !errores.length, errores };
}
// ¿Estaba esta persona en la casilla cerrada? Lo que se retiró al cerrar o, en los días que aún no
// tenían planilla al cerrar (c.deSemanaTipo, lo apunta aplicarCierre), su plaza de la semana tipo. Es
// lo que hace que «sin decisión» cuente como sin trabajo. En un día que ya tenía planilla la semana
// tipo no dice nada: quien esa semana estaba en otro sitio no estaba en el local cerrado, y el visor
// ni siquiera preguntó por él (24/09, revisión F2: Cristian, en Pasarela por la cobertura, salía «sin
// trabajo» y el generador le quitaba la plaza). Tampoco en la vista del empleado, que no recibe
// c.deSemanaTipo: allí la semana tipo es la de la semilla, no la real.
function estabaEnCierre(cfg, c, pid, iso, franja) {
  const tid = turnoId(c.localId, franja);
  if ((c.retirados || []).some(r => r.iso === iso && r.tid === tid && r.entry && r.entry.pid === pid)) return true;
  return Array.isArray(c.deSemanaTipo) && c.deSemanaTipo.includes(iso) && plazasDe(cfg, isoDow(iso)).some(pl => pl.t === tid && pl.p === pid);
}
// ¿Esa casilla (día y turno) está dentro del cierre c?
function dentroDeCierre(c, iso, tid) { const { localId, franja } = partirTurno(tid); return !!c && localId === c.localId && ((c.dias && c.dias[iso]) || []).includes(franja); }
// ¿Ese día ya tiene planilla (alguien puesto en alguna casilla)?
function diaConPlanilla(est, iso) { return Object.values((est && est.asig && est.asig[iso]) || {}).some(l => l && l.length); }
// Qué hace esa persona esa franja por un cierre: { cierre, tipo, d, explicita } o null. La decisión
// vale en las franjas que tenía en el local cerrado (d.turnos, 'iso|franja'): Hojan sin trabajo la
// tarde del lunes sigue haciendo su mañana en El 33. Sin decisión, quien estaba cuenta como SIN.
function decisionCierre(cfg, pid, iso, franja) {
  const cs = cierresDe(cfg);
  if (!cs.length || !pid) return null;
  const k = iso + '|' + franja;
  let implicita = null;
  for (const c of cs) {
    const fs = c.dias && c.dias[iso];
    if (!fs || !fs.includes(franja)) continue;
    const d = c.decisiones && c.decisiones[pid];
    if (d) {
      if (!Array.isArray(d.turnos) || d.turnos.includes(k)) return { cierre: c, tipo: DECISIONES_CIERRE.some(x => x.id === d.tipo) ? d.tipo : 'SIN', d, explicita: true };
      continue;
    }
    if (!implicita && estabaEnCierre(cfg, c, pid, iso, franja)) implicita = { cierre: c, tipo: 'SIN', d: null, explicita: false };
  }
  return implicita;
}
// APOYO por el cierre esa franja: puede ir a otros locales sin forzar (siguen valiendo los vetos, las
// franjas, el día libre, «nunca con» y el partido). Una sola lectura para puedeEstar, la verificación
// del Generador y el núcleo.
function apoyoPorCierre(cfg, pid, iso, franja) { const dc = decisionCierre(cfg, pid, iso, franja); return !!dc && dc.tipo === 'REFUERZA'; }
// Lo que suma en el relleno y en la cobertura quien apoya por un cierre («donde haga falta»). El
// mismo helper para candidatosPara y candidatosCobertura: la puntuación no se copia.
function puntosCierre(cfg, p, iso, tid) {
  if (!p) return null;
  const { localId, franja } = partirTurno(tid);
  const dc = decisionCierre(cfg, p.id, iso, franja);
  if (!dc || dc.tipo !== 'REFUERZA' || dc.cierre.localId === localId) return null;
  const l = localDe(cfg, dc.cierre.localId);
  return { puntos: 45, razon: `apoyo: ${l ? l.nombre : dc.cierre.localId} cerrado` };
}
// Quién trabajaba en las casillas cerradas: de la planilla o, si ese día aún no tiene plazas, de la
// semana tipo (para que el visor no salga vacío en una semana sin generar). est es el estado virtual
// y escribible del rango, que puede cruzar semanas y meses. Por persona: sus turnos cerrados, sus
// otros turnos de esos días, si el cerrado era su único turno del día (soloTurno: VAC y LD solo así),
// los avisos y la sugerencia, que siempre es «sin trabajo»: nadie se redistribuye solo.
// opts.pendientes: plazas retiradas por un cierre anterior que no pudieron volver a su casilla al
// editarlo ([{ iso, tid, entry }]); cuentan como si siguieran allí (revisión F2).
function afectadosPorCierre(cfg, staff, est, c, opts) {
  const pend = (opts && opts.pendientes) || [];
  const porPid = new Map();
  const tomar = pid => {
    if (!porPid.has(pid)) { const p = personaDe(staff, pid); porPid.set(pid, { pid, nombre: p ? p.nombre : pid, turnos: [], otrosTurnos: [], soloTurno: {}, avisos: [], sugerencia: 'SIN', decision: (c.decisiones && c.decisiones[pid]) || null }); }
    return porPid.get(pid);
  };
  for (const iso of diasDeCierre(c)) {
    const cerradas = c.dias[iso];
    const planilla = diaConPlanilla(est, iso) || pend.some(r => r.iso === iso);
    const fuente = planilla ? 'planilla' : 'semana tipo';
    const enDia = planilla
      ? turnosDe(cfg).flatMap(t => asignados(est, iso, t.id).map(e => ({ pid: e.pid, tid: t.id, localId: t.localId, franja: t.franja, cocina: !!e.cocina, abre: !!e.abre })))
      : plazasDelDia(cfg, staff, iso).plazas.filter(pl => { const p = personaDe(staff, pl.p); return p && !ausenciaEn(p, iso, partirTurno(pl.t).franja) && !p.standby; })
        .map(pl => Object.assign({ pid: pl.p, tid: pl.t, cocina: !!pl.c, abre: !!pl.a }, partirTurno(pl.t)));
    for (const r of pend) if (r.iso === iso && r.entry && !enDia.some(x => x.pid === r.entry.pid && x.tid === r.tid)) enDia.push(Object.assign({ pid: r.entry.pid, tid: r.tid, cocina: !!r.entry.cocina, abre: !!r.entry.abre }, partirTurno(r.tid)));
    const cerrada = x => x.localId === c.localId && cerradas.includes(x.franja);
    for (const x of enDia) if (cerrada(x)) tomar(x.pid).turnos.push({ iso, tid: x.tid, franja: x.franja, cocina: x.cocina, abre: x.abre, fuente });
    for (const a of porPid.values()) {
      if (!a.turnos.some(t => t.iso === iso)) continue;
      const otros = enDia.filter(x => x.pid === a.pid && !cerrada(x));
      for (const x of otros) a.otrosTurnos.push({ iso, tid: x.tid, localId: x.localId, franja: x.franja });
      a.soloTurno[iso] = !otros.length;
      if (!otros.length) continue;
      // hacía partido y se queda con la otra mitad: la conserva con su tramo del partido (repartoDelDia),
      // no pasa sola a turno completo (24/09, revisión F2: Hojan, El 33 de 11:00 a 16:00, no de 07:00)
      const partido = FRANJAS.every(f => a.turnos.some(t => t.iso === iso && t.franja === f) || otros.some(x => x.franja === f));
      const conTramo = x => {
        if (!partido) return '';
        const h = horarioDe(localDe(cfg, x.localId), isoDow(iso), x.franja, true, x.abre ? x.franja : null);
        return h ? ` (hacía partido: se queda con su ${FRANJA_LBL[x.franja].toLowerCase()} en ${(localDe(cfg, x.localId) || { nombre: x.localId }).nombre} de ${h.ini} a ${h.fin})` : '';
      };
      a.avisos.push(`el ${diaYNum(iso)} también hace ${otros.map(x => `${(localDe(cfg, x.localId) || { nombre: x.localId }).nombre} por la ${FRANJA_LBL[x.franja].toLowerCase()}${conTramo(x)}`).join(' y ')}`);
    }
  }
  return [...porPid.values()];
}
// Dónde puede apoyar esa persona cada día del cierre: casillas abiertas de la misma franja en otros
// locales en las que puede estar con el permiso del cierre, primero las que tienen gente de menos,
// luego sus otros locales y luego la menos cubierta. { iso: [{ tid, localId, franja, faltan, n, min, razon }] }
function sugerenciasRefuerzo(cfg, staff, est, c, pid) {
  const out = {};
  const p = personaDe(staff, pid);
  if (!p) return out;
  const a = afectadosPorCierre(cfg, staff, est, c).find(x => x.pid === pid);
  const claves = a ? [...new Set(a.turnos.map(t => t.iso + '|' + t.franja))] : [];
  // se simula el cierre ya puesto, con su apoyo y sin las plazas de las casillas cerradas
  const c2 = Object.assign({}, c, { decisiones: Object.assign({}, c.decisiones || {}, { [pid]: { tipo: 'REFUERZA', turnos: claves } }) });
  const cfg2 = Object.assign({}, cfg, { cierresPuntuales: cierresDe(cfg).filter(x => x.id !== c.id).concat([c2]) });
  const sim = clonarEstado(est);
  for (const iso of diasDeCierre(c)) for (const f of c.dias[iso]) if (sim.asig[iso]) delete sim.asig[iso][turnoId(c.localId, f)];
  for (const k of claves) {
    const [iso, franja] = k.split('|');
    const xs = [];
    for (const t of turnosDe(cfg)) {
      if (t.franja !== franja || t.localId === c.localId || !turnoAbierto(cfg2, sim, iso, t.id)) continue;
      if (!puedeEstar(cfg2, staff, sim, iso, t.id, pid).ok) continue;
      const rev = revisarTurno(cfg2, staff, sim, iso, t.id);
      xs.push({ iso, tid: t.id, localId: t.localId, franja, faltan: rev.faltan, n: rev.n, min: rev.minimo, suyo: (p.locales || []).includes(t.localId), razon: rev.faltan ? `falta${rev.faltan > 1 ? 'n' : ''} ${rev.faltan} (hay ${rev.n} de ${rev.minimo})` : `tiene ${rev.n} de ${rev.minimo}` });
    }
    xs.sort((x, y) => (y.faltan > 0) - (x.faltan > 0) || y.faltan - x.faltan || (y.suyo ? 1 : 0) - (x.suyo ? 1 : 0) || (x.n - x.min) - (y.n - y.min) || (x.tid < y.tid ? -1 : 1));
    out[iso] = (out[iso] || []).concat(xs);
  }
  return out;
}
// pone a quien apoya en su destino de ese día (al aplicar el cierre y al regenerar)
function ponerApoyoCierre(cfg, staff, est, c, pid, iso, tid) {
  if (pidsEn(est, iso, tid).includes(pid)) return { ok: true, ya: true };
  const l = localDe(cfg, c.localId), m = motivoCierreTxt(c);
  return asignar(est, cfg, staff, iso, tid, pid, { origen: 'cierre', razon: `apoyo: ${l ? l.nombre : c.localId} cerrado${m ? ` (${m})` : ''}` });
}
// Cierra el local (o edita un cierre que ya existe: primero se deshace y luego se vuelve a aplicar).
//  1. valida y guarda el cierre en cfg.cierresPuntuales;
//  2. retira TODAS las plazas de las casillas cerradas del rango (también las puestas a mano: lo
//     decide el encargado en el visor, persona por persona) y las guarda en c.retirados, para poder
//     devolverlas al reabrir. Se acaban las plazas fantasma, que seguían contando en las horas;
//  3. VAC y LD: la ausencia de los días en que el turno cerrado era su único turno; si ese día tenía
//     otro turno, la ausencia es solo de la franja cerrada (D10, fase 3: hasta entonces la parte
//     cerrada contaba como sin trabajo, porque las ausencias eran de día entero) y se avisa;
//  4. APOYO con destino: se le pone allí, con origen 'cierre' (lo vuelve a poner el generador);
//  5. SIN: solo la decisión. Sin decisión explícita = SIN.
// est tiene que cubrir todos los días del cierre (estado virtual del rango).
function aplicarCierre(cfg, staff, est, c, decisiones) {
  const res = { ok: false, errores: [], cierre: c, retirados: 0, ausencias: [], puestos: [], rechazados: [], avisos: [], deshecho: null };
  const v = validarCierre(cfg, c);
  if (!v.ok) { res.errores = v.errores; return res; }
  if (c.id && cierresDe(cfg).some(x => x.id === c.id)) res.deshecho = quitarCierre(cfg, staff, est, c.id, { devolver: true, quitarVacaciones: true });
  const l = localDe(cfg, c.localId);
  const entrada = decisiones || c.decisiones || {};
  const valida = t => DECISIONES_CIERRE.some(x => x.id === t);
  // Al editar: lo retirado por el cierre de antes que no pudo volver a su casilla en el paso de en
  // medio (se había forzado a la persona en otra casilla esa franja, por ejemplo). Si su casilla sigue
  // cerrada, sigue retirado y con su decisión; si no, se avisa (24/09, revisión F2: se perdía de
  // c.retirados, el visor no lo enseñaba y al reabrir ya no volvía).
  const pendientes = [];
  for (const x of (res.deshecho && res.deshecho.noDevueltos) || []) {
    if (!x.entry) continue;
    const { localId, franja } = partirTurno(x.tid);
    if (dentroDeCierre(c, x.iso, x.tid)) pendientes.push({ iso: x.iso, tid: x.tid, entry: x.entry });
    else res.avisos.push(`${nombreDe(staff, x.pid)} no ha podido volver a ${(localDe(cfg, localId) || { nombre: localId }).nombre} el ${diaYNum(x.iso)} por la ${FRANJA_LBL[franja].toLowerCase()}: ${x.motivo}`);
  }
  const af = afectadosPorCierre(cfg, staff, est, c, { pendientes });
  // Solo reciben decisión quienes trabajaban en las casillas cerradas, y vale solo en esas franjas
  // (d.turnos). Una decisión de otra persona (la que reenvía el visor al editar, de alguien que ya no
  // está afectado) se ignora: sin alcance valía en todas las franjas cerradas y dejaba «sin trabajo»
  // a quien nunca estuvo en el local cerrado (24/09, revisión F2).
  const dec = {};
  for (const a of af) {
    const d0 = entrada[a.pid] || {};
    const turnos = [...new Set(a.turnos.map(t => t.iso + '|' + t.franja))];
    const d = { tipo: valida(d0.tipo) ? d0.tipo : 'SIN', turnos };
    // el destino de apoyo, solo en los días y franjas que tenía cerrados (revisión F2: el de un día
    // que ya no cierra se quedaba guardado y salía rechazado al editar y en cada generación)
    if (d.tipo === 'REFUERZA' && d0.destinos) {
      const ds = {};
      for (const [iso, t] of Object.entries(d0.destinos)) {
        const bien = [].concat(t).filter(tid => typeof tid === 'string' && tid && turnos.includes(iso + '|' + partirTurno(tid).franja));
        if (bien.length) ds[iso] = Array.isArray(t) ? bien : bien[0];
      }
      if (Object.keys(ds).length) d.destinos = ds;
    }
    dec[a.pid] = d;
  }
  c.decisiones = dec;
  c.retirados = [];
  // los días que aún no tenían planilla al cerrar: solo en ellos cuenta la semana tipo (estabaEnCierre)
  c.deSemanaTipo = diasDeCierre(c).filter(iso => !diaConPlanilla(est, iso) && !pendientes.some(r => r.iso === iso));
  if (!Array.isArray(cfg.cierresPuntuales)) cfg.cierresPuntuales = [];
  cfg.cierresPuntuales.push(c);
  for (const iso of diasDeCierre(c)) for (const f of c.dias[iso]) {
    const tid = turnoId(c.localId, f);
    const lista = asignados(est, iso, tid);
    if (!lista.length) continue;
    for (const entry of lista) c.retirados.push({ iso, tid, entry: JSON.parse(JSON.stringify(entry)) });
    res.retirados += lista.length;
    // solo la casilla: el día sigue enlazado con su mes aunque est sea un estado virtual del rango
    delete est.asig[iso][tid];
    if (est.manual && est.manual[iso]) delete est.manual[iso][tid];
  }
  for (const r of pendientes) c.retirados.push({ iso: r.iso, tid: r.tid, entry: JSON.parse(JSON.stringify(r.entry)) });
  const detalle = `cierre de ${l.nombre} · ${motivoCierreTxt(c) || etiquetaCierre(c).toLowerCase()}`;
  for (const a of af) {
    const d = dec[a.pid];
    if (d.tipo !== 'VAC' && d.tipo !== 'LD') continue;
    const p = personaDe(staff, a.pid);
    if (!p) continue;
    const dias = [], parciales = {};
    for (const iso of [...new Set(a.turnos.map(t => t.iso))]) {
      if (!a.soloTurno[iso]) {
        // ese día también trabaja en otro local: vacaciones (o libre) solo de la franja cerrada (D10)
        const fs = FRANJAS.filter(f => a.turnos.some(t => t.iso === iso && t.franja === f) && !ausenciaEn(p, iso, f));
        const otros = a.otrosTurnos.filter(t => t.iso === iso).map(t => `${(localDe(cfg, t.localId) || { nombre: t.localId }).nombre} por la ${FRANJA_LBL[t.franja].toLowerCase()}`);
        res.avisos.push(`${p.nombre}: el ${diaYNum(iso)} también trabaja en ${otros.join(' y ')}, así que ${d.tipo === 'VAC' ? 'las vacaciones son' : 'el día libre es'} solo de la ${fs.map(f => FRANJA_LBL[f].toLowerCase()).join(' y ') || 'franja cerrada'}`);
        if (fs.length) { parciales[iso] = fs; dias.push(iso); }
        continue;
      }
      // solo ese turno ese día: el día entero, salvo que ese día ya tenga una ausencia de la otra franja
      // (un permiso por la mañana): entonces, solo la franja cerrada (revisión F3; antes no se ponía
      // nada y la tarde quedaba como «sin trabajo»)
      if (ausenciaEn(p, iso)) {
        const fs = FRANJAS.filter(f => a.turnos.some(t => t.iso === iso && t.franja === f) && !ausenciaEn(p, iso, f));
        if (fs.length) { parciales[iso] = fs; dias.push(iso); }
        continue;
      }
      dias.push(iso);
    }
    // tramos seguidos con las mismas franjas (una media jornada va sola)
    const tramos = [];
    for (const iso of dias) { const k = String(parciales[iso] || ''), u = tramos[tramos.length - 1]; if (u && u.k === k && addDias(u.hasta, 1) === iso) u.hasta = iso; else tramos.push({ desde: iso, hasta: iso, k, franjas: parciales[iso] }); }
    for (const tr of tramos) anadirAusencia(p, Object.assign({ tipo: d.tipo, desde: tr.desde, hasta: tr.hasta, detalle }, tr.franjas ? { franjas: tr.franjas } : {}));
    d.dias = dias;   // los días que puso el cierre: son los únicos que se quitan al reabrir
    if (Object.keys(parciales).length) d.parciales = parciales;   // y, de esos, los de media jornada
    if (dias.length) res.ausencias.push({ pid: a.pid, tipo: d.tipo, dias });
  }
  for (const [pid, d] of Object.entries(dec)) {
    if (d.tipo !== 'REFUERZA' || !d.destinos) continue;
    for (const [iso, t] of Object.entries(d.destinos)) for (const tid of [].concat(t).filter(Boolean)) {
      const r = ponerApoyoCierre(cfg, staff, est, c, pid, iso, tid);
      if (r.ok) { if (!r.ya) res.puestos.push({ iso, tid, pid }); }
      else res.rechazados.push({ iso, tid, pid, motivo: r.motivo });
    }
  }
  res.ok = true;
  return res;
}
// Reabre: el cierre sale de la lista y el local vuelve a su horario. Los apoyos que puso el cierre
// (automáticos) salen; con quitarVacaciones se quitan SOLO los días de VAC/LD que puso el cierre, día
// a día (anadirAusencia pudo fundirlos con otras vacaciones de la persona: nunca se borra la ausencia
// entera); con devolver, lo retirado vuelve a su casilla si la persona puede estar.
function quitarCierre(cfg, staff, est, id, opts) {
  const o = opts || {};
  const res = { ok: false, cierre: null, devueltos: [], noDevueltos: [], vacacionesQuitadas: [], apoyosQuitados: [] };
  const cs = cierresDe(cfg);
  const i = cs.findIndex(x => x.id === id);
  if (i < 0) return res;
  const c = cs[i];
  res.cierre = c;
  cs.splice(i, 1);
  // quien apoyaba: sale de su destino (origen 'cierre') y de lo automático que, sin el permiso del
  // cierre, ya no puede estar (el generador lo puso «donde hacía falta» fuera de sus locales). Lo
  // puesto a mano o forzado se queda.
  for (const [pid, d] of Object.entries(c.decisiones || {})) {
    if (!d || d.tipo !== 'REFUERZA') continue;
    const casillas = new Set();
    for (const iso of diasDeCierre(c)) for (const f of c.dias[iso]) for (const t of turnosDe(cfg)) if (t.franja === f) casillas.add(iso + '|' + t.id);
    for (const [iso, t] of Object.entries(d.destinos || {})) for (const tid of [].concat(t).filter(Boolean)) casillas.add(iso + '|' + tid);
    for (const k of casillas) {
      const [iso, tid] = k.split('|');
      const e = asignados(est, iso, tid).find(x => x.pid === pid);
      if (!e || !esAutomatica(e)) continue;
      if (e.origen !== 'cierre' && puedeEstar(cfg, staff, est, iso, tid, pid, { yaDentro: true, permitirPartido: true }).ok) continue;
      if (retirarEntrada(est, cfg, staff, iso, tid, pid)) res.apoyosQuitados.push({ iso, tid, pid });
    }
  }
  if (o.quitarVacaciones) for (const [pid, d] of Object.entries(c.decisiones || {})) {
    if ((d.tipo !== 'VAC' && d.tipo !== 'LD') || !Array.isArray(d.dias)) continue;
    const p = personaDe(staff, pid);
    if (!p) continue;
    for (const iso of d.dias) {
      // solo la que puso el cierre: su tipo y, si fue de media jornada, sus franjas (D10)
      const fs = String((d.parciales || {})[iso] || '');
      const a = (p.ausencias || []).find(x => x.tipo === d.tipo && iso >= x.desde && (!x.hasta || iso <= x.hasta) && String(franjasAusencia(x) || '') === fs);
      if (!a) continue;
      p.ausencias = quitarDiaDeAusencia(p.ausencias, iso, x => x === a);
      res.vacacionesQuitadas.push({ pid, iso, tipo: d.tipo });
    }
  }
  if (o.devolver) for (const r of c.retirados || []) {
    const e = r.entry;
    if (!e || !e.pid || pidsEn(est, r.iso, r.tid).includes(e.pid)) continue;
    const pe = turnoAbierto(cfg, est, r.iso, r.tid) ? puedeEstar(cfg, staff, est, r.iso, r.tid, e.pid, { forzar: !!e.forzado, permitirPartido: true }) : { ok: false, motivo: motivoCerrado(cfg, r.iso, r.tid).motivo };
    if (!pe.ok) { res.noDevueltos.push({ iso: r.iso, tid: r.tid, pid: e.pid, motivo: pe.motivo, entry: JSON.parse(JSON.stringify(e)) }); continue; }
    const lista = ((est.asig[r.iso] = est.asig[r.iso] || {})[r.tid] = est.asig[r.iso][r.tid] || []);
    lista.push(JSON.parse(JSON.stringify(e)));
    normalizarCasilla(est, cfg, staff, r.iso, r.tid);
    res.devueltos.push({ iso: r.iso, tid: r.tid, pid: e.pid });
  }
  res.ok = true;
  return res;
}
// Reabre un cierre a partir de una fecha: los días anteriores siguen cerrados con lo que se decidió (sus
// plazas no se trabajaron y sus vacaciones sí se cogieron); del resto, lo retirado vuelve y se quitan
// las vacaciones o libres que puso el cierre. Si no queda ningún día anterior, se reabre entero. Es lo
// que pasa al volver a marcar un día en «Cuándo abre» (24/09, revisión F2): el cierre de los días ya
// planificados que dejó al quitarlo no puede seguir mandando sobre el horario.
function reabrirCierreDesde(cfg, staff, est, id, desde) {
  const c = cierresDe(cfg).find(x => x.id === id);
  if (!c) return { ok: false, cierre: null };
  const quedan = diasDeCierre(c).filter(iso => iso < desde);
  if (!quedan.length) return Object.assign(quitarCierre(cfg, staff, est, id, { devolver: true, quitarVacaciones: true }), { parcial: false });
  const c2 = Object.assign({}, c, { dias: Object.fromEntries(quedan.map(iso => [iso, c.dias[iso].slice()])) });
  const r = aplicarCierre(cfg, staff, est, c2, JSON.parse(JSON.stringify(c.decisiones || {})));
  const q = r.deshecho || { devueltos: [], noDevueltos: [], vacacionesQuitadas: [], apoyosQuitados: [] };
  // lo que devolvió y no volvió a retirar: solo lo de los días que reabren
  return { ok: r.ok, parcial: true, cierre: c2, quedan, avisos: r.avisos,
    devueltos: q.devueltos.filter(x => x.iso >= desde), noDevueltos: q.noDevueltos.filter(x => x.iso >= desde),
    vacacionesQuitadas: q.vacacionesQuitadas.filter(x => x.iso >= desde), apoyosQuitados: q.apoyosQuitados.filter(x => x.iso >= desde) };
}
// Al generar (después de la semana tipo): vuelve a poner a quien apoya en su destino, así sobrevive
// a «Vaciar lo generado». opts.desdeIso: no toca los días pasados.
function instanciarCierres(cfg, staff, est, desde, hasta, opts) {
  const o = opts || {};
  const r = { aplicados: [], rechazados: [] };
  for (const c of cierresDe(cfg)) for (const [pid, d] of Object.entries(c.decisiones || {})) {
    if (!d || d.tipo !== 'REFUERZA' || !d.destinos) continue;
    for (const [iso, t] of Object.entries(d.destinos)) {
      if (iso < desde || iso > hasta || (o.desdeIso && iso < o.desdeIso)) continue;
      for (const tid of [].concat(t).filter(Boolean)) {
        const a = ponerApoyoCierre(cfg, staff, est, c, pid, iso, tid);
        if (a.ok && !a.ya) r.aplicados.push({ iso, turnoId: tid, pid, origen: 'cierre', razon: a.entry.razon });
        else if (!a.ok) r.rechazados.push({ iso, turnoId: tid, pid, motivo: a.motivo });
      }
    }
  }
  return r;
}
// Quien apoya por un cierre («donde haga falta») y ese día aún no está puesto en ninguna casilla de
// su franja: [{ pid, franja, cierre }]. No «libra» ni está «sin turno»: está de apoyo, aún sin sitio.
// Una sola lectura para el Generador, la revisión y las vistas (24/09, revisión F2: Yilian salía de
// apoyo en Hoy y en su perfil, y a la vez como que libraba en Semana, el Generador y la hoja).
function apoyosSinSitio(cfg, staff, est, iso) {
  const out = [];
  for (const c of cierresDe(cfg)) {
    const fs = (c.dias && c.dias[iso]) || [];
    if (!fs.length) continue;
    for (const [pid, d] of Object.entries(c.decisiones || {})) {
      if (!d || d.tipo !== 'REFUERZA') continue;
      const p = personaDe(staff, pid);
      if (!p) continue;
      for (const f of fs) {
        if (ausenciaEn(p, iso, f)) continue;   // por franja (D10)
        if (Array.isArray(d.turnos) && !d.turnos.includes(iso + '|' + f)) continue;
        if (out.some(x => x.pid === pid && x.franja === f)) continue;
        if (turnosDe(cfg).some(t => t.franja === f && pidsEn(est, iso, t.id).includes(pid))) continue;
        out.push({ pid, franja: f, cierre: c });
      }
    }
  }
  return out;
}
// Las franjas de ese día en las que la persona estaba en un local cerrado por fechas (con decisión o
// sin ella). Con ellas, repartoDelDia sabe que su otra mitad era de un partido.
function mitadesCerradas(cfg, pid, iso) {
  if (!cierresDe(cfg).length) return [];
  return FRANJAS.filter(f => !!decisionCierre(cfg, pid, iso, f));
}
// Los cierres que se hicieron al quitar ese día y franja en «Cuándo abre» (c.origen.abre): al volver a
// marcarlo se ofrece reabrirlos (24/09, revisión F2: el cierre de los domingos ya planificados se
// quedaba escondido y mandaba sobre el horario aunque se volviera a marcar el domingo).
function cierresDelHorario(cfg, localId, franja, dow) {
  return cierresDe(cfg).filter(c => c.localId === localId && c.origen && c.origen.abre && c.origen.abre.franja === franja && +c.origen.abre.dow === +dow);
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
// mínimo de una casilla: el de la tabla del local + el refuerzo de los eventos del día. Con est, la
// casilla abierta a mano ese día trae su propio mínimo (abrirCasilla, S28, 24/09), que manda sobre
// la tabla (que para un día que no abre suele ser 0).
function minimoDe(cfg, iso, tid, est) {
  const { localId, franja } = partirTurno(tid);
  const l = localDe(cfg, localId);
  const dow = isoDow(iso);
  const ov = est && est.apertura && est.apertura[iso] && est.apertura[iso][tid];
  const aMano = !!ov && typeof ov === 'object' && ov.min !== undefined && ov.min !== null;
  const base = aMano ? Math.max(0, +ov.min || 0) : l && l.minimos && l.minimos[franja] && l.minimos[franja][dow] !== undefined ? +l.minimos[franja][dow] : 0;
  const supuesto = !aMano && !!(l && l.supuestos && l.supuestos[franja] && l.supuestos[franja][dow]);
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
// 24/09 (D10, fase 3): una ausencia puede ser solo de una franja — { tipo, desde, hasta, franjas:
// ['M'] } —. La Cobertura deja elegir «Mañana» o «Tarde» y apuntaba el día entero: el permiso
// «médico por la mañana» de Mari Luz le quitaba también la tarde al regenerar, y la Revisión la
// daba por ausente. Sin franjas (lo guardado antes) es el día entero, como siempre.
// Las franjas de una ausencia: null = el día entero (sin franjas, o las dos)
function franjasAusencia(a) {
  const fs = a && Array.isArray(a.franjas) ? FRANJAS.filter(f => a.franjas.includes(f)) : [];
  return fs.length && fs.length < FRANJAS.length ? fs : null;
}
// ¿Está ausente ese día (y, con franja, esa franja)? Sin franja: cualquier ausencia de ese día,
// también la de media jornada (quien pregunta por el día entero —vistas, nómina— la ve).
// Con tipo, solo las de ese tipo (la nómina: un permiso por la mañana y vacaciones por la tarde el
// mismo día son dos cosas; revisión F3).
function ausenciaEn(persona, iso, franja, tipo) {
  for (const a of persona.ausencias || []) {
    if (iso < a.desde || (a.hasta && iso > a.hasta)) continue;
    if (tipo && a.tipo !== tipo) continue;
    const fs = franja ? franjasAusencia(a) : null;
    if (fs && !fs.includes(franja)) continue;
    return a;
  }
  return null;
}
// «de permiso» o, si es de media jornada, «de permiso por la mañana»
function textoFranjasAusencia(a) { const fs = franjasAusencia(a); return fs ? ` por la ${FRANJA_LBL[fs[0]].toLowerCase()}` : ''; }
// 24/09 (revisión F3, D10): cómo se enseña una ausencia en las vistas: «Permiso por la mañana» y, en
// corto, «PERM · mañana». Una sola etiqueta para Hoy, Semana, Mes, Equipo, la hoja impresa y el perfil
// del empleado: cada una ponía el tipo sin la franja y una media jornada parecía el día entero.
function etiquetaAusencia(a, corta) {
  if (!a) return '';
  const fs = franjasAusencia(a);
  if (corta) return a.tipo + (fs ? ' · ' + FRANJA_LBL[fs[0]].toLowerCase() : '');
  return ((AUS_LBL[a.tipo] || {}).label || a.tipo) + textoFranjasAusencia(a);
}
// quita un día de las ausencias; con filtro, solo de las que lo cumplen (el cierre quita SU
// media jornada de vacaciones, no las demás ausencias de ese día)
function quitarDiaDeAusencia(ausencias, iso, filtro) {
  const out = [];
  for (const a of ausencias || []) {
    const h = a.hasta || a.desde;
    if (iso < a.desde || iso > h || (filtro && !filtro(a))) { out.push(a); continue; }
    if (a.desde < iso) out.push(Object.assign({}, a, { hasta: addDias(iso, -1) }));
    if (h > iso) out.push(Object.assign({}, a, { desde: addDias(iso, 1), hasta: a.hasta }));
  }
  return out;
}
// alta sin duplicados: si solapa o toca otra del mismo tipo (y de las mismas franjas), se alarga
// esa. Mañana y tarde a la vez es el día entero: se guarda sin franjas.
function anadirAusencia(persona, aus) {
  const a = Object.assign({}, aus);
  if (!a.hasta && a.tipo !== 'BAJ') a.hasta = a.desde;
  if (a.hasta && a.hasta < a.desde) a.hasta = a.desde;
  const fa = franjasAusencia(a);
  if (fa) a.franjas = fa; else delete a.franjas;
  persona.ausencias = persona.ausencias || [];
  const mismas = (x, y) => String(franjasAusencia(x) || '') === String(franjasAusencia(y) || '');
  const toca = (x, y) => !mismas(x, y) ? false : (!x.hasta || !y.hasta) ? (x.tipo === y.tipo && x.tipo === 'BAJ') : !(addDias(x.hasta, 1) < y.desde || addDias(y.hasta, 1) < x.desde);
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
// 24/09 (reunión, decisiones.md principio 3): la fecha es OBLIGATORIA. Sin ella se miraba el
// reloj (fechaMadrid()) y el Generador dejaba sin comprobar las condiciones de quien estaba de
// baja HOY aunque hubiera vuelto la semana que se generaba. tests/debaja-fecha.test.mjs impide
// volver a llamarla con un solo argumento.
function deBaja(persona, iso) {
  if (!iso) throw new TypeError('deBaja(p, iso): falta la fecha (el modelo no mira el reloj)');
  const a = ausenciaEn(persona, iso);
  return !!(a && a.tipo === 'BAJ');
}

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
// el nombre que se le enseña al encargado cuando algo choca: las seis primeras son las
// características de la ficha (se corrigen en Equipo); las otras cuatro, situaciones que no
// se pueden forzar de ninguna manera.
const REGLA_NOMBRE = {
  locales: 'Locales donde trabaja', franjas: 'Mañanas y tardes', libra: 'Días que libra',
  vetos: 'No hace (local y franja)', partido: 'Días de partido', nuncaCon: '«Nunca con»',
  standby: 'En standby', cerrado: 'El local no abre', duplicado: 'Ya está en la casilla',
  ausencia: 'Ausencia', otraFranja: 'Ya está en otro bar esa franja',
  cierre: 'Cierre del local',   // 24/09 (D11): cerrado por fechas, o sin trabajo mientras cierra
  cocina: 'Cocina',   // 24/09 (S34): solo hace cocina, o ya lleva la cocina ese día, y el puesto es de sala
};
function nombreRegla(k) { return REGLA_NOMBRE[k] || k || ''; }
function regla(cfg, k) { return !(cfg && cfg.reglas && cfg.reglas[k] === false); }
function caracteristicaActiva(p, k) { return !(p && Array.isArray(p.inactivas) && p.inactivas.includes(k)); }

// ---------- capa de lectura de la ficha ----------
// 24/09 (reunión: «que se hable bien equipo con el generador», «que lea todas las variables»):
// lo que se configura en la ficha se lee AQUÍ, en un solo sitio, y todos los caminos (selector,
// semana tipo, relleno, Generador semanal y su verificación, núcleo, hoja impresa y vistas)
// llaman a estas funciones en vez de mirar p.libra o p.partido por su cuenta. Así «esta semana
// libra el martes» quiere decir lo mismo al generar que en el Mes, en Hoy o en la Cobertura.
// Un interruptor (regla del grupo o característica de la ficha) se obedece igual en todos.
function activa(cfg, p, k) { return regla(cfg, k) && caracteristicaActiva(p, k); }
function lunesDe(iso) { return addDias(iso, 1 - isoDow(iso)); }
// Día libre puntual (José, 17/09): una semana concreta se libra otro día y a la siguiente se
// vuelve al de siempre. Desde el 24/09 es una LISTA por semanas —p.libraPuntual = [{ semana:
// <lunes iso>, dias: [dow] }, …]— para poder dejar varias semanas preparadas; hasta entonces
// cabía una sola ({ semana, dias }). Se leen las dos formas y limpiarLibrePuntual (al cargar,
// desde migrarEstado) deja la lista.
function librasPuntuales(p) {
  const lp = p && p.libraPuntual;
  if (!lp) return [];
  return (Array.isArray(lp) ? lp : [lp]).filter(x => x && typeof x.semana === 'string' && Array.isArray(x.dias));
}
// el cambio de la semana de ese día (una semana sin días no cambia nada)
function libraPuntualDe(p, iso) { const l = lunesDe(iso); return librasPuntuales(p).find(x => x.semana === l && x.dias.length) || null; }
function libraPuntualVigente(p, iso) { return !!libraPuntualDe(p, iso); }
// ¿libra ese día? Con cambio esa semana mandan los días del cambio; si no, los de siempre.
// (El interruptor «Días que libra» lo mira quien llama, con activa(cfg, p, 'libra').)
function libraEn(p, iso) {
  if (!p) return false;
  const lp = libraPuntualDe(p, iso);
  return (lp ? lp.dias : (p.libra || [])).includes(isoDow(iso));
}
// el motivo «libra» tal como se enseña (selector, avisos de la planilla, retiradas, hoja impresa):
// «libra los miércoles» o, con un cambio esa semana, «libra el martes esta semana» (24/09,
// revisión: «libra los martes esta semana» sonaba a todos los martes)
function motivoLibra(p, iso) {
  const dow = isoDow(iso);
  return libraPuntualVigente(p, iso) ? `libra ${textoDiasEl([dow])} esta semana` : `libra ${DOW_PL[dow]}`;
}
// guarda el cambio de una semana (o lo quita, con dias = []) sin tocar las demás semanas.
// Marcar justo sus días de siempre no es un cambio (24/09, revisión: se guardaba «libra miércoles
// en vez de miércoles»): esa semana se queda sin cambio.
function ponerLibraPuntual(p, lunes, dias) {
  const sem = lunesDe(lunes);
  const resto = librasPuntuales(p).filter(x => x.semana !== sem && x.dias.length).map(x => ({ semana: x.semana, dias: x.dias.slice() }));
  const ds = [...new Set((dias || []).map(Number))].filter(d => d >= 1 && d <= 7).sort((a, b) => a - b);
  const hab = [...new Set(((p && p.libra) || []).map(Number))].sort((a, b) => a - b);
  const igual = ds.length === hab.length && ds.every((d, i) => d === hab[i]);
  if (ds.length && !igual) resto.push({ semana: sem, dias: ds });
  resto.sort((a, b) => (a.semana < b.semana ? -1 : a.semana > b.semana ? 1 : 0));
  p.libraPuntual = resto.length ? resto : null;
  return p.libraPuntual;
}
// al cargar la planilla: la forma de antes del 24/09 pasa a lista y las semanas ya pasadas
// se borran solas (caducan). Devuelve cuántas semanas pasadas se han borrado.
function limpiarLibrePuntual(staff, hoyIso) {
  const lunes = lunesDe(hoyIso); let n = 0;
  for (const p of staff || []) {
    if (p.libraPuntual === undefined) continue;
    const todas = librasPuntuales(p);
    n += todas.filter(x => x.semana < lunes).length;
    const vivas = todas.filter(x => x.semana >= lunes && x.dias.length).map(x => ({ semana: x.semana, dias: x.dias.slice() }));
    p.libraPuntual = vivas.length ? vivas : null;
  }
  return n;
}
const textoDiasEl = ds => ds.map(d => 'el ' + DOW_LBL[d]).join(' y ');   // «el martes y el jueves»
const textoDiasPl = ds => ds.map(d => DOW_PL[d]).join(' y ');             // «los miércoles»
// «libra martes (en vez de miércoles)»: el cambio de una semana tal como lo enseñan la tarjeta
// de Equipo, la ficha y la Cobertura (corto: sin el «en vez de»)
function textoCambioLibre(p, lp, corto) {
  const hab = (p && p.libra) || [];
  const dias = ((lp && lp.dias) || []).map(d => DOW_LBL[d]).join(' y ');
  return `libra ${dias}${!corto && hab.length ? ` (en vez de ${hab.map(d => DOW_LBL[d]).join(' y ')})` : ''}`;
}
// Qué cambia esa semana: los días que ahora libra y trabajaba (nuevos) y los que libraba y
// ahora trabaja (liberados), emparejados en orden —«libra martes en vez de miércoles» = el
// martes con el miércoles—. Si el número no cuadra no se empareja nada: solo se prohíben los
// días nuevos y se avisa (Lavinia libra lunes, martes y jueves: «esta semana el viernes» no
// dice cuál de los tres trabaja). null si no hay cambio o «Días que libra» está apagada.
function cambioDeLibre(cfg, p, iso) {
  if (!p || !activa(cfg, p, 'libra')) return null;
  const lp = libraPuntualDe(p, iso);
  if (!lp) return null;
  const hab = [...new Set(p.libra || [])].sort((a, b) => a - b), dias = [...new Set(lp.dias)].sort((a, b) => a - b);
  const nuevos = dias.filter(d => !hab.includes(d)), liberados = hab.filter(d => !dias.includes(d));
  const cuadra = nuevos.length === liberados.length;
  return { semana: lp.semana, dias, habituales: hab, nuevos, liberados, cuadra, pares: cuadra ? nuevos.map((d, i) => [d, liberados[i]]) : [] };
}
// ¿Puede hacer partido ese día? Los días declarados en la ficha y, la semana de un cambio de
// día libre, el partido del día que ahora libra pasa al día que ahora trabaja (D9, 24/09: el
// miércoles hace exactamente lo que habría hecho el martes, partido incluido). Con «Días de
// partido» apagada (en el grupo o en la ficha) no se mira: vale cualquier día.
function partidoEn(cfg, p, iso) {
  if (!p) return false;
  if (!activa(cfg, p, 'partido')) return true;
  const pd = p.partido || {};
  if (pd.siempre) return true;
  const dow = isoDow(iso), decl = pd.dias || [];
  const c = cambioDeLibre(cfg, p, iso);
  if (c) {
    const par = c.pares.find(x => x[1] === dow);
    if (par) return decl.includes(par[0]);
    if (c.pares.some(x => x[0] === dow)) return false;
  }
  return decl.includes(dow);
}
// Cómo está una persona un día, para las vistas (Mes, Hoy, Cobertura, perfil, Equipo): si libra
// (con el día libre de ESA semana), si es por un cambio puntual, si está ausente o en standby,
// y el texto que se enseña. Ninguna vista vuelve a mirar p.libra por su cuenta.
// Con franja, la ausencia es la de esa franja (D10: «de permiso por la mañana» no quita la tarde);
// sin ella, cualquiera de ese día, y el texto dice si es de media jornada.
function estadoDia(cfg, p, iso, franja) {
  const dow = isoDow(iso);
  const ausencia = p ? ausenciaEn(p, iso, franja) : null;
  const standby = !!(p && p.standby);
  const on = !!p && activa(cfg, p, 'libra');
  const puntual = on ? libraPuntualDe(p, iso) : null;
  const libra = on && libraEn(p, iso);
  const hab = (p && p.libra) || [];
  // 24/09 (D11): qué hace ese día por el cierre de su local (sin trabajo, apoyo…), con sus franjas
  let cierre = null;
  if (p) for (const f of FRANJAS) { const dc = decisionCierre(cfg, p.id, iso, f); if (dc) { cierre = cierre || { tipo: dc.tipo, cierre: dc.cierre, franjas: [], explicita: dc.explicita }; cierre.franjas.push(f); } }
  let texto = '';
  if (ausencia) texto = motivoAusencia(ausencia);
  else if (standby) texto = 'en standby';
  else if (libra && puntual) texto = `libra ${textoDiasEl([dow])} esta semana${hab.length ? ` (en vez de ${textoDiasPl(hab)})` : ''}`;
  else if (libra) texto = `libra ${DOW_PL[dow]}`;
  else if (cierre && cierre.tipo !== 'REFUERZA') texto = motivoSinTrabajo(cfg, cierre.cierre);
  else if (puntual && hab.includes(dow)) texto = `esta semana trabaja (libra ${textoDiasEl(puntual.dias)})`;
  return { libra, puntual, ausencia, standby, cierre, texto };
}

// ¿A quién cubre p en ESTA casilla? (24/09, S10 y S12, fase 3) Una sola lectura de «cubre a» para
// la semana tipo, el relleno, la Cobertura y la puerta (puedeEstar): el pid de quien falta, o null.
// Exige el interruptor (regla del grupo y característica de la ficha: activa); que quien falta esté
// ausente ese día y esa franja (o que esa semana libre ese día por un cambio de día libre, D9); que
// la casilla sea la suya —su plaza de la semana tipo ese día, donde está en la planilla, el turno de
// la designación o, si no sale en la semana tipo, su local y su franja—; el día y el turno de la
// designación; y su puesto: la cocina solo si él llevaba la cocina, y la sala solo si llevaba la
// sala. Antes «cubre a Susana Luna» sumaba en cualquier casilla del día y también en la cocina de
// Zapatillera, y con la regla apagada la semana tipo lo seguía aplicando.
// opts: { cocina: el puesto que se busca es la cocina; falta: solo a esa persona; suCasilla: quien
// llama sabe que la casilla es la suya (la Cobertura, o una entrada «por X» ya puesta); ausente:
// sabe que falta de ella (la incidencia de la Cobertura, también un cambio de turno); faltaCocina:
// si llevaba la cocina ahí (la Cobertura lo sabe por la planilla); concreta: solo vale una casilla
// concreta de X (su plaza, la planilla, el turno de la designación o suCasilla), no la regla de
// reserva de su local y su franja }
// 24/09 (revisión F3): la regla de reserva da la prioridad y el «por», pero no autoriza partidos (D1
// dice «solo en la casilla de X»): con Maydeth de baja sin fin, Hojan hacía partido «para cubrir a
// Maydeth» de miércoles a sábado en el Mónaco, mañana y tarde, porque las dos casillas eran «la suya».
function cubreEnCasilla(cfg, staff, est, p, iso, tid, opts) {
  const o = opts || {};
  if (!p || !Array.isArray(p.cubreA) || !p.cubreA.length || !activa(cfg, p, 'cubreA')) return null;
  const { localId, franja } = partirTurno(tid);
  const dow = isoDow(iso);
  for (const c of p.cubreA) {
    if (!c || !c.pid || c.pid === p.id || (o.falta && c.pid !== o.falta)) continue;
    if (c.turnoId && c.turnoId !== tid) continue;
    const x = personaDe(staff, c.pid);
    if (!x) continue;
    // la semana de un cambio de día libre, «cubre a X los miércoles» vale para el martes que ahora libra X
    const cl = cambioDeLibre(cfg, x, iso);
    const libraAhora = cl ? cl.pares.find(y => y[0] === dow) : null, trabajaAhora = cl ? cl.pares.find(y => y[1] === dow) : null;
    if (c.dow && +c.dow !== dow && !(libraAhora && +c.dow === libraAhora[1])) continue;
    if (!o.ausente && !ausenciaEn(x, iso, franja) && !(cl && cl.nuevos.includes(dow))) continue;
    // su sitio ese día (el día que ahora trabaja por un cambio, las plazas del día que libraba)
    const pl = plazasDe(cfg, trabajaAhora ? trabajaAhora[0] : dow).find(y => y.p === x.id && y.t === tid);
    const enPlanilla = est ? asignados(est, iso, tid).find(e => e.pid === x.id) : null;
    let cocinaX = null;
    if (pl) cocinaX = !!pl.c;
    else if (enPlanilla) cocinaX = !!enPlanilla.cocina;
    else if (!o.suCasilla && !c.turnoId) {
      // no sale en la semana tipo: su local y su franja (Susi, Laura y Maydeth, de baja desde septiembre).
      // Es la regla de reserva: no es una casilla concreta
      if (o.concreta) continue;
      if (TODOS.some(d => plazasDe(cfg, d).some(y => y.p === x.id))) continue;
      if ((x.locales || []).length && !x.locales.includes(localId)) continue;
      if ((x.franjas || []).length && !x.franjas.includes(franja)) continue;
    }
    if (o.faltaCocina !== undefined && o.faltaCocina !== null) cocinaX = !!o.faltaCocina;
    if (cocinaX === null) cocinaX = x.puesto === 'cocina' && puedeCocina(cfg, x, localId, iso);
    if (!!o.cocina !== cocinaX) continue;
    return x.id;
  }
  return null;
}
// Una entrada «por X» ya puesta cuya casilla SABEMOS que era la de X aunque X ya no esté en ella ni
// salga en la semana tipo: la que puso la Cobertura (X estaba en esa casilla al proponer) y el relevo
// (D3). Lo que puso el relleno con la regla de reserva no: su «por» es informativo (revisión F3).
function porDeSuCasilla(e) { return !!(e && (e.relevo || e.origen === 'cobertura')); }
// ¿En qué casilla lleva la cocina esa persona ese día? (el turno o null)
function cocinaDelDia(cfg, est, iso, pid) {
  for (const t of turnosDe(cfg)) if (asignados(est, iso, t.id).some(x => x.pid === pid && x.cocina)) return t.id;
  return null;
}

// ---------- reglas duras por persona ----------
function motivoAusencia(a) { return a ? (AUS_LBL[a.tipo] ? AUS_LBL[a.tipo].motivo : 'ausente') + textoFranjasAusencia(a) : ''; }
function lblLocales(cfg, ids) { return ids.map(id => (localDe(cfg, id) || { nombre: id }).nombre).join(' o '); }
// Devuelve {ok, motivo, avisos[], autorizados[]}. Las reglas «forzables» (locales, franjas, libra,
// vetos, cocina, partido, nunca con) se convierten en avisos con opts.forzar: el encargado
// distribuye «de la manera que quiera» y la app deja constancia. Cierres, ausencias
// y estar ya en otro local en la misma franja no se fuerzan nunca.
// 24/09 (fase 3):
//  · opts.cubrePor = X (D1, reunión: «Mariluz haría turno partido… prefiero que cubra»): si
//    cubreEnCasilla confirma que la persona cubre a X en esta casilla, un partido no declarado deja
//    de ser motivo y queda como aviso AUTORIZADO en `autorizados` ({ k: 'partido', texto: 'partido
//    para cubrir a X', autorizado: true, por: X }): informativo, no resta ni hunde un plan. No relaja
//    nada más (día libre, vetos, «nunca con», ausencia, franjas, locales, standby, cierre).
//    opts.cubreSuCasilla / opts.cubreAusente: quien llama sabe que la casilla es de X / que X falta
//    de ella (la Cobertura, una entrada «por X» ya puesta).
//  · opts.puesto = 'sala' (S34, Aroa 17/09): quien solo hace cocina, o ese día ya lleva la cocina en
//    otra casilla, no refuerza la sala (regla 'cocina', forzable). Antes vivía solo en el relleno;
//    ahora la dicen igual el generador, la Cobertura y el selector.
// 24/09 (revisión F3):
//  · la regla de cocina, en los dos sentidos: con opts.puesto = 'cocina', quien ese día ya está de
//    sala en otra casilla no entra a llevar una cocina (el generador ponía a Roberto de sala en
//    Pasarela y de cocina en Zapatillera, y la Revisión lo marcaba después). Lo ya puesto (yaDentro)
//    se avisa solo en la entrada de sala, para no contar dos veces el mismo choque.
//  · D1 solo en la casilla CONCRETA de X (cubreEnCasilla con concreta): la regla de reserva no
//    autoriza partidos. Y «la otra mitad» (la mañana de quien por la tarde está «por X») solo vale al
//    revisar lo ya puesto: para ponerla además en otra casilla, el partido sigue siendo motivo.
function puedeEstar(cfg, staff, est, iso, tid, pid, opts) {
  const o = opts || {};
  const p = personaDe(staff, pid);
  if (!p) return { ok: false, motivo: 'no existe', avisos: [], autorizados: [] };
  const { localId, franja } = partirTurno(tid);
  const l = localDe(cfg, localId);
  if (!l) return { ok: false, motivo: 'local desconocido', avisos: [], autorizados: [] };
  const dow = isoDow(iso);
  const avisos = [], autorizados = [];
  // 18/09 (Diego): «un aviso que cuando fuerzas un trabajador te diga QUÉ REGLA estás
  // incumpliendo». Cada motivo viaja con la clave de su regla, para poder nombrarla en el
  // selector, en el aviso de forzar y en el historial, e ir a corregir la ficha si hace falta.
  let m = null, mk = null;
  const forzable = (k, motivo) => { if (o.forzar) { avisos.push(motivo); return null; } mk = k; return motivo; };
  // cerrada: por fechas (regla 'cierre', con el motivo y las fechas) o por su horario semanal. No se fuerza.
  if (!turnoAbierto(cfg, est, iso, tid)) { const mc = motivoCerrado(cfg, iso, tid); return { ok: false, motivo: mc.motivo, regla: mc.regla, avisos, autorizados }; }
  if (!o.yaDentro && pidsEn(est, iso, tid).includes(pid)) return { ok: false, motivo: 'ya está en esta casilla', regla: 'duplicado', avisos, autorizados };
  const aus = ausenciaEn(p, iso, franja);   // por franja (D10): el permiso de la mañana no quita la tarde
  if (aus) return { ok: false, motivo: motivoAusencia(aus) + (aus.detalle ? ' · ' + aus.detalle : ''), regla: 'ausencia', avisos, autorizados };
  for (const t of turnosDe(cfg)) if (t.franja === franja && t.id !== tid && pidsEn(est, iso, t.id).includes(pid)) return { ok: false, motivo: `ya en ${t.local.nombre} esta ${FRANJA_LBL[franja].toLowerCase()}`, regla: 'otraFranja', avisos, autorizados };
  const act = k => activa(cfg, p, k);
  // 24/09 (D11): mientras su local cierra, quien no trabaja esos días (SIN, o VAC/LD que no se pudo
  // poner) no entra en otra casilla de esa franja salvo que el encargado lo fuerce: el generador y la
  // cobertura no redistribuyen a nadie solo. Quien apoya (REFUERZA) puede ir a cualquier local esa
  // franja sin forzar; el resto de su ficha (franjas, día libre, vetos, partido, «nunca con») vale igual.
  const dc = decisionCierre(cfg, pid, iso, franja);
  const apoyaCierre = !!dc && dc.tipo === 'REFUERZA';
  if (dc && !apoyaCierre) m = forzable('cierre', motivoSinTrabajo(cfg, dc.cierre));
  if (!m && !apoyaCierre && act('locales') && Array.isArray(p.locales) && p.locales.length && !p.locales.includes(localId)) m = forzable('locales', `solo ${lblLocales(cfg, p.locales)}`);
  if (!m && act('franjas') && Array.isArray(p.franjas) && p.franjas.length && !p.franjas.includes(franja)) m = forzable('franjas', p.franjas.length === 1 ? (p.franjas[0] === 'M' ? 'siempre de mañana' : 'solo tardes') : 'franja no permitida');
  if (!m && p.standby) m = forzable('standby', 'en standby: aún no entra en la planilla');
  const libraHoy = !m && act('libra') && libraEn(p, iso);
  if (libraHoy) m = forzable('libra', motivoLibra(p, iso));
  if (!m && act('vetos')) { const v = vetoDe(p, localId, franja, isoDow(iso)); if (v) m = forzable('vetos', textoVeto(v, l.nombre)); }
  // la sala (S34): quien solo hace cocina, o ya lleva la cocina ese día en otra casilla, no la refuerza
  if (!m && o.puesto === 'sala' && act('cocina')) {
    const tc = cocinaDelDia(cfg, est, iso, pid);
    if (p.soloCocina) m = forzable('cocina', 'solo hace cocina');
    else if (tc && tc !== tid) m = forzable('cocina', `ya lleva la cocina de ${(localDe(cfg, partirTurno(tc).localId) || { nombre: tc }).nombre} ese día`);
  } else if (!m && o.puesto === 'cocina' && !o.yaDentro && act('cocina')) {
    // y al revés: quien ese día ya está de sala no entra a llevar una cocina (revisión F3)
    const ts = turnosDe(cfg).find(t => t.id !== tid && asignados(est, iso, t.id).some(x => x.pid === pid && !x.cocina));
    if (ts) m = forzable('cocina', `ya está de sala en ${ts.local.nombre} ese día`);
  }
  // el partido se lee con partidoEn: días declarados y, la semana de un cambio de día libre,
  // trasladado al día que ahora trabaja (24/09); con la regla apagada no se mira. Si ese día libra,
  // el partido no se menciona (24/09, revisión: «libra el martes esta semana, no hace partido los
  // martes» contradecía su ficha: el aviso que importa es el del día libre)
  if (!m && !libraHoy) {
    const otra = franja === 'M' ? 'T' : 'M';
    const tOtra = turnosDe(cfg).find(t => t.franja === otra && pidsEn(est, iso, t.id).includes(pid));
    if (tOtra && !partidoEn(cfg, p, iso)) {
      // D1: el partido para cubrir a X en SU casilla, mientras X falta, está autorizado. Vale para las
      // dos mitades de lo ya puesto: esta, si viene a cubrir a X, y la otra, si la otra es la que está
      // «por X» (la mañana de Mari Luz no avisa de partido cuando su tarde cubre a Iván). Para ponerla
      // además en otra casilla, no (revisión F3: «solo en la casilla de X»)
      let x = o.cubrePor ? cubreEnCasilla(cfg, staff, est, p, iso, tid, { cocina: o.puesto === 'cocina' || !!o.cocina, falta: o.cubrePor, suCasilla: !!o.cubreSuCasilla, ausente: !!o.cubreAusente, concreta: true }) : null;
      if (!x && o.yaDentro) {
        const eo = asignados(est, iso, tOtra.id).find(q => q.pid === pid), porO = porDe(staff, eo);
        if (porO && cubreEnCasilla(cfg, staff, est, p, iso, tOtra.id, { cocina: !!eo.cocina, falta: porO, suCasilla: porDeSuCasilla(eo), concreta: true }) === porO) x = porO;
      }
      if (x) autorizados.push({ k: 'partido', texto: `partido para cubrir a ${nombreDe(staff, x)}`, autorizado: true, por: x });
      else if (o.permitirPartido) avisos.push(`partido no declarado ${DOW_PL[dow]}`);
      else m = forzable('partido', `no hace partido ${DOW_PL[dow]}`);
    }
  }
  if (!m && regla(cfg, 'nuncaCon')) {
    for (const q of asignados(est, iso, tid)) {
      if (q.pid === pid) continue;
      const qp = personaDe(staff, q.pid);
      if (!qp) continue;
      const mio = caracteristicaActiva(p, 'nuncaCon') && (p.nuncaCon || []).includes(q.pid);
      const suyo = caracteristicaActiva(qp, 'nuncaCon') && (qp.nuncaCon || []).includes(pid);
      if (!mio && !suyo) continue;
      // «nunca coincide» flexible (José, 17/09): se respeta si hay gente suficiente; si no,
      // se relaja y queda el aviso para que el encargado lo vea
      if (o.relajarNuncaCon && (p.nuncaConFlexible || qp.nuncaConFlexible)) { avisos.push(`nunca con ${qp.nombre}: no había nadie más`); continue; }
      m = forzable('nuncaCon', `nunca con ${qp.nombre}`); break;
    }
  }
  if (m) return { ok: false, motivo: m, regla: mk, avisos, autorizados };
  return { ok: true, motivo: null, regla: null, avisos, autorizados };
}

// ¿Qué reglas rompe AHORA MISMO tener a esta persona en esta casilla? El «forzado» que se
// guarda al ponerla es historia, y la historia no cambia; pero la ficha y la semana sí —un
// día libre puntual que se mueve, un veto que se quita, un turno que se cierra—, y la
// planilla no puede seguir avisando de un motivo que ya no existe (Diego y Aroa, 18/09:
// «puede ser que Lola esté puesta que libra los domingos y esta semana libra un miércoles»).
// Devuelve [] cuando ya no rompe nada.
// 24/09 (fase 3): la entrada se mira con su puesto (sala o cocina, S34) y con su «por X» (D1):
// el partido de quien está puesto para cubrir a X es un aviso autorizado mientras X falte, y
// vuelve a ser un aviso cuando X vuelve. revisarEntrada da los dos: { avisos, autorizados }.
// opts (la Cobertura, al mirar un relevo antes de marcarlo): { cubrePor, cubreSuCasilla, cubreAusente }.
function revisarEntrada(cfg, staff, est, iso, tid, pid, opts) {
  const e = asignados(est, iso, tid).find(x => x.pid === pid);
  const o = Object.assign({ forzar: true, yaDentro: true, puesto: e && e.cocina ? 'cocina' : 'sala' }, opts || {});
  const por = o.cubrePor || porDe(staff, e);
  // la casilla es la de X si lo sabe quien la puso (la Cobertura, el relevo) o si lo dice la semana
  // tipo o la planilla; el «por» de la regla de reserva no autoriza el partido (revisión F3)
  if (por && !o.cubrePor) Object.assign(o, { cubrePor: por, cubreSuCasilla: porDeSuCasilla(e) });
  const r = puedeEstar(cfg, staff, est, iso, tid, pid, o);
  return { avisos: r.ok ? r.avisos : r.avisos.concat(r.motivo ? [r.motivo] : []), autorizados: r.autorizados || [] };
}
function avisosVigentes(cfg, staff, est, iso, tid, pid) { return revisarEntrada(cfg, staff, est, iso, tid, pid).avisos; }

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
// opts: { cubrePor, cubreSuCasilla, cubreAusente } (fase 3, D1): quien entra a cubrir a X con el
// partido autorizado también puede abrir la tarde donde el local lo permite; si ya está en la
// casilla, vale su «por».
function puedePrimero(cfg, staff, est, iso, tid, pid, opts) {
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
      if (l && l.partidoAbre && l.partidoAbre[franja]) {
        // solo con el partido autorizado, es decir, en la casilla concreta de X (revisión F3)
        const o = opts || {}, en = asignados(est, iso, tid).find(x => x.pid === pid);
        const por = o.cubrePor || porDe(staff, en);
        const suya = o.cubrePor ? !!o.cubreSuCasilla : porDeSuCasilla(en);
        if (por && cubreEnCasilla(cfg, staff, est, p, iso, tid, { cocina: !!(en && en.cocina), falta: por, suCasilla: suya, ausente: !!o.cubreAusente, concreta: true }) === por) return { ok: true, partido: true, cubre: por };
      }
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
  return partidoEn(cfg, p, iso);   // con el partido trasladado la semana de un cambio de día libre
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
// ¿A quién cubre esta entrada? Su «por» y, si no lo lleva, la razón «cubre a X» con la que la
// puso la semana tipo. Hasta el 24/09 el modo Periodo del Generador («Mes → Generar», «Completar
// este día»), y el núcleo, volcaban sin el «por»: esas semanas ya guardadas solo tienen la razón.
// Una sola lectura (24/09, revisión): la usan la planilla (posicionesDe), la retirada de lo que
// ya no vale y el cambio de día libre, que antes no veían a Lavinia «por Mari Luz» y dejaban a
// Mari Luz sin trabajar ni el martes ni el miércoles.
function porDe(staff, e) {
  if (!e) return null;
  if (e.por) return e.por;
  const m = /^cubre a (.+)$/.exec(e.razon || '');
  return m ? ((staff || []).find(q => q.nombre === m[1]) || {}).id || null : null;
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
    const por = porDe(staff, e);
    const { avisos, autorizados } = revisarEntrada(cfg, staff, est, iso, tid, e.pid);
    return { pos: i + 1, pid: e.pid, nombre: p.nombre, abre: e.pid === primero, abreFijo: e.pid === primero && abreFijo, cocina: !!e.cocina, partido: enOtra(e.pid) && !continuo, continuo, comodin: !(p.locales || []).length, por: por || null, nota: e.nota || null, supuesto: !!e.supuesto, avisos, autorizados, forzado: !!e.forzado && avisos.length > 0, origen: e.origen || 'manual', tramo: e.ini && e.fin ? { ini: e.ini, fin: e.fin } : null };
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
  if (!r.ok) return { ok: false, motivo: r.motivo, avisos: r.avisos, autorizados: r.autorizados, regla: r.regla };
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
  return { ok: true, motivo: null, avisos: r.avisos, autorizados: r.autorizados, entry };
}
// D3 (fase 3): quien ya estaba en la casilla de X pasa a cubrirle (el relevo). Su plaza es la suya:
// solo se le apunta el «por X» y la razón, y se recuerda la razón de antes para devolvérsela cuando
// X vuelva (desmarcarRelevos). La usan la semana tipo y la Cobertura al aplicar.
function marcarRelevo(entry, staff, xid) {
  if (!entry || !xid) return false;
  if (entry.por === xid) return true;
  if (!entry.relevo) { entry.relevo = true; if (entry.razon !== undefined) entry.razonPrevia = entry.razon; }
  entry.por = xid;
  entry.razon = `cubre a ${nombreDe(staff, xid)}`;
  return true;
}
// Quien ya está en la casilla de X y la cubre (D3): cubre a X en esa casilla y no rompe nada ahora
// (su partido, si no lo tiene declarado, está autorizado por cubrir a X). El pid o null. Si hay dos,
// la primera de la casilla: X es una sola persona.
// opts: { aqui: quien llama sabe que X falta de esta casilla (la Cobertura); faltaCocina }
function relevoEn(cfg, staff, est, iso, tid, xid, opts) {
  const o = opts || {};
  for (const e of asignados(est, iso, tid)) {
    if (e.pid === xid) continue;
    // quien ya va «por» otra persona (Roberto, en su plaza del jueves por Susana Luna) no puede ser
    // además el relevo de X: pisaba ese «por» y la semana tipo lo perdía al guardarse (revisión F3, D12)
    const otroPor = porDe(staff, e);
    if (otroPor && otroPor !== xid) continue;
    const q = personaDe(staff, e.pid);
    if (cubreEnCasilla(cfg, staff, est, q, iso, tid, { cocina: !!e.cocina, falta: xid, suCasilla: !!o.aqui, ausente: !!o.aqui, faltaCocina: o.faltaCocina, concreta: true }) !== xid) continue;
    if (revisarEntrada(cfg, staff, est, iso, tid, e.pid, { cubrePor: xid, cubreSuCasilla: true, cubreAusente: !!o.aqui }).avisos.length) continue;
    return e.pid;
  }
  return null;
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
  const m = minimoDe(cfg, iso, tid, est);
  const n = lista.length;
  const tieneCocina = l && localTieneCocina(l, franja);
  const coc = lista.find(e => e.cocina);
  const cache = new Map();
  const rev = pid => { if (!cache.has(pid)) cache.set(pid, revisarEntrada(cfg, staff, est, iso, tid, pid)); return cache.get(pid); };
  const vigentes = pid => rev(pid).avisos;
  const out = {
    abierto, n, minimo: m.min, supuesto: m.supuesto, refuerzo: m.refuerzo, faltan: abierto ? Math.max(0, m.min - n) : 0,
    sinCocina: !!(abierto && tieneCocina && !coc),
    cocinaObligatoria: !!(l && l.cocina && l.cocina.obligatoria && l.cocina.obligatoria[franja]),
    cocinaNoApta: !!(coc && !puedeCocina(cfg, personaDe(staff, coc.pid), localId, iso)),
    sinAbre: !!(abierto && n > 0 && !primeroDe(cfg, staff, est, iso, tid)),
    motivoAbre: abierto && n > 0 && !primeroDe(cfg, staff, est, iso, tid) ? motivoSinPrimero(cfg, staff, est, iso, tid) : null,
    // dos apoyos no pueden quedarse solos en un turno (José, 17/09): hace falta un veterano
    soloApoyos: !!(abierto && lista.length && lista.every(e => esApoyo(personaDe(staff, e.pid)))),
    forzados: lista.filter(e => e.forzado && vigentes(e.pid).length).length,
    avisos: lista.filter(e => vigentes(e.pid).length).map(e => `${nombreDe(staff, e.pid)}: ${vigentes(e.pid).join(', ')}`),
    // lo autorizado (D1: el partido para cubrir a X): informativo, no es un aviso
    autorizados: lista.filter(e => rev(e.pid).autorizados.length).map(e => `${nombreDe(staff, e.pid)}: ${rev(e.pid).autorizados.map(a => a.texto).join(', ')}`),
    autorizadosPor: lista.filter(e => rev(e.pid).autorizados.length).map(e => ({ pid: e.pid, textos: rev(e.pid).autorizados.map(a => a.texto) })),
    incompatibles: [],
    // 24/09 (S26): gente puesta en una casilla que ya no abre ese día (plazas fantasma)
    enCerrado: abierto ? 0 : n,
  };
  for (let i = 0; i < lista.length; i++) for (let j = i + 1; j < lista.length; j++) {
    const a = personaDe(staff, lista[i].pid), b = personaDe(staff, lista[j].pid);
    if (a && b && ((a.nuncaCon || []).includes(b.id) || (b.nuncaCon || []).includes(a.id))) out.incompatibles.push([a.nombre, b.nombre]);
  }
  return out;
}
function revisionMes(cfg, staff, est, opts) {
  const out = [];
  const autDia = new Map();
  const desde = (opts && opts.desde) || est.days[0].iso, hasta = (opts && opts.hasta) || est.days[est.days.length - 1].iso;
  for (const d of est.days) {
    if (d.iso < desde || d.iso > hasta) continue;
    for (const t of turnosDe(cfg)) {
      const donde = `${t.local.nombre} · ${FRANJA_LBL[t.franja].toLowerCase()} del ${DOW_LBL[d.dow]} ${d.d}`;
      if (!turnoAbierto(cfg, est, d.iso, t.id)) {
        // 24/09 (S26, red de seguridad): una casilla cerrada (por fechas o porque «Cuándo abre» ya no
        // la abre) con gente dentro. No se ve en la casilla, pero contaba en horas, en el Mes y en el
        // pie de descansos, y bloqueaba a esa gente en otra casilla de la misma franja. Con opts.hoy,
        // los días ya pasados que solo cierra «Cuándo abre» no se avisan: se trabajaron con el horario
        // de entonces y cuentan en las horas (revisión F2)
        const dentro = pidsEn(est, d.iso, t.id);
        if (dentro.length && opts && opts.hoy && d.iso < opts.hoy && !cerradaEseDia(cfg, est, d.iso, t.id)) continue;
        if (dentro.length) { const c = cierreEn(cfg, d.iso, t.id); out.push({ iso: d.iso, turnoId: t.id, tipo: 'plaza-en-cerrado', nivel: 'alta', n: dentro.length, msg: `${donde}: ${c ? `cerrado (${motivoCierreTxt(c) || etiquetaCierre(c).toLowerCase()})` : 'el local no abre'} y ${dentro.length > 1 ? 'siguen puestas' : 'sigue puesta'} ${dentro.map(pid => nombreDe(staff, pid)).join(', ')}` }); }
        continue;
      }
      const r = revisarTurno(cfg, staff, est, d.iso, t.id);
      // abierta a mano con mínimo 0 y sin nadie (S28): el mínimo no avisa, pero una casilla abierta vacía sí
      if (!r.n && !r.minimo) out.push({ iso: d.iso, turnoId: t.id, tipo: 'abierta-vacia', nivel: 'media', msg: `${donde}: abierta y sin nadie (mínimo 0)` });
      if (r.faltan) out.push({ iso: d.iso, turnoId: t.id, tipo: 'falta', nivel: r.supuesto ? 'media' : 'alta', n: r.faltan, msg: `${donde}: falta${r.faltan > 1 ? 'n' : ''} ${r.faltan} (hay ${r.n} de ${r.minimo}${r.supuesto ? ', mínimo supuesto' : ''}${r.refuerzo ? ', con refuerzo' : ''})` });
      if (r.sinCocina) out.push({ iso: d.iso, turnoId: t.id, tipo: 'sin-cocina', nivel: r.cocinaObligatoria ? 'alta' : 'media', msg: `${donde}: sin cocina${r.cocinaObligatoria ? ' (obligatoria)' : ''}` });
      if (r.cocinaNoApta) out.push({ iso: d.iso, turnoId: t.id, tipo: 'cocina-no-apta', nivel: 'media', msg: `${donde}: la cocina la lleva alguien que no es cocina de ese local` });
      if (r.sinAbre) out.push({ iso: d.iso, turnoId: t.id, tipo: 'sin-abre', nivel: 'alta', msg: `${donde}: hueco disponible en la 1.ª posición — ${r.motivoAbre}` });
      // 24/09 (S33; José, 17/09: «dos apoyos no se quedan solos, hace falta un veterano»): hasta ahora
      // solo lo pintaba Hoy; también con un solo apoyo
      if (r.soloApoyos) out.push({ iso: d.iso, turnoId: t.id, tipo: 'solo-apoyos', nivel: 'alta', msg: `${donde}: solo apoyos (${pidsEn(est, d.iso, t.id).map(pid => nombreDe(staff, pid)).join(', ')}): hace falta alguien de sala o de cocina` });
      for (const [a, b] of r.incompatibles) out.push({ iso: d.iso, turnoId: t.id, tipo: 'incompatibles', nivel: 'alta', msg: `${donde}: ${a} y ${b} no pueden coincidir` });
      if (r.forzados) out.push({ iso: d.iso, turnoId: t.id, tipo: 'forzado', nivel: 'media', msg: `${donde}: ${r.forzados} asignación(es) forzada(s) a mano — ${r.avisos.join(' · ')}` });
      else if (r.avisos.length) out.push({ iso: d.iso, turnoId: t.id, tipo: 'aviso', nivel: 'media', msg: `${donde}: ${r.avisos.join(' · ')}` });
      // D1 (fase 3): el partido para cubrir a quien falta está autorizado; se dice, en informativo. Una
      // línea por persona y día (revisión F3: salía una por la mañana y otra por la tarde)
      for (const x of r.autorizadosPor) for (const texto of x.textos) {
        const k = x.pid + '|' + texto, ya = autDia.get(k);
        if (ya) { if (!ya.franjas.includes(t.franja)) ya.franjas.push(t.franja); if (!ya.locales.includes(t.local.nombre)) ya.locales.push(t.local.nombre); continue; }
        autDia.set(k, { pid: x.pid, texto, turnoId: t.id, franjas: [t.franja], locales: [t.local.nombre] });
      }
    }
    for (const x of autDia.values()) {
      const fr = FRANJAS.filter(f => x.franjas.includes(f)).map(f => FRANJA_LBL[f].toLowerCase()).join(' y ');
      out.push({ iso: d.iso, turnoId: x.turnoId, pid: x.pid, tipo: 'autorizado', nivel: 'info', msg: `${nombreDe(staff, x.pid)}: ${x.texto} · ${x.locales.join(' y ')}, ${fr} del ${DOW_LBL[d.dow]} ${d.d}` });
    }
    autDia.clear();
    // quien apoya por un cierre «donde haga falta» y nadie ha colocado ese día (revisión F2): sin este
    // aviso, en la planilla parecía que libraba. Va con la casilla cerrada de la que viene.
    for (const x of apoyosSinSitio(cfg, staff, est, d.iso)) {
      const lc = localDe(cfg, x.cierre.localId);
      out.push({ iso: d.iso, turnoId: turnoId(x.cierre.localId, x.franja), pid: x.pid, tipo: 'apoyo-sin-sitio', nivel: 'media', msg: `${nombreDe(staff, x.pid)}: de apoyo por el cierre de ${lc ? lc.nombre : x.cierre.localId}, la ${FRANJA_LBL[x.franja].toLowerCase()} del ${DOW_LBL[d.dow]} ${d.d} aún sin sitio` });
    }
  }
  return out;
}

// ---------- semana patrón ----------
// cfg.patron[dow] = [{ t: turnoId, p: pid, c?: cocina, a?: abre, s?: supuesto }]
function plazasDe(cfg, dow) { return (cfg.patron && cfg.patron[dow]) || []; }
// Las plazas de la semana tipo para una FECHA (no para un día de la semana): las de su día, con
// los cambios de día libre de esa semana aplicados (D9, reunión del 24/09: «libra martes en vez
// de miércoles… me salen los 2 días»). La semana tipo lleva dentro el libre de siempre (los
// miércoles Mari Luz no tiene plazas y Lavinia hace mañana y tarde «por Mari Luz»), así que:
//  · quien esta semana libra este día no tiene plaza: la suya va a `libres` y se cubre como una
//    ausencia (entra su «cubre a»; si no, lo rellena el generador);
//  · el día que ahora trabaja se quitan las plazas de quien la cubría («por X») —antes de ponerla
//    a ella, o el «nunca con» la dejaría fuera— y se le ponen sus plazas del día que ahora libra
//    (mismo turno, cocina, abre y nota; sin el «por», que era de aquel día).
// Si el número de días no cuadra, no se traslada nada (ver cambioDeLibre). Lo leen
// instanciarPatron y el núcleo (toProblem): una sola lectura de la semana tipo.
function plazasDelDia(cfg, staff, iso) {
  const dow = isoDow(iso);
  const cambios = new Map();
  for (const p of staff || []) { const c = cambioDeLibre(cfg, p, iso); if (c) cambios.set(p.id, c); }
  const plazas = [], libres = [];
  for (const pl of plazasDe(cfg, dow)) {
    const c = cambios.get(pl.p);
    if (c && c.nuevos.includes(dow)) { const par = c.pares.find(x => x[0] === dow); libres.push(Object.assign({}, pl, { enVezDe: par ? par[1] : null })); continue; }
    const cx = pl.por ? cambios.get(pl.por) : null;
    if (cx && cx.pares.some(x => x[1] === dow)) continue;   // su cobertura de siempre: esta semana trabaja ella
    plazas.push(pl);
  }
  for (const [pid, c] of cambios) {
    const par = c.pares.find(x => x[1] === dow);
    if (!par) continue;
    for (const pl of plazasDe(cfg, par[0])) if (pl.p === pid) { const x = Object.assign({}, pl, { traslado: par[0] }); delete x.por; plazas.push(x); }
  }
  return { plazas, libres, cambios };
}
// «martes 6»: un día concreto, en los avisos
const diaYNum = iso => `${DOW_LBL[isoDow(iso)]} ${+iso.slice(8, 10)}`;
// opts.soloPid: solo las plazas de esa persona y las de quien la cubre; opts.soloDias: solo esas
// fechas (moverDiaLibre toca los días que cambian, nada más: 24/09, revisión)
function instanciarPatron(cfg, staff, est, desde, hasta, opts) {
  const o = opts || {};
  const r = { aplicados: [], rechazados: [], coberturas: [], ausentes: [], avisos: [] };
  const toca = pl => !o.soloPid || pl.p === o.soloPid || pl.por === o.soloPid;
  const avisados = new Set();
  for (const iso of rangoIso(desde, hasta)) {
    if (o.desdeIso && iso < o.desdeIso) continue;
    if (o.soloDias && !o.soloDias.includes(iso)) continue;
    const dow = isoDow(iso);
    const ausentes = [];
    const { plazas, libres, cambios } = plazasDelDia(cfg, staff, iso);
    for (const [pid, c] of cambios) {
      if (o.soloPid && pid !== o.soloPid) continue;
      const p = personaDe(staff, pid);
      // días que no se pueden emparejar: solo se avisa si tenía días de siempre y no se sabe cuál
      // trabaja a cambio (24/09, revisión: a Dulce, Susi o Laura, sin día fijo, o a quien solo
      // añade un día, no había nada que emparejar y el aviso confundía)
      if (!c.cuadra && c.liberados.length && !avisados.has(pid + c.semana)) {
        avisados.add(pid + c.semana);
        r.avisos.push({ pid, semana: c.semana, tipo: 'emparejar', texto: `${p.nombre} libra ${textoDiasEl(c.dias)} esta semana en vez de ${textoDiasPl(c.habituales)}: no se sabe qué día trabaja a cambio, así que ${c.nuevos.length ? `solo se le quita ${textoDiasEl(c.nuevos)}` : 'no se le pone nada más'} y el resto de su semana tipo no se mueve` });
      }
      // un día del cambio ya pasado (con «solo desde hoy») no se toca: el cambio se aplica a medias
      // y se dice (24/09, revisión)
      if (o.desdeIso && !avisados.has(pid + c.semana + 'pasado')) {
        const par = c.pares.find(x => (addDias(c.semana, x[0] - 1) < o.desdeIso) !== (addDias(c.semana, x[1] - 1) < o.desdeIso));
        if (par) {
          avisados.add(pid + c.semana + 'pasado');
          const [ya, queda] = par.map(d => addDias(c.semana, d - 1)).sort();
          r.avisos.push({ pid, semana: c.semana, tipo: 'pasado', texto: `${p.nombre}: el ${diaYNum(ya)} ya ha pasado y no se toca, así que su cambio de día libre de esta semana solo se aplica al ${diaYNum(queda)}` });
        }
      }
    }
    // quien esta semana libra este día: su plaza se cubre como la de un ausente
    for (const pl of libres) {
      if (!toca(pl)) continue;
      ausentes.push({ pl, p: personaDe(staff, pl.p) });
      r.ausentes.push({ iso, turnoId: pl.t, pid: pl.p, tipo: 'libraPuntual' });
    }
    for (const pl of plazas) {
      if (!toca(pl)) continue;
      const p = personaDe(staff, pl.p);
      if (!p) { r.rechazados.push({ iso, turnoId: pl.t, pid: pl.p, motivo: 'no existe' }); continue; }
      const aus = ausenciaEn(p, iso, partirTurno(pl.t).franja);   // por franja (D10)
      if (aus) { ausentes.push({ pl, p, aus }); r.ausentes.push({ iso, turnoId: pl.t, pid: pl.p, tipo: aus.tipo }); continue; }
      if (pidsEn(est, iso, pl.t).includes(pl.p)) continue;
      const razon = pl.traslado ? 'esta semana cambia su día libre' : pl.por ? `cubre a ${nombreDe(staff, pl.por)}` : 'plaza fija de la semana tipo';
      const a = asignar(est, cfg, staff, iso, pl.t, pl.p, { origen: 'patron', razon, supuesto: !!pl.s, cocina: pl.c ? true : undefined, abre: pl.a ? true : undefined, por: pl.por, nota: pl.n });
      if (a.ok) r.aplicados.push({ iso, turnoId: pl.t, pid: pl.p, origen: 'patron', razon: a.entry.razon, supuesto: !!pl.s });
      else r.rechazados.push({ iso, turnoId: pl.t, pid: pl.p, motivo: a.motivo });
    }
    // quien «cubre a» la persona ausente ocupa su sitio (si puede). La semana de un cambio de
    // día libre, el «cubre a X los miércoles» vale para el martes que ahora libra X (24/09).
    // 24/09 (fase 3): una sola lectura de «cubre a» (cubreEnCasilla: interruptor, su casilla, el día
    // y su puesto) y el partido autorizado con cubrePor (D1) en vez de permitirPartido fijo. Si quien
    // la cubre ya está en la casilla (Mari Luz, de tarde con Iván los viernes), es el relevo (D3):
    // queda «por» la ausente y sale en las coberturas; antes se saltaba sin decir nada.
    for (const { pl, p } of ausentes) {
      if (!p) continue;
      const rel = relevoEn(cfg, staff, est, iso, pl.t, p.id);
      if (rel) {
        const e = asignados(est, iso, pl.t).find(x => x.pid === rel);
        const nuevo = e.por !== p.id;   // si ya estaba marcado (la semana ya volcada), no hay nada que volcar
        marcarRelevo(e, staff, p.id);   // no es una plaza nueva: solo sale en las coberturas
        // con su «por», el relevo puede abrir (partido autorizado, D1): la casilla se recalcula (revisión F3)
        normalizarCasilla(est, cfg, staff, iso, pl.t);
        r.coberturas.push({ iso, turnoId: pl.t, pid: rel, por: p.id, yaEstaba: true, nuevo });
        continue;
      }
      const { localId } = partirTurno(pl.t);
      for (const q of staff) {
        if (q.id === p.id || pidsEn(est, iso, pl.t).includes(q.id)) continue;
        const coc = !!pl.c && puedeCocina(cfg, q, localId, iso);
        if (cubreEnCasilla(cfg, staff, est, q, iso, pl.t, { cocina: coc, falta: p.id }) !== p.id) continue;
        const a = asignar(est, cfg, staff, iso, pl.t, q.id, { origen: 'patron', razon: `cubre a ${p.nombre}`, por: p.id, cubrePor: p.id, puesto: coc ? 'cocina' : 'sala', cocina: coc ? true : undefined });
        if (a.ok) { r.aplicados.push({ iso, turnoId: pl.t, pid: q.id, origen: 'patron', razon: a.entry.razon, por: p.id }); r.coberturas.push({ iso, turnoId: pl.t, pid: q.id, por: p.id }); break; }
      }
    }
  }
  return r;
}
// captura una semana real como nueva semana patrón. Con cfg y staff, la semana tipo es la de
// SIEMPRE (24/09, revisión: «Guardar como semana tipo» sobre una semana en la que Mari Luz libraba
// el martes la dejaba sin martes ni miércoles todas las semanas): quien esa semana cambió su día
// libre vuelve a su día de siempre —sus plazas del día que trabajó pasan al que libró, quien la
// cubrió ese día no se guarda, y la cobertura de su día de siempre («por X») se recupera de la
// semana tipo anterior (cfg.patron)—.
function patronDesdeSemana(est, lunesIso, cfg, staff) {
  const patron = {};
  for (let k = 0; k < 7; k++) {
    const iso = addDias(lunesIso, k);
    const dow = isoDow(iso);
    patron[dow] = [];
    for (const [tid, lista] of Object.entries(est.asig[iso] || {})) for (const e of lista) {
      // el «por» de un relevo (D3) es de esa semana: la plaza es suya y se guarda sin él
      const pl = { t: tid, p: e.pid }; if (e.cocina) pl.c = 1; if (e.abre) pl.a = 1; if (e.supuesto) pl.s = 1; const por = e.relevo ? null : porDe(staff, e); if (por) pl.por = por; if (e.nota) pl.n = e.nota;
      patron[dow].push(pl);
    }
  }
  if (!cfg || !staff) return patron;
  const tiene = (xs, pl) => xs.some(x => x.t === pl.t && x.p === pl.p);
  for (const p of staff) {
    const c = cambioDeLibre(cfg, p, lunesIso);
    if (!c) continue;
    for (const d of c.nuevos) {
      const par = c.pares.find(x => x[0] === d);
      patron[d] = patron[d].filter(pl => pl.por !== p.id);
      const suyas = par ? patron[par[1]].filter(pl => pl.p === p.id) : plazasDe(cfg, d).filter(pl => pl.p === p.id);
      for (const pl of suyas) if (!tiene(patron[d], pl)) patron[d].push(Object.assign({}, pl));
    }
    for (const [, lib] of c.pares) {
      patron[lib] = patron[lib].filter(pl => pl.p !== p.id);
      for (const pl of plazasDe(cfg, lib)) if (pl.por === p.id && !tiene(patron[lib], pl)) patron[lib].push(Object.assign({}, pl));
    }
  }
  return patron;
}

// ---------- candidatos y generador ----------
function turnosMes(est, pid) { let n = 0; for (const porT of Object.values(est.asig)) for (const lista of Object.values(porT)) if (lista.some(x => x.pid === pid)) n++; return n; }
// «sin local fijo»: puede ir a cualquier bar. No es un puesto, es una característica.
function esComodin(p) { return !!(p.comodin || !(p.locales || []).length); }
// ¿Se quedaría la casilla solo con apoyos si entra esta persona? También con uno solo (S33; José,
// 17/09: «dos apoyos no se quedan solos, hace falta un veterano»). La leen el relleno y la Cobertura.
function quedariaSoloApoyos(staff, est, iso, tid, pid) {
  if (!esApoyo(personaDe(staff, pid))) return false;
  return asignados(est, iso, tid).every(e => e.pid === pid || esApoyo(personaDe(staff, e.pid)));
}
// 24/09 (revisión F3; decisiones.md, principio 6: «dos apoyos no se quedan solos», José 17/09): lo
// automático —el relleno del Generador y los dos planes de la Cobertura— no deja nunca una casilla
// solo con apoyos; el plan relajado solo relaja partidos no declarados. Queda el hueco, con este
// motivo en «por qué nadie», y el encargado puede ponerla a mano (el selector la ofrece con aviso).
const MOTIVO_SOLO_APOYOS = 'dejaría la casilla solo con apoyos (hace falta alguien de sala o de cocina)';
// Lo que suma por lo que es: sin local fijo (comodín) o apoyo. Nada si con ella la casilla se
// quedaría solo con apoyos (S33): ahí no se prefiere a un apoyo. Una sola puntuación para el
// relleno y la Cobertura (la fase 4 la generalizará).
function puntosPuesto(p, soloApoyos) {
  if (soloApoyos) return null;
  if (esComodin(p)) return { puntos: 30, razon: 'sin local fijo' };
  if (p.puesto === 'apoyo') return { puntos: 15, razon: 'apoyo' };
  return null;
}
// 24/09 (fase 3): «cubre a» solo cuenta en la casilla de quien falta y para su puesto
// (cubreEnCasilla; antes sumaba en cualquier casilla del día y con el interruptor apagado), le
// autoriza el partido para cubrirle (cubrePor, D1) y se devuelve en `cubre` para que el relleno
// ponga el «por» (S11). La sala la pide puedeEstar con el puesto (S34): «solo hace cocina» y «ya
// lleva la cocina ese día» ya no son un filtro suelto de aquí.
// 24/09 (revisión F3, S33): quien dejaría la casilla solo con apoyos no es candidato del relleno (como
// en la Cobertura): la casilla queda corta y porQueNadie lo explica. Con opts.soloApoyos (el selector,
// «con aviso») sí sale, con el aviso «solo apoyos».
function candidatosPara(cfg, staff, est, iso, tid, opts) {
  const o = opts || {};
  const { localId, franja } = partirTurno(tid);
  const l = localDe(cfg, localId);
  const dow = isoDow(iso);
  const out = [];
  for (const p of staff) {
    const cubre = cubreEnCasilla(cfg, staff, est, p, iso, tid, { cocina: !!o.cocina });
    const r = puedeEstar(cfg, staff, est, iso, tid, p.id, { permitirPartido: !!o.permitirPartido, relajarNuncaCon: !!o.relajarNuncaCon, cubrePor: cubre || undefined, puesto: o.cocina ? 'cocina' : 'sala' });
    if (!r.ok) continue;
    const solo = !o.cocina && quedariaSoloApoyos(staff, est, iso, tid, p.id);
    if (solo && !o.soloApoyos) continue;
    const avisos = r.avisos.concat(solo ? ['solo apoyos'] : []);
    let score = 50; const razones = [];
    if (o.primero) { const pr = puedePrimero(cfg, staff, est, iso, tid, p.id, { cubrePor: cubre || undefined }); if (!pr.ok) continue; if ((l.primero && l.primero[franja] === p.id) || (p.abre && p.abre[localId] && p.abre[localId].includes(franja))) { score += 25; razones.push('sale el primero'); } else razones.push('puede abrir (turno completo)'); }
    if (cubre) { score += 60; razones.push(`cubre a ${nombreDe(staff, cubre)}`); }
    const pc = puntosCierre(cfg, p, iso, tid);   // apoyo por el cierre de su local (24/09, D11)
    if (pc) { score += pc.puntos; razones.push(pc.razon); }
    const pp = puntosPuesto(p, solo);
    if (pp) { score += pp.puntos; razones.push(pp.razon); }
    if ((p.locales || []).length && p.locales[0] === localId) { score += 10; razones.push(`su local habitual es ${l.nombre}`); }
    if (o.cocina) { const rc = rangoCocina(cfg, l, p, franja, iso); if (rc < 0) continue; score += 40 - Math.min(rc, 30); razones.push(rc < 100 ? 'cocina titular' : 'cocina de reserva'); }
    const n = turnosMes(est, p.id);
    score -= 3 * n; razones.push(`${n} turno${n === 1 ? '' : 's'} este mes`);
    if (p.prefs && (p.prefs.evitaDows || []).includes(dow)) { score -= 40; razones.push(`prefiere no trabajar ${DOW_PL[dow]}`); }
    if (avisos.length) { score -= 25; razones.push(...avisos); }
    for (const a of r.autorizados) razones.push(a.texto);
    out.push({ pid: p.id, nombre: p.nombre, score, razones, avisos, autorizados: r.autorizados, n, cubre: cubre || null });
  }
  out.sort((a, b) => b.score - a.score || a.n - b.n || (a.pid < b.pid ? -1 : 1));
  return out;
}
// Por qué no entra nadie en una casilla corta: los motivos de la puerta (puedeEstar) con el puesto
// que se busca —sala, o cocina con opts.cocina— y quien dejaría la casilla solo con apoyos. 24/09
// (revisión F3): sin el puesto, Hojan («solo hace cocina») no salía en ningún motivo aunque el relleno
// lo excluía, y el apoyo descartado por S33 tampoco.
function porQueNadie(cfg, staff, est, iso, tid, opts) {
  const o = opts || {};
  const out = {};
  const pon = (m, p) => (out[m] = out[m] || []).push(p.nombre);
  for (const p of staff) {
    const r = puedeEstar(cfg, staff, est, iso, tid, p.id, { puesto: o.cocina ? 'cocina' : 'sala' });
    if (!r.ok) pon(r.motivo, p);
    else if (!o.cocina && quedariaSoloApoyos(staff, est, iso, tid, p.id)) pon(MOTIVO_SOLO_APOYOS, p);
  }
  return out;
}
// ---------- lo automático que ya no vale ----------
// 24/09 (reunión: «pero luego no lo quita»; decisiones.md principio 4): el generador añadía y
// nunca quitaba, así que un día libre cambiado en Equipo no llegaba a una semana ya volcada.
// Ahora, antes de generar, se retira lo AUTOMÁTICO (lo que pusieron la semana tipo, el
// generador, el núcleo, la cobertura o el cierre) y sin forzar que rompe el día libre: quien
// libra ese día (su día de siempre o el de esa semana) y la cobertura «por X» de un día en que
// X ya no libra porque esta semana cambió su día. Lo puesto a mano o forzado NO lo quita nadie:
// se queda con su aviso. Cada retirada sale listada con su motivo («Qué ha cambiado»).
const ORIGENES_AUTO = ['patron', 'generador', 'nucleo', 'cobertura', 'cierre'];
function esAutomatica(e) { return !!e && ORIGENES_AUTO.includes(e.origen) && !e.forzado; }
function motivoRetirada(cfg, staff, est, iso, tid, e) {
  const dow = isoDow(iso);
  // 24/09 (D11): lo automático que se ha quedado dentro de una casilla cerrada (por fechas o por
  // «Cuándo abre»), y lo de quien no trabaja esos días por el cierre de su local
  if (!turnoAbierto(cfg, est, iso, tid)) return motivoCerrado(cfg, iso, tid).motivo;
  const dc = decisionCierre(cfg, e.pid, iso, partirTurno(tid).franja);
  if (dc && dc.tipo !== 'REFUERZA') return motivoSinTrabajo(cfg, dc.cierre);
  const p = personaDe(staff, e.pid);
  if (p && activa(cfg, p, 'libra') && libraEn(p, iso)) return motivoLibra(p, iso);
  // el relevo (D3) está en SU plaza: cuando la persona a la que cubría vuelve, solo pierde el «por»
  // (desmarcarRelevos), no la plaza
  if (e.relevo) return null;
  const x = personaDe(staff, porDe(staff, e));
  if (!x || ausenciaEn(x, iso, partirTurno(tid).franja)) return null;
  const c = cambioDeLibre(cfg, x, iso);
  if (c && c.pares.some(y => y[1] === dow)) return `${x.nombre} trabaja ${textoDiasEl([dow])} esta semana: ya no hay que cubrir su día libre`;
  // 24/09 (revisión: «quitar el cambio no lo devuelve todo a su sitio»): la cobertura que puso la
  // semana tipo («cubre a X» el día que X libraba o faltaba) sobra cuando X ya no libra ni falta
  // ese día y la semana tipo no la tiene como plaza fija. Solo lo de la semana tipo: una cobertura
  // aplicada desde la Cobertura tiene su propia vuelta atrás (quitar la ausencia).
  if (e.origen === 'patron' && !(activa(cfg, x, 'libra') && libraEn(x, iso)) && !plazasDelDia(cfg, staff, iso).plazas.some(pl => pl.t === tid && pl.p === e.pid && pl.por === x.id))
    return `${x.nombre} trabaja ${textoDiasEl([dow])}: ya no hay que cubrir su sitio`;
  return null;
}
// Quita una entrada de su casilla. Si llevaba la cocina o abría, esa marca la había fijado ella
// (una plaza de la semana tipo con «c» pasa por asignar, que la marca como fijada): al irse, la
// casilla la recalcula con quien queda en vez de quedarse sin cocina (24/09, revisión: Adrián
// cambiaba de día y Zapatillera se quedaba sin cocina el martes). Lo usan la retirada automática
// y el volcado de la vista previa del Generador.
function retirarEntrada(est, cfg, staff, iso, tid, pid) {
  const e = asignados(est, iso, tid).find(x => x.pid === pid);
  if (!e || !desasignar(est, iso, tid, pid)) return false;
  const man = est.manual && est.manual[iso] && est.manual[iso][tid];
  if (man) { if (e.cocina) delete man.cocina; if (e.abre) delete man.abre; }
  if (asignados(est, iso, tid).length) normalizarCasilla(est, cfg, staff, iso, tid);
  return true;
}
// El relevo (D3) cuya persona ya no falta (vuelve de vacaciones, se quita la ausencia) deja de ir
// «por» ella y recupera su razón: la plaza era suya. No se retira nada; lo hace el generador antes
// de volver a mirar la semana tipo. Devuelve cuántas entradas ha desmarcado.
function desmarcarRelevos(cfg, staff, est, iso, tid) {
  let n = 0;
  for (const e of asignados(est, iso, tid)) {
    if (!e.relevo || !e.por) continue;
    const x = personaDe(staff, e.por), q = personaDe(staff, e.pid);
    if (x && cubreEnCasilla(cfg, staff, est, q, iso, tid, { cocina: !!e.cocina, falta: x.id, suCasilla: true }) === x.id) continue;
    delete e.por; delete e.relevo;
    if (e.razonPrevia !== undefined) { e.razon = e.razonPrevia; delete e.razonPrevia; } else delete e.razon;
    n++;
  }
  return n;
}
// 24/09 (revisión F3): el volcado de la vista previa del Generador (modo Periodo) a la planilla real.
// Vivía en la interfaz (aplicarPrevia) y marcaba los relevos ANTES de volcar las plazas: Mari Luz aún
// no estaba en la planilla real, así que no se marcaba; su plaza entraba después con el «por Iván»
// pero sin la marca de relevo, y al volver Iván el generador se la retiraba («ya no hay que cubrir su
// sitio»). Ahora, en el modelo y en este orden: 1) lo que la vista previa retira (solo si sigue siendo
// automático), 2) el relevo de quien ya no falta pierde el «por», 3) las plazas, cada una con su «por»
// y su nota —la de un relevo, con su razón de siempre y sin «por»—, y 4) los relevos se marcan y la
// casilla se recalcula (así abre quien debe).
// estDe(iso): el estado escribible de ese día. opts: { desde, hasta, desdeIso, previaDe(iso): el estado
// de la vista previa de ese día }. Devuelve { aplicadas, fallos, retiradas, relevos }.
function volcarPrevia(cfg, staff, estDe, previa, opts) {
  const o = opts || {};
  const r = { aplicadas: 0, fallos: 0, retiradas: 0, relevos: 0 };
  for (const x of previa.retirados || []) {
    const e = estDe(x.iso);
    const en = asignados(e, x.iso, x.turnoId).find(y => y.pid === x.pid);
    if (!en || !esAutomatica(en)) continue;
    if (retirarEntrada(e, cfg, staff, x.iso, x.turnoId, x.pid)) r.retiradas++;
  }
  if (o.desde && o.hasta) for (const iso of rangoIso(o.desde, o.hasta)) {
    if (o.desdeIso && iso < o.desdeIso) continue;
    const e = estDe(iso);
    for (const t of turnosDe(cfg)) desmarcarRelevos(cfg, staff, e, iso, t.id);
  }
  for (const a of previa.aplicados || []) {
    const e = estDe(a.iso);
    if (pidsEn(e, a.iso, a.turnoId).includes(a.pid)) continue;
    const pv = o.previaDe ? o.previaDe(a.iso) : null;
    const entry = (pv ? asignados(pv, a.iso, a.turnoId).find(x => x.pid === a.pid) : null) || {};
    const rel = !!entry.relevo;
    const res = asignar(e, cfg, staff, a.iso, a.turnoId, a.pid, { origen: a.origen, razon: a.razon, supuesto: !!a.supuesto || !!entry.supuesto, permitirPartido: true, cocina: entry.cocina ? true : undefined, abre: entry.abre ? true : undefined, por: rel ? undefined : (entry.por || a.por), nota: entry.nota });
    if (res.ok) r.aplicadas++; else r.fallos++;
  }
  for (const c of previa.coberturas || []) {
    if (!c.yaEstaba) continue;
    const e = estDe(c.iso);
    const en = asignados(e, c.iso, c.turnoId).find(y => y.pid === c.pid);
    if (!en) continue;
    if (en.por !== c.por) r.relevos++;
    marcarRelevo(en, staff, c.por);
    normalizarCasilla(e, cfg, staff, c.iso, c.turnoId);
  }
  return r;
}
// opts: { desdeIso, soloPid, soloDias: [iso] } → [{ iso, turnoId, pid, origen, por, motivo }]
function retirarQueIncumplen(cfg, staff, est, desde, hasta, opts) {
  const o = opts || {};
  const out = [];
  for (const iso of rangoIso(desde, hasta)) {
    if (o.desdeIso && iso < o.desdeIso) continue;
    if (o.soloDias && !o.soloDias.includes(iso)) continue;
    for (const t of turnosDe(cfg)) {
      desmarcarRelevos(cfg, staff, est, iso, t.id);
      const fuera = asignados(est, iso, t.id)
        .filter(e => esAutomatica(e) && (!o.soloPid || e.pid === o.soloPid || porDe(staff, e) === o.soloPid))
        .map(e => ({ e, motivo: motivoRetirada(cfg, staff, est, iso, t.id, e) })).filter(x => x.motivo);
      for (const { e, motivo } of fuera) { retirarEntrada(est, cfg, staff, iso, t.id, e.pid); out.push({ iso, turnoId: t.id, pid: e.pid, origen: e.origen, por: porDe(staff, e), motivo }); }
    }
  }
  return out;
}
// Genera (o completa) la planilla entre dos fechas: primero retira lo automático que ya no vale
// (ver arriba), luego semana tipo + coberturas + relleno de mínimos con razones. Lo puesto a
// mano o forzado no se toca nunca. opts.simular trabaja sobre una copia y devuelve el estado
// propuesto para la vista previa.
function generarPlanilla(cfg, staff, est, desde, hasta, opts) {
  const o = opts || {};
  const target = o.simular ? clonarEstado(est) : est;
  const r = { aplicados: [], huecos: [], coberturas: [], rechazados: [], retirados: [], avisos: [], estado: target };
  if (!o.sinRetirar) r.retirados = retirarQueIncumplen(cfg, staff, target, desde, hasta, { desdeIso: o.desdeIso });
  if (!o.sinPatron) {
    const p = instanciarPatron(cfg, staff, target, desde, hasta, { desdeIso: o.desdeIso });
    r.aplicados.push(...p.aplicados); r.coberturas.push(...p.coberturas); r.rechazados.push(...p.rechazados); r.avisos.push(...p.avisos);
  }
  // quien apoya por el cierre de su local vuelve a su destino (sobrevive a «Vaciar lo generado»)
  const ci = instanciarCierres(cfg, staff, target, desde, hasta, { desdeIso: o.desdeIso });
  r.aplicados.push(...ci.aplicados); r.rechazados.push(...ci.rechazados);
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
          const a = asignar(target, cfg, staff, iso, t.id, c.pid, { origen: 'generador', razon: c.razones.join(' · '), cocina: true, permitirPartido: !!o.permitirPartido, puesto: 'cocina', por: c.cubre || undefined, cubrePor: c.cubre || undefined });
          if (a.ok) r.aplicados.push({ iso, turnoId: t.id, pid: c.pid, origen: 'generador', razon: a.entry.razon, avisos: a.avisos });
        }
      }
      rev = revisarTurno(cfg, staff, target, iso, t.id);
      while (rev.faltan > 0) {
        const c = candidatosPara(cfg, staff, target, iso, t.id, { permitirPartido: !!o.permitirPartido })[0];
        if (!c) { r.huecos.push({ iso, turnoId: t.id, faltan: rev.faltan, minimo: rev.minimo, supuesto: rev.supuesto, porQueNadie: porQueNadie(cfg, staff, target, iso, t.id) }); break; }
        const a = asignar(target, cfg, staff, iso, t.id, c.pid, { origen: 'generador', razon: c.razones.join(' · '), permitirPartido: !!o.permitirPartido, puesto: 'sala', por: c.cubre || undefined, cubrePor: c.cubre || undefined });
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
        const a = asignar(target, cfg, staff, iso, t.id, c.pid, { origen: 'generador', razon: c.razones.join(' · '), permitirPartido: !!o.permitirPartido, puesto: 'sala', por: c.cubre || undefined, cubrePor: c.cubre || undefined });
        if (a.ok) { r.aplicados.push({ iso, turnoId: t.id, pid: c.pid, origen: 'generador', razon: a.entry.razon, avisos: a.avisos }); continue; }
      }
      r.huecos.push({ iso, turnoId: t.id, pos: 1, tipo: 'primero', faltan: 0, minimo: minimoDe(cfg, iso, t.id, target).min, motivo: motivoSinPrimero(cfg, staff, target, iso, t.id), porQueNadie: porQueNadiePrimero(cfg, staff, target, iso, t.id) });
    }
  }
  return r;
}
// candidatos que solo romperían reglas blandas (partido no declarado) para un hueco
// (y, desde la revisión F3, el apoyo que dejaría la casilla solo con apoyos: el encargado decide)
function candidatosConAviso(cfg, staff, est, iso, tid) {
  const sin = new Set(candidatosPara(cfg, staff, est, iso, tid).map(c => c.pid));
  return candidatosPara(cfg, staff, est, iso, tid, { permitirPartido: true, soloApoyos: true }).filter(c => !sin.has(c.pid));
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
// lunes: la semana que se genera o se mira (24/09). Con ella, quien está de baja TODA esa semana
// no tiene condiciones, y el día libre sale como es esa semana («Mari Luz libra el martes esta
// semana (en vez de los miércoles)»). Sin semana no se descarta a nadie por baja: el modelo no
// mira el reloj.
function condicionesDe(cfg, staff, lunes) {
  const st = staff || cfg.staff || [];
  const out = [];
  const semana = lunes ? [0, 1, 2, 3, 4, 5, 6].map(k => addDias(lunesDe(lunes), k)) : null;
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
    if (semana && semana.every(iso => deBaja(p, iso))) continue;
    const act = k => regla(cfg, k === 'locales' || k === 'franjas' || k === 'cocina' || k === 'noAbre' ? 'cocina' : k) && caracteristicaActiva(p, k);
    if (caracteristicaActiva(p, 'locales') && (p.locales || []).length) add(`p:${p.id}:locales`, `${p.nombre}: ${p.locales.length === 1 ? 'solo en ' : ''}${lblLocales(cfg, p.locales)}`, { tipo: 'persona', pid: p.id, k: 'locales' });
    if (caracteristicaActiva(p, 'franjas') && (p.franjas || []).length === 1) add(`p:${p.id}:franjas`, `${p.nombre} solo hace ${p.franjas[0] === 'M' ? 'mañanas' : 'tardes'}`, { tipo: 'persona', pid: p.id, k: 'franjas' });
    const lp = semana && activa(cfg, p, 'libra') ? libraPuntualDe(p, semana[0]) : null;
    if (lp) add(`p:${p.id}:libra`, `${p.nombre} libra ${textoDiasEl(lp.dias)} esta semana${(p.libra || []).length ? ` (en vez de ${textoDiasPl(p.libra)})` : ''}`, { tipo: 'persona', pid: p.id, k: 'libra', puntual: true });
    else if (activa(cfg, p, 'libra') && (p.libra || []).length) add(`p:${p.id}:libra`, `${p.nombre} libra ${textoDiasPl(p.libra)}${p.libreVariable ? ' (día libre variable)' : ''}`, { tipo: 'persona', pid: p.id, k: 'libra' });
    if (activa(cfg, p, 'partido') && ((p.partido || {}).siempre || ((p.partido || {}).dias || []).length)) {
      const cl = semana && !p.partido.siempre ? cambioDeLibre(cfg, p, semana[0]) : null;
      const mov = cl ? cl.pares.filter(x => (p.partido.dias || []).includes(x[0])) : [];
      add(`p:${p.id}:partido`, `${p.nombre} hace partido ${p.partido.siempre ? 'siempre' : 'los ' + dowsTxt(p.partido.dias)}${mov.length ? ` (esta semana, ${mov.map(x => `el del ${DOW_LBL[x[0]]} pasa al ${DOW_LBL[x[1]]}`).join(' y ')})` : ''}`, { tipo: 'persona', pid: p.id, k: 'partido' });
    }
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
  // 24/09 (revisión F3; José, 17/09: «dos apoyos no se quedan solos, hace falta un veterano»): la
  // comprueba el Generador igual que la Revisión (solo-apoyos). El relleno y la Cobertura la cumplen
  // solos; la puede romper lo puesto a mano o una plaza fija que se queda sola
  add('reg:soloApoyos', 'Dos apoyos no se quedan solos: en cada turno hay alguien de sala o de cocina, tampoco se queda un apoyo solo (José, 17/09)', { tipo: 'regla', k: 'soloApoyos', nueva: true });
  for (const l of cfg.locales) for (const f of FRANJAS) if (l.partidoAbre && l.partidoAbre[f]) add(`loc:${l.id}:partidoAbre:${f}`, `En ${l.nombre}, quien hace partido puede abrir la ${FRANJA_LBL[f].toLowerCase()}: no hace falta una cobertura entera (acordado con el grupo el 15/09)`, { tipo: 'regla', k: 'partidoAbre', localId: l.id, franja: f, nueva: true });
  return out;
}
function verificarSemana(cfg, staff, est, lunes) {
  const dias = []; for (let k = 0; k < 7; k++) dias.push(addDias(lunes, k));
  const conds = condicionesDe(cfg, staff, lunes);
  const dl = iso => `${DOW_LBL[isoDow(iso)]} ${+iso.slice(8, 10)}`;
  const slotsCache = {};
  const slots = (iso, tid) => slotsCache[iso + tid] || (slotsCache[iso + tid] = posicionesDe(cfg, staff, est, iso, tid));
  for (const c of conds) {
    const v = [], notas = [];
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
        if (c.k === 'locales') for (const t of mis) if (!p.locales.includes(t.local.id) && !apoyoPorCierre(cfg, c.pid, iso, t.franja)) v.push(`${dl(iso)}: en ${t.local.nombre}`);   // el apoyo por un cierre no rompe sus locales
        if (c.k === 'franjas') for (const t of mis) if (!p.franjas.includes(t.franja)) v.push(`${dl(iso)}: ${FRANJA_LBL[t.franja].toLowerCase()}`);
        if (c.k === 'libra' && mis.length && libraEn(p, iso)) v.push(`${dl(iso)}: trabaja`);   // el día libre de ESA semana
        if (c.k === 'partido' && mis.some(t => t.franja === 'M') && mis.some(t => t.franja === 'T') && !partidoEn(cfg, p, iso)) {
          // D1 (fase 3): el partido para cubrir a quien falta, en su casilla, está autorizado: cumplido, con nota
          const aut = mis.map(t => revisarEntrada(cfg, staff, est, iso, t.id, c.pid).autorizados).flat().find(a => a.k === 'partido');
          if (aut) notas.push(`${dl(iso)}: ${aut.texto}`); else v.push(`${dl(iso)}: partido no declarado`);
        }
        if (c.k === 'vetos') for (const t of mis) if (vetoDe(p, t.local.id, t.franja, dow)) v.push(`${dl(iso)}: ${t.local.nombre} ${FRANJA_LBL[t.franja].toLowerCase()}`);
        if (c.k === 'nuncaCon') for (const t of mis) if (pidsEn(est, iso, t.id).includes(c.otro)) v.push(`${dl(iso)}: juntos en ${t.local.nombre}`);
        if (c.k === 'cocina') for (const t of mis) { const e = asignados(est, iso, t.id).find(x => x.pid === c.pid); if (e && e.cocina && !puedeCocina(cfg, p, t.local.id, iso)) v.push(`${dl(iso)}: lleva la cocina en ${t.local.nombre}`); }
        if (c.k === 'abre') { const tid = turnoId(c.localId, c.franja); if (pidsEn(est, iso, tid).includes(c.pid)) { const s = slots(iso, tid).find(x => x.pid === c.pid); if (s && s.pos !== 1) v.push(`${dl(iso)}: sale ${s.pos}.º`); } }
        if (c.k === 'noAbre') { const t = mis.find(x => x.local.id === c.localId); if (t) { const s = slots(iso, t.id).find(x => x.pid === c.pid); if (s && s.pos === 1) v.push(`${dl(iso)}: abre ${t.local.nombre}`); } }
        if (c.k === 'noPrimero') for (const t of mis) { if (!p.noPrimero.includes(t.franja)) continue; const s = slots(iso, t.id).find(x => x.pid === c.pid); if (s && s.pos === 1) v.push(`${dl(iso)}: primero en ${t.local.nombre} ${FRANJA_LBL[t.franja].toLowerCase()}`); }
      }
    }
    else if (c.tipo === 'regla' && c.k === 'soloApoyos') for (const iso of dias) for (const t of turnosDe(cfg)) {
      if (!turnoAbierto(cfg, est, iso, t.id) || !revisarTurno(cfg, staff, est, iso, t.id).soloApoyos) continue;
      v.push(`${dl(iso)}: ${t.local.nombre} ${FRANJA_LBL[t.franja].toLowerCase()} (${pidsEn(est, iso, t.id).map(pid => nombreDe(staff, pid)).join(', ')})`);
    }
    else if (c.tipo === 'regla' && c.k === 'primeroCompleto') for (const iso of dias) for (const t of turnosDe(cfg)) {
      if (t.franja !== 'T' || !turnoAbierto(cfg, est, iso, t.id)) continue;
      const s = slots(iso, t.id)[0]; if (!s || s.hueco) continue;
      const enM = turnosDe(cfg).some(x => x.franja === 'M' && pidsEn(est, iso, x.id).includes(s.pid));
      if (enM && !s.continuo && !puedePrimero(cfg, staff, est, iso, t.id, s.pid).ok) v.push(`${dl(iso)}: ${s.nombre} abre ${t.local.nombre} viniendo de la mañana`);
    }
    c.ok = !v.length; c.detalle = v.join(' · ');
    if (notas.length) c.nota = notas.join(' · ');
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
  // la foto de cada casilla: quién está y por quién (24/09, revisión F3: con solo los nombres, un relevo
  // «cubre a» —Mari Luz pasa a ir «por Iván» sin moverse— no era un cambio y no se podía volcar)
  const foto = e => { const m = {}; for (const iso of dias) for (const t of turnosDe(cfg)) m[iso + '|' + t.id] = asignados(e, iso, t.id).map(x => ({ pid: x.pid, por: porDe(staff, x) || null })); return m; };
  const antes = foto(target);
  const g = generarPlanilla(cfg, staff, target, lunes, dias[6], { desdeIso: o.desdeIso, permitirPartido: !!o.permitirPartido, sinPatron: !!o.sinPatron, sinRetirar: !!o.sinRetirar });
  const despues = foto(target);
  const cambios = [];
  let relevos = 0, desmarcados = 0;
  for (const k of Object.keys(despues)) {
    if (JSON.stringify(antes[k]) === JSON.stringify(despues[k])) continue;
    const [iso, tid] = k.split('|');
    const porAntes = {}, porDespues = {};
    for (const x of antes[k]) if (x.por) porAntes[x.pid] = x.por;
    for (const x of despues[k]) if (x.por) porDespues[x.pid] = x.por;
    // quien sigue en la casilla y cambia de «por»: pasa a cubrir (relevo) o deja de hacerlo
    for (const x of despues[k]) { const a = antes[k].find(y => y.pid === x.pid); if (!a || a.por === x.por) continue; if (x.por) relevos++; else desmarcados++; }
    cambios.push({ iso, turnoId: tid, antes: antes[k].map(x => x.pid), despues: despues[k].map(x => x.pid), porAntes, porDespues });
  }
  const cambiado = new Set(cambios.map(c => c.iso + '|' + c.turnoId));
  const locales = cfg.locales.map(l => ({
    id: l.id, nombre: l.nombre, corto: l.corto, color: l.color, cocina: descripcionCocina(cfg, l),
    franjas: FRANJAS.map(f => ({ franja: f, dias: dias.map(iso => {
      const tid = turnoId(l.id, f);
      if (!turnoAbierto(cfg, target, iso, tid)) { const c = cierreEn(cfg, iso, tid); return { iso, tid, abierto: false, cierre: c ? { id: c.id, localId: c.localId, motivo: c.motivo, detalle: c.detalle || '', etiqueta: etiquetaCierre(c), texto: textoCierre(cfg, c), hasta: hastaCierre(c) } : null }; }
      const r = revisarTurno(cfg, staff, target, iso, tid);
      return { iso, tid, abierto: true, n: r.n, min: r.minimo, supuesto: r.supuesto, refuerzo: r.refuerzo, faltan: r.faltan, cambiado: cambiado.has(iso + '|' + tid), slots: posicionesDe(cfg, staff, target, iso, tid) };
    }) })),
  }));
  // 24/09 (D11): quién no trabaja por el cierre de su local y quién apoya en otro, día a día. Quien no
  // trabaja por un cierre no «libra»: sale aparte, para que no se confunda con su descanso. Por medios
  // días (revisión F2): sinTrabajo = el día entero, sin ningún otro turno; sinTrabajoParcial = la parte
  // cerrada de quien trabaja la otra franja (Hojan hace El 33 por la mañana); apoyoSinSitio = quien
  // apoya «donde haga falta» y nadie ha colocado (apoyosSinSitio): tampoco libra.
  const sinTrabajo = {}, sinTrabajoParcial = {}, refuerzos = {}, apoyoSinSitio = {};
  for (const iso of dias) {
    sinTrabajo[iso] = []; sinTrabajoParcial[iso] = []; refuerzos[iso] = []; apoyoSinSitio[iso] = [];
    if (!cierresDe(cfg).some(c => diasDeCierre(c).includes(iso))) continue;
    for (const p of staff) {
      const sin = [];
      for (const f of FRANJAS) {
        if (ausenciaEn(p, iso, f)) continue;   // por franja (D10): la tarde de vacaciones no es «sin trabajo»
        const dc = decisionCierre(cfg, p.id, iso, f);
        if (!dc) continue;
        if (dc.tipo === 'REFUERZA') { const t = turnosDe(cfg).find(x => x.franja === f && pidsEn(target, iso, x.id).includes(p.id)); refuerzos[iso].push({ pid: p.id, franja: f, tid: t ? t.id : null, localId: dc.cierre.localId }); }
        else sin.push(f);
      }
      if (!sin.length) continue;
      if (turnosDe(cfg).some(t => pidsEn(target, iso, t.id).includes(p.id))) sinTrabajoParcial[iso].push({ pid: p.id, franjas: sin });
      else sinTrabajo[iso].push(p.id);
    }
    for (const x of apoyosSinSitio(cfg, staff, target, iso)) if (!apoyoSinSitio[iso].includes(x.pid) && !turnosDe(cfg).some(t => pidsEn(target, iso, t.id).includes(x.pid))) apoyoSinSitio[iso].push(x.pid);
  }
  // la baja se mira día a día (24/09, S6): quien estuvo de baja solo el lunes libra el sábado
  const libran = {}, diasPorPersona = {};
  for (const iso of dias) {
    const trabajan = new Set();
    for (const t of turnosDe(cfg)) for (const pid of pidsEn(target, iso, t.id)) trabajan.add(pid);
    libran[iso] = staff.filter(p => !trabajan.has(p.id) && !ausenciaEn(p, iso) && !p.standby && !sinTrabajo[iso].includes(p.id) && !apoyoSinSitio[iso].includes(p.id)).map(p => p.id);
    for (const pid of trabajan) diasPorPersona[pid] = (diasPorPersona[pid] || 0) + 1;
  }
  const huecos = g.huecos.filter(h => dias.includes(h.iso)).map(h => Object.assign({ pos: null, tipo: 'faltan' }, h));
  const condiciones = verificarSemana(cfg, staff, target, lunes);
  const turnos = dias.reduce((a, iso) => a + turnosDe(cfg).filter(t => turnoAbierto(cfg, target, iso, t.id)).length, 0);
  const plazas = dias.reduce((a, iso) => a + turnosDe(cfg).reduce((b, t) => b + pidsEn(target, iso, t.id).length, 0), 0);
  // de baja = los siete días; una baja de parte de la semana sale aparte («de baja el lunes»)
  const bajaDias = staff.map(p => ({ pid: p.id, dias: dias.filter(iso => deBaja(p, iso)) }));
  return { lunes, dias, locales, libran, sinTrabajo, sinTrabajoParcial, apoyoSinSitio, refuerzos, huecos, cambios, relevos, desmarcados, condiciones, aplicados: g.aplicados.length, rechazados: g.rechazados, retirados: g.retirados, avisos: g.avisos,
    resumen: { turnos, plazas, condiciones: condiciones.length, condicionesRotas: condiciones.filter(c => !c.ok).length, huecos: huecos.length, descansos: Object.values(libran).reduce((a, x) => a + x.length, 0), maxDias: Math.max(0, ...Object.values(diasPorPersona)), cambios: cambios.length, retirados: g.retirados.length,
      deBaja: bajaDias.filter(x => x.dias.length === 7).map(x => x.pid), bajasParciales: bajaDias.filter(x => x.dias.length && x.dias.length < 7) },
    estado: target };
}

// ---------- cambiar el día libre de una semana ya volcada ----------
// 24/09 (reunión, D9): «esta semana libra martes en vez de miércoles… en el equipo te lo pone
// tal cual, pero luego no lo quita». Si la semana ya está en la planilla, guardar el cambio en la
// ficha lo aplica al momento, con el mismo mecanismo que el generador pero solo con esa persona
// y quien la cubre: sale de los días que ahora libra (solo lo automático: lo puesto a mano o
// forzado se queda, con su aviso, y se lista en `quedan`), se retira a quien la cubría el día
// que ahora trabaja y entra ese día con sus plazas del día que deja libre (con su partido).
// Con dias = [] se quita el cambio y todo vuelve a su sitio. Guarda el cambio en la ficha
// (p.libraPuntual) y toca `est`; no mira el reloj (opts.desdeIso para no tocar días pasados).
// Solo toca los días que cambian —los que libra de más o de menos, con el cambio de antes y con
// el nuevo— y que ya tienen planilla (24/09, revisión: volvía a poner toda su semana tipo, también
// lo quitado a mano otro día, y rellenaba días que nadie había generado). Un día que cambia y ya
// ha pasado no se toca, y se avisa de cuántos días trabaja esa semana.
// Devuelve { quitados, puestos, quedan, huecos, rechazados, avisos }.
function moverDiaLibre(cfg, staff, est, pid, lunes, dias, opts) {
  const o = opts || {};
  const vacio = { quitados: [], puestos: [], quedan: [], huecos: [], rechazados: [], avisos: [] };
  const p = personaDe(staff, pid);
  if (!p) return vacio;
  const l0 = lunesDe(lunes);
  const antes = cambioDeLibre(cfg, p, l0);
  ponerLibraPuntual(p, l0, dias);
  const ahora = cambioDeLibre(cfg, p, l0);
  const enEst = (est.days || []).map(d => d.iso).filter(iso => iso >= l0 && iso <= addDias(l0, 6));
  if (!enEst.length) return vacio;
  const desde = enEst[0], hasta = enEst[enEst.length - 1];
  const cambian = new Set();
  for (const c of [antes, ahora]) if (c) for (const d of c.nuevos.concat(c.liberados)) cambian.add(d);
  const conPlanilla = iso => Object.values(est.asig[iso] || {}).some(l => l.length);
  const diasQueCambian = enEst.filter(iso => cambian.has(isoDow(iso)) && conPlanilla(iso));
  const tocables = diasQueCambian.filter(iso => !o.desdeIso || iso >= o.desdeIso);
  const pasados = diasQueCambian.filter(iso => o.desdeIso && iso < o.desdeIso);
  const trabaja = () => enEst.filter(iso => casillasDe(est, iso, pid).length).length;
  const nAntes = trabaja();
  const quitados = tocables.length ? retirarQueIncumplen(cfg, staff, est, desde, hasta, { soloPid: pid, soloDias: tocables }) : [];
  const ip = tocables.length ? instanciarPatron(cfg, staff, est, desde, hasta, { soloPid: pid, soloDias: tocables }) : { aplicados: [], rechazados: [], avisos: [] };
  const quedan = [];
  for (const iso of tocables) {
    if (!(activa(cfg, p, 'libra') && libraEn(p, iso))) continue;
    for (const { tid } of casillasDe(est, iso, pid)) quedan.push({ iso, turnoId: tid, pid, avisos: avisosVigentes(cfg, staff, est, iso, tid, pid) });
  }
  const huecos = [], vistas = new Set();
  for (const q of quitados) {
    const k = q.iso + '|' + q.turnoId;
    if (vistas.has(k)) continue;
    vistas.add(k);
    const rev = revisarTurno(cfg, staff, est, q.iso, q.turnoId);
    if (rev.faltan) huecos.push({ iso: q.iso, turnoId: q.turnoId, faltan: rev.faltan, minimo: rev.minimo, supuesto: rev.supuesto });
  }
  const avisos = ip.avisos.filter(a => a.tipo !== 'pasado');
  if (pasados.length) {
    const nDespues = trabaja();
    avisos.push({ pid, semana: l0, tipo: 'pasado', texto: `${pasados.map(iso => 'el ' + diaYNum(iso)).join(' y ')} ya ha${pasados.length > 1 ? 'n' : ''} pasado y no se toca${pasados.length > 1 ? 'n' : ''}${nDespues !== nAntes ? `: esta semana trabaja ${nDespues} días en vez de ${nAntes}` : ''}` });
  }
  return { quitados, puestos: ip.aplicados, quedan, huecos, rechazados: ip.rechazados, avisos };
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
// 24/09 (fase 3):
//  · D2: «cubre a» es PRIORIDAD, no un peso: el orden es (no evitada) → (cubre a quien falta) →
//    puntuación → menos turnos esa semana. Con la semana entera (S8), el +60 no le llegaba a Mari
//    Luz frente a Dulce (88 contra 91) por estar libre ese día y tener menos turnos.
//  · «cubre a» se lee con cubreEnCasilla (interruptor y puesto; la casilla es la de quien falta) y
//    le autoriza el partido (D1): el aviso autorizado no resta.
//  · S33: quien dejaría la casilla solo con apoyos no entra en ningún plan (revisión F3; principio 6
//    de decisiones.md: el relajado solo relaja partidos no declarados, y «dos apoyos no se quedan
//    solos», José 17/09). Antes el relajado lo proponía con aviso y el domingo 4 salía Dulce con
//    Lavinia; ahora sale alguien de sala con el aviso del partido, o el hueco con su porqué.
//  · S34: la sala se pide con el puesto (puedeEstar): quien solo hace cocina o ya la lleva ese día no entra.
// opts.faltaCocina: si quien falta llevaba la cocina en esa casilla (su puesto, para «cubre a»)
// opts.sinCubre (revisión F3, D3): la casilla ya tiene quien cubre a X (el relevo, o quien ha entrado
// «por X» en este plan): el resto entra «para llegar al mínimo», sin la prioridad ni el partido de
// «cubre a». Antes salía primera otra designada que necesitaba el partido autorizado, el plan la
// ponía sin él, fallaba y la casilla se quedaba con un hueco habiendo candidatos.
function candidatosCobertura(cfg, staff, est, iso, tid, faltaPid, opts) {
  const o = opts || {};
  const { localId, franja } = partirTurno(tid);
  const l = localDe(cfg, localId);
  const dow = isoDow(iso);
  const falta = personaDe(staff, faltaPid);
  const out = [];
  for (const p of staff) {
    if (p.id === faltaPid || (o.excluir || []).includes(p.id)) continue;
    const cubre = falta && !o.sinCubre ? cubreEnCasilla(cfg, staff, est, p, iso, tid, { cocina: !!o.cocina, falta: faltaPid, suCasilla: true, ausente: true, faltaCocina: o.faltaCocina }) : null;
    const cub = cubre ? { cubrePor: cubre, cubreSuCasilla: true, cubreAusente: true } : {};
    const r = puedeEstar(cfg, staff, est, iso, tid, p.id, Object.assign({ permitirPartido: !!o.permitirPartido, puesto: o.cocina ? 'cocina' : 'sala' }, cub));
    if (!r.ok) continue;
    if (!o.cocina && quedariaSoloApoyos(staff, est, iso, tid, p.id)) continue;
    const avisos = r.avisos;
    let score = 50; const razones = [];
    if (o.primero) {
      const pr = puedePrimero(cfg, staff, est, iso, tid, p.id, cub);
      if (!pr.ok) continue;
      if ((l.primero && l.primero[franja] === p.id) || (p.abre && p.abre[localId] && p.abre[localId].includes(franja))) { score += 25; razones.push('sale el primero'); } else razones.push('puede abrir (turno completo)');
    }
    if (o.cocina) { const rc = rangoCocina(cfg, l, p, franja, iso); if (rc < 0) continue; score += 40 - Math.min(rc, 30); razones.push(rc < 100 ? `cocina titular de ${l.nombre}` : 'cocina de reserva'); }
    if (cubre) { score += 60; razones.push(`cubre a ${falta.nombre}`); }
    const pc = puntosCierre(cfg, p, iso, tid);   // apoyo por el cierre de su local (24/09, D11)
    if (pc) { score += pc.puntos; razones.push(pc.razon); }
    const pp = puntosPuesto(p, false);
    if (pp) { score += pp.puntos; razones.push(pp.razon); }
    if ((p.locales || []).length && p.locales[0] === localId) { score += 10; razones.push(`su local habitual es ${l.nombre}`); }
    const trabajaHoy = turnosDe(cfg).some(t => pidsEn(est, iso, t.id).includes(p.id));
    if (!trabajaHoy) { score += 20; razones.push('libre ese día'); } else razones.push('ya trabaja ese día (partido)');
    const ns = turnosSemanaDe(est, p.id, iso);
    score -= 4 * ns; razones.push(`${ns} turno${ns === 1 ? '' : 's'} esa semana`);
    if (p.prefs && (p.prefs.evitaDows || []).includes(dow)) { score -= 40; razones.push(`prefiere no trabajar ${DOW_PL[dow]}`); }
    if (avisos.length) { score -= 25; razones.push(...avisos); }
    const evitado = (o.evitar || []).includes(p.id);
    if (evitado) score -= 1000;   // alternativa: otra persona si la hay
    out.push({ pid: p.id, nombre: p.nombre, score, razones, avisos, autorizados: r.autorizados, libre: !trabajaHoy, turnosSemana: ns, cubre: !!cubre, evitado });
  }
  out.sort((a, b) => (a.evitado - b.evitado) || (b.cubre - a.cubre) || b.score - a.score || a.turnosSemana - b.turnosSemana || (a.pid < b.pid ? -1 : 1));
  return out;
}
// un plan: sobre una copia, quita a la persona de sus turnos y va cubriendo cada uno
// (primero los que menos candidatos tienen); estrategia = {permitirPartido, evitarDe: planBase}
function planCobertura(cfg, staff, est, inc, afectados, estrategia, opts) {
  const o = opts || {};
  const e = clonarEstado(est);
  // la ausencia simulada, con sus franjas si es de media jornada (D10)
  const ausSim = () => { const x = { tipo: inc.tipo, desde: inc.desde, hasta: inc.sinFin ? undefined : (inc.hasta || inc.desde) }; if (franjasAusencia(inc)) x.franjas = franjasAusencia(inc); return x; };
  const staffSim = inc.tipo === 'CAMBIO' ? staff : staff.map(p => p.id === inc.pid ? Object.assign({}, p, { ausencias: (p.ausencias || []).concat([ausSim()]) }) : p);
  // al salir quien falta, sale con ella su marca de «abre» o de cocina fijada (retirarEntrada): si no,
  // la casilla seguía «fijada» sin nadie marcado y el relevo no abría (revisión F3)
  for (const a of afectados) retirarEntrada(e, cfg, staffSim, a.iso, a.tid, inc.pid);
  const plan = { id: null, titulo: '', estrategia: estrategia.permitirPartido ? 'con avisos: partidos no declarados' : 'con las reglas del grupo', relajado: !!estrategia.permitirPartido, asignaciones: [], huecos: [], sinCubrir: [], estado: e };
  const evitarEn = (iso, tid) => estrategia.evitarDe ? estrategia.evitarDe.asignaciones.filter(x => x.iso === iso && x.tid === tid && !x.yaEstaba).map(x => x.pid) : [];
  const sinLaPersona = pq => { const nombre = nombreDe(staff, inc.pid); for (const k of Object.keys(pq)) { pq[k] = pq[k].filter(n => n !== nombre); if (!pq[k].length) delete pq[k]; } return pq; };
  const nCand = a => candidatosCobertura(cfg, staffSim, e, a.iso, a.tid, inc.pid, { permitirPartido: !!estrategia.permitirPartido, faltaCocina: a.cocina }).length;
  const orden = afectados.map(a => ({ a, n: nCand(a) })).sort((x, y) => x.n - y.n || (x.a.iso < y.a.iso ? -1 : x.a.iso > y.a.iso ? 1 : 0));
  const nombreX = nombreDe(staff, inc.pid);
  // D3: si la casilla ya tiene quien cubre a X (el relevo, o quien ya ha entrado «por X» en este plan),
  // quien entra además no «cubre a X»: entra para llegar al mínimo, sin «por» y sin el permiso de
  // partido de la designación (revisión F3: antes quedaban dos o tres «por Iván» en la misma casilla)
  const yaCubierta = a => plan.asignaciones.some(x => x.iso === a.iso && x.tid === a.tid && x.por === inc.pid);
  const pon = (a, c, extra) => {
    const relevo = yaCubierta(a);
    const rev0 = revisarTurno(cfg, staffSim, e, a.iso, a.tid);
    const minimo = relevo ? `para llegar al mínimo (había ${rev0.n} de ${rev0.minimo})` : null;
    const cub = !relevo && c.cubre ? { cubrePor: inc.pid, cubreSuCasilla: true, cubreAusente: true } : {};
    const r = asignar(e, cfg, staffSim, a.iso, a.tid, c.pid, Object.assign({ origen: 'cobertura', razon: minimo || `cubre a ${nombreX}`, por: minimo ? undefined : inc.pid, permitirPartido: !!estrategia.permitirPartido, puesto: extra && extra.cocina ? 'cocina' : 'sala' }, cub, extra || {}));
    if (!r.ok) return false;
    const razones = minimo ? [minimo].concat(c.razones.filter(x => x !== `cubre a ${nombreX}`)) : c.razones;
    plan.asignaciones.push({ iso: a.iso, tid: a.tid, localId: a.localId, franja: a.franja, pid: c.pid, nombre: c.nombre, razones, avisos: c.avisos, autorizados: r.autorizados || [], cocina: !!(extra && extra.cocina), abre: primeroDe(cfg, staffSim, e, a.iso, a.tid) === c.pid, libre: c.libre, score: c.score, por: minimo ? null : inc.pid, razon: minimo || `cubre a ${nombreX}`, cubre: !minimo && !!c.cubre });
    return true;
  };
  // el primero de la lista que se pueda poner: si uno falla al asignarlo, se prueba con el siguiente en
  // vez de dejar el hueco (revisión F3)
  const ponPrimero = (a, opcs, extra) => {
    const excluir = [];
    for (let k = 0; k < 8; k++) {
      let c = null;
      for (const op of opcs) { c = candidatosCobertura(cfg, staffSim, e, a.iso, a.tid, inc.pid, Object.assign({ excluir, sinCubre: yaCubierta(a) }, op))[0]; if (c) break; }
      if (!c) return false;
      if (pon(a, c, extra)) return true;
      excluir.push(c.pid);
    }
    return false;
  };
  for (const { a } of orden) {
    const { localId, franja } = partirTurno(a.tid);
    const l = localDe(cfg, localId);
    // D3, el relevo (reunión del 24/09: Mari Luz ya está de tarde con Iván los viernes y sábados):
    // quien ya está en la casilla y «cubre a» quien falta es quien la cubre. No es una plaza nueva:
    // sale en el plan como `yaEstaba` (con «por» al aplicar), abre si le toca, y no cuenta en
    // «Entran». Antes la casilla se quedaba en 2 de 3 y entraba la mejor puntuada sin decir que
    // Mari Luz seguía ahí y pasaba a abrir.
    // Revisión F3: en la simulación se le pone ya el «por» (como al aplicar) antes de mirar quién abre
    // y qué falta: sin él, con el partido autorizado (D1) no podía abrir y el plan enseñaba un hueco
    // en la 1.ª posición que al aplicar no existía.
    const rel = relevoEn(cfg, staffSim, e, a.iso, a.tid, inc.pid, { aqui: true, faltaCocina: a.cocina });
    if (rel) {
      const q = personaDe(staffSim, rel), en = asignados(e, a.iso, a.tid).find(x => x.pid === rel);
      marcarRelevo(en, staffSim, inc.pid);
      normalizarCasilla(e, cfg, staffSim, a.iso, a.tid);
      const aut = revisarEntrada(cfg, staffSim, e, a.iso, a.tid, rel, { cubrePor: inc.pid, cubreSuCasilla: true, cubreAusente: true }).autorizados;
      plan.asignaciones.push({ iso: a.iso, tid: a.tid, localId: a.localId, franja: a.franja, pid: rel, nombre: q.nombre, yaEstaba: true, razones: [`cubre a ${nombreX}`, 'ya estaba en este turno'], avisos: [], autorizados: aut, cocina: !!en.cocina, abre: primeroDe(cfg, staffSim, e, a.iso, a.tid) === rel, libre: false, score: 0, por: inc.pid, razon: `cubre a ${nombreX}` });
    }
    let rev = revisarTurno(cfg, staffSim, e, a.iso, a.tid);
    const necesitaCocina = rev.sinCocina && (rev.cocinaObligatoria || a.cocina || rev.faltan > 0) && l && localTieneCocina(l, franja);
    const necesario = rev.faltan > 0 || necesitaCocina || rev.sinAbre;
    if (!necesario && !o.siempre) { if (!rel) plan.sinCubrir.push({ iso: a.iso, tid: a.tid, localId, franja, n: rev.n, min: rev.minimo, motivo: `la casilla sigue completa (${rev.n} de ${rev.minimo})` }); continue; }
    const base = { permitirPartido: !!estrategia.permitirPartido, evitar: evitarEn(a.iso, a.tid), faltaCocina: a.cocina };
    if (necesitaCocina) {
      ponPrimero(a, [Object.assign({ cocina: true }, base)], { cocina: true });
      rev = revisarTurno(cfg, staffSim, e, a.iso, a.tid);
    }
    let vueltas = 0;
    while ((rev.faltan > 0 || (o.siempre && !plan.asignaciones.some(x => x.iso === a.iso && x.tid === a.tid))) && vueltas++ < 6) {
      if (!ponPrimero(a, rev.sinAbre ? [Object.assign({ primero: true }, base), base] : [base], null)) break;
      rev = revisarTurno(cfg, staffSim, e, a.iso, a.tid);
    }
    if (rev.faltan > 0) plan.huecos.push({ iso: a.iso, tid: a.tid, localId, franja, tipo: 'faltan', faltan: rev.faltan, minimo: rev.minimo, supuesto: rev.supuesto, motivo: `faltan ${rev.faltan} de ${rev.minimo}`, porQueNadie: sinLaPersona(porQueNadie(cfg, staffSim, e, a.iso, a.tid)) });
    if (rev.sinCocina && necesitaCocina) plan.huecos.push({ iso: a.iso, tid: a.tid, localId, franja, tipo: 'cocina', motivo: 'sin cocina', porQueNadie: sinLaPersona(porQueNadie(cfg, staffSim, e, a.iso, a.tid, { cocina: true })) });
    if (rev.sinAbre && !ponPrimero(a, [Object.assign({ primero: true }, base)], null)) plan.huecos.push({ iso: a.iso, tid: a.tid, localId, franja, tipo: 'primero', pos: 1, motivo: motivoSinPrimero(cfg, staffSim, e, a.iso, a.tid), porQueNadie: sinLaPersona(porQueNadiePrimero(cfg, staffSim, e, a.iso, a.tid)) });
  }
  // cambio de turno: quien cubre puede ceder a cambio uno de sus turnos cercanos a la persona (el
  // relevo no: no entra nuevo, ya estaba)
  if (inc.tipo === 'CAMBIO' && o.intercambio !== false) {
    const usados = new Set();
    for (const as of plan.asignaciones) {
      if (as.yaEstaba) continue;
      const x = intercambioPara(cfg, staff, e, inc.pid, as, afectados, usados);
      if (x) { as.intercambio = x; usados.add(x.iso + '|' + x.tid); }
    }
  }
  plan.completo = !plan.huecos.length;
  // los avisos autorizados (el partido para cubrir a quien falta, D1) no cuentan: no hunden el plan
  plan.avisos = plan.asignaciones.reduce((a, x) => a + x.avisos.length, 0);
  plan.score = plan.asignaciones.reduce((a, x) => a + x.score, 0);
  // D2 también entre planes (revisión F3): cuántas plazas cubre quien «cubre a» (el relevo cuenta igual
  // en todos los planes). El plan B que evita a la designada ganaba al A por puntos.
  plan.cubren = plan.asignaciones.filter(x => x.cubre).length;
  // el relevo no es una plaza nueva: no sale en «Entran», pero sí en la firma (distingue los planes)
  plan.personas = [...new Set(plan.asignaciones.filter(x => !x.yaEstaba).map(x => x.pid))];
  plan.relevos = plan.asignaciones.filter(x => x.yaEstaba).map(x => ({ iso: x.iso, tid: x.tid, pid: x.pid }));
  plan.resumen = { cubiertos: plan.asignaciones.length, huecos: plan.huecos.length, avisos: plan.avisos, sinCubrir: plan.sinCubrir.length, personas: plan.personas.length, relevos: plan.relevos.length };
  plan.firma = plan.asignaciones.map(x => `${x.iso}|${x.tid}|${x.pid}|${x.yaEstaba ? 'relevo' : ''}|${x.intercambio ? x.intercambio.iso + x.intercambio.tid : ''}`).sort().join(';');
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
    if (afectados.some(a => a.iso === iso)) continue;
    for (const t of turnosDe(cfg)) {
      if (ausenciaEn(p, iso, t.franja)) continue;   // por franja (D10)
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
// 24/09 (S8, fase 3): los días de planilla que necesita la Cobertura para una incidencia: semanas
// enteras, desde la semana anterior hasta el domingo de la siguiente (de −7 a +13 días desde el
// lunes). «N turnos esa semana» cuenta la semana entera y el cambio de turno busca su turno a
// cambio entre −7 y +13 días (intercambioPara). La pestaña pasaba solo los días marcados: Mari Luz
// salía con 3 turnos esa semana en vez de 8, y el cambio de turno nunca encontraba nada. El modelo
// dice lo que necesita y la interfaz se lo trae.
function rangoNecesario(inc) {
  const r = rangoDeIncidencia(inc);
  return { desde: addDias(mondayOf(r.desde), -7), hasta: addDias(mondayOf(r.hasta), 13) };
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
  for (const a of afectados) retirarEntrada(sin, cfg, staff, a.iso, a.tid, inc.pid);
  for (const a of afectados) {
    const rev = revisarTurno(cfg, staff, sin, a.iso, a.tid);
    const l = localDe(cfg, a.localId);
    const necesitaCocina = rev.sinCocina && (rev.cocinaObligatoria || a.cocina || rev.faltan > 0) && l && localTieneCocina(l, a.franja);
    // quién se queda en la casilla (la pestaña lo dice: «quedan Mari Luz y Leo, 2 de 3»)
    out.afectados.push(Object.assign({}, a, { quedan: rev.n, quedanPids: pidsEn(sin, a.iso, a.tid), faltan: rev.faltan, sinCocina: !!necesitaCocina, sinAbre: rev.sinAbre, necesario: rev.faltan > 0 || !!necesitaCocina || rev.sinAbre }));
  }
  out.necesarios = out.afectados.filter(a => a.necesario).length;
  if (!afectados.length) return out;
  const A0 = planCobertura(cfg, staff, est, inc, afectados, { permitirPartido: false }, o);
  const B0 = planCobertura(cfg, staff, est, inc, afectados, { permitirPartido: false, evitarDe: A0 }, o);
  const A1 = planCobertura(cfg, staff, est, inc, afectados, { permitirPartido: true }, o);
  const B1 = planCobertura(cfg, staff, est, inc, afectados, { permitirPartido: true, evitarDe: A1 }, o);
  const vistos = new Set(); const planes = [];
  for (const pl of [A0, B0, A1, B1]) { if (vistos.has(pl.firma)) continue; vistos.add(pl.firma); planes.push(pl); }
  planes.sort((x, y) => x.huecos.length - y.huecos.length || x.avisos - y.avisos || y.cubren - x.cubren || y.score - x.score);
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
      // 24/09 (D10, S7): con «Mañana» o «Tarde», la ausencia es solo de esa franja (antes, del día entero)
      if (franjasAusencia(inc)) a.franjas = franjasAusencia(inc);
      if (inc.detalle) a.detalle = inc.detalle;
      res.ausencia = anadirAusencia(p, a).ausencia;
    }
  }
  // quien falta sale con su marca de «abre» o de cocina fijada (retirarEntrada, revisión F3): Mari
  // Luz, de relevo, abría en el plan pero en la planilla seguía la marca de Iván (la «a» de su plaza de
  // la semana tipo) y su tramo y su perfil decían 21:00–00:00
  for (const a of turnosAfectados(cfg, staff, est, inc.pid, desde, hasta, { franjas: inc.franjas, turnos: inc.turnos, dias })) if (retirarEntrada(est, cfg, staff, a.iso, a.tid, inc.pid)) res.quitados++;
  for (const as of (plan && plan.asignaciones) || []) {
    // D3: el relevo ya está en la casilla: no se asigna, se marca «por» quien falta. Si entre proponer
    // y confirmar ha salido de la casilla, no se crea una plaza nueva: va a rechazados.
    if (as.yaEstaba) {
      const en = asignados(est, as.iso, as.tid).find(x => x.pid === as.pid);
      if (en) { marcarRelevo(en, staff, inc.pid); normalizarCasilla(est, cfg, staff, as.iso, as.tid); res.asignados.push({ iso: as.iso, tid: as.tid, pid: as.pid, avisos: [], yaEstaba: true }); }
      else res.rechazados.push({ iso: as.iso, tid: as.tid, pid: as.pid, motivo: 'ya no está en la casilla' });
      continue;
    }
    const por = as.por === undefined ? inc.pid : as.por;   // quien entra «para llegar al mínimo» no lleva «por»
    const cub = por ? { cubrePor: por, cubreSuCasilla: true, cubreAusente: true } : {};
    const r = asignar(est, cfg, staff, as.iso, as.tid, as.pid, Object.assign({ origen: 'cobertura', razon: as.razon || `cubre a ${p.nombre}`, por: por || undefined, cocina: as.cocina ? true : undefined, permitirPartido: true }, cub));
    if (r.ok) res.asignados.push({ iso: as.iso, tid: as.tid, pid: as.pid, avisos: r.avisos }); else { res.rechazados.push({ iso: as.iso, tid: as.tid, pid: as.pid, motivo: r.motivo }); continue; }
    if (as.intercambio && inc.tipo === 'CAMBIO') {
      const x = as.intercambio;
      if (desasignar(est, x.iso, x.tid, as.pid)) {
        const r2 = asignar(est, cfg, staff, x.iso, x.tid, inc.pid, { origen: 'cobertura', razon: `cambio con ${nombreDe(staff, as.pid)}`, permitirPartido: true });
        if (r2.ok) res.intercambios.push({ iso: x.iso, tid: x.tid, pid: inc.pid, quita: as.pid });
        else { asignar(est, cfg, staff, x.iso, x.tid, as.pid, { origen: 'manual' }); res.rechazados.push({ iso: x.iso, tid: x.tid, pid: inc.pid, motivo: r2.motivo }); }
      } else {
        // revisión F3: antes se perdía sin avisar (la pestaña aplicaba sobre los días marcados y el turno
        // a cambio era de otro día). Ahora se dice: o ese día no está en la planilla que se aplica, o
        // quien cedía el turno ya no está en él
        const cargado = (est.days || []).some(d => d.iso === x.iso);
        res.rechazados.push({ iso: x.iso, tid: x.tid, pid: inc.pid, motivo: cargado ? `${nombreDe(staff, as.pid)} ya no está en ese turno` : 'ese día no está en la planilla que se está cambiando' });
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
// cerradas (mitadesCerradas): las franjas en las que estaba en un local cerrado por fechas. Si el
// cierre le quitó una mitad de su partido, la otra se queda con su tramo del partido (enPartido): nadie
// ha decidido que entre a abrir ni que haga el turno entero (24/09, revisión F2: Hojan pasaba solo de
// El 33 de 11:00 a 16:00 a El 33 de 07:00 a 16:00, y sus horas no bajaban). Ese día no cuenta como
// partido (partido = trabaja las dos franjas).
function repartoDelDia(mias, cerradas) {
  const partido = mias.some(x => x.franja === 'M') && mias.some(x => x.franja === 'T');
  const abren = mias.filter(x => x.e.abre);
  const continuo = partido && abren.length === 2 && abren[0].localId === abren[1].localId ? abren[0].localId : null;
  const fr = [...new Set(abren.map(x => x.franja))];
  const mitad = !partido && mias.length > 0 && (cerradas || []).some(f => !mias.some(x => x.franja === f));
  const enPartido = (partido && !continuo) || mitad;
  return { partido, continuo, abre: enPartido && fr.length === 1 ? fr[0] : null, enPartido };
}
// lo mismo para las vistas, que parten de la persona y el día en vez de la planilla del mes
function turnoDelDia(cfg, est, iso, pid) {
  const mias = [];
  for (const t of turnosDe(cfg)) { const e = asignados(est, iso, t.id).find(x => x.pid === pid); if (e) mias.push({ e, localId: t.local.id, franja: t.franja }); }
  return repartoDelDia(mias, mitadesCerradas(cfg, pid, iso));
}
// ---------- apoyos: el registro de horas para pagarles ----------
// José, 18/09: «a partir del 1 de octubre… un registro, que los apoyos son los extras que
// hay que pagarle». Aroa manda las horas del fin de semana por correo («Dulce de 11:30 a 15
// y de 20:30 a 01», «Leo de 19 a cierre») y se apuntan casilla a casilla como ini/fin de la
// asignación: es lo que se ve en Hoy y lo que se paga. En el papel del bar no salen nunca.
// la hora a la que cierra el local ese día: lo que rellena el botón «hasta el cierre»
function cierreDe(l, dow) { const h = horarioDe(l, dow, 'T'); return h ? h.fin : null; }
// el tramo que hace de verdad una persona en una casilla: el puesto a mano manda; si no,
// el del partido; y si no, el del local. null si no está en la casilla.
function tramoDe(cfg, est, iso, tid, pid) {
  const e = asignados(est, iso, tid).find(x => x.pid === pid);
  if (!e) return null;
  if (e.ini && e.fin) return { ini: e.ini, fin: e.fin, aMano: true };
  const { localId, franja } = partirTurno(tid);
  const { enPartido, abre } = turnoDelDia(cfg, est, iso, pid);
  const h = horarioDe(localDe(cfg, localId), isoDow(iso), franja, enPartido, abre);
  return h ? { ini: h.ini, fin: h.fin, aMano: false } : null;
}
// el registro del mes: cada apoyo con sus días, y cada día con sus tramos (bar, franja,
// de qué hora a qué hora, minutos) y si se ajustaron a mano. Las horas se calculan igual
// que en horasPersonaMes, así que el registro y la tabla de la nómina dicen lo mismo;
// sinHoras cuenta los tramos sin ajustar, que cuentan el turno entero del local.
function registroApoyos(cfg, staff, meses, y, m) {
  const k = claveMes(y, m);
  const est = (meses && meses[k]) || { asig: {} };
  const n = diasDelMes(y, m);
  const out = [];
  for (const p of staff.filter(esApoyo)) {
    const r = { pid: p.id, nombre: p.nombre, dias: [], minutos: 0, horas: 0, sinHoras: 0 };
    for (let d = 1; d <= n; d++) {
      const iso = isoDe(y, m, d), dow = isoDow(iso);
      const mias = [];
      // la casilla cerrada ESE día no se paga; «Cuándo abre» no borra lo ya trabajado (revisión F2)
      for (const t of turnosDe(cfg)) { const e = asignados(est, iso, t.id).find(x => x.pid === p.id); if (e && !cerradaEseDia(cfg, est, iso, t.id)) mias.push({ e, localId: t.local.id, franja: t.franja, tid: t.id }); }
      if (!mias.length) continue;
      const { continuo, abre, enPartido } = repartoDelDia(mias, mitadesCerradas(cfg, p.id, iso));
      const dia = { iso, tramos: [], minutos: 0 };
      for (const { e, localId, franja, tid } of mias) {
        const seguido = continuo === localId && franja === 'M';
        const min = seguido ? 0 : minutosTurno(localDe(cfg, localId), dow, franja, e, enPartido, abre);
        const tr = tramoDe(cfg, est, iso, tid, p.id) || { ini: null, fin: null, aMano: false };
        dia.tramos.push({ localId, franja, ini: tr.ini, fin: tr.fin, aMano: tr.aMano, minutos: min });
        dia.minutos += min;
        if (!tr.aMano) r.sinHoras++;
      }
      r.dias.push(dia); r.minutos += dia.minutos;
    }
    r.horas = Math.round(r.minutos / 6) / 10;
    out.push(r);
  }
  return out.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}
// Días de un tipo de ausencia en un mes, con las fechas (José, 17/09: «que dándole a un
// botón vea los cinco días que se ha ido para ponérselo en su nómina»).
function diasAusenciaMes(p, y, m, tipo) {
  const out = [];
  const n = diasDelMes(y, m);
  for (let d = 1; d <= n; d++) {
    const iso = isoDe(y, m, d);
    if (ausenciaEn(p, iso, null, tipo)) out.push(iso);
  }
  return out;
}
// 24/09 (revisión F3, D10): las fechas de ese mes en que la ausencia es solo de media jornada, con su
// franja ({ '2026-09-28': ['T'] }), y los días que cuentan: media jornada = medio día. Al cerrar el
// Mónaco, Hojan coge vacaciones solo de la tarde y la nómina se las contaba como un día entero.
function mediasAusenciaMes(p, y, m, tipo) {
  const out = {};
  for (const iso of diasAusenciaMes(p, y, m, tipo)) {
    const fs = FRANJAS.filter(f => ausenciaEn(p, iso, f, tipo));
    if (fs.length && fs.length < FRANJAS.length) out[iso] = fs;
  }
  return out;
}
function jornadasAusencia(dias, medias) { return dias.length - Object.keys(medias || {}).length / 2; }
// Las vacaciones de toda la plantilla en un año, mes a mes, para pasarlas a nómina. `meses` son las
// fechas de cada mes y `dias` lo que cuentan (media jornada = 0,5); `medias`, las de media jornada.
function vacacionesAno(staff, y, tipo) {
  const t = tipo || 'VAC';
  return (staff || []).map(p => {
    const meses = [], dias = [], medias = {};
    let total = 0;
    for (let m = 1; m <= 12; m++) { const d = diasAusenciaMes(p, y, m, t), md = mediasAusenciaMes(p, y, m, t); meses.push(d); dias.push(jornadasAusencia(d, md)); Object.assign(medias, md); total += jornadasAusencia(d, md); }
    return { pid: p.id, nombre: p.nombre, meses, dias, medias, total, fechas: meses.flat() };
  }).filter(x => x.total > 0).sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre, 'es'));
}
function horasPersonaMes(cfg, staff, meses, pid, y, m) {
  const p = personaDe(staff, pid);
  const k = claveMes(y, m);
  const asig = (meses && meses[k] && meses[k].asig) || {};
  // 24/09 (S26): una plaza en una casilla cerrada ESE día (por fechas o a mano) no se trabaja, así que
  // no va a la nómina aunque siga guardada. «Cuándo abre» no cuenta: es el horario de ahora en
  // adelante y lo ya trabajado no se borra (revisión F2, cerradaEseDia)
  const estAp = { apertura: (meses && meses[k] && meses[k].apertura) || {} };
  const hayCierres = cierresDe(cfg).length > 0;
  const out = { pid, nombre: p ? p.nombre : pid, mananas: 0, tardes: 0, partidos: 0, continuos: 0, dias: 0, turnos: 0, minutos: 0, nocturnosMin: 0, festivas: 0, domingos: 0, festivasMin: 0, domingosMin: 0, extrasMin: 0, ausencias: 0, ausenciasMedias: 0, porLocal: {}, contratoHoras: null, saldo: null, refuerzos: 0, forzados: 0, sinTrabajoCierre: [] };
  const n = diasDelMes(y, m);
  for (let d = 1; d <= n; d++) {
    const iso = isoDe(y, m, d), dow = isoDow(iso);
    const festivo = (cfg.festivos || []).includes(iso);
    // primero se mira todo el día: si trabaja en las dos franjas es partido, y entonces
    // cuentan los tramos del partido (ocho horas repartidas entre las dos franjas)
    const mias = [];
    for (const [tid, lista] of Object.entries(asig[iso] || {})) {
      const e = lista.find(x => x.pid === pid); if (!e) continue;
      if (cerradaEseDia(cfg, estAp, iso, tid)) continue;
      mias.push(Object.assign({ e }, partirTurno(tid)));
    }
    // turno continuo: abre la mañana Y la tarde del mismo local. Es UN turno seguido, no
    // dos: se cuenta una sola vez (con la tarde, que es la que acaba al cierre).
    const cerradas = hayCierres ? mitadesCerradas(cfg, pid, iso) : [];
    const { partido, continuo, abre: abreF, enPartido } = repartoDelDia(mias, cerradas);
    if (continuo) out.continuos++;
    // 24/09 (D11 y revisión F2): sin trabajo por el cierre de su local, por medios días. «trabaja» =
    // ese día tiene otro turno (Hojan hace El 33 por la mañana: su tarde no es un día sin trabajo)
    if (hayCierres && p) {
      const sin = cerradas.filter(f => { if (ausenciaEn(p, iso, f)) return false; const dc = decisionCierre(cfg, pid, iso, f); return dc.tipo !== 'REFUERZA'; });
      if (sin.length) out.sinTrabajoCierre.push({ iso, franjas: sin, trabaja: mias.length > 0 });
    }
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
    // 24/09 (D10): una ausencia de media jornada es media jornada (descuenta medio día del contrato)
    const ausM = p ? ausenciaEn(p, iso, 'M') : null, ausT = p ? ausenciaEn(p, iso, 'T') : null;
    if (mias.length) { out.dias++; if (partido) out.partidos++; if (festivo) { out.festivas++; out.festivasMin += minDia; } if (dow === 7) { out.domingos++; out.domingosMin += minDia; } }
    else if (ausM && ausT) out.ausencias++;
    if (!!ausM !== !!ausT) out.ausenciasMedias++;
  }
  if (p) {
    // media jornada = medio día (revisión F3, D10); las fechas siguen todas, y las medias con su franja
    out.vacacionesDias = diasAusenciaMes(p, y, m, 'VAC');
    out.vacacionesMedias = mediasAusenciaMes(p, y, m, 'VAC');
    out.vacaciones = jornadasAusencia(out.vacacionesDias, out.vacacionesMedias);
    out.libresDias = diasAusenciaMes(p, y, m, 'LD');
    out.libresMedias = mediasAusenciaMes(p, y, m, 'LD');
    out.libres = jornadasAusencia(out.libresDias, out.libresMedias);
    out.bajaDias = diasAusenciaMes(p, y, m, 'BAJ').length;
  } else { out.vacacionesDias = []; out.vacacionesMedias = {}; out.vacaciones = 0; out.libresDias = []; out.libresMedias = {}; out.libres = 0; out.bajaDias = 0; }
  // 24/09 (D11): los días sin trabajo por el cierre de su local, enteros (sin ningún otro turno ese
  // día). Solo informativo: no toca el pago ni el contrato (si se pagan o no, lo decide el grupo)
  out.diasSinTrabajoCierre = out.sinTrabajoCierre.filter(x => !x.trabaja).map(x => x.iso);
  for (const x of cfg.extras || []) if (x.pid === pid && x.iso && x.iso.startsWith(k)) out.extrasMin += +x.min || 0;
  out.horas = Math.round((out.minutos + out.extrasMin) / 6) / 10;
  out.horasNocturnas = Math.round(out.nocturnosMin / 6) / 10;
  if (p && p.contrato && +p.contrato.horasSemana > 0) {
    out.contratoHoras = Math.round((+p.contrato.horasSemana / 7) * (n - out.ausencias - out.ausenciasMedias / 2) * 10) / 10;
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
    const apoyo = new Set();   // medios días en que apoya por el cierre de su local (24/09, D11)
    indices.forEach((x, i) => {
      // el día libre de ESA semana (libraEn): el cambio puntual bloquea el martes y deja el miércoles (24/09)
      const bloqueada = ausenciaEn(p, x.iso, x.franja) || libraEn(p, x.iso) || ((p.franjas || []).length && !p.franjas.includes(x.franja));   // la ausencia, por medio día (D10)
      if (bloqueada) { w.unavailable[i] = '*'; return; }
      // sin trabajo por el cierre de su local: ese medio día no está (el núcleo no redistribuye a nadie solo)
      const dc = decisionCierre(cfg, p.id, x.iso, x.franja);
      if (dc && dc.tipo !== 'REFUERZA') { w.unavailable[i] = '*'; return; }
      if (dc) apoyo.add(i);
      const vet = (p.vetos || []).filter(v => v.franja === x.franja && (dowsVeto(v) === null || dowsVeto(v).includes(x.dow))).map(v => v.localId);
      if (vet.length) w.unavailable[i] = vet;
    });
    // quien apoya puede ir a cualquier local esos medios días; el resto del horizonte sigue atado a
    // sus locales (allowed_shifts es de todo el horizonte, así que se ata medio día a medio día)
    if (apoyo.size && (p.locales || []).length) {
      const fuera = todosLocales.filter(id => !p.locales.includes(id));
      w.allowed_shifts = todosLocales.slice();
      indices.forEach((x, i) => { if (apoyo.has(i) || w.unavailable[i] === '*') return; w.unavailable[i] = [...new Set([...(w.unavailable[i] || []), ...fuera])]; });
    }
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
      by_day[i][l.id] = { min: minimoDe(cfg, x.iso, tid, est).min };
    }
  });
  const rules = [{ type: 'coverage', mode: 'hard', tier: 3, id: 'mínimos por local, día y franja', params: { demand: {}, by_day } }];
  // cocina: obligatoria = dura; con titulares definidos = blanda. Por medio día ABIERTO (turnoAbierto),
  // no por día de la semana (24/09, D11 y S27): un medio día cerrado por fechas o a mano tiene cobertura
  // 0/0 y una regla dura de cocina ahí lo hacía imposible.
  for (const l of cfg.locales) for (const f of FRANJAS) {
    if (!localTieneCocina(l, f)) continue;
    const dura = !!(l.cocina.obligatoria && l.cocina.obligatoria[f]);
    indices.forEach(x => {
      if (x.franja !== f || !turnoAbierto(cfg, est, x.iso, turnoId(l.id, f))) return;
      rules.push({ type: 'skill_coverage', mode: dura ? 'hard' : 'soft', weight: 5, tier: dura ? 3 : 1, id: `cocina ${l.nombre} ${FRANJA_LBL[f].toLowerCase()} del ${DOW_LBL[x.dow]} ${+x.iso.slice(8, 10)}`, params: { requirements: [{ shift: l.id, skill: skillDe(l.id, x.dow), min: 1 }] }, scope: { day_tags: [x.iso + '_' + f] } });
    });
  }
  // «nunca con»: mismo local y misma franja
  const pares = new Set();
  for (const p of activos) for (const q of p.nuncaCon || []) if (activos.some(x => x.id === q)) pares.add([p.id, q].sort().join('|'));
  if (pares.size) rules.push({ type: 'same_shift_forbidden', mode: 'hard', tier: 3, id: 'nunca con', params: { pairs: [...pares].map(s => s.split('|')), shifts: todosLocales.slice() } });
  // quien no hace partido nunca y tiene las dos franjas: como mucho un medio día por ventana de dos
  const sinPartido = activos.filter(p => (p.franjas || []).length !== 1 && !indices.some(x => partidoEn(cfg, p, x.iso))).map(p => p.id);
  if (sinPartido.length) rules.push({ type: 'max_hours_in_window', mode: 'hard', tier: 2, id: 'sin partido', params: { days: 2, max_hours: 7 }, scope: { workers: sinPartido } });
  rules.push({ type: 'balance', mode: 'soft', weight: 2, tier: 1, id: 'reparto equilibrado', params: { dimension: 'work' } });
  rules.push({ type: 'preferences', mode: 'soft', weight: 1, tier: 1, id: 'criterios personales', params: {} });
  // plazas fijas de la semana tipo (no supuestas) como asignaciones fijas, con los cambios de
  // día libre de cada semana (plazasDelDia, la misma lectura que la semana tipo del generador)
  if (o.conPatron !== false) {
    indices.forEach((x, i) => {
      for (const pl of plazasDelDia(cfg, staff, x.iso).plazas) {
        if (pl.s) continue;
        const { localId, franja } = partirTurno(pl.t);
        if (franja !== x.franja) continue;
        const w = workers.find(z => z.id === pl.p);
        if (!w || w.unavailable[i]) continue;
        // una casilla cerrada ese medio día (por fechas, a mano o por «Cuándo abre») tiene cobertura
        // 0/0: fijar ahí a alguien (quien apoya por el cierre no está «no disponible») hacía el
        // problema imposible (24/09, revisión F2)
        if (!turnoAbierto(cfg, est, x.iso, pl.t)) continue;
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
  // la plaza fija de la semana tipo que el núcleo ha respetado se vuelca con su «por» y su nota
  // (24/09, revisión): sin ellos, un cambio de día libre no sabía que Lavinia cubría a Mari Luz
  const fijas = {};
  const fijaDe = (iso, tid, pid) => (fijas[iso] || (fijas[iso] = plazasDelDia(cfg, staff, iso).plazas)).find(pl => pl.t === tid && pl.p === pid) || null;
  for (const [pid, porIdx] of Object.entries(sol.schedule || {})) {
    for (const [i, code] of Object.entries(porIdx)) {
      if (!code || code === (problema.rest_code || 'OFF')) continue;
      const x = indices[+i]; if (!x) continue;
      const tid = turnoId(code, x.franja);
      if (pidsEn(est, x.iso, tid).includes(pid)) continue;
      const pl = fijaDe(x.iso, tid, pid);
      const a = asignar(est, cfg, staff, x.iso, tid, pid, { origen: 'nucleo', razon: o.razon || 'propuesto por el núcleo Shiftia (CP-SAT)', permitirPartido: true, por: pl ? pl.por : undefined, nota: pl ? pl.n : undefined });
      if (a.ok) r.aplicados.push({ iso: x.iso, turnoId: tid, pid, origen: 'nucleo', razon: a.entry.razon, avisos: a.avisos });
      else r.rechazados.push({ iso: x.iso, turnoId: tid, pid, motivo: a.motivo });
    }
  }
  return r;
}

// ---------- sincronización (servidor) ----------
// cierresPuntuales (24/09, D11): un cierre de otro dispositivo no se funde, manda el servidor
const CLAVES_PLANILLA = ['meses', 'staff', 'locales', 'patron', 'eventos', 'equipos', 'extras', 'festivos', 'cierres', 'cierresPuntuales'];
// Una clave que falta vale lo mismo que vacía ([] o {}): el primer 409 tras desplegar una clave nueva
// (cierresPuntuales) no es un conflicto (24/09, revisión F2)
const vacioHuella = v => v === undefined || v === null || (Array.isArray(v) ? !v.length : typeof v === 'object' && !Object.keys(v).length);
const huellaPlanillaDe = e => JSON.stringify(CLAVES_PLANILLA.map(k => vacioHuella(e[k]) ? null : e[k]));
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
    P('adrian', 'Adrián', 'cocina', ['ZAPA'], ['M', 'T'], [3], { partido: { siempre: true, dias: [1, 2, 4, 5, 6, 7] }, cocina: { titular: ['ZAPA'], reserva: [], soloDias: [] }, cubreA: [{ pid: 'susi' }], nota: 'cocina de Zapatillera, siempre partido; cubre la baja de Susi' }),
    P('victoria', 'Victoria', 'sala', ['EL33'], ['M', 'T'], [3], { partido: { dias: [5, 6] }, nota: 'de mañana; viernes y sábado partido; Noe la cubre el miércoles' }),
    P('hojan', 'Hojan', 'cocina', ['EL33', 'MONACO'], ['M', 'T'], [2, 7], { soloCocina: true, partido: { dias: [1] }, cocina: { titular: ['EL33', 'MONACO'], reserva: ['ZAPA'], soloDias: [] }, cubreA: [{ pid: 'maydeth' }], nota: 'cubre la baja de Maydeth; el lunes partido: cocina de El 33 y del Mónaco' }),
    P('dulce', 'Dulce', 'apoyo', ['PASARELA', 'MONACO'], ['M', 'T'], [], { standby: true, noPrimero: ['M', 'T'], supuestos: ['en standby hasta confirmar días libres y locales', 'no sale la primera mientras sea nueva', 'quizá el partido del lunes en Pasarela, que taparía los dos huecos; a ver cómo entra (Aroa, 17/09)'], nota: 'apoyo; alta del 17/09, de prueba el fin de semana. En standby: no entra en la planilla hasta que el grupo confirme sus días y sus locales' }),
    P('laura', 'Laura', 'sala', ['PASARELA'], ['M', 'T'], [], { ausencias: [{ tipo: 'BAJ', desde: '2026-09-01', detalle: 'la cubre Lola' }] }),
    P('maydeth', 'Maydeth', 'cocina', ['MONACO'], ['M', 'T'], [], { cocina: { titular: ['MONACO'], reserva: [], soloDias: [] }, ausencias: [{ tipo: 'BAJ', desde: '2026-09-01', detalle: 'la cubre Hojan' }] }),
    // 17/09 (Aroa): «añade Susi en el apartado bajas, que es cocinera […] y la está cubriendo Adrián»
    P('susi', 'Susi', 'cocina', ['ZAPA'], ['M', 'T'], [], { cocina: { titular: ['ZAPA'], reserva: [], soloDias: [] },
      ausencias: [{ tipo: 'BAJ', desde: '2026-09-01', detalle: 'la cubre Adrián' }],
      supuestos: ['Zapatillera, porque la cubre Adrián: falta confirmarlo', 'la baja se apunta desde el 1/09 porque en la planilla del cliente ya no salía: falta la fecha real'],
      nota: 'cocina; de baja, la cubre Adrián' }),
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
  return { locales, staff, patron, equipos, eventos: [], extras: [], festivos: [], cierres: {}, cierresPuntuales: [], reglas: {} };
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
// Altas que llegaron después del primer arranque: la semilla solo se usa cuando el servidor
// está vacío, así que sin esto el cliente —que ya tenía su planilla dentro— no las vería
// nunca. Se aplican UNA vez (marca en estado.migraciones) para no resucitar a quien el
// encargado haya borrado a propósito.
const ALTAS_1709 = ['dulce', 'susi'];
function migrarAltas(estado) {
  const r = { altas: [] };
  if (!estado || !Array.isArray(estado.staff)) return r;
  estado.migraciones = estado.migraciones || {};
  if (estado.migraciones.altas1709) return r;
  const semilla = semillaPasarela().staff;
  for (const id of ALTAS_1709) {
    if (estado.staff.some(p => p.id === id)) continue;
    const p = semilla.find(x => x.id === id);
    if (p) { estado.staff.push(JSON.parse(JSON.stringify(p))); r.altas.push(id); }
  }
  estado.migraciones.altas1709 = 1;
  return r;
}
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
    turnoAbierto, toggleApertura, abrirCasilla, motivoCerrado, turnosAbiertosSemana, turnosAbiertosMes, turnosConSupuesto, eventosDe, minimoDe,
    nuevoEstado, estadoDesde, clonarEstado, asignados, pidsEn, casillasDe, manualDe, marcarManual, quitarMarcaManual, primerDiaPlanificable,
    ausenciaEn, quitarDiaDeAusencia, anadirAusencia, deBaja,
    localTieneCocina, puedeCocina, rangoCocina, abrePorDefecto,
    puedeEstar, ordenarCasilla, normalizarCasilla, asignar, desasignar, moverEnCasilla, marcarCocina, marcarAbre,
    revisarTurno, revisionMes,
    plazasDe, instanciarPatron, patronDesdeSemana,
    turnosMes, esComodin, candidatosPara, candidatosConAviso, porQueNadie, generarPlanilla,
    minutosTurno, minutosNocturnos, minutosEntre, horarioDe, tramoPartidoDe, turnoDelDia,
    migrarPuestos, migrarAltas, esApoyo, libraEn, libraPuntualVigente, limpiarLibrePuntual, lunesDe, enCocinaEse,
    activa, librasPuntuales, libraPuntualDe, ponerLibraPuntual, textoCambioLibre, cambioDeLibre, partidoEn, estadoDia,
    plazasDelDia, esAutomatica, retirarQueIncumplen, moverDiaLibre, porDe, retirarEntrada, motivoLibra,
    LISTAS_CAND, VALORACIONES, PUESTOS_CAND, BUSCA, MOTIVOS_ALERTA, HABILIDADES, HAB_ESTADO, CAMPOS_ENTREVISTA, tieneEntrevista, VAL_LBL, etiquetaCandidato, filtrarCandidatos, fechaCandidato, ORDENES_CAND, ordenarCandidatos, resumenCandidatos,
    puestosDe, textoPuestos, migrarCandidatos, fundirSemillaEntrevistas, textoCampo,
    diasAusenciaMes, mediasAusenciaMes, jornadasAusencia, vacacionesAno, horasPersonaMes, horasEquipoMes, horasLocalMes, cierreDe, tramoDe, registroApoyos,
    toProblem, desdeSolucion,
    fusionarEstado, sembrarDemo, migrarHorarios, navVigente,
    CARACTERISTICAS, REGLAS, REGLA_NOMBRE, nombreRegla, regla, caracteristicaActiva, avisosVigentes, puedePrimero, partidoAbre, primeroDe, posicionesDe, motivoSinPrimero, porQueNadiePrimero, esContinuo,
    resumenMinimos, descripcionCocina, condicionesDe, verificarSemana, generarSemana, mesVisibleParaPersonal, mesesVisibles, destinatariosAviso, avisoEsPara,
    MOTIVOS_CIERRE, DECISIONES_CIERRE, cierresDe, diasDeCierre, cierreEn, textoCierre, etiquetaCierre, hastaCierre, motivoCierreTxt, motivoSinTrabajo, fechaCortaCierre, validarCierre,
    decisionCierre, apoyoPorCierre, puntosCierre, afectadosPorCierre, sugerenciasRefuerzo, aplicarCierre, quitarCierre, instanciarCierres, CLAVES_PLANILLA,
    cerradaEseDia, aperturaDelDia, diaConPlanilla, apoyosSinSitio, mitadesCerradas, cierresDelHorario, reabrirCierreDesde, dentroDeCierre, repartoDelDia,
    TIPOS_INCIDENCIA, turnosAfectados, turnosSemanaDe, candidatosCobertura, planesCobertura, aplicarCobertura, vaciarPlanilla,
    cubreEnCasilla, rangoNecesario, revisarEntrada, relevoEn, marcarRelevo, desmarcarRelevos, volcarPrevia, porDeSuCasilla, MOTIVO_SOLO_APOYOS, etiquetaAusencia, quedariaSoloApoyos, puntosPuesto, cocinaDelDia, franjasAusencia, textoFranjasAusencia,
    sugerirUsuario, PALETA_PERSONAS, asignarColores, semillaPasarela,
  };
}
