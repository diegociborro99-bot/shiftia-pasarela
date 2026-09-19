// La semilla: el estado de fábrica de la burbuja (locales, equipo, semana tipo, equipos de
// eventos, festivos y reglas) construido desde el manifiesto, con la MISMA forma que
// produce la semilla del arquetipo (semillaPasarela en modelo.js). Y el camino de vuelta:
// de una semilla existente a un manifiesto, para meter en el motor una app que ya existe.
import { DOWS, PUESTOS_DEFECTO, slugificar } from './manifiesto.mjs';

const clon = x => JSON.parse(JSON.stringify(x));
const esObjeto = v => v !== null && typeof v === 'object' && !Array.isArray(v);

// {1: v, …, 7: v} desde lista de 7, objeto por día, valor suelto o nada
function objPorDia(v, defecto) {
  const o = {};
  if (Array.isArray(v)) DOWS.forEach((d, i) => { o[d] = v[i] === undefined ? defecto : v[i]; });
  else if (esObjeto(v)) DOWS.forEach(d => { o[d] = v[d] === undefined ? defecto : v[d]; });
  else DOWS.forEach(d => { o[d] = v === undefined || v === null ? defecto : v; });
  return o;
}
// como el `sup()` del arquetipo: solo los días marcados, y solo con true
function objSupuestos(v) {
  const o = {};
  if (Array.isArray(v)) DOWS.forEach((d, i) => { if (v[i]) o[d] = true; });
  else if (esObjeto(v)) DOWS.forEach(d => { if (v[d]) o[d] = true; });
  else if (v) DOWS.forEach(d => { o[d] = true; });
  return o;
}

export const HORARIO_DEFECTO = { M: { ini: '08:00', fin: '16:00' }, T: { ini: '16:00', fin: '00:00' }, porDow: {} };
export const HORARIO_PARTIDO_DEFECTO = { M: { ini: '11:00', fin: '16:00' }, T: { ini: '21:00', fin: '00:00' }, porDow: { 6: { M: { ini: '12:00', fin: '16:00' }, T: { ini: '20:00', fin: '00:00' } }, 7: { M: { ini: '12:00', fin: '16:00' }, T: { ini: '20:00', fin: '00:00' } } } };

export function localDesdeUnidad(u, franjas) {
  const fr = franjas || ['M', 'T'];
  const porFranja = (fn) => { const o = {}; for (const f of fr) o[f] = fn(f); return o; };
  const conocidos = ['id', 'nombre', 'corto', 'color', 'abre', 'minimos', 'supuestos', 'cocina', 'primero', 'partidoAbre', 'horario', 'horarioSupuesto', 'cierreAprox', 'horarioPartido', 'horarioPartidoSupuesto', 'duracion', 'duracionSupuesta', 'descansoMin'];
  const l = { id: u.id, nombre: u.nombre, corto: u.corto || u.nombre.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase(), color: u.color || '#6e6e6e' };
  if (u.partidoAbre !== undefined) l.partidoAbre = porFranja(f => !!(u.partidoAbre && u.partidoAbre[f]));
  l.abre = porFranja(f => (u.abre && u.abre[f]) ? u.abre[f].slice() : DOWS.slice());
  l.minimos = porFranja(f => objPorDia(u.minimos && u.minimos[f], u.minimos ? 0 : 1));
  // sin mínimos en el manifiesto, todos son supuestos: la app los enseña con asterisco
  l.supuestos = porFranja(f => u.supuestos ? objSupuestos(u.supuestos[f]) : objSupuestos(!(u.minimos && u.minimos[f] !== undefined)));
  const c = u.cocina;
  if (esObjeto(c)) {
    const titulares = esObjeto(c.titulares) ? porFranja(f => (c.titulares[f] || []).slice()) : porFranja(() => (Array.isArray(c.titulares) ? c.titulares : []).slice());
    l.cocina = { obligatoria: esObjeto(c.obligatoria) ? porFranja(f => !!c.obligatoria[f]) : porFranja(() => !!c.obligatoria), titulares, reservas: (c.reservas || []).slice(), posicion: esObjeto(c.posicion) ? porFranja(f => c.posicion[f] === undefined ? 2 : c.posicion[f]) : porFranja(() => Number.isInteger(c.posicion) ? c.posicion : 2), posicionSiDesde: c.posicionSiDesde ? clon(c.posicionSiDesde) : {} };
  } else l.cocina = { obligatoria: porFranja(() => c === true), titulares: porFranja(() => []), reservas: [], posicion: porFranja(() => 2), posicionSiDesde: {} };
  l.primero = porFranja(f => (u.primero && u.primero[f]) || null);
  l.horario = u.horario ? clon(u.horario) : clon(HORARIO_DEFECTO);
  if (l.horario.porDow === undefined) l.horario.porDow = {};
  l.horarioSupuesto = u.horarioSupuesto !== undefined ? !!u.horarioSupuesto : !u.horario;
  l.cierreAprox = u.cierreAprox !== undefined ? !!u.cierreAprox : true;
  l.horarioPartido = u.horarioPartido ? clon(u.horarioPartido) : clon(HORARIO_PARTIDO_DEFECTO);
  l.horarioPartidoSupuesto = u.horarioPartidoSupuesto !== undefined ? !!u.horarioPartidoSupuesto : !u.horarioPartido;
  l.duracion = u.duracion ? porFranja(f => u.duracion[f] === undefined ? 480 : u.duracion[f]) : porFranja(() => 480);
  l.duracionSupuesta = u.duracionSupuesta !== undefined ? !!u.duracionSupuesta : !u.duracion;
  l.descansoMin = u.descansoMin === undefined ? 0 : u.descansoMin;
  for (const k of Object.keys(u)) if (!conocidos.includes(k)) l[k] = clon(u[k]);   // lo que el manifiesto traiga de más, pasa tal cual
  return l;
}

