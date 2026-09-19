# Manifiestos

- `ejemplo-cafeterias.json` — un cliente **ficticio** («Cafeterías Norte», tres locales, ocho
  personas, semana tipo, un equipo de fútbol, particularidades y preguntas abiertas). Es el
  que usan los tests del motor y el mejor sitio para copiar y empezar uno nuevo. Su logo de
  muestra está en `logos/`.
- `pasarela.json` — el **Grupo Pasarela**, extraído de la semilla real de este repositorio con
  `bin/extraer-manifiesto.mjs`. Sirve de referencia de un manifiesto completo (24 personas
  con todas sus condiciones, 138 plazas de semana tipo) y de prueba de que el formato captura
  todo lo que la app sabe: el test del motor reconstruye la semilla desde él y la compara con
  la original, campo a campo. Si cambia la semilla en `modelo.js`, regenera este fichero:
  `node motor/bin/extraer-manifiesto.mjs --desde . --slug pasarela --nombre "Grupo Pasarela" --salida motor/clientes/pasarela.json`.
- Los otros dos clientes de Shiftia (Urología · HUCSC y Nonwatio) no tienen manifiesto porque
  no son de este arquetipo; sus fichas están en `docs/CATALOGO.md`.

Un manifiesto nuevo: copia el ejemplo, cambia lo que sea del cliente, valida con
`node motor/bin/validar-cliente.mjs motor/clientes/<slug>.json` y genera. Los logos van en
`logos/` (PNG o SVG) y se referencian con ruta relativa al manifiesto.
