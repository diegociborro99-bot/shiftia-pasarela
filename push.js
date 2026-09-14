// Web Push sin dependencias: cifrado aes128gcm (RFC 8291 / RFC 8188) y
// autenticación VAPID (RFC 8292, JWT ES256). Solo node:crypto + fetch.
'use strict';
const crypto = require('node:crypto');

const b64u = buf => Buffer.from(buf).toString('base64url');
const deB64u = txt => Buffer.from(String(txt), 'base64url');

// ---------- cifrado del payload para el navegador ----------
// sub = { endpoint, keys: { p256dh, auth } } tal como lo da pushManager.subscribe().
// opts.claveLocal (privada raw 32 bytes) y opts.salt (16 bytes) solo para tests.
function cifrarWebPush(payload, sub, opts) {
  const o = opts || {};
  const uaPublica = deB64u(sub.keys.p256dh);           // 65 bytes, sin comprimir
  const auth = deB64u(sub.keys.auth);                   // 16 bytes
  if (uaPublica.length !== 65 || auth.length !== 16) throw new Error('claves de suscripción inválidas');
  const ecdh = crypto.createECDH('prime256v1');
  if (o.claveLocal) ecdh.setPrivateKey(deB64u(o.claveLocal)); else ecdh.generateKeys();
  const asPublica = ecdh.getPublicKey();                // 65 bytes
  const secreto = ecdh.computeSecret(uaPublica);
  const salt = o.salt ? deB64u(o.salt) : crypto.randomBytes(16);
  // IKM = HKDF(auth, ecdh_secret, "WebPush: info" || 0x00 || ua_public || as_public, 32)
  const infoIkm = Buffer.concat([Buffer.from('WebPush: info\0'), uaPublica, asPublica]);
  const ikm = Buffer.from(crypto.hkdfSync('sha256', secreto, auth, infoIkm, 32));
  const cek = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16));
  const nonce = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12));
  const texto = Buffer.concat([Buffer.from(String(payload), 'utf8'), Buffer.from([2])]);   // 0x02 = último registro
  const cipher = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const cifrado = Buffer.concat([cipher.update(texto), cipher.final(), cipher.getAuthTag()]);
  const rs = Buffer.alloc(4); rs.writeUInt32BE(4096);
  const cabecera = Buffer.concat([salt, rs, Buffer.from([asPublica.length]), asPublica]);
  return Buffer.concat([cabecera, cifrado]);
}

// ---------- claves VAPID ----------
function generarClavesVapid() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const jwk = privateKey.export({ format: 'jwk' });
  const pub = publicKey.export({ format: 'jwk' });
  const publica = Buffer.concat([Buffer.from([4]), deB64u(pub.x), deB64u(pub.y)]);   // raw sin comprimir (lo que pide el navegador)
  return { publica: b64u(publica), privada: jwk.d };
}
function clavePrivadaVapid(publicaB64u, privadaB64u) {
  const raw = deB64u(publicaB64u);
  if (raw.length !== 65 || raw[0] !== 4) throw new Error('clave pública VAPID inválida');
  return crypto.createPrivateKey({ format: 'jwk', key: { kty: 'EC', crv: 'P-256', x: b64u(raw.subarray(1, 33)), y: b64u(raw.subarray(33, 65)), d: privadaB64u } });
}
// Authorization: vapid t=<jwt>, k=<publica>
function cabeceraVapid(endpoint, claves, sub, ahora) {
  const aud = new URL(endpoint).origin;
  const exp = Math.floor((ahora || Date.now()) / 1000) + 12 * 3600;
  const enc = obj => b64u(Buffer.from(JSON.stringify(obj)));
  const firmado = `${enc({ typ: 'JWT', alg: 'ES256' })}.${enc({ aud, exp, sub: sub || 'mailto:soporte@highkeylabs.es' })}`;
  const firma = crypto.sign('sha256', Buffer.from(firmado), { key: clavePrivadaVapid(claves.publica, claves.privada), dsaEncoding: 'ieee-p1363' });
  return `vapid t=${firmado}.${b64u(firma)}, k=${claves.publica}`;
}

// ---------- envío ----------
// Devuelve { ok, status, caducada } — caducada=true si el navegador ya no tiene la suscripción (404/410).
async function enviarPush(sub, payload, claves, opts) {
  const o = opts || {};
  const cuerpo = cifrarWebPush(typeof payload === 'string' ? payload : JSON.stringify(payload), sub);
  const r = await (o.fetch || fetch)(sub.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream', 'Content-Encoding': 'aes128gcm',
      TTL: String(o.ttl || 86400), Urgency: o.urgencia || 'normal',
      Authorization: cabeceraVapid(sub.endpoint, claves, o.sub),
    },
    body: cuerpo,
    signal: AbortSignal.timeout(o.timeoutMs || 10000),
  });
  // 404/410 = suscripción caducada; 401/403 = clave VAPID rechazada (suscripción hecha con otra clave)
  return { ok: r.status >= 200 && r.status < 300, status: r.status, caducada: r.status === 404 || r.status === 410 || r.status === 401 || r.status === 403 };
}

module.exports = { cifrarWebPush, generarClavesVapid, cabeceraVapid, enviarPush, clavePrivadaVapid };
