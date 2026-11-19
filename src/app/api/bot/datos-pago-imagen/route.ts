import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkAgentAuth } from "@/lib/agentAuth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Donde vive la imagen (ver `src/scripts/guardar-imagen-datos-pago.ts`). */
const LLAVE_IMAGEN_DATOS_PAGO = "bot:imagenDatosPago";

/**
 * GET /api/bot/datos-pago-imagen → { mimetype, data (base64), nombre } | 404
 *
 * La imagen «Aparta tu lugar con tu anticipo» que el bot manda junto con los
 * datos de pago (Manolo, 18 nov 2026). Vive en la BASE y no en el repositorio:
 * el repo es PÚBLICO y la imagen trae la CLABE, la tarjeta de OXXO y el nombre
 * del titular. Sin imagen guardada contesta 404 y el bot manda solo el texto.
 */
export async function GET(req: NextRequest) {
  const denied = checkAgentAuth(req);
  if (denied) return denied;
  try {
    const fila = await prisma.config.findUnique({ where: { key: LLAVE_IMAGEN_DATOS_PAGO } });
    if (!fila) return NextResponse.json({ error: "Sin imagen de datos de pago." }, { status: 404 });
    const d = JSON.parse(fila.value) as { mimetype?: string; data?: string; nombre?: string };
    if (!d?.data || !d?.mimetype) return NextResponse.json({ error: "Imagen dañada." }, { status: 404 });
    return NextResponse.json({ mimetype: d.mimetype, data: d.data, nombre: d.nombre || "datos-de-pago.png", actualizada: fila.updatedAt });
  } catch (e: unknown) {
    console.error("❌ bot/datos-pago-imagen:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "No se pudo leer la imagen." }, { status: 500 });
  }
}
