import { NextRequest, NextResponse } from "next/server";
import type { TourBooking } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/admin/sesion";
import { registrarEnBitacora, pesos } from "@/lib/admin/bitacora";
import { montoCobrado, saldoPendiente } from "@/lib/admin/kpis";
import { conceptosDe } from "@/lib/admin/costos";
import { extrasDe, costoExtras } from "@/lib/admin/extras";
import { lineasDe, grupoDe, metaDe } from "@/lib/admin/reserva";
import { TOURS_LISTA } from "@/lib/tours";
import { hoyMX, addDaysYMD } from "@/lib/dates";
import {
  lunesDe, domingoDe, etiquetaSemana, limpiarCaptura, capturaDe, calcularCorte,
  repartirExacto, COMISION_STRIPE, type SalidaCorte, type Captura,
} from "@/lib/admin/corteSemanal";

export const dynamic = "force-dynamic";

const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/;

// La tabla `CorteSemanal` la crea Railway al desplegar (`db push`). Si la base
// todavía no la tiene, el corte se puede VER pero no guardar.
const sinTabla = (e: any) => e?.code === "P2021";

/**
 * Las salidas de una semana: cada reserva se abre en sus tours (`lineItems`,
 * cada uno con su fecha, igual que el Calendario) y se juntan por tour y día.
 */
