/**
 * Reencoda las fotos de `public/imagenes` para que dejen de pesar lo que pesan.
 *
 * El problema: la carpeta suma ~215 MB, con 162 archivos de más de 500 KB y
 * varios por encima de 1.5 MB. El sitio corre en Railway (servidor Node, no
 * Vercel), así que cada imagen la optimiza el servidor de Next en la PRIMERA
 * petición: con originales de 1.8 MB, la primera visita a una ficha de tour paga
 * ese costo entero. Ninguna mejora de código lo compensa.
 *
 * Qué hace: baja el ancho máximo a 2000 px (nadie ve una foto de galería más
 * grande) y reencoda a JPEG calidad 78 con mozjpeg. Next sigue sirviendo AVIF y
 * WebP por encima; esto solo arregla el original del que parte.
 *
 * Uso:
 *   npx tsx src/scripts/comprimir-imagenes.ts            → SIMULACIÓN, no toca nada
 *   npx tsx src/scripts/comprimir-imagenes.ts --aplicar  → reescribe los archivos
 *
 * Los originales se copian a `.originales-imagenes/` antes de tocar nada, para
 * poder volver atrás si alguna foto queda peor de lo aceptable. Esa carpeta NO
 * se borra automáticamente: se revisa a ojo y se borra a mano.
 */

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const RAIZ       = path.join(process.cwd(), "public", "imagenes");
const RESPALDO   = path.join(process.cwd(), ".originales-imagenes");
const ANCHO_MAX  = 2000;
const CALIDAD    = 78;
/** Por debajo de esto no vale la pena: el ahorro es ruido. */
const MINIMO_KB  = 120;

const aplicar = process.argv.includes("--aplicar");

function listar(dir: string): string[] {
  const salida: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) salida.push(...listar(p));
    else if (/\.(jpe?g|png)$/i.test(e.name)) salida.push(p);
  }
  return salida;
}

function kb(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`;
}

async function main() {
  if (!fs.existsSync(RAIZ)) {
    console.error("No existe public/imagenes");
    process.exit(1);
  }

  const archivos = listar(RAIZ);
  console.log(`${archivos.length} imágenes encontradas${aplicar ? "" : "  ·  SIMULACIÓN (nadie toca nada)"}\n`);

  let antesTotal = 0;
  let despuesTotal = 0;
  let tocados = 0;
  const peores: { archivo: string; antes: number; despues: number }[] = [];

  for (const archivo of archivos) {
    const antes = fs.statSync(archivo).size;
    antesTotal += antes;

    if (antes < MINIMO_KB * 1024) { despuesTotal += antes; continue; }

    try {
      const img  = sharp(archivo, { failOn: "none" });
      const meta = await img.metadata();
      const necesitaEncoger = (meta.width ?? 0) > ANCHO_MAX;

      // Un PNG con transparencia REAL no se pasa a JPEG: perdería el alfa y
      // saldría con fondo negro. Ya pasó una vez con una foto de reseña, así
      // que la comprobación se queda aquí y no en la cabeza de nadie.
      // `hasAlpha` no basta: muchos PNG traen canal alfa totalmente opaco.
      const stats     = await sharp(archivo, { failOn: "none" }).stats();
      const conAlfa   = !!meta.hasAlpha && !stats.isOpaque;

      let pipe = sharp(archivo, { failOn: "none" }).rotate(); // respeta el EXIF
      if (necesitaEncoger) pipe = pipe.resize({ width: ANCHO_MAX, withoutEnlargement: true });
      const buf = conAlfa
        ? await pipe.png({ quality: 80, compressionLevel: 9, palette: true }).toBuffer()
        : await pipe.jpeg({ quality: CALIDAD, mozjpeg: true }).toBuffer();

      // Si el reencode no mejora, se deja el original en paz.
      if (buf.length >= antes * 0.95) { despuesTotal += antes; continue; }

      despuesTotal += buf.length;
      tocados++;
      peores.push({ archivo: path.relative(RAIZ, archivo), antes, despues: buf.length });

      if (aplicar) {
        const destinoRespaldo = path.join(RESPALDO, path.relative(RAIZ, archivo));
        fs.mkdirSync(path.dirname(destinoRespaldo), { recursive: true });
        if (!fs.existsSync(destinoRespaldo)) fs.copyFileSync(archivo, destinoRespaldo);
        fs.writeFileSync(archivo, buf);
      }
    } catch (e) {
      console.warn(`  ⚠️  ${path.relative(RAIZ, archivo)}: ${(e as Error).message}`);
      despuesTotal += antes;
    }
  }

  peores.sort((a, b) => b.antes - b.despues - (a.antes - a.despues));
  console.log("Las 12 que más bajan:");
  for (const p of peores.slice(0, 12)) {
    console.log(`  ${p.archivo.padEnd(52).slice(0, 52)}  ${kb(p.antes).padStart(8)} → ${kb(p.despues).padStart(8)}`);
  }

  console.log(`\n  archivos reencodados: ${tocados} de ${archivos.length}`);
  console.log(`  antes:   ${kb(antesTotal)}`);
  console.log(`  después: ${kb(despuesTotal)}`);
  console.log(`  ahorro:  ${kb(antesTotal - despuesTotal)} (${Math.round((1 - despuesTotal / antesTotal) * 100)} %)`);
  if (aplicar) console.log(`\n  Originales respaldados en ${path.relative(process.cwd(), RESPALDO)}/ — revísalos antes de borrarlos.`);
  else console.log(`\n  Nada se modificó. Para aplicarlo: npx tsx src/scripts/comprimir-imagenes.ts --aplicar`);
}

main();
