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
// ¿Ocupa a quien está puesto en esa casilla ese día? Sí, salvo que la casilla esté cerrada ESE día (por
// fechas o a mano). 24/09 (revisión F4 del modelo): una sola respuesta para la puerta (ya está en otro
// local esa franja, ya lleva la cocina ese día) y para Horas y el registro de apoyos: «si la puerta la
// suelta, Horas no la cuenta». Con «Cuándo abre» (el horario de todas las semanas) la plaza sigue
// ocupando: Horas la cuenta (revisión F2), la Revisión la marca «plaza-en-cerrado» y el Generador retira
// la automática; antes la puerta la soltaba y la persona quedaba puesta dos veces en la misma franja.
function plazaOcupa(cfg, est, iso, tid) { return !cerradaEseDia(cfg, est, iso, tid); }
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
  return { puntos: PESOS.apoyoCierre, razon: `apoyo: ${l ? l.nombre : dc.cierre.localId} cerrado` };
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
      : (() => {
        const pls = plazasDelDia(cfg, staff, iso).plazas.filter(pl => { const p = personaDe(staff, pl.p); return p && !ausenciaEn(p, iso, partirTurno(pl.t).franja) && !p.standby; });
        const abre = primerosDeLaSemanaTipo(cfg, staff, iso, pls);   // (fase 5, S18) quién abre, no la marca «a»
        return pls.map(pl => Object.assign({ pid: pl.p, tid: pl.t, cocina: !!pl.c, abre: abre[pl.t] === pl.p }, partirTurno(pl.t)));
      })();
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
// 24/09 (fase 5, S36; Diego: «que lea todas las variables»). La cocina se configuraba en dos sitios que no se
// hablaban: la ficha (titular o reserva en tal local, «solo estos días», «nunca») y Ajustes del local (los
// titulares de cada franja por orden y las reservas). Añadir a Victoria de titular de El 33 en Ajustes hacía
// que el Generador la anunciara y que nadie le diera nunca la cocina; quitar a Noe no se la quitaba. Ahora:
//  · quién PUEDE llevar la cocina de un local lo dice puedeCocina, una sola lectura: su ficha, la lista del
//    local o ser de cocina, con los límites de su ficha si el interruptor «Cocina» está encendido (S15);
//  · en qué ORDEN, la lista del local (rangoCocina);
//  · las dos se escriben juntas (ponerCocinaLocal desde Ajustes, ponerCocinaFicha desde la ficha): lo que se
//    pone o se quita en un sitio se pone o se quita en el otro. migrarCocinaLocales pone de acuerdo las de antes.
function asegurarCocinaLocal(l) {
  l.cocina = l.cocina || {};
  const c = l.cocina;
  c.titulares = c.titulares || {}; for (const f of FRANJAS) c.titulares[f] = c.titulares[f] || [];
  c.reservas = c.reservas || []; c.obligatoria = c.obligatoria || {}; c.posicion = c.posicion || {}; c.posicionSiDesde = c.posicionSiDesde || {};
  return c;
}
// ¿está en la cocina de ese local según Ajustes (titulares de alguna franja o reservas)?
function enListaCocina(l, pid) {
  const c = (l && l.cocina) || {};
  return FRANJAS.some(f => ((c.titulares && c.titulares[f]) || []).includes(pid)) || (c.reservas || []).includes(pid);
}
// Lo que dice su ficha de la cocina de ese local: 'titular', 'reserva' o null. La única lectura de
// p.cocina.titular y p.cocina.reserva (con cocinasTitular, para contar cocineros en Equipo).
function cocinaDe(cfg, persona, localId) {
  const c = (persona && persona.cocina) || {};
  if ((c.titular || []).includes(localId)) return 'titular';
  if ((c.reserva || []).includes(localId)) return 'reserva';
  return null;
}
// ¿puede llevar la cocina de ese local ese día? Titular o reserva (en su ficha o en Ajustes del local) o de
// cocina, y sin sus límites: «nunca cocina» y «solo estos días». 24/09 (fase 5, S15): los límites de la ficha
// solo con el interruptor «Cocina» encendido (el del grupo y el de su ficha, activa): apagarlo en la ficha
// quita «solo estos días», «nunca» y «solo hace cocina», no que sea titular o reserva de un local (eso es un
// dato, como el «por» de una plaza, D12); antes no quitaba nada y la Revisión seguía diciendo que no era
// cocina de ese local.
function puedeCocina(cfg, persona, localId, iso) {
  if (!persona) return false;
  const c = persona.cocina || {};
  const limites = activa(cfg, persona, 'cocina');
  if (limites && c.nunca) return false;
  const l = cfg && Array.isArray(cfg.locales) ? localDe(cfg, localId) : null;
  if (!cocinaDe(cfg, persona, localId) && !enListaCocina(l, persona.id) && persona.puesto !== 'cocina') return false;
  if (limites && Array.isArray(c.soloDias) && c.soloDias.length && iso && !c.soloDias.includes(isoDow(iso))) return false;
  return true;
}
// ¿Su ficha le impide llevar ninguna cocina («nunca cocina», con el interruptor encendido)? Lo pregunta Ajustes
// del local antes de hacerla titular (S36)
function nuncaCocina(cfg, persona) { return !!(persona && persona.cocina && persona.cocina.nunca) && activa(cfg, persona, 'cocina'); }
// ¿Tiene cocina ese local en esa franja? Obligatoria, o con algún titular. 24/09 (fase 5, S36): con la
// plantilla, solo cuenta el titular que puede llevarla: poner de titular de Pasarela a quien tiene «nunca
// cocina» creaba una cocina que nadie podía llevar (siete «sin cocina» a la semana). Sin plantilla, los datos.
function localTieneCocina(l, franja, cfg, staff) {
  if (!l || !l.cocina) return false;
  if (l.cocina.obligatoria && l.cocina.obligatoria[franja]) return true;
  const tit = (l.cocina.titulares && l.cocina.titulares[franja]) || [];
  if (!staff) return tit.length > 0;
  return tit.some(pid => puedeCocina(cfg, personaDe(staff, pid), l.id, null));
}
// ¿Se espera cocina en esa casilla? 24/09 (fase 5, S16; decisiones.md D5): con la regla del grupo «Cocina»
// apagada, no: nadie la busca, la exige ni la marca sola (el Generador, la Cobertura, el selector, la
// Revisión, la semana tipo y el núcleo). La interfaz prometía «lo apagado no lo mira nadie» y todos seguían
// pidiendo cocina. Lo marcado a mano se queda.
function cocinaExigida(cfg, staff, l, franja) { return regla(cfg, 'cocina') && localTieneCocina(l, franja, cfg, staff); }
// ¿Se busca la cocina en esa casilla? (revisión de la fase 5, D5) La misma pregunta, por el turno, para quien
// pide candidatos de cocina (el relleno, la Cobertura, «cubre a» en la semana tipo): con la regla «Cocina»
// apagada, buscar «la cocina» es buscar sala. Antes la rama «cubre a» de la semana tipo y la Cobertura seguían
// dando la cocina a Yilian, que no es de cocina, marcada a mano, y le sumaban 41 puntos de «cocina titular».
function seBuscaCocina(cfg, staff, tid) { const { localId, franja } = partirTurno(tid); return cocinaExigida(cfg, staff, localDe(cfg, localId), franja); }
function cocinaObligatoriaEn(cfg, l, franja) { return regla(cfg, 'cocina') && !!(l && l.cocina && l.cocina.obligatoria && l.cocina.obligatoria[franja]); }
// Los locales cuya cocina lleva de titular según su ficha. 24/09 (revisión F4): la cuenta «cocina» de
// Equipo lo leía a pelo ((p.cocina || {}).titular), fuera de la capa de lectura.
function cocinasTitular(persona) { return (persona && persona.cocina && persona.cocina.titular) || []; }
// prioridad de cocina en un local y franja: titulares por su orden, luego reservas; quien puede llevarla sin
// estar en la lista del local (por su ficha o por ser de cocina), detrás de todos
function rangoCocina(cfg, l, persona, franja, iso) {
  if (!puedeCocina(cfg, persona, l.id, iso)) return -1;
  const tit = (l.cocina && l.cocina.titulares && l.cocina.titulares[franja]) || [];
  const res = (l.cocina && l.cocina.reservas) || [];
  let i = tit.indexOf(persona.id); if (i >= 0) return i;
  i = res.indexOf(persona.id); if (i >= 0) return 100 + i;
  return 500;
}
// La razón que se enseña al buscar la cocina (S36: quien no está en la lista del local ya no sale como «de reserva»)
function razonCocina(cfg, l, persona, rc) {
  if (rc < 100) return `cocina titular de ${l.nombre}`;
  if (rc < 500) return 'cocina de reserva';
  return cocinaDe(cfg, persona, l.id) ? `cocina de ${l.nombre} según su ficha` : 'es de cocina';
}
// Escribe en la ficha lo que es en la cocina de ese local ('titular', 'reserva' o null), sin tocar el local
function fijarCocinaFicha(p, localId, papel) {
  p.cocina = p.cocina || {}; const c = p.cocina;
  c.titular = (c.titular || []).filter(x => x !== localId); c.reserva = (c.reserva || []).filter(x => x !== localId); c.soloDias = c.soloDias || [];
  if (papel === 'titular') c.titular.push(localId); else if (papel === 'reserva') c.reserva.push(localId);
}
// ¿En qué franjas de las dadas pasaría ese local a tener cocina (sin tenerla ahora) si se le pone un titular?
// (revisión de la fase 5, S36) Marcar en la ficha de Mari Luz «titular de cocina en Pasarela», que no tiene
// cocina, creaba sin avisar una cocina en Pasarela mañana y tarde, y la Revisión daba «sin cocina» los días en
// que ella no está. La ficha y Ajustes del local lo preguntan antes con esto.
function cocinaQueCrea(cfg, staff, localId, franjas) {
  const l = localDe(cfg, localId);
  if (!l) return [];
  return (franjas && franjas.length ? franjas : FRANJAS).filter(f => !localTieneCocina(l, f, cfg, staff));
}
// Desde la ficha: titular, reserva o nada en la cocina de un local, y la lista del local de acuerdo. Quitar
// la quita de la lista del local; titular la pone al final de los titulares de sus franjas (si no estaba) y
// deja de ser reserva; reserva la pone al final de las reservas y deja de ser titular.
function ponerCocinaFicha(cfg, p, localId, papel) {
  const l = localDe(cfg, localId);
  if (!p || !l) return false;
  const antes = cocinaDe(cfg, p, localId);
  fijarCocinaFicha(p, localId, papel || null);
  const c = asegurarCocinaLocal(l);
  const fuera = arr => { const i = arr.indexOf(p.id); if (i >= 0) arr.splice(i, 1); };
  if (!papel) { for (const f of FRANJAS) fuera(c.titulares[f]); fuera(c.reservas); return true; }
  if (papel === 'titular') {
    if (antes === 'reserva') fuera(c.reservas);
    if (!FRANJAS.some(f => c.titulares[f].includes(p.id))) for (const f of ((p.franjas || []).length ? p.franjas : FRANJAS)) c.titulares[f].push(p.id);
  } else {
    if (antes === 'titular') for (const f of FRANJAS) fuera(c.titulares[f]);
    if (!c.reservas.includes(p.id)) c.reservas.push(p.id);
  }
  return true;
}
// Desde Ajustes del local: pone o quita a alguien de los titulares de una franja (por orden, pos) o de las
// reservas, y su ficha de acuerdo: añadirlo a los titulares lo hace titular de ese local en su ficha; a las
// reservas, reserva (si no era ya titular); quitarlo de todas las listas del local se lo quita de la ficha.
// o: { lista: 'titulares' | 'reservas', franja, pid, pos, quitar }
function ponerCocinaLocal(cfg, staff, localId, o) {
  const l = localDe(cfg, localId);
  if (!l || !o || !o.pid) return false;
  const c = asegurarCocinaLocal(l);
  const arr = o.lista === 'reservas' ? c.reservas : c.titulares[o.franja];
  if (!arr) return false;
  const i = arr.indexOf(o.pid);
  if (o.quitar) { if (i >= 0) arr.splice(i, 1); }
  else if (i < 0) arr.splice(o.pos === undefined || o.pos === null ? arr.length : Math.max(0, Math.min(o.pos, arr.length)), 0, o.pid);
  const p = personaDe(staff || cfg.staff || [], o.pid);
  if (!p) return true;
  const ficha = cocinaDe(cfg, p, localId);
  const tit = FRANJAS.some(f => c.titulares[f].includes(p.id)), res = c.reservas.includes(p.id);
  let nuevo;
  if (!o.quitar) nuevo = o.lista === 'reservas' ? (ficha === 'titular' ? 'titular' : 'reserva') : 'titular';
  else nuevo = tit ? (ficha === 'reserva' && res ? 'reserva' : 'titular') : res ? 'reserva' : null;
  if (nuevo !== ficha) fijarCocinaFicha(p, localId, nuevo);
  return true;
}
// Migración (una vez, 24/09): la ficha y Ajustes del local de acuerdo en las planillas de antes. Quien está en
// la cocina de un local en Ajustes y su ficha no lo dice pasa a titular (o reserva) en su ficha; quien lo dice
// su ficha y no está en Ajustes, al final de la lista de ese local. Nadie deja de poder llevar una cocina.
function migrarCocinaLocales(estado) {
  const r = { fichas: 0, listas: 0 };
  if (!estado || !Array.isArray(estado.staff) || !Array.isArray(estado.locales)) return r;
  estado.migraciones = estado.migraciones || {};
  if (estado.migraciones.cocinaLocales2409) return r;
  for (const l of estado.locales) {
    const c = asegurarCocinaLocal(l);
    for (const pid of new Set([...c.titulares.M, ...c.titulares.T, ...c.reservas])) {
      const p = personaDe(estado.staff, pid);
      if (!p || cocinaDe(estado, p, l.id)) continue;
      fijarCocinaFicha(p, l.id, FRANJAS.some(f => c.titulares[f].includes(pid)) ? 'titular' : 'reserva'); r.fichas++;
    }
    // (revisión de la fase 5) solo en las franjas en que el local ya tiene cocina: la migración no crea cocinas
    // (antes de la fase 5, «titular de cocina en Pasarela» en una ficha no hacía nada)
    const conCocina = FRANJAS.filter(f => localTieneCocina(l, f));
    for (const p of estado.staff) {
      const papel = cocinaDe(estado, p, l.id);
      if (!papel || enListaCocina(l, p.id) || !conCocina.length) continue;
      if (papel === 'titular') for (const f of ((p.franjas || []).length ? p.franjas : FRANJAS)) { if (conCocina.includes(f)) c.titulares[f].push(p.id); }
      else c.reservas.push(p.id);
      r.listas++;
    }
  }
  estado.migraciones.cocinaLocales2409 = 1;
  return r;
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
  { k: 'minimos', lbl: 'Mínimos por local, franja y día' },
  // 24/09 (fase 5, D5): lo que pasa al apagarla, para que la interfaz lo diga (Equipo → Condiciones)
  { k: 'cocina', lbl: 'Cocina: quién la lleva y en qué posición', apagada: 'Apagada: nadie busca, exige ni marca la cocina (ni el Generador, ni la semana tipo, ni la Cobertura, ni la Revisión), y no se miran «solo estos días», «nunca cocina» ni «solo hace cocina». La cocina marcada a mano se queda.' },
  { k: 'nuncaCon', lbl: '«Nunca con»: no coinciden en la misma casilla' }, { k: 'libra', lbl: 'Días que libra cada persona' },
  { k: 'vetos', lbl: 'Vetos por local y franja' }, { k: 'partido', lbl: 'Partidos solo los días declarados' },
  { k: 'noPrimero', lbl: 'Quien no sale nunca el primero (Leo; Cristian por la tarde)', nueva: true },
  { k: 'primeroCompleto', lbl: 'El primero de cada franja hace turno completo: quien viene de la mañana no abre la tarde (salvo turno continuo, o partido donde el local lo permita)', nueva: true },
  { k: 'cubreA', lbl: '«Cubre a»: quién ocupa el sitio de quien falta' },
  { k: 'abre', lbl: 'Quién sale el primero (fijo por local)', apagada: 'Apagada: ni «Quién abre» de los locales, ni «Sale el primero» de las fichas, ni la marca «a» de la semana tipo deciden quién abre: sale el primero de la casilla que pueda. Lo marcado a mano se queda.' },
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
  // 24/09 (fase 4): lo que la puerta evalúa además (el selector y la hoja impresa las nombran)
  soloApoyos: 'Dos apoyos no se quedan solos', noPrimero: 'Nunca de primero', noAbre: 'No abre', primeroCompleto: 'El primero hace turno completo',
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
// 24/09 (fase 4; reunión: «que lea todas las variables»): tres lecturas más de la ficha que antes estaban
// copiadas en la puerta, en el relleno, en la Cobertura, en la hoja impresa y en las condiciones del
// Generador. Cada una en un solo sitio; los demás la llaman.
// «Nunca con»: la pareja vale si la tiene cualquiera de las dos fichas, con sus interruptores (la regla del
// grupo y la característica de cada ficha). null si pueden coincidir; si no, { flexible } (José, 17/09: la
// pareja flexible «se respeta si hay gente suficiente; si no, se relaja y queda el aviso»).
// (La Revisión aún marca la pareja sin mirar el interruptor: S13, fase 6.)
function incompatibles(cfg, a, b) {
  if (!a || !b || a.id === b.id || !regla(cfg, 'nuncaCon')) return null;
  const mio = caracteristicaActiva(a, 'nuncaCon') && (a.nuncaCon || []).includes(b.id);
  const suyo = caracteristicaActiva(b, 'nuncaCon') && (b.nuncaCon || []).includes(a.id);
  return mio || suyo ? { flexible: !!(a.nuncaConFlexible || b.nuncaConFlexible) } : null;
}
// «Prefiere no trabajar ese día» (prefs.evitaDows): solo ordena. Pendiente de la fase 6 (S14): que el
// interruptor «Preferencias» de la ficha lo apague (hoy la ficha lo ofrece y nadie lo mira).
function evita(cfg, p, dow) { return !!(p && p.prefs && (p.prefs.evitaDows || []).includes(dow)); }
// «Sale el primero» fijo en ese local y franja: el del local («Quién abre» en Ajustes) o el de su ficha.
// 24/09 (fase 5, S19): con sus interruptores (activa: la regla del grupo «Sale el primero» y la característica
// de su ficha), en todos los sitios que lo miran: la puntuación, quién abre (primeroDe), la marca ▸ de la
// planilla (posicionesDe) y la hoja impresa. Antes, con la regla apagada seguía sumando «sale el primero», y
// con la ficha de Lola apagada Lola seguía abriendo con ▸ porque el local la tenía en «Quién abre».
function abreFijo(cfg, l, p, franja) {
  if (!l || !p || !activa(cfg, p, 'abre')) return false;
  return !!(l.primero && l.primero[franja] === p.id) || !!(p.abre && p.abre[l.id] && p.abre[l.id].includes(franja));
}
// Quién tiene fijo abrir ese local y franja: el de «Quién abre» del local y, si no, el primero de la
// plantilla con «sale el primero» en su ficha (abreFijo). null si nadie. Lo pregunta la hoja impresa.
function quienAbreFijo(cfg, staff, l, franja) {
  if (!l) return null;
  const dl = l.primero && l.primero[franja];
  if (dl && abreFijo(cfg, l, personaDe(staff || [], dl), franja)) return dl;
  const p = (staff || []).find(q => abreFijo(cfg, l, q, franja));
  return p ? p.id : null;
}
// Cómo abre quien sale el primero, según puedePrimero (24/09, fase 5, S32): el plan A decía de Mari Luz
// «puede abrir (turno completo)» cuando abre la tarde precisamente porque viene de partido y Pasarela lo permite.
function razonPrimero(pr) {
  if (pr && pr.partido) return 'abre la tarde en partido (el local lo permite)';
  if (pr && pr.continuo) return 'turno continuo';
  return 'puede abrir (turno completo)';
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
    // el puesto cuenta si en esa casilla se busca cocina (con «Cocina» apagada, cubre a X sin más; D5)
    if (!!o.cocina !== cocinaX && seBuscaCocina(cfg, staff, tid)) continue;
    return x.id;
  }
  return null;
}
// Una entrada «por X» ya puesta cuya casilla SABEMOS que era la de X aunque X ya no esté en ella ni
// salga en la semana tipo: la que puso la Cobertura (X estaba en esa casilla al proponer) y el relevo
// (D3). Lo que puso el relleno con la regla de reserva no: su «por» es informativo (revisión F3).
function porDeSuCasilla(e) { return !!(e && (e.relevo || e.origen === 'cobertura')); }
// 24/09 (D13, Diego: «tal persona cubre a tal persona, hasta nueva orden»): la designación es permanente
// (hasta que el encargado la quite) y se dice igual en todos los sitios. `lugarCubre` es el día y el turno
// de la designación («los viernes en Pasarela por la tarde», o nada); `cuandoCubre`, cómo se lee en la
// ficha, en Equipo y en la Cobertura («siempre que falte» / «cuando falte los viernes»). La condición del
// Generador usa el mismo trozo.
function lugarCubre(cfg, c) {
  if (!c) return '';
  const { localId, franja } = c.turnoId ? partirTurno(c.turnoId) : {};
  return [c.dow ? DOW_PL[c.dow] : '', c.turnoId ? `en ${(localDe(cfg, localId) || { nombre: localId }).nombre} por la ${(FRANJA_LBL[franja] || franja).toLowerCase()}` : ''].filter(Boolean).join(' ');
}
function cuandoCubre(cfg, c) { const l = lugarCubre(cfg, c); return l ? `cuando falte ${l}` : 'siempre que falte'; }
// Quién cubre a esta persona (la otra cara de «cubre a»): en su ficha, «Si falta, le cubre Mari Luz»; en la
// Cobertura, «Iván tiene quien le cubra: Mari Luz». Una fila por designación, con si está activa (la regla
// del grupo y la característica de quien cubre: con el interruptor apagado se enseña, pero no se aplica).
function quienLeCubre(cfg, staff, xid) {
  const out = [];
  for (const q of staff || []) for (const c of q.cubreA || []) {
    if (!c || c.pid !== xid || q.id === xid) continue;
    out.push({ pid: q.id, nombre: q.nombre, dow: c.dow || null, turnoId: c.turnoId || null, cuando: cuandoCubre(cfg, c), activa: activa(cfg, q, 'cubreA') });
  }
  return out;
}
// Por qué la persona designada NO cubre a X en esta casilla (o null si puede): para la confirmación de
// Equipo («el domingo no puede: nunca con Lavinia») y la Cobertura. Quien llama sabe que X falta de esta
// casilla. Revisión F3b: no se vuelve a derivar la regla: el día y el turno de la designación salen de su
// ficha; si ya está en la casilla, de la misma evaluación que el relevo (motivoNoRelevo: el puesto, «ya va
// por otra persona», lo que rompe); si no, de la misma que la pone (designadaPara y sus descartes: la
// puerta con el partido autorizado, el puesto, la cocina del local, «dos apoyos no se quedan solos»).
// Antes copiaba parte de la regla y se desviaba: devolvía null donde el plan no la ponía y la confirmación
// decía «no se pudo poner». opts: { faltaCocina: si X llevaba la cocina ahí }
function porQueNoCubre(cfg, staff, est, q, iso, tid, xid, opts) {
  const o = opts || {};
  if (!q) return 'no existe';
  const x = personaDe(staff, xid), nx = x ? x.nombre : xid;
  const cs = (q.cubreA || []).filter(c => c && c.pid === xid);
  if (!cs.length) return `no tiene «Cubre a» ${nx}`;
  if (!activa(cfg, q, 'cubreA')) return '«Cubre a» está apagado';
  // la designación es de otro día o de otro turno
  const dow = isoDow(iso);
  const cl = x ? cambioDeLibre(cfg, x, iso) : null, par = cl ? cl.pares.find(y => y[0] === dow) : null;
  if (cs.every(c => c.dow && +c.dow !== dow && !(par && +c.dow === par[1]))) return `solo le cubre ${[...new Set(cs.map(c => DOW_PL[c.dow]))].join(' y ')}`;
  if (cs.every(c => c.turnoId && c.turnoId !== tid)) return `solo le cubre ${[...new Set(cs.map(c => lugarCubre(cfg, { turnoId: c.turnoId })))].join(' y ')}`;
  const en = asignados(est, iso, tid).find(e => e.pid === q.id);
  if (en) return motivoNoRelevo(cfg, staff, est, iso, tid, xid, en, { aqui: true, faltaCocina: o.faltaCocina });
  const descartes = [];
  const c = designadaPara(cfg, staff, est, iso, tid, xid, { faltaCocina: !!o.faltaCocina, excluir: staff.filter(p => p.id !== q.id).map(p => p.id), descartes });
  if (c) return null;
  const d = descartes.find(y => y.pid === q.id);
  if (d) return d.motivo;
  // no pasó ni el primer filtro (cubreEnCasilla): la designación no vale en esta casilla
  return `no cubre a ${nx} en ese turno`;
}
// ¿En qué casilla lleva la cocina esa persona ese día? (el turno o null). Y ¿en cuál está de sala (sin
// contar `excepto`)? Solo las plazas que la ocupan (plazaOcupa). 24/09 (revisión F4 del modelo): son las
// que usa la puerta («ya lleva la cocina ese día», «ya está de sala ese día») y la verificación del
// Generador; antes la puerta tenía su propia búsqueda y este helper, exportado, respondía otra cosa en una
// casilla cerrada ese día.
function cocinaDelDia(cfg, est, iso, pid) {
  for (const t of turnosDe(cfg)) if (asignados(est, iso, t.id).some(x => x.pid === pid && x.cocina) && plazaOcupa(cfg, est, iso, t.id)) return t.id;
  return null;
}
function salaDelDia(cfg, est, iso, pid, excepto) {
  for (const t of turnosDe(cfg)) if (t.id !== excepto && asignados(est, iso, t.id).some(x => x.pid === pid && !x.cocina) && plazaOcupa(cfg, est, iso, t.id)) return t.id;
  return null;
}
// S34 para la cocina que se marca sola (Aroa, 17/09: quien lleva la cocina ese día no refuerza la sala; revisión
// de la fase 5): quien ese día ya está de sala en otra casilla —y de sala seguro: allí la cocina la lleva otra
// persona o no se busca— no se lleva esta cocina por su orden. Jenny entraba de sala en la mañana y en la tarde
// de El 33 y la tarde le daba la cocina. (Quien está en dos casillas sin cocina, como Roberto en la mañana y la
// tarde de Zapatillera, puede llevar las dos.) La casilla donde está de sala, o null.
function salaFirmeDelDia(cfg, staff, est, iso, p, tid) {
  const dia = p && est.asig[iso];
  if (!dia) return null;
  for (const t2 of Object.keys(dia)) {
    if (t2 === tid) continue;
    const lista = dia[t2], e = lista && lista.find(x => x.pid === p.id);
    if (!e || e.cocina || !(lista.some(x => x.cocina) || !seBuscaCocina(cfg, staff, t2)) || !plazaOcupa(cfg, est, iso, t2)) continue;
    if (activa(cfg, p, 'cocina')) return t2;
  }
  return null;
}

