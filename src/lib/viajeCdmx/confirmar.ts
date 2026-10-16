/**
 * Un anticipo pagado se vuelve reserva. UNA sola vez.
 *
 * Lo llaman tres caminos que pueden llegar a la vez: la pantalla del cliente
 * (`/api/viaje-cdmx/confirmar`), el webhook de Stripe y la conciliación de
 * pagos (`recuperarPago.ts`). Todos corren bajo el candado de la salida y
 * revisan dentro de él si la reserva ya existe; el `@unique` de
 * `stripePaymentIntentId` es la segunda red.
 *
 * La reserva se arma con lo que guardó el SERVIDOR (el apartado y la metadata
 * que él mismo escribió), nunca con lo que mande el navegador.
 *
 * 🔴 Un pago que llega tarde sobre un lugar que ya no existe (casi imposible:
 * el apartado se suelta cancelando antes el cobro) se guarda IGUAL —el cliente
 * ya pagó— con «⚠️ SOBRECUPO» en las notas internas y un correo al equipo.
 * Nunca se esconde.
 */
import type Stripe from "stripe";
import type { TourBooking } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger, actividad, mxn, nombreCorto } from "@/lib/logger";
import { registrarCobroSilencioso } from "@/lib/admin/cobros";
import { registrarEnBitacora, pesos as pesosBitacora, SISTEMA } from "@/lib/admin/bitacora";
import { enviarCompraGA4 } from "@/lib/ga4Server";
import { conSalidaBloqueada, libres, ocupacion } from "./cupo";
import { rangoCorto } from "./precio";
import { PUNTO_SALIDA, HORA_SALIDA, VIAJE_NOMBRE, VIAJE_SLUG } from "./config";
import { correoConfirmacion, correoSobrecupo } from "./correos";

export type ResultadoConfirmacion =
  | { estado: "creada" | "ya-existia"; reserva: TourBooking; sobrecupo: boolean }
  | { estado: "no-pagado" | "no-es-del-viaje" };

export function esPagoDelViaje(pi: Stripe.PaymentIntent): boolean {
  return pi.metadata?.producto === "viaje-cdmx" && !!pi.metadata?.salidaId;
}

function nuevoFolio(): string {
  // Mismo formato que el resto de las reservas web (HP + base 36), con dos
  // letras más: dos pagos en el mismo milisegundo no chocan.
  return "HP" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 4).toUpperCase();
}

