'use strict';
// 24/09 (revisión de la fase 5): la foto de antes de la fase 5 para las pruebas «F5 · 0b» y «F5 · 0c» de
// modelo.test.js: las semanas del 21/09, 28/09 y 05/10 generadas con la semana tipo (casilla a casilla: quién,
// cocina, abre y «por») y el plan A de la Cobertura de Iván (02-04/10). Antes esas pruebas comparaban el código
// nuevo consigo mismo (con la carga del mes a 0) y no veían lo que cambiaba la fase 5 en esas semanas.
// Se generó con el modelo del commit 86da4ff:
//   git show 86da4ff:modelo.js > /tmp/modelo-86da4ff.js
//   MODELO=/tmp/modelo-86da4ff.js node tests/fotos/foto-f5.js > tests/fotos/f5-head.json
// (con MODELO=./modelo.js sale lo que da el código de ahora, para comparar)
const path = require('path');
const M = require(path.resolve(process.env.MODELO || path.join(__dirname, '..', '..', 'modelo.js')));
const cfgBase = () => M.semillaPasarela();
function cieRango(cfg, desde, hasta) {
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
const F3_VIE = '2026-10-02', F3_SAB = '2026-10-03', F3_DOM = '2026-10-04';
const F3_INC = () => ({ pid: 'ivan', tipo: 'VAC', dias: [F3_VIE, F3_SAB, F3_DOM], desde: F3_VIE, hasta: F3_DOM });
function f3Escenario() {
  const cfg = Object.assign(cfgBase(), { meses: {} });
  delete M.personaDe(cfg.staff, 'dulce').standby;
  M.personaDe(cfg.staff, 'mariluz').cubreA = [{ pid: 'ivan' }];
  M.sembrarDemo(cfg, '2026-09-24');
  return cfg;
}
const f3Entero = (cfg, inc) => { const r = M.rangoNecesario(inc); return M.clonarEstado(cieRango(cfg, r.desde, r.hasta)); };
const semanas = {};
{
  const cfg = Object.assign(cfgBase(), { meses: {} });
  for (const lunes of ['2026-09-21', '2026-09-28', '2026-10-05']) {
    const e = cieRango(cfg, lunes, M.addDias(lunes, 6));
    const r = M.generarSemana(cfg, cfg.staff, e, lunes, { meses: cfg.meses });
    for (const d of r.dias) for (const t of M.turnosDe(cfg)) semanas[d + '|' + t.id] = M.asignados(r.estado, d, t.id).map(x => [x.pid, x.cocina ? 'c' : '', x.abre ? 'a' : '', x.por || ''].join('~')).join(',');
    semanas[lunes + '|huecos'] = r.huecos.map(h => `${h.iso}|${h.turnoId}|${h.tipo}`).join(',');
  }
}
const planA = {};
for (const conMeses of [false, true]) {
  const cfg = f3Escenario(), inc = F3_INC();
  const A = M.planesCobertura(cfg, cfg.staff, f3Entero(cfg, inc), inc, Object.assign({ siempre: false, intercambio: false }, conMeses ? { meses: cfg.meses } : {})).planes[0];
  planA[conMeses ? 'conMeses' : 'sinMeses'] = A.asignaciones.map(a => `${a.iso}|${a.tid}|${a.pid}|${a.yaEstaba ? 'ya' : ''}|${a.cocina ? 'c' : ''}|${a.abre ? 'a' : ''}|${a.por || ''}`);
}
process.stdout.write(JSON.stringify({ nota: 'Foto de HEAD (86da4ff, antes de la fase 5) para F5 · 0b y 0c de modelo.test.js. Se genera con la copia de modelo.js de ese commit.', semanas, planA }, null, 0) + '\n');
