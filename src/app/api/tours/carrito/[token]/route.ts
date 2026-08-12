import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/tours/carrito/[token]
// Devuelve la selección guardada de un carrito para precargar /reservar-tour.
//
// OJO: antes esto marcaba el carrito como "recovered" en cuanto el cliente
// abría el link del correo, y el cron solo escribe a los que están "open".
// Resultado: quien hacía clic en el primer recordatorio quedaba excluido de
// todos los siguientes — justo el que más interés había mostrado. Volver a la
// página NO es haber comprado; el carrito sigue abierto hasta que haya reserva
// (send-confirmation y el webhook lo marcan "converted").
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const token = params.token;
  if (!token) return NextResponse.json({ error: "Falta el token." }, { status: 400 });

  const cart = await prisma.abandonedCart.findUnique({ where: { token } });
  if (!cart) return NextResponse.json({ error: "No encontrado." }, { status: 404 });

  return NextResponse.json({
    tourSlug:      cart.tourSlug,
    tourDate:      cart.tourDate,
    adults:        cart.adults,
    childrenMid:   cart.childrenMid,
    childrenSmall: cart.childrenSmall,
    promoCode:     cart.promoCode,
    promoDiscount: cart.promoDiscount,
    email:         cart.customerEmail,
    // El carrito completo, cuando la cotización traía varios recorridos.
    // La forma plana de arriba se CONSERVA siempre: hay tokens vivos en las
    // bandejas de entrada de clientes que llegan al flujo de un solo tour.
    items: cart.carritoJson ? JSON.parse(cart.carritoJson) : null,
  });
}