export async function confirmarPasaje(
  pi: Stripe.PaymentIntent,
  origen: "pantalla" | "webhook" | "conciliacion" | "revision",
): Promise<ResultadoConfirmacion> {
  if (!esPagoDelViaje(pi)) return { estado: "no-es-del-viaje" };
  if (pi.status !== "succeeded") return { estado: "no-pagado" };

  const meta = pi.metadata;
  const ya = await prisma.tourBooking.findUnique({ where: { stripePaymentIntentId: pi.id } });
  if (ya) return { estado: "ya-existia", reserva: ya, sobrecupo: false };

  const cobrado = Math.round((pi.amount_received || pi.amount) / 100);

  let r: { reserva: TourBooking; creada: boolean; sobrecupo: boolean; salidaTexto: string; metodo: string };
  try {
    r = await conSalidaBloqueada(meta.salidaId, async (tx, salida) => {
      const existe = await tx.tourBooking.findUnique({ where: { stripePaymentIntentId: pi.id } });
      if (existe) return { reserva: existe, creada: false, sobrecupo: false, salidaTexto: "", metodo: "" };

      const apartado = meta.holdId ? await tx.apartadoSalida.findUnique({ where: { id: meta.holdId } }) : null;
      const personas = apartado?.personas ?? Math.max(1, Number(meta.adults) || 1);
      const total = apartado?.total ?? (Number(meta.totalCompleto) || cobrado);

      // ¿Cabe? Sin contar su propio apartado: si sigue vivo, ese lugar ES suyo.
      const o = await ocupacion(tx, salida.id, new Date(), apartado?.id);
      const sobrecupo = personas > libres(salida.capacidad, o);

      const salidaTexto = rangoCorto(salida.fechaSalida, salida.fechaRegreso);
      const tourName = `${VIAJE_NOMBRE} · ${salidaTexto}`;
      const metodo = apartado?.metodo === "oxxo" ? "OXXO" : "Tarjeta";
      const cuarto = apartado?.cuarto ?? (meta.cuarto || "compartido");
      const compartirCon = apartado?.compartirCon ?? (meta.compartirCon || null);
      const locale = apartado?.locale ?? (meta.locale || "es");
      const notasInternas = [
        sobrecupo ? `⚠️ SOBRECUPO: el pago llegó cuando la salida ya estaba llena (${o.ocupados} de ${salida.capacidad}). Mover a otra fecha o subir el cupo.` : "",
        cuarto === "privado" ? "🛏️ Cuarto PRIVADO con cama king." : `Cuarto compartido${compartirCon ? ` (viaja solo: compartir con ${compartirCon})` : ""}.`,
        locale === "en" ? "🇺🇸 Apartó en inglés." : "",
        apartado?.liderCodigo ? `Viene con el líder ${apartado.liderCodigo}.` : "",
      ].filter(Boolean).join(" ");

      const reserva = await tx.tourBooking.create({
        data: {
          confirmationNumber: nuevoFolio(),
          tourId:   VIAJE_SLUG,
          tourName,
          tourSlug: VIAJE_SLUG,
          tourDate: salida.fechaSalida,
          adults:   personas,
          children: 0,
          totalAmount: total,
          depositoPagado: 0, // lo deja cuadrado el renglón de cobro, abajo
          stripePaymentIntentId: pi.id,
          customerName:  apartado?.nombre || meta.customerName || "Cliente",
          customerEmail: apartado?.email || meta.customerEmail || pi.receipt_email || "",
          customerPhone: apartado?.telefono || meta.customerPhone || null,
          salidaId: salida.id,
          origen:   "web",
          status:   cobrado >= total ? "paid" : "pending",
          lineItems: [
            {
              _meta: true,
              metodoPago:   metodo,
              numPersonas:  personas,
              salidaId:     salida.id,
              apartadoId:   apartado?.id ?? null,
              liderCodigo:  apartado?.liderCodigo ?? (meta.liderCodigo || null),
              precioUnitario: apartado?.precioUnitario ?? (Number(meta.precioUnitario) || null),
              pickupLugar:  PUNTO_SALIDA.nombre ? `${PUNTO_SALIDA.nombre} · ${HORA_SALIDA}` : `CDMX · ${HORA_SALIDA}`,
              cuarto,
              compartirCon,
              locale,
              ...(notasInternas ? { notasInternas } : {}),
            },
            {
              tourSlug: VIAJE_SLUG,
              tourName,
              tourDate: salida.fechaSalida,
              adults:   personas,
              childrenMid: 0,
              childrenSmall: 0,
              subtotal: total,
            },
          ],
        },
      });
      if (apartado) {
        await tx.apartadoSalida.update({ where: { id: apartado.id }, data: { estado: "pagado", bookingId: reserva.id } });
      }
      return { reserva, creada: true, sobrecupo, salidaTexto, metodo };
    });
  } catch (e: unknown) {
    // Otro camino la creó entre la primera búsqueda y el candado.
    if ((e as { code?: string })?.code === "P2002") {
      const otra = await prisma.tourBooking.findUnique({ where: { stripePaymentIntentId: pi.id } });
      if (otra) return { estado: "ya-existia", reserva: otra, sobrecupo: false };
    }
    throw e;
  }

  if (!r.creada) return { estado: "ya-existia", reserva: r.reserva, sobrecupo: false };
  const reserva = r.reserva;

  // ── Lo que pasa UNA vez, después de guardar ───────────────────────────
  // Nada de esto puede tumbar la confirmación: el cliente ya pagó.
  if (cobrado > 0) {
    await registrarCobroSilencioso({
      reservaId: reserva.id, monto: cobrado, metodo: "stripe",
      nota: `Anticipo en línea del viaje (${r.metodo} por Stripe)`,
      sinRescate: true,
    });
  }

  await registrarEnBitacora({
    accion:     "creó",
    entidad:    "reserva",
    referencia: reserva.confirmationNumber,
    resumen:    `Viaje CDMX ${r.salidaTexto}: ${reserva.customerName}, ${reserva.adults} persona${reserva.adults === 1 ? "" : "s"}, anticipo ${pesosBitacora(cobrado)} de ${pesosBitacora(reserva.totalAmount)}${r.sobrecupo ? " — ⚠️ SOBRECUPO" : ""} (${origen})`,
    actor:      SISTEMA,
  });

  actividad(
    r.sobrecupo ? "⚠️  VIAJE CDMX SOBRECUPO" : "✅  APARTÓ VIAJE CDMX",
    nombreCorto(r.salidaTexto),
    `${reserva.adults} persona${reserva.adults === 1 ? "" : "s"}`,
    mxn(cobrado),
    reserva.customerName,
    reserva.confirmationNumber,
    origen,
  );

  enviarCompraGA4({
    transactionId: reserva.confirmationNumber,
    clientId:      pi.metadata.gaClientId || null,
    value:         cobrado,
    reservaTotal:  reserva.totalAmount,
    paymentPlan:   Math.round((cobrado / Math.max(1, reserva.totalAmount)) * 100),
    items: [{ item_id: VIAJE_SLUG, item_name: reserva.tourName, price: Math.round(reserva.totalAmount / Math.max(1, reserva.adults)), quantity: reserva.adults }],
  }).catch(() => {});

  try {
    await correoConfirmacion(reserva.id);
  } catch (e) {
    logger.error("viaje_cdmx_correo_confirmacion_fallo", { reserva: reserva.confirmationNumber, reason: e instanceof Error ? e.message : String(e) });
  }
  if (r.sobrecupo) {
    await correoSobrecupo(reserva.id).catch((e: unknown) =>
      logger.error("viaje_cdmx_correo_sobrecupo_fallo", { reserva: reserva.confirmationNumber, reason: e instanceof Error ? e.message : String(e) }));
  }

  return { estado: "creada", reserva, sobrecupo: r.sobrecupo };
}
