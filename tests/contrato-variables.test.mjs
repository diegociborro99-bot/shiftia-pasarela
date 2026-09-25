// CONTRATO DE LAS VARIABLES (24/09, reunión: «que lea todas las variables», Diego). Fase 4.
// Todo lo que se configura en Equipo lo leen igual TODOS los caminos (decisiones.md, principios 1 y 2):
// una sola puerta de reglas (evaluarPlaza), una sola puntuación (puntuar / candidatos) y un registro de
// quién lee cada campo (VARIABLES / SOLO_TEXTO). Esta prueba impide que un campo nuevo o un camino nuevo
// se salte una variable:
//  (a) inventario: toda clave de la ficha y del local (la semilla, lo que escribe el editor de la ficha
//      y lo que pone normalizarFicha) está declarada en VARIABLES o en SOLO_TEXTO;
//  (b) matriz: para cada variable, una persona con esa variable en una casilla conocida (la mañana de
//      Pasarela del miércoles 30/09) recorrida por todos los caminos (puerta, semana tipo, relleno,
//      Generador semanal, verificación, Cobertura con el estado de la pestaña, Revisión, condiciones,
//      selector y hoja impresa), con el trato esperado de la tabla de la auditoría; y con la regla del
//      grupo apagada o con p.inactivas = [k], el resultado idéntico al de la misma persona sin la variable;
//  (c) lint: fuera de la capa de lectura y del editor de la ficha nadie lee a pelo p.libra, .nuncaCon,
//      .cubreA, .partido.dias, .prefs, .cocina.*, .abre[ ni .vetos (lista blanca explícita);
//  (d) reloj: el resultado no cambia con el reloj puesto en dos fechas distintas.
// Y las pruebas en rojo de la auditoría que siguen pendientes, como casos (con la fase que las arregla).
// Las celdas que arregla una fase posterior van con `todo` y el hueco (F6 interruptores y textos de
// Equipo, F7 núcleo; las de la F5, cocina y quién abre, ya no tienen `todo`): salen en el informe de
// node --test sin tumbar npm test, y la fase que las arregla les quita el `todo`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const M = require(process.env.MODELO ? resolve(process.env.MODELO) : join(RAIZ, 'modelo.js'));

// ---------------------------------------------------------------------------------------------
// el mundo de la matriz: los cuatro locales de la semilla, sin semana tipo y con un mínimo solo en
// la casilla que se mira; Xavi (x) es la persona con la variable; Bea (b) o Yago (y), la rival igual
// que él (para lo que solo ordena); Ana (a), una compañera ya puesta; Fede (f), quien falta
// ---------------------------------------------------------------------------------------------
const LUNES = '2026-09-28', ISO = '2026-09-30', DOW = 3;
const NOMBRES = { x: 'Xavi', b: 'Bea', y: 'Yago', a: 'Ana', f: 'Fede' };
function persona(id, extra) {
  return Object.assign({ id, nombre: NOMBRES[id] || id, puesto: 'sala', locales: [], franjas: ['M', 'T'], libra: [], partido: { dias: [] }, cocina: { titular: [], reserva: [], soloDias: [] }, abre: {}, noAbre: [], nuncaCon: [], cubreA: [], vetos: [], contrato: { horasSemana: null }, ausencias: [], prefs: {}, nota: '', supuestos: [], noPrimero: [] }, extra || {});
}
const clon = x => JSON.parse(JSON.stringify(x));
function rango(cfg, desde, hasta) {
  const e = { y: +desde.slice(0, 4), m: +desde.slice(5, 7), days: [], asig: {}, apertura: {}, manual: {}, festivos: [], virtual: true };
  for (const iso of M.rangoIso(desde, hasta)) {
    const k = iso.slice(0, 7);
    cfg.meses[k] = cfg.meses[k] || { asig: {}, apertura: {}, manual: {} };
    const me = M.estadoDesde(cfg.meses, [], +iso.slice(0, 4), +iso.slice(5, 7));
    e.days.push(me.days.find(d => d.iso === iso));
    me.asig[iso] = me.asig[iso] || {}; me.apertura[iso] = me.apertura[iso] || {}; me.manual[iso] = me.manual[iso] || {};
    e.asig[iso] = me.asig[iso]; e.apertura[iso] = me.apertura[iso]; e.manual[iso] = me.manual[iso];
  }
  return e;
}
function mundo(esc, variante) {
  const cfg = Object.assign(M.semillaPasarela(), { patron: {}, meses: {}, eventos: [], cierresPuntuales: [], reglas: {} });
  for (const l of cfg.locales) {
    for (const f of M.FRANJAS) for (const d of M.TODOS) { l.minimos[f][d] = 0; if (l.supuestos && l.supuestos[f]) delete l.supuestos[f][d]; }
    l.cocina.obligatoria = { M: false, T: false }; l.primero = { M: null, T: null };
  }
  const tid = esc.tid || 'PASARELA_M';
  const { localId, franja } = M.partirTurno(tid);
  M.localDe(cfg, localId).minimos[franja][DOW] = esc.min || 1;
  const st = [persona('x', esc.base ? clon(esc.base) : {})];
  for (const [id, extra] of Object.entries(esc.otros || {})) st.push(persona(id, clon(extra)));
  if (esc.cfg) esc.cfg(cfg, st);
  const x = st[0];
  const aplica = variante === 'sin' || variante === 'sinReglaOff' ? esc.sin : esc.con;
  if (aplica) aplica(x, st, cfg);
  if (variante === 'reglaOff' || variante === 'sinReglaOff') cfg.reglas[esc.clave] = false;
  if (variante === 'fichaOff') M.personaDe(st, esc.quien || 'x').inactivas = [esc.clave];
  cfg.staff = st;
  return { cfg, st, x, esc, variante, tid, localId, franja };
}
// la planilla de partida (lo que ya estaba puesto) y el estado de la semana
function planilla(w) { const e = rango(w.cfg, M.addDias(LUNES, -7), M.addDias(LUNES, 13)); if (w.esc.planilla) w.esc.planilla(e, w); return e; }
const semanaEst = w => { planilla(w); return rango(w.cfg, LUNES, M.addDias(LUNES, 6)); };
const nombreX = 'Xavi';
function motivoDeX(pq) { for (const [m, qs] of Object.entries(pq || {})) if (qs.includes(nombreX)) return m; return null; }
function obsCasilla(w, e, huecos) {
  const hs = (huecos || []).filter(h => h.iso === ISO && h.turnoId === w.tid);
  const x = M.asignados(e, ISO, w.tid).find(y => y.pid === 'x');
  return {
    en: M.pidsEn(e, ISO, w.tid).slice(),
    x: x ? { cocina: !!x.cocina, avisos: (x.avisos || []).length > 0 } : null,
    huecos: hs.map(h => h.tipo || 'faltan'),
    motivoX: hs.map(h => motivoDeX(h.porQueNadie)).find(Boolean) || null,
  };
}
// forzar a Xavi en la casilla (lo que haría el encargado a mano)
function forzarX(w, e) { return M.asignar(e, w.cfg, w.st, ISO, w.tid, 'x', Object.assign({ origen: 'manual', forzar: true, permitirPartido: true, puesto: 'sala' }, w.esc.forzarOpts || {})).ok; }

// ---------- los caminos: cada uno devuelve lo que DECIDE sobre Xavi (no los textos de puntos) ----------
const CAMINOS = {
  puedeEstar(w) {
    const e = planilla(w);
    const r = M.puedeEstar(w.cfg, w.st, e, ISO, w.tid, 'x', w.esc.opts || {});
    const o = { ok: r.ok, regla: r.regla || null, motivo: r.motivo || null, avisos: r.avisos.length };
    if (w.esc.relaja) { const r2 = M.puedeEstar(w.cfg, w.st, e, ISO, w.tid, 'x', Object.assign({}, w.esc.opts, w.esc.relaja)); o.relajado = { ok: r2.ok, avisos: r2.avisos.length }; }
    return o;
  },
  patron(w) {
    const e = planilla(w);
    w.cfg.patron = { [DOW]: clon(w.esc.patron || [{ t: w.tid, p: 'x' }]) };
    const r = M.instanciarPatron(w.cfg, w.st, e, ISO, ISO);
    const x = M.asignados(e, ISO, w.tid).find(y => y.pid === 'x');
    // (fase 5, S18) y quién abre, y si la marca «a» quedó como puesta a mano
    return { en: M.pidsEn(e, ISO, w.tid).slice().sort(), xCocina: x ? !!x.cocina : null, rechazado: r.rechazados.some(y => y.pid === 'x'), abre: M.primeroDe(w.cfg, w.st, e, ISO, w.tid), abreManual: !!M.manualDe(e, ISO, w.tid).abre };
  },
  relleno(w) {
    const e = planilla(w);
    const o = obsCasilla(w, e, M.generarPlanilla(w.cfg, w.st, e, ISO, ISO, { sinPatron: true }).huecos);
    if (w.esc.relaja && w.esc.relaja.permitirPartido) { const w2 = mundo(w.esc, w.variante), e2 = planilla(w2); o.relajado = obsCasilla(w2, e2, M.generarPlanilla(w2.cfg, w2.st, e2, ISO, ISO, { sinPatron: true, permitirPartido: true }).huecos); }
    return o;
  },
  semana(w) {
    const e = semanaEst(w);
    const r = M.generarSemana(w.cfg, w.st, e, LUNES, { sinPatron: true });
    const o = obsCasilla(w, r.estado, r.huecos);
    if (w.esc.relaja && w.esc.relaja.permitirPartido) { const w2 = mundo(w.esc, w.variante), e2 = semanaEst(w2); const r2 = M.generarSemana(w2.cfg, w2.st, e2, LUNES, { sinPatron: true, permitirPartido: true }); o.relajado = obsCasilla(w2, r2.estado, r2.huecos); }
    return o;
  },
  verificar(w) {
    const e = semanaEst(w);
    const puesta = forzarX(w, e);
    return { puesta, conds: M.verificarSemana(w.cfg, w.st, e, LUNES).map(c => `${c.id}:${c.ok ? 'ok' : 'KO'}`) };
  },
  cobertura(w) {
    const e0 = planilla(w);
    if (!M.personaDe(w.st, 'f')) w.st.push(persona('f', { locales: [w.localId], franjas: [w.franja] }));
    if (w.esc.coberturaPrep) w.esc.coberturaPrep(w, e0);
    else assert.ok(M.asignar(e0, w.cfg, w.st, ISO, w.tid, 'f', {}).ok, 'Fede tiene que estar en la casilla');
    const inc = { pid: 'f', tipo: 'LD', dias: [ISO], desde: ISO, hasta: ISO };
    const rn = M.rangoNecesario(inc);   // el estado que pasa la pestaña (semanas enteras, S8)
    const est = rango(w.cfg, rn.desde, rn.hasta);
    const r = M.planesCobertura(w.cfg, w.st, M.clonarEstado(est), inc, {});
    // (revisión F4) la lista de candidatos de la Cobertura para el sitio de Fede, con la casilla ya sin él:
    // si Xavi sale y, si no, el motivo (descartes). Sin esto, una Cobertura que dejara de pedir la sala
    // (S34) pasaba el contrato porque el plan re-comprueba al asignar, y el porqué de la Cobertura mentía
    const eF = M.asignados(est, ISO, w.tid).find(y => y.pid === 'f'), coc = !!(eF && eF.cocina);
    const e1 = M.clonarEstado(est); M.desasignar(e1, ISO, w.tid, 'f');
    const descartes = [];
    const cands = M.candidatosCobertura(w.cfg, w.st, e1, ISO, w.tid, 'f', { cocina: coc, faltaCocina: coc, descartes });
    const d = descartes.find(y => y.pid === 'x');
    return {
      planes: r.planes.map(p => ({ relajado: !!p.relajado, asig: p.asignaciones.map(a => `${a.tid}|${a.pid}${a.yaEstaba ? '|ya' : ''}${a.avisos.length ? '|aviso' : ''}${a.cocina ? '|c' : ''}`), huecos: p.huecos.map(h => h.tipo) })),
      motivoX: r.planes.flatMap(p => p.huecos).map(h => motivoDeX(h.porQueNadie)).find(Boolean) || null,
      candX: { sale: cands.some(c => c.pid === 'x'), motivo: d ? d.motivo : null },
    };
  },
  revision(w) {
    const e = semanaEst(w);
    const puesta = forzarX(w, e);
    return { puesta, lineas: M.revisionMes(w.cfg, w.st, e, { desde: ISO, hasta: ISO }).filter(l => l.turnoId === w.tid || l.pid === 'x').map(l => `${l.tipo}|${l.nivel}|${l.msg}`) };
  },
  condiciones(w) { return M.condicionesDe(w.cfg, w.st, LUNES).filter(c => c.pid === 'x' || c.otro === 'x').map(c => `${c.id}${c.puntual ? '|puntual' : ''}`); },
  selector(w) {
    const e = planilla(w);
    const g = M.gruposSelector(w.cfg, w.st, e, ISO, w.tid);
    for (const grupo of ['cocina', 'pueden', 'conAviso', 'noPueden']) {
      const i = (g[grupo] || []).findIndex(c => c.pid === 'x');
      if (i >= 0) { const c = g[grupo][i]; return { grupo, pos: i, regla: c.regla || null, motivo: c.motivo || null, forzable: c.forzable === undefined ? null : !!c.forzable }; }
    }
    return { grupo: null };
  },
  destrapa(w) {
    const e = planilla(w);
    const d = M.destrapa(w.cfg, w.st, e, ISO, w.tid, 'x', { primero: !!w.esc.huecoPrimero });
    return d ? { regla: d.regla, motivo: d.motivo } : null;
  },
  // quién abre: la búsqueda del 1.º (candidatos con opts.primero)
  primero(w) { const e = planilla(w); return M.candidatosPara(w.cfg, w.st, e, ISO, w.tid, { primero: true }).map(c => c.pid); },
};
const obs = (esc, camino, variante) => CAMINOS[camino](mundo(esc, variante));

