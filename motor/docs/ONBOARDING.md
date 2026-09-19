# Del cuestionario con el cliente al manifiesto

Cómo se rellena `motor/clientes/<slug>.json` a partir de lo que cuenta el cliente. Es el
mismo cuestionario que se hizo con Pasarela (B1–B10 de su `DISEÑO.md`), generalizado. No
hace falta tenerlo todo el primer día: con nombre, slug y una unidad nace una burbuja, y
lo demás se puede meter en el manifiesto y volver a generar (mientras no haya despliegue)
o directamente en la app (Equipo → fichas y Ajustes) una vez desplegada.

## Antes de la reunión

- Pide **lo que ya tengan**: su planilla actual (Excel, Word, PDF, foto del tablón), la lista
  de personal con puesto y condiciones, los horarios de apertura de cada sitio y el calendario
  de festivos. De ahí sale el 80 % del manifiesto.
- Decide el `slug` (repositorio `shiftia-<slug>`) y comprueba que no exista.

## El cuestionario y a qué campo va cada respuesta

| # | Pregunta al cliente | Campo del manifiesto |
|---|---|---|
| B1 | ¿Qué necesita ver el encargado cada día? ¿Contador de horas para la nómina? ¿Quiere que la app le proponga la planilla? | `modulos` (`horas`, `generador`, `actividad`, `entrevistas`) |
| B2 | ¿Cómo se llama el negocio tal como quieren verlo en la app y en las hojas? ¿Tienen logo? | `nombre`, `nombreCorto`, `marca.logo`, `marca.textoLogo` |
| B3 | ¿Quién lleva la planilla (encargado), quién manda (jefe) y qué nombres de usuario quieren? | `cuentas`, `contacto` |
| B4 | ¿Cuántos sitios se planifican (locales, tiendas, centros)? De cada uno: nombre, días que abre, horario de mañana y de tarde, cuánta gente hace falta como mínimo cada día por franja, si tiene cocina y quién la lleva, quién abre. | `unidades[]` (`abre`, `horario`, `minimos`, `supuestos`, `cocina`, `primero`, `duracion`) |
| B5 | ¿Trabajan en dos franjas (mañana y tarde) o en tres? ¿Hay turno partido? ¿Quién lo hace? | `franjas` (solo M/T en este arquetipo); `partido` en cada persona; `partidoAbre` en cada unidad |
| B6 | ¿Qué puestos hay (sala, cocina, apoyo, otros)? | `puestos` |
| B7 | De cada persona: puesto, dónde trabaja, qué franjas hace, qué día libra, si hace partido, si lleva cocina, si abre, con quién no puede coincidir, a quién sustituye cuando falta, qué no hace nunca, contrato, bajas en curso. | `equipo[]` |
| B8 | ¿Tienen una semana «tipo» que se repite? Si es así, casilla a casilla (quién abre, quién cocina). | `semanaTipo` |
| B9 | ¿Hay días especiales con refuerzo (partidos, eventos, mercadillos)? ¿Cuánta gente más y dónde? | `eventos.equipos` |
| B10 | ¿Qué festivos les afectan? | `festivos` |
| B11 | ¿Hay alguna de las reglas de serie que no quieran (por ejemplo, no les importa quién sale el primero)? | `reglas` (`{regla: false}`) |
| B12 | ¿Dónde se despliega, con qué dominio? ¿Se contrata el núcleo de optimización? | `despliegue`, `dominio` |
| — | Todo lo que pidan y no encaje arriba («los sábados el Centro necesita tres», «Luis solo hace partido viernes y sábado»). | `particularidades[]` |
| — | Todo lo que quede sin respuesta. | `preguntas[]` |

Consejos:

- **Marca lo supuesto.** Si un mínimo o un horario no lo ha dicho el cliente, no lo pongas
  en `minimos` / `horario`: el motor lo deja de fábrica y lo marca «supuesto» en la app, que
  es justo lo que hay que enseñarle para que lo confirme.
- **Los ids importan.** Los `id` de unidad (`CENTRO`) y de persona (`ana`) aparecen en
  `semanaTipo`, `cocina.titulares`, `cubreA`, `nuncaCon`… Pónselos tú, cortos y estables.
- **Las particularidades no se programan en el manifiesto.** Van a `DISEÑO.md` como P1, P2…
  y se implementan en la burbuja, test a test. El manifiesto describe datos; las reglas
  nuevas son código.

## Después de generar

1. `npm start` en la burbuja y entra como programador: mira Hoy, Semana, Equipo y Ajustes
   de cada unidad con los ojos del cliente. Lo que chirríe, corrígelo en el manifiesto y
   vuelve a generar (`--forzar` sobre el mismo destino, o borra y genera).
2. Repasa `DISEÑO.md`: la tabla de decisiones, los supuestos y las preguntas. Es lo que se
   le enseña al cliente en la siguiente reunión.
3. Cada particularidad (P1…): test en rojo en `modelo.test.js`, implementación mínima en
   `modelo.js` (o en la vista que toque), verde, y anótala como hecha en `DISEÑO.md`.
4. Repositorio privado en GitHub, push de `main`, Railway según `DEPLOY-SERVIDOR.md`, y
   `node tools/comprobar-despliegue.mjs https://…` desde fuera.
5. Con el cliente dentro: altas de usuarios desde Cuenta → Usuarios, y a partir de ahí todo
   lo que cambie en su realidad se cambia en la app, no en el manifiesto. El manifiesto
   queda como el acta de nacimiento (`cliente.json` dentro de la burbuja).
