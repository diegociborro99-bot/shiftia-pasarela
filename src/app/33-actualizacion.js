// ================= AVISO DE VERSIÓN NUEVA =================
// La app es un único HTML cacheado por el service worker, así que un despliegue
// nuevo no llega solo: el navegador puede seguir sirviendo el de ayer durante
// días. Esto lo detecta y ofrece reiniciar limpiando la caché.
//
// Cómo sabe que está vieja: el build deja su huella en el bundle (APP_BUILD) y
// el servidor dice la del bundle que está sirviendo (/api/version). Si no
// coinciden, esta pestaña tiene una versión anterior a la desplegada.
(function () {
  if (typeof APP_BUILD === 'undefined') return;      // build antiguo sin huella
  let avisado = false, comprobando = false;

  async function hayVersionNueva() {
    if (!SRV.on || comprobando) return null;
    comprobando = true;
    try {
      // sin caché de ningún tipo: preguntamos por la versión, no queremos la guardada
      const r = await fetch('/api/version', { credentials: 'same-origin', cache: 'no-store' });
      if (!r.ok) return null;
      const d = await r.json();
      return d.build && d.build !== APP_BUILD ? d : null;
    } catch (e) { return null; }                     // sin conexión: ya se avisa aparte
    finally { comprobando = false; }
  }

  // Reinicio limpio: se van las cachés del service worker y el propio worker, y
  // se recarga pidiendo el HTML de nuevo. NO se toca localStorage: ahí vive la
  // planilla local y lo que aún no se ha sincronizado.
  async function reiniciarLimpio(btn) {
    if (btn) { btn.disabled = true; btn.textContent = 'Actualizando…'; }
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        // update() primero: si el worker nuevo ya está esperando, que tome el mando
        await Promise.all(regs.map(r => r.update().catch(() => {})));
        await Promise.all(regs.map(r => r.unregister().catch(() => {})));
      }
      if (window.caches) {
        const claves = await caches.keys();
        await Promise.all(claves.map(k => caches.delete(k).catch(() => {})));
      }
    } catch (e) { /* si algo falla, se recarga igual: peor es quedarse en la vieja */ }
    // parámetro anti-caché: fuerza al navegador a pedir el HTML de nuevo aunque
    // lo tenga como fresco; la app lo limpia de la barra al arrancar
    const u = new URL(location.href);
    u.searchParams.set('v', Date.now().toString(36));
    location.replace(u.toString());
  }

  function pintaBanner(d) {
    if (avisado || document.getElementById('updBar')) return;
    avisado = true;
    const bar = document.createElement('div');
    bar.className = 'updbar'; bar.id = 'updBar';
    bar.setAttribute('role', 'status');
    bar.innerHTML = `<span class="updic" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/></svg></span>
      <span class="updtx"><b>Hay una nueva actualización disponible</b><small>Versión ${esc(d.app || '')} — al reiniciar se borra la caché y se descarga entera.</small></span>
      <button class="updb" id="updGo">Reiniciar</button>
      <button class="updx" id="updLater" title="Seguir con esta versión por ahora" aria-label="Ahora no">✕</button>`;
    document.body.appendChild(bar);
    requestAnimationFrame(() => bar.classList.add('on'));
    bar.querySelector('#updGo').addEventListener('click', e => reiniciarLimpio(e.currentTarget));
    bar.querySelector('#updLater').addEventListener('click', () => {
      bar.classList.remove('on');
      setTimeout(() => bar.remove(), 300);
      // no se vuelve a avisar en esta pestaña hasta dentro de un rato
      avisado = true;
      setTimeout(() => { avisado = false; }, 30 * 60 * 1000);
    });
  }

  async function comprueba() {
    const d = await hayVersionNueva();
    if (d) pintaBanner(d);
  }

  // Al arrancar, al volver a la pestaña y cada 15 minutos. Volver a la pestaña es
  // el momento bueno: es cuando alguien retoma la app tras un despliegue.
  setTimeout(comprueba, 4000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) comprueba(); });
  setInterval(comprueba, 15 * 60 * 1000);

  // el service worker avisa por su cuenta si detecta un worker nuevo esperando
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration().then(reg => {
      if (!reg) return;
      reg.addEventListener('updatefound', () => {
        const nuevo = reg.installing;
        if (!nuevo) return;
        nuevo.addEventListener('statechange', () => {
          if (nuevo.state === 'installed' && navigator.serviceWorker.controller) comprueba();
        });
      });
    }).catch(() => {});
  }

  // se expone para poder forzarlo desde la Cuenta y desde los tests
  window.buscarActualizacion = comprueba;
  window.reiniciarLimpio = reiniciarLimpio;
})();
