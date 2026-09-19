#!/usr/bin/env node
// Crea la burbuja de un cliente nuevo a partir de su manifiesto.
//
//   node motor/bin/crear-cliente.mjs motor/clientes/<cliente>.json [--destino ../shiftia-<slug>]
//                                    [--forzar] [--sin-tests] [--git] [--silencioso]
//
// Sale con 0 si la burbuja se ensambla, pasa sus tests y no queda rastro del cliente de
// origen; con 1 si algo de eso falla (el informe dice qué). Ver motor/README.md.
import { generar } from '../lib/generar.mjs';
import { ManifiestoInvalido } from '../lib/manifiesto.mjs';

const args = process.argv.slice(2);
const flag = n => args.includes(n);
const valor = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const manifiesto = args.find(a => !a.startsWith('--') && a !== valor('--destino'));
if (!manifiesto || flag('--ayuda') || flag('-h')) {
  console.log(`Uso: node motor/bin/crear-cliente.mjs <cliente.json> [--destino RUTA] [--forzar] [--sin-tests] [--git] [--silencioso]

  --destino RUTA   dónde nace la burbuja (por defecto, al lado del repositorio de origen: ../shiftia-<slug>)
  --forzar         escribir aunque el destino ya tenga contenido (no borra nada; pisa lo generado)
  --sin-tests      ensambla pero no pasa los tests (más rápido; para mirar el resultado)
  --git            deja el destino como repositorio git en main con el primer commit
  --silencioso     solo el resumen final`);
  process.exit(manifiesto ? 0 : 2);
}
const silencioso = flag('--silencioso');
const t0 = Date.now();
let informe;
try {
  informe = generar({ manifiesto, destino: valor('--destino'), forzar: flag('--forzar'), tests: !flag('--sin-tests'), git: flag('--git'),
    log: (nombre, detalle) => { if (silencioso) return; console.log(`▸ ${nombre}`); if (detalle) console.log('    ' + String(detalle).split('\n').join('\n    ')); } });
} catch (e) {
  if (e instanceof ManifiestoInvalido) { console.error(e.message); if (e.avisos.length) console.error('Avisos:\n' + e.avisos.map(a => '  · ' + a).join('\n')); process.exit(1); }
  console.error('✗ ' + (e && e.message || e));
  process.exit(1);
}
for (const a of informe.avisos) console.log(`⚠ ${a}`);
const r = informe.resumen;
console.log(`\n${informe.ok ? '✓' : '✗'} ${informe.ctx.nombre} → ${informe.destino}  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
console.log(`  ${r.unidades} ${informe.ctx.unidadesPlural} · ${r.personas} personas · módulos: ${r.modulos.join(', ')} · ${r.ficherosTexto + r.binarios} ficheros`);
if (!informe.ok) {
  const malos = (informe.comprobaciones.pasos || []).filter(p => !p.ok);
  for (const p of malos) console.log(`  ✗ ${p.nombre}\n${p.salida.slice(-2500).split('\n').map(l => '      ' + l).join('\n')}`);
  if (informe.restos.length) console.log(`  ✗ ${informe.restos.length} resto(s) del cliente de origen (los 40 primeros arriba)`);
  process.exit(1);
}
console.log(`
Siguientes pasos:
  cd ${informe.destino}
  npm start                                  → http://localhost:8080 (programador «${informe.ctx.cuentas.programador}» / 12345678)
  git init -b main && git add -A && git commit -m "Nace ${informe.ctx.nombre}"   (o --git al generar)
  Repositorio en GitHub: diegociborro99-bot/shiftia-${informe.ctx.slug} (privado) y push de main
  Railway: seguir DEPLOY-SERVIDOR.md (Volume en /data, variables de .env.example)
  Con el cliente: repasar DISEÑO.md (decisiones, supuestos y preguntas abiertas) y Equipo → Ajustes`);
