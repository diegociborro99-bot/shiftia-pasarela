// ================= REVISIÓN DEL MES =================
// Todo lo que no cuadra del mes en pantalla: casillas cortas (con el mínimo y si es
// supuesto), sin cocina, nadie que abra, incompatibles y forzados. Cada línea lleva al día.
// 24/09 (revisión F3): lo autorizado (D1: el partido para cubrir a quien falta) va en su propio grupo,
// «Autorizado · para que lo sepas»: salía en «Pendiente de confirmar con el grupo», como si hubiera que
// preguntar algo
const NIVEL_LBL = { alta: ['var(--bad)', 'Hay que resolver'], media: ['var(--warn)', 'Conviene revisar'], info: ['var(--accent)', 'Pendiente de confirmar con el grupo'], autorizado: ['var(--ok)', 'Autorizado · para que lo sepas'] };
function pintaRevDot() {
  const dot = document.getElementById('revDot'); if (!dot || !est) return;
  const n = revisionMes(S, S.staff, est, { hoy: isoHoy() }).filter(x => x.nivel === 'alta').length;
  dot.classList.toggle('hidden', !n);
  const b = document.getElementById('topRevisar'); if (b) b.title = n ? `Revisar el mes: ${n} aviso(s) importante(s)` : 'Revisar el mes';
}
function openRevision() {
  // con la fecha de hoy: lo ya pasado que solo cierra «Cuándo abre» no es un aviso (revisión F2)
  const h = revisionMes(S, S.staff, est, { hoy: isoHoy() });
  const grupo = x => x.tipo === 'autorizado' ? 'autorizado' : x.nivel;
  const grupos = ['alta', 'media', 'info', 'autorizado'].map(n => [n, h.filter(x => grupo(x) === n)]);
  const supuestos = turnosConSupuesto(S);
  const html = `<span class="micro">REVISIÓN DE ${MESES[S.m - 1].toUpperCase()} ${S.y}</span>
    <h2 class="revh2" style="margin-top:8px">${h.length ? pl(h.length, 'cosa que mirar', 'cosas que mirar') : 'Todo en orden'}</h2>
    <p class="revsub">Las reglas duras del grupo (mínimos fijados, cocina obligatoria, cierres, «nunca con») salen en rojo; los mínimos supuestos y los avisos en ámbar; lo pendiente de confirmar con el grupo en azul, y lo autorizado (el partido para cubrir a quien falta), en verde, solo para que se sepa. ${supuestos} de los 54 huecos semanales tienen mínimo supuesto: se cambian en Equipo → Ajustes de los locales.</p>
    ${h.length ? grupos.filter(([, xs]) => xs.length).map(([n, xs]) => `<div class="revgrp"><span class="dot" style="background:${NIVEL_LBL[n][0]}"></span>${NIVEL_LBL[n][1].toUpperCase()} · ${xs.length}</div>${xs.slice(0, 120).map(x => `<div class="revitem ${n}"><span class="lpill" style="--lc:${colorLocal(partirTurno(x.turnoId).localId)}">${esc((localDe(S, partirTurno(x.turnoId).localId) || {}).corto || '')}·${partirTurno(x.turnoId).franja}</span><span class="msg">${esc(x.msg)}</span><button class="revgo" data-irdia="${x.iso}">${fmtDM(x.iso)} →</button></div>`).join('')}${xs.length > 120 ? `<p class="filltxt">y ${xs.length - 120} más</p>` : ''}`).join('') : '<div class="revok"><span class="big">✓</span><b>Ni una casilla corta, ni sin cocina, ni incompatibles.</b></div>'}`;
  const ov = abrirOverlay('revOvl', html, { ancho: 700 });
  ov.addEventListener('click', e => { const b = e.target.closest('[data-irdia]'); if (b) { ov.remove(); irAIso(b.dataset.irdia); } });
}
$('#topRevisar').addEventListener('click', openRevision);
