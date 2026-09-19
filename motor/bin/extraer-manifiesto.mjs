#!/usr/bin/env node
// El camino de vuelta: de una app que ya existe (su semilla en modelo.js) a un manifiesto
// del motor. Sirve para meter en el motor un cliente que nació a mano, y para comprobar
// que el manifiesto captura TODO lo que la app sabe (ida y vuelta exacta).
//   node motor/bin/extraer-manifiesto.mjs --desde ../shiftia-pasarela --slug pasarela --nombre "Grupo Pasarela" [--salida fichero.json]
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';
import { extraerManifiesto } from '../lib/semilla.mjs';

const args = process.argv.slice(2);
const valor = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const desde = resolve(valor('--desde') || '.');
const require = createRequire(import.meta.url);
const M = require(join(desde, 'modelo.js'));
const semillaFn = M.semillaCliente || M.semillaPasarela || Object.values(M).find(f => typeof f === 'function' && /^semilla/.test(f.name));
if (!semillaFn) { console.error(`No encuentro una función semilla* exportada en ${join(desde, 'modelo.js')}`); process.exit(1); }
const pkg = JSON.parse(readFileSync(join(desde, 'package.json'), 'utf8'));
const base = {
  slug: valor('--slug') || pkg.name.replace(/^shiftia-/, ''),
  nombre: valor('--nombre') || pkg.name,
  sector: valor('--sector') || 'hosteleria',
  arquetipo: valor('--arquetipo') || 'hosteleria-multilocal',
};
const m = extraerManifiesto(semillaFn(), base);
const salida = valor('--salida');
const json = JSON.stringify(m, null, 2) + '\n';
if (salida) { writeFileSync(salida, json); console.log(`✓ manifiesto escrito en ${salida}: ${m.unidades.length} unidades, ${m.equipo.length} personas`); }
else process.stdout.write(json);
