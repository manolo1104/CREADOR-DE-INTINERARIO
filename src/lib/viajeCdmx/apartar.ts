/**
 * Apartar lugares del viaje mientras alguien paga, y soltarlos.
 *
 * Un apartado nace con 20 minutos (lo que tarda alguien en llenar la tarjeta).
 * Si elige OXXO, se alarga hasta que vence la ficha más un día hábil, porque
 * Stripe confirma el pago hasta un día hábil después. Y NUNCA se suelta un
 * lugar sin cancelar antes su cobro en Stripe: así no hay pago tardío posible
 * sobre un lugar que ya se le dio a otro (ver `revisarApartado`).
 */
import type Stripe from "stripe";
import type { ApartadoSalida, SalidaGrupal } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { logger } from "@/lib/logger";
import { hayMsi } from "@/lib/stripeMsi";
import { addDaysYMD, weekdayYMD, ymdMX } from "@/lib/dates";
import { conSalidaBloqueada, ErrorViaje, libres, ocupacion } from "./cupo";
import { montos, precioVigente, rangoCorto, seVende, type Montos } from "./precio";
import {
  APARTADO_MIN, MAX_POR_APARTADO, OXXO_DIAS_FICHA, OXXO_HASTA_DIAS_ANTES_DEL_CORTE, OXXO_MAXIMO,
  RENOVAR_MIN, ULTIMOS_LUGARES, VIAJE_NOMBRE, VIAJE_SLUG,
} from "./config";

/** Cuántos apartados vivos puede tener una misma conexión, entre todas las salidas. */
const MAX_APARTADOS_POR_HUELLA = 2;

export interface DatosApartado {
  salidaId: string;
  personas: number;
  nombre: string;
  email: string;
  telefono?: string | null;
  liderCodigo?: string | null;
  /** El precio por persona que vio el cliente. Si ya no vale, 409. */
  precioVisto?: number | null;
  huella?: string | null;
}

export interface ApartadoCreado {
  apartado: ApartadoSalida;
  salida: SalidaGrupal;
  montos: Montos;
  /** Libres que quedaron después de este apartado. */
  libresDespues: number;
  /** ¿Se ofrece OXXO en este cobro? */
  oxxo: boolean;
}

/** ¿El freno de mano de OXXO está puesto? `VIAJE_CDMX_OXXO=0` lo apaga sin desplegar código nuevo... salvo reiniciar. */
export function oxxoEncendido(): boolean {
  return process.env.VIAJE_CDMX_OXXO !== "0";
}

/**
 * Aparta lugares bajo el candado. Si no caben, 409 con los que quedan. Si el
 * precio que vio el cliente ya no vale (acabó la preventa mientras miraba),
 * 409 «precio-cambio» con el nuevo: nadie paga un precio que no vio.
 */
