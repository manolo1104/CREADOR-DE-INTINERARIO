import { NextRequest, NextResponse } from "next/server";
import { checkAgentAuth } from "@/lib/agentAuth";
import { registrarEnBitacora, BOT, type Cambio } from "@/lib/admin/bitacora";
import { agregarNotaInterna, telefonoReal } from "@/lib/cotizaciones/armar";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Lo mismo que lee el dueño en su WhatsApp (`ETIQUETAS_MOTIVO` de whatsapp-bot/index.js). */
const ETIQUETAS_MOTIVO: Record<string, string> = {
  pide_humano:            "Pide hablar con una persona",
  llamada:                "Pide que le llamen",
  cambio_post_pago:       "Cambio después de pagar",
  cancelacion:            "Cancelación o reembolso",
  queja_incidente:        "Queja o incidente",
  cliente_molesto:        "Cliente molesto",
  grupo:                  "Grupo grande o precio de grupo",
  descuento:              "Pide descuento",
  fuera_catalogo:         "Pide algo fuera del catálogo",
  traslado_sin_tarifa:    "Recogida o traslado sin tarifa",
  para_hoy:               "Quiere el tour para HOY",
  para_manana:            "Tour para MAÑANA: confirma que hay salida",
  hotel:                  "Hotel: disponibilidad o petición especial",
  pregunta_sin_respuesta: "Pregunta que el bot no sabe",
  salud:                  "Salud, edad o condición física",
  factura:                "Pide factura",
  pago_fallido:           "El pago con tarjeta falló",
  falla_bot:              "El bot no pudo responder",
  recogida:               "Hotel para la recogida",
  humano:                 "Alguien del equipo escribió en el chat",
  comando:                "Pausado con /pausa",
  otro:                   "Otro",
};

const texto = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);

/**
 * POST /api/bot/escalacion — el bot pasó un chat al equipo («pasar») o le
 * avisó de algo que él no puede resolver («avisar»).
 *
 * { waChatId, telefono?, nombre?, motivo, modo: "pasar" | "avisar",
 *   urgencia: "urgente" | "hoy" | "normal", resumen, folio? }  →  { ok: true }
 *
 * El aviso de verdad (al WhatsApp del dueño) lo manda el bot; esto deja el
 * rastro en el panel, que antes no existía: «te paso con el equipo» no quedaba
 * en ningún lado y nadie podía saber qué chats se escalaron ni por qué.
 *  · La bitácora, con el actor «Bot WhatsApp», todas las veces (también las
 *    repetidas): ahí se juntan las preguntas que el bot no supo, para
 *    alimentarlo.
 *  · Una nota interna en el folio (cotización o reserva), para que quien lo
 *    abra en el panel vea por qué se pasó. El cliente nunca la ve.
 *
 * Nunca truena: la bitácora y la nota no lanzan, y lo que falle queda en el log.
 */
export async function POST(req: NextRequest) {
  const denied = checkAgentAuth(req);
  if (denied) return denied;

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "JSON inválido." }, { status: 400 });
  }

  const motivo = texto(body.motivo, 60).toLowerCase() || "otro";
  const resumen = texto(body.resumen, 600);
  if (!texto(body.motivo) && !resumen) {
    return NextResponse.json({ ok: false, error: "Falta el motivo o el resumen." }, { status: 400 });
  }

  try {
    const waChatId = texto(body.waChatId, 120);
    // El teléfono real; de un chat @lid no se saca ninguno (sería un número falso).
    const telefono = telefonoReal(texto(body.telefono, 40), waChatId);
    const nombre = texto(body.nombre, 120);
    const modo = body.modo === "pasar" ? "pasar" : "avisar";
    const urgencia = body.urgencia === "urgente" || body.urgencia === "hoy" ? body.urgencia as string : "normal";
    const folio = texto(body.folio, 40).toUpperCase();
    const etiqueta = ETIQUETAS_MOTIVO[motivo] ?? motivo.replace(/_/g, " ");

    const quien = [nombre || "Cliente sin nombre", telefono ? `wa.me/${telefono}` : ""].filter(Boolean).join(" · ");
    const estado = modo === "pasar" ? "el bot se calla en ese chat" : "el bot sigue atendiendo";
    const detalle: Cambio[] = [
      { campo: "quién atiende", antes: "bot", despues: modo === "pasar" ? "el equipo (bot en pausa)" : "el bot (el equipo revisa el pendiente)" },
      { campo: "urgencia", antes: null, despues: urgencia },
      ...(waChatId ? [{ campo: "chat", antes: null, despues: waChatId }] : []),
    ];

    await registrarEnBitacora({
      accion:     "escaló",
      entidad:    "conversación",
      // El folio o el teléfono; si no hay, el chat COMPLETO: los dígitos de un
      // «…@lid» sueltos se leerían como un teléfono y no lo son.
      referencia: folio || telefono || waChatId || undefined,
      resumen:    `[${urgencia.toUpperCase()}] ${etiqueta} — ${quien}${folio ? ` · ${folio}` : ""}: ${resumen || "(sin resumen)"} (${estado})`,
      detalle,
      actor:      BOT,
    });

    // La nota en el folio: cotización (COT-, HP-P) o reserva (HP-M-, HP).
    const nota = folio
      ? await agregarNotaInterna(folio, `Bot · ${etiqueta}${urgencia !== "normal" ? ` (${urgencia})` : ""}: ${resumen || "sin resumen"}`)
      : false;

    return NextResponse.json({ ok: true, notaInterna: nota });
  } catch (e: unknown) {
    console.error("❌ bot/escalacion:", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false, error: "No se pudo registrar la escalación." }, { status: 500 });
  }
}
