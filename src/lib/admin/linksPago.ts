import Stripe from "stripe";
import type { LinkPago, TourQuote } from "@prisma/client";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { hoyMX } from "@/lib/dates";
import { registrarCobro } from "@/lib/admin/cobros";
import { montoCobrado } from "@/lib/admin/dinero";
import { SISTEMA, pesos, registrarEnBitacora } from "@/lib/admin/bitacora";
import { RESPONSABLE_COBROS } from "@/lib/admin/automatizaciones";
import { tituloTareaLigaPagada } from "@/lib/cotizaciones/reglasConversion";
import {
  avisoTrasAbonarLiga, CREADOR_LIGA_COTIZACION, decidirLigaDeCotizacion, motivoParaApagarLiga, reservasParaPagoRestante,
  textosLigaDeCotizacion, tituloLigaDeOtraCuenta, tituloLigaSinDestino,
  type HechosLiga, type SesionPagadaLiga,
} from "@/lib/admin/ligasReglas";
import { anticipoDe } from "@/lib/admin/totalesCotizacion";

/**
 * Cobros sueltos: título, monto y una liga que se manda por WhatsApp.
 *
 * Se usa **Payment Link** de Stripe y no una sesión de pago porque la sesión
 * caduca en 24 horas: una liga que se manda un viernes y el cliente abre el
 * lunes ya no sirve, y eso es exactamente lo que pasa cuando se cobra por chat.
 *
 * Cada liga se limita a **un solo pago** (`completed_sessions: 1`). Sin ese
 * tope, un cliente que abre dos veces la conversación puede pagar dos veces el
 * mismo tour, y devolver dinero es mucho más caro que ponerle el límite.
 *
 * 🔴 Desde el 5 nov 2026 (lote 3 de la auditoría) una liga se APAGA sola cuando
 * lo que cobra deja de existir: se borra, vence o archiva su cotización, se
 * cancela su reserva (o el lugar, o la salida del viaje CDMX), o la reserva
 * queda pagada por otro medio. Si aun así se paga, el dinero se registra donde
 * se pueda y Manolo recibe un seguimiento: nunca se pierde en silencio.
 */

/** Stripe trabaja en centavos; el panel, en pesos enteros. La conversión vive aquí. */
const aCentavos = (pesos: number) => Math.round(pesos) * 100;
export const aPesos = (centavos: number) => Math.round(centavos / 100);

export const MONTO_MINIMO = 10;      // Stripe rechaza cobros por debajo de $10 MXN
export const MONTO_MAXIMO = 500_000; // freno a un dedazo con un cero de más

// ── Lo que se le pide a Stripe de una liga ya creada ────────────────────────

/**
 * Apagar una liga y preguntar si se pagó. Va detrás de esta interfaz para que
 * las pruebas usen un doble: ninguna prueba debe llamar a Stripe de verdad.
 */
export interface PuertoStripeLigas {
  /** «no-existe»: Stripe no la tiene en esta cuenta (p. ej. es de la cuenta anterior). */
  apagar(stripeLinkId: string): Promise<"apagada" | "no-existe">;
  /** Las sesiones de pago completas y pagadas de la liga, o «no-existe». */
  sesionesPagadas(stripeLinkId: string): Promise<SesionPagadaLiga[] | "no-existe">;
  /**
   * La sesión de pago de un PaymentIntent y su liga, o null (revisión del lote
   * 3, 5 nov 2026): las ligas pagadas antes no guardaron su PaymentIntent y un
   * reembolso o contracargo llega solo con él. Opcional para los dobles de prueba.
   */
  sesionDelPago?(paymentIntentId: string): Promise<{ id: string; paymentLinkId: string | null } | null>;
}

const puertoReal: PuertoStripeLigas = {
  async apagar(stripeLinkId) {
    try {
      await stripe.paymentLinks.update(stripeLinkId, { active: false });
      return "apagada";
    } catch (e) {
      // Si Stripe no la tiene, en el panel igual deja de ofrecerse; quien la
      // apagó recibe el aviso de que puede seguir viva en la otra cuenta.
      if (e instanceof Stripe.errors.StripeInvalidRequestError) return "no-existe";
      throw e;
    }
  },
  async sesionesPagadas(stripeLinkId) {
    try {
      const r = await stripe.checkout.sessions.list({ payment_link: stripeLinkId, status: "complete", limit: 5 });
      return r.data
        .filter((s) => s.payment_status === "paid")
        .map((s) => ({
          id: s.id,
          montoCentavos: s.amount_total ?? 0,
          correo: s.customer_details?.email || s.customer_email || null,
          paymentIntentId: typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id ?? null,
        }));
    } catch (e) {
      // Solo «no existe» de verdad: cualquier otro error se cuenta como error y se reintenta.
      if (e instanceof Stripe.errors.StripeInvalidRequestError && e.code === "resource_missing") return "no-existe";
      throw e;
    }
  },
  async sesionDelPago(paymentIntentId) {
    // Si Stripe falla, lanza: el webhook contesta 500 y Stripe vuelve a avisar.
    const r = await stripe.checkout.sessions.list({ payment_intent: paymentIntentId, limit: 1 });
    const s = r.data[0];
    if (!s) return null;
    return { id: s.id, paymentLinkId: typeof s.payment_link === "string" ? s.payment_link : s.payment_link?.id ?? null };
  },
};

