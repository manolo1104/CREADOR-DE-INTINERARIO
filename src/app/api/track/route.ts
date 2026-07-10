import { NextRequest, NextResponse } from "next/server";
import { actividad, mxn, nombreCorto } from "@/lib/logger";
import { TOURS_DB } from "@/lib/tours";

export const runtime = "nodejs";

// id o slug del tour → nombre legible (para eventos que solo mandan la clave)
const NOMBRE_POR_CLAVE: Record<string, string> = {};
for (const t of TOURS_DB) {
  NOMBRE_POR_CLAVE[t.id] = t.nombre;
  NOMBRE_POR_CLAVE[t.slug] = t.nombre;
}

type Datos = Record<string, unknown>;

function resolver(v: unknown): string | undefined {
  if (typeof v !== "string" || v === "") return undefined;
  return nombreCorto(NOMBRE_POR_CLAVE[v] ?? v);
}

// Prefiere el nombre bonito; si solo llega id/slug, lo traduce contra TOURS_DB
function nombreTour(d: Datos): string {
  return resolver(d.tour_name) ?? resolver(d.tourName) ?? resolver(d.tour) ?? "tour";
}

function personas(d: Datos): string {
  const a = Number(d.adults) || 0;
  const c = Number(d.children) || 0;
  const partes: string[] = [];
  if (a) partes.push(`${a} adulto${a > 1 ? "s" : ""}`);
  if (c) partes.push(`${c} niño${c > 1 ? "s" : ""}`);
  return partes.join(", ");
}

const FUENTE: Record<string, string> = {
  widget: "la calculadora",
  mobile_bar: "la barra móvil",
  floating_button: "el botón flotante",
  tour_card: "la tarjeta del tour",
  tour_widget: "la calculadora",
};
function desde(v: unknown): string {
  const f = typeof v === "string" ? FUENTE[v] ?? v : "";
  return f ? `desde ${f}` : "";
}

function lista(v: unknown): string {
  return Array.isArray(v) ? v.join(", ") : typeof v === "string" ? v : "";
}

// Cada evento → [etiqueta, ...campos]. Los campos vacíos se omiten en el log.
const EVENTOS: Record<
  string,
  (d: Datos, path: string) => Array<string | number | undefined | false>
> = {
  TOUR_PAGE_VIEW:        (d)    => ["👁️  VIO TOUR", nombreTour(d), mxn(Number(d.precio)), d.tipo as string],
  TOURS_LIST_VIEW:       (_d, p) => ["🛍️  VIO EL CATÁLOGO DE TOURS", p],
  GALLERY_OPENED:        (d)    => ["🖼️  ABRIÓ LA GALERÍA", nombreTour(d)],
  REVIEWS_SCROLLED:      (d)    => ["⭐  LEYÓ LAS RESEÑAS", nombreTour(d)],
  STICKY_SIDEBAR_SHOWN:  (d)    => ["📌  VIO LA CALCULADORA DE PRECIO", nombreTour(d)],
  DATE_SELECTED:         (d)    => ["📅  ELIGIÓ FECHA", (d.fecha ?? d.date) as string, nombreTour(d)],
  PARTICIPANTS_CHANGED:  (d)    => ["👥  AJUSTÓ PERSONAS", nombreTour(d), personas(d), mxn(Number(d.amount))],
  PROMO_APPLIED:         (d)    => ["🎟️  APLICÓ CUPÓN", (d.code ?? d.promoCode) as string, d.discountPct != null ? `-${d.discountPct}%` : undefined],
  PROMO_FAILED:          (d)    => ["🚫  CUPÓN INVÁLIDO", (d.code ?? d.promoCode) as string],
  CHECKOUT_STARTED:      (d)    => ["🛒  INICIÓ RESERVA", nombreTour(d), personas(d), mxn(Number(d.amount)), desde(d.source)],
  PAYMENT_INITIATED:     (d)    => ["💳  LLEGÓ AL PAGO", nombreTour(d), mxn(Number(d.amount))],
  BOOKING_CONFIRMED:     (d)    => ["✅  RESERVÓ", nombreTour(d), d.confirmationNumber as string],
  INVENTORY_BADGE_SHOWN: (d)    => ["🔢  VIO EL CUPO", nombreTour(d), d.group_max ? `máx ${d.group_max} por salida` : undefined],
  TOAST_SHOWN:           (d)    => ["🔔  PRUEBA SOCIAL", nombreTour(d), d.message ? `«${d.message}»` : undefined],
  TOAST_DISMISSED:       (d)    => ["✕  CERRÓ LA PRUEBA SOCIAL", nombreTour(d)],
  WHATSAPP_CLICK:        (d)    => ["💬  CLIC A WHATSAPP", nombreTour(d), mxn(Number(d.amount)), desde(d.context ?? d.source)],
  RECOMMENDER_STARTED:   (d)    => ["🎯  USÓ EL RECOMENDADOR", d.grupo as string, d.origen ? `desde ${d.origen}` : undefined, d.dias as string, lista(d.intereses), d.actividad as string],
  RECOMMENDER_COMPLETED: (d)    => ["🏆  EL RECOMENDADOR SUGIRIÓ", resolver(d.primary_tour), d.secondary_tour ? `(2º ${resolver(d.secondary_tour)})` : undefined, d.grupo as string, d.origen ? `desde ${d.origen}` : undefined],
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event, data, path, sid } = body as {
      event: string;
      data?: Datos;
      path?: string;
      sid?: string;
    };

    if (!event) return NextResponse.json({ ok: false }, { status: 400 });

    // etiqueta corta del visitante para poder seguir su recorrido en los logs
    const visitante =
      sid && sid !== "anonymous" && sid !== "ssr"
        ? `#${String(sid).slice(-5)}`
        : undefined;

    const build = EVENTOS[event];
    if (build) {
      const [etiqueta, ...campos] = build(data ?? {}, path ?? "/");
      actividad(etiqueta as string, ...campos, visitante);
    } else {
      // evento no mapeado: no lo perdemos, sale con su código crudo
      actividad(`📊  ${event}`, path ?? "/", visitante);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
