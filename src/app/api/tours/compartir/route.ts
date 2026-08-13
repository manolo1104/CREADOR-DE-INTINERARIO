import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { tarifarRecorridos } from "@/lib/tourPricing";
import { cotizarHabitaciones } from "@/lib/habitaciones";
import { getTraslado, tarifaTraslado } from "@/lib/traslados";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/tours/compartir
 * Guarda el carrito y devuelve un enlace para pasárselo a alguien más.
 *
 * Casi ningún viaje lo decide una sola persona. El carrito vive en el
 * `localStorage` de quien lo arma, así que hasta ahora la única forma de
 * consultarlo con la pareja o el grupo era una captura de pantalla —y quien
 * decidía no podía ni ver el precio real ni pagar.
 *
 * Reusa `AbandonedCart` con estado `manual`: queda recuperable por token pero
 * FUERA de los recordatorios automáticos, porque aquí no hay correo a quien
 * escribirle y no es un carrito abandonado, es uno compartido.
 */
export async function POST(req: NextRequest) {
  const limitado = rateLimit(req, { key: "compartir-carrito", limit: 15, windowMs: 60_000 });
  if (limitado) return limitado;

  try {
    const { items, hospedaje, traslado } = await req.json();
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "El carrito está vacío." }, { status: 400 });
    }

    // El precio se recalcula aquí, como en todos los demás caminos: lo que se
    // comparte tiene que costar lo mismo que lo que se cobra.
    const tarifa = tarifarRecorridos(items);
    if (!tarifa.ok) return NextResponse.json({ error: tarifa.error }, { status: 400 });

    const conFecha = tarifa.lineItems.filter((l) => l.tourDate);
    if (conFecha.length === 0) {
      return NextResponse.json(
        { error: "Ponle fecha al menos a un recorrido para poder compartirlo." },
        { status: 400 },
      );
    }
    const ancla = [...conFecha].sort((a, b) => a.tourDate.localeCompare(b.tourDate))[0];

    let total = tarifa.total;
    if (Array.isArray(hospedaje?.habitaciones) && hospedaje.habitaciones.length > 0 && Number(hospedaje?.noches) > 0) {
      const q = cotizarHabitaciones(hospedaje.habitaciones, Number(hospedaje.noches));
      if (q.ok && q.total) total += q.total;
    }
    if (traslado?.ciudad) {
      const ruta = getTraslado(String(traslado.ciudad));
      const precio = ruta ? tarifaTraslado(ruta, Math.max(1, Number(traslado.personas) || 1))?.precio : undefined;
      if (precio) total += precio;
    }

    const guardado = await prisma.abandonedCart.create({
      data: {
        tourId:        ancla.tourId,
        tourSlug:      ancla.tourSlug,
        tourName:      tarifa.lineItems.length > 1
          ? `${ancla.tourName} y ${tarifa.lineItems.length - 1} recorrido${tarifa.lineItems.length > 2 ? "s" : ""} más`
          : ancla.tourName,
        tourDate:      ancla.tourDate,
        // El grupo NO se suma entre recorridos: son las mismas personas.
        adults:        Math.max(...tarifa.lineItems.map((l) => l.adults), 1),
        childrenMid:   Math.max(...tarifa.lineItems.map((l) => l.children), 0),
        childrenSmall: 0,
        total,
        customerEmail: "",
        status:        "manual",
        carritoJson:   JSON.stringify({ items, hospedaje: hospedaje ?? null, traslado: traslado ?? null }),
      },
    });

    const base = (process.env.APP_URL || "https://www.huasteca-potosina.com").replace(/\/$/, "");
    return NextResponse.json({
      url: `${base}/reservar/carrito?recuperar=${guardado.token}`,
      total,
      recorridos: tarifa.lineItems.length,
    });
  } catch {
    return NextResponse.json({ error: "No se pudo generar el enlace." }, { status: 500 });
  }
}