export async function apartarLugares(d: DatosApartado, ahora: Date = new Date()): Promise<ApartadoCreado> {
  const personas = Math.floor(Number(d.personas));
  if (!Number.isFinite(personas) || personas < 1) throw new ErrorViaje(400, "personas", "Elige cuántas personas viajan.");
  if (personas > MAX_POR_APARTADO) {
    throw new ErrorViaje(400, "grupo", `Para más de ${MAX_POR_APARTADO} personas escríbenos por WhatsApp: te armamos el grupo.`);
  }

  if (d.huella) {
    const vivos = await prisma.apartadoSalida.count({
      where: { huella: d.huella, estado: "activo", expiraEl: { gt: ahora } },
    });
    if (vivos >= MAX_APARTADOS_POR_HUELLA) {
      throw new ErrorViaje(429, "demasiados", "Ya tienes un apartado en proceso. Termina ese pago o espera unos minutos.");
    }
  }

  return conSalidaBloqueada(d.salidaId, async (tx, salida) => {
    if (salida.estado !== "publicada" || ahora.getTime() >= salida.fechaCorte.getTime()) {
      throw new ErrorViaje(410, "cerrada", "Esta fecha ya no está a la venta.");
    }
    if (!seVende(salida, ahora)) {
      throw new ErrorViaje(409, "no-abre", "Esta fecha todavía no abre. Déjanos tu correo y te avisamos.");
    }

    const o = await ocupacion(tx, salida.id, ahora);
    const quedan = libres(salida.capacidad, o);
    if (personas > quedan) {
      throw new ErrorViaje(409, "sin-lugar",
        quedan > 0 ? `Solo queda${quedan === 1 ? "" : "n"} ${quedan} lugar${quedan === 1 ? "" : "es"} en esta fecha.` : "Esta fecha se acaba de llenar.",
        { disponibles: quedan, enPago: o.enPago });
    }

    const unitario = precioVigente(salida, ahora);
    if (d.precioVisto != null && Number(d.precioVisto) !== unitario) {
      throw new ErrorViaje(409, "precio-cambio",
        `El precio de esta fecha cambió a $${unitario.toLocaleString("es-MX")} por persona.`,
        { precioUnitario: unitario });
    }

    const m = montos(salida, personas, ahora, unitario);
    const apartado = await tx.apartadoSalida.create({
      data: {
        salidaId:       salida.id,
        personas,
        precioUnitario: m.unitario,
        total:          m.total,
        anticipo:       m.anticipo,
        nombre:         d.nombre.trim().slice(0, 120),
        email:          d.email.trim().toLowerCase().slice(0, 160),
        telefono:       d.telefono ? String(d.telefono).trim().slice(0, 40) : null,
        liderCodigo:    d.liderCodigo ? String(d.liderCodigo).trim().toUpperCase().slice(0, 20) : null,
        expiraEl:       new Date(ahora.getTime() + APARTADO_MIN * 60_000),
        huella:         d.huella ?? null,
      },
    });

    const corteMenos = salida.fechaCorte.getTime() - OXXO_HASTA_DIAS_ANTES_DEL_CORTE * 86_400_000;
    const oxxo = oxxoEncendido()
      && m.anticipo <= OXXO_MAXIMO
      // Con los últimos lugares, una ficha sin pagar no puede taparlos un día entero.
      && quedan > ULTIMOS_LUGARES
      && ahora.getTime() < corteMenos;

    return { apartado, salida, montos: m, libresDespues: quedan - personas, oxxo };
  });
}

export interface ContextoCobro {
  sid?: string | null;
  gaClientId?: string | null;
}

/**
 * El PaymentIntent del apartado. Se crea DESPUÉS de soltar el candado (una
 * llamada a Stripe no puede tener a los demás compradores en fila).
 *
 * 🔴 Métodos por NOMBRE (`payment_method_types`), nunca automáticos: OXXO no
 * es un método con redirección, así que `allow_redirects: "never"` no lo
 * filtra, y la cuenta de Stripe se comparte con los tours y con Kora. Pidiéndolo
 * aquí por nombre, OXXO puede seguir APAGADO en la configuración por defecto y
 * no aparecer en ningún otro cobro.
 */
