// Solo servidor: arma las salidas de un rango de fechas con sus pasajeros,
// su registro operativo (`Salida`), su checklist y sus números.
import { limpiarIncidencias, type Incidencia } from "./incidencias";
import { prisma } from "@/lib/prisma";
import { addDaysYMD } from "@/lib/dates";
import { TOURS_DB, partesRecogida, tourDurTexto } from "@/lib/tours";
import { MARGEN_DIAS, NO_CUENTAN, cupoDeTour } from "@/lib/cupoTour";
import { origenValido, type OrigenReserva } from "@/lib/origenReserva";
import { conceptosDe, type ConceptoCosto } from "./costos";
import { saldoPendiente } from "./dinero";
import { claveTarjeta, costosDelCorte, type CostoDelCorte } from "./costosReales";
import { hospedajeDeReserva } from "./hospedaje";
import { checklistDe, type ItemChecklist } from "./checklistSalida";
import { claveReglaConSalidaNueva } from "./automatizaciones";
import {
  agruparSalidas, claveDeSalida, diasDeTourDe, diasEnRango, emparejarRegistros, esAMedida, esPrivadaDeCatalogo, estadoDeSalida,
  guiaDeSalida, minimoDelTour, numerosDeSalida, pagoEnSalida, salidaCancelada,
  type EstadoSalida, type NumerosSalida, type PagoPasajero, type SalidaAgrupada,
} from "./salidas";

export interface Pasajero {
  bookingId: string;
  folio: string;
  cliente: string;
  personas: number;
  canal: OrigenReserva;
  /**
   * pagado: sin saldo · ota: lo cobra la plataforma · saldo: se cobra en sitio
   * · saldo-otro-dia: debe, pero se cobra el primer día del viaje (`primerDia`).
   */
  pago: PagoPasajero;
  saldo: number;
  /** El primer día de su viaje (YYYY-MM-DD): ahí se cobra el saldo. */
  primerDia: string;
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
  /** La ficha de «Rutas y protocolos» del tour (Fase 1), si ya se capturó. */
  ruta: {
    paradas: { hora: string; lugar: string; detalle: string }[];
    seguridad: string | null; planB: string | null; queLlevar: string | null;
    proveedores: { nombre: string; servicio: string; telefono: string | null }[];
  } | null;
}

export interface SalidaOperativa extends SalidaAgrupada {
  tourNombre: string;
  cupo: number | null;
  /** El mínimo para que el tour corra (`groupMin` de 3 o más), o null (lote 6). */
  minimo: number | null;
  estadoPax: EstadoSalida;
  /** `registro.guia` es el de la salida o, si no tiene, el común de sus reservas (lote 6). */
  registro: RegistroSalida;
  /** true = el guía viene de las reservas, no se ha guardado en la salida. */
  guiaDeReservas: boolean;
  /** Las reservas traen otro guía o varios distintos. */
  avisoGuia: string | null;
  checklist: ItemChecklist[];
  /** Bitácora de incidencias de la salida (4 nov 2026). */
  incidencias: Incidencia[];
  conceptos: ConceptoCosto[];
  /**
   * De dónde salen los costos de `numeros` (4 nov 2026, Manolo): «corte» = los
   * capturados en el corte semanal de esa semana (los reales); «cotizador» = la
   * estimación del Cotizador mientras no hay corte; null = sin costos.
   */
  fuenteCostos: "corte" | "cotizador" | null;
  /** Lunes de la semana del corte de donde salieron (si fuente = corte). */
  semanaCorte: string | null;
  numeros: NumerosSalida;
  /** Precio por persona del catálogo, para el simulador (0 si se cobra por vehículo o a medida). */
  precioPorPax: number;
  protocolo: ProtocoloSalida | null;
  pasajeros: Pasajero[];
}

const REGISTRO_VACIO: RegistroSalida = { tipo: "fija", guia: "", vehiculo: "", estado: "programada", notas: "" };

