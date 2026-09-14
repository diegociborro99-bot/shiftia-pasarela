#!/usr/bin/env node
// Build de Shiftia · Grupo Pasarela.
// Ensambla el código fuente compartimentado de src/ en el index.html final
// (un único fichero que el servidor sirve y que funciona offline/PWA).
//
//   src/index.template.html   → shell HTML con marcadores de inyección
//   src/styles/*.css          → estilos (concatenados por orden alfabético)
//   modelo.js                 → modelo de dominio (fuente única; se embebe sin
//                               el module.exports, y se usa tal cual en los tests)
//   src/app/*.js              → la app, un fichero por sección; el orden lo fija
//                               src/app/_orden.json. Comparten scope: el build
//                               los concatena dentro de un solo <script>.
//   assets/pasarela-logo.png (o .svg) → logo del grupo embebido en base64; el PNG manda
//
// Sin dependencias. Uso: node tools/build.mjs  (--check solo valida)
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(RAIZ, 'src');
const soloCheck = process.argv.includes('--check');

function ensamblar() {
  const shell = readFileSync(join(SRC, 'index.template.html'), 'utf8');

  // --- estilos ---
  const cssFiles = readdirSync(join(SRC, 'styles')).filter(f => f.endsWith('.css')).sort();
  const css = cssFiles.map(f => `/* ${f} */\n` + readFileSync(join(SRC, 'styles', f), 'utf8').trim()).join('\n\n');

  // --- modelo: fuente única modelo.js, embebido sin el module.exports ---
  const modelo = readFileSync(join(RAIZ, 'modelo.js'), 'utf8');
  const modeloInner = modelo.replace(/\nif \(typeof module !== 'undefined'\) \{[\s\S]*?\n\}\n/, '\n').trim();

  // --- app: módulos en el orden declarado ---
  const orden = JSON.parse(readFileSync(join(SRC, 'app', '_orden.json'), 'utf8'));
  const partes = orden.map(f => readFileSync(join(SRC, 'app', f), 'utf8').replace(/\s+$/, ''));
  const preIdx = orden.indexOf('00-pre.js');
  const pre = preIdx >= 0 ? partes[preIdx] + '\n' : '';
  const resto = orden.filter(f => f !== '00-pre.js').map(f => partes[orden.indexOf(f)]);
  const script = pre +
    '/*MODELO_START*/\n' + modeloInner + '\n/*MODELO_END*/\n' +
    resto.join('\n');

  // --- logo del grupo: desde el fichero, nunca pegado a mano; si aún no está,
  // el shell enseña el nombre del grupo en texto (14/09: Diego lo sube más tarde)
  // el PNG del grupo (cuando lo suban) manda sobre el SVG hecho a imitación del original
  const logoPng = join(RAIZ, 'assets', 'pasarela-logo.png'), logoSvg = join(RAIZ, 'assets', 'pasarela-logo.svg');
  const logoData = existsSync(logoPng) ? 'data:image/png;base64,' + readFileSync(logoPng).toString('base64')
    : existsSync(logoSvg) ? 'data:image/svg+xml;base64,' + readFileSync(logoSvg).toString('base64') : '';

  // HUELLA DEL BUILD: 10 caracteres del hash de lo ensamblado. Cambia con cualquier
  // cambio de estilos, modelo o app; la caché del service worker lleva nombre propio.
  const version = JSON.parse(readFileSync(join(RAIZ, 'package.json'), 'utf8')).version;
  const build = createHash('sha256').update(css + modeloInner + script + logoData).digest('hex').slice(0, 10);

  const html = shell
    .replace('<!--INJECT:STYLES-->', `<style>\n${css}\n</style>`)
    .replace('<!--INJECT:SCRIPT-->', `<script>\nconst APP_VERSION = ${JSON.stringify(version)}, APP_BUILD = ${JSON.stringify(version + '+' + build)}, LOGO_PASARELA = ${JSON.stringify(logoData)};\n${script}\n</script>`)
    .replace('<!--INJECT:BUILD-->', `<meta name="shiftia-build" content="${version}+${build}">`)
    .replace(/<!--INJECT:GLOGO-->/g, logoData).replace(/<!--INJECT:GLOGO-HIDDEN-->/g, logoData ? '' : ' hidden').replace(/<!--INJECT:GWORD-HIDDEN-->/g, logoData ? ' hidden' : '');

  // --- pantalla de acceso independiente (login.html): sin sesión, sin modelo ---
  const icono = (shell.match(/^<link rel="icon"[^>]*>$/m) || [''])[0];
  const login = readFileSync(join(SRC, 'login.template.html'), 'utf8')
    .replace('<!--INJECT:STYLES-->', `<style>\n${css}\n</style>`)
    .replace('<!--INJECT:ICON-->', icono)
    .replace('<!--INJECT:PWA-->', (shell.match(/^<(?:meta name="(?:apple-)?mobile-web-app-[^"]+"|link rel="apple-touch-icon")[^>]*>$/gm) || []).join('\n'))
    .replace(/<!--INJECT:GLOGO-->/g, logoData).replace(/<!--INJECT:GLOGO-HIDDEN-->/g, logoData ? '' : ' hidden').replace(/<!--INJECT:GWORD-HIDDEN-->/g, logoData ? ' hidden' : '')
    .replace('<!--INJECT:BUILD-->', `<meta name="shiftia-build" content="${version}+${build}">`);
  return { html, login, build, version };
}

const { html, login, build, version } = ensamblar();
const salidas = [[join(RAIZ, 'index.html'), html], [join(RAIZ, 'login.html'), login]];

if (soloCheck) {
  for (const [destino, contenido] of salidas) {
    let actual = null;
    try { actual = readFileSync(destino, 'utf8'); } catch (e) {}
    if (actual !== contenido) {
      console.error(`✗ ${destino.split('/').pop()} está desincronizado con src/ — ejecuta: node tools/build.mjs`);
      process.exit(1);
    }
  }
  console.log(`✓ index.html y login.html coinciden con el build de src/ (${version}+${build})`);
} else {
  for (const [destino, contenido] of salidas) {
    writeFileSync(destino, contenido);
    console.log(`✓ ${destino.split('/').pop()} ensamblado desde src/ (${(contenido.length / 1024) | 0} KB) · ${version}+${build}`);
  }
}
