# Changelog — Shiftia · Grupo Pasarela

## v0.6.0 · 17/09/2026 — Reunión con José y Aroa, y la base de entrevistas

- **Los cierres por fechas y la semana tipo: editar un cierre, guardar la semana tipo con el Mónaco cerrado y los textos del
  visor (30/09; auditoría del modelo del 25/09, fase A3).** Lo que se nota:
  - **Editar un cierre** hecho antes de generar la semana (cambiarle el detalle, acortarlo, volver a marcar el día en «Cuándo
    abre») ya no pierde lo decidido: Susana sigue de vacaciones, Cristian sin trabajo y Yilian de apoyo. Antes, con la semana
    ya generada, el visor no encontraba a nadie en la casilla cerrada y se quitaban las vacaciones sin reponerlas.
  - **«Guardar como semana tipo»** la semana en que un local está cerrado guarda el local como en la semana tipo de antes (los
    de «sin trabajo» y los apoyos vuelven a su casilla del Mónaco) y no convierte al apoyo en plaza fija de otro local. La
    confirmación nombra el cierre, avisa de los días que no tienen ninguna plaza (una semana a medio planificar dejaba la
    semana tipo vacía de jueves a domingo sin decirlo) y de los «Sale primero» a mano que no van a mandar (Mari Luz frente a
    Lola, que es «Quién abre» de Pasarela); el historial lo apunta.
  - **El visor del cierre** dice lo que pasa de verdad con las vacaciones o el día libre de quien ese día tiene otro turno:
    «lun 28: ese día también trabaja en El 33 por la mañana, así que las vacaciones son solo de la tarde» (antes decía que no
    se le ponían y que la parte cerrada contaba como sin trabajo, y no era así). «Ver cierre» enseña la media jornada
    («lun 28 (solo la tarde)») y «no se pudo poner» solo cuando ese día ya estaba ausente.
  - Quien esa semana libra otro día ya no sale «sin trabajo por el cierre» en Horas ni en la Semana sin que el visor haya
    preguntado por él; al editar, quien no pudo volver a su casilla (se le forzó en otra) tiene destino de apoyo («ya está
    aquí»); el apoyo de un cierre respeta «quien lleva la cocina ese día no refuerza la sala» (Adrián, cocina de Zapatillera,
    ya no se sugiere para el Mónaco); un destino de apoyo al propio local cerrado o a una casilla que no abre ese día no se
    guarda (se decía en cada generación); el visor rechaza fechas que no existen (30/02) y franjas repetidas; «los domingos
    del 27/09 al 18/10» solo cuando los cuatro son iguales (si uno es entero, se enumeran); al reabrir, las vacaciones propias
    con las que se fundieron las del cierre se quedan con su detalle (sin el «cierre de Bar Mónaco · reforma» pegado).
  - **Tras la revisión de A3 (30/09):** al **acortar o reabrir** un cierre hecho antes de generar, la casilla que vuelve a
    abrir recupera a los suyos de la semana tipo (Susana Capón y Cristian el martes 3) y el resumen, el toast y el historial lo
    dicen (antes se quedaba vacía sin avisar); al editar **añadiendo una franja** (la mañana) se lee la planilla de esa mañana
    (quien estaba sale; quien no, no recibe «sin trabajo»); quien pasa a tener plaza en la casilla cerrada después de cerrar
    (se le deshace el cambio de día libre, o entra en la semana tipo) sale «sin trabajo · cierre», no como si librara; **el
    apoyo de quien no puede hacer sala** (Hojan, solo cocina; Adrián o Jenny cuando llevan una cocina ese día) ofrece cocinas
    libres de otros locales («Zapatillera · tarde · cocina · …»), y si no hay ninguna la tarjeta dice el porqué y «Apoyo» queda
    desactivado; el aviso del «Sale primero» que no se conserva dice qué hacer («para que abra siempre Mari Luz, cámbialo en
    Ajustes de Pasarela → Quién abre (o «Sale el primero» en su ficha)») y sale también cuando quien abriría estaba de
    vacaciones esa semana; un cierre de más de 62 días avisa y el selector de fin no deja pasar del tope; el Generador lista a
    «Adrián · tarde · apoyo sin sitio»; la tarjeta de quien tiene vacaciones y otro turno ese día lo dice en una sola frase; al
    cerrar sobre una semana sin planificar el toast dice «semana sin planificar: 4 personas con decisión» en vez de «0 plazas
    retiradas»; con dos cierres del Mónaco por reforma, reabrir uno no borra el «cierre de Bar Mónaco · reforma» del otro; y
    «Guardar como semana tipo» con el local cerrado no repone a quien ya no está con nosotros ni a quien está en standby.
- **Las ausencias: un día suelto de una baja sin fecha de fin, las bajas que se pisan y las medias jornadas
  (30/09; auditoría del modelo del 25/09, fase A2).** Lo que se nota:
  - **«Quitar la ausencia de este día»** en el Mes sobre una baja sin fecha de fin (Laura, Maydeth, Susi) quita solo ese
    día y la baja sigue antes y después; la app lo dice antes («Laura está de baja desde el 1/9 sin fecha de fin: se quita
    solo el 15/10…») y así queda en el historial. Antes, en un día posterior no cambiaba nada (y el historial decía que sí)
    y en el primer día borraba la baja entera.
  - **Apuntar una baja que pisa otra** (una baja abierta y luego otra desde octubre, o una de unos días por dentro) deja
    una sola baja, abierta desde la primera fecha; y una ausencia que abarca a otra del mismo tipo la absorbe (la del 13
    ya no queda dentro de la del 1 al 20). Con dos ausencias de media jornada el mismo día (permiso por la mañana y
    vacaciones por la tarde), Hoy, el Mes (la pastilla «PERM+VAC» y la hoja del día), la Cobertura (sin «½»: entre las
    dos no queda turno) y el perfil del empleado enseñan las dos: «Permiso por la mañana · Vacaciones por la tarde (día
    entero)»; y en la hoja del día del Mes hay un botón por ausencia («Quitar el permiso de la mañana», «Quitar las
    vacaciones de la tarde»), que quita solo esa y así queda en el historial (antes se quitaban las dos sin decirlo). Al
    quitar el primer día de una baja sin fin, «sigue de baja desde el día siguiente». Un alta idéntica a lo que ya está
    apuntado no deja línea en el historial («ya tenía apuntada esa ausencia»). El detalle de una ausencia fundida no se
    repite al editar un cierre.
  - **Una ausencia en una franja que la persona no trabaja no cuenta**: unas vacaciones «solo de mañana» de Iván, que
    solo hace tardes, ya no le restan medio día de vacaciones ni medio día de contrato en Horas. Y al apuntar una
    ausencia (tarjeta de Equipo, ficha y Mes), «Cuándo» solo ofrece las franjas que esa persona trabaja (a Iván, «Día
    entero» y «Solo tarde»); la Cobertura, igual («Turnos afectados»: a Iván, «Todos» y «Tarde»). Una ausencia así
    guardada antes de este cambio se quita al cargar y queda en el historial («Ausencia quitada al cargar: Iván,
    Vacaciones por la mañana el 20/10: no hace mañanas, así que no contaba para nada»). En la ficha, una ausencia de un
    día se lee «Permiso el 8/10 por la mañana».
  - **Los textos del cambio de día libre cuando incluye el día de siempre**: Mari Luz libra los miércoles y esa semana
    también el viernes → «libra los miércoles» el miércoles y «esta semana libra además el viernes» el viernes (antes,
    «libra el viernes esta semana (en vez de los miércoles)» aunque el miércoles también libraba), en Hoy, el Mes, la
    ficha, la tarjeta de Equipo, el Generador, el selector y la Revisión. Si solo quita días libres: «trabaja el jueves
    (libra solo lunes y martes)». Y con tres días, «lunes, martes y jueves» (antes «lunes y martes y jueves»), también
    en la ficha, la Cobertura, el perfil y el Generador. El aviso del Generador cuando no se sabe qué turno hace a
    cambio dice lo que pasa («Lavinia esta semana trabaja el jueves: no se sabe qué turno hace a cambio…»), y en «Quién
    libra cada día» (Generador y hoja impresa) ese jueves Lavinia sale como «sin plaza», no como si librara.
  - En Equipo, la tarjeta de quien tiene fecha de salida futura dice «se va el 5/10».
  - Por dentro: las Entrevistas (la fecha de la entrevista y el orden), el mes visible para el equipo y el mes de
    demostración reciben la fecha del día en vez de mirar el reloj por su cuenta; un rango de fechas mal formado avisa
    en vez de colgar la pestaña; un cambio de día libre que llega con la semana en un día que no es lunes, con los días
    como texto o repetidos se arregla al cargar; y un veto guardado con el día como texto se reconoce igual.
- **La casilla decide sola quién abre y quién lleva la cocina, y lo vuelve a decidir cuando cambia algo del día
  (30/09; auditoría del modelo del 25/09, fase A1).** Lo que se nota:
  - Lo que dice Hoy de quién abre es lo mismo que dicen el Mes, el Excel, Horas y la app del empleado, también
    después de generar sin semana tipo, de una Cobertura, de apuntar una ausencia en Equipo o de cambiar un día
    libre: poner o quitar a alguien en una mañana vuelve a mirar su tarde (si viene de la mañana ya no abre la tarde,
    y su tramo es el del partido), y al generar o volcar se hace una pasada final por todo lo generado.
  - **Marcar la cocina a mano** vuelve a calcular quién abre (antes quien pasaba a la cocina seguía «abriendo» para el
    Mes y Horas, y Hoy decía otra persona; si quien pasaba a abrir hacía partido, su tramo empezaba a las 11:00 en
    vez de a la apertura). «Sale primero» a mano, igual. **Subir o bajar** a alguien deja la casilla tal como la dejas,
    y así la enseñan Hoy, la Semana, el Excel y el menú de la casilla («posición N de M»); antes Hoy la volvía a
    ordenar por su cuenta y el Excel y el menú decían otra cosa.
  - **La casilla no cambia sin motivo**: quien ya abría sigue abriendo y quien ya llevaba la cocina la conserva mientras
    puedan (bajar a Cris al 2.º no le pasa el «abre» a Yilian). Y **si tocar una casilla cambia otra del mismo día**
    (quién abre, quién lleva la cocina), la app lo dice en un aviso y lo apunta en el historial: «Por poner a Noe en
    El 33 mañana: en El 33 tarde abre Victoria (antes Noe)».
  - **Lo que decides a mano no provoca retiradas en otras casillas**: si pones la cocina a Victoria por la mañana y
    Jenny queda de sala en esa casilla, Jenny conserva la cocina de la tarde (y no pasa a abrir mañana y tarde); lo
    mismo con «Quitar la marca de cocina». La Revisión y la condición del Generador avisan del cruce y decides tú.
    Lo automático (semana tipo, Generador, Cobertura) sigue sin crear cruces.
  - **Quien está de sala en otra casilla ese día no se lleva la cocina** de esta aunque la semana tipo o el Generador la
    señalen (Noe de sala en la mañana de El 33 y de cocina en la tarde; Aroa, 17/09): la casilla se queda sin cocina
    y el Generador busca a otra persona. Si dos plazas de la semana tipo traen la cocina a la misma casilla (el
    traslado del día libre de Hojan), la lleva la de siempre y el Generador lo avisa; y quien pierde la cocina no se
    pone de sala si solo hace cocina o ya lleva otra cocina ese día: «…la lleva Noe; Hojan se queda fuera de ese
    turno» (antes Hojan quedaba de sala en dos casillas y Jenny perdía la cocina de El 33 por quedar de sala en el
    Mónaco).
  - **Dar de baja a alguien** (o cualquier cambio en cadena) ya no deja a nadie de cocina en una franja y de sala en
    otra: la casilla vuelve a mirar el día hasta que nada cambie (al retirar a Adrián, Roberto quedaba de cocina en la
    tarde de Zapatillera y de sala en la mañana hasta el siguiente guardado).
  - **El cambio de turno de la Cobertura** ya no deja una casilla «fijada a mano» sin nadie que abra (Hoy decía que
    abría uno y el Mes que nadie); y si el cambio no puede hacerse, quien cedía el turno vuelve con su plaza de antes,
    no con una nueva puesta a mano. Una marca huérfana que viniera de antes se limpia sola al tocar la casilla (la
    cocina que quitó el encargado a propósito, no: «Quitar la marca de cocina» se guarda como decisión, y en el
    historial con la franja; las quitadas con la versión de antes se reconocen una sola vez al abrir la app).
  - **Las marcas a mano sobreviven al cierre por fechas**: al reabrir, «sale primero», la cocina y el orden vuelven tal
    cual estaban (antes la casilla volvía «sola» y desordenada).
  - **Una casilla cerrada ese día (a mano o por fechas) con alguien dentro no cuenta** para quién abre, para el
    «partido» de la planilla ni para el tramo de Hoy, igual que ya pasaba en Horas y en la puerta (Cristian con la
    tarde cerrada: Hoy decía 4 h y la nómina 8); y la app del empleado no la lista como un turno suyo.
  - **El Excel** no dice «(abre)» de nadie cuando nadie de la casilla puede abrir (el hueco de la 1.ª).
  - **El hueco de la 1.ª no es una persona**: con dos personas y el hueco, la cocina de Zapatillera por la mañana va
    2.ª, y la casilla y la condición del Generador lo cuentan igual (antes una decía 3.ª y la otra ✗).
  - Y por dentro: vaciar la casilla se lleva sus marcas, «Vaciar» cuenta bien los días, la copia de la vista previa no
    comparte listas con el mes, y dos trozos de código muertos se han quitado.
