// Reserva → días de tour → salidas.
//
// Una reserva (`TourBooking`) puede traer varios tours en `lineItems`, cada uno
// con su fecha: cada renglón es un DÍA DE TOUR. Una SALIDA es la combinación
// tour + fecha: dos reservas de Tamul el mismo día son UNA salida (una
// camioneta, un guía, un costo fijo). Por eso en noviembre de 2026 el
// calendario decía «31 salidas» cuando eran 20 reservas, 31 días de tour y 27
// salidas reales (línea base del 3 nov 2026).
//
// Puro (sin Prisma): lo usan el calendario, el scorecard, la rentabilidad y el
// script de conciliación, y se prueba en `__tests__/salidas.test.ts`.

import { TOURS_LISTA } from "@/lib/tours";
import { codigoDeTour } from "./coloresTour";
import { resumirCostos, type ConceptoCosto } from "./costos";
import { grupoDe, lineasDe, type ConLineas } from "./reserva";

/** Lo que hace falta de una reserva para sacar sus días de tour. */
export type ReservaParaSalidas = ConLineas & {
  confirmationNumber: string;
  tourDate: string;
  tourSlug: string;
  tourName: string;
  totalAmount: number;
  customerName?: string;
};

export interface DiaDeTour {
  folio: string;
  fecha: string;
  slug: string;
  nombre: string;
  personas: number;
  /** Lo registrado en ese renglón (sin hotel ni extras). */
  monto: number;
  cliente: string;
}

export interface SalidaAgrupada {
  clave: string;
  fecha: string;
  slug: string;
  codigo: string;
  nombre: string;
  personas: number;
  reservas: number;
  folios: string[];
  clientes: string[];
  monto: number;
  /** RZR, buceo y salidas a medida: no llevan meta de personas. */
  aMedida: boolean;
}

/** Los tours que se venden a medida y no llevan meta de personas (prompt del 3 nov 2026). */
export const SLUGS_A_MEDIDA = new Set(["rzr-xilitla", "buceo-media-luna", "__personalizado", ""]);

/** Con 2 personas o menos un tour regular queda «Bajo mínimo». */
export const MINIMO_RENTABLE = 3;

export const esAMedida = (slug: string) => SLUGS_A_MEDIDA.has(slug) || codigoDeTour(slug) === "OTR";

/** Misma cuenta de personas que el Calendario y el cupo: `children` trae los dos tramos juntos. Crudo: 0 en un renglón por vehículo. */
function personasCrudas(l: Record<string, unknown>): number {
  return (Number(l.adults) || 0)
    + Math.max(Number(l.children) || 0, (Number(l.childrenMid) || 0) + (Number(l.childrenSmall) || 0));
}

/**
 * Qué tour es un renglón dentro de su reserva, igual que el corte
 * (`corteSalidas.ts`): por su slug; los personalizados y los conceptos sin
 * tour, por su nombre (dos personalizados distintos no son el mismo tour).
 */
const tourDelRenglon = (slug: string, nombre: string) =>
  slug && slug !== "__personalizado" ? slug : `${slug || "concepto"}:${nombre.trim().toLowerCase()}`;

