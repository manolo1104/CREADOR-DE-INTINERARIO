import { NextRequest, NextResponse } from "next/server";
import type { TourBooking } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/admin/sesion";
import { registrarEnBitacora, pesos } from "@/lib/admin/bitacora";
import { montoCobrado, saldoPendiente } from "@/lib/admin/kpis";
import { conceptosDe } from "@/lib/admin/costos";
import { extrasDe, costoExtras } from "@/lib/admin/extras";
import { lineasDe, grupoDe } from "@/lib/admin/reserva";
import { zonaDeReserva, salidaDeReserva, hospedajeDeReserva } from "@/lib/admin/hospedaje";
import { TOURS_LISTA, cargoVallesDe } from "@/lib/tours";
import { ID_TRASLADO_VALLES } from "@/lib/tourPricing";
import { hoyMX, addDaysYMD } from "@/lib/dates";
import {
  lunesDe, domingoDe, etiquetaSemana, limpiarCaptura, capturaDe, calcularCorte,
  repartirExacto, sugerirCostos, limpiarCobros, PRIMERA_SEMANA_CORTE, ERROR_SEMANA_ANTERIOR,
  type SalidaCorte, type Captura, type EstadoCorte, type CatalogoCostos,
} from "@/lib/admin/corteSemanal";

export const dynamic = "force-dynamic";

const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/;

// La tabla `CorteSemanal` la crea Railway al desplegar (`db push`). Si la base
// todavía no la tiene —o no tiene una columna nueva, como `estado`: P2022—, el
// corte se puede VER pero no guardar.
const sinTabla = (e: any) => e?.code === "P2021" || e?.code === "P2022";

/**
 * El slug de los tours armados a mano en el panel (el de `ReservaModal`). Se
 * repite aquí porque ese archivo es «use client»: importado desde una ruta de
 * servidor no llega como texto.
 */
const SLUG_PERSONALIZADO = "__personalizado";
const normalizar = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
/**
 * Qué tour es un renglón, para la clave. Los personalizados comparten slug, así
 * que se distinguen por su nombre: antes dos tours distintos de dos clientes el
 * mismo día (21 oct 2026) salían como una sola salida.
 */
const tourDe = (t: { slug: string; nombre: string }) =>
  t.slug && t.slug !== SLUG_PERSONALIZADO ? t.slug : `${t.slug || "concepto"}:${normalizar(t.nombre)}`;

/**
 * Las tarjetas de una semana: cada reserva se abre en sus tours (`lineItems`,
 * cada uno con su fecha, igual que el Calendario), y cada tour de cada reserva
 * es su propia tarjeta. Ya NO se juntan reservas distintas del mismo tour y día
 * (Manolo, 20 oct 2026): una de Ciudad Valles y una de Xilitla cuestan
 * distinto, y en una sola salida no había dónde anotar la diferencia.
 */