- **«Ya no está con nosotros»: quien deja el grupo no se borra (30/09; Diego: «cuando un trabajador lo deja, no
  deberíamos eliminarlo de la aplicación»).** En la ficha, el botón «Quitar del equipo» pasa a **«Ya no está con
  nosotros…»**: se dice desde qué día (por defecto hoy) y, si se quiere, por qué; la app cuenta cuántos turnos se
  retiran desde esa fecha y, si hay un mes anterior con turnos sin cerrar en Horas, lo recuerda antes («Septiembre no
  está cerrado en Horas: ciérralo antes para que la nómina quede guardada», con «Ir a Horas» y «Seguir igualmente»;
  «Añadir persona» avisa igual). Lo que se nota:
  - Sus turnos de antes de esa fecha se quedan donde estaban, con un **sombreado rojo** y el aviso «ya no trabaja con
    nosotros (desde el d/m)» en Hoy, la Semana, el Mes, la hoja impresa y la imagen de compartir (en papel, una trama
    que se ve en blanco y negro); en el Excel, «(ya no está)». En Horas siguen contando, y su fila sale marcada
    mientras el mes tenga algo suyo.
  - Desde esa fecha no entra en ninguna casilla (ni forzando) ni sale en ningún selector, candidato, hueco o
    Cobertura; la semana tipo salta sus plazas y lo dice; su «cubre a» deja de valer y la casilla de Susi lo dice
    («Adrián · ya no está con nosotros»); la cocina y «Quién abre» de los locales le dejan de contar (las listas se
    quedan, y en Ajustes salen tachadas con el motivo). Lo automático que había suyo, o «por» él, se retira al
    regenerar («X ya no está con nosotros»). Todo con un solo Ctrl+Z.
  - En Equipo no cuenta ni sale con los demás: va en la sección plegada **«Ya no están con nosotros (n)»** al final,
    con «Restaurar» (vuelve al equipo; sus turnos pasados siguen) y, solo para el programador, «Borrar del todo».
  - Con servidor, el empleado cuya persona ya no está no puede entrar en la app (ni seguir con la sesión abierta):
    «Ya no tienes acceso a la app».
  - **Recuperar a quien se borró del todo** (Diego: «restaura en la aplicación el trabajador eliminado y vuelve a
    retomar su planilla»): en Cuenta, «Personas borradas» lista a quien está en alguna versión anterior del servidor y
    no en la de ahora; «Recuperar» vuelve a poner su ficha (como «ya no está con nosotros» desde el día en que se
    borró) y sus turnos de antes de ese día, sin tocar nada más, y todos los dispositivos lo ven.
  - Dos arreglos de la auditoría del 25/09 que hacían falta para esto: quitar la única plaza de un día ya no
    «desengancha» ese día de la planilla guardada (una Cobertura sobre el único turno del día llegaba a la pantalla y
    no al servidor, B2/H1), y el tramo del partido del sábado con horario propio solo para la mañana ya no cuenta la
    tarde con las ocho horas de apertura (G1).
  - **Revisión de S0 (30/09), lo que se nota tras las dos revisiones (modelo y cliente):** en el móvil, «Ya no está
    con nosotros…» y «Confirmar» responden al primer toque (el sitio para el teclado sale ahora de lo que el teclado
    tapa de verdad, no del foco de un campo: al tocar un botón la tarjeta encogía y el botón se movía bajo el dedo);
    el pie de la ficha (con ese botón y «Listo») va pegado abajo y se ve sin bajar 3.000 px. Las ausencias apuntadas
    para después de la salida ya no cuentan (Susi, con la baja abierta, salía en Horas de diciembre con 31 días y el
    Generador la decía «de baja» tras irse). El Generador agrupa sus plazas de la semana tipo en una línea («12 plazas
    de la semana tipo de Adrián · ya no trabaja con nosotros…») en vez de doce, cuenta «ninguna de las N personas» sin
    ella, deja de comprobar «Roberto cubre a Adrián» cuando Adrián ya no está y, la semana en la que se va, la cocina
    del local y «Quién abre» dicen «Adrián (hasta el 22/9)». La tarjeta de «Ya no están» avisa de que sigue en la
    semana tipo. La Cobertura no la propone como designada ni la ofrece en «Quién va a faltar» si ya no está el primer
    día de la tira (y si se va durante la tira, la cabecera lo dice). Las fichas: en la de Susi, «Si falta, le cubre
    Adrián (ya no está con nosotros: no le cubre)», en la de Adrián su «Cubre a Susi» dice que no se aplica, y los
    selectores de «nunca con» y «cubre a» no ofrecen a quien ya no está. En el Mes, la casilla vacía de quien ya no
    está no ofrece «Poner en…» (y ninguna regla que no se pueda forzar pregunta «¿Ponerlo de todas formas?» ni deja una
    entrada vacía en Deshacer); el menú de una plaza suya de antes lo dice y no ofrece «Falta estos días…». «Ir a
    Horas» desde el diálogo cierra también la ficha; «Restaurar» avisa de que los turnos retirados no vuelven solos
    (Ctrl+Z si acabas de darle la salida, o volver a generar). Recuperar a quien se borró del todo conserva su salida
    real (fecha y motivo) si ya la tenía, vuelve sin parejas «nunca con» ni «cubre a» (ya no aplican) y con las marcas
    a mano de entonces en sus casillas; Cuenta dice que el servidor guarda las últimas 60 versiones. Con servidor, el
    empleado que ya no está no puede tampoco cambiar la contraseña, pedir la clave push ni abrir el canal de eventos
    con la sesión abierta (solo salir y ver la versión), y una fecha de salida imposible (mes 13) da 400, no un error
    interno. `darSalida` exige la fecha en AAAA-MM-DD.
- **Revisión final de todo lo del 24/09 (25/09).** Tres revisiones con el caso completo (el Mónaco cerrado del
  domingo 27 por la tarde al martes 29, Mari Luz libra el martes 29, «cubre a Iván» y sus vacaciones del 2 al 4 por
  la tarde), con la base de datos de producción abierta con la versión nueva y con el servidor. Lo que se arregla:
  - **Quien apoya por el cierre del Mónaco va donde falta, de verdad.** Con Dulce fuera de standby (como está desde
    la reunión), el martes 29 faltaba una persona en Pasarela por la mañana (Mari Luz libra) y el Generador ponía a
    Dulce y dejaba a Yilian «aún sin sitio». Ahora quien apoya «donde haga falta» va delante de los demás en las
    franjas del cierre (solo por detrás de «cubre a»): el 29 entra Yilian.
  - **«Con aviso», primero lo más suave.** El domingo 4 por la tarde, el selector de la casilla y el Generador
    ofrecían primero a Mari Luz con Lavinia, cuando Equipo y la Cobertura decían Roberto. Ahora van por orden: primero
    quien solo hace un partido no declarado (Roberto), luego quien dejaría la casilla solo con apoyos (Cristian) y la
    pareja «nunca con» flexible la última (Mari Luz).
  - **El botón «Con aviso» del Generador → Periodo pone igual que el selector.** Mari Luz entraba el domingo 4 sin
    «por Iván» y con «partido no declarado los domingos»; ahora entra «por Iván» con el partido autorizado para
    cubrirle, y Ctrl+Z la quita aunque la pantalla esté en otro mes.
  - **La plantilla antes que los apoyos (José, 18/09: «tirar de plantilla todo lo que podamos y apoyos ir a lo
    justo»).** Al elegir entre varias personas, ser apoyo ahora resta en vez de sumar: a igual carga entra la
    plantilla. Un apoyo solo pasa por delante si quien es de plantilla lleva unos diez turnos más ese mes. Con la
    semana tipo, octubre sale igual (624 plazas, 4 casillas cortas); sin semana tipo, 19 casillas cortas en vez de
    32 y 114 turnos de apoyos en vez de 125, con Victoria en 31 turnos y Juani en 15 (los «25 y 13» de más abajo son
    de antes de las fases 6 y 7). La Cobertura de Iván no cambia. **Diego: confírmalo** (es reversible).
  - **Vacaciones «solo de tarde» de quien solo trabaja tardes = días enteros.** Las de Iván del 2 al 4 contaban 1,5
    días en Horas; ahora 3, como las de Susana Capón que puso el cierre.
  - **Quién abre, bien guardado en las semanas ya volcadas.** La versión de antes, al quitar a quien abría de una
    casilla (unas vacaciones, un día libre), dejaba la casilla marcada «abre a mano» sin nadie que abriera: Hoy decía
    que Mari Luz abría Pasarela el 20/10 a las 16:00 y su app, que entraba a las 21:00. Al abrir la app se limpian
    (nueve casillas en la base de producción) de hoy en adelante; con la cocina, igual, salvo la que quitó el
    encargado a propósito.
  - **Dos dispositivos a la vez.** Si mientras editabas otro dispositivo cambiaba las reglas del grupo, «Visible para
    el equipo», una entrevista o el historial, tu guardado lo pisaba sin avisar (volvía a encender «Mínimos»). Ahora
    manda el servidor y te avisa, como con la planilla.
  - **La pestaña que quedó abierta con la versión de antes ya no estropea nada.** Tras desplegar, una pestaña vieja
    seguía guardando (volvía a llenar el Mónaco cerrado, perdía semanas de «libra otro día»…). Ahora, en cuanto la
    app nueva ha guardado una vez, el servidor no le acepta nada: le pide recargar y su cambio se envía al recargar.
    **Diego: después de desplegar, que Aroa y José recarguen la app.**
  - **Horas de un mes cerrado dice qué ha cambiado, con las dos cifras.** Agosto (cerrado) decía «La tabla coincide
    con la copia guardada» aunque los partidos de Noe habían bajado de 8 a 4: desde el 24/09 un turno continuo (mañana
    y tarde seguidas) ya no cuenta como partido. Ahora lo dice («Noe: partidos 8 → 4»). **Diego: los partidos de
    agosto y septiembre bajan por eso** (Noe 8 → 4 y 10 → 5; Victoria 9 → 8 en septiembre); lo demás no cambia.
  - **El empleado no ve las parejas «nunca con» de sus compañeros** en los avisos de una casilla forzada (ni la marca
    «flexible» de antes que aún llevaba su ficha mientras nadie guardaba con la versión nueva), su app no
    recalcula por su cuenta quién abre, y en un mes que aún no es visible dice «El encargado aún no ha publicado este
    mes» (antes: «Este mes no tienes turnos»).
  - **Textos.** El Generador en «Periodo libre» se titula con las fechas elegidas («Del 01/10 al 31/10»); «Compartir»
    ya no promete un pie de descansos que la imagen no lleva desde el 18/09; los avisos del Generador, la Cobertura y
    las ausencias dicen «1 plaza aplicada» / «3 huecos» (sin «(s)») y «las reglas» en vez de «la puerta»; y la
    condición de El 33 dice que se acordó el 17/09 (la de Pasarela, el 15/09).
  - En el plan con las reglas de la Cobertura, el hueco del domingo 4 dice «dejaría la casilla solo con apoyos: Dulce»
    y a Cristian lo pone en «no hace partido los domingos» (más abajo se cita como «Dulce, Cristian»).

- **El motor «Núcleo Shiftia» ya funciona con el núcleo de verdad y no deja más huecos que el generador local
  (25/09, revisión).** Se ha probado contra el optimizador de verdad, no solo contra uno de pruebas. Lo que se nota:
  - **Antes no generaba nada:** el núcleo no aceptaba los datos y salía un aviso rojo lleno de «[object Object]».
    Ahora los acepta. Y si alguna vez no los acepta, el aviso lo dice en palabras («El núcleo no ha aceptado los
    datos… Avisa a Diego»).
  - **Una casilla imposible ya no deja cortas las demás.** Si una casilla no se puede cubrir (la mañana del lunes
    en Pasarela, con Dulce en standby), queda como hueco y el núcleo sigue cubriendo el resto. Antes se rendía con
    todos los mínimos del periodo: en la semana del 5 de octubre dejaba 7 casillas cortas y el generador local 1;
    en octubre, 32 frente a 4. Ahora deja las mismas que el generador local, y en la semana del cierre del Mónaco
    con «Permitir partidos no declarados», menos (1 frente a 3).
  - **Los partidos de quien solo los hace unos días.** Si el núcleo propone un partido que esa persona no hace ese
    día, la app se lo quita y le pide otra solución sin él (como mucho tres vueltas). Y ya no le propone la otra
    mitad del día a quien tiene una mitad fija y ese día no hace partido (Hojan el jueves, Lavinia el viernes).
  - **Yilian**, con la tarde del lunes y la mañana del martes fijas en el Mónaco, ya no hace que el núcleo se salte
    la regla del partido para todo el equipo.
  - **«Solo desde hoy» se cumple también con el Núcleo:** no propone nada ni cuenta huecos en días ya pasados.
  - **En cada hueco, quién puede entrar sin aviso** («Pueden entrar: Yilian», con un botón que la pone), además
    de quién entraría con aviso.
  - **La línea del núcleo, en palabras:** «la mejor planilla posible con estas reglas · en menos de un segundo ·
    3 casillas se quedan cortas: abajo, con el porqué», sin códigos. Si ha tenido que saltarse una regla, dice cuál; si ha
    tenido que dar otra vuelta, también.
  - **El porqué de cada hueco se lee seguido**, en el color del texto; antes cada motivo salía en rojo en su
    propia línea.
  - **Si el núcleo propone a quien solo hace cocina y no puede entrar, dice el motivo de verdad** («no hace
    partido los miércoles», con la pista de cómo dejarle entrar), no «solo hace cocina».

- **El motor «Núcleo Shiftia» del Generador lee Equipo igual que todo lo demás (25/09).** En Generador → Periodo,
  el optimizador ya trabaja con la misma disponibilidad que el generador local, la Cobertura y el selector. Lo que
  se nota:
  - **Respeta el día libre de esa semana, el standby, las ausencias de media jornada, los cierres por fechas y lo
    que apagues en Equipo.** Antes dejaba a Mari Luz fija el martes que libraba y no la dejaba trabajar el
    miércoles, contaba con Dulce aunque está en standby, y lo apagado en Equipo (días que libra, locales, franjas,
    vetos, «nunca con») le seguía atando.
  - **Los días de partido de cada persona.** Con «Permitir partidos no declarados» apagado, lo que proponga el
    núcleo y la persona no tenga declarado no entra: el núcleo busca otra solución sin ello (revisión, arriba) y,
    si aun así la casilla se queda corta, el hueco dice a quién proponía y por qué («no hace partido los lunes»).
    Con la casilla marcada entra con su aviso, como en el generador local. Antes entraba siempre, con aviso, sin que lo hubieras permitido.
  - **«Nunca con» flexible:** el núcleo solo junta a Mari Luz y Lavinia (o a Leo y Susana Capón) con «Permitir
    partidos no declarados» marcado, y solo si no hay otra forma. Sin marcarlo, nunca.
  - **La semana tipo va primero, igual que en el generador local**, con sus «cubre a» (si Iván falta, quien le
    cubre entra en su sitio) y sin perder ninguna plaza fija por un partido que proponga el núcleo. En la vista
    previa cuenta como «de la semana tipo».
  - **La cocina, por día:** Susana Capón («cocina solo los martes») solo la lleva los martes, y con «Cocina»
    apagada en su ficha, cualquier día.
  - **Lo que pusiste a mano nunca hace fallar al núcleo:** si juntaste a mano a dos que «nunca coinciden» o le
    pusiste un partido a quien no lo hace, se queda así y el núcleo busca la mejor solución alrededor.
  - **Un periodo que cruza de mes** mira el cierre a mano y lo ya puesto de cada mes (antes solo los del primero).