let puertoDePrueba: PuertoStripeLigas | null = null;

/** SOLO para pruebas: un doble en lugar de Stripe (`null` lo quita). */
export function usarStripeDePrueba(p: PuertoStripeLigas | null): void {
  puertoDePrueba = p;
}

/** Stripe, o null si no hay llave (en local y en pruebas no se toca Stripe). */
export function puertoStripe(): PuertoStripeLigas | null {
  if (puertoDePrueba) return puertoDePrueba;
  return process.env.STRIPE_SECRET_KEY ? puertoReal : null;
}

// ── Seguimientos que deja el dinero ─────────────────────────────────────────

/**
 * Un seguimiento con su clave única: si Stripe repite el aviso, no nace dos
 * veces. Lanza si la base falla: quien llama decide (el webhook contesta 500
 * y Stripe reintenta, así el aviso no se pierde).
 */
export async function crearSeguimientoUnico(d: {
  titulo: string; clave: string; regla: string; responsable?: string; oportunidadId?: string | null; creadaPor?: string;
}): Promise<void> {
  try {
    await prisma.tarea.create({
      data: {
        titulo: d.titulo.slice(0, 200), responsable: d.responsable ?? RESPONSABLE_COBROS, vence: hoyMX(),
        oportunidadId: d.oportunidadId ?? null, origen: "regla", regla: d.regla, claveRegla: d.clave,
        creadaPor: d.creadaPor ?? "Liga de pago",
      },
    });
  } catch (e) {
    if ((e as { code?: string })?.code !== "P2002") throw e;
    return;
  }
  if (d.oportunidadId) await import("./crmDatos").then(m => m.sincronizarProximoPaso(d.oportunidadId!)).catch(() => {});
}

export interface DatosLink {
  titulo: string;
  /**
   * La línea chica que Stripe enseña debajo del concepto: quién es, cuánta
   * gente va y cuándo sale. El cliente abre la liga en su teléfono, a veces
   * días después de la conversación, y esa línea es la que le confirma que
   * está pagando SU viaje y no otra cosa.
   */
  detalle?: string;
  monto: number;
  cliente?: string;
  nota?: string;
  reservaId?: string;
  cotizacionId?: string;
}

export interface LinkCreado {
  id: string;
  url: string;
  titulo: string;
  monto: number;
}

/**
 * Crea el cobro en Stripe y lo guarda.
 *
 * El producto y el precio se crean al vuelo: cada cobro es distinto (un saldo,
 * un tour privado, un extra) y un catálogo de productos reutilizables solo
 * añadiría un paso más a algo que tiene que tomar diez segundos.
 */
