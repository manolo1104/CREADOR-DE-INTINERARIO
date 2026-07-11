import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/tours/carrito/[token]
// Devuelve la selección guardada de un carrito para precargar /reservar-tour,
// y lo marca como "recuperado" (el cliente volvió por el link del correo).
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const token = params.token;
  if (!token) return NextResponse.json({ error: "Falta el token." }, { status: 400 });

  const cart = await prisma.abandonedCart.findUnique({ where: { token } });
  if (!cart) return NextResponse.json({ error: "No encontrado." }, { status: 404 });

  // Marca que el cliente regresó (solo si aún estaba abierto).
  if (cart.status === "open") {
    await prisma.abandonedCart.update({ where: { id: cart.id }, data: { status: "recovered" } });
  }

  return NextResponse.json({
    tourSlug:      cart.tourSlug,
    tourDate:      cart.tourDate,
    adults:        cart.adults,
    childrenMid:   cart.childrenMid,
    childrenSmall: cart.childrenSmall,
    promoCode:     cart.promoCode,
    promoDiscount: cart.promoDiscount,
    email:         cart.customerEmail,
  });
}
