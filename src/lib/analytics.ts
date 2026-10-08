/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
    clarity: (...args: any[]) => void;
  }
}

function track(eventName: string, params?: Record<string, any>) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", eventName, params);
}

// ── E-commerce funnel ────────────────────────────────────────────────────────
//
// El orden: view_item_list (catálogo /tours, comparador) → view_item (ficha) →
// add_to_cart (un botón mete un recorrido al carrito) → begin_checkout (se abre
// el carrito o el checkout de un paquete) → purchase.
//
// Cómo arma GA4 sus informes con esto:
//  - En cada artículo, `price` es lo que cuesta UNA unidad —una persona; en el
//    RZR y el café, un vehículo— y `quantity`, cuántas van. El ingreso del
//    artículo lo saca GA4 multiplicando las dos.
//  - `value` es la cifra del evento. En la compra es lo COBRADO hoy (anticipo o
//    pago completo), que es lo que cuadra con Stripe.
//  - `item_id` es el id del catálogo (`tour-tamul`), el mismo de `view_item`. El
//    nombre cambia con el idioma, así que para sumar por recorrido la dimensión
//    que sirve es «ID del artículo». 🔴 La compra todavía no lo cumple: la del
//    carrito (`PagoCarrito`) manda el nombre del primer tour, y la del webhook,
//    el slug.

/**
 * Un renglón de lo que se vende, como lo necesita GA4: lo que cuesta COMPLETO y
 * cuántas unidades lleva. El precio por unidad lo saca `articulo`.
 */
export interface RenglonGA4 {
  tourId:   string;
  tourName: string;
  /** Lo que cuesta el renglón entero (todas sus personas), no por persona. */
  total:    number;
  /** Personas; en los recorridos que se cobran por vehículo, vehículos. */
  cantidad: number;
}

/**
 * El renglón como artículo de GA4: precio de UNA unidad y cuántas.
 *
 * 🔴 Hasta el 7 oct 2026 la compra mandaba el total del renglón como `price` y
 * las personas como `quantity`: GA4 multiplica las dos, así que una reserva de
 * $3,000 para 4 personas salía como $12,000 de ingreso de ese tour.
 */
function articulo(r: RenglonGA4) {
  const cantidad = Math.max(1, Math.round(r.cantidad) || 0);
  return {
    item_id:   r.tourId,
    item_name: r.tourName,
    // A centavos: $2,900 entre 3 no da exacto.
    price:     Math.round((r.total / cantidad) * 100) / 100,
    quantity:  cantidad,
  };
}

/**
 * Un renglón del carrito (`CarritoItem`) visto como `RenglonGA4`. Lo comparten
 * los botones que agregan y el carrito al abrirse, para que cuenten igual.
 */
export function renglonDeCarrito(i: {
  tourId:         string;
  tourName:       string;
  total:          number;
  adults:         number;
  childrenMid?:   number;
  childrenSmall?: number;
  unidades?:      number;
}): RenglonGA4 {
  return {
    tourId:   i.tourId,
    tourName: i.tourName,
    total:    i.total,
    cantidad: i.unidades || (i.adults || 0) + (i.childrenMid || 0) + (i.childrenSmall || 0),
  };
}

export function trackViewTour(tour: {
  id: string;
  nombre: string;
  precio: number;
  tipo: string;
}) {
  track("view_item", {
    currency: "MXN",
    value: tour.precio,
    items: [
      {
        item_id:       tour.id,
        item_name:     tour.nombre,
        item_category: tour.tipo,
        price:         tour.precio,
        quantity:      1,
      },
    ],
  });
}

/**
 * Una lista de recorridos en pantalla: el catálogo /tours o las columnas del
 * comparador. `listaId` y `listaNombre` van fijos y en español en los dos
 * idiomas, para que GA4 junte la lista de /tours con la de /en/tours.
 */
export function trackViewItemList(params: {
  listaId:     string;
  listaNombre: string;
  tours: { id: string; nombre: string; precio?: number; tipo?: string }[];
}) {
  track("view_item_list", {
    item_list_id:   params.listaId,
    item_list_name: params.listaNombre,
    items: params.tours.map((t, i) => ({
      item_id:   t.id,
      item_name: t.nombre,
      index:     i,
      ...(t.tipo   ? { item_category: t.tipo } : {}),
      ...(t.precio ? { price: t.precio }       : {}),
    })),
  });
}

