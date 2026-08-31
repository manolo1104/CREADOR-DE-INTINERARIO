import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TOURS_DB } from "@/lib/tours";
import { conceptosDe } from "@/lib/admin/costos";

export const dynamic = "force-dynamic";

/**
 * Guarda los costos de UN recorrido. Upsert: la primera vez crea la fila, las
 * siguientes la reemplazan entera. Se guarda el desglose completo, no un total:
 * dentro de un mes hay que poder ver qué subió, no solo que subió.
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const tourSlug = String(body?.tourSlug ?? "");

    // El slug tiene que existir en el catálogo. Sin esta guarda, un dedazo crea
    // una fila fantasma con costos que ningún recorrido va a leer nunca.
    if (!TOURS_DB.some(t => t.slug === tourSlug)) {
      return NextResponse.json({ error: "Ese recorrido no existe en el catálogo" }, { status: 400 });
    }

    const conceptos = conceptosDe(body?.conceptos);
    const notas     = typeof body?.notas === "string" ? body.notas.slice(0, 500) : "";

    await prisma.tourCosto.upsert({
      where:  { tourSlug },
      create: { tourSlug, conceptos: conceptos as never, notas },
      update: { conceptos: conceptos as never, notas },
    });

    return NextResponse.json({ ok: true, tourSlug, conceptos, notas });
  } catch (e: any) {
    console.error("admin/costos PUT:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
