import { NextRequest, NextResponse } from "next/server";
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { datosCotizacion } from "@/lib/documentos/datosCotizacion";
import { datosConfirmacion } from "@/lib/documentos/datosConfirmacion";
import { PdfCotizacion } from "@/lib/documentos/pdf/PdfCotizacion";
import { PdfConfirmacion } from "@/lib/documentos/pdf/PdfConfirmacion";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/admin/documento/[folio] — el PDF de verdad de una cotización (COT-…)
 * o de la confirmación de una reserva (HP-…), armado en el servidor.
 *
 * 27 nov 2026 (Manolo): el panel abría el HTML y le pedía al navegador
 * imprimir; desde el celular salía con márgenes, la URL y la fecha al pie, y
 * la confirmación con el itinerario aplastado. Este archivo sale igual en
 * cualquier teléfono o computadora. Protegido por el middleware (/api/admin).
 *
 * 200 application/pdf · 404 sin folio · 409 reserva cancelada.
 */
export async function GET(_req: NextRequest, { params }: { params: { folio: string } }) {
  const folio = decodeURIComponent(String(params.folio || "")).trim().toUpperCase();
  if (!folio) return NextResponse.json({ error: "Falta el folio." }, { status: 400 });

  try {
    const q = await prisma.tourQuote.findUnique({ where: { quoteNumber: folio } });
    if (q) {
      const pdf = await enFila(() => renderToBuffer(createElement(PdfCotizacion, { d: datosCotizacion(q) }) as any));
      return archivo(pdf, `Cotización ${folio}.pdf`);
    }
    const b = await prisma.tourBooking.findUnique({ where: { confirmationNumber: folio } });
    if (!b) return NextResponse.json({ error: `No existe ${folio}.` }, { status: 404 });
    // El comprobante dice «Reserva confirmada»: una cancelada no lo lleva.
    if (b.status === "cancelled") {
      return NextResponse.json({ error: `La reserva ${folio} está cancelada: no lleva comprobante.` }, { status: 409 });
    }
    const pdf = await enFila(() => renderToBuffer(createElement(PdfConfirmacion, { d: datosConfirmacion(b) }) as any));
    return archivo(pdf, `Confirmación ${folio}.pdf`);
  } catch (e: unknown) {
    console.error("❌ admin/documento:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "No se pudo armar el PDF." }, { status: 500 });
  }
}

/**
 * Un PDF a la vez. El motor de acomodo de react-pdf (yoga) truena si arma dos
 * documentos al mismo tiempo en el mismo proceso («Expected null or instance
 * of Config»): lo vimos al generar la cotización y la confirmación juntas.
 */
let cola: Promise<unknown> = Promise.resolve();
function enFila<T>(tarea: () => Promise<T>): Promise<T> {
  const turno = cola.then(tarea, tarea);
  cola = turno.catch(() => undefined);
  return turno;
}

function archivo(pdf: Buffer, nombre: string) {
  const ascii = nombre.normalize("NFD").replace(/[̀-ͯ]/g, "");
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(nombre)}`,
      "Cache-Control": "no-store",
    },
  });
}