async function salidasDeLaSemana(lunes: string, domingo: string): Promise<SalidaCorte[]> {
  const [reservas, catalogo] = await Promise.all([
    prisma.tourBooking.findMany({
      // Cuenta la fecha en que se OPERA cada tour (la de su renglón), nunca la
      // fecha en que se hizo la reserva. `tourDate` es solo el primer tour y no
      // siempre va en orden (hay paquetes con un tour un día antes), así que se
      // busca con dos semanas de margen a cada lado y abajo se filtra renglón
      // por renglón.
      where: {
        tourDate: { gte: addDaysYMD(lunes, -14), lte: addDaysYMD(domingo, 14) },
        status: { notIn: ["cancelled", "borrador"] },
      },
      orderBy: { tourDate: "asc" },
    }),
    prisma.tourCosto.findMany(),
  ]);
  const costosPorSlug = Object.fromEntries(catalogo.map(c => [c.tourSlug, conceptosDe(c.conceptos)]));

  // Lo cobrado con tarjeta, para proponer la comisión de Stripe como costo.
  const ids = reservas.map(r => r.id);
  const porStripe = ids.length
    ? await prisma.movimiento.groupBy({
        by: ["reservaId"],
        where: { tipo: "cobro", metodoPago: "stripe", anulado: false, reservaId: { in: ids } },
        _sum: { monto: true },
      })
    : [];
  const stripeDe = new Map(porStripe.map(g => [g.reservaId, g._sum.monto ?? 0]));

  interface Acumulada extends SalidaCorte { slug: string; stripe: number; extras: number }
  const mapa = new Map<string, Acumulada>();

  for (const b of reservas) {
    const hotel   = hotelDe(b);
    const tramos  = tramosDe(b, hotel);
    const pesos   = tramos.map(t => t.peso);
    const cobrado = montoCobrado(b);
    // La parte del hotel es su precio en la proporción de la reserva que ya se
    // cobró: pagada completa, el hotel recibe justo su precio. Un descuento o
    // un extra no le mueven nada al hotel: eso lo absorben los tours.
    const cobradoHotel = hotel > 0 && b.totalAmount > 0
      ? Math.min(cobrado, Math.round((cobrado * hotel) / b.totalAmount))
      : 0;
    // Reservas de antes del 29 sep pagadas con Stripe no tienen renglón de cobro.
    const stripe = stripeDe.get(b.id)
      ?? (b.stripePaymentIntentId && (b.depositoPagado ?? 0) === 0 ? cobrado : 0);
    const extras = costoExtras(extrasDe(b.extraItems));
    // Dos renglones del mismo tour el mismo día (un vehículo por renglón) son
    // UNA salida: así se cuenta "entre cuántos tours se reparte".
    const claveDe = (t: { fecha: string; slug: string; nombre: string }) => `${t.fecha}|${t.slug || t.nombre}`;
    const numTours = new Set(tramos.map(claveDe)).size;

    // Al peso: lo que reciben todos los tours de la reserva suma lo cobrado.
    const cobradoPorTramo = repartirExacto(cobrado, pesos);
    const hotelPorTramo   = repartirExacto(cobradoHotel, pesos);
    const stripePorTramo  = repartirExacto(stripe, pesos);

    tramos.forEach((t, i) => {
      if (t.fecha < lunes || t.fecha > domingo) return;
      const clave = claveDe(t);
      let s = mapa.get(clave);
      if (!s) {
        s = {
          clave, fecha: t.fecha, slug: t.slug,
          tour: TOURS_LISTA.find(x => x.slug === t.slug)?.nombre ?? (t.nombre || "Sin tour"),
          personas: 0, reservas: [], ventas: 0, hospedaje: 0, costosSugeridos: [],
          stripe: 0, extras: 0,
        };
        mapa.set(clave, s);
      }
      const c = cobradoPorTramo[i];
      const h = hotelPorTramo[i];
      // La misma reserva puede traer dos renglones del mismo tour ese día (un
      // vehículo por renglón en el RZR): se suman en una sola fila.
      const ya = s.reservas.find(r => r.id === b.id);
      if (ya) { ya.personas += t.personas; ya.cobrado += c; ya.hospedaje += h; }
      else s.reservas.push({
        id: b.id, folio: b.confirmationNumber, cliente: b.customerName.trim(),
        personas: t.personas, cobrado: c, hospedaje: h,
        cobradoReserva: cobrado, tours: numTours, pendiente: saldoPendiente(b),
        cobrable: {
          totalAmount: b.totalAmount,
          depositoPagado: b.depositoPagado ?? 0,
          stripePaymentIntentId: b.stripePaymentIntentId,
          // La ventana de cobro solo lee el `_meta` (el anticipo acordado).
          lineItems: [metaDe(b)],
        },
      });
      s.personas  += t.personas;
      s.ventas    += c;
      s.hospedaje += h;
      s.stripe    += stripePorTramo[i];
      // Los extras (comida, transporte) son de la reserva, no de cada tour:
      // se cargan una sola vez, al primero.
      if (i === 0) s.extras += extras;
    });
  }

  return Array.from(mapa.values())
    .map(({ slug, stripe, extras, ...s }) => {
      const sugeridos = (costosPorSlug[slug] ?? []).map(c => c.tipo === "persona"
        ? { concepto: `${c.concepto} ($${c.monto.toLocaleString("es-MX")} × ${s.personas})`, monto: c.monto * s.personas }
        : { concepto: c.concepto, monto: c.monto });
      const comision = Math.round(stripe * COMISION_STRIPE);
      // El hotel NO va aquí: no es un costo de la salida, es dinero que pasa
      // por Manolo y se descuenta aparte (ver `hospedaje`).
      if (comision > 0) sugeridos.push({ concepto: "Comisión Stripe (3.6 % + IVA)", monto: comision });
      if (extras > 0) sugeridos.push({ concepto: "Extras de las reservas", monto: extras });
      return { ...s, costosSugeridos: sugeridos };
    })
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.tour.localeCompare(b.tour));
}

/** Lo vendido de hotel en la reserva (los renglones de `packageItems`). */
function hotelDe(b: TourBooking): number {
  const raw = b.packageItems;
  if (!Array.isArray(raw)) return 0;
  return raw.reduce((t: number, p: any) => t + Math.max(0, Math.round(Number(p?.subtotal) || 0)), 0);
}

/** Los tours de una reserva con su fecha, su grupo y lo que vale cada uno (su peso). */
function tramosDe(b: TourBooking, hotel: number) {
  const lineas = lineasDe(b).filter(l => l.tourDate);
  if (lineas.length === 0) {
    return [{
      fecha: b.tourDate, slug: b.tourSlug, nombre: (b.tourName || "").trim(),
      personas: grupoDe(b).total, peso: Math.max(1, b.totalAmount - hotel),
    }];
  }
  return lineas.map(l => {
    // Mismo conteo que el Calendario y el cupo: `children` ya trae los dos tramos.
    const personas = (Number(l.adults) || 0)
      + Math.max(Number(l.children) || 0, (Number(l.childrenMid) || 0) + (Number(l.childrenSmall) || 0));
    return {
      fecha: l.tourDate as string,
      // Un renglón sin tour en un carrito de varios es un concepto (el traslado):
      // no hereda el tour de la reserva.
      slug: l.tourSlug || (lineas.length === 1 ? b.tourSlug : ""),
      nombre: (l.tourName || b.tourName || "").trim(),
      personas: personas || grupoDe(b).total,
      peso: Math.max(0, Number(l.subtotal) || 0),
    };
  });
}