// ---------- reglas duras por persona ----------
function motivoAusencia(a) { return a ? (AUS_LBL[a.tipo] ? AUS_LBL[a.tipo].motivo : 'ausente') + textoFranjasAusencia(a) : ''; }
function lblLocales(cfg, ids) { return ids.map(id => (localDe(cfg, id) || { nombre: id }).nombre).join(' o '); }
// ---------- contexto: lo que una regla necesita saber, sin mirar el reloj ----------
// 24/09 (fase 4; decisiones.md, principio 3): la puerta, la puntuación y las variables reciben el
// contexto (la configuración, la plantilla, la planilla que se mira y, si hace falta, la semana o el día
// de hoy) en vez de sacarlo del reloj. Las funciones de siempre (puedeEstar, candidatosPara…) lo crean.
// opts.meses (revisión F4): la planilla de todos los meses ({ 'aaaa-mm': { asig } }, S.meses) para lo que
// mira fuera del mes que se pasa: la carga de la semana que cruza de mes (turnosSemanaDe).
function crearContexto(cfg, staff, est, opts) {
  const o = opts || {};
  return { cfg, staff: staff || (cfg && cfg.staff) || [], est: est || null, hoy: o.hoy || null, desde: o.desde || null, hasta: o.hasta || null, lunes: o.lunes || null, meses: o.meses || null };
}