export async function crearLinkDePago(datos: DatosLink, creadoPor: string): Promise<LinkCreado> {
  const titulo = datos.titulo.trim().slice(0, 120);
  const monto  = Math.round(datos.monto);

  if (!titulo) throw new Error("Escribe de qué es el cobro");
  if (!Number.isFinite(monto) || monto < MONTO_MINIMO) {
    throw new Error(`El monto mínimo es $${MONTO_MINIMO} MXN`);
  }
  if (monto > MONTO_MAXIMO) {
    throw new Error(`El monto máximo es $${MONTO_MAXIMO.toLocaleString("es-MX")} MXN. Revisa que no sobre un cero.`);
  }

  // Lo que se cobra tiene que existir: un id inventado dejaría el dinero
  // cobrado sin abonar a nadie.
  let folio: string | undefined;
  if (datos.reservaId) {
    const reserva = await prisma.tourBooking.findUnique({
      where:  { id: datos.reservaId },
      select: { confirmationNumber: true },
    });
    if (!reserva) throw new Error("Esa reserva no existe");
    folio = reserva.confirmationNumber;
  }
  if (datos.cotizacionId) {
    const cot = await prisma.tourQuote.findUnique({
      where:  { id: datos.cotizacionId },
      select: { quoteNumber: true },
    });
    if (!cot) throw new Error("Esa cotización no existe");
    folio = cot.quoteNumber;
  }
  // Ni se manda una liga que se apagaría sola (lote 3, 5 nov 2026): una
  // pestaña vieja de Cobros todavía ofrecía la cotización que venció en la
  // noche o la reserva que alguien canceló.
  if (datos.reservaId || datos.cotizacionId) {
    const objetivo = { id: "nueva", reservaId: datos.reservaId ?? null, cotizacionId: datos.cotizacionId ?? null };
    const motivo = motivoParaApagarLiga(objetivo, (await hechosDeLigas([objetivo])).get("nueva"));
    if (motivo) throw new Error(`No se puede mandar esa liga: ${motivo}.`);
  }

  const detalle = datos.detalle?.trim().slice(0, 200);

  // El producto se crea aparte del precio porque el atajo `product_data` no
  // acepta descripción, y la descripción es justo lo que personaliza la
  // pantalla de pago ("Ignacio Ortiz · 4 personas · sale el 25 de octubre").
  const producto = await stripe.products.create({
    name: titulo,
    ...(detalle ? { description: detalle } : {}),
  });

  const price = await stripe.prices.create({
    currency:    "mxn",
    unit_amount: aCentavos(monto),
    product:     producto.id,
  });

  const link = await stripe.paymentLinks.create({
    line_items: [{ price: price.id, quantity: 1 }],
    // Solo tarjeta (Apple Pay y Google Pay van dentro). Sin esto la liga toma
    // los métodos de la configuración por defecto de la cuenta: si algún día se
    // enciende OXXO ahí, la liga lo ofrecería y su pago llegaría DÍAS después
    // por `checkout.session.async_payment_succeeded`, que el webhook no atiende:
    // el saldo se pagaría y el panel nunca se enteraría.
    payment_method_types: ["card"],
    // Un solo pago por liga.
    restrictions: { completed_sessions: { limit: 1 } },
    // El correo se pide en el checkout: es como se le manda el comprobante.
    customer_creation: "always",
    metadata: {
      source:    "panel-admin",
      titulo,
      creadoPor,
      reservaId:    datos.reservaId ?? "",
      cotizacionId: datos.cotizacionId ?? "",
      folio:        folio ?? "",
    },
    after_completion: {
      type: "hosted_confirmation",
      hosted_confirmation: {
        // La de una cotización la convierte en reserva y manda la confirmación
        // sola (13 nov 2026): se le dice que la busque en su correo.
        custom_message: datos.cotizacionId
          ? "¡Listo! Tu pago quedó registrado. En unos minutos te llega a tu correo la confirmación de tu reserva."
          : "¡Listo! Tu pago quedó registrado. Te escribimos por WhatsApp para confirmar los detalles.",
      },
    },
  });

  // Si el guardado falla, la liga YA existe en Stripe y es cobrable: un cliente
  // podría pagarla y el panel no se enteraría nunca. Se apaga antes de rendirse,
  // para no dejar cobros que nadie está mirando.
  //
  // Pasó de verdad el 21 sep 2026: la tabla no existía todavía en esa base, el
  // guardado reventó y quedó una liga viva de $2,100 sin registro.
  try {
    const guardado = await prisma.linkPago.create({
      data: {
        titulo, monto,
        nota:          (datos.nota?.trim() || detalle || "").slice(0, 300) || null,
        cliente:       datos.cliente?.trim().slice(0, 120) || null,
        reservaId:     datos.reservaId || null,
        cotizacionId:  datos.cotizacionId || null,
        stripeLinkId:  link.id,
        stripePriceId: price.id,
        url:           link.url,
        creadoPor,
      },
    });
    // Su lead: liga de anticipo enviada → En seguimiento (no lanza).
    await import("./crmDatos").then(m => m.leadPorLigaDePago(guardado, "creada", creadoPor)).catch(() => {});
    return { id: guardado.id, url: link.url, titulo, monto };
  } catch (e) {
    try {
      await stripe.paymentLinks.update(link.id, { active: false });
    } catch {
      // Si tampoco se puede apagar, al menos queda dicho cuál es.
      console.error("liga de pago viva sin registro:", link.id, link.url);
    }
    throw new Error(
      "La liga no se pudo guardar y se canceló en Stripe para que nadie la pague por error. " +
      "Vuelve a intentarlo.",
    );
  }
}

/**
 * La liga del botón «Reservar» del correo de una cotización y de sus
 * recordatorios (13 nov 2026): cobra el anticipo acordado y, al pagarse, la
 * cotización pasa sola a reserva con su correo de confirmación
 * (`convertirPorLigaPagada`). La regla de cuándo se reusa, se cambia o no se
 * hace es `decidirLigaDeCotizacion`.
 *
 * Nunca lanza: sin llave de Stripe (en local), con Stripe caído o con la
 * cotización ya cerrada devuelve la liga viva que ya tuviera, o null, y el
 * correo sale con el botón de WhatsApp de siempre.
 */
export async function asegurarLigaDeCotizacion(quoteId: string): Promise<{ url: string; monto: number } | null> {
  try {
    const q = await prisma.tourQuote.findUnique({ where: { id: quoteId } });
    if (!q) return null;
    const pkgs = Array.isArray(q.packageItems) ? (q.packageItems as Record<string, unknown>[]) : [];
    const meta = (pkgs.find((p) => !!p && typeof p === "object" && p._meta === true) ?? {}) as { anticipo?: number; reemplazadaPor?: unknown; numPersonas?: unknown };
    const { anticipo } = anticipoDe(q.totalAmount, meta);
    const ligas = await prisma.linkPago.findMany({
      where: { cotizacionId: q.id }, orderBy: { createdAt: "desc" },
      select: { id: true, monto: true, estado: true, creadoPor: true, url: true },
    });
    const { reservaVivaDeCotizacion } = await import("@/lib/cotizaciones/estadoCotizacion");
    const reserva = await reservaVivaDeCotizacion(q);
    const d = decidirLigaDeCotizacion({
      status: q.status, reemplazada: typeof meta.reemplazadaPor === "string" && !!meta.reemplazadaPor,
      conReserva: !!reserva, monto: anticipo, ligas,
    });
    if (d.accion === "reusar") {
      const l = ligas.find((x) => x.id === d.ligaId)!;
      return { url: l.url, monto: l.monto };
    }
    if (d.accion === "nada" || !process.env.STRIPE_SECRET_KEY) return null;
    // La automática de antes cobraba otro monto (se editó la cotización): se apaga primero.
    for (const id of d.apagar) {
      const vieja = await prisma.linkPago.findUnique({ where: { id } });
      if (vieja) await apagarLiga(vieja, "cambió el monto de su cotización");
    }
    const personas = Number(meta.numPersonas) || q.adults + q.children;
    const t = textosLigaDeCotizacion({
      quoteNumber: q.quoteNumber, customerName: q.customerName, tourName: q.tourName, tourDate: q.tourDate,
      personas, total: q.totalAmount, monto: d.monto,
    });
    const creada = await crearLinkDePago({
      titulo: t.titulo, detalle: t.detalle, monto: d.monto, cliente: q.customerName, cotizacionId: q.id,
      nota: "Liga automática del correo de la cotización",
    }, CREADOR_LIGA_COTIZACION);
    return { url: creada.url, monto: creada.monto };
  } catch (e) {
    console.error("asegurarLigaDeCotizacion:", (e as Error)?.message);
    return null;
  }
}

