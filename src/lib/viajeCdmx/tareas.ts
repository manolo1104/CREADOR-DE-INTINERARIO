/**
 * Lo que corre cada hora para el viaje CDMX–Xilitla (`/api/cron/viaje-cdmx`):
 *  1. soltar los apartados vencidos (cancelando antes su cobro en Stripe)
 *  2. conciliar desde la base: un pago que Stripe confirmó y no tiene reserva
 *  3. las ligas del saldo, unos días antes de que venza, y su recordatorio
 *  4. avisar a la lista de espera cuando hay lugar
 *  5. avisar al equipo de las salidas que van bajo el mínimo cerca del corte
 *
 * Cada paso es independiente: si uno falla, los demás corren.
 */
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { logger } from "@/lib/logger";
import { diffDiasYMD, hoyMX } from "@/lib/dates";
import { crearLinkDePago, cancelarLinkDePago } from "@/lib/admin/linksPago";
import { conMeta, metaDe } from "@/lib/admin/reserva";
import { barrerApartados } from "./apartar";
import { confirmarPasaje } from "./confirmar";
import { libres, ocupacionDeVarias } from "./cupo";
import { fechaLarga, rangoCorto, saldoVence, seVende } from "./precio";
import { correoBajoMinimo, correoListaEspera, correoLiquidacion } from "./correos";
import { VIAJE_NOMBRE } from "./config";

/** Días antes del vencimiento del saldo en que sale la liga. */
export const LIGA_SALDO_DIAS_ANTES = 5;

const EMAIL_OK = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function paso<T>(nombre: string, fn: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await fn();
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    logger.error(`viaje_cdmx_cron_${nombre}_fallo`, { reason });
    return { error: reason };
  }
}

/** Pagos confirmados por Stripe cuyo apartado no llegó a reserva (reinicio, fallo de la base). */
export async function conciliarDesdeLaBase(ahora: Date = new Date()): Promise<{ revisados: number; creadas: number }> {
  const hace3 = new Date(ahora.getTime() - 3 * 86_400_000);
  const hace14 = new Date(ahora.getTime() - 14 * 86_400_000);
  const apartados = await prisma.apartadoSalida.findMany({
    where: {
      paymentIntentId: { not: null },
      bookingId: null,
      OR: [
        { estado: "activo", metodo: "oxxo" },
        { estado: "activo", expiraEl: { lte: ahora } },
        { estado: "liberado", updatedAt: { gte: hace3 } },
        { estado: "liberado", metodo: "oxxo", updatedAt: { gte: hace14 } },
      ],
    },
    take: 100,
    orderBy: { updatedAt: "desc" },
  });
  let creadas = 0;
  for (const a of apartados) {
    try {
      const pi = await stripe.paymentIntents.retrieve(a.paymentIntentId!);
      if (pi.status !== "succeeded") continue;
      const r = await confirmarPasaje(pi, "conciliacion");
      if (r.estado === "creada") creadas++;
    } catch (e) {
      logger.error("viaje_cdmx_conciliar_fallo", { apartado: a.id, reason: e instanceof Error ? e.message : String(e) });
    }
  }
  return { revisados: apartados.length, creadas };
}

interface LigaSaldo { id: string; url: string; monto: number; enviada: string; recordatorio?: string }

/** La liga del saldo y su recordatorio el día que vence. */
export async function liquidaciones(): Promise<{ ligas: number; recordatorios: number }> {
  const hoy = hoyMX();
  const reservas = await prisma.tourBooking.findMany({
    where: { salidaId: { not: null }, status: "pending", tourDate: { gte: hoy }, totalAmount: { gt: 0 } },
  });
  if (!reservas.length) return { ligas: 0, recordatorios: 0 };
  const salidas = new Map(
    (await prisma.salidaGrupal.findMany({ where: { id: { in: Array.from(new Set(reservas.map((r) => r.salidaId!))) } } }))
      .map((s) => [s.id, s]),
  );

  let ligas = 0, recordatorios = 0;
  for (const r of reservas) {
    const s = salidas.get(r.salidaId!);
    if (!s || s.estado === "cancelada") continue;
    const saldo = r.totalAmount - r.depositoPagado;
    if (saldo < 10 || !EMAIL_OK.test(r.customerEmail)) continue;
    const vence = saldoVence(s);
    const faltan = diffDiasYMD(hoy, vence);
    if (faltan > LIGA_SALDO_DIAS_ANTES) continue;

    const meta = metaDe(r);
    let liga = meta.ligaSaldo as LigaSaldo | undefined;
    try {
      // Un pago parcial cambió el saldo: la liga vieja cobraría de más.
      if (liga && liga.monto !== saldo) {
        await cancelarLinkDePago(liga.id).catch(() => {});
        liga = undefined;
      }
      if (!liga) {
        const nueva = await crearLinkDePago({
          titulo: `Saldo · ${VIAJE_NOMBRE} · ${rangoCorto(s.fechaSalida, s.fechaRegreso)}`,
          detalle: `${r.customerName} · ${r.adults} persona${r.adults === 1 ? "" : "s"} · sale el ${fechaLarga(s.fechaSalida)} · ${r.confirmationNumber}`,
          monto: saldo,
          cliente: r.customerName,
          reservaId: r.id,
          nota: "Liga automática del saldo del viaje CDMX",
        }, "Sistema");
        liga = { id: nueva.id, url: nueva.url, monto: saldo, enviada: hoy };
        await correoLiquidacion(r, s, nueva.url, saldo);
        await prisma.tourBooking.update({ where: { id: r.id }, data: { lineItems: conMeta(r.lineItems, { ligaSaldo: liga }) as never } });
        ligas++;
        continue;
      }
      if (faltan <= 0 && !liga.recordatorio && liga.enviada !== hoy) {
        await correoLiquidacion(r, s, liga.url, saldo);
        await prisma.tourBooking.update({ where: { id: r.id }, data: { lineItems: conMeta(r.lineItems, { ligaSaldo: { ...liga, recordatorio: hoy } }) as never } });
        recordatorios++;
      }
    } catch (e) {
      logger.error("viaje_cdmx_liquidacion_fallo", { reserva: r.confirmationNumber, reason: e instanceof Error ? e.message : String(e) });
    }
  }
  return { ligas, recordatorios };
}

