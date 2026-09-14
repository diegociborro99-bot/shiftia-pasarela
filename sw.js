// Shiftia SW: precache del shell y red-primero con caída a caché (offline listo)
// + notificaciones push. Nunca cachea /api/* (datos personales y stream SSE).
// El nombre de la caché lleva la huella del build, que llega en la URL con la que
// se registra el worker (./sw.js?b=<build>). Antes era un literal que había que
// subir a mano: si a alguien se le olvidaba, una versión nueva se seguía sirviendo
// desde la caché vieja. Ahora cada despliegue estrena caché y borra las demás.
const BUILD = new URL(self.location).searchParams.get('b') || 'v3';
const CACHE = 'shiftia-' + BUILD;
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./'])).catch(() => {}));
});
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  e.respondWith(
    fetch(e.request).then(r => {
      // «/» devuelve la app o la pantalla de acceso según haya sesión: tras cerrar
      // sesión, la pantalla de acceso pisaba la entrada del shell y sin conexión
      // la app instalada solo enseñaba el acceso. Solo se guarda la app.
      const esNav = e.request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html';
      if (r.ok && (!esNav || r.headers.get('X-Shiftia-Doc') === 'app')) { const copia = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copia)).catch(() => {}); }
      return r;
    }).catch(() =>
      caches.match(e.request, { ignoreSearch: true }).then(m => m || caches.match('./')))
  );
});
// ---------- notificaciones push ----------
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { titulo: 'Shiftia', cuerpo: e.data ? e.data.text() : '' }; }
  const titulo = d.titulo || 'Shiftia · Urología';
  e.waitUntil(self.registration.showNotification(titulo, {
    body: d.cuerpo || '', icon: './icons/icon-192.png', badge: './icons/icon-192.png',
    tag: d.tag || undefined, renotify: !!d.tag, data: { url: d.url || './' },
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const destino = new URL((e.notification.data && e.notification.data.url) || './', self.location.origin).href;
  const ir = new URL(destino).searchParams.get('ir');
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    const c = cs.find(x => 'focus' in x);
    if (c) { try { c.postMessage({ ir }); } catch (x) {} return c.focus().catch(() => self.clients.openWindow(destino)); }
    return self.clients.openWindow(destino);
  }));
});