export function personaDesdeEquipo(p, puestos, franjas) {
  const conocidos = ['id', 'nombre', 'puesto', 'unidades', 'locales', 'franjas', 'libra'];
  const base = { id: p.id || slugificar(p.nombre), nombre: p.nombre, puesto: p.puesto || (puestos || PUESTOS_DEFECTO)[0].id,
    locales: (p.unidades || p.locales || []).slice(), franjas: (p.franjas || (franjas || ['M', 'T'])).slice(), libra: (p.libra || []).slice(),
    partido: { dias: [] }, cocina: { titular: [], reserva: [], soloDias: [] }, abre: {}, noAbre: [], nuncaCon: [], cubreA: [], vetos: [],
    contrato: { horasSemana: null }, ausencias: [], prefs: {}, nota: '', supuestos: [] };
  for (const k of Object.keys(p)) if (!conocidos.includes(k)) base[k] = clon(p[k]);
  return base;
}

function plazaDesde(pl) {
  const o = { t: pl.t, p: pl.p };
  if (pl.c || pl.cocina) o.c = 1;
  if (pl.a || pl.abre) o.a = 1;
  if (pl.s || pl.supuesto) o.s = 1;
  if (pl.por) o.por = pl.por;
  if (pl.n || pl.nota) o.n = pl.n || pl.nota;
  return o;
}

export function construirSemilla(ctx) {
  const franjas = ctx.franjas || ['M', 'T'];
  const locales = ctx.unidades.map(u => localDesdeUnidad(u, franjas));
  const staff = (ctx.equipo || []).map(p => personaDesdeEquipo(p, ctx.puestos, franjas));
  const patron = {};
  for (const [d, plazas] of Object.entries(ctx.semanaTipo || {})) patron[d] = (plazas || []).map(plazaDesde);
  const equipos = ((ctx.eventos && ctx.eventos.equipos) || []).map(q => ({ id: q.id || slugificar(q.nombre), nombre: q.nombre, corto: q.corto || q.nombre, color: q.color || '#1a5a96', refuerzo: q.refuerzo ? clon(q.refuerzo) : {}, franja: q.franja || 'T' }));
  return { locales, staff, patron, equipos, eventos: [], extras: [], festivos: (ctx.festivos || []).slice(), cierres: {}, reglas: clon(ctx.reglas || {}) };
}

// el bloque de modelo.js que sustituye a la semilla del arquetipo
export function codigoSemilla(semilla, ctx) {
  const json = JSON.stringify(semilla, null, 2);
  return `// ---------- semilla de ${ctx.nombre} (la escribe el motor de creación desde cliente.json) ----------
// Es el estado de fábrica: ${semilla.locales.length} ${semilla.locales.length === 1 ? 'local' : 'locales'}, ${semilla.staff.length} personas, semana tipo, equipos de los eventos,
// festivos y reglas apagadas. Solo se usa cuando no hay planilla guardada (primer arranque
// del servidor o del navegador); después todo se edita desde la app y aquí no hay que
// volver. Para cambiar la semilla de un despliegue nuevo, cambia cliente.json y vuelve a
// generar, o edita este bloque con cuidado: es JSON, no código.
const SEMILLA_CLIENTE = ${json};
function semillaCliente() {
  const s = JSON.parse(JSON.stringify(SEMILLA_CLIENTE));
  asignarColores(s.staff);
  return s;
}
`;
}

// ---------- de una semilla existente a un manifiesto (ida y vuelta) ----------
function listaPorDia(o, defecto) { return DOWS.map(d => o && o[d] !== undefined ? o[d] : defecto); }

export function extraerManifiesto(semilla, base = {}) {
  const unidades = semilla.locales.map(l => {
    const u = clon(l);
    u.minimos = {}; u.supuestos = {};
    for (const f of Object.keys(l.minimos || {})) u.minimos[f] = listaPorDia(l.minimos[f], 0);
    for (const f of Object.keys(l.supuestos || {})) u.supuestos[f] = listaPorDia(l.supuestos[f], false).map(Boolean);
    return u;
  });
  const equipo = semilla.staff.map(p => { const q = clon(p); q.unidades = q.locales; delete q.locales; delete q.color; return q; });
  const semanaTipo = clon(semilla.patron || {});
  return Object.assign({}, base, {
    unidades, equipo, semanaTipo,
    eventos: { equipos: clon(semilla.equipos || []) },
    festivos: clon(semilla.festivos || []),
    reglas: clon(semilla.reglas || {}),
  });
}
