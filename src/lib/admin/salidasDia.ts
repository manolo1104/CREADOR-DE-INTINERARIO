// Solo servidor: arma las salidas de un rango de fechas con sus pasajeros,
// su registro operativo (`Salida`), su checklist y sus números.
import { prisma } from "@/lib/prisma";
import { addDaysYMD } from "@/lib/dates";
import { TOURS_DB, partesRecogida, tourDurTexto } from "@/lib/tours";
import { cupoDeTour } from "@/lib/cupoTour";
import { origenValido, type OrigenReserva } from "@/lib/origenReserva";
import { conceptosDe, type ConceptoCosto } from "./costos";
import { saldoPendiente } from "./dinero";
import { hospedajeDeReserva } from "./hospedaje";
import { checklistDe, type ItemChecklist } from "./checklistSalida";
import {
  agruparSalidas, diasEnRango, estadoDeSalida, numerosDeSalida, type EstadoSalida, type NumerosSalida, type SalidaAgrupada,
} from "./salidas";

export interface Pasajero {
  bookingId: string;
  folio: string;
  cliente: string;
  personas: number;
  canal: OrigenReserva;
  /** pagado: sin saldo · ota: lo cobra la plataforma · saldo: se cobra en sitio */
  pago: "pagado" | "ota" | "saldo";
  saldo: number;
  telefono: string;
  hospedaje: string | null;
  notas: string;
  idioma: string;
  /** Lo registrado de ESTE tour en su reserva. */
  monto: number;
}

export interface RegistroSalida {
  tipo: string;
  guia: string;
  vehiculo: string;
  estado: string;
  notas: string;
}

export interface ProtocoloSalida {
  lugar: string;
  hora: string | null;
  duracion: string;
  incluye: string[];
}

export interface SalidaOperativa extends SalidaAgrupada {
  tourNombre: string;
  cupo: number | null;
  estadoPax: EstadoSalida;
  registro: RegistroSalida;
  checklist: ItemChecklist[];
  conceptos: ConceptoCosto[];
  numeros: NumerosSalida;
  /** Precio por persona del catálogo, para el simulador (0 si se cobra por vehículo o a medida). */
  precioPorPax: number;
  protocolo: ProtocoloSalida | null;
  pasajeros: Pasajero[];
}

const REGISTRO_VACIO: RegistroSalida = { tipo: "fija", guia: "", vehiculo: "", estado: "programada", notas: "" };

/** Las salidas (tour + día) con todo lo que hace falta para operarlas, entre dos fechas inclusive. */
export async function salidasEntre(desde: string, hasta: string): Promise<SalidaOperativa[]> {
  // `tourDate` es solo el primer tour de la reserva; los días reales viven en
  // `lineItems`. Se busca con margen y abajo se filtra renglón por renglón.
  const reservas = await prisma.tourBooking.findMany({
    where: { status: { not: "cancelled" }, tourDate: { gte: addDaysYMD(desde, -21), lte: addDaysYMD(hasta, 21) } },
    orderBy: { tourDate: "asc" },
  });
  const dias = diasEnRango(reservas, desde, hasta);
  const salidas = agruparSalidas(dias);
  if (salidas.length === 0) return [];
  const slugs = Array.from(new Set(salidas.map(s => s.slug)));
  const [registros, costos] = await Promise.all([
    prisma.salida.findMany({ where: { clave: { in: salidas.map(s => s.clave) } } }).catch(() => []),
    prisma.tourCosto.findMany({ where: { tourSlug: { in: slugs } } }),
  ]);
  const porFolio = new Map(reservas.map(r => [r.confirmationNumber, r]));

  return salidas.map(s => {
    const tour = TOURS_DB.find(t => t.slug === s.slug) ?? null;
    const reg = registros.find(r => r.clave === s.clave);
    const conceptos = conceptosDe(costos.find(c => c.tourSlug === s.slug)?.conceptos);
    const pasajeros: Pasajero[] = dias
      .filter(d => s.folios.includes(d.folio) && d.fecha === s.fecha && d.slug === s.slug && (!s.aMedida || d.nombre.trim().toLowerCase() === s.nombre.trim().toLowerCase()))
      .map(d => {
        const b = porFolio.get(d.folio)!;
        const saldo = saldoPendiente(b);
        const canal = origenValido(b.origen);
        return {
          bookingId: b.id, folio: b.confirmationNumber, cliente: b.customerName, personas: d.personas, canal,
          pago: saldo === 0 ? "pagado" : canal === "ota" ? "ota" : "saldo", saldo,
          telefono: b.customerPhone ?? "", hospedaje: hospedajeDeReserva(b), notas: b.notes ?? "",
          idioma: b.idiomaTour ?? "es", monto: d.monto,
        };
      });
    const cupo = tour ? cupoDeTour(tour) : null;
    const precioPorPax = tour && tour.precioUnidad !== "vehiculo" && tour.precioUnidad !== "grupo" ? tour.precio : 0;
    const p = tour ? partesRecogida(tour, false) : null;
    return {
      ...s,
      tourNombre: tour?.nombre ?? s.nombre,
      cupo,
      estadoPax: estadoDeSalida(s, cupo),
      registro: reg
        ? { tipo: reg.tipo, guia: reg.guia ?? "", vehiculo: reg.vehiculo ?? "", estado: reg.estado, notas: reg.notas ?? "" }
        : REGISTRO_VACIO,
      checklist: checklistDe(s.slug, reg?.checklist),
      conceptos,
      numeros: numerosDeSalida(s.monto, s.personas, conceptos),
      precioPorPax,
      protocolo: tour && p ? { lugar: p.lugar, hora: p.hora, duracion: tourDurTexto(tour), incluye: tour.incluye ?? [] } : null,
      pasajeros,
    };
  });
}

/** Una salida por su clave ("YYYY-MM-DD|slug[|nombre]"). */
export async function salidaPorClave(clave: string): Promise<SalidaOperativa | null> {
  const fecha = clave.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null;
  const todas = await salidasEntre(fecha, fecha);
  return todas.find(s => s.clave === clave) ?? null;
}