export async function crearCobroDelApartado(c: ApartadoCreado, ctx: ContextoCobro = {}): Promise<Stripe.PaymentIntent> {
  const { apartado, salida, montos: m } = c;
  const fechas = rangoCorto(salida.fechaSalida, salida.fechaRegreso);
  const base = {
    amount:        m.anticipo * 100,
    currency:      "mxn",
    description:   `${VIAJE_NOMBRE} · ${fechas} · ${m.personas} persona${m.personas === 1 ? "" : "s"} · anticipo`,
    receipt_email: apartado.email,
    metadata: {
      // `source` + `tourId` hacen que la conciliación de pagos lo vea como de
      // este sitio; `producto` lo manda a su propia rama (`recuperarPago.ts`).
      source:         "huasteca-potosina.com",
      producto:       "viaje-cdmx",
      tourId:         VIAJE_SLUG,
      tourSlug:       VIAJE_SLUG,
      tourName:       `${VIAJE_NOMBRE} · ${fechas}`,
      tourDate:       salida.fechaSalida,
      salidaId:       salida.id,
      holdId:         apartado.id,
      adults:         String(m.personas),
      children:       "0",
      precioUnitario: String(m.unitario),
      totalCompleto:  String(m.total),
      saldo:          String(m.saldo),
      customerName:   apartado.nombre,
      customerEmail:  apartado.email,
      customerPhone:  apartado.telefono ?? "",
      liderCodigo:    apartado.liderCodigo ?? "",
      locale:         "es",
      sid:            ctx.sid ? String(ctx.sid).slice(0, 80) : "",
      gaClientId:     ctx.gaClientId ? String(ctx.gaClientId).slice(0, 80) : "",
    },
  } satisfies Partial<Stripe.PaymentIntentCreateParams>;

  // Meses sin intereses y la ficha OXXO van en el MISMO objeto: `opcionesMsi()`
  // devuelve `payment_method_options` entero y esparcido junto a OXXO lo pisaría.
  const opcionesTarjeta = { card: { installments: { enabled: hayMsi(m.anticipo) } } };

  const crear = (conOxxo: boolean) => stripe.paymentIntents.create({
    ...base,
    payment_method_types: conOxxo ? ["card", "oxxo"] : ["card"],
    payment_method_options: conOxxo
      ? { ...opcionesTarjeta, oxxo: { expires_after_days: OXXO_DIAS_FICHA } }
      : opcionesTarjeta,
  }, { idempotencyKey: `viaje-apartado-${apartado.id}-${conOxxo ? "oxxo" : "tarjeta"}` });

  try {
    let pi: Stripe.PaymentIntent;
    try {
      pi = await crear(c.oxxo);
    } catch (e) {
      // OXXO sin activar en la cuenta (o en el modo de prueba): se cobra con
      // tarjeta y se avisa en el registro. Mejor vender con tarjeta que no vender.
      if (!c.oxxo) throw e;
      logger.warn("viaje_cdmx_oxxo_no_disponible", { apartado: apartado.id, reason: e instanceof Error ? e.message : String(e) });
      pi = await crear(false);
    }
    await prisma.apartadoSalida.update({ where: { id: apartado.id }, data: { paymentIntentId: pi.id } });
    programarRevision(apartado.id, apartado.expiraEl);
    return pi;
  } catch (e) {
    // Sin cobro no hay apartado: el lugar vuelve en el acto.
    await prisma.apartadoSalida.updateMany({ where: { id: apartado.id, estado: "activo" }, data: { estado: "liberado" } });
    throw e;
  }
}

/**
 * Justo antes de confirmar el pago, el cliente pide unos minutos más. Bajo el
 * candado: si su apartado ya venció y otro tomó el lugar, aquí se entera ANTES
 * de pagar, no después.
 */
export async function renovarApartado(holdId: string, paymentIntentId: string, ahora: Date = new Date()): Promise<ApartadoSalida> {
  const previo = await prisma.apartadoSalida.findUnique({ where: { id: holdId } });
  if (!previo || previo.paymentIntentId !== paymentIntentId) throw new ErrorViaje(404, "sin-apartado", "No encontramos tu apartado. Vuelve a elegir la fecha.");
  if (previo.estado === "pagado") return previo;
  if (previo.estado !== "activo") throw new ErrorViaje(409, "vencido", "Tu apartado venció. Vuelve a elegir la fecha.");

  return conSalidaBloqueada(previo.salidaId, async (tx, salida) => {
    const a = await tx.apartadoSalida.findUniqueOrThrow({ where: { id: holdId } });
    if (a.estado !== "activo") throw new ErrorViaje(409, "vencido", "Tu apartado venció. Vuelve a elegir la fecha.");
    if (a.expiraEl.getTime() <= ahora.getTime()) {
      // Venció por reloj: solo revive si su lugar sigue libre.
      const o = await ocupacion(tx, salida.id, ahora, a.id);
      if (a.personas > libres(salida.capacidad, o)) {
        throw new ErrorViaje(409, "sin-lugar", "Se acabó el tiempo de tu apartado y alguien más tomó el lugar.", { disponibles: libres(salida.capacidad, o) });
      }
    }
    const nueva = new Date(Math.max(a.expiraEl.getTime(), ahora.getTime() + RENOVAR_MIN * 60_000));
    const r = await tx.apartadoSalida.update({ where: { id: a.id }, data: { expiraEl: nueva } });
    programarRevision(r.id, r.expiraEl);
    return r;
  });
}

