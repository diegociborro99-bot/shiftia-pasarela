// ================= ARRANQUE =================
// Con el teclado abierto, iOS no encoge la ventana: las hojas ancladas abajo
// quedaban debajo del teclado. visualViewport sabe cuánto tapa: se publica en --kb.
if (window.visualViewport) {
  const kb = () => { const h = Math.max(0, Math.round(innerHeight - visualViewport.height - visualViewport.offsetTop)); document.documentElement.style.setProperty('--kb', h + 'px'); };
  visualViewport.addEventListener('resize', kb); visualViewport.addEventListener('scroll', kb); kb();
}
(function init() {
  // el ?v= que pone el reinicio limpio es de un solo uso
  try {
    const u = new URL(location.href);
    if (u.searchParams.has('v')) { u.searchParams.delete('v'); history.replaceState(null, '', u.pathname + u.search + u.hash); }
  } catch (e) {}
  let esPrimeraVez = true;
  try { esPrimeraVez = !localStorage.getItem(LS_KEY); } catch (e) {}
  S = loadState() || freshState();
  migrarEstado(S);
  restaurarNav();
  cargarMes();
  // ?demo=1 → el mes en curso y el siguiente se generan con la semana tipo (solo lo
  // que esté vacío) y se marca un partido de muestra. En modo servidor el estado
  // real llega tras el login y pisa esta siembra local.
  try {
    if (new URLSearchParams(location.search).has('demo')) {
      const r = sembrarDemo(S, isoHoy());
      if (r.meses.length) registrarCambio(`Mes de muestra: ${r.meses.join(' y ')} generados con la semana tipo (${r.aplicados} plazas)${r.evento ? ', partido de muestra el ' + fmtDM(r.evento) : ''}`, 'ia');
    }
  } catch (e) {}
  if (S.day > est.days.length) S.day = 1;
  const hoy = isoHoy();
  if (esPrimeraVez && hoy.slice(0, 7) === mesKey(S.y, S.m)) S.day = +hoy.slice(8, 10);
  if (typeof estadoCorrupto !== 'undefined' && estadoCorrupto) setTimeout(() => toast('Los datos guardados estaban dañados y se ha empezado de cero. La copia dañada quedó guardada por si hay que recuperarla', 'bad'), 800);
  actualizarUndoBtn();
  renderDia();
  saveState();
})();
