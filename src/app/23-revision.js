// ================= REVISIÓN DEL MES =================
// Todo lo que no cuadra del mes en pantalla: casillas cortas (con el mínimo y si es
// supuesto), sin cocina, nadie que abra, incompatibles y forzados. Cada línea lleva al día.
// 24/09 (revisión F3): lo autorizado (D1: el partido para cubrir a quien falta) va en su propio grupo,
// «Autorizado · para que lo sepas»: salía en «Pendiente de confirmar con el grupo», como si hubiera que
// preguntar algo
// 01/10 (A7; revisión de cliente de A4, S3, y de A5, S2): lo de los días ya trabajados va aparte, en gris, «Ya pasado»: ni en rojo ni
// en ámbar (no se puede resolver; generar desde hoy no lo toca). Antes un «nunca con» recién puesto llenaba «Hay que resolver» de
// días de septiembre, y los huecos de días ya trabajados salían en rojo
const NIVEL_LBL = { alta: ['var(--bad)', 'Hay que resolver'], media: ['var(--warn)', 'Conviene revisar'], info: ['var(--accent)', 'Pendiente de confirmar con el grupo'], autorizado: ['var(--ok)', 'Autorizado · para que lo sepas'], pasado: ['var(--ink3)', 'Ya pasado · para que lo sepas'] };
// 01/10 (corrección de A7; revisión de cliente B3): lo mismo en varios días de una casilla —una pareja «nunca con», o quien ya no
// puede estar en su sitio (Tere «solo Bar Mónaco»)— va en una sola línea con sus días: «Pasarela · mañanas del jue 15 al vie 16 y del
// lun 19 al vie 23: Tere: solo Bar Mónaco — sale al volver a generar la semana». Un cambio de ficha dejaba 13 líneas rojas solo de Tere.
// Lo que cuenta la Revisión (el título, cada grupo y el punto rojo) son estas líneas
const FRANJA_PL = { M: 'mañanas', T: 'tardes' };
const diaCortoRev = iso => `${DIAS_L[isoDow(iso)].slice(0, 3).toLowerCase()} ${+iso.slice(8, 10)}`;
function lineasRevision(h) {
  const out = [], juntas = new Map();
  for (const x of h) {
    const i = x.msg.indexOf(': ');
    if ((x.tipo !== 'incompatibles' && x.tipo !== 'regla-dura') || i < 0) { out.push(x); continue; }
    const k = [x.nivel, x.tipo, x.turnoId, x.msg.slice(i + 2)].join('|');
    const g = juntas.get(k);
    if (g) { g.isos.push(x.iso); continue; }
    const y = Object.assign({}, x, { isos: [x.iso], resto: x.msg.slice(i + 2) });
    juntas.set(k, y); out.push(y);
  }
  for (const g of juntas.values()) if (g.isos.length > 1) { const { localId, franja } = partirTurno(g.turnoId); g.msg = `${nombreLocal(localId)} · ${FRANJA_PL[franja]} ${textoTramos(g.isos, diaCortoRev)}: ${g.resto}`; }
  return out;
}
function pintaRevDot() {
  const dot = document.getElementById('revDot'); if (!dot || !est) return;
  const n = lineasRevision(revisionMes(S, S.staff, est, { hoy: isoHoy(), ahoraHM: horaMadrid() })).filter(x => x.nivel === 'alta').length;
  dot.classList.toggle('hidden', !n);
  // (corrección de A7; revisión de cliente B2) el plural de verdad (decía «aviso» y «importante» con la ese entre paréntesis)
  const b = document.getElementById('topRevisar'); if (b) b.title = n ? `Revisar el mes: ${pl(n, 'aviso importante', 'avisos importantes')}` : 'Revisar el mes';
}
function openRevision() {
  // con la fecha de hoy: lo ya pasado que solo cierra «Cuándo abre» no es un aviso (revisión F2)
  const h = lineasRevision(revisionMes(S, S.staff, est, { hoy: isoHoy(), ahoraHM: horaMadrid() }));
  const grupo = x => x.nivel === 'pasado' ? 'pasado' : x.tipo === 'autorizado' ? 'autorizado' : x.nivel;
  const grupos = ['alta', 'media', 'info', 'autorizado', 'pasado'].map(n => [n, h.filter(x => grupo(x) === n)]);
  const supuestos = turnosConSupuesto(S);
  // (corrección de A7; revisión de cliente B2) el número, sin lo ya pasado («59 cosas que mirar» con 23 ya pasadas): lo pasado, aparte
  const pasadas = h.filter(x => x.nivel === 'pasado').length, vivas = h.length - pasadas;
  const titulo = !h.length ? 'Todo en orden' : `${vivas ? pl(vivas, 'cosa que mirar', 'cosas que mirar') : 'Nada que mirar de hoy en adelante'}${pasadas ? ` (y ${pl(pasadas, 'ya pasada', 'ya pasadas')})` : ''}`;
  // (corrección de A7; revisión de cliente B4) en el móvil la explicación va plegada (ocupaba media pantalla antes de la primera línea) y
  // la «×» va en una barra fija con el título (se montaba sobre los botones de fecha al bajar)
  const html = `<div class="revbarra"><span class="micro">REVISIÓN DE ${MESES[S.m - 1].toUpperCase()} ${S.y}</span></div>
    <h2 class="revh2" style="margin-top:8px">${titulo}</h2>
    <details class="revleyenda"${innerWidth > 640 ? ' open' : ''}><summary>Qué quiere decir cada color</summary><p class="revsub">Las reglas duras del grupo (mínimos fijados, cocina obligatoria, cierres, «nunca con») y quien ya no puede estar en su sitio (un día libre, una ausencia, un local o una franja que ya no hace, un veto) salen en rojo; los mínimos supuestos, lo forzado y los avisos en ámbar; lo pendiente de confirmar con el grupo en azul, y lo autorizado (el partido para cubrir a quien falta), en verde, solo para que se sepa. Lo de los días ya pasados va al final, en gris: ya se trabajó. ${supuestos} de los 54 huecos semanales tienen mínimo supuesto: se cambian en Equipo → Ajustes de los locales.</p></details>
    ${h.length ? grupos.filter(([, xs]) => xs.length).map(([n, xs]) => `<div class="revgrp"><span class="dot" style="background:${NIVEL_LBL[n][0]}"></span>${NIVEL_LBL[n][1].toUpperCase()} · ${xs.length}</div>${xs.slice(0, 120).map(x => `<div class="revitem ${n}"><span class="lpill" style="--lc:${colorLocal(partirTurno(x.turnoId).localId)}">${esc((localDe(S, partirTurno(x.turnoId).localId) || {}).corto || '')}·${partirTurno(x.turnoId).franja}</span><span class="msg">${esc(x.msg)}</span><button class="revgo" data-irdia="${x.iso}">${fmtDM(x.iso)} →</button></div>`).join('')}${xs.length > 120 ? `<p class="filltxt">y ${xs.length - 120} más</p>` : ''}`).join('') : '<div class="revok"><span class="big">✓</span><b>Ni una casilla corta, ni sin cocina, ni incompatibles.</b></div>'}`;
  const ov = abrirOverlay('revOvl', html, { ancho: 700 });
  const barra = ov.querySelector('.revbarra'), x = ov.querySelector('.ovx'); if (barra && x) barra.appendChild(x);
  ov.addEventListener('click', e => { const b = e.target.closest('[data-irdia]'); if (b) { ov.remove(); irAIso(b.dataset.irdia); } });
}
$('#topRevisar').addEventListener('click', openRevision);