/** Los días de tour de una reserva: uno por tour y fecha; sin renglones, el tour principal. */
export function diasDeTourDe(b: ReservaParaSalidas): DiaDeTour[] {
  const lineas = lineasDe(b).filter(l => !!l.tourDate) as Array<Record<string, unknown> & { tourDate: string }>;
  const cliente = b.customerName ?? "";
  if (lineas.length > 0) {
    // 🔴 Dos renglones del mismo tour el mismo día (un vehículo por renglón en
    // el RZR) son UN día de tour, como una tarjeta del corte (lote 6, 10 nov
    // 2026). Antes cada renglón valía el grupo entero: un grupo de 4 en dos
    // vehículos salía de 8 (o en dos salidas de 4), el cliente dos veces en la
    // lista, su saldo dos veces y los costos del corte al doble. Las personas
    // se suman crudas y, si dan 0 (por vehículo), el grupo cuenta UNA vez.
    const porTour = new Map<string, DiaDeTour>();
    for (const l of lineas) {
      const fecha = String(l.tourDate);
      // Un renglón sin tour en un carrito de varios es un concepto (traslado,
      // algo cobrado a mano) y no hereda el tour; con un solo renglón sí (son
      // reservas viejas que no guardaban el slug en el renglón).
      const slug = String(l.tourSlug || (lineas.length === 1 ? b.tourSlug : ""));
      const nombre = String(l.tourName || b.tourName || "");
      const monto = l.subtotal != null ? Number(l.subtotal) : b.totalAmount;
      const k = `${fecha}|${tourDelRenglon(slug, nombre)}`;
      const ya = porTour.get(k);
      if (ya) { ya.personas += personasCrudas(l); ya.monto += monto; continue; }
      porTour.set(k, { folio: b.confirmationNumber, fecha, slug, nombre, personas: personasCrudas(l), monto, cliente });
    }
    return Array.from(porTour.values()).map(d => (d.personas > 0 ? d : { ...d, personas: grupoDe(b).total }));
  }
  return [{
    folio: b.confirmationNumber, fecha: b.tourDate, slug: b.tourSlug, nombre: b.tourName,
    personas: grupoDe(b).total, monto: b.totalAmount, cliente,
  }];
}

/**
 * La clave de la salida a la que pertenece un día de tour: tour + fecha. Una
 * salida a medida o un renglón sin tour se distingue además por su nombre: dos
 * «personalizados» distintos el mismo día NO son la misma camioneta.
 */
export function claveDeSalida(d: Pick<DiaDeTour, "fecha" | "slug" | "nombre">): string {
  const base = `${d.fecha}|${d.slug}`;
  return esAMedida(d.slug) ? `${base}|${d.nombre.trim().toLowerCase()}` : base;
}

/** Los días de tour agrupados en salidas, en orden de fecha. */
export function agruparSalidas(dias: DiaDeTour[]): SalidaAgrupada[] {
  const porClave = new Map<string, SalidaAgrupada>();
  for (const d of dias) {
    const clave = claveDeSalida(d);
    let s = porClave.get(clave);
    if (!s) {
      s = {
        clave, fecha: d.fecha, slug: d.slug, codigo: codigoDeTour(d.slug), nombre: d.nombre,
        personas: 0, reservas: 0, folios: [], clientes: [], monto: 0, aMedida: esAMedida(d.slug),
      };
      porClave.set(clave, s);
    }
    s.personas += d.personas;
    s.monto += d.monto;
    if (!s.folios.includes(d.folio)) { s.folios.push(d.folio); s.reservas++; }
    if (d.cliente && !s.clientes.includes(d.cliente)) s.clientes.push(d.cliente);
  }
  return Array.from(porClave.values()).sort((a, b) => a.clave.localeCompare(b.clave));
}

export interface ResumenSalidas {
  reservas: number;
  diasDeTour: number;
  salidas: number;
  /** Personas ÷ salidas, con un decimal. */
  paxPorSalida: number;
  /** Salidas regulares (con meta) de `MINIMO_RENTABLE − 1` personas o menos. */
  regularesBajoMinimo: number;
  regulares: number;
}

/** Los números de un conjunto de días de tour (un mes, una semana). */
export function resumirSalidas(dias: DiaDeTour[]): ResumenSalidas {
  const salidas = agruparSalidas(dias);
  // El Edén (privada de catálogo) tampoco lleva meta de personas (lote 6, 10 nov 2026).
  const regulares = salidas.filter(s => !s.aMedida && !esPrivadaDeCatalogo(s.slug));
  const personas = salidas.reduce((t, s) => t + s.personas, 0);
  return {
    reservas: new Set(dias.map(d => d.folio)).size,
    diasDeTour: dias.length,
    salidas: salidas.length,
    paxPorSalida: salidas.length ? Math.round((personas / salidas.length) * 10) / 10 : 0,
    regularesBajoMinimo: regulares.filter(s => s.personas < MINIMO_RENTABLE).length,
    regulares: regulares.length,
  };
}

