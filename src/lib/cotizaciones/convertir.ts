// De cotización a reserva, y de reserva a pago confirmado, del lado del SERVIDOR.
//
// Hasta oct 2026 la conversión solo existía en el navegador del panel
// (`convertToReserva` de CotizacionesClient.tsx: crea la reserva y DESPUÉS
// parcha la cotización, así que un doble clic hacía dos reservas) y
// `/api/bot/confirm` solo conocía reservas: un COT- del bot daba 404, y
// confirmar escribía `depositoPagado` a mano, sin cobro, sin método y sin
// comprobante. Aquí vive la versión de servidor:
//
//  · la conversión va en UNA transacción con candado sobre la cotización y no
//    duplica si se repite (el folio de la reserva queda en el `_meta`);
//  · el dinero entra SIEMPRE por `registrarCobro`, que lleva el libro y deja
//    `depositoPagado` como espejo de la suma — nunca se escribe a mano;
//  · el bot nunca confirma solo: esto lo dispara el `/confirma` de una persona.

import { randomInt } from "crypto";
import type { Prisma, TourBooking, TourQuote } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendBrevoEmail } from "@/lib/brevo";
import { buildTourEmailHtml } from "@/lib/tourEmail";
import { TOURS_DB, type Tour } from "@/lib/tours";
import { getPaquete } from "@/lib/paquetes";
import { fraseRecogidaCorreo, horaCorreo, pasamosPorEl, salidasCorreo } from "@/lib/recogidaCorreo";
import { localizeTour } from "@/lib/i18n/localize";
import { queLlevarDe } from "@/lib/tourRequisitos";
import { origenValido } from "@/lib/origenReserva";
import { cerrarCarritosDe, toursDeReserva } from "@/lib/cerrarCarrito";
import { ANTICIPO_PCT } from "@/lib/carrito";
import { grupoDe, metaDe } from "@/lib/admin/reserva";
import { extrasDe } from "@/lib/admin/extras";
import { registrarCobro, metodoValido, type MetodoCobro } from "@/lib/admin/cobros";
import { MAX_BYTES_EVIDENCIA, TIPOS_OK, tipoDeArchivo } from "@/lib/admin/evidencia";
import { montoCobrado } from "@/lib/admin/kpis";
import { registrarEnBitacora, pesos, BOT, type Actor } from "@/lib/admin/bitacora";
import { lugaresDePaquete, type LugaresPaquete } from "@/lib/cupoPaquete";
import { cabeEnCupo, textoLugares } from "@/lib/cupoEvento";
import { pedidosSinCupo, type SinCupo } from "@/lib/cupoTour";
import { fechaLimite } from "@/lib/vencimientoCotizacion";
import { addDaysYMD, hoyMX } from "@/lib/dates";
import { canjearCodigoCumple, codigoDeLineas, validarCodigoCumple } from "@/lib/encuestas/cumple";
import { sellarEnLineItems, resumenEvento, type EventoDescuento } from "@/lib/admin/descuento";
import { HOTEL_PARAISO, metaDeCotizacion } from "./armar";
import {
  avisoSobrecupo, etiquetasSinLugar, fechaCorta, idiomaTourDeConversion, pedidosDeCupo,
} from "./reglasConversion";
import type {
  ComprobanteBot, ConfirmacionResultado, ConfirmarPagoInput, LocaleBot, RecorridoConfirmado,
  ResultadoCorreoReserva,
} from "./tipos";

// ── Errores con su código HTTP ──────────────────────────────────────────────

/**
 * Lo que la ruta tiene que contestar con un código distinto de 500: 404 (no
 * existe el folio), 409 (cotización vencida, reserva cancelada) o 400 (el
 * pedido no sirve: monto, método). El mensaje es para quien confirmó.
 */
export class ErrorCotizacion extends Error {
  readonly status: 400 | 404 | 409;
  readonly esErrorCotizacion = true;
  constructor(status: 400 | 404 | 409, mensaje: string) {
    super(mensaje);
    this.name = "ErrorCotizacion";
    this.status = status;
    // Al compilar a ES5, `extends Error` pierde el prototipo y `instanceof` miente.
    Object.setPrototypeOf(this, ErrorCotizacion.prototype);
  }
}

export function esErrorCotizacion(e: unknown): e is ErrorCotizacion {
  return !!e && typeof e === "object" && (e as { esErrorCotizacion?: unknown }).esErrorCotizacion === true;
}

/** Para el `catch` de una ruta: el código y el cuerpo `{ error }` que corresponden. */
export function respuestaDeError(e: unknown, porOmision = "No se pudo completar la operación."): { status: number; body: { error: string } } {
  if (esErrorCotizacion(e)) return { status: e.status, body: { error: e.message } };
  return { status: 500, body: { error: porOmision } };
}

// ── Utilidades ──────────────────────────────────────────────────────────────

const texto = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);

const norm = (v: unknown) =>
  String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

const esYMD = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** Los últimos 10 dígitos de un teléfono (sin lada de país), o "" si no alcanzan. */
const diezDigitos = (v: unknown) => {
  const d = String(v ?? "").replace(/\D/g, "");
  return d.length >= 10 ? d.slice(-10) : "";
};

