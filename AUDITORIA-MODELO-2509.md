# Auditoría de modelo.js (commit 488b8d1) — 25/09/2026

Ocho lentes independientes sobre el modelo entero (8 altos, 41 medios, 34 bajos en total; varios repetidos entre lentes) (fechas y lectura, cierres, puerta y casilla, semana tipo y puntuación, generador, cobertura, horas/núcleo/estado, e invariantes con escenarios aleatorios). Cada hallazgo lleva un script reproducible en `scratchpad/auditoria-modelo/<lente>/`. Los ocho altos los he vuelto a ejecutar yo: todos se reproducen. Nada del repo se ha tocado.

## ALTOS (resultado incorrecto que ve el encargado, o datos que se pierden)

| # | Dónde | Qué pasa | Cómo se llega | Arreglo |
|---|---|---|---|---|
| A1 | `quitarDiaDeAusencia` 987 | Una baja SIN fecha de fin se trata como de un solo día: quitar un día posterior no hace nada (pero apunta historial); quitar el primer día BORRA la baja entera (Laura, Maydeth, Susi) | Mes → «Quitar la ausencia de este día» (17-vista-mes.js:174) | Partir la baja dejando la cola abierta |
| B1 | `aplicarCierre` 648/688, `reabrirCierreDesde` 815 | Editar un cierre creado antes de generar la semana, con la semana ya generada, pierde las decisiones de quien salía de la semana tipo (VAC quitadas y no repuestas, SIN y apoyo desaparecen) | Visor: editar o acortar un cierre | Conservar `deSemanaTipo` previo ∩ días cerrados y leer ahí la semana tipo |
| B2 | `desasignar` 2294 (+ `vaciarPlanilla` 4306) | Si el día se queda vacío borra `est.asig[iso]`; en un estado virtual de rango (el que usan Cobertura, Equipo, ficha y cierre para escribir) el día se desengancha del mes y lo que se escribe después NO llega a `S.meses` | Quitar cierre / editar cierre / cobertura / cubrirAusencia / moverDiaLibre cuando X era la única plaza del día | `desasignar` deja `{}` (no borra el día) |
| C1 | `ponerPlanCobertura` 4211 → `desasignar` | El cambio de turno de la Cobertura vuelve a crear la marca «abre a mano» sin nadie que abra (usa `desasignar` en vez de `retirarEntrada`); Hoy/Semana dicen que abre uno, Mes/Excel/Horas/app del empleado dicen nadie. La migración que lo limpia corre una sola vez | Cobertura → cambio de turno con intercambio | `retirarEntrada`, y red de seguridad en `normalizarCasilla` (marca huérfana = inexistente) |
| D1 | `patronDesdeSemana` 2591-2650 | «Guardar como semana tipo» en una semana con un cierre por fechas pierde para siempre las plazas del local cerrado (SIN/apoyo sin ausencia) y guarda al apoyo como plaza fija de otro local | Semana → guardar como semana tipo (justo la semana del Mónaco) | No guardar origen 'cierre'; reponer `plazasDe` en casillas con `cierreEn`; la confirmación nombra el cierre |
| G1 | `tramoPartidoDe` 4322 | Partido con excepción de horario de un solo día y una sola franja (lo que deja Ajustes al rellenar solo la mañana del sábado): la otra franja cae al horario entero → 12 h en vez de 8 en Horas y en la app del empleado | Equipo → Ajustes del local → tramo del partido por día | `base[franja] \|\| hp[franja]` |
| H2 | `normalizarCasilla` 2152, `generarPlanilla` 3316, `volcarPrevia` 3185 | La marca `abre` guardada (la que leen Mes, Excel, perfil del empleado y el tramo de Horas) queda desfasada respecto a `primeroDe` (Hoy) cuando el generador pone a la persona en una mañana DESPUÉS de haber normalizado su tarde; nadie vuelve a normalizar (el «eco» solo existe para la cocina) y el volcado siguiente lo detecta pero no lo corrige. Mismo síntoma que el CHANGELOG da por arreglado (Hoy 16:00 / app 21:00), ahora producido por el propio generador. 297 escenarios de 1.700 | Generar sin semana tipo; tras cobertura, cubrirAusencia o día libre (con la semana tipo de octubre: 0 casos) | Renormalizar las otras casillas del día de esa persona al asignar (como el eco de la cocina) y `refrescarCasillas` al final de `generarPlanilla`/`volcarPrevia` |
| H3 | `normalizarCasilla` (elección de cocina), `salaFirmeDelDia` 1680 | La misma persona queda de COCINA en una franja y de SALA en la otra del mismo local (S34, Aroa 17/09: «quien lleva la cocina no refuerza la sala»); la puerta lo frena al entrar pero la cocina se decide después; la propia condición del Generador sale ✗ | Semana tipo con Hojan librando otro día (dos «c» chocan), y «Generar la semana» (Noe y Jenny el jueves 8/10) | Excluir de la cocina a quien ese día está de sala en otra casilla si hay otro candidato; pasada final por día |