/** Los días de tour de varias reservas que caen en un rango YYYY-MM-DD (inclusive). */
export function diasEnRango(reservas: ReservaParaSalidas[], desde: string, hasta: string): DiaDeTour[] {
  return reservas.flatMap(diasDeTourDe).filter(d => d.fecha >= desde && d.fecha <= hasta);
}

/**
 * ¿Todas las salidas de la reserva ese día están marcadas «Cancelada»?
 * (revisión del lote 6, 10 nov 2026). Entonces no se le manda el check-in de
 * ese día: Operación ya tiene el seguimiento para avisarle y reprogramar o
 * reembolsar.
 */
export function diaConTodoCancelado(b: ReservaParaSalidas, fecha: string, canceladas: Set<string>): boolean {
  const delDia = diasDeTourDe(b).filter(d => d.fecha === fecha);
  return delDia.length > 0 && delDia.every(d => canceladas.has(claveDeSalida(d)));
}

/**
 * El primer día de tour de una reserva entre dos fechas cuya salida no esté
 * cancelada, o null (revisión del lote 6, 10 nov 2026). Inicio leía solo
 * `tourDate` (el primer tour del carrito): el 2.º tour no salía en «Tours de
 * hoy» y el de una salida cancelada sí.
 */
export function primerDiaVivoEntre(b: ReservaParaSalidas, desde: string, hasta: string, canceladas: Set<string>): string | null {
  return diasDeTourDe(b).filter(d => d.fecha >= desde && d.fecha <= hasta && !canceladas.has(claveDeSalida(d))).map(d => d.fecha).sort()[0] ?? null;
}

// ── Salidas fijas, estado y números (PR 1.2, 3 nov 2026) ─────────────────────


// Salidas fijas: NO (Manolo, 3 nov 2026). «Nuestras salidas son a partir de dos
// personas, por lo que casi siempre podemos salir»: no hay días fijos a la
// venta sin reserva. «Bajo mínimo» queda solo como aviso de rentabilidad.

// Dos mínimos distintos (lote 6, 10 nov 2026): el del TOUR (`groupMin` del
// catálogo: rafting 5, rappel 4) dice si la salida corre; el de RENTABILIDAD
// (`MINIMO_RENTABLE`, 3) es solo un aviso de margen. Antes solo existía el
// segundo: un rafting de 4 salía «En meta» y nadie veía que no corría.
export type EstadoSalida = "en-meta" | "bajo-minimo" | "no-llega" | "lleno" | "a-medida" | "privada";

export const ETIQUETA_ESTADO_SALIDA: Record<EstadoSalida, string> = {
  "en-meta": "En meta", "bajo-minimo": "Bajo mínimo", "no-llega": "No llega al mínimo", lleno: "Lleno", "a-medida": "A medida", privada: "Privada",
};

const tourDeCatalogo = (slug: string) => TOURS_LISTA.find(t => t.slug === slug);

/**
 * El mínimo de personas para que el tour corra (su `groupMin`), o null si el
 * tour no lo trae o es de 1–2: con las salidas «a partir de 2 personas»
 * (Manolo, 3 nov 2026) eso no genera aviso.
 */
export function minimoDelTour(slug: string): number | null {
  const m = Number(tourDeCatalogo(slug)?.groupMin) || 0;
  return m >= MINIMO_RENTABLE ? m : null;
}

/**
 * Experiencia privada de UNA salida al día, con precio por grupo (el Edén en el
 * Jardín): ni «Bajo mínimo» ni «Juntar salidas» (lote 6, 10 nov 2026). Misma
 * regla que `esPrivadaDelDia` de `cupoTour.ts`.
 */
export function esPrivadaDeCatalogo(slug: string): boolean {
  return tourDeCatalogo(slug)?.precioUnidad === "grupo";
}

