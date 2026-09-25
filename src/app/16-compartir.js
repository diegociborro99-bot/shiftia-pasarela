// ================= COMPARTIR LA SEMANA (imagen para WhatsApp) =================
// El encargado manda la planilla al grupo de WhatsApp: una IMAGEN PNG nítida de la
// misma hoja que se imprime (la semana general apaisada, o la hoja vertical de un
// solo local), sin pasar por la vista previa ni por el diálogo de imprimir. En el
// móvil se abre la hoja de compartir del sistema (WhatsApp, correo, Archivos…); en
// el ordenador, o si el navegador no sabe compartir ficheros, se descarga el PNG.
// La composición es la de 14-impresiones.js tal cual (mismas piezas px*, misma hoja):
// solo cambia dónde se monta. html2canvas vive en vendor/ y se carga al primer uso,
// como en 15-export-pdf.js.
let compartiendo = false;

// la semana en pantalla: la de la vista Semana, o la del día que se está viendo en Hoy
function lunesEnPantalla() {
  const vistaSemana = !$('#view-semana').classList.contains('hidden');
  return vistaSemana && S.semLunes ? S.semLunes : mondayOf(isoDia());
}

// Compone la hoja sin enseñarla: abrirImpresion / abrirImpresionLocal terminan en
// montarImpresion(h, apaisado, nombre, opts), que es quien abre la vista previa. Se
// intercepta esa llamada un instante para quedarse con el HTML, el nombre y las
// opciones, y se compone para la semana pedida (abrirImpresion lee S.semLunes).
// Devuelve null si no hay hoja (local desconocido: abrirImpresionLocal ya avisa).
// 24/09 (Diego): «letra más grande». Las opciones (crecer, tope, clase) viajan con la
// hoja: sin ellas la imagen salía a la talla de base, 8,5 px, más pequeña que el papel.
function componerHojaSemana(localId, lunes) {
  const montarOriginal = montarImpresion, lunesAntes = S.semLunes;
  let hoja = null;
  montarImpresion = (h, apaisado, nombre, opts) => { hoja = { h, apaisado: !!apaisado, nombre, opts: opts || {} }; };
  S.semLunes = lunes;
  try { if (localId) abrirImpresionLocal(localId); else abrirImpresion(); }
  finally { montarImpresion = montarOriginal; S.semLunes = lunesAntes; }
  return hoja;
}

// Monta la hoja en #printRoot fuera de la pantalla (misma cascada de estilos que al
// imprimir: tokens claros, .pxpage…), la dibuja con html2canvas y devuelve el PNG.
// Con la misma clase de hoja y la misma talla que el papel (crecerHoja, 24/09).
async function pngDeHoja(hoja) {
  const pr = $('#printRoot');
  const o = hoja.opts || {};
  if (!pr.classList.contains('hidden')) cerrarImpresion();   // por si la vista previa estaba abierta
  pr.innerHTML = `<div class="pxpage${hoja.apaisado ? ' apaisado' : ''}${o.clase ? ' ' + o.clase : ''}">${hoja.h}</div>`;
  pr.classList.add('capturando'); pr.classList.remove('hidden'); pr.setAttribute('aria-hidden', 'true');
  try {
    const pg = pr.querySelector('.pxpage');
    if (o.crecer) crecerHoja(pg, o.crecer, hoja.apaisado, o.tope);
    // windowWidth ancho: el lienzo se maqueta como en un ordenador aunque se pida desde un móvil
    const canvas = await html2canvas(pg, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false, windowWidth: 1500, windowHeight: 1100, scrollX: 0, scrollY: 0 });
    return await new Promise((res, rej) => canvas.toBlob(b => b ? res(b) : rej(new Error('el navegador no ha podido crear el PNG')), 'image/png'));
  } finally {
    pr.innerHTML = ''; pr.classList.remove('capturando'); pr.classList.add('hidden'); pr.removeAttribute('aria-hidden');
  }
}

