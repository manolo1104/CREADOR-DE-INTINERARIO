/**
 * La reserva de un PAQUETE pagado (11 oct 2026). Antes vivía dentro de
 * `api/paquetes/send-confirmation` y el webhook no podía usarla: cuando el
 * cliente cerraba la pestaña, el webhook guardaba el paquete como un tour
 * suelto —sin los recorridos elegidos, sin cuarto ni fechas de hotel, y sin que
 * sus tours ocuparan lugar— y le mandaba el correo de TOUR, no el de paquete.
 *
 * Ahora la pantalla de confirmación y el webhook (`lib/recuperarPago.ts`) arman
 * la reserva con lo mismo: casi todo viaja en la metadata del cobro, que
 * escribió el servidor en `create-payment-intent`. La pantalla aporta además el
 * teléfono y las notas, que no caben en la metadata.
 *
 * Solo quien CREA la fila manda el correo: si la reserva ya existía, nadie
 * vuelve a escribirle al cliente.
 */
import type Stripe from "stripe";
import { sendBrevoEmail } from "@/lib/brevo";
import { prisma } from "@/lib/prisma";
import { getPaquete } from "@/lib/paquetes";
import { haciaLa } from "@/lib/nocheXantolo";
import { actividad, mxn } from "@/lib/logger";
import { getEmails, emailLocale } from "@/lib/i18n/emails";
import { buildPaqueteConfirmEmailHtml } from "@/lib/paqueteEmail";
import { TOURS_DB } from "@/lib/tours";
import { parseEleccion } from "@/lib/paquetePricing";
import { registrarCobroSilencioso } from "@/lib/admin/cobros";
import { cerrarCarritosDe } from "@/lib/cerrarCarrito";
import { revisarSobrecupo } from "@/lib/sobrecupo";
import fs from "fs";
import path from "path";

const fmx = (n: number) => `$${Math.round(n).toLocaleString("es-MX")} MXN`;

