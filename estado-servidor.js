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

// 18/09 (José): «Aroa […] comprueba si previamente lo hemos descartado pero no quiero que
// tenga acceso al contenido de cada entrevista. Si sí le hemos entrevistado, si hemos
// puesto bien, mal o regular y demás pero no a lo que hay dentro de cada entrevista donde
// hablo de condiciones». De cada ficha sale lo justo para eso —quién es, a qué puesto
// opta, cómo se le valoró, por qué se le descartó y si se le entrevistó y cuándo— y NADA
// de dentro: ni experiencia, ni sueldo, ni horarios, ni condiciones, ni observaciones, ni
// aptitudes. Se aplica en el servidor: el contenido no llega a su navegador.
function entrevistaSinContenido(c) {
  const fuera = {
    id: c.id, nombre: c.nombre, tel: c.tel, lista: c.lista,
    val: c.val, motivo: c.motivo,          // la valoración y el porqué del descarte: es lo que va a mirar
    fecha: c.fecha,                        // «si sí le hemos entrevistado», y cuándo
    sinContenido: true,                    // para que la app no pinte una ficha a medias
  };
  if (Array.isArray(c.puestos)) fuera.puestos = c.puestos.slice();
  else if (c.puesto) fuera.puesto = c.puesto;
  for (const k of Object.keys(fuera)) if (fuera[k] === undefined) delete fuera[k];
  return fuera;
}
function estadoSinContenidoEntrevistas(estado) {
  if (!estado || !Array.isArray(estado.entrevistas)) return estado;
  return Object.assign({}, estado, { entrevistas: estado.entrevistas.map(entrevistaSinContenido) });
}

module.exports = { estadoParaEmpleado, entrevistaSinContenido, estadoSinContenidoEntrevistas };