// ── OXXO ────────────────────────────────────────────────────────────────────

/** Días inhábiles bancarios (además de sábados y domingos) en que Stripe no confirma OXXO. */
const INHABILES = new Set([
  "2026-11-02", "2026-11-16", "2026-12-12", "2026-12-25",
  "2027-01-01", "2027-02-01", "2027-03-15", "2027-03-25", "2027-03-26", "2027-05-01",
  "2027-09-16", "2027-11-02", "2027-11-15", "2027-12-12", "2027-12-25",
]);

/**
 * Hasta cuándo esperar la confirmación de una ficha: el final del día hábil
 * siguiente a su vencimiento, más 6 horas de colchón. Una ficha que vence el
 * sábado a las 23:59 se espera hasta el lunes.
 */
export function esperaOxxoHasta(vencimientoFicha: Date): Date {
  let ymd = addDaysYMD(ymdMX(vencimientoFicha), 1);
  while (weekdayYMD(ymd) === 0 || weekdayYMD(ymd) === 6 || INHABILES.has(ymd)) ymd = addDaysYMD(ymd, 1);
  return new Date(new Date(`${ymd}T23:59:59-06:00`).getTime() + 6 * 3_600_000);
}

export type ResultadoFicha =
  | { estado: "ficha"; vence: Date; voucherUrl: string | null; apartado: ApartadoSalida; primeraVez: boolean }
  | { estado: "sin-lugar" }
  | { estado: "no-es-ficha" };

/**
 * El cliente eligió OXXO y Stripe le dio su ficha: el apartado se alarga hasta
 * que Stripe pueda confirmar. Lo llaman la pantalla y el webhook
 * (`payment_intent.requires_action`); el que llegue segundo no cambia nada.
 */
export async function registrarFichaOxxo(pi: Stripe.PaymentIntent, ahora: Date = new Date()): Promise<ResultadoFicha> {
  const detalles = pi.next_action?.oxxo_display_details;
  const holdId = pi.metadata?.holdId;
  if (pi.status !== "requires_action" || !detalles?.expires_after || !holdId) return { estado: "no-es-ficha" };

  const vence = new Date(detalles.expires_after * 1000);
  const hasta = esperaOxxoHasta(vence);
  const previo = await prisma.apartadoSalida.findUnique({ where: { id: holdId } });
  if (!previo || previo.paymentIntentId !== pi.id) return { estado: "no-es-ficha" };

  const r = await conSalidaBloqueada(previo.salidaId, async (tx, salida) => {
    const a = await tx.apartadoSalida.findUniqueOrThrow({ where: { id: holdId } });
    if (a.estado === "pagado") return { a, sinLugar: false, primeraVez: false };
    // Venció por reloj o ya se había soltado: solo revive si cabe.
    if (a.estado !== "activo" || a.expiraEl.getTime() <= ahora.getTime()) {
      const o = await ocupacion(tx, salida.id, ahora, a.id);
      if (a.personas > libres(salida.capacidad, o)) return { a, sinLugar: true, primeraVez: false };
    }
    const primeraVez = a.metodo !== "oxxo";
    const nuevo = await tx.apartadoSalida.update({
      where: { id: a.id },
      data: { estado: "activo", metodo: "oxxo", expiraEl: new Date(Math.max(a.expiraEl.getTime(), hasta.getTime())) },
    });
    return { a: nuevo, sinLugar: false, primeraVez };
  });

  if (r.sinLugar) {
    // Su lugar ya es de otro: la ficha no puede quedar viva para que la pague.
    await cancelarCobro(pi.id);
    return { estado: "sin-lugar" };
  }
  programarRevision(r.a.id, r.a.expiraEl);
  return { estado: "ficha", vence, voucherUrl: detalles.hosted_voucher_url ?? null, apartado: r.a, primeraVez: r.primeraVez };
}