/**
 * Apaga un cobro que ya no debe pagarse (el botón de Cobros, o el cron del
 * viaje cuando cambia el saldo).
 *
 * En Stripe la liga se desactiva (no se borra): si alguien la abre después, ve
 * un aviso de que ya no está disponible en vez de un error.
 *
 * Devuelve «no-existe» si Stripe no la tiene en la cuenta actual (5 nov 2026):
 * antes se marcaba cancelada en silencio, aunque siguiera cobrable en la
 * cuenta anterior de Stripe.
 */
export async function cancelarLinkDePago(id: string, motivo?: string): Promise<{ enStripe: "apagada" | "no-existe" }> {
  const link = await prisma.linkPago.findUnique({ where: { id } });
  if (!link) throw new Error("Ese cobro no existe");
  if (link.estado === "pagado") throw new Error("Ese cobro ya se pagó: no se puede cancelar");

  const puerto = puertoStripe();
  if (!puerto) throw new Error("Los pagos no están configurados: falta la llave de Stripe.");
  const enStripe = await puerto.apagar(link.stripeLinkId);

  // Solo si no se pagó en este mismo instante: el aviso de Stripe pudo ganar.
  await prisma.linkPago.updateMany({
    where: { id, estado: { not: "pagado" } },
    data:  { estado: "cancelado", ...(motivo ? { motivoCancelacion: motivo.slice(0, 200) } : {}) },
  });
  return { enStripe };
}

/**
 * Apaga las ligas ACTIVAS de esas reservas y cotizaciones porque ya no tienen
 * qué cobrar (5 nov 2026). Nunca lanza: si Stripe o la base fallan, la liga se
 * queda activa y la conciliación de cada hora la vuelve a intentar.
 */
export async function apagarLigasDe(
  objetivo: { reservaIds?: (string | null | undefined)[]; cotizacionIds?: (string | null | undefined)[] },
  motivo: string,
): Promise<{ apagadas: number; fallidas: number }> {
  const reservaIds = Array.from(new Set((objetivo.reservaIds ?? []).filter((x): x is string => !!x)));
  const cotizacionIds = Array.from(new Set((objetivo.cotizacionIds ?? []).filter((x): x is string => !!x)));
  if (!reservaIds.length && !cotizacionIds.length) return { apagadas: 0, fallidas: 0 };
  try {
    const ligas = await prisma.linkPago.findMany({
      where: {
        estado: "activo",
        OR: [
          ...(reservaIds.length ? [{ reservaId: { in: reservaIds } }] : []),
          ...(cotizacionIds.length ? [{ cotizacionId: { in: cotizacionIds } }] : []),
        ],
      },
    });
    let apagadas = 0, fallidas = 0;
    for (const l of ligas) {
      const r = await apagarLiga(l, motivo);
      if (r === "apagada") apagadas++;
      if (r === "fallo") fallidas++;
    }
    return { apagadas, fallidas };
  } catch (e) {
    console.error("apagarLigasDe:", (e as Error)?.message);
    return { apagadas: 0, fallidas: 1 };
  }
}

/** Apaga UNA liga: primero en Stripe, después aquí, y lo deja en la bitácora. No lanza. */
export async function apagarLiga(l: LinkPago, motivo: string): Promise<"apagada" | "ya-no-estaba-activa" | "fallo"> {
  try {
    const puerto = puertoStripe();
    if (!puerto) {
      console.error(`liga ${l.id} sin apagar (${motivo}): falta la llave de Stripe`);
      return "fallo";
    }
    const enStripe = await puerto.apagar(l.stripeLinkId);
    const r = await prisma.linkPago.updateMany({
      where: { id: l.id, estado: "activo" },
      data:  { estado: "cancelado", motivoCancelacion: motivo.slice(0, 200) },
    });
    if (!r.count) return "ya-no-estaba-activa";
    await registrarEnBitacora({
      accion: "modificó", entidad: "cobro", actor: SISTEMA,
      resumen: `Liga de pago «${l.titulo}» de ${pesos(l.monto)} apagada sola: ${motivo}`,
    });
    if (enStripe === "no-existe") {
      await crearSeguimientoUnico({
        titulo: tituloLigaDeOtraCuenta({ titulo: l.titulo, cliente: l.cliente, monto: l.monto }),
        clave: `liga-otra-cuenta:${l.id}`, regla: "liga-otra-cuenta",
      }).catch(() => {});
    }
    return "apagada";
  } catch (e) {
    console.error(`apagar la liga ${l.id}:`, (e as Error)?.message);
    return "fallo";
  }
}