## MEDIOS (incoherencias que confunden o casos reales)

**Cobertura y «cubre a»**
- F1 Cobertura sin «solo desde hoy»: mete gente en días ya trabajados (Equipo sí lo respeta). `planesCobertura`/`aplicarCobertura`.
- F2 `intercambioPara` no mira lo que pierde la casilla del cubridor (cocina, quien abre, solo apoyos).
- F3 «cubre a» y el partido autorizado (D1) se aplican a un CAMBIO de turno, donde X no falta; al aplicar, la autorización desaparece y queda «por X» sin designación.
- F4 Lo que puso la Cobertura sin designación (mínimo, plan con avisos) no se retira cuando X vuelve; el comentario 3139 lo promete.
- C2 El relleno pone DOS «por X» en la misma casilla y autoriza el partido a las dos (D3 dice «para llegar al mínimo»).

**Casilla y marcas**
- C3 `marcarCocina` no recalcula quién abre: `e.abre` guardado (Mes/Excel/Horas/tramo del empleado) ≠ `primeroDe` (Hoy/Semana).
- C4 Casilla cerrada a mano con gente: `puedePrimero`/`ordenCompleto`/`posicionesDe` no usan `plazaOcupa` (la puerta sí).
- C5 = E3 `ordenarCasilla` cuenta el hueco de 1.ª como persona para «cocina en 3.ª con 3 o más» y `verificarSemana` no: la misma casilla bien en la planilla y ✗ en el Generador.
- B3 Al retirar por cierre se borran las marcas a mano (sale primero, cocina, orden) y al reabrir no vuelven.
- G3 `turnoDelDia` no filtra por `plazaOcupa`: casilla cerrada ese día con alguien → Horas 8 h y Hoy tramo de 4 h.

**Cierres**
- B4 `estabaEnCierre` lee la semana tipo cruda y `afectadosPorCierre` con el día libre de la semana: quien libra puntual el día cerrado recibe «sin trabajo» implícito sin salir en el visor.
- B5 El visor (12-cierre-local.js:120,234,258) dice «no se le pone vacaciones: cuenta como sin trabajo» y el modelo SÍ pone vacaciones de media jornada.
- B6 `sugerenciasRefuerzo` no admite `pendientes`: al editar, quien no pudo volver no tiene destinos.