// ── Soltar y revisar ────────────────────────────────────────────────────────

/** Cancela un cobro en Stripe. Devuelve el PaymentIntent como quedó (cancelado o no). */
async function cancelarCobro(piId: string): Promise<Stripe.PaymentIntent | null> {
  try {
    return await stripe.paymentIntents.cancel(piId);
  } catch (e) {
    // No se pudo (ya se pagó, o se está procesando): se devuelve como está.
    try {
      return await stripe.paymentIntents.retrieve(piId);
    } catch {
      logger.error("viaje_cdmx_cancelar_fallo", { pi: piId, reason: e instanceof Error ? e.message : String(e) });
      return null;
    }
  }
}

/** Marca el apartado como liberado, solo si seguía activo. Atómico: dos barridos a la vez no chocan. */
export async function soltarApartado(holdId: string): Promise<boolean> {
  const r = await prisma.apartadoSalida.updateMany({ where: { id: holdId, estado: "activo" }, data: { estado: "liberado" } });
  return r.count > 0;
}

export type Revision = "pagado" | "alargado" | "liberado" | "sigue" | "sin-cambio";

/**
 * Mira el cobro de un apartado en Stripe y decide. Es la ÚNICA puerta por la
 * que un apartado se suelta por tiempo:
 *  - pagado            → se confirma (pasa a reserva)
 *  - ficha OXXO viva   → se alarga hasta poder confirmar
 *  - procesándose      → una hora más
 *  - vencido y sin pagar → se CANCELA el cobro en Stripe y solo entonces se suelta
 *
 * La llaman un temporizador al vencer, el cron cada hora y cada apartado nuevo
 * (de paso), así que un reinicio del servidor no deja lugares tapados.
 */
export async function revisarApartado(holdId: string, ahora: Date = new Date()): Promise<Revision> {
  const a = await prisma.apartadoSalida.findUnique({ where: { id: holdId } });
  if (!a || a.estado !== "activo") return "sin-cambio";
  if (a.expiraEl.getTime() > ahora.getTime()) return "sigue";

  if (!a.paymentIntentId) return (await soltarApartado(a.id)) ? "liberado" : "sin-cambio";

  let pi: Stripe.PaymentIntent;
  try {
    pi = await stripe.paymentIntents.retrieve(a.paymentIntentId);
  } catch (e) {
    logger.error("viaje_cdmx_revisar_fallo", { apartado: a.id, reason: e instanceof Error ? e.message : String(e) });
    return "sin-cambio"; // sin poder preguntar a Stripe, no se suelta nada
  }

  if (pi.status === "succeeded") {
    const { confirmarPasaje } = await import("./confirmar");
    await confirmarPasaje(pi, "revision");
    return "pagado";
  }
  if (pi.status === "processing") {
    await prisma.apartadoSalida.update({ where: { id: a.id }, data: { expiraEl: new Date(ahora.getTime() + 3_600_000) } });
    programarRevision(a.id, new Date(ahora.getTime() + 3_600_000));
    return "alargado";
  }
  const ficha = pi.next_action?.oxxo_display_details?.expires_after;
  if (pi.status === "requires_action" && ficha) {
    const hasta = esperaOxxoHasta(new Date(ficha * 1000));
    if (hasta.getTime() > ahora.getTime()) {
      await prisma.apartadoSalida.update({ where: { id: a.id }, data: { metodo: "oxxo", expiraEl: hasta } });
      programarRevision(a.id, hasta);
      return "alargado";
    }
  }

  // Vencido y sin pagar: primero el cobro, después el lugar.
  const final = pi.status === "canceled" ? pi : await cancelarCobro(pi.id);
  if (final?.status === "succeeded") {
    const { confirmarPasaje } = await import("./confirmar");
    await confirmarPasaje(final, "revision");
    return "pagado";
  }
  if (final?.status !== "canceled") return "sin-cambio"; // se reintenta en el siguiente barrido
  return (await soltarApartado(a.id)) ? "liberado" : "sin-cambio";
}

