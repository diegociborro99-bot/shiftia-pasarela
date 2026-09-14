// Web Push en el servidor: claves VAPID persistidas en `meta`, tabla de
// suscripciones por usuario y envío en segundo plano al cambiar el estado.
// Sin dependencias. server.js solo cablea los endpoints y llama a notificar().
'use strict';
const { generarClavesVapid, enviarPush } = require('./push.js');
const { notificacionesDe, repartir } = require('./push-servicio.js');

function pushServidor(db, opts) {
  const o = opts || {};
  db.exec(`CREATE TABLE IF NOT EXISTS push_subs(
    endpoint TEXT PRIMARY KEY, uid INTEGER NOT NULL, json TEXT NOT NULL, creado INTEGER NOT NULL, ua TEXT, fallos INTEGER NOT NULL DEFAULT 0
  )`);
  try { db.exec('ALTER TABLE push_subs ADD COLUMN fallos INTEGER NOT NULL DEFAULT 0'); } catch (e) {}
  const MAX_POR_USUARIO = o.maxPorUsuario || 5;
  // solo servicios push conocidos (PUSH_HOSTS amplía la lista); nunca IPs ni hosts internos
  const HOSTS = (o.hosts || (process.env.PUSH_HOSTS ? process.env.PUSH_HOSTS.split(',') : []))
    .concat(['fcm.googleapis.com', 'android.googleapis.com', 'push.services.mozilla.com', 'notify.windows.com', 'push.apple.com', 'push.samsungosp.com', 'push.opera.com', 'jpush.cn'])
    .map(h => h.trim().toLowerCase()).filter(Boolean);
  function hostPermitido(endpoint) {
    let u; try { u = new URL(endpoint); } catch (e) { return false; }
    const h = u.hostname.toLowerCase();
    if (/^[\d.]+$/.test(h) || h.includes(':') || /\.(local|internal|localhost)$/.test(h) || h === 'localhost') return false;
    return HOSTS.some(p => h === p || h.endsWith('.' + p));
  }
  // claves: VAPID_PUBLIC/VAPID_PRIVATE por entorno; si no, se generan una vez y se guardan
  let claves = null;
  if (o.publica && o.privada) claves = { publica: o.publica, privada: o.privada };
  else {
    const fila = db.prepare('SELECT v FROM meta WHERE k=?').get('vapid');
    if (fila) { try { claves = JSON.parse(fila.v); } catch (e) { claves = null; } }
    if (!claves) { claves = generarClavesVapid(); db.prepare('INSERT OR REPLACE INTO meta(k,v) VALUES (?,?)').run('vapid', JSON.stringify(claves)); }
  }
  const contacto = o.contacto || 'mailto:soporte@highkeylabs.es';

  function suscribir(uid, suscripcion, ua) {
    if (!suscripcion || typeof suscripcion.endpoint !== 'string' || !/^https:\/\//.test(suscripcion.endpoint) || suscripcion.endpoint.length > 2000) return false;
    if (!hostPermitido(suscripcion.endpoint)) return false;
    const k = suscripcion.keys || {};
    if (typeof k.p256dh !== 'string' || typeof k.auth !== 'string' || k.p256dh.length > 200 || k.auth.length > 60) return false;
    const limpia = { endpoint: suscripcion.endpoint, keys: { p256dh: k.p256dh, auth: k.auth } };
    db.prepare('INSERT INTO push_subs(endpoint,uid,json,creado,ua,fallos) VALUES (?,?,?,?,?,0) ON CONFLICT(endpoint) DO UPDATE SET uid=excluded.uid, json=excluded.json, fallos=0')
      .run(limpia.endpoint, uid, JSON.stringify(limpia), Date.now(), String(ua || '').slice(0, 200));
    // tope de dispositivos por usuario: fuera los más antiguos
    const sobran = db.prepare('SELECT endpoint FROM push_subs WHERE uid=? ORDER BY creado DESC').all(uid).slice(MAX_POR_USUARIO);
    for (const r of sobran) db.prepare('DELETE FROM push_subs WHERE endpoint=?').run(r.endpoint);
    return true;
  }
  function baja(uid, endpoint) { db.prepare('DELETE FROM push_subs WHERE endpoint=? AND uid=?').run(String(endpoint || ''), uid); }
  function bajaUsuario(uid) { db.prepare('DELETE FROM push_subs WHERE uid=?').run(uid); }
  function suscripciones() {
    return db.prepare('SELECT s.endpoint, s.uid, s.json, u.pid, u.rol FROM push_subs s JOIN users u ON u.id = s.uid').all()
      .map(r => { let sub = null; try { sub = JSON.parse(r.json); } catch (e) {} return sub ? { uid: r.uid, pid: r.pid, rol: r.rol, endpoint: r.endpoint, sub } : null; }).filter(Boolean);
  }
  // compara estados y envía; devuelve la promesa (el servidor no la espera)
  async function notificar(antes, despues) {
    const notis = notificacionesDe(antes, despues);
    if (!notis.length) return { enviadas: 0 };
    const envios = repartir(notis, suscripciones());
    let enviadas = 0, caducadas = 0;
    const fallo = endpoint => {
      db.prepare('UPDATE push_subs SET fallos = fallos + 1 WHERE endpoint=?').run(endpoint);
      const f = db.prepare('SELECT fallos FROM push_subs WHERE endpoint=?').get(endpoint);
      if (f && f.fallos >= 5) { db.prepare('DELETE FROM push_subs WHERE endpoint=?').run(endpoint); caducadas++; }
    };
    const uno = async ({ sub, noti }) => {
      try {
        const r = await enviarPush(sub.sub, { titulo: noti.titulo, cuerpo: noti.cuerpo, url: noti.url, tag: noti.tag }, claves, { fetch: o.fetch, sub: contacto, timeoutMs: o.timeoutMs });
        if (r.ok) { enviadas++; db.prepare('UPDATE push_subs SET fallos=0 WHERE endpoint=? AND fallos>0').run(sub.endpoint); }
        else if (r.caducada) { caducadas++; db.prepare('DELETE FROM push_subs WHERE endpoint=?').run(sub.endpoint); }
        else fallo(sub.endpoint);
      } catch (e) { fallo(sub.endpoint); }   // timeout o red caída: cuenta como fallo; a los 5 seguidos, fuera
    };
    // concurrencia acotada y cediendo el hilo entre lotes (no bloquea al resto de peticiones)
    const LOTE = o.lote || 8;
    for (let i = 0; i < envios.length; i += LOTE) {
      await Promise.all(envios.slice(i, i + LOTE).map(uno));
      await new Promise(r => setImmediate(r));
    }
    return { enviadas, caducadas, total: envios.length };
  }
  return { clave: () => claves.publica, suscribir, baja, bajaUsuario, suscripciones, notificar };
}

module.exports = { pushServidor };