/**
 * Avisa a la lista de espera. `soloSalida` + `todos` es el botón del panel:
 * vuelve a avisar también a quien ya se le avisó.
 */
export async function avisarListaDeEspera(
  opciones: { soloSalida?: string; todos?: boolean; limite?: number } = {},
  ahora: Date = new Date(),
): Promise<{ avisados: number }> {
  const limite = opciones.limite ?? 50;
  const abiertas = (await prisma.salidaGrupal.findMany({
    where: { estado: "publicada", fechaSalida: { gte: hoyMX() }, ...(opciones.soloSalida ? { id: opciones.soloSalida } : {}) },
    orderBy: { fechaSalida: "asc" },
  })).filter((s) => seVende(s, ahora));
  if (!abiertas.length) return { avisados: 0 };
  const occ = await ocupacionDeVarias(abiertas.map((s) => s.id), ahora);
  const conLugar = abiertas
    .map((s) => ({ s, disponibles: libres(s.capacidad, occ.get(s.id)!) }))
    .filter((x) => x.disponibles > 0);
  if (!conLugar.length) return { avisados: 0 };

  const estados = opciones.todos ? ["esperando", "avisado"] : ["esperando"];
  let avisados = 0;
  for (const { s, disponibles } of conLugar) {
    const deEsta = await prisma.listaEspera.findMany({ where: { salidaId: s.id, estado: { in: estados } }, take: limite - avisados });
    for (const e of deEsta) {
      if (await correoListaEspera(e, s, disponibles)) avisados++;
      await prisma.listaEspera.update({ where: { id: e.id }, data: { estado: "avisado", avisadoEl: ahora } });
    }
    if (avisados >= limite) break;
  }
  // Los de «la siguiente que abra»: la primera fecha con lugar.
  if (!opciones.soloSalida && avisados < limite) {
    const { s, disponibles } = conLugar[0];
    const siguientes = await prisma.listaEspera.findMany({ where: { salidaId: "", estado: "esperando" }, take: limite - avisados });
    for (const e of siguientes) {
      if (await correoListaEspera(e, s, disponibles)) avisados++;
      await prisma.listaEspera.update({ where: { id: e.id }, data: { estado: "avisado", avisadoEl: ahora } });
    }
  }
  return { avisados };
}

/** Un aviso al día por cada salida que va bajo el mínimo a 3 días (o menos) de su corte. */
export async function avisosBajoMinimo(ahora: Date = new Date()): Promise<{ avisos: number }> {
  const hoy = hoyMX();
  const salidas = await prisma.salidaGrupal.findMany({ where: { estado: "publicada", fechaSalida: { gte: hoy } } });
  const cerca = salidas.filter((s) => s.fechaCorte.getTime() - ahora.getTime() <= 3 * 86_400_000);
  if (!cerca.length) return { avisos: 0 };
  const occ = await ocupacionDeVarias(cerca.map((s) => s.id), ahora);
  let avisos = 0;
  for (const s of cerca) {
    const o = occ.get(s.id)!;
    if (o.confirmados >= s.minimo) continue;
    const clave = `viaje-cdmx:bajo-minimo:${s.id}`;
    const previo = await prisma.config.findUnique({ where: { key: clave } });
    if (previo?.value === hoy) continue;
    await correoBajoMinimo(s, o.confirmados);
    await prisma.config.upsert({ where: { key: clave }, update: { value: hoy }, create: { key: clave, value: hoy } });
    avisos++;
  }
  return { avisos };
}

export async function correrTareas(ahora: Date = new Date()) {
  return {
    apartados: await paso("barrer", () => barrerApartados(ahora, 200)),
    conciliacion: await paso("conciliar", () => conciliarDesdeLaBase(ahora)),
    liquidaciones: await paso("liquidaciones", () => liquidaciones()),
    listaEspera: await paso("lista_espera", () => avisarListaDeEspera({}, ahora)),
    bajoMinimo: await paso("bajo_minimo", () => avisosBajoMinimo(ahora)),
  };
}
