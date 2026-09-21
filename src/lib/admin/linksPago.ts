import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

/**
 * Cobros sueltos: título, monto y una liga que se manda por WhatsApp.
 *
 * Se usa **Payment Link** de Stripe y no una sesión de pago porque la sesión
 * caduca en 24 horas: una liga que se manda un viernes y el cliente abre el
 * lunes ya no sirve, y eso es exactamente lo que pasa cuando se cobra por chat.
 *
 * Cada liga se limita a **un solo pago** (`completed_sessions: 1`). Sin ese
 * tope, un cliente que abre dos veces la conversación puede pagar dos veces el
 * mismo tour, y devolver dinero es mucho más caro que ponerle el límite.
 */

/** Stripe trabaja en centavos; el panel, en pesos enteros. La conversión vive aquí. */
const aCentavos = (pesos: number) => Math.round(pesos) * 100;
export const aPesos = (centavos: number) => Math.round(centavos / 100);

export const MONTO_MINIMO = 10;      // Stripe rechaza cobros por debajo de $10 MXN
export const MONTO_MAXIMO = 500_000; // freno a un dedazo con un cero de más

export interface DatosLink {
  titulo: string;
  /**
   * La línea chica que Stripe enseña debajo del concepto: quién es, cuánta
   * gente va y cuándo sale. El cliente abre la liga en su teléfono, a veces
   * días después de la conversación, y esa línea es la que le confirma que
   * está pagando SU viaje y no otra cosa.
   */
  detalle?: string;
  monto: number;
  cliente?: string;
  nota?: string;
  reservaId?: string;
  cotizacionId?: string;
}

export interface LinkCreado {
  id: string;
  url: string;
  titulo: string;
  monto: number;
}

/**
 * Crea el cobro en Stripe y lo guarda.
 *
 * El producto y el precio se crean al vuelo: cada cobro es distinto (un saldo,
 * un tour privado, un extra) y un catálogo de productos reutilizables solo
 * añadiría un paso más a algo que tiene que tomar diez segundos.
 */
export async function crearLinkDePago(datos: DatosLink, creadoPor: string): Promise<LinkCreado> {
  const titulo = datos.titulo.trim().slice(0, 120);
  const monto  = Math.round(datos.monto);

  if (!titulo) throw new Error("Escribe de qué es el cobro");
  if (!Number.isFinite(monto) || monto < MONTO_MINIMO) {
    throw new Error(`El monto mínimo es $${MONTO_MINIMO} MXN`);
  }
  if (monto > MONTO_MAXIMO) {
    throw new Error(`El monto máximo es $${MONTO_MAXIMO.toLocaleString("es-MX")} MXN. Revisa que no sobre un cero.`);
  }

  // Lo que se cobra tiene que existir: un id inventado dejaría el dinero
  // cobrado sin abonar a nadie.
  let folio: string | undefined;
  if (datos.reservaId) {
    const reserva = await prisma.tourBooking.findUnique({
      where:  { id: datos.reservaId },
      select: { confirmationNumber: true },
    });
    if (!reserva) throw new Error("Esa reserva no existe");
    folio = reserva.confirmationNumber;
  }
  if (datos.cotizacionId) {
    const cot = await prisma.tourQuote.findUnique({
      where:  { id: datos.cotizacionId },
      select: { quoteNumber: true },
    });
    if (!cot) throw new Error("Esa cotización no existe");
    folio = cot.quoteNumber;
  }

  const detalle = datos.detalle?.trim().slice(0, 200);

  // El producto se crea aparte del precio porque el atajo `product_data` no
  // acepta descripción, y la descripción es justo lo que personaliza la
  // pantalla de pago ("Ignacio Ortiz · 4 personas · sale el 25 de octubre").
  const producto = await stripe.products.create({
    name: titulo,
    ...(detalle ? { description: detalle } : {}),
  });

  const price = await stripe.prices.create({
    currency:    "mxn",
    unit_amount: aCentavos(monto),
    product:     producto.id,
  });

  const link = await stripe.paymentLinks.create({
    line_items: [{ price: price.id, quantity: 1 }],
    // Un solo pago por liga.
    restrictions: { completed_sessions: { limit: 1 } },
    // El correo se pide en el checkout: es como se le manda el comprobante.
    customer_creation: "always",
    metadata: {
      source:    "panel-admin",
      titulo,
      creadoPor,
      reservaId:    datos.reservaId ?? "",
      cotizacionId: datos.cotizacionId ?? "",
      folio:        folio ?? "",
    },
    after_completion: {
      type: "hosted_confirmation",
      hosted_confirmation: {
        custom_message:
          "¡Listo! Tu pago quedó registrado. Te escribimos por WhatsApp para confirmar los detalles.",
      },
    },
  });

  // Si el guardado falla, la liga YA existe en Stripe y es cobrable: un cliente
  // podría pagarla y el panel no se enteraría nunca. Se apaga antes de rendirse,
  // para no dejar cobros que nadie está mirando.
  //
  // Pasó de verdad el 21 sep 2026: la tabla no existía todavía en esa base, el
  // guardado reventó y quedó una liga viva de $2,100 sin registro.
  try {
    const guardado = await prisma.linkPago.create({
      data: {
        titulo, monto,
        nota:          (datos.nota?.trim() || detalle || "").slice(0, 300) || null,
        cliente:       datos.cliente?.trim().slice(0, 120) || null,
        reservaId:     datos.reservaId || null,
        cotizacionId:  datos.cotizacionId || null,
        stripeLinkId:  link.id,
        stripePriceId: price.id,
        url:           link.url,
        creadoPor,
      },
    });
    return { id: guardado.id, url: link.url, titulo, monto };
  } catch (e) {
    try {
      await stripe.paymentLinks.update(link.id, { active: false });
    } catch {
      // Si tampoco se puede apagar, al menos queda dicho cuál es.
      console.error("liga de pago viva sin registro:", link.id, link.url);
    }
    throw new Error(
      "La liga no se pudo guardar y se canceló en Stripe para que nadie la pague por error. " +
      "Vuelve a intentarlo.",
    );
  }
}

