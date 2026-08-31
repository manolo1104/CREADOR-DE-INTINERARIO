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
    const nombre = ev.nombreArchivo.replace(/["\\]/g, "");

    // 🔴 `filename=` solo admite Latin-1. Un guion largo (–), una comilla curva
    // o un emoji en el nombre —cosas que macOS y WhatsApp meten solos— hacían
    // que construir esta cabecera lanzara y el comprobante respondiera 500: el
    // archivo se había subido bien y no se podía volver a abrir NUNCA.
    // Se manda dos veces: en ASCII para los navegadores viejos y en UTF-8
    // (RFC 5987) para que el nombre real llegue con sus acentos.
    const ascii = nombre.replace(/[^\x20-\x7E]/g, "_") || "evidencia";
    const utf8  = encodeURIComponent(nombre);

    return new NextResponse(new Uint8Array(ev.datos), {
      headers: {
        "Content-Type": ev.tipoMime,
        "Content-Length": String(ev.datos.length),
        "Content-Disposition": `${descargar ? "attachment" : "inline"}; filename="${ascii}"; filename*=UTF-8''${utf8}`,
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
