import { NextRequest, NextResponse } from "next/server";
import { checkAgentAuth } from "@/lib/agentAuth";
import { calcularCotizacionBotConCupo, respuestaPrecioBot } from "@/lib/cotizaciones/armar";
import { grupoDeItems, hospedajeDelBot, itemsDelBot, paqueteDelBot } from "@/lib/cotizaciones/resumen";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/bot/precio — cuánto cuesta, SIN guardar nada (calcular_precio,
 * cotizar_rzr).
 *
 * { items?: [{slug, tourDate, adultos?, ninosMid?, ninosSmall?, addOns?, ruta?,
 *   vehiculo?, unidades?, personas?, hora?}],
 *   hospedaje?: {habitacion, checkin, checkout?, noches?, habitaciones?, huespedes},
 *   paquete?: {slug, fecha, adultos, ninosMid?, ninosSmall?, vistaMontana?, nocheExtra?, eleccion?} }
 *
 * Es la MISMA cuenta que guarda la cotización y que cobra la web: la promo
 * según la FECHA del recorrido, viajero solo, tarifa de grupo del Edén, RZR
 * por unidades y paquetes con niños. Antes el bot hacía su propia cuenta con
 * la promo de hoy y un precio fijo de pareja: lo que decía en el chat no era
 * lo que después llegaba en la cotización.
 *
 * Lo que no se puede (cupo, mínimo, solo adultos, fecha, ruta o vehículo que
 * no existe, gente que no cabe) llega en `errores` con su motivo y no suma:
 * 200 igual, para que el bot diga el porqué. 400 solo si no pidió nada.
 */
export async function POST(req: NextRequest) {
  const denied = checkAgentAuth(req);
  if (denied) return denied;

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const items = itemsDelBot(body.items);
  // Aquí el hotel no trae la bandera «interesado»: si viene, se cotiza.
  const hospedaje = hospedajeDelBot(
    body.hospedaje && typeof body.hospedaje === "object" ? { interesado: true, ...body.hospedaje } : undefined,
    grupoDeItems(items),
  );
  const paquete = paqueteDelBot(body.paquete);
  if (!items.length && !hospedaje && !paquete) {
    return NextResponse.json({ error: "No hay nada que cotizar: manda `items`, `paquete` u `hospedaje`." }, { status: 400 });
  }

  try {
    const calc = await calcularCotizacionBotConCupo({
      items,
      ...(paquete ? { paquete } : {}),
      ...(hospedaje ? { hospedaje } : {}),
    });
    return NextResponse.json(respuestaPrecioBot(calc));
  } catch (e: unknown) {
    console.error("❌ bot/precio:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "No se pudo calcular el precio." }, { status: 500 });
  }
}
