import { createHash } from "crypto";
import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { esBot } from "@/lib/bots";
import { WORKBOOKS } from "@/lib/curso";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /curso/workbook/[noche]
 *
 * Sirve el cuaderno de esa noche y anota la descarga. Existe justamente por lo
 * segundo: mientras el PDF vivía en `public/` con su nombre bonito, Next lo
 * servía sin pasar por una línea de código y no había forma de saber si alguien
 * se lo había llevado.
 *
 * El archivo SIGUE en `public/`, pero bajo un nombre con sufijo que nadie va a
 * teclear por casualidad. Se lee del disco en vez de moverlo fuera porque en
 * Railway el árbol del repo está entero en tiempo de ejecución, mientras que un
 * archivo fuera de `public/` depende de que el rastreo de dependencias de Next
 * lo copie, y eso no se puede prometer.
 *
 * El PDF va cifrado y la contraseña sólo se dice en vivo, así que esta ruta no
 * necesita autenticación: la puerta es el cuaderno, no la URL.
 */

/** Sal fija: el objetivo es no guardar la IP, no esconderla de nosotros. */
const SAL = "workbook-taller-turismo-ia";

function huellaDe(req: NextRequest): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "sin-ip";
  const ua = req.headers.get("user-agent") || "sin-ua";
  return createHash("sha256").update(`${SAL}|${ip}|${ua}`).digest("hex").slice(0, 32);
}

export async function GET(
  req: NextRequest,
  { params }: { params: { noche: string } }
) {
  const noche = Number(params.noche);
  const wb = Number.isInteger(noche) ? WORKBOOKS[noche] : undefined;

  if (!wb || !wb.archivo) {
    return new NextResponse(
      "Ese cuaderno todavía no existe. Sale la noche que le toca.",
      { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }

  let pdf: Buffer;
  try {
    pdf = await readFile(
      path.join(process.cwd(), "public", "curso", "wb", wb.archivo)
    );
  } catch {
    // Si el archivo no está, decirlo claro: un 500 mudo en mitad de un taller
    // en vivo no le sirve a nadie.
    return new NextResponse("No encuentro el archivo del cuaderno.", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // Anotar la descarga NUNCA puede impedir la descarga: va en su propio
  // try/catch y después de tener el archivo en la mano.
  if (!esBot(req.headers.get("user-agent"))) {
    try {
      await prisma.cursoDescarga.create({
        data: { noche, huella: huellaDe(req) },
      });
    } catch {
      /* si la base falla, la persona igual se lleva su cuaderno */
    }
  }

  // `Buffer` vale como cuerpo en tiempo de ejecución, pero los tipos de la
  // Web API sólo aceptan `Uint8Array`. La conversión no copia el contenido.
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(pdf.length),
      "Content-Disposition": `attachment; filename="Workbook-Noche-${noche}-Turismo-con-IA.pdf"`,
      // Sin caché: si se cachea, la segunda descarga no llega al servidor y el
      // conteo se queda corto.
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
