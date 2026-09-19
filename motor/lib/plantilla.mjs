// Motor de plantillas mínimo del motor de creación. Sin dependencias.
//
//   {{ruta.a.valor}}            valor (cadena, número o booleano); las rutas van con punto
//   {{json ruta}}               el valor como JSON con sangría (para ficheros de configuración)
//   {{json1 ruta}}              el valor como JSON en una línea
//   {{#si ruta}}…{{/si}}         solo si el valor es verdadero (o una lista con elementos)
//   {{#no ruta}}…{{/no}}         solo si es falso o está vacío
//   {{#cada ruta}}…{{/cada}}     repite por cada elemento; dentro valen {{.}} (el elemento),
//                               {{campo}} (si el elemento es un objeto), {{@i}} (índice desde 0),
//                               {{@n}} (desde 1), {{@ultimo}} (booleano) y {{../campo}} (el padre)
//
// Es estricto: un marcador que no resuelve a nada es un error, porque un «undefined» en
// un README o en un test generado es peor que un fallo aquí.

const RE_TOKEN = /\{\{\s*(#si|#no|#cada|\/si|\/no|\/cada)?\s*([^{}]*?)\s*\}\}/g;

export class ErrorPlantilla extends Error {}

function tokenizar(texto) {
  const out = [];
  let i = 0;
  for (const m of texto.matchAll(RE_TOKEN)) {
    if (m.index > i) out.push({ t: 'txt', v: texto.slice(i, m.index) });
    const tipo = m[1] || 'val';
    out.push({ t: tipo, v: m[2], crudo: m[0] });
    i = m.index + m[0].length;
  }
  if (i < texto.length) out.push({ t: 'txt', v: texto.slice(i) });
  return out;
}

// árbol: nodos txt / val / bloque {tipo: si|no|cada, expr, hijos}
function parsear(tokens) {
  const raiz = { hijos: [] };
  const pila = [raiz];
  for (const tk of tokens) {
    const actual = pila[pila.length - 1];
    if (tk.t === 'txt' || tk.t === 'val') { actual.hijos.push(tk); continue; }
    if (tk.t.startsWith('#')) { const b = { t: 'bloque', tipo: tk.t.slice(1), expr: tk.v, hijos: [], crudo: tk.crudo }; actual.hijos.push(b); pila.push(b); continue; }
    const cierre = tk.t.slice(1);
    if (pila.length === 1 || actual.tipo !== cierre) throw new ErrorPlantilla(`Cierre ${tk.crudo} sin bloque abierto que le corresponda`);
    pila.pop();
  }
  if (pila.length > 1) throw new ErrorPlantilla(`Bloque {{#${pila[pila.length - 1].tipo} ${pila[pila.length - 1].expr}}} sin cerrar`);
  return raiz;
}

function buscar(ruta, ambitos) {
  if (ruta === '.') return { ok: true, v: ambitos[ambitos.length - 1].item };
  let subir = 0;
  while (ruta.startsWith('../')) { subir++; ruta = ruta.slice(3); }
  const partes = ruta.split('.');
  // de dentro hacia fuera: primero el ámbito del bucle más cercano, luego el contexto raíz
  for (let a = ambitos.length - 1 - subir; a >= 0; a--) {
    const amb = ambitos[a];
    for (const base of [amb.meta, amb.item, amb.ctx]) {
      if (base === undefined || base === null || typeof base !== 'object') continue;
      let v = base, bien = true;
      for (const p of partes) { if (v !== null && typeof v === 'object' && p in v) v = v[p]; else { bien = false; break; } }
      if (bien) return { ok: true, v };
    }
  }
  return { ok: false };
}

function cierto(v) { return Array.isArray(v) ? v.length > 0 : !!v; }

function renderNodos(nodos, ambitos, opciones) {
  let out = '';
  for (const n of nodos) {
    if (n.t === 'txt') { out += n.v; continue; }
    if (n.t === 'val') {
      const [fn, resto] = n.v.startsWith('json1 ') ? ['json1', n.v.slice(6).trim()] : n.v.startsWith('json ') ? ['json', n.v.slice(5).trim()] : [null, n.v];
      const r = buscar(resto, ambitos);
      if (!r.ok || r.v === undefined) { if (opciones.laxo) { out += n.crudo; continue; } throw new ErrorPlantilla(`Marcador desconocido: ${n.crudo}`); }
      if (fn === 'json') out += JSON.stringify(r.v, null, 2);
      else if (fn === 'json1') out += JSON.stringify(r.v);
      else if (r.v === null) out += '';
      else if (typeof r.v === 'object') throw new ErrorPlantilla(`${n.crudo} es un objeto o lista: usa {{json …}} o {{#cada …}}`);
      else out += String(r.v);
      continue;
    }
    const r = buscar(n.expr, ambitos);
    const v = r.ok ? r.v : undefined;
    if (n.tipo === 'si') { if (cierto(v)) out += renderNodos(n.hijos, ambitos, opciones); continue; }
    if (n.tipo === 'no') { if (!cierto(v)) out += renderNodos(n.hijos, ambitos, opciones); continue; }
    if (n.tipo === 'cada') {
      if (v === undefined && !opciones.laxo) throw new ErrorPlantilla(`Lista desconocida: ${n.crudo}`);
      const lista = Array.isArray(v) ? v : v && typeof v === 'object' ? Object.entries(v).map(([k, x]) => ({ clave: k, valor: x })) : [];
      lista.forEach((item, i) => { out += renderNodos(n.hijos, ambitos.concat([{ item, meta: { '@i': i, '@n': i + 1, '@ultimo': i === lista.length - 1, '@primero': i === 0 } }]), opciones); });
    }
  }
  return out;
}

export function renderizar(texto, ctx, opciones = {}) {
  const arbol = parsear(tokenizar(String(texto)));
  return renderNodos(arbol.hijos, [{ ctx }], opciones);
}