// ---------- qué quiere decir cada trato en cada camino ----------
const X = (c, s) => c.includes('x') && !s.includes('x');
const COMPROBAR = {
  // bloquea: la puerta dice que no, con la regla de la variable, y ningún camino automático la pone
  bloquea(camino, c, s, esc) {
    switch (camino) {
      case 'puedeEstar': return !c.ok && c.regla === esc.regla && !!c.motivo;
      case 'patron': return !c.en.includes('x') && s.en.includes('x');
      case 'relleno': case 'semana': return !c.en.includes('x') && s.en.includes('x') && !!c.motivoX;
      case 'cobertura': return c.planes.every(p => !p.asig.some(a => a.includes('|x'))) && s.planes.some(p => p.asig.some(a => a.includes('|x'))) && !c.candX.sale && !!c.candX.motivo && s.candX.sale;
      case 'selector': return c.grupo === 'noPueden' && c.regla === esc.regla && !!c.motivo && s.grupo !== 'noPueden';
      case 'verificar': return c.conds.some(k => k.endsWith(':KO') && !s.conds.includes(k));
      case 'revision': return c.lineas.some(l => !s.lineas.includes(l));
      case 'primero': return !c.includes('x') && s.includes('x');
    }
    return false;
  },
  // relaja: bloquea con las reglas del grupo; con la opción que lo relaja entra, con aviso
  relaja(camino, c, s, esc) {
    switch (camino) {
      case 'puedeEstar': return !c.ok && c.regla === esc.regla && c.relajado && c.relajado.ok && c.relajado.avisos > 0;
      case 'relleno': case 'semana': return !c.en.includes('x') && !!c.motivoX && c.relajado && c.relajado.en.includes('x') && c.relajado.x && c.relajado.x.avisos;
      case 'cobertura': return c.planes.some(p => p.relajado && p.asig.some(a => a.includes('|x|aviso'))) && c.planes.filter(p => !p.relajado).every(p => !p.asig.some(a => a.includes('|x')));
      case 'selector': return c.grupo === 'conAviso';
    }
    return false;
  },
  // se relaja sola cuando no hay nadie más (el «nunca con» flexible, José 17/09)
  relajaSola(camino, c) {
    if (camino === 'relleno' || camino === 'semana') return c.en.includes('x') && c.x && c.x.avisos;
    if (camino === 'cobertura') return c.planes.length && c.planes[0].asig.some(a => a.includes('|x|aviso'));
    return false;
  },
  // ordena: no bloquea, pero cambia a quién se prefiere (Xavi frente a su rival idéntica)
  ordena(camino, c, s) {
    if (camino === 'relleno' || camino === 'semana') return JSON.stringify(c.en) !== JSON.stringify(s.en) && c.huecos.length === s.huecos.length;
    if (camino === 'cobertura') return JSON.stringify(c.planes[0] && c.planes[0].asig) !== JSON.stringify(s.planes[0] && s.planes[0].asig);
    if (camino === 'selector') return c.grupo === s.grupo && c.pos !== s.pos;
    if (camino === 'primero') return c.indexOf('x') !== s.indexOf('x');
    return false;
  },
  // la designación «cubre a»: con ella entra en el sitio de quien falta; sin ella, nadie
  cubre(camino, c, s) { return c.en.includes('x') && !s.en.includes('x'); },
  // solo le impide salir el primero: entra, pero la 1.ª posición se queda como hueco
  primero(camino, c, s) {
    if (camino === 'relleno' || camino === 'semana') return c.en.includes('x') && c.huecos.includes('primero') && !s.huecos.includes('primero');
    if (camino === 'cobertura') return c.planes[0].asig.some(a => a.includes('|x')) && c.planes[0].huecos.includes('primero') && !s.planes[0].huecos.includes('primero');
    // (fase 5, S18) la semana tipo la pone, pero no la deja abrir
    if (camino === 'patron') return c.en.includes('x') && c.abre !== 'x' && s.abre === 'x';
    return false;
  },
  // la cocina: con la variable la lleva; sin ella, no
  cocina(camino, c, s) {
    if (camino === 'relleno' || camino === 'semana') return !!(c.x && c.x.cocina) && !(s.x && s.x.cocina);
    if (camino === 'cobertura') return c.planes[0].asig.some(a => a.includes('|x') && a.endsWith('|c')) && !s.planes[0].asig.some(a => a.includes('|x') && a.endsWith('|c'));
    if (camino === 'selector') return c.grupo === 'cocina' && s.grupo !== 'cocina';
    if (camino === 'patron') return c.xCocina === true && s.xCocina !== true;
    return false;
  },
  noCocina(camino, c, s) { return COMPROBAR.cocina(camino, s, c); },
  habilita(camino, c, s, esc) { return c.ok && !s.ok && s.regla === esc.regla; },
  cerrado(camino, c) { return !c.en.includes('x') && !c.huecos.length; },
  llena(camino, c, s) { return COMPROBAR.cubre(camino, c.planes ? { en: (c.planes[0] || { asig: [] }).asig.map(a => a.split('|')[1]) } : c, s.planes ? { en: (s.planes[0] || { asig: [] }).asig.map(a => a.split('|')[1]) } : s); },
  // se cumple: la condición existe y la planilla (con Xavi puesto a mano) la cumple
  cumple(camino, c, s, esc) { return c.conds.some(k => k.startsWith(esc.cond) && k.endsWith(':ok')); },
  lista(camino, c, s, esc) { return c.some(id => id.startsWith(esc.cond)); },
  pista(camino, c, s, esc) { return !!c && c.regla === esc.regla && !!c.motivo; },
  sinPista(camino, c) { return c === null; },
  // no la lee: la misma decisión que sin la variable
  nada(camino, c, s) { return JSON.stringify(c) === JSON.stringify(s); },
};

// ---------- las variables (la tabla de la auditoría, res2/tabla.md, con los huecos de la fase 4 arreglados) ----------
const TODAS = ['puedeEstar', 'patron', 'relleno', 'semana', 'verificar', 'cobertura', 'revision', 'condiciones', 'selector', 'destrapa'];
const duro = extra => Object.assign({ puedeEstar: 'bloquea', patron: 'bloquea', relleno: 'bloquea', semana: 'bloquea', verificar: 'bloquea', cobertura: 'bloquea', revision: 'bloquea', condiciones: 'lista', selector: 'bloquea', destrapa: 'pista' }, extra || {});
const nada = extra => Object.assign(Object.fromEntries(TODAS.map(k => [k, 'nada'])), extra || {});
const conA = { otros: { a: { locales: ['PASARELA'] } }, min: 2, planilla: (e, w) => assert.ok(M.asignar(e, w.cfg, w.st, ISO, w.tid, 'a', {}).ok) };
const mCocina = { tid: 'MONACO_M', opts: { puesto: 'cocina' }, cfg: cfg => { M.localDe(cfg, 'MONACO').cocina.obligatoria = { M: true, T: false }; },
  coberturaPrep: (w, e) => { M.personaDe(w.st, 'f').cocina = { titular: ['MONACO'], reserva: [], soloDias: [] }; assert.ok(M.asignar(e, w.cfg, w.st, ISO, w.tid, 'f', { cocina: true }).ok); } };