- **Lo que se acepta «con aviso» llega de verdad a la planilla, y todos los sitios dicen lo mismo (24/09,
  revisión).** Repaso de lo de Equipo con el caso de Iván delante. Lo que se nota:
  - **El domingo de las vacaciones de Iván, Mari Luz no hace la tarde con Lavinia** («el domingo haría mañana»,
    Aroa). El Generador ya no junta una pareja «nunca con» flexible por su cuenta: solo con «Permitir partidos no
    declarados» marcado, y solo si no hay nadie más, igual que el plan con avisos de la Cobertura. Sin marcarlo, la
    casilla queda como hueco y el propio hueco te ofrece a esa persona «con aviso», para que decidas tú. Así el
    Generador, la confirmación de Equipo («el domingo 4 no puede: nunca con Lavinia») y los planes de la Cobertura
    dicen lo mismo. La casilla «Permitir partidos no declarados» lo explica, y la ficha y la tarjeta de Equipo dicen
    cuándo se junta una pareja flexible (antes: «si no, se relaja y queda el aviso»).
  - **Lo que se propone con aviso se puede aplicar.** La pareja flexible que proponía el plan de la Cobertura, la
    vista previa del Generador o la propuesta «con aviso» de un hueco salía en pantalla, pero al aplicarla decía
    «Lavinia no se pudo poner: nunca con Mari Luz». Ahora entra con su aviso. Desde el Mes pasa lo mismo que en el
    selector: entra con aviso, sin pedir que la fuerces.
  - **Al quitar un cierre por fechas, vuelve también lo que pusiste a mano con aviso** (la pareja flexible). Antes
    se quedaba fuera.
  - **El turno continuo sale como C en el Mes y en la hoja impresa del mes** (Victoria el jueves 8 en El 33:
    «C·33», no «P·33»), con su explicación en la leyenda. En la Cobertura ya no pone «ya trabaja ese día
    (partido)» de quien haría un continuo.
  - **Con «Mínimos» apagado, nadie cuenta faltas:** ni la fila «Turnos cortos» de la hoja impresa del mes, ni la
    fila «Faltan» del Excel. En Hoy, una casilla por debajo del mínimo ya no sale en verde «Mínimo cubierto»: sale
    sin color y dice «Mínimos apagados para todo el grupo». La Cobertura dice «la regla «Mínimos» está apagada: no
    hace falta nadie (1 de 3)» en vez de «la casilla sigue completa».
  - **Con la regla del grupo «Cocina» apagada, la tarjeta tacha también la cocina de titular y de reserva**, como
    ya decía la ficha.
  - **Con varios encargados o empleados conectados**, un aviso de otro dispositivo ya no cierra la ficha que tienes
    abierta ni vacía el Ctrl+Z si lo que ha cambiado no es la planilla. Pasaba mientras el servidor guardaba las
    fichas con la forma de antes de esta versión (hasta el primer cambio del encargado).

- **Equipo dice lo que de verdad se aplica (24/09).** Lo que enseñan la tarjeta y la ficha de cada persona es lo
  que hacen el Generador, la Cobertura, el selector de la casilla y la Revisión. Lo que cambia:
  - **Una regla apagada para todo el grupo se ve en cada ficha.** Si apagas «Días que libra» en Equipo →
    Condiciones, la ficha de Mari Luz la enseña apagada con «Apagada para todo el grupo (Equipo → Condiciones): no
    la mira nadie», su interruptor no se puede tocar desde la ficha, y la tarjeta la tacha y lo dice al pasar por
    encima. Antes la ficha la seguía enseñando encendida.
  - **«Nunca coincide con» es cosa de dos.** Poner o quitar a Lavinia en la ficha de Mari Luz la pone o la quita
    también en la de Lavinia, y lo mismo «flexible». El interruptor ya no es de la característica entera sino de
    cada pareja: apagar Leo–Susana Capón deja activas las demás parejas de Leo. Se deshace con Ctrl+Z. Al abrir la
    app, las parejas que estaban en una sola ficha pasan a las dos, sin cambiar a quién se aplicaba.
  - **Con «Nunca coincide» apagado (para el grupo o esa pareja), la Revisión ya no dice «no pueden coincidir».**
  - **La pareja «flexible» (José, 17/09) se relaja de verdad, y solo si no hay nadie más.** El Generador con
    «Permitir partidos no declarados» la pone junta con el aviso «nunca con Lavinia (pareja flexible: se relaja si
    no hay nadie más)»; sin esa casilla deja el hueco y la ofrece «con aviso» (ver arriba). El selector de la
    casilla la ofrece «con aviso» y la Cobertura solo en el plan con avisos y como último recurso. La Revisión no
    la marca como fallo grave. Antes «flexible» no cambiaba nada: nunca se juntaban.
  - **«Preferencias» apagada en una ficha deja de restar** «prefiere no trabajar el …» en el Generador, la
    Cobertura y el selector.
  - **Con «Mínimos» apagado nadie pide mínimos:** la Revisión no dice «falta», el Generador no deja huecos por
    mínimo y la Cobertura no busca a nadie para llegar a él. El mínimo de cada local sigue guardado en Ajustes y
    vuelve al encenderla. La fila de la regla lo explica.
  - **«Contrato» ya no es un interruptor** (no apagaba nada). La ficha dice «Horas de contrato: el contador de horas
    compara con esto; el Generador no reparte según el contrato». Horas sigue comparando igual.
  - **El standby va en su bloque, «Alta pendiente de confirmar»,** fuera de «Días que libra». Apagar «Días que
    libra» en la ficha de Dulce ya no parece apagar su standby: se sigue aplicando.
  - **La condición «En Pasarela, quien hace partido puede abrir la tarde»** sale en Condiciones como un ajuste del
    local, con el botón «Ajustes del local», y no como una regla del grupo con un interruptor que no le tocaba.
  - **«Sin local fijo» es no tener locales**, en todas partes (la tarjeta, el contador de Equipo, la planilla, el
    Generador, la Cobertura y Horas). La marca que había aparte («comodín») se quita al abrir la app: Tere y
    Lavinia, que tienen sus locales, dejan de salir como «sin local fijo»; Leo, sin locales, lo sigue siendo.
  - **Los vetos llevan su día.** «No hace mañanas en Pasarela los lunes» se ve así en la tarjeta y en la ficha, el
    alta tiene el día, y un veto de los martes ya no se rechaza como repetido de uno de los lunes. Se aplica solo ese
    día.
  - **El local habitual no cambia al quitar y volver a poner un local**, y quien tiene más de uno lo elige en su
    ficha («Local habitual»). El Generador lo lee.
  - **Quien hace mañana y tarde y no tiene ningún día de partido** tiene la condición «X no hace partido» en el
    Generador, que la comprueba.
  - **Un turno continuo no es un partido.** Mañana y tarde seguidas en el mismo local, de corrido (Victoria el
    jueves en El 33), se admiten con la nota «turno continuo»: no salen como «no hace partido» en la Revisión ni en
    las condiciones del Generador, y la columna «Partidos» de Horas y del Excel no los cuenta. El Generador solo
    pone un continuo si no hay nadie mejor (resta 25 puntos) y nunca a quien entra de cocina.
  - Con todo esto, las semanas generadas con la semana tipo salen igual que antes, casilla a casilla, y el plan A
    de la Cobertura de Iván también. Octubre sin semana tipo sale con 566 plazas y 32 huecos (antes 559 y 40).
  - **Para Diego (despliegue):** la versión nueva ordena al cargar las fichas guardadas (parejas «nunca con» en las
    dos fichas, sin la marca «comodín» ni el interruptor de «Contrato»). El servidor comprueba la forma de esos
    campos al guardar, y el empleado no recibe sus parejas «nunca con».

- **Lo de la cocina y quién abre llega también a las semanas que ya estaban en la planilla (24/09).** Hasta
  ahora solo cambiaban las semanas que se generasen de nuevo. Lo que se nota:
  - **Al abrir la app con esta versión**, quién abre y quién lleva la cocina de la planilla que ya estaba dejan
    de estar «puestos a mano»: la versión de antes los fijaba así sin que nadie los tocara. Lo que pusiste tú
    («Sale primero», «Lleva la cocina», «Quitar la marca de cocina») se queda. La Revisión ya no dice «sale
    primero Lola, marcado a mano» cuando nadie la marcó.
  - **Cambiar «Quién abre» o la cocina de un local, una ficha o un interruptor se nota al momento de hoy en
    adelante**, sin vaciar ni volver a generar. Si pones a Mari Luz en «Quién abre» de la tarde de Pasarela, abre
    ella también en las semanas ya volcadas, y el Mes, el perfil de cada empleado, el Excel y las horas dicen lo
    mismo que Hoy (antes seguían con Iván y el tramo de Mari Luz empezaba a las 21:00). Lola con «nunca de
    primero» deja de abrir; Susana Capón con «cocina solo los miércoles» deja la cocina del martes; con la regla
    «Cocina» apagada desaparecen las «COCINA». Lo de días pasados no cambia: es lo que se trabajó.
  - **Nuevo en el menú de la casilla: «Quitar «sale primero» a mano».** La casilla vuelve a decidir quién abre.
  - **La Semana y el Mes también avisan** (en ámbar) de un «Sale primero» a mano sobre quien no puede abrir, como
    Hoy. El aviso dice «“Sale primero” marcado a mano, pero no puede abrir: Leo no sale el primero de la tarde».
  - **Avisos antes de meter una contradicción:** poner en «Quién abre» a alguien cuya ficha no le deja abrir
    (Leo) o que está en standby; «Nunca de primero» a quien es «Quién abre» de un local o tiene «Sale el primero»
    (ofrece quitarlo de ahí); «Sale el primero» a quien tiene «nunca de primero».
  - **Hacer a alguien titular de la cocina de un local que no la tiene** (Tere en la mañana de Pasarela desde
    Ajustes, o Mari Luz desde su ficha) pregunta antes, porque el local pasa a tener cocina todos los días que
    abre y la Revisión avisará los días que falte. Antes se creaba sin avisar.
  - **Ctrl+Z de una ficha o de la cocina de Ajustes ya no deshace lo que cambiaste después en Ajustes del
    local** (el mínimo, «Quién abre»). Antes lo devolvía sin decirlo.
  - **«Guardar como semana tipo» ya no pierde quién abre:** la marca que decide se guarda cada vez (antes se
    perdía la segunda vez), y quien abría y estaba de vacaciones la semana que guardas sigue abriendo.
  - **Con «Cocina» apagada**, «cubre a» y la Cobertura no le dan la cocina a quien no es de cocina (Yilian por
    Hojan), ni le suman puntos de «cocina titular».
  - **Generando un mes sin semana tipo, la cocina obligatoria del Mónaco ya no se queda sin nadie** (el 21 y el 28
    de octubre se perdía por el reparto del mes): el Generador guarda para ella a quien hace falta. Octubre sale
    con 559 plazas y 40 huecos (antes 556 y 45). El reparto del mes queda un poco menos igualado que en la primera
    versión (desviación 9,55 en vez de 9,45; antes de contar «M este mes», 10,87) porque Noe y Jenny llevan tres
    cocinas más.
  - **La cocina que se marca sola no se la lleva quien ese día ya está de sala en otro sitio** (Jenny, de sala en
    la mañana de El 33, ya no se lleva por su orden la cocina de la tarde).
  - **Textos:** el desplegable de la cocina dice «Ya pueden llevarla» (decía «Cocina de este local» y ofrecía a
    cocineros de otros locales); el interruptor «Cocina» apagado de la ficha dice lo mismo al pasar por encima que
    debajo; el Generador dice «lunes 28: en la posición 2» (decía «Lola … sale 2.º»); y «Quién abre» del local
    no sale en las condiciones de una semana en que esa persona está de baja entera.
  - Apuntar una ausencia en Equipo o cambiar el día libre de una semana en la ficha cuentan «M este mes» con el
    mes entero, como la Cobertura.

