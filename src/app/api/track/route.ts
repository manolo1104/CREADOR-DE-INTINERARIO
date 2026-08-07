import { NextRequest, NextResponse } from "next/server";
import { actividad, logger, mxn, nombreCorto } from "@/lib/logger";
import { TOURS_DB } from "@/lib/tours";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  destino_bar: "la barra móvil del destino",
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
  // El puente contenido → producto: cuánta gente entra por un destino y cuánta
  // de esa pasa al tour. Es la métrica de la que dependía todo el rediseño.
  DESTINO_PAGE_VIEW:     (d)    => ["🏞️  VIO UN DESTINO", d.nombre as string, d.zona as string, d.conTour === "ninguno" ? "sin tour" : `tour: ${d.conTour}`],
  DESTINO_TOUR_CLICK:    (d)    => ["🌉  DEL DESTINO AL TOUR", d.destino as string, "→", nombreTour(d), mxn(Number(d.amount)), desde(d.source)],
  GALLERY_OPENED:        (d)    => ["🖼️  ABRIÓ LA GALERÍA", nombreTour(d)],
  REVIEWS_SCROLLED:      (d)    => ["⭐  LEYÓ LAS RESEÑAS", nombreTour(d)],
  STICKY_SIDEBAR_SHOWN:  (d)    => ["📌  VIO LA CALCULADORA DE PRECIO", nombreTour(d)],
  DATE_SELECTED:         (d)    => ["📅  ELIGIÓ FECHA", (d.fecha ?? d.date) as string, nombreTour(d)],
  PARTICIPANTS_CHANGED:  (d)    => ["👥  AJUSTÓ PERSONAS", nombreTour(d), personas(d), mxn(Number(d.amount))],
  PROMO_APPLIED:         (d)    => ["🎟️  APLICÓ CUPÓN", (d.code ?? d.promoCode) as string, d.discountPct != null ? `-${d.discountPct}%` : undefined],
  PROMO_FAILED:          (d)    => ["🚫  CUPÓN INVÁLIDO", (d.code ?? d.promoCode) as string],
  CHECKOUT_STARTED:      (d)    => ["🛒  INICIÓ RESERVA", nombreTour(d), personas(d), mxn(Number(d.amount)), desde(d.source)],
  PAYMENT_INITIATED:     (d)    => ["💳  LLEGÓ AL PAGO", nombreTour(d), mxn(Number(d.amount))],
  BOOKING_CONFIRMED:     (d)    => ["✅  RESERVÓ", nombreTour(d), personas(d), mxn(Number(d.amount)), d.confirmationNumber as string],
  // El cliente sí le dio a "Pagar" y no se completó. `code`/`decline_code`
  // vienen de Stripe: es la diferencia entre "no quiso" y "no pudo".
  PAGO_FALLIDO:          (d)    => [
    "❌  PAGO FALLIDO",
    nombreTour(d),
    mxn(Number(d.amount)),
    (d.decline_code ?? d.code) as string,
    d.pm_type as string,
    d.message as string,
  ],
  PAGO_EN_PROCESO:       (d)    => ["⏳  PAGO EN PROCESO", nombreTour(d), mxn(Number(d.amount))],
  INVENTORY_BADGE_SHOWN: (d)    => ["🔢  VIO EL CUPO", nombreTour(d), d.group_max ? `máx ${d.group_max} por salida` : undefined],
  TOAST_SHOWN:           (d)    => ["🔔  PRUEBA SOCIAL", nombreTour(d), d.message ? `«${d.message}»` : undefined],
  TOAST_DISMISSED:       (d)    => ["✕  CERRÓ LA PRUEBA SOCIAL", nombreTour(d)],
  WHATSAPP_CLICK:        (d)    => ["💬  CLIC A WHATSAPP", nombreTour(d), mxn(Number(d.amount)), desde(d.context ?? d.source)],
  RECOMMENDER_STARTED:   (d)    => ["🎯  USÓ EL RECOMENDADOR", d.grupo as string, d.origen ? `desde ${d.origen}` : undefined, d.dias as string, lista(d.intereses), d.actividad as string],
  RECOMMENDER_COMPLETED: (d)    => ["🏆  EL RECOMENDADOR SUGIRIÓ", resolver(d.primary_tour), d.secondary_tour ? `(2º ${resolver(d.secondary_tour)})` : undefined, d.grupo as string, d.origen ? `desde ${d.origen}` : undefined],
};

/**
 * Guarda el evento para poder contarlo después. Los logs de `actividad()` sirven
 * para mirar el día a día, pero Railway los rota: sin esto no hay manera de
 * calcular una tasa de conversión ni de saber qué página trae a quien reserva.
 *
 * Nunca bloquea ni revienta la respuesta: si la tabla aún no existe o la base
 * está caída, se pierde el evento y el sitio sigue igual.
 */
async function persistir(event: string, d: Datos, path?: string, sid?: string, device?: string, referrer?: string) {
  try {
    const monto = Number(d.amount);
    await prisma.trackEvent.create({
      data: {
        event,
        sid:      sid && sid !== "anonymous" && sid !== "ssr" ? sid : null,
        path:     path ?? null,
        tourSlug: typeof d.tourSlug === "string" ? d.tourSlug
                : typeof d.tour === "string"     ? d.tour
                : null,
        amount:   Number.isFinite(monto) && monto > 0 ? Math.round(monto) : null,
        device:   device ?? null,
        referrer: referrer ?? null,
        data:     Object.keys(d).length ? (d as object) : undefined,
      },
    });
  } catch (e) {
    // OJO: la clave NO puede llamarse `event` — el logger hace {level, event,
    // ts, ...data} y el spread la sobrescribiría, dejando estos fallos
    // imposibles de encontrar por nombre en los logs.
    logger.warn("track_persist_failed", {
      evento: event,
      reason: e instanceof Error ? e.message.split("\n").find(Boolean) : "desconocido",
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event, data, path, sid, device, referrer } = body as {
      event: string;
      data?: Datos;
      path?: string;
      sid?: string;
      device?: string;
      referrer?: string;
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

    // SIN await: medir jamás debe frenar al visitante. Con la base caída, la
    // conexión de Prisma tarda ~9 s en rendirse; esperarla convertía cada
    // evento en una petición colgada.
    void persistir(event, data ?? {}, path, sid, device, referrer);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
