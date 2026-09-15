// ================= HISTORIAL DE CAMBIOS =================
// Quién hizo qué y cuándo: asignaciones, forzados, ausencias, generador, cierres
// de mes, horas extra, deshacer… Con servidor lleva el usuario que lo hizo.
const HIST_TIPO = {
  manual: ['var(--accent)', 'MANUAL'], asig: ['var(--accent)', 'ASIGNACIÓN'], forzado: ['var(--bad)', 'FORZADO'],
  ia: ['var(--teal)', 'GENERADOR'], undo: ['var(--ink3)', 'DESHECHO'], cambio: ['var(--ink3)', 'CAMBIO'],
  aus: ['var(--warn)', 'AUSENCIA'], aviso: ['var(--warn)', 'AVISO'], cierre: ['#7c5fb8', 'NÓMINA'], extra: ['#7c5fb8', 'HORAS EXTRA'],
  rev: ['var(--teal)', 'REVISIÓN'], pub: ['var(--teal)', 'PUBLICACIÓN'], equipo: ['var(--accent)', 'EQUIPO'], cobertura: ['var(--teal)', 'COBERTURA'],
};
function openHistorial() {
  const ex = document.getElementById('histOvl'); if (ex) ex.remove();
  const ov = document.createElement('div');
  ov.className = 'ovl'; ov.id = 'histOvl';
  let q = '', armado = false;
  ov.innerHTML = `<div class="ovcard big" style="max-width:640px">
    <button class="ovx" data-ovx aria-label="Cerrar">✕</button>
    <span class="micro"><svg class="ic" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3.2 2"/></svg> HISTORIAL DE CAMBIOS</span>
    <div style="display:flex;gap:8px;margin:10px 0;align-items:center">
      <input type="text" id="histQ" placeholder="Filtra por persona, local, tipo…" data-libre style="flex:1;border:1px solid var(--border);border-radius:9px;background:var(--surface);color:var(--ink);font-size:12px;padding:8px 11px;font-family:inherit">
      ${!SRV.on || SRV.esAdmin ? '<button class="btn-mini ghost" id="histClr">Vaciar historial</button>' : ''}
    </div>
    <div id="histBody"></div></div>`;
  document.body.appendChild(ov);
  const pinta = () => {
    const todos = S.historial || [];
    const qq = q.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const lista = todos.filter(x => !qq || (x.txt + ' ' + (HIST_TIPO[x.tipo] || HIST_TIPO.cambio)[1] + ' ' + (x.usuario || '')).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().includes(qq));
    if (!lista.length) {
      ov.querySelector('#histBody').innerHTML = `<div class="revok"><b style="font-family:var(--font-d);font-size:15px">${todos.length ? 'Nada coincide con el filtro' : 'Aún no hay cambios registrados'}</b><p style="font-size:11.5px;color:var(--ink3);margin-top:6px">Cada asignación, forzado, ausencia, evento, generación, cierre de mes o deshacer queda aquí con su hora y quién lo hizo.</p></div>`;
      return;
    }
    const hoyK = new Date().toDateString(), ayerK = new Date(Date.now() - 864e5).toDateString();
    let h = '', diaAct = null;
    for (const x of lista.slice(0, 150)) {
      const d = new Date(x.ts);
      const k = d.toDateString();
      if (k !== diaAct) {
        diaAct = k;
        const lbl = k === hoyK ? 'Hoy' : k === ayerK ? 'Ayer' : `${d.getDate()} de ${MESES[d.getMonth()].toLowerCase()} ${d.getFullYear()}`;
        h += `<div class="cobday"><b>${lbl}</b></div>`;
      }
      const [col, lbl] = HIST_TIPO[x.tipo] || HIST_TIPO.cambio;
      h += `<div class="histrow"><span class="histh">${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}</span>
        <span class="histtag" style="background:color-mix(in srgb,${col} 14%,transparent);color:${col}">${lbl}</span>
        <span class="histx">${esc(x.txt)}</span>
        ${x.usuario ? `<span class="histrol">${esc(x.usuario)}</span>` : ''}</div>`;
    }
    if (lista.length > 150) h += `<p class="filltxt" style="margin-top:8px">Mostrando los 150 más recientes de ${lista.length}.</p>`;
    ov.querySelector('#histBody').innerHTML = h;
  };
  ov.addEventListener('input', e => { if (e.target.id === 'histQ') { q = e.target.value; pinta(); } });
  ov.addEventListener('click', e => {
    if (e.target === ov || e.target.closest('[data-ovx]')) { ov.remove(); return; }
    if (e.target.id === 'histClr') {
      if (!armado) { armado = true; e.target.textContent = '¿Seguro? Toca otra vez'; e.target.style.color = 'var(--bad)'; return; }
      S.historial = []; saveState(); pinta();
      e.target.textContent = 'Vaciar historial'; e.target.style.color = ''; armado = false;
      toast('Historial vaciado', 'warn');
    }
  });
  pinta();
}
$('#topHist').addEventListener('click', openHistorial);
