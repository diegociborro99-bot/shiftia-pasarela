// Vista del estado que recibe cada rol (se aplica en el servidor, nunca en el
// cliente): el encargado y el programador ven todo; el empleado solo lo suyo y
// lo mínimo de los compañeros para leer su planilla y proponer cambios de turno.
'use strict';
const { avisoEsPara, mesesVisibles, fechaMadrid } = require('./modelo.js');

function estadoParaEmpleado(estado, pid, hoyClave) {
  if (!estado || !Array.isArray(estado.staff)) return estado;
  // 07/09: los meses futuros que el encargado aún no ha publicado no viajan
  // (el mes en curso y los pasados, siempre; sin lista, todo, como hasta ahora)
  const hoy = hoyClave || fechaMadrid().slice(0, 7);   // hora de Madrid, no UTC (auditoría 07/09)
  // 14/09 (Pasarela): de los compañeros solo identidad, color, puesto y locales
  // donde trabajan — lo justo para leer la casilla y proponer un cambio. Ni
  // ausencias, ni contrato, ni notas, ni preferencias, ni a quién cubren.
  const staff = estado.staff.map(p => p.id === pid ? p : ({
    id: p.id, nombre: p.nombre, color: p.color, puesto: p.puesto, locales: p.locales,
  }));
  const peticiones = (estado.peticiones || [])
    .filter(x => x.pid === pid || (x.tipo === 'cambio' && x.conPid === pid && x.conIso));
  // el aviso llega sin la lista de otros destinatarios ni quién más lo ocultó
  const avisos = (estado.avisos || [])
    .filter(a => avisoEsPara(a, pid))
    .map(a => { const dirigido = !!((Array.isArray(a.paraPids) && a.paraPids.length) || a.paraPid); const c = Object.assign({}, a, { ocultoPor: (a.ocultoPor || []).filter(q => q === pid) }); delete c.paraPid; delete c.paraPids; if (dirigido) c.paraPids = [pid]; return c; });
  return {
    staff,
    // la configuración de los locales (horarios, mínimos, cocina) es pública dentro del grupo
    locales: Array.isArray(estado.locales) ? estado.locales : [],
    meses: mesesVisibles(estado, hoy), festivos: estado.festivos || [],
    eventos: Array.isArray(estado.eventos) ? estado.eventos : [],
    mesesPublicados: Array.isArray(estado.mesesPublicados) ? estado.mesesPublicados.slice() : undefined,
    festVersion: estado.festVersion, staffVersion: estado.staffVersion, nextId: estado.nextId,
    peticiones, avisos, historial: [], extras: [],
    // la semana tipo y los cierres son herramientas del encargado: no viajan
    patron: undefined, cierres: undefined,
  };
}

module.exports = { estadoParaEmpleado };
