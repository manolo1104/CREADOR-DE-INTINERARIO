import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/admin/sesion";
import { esDeOficina } from "@/lib/admin/usuarios";

export const dynamic = "force-dynamic";

// GET → metadatos de TODAS las evidencias (sin los bytes), para que el listado
// de reservas sepa cuántos comprobantes tiene cada fila sin cargar archivos.
export async function GET() {
  try {
    // Cobros y comprobantes son dinero: solo la oficina (lote 8, 10 nov 2026). El guía, aunque
    // Manolo le abra una pestaña que use esta API, no los recibe.
    const quien = await sesionActual();
    if (!quien || !esDeOficina(quien.rol)) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    const evidencias = await prisma.evidencia.findMany({
      select: { id: true, bookingId: true, nombreArchivo: true, tipoMime: true, tamanoBytes: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(evidencias);
  } catch (e: any) {
    console.error("admin/evidencia GET:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