/** El `_meta` de la cotización (en `packageItems`): ahí queda el folio de su reserva. */
function folioDeReservaDeCotizacion(packageItems: unknown): string | null {
  if (!Array.isArray(packageItems)) return null;
  const m = (packageItems as unknown[]).find((p) => !!p && typeof p === "object" && (p as { _meta?: unknown })._meta === true) as { reservaFolio?: unknown } | undefined;
  return typeof m?.reservaFolio === "string" && m.reservaFolio ? m.reservaFolio : null;
}

/**
 * Lo que hoy se sabe de aquello que cobra cada liga (para `motivoParaApagarLiga`):
 * su cotización, la reserva que paga (la suya o la que salió de su cotización,
 * prefiriendo la viva) y si la salida del viaje se canceló.
 */
export async function hechosDeLigas(ligas: Pick<LinkPago, "id" | "reservaId" | "cotizacionId">[]): Promise<Map<string, HechosLiga>> {
  const unicos = (xs: (string | null)[]) => Array.from(new Set(xs.filter((x): x is string => !!x)));
  const resIds = unicos(ligas.map(l => l.reservaId));
  const cotIds = unicos(ligas.map(l => (l.reservaId ? null : l.cotizacionId)));
  const cots = cotIds.length
    ? await prisma.tourQuote.findMany({ where: { id: { in: cotIds } }, select: { id: true, status: true, packageItems: true } })
    : [];
  const folios = unicos(cots.map(c => folioDeReservaDeCotizacion(c.packageItems)));
  const campos = {
    id: true, confirmationNumber: true, status: true, totalAmount: true, depositoPagado: true,
    stripePaymentIntentId: true, createdAt: true, salidaId: true, cotizacionId: true,
  } as const;
  const [propias, deCots] = await Promise.all([
    resIds.length ? prisma.tourBooking.findMany({ where: { id: { in: resIds } }, select: campos }) : Promise.resolve([]),
    cotIds.length
      ? prisma.tourBooking.findMany({ where: { OR: [{ cotizacionId: { in: cotIds } }, ...(folios.length ? [{ confirmationNumber: { in: folios } }] : [])] }, select: campos })
      : Promise.resolve([]),
  ]);
  const salidaIds = unicos([...propias, ...deCots].map(r => r.salidaId));
  const salidas = salidaIds.length ? await prisma.salidaGrupal.findMany({ where: { id: { in: salidaIds } }, select: { id: true, estado: true } }) : [];
  const salidaCancelada = new Set(salidas.filter(s => s.estado === "cancelada").map(s => s.id));
  const hecho = (r: (typeof propias)[number]) => ({
    folio: r.confirmationNumber, status: r.status, total: r.totalAmount, cobrado: montoCobrado(r),
    salidaCancelada: !!r.salidaId && salidaCancelada.has(r.salidaId),
  });

  const mapa = new Map<string, HechosLiga>();
  for (const l of ligas) {
    if (l.reservaId) {
      const r = propias.find(x => x.id === l.reservaId);
      mapa.set(l.id, { reserva: r ? hecho(r) : null });
    } else if (l.cotizacionId) {
      const c = cots.find(x => x.id === l.cotizacionId);
      if (!c) { mapa.set(l.id, { cotizacion: null }); continue; }
      const folio = folioDeReservaDeCotizacion(c.packageItems);
      const suyas = deCots.filter(r => r.cotizacionId === c.id || (!!folio && r.confirmationNumber === folio));
      const r = suyas.find(x => x.status !== "cancelled") ?? suyas[0] ?? null;
      mapa.set(l.id, { cotizacion: { status: c.status }, reserva: r ? hecho(r) : null });
    } else {
      mapa.set(l.id, {});
    }
  }
  return mapa;
}

/**
 * Las reservas a las que se les puede mandar la liga de lo que falta (Cobros →
 * «Lo que falta de una reserva»). 🔴 Antes eran las 60 más recientes y DESPUÉS
 * se filtraban las que debían, con su propia regla de «cobrado»: una reserva
 * de diciembre pagada en parte en septiembre no salía y su saldo se mandaba
 * como «cobro suelto», sin abonarse a nadie (lote 3, 5 nov 2026). Ahora la
 * base filtra primero las que deben y se usa la regla de Reservas.
 */
