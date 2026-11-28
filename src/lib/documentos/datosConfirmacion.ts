/**
 * Los DATOS de la confirmación de una reserva (HP-M-…), sin formato.
 *
 * 27 nov 2026: salieron de `htmlConfirmacion.ts` para que el HTML (el que
 * imprime el bot con Chromium) y el PDF que arma el servidor
 * (`pdf/PdfConfirmacion.tsx`, el que descarga el panel) digan exactamente lo
 * mismo. Aquí NO se escapa nada: el texto va crudo y quien lo pinta en HTML lo
 * escapa; el PDF no lo necesita.
 */
import type { TourBooking } from "@prisma/client";
import { cobradoDe } from "@/lib/admin/dinero";
import { TOURS_LISTA, recogidaDeTour, salidaCorta, partesRecogida } from "@/lib/tours";
import type { LineItem, PackageItem } from "@/components/admin/ReservaModal";
import { addOnsDeTour, cantidadAddOn } from "@/lib/admin/lineasPrecio";
import { grupoDe, grupoLargo } from "@/lib/admin/reserva";
import { extrasDe, calcExtraLine } from "@/lib/admin/extras";
import { pickupConDato } from "@/lib/admin/hospedaje";

export const fDateDoc = (d: string) => d ? new Date(d + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "—";

/** Un trozo de texto con o sin negritas (para no meter HTML en los datos). */
export interface Trozo { texto: string; fuerte?: boolean }

export interface DiaConfirmacion {
  num: string;
  nombre: string;
  fecha: string;
  /** «9 h», o vacío si no hay recorrido del catálogo. */
  duracion: string;
  dificultad: string;
  /** «Salto en cuerda · 2 personas». */
  opcionales: string[];
  /** «Recogida» o «Encuentro». */
  etiqueta: string;
  hora: string;
  donde: string;
}

export interface EstanciaConfirmacion {
  habitacion: string;
  hotel: string;
  habitaciones: string;
  noches: string;
  fechas: string;
}

export interface ExtraConfirmacion {
  concepto: string;
  detalle: string;
  cantidad: number;
  /** «Incluido» o «$1,200». */
  monto: string;
  incluido: boolean;
}

export interface DatosConfirmacion {
  folio: string;
  cliente: string;
  confirmadaEl: string;
  nTours: number;
  tourResumen: string;
  fechas: string;
  personas: number;
  desglosePersonas: string;
  total: number;
  deposito: number;
  pendiente: number;
  metodoPago: string;
  /** Vacío si es un id de Stripe o algo largo que no le sirve al cliente. */
  folioPago: string;
  dias: DiaConfirmacion[];
  estancias: EstanciaConfirmacion[];
  extras: ExtraConfirmacion[];
  cancelacion: Trozo[];
}

const DIFIC: Record<string, string> = { baja: "Fácil", media: "Moderada", alta: "Difícil" };

export function datosConfirmacion(b: TourBooking): DatosConfirmacion {
  const rawLines   = (b as any).lineItems as any[] | null;
  const meta       = rawLines?.find((l: any) => l._meta) || {};
  const cleanLines = rawLines?.filter((l: any) => !l._meta);
  const lines: LineItem[] = cleanLines?.length
    // Sin desglose (renglón viejo) los menores se leen como el tramo de antes; con
    // bebés o niños de 4 a 7 guardados, `children` ya no se reparte.
    ? cleanLines.map((l: any) => ({ ...l, childrenMid: l.childrenMid ?? (l.childrenSmall === undefined && l.infants === undefined ? (l.children ?? 0) : 0), childrenSmall: l.childrenSmall ?? 0 }))
    : [{ tourSlug: b.tourSlug, tourName: b.tourName, tourDate: b.tourDate, adults: b.adults, childrenMid: b.children ?? 0, childrenSmall: 0, subtotal: b.totalAmount }];

  const pkgs: PackageItem[] = (b as any).packageItems ?? [];
  const rawDeposito = (b as any).depositoPagado ?? 0;
  // Pago online por Stripe = liquidado al 100% aunque no tenga anticipo registrado.
  const deposito   = rawDeposito > 0 ? rawDeposito : cobradoDe(b as any);
  const pendiente  = Math.max(0, b.totalAmount - deposito);
  // 27 nov 2026 (Manolo): con liga de pago el folio era el id de la sesión de
  // Stripe («cs_live_a0I4…», 66 letras sin espacios). No le sirve al cliente,
  // le quitaba protagonismo a los tours y, al no poder partirse, ensanchaba la
  // columna de Pago hasta aplastar el itinerario. Un id de Stripe no se pinta;
  // un folio corto (transferencia, OXXO) sí.
  const folioCrudo = String(meta.folioPago ?? "").trim();
  const folioPago  = /^(cs|pi|ch|py|pm|in)_(live|test)_/i.test(folioCrudo) || folioCrudo.length > 24 ? "" : folioCrudo;
  // 18 nov 2026: el hotel se pide DESPUÉS del pago. Sin uno anotado ya no
  // dice «Lobby de tu hotel en Xilitla» (le llegaba a quien dormía en Valles).
  const pickupLugar = pickupConDato(meta.pickupLugar) || "Tu hotel · mándanos su nombre por WhatsApp";

  const tourDates  = lines.map(l => l.tourDate).filter(Boolean).sort();
  const checkouts  = pkgs.map(p => p.checkout).filter(Boolean).sort();
  const fechaInicio = tourDates[0] || b.tourDate;
  const fechaFin   = checkouts.length ? checkouts[checkouts.length - 1] : tourDates[tourDates.length - 1] || b.tourDate;
  // Tamaño REAL del grupo, desglosado en adultos y niños (ver lib/admin/reserva).
  const grupo       = grupoDe(b as any);
  const numPersonas = Number(meta.numPersonas) > 0 ? Number(meta.numPersonas) : grupo.total;

  // 🔴 El Edén no se reembolsa (`cancelacion` en tours.ts). El recuadro de
  // Cancelación decía "Gratis hasta 48 h antes" en todos los vouchers, y el
  // voucher es justo el papel que el cliente enseña al pedir su dinero.
  const toursVoucher   = lines.map(l => TOURS_LISTA.find(t => t.slug === l.tourSlug));
  const cancelPropias  = toursVoucher
    .filter((t, n) => !!t?.cancelacion && toursVoucher.findIndex(x => x?.slug === t?.slug) === n);
  const todasPropias   = cancelPropias.length > 0 && toursVoucher.every(t => t?.cancelacion);
  const cancelacion: Trozo[] = todasPropias
    ? [{ texto: cancelPropias.map(t => t!.cancelacion!.es).join(" ") }]
    : [
        { texto: "Gratis", fuerte: true },
        { texto: " hasta 48 h antes del primer tour. Después aplica cargo del 50%. Fuerza mayor: reagendamos sin costo." },
        ...cancelPropias.flatMap(t => [{ texto: ` ${t!.nombreCorto}:`, fuerte: true }, { texto: ` ${t!.cancelacion!.es}` }]),
      ];

  const dias: DiaConfirmacion[] = lines.map((l, i) => {
    const t    = TOURS_LISTA.find(t => t.slug === l.tourSlug);
    // 🔴 La hora y el lugar salen del recorrido. Aquí decía "09:00" para
    // todos: el voucher de la Gruta de Xilo (7 PM) citaba al cliente de
    // mañana. El horario fijo del Edén cambia según el día: "Por confirmar".
    const rec    = t ? recogidaDeTour(t) : null;
    const hora   = !t ? "Por acordar" : rec?.horaTexto ? "Por confirmar" : (salidaCorta(t) ?? "Por acordar");
    // Sin recogida (RZR en nuestra base, buceo en la laguna) el "dónde" es el
    // punto de encuentro del catálogo, no el hotel del cliente.
    const encuentro = !!t && (rec?.tipo === "base-xilitla" || rec?.tipo === "en-sitio");
    const lugarEnc  = encuentro && t ? partesRecogida(t, false).lugar : "";
    return {
      num: String(i + 1).padStart(2, "0"),
      nombre: l.tourName,
      fecha: l.tourDate ? new Date(l.tourDate + "T12:00:00").toLocaleDateString("es-MX", { weekday: "short", day: "2-digit", month: "short" }) : "—",
      duracion: t ? `${t.duracion_hrs} h` : "",
      dificultad: t ? (DIFIC[t.dificultad] || t.dificultad) : "",
      opcionales: addOnsDeTour(l.tourSlug)
        .map(a => ({ a, n: cantidadAddOn(l, a.id) }))
        .filter(x => x.n > 0)
        .map(({ a, n }) => `${a.nombre} · ${n} ${n === 1 ? "persona" : "personas"}`),
      etiqueta: encuentro ? "Encuentro" : "Recogida",
      hora,
      donde: encuentro ? lugarEnc.charAt(0).toUpperCase() + lugarEnc.slice(1) : pickupLugar,
    };
  });

  const noche = (n: number) => `${n} noche${n !== 1 ? "s" : ""}`;
  const estancias: EstanciaConfirmacion[] = pkgs.map(p => {
    const ci = p.checkin  ? fDateDoc(p.checkin)  : "";
    const co = p.checkout ? fDateDoc(p.checkout) : "";
    const nHab = p.habitaciones ?? 1;
    return {
      habitacion: p.habitacion,
      hotel: p.hotel ?? "",
      habitaciones: `${nHab} ${nHab === 1 ? "habitación" : "habitaciones"}`,
      noches: noche(p.noches),
      fechas: ci && co ? `${ci} → ${co}` : (ci || co || ""),
    };
  });

  // Extras contratados (comida, transporte, guía privado). El cliente ve el
  // concepto y su importe; lo que a nosotros nos costó NO sale del panel.
  const extras: ExtraConfirmacion[] = extrasDe((b as any).extraItems).map(ex => {
    const cobro = calcExtraLine(ex);
    const incluido = ex.incluido || cobro === 0;
    return { concepto: ex.concepto, detalle: ex.detalle ?? "", cantidad: ex.cantidad, incluido, monto: incluido ? "Incluido" : `$${cobro.toLocaleString("es-MX")}` };
  });

  return {
    folio: b.confirmationNumber,
    cliente: b.customerName,
    confirmadaEl: new Date(b.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" }),
    nTours: lines.length,
    // Resumen de arriba: NO repetir los nombres (el itinerario de abajo ya los lista).
    tourResumen: lines.length > 1 ? `${lines.length} tours` : (lines[0]?.tourName || b.tourName),
    fechas: `${fDateDoc(fechaInicio)} al ${fDateDoc(fechaFin)}`,
    personas: numPersonas,
    desglosePersonas: grupoLargo(grupo),
    total: b.totalAmount,
    deposito,
    pendiente,
    metodoPago: String(meta.metodoPago ?? "") || "—",
    folioPago,
    dias,
    estancias,
    extras,
    cancelacion,
  };
}