function descargarFichero(blob, nombre) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// localId: un local → su hoja vertical; nada → la semana general apaisada.
// Devuelve el nombre del fichero, o null si no se ha generado (cancelado o error).
async function compartirSemana(localId) {
  if (compartiendo) return null;
  const l = localId ? localDe(S, localId) : null;
  if (localId && !l) { toast('Local desconocido', 'warn'); return null; }
  compartiendo = true;
  const botones = [...document.querySelectorAll('#wShare,[data-sharelocal]')];
  for (const b of botones) b.disabled = true;
  try {
    toast('Preparando la imagen…', 'ok');
    if (!window.html2canvas) await cargarScript('/vendor/html2canvas.min.js');
    const lunes = lunesEnPantalla();
    const hoja = componerHojaSemana(localId, lunes);
    if (!hoja) return null;
    const blob = await pngDeHoja(hoja);
    // Planilla_semana_2026-10-05.png · Planilla_33_semana_2026-10-05.png
    const nombre = String(hoja.nombre || 'Planilla').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '_') + '.png';
    const rango = rangoSemanaTxt(lunes);
    const titulo = `${l ? l.nombre : 'Planilla'} · semana ${rango}`;
    const fichero = new File([blob], nombre, { type: 'image/png' });
    let como = 'descargada';
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [fichero] })) {
      // la hoja de compartir del sistema (WhatsApp, correo, Archivos, AirDrop…)
      try { await navigator.share({ files: [fichero], title: titulo, text: `Grupo Pasarela · ${titulo}` }); como = 'compartida'; }
      catch (e) {
        if (e && e.name === 'AbortError') return null;   // cancelado por el usuario: ni descarga ni historial
        descargarFichero(blob, nombre);   // el sistema no ha podido compartir: queda el fichero
      }
    } else descargarFichero(blob, nombre);
    registrarCambio(`Semana ${rango} compartida como imagen (${l ? l.nombre : 'general'})`, 'cambio');
    saveState();
    toast(como === 'compartida' ? 'Imagen de la semana enviada a la hoja de compartir' : `Imagen descargada: ${nombre}. Ábrela o arrástrala a WhatsApp`, 'ok');
    return nombre;
  } catch (e) {
    toast('No se ha podido generar la imagen: ' + (e && e.message ? e.message : e), 'bad');
    return null;
  } finally {
    compartiendo = false;
    for (const b of botones) b.disabled = false;
  }
}

// ---------- popover de elección: toda la semana o un solo local ----------
// (revisión final, 25/09) sin «pie de descansos»: la imagen no lo lleva desde el 18/09 y el menú lo seguía prometiendo
// En escritorio anclado al botón; en el móvil, hoja inferior (colocarPop).
function abrirPopCompartir(anchor) {
  cerrarPops();
  const lunes = lunesEnPantalla();
  const pop = document.createElement('div');
  pop.className = 'pop popcompartir'; pop.id = 'sharePop'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Compartir la semana');
  pop.innerHTML = `<div class="ph">Compartir la semana</div>
    <div class="pd">Semana ${rangoSemanaTxt(lunes)} · elige qué planilla va en la imagen</div>
    <button class="popb shareopt" data-share=""><i class="shdot todos"></i><span>Toda la semana<small>los ${S.locales.length} locales · mañana y tarde</small></span></button>
    ${S.locales.map(l => `<button class="popb shareopt" data-share="${esc(l.id)}" style="--lc:${esc(l.color)}"><i class="shdot"></i><span>${esc(l.nombre)}<small>solo su planilla de la semana</small></span></button>`).join('')}
    <p class="sharepie">Se genera una imagen PNG de la planilla. En el móvil se abre la hoja de compartir (WhatsApp, correo…); en el ordenador se descarga.</p>`;
  document.body.appendChild(pop);
  colocarPop(pop, anchor);
  cierraFuera(pop);
  pop.addEventListener('click', ev => {
    const b = ev.target.closest('[data-share]'); if (!b) return;
    const id = b.dataset.share || null;
    pop.remove();
    compartirSemana(id);
  });
}

{
  const b = $('#wShare'); if (b) b.addEventListener('click', () => abrirPopCompartir(b));
}
