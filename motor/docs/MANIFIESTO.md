# El manifiesto del cliente (`cliente.json`)

Un fichero JSON por cliente en `motor/clientes/`. Solo son obligatorios `slug`, `nombre` y
una unidad; todo lo demás tiene un valor por defecto sensato y se puede cambiar después
desde la app (Equipo → fichas y Ajustes). El validador (`bin/validar-cliente.mjs`) junta
todos los errores de una vez y los explica en castellano.

## Identidad

| Campo | Tipo | Por defecto | Qué es |
|---|---|---|---|
| `slug` | `a-z0-9-`, 3–40 | — | Identificador del cliente: nombre del repositorio (`shiftia-<slug>`), del paquete y de las claves del navegador. |
| `slugCorto` | `a-z0-9`, 2–8 | los 6 primeros caracteres del slug sin guiones | Prefijo de las claves de `localStorage` (`shiftia_<slugCorto>_…`). |
| `nombre` | texto, 2–60 | — | Como se enseña: barra superior, pantalla de acceso, hojas impresas, documentos. Sin paréntesis ni comillas (va dentro de tests y HTML). |
| `nombreCorto` | texto | `nombre` | Para el aviso de «app instalada» y el título de las notificaciones. |
| `sector` | `hosteleria` · `retail` · `hospital` · `industria` · `servicios` · `otro` | `hosteleria` | Informativo. |
| `arquetipo` | id | `hosteleria-multilocal` | El arquetipo del que nace (hoy solo hay uno). |
| `descripcion` | texto | «planificación de turnos de los N locales: planilla, equipo, horas, generador y cobertura» | Meta description, manifest de la PWA y `package.json`. En minúscula: el motor la capitaliza donde toca. |
| `dominio` | host | — | Dominio propio del despliegue (`HOST_CANONICO` en `.env.example`). |
| `marca.logo` | ruta relativa al manifiesto, PNG o SVG | — | Logo del cliente; se copia a `assets/<slug>-logo.<ext>` y el build lo embebe. Sin él, la app enseña el nombre en texto. |
| `marca.textoLogo` | HTML corto | «Primera <b>resto</b>» del nombre | El nombre en texto junto al logo de Shiftia (admite `<b>`). |
| `contacto` | `{encargado, jefe, programador, email}` | — | Informativo, para `DISEÑO.md`. |

## Cuentas

| Campo | Por defecto | Qué es |
|---|---|---|
| `cuentas.programador` | `diego` | Usuario del programador (todo + Actividad + cuentas de programador). |
| `cuentas.encargado` | `oficina` | Usuario del encargado (planilla, condiciones, usuarios). |
| `cuentas.jefe` | `admin` | Usuario del jefe: mismos permisos que el encargado, sin Actividad. Se crea aunque la BD ya exista. |
| `cuentas.passwordGenerica` | `<slug sin guiones><año>` | Contraseña genérica de las altas (cambio obligatorio al entrar) y del modo sin servidor. Mínimo 8. |

Los tres usuarios tienen que ser distintos y cumplir `[a-z0-9ñ._-]{3,30}`.

## Franjas y puestos

- `franjas`: `["M", "T"]`. Es lo que sabe el arquetipo (mañana y tarde; la noche entra en la
  tarde). Otras franjas necesitan otro arquetipo (`docs/EXTENDER.md`).
- `puestos`: lista de `{id, label}`; por defecto `sala`, `cocina`, `apoyo`. `apoyo` significa
  «sin local fijo, va donde falte» para el generador y la cobertura; `cocina` es quien puede
  llevar la cocina. Si se quitan, esas reglas quedan sin uso (el validador avisa).

## Unidades (`unidades[]`)

Cada local, tienda o centro que se planifica. `id` en MAYÚSCULAS (2–12, `A-Z0-9_`), único.

| Campo | Por defecto | Qué es |
|---|---|---|
| `nombre`, `corto` (≤ 6), `color` (`#rrggbb`) | corto: 3 letras del nombre; color: de una paleta | Cómo se enseña. |
| `abre` | todos los días en las dos franjas | `{M: [días], T: [días]}` con 1 = lunes … 7 = domingo. |
| `minimos` | 1 persona, marcada supuesto | `{M: [7 números] \| número, T: …}`: mínimo de personas por día de la semana. |
| `supuestos` | `true` en los días sin mínimo dado | `{M: [7 booleanos] \| booleano, T: …}`: qué mínimos no ha confirmado el cliente (se ven con asterisco). |
| `cocina` | sin cocina | `false`, `true` (obligatoria mañana y tarde) o `{obligatoria: bool \| {M,T}, titulares: {M:[ids], T:[ids]} \| [ids], reservas: [ids], posicion: n \| {M,T}}`. |
| `primero` | nadie fijo | `{M: id \| null, T: id \| null}`: quién sale el primero (abre) en cada franja. |
| `partidoAbre` | `false` | `{M, T}`: si quien hace partido puede abrir esa franja. |
| `horario` | mañana 08:00–16:00, tarde 16:00–00:00, marcado supuesto | `{M: {ini, fin}, T: {ini, fin}, porDow: {6: {M: {…}}}}`: apertura por franja y, opcionalmente, por día. |
| `horarioPartido` | 11:00–16:00 y 21:00–00:00 (finde 12–16 y 20–00), supuesto | Tramos del turno partido. |
| `duracion` | 480 minutos por franja, supuesto | `{M: minutos, T: minutos}`: lo que cuenta un turno para la nómina. |
| `descansoMin` | 0 | Descanso dentro del turno (minutos). |

