# Changelog — Shiftia · Grupo Pasarela

## v0.6.0 · 17/09/2026 — Reunión con José y Aroa, y la base de entrevistas

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
