"use client";

import { useState } from "react";
import { X, Plus, Check, BedDouble, ChevronRight, ChevronLeft, Pencil, EyeOff, MapPin } from "lucide-react";
import { TOURS_LISTA, tourPorNombre, cargoVallesDe, extraDeEleccion, opcionDeEleccion } from "@/lib/tours";
import { ID_TRASLADO_VALLES } from "@/lib/tourPricing";
import ExtrasEditor from "@/components/admin/ExtrasEditor";
import DescuentoEditor from "@/components/admin/DescuentoEditor";
import { montoDescuento, type Descuento, type EventoDescuento, type TipoDescuento } from "@/lib/admin/descuento";
import { type ExtraItem, type PresetExtra, EXTRAS_PRESET, totalExtras } from "@/lib/admin/extras";
import { grupoParaGuardar } from "@/lib/admin/reserva";
import { ajusteDeTotal, textoAjuste, totalConAjuste } from "@/lib/admin/precioPactado";
import { esConceptoSinTour, importeDeConcepto } from "@/lib/admin/reservaEdicion";
import { addDaysYMD, diffDiasYMD, hoyMX } from "@/lib/dates";
import { ORIGENES_ELEGIBLES, ORIGEN_ETIQUETA, origenValido, type OrigenReserva } from "@/lib/origenReserva";
import {
  HABITACIONES_PANEL, HABITACION_POR_DEFECTO, habitacionPanel, tarifaPanel, maxHuespedesPanel,
} from "@/lib/admin/habitacionesPanel";

const fmx = (n: number) => `$${n.toLocaleString("es-MX")} MXN`;

export interface LineItem {
  tourSlug:      string;
  tourName:      string;
  tourDate:      string;
  adults:        number;
  /** Tramo viejo 6–10 años al 70 %: solo reservas anteriores al 17 nov 2026 (`ninos.ts`). */
  childrenMid:   number;
  /** 4 a 7 años → 50 %. */
  childrenSmall: number;
  /** 0 a 3 años → gratis; ocupan lugar pero no cuentan para el mínimo ni el escalón. */
  infants?:      number;
  subtotal:      number;
  /** Solo tours cobrados POR VEHÍCULO (ej. RZR): ruta elegida, modelo y cuántas unidades. */
  ruta?:         string;
  vehiculo?:     string;
  unidades?:     number;
  /**
   * Actividades opcionales del recorrido (ej. el Salto de las 7 Cascadas en el
   * Paraíso Escalonado). El precio se relee SIEMPRE del catálogo al cobrar: lo
   * que se guarda aquí es un registro de lo que se contrató, no la tarifa.
   */
  addOns?:       LineaAddOn[];
  /**
   * SOLO en las líneas personalizadas (`tourSlug === SLUG_PERSONALIZADO`): el
   * precio por persona que se tecleó. En un recorrido del catálogo este campo
   * no existe, porque su precio se lee del catálogo y no se guarda nunca.
   */
  precioPersona?: number;
  /**
   * La opción elegida en un recorrido con `eleccion` (Ruta Acuática: «Hacienda
   * Los Gómez + Siete Cascadas» o «Cascadas de Tamasopo»). Se guarda el NOMBRE
   * en español, igual que en las reservas web, porque así lo pintan el correo,
   * el PDF y el detalle. Tamasopo suma $150 por persona (`extraDeEleccion`).
   */
  eleccion?:     string;
}

import {
  SLUG_PERSONALIZADO, esLineaPersonalizada, addOnsDeTour, cantidadAddOn, calcAddOnsLinea, calcTourLine, calcPackageLine,
} from "@/lib/admin/lineasPrecio";
// Viven en lib/admin/lineasPrecio (16 nov 2026) para que el servidor arme el
// mismo PDF que el panel; se reexportan aquí para no tocar a quien las importa.
export { SLUG_PERSONALIZADO, esLineaPersonalizada, addOnsDeTour, cantidadAddOn, calcAddOnsLinea, calcTourLine, calcPackageLine };

/**
 * ¿Se puede guardar esta línea? Concepto y fecha; y si es un concepto escrito a
 * mano, además su nombre: un renglón sin nombre sale en blanco en la cotización
 * del cliente y nadie sabe qué se le está cobrando.
 */
export function lineaCompleta(l: LineItem): boolean {
  if (!l.tourDate) return false;
  // El traslado desde otra ciudad que trae la web no tiene recorrido: vale con
  // su nombre y su fecha (lote 5, 5 nov 2026). Antes no dejaba guardar la
  // reserva si no se borraba ese renglón, y con él se iba lo cobrado.
  if (!l.tourSlug) return esConceptoSinTour(l);
  return !esLineaPersonalizada(l.tourSlug) || !!(l.tourName || "").trim();
}

export interface LineaAddOn {
  id:       string;
  nombre:   string;
  /** A cuántas personas del grupo se les suma. */
  cantidad: number;
  precio:   number;
  subtotal: number;
}


/**
 * Pone o quita el traslado desde Ciudad Valles en la línea. Solo hace algo en
 * los recorridos que lo cobran (`cargoValles`); en los demás Valles no cuesta más.
 */
export function conTrasladoValles(l: LineItem, desdeValles: boolean): LineItem {
  const cargo = cargoVallesDe(TOURS_LISTA.find(t => t.slug === l.tourSlug));
  const tiene = (l.addOns ?? []).some(a => a.id === ID_TRASLADO_VALLES);
  if (desdeValles === tiene || (desdeValles && cargo <= 0)) return l;
  const resto = (l.addOns ?? []).filter(a => a.id !== ID_TRASLADO_VALLES);
  const addOns = desdeValles
    ? [...resto, { id: ID_TRASLADO_VALLES, nombre: "Traslado desde Ciudad Valles", cantidad: 1, precio: cargo, subtotal: cargo }]
    : resto;
  const nueva = { ...l, addOns: addOns.length ? addOns : undefined };
  return { ...nueva, subtotal: calcTourLine(nueva) };
}

/** Pone (o quita) una actividad opcional en la línea, ya con su precio y subtotal. */
export function conAddOn(l: LineItem, id: string, cantidad: number): LineItem {
  const def = addOnsDeTour(l.tourSlug).find(a => a.id === id);
  if (!def) return l;
  const resto = (l.addOns ?? []).filter(a => a.id !== id);
  const n = Math.max(0, Math.round(cantidad) || 0);
  const addOns = n > 0
    ? [...resto, { id: def.id, nombre: def.nombre, cantidad: n, precio: def.precio, subtotal: def.precio * n }]
    : resto;
  return { ...l, addOns: addOns.length ? addOns : undefined };
}

/** Tour cobrado por vehículo (RZR): precio = matriz flota×ruta, NO por persona. */
export function esTourVehiculo(slug: string) {
  const t = TOURS_LISTA.find(t => t.slug === slug);
  return !!(t && t.precioUnidad === "vehiculo" && t.rutas && t.flota);
}

export interface PackageItem {
  habitacion:     string;
  hotel:          string;
  noches:         number;
  habitaciones:   number;
  precioPorNoche: number;
  checkin:        string;
  checkout:       string;
  subtotal:       number;
  /**
   * Cuánta gente duerme en CADA habitación de este renglón. Es lo que decide el
   * escalón de tarifa (hasta 2 personas cuesta una cosa, de 3 a 4 otra).
   *
   * Opcional a propósito: las cotizaciones y reservas guardadas antes de
   * septiembre de 2026 no lo traen, y se siguen leyendo con el precio por noche
   * que se les grabó en su día.
   */
  huespedes?:     number;
}