export async function reservasParaLigaDeSaldo() {
  const filas = await prisma.tourBooking.findMany({
    // Sin los «borrador» del bot viejo: no hay saldo que cobrar de una cotización (lote 6, 10 nov 2026).
    where:   { status: { notIn: ["cancelled", "borrador"] }, depositoPagado: { lt: prisma.tourBooking.fields.totalAmount } },
    orderBy: { createdAt: "desc" },
    take:    500,
    select: {
      id: true, confirmationNumber: true, customerName: true, status: true, createdAt: true,
      totalAmount: true, depositoPagado: true, stripePaymentIntentId: true,
      tourName: true, tourSlug: true, tourDate: true, adults: true, children: true, lineItems: true,
    },
  });
  return reservasParaPagoRestante(filas);
}

/**
 * Registra que una liga se pagó. La llaman el webhook de Stripe y la
 * conciliación de ligas del cron.
 *
 * Es idempotente: Stripe reintenta el webhook si algo falla, y sin esta guarda
 * un mismo pago podría abonarse dos veces al saldo de la reserva. Además el
 * cobro lleva la referencia del pago en Stripe (`stripeRef`): si la primera
 * vez falló a la mitad, el reintento termina lo que faltó sin abonar otra vez.
 */
export async function marcarLinkPagado(
  stripeLinkId: string,
  sessionId: string,
  montoPagado: number,
  correo: string | null,
  paymentIntentId: string | null = null,
): Promise<void> {
  const link = await prisma.linkPago.findUnique({ where: { stripeLinkId } });
  if (!link) return;                    // no lo creó el panel: no es asunto nuestro
  if (link.estado === "pagado") return; // ya estaba registrado

  // 🔴 Reclamo atómico (revisión del 4 nov 2026): dos entregas de Stripe al
  // mismo tiempo pasaban las dos la revisión de arriba y abonaban dos cobros.
  // Una liga apagada también se reclama: si el cliente alcanzó a pagarla, ese
  // dinero se registra (5 nov 2026).
  const reclamo = await prisma.linkPago.updateMany({
    where: { id: link.id, estado: { not: "pagado" } },
    data: {
      estado:           "pagado",
      pagadoAt:         new Date(),
      stripeSessionId:  sessionId,
      stripePaymentIntentId: paymentIntentId,
      montoPagado,
      correoDelPagador: correo,
    },
  });
  if (reclamo.count !== 1) return;      // otra entrega ya lo está registrando
  const pagada: LinkPago = { ...link, stripeSessionId: sessionId, stripePaymentIntentId: paymentIntentId, montoPagado, correoDelPagador: correo };
  try {
    // Un anticipo pagado convierte la cotización en venta: deja de ser una
    // propuesta en el aire y el panel tiene que decirlo sin que nadie la toque.
    if (link.cotizacionId) await ligaDeCotizacionPagada(pagada, montoPagado);

    // Si el cobro era de una reserva, el dinero se le abona: el panel tiene que
    // reflejar que ya se cobró sin que nadie lo capture a mano.
    if (link.reservaId && montoPagado > 0) await ligaDeReservaPagada(pagada, montoPagado, paymentIntentId || sessionId);
  } catch (e) {
    // Se suelta el reclamo: el webhook contesta 500 y Stripe vuelve a intentar.
    await prisma.linkPago.update({ where: { id: link.id }, data: { estado: link.estado, pagadoAt: null, stripeSessionId: null, stripePaymentIntentId: null, montoPagado: null, correoDelPagador: null } }).catch(() => {});
    throw e;
  }
}

/** La liga de una COTIZACIÓN se pagó: pasa a reserva, o queda dicho por qué no. */
async function ligaDeCotizacionPagada(link: LinkPago, montoPagado: number): Promise<void> {
  const q = await prisma.tourQuote.findUnique({ where: { id: link.cotizacionId! } });
  if (!q) {
    // 🔴 La cotización se borró con su liga viva (5 nov 2026): antes salía con
    // `return` y el dinero quedaba en Stripe sin reserva ni aviso.
    await crearSeguimientoUnico({
      titulo: tituloLigaSinDestino({ tipo: "cotizacion-borrada" }, { titulo: link.titulo, cliente: link.cliente, monto: montoPagado }),
      clave: `liga-sin-destino:${link.id}`, regla: "liga-sin-destino",
    });
    return;
  }
  // 🔴 Ya NO se marca «aceptada» aquí antes de convertir (5 nov 2026): la
  // conversión la marca en su propia transacción. Marcarla antes escondía que
  // estaba vencida (la conversión solo veía «aceptada») y le impedía nacer al
  // lead de una cotización que no tenía (el CRM no le crea lead a una aceptada).
  //
  // Si su reserva ya se canceló (y no hay otra viva), el pago no revive al
  // lead: lo decide una persona con el seguimiento de abajo (5 nov 2026).
  const { reservaDeCotizacion } = await import("@/lib/cotizaciones/convertir");
  const previa = await reservaDeCotizacion(q).catch(() => null);
  if (previa?.status !== "cancelled") {
    // Su lead: anticipo pagado (no lanza).
    await import("./crmDatos").then(m => m.leadPorLigaDePago(link, "pagada", "Stripe")).catch(() => {});
  }
  // 🔴 Pedido de Erick (4 nov 2026): la liga pagada dejaba la cotización
  // «aceptada» pero NO llegaba a Reservas ni al Calendario, y al estar aceptada
  // ya no se podía convertir: había que rehacer la cotización. Ahora se
  // convierte sola en reserva y el anticipo queda como cobro «liga de pago».
  // Si algo lo impide (otra reserva del mismo cliente, cotización vencida…),
  // queda un seguimiento para que una persona lo resuelva. Nunca tumba el pago.
  await convertirPorLigaPagada(q, link, montoPagado).catch(e => console.error("conversión por liga pagada:", (e as Error)?.message));
}

