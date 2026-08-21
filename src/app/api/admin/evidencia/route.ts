import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET → metadatos de TODAS las evidencias (sin los bytes), para que el listado
// de reservas sepa cuántos comprobantes tiene cada fila sin cargar archivos.
export async function GET() {
  try {
    const evidencias = await prisma.pagoProveedorEvidencia.findMany({
      select: { id: true, bookingId: true, nombreArchivo: true, tipoMime: true, tamanoBytes: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(evidencias);
  } catch (e: any) {
    console.error("admin/evidencia GET:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