async function salidasDeLaSemana(lunes: string, domingo: string): Promise<{ salidas: SalidaCorte[]; catalogo: CatalogoCostos }> {
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
  const costosPorSlug: CatalogoCostos = Object.fromEntries(catalogo.map(c => [c.tourSlug, conceptosDe(c.conceptos)]));

  // `grupo`: el tamaño del grupo, por si los renglones no traen personas (RZR).
  interface Acumulada extends SalidaCorte { grupo: number }
  const mapa = new Map<string, Acumulada>();

  for (const b of reservas) {
    const zona    = zonaDeReserva(b);
    const hotel   = hotelDe(b);
    const tramos  = tramosDe(b, hotel);
    const cobrado = montoCobrado(b);
    // La parte del hotel es su precio en la proporción de la reserva que ya se
    // cobró: pagada completa, el hotel recibe justo su precio. Un descuento o
    // un extra no le mueven nada al hotel: eso lo absorben los tours.
    const cobradoHotel = hotel > 0 && b.totalAmount > 0
      ? Math.min(cobrado, Math.round((cobrado * hotel) / b.totalAmount))
      : 0;
    const extrasReserva = extrasDe(b.extraItems);
    const extras = costoExtras(extrasReserva);
    // Dos renglones del mismo tour el mismo día (un vehículo por renglón) son
    // UNA tarjeta: así se cuenta "entre cuántos tours se reparte".
    const claveDe = (t: { fecha: string; slug: string; nombre: string }) => `${t.fecha}|${b.id}|${tourDe(t)}`;
    const numTours = new Set(tramos.map(claveDe)).size;

    // Lo que vale cada tour es lo que dice la reserva: su renglón, y lo demás de
    // la reserva —extras, ajuste de precio, hotel— en el PRIMER tour, que es
    // también donde se carga el costo de los extras. Lo cobrado de las tarjetas
    // ya no se enseña (se escribe a mano en «La semana»), pero con este reparto
    // se separa el hotel y el peso de cada tarjeta en una cuenta junta.
    const iPrimero = tramos.reduce((m, t, i) => (t.fecha < tramos[m].fecha ? i : m), 0);
    const precios  = tramos.map(t => Math.round(t.peso));
    const resto    = b.totalAmount - hotel - precios.reduce((a, x) => a + x, 0);
    let pesosTour  = precios.map((p, i) => p + (i === iPrimero ? resto : 0));
    // Un descuento más grande que el primer tour no cabe en él: se reparte entre
    // todos, en proporción a su precio.
    const descuentoRepartido = pesosTour.some(p => p < 0);
    if (descuentoRepartido) pesosTour = repartirExacto(Math.max(0, b.totalAmount - hotel), precios);
    const pesosConHotel = pesosTour.map((p, i) => p + (i === iPrimero ? hotel : 0));
    // Pagada completa, cada tour recibe justo su peso; con anticipo, la misma
    // proporción. La suma siempre da lo cobrado.
    const cobradoPorTramo = repartirExacto(cobrado, pesosConHotel);
    const hotelPorTramo   = tramos.map((_, i) => (i === iPrimero ? cobradoHotel : 0));

    tramos.forEach((t, i) => {
      if (t.fecha < lunes || t.fecha > domingo) return;
      const clave = claveDe(t);
      let s = mapa.get(clave);
      if (!s) {
        s = {
          clave, fecha: t.fecha, slug: t.slug, zona,
          rzr: TOURS_LISTA.find(x => x.slug === t.slug)?.precioUnidad === "vehiculo",
          tour: TOURS_LISTA.find(x => x.slug === t.slug)?.nombre ?? (t.nombre || "Sin tour"),
          personas: 0, ventas: 0, hospedaje: 0, costosSugeridos: [],
          reserva: {
            id: b.id, folio: b.confirmationNumber, cliente: b.customerName.trim(),
            personas: 0, cobrado: 0, hospedaje: 0, cobradoReserva: cobrado, tours: numTours,
            precioTour: 0, totalReserva: b.totalAmount, saldo: saldoPendiente(b),
          },
          extras: 0, grupo: grupoDe(b).total,
        };
        mapa.set(clave, s);
      }
      const c = cobradoPorTramo[i];
      const h = hotelPorTramo[i];
      // La misma reserva puede traer dos renglones del mismo tour ese día (un
      // vehículo por renglón en el RZR): se suman en la misma tarjeta.
      s.reserva.personas  += t.personas;
      s.reserva.precioTour += precios[i];
      // La Ruta Surrealista cobra $400 desde Valles: la tarjeta dice de dónde salió.
      const cargo = cargoVallesDe(TOURS_LISTA.find(x => x.slug === t.slug));
      if (cargo > 0) {
        s.cargoValles ??= { salida: salidaDeReserva(b), cargo, cobrado: 0, hospedaje: hospedajeDeReserva(b) };
        s.cargoValles.cobrado += t.trasladoValles;
      }
      s.reserva.cobrado   += c;
      s.reserva.hospedaje += h;
      s.personas  += t.personas;
      s.ventas    += c;
      s.hospedaje += h;
      // Los extras (comida, transporte) son de la reserva, no de cada tour:
      // se cargan una sola vez, al primero (el mismo que lleva su venta).
      if (i === iPrimero) s.extras += extras;
    });
  }

  const salidas = Array.from(mapa.values())
    .map(({ grupo, ...s }): SalidaCorte => {
      // 🔴 Un renglón por vehículo (RZR) trae 0 personas. Antes cada renglón
      // valía el grupo entero y al juntarlos se sumaban: 2 vehículos de un
      // grupo de 4 salían 8 personas, y los costos por persona, al doble.
      if (s.personas === 0) { s.personas = grupo; s.reserva.personas = grupo; }
      // Si se le cobró el traslado de Valles (la casilla del panel), salió de
      // Valles aunque la reserva no traiga la zona escrita.
      if (s.cargoValles && !s.cargoValles.salida && s.cargoValles.cobrado > 0) {
        s.cargoValles.salida = "valles";
        s.zona = "valles";
      }
      const tarjeta = s;
      // Los costos fijos (guía, gasolina, transporte) van COMPLETOS en cada
      // reserva, como si saliera sola (Manolo, 20 oct 2026). Si dos reservas
      // fueron en la misma camioneta, se juntan en una cuenta desde la página
      // (`sugerirCostos` con las dos) y los fijos quedan una sola vez.
      return { ...tarjeta, costosSugeridos: sugerirCostos([tarjeta], costosPorSlug) };
    })
    // De lunes a domingo, y el mismo día por cliente (Manolo, 20 oct 2026). La
    // página las agrupa por cliente en el orden en que aparece cada uno —el día
    // de su primer tour—, y la hoja impresa sale en este mismo orden.
    .sort((a, b) =>
      a.fecha.localeCompare(b.fecha)
      || a.reserva.cliente.localeCompare(b.reserva.cliente, "es", { sensitivity: "base" })
      || a.tour.localeCompare(b.tour) || a.reserva.folio.localeCompare(b.reserva.folio));
  return { salidas, catalogo: costosPorSlug };
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
      personas: grupoDe(b).total, peso: Math.max(1, b.totalAmount - hotel), trasladoValles: 0,
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
      // Crudo, aunque sea 0 (RZR): el respaldo del grupo se pone UNA vez por
      // tarjeta, en `salidasDeLaSemana`, para no sumarlo por cada vehículo.
      personas,
      peso: Math.max(0, Number(l.subtotal) || 0),
      // El cargo de Valles va como add-on del renglón (checkout y panel).
      trasladoValles: (l.addOns ?? [])
        .filter(a => a.id === ID_TRASLADO_VALLES)
        .reduce((t, a) => t + Math.max(0, Math.round(Number(a.subtotal) || 0)), 0),
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
          // Las de antes del corte no se listan (ver `PRIMERA_SEMANA_CORTE`).
          where: { semana: { gte: PRIMERA_SEMANA_CORTE } },
          orderBy: { semana: "desc" }, take: 52,
          select: { semana: true, hasta: true, ventas: true, costos: true, utilidad: true, guardadoPor: true, updatedAt: true, estado: true, resumen: true },
        });
        return NextResponse.json({ cortes });
      } catch (e: any) {
        if (sinTabla(e)) return NextResponse.json({ cortes: [], sinTabla: true });
        throw e;
      }
    }

    const pedida = sp.get("semana") ?? "";
    const semana = lunesDe(ES_FECHA.test(pedida) ? pedida : hoyMX());
    // A propósito (Manolo, 20 oct 2026): las semanas de antes del corte
    // contestan como si fallara. Ver `PRIMERA_SEMANA_CORTE`.
    if (semana < PRIMERA_SEMANA_CORTE) {
      return NextResponse.json({ error: ERROR_SEMANA_ANTERIOR }, { status: 503 });
    }
    const hasta  = domingoDe(semana);
    const { salidas, catalogo } = await salidasDeLaSemana(semana, hasta);

    let guardado = null;
    try {
      const g = await prisma.corteSemanal.findUnique({ where: { semana } });
      if (g) guardado = {
        captura: limpiarCaptura(g.captura), cobros: limpiarCobros(g.cobros),
        resumen: g.resumen, guardadoPor: g.guardadoPor, updatedAt: g.updatedAt,
        estado: (g.estado === "borrador" ? "borrador" : "cerrado") as EstadoCorte,
      };
    } catch (e: any) {
      if (!sinTabla(e)) throw e;
    }

    return NextResponse.json({ semana, hasta, salidas, catalogo, guardado });
  } catch (e: any) {
    console.error("admin/cortes GET:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

/**
 * POST { semana, captura, cerrar } → guarda esa semana (una fila por semana:
 * guardar otra vez la reemplaza). Las cifras se recalculan aquí con las
 * reservas de hoy; no se confía en los totales que manda el navegador.
 *
 * `cerrar: false` es «Guardar costos» (20 oct 2026, Manolo): guarda lo
 * capturado sin hacer el corte, para no perderlo al recargar. Sin la bandera
 * se cierra, que es lo que hacía siempre «Guardar corte».
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
    // Tampoco se guardan (ver `PRIMERA_SEMANA_CORTE`).
    if (semana < PRIMERA_SEMANA_CORTE) {
      return NextResponse.json({ error: ERROR_SEMANA_ANTERIOR }, { status: 503 });
    }
    const hasta   = domingoDe(semana);
    const { salidas } = await salidasDeLaSemana(semana, hasta);
    const pedida  = limpiarCaptura(b.captura);
    // Lo cobrado de la semana, escrito a mano en «La semana» con quién y de qué.
    const cobros  = limpiarCobros(b.cobros);
    const cerrar  = b.cerrar !== false;

    const sesion = await sesionActual();
    const guardadoPor = sesion?.nombre ?? "Desconocido";

    let previo, g, estado: EstadoCorte, captura: Captura, resumen: ReturnType<typeof calcularCorte>;
    try {
      previo = await prisma.corteSemanal.findUnique({ where: { semana }, select: { id: true, estado: true } });
      // Un corte hecho no se «deshace» guardando costos: los números se
      // recalculan igual, así que guardar costos encima es rehacerlo.
      estado = cerrar || previo?.estado === "cerrado" ? "cerrado" : "borrador";
      captura = estado === "cerrado"
        // Al cerrar se congela una entrada por cada tarjeta viva —también las
        // que no se tocaron—, para que lo propuesto por el Cotizador quede fijo.
        ? Object.fromEntries(salidas.map(s => [s.clave, capturaDe(s, pedida)]))
        // En borrador solo lo que se tocó: lo demás sigue tomando lo del
        // Cotizador y la comisión de los cobros que vayan entrando.
        : Object.fromEntries(salidas.filter(s => pedida[s.clave]).map(s => [s.clave, pedida[s.clave]]));
      resumen = calcularCorte(salidas, captura, cobros);
      const datos = {
        hasta, captura: captura as any, resumen: resumen as any,
        ventas: resumen.ventas, costos: resumen.costos, utilidad: resumen.utilidad, guardadoPor, estado,
        cobros: cobros as any,
      };
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
      resumen: estado === "cerrado"
        ? `Corte semanal ${etiquetaSemana(semana)} · utilidad ${pesos(resumen.utilidad)} (${resumen.tarjetas} tours)`
        : `Costos del corte ${etiquetaSemana(semana)} (borrador) · costos ${pesos(resumen.costos)} (${resumen.tarjetas} tours)`,
    });

    return NextResponse.json({
      ok: true,
      guardado: { captura, cobros, resumen, estado, guardadoPor: g.guardadoPor, updatedAt: g.updatedAt },
    });
  } catch (e: any) {
    console.error("admin/cortes POST:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
