/**
 * Guarda en la base la imagen de datos de pago que el bot manda con
 * `datos_pago` (Manolo, 18 nov 2026). Va en la BASE, no en el repo (público):
 * la imagen trae la CLABE, la tarjeta de OXXO y el nombre del titular.
 *
 *   npx tsx --env-file=<.env con DATABASE_URL> src/scripts/guardar-imagen-datos-pago.ts "<ruta a la imagen .png/.jpg>"
 *
 * Para cambiarla, se vuelve a correr con la imagen nueva. Para quitarla: --borrar.
 */
import { readFileSync } from "fs";
import { basename, extname } from "path";
import { prisma } from "../lib/prisma";

const LLAVE = "bot:imagenDatosPago"; // la misma de src/app/api/bot/datos-pago-imagen/route.ts

async function main() {
  const arg = process.argv[2];
  if (!arg) throw new Error("Falta la ruta de la imagen (o --borrar).");
  if (arg === "--borrar") {
    await prisma.config.deleteMany({ where: { key: LLAVE } });
    console.log("🗑️  Imagen de datos de pago borrada: el bot manda solo el texto.");
    return;
  }
  const ext = extname(arg).toLowerCase();
  const mimetype = ext === ".png" ? "image/png" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "";
  if (!mimetype) throw new Error("Solo PNG o JPG.");
  const buf = readFileSync(arg);
  if (buf.length > 4 * 1024 * 1024) throw new Error("La imagen pesa más de 4 MB: WhatsApp la manda mejor más ligera.");
  const value = JSON.stringify({ mimetype, data: buf.toString("base64"), nombre: basename(arg).replace(/\s+/g, "-") });
  await prisma.config.upsert({ where: { key: LLAVE }, update: { value }, create: { key: LLAVE, value } });
  const host = (() => { try { return new URL(process.env.DATABASE_URL || "").host; } catch { return "?"; } })();
  console.log(`✅ Imagen de datos de pago guardada (${Math.round(buf.length / 1024)} KB) en la base ${host}.`);
}

main().catch((e) => { console.error("❌", e instanceof Error ? e.message : e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