/** Lo que escribe el cliente va al HTML del correo: sin etiquetas. */
const sinEtiquetas = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** "2026-10-01" + N días → "2026-10-02". Vacío si no hay fecha base. */
function sumarDias(ymd: string, dias: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "";
  const d = new Date(`${ymd}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

export interface DatosClientePaquete {
  email:          string;
  customerName:   string;
  customerPhone?: string | null;
  notes?:         string | null;
  locale?:        unknown;
  /** Respaldo del navegador; la metadata manda. */
  slug?:          unknown;
  pct?:           unknown;
  personas?:      unknown;
  fecha?:         unknown;
}

export type ResultadoReservaPaquete =
  | { estado: "creada" | "ya-existia"; confirmationNumber: string; cobrado: number; totalFull: number; pendiente: number }
  | { estado: "error"; motivo: string };

export async function registrarReservaPaquete(
  pi: Stripe.PaymentIntent,
  d: DatosClientePaquete,
  origen: "pantalla" | "webhook",
): Promise<ResultadoReservaPaquete> {
  const { email, customerName, customerPhone, notes, pct, personas, fecha } = d;
  const paymentIntentId = pi.id;
  const L = emailLocale(d.locale as string | undefined);
  const T = getEmails(L).paquete;

  const meta = pi.metadata ?? {};
  // El paquete sale de la metadata, que escribió el servidor al crear el
  // cobro; el del navegador es solo respaldo (antes mandaba el del cuerpo, y
  // un cuerpo alterado podía etiquetar la reserva con otro paquete).
  const paquete = (meta.tourSlug ? getPaquete(meta.tourSlug) : undefined) || getPaquete(String(d.slug ?? ""));
  if (!paquete) return { estado: "error", motivo: "Paquete no encontrado." };

  // ── Montos AUTORITATIVOS ──────────────────────────────────────────────
  // `cobrado` es lo que confirmó Stripe. El TOTAL sale de la metadata, que la
  // escribió `computePaqueteCharge` en el servidor al crear el pago.
  //
  // 🔴 El bug que esto arregla: aquí se usaba `paquete.precio`, que es el
  // precio de folleto POR PAREJA. Con menores, gente extra, noche extra o
  // habitación Jungla el total real es MUCHO mayor, así que la reserva
  // quedaba grabada con un total corto y el saldo por cobrar salía chiquito
  // en el correo, en el panel, en los KPIs y en el voucher que se le entrega
  // al cliente. Cuando se detectó, una Odisea Huasteca —que entonces se
  // llamaba Gran Huasteca— de 5 personas con noche extra al 30 % perdía
  // $29,575 de saldo que nadie iba a cobrar. Esa cifra está medida con los
  // precios de entonces; los cinco paquetes de hoy cuestan otra cosa, pero el
  // agujero era de la fórmula, no del catálogo, así que renombrar o cambiar
  // paquetes no lo cierra: lo cierra leer el total de la metadata.
  const cobrado   = Math.round((pi.amount_received || pi.amount) / 100);
  const totalMeta = Math.round(Number(meta.totalCompleto) || 0);
  const totalFull = totalMeta > 0 ? totalMeta : paquete.precio;
  const pendiente = Math.max(0, totalFull - cobrado);
  const pctNum    = Number(pct) || Number(meta.paquetePct)
    || (totalFull > 0 ? Math.min(100, Math.round((cobrado / totalFull) * 100)) : 100);

  // ── El grupo, con sus tramos ──────────────────────────────────────────
  // También de la metadata: el cuerpo de la petición solo manda `personas`,
  // que son los ADULTOS. Guardarlo tal cual metía a una familia de 2 adultos
  // y 3 niños al panel como "2 personas".
  const adultos = Number(meta.adults) || Number(personas) || 2;
  const nMid    = Number(meta.childrenMid)   || 0;
  const nSmall  = Number(meta.childrenSmall) || 0;
  const nNinos  = (nMid + nSmall) || Number(meta.children) || 0;

  // Un paquete de evento tiene SU fecha: no se toma la del navegador.
  const fechaInicio  = paquete.evento ? paquete.evento.fecha : String(fecha || meta.tourDate || "");
  const habitacion   = meta.habitacion || "";
  const nocheExtra   = String(meta.nocheExtra || "").startsWith("sí");
  const nochesHotel  = Number(meta.nochesHotel) || paquete.noches;
  const repartoHab   = meta.repartoHab || "";
  const tourElegido  = meta.tourElegido || "";
  // Con noche extra el cliente entra la víspera del día 1.
  const checkin      = nocheExtra ? sumarDias(fechaInicio, -1) : fechaInicio;
  const checkout     = checkin ? sumarDias(checkin, nochesHotel) : "";

  // Idempotencia
  const existing = await prisma.tourBooking.findFirst({ where: { stripePaymentIntentId: paymentIntentId } });
  if (existing) {
    // La creó el webhook (el cliente tardó o cerró la pestaña y volvió): se
    // le suma lo que solo trae la pantalla, sin otro correo.
    if (origen === "pantalla" && customerPhone && !existing.customerPhone) {
      await prisma.tourBooking.update({
        where: { id: existing.id },
        data:  { customerPhone, notes: notes ? `${existing.notes ?? ""} | Notas: ${notes}` : existing.notes },
      }).catch(() => {});
    }
    return { estado: "ya-existia", confirmationNumber: existing.confirmationNumber, cobrado, totalFull, pendiente };
  }

  let confirmationNumber = "HP" + Date.now().toString(36).toUpperCase();

  // ── Itinerario y hospedaje para el panel ──────────────────────────────
  // Sin esto la ficha del admin no tenía ni itinerario ni bloque de hotel:
  // un paquete —que ES hotel + tours— se veía como un renglón suelto.
  //
  // Los renglones van SIN `subtotal` a propósito: el precio del paquete es un
  // paquete, no la suma de sus partes, y poner cifras inventadas dispararía el
  // aviso de "las líneas no cuadran con el total" en la ficha del admin.
  const elegidos = parseEleccion(tourElegido);
  const eleccionNombre = elegidos
    .map((slug) => paquete.eleccionTour?.opciones.find((o) => o.slug === slug)?.nombre || slug)
    .join(", ");

  /**
   * El itinerario a la carta no nombra ningún tour: los pone el cliente. Sin
   * esto, la ficha del admin y el correo de un paquete de cuatro recorridos
   * salían con el itinerario VACÍO y el guía no sabía a dónde llevar a nadie.
   * Los recorridos se reparten en los días de tour en el orden en que los
   * eligió, que es el orden que luego se acomoda con él.
   */
  const aLaCarta = !paquete.itinerario.some((d) => d.tourSlug);
  const diasDeTour = paquete.itinerario.filter((d) => d.tipo === "tour");

  const renglon = (slug: string, dia: number, titulo: string) => {
    const tour = TOURS_DB.find((t) => t.slug === slug);
    return {
      tourSlug:      slug,
      tourName:      tour?.nombre || titulo,
      tourDate:      sumarDias(fechaInicio, dia - 1),
      adults:        adultos,
      childrenMid:   nMid,
      childrenSmall: nSmall,
    };
  };

  const lineItems = aLaCarta
    ? elegidos.map((slug, i) =>
        renglon(slug, diasDeTour[i]?.dia ?? i + 1, diasDeTour[i]?.titulo ?? ""))
    : paquete.itinerario
        .filter((d) => d.tourSlug)
        .map((d) => {
          // El día "a elegir" se graba con el tour que ELIGIÓ el cliente, no
          // con el que trae el catálogo por defecto.
          const esDiaElegible = paquete.eleccionTour?.dia === d.dia && elegidos.length === 1;
          return renglon(esDiaElegible ? elegidos[0] : d.tourSlug!, d.dia, d.titulo);
        });
  // La Noche de Xantolo no lleva hotel: ni bloque de hospedaje en el panel ni
  // renglones de entrada y salida en el correo.
  const sinHotel = !!paquete.evento?.sinHotel;
  const recogida = String(meta.recogida || "").trim();
  /**
   * El día completo agregado a la noche (la Ruta Surrealista, 10 oct 2026).
   * Cambia la operación —hay una salida de mañana además de la de la noche—,
   * así que va en el nombre de la reserva y en la nota del equipo.
   */
  const conTour  = String(meta.conTour || "") === "sí" && !!paquete.evento?.tourOpcional;
  const nombreReserva = sinHotel
    ? `${paquete.nombre}${conTour ? ` + ${paquete.evento!.tourOpcional!.nombre}` : ""} · ${paquete.evento!.fechaTexto}`
    : `Paquete · ${paquete.nombre}`;
  /**
   * El itinerario de la noche no nombra ningún tour (lo suyo es la noche), así
   * que `lineItems` sale vacío. Con el día agregado sí hay un recorrido que
   * operar y que el cliente tiene que ver en su confirmación: se añade aquí.
   */
  const renglones = conTour
    ? [...lineItems, renglon(paquete.evento!.tourOpcional!.tourSlug, 1, paquete.evento!.tourOpcional!.nombreLargo)]
    : lineItems;

  const packageItems = sinHotel ? [] : [{
    hotel:        "Hotel Paraíso Encantado",
    habitacion:   habitacion || (L === "en" ? "Room" : "Habitación"),
    noches:       nochesHotel,
    habitaciones: repartoHab ? repartoHab.split("+").length : 1,
    checkin,
    checkout,
  }];

  // ¿Cabían sus recorridos (y la Ruta del combo)? Ya pagó: entra marcada.
  const avisoCupo = await revisarSobrecupo(renglones, { folio: confirmationNumber, cliente: customerName });

  const notesFull = [
    avisoCupo,
    origen === "webhook" ? "Reserva registrada por el webhook: el cliente pagó pero no llegó a la pantalla de confirmación (sin teléfono ni notas)." : null,
    sinHotel ? nombreReserva : `Paquete: ${paquete.nombre} (${paquete.duracion})`,
    `Grupo: ${adultos} adulto(s)${nMid ? `, ${nMid} niño(s) 6–10` : ""}${nSmall ? `, ${nSmall} menor(es) de 6` : ""}`,
    conTour ? `⚠️ CON ${paquete.evento!.tourOpcional!.nombre.toUpperCase()} ESE DÍA: sale ${paquete.evento!.tourOpcional!.horaRecogida} (dos salidas, la del día y la de la noche)` : null,
    sinHotel && recogida ? `RECOGER EN: ${recogida} (${paquete.evento!.horario ?? ""})` : null,
    // Ciudad Valles (11 oct 2026): otra hora de salida y de regreso, y un
    // cargo por grupo que ya va en el total.
    sinHotel && Number(meta.extraTraslado) > 0 && paquete.evento?.desdeValles
      ? `🚐 DESDE CIUDAD VALLES (traslado cobrado ${fmx(Number(meta.extraTraslado))} por grupo): ${conTour ? "por la mañana, acordarle la hora" : `pasar por ellos ${haciaLa(paquete.evento.desdeValles.recogidaNoche)}`} y dejarlos allá ${haciaLa(paquete.evento.desdeValles.regreso)}`
      : null,
    habitacion && !sinHotel ? `Habitación: ${habitacion}` : null,
    repartoHab ? `Reparto por habitación: ${repartoHab}` : null,
    sinHotel ? null : `Noches de hotel: ${nochesHotel}${nocheExtra ? " (incluye noche extra — entra la víspera, check-in 3 PM)" : ""}`,
    checkin && !sinHotel ? `Entrada: ${checkin}${checkout ? ` · Salida: ${checkout}` : ""}` : null,
    eleccionNombre
      ? (aLaCarta || paquete.eleccionTour?.dia === undefined
          ? `Recorridos elegidos: ${eleccionNombre}`
          : `Día ${paquete.eleccionTour?.dia} elegido: ${eleccionNombre}`)
      : null,
    // Lo que el equipo tiene que operar esa noche y que no sale del catálogo.
    paquete.evento ? paquete.evento.notaEquipo : null,
    `Pago inicial: ${pctNum}% (${fmx(cobrado)})`,
    pendiente > 0 ? `Saldo pendiente: ${fmx(pendiente)}` : "Pagado 100%",
    L === "en" ? "⚠️ CLIENTE DE HABLA INGLESA: reservó desde la versión en inglés del sitio." : null,
    notes ? `Notas: ${notes}` : null,
  ].filter(Boolean).join(" | ");

  try {
    const reserva = await prisma.tourBooking.create({
      data: {
        confirmationNumber,
        tourId:                paquete.slug,
        tourName:              nombreReserva,
        tourSlug:              paquete.slug,
        tourDate:              fechaInicio,
        adults:                adultos,
        children:              nNinos,
        totalAmount:           totalFull,   // total REAL, ya con extras
        depositoPagado:        cobrado,     // lo cobrado ahora (30/50/100%)
        stripePaymentIntentId: paymentIntentId,
        customerName,
        customerEmail:         email || "pendiente@desconocido",
        customerPhone:         customerPhone || null,
        notes:                 notesFull,
        // El idioma viaja en el objeto `_meta`, patrón del proyecto: sin él,
        // reenviar la confirmación desde el panel la mandaría en español.
        lineItems:             [...renglones, { _meta: true, locale: L }],
        packageItems,
        // Con saldo es «pending», como en el panel (`ReservasClient`): un
        // anticipo del 30 % marcado «paid» salía de la lista de pendientes.
        status:                pendiente > 0 ? "pending" : "paid",
      },
    });
    // El renglón de cobro del corte, como en las reservas de tour: sin él, el
    // pago con tarjeta de un paquete no salía en «cómo entró el dinero».
    if (cobrado > 0) {
      await registrarCobroSilencioso({
        reservaId: reserva.id, monto: cobrado, metodo: "stripe",
        nota: origen === "webhook" ? "Pago en línea recuperado por el webhook" : "Pago en línea", sinRescate: true,
      });
    }
    const anticipo = pctNum === 100 ? "pago completo" : `anticipo ${pctNum}%`;
    actividad(
      "✅  RESERVÓ PAQUETE",
      paquete.nombre,
      T.grupoLinea(adultos, nMid, nSmall),
      anticipo,
      `${mxn(cobrado)} de ${mxn(totalFull)}`,
      pendiente > 0 ? `saldo ${mxn(pendiente)}` : "liquidado",
      customerName,
      email,
      customerPhone,
      fechaInicio,
      confirmationNumber,
    );
  } catch (e: any) {
    if (e?.code === "P2002") {
      // Carrera con el webhook: ya existe la reserva de este pago y quien la
      // creó ya mandó el correo. El @unique impidió el duplicado.
      const ya = await prisma.tourBooking.findFirst({ where: { stripePaymentIntentId: paymentIntentId } });
      return { estado: "ya-existia", confirmationNumber: ya?.confirmationNumber ?? confirmationNumber, cobrado, totalFull, pendiente };
    }
    // 🔴 Antes se anotaba en el log y se seguía: el cliente recibía un correo
    // con un folio que no existía en la base y nadie volvía a intentarlo.
    // Ahora no hay correo, y como no quedó fila, el webhook o la conciliación
    // (`/api/cron/conciliar-pagos`) la crean después.
    console.error("❌ prisma paquete booking:", e.message);
    return { estado: "error", motivo: e?.message || "desconocido" };
  }

  // Ya pagó: sus recordatorios de «olvidaste tu paquete» se apagan (antes solo
  // lo hacía el flujo de tours, y el comprador seguía recibiéndolos).
  await cerrarCarritosDe(email, [
    { tourSlug: paquete.slug, tourDate: fechaInicio },
    { tourSlug: paquete.slug, tourDate: "" },
  ]);

  if (email?.includes("@")) {
    try {
      const adminTo = process.env.ADMIN_EMAIL_TOURS || "daftpunkmanolo@gmail.com";
      const { subject, html } = buildPaqueteConfirmEmailHtml({
        locale: L, paquete, confirmationNumber,
        customerName, fechaInicio,
        adultos, nMid, nSmall,
        habitacion: sinHotel ? "" : habitacion,
        checkin: sinHotel ? "" : checkin,
        nochesHotel, nocheExtra,
        horario:  sinHotel ? paquete.evento!.horario : undefined,
        // La frase para el cliente; la de `recogida` es la del equipo.
        recogida: sinHotel ? sinEtiquetas(String(meta.recogidaCliente || recogida)) : undefined,
        eleccionNombre, lineItems: renglones,
        totalFull, cobrado, pendiente, pctNum,
      });

      // La guía en PDF, igual que en la confirmación de tours. Si el archivo
      // no está, el correo sale de todos modos.
      let adjuntos: { name: string; content: string }[] = [];
      try {
        const pdfPath = path.join(process.cwd(), "public", "guia-huasteca-potosina.pdf");
        adjuntos = [{ name: "Guia-Huasteca-Potosina.pdf", content: fs.readFileSync(pdfPath).toString("base64") }];
      } catch { /* sin PDF, el correo igual se envía */ }

      await sendBrevoEmail({
        to:  [{ email, name: customerName }],
        bcc: [{ email: adminTo }],
        subject,
        htmlContent: html,
        attachments: adjuntos,
      });
      actividad("📧  CORREO PAQUETE ENVIADO", paquete.nombre, email, confirmationNumber);
    } catch (e: any) {
      console.error("❌ Brevo paquete email:", e.message);
    }
  }

  return { estado: "creada", confirmationNumber, cobrado, totalFull, pendiente };
}
