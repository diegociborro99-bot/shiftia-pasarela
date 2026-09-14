# Diseño y decisiones — Shiftia · Grupo Pasarela

Este documento recoge lo que se decidió antes de escribir código (el
cuestionario del 14/09/2026 y las respuestas de Diego), lo que se asumió a
falta de dato, y las preguntas que siguen abiertas para el grupo.

## Decisiones tomadas (respuestas del 14/09)

| # | Pregunta | Decisión |
|---|---|---|
| B1 | Menú | Seis pestañas: **Hoy · Semana · Mes · Equipo · Horas · Generador**. Además hay botones «Generar» en Semana y Mes que abren el generador con ese periodo. |
| B2 | Repositorio | Repositorio nuevo `shiftia-pasarela`, patrón del piloto; los dos repos existentes no se tocan. |
| B3 | Servidor | Con servidor desde el primer despliegue: cuenta de **admin** (el encargado, cliente) y cuenta de **programador** (Diego). Empleados preparados (rol y proyección del estado) para la fase 3. |
| B4 | Alcance | Fase 1 del PDF + contador de horas + botones de fútbol, con ausencias simples (baja, vacaciones, día libre, permiso). |
| B5 | Generador | Generador propio: JavaScript determinista en el navegador, partiendo de la semana tipo editable precargada del PDF; **inteligente y potente**: razones por plaza, huecos explicados, candidatos con aviso, y opción de núcleo CP-SAT vía servidor. |
| B6 | Simulador del PDF | No existe: se construía con shiftia-core y las variables del PDF. La semana tipo y las reglas se han reconstruido del PDF y verificadas con tests. |
| B7 | Logo | Shiftia en la barra superior con el logo del Grupo Pasarela al lado en pequeño (mientras no llegue el original, un SVG hecho a imitación; `assets/pasarela-logo.png` manda cuando se suba) y «coded by Highkey Labs» en el pie. |
| B8 | Horas | Turnos × horario por local y franja (editable, marcado «supuesto» hasta que el grupo lo confirme), ajustes a mano por casilla y horas extra aparte. |
| B9 | Fútbol | Diálogo de refuerzo por local (tarde por defecto, con el último valor recordado por equipo) y «proponer quién viene». |
| B10 | Planilla actual | No la tienen: solo el PDF. Vistas e impresión siguen la estructura del piloto y el cuadrante 8 filas × 7 días. |

## Cómo se aplican las reglas

- **Duras** (nunca las rompe el generador; a mano solo con «forzar» y motivo, salvo cierres, ausencias y estar dos veces en la misma casilla, que no se pueden forzar): cierres de cada local por día, ausencias, franja que no trabaja, vetos local + franja, días que libra, «nunca con», cocina obligatoria en el Mónaco.
- **Blandas** (avisan): no es su local habitual, partido no declarado, día que evita, más turnos que su contrato, cocina de reserva en vez de titular.
- **Mínimos**: los del PDF; los que llevaban asterisco se marcan **supuesto** y se ven así en toda la app. Un evento con refuerzo sube el mínimo de esas casillas ese día.
- **Posición de la cocina** por local y franja (2.ª en El 33 y Mónaco; 3.ª en Zapatillera mañana con tres o más, 2.ª por la tarde; 1.ª el mañana de Pasarela); **quien abre** va el primero y se marca «ABRE».
- **Partido** = la misma persona mañana y tarde el mismo día; **dobla** = en dos locales distintos (Jenny el domingo).
- **Ausencias**: al marcar una, sus turnos de esos días salen de la planilla y quedan como huecos; el generador los propone («cubre a» primero, luego cualquier candidato con reglas, y si nadie, hueco explicado).
- **Horas**: un partido suma las dos franjas, cada una con el horario del local; descanso dentro del turno por local (a cero por defecto); nocturnas informativas (22:00–06:00); domingos y festivos aparte; saldo frente a contrato prorrateado por ausencias; **Cerrar mes** guarda instantánea y avisa antes de editar un mes cerrado.

## Supuestos (marcados «supuesto» en la app hasta confirmación)

- Horarios por local y franja: mañana 09:00–16:00, tarde 16:00–23:00 (viernes y sábado hasta las 00:00), sin descanso dentro del turno. Editables en Equipo → Ajustes de los locales.
- El 33 sábado mañana pide 3 y con el PDF solo pueden Victoria y Jenny: la semana tipo pone a **Hojan** como tercero, marcado supuesto.
- Roberto hace partido viernes y sábado; Yilian partido el lunes cubriendo a Susana Capón; Lavinia por defecto en Pasarela domingo tarde.
- Los festivos solo marcan el día: ni cierran locales ni recargan horas.
- Laura y Maydeth siguen en el equipo con baja sin fecha de fin.

## Preguntas abiertas para el grupo (C1–C29)

Horas y nómina: C1 horarios reales por local y franja (viernes/sábado/domingo); C2 si el partido es seguido y si hay descanso que no cuente; C3 el «estira el turno» de Noe el domingo; C4 horas de contrato (Lavinia, Leo, Tere, Cristian, Hojan); C5 cómo se paga y quién apunta las horas fuera de planilla; C6 festivos: apertura, municipio y si se pagan distinto.

Mínimos y aperturas: C7 confirmar los mínimos con asterisco; C8 Zapatillera mañana ¿3 o 2?; C9 Pasarela domingo ¿2 y 2?; C10 quién abre El 33, Zapatillera y Mónaco por la mañana; C11 quién sale primero cuando el titular libra.

Personas: C12 tercero de El 33 sábado mañana; C13 días de partido reales de Roberto; C14 Hojan en Zapatillera y sus mañanas libres; C15 semana de Jenny; C16 Noe los partidos de Jenny y Victoria; C17 día libre de Yilian y su domingo; C18 apoyo de Pasarela domingo tarde; C19 qué significa «no coinciden»; C20 Susana Capón el martes; C21 Cristian «no abre El 33» y partidos; C22 Tere como tercera de Pasarela; C23 Lavinia viernes, sábado y domingo; C24 vuelta de Laura y Maydeth; C25 las tres decisiones de Highkey.

Fútbol y eventos: C26 refuerzo por equipo y local; C27 quién cubre (plantilla o extras); C28 otros días con refuerzo.

Planilla: C29 foto o archivo de la planilla que usan y cómo llega a cada trabajador.

Todas se pueden responder cambiando datos en la app (ficha de persona, ajustes del local, equipos): no hace falta tocar código.
