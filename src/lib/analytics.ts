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

export function trackBeginCheckout(params: {
  tourId:   string;
  tourName: string;
  price:    number;
  source:   "widget" | "mobile_bar" | "floating_button" | "tour_card" | "destino_bar";
}) {
  track("begin_checkout", {
    currency: "MXN",
    value:    params.price,
    source:   params.source,
    items: [
      {
        item_id:   params.tourId,
        item_name: params.tourName,
        price:     params.price,
        quantity:  1,
      },
    ],
  });
}

export function trackPurchase(params: {
  confirmationNumber: string;
  tourId:             string;
  tourName:           string;
  total:              number;
  adults:             number;
  children:           number;
}) {
  track("purchase", {
    transaction_id: params.confirmationNumber,
    currency:       "MXN",
    value:          params.total,
    items: [
      {
        item_id:   params.tourId,
        item_name: params.tourName,
        price:     params.total,
        quantity:  params.adults + params.children,
      },
    ],
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
