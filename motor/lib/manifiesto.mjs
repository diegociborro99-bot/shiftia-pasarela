// El manifiesto del cliente (cliente.json): qué es, cómo se valida y qué se deriva de él.
// Todo lo que el motor necesita para levantar una burbuja nueva sale de aquí. La validación
// habla en castellano y junta TODOS los errores antes de parar: un cuestionario mal
// rellenado se corrige de una vez, no error a error.
import { readFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname, extname } from 'node:path';

export class ManifiestoInvalido extends Error {
  constructor(errores, avisos) { super('Manifiesto inválido:\n' + errores.map(e => '  · ' + e).join('\n')); this.errores = errores; this.avisos = avisos || []; }
}

export const RE_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const RE_SLUG_CORTO = /^[a-z0-9]{2,8}$/;
export const RE_USUARIO = /^[a-z0-9ñ._-]{3,30}$/;          // la misma que impone server.js
export const RE_UNIDAD = /^[A-Z][A-Z0-9_]{1,11}$/;
export const RE_PID = /^[a-z0-9]{2,24}$/;
export const RE_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
export const RE_ISO = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
export const RE_COLOR = /^#[0-9a-fA-F]{6}$/;
export const RE_DOMINIO = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/;
export const SECTORES = ['hosteleria', 'retail', 'hospital', 'industria', 'servicios', 'otro'];
export const DOWS = [1, 2, 3, 4, 5, 6, 7];
export const PUESTOS_DEFECTO = [{ id: 'sala', label: 'Sala' }, { id: 'cocina', label: 'Cocina' }, { id: 'apoyo', label: 'Apoyo' }];
const PALETA_UNIDADES = ['#b8741a', '#c2378f', '#2f6db5', '#1f9a6e', '#7c5fb8', '#c26360', '#2e8b7a', '#96580a', '#3f5bd6', '#8a7f5c'];
const NUMEROS = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'];

export function sha256(s) { return createHash('sha256').update(String(s)).digest('hex'); }

export function slugificar(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '').slice(0, 24);
}

// lista de 7 (uno por día, de lunes a domingo) a partir de: una lista de 7, un objeto {dow: v},
// un valor suelto (todos los días igual), o nada (el valor por defecto)
function porDia(v, defecto, nombre, errores) {
  if (v === undefined || v === null) return DOWS.map(() => defecto);
  if (Array.isArray(v)) { if (v.length !== 7) errores.push(`${nombre}: la lista tiene que traer 7 valores (de lunes a domingo), trae ${v.length}`); return DOWS.map((d, i) => v[i] === undefined ? defecto : v[i]); }
  if (typeof v === 'object') return DOWS.map(d => v[d] === undefined ? defecto : v[d]);
  return DOWS.map(() => v);
}