const fechaCortaMX = (d: Date) =>
  d.toLocaleString("es-MX", { timeZone: "America/Mexico_City", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** Dos caracteres al azar: dos folios del mismo milisegundo no chocan. */
const sufijoFolio = () => randomInt(0, 36 * 36).toString(36).padStart(2, "0").toUpperCase();

/** El folio de las reservas del panel (`HP-M-` + base 36) más el sufijo. */
function folioReserva(): string {
  return "HP-M-" + Date.now().toString(36).toUpperCase() + sufijoFolio();
}

/** Escribe campos en el `_meta` de `packageItems` (el de precio). Si no hay, lo crea al principio. */
function conMetaCotizacion(packageItems: unknown, campos: Record<string, unknown>): unknown[] {
  const base = Array.isArray(packageItems) ? [...packageItems] : [];
  const i = base.findIndex((p) => !!p && typeof p === "object" && (p as { _meta?: unknown })._meta === true);
  if (i === -1) return [{ _meta: true, ...campos }, ...base];
  base[i] = { ...(base[i] as object), ...campos };
  return base;
}

/**
 * Las habitaciones de la cotización, para la reserva.
 *
 * Las del bot viejo traían `_meta: "cotizado"` DENTRO del renglón del hotel;
 * el panel las tomaba por configuración y la reserva nacía sin hotel. Aquí
 * solo el `_meta: true` es configuración: lo demás es una habitación, y a las
 * viejas se les completa el precio por noche para que el panel las lea.
 */
function habitacionesParaReserva(packageItems: unknown): Record<string, unknown>[] {
  if (!Array.isArray(packageItems)) return [];
  return (packageItems as Record<string, any>[])
    .filter((p) => !!p && typeof p === "object" && p._meta !== true)
    .map((p) => {
      if (p._meta === undefined) return p;
      const resto: Record<string, any> = { ...p };
      delete resto._meta;
      const noches       = Math.max(0, Number(p.noches) || 0);
      const habitaciones = Math.max(1, Number(p.habitaciones) || 1);
      const subtotal     = Math.max(0, Math.round(Number(p.subtotal) || 0));
      const porNoche     = Number(p.precioPorNoche)
        || Number(Array.isArray(p.desglose) ? p.desglose[0]?.porNoche : 0)
        || (noches > 0 ? Math.round(subtotal / (noches * habitaciones)) : 0);
      return {
        ...resto,
        habitacion: String(p.habitacion ?? ""), hotel: String(p.hotel ?? HOTEL_PARAISO),
        noches, habitaciones, precioPorNoche: porNoche,
        checkin: p.checkin ?? "", checkout: p.checkout ?? "", subtotal,
      };
    });
}

// ── Convertir ───────────────────────────────────────────────────────────────

export interface ConversionResultado {
  /** La reserva como quedó al final (con lo abonado por ligas y su lead). */
  reserva:    TourBooking;
  cotizacion: TourQuote;
  /** false = ya estaba convertida: se devolvió la reserva de antes, sin crear otra. */
  nueva:      boolean;
  avisos:     string[];
  /**
   * Lo mismo que `avisos`, en corto («estaba vencida», «TAM 20 nov sin
   * lugar»…), para el título del seguimiento que deja la liga pagada (5 nov 2026).
   */
  revisar:    string[];
  /** Lo que entró por ligas de pago de la cotización y se abonó en esta llamada. */
  abonadoPorLiga: number;
}

/** Lo que se le pasa a la conversión. Lo del panel, desde el 5 nov 2026. */
export interface OpcionesConversion {
  origen?:      string;
  pickupLugar?: string | null;
  actor?:       Actor;
  forzar?:      boolean;
  /** En qué idioma sale el guía. Sin elegir: el del contacto o el de la cotización. */
  idiomaTour?:  "es" | "en" | null;
  guia?:        string | null;
  /** Nombre, correo y teléfono como quedaron en el cuadro de «Convertir». */
  contacto?:    { nombre?: string; correo?: string; telefono?: string } | null;
  /**
   * Quién convierte. Cambia cómo se explica un freno (el panel tiene «Crear de
   * todos modos»; el bot, el /confirma con «forzar») y qué se revisa: solo el
   * panel frena por un código de cumpleaños que ya no sirve.
   */
  desde?:       "panel" | "bot" | "liga";
}

/**
 * La reserva que ya salió de esta cotización, si hay: la de su folio en el
 * `_meta` (convertida aquí) o la que guarda de qué cotización viene
 * (`cotizacionId` desde el 4 nov 2026, `cotizacionOrigen` en las de antes).
 * `soloVivas`: sin las canceladas (el POST de Reservas sí deja rehacerla).
 */
async function reservaPreviaDeCotizacion(
  tx: Prisma.TransactionClient,
  q: Pick<TourQuote, "id" | "quoteNumber" | "packageItems">,
  { soloVivas = false } = {},
): Promise<{ reserva: TourBooking; porFolio: boolean } | null> {
  const meta = metaDeCotizacion(q.packageItems);
  const vivas = soloVivas ? { status: { not: "cancelled" } } : {};
  if (typeof meta.reservaFolio === "string" && meta.reservaFolio) {
    const b = await tx.tourBooking.findFirst({ where: { confirmationNumber: meta.reservaFolio, ...vivas } });
    if (b) return { reserva: b, porFolio: true };
  }
  const b = await tx.tourBooking.findFirst({
    where:   { ...vivas, OR: [{ cotizacionId: q.id }, { lineItems: { array_contains: [{ cotizacionOrigen: q.quoteNumber }] } }] },
    orderBy: { createdAt: "asc" },
  });
  return b ? { reserva: b, porFolio: false } : null;
}

/**
 * El POST de Reservas cuando trae `cotizacionId` (lote 1 de la auditoría, 5
 * nov 2026). El cuadro de Convertir ya no pasa por ahí, pero si algo lo sigue
 * llamando no puede hacer una segunda reserva de la misma cotización: candado
 * sobre la cotización, 409 con el folio si ya tiene una reserva viva, y la
 * cotización queda «aceptada» con su folio en la MISMA transacción.
 */
export async function crearReservaDeCotizacion(data: Prisma.TourBookingUncheckedCreateInput): Promise<TourBooking> {
  const cotizacionId = typeof data.cotizacionId === "string" && data.cotizacionId ? data.cotizacionId : null;
  if (!cotizacionId) return prisma.tourBooking.create({ data });
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "TourQuote" WHERE id = ${cotizacionId} FOR UPDATE`;
    const q = await tx.tourQuote.findUnique({ where: { id: cotizacionId } });
    if (q) {
      const previa = await reservaPreviaDeCotizacion(tx, q, { soloVivas: true });
      if (previa) {
        throw new ErrorCotizacion(409, `La cotización ${q.quoteNumber} ya es la reserva ${previa.reserva.confirmationNumber}: no se creó otra.`);
      }
    }
    const b = await tx.tourBooking.create({ data });
    if (q) {
      await tx.tourQuote.update({
        where: { id: q.id },
        data:  {
          status: "aceptada",
          ...(q.status !== "aceptada" ? { aceptadaEn: new Date() } : {}),
          packageItems: conMetaCotizacion(q.packageItems, { reservaFolio: b.confirmationNumber, reservaId: b.id }) as never,
        },
      });
    }
    return b;
  }, { maxWait: 10_000, timeout: 20_000 });
}

/**
 * La versión de servidor de «Convertir a reserva»: reserva HP-M- PENDIENTE
 * con depósito 0 (el dinero lo pone el cobro que se registre), el anticipo
 * acordado y la cotización de origen en su `_meta`, el origen de verdad (el
 * panel la dejaba «web») y la cotización «aceptada». Desde el 5 nov 2026 es
 * la ÚNICA puerta: la usan el botón del panel (`/api/admin/cotizaciones/[id]/
 * convertir`), la liga de pago pagada y el /confirma del bot.
 *
 * Idempotente: si la cotización ya tiene reserva —convertida aquí (su folio
 * vive en el `_meta`) o desde el panel (la reserva guarda `cotizacionId` o
 * `cotizacionOrigen`)— devuelve esa.
 *
 * Antes de crear una reserva NUEVA frena (ErrorCotizacion 409) lo que haría
 * dos reservas o vendería de más, salvo con `forzar` (el dueño ya lo revisó):
 *  · la cotización fue REEMPLAZADA por otra (`reemplazadaPor`): se confirma
 *    la nueva;
 *  · la cotización está «expirada» (si venció ayer u hoy y el tour no ha
 *    pasado se acepta con aviso: el cliente pudo pagar a las 9:30 pm y el
 *    cron la venció a medianoche);
 *  · el MISMO cliente (correo o teléfono) ya tiene otra reserva para esa
 *    fecha, hecha después de la cotización: pagó en la web con el link, o la
 *    convirtieron desde el panel y una edición le borró `cotizacionOrigen`;
 *  · un paquete de evento (Xantolo) ya no tiene lugar: entre la cotización y
 *    el pago la web pudo vender el último cuarto;
 *  · (solo el panel) el código de cumpleaños que trae ya no sirve.
 * Lo que no frena pero se dice (`avisos` y, en corto, `revisar`): el cupo y
 * las fechas cerradas de cada recorrido (nota «⚠️ SOBRECUPO» en la reserva),
 * el tour en inglés y un pago de liga que cae sobre dinero ya registrado. La
 * liga pagada convierte con `forzar`: ya hay dinero, así que nada la frena y
 * todo esto va a su seguimiento.
 *
 * `pickupLugar` solo si se sabe el lugar CONCRETO. Si no, va vacío a
 * propósito: el correo de confirmación imprime este texto EN VEZ de la
 * recogida del catálogo (hora y lugar de cada recorrido), así que el «Lobby de
 * tu hotel en Xilitla» fijo del panel le mentía a quien se hospeda en Valles.
 * La zona que dijo el cliente viaja aparte, en `zonaHospedaje`.
 */
export async function convertirCotizacionEnReserva(
  quoteId: string,
  opciones: OpcionesConversion = {},
): Promise<ConversionResultado> {
  const actor = opciones.actor ?? BOT;
  const forzar = opciones.forzar === true;
  const desdePanel = opciones.desde === "panel";
  const avisos: string[] = [];
  const revisar: string[] = [];
  /** Cómo seguir tras un freno, con las palabras de quien convierte. */
  const comoSeguir = (bot: string, panel: string) => (desdePanel ? panel : bot);
  const porForzar = desdePanel
    ? "porque pediste crearla de todos modos"
    : opciones.desde === "liga" ? "porque el cliente ya pagó con la liga" : "porque pediste forzar";

  // Lo que se lee de OTRAS tablas va ANTES de la transacción y solo se usa si
  // de verdad va a nacer una reserva nueva:
  //  · el cupo de un paquete de evento, con la cuenta estricta, como el pago en
  //    línea: si la base no contesta, se dice en vez de suponer que hay lugar;
  //  · el cupo y las fechas cerradas de cada recorrido (5 nov 2026: antes solo
  //    se revisaban los eventos), con la cuenta del panel: avisa, no frena;
  //  · el idioma del contacto de su lead, para el guía;
  //  · (panel) si el código de cumpleaños de la cotización todavía sirve.
  let cupoEvento: { nombre: string; lugares: LugaresPaquete | null; error?: string } | null = null;
  let sinLugar: SinCupo[] = [];
  let idiomaContacto: string | null = null;
  let cumpleMalo: string | null = null;
  {
    const q0 = await prisma.tourQuote.findUnique({
      where:  { id: quoteId },
      select: { packageItems: true, lineItems: true, tourSlug: true, tourDate: true, adults: true, children: true, oportunidadId: true },
    });
    const meta0 = q0 ? metaDeCotizacion(q0.packageItems) : {};
    const slug0 = meta0.paqueteSlug;
    const p0 = typeof slug0 === "string" ? getPaquete(slug0) : undefined;
    if (p0?.evento) {
      try {
        cupoEvento = { nombre: p0.nombre, lugares: await lugaresDePaquete(p0) };
      } catch (e: unknown) {
        cupoEvento = { nombre: p0.nombre, lugares: null, error: e instanceof Error ? e.message : String(e) };
      }
    }
    if (q0) {
      sinLugar = await pedidosSinCupo(pedidosDeCupo(q0.lineItems, q0)).catch(() => []);
      if (q0.oportunidadId) {
        const op = await prisma.oportunidad.findUnique({ where: { id: q0.oportunidadId }, select: { contacto: { select: { idioma: true } } } }).catch(() => null);
        idiomaContacto = op?.contacto.idioma ?? null;
      }
      if (desdePanel && !forzar && typeof meta0.codigoCumple === "string" && meta0.codigoCumple) {
        const v = await validarCodigoCumple(meta0.codigoCumple, hoyMX()).catch(() => null);
        if (v && !v.ok) cumpleMalo = v.error;
      }
    }
  }

  const intentar = () => prisma.$transaction(async (tx) => {
    avisos.length = 0; // un segundo intento no repite los avisos del primero
    revisar.length = 0;
    // 🔴 El candado: dos /confirma del mismo folio a la vez (un reintento, un
    // doble envío), dos clics en «Convertir», dos personas o la liga pagada
    // mientras alguien convierte hacen fila aquí. El segundo ya ve la reserva
    // del primero.
    await tx.$queryRaw`SELECT id FROM "TourQuote" WHERE id = ${quoteId} FOR UPDATE`;
    const q = await tx.tourQuote.findUnique({ where: { id: quoteId } });
    if (!q) throw new ErrorCotizacion(404, "No existe esa cotización.");
    const meta = metaDeCotizacion(q.packageItems);

    // ¿Ya tiene reserva? Convertida aquí (su folio quedó en el `_meta`): se
    // devuelve tal cual. Convertida por otro camino (la reserva guarda de qué
    // cotización salió): se le anota el folio a la cotización.
    const previa = await reservaPreviaDeCotizacion(tx, q);
    if (previa?.porFolio) return { reserva: previa.reserva, cotizacion: q, nueva: false, antes: q.status, eventoDescuento: null };
    if (previa) {
      const cotizacion = await tx.tourQuote.update({
        where: { id: q.id },
        data:  {
          status: "aceptada",
          // KPI «Cotización → reserva a 14 días» (4 nov 2026): la primera vez.
          ...(q.status !== "aceptada" ? { aceptadaEn: new Date() } : {}),
          packageItems: conMetaCotizacion(q.packageItems, { reservaFolio: previa.reserva.confirmationNumber, reservaId: previa.reserva.id }) as never,
        },
      });
      return { reserva: previa.reserva, cotizacion, nueva: false, antes: q.status, eventoDescuento: null };
    }

    // Los datos del cliente como quedaron en el cuadro del panel (el correo
    // pudo corregirse ahí); sin cuadro, los de la cotización.
    const c = opciones.contacto ?? null;
    const nombreCliente = texto(c?.nombre, 120) || q.customerName;
    const correoCliente = c ? texto(c.correo, 160) : (q.customerEmail || "");
    const telCliente    = c ? (texto(c.telefono, 40) || null) : (q.customerPhone || null);

    // 🔴 Reemplazada: el cliente cambió algo y el bot le mandó otra (la de
    // `reemplazadaPor`). Convertir ésta crearía la reserva con el viaje VIEJO
    // y le diría «tu reserva quedó confirmada» con esos datos. Pasaba por la
    // regla de abajo: se reemplaza mientras sigue viva, así que casi toda
    // reemplazada «venció ayer u hoy» y se convertía con un aviso genérico.
    const reemplazadaPor = typeof meta.reemplazadaPor === "string" && meta.reemplazadaPor ? meta.reemplazadaPor : null;
    if (reemplazadaPor) {
      if (!forzar) {
        throw new ErrorCotizacion(409, `La cotización ${q.quoteNumber} fue reemplazada por la ${reemplazadaPor} (el cliente cambió algo): ` + comoSeguir(
          `confirma la ${reemplazadaPor}. Si de verdad pagó la vieja, repite el /confirma con «forzar» al final.`,
          `convierte la ${reemplazadaPor}. Si de verdad va esta, créala de todos modos.`));
      }
      avisos.push(`La cotización ${q.quoteNumber} había sido reemplazada por la ${reemplazadaPor}: se convirtió ${porForzar}. Da de baja la ${reemplazadaPor} en el panel si ya no va.`);
      revisar.push(`era la vieja (la reemplazó la ${reemplazadaPor})`);
    }

    const hoy = hoyMX();
    if (q.status === "expirada" && !reemplazadaPor) {
      const venceEl = fechaLimite(q);
      // Venció hace nada y el tour no ha pasado: el cliente pudo pagar a
      // tiempo (el tour de mañana vence la víspera y el cron la pasa a vencida
      // a medianoche) y Manolo confirma a las 7:30 am. Se acepta con aviso.
      const reciente = esYMD(venceEl) && venceEl >= addDaysYMD(hoy, -1) && esYMD(q.tourDate) && q.tourDate >= hoy;
      if (!forzar && !reciente) {
        throw new ErrorCotizacion(409, `La cotización ${q.quoteNumber} está vencida${venceEl ? ` (venció el ${venceEl})` : ""}. ` + comoSeguir(
          "Si el pago llegó a tiempo y todavía hay lugar, repite el /confirma con «forzar» al final; si no, reactívala en el panel con una fecha límite nueva.",
          "Si el cliente pagó a tiempo y todavía hay lugar, créala de todos modos; si no, reactívala con una fecha límite nueva (Editar)."));
      }
      avisos.push(`La cotización ${q.quoteNumber} estaba vencida${venceEl ? ` (el ${venceEl})` : ""}: se convirtió igual. Revisa que el precio y el lugar sigan en pie.`);
      revisar.push(`estaba vencida${esYMD(venceEl) ? ` desde el ${fechaCorta(venceEl)}` : ""}`);
    }
    if (q.status === "aceptada") {
      // La pasó a «aceptada» una liga pagada o el cron (mismo correo en una
      // reserva del sitio) sin crear reserva: una persona confirmó el pago,
      // así que ahora sí se crea.
      avisos.push(`La cotización ${q.quoteNumber} ya decía «aceptada» pero no tenía reserva: se creó ahora. Revisa que no haya otra reserva del mismo cliente.`);
    }

    const tourLines = Array.isArray(q.lineItems)
      ? (q.lineItems as Record<string, unknown>[]).filter((l) => l && !l._meta)
      : [];

    // 🔴 ¿El MISMO cliente ya tiene otra reserva para esas fechas, hecha
    // después de la cotización? Es el link de pago que el bot le mandó (pagó
    // en la web y se armó su HP…) o una conversión del panel que perdió su
    // `cotizacionOrigen`. Convertir aquí haría dos reservas y contaría dos
    // veces el mismo dinero en Finanzas.
    const fechas = Array.from(new Set([q.tourDate, ...tourLines.map((l) => String(l.tourDate ?? ""))].filter(esYMD)));
    const correo = norm(correoCliente);
    const tel = diezDigitos(telCliente) || diezDigitos(meta.waTelefono);
    if (fechas.length && (correo.includes("@") || tel)) {
      const candidatas = await tx.tourBooking.findMany({
        where:   { tourDate: { in: fechas }, status: { notIn: ["cancelled", "borrador"] }, createdAt: { gte: q.createdAt } },
        select:  {
          confirmationNumber: true, customerEmail: true, customerPhone: true, tourName: true, tourDate: true, createdAt: true,
          totalAmount: true, depositoPagado: true, stripePaymentIntentId: true,
        },
        orderBy: { createdAt: "asc" },
        take:    200,
      });
      const otra = candidatas.find((b) =>
        (correo.includes("@") && norm(b.customerEmail) === correo) || (!!tel && diezDigitos(b.customerPhone) === tel));
      if (otra) {
        const pagado = montoCobrado(otra);
        const cual = `${otra.confirmationNumber} (${otra.tourName || "sin tour"}, ${otra.tourDate}, hecha el ${fechaCortaMX(otra.createdAt)}${pagado > 0 ? `, ya registra ${pesos(pagado)} pagados` : ""})`;
        if (!forzar) {
          throw new ErrorCotizacion(409,
            `El mismo cliente ya tiene la reserva ${cual}. ` + comoSeguir(
              (otra.stripePaymentIntentId ? "La pagó en la web: ese pago YA está registrado, no confirmes nada. " : "") +
              `Si es OTRO pago de esa reserva (el saldo), confírmalo con /confirma ${otra.confirmationNumber} <monto>; si de verdad es otra reserva distinta, repite con «forzar» al final.`,
              (otra.stripePaymentIntentId ? "La pagó en la web: ese pago YA está registrado. " : "") +
              `Si es la misma venta, no crees otra: el pago se registra en esa reserva (Reservas → Registrar cobro). Si de verdad es otra reserva distinta, créala de todos modos.`));
        }
        avisos.push(`Ojo: el mismo cliente ya tenía la reserva ${cual}; se creó otra ${porForzar}.`);
        revisar.push(`el mismo cliente ya tenía la ${otra.confirmationNumber}`);
      }
    }

    // El grupo real: si la cotización no traía `numPersonas`, se deduce de las
    // líneas en vez de guardar 0 y perder el dato.
    const grupo    = grupoDe(q);
    const personas = Number(meta.numPersonas) || grupo.total || 0;

    // Un evento (Xantolo) se vuelve a contar ANTES de apartar: la cotización
    // no aparta lugar y en sus 48 h la web pudo vender el último cuarto.
    if (cupoEvento) {
      if (!cupoEvento.lugares) {
        avisos.push(`No pude contar el cupo de ${cupoEvento.nombre}${cupoEvento.error ? ` (${cupoEvento.error})` : ""}: revísalo en el tablero antes de confirmarle al cliente.`);
        revisar.push(`no se pudo contar el cupo de ${cupoEvento.nombre}`);
      } else if (personas > 0 && !cabeEnCupo(cupoEvento.lugares, personas)) {
        const quedan = textoLugares(cupoEvento.lugares);
        if (!forzar) {
          throw new ErrorCotizacion(409, `Ya no hay lugar en ${cupoEvento.nombre} para ${personas} persona(s) (${quedan}). ` + comoSeguir(
            "El pago entró: decide con el cliente (otra fecha o devolución). Para meterlo de todos modos, repite con «forzar» al final.",
            "Decide con el cliente (otra fecha o devolución) o, si ya lo arreglaste con el hotel, créala de todos modos."));
        }
        avisos.push(`${cupoEvento.nombre} ya estaba lleno (${quedan}): se apartó ${porForzar}. Ajusta el cupo con el hotel.`);
        revisar.push(`${cupoEvento.nombre} ya estaba lleno`);
      }
    }

    // (Solo el panel, antes de cobrar.) El descuento de cumpleaños de la
    // cotización con un código que ya se usó o venció: lo frenaba el POST de
    // Reservas que usaba el cuadro de Convertir, y se sigue frenando.
    if (cumpleMalo && !forzar) {
      throw new ErrorCotizacion(409, `${cumpleMalo} La cotización trae ese descuento de cumpleaños: quítalo (Editar) o, si ya lo revisaste, créala de todos modos.`);
    }

    // El cupo y las fechas cerradas de cada recorrido (5 nov 2026: la liga
    // pagada creaba la reserva en una fecha llena sin decir nada). No frena
    // —a veces se suma una unidad—, pero queda en las notas, como en el panel.
    const avisoCupo = avisoSobrecupo(sinLugar, `al convertir la cotización ${q.quoteNumber}`);
    if (avisoCupo) {
      avisos.push(avisoCupo.replace(/^⚠️ /, ""));
      revisar.push(...etiquetasSinLugar(sinLugar));
    }

    // En qué idioma sale el guía: lo elegido en el panel o, si nadie lo
    // eligió (la liga pagada), lo que dicen su contacto o la cotización. Antes
    // nacía siempre «es» y Salidas no avisaba que el grupo hablaba inglés.
    const idiomaTour = idiomaTourDeConversion({ elegido: opciones.idiomaTour, idiomaContacto, locale: meta.locale });
    if (idiomaTour === "en") revisar.push("guía en inglés");

    // Lo ACORDADO, no lo cobrado. Sin `_meta` (cotizaciones viejas del bot) es
    // el 30 %: lo que les prometieron el correo y el WhatsApp de su folio.
    const anticipoAcordado = meta.anticipo != null && Number.isFinite(Number(meta.anticipo))
      ? Math.max(0, Math.round(Number(meta.anticipo)))
      : Math.round(q.totalAmount * (ANTICIPO_PCT / 100));
    const lineItems = [
      {
        _meta: true,
        // Vacío a propósito: el método de verdad lo pone el cobro que se registre.
        metodoPago:       "",
        folioPago:        "",
        anticipoAcordado,
        pickupLugar:      texto(opciones.pickupLugar, 200),
        numPersonas:      personas,
        // Rastro de la cotización y de su precio: sin esto se perdía POR QUÉ
        // el total no cuadra con la suma de líneas.
        cotizacionOrigen: q.quoteNumber,
        notasInternas:    typeof meta.notasInternas === "string" ? meta.notasInternas : "",
        priceOverride:    meta.priceOverride ?? null,
        discountType:     meta.discountType ?? null,
        discountValue:    meta.discountValue ?? null,
        // El descuento pasa tal cual, con su sello y su historial (ver `descuento.ts`).
        ...((meta as any).descuento !== undefined ? { descuento: (meta as any).descuento } : {}),
        ...(Array.isArray((meta as any).descuentoHistorial) ? { descuentoHistorial: (meta as any).descuentoHistorial } : {}),
        // El código de cumpleaños con que se cotizó: se canjea al crear la reserva.
        ...(typeof (meta as any).codigoCumple === "string" && (meta as any).codigoCumple ? { codigoCumple: (meta as any).codigoCumple } : {}),
        // Lo del bot: el idioma del correo de confirmación, a qué chat se le
        // contesta y dónde dijo que se hospeda (para pedirle la dirección).
        ...(meta.locale === "en" ? { locale: "en" } : meta.locale === "es" ? { locale: "es" } : {}),
        ...(meta.waChatId ? { waChatId: meta.waChatId } : {}),
        ...(meta.waTelefono ? { waTelefono: meta.waTelefono } : {}),
        ...(meta.zonaHospedaje ? { zonaHospedaje: meta.zonaHospedaje } : {}),
      },
      ...tourLines,
    ];
    // El descuento conserva su sello; uno viejo sin sello se sella con quién
    // convirtió, como hacía el POST de Reservas que usaba el panel.
    const sellado = sellarEnLineItems(lineItems, null, actor.nombre);
    // Un paquete del catálogo o de evento se guarda con SU slug, como la
    // reserva del sitio: el cupo del Xantolo se cuenta por ese slug.
    const slugPaquete = typeof meta.paqueteSlug === "string" && getPaquete(meta.paqueteSlug) ? meta.paqueteSlug : null;
    const tourSlug = slugPaquete ?? q.tourSlug;

    const reserva = await tx.tourBooking.create({
      data: {
        confirmationNumber: folioReserva(),
        // 🔴 Nace PENDIENTE: el anticipo acordado no es dinero que alguien vio.
        // En cuanto se registra el cobro, `sincronizarDeposito` la pasa a pagada.
        status:         "pending",
        tourId:         tourSlug,
        tourName:       q.tourName,
        tourSlug,
        tourDate:       q.tourDate,
        adults:         grupo.adultos || 1,
        children:       grupo.ninos,
        totalAmount:    q.totalAmount,
        depositoPagado: 0,
        lineItems:      sellado.lineItems as never,
        packageItems:   habitacionesParaReserva(q.packageItems) as never,
        extraItems:     extrasDe(q.extraItems) as never,
        customerName:   nombreCliente,
        customerEmail:  correoCliente,
        customerPhone:  telCliente,
        notes:          [avisoCupo, q.notes].filter(Boolean).join("\n") || null,
        origen:         origenValido(opciones.origen ?? "whatsapp"),
        // Lo que la cotización no trae y el panel pide al convertir.
        idiomaTour,
        guia:           texto(opciones.guia, 80) || null,
        // El lead del CRM de la cotización sigue en su reserva (4 nov 2026).
        oportunidadId:  q.oportunidadId ?? null,
        // Qué cotización la originó (KPI «Cotización → reserva», 4 nov 2026).
        cotizacionId:   q.id,
      },
    });
    const cotizacion = await tx.tourQuote.update({
      where: { id: q.id },
      data:  {
        status: "aceptada",
        ...(q.status !== "aceptada" ? { aceptadaEn: new Date() } : {}),
        packageItems: conMetaCotizacion(q.packageItems, { reservaFolio: reserva.confirmationNumber, reservaId: reserva.id }) as never,
      },
    });
    return { reserva, cotizacion, nueva: true, antes: q.status, eventoDescuento: sellado.evento as EventoDescuento | null };
  }, { maxWait: 10_000, timeout: 20_000 });

  let r: Awaited<ReturnType<typeof intentar>>;
  try {
    r = await intentar();
  } catch (e: unknown) {
    // Folio de reserva repetido (mismo milisegundo y mismo sufijo): otra vez.
    if ((e as { code?: string })?.code !== "P2002") throw e;
    r = await intentar();
  }

  if (r.nueva) {
    // El código de cumpleaños de la cotización queda usado por esta reserva. Ya
    // está pagada: si el código no sirvió (otra reserva lo usó antes), no se
    // deshace la venta; queda en la bitácora para revisarlo.
    const codigo = codigoDeLineas(r.reserva.lineItems);
    if (codigo) {
      const c = await canjearCodigoCumple(codigo, r.reserva.confirmationNumber, hoyMX());
      if (!c.ok) {
        avisos.push(`La reserva ${r.reserva.confirmationNumber} trae el descuento del código de cumpleaños ${codigo}, pero no se pudo usar (${c.error}): revisa el precio.`);
        revisar.push(`el código ${codigo} ya no servía`);
      }
      await registrarEnBitacora({
        accion:     "modificó",
        entidad:    "reserva",
        referencia: r.reserva.confirmationNumber,
        resumen:    c.ok
          ? `Reserva ${r.reserva.confirmationNumber}: usó el código de cumpleaños ${codigo}`
          : `⚠️ Reserva ${r.reserva.confirmationNumber}: trae el descuento del código ${codigo}, pero no se pudo usar (${c.error})`,
        actor,
      });
    }
    // La venta ya está cerrada: se apaga el carrito abandonado que la originó,
    // o el cron le seguiría escribiendo «¿Apartamos tu lugar?».
    const cerrados = await cerrarCarritosDe(r.reserva.customerEmail, toursDeReserva(r.reserva));
    await registrarEnBitacora({
      accion:     "creó",
      entidad:    "reserva",
      referencia: r.reserva.confirmationNumber,
      resumen:    `Reserva ${r.reserva.confirmationNumber} — ${r.reserva.customerName}, ${r.reserva.tourName || "sin tour"} el ${r.reserva.tourDate || "sin fecha"}, ${pesos(r.reserva.totalAmount)} (de la cotización ${r.cotizacion.quoteNumber}${cerrados ? `; ${cerrados} carrito(s) cerrados` : ""})`
        + (r.eventoDescuento ? ` · ${resumenEvento(r.eventoDescuento)}` : "")
        + (avisos.length ? ` · ⚠️ ${avisos.join(" ")}` : ""),
      actor,
    });
    await registrarEnBitacora({
      accion:     "modificó",
      entidad:    "cotización",
      referencia: r.cotizacion.quoteNumber,
      resumen:    `Cotización ${r.cotizacion.quoteNumber} aceptada: es la reserva ${r.reserva.confirmationNumber}`,
      detalle:    [{ campo: "estado", antes: r.antes, despues: "aceptada" }],
      actor,
    });
  } else if (r.reserva.status === "cancelled") {
    avisos.push(`La cotización ${r.cotizacion.quoteNumber} ya era la reserva ${r.reserva.confirmationNumber}, que está CANCELADA.`);
    revisar.push(`su reserva ${r.reserva.confirmationNumber} está cancelada`);
  }

  // 🔴 Primero el dinero, después el lead (5 nov 2026). Lo pagado con la liga
  // de la cotización se abona a su reserva (nueva o ya existente; cada liga
  // una sola vez) ANTES de mover el lead: al revés, la reserva en $0 lo bajaba
  // de Anticipo a En seguimiento y el abono lo volvía a subir.
  const cobradoAntes = montoCobrado(r.reserva);
  const abonadoPorLiga = await import("@/lib/admin/linksPago").then(m => m.abonarLigasDeCotizacion(r.cotizacion.id, r.reserva.id))
    .catch(e => { console.error("abonarLigasDeCotizacion:", (e as Error)?.message); return 0; });
  if (abonadoPorLiga > 0 && cobradoAntes > 0) {
    // Alguien registró el anticipo a mano antes de que Stripe avisara: el
    // dinero de la liga entra igual (es real) y una persona decide si es doble.
    avisos.push(`La reserva ${r.reserva.confirmationNumber} ya tenía ${pesos(cobradoAntes)} registrados y se le sumaron ${pesos(abonadoPorLiga)} de la liga de pago: si son el mismo pago, anula el que se capturó a mano.`);
    revisar.push(`ya tenía ${pesos(cobradoAntes)} antes de la liga: ¿pago repetido?`);
  }

  if (r.nueva) {
    const crm = await import("@/lib/admin/crmDatos");
    // Sin lead (cotizaciones de antes del CRM, o una vencida que pagó su
    // liga): la reserva entra al CRM con el lead de esa persona o uno nuevo, y
    // la cotización queda enlazada a él. Antes solo lo hacía el panel.
    if (!r.reserva.oportunidadId) {
      const opId = await crm.leadParaReservaSinLead(r.reserva.id, actor.nombre).catch(() => null);
      if (opId) await prisma.tourQuote.updateMany({ where: { id: r.cotizacion.id, oportunidadId: null }, data: { oportunidadId: opId } }).catch(() => {});
    }
    // Su lead pasa a la etapa que dice lo cobrado. Con el cuadro del panel,
    // el nombre, correo y teléfono que se corrigieron pasan a su contacto. No lanza.
    await crm.leadDesdeReserva(r.reserva.id, `cotización ${r.cotizacion.quoteNumber} convertida en la reserva ${r.reserva.confirmationNumber}`, { revivir: true, conContacto: !!opciones.contacto })
      .catch(() => {});
  }

  // La reserva como quedó: con lo abonado y su lead.
  const reserva = (await prisma.tourBooking.findUnique({ where: { id: r.reserva.id } }).catch(() => null)) ?? r.reserva;
  return { reserva, cotizacion: r.cotizacion, nueva: r.nueva, avisos, revisar, abonadoPorLiga };
}

// ── Correo de confirmación ──────────────────────────────────────────────────

/**
 * El correo de confirmación de una reserva: el cuerpo de
 * `/api/admin/reservas/[id]/send-email` movido aquí tal cual, para que el
 * cliente que confirma por WhatsApp reciba EL MISMO correo que se manda desde
 * el panel. Nunca lanza.
 */
export async function enviarConfirmacionReserva(bookingId: string, actor?: Actor): Promise<ResultadoCorreoReserva> {
  try {
    const b = await prisma.tourBooking.findUniqueOrThrow({ where: { id: bookingId } });

    // No enviar a direcciones inválidas (p. ej. reservas recuperadas por webhook).
    if (!b.customerEmail || !b.customerEmail.includes("@") || b.customerEmail.endsWith("@desconocido")) {
      return { ok: false, emailEnviado: false, destinatario: null, motivo: "sin-correo", error: "Esta reserva no tiene un email válido del cliente." };
    }

    // Extraer meta (_meta) de lineItems donde se guardan metodoPago, folioPago, pickupLugar
    const rawLines: any[] = Array.isArray((b as any).lineItems) ? (b as any).lineItems : [];
    const meta = rawLines.find((l: any) => l._meta) ?? {};

    // Pago online por Stripe = liquidado al 100% aunque no tenga anticipo registrado.
    const rawDeposito = b.depositoPagado ?? 0;
    // Revisión del 4 nov 2026: el mismo criterio que el panel (una reembolsada ya no sale «Liquidado» en el correo).
    const depositoEfectivo = rawDeposito > 0 ? rawDeposito : montoCobrado(b);

    const html = buildTourEmailHtml({
      customerName:       b.customerName,
      confirmationNumber: b.confirmationNumber,
      paymentIntentId:    b.stripePaymentIntentId || undefined,
      tourName:           b.tourName,
      tourDate:           b.tourDate,
      tourSlug:           b.tourSlug,
      adults:             b.adults,
      children:           b.children,
      totalAmount:        b.totalAmount,
      promoCode:          b.promoCode || undefined,
      promoDiscount:      b.promoDiscount,
      depositoPagado:     depositoEfectivo,
      metodoPago:         meta.metodoPago || undefined,
      pickupLugar:        meta.pickupLugar || undefined,
      partySize:          Number(meta.numPersonas) || undefined,
      lineItems:          rawLines.filter((l: any) => l && !l._meta),
      packageItems:       Array.isArray((b as any).packageItems) ? (b as any).packageItems : [],
      extraItems:         (b as any).extraItems ?? [],
      // Reenviar en el idioma en que el cliente compró (guardado en `_meta`).
      locale:             meta.locale,
    });

    const adminTo = process.env.ADMIN_EMAIL_TOURS || "daftpunkmanolo@gmail.com";

    await sendBrevoEmail({
      to:      [{ email: b.customerEmail, name: b.customerName }],
      bcc:     [{ email: adminTo }],
      subject: meta.locale === "en"
        ? `Your tour is confirmed — ${b.confirmationNumber}`
        : `Tu tour está confirmado — ${b.confirmationNumber}`,
      htmlContent: html,
    });

    await registrarEnBitacora({
      accion:     "envió",
      entidad:    "reserva",
      referencia: b.confirmationNumber,
      resumen:    `Correo de confirmación de ${b.confirmationNumber} a ${b.customerEmail} (${b.customerName})`,
      actor,
    });

    return { ok: true, emailEnviado: true, destinatario: b.customerEmail };
  } catch (e: unknown) {
    return { ok: false, emailEnviado: false, destinatario: null, motivo: "error", error: e instanceof Error ? e.message : String(e) };
  }
}

// ── Confirmar un pago ───────────────────────────────────────────────────────

/**
 * El método de cobro a partir de lo que escribió quien confirma: los ids de
 * `metodosCobro.ts` y las palabras de todos los días («oxxo», «spei», «liga»).
 * Sin nada, transferencia (13 de 26 anticipos de los chats). null si no se entiende.
 */
export function metodoDeTexto(v: unknown): MetodoCobro | null {
  const t = norm(v);
  if (!t) return "transferencia";
  if (metodoValido(t)) return t;
  const SINONIMOS: Record<string, MetodoCobro> = {
    transfer: "transferencia", spei: "transferencia", banco: "transferencia",
    oxxo: "deposito", ventanilla: "deposito",
    liga: "stripe", link: "stripe", tarjeta: "stripe", card: "stripe",
    cash: "efectivo",
  };
  return SINONIMOS[t] ?? null;
}

/** De qué tipo de archivo se guarda cuando el nombre no trae extensión. */
const EXTENSION: Record<string, string> = {
  "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png",
  "image/webp": "webp", "image/heic": "heic", "image/heif": "heif",
};

type ComprobanteLeido = { ok: true; datos: Buffer; tipoMime: string; nombre: string } | { ok: false; motivo: string };

/**
 * El comprobante que reenvía el bot (base64 de whatsapp-web.js), con las
 * mismas reglas que la subida del panel: PDF o imagen, hasta 5 MB. Con
 * `Buffer` y no `File`: Railway corre Node 18, donde `File` no es global.
 */
function leerComprobante(c: ComprobanteBot | null | undefined, folio: string): ComprobanteLeido | null {
  if (!c || !c.base64) return null;
  const limpio = String(c.base64).replace(/^data:[^,]*,/, "").replace(/\s+/g, "");
  const datos = Buffer.from(limpio, "base64");
  if (!datos.length) return { ok: false, motivo: "llegó vacío." };
  if (datos.length > MAX_BYTES_EVIDENCIA) {
    return { ok: false, motivo: `pesa ${(datos.length / 1024 / 1024).toFixed(1)} MB y el máximo son 5 MB.` };
  }
  const declarado = String(c.mimetype ?? "").toLowerCase().split(";")[0].trim();
  const nombre = texto(c.filename, 200).replace(/[\\/\0]/g, "_")
    || `comprobante-${folio}.${EXTENSION[declarado] ?? "bin"}`;
  const tipoMime = tipoDeArchivo(nombre, declarado);
  if (!TIPOS_OK.has(tipoMime)) return { ok: false, motivo: "solo se aceptan PDF o imágenes (JPG, PNG, WEBP, HEIC)." };
  return { ok: true, datos, tipoMime, nombre };
}

/**
 * Un /confirma repetido (reintento del bot, doble envío) no registra el mismo
 * dinero dos veces. Cuenta el cobro igual de CUALQUIERA: el abono que Erick
 * acaba de capturar en el panel tampoco se duplica con un /confirma del mismo
 * monto. Un segundo pago igual de verdad pasa con `forzar`.
 */
const VENTANA_REPETIDO_MS = 15 * 60 * 1000;

async function cobroRepetido(reservaId: string, monto: number): Promise<boolean> {
  const n = await prisma.movimiento.count({
    where: {
      reservaId, tipo: "cobro", anulado: false, monto,
      createdAt: { gte: new Date(Date.now() - VENTANA_REPETIDO_MS) },
    },
  });
  return n > 0;
}

/**
 * Lo que dispara el `/confirma <folio> [monto] [método]` de Manolo: él ya vio
 * el dinero en su banco; el bot nunca llega aquí solo.
 *
 *  1. COT- / HP-P (cotización) → la convierte en reserva HP-M- (sin duplicar).
 *     HP-M- / HP (reserva) → usa la reserva; una «borrador» del bot viejo pasa
 *     a pendiente.
 *  2. Registra el cobro con `registrarCobro`: monto (sin monto, el anticipo
 *     acordado), método, nota «Confirmado por WhatsApp (bot) · quién», actor BOT.
 *  3. Guarda el comprobante en `Evidencia`, ligado a ese cobro.
 *  4. Manda el correo de confirmación de siempre.
 *
 * No registra nada (y lo dice en `yaConfirmada`) si ya estaba confirmada con
 * ese folio de cotización, si ya está liquidada, o si el mismo pago se
 * registró hace minutos. Lanza `ErrorCotizacion`: 404 sin folio, 409 cotización
 * vencida o reserva cancelada, 400 monto o método que no sirven.
 */
export async function confirmarPagoCotizacion(p: ConfirmarPagoInput): Promise<ConfirmacionResultado> {
  const actor = p.actor ?? BOT;
  const folio = texto(p.folio, 60).toUpperCase();
  if (!folio) throw new ErrorCotizacion(400, "Falta el folio.");

  const metodo = metodoDeTexto(p.metodo);
  if (!metodo) {
    throw new ErrorCotizacion(400, `No entiendo el método «${texto(p.metodo, 30)}»: usa transferencia, deposito (Oxxo), stripe (liga), efectivo u otro.`);
  }
  let monto: number | null = null;
  if (p.monto !== undefined && p.monto !== null && String(p.monto).trim() !== "") {
    const n = Math.round(Number(p.monto));
    if (!Number.isFinite(n) || n <= 0) throw new ErrorCotizacion(400, `El monto «${texto(p.monto, 20)}» no sirve: tiene que ser mayor a cero.`);
    monto = n;
  }
  const confirmadoPor = texto(p.confirmadoPor, 60);
  // El dueño ya revisó lo que se frenó (otra reserva del mismo cliente,
  // cotización vencida, evento sin lugar, el mismo pago hace minutos).
  const forzar = p.forzar === true;
  const avisos: string[] = [];
  // 🔴 Un comprobante que no sirve NO tumba la confirmación: el dinero ya lo
  // vio una persona y el cliente espera su confirmación. Se avisa y el
  // archivo sigue guardado en el bot.
  const archivo = leerComprobante(p.comprobante, folio);
  if (archivo && !archivo.ok) avisos.push(`El comprobante no se guardó: ${archivo.motivo}`);

  // ── 1. Cotización o reserva ────────────────────────────────────────────────
  let reserva: TourBooking | null;
  let reservaNueva = false;
  let repetido = false;
  const cotizacion = await prisma.tourQuote.findUnique({ where: { quoteNumber: folio } });
  if (cotizacion) {
    // Antes de convertir: un dedazo no debe dejar una reserva creada.
    if (monto !== null && monto > cotizacion.totalAmount) {
      throw new ErrorCotizacion(400, `La cotización ${folio} es por ${pesos(cotizacion.totalAmount)} y ${pesos(monto)} es más que eso. Revisa el monto.`);
    }
    const conv = await convertirCotizacionEnReserva(cotizacion.id, { origen: "whatsapp", actor, forzar });
    reserva = conv.reserva;
    reservaNueva = conv.nueva;
    avisos.push(...conv.avisos);
    // Ya convertida y con dinero: es el mismo /confirma otra vez. Un segundo
    // pago (el saldo) se confirma con el folio de la RESERVA.
    if (!conv.nueva && montoCobrado(reserva) > 0) {
      repetido = true;
      avisos.push(`${folio} ya estaba confirmada como ${reserva.confirmationNumber}: no se registró nada. Para otro pago (el saldo) usa ${reserva.confirmationNumber}.`);
    }
  } else {
    reserva = await prisma.tourBooking.findUnique({ where: { confirmationNumber: folio } });
    if (!reserva) throw new ErrorCotizacion(404, `No existe ninguna cotización ni reserva con el folio ${folio}.`);
  }
  if (reserva.status === "cancelled") {
    throw new ErrorCotizacion(409, `La reserva ${reserva.confirmationNumber} está cancelada: no se le registra el pago.`);
  }

  // Las reservas que creó el bot viejo nacieron «borrador», un estado que el
  // panel no conoce: así `sincronizarDeposito` nunca la daría por pagada.
  if (!repetido && reserva.status === "borrador") {
    reserva = await prisma.tourBooking.update({ where: { id: reserva.id }, data: { status: "pending" } });
    await registrarEnBitacora({
      accion:     "modificó",
      entidad:    "reserva",
      referencia: reserva.confirmationNumber,
      resumen:    `Reserva ${reserva.confirmationNumber}: de «borrador» a pendiente para registrar su pago`,
      detalle:    [{ campo: "estado", antes: "borrador", despues: "pending" }],
      actor,
    });
  }

  // ── 2. El cobro ────────────────────────────────────────────────────────────
  let cobroRegistrado = 0;
  let movimientoId: string | null = null;
  if (!repetido) {
    const yaCobrado = montoCobrado(reserva);
    const saldo = Math.max(0, reserva.totalAmount - yaCobrado);
    if (saldo <= 0) {
      repetido = true;
      avisos.push(`La reserva ${reserva.confirmationNumber} ya estaba liquidada: no se registró nada.`);
    } else {
      const acordado = Number(metaDe(reserva).anticipoAcordado);
      // Sin monto: el anticipo acordado, y solo si todavía no ha entrado nada
      // (después de eso no hay forma de saber cuánto llegó).
      const aCobrar = monto ?? (yaCobrado > 0
        ? null
        : (Number.isFinite(acordado) && acordado > 0
            ? Math.round(acordado)
            : Math.round(reserva.totalAmount * (ANTICIPO_PCT / 100))));
      if (aCobrar === null) {
        repetido = true;
        avisos.push(`La reserva ${reserva.confirmationNumber} ya tiene ${pesos(yaCobrado)} registrados: para sumar otro pago di el monto.`);
      } else if (aCobrar > saldo) {
        throw new ErrorCotizacion(400, `La reserva ${reserva.confirmationNumber} solo debe ${pesos(saldo)} y ${pesos(aCobrar)} es más. Revisa el monto.`);
      } else if (!forzar && await cobroRepetido(reserva.id, aCobrar)) {
        repetido = true;
        avisos.push(`Ya se había registrado un pago de ${pesos(aCobrar)} en ${reserva.confirmationNumber} hace unos minutos: no se duplicó. Si de verdad entró OTRO pago igual, repite con «forzar» al final.`);
      } else {
        const r = await registrarCobro({
          reservaId:   reserva.id,
          monto:       aCobrar,
          metodo,
          // El concepto que se le pide al cliente en la transferencia es el folio.
          folio,
          recibidoPor: confirmadoPor || null,
          nota:        `Confirmado por WhatsApp (bot)${confirmadoPor ? ` · ${confirmadoPor}` : ""}`,
          creadoPor:   actor.nombre,
          actor,
        });
        cobroRegistrado = aCobrar;
        movimientoId = r.cobro.id;
      }
    }
  }

  // ── 3. El comprobante, colgado del cobro ───────────────────────────────────
  let comprobanteGuardado = false;
  if (archivo?.ok && movimientoId) {
    try {
      await prisma.evidencia.create({
        data: {
          bookingId:     reserva.id,
          movimientoId,
          nombreArchivo: archivo.nombre,
          tipoMime:      archivo.tipoMime,
          tamanoBytes:   archivo.datos.length,
          datos:         archivo.datos,
        },
      });
      comprobanteGuardado = true;
      await registrarEnBitacora({
        accion:     "creó",
        entidad:    "comprobante",
        referencia: reserva.confirmationNumber,
        resumen:    `Comprobante "${archivo.nombre}" en la reserva ${reserva.confirmationNumber} (${reserva.customerName})`,
        actor,
      });
    } catch (e: unknown) {
      console.error("cotizaciones/confirmar comprobante:", e instanceof Error ? e.message : e);
      avisos.push("El pago quedó registrado, pero el comprobante no se pudo guardar: súbelo desde el panel.");
    }
  } else if (archivo?.ok && !movimientoId) {
    avisos.push("No se registró un pago nuevo, así que el comprobante no se guardó.");
  }

  // ── 4. El correo de confirmación (solo si entró dinero nuevo) ──────────────
  let emailEnviado = false;
  if (cobroRegistrado > 0) {
    const correo = await enviarConfirmacionReserva(reserva.id, actor);
    emailEnviado = correo.emailEnviado;
    if (correo.motivo === "sin-correo") avisos.push("La reserva no tiene correo del cliente: la confirmación va solo por WhatsApp.");
    else if (!correo.ok) {
      console.error("cotizaciones/confirmar correo:", correo.error);
      avisos.push("El correo de confirmación no salió: reenvíalo desde el panel.");
    }
  }

  const final = await prisma.tourBooking.findUniqueOrThrow({ where: { id: reserva.id } });
  return armarConfirmacion(final, {
    folio, yaConfirmada: repetido, cobroRegistrado, metodo, reservaNueva,
    emailEnviado, comprobanteGuardado, avisos, cotizacion,
  });
}

// ── Lo que el bot le dice al cliente ────────────────────────────────────────

/** Lugares que NO son una dirección: con esto no se puede pasar por nadie. */
const LUGARES_GENERICOS = new Set([
  "", "lobby de tu hotel en xilitla", "xilitla", "ciudad valles", "cd valles", "cd. valles", "valles",
  "por confirmar", "pendiente",
]);

interface TourDeReserva { tour: Tour; fecha: string; hora?: string }

/**
 * Lo que necesita el WhatsApp de confirmación, desde la reserva ya cobrada:
 * pagado y saldo (del espejo de cobros), salida, recogida y qué llevar de
 * CADA recorrido, y si hay que pedirle el hospedaje para la recogida.
 */
async function armarConfirmacion(
  b: TourBooking,
  x: {
    folio: string; yaConfirmada: boolean; cobroRegistrado: number; metodo: MetodoCobro;
    reservaNueva: boolean; emailEnviado: boolean; comprobanteGuardado: boolean;
    avisos: string[]; cotizacion: TourQuote | null;
  },
): Promise<ConfirmacionResultado> {
  const metaR = metaDe(b);
  // El chat y el idioma viven en la cotización del bot; la reserva los copia
  // al convertirse, pero una convertida desde el panel no los trae.
  let metaQ: Record<string, any> = x.cotizacion ? metaDeCotizacion(x.cotizacion.packageItems) : {};
  if (!x.cotizacion && typeof metaR.cotizacionOrigen === "string" && metaR.cotizacionOrigen) {
    const q = await prisma.tourQuote.findUnique({ where: { quoteNumber: metaR.cotizacionOrigen } });
    if (q) metaQ = metaDeCotizacion(q.packageItems);
  }
  const locale: LocaleBot = (metaR.locale ?? metaQ.locale) === "en" ? "en" : "es";
  const en = locale === "en";
  const waChatId = (typeof metaR.waChatId === "string" && metaR.waChatId)
    || (typeof metaQ.waChatId === "string" && metaQ.waChatId) || undefined;

  const sinHora = en ? "we'll confirm it the day before" : "te la confirmamos un día antes";
  const fechaCorta = (ymd: string) => /^\d{4}-\d{2}-\d{2}$/.test(ymd)
    ? new Date(`${ymd}T12:00:00`).toLocaleDateString(en ? "en-US" : "es-MX", { weekday: "long", day: "numeric", month: "long" })
    : ymd;
  const nombreCorto = (t: Tour) => (en ? localizeTour(t, "en").nombreCorto : t.nombreCorto);

  // Cada recorrido con SU fecha: con varios, una sola «fecha» confundía días.
  const lineas = Array.isArray(b.lineItems)
    ? (b.lineItems as Record<string, any>[]).filter((l) => l && !l._meta && (l.tourSlug || l.tourName))
    : [];
  const recorridos: RecorridoConfirmado[] = [];
  const tours: TourDeReserva[] = [];
  const vistos = new Set<string>();
  for (const l of lineas) {
    const fecha = String(l.tourDate || b.tourDate || "");
    const clave = `${l.tourSlug || l.tourName}|${fecha}`;
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    const t = l.tourSlug ? TOURS_DB.find((y) => y.slug === l.tourSlug) : undefined;
    // El RZR arranca a la hora que eligió el cliente, no a la del catálogo.
    const hora = typeof l.hora === "string" && l.hora ? l.hora : undefined;
    if (t) {
      tours.push({ tour: t, fecha, hora });
      recorridos.push({
        nombre:    String(l.tourName || t.nombre),
        fecha,
        salida:    hora ?? (horaCorreo(t, en) || sinHora),
        recogida:  fraseRecogidaCorreo(t, en),
        // La lista de qué llevar solo existe en español: en inglés se omite
        // (el bot no pega «Aqua shoes o tenis que se puedan mojar…»).
        queLlevar: en ? [] : queLlevarDe(t.id),
      });
    } else {
      recorridos.push({ nombre: String(l.tourName || ""), fecha, queLlevar: [] });
    }
  }
  if (!lineas.length) {
    // Reserva vieja de un solo tour, sin `lineItems`.
    const t = TOURS_DB.find((y) => y.slug === b.tourSlug);
    if (t) {
      tours.push({ tour: t, fecha: b.tourDate });
      recorridos.push({ nombre: t.nombre, fecha: b.tourDate, salida: horaCorreo(t, en) || sinHora, recogida: fraseRecogidaCorreo(t, en), queLlevar: en ? [] : queLlevarDe(t.id) });
    }
  }

  const horaDe = (y: TourDeReserva) => y.hora ?? (horaCorreo(y.tour, en) || sinHora);
  const salida = !tours.length ? undefined
    : tours.length === 1 ? horaDe(tours[0])
    : tours.map((y) => `${nombreCorto(y.tour)} (${fechaCorta(y.fecha)}): ${horaDe(y)}`).join(" · ");
  const recogida = !tours.length ? undefined
    : tours.length === 1 ? salidasCorreo([tours[0].tour], locale).join(" ")
    : tours.map((y) => `${nombreCorto(y.tour)} (${fechaCorta(y.fecha)}): ${fraseRecogidaCorreo(y.tour, en)}`).join(" ");

  const filasHotel = Array.isArray(b.packageItems)
    ? (b.packageItems as Record<string, any>[]).filter((p) => p && p._meta !== true)
    : [];
  const esPaquete = filasHotel.length > 0 || !!getPaquete(b.tourSlug);
  // Hay que pedirle el hospedaje exacto si algún recorrido pasa por él, no se
  // hospeda con nosotros y no hay un lugar concreto capturado.
  const enNuestroHotel = filasHotel.some((p) => /para[ií]so encantado/i.test(String(p.hotel ?? "")));
  const lugar = norm(metaR.pickupLugar);
  const pideHospedaje = tours.some((y) => pasamosPorEl(y.tour)) && !enNuestroHotel && LUGARES_GENERICOS.has(lugar);

  const pagado = montoCobrado(b);
  const saldo = Math.max(0, b.totalAmount - pagado);
  return {
    folio:               x.folio,
    reservaFolio:        b.confirmationNumber,
    status:              b.status,
    tourName:            b.tourName,
    tourDate:            b.tourDate,
    adults:              b.adults,
    children:            b.children,
    customerName:        b.customerName,
    customerPhone:       b.customerPhone ?? null,
    ...(waChatId ? { waChatId } : {}),
    totalAmount:         b.totalAmount,
    pagado,
    saldo,
    liquidado:           saldo === 0,
    pctPagado:           Math.round((pagado / Math.max(1, b.totalAmount)) * 100),
    ...(salida ? { salida } : {}),
    ...(recogida ? { recogida } : {}),
    recorridos,
    esPaquete,
    pideHospedaje,
    yaConfirmada:        x.yaConfirmada,
    locale,
    cobroRegistrado:     x.cobroRegistrado,
    metodo:              x.metodo,
    reservaNueva:        x.reservaNueva,
    emailEnviado:        x.emailEnviado,
    comprobanteGuardado: x.comprobanteGuardado,
    avisos:              x.avisos,
  };
}