- **La cocina y quién sale el primero se leen igual en todas partes (24/09).** Lo que cambia:
  - **Ajustes del local → Cocina y la ficha de cada persona son lo mismo.** Añadir a alguien a los
    titulares o a las reservas de la cocina de un local lo pone también en su ficha, y quitarlo lo quita.
    Al revés, marcar en una ficha «Titular de cocina en El 33» la pone en Ajustes de El 33 (en las
    franjas que trabaja). Antes se podía añadir a Victoria en Ajustes: el Generador la anunciaba y
    nunca le daba la cocina. Y quitar a Noe no se la quitaba de la ficha.
  - **El desplegable de la cocina ofrece primero a quien ya puede llevarla.** Si eliges a otra
    persona, te avisa de que pasa a ser de cocina de ese local en su ficha, y pregunta antes de hacerlo.
    Se deshace con Ctrl+Z.
  - **Quien tiene «Nunca cocina» no le crea una cocina a un local** por estar en su lista. Antes, poner a
    alguien así de titular de Pasarela hacía salir siete «sin cocina» a la semana.
  - **La semana tipo no le da la cocina a quien su ficha no deja ese día.** Por ejemplo, a Susana Capón
    si su ficha dice «cocina solo los miércoles». La cocina la lleva otra persona y, si no hay nadie, sale
    como hueco.
  - **Una cocina obligatoria que nadie puede llevar es un hueco:** sale en «Huecos» del Generador
    (Semana y Periodo) y en la hoja impresa, con el porqué. Antes solo lo decía la Revisión.
  - **Apagar «Cocina» en la ficha de una persona** deja de mirar sus límites: «solo estos días», «nunca
    cocina» y «solo hace cocina». No le quita ser titular o reserva de un local. Las tarjetas de Equipo lo
    enseñan igual: tachan los límites y no el «titular».
  - **Apagar la regla «Cocina» del grupo apaga la cocina entera.** Nadie la busca, la exige ni la marca:
    ni el Generador, ni la semana tipo, ni la Cobertura, ni el selector, ni la Revisión. Equipo →
    Condiciones lo dice al apagarla. La cocina marcada a mano se queda.
  - **Quién sale el primero:** primero va el que tenga el local en «Quién abre» (si puede abrir ese día),
    luego quien tenga «Sale el primero» en su ficha y después la marca de la semana tipo. Si pones a Mari
    Luz en «Quién abre» de la tarde de Pasarela, abre ella los días que puede, y el Generador lo comprueba
    como una condición más. Lola con «nunca de primero» ya no sale la primera.
  - **La semana tipo ya no fija quién abre como si lo hubieras puesto a mano.** «Guardar como semana tipo»
    solo guarda el «sale primero» que pusiste tú. Quien abría sigue abriendo, porque su plaza se guarda la
    primera. Al abrir la app, de la semana tipo guardada se quitan una sola vez las marcas que solo
    repetían quién abría. Volcar el Generador → Periodo tampoco fija quién abre.
  - **«Sale primero» a mano sobre quien no puede abrir te pregunta, como «forzar», con la regla y el
    motivo.** Pasa, por ejemplo, con Leo («nunca de primero») o con Cristian en El 33. Si sigues, la
    casilla lo marca (ABRE ⚠) y Revisar lo avisa: «sale primero Leo, marcado a mano, y no puede abrir».
  - **Apagar «Sale el primero»** (la regla del grupo o la ficha de una persona) quita también el ▸ y los
    puntos de «sale el primero». La hoja impresa vuelve a preguntar quién abre ese local.
  - **La razón de quien abre dice cómo abre:** «abre la tarde en partido (el local lo permite)», «turno
    continuo» o «puede abrir (turno completo)». Antes decía siempre lo último.
- **El reparto del mes, igualado otra vez (24/09).** Al elegir entre varias personas, además de «N turnos
  esa semana» cuenta ahora «M este mes», en el Generador y en la Cobertura. Generando octubre sin semana tipo,
  Victoria pasa de 36 turnos a 25 y Juani de 9 a 13; ninguna semana sale menos igualada. Con la semana tipo no
  cambia nada, y el plan A de la Cobertura de Iván tampoco. La razón dice, por ejemplo, «3 turnos esa semana
  · 12 este mes».

- **La puerta única de reglas, repasada antes de subirla (24/09).** Lo que cambia para quien la usa:
  - **Si a la casilla le falta la cocina y quien la lleva solo rompe algo que se puede relajar** (Jenny,
    que el lunes lleva la cocina del Mónaco por la mañana y por la tarde haría un partido que no tiene
    declarado), sale arriba de «CON AVISO» como cocina y, al pulsarla, entra llevándola. Antes salía en
    «NO PUEDEN» con «ya lleva la cocina de Bar Mónaco ese día», y «forzar» la ponía de sala: la casilla
    seguía sin cocina. En «NO PUEDEN», quien lleva esa cocina se fuerza también como cocina.
  - **«Forzar» dice todas las reglas que se saltan, cada una con la suya** (en el selector y en el Mes):
    «Locales donde trabaja — solo Zapatillera», «Mañanas y tardes — siempre de mañana», «Días de
    partido — partido no declarado los lunes». Antes nombraba solo la primera y el aviso de después se
    las atribuía todas a ella.
  - **«N turnos esa semana» cuenta la semana entera también cuando cruza de mes**, en el selector, en la ★
    de Hoy y en el Generador → Periodo. En la semana del 28/09 al 04/10 contaba solo los días de ese mes
    (el lunes 28, «2 turnos esa semana» de Cristian, que tenía 7) y la Cobertura daba otra cifra.
  - **Las condiciones del Generador enseñan tres reglas que ya se aplicaban**: «Hojan solo hace cocina»,
    «quien lleva la cocina un día no refuerza la sala ese día» (nueva, de Aroa el 17/09) y el standby de
    Dulce («Dulce está en standby: aún no entra en la planilla»). Y el Generador las comprueba.
  - **Un local que ya no abre una franja en «Cuándo abre»** (el horario de todas las semanas): quien seguía
    puesto ahí sigue contando como puesto, en la planilla y en Horas, hasta que el Generador lo retira al
    volver a generar o se quita a mano; la Revisión lo avisa en rojo. Solo un cierre de ese día (por fechas
    o a mano) deja a esa persona libre para otro local, y entonces Horas tampoco le cuenta esa franja. La
    primera versión también la dejaba libre con «Cuándo abre», y podía quedar puesta en dos locales a la
    vez y contada dos veces en Horas.
  - La hoja impresa dice «Dulce, que está en standby» y, con un hueco de uno, «Falta uno para el mínimo de
    3» (decía «Faltan un»).
  - Generando un mes entero sin semana tipo (la casilla «Partir de la semana tipo» desmarcada), el reparto
    del mes salía menos igualado que antes (en octubre, Victoria 36 turnos y Juani 9, frente a 25 y 13).
    Resuelto el mismo 24/09: ver «El reparto del mes, igualado otra vez».
- **Todo lo que se pone en Equipo se lee igual en todas partes (24/09).** Diego: «que lea todas
  las variables». Las reglas de la ficha estaban copiadas en el selector, el Generador, la Cobertura,
  la Revisión y la hoja impresa, y cada copia decía una cosa. Ahora hay una sola puerta de reglas y
  una sola forma de puntuar, y una prueba que falla si un campo nuevo de la ficha no lo lee alguien
  o si un camino se salta una condición. Lo que se nota:
  - **El selector de la casilla.** Si a la casilla le falta la cocina, arriba sale «COCINA» con quien
    puede llevarla; la ★ es esa persona (también la ★ de un toque de Hoy) y, al pulsarla, entra
    llevando la cocina. En «NO PUEDEN»
    todos dicen por qué y qué regla les frena, y el botón «forzar» sale solo donde se puede forzar
    (ya no sale con un local cerrado por fechas, donde fallaba).
  - **La hoja impresa del Generador, «se destraparía si…».** Dice la verdad: a Dulce, en standby, ya
    no se le propone levantar «no sale el primero» (seguiría en standby); si lo único que la frena es
    el standby, lo dice. El veto de Mari Luz de los lunes no se le pone un martes, el día libre es el
    de esa semana, y cuentan la cocina y «dos apoyos no se quedan solos».
  - **El Generador reparte por semanas, como la Cobertura.** Al elegir entre varias personas cuenta
    los turnos de esa semana, la semana entera (antes, los del mes). Con la semana tipo no cambia
    ninguna plaza de la semana del 28/09, la del 05/10 ni la de octubre; la razón dice «2 turnos esa
    semana». Generando un mes sin semana tipo, el reparto del mes sale menos igualado (ver arriba).
  - **Alguien que se quedó puesto en un local cerrado ese día** (por el visor de cierres o cerrado a
    mano ese día) ya no queda atado a ese local: se le puede poner en otro esa franja sin forzar, y
    Horas no le cuenta la franja cerrada. La Revisión sigue avisando en rojo de la plaza en el local
    cerrado.
  - En la Cobertura, el porqué de un hueco de cocina nombra también a quien no lleva la cocina de ese
    local.
  - Las condiciones que enseña el Generador salen del mismo sitio que las reglas que aplica: dicen
    justo lo que se comprueba.
- **«Cubre a» hasta nueva orden, repasado antes de subirlo (24/09).** Lo que cambia para quien lo usa:
  - La ★ de Hoy (la recomendación de un toque) pone a Mari Luz «por Iván», igual que «＋ Asignar».
    Antes fallaba el domingo («no hace partido los domingos») o la ponía sin «por Iván».
  - Una baja apuntada hoy con fecha de inicio de días atrás ya no mete a nadie en días ya
    trabajados (cambiaba sus horas). Esos días la persona sale de la planilla, pero no se pone a nadie
    en su sitio; la confirmación lo dice: «si alguien le cubrió, ponlo a mano».
  - Equipo, la Cobertura y el Generador eligen siempre a la misma persona: con dos personas que cubren
    a Iván, las tres dicen la misma; y el Generador tampoco deja ya a Lavinia y a Dulce solas la tarde
    del miércoles 30 (dos apoyos no se quedan solos), que es lo que ya decía Equipo.
  - Si quien falta llevaba la cocina, quien le cubre y la hace entra con la cocina también desde
    Equipo (Hojan por Jenny), como en el Generador.
  - Cuando quien cubre no puede, se dice siempre por qué («ya está en ese turno de sala, y Hojan
    llevaba la cocina»). Ya no sale «no se pudo poner».
  - Después de un «Guardar» simple, la pestaña Cobertura encuentra el domingo que quedó pendiente:
    antes decía «Iván no tiene turnos en la planilla ese día».
  - «Guardar como semana tipo» una semana en que alguien estaba de vacaciones ya no deja a quien le
    cubría como plaza fija ni borra las plazas de quien faltaba.
  - Ctrl+Z (o «Más → Deshacer») después de apuntar una ausencia, usar la Cobertura o el Generador ya
    no te lleva a otro mes: te quedas en el día que estabas mirando.
  - La confirmación se lee mejor: «El viernes 2 y el sábado 3 ya estaba en ese turno y pasa a
    cubrirle, abriendo. El domingo 4 no puede: nunca con Lavinia.» El historial pone las fechas en
    orden, y la ficha de Iván dice solo «Si falta, le cubre Mari Luz».
  - Al quitar una ausencia, el aviso dice que la persona vuelve a sus turnos al volver a generar la
    semana y cómo deshacerlo.
  - El alta de ausencias del Mes deja elegir día entero, solo mañana o solo tarde. Como en la ficha,
    unas vacaciones con «Hasta» vacío son de un solo día (antes, en el Mes, quedaban sin fecha de fin).
  - Los empleados no reciben la marca interna que decía qué compañero cubre a quién por designación.
- **«Cubre a» hasta nueva orden, de punta a punta desde Equipo (24/09).** Diego: «que pueda decir
  en equipo, tal persona cubre a tal persona, hasta nueva orden… antes no se hablaba bien equipo con
  generador ni con cobertura». Lo que cambia para quien lo usa:
  - Se pone en la ficha de quien cubre y vale hasta que se quite. La ficha y la tarjeta de Mari Luz
    dicen «Cubre a Iván · siempre que falte · hasta que lo quites» (o «cuando falte los viernes» si
    tiene día), y las de Iván «Si falta, le cubre Mari Luz», con su nombre para ir a su ficha.
  - Al apuntar unas vacaciones, un permiso, una baja o un día libre (desde la tarjeta, la ficha o el
    Mes) en días que ya están en la planilla, Iván sale de sus turnos y Mari Luz entra en su sitio.
    Antes de guardar, una ventana lo cuenta: «Iván no está del viernes 2 al domingo 4 por la tarde.
    Mari Luz le cubre (hasta nueva orden). El viernes 2 y el sábado 3 ya estaba en ese turno y pasa a
    cubrirle, abriendo. El domingo 4 no puede: nunca con Lavinia», y lo que queda por cubrir. Se guarda todo
    junto y Ctrl+Z (en el móvil, «Más → Deshacer») lo deshace de una vez. Antes solo se quitaba a Iván
    y quedaba el hueco.
  - «Guardar y buscar en la Cobertura lo que queda» abre la Cobertura con esos días ya marcados,
    aunque Iván ya no esté en esas casillas, y al confirmar no se apunta la ausencia dos veces.
  - Las ausencias de la ficha y de la tarjeta se pueden apuntar de día entero, solo por la mañana o
    solo por la tarde.
  - La Cobertura dice arriba «Iván tiene quien le cubra: Mari Luz» y, el día que no puede, por qué
    («Mari Luz no puede: nunca con Lavinia»). El hueco de ese día dice lo mismo (antes, «no hace
    partido los domingos»).
  - El Generador (semana y periodo) dice lo mismo que Equipo y la Cobertura. Si Iván está de
    vacaciones en su ficha pero seguía en su tarde, al generar sale de ella; si lo pusiste a mano, se
    queda con su aviso.
  - Quitar «Cubre a» deja de aplicarse en todas partes: el Generador, la Cobertura, el selector, la
    Revisión y las condiciones. Lo que ya estaba en la planilla solo por esa designación se quita al
    volver a generar la semana; lo puesto a mano se queda. Mari Luz, que estaba en su plaza de
    siempre, la conserva y deja de ir «por Iván».
  - En el móvil, «Guardar ausencia» no respondía al primer toque si justo antes se había elegido la
    fecha: arreglado.
  - Quitar a alguien de una casilla a mano ya no deja la casilla sin quien abra cuando era esa persona
    la que abría.
