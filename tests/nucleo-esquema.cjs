'use strict';
// EL ESQUEMA DEL NÚCLEO, PARA LAS PRUEBAS (25/09, revisión de la fase 7). El servicio shiftia-core valida cada
// petición con pydantic (service/schemas.py: SolveRequest → ProblemIn, WorkerIn, DayInfoIn, RuleIn, SolveConfigIn)
// y, si un campo no tiene la forma que espera, responde 422 sin resolver nada. Aquí se comprueba lo mismo, campo a
// campo y con la misma forma de error ({ type, loc, msg, input }), para lo que manda la app: lo usan modelo.test.js,
// el contrato (tests/contrato-variables.test.mjs) y el núcleo de pega de tests/e2e-nucleo.mjs. Antes el núcleo de
// pega aceptaba cualquier cosa: `unavailable[i] = '*'` (un texto, no una lista) pasó todas las pruebas y el núcleo de
// verdad devolvía 422 con «Input should be a valid list» (revisores del modelo y del cliente, 25/09).
// No es de la app: no se embebe en index.html.

const esTexto = v => typeof v === 'string';
const esEntero = v => typeof v === 'number' && Number.isInteger(v);
const esNumero = v => typeof v === 'number' && Number.isFinite(v);
const esBool = v => typeof v === 'boolean';
const esObjeto = v => !!v && typeof v === 'object' && !Array.isArray(v);
const TIPOS = {
  str: [esTexto, 'string_type', 'Input should be a valid string'],
  int: [esEntero, 'int_type', 'Input should be a valid integer'],
  float: [esNumero, 'float_type', 'Input should be a valid number'],
  bool: [esBool, 'bool_type', 'Input should be a valid boolean'],
  dict: [esObjeto, 'dict_type', 'Input should be a valid dictionary'],
  list: [Array.isArray, 'list_type', 'Input should be a valid list'],
};

// campos de cada modelo: [nombre, tipo, obligatorio, opcional (admite null)]; 'list:str' = list[str];
// 'dict:str' = dict[str, str]; 'dict:list:str' = dict[str, list[str]]
const MODELOS = {
  ProblemIn: [['horizon_days', 'int', true], ['shifts', 'list:ShiftTypeIn', true], ['workers', 'list:WorkerIn', true], ['days', 'list:DayInfoIn'], ['rules', 'list:RuleIn'], ['rest_code', 'str'], ['meta', 'dict']],
  ShiftTypeIn: [['code', 'str', true], ['label', 'str'], ['hours', 'float'], ['is_work', 'bool'], ['is_rest', 'bool'], ['period', 'str', false, true], ['start', 'str', false, true], ['end', 'str', false, true], ['segments', 'list:dict'], ['tags', 'list:str']],
  WorkerIn: [['id', 'str', true], ['name', 'str'], ['allowed_shifts', 'list:str', false, true], ['skills', 'list:str'], ['groups', 'list:str'], ['contract_hours', 'float', false, true], ['min_hours', 'float', false, true], ['max_hours', 'float', false, true], ['fixed', 'dict:str'], ['unavailable', 'dict:list:str'], ['preferences', 'list:PreferenceIn'], ['history', 'list:str'], ['attributes', 'dict']],
  PreferenceIn: [['day', 'int', true], ['shift', 'str', true], ['weight', 'int']],
  DayInfoIn: [['index', 'int', true], ['date', 'str', false, true], ['dow', 'int', false, true], ['is_weekend', 'bool'], ['is_holiday', 'bool'], ['tags', 'list:str']],
  RuleIn: [['type', 'str', true], ['mode', 'str'], ['weight', 'int'], ['tier', 'int'], ['params', 'dict'], ['scope', 'dict'], ['id', 'str', false, true], ['citation', 'dict', false, true]],
  SolveConfigIn: [['time_limit_s', 'float', false, true], ['num_workers', 'int'], ['seed', 'int'], ['log', 'bool'], ['deterministic', 'bool'], ['objective', 'str'], ['explain_infeasible', 'bool'], ['relax_on_infeasible', 'bool'], ['baseline', 'dict', false, true], ['stability_weight', 'int'], ['stability_tier', 'int'], ['validate', 'bool']],
};

