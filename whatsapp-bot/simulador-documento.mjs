// ════════════════════════════════════════════════════════════════════
// SIMULADOR · el HTML del PDF con el MISMO generador del sitio.
//
// Lo usa simulador.js en modo simulacro para que la cotización y la
// confirmación en PDF se vean igual que las que manda el bot de verdad
// (src/lib/documentos/htmlCotizacion.ts y htmlConfirmacion.ts).
//
// Corre como proceso aparte, con Node ≥ 23 y --experimental-transform-types:
//   echo '{"tipo":"cotizacion","q":{…},"origen":"http://…"}' | node --experimental-transform-types simulador-documento.mjs
// Lee el JSON por la entrada y escribe el HTML por la salida. Los alias
// «@/…» del sitio se resuelven con los ganchos de abajo (sin compilar nada).
// ════════════════════════════════════════════════════════════════════
import { register } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(AQUI, "..", "src");

// Ganchos de resolución: «@/lib/tours» → ../src/lib/tours.ts (y los
// relativos del sitio que no traen extensión).
const ganchos = `
import { existsSync, statSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";
const SRC = ${JSON.stringify(SRC)};
const EXT = [".ts", ".tsx", "/index.ts", "/index.tsx", ".js", ".mjs", ".json"];
const esArchivo = (f) => { try { return statSync(f).isFile(); } catch { return false; } };
function probar(base) {
  if (esArchivo(base)) return base;
  for (const e of EXT) if (esArchivo(base + e)) return base + e;
  return null;
}
export async function resolve(spec, ctx, next) {
  let base = null;
  if (spec.startsWith("@/")) base = path.join(SRC, spec.slice(2));
  else if ((spec.startsWith("./") || spec.startsWith("../")) && ctx.parentURL && ctx.parentURL.startsWith("file:")) {
    const padre = fileURLToPath(ctx.parentURL);
    if (padre.startsWith(SRC)) base = path.resolve(path.dirname(padre), spec);
  }
  if (base) {
    const f = probar(base);
    if (f) return next(pathToFileURL(f).href, ctx);
  }
  return next(spec, ctx);
}
`;
register(`data:text/javascript,${encodeURIComponent(ganchos)}`, import.meta.url);

let entrada = "";
for await (const trozo of process.stdin) entrada += trozo;
const { tipo, q, origen } = JSON.parse(entrada || "{}");
if (!q || typeof q !== "object") {
  console.error("falta q");
  process.exit(2);
}
if (q.createdAt) q.createdAt = new Date(q.createdAt);

let html;
if (tipo === "confirmacion") {
  const { htmlConfirmacion } = await import(pathToFileURL(path.join(SRC, "lib/documentos/htmlConfirmacion.ts")).href);
  html = htmlConfirmacion(q, origen);
} else {
  const { htmlCotizacion } = await import(pathToFileURL(path.join(SRC, "lib/documentos/htmlCotizacion.ts")).href);
  html = htmlCotizacion(q, origen, new Date());
}
process.stdout.write(html);
