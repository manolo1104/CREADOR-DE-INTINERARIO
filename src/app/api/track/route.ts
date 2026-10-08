import { NextRequest, NextResponse } from "next/server";
import { actividad, logger, mxn, nombreCorto } from "@/lib/logger";
import { TOURS_DB } from "@/lib/tours";
import { PAQUETES_DB, PAQUETES_EVENTO } from "@/lib/paquetes";
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

// id o slug → SLUG canónico (para que el embudo cuente un tour una sola vez).
const SLUG_POR_CLAVE: Record<string, string> = {};
for (const t of TOURS_DB) {
  SLUG_POR_CLAVE[t.id] = t.slug;
  SLUG_POR_CLAVE[t.slug] = t.slug;
}
// Los paquetes también (oct 2026): sin esto los eventos del checkout de
// paquetes se guardaban sin slug y no había forma de contarlos por paquete.
for (const p of [...PAQUETES_DB, ...PAQUETES_EVENTO]) {
  SLUG_POR_CLAVE[p.slug] ??= p.slug;
  NOMBRE_POR_CLAVE[p.slug] ??= p.nombre;
}
function aSlug(v: unknown): string | null {
  if (typeof v !== "string" || !v) return null;
  return SLUG_POR_CLAVE[v] ?? null;
}

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
  comparador: "el comparador",
  // La barra única de abajo en el celular (`BarraInferiorMovil`), fuera de las
  // fichas de tour: esas siguen con la suya (`mobile_bar`).
  barra_movil: "la barra de abajo del celular",
  barra_movil_xantolo: "la barra de abajo del celular, en Xantolo",
};
function desde(v: unknown): string {
  const f = typeof v === "string" ? FUENTE[v] ?? v : "";
  return f ? `desde ${f}` : "";
}

function lista(v: unknown): string {
  return Array.isArray(v) ? v.join(", ") : typeof v === "string" ? v : "";
}

/**
 * Navegación del visitante: se GUARDA en `TrackEvent` (el embudo se calcula de
 * ahí) pero ya no se imprime. Era ~80 % del log de Railway y tapaba los errores
 * de verdad (30 sep 2026: dos reservas sin llegar a la hoja pasaron sin que
 * nadie las viera entre miles de «VIO TOUR»). Los logs no cuestan en Railway;
 * esto es solo para que se pueda leer.
 */
const SOLO_SE_GUARDA = new Set([
  "TOUR_PAGE_VIEW",
  "TOURS_LIST_VIEW",
  "DESTINO_PAGE_VIEW",
  "GALLERY_OPENED",
  "REVIEWS_SCROLLED",
  "STICKY_SIDEBAR_SHOWN",
  "BOOKING_PAGE_VIEW",
  "DATE_SELECTED",
  "PARTICIPANTS_CHANGED",
  "INVENTORY_BADGE_SHOWN",
  "TOAST_SHOWN",
  "TOAST_DISMISSED",
  // Comparador (2 oct 2026): navegación, no intención de compra. "Reservar"
  // desde el comparador sale como CHECKOUT_STARTED con `source: "comparador"`.
  "COMPARAR_VISTA",
  "COMPARAR_CAMBIO",
  "COMPARAR_FICHA",
  // Rediseño del checkout (oct 2026): la barra del celular que solo baja al
  // módulo de reserva, y la vista del checkout de paquetes.
  "BARRA_A_MODULO",
  "PAQUETE_CHECKOUT_VIEW",
  "CHECKOUT_STEP_EXPERIENCIA",
  "EXTRAS_ABIERTO",
  "RESPUESTA_ABIERTA",
  // El apartado de 15 minutos del carrito (`useApartado`): lo crea cualquier
  // carrito con fecha, como elegirla. Lo que sí se imprime es cuando se pierde.
  "APARTADO_CREADO",
]);

// Cada evento → [etiqueta, ...campos]. Los campos vacíos se omiten en el log.
// Solo los que dicen algo del negocio: intención de compra, pago, WhatsApp.
const EVENTOS: Record<
  string,
  (d: Datos, path: string) => Array<string | number | undefined | false>
> = {
  DESTINO_TOUR_CLICK:    (d)    => ["🌉  DEL DESTINO AL TOUR", d.destino as string, "→", nombreTour(d), mxn(Number(d.amount)), desde(d.source)],
  PROMO_APPLIED:         (d)    => ["🎟️  APLICÓ CUPÓN", (d.code ?? d.promoCode) as string, d.discountPct != null ? `-${d.discountPct}%` : undefined],
  PROMO_FAILED:          (d)    => ["🚫  CUPÓN INVÁLIDO", (d.code ?? d.promoCode) as string],
  CHECKOUT_STARTED:      (d)    => ["🛒  INICIÓ RESERVA", nombreTour(d), personas(d), mxn(Number(d.amount)), desde(d.source)],
  // Checkout rediseñado: terminó «Tus datos» (ya tenemos cómo contactarlo).
  CHECKOUT_STEP_DATOS:   (d)    => ["📝  DEJÓ SUS DATOS", mxn(Number(d.amount)), d.recorridos ? `${d.recorridos} recorrido(s)` : undefined],
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
  // El apartado de 15 minutos del carrito: se le acabó sin pagar, o lo que
  // quería ya no cabía (`useApartado`, 7 oct 2026).
  APARTADO_VENCIDO:      (d)    => ["⌛  SE LE VENCIÓ EL APARTADO", nombreTour(d), d.personas ? `${d.personas} persona(s)` : undefined],
  APARTADO_SIN_LUGAR:    (d)    => ["🚫  SIN LUGAR PARA APARTAR", nombreTour(d), d.dias as string],
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
        // Siempre el SLUG. Unos eventos mandan el id ("tour-edward-james") y
        // otros el slug: sin normalizar, el mismo tour salía dos veces en el
        // reporte del embudo y las cuentas quedaban partidas a la mitad.
        tourSlug: aSlug(d.tourSlug) ?? aSlug(d.tour) ?? aSlug(d.tourId) ?? null,
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
    } else if (!SOLO_SE_GUARDA.has(event)) {
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
