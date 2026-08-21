import { NextRequest, NextResponse } from "next/server";
import { sendBrevoEmail } from "@/lib/brevo";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { rateLimit } from "@/lib/rateLimit";
import { getPaquete } from "@/lib/paquetes";
import { actividad, mxn } from "@/lib/logger";
import { getEmails, emailLocale } from "@/lib/i18n/emails";
import { localizePaquete } from "@/lib/i18n/paquetes.en";
import { localizeTour } from "@/lib/i18n/localize";
import { TOURS_DB } from "@/lib/tours";
import type { Locale } from "@/lib/i18n/config";
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

function fechaLarga(ymd: string, locale: Locale): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "";
  const f = new Date(`${ymd}T12:00:00`).toLocaleDateString(
    locale === "en" ? "en-US" : "es-MX",
    { weekday: "long", day: "numeric", month: "long", year: "numeric" },
  );
  return f.charAt(0).toUpperCase() + f.slice(1);
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
        const paqueteLoc = localizePaquete(paquete, L);
        const fila = (k: string, v: string, extra = "") =>
          `<tr><td style="padding:6px 0;color:#666">${k}</td><td style="text-align:right;${extra}">${v}</td></tr>`;

        // El itinerario con fechas reales: antes el correo del producto más caro
        // no decía ni a dónde se iba cada día.
        const itinerarioHtml = lineItems.length
          ? `<p style="margin:22px 0 6px;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#8a7a5a">${T.tuItinerario}</p>
             <table style="width:100%;border-collapse:collapse;font-size:14px">
               ${lineItems.map((l, i) => {
                 const base = TOURS_DB.find((t) => t.slug === l.tourSlug);
                 const nombre = base ? localizeTour(base, L).nombre : l.tourName;
                 const dia = paquete.itinerario.filter((d) => d.tourSlug)[i]?.dia ?? i + 1;
                 return `<tr>
                   <td style="padding:6px 0;color:#666;white-space:nowrap;vertical-align:top">${T.diaN(dia)}</td>
                   <td style="text-align:right;padding:6px 0">${nombre}${l.tourDate ? `<br><span style="color:#8a7a5a;font-size:12px">${fechaLarga(l.tourDate, L)}</span>` : ""}</td>
                 </tr>`;
               }).join("")}
             </table>`
          : "";

        const incluyeHtml = paqueteLoc.incluye?.length
          ? `<p style="margin:22px 0 6px;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#8a7a5a">${T.todoIncluido}</p>
             <ul style="margin:0;padding-left:18px;font-size:13px;color:#3a3a2e;line-height:1.8">
               ${paqueteLoc.incluye.map((x) => `<li>${x}</li>`).join("")}
             </ul>`
          : "";

        const html = `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1a2e1a">
            <h2 style="color:#1a2e1a">${T.titulo}</h2>
            <p>${T.saludo(customerName || "")}</p>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              ${fila(T.confirmacion, confirmationNumber, "font-weight:bold")}
              ${fila(T.paquete, `${paqueteLoc.nombre} · ${paqueteLoc.duracion}`)}
              ${fechaInicio ? fila(T.fechaTentativa, fechaLarga(fechaInicio, L) || fechaInicio) : ""}
              ${fila(T.personas, T.grupoLinea(adultos, nMid, nSmall))}
              ${habitacion ? fila(T.habitacion, habitacion) : ""}
              ${checkin ? fila(T.entradaHotel, `${fechaLarga(checkin, L)} · ${T.noches(nochesHotel)}`) : ""}
              ${nocheExtra ? `<tr><td colspan="2" style="padding:4px 0;color:#3a6b1a;font-size:13px">${T.nocheExtraNota}</td></tr>` : ""}
              ${eleccionNombre && paquete.eleccionTour ? fila(T.eligeDia(paquete.eleccionTour.dia), eleccionNombre) : ""}
            </table>
            ${itinerarioHtml}
            <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:22px;border-top:1px solid #d4ccbc">
              ${fila(T.precio, fmx(totalFull))}
              ${fila(T.pagoInicial(pctNum), fmx(cobrado), "color:#3a6b1a;font-weight:bold")}
              ${pendiente > 0 ? fila(T.saldoPendiente, fmx(pendiente), "color:#9a4a1e") : ""}
            </table>
            <p style="font-size:13px;color:#666">${pendiente > 0 ? T.notaSaldo : T.notaLiquidado}</p>
            ${incluyeHtml}
            <p style="font-size:13px;color:#666;margin-top:22px">${T.guiaAdjunta}</p>
            <p style="font-size:13px">${T.dudas}</p>
          </div>`;

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
          subject: T.subject(confirmationNumber),
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