export interface ReservaFormState {
  customerName:   string;
  customerEmail:  string;
  customerPhone:  string;
  notes:          string;
  lines:          LineItem[];
  packages:       PackageItem[];
  /** Comida, transporte, guía privado… lo que va aparte del recorrido y del hotel. */
  extras:         ExtraItem[];
  /**
   * El precio pactado, como AJUSTE en pesos sobre lo que da la lista (ya con
   * el descuento): 0 = el precio de lista. 🔴 Era un «total editado» que se
   * borraba al tocar cualquier renglón, aunque fuera solo la fecha (lote 4, 5
   * nov 2026). Ver `lib/admin/precioPactado.ts`.
   */
  ajustePrecio:   number;
  /**
   * El descuento, aparte del total (Manolo, 20 oct 2026): así no se pierde al
   * cambiar un tour, un cuarto o un extra. `descuentoGuardado` e `historial` son
   * lo que ya está en el registro (sello y cambios); solo se leen.
   */
  descuentoTipo:      TipoDescuento;
  descuentoValor:     string;
  descuentoGuardado:  Descuento | null;
  descuentoHistorial: EventoDescuento[];
  /**
   * Código de cumpleaños (CUMPLE-XXXXX) que respalda el descuento, si lo trae.
   * Va a `_meta.codigoCumple`; el servidor lo marca como usado al guardar.
   */
  codigoCumple:   string;
  depositoPagado: string;
  metodoPago:     string;
  folioPago:      string;
  pickupLugar:    string;
  /**
   * De dónde sale el cliente (Manolo, 20 oct 2026): va a `_meta.zonaHospedaje`
   * y de ahí al Corte, que dice de dónde salió la Ruta Surrealista. Elegir
   * «Ciudad Valles» le suma su traslado. Vacío: no se ha dicho.
   */
  zona:           ZonaReserva;
  numPersonas:    string;  // tamaño real del grupo (para el email; evita sumar por tour)
  /** Por dónde entró: es COLUMNA de la base, no `_meta`, porque hay que agrupar por ella. */
  origen:         OrigenReserva | "";
  /** Quién sale a guiar. Vacío = sin asignar todavía. */
  guia:           string;
  /** En qué idioma sale el tour: "es" | "en". */
  idiomaTour:     string;
  /**
   * Lo que NO ve el cliente: el trato que se hizo, con quién hay que hablar,
   * por qué se le bajó el precio. No sale en el correo, ni en el PDF, ni en la
   * cotización que se le manda. Solo se lee desde el panel.
   */
  notasInternas:  string;
}

export type ZonaReserva = "" | "xilitla" | "valles";
/** Cómo se guarda en `_meta.zonaHospedaje`: lo mismo que «Nueva cotización». */
export const ZONA_TEXTO: Record<Exclude<ZonaReserva, "">, string> = { xilitla: "Xilitla", valles: "Ciudad Valles" };
/** Lo guardado (del panel, la web o lo que entendió el bot) → el botón que va prendido. */
export function zonaDeTexto(t: unknown): ZonaReserva {
  const v = typeof t === "string" ? t : "";
  return /\bvalles\b|\b(?:ciudad|cd)\.?\s*valle\b/i.test(v) ? "valles" : /xilitla/i.test(v) ? "xilitla" : "";
}
const PICKUP_POR_OMISION = "Lobby de tu hotel en Xilitla";

/** La habitación nueva nace con 2 personas: es la ocupación normal. */
export const HUESPEDES_POR_DEFECTO = 2;

export const EMPTY_PACKAGE: PackageItem = {
  habitacion:     HABITACION_POR_DEFECTO.label,
  hotel:          "Hotel Paraíso Encantado, Xilitla",
  noches:         2,
  habitaciones:   1,
  huespedes:      HUESPEDES_POR_DEFECTO,
  precioPorNoche: HABITACION_POR_DEFECTO.tarifas[HUESPEDES_POR_DEFECTO] ?? 0,
  checkin:        "",
  checkout:       "",
  subtotal:       (HABITACION_POR_DEFECTO.tarifas[HUESPEDES_POR_DEFECTO] ?? 0) * 2,
};

/**
 * Deja la habitación cuadrada al cambiar el cuarto o la ocupación: la gente
 * nunca pasa del tope del cuarto y el precio por noche se pone solo.
 *
 * Si el nombre está escrito a mano (no es del catálogo), `tarifaPanel` devuelve
 * 0 y se respeta el precio que se haya tecleado: el panel sigue sirviendo para
 * cotizar un hotel que no es el nuestro.
 */
export function aplicarHabitacion(p: PackageItem, nombre: string, huespedes?: number): PackageItem {
  const max    = maxHuespedesPanel(nombre);
  const hues   = Math.min(Math.max(1, Math.round(Number(huespedes ?? p.huespedes ?? HUESPEDES_POR_DEFECTO)) || 1), max);
  const tarifa = tarifaPanel(nombre, hues);
  const up: PackageItem = { ...p, habitacion: nombre, huespedes: hues };
  if (tarifa > 0) up.precioPorNoche = tarifa;
  up.subtotal = calcPackageLine(up);
  return up;
}

/**
 * Captura tardía (línea base del 3 nov 2026: 4 de 97 reservas se capturaron
 * DESPUÉS del tour, hasta 3 meses después). No se impide —a veces se captura
 * lo que ya se operó— pero se avisa, y el scorecard la cuenta por su fecha.
 */
export function AvisoFechaPasada({ fecha }: { fecha: string }) {
  if (!fecha || fecha >= hoyMX()) return null;
  return (
    <p className="mt-1 text-[10px] font-dm text-[#8a5a00] leading-snug" role="status">
      Esta fecha ya pasó: la reserva quedará como capturada tarde.
    </p>
  );
}

export const EMPTY_LINE: LineItem = { tourSlug: "", tourName: "", tourDate: "", adults: 2, childrenMid: 0, childrenSmall: 0, subtotal: 0 };
export const EMPTY_RESERVA_FORM: ReservaFormState = {
  customerName: "", customerEmail: "", customerPhone: "", notes: "",
  lines: [{ ...EMPTY_LINE }], packages: [], extras: [], ajustePrecio: 0, depositoPagado: "",
  descuentoTipo: "percent", descuentoValor: "", descuentoGuardado: null, descuentoHistorial: [],
  codigoCumple: "",
  metodoPago: "Transferencia", folioPago: "", pickupLugar: "Lobby de tu hotel en Xilitla",
  zona: "",
  numPersonas: "",
  // Sin valor de antemano, a propósito: con «WhatsApp» puesto, 36 de 43
  // reservas capturadas a mano se quedaron con lo que venía (11 oct 2026) y
  // el dato no servía para saber cuánto vende el sitio. Ahora hay que elegir.
  origen: "",
  guia: "",
  idiomaTour: "es",
  notasInternas: "",
};


/** Nombre descriptivo de una línea por vehículo, para reservas/correo: "RZR — Ruta X · Vehículo ×2". */
export function vehiculoLineName(l: LineItem): string {
  const t = TOURS_LISTA.find(t => t.slug === l.tourSlug);
  if (!t) return l.tourName;
  const base = t.nombreCorto;
  const un   = Math.max(1, l.unidades ?? 1);
  return `${base} — ${l.ruta ?? t.rutas?.[0]?.nombre ?? ""} · ${l.vehiculo ?? t.flota?.[0]?.nombre ?? ""}${un > 1 ? ` ×${un}` : ""}`;
}


/**
 * Mantiene coherentes check-in, noches y check-out.
 *
 * Antes eran tres campos sueltos: se podía cobrar 2 noches con fechas de 4, y
 * el cliente recibía una cotización que se contradecía a sí misma. Ahora dos
 * mandan y el tercero se calcula:
 *   · cambias la entrada o las noches  → se recalcula la salida
 *   · cambias la salida                → se recalculan las noches
 */
export function sincronizarNoches(p: PackageItem, campo: "checkin" | "checkout" | "noches"): PackageItem {
  const up = { ...p };
  if (campo === "checkout" && up.checkin && up.checkout) {
    const n = diffDiasYMD(up.checkin, up.checkout);
    // Una salida anterior a la entrada no es una estancia: se deja 1 noche.
    up.noches = Math.max(1, n);
  } else if (up.checkin) {
    up.noches   = Math.max(1, Math.round(Number(up.noches)) || 1);
    up.checkout = addDaysYMD(up.checkin, up.noches);
  } else {
    up.noches = Math.max(1, Math.round(Number(up.noches)) || 1);
  }
  up.subtotal = calcPackageLine(up);
  return up;
}