- **«Cubre a», repasado antes de subirlo (24/09).** Lo que cambia para quien lo usa:
  - El domingo 4, sin Iván, la tarde de Pasarela ya no se queda con dos apoyos (Lavinia y Dulce):
    «dos apoyos no se quedan solos» vale siempre, también en el plan con avisos y en el Generador.
    Ahora el plan A pone a Roberto, con el aviso de que no tiene declarado el partido los
    domingos, y el plan B deja el hueco y dice por qué («dejaría la casilla solo con apoyos: Dulce,
    Cristian»). Si preferís a Dulce, se puede poner a mano desde la casilla: sale en «con aviso».
  - Si Mari Luz ya está de mañana y de tarde y no tiene el partido declarado ese día, el plan ya
    no enseña huecos que no existen: sale abriendo, igual que luego en la planilla. Y abre de
    verdad: su hora es la de quien abre (16:00–21:00), no 21:00–00:00.
  - Generador → Periodo: al volcar, Mari Luz queda «por Iván» como relevo; cuando Iván vuelve, el
    generador ya no le quita su propia plaza.
  - Generador → Semana: si lo único nuevo es que Mari Luz pasa a cubrir a Iván, se puede volcar
    («Volcar a la planilla (1 relevo «cubre a»)») y «Qué ha cambiado» lo enseña.
  - Cambio de turno: el turno a cambio que propone el plan se hace al confirmar. Antes se perdía.
  - Selector: la ★ de quien cubre se puede poner, y queda «por Iván». Al forzar a Hojan en la sala,
    queda como forzado con «solo hace cocina». Y si un clic no se puede poner, Ctrl+Z no se queda
    con un paso vacío.
  - Mirar una ficha sin cambiar nada ya no deja el plan de la Cobertura «viejo».
  - La Revisión pone el partido autorizado en su propio grupo, «Autorizado · para que lo sepas»,
    con una línea por persona y día (antes salía en «Pendiente de confirmar con el grupo», dos
    veces).
  - Solo una persona va «por Iván» en cada turno; quien entra además lo hace «para llegar al
    mínimo (había 2 de 3)». Quien ya va por otra persona (Roberto, el jueves, por Susana Luna) no
    pasa a cubrir a otra.
  - «Cubre a» de quien no sale en la semana tipo (Maydeth, Laura y Susi, de baja) sigue dando
    prioridad y el «por», pero no autoriza partidos: Hojan ya no hace partido «para cubrir a
    Maydeth» toda la semana.
  - Cuando hay que elegir entre planes igual de buenos, gana el que pone a quien tiene «Cubre a».
  - Quien ese día ya está de sala no entra a llevar una cocina: el Generador lo hacía y luego la
    Revisión lo marcaba.
  - Media jornada: Horas y «Vacaciones del año» cuentan media jornada de vacaciones como medio día
    («0,5», con la fecha «28/09 (tarde)»). La tarjeta de Equipo, Hoy, la Semana, el Mes, el pie de
    la hoja impresa y el perfil de cada empleado dicen «por la mañana». Y al cerrar un local se
    ponen las vacaciones de la franja cerrada aunque ese día haya un permiso de la otra.
  - Lo aplicado se cuenta por turnos: «3 turnos de Iván cubiertos: 2 por Mari Luz, que ya estaba;
    entra Dulce (3)». El historial dice «Mari Luz (ya estaba)».
- **«Cubre a» ya manda en la Cobertura: Mari Luz cubre a Iván** (reunión del 24/09: «preferimos
  que lo cubra Mariluz viernes y sábado por la tarde… sigue poniendo a Dulce»). Con Iván de
  vacaciones el viernes 2, el sábado 3 y el domingo 4, y Mari Luz con «Cubre a Iván», el plan A
  dice ahora que Mari Luz, que ya estaba de tarde esos días, pasa a cubrirle y abre: «Mari Luz ·
  ya estaba · cubre a Iván · ABRE». No sale en «Entran», porque no es un turno nuevo. Como esas
  tardes piden tres personas, entra una más «para llegar al mínimo (había 2 de 3)». El domingo no se le
  propone: hace la mañana por Lola y por la tarde está Lavinia, con la que no coincide.
  - Al confirmar, la planilla la enseña «por Iván» en Hoy, en la Semana y en la planilla propuesta
    del Generador (la hoja del equipo sigue siendo solo nombres). Lo mismo pasa al generar la
    semana con las vacaciones de Iván ya puestas en su ficha.
  - Quien tiene «Cubre a» va siempre el primero de la lista para cubrir a esa persona, aunque
    tenga más turnos esa semana. Antes pesaba menos que estar libre ese día.
  - «Cubre a» vale en el sitio de quien falta y para su puesto: ya no suma en otro local ni para
    llevar una cocina que no era la suya. Con el interruptor «Cubre a» apagado, nadie lo aplica.
- **«Cubre a» permite el partido necesario para cubrir, y nada más.** Si Mari Luz no tuviera
  declarado el partido del viernes, el plan la pondría igual, con la nota «partido para cubrir a
  Iván». Es una nota, no un aviso: no quita puntos al plan, el Generador da la condición de
  partido por cumplida y la Revisión la enseña aparte, solo para que se sepa. Donde se puede
  abrir la tarde haciendo partido (Pasarela y El 33), también puede abrir. «Cubre a» no se salta
  nada más: ni el día libre, ni los vetos, ni «nunca con», ni las ausencias, ni las franjas, ni
  los locales, ni el standby. En Equipo, «Cubre a» lo explica.
- **El plan de la Cobertura ya no se queda viejo.** Si después de buscar se cambia algo en Equipo,
  en la planilla o con Ctrl+Z, la pestaña ya no enseña el plan de antes: dice «La ficha ha
  cambiado: vuelve a buscar», con un botón para buscar otra vez. La columna de quien falta dice
  ahora quién se queda en el turno («quedan Mari Luz y Leo, 2 de 3»).
- **La Cobertura cuenta con la semana entera.** «N turnos esa semana» ya cuenta los turnos de toda
  la semana, no solo de los días marcados. El cambio de turno vuelve a encontrar un turno a cambio.
- **Dos apoyos no se quedan solos** (José, 17/09). Ni la Cobertura ni el Generador dejan un turno
  solo con apoyos, ni con uno solo: si no hay nadie más, queda el hueco con el porqué. La Revisión
  lo pone en rojo (hasta ahora solo se veía en Hoy) y el Generador lo comprueba como condición.
- **Quien solo hace cocina, o ese día ya lleva una cocina, no refuerza la sala**, tampoco en la
  Cobertura. Antes la Cobertura podía meter a Hojan en la sala del Mónaco. El selector dice por
  qué no puede, y se puede forzar. «Solo hace cocina» se ve y se cambia en la ficha, en Cocina.
- **Permisos y vacaciones de media jornada.** En la Cobertura, un permiso «solo por la mañana»
  queda así en la ficha: Mari Luz conserva su tarde, al regenerar no la pierde y la Revisión ya no
  la da por ausente. Horas lo cuenta como media jornada. Al cerrar un local, quien ese día
  trabaja también en otro sitio coge vacaciones (o el día libre) solo de la franja cerrada. Antes
  esa franja contaba como sin trabajo.
- **Cierre por fechas, repasado antes de subirlo (24/09).** Lo que cambia para quien lo usa:
  - En el móvil, «Siguiente» y «Cerrar Bar Mónaco» responden al primer toque (en Android había
    que tocarlos dos veces, y si se cerraba la ventana el local no quedaba cerrado). Y «Cerrar
    unos días» ya no se parte en tres líneas en la cabecera del local.
  - Al editar un cierre, cambiar una fecha no reinicia los días: un cierre «solo tardes» sigue
    siendo de tardes, y el día que se añade también. Y quien deja de estar afectado (porque ya no
    se cierra su día) no se queda «sin trabajo» por error ni pierde la plaza que tenía en otro local.
  - Quien esa semana estaba en otro local no sale «sin trabajo» porque en la semana tipo le
    tocara el local cerrado: cuenta lo que había en la planilla.
  - Quien hacía turno partido y se queda con la otra mitad la conserva tal cual: Hojan el lunes
    28 sigue haciendo El 33 de 11:00 a 16:00 (no pasa solo a entrar a las 07:00) y sus horas
    bajan las 3 h de la noche. El visor lo avisa en su tarjeta.
  - Horas enseña en el detalle de cada persona los días sin trabajo por el cierre («Sin trabajo
    por el cierre de Bar Mónaco: lun 28 por la tarde y mar 29»), solo como información. Un día
    en que la persona trabaja la otra franja ya no cuenta como día entero sin trabajo.
  - Las horas ya trabajadas no cambian al tocar «Cuándo abre»: quitar un día del horario semanal
    ya no borraba de Horas (ni del registro de apoyos) los días de ese tipo ya trabajados, también
    de meses cerrados para la nómina. Solo se descuenta un día que estuvo cerrado de verdad (por
    fechas o a mano). La Revisión tampoco avisa de esos días ya pasados.
  - Quien apoya «donde haga falta» y nadie ha colocado sale como «apoyo · sin sitio» en Hoy, en
    la Semana, en el Generador y en el pie de la hoja del local, no como que libra; la Revisión lo
    avisa, y en su perfil pone «aún sin sitio: te lo dirá el encargado».
  - «Cuándo abre»: si al quitar un día se cerraron las semanas ya planificadas, al volver a
    marcarlo la app pregunta si reabrirlas desde hoy (vuelve la gente que estaba puesta; lo ya
    pasado se queda como está). Antes esos días seguían cerrados sin que nada lo dijera.
  - El texto de un cierre con días sueltos los nombra uno a uno («dom 27/09 y mar 29/09, solo
    tardes»; «los domingos por la tarde del 27/09 al 25/10»), en vez de parecer un intervalo seguido.
  - Cerrar días que ya han pasado avisa antes de confirmar, y los cierres ya pasados de los dos
    últimos meses siguen en Ajustes con «Ver» y «Reabrir».
  - Ctrl+Z con Ajustes de los locales abierto deja la tabla de «Cuándo abre» como está de verdad.
  - Detalles: el pie de la hoja del local marca «cierre» a quien no trabaja por el cierre; el Mes
    pone un punto en la pastilla de quien no trabaja solo una franja; «Ver cierre» ya no dice «lo
    cerró local» sin servidor; el historial dice «12 plazas retiradas» y no «plaza(s)».
- **Cerrar un local unos días, como unas vacaciones del local** (reunión del 24/09: «no tiene
  un botón de cerrar, de cerrar bares por vacaciones»). En Equipo → Ajustes de los locales hay
  una sección nueva, «Cierres por fechas», con «＋ Cerrar unos días»; también se llega desde la
  cabecera de cada local en Hoy («Cerrar unos días») y desde la casilla («Cerrar esta franja…»).
  Se elige desde qué día y franja hasta qué día y franja —por ejemplo, del domingo 27 por la
  tarde al martes 29— y cada día se puede dejar de mañana, de tarde, todo el día o abierto; y
  el motivo: reforma, vacaciones del local u otro. Cuando pasa, el local vuelve a abrir solo:
  el domingo 04/10 el Mónaco abre por la tarde con normalidad.
- **Al cerrar, la app pregunta qué hace cada persona.** Sale quien trabajaba esos días (de la
  planilla o, si la semana aún no está hecha, de la semana tipo), con sus turnos y avisos («el
  domingo 27 también hace El 33 por la mañana»), y para cada uno: Apoyo, Sin trabajo, Día libre
  o Vacaciones. Por defecto, sin trabajo: nadie se redistribuye solo. Quien apoya puede ir esos
  días a otros locales sin forzar nada, y se puede elegir dónde cada día (la app propone
  primero donde falta gente) o dejarlo «donde haga falta». Las vacaciones y los días libres van
  a la ficha y a la nómina; si ese día la persona tenía también otro turno, no se le quita el
  día entero: la parte cerrada cuenta como sin trabajo y la app lo avisa.
- **El generador y la cobertura lo respetan.** No ponen a nadie en el local cerrado, no
  recolocan a quien se ha quedado sin trabajo y a quien apoya lo ponen donde falta (o en su
  sitio elegido), también después de «Vaciar lo generado». Las plazas que ya había en el local
  cerrado salen de la planilla y dejan de contar en las horas; si se reabre, vuelven.
- **Se ve en todas partes.** Hoy dice «Cerrado · Reforma (hasta mar 29)» con «Ver cierre»
  (desde ahí se edita o se reabre) y cuenta quién apoya y quién no trabaja; la Semana pone
  «cerrado · reforma» y marca «cierre» a quien no trabaja; el Mes marca el día y pone «CIE» en
  la fila de la persona; el Generador pone «Cerrado · Reforma» y una nota con el cierre; la
  hoja semanal y el Excel dicen «CERRADO · Reforma». Cada empleado ve su casilla «cerrado por
  reforma» y lo que hace él, y nada de lo que hacen sus compañeros. Ctrl+Z lo deshace todo.
- **«Cuándo abre» avisa de que es para todas las semanas.** Al desmarcar un día sale «Esto
  cierra TODOS los domingos por la tarde. ¿Querías cerrar solo unos días?» con el botón al
  cierre por fechas. Y si de verdad se cierran todos y ya había gente puesta en las semanas
  planificadas, pasa por el mismo visor para decidir qué hace cada uno.
- **«Abrir hoy» pregunta cuánta gente hace falta.** Una casilla que se abre a mano un día que
  no abre ya no se queda con mínimo cero: el generador la rellena y la Revisión avisa si queda
  vacía. La Revisión avisa también, en rojo, si en una casilla cerrada sigue puesta gente.
- **Para el despliegue:** en la planilla de verdad el Mónaco tiene ahora quitado el domingo por
  la tarde en «Cuándo abre» (y quizá también el lunes y el martes). Hay que volver a marcarlos y
  crear el cierre por fechas del domingo 27/09 por la tarde al martes 29/09. Después, pasar
  «Generar la semana» de la semana del 28: se generó con el domingo por la tarde cerrado, así
  que el domingo 04/10 por la tarde del Mónaco está vacío y hay que rellenarlo.
- **Cambiar el día libre también funciona en lo generado por meses.** Si la semana se había
  volcado con «Mes → Generar» (o «Completar este día»), al marcar «libra el martes» Mari Luz
  se quedaba sin trabajar ni el martes ni el miércoles: la app no sabía que Lavinia la cubría
  el miércoles. Ahora lo sabe, también en lo ya guardado, y Mari Luz pasa al miércoles como
  en cualquier otra semana.
- **Quitar el cambio lo deja todo como estaba.** Si al cambiar el día entró alguien a cubrir
  el día nuevo (Roberto por Adrián el martes), al quitar el cambio sale; y si quien se va
  llevaba la cocina, la coge otro de la casilla en vez de quedarse sin cocina. Marcar el
  martes, luego el jueves y luego quitar el martes da lo mismo que marcar el jueves.
- **Solo se tocan los días que cambian.** Lo que quitaste a mano otro día de esa semana no
  vuelve, y los días que aún no están generados no se rellenan: eso lo hace el Generador.