/**
 * La liga del saldo de una RESERVA se pagó: se abona registrando un COBRO, no
 * sumando a mano sobre `depositoPagado` (así sale en el desglose del corte
 * como «liga de pago» y `depositoPagado` lo recalcula `sincronizarDeposito()`).
 * 🔴 Con el cobro que SÍ avisa si falla: uno silencioso se tragaba el error y
 * la liga quedaba «pagada» sin dinero en la reserva.
 */
async function ligaDeReservaPagada(link: LinkPago, montoPagado: number, stripeRef: string): Promise<void> {
  const r = await prisma.tourBooking.findUnique({
    where:  { id: link.reservaId! },
    select: { id: true, confirmationNumber: true, customerName: true, status: true, totalAmount: true, oportunidadId: true },
  });
  if (!r) {
    await crearSeguimientoUnico({
      titulo: tituloLigaSinDestino({ tipo: "reserva-no-existe" }, { titulo: link.titulo, cliente: link.cliente, monto: montoPagado }),
      clave: `liga-sin-destino:${link.id}`, regla: "liga-sin-destino",
    });
    return;
  }
  const hecho = await registrarCobro({
    reservaId: r.id,
    monto:     montoPagado,
    metodo:    "stripe",
    folio:     link.stripeSessionId,
    nota:      `Liga de pago: ${link.titulo ?? "sin título"}`,
    actor:     SISTEMA,
    creadoPor: SISTEMA.nombre,
    stripeRef,
  });
  // Pagó una reserva cancelada (no revive: el dinero queda en ella) o una que
  // ya estaba pagada: Manolo decide si se devuelve (5 nov 2026).
  const aviso = avisoTrasAbonarLiga({ folio: r.confirmationNumber, status: r.status, total: r.totalAmount, cobradoDespues: hecho.cobrado });
  if (aviso) {
    await crearSeguimientoUnico({
      titulo: tituloLigaSinDestino(aviso, { titulo: link.titulo, cliente: link.cliente || r.customerName, monto: montoPagado }),
      clave: `liga-sin-destino:${link.id}`, regla: "liga-sin-destino", oportunidadId: r.oportunidadId,
    });
  }
}

/**
 * El anticipo pagado con la liga de una COTIZACIÓN (aún sin reserva) no tenía
 * a dónde abonarse: al convertirla, la reserva nacía en $0 (revisión del 4 nov
 * 2026). Al crear la reserva de esa cotización, cada liga pagada y sin reserva
 * se registra como cobro de la reserva nueva, una sola vez.
 */
export async function abonarLigasDeCotizacion(cotizacionId: string, reservaId: string): Promise<number> {
  const ligas = await prisma.linkPago.findMany({ where: { cotizacionId, estado: "pagado", reservaId: null } });
  let abonado = 0;
  for (const l of ligas) {
    const monto = l.montoPagado ?? l.monto;
    // Se reclama primero (reservaId) para que dos conversiones no la abonen dos veces.
    const r = await prisma.linkPago.updateMany({ where: { id: l.id, reservaId: null }, data: { reservaId } });
    if (r.count !== 1 || monto <= 0) continue;
    try {
      await registrarCobro({
        reservaId, monto, metodo: "stripe", folio: l.stripeSessionId ?? undefined, nota: `Liga de pago de la cotización: ${l.titulo}`,
        actor: SISTEMA, creadoPor: SISTEMA.nombre,
        fecha: l.pagadoAt ? l.pagadoAt.toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" }) : undefined,
        // El mismo pago no se abona dos veces aunque este intento falle a la mitad (5 nov 2026).
        stripeRef: l.stripePaymentIntentId ?? l.stripeSessionId,
      });
    } catch (e) {
      // Se suelta para que el siguiente intento (otra conversión o el botón) la abone.
      await prisma.linkPago.update({ where: { id: l.id }, data: { reservaId: null } }).catch(() => {});
      throw e;
    }
    abonado += monto;
  }
  return abonado;
}


/**
 * La cotización cuya liga se pagó pasa a reserva (o deja un seguimiento si no se puede).
 *
 * 🔴 Ya hay dinero, así que nada la frena (5 nov 2026): pasa por las mismas
 * revisiones que el panel —vencida, cupo y fechas cerradas, otra reserva del
 * mismo cliente, idioma— pero convierte con `forzar`, y lo que no cuadró va
 * en el seguimiento para Operación: el cliente pagó y una persona decide.
 * Si su reserva ya estaba CANCELADA, el pago queda en ella y el seguimiento
 * es para Manolo: devolver o reactivar (lote 3, 5 nov 2026).
 */