/**
 * El recuadro de notas internas, igual en cotizaciones y en reservas.
 *
 * Vive aquí y no duplicado en cada pantalla porque lo que importa de este campo
 * es la PROMESA que hace —"esto no sale al cliente"—, y dos recuadros escritos
 * por separado acaban prometiendo cosas distintas.
 */
export function NotasInternas(
  { value, onChange, inputCls }:
  { value: string; onChange: (v: string) => void; inputCls: string },
) {
  return (
    <div className="border border-[#C4882A]/30 bg-[#C4882A]/6 rounded-sm p-3">
      <label className="flex items-center gap-1.5 text-[9px] tracking-[2px] uppercase text-[#8a6a1a] font-dm mb-1">
        <EyeOff className="w-3 h-3" />Notas internas
      </label>
      <textarea value={value} rows={3} onChange={e => onChange(e.target.value)}
        placeholder="El trato que se hizo, con quién hay que hablar, por qué se le dio ese precio…"
        className={`${inputCls} resize-none`} />
      <p className="text-[10px] font-dm text-[#8a6a1a]/70 mt-1">
        Solo para ti y tu equipo. No sale en el correo del cliente, ni en el PDF, ni en la cotización que se le manda.
      </p>
    </div>
  );
}

/**
 * Nombre y precio por persona de un concepto que no está en el catálogo.
 * Compartido por cotizaciones y reservas: el renglón tiene que cobrar igual en
 * las dos pantallas, porque una cotización se convierte en reserva tal cual.
 *
 * 🔴 11 oct 2026 — y avisa cuando el concepto SÍ está en el catálogo. En la
 * base real hay cuatro renglones así: «Ruta surrealista », «Expedicion Tamul»,
 * «Cascadas el Meco-Meco, Mirador Panorámico y el Gran Salto» y «Recorrido en
 * RZR Nacimiemto 5h CAN-AM DEFENDER». Lo que cuesta no es la errata: una línea
 * escrita a mano NO consume el cupo de su recorrido —`cupoTour.ts` cuenta por
 * slug— así que el sitio sigue ofreciendo un lugar que ya está vendido. El
 * aviso lleva el botón que arregla las dos cosas de un clic.
 */