- **La confirmación lo cuenta todo.** Además de quién sale y quién entra, dice dónde no se
  la puede poner y por qué («no se puede poner a Mari Luz el miércoles 30 en Pasarela
  mañana: nunca con Lavinia (plaza puesta a mano)»), y si un día del cambio ya ha pasado:
  «el miércoles 23 ya ha pasado y no se toca: esta semana trabaja 5 días en vez de 6». El
  Generador avisa de lo mismo. Las semanas que ya han pasado no se cambian.
- **Ctrl+Z con la ficha abierta.** La ficha se pone al día al deshacer: deja de enseñar el
  cambio deshecho, se puede volver a marcar y lo que toques después se guarda.
- **«Guardar como semana tipo» guarda a cada uno con su día de siempre.** Si esa semana
  alguien cambió su día libre, la semana tipo lo guarda con su día de siempre (y con quien
  le cubre ese día), y la confirmación lo dice. Y Ctrl+Z, que devolvía la planilla pero no
  la semana tipo de antes, ahora también la devuelve.
- **Textos más claros.** La ficha dice «La semana del 28/09 libra martes…». Marcar su propio
  día libre no guarda nada. A quien no tiene día fijo ya no le sale el aviso de días «sin
  emparejar»; cuando hace falta, dice «no se sabe qué día trabaja a cambio». La Revisión y
  la hoja impresa dicen «libra el martes esta semana», sin añadir «no hace partido los
  martes». La confirmación dice «falta 1 de 3». En el Generador por periodo, lo que se
  retira sale una vez por persona y día, con mañana o tarde, y el aviso final lo cuenta. En
  el móvil se dice «Más → Deshacer» en vez de Ctrl+Z, y «Listo» cierra al primer toque.
- **La propuesta «con aviso» que aceptas en el Generador es tuya:** queda como puesta a mano
  y el Generador ya no la retira por su cuenta.
- **«Esta semana libra otro día» ya lo respeta el generador** (reunión del 24/09: «esta
  semana libra martes en vez de miércoles… al generar no lo respeta… me salen los 2 días…
  en el equipo te lo pone tal cual, pero luego no lo quita»). Ahora, si Mari Luz libra el
  martes en vez del miércoles, al generar la semana libra el martes y el miércoles hace
  exactamente lo que habría hecho el martes: Pasarela mañana y tarde, con su partido, sin
  aviso de partido. Lavinia, que la cubre los miércoles, esa semana no va. El martes se
  cubre como si faltara: entra quien la cubre si puede, y si no lo rellena el generador o
  queda como hueco explicado. Trabaja los mismos días que cualquier otra semana (si uno de
  los dos días ya ha pasado, la app lo avisa). Vale para cualquiera que cambie su día libre
  (Victoria, Adrián…), también en la semana que cruza de mes, en el Generador por semanas y
  por periodo, y en la hoja impresa.
- **Si la semana ya está en la planilla, se cambia al momento.** Al marcar el día en la
  ficha, la app cuenta antes lo que va a pasar («Mari Luz sale del martes 29… entra el
  miércoles 30… Lavinia deja de cubrirla… queda un hueco el martes 29 en Pasarela
  mañana») y, al aceptar, lo aplica. Ctrl+Z lo deshace de una vez. Lo que se puso a mano o
  se forzó no se toca: se queda, con su aviso. Quitar el cambio lo devuelve todo a su sitio
  (ver arriba).
- **«Generar la semana» ya quita lo que no vale.** Hasta ahora solo añadía. Ahora retira lo
  que puso la semana tipo o el propio generador y choca con un día libre (quien libra ese
  día, y quien cubría a alguien que esta semana sí trabaja), y lo enseña en «Qué ha
  cambiado» → «Se retira», con el motivo. Nunca quita lo puesto a mano ni lo forzado. El
  botón de volcar cuenta también lo que se retira.
- **La ficha dice siempre de qué semana habla.** El bloque «Esta semana libra otro día»
  enseña la semana («Semana del 28/09 al 04/10») con flechas para cambiarla; de partida,
  la que tienes en el Generador (si no lo has abierto, la de la vista Semana). Se pueden
  dejar varias semanas preparadas: las demás salen debajo, con su ✕ para quitarlas, en vez
  de «Sin cambios».
- **En el Generador semanal, «Cambiar el día libre de alguien esta semana»**: eliges a la
  persona y el día, y se guarda para la semana que estás generando. Debajo del botón, la
  lista de quién cambia su día libre esa semana. En la planilla generada, la casilla de
  quien está forzado lleva ⚠ con el motivo.
- **Todas las vistas leen el día libre de esa semana.** La tarjeta de Equipo dice
  «Semana del 28/09: libra martes (en vez de miércoles)»; la Cobertura pinta «libra» el
  martes y no el miércoles y su cabecera dice «(semana del 28/09: libra martes)»; el Mes,
  Hoy («libra el martes esta semana (en vez de los miércoles)») y el perfil del empleado,
  lo mismo. Las condiciones del Generador dicen «Mari Luz libra el martes esta semana (en
  vez de los miércoles)» y la comprueban esa semana.
- **Las bajas se miran con la semana que se mira, no con el día de hoy.** Quien está de
  baja hoy pero vuelve la semana que se genera sí tiene sus condiciones comprobadas. Una
  baja de unos días sale como «Tere de baja el lunes», y el sábado Tere sale en «Quién
  libra». La Cobertura ya no cambia de persona sola cuando la elegida está de baja hoy: la
  cabecera avisa de los días de baja. El pie «Descansos» de la Semana cuenta a quien vuelve
  de una baja y ya no cuenta a quien está en standby. En el Mes, el grupo «De baja» es quien
  lo está el mes entero.
- **La hoja de la semana, con letra más grande** (Diego, 24/09: «imprimible de semana con
  letra más grande»). Sigue siendo UNA hoja A4 apaisada con los cuatro bares y solo los
  nombres, la que Aroa recorta en cuatro, con todas las casillas del mismo alto y los siete
  días del mismo ancho. Pero los nombres pasan de 10,9 a 14 px, un 29 % más grandes (13,8 px
  la semana con partido), y el día y la fecha crecen con ellos. Para hacer sitio, cada nombre
  va algo más junto al de debajo y la cabecera, el pie y la banda de color de cada bar ocupan
  menos; el último nombre de cada casilla conserva su aire sobre el borde. Si una semana
  viene cargada, la letra baja sola sin pasar a dos hojas: con cinco nombres en una casilla
  va a 11,4 px (antes 8,8), con seis a 9,9 px (antes 7,7) y con siete a 8,3 px en una hoja
  (antes 7,7 en dos). Un nombre largo que antes salía entero nunca se recorta: la letra se
  queda en la talla en la que cabe. De paso se arreglan tres cosas: «Descargar PDF» partía
  la semana con partido en dos páginas (la segunda, una tira de 2 mm) y ahora sale en una;
  la imagen para WhatsApp («Compartir») sale con la misma letra que el papel, no con la
  pequeña; y la hoja vertical de un bar, la de letra grande, sacaba los nombres a 8,8 px por
  un fallo y ahora van a 17-19 px; con la semana cargada baja la letra en vez de compactar
  (11,7 px con seis nombres en una casilla) y todas sus casillas miden lo mismo.
- **Entrevistas: el orden se elige** (Diego, 21/09: «los filtros son orden alfabético, bien
  mal, fecha, etc, tal como pidió el cliente»). Debajo de los filtros hay cuatro botones:
  **Las últimas primero** (el que manda de partida, el que pidió José), **Por fecha** (la
  entrevista más reciente arriba, las que no tienen fecha al final), **Por valoración** (Bien,
  En espera, Mal, Vetado y los sin valorar al final) y **Alfabético** (sin que la mayúscula
  ni el acento cambien el sitio: «Élia» va entre «Dani» y «fran»). El pie de la lista dice
  siempre por cuál va. Poner o quitar un filtro no cambia el orden elegido, y «Quitar
  filtros» tampoco.
- **Entrevistas: las últimas primero** (José, 21/09: «los que pongo BIEN o descarte me
  aparezcan primero cuando filtre. Si sale en orden alfabético me vuelvo loco. Para que las
  últimas por fecha me aparezcan antes»). La lista salía en el orden en que llegó de Notion,
  que era alfabético. Ahora manda lo último que se ha tocado: registrar a alguien o guardar
  su ficha con un cambio (una valoración, por ejemplo) lo pone el primero, con o sin filtros.
  Abrir una ficha y darle a Guardar sin cambiar nada no la mueve. Las fichas que nadie ha
  tocado van por la **fecha de la entrevista**, la más reciente antes: 165 de las 194
  antiguas la traen tal y como la leyó el OCR de las hojas («23/2/2026», «22 de Julio de
  2026», «14 de Septiembre» sin año…) y la app la entiende en todas esas formas; las 29 que
  no la tienen van al final, en el orden en que estaban. Cada fila enseña ahora esa fecha
  («14 sep 2026») delante del teléfono, para que se vea por qué va donde va.
- **Registro de apoyos** (José, 18/09: «a partir del 1 de octubre… un registro, que los
  apoyos son los extras que hay que pagarle»). Tocando a un apoyo en Hoy o en Semana, lo
  primero del menú es **«Ajustar apoyo»**: a qué hora entra y a qué hora sale ese día, con
  un botón «hasta el cierre» que pone la hora de cierre del local. El chip de Hoy lo enseña
  («Leo · 19:00–01:00»), el de Semana también, compacto, y en Horas hay un bloque nuevo,
  **Registro de apoyos**: cada apoyo con sus días, en qué bar, de qué hora a qué hora y
  cuántas horas, con aviso en los tramos sin ajustar (cuentan el turno entero del local).
  Las horas son las mismas que cuenta la nómina: las calcula el mismo modelo. En el papel
  del bar no salen nunca. Para el resto de la plantilla el mismo formulario sigue siendo
  «Horario distinto este día», y ya no es un cuadro de texto libre.
- **Guardar tú no cierra la ventana de los demás** (Diego, 18/09). Cuando alguien guardaba
  un cambio en la planilla, a todo el que tuviera un panel abierto —la ficha de un
  empleado, por ejemplo— se le cerraba en las narices. Ahora cada panel dice qué registro
  está mirando: si ese registro llega igual del servidor, el panel se repinta con el estado
  nuevo y el usuario ni se entera; solo se cierra si han tocado justo lo que tiene abierto.
- **El «forzado a mano» que no era** (Diego y Aroa, 18/09). El forzado se estampaba al
  poner a la persona y no se volvía a mirar nunca, así que la planilla seguía avisando de
  un motivo que ya no existía: «puede ser que Lola esté puesta que libra los domingos y
  esta semana libra un miércoles». Ahora la casilla comprueba, cada vez que se pinta, si
  esa persona **sigue** rompiendo alguna regla ahí; si el día libre se movió, el veto se
  quitó o la ficha se corrigió, el aviso desaparece solo. La constancia de que se forzó se
  queda en el historial, que para eso es historial.
- **Y al forzar, qué regla se está incumpliendo** (Diego, 18/09). El selector ya decía el
  motivo («solo Pasarela»); ahora dice además **qué regla** es —Locales donde trabaja,
  Días que libra, Días de partido, «Nunca con»…—, que es lo que se va a corregir en Equipo
  si la equivocada resulta ser la ficha. Lo nombran la fila de «no pueden», el aviso antes
  de forzar, el que salta desde el Mes, el menú de la casilla y el historial.
- **Y la hoja de la semana, más visual** (Diego, 18/09): todas las casillas miden lo mismo
  —se reserva sitio para la más llena de esa semana, calculado de los datos— y el hueco
  entre nombres es idéntico en toda la hoja. Antes las filas bailaban entre 42 y 55 px.
  En una segunda pasada, también los siete días miden lo mismo: el ancho se repartía por
  contenido y mandaban los chips del pie de descansos, así que el lunes se llevaba 192 px y
  el viernes se quedaba en 73, con los nombres largos pegados al borde. Ahora son 132 px
  cada día, y un nombre kilométrico se recorta en su casilla en vez de invadir la de al lado.
- **Fuera el pie de descansos del imprimible de la semana** (Diego, 18/09): «quién libra» y
  «quién de baja» se miran en la app, que es donde se decide; en el papel del bar va la
  rejilla de nombres y nada más. La hoja de cada bar y la del generador sí lo conservan.
  Con el hueco que deja, la rejilla crece hasta la última talla que cabe en el A4 —10,5 px
  en vez de 8,5 en la semana del 14— y los nombres, que ahora se leen de pie desde la barra.
- **Al imprimir, solo los nombres** (José, 18/09, repetido siete veces en la reunión). La
  hoja que Aroa recorta para dejar en cada bar ya no lleva horas, ni «Mañana/Tarde», ni el
  número de posición, ni las marcas ▸ □ P C, ni «por», ni «forzado», ni el mínimo supuesto,
  ni los huecos, ni los turnos cortos en ámbar, ni la leyenda. Solo el local, el día y los
  nombres. Un único interruptor lo decide, para que no se quede ninguna plantilla sin él.
  **No cambian** la hoja de horas (es la de la nómina), la del generador (es con la que se
  repasa antes de volcar) ni el tablón del mes, cuyo contenido entero es la píldora M/T/P.
- **Lupa en el selector de personas** (Diego, 18/09): el popover que abren el `＋` de una
  casilla y el hueco «1·?» —en Semana y en Hoy— lista a las 21 personas de golpe. Ahora se
  busca por nombre, sin tildes ni mayúsculas; los grupos que se quedan sin nadie
  desaparecen y, si no encaja nadie, lo dice.
- **La oficina puede meter a alguien en la lista negra** (Diego, 18/09): «si no acude una
  persona a la entrevista». Es lo único que puede escribir de esa base: el servidor solo le
  acepta nombre, teléfono y motivo, siempre a la lista de alerta, y nunca tocar ni borrar
  lo que ya existe.
- **El contenido de cada entrevista es del jefe** (José, 18/09). Aroa (cuenta `oficina`)
  sigue viendo la lista para lo que la usa —quién es, a qué puesto opta, cómo se le valoró,
  por qué se le descartó y si ya se le entrevistó—, pero no lo que se habló dentro:
  condiciones, sueldo, horarios y observaciones no salen del servidor. El permiso va por
  cuenta, lo da y lo quita José desde Cuenta → Usuarios, y nadie se lo puede dar a sí mismo.
