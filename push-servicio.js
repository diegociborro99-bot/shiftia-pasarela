// Qué notificar a quién cuando cambia el estado (lógica pura, sin red ni BD).
// Se aplica en el servidor comparando el estado anterior y el nuevo en cada
// escritura (PUT del admin o delta de empleado).
'use strict';

const recorta = (t, n) => { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; };
const fecha = iso => iso ? `${+iso.slice(8, 10)}/${+iso.slice(5, 7)}` : '';
const nombreDe = (estado, pid) => { const p = (estado.staff || []).find(x => x.id === pid); return p ? p.nombre : pid; };
const destinatariosAviso = a => (Array.isArray(a.paraPids) && a.paraPids.length) ? a.paraPids : (a.paraPid ? [a.paraPid] : null);

// Devuelve [{ para: 'todos' | 'admins' | [pid…], titulo, cuerpo, url, tag }]
function notificacionesDe(antes, despues, ahora) {
  const out = [];
  const a = antes || {}, d = despues || {};
  const t0 = ahora || Date.now();
  // solo lo creado en esta escritura: restaurar una copia antigua no dispara ráfagas
  const reciente = ts => { if (typeof ts === 'number') return t0 - ts < 10 * 60e3; if (typeof ts === 'string' && /^\d{4}-\d{2}-\d{2}/.test(ts)) return ts.slice(0, 10) >= new Date(t0 - 864e5).toISOString().slice(0, 10); return true; };
  const PET_LBL = { VAC: 'vacaciones', LD: 'días libres', cambio: 'cambio de turno' };
  // 1) avisos nuevos
  const idsAntes = new Set((a.avisos || []).map(x => x.id));
  for (const av of d.avisos || []) {
    if (idsAntes.has(av.id)) continue;
    if (av.id && /^a_res\d*_/.test(av.id)) continue;       // las resoluciones se notifican como petición
    if (av.caducidad && av.caducidad <= t0) continue;
    if (!reciente(av.ts)) continue;
    out.push({ para: destinatariosAviso(av) || 'todos', titulo: 'Aviso del servicio', cuerpo: recorta(av.texto, 140), url: '/?ir=bandeja', tag: 'aviso-' + av.id });
  }
  // 2) peticiones: nuevas (al admin y, si es cambio con compañero, al compañero), aceptadas, resueltas
  const petAntes = new Map((a.peticiones || []).map(x => [x.id, x]));
  for (const p of d.peticiones || []) {
    const prev = petAntes.get(p.id);
    const quien = nombreDe(d, p.pid).split(' ')[0];
    if (!prev) {
      if (!reciente(p.ts)) continue;
      out.push({ para: 'admins', titulo: 'Nueva petición', cuerpo: `${nombreDe(d, p.pid)}: ${PET_LBL[p.tipo] || p.tipo} ${fecha(p.desde)}${p.hasta && p.hasta !== p.desde ? '–' + fecha(p.hasta) : ''}`, url: '/?ir=peticiones', tag: 'pet-' + p.id });
      if (p.tipo === 'cambio' && p.conPid && p.conIso) out.push({ para: [p.conPid], titulo: 'Propuesta de cambio de turno', cuerpo: `${quien} te propone cambiar su turno del ${fecha(p.desde)} por el tuyo del ${fecha(p.conIso)}. Acepta o rechaza en tus Peticiones.`, url: '/?ir=pet', tag: 'cambio-' + p.id });
      continue;
    }
    if (p.tipo === 'cambio' && p.aceptada && !prev.aceptada) out.push({ para: 'admins', titulo: 'Cambio de turno aceptado', cuerpo: `${nombreDe(d, p.conPid)} ha aceptado el cambio con ${nombreDe(d, p.pid)} (${fecha(p.desde)} ↔ ${fecha(p.conIso)}): pendiente de tu aprobación.`, url: '/?ir=peticiones', tag: 'cambio-ok-' + p.id });
    if (prev.estado === 'pendiente' && p.estado !== 'pendiente' && p.estado !== 'retirada') {
      const txt = p.estado === 'aprobada' ? 'APROBADA' : 'RECHAZADA';
      const cuerpoBase = `Tu petición de ${PET_LBL[p.tipo] || p.tipo} (${fecha(p.desde)}) ha sido ${txt}${p.rechazadaPor === 'companero' ? ' por tu compañero' : ''}.`;
      out.push({ para: [p.pid], titulo: `Petición ${txt.toLowerCase()}`, cuerpo: cuerpoBase, url: '/?ir=pet', tag: 'res-' + p.id });
      if (p.tipo === 'cambio' && p.conPid && p.conIso && p.estado === 'aprobada') out.push({ para: [p.conPid], titulo: 'Cambio de turno aprobado', cuerpo: `Tu cambio con ${quien} está aprobado: ahora tienes el ${fecha(p.desde)} y ${quien} el ${fecha(p.conIso)}.`, url: '/?ir=planilla', tag: 'res2-' + p.id });
    }
  }
  return out;
}

// Resuelve a qué suscripciones va cada notificación. subs = [{ uid, pid, rol, sub }]
function repartir(notis, subs) {
  const envios = [];
  for (const n of notis) {
    for (const s of subs) {
      const va = n.para === 'todos' ? !!s.pid : n.para === 'admins' ? s.rol === 'admin' : Array.isArray(n.para) && n.para.includes(s.pid);
      if (va) envios.push({ sub: s, noti: n });
    }
  }
  return envios;
}

module.exports = { notificacionesDe, repartir };