/**
 * Las reservas que pueden tener un tour entre dos fechas. 🔴 `tourDate` es
 * solo el PRIMER tour de un carrito; los demás pueden caer hasta seis meses
 * después (lo que deja elegir el calendario). Con ±21 días, el 2.º tour de un
 * carrito con fechas separadas no salía en Salidas del día (lote 6, 10 nov
 * 2026): mismo margen que el cupo (`MARGEN_DIAS`). Y sin los «borrador» del bot
 * viejo, que eran cotizaciones sin pago: el mismo criterio que el corte.
 */
function reservasEntre(desde: string, hasta: string) {
  return prisma.tourBooking.findMany({
    where: {
      status: { notIn: NO_CUENTAN },
      OR: [{ tourDate: { gte: addDaysYMD(desde, -MARGEN_DIAS), lte: addDaysYMD(hasta, MARGEN_DIAS) } }, { tourDate: "" }],
    },
    orderBy: { tourDate: "asc" },
  });
}

/** Las reservas vivas de una salida (lote 6): para escribirles el guía y para reconocer su registro si cambia la clave. */
export async function reservasDeSalida(clave: string): Promise<{ id: string; folio: string; guia: string | null; otrosDias: boolean }[]> {
  const fecha = clave.slice(0, 10);
  const reservas = await reservasEntre(fecha, fecha);
  const folios = new Set(diasEnRango(reservas, fecha, fecha).filter(d => claveDeSalida(d) === clave).map(d => d.folio));
  return reservas.filter(r => folios.has(r.confirmationNumber)).map(r => ({ id: r.id, folio: r.confirmationNumber, guia: r.guia, otrosDias: tieneOtrosDias(r, clave) }));
}

/** ¿La reserva tiene tours en otras salidas (otro día u otro tour)? Su guía es de todo el viaje (revisión 10 nov 2026). */
const tieneOtrosDias = (r: Parameters<typeof diasDeTourDe>[0], clave: string) => diasDeTourDe(r).some(d => claveDeSalida(d) !== clave);

/**
 * Pasa los seguimientos de una salida a su clave nueva, con su `claveRegla`
 * (revisión 10 nov 2026): si no, la regla de 48 h o la del mínimo volvían a
 * crear la misma tarea con la clave nueva y salía dos veces. No lanza.
 */
async function moverSeguimientos(vieja: string, nueva: string): Promise<void> {
  const tareas = await prisma.tarea.findMany({ where: { salidaClave: vieja }, select: { id: true, claveRegla: true } });
  for (const t of tareas) {
    const claveRegla = claveReglaConSalidaNueva(t.claveRegla, vieja, nueva);
    await prisma.tarea.update({ where: { id: t.id }, data: { salidaClave: nueva, ...(claveRegla !== t.claveRegla ? { claveRegla } : {}) } })
      // Ya hay una con la clave nueva (se creó antes del cambio): solo se mueve la salida.
      .catch(() => prisma.tarea.update({ where: { id: t.id }, data: { salidaClave: nueva } }));
  }
}

/**
 * Las salidas (tour + día) con todo lo que hace falta para operarlas, entre dos
 * fechas inclusive. Las marcadas «Cancelada» no salen (lote 6, 10 nov 2026):
 * ni en Inicio, ni en el correo de las 7:30, ni en los KPIs; quien necesite
 * verlas (la lista del día, la ficha) pide `conCanceladas`.
 */
