#!/usr/bin/env node
// Valida un manifiesto sin generar nada y enseña lo que el motor entiende de él.
//   node motor/bin/validar-cliente.mjs motor/clientes/<cliente>.json
import { cargarManifiesto, ManifiestoInvalido } from '../lib/manifiesto.mjs';
import { cargarArquetipo } from '../lib/arquetipo.mjs';
import { RAIZ_MOTOR, leerArquetipoDe } from '../lib/generar.mjs';
import { construirSemilla } from '../lib/semilla.mjs';

const ruta = process.argv[2];
if (!ruta) { console.error('Uso: node motor/bin/validar-cliente.mjs <cliente.json>'); process.exit(2); }
try {
  const arq = cargarArquetipo(leerArquetipoDe(ruta), RAIZ_MOTOR);
  const { ctx, avisos } = cargarManifiesto(ruta, arq);
  const s = construirSemilla(ctx);
  console.log(`✓ ${ctx.nombre} (${ctx.slug}) · arquetipo ${arq.id}`);
  console.log(`  ${ctx.nUnidades} ${ctx.unidadesPlural}: ${ctx.unidadesTexto}`);
  console.log(`  ${ctx.nEquipo} personas · puestos: ${ctx.puestosTexto}`);
  console.log(`  módulos: ${ctx.modulosLista.map(x => `${x.k}${x.activo ? '' : ' (apagado)'}`).join(', ')}`);
  console.log(`  cuentas: programador «${ctx.cuentas.programador}», encargado «${ctx.cuentas.encargado}», jefe «${ctx.cuentas.jefe}» · genérica «${ctx.cuentas.passwordGenerica}»`);
  console.log(`  semana tipo: ${Object.values(s.patron).reduce((n, l) => n + l.length, 0)} plazas · festivos: ${s.festivos.length} · reglas apagadas: ${ctx.reglasApagadasTexto || 'ninguna'}`);
  console.log(`  logo: ${ctx.marca.logo || 'ninguno (nombre en texto)'} · dominio: ${ctx.dominio || 'sin fijar'}`);
  if (ctx.supuestos.length) console.log('  supuestos:\n' + ctx.supuestos.map(x => '    · ' + x).join('\n'));
  for (const a of avisos) console.log(`⚠ ${a}`);
} catch (e) {
  if (e instanceof ManifiestoInvalido) { console.error(e.message); process.exit(1); }
  throw e;
}