/**
 * Quien vuelve a apartar la misma fecha (cambió el número de personas, recargó
 * la página) no se queda con dos apartados: el anterior sin pagar se cancela.
 * Las fichas OXXO no se tocan: esa persona puede estar camino a la tienda.
 */
export async function soltarAnteriores(huella: string, salidaId: string): Promise<number> {
  const previos = await prisma.apartadoSalida.findMany({
    where: { huella, salidaId, estado: "activo", OR: [{ metodo: null }, { metodo: "card" }] },
    select: { id: true, paymentIntentId: true },
  });
  let n = 0;
  for (const p of previos) {
    if (p.paymentIntentId) {
      const final = await cancelarCobro(p.paymentIntentId);
      if (final?.status === "succeeded") {
        const { confirmarPasaje } = await import("./confirmar");
        await confirmarPasaje(final, "revision");
        continue;
      }
      if (final?.status !== "canceled") continue;
    }
    if (await soltarApartado(p.id)) n++;
  }
  return n;
}

/** Revisa todos los apartados vencidos. Lo corre el cron y, de paso, cada apartado nuevo. */
export async function barrerApartados(ahora: Date = new Date(), limite = 50): Promise<Record<Revision, number>> {
  const vencidos = await prisma.apartadoSalida.findMany({
    where: { estado: "activo", expiraEl: { lte: ahora } },
    orderBy: { expiraEl: "asc" },
    take: limite,
    select: { id: true },
  });
  const cuenta: Record<Revision, number> = { pagado: 0, alargado: 0, liberado: 0, sigue: 0, "sin-cambio": 0 };
  for (const { id } of vencidos) {
    try {
      cuenta[await revisarApartado(id, ahora)]++;
    } catch (e) {
      logger.error("viaje_cdmx_barrido_fallo", { apartado: id, reason: e instanceof Error ? e.message : String(e) });
    }
  }
  return cuenta;
}

/**
 * Liberación del cobro cuando Stripe avisa que se canceló o que la ficha OXXO
 * venció (webhook). Si el cobro sí se pagó, no suelta nada.
 */
export async function soltarPorCobro(pi: Stripe.PaymentIntent): Promise<boolean> {
  const holdId = pi.metadata?.holdId;
  if (!holdId) return false;
  if (pi.status !== "canceled") {
    const final = await cancelarCobro(pi.id);
    if (final?.status !== "canceled") return false;
  }
  return soltarApartado(holdId);
}

// ── Temporizador en proceso ─────────────────────────────────────────────────
// Railway corre UN proceso largo: el temporizador suelta el lugar a tiempo. Si
// un reinicio lo corta, el cron de cada hora lo recoge. Es un atajo, no la red.

const temporizadores = new Map<string, ReturnType<typeof setTimeout>>();

function programarRevision(holdId: string, cuando: Date): void {
  const espera = Math.max(0, cuando.getTime() - Date.now()) + 60_000;
  if (espera > 2 ** 31 - 1) return; // más de ~24 días: lo verá el cron
  const previo = temporizadores.get(holdId);
  if (previo) clearTimeout(previo);
  const t = setTimeout(() => {
    temporizadores.delete(holdId);
    revisarApartado(holdId).catch((e: unknown) =>
      logger.error("viaje_cdmx_temporizador_fallo", { apartado: holdId, reason: e instanceof Error ? e.message : String(e) }));
  }, espera);
  // No mantener vivo el proceso (los scripts de prueba terminan solos).
  (t as { unref?: () => void }).unref?.();
  temporizadores.set(holdId, t);
}
