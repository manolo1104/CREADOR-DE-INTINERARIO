import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MAX_BYTES_EVIDENCIA, TIPOS_OK, tipoDeArchivo } from "@/lib/admin/evidencia";

export const dynamic = "force-dynamic";

// GET → metadatos de las evidencias de una reserva (NUNCA los bytes).
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const evidencias = await prisma.pagoProveedorEvidencia.findMany({
      where: { bookingId: params.id },
      select: { id: true, bookingId: true, nombreArchivo: true, tipoMime: true, tamanoBytes: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(evidencias);
  } catch (e: any) {
    console.error("admin/evidencia GET:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST → sube un archivo (multipart/form-data, campo "archivo").
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const reserva = await prisma.tourBooking.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!reserva) return NextResponse.json({ error: "La reserva no existe" }, { status: 404 });

    const form = await req.formData();
    const archivo = form.get("archivo");
    if (!(archivo instanceof File) || archivo.size === 0) {
      return NextResponse.json({ error: "No llegó ningún archivo" }, { status: 400 });
    }
    if (archivo.size > MAX_BYTES_EVIDENCIA) {
      return NextResponse.json(
        { error: `El archivo pesa ${(archivo.size / 1024 / 1024).toFixed(1)} MB. El máximo son 5 MB.` },
        { status: 413 },
      );
    }
    const tipoMime = tipoDeArchivo(archivo.name, archivo.type);
    if (!TIPOS_OK.has(tipoMime)) {
      return NextResponse.json(
        { error: "Solo se aceptan PDF o imágenes (JPG, PNG, WEBP, HEIC)." },
        { status: 415 },
      );
    }

    const datos = Buffer.from(await archivo.arrayBuffer());
    const creada = await prisma.pagoProveedorEvidencia.create({
      data: {
        bookingId:     params.id,
        nombreArchivo: archivo.name.slice(0, 200) || "evidencia",
        tipoMime,
        tamanoBytes:   archivo.size,
        datos,
      },
      select: { id: true, bookingId: true, nombreArchivo: true, tipoMime: true, tamanoBytes: true, createdAt: true },
    });
    return NextResponse.json({ ok: true, evidencia: creada });
  } catch (e: any) {
    console.error("admin/evidencia POST:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