const ESCENARIOS = [
  { id: 'locales', campo: 'locales', clave: 'locales', regla: 'locales', trato: 'forzable', cond: 'p:x:locales', con: x => { x.locales = ['ZAPA']; }, celdas: duro() },
  { id: 'franjas', campo: 'franjas', clave: 'franjas', regla: 'franjas', trato: 'forzable', cond: 'p:x:franjas', con: x => { x.franjas = ['T']; }, celdas: duro() },
  { id: 'libra', campo: 'libra', clave: 'libra', regla: 'libra', trato: 'forzable', cond: 'p:x:libra', con: x => { x.libra = [DOW]; }, celdas: duro() },
  // Dulce, sin día fijo y con un día libre puntual (auditoría D4, caso c)
  { id: 'libraPuntual', campo: 'libraPuntual', clave: 'libra', regla: 'libra', trato: 'forzable', cond: 'p:x:libra|puntual', con: x => { x.libraPuntual = [{ semana: LUNES, dias: [DOW] }]; }, celdas: duro() },
  { id: 'ausencias', campo: 'ausencias', clave: null, regla: 'ausencia', trato: 'duro', con: x => { x.ausencias = [{ tipo: 'VAC', desde: ISO, hasta: ISO }]; },
    celdas: duro({ verificar: '–', revision: '–', condiciones: 'nada', destrapa: 'sinPista' }) },
  // D10: el permiso de la tarde no le quita la mañana
  { id: 'ausencias por franja', campo: 'ausencias', clave: null, trato: 'duro', con: x => { x.ausencias = [{ tipo: 'PERM', desde: ISO, hasta: ISO, franjas: ['T'] }]; }, celdas: nada() },
  // (revisión F4) el standby es una condición del Generador: salía como si estuviera activa
  { id: 'standby', campo: 'standby', clave: null, regla: 'standby', trato: 'forzable', cond: 'p:x:standby', con: x => { x.standby = true; }, celdas: duro() },
  { id: 'vetos', campo: 'vetos', clave: 'vetos', regla: 'vetos', trato: 'forzable', cond: 'p:x:veto:PASARELA:M', con: x => { x.vetos = [{ localId: 'PASARELA', franja: 'M', dow: DOW }]; }, celdas: duro() },
  // S41 (L4): el veto de los lunes no frena un miércoles, tampoco en la hoja impresa
  { id: 'vetos de otro día', campo: 'vetos', clave: 'vetos', regla: 'vetos', trato: 'forzable', cond: 'p:x:veto:PASARELA:M', con: x => { x.vetos = [{ localId: 'PASARELA', franja: 'M', dow: 1 }]; },
    celdas: nada({ verificar: 'cumple', condiciones: 'lista' }) },
  { id: 'partido', campo: 'partido.dias', clave: 'partido', regla: 'partido', trato: 'relajable', cond: 'p:x:partido', relaja: { permitirPartido: true },
    planilla: (e, w) => assert.ok(M.asignar(e, w.cfg, w.st, ISO, 'PASARELA_T', 'x', {}).ok),
    con: x => { x.partido = { dias: [5] }; }, sin: x => { x.partido = { siempre: true }; },
    celdas: duro({ puedeEstar: 'relaja', relleno: 'relaja', semana: 'relaja', cobertura: 'relaja', selector: 'relaja' }) },
  Object.assign({ id: 'nuncaCon', campo: 'nuncaCon', clave: 'nuncaCon', regla: 'nuncaCon', trato: 'forzable', cond: 'p:x:nuncaCon:a', con: x => { x.nuncaCon = ['a']; }, celdas: duro(),
    apagada: { revision: 'F6 · S13: la Revisión marca «no pueden coincidir» con «Nunca con» apagado (revisarTurno)' } }, conA),
  Object.assign({ id: 'nuncaCon (en la ficha de la otra)', campo: 'nuncaCon', clave: 'nuncaCon', regla: 'nuncaCon', trato: 'forzable', quien: 'a', cond: 'p:a:nuncaCon:x', con: (x, st) => { M.personaDe(st, 'a').nuncaCon = ['x']; }, celdas: duro(),
    apagada: { revision: 'F6 · S13: la Revisión marca «no pueden coincidir» con «Nunca con» apagado (revisarTurno)' } }, conA),
  // la pareja flexible (José, 17/09: «se respeta si hay gente suficiente; si no, se relaja y queda el
  // aviso»); sin la variable no hay pareja, y con «Nunca con» apagado tampoco
  Object.assign({ id: 'nuncaConFlexible', campo: 'nuncaConFlexible', clave: 'nuncaCon', regla: 'nuncaCon', trato: 'relajable', cond: 'p:x:nuncaCon:a', relaja: { relajarNuncaCon: true },
    con: x => { x.nuncaCon = ['a']; x.nuncaConFlexible = true; },
    celdas: duro({ puedeEstar: 'relaja', relleno: ['relajaSola', 'F6 · S24: el relleno no relaja el «nunca con» flexible cuando no hay nadie más'], semana: ['relajaSola', 'F6 · S24'], cobertura: ['relajaSola', 'F6 · S24: el plan relajado no relaja el «nunca con» flexible'], selector: ['relaja', 'F6 · S24: el selector no lo ofrece «con aviso»'], condiciones: 'lista', destrapa: 'pista', verificar: 'bloquea', revision: 'bloquea' }),
    apagada: { revision: 'F6 · S13' } }, conA),
  // la designación «cubre a» (D1, D2, D13): prioridad en el sitio de quien falta
  { id: 'cubreA', campo: 'cubreA', clave: 'cubreA', trato: 'punt', cond: 'p:x:cubre:f:',
    otros: { b: {}, f: { locales: ['PASARELA'], franjas: ['M'], ausencias: [{ tipo: 'VAC', desde: ISO, hasta: ISO }] } },
    con: x => { x.cubreA = [{ pid: 'f' }]; }, patron: [{ t: 'PASARELA_M', p: 'f' }],
    coberturaPrep: (w, e) => { M.personaDe(w.st, 'f').ausencias = []; assert.ok(M.asignar(e, w.cfg, w.st, ISO, w.tid, 'f', {}).ok); },
    celdas: nada({ patron: 'cubre', relleno: 'ordena', semana: 'ordena', cobertura: 'ordena', selector: 'ordena', verificar: 'cumple', condiciones: 'lista' }) },
  // S34: quien solo hace cocina no refuerza la sala
  // (revisión F4) y el Generador la enseña y la comprueba («Hojan solo hace cocina»)
  { id: 'soloCocina', campo: 'soloCocina', clave: 'cocina', regla: 'cocina', trato: 'forzable', cond: 'p:x:soloCocina', opts: { puesto: 'sala' }, con: x => { x.soloCocina = true; },
    celdas: duro({ patron: 'nada' }) },
  // Fase 5 (24/09), qué apaga cada interruptor de la cocina:
  //  · «Cocina» en la FICHA (S15) apaga sus límites —«solo unos días», «nunca», «solo hace cocina»—, no que
  //    sea titular o reserva de un local: eso es un dato de la plaza (como el «por», D12), y se cambia en la
  //    ficha o en Ajustes del local. Apagada en la ficha, titular = igual que encendida (apagadaRef 'con');
  //  · «Cocina» del GRUPO (S16, D5) apaga la cocina entera: nadie la busca, la exige ni la marca sola, ni
  //    se miran los límites. Apagada, ser titular no cambia nada: igual que la misma persona sin serlo y con
  //    la regla también apagada (apagadaRef 'sinReglaOff'), y los límites, igual que sin ellos.
  Object.assign({ id: 'cocina (titular)', campo: 'cocina.titular', clave: 'cocina', regla: 'cocina', trato: 'forzable', con: x => { x.cocina.titular = ['MONACO']; },
    celdas: { puedeEstar: 'habilita', relleno: 'cocina', semana: 'cocina', cobertura: 'cocina', selector: 'cocina', condiciones: 'nada' },
    apagadaRef: { reglaOff: 'sinReglaOff', fichaOff: 'con' } }, mCocina),
  Object.assign({ id: 'cocina (reserva)', campo: 'cocina.reserva', clave: 'cocina', regla: 'cocina', trato: 'forzable', con: x => { x.cocina.reserva = ['MONACO']; },
    celdas: { puedeEstar: 'habilita', relleno: 'cocina', selector: 'cocina' }, apagadaRef: { reglaOff: 'sinReglaOff', fichaOff: 'con' } }, mCocina),
  Object.assign({ id: 'cocina (solo unos días)', campo: 'cocina.soloDias', clave: 'cocina', regla: 'cocina', trato: 'forzable', cond: 'p:x:cocina', base: { cocina: { titular: ['MONACO'], reserva: [], soloDias: [] } },
    con: x => { x.cocina.soloDias = [2]; }, forzarOpts: { puesto: 'cocina', cocina: true }, patron: [{ t: 'MONACO_M', p: 'x', c: 1 }],
    celdas: { puedeEstar: 'bloquea', relleno: 'noCocina', semana: 'noCocina', cobertura: 'noCocina', selector: 'noCocina', condiciones: 'lista', verificar: 'bloquea', patron: 'noCocina' },
    apagadaRef: { reglaOff: 'sinReglaOff' } }, mCocina),
  Object.assign({ id: 'cocina (nunca)', campo: 'cocina.nunca', clave: 'cocina', regla: 'cocina', trato: 'forzable', cond: 'p:x:cocina', base: { cocina: { titular: ['MONACO'], reserva: [], soloDias: [] } },
    con: x => { x.cocina.nunca = true; }, celdas: { puedeEstar: 'bloquea', relleno: 'noCocina', selector: 'noCocina', condiciones: 'lista' }, apagadaRef: { reglaOff: 'sinReglaOff' } }, mCocina),
  // S36 (fase 5): quien figura en la cocina de un local en Ajustes puede llevarla, en todos los caminos. Por
  // Ajustes (ponerCocinaLocal, que escribe también la ficha) y en datos de antes que solo la tenían en la
  // lista del local (el Generador ya la anunciaba y nadie le daba la cocina)
  Object.assign({ id: 'cocina titular en Ajustes del local', campo: 'local.cocina.titulares', ambito: 'local', clave: 'cocina', regla: 'cocina', trato: 'forzable',
    con: (x, st, cfg) => { M.ponerCocinaLocal(cfg, st, 'MONACO', { lista: 'titulares', franja: 'M', pid: 'x', pos: 0 }); },
    celdas: { puedeEstar: 'habilita', relleno: 'cocina', semana: 'cocina', cobertura: 'cocina', selector: 'cocina', patron: 'cocina' }, patron: [{ t: 'MONACO_M', p: 'x', c: 1 }],
    apagadaRef: { reglaOff: 'sinReglaOff', fichaOff: 'con' } }, mCocina),
  Object.assign({ id: 'cocina titular solo en la lista del local (datos de antes)', campo: 'local.cocina.titulares', ambito: 'local', clave: 'cocina', regla: 'cocina', trato: 'forzable',
    con: (x, st, cfg) => { M.localDe(cfg, 'MONACO').cocina.titulares.M.unshift('x'); },
    celdas: { puedeEstar: 'habilita', relleno: 'cocina', semana: 'cocina', cobertura: 'cocina', selector: 'cocina' },
    apagadaRef: { reglaOff: 'sinReglaOff', fichaOff: 'con' } }, mCocina),
  // S33 (José, 17/09): dos apoyos no se quedan solos
  { id: 'puesto apoyo', campo: 'puesto', clave: null, regla: 'soloApoyos', trato: 'relajable', con: x => { x.puesto = 'apoyo'; },
    celdas: duro({ puedeEstar: 'nada', patron: 'nada', selector: 'relaja', condiciones: 'nada' }) },
  { id: 'comodin', campo: 'comodin', clave: null, trato: 'punt', base: { locales: ['PASARELA'] }, otros: { b: { locales: ['PASARELA'] }, f: { locales: ['PASARELA'], franjas: ['M'] } },
    con: x => { x.comodin = true; }, celdas: nada({ relleno: 'ordena', semana: 'ordena', cobertura: 'ordena', selector: 'ordena' }) },
  { id: 'abre', campo: 'abre', clave: 'abre', trato: 'punt', cond: 'p:x:abre:PASARELA:M', otros: { b: {} }, con: x => { x.abre = { PASARELA: ['M'] }; },
    celdas: { primero: 'ordena', condiciones: 'lista', verificar: 'cumple', puedeEstar: 'nada', destrapa: 'nada' } },
  // S18/S19 (fase 5): «Quién abre» del local es una condición del Generador y obedece los interruptores
  // (la regla del grupo «Sale el primero» y la característica de la ficha de quien abre)
  { id: 'Quién abre (local)', campo: 'local.primero', ambito: 'local', clave: 'abre', trato: 'punt', cond: 'loc:PASARELA:primero:M', otros: { b: {} },
    con: (x, st, cfg) => { M.localDe(cfg, 'PASARELA').primero.M = 'x'; },
    celdas: { primero: 'ordena', condiciones: 'lista', verificar: 'cumple', puedeEstar: 'nada', destrapa: 'nada' } },
  { id: 'noPrimero', campo: 'noPrimero', clave: 'noPrimero', regla: 'noPrimero', trato: 'forzable', cond: 'p:x:noPrimero', huecoPrimero: true, con: x => { x.noPrimero = ['M']; },
    celdas: { puedeEstar: 'nada', patron: 'primero', relleno: 'primero', semana: 'primero', cobertura: 'primero', verificar: 'cumple', revision: 'bloquea', condiciones: 'lista', selector: 'nada', destrapa: 'pista', primero: 'bloquea' } },
  { id: 'noAbre', campo: 'noAbre', clave: 'noAbre', regla: 'noAbre', trato: 'forzable', cond: 'p:x:noAbre:PASARELA', huecoPrimero: true, con: x => { x.noAbre = ['PASARELA']; },
    celdas: { puedeEstar: 'nada', patron: 'primero', relleno: 'primero', semana: 'primero', cobertura: 'primero', verificar: 'cumple', revision: 'bloquea', condiciones: 'lista', selector: 'nada', destrapa: 'pista', primero: 'bloquea' } },
  { id: 'prefs', campo: 'prefs.evitaDows', clave: 'prefs', trato: 'punt', otros: { y: {} }, con: x => { x.prefs = { evitaDows: [DOW] }; },
    celdas: nada({ relleno: 'ordena', semana: 'ordena', cobertura: 'ordena', selector: 'ordena' }), apagada: Object.fromEntries(['relleno', 'semana', 'cobertura', 'selector'].map(k => [k, 'F6 · S14: «Preferencias» apagada sigue restando 40 puntos (evita)'])) },
  { id: 'contrato', campo: 'contrato.horasSemana', clave: 'contrato', trato: 'info', con: x => { x.contrato = { horasSemana: 8 }; }, celdas: nada() },
  // el local
  { id: 'Cuándo abre (local)', campo: 'local.abre', ambito: 'local', clave: null, regla: 'cerrado', trato: 'duro', con: (x, st, cfg) => { const l = M.localDe(cfg, 'PASARELA'); l.abre.M = l.abre.M.filter(d => d !== DOW); },
    celdas: { puedeEstar: 'bloquea', patron: 'bloquea', relleno: 'cerrado', semana: 'cerrado', selector: 'bloquea', destrapa: 'sinPista' } },
  { id: 'mínimos (local)', campo: 'local.minimos', ambito: 'local', clave: 'minimos', trato: 'duro', sin: (x, st, cfg) => { M.localDe(cfg, 'PASARELA').minimos.M[DOW] = 0; },
    celdas: { relleno: 'cubre', semana: 'cubre', cobertura: 'llena' }, apagada: 'F6 · S16 (D5): con «Mínimos» apagado se siguen pidiendo' },
];
const REGLAS_GRUPO = new Set(M.REGLAS.map(r => r.k));
const CARACT = new Set(M.CARACTERISTICAS.map(c => c.k));

