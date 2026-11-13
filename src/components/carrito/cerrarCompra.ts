"use client";

// El cierre de una compra del carrito ya cobrada: el folio (send-confirmation),
// la venta en GA4, la pantalla de éxito y el carrito vacío. Salió de
// `PagoCarrito` (13 nov 2026) para que el PAGO EXPRÉS (Apple Pay / Google Pay
// desde el paso 1) cierre EXACTAMENTE igual: mismas notas para el equipo, misma
// reserva y mismo correo.

import { ID_TRASLADO_VALLES } from "@/lib/tourPricing";
import { vaciarCarrito } from "@/lib/carrito";
import { limpiarExtras } from "@/lib/carritoExtras";
import { getBooking } from "@/lib/i18n/booking";
import type { Locale } from "@/lib/i18n/config";
import { trackTourEvent } from "@/lib/tourTracker";
import { trackPurchase } from "@/lib/analytics";
import { TOURS_DB } from "@/lib/tours";
import { nombreCorto, type Cobro } from "@/components/carrito/carritoComun";
import { guardarConfirmacion } from "@/lib/checkout/confirmacion";
import { leerApartadoId, olvidarApartado } from "@/components/carrito/useApartado";

export interface DatosCompra { name: string; email: string; phone: string; pickup: string; checkin?: string; checkout?: string; guiaIngles?: boolean }