- **Corregido antes de que mordiera**: al recortar la app se dejaba puesta la *versión* de
  la semilla. Si la primera persona en abrir un servidor recién creado era alguien sin
  permiso (la oficina), su navegador marcaba la base como «ya sembrada» sin haber sembrado
  nada, y el jefe no habría recibido nunca las 275 entrevistas. La versión pasa a ir dentro
  del bloque recortable: recortada vale 0 y la siembra sigue pendiente para quien sí las ve.
- **Corregido, y era grave**: la base de entrevistas viajaba dentro de `index.html` —es la
  semilla del primer arranque— y el servidor sirve ese fichero entero a cualquiera con
  sesión. Los 275 teléfonos y las observaciones del grupo estaban en el navegador de **todos
  los empleados**, aunque el estado que recibían sí iba proyectado. Ahora se sirve con ese
  bloque vacío a quien no puede verlo. Lo encontró la batería e2e nueva.
- **Y no se pierde nada**: quien no ve las entrevistas tampoco las sobrescribe. La app manda
  la planilla entera al guardar, así que el primer cambio de turno de Aroa habría borrado el
  trabajo de José; el servidor conserva las suyas.

- **Los puestos son tres: sala, cocina y apoyo.** El «comodín» desaparece como puesto
  (sigue existiendo «sin local fijo», que es otra cosa: quien puede ir a cualquier bar).
  Cada persona queda con el puesto que dictó José. Alta de **Dulce** (apoyo), que de
  momento no abre local mientras sea nueva.
- **Reglas nuevas del grupo**: dos apoyos no pueden quedarse solos en un turno (la
  casilla avisa); **Johan siempre cocina**; la cobertura no propone para sala a quien
  ese día lleva la cocina —el fallo que salió en directo al cubrir a Cris Parreño—; y
  los «nunca coincide» de Lavinia–Mari Luz y Leo–Susana Capón se respetan **si hay
  gente suficiente** y, si no, se relajan dejando el aviso.
- **Día libre puntual**: debajo de «libra», uno o dos días sueltos solo para esa
  semana. A la siguiente vuelve su día de siempre, sin tener que acordarse de nada.
- **El 33 los martes**: se quita el hueco que no correspondía. Es día flojo, se queda
  Noe solo y abre él viniendo de la mañana.
- **La cocina no se imprime**: sigue siendo variable interna, pero en el papel sobraba.
- **La vista Semana enseña nombres** en vez de iniciales.
- **Los iconos de la base del grupo**: sartén (cocinero), bandeja (camarero), pulgar
  arriba (bien), reloj de arena (en espera), pulgar abajo (mal) y **⛔ vetado**, dibujados a mano en la
  misma línea que la sartén de la cocina. Salen en la lista, en los filtros y en la ficha.
  *Los datos de esos iconos no vinieron en la exportación*: Notion no incluye el icono de
  cada ficha ni en el CSV ni en el Markdown, así que las etiquetas están por rellenar
  (ver DISEÑO.md).
- **Y llegan a la instalación que ya estaba en marcha.** La semilla de entrevistas solo
  se sembraba cuando la lista estaba vacía, así que quien ya tenía la app abierta habría
  seguido viendo las fichas de solo nombre y teléfono. Ahora se funden en las que ya
  existen —cruzando por id y, si no, por teléfono— **sin pisar nada de lo que el grupo
  haya escrito en la app**: solo se rellena lo que está en blanco, y una sola vez.
- **Las entrevistas que solo estaban en papel, leídas y volcadas.** El grueso de la base
  de Notion tenía tecleados solo el nombre y el teléfono: la entrevista de verdad era una
  hoja manuscrita escaneada dentro de la ficha. Se han leído las **150 hojas** y está todo
  dentro. La base pasa de 35 a **192 fichas con la entrevista contestada**, y de 41 a
  **117 valoradas** (44 bien, 25 en espera, 39 mal, 9 vetadas) con el motivo que el grupo
  escribió a mano. Dos avisos: el cruce se hizo por el **teléfono escrito en el papel**
  porque hay fichas de Notion con el escaneo de otra persona pegado, y **diez teléfonos
  están tecleados en Notion con un dígito cambiado** —esas fichas lo dicen en
  observaciones para poder corregirlo. Ver DISEÑO.md.
- **Los emoticonos de Notion, comprobados uno a uno.** Leídos por la API los 193 iconos de
  «Archivo de entrevistas»: son exactamente los 41 que ya estaban transcritos de las
  capturas, no había más. Queda pendiente la base «Alerta interna».
- **La entrevista entera de cada candidato**, que estaba en la exportación y no se había
  usado: edad, zona, fecha, la experiencia contada, incorporación, lo que pide de sueldo,
  horarios, condiciones y observaciones, más las siete aptitudes que pregunta el grupo
  —cafetera, cambiar barril, bandeja, cocina, jamón, TPV y PDA— como sí / con dudas / no.
  Se filtra por aptitud y el buscador entra en todo el texto: buscar «Springfield»
  encuentra a quien lo contó en su experiencia.
- **Entrevistas y alerta interna**: dentro están ya las dos bases de Notion de José
  (194 candidatos y 81 en alerta). Dos menús separados, dos etiquetas
  por persona —puesto y valoración (bien / en espera / mal)—, filtros que combinan las
  dos, buscador por nombre o teléfono y ficha para registrar, editar o mover de lista.
- **Vacaciones para la nómina**: columna de días de vacaciones en el contador de horas,
  las fechas en el desglose de cada persona y un botón **«Vacaciones del año»** con
  toda la plantilla mes a mes, exportable a Excel.
- **Dulce en standby**: entra en la plantilla pero el generador no la coloca hasta que
  el grupo confirme sus días libres y sus locales. Se quita con un interruptor en su ficha.
- **La ficha del candidato es ahora un perfil**: al pulsar en alguien se abre su hoja de
  lectura con **todo** lo que trajimos de Notion —foto de color con sus iniciales, las dos
  etiquetas, el teléfono para llamar o abrir WhatsApp de un toque, seis tarjetas de dato
  (edad, zona, fecha de la entrevista, tipología de cocina, incorporación y lo que pide de
  sueldo), las siete aptitudes coloreadas por sí / con dudas / no, y la experiencia, los
  horarios, las condiciones, las observaciones y las notas en bloques—, **cada cosa con su
  icono dibujado a mano**, en el mismo trazo que la sartén y la bandeja. Para tocar algo:
  «Editar», que abre los cajetines de siempre y vuelve al perfil al guardar.
- **Dos cuentas de administrador, con nombre nuevo**: la oficina (Aroa) pasa a llamarse
  **`oficina`** y el jefe (José) se queda con **`admin`** a secas. Las dos con los mismos
  permisos y sin acceso a **Actividad**, que sigue siendo solo del programador. En un
  servidor que ya estaba en marcha se renombran solas al arrancar, conservando contraseña,
  rol y ficha; y si la del jefe no existe, nace (`JEFE_USUARIO` / `JEFE_PASSWORD`).
- **La entrevista pregunta por aperturas y cierres**: una aptitud más, «Aperturas o
  cierres», con su llave y sus tres respuestas (sí / con dudas / no). Es la que más dice de
  quien viene de otro local, y se puede filtrar como las demás: «quién ha hecho aperturas».
- **«El entrevistado busca»**, justo debajo de Horarios: mañanas, tardes, turno partido, fin
  de semana y «no tiene problemas». Se marcan **varias a la vez**; «no tiene problemas» va
  sola, que es lo que significa. Sale también en el perfil y el buscador entra en ello
  (buscar «fin de semana» encuentra a quien lo pidió).
- **Las mismas palabras en todas partes**: en la ficha y en cada persona, **Cocinero/a** y
  **Camarero/a**; en los filtros, que agrupan gente, **Cocineros** y **Camareros**. Antes la
  ficha decía «Cocinero/a» y el filtro «Cocina».
- **Un candidato puede ser camarero y cocinero a la vez** (Aroa: «hay algunos que son
  Camarero Cocinero»). El puesto deja de ser uno solo: en la ficha se pulsan los dos, en la
  lista salen las dos etiquetas y los filtros de Cocina y Sala encuentran a esa persona por
  las dos. Las fichas que ya había se convierten solas al abrir la app.
- **Las barras de Semana y Mes, ordenadas**: el titular pierde cuerpo en pantallas medianas
  —era lo que empujaba a los botones contra el borde— y las acciones bajan siempre a su
  propia fila alineadas a la izquierda. Al envolverse, todas las filas arrancan del mismo
  sitio en vez de quedar sueltas contra el margen derecho. Un test mide la barra a 1280 y a
  1024 y falla si algún botón se pisa con otro, se sale o empieza una fila donde no toca.
- **Las altas llegan a las planillas que ya existían**: la semilla solo se usa en un servidor
  vacío, así que Dulce y Susi no habrían aparecido nunca en el del cliente. Ahora entran al
  arrancar, una sola vez, y sin resucitar a quien se haya borrado a propósito.
- **Susi entra en el equipo, de baja**: cocinera, sin fecha de vuelta, y la cubre Adrián. El
  local (Zapatillera, por quien la cubre) y la fecha en que empezó la baja quedan marcados
  como supuestos, a la espera de confirmarlos.
- **La valoración cierra la ficha del candidato**, después de las notas: es lo que se decide
  al terminar la entrevista, no al empezarla.
- **La ficha empieza por lo que se pregunta primero**: fecha, nombre, teléfono, edad, zona y
  **documentación en regla** (Sí / No / En trámite, de tres botones).
  La **fecha se pone sola** con la del día en que se registra a alguien, y es también la
  primera tarjeta del perfil; como se rellena sola, no cuenta por sí misma como «entrevista
  contestada». El resto de la entrevista —experiencia, horarios, condiciones…— va debajo.
- **El lunes de Pasarela, como lo contó Aroa**: Mari Luz no hace partido los lunes; hace la
  **tarde entera, de 16:00 a cierre**, así que esa mañana no puede trabajar. La mañana se
  queda con Lola y Tere —falta uno— y la tarde con Mari Luz —falta otro—; los dos los
  taparía una misma persona haciendo el partido, y Aroa apunta a Dulce «a lo mejor», a ver
  cómo entra. La planilla enseña los dos huecos en vez de rellenarlos con quien no toca.
- **Vetos por día**: «no hace mañanas en Pasarela» pasa a poder ser «no hace mañanas en
  Pasarela **los lunes**». Es lo que hace falta para el caso de Mari Luz, y el generador,
  la cobertura, el catálogo de condiciones y la exportación al núcleo lo respetan igual.
- **Tere es apoyo** (confirmado por Aroa; era la última persona con el puesto pendiente).
- **Los permisos se cambian desde la app**: en Cuenta → usuarios, cada cuenta lleva un
  selector para subirla a administrador o bajarla a empleado —al bajarla se le pide su
  ficha de la planilla, porque si no entraría y no vería nada suyo—. Nadie puede cambiarse
  el suyo ni dejar el grupo sin administrador o sin programador, las cuentas de programador
  solo las toca el programador, y a quien cambia de rol se le cierra la sesión para que
  vuelva a entrar ya con lo que le toca. Antes esto solo se podía hacer con una variable
  del servidor (`ADMIN_PROMOTE`) y únicamente hacia arriba.
- **Dos arreglos de estilo que venían de serie**: la sección de Entrevistas usaba dos
  variables de color que no existían (`--line`, `--bg2`), así que sus tarjetas salían sin
  borde ni fondo; y el pie de la ficha llevaba `btn-cta`/`btn-sec` sin la clase base `btn`,
  que es la que pone el tamaño. Hay dos tests nuevos para que no vuelva a pasar en toda la app.
- **Pasada de móvil** en 320, 360, 375, 390, 430 y tablet en vertical: ninguna pantalla
  desborda ni tiene botones por debajo de lo que pilla un dedo, el buscador de Entrevistas
  y «Registrar» van en una fila, los filtros en una tira que se desliza, las etiquetas de
  cada candidato bajan a su línea, la tabla de vacaciones deja el nombre fijo al deslizar
  los meses y los campos no hacen zoom al enfocarlos en el iPhone.

## v0.5.0 · 15/09/2026 — Lo que pidió el cliente en la reunión del 15/09

- **Pasada de interfaz**: el menú superior encoge la letra por tramos para que las nueve
  pestañas entren sin arrastrar y sin comerse el logo (los `@media` estaban escritos
  antes de la regla base y nunca se aplicaban); los botones de la barra de Semana y Mes
  van todos juntos a la derecha en vez de partirse en dos filas a lados distintos; al
  desplazar de lado se quedan a la vista la persona, el nombre del local y la franja (y
  su fondo ya es opaco: el tinte de la fila dejaba ver por debajo las casillas del otro
  lado); y la cocina se marca con una **sartén** en vez del rombo, en la app y en las
  hojas impresas.
- **Vista previa del cambio** al confirmar una cobertura, como en el piloto de urología:
  una rejilla de persona × día con quién sale (tachado, en rojo), quién entra (en verde)
  y qué queda sin cubrir, con «Cancelar» y «Confirmar y aplicar». Nada se toca hasta
  confirmar.
- Arreglado: al cerrarse dos capas a la vez la app retrocedía dos veces en el historial y
  cambiaba de pestaña sola.

- **Arreglado: la app abría en una fecha vieja.** Guardaba el día que estabas mirando y
  lo restauraba para siempre, así que quien un día retrocedió a agosto abría la app en
  «1 de agosto» todas las mañanas, con la planilla vacía y ocho avisos. Ahora abre
  siempre en hoy y solo vuelve a donde estabas si lo dejaste ese mismo día. Además, Hoy,
  Semana y Mes avisan en ámbar cuando lo que hay en pantalla no es hoy («hace 2 meses»,
  «dentro de 12 días») y el botón «Hoy» resalta.