// ---------- (b) la matriz ----------
for (const esc of ESCENARIOS) {
  test(`VARIABLES declara «${esc.campo}» con su trato (${esc.trato})`, () => {
    assert.ok(Array.isArray(M.VARIABLES), 'no existe el registro VARIABLES');
    const v = M.VARIABLES.find(z => z.campo === esc.campo);
    assert.ok(v, `falta «${esc.campo}» en VARIABLES`);
    assert.equal(v.trato, esc.trato);
    assert.equal(v.clave === undefined ? null : v.clave, esc.clave);
  });
  for (const [camino, celda] of Object.entries(esc.celdas)) {
    const [trato, pend] = Array.isArray(celda) ? celda : [celda, null];
    if (trato === '–') continue;
    test(`matriz · ${esc.id} · ${camino}: ${trato}`, pend ? { todo: pend } : {}, () => {
      const c = obs(esc, camino, 'con'), s = obs(esc, camino, 'sin');
      assert.ok(COMPROBAR[trato](camino, c, s, esc), `con la variable: ${JSON.stringify(c)}\nsin ella: ${JSON.stringify(s)}`);
    });
    // con el interruptor apagado (la regla del grupo y, aparte, la característica de la ficha), idéntico
    // a la misma persona sin la variable; las condiciones del Generador: no se lista
    if (!esc.clave) continue;
    for (const variante of ['reglaOff', 'fichaOff']) {
      if (variante === 'reglaOff' && !REGLAS_GRUPO.has(esc.clave)) continue;   // sin interruptor de grupo en Equipo
      if (variante === 'fichaOff' && !CARACT.has(esc.clave)) continue;
      const pa = typeof esc.apagada === 'string' ? esc.apagada : (esc.apagada || {})[camino];
      // (fase 5) con qué se compara: por defecto, la misma persona sin la variable; la cocina declara la suya
      // (apagadaRef: 'con' = el interruptor no la quita; 'sinReglaOff' = sin la variable y con la regla apagada)
      const ref = (esc.apagadaRef || {})[variante] || 'sin';
      const dice = { sin: 'sin la variable', con: 'igual que encendida (no la quita)', sinReglaOff: 'sin la variable, con la regla también apagada' }[ref];
      test(`matriz · ${esc.id} · ${camino}: apagada (${variante === 'reglaOff' ? 'regla del grupo' : 'en la ficha'}) = ${dice}`, pa ? { todo: pa } : {}, () => {
        const o = obs(esc, camino, variante);
        if (ref === 'sin' && camino === 'condiciones') assert.ok(!o.some(id => id.startsWith(esc.cond || '·')), `se lista apagada: ${o}`);
        else if (ref === 'sin' && camino === 'verificar') assert.ok(!o.conds.some(k => k.startsWith(esc.cond || '·')), `se verifica apagada: ${o.conds}`);
        else assert.deepEqual(o, obs(esc, camino, ref));
      });
    }
  }
}
// (revisión F4) «cubre a» × partido (D1): la designación autoriza el partido para cubrir a X SOLO en la
// casilla de X; en otra casilla, o con un «por X» sin la designación, el partido sigue siendo un partido no
// declarado. Sin esta fila, una puerta que autorizara el partido con cualquier «cubrePor» pasaba el contrato
test('matriz · cubreA × partido: autorizado en la casilla de quien falta; no en otra casilla ni sin la designación', () => {
  const esc = { tid: 'PASARELA_M', otros: { f: { locales: ['PASARELA'], franjas: ['M'], ausencias: [{ tipo: 'VAC', desde: ISO, hasta: ISO }] } },
    con: x => { x.cubreA = [{ pid: 'f' }]; }, planilla: (e, w) => assert.ok(M.asignar(e, w.cfg, w.st, ISO, 'PASARELA_T', 'x', {}).ok) };
  const w = mundo(esc, 'con'), e = planilla(w);
  // en la casilla de Fede (la mañana de Pasarela, su plaza de la semana tipo): entra, con el aviso autorizado
  w.cfg.patron = { [DOW]: [{ t: 'PASARELA_M', p: 'f' }] };
  const r = M.puedeEstar(w.cfg, w.st, e, ISO, 'PASARELA_M', 'x', { puesto: 'sala', cubrePor: 'f' });
  assert.ok(r.ok && r.autorizados.some(a => a.k === 'partido'), JSON.stringify(r));
  // en otra casilla (la mañana de Zapatillera), no: allí no cubre a nadie
  const r2 = M.puedeEstar(w.cfg, w.st, e, ISO, 'ZAPA_M', 'x', { puesto: 'sala', cubrePor: 'f' });
  assert.ok(!r2.ok && r2.regla === 'partido', JSON.stringify(r2));
  // la semana tipo la pone «por Fede» en su casilla (su partido, autorizado). (Cada planilla, en su mundo:
  // planilla() pone a Xavi en la tarde y dos veces en el mismo mundo sería un duplicado)
  const w2 = mundo(esc, 'con'), e2 = planilla(w2);
  w2.cfg.patron = { [DOW]: [{ t: 'PASARELA_M', p: 'f' }] };
  M.instanciarPatron(w2.cfg, w2.st, e2, ISO, ISO);
  const en = M.asignados(e2, ISO, 'PASARELA_M').find(y => y.pid === 'x');
  assert.ok(en && en.por === 'f' && !(en.avisos || []).length, JSON.stringify(M.asignados(e2, ISO, 'PASARELA_M')));
  // sin la designación, un «por Fede» puesto a mano no autoriza el partido: la Revisión sigue avisando
  const w3 = mundo(esc, 'sin'), e3 = planilla(w3);
  assert.ok(M.asignar(e3, w3.cfg, w3.st, ISO, 'PASARELA_M', 'x', { forzar: true, permitirPartido: true, puesto: 'sala', por: 'f' }).ok);
  const rv = M.revisarEntrada(w3.cfg, w3.st, e3, ISO, 'PASARELA_M', 'x');
  assert.ok(rv.avisos.some(a => /partido/.test(a)) && !rv.autorizados.length, JSON.stringify(rv));
  const w4 = mundo(esc, 'sin');
  const rv2 = M.puedeEstar(w4.cfg, w4.st, planilla(w4), ISO, 'PASARELA_M', 'x', { puesto: 'sala', cubrePor: 'f' });
  assert.ok(!rv2.ok && rv2.regla === 'partido', JSON.stringify(rv2));
});
// lo que es solo texto no decide nada (ni el nombre de una nota ni el día libre variable)
test('matriz · lo que es solo texto (nota, supuestos, libre variable, color, nota de preferencias) no cambia ninguna decisión', () => {
  const esc = { id: 'texto', con: x => { x.nota = 'de prueba'; x.supuestos = ['uno']; x.libreVariable = true; x.color = '#123456'; x.prefs = { nota: 'prefiere mañanas' }; } };
  for (const camino of ['puedeEstar', 'relleno', 'semana', 'cobertura', 'selector', 'destrapa', 'revision']) assert.deepEqual(obs(esc, camino, 'con'), obs(esc, camino, 'sin'), camino);
});

