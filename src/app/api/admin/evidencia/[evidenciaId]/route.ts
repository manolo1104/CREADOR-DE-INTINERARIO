import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET → devuelve el archivo para verlo/descargarlo desde el panel.
export async function GET(req: NextRequest, { params }: { params: { evidenciaId: string } }) {
  try {
    const ev = await prisma.pagoProveedorEvidencia.findUnique({
      where: { id: params.evidenciaId },
    });
    if (!ev) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    // ?descargar=1 fuerza la descarga; sin él, el navegador lo abre en la pestaña.
    const descargar = req.nextUrl.searchParams.get("descargar") === "1";
    // El nombre va entre comillas y sin comillas internas para no romper el header.
    const nombre = ev.nombreArchivo.replace(/["\\]/g, "");

    return new NextResponse(new Uint8Array(ev.datos), {
      headers: {
        "Content-Type": ev.tipoMime,
        "Content-Length": String(ev.datos.length),
        "Content-Disposition": `${descargar ? "attachment" : "inline"}; filename="${nombre}"`,
        // Es un comprobante privado: que no se quede en caches intermedias.
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e: any) {
    console.error("admin/evidencia/[id] GET:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { evidenciaId: string } }) {
  try {
    await prisma.pagoProveedorEvidencia.delete({ where: { id: params.evidenciaId } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("admin/evidencia/[id] DELETE:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