export function ConceptoPersonalizado(
  { line, onField, inputCls }:
  { line: LineItem; onField: (campo: keyof LineItem, valor: string | number) => void; inputCls: string },
) {
  // Laxo a propósito: aquí es una sugerencia con un botón, y las erratas son
  // justo lo que hay que reconocer. Ver `tourPorNombre` en `lib/tours.ts`.
  const delCatalogo = tourPorNombre(line.tourName, { laxo: true });

  return (
    <div className="border border-[#C4882A]/30 bg-[#C4882A]/6 rounded-sm p-2.5 space-y-2">
      <div>
        <label className="block text-[9px] tracking-[2px] uppercase text-[#8a6a1a] font-dm mb-1">
          Nombre del concepto *
        </label>
        <input type="text" value={line.tourName} autoFocus
          placeholder="Ej. Recorrido a la Cascada del Salto"
          onChange={e => onField("tourName", e.target.value)} className={inputCls} />
      </div>

      {delCatalogo && (
        <div className="border border-[#C9484A]/35 bg-[#C9484A]/8 rounded-sm p-2.5">
          <p className="font-dm text-[11px] leading-snug text-[#C9484A]">
            Esto ya está en el catálogo: <strong className="font-medium">{delCatalogo.nombreCorto}</strong>.
            Escrito a mano <strong className="font-medium">no cuenta en el cupo</strong> de ese
            recorrido, y el sitio puede volver a vender el mismo lugar.
          </p>
          <button type="button" onClick={() => onField("tourSlug", delCatalogo.slug)}
            className="mt-2 inline-flex items-center gap-1.5 border border-[#C9484A]/50 px-2.5 py-1
                       font-dm text-[11px] text-[#C9484A] rounded-sm
                       transition-colors hover:bg-[#C9484A] hover:text-white">
            <Check className="h-3 w-3" aria-hidden="true" />
            Usar «{delCatalogo.nombreCorto}» del catálogo
          </button>
          <p className="mt-1.5 font-dm text-[10px] text-[#8a6a1a]/70">
            Si de verdad es otra cosa, ignora este aviso y sigue.
          </p>
        </div>
      )}
      <div>
        <label className="block text-[9px] tracking-[2px] uppercase text-[#8a6a1a] font-dm mb-1">
          Precio por persona
        </label>
        <input type="number" min={0} step={50} value={line.precioPersona ?? 0}
          onChange={e => onField("precioPersona", Number(e.target.value))}
          className={`${inputCls} max-w-[160px]`} />
      </div>
      <p className="text-[10px] font-dm text-[#8a6a1a]/70">
        Este nombre y este precio son los que verá el cliente. Los niños pagan lo mismo que en
        cualquier recorrido: 50 % de 4 a 7 años; los bebés de 0 a 3 van gratis.
      </p>
    </div>
  );
}

/**
 * Elegir el cuarto y cuánta gente duerme en él. El precio por noche se pone
 * solo con esos dos datos.
 *
 * 🔴 Lo que arregla: antes se elegía el cuarto y punto. Una familia de cuatro se
 * cotizaba al mismo precio que una pareja, y el hotel cobraba la diferencia al
 * llegar. Ahora la ocupación es parte de la elección y cada escalón enseña su
 * precio, que es como Manolo cotiza por teléfono.
 */
export function SelectorHabitacion(
  { pkg, onField, inputCls }:
  { pkg: PackageItem; onField: (campo: keyof PackageItem, valor: string | number) => void; inputCls: string },
) {
  const hab   = habitacionPanel(pkg.habitacion);
  const hues  = Math.min(
    Math.max(1, Math.round(Number(pkg.huespedes)) || HUESPEDES_POR_DEFECTO),
    hab?.maxHuespedes ?? 99,
  );
  const chip  = (activo: boolean) =>
    `text-[10px] font-dm px-2 py-1 rounded border transition-colors ${
      activo ? "bg-[#40916C] text-white border-[#40916C]" : "border-[#40916C]/30 text-[#40916C] hover:bg-[#40916C]/10"
    }`;

  return (
    <div className="space-y-2">
      <div>
        <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Habitación</label>
        <div className="flex gap-1.5 flex-wrap mb-1.5">
          {HABITACIONES_PANEL.map(h => (
            <button key={h.id} type="button" onClick={() => onField("habitacion", h.label)}
              title={`${h.vista} · hasta ${h.maxHuespedes} personas`}
              className={chip(pkg.habitacion === h.label)}>
              {h.label}
            </button>
          ))}
        </div>
        <input type="text" value={pkg.habitacion} placeholder="…o escribe otro hotel / otra habitación"
          onChange={e => onField("habitacion", e.target.value)} className={inputCls} />
      </div>

      {hab ? (
        <div>
          <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">
            Personas en la habitación
          </label>
          <div className="flex gap-1.5 flex-wrap">
            {Array.from({ length: hab.maxHuespedes }, (_, k) => k + 1).map(n => (
              <button key={n} type="button" onClick={() => onField("huespedes", n)}
                className={chip(hues === n)}>
                {n} {n === 1 ? "persona" : "personas"} · {fmx(hab.tarifas[n] ?? 0)}
              </button>
            ))}
          </div>
          <p className="text-[10px] font-dm text-[#1B4332]/40 mt-1">
            {hab.vista} · caben hasta {hab.maxHuespedes}. El precio por noche se pone solo;
            si lo cambias a mano abajo, manda el tuyo.
          </p>
        </div>
      ) : (
        <p className="text-[10px] font-dm text-[#1B4332]/40">
          Habitación escrita a mano: el precio por noche lo pones tú abajo.
        </p>
      )}
    </div>
  );
}

/**
 * Selector de actividades opcionales de un recorrido. Solo aparece cuando el
 * catálogo del tour trae alguna (hoy: el Salto de las 7 Cascadas en el Paraíso
 * Escalonado). El precio es del catálogo y no se puede teclear: lo único que se
 * elige es a cuánta gente se le suma.
 */
export function AddOnsLinea({ line, personas, onChange }: {
  line:     LineItem;
  personas: number;
  onChange: (linea: LineItem) => void;
}) {
  const cat = addOnsDeTour(line.tourSlug);
  if (!cat.length) return null;
  const tope = Math.max(1, personas || 1);

  return (
    <div className="border border-[#C4882A]/30 bg-[#C4882A]/5 rounded-sm p-2.5 space-y-2">
      <p className="text-[9px] tracking-[2px] uppercase text-[#C4882A]/90 font-dm">Actividad opcional</p>
      {cat.map(a => {
        const n = cantidadAddOn(line, a.id);
        return (
          <div key={a.id} className="space-y-1">
            <div className="flex items-end gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[#1B4332] font-dm text-xs font-medium">{a.nombre}</p>
                <p className="text-[#1B4332]/45 font-dm text-[10px]">{fmx(a.precio)} por persona</p>
              </div>
              <div className="w-24 shrink-0">
                <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Personas</label>
                <input type="number" min={0} max={tope} value={n}
                  onChange={e => onChange(conAddOn(line, a.id, Math.min(tope, Math.max(0, Number(e.target.value) || 0))))}
                  className="w-full border border-[#C4882A]/40 text-[#1B4332] font-dm text-sm px-2 py-2 focus:outline-none focus:border-[#C4882A] rounded-sm bg-white" />
              </div>
            </div>
            {n > 0 && (
              <p className="text-right text-[11px] font-dm text-[#C4882A]">
                {n} × {fmx(a.precio)} = <span className="font-medium">{fmx(a.precio * n)}</span>
              </p>
            )}
          </div>
        );
      })}
      <p className="text-[10px] font-dm text-[#1B4332]/40">
        Va dentro del subtotal del recorrido y se nombra en el PDF y en el correo.
      </p>
    </div>
  );
}

/**
 * La opción por omisión de un recorrido que se bifurca (la primera del
 * catálogo: en la Ruta Acuática, Siete Cascadas, «la de la mayoría» y sin
 * extra). `undefined` si el tour no tiene elección.
 */
export function eleccionPorOmision(tourSlug: string): string | undefined {
  return TOURS_LISTA.find(t => t.slug === tourSlug)?.eleccion?.opciones[0]?.nombre;
}

/**
 * Selector de la parte del día que el cliente elige (Ruta Acuática: Siete
 * Cascadas o Tamasopo; Manolo, 5 nov 2026). Dos botones, uno marcado siempre:
 * la cotización tiene que decir a dónde va el grupo y cuánto cuesta. La opción
 * con extra lo enseña en el botón.
 */
export function EleccionLinea({ line, onChange }: {
  line:     LineItem;
  onChange: (linea: LineItem) => void;
}) {
  const tour = TOURS_LISTA.find(t => t.slug === line.tourSlug);
  if (!tour?.eleccion) return null;
  const activa = opcionDeEleccion(tour, line.eleccion)?.id;
  return (
    <div className="border border-[#08569a]/25 bg-[#08569a]/5 rounded-sm p-2.5 space-y-2">
      <p className="text-[9px] tracking-[2px] uppercase text-[#08569a] font-dm">¿Qué eligió el cliente?</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" role="radiogroup" aria-label="Opción del recorrido">
        {tour.eleccion.opciones.map(o => {
          const on = activa === o.id;
          return (
            <button key={o.id} type="button" role="radio" aria-checked={on}
              onClick={() => onChange({ ...line, eleccion: o.nombre })}
              className={`text-left rounded-sm border px-3 py-2 transition-colors ${
                on ? "border-[#08569a] bg-[#08569a] text-white" : "border-[#1B4332]/20 bg-white text-[#1B4332] hover:border-[#08569a]/60"
              }`}>
              <span className="block font-dm text-xs font-medium leading-snug">{o.nombre}</span>
              <span className={`block font-dm text-[10px] leading-snug ${on ? "text-white/80" : "text-[#1B4332]/50"}`}>
                {o.extraPorPersona ? `+${fmx(o.extraPorPersona)} por persona` : "Sin cargo extra"}
              </span>
            </button>
          );
        })}
      </div>
      {!activa && (
        <p className="text-[10px] font-dm text-[#9b2c2c]">Falta elegir: sin esto la cotización no dice a dónde va el grupo.</p>
      )}
    </div>
  );
}

/**
 * El traslado desde Ciudad Valles en la línea de un recorrido que lo cobra
 * (hoy solo la Ruta Surrealista: $400 POR RESERVA, no por persona; Manolo,
 * 20 oct 2026). En los demás no se pinta: desde Valles no cuestan más.
 *
 * Con `onChange` es una casilla (Reservas, donde no hay botones de zona); sin
 * él solo informa, porque en «Nueva cotización» lo decide «¿De dónde sale el
 * cliente?» y una casilla aparte se contradiría con esos botones.
 */
export function TrasladoVallesLinea({ line, onChange }: {
  line:      LineItem;
  onChange?: (linea: LineItem) => void;
}) {
  const cargo = cargoVallesDe(TOURS_LISTA.find(t => t.slug === line.tourSlug));
  if (cargo <= 0) return null;
  const tiene = (line.addOns ?? []).some(a => a.id === ID_TRASLADO_VALLES);
  const texto = (
    <span className="min-w-0">
      <span className="block text-[#1B4332] font-dm text-xs font-medium">
        {tiene ? `Sale de Ciudad Valles: +${fmx(cargo)} de traslado` : `Desde Ciudad Valles: +${fmx(cargo)} de traslado`}
      </span>
      <span className="block text-[#1B4332]/50 font-dm text-[10px]">
        Por reserva, no por persona. Solo este recorrido lo cobra; desde Xilitla va incluido.
        {!onChange && !tiene ? " Se suma solo al elegir «Ciudad Valles» arriba." : ""}
      </span>
    </span>
  );
  return onChange ? (
    <label className="flex cursor-pointer items-start gap-2 border border-[#a86814]/30 bg-[#a86814]/5 rounded-sm p-2.5">
      <input type="checkbox" checked={tiene} onChange={e => onChange(conTrasladoValles(line, e.target.checked))}
        className="mt-0.5 h-4 w-4 flex-shrink-0 accent-[#7a4b0e]" />
      {texto}
    </label>
  ) : (
    <div className={`flex items-start gap-2 rounded-sm p-2.5 border ${tiene ? "border-[#a86814]/35 bg-[#a86814]/10" : "border-[#1B4332]/12 bg-white"}`}>
      {texto}
    </div>
  );
}

interface Props {
  title:   string;
  /** Los conceptos con sus precios, tal como Manolo los dejó en el Cotizador. */
  presetsExtras?: PresetExtra[];
  /** false = no enseña lo que nos cuesta cada extra (quien no tiene el Cotizador; lote 8, 10 nov 2026). */
  verCostos?: boolean;
  /** Guías ya usados en otras reservas: se ofrecen para no teclearlos de nuevo. */
  guiasConocidos?: string[];
  form:    ReservaFormState;
  setForm: (f: ReservaFormState | ((p: ReservaFormState) => ReservaFormState)) => void;
  onSave:  () => void;
  onClose: () => void;
  saving:  boolean;
  /**
   * 🔴 En una reserva que YA existe, el dinero cobrado no se edita aquí: se
   * registra con "Registrar cobro", que guarda método, comprobante y quién lo
   * recibió, y deja `depositoPagado` como espejo de esos renglones. Si además
   * se pudiera escribir a mano, las dos puertas acabarían contradiciéndose.
   * Al CREAR una reserva sí se captura aquí: todavía no hay a qué colgar el cobro.
   */
  soloLecturaCobro?: boolean;
  /** El folio de la reserva que se edita: su propio código de cumpleaños sigue sirviéndole. */
  folio?: string;
}

export function ReservaModal({ title, form, setForm, onSave, onClose, saving, presetsExtras = EXTRAS_PRESET, verCostos = true, guiasConocidos = [], soloLecturaCobro = false, folio }: Props) {
  const [step,         setStep]         = useState<1 | 2 | 3>(1);
  const [editingTotal, setEditingTotal] = useState(false);
  // Lo que se va tecleando en «Editar» el total; el ajuste se saca de ahí.
  const [totalTexto,   setTotalTexto]   = useState("");

  const inputCls = "w-full border border-[#1B4332]/15 text-[#1B4332] font-dm text-sm px-3 py-2.5 focus:outline-none focus:border-[#1B4332] rounded-sm placeholder:text-[#1B4332]/25 bg-white";

  const toursTotal    = form.lines.reduce((s, l) => s + calcTourLine(l), 0);
  const packagesTotal = form.packages.reduce((s, p) => s + calcPackageLine(p), 0);
  const extrasTotal   = totalExtras(form.extras ?? []);
  // El grupo real (máximo por tour, no la suma), para llenar la cantidad de los
  // extras que se cobran por persona.
  const grupoActual   = grupoParaGuardar(form.lines, form.numPersonas);
  const personasGrupo = Number(form.numPersonas) || (grupoActual.adults + grupoActual.children);
  const sinDescuento  = toursTotal + packagesTotal + extrasTotal;
  const descuentoMonto = montoDescuento(
    Number(form.descuentoValor) > 0 ? { tipo: form.descuentoTipo, valor: Math.round(Number(form.descuentoValor)) } : null,
    sinDescuento,
  );
  // El total automático ya trae el descuento: editar un tour no lo borra.
  const calcTotal     = sinDescuento - descuentoMonto;
  // Y el precio pactado va encima como ajuste: tampoco se borra al editar.
  const finalTotal    = totalConAjuste(calcTotal, form.ajustePrecio);
  const deposito      = Number(form.depositoPagado) || 0;
  const pendiente     = Math.max(0, finalTotal - deposito);

  const step1Valid = !!form.customerName.trim();
  const step2Valid = form.lines.every(lineaCompleta);
  const canSave    = !saving && step1Valid && step2Valid && !!form.origen;

  function updateLine(i: number, field: keyof LineItem, val: string | number) {
    setForm(f => ({
      ...f,
      lines: f.lines.map((l, idx) => {
        if (idx !== i) return l;
        const up = { ...l, [field]: val };
        if (field === "tourSlug") {
          const t = TOURS_LISTA.find(t => t.slug === val);
          if (esLineaPersonalizada(String(val))) {
            // Nace en blanco: el nombre y el precio los pone Manolo.
            up.tourName      = "";
            up.precioPersona = 0;
            up.adults        = Math.max(1, up.adults || 2);
            delete up.ruta; delete up.vehiculo; delete up.unidades; delete up.addOns; delete up.eleccion;
            up.subtotal = calcTourLine(up);
            return up;
          }
          delete up.precioPersona;
          up.tourName = t?.nombre || "";
          // La elección es de ESE tour: al cambiar de recorrido se va, y si el
          // nuevo se bifurca (Ruta Acuática) entra marcada la opción sin extra.
          delete up.eleccion;
          const omision = eleccionPorOmision(String(val));
          if (omision) up.eleccion = omision;
          if (t?.precioUnidad === "vehiculo" && t.rutas && t.flota) {
            // Al elegir un tour por vehículo: defaults de ruta/vehículo y participantes fuera del precio.
            up.ruta          = t.rutas[0].nombre;
            up.vehiculo      = t.flota[0].nombre;
            up.unidades      = 1;
            up.adults        = 0;
            up.childrenMid   = 0;
            up.childrenSmall = 0;
            up.infants       = 0;
          } else {
            delete up.ruta; delete up.vehiculo; delete up.unidades;
            up.adults = Math.max(1, up.adults || 2);
          }
        }
        // Evitar valores 0/NaN en participantes (solo tours por persona)
        if (field === "adults")        up.adults        = Math.max(1, Number(val) || 1);
        if (field === "childrenMid")   up.childrenMid   = Math.max(0, Number(val) || 0);
        if (field === "childrenSmall") up.childrenSmall = Math.max(0, Number(val) || 0);
        if (field === "unidades")      up.unidades      = Math.max(1, Number(val) || 1);
        if (field === "precioPersona") up.precioPersona = Math.max(0, Number(val) || 0);
        // El nombre de línea de un tour por vehículo lleva ruta/vehículo (así lo ven reservas y el correo).
        if (esTourVehiculo(up.tourSlug)) up.tourName = vehiculoLineName(up);
        up.subtotal = calcTourLine(up);
        // Otro tour: el traslado de Valles se quita y vuelve según la zona elegida.
        if (field === "tourSlug") return conTrasladoValles(conTrasladoValles(up, false), f.zona === "valles");
        return up;
      }),
      // El precio pactado (`ajustePrecio`) se queda: cambiar la fecha no
      // mueve el total, y si otro cambio lo mueve se pregunta al guardar.
    }));
  }

  /**
   * Los botones Xilitla / Ciudad Valles: guardan la zona, ponen o quitan el
   * traslado de Valles en las líneas que lo cobran y no dejan el «Lobby de tu
   * hotel en Xilitla» a quien sale de Valles. Elegir Xilitla ya no lo escribe
   * en un campo vacío (5 nov 2026): vacío, el correo da el punto de encuentro
   * de cada tour; el lobby se imprimía aunque nadie lo hubiera dicho.
   */
  function elegirZona(z: Exclude<ZonaReserva, "">) {
    setForm(f => {
      const lines   = f.lines.map(l => conTrasladoValles(l, z === "valles"));
      const lugar   = f.pickupLugar.trim();
      const pickupLugar = z === "valles" && lugar === PICKUP_POR_OMISION ? "" : f.pickupLugar;
      // El precio pactado se queda; el traslado de Valles se suma encima.
      return { ...f, zona: z, lines, pickupLugar };
    });
  }

  function updatePackage(i: number, field: keyof PackageItem, val: string | number) {
    setForm(f => ({
      ...f,
      packages: f.packages.map((p, idx) => {
        if (idx !== i) return p;
        // Cambiar el cuarto o cuánta gente duerme en él vuelve a poner la tarifa.
        if (field === "habitacion") return aplicarHabitacion(p, String(val));
        if (field === "huespedes")  return aplicarHabitacion(p, p.habitacion, Number(val));
        const up = { ...p, [field]: val };
        if (field === "checkin" || field === "checkout" || field === "noches") {
          return sincronizarNoches(up, field);
        }
        up.subtotal = calcPackageLine(up);
        return up;
      }),
    }));
  }

  const TABS = [
    { n: 1 as const, label: "Cliente" },
    { n: 2 as const, label: "Tours" },
    { n: 3 as const, label: "Pago" },
  ];

  function goToTab(n: 1 | 2 | 3) {
    if (n <= step) { setStep(n); return; }
    if (n === 2 && step1Valid) setStep(2);
    if (n === 3 && step1Valid && step2Valid) setStep(3);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white border border-[#1B4332]/10 w-full max-w-xl shadow-xl rounded-sm flex flex-col max-h-[95vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-0">
          <h2 className="font-cormorant text-[#1B4332] text-xl font-light">{title}</h2>
          <button onClick={onClose} className="text-[#1B4332]/40 hover:text-[#1B4332]"><X className="w-5 h-5" /></button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 mt-4 border-b border-[#1B4332]/10">
          {TABS.map(tab => {
            const done   = tab.n < step;
            const active = step === tab.n;
            return (
              <button key={tab.n} onClick={() => goToTab(tab.n)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-[10px] tracking-[1.5px] uppercase font-dm border-b-2 transition-colors -mb-px ${
                  active ? "border-[#1B4332] text-[#1B4332]" : "border-transparent text-[#1B4332]/40 hover:text-[#1B4332]/70"
                }`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0 ${
                  done || active ? "bg-[#1B4332] text-white" : "bg-[#1B4332]/12 text-[#1B4332]/50"
                }`}>
                  {done ? <Check className="w-2.5 h-2.5" /> : tab.n}
                </span>
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-6 py-5">

          {/* ── Step 1: Cliente ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Nombre *</label>
                <input type="text" value={form.customerName} placeholder="Nombre completo" autoFocus
                  onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Email</label>
                  <input type="email" value={form.customerEmail} placeholder="email@ejemplo.com"
                    onChange={e => setForm(f => ({ ...f, customerEmail: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Teléfono</label>
                  <input type="tel" value={form.customerPhone} placeholder="+52 489 000 0000"
                    onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))} className={inputCls} />
                </div>
              </div>
              {/* Los mismos dos botones de «Nueva cotización»: el Corte lee de aquí
                  de dónde salió el tour. */}
              <div>
                <p className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1" id="zona-reserva">¿De dónde sale el cliente?</p>
                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-labelledby="zona-reserva">
                  {(["xilitla", "valles"] as const).map(z => {
                    const activa = form.zona === z;
                    return (
                      <button key={z} type="button" role="radio" aria-checked={activa} onClick={() => elegirZona(z)}
                        className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-sm border font-dm text-sm transition-colors ${
                          activa ? "bg-[#1B4332] border-[#1B4332] text-white" : "bg-white border-[#1B4332]/20 text-[#1B4332] hover:border-[#1B4332]/45"}`}>
                        <MapPin size={14} aria-hidden="true" /> {ZONA_TEXTO[z]}
                      </button>
                    );
                  })}
                </div>
                {form.zona === "valles" && (
                  <p className="mt-1.5 font-dm text-[11px] leading-snug text-[#7a4b0e]">
                    {TOURS_LISTA.filter(t => cargoVallesDe(t) > 0).map(t => `${t.nombreCorto} +${fmx(cargoVallesDe(t))}`).join(" · ")} de traslado
                    desde Ciudad Valles, por reserva (no por persona); se suma solo a su línea. Los demás tours pasan
                    por el cliente sin costo extra.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Notas</label>
                <textarea value={form.notes} rows={3}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Preferencias, alergias, requerimientos especiales..."
                  className={`${inputCls} resize-none`} />
                <p className="text-[10px] font-dm text-[#1B4332]/40 mt-1">
                  Esto SÍ lo ve el cliente: sale en su correo y en su comprobante.
                </p>
              </div>
              <NotasInternas
                value={form.notasInternas}
                onChange={v => setForm(f => ({ ...f, notasInternas: v }))}
                inputCls={inputCls}
              />
            </div>
          )}

          {/* ── Step 2: Tours + Hospedaje ── */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Número de personas del grupo (para el email — evita sumar por tour) */}
              <div className="bg-[#FAFAF8]/60 border border-[#1B4332]/10 rounded-sm p-3">
                <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">
                  Número de personas del grupo
                </label>
                <input type="number" min={1} max={40} value={form.numPersonas}
                  placeholder="Ej. 2"
                  onChange={e => setForm(f => ({ ...f, numPersonas: e.target.value }))}
                  className={`${inputCls} max-w-[140px]`} />
                <p className="text-[10px] font-dm text-[#1B4332]/40 mt-1.5">
                  Cuántas personas son en total (el mismo grupo que va a todos los tours). Así el correo de
                  confirmación muestra el número correcto y no suma las personas de cada tour.
                </p>
              </div>

              {/* Tours */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm">Tours</p>
                  <button onClick={() => setForm(f => ({ ...f, lines: [...f.lines, { ...EMPTY_LINE }] }))}
                    className="flex items-center gap-1 text-xs font-dm text-[#1B4332] border border-[#1B4332]/30 px-2 py-1 hover:bg-[#1B4332]/8 transition-colors rounded-sm">
                    <Plus className="w-3 h-3" />Agregar tour
                  </button>
                </div>
                <div className="space-y-2">
                  {form.lines.map((line, i) => (
                    <div key={i} className="border border-[#1B4332]/10 p-3 rounded-sm bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] tracking-[2px] uppercase text-[#1B4332]/40 font-dm">Tour {i + 1}</span>
                        {form.lines.length > 1 && (
                          <button onClick={() => setForm(f => ({ ...f, lines: f.lines.filter((_, idx) => idx !== i) }))}
                            className="text-[#1B4332]/30 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                        )}
                      </div>
                      <div className="space-y-2">
                        <select value={line.tourSlug} onChange={e => updateLine(i, "tourSlug", e.target.value)} className={inputCls}>
                          <option value="">Seleccionar tour...</option>
                          {TOURS_LISTA.map(t => <option key={t.slug} value={t.slug}>{t.nombre}{t.precioUnidad === "vehiculo" ? " (por vehículo)" : ""}</option>)}
                          <option value={SLUG_PERSONALIZADO}>+ Otro concepto (nombre y precio a mano)</option>
                        </select>
                        {esLineaPersonalizada(line.tourSlug) && (
                          <ConceptoPersonalizado line={line} inputCls={inputCls}
                            onField={(campo, valor) => updateLine(i, campo, valor)} />
                        )}
                        {esConceptoSinTour(line) && (
                          <p className="text-[11px] font-dm text-[#1B4332]/70 leading-snug">
                            Concepto de la web: <strong>{line.tourName}</strong> · {fmx(importeDeConcepto(line))}. Se guarda tal cual; si ya no va, quita el renglón.
                          </p>
                        )}
                        {esTourVehiculo(line.tourSlug) ? (
                          (() => {
                            const t = TOURS_LISTA.find(t => t.slug === line.tourSlug)!;
                            const rutaIdx = Math.max(0, t.rutas!.findIndex(r => r.nombre === line.ruta));
                            return (
                              <>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Fecha *</label>
                                    <input type="date" value={line.tourDate} onChange={e => updateLine(i, "tourDate", e.target.value)} className={inputCls} />
                                    <AvisoFechaPasada fecha={line.tourDate} />
                                  </div>
                                  <div>
                                    <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Ruta</label>
                                    <select value={line.ruta} onChange={e => updateLine(i, "ruta", e.target.value)} className={inputCls}>
                                      {t.rutas!.map(r => <option key={r.nombre} value={r.nombre}>{r.nombre} · {r.duracion_hrs}h</option>)}
                                    </select>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Vehículo</label>
                                    <select value={line.vehiculo} onChange={e => updateLine(i, "vehiculo", e.target.value)} className={inputCls}>
                                      {t.flota!.map(v => (
                                        <option key={v.nombre} value={v.nombre}>
                                          {v.nombre} ({v.capacidad}) — {fmx(v.precios[rutaIdx])}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1" title="Cuántos vehículos de este modelo">Unidades</label>
                                    <input type="number" min={1} max={10} value={line.unidades ?? 1}
                                      onChange={e => updateLine(i, "unidades", Number(e.target.value))} className={inputCls} />
                                  </div>
                                </div>
                                <p className="text-[10px] font-dm text-[#1B4332]/40">
                                  Precio por vehículo (incluye gasolina, equipo y guía) — los ocupantes no cambian el precio.
                                  ¿Otro modelo además? Agrega otra línea del mismo tour.
                                </p>
                              </>
                            );
                          })()
                        ) : (
                          <>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Fecha *</label>
                                <input type="date" value={line.tourDate} onChange={e => updateLine(i, "tourDate", e.target.value)} className={inputCls} />
                                    <AvisoFechaPasada fecha={line.tourDate} />
                              </div>
                              <div>
                                <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Adultos</label>
                                <input type="number" min={1} max={20} value={line.adults}
                                  onChange={e => updateLine(i, "adults", Number(e.target.value))} className={inputCls} />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {/* Regla del 17 nov 2026 (`ninos.ts`): de 4 a 7 al 50 %, de 0 a 3
                                  gratis, de 8 en adelante adulto. El tramo viejo de 6 a 10 solo
                                  se enseña si la reserva ya lo trae, para poder bajarlo a 0. */}
                              {(line.childrenMid ?? 0) > 0 && (
                                <div className="col-span-2">
                                  <label className="block text-[9px] tracking-[2px] uppercase text-[#8a6a1a] font-dm mb-1 truncate" title="Tarifa anterior al 17 nov 2026: 70 %">Niños 6–10 (tarifa anterior, 70 %)</label>
                                  <input type="number" min={0} max={12} value={line.childrenMid}
                                    onChange={e => updateLine(i, "childrenMid", Number(e.target.value))} className={inputCls} />
                                </div>
                              )}
                              <div>
                                <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1 truncate" title="4 a 7 años — 50 % del adulto">Niños 4–7 (50 %)</label>
                                <input type="number" min={0} max={12} value={line.childrenSmall}
                                  onChange={e => updateLine(i, "childrenSmall", Number(e.target.value))} className={inputCls} />
                              </div>
                              <div>
                                <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1 truncate" title="0 a 3 años — gratis, ocupan lugar">Bebés 0–3 (gratis)</label>
                                <input type="number" min={0} max={12} value={line.infants ?? 0}
                                  onChange={e => updateLine(i, "infants", Number(e.target.value))} className={inputCls} />
                              </div>
                            </div>
                          </>
                        )}
                        {line.tourSlug && (
                          <EleccionLinea
                            line={line}
                            onChange={nueva => setForm(f => ({
                              ...f,
                              lines: f.lines.map((x, idx) => idx === i ? { ...nueva, subtotal: calcTourLine(nueva) } : x),
                            }))}
                          />
                        )}
                        {line.tourSlug && (
                          <AddOnsLinea
                            line={line}
                            personas={Number(form.numPersonas) || (line.adults + (line.childrenMid ?? 0) + (line.childrenSmall ?? 0))}
                            onChange={nueva => setForm(f => ({
                              ...f,
                              lines: f.lines.map((x, idx) => idx === i ? { ...nueva, subtotal: calcTourLine(nueva) } : x),
                            }))}
                          />
                        )}
                        {line.tourSlug && (
                          <TrasladoVallesLinea
                            line={line}
                            onChange={nueva => setForm(f => ({
                              ...f,
                              lines: f.lines.map((x, idx) => idx === i ? nueva : x),
                            }))}
                          />
                        )}
                        {line.tourSlug && (
                          <p className="text-right text-xs font-dm text-[#52B788]">Subtotal: {fmx(calcTourLine(line))}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hospedaje */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm flex items-center gap-1.5">
                    <BedDouble className="w-3 h-3" />Hospedaje (opcional)
                  </p>
                  <button onClick={() => setForm(f => ({ ...f, packages: [...f.packages, { ...EMPTY_PACKAGE }] }))}
                    className="flex items-center gap-1 text-xs font-dm text-[#40916C] border border-[#40916C]/30 px-2 py-1 hover:bg-[#40916C]/8 transition-colors rounded-sm">
                    <Plus className="w-3 h-3" />Agregar habitación
                  </button>
                </div>
                {form.packages.length === 0 && (
                  <p className="text-[10px] font-dm text-[#1B4332]/30 border border-dashed border-[#1B4332]/15 rounded-sm py-4 text-center">
                    Sin hospedaje — solo tours
                  </p>
                )}
                <div className="space-y-2">
                  {form.packages.map((pkg, i) => (
                    <div key={i} className="border border-[#40916C]/25 p-3 rounded-sm bg-[#FFFFFF]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] tracking-[2px] uppercase text-[#40916C]/70 font-dm flex items-center gap-1">
                          <BedDouble className="w-3 h-3" /> Habitación {i + 1}
                        </span>
                        <button onClick={() => setForm(f => ({ ...f, packages: f.packages.filter((_, idx) => idx !== i) }))}
                          className="text-[#1B4332]/30 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Hotel</label>
                          <input type="text" value={pkg.hotel} className={inputCls}
                            onChange={e => updatePackage(i, "hotel", e.target.value)} />
                        </div>
                        <SelectorHabitacion pkg={pkg} inputCls={inputCls}
                          onField={(campo, valor) => updatePackage(i, campo, valor)} />
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Noches</label>
                            <input type="number" min={1} max={30} value={pkg.noches}
                              onChange={e => updatePackage(i, "noches", Number(e.target.value))} className={inputCls} />
                          </div>
                          <div>
                            <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Hab.</label>
                            <input type="number" min={1} max={10} value={pkg.habitaciones}
                              onChange={e => updatePackage(i, "habitaciones", Number(e.target.value))} className={inputCls} />
                          </div>
                          <div>
                            <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">$/noche</label>
                            <input type="number" min={0} value={pkg.precioPorNoche}
                              onChange={e => updatePackage(i, "precioPorNoche", Number(e.target.value))} className={inputCls} />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Check-in</label>
                            <input type="date" value={pkg.checkin}
                              onChange={e => updatePackage(i, "checkin", e.target.value)} className={inputCls} />
                          </div>
                          <div>
                            <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Check-out</label>
                            <input type="date" value={pkg.checkout}
                              onChange={e => updatePackage(i, "checkout", e.target.value)} className={inputCls} />
                          </div>
                        </div>
                        <p className="text-right text-xs font-dm text-[#40916C] font-medium">
                          Subtotal: {fmx(calcPackageLine(pkg))}
                          <span className="text-[#1B4332]/35 font-normal ml-1">
                            ({pkg.noches}n × {pkg.habitaciones}hab × {fmx(pkg.precioPorNoche)}
                            {pkg.huespedes ? ` · ${pkg.huespedes} pers/hab` : ""})
                          </span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Extras: comida, transporte, guía privado… */}
              <ExtrasEditor
                extras={form.extras ?? []}
                personas={personasGrupo}
                presets={presetsExtras}
                verCostos={verCostos}
                onChange={extras => setForm(f => ({ ...f, extras }))}
              />

              {/* Resumen running */}
              {calcTotal > 0 && (
                <div className="bg-[#FAFAF8]/70 border border-[#52B788]/20 rounded-sm px-4 py-3">
                  {(packagesTotal > 0 || extrasTotal > 0) && (
                    <div className="mb-2 pb-2 border-b border-[#52B788]/15 space-y-1">
                      <div className="flex justify-between text-xs font-dm text-[#1B4332]/50">
                        <span>Tours</span><span>{fmx(toursTotal)}</span>
                      </div>
                      {packagesTotal > 0 && (
                        <div className="flex justify-between text-xs font-dm text-[#40916C]">
                          <span>Hospedaje</span><span>{fmx(packagesTotal)}</span>
                        </div>
                      )}
                      {extrasTotal > 0 && (
                        <div className="flex justify-between text-xs font-dm text-[#C4882A]">
                          <span>Extras</span><span>{fmx(extrasTotal)}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {/* El precio pactado se ve aquí también: el total no brinca al de lista. */}
                  {form.ajustePrecio !== 0 && (
                    <div className="mb-1 flex justify-between text-xs font-dm text-[#1B4332]/60">
                      <span>Precio pactado (ajuste sobre la lista)</span><span>{textoAjuste(form.ajustePrecio)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm">Total estimado</span>
                    <span className="font-cormorant text-[#52B788] text-xl">{fmx(finalTotal)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Pago ── */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Total editable */}
              {/* El descuento, con candado: va aparte del total para que no se
                  pierda al editar (ver `descuento.ts`). */}
              <DescuentoEditor
                tipo={form.descuentoTipo}
                valor={form.descuentoValor}
                onCambio={(tipo, valor) => { setEditingTotal(false); setForm(f => ({ ...f, descuentoTipo: tipo, descuentoValor: valor })); }}
                base={sinDescuento}
                guardado={form.descuentoGuardado}
                historial={form.descuentoHistorial}
                inputCls={inputCls}
                cumple={{
                  codigo: form.codigoCumple,
                  lineas: form.lines,
                  cuando: "al guardar la reserva",
                  folio,
                  onAplicar: (codigo, monto) => { setEditingTotal(false); setForm(f => ({ ...f, codigoCumple: codigo, descuentoTipo: "fixed", descuentoValor: String(monto) })); },
                  // Quitar el código quita también el descuento que puso: si no,
                  // la reserva se quedaba con el 10 % y el código libre para otra.
                  onQuitar: () => { setEditingTotal(false); setForm(f => ({ ...f, codigoCumple: "", descuentoTipo: "percent", descuentoValor: "" })); },
                }}
              />

              <div className="border border-[#52B788]/30 bg-[#52B788]/6 px-4 py-3 rounded-sm">
                {(packagesTotal > 0 || extrasTotal > 0 || descuentoMonto > 0) && (
                  <div className="mb-2 pb-2 border-b border-[#52B788]/15 space-y-1">
                    <div className="flex justify-between text-xs font-dm text-[#1B4332]/50">
                      <span>Tours</span><span>{fmx(toursTotal)}</span>
                    </div>
                    {packagesTotal > 0 && (
                      <div className="flex justify-between text-xs font-dm text-[#40916C]">
                        <span>Hospedaje</span><span>{fmx(packagesTotal)}</span>
                      </div>
                    )}
                    {extrasTotal > 0 && (
                      <div className="flex justify-between text-xs font-dm text-[#C4882A]">
                        <span>Extras</span><span>{fmx(extrasTotal)}</span>
                      </div>
                    )}
                    {descuentoMonto > 0 && (
                      <div className="flex justify-between text-xs font-dm text-[#1B4332]">
                        <span>Descuento</span><span>−{fmx(descuentoMonto)}</span>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">
                      Total {form.ajustePrecio !== 0 && <span className="text-[#52B788]">(precio pactado: {textoAjuste(form.ajustePrecio)} sobre la lista)</span>}
                    </p>
                    {editingTotal ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[#1B4332]/40 font-dm text-sm">$</span>
                        {/* Lo tecleado se guarda como ajuste sobre la lista: así se
                            respeta aunque luego se cambie la fecha o un renglón. */}
                        <input type="number" min={0} value={totalTexto}
                          onChange={e => {
                            const v = e.target.value;
                            setTotalTexto(v);
                            if (v !== "" && Number.isFinite(Number(v))) setForm(f => ({ ...f, ajustePrecio: ajusteDeTotal(Number(v), calcTotal) }));
                          }}
                          placeholder={String(calcTotal)}
                          className="flex-1 border border-[#52B788]/50 bg-white text-[#52B788] font-cormorant text-xl px-2 py-1 focus:outline-none rounded-sm"
                          autoFocus />
                        <span className="text-[#1B4332]/40 font-dm text-sm">MXN</span>
                      </div>
                    ) : (
                      <p className="font-cormorant text-[#52B788] text-2xl">{fmx(finalTotal)}</p>
                    )}
                    {form.ajustePrecio !== 0 && (
                      <button onClick={() => { setForm(f => ({ ...f, ajustePrecio: 0 })); setEditingTotal(false); }}
                        className="text-[10px] font-dm text-[#1B4332]/40 hover:text-[#1B4332] mt-1 underline">
                        Quitar el precio pactado (precio de lista: {fmx(calcTotal)})
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => { if (editingTotal) setEditingTotal(false); else { setTotalTexto(String(finalTotal)); setEditingTotal(true); } }}
                    className="flex items-center gap-1 border border-[#52B788]/40 text-[#52B788] px-2.5 py-1.5 text-xs font-dm hover:bg-[#52B788]/10 transition-colors rounded-sm">
                    {editingTotal ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                    {editingTotal ? "OK" : "Editar"}
                  </button>
                </div>
              </div>

              {/* Anticipo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">
                    {soloLecturaCobro ? "Cobrado" : "Anticipo recibido"}
                  </label>
                  {soloLecturaCobro ? (
                    <p className="font-cormorant text-xl pt-2.5 text-green-700">
                      {fmx(Number(form.depositoPagado) || 0)}
                    </p>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="text-[#1B4332]/40 font-dm text-sm">$</span>
                      <input type="number" min={0} value={form.depositoPagado}
                        onChange={e => setForm(f => ({ ...f, depositoPagado: e.target.value }))}
                        placeholder="0" className={inputCls} />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Saldo pendiente</label>
                  <p className={`font-cormorant text-xl pt-2.5 ${pendiente > 0 ? "text-orange-600" : "text-green-600"}`}>
                    {fmx(pendiente)}
                  </p>
                </div>
              </div>

              {soloLecturaCobro && (
                <p className="text-[11px] font-dm text-[#1B4332]/50 bg-[#FAFAF8] border border-[#1B4332]/10 rounded-sm px-3 py-2">
                  El dinero cobrado se registra con <span className="text-[#1B4332] font-medium">Registrar cobro</span> (el
                  billete 💵 en la lista de reservas): ahí se elige cómo entró, se
                  sube el comprobante y queda quién lo recibió.
                </p>
              )}

              {/* Método y folio */}
              <div className={`grid grid-cols-2 gap-3 ${soloLecturaCobro ? "hidden" : ""}`}>
                <div>
                  <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Método de pago</label>
                  <select value={form.metodoPago}
                    onChange={e => setForm(f => ({ ...f, metodoPago: e.target.value }))}
                    className={inputCls}>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Stripe">Stripe</option>
                    <option value="Tarjeta">Tarjeta (presencial)</option>
                    <option value="PayPal">PayPal</option>
                    <option value="—">—</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Folio / referencia</label>
                  <input type="text" value={form.folioPago} placeholder="TXN-00000 / —"
                    onChange={e => setForm(f => ({ ...f, folioPago: e.target.value }))} className={inputCls} />
                </div>
              </div>

              {/* ── Origen ───────────────────────────────────────────────────
                  El dato que faltaba para saber si el sitio vende o solo
                  informa: sin él, once reservas en el panel contra cuatro
                  compras en GA4 no se pueden explicar. */}
              <div>
                <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">¿Por dónde entró?</label>
                <select value={form.origen}
                  onChange={e => setForm(f => ({ ...f, origen: e.target.value ? origenValido(e.target.value) : "" }))}
                  className={`${inputCls} ${form.origen ? "" : "border-terracota/60"}`}
                  aria-invalid={!form.origen}>
                  <option value="">— Elige por dónde entró (obligatorio) —</option>
                  {ORIGENES_ELEGIBLES.map(o => (
                    <option key={o} value={o}>{ORIGEN_ETIQUETA[o]}</option>
                  ))}
                  {/* Una reserva vieja con un canal que ya no se ofrece lo conserva. */}
                  {form.origen && !(ORIGENES_ELEGIBLES as readonly string[]).includes(form.origen) && (
                    <option value={form.origen}>{ORIGEN_ETIQUETA[form.origen]}</option>
                  )}
                </select>
              </div>

              {/* ── Quién sale y en qué idioma ───────────────────────────────
                  El guía se escribe (los nombres cambian con la temporada),
                  pero el panel ofrece los que ya se han usado para no teclear
                  el mismo nombre de veinte formas distintas. */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Guía asignado</label>
                  <input type="text" list="guias-usados" value={form.guia} placeholder="Sin asignar"
                    onChange={e => setForm(f => ({ ...f, guia: e.target.value }))} className={inputCls} />
                  <datalist id="guias-usados">
                    {guiasConocidos.map(g => <option key={g} value={g} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Idioma del tour</label>
                  <select value={form.idiomaTour}
                    onChange={e => setForm(f => ({ ...f, idiomaTour: e.target.value === "en" ? "en" : "es" }))}
                    className={inputCls}>
                    <option value="es">Español</option>
                    <option value="en">Inglés</option>
                  </select>
                </div>
              </div>

              {/* Pickup */}
              <div>
                <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Lugar de recogida</label>
                <input type="text" value={form.pickupLugar} placeholder="Lobby de tu hotel en Xilitla"
                  onChange={e => setForm(f => ({ ...f, pickupLugar: e.target.value }))} className={inputCls} />
              </div>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="px-6 pb-5 pt-3 border-t border-[#1B4332]/8 flex items-center justify-between gap-3">
          {step > 1 ? (
            <button onClick={() => setStep(s => (s - 1) as 1 | 2 | 3)}
              className="flex items-center gap-1 text-xs font-dm text-[#1B4332]/50 hover:text-[#1B4332] px-3 py-2 border border-[#1B4332]/15 rounded-sm transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" />Atrás
            </button>
          ) : <div />}

          {step < 3 ? (
            <button
              onClick={() => setStep(s => (s + 1) as 1 | 2 | 3)}
              disabled={step === 1 ? !step1Valid : !step2Valid}
              className="flex items-center gap-1.5 bg-[#1B4332] hover:bg-[#2D5A45] text-white px-5 py-2 text-[11px] font-dm uppercase tracking-[1.5px] transition-colors disabled:opacity-40 rounded-sm">
              Siguiente <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button onClick={onSave} disabled={!canSave}
              className="bg-[#1B4332] hover:bg-[#2D5A45] text-white px-6 py-2.5 text-[11px] tracking-[2px] uppercase font-dm transition-colors disabled:opacity-40 rounded-sm">
              {saving ? "Guardando..." : "Guardar reserva"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
