/**
 * verificar-imagenes.ts — ¿alguna imagen del sitio apunta a un archivo que no existe?
 *
 * Recorre todo `src/` buscando rutas de assets locales y comprueba que el
 * archivo esté en `public/`. Una imagen rota en un tour o un destino se ve como
 * un hueco gris justo donde el visitante estaba decidiendo si compra.
 *
 * Uso:  npx tsx src/scripts/verificar-imagenes.ts
 * Sale con código 1 si falta alguna (sirve para colgarlo del CI).
 */

import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";

const RAIZ    = process.cwd();
const SRC     = join(RAIZ, "src");
const PUBLIC  = join(RAIZ, "public");
const EXT_TXT = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".json"];

// Rutas absolutas de assets locales: /imagenes/..., /guias/..., /video/...
const RUTA_ASSET = /["'`](\/(?:imagenes|guias|guides|authors|badges|logos|video|reviews)\/[^"'`\s)]+)["'`]/g;

function archivosDe(dir: string): string[] {
  const salida: string[] = [];
  for (const entrada of readdirSync(dir)) {
    if (entrada === "node_modules" || entrada.charAt(0) === ".") continue;
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) {
      salida.push.apply(salida, archivosDe(ruta));
    } else if (EXT_TXT.indexOf(extname(entrada)) >= 0) {
      salida.push(ruta);
    }
  }
  return salida;
}

/** Descarta rutas que no son assets reales: plantillas, grupos de regex, ejemplos. */
function esLiteral(ruta: string): boolean {
  if (ruta.indexOf("${") >= 0) return false;  // `/imagenes/${slug}/hero.jpg`
  if (/\$\d/.test(ruta))       return false;  // reemplazo de regex: "/imagenes/$1/$2.jpg"
  if (ruta.indexOf("...") >= 0) return false; // ejemplo en un comentario
  return true;
}

// asset → archivos que lo referencian
const referencias: Record<string, string[]> = {};

for (const archivo of archivosDe(SRC)) {
  // El propio verificador menciona rutas de ejemplo en su documentación.
  if (archivo.slice(-22) === "verificar-imagenes.ts") continue;

  const texto = readFileSync(archivo, "utf8");
  const rel   = archivo.slice(RAIZ.length + 1);

  RUTA_ASSET.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = RUTA_ASSET.exec(texto)) !== null) {
    const asset = m[1];
    if (!esLiteral(asset)) continue;
    if (!referencias[asset]) referencias[asset] = [];
    if (referencias[asset].indexOf(rel) < 0) referencias[asset].push(rel);
  }
}

const assets    = Object.keys(referencias).sort();
const faltantes = assets.filter((asset) => {
  // decodeURIComponent por si algún nombre trae espacios escapados.
  return !existsSync(join(PUBLIC, decodeURIComponent(asset)));
});

console.log(`\n🖼️   ${assets.length} rutas de imagen referenciadas en src/\n`);

if (faltantes.length === 0) {
  console.log("    ✅ Todas existen en public/\n");
  process.exit(0);
}

console.log(`    ❌ ${faltantes.length} NO existen en public/:\n`);
for (const asset of faltantes) {
  console.log(`    ${asset}`);
  for (const uso of referencias[asset]) console.log(`        ← ${uso}`);
  console.log("");
}
process.exit(1);
