"use client";

import { personasDeItem } from "@/lib/carrito";
import { formatMXN, formatTourDate } from "@/lib/tourBooking";
import { TOURS_DB, incluyeDeTour, fraseRecogida } from "@/lib/tours";
import { serviciosHotel } from "@/lib/habitaciones";
import { localizeTour } from "@/lib/i18n/localize";
import { ResumenReserva } from "@/components/booking/ResumenReserva";
import { nombreCorto } from "@/components/carrito/carritoComun";
import type { CarritoCheckout } from "@/components/carrito/useCarritoCheckout";

/**
 * El resumen del carrito (recorridos, hospedaje y los números) con el mismo
 * `ResumenReserva` que el checkout de un tour: qué se aparta, qué va incluido
 * en cada recorrido, la logística y lo que se paga hoy.
 */
export function ResumenCarrito({ c }: { c: CarritoCheckout }) {
  const {
    locale, en, t, items, hotelQuote, checkin, checkout, noches, totalHotel,
    total, anticipo, saldo, pctHoy, resumen, cancelacionDe,
  } = c;
  return (
    <ResumenReserva
      items={[...items.map((i) => {
        const base = TOURS_DB.find((x) => x.slug === i.tourSlug);
        const tour = base ? localizeTour(base, locale) : undefined;
        return {
          nombre:  nombreCorto(i.tourSlug, i.tourName, locale),
          fecha:   i.tourDate,
          detalle: i.unidades
            ? `${i.ruta} · ${i.unidades} × ${i.vehiculo}`
            : t.personas(personasDeItem(i)),
          subtotal: i.total,
          incluye:  incluyeDeTour({ incluye: tour?.incluye ?? [] }, locale),
          eleccion: i.eleccion,
          recogida: base ? fraseRecogida(base, en) : undefined,
          cancelacion: base ? (cancelacionDe(base) || undefined) : undefined,
          // Las actividades opcionales se cobran, así que tienen que
          // verse en el resumen. Se contratan en el renglón de arriba y
          // no aparecían por ningún lado antes de pagar.
          addOns: (i.addOns ?? []).map((a) => {
            const cat = tour?.addOns?.find((x) => x.id === a.id);
            return {
              nombre:   cat?.nombre ?? a.id,
              cantidad: a.cantidad,
              subtotal: (cat?.precio ?? 0) * a.cantidad,
            };
          }),
        };
      }), ...(hotelQuote?.ok ? [{
        nombre:  t.hospedajeRenglon("Hotel Paraíso Encantado"),
        // Fechas de verdad, no "Falta la fecha": el hospedaje va de un
        // día a otro y ya se eligieron arriba.
        fechaTexto: `${formatTourDate(checkin, locale)} → ${formatTourDate(checkout, locale)} · ${t.noches(noches)}`,
        // Qué habitación y cuánta gente duerme en cada una.
        detalle: (hotelQuote.desglose ?? [])
          .map((d) => `${d.habitacion} (${t.personas(d.huespedes)})`)
          .join(" + "),
        extras:  serviciosHotel(locale),
        subtotal: totalHotel,
        incluye: [
          ...(hotelQuote.desglose ?? []).map(
            (d) => `${d.habitacion} · ${t.personas(d.huespedes)} · ${t.porNoche(formatMXN(d.porNoche))}`,
          ),
          ...((hotelQuote.nochesGratis ?? 0) > 0
            ? [t.nochesGratisLinea(hotelQuote.nochesGratis ?? 0, formatMXN(hotelQuote.ahorro ?? 0))]
            : []),
          ...serviciosHotel(locale),
        ],
      }] : [])]}
      total={total}
      pagaHoy={anticipo}
      saldo={saldo}
      pct={pctHoy}
      ahorroMultiple={resumen.ahorroMultiple}
    />
  );
}