/** Desde dónde entró el recorrido al carrito. */
type OrigenCarrito = "widget" | "mobile_bar" | "destino_bar" | "comparador" | "catalogo" | "carrito";

/**
 * Un recorrido entra al carrito: el módulo de la ficha, la barra del celular,
 * el comparador, la tarjeta del catálogo o «agregar otro» dentro del carrito.
 *
 * La ficha, la barra y el comparador mandaban `begin_checkout`, pero lo que
 * hacen es AGREGAR; el checkout empieza cuando se abre el carrito. Contados
 * como checkout, GA4 no tenía con qué medir el paso de "lo agregó" a "se puso
 * a pagar".
 */
export function trackAddToCart(params: RenglonGA4 & { source: OrigenCarrito }) {
  const { source, ...renglon } = params;
  track("add_to_cart", {
    currency: "MXN",
    value:    renglon.total,
    source,
    items:    [articulo(renglon)],
  });
}

/**
 * Se abre el carrito, o el checkout de un paquete: una vez por visita a esa
 * pantalla, con lo que lleva.
 */
export function trackBeginCheckout(params: {
  renglones: RenglonGA4[];
  /** Lo que suma la pantalla: los recorridos, y el hotel y el traslado si ya van puestos. */
  total:     number;
  /** "checkout_v2" = el checkout rediseñado (`?checkout=v2`), para compararlo con el de hoy. */
  source:    "carrito" | "checkout_v2" | "paquete";
}) {
  track("begin_checkout", {
    currency: "MXN",
    value:    params.total,
    source:   params.source,
    items:    params.renglones.map(articulo),
  });
}

export function trackPurchase(params: {
  confirmationNumber: string;
  tourId:             string;
  tourName:           string;
  /** Lo COBRADO hoy (anticipo o pago completo): es el `value`, que cuadra con Stripe. */
  total:              number;
  adults:             number;
  children:           number;
  /**
   * Lo que vale la reserva completa, si la pantalla lo sabe. Con anticipo es
   * mayor que `total`. Va aparte como `reserva_total` y es la base del precio
   * por persona del artículo, como en la compra que manda el webhook.
   */
  reservaTotal?:      number;
  /**
   * Los recorridos uno por uno (un carrito de varios días), como los manda el
   * webhook. Sin esto va un solo artículo con `tourId` y todas las personas.
   */
  renglones?:         RenglonGA4[];
}) {
  track("purchase", {
    transaction_id: params.confirmationNumber,
    currency:       "MXN",
    value:          params.total,
    ...(params.reservaTotal ? { reserva_total: params.reservaTotal } : {}),
    items: params.renglones?.length
      ? params.renglones.map(articulo)
      : [articulo({
          tourId:   params.tourId,
          tourName: params.tourName,
          total:    params.reservaTotal ?? params.total,
          cantidad: params.adults + params.children,
        })],
  });
}

// ── WhatsApp ─────────────────────────────────────────────────────────────────

export function trackWhatsapp(context: string, value?: number) {
  track("whatsapp_contact", {
    context,
    ...(value !== undefined && { value, currency: "MXN" }),
  });
}

// ── Booking steps ────────────────────────────────────────────────────────────

export function trackDateSelected(tourName: string, date: string) {
  track("tour_date_selected", { tour_name: tourName, selected_date: date });
}

export function trackParticipants(tourName: string, adults: number, children: number) {
  track("booking_participants", { tour_name: tourName, adults, children });
}

export function trackPromoApplied(code: string, discountPct: number) {
  track("promo_applied", { promo_code: code, discount_pct: discountPct });
}

// ── CTAs ─────────────────────────────────────────────────────────────────────

export function trackCtaClick(type: string, destination: string) {
  track("cta_click", { cta_type: type, destination });
}

// ── Paquetes ─────────────────────────────────────────────────────────────────

export function trackPackageInquiry(packageName: string, price: number) {
  track("package_inquiry", { package_name: packageName, value: price, currency: "MXN" });
}
