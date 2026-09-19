# Changelog — Shiftia · {{nombre}}

## v0.1.0 · {{fecha}} — Nace la app de {{nombre}}

Generada con el **motor de creación de Shiftia** (v{{motor.version}}) a partir del
arquetipo `{{motor.arquetipo}}` ({{motor.arquetipoNombre}}) y del manifiesto
`cliente.json`. Trazabilidad completa (arquetipo, commit de origen, versión del motor) en `motor.lock.json`.

- **Unidades**: {{unidadesTexto}} ({{nUnidades}} {{unidadesPlural}}, franjas {{#cada franjas}}{{.}}{{#no @ultimo}}/{{/no}}{{/cada}}).
- **Equipo**: {{nEquipo}} personas precargadas como datos editables desde la app; puestos {{puestosTexto}}.
- **Módulos**: {{pestanas}}.
- **Cuentas**: programador «{{cuentas.programador}}», encargado «{{cuentas.encargado}}», jefe «{{cuentas.jefe}}»; contraseña genérica de alta con cambio obligatorio.
{{#si reglasApagadas}}- **Reglas apagadas de serie**: {{reglasApagadasTexto}} (se encienden desde Equipo).
{{/si}}{{#si particularidades}}- **Particularidades del cliente** recogidas en `DISEÑO.md` ({{#cada particularidades}}{{n}}{{#no @ultimo}}, {{/no}}{{/cada}}); las que aún no están en el modelo se implementan test a test.
{{/si}}- Modelo, servidor, tests genéricos, documentación y despliegue heredados del arquetipo; lo que era del cliente de origen se sustituye o se vacía (semilla, entrevistas, tests de sus reglas).