**Generador y condiciones**
- H4 Regenerar no retira lo automático que ahora rompe standby, franjas, locales, vetos ni «nunca con» estricto (`motivoRetirada` solo mira cerrado/cierre/libra/ausencia/por). DISEÑO.md:61 y el principio 4 dicen que sí; el CHANGELOG solo habla del día libre: los documentos se contradicen. 395 escenarios.
- H5 El apoyo de un cierre se pone (y el visor lo sugiere) sin la regla «quien lleva la cocina no refuerza la sala» (la puerta se llama sin `puesto`).
- H6 La semana tipo, el volcado y el plan de cobertura asignan sin `puesto`: ponen de sala a quien «solo hace cocina».
- E1 La condición de cada veto comprueba TODOS los vetos de la persona: con dos vetos, si uno se rompe los dos salen en rojo.
- E2 `moverDiaLibre` con `dias=[]` («todo vuelve a su sitio») pierde el relevo «cubre a» y la cobertura por designación.
- E4 Vacaciones/permiso/día libre/otro no salen en ningún sitio del resumen de la semana generada (solo bajas).
- E5 Hueco «nadie puede abrir»: «Con aviso» ofrece a quien tampoco puede abrir y calla a quien sí.
- E6 Lo relajado con aviso por el propio generador (partido no declarado, pareja flexible) sale como condición ROTA y la app dice «lo puesto a mano no se toca».
- D2 = E9 `candidatosConAviso` sin `meses`: en semana que cruza de mes el Generador ordena distinto que el selector y guarda una carga falsa.
- D3 «Sale primero» a mano se guarda en la semana tipo como «a» pero al volver no manda y en el segundo guardado desaparece.
- D4 «Dos apoyos no se quedan solos» no se mira para el puesto de cocina (latente: ningún apoyo lleva cocina hoy).
- C6 Cuando libra, el partido no declarado desaparece de «forzar»/avisos/Revisión aunque la doc prometa «todas las reglas» (decidir).

**Fechas y ausencias**
- A2 `anadirAusencia` no funde bajas abiertas (se apilan); una que engloba deja la pequeña dentro.
- A3 Textos del libre puntual cuando el cambio incluye el habitual: «libra el viernes (en vez de los miércoles)» aunque el miércoles también libra.
- A4 `motivoCerrado` con casilla cerrada a mano dice «no abre la tarde el lunes» (y sí abre los lunes). La UI no escribe ese estado hoy.
- A5 = G15 Principio 3 (reloj): `fechaCandidato`, `ordenarCandidatos`, `primerDiaPlanificable`, `mesVisibleParaPersonal`, `sembrarDemo` miran el reloj si no se les pasa la fecha, y la app lo hace (24-entrevistas.js).

**Horas y estado compartido**
- G2 Mañana de un turno continuo con horas a mano suma 0 (DISEÑO dice que lo a mano manda).
- G7 `esMediaJornada`: ausencia en una franja en la que la persona NO trabaja cuenta 0,5 de vacaciones y descuenta contrato.
- G9 Tramo con `ini === fin` (Ajustar apoyo 16:00–16:00) paga 24 h y 8 nocturnas.
- G4 El Núcleo (`desdeSolucion`) deja una casilla solo con apoyos sin aviso ni hueco (no pasa `apoyos: true`).
- G5 El empleado no recibe `reglas`: su app evalúa con todo encendido («libra los lunes» cuando Libra está apagada).
- G6 El empleado no recibe `retirados` de los cierres: no ve «sin trabajo» ni le cuentan esos días.
- G10 El empleado recibe `ini/fin` (lo que se paga a los apoyos) y `razon` con la carga de los compañeros.
- G8 `huellaPlanilla` (app) sin reglas/equipos/mesesPublicados: `planCaducado` no ve apagar Mínimos/Cocina; `CLAVES_PLANILLA` ya no la lee nadie.

## BAJOS (34; limpieza, casos con datos de fuera, cosmético)
A6-A12, B7-B12, C7-C12, D5-D8, E7-E11, F5-F9, G11-G16, H10 (`clonarEstado` comparte `days`/`festivos`). Lista completa en `scratchpad/auditoria-modelo/informes/*.md`. Destacan: `rangoIso` con fecha inválida entra en bucle infinito (A10); la semilla de cocina de locales y fichas no cuadra y `migrarCocinaLocales` cambia la semilla al cargarla (G12); `validarCierre` acepta 30/02 (B8); `sugerirUsuario` puede devolver un usuario que el servidor rechaza (G14).