- **Horarios reales del grupo** (WhatsApp de la encargada): mañana de 07:00 a 16:00, los
  fines de semana desde las 08:00, y tarde de 16:00 hasta el cierre, «sobre las 00:00,
  aunque depende» (queda marcado como aproximado). Ya no son horarios supuestos.
- **El turno partido deja de contar como dos jornadas enteras**: se cuentan los dos tramos
  del local (12:00–16:00 y 20:00–00:00 de fábrica, editables y marcados como supuestos),
  salvo en la franja que la persona **abre**, que hace entera, y salvo horario puesto a
  mano en la casilla. Adrián pasa de 358 h a 200 h en septiembre: cifras de un mes, no de
  un año. El contador de horas explica arriba con qué horarios cuenta.
- **Ocho horas por turno**, como dice el cliente: el local abre nueve horas por la mañana
  (07:00–16:00), pero cada persona hace su turno de 8 h, así que la app separa lo que
  **abre el local** de lo que **cuenta el turno**. Un **turno continuo** —la misma persona
  abre la mañana y la tarde del mismo local— es un turno seguido y se cuenta una vez, no
  dos. Con eso el equipo sale a 8 h por día trabajado, salvo quien abre una franja (la hace
  entera) y además hace el otro tramo del partido: Victoria 9,3 h y Mari Luz 8,6 h de media
  al día. Las horas que cuenta un turno se cambian por local y franja en Equipo → Ajustes de
  los locales, y van marcadas como supuestas hasta que el cliente confirme el «más o menos».
- **El turno partido reparte esas ocho horas** (cliente, 16/09: «4 y 4 o 5 y 3 […] entre
  semana es 5 y 3 y el finde 4 y 4»). De fábrica: 11:00–16:00 y 21:00–00:00 de lunes a
  viernes, 12:00–16:00 y 20:00–00:00 el fin de semana, con su propia fila por día en
  Ajustes de los locales. **Quien abre una franja** entra a la hora de apertura y hace el
  tramo largo de los dos, así que también le salen ocho horas: Mari Luz, que abre la tarde
  de Pasarela en partido, hace 16:00–21:00 y 13:00–16:00 en vez de doce horas. Ahora un día
  trabajado son ocho horas para todo el equipo, haga turno suelto, partido o continuo.
- Las planillas ya guardadas se migran al cargarlas: solo se sustituyen los horarios que
  seguían siendo los supuestos de fábrica; lo que el encargado tocó a mano no se pisa.

- **Cobertura como en el papel**: desde Semana, Hoy o Mes, sobre la persona que va
  a faltar, «Falta estos días…» abre la hoja de cobertura con ella y el día ya
  marcados; una tira de dos semanas enseña sus turnos (M / T◆, en el color del
  local; libra / sin turno) y se marcan los días con un toque; «Buscar quién cubre»
  propone el plan A y el plan B **día a día: quién sale → quién entra** (con ABRE,
  ◆ cocina, avisos) o el hueco que queda y por qué; «Confirmar plan A» lo aplica y
  vuelve a la planilla con los cambios a la vista. La pestaña Cobertura es la
  misma hoja con la plantilla en avatares. Días sueltos se registran como
  ausencias por tramos.
- **Pasarela: quien hace partido puede abrir la tarde** (audio de la reunión: con
  Iván libre, la tarde del lunes la hace Mari Luz en partido y no hace falta un
  hueco de cobertura entera). Interruptor por local en Ajustes de los locales →
  «Quién abre»; condición nueva en el catálogo; El 33 sigue sin permitirlo (José
  da el martes por insalvable). La semana del prototipo pasa de dos huecos a uno.
- **«Volcar a la planilla»**: el botón del generador semanal dice lo que hace y,
  cuando no hay nada nuevo, «Ya está volcada en la planilla»; la hoja impresa de la
  planilla propuesta también lleva el botón de volcar.
- **Visible para el equipo**: en Semana y Mes, un botón por mes con el estado (el
  mes en curso y los pasados siempre visibles; los siguientes se hacen visibles
  cuando la planilla está lista y entonces les llega a los trabajadores; se puede
  volver a ocultar). Queda en el historial como publicación.
- **Actividad** (pestaña nueva, solo para el programador; en «Más» del móvil):
  qué está haciendo el encargado con la app, como un historial. Una sola línea de
  tiempo agrupada por días (Hoy / Ayer / fecha) que fusiona el historial de la
  planilla (quién hizo cada cambio) con la auditoría del servidor traducida al
  español: inicios de sesión, accesos fallidos y bloqueos, guardados de la planilla
  con su versión, copias, altas, bajas y reset de usuarios, contraseñas, peticiones,
  núcleo… con la IP en cada fila. Tarjetas resumen (último acceso del encargado,
  último guardado y quién, cambios de hoy, últimos 7 días, accesos fallidos),
  filtros por usuario y por tipo (Accesos, Planilla, Usuarios, Peticiones, Otros),
  buscador, «Actualizar», aviso si el encargado aún no ha entrado y «Mostrar más»
  a partir de 300 filas. Sin servidor enseña solo el historial de esta planilla.
  El encargado y los empleados no ven la pestaña (`body.rol-programador`).
  `tests/actividad.test.mjs`; baterías e2e del servidor y de la app ampliadas.

## v0.4.0 · 15/09/2026 — Gestor de cobertura, vaciar semana o mes, quitar el aviso del partido

- **Gestor de cobertura** (pestaña Cobertura, y en «Más» del móvil): el encargado
  dice quién va a faltar (baja, vacaciones, día libre, permiso, otro motivo o un
  cambio de turno), en qué días y en qué franja, y la app propone el **plan A**
  (recomendado) y el **plan B** (otras personas, o relajando lo relajable con
  aviso) para cubrir cada turno afectado con las fichas y las reglas del grupo:
  «cubre a» manda, luego comodines y apoyos que libren ese día, el local habitual,
  la cocina si hace falta, quien pueda abrir si la persona abría, y quien menos
  turnos lleve esa semana. Cada propuesta explica por qué; lo que nadie puede
  ocupar queda como hueco con el porqué (o «no hace falta nadie» si la casilla
  sigue completa). Aplicar registra la ausencia en la ficha, quita a la persona de
  esos turnos y pone a quien cubre con «por X»; Ctrl+Z lo deshace. En un cambio de
  turno puede proponer un **intercambio**: a cambio, la persona hace un turno
  cercano de quien le cubre. Desde la hoja de persona del Mes: «Buscar quién cubre
  este día…».
- **Vaciar la semana / vaciar el mes** en Semana y Mes: quita todas las plazas
  (también las puestas a mano) respetando bajas, vacaciones y demás ausencias, que
  siguen en las fichas; eventos, cierres y aperturas se quedan. Con confirmación,
  deshacer e historial.
- **Quitar el aviso del partido**: al pulsar el chip del evento en Hoy o el ⚽ de
  las cabeceras de Semana y Mes se abre el detalle con «Quitar el evento», «Ir al
  día» y «Otro evento ese día».
- Modelo: `TIPOS_INCIDENCIA`, `turnosAfectados`, `candidatosCobertura`,
  `planesCobertura`, `aplicarCobertura`, `vaciarPlanilla` (9 tests nuevos);
  `tests/cobertura.test.mjs`; batería e2e de la app ampliada.

## v0.3.0 · 15/09/2026 — Generador semanal con las condiciones del cliente

Sale del prototipo que pasó el cliente (planilla corregida del 14 al 20 de
septiembre, 11/09): el generador que el grupo quiere es el **semanal**, y su
resultado tiene que verse así.

- **Reglas nuevas** (30–32 del prototipo): el primero de cada franja hace turno
  completo (quien viene de la mañana no abre la tarde, salvo turno continuo, que
  se marca C); Cristian no hace la tarde completa; Leo nunca sale el primero.
  La cocina conserva su posición y solo abre si nadie más puede.
- **Posiciones en toda la app**: 1.º abre, ▸ sale el primero (fijo), ◆ cocina,
  P partido, C continuo, □ comodín, «por X» y notas, y **hueco disponible** en la
  1.ª posición cuando nadie de la plantilla puede abrir (Hoy, Semana, impresión).
- **Generador semanal** (pestaña Generador, modo Semana): planilla por local con
  la cuenta n/mín*, posiciones, huecos con motivo y por qué nadie puede, «qué ha
  cambiado» respecto a lo que había, quién libra cada día, las condiciones
  comprobadas (✓/✗, las nuevas marcadas), aplicar con deshacer e impresión de la
  planilla propuesta en dos páginas. El modo «Periodo libre» sigue para el mes.
- **Equipo modificable con interruptores**: reglas del grupo activables o
  desactivables, cada característica de una ficha se puede apagar (el generador
  deja de tenerla en cuenta), campo «no sale nunca el primero» y catálogo
  numerado de condiciones derivado de locales y fichas.
- **Semana tipo y fichas actualizadas** a la planilla corregida del 11/09; un
  test reproduce esa semana casilla a casilla (huecos incluidos).

## v0.2.0 · 15/09/2026 — Listo para desplegar: mes de demostración, e2e, compartir por WhatsApp

- **Primer arranque con contenido**: en un servidor recién creado (y con `?demo=1`
  en local) la planilla nace con el mes en curso y el siguiente generados con la
  semana tipo y un partido de muestra el próximo sábado (`sembrarDemo` en el
  modelo, con test). Se puede vaciar desde el Generador.
- **Compartir semana** por WhatsApp: botón en Semana (y en cada local de Hoy) que
  genera una imagen PNG nítida de la planilla, general o por local, y abre la hoja
  de compartir del móvil; en escritorio la descarga.
- **Baterías e2e en el repo** (`tests/e2e-app.mjs`, `tests/e2e-servidor.mjs`,
  `tests/e2e-compartir.mjs`): las siete vistas, selector, eventos, generador,
  impresión, móvil, y el modo servidor real (acceso del programador, persistencia,
  sincronización entre pestañas, modo empleado). `npm run test:e2e`; el CI ya no
  las ignora si fallan.
- **Despliegue**: `tools/comprobar-despliegue.mjs URL` verifica desde fuera un
  despliegue (salud, volumen, acceso servido sin sesión, API cerrada, versión,
  cabeceras); `.env.example` y checklist del despliegue en `DEPLOY-SERVIDOR.md`.
- **Pasada visual**: tema oscuro en todas las vistas, móvil (Mes con los botones de
  fútbol en fila, Equipo, Horas, Generador), vista del empleado con la navegación
  de mes corregida, y las cuatro hojas imprimibles.

## v0.1.2 · 14/09/2026 — Logo del grupo, sección Entrevistas visual y acceso del programador

- Pie de la pantalla de acceso: «© 2026 Shiftia» y «coded by Highkey Labs»; el nombre
  del grupo va solo en el subtítulo con sus locales. Test en `tests/login.test.mjs`.

- **Logo del Grupo Pasarela** en SVG (`assets/pasarela-logo.svg`), hecho a imitación
  del original: cuadrado gris, rombo y «Grupo Pasarela» en caligrafía convertida a
  trazados (no depende de fuentes). El build lo embebe en la barra superior, la
  pantalla de acceso y las hojas impresas; si se sube el PNG original
  (`assets/pasarela-logo.png`) manda sobre el SVG. La barra muestra el logo en vez
  del texto cuando existe.
- **Entrevistas** más visual: cabecera con el motivo del rombo, pasos (sección
  creada → importar la base de datos → funciones), y vista previa con datos de
  muestra de candidaturas, entrevistas de la semana y decisiones.
- **Acceso del programador**: sin `PROGRAMADOR_PASSWORD`, el usuario `diego` nace con
  la contraseña provisional `12345678` y sin cambio obligatorio (la cambia desde
  Cuenta). El encargado (`admin`) sigue con la genérica y cambio obligatorio.
  Test nuevo en `tests/server.test.mjs`.

## v0.1.1 · 14/09/2026 — Sección «Entrevistas» (en construcción)

- Nueva pestaña **Entrevistas** en el panel del administrador (y en «Más» del
  móvil), visible y marcada «en construcción»: ahí se importará más adelante la
  base de datos de entrevistas y sus funciones. El empleado no la ve. Test en
  `tests/entrevistas.test.mjs`.

## v0.1.0 · 14/09/2026 — Primera entrega

Nace la app del Grupo Pasarela sobre la arquitectura y el estilo del piloto de
Shiftia (Urología), sin tocar ninguno de los dos repositorios de referencia.

- **Modelo de dominio** (`modelo.js`, tests en `modelo.test.js`): cuatro locales
  con dos franjas, casillas ordenadas (quien abre, cocina en su posición),
  partidos y dobles, mínimos por día con marca «supuesto», cocina obligatoria o
  habitual, «nunca con», «cubre a», vetos, contratos, ausencias, eventos con
  refuerzo, semana tipo del PDF (satisface todos los mínimos y las 29
  condiciones), `puedeEstar` con reglas duras y blandas forzables, revisión del
  mes, generador aditivo y determinista con razones y huecos explicados, horas
  del mes (nocturnas, domingos, festivos, extras, saldo frente a contrato,
  desglose por local), exportador e importador del núcleo Shiftia (CP-SAT),
  fusión de estados concurrentes.
- **Interfaz**: Hoy, Semana (con pie de descansos y «guardar como semana tipo»),
  Mes (píldoras por local, ausencias, fila de control, botones Juega el
  Barcelona / Madrid / Elche), Equipo (fichas con todas las condiciones
  editables, altas y bajas, ajustes de los locales), Contador de horas (horas
  extra, cierre de mes, Excel e impresión), Generador (motor local o núcleo,
  vista previa, aplicar, vaciar lo generado), revisión del mes, historial,
  deshacer, cuenta, copia de seguridad, tema claro y oscuro, PWA, móvil con
  barra inferior, modo empleado.
- **Servidor** (`server.js`, sin dependencias): SQLite, roles programador /
  admin / empleado, cuentas iniciales `admin` y `diego`, versionado optimista,
  SSE, copias diarias, proxy al núcleo (`/api/nucleo/*`) con cupo y auditoría.
  Tests de API y de seguridad en `tests/`.
- **Documentación**: README, ARQUITECTURA, DISEÑO (decisiones, supuestos y
  preguntas abiertas C1–C29), DEPLOY-SERVIDOR.