Cualquier otro campo pasa tal cual a la semilla (así se puede afinar algo que la app entienda
y el manifiesto aún no documente).

## Equipo (`equipo[]`)

Puede ir vacío: el encargado da de alta a la plantilla desde la app.

| Campo | Por defecto | Qué es |
|---|---|---|
| `nombre` | — | Obligatorio. |
| `id` | derivado del nombre (`anaperez`) | `a-z0-9`, único. Dos personas con el mismo nombre necesitan id propio. |
| `puesto` | el primero de `puestos` | Uno de `puestos`. |
| `unidades` | `[]` (= cualquiera; apoyo) | Ids de unidad donde trabaja. |
| `franjas` | las dos | `["M"]`, `["T"]` o las dos. |
| `libra` | `[]` | Días que libra (1–7). |
| `partido` | `{dias: []}` | `{dias: [días], siempre?: true}`: qué días hace partido (mañana y tarde). |
| `cocina` | nadie | `{titular: [unidades], reserva: [unidades], soloDias: [días], nunca?: true}`. |
| `abre` / `noAbre` | — | `{UNIDAD: ["M","T"]}` sale el primero ahí; `["UNIDAD"]` nunca abre ahí. |
| `noPrimero` | — | `["M","T"]`: nunca en la primera posición en esas franjas. |
| `nuncaCon` | `[]` | Ids de personas con las que no coincide en la misma casilla (`nuncaConFlexible: true` lo relaja con aviso cuando no hay gente). |
| `cubreA` | `[]` | `[{pid, dow?, turnoId?}]`: a quién sustituye cuando falta. |
| `vetos` | `[]` | `[{localId, franja, dow?}]`: no hace esa franja en esa unidad (o solo ciertos días). |
| `contrato` | `{horasSemana: null}` | Horas semanales de contrato (saldo en Horas). |
| `ausencias` | `[]` | `[{tipo: BAJ\|VAC\|LD\|PERM\|OTRO, desde, hasta?, detalle?}]` (fechas `AAAA-MM-DD`). |
| `comodin`, `standby`, `soloCocina`, `libreVariable`, `nota`, `supuestos` | — | Marcas de la ficha (ver la ficha en Equipo). |

## Semana tipo, eventos, festivos, reglas, módulos

- `semanaTipo`: `{"1": [plazas], …, "7": […]}` con plazas `{t: "UNIDAD_FRANJA", p: "id", c?: 1 (cocina), a?: 1 (abre), s?: 1 (supuesta), por?: "id", n?: "nota"}`. Es lo que el generador instancia cada semana; sin ella, rellena mínimos con candidatos.
- `eventos.equipos`: `[{id?, nombre, corto?, color?, refuerzo: {UNIDAD: n}, franja?: "T"}]`: los botones «Juega el …» de Mes (refuerzo del mínimo ese día).
- `festivos`: fechas `AAAA-MM-DD` (fin de semana a efectos de mínimos y horas).
- `reglas`: `{regla: false}` para apagar de serie alguna de `minimos`, `cocina`, `nuncaCon`, `libra`, `vetos`, `partido`, `noPrimero`, `primeroCompleto`, `cubreA`, `abre`. Se encienden y apagan también desde Equipo.
- `modulos`: `{horas, generador, actividad, entrevistas}` en `true`/`false`. `hoy`, `semana`, `mes`, `equipo` y `cobertura` son el núcleo y no se apagan. Por defecto todo encendido salvo `entrevistas`.

## Lo que el cliente pide y lo que falta por saber

- `particularidades`: frases con lo que el cliente ha pedido y el arquetipo no trae de serie.
  Van a `DISEÑO.md` como P1, P2… con estado «pendiente»: cada una se implementa como un test.
- `preguntas`: frases con lo que quedó por preguntar. Van a `DISEÑO.md` como C1, C2…
- `despliegue`: `{plataforma: railway|docker|otro, nucleo: bool}`.
- `notas`: texto libre para quien lea el manifiesto.