export async function cerrarCompraCarrito({ cobro, datos, locale, onListo, irA, vaciar = true }: {
  cobro: Cobro;
  datos: DatosCompra;
  locale: Locale;
  onListo: () => void;
  /** A dónde ir al terminar (ya con el prefijo de idioma lo pone quien llama). */
  irA: (ruta: string) => void;
  /**
   * Vaciar el carrito de recorridos al terminar. El checkout de PAQUETE no lo
   * vacía (13 nov 2026): el paquete se paga aparte y los tours que la persona
   * tenía guardados siguen ahí.
   */
  vaciar?: boolean;
}): Promise<void> {
  const t = getBooking(locale).carrito;
  const primero = cobro.lineItems[0];
  const resumen = t.recorridosResumen(cobro.lineItems.length);
  // El folio real lo devuelve `send-confirmation`. Antes se ignoraba la
  // respuesta y la pantalla de éxito acababa enseñando `undefined` donde va
  // el número que el cliente tiene que presentarle al guía.
  let confirmationNumber = "";
  try {
    const res = await fetch("/api/tours/send-confirmation", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email:         datos.email,
        customerName:  datos.name,
        customerPhone: datos.phone || null,
        locale,
        // ⚠️ Las notas las lee el EQUIPO en Xilitla, no el cliente: van
        // siempre en español aunque la reserva venga de /en. Lo que sí se
        // añade es el aviso de que el cliente habla inglés, que es
        // justamente lo que el equipo necesita saber antes de llamarle.
        notes: [
          t.notas.idiomaCliente || null,
          // Lo PIDIÓ, que no es lo mismo que haber comprado desde /en:
          // alguien puede reservar en español y pedir guía en inglés.
          datos.guiaIngles ? t.notas.guiaEnIngles : null,
          datos.pickup.trim() ? t.notas.recogida(datos.pickup.trim()) : null,
          t.notas.reservaVarios(cobro.lineItems.length),
          // Sin esto, el equipo recibía la Ruta Acuática sin saber si el
          // cliente eligió las Siete Cascadas o Tamasopo.
          ...cobro.lineItems
            .filter((l) => l.eleccion)
            .map((l) => t.notas.eligio(l.tourName.split("—")[0].trim(), l.eleccion!)),
          // Va UNA persona: pagó la tarifa de viajero solo y el equipo tiene
          // que sumarla a un grupo armado para esa fecha.
          ...cobro.lineItems
            .filter((l) => l.viajeroSolo)
            .map((l) => t.notas.viajeroSolo(l.tourName.split("—")[0].trim(), l.tourDate)),
          // La actividad opcional se COBRA y hay que operarla: el Salto de
          // las 7 Cascadas necesita guía de rescate. Sin esta línea el
          // equipo en Xilitla no se enteraba de que estaba contratada.
          ...cobro.lineItems
            .filter((l) => (l.addOns ?? []).some((a) => a.id !== ID_TRASLADO_VALLES))
            .map((l) => t.notas.extras(
              l.tourName.split("—")[0].trim(),
              (l.addOns ?? []).filter((a) => a.id !== ID_TRASLADO_VALLES).map((a) => `${a.nombre} x${a.cantidad}`).join(", "),
            )),
          // Sale de Ciudad Valles y la Ruta Surrealista cobra el traslado
          // (+$400 por reserva): el equipo tiene que ir por él hasta allá.
          ...cobro.lineItems
            .filter((l) => (l.cargoValles ?? 0) > 0)
            .map((l) => `🚐 SE HOSPEDA EN CIUDAD VALLES: traslado cobrado +$${(l.cargoValles ?? 0).toLocaleString("es-MX")} en ${l.tourName.split("—")[0].trim()} (${l.tourDate}).`),
          cobro.hospedaje
            ? t.notas.hospedaje(cobro.hospedaje.habitacion, cobro.hospedaje.noches, cobro.hospedaje.huespedes, datos.checkin || "", datos.checkout || "")
            : null,
          // El traslado hay que operarlo: sin esto el equipo cobraba un
          // viaje desde otra ciudad y no se enteraba de que existía.
          cobro.traslado
            ? t.notas.traslado(cobro.traslado.ciudad, cobro.traslado.personas)
            : null,
        ].filter(Boolean).join(" | "),
        totalAmount:     cobro.amount,
        paymentIntentId: cobro.paymentIntentId,
        // El servidor suelta el apartado al crear la reserva. Va también en
        // la metadata del pago; aquí, por si el reloj arrancó después.
        apartadoId:      leerApartadoId(),
        // Con UN solo recorrido se guarda su nombre real, no el resumen:
        // "1 recorridos" acababa en el panel y en el correo del cliente
        // como si fuera el nombre del tour. Con varios sí va el resumen,
        // porque el detalle vive en `lineItems`.
        tourName:        cobro.lineItems.length === 1
          ? (cobro.lineItems[0].tourName || resumen)
          : resumen,
        // Faltaba por completo: sin slug, el correo no sabía qué tour era y
        // caía a la lista genérica de "todo incluido".
        tourSlug:        primero.tourSlug,
        tourId:          (primero as any).tourId || primero.tourSlug,
        tourDate:        primero.tourDate,
        // El mismo grupo va a todos los recorridos: se guarda el grupo, no
        // la suma por tour (2 personas en 3 tours daban 6 adultos).
        adults:          Math.max(...cobro.lineItems.map((l) => l.adults || 0), 0) || 1,
        children:        Math.max(...cobro.lineItems.map((l) => l.children || 0), 0),
        // El hospedaje entra como un renglón más: el cliente lo PAGÓ, así
        // que tiene que aparecer en su confirmación. Antes se cobraba y el
        // correo no lo mencionaba.
        lineItems: [
          ...cobro.lineItems,
          ...(cobro.traslado
            ? [{
                tourName: t.trasladoRenglon(cobro.traslado.ciudad),
                tourDate: primero.tourDate,
                adults:   cobro.traslado.personas,
                children: 0,
                subtotal: cobro.traslado.total,
              }]
            : []),
        ],
        // El hospedaje va por `packageItems`, NO como un renglón de tour.
        // El correo tiene un bloque propio para el hotel que pinta noches y
        // entrada → salida; metiéndolo entre los tours salía como "Hospedaje
        // · Lirios 1 — 4 personas" y el cliente no veía ni cuántas noches
        // había pagado ni qué día se iba.
        packageItems: cobro.hospedaje
          ? [{
              hotel:        "Hotel Paraíso Encantado",
              habitacion:   cobro.hospedaje.habitacion,
              noches:       cobro.hospedaje.noches,
              habitaciones: cobro.hospedaje.habitacion.split(" + ").length,
              checkin:      datos.checkin || "",
              checkout:     datos.checkout || "",
              subtotal:     cobro.hospedaje.total,
            }]
          : undefined,
      }),
    });
    const datosRes = await res.json().catch(() => null);
    if (datosRes?.confirmationNumber) confirmationNumber = datosRes.confirmationNumber;
  } catch {
    // Si el correo falla, el pago YA se hizo. El webhook de Stripe levanta
    // la reserva igual, así que no se le dice al cliente que falló nada.
  }

  const totalAdultos = cobro.lineItems.reduce((s, l) => s + l.adults, 0);
  const totalNinos   = cobro.lineItems.reduce((s, l) => s + l.children, 0);

  // Solo se cuenta la venta si tenemos el FOLIO. Antes, cuando el correo
  // fallaba, se mandaba el id del PaymentIntent como número de transacción
  // — y el servidor manda el folio: eran dos identificadores distintos para
  // la misma venta, así que GA4 no podía deduplicarlos y la contaba dos
  // veces. Sin folio no se manda nada: el webhook la registra igual, con el
  // número bueno.
  if (confirmationNumber) trackPurchase({
    confirmationNumber,
    tourId:   primero.tourName,
    tourName: resumen,
    total:    cobro.amount,
    adults:   totalAdultos,
    children: totalNinos,
    // Los recorridos uno por uno y lo que vale la reserva completa, igual
    // que la compra del webhook: sin esto GA4 recibía un solo artículo con
    // el nombre del primer tour como id. El id es el del tour (el mismo de
    // `view_item`), no el slug.
    reservaTotal: cobro.total,
    renglones: cobro.lineItems.map((l) => ({
      tourId:   TOURS_DB.find((x) => x.slug === l.tourSlug)?.id ?? l.tourSlug ?? l.tourName,
      tourName: l.tourName,
      total:    l.subtotal,
      cantidad: l.adults + l.children,
    })),
  });
  trackTourEvent("BOOKING_CONFIRMED", { carrito: true, amount: cobro.amount, total: cobro.total });

  // La forma la dicta `ConfirmationData` (`lib/checkout/confirmacion.ts`):
  // el carrito escribía sus propios nombres y la pantalla de éxito enseñaba
  // el TOTAL donde va lo COBRADO. Ahora un campo mal escrito no compila.
  guardarConfirmacion({
    // Sin folio la pantalla de éxito dice «te llega por correo»: el id del
    // PaymentIntent no es un número que el cliente pueda dar al guía.
    confirmationNumber,
    tourName:      resumen,
    tourSlug:      primero.tourSlug ?? "",
    tourDate:      primero.tourDate,
    adults:        totalAdultos,
    children:      totalNinos,
    total:         cobro.total,
    chargeAmount:  cobro.amount,
    paymentMode:   "deposit",
    customerName:  datos.name,
    customerEmail: datos.email,
    // El itinerario completo: un carrito de cuatro días que confirma
    // diciendo solo "4 recorridos" desperdicia el momento de más confianza.
    lineItems: [
      // La pantalla de éxito la ve el CLIENTE: aquí los nombres sí van en
      // su idioma, al revés que las notas del equipo de arriba.
      ...cobro.lineItems.map((l) => ({
        tourName: nombreCorto(l.tourSlug ?? "", l.tourName, locale), tourDate: l.tourDate,
        adults: l.adults, children: l.children, subtotal: l.subtotal,
      })),
      ...(cobro.traslado
        ? [{
            tourName: t.trasladoRenglon(cobro.traslado.ciudad),
            tourDate: primero.tourDate,
            adults:   cobro.traslado.personas,
            children: 0,
            subtotal: cobro.traslado.total,
          }]
        : []),
      ...(cobro.hospedaje
        ? [{
            tourName: t.hospedajeRenglon(cobro.hospedaje.habitacion),
            tourDate: datos.checkin || primero.tourDate,
            adults:   cobro.hospedaje.huespedes,
            children: 0,
            subtotal: cobro.hospedaje.total,
          }]
        : []),
    ],
  });
  // Los lugares ya son una reserva: el apartado se olvida SIN soltarlo (lo
  // suelta el servidor después de crearla; ver `olvidarApartado`). Antes de
  // vaciar el carrito, o el carrito vacío lo soltaría desde aquí.
  olvidarApartado();
  if (vaciar) {
    vaciarCarrito();
    limpiarExtras();
  }
  onListo();
  irA("/reservar-tour/confirmacion");
}
