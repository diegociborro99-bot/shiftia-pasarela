// ================= ENTREVISTAS (en construcción) =================
// Sección del administrador reservada para la base de datos de entrevistas y sus
// funciones, que se importarán más adelante. Enseña, en forma de vista previa,
// lo que habrá aquí: candidaturas, entrevistas de la semana y decisiones.
function renderEntrevistas() {
  const sk = (w, h) => `<span class="sk" style="width:${w};height:${h || '10px'}"></span>`;
  const fila = (col, nombre, puesto, estado) => `<div class="evrowg"><span class="evav" style="--pc:${col}">${esc(initials(nombre))}</span><span class="evtxt"><b>${esc(nombre)}</b><small>${esc(puesto)}</small></span><span class="evst ${estado[1]}">${esc(estado[0])}</span></div>`;
  $('#entrevistasRoot').innerHTML = `
  <div class="evhero">
    <div class="evhero-txt">
      <span class="micro">PRÓXIMAMENTE EN ESTA PESTAÑA</span>
      <h2>La base de datos de <b>entrevistas</b> del grupo, en el mismo sitio que la planilla</h2>
      <p>Candidaturas por local y puesto, entrevistas hechas y pendientes con quién las hizo, notas, decisión y, cuando alguien entra, alta directa en <b>Equipo</b> con sus condiciones. Se importará la base de datos existente y sus funciones.</p>
      <div class="evsteps">
        <span class="evstep on"><i>1</i>Sección creada</span>
        <span class="evstep"><i>2</i>Importar la base de datos</span>
        <span class="evstep"><i>3</i>Funciones y flujo del encargado</span>
      </div>
    </div>
    <div class="evhero-art" aria-hidden="true"><span class="evdiamond"></span><span class="evdiamond d2"></span><span class="evbadge">EN CONSTRUCCIÓN</span></div>
  </div>
  <div class="evgrid" aria-hidden="true">
    <div class="evcard">
      <div class="evcard-h"><span class="micro">CANDIDATURAS</span><span class="evcount">12</span></div>
      ${fila('#c2378f', 'Marta Sánchez', 'Sala · Zapatillera', ['pendiente', 'p'])}
      ${fila('#1f9a6e', 'Iker Ruiz', 'Cocina · Pasarela', ['entrevista jueves', 'w'])}
      ${fila('#2f6db5', 'Aroa Pérez', 'Apoyo · Bar Mónaco', ['2.ª entrevista', 'w'])}
      ${fila('#b8741a', 'Nico Ferrer', 'Sala · El 33', ['descartado', 'x'])}
      <div class="evfoot">${sk('62%')}${sk('38%')}</div>
    </div>
    <div class="evcard">
      <div class="evcard-h"><span class="micro">ENTREVISTAS DE LA SEMANA</span><span class="evcount">3</span></div>
      <div class="evday"><b>Jue 17</b><small>11:00 · Pasarela</small>${fila('#1f9a6e', 'Iker Ruiz', 'con Lola', ['confirmada', 'ok'])}</div>
      <div class="evday"><b>Vie 18</b><small>17:30 · Bar Mónaco</small>${fila('#2f6db5', 'Aroa Pérez', 'con el encargado', ['confirmada', 'ok'])}</div>
      <div class="evday"><b>Sáb 19</b><small>por concretar</small>${fila('#c2378f', 'Marta Sánchez', 'con Jacquelin', ['por confirmar', 'p'])}</div>
    </div>
    <div class="evcard">
      <div class="evcard-h"><span class="micro">DECISIONES</span><span class="evcount">2</span></div>
      <div class="evdec"><span class="evst ok">contratar</span><b>Iker Ruiz</b><small>Cocina · Pasarela · alta en Equipo con un clic</small></div>
      <div class="evdec"><span class="evst x">no ahora</span><b>Nico Ferrer</b><small>El 33 · guardar para más adelante</small></div>
      <div class="evfoot">${sk('80%')}${sk('55%')}${sk('70%')}</div>
    </div>
  </div>
  <p class="revsub evnote">Los nombres y datos de arriba son de muestra: enseñan el formato, no existen. Si quieres adelantar campos o el flujo del encargado, díselo a Highkey Labs.</p>`;
}