// GET ?semana=YYYY-MM-DD → las salidas de esa semana y lo guardado.
// GET ?lista=1          → los cortes guardados, del más reciente al más viejo.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  try {
    if (sp.get("lista")) {
      try {
        const cortes = await prisma.corteSemanal.findMany({
          orderBy: { semana: "desc" }, take: 52,
          select: { semana: true, hasta: true, ventas: true, costos: true, utilidad: true, guardadoPor: true, updatedAt: true },
        });
        return NextResponse.json({ cortes });
      } catch (e: any) {
        if (sinTabla(e)) return NextResponse.json({ cortes: [], sinTabla: true });
        throw e;
      }
    }

    const pedida = sp.get("semana") ?? "";
    const semana = lunesDe(ES_FECHA.test(pedida) ? pedida : hoyMX());
    const hasta  = domingoDe(semana);
    const salidas = await salidasDeLaSemana(semana, hasta);

    let guardado = null;
    try {
      const g = await prisma.corteSemanal.findUnique({ where: { semana } });
      if (g) guardado = { captura: limpiarCaptura(g.captura), resumen: g.resumen, guardadoPor: g.guardadoPor, updatedAt: g.updatedAt };
    } catch (e: any) {
      if (!sinTabla(e)) throw e;
    }

    return NextResponse.json({ semana, hasta, salidas, guardado });
  } catch (e: any) {
    console.error("admin/cortes GET:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

/**
 * POST { semana, captura } → guarda el corte de esa semana (uno por semana:
 * guardar otra vez lo reemplaza). Las cifras se recalculan aquí con las
 * reservas de hoy; no se confía en los totales que manda el navegador.
 */
export async function POST(req: NextRequest) {
  let b: any;
  try { b = await req.json(); } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (!ES_FECHA.test(String(b?.semana ?? ""))) {
    return NextResponse.json({ error: "Semana inválida" }, { status: 400 });
  }

  try {
    const semana  = lunesDe(String(b.semana));
    const hasta   = domingoDe(semana);
    const salidas = await salidasDeLaSemana(semana, hasta);
    const pedida  = limpiarCaptura(b.captura);
    // Se guarda una entrada por cada salida viva —también las que no se
    // tocaron—, para que lo propuesto por el Cotizador quede congelado.
    const captura: Captura = Object.fromEntries(salidas.map(s => [s.clave, capturaDe(s, pedida)]));
    const resumen = calcularCorte(salidas, captura);

    const sesion = await sesionActual();
    const guardadoPor = sesion?.nombre ?? "Desconocido";
    const datos = {
      hasta, captura: captura as any, resumen: resumen as any,
      ventas: resumen.ventas, costos: resumen.costos, utilidad: resumen.utilidad, guardadoPor,
    };

    let previo, g;
    try {
      previo = await prisma.corteSemanal.findUnique({ where: { semana }, select: { id: true } });
      g = await prisma.corteSemanal.upsert({ where: { semana }, create: { semana, ...datos }, update: datos });
    } catch (e: any) {
      if (sinTabla(e)) {
        return NextResponse.json(
          { error: "La tabla de cortes todavía no existe en esta base: se crea al desplegar en Railway." },
          { status: 503 },
        );
      }
      throw e;
    }

    await registrarEnBitacora({
      accion: previo ? "modificó" : "creó",
      entidad: "corte",
      referencia: semana,
      resumen: `Corte semanal ${etiquetaSemana(semana)} · utilidad ${pesos(resumen.utilidad)} (${resumen.salidas.length} salidas)`,
    });

    return NextResponse.json({
      ok: true,
      guardado: { captura, resumen, guardadoPor: g.guardadoPor, updatedAt: g.updatedAt },
    });
  } catch (e: any) {
    console.error("admin/cortes POST:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