function comprobar(v, tipo, loc, errores) {
  const [base, ...resto] = tipo.split(':');
  if (MODELOS[base]) return modelo(v, base, loc, errores);
  const [fn, type, msg] = TIPOS[base];
  if (!fn(v)) { errores.push({ type, loc, msg, input: v }); return; }
  if (!resto.length) return;
  const sub = resto.join(':');
  if (base === 'list') v.forEach((x, i) => comprobar(x, sub, loc.concat(i), errores));
  else if (base === 'dict') for (const [k, x] of Object.entries(v)) comprobar(x, sub, loc.concat(k), errores);
}
function modelo(v, nombre, loc, errores) {
  if (!esObjeto(v)) { errores.push({ type: 'model_type', loc, msg: `Input should be a valid dictionary or instance of ${nombre}`, input: v }); return; }
  for (const [campo, tipo, obligatorio, nulo] of MODELOS[nombre]) {
    if (!(campo in v)) { if (obligatorio) errores.push({ type: 'missing', loc: loc.concat(campo), msg: 'Field required', input: v }); continue; }
    if (v[campo] === null && nulo) continue;
    comprobar(v[campo], tipo, loc.concat(campo), errores);
  }
}
// los errores de validación de una petición de /v1/solve ({ problem, config }), con la loc de pydantic
// (['body', 'problem', 'workers', 0, 'unavailable', '1']); [] si el núcleo la acepta. Además, lo que el núcleo pasa
// luego a entero (las claves de fixed y unavailable: int(k)) tiene que ser un número de medio día
function erroresPeticion(peticion) {
  const errores = [];
  if (!esObjeto(peticion)) return [{ type: 'model_type', loc: ['body'], msg: 'Input should be a valid dictionary', input: peticion }];
  if (!('problem' in peticion)) errores.push({ type: 'missing', loc: ['body', 'problem'], msg: 'Field required', input: peticion });
  else modelo(peticion.problem, 'ProblemIn', ['body', 'problem'], errores);
  if ('config' in peticion) modelo(peticion.config, 'SolveConfigIn', ['body', 'config'], errores);
  const pb = peticion.problem;
  if (esObjeto(pb) && Array.isArray(pb.workers)) pb.workers.forEach((w, i) => {
    for (const k of ['fixed', 'unavailable']) for (const d of Object.keys((w && w[k]) || {})) if (!/^\d+$/.test(d) || +d >= pb.horizon_days) errores.push({ type: 'value_error', loc: ['body', 'problem', 'workers', i, k, d], msg: 'el medio día no existe', input: d });
  });
  return errores;
}

// «no puede ningún local ese medio día»: la forma del núcleo es la lista ['*']
const todoFuera = u => Array.isArray(u) && u.includes('*');
// ¿el problema deja a esa persona en ese local ese medio día (índice i)? allowed_shifts y unavailable
function libreEnIndice(pb, pid, i, localId) {
  const w = pb.workers.find(x => x.id === pid); if (!w) return null;
  const u = w.unavailable[i];
  return w.allowed_shifts.includes(localId) && !todoFuera(u) && !(Array.isArray(u) && u.includes(localId));
}
// lo que pide la casilla (local, medio día i) sumando todas las reglas de cobertura del problema: la de los mínimos
// (blanda) y la de las casillas cerradas (dura, a 0). { min, max } con max = null si no tiene tope
function demanda(pb, i, localId) {
  const out = { min: 0, max: null };
  for (const r of pb.rules.filter(x => x.type === 'coverage')) {
    const s = ((r.params.by_day || {})[i] || {})[localId];
    if (!s) continue;
    if (s.min !== undefined) out.min = Math.max(out.min, s.min);
    if (s.max !== undefined) out.max = out.max === null ? s.max : Math.min(out.max, s.max);
  }
  return out;
}

module.exports = { erroresPeticion, todoFuera, libreEnIndice, demanda };