/** El mínimo con que «Juntar salidas» busca pareja: el del tour si pasa del de rentabilidad. */
export function minimoParaJuntar(slug: string): number {
  return Math.max(MINIMO_RENTABLE, minimoDelTour(slug) ?? 0);
}

/**
 * Privada (Edén) y a medida sin meta; lleno al cupo; «No llega al mínimo» por
 * debajo del mínimo del tour (no corre así); «Bajo mínimo» con 2 o menos (solo
 * rentabilidad); en meta lo demás.
 */
export function estadoDeSalida(s: Pick<SalidaAgrupada, "personas" | "aMedida"> & { slug?: string }, cupo: number | null): EstadoSalida {
  if (s.aMedida) return "a-medida";
  if (s.slug && esPrivadaDeCatalogo(s.slug)) return "privada";
  if (cupo !== null && s.personas >= cupo) return "lleno";
  const minimo = s.slug ? minimoDelTour(s.slug) : null;
  if (minimo !== null && s.personas < minimo) return "no-llega";
  return s.personas >= MINIMO_RENTABLE ? "en-meta" : "bajo-minimo";
}

/** ¿Cuenta como «bajo mínimo» de rentabilidad (2 o menos) en los KPIs? Aunque además no llegue al del tour. */
export function bajoMinimoRentable(s: Pick<SalidaAgrupada, "personas" | "aMedida" | "slug">): boolean {
  return !s.aMedida && !esPrivadaDeCatalogo(s.slug) && s.personas < MINIMO_RENTABLE;
}

// ── El registro de la salida: estado, guía, cobro en sitio (lote 6, 10 nov 2026) ──

/** Una salida marcada «Cancelada» no cuenta en Salidas del día, Inicio, el correo, las confirmaciones ni los KPIs. */
export const salidaCancelada = (estado: string | null | undefined) => estado === "cancelada";

/** ¿Ya se operó? La fecha pasó, o Operación la marcó «Operada» (cuenta desde ese momento, aunque sea hoy). */
export const salidaYaOperada = (s: { fecha: string; estado?: string | null }, hoy: string) =>
  s.estado === "operada" || s.fecha < hoy;

export type PagoPasajero = "pagado" | "ota" | "saldo" | "saldo-otro-dia";

/**
 * Qué hace el guía con el dinero de un pasajero en ESTA salida. 🔴 El saldo se
 * cobra en sitio solo el PRIMER día del viaje (lote 6, 10 nov 2026): una
 * reserva de tres tours salía «cobrar $X» en las tres salidas, y el guía del
 * segundo día volvía a cobrar lo que ya se cobró el primero sin registrarse.
 * Sin saldo no se cobra nada; el de una OTA lo cobra la plataforma.
 */
export function pagoEnSalida(p: { saldo: number; canal: string; fecha: string; primerDia: string }): PagoPasajero {
  if (!(p.saldo > 0)) return "pagado";
  if (p.canal === "ota") return "ota";
  return p.fecha === p.primerDia || !p.primerDia ? "saldo" : "saldo-otro-dia";
}

export interface GuiaDeSalida {
  /** El guía que sale: el de la salida o, si no tiene, el que comparten sus reservas. */
  guia: string;
  /** true = no está en la salida: viene de las reservas. */
  deReservas: boolean;
  /** Las reservas traen otro guía (o varios distintos). */
  aviso: string | null;
}

/**
 * Un solo guía por salida (lote 6, 10 nov 2026): manda el de la salida; si no
 * tiene, el que traen sus reservas, si todas dicen el mismo. Antes Salidas del
 * día, el correo de las 7:30 e Inicio decían «Sin guía asignado» aunque la
 * reserva ya lo tuviera, y el Calendario decía otro.
 */
