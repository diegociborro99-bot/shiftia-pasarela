// ================= EXPORT PDF (html2canvas + jsPDF bajo demanda) =================
// El diálogo de imprimir no existe en el móvil, y en la app instalada en un iPhone
// window.print() no hace nada (09/09). «Descargar PDF» dibuja la hoja tal cual se ve
// en la vista previa y la mete en un PDF A4 con la orientación de la hoja. En el
// móvil, si el sistema lo permite, abre la hoja de compartir (Archivos, WhatsApp,
// correo…); si no, descarga el fichero. Las librerías (html2canvas 1.4.1 y jsPDF 2.5.1)
// viven en vendor/ y las sirve la propia app: sin CDN, que en redes de hospital a veces
// está bloqueado; se cargan al primer uso.
let PRINT_CTX = { apaisado: true, nombre: 'Planilla' };
let exportandoPdf = false;
async function exportarPdfHoja(opts) {
  if (exportandoPdf) return null;
  exportandoPdf = true;
  const o = opts || {};
  try {
    if (!window.html2canvas) {
      toast('Preparando el PDF…', 'ok');
      await cargarScript('/vendor/html2canvas.min.js');
    }
    if (!(window.jspdf && window.jspdf.jsPDF)) {
      await cargarScript('/vendor/jspdf.umd.min.js');
    }
    const pg = document.querySelector('#printRoot .pxpage');
    if (!pg) return null;
    // windowWidth ancho: el lienzo se maqueta como en un ordenador aunque se pida desde un móvil
    const canvas = await html2canvas(pg, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false, windowWidth: 1500, windowHeight: 1100, scrollX: 0, scrollY: 0 });
    if (o.soloCanvas) return canvas.toDataURL('image/png');
    const { jsPDF } = window.jspdf;
    const apaisado = !!PRINT_CTX.apaisado;
    const pdf = new jsPDF({ orientation: apaisado ? 'landscape' : 'portrait', unit: 'mm', format: 'a4', compress: true });
    const W = apaisado ? 297 : 210, H = apaisado ? 210 : 297, mx = apaisado ? 9 : 10, my = apaisado ? 8 : 9;   // los mismos márgenes que @page
    const anchoUtil = W - 2 * mx, altoUtil = H - 2 * my;
    const escala = anchoUtil / canvas.width;   // mm por píxel del lienzo
    const altoPagPx = Math.max(1, Math.floor(altoUtil / escala));
    // 24/09 (Diego, «imprimible de semana con letra más grande»): la semana con partido ya
    // salía partida en dos. crecerHoja mide ahora contra esta página, pero por si acaso: la
    // hoja semanal (.pxsemhoja) que se pasa por menos de un 3 % no se parte —dejaría en la
    // segunda página una tira de uno o dos milímetros—; se encoge un poco para que entre
    // entera. Pasa si la hoja queda entre la página del PDF (780,5 px en apaisado) y el A4
    // (793,7 px), que es lo que miden la compactación y la vista previa: la semana muy
    // cargada que compacta. Solo esa hoja (revisión del 24/09): el Mes, Horas y el
    // generador no entran en este cambio y salen como siempre.
    const encoger = pg.classList.contains('pxsemhoja') && canvas.height > altoPagPx && canvas.height <= altoPagPx * 1.03;
    if (encoger) {
      const ancho = canvas.width * altoUtil / canvas.height;   // centrada, con su proporción
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', mx + (anchoUtil - ancho) / 2, my, ancho, altoUtil);
    } else {
      let y = 0, primera = true;
      while (y < canvas.height) {   // si la hoja fuera más alta que una página, se parte en varias
        const h = Math.min(altoPagPx, canvas.height - y);
        const trozo = document.createElement('canvas'); trozo.width = canvas.width; trozo.height = h;
        trozo.getContext('2d').drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
        if (!primera) pdf.addPage();
        pdf.addImage(trozo.toDataURL('image/jpeg', 0.92), 'JPEG', mx, my, anchoUtil, h * escala);
        primera = false; y += h;
      }
    }
    const nombre = String(PRINT_CTX.nombre || 'Planilla').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '_') + '.pdf';
    const blob = pdf.output('blob');
    if (!o.sinCompartir && navigator.share && navigator.canShare && matchMedia('(pointer:coarse)').matches) {
      // en el móvil: la hoja de compartir del sistema (Archivos, WhatsApp, correo, AirDrop…)
      const fichero = new File([blob], nombre, { type: 'application/pdf' });
      if (navigator.canShare({ files: [fichero] })) {
        try { await navigator.share({ files: [fichero], title: PRINT_CTX.nombre }); return nombre; }
        catch (e) { if (e && e.name === 'AbortError') return null; }   // cancelado por el usuario; otro error → descarga
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    toast(`PDF descargado: ${nombre}`, 'ok');
    return nombre;
  } catch (e) {
    toast('No se ha podido generar el PDF: ' + (e && e.message ? e.message : e), 'warn');
    return null;
  } finally { exportandoPdf = false; }
}
