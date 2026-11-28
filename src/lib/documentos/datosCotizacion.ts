/**
 * Los DATOS de una cotización (COT-…), sin formato.
 *
 * 27 nov 2026: salieron de `htmlCotizacion.ts` para que el HTML (el que
 * imprime el bot) y el PDF del servidor (`pdf/PdfCotizacion.tsx`, el que
 * descarga el panel) digan lo mismo. Aquí no se escapa nada.
 */
import type { TourQuote } from "@prisma/client";
import { TOURS_LISTA, partesRecogida, cargoVallesDe, opcionDeEleccion, incluyePropioDeTour, claveIncluye, INCLUYE_SIEMPRE, sinLugarDelDesayuno, type Tour } from "@/lib/tours";
import { resumenSalidas } from "@/lib/recogidaTexto";
import type { PackageItem, LineItem } from "@/components/admin/ReservaModal";
import { calcTourLine, calcPackageLine, addOnsDeTour, cantidadAddOn } from "@/lib/admin/lineasPrecio";
import { VIGENCIAS, calcularVencimiento, fechaLimite, vigenciaDe } from "@/lib/vencimientoCotizacion";
import { desgloseCotizacion } from "@/lib/admin/totalesCotizacion";
import { grupoDe, grupoLargo } from "@/lib/admin/reserva";
import { extrasDe, totalExtras, calcExtraLine, extrasCobrados, extrasIncluidos } from "@/lib/admin/extras";
import { fDateDoc } from "@/lib/documentos/datosConfirmacion";

function getMeta(pkgs: any[]): { anticipo?: number; vigencia?: string; numPersonas?: number | null; priceOverride?: number | null; discountType?: "percent" | "fixed"; discountValue?: number | null } {
  return pkgs.find((p: any) => p._meta) || {};
}

/** Lo corto de un renglón de «incluye»: antes de « — » o «:», y sin pasarse de 70 letras. */
function corto(x: string): string {
  const base = x.split(" — ")[0].split(":")[0].split(" (")[0].trim();
  return base.length > 70 ? `${base.slice(0, 67).trim()}…` : base;
}

/**
 * «Sí incluye» de verdad (16 nov 2026). Lo propio de cada recorrido cotizado
 * (sin el traslado, que ya va en su renglón), con el nombre del recorrido
 * cuando no lo llevan todos, más lo que va siempre.
 */
export function incluyeDeCotizacion(tours: Tour[]): string[] {
  const unicos = tours.filter((t, i) => tours.findIndex((x) => x.slug === t.slug) === i);
  if (!unicos.length) return ["Guía certificado NOM-09 SECTUR", ...INCLUYE_SIEMPRE];
  const porClave = new Map<string, { texto: string; de: Set<string> }>();
  for (const t of unicos) {
    for (const x of incluyePropioDeTour(t).map(sinLugarDelDesayuno)) {
      if (/^traslado/i.test(x)) continue;
      const k = claveIncluye(corto(x));
      const e = porClave.get(k) ?? { texto: corto(x), de: new Set<string>() };
      e.de.add(t.nombreCorto);
      porClave.set(k, e);
    }
  }
  const lista = Array.from(porClave.values()).map((e) =>
    e.de.size === unicos.length || unicos.length === 1 ? e.texto : `${e.texto} (${Array.from(e.de).join(", ")})`,
  );
  return [...lista.slice(0, 12), ...INCLUYE_SIEMPRE];
}

export interface RenglonCotizacion {
  nombre: string;
  /** Renglones chicos bajo el nombre (quiénes van, la elección). */
  subs: string[];
  /** Actividades opcionales cobradas en el renglón (van en otro color). */
  opcionales: string[];
  fecha: string;
  /** «8», «2 veh.», «1 hab.» o la cantidad del extra. */
  cantidad: string;
  importe: number;
}

export interface DatosCotizacion {
  folio: string;
  emitida: string;
  vigencia: string;
  vigenciaLabel: string;
  cliente: { nombre: string; telefono: string; email: string; notas: string };
  personas: number;
  desglosePersonas: string;
  fechaInicio: string;
  fechaFin: string;
  duracionDias: number;
  hospedaje: string;
  recogida: string[];
  renglones: RenglonCotizacion[];
  toursTotal: number;
  pkgsTotal: number;
  extrasTotal: number;
  ajuste: number;
  descuento: number;
  total: number;
  anticipo: number;
  anticipoPct: number;
  saldo: number;
  siIncluye: string[];
  noIncluye: string[];
  cancelacion: string;
}