// ---------- la puerta: TODAS las reglas de una plaza ----------
// 24/09 (fase 4; Diego: «que lea todas las variables»; decisiones.md, principio 1). Una sola puerta
// para todos los caminos: el selector, la semana tipo, el relleno del Generador, la Cobertura, la
// Revisión («por qué nadie», los avisos de lo ya puesto) y la hoja impresa («se destraparía si…»). Hasta
// ahora puedeEstar se paraba en la primera regla que chocaba, y el relleno, la Cobertura y la hoja
// impresa tenían cada uno su copia de lo que faltaba (la sala de quien solo hace cocina, «dos apoyos no
// se quedan solos», quién puede abrir): la hoja proponía levantar condiciones que no destrapaban nada
// (S41) y el selector ponía gente en «NO PUEDEN» sin decir por qué (S35).
// evaluarPlaza(ctx, iso, tid, pid, opts) → { ok, bloqueos: [{ k, motivo, forzable, relajable, forzado?,
//   primero?, extra? }], avisos: [{ k, texto, autorizado, por? }], primero }. En este orden:
//  · las que no se fuerzan nunca: cerrado (por fechas, «cierre», o por su horario, «cerrado»), ya está en
//    la casilla, ausencia (por franja, D10), ya en otro local esa franja;
//  · las de la ficha, que el encargado puede forzar (quedan como aviso): sin trabajo por un cierre (D11),
//    locales (salvo el apoyo de un cierre), franjas, standby, día libre (libraEn), vetos (con su día),
//    la cocina (S34: quien solo hace cocina o ya la lleva no refuerza la sala; quien ya está de sala no
//    entra a llevar una cocina), el partido (partidoEn; relajable con opts.permitirPartido; autorizado
//    para cubrir a X con opts.cubrePor, D1) y «nunca con» (relajable si es flexible, con
//    opts.relajarNuncaCon);
//  · con opts.apoyos: «dos apoyos no se quedan solos» (S33; relajable con opts.relajarApoyos, el
//    selector «con aviso»); con opts.primero: si puede salir el 1.º (puedePrimero); y con el puesto de
//    cocina: si puede llevar la cocina de ese local ese día (puedeCocina).
// Los interruptores, con activa() (regla del grupo y característica de la ficha).
// opts.forzar: lo forzable queda en bloqueos con `forzado` y no quita el ok. opts.corto: para en el primer
// bloqueo que manda (es lo que necesita puedeEstar, miles de veces por generación); sin él se evalúan
// todas, que es lo que necesitan la hoja impresa y el selector. `extra`: lo que puedeEstar nunca ha dicho
// pero cuenta para «se destraparía» (el partido de quien ese día libra, una segunda pareja «nunca con»).
function evaluarPlaza(ctx, iso, tid, pid, opts) {
  const { cfg, staff, est } = ctx;
  const o = opts || {};
  const res = { ok: true, bloqueos: [], avisos: [], primero: null };
  let n = 0, corte = false;
  const bloquea = (k, motivo, x) => {
    const b = Object.assign({ k, motivo, forzable: false, relajable: false, n: n++ }, x || {});
    if (o.forzar && b.forzable) b.forzado = true;
    res.bloqueos.push(b);
    if (!b.forzado && !b.extra) { res.ok = false; if (o.corto) corte = true; }
    return b;
  };
  const avisa = (k, texto, x) => { res.avisos.push(Object.assign({ k, texto, autorizado: false, n: n++ }, x || {})); };
  const p = personaDe(staff, pid);
  if (!p) { bloquea(undefined, 'no existe'); return res; }
  const { localId, franja } = partirTurno(tid);
  const l = localDe(cfg, localId);
  if (!l) { bloquea(undefined, 'local desconocido'); return res; }
  const dow = isoDow(iso);
  const act = k => activa(cfg, p, k);
  // una plaza que se ha quedado en una casilla cerrada ESE día (por fechas o a mano) no ocupa a nadie (S26,
  // auditoría L1): con el Mónaco cerrado el martes 29 por la tarde, Cristian ya no está «ya en Bar Mónaco
  // esta tarde». Con «Cuándo abre» sí la ocupa, como en Horas (plazaOcupa; revisión F4 del modelo)
  const enOtra = f => turnosDe(cfg).find(t => t.franja === f && t.id !== tid && pidsEn(est, iso, t.id).includes(pid) && plazaOcupa(cfg, est, iso, t.id));
  // 1) las que no se fuerzan
  if (!turnoAbierto(cfg, est, iso, tid)) { const mc = motivoCerrado(cfg, iso, tid); bloquea(mc.regla, mc.motivo); }
  if (corte) return res;
  if (!o.yaDentro && pidsEn(est, iso, tid).includes(pid)) bloquea('duplicado', 'ya está en esta casilla');
  if (corte) return res;
  const aus = ausenciaEn(p, iso, franja);   // por franja (D10): el permiso de la mañana no quita la tarde
  if (aus) bloquea('ausencia', motivoAusencia(aus) + (aus.detalle ? ' · ' + aus.detalle : ''));
  if (corte) return res;
  const ya = enOtra(franja);
  if (ya) bloquea('otraFranja', `ya en ${ya.local.nombre} esta ${FRANJA_LBL[franja].toLowerCase()}`);
  if (corte) return res;
  // 2) las de la ficha, forzables. Mientras su local cierra (D11), quien no trabaja esos días no entra en
  // otra casilla de esa franja salvo que el encargado lo fuerce; quien apoya puede ir a cualquier local.
  const dc = decisionCierre(cfg, pid, iso, franja);
  const apoyaCierre = !!dc && dc.tipo === 'REFUERZA';
  if (dc && !apoyaCierre) bloquea('cierre', motivoSinTrabajo(cfg, dc.cierre), { forzable: true });
  if (corte) return res;
  if (!apoyaCierre && act('locales') && Array.isArray(p.locales) && p.locales.length && !p.locales.includes(localId)) bloquea('locales', `solo ${lblLocales(cfg, p.locales)}`, { forzable: true });
  if (corte) return res;
  if (act('franjas') && Array.isArray(p.franjas) && p.franjas.length && !p.franjas.includes(franja)) bloquea('franjas', p.franjas.length === 1 ? (p.franjas[0] === 'M' ? 'siempre de mañana' : 'solo tardes') : 'franja no permitida', { forzable: true });
  if (corte) return res;
  if (p.standby) bloquea('standby', 'en standby: aún no entra en la planilla', { forzable: true });
  if (corte) return res;
  const libraHoy = act('libra') && libraEn(p, iso);
  if (libraHoy) bloquea('libra', motivoLibra(p, iso), { forzable: true });
  if (corte) return res;
  if (act('vetos')) { const v = vetoDe(p, localId, franja, dow); if (v) bloquea('vetos', textoVeto(v, l.nombre), { forzable: true }); }
  if (corte) return res;
  // la sala (S34): quien solo hace cocina, o ya lleva la cocina ese día en otra casilla, no la refuerza;
  // y al revés, quien ese día ya está de sala no entra a llevar una cocina (revisión F3). Lo ya puesto
  // (yaDentro) se avisa solo en la entrada de sala, para no contar dos veces el mismo choque.
  if (o.puesto === 'sala' && act('cocina')) {
    const tc = cocinaDelDia(cfg, est, iso, pid);
    if (p.soloCocina) bloquea('cocina', 'solo hace cocina', { forzable: true });
    else if (tc && tc !== tid) bloquea('cocina', `ya lleva la cocina de ${localDe(cfg, partirTurno(tc).localId).nombre} ese día`, { forzable: true });
  } else if (o.puesto === 'cocina' && !o.yaDentro && act('cocina')) {
    const ts = salaDelDia(cfg, est, iso, pid, tid);
    if (ts) bloquea('cocina', `ya está de sala en ${localDe(cfg, partirTurno(ts).localId).nombre} ese día`, { forzable: true });
  }
  if (corte) return res;
  // el partido se lee con partidoEn: días declarados y, la semana de un cambio de día libre, trasladado
  // al día que ahora trabaja; con la regla apagada no se mira. Si ese día libra, el partido no se dice
  // (24/09, revisión F1: el aviso que importa es el del día libre): va como `extra`.
  if (!(libraHoy && o.corto)) {
    const tOtra = enOtra(franja === 'M' ? 'T' : 'M');
    if (tOtra && !partidoEn(cfg, p, iso)) {
      // D1: el partido para cubrir a X en SU casilla, mientras X falta, está autorizado. Vale para las dos
      // mitades de lo ya puesto: esta, si viene a cubrir a X, y la otra, si la otra es la que está «por
      // X». Para ponerla además en otra casilla, no (revisión F3: «solo en la casilla de X»)
      let x = o.cubrePor ? cubreEnCasilla(cfg, staff, est, p, iso, tid, { cocina: o.puesto === 'cocina' || !!o.cocina, falta: o.cubrePor, suCasilla: !!o.cubreSuCasilla, ausente: !!o.cubreAusente, concreta: true }) : null;
      if (!x && o.yaDentro) {
        const eo = asignados(est, iso, tOtra.id).find(q => q.pid === pid), porO = porDe(staff, eo);
        if (porO && cubreEnCasilla(cfg, staff, est, p, iso, tOtra.id, { cocina: !!eo.cocina, falta: porO, suCasilla: porDeSuCasilla(eo), concreta: true }) === porO) x = porO;
      }
      const extra = libraHoy ? { extra: true } : null;
      if (x) avisa('partido', `partido para cubrir a ${nombreDe(staff, x)}`, Object.assign({ autorizado: true, por: x }, extra));
      else if (o.permitirPartido) avisa('partido', `partido no declarado ${DOW_PL[dow]}`, extra);
      else bloquea('partido', `no hace partido ${DOW_PL[dow]}`, Object.assign({ forzable: true, relajable: true }, extra));
    }
  }
  if (corte) return res;
  // «nunca con» (incompatibles: la pareja la tenga cualquiera de las dos fichas, con sus interruptores).
  // La flexible (José, 17/09) se relaja con opts.relajarNuncaCon y queda el aviso. Después de la primera
  // pareja que choca, las demás van como `extra` (puedeEstar siempre ha dicho solo una)
  let pareja = false;
  for (const q of asignados(est, iso, tid)) {
    if (pareja && o.corto) break;
    const qp = q.pid === pid ? null : personaDe(staff, q.pid);
    const inc = incompatibles(cfg, p, qp);
    if (!inc) continue;
    const extra = pareja ? { extra: true } : null;
    if (o.relajarNuncaCon && inc.flexible) { avisa('nuncaCon', `nunca con ${qp.nombre}: no había nadie más`, extra); continue; }
    bloquea('nuncaCon', `nunca con ${qp.nombre}`, Object.assign({ forzable: true, relajable: inc.flexible, otro: qp.id }, extra));
    pareja = true;
  }
  if (corte) return res;
  // 3) lo que depende de para qué se la busca
  if (o.apoyos && o.puesto !== 'cocina' && quedariaSoloApoyos(staff, est, iso, tid, pid)) {
    if (o.relajarApoyos) avisa('soloApoyos', 'solo apoyos');
    else bloquea('soloApoyos', MOTIVO_SOLO_APOYOS, { forzable: true, relajable: true });
  }
  if (corte) return res;
  if (o.primero) {
    const pr = puedePrimero(cfg, staff, est, iso, tid, pid, { cubrePor: o.cubrePor, cubreSuCasilla: o.cubreSuCasilla, cubreAusente: o.cubreAusente });
    res.primero = pr;
    if (!pr.ok) bloquea(pr.regla || 'primero', pr.motivo, { forzable: true, primero: true });
  }
  if (corte) return res;
  // (fase 5, D5: con la regla del grupo «Cocina» apagada nadie mira quién la lleva)
  if (o.puesto === 'cocina' && !o.yaDentro && regla(cfg, 'cocina') && !puedeCocina(cfg, p, localId, iso)) bloquea('cocina', `no lleva la cocina de ${l.nombre}${puedeCocina(cfg, p, localId) ? ' ese día' : ''}`, { forzable: true });
  return res;
}
// El bloqueo que manda (el primero que no está forzado) y, antes de él y en orden, lo que se incumple:
// lo forzado y los avisos (lo relajado), cada uno con su regla. aviso: true si no bloqueaba (un partido no
// declarado con permitirPartido), para distinguirlo de lo forzado.
function incumplidas(r) {
  const manda = r.bloqueos.find(b => !b.forzado && !b.extra) || null;
  const hasta = manda ? manda.n : Infinity;
  const lista = r.bloqueos.filter(b => b.forzado && !b.extra && b.n < hasta).map(b => ({ n: b.n, k: b.k, motivo: b.motivo, aviso: false }))
    .concat(r.avisos.filter(a => !a.autorizado && !a.extra && a.n < hasta).map(a => ({ n: a.n, k: a.k, motivo: a.texto, aviso: true })))
    .sort((a, b) => a.n - b.n);
  return { manda, hasta, lista };
}
// Lo que siempre ha devuelto puedeEstar, a partir de la puerta: el primer bloqueo que manda (con su
// regla) y, antes de él y en orden, lo forzado y los avisos; lo autorizado aparte.
function primerBloqueo(r) {
  const { manda, hasta, lista } = incumplidas(r);
  const antes = lista.map(x => x.motivo);
  const autorizados = r.avisos.filter(a => a.autorizado && !a.extra && a.n < hasta).map(a => ({ k: a.k, texto: a.texto, autorizado: true, por: a.por }));
  if (!manda) return { ok: true, motivo: null, regla: null, avisos: antes, autorizados };
  const out = { ok: false, motivo: manda.motivo, regla: manda.k, avisos: antes, autorizados };
  if (manda.k === undefined) delete out.regla;
  return out;
}
// ¿Puede estar? Devuelve {ok, motivo, regla, avisos[], autorizados[]}: el primer bloqueo de la puerta
// (evaluarPlaza), con la forma de siempre, para no romper la interfaz ni las pruebas (18/09, Diego: «un
// aviso que cuando fuerzas un trabajador te diga QUÉ REGLA estás incumpliendo»: `regla` es la clave).
// Las reglas «forzables» se convierten en avisos con opts.forzar: el encargado distribuye «de la manera
// que quiera» y la app deja constancia. Cierres, ausencias y estar ya en otro local en la misma franja no
// se fuerzan nunca. opts: los de evaluarPlaza (forzar, yaDentro, permitirPartido, relajarNuncaCon,
// cubrePor, cubreSuCasilla, cubreAusente, puesto).
function puedeEstar(cfg, staff, est, iso, tid, pid, opts) {
  return primerBloqueo(evaluarPlaza(crearContexto(cfg, staff, est), iso, tid, pid, Object.assign({}, opts, { corto: true })));
}
// ¿Y si se fuerza? Todas las reglas que incumpliría, cada una con la suya, en el orden de la puerta: son
// justo los avisos que se guardan al forzarla (asignar con forzar). 24/09 (revisión F4, Diego 18/09: «un
// aviso que cuando fuerzas un trabajador te diga QUÉ REGLA estás incumpliendo»): el selector y el Mes
// preguntaban solo por la primera (Jacquelin: «Locales donde trabaja») y el aviso de después se las
// atribuía todas a ella. Devuelve { forzable, regla, motivo, incumple: [{ k, motivo }] }: regla y motivo,
// lo que la frena (lo que no se fuerza, o la primera regla forzable que rompe). opts: los de puedeEstar.
function siSeFuerza(cfg, staff, est, iso, tid, pid, opts) {
  const ev = evaluarPlaza(crearContexto(cfg, staff, est), iso, tid, pid, Object.assign({}, opts, { forzar: true, corto: true }));
  const { manda, lista } = incumplidas(ev);
  const cab = manda || lista.find(x => !x.aviso) || lista[0] || null;
  return { forzable: !manda, regla: cab ? (cab.k || null) : null, motivo: cab ? cab.motivo : null, incumple: lista.map(x => ({ k: x.k || null, motivo: x.motivo })) };
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
// opts (la Cobertura, al mirar un relevo antes de marcarlo): { cubrePor, cubreSuCasilla, cubreAusente,
// sinPrimero }. 24/09 (fase 5, S18): quien sale el primero porque se marcó a mano («Sale primero» del menú de
// la casilla) y no puede abrir (Leo, «nunca de primero»; Cristian, que no abre El 33; quien viene de hacer la
// mañana) queda, pero con el porqué: `abreNoApto` ({ regla, motivo }) y el motivo al final de los avisos, que
// es lo que enseñan la casilla (posicionesDe), el menú y la Revisión (abre-no-apto). Antes nadie avisaba.
function revisarEntrada(cfg, staff, est, iso, tid, pid, opts) {
  const e = asignados(est, iso, tid).find(x => x.pid === pid);
  const o = Object.assign({ forzar: true, yaDentro: true, puesto: e && e.cocina ? 'cocina' : 'sala' }, opts || {});
  const por = o.cubrePor || porDe(staff, e);
  // la casilla es la de X si lo sabe quien la puso (la Cobertura, el relevo) o si lo dice la semana
  // tipo o la planilla; el «por» de la regla de reserva no autoriza el partido (revisión F3)
  if (por && !o.cubrePor) Object.assign(o, { cubrePor: por, cubreSuCasilla: porDeSuCasilla(e) });
  const r = puedeEstar(cfg, staff, est, iso, tid, pid, o);
  const avisos = r.ok ? r.avisos : r.avisos.concat(r.motivo ? [r.motivo] : []);
  let abreNoApto = null;
  if (!o.sinPrimero && e && e.abre && manualDe(est, iso, tid).abre) {
    const pr = puedePrimero(cfg, staff, est, iso, tid, pid, { cubrePor: o.cubrePor, cubreSuCasilla: o.cubreSuCasilla, cubreAusente: o.cubreAusente });
    if (!pr.ok) abreNoApto = { regla: pr.regla || null, motivo: pr.motivo };
  }
  return { avisos: abreNoApto ? avisos.concat([abreNoApto.motivo]) : avisos, autorizados: r.autorizados || [], abreNoApto };
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
// Lo de su ficha que le impide salir el primero en ese local y franja, sin mirar la planilla: «nunca de primero» y
// «no abre», con sus interruptores. { regla, motivo } o null. Lo usan puedePrimero y los avisos de Ajustes del
// local y de la ficha al poner a alguien en «Quién abre» o en «Sale el primero» (revisión de la fase 5: Ajustes
// ofrecía a Leo en «Quién abre» sin decir que su ficha no le deja abrir)
function fichaImpideAbrir(cfg, p, localId, franja) {
  if (!p) return null;
  const l = localDe(cfg, localId);
  // (fase 4: con la clave de la regla, como la puerta, para que el selector y la hoja impresa la nombren)
  if (regla(cfg, 'noPrimero') && caracteristicaActiva(p, 'noPrimero') && (p.noPrimero || []).includes(franja)) return { regla: 'noPrimero', motivo: `${p.nombre} no sale ${franja === 'M' ? 'el primero de la mañana' : 'el primero de la tarde'}` };
  if (caracteristicaActiva(p, 'noAbre') && (p.noAbre || []).includes(localId)) return { regla: 'noAbre', motivo: `${p.nombre} no abre ${l ? l.nombre : localId}` };
  return null;
}
function puedePrimero(cfg, staff, est, iso, tid, pid, opts) {
  const p = personaDe(staff, pid);
  if (!p) return { ok: false, motivo: 'no existe' };
  const { localId, franja } = partirTurno(tid);
  const l = localDe(cfg, localId);
  const imp = fichaImpideAbrir(cfg, p, localId, franja);
  if (imp) return Object.assign({ ok: false }, imp);
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
      return { ok: false, regla: 'primeroCompleto', motivo: `${p.nombre} viene de hacer la mañana: el primero de la tarde hace turno completo` };
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
// quién sale el primero en una casilla: lo marcado a mano; si no, el fijo (abreFijo: el de «Quién abre» del
// local y luego quien tiene «sale el primero» en su ficha); luego la marca «a» de la semana tipo; si no, el
// primero de la lista que pueda. null = nadie puede.
// 24/09 (fase 5, S18): la marca «a» de la semana tipo era un «abre fijado a mano» (asignar lo marcaba con
// marcarManual) y mandaba «aunque rompa una regla»: Lola con «nunca de primero» seguía saliendo 1.ª, «Quién
// abre» del local no cambiaba nada y cada «Guardar como semana tipo» congelaba quién abría. Ahora es una
// preferencia de origen 'patron' (e.abrePatron): va después del fijo, solo si puede abrir y con el
// interruptor «Sale el primero» encendido. opts.sinPreferencia: sin lo puesto a mano ni la marca de la semana
// tipo (quién abriría solo; lo usan «Guardar como semana tipo» y la migración de las «a» guardadas).
function primeroDe(cfg, staff, est, iso, tid, opts) {
  const lista = asignados(est, iso, tid);
  if (!lista.length) return null;
  const o = opts || {};
  const { localId, franja } = partirTurno(tid);
  const l = localDe(cfg, localId);
  const okP = e => puedePrimero(cfg, staff, est, iso, tid, e.pid).ok;
  const man = manualDe(est, iso, tid);
  const marcado = lista.find(e => e.abre);
  if (!o.sinPreferencia && marcado && man.abre) return marcado.pid;   // fijado a mano: manda aunque rompa una regla (queda el aviso, abre-no-apto)
  const fijo = e => abreFijo(cfg, l, personaDe(staff, e.pid), franja);
  const delLocal = l && l.primero && l.primero[franja] ? lista.find(x => x.pid === l.primero[franja]) : null;
  if (delLocal && fijo(delLocal) && okP(delLocal)) return delLocal.pid;
  { const e = lista.find(x => fijo(x) && okP(x)); if (e) return e.pid; }
  if (!o.sinPreferencia) { const e = lista.find(x => x.abrePatron && activa(cfg, personaDe(staff, x.pid), 'abre') && okP(x)); if (e) return e.pid; }
  // la cocina tiene su propia posición: solo abre si nadie más puede (o si es la fija del local, como Susana Capón el martes)
  const e = lista.find(x => !x.cocina && okP(x)) || lista.find(okP);
  return e ? e.pid : null;
}
function motivoSinPrimero(cfg, staff, est, iso, tid) {
  const lista = asignados(est, iso, tid);
  const motivos = lista.map(e => puedePrimero(cfg, staff, est, iso, tid, e.pid).motivo).filter(Boolean);
  return `nadie de la casilla puede abrir${motivos.length ? ': ' + motivos.join('; ') : ''}`;
}
// Por qué nadie puede abrir: la puerta con el 1.º (fase 4); de quien ya está en la casilla, solo si puede abrir
function porQueNadiePrimero(cfg, staff, est, iso, tid) {
  const ctx = crearContexto(cfg, staff, est);
  const out = {};
  for (const p of staff) {
    const dentro = pidsEn(est, iso, tid).includes(p.id);
    const ev = evaluarPlaza(ctx, iso, tid, p.id, { primero: true, yaDentro: dentro, corto: !dentro });
    const b = (dentro ? ev.bloqueos.filter(x => x.primero) : ev.bloqueos).find(x => !x.forzado && !x.extra);
    if (b) (out[b.motivo] = out[b.motivo] || []).push(p.nombre);
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
    const p = personaDe(staff, e.pid) || { id: e.pid, nombre: e.pid };
    const continuo = e.pid === primero && esContinuo(cfg, staff, est, iso, localId, e.pid);
    const fijo = abreFijo(cfg, l, p, franja);   // la misma lectura que la puntuación (fase 4)
    const por = porDe(staff, e);
    const { avisos, autorizados, abreNoApto } = revisarEntrada(cfg, staff, est, iso, tid, e.pid);
    // (fase 5, S18) abreNoApto: el porqué, si sale primero porque se marcó a mano y no puede abrir
    return { pos: i + 1, pid: e.pid, nombre: p.nombre, abre: e.pid === primero, abreFijo: e.pid === primero && fijo, abreNoApto: abreNoApto ? abreNoApto.motivo : null, cocina: !!e.cocina, partido: enOtra(e.pid) && !continuo, continuo, comodin: !(p.locales || []).length, por: por || null, nota: e.nota || null, supuesto: !!e.supuesto, avisos, autorizados, forzado: !!e.forzado && avisos.length > 0, origen: e.origen || 'manual', tramo: e.ini && e.fin ? { ini: e.ini, fin: e.fin } : null };
  });
}
// recalcula cocina, abre y orden salvo lo que el encargado haya fijado a mano
function normalizarCasilla(est, cfg, staff, iso, tid, eco) {
  const lista = asignados(est, iso, tid);
  if (!lista.length) return;
  const c0 = (lista.find(e => e.cocina) || {}).pid;
  const { localId, franja } = partirTurno(tid);
  const l = localDe(cfg, localId);
  const man = manualDe(est, iso, tid);
  // la cocina: la preferencia de lo automático (cocinaAuto) si puede llevarla ese día; si no, por el orden del
  // local (rangoCocina). Con «Cocina» apagada no se marca sola (fase 5, D5)
  if (!man.cocina && l && cocinaExigida(cfg, staff, l, franja)) {
    let mejor = null, mejorR = Infinity, pref = false;
    for (const e of lista) {
      const q = personaDe(staff, e.pid), r = rangoCocina(cfg, l, q, franja, iso), pe = !!e.cocinaAuto;
      if (r < 0 || (!pe && salaFirmeDelDia(cfg, staff, est, iso, q, tid))) continue;
      if ((pe && !pref) || (pe === pref && r < mejorR)) { mejorR = r; mejor = e; pref = pe; }
    }
    for (const e of lista) e.cocina = e === mejor;
  } else if (!man.cocina) for (const e of lista) e.cocina = false;
  // si la cocina cambia de manos, las otras casillas de ese día sin cocina donde está quien la deja o la coge se
  // miran otra vez (salaFirmeDelDia: Roberto, en la mañana y la tarde de Zapatillera, recupera la de la mañana
  // cuando Adrián deja la de la tarde). Un solo eco, sin cadena
  const c1 = (lista.find(e => e.cocina) || {}).pid;
  if (!eco && c0 !== c1) for (const t2 of Object.keys(est.asig[iso] || {})) {
    const l2 = est.asig[iso][t2];
    if (t2 !== tid && l2 && !l2.some(x => x.cocina) && l2.some(x => x.pid === c0 || x.pid === c1)) normalizarCasilla(est, cfg, staff, iso, t2, true);
  }
  if (!man.abre) { const pr = primeroDe(cfg, staff, est, iso, tid); for (const e of lista) e.abre = !!pr && e.pid === pr; }
  if (!man.orden) {
    const { orden } = ordenCompleto(cfg, staff, est, iso, tid);
    const porPid = {}; for (const e of lista) porPid[e.pid] = e;
    est.asig[iso][tid] = orden.filter(e => !e.hueco).map(e => porPid[e.pid]);
  }
}
// 24/09 (revisión de la fase 5; Diego: «que lea todas las variables»). Quién abre y quién lleva la cocina se
// guardan en cada casilla (e.abre y e.cocina, que leen el Mes, el perfil del empleado, el Excel, las horas y el
// tramo de Hoy) y los calcula normalizarCasilla cuando se toca la casilla. Al cambiar la configuración («Quién
// abre» o la cocina de un local, una ficha, un interruptor) las casillas ya puestas no se enteraban: Hoy, que
// pregunta a primeroDe, decía que abría Mari Luz y el Mes, el perfil y el Excel seguían con Iván; y Susana
// Capón, con «cocina solo los miércoles», seguía con la cocina del martes. refrescarCasillas vuelve a
// calcularlas entre dos fechas de un estado (con normalizarCasilla: lo puesto a mano no se toca) y dice qué ha
// cambiado: [{ iso, tid, abre?: { antes, ahora }, cocina?: { antes, ahora } }]. La usa el Generador al
// regenerar; refrescarMarcas, la app tras un cambio de configuración.
function refrescarCasillas(cfg, staff, est, desde, hasta) {
  const out = [];
  const dias = Object.keys((est && est.asig) || {}).filter(iso => (!desde || iso >= desde) && (!hasta || iso <= hasta)).sort();
  for (const iso of dias) for (const tid of Object.keys(est.asig[iso] || {})) {
    if (!asignados(est, iso, tid).length) continue;
    const quien = k => { const e = asignados(est, iso, tid).find(x => x[k]); return e ? e.pid : null; };
    const a0 = quien('abre'), c0 = quien('cocina');
    normalizarCasilla(est, cfg, staff, iso, tid);
    const a1 = quien('abre'), c1 = quien('cocina');
    if (a0 === a1 && c0 === c1) continue;
    const x = { iso, tid };
    if (a0 !== a1) x.abre = { antes: a0, ahora: a1 };
    if (c0 !== c1) x.cocina = { antes: c0, ahora: c1 };
    out.push(x);
  }
  return out;
}
// La planilla guardada entera (S.meses) de desdeIso en adelante: lo pasado es lo que se trabajó (sus horas
// no cambian porque hoy se cambie «Quién abre»)
function refrescarMarcas(cfg, staff, meses, desdeIso) {
  const out = [];
  for (const k of Object.keys(meses || {}).sort()) {
    if (!/^\d{4}-\d{2}$/.test(k) || (desdeIso && k < desdeIso.slice(0, 7))) continue;
    const e = estadoDesde(meses, (cfg && cfg.festivos) || [], +k.slice(0, 4), +k.slice(5, 7));
    for (const x of refrescarCasillas(cfg, staff, e, desdeIso || null, null)) out.push(x);
  }
  return out;
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
  // 24/09 (D13): entra SOLO porque la designación «cubre a» manda que cubra a quien falta (no es su plaza
  // fija ni la eligió el encargado): si la designación se quita, al regenerar se retira (motivoRetirada)
  if (o.por && o.porDesignacion) entry.porDesignacion = true;
  // 24/09 (fase 5, S18): la marca «a» de la semana tipo, como preferencia (primeroDe), no como «abre» a mano
  if (o.abrePatron) entry.abrePatron = true;
  const lista = ((est.asig[iso] = est.asig[iso] || {})[tid] = est.asig[iso][tid] || []);
  // 24/09 (revisión de la fase 5, S38): la cocina que da lo automático (la «c» de la semana tipo, el Generador,
  // la Cobertura, el volcado del Periodo) es una preferencia (cocinaAuto) que normalizarCasilla usa mientras esa
  // persona pueda llevarla y la regla «Cocina» esté encendida; la última que se pone manda, como antes. Antes
  // quedaba fijada «a mano»: Susana Capón, con «cocina solo los miércoles», seguía llevando la del martes en la
  // semana ya volcada, y apagar «Cocina» no quitaba ninguna. Lo que pone el encargado sí se fija a mano.
  if (o.cocina && ORIGENES_AUTO.includes(entry.origen)) { for (const e of lista) delete e.cocinaAuto; entry.cocinaAuto = true; entry.cocina = false; }
  else if (o.cocina) { for (const e of lista) e.cocina = false; marcarManual(est, iso, tid, 'cocina'); }
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
  for (const e of asignados(est, iso, tid)) if (e.pid !== xid && motivoNoRelevo(cfg, staff, est, iso, tid, xid, e, opts) === null) return e.pid;
  return null;
}
// Por qué quien ya está en la casilla de X NO es su relevo (o null si lo es). Una sola evaluación para
// relevoEn y para el porqué de la persona designada que ya estaba (porQueNoCubre; revisión F3b: Victoria,
// de sala en la mañana de El 33 con «Cubre a Hojan», no era el relevo de Hojan, que llevaba la cocina, y
// la confirmación decía «no se pudo poner»).
function motivoNoRelevo(cfg, staff, est, iso, tid, xid, e, opts) {
  const o = opts || {};
  // quien ya va «por» otra persona (Roberto, en su plaza del jueves por Susana Luna) no puede ser
  // además el relevo de X: pisaba ese «por» y la semana tipo lo perdía al guardarse (revisión F3, D12)
  const otroPor = porDe(staff, e);
  if (otroPor && otroPor !== xid) return `ya está en ese turno por ${nombreDe(staff, otroPor)}`;
  const q = personaDe(staff, e.pid);
  const cubre = coc => cubreEnCasilla(cfg, staff, est, q, iso, tid, { cocina: coc, falta: xid, suCasilla: !!o.aqui, ausente: !!o.aqui, faltaCocina: o.faltaCocina, concreta: true }) === xid;
  if (!cubre(!!e.cocina)) {
    // su puesto no es el de X: lo cubriría con el otro puesto, pero ya está en la casilla con este
    if (cubre(!e.cocina)) return `ya está en ese turno ${e.cocina ? 'llevando la cocina' : 'de sala'}, y ${nombreDe(staff, xid)} ${e.cocina ? 'era de sala' : 'llevaba la cocina'}`;
    return `no cubre a ${nombreDe(staff, xid)} en ese turno`;
  }
  const av = revisarEntrada(cfg, staff, est, iso, tid, e.pid, { cubrePor: xid, cubreSuCasilla: true, cubreAusente: !!o.aqui, sinPrimero: true }).avisos;
  return av.length ? av.join(', ') : null;
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
// «Quitar “sale primero” a mano» del menú de la casilla (revisión de la fase 5): la casilla vuelve a decidir sola
// quién abre (primeroDe: «Quién abre» del local, la ficha, la semana tipo y el orden). Hasta ahora no había forma
// de quitarlo sin vaciar y volver a generar
function quitarAbreAMano(est, cfg, staff, iso, tid) {
  const m = est.manual && est.manual[iso] && est.manual[iso][tid];
  if (!m || !m.abre) return false;
  delete m.abre;
  if (!Object.keys(m).length) delete est.manual[iso][tid];
  normalizarCasilla(est, cfg, staff, iso, tid);
  return true;
}

// ---------- revisión ----------
function revisarTurno(cfg, staff, est, iso, tid) {
  const { localId, franja } = partirTurno(tid);
  const l = localDe(cfg, localId);
  const abierto = turnoAbierto(cfg, est, iso, tid);
  const lista = asignados(est, iso, tid);
  const m = minimoDe(cfg, iso, tid, est);
  const n = lista.length;
  const tieneCocina = l && cocinaExigida(cfg, staff, l, franja);   // (fase 5, D5 y S36)
  const coc = lista.find(e => e.cocina);
  const cache = new Map();
  const rev = pid => { if (!cache.has(pid)) cache.set(pid, revisarEntrada(cfg, staff, est, iso, tid, pid)); return cache.get(pid); };
  // los avisos de cada entrada sin el del 1.º (ese sale aparte, abreNoApto)
  const vigentes = pid => { const r = rev(pid); return r.abreNoApto ? r.avisos.slice(0, -1) : r.avisos; };
  const out = {
    abierto, n, minimo: m.min, supuesto: m.supuesto, refuerzo: m.refuerzo, faltan: abierto ? Math.max(0, m.min - n) : 0,
    sinCocina: !!(abierto && tieneCocina && !coc),
    cocinaObligatoria: cocinaObligatoriaEn(cfg, l, franja),
    cocinaNoApta: !!(coc && regla(cfg, 'cocina') && !puedeCocina(cfg, personaDe(staff, coc.pid), localId, iso)),
    sinAbre: !!(abierto && n > 0 && !primeroDe(cfg, staff, est, iso, tid)),
    motivoAbre: abierto && n > 0 && !primeroDe(cfg, staff, est, iso, tid) ? motivoSinPrimero(cfg, staff, est, iso, tid) : null,
    // dos apoyos no pueden quedarse solos en un turno (José, 17/09): hace falta un veterano
    soloApoyos: !!(abierto && lista.length && lista.every(e => esApoyo(personaDe(staff, e.pid)))),
    forzados: lista.filter(e => e.forzado && vigentes(e.pid).length).length,
    avisos: lista.filter(e => vigentes(e.pid).length).map(e => `${nombreDe(staff, e.pid)}: ${vigentes(e.pid).join(', ')}`),
    // 24/09 (fase 5, S18): el 1.º puesto a mano que no puede abrir (va aparte: la Revisión lo dice como abre-no-apto)
    abreNoApto: (() => { const e = lista.find(x => rev(x.pid).abreNoApto); return e ? Object.assign({ pid: e.pid }, rev(e.pid).abreNoApto) : null; })(),
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
        if (dentro.length && opts && opts.hoy && d.iso < opts.hoy && plazaOcupa(cfg, est, d.iso, t.id)) continue;
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
      // 24/09 (fase 5, S18): «Sale primero» a mano sobre quien no puede abrir
      if (r.abreNoApto) out.push({ iso: d.iso, turnoId: t.id, pid: r.abreNoApto.pid, tipo: 'abre-no-apto', nivel: 'media', msg: `${donde}: sale primero ${nombreDe(staff, r.abreNoApto.pid)}, marcado a mano, y no puede abrir — ${r.abreNoApto.motivo}` });
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
      // 24/09 (fase 5). La «c» y la «a» de la plaza son preferencias, no marcas puestas a mano: la cocina es suya
      // solo si su ficha la deja llevarla ese día y la regla «Cocina» está encendida (S38, D5: Susana Capón con
      // «cocina solo los miércoles» seguía llevando la del martes) —si no, la casilla la elige por orden y, si
      // nadie puede, el Generador la da como hueco (S37)—, y abre solo si puede (abrePatron, S18). Las dos las
      // decide normalizarCasilla (asignar), también al refrescar la planilla ya volcada (revisión F5)
      const a = asignar(est, cfg, staff, iso, pl.t, pl.p, { origen: 'patron', razon, supuesto: !!pl.s, cocina: pl.c ? true : undefined, abrePatron: !!pl.a, por: pl.por, nota: pl.n });
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
      // revisión F3b: quién entra lo dice designadaPara, la misma evaluación que la Cobertura y Equipo (el
      // puesto de X, sin dejar la casilla solo con apoyos, y entre dos designadas la misma). Antes había aquí
      // una copia (cubreEnCasilla y asignar) que ponía a Dulce con Lavinia solas el miércoles 30
      const abrir = revisarTurno(cfg, staff, est, iso, pl.t).sinAbre;
      const excluir = [];
      for (let k = 0; k < 8; k++) {
        const d = designadaPara(cfg, staff, est, iso, pl.t, p.id, { faltaCocina: !!pl.c, prefiereAbrir: abrir, excluir, meses: o.meses });
        if (!d) break;
        const a = asignar(est, cfg, staff, iso, pl.t, d.pid, { origen: 'patron', razon: `cubre a ${p.nombre}`, por: p.id, porDesignacion: true, cubrePor: p.id, cubreSuCasilla: true, cubreAusente: true, puesto: d.cocina ? 'cocina' : 'sala', cocina: d.cocina ? true : undefined });
        if (a.ok) { r.aplicados.push({ iso, turnoId: pl.t, pid: d.pid, origen: 'patron', razon: a.entry.razon, por: p.id }); r.coberturas.push({ iso, turnoId: pl.t, pid: d.pid, por: p.id }); break; }
        excluir.push(d.pid);
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
// Revisión F3b: lo mismo con quien esa semana faltaba (vacaciones, baja, permiso): sus plazas de la semana
// tipo vuelven, y quien le cubría esos días («por X» con X ausente: la designación, la Cobertura) no se
// guarda como plaza fija. Antes Roberto quedaba «por Iván» todos los martes —y como plaza con su «por» (D12)
// sobrevivía a quitar la designación— e Iván desaparecía de la semana tipo. La plaza fija de siempre con
// su «por» (Lavinia por Mari Luz los miércoles) sí se guarda.
// 24/09 (fase 5, S18): la «a» (sale el primero) se guarda solo si la puso el encargado a mano («Sale
// primero») o si, ya como preferencia de la semana tipo, sigue decidiendo quién abre (sin ella abriría otra
// persona; revisión F5: se perdía en el segundo «Guardar como semana tipo»). La calculada no: cada «Guardar
// como semana tipo» congelaba quién abría ese día en 54 casillas, como si las hubiera fijado el encargado, y
// la semana tipo dejaba de leer la ficha. Quien abría sigue abriendo: las plazas se guardan en el orden de la
// casilla, que empieza por quien abre.
function patronDesdeSemana(est, lunesIso, cfg, staff) {
  const patron = {};
  const conFicha = !!(cfg && staff);
  const abreDecidido = (iso, tid, e) => {
    if (manualDe(est, iso, tid).abre) return !!e.abre;
    return conFicha && !!e.abrePatron && primeroDe(cfg, staff, est, iso, tid) === e.pid && primeroDe(cfg, staff, est, iso, tid, { sinPreferencia: true }) !== e.pid;
  };
  // cubre a quien esa semana faltaba (y no es su plaza fija de siempre)
  const cubreAusencia = (iso, tid, e, por) => {
    if (!conFicha || !por || e.relevo) return false;
    const x = personaDe(staff, por);
    if (!x || !ausenciaEn(x, iso, partirTurno(tid).franja)) return false;
    return !plazasDe(cfg, isoDow(iso)).some(pl => pl.t === tid && pl.p === e.pid && pl.por === por);
  };
  for (let k = 0; k < 7; k++) {
    const iso = addDias(lunesIso, k);
    const dow = isoDow(iso);
    patron[dow] = [];
    for (const [tid, lista] of Object.entries(est.asig[iso] || {})) for (const e of lista) {
      // el «por» de un relevo (D3) es de esa semana: la plaza es suya y se guarda sin él
      const por = e.relevo ? null : porDe(staff, e);
      if (cubreAusencia(iso, tid, e, por)) continue;
      const pl = { t: tid, p: e.pid }; if (e.cocina) pl.c = 1; if (abreDecidido(iso, tid, e)) pl.a = 1; if (e.supuesto) pl.s = 1; if (por) pl.por = por; if (e.nota) pl.n = e.nota;
      patron[dow].push(pl);
    }
  }
  if (!conFicha) return patron;
  const tiene = (xs, pl) => xs.some(x => x.t === pl.t && x.p === pl.p);
  // quien faltaba recupera sus plazas de la semana tipo de esos días y franjas (con su cocina y su «abre»:
  // quien abrió en su lugar no se queda con la marca). Si con la semana tipo de antes abría (Cris, la mañana del
  // Mónaco, por ir la primera), su plaza vuelve la primera de la casilla: se abre por orden y al final no
  // abría nunca más (revisión F5)
  for (let k = 0; k < 7; k++) {
    const iso = addDias(lunesIso, k), dow = isoDow(iso);
    let abria = null;
    for (const pl of plazasDe(cfg, dow)) {
      const x = personaDe(staff, pl.p);
      if (!x || !ausenciaEn(x, iso, partirTurno(pl.t).franja) || tiene(patron[dow], pl)) continue;
      if (pl.a) for (const y of patron[dow]) if (y.t === pl.t) delete y.a;
      if (pl.c) for (const y of patron[dow]) if (y.t === pl.t) delete y.c;
      abria = abria || primerosDeLaSemanaTipo(cfg, staff, iso, plazasDe(cfg, dow));
      const i = abria[pl.t] === pl.p ? patron[dow].findIndex(y => y.t === pl.t) : -1;
      patron[dow].splice(i < 0 ? patron[dow].length : i, 0, Object.assign({}, pl));
    }
  }
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

// Un día de la semana tipo como planilla (sin puerta: las plazas tal cual, en su orden, con su cocina y la marca
// «a» como preferencia) para preguntarle a primeroDe quién abriría. Lo usan el visor del cierre y la Cobertura
// en los días sin planilla, y la migración de las «a» (24/09, fase 5, S18: la marca «a» ya no dice sola quién abre)
function diaDeLaSemanaTipo(iso, plazas) {
  const e = { y: +iso.slice(0, 4), m: +iso.slice(5, 7), days: [{ d: +iso.slice(8, 10), iso, dow: isoDow(iso), festivo: false }], asig: { [iso]: {} }, apertura: { [iso]: {} }, manual: { [iso]: {} }, festivos: [], virtual: true };
  for (const pl of plazas || []) (e.asig[iso][pl.t] = e.asig[iso][pl.t] || []).push({ pid: pl.p, cocina: !!pl.c, abre: false, abrePatron: !!pl.a, origen: 'patron' });
  return e;
}
// { tid: pid } de quien abriría cada casilla de ese día con esas plazas (por defecto, las de la semana tipo)
function primerosDeLaSemanaTipo(cfg, staff, iso, plazas) {
  const e = diaDeLaSemanaTipo(iso, plazas || plazasDelDia(cfg, staff, iso).plazas);
  const out = {};
  for (const tid of Object.keys(e.asig[iso])) out[tid] = primeroDe(cfg, staff, e, iso, tid);
  return out;
}
// Migración (una vez, 24/09, fase 5, S18): las «a» de la semana tipo guardada que coinciden con quien abriría
// solo se quitan (eran la foto de lo calculado al guardar: cada «Guardar como semana tipo» congelaba quién
// abría); las que deciden (sin ellas abriría otra persona) se quedan, ya como preferencia. Se mira la semana
// tipo de siempre, sin ausencias, cambios de día libre ni cierres por fechas, en la semana de hoyIso.
function migrarAbrePatron(estado, hoyIso) {
  const r = { quitadas: 0, quedan: 0 };
  if (!estado || !estado.patron || !Array.isArray(estado.staff) || !Array.isArray(estado.locales)) return r;
  estado.migraciones = estado.migraciones || {};
  if (estado.migraciones.abrePatron2409) return r;
  const cfg = Object.assign({}, estado, { cierresPuntuales: [] });
  const staff = estado.staff.map(p => Object.assign({}, p, { ausencias: [], libraPuntual: [] }));
  const lunes = lunesDe(hoyIso);
  for (const [dow, pls] of Object.entries(estado.patron)) {
    const iso = addDias(lunes, +dow - 1), e = diaDeLaSemanaTipo(iso, pls || []);
    for (const pl of pls || []) {
      if (!pl.a) continue;
      if (primeroDe(cfg, staff, e, iso, pl.t, { sinPreferencia: true }) === pl.p) { delete pl.a; r.quitadas++; } else r.quedan++;
    }
  }
  estado.migraciones.abrePatron2409 = 1;
  return r;
}
// Migración (una vez, 24/09, revisión de la fase 5): la planilla ya volcada. El código de antes dejaba «puestos a
// mano» quién abre y quién lleva la cocina de todo lo automático: la «a» y la «c» de la semana tipo, la cocina
// del Generador y de la Cobertura, y todo lo que volcaba el Periodo (240 casillas en octubre). Así, en las
// semanas que ya estaban en la planilla, «Quién abre» del local y «nunca de primero» no cambiaban nada, la
// Revisión decía «sale primero Lola, marcado a mano, y no puede abrir» cuando nadie la había marcado, y cada
// «Guardar como semana tipo» volvía a congelar las «a». Aquí esas marcas pasan a ser lo que son: preferencias de
// lo automático (abrePatron, cocinaAuto) que valen mientras la persona pueda abrir o llevar esa cocina.
// Lo que puso el encargado se queda (principio 4): la marca de una entrada puesta a mano o forzada, la que tiene
// su línea en el historial («Tere abre Pasarela mañana del 6/10», «Jenny lleva la cocina de Bar Mónaco tarde del
// 7/10»), la casilla a la que se le quitó la cocina («Quitar la marca de cocina»: nadie la lleva) y, por si el
// historial ya no llega tan atrás, el «abre» que no es ni el de la semana tipo ni el que saldría solo, y la cocina
// de la semana tipo que no es ni su «c» ni la del orden del local. Va antes que migrarAbrePatron (mira las «a» de
// la semana tipo de antes). Devuelve { abre, cocina, quedan }.
function migrarMarcasAutomaticas(estado, hoyIso) {
  const r = { abre: 0, cocina: 0, quedan: 0 };
  if (!estado || !estado.meses || typeof estado.meses !== 'object' || !Array.isArray(estado.staff) || !Array.isArray(estado.locales)) return r;
  estado.migraciones = estado.migraciones || {};
  if (estado.migraciones.marcasAuto2409) return r;
  const cfg = estado, staff = estado.staff;
  const hist = (Array.isArray(estado.historial) ? estado.historial : []).map(h => String((h && h.txt) || ''));
  const dm = iso => `${+iso.slice(8, 10)}/${+iso.slice(5, 7)}`;
  const loPusoElEncargado = (k, pid, tid, iso) => {
    const { localId, franja } = partirTurno(tid), l = localDe(cfg, localId);
    const nom = nombreDe(staff, pid), ln = l ? l.nombre : localId, fr = (FRANJA_LBL[franja] || franja).toLowerCase();
    const txt = k === 'abre' ? `${nom} abre ${ln} ${fr} del ${dm(iso)}` : `${nom} lleva la cocina de ${ln} ${fr} del ${dm(iso)}`;
    return hist.some(h => h === txt || h.startsWith(txt + ' '));
  };
  for (const k of Object.keys(estado.meses).sort()) {
    if (!/^\d{4}-\d{2}$/.test(k)) continue;
    const est = estadoDesde(estado.meses, estado.festivos || [], +k.slice(0, 4), +k.slice(5, 7));
    for (const [iso, porT] of Object.entries(est.manual || {})) for (const [tid, man] of Object.entries(porT || {})) {
      if (!man || typeof man !== 'object') continue;
      const lista = asignados(est, iso, tid);
      const pl = pid => plazasDe(cfg, isoDow(iso)).find(x => x.t === tid && x.p === pid);
      if (man.abre) {
        const e = lista.find(x => x.abre);
        const solo = !!e && primeroDe(cfg, staff, est, iso, tid, { sinPreferencia: true }) === e.pid;
        const deLaSemanaTipo = !!e && !!(pl(e.pid) || {}).a;
        if (e && esAutomatica(e) && !loPusoElEncargado('abre', e.pid, tid, iso) && (solo || deLaSemanaTipo)) {
          delete man.abre;
          if (!solo) e.abrePatron = true;
          r.abre++;
        } else r.quedan++;
      }
      if (man.cocina) {
        const e = lista.find(x => x.cocina);
        const { localId, franja } = partirTurno(tid), l = localDe(cfg, localId);
        let mejor = null, mejorR = Infinity;
        for (const x of lista) { const rc = l ? rangoCocina(cfg, l, personaDe(staff, x.pid), franja, iso) : -1; if (rc >= 0 && rc < mejorR) { mejorR = rc; mejor = x; } }
        const auto = !!e && (e.origen !== 'patron' || !!(pl(e.pid) || {}).c || mejor === e);
        if (e && esAutomatica(e) && !loPusoElEncargado('cocina', e.pid, tid, iso) && auto) {
          delete man.cocina;
          e.cocinaAuto = true;
          r.cocina++;
        } else r.quedan++;
      }
      if (!Object.keys(man).length) delete porT[tid];
    }
  }
  estado.migraciones.marcasAuto2409 = 1;
  return r;
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
// ---------- una sola puntuación (fase 4, 24/09) ----------
// Quién va primero cuando pueden varios. Hasta ahora había dos puntuaciones: la del relleno del Generador
// (candidatosPara), que restaba 3 por turno DEL MES, y la de la Cobertura (candidatosCobertura), que
// restaba 4 por turno DE ESA SEMANA; cada una con su «cubre a», su cocina y sus apoyos. Ahora los pesos
// están aquí, a la vista, y puntuar() es la única que los aplica; el relleno, la Cobertura, el selector
// y la ★ de Hoy la llaman (con candidatos). La carga es la misma en los dos modos: los turnos de esa
// semana (arquitectura, pieza 3; con la semana entera cuando quien llama la trae: el Generador semanal y
// la Cobertura, desde S8). Lo que distingue a la Cobertura es que sabe quién falta: «cubre a» va delante
// de la puntuación (D2, prioridad) y suma estar libre ese día (no haría partido).
const PESOS = {
  base: 50,
  saleElPrimero: 25,      // buscando quién abre: el fijo del local o de su ficha (abreFijo)
  cocinaMax: 40, cocinaTopeRango: 30,   // cocina: 40 menos su rango (titular 0, 1, 2…; reserva, el tope)
  cubreA: 60,             // «cubre a» en la casilla de quien falta; en la Cobertura, además, va delante (D2)
  apoyoCierre: 45,        // apoya por el cierre de su local «donde haga falta» (D11)
  sinLocalFijo: 30, apoyo: 15,   // lo que es (nada si la casilla se quedaría solo con apoyos, S33)
  localHabitual: 10,
  libre: 20,              // Cobertura: libre ese día (no haría partido)
  turnoSemana: -4,        // la carga: cada turno de esa semana
  // 24/09 (fase 5; decisión del coordinador a la vista del experimento de la revisión de la fase 4): con
  // solo la semana, octubre generado sin semana tipo daba 36 turnos a Victoria y 9 a Juani (desviación del
  // mes 10,87); con la carga del mes, 25 y 13 (9,45). Con semana tipo, y en el plan A de Iván, no cambia nada
  turnoMes: -3,           // y cada turno de ese mes
  evita: -40,             // prefiere no trabajar ese día
  aviso: -25,             // entra con aviso (partido no declarado, «nunca con» flexible, solo apoyos)
  evitado: -1000,         // el plan B busca otra persona si la hay
};
// Lo que suma por lo que es: sin local fijo (comodín) o apoyo. Nada si con ella la casilla se
// quedaría solo con apoyos (S33): ahí no se prefiere a un apoyo.
function puntosPuesto(p, soloApoyos) {
  if (soloApoyos) return null;
  if (esComodin(p)) return { puntos: PESOS.sinLocalFijo, razon: 'sin local fijo' };
  if (p.puesto === 'apoyo') return { puntos: PESOS.apoyo, razon: 'apoyo' };
  return null;
}
// puntuar(ctx, p, iso, tid, opts) → { score, razones, turnosSemana, turnosMes, libre }. opts: { modo: 'relleno' |
// 'cobertura', cubre (a quién cubre en esta casilla, o nada), primero (se busca quién abre; pr: lo que dijo
// puedePrimero, para decir cómo abre), cocina (se
// busca la cocina), solo (con ella la casilla se quedaría solo con apoyos), avisos (los de la puerta),
// evitado (el plan B) }. Las razones van en este orden en los dos modos: abre, cocina, «cubre a», apoyo
// por un cierre, lo que es, su local, libre (Cobertura), la carga, lo que evita y los avisos.
function puntuar(ctx, p, iso, tid, opts) {
  const { cfg, staff, est } = ctx;
  const o = opts || {};
  const { localId, franja } = partirTurno(tid);
  const l = localDe(cfg, localId);
  const dow = isoDow(iso);
  let score = PESOS.base; const razones = [];
  const suma = (pts, razon) => { score += pts; if (razon) razones.push(razon); };
  // quién abre: el fijo suma (abreFijo, con sus interruptores, S19) y la razón dice cómo abre (S32)
  if (o.primero) { if (abreFijo(cfg, l, p, franja)) suma(PESOS.saleElPrimero, 'sale el primero'); if (!abreFijo(cfg, l, p, franja) || (o.pr && (o.pr.partido || o.pr.continuo))) razones.push(razonPrimero(o.pr)); }
  // (revisión F5) quien no puede llevar esa cocina (rango −1) no suma ni lleva la razón: antes, 40 − (−1) = 41
  // puntos de «cocina titular» para Yilian con la regla «Cocina» apagada
  if (o.cocina) { const rc = rangoCocina(cfg, l, p, franja, iso); if (rc >= 0) suma(PESOS.cocinaMax - Math.min(rc, PESOS.cocinaTopeRango), razonCocina(cfg, l, p, rc)); }
  if (o.cubre) suma(PESOS.cubreA, `cubre a ${nombreDe(staff, o.cubre)}`);
  const pc = puntosCierre(cfg, p, iso, tid);   // apoyo por el cierre de su local (D11)
  if (pc) suma(pc.puntos, pc.razon);
  const pp = puntosPuesto(p, !!o.solo);
  if (pp) suma(pp.puntos, pp.razon);
  if ((p.locales || []).length && p.locales[0] === localId) suma(PESOS.localHabitual, `su local habitual es ${l.nombre}`);
  let libre = null;
  if (o.modo === 'cobertura') { libre = !turnosDe(cfg).some(t => pidsEn(est, iso, t.id).includes(p.id)); if (libre) suma(PESOS.libre, 'libre ese día'); else razones.push('ya trabaja ese día (partido)'); }
  const ns = turnosSemanaDe(est, p.id, iso, ctx.meses);
  suma(PESOS.turnoSemana * ns, `${ns} turno${ns === 1 ? '' : 's'} esa semana`);
  const nm = o.delMes ? (o.delMes[p.id] || 0) : turnosMesDe(est, p.id, iso, ctx.meses);   // se lee «N turnos esa semana · M este mes»
  suma(PESOS.turnoMes * nm, `${nm} este mes`);
  if (evita(cfg, p, dow)) suma(PESOS.evita, `prefiere no trabajar ${DOW_PL[dow]}`);
  if ((o.avisos || []).length) { score += PESOS.aviso; razones.push(...o.avisos); }
  if (o.evitado) score += PESOS.evitado;
  return { score, razones, turnosSemana: ns, turnosMes: nm, libre };
}
// Los candidatos de una casilla, ordenados: la puerta (evaluarPlaza) dice quién puede y puntuar() en qué
// orden. opts: { modo: 'relleno' | 'cobertura', faltaPid (la Cobertura: quien falta), puesto: 'sala' |
// 'cocina' (o cocina: true), primero (se busca quién abre), permitirPartido, relajarNuncaCon, soloApoyos
// (el selector: el apoyo que se quedaría solo sale «con aviso»), evitar / excluir: [pids], sinCubre (la
// casilla ya tiene quien cubre a X: el resto entra para llegar al mínimo), soloCubre (solo la designada,
// D13), faltaCocina (X llevaba la cocina ahí), descartes (una lista donde se apunta de quien no sale por
// qué, con el motivo de la puerta) }.
// Devuelve [{ pid, nombre, score, razones, avisos, autorizados, cubre, libre, turnosSemana, turnosMes, n, evitado }].
// El orden: en la Cobertura, (no evitada) → «cubre a» quien falta (D2) → puntos → menos turnos esa semana;
// en el relleno, puntos → menos turnos esa semana («cubre a» es un peso, y solo en la casilla de quien
// falta y para su puesto).
function candidatos(ctx, iso, tid, opts) {
  const { cfg, staff, est } = ctx;
  const o = opts || {};
  const cob = o.modo === 'cobertura';
  // la cocina solo si en esa casilla se busca (seBuscaCocina: con «Cocina» apagada es buscar sala, D5)
  const seBusca = seBuscaCocina(cfg, staff, tid);
  const cocina = (o.puesto === 'cocina' || !!o.cocina) && seBusca;
  const faltaCocina = o.faltaCocina === undefined || o.faltaCocina === null ? o.faltaCocina : !!o.faltaCocina && seBusca;
  const falta = cob ? personaDe(staff, o.faltaPid) : null;
  const descarta = (p, motivo) => { if (o.descartes) o.descartes.push({ pid: p.id, nombre: p.nombre, motivo }); };
  const delMes = turnosDelMes(est, iso, ctx.meses);   // la carga del mes, una sola pasada por casilla
  const out = [];
  for (const p of staff) {
    if (cob && p.id === o.faltaPid) continue;
    if ((o.excluir || []).includes(p.id)) continue;
    // «cubre a» (cubreEnCasilla): en la Cobertura se sabe quién falta y que la casilla es la suya
    const cubre = cob
      ? (falta && !o.sinCubre ? cubreEnCasilla(cfg, staff, est, p, iso, tid, { cocina, falta: o.faltaPid, suCasilla: true, ausente: true, faltaCocina }) : null)
      : cubreEnCasilla(cfg, staff, est, p, iso, tid, { cocina });
    if (o.soloCubre && !cubre) continue;
    const cub = cubre ? (cob ? { cubrePor: cubre, cubreSuCasilla: true, cubreAusente: true } : { cubrePor: cubre }) : {};
    const ev = evaluarPlaza(ctx, iso, tid, p.id, Object.assign({ permitirPartido: !!o.permitirPartido, relajarNuncaCon: !!o.relajarNuncaCon, puesto: cocina ? 'cocina' : 'sala', apoyos: true, relajarApoyos: !cob && !!o.soloApoyos, primero: !!o.primero, corto: true }, cub));
    const r = primerBloqueo(ev);
    if (!r.ok) { descarta(p, r.motivo); continue; }
    const solo = ev.avisos.some(a => a.k === 'soloApoyos');
    const evitado = cob && (o.evitar || []).includes(p.id);
    const pu = puntuar(ctx, p, iso, tid, { modo: o.modo, cubre, primero: !!o.primero, pr: ev.primero, cocina, solo, avisos: r.avisos, evitado, delMes });
    // en el relleno la razón dice también lo autorizado (el partido para cubrir a X); la Cobertura lo pinta aparte
    const razones = cob ? pu.razones : pu.razones.concat(r.autorizados.map(a => a.texto));
    out.push({ pid: p.id, nombre: p.nombre, score: pu.score, razones, avisos: r.avisos, autorizados: r.autorizados, cubre: cubre || null, libre: pu.libre, turnosSemana: pu.turnosSemana, turnosMes: pu.turnosMes, n: pu.turnosSemana, evitado });
  }
  if (cob) out.sort((a, b) => (a.evitado - b.evitado) || (!!b.cubre - !!a.cubre) || b.score - a.score || a.turnosSemana - b.turnosSemana || (a.pid < b.pid ? -1 : 1));
  else out.sort((a, b) => b.score - a.score || a.n - b.n || (a.pid < b.pid ? -1 : 1));
  return out;
}
// El relleno (Generador, selector, ★ de Hoy): candidatos en modo relleno. opts: { cocina, primero,
// permitirPartido, relajarNuncaCon, soloApoyos, meses (la planilla de los otros meses: la carga de la
// semana que cruza de mes, revisión F4) }. Devuelve `cubre` (a quién cubre, para el «por», S11).
function candidatosPara(cfg, staff, est, iso, tid, opts) {
  return candidatos(crearContexto(cfg, staff, est, { meses: opts && opts.meses }), iso, tid, Object.assign({ modo: 'relleno' }, opts));
}
// Por qué no entra nadie en una casilla corta: el primer bloqueo de la puerta con el puesto que se busca
// —sala, o cocina con opts.cocina—, también «dos apoyos no se quedan solos» (revisión F3) y, buscando la
// cocina, quien no lleva la de ese local (fase 4: antes no salía en ningún motivo). Con la misma lectura de
// «cubre a» que el relleno y la Cobertura (D13). opts.falta: quien falta de esta casilla (la Cobertura lo
// sabe); opts.sinCubre: la casilla ya tiene quien cubre a X (el relevo).
function porQueNadie(cfg, staff, est, iso, tid, opts) {
  const o = opts || {};
  const ctx = crearContexto(cfg, staff, est);
  const out = {};
  for (const p of staff) {
    const sab = !!o.falta;
    const cubre = o.sinCubre ? null : cubreEnCasilla(cfg, staff, est, p, iso, tid, { cocina: !!o.cocina, falta: o.falta, suCasilla: sab, ausente: sab });
    const r = primerBloqueo(evaluarPlaza(ctx, iso, tid, p.id, { puesto: o.cocina ? 'cocina' : 'sala', apoyos: true, cubrePor: cubre || undefined, cubreSuCasilla: sab, cubreAusente: sab, corto: true }));
    if (!r.ok) (out[r.motivo] = out[r.motivo] || []).push(p.nombre);
  }
  return out;
}
// ---------- el selector de la casilla y la pista de la hoja impresa: de la misma puerta ----------
// 24/09 (fase 4, S35). Los grupos del selector se hacían en la interfaz (11-selector.js) con otra
// cuenta: quien solo hace cocina salía en «NO PUEDEN» sin regla ni motivo, con el botón «forzar», y en
// una casilla sin cocina no se ofrecía primero a quien la lleva. Ahora los da el modelo, de la puerta y
// de la puntuación: { cocina, pueden, conAviso, noPueden: [{ pid, nombre, motivo, regla, forzable, incumple,
// cocina }], recomendado }.
//  · cocina: si la casilla no tiene cocina y el local la tiene, quien puede llevarla (el puesto de cocina);
//  · pueden: el relleno (la ★ es el primero); conAviso: lo que solo rompe algo relajable (un partido no
//    declarado, dejar la casilla solo con apoyos), primero quien llevaría la cocina que falta;
//  · noPueden: el resto, con lo que la frena: su motivo, la regla (lo que dice «forzar»), si se puede
//    forzar (una ausencia, el local cerrado o estar ya en otro local esa franja, no) y todas las reglas que
//    incumpliría forzada; `cocina`, si se evalúa (y se fuerza) llevando la cocina que falta.
// Cada persona sale una sola vez, en el primer grupo en que cabe; quien ya está en la casilla, en ninguno.
// 24/09 (revisión F4, cliente): en una casilla sin cocina, quien puede llevarla rompiendo solo algo relajable
// (Jenny, titular de la cocina del Mónaco, que ese lunes ya lleva la de la mañana: un partido no declarado)
// sale arriba de «con aviso» marcada de cocina (`cocina: true`) y entra llevándola; y en «no pueden» quien
// lleva esa cocina se evalúa y se fuerza como cocina (antes salía con un motivo de sala, «ya lleva la cocina
// de Bar Mónaco ese día», y «forzar» la ponía de sala: la casilla seguía sin cocina). Cada fila de «no
// pueden» trae además todo lo que incumpliría forzada (`incumple`, siSeFuerza), no solo la primera regla.
// opts.meses: la planilla de los otros meses, para contar la semana entera cuando cruza de mes.
function gruposSelector(cfg, staff, est, iso, tid, opts) {
  const o = opts || {};
  const ctx = crearContexto(cfg, staff, est, { meses: o.meses });
  const { localId, franja } = partirTurno(tid);
  const l = localDe(cfg, localId);
  const dentro = new Set(pidsEn(est, iso, tid));
  const sinCocina = !!l && cocinaExigida(cfg, staff, l, franja) && turnoAbierto(cfg, est, iso, tid) && !asignados(est, iso, tid).some(e => e.cocina);
  const deCocina = c => Object.assign(c, { cocina: true });
  const cocina = sinCocina ? candidatos(ctx, iso, tid, { modo: 'relleno', cocina: true }).map(deCocina) : [];
  const ya = new Set(cocina.map(c => c.pid));
  const pueden = candidatos(ctx, iso, tid, { modo: 'relleno' }).filter(c => !ya.has(c.pid));
  for (const c of pueden) ya.add(c.pid);
  const conAvisoCocina = sinCocina ? candidatos(ctx, iso, tid, { modo: 'relleno', cocina: true, permitirPartido: true }).filter(c => !ya.has(c.pid)).map(deCocina) : [];
  for (const c of conAvisoCocina) ya.add(c.pid);
  const conAvisoSala = candidatos(ctx, iso, tid, { modo: 'relleno', permitirPartido: true, soloApoyos: true }).filter(c => !ya.has(c.pid));
  for (const c of conAvisoSala) ya.add(c.pid);
  const conAviso = conAvisoCocina.concat(conAvisoSala);
  const noPueden = [];
  for (const p of staff) {
    if (ya.has(p.id) || dentro.has(p.id)) continue;
    const comoCocina = sinCocina && puedeCocina(cfg, p, localId, iso);
    const f = siSeFuerza(cfg, staff, est, iso, tid, p.id, Object.assign({ permitirPartido: true }, comoCocina ? { puesto: 'cocina', cocina: true } : { puesto: 'sala' }));
    noPueden.push({ pid: p.id, nombre: p.nombre, motivo: f.motivo || 'no sale entre los candidatos', regla: f.regla, forzable: f.forzable, incumple: f.incumple, cocina: !!comoCocina });
  }
  // la ★: la primera de la cocina si la casilla no la tiene; si no, la primera de «pueden» (la usan el
  // selector y la ★ de un toque de Hoy, que ponen igual: ponerRecomendadoUI)
  return { cocina, pueden, conAviso, noPueden, recomendado: cocina[0] || pueden[0] || null };
}
// Cómo se dice un bloqueo en la hoja impresa, detrás de «Nombre, que …»
function fraseBloqueo(b, p) {
  const sinNombre = m => (p && m.startsWith(p.nombre + ' ') ? m.slice(p.nombre.length + 1) : m);
  switch (b.k) {
    case 'locales': return b.motivo.replace(/^solo /, 'solo trabaja en ');
    case 'franjas': return p && (p.franjas || []).length === 1 ? (p.franjas[0] === 'M' ? 'solo hace mañanas' : 'solo hace tardes') : 'no hace esa franja';
    case 'nuncaCon': return b.motivo.replace(/^nunca con /, 'no coincide con ');
    case 'standby': return 'está en standby';   // (revisión F4) en la lista «Nombre, que …; …», sin dos puntos
    case 'cierre': return 'está ' + b.motivo;
    case 'soloApoyos': return 'dejaría la casilla solo con apoyos';
    case 'primeroCompleto': return 'viene de hacer la mañana y el primero de la tarde hace turno completo';
    default: return sinNombre(b.motivo);
  }
}
// 24/09 (fase 4, S41). La pista «se destraparía si se levantara una sola condición» de la hoja impresa.
// pxgDestrapa (14-impresiones.js) era una tercera copia de las reglas: sin el standby, con p.libra y no
// con el día libre de esa semana, los vetos sin su día, el partido sin trasladar y sin la cocina de la
// sala; proponía a Dulce levantar «no sale primero» cuando además está en standby, y a Mari Luz «no hace
// mañanas en Pasarela» un martes (su veto es de los lunes). Ahora sale de la puerta: se destrapa solo si
// hay EXACTAMENTE un bloqueo y se puede forzar (una ausencia o estar ya en otro local esa franja no son
// condiciones que se levanten). opts.primero: el hueco es la 1.ª posición (entonces cuenta si puede
// abrir; de quien ya está en la casilla, solo eso). Devuelve { pid, nombre, regla, motivo, frase } o null.
function destrapa(cfg, staff, est, iso, tid, pid, opts) {
  const o = opts || {};
  const p = personaDe(staff, pid);
  if (!p) return null;
  const dentro = pidsEn(est, iso, tid).includes(pid);
  if (dentro && !o.primero) return null;
  // (fase 5, S37) opts.cocina: el hueco es la cocina obligatoria; se mira quién la llevaría
  const ev = evaluarPlaza(crearContexto(cfg, staff, est), iso, tid, pid, o.cocina ? { puesto: 'cocina', yaDentro: dentro } : { puesto: 'sala', apoyos: true, primero: !!o.primero, yaDentro: dentro });
  const bl = dentro ? ev.bloqueos.filter(b => b.primero) : ev.bloqueos;
  if (bl.length !== 1 || !bl[0].forzable) return null;
  return { pid, nombre: p.nombre, regla: bl[0].k, motivo: bl[0].motivo, frase: fraseBloqueo(bl[0], p) };
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
// ¿Esta entrada «por X» está ahí SOLO por la designación «cubre a»? (24/09, D13) Lo nuevo lleva la marca
// `porDesignacion` (la semana tipo, el relleno, la Cobertura y la ausencia apuntada en Equipo la ponen
// cuando quien entra es la persona designada). Lo guardado antes no la lleva, pero se sabe: el relleno
// solo pone «por» por la designación, y la semana tipo también, salvo en su plaza fija con «por» (D12:
// Lavinia «por Mari Luz» los miércoles es un dato de la plaza). En lo que puso la Cobertura sin la marca no
// se sabe si fue la designación o la elección del encargado: no se toca. El relevo (D3) va aparte: es su plaza.
function porDesignacionDe(cfg, staff, iso, tid, e) {
  if (!e || e.relevo) return false;
  const x = porDe(staff, e);
  if (!x) return false;
  if (e.porDesignacion || e.origen === 'generador') return true;
  if (e.origen === 'patron') return !plazasDelDia(cfg, staff, iso).plazas.some(pl => pl.t === tid && pl.p === e.pid && pl.por === x);
  return false;
}
// ¿Sigue cubriendo a X en esa casilla? La misma lectura (cubreEnCasilla), con cualquiera de los dos puestos:
// al recalcular la casilla, la cocina puede pasar de una entrada a otra sin que cambie a quién cubre
function sigueCubriendo(cfg, staff, est, iso, tid, e, xid) {
  const q = personaDe(staff, e.pid);
  return [false, true].some(coc => cubreEnCasilla(cfg, staff, est, q, iso, tid, { cocina: coc, falta: xid, suCasilla: porDeSuCasilla(e) }) === xid);
}
function motivoRetirada(cfg, staff, est, iso, tid, e) {
  const dow = isoDow(iso);
  // 24/09 (D11): lo automático que se ha quedado dentro de una casilla cerrada (por fechas o por
  // «Cuándo abre»), y lo de quien no trabaja esos días por el cierre de su local
  if (!turnoAbierto(cfg, est, iso, tid)) return motivoCerrado(cfg, iso, tid).motivo;
  const dc = decisionCierre(cfg, e.pid, iso, partirTurno(tid).franja);
  if (dc && dc.tipo !== 'REFUERZA') return motivoSinTrabajo(cfg, dc.cierre);
  const p = personaDe(staff, e.pid);
  const franja = partirTurno(tid).franja;
  if (p && activa(cfg, p, 'libra') && libraEn(p, iso)) return motivoLibra(p, iso);
  // 24/09 (D13, principio 4): quien está ausente esa franja no sigue en su plaza automática. Una ausencia
  // apuntada por otro camino que no la quitó de la planilla (otro usuario, datos de antes) dejaba a Iván
  // de vacaciones en su tarde y el Generador ponía además a Mari Luz «por Iván» en la misma casilla
  const aus = p ? ausenciaEn(p, iso, franja) : null;
  if (aus) return motivoAusencia(aus);
  // el relevo (D3) está en SU plaza: cuando la persona a la que cubría vuelve, solo pierde el «por»
  // (desmarcarRelevos), no la plaza
  if (e.relevo) return null;
  const x = personaDe(staff, porDe(staff, e));
  if (!x) return null;
  const c = cambioDeLibre(cfg, x, iso);
  // 24/09 (D13: «hasta nueva orden»): lo que puso la designación «cubre a» —y nada más la mantiene ahí—
  // sobra cuando ya no aplica en esa casilla: se quitó la designación, se apagó «Cubre a», o quien faltaba
  // ya no falta. Lo puesto a mano o forzado no (esAutomatica), ni la plaza fija de la semana tipo con su
  // «por» (D12), ni lo que eligió el encargado en la Cobertura sin designación.
  const deDesignacion = porDesignacionDe(cfg, staff, iso, tid, e);
  if (ausenciaEn(x, iso, franja) || (c && c.nuevos.includes(dow)))
    return deDesignacion && !sigueCubriendo(cfg, staff, est, iso, tid, e, x.id) ? `${nombreDe(staff, e.pid)} ya no cubre a ${x.nombre}` : null;
  if (c && c.pares.some(y => y[1] === dow)) return `${x.nombre} trabaja ${textoDiasEl([dow])} esta semana: ya no hay que cubrir su día libre`;
  // 24/09 (revisión: «quitar el cambio no lo devuelve todo a su sitio»): la cobertura que puso la
  // semana tipo («cubre a X» el día que X libraba o faltaba) sobra cuando X ya no libra ni falta
  // ese día y la semana tipo no la tiene como plaza fija. Solo lo de la semana tipo: una cobertura
  // aplicada desde la Cobertura tiene su propia vuelta atrás (quitar la ausencia).
  if (e.origen === 'patron' && !(activa(cfg, x, 'libra') && libraEn(x, iso)) && !plazasDelDia(cfg, staff, iso).plazas.some(pl => pl.t === tid && pl.p === e.pid && pl.por === x.id))
    return `${x.nombre} trabaja ${textoDiasEl([dow])}: ya no hay que cubrir su sitio`;
  // lo del relleno o de la designación en la Cobertura / Equipo, cuando quien faltaba ya no falta (D13)
  if (deDesignacion && !sigueCubriendo(cfg, staff, est, iso, tid, e, x.id)) return `${x.nombre} ya no falta el ${diaYNum(iso)}: ya no hay que cubrir su sitio`;
  return null;
}
// Quita una entrada de su casilla. Si llevaba la cocina o abría fijada a mano, la marca se va con ella: al
// irse, la casilla la recalcula con quien queda en vez de quedarse sin cocina (24/09, revisión: Adrián
// cambiaba de día y Zapatillera se quedaba sin cocina el martes; desde la revisión de la fase 5 lo automático
// ya no se fija a mano, pero lo que trae la planilla de antes o puso el encargado, sí). Lo usan la retirada automática
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
    // (fase 5, S18) el «abre» solo si en la vista previa estaba puesto a mano; la marca «a» de la semana tipo, como preferencia
    const abreMano = !!(entry.abre && pv && manualDe(pv, a.iso, a.turnoId).abre);
    const res = asignar(e, cfg, staff, a.iso, a.turnoId, a.pid, { origen: a.origen, razon: a.razon, supuesto: !!a.supuesto || !!entry.supuesto, permitirPartido: true, cocina: entry.cocina ? true : undefined, abre: abreMano ? true : undefined, abrePatron: !!entry.abrePatron, por: rel ? undefined : (entry.por || a.por), porDesignacion: !rel && !!entry.porDesignacion, nota: entry.nota });
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
// propuesto para la vista previa. opts.meses (revisión F4): la planilla de los otros meses, para que la
// carga («N turnos esa semana») cuente la semana entera cuando cruza de mes (Generador → Periodo).
function generarPlanilla(cfg, staff, est, desde, hasta, opts) {
  const o = opts || {};
  const ms = o.meses ? { meses: o.meses } : {};
  const target = o.simular ? clonarEstado(est) : est;
  const r = { aplicados: [], huecos: [], coberturas: [], rechazados: [], retirados: [], avisos: [], estado: target };
  if (!o.sinRetirar) r.retirados = retirarQueIncumplen(cfg, staff, target, desde, hasta, { desdeIso: o.desdeIso });
  // (revisión de la fase 5) quién abre y la cocina de lo que ya estaba, con la configuración de ahora
  r.marcas = refrescarCasillas(cfg, staff, target, o.desdeIso && o.desdeIso > desde ? o.desdeIso : desde, hasta);
  if (!o.sinPatron) {
    const p = instanciarPatron(cfg, staff, target, desde, hasta, { desdeIso: o.desdeIso, meses: o.meses });
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
    pendientes.sort((a, b) => candidatosPara(cfg, staff, target, iso, a.t.id, ms).length - candidatosPara(cfg, staff, target, iso, b.t.id, ms).length);
    // 24/09 (revisión de la fase 5): una cocina que no es obligatoria no se lleva a quien hace falta para una
    // obligatoria de ese día que aún no la tiene, si hay otra persona que pueda llevarla. Con la carga del mes,
    // el miércoles 21/10 Hojan se llevaba la cocina de la mañana de El 33 y la tarde del Mónaco, que es
    // obligatoria, se quedaba sin nadie que pudiera llevarla (antes de la carga del mes no pasaba)
    const paraObligatorias = tid => {
      const out = new Set();
      for (const t2 of abiertos) {
        if (t2.id === tid) continue;
        const r2 = revisarTurno(cfg, staff, target, iso, t2.id);
        if (r2.sinCocina && r2.cocinaObligatoria) for (const c2 of candidatosPara(cfg, staff, target, iso, t2.id, Object.assign({ cocina: true, permitirPartido: !!o.permitirPartido }, ms))) out.add(c2.pid);
      }
      return out;
    };
    for (const { t } of pendientes) {
      let rev = revisarTurno(cfg, staff, target, iso, t.id);
      if (rev.sinCocina && (rev.cocinaObligatoria || rev.faltan)) {
        const cs = candidatosPara(cfg, staff, target, iso, t.id, Object.assign({ cocina: true, permitirPartido: !!o.permitirPartido }, ms));
        let c = cs[0];
        if (c && !rev.cocinaObligatoria) { const guarda = paraObligatorias(t.id); if (guarda.has(c.pid)) c = cs.find(x => !guarda.has(x.pid)) || c; }
        if (c) {
          const a = asignar(target, cfg, staff, iso, t.id, c.pid, { origen: 'generador', razon: c.razones.join(' · '), cocina: true, permitirPartido: !!o.permitirPartido, puesto: 'cocina', por: c.cubre || undefined, porDesignacion: !!c.cubre, cubrePor: c.cubre || undefined });
          if (a.ok) r.aplicados.push({ iso, turnoId: t.id, pid: c.pid, origen: 'generador', razon: a.entry.razon, avisos: a.avisos });
        }
      }
      rev = revisarTurno(cfg, staff, target, iso, t.id);
      while (rev.faltan > 0) {
        const c = candidatosPara(cfg, staff, target, iso, t.id, Object.assign({ permitirPartido: !!o.permitirPartido }, ms))[0];
        if (!c) { r.huecos.push({ iso, turnoId: t.id, faltan: rev.faltan, minimo: rev.minimo, supuesto: rev.supuesto, porQueNadie: porQueNadie(cfg, staff, target, iso, t.id) }); break; }
        const a = asignar(target, cfg, staff, iso, t.id, c.pid, { origen: 'generador', razon: c.razones.join(' · '), permitirPartido: !!o.permitirPartido, puesto: 'sala', por: c.cubre || undefined, porDesignacion: !!c.cubre, cubrePor: c.cubre || undefined });
        if (!a.ok) { r.huecos.push({ iso, turnoId: t.id, faltan: rev.faltan, minimo: rev.minimo, supuesto: rev.supuesto, porQueNadie: porQueNadie(cfg, staff, target, iso, t.id) }); break; }
        r.aplicados.push({ iso, turnoId: t.id, pid: c.pid, origen: 'generador', razon: a.entry.razon, avisos: a.avisos });
        rev = revisarTurno(cfg, staff, target, iso, t.id);
      }
      // 24/09 (fase 5, S37): una cocina obligatoria que nadie puede llevar es un hueco, con su porqué. Antes el
      // Periodo no la contaba entre las casillas cortas y la Semana no la listaba en «Huecos» (solo la
      // condición ✗), mientras la Revisión la daba en rojo y la Cobertura sí la contaba como hueco
      if (rev.sinCocina && rev.cocinaObligatoria) r.huecos.push({ iso, turnoId: t.id, tipo: 'cocina', faltan: 0, minimo: rev.minimo, supuesto: rev.supuesto, motivo: 'sin cocina (obligatoria)', porQueNadie: porQueNadie(cfg, staff, target, iso, t.id, { cocina: true }) });
    }
    // el primero de cada casilla hace turno completo: si nadie de los puestos puede abrir se
    // busca a alguien que pueda; si no lo hay, la 1.ª posición queda como hueco disponible
    for (const t of abiertos) {
      if (!asignados(target, iso, t.id).length || primeroDe(cfg, staff, target, iso, t.id)) continue;
      const c = candidatosPara(cfg, staff, target, iso, t.id, Object.assign({ primero: true, permitirPartido: !!o.permitirPartido }, ms))[0];
      if (c) {
        const a = asignar(target, cfg, staff, iso, t.id, c.pid, { origen: 'generador', razon: c.razones.join(' · '), permitirPartido: !!o.permitirPartido, puesto: 'sala', por: c.cubre || undefined, porDesignacion: !!c.cubre, cubrePor: c.cubre || undefined });
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
  if (!l.cocina || !(localTieneCocina(l, 'M', cfg, cfg.staff) || localTieneCocina(l, 'T', cfg, cfg.staff))) return 'sin cocina propia';
  const ob = l.cocina.obligatoria || {};
  const pos = posTxt('M') === posTxt('T') ? `cocina en ${posTxt('M')} posición` : `cocina ${posTxt('M')} por la mañana · ${posTxt('T')} por la tarde`;
  return (ob.M && ob.T ? 'cocina obligatoria mañana y tarde · ' : '') + pos;
}
// ---------- el registro de las variables: quién lee cada campo de la ficha y del local ----------
// 24/09 (fase 4; Diego: «que lea todas las variables»). Cada campo que se configura en Equipo (la ficha
// de cada persona y los Ajustes de cada local) está aquí, con:
//  · clave: su interruptor (la regla del grupo y la característica de la ficha, activa()); null si no
//    se puede apagar (una ausencia, el standby, el horario del local);
//  · trato: 'forzable' (la puerta dice que no; el encargado puede forzarlo y queda el aviso), 'duro' (no
//    se fuerza nunca: una ausencia, el local cerrado), 'relajable' (no, salvo que se relaje: el partido no
//    declarado, el «nunca con» flexible, dos apoyos solos), 'punt' (solo ordena: «cubre a», lo que
//    prefiere, sale el primero) o 'info' (no decide quién va dónde: el contrato, los horarios);
//  · texto(ctx, x): las condiciones que enseña el Generador (una por veto, por pareja, por designación…);
//  · verificar(ctx, x, iso, mis, c): lo que comprueba el Generador en la planilla de ese día, con el MISMO
//    helper con el que la puerta la aplica (libraEn, partidoEn, vetoDe, incompatibles, puedeCocina…).
// condicionesDe y verificarSemana salen de aquí: el Generador enseña justo lo que se aplica. La prueba
// tests/contrato-variables.test.mjs comprueba que toda clave de la ficha y del local está aquí o en
// SOLO_TEXTO y recorre cada variable por todos los caminos.
const diaV = iso => `${DOW_LBL[isoDow(iso)]} ${+iso.slice(8, 10)}`;
const laPrimera = p => (/a$/.test(p.nombre.split(' ')[0]) ? 'la primera' : 'el primero');
// de baja los siete días de la semana que se genera (ctx.lunes): sus condiciones no se listan
// «en la posición 2»: sin género (revisión F5: «Lola sale la primera … — lunes 28: sale 2.º»)
const enPosicion = n => `en la posición ${n}`;
const deBajaLaSemana = (ctx, p) => !!ctx.lunes && [0, 1, 2, 3, 4, 5, 6].every(k => deBaja(p, addDias(ctx.lunes, k)));
const nombreLocalV = (cfg, id) => (localDe(cfg, id) || { nombre: id }).nombre;
const fallos = xs => ({ fallos: xs, notas: [] });
const VARIABLES = [
  // ----- la persona -----
  { campo: 'locales', clave: 'locales', trato: 'forzable', lbl: 'Locales donde trabaja',
    texto: (ctx, p) => (p.locales || []).length ? [{ id: `p:${p.id}:locales`, texto: `${p.nombre}: ${p.locales.length === 1 ? 'solo en ' : ''}${lblLocales(ctx.cfg, p.locales)}`, k: 'locales' }] : [],
    // el apoyo por un cierre no rompe sus locales (D11)
    verificar: (ctx, p, iso, mis) => fallos(mis.filter(t => !p.locales.includes(t.local.id) && !apoyoPorCierre(ctx.cfg, p.id, iso, t.franja)).map(t => `${diaV(iso)}: en ${t.local.nombre}`)) },
  { campo: 'franjas', clave: 'franjas', trato: 'forzable', lbl: 'Mañanas y tardes',
    texto: (ctx, p) => (p.franjas || []).length === 1 ? [{ id: `p:${p.id}:franjas`, texto: `${p.nombre} solo hace ${p.franjas[0] === 'M' ? 'mañanas' : 'tardes'}`, k: 'franjas' }] : [],
    verificar: (ctx, p, iso, mis) => fallos(mis.filter(t => !p.franjas.includes(t.franja)).map(t => `${diaV(iso)}: ${FRANJA_LBL[t.franja].toLowerCase()}`)) },
  // el día libre de ESA semana (libraEn): «libra el martes esta semana (en vez de los miércoles)»
  { campo: 'libra', clave: 'libra', trato: 'forzable', lbl: 'Días que libra',
    texto: (ctx, p) => {
      const lp = ctx.lunes ? libraPuntualDe(p, ctx.lunes) : null;
      if (lp) return [{ id: `p:${p.id}:libra`, texto: `${p.nombre} libra ${textoDiasEl(lp.dias)} esta semana${(p.libra || []).length ? ` (en vez de ${textoDiasPl(p.libra)})` : ''}`, k: 'libra', puntual: true }];
      return (p.libra || []).length ? [{ id: `p:${p.id}:libra`, texto: `${p.nombre} libra ${textoDiasPl(p.libra)}${p.libreVariable ? ' (día libre variable)' : ''}`, k: 'libra' }] : [];
    },
    verificar: (ctx, p, iso, mis) => fallos(mis.length && libraEn(p, iso) ? [`${diaV(iso)}: trabaja`] : []) },
  { campo: 'libraPuntual', clave: 'libra', trato: 'forzable', lbl: 'Esta semana libra otro día', condicion: 'libra' },
  // el partido (partidoEn): los días declarados, con el partido trasladado la semana de un cambio de día libre
  { campo: 'partido.dias', clave: 'partido', trato: 'relajable', lbl: 'Días de partido',
    texto: (ctx, p) => {
      const pd = p.partido || {};
      if (!pd.siempre && !(pd.dias || []).length) return [];
      const cl = ctx.lunes && !pd.siempre ? cambioDeLibre(ctx.cfg, p, ctx.lunes) : null;
      const mov = cl ? cl.pares.filter(x => (pd.dias || []).includes(x[0])) : [];
      return [{ id: `p:${p.id}:partido`, texto: `${p.nombre} hace partido ${pd.siempre ? 'siempre' : 'los ' + pd.dias.map(d => DOW_PL[d].replace('los ', '')).join(', ')}${mov.length ? ` (esta semana, ${mov.map(x => `el del ${DOW_LBL[x[0]]} pasa al ${DOW_LBL[x[1]]}`).join(' y ')})` : ''}`, k: 'partido' }];
    },
    verificar: (ctx, p, iso, mis) => {
      const r = { fallos: [], notas: [] };
      if (!(mis.some(t => t.franja === 'M') && mis.some(t => t.franja === 'T') && !partidoEn(ctx.cfg, p, iso))) return r;
      // D1 (fase 3): el partido para cubrir a quien falta, en su casilla, está autorizado: cumplido, con nota
      const aut = mis.map(t => revisarEntrada(ctx.cfg, ctx.staff, ctx.est, iso, t.id, p.id).autorizados).flat().find(a => a.k === 'partido');
      if (aut) r.notas.push(`${diaV(iso)}: ${aut.texto}`); else r.fallos.push(`${diaV(iso)}: partido no declarado`);
      return r;
    } },
  { campo: 'partido.siempre', clave: 'partido', trato: 'relajable', lbl: 'Partido cualquier día', condicion: 'partido.dias' },
  // una condición por veto, con su día (vetoDe)
  { campo: 'vetos', clave: 'vetos', trato: 'forzable', lbl: 'No hace (local y franja)',
    texto: (ctx, p) => (p.vetos || []).map(v => ({ id: `p:${p.id}:veto:${v.localId}:${v.franja}`, texto: `${p.nombre} ${textoVeto(v, nombreLocalV(ctx.cfg, v.localId))}`, k: 'vetos' })),
    verificar: (ctx, p, iso, mis) => fallos(mis.filter(t => vetoDe(p, t.local.id, t.franja, isoDow(iso))).map(t => `${diaV(iso)}: ${t.local.nombre} ${FRANJA_LBL[t.franja].toLowerCase()}`)) },
  // una condición por pareja (la tenga quien la tenga, una sola vez)
  { campo: 'nuncaCon', clave: 'nuncaCon', trato: 'forzable', lbl: '«Nunca con»',
    texto: (ctx, p) => (p.nuncaCon || []).filter(q => { const key = [p.id, q].sort().join('|'); if (ctx.parejas.has(key)) return false; ctx.parejas.add(key); return true; })
      .map(q => ({ id: `p:${p.id}:nuncaCon:${q}`, texto: `${p.nombre} y ${nombreDe(ctx.staff, q)} no coinciden`, k: 'nuncaCon', otro: q })),
    verificar: (ctx, p, iso, mis, c) => fallos(mis.filter(t => pidsEn(ctx.est, iso, t.id).includes(c.otro)).map(t => `${diaV(iso)}: juntos en ${t.local.nombre}`)) },
  { campo: 'nuncaConFlexible', clave: 'nuncaCon', trato: 'relajable', lbl: '«Nunca con» flexible', condicion: 'nuncaCon' },
  // «cubre a» (D13): informativa, prioridad en el sitio de quien falta
  { campo: 'cubreA', clave: 'cubreA', trato: 'punt', lbl: 'Cubre a',
    texto: (ctx, p) => (p.cubreA || []).map(c => ({ id: `p:${p.id}:cubre:${c.pid}:${c.dow || ''}`, texto: `${p.nombre} cubre a ${nombreDe(ctx.staff, c.pid)}${lugarCubre(ctx.cfg, c) ? ' ' + lugarCubre(ctx.cfg, c) : ''}`, k: 'cubreA', informativa: true })) },
  // la cocina de la ficha (puedeCocina). El interruptor «Cocina» de la ficha apaga estos límites (fase 5, S15)
  { campo: 'cocina.soloDias', clave: 'cocina', trato: 'forzable', lbl: 'Cocina solo unos días',
    texto: (ctx, p) => {
      const c = p.cocina || {};
      if (c.nunca) return [{ id: `p:${p.id}:cocina`, texto: `${p.nombre} nunca está en cocina`, k: 'cocina' }];
      return (c.soloDias || []).length ? [{ id: `p:${p.id}:cocina`, texto: `${p.nombre} lleva la cocina solo ${c.soloDias.map(d => DOW_PL[d]).join(' y ')}`, k: 'cocina' }] : [];
    },
    verificar: (ctx, p, iso, mis) => fallos(mis.filter(t => { const e = asignados(ctx.est, iso, t.id).find(x => x.pid === p.id); return e && e.cocina && !puedeCocina(ctx.cfg, p, t.local.id, iso); }).map(t => `${diaV(iso)}: lleva la cocina en ${t.local.nombre}`)) },
  { campo: 'cocina.nunca', clave: 'cocina', trato: 'forzable', lbl: 'Nunca en cocina', condicion: 'cocina.soloDias' },
  { campo: 'cocina.titular', clave: 'cocina', trato: 'forzable', lbl: 'Cocina titular' },
  { campo: 'cocina.reserva', clave: 'cocina', trato: 'forzable', lbl: 'Cocina de reserva' },
  // (revisión F4, cliente) la puerta no la pone de sala (S34); el Generador lo enseña y lo comprueba: «Hojan
  // solo hace cocina» era una regla que se aplicaba sin salir en las condiciones
  { campo: 'soloCocina', clave: 'cocina', trato: 'forzable', lbl: 'Solo hace cocina',
    texto: (ctx, p) => p.soloCocina ? [{ id: `p:${p.id}:soloCocina`, texto: `${p.nombre} solo hace cocina: no refuerza la sala`, k: 'soloCocina' }] : [],
    verificar: (ctx, p, iso, mis) => fallos(mis.filter(t => { const e = asignados(ctx.est, iso, t.id).find(x => x.pid === p.id); return e && !e.cocina; }).map(t => `${diaV(iso)}: de sala en ${t.local.nombre} ${FRANJA_LBL[t.franja].toLowerCase()}`)) },
  // quién sale el primero (fase 5: S18 y S19). Los días que abre quien el local tiene en «Quién abre» (va
  // antes que la ficha, primeroDe), la de la ficha no se rompe: se anota
  { campo: 'abre', clave: 'abre', trato: 'punt', lbl: 'Sale el primero',
    texto: (ctx, p) => Object.entries(p.abre || {}).flatMap(([lid, fs]) => fs.map(f => ({ id: `p:${p.id}:abre:${lid}:${f}`, texto: `${p.nombre} sale ${laPrimera(p)} en ${nombreLocalV(ctx.cfg, lid)} por la ${FRANJA_LBL[f].toLowerCase()}`, k: 'abre', localId: lid, franja: f }))),
    verificar: (ctx, p, iso, mis, c) => {
      const tid = turnoId(c.localId, c.franja); if (!pidsEn(ctx.est, iso, tid).includes(p.id)) return fallos([]);
      const sl = ctx.slots(iso, tid), s = sl.find(x => x.pid === p.id);
      if (!s || s.pos === 1) return fallos([]);
      const l = localDe(ctx.cfg, c.localId), dl = l && l.primero && l.primero[c.franja];
      if (dl && dl !== p.id && sl[0] && sl[0].pid === dl && abreFijo(ctx.cfg, l, personaDe(ctx.staff, dl), c.franja)) return { fallos: [], notas: [`${diaV(iso)}: abre ${nombreDe(ctx.staff, dl)} («Quién abre» de ${l.nombre})`] };
      return fallos([`${diaV(iso)}: ${enPosicion(s.pos)}`]);
    } },
  { campo: 'noAbre', clave: 'noAbre', trato: 'forzable', lbl: 'No abre',
    texto: (ctx, p) => (p.noAbre || []).map(lid => ({ id: `p:${p.id}:noAbre:${lid}`, texto: `${p.nombre} no abre ${nombreLocalV(ctx.cfg, lid)}`, k: 'noAbre', localId: lid })),
    verificar: (ctx, p, iso, mis, c) => { const t = mis.find(x => x.local.id === c.localId); if (!t) return fallos([]); const s = ctx.slots(iso, t.id).find(x => x.pid === p.id); return fallos(s && s.pos === 1 ? [`${diaV(iso)}: abre ${t.local.nombre}`] : []); } },
  { campo: 'noPrimero', clave: 'noPrimero', trato: 'forzable', lbl: 'Nunca de primero',
    texto: (ctx, p) => (p.noPrimero || []).length ? [{ id: `p:${p.id}:noPrimero`, texto: `${p.nombre} no sale nunca ${p.noPrimero.length === 2 ? 'el primero, ni de mañana ni de tarde' : p.noPrimero[0] === 'T' ? 'el primero de la tarde (no hace la tarde completa)' : 'el primero de la mañana'}`, k: 'noPrimero', nueva: true }] : [],
    verificar: (ctx, p, iso, mis) => fallos(mis.filter(t => p.noPrimero.includes(t.franja)).filter(t => { const s = ctx.slots(iso, t.id).find(x => x.pid === p.id); return s && s.pos === 1; }).map(t => `${diaV(iso)}: primero en ${t.local.nombre} ${FRANJA_LBL[t.franja].toLowerCase()}`)) },
  // sin condición propia: la puerta las aplica y la Revisión las avisa
  { campo: 'ausencias', clave: null, trato: 'duro', lbl: 'Ausencias (por franja, D10)' },
  // (revisión F4, cliente) el standby de Dulce: sus otras condiciones salían como si estuviera activa
  { campo: 'standby', clave: null, trato: 'forzable', lbl: 'En standby',
    texto: (ctx, p) => p.standby ? [{ id: `p:${p.id}:standby`, texto: `${p.nombre} está en standby: aún no entra en la planilla`, k: 'standby' }] : [],
    verificar: (ctx, p, iso, mis) => fallos(mis.map(t => `${diaV(iso)}: en ${t.local.nombre} ${FRANJA_LBL[t.franja].toLowerCase()}`)) },
  { campo: 'puesto', clave: null, trato: 'relajable', lbl: 'Puesto (dos apoyos no se quedan solos; el apoyo suma)' },
  { campo: 'comodin', clave: null, trato: 'punt', lbl: 'Sin local fijo (fase 6, D7: pasa a ser «sin locales»)' },
  { campo: 'prefs.evitaDows', clave: 'prefs', trato: 'punt', lbl: 'Prefiere no trabajar' },
  { campo: 'contrato.horasSemana', clave: 'contrato', trato: 'info', lbl: 'Contrato (lo compara Horas)' },
  // ----- el local (Ajustes de los locales) -----
  { campo: 'local.minimos', ambito: 'local', clave: 'minimos', trato: 'duro', lbl: 'Mínimos por local, franja y día',
    texto: (ctx, l) => FRANJAS.map(f => ({ f, r: resumenMinimos(l, f) })).filter(x => x.r).map(({ f, r }) => ({ id: `min:${l.id}:${f}`, texto: `${l.nombre} por la ${FRANJA_LBL[f].toLowerCase()}: ${r}`, tipo: 'minimos', localId: l.id, franja: f })),
    verificar: (ctx, l, iso, mis, c) => { const tid = turnoId(c.localId, c.franja); if (!turnoAbierto(ctx.cfg, ctx.est, iso, tid)) return fallos([]); const r = revisarTurno(ctx.cfg, ctx.staff, ctx.est, iso, tid); return fallos(r.faltan ? [`${diaV(iso)}: ${r.n} de ${r.minimo}`] : []); } },
  { campo: 'local.supuestos', ambito: 'local', clave: null, trato: 'info', lbl: 'Mínimo supuesto (el nivel del aviso)' },
  { campo: 'local.abre', ambito: 'local', clave: null, trato: 'duro', lbl: 'Cuándo abre (todas las semanas)' },
  // 24/09 (fase 5, S36): nombra solo a quien puede llevarla (puedeCocina, sin mirar el día): antes anunciaba a
  // quien estaba en la lista del local aunque nadie le diera nunca la cocina
  { campo: 'local.cocina.titulares', ambito: 'local', clave: 'cocina', trato: 'forzable', lbl: 'Cocina del local: quién la lleva',
    texto: (ctx, l) => {
      if (!(localTieneCocina(l, 'M', ctx.cfg, ctx.staff) || localTieneCocina(l, 'T', ctx.cfg, ctx.staff))) return [];
      const nom = id => nombreDe(ctx.staff, id);
      const puede = id => puedeCocina(ctx.cfg, personaDe(ctx.staff, id), l.id, null);
      const tit = [...new Set([...(l.cocina.titulares.M || []), ...(l.cocina.titulares.T || [])])].filter(puede).map(nom);
      const res = (l.cocina.reservas || []).filter(puede).filter(id => !tit.includes(nom(id))).map(nom);
      const ob = l.cocina.obligatoria || {};
      const quien = tit.length ? `la cocina la lleva${tit.length > 1 ? 'n' : ''} ${tit.join(', ').replace(/, ([^,]*)$/, ' o $1')}${res.length ? `; si falta, ${res.join(' u ')}` : ''}` : 'hay cocina';
      return [{ id: `coc:${l.id}`, texto: `En ${l.nombre} ${ob.M && ob.T ? 'hay cocina mañana y tarde, todos los días: ' : ''}${quien} (${descripcionCocina(ctx.cfg, l).replace(/^cocina obligatoria mañana y tarde · /, '')})`, tipo: 'cocina', localId: l.id }];
    },
    verificar: (ctx, l0, iso, mis, c) => {
      const v = [];
      for (const f of FRANJAS) {
        const tid = turnoId(c.localId, f), l = localDe(ctx.cfg, c.localId);
        if (!turnoAbierto(ctx.cfg, ctx.est, iso, tid) || !localTieneCocina(l, f, ctx.cfg, ctx.staff)) continue;
        const r = revisarTurno(ctx.cfg, ctx.staff, ctx.est, iso, tid);
        if (r.sinCocina) { if (r.cocinaObligatoria || r.n) v.push(`${diaV(iso)} ${FRANJA_LBL[f].toLowerCase()}: sin cocina`); continue; }
        if (r.cocinaNoApta) v.push(`${diaV(iso)} ${FRANJA_LBL[f].toLowerCase()}: la cocina no es de este local`);
        const sl = ctx.slots(iso, tid); const coc = sl.find(x => x.cocina);
        if (coc && !coc.abre) { let pos = (l.cocina.posicion && l.cocina.posicion[f]) || 2; const desde = l.cocina.posicionSiDesde && l.cocina.posicionSiDesde[f]; if (desde && sl.filter(x => !x.hueco).length < desde) pos = Math.min(pos, 2); if (coc.pos !== Math.min(pos, sl.length)) v.push(`${diaV(iso)} ${FRANJA_LBL[f].toLowerCase()}: cocina en ${coc.pos}.ª`); }
      }
      return fallos(v);
    } },
  { campo: 'local.cocina.reservas', ambito: 'local', clave: 'cocina', trato: 'forzable', lbl: 'Cocina del local: reservas', condicion: 'local.cocina.titulares' },
  { campo: 'local.cocina.obligatoria', ambito: 'local', clave: 'cocina', trato: 'duro', lbl: 'Cocina obligatoria', condicion: 'local.cocina.titulares' },
  { campo: 'local.cocina.posicion', ambito: 'local', clave: 'cocina', trato: 'info', lbl: 'Posición de la cocina', condicion: 'local.cocina.titulares' },
  { campo: 'local.cocina.posicionSiDesde', ambito: 'local', clave: 'cocina', trato: 'info', lbl: 'Posición de la cocina según cuántos', condicion: 'local.cocina.titulares' },
  // 24/09 (fase 5, S18): «Quién abre» del local es una condición del Generador (no lo era: si se ponía a Mari
  // Luz en la tarde de Pasarela, el Generador seguía diciendo «✓ Iván sale el primero»), con el interruptor
  // de la regla del grupo y el de la ficha de esa persona
  { campo: 'local.primero', ambito: 'local', clave: 'abre', trato: 'punt', lbl: 'Quién abre',
    // (si su ficha ya dice «sale el primero» ahí, esa condición lo dice y lo comprueba igual: no se repite)
    // (revisión F5: ni si esa persona está de baja toda la semana, como las condiciones de su ficha)
    texto: (ctx, l) => FRANJAS.map(f => ({ f, p: l.primero && l.primero[f] ? personaDe(ctx.staff, l.primero[f]) : null })).filter(x => x.p && activa(ctx.cfg, x.p, 'abre') && !(x.p.abre && (x.p.abre[l.id] || []).includes(x.f)) && !deBajaLaSemana(ctx, x.p))
      .map(({ f, p }) => ({ id: `loc:${l.id}:primero:${f}`, texto: `En ${l.nombre}, por la ${FRANJA_LBL[f].toLowerCase()}, abre ${p.nombre} («Quién abre» del local)`, tipo: 'primero', k: 'abre', pid: p.id, localId: l.id, franja: f })),
    verificar: (ctx, l, iso, mis, c) => { const tid = turnoId(c.localId, c.franja); if (!pidsEn(ctx.est, iso, tid).includes(c.pid)) return fallos([]); const s = ctx.slots(iso, tid).find(x => x.pid === c.pid); return fallos(s && s.pos !== 1 ? [`${diaV(iso)}: ${enPosicion(s.pos)}`] : []); } },
  { campo: 'local.partidoAbre', ambito: 'local', clave: null, trato: 'relajable', lbl: 'Quien hace partido puede abrir la tarde', alFinal: true,
    texto: (ctx, l) => FRANJAS.filter(f => l.partidoAbre && l.partidoAbre[f]).map(f => ({ id: `loc:${l.id}:partidoAbre:${f}`, texto: `En ${l.nombre}, quien hace partido puede abrir la ${FRANJA_LBL[f].toLowerCase()}: no hace falta una cobertura entera (acordado con el grupo el 15/09)`, tipo: 'regla', k: 'partidoAbre', localId: l.id, franja: f, nueva: true })) },
  // los horarios: no deciden quién va dónde; los lee Horas (y lo que se imprime)
  ...['horario', 'horarioSupuesto', 'cierreAprox', 'horarioPartido', 'horarioPartidoSupuesto', 'duracion', 'duracionSupuesta', 'descansoMin'].map(k => ({ campo: 'local.' + k, ambito: 'local', clave: null, trato: 'info', lbl: 'Horas: ' + k })),
];
for (const v of VARIABLES) v.ambito = v.ambito || 'persona';
const VARIABLE_DE = {}; for (const v of VARIABLES) VARIABLE_DE[v.campo] = v;
// Lo que es solo texto (o el propio interruptor): se enseña, no decide nada. La prueba de contrato lo
// comprueba: con ellos puestos, ningún camino cambia su decisión.
const SOLO_TEXTO = ['id', 'nombre', 'color', 'nota', 'supuestos', 'prefs.nota', 'libreVariable', 'inactivas', 'local.id', 'local.nombre', 'local.corto', 'local.color'];

// lunes: la semana que se genera o se mira (24/09). Con ella, quien está de baja TODA esa semana
// no tiene condiciones, y el día libre sale como es esa semana («Mari Luz libra el martes esta
// semana (en vez de los miércoles)»). Sin semana no se descarta a nadie por baja: el modelo no
// mira el reloj.
// Fase 4 (24/09): las condiciones salen del registro VARIABLES, cada una con la variable de la que sale
// (`variable`) y solo si su interruptor está activo (activa: la regla del grupo y la ficha).
function condicionesDe(cfg, staff, lunes) {
  const st = staff || cfg.staff || [];
  const out = [];
  const semana = lunes ? [0, 1, 2, 3, 4, 5, 6].map(k => addDias(lunesDe(lunes), k)) : null;
  const ctx = Object.assign(crearContexto(cfg, st, null, { lunes: semana ? semana[0] : null }), { parejas: new Set() });
  const add = (c, x) => out.push(Object.assign({ id: c.id, num: out.length + 1, texto: c.texto, ok: true, detalle: '' }, x, Object.fromEntries(Object.entries(c).filter(([k]) => k !== 'id' && k !== 'texto'))));
  const delLocal = alFinal => { for (const v of VARIABLES) if (v.ambito === 'local' && v.texto && !!v.alFinal === alFinal && (!v.clave || regla(cfg, v.clave))) for (const l of cfg.locales) for (const c of v.texto(ctx, l)) add(c, { variable: v.campo }); };
  delLocal(false);
  for (const p of st) {
    if (deBajaLaSemana(ctx, p)) continue;
    for (const v of VARIABLES) if (v.ambito === 'persona' && v.texto && (!v.clave || activa(cfg, p, v.clave))) for (const c of v.texto(ctx, p)) add(c, { tipo: 'persona', pid: p.id, variable: v.campo });
  }
  // las reglas del grupo que no son de una ficha ni de un local
  if (regla(cfg, 'primeroCompleto')) add({ id: 'reg:primeroCompleto', texto: 'El primero de cada franja hace turno completo: quien ha trabajado la mañana no abre la tarde y los partidos entran a partir del segundo puesto (si sale primero en mañana y tarde del mismo local es turno continuo)' }, { tipo: 'regla', k: 'primeroCompleto', nueva: true });
  // 24/09 (revisión F3; José, 17/09: «dos apoyos no se quedan solos, hace falta un veterano»): la
  // comprueba el Generador igual que la Revisión (solo-apoyos). El relleno y la Cobertura la cumplen
  // solos; la puede romper lo puesto a mano o una plaza fija que se queda sola
  add({ id: 'reg:soloApoyos', texto: 'Dos apoyos no se quedan solos: en cada turno hay alguien de sala o de cocina, tampoco se queda un apoyo solo (José, 17/09)' }, { tipo: 'regla', k: 'soloApoyos', nueva: true });
  // 24/09 (revisión F4, cliente; decisiones.md, principio 6; Aroa, 17/09): quien lleva la cocina ese día no
  // refuerza la sala. La puerta lo aplica desde la fase 3 (S34) con el interruptor «Cocina»; faltaba
  // enseñarlo aquí. Es NUEVA respecto a las condiciones del prototipo del 11/09, como la de los apoyos
  if (regla(cfg, 'cocina')) add({ id: 'reg:cocinaSala', texto: 'Quien lleva la cocina un día no refuerza la sala ese día, ni en otro local ni en la otra franja (Aroa, 17/09)' }, { tipo: 'regla', k: 'cocinaSala', nueva: true });
  delLocal(true);
  return out;
}
function verificarSemana(cfg, staff, est, lunes) {
  const dias = []; for (let k = 0; k < 7; k++) dias.push(addDias(lunes, k));
  const conds = condicionesDe(cfg, staff, lunes);
  const slotsCache = {};
  const ctx = Object.assign(crearContexto(cfg, staff, est, { lunes }), { slots: (iso, tid) => slotsCache[iso + tid] || (slotsCache[iso + tid] = posicionesDe(cfg, staff, est, iso, tid)) });
  const misCache = {};
  const misDe = (pid, iso) => misCache[pid + iso] || (misCache[pid + iso] = turnosDe(cfg).filter(t => pidsEn(est, iso, t.id).includes(pid)));
  for (const c of conds) {
    const v = [], notas = [];
    const V = c.variable ? VARIABLE_DE[c.variable] : null;
    if (V && V.verificar) {
      const sujeto = c.tipo === 'persona' ? personaDe(staff, c.pid) : localDe(cfg, c.localId);
      for (const iso of dias) { const r = V.verificar(ctx, sujeto, iso, c.tipo === 'persona' ? misDe(c.pid, iso) : null, c); v.push(...r.fallos); notas.push(...(r.notas || [])); }
    }
    else if (c.tipo === 'regla' && c.k === 'soloApoyos') for (const iso of dias) for (const t of turnosDe(cfg)) {
      if (!turnoAbierto(cfg, est, iso, t.id) || !revisarTurno(cfg, staff, est, iso, t.id).soloApoyos) continue;
      v.push(`${diaV(iso)}: ${t.local.nombre} ${FRANJA_LBL[t.franja].toLowerCase()} (${pidsEn(est, iso, t.id).map(pid => nombreDe(staff, pid)).join(', ')})`);
    }
    // la misma lectura que la puerta (cocinaDelDia, salaDelDia), con el interruptor «Cocina» de cada ficha
    else if (c.tipo === 'regla' && c.k === 'cocinaSala') for (const iso of dias) for (const p of staff) {
      if (!activa(cfg, p, 'cocina')) continue;
      const tc = cocinaDelDia(cfg, est, iso, p.id), ts = tc ? salaDelDia(cfg, est, iso, p.id, tc) : null;
      if (ts) v.push(`${diaV(iso)}: ${p.nombre} lleva la cocina de ${localDe(cfg, partirTurno(tc).localId).nombre} y está de sala en ${localDe(cfg, partirTurno(ts).localId).nombre}`);
    }
    else if (c.tipo === 'regla' && c.k === 'primeroCompleto') for (const iso of dias) for (const t of turnosDe(cfg)) {
      if (t.franja !== 'T' || !turnoAbierto(cfg, est, iso, t.id)) continue;
      const s = ctx.slots(iso, t.id)[0]; if (!s || s.hueco) continue;
      const enM = turnosDe(cfg).some(x => x.franja === 'M' && pidsEn(est, iso, x.id).includes(s.pid));
      if (enM && !s.continuo && !puedePrimero(cfg, staff, est, iso, t.id, s.pid).ok) v.push(`${diaV(iso)}: ${s.nombre} abre ${t.local.nombre} viniendo de la mañana`);
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
  const g = generarPlanilla(cfg, staff, target, lunes, dias[6], { desdeIso: o.desdeIso, permitirPartido: !!o.permitirPartido, sinPatron: !!o.sinPatron, sinRetirar: !!o.sinRetirar, meses: o.meses });
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
// (p.libraPuntual) y toca `est`; no mira el reloj (opts.desdeIso para no tocar días pasados; opts.meses, la
// planilla de los otros meses, para la carga «M este mes» de quien cubre, revisión F5).
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
  const ip = tocables.length ? instanciarPatron(cfg, staff, est, desde, hasta, { soloPid: pid, soloDias: tocables, meses: o.meses }) : { aplicados: [], rechazados: [], avisos: [] };
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
// opts.dejadas (24/09, D13): casillas que ya dejó al apuntar su ausencia en Equipo ([{ iso, tid, cocina,
// abre }], las que cubrirAusencia no pudo cubrir): cuentan como suyas aunque ya no esté en ellas, para que
// la Cobertura busque quién cubre lo que quedó pendiente. Antes decía «no tiene turnos ese día».
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
      const dej = !e && (o.dejadas || []).find(x => x.iso === iso && x.tid === t.id);
      if (!e && !dej) continue;
      const rev = revisarTurno(cfg, staff, est, iso, t.id);
      out.push({ iso, tid: t.id, localId: t.localId, franja: t.franja, cocina: e ? !!e.cocina : !!dej.cocina, abre: e ? primeroDe(cfg, staff, est, iso, t.id) === pid : !!dej.abre, n: rev.n + (e ? 0 : 1), min: rev.minimo, supuesto: rev.supuesto, dejada: !e });
    }
  }
  return out;
}
// Las casillas que ya dejó quien está apuntado ausente: sus plazas de la semana tipo de esos días
// (plazasDelDia, con los cambios de día libre) en días con planilla, en la franja en que falta, cuando ya
// no está en ellas. Revisión F3b: tras «Guardar» la ausencia en Equipo (o regenerar, que la retira de su
// plaza), la pestaña Cobertura decía «Iván no tiene turnos en la planilla ese día · no hay nada que cubrir»
// del domingo que la confirmación acababa de dar por pendiente; solo lo encontraba con «Guardar y buscar
// en la Cobertura». Lo leen planesCobertura (se suman a las `dejadas` que trae la incidencia) y la pestaña.
// opts: { dias, franjas }. Devuelve [{ iso, tid, cocina, abre }].
function casillasDejadas(cfg, staff, est, pid, desde, hasta, opts) {
  const o = opts || {};
  const p = personaDe(staff, pid);
  const out = [];
  if (!p) return out;
  let n = 0;
  for (const iso of rangoIso(desde, hasta || desde)) {
    if (++n > MAX_DIAS_COBERTURA) break;
    if ((o.dias && o.dias.length && !o.dias.includes(iso)) || !diaConPlanilla(est, iso)) continue;
    const pls = plazasDelDia(cfg, staff, iso).plazas;
    let abre = null;   // (fase 5, S18) si abría, lo dice la semana tipo con primeroDe, no la marca «a»
    for (const pl of pls) {
      const { franja } = partirTurno(pl.t);
      if (pl.p !== pid || (o.franjas && o.franjas.length && !o.franjas.includes(franja))) continue;
      if (!ausenciaEn(p, iso, franja) || pidsEn(est, iso, pl.t).includes(pid) || !turnoAbierto(cfg, est, iso, pl.t)) continue;
      abre = abre || primerosDeLaSemanaTipo(cfg, staff, iso, pls);
      out.push({ iso, tid: pl.t, cocina: !!pl.c, abre: abre[pl.t] === pid });
    }
  }
  return out;
}
// Los turnos de esa persona en la semana de iso (la carga de la puntuación). 24/09 (revisión F4): el
// selector, la ★ de Hoy y el Generador → Periodo pasan el estado de UN mes, y en la semana que cruza de mes
// (28/09-04/10) se contaban solo los días de ese mes (Cristian, «2 turnos esa semana» con 7). Con `meses`
// (S.meses o los meses que se están generando) los días que caen en otro mes se leen de ahí; los del mes
// del estado, siempre del estado (el Generador trabaja sobre una copia que aún no está en S.meses).
function turnosSemanaDe(est, pid, iso, meses) {
  const lunes = mondayOf(iso);
  const mesEst = est && !est.virtual && est.y ? claveMes(est.y, est.m) : null;
  let n = 0;
  for (let k = 0; k < 7; k++) {
    const d = addDias(lunes, k);
    let dia = est.asig[d];
    if (!dia && meses && mesEst && d.slice(0, 7) !== mesEst) { const g = meses[d.slice(0, 7)]; dia = g && g.asig && g.asig[d]; }
    for (const lista of Object.values(dia || {})) if (lista.some(x => x.pid === pid)) n++;
  }
  return n;
}
// Los turnos de esa persona en el mes de iso (la carga del mes de la puntuación; fase 5, 24/09). Como
// turnosSemanaDe: los días que están en el estado se leen del estado (el Generador trabaja sobre una
// copia); el resto del mes, de `meses` (S.meses), si quien llama lo pasa. Sin `meses`, lo que haya en el
// estado: el mes entero para el Generador → Periodo, que trabaja mes a mes.
function turnosMesDe(est, pid, iso, meses) { return turnosDelMes(est, iso, meses)[pid] || 0; }
// Los turnos del mes de iso de toda la plantilla, de una pasada ({ pid: n }): candidatos() la calcula una vez
// por casilla en vez de recorrer el mes por cada persona
function turnosDelMes(est, iso, meses) {
  const mk = iso.slice(0, 7);
  const mesEst = est && !est.virtual && est.y ? claveMes(est.y, est.m) : null;
  const n = {};
  const cuenta = porT => {
    for (const k in porT) {
      const lista = porT[k];
      for (let i = 0; i < lista.length; i++) {
        const pid = lista[i].pid; let rep = false;
        for (let j = 0; j < i; j++) if (lista[j].pid === pid) { rep = true; break; }
        if (!rep) n[pid] = (n[pid] || 0) + 1;
      }
    }
  };
  for (const d in est.asig) if (d.slice(0, 7) === mk) cuenta(est.asig[d]);
  const g = meses && mesEst !== mk ? meses[mk] : null;
  if (g && g.asig) for (const d in g.asig) if (d.slice(0, 7) === mk && !est.asig[d]) cuenta(g.asig[d]);
  return n;
}
// Los candidatos para ocupar el sitio de faltaPid en una casilla. Desde la fase 4 (24/09) es candidatos()
// en modo 'cobertura': la misma puerta y la misma puntuación que el relleno (ver PESOS).
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
// opts.soloCubre (D13): solo la persona designada («cubre a»), para cubrirAusencia
// opts.sinCubre (revisión F3, D3): la casilla ya tiene quien cubre a X (el relevo, o quien ha entrado
// «por X» en este plan): el resto entra «para llegar al mínimo», sin la prioridad ni el partido de
// «cubre a». Antes salía primera otra designada que necesitaba el partido autorizado, el plan la
// ponía sin él, fallaba y la casilla se quedaba con un hueco habiendo candidatos.
// opts.descartes (revisión F3b): una lista donde se apunta, de quien no sale, por qué ({ pid, nombre,
// motivo }): el porqué de la persona designada (porQueNoCubre) sale de ESTA evaluación, no de otra copia.
function candidatosCobertura(cfg, staff, est, iso, tid, faltaPid, opts) {
  return candidatos(crearContexto(cfg, staff, est, { meses: opts && opts.meses }), iso, tid, Object.assign({ modo: 'cobertura', faltaPid }, opts));
}
// ---------- la persona designada para la casilla de quien falta ----------
// 24/09 (revisión F3b; decisiones.md, principio 1: «cada regla se lee en UN sitio»). Quién entra, por la
// designación «cubre a», en la casilla de X cuando X falta (y no hay relevo, D3): la leen la semana tipo
// (instanciarPatron), la Cobertura y la ausencia apuntada en Equipo (planCobertura) y el porqué de la
// confirmación y de la Cobertura (porQueNoCubre). Antes la semana tipo tenía su propia copia —
// cubreEnCasilla y asignar—, sin «dos apoyos no se quedan solos» ni la prioridad entre dos designadas
// (D2): el Generador dejaba a Lavinia y Dulce solas la tarde del miércoles 30 que Equipo decía que Dulce
// no podía cubrir, y con Roberto y Dulce designados elegía a otra que la Cobertura.
// Es la misma evaluación de la Cobertura (candidatosCobertura con solo las designadas): entra en el puesto
// que llevaba X (la cocina si la llevaba, D2), sin romper nada (el partido para cubrirle está autorizado,
// D1), sin dejar la casilla solo con apoyos y, entre varias, la de más puntos (libre ese día, su local,
// menos turnos esa semana). No se quita a nadie. opts: { faltaCocina: X llevaba la cocina ahí;
// prefiereAbrir: la casilla se ha quedado sin quien abra (primero la designada que puede abrir);
// soloSiAbre: solo la que puede abrir (lo único que le falta a la casilla es quien abra); permitirPartido; evitar / excluir: [pids] (el plan B, lo que ya falló al ponerse); descartes: una lista
// donde se apunta por qué no entra cada designada }. Devuelve el candidato (con `cocina`) o null.
function designadaPara(cfg, staff, est, iso, tid, xid, opts) {
  const o = opts || {};
  const cocina = !!o.faltaCocina && seBuscaCocina(cfg, staff, tid);   // (D5: con «Cocina» apagada, en su sitio de sala)
  const base = { soloCubre: true, cocina, faltaCocina: cocina, permitirPartido: !!o.permitirPartido, evitar: o.evitar, excluir: o.excluir, meses: o.meses };
  let c = null;
  if (o.prefiereAbrir || o.soloSiAbre) c = candidatosCobertura(cfg, staff, est, iso, tid, xid, Object.assign({ primero: true }, base)).find(x => !x.evitado) || null;
  if (o.soloSiAbre) return c ? Object.assign({}, c, { cocina }) : null;
  const todas = candidatosCobertura(cfg, staff, est, iso, tid, xid, Object.assign({ descartes: o.descartes }, base));
  // la que el plan B evita no se elige aquí: el plan busca entonces a otra persona, como antes
  if (!c) c = todas.find(x => !x.evitado) || null;
  return c ? Object.assign({}, c, { cocina }) : null;
}
// un plan: sobre una copia, quita a la persona de sus turnos y va cubriendo cada uno
// (primero los que menos candidatos tienen); estrategia = {permitirPartido, evitarDe: planBase}
function planCobertura(cfg, staff, est, inc, afectados, estrategia, opts) {
  const o = opts || {};
  const e = clonarEstado(est);
  // la ausencia simulada, con sus franjas si es de media jornada (D10)
  const ausSim = () => { const x = { tipo: inc.tipo, desde: inc.desde, hasta: inc.sinFin ? undefined : (inc.hasta || inc.desde) }; if (franjasAusencia(inc)) x.franjas = franjasAusencia(inc); return x; };
  // (con opts.ausenciaApuntada la ausencia ya está en la ficha: la de Equipo, D13)
  const staffSim = inc.tipo === 'CAMBIO' || o.ausenciaApuntada ? staff : staff.map(p => p.id === inc.pid ? Object.assign({}, p, { ausencias: (p.ausencias || []).concat([ausSim()]) }) : p);
  // al salir quien falta, sale con ella su marca de «abre» o de cocina fijada (retirarEntrada): si no,
  // la casilla seguía «fijada» sin nadie marcado y el relevo no abría (revisión F3)
  for (const a of afectados) retirarEntrada(e, cfg, staffSim, a.iso, a.tid, inc.pid);
  const plan = { id: null, titulo: '', estrategia: estrategia.permitirPartido ? 'con avisos: partidos no declarados' : 'con las reglas del grupo', relajado: !!estrategia.permitirPartido, asignaciones: [], huecos: [], sinCubrir: [], estado: e };
  const evitarEn = (iso, tid) => estrategia.evitarDe ? estrategia.evitarDe.asignaciones.filter(x => x.iso === iso && x.tid === tid && !x.yaEstaba).map(x => x.pid) : [];
  const sinLaPersona = pq => { const nombre = nombreDe(staff, inc.pid); for (const k of Object.keys(pq)) { pq[k] = pq[k].filter(n => n !== nombre); if (!pq[k].length) delete pq[k]; } return pq; };
  const nCand = a => candidatosCobertura(cfg, staffSim, e, a.iso, a.tid, inc.pid, { permitirPartido: !!estrategia.permitirPartido, faltaCocina: a.cocina, meses: o.meses }).length;
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
      for (const op of opcs) { c = candidatosCobertura(cfg, staffSim, e, a.iso, a.tid, inc.pid, Object.assign({ excluir, sinCubre: yaCubierta(a), soloCubre: !!o.soloCubre, meses: o.meses }, op))[0]; if (c) break; }
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
    const necesitaCocina = rev.sinCocina && (rev.cocinaObligatoria || a.cocina || rev.faltan > 0) && l && cocinaExigida(cfg, staffSim, l, franja);
    const necesario = rev.faltan > 0 || necesitaCocina || rev.sinAbre;
    if (!necesario && !o.siempre) { if (!rel) plan.sinCubrir.push({ iso: a.iso, tid: a.tid, localId, franja, n: rev.n, min: rev.minimo, motivo: `la casilla sigue completa (${rev.n} de ${rev.minimo})` }); continue; }
    const base = { permitirPartido: !!estrategia.permitirPartido, evitar: evitarEn(a.iso, a.tid), faltaCocina: a.cocina };
    // D2/D13 (revisión F3b): sin relevo, la persona designada entra la primera y en el puesto de X, con la
    // misma evaluación que la semana tipo (designadaPara). Si X llevaba la cocina, entra con la cocina
    // aunque otra de la casilla la haya recogido (en «siempre» solo se buscaba sala y Hojan no entraba por
    // Jenny: «no se pudo poner»). Si lo único que falta es quien abra, solo si puede abrir.
    if (!rel) {
      const sirve = !!o.siempre || rev.faltan > 0 || (necesitaCocina && !!a.cocina);
      const excluir = [];
      for (let k = 0; k < 8 && (sirve || rev.sinAbre); k++) {
        const d = designadaPara(cfg, staffSim, e, a.iso, a.tid, inc.pid, { meses: o.meses, faltaCocina: a.cocina, prefiereAbrir: rev.sinAbre, soloSiAbre: !sirve, permitirPartido: !!estrategia.permitirPartido, evitar: base.evitar, excluir });
        if (!d || pon(a, d, d.cocina ? { cocina: true } : null)) break;
        excluir.push(d.pid);
      }
      rev = revisarTurno(cfg, staffSim, e, a.iso, a.tid);
    }
    if (necesitaCocina && rev.sinCocina) {
      ponPrimero(a, [Object.assign({ cocina: true }, base)], { cocina: true });
      rev = revisarTurno(cfg, staffSim, e, a.iso, a.tid);
    }
    let vueltas = 0;
    while ((rev.faltan > 0 || (o.siempre && !plan.asignaciones.some(x => x.iso === a.iso && x.tid === a.tid))) && vueltas++ < 6) {
      if (!ponPrimero(a, rev.sinAbre ? [Object.assign({ primero: true }, base), base] : [base], null)) break;
      rev = revisarTurno(cfg, staffSim, e, a.iso, a.tid);
    }
    if (rev.faltan > 0) plan.huecos.push({ iso: a.iso, tid: a.tid, localId, franja, tipo: 'faltan', faltan: rev.faltan, minimo: rev.minimo, supuesto: rev.supuesto, motivo: `faltan ${rev.faltan} de ${rev.minimo}`, porQueNadie: sinLaPersona(porQueNadie(cfg, staffSim, e, a.iso, a.tid, { falta: inc.pid, sinCubre: yaCubierta(a) })) });
    if (rev.sinCocina && necesitaCocina) plan.huecos.push({ iso: a.iso, tid: a.tid, localId, franja, tipo: 'cocina', motivo: 'sin cocina', porQueNadie: sinLaPersona(porQueNadie(cfg, staffSim, e, a.iso, a.tid, { cocina: true, falta: inc.pid, sinCubre: yaCubierta(a) })) });
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
  // las casillas que ya dejó (las que trae la incidencia desde Equipo y las de su semana tipo, revisión F3b)
  const dejadas = !p || inc.tipo === 'CAMBIO' ? [] : (inc.dejadas || []).concat(casillasDejadas(cfg, staff, est, inc.pid, desde, hasta, { dias, franjas: inc.franjas }));
  const afectados = p ? turnosAfectados(cfg, staff, est, inc.pid, desde, hasta, { franjas: inc.franjas, turnos: inc.turnos, dias, dejadas }) : [];
  // 24/09 (D13): quién tiene la designación de cubrirla («Iván tiene quien le cubra: Mari Luz»)
  const designados = quienLeCubre(cfg, staff, inc.pid).filter(d => d.activa);
  const out = { pid: inc.pid, nombre: p ? p.nombre : inc.pid, tipo: inc.tipo, desde, hasta, dias, afectados: [], planes: [], posible: true, necesarios: 0, designados };
  if (!p) return Object.assign(out, { posible: false, error: 'no existe' });
  // qué le pasa a cada casilla sin la persona
  const sin = clonarEstado(est);
  for (const a of afectados) retirarEntrada(sin, cfg, staff, a.iso, a.tid, inc.pid);
  for (const a of afectados) {
    const rev = revisarTurno(cfg, staff, sin, a.iso, a.tid);
    const l = localDe(cfg, a.localId);
    const necesitaCocina = rev.sinCocina && (rev.cocinaObligatoria || a.cocina || rev.faltan > 0) && l && cocinaExigida(cfg, staff, l, a.franja);
    // la persona designada que ese día no puede cubrirla, y por qué (D13: «el domingo no puede: nunca con
    // Lavinia»); si ya va «por» ella en esa casilla (lo dejó Equipo), no hay nada que explicar
    const noCubren = [];
    for (const d of designados) {
      const q = personaDe(staff, d.pid);
      if (noCubren.some(x => x.pid === d.pid) || asignados(sin, a.iso, a.tid).some(e => e.pid === d.pid && porDe(staff, e) === inc.pid)) continue;
      const pq = porQueNoCubre(cfg, staff, sin, q, a.iso, a.tid, inc.pid, { faltaCocina: a.cocina });
      if (pq) noCubren.push({ pid: d.pid, nombre: d.nombre, porQue: pq });
    }
    // quién se queda en la casilla (la pestaña lo dice: «quedan Mari Luz y Leo, 2 de 3»)
    out.afectados.push(Object.assign({}, a, { quedan: rev.n, quedanPids: pidsEn(sin, a.iso, a.tid), faltan: rev.faltan, sinCocina: !!necesitaCocina, sinAbre: rev.sinAbre, necesario: rev.faltan > 0 || !!necesitaCocina || rev.sinAbre, noCubren }));
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
      // lo que ya está apuntado no se apunta dos veces (24/09, D13: la Cobertura de lo que dejó pendiente la
      // ausencia apuntada en Equipo; una baja sin fin no se funde y quedaba repetida)
      const fsI = franjasAusencia(inc) || FRANJAS;
      if ([...rangoIso(tr.desde, tr.hasta)].every(iso => fsI.every(f => ausenciaEn(p, iso, f, inc.tipo)))) { res.ausencia = ausenciaEn(p, tr.desde, fsI[0], inc.tipo); continue; }
      const a = { tipo: inc.tipo, desde: tr.desde };
      if (!(inc.sinFin && tr === tramos[tramos.length - 1])) a.hasta = tr.hasta;
      // 24/09 (D10, S7): con «Mañana» o «Tarde», la ausencia es solo de esa franja (antes, del día entero)
      if (franjasAusencia(inc)) a.franjas = franjasAusencia(inc);
      if (inc.detalle) a.detalle = inc.detalle;
      res.ausencia = anadirAusencia(p, a).ausencia;
    }
  }
  return ponerPlanCobertura(cfg, staff, est, inc, plan, res);
}
// La parte de aplicar un plan que toca la planilla, no la ficha: quien falta sale de sus turnos y entra
// quien cubre (con «por»), los relevos se marcan y se hacen los intercambios. La usan aplicarCobertura
// (que antes apunta la ausencia) y cubrirAusencia (la ausencia ya la apuntó Equipo): una sola manera de
// poner a quien cubre (24/09, D13).
function ponerPlanCobertura(cfg, staff, est, inc, plan, res0) {
  const p = personaDe(staff, inc.pid);
  const res = res0 || { ausencia: null, quitados: 0, asignados: [], rechazados: [], intercambios: [] };
  if (!p) return res;
  const { desde, hasta, dias } = rangoDeIncidencia(inc);
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
    // la persona designada entra por la designación (D13: si se quita, al regenerar se retira); en un
    // cambio de turno no, que es un trato entre los dos
    const r = asignar(est, cfg, staff, as.iso, as.tid, as.pid, Object.assign({ origen: 'cobertura', razon: as.razon || `cubre a ${p.nombre}`, por: por || undefined, porDesignacion: !!por && !!as.cubre && inc.tipo !== 'CAMBIO', cocina: as.cocina ? true : undefined, permitirPartido: true }, cub));
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
// ---------- la ausencia apuntada en Equipo: quien «cubre a» entra en su sitio ----------
// 24/09 (D13; Diego: «que pueda decir en equipo, tal persona cubre a tal persona, hasta nueva orden…
// antes no se hablaba bien equipo con generador ni con cobertura»). Al apuntar en Equipo (la tarjeta o la
// ficha) una ausencia en días ya planificados, la persona sale de esas casillas y en cada una entra quien
// la cubre por la designación, con la misma regla que la Cobertura: planCobertura con solo la persona
// designada (el relevo si ya estaba dentro, D3; el partido autorizado, D1; la prioridad entre varias
// designadas, D2; nunca una casilla solo con apoyos) y «siempre», como la semana tipo: le cubre siempre que
// falte, haga falta o no para el mínimo. Se pone con ponerPlanCobertura («por X», origen 'cobertura',
// marcada como de la designación: si se quita, al regenerar se retira). No mete a nadie más: lo que queda
// corto sale en `huecos` y lo que nadie designado puede cubrir, en `sinCubrir` con el porqué; `pendiente`
// es la incidencia para abrir la Cobertura con esas casillas (dejadas). Antes Equipo solo quitaba a la
// persona y dejaba el hueco, y «cubre a» no se enteraba hasta regenerar.
// La ausencia tiene que estar ya en la ficha (la apunta quien llama, con anadirAusencia); solo se tocan las
// casillas de los días y franjas en que falta. No mira el reloj. franjas: las de la ausencia (sin = el día).
// opts.desdeIso (revisión F3b; hoy, lo da quien llama como al Generador y a moverDiaLibre): los días
// anteriores ya se trabajaron. Quien falta sale igual de ellos (estaba de baja: no los trabajó, y así lo
// hacía Equipo antes de esta fase), pero no entra nadie en su sitio —no se sabe quién le cubrió; si
// alguien lo hizo, se pone a mano— y no cuentan como «sin cubrir» ni van a la Cobertura: salen en
// `pasados`. Antes una baja apuntada el jueves desde el lunes metía a Dulce el martes y le cambiaba las horas.
// Devuelve { quitados: [{ iso, tid, cocina, abre }], puestos: [{ iso, tid, pid, abre }], relevos: [{ iso, tid, pid,
//   abre }], sinCubrir: [{ iso, tid, porQue, quien: [{ pid, nombre, porQue }] }], huecos: [{ iso, tid, tipo,
//   faltan, minimo }], pasados: [{ iso, tid }], pendiente: { pid, tipo, dias, franjas, dejadas } | null }.
function cubrirAusencia(cfg, staff, est, pid, desde, hasta, franjas, opts) {
  const o = opts || {};
  const p = personaDe(staff, pid);
  const out = { quitados: [], puestos: [], relevos: [], sinCubrir: [], huecos: [], pasados: [], pendiente: null };
  if (!p) return out;
  const fs = Array.isArray(franjas) && franjas.length && franjas.length < FRANJAS.length ? FRANJAS.filter(f => franjas.includes(f)) : null;
  const todos = turnosAfectados(cfg, staff, est, pid, desde, hasta || desde, { franjas: fs || undefined }).filter(a => ausenciaEn(p, a.iso, a.franja));
  if (!todos.length) return out;
  out.quitados = todos.map(a => ({ iso: a.iso, tid: a.tid, cocina: a.cocina, abre: a.abre }));
  const pasado = a => !!o.desdeIso && a.iso < o.desdeIso;
  out.pasados = todos.filter(pasado).map(a => ({ iso: a.iso, tid: a.tid }));
  for (const a of todos.filter(pasado)) retirarEntrada(est, cfg, staff, a.iso, a.tid, pid);
  const afectados = todos.filter(a => !pasado(a));
  if (!afectados.length) return out;
  const aus = ausenciaEn(p, afectados[0].iso, afectados[0].franja);
  const dias = [...new Set(afectados.map(a => a.iso))].sort();
  const inc = { pid, tipo: aus ? aus.tipo : 'OTRO', desde: dias[0], hasta: dias[dias.length - 1], dias, turnos: afectados.map(a => a.iso + '|' + a.tid) };
  if (fs) inc.franjas = fs;
  // (revisión F5) con opts.meses (S.meses), la carga «M este mes» cuenta el mes entero, como en la Cobertura
  const plan = planCobertura(cfg, staff, est, inc, afectados, { permitirPartido: false }, { siempre: true, soloCubre: true, intercambio: false, ausenciaApuntada: true, meses: o.meses });
  const r = ponerPlanCobertura(cfg, staff, est, inc, plan);
  // con si pasa a abrir (la confirmación lo dice: «ya estaba en ese turno y pasa a cubrirle, abriendo»)
  for (const x of r.asignados) (x.yaEstaba ? out.relevos : out.puestos).push({ iso: x.iso, tid: x.tid, pid: x.pid, abre: primeroDe(cfg, staff, est, x.iso, x.tid) === x.pid });
  // lo que nadie designado cubre, con el porqué de cada designada (o que no hay ninguna)
  const designadas = [...new Set(quienLeCubre(cfg, staff, pid).map(d => d.pid))];
  const pendientes = [];
  for (const a of afectados) {
    const cubierta = asignados(est, a.iso, a.tid).some(e => e.pid !== pid && porDe(staff, e) === pid);
    if (!cubierta) {
      const quien = [];
      // el porqué sale de la misma evaluación que la pone (porQueNoCubre, revisión F3b); si aun así dice que
      // podía, es que al ponerla en la planilla se rechazó: se dice el motivo del rechazo
      for (const qid of designadas) {
        const rech = r.rechazados.find(x => x.iso === a.iso && x.tid === a.tid && x.pid === qid);
        const pq = porQueNoCubre(cfg, staff, est, personaDe(staff, qid), a.iso, a.tid, pid, { faltaCocina: a.cocina }) || (rech && rech.motivo) || 'no entró en ese turno';
        quien.push({ pid: qid, nombre: nombreDe(staff, qid), porQue: pq });
      }
      out.sinCubrir.push({ iso: a.iso, tid: a.tid, porQue: quien.length ? quien.map(q => `${q.nombre}: ${q.porQue}`).join('; ') : `nadie tiene «Cubre a» ${p.nombre}`, quien });
    }
    const rev = revisarTurno(cfg, staff, est, a.iso, a.tid);
    const tipo = rev.faltan > 0 ? 'faltan' : rev.sinAbre ? 'primero' : rev.sinCocina && rev.cocinaObligatoria ? 'cocina' : null;
    if (tipo) out.huecos.push({ iso: a.iso, tid: a.tid, tipo, faltan: rev.faltan, minimo: rev.minimo, supuesto: rev.supuesto });
    if (!cubierta || tipo) pendientes.push(a);
  }
  if (pendientes.length) {
    out.pendiente = { pid, tipo: inc.tipo, dias: [...new Set(pendientes.map(a => a.iso))].sort(), dejadas: pendientes.map(a => ({ iso: a.iso, tid: a.tid, cocina: a.cocina, abre: a.abre })) };
    if (fs) out.pendiente.franjas = fs;
    if (aus && aus.tipo === 'BAJ' && !aus.hasta) out.pendiente.sinFin = true;
  }
  return out;
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
      for (const t of turnosDe(cfg)) { const e = asignados(est, iso, t.id).find(x => x.pid === p.id); if (e && plazaOcupa(cfg, est, iso, t.id)) mias.push({ e, localId: t.local.id, franja: t.franja, tid: t.id }); }
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
      if (!plazaOcupa(cfg, estAp, iso, tid)) continue;
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
  // (fase 5, D5: con la regla del grupo «Cocina» apagada, el núcleo tampoco la pide; cocinaExigida)
  for (const l of cfg.locales) for (const f of FRANJAS) {
    if (!cocinaExigida(cfg, staff, l, f)) continue;
    const dura = cocinaObligatoriaEn(cfg, l, f);
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
    localTieneCocina, puedeCocina, rangoCocina, cocinaDe, nuncaCocina, cocinaExigida, cocinaObligatoriaEn, razonCocina, ponerCocinaFicha, ponerCocinaLocal, migrarCocinaLocales, migrarAbrePatron, migrarMarcasAutomaticas, cocinaQueCrea, fichaImpideAbrir, quitarAbreAMano, quienAbreFijo, razonPrimero,
    puedeEstar, ordenarCasilla, normalizarCasilla, asignar, desasignar, moverEnCasilla, marcarCocina, marcarAbre,
    revisarTurno, revisionMes,
    plazasDe, instanciarPatron, patronDesdeSemana,
    turnosMes, esComodin, candidatosPara, candidatosConAviso, porQueNadie, generarPlanilla,
    minutosTurno, minutosNocturnos, minutosEntre, horarioDe, tramoPartidoDe, turnoDelDia,
    migrarPuestos, migrarAltas, esApoyo, libraEn, libraPuntualVigente, limpiarLibrePuntual, lunesDe,
    activa, librasPuntuales, libraPuntualDe, ponerLibraPuntual, textoCambioLibre, cambioDeLibre, partidoEn, estadoDia,
    plazasDelDia, esAutomatica, retirarQueIncumplen, moverDiaLibre, porDe, retirarEntrada, motivoLibra,
    LISTAS_CAND, VALORACIONES, PUESTOS_CAND, BUSCA, MOTIVOS_ALERTA, HABILIDADES, HAB_ESTADO, CAMPOS_ENTREVISTA, tieneEntrevista, VAL_LBL, etiquetaCandidato, filtrarCandidatos, fechaCandidato, ORDENES_CAND, ordenarCandidatos, resumenCandidatos,
    puestosDe, textoPuestos, migrarCandidatos, fundirSemillaEntrevistas, textoCampo,
    diasAusenciaMes, mediasAusenciaMes, jornadasAusencia, vacacionesAno, horasPersonaMes, horasEquipoMes, horasLocalMes, cierreDe, tramoDe, registroApoyos,
    toProblem, desdeSolucion,
    fusionarEstado, sembrarDemo, migrarHorarios, navVigente, refrescarCasillas, refrescarMarcas, seBuscaCocina, diaDeLaSemanaTipo,
    CARACTERISTICAS, REGLAS, REGLA_NOMBRE, nombreRegla, regla, caracteristicaActiva, avisosVigentes, puedePrimero, partidoAbre, primeroDe, posicionesDe, motivoSinPrimero, porQueNadiePrimero, esContinuo,
    resumenMinimos, descripcionCocina, condicionesDe, verificarSemana, generarSemana, mesVisibleParaPersonal, mesesVisibles, destinatariosAviso, avisoEsPara,
    MOTIVOS_CIERRE, DECISIONES_CIERRE, cierresDe, diasDeCierre, cierreEn, textoCierre, etiquetaCierre, hastaCierre, motivoCierreTxt, motivoSinTrabajo, fechaCortaCierre, validarCierre,
    decisionCierre, apoyoPorCierre, puntosCierre, afectadosPorCierre, sugerenciasRefuerzo, aplicarCierre, quitarCierre, instanciarCierres, CLAVES_PLANILLA,
    cerradaEseDia, aperturaDelDia, diaConPlanilla, apoyosSinSitio, mitadesCerradas, cierresDelHorario, reabrirCierreDesde, dentroDeCierre, repartoDelDia,
    TIPOS_INCIDENCIA, turnosAfectados, turnosSemanaDe, turnosMesDe, candidatosCobertura, planesCobertura, aplicarCobertura, vaciarPlanilla,
    cubrirAusencia, ponerPlanCobertura, quienLeCubre, cuandoCubre, lugarCubre, porQueNoCubre, porDesignacionDe, designadaPara, motivoNoRelevo, casillasDejadas,
    cubreEnCasilla, rangoNecesario, revisarEntrada, relevoEn, marcarRelevo, desmarcarRelevos, volcarPrevia, porDeSuCasilla, MOTIVO_SOLO_APOYOS, etiquetaAusencia, quedariaSoloApoyos, puntosPuesto, cocinaDelDia, franjasAusencia, textoFranjasAusencia,
    sugerirUsuario, PALETA_PERSONAS, asignarColores, semillaPasarela,
    crearContexto, evaluarPlaza, primerBloqueo, incompatibles, evita, abreFijo, PESOS, puntuar, candidatos, VARIABLES, SOLO_TEXTO, gruposSelector, destrapa, fraseBloqueo,
    plazaOcupa, salaDelDia, siSeFuerza, cocinasTitular,
  };
}