export function guiaDeSalida(guiaSalida: string | null | undefined, reservas: { folio: string; guia: string | null | undefined; otrosDias?: boolean }[]): GuiaDeSalida {
  const propio = (guiaSalida ?? "").trim();
  const conGuia = reservas.map(r => ({ folio: r.folio, guia: (r.guia ?? "").trim(), otrosDias: !!r.otrosDias })).filter(r => r.guia);
  const igual = (a: string, b: string) => a.toLocaleLowerCase("es") === b.toLocaleLowerCase("es");
  if (propio) {
    const otros = conGuia.filter(r => !igual(r.guia, propio));
    // La de un viaje de varios días trae el guía de sus otros días: guardar
    // aquí no se lo cambia (`reservasQueTomanElGuia`, revisión 10 nov 2026).
    const corregibles = otros.filter(r => !r.otrosDias);
    return {
      guia: propio, deReservas: false,
      aviso: otros.length
        ? `Ojo: ${otros.map(r => `la reserva ${r.folio} dice ${r.guia}${r.otrosDias ? " (es su guía de los otros días del viaje)" : ""}`).join(", ")}.${corregibles.length ? " Guarda el guía aquí y se corrige." : ""}`
        : null,
    };
  }
  const distintos = conGuia.filter((r, i) => conGuia.findIndex(x => igual(x.guia, r.guia)) === i);
  if (distintos.length === 1) return { guia: distintos[0].guia, deReservas: true, aviso: null };
  if (distintos.length > 1) {
    return { guia: "", deReservas: false, aviso: `Las reservas traen guías distintos (${conGuia.map(r => `${r.guia} en ${r.folio}`).join(", ")}): asigna uno aquí y se escribe en ${conGuia.some(r => r.otrosDias) ? "las de un solo día (las de varios días conservan el de sus otros días)" : "todas"}.` };
  }
  return { guia: "", deReservas: false, aviso: null };
}

/**
 * A qué reservas se les escribe el guía que se guarda en una salida
 * (revisión del lote 6, 10 nov 2026). Las que solo tienen ESTA salida,
 * siempre. Las de un viaje de varios días (o dos tours el mismo día) tienen un
 * solo campo de guía para todo el viaje: se escribe solo si no tienen guía o
 * traen el que tenía esta salida; si traen otro, es el de sus otros días y no
 * se pisa (antes, poner a Juan el día 2 cambiaba a Pedro por Juan el día 1 y
 * el 3, que lo tomaban de la reserva).
 */
export function reservasQueTomanElGuia<R extends { guia: string | null | undefined; otrosDias?: boolean }>(
  reservas: R[], guiaAnteriorDeLaSalida: string | null | undefined,
): R[] {
  const norm = (g: string | null | undefined) => (g ?? "").trim().toLocaleLowerCase("es");
  const anterior = norm(guiaAnteriorDeLaSalida);
  return reservas.filter(r => !r.otrosDias || !norm(r.guia) || (!!anterior && norm(r.guia) === anterior));
}

/** Lo mínimo de un registro guardado (`Salida`) para reconocerlo. */
export interface RegistroParaEmparejar { id: string; clave: string; fecha: string; tourSlug: string; folios?: unknown; estado?: string | null }

const foliosDe = (r: RegistroParaEmparejar): string[] => (Array.isArray(r.folios) ? r.folios.filter((f): f is string => typeof f === "string") : []);

/**
 * El registro de cada salida (guía, vehículo, checklist, incidencias). 🔴 Si
 * su clave cambió (se renombró el tour a medida, cambió el vehículo del RZR) el
 * registro ya no se encontraba y se perdía (lote 6, 10 nov 2026). Ahora, sin
 * uno con su clave, se toma el que se quedó huérfano el MISMO día y del MISMO
 * tour: el que comparte reservas con ella o, si no guardó sus reservas (los de
 * antes), el único huérfano cuando es la única salida sin registro de ese tour
 * ese día. Un cambio de fecha NO se lleva el registro: lo marcado era de ese día.
 */