export function datosCotizacion(q: TourQuote, hoy: Date = new Date()): DatosCotizacion {
  const rawPkgs  = (q as any).packageItems ?? [];
  const meta     = getMeta(rawPkgs);
  const pkgs: PackageItem[] = rawPkgs.filter((p: any) => !p._meta);
  // Sin el `_meta` de seguimiento: no es una línea de tour.
  const lineasTour = Array.isArray((q as any).lineItems) ? (q as any).lineItems.filter((l: any) => l && !l._meta) : [];
  const items: LineItem[] = lineasTour.length
    // Sin desglose (renglón viejo) los menores se leen como el tramo de antes; con
    // bebés o niños de 4 a 7 guardados, `children` ya no se reparte.
    ? lineasTour.map((l: any) => ({ ...l, childrenMid: l.childrenMid ?? (l.childrenSmall === undefined && l.infants === undefined ? (l.children ?? 0) : 0), childrenSmall: l.childrenSmall ?? 0 }))
    : [{ tourSlug: q.tourSlug, tourName: q.tourName, tourDate: q.tourDate, adults: q.adults, childrenMid: q.children ?? 0, childrenSmall: 0, subtotal: q.totalAmount }];

  // La vigencia es la fecha límite GUARDADA. Antes se contaba desde el día en
  // que se imprimía el PDF, así que cada descarga le alargaba el plazo.
  const vigDate  = new Date(`${fechaLimite(q) ?? calcularVencimiento(hoy, vigenciaDe(rawPkgs), q.tourDate)}T12:00:00`);
  const fmt      = (d: Date) => d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });

  const toursTotal  = items.reduce((s, l) => s + calcTourLine(l), 0);
  const pkgsTotal   = pkgs.reduce((s, p) => s + calcPackageLine(p), 0);
  // Los extras cobrados son parte del precio: sin contarlos aquí, la comida
  // aparte se pintaba en el PDF como si fuera un "descuento aplicado".
  const extrasQ     = extrasDe((q as any).extraItems);
  const extrasTotal = totalExtras(extrasQ);
  // El desglose sale de un solo sitio, el mismo que usa el correo.
  const desglose    = desgloseCotizacion(toursTotal + pkgsTotal + extrasTotal, q.totalAmount, meta as any);

  const tourDates    = items.map(l => l.tourDate).filter(Boolean).sort();
  const checkouts    = pkgs.map(p => p.checkout).filter(Boolean).sort();
  const fechaInicio  = tourDates[0] || q.tourDate;
  const fechaFin     = checkouts.length ? checkouts[checkouts.length - 1] : tourDates[tourDates.length - 1] || q.tourDate;
  const d1 = new Date(fechaInicio + "T12:00:00");
  const d2 = new Date(fechaFin + "T12:00:00");
  // Tamaño REAL del grupo (no sumar por tour: es el mismo grupo en todos).
  const perTourMax   = items.length ? Math.max(...items.map(l => l.adults + (l.childrenMid ?? 0) + (l.childrenSmall ?? 0) + ((l as { infants?: number }).infants ?? 0))) : 0;
  const grupoQ       = grupoDe(q as any);
  const numPersonas  = Number(meta.numPersonas) > 0
    ? Number(meta.numPersonas)
    : (perTourMax > 0 ? perTourMax : q.adults + (q.children ?? 0));

  // 🔴 La recogida sale de los recorridos cotizados (la Gruta y el Edén solo
  // recogen en Xilitla; el RZR y el buceo no recogen). Con renglones libres o
  // solo hospedaje no hay recorrido del que leerla: frase neutra.
  const toursCotizados = items
    .map(l => TOURS_LISTA.find(t => t.slug === l.tourSlug))
    .filter((t): t is Tour => !!t);
  const recogida = toursCotizados.length
    ? resumenSalidas(toursCotizados, "es")
    : ["La hora y el punto de recogida te los confirmamos por WhatsApp."];
  // 🔴 "Transporte desde y hacia tu hotel" solo si TODOS los recorridos
  // cotizados llevan traslado; si no, remite a la Recogida.
  const trasladoTodos  = toursCotizados.every(t => partesRecogida(t, false).incluyeTraslado);
  const conCostoValles = toursCotizados.filter(t => partesRecogida(t, false).valles).length;
  const conCargoValles = toursCotizados.filter(t => cargoVallesDe(t) > 0).length;
  const notaValles     = conCostoValles + conCargoValles === 0 ? ""
    : conCostoValles + conCargoValles === toursCotizados.length ? " (desde Ciudad Valles, con costo adicional)"
    : " (desde Ciudad Valles, en algunos con costo adicional)";
  const traslado = trasladoTodos ? `Transporte desde y hacia tu hotel${notaValles}` : "Traslado según se indica en «Recogida»";
  // 🔴 El Edén no se reembolsa: el pie prometía "cancelación gratuita" también ahí.
  const cancelPropias = toursCotizados
    .filter((t, n) => !!t.cancelacion && toursCotizados.findIndex(x => x.slug === t.slug) === n);
  const todasPropias  = cancelPropias.length > 0 && toursCotizados.every(t => t.cancelacion);
  const cancelacion   = todasPropias
    ? cancelPropias.map(t => t.cancelacion!.es).join(" ")
    : ["Cancelación gratuita hasta 48 h antes del primer tour; posteriores aplican cargo del 50%.", ...cancelPropias.map(t => `${t.nombreCorto}: ${t.cancelacion!.es}`)].join(" ");

  const renglonesTour: RenglonCotizacion[] = items.map(l => {
    const esVeh = !!l.vehiculo; // línea por vehículo (RZR): sin conteo de personas
    const un    = Math.max(1, Number(l.unidades) || 1);
    const bebes = (l as { infants?: number }).infants ?? 0;
    const total = l.adults + (l.childrenMid ?? 0) + (l.childrenSmall ?? 0) + bebes;
    const quienes = esVeh
      ? "Precio por vehículo · gasolina, equipo y guía incluidos"
      : [
          l.adults > 0 ? `${l.adults} adulto${l.adults !== 1 ? "s" : ""}` : "",
          (l.childrenMid ?? 0) > 0 ? `${l.childrenMid} niño${l.childrenMid !== 1 ? "s" : ""} (6-10)` : "",
          (l.childrenSmall ?? 0) > 0 ? `${l.childrenSmall} niño${l.childrenSmall !== 1 ? "s" : ""} (4-7, 50 %)` : "",
          bebes > 0 ? `${bebes} bebé${bebes !== 1 ? "s" : ""} (0-3, gratis)` : "",
        ].filter(Boolean).join(" · ");
    // Lo que eligió el cliente (Ruta Acuática) y, si suma, por qué cuesta más.
    const opcion   = opcionDeEleccion(TOURS_LISTA.find(t => t.slug === l.tourSlug) ?? {}, l.eleccion);
    const eleccion = opcion
      ? `Elección: ${opcion.nombre}${opcion.extraPorPersona ? ` (+$${opcion.extraPorPersona.toLocaleString("es-MX")} por persona, incluido)` : ""}`
      : (l.eleccion ? `Elección: ${l.eleccion}` : "");
    return {
      nombre: l.tourName,
      subs: [quienes, eleccion].filter(Boolean),
      // La actividad opcional se cobra dentro de este renglón: si no se nombra,
      // el cliente ve un importe más alto que el precio del tour sin explicación.
      opcionales: addOnsDeTour(l.tourSlug)
        .map(a => ({ a, n: cantidadAddOn(l, a.id) }))
        .filter(x => x.n > 0)
        .map(({ a, n }) => `+ ${a.nombre} · ${n} ${n === 1 ? "persona" : "personas"} · $${(a.precio * n).toLocaleString("es-MX")}`),
      fecha: l.tourDate ? new Date(l.tourDate + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short" }) : "—",
      cantidad: esVeh ? `${un} veh.` : String(total),
      importe: calcTourLine(l),
    };
  });
  const renglonesHosp: RenglonCotizacion[] = pkgs.map(p => ({
    nombre: `Hospedaje · ${p.noches} noche${p.noches !== 1 ? "s" : ""}`,
    subs: [`${p.hotel} — ${p.habitacion}${p.huespedes ? ` · ${p.huespedes} ${p.huespedes === 1 ? "persona" : "personas"} por habitación` : ""}`],
    opcionales: [],
    fecha: [p.checkin ? fDateDoc(p.checkin) : "", p.checkout ? fDateDoc(p.checkout) : ""].filter(Boolean).join(" → "),
    cantidad: `${p.habitaciones} hab.`,
    importe: calcPackageLine(p),
  }));
  const renglonesExtra: RenglonCotizacion[] = extrasCobrados(extrasQ).map(ex => ({
    nombre: ex.concepto,
    subs: [ex.detalle || "Servicio adicional contratado"],
    opcionales: [],
    fecha: "—",
    cantidad: String(ex.cantidad),
    importe: calcExtraLine(ex),
  }));

  return {
    folio: q.quoteNumber,
    emitida: fmt(hoy),
    vigencia: fmt(vigDate),
    vigenciaLabel: (VIGENCIAS[meta.vigencia ?? ""] ?? VIGENCIAS["7dias"]).label,
    cliente: { nombre: q.customerName, telefono: q.customerPhone ?? "", email: q.customerEmail ?? "", notas: q.notes ?? "" },
    personas: numPersonas,
    desglosePersonas: grupoLargo(grupoQ),
    fechaInicio: fDateDoc(fechaInicio),
    fechaFin: fDateDoc(fechaFin),
    duracionDias: Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1),
    hospedaje: pkgs.length ? (pkgs[0].hotel ?? "") : "No incluye",
    recogida,
    renglones: [...renglonesTour, ...renglonesHosp, ...renglonesExtra],
    toursTotal,
    pkgsTotal,
    extrasTotal,
    ajuste: desglose.ajuste,
    descuento: desglose.descuento,
    total: q.totalAmount,
    anticipo: desglose.anticipo,
    anticipoPct: desglose.anticipoPct,
    saldo: desglose.saldo,
    siIncluye: [traslado, ...incluyeDeCotizacion(toursCotizados), ...extrasIncluidos(extrasQ).map(ex => `${ex.concepto}${ex.detalle ? ` — ${ex.detalle}` : ""}`)],
    noIncluye: ["Vuelos o transporte a Xilitla", "Comidas y cenas", "Actividades opcionales", "Propinas", "Bebidas alcohólicas", "Gastos personales"],
    cancelacion,
  };
}