// ---------- (a) inventario ----------
test('inventario: toda clave de la ficha y del local está en VARIABLES o en SOLO_TEXTO', () => {
  assert.ok(Array.isArray(M.VARIABLES) && Array.isArray(M.SOLO_TEXTO), 'faltan VARIABLES / SOLO_TEXTO');
  const declaradas = new Set([...M.VARIABLES.map(v => v.campo), ...M.SOLO_TEXTO]);
  const cfg = M.semillaPasarela();
  const persona0 = new Set(), local0 = new Set();
  const anidadas = { partido: 1, cocina: 1, prefs: 1, contrato: 1 };
  for (const p of cfg.staff) for (const [k, v] of Object.entries(p)) {
    if (anidadas[k] && v && typeof v === 'object' && !Array.isArray(v)) for (const k2 of Object.keys(v)) persona0.add(`${k}.${k2}`);
    else persona0.add(k);
  }
  for (const l of cfg.locales) for (const [k, v] of Object.entries(l)) {
    if (k === 'cocina' && v) for (const k2 of Object.keys(v)) local0.add(`local.cocina.${k2}`);
    else local0.add('local.' + k);
  }
  // lo que escribe el editor de la ficha (20-ficha-persona.js, 19-vista-equipo.js) y lo que pone normalizarFicha
  for (const f of ['20-ficha-persona.js', '19-vista-equipo.js', '02-estado-y-modelo-datos.js']) {
    const src = readFileSync(join(RAIZ, 'src', 'app', f), 'utf8');
    for (const m of src.matchAll(/\b(?:x|p)\.([a-zA-Z]+)(?:\.([a-zA-Z]+))?\s*(?:=[^=>]|\.push\(|\.splice\()/g)) {
      if (['id', 'inactivas'].includes(m[1]) && !m[2]) { persona0.add(m[1]); continue; }
      persona0.add(anidadas[m[1]] && m[2] ? `${m[1]}.${m[2]}` : m[1]);
    }
  }
  // (revisión F4) y el alta de una persona nueva (personaNueva): un campo añadido solo ahí también cuenta
  const nueva = funcionDeApp('19-vista-equipo.js', 'personaNueva')('Prueba');
  for (const [k, v] of Object.entries(nueva)) {
    if (anidadas[k] && v && typeof v === 'object' && !Array.isArray(v)) for (const k2 of Object.keys(v)) persona0.add(`${k}.${k2}`);
    else persona0.add(k);
  }
  for (const k of ['libraPuntual', 'inactivas']) persona0.add(k);   // los guarda el modelo (ponerLibraPuntual) y el interruptor de la ficha
  for (const k of ['partido', 'cocina', 'prefs', 'contrato']) persona0.delete(k);
  const falta = [...persona0, ...local0].filter(k => !declaradas.has(k));
  assert.deepEqual(falta, [], 'campos que nadie ha declarado quién los lee');
  for (const v of M.VARIABLES) {
    assert.ok(['forzable', 'relajable', 'punt', 'info', 'duro'].includes(v.trato), `${v.campo}: trato «${v.trato}»`);
    if (v.texto) assert.equal(typeof v.texto, 'function');
    if (v.verificar) assert.equal(typeof v.verificar, 'function');
  }
  assert.equal(new Set(M.VARIABLES.map(v => v.campo)).size, M.VARIABLES.length, 'cada campo una sola vez');
});
test('las condiciones del Generador salen de VARIABLES (cada condición de persona dice de qué variable sale)', () => {
  const cfg = M.semillaPasarela();
  const cs = M.condicionesDe(cfg, cfg.staff, LUNES).filter(c => c.tipo === 'persona');
  assert.ok(cs.length > 20);
  const campos = new Set((M.VARIABLES || []).map(v => v.campo));
  const sin = cs.filter(c => !c.variable || !campos.has(c.variable));
  assert.deepEqual(sin.map(c => c.id), [], 'condiciones que no salen del registro');
});

// ---------- (c) lint ----------
// Fuera de la capa de lectura y del editor de la ficha nadie lee estos campos a pelo. Cada sitio
// permitido está en la lista, con el porqué; uno nuevo rompe la prueba hasta que se pase a la capa.
const PERMITIDOS = {
  'modelo.js': {
    // la capa de lectura de la ficha (una sola lectura de cada campo)
    vetoDe: 'capa', libraEn: 'capa', librasPuntuales: 'capa', ponerLibraPuntual: 'capa', textoCambioLibre: 'capa', cambioDeLibre: 'capa', partidoEn: 'capa', estadoDia: 'capa',
    cubreEnCasilla: 'capa', quienLeCubre: 'capa', porQueNoCubre: 'capa', puedeCocina: 'capa', cocinasTitular: 'capa', incompatibles: 'capa', evita: 'capa', abreFijo: 'capa', VARIABLES: 'el registro: texto y verificación de cada variable',
    // la cocina entre la ficha y Ajustes del local (fase 5, S36): una sola lectura (cocinaDe) y una sola escritura
    cocinaDe: 'capa', nuncaCocina: 'capa', ponerCocinaFicha: 'capa (escribe la ficha y la lista del local)', ponerCocinaLocal: 'capa (escribe la lista del local y la ficha)', migrarCocinaLocales: 'migración: la ficha y Ajustes del local, de acuerdo',
    // la Revisión aún marca la pareja sin mirar el interruptor: fase 6 (S13)
    revisarTurno: 'F6 · S13',
    // el núcleo: fase 7 (S25)
    toProblem: 'F7 · S25',
    // los datos de partida
    semillaPasarela: 'semilla',
  },
  'src/app/02-estado-y-modelo-datos.js': { normalizarFicha: 'migración: los campos por defecto de la ficha' },
  'src/app/12-cierre-local.js': { marcaCierreDia: 'x es el resultado de estadoDia (la capa de lectura)' },
  'src/app/19-vista-equipo.js': { setCaracteristica: 'editor (F6 · S21)', chipsCondiciones: 'tarjetas de Equipo (F6 · S20)', quitarPidDeTodo: 'editor: baja de una persona' },
  'src/app/20-ficha-persona.js': { openFicha: 'editor de la ficha', textoMoverDiaLibre: 'editor de la ficha', cambiarDiaLibreUI: 'editor de la ficha' },
  'src/app/22-generador.js': { openLibraSemana: 'editor del día libre de una semana (Generador)' },
  'src/app/26-cobertura.js': { pintaCob: 'cabecera: los días libres de su ficha (F6 · S20)' },
  'src/app/31-navegacion.js': { activarModoEmpleado: 'perfil: los días libres de su ficha (F6 · S20)' },
};
// (revisión F4) también la lectura con un objeto vacío por defecto: ((p.partido || {}).dias || []) y
// (p.cocina || {}).titular, que la comprobación no veía
const RE_CAMPO = /([A-Za-z_$][\w$]*)\.(libra|nuncaCon|cubreA|prefs|vetos)\b(?!\s*=[^=])|([A-Za-z_$][\w$]*)\.partido\.dias\b|([A-Za-z_$][\w$]*)\.cocina\.(titular|reserva|soloDias|nunca)\b|([A-Za-z_$][\w$]*)\.abre\[|\(\s*([A-Za-z_$][\w$]*)\.(?:partido|cocina)\s*\|\|\s*\{\}\s*\)\s*\.\s*(?:dias|siempre|titular|reserva|soloDias|nunca)\b/g;
const receptor = x => x[1] || x[3] || x[4] || x[6] || x[7];
// receptores que no son una ficha: el local (l.abre[franja] es «Cuándo abre») y el resultado de estadoDia
const NO_FICHA = new Set(['l', 'loc', 'local', 'lc', 'ed', 'edc', 'PESOS']);
function sinComentarios(src) {
  let out = '', cad = null;
  for (let i = 0; i < src.length; i++) {
    const c = src[i], d = src[i + 1];
    if (cad) { out += c; if (c === '\\') { out += d; i++; } else if (c === cad) cad = null; continue; }
    if (c === '/' && d === '/') { while (i < src.length && src[i] !== '\n') i++; out += '\n'; continue; }
    if (c === '/' && d === '*') { i += 2; while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') out += '\n'; i++; } i++; continue; }
    if (c === '"' || c === "'" || c === '`') cad = c;
    out += c;
  }
  return out;
}
function lecturasAPelo(fichero) {
  // (el modelo que se prueba: con MODELO=… se revisa esa copia)
  const ruta = fichero === 'modelo.js' && process.env.MODELO ? resolve(process.env.MODELO) : join(RAIZ, fichero);
  const src = sinComentarios(readFileSync(ruta, 'utf8'));
  const out = [];
  let fn = '(fuera de funciones)';
  src.split('\n').forEach((ln, i) => {
    const m = /^(?:async\s+)?function\s+([\w$]+)|^const\s+([\w$]+)\s*=/.exec(ln);
    if (m) fn = m[1] || m[2];
    for (const x of ln.matchAll(RE_CAMPO)) {
      const recv = receptor(x);
      if (NO_FICHA.has(recv)) continue;
      out.push({ fichero, linea: i + 1, fn, texto: x[0] });
    }
  });
  return out;
}
test('lint: nadie fuera de la capa de lectura y del editor de la ficha lee los campos de la ficha a pelo', () => {
  const ficheros = ['modelo.js', ...readdirSync(join(RAIZ, 'src', 'app')).filter(f => f.endsWith('.js') && f !== '23-entrevistas-datos.js').map(f => join('src', 'app', f))];
  const malas = [];
  for (const f of ficheros) for (const x of lecturasAPelo(f)) if (!(PERMITIDOS[f] && PERMITIDOS[f][x.fn])) malas.push(`${x.fichero}:${x.linea} (${x.fn}) → ${x.texto}`);
  assert.deepEqual(malas, [], `lecturas a pelo fuera de la capa:\n  ${malas.join('\n  ')}`);
});
test('lint: la comprobación ve una lectura a pelo y deja pasar el local y estadoDia', () => {
  const vistas = s => [...sinComentarios(s).matchAll(RE_CAMPO)].map(receptor).filter(r => !NO_FICHA.has(r));
  assert.deepEqual(vistas('if (p.libra.includes(3)) x = (q.cocina.soloDias || []); const a = p.abre[l.id];'), ['p', 'q', 'p']);
  assert.deepEqual(vistas('const d = ((p.partido || {}).dias || []); const t = (q.cocina || {}).titular; const u = ( r.cocina||{} ).nunca;'), ['p', 'q', 'r']);
  assert.deepEqual(vistas('const f = l.abre[franja]; if (ed.libra) {} // p.libra en un comentario'), []);
});

// En el navegador el modelo y la interfaz comparten el ámbito global: una función de src/app con el mismo
// nombre que una del modelo la pisa sin avisar (24/09, fase 4: la lista de entrevistas se llamaba
// candidatos(), como la puntuación del modelo, y el Generador se rompía en la app y no en las pruebas)
test('lint: ningún nombre de src/app pisa uno del modelo', () => {
  const src = readFileSync(join(RAIZ, 'modelo.js'), 'utf8');
  const delModelo = new Set(Object.keys(M));
  for (const m of src.matchAll(/^(?:function\s+([\w$]+)|(?:const|let|var)\s+([\w$]+)\s*=)/gm)) delModelo.add(m[1] || m[2]);
  const pisan = [];
  for (const f of readdirSync(join(RAIZ, 'src', 'app')).filter(f => f.endsWith('.js'))) {
    const a = readFileSync(join(RAIZ, 'src', 'app', f), 'utf8');
    for (const m of a.matchAll(/^(?:async\s+)?(?:function\s+([\w$]+)|(?:const|let|var)\s+([\w$]+)\s*=)/gm)) if (delModelo.has(m[1] || m[2])) pisan.push(`${f}: ${m[1] || m[2]}`);
  }
  assert.deepEqual(pisan, []);
});

// ---------- (d) el reloj ----------
test('reloj: la matriz da lo mismo con el reloj en dos fechas distintas', () => {
  const Real = globalThis.Date;
  const fijar = iso => {
    const t = new Real(iso + 'T10:00:00Z').getTime();
    globalThis.Date = class extends Real { constructor(...a) { if (a.length) super(...a); else super(t); } static now() { return t; } };
  };
  const todo = () => ESCENARIOS.map(esc => Object.keys(esc.celdas).filter(k => esc.celdas[k] !== '–').map(k => { try { return JSON.stringify(obs(esc, k, 'con')); } catch (e) { return 'error: ' + e.message; } }));
  let a, b;
  try { fijar('2026-09-24'); a = todo(); fijar('2027-03-15'); b = todo(); } finally { globalThis.Date = Real; }
  assert.deepEqual(a, b);
});

// ---------------------------------------------------------------------------------------------
// las pruebas en rojo de la auditoría que seguían pendientes (res2/huecos.md; $A = scratchpad/auditoria)
// ---------------------------------------------------------------------------------------------
const semilla = () => { const cfg = M.semillaPasarela(); return { cfg, st: cfg.staff }; };
function semana(lunes) {
  const meses = {}; const e = { y: +lunes.slice(0, 4), m: +lunes.slice(5, 7), days: [], asig: {}, apertura: {}, manual: {}, festivos: [], virtual: true };
  for (let k = 0; k < 7; k++) { const iso = M.addDias(lunes, k), key = iso.slice(0, 7); const me = meses[key] || (meses[key] = M.nuevoEstado(+iso.slice(0, 4), +iso.slice(5, 7), { festivos: [] })); e.days.push(me.days.find(x => x.iso === iso)); me.asig[iso] = {}; me.apertura[iso] = {}; me.manual[iso] = {}; e.asig[iso] = me.asig[iso]; e.apertura[iso] = me.apertura[iso]; e.manual[iso] = me.manual[iso]; }
  return e;
}
// una función de src/app tal cual, en un contexto con el modelo y los globales que se le pasen. (revisión
// F4) El modelo entero, como en el navegador (el build lo embebe como un script: la interfaz ve también lo
// que no se exporta); con solo las exportaciones, la hoja de antes fallaba contra el código de antes por
// una función sin exportar (lblLocales) y no por lo que se prueba
const SRC_MODELO = readFileSync(process.env.MODELO ? resolve(process.env.MODELO) : join(RAIZ, 'modelo.js'), 'utf8');
function funcionDeApp(fichero, nombre, globales) {
  const src = readFileSync(join(RAIZ, 'src', 'app', fichero), 'utf8');
  const i = src.indexOf(`function ${nombre}(`);
  let prof = 0, fin = -1;
  for (let k = src.indexOf('{', i); k < src.length; k++) { const c = src[k]; if (c === '{') prof++; else if (c === '}') { prof--; if (!prof) { fin = k + 1; break; } } }
  const ctx = vm.createContext(Object.assign({ console }, globales || {}));
  vm.runInContext(SRC_MODELO, ctx);
  for (const [k, v] of Object.entries(globales || {})) ctx[k] = v;
  vm.runInContext(src.slice(i, fin) + `\n;this.__f = ${nombre};`, ctx);
  return ctx.__f;
}

// S35 (auditoría: relaciones-rol «H-selector-cocina», revisor-lugar n1): el selector agrupa en el modelo
test('auditoría S35 · en una casilla sin cocina el selector ofrece primero al cocinero (Hojan) y nadie sale en «no pueden» sin motivo', () => {
  const { cfg, st } = semilla(); const iso = '2026-10-07', tid = 'MONACO_T'; const e = M.nuevoEstado(2026, 10, { festivos: [] });
  M.asignar(e, cfg, st, iso, tid, 'scapon', {});
  const g = M.gruposSelector(cfg, st, e, iso, tid);
  assert.equal(g.cocina[0] && g.cocina[0].pid, 'hojan');
  assert.deepEqual(g.noPueden.filter(x => !x.motivo || !x.regla).map(x => x.pid), [], 'en «NO PUEDEN» sin motivo o sin regla');
  // Hojan no está además en «no pueden» por la sala: su sitio es la cocina
  assert.ok(!g.noPueden.some(x => x.pid === 'hojan') && !g.pueden.some(x => x.pid === 'hojan'));
});
test('auditoría S35 · «forzar» nombra la regla y solo se ofrece si se puede forzar (semana generada, lunes y miércoles en el Mónaco)', () => {
  const { cfg, st } = semilla(); const e = semana(LUNES); M.generarSemana(cfg, st, e, LUNES, {});
  for (const [iso, tid] of [['2026-09-30', 'MONACO_M'], [LUNES, 'MONACO_T']]) {
    const g = M.gruposSelector(cfg, st, e, iso, tid);
    for (const x of g.noPueden) {
      assert.ok(x.motivo && x.regla, `${iso} ${tid}: ${x.pid} sin motivo`);
      // (revisión F4) en una casilla sin cocina, quien la lleva se evalúa y se fuerza como cocina
      const r = M.puedeEstar(cfg, st, e, iso, tid, x.pid, Object.assign({ forzar: true, permitirPartido: true }, x.cocina ? { puesto: 'cocina', cocina: true } : { puesto: 'sala' }));
      assert.equal(!!x.forzable, r.ok, `${x.pid}: forzable=${x.forzable} pero forzar da ${JSON.stringify(r)}`);
      assert.ok(Array.isArray(x.incumple) && (!x.forzable || x.incumple.length > 0), `${x.pid}: sin las reglas que incumpliría`);
    }
  }
});
// S41 (auditoría: lugar L4 —la parte de la hoja—, revisor-lugar n4 y b1, revision-disponibilidad r-ui)
test('auditoría S41 · la hoja impresa: el veto de Mari Luz es de los lunes y el martes 29 no se lo pone', () => {
  const { cfg, st } = semilla(); const e = semana(LUNES);
  M.asignar(e, cfg, st, '2026-09-29', 'PASARELA_M', 'lola', {}); M.asignar(e, cfg, st, '2026-09-29', 'PASARELA_T', 'mariluz', {});
  // (revisión F4) primero lo que enseña la hoja (pxgDestrapa de 14-impresiones.js), después el modelo
  const px = funcionDeApp('14-impresiones.js', 'pxgDestrapa', { S: Object.assign({}, cfg, { staff: st }), estadoDeIso: () => e, personaDeId: id => M.personaDe(st, id) });
  const x = px({ estado: e }, { iso: '2026-09-29', turnoId: 'PASARELA_M', tipo: 'faltan' }).find(z => z.nombre === 'Mari Luz');
  assert.ok(!x || !/no hace mañanas/.test(x.motivo), JSON.stringify(x));
  const d = M.destrapa(cfg, st, e, '2026-09-29', 'PASARELA_M', 'mariluz', {});
  assert.ok(!d || !/no hace mañanas/.test(d.motivo), JSON.stringify(d));
});
test('auditoría S41 · la hoja impresa: con un día libre puntual el motivo es el de esa semana', () => {
  const { cfg, st } = semilla(); const e = semana(LUNES);
  M.ponerLibraPuntual(M.personaDe(st, 'mariluz'), LUNES, [2]);
  const px = funcionDeApp('14-impresiones.js', 'pxgDestrapa', { S: Object.assign({}, cfg, { staff: st }), estadoDeIso: () => e, personaDeId: id => M.personaDe(st, id) });
  const x = px({ estado: e }, { iso: '2026-09-29', turnoId: 'PASARELA_M', tipo: 'faltan' }).find(z => z.nombre === 'Mari Luz');
  assert.ok(x && /martes esta semana/.test(x.motivo), JSON.stringify(x));
  const d = M.destrapa(cfg, st, e, '2026-09-29', 'PASARELA_M', 'mariluz', {});
  assert.ok(d && d.regla === 'libra' && /martes esta semana/.test(d.motivo), JSON.stringify(d));
});
test('auditoría S41 · la hoja impresa no propone levantar «no sale primero» a Dulce, que sigue en standby; y sí el standby si es lo único', () => {
  // la tarde del Mónaco del miércoles 30 solo con Jenny, que viene de la mañana de El 33: hueco en la 1.ª
  const { cfg, st } = semilla(); const e = semana(LUNES), MIE = '2026-09-30';
  assert.ok(M.asignar(e, cfg, st, MIE, 'EL33_M', 'jenny', {}).ok && M.asignar(e, cfg, st, MIE, 'MONACO_T', 'jenny', {}).ok && !M.primeroDe(cfg, st, e, MIE, 'MONACO_T'));
  // (revisión F4) primero lo que enseña la hoja, después el modelo
  const px = () => funcionDeApp('14-impresiones.js', 'pxgDestrapa', { S: Object.assign({}, cfg, { staff: st }), estadoDeIso: () => e, personaDeId: id => M.personaDe(st, id) })({ estado: e }, { iso: MIE, turnoId: 'MONACO_T', tipo: 'primero' });
  assert.ok(!px().some(z => z.nombre === 'Dulce'), 'standby y «no sale primero» son dos condiciones: la hoja no se lo propone: ' + JSON.stringify(px()));
  assert.equal(M.destrapa(cfg, st, e, MIE, 'MONACO_T', 'dulce', { primero: true }), null, 'standby y «no sale primero»: dos condiciones');
  M.personaDe(st, 'dulce').noPrimero = [];
  // la frase de la hoja: «Dulce, que está en standby» (sin «: aún no entra en la planilla» dentro de la lista)
  assert.ok(px().some(z => z.nombre === 'Dulce' && z.motivo === 'está en standby'), 'y la hoja propone el standby: ' + JSON.stringify(px()));
  const x = M.destrapa(cfg, st, e, MIE, 'MONACO_T', 'dulce', { primero: true });
  assert.ok(x && x.regla === 'standby', JSON.stringify(x));
});
test('auditoría S41 · barrido: cada pista de la hoja es exactamente UNA regla forzable de la puerta', () => {
  let n = 0;
  for (const ausente of [null, 'mariluz', 'ivan', 'lola', 'noe', 'cris', 'hojan', 'roberto']) {
    const { cfg, st } = semilla();
    if (ausente) M.anadirAusencia(M.personaDe(st, ausente), { tipo: 'VAC', desde: LUNES, hasta: M.addDias(LUNES, 6) });
    const g = M.generarSemana(cfg, st, semana(LUNES), LUNES, {});
    for (const hu of g.huecos) for (const p of st) {
      const d = M.destrapa(cfg, st, g.estado, hu.iso, hu.turnoId, p.id, { primero: hu.tipo === 'primero' });
      if (!d) continue;
      n++;
      const dentro = M.pidsEn(g.estado, hu.iso, hu.turnoId).includes(p.id);
      const ev = M.evaluarPlaza(M.crearContexto(cfg, st, g.estado), hu.iso, hu.turnoId, p.id, { puesto: 'sala', apoyos: true, primero: hu.tipo === 'primero', yaDentro: dentro });
      const bl = dentro ? ev.bloqueos.filter(b => b.primero) : ev.bloqueos;
      assert.ok(bl.length === 1 && bl[0].forzable && bl[0].k === d.regla, `${hu.iso} ${hu.turnoId} ${p.id}: ${JSON.stringify(bl)}`);
    }
  }
  assert.ok(n > 0, 'el barrido encuentra pistas');
});
// S26 (auditoría: lugar L1): una plaza que se ha quedado en una casilla cerrada no ocupa a nadie
test('auditoría S26 · cerrar el Mónaco el martes por la tarde libera a quien estaba puesto; la revisión y las horas lo dicen', () => {
  const { cfg, st } = semilla(); const e = semana(LUNES); M.generarSemana(cfg, st, e, LUNES, {});
  assert.ok(M.pidsEn(e, '2026-09-29', 'MONACO_T').includes('cristian'));
  const antes = M.horasPersonaMes(cfg, st, { '2026-09': { asig: e.asig } }, 'cristian', 2026, 9);
  M.toggleApertura(e, '2026-09-29', 'MONACO_T', cfg);
  const r = M.puedeEstar(cfg, st, e, '2026-09-29', 'ZAPA_T', 'cristian');
  assert.ok(r.ok, `Cristian sigue «${r.motivo}»`);
  assert.ok(M.revisionMes(cfg, st, e, { desde: '2026-09-29', hasta: '2026-09-29' }).some(x => x.turnoId === 'MONACO_T' && x.tipo === 'plaza-en-cerrado'));
  // (F2, D11) la nómina no cuenta la tarde cerrada ese día
  const h = M.horasPersonaMes(cfg, st, { '2026-09': { asig: e.asig, apertura: e.apertura } }, 'cristian', 2026, 9);
  assert.equal((h.porLocal.MONACO || { turnos: 0 }).turnos, (antes.porLocal.MONACO || { turnos: 0 }).turnos - 1);
});
// (revisión F4) «si la puerta la suelta, Horas no la cuenta»: con el cierre de ESE día (a mano o por fechas) la
// plaza no ocupa a nadie y Horas no la cuenta; con «Cuándo abre» (el horario de todas las semanas) la plaza
// sigue ocupando y Horas la sigue contando (revisión F2: lo trabajado no se borra), y la Revisión la marca
test('auditoría S26 · si la puerta suelta a quien sigue en una casilla cerrada, Horas no se la cuenta (a mano, por fechas y «Cuándo abre»)', () => {
  const D = '2026-09-29';
  for (const tipo of ['a mano', 'por fechas', 'Cuándo abre']) {
    const { cfg, st } = semilla(); const e = semana(LUNES); M.generarSemana(cfg, st, e, LUNES, {});
    assert.ok(M.pidsEn(e, D, 'MONACO_T').includes('cristian'));
    const horas = () => (M.horasPersonaMes(cfg, st, { '2026-09': { asig: e.asig, apertura: e.apertura } }, 'cristian', 2026, 9).porLocal.MONACO || { turnos: 0 }).turnos;
    const antes = horas();
    if (tipo === 'a mano') M.toggleApertura(e, D, 'MONACO_T', cfg);
    else if (tipo === 'por fechas') cfg.cierresPuntuales = [{ id: 'c1', localId: 'MONACO', dias: { [D]: ['T'] }, motivo: 'reforma', decisiones: { cristian: { tipo: 'REFUERZA' } } }];
    else { const l = M.localDe(cfg, 'MONACO'); l.abre.T = l.abre.T.filter(d => d !== 2); }
    const r = M.puedeEstar(cfg, st, e, D, 'ZAPA_T', 'cristian');
    const suelta = r.regla !== 'otraFranja', cuenta = horas() === antes;
    assert.equal(suelta, !cuenta, `${tipo}: la puerta ${suelta ? 'la suelta' : 'no la suelta'} (${JSON.stringify(r)}) y Horas ${cuenta ? 'la cuenta' : 'no la cuenta'}`);
    assert.equal(suelta, tipo !== 'Cuándo abre', tipo);
    assert.ok(M.revisionMes(cfg, st, e, { desde: D, hasta: D }).some(x => x.turnoId === 'MONACO_T' && x.tipo === 'plaza-en-cerrado'), `${tipo}: la Revisión la marca`);
  }
});
// S28 (auditoría: lugar L10, reescrita según el arreglo de huecos.md y la fase 2): no se inventa un mínimo
test('auditoría S28 · una casilla abierta a mano con mínimo 0 y vacía la avisa la Revisión', () => {
  const { cfg, st } = semilla(); const e = semana(LUNES);
  M.toggleApertura(e, LUNES, 'EL33_T', cfg);
  assert.ok(M.revisionMes(cfg, st, e, { desde: LUNES, hasta: LUNES }).some(x => x.turnoId === 'EL33_T' && x.tipo === 'abierta-vacia'));
});

// --- pendientes de otras fases (con su hueco) ---
test('auditoría S13 (interruptores H1, relaciones-rol «H-nuncaCon-revision») · con «Nunca con» apagado la revisión no marca «no pueden coincidir»', { todo: 'F6 · S13' }, () => {
  for (const prep of [cfg => { cfg.reglas = { nuncaCon: false }; }, (cfg, st) => { M.personaDe(st, 'mariluz').inactivas = ['nuncaCon']; M.personaDe(st, 'lavinia').inactivas = ['nuncaCon']; }]) {
    const { cfg, st } = semilla(); prep(cfg, st); const e = semana(LUNES);
    assert.ok(M.asignar(e, cfg, st, '2026-10-02', 'PASARELA_T', 'mariluz', {}).ok && M.asignar(e, cfg, st, '2026-10-02', 'PASARELA_T', 'lavinia', {}).ok);
    assert.deepEqual(M.revisarTurno(cfg, st, e, '2026-10-02', 'PASARELA_T').incompatibles, []);
  }
});
test('auditoría S14 (disponibilidad D7, interruptores H3) · «Preferencias» apagada no pesa en el generador ni en la cobertura', { todo: 'F6 · S14 (el núcleo, F7 · S25)' }, () => {
  const { cfg, st } = semilla(); const p = M.personaDe(st, 'cristian'); p.prefs = { evitaDows: [1] }; p.inactivas = ['prefs']; const e = semana(LUNES);
  assert.equal(M.candidatosPara(cfg, st, e, LUNES, 'MONACO_M')[0].pid, 'cristian');
  assert.equal(M.candidatosCobertura(cfg, st, e, LUNES, 'MONACO_M', 'cris')[0].pid, 'cristian');
});
test('auditoría S17 (interruptores H4, reescrita según D6) · «Contrato» deja de ser un interruptor y Horas sigue comparando', { todo: 'F6 · S17 (D6)' }, () => {
  assert.ok(!M.CARACTERISTICAS.some(c => c.k === 'contrato'));
  const { cfg, st } = semilla(); M.personaDe(st, 'yilian').contrato = { horasSemana: 40 };
  assert.notEqual(M.horasPersonaMes(cfg, st, {}, 'yilian', 2026, 10).contratoHoras, null);
});
// --- fase 5 (24/09): cocina y quién abre ---
test('auditoría S15 (interruptores H5, relaciones-rol «H-cocina-caracteristica») · «Cocina» apagada en la ficha quita «solo unos días» y «nunca»', () => {
  const { cfg, st } = semilla(); M.personaDe(st, 'scapon').inactivas = ['cocina'];
  assert.ok(M.puedeCocina(cfg, M.personaDe(st, 'scapon'), 'MONACO', '2026-09-30'));
  // (interruptores H5) y con la cocina marcada, la Revisión no dice que no es cocina de ese local
  const e = semana(LUNES); M.asignar(e, cfg, st, '2026-09-30', 'MONACO_T', 'scapon', { cocina: true });
  assert.equal(M.revisarTurno(cfg, st, e, '2026-09-30', 'MONACO_T').cocinaNoApta, false);
  // «nunca» también, pero no hace cocinera a quien no lo es (Cristian no es titular ni reserva de ningún local)
  M.personaDe(st, 'cristian').inactivas = ['cocina'];
  assert.ok(!M.puedeCocina(cfg, M.personaDe(st, 'cristian'), 'MONACO', '2026-09-30'));
});
// S15: los chips de Equipo dicen lo mismo que la puerta: apagada «Cocina», se tachan sus límites y no su titularidad
test('auditoría S15 · los chips de Equipo: con «Cocina» apagada se tachan «solo unos días» y «nunca», no la titular', () => {
  const { cfg, st } = semilla();
  const sc = M.personaDe(st, 'scapon'); sc.inactivas = ['cocina'];
  const cr = M.personaDe(st, 'cristian'); cr.inactivas = ['cocina'];
  const chips = funcionDeApp('19-vista-equipo.js', 'chipsCondiciones', { S: Object.assign({}, cfg, { staff: st }), isoHoy: () => '2026-09-24', esc: s => String(s), tchip: (lbl, txt, cls) => `[${lbl}: ${txt}${/\boff\b/.test(cls || '') ? ' (tachado)' : ''}]`, lblCaracteristica: k => k, lblFranjas: () => '', lblDows: d => (d || []).join(','), lblDowPl: d => M.DOW_PL[d].replace('los ', ''), chipLocal: (id, x) => M.localDe(cfg, id).nombre + (x ? ' ' + x : ''), nombrePid: id => (M.personaDe(st, id) || {}).nombre, lblNoPrimero: f => f.join(','), lblTurno: x => x, fmtDDMM: x => x, cuandoCubre: () => '', quienLeCubre: () => [] });
  const h = chips(sc);
  assert.ok(/\[Cocina: Bar Mónaco · titular\]/.test(h), h);
  assert.ok(/\[Cocina: solo martes \(tachado\)\]/.test(h), h);
  assert.ok(/\[Cocina: nunca \(tachado\)\]/.test(chips(cr)), chips(cr));
});
test('auditoría S16 (relaciones-rol «H-cocina-regla», la parte de cocina de interruptores H6) · con «Cocina» del grupo apagada nadie la exige ni la marca (D5)', () => {
  const { cfg, st } = semilla(); cfg.reglas = { cocina: false };
  const rv = M.revisionMes(cfg, st, semana(LUNES), { desde: LUNES, hasta: M.addDias(LUNES, 6) });
  assert.equal(rv.filter(x => x.tipo === 'sin-cocina' || x.tipo === 'cocina-no-apta').length, 0);
  const e = M.nuevoEstado(2026, 10, { festivos: [] });
  M.asignar(e, cfg, st, '2026-10-07', 'MONACO_T', 'scapon', {});
  const r = M.revisarTurno(cfg, st, e, '2026-10-07', 'MONACO_T');
  assert.ok(!r.sinCocina && !r.cocinaObligatoria && !r.cocinaNoApta, JSON.stringify(r));
  // ni el Generador semanal (con y sin semana tipo) ni la Cobertura la buscan, ni el selector la ofrece, ni el núcleo la pide
  for (const sinPatron of [true, false]) {
    const g = M.generarSemana(cfg, st, semana(LUNES), LUNES, { sinPatron });
    assert.ok(!g.huecos.some(h => h.tipo === 'cocina'), 'huecos de cocina');
    for (const d of g.dias) for (const t of M.turnosDe(cfg)) assert.ok(!M.asignados(g.estado, d, t.id).some(x => x.cocina), `${d} ${t.id}: marcada de cocina`);
  }
  const eC = semana(LUNES); M.generarSemana(cfg, st, eC, LUNES, {});
  const pc = M.planesCobertura(cfg, st, eC, { pid: 'hojan', tipo: 'LD', desde: '2026-09-30', hasta: '2026-09-30' });
  assert.ok(pc.afectados.every(a => !a.sinCocina) && pc.planes.every(p => !p.huecos.some(h => h.tipo === 'cocina')), JSON.stringify(pc.afectados));
  assert.deepEqual(M.gruposSelector(cfg, st, e, '2026-10-07', 'MONACO_T').cocina, []);
  assert.ok(!M.toProblem(cfg, st, M.nuevoEstado(2026, 10, { festivos: [] }), '2026-10-05', '2026-10-11', {}).rules.some(x => x.type === 'skill_coverage'));
  // lo marcado a mano se queda (principio 4)
  const e2 = semana(LUNES); M.asignar(e2, cfg, st, '2026-09-30', 'MONACO_T', 'hojan', {}); M.asignar(e2, cfg, st, '2026-09-30', 'MONACO_T', 'yilian', {});
  M.marcarCocina(e2, '2026-09-30', 'MONACO_T', 'hojan'); M.normalizarCasilla(e2, cfg, st, '2026-09-30', 'MONACO_T');
  assert.ok(M.asignados(e2, '2026-09-30', 'MONACO_T').find(x => x.pid === 'hojan').cocina);
  // y la interfaz dice la consecuencia al apagarla (la lee de REGLAS)
  assert.ok(/nadie/.test((M.REGLAS.find(x => x.k === 'cocina') || {}).apagada || ''), 'REGLAS: el texto de lo que pasa con «Cocina» apagada');
});
test('auditoría S16 (interruptores H6, lugar L2) · con «Mínimos» apagados nadie los exige', { todo: 'F6 · S16 (mínimos), D5' }, () => {
  const { cfg, st } = semilla(); cfg.reglas = { minimos: false };
  const rv = M.revisionMes(cfg, st, semana(LUNES), { desde: LUNES, hasta: M.addDias(LUNES, 6) });
  assert.equal(rv.filter(x => x.tipo === 'falta').length, 0);
});
test('auditoría S19 (interruptores H8/H9, lugar L9) · con «Sale el primero» apagado no suma ni manda', () => {
  // (fase 5) con Hojan en la cocina: desde la revisión F3 (S33) un apoyo no entra solo en una casilla vacía,
  // y la auditoría es de antes (Yilian, apoyo, salía la primera en la tarde vacía del Mónaco)
  const { cfg, st } = semilla(); cfg.reglas = { abre: false }; const e = semana(LUNES);
  assert.ok(M.asignar(e, cfg, st, '2026-09-30', 'MONACO_T', 'hojan', { cocina: true, puesto: 'cocina' }).ok);
  assert.equal(M.candidatosPara(cfg, st, e, '2026-09-30', 'MONACO_T', { primero: true })[0].pid, 'yilian');
  const c2 = semilla(); M.personaDe(c2.st, 'lola').inactivas = ['abre']; const e2 = semana(LUNES);
  M.asignar(e2, c2.cfg, c2.st, LUNES, 'PASARELA_M', 'tere', {}); M.asignar(e2, c2.cfg, c2.st, LUNES, 'PASARELA_M', 'lola', {});
  assert.equal(M.primeroDe(c2.cfg, c2.st, e2, LUNES, 'PASARELA_M'), 'tere');
});
test('auditoría S18 (lugar L5) · «Sale primero» a mano sobre quien no puede abrir deja aviso', () => {
  const { cfg, st } = semilla(); const e = semana(LUNES); M.generarSemana(cfg, st, e, LUNES, {});
  M.marcarAbre(e, LUNES, 'PASARELA_T', 'leo', cfg);
  assert.ok(M.posicionesDe(cfg, st, e, LUNES, 'PASARELA_T').find(x => x.pid === 'leo').avisos.length > 0);
  // (lugar L9) con «Sale el primero» apagado, la semana tipo no fija el abre como si fuera a mano
  const c2 = semilla(); c2.cfg.reglas = { abre: false }; const e2 = semana(LUNES); M.generarSemana(c2.cfg, c2.st, e2, LUNES, {});
  assert.notEqual(M.manualDe(e2, '2026-09-29', 'PASARELA_M').abre, true);
});
test('auditoría S36 (interruptores H10, relaciones-rol «H-cocina-local-vs-ficha») · titular del local = puede llevar esa cocina', () => {
  const { cfg, st } = semilla(); M.localDe(cfg, 'EL33').cocina.titulares.M.unshift('victoria');
  assert.ok(M.rangoCocina(cfg, M.localDe(cfg, 'EL33'), M.personaDe(st, 'victoria'), 'M', '2026-10-05') >= 0);
  // (interruptores H10) el Generador nombra a quien puede llevarla, y solo a quien puede
  for (const [lid, pid] of [['MONACO', 'tere'], ['PASARELA', 'cristian']]) {
    const c2 = semilla(); M.localDe(c2.cfg, lid).cocina.titulares.M.push(pid);
    const cond = M.condicionesDe(c2.cfg, c2.st).find(c => c.id === 'coc:' + lid);
    const lista = !!cond && new RegExp(M.personaDe(c2.st, pid).nombre).test(cond.texto);
    assert.equal(lista, M.puedeCocina(c2.cfg, M.personaDe(c2.st, pid), lid, '2026-09-29'), `${pid} en ${lid}: «${cond && cond.texto}»`);
  }
  // Cristian («nunca cocina») puesto de titular en Pasarela no le crea una cocina que nadie puede llevar
  const c3 = semilla(); M.localDe(c3.cfg, 'PASARELA').cocina.titulares.M.push('cristian');
  const g = M.generarSemana(c3.cfg, c3.st, semana(LUNES), LUNES, {});
  assert.equal(M.revisionMes(c3.cfg, c3.st, g.estado, { desde: LUNES, hasta: M.addDias(LUNES, 6) }).filter(x => x.tipo === 'sin-cocina' && x.turnoId === 'PASARELA_M').length, 0);
});
// S36: Ajustes del local y la ficha, una sola fuente de verdad en los dos sentidos (revisor-interruptores r10 y r10b)
test('auditoría S36 · Ajustes del local escribe la ficha, y quitar en Ajustes quita en la ficha (y al revés)', () => {
  const { cfg, st } = semilla(); const iso = '2026-09-29';
  // (r10) Cris de reserva de la cocina del Mónaco: su ficha lo dice y la lleva si faltan las demás
  M.ponerCocinaLocal(cfg, st, 'MONACO', { lista: 'reservas', pid: 'cris' });
  assert.equal(M.cocinaDe(cfg, M.personaDe(st, 'cris'), 'MONACO'), 'reserva');
  for (const id of ['esmeralda', 'jenny']) M.anadirAusencia(M.personaDe(st, id), { tipo: 'VAC', desde: iso, hasta: iso });
  const e = semana(LUNES); M.asignar(e, cfg, st, iso, 'MONACO_M', 'cris', {});
  assert.equal(M.revisarTurno(cfg, st, e, iso, 'MONACO_M').sinCocina, false);
  // (r10b) quitar a Noe de los titulares de El 33 (las dos franjas) la quita de la ficha: ya no lleva esa cocina
  const c2 = semilla();
  for (const f of ['M', 'T']) M.ponerCocinaLocal(c2.cfg, c2.st, 'EL33', { lista: 'titulares', franja: f, pid: 'noe', quitar: true });
  const noe = M.personaDe(c2.st, 'noe');
  assert.equal(M.cocinaDe(c2.cfg, noe, 'EL33'), null);
  assert.ok(!M.puedeCocina(c2.cfg, noe, 'EL33', iso));
  assert.ok(!/Noe/.test(M.condicionesDe(c2.cfg, c2.st).find(c => c.id === 'coc:EL33').texto));
  const g = M.generarSemana(c2.cfg, c2.st, semana(LUNES), LUNES, {});
  for (const d of g.dias) for (const f of ['M', 'T']) assert.ok(!M.asignados(g.estado, d, 'EL33_' + f).some(x => x.pid === 'noe' && x.cocina), `${d} ${f}: Noe lleva la cocina`);
  // la ficha escribe la lista del local: Juani titular de El 33 (solo hace mañanas) y quitarla la quita
  const c3 = semilla(); const juani = M.personaDe(c3.st, 'juani'); const l = M.localDe(c3.cfg, 'EL33');
  M.ponerCocinaFicha(c3.cfg, juani, 'EL33', 'titular');
  assert.ok(l.cocina.titulares.M.includes('juani') && !l.cocina.titulares.T.includes('juani'), JSON.stringify(l.cocina.titulares));
  assert.ok(/Juani/.test(M.condicionesDe(c3.cfg, c3.st).find(c => c.id === 'coc:EL33').texto));
  M.ponerCocinaFicha(c3.cfg, juani, 'EL33', 'reserva');
  assert.ok(!l.cocina.titulares.M.includes('juani') && l.cocina.reservas.includes('juani'));
  M.ponerCocinaFicha(c3.cfg, juani, 'EL33', null);
  assert.ok(!l.cocina.reservas.includes('juani') && !M.puedeCocina(c3.cfg, juani, 'EL33', iso));
});
test('auditoría S37 (relaciones-rol «H-cocina-hueco») · una cocina obligatoria que nadie puede llevar es un hueco', () => {
  const { cfg, st } = semilla(); const MIE = '2026-10-07';
  for (const id of ['hojan', 'jenny', 'maydeth', 'esmeralda']) M.anadirAusencia(M.personaDe(st, id), { tipo: 'VAC', desde: MIE, hasta: MIE });
  const e = semana('2026-10-05'); for (const p of ['cris', 'yilian', 'tere']) M.asignar(e, cfg, st, MIE, 'MONACO_M', p, {});
  assert.ok(M.generarPlanilla(cfg, st, e, MIE, MIE, { simular: true }).huecos.some(h => h.turnoId === 'MONACO_M'));
});
test('auditoría S38 (relaciones-rol «H-cocina-patron») · la semana tipo no da la cocina un día que la ficha no deja', () => {
  const { cfg, st } = semilla(); M.personaDe(st, 'scapon').cocina.soloDias = [3];
  const g = M.generarSemana(cfg, st, semana(LUNES), LUNES, {});
  assert.ok(g.condiciones.find(x => x.pid === 'scapon' && x.k === 'cocina').ok);
  // (revisor r14b, con S37) la tarde del martes 29 del Mónaco tiene cocina o sale como hueco de cocina
  const r = M.revisarTurno(cfg, st, g.estado, '2026-09-29', 'MONACO_T');
  assert.ok(!r.sinCocina || g.huecos.some(h => h.iso === '2026-09-29' && h.turnoId === 'MONACO_T' && h.tipo === 'cocina'), JSON.stringify(g.huecos));
  assert.ok(!M.manualDe(g.estado, '2026-09-29', 'MONACO_T').cocina || M.asignados(g.estado, '2026-09-29', 'MONACO_T').find(x => x.cocina).pid !== 'scapon');
});
// S18: la marca «a» de la semana tipo es una preferencia (origen 'patron'), no algo puesto a mano; la usa
// quien sale el primero tras «Quién abre» del local y «Sale el primero» de la ficha, si puede abrir y con el
// interruptor encendido (revisor-interruptores n4, revisor-lugar r5b y n2)
test('matriz · la marca «a» de la semana tipo: preferencia, con puedePrimero y su interruptor; nunca «a mano»', () => {
  const esc = { tid: 'PASARELA_M', min: 2, otros: { b: {} }, patron: [{ t: 'PASARELA_M', p: 'b' }, { t: 'PASARELA_M', p: 'x', a: 1 }] };
  const o = (variante, prep) => { const w = mundo(esc, variante); if (prep) prep(w); return CAMINOS.patron(w); };
  const con = o('con');
  assert.equal(con.abre, 'x', 'con la marca, abre Xavi'); assert.equal(con.abreManual, false, 'y no queda como puesta a mano');
  assert.equal(o('con', w => { w.x.noPrimero = ['M']; }).abre, 'b', 'si no puede salir el primero, abre otra');
  assert.equal(o('con', w => { w.cfg.reglas.abre = false; }).abre, 'b', 'con «Sale el primero» del grupo apagado, la marca no manda');
  assert.equal(o('con', w => { w.x.inactivas = ['abre']; }).abre, 'b', 'ni apagada en su ficha');
  assert.equal(o('con', w => { M.localDe(w.cfg, 'PASARELA').primero.M = 'b'; }).abre, 'b', '«Quién abre» del local va antes');
  // guardar la semana como semana tipo: la «a» calculada no se guarda; la puesta a mano, sí
  const w = mundo(esc, 'con'); const e = planilla(w); w.cfg.patron = { [DOW]: clon(esc.patron) };
  M.instanciarPatron(w.cfg, w.st, e, ISO, ISO);
  const semanaDe = est => M.patronDesdeSemana(est, LUNES, w.cfg, w.st)[DOW].filter(pl => pl.t === 'PASARELA_M');
  assert.deepEqual(semanaDe(e).filter(pl => pl.a).map(pl => pl.p), [], 'la calculada no se guarda como «a»');
  assert.equal(semanaDe(e)[0].p, 'x', 'pero la plaza de quien abría va la primera: vuelve a abrir');
  M.marcarAbre(e, ISO, 'PASARELA_M', 'b', w.cfg);
  assert.deepEqual(semanaDe(e).filter(pl => pl.a).map(pl => pl.p), ['b'], 'la puesta a mano se guarda');
});
test('matriz · «Sale primero» a mano sobre quien no puede abrir: queda, con el aviso en la casilla y en la Revisión (abre-no-apto)', () => {
  const esc = { tid: 'PASARELA_M', min: 2, otros: { b: {} }, con: x => { x.noPrimero = ['M']; } };
  const w = mundo(esc, 'con'); const e = planilla(w);
  assert.ok(M.asignar(e, w.cfg, w.st, ISO, 'PASARELA_M', 'b', {}).ok && M.asignar(e, w.cfg, w.st, ISO, 'PASARELA_M', 'x', {}).ok);
  M.marcarAbre(e, ISO, 'PASARELA_M', 'x', w.cfg);
  assert.equal(M.primeroDe(w.cfg, w.st, e, ISO, 'PASARELA_M'), 'x', 'lo puesto a mano manda');
  const s = M.posicionesDe(w.cfg, w.st, e, ISO, 'PASARELA_M').find(y => y.pid === 'x');
  assert.ok(s.abre && s.avisos.some(a => /no sale el primero/.test(a)), JSON.stringify(s));
  assert.ok(M.avisosVigentes(w.cfg, w.st, e, ISO, 'PASARELA_M', 'x').some(a => /no sale el primero/.test(a)));
  const rv = M.revisionMes(w.cfg, w.st, e, { desde: ISO, hasta: ISO }).filter(l => l.turnoId === 'PASARELA_M');
  assert.ok(rv.some(l => l.tipo === 'abre-no-apto' && /Xavi/.test(l.msg)), JSON.stringify(rv));
  // con «Nunca de primero» apagada, ya no hay aviso
  const w2 = mundo(esc, 'con'); w2.x.inactivas = ['noPrimero']; const e2 = planilla(w2);
  M.asignar(e2, w2.cfg, w2.st, ISO, 'PASARELA_M', 'b', {}); M.asignar(e2, w2.cfg, w2.st, ISO, 'PASARELA_M', 'x', {}); M.marcarAbre(e2, ISO, 'PASARELA_M', 'x', w2.cfg);
  assert.ok(!M.revisionMes(w2.cfg, w2.st, e2, { desde: ISO, hasta: ISO }).some(l => l.tipo === 'abre-no-apto'));
});
// S19: la hoja impresa pregunta quién abre donde nadie lo tiene fijo, con los mismos interruptores
test('auditoría S19 · la hoja impresa: «¿Quién sale el primero…?» mira el fijo con sus interruptores (abreFijo)', () => {
  const pregunta = (prep) => {
    const { cfg, st } = semilla(); if (prep) prep(cfg, st);
    const f = funcionDeApp('14-impresiones.js', 'pxgPreguntas', { S: Object.assign({}, cfg, { staff: st }), esc: s => String(s), pxgLista: xs => xs.join(', ') });
    return f({ condiciones: [] });
  };
  assert.ok(!/por la tarde en [^?]*Pasarela/.test(pregunta()), 'Pasarela tarde tiene fijo (Iván)');
  assert.ok(/por la tarde en [^?]*Pasarela/.test(pregunta((cfg, st) => { M.personaDe(st, 'ivan').inactivas = ['abre']; })), 'con «Sale el primero» apagado en la ficha de Iván, se pregunta');
  assert.ok(/por la mañana en [^?]*Pasarela/.test(pregunta(cfg => { cfg.reglas = { abre: false }; })), 'con la regla del grupo apagada, se pregunta');
});
test('auditoría S24 (relaciones-rol «H-nuncaCon-flexible») · si solo queda Lavinia, entra con Mari Luz y con aviso', { todo: 'F6 · S24' }, () => {
  const { cfg, st } = semilla(); const D = '2026-10-02';
  for (const p of st) if (!['ivan', 'mariluz', 'lavinia', 'leo'].includes(p.id)) M.anadirAusencia(p, { tipo: 'VAC', desde: D, hasta: D });
  const e = M.nuevoEstado(2026, 10, { festivos: [] });
  M.asignar(e, cfg, st, D, 'PASARELA_T', 'ivan', {}); M.asignar(e, cfg, st, D, 'PASARELA_T', 'mariluz', {}); M.asignar(e, cfg, st, D, 'ZAPA_T', 'leo', {});
  const a = M.generarPlanilla(cfg, st, e, D, D, { simular: true, sinPatron: true }).aplicados.find(x => x.turnoId === 'PASARELA_T' && x.pid === 'lavinia');
  assert.ok(a && a.avisos.some(x => /nunca con/.test(x)));
});
test('auditoría S21 (relaciones-rol «H-nuncaCon-asimetrico») · quitar la pareja la quita de las dos fichas', { todo: 'F6 · S21' }, () => {
  const { cfg, st } = semilla();
  M.quitarNuncaCon(st, 'mariluz', 'lavinia');
  const e = semana(LUNES); M.asignar(e, cfg, st, '2026-10-02', 'PASARELA_T', 'lavinia', {});
  assert.ok(M.puedeEstar(cfg, st, e, '2026-10-02', 'PASARELA_T', 'mariluz', {}).ok);
});
test('auditoría S39 (relaciones-rol «H-partido-verificar») · el Generador marca el partido de quien no declara ninguno', { todo: 'F6 · S39' }, () => {
  const { cfg, st } = semilla(); const e = semana(LUNES);
  M.asignar(e, cfg, st, '2026-10-02', 'MONACO_M', 'yilian', {}); M.asignar(e, cfg, st, '2026-10-02', 'MONACO_T', 'yilian', { permitirPartido: true });
  assert.ok(M.generarSemana(cfg, st, e, LUNES, { permitirPartido: true }).condiciones.some(c => !c.ok && c.pid === 'yilian' && c.k === 'partido'));
});
test('auditoría S29 (lugar L3) · «sin local fijo» quiere decir lo mismo en el generador y en la planilla', { todo: 'F6 · S29 (D7)' }, () => {
  const { cfg, st } = semilla(); const e = semana(LUNES);
  M.asignar(e, cfg, st, '2026-09-30', 'MONACO_M', 'cris', {});   // con alguien de sala, Tere (apoyo) es candidata
  const c = M.candidatosPara(cfg, st, e, '2026-09-30', 'MONACO_M').find(x => x.pid === 'tere');
  assert.ok(c, 'Tere es candidata');
  M.asignar(e, cfg, st, '2026-09-30', 'MONACO_M', 'tere', {});
  assert.equal(!!(c && c.razones.includes('sin local fijo')), M.posicionesDe(cfg, st, e, '2026-09-30', 'MONACO_M').find(x => x.pid === 'tere').comodin);
});
test('auditoría S30 (lugar L4, la parte de Equipo) · el veto de los lunes se ve como de los lunes en la tarjeta', { todo: 'F6 · S30' }, () => {
  const { cfg, st } = semilla();
  const chips = funcionDeApp('19-vista-equipo.js', 'chipsCondiciones', { S: Object.assign({}, cfg, { staff: st }), isoHoy: () => '2026-09-24', esc: s => String(s), tchip: (lbl, txt) => `[${lbl}: ${txt}]`, lblCaracteristica: k => k, lblFranjas: () => '', lblDows: d => (d || []).join(','), lblDowPl: d => M.DOW_PL[d].replace('los ', ''), chipLocal: (id, x) => M.localDe(cfg, id).nombre + (x ? ' ' + x : ''), nombrePid: id => (M.personaDe(st, id) || {}).nombre, lblNoPrimero: f => f.join(','), lblTurno: x => x });
  assert.ok(/lunes/.test((chips(M.personaDe(st, 'mariluz')).match(/\[No hace:[^\]]*\]/) || [''])[0]));
});
test('auditoría S25 (disponibilidad D6, interruptores H7, lugar L11, relaciones-rol «H-nucleo-nuncaCon») · el núcleo lee la ficha por la misma puerta', { todo: 'F7 · S25' }, () => {
  const { cfg, st } = semilla(); cfg.reglas = { nuncaCon: false };
  const pb = M.toProblem(cfg, st, M.nuevoEstado(2026, 10, { festivos: [] }), '2026-10-02', '2026-10-04');
  assert.ok(!pb.rules.some(r => r.id === 'nunca con'));
  const w = pb.workers.find(x => x.id === 'dulce');
  assert.ok(w, 'Dulce sigue en el problema, con todos los medios días a «*» (standby)');
  // (interruptores H7, lugar L11) lo apagado no entra como indisponible; ni cocina obligatoria en un medio día cerrado
  const c2 = semilla(); M.personaDe(c2.st, 'tere').inactivas = ['libra', 'locales']; const e2 = semana(LUNES);
  M.toggleApertura(e2, LUNES, 'MONACO_T', c2.cfg);
  const pr = M.toProblem(c2.cfg, c2.st, e2, LUNES, M.addDias(LUNES, 6), {});
  assert.equal(pr.workers.find(x => x.id === 'tere').allowed_shifts.length, 4, '«Locales» apagado');
  const i = pr.meta.indices.findIndex(x => x.iso === LUNES && x.franja === 'T');
  assert.ok(!pr.rules.some(r => r.type === 'skill_coverage' && r.mode === 'hard' && r.params.requirements[0].shift === 'MONACO' && r.scope.day_tags.every(tag => pr.days[i].tags.includes(tag))), 'cocina obligatoria en un medio día cerrado');
  // (disponibilidad D6) el día libre de ESA semana
  const c3 = semilla(); M.ponerLibraPuntual(M.personaDe(c3.st, 'mariluz'), '2026-10-05', [2]);
  const p3 = M.toProblem(c3.cfg, c3.st, M.nuevoEstado(2026, 10, { festivos: [] }), '2026-10-05', '2026-10-11', {});
  const j = (iso, f) => p3.meta.indices.findIndex(x => x.iso === iso && x.franja === f);
  assert.equal(p3.workers.find(x => x.id === 'mariluz').unavailable[j('2026-10-07', 'M')], undefined, 'el miércoles que trabaja esa semana');
});
