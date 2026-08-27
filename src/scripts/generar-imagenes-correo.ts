/**
 * Genera las versiones de las fotos de tour que se pueden mandar por correo.
 *
 * Las del sitio no sirven tal cual por dos razones:
 *
 *  1. PESO. Van de 260 KB a 850 KB. En una página eso se carga en diferido; en
 *     un correo la persona ve el hueco mientras baja, y en celular con datos
 *     muchas veces no baja nunca.
 *
 *  2. FORMATO. Dos tours tienen la portada en `.webp`, y **Outlook no muestra
 *     webp**: quedaría un recuadro roto justo donde va la foto del recorrido
 *     que le estamos vendiendo.
 *
 * La salida es JPG de 1200 px de ancho que el correo pinta a 600: se ve nítida
 * en pantallas retina y pesa una fracción.
 *
 *   npx tsx src/scripts/generar-imagenes-correo.ts
 */

import sharp from "sharp";
import path from "path";
import fs from "fs";
import { TOURS_DB } from "../lib/tours";

const PUBLIC = path.join(process.cwd(), "public");
const SALIDA = path.join(PUBLIC, "imagenes", "correo");

/** Se pinta a 600 px en el correo; a 1.5x se ve nítida sin pesar de más. */
const ANCHO = 900;
/** Recorte apaisado: una foto vertical dentro de un correo se come la pantalla. */
const ALTO  = 470;

async function main() {
  fs.mkdirSync(SALIDA, { recursive: true });

  let hechas = 0;
  let faltantes = 0;
  let totalKb = 0;

  for (const tour of TOURS_DB) {
    const origen = path.join(PUBLIC, tour.imagen_hero);
    const destino = path.join(SALIDA, `${tour.slug}.jpg`);

    if (!fs.existsSync(origen)) {
      console.log(`  ✗ ${tour.slug.padEnd(32)} no existe ${tour.imagen_hero}`);
      faltantes++;
      continue;
    }

    const antes = fs.statSync(origen).size;

    await sharp(origen)
      .resize(ANCHO, ALTO, { fit: "cover", position: "attention" })
      .jpeg({ quality: 64, progressive: true, mozjpeg: true })
      .toFile(destino);

    const despues = fs.statSync(destino).size;
    totalKb += despues / 1024;
    hechas++;

    const ext = path.extname(tour.imagen_hero).slice(1);
    console.log(
      `  ✓ ${tour.slug.padEnd(32)} ${String(Math.round(antes / 1024)).padStart(4)} KB ${ext.padEnd(4)} → ` +
      `${String(Math.round(despues / 1024)).padStart(3)} KB jpg`,
    );
  }

  console.log(
    `\n${hechas} imagen(es) en public/imagenes/correo/ · ` +
    `${Math.round(totalKb / hechas)} KB de promedio` +
    (faltantes ? ` · ⚠️ ${faltantes} sin archivo de origen` : ""),
  );
}

main().catch((e) => {
  console.error("✗ Falló:", e instanceof Error ? e.message : e);
  process.exit(1);
});
