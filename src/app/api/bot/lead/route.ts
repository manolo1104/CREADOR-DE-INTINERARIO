import { NextRequest, NextResponse } from "next/server";
import { checkAgentAuth } from "@/lib/agentAuth";
import { comunesDelBot, cotizarParaBot, itemsDelBot, paqueteDelBot } from "@/lib/cotizaciones/resumen";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/bot/lead — la cotización del RZR solo o de un paquete del
 * catálogo (herramienta registrar_cotizacion). Pese al nombre no crea un Lead:
 * crea una cotización COT- en el panel.
 *
 * Pedido de siempre: { tipo: "rzr" | "paquete", customerName, customerEmail?,
 * customerPhone?, personas?, notes?, ruta?, vehiculo?, tourDate?, paqueteSlug?,
 * habitacion?, checkin?, checkout? }, más lo del bot nuevo: { unidades,
 * adultos, ninosMid, ninosSmall, vistaMontana, nocheExtra, hora } y los
 * comunes (waChatId, telefono, zonaHospedaje, locale, notasInternas).
 *
 * Antes el RZR se cobraba por UNA unidad sin ver si cabía la gente, y el
 * paquete a precio fijo de pareja (con 3 personas o con niños, de menos) y con
 * la promo de HOY; las notas del bot salían al cliente en `notes` y el correo
 * enseñaba «Precio de lista $0 · Ajuste». Ahora el RZR va por unidades y
 * capacidad, y el paquete con `computePaqueteCharge`, como la web (ver
 * `cotizarParaBot`).
 *
 * Cambios del cliente (oct 2026): con `reemplazaA` (folio de su cotización
 * anterior) la vieja queda Vencida después de guardar y mandar ésta, salvo con
 * `aparte: true` (dos opciones para comparar). La respuesta trae `reemplazo`.
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

  const tipo = String(body.tipo ?? "").trim().toLowerCase();
  const comunes = comunesDelBot(body);

  if (tipo === "rzr") {
    const r = await cotizarParaBot({
      items: itemsDelBot([{
        tipo: "rzr", slug: body.slug, tourDate: body.tourDate,
        ruta: body.ruta, vehiculo: body.vehiculo,
        unidades: body.unidades, personas: body.personas, hora: body.hora,
      }]),
      ...comunes,
    }, "bot/lead rzr");
    return NextResponse.json(r.body, { status: r.status });
  }

  if (tipo === "paquete") {
    // `checkin` es el día 1 del paquete; con `nocheExtra` llegan la víspera.
    // La salida la calcula el servidor (el `checkout` del bot se ignora).
    const paquete = paqueteDelBot({
      slug: body.paqueteSlug ?? body.slug, fecha: body.checkin ?? body.fecha ?? body.tourDate,
      adultos: body.adultos, personas: body.personas,
      ninosMid: body.ninosMid, ninosSmall: body.ninosSmall,
      vistaMontana: body.vistaMontana, nocheExtra: body.nocheExtra,
      eleccion: body.eleccion, reparto: body.reparto, habitacion: body.habitacion,
    });
    if (!paquete) {
      return NextResponse.json({ error: "Falta `paqueteSlug`: ¿cuál paquete?" }, { status: 400 });
    }
    const r = await cotizarParaBot({ items: [], paquete, ...comunes }, "bot/lead paquete");
    return NextResponse.json(r.body, { status: r.status });
  }

  return NextResponse.json({ error: "tipo inválido (usa 'rzr' o 'paquete')." }, { status: 400 });
}