export async function salidasEntre(desde: string, hasta: string, opciones: { conCanceladas?: boolean } = {}): Promise<SalidaOperativa[]> {
  // `tourDate` es solo el primer tour de la reserva; los días reales viven en
  // `lineItems`. Se busca con margen y abajo se filtra renglón por renglón.
  const reservas = await reservasEntre(desde, hasta);
  const dias = diasEnRango(reservas, desde, hasta);
  const salidas = agruparSalidas(dias);
  if (salidas.length === 0) return [];
  const slugs = Array.from(new Set(salidas.map(s => s.slug)));
  const fechas = Array.from(new Set(salidas.map(s => s.fecha)));
  const slugsAMedida = slugs.filter(esAMedida);
  const [registrosLeidos, costos, rutas, corte] = await Promise.all([
    // Con su clave y, por si la clave cambió, los del mismo día de los tours a medida (lote 6).
    prisma.salida.findMany({ where: { OR: [{ clave: { in: salidas.map(s => s.clave) } }, ...(slugsAMedida.length ? [{ fecha: { in: fechas }, tourSlug: { in: slugsAMedida } }] : [])] } }).catch(() => []),
    prisma.tourCosto.findMany({ where: { tourSlug: { in: slugs } } }),
    prisma.rutaTour.findMany({ where: { tourSlug: { in: slugs } } }).catch(() => []),
    costosDelCorte(desde, hasta).catch(e => { console.error("costos del corte:", (e as Error)?.message); return new Map<string, CostoDelCorte>(); }),
  ]);
  const idsProv = Array.from(new Set(rutas.flatMap(r => r.proveedores)));
  const provs = idsProv.length ? await prisma.proveedor.findMany({ where: { id: { in: idsProv }, activo: true }, select: { id: true, nombre: true, servicio: true, telefono: true } }).catch(() => []) : [];
  const rutaDe = (slug: string): ProtocoloSalida["ruta"] => {
    const r = rutas.find(x => x.tourSlug === slug);
    if (!r) return null;
    return {
      paradas: Array.isArray(r.paradas) ? (r.paradas as { hora: string; lugar: string; detalle: string }[]) : [],
      seguridad: r.seguridad, planB: r.planB, queLlevar: r.queLlevar,
      proveedores: r.proveedores.map(id => provs.find(p => p.id === id)).filter((p): p is NonNullable<typeof p> => !!p).map(p => ({ nombre: p.nombre, servicio: p.servicio, telefono: p.telefono })),
    };
  };
  const porFolio = new Map(reservas.map(r => [r.confirmationNumber, r]));
  // El primer día del viaje de cada reserva: el saldo se cobra solo ahí (lote 6).
  const primerDiaDe = new Map<string, string>();
  for (const r of reservas) primerDiaDe.set(r.confirmationNumber, diasDeTourDe(r).map(d => d.fecha).filter(Boolean).sort()[0] ?? r.tourDate);
  // El registro de cada salida, aunque su clave haya cambiado (lote 6). El que
  // se reconoce por sus reservas se pasa a la clave nueva (y sus seguimientos
  // con él): así lo encuentra el siguiente guardado.
  const registroDe = emparejarRegistros(salidas, registrosLeidos);
  for (const s of salidas) {
    const r = registroDe.get(s.clave);
    if (!r || r.clave === s.clave) continue;
    const vieja = r.clave;
    await prisma.salida.updateMany({ where: { id: r.id, clave: vieja }, data: { clave: s.clave, folios: s.folios } })
      .then(() => moverSeguimientos(vieja, s.clave))
      .catch(e => console.error("registro de salida (clave nueva):", (e as Error)?.message));
  }

  const todas = salidas.map(s => {
    const tour = TOURS_DB.find(t => t.slug === s.slug) ?? null;
    const reg = registroDe.get(s.clave);
    const conceptos = conceptosDe(costos.find(c => c.tourSlug === s.slug)?.conceptos);
    // Un pasajero por reserva: `diasDeTourDe` ya junta los renglones del mismo tour ese día (lote 6).
    const pasajeros: Pasajero[] = dias
      .filter(d => d.fecha === s.fecha && s.folios.includes(d.folio) && claveDeSalida(d) === s.clave)
      .map(d => {
        const b = porFolio.get(d.folio)!;
        const saldo = saldoPendiente(b);
        const canal = origenValido(b.origen);
        const primerDia = primerDiaDe.get(d.folio) ?? d.fecha;
        return {
          bookingId: b.id, folio: b.confirmationNumber, cliente: b.customerName, personas: d.personas, canal,
          pago: pagoEnSalida({ saldo, canal, fecha: d.fecha, primerDia }), saldo, primerDia,
          telefono: b.customerPhone ?? "", hospedaje: hospedajeDeReserva(b), notas: b.notes ?? "",
          idioma: b.idiomaTour ?? "es", monto: d.monto,
        };
      });
    // Costos REALES del corte (Manolo, 4 nov 2026): si todas sus reservas están en
    // un corte guardado, la utilidad sale de lo capturado ahí; si no, se estima
    // con el Cotizador y se dice que es estimado.
    const tarjetas = pasajeros.map(p => corte.get(claveTarjeta(s.fecha, s.slug, p.bookingId)));
    const costoCorte = tarjetas.every(Boolean) ? tarjetas.reduce((t, x) => t + (x?.costos ?? 0), 0) : 0;
    // 🔴 Un corte con $0 de costos para esta salida (tarjetas sin capturar o
    // fuera del corte) NO es «costos reales»: daba 100 % de margen en
    // Rentabilidad y en Portafolio mientras esta pantalla decía «Faltan costos»
    // (4 nov 2026). Sin costos en el corte, manda el Cotizador (o nada).
    const conCorte = pasajeros.length > 0 && tarjetas.every(Boolean) && costoCorte > 0;
    const numeros = conCorte
      ? numerosDeSalida(s.monto, s.personas, [{ concepto: "Costos del corte", monto: costoCorte, tipo: "fijo" }])
      : numerosDeSalida(s.monto, s.personas, conceptos);
    const cupo = tour ? cupoDeTour(tour) : null;
    const precioPorPax = tour && tour.precioUnidad !== "vehiculo" && tour.precioUnidad !== "grupo" ? tour.precio : 0;
    const p = tour ? partesRecogida(tour, false) : null;
    const guia = guiaDeSalida(reg?.guia, pasajeros.map(x => {
      const b = porFolio.get(x.folio);
      return { folio: x.folio, guia: b?.guia, otrosDias: !!b && tieneOtrosDias(b, s.clave) };
    }));
    // El Edén es privada aunque nadie lo haya marcado (lote 6).
    const base = reg
      ? { tipo: reg.tipo, guia: reg.guia ?? "", vehiculo: reg.vehiculo ?? "", estado: reg.estado, notas: reg.notas ?? "" }
      : { ...REGISTRO_VACIO, tipo: esPrivadaDeCatalogo(s.slug) ? "privada" : REGISTRO_VACIO.tipo };
    return {
      ...s,
      tourNombre: tour?.nombre ?? s.nombre,
      cupo,
      minimo: minimoDelTour(s.slug),
      estadoPax: estadoDeSalida(s, cupo),
      registro: { ...base, guia: guia.guia },
      guiaDeReservas: guia.deReservas,
      avisoGuia: guia.aviso,
      checklist: checklistDe(s.slug, reg?.checklist),
      incidencias: limpiarIncidencias((reg as { incidencias?: unknown } | undefined)?.incidencias),
      conceptos,
      numeros,
      fuenteCostos: conCorte ? "corte" as const : numeros.conCostos ? "cotizador" as const : null,
      semanaCorte: conCorte ? (tarjetas[0]?.semana ?? null) : null,
      precioPorPax,
      protocolo: tour && p ? {
        // El punto de encuentro capturado en «Rutas» manda sobre el del catálogo.
        lugar: rutas.find(x => x.tourSlug === s.slug)?.puntoEncuentro || p.lugar, hora: p.hora,
        duracion: tourDurTexto(tour), incluye: tour.incluye ?? [], ruta: rutaDe(s.slug),
      } : null,
      pasajeros,
    };
  });
  return opciones.conCanceladas ? todas : todas.filter(s => !salidaCancelada(s.registro.estado));
}

/** Una salida por su clave ("YYYY-MM-DD|slug[|nombre]"), aunque esté cancelada (para poder reabrirla). */
export async function salidaPorClave(clave: string): Promise<SalidaOperativa | null> {
  const fecha = clave.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null;
  const todas = await salidasEntre(fecha, fecha, { conCanceladas: true });
  return todas.find(s => s.clave === clave) ?? null;
}