/**
 * Apaga un cobro que ya no debe pagarse.
 *
 * En Stripe la liga se desactiva (no se borra): si alguien la abre después, ve
 * un aviso de que ya no está disponible en vez de un error.
 */
export async function cancelarLinkDePago(id: string): Promise<void> {
  const link = await prisma.linkPago.findUnique({ where: { id } });
  if (!link) throw new Error("Ese cobro no existe");
  if (link.estado === "pagado") throw new Error("Ese cobro ya se pagó: no se puede cancelar");

  try {
    await stripe.paymentLinks.update(link.stripeLinkId, { active: false });
  } catch (e) {
    // Si Stripe ya no lo tiene, igual se marca aquí: lo que importa es que el
    // panel deje de ofrecerlo.
    if (!(e instanceof Stripe.errors.StripeInvalidRequestError)) throw e;
  }

  await prisma.linkPago.update({ where: { id }, data: { estado: "cancelado" } });
}

/**
 * Registra que una liga se pagó. La llama el webhook de Stripe.
 *
 * Es idempotente: Stripe reintenta el webhook si algo falla, y sin esta guarda
 * un mismo pago podría abonarse dos veces al saldo de la reserva.
 */
export async function marcarLinkPagado(
  stripeLinkId: string,
  sessionId: string,
  montoPagado: number,
  correo: string | null,
): Promise<void> {
  const link = await prisma.linkPago.findUnique({ where: { stripeLinkId } });
  if (!link) return;                    // no lo creó el panel: no es asunto nuestro
  if (link.estado === "pagado") return; // ya estaba registrado

  await prisma.linkPago.update({
    where: { id: link.id },
    data: {
      estado:           "pagado",
      pagadoAt:         new Date(),
      stripeSessionId:  sessionId,
      montoPagado,
      correoDelPagador: correo,
    },
  });

  // Un anticipo pagado convierte la cotización en venta: deja de ser una
  // propuesta en el aire y el panel tiene que decirlo sin que nadie la toque.
  if (link.cotizacionId) {
    const cot = await prisma.tourQuote.findUnique({ where: { id: link.cotizacionId } });
    if (cot && cot.status !== "aceptada") {
      await prisma.tourQuote.update({
        where: { id: cot.id },
        data:  { status: "aceptada" },
      });
    }
  }

  // Si el cobro era de una reserva, el dinero se le abona: el panel tiene que
  // reflejar que ya se cobró sin que nadie lo capture a mano.
  if (link.reservaId) {
    const reserva = await prisma.tourBooking.findUnique({ where: { id: link.reservaId } });
    if (reserva) {
      await prisma.tourBooking.update({
        where: { id: reserva.id },
        data:  { depositoPagado: (reserva.depositoPagado ?? 0) + montoPagado },
      });
    }
  }
}