async function convertirPorLigaPagada(q: TourQuote, link: LinkPago, montoPagado: number) {
  const lead = q.oportunidadId ? await prisma.oportunidad.findUnique({ where: { id: q.oportunidadId } }) : null;
  const responsable = lead?.responsable && ["Manolo", "Martín", "Erick"].includes(lead.responsable) ? lead.responsable : "Erick";
  const hoy = hoyMX();
  let oportunidadId = q.oportunidadId;
  const tarea = (titulo: string, clave: string, quien = responsable) => prisma.tarea.create({
    data: { titulo: titulo.slice(0, 200), responsable: quien, vence: hoy, oportunidadId, origen: "regla", regla: "liga-pagada", claveRegla: clave, creadaPor: "Liga de pago" },
  }).catch(e => { if ((e as { code?: string })?.code !== "P2002") throw e; });
  try {
    const { convertirCotizacionEnReserva } = await import("@/lib/cotizaciones/convertir");
    const conv = await convertirCotizacionEnReserva(q.id, {
      origen: lead?.canal && lead.canal !== "por_confirmar" ? lead.canal : "whatsapp", actor: SISTEMA, forzar: true, desde: "liga",
    });
    // Si la cotización no tenía lead, la reserva nació con uno: el seguimiento va ahí.
    oportunidadId = conv.reserva.oportunidadId ?? oportunidadId;
    if (conv.reserva.status === "cancelled") {
      const titulo = conv.abonadoPorLiga > 0
        ? tituloLigaSinDestino({ tipo: "reserva-cancelada", folio: conv.reserva.confirmationNumber }, { titulo: link.titulo, cliente: q.customerName, monto: montoPagado })
        : tituloTareaLigaPagada({ cliente: q.customerName, folio: conv.reserva.confirmationNumber, monto: montoPagado, revisar: conv.revisar });
      await tarea(titulo, `liga-sin-destino:${link.id}`, RESPONSABLE_COBROS);
    } else {
      await tarea(tituloTareaLigaPagada({ cliente: q.customerName, folio: conv.reserva.confirmationNumber, monto: montoPagado, revisar: conv.revisar }), `liga-pagada:${q.id}`);
      // 🔴 El correo de confirmación (pedido de Manolo, 13 nov 2026): antes la
      // liga pagada dejaba la reserva hecha, pero el cliente no recibía nada
      // hasta que alguien lo mandaba a mano desde el panel. Solo si ESTE pago
      // entró a la reserva: un reintento de Stripe ya no abona y no lo repite.
      if (conv.abonadoPorLiga > 0) {
        await confirmarPagoDeLiga(conv.reserva, link, q, tarea);
      }
    }
  } catch (e) {
    // Ni así se pudo: la cotización queda «aceptada» (ya hay dinero: sale de la
    // secuencia de correos) y Cotizaciones la sigue ofreciendo para convertir.
    await prisma.tourQuote.updateMany({
      where: { id: q.id, status: { not: "aceptada" } },
      // aceptadaEn: KPI «Cotización → reserva a 14 días» (4 nov 2026).
      data:  { status: "aceptada", aceptadaEn: new Date() },
    }).catch(() => {});
    await tarea(`Pagó la liga de ${q.quoteNumber} (${q.customerName}, $${montoPagado.toLocaleString("es-MX")}) pero no se pudo pasar a reserva sola: ${(e as Error)?.message ?? "revisar"}. Conviértela desde Cotizaciones.`, `liga-pagada-revisar:${q.id}`);
  }
  if (oportunidadId) await import("./crmDatos").then(m => m.sincronizarProximoPaso(oportunidadId!)).catch(() => {});
}

const correoUsable = (c: string | null | undefined): c is string =>
  !!c && c.includes("@") && !c.endsWith("@desconocido");

/**
 * Tras el pago de la liga de una cotización: la reserva recibe su correo de
 * confirmación (el mismo que se manda desde el panel). Si la cotización no
 * tenía correo, se usa el que el cliente escribió en la página de pago de
 * Stripe. Si no sale, queda una tarea para que una persona lo mande. No lanza.
 */
async function confirmarPagoDeLiga(
  reserva: { id: string; confirmationNumber: string; customerEmail: string | null },
  link: LinkPago,
  q: TourQuote,
  tarea: (titulo: string, clave: string) => Promise<unknown>,
): Promise<void> {
  try {
    if (!correoUsable(reserva.customerEmail) && correoUsable(link.correoDelPagador)) {
      await prisma.tourBooking.update({ where: { id: reserva.id }, data: { customerEmail: link.correoDelPagador.trim().toLowerCase() } });
    }
    const { enviarConfirmacionReserva } = await import("@/lib/cotizaciones/convertir");
    const correo = await enviarConfirmacionReserva(reserva.id, SISTEMA);
    if (correo.emailEnviado) return;
    await tarea(
      correo.motivo === "sin-correo"
        ? `${q.customerName} pagó la liga de ${q.quoteNumber} y ya es la reserva ${reserva.confirmationNumber}, pero no tiene correo: mándale la confirmación por WhatsApp.`
        : `${q.customerName} pagó la liga de ${q.quoteNumber} (reserva ${reserva.confirmationNumber}), pero el correo de confirmación no salió: reenvíalo desde Reservas.`,
      `confirmacion-liga:${reserva.id}`,
    );
  } catch (e) {
    console.error("confirmación tras liga pagada:", (e as Error)?.message);
  }
}
