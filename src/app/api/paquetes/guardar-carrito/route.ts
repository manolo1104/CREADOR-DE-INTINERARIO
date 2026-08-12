import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computePaqueteCharge } from "@/lib/paquetePricing";
import { rateLimit } from "@/lib/rateLimit";
import { MARCA_PAQUETE } from "@/lib/recuperacion";
import { ESTADOS_VIVOS } from "@/lib/cartFollowUp";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Guarda un paquete que el cliente configuró y dejó a medias.
 *
 * Se llama en el momento en que ya dio nombre y correo pero todavía no ha
 * pagado. Hasta ahora esa gente se perdía en silencio: los tours sueltos sí
 * tenían rescate (`/api/tours/guardar-carrito` + el cron
 * `recuperar-carritos`), pero los paquetes —que son el producto de mayor
 * ticket, de $9,000 a $15,500— no tenían ninguno.
 *
 * Escribe en la MISMA tabla `AbandonedCart`, marcada con `tourId = "paquete"`,
 * así que el cron que ya corre los recoge sin tocar nada más y sin migrar la
 * base. El link de recuperación lo arma `linkRecuperacion`, que distingue la
 * ruta por esa marca.
 */
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { key: "guardar-carrito-paquete", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const body = await req.json();
    const email = String(body?.email || "").trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Correo inválido." }, { status: 400 });
    }

    // El importe se recalcula aquí: el correo de rescate lleva un precio y no
    // puede salir del navegador del visitante.
    const cobro = computePaqueteCharge({
      slug:          body?.slug,
      personas:      body?.personas,
      childrenMid:   body?.childrenMid,
      childrenSmall: body?.childrenSmall,
      vistaMontana:  body?.vistaMontana,
      pct:           100,
    });
    if (!cobro) {
      return NextResponse.json({ error: "Paquete o número de personas inválido." }, { status: 400 });
    }

    const datos = {
      tourId:        MARCA_PAQUETE,
      tourSlug:      cobro.paquete.slug,
      tourName:      cobro.paquete.nombre,
      tourDate:      String(body?.fecha || ""),
      adults:        cobro.adultos,
      childrenMid:   cobro.childrenMid,
      childrenSmall: cobro.childrenSmall,
      total:         cobro.total,
      customerEmail: email,
      customerPhone: body?.phone ? String(body.phone).trim() : null,
    };

    // Si ya había uno vivo de este mismo paquete y correo, se actualiza en vez
    // de duplicar: si no, cada vez que el cliente vuelve a intentarlo se le
    // encimaría otra secuencia de recordatorios.
    const existente = await prisma.abandonedCart.findFirst({
      where: {
        customerEmail: email,
        tourSlug:      cobro.paquete.slug,
        status:        { in: [...ESTADOS_VIVOS] },
      },
    });

    if (existente) {
      await prisma.abandonedCart.update({ where: { id: existente.id }, data: datos });
      return NextResponse.json({ ok: true, nuevo: false });
    }

    await prisma.abandonedCart.create({ data: datos });
    return NextResponse.json({ ok: true, nuevo: true });
  } catch (err) {
    const e = err as Error;
    logger.error("guardar_carrito_paquete_error", { message: e.message });
    // Nunca se le enseña este fallo al cliente: es una captura de respaldo, no
    // parte de su compra. Si truena, que siga hacia el pago sin enterarse.
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
