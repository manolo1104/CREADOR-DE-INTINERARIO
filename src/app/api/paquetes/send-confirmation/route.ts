import { NextRequest, NextResponse } from "next/server";
import { sendBrevoEmail } from "@/lib/brevo";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { rateLimit } from "@/lib/rateLimit";
import { getPaquete } from "@/lib/paquetes";
import { actividad, mxn } from "@/lib/logger";
import { getEmails, emailLocale } from "@/lib/i18n/emails";
import { buildPaqueteConfirmEmailHtml, fechaLarga } from "@/lib/paqueteEmail";
import { TOURS_DB } from "@/lib/tours";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const fmx = (n: number) => `$${Math.round(n).toLocaleString("es-MX")} MXN`;

/** "2026-10-01" + N días → "2026-10-02". Vacío si no hay fecha base. */
function sumarDias(ymd: string, dias: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "";
  const d = new Date(`${ymd}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { key: "paquete-send-confirmation", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const body = await req.json();
    const { email, customerName, customerPhone, notes, paymentIntentId, slug, pct, personas, fecha, locale } = body;
    const L = emailLocale(locale);
    const T = getEmails(L).paquete;

    if (!paymentIntentId || typeof paymentIntentId !== "string") {
      return NextResponse.json({ error: "Pago no verificado." }, { status: 400 });
    }

    let pi;
    try {
      pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch {
      return NextResponse.json({ error: "Pago no verificado." }, { status: 400 });
    }
    if (pi.status !== "succeeded") {
      return NextResponse.json({ error: "El pago no está completado." }, { status: 402 });
    }

    const meta = pi.metadata ?? {};
    const paquete = getPaquete(slug) || (meta.tourSlug ? getPaquete(meta.tourSlug) : undefined);
    if (!paquete) {
      return NextResponse.json({ error: "Paquete no encontrado." }, { status: 400 });
    }

    // ── Montos AUTORITATIVOS ──────────────────────────────────────────────
    // `cobrado` es lo que confirmó Stripe. El TOTAL sale de la metadata, que la
    // escribió `computePaqueteCharge` en el servidor al crear el pago.
    //
    // 🔴 El bug que esto arregla: aquí se usaba `paquete.precio`, que es el
    // precio de folleto POR PAREJA. Con menores, gente extra, noche extra o
    // habitación Jungla el total real es MUCHO mayor, así que la reserva
    // quedaba grabada con un total corto y el saldo por cobrar salía chiquito
    // en el correo, en el panel, en los KPIs y en el voucher que se le entrega
    // al cliente. En un Gran Huasteca de 5 personas con noche extra al 30 % se
    // perdían $29,575 de saldo que nadie iba a cobrar.
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

    const fechaInicio  = String(fecha || meta.tourDate || "");
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
      return NextResponse.json({ status: "ok", confirmationNumber: existing.confirmationNumber });
    }

    let confirmationNumber = "HP" + Date.now().toString(36).toUpperCase();

    // ── Itinerario y hospedaje para el panel ──────────────────────────────
    // Sin esto la ficha del admin no tenía ni itinerario ni bloque de hotel:
    // un paquete —que ES hotel + tours— se veía como un renglón suelto.
    //
    // Los renglones van SIN `subtotal` a propósito: el precio del paquete es un
    // paquete, no la suma de sus partes, y poner cifras inventadas dispararía el
    // aviso de "las líneas no cuadran con el total" en la ficha del admin.
    const eleccionNombre = paquete.eleccionTour?.opciones
      .find((o) => o.slug === tourElegido)?.nombre || "";
    const lineItems = paquete.itinerario
      .filter((d) => d.tourSlug)
      .map((d) => {
        // El día "a elegir" se graba con el tour que ELIGIÓ el cliente, no con
        // el que trae el catálogo por defecto.
        const esDiaElegible = paquete.eleccionTour?.dia === d.dia && !!tourElegido;
        const slugReal = esDiaElegible ? tourElegido : d.tourSlug!;
        const tour = TOURS_DB.find((t) => t.slug === slugReal);
        return {
          tourSlug:      slugReal,
          tourName:      tour?.nombre || d.titulo,
          tourDate:      sumarDias(fechaInicio, d.dia - 1),
          adults:        adultos,
          childrenMid:   nMid,
          childrenSmall: nSmall,
        };
      });
    const packageItems = [{
      hotel:        "Hotel Paraíso Encantado",
      habitacion:   habitacion || (L === "en" ? "Room" : "Habitación"),
      noches:       nochesHotel,
      habitaciones: repartoHab ? repartoHab.split("+").length : 1,
      checkin,
      checkout,
    }];

    const notesFull = [
      `Paquete: ${paquete.nombre} (${paquete.duracion})`,
      `Grupo: ${adultos} adulto(s)${nMid ? `, ${nMid} niño(s) 6–10` : ""}${nSmall ? `, ${nSmall} menor(es) de 6` : ""}`,
      habitacion ? `Habitación: ${habitacion}` : null,
      repartoHab ? `Reparto por habitación: ${repartoHab}` : null,
      `Noches de hotel: ${nochesHotel}${nocheExtra ? " (incluye noche extra — entra la víspera, check-in 3 PM)" : ""}`,
      checkin ? `Entrada: ${checkin}${checkout ? ` · Salida: ${checkout}` : ""}` : null,
      eleccionNombre ? `Día ${paquete.eleccionTour?.dia} elegido: ${eleccionNombre}` : null,
      `Pago inicial: ${pctNum}% (${fmx(cobrado)})`,
      pendiente > 0 ? `Saldo pendiente: ${fmx(pendiente)}` : "Pagado 100%",
      L === "en" ? "⚠️ CLIENTE DE HABLA INGLESA: reservó desde la versión en inglés del sitio." : null,
      notes ? `Notas: ${notes}` : null,
    ].filter(Boolean).join(" | ");

    try {
      await prisma.tourBooking.create({
        data: {
          confirmationNumber,
          tourId:                paquete.slug,
          tourName:              `Paquete · ${paquete.nombre}`,
          tourSlug:              paquete.slug,
          tourDate:              fechaInicio,
          adults:                adultos,
          children:              nNinos,
          totalAmount:           totalFull,   // total REAL, ya con extras
          depositoPagado:        cobrado,     // lo cobrado ahora (30/50/100%)
          stripePaymentIntentId: paymentIntentId,
          customerName,
          customerEmail:         email,
          customerPhone:         customerPhone || null,
          notes:                 notesFull,
          // El idioma viaja en el objeto `_meta`, patrón del proyecto: sin él,
          // reenviar la confirmación desde el panel la mandaría en español.
          lineItems:             [...lineItems, { _meta: true, locale: L }],
          packageItems,
          status:                "paid",
        },
      });
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
        // Carrera con el webhook: ya existe la reserva de este pago. Reusamos su
        // número real; el @unique impidió el duplicado.
        const ya = await prisma.tourBooking.findFirst({ where: { stripePaymentIntentId: paymentIntentId } });
        if (ya) confirmationNumber = ya.confirmationNumber;
      } else {
        console.error("❌ prisma paquete booking:", e.message);
      }
    }

    if (email?.includes("@")) {
      try {
        const adminTo = process.env.ADMIN_EMAIL_TOURS || "daftpunkmanolo@gmail.com";
        const { subject, html } = buildPaqueteConfirmEmailHtml({
          locale: L, paquete, confirmationNumber,
          customerName, fechaInicio,
          adultos, nMid, nSmall,
          habitacion, checkin, nochesHotel, nocheExtra,
          eleccionNombre, lineItems,
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

    return NextResponse.json({ status: "ok", confirmationNumber, cobrado, totalFull, pendiente });
  } catch (e: any) {
    console.error("❌ send-confirmation paquete crítico:", e.message);
    return NextResponse.json({ error: "No se pudo procesar la confirmación." }, { status: 500 });
  }
}
