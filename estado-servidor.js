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
  // 24/09 (fase 6, S21): de su propia ficha, sin las parejas «nunca con»: desde que la pareja está en las dos fichas,
  // la suya llevaría también las que declaró un compañero («Leo, nunca con Susana Capón»), y no le hacen falta
  // para leer su planilla. Copia: el estado del servidor no se toca.
  const propia = p => { const c = Object.assign({}, p); delete c.nuncaCon; delete c.nuncaConFlex; delete c.nuncaConOff; return c; };
  const staff = estado.staff.map(p => p.id === pid ? propia(p) : ({
    id: p.id, nombre: p.nombre, color: p.color, puesto: p.puesto, locales: p.locales,
  }));
  const peticiones = (estado.peticiones || [])
    .filter(x => x.pid === pid || (x.tipo === 'cambio' && x.conPid === pid && x.conIso));
  // el aviso llega sin la lista de otros destinatarios ni quién más lo ocultó
  const avisos = (estado.avisos || [])
    .filter(a => avisoEsPara(a, pid))
    .map(a => { const dirigido = !!((Array.isArray(a.paraPids) && a.paraPids.length) || a.paraPid); const c = Object.assign({}, a, { ocultoPor: (a.ocultoPor || []).filter(q => q === pid) }); delete c.paraPid; delete c.paraPids; if (dirigido) c.paraPids = [pid]; return c; });
  // 24/09 (D11): los cierres de un local por fechas sí viajan —su casilla sale «Cerrado por reforma»—,
  // pero de las decisiones solo la suya (qué hace él esos días): ni lo que hacen los compañeros
  // (vacaciones, sin trabajo) ni las plazas que se retiraron al cerrar.
  const cierresPuntuales = (Array.isArray(estado.cierresPuntuales) ? estado.cierresPuntuales : []).map(c => ({
    id: c.id, localId: c.localId, dias: c.dias, motivo: c.motivo, detalle: c.detalle,
    decisiones: c.decisiones && c.decisiones[pid] ? { [pid]: c.decisiones[pid] } : {},
  }));
  // 24/09 (revisión F3b, D13): la casilla sigue diciendo «por Iván» (lo necesita para leerla), pero no la
  // marca interna `porDesignacion`, que dice que un compañero tiene la designación de cubrir a otro (lo
  // mismo que se le oculta de las fichas). Copia: el estado del servidor no se toca.
  const meses = {};
  for (const [k, v] of Object.entries(mesesVisibles(estado, hoy))) {
    const asig = {};
    for (const [iso, porT] of Object.entries((v && v.asig) || {})) {
      asig[iso] = {};
      for (const [tid, lista] of Object.entries(porT || {})) asig[iso][tid] = (lista || []).map(e => { if (!e || !e.porDesignacion) return e; const c = Object.assign({}, e); delete c.porDesignacion; return c; });
    }
    meses[k] = Object.assign({}, v, { asig });
  }
  return {
    staff, cierresPuntuales,
    // la configuración de los locales (horarios, mínimos, cocina) es pública dentro del grupo
    locales: Array.isArray(estado.locales) ? estado.locales : [],
    meses, festivos: estado.festivos || [],
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
// hablo de condiciones». Y el 18/09, por Diego: «tiene que saber a quiénes se le ha
// entrevistado también para no volverles a llamar, pero no el contenido de la entrevista
// fuera del nombre y teléfono». De cada ficha sale eso y solo eso: quién es, su teléfono,
// si ya se la entrevistó (el hecho, no la fecha), cómo se la valoró y por qué se la
// descartó. Ni el puesto al que opta, que también sale de la entrevista. Se aplica en el
// servidor: el contenido no llega a su navegador.
function entrevistaSinContenido(c) {
  const fuera = {
    id: c.id, nombre: c.nombre, tel: c.tel, lista: c.lista,
    val: c.val, motivo: c.motivo,   // la valoración y el porqué del descarte: «si hemos puesto bien, mal o regular»
    // el HECHO de que ya se la entrevistó —«para no volverles a llamar»—, pero no la fecha
    // ni nada más: la fecha ya es de dentro de la entrevista.
    entrevistado: !!(c.fecha || c.exp || c.edad || c.zona || c.doc || c.incorp || c.sueldo ||
      c.horarios || c.cond || c.obs || c.tipoCocina || c.nota ||
      (c.hab && Object.keys(c.hab).length) || (c.busca && c.busca.length)),
    sinContenido: true,             // para que la app no pinte una ficha a medias
  };
  for (const k of Object.keys(fuera)) if (fuera[k] === undefined) delete fuera[k];
  return fuera;
}
function estadoSinContenidoEntrevistas(estado) {
  if (!estado || !Array.isArray(estado.entrevistas)) return estado;
  return Object.assign({}, estado, { entrevistas: estado.entrevistas.map(entrevistaSinContenido) });
}

// 18/09 (Diego): «el oficinista puede meter a gente en la lista negra (crear registros) si
// no acude una persona a la entrevista». Es lo ÚNICO que puede escribir de esta base: las
// fichas que ya existen mandan tal como están guardadas —ni se editan ni se borran, y la
// app le manda la planilla entera en cada guardado, así que sin esto un cambio de turno
// suyo se llevaría por delante el trabajo de José— y de lo que llega nuevo solo se acepta
// un alta de alerta con lo justo: quién es, su teléfono y por qué no hay que llamarle.
const CAMPOS_ALTA_ALERTA = ['id', 'nombre', 'tel', 'motivo', 'ts'];   // ts: el sello de cuándo se dio de alta, para que salga la primera
function entrevistasTrasEscrituraSinPermiso(guardadas, entrantes) {
  const previas = Array.isArray(guardadas) ? guardadas : [];
  if (!Array.isArray(entrantes)) return previas;
  const conocidos = new Set(previas.map(c => c && c.id).filter(Boolean));
  const altas = [];
  for (const c of entrantes) {
    if (!c || typeof c !== 'object' || !c.id || conocidos.has(c.id)) continue;
    if (!c.nombre && !c.tel) continue;          // un registro sin nombre ni teléfono no sirve de nada
    conocidos.add(c.id);
    const alta = { lista: 'alerta' };           // siempre a la lista negra, diga lo que diga el cliente
    for (const k of CAMPOS_ALTA_ALERTA) if (c[k] !== undefined && c[k] !== null && c[k] !== '') alta[k] = c[k];
    altas.push(alta);
  }
  return previas.concat(altas);
}

module.exports = { estadoParaEmpleado, entrevistaSinContenido, estadoSinContenidoEntrevistas, entrevistasTrasEscrituraSinPermiso };
