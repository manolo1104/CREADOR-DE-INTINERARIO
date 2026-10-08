import { NextRequest, NextResponse } from "next/server";
import { checkAgentAuth } from "@/lib/agentAuth";
import { confirmarPagoCotizacion, respuestaDeError } from "@/lib/cotizaciones/convertir";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/bot/confirm — lo dispara el `/confirma <folio> [monto] [método]`
 * de una PERSONA que ya vio el dinero en su banco. El bot nunca llega aquí solo.
 *
 * { folio, montoPagado?, metodo?, comprobante?: {base64, mimetype, filename?}, confirmadoPor?, forzar? }
 * (el bot de antes manda solo { folio, montoPagado? }). `forzar: true` = el
 * dueño ya revisó lo que se frena con 409 (otra reserva del mismo cliente,
 * cotización vencida, evento sin lugar, el mismo pago hace minutos).
 *
 *  · COT- / HP-P… (cotización): la convierte en reserva HP-M- sin duplicar,
 *    registra el cobro con su comprobante y manda el correo de confirmación.
 *  · HP-M- / HP… (reserva): registra el cobro (el saldo, un abono).
 *
 * ⚠️ `montoPagado` es lo que DE VERDAD llegó. Sin él se registra el anticipo
 * acordado y solo si todavía no había entrado nada: lo prudente es dar por
 * cobrado lo mínimo, no lo máximo.
 *
 * 🔴 Antes solo conocía reservas (un COT- daba 404) y escribía
 * `depositoPagado` a mano: sin cobro en el corte, sin método, sin comprobante
 * y sin bitácora. Todo eso lo hace ahora `confirmarPagoCotizacion`.
 *
 * 200 con lo que necesita el WhatsApp al cliente · 404 el folio no existe ·
 * 409 cotización vencida, reserva cancelada o NO se registró nada · 400 monto o
 * método que no sirven.
 *
 * 🔴 «No se registró nada» es 409 y no un 200 con `yaConfirmada`: con un 200
 * el bot le contesta al dueño «pago registrado» y al cliente «Registramos tu
 * pago» aunque no haya entrado nada. Pasa al confirmar el SALDO con el folio
 * COT- (ya convertido: el saldo se confirma con el HP-M- de la reserva), con
 * una reserva ya liquidada o con el mismo pago repetido. El cliente que acaba
 * de pagar el resto leería «Saldo: $2,170» y nadie se enteraría de que falta
 * anotarlo. Con 409 el dueño lee el porqué y el folio correcto.
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

  const folio = String(body?.folio ?? "").trim();
  if (!folio) {
    return NextResponse.json({ error: "Falta el folio." }, { status: 400 });
  }
  const c = body?.comprobante;
  const comprobante = c && typeof c === "object" && typeof c.base64 === "string" && c.base64
    ? { base64: c.base64, mimetype: typeof c.mimetype === "string" ? c.mimetype : undefined, filename: typeof c.filename === "string" ? c.filename : undefined }
    : null;

  try {
    const r = await confirmarPagoCotizacion({
      folio,
      monto:         body.montoPagado ?? body.monto ?? null,
      metodo:        typeof body.metodo === "string" ? body.metodo : null,
      comprobante,
      confirmadoPor: typeof body.confirmadoPor === "string" ? body.confirmadoPor : null,
      forzar:        body.forzar === true,
    });
    if (r.yaConfirmada) {
      // Esta llamada no movió dinero: los avisos dicen por qué y qué hacer.
      return NextResponse.json({
        error:        r.avisos.join(" ") || `No se registró ningún pago nuevo en ${r.reservaFolio}.`,
        yaConfirmada: true,
        folio:        r.folio,
        reservaFolio: r.reservaFolio,
        totalAmount:  r.totalAmount,
        pagado:       r.pagado,
        saldo:        r.saldo,
        liquidado:    r.liquidado,
      }, { status: 409 });
    }
    return NextResponse.json({
      ...r,
      // Como siempre en esta ruta: la reserva YA estaba confirmada (tenía un
      // pago) antes de este /confirma. Así el bot le escribe «registramos tu
      // pago» por el saldo y no un «¡tu reserva quedó confirmada!» de nuevo.
      // Lo que entró en ESTA llamada va en `cobroRegistrado`.
      yaConfirmada: r.pagado - r.cobroRegistrado > 0,
    });
  } catch (e: unknown) {
    const x = respuestaDeError(e, "No se pudo confirmar.");
    if (x.status >= 500) console.error("❌ bot/confirm:", e instanceof Error ? e.message : e);
    return NextResponse.json(x.body, { status: x.status });
  }
}