## Plan de arreglo propuesto (por fases, test primero, sin subir hasta el final)

1. **Casilla y marcas** (raíz de H2, C1, C3, H3, B3, C4, G3, C5): un solo sitio que decide abre/cocina/orden y lo vuelve a decidir cuando cambia algo del día (eco para abre como ya existe para la cocina); `desasignar` no borra el día (B2/H1) y limpia sus marcas; `marcarCocina` renormaliza; `plazaOcupa` en `puedePrimero`/`ordenCompleto`/`posicionesDe`/`turnoDelDia`; `retirarEntrada` en el intercambio; el hueco no cuenta como persona; el que está de sala en la otra franja no lleva la cocina.
2. **Ausencias** (A1, A2, A8, G7): partir bajas abiertas; fundir; comparador total; media jornada solo en franjas propias.
3. **Cierres** (B1, B4, B5, B6, H5, D1): editar conserva lo de la semana tipo; una sola lectura de «quién estaba»; textos del visor; `pendientes` en sugerencias; `puesto: 'sala'` en el apoyo; `patronDesdeSemana` respeta el cierre.
4. **Generador y retirada** (H4, H6, E1, E2, E4, E5, E6, D2/E9, D3, C2): `motivoRetirada` por la puerta (con la lista de reglas duras acordada); `puesto` en la semana tipo; veto concreto; relevo tras quitar el cambio de día; ausentes en el resumen; `primero`/`meses` en `candidatosConAviso`; un solo «por X».
5. **Cobertura** (F1, F2, F3, F4): «solo desde hoy»; intercambio revisado; CAMBIO sin designación; retirar lo de la cobertura cuando X vuelve.
6. **Horas y empleado** (G1, G2, G9, G4, G5, G6, G10, G8): tramo del partido por franja; continuo a mano; `ini===fin`; núcleo con `apoyos:true`; proyección del empleado con `reglas` y `retirados` propios y sin `ini/fin/razon` ajenos; huella con reglas.
7. **Bajos baratos** y documentación (DISEÑO/decisiones sobre «regla dura» y C6).

Cada fase: pruebas en rojo (los scripts de los revisores se convierten en pruebas del repo), arreglo mínimo, `npm test` + e2e, revisión independiente; y al final una segunda pasada del fuzz (lente H) sobre el resultado.

## Decisiones que necesito de Diego antes de arreglar
- H4/P4: ¿qué reglas son «duras» para retirar lo automático al regenerar? Propongo: cerrado, cierre, libra, ausencia, standby, locales, franjas, vetos, «nunca con» estricto (las forzables siguen forzables a mano; solo se retira lo AUTOMÁTICO).
- C6: al forzar a quien libra, ¿se enseña también el partido no declarado (todas las reglas) o solo el día libre? Propongo: todas, como promete el diálogo.
- F3: un CAMBIO de turno no es una falta: ¿«cubre a» y su partido autorizado no se aplican? Propongo: no se aplican (D1 dice «solo mientras X falta»).

## Lo que sale bien (resumen)
Fechas idénticas en 5 zonas horarias y con DST; puerta coherente en 10 752 evaluaciones (corto = largo, `puedeEstar` = `primerBloqueo`); `crearContexto` sin caché rancia; generador determinista, sin mutar cfg/staff, idempotente al regenerar, sin poner a nadie en cerrado/ausente/libra/standby/vetado/dos locales/«nunca con» estricto; D1-D5, D7, D9-D13 cumplidos en sus caminos; migraciones idempotentes; cobertura de Iván (relevo, mínimo, domingo) bien; Horas con medianoche, partido, continuo y medias jornadas; núcleo determinista y por la puerta; fusión y 426 bien; empleado sin fichas ajenas.