function esLista(v) { return Array.isArray(v); }
function esObjeto(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
function dowsValidos(v, nombre, errores) {
  if (v === undefined) return undefined;
  if (!esLista(v) || v.some(d => !DOWS.includes(d))) { errores.push(`${nombre}: días de la semana como números 1 (lunes) … 7 (domingo)`); return []; }
  return v.slice();
}
function horaValida(h, nombre, errores) { if (h !== undefined && !RE_HORA.test(h)) errores.push(`${nombre}: hora «${h}» no válida (HH:MM)`); return h; }
function tramoValido(t, nombre, errores) {
  if (t === undefined) return undefined;
  if (!esObjeto(t) || t.ini === undefined || t.fin === undefined) { errores.push(`${nombre}: un tramo es {"ini":"HH:MM","fin":"HH:MM"}`); return undefined; }
  horaValida(t.ini, nombre + '.ini', errores); horaValida(t.fin, nombre + '.fin', errores);
  return t;
}
function horarioValido(h, franjas, nombre, errores) {
  if (h === undefined) return undefined;
  if (!esObjeto(h)) { errores.push(`${nombre}: tiene que ser un objeto con un tramo por franja`); return undefined; }
  for (const f of franjas) if (h[f] !== undefined) tramoValido(h[f], `${nombre}.${f}`, errores);
  if (h.porDow !== undefined) { if (!esObjeto(h.porDow)) errores.push(`${nombre}.porDow: objeto {dow: {franja: tramo}}`); else for (const [d, x] of Object.entries(h.porDow)) { if (!DOWS.includes(+d)) errores.push(`${nombre}.porDow: día «${d}» no válido`); if (esObjeto(x)) for (const f of Object.keys(x)) tramoValido(x[f], `${nombre}.porDow.${d}.${f}`, errores); } }
  return h;
}

// ---------- validación ----------
export function validarManifiesto(m, arq, opciones = {}) {
  const errores = [], avisos = [];
  const dirBase = opciones.dirBase || process.cwd();
  if (!esObjeto(m)) throw new ManifiestoInvalido(['el manifiesto tiene que ser un objeto JSON']);
  const cap = (arq && arq.capacidades) || {};
  const franjasArq = cap.franjas || ['M', 'T'];

  // identidad
  if (!m.slug || !RE_SLUG.test(m.slug) || m.slug.length < 3 || m.slug.length > 40) errores.push('slug: obligatorio, 3–40 caracteres, minúsculas, números y guiones (ej. «cafeterias-norte»)');
  if (m.slugCorto !== undefined && !RE_SLUG_CORTO.test(m.slugCorto)) errores.push('slugCorto: 2–8 minúsculas o números (es el prefijo de las claves del navegador)');
  if (!m.nombre || typeof m.nombre !== 'string' || m.nombre.trim().length < 2 || m.nombre.length > 60) errores.push('nombre: obligatorio, 2–60 caracteres (el nombre del cliente tal como se enseña: «Grupo Norte»)');
  else if (/[\[\]()*+?^$|\\{}<>"`]/.test(m.nombre)) errores.push('nombre: sin paréntesis, corchetes, comillas ni símbolos de expresión regular (va dentro de tests y de HTML)');
  if (m.nombreCorto !== undefined && (typeof m.nombreCorto !== 'string' || !m.nombreCorto.trim())) errores.push('nombreCorto: texto');
  if (m.sector !== undefined && !SECTORES.includes(m.sector)) errores.push(`sector: uno de ${SECTORES.join(', ')}`);
  if (m.descripcion !== undefined && typeof m.descripcion !== 'string') errores.push('descripcion: texto');
  if (m.dominio !== undefined && !RE_DOMINIO.test(m.dominio)) errores.push('dominio: un nombre de host (ej. «turnos.cliente.es»), sin https://');
  if (m.arquetipo !== undefined && arq && m.arquetipo !== arq.id) errores.push(`arquetipo: «${m.arquetipo}» no es el arquetipo cargado (${arq.id})`);

  // marca
  const marca = m.marca || {};
  if (!esObjeto(marca)) errores.push('marca: objeto {logo, textoLogo}');
  else {
    if (marca.logo !== undefined) {
      const ruta = resolve(dirBase, marca.logo);
      if (!existsSync(ruta) || !statSync(ruta).isFile()) errores.push(`marca.logo: no encuentro el fichero «${marca.logo}» (relativo al manifiesto)`);
      else if (!['.png', '.svg'].includes(extname(ruta).toLowerCase())) errores.push('marca.logo: PNG o SVG');
    }
    if (marca.textoLogo !== undefined && typeof marca.textoLogo !== 'string') errores.push('marca.textoLogo: texto (admite <b>…</b>)');
  }

  // cuentas
  const cuentas = Object.assign({ programador: 'diego', encargado: 'oficina', jefe: 'admin' }, m.cuentas || {});
  for (const k of ['programador', 'encargado', 'jefe']) if (!RE_USUARIO.test(cuentas[k] || '')) errores.push(`cuentas.${k}: usuario de 3–30 minúsculas, números, punto, guion o guion bajo`);
  if (new Set([cuentas.programador, cuentas.encargado, cuentas.jefe]).size !== 3) errores.push('cuentas: programador, encargado y jefe tienen que ser usuarios distintos');
  if (cuentas.passwordGenerica !== undefined && (typeof cuentas.passwordGenerica !== 'string' || cuentas.passwordGenerica.length < 8)) errores.push('cuentas.passwordGenerica: al menos 8 caracteres');

  // franjas y puestos
  const franjas = m.franjas === undefined ? franjasArq.slice() : m.franjas;
  if (!esLista(franjas) || franjas.join() !== franjasArq.join()) errores.push(`franjas: este arquetipo trabaja con ${JSON.stringify(franjasArq)} (mañana y tarde); otras franjas necesitan un arquetipo nuevo, ver motor/docs/EXTENDER.md`);
  const puestos = m.puestos === undefined ? PUESTOS_DEFECTO : m.puestos;
  if (!esLista(puestos) || !puestos.length || puestos.some(p => !esObjeto(p) || !RE_PID.test(p.id || '') || !p.label)) errores.push('puestos: lista de {id, label} (ids en minúsculas)');
  else {
    if (!puestos.some(p => p.id === 'apoyo')) avisos.push('puestos: no hay puesto «apoyo»; el modelo trata «apoyo» como quien no tiene local fijo (esApoyo) y esa lógica quedará sin uso');
    if (!puestos.some(p => p.id === 'cocina')) avisos.push('puestos: no hay puesto «cocina»; las reglas de cocina siguen existiendo pero nadie la llevará (puedes apagar reglas.cocina)');
  }
  const idsPuesto = esLista(puestos) ? puestos.map(p => p.id) : [];

  // unidades
  const unidades = m.unidades;
  const idsUnidad = [];
  if (!esLista(unidades) || !unidades.length) errores.push('unidades: al menos una (cada local, tienda o centro que se planifica)');
  else unidades.forEach((u, i) => {
    const n = `unidades[${i}]`;
    if (!esObjeto(u)) { errores.push(`${n}: objeto`); return; }
    if (!RE_UNIDAD.test(u.id || '')) errores.push(`${n}.id: MAYÚSCULAS, números y guion bajo, 2–12 caracteres (ej. «CENTRO»)`);
    else if (idsUnidad.includes(u.id)) errores.push(`${n}.id: «${u.id}» repetido`); else idsUnidad.push(u.id);
    if (!u.nombre || typeof u.nombre !== 'string') errores.push(`${n}.nombre: obligatorio`);
    if (u.corto !== undefined && (typeof u.corto !== 'string' || u.corto.length > 6)) errores.push(`${n}.corto: hasta 6 caracteres`);
    if (u.color !== undefined && !RE_COLOR.test(u.color)) errores.push(`${n}.color: #rrggbb`);
    if (u.abre !== undefined) { if (!esObjeto(u.abre)) errores.push(`${n}.abre: {franja: [días]}`); else for (const f of Object.keys(u.abre)) { if (!franjasArq.includes(f)) errores.push(`${n}.abre: franja «${f}» desconocida`); dowsValidos(u.abre[f], `${n}.abre.${f}`, errores); } }
    for (const k of ['minimos', 'supuestos']) if (u[k] !== undefined) { if (!esObjeto(u[k])) errores.push(`${n}.${k}: {franja: [7 valores] | valor}`); else for (const f of Object.keys(u[k])) { if (!franjasArq.includes(f)) errores.push(`${n}.${k}: franja «${f}» desconocida`); porDia(u[k][f], 0, `${n}.${k}.${f}`, errores); } }
    if (u.minimos && esObjeto(u.minimos)) for (const f of Object.keys(u.minimos)) porDia(u.minimos[f], 0, `${n}.minimos.${f}`, []).forEach((v, d) => { if (!Number.isInteger(v) || v < 0) errores.push(`${n}.minimos.${f}[${d}]: entero ≥ 0`); });
    if (u.cocina !== undefined && typeof u.cocina !== 'boolean' && !esObjeto(u.cocina)) errores.push(`${n}.cocina: true, false o un objeto {obligatoria, titulares, reservas, posicion}`);
    if (u.primero !== undefined && !esObjeto(u.primero)) errores.push(`${n}.primero: {franja: id de persona o null}`);
    if (u.partidoAbre !== undefined && !esObjeto(u.partidoAbre)) errores.push(`${n}.partidoAbre: {franja: booleano}`);
    horarioValido(u.horario, franjasArq, `${n}.horario`, errores);
    horarioValido(u.horarioPartido, franjasArq, `${n}.horarioPartido`, errores);
    if (u.duracion !== undefined) { if (!esObjeto(u.duracion)) errores.push(`${n}.duracion: {franja: minutos}`); else for (const f of Object.keys(u.duracion)) if (!Number.isInteger(u.duracion[f]) || u.duracion[f] <= 0) errores.push(`${n}.duracion.${f}: minutos (entero > 0)`); }
    if (u.descansoMin !== undefined && (!Number.isInteger(u.descansoMin) || u.descansoMin < 0)) errores.push(`${n}.descansoMin: minutos`);
  });

  // equipo
  const equipo = m.equipo === undefined ? [] : m.equipo;
  const idsPersona = [];
  if (!esLista(equipo)) errores.push('equipo: lista de personas (puede ir vacía: el encargado las da de alta en la app)');
  else equipo.forEach((p, i) => {
    const n = `equipo[${i}]`;
    if (!esObjeto(p)) { errores.push(`${n}: objeto`); return; }
    if (!p.nombre || typeof p.nombre !== 'string') errores.push(`${n}.nombre: obligatorio`);
    const id = p.id === undefined ? slugificar(p.nombre) : p.id;
    if (!RE_PID.test(id || '')) errores.push(`${n}.id: minúsculas y números, 2–24 caracteres (o déjalo fuera y se deriva del nombre)`);
    else if (idsPersona.includes(id)) errores.push(`${n}.id: «${id}» repetido (dos personas con el mismo nombre necesitan id propio)`); else idsPersona.push(id);
    if (p.puesto !== undefined && !idsPuesto.includes(p.puesto)) errores.push(`${n}.puesto: «${p.puesto}» no está en puestos (${idsPuesto.join(', ')})`);
    if (p.unidades !== undefined) { if (!esLista(p.unidades)) errores.push(`${n}.unidades: lista de ids de unidad`); else for (const u of p.unidades) if (!idsUnidad.includes(u)) errores.push(`${n}.unidades: «${u}» no es una unidad del manifiesto`); }
    if (p.franjas !== undefined && (!esLista(p.franjas) || p.franjas.some(f => !franjasArq.includes(f)))) errores.push(`${n}.franjas: subconjunto de ${JSON.stringify(franjasArq)}`);
    dowsValidos(p.libra, `${n}.libra`, errores);
    if (p.ausencias !== undefined) { if (!esLista(p.ausencias)) errores.push(`${n}.ausencias: lista de {tipo, desde, hasta?, detalle?}`); else p.ausencias.forEach((a, j) => { if (!esObjeto(a) || !['BAJ', 'VAC', 'LD', 'PERM', 'OTRO'].includes(a.tipo) || !RE_ISO.test(a.desde || '')) errores.push(`${n}.ausencias[${j}]: tipo BAJ|VAC|LD|PERM|OTRO y desde en formato AAAA-MM-DD`); }); }
    if (p.nuncaCon !== undefined && !esLista(p.nuncaCon)) errores.push(`${n}.nuncaCon: lista de ids de persona`);
    if (p.cubreA !== undefined && !esLista(p.cubreA)) errores.push(`${n}.cubreA: lista de {pid, dow?, turnoId?}`);
    if (p.vetos !== undefined && !esLista(p.vetos)) errores.push(`${n}.vetos: lista de {localId, franja, dow?}`);
  });
  if (esLista(equipo)) equipo.forEach((p, i) => {
    if (!esObjeto(p)) return;
    for (const otro of p.nuncaCon || []) if (!idsPersona.includes(otro)) errores.push(`equipo[${i}].nuncaCon: «${otro}» no es nadie del equipo`);
    for (const c of p.cubreA || []) if (!esObjeto(c) || !idsPersona.includes(c.pid)) errores.push(`equipo[${i}].cubreA: cada entrada es {pid} de alguien del equipo`);
    for (const v of p.vetos || []) if (!esObjeto(v) || !idsUnidad.includes(v.localId) || !franjasArq.includes(v.franja)) errores.push(`equipo[${i}].vetos: cada veto es {localId (unidad), franja, dow?}`);
  });
  // titulares y primeros de las unidades tienen que ser del equipo
  if (esLista(unidades)) unidades.forEach((u, i) => {
    if (!esObjeto(u)) return;
    if (esObjeto(u.cocina)) {
      const tit = esObjeto(u.cocina.titulares) ? Object.values(u.cocina.titulares).flat() : esLista(u.cocina.titulares) ? u.cocina.titulares : [];
      for (const pid of tit.concat(u.cocina.reservas || [])) if (!idsPersona.includes(pid)) errores.push(`unidades[${i}].cocina: «${pid}» no es nadie del equipo`);
    }
    if (esObjeto(u.primero)) for (const pid of Object.values(u.primero)) if (pid && !idsPersona.includes(pid)) errores.push(`unidades[${i}].primero: «${pid}» no es nadie del equipo`);
  });

  // semana tipo
  if (m.semanaTipo !== undefined) {
    if (!esObjeto(m.semanaTipo)) errores.push('semanaTipo: objeto {dow: [plazas]}');
    else for (const [d, plazas] of Object.entries(m.semanaTipo)) {
      if (!DOWS.includes(+d)) { errores.push(`semanaTipo: día «${d}» no válido (1–7)`); continue; }
      if (!esLista(plazas)) { errores.push(`semanaTipo.${d}: lista de plazas`); continue; }
      plazas.forEach((pl, j) => {
        if (!esObjeto(pl) || !pl.t || !pl.p) { errores.push(`semanaTipo.${d}[${j}]: {t: "UNIDAD_FRANJA", p: "persona"}`); return; }
        const [uid, f] = String(pl.t).split('_');
        if (!idsUnidad.includes(uid) || !franjasArq.includes(f)) errores.push(`semanaTipo.${d}[${j}].t: «${pl.t}» no es UNIDAD_FRANJA de este manifiesto`);
        if (!idsPersona.includes(pl.p)) errores.push(`semanaTipo.${d}[${j}].p: «${pl.p}» no es nadie del equipo`);
      });
    }
  }

  // eventos con refuerzo (los «botones de fútbol»)
  const eventos = m.eventos || {};
  if (!esObjeto(eventos)) errores.push('eventos: objeto {equipos: [...]}');
  else if (eventos.equipos !== undefined) {
    if (!esLista(eventos.equipos)) errores.push('eventos.equipos: lista de {id, nombre, corto?, color?, refuerzo?, franja?}');
    else eventos.equipos.forEach((q, i) => { if (!esObjeto(q) || !q.nombre) errores.push(`eventos.equipos[${i}]: {nombre} obligatorio`); if (esObjeto(q) && q.refuerzo !== undefined) { if (!esObjeto(q.refuerzo)) errores.push(`eventos.equipos[${i}].refuerzo: {unidad: n}`); else for (const u of Object.keys(q.refuerzo)) if (!idsUnidad.includes(u)) errores.push(`eventos.equipos[${i}].refuerzo: «${u}» no es una unidad`); } });
  }

  // festivos, reglas, módulos
  if (m.festivos !== undefined && (!esLista(m.festivos) || m.festivos.some(f => !RE_ISO.test(f)))) errores.push('festivos: lista de fechas AAAA-MM-DD');
  const reglasArq = (arq && arq.reglas) || [];
  if (m.reglas !== undefined) { if (!esObjeto(m.reglas)) errores.push('reglas: objeto {regla: true|false}'); else for (const [k, v] of Object.entries(m.reglas)) { if (!reglasArq.includes(k)) errores.push(`reglas.${k}: regla desconocida (${reglasArq.join(', ')})`); if (typeof v !== 'boolean') errores.push(`reglas.${k}: true o false`); } }
  const modulosArq = (arq && arq.modulos) || {};
  if (m.modulos !== undefined) { if (!esObjeto(m.modulos)) errores.push('modulos: objeto {modulo: true|false}'); else for (const [k, v] of Object.entries(m.modulos)) { if (!modulosArq[k]) errores.push(`modulos.${k}: módulo desconocido (${Object.keys(modulosArq).join(', ')})`); else if (modulosArq[k].nucleo && v === false) errores.push(`modulos.${k}: es del núcleo y no se puede apagar`); if (typeof v !== 'boolean') errores.push(`modulos.${k}: true o false`); } }

  for (const k of ['particularidades', 'preguntas']) if (m[k] !== undefined && (!esLista(m[k]) || m[k].some(x => typeof x !== 'string' || !x.trim()))) errores.push(`${k}: lista de frases`);
  if (m.contacto !== undefined && !esObjeto(m.contacto)) errores.push('contacto: objeto {encargado, jefe, programador, email}');
  if (m.despliegue !== undefined) { if (!esObjeto(m.despliegue)) errores.push('despliegue: objeto'); else { if (m.despliegue.plataforma !== undefined && !['railway', 'docker', 'otro'].includes(m.despliegue.plataforma)) errores.push('despliegue.plataforma: railway, docker u otro'); if (m.despliegue.nucleo !== undefined && typeof m.despliegue.nucleo !== 'boolean') errores.push('despliegue.nucleo: true o false'); } }

  const conocidos = ['$schema', 'slug', 'slugCorto', 'nombre', 'nombreCorto', 'sector', 'arquetipo', 'descripcion', 'dominio', 'marca', 'contacto', 'cuentas', 'franjas', 'puestos', 'unidades', 'equipo', 'semanaTipo', 'eventos', 'festivos', 'reglas', 'modulos', 'particularidades', 'preguntas', 'despliegue', 'notas'];
  for (const k of Object.keys(m)) if (!conocidos.includes(k)) avisos.push(`campo «${k}» desconocido: se ignora (¿errata?)`);

  if (errores.length) throw new ManifiestoInvalido(errores, avisos);
  return { avisos };
}

// ---------- normalización + derivados: el contexto de las plantillas ----------
function enPalabras(n) { return n <= 10 ? NUMEROS[n] : String(n); }

export function contextoDe(m, arq, opciones = {}) {
  const hoy = opciones.hoy ? new Date(opciones.hoy) : new Date();
  const modulosArq = (arq && arq.modulos) || {};
  const modulos = {};
  for (const [k, def] of Object.entries(modulosArq)) modulos[k] = def.nucleo ? true : (m.modulos && m.modulos[k] !== undefined ? m.modulos[k] : def.defecto !== false);
  const unidades = m.unidades.map((u, i) => Object.assign({}, u, { corto: u.corto || u.nombre.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || u.id.slice(0, 3), color: u.color || PALETA_UNIDADES[i % PALETA_UNIDADES.length] }));
  const nUnidades = unidades.length;
  const unidadesPlural = nUnidades === 1 ? 'local' : 'locales';
  const nUnidadesTexto = nUnidades === 1 ? 'el local' : `los ${enPalabras(nUnidades)} locales`;
  const cuentas = Object.assign({ programador: 'diego', encargado: 'oficina', jefe: 'admin' }, m.cuentas || {});
  cuentas.passwordGenerica = cuentas.passwordGenerica || `${m.slug.replace(/-/g, '')}${hoy.getFullYear()}`;
  const slugCorto = m.slugCorto || m.slug.replace(/-/g, '').slice(0, 6);
  const puestos = m.puestos || PUESTOS_DEFECTO;
  const equipo = (m.equipo || []).map(p => Object.assign({}, p, { id: p.id || slugificar(p.nombre), puesto: p.puesto || puestos[0].id }));
  const partesNombre = m.nombre.trim().split(/\s+/);
  const textoLogoHtml = (m.marca && m.marca.textoLogo) || (partesNombre.length > 1 ? `${partesNombre[0]} <b>${partesNombre.slice(1).join(' ')}</b>` : `<b>${m.nombre}</b>`);
  const logoExt = m.marca && m.marca.logo ? extname(m.marca.logo).toLowerCase().slice(1) : null;
  const modulosLista = Object.entries(modulosArq).map(([k, def]) => ({ k, titulo: def.titulo || k, nucleo: !!def.nucleo, activo: modulos[k], descripcion: def.descripcion || '' }));
  const pestanas = modulosLista.filter(x => x.activo).map(x => x.titulo).join(' · ');
  let descripcion = m.descripcion;
  if (!descripcion) {
    const piezas = ['planilla', 'equipo'].concat(modulos.horas ? ['horas'] : [], modulos.generador ? ['generador'] : [], ['cobertura']);
    descripcion = `planificación de turnos de ${nUnidadesTexto}: ${piezas.join(', ').replace(/, ([^,]*)$/, ' y $1')}`;
  }
  const reglasApagadas = Object.entries(m.reglas || {}).filter(([, v]) => v === false).map(([k]) => k);
  const supuestos = [];
  for (const u of unidades) {
    if (!u.minimos) supuestos.push(`${u.nombre}: mínimos por franja y día sin fijar (de fábrica 1 persona; se marcan «supuesto» hasta que el cliente los confirme)`);
    if (!u.horario) supuestos.push(`${u.nombre}: horario de apertura sin confirmar (de fábrica mañana 08:00–16:00 y tarde 16:00–00:00)`);
    if (!u.duracion) supuestos.push(`${u.nombre}: duración del turno sin confirmar (de fábrica 8 h por franja)`);
  }
  if (!m.semanaTipo || !Object.keys(m.semanaTipo).length) supuestos.push('sin semana tipo: el generador rellena mínimos con candidatos; el encargado puede fijar una semana como tipo desde Semana');
  const dd = String(hoy.getDate()).padStart(2, '0'), mm = String(hoy.getMonth() + 1).padStart(2, '0');
  return {
    slug: m.slug, slug_: m.slug.replace(/-/g, '_'), slugCorto, nombre: m.nombre.trim(), NOMBRE_MAYUS: m.nombre.trim().toUpperCase(),
    nombreCorto: m.nombreCorto || m.nombre.trim(), sector: m.sector || 'hosteleria', arquetipo: arq ? arq.id : (m.arquetipo || ''),
    descripcion, descripcionMayus: descripcion.charAt(0).toUpperCase() + descripcion.slice(1),
    dominio: m.dominio || null, dominioOEjemplo: m.dominio || `turnos.${m.slug}.es`,
    marca: { logo: m.marca && m.marca.logo ? m.marca.logo : null, logoExt, logoFichero: logoExt ? `assets/${m.slug}-logo.${logoExt}` : null, textoLogoHtml },
    contacto: Object.assign({ encargado: '', jefe: '', programador: '', email: '' }, m.contacto || {}),
    cuentas, hashPasswordLocal: sha256('shiftia·' + cuentas.passwordGenerica),
    franjas: m.franjas || (arq && arq.capacidades && arq.capacidades.franjas) || ['M', 'T'],
    puestos, puestosTexto: puestos.map(p => p.label).join(', '),
    unidades, nUnidades, unidadesPlural, nUnidadesTexto, unidadesTexto: unidades.map(u => u.nombre).join(' · '),
    equipo, nEquipo: equipo.length,
    semanaTipo: m.semanaTipo || {}, eventos: { equipos: (m.eventos && m.eventos.equipos) || [] }, festivos: m.festivos || [],
    reglas: m.reglas || {}, reglasApagadas, reglasApagadasTexto: reglasApagadas.join(', '),
    modulos, modulosLista, pestanas, supuestos,
    particularidades: (m.particularidades || []).map((texto, i) => ({ n: 'P' + (i + 1), texto })),
    preguntas: (m.preguntas || []).map((texto, i) => ({ n: 'C' + (i + 1), texto })),
    despliegue: Object.assign({ plataforma: 'railway', nucleo: false }, m.despliegue || {}),
    notas: m.notas || '',
    anio: hoy.getFullYear(), fecha: `${dd}/${mm}/${hoy.getFullYear()}`, fechaIso: hoy.toISOString().slice(0, 10),
  };
}

export function cargarManifiesto(ruta, arq, opciones = {}) {
  const abs = resolve(ruta);
  let m;
  try { m = JSON.parse(readFileSync(abs, 'utf8')); } catch (e) { throw new ManifiestoInvalido([`no puedo leer «${ruta}» como JSON: ${e.message}`]); }
  const { avisos } = validarManifiesto(m, arq, { dirBase: dirname(abs) });
  const ctx = contextoDe(m, arq, opciones);
  return { manifiesto: m, ctx, avisos, ruta: abs, dir: dirname(abs), hash: sha256(JSON.stringify(m)) };
}