export function emparejarRegistros<R extends RegistroParaEmparejar>(
  salidas: { clave: string; fecha: string; slug: string; folios: string[] }[],
  registros: R[],
): Map<string, R> {
  const out = new Map<string, R>();
  const vivas = new Set(salidas.map(s => s.clave));
  for (const s of salidas) {
    const r = registros.find(x => x.clave === s.clave);
    if (r) out.set(s.clave, r);
  }
  const tomados = new Set(Array.from(out.values()).map(r => r.id));
  const huerfanos = () => registros.filter(r => !vivas.has(r.clave) && !tomados.has(r.id));
  const sinRegistro = () => salidas.filter(s => !out.has(s.clave));
  // 1) Por sus reservas.
  for (const s of sinRegistro()) {
    const cands = huerfanos().filter(r => r.fecha === s.fecha && r.tourSlug === s.slug && foliosDe(r).some(f => s.folios.includes(f)));
    if (cands.length === 1) { out.set(s.clave, cands[0]); tomados.add(cands[0].id); }
  }
  // 2) Los que no guardaron sus reservas: solo si no hay duda (uno y uno).
  // 🔴 Nunca uno «Cancelado» (revisión 10 nov 2026): sin folios no se sabe de
  // quién era; si su reserva se canceló y otra del mismo tour cae ese día, la
  // salida de esa otra quedaba cancelada y desaparecía de todas partes.
  for (const s of sinRegistro()) {
    const pares = sinRegistro().filter(x => x.fecha === s.fecha && x.slug === s.slug);
    const cands = huerfanos().filter(r => r.fecha === s.fecha && r.tourSlug === s.slug && foliosDe(r).length === 0 && !salidaCancelada(r.estado));
    if (pares.length === 1 && cands.length === 1) { out.set(s.clave, cands[0]); tomados.add(cands[0].id); }
  }
  return out;
}

/**
 * Los números de la ficha de la salida (lote 6, 10 nov 2026): «Números de la
 * salida» son los del servidor (`numeros`: los costos reales del corte cuando
 * los hay); los conceptos del Cotizador solo alimentan el simulador «¿Y si
 * fueran…?». Antes la ficha recalculaba con el Cotizador y decía «Costos
 * reales del corte» encima de un margen estimado.
 */
export function numerosDeFicha(s: { numeros: NumerosSalida; conceptos: ConceptoCosto[]; precioPorPax: number }) {
  return {
    numeros: s.numeros,
    simulacion: s.precioPorPax > 0 ? simularMargen(s.precioPorPax, s.conceptos, 6) : [],
    simulacionConCostos: s.conceptos.length > 0,
  };
}

export interface NumerosSalida {
  ingreso: number;
  pax: number;
  costoFijo: number;
  costoPorPax: number;
  costos: number;
  /** Ingreso − costos (sin comisiones: esas se descuentan en el corte). */
  margen: number;
  /** % sobre el ingreso; 0 sin ingreso. */
  margenPct: number;
  /** La mitad del margen: lo de cada socio en un tour 50/50. */
  parteSocio: number;
  /** Falso cuando el tour no tiene costos capturados: el margen es un techo. */
  conCostos: boolean;
}

/** Los números de una salida con los costos del Cotizador (fijos por salida + por persona). */
export function numerosDeSalida(ingreso: number, pax: number, conceptos: ConceptoCosto[]): NumerosSalida {
  const { fijo, porPersona } = resumirCostos(conceptos);
  const costos = fijo + porPersona * Math.max(0, pax);
  const margen = ingreso - costos;
  return {
    ingreso, pax, costoFijo: fijo, costoPorPax: porPersona, costos, margen,
    margenPct: ingreso > 0 ? Math.round((margen / ingreso) * 100) : 0,
    parteSocio: Math.floor(margen / 2),
    conCostos: conceptos.length > 0,
  };
}

/** El margen según cuánta gente va, de 1 a `hasta`, a un precio por persona. */
export function simularMargen(precioPorPax: number, conceptos: ConceptoCosto[], hasta = 6): NumerosSalida[] {
  const out: NumerosSalida[] = [];
  for (let pax = 1; pax <= hasta; pax++) out.push(numerosDeSalida(precioPorPax * pax, pax, conceptos));
  return out;
}
