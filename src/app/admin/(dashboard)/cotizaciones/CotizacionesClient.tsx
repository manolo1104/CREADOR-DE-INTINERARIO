"use client";

import DescuentoEditor from "@/components/admin/DescuentoEditor";
import { descuentoDeMeta, historialDeMeta, type Descuento, type EventoDescuento } from "@/lib/admin/descuento";
import { useState, useMemo, useEffect, useRef } from "react";
import { Aviso, AvisoFlotante } from "@/components/admin/AvisoFlotante";
import type { TourQuote } from "@prisma/client";
import { Plus, Mail, Download, Trash2, Search, MessageCircle, X, Pencil, Check, BedDouble, BookCheck, ChevronRight, ChevronLeft, Eye, BellRing, MapPin, FileText } from "lucide-react";
import { BadgesTour } from "../leads/etapas";
import { nombreDeTour } from "@/lib/admin/coloresTour";
import { TOURS_LISTA, cargoVallesDe, type Tour } from "@/lib/tours";
import {
  type PackageItem, type LineItem, calcPackageLine, calcTourLine, esTourVehiculo, vehiculoLineName,
  sincronizarNoches, AddOnsLinea, EMPTY_PACKAGE, HUESPEDES_POR_DEFECTO,
  aplicarHabitacion, SelectorHabitacion, ConceptoPersonalizado, NotasInternas,
  SLUG_PERSONALIZADO, esLineaPersonalizada, lineaCompleta, TrasladoVallesLinea, conTrasladoValles,
  EleccionLinea, eleccionPorOmision,
} from "@/components/admin/ReservaModal";
import CotizacionDetalle, { ChipPerdido } from "@/components/admin/CotizacionDetalle";
import { marcaPerdido, type MarcaPerdido } from "@/lib/cotizaciones/marcaPerdido";
import ConvertirReservaModal, { type DatosConversion, type ResultadoConversion } from "@/components/admin/ConvertirReservaModal";
import CobroModal, { type ReservaCobrable } from "@/components/admin/CobroModal";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HABITACION_POR_DEFECTO } from "@/lib/admin/habitacionesPanel";
import { playClick, playSuccess, playError } from "@/lib/admin/sfx";
import { addDaysYMD, hoyMX, ymdMX } from "@/lib/dates";
import { telefonoWhatsapp } from "@/lib/reviewRequest";
import {
  VIGENCIAS, calcularVencimiento, cuandoVence, diasParaVencer, etapaDe, etiquetaVence,
  fechaLimite, recordadoPorWhatsapp, urlRecordatorio, vigenciaDe,
} from "@/lib/vencimientoCotizacion";
import { avisoSoloLectura, mensajeTrasRegresar } from "@/lib/cotizaciones/reglasEnvio";
import { PAQUETES_PANEL, cargarPaquete } from "@/lib/admin/paquetesPanel";
import { Package } from "lucide-react";
import { grupoDe, grupoParaGuardar, lineasDe, type ConLineas, type LineaTour } from "@/lib/admin/reserva";
import ExtrasEditor from "@/components/admin/ExtrasEditor";
import { escapeHtml } from "@/lib/escapeHtml";
import { htmlCotizacion } from "@/lib/documentos/htmlCotizacion";
import {
  type ExtraItem, type PresetExtra, EXTRAS_PRESET, extrasDe, totalExtras,
  normalizarExtra,
} from "@/lib/admin/extras";

// «Expirada» se muestra «Vencida»: desde oct 2026 la pone también el cron
// cuando pasa la fecha límite (ver `vencimientoCotizacion.ts`).
const STATUS: Record<string, { label: string; cls: string }> = {
  borrador: { label: "Borrador",  cls: "bg-gray-100 text-gray-600"     },
  enviada:  { label: "Enviada",   cls: "bg-yellow-100 text-yellow-800" },
  aceptada: { label: "Aceptada",  cls: "bg-green-100 text-green-800"   },
  expirada: { label: "Vencida",   cls: "bg-red-100 text-red-700"       },
  // Borrador de más de 30 días que archivó el cron (`archivar-borradores`).
  archivada: { label: "Archivada", cls: "bg-gray-100 text-gray-400"     },
};

/** El color del «vence…»: verde con holgura, ámbar el último día, rojo vencida. */
function claseVence(dias: number): string {
  if (dias < 0)  return "text-red-600";
  if (dias <= 1) return "text-amber-600 font-semibold";
  return "text-[#40916C]";
}

const fmx    = (n: number) => `$${n.toLocaleString("es-MX")} MXN`;
const fDate  = (d: string) => d ? new Date(d + "T12:00:00").toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fDateL = (d: string) => { if (!d) return "—"; const r = new Date(d + "T12:00:00").toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); return r.charAt(0).toUpperCase() + r.slice(1); };

/** «hoy», «ayer» o «el 3 oct», para la marca de «recordado». */
function fRecordado(iso: string, hoy: string): string {
  const d = ymdMX(iso);
  if (d === hoy) return "hoy";
  if (d === addDaysYMD(hoy, -1)) return "ayer";
  return `el ${new Date(`${d}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}`;
}

const EMPTY_LINE: LineItem = { tourSlug: "", tourName: "", tourDate: "", adults: 2, childrenMid: 0, childrenSmall: 0, subtotal: 0 };
/** De dónde sale el cliente: decide el traslado, y el Corte marca las de Valles (`zonaDeReserva`). */
type ZonaCliente = "" | "xilitla" | "valles";
const ZONA_TEXTO: Record<Exclude<ZonaCliente, "">, string> = { xilitla: "Xilitla", valles: "Ciudad Valles" };
/** Lo guardado (del panel o lo que entendió el bot) → el botón que va prendido. */
function zonaDeTexto(t: unknown): ZonaCliente {
  const v = typeof t === "string" ? t : "";
  return /\bvalles\b|\b(?:ciudad|cd)\.?\s*valle\b/i.test(v) ? "valles" : /xilitla/i.test(v) ? "xilitla" : "";
}

/** Los recorridos que cobran el traslado desde Valles (hoy solo la Ruta Surrealista). */
const TOURS_CON_CARGO_VALLES = TOURS_LISTA.filter(t => cargoVallesDe(t) > 0);

const EMPTY_FORM = { customerName: "", customerEmail: "", customerPhone: "", notes: "", notasInternas: "", zona: "" as ZonaCliente };

function getMeta(pkgs: any[]): { anticipo?: number; vigencia?: string; numPersonas?: number | null; priceOverride?: number | null; discountType?: "percent" | "fixed"; discountValue?: number | null } {
  return pkgs.find((p: any) => p._meta) || {};
}
function cleanPackages(pkgs: any[]): PackageItem[] {
  return pkgs.filter((p: any) => !p._meta);
}

/**
 * La armó el bot de WhatsApp (`origen: "bot"` en el `_meta` de `packageItems`).
 * Se marca para que el equipo sepa que nadie la revisó antes de salir y que
 * el chat de ese cliente lo lleva el bot.
 */
function esDelBot(q: TourQuote): boolean {
  const pkgs = (q as any).packageItems;
  return Array.isArray(pkgs) && (getMeta(pkgs) as any).origen === "bot";
}

/** El chip «Bot»: discreto, con la misma forma que «Sin enviar». */
function ChipBot() {
  return (
    <span title="La armó y la envió el bot de WhatsApp"
      className="text-[9px] tracking-[0.5px] uppercase px-1.5 py-0.5 rounded font-dm bg-[#1B4332]/8 text-[#1B4332]/70 font-bold">
      Bot
    </span>
  );
}

// Mismo cálculo que las reservas (incluye tours por vehículo como el RZR).
const calcLine = calcTourLine;

/**
 * Escapa el texto libre que se inyecta en el HTML del PDF. Es el helper común
 * (`lib/escapeHtml`): el mismo que usan los correos, para que los dos escapen
 * igual lo que escribió el cliente o copió el bot.
 */
const esc = escapeHtml;

const inputCls = "w-full border border-[#1B4332]/15 text-[#1B4332] font-dm text-sm px-3 py-2.5 focus:outline-none focus:border-[#1B4332] rounded-sm placeholder:text-[#1B4332]/25 bg-white";

/** Lo que llega por la dirección desde la ficha de un lead: qué abrir al entrar. */
export interface InicioCotizaciones {
  editar?: string | null; convertir?: string | null; nueva?: boolean;
  lead?: { id: string; nombre: string; telefono: string | null; correo: string | null } | null;
}
/**
 * Del lead de cada cotización: su canal (se sugiere al convertir), su idioma
 * y, desde el 19 nov 2026, su etapa y motivo: la cotización de un lead
 * Perdido lleva la marca «Perdido · motivo» (`marcaPerdido.ts`).
 */
export type LeadsDeCotizaciones = Record<string, { canal: string; idioma: string; etapa?: string | null; motivoPerdida?: string | null }>;

/** Sin reservas: constante para que el valor por omisión no cambie en cada render. */
const SIN_RESERVAS: Record<string, string> = {};

/**
 * Los botones de ícono de las tarjetas del celular: 44 px para el dedo (19 nov
 * 2026). Antes eran íconos de 16 px sin relleno: costaba atinarles y el bote
 * de basura quedaba pegado a los demás.
 */
const iconoMovil = (color = "text-[#1B4332]/50 hover:text-[#1B4332]") =>
  `inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-sm active:bg-[#1B4332]/5 disabled:opacity-25 ${color}`;
const textoMovil = "inline-flex min-h-[44px] items-center px-2 text-[11px] font-dm text-[#1B4332]/60 hover:text-[#1B4332] underline";
/** Botón del celular con ícono Y nombre (20 nov 2026): «Abrir» y «Eliminar» se leen sin adivinar el ícono. */
const conNombreMovil = (color = "text-[#1B4332]/60 hover:text-[#1B4332]") =>
  `inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-sm px-2 text-[11px] font-dm active:bg-[#1B4332]/5 ${color}`;

/**
 * Los botones de la tabla de la compu (20 nov 2026): íconos en un cuadro de
 * 24 px y, en el renglón de abajo, las acciones con su nombre. Todo cabe en la
 * columna de Acciones, de ancho fijo: antes era una sola fila de ~290 px y, en
 * una pantalla de 1366 px, «Eliminar» quedaba fuera de la vista.
 */
const iconoTabla = (color = "text-[#1B4332]/40 hover:text-[#1B4332]") =>
  `inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-sm transition-colors hover:bg-[#1B4332]/5 disabled:opacity-25 ${color}`;
/** Sin color al pasar el cursor: cada botón pone el suyo (dos `hover:text-` juntos no se sabe cuál gana). */
const textoTabla = "inline-flex min-h-[24px] items-center whitespace-nowrap text-[11px] font-dm text-[#1B4332]/60 underline transition-colors";

/**
 * Una aceptada ya no se edita: se abre para VER (lote 4). Antes era un segundo
 * ojo igual al de «Vista previa», uno junto al otro (20 nov 2026): ahora es
 * «Abrir», con su ícono y su nombre.
 */
const TITULO_ABRIR = "Abrir la cotización para verla (ya es venta: se cambia en su reserva)";

/**
 * Los tours de una cotización como badges (20 nov 2026, regla de Manolo:
 * «siempre badges con colores y el acrónimo»): TODOS sus renglones, sin el
 * `_meta`. Antes se pintaba solo el primero con su nombre largo, y una de
 * TAM + SUR se veía como si fuera solo TAM. El nombre largo va en el `title`.
 */
function toursDe(x: ConLineas): { slugs: string[]; nombres: Record<string, string> } {
  const lineas = lineasDe(x).filter(l => l.tourSlug);
  const base: LineaTour[] = lineas.length ? lineas : [{ tourSlug: x.tourSlug, tourName: x.tourName }];
  const nombres: Record<string, string> = {};
  for (const l of base) {
    if (!l.tourSlug) continue;
    const nombre = l.tourName?.trim() || nombreDeTour(l.tourSlug);
    const antes = nombres[l.tourSlug];
    nombres[l.tourSlug] = !antes ? nombre : antes.includes(nombre) ? antes : `${antes} + ${nombre}`;
  }
  return { slugs: Object.keys(nombres), nombres };
}
function ToursDe({ x }: { x: ConLineas }) {
  const t = toursDe(x);
  return <BadgesTour slugs={t.slugs} nombres={t.nombres} />;
}

export default function CotizacionesClient(
  { initialQuotes, presetsExtras = EXTRAS_PRESET, verCostos = true, quien = "Admin", guiasConocidos = [], leads = {}, inicio = {}, pagadasSinReserva = {}, pagadoEnLinea = {}, reservasDeCotizaciones = SIN_RESERVAS }:
  { initialQuotes: TourQuote[]; presetsExtras?: PresetExtra[]; verCostos?: boolean; quien?: string; guiasConocidos?: string[]; leads?: LeadsDeCotizaciones; inicio?: InicioCotizaciones; pagadasSinReserva?: Record<string, number>; pagadoEnLinea?: Record<string, number>; reservasDeCotizaciones?: Record<string, string> },
) {
  const router = useRouter();
  const [quotes,         setQuotes]         = useState(initialQuotes);
  // Al recargar (`router.refresh`) llega también la lista de la base (20 nov
  // 2026): sin esto, la fila de una cotización que ya era reserva seguía
  // diciendo «Enviada», con «Marcar vencida», después del aviso del servidor (409).
  useEffect(() => { setQuotes(initialQuotes); }, [initialQuotes]);
  // El folio de la reserva viva de cada aceptada (lote 4, 5 nov 2026): el
  // aviso de «solo lectura» lo nombra y sin él se ofrece «Regresar a Enviada».
  const [reservasDe,     setReservasDe]     = useState(reservasDeCotizaciones);
  // Al recargar (`router.refresh`) llega lo de la base (19 nov 2026): la
  // reserva que se canceló en otra pestaña deja de esconder «Eliminar».
  useEffect(() => { setReservasDe(reservasDeCotizaciones); }, [reservasDeCotizaciones]);
  const folioReserva = (q: TourQuote): string | null => {
    const m = getMeta((q as any).packageItems ?? []) as any;
    return reservasDe[q.id] ?? (typeof m.reservaFolio === "string" && m.reservaFolio ? m.reservaFolio : null);
  };
  /**
   * La reserva VIVA de la cotización (19 nov 2026): con ella no se ofrece
   * «Eliminar», igual que el servidor (409). Solo la que la base dio por viva;
   * el folio que quedó en el `_meta` de una reserva ya cancelada no cuenta: esa
   * cotización sí se puede eliminar.
   */
  const reservaViva = (q: TourQuote): string | null => reservasDe[q.id] ?? null;
  // La marca «Perdido» (19 nov 2026): sale de la etapa de su lead, no se guarda
  // en la cotización. Sin correos automáticos y fuera de «Por vencer».
  const marcaDe = (q: TourQuote): MarcaPerdido | null => marcaPerdido(q.oportunidadId ? leads[q.oportunidadId] : null, q.status);
  /** «Marcar vencida» solo donde cambia algo: la vencida ya lo está y la aceptada ya es venta. */
  const puedeVencer = (q: TourQuote) => q.status === "borrador" || q.status === "enviada";
  // «Regresar a Enviada»: solo la aceptada que no es reserva ni tiene un pago
  // por liga (la que el cron de antes marcó por la reserva de otra cotización).
  const regresable = (q: TourQuote) => q.status === "aceptada" && !folioReserva(q) && !((pagadasSinReserva[q.id] ?? 0) > 0);
  /** Lo que hace el sobre, dicho antes de pulsarlo (lote 4, 5 nov 2026). */
  const tituloCorreo = (q: TourQuote) =>
    q.status === "aceptada" ? "Reenviar una copia por correo (no cambia nada)"
    : !q.customerEmail ? "Sin correo del cliente: la copia te llega a ti y no cuenta como enviada"
    : "Enviar por correo";
  // Abierta en «solo lectura»: una aceptada ya no se edita (su reserva sí).
  const [avisoLectura,   setAvisoLectura]   = useState<string | null>(null);
  // Se puede convertir: borrador o enviada, o cualquiera con una liga pagada
  // que aún no tiene reserva (5 nov 2026: ya hay dinero, aunque haya vencido).
  // Si la lista está vieja y ya era reserva, el servidor lo dice sin crear otra.
  const convertible = (q: TourQuote) => q.status === "borrador" || q.status === "enviada" || (pagadasSinReserva[q.id] ?? 0) > 0;
  // Convertir a reserva pide lo que falta (3 nov 2026) y, si ya pagó, abre el cobro.
  const [convirtiendo,   setConvirtiendo]   = useState<TourQuote | null>(null);
  const [cobrando,       setCobrando]       = useState<ReservaCobrable | null>(null);
  // Lo que el servidor dijo al convertir y alguien tiene que leer (ya era
  // reserva, sobrecupo, el mismo cliente…): se queda hasta «Entendido».
  const [avisosConv,     setAvisosConv]     = useState<string[]>([]);
  // La cotización nueva que se abrió desde la ficha de un lead queda enlazada a él.
  const [paraLead,       setParaLead]       = useState<string | null>(null);
  const leadVuelta = inicio.lead ?? null;
  const [detalle,        setDetalle]        = useState<TourQuote | null>(null);
  const [search,         setSearch]         = useState("");
  const [modal,          setModal]          = useState<"new" | "edit" | null>(null);
  const [editTarget,     setEditTarget]     = useState<TourQuote | null>(null);
  const [form,           setForm]           = useState(EMPTY_FORM);
  const [lines,          setLines]          = useState<LineItem[]>([{ ...EMPTY_LINE }]);
  const [packages,       setPackages]       = useState<PackageItem[]>([]);
  const [extras,         setExtras]         = useState<ExtraItem[]>([]);
  const [priceOverride,  setPriceOverride]  = useState<string>("");
  const [editingPrice,   setEditingPrice]   = useState(false);
  // Descuento
  const [discountType,   setDiscountType]   = useState<"percent" | "fixed">("percent");
  const [discountValue,  setDiscountValue]  = useState<string>("");
  // Lo que ya está guardado del descuento (sello y cambios): solo se lee. Ver `descuento.ts`.
  const [descuentoGuardado,  setDescuentoGuardado]  = useState<Descuento | null>(null);
  const [descuentoHistorial, setDescuentoHistorial] = useState<EventoDescuento[]>([]);
  // Código de cumpleaños que respalda el descuento (21 oct 2026). Aquí solo se
  // valida; se marca como usado cuando la cotización se vuelve reserva.
  const [codigoCumple,   setCodigoCumple]   = useState<string>("");
  const [anticipoTipo,   setAnticipoTipo]   = useState<"percent" | "fixed">("percent");
  const [anticipoValor,  setAnticipoValor]  = useState<string>("");
  // 48 h por omisión SOLO en las nuevas (decisión de oct 2026, igual que el
  // bot). Las viejas sin vigencia guardada se siguen leyendo como 7 días.
  const [vigencia,       setVigencia]       = useState<string>("48h");
  // Fecha límite editable a mano. Vacía = la regla de siempre (al enviar).
  const [venceEdit,      setVenceEdit]      = useState<string>("");
  const [numPersonas,    setNumPersonas]    = useState<string>("");
  const [saving,         setSaving]         = useState(false);
  const [sending,        setSending]        = useState<string | null>(null);
  const [msg,            setMsg]            = useState("");
  // El reloj del aviso: uno nuevo reinicia la cuenta (antes, el reloj del anterior lo borraba antes de tiempo).
  const relojAviso = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [step,           setStep]           = useState<1 | 2 | 3>(1);
  const [statusFilter,   setStatusFilter]   = useState<"all" | "borrador" | "enviada" | "por-vencer" | "aceptada" | "expirada" | "perdidas" | "archivada" | "bot">("all");
  const [sortBy,         setSortBy]         = useState<"reciente" | "tourDate" | "monto" | "vence">("reciente");

  // «Hoy» en México: de aquí salen el «vence…», la franja y los mensajes.
  const hoy = hoyMX();

  // Ruta Surrealista desde Ciudad Valles: +$400 POR RESERVA (Manolo, 20 oct
  // 2026). Lo decide «¿De dónde sale el cliente?»: con Valles se pone solo en
  // su línea y con Xilitla se quita. Los demás tours no cambian.
  useEffect(() => {
    setLines(ls => {
      const nuevas = ls.map(l => conTrasladoValles(l, form.zona === "valles"));
      return nuevas.some((l, i) => l !== ls[i]) ? nuevas : ls;
    });
  }, [form.zona, lines]);

  const toursTotal = lines.reduce((s, l) => s + calcLine(l), 0);
  const pkgsTotal  = packages.reduce((s, p) => s + calcPackageLine(p), 0);
  const extrasTotal = totalExtras(extras);
  // Cuánta gente va, para llenar solo la cantidad de los extras que se cobran
  // por cabeza. Es el grupo (máximo por tour), nunca la suma de los tours.
  const grupoActual   = grupoParaGuardar(lines, numPersonas);
  const personasGrupo = Number(numPersonas) || (grupoActual.adults + grupoActual.children);
  const calcTotal  = toursTotal + pkgsTotal + extrasTotal;
  const baseTotal  = priceOverride !== "" ? Number(priceOverride) || 0 : calcTotal;
  const discountAmt = discountValue !== ""
    ? discountType === "percent"
      ? Math.round(baseTotal * (Number(discountValue) / 100))
      : Number(discountValue) || 0
    : 0;
  const finalTotal = Math.max(0, baseTotal - discountAmt);
  // El anticipo se puede fijar de las dos formas: "el 30 %" o "$4,000".
  // En porcentaje se recalcula solo si cambia el total; en monto se respeta el
  // número tal cual. Vacío = el 30 %: desde oct 2026 es el anticipo único
  // (bot, carrito, correo y panel). Antes era la mitad.
  const anticipoNum = anticipoValor === ""
    ? Math.round(finalTotal * 0.3)
    : anticipoTipo === "percent"
      // Se topa en el total en las dos formas: un "150 %" tecleado sin querer
      // no debe pedirle al cliente más dinero del que cuesta el viaje.
      ? Math.min(finalTotal, Math.round(finalTotal * ((Number(anticipoValor) || 0) / 100)))
      : Math.min(Number(anticipoValor) || 0, finalTotal);
  const anticipoPct = finalTotal > 0 ? Math.round((anticipoNum / finalTotal) * 100) : 0;
  const saldoRestante = Math.max(0, finalTotal - anticipoNum);

  const esFecha = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

  /**
   * Al tocar un renglón, el precio editado se suelta y el total vuelve a la
   * suma de lista. En una cotización del bot ese total era el que cobra la web
   * (viajero solo): se avisa, para que el total no cambie sin que nadie lo vea.
   */
  function soltarPrecioEditado() {
    if (priceOverride === "") return;
    if (editTarget && esDelBot(editTarget)) {
      flash("⚠️ Este total venía del bot (el precio de la web). Al cambiar renglones se recalcula a precio de lista: revisa el total antes de guardar.");
    }
    setPriceOverride("");
  }

  function updateLine(i: number, field: keyof LineItem, val: string | number) {
    setLines(ls => {
      const next = ls.map((l, idx) => {
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
          up.subtotal = calcLine(up);
          return up;
        }
        delete up.precioPersona;
        up.tourName = t?.nombre || "";
        // Ruta Acuática: entra marcada Siete Cascadas (sin extra) y Erick cambia
        // a Tamasopo (+$230 por persona) si el cliente la pide. Otro tour, sin elección.
        delete up.eleccion;
        const omision = eleccionPorOmision(String(val));
        if (omision) up.eleccion = omision;
        if (t?.precioUnidad === "vehiculo" && t.rutas && t.flota) {
          up.ruta = t.rutas[0].nombre; up.vehiculo = t.flota[0].nombre; up.unidades = 1;
          up.adults = 0; up.childrenMid = 0; up.childrenSmall = 0; up.infants = 0;
        } else {
          delete up.ruta; delete up.vehiculo; delete up.unidades;
          up.adults = Math.max(1, up.adults || 2);
        }
      }
      if (field === "adults")        up.adults        = Math.max(1, Number(val) || 1);
      if (field === "childrenMid")   up.childrenMid   = Math.max(0, Number(val) || 0);
      if (field === "childrenSmall") up.childrenSmall = Math.max(0, Number(val) || 0);
      if (field === "infants")       up.infants       = Math.max(0, Number(val) || 0);
      if (field === "unidades")      up.unidades      = Math.max(1, Number(val) || 1);
      if (field === "precioPersona") up.precioPersona = Math.max(0, Number(val) || 0);
      if (esTourVehiculo(up.tourSlug)) up.tourName = vehiculoLineName(up);
      up.subtotal = calcLine(up);
      return up;
      });

      // Un viaje se arma en días seguidos: al poner la fecha de un recorrido,
      // los que van DESPUÉS se acomodan al día siguiente, y al siguiente.
      // Solo hacia abajo: los recorridos de arriba ya se decidieron, y pisarlos
      // convertiría corregir una fecha en rehacer el itinerario entero.
      if (field === "tourDate" && esFecha(val)) {
        for (let j = i + 1; j < next.length; j++) {
          next[j] = { ...next[j], tourDate: addDaysYMD(val, j - i) };
        }
      }
      return next;
    });
    // Cambiar solo la fecha no mueve el precio (lote 4, 5 nov 2026): el precio
    // pactado se queda. Antes el total brincaba a la suma de lista.
    if (field !== "tourDate") soltarPrecioEditado();
  }

  /** Editar una habitación. Entrada, noches y salida quedan siempre cuadradas. */
  function updatePkg(i: number, campo: keyof PackageItem, valor: string | number) {
    setPackages(ps => ps.map((p, idx) => {
      if (idx !== i) return p;
      if (campo === "habitacion") return aplicarHabitacion(p, String(valor));
      if (campo === "huespedes")  return aplicarHabitacion(p, p.habitacion, Number(valor));
      const up = { ...p, [campo]: valor } as PackageItem;
      if (campo === "checkin" || campo === "checkout" || campo === "noches") {
        return sincronizarNoches(up, campo);
      }
      up.subtotal = calcPackageLine(up);
      return up;
    }));
    // Mover la entrada conserva las noches: el precio no cambia (lote 4).
    if (campo !== "checkin") soltarPrecioEditado();
  }

  /**
   * Cargar un paquete completo de un clic: sus recorridos en días seguidos y
   * sus noches de hotel. Reemplaza lo que hubiera —de eso avisa el aviso— y
   * respeta la fecha de inicio y el número de adultos que ya estaban puestos.
   */
  function cargarPaquetePanel(slug: string) {
    const fechaInicio = lines.map(l => l.tourDate).filter(Boolean).sort()[0] || "";
    const adultos     = Number(numPersonas) || Math.max(...lines.map(l => l.adults || 0), 2);
    const carga = cargarPaquete(
      slug, fechaInicio, adultos,
      HABITACION_POR_DEFECTO.tarifas[HUESPEDES_POR_DEFECTO] ?? 0, HABITACION_POR_DEFECTO.label,
      EMPTY_PACKAGE.hotel,
    );
    if (!carga) { flash("❌ No se encontró ese paquete"); return; }

    setLines(carga.lineas.map(l => ({ ...l, subtotal: calcLine(l) })));
    // `cargarPaquete` reparte a dos por habitación: ésa es la ocupación con la
    // que se cotizó, y la que decide el escalón de tarifa si luego se cambia.
    setPackages([{ ...carga.habitacion, huespedes: HUESPEDES_POR_DEFECTO }]);
    if (numPersonas === "") setNumPersonas(String(adultos));
    setPriceOverride("");
    const nombre = PAQUETES_PANEL.find(p => p.slug === slug)?.nombre ?? slug;
    flash(
      carga.eleccion
        ? (carga.eleccion.dia === undefined
            // Paquete a la carta: no hay un día suelto, se precargan varios.
            ? `✅ ${nombre} cargado · quedó con ${carga.eleccion.elegido}${carga.eleccion.alternativa ? `; también puedes ofrecer ${carga.eleccion.alternativa}` : ""}`
            : `✅ ${nombre} cargado · el día ${carga.eleccion.dia} quedó con ${carga.eleccion.elegido}; la otra opción es ${carga.eleccion.alternativa}`)
        : `✅ ${nombre} cargado · revisa fechas y personas`,
    );
  }

  /** La habitación nueva entra el día del primer tour y sale a las noches que dure. */
  function addPackage() {
    const primeraFecha = lines.map(l => l.tourDate).filter(Boolean).sort()[0] || "";
    setPackages(ps => [...ps, sincronizarNoches({ ...EMPTY_PACKAGE, checkin: primeraFecha }, "checkin")]);
    soltarPrecioEditado();
  }

  function addLine() {
    setLines(ls => {
      // El recorrido nuevo nace el día después del último con fecha.
      const ultima = [...ls].reverse().find(l => esFecha(l.tourDate))?.tourDate;
      return [...ls, { ...EMPTY_LINE, tourDate: ultima ? addDaysYMD(ultima, 1) : "" }];
    });
  }
  function removeLine(i: number) { if (lines.length > 1) setLines(ls => ls.filter((_, idx) => idx !== i)); }

  /**
   * El aviso flota a la vista (20 nov 2026): 10 s si salió bien y 15 s si no,
   * o hasta que lo cierren. Antes duraba 5 s arriba de la página y, con la
   * lista bajada, no se veía.
   */
  function flash(m: string) {
    setMsg(m);
    if (m.startsWith("✅")) playSuccess();
    else if (m.startsWith("❌")) playError();
    if (relojAviso.current) clearTimeout(relojAviso.current);
    relojAviso.current = setTimeout(() => setMsg(""), m.startsWith("✅") ? 10000 : 15000);
  }
  function cerrarAviso() {
    if (relojAviso.current) clearTimeout(relojAviso.current);
    setMsg("");
  }

  function openNew(lead?: InicioCotizaciones["lead"]) {
    // El aviso de la lista no entra al editor (revisión del 20 nov 2026): junto
    // a «Guardar», un «❌ …» de otra cotización parecía un error al guardar.
    cerrarAviso();
    setEditTarget(null);
    setAvisoLectura(null);
    setParaLead(lead?.id ?? null);
    setForm(lead ? { ...EMPTY_FORM, customerName: lead.nombre, customerPhone: lead.telefono ?? "", customerEmail: lead.correo ?? "" } : EMPTY_FORM);
    setLines([{ ...EMPTY_LINE }]);
    setPackages([]);
    setExtras([]);
    setPriceOverride(""); setDiscountValue(""); setDiscountType("percent");
    setDescuentoGuardado(null); setDescuentoHistorial([]); setCodigoCumple("");
    setAnticipoTipo("percent"); setAnticipoValor(""); setVigencia("48h"); setNumPersonas("");
    setVenceEdit("");
    setStep(1);
    setModal("new");
  }

  function openEdit(q: TourQuote) {
    cerrarAviso(); // El de la lista no entra al editor (ver `openNew`).
    setEditTarget(q);
    // Una aceptada se abre para VER, con el aviso de dónde se cambia (lote 4).
    setAvisoLectura(avisoSoloLectura(q, folioReserva(q)));
    const metaNotas = getMeta((q as any).packageItems ?? []) as any;
    setForm({
      customerName:  q.customerName,
      customerEmail: q.customerEmail || "",
      customerPhone: q.customerPhone || "",
      notes:         q.notes || "",
      notasInternas: metaNotas.notasInternas || "",
      zona:          zonaDeTexto(metaNotas.zonaHospedaje),
    });
    // El `_meta` de seguimiento viaja dentro de `lineItems`: no es una línea de
    // tour. Antes entraba al editor como renglón vacío y el guardado se negaba
    // («Completa el concepto…») en toda cotización ya enviada por correo.
    const storedLines = ((q as any).lineItems as any[] | null)?.filter(l => l && !l._meta) ?? null;
    const editLines: LineItem[] = storedLines?.length
      ? storedLines.map(l => ({
          ...l,
          // Sin desglose (renglón viejo): los menores son el tramo de antes.
          childrenMid:   l.childrenMid   ?? (l.childrenSmall === undefined && l.infants === undefined ? (l.children ?? 0) : 0),
          childrenSmall: l.childrenSmall ?? 0,
        }))
      : [{ tourSlug: q.tourSlug, tourName: q.tourName, tourDate: q.tourDate, adults: q.adults, childrenMid: q.children ?? 0, childrenSmall: 0, subtotal: q.totalAmount }];
    setLines(editLines);
    const rawPkgs = (q as any).packageItems ?? [];
    const meta = getMeta(rawPkgs);
    const editPkgs = cleanPackages(rawPkgs);
    setPackages(editPkgs);
    const editExtras = extrasDe((q as any).extraItems);
    setExtras(editExtras);
    // Formato nuevo: se guardó si fue % o monto. Las cotizaciones viejas solo
    // tienen el importe, así que se restauran como monto fijo.
    if ((meta as any).anticipoTipo) {
      setAnticipoTipo((meta as any).anticipoTipo === "fixed" ? "fixed" : "percent");
      setAnticipoValor((meta as any).anticipoValor != null ? String((meta as any).anticipoValor) : "");
    } else {
      setAnticipoTipo("fixed");
      setAnticipoValor(meta.anticipo != null ? String(meta.anticipo) : "");
    }
    setVigencia(meta.vigencia || "7dias");
    setVenceEdit(fechaLimite(q) ?? "");
    setNumPersonas(meta.numPersonas ? String(meta.numPersonas) : "");

    // Restaurar precio editado y descuento.
    const calc = editLines.reduce((s, l) => s + calcLine(l), 0)
               + editPkgs.reduce((s, p) => s + calcPackageLine(p), 0)
               + totalExtras(editExtras);
    // El descuento guardado, con su candado y su historial (ver `descuento.ts`).
    const descuento = descuentoDeMeta(meta as any);
    setDescuentoGuardado(descuento);
    setDescuentoHistorial(historialDeMeta(meta as any));
    setCodigoCumple(typeof (meta as any).codigoCumple === "string" ? (meta as any).codigoCumple : "");
    if (meta.priceOverride != null || meta.discountValue != null || descuento) {
      // Formato nuevo: descuento y precio editado guardados explícitamente.
      setPriceOverride(meta.priceOverride != null ? String(meta.priceOverride) : "");
      setDiscountType(descuento?.tipo ?? (meta.discountType === "fixed" ? "fixed" : "percent"));
      setDiscountValue(descuento ? String(descuento.valor) : "");
    } else {
      // Cotizaciones viejas (sin descuento guardado): preservar el total como precio editado.
      setPriceOverride(q.totalAmount !== calc ? String(q.totalAmount) : "");
      setDiscountValue(""); setDiscountType("percent");
    }
    setStep(1);
    setModal("edit");
  }

  // El aviso que era del editor se va con él: no se queda flotando sobre la lista.
  function closeModal() { setModal(null); setEditTarget(null); setParaLead(null); cerrarAviso(); }

  // Desde la ficha del lead: «Editar cotización», «Convertir a reserva» o
  // «Nueva cotización» abren aquí directo lo que se pidió (una sola vez).
  const [inicioHecho, setInicioHecho] = useState(false);
  useEffect(() => {
    if (inicioHecho) return;
    setInicioHecho(true);
    const q = initialQuotes.find(x => x.id === (inicio.editar || inicio.convertir));
    if (inicio.editar && q) openEdit(q);
    // Solo una que todavía se puede convertir: recargar la página tras
    // convertirla ya no abre otra vez el cuadro (y no nace otra reserva).
    else if (inicio.convertir && q && convertible(q)) setConvirtiendo(q);
    else if (inicio.nueva) openNew(inicio.lead);
    // Se quita de la dirección: Atrás/Adelante o recargar no lo repiten.
    if (inicio.editar || inicio.convertir || inicio.nueva) router.replace("/admin/cotizaciones", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveQuote() {
    if (avisoLectura) return; // Solo lectura: una aceptada se cambia en su reserva.
    if (!form.customerName.trim()) { flash("❌ El nombre del cliente es obligatorio"); return; }
    if (!lines.every(lineaCompleta)) { flash("❌ Completa el concepto y la fecha en cada línea"); return; }
    if (form.customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customerEmail)) { flash("❌ El correo no tiene un formato válido"); return; }
    setSaving(true);
    const lineas       = lines.map(l => ({ ...l, subtotal: calcLine(l) }));
    // 🔴 El `_meta` de seguimiento (cuándo se envió, qué paso va, la fecha
    // límite) ya NO viaja desde aquí: lo conserva el servidor (lote 4, 5 nov
    // 2026). Esta copia podía ser vieja —la cotización se mandó por correo sin
    // recargar— y al guardar borraba la fecha límite y el seguimiento. Solo se
    // dice la fecha límite nueva si se movió a mano: los recordatorios de la
    // anterior ya no cuentan, y una Vencida con fecha nueva vuelve a Enviada.
    const venceAntes   = editTarget ? fechaLimite(editTarget) ?? "" : "";
    const venceCambio  = modal === "edit" && /^\d{4}-\d{2}-\d{2}$/.test(venceEdit) && venceEdit !== venceAntes;
    const lineItems    = lineas;
    const reactivar    = venceCambio && editTarget?.status === "expirada" && venceEdit >= hoyMX();
    const extraItems   = extras.filter(e => e.concepto.trim()).map(normalizarExtra);
    const packageItems = [
      {
        // Al editar se conserva lo que el panel no captura (`origen`, `waChatId`,
        // `waTelefono`, `locale`… de las que armó el bot): sin esto, corregir
        // una cotización del bot le borraba la etiqueta «Bot» y el chat al que
        // pertenece. Lo que sí se captura aquí va después y manda. Solo el
        // `_meta: true` de verdad: el viejo `_meta: "cotizado"` era un hotel.
        ...(modal === "edit" && editTarget
          ? [getMeta((editTarget as any).packageItems ?? [])].filter((m: any) => m._meta === true)[0] ?? {}
          : {}),
        // `anticipo` sigue siendo el IMPORTE: es lo que leen el PDF, el correo
        // y la reserva. El tipo y el valor van aparte solo para poder reabrir
        // la cotización y ver "30 %" en vez de un número suelto.
        _meta: true, anticipo: anticipoNum, vigencia,
        anticipoTipo,
        anticipoValor: anticipoValor !== "" ? Number(anticipoValor) : null,
        // Tamaño real del grupo (el mismo grupo va a todos los tours; no se suma por tour).
        numPersonas: numPersonas !== "" ? Number(numPersonas) : null,
        // Guardar el precio editado y el descuento para restaurarlos al reabrir.
        priceOverride: priceOverride !== "" ? Number(priceOverride) : null,
        discountType,
        discountValue: discountValue !== "" ? Number(discountValue) : null,
        // El descuento dicho siempre (también «sin descuento»): el servidor lo
        // sella con quién lo puso o lo cambió (ver `descuento.ts`).
        descuento: Number(discountValue) > 0 ? { tipo: discountType, valor: Math.round(Number(discountValue)) } : null,
        // Viaja en el `_meta` y NO en la columna `notes`: `notes` se imprime en
        // el correo y en el PDF del cliente, y esto no puede salir de aquí.
        notasInternas: form.notasInternas.trim(),
        // De dónde sale el cliente (Manolo, 20 oct 2026): el mismo campo en que
        // el bot guarda lo que entendió, para que la reserva y el Corte lo lean
        // igual. Sin elegir, se queda lo que hubiera.
        ...(form.zona ? { zonaHospedaje: ZONA_TEXTO[form.zona] } : {}),
        codigoCumple: codigoCumple || null,
      },
      ...packages.map(p => ({ ...p, subtotal: calcPackageLine(p) })),
    ];
    const payload = {
      tourName: lines.map(l => l.tourName).join(" + "), tourSlug: lines[0].tourSlug,
      tourDate: lines[0].tourDate,
      // El grupo, NO la suma por tour (ver src/lib/admin/reserva.ts).
      ...grupoParaGuardar(lines, numPersonas),
      totalAmount: finalTotal, lineItems, packageItems, extraItems,
      customerName: form.customerName, customerEmail: form.customerEmail,
      customerPhone: form.customerPhone, notes: form.notes,
      ...(venceCambio ? { venceEl: venceEdit } : {}),
      ...(reactivar ? { status: "enviada" } : {}),
      ...(modal === "new" && paraLead ? { oportunidadId: paraLead } : {}),
    };

    let r: Response;
    if (modal === "edit" && editTarget) {
      r = await fetch(`/api/admin/cotizaciones/${editTarget.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
    } else {
      r = await fetch("/api/admin/cotizaciones", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
    }

    if (r.ok) {
      const creada = modal === "edit" ? null : await r.json().catch(() => null);
      const ref = await fetch("/api/admin/cotizaciones");
      setQuotes(await ref.json());
      closeModal();
      flash(modal === "edit" ? "✅ Cotización actualizada · su lead ya tiene los datos nuevos"
        // Su lead anterior estaba Operado o Perdido: la venta nueva no se queda ahí (5 nov 2026).
        // Crear la cotización lleva el lead a Cotizado (regla de Manolo, 19 nov 2026); antes, Calificado.
        : creada?.leadNuevo ? "✅ Cotización creada · su lead anterior ya estaba cerrado: se le abrió uno nuevo en Cotizado"
        : "✅ Cotización creada · su lead pasa a Cotizado (si ya iba más adelante, se queda donde está)");
      // La ficha del lead lee estos datos: que no se quede con los de antes.
      router.refresh();
    } else {
      const d = await r.json().catch(() => ({}));
      const msg = d.error || `Error ${r.status}`;
      flash(`❌ Error al guardar: ${msg}`);
      alert(`❌ Error al guardar cotización:\n${msg}`);
    }
    setSaving(false);
  }

  async function sendEmail(id: string) {
    setSending(id);
    const r = await fetch(`/api/admin/cotizaciones/${id}/send-email`, { method: "POST" }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    if (r?.ok) {
      // 🔴 Lo que pasó DE VERDAD (lote 4, 5 nov 2026): una aceptada recibe una
      // copia y no cambia; sin correo del cliente solo le llega al equipo. Y la
      // cotización como quedó en el servidor, con su fecha límite y su
      // seguimiento: con la copia de antes, editarla después los borraba.
      setQuotes(q => q.map(x => x.id === id ? { ...x, status: d.status ?? x.status, lineItems: d.lineItems ?? (x as any).lineItems } : x));
      flash(typeof d.mensaje === "string" ? d.mensaje : "✅ Correo enviado");
      router.refresh();
    } else {
      flash(`❌ ${d.error || "No se pudo enviar el correo"}`);
    }
    setSending(null);
  }

  /**
   * «Regresar a Enviada» (lote 4, 5 nov 2026): la aceptada que no es reserva
   * ni tiene un pago por liga —la que el cron de antes marcó por la reserva de
   * otra cotización del mismo correo— vuelve a poder convertirse o cobrarse.
   * El servidor revisa otra vez que no sea reserva.
   */
  async function regresarAEnviada(q: TourQuote) {
    if (!confirm(`¿Regresar ${q.quoteNumber} a Enviada?\n\nÚsalo solo si se marcó Aceptada por error (el cliente no reservó esta cotización). Deja de contar como aceptada y se podrá convertir o cobrar.`)) return;
    const r = await fetch(`/api/admin/cotizaciones/${q.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "enviada" }),
    }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    if (r?.ok) {
      const nueva = { ...q, status: "enviada", aceptadaEn: null, lineItems: d.lineItems ?? (q as any).lineItems } as TourQuote;
      setQuotes(qs => qs.map(x => x.id === q.id ? nueva : x));
      flash(mensajeTrasRegresar(fechaLimite(nueva), hoy));
      router.refresh();
    } else {
      flash(`❌ ${d.error || "No se pudo regresar a Enviada"}`);
    }
  }

  /** Un borrador archivado por el cron vuelve a ser borrador. */
  async function desarchivar(id: string) {
    const r = await fetch(`/api/admin/cotizaciones/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "borrador" }),
    }).catch(() => null);
    if (r?.ok) {
      setQuotes(q => q.map(x => x.id === id ? { ...x, status: "borrador" } : x));
      flash("✅ Cotización desarchivada: vuelve a Borrador");
      router.refresh();
    } else {
      flash("❌ No se pudo desarchivar");
    }
  }

  /**
   * «Marcar vencida» NO la elimina (19 nov 2026): sigue en la lista como
   * Vencida. Antes era una X sin palabras junto al bote de basura y parecía
   * que «eliminar» no hacía nada; ahora el botón lo dice y el aviso también.
   */
  async function expireQ(q: TourQuote) {
    if (!confirm(`¿Marcar la cotización ${q.quoteNumber} de ${q.customerName} como vencida?\n\nNo se borra: sigue en la lista como Vencida y su liga de pago deja de poder pagarse. Para quitarla de la lista usa «Eliminar».`)) return;
    const r = await fetch(`/api/admin/cotizaciones/${q.id}`, { method: "DELETE" }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    if (r?.ok) {
      setQuotes(qs => qs.map(x => x.id === q.id ? { ...x, status: "expirada" } : x));
      // Su liga sin pagar se apaga sola (lote 3, 5 nov 2026): que se note.
      flash(`✅ Cotización marcada como vencida${d?.ligasApagadas > 0 ? " · su liga de pago ya no se puede pagar" : ""}`);
      router.refresh();
    } else if (r?.status === 404) {
      // Alguien más la eliminó: ya no hay nada que marcar.
      setQuotes(qs => qs.filter(x => x.id !== q.id));
      flash(`❌ ${d.error || "Esa cotización ya no existe."}`);
      router.refresh();
    } else {
      // Lo que dijo el servidor (por ejemplo, que ya es una reserva), no un error genérico.
      flash(`❌ ${d.error || (r ? "No se pudo marcar como vencida" : "No se pudo marcar como vencida: revisa tu conexión e intenta de nuevo")}`);
      // La lista estaba vieja (20 nov 2026): se recarga y la fila toma su estado real.
      if (r?.status === 409) router.refresh();
    }
  }

  /**
   * Convertir a reserva (lote 1 de la auditoría, 5 nov 2026): la crea el
   * SERVIDOR, con candado sobre la cotización. Antes este navegador creaba la
   * reserva y luego marcaba la cotización: con la lista vieja, dos personas a
   * la vez o la liga ya pagada, nacía una segunda reserva y el anticipo se
   * capturaba otra vez. Si ya tenía reserva, el servidor contesta esa y lo
   * dice; «Registrar cobro» solo se abre si de verdad falta registrar el pago.
   */
  async function convertToReserva(q: TourQuote, datos: DatosConversion): Promise<ResultadoConversion> {
    const r = await fetch(`/api/admin/cotizaciones/${q.id}/convertir`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    if (!r?.ok || !d?.reserva) {
      return { ok: false, error: d?.error || "No se pudo crear la reserva. Revisa la conexión e intenta de nuevo.", puedeForzar: d?.puedeForzar === true };
    }
    // El servidor ya la dejó «aceptada» (o ya lo estaba): la lista lo refleja.
    setQuotes(qs => qs.map(x => x.id === q.id ? { ...x, status: d.cotizacion?.status || "aceptada" } : x));
    // Y su reserva: «Editar» la abre para ver y dice dónde se cambia (lote 4).
    if (typeof d.reserva?.confirmationNumber === "string") setReservasDe(m => ({ ...m, [q.id]: d.reserva.confirmationNumber }));
    setConvirtiendo(null);
    router.refresh();
    const avisos: string[] = Array.isArray(d.avisos) ? d.avisos.map(String) : [];
    if (d.nueva) {
      flash(`✅ ${d.mensaje}`);
      setAvisosConv(avisos);
    } else {
      // Ya era reserva: no se creó otra. Se queda a la vista hasta que alguien lo lea.
      setAvisosConv([String(d.mensaje), ...avisos]);
    }
    if (d.abrirCobro) {
      const b = d.reserva;
      setCobrando({ id: b.id, confirmationNumber: b.confirmationNumber, customerName: b.customerName, totalAmount: b.totalAmount, depositoPagado: b.depositoPagado, stripePaymentIntentId: b.stripePaymentIntentId, lineItems: b.lineItems });
    }
    return { ok: true };
  }

  /**
   * Eliminar de verdad. 19 nov 2026 (Manolo: «no puedo eliminar
   * cotizaciones»): el aviso dice cuál se borra y que no se deshace; si el
   * servidor no la borra, se enseña su motivo (antes, «No se pudo eliminar» a
   * secas). La que ya es una reserva viva no se elimina (409): se cancela la
   * reserva con su motivo. La que ya no existía se quita de la lista (404).
   */
  async function hardDeleteQ(q: TourQuote) {
    const yaPerdida = !!marcaDe(q);
    if (!confirm(`¿Eliminar la cotización ${q.quoteNumber} de ${q.customerName}?\n\nSe borra y no se puede deshacer. Si su lead solo existía por ella, el lead también se quita. Si tiene una liga de pago sin pagar, se apaga.${yaPerdida ? "" : " Si el cliente no la quiso, mejor márcala como Perdido en su ficha: la cotización se queda con la marca y cuenta en los números."}`)) return;
    const r = await fetch(`/api/admin/cotizaciones/${q.id}?hard=1`, { method: "DELETE" }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    if (r?.ok) {
      setQuotes(qs => qs.filter(x => x.id !== q.id));
      const ligas = d?.pagosSinReserva > 0 ? " · ⚠️ ya tenía un pago por liga sin reserva: Manolo tiene el seguimiento"
        : d?.ligasApagadas > 0 ? " · su liga de pago ya no se puede pagar" : "";
      flash((d?.lead === "borrado" ? "✅ Cotización eliminada · su lead también se quitó (no tenía nada más)"
        : d?.lead === "actualizado" ? "✅ Cotización eliminada · su lead se queda (tiene más cosas) y quedó anotado"
        : "✅ Cotización eliminada") + ligas);
      router.refresh();
    } else if (r?.status === 404) {
      // Ya no estaba (otra pestaña o alguien más la eliminó): que tampoco se vea aquí.
      setQuotes(qs => qs.filter(x => x.id !== q.id));
      flash("✅ Esa cotización ya se había eliminado (otra pestaña o alguien más): ya no está en la lista");
      router.refresh();
    } else {
      // Ya es una reserva: la lista lo sabe desde ahora y deja de ofrecer «Eliminar».
      if (r?.status === 409 && typeof d.reservaFolio === "string") setReservasDe(m => ({ ...m, [q.id]: d.reservaFolio }));
      flash(`❌ ${d.error || (r ? "No se pudo eliminar la cotización" : "No se pudo eliminar: revisa tu conexión e intenta de nuevo")}`);
      // Y se recarga (20 nov 2026): la fila deja de decir «Enviada» con «Marcar
      // vencida» y toma lo que dice la base (Aceptada, con «Ver reserva»).
      if (r?.status === 409) router.refresh();
    }
  }

  function downloadPDF(q: TourQuote) {
    const win = window.open("", "_blank");
    if (!win) { flash("❌ Permite las ventanas emergentes en tu navegador para descargar el PDF"); return; }
    // Descargar el PDF es mandarla: su lead pasa a Cotizado (3 nov 2026).
    fetch(`/api/admin/cotizaciones/${q.id}/pdf`, { method: "POST", keepalive: true }).then(() => router.refresh()).catch(() => {});

    win.document.write(htmlCotizacion(q, window.location.origin));
    win.document.close();
    setTimeout(() => win.print(), 1000);
  }

  /**
   * La fecha límite que lleva (o llevará al enviarse) la cotización. Si la que
   * tenía ya pasó, la de un envío nuevo: es la que guarda la ruta al reenviar.
   */
  function venceDe(q: TourQuote): string {
    const f = fechaLimite(q);
    return f && f >= hoy ? f : calcularVencimiento(new Date(), vigenciaDe((q as any).packageItems), q.tourDate);
  }

  function waMsg(q: TourQuote) {
    // Con lada (52): un número de 10 dígitos suelto abría el chat de otro país.
    const ph = telefonoWhatsapp(q.customerPhone) ?? "524891090388";
    // Una ya aceptada no lleva vigencia: no hay nada que decidir.
    const vigente = q.status === "aceptada" ? "" : `\nVálida hasta ${cuandoVence(venceDe(q))}.`;
    return `https://wa.me/${ph}?text=${encodeURIComponent(`Hola ${q.customerName}, tu cotización *${q.quoteNumber}*:\n\n*${q.tourName}*\nTotal: *${fmx(q.totalAmount)}*${vigente}\n\n¿Confirmamos?`)}`;
  }

  /**
   * Mandarla por WhatsApp también cuenta como enviada: nace su fecha límite (la
   * misma que dice el mensaje). Sin teléfono del cliente, el WhatsApp se abre
   * con el número de la empresa y no se marca nada.
   */
  function enviarPorWhatsapp(q: TourQuote) {
    playClick();
    if (!q.customerPhone || q.status === "aceptada") return;
    const venceEl = venceDe(q);
    // `keepalive`: el WhatsApp se abre en otra pestaña o app y la marca debe
    // llegar aunque la página se cierre o se suspenda en el celular.
    fetch(`/api/admin/cotizaciones/${q.id}/whatsapp`, {
      method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
      body: JSON.stringify({ tipo: "envio", venceEl }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.ok) { setQuotes(qs => qs.map(x => x.id === q.id ? { ...x, status: d.status, lineItems: d.lineItems } : x)); router.refresh(); } })
      .catch(() => {});
  }

  /** El recordatorio de «tu cotización vence…», con el nombre de pila y el 30 %. */
  function waRecordatorio(q: TourQuote): string | null {
    return urlRecordatorio(q, venceDe(q));
  }

  async function recordar(q: TourQuote) {
    const sinLiga = waRecordatorio(q);
    if (!sinLiga) return;
    playClick();
    // La pestaña se abre YA (si se abre después de esperar al servidor, el
    // navegador la bloquea) y se le pone el mensaje con la liga de pago de la
    // cotización cuando llega (13 nov 2026). Sin liga, sale el de siempre.
    const w = window.open("about:blank", "_blank");
    let url = sinLiga;
    try {
      const r = await fetch(`/api/admin/cotizaciones/${q.id}/liga`, { method: "POST" });
      const d = r.ok ? await r.json() : null;
      if (d?.url) url = urlRecordatorio(q, venceDe(q), undefined, d.url) ?? sinLiga;
    } catch { /* sin liga: el mensaje de siempre */ }
    if (w) { w.opener = null; w.location.href = url; }
    else window.open(url, "_blank", "noopener,noreferrer");
    const ahora = new Date().toISOString();
    setQuotes(qs => qs.map(x => {
      if (x.id !== q.id) return x;
      const ls = Array.isArray((x as any).lineItems) ? (x as any).lineItems : [];
      const i = ls.findIndex((l: any) => l && l._meta);
      const nuevas = i === -1 ? [{ _meta: true, recordadoWaAt: ahora }, ...ls] : ls.map((l: any, j: number) => j === i ? { ...l, recordadoWaAt: ahora } : l);
      return { ...x, lineItems: nuevas };
    }));
    fetch(`/api/admin/cotizaciones/${q.id}/whatsapp`, {
      method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
      body: JSON.stringify({ tipo: "recordatorio" }),
    }).catch(() => {});
  }

  // Lo que toca recordar hoy: Enviadas a las que les queda un día o menos y a
  // las que nadie les ha escrito todavía por WhatsApp. Sin las de un lead
  // Perdido (19 nov 2026): el cliente ya dijo que no, no hay que recordarle.
  const porVencer = useMemo(
    () => quotes
      .filter(q => etapaDe(q, hoy) === "por-vencer" && !marcaDe(q))
      .sort((a, b) => (fechaLimite(a) ?? "").localeCompare(fechaLimite(b) ?? "")),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [quotes, hoy, leads],
  );
  // Las que el equipo puede recordar y no ha recordado (sin teléfono solo les llega el correo).
  const tocaRecordar = porVencer.filter(q => !recordadoPorWhatsapp(q) && !!waRecordatorio(q));

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const list = quotes.filter(c => {
      if (statusFilter === "por-vencer") { if (etapaDe(c, hoy) !== "por-vencer" || marcaDe(c)) return false; }
      else if (statusFilter === "bot") { if (!esDelBot(c)) return false; }
      // Las de un lead Perdido (19 nov 2026), sin las archivadas, como «Todas».
      else if (statusFilter === "perdidas") { if (!marcaDe(c) || c.status === "archivada") return false; }
      // «Todas» no enseña las archivadas: para eso está su pestaña.
      else if (statusFilter === "all") { if (c.status === "archivada") return false; }
      else if (c.status !== statusFilter) return false;
      return !q || [c.customerName, c.customerEmail, c.quoteNumber, c.tourName].some(v => v?.toLowerCase().includes(q));
    });
    return [...list].sort((a, b) => {
      if (sortBy === "monto") return b.totalAmount - a.totalAmount;
      if (sortBy === "tourDate") return (b.tourDate || "").localeCompare(a.tourDate || "");
      if (sortBy === "vence") {
        // Las vivas primero, de la que vence antes a la que vence después.
        const va = a.status === "enviada" ? fechaLimite(a) ?? "9999" : "9999";
        const vb = b.status === "enviada" ? fechaLimite(b) ?? "9999" : "9999";
        return va.localeCompare(vb) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // más recientes
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotes, search, statusFilter, sortBy, hoy, leads]);

  const isEditMode = modal === "edit";

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-cormorant text-[#1B4332] text-2xl font-light">Cotizaciones</h1>
          <p className="text-[#1B4332]/50 font-dm text-sm mt-1">{quotes.length} cotizaciones · {quotes.filter(q => q.status === "aceptada").length} aceptadas</p>
        </div>
        {/* 44 px de alto para el dedo hasta 1279 px, como las pestañas (revisión del 20 nov 2026): medían 34 y 38. */}
        <div className="flex flex-wrap gap-2">
          <select value={sortBy} onChange={e => { playClick(); setSortBy(e.target.value as any); }}
            className="min-h-[44px] xl:min-h-0 bg-white border border-[#1B4332]/20 text-[#1B4332]/70 text-xs font-dm px-2.5 py-2 rounded-sm focus:outline-none focus:border-[#1B4332] cursor-pointer">
            <option value="reciente">Más recientes</option>
            <option value="tourDate">Fecha de tour</option>
            <option value="monto">Mayor monto</option>
            <option value="vence">Fecha límite</option>
          </select>
          <button onClick={() => { playClick(); openNew(); }}
            className="flex min-h-[44px] xl:min-h-0 items-center gap-2 bg-[#1B4332] hover:bg-[#2D5A45] text-white px-4 py-2.5 text-xs font-dm uppercase tracking-[1px] transition-colors rounded-sm">
            <Plus className="w-4 h-4" />Nueva Cotización
          </button>
        </div>
      </div>

      {leadVuelta && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-sm border border-[#1B4332]/15 bg-[#F3F8F5] px-4 py-2.5 text-sm font-dm text-[#1B4332]">
          <span>Vienes de la ficha de <strong>{leadVuelta.nombre}</strong>. Lo que guardes aquí se refleja en su lead.</span>
          <Link href={`/admin/leads/${leadVuelta.id}`} className="panel-foco font-semibold underline-offset-2 hover:underline">← Volver a su ficha</Link>
        </div>
      )}
      {/* El aviso flota abajo, a la vista aunque la fila esté lejos (20 nov
          2026): antes salía 5 s arriba de la página y, con la lista bajada,
          eliminar una que ya era reserva (409) parecía no hacer nada. Tampoco
          empuja la página al salir. Va encima de los avisos de seguimientos
          (z-70, abajo a la derecha: en el celular lo tapaban) y se esconde
          mientras hay una ventana abierta, para no tapar sus botones; con el
          editor abierto va dentro del editor.
          Va en el `body`, como CobroModal (revisión del 20 nov 2026): dentro de
          `main` (relative z-10) ningún z-index lo subía sobre esos avisos, que
          son hermanos de `main`; con z-75 seguía debajo de los de z-70. */}
      {msg && !modal && !detalle && !convirtiendo && !cobrando && <AvisoFlotante texto={msg} onCerrar={cerrarAviso} />}
      {avisosConv.length > 0 && (
        <div role="status" className="mb-4 flex items-start justify-between gap-3 rounded-sm border border-amber-300/70 bg-amber-50/70 px-4 py-3 text-sm font-dm text-amber-900">
          <div className="min-w-0">
            <p className="font-semibold">Revisa esta reserva</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">{avisosConv.map((a, i) => <li key={i}>{a}</li>)}</ul>
          </div>
          <button onClick={() => setAvisosConv([])} className="panel-foco min-h-[44px] shrink-0 px-2 text-[12px] font-semibold underline-offset-2 hover:underline">Entendido</button>
        </div>
      )}

      {/* Toca recordar: las que vencen hoy o mañana */}
      {porVencer.length > 0 && (
        <div className="mb-4 border border-amber-300/70 bg-amber-50/70 rounded-sm px-4 py-3">
          <div className="flex items-center gap-2">
            <BellRing className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="font-dm text-sm text-[#1B4332] font-medium">
              Por vencer · {porVencer.length}
              <span className="font-normal text-[#1B4332]/60">
                {tocaRecordar.length > 0
                  ? ` — toca recordarle${tocaRecordar.length === 1 ? "" : "s"} hoy a ${tocaRecordar.length}`
                  : " — ya no falta nadie por recordar"}
              </span>
            </p>
          </div>
          <ul className="mt-2 divide-y divide-amber-200/70">
            {porVencer.map(q => {
              const vence = fechaLimite(q) ?? hoy;
              const rec   = recordadoPorWhatsapp(q);
              const url   = waRecordatorio(q);
              return (
                <li key={q.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2 font-dm">
                  {/* 44 px de alto en celular y tableta, como su botón de WhatsApp (20 nov 2026). */}
                  <button onClick={() => { playClick(); setDetalle(q); }} className="min-h-[44px] xl:min-h-0 text-[#1B4332] text-sm font-medium hover:underline text-left">{q.customerName}</button>
                  {/* Los tours como badges, como en toda la lista (20 nov 2026). */}
                  <span className="flex items-center gap-1.5 text-[#1B4332]/50 text-xs"><ToursDe x={q} /><span>{fDate(q.tourDate)}</span></span>
                  <span className={`text-xs ${claseVence(diasParaVencer(vence, hoy))}`}>{etiquetaVence(vence, hoy)}</span>
                  <span className="ml-auto flex items-center gap-2.5">
                    {rec && <span className="text-xs text-[#40916C]">✓ Recordado {fRecordado(rec, hoy)}</span>}
                    {url ? (
                      // El verde del botón de WhatsApp de Leads y la ficha (20 nov 2026):
                      // blanco sobre #25D366 se leía mal (2:1) y en el celular medía 28 px.
                      <button onClick={() => recordar(q)}
                        className={`flex min-h-[44px] xl:min-h-0 items-center gap-1.5 px-3 py-1.5 text-xs rounded-sm transition-colors ${rec ? "border border-[#1f7a4d]/40 text-[#1f7a4d] hover:bg-[#1f7a4d]/5" : "bg-[#1f7a4d] hover:bg-[#19673f] text-white"}`}>
                        <MessageCircle className="w-3.5 h-3.5" />{rec ? "Otra vez" : "Recordar por WhatsApp"}
                      </button>
                    ) : (
                      <span className="text-xs text-[#1B4332]/40">sin teléfono</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-[11px] font-dm text-[#1B4332]/50">A quien dejó correo le llega además, solo, un aviso de «tu cotización vence mañana».</p>
        </div>
      )}

      {/* Tabs de estado */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
        {([
          { key: "all",      label: "Todas"     },
          { key: "borrador", label: "Borrador"  },
          { key: "enviada",  label: "Enviadas"  },
          { key: "por-vencer", label: "Por vencer" },
          { key: "aceptada", label: "Aceptadas" },
          { key: "expirada", label: "Vencidas"  },
          { key: "perdidas", label: "Perdidas"  },
          { key: "archivada", label: "Archivadas" },
          { key: "bot",      label: "Bot"       },
        ] as const).map(tab => {
          const count = tab.key === "all" ? quotes.filter(q => q.status !== "archivada").length
            : tab.key === "por-vencer" ? porVencer.length
            : tab.key === "bot" ? quotes.filter(esDelBot).length
            : tab.key === "perdidas" ? quotes.filter(q => !!marcaDe(q) && q.status !== "archivada").length
            : quotes.filter(q => q.status === tab.key).length;
          return (
            // 44 px de alto para el dedo hasta 1279 px, donde se ven las tarjetas (20 nov 2026).
            <button key={tab.key} onClick={() => { playClick(); setStatusFilter(tab.key); }}
              className={`flex min-h-[44px] xl:min-h-0 items-center gap-1.5 px-3 py-1.5 text-xs font-dm whitespace-nowrap rounded-sm transition-colors ${
                statusFilter === tab.key ? "bg-[#1B4332] text-white" : "border border-[#1B4332]/15 text-[#1B4332]/60 hover:text-[#1B4332] hover:border-[#1B4332]/30"
              }`}>
              {tab.label}
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${statusFilter === tab.key ? "bg-white/20 text-white" : "bg-[#1B4332]/8 text-[#1B4332]/50"}`}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1B4332]/30" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por cliente, tour o número..."
          className="w-full bg-white border border-[#1B4332]/15 text-[#1B4332] font-dm text-sm pl-9 pr-4 py-2.5 focus:outline-none focus:border-[#1B4332] placeholder:text-[#1B4332]/30 rounded-sm"
        />
      </div>

      {/* ── Tarjetas (celular y tableta) ──
          Hasta 1279 px (20 nov 2026): con la barra lateral, la tabla no cabe
          entera ahí (a 1024 px le quedan 744). Desde 1024 px, en dos columnas.
          `grid-cols-1` a propósito (20 nov 2026): sin él, un correo largo
          ensanchaba TODAS las tarjetas más allá de la pantalla del celular y
          «Eliminar», a la derecha, quedaba fuera de la vista. */}
      <div className="xl:hidden grid grid-cols-1 gap-2.5 lg:grid-cols-2 lg:items-start">
        {filtered.length === 0 && <p className="py-10 text-center text-[#1B4332]/30 font-dm text-sm lg:col-span-2">Sin cotizaciones</p>}
        {filtered.map(q => {
          const s = STATUS[q.status] || { label: q.status, cls: "bg-gray-100 text-gray-600" };
          const sinEnviar = q.status === "borrador" && !!q.customerEmail;
          const vence = fechaLimite(q);
          const rec   = recordadoPorWhatsapp(q);
          const marca = marcaDe(q);
          const reserva = reservaViva(q);
          return (
            <div key={q.id} onClick={() => { playClick(); setDetalle(q); }}
              className="bg-white border border-[#1B4332]/10 rounded-md p-4 cursor-pointer active:bg-[#FAFAF8]">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[#1B4332] font-mono text-xs font-medium">{q.quoteNumber}</span>
                <div className="flex items-center gap-1.5">
                  {esDelBot(q) && <ChipBot />}
                  {sinEnviar && <span className="text-[9px] tracking-[0.5px] uppercase px-1.5 py-0.5 rounded font-dm bg-[#C9484A]/12 text-[#C9484A] font-bold">Sin enviar</span>}
                  <span className={`text-[10px] tracking-[1px] uppercase px-2 py-0.5 rounded font-dm ${s.cls}`}>{s.label}</span>
                </div>
              </div>
              {marca && <div className="mb-1.5 flex min-w-0"><ChipPerdido marca={marca} /></div>}
              <ChipPagoEnLinea monto={pagadoEnLinea[q.id]} folio={folioReserva(q)} />
              <p className="text-[#1B4332] font-medium break-words">{q.customerName}</p>
              {/* El correo largo se recorta con «…» (completo en su `title`), como en la tabla. */}
              <p className="text-[#1B4332]/40 text-xs truncate" title={q.customerEmail || undefined}>{q.customerEmail || "—"}</p>
              {/* Todos sus tours como badges, con la fecha (20 nov 2026): el nombre largo va en el `title`. */}
              <div className="flex items-center justify-between gap-2 mt-1.5">
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <ToursDe x={q} />
                  <span className="text-xs text-[#1B4332]/50">{fDate(q.tourDate)}</span>
                </div>
                <span className="shrink-0 text-[#52B788] font-medium text-sm">{fmx(q.totalAmount)}</span>
              </div>
              {vence && (
                // De un lead Perdido, el «vence…» va apagado: ya no es un pendiente.
                <p className={`text-[11px] font-dm mt-1 ${marca ? "text-[#1B4332]/40" : claseVence(diasParaVencer(vence, hoy))}`}>
                  {etiquetaVence(vence, hoy)}{rec ? <span className="text-[#40916C] font-normal"> · ✓ recordado {fRecordado(rec, hoy)}</span> : null}
                </p>
              )}
              {/* Botones de 44 px para el dedo, en una o dos filas: nunca se enciman (19 nov 2026).
                  Primero los íconos y al final lo que lleva nombre (20 nov 2026): «Marcar
                  vencida», que antes solo estaba en la compu, y «Eliminar» o «Ver reserva». */}
              <div className="mt-2 pt-1 border-t border-[#1B4332]/8" onClick={e => e.stopPropagation()}>
                <div className="-mx-3 flex flex-wrap items-center gap-x-0.5">
                  <button onClick={() => { playClick(); setDetalle(q); }} title="Vista previa" aria-label="Vista previa" className={iconoMovil()}><Eye className="w-4 h-4" /></button>
                  {convertible(q) && (
                    <button onClick={() => { playClick(); setConvirtiendo(q); }} title="Convertir a reserva" aria-label="Convertir a reserva" className={iconoMovil()}><BookCheck className="w-4 h-4" /></button>
                  )}
                  {q.status === "aceptada" ? (
                    <button onClick={() => { playClick(); openEdit(q); }} title={TITULO_ABRIR} className={conNombreMovil()}><FileText className="w-4 h-4" />Abrir</button>
                  ) : (
                    <button onClick={() => { playClick(); openEdit(q); }} title="Editar" aria-label="Editar" className={iconoMovil()}><Pencil className="w-4 h-4" /></button>
                  )}
                  <button onClick={() => { playClick(); sendEmail(q.id); }} disabled={sending === q.id} title={tituloCorreo(q)} aria-label="Enviar por correo" className={iconoMovil()}><Mail className="w-4 h-4" /></button>
                  <a href={waMsg(q)} target="_blank" rel="noopener noreferrer" onClick={() => enviarPorWhatsapp(q)} title="Enviar por WhatsApp" aria-label="Enviar por WhatsApp" className={iconoMovil("text-[#1B4332]/50 hover:text-[#25D366]")}><MessageCircle className="w-4 h-4" /></a>
                  {etapaDe(q, hoy) !== "vencida" && q.status === "enviada" && !marca && waRecordatorio(q) && (
                    <button onClick={() => recordar(q)} title="Recordar que vence" aria-label="Recordar por WhatsApp que vence" className={iconoMovil("text-amber-600/70 hover:text-amber-600")}><BellRing className="w-4 h-4" /></button>
                  )}
                  <button onClick={() => { playClick(); downloadPDF(q); }} title="Descargar PDF" aria-label="Descargar PDF" className={iconoMovil("text-[#1B4332]/50 hover:text-[#52B788]")}><Download className="w-4 h-4" /></button>
                  {q.status === "archivada" && (
                    <button onClick={() => { playClick(); desarchivar(q.id); }} title="Volver a borrador" className={textoMovil}>Desarchivar</button>
                  )}
                  {regresable(q) && (
                    <button onClick={() => { playClick(); regresarAEnviada(q); }} title="Se marcó Aceptada sin reserva: regrésala a Enviada"
                      className={textoMovil}>Regresar a Enviada</button>
                  )}
                  {puedeVencer(q) && (
                    <button onClick={() => { playClick(); expireQ(q); }} title="No se borra: queda como Vencida y su liga de pago deja de poder pagarse"
                      className={textoMovil}>Marcar vencida</button>
                  )}
                  {reserva ? (
                    // Ya es una reserva viva: no se elimina; si el cliente ya no va, se cancela la reserva (19 nov 2026).
                    <a href={`/admin/reservas?folio=${encodeURIComponent(reserva)}`} title={`Ya es la reserva ${reserva}: no se elimina. Si el cliente ya no va, cancélala con su motivo en Reservas.`}
                      className={`${textoMovil} ml-auto`}>Ver reserva</a>
                  ) : (
                    <button onClick={() => { playClick(); hardDeleteQ(q); }} title="Eliminar cotización" aria-label="Eliminar cotización"
                      className={`${conNombreMovil("text-[#1B4332]/60 hover:text-red-600")} ml-auto`}><Trash2 className="w-4 h-4" />Eliminar</button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Tabla (compu) ──
          Desde 1280 px y con el ancho de cada columna fijo (20 nov 2026): a
          1366 px la tabla medía 1217 px en un hueco de 1084 y «Eliminar»
          quedaba fuera de la vista. Fijas: 136 + 120 + 120 + 192 + 216 = 784 px;
          el cliente se queda con el resto (≈ 200 px a 1280 px, con la barra
          lateral). Lo largo se parte en renglones o se recorta con «…» y su
          `title`; nada empuja la tabla más allá del hueco. */}
      <div className="hidden xl:block panel-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-sm font-dm">
            <colgroup>
              <col className="w-[136px]" />
              <col />
              <col className="w-[120px]" />
              <col className="w-[120px]" />
              <col className="w-[192px]" />
              <col className="w-[216px]" />
            </colgroup>
            <thead className="bg-[#FAFAF8]">
              <tr className="border-b border-[#1B4332]/10 text-[#1B4332]/50 text-[10px] tracking-[1.5px] uppercase">
                {["Número","Cliente","Tour(s)","Total","Estado","Acciones"].map((h, i, todas) => (
                  <th key={h} className={`py-3 text-left font-dm ${i === 0 ? "pl-4 pr-3" : i === todas.length - 1 ? "pl-3 pr-4" : "px-3"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-[#1B4332]/30 font-dm">Sin cotizaciones</td></tr>}
              {filtered.map(q => {
                const s = STATUS[q.status] || { label: q.status, cls: "bg-gray-100 text-gray-600" };
                const sinEnviar = q.status === "borrador" && !!q.customerEmail;
                const vence = fechaLimite(q);
                const rec   = recordadoPorWhatsapp(q);
                const marca = marcaDe(q);
                const reserva = reservaViva(q);
                return (
                  <tr key={q.id} onClick={() => { playClick(); setDetalle(q); }}
                    title="Ver la cotización completa"
                    className="border-b border-[#1B4332]/6 hover:bg-[#FAFAF8]/50 transition-colors cursor-pointer">
                    {/* El folio en un renglón (20 nov 2026): antes se partía en «COT-» / «MWMWRJ8ISY». */}
                    <td className="py-3 pl-4 pr-3 whitespace-nowrap text-[#1B4332] font-mono text-[11px] font-medium">{q.quoteNumber}</td>
                    <td className="py-3 px-3"><p className="text-[#1B4332] font-medium break-words">{q.customerName}</p><p className="text-[#1B4332]/40 text-xs truncate" title={q.customerEmail || undefined}>{q.customerEmail || "—"}</p></td>
                    <td className="py-3 px-3"><ToursDe x={q} /><p className="mt-1 text-xs text-[#1B4332]/40">{fDate(q.tourDate)}</p></td>
                    <td className="py-3 px-3 text-[#52B788] font-medium">{fmx(q.totalAmount)}</td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`text-[10px] tracking-[1px] uppercase px-2 py-1 rounded font-dm ${s.cls}`}>{s.label}</span>
                        {sinEnviar && <span className="text-[9px] tracking-[0.5px] uppercase px-1.5 py-0.5 rounded font-dm bg-[#C9484A]/12 text-[#C9484A] font-bold">Sin enviar</span>}
                        {esDelBot(q) && <ChipBot />}
                      </div>
                      {/* Al ancho de la columna: el motivo largo se recorta con «…» y completo va en su `title`. */}
                      {marca && <div className="mt-1.5 flex min-w-0"><ChipPerdido marca={marca} /></div>}
                      <ChipPagoEnLinea monto={pagadoEnLinea[q.id]} folio={folioReserva(q)} />
                      {vence && (
                        // De un lead Perdido, el «vence…» va apagado: ya no es un pendiente.
                        <p className={`text-[11px] font-dm mt-1 whitespace-nowrap ${marca ? "text-[#1B4332]/40" : claseVence(diasParaVencer(vence, hoy))}`}
                          title={`Fecha límite: ${fDate(vence)}`}>
                          {etiquetaVence(vence, hoy)}
                        </p>
                      )}
                      {rec && <p className="text-[10px] font-dm text-[#40916C] whitespace-nowrap">✓ recordado {fRecordado(rec, hoy)}</p>}
                    </td>
                    {/* Dos renglones en 188 px (20 nov 2026): arriba los íconos (hasta 7 × 24 px)
                        y abajo lo que lleva nombre, con «Eliminar» o «Ver reserva» siempre a la
                        derecha. El peor caso, una Enviada con campanita, mide 180 px. */}
                    <td className="py-3 pl-3 pr-4" onClick={e => e.stopPropagation()}>
                      <div className="-ml-1 flex flex-wrap items-center gap-0.5">
                        <button onClick={() => { playClick(); setDetalle(q); }} title="Vista previa" aria-label="Vista previa" className={iconoTabla()}><Eye className="w-4 h-4" /></button>
                        {convertible(q) && (
                          <button onClick={() => { playClick(); setConvirtiendo(q); }} title="Convertir a reserva" aria-label="Convertir a reserva" className={iconoTabla()}><BookCheck className="w-4 h-4" /></button>
                        )}
                        {q.status === "aceptada" ? (
                          <button onClick={() => { playClick(); openEdit(q); }} title={TITULO_ABRIR}
                            className="inline-flex h-6 shrink-0 items-center gap-1 rounded-sm px-1 text-[11px] font-dm text-[#1B4332]/60 hover:text-[#1B4332] hover:bg-[#1B4332]/5 transition-colors"><FileText className="w-4 h-4" />Abrir</button>
                        ) : (
                          <button onClick={() => { playClick(); openEdit(q); }} title="Editar" aria-label="Editar" className={iconoTabla()}><Pencil className="w-4 h-4" /></button>
                        )}
                        <button onClick={() => { playClick(); sendEmail(q.id); }} disabled={sending === q.id} title={tituloCorreo(q)} aria-label="Enviar por correo" className={iconoTabla()}><Mail className="w-4 h-4" /></button>
                        <a href={waMsg(q)} target="_blank" rel="noopener noreferrer" onClick={() => enviarPorWhatsapp(q)} title="Enviar por WhatsApp" aria-label="Enviar por WhatsApp"
                          className={iconoTabla("text-[#1B4332]/40 hover:text-[#25D366]")}><MessageCircle className="w-4 h-4" /></a>
                        {etapaDe(q, hoy) !== "vencida" && q.status === "enviada" && !marca && waRecordatorio(q) && (
                          <button onClick={() => recordar(q)} title="Recordar por WhatsApp que vence" aria-label="Recordar por WhatsApp que vence"
                            className={iconoTabla("text-amber-600/60 hover:text-amber-600")}><BellRing className="w-4 h-4" /></button>
                        )}
                        <button onClick={() => { playClick(); downloadPDF(q); }} title="Descargar PDF" aria-label="Descargar PDF"
                          className={iconoTabla("text-[#1B4332]/40 hover:text-[#52B788]")}><Download className="w-4 h-4" /></button>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        {q.status === "archivada" && (
                          <button onClick={() => { playClick(); desarchivar(q.id); }} title="Volver a borrador"
                            className={`${textoTabla} hover:text-[#1B4332]`}>Desarchivar</button>
                        )}
                        {regresable(q) && (
                          <button onClick={() => { playClick(); regresarAEnviada(q); }} title="Se marcó Aceptada sin reserva: regrésala a Enviada"
                            className={`${textoTabla} hover:text-[#1B4332]`}>Regresar a Enviada</button>
                        )}
                        {/* «Marcar vencida» con su nombre y lejos del bote de basura (19 nov 2026):
                            antes era una X junto a él y parecía que eliminar no hacía nada.
                            Una aceptada ya es venta: no se marca vencida (lote 4, 5 nov 2026). */}
                        {puedeVencer(q) && (
                          <button onClick={() => { playClick(); expireQ(q); }} title="No se borra: queda como Vencida y su liga de pago deja de poder pagarse"
                            className={`${textoTabla} hover:text-orange-600`}>Marcar vencida</button>
                        )}
                        {/* Ya es una reserva viva: no se elimina; si el cliente ya no va, se cancela la reserva (19 nov 2026). */}
                        {reserva ? (
                          <a href={`/admin/reservas?folio=${encodeURIComponent(reserva)}`} title={`Ya es la reserva ${reserva}: no se elimina. Si el cliente ya no va, cancélala con su motivo en Reservas.`}
                            className={`${textoTabla} ml-auto hover:text-[#1B4332]`}>Ver reserva</a>
                        ) : (
                          <button onClick={() => { playClick(); hardDeleteQ(q); }} title="Eliminar cotización" aria-label="Eliminar cotización"
                            className="ml-auto inline-flex min-h-[24px] items-center gap-1 whitespace-nowrap text-[11px] font-dm text-[#1B4332]/60 hover:text-red-600 transition-colors"><Trash2 className="w-3.5 h-3.5" />Eliminar</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {detalle && (
        <CotizacionDetalle cotizacion={detalle} onClose={() => setDetalle(null)} perdido={marcaDe(detalle)} />
      )}

      {convirtiendo && (() => {
        const q = convirtiendo as any;
        const meta = getMeta(q.packageItems ?? []) as any;
        const zona = zonaDeTexto(meta.zonaHospedaje);
        const lead = q.oportunidadId ? leads[q.oportunidadId] : undefined;
        return (
          <ConvertirReservaModal
            q={{
              quoteNumber: q.quoteNumber, customerName: q.customerName, customerEmail: q.customerEmail, customerPhone: q.customerPhone,
              tourName: q.tourName, tourDate: q.tourDate, personas: Number(meta.numPersonas) || grupoDe(q).total || 0,
              total: q.totalAmount, anticipo: meta.anticipo != null ? Number(meta.anticipo) : 0,
              zona: zona ? ZONA_TEXTO[zona] : "",
            }}
            canalSugerido={lead?.canal === "whatsapp_sitio" ? "whatsapp" : lead?.canal ?? null} idiomaSugerido={lead?.idioma ?? null} guiasConocidos={guiasConocidos}
            onCancelar={() => setConvirtiendo(null)}
            onConvertir={datos => convertToReserva(convirtiendo, datos)}
          />
        );
      })()}

      {cobrando && (
        <CobroModal reserva={cobrando} quien={quien} onClose={() => setCobrando(null)}
          onGuardado={(cobrado, que) => { flash(`✅ ${que === "anulado" ? "Cobro anulado" : "Pago registrado"}: ${cobrado.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 })} cobrados. El lead ya se actualizó.`); router.refresh(); }} />
      )}

      {/* Modal nueva/editar cotización */}
      {modal && (() => {
        const step1Valid = !!form.customerName.trim();
        const step2Valid = lines.every(lineaCompleta);
        const TABS = [
          { n: 1 as const, label: "Cliente" },
          { n: 2 as const, label: "Tours" },
          { n: 3 as const, label: "Condiciones" },
        ];
        function goToTab(n: 1 | 2 | 3) {
          if (n <= step) { setStep(n); return; }
          if (n === 2 && step1Valid) setStep(2);
          if (n === 3 && step1Valid && step2Valid) setStep(3);
        }
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={closeModal} />
          <div className="relative bg-white border border-[#1B4332]/10 w-full max-w-xl shadow-xl rounded-sm flex flex-col max-h-[95vh]">

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-0">
              <h2 className="font-cormorant text-[#1B4332] text-xl font-light">
                {avisoLectura ? "Ver Cotización" : isEditMode ? "Editar Cotización" : "Nueva Cotización"}
                {isEditMode && editTarget && <span className="text-[#1B4332] text-sm font-dm ml-2">{editTarget.quoteNumber}</span>}
                {isEditMode && editTarget && esDelBot(editTarget) && <span className="ml-2 align-middle"><ChipBot /></span>}
              </h2>
              <button onClick={closeModal} className="text-[#1B4332]/40 hover:text-[#1B4332]"><X className="w-5 h-5" /></button>
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

            {/* Aceptada: solo se ve (lote 4, 5 nov 2026). Lo que se opera es su
                reserva; editar aquí le cambiaba al lead lo que la reserva no tenía. */}
            {avisoLectura && (
              <p role="status" className="mb-4 rounded-sm border border-amber-300/70 bg-amber-50/70 px-3 py-2.5 font-dm text-[12.5px] leading-snug text-amber-900">
                {avisoLectura}
              </p>
            )}
            <fieldset disabled={!!avisoLectura} className="m-0 min-w-0 border-0 p-0">

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
                {/* Dos botones y ya: de dónde sale cambia el traslado y los costos, y
                    el Corte marca las de Valles para revisarlos. */}
                <div>
                  <p className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1" id="zona-cliente">¿De dónde sale el cliente?</p>
                  <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-labelledby="zona-cliente">
                    {(["xilitla", "valles"] as const).map(z => {
                      const activa = form.zona === z;
                      return (
                        <button key={z} type="button" role="radio" aria-checked={activa}
                          onClick={() => { playClick(); setForm(f => ({ ...f, zona: z })); }}
                          className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-sm border font-dm text-sm transition-colors panel-foco ${
                            activa ? "bg-[#1B4332] border-[#1B4332] text-white" : "bg-white border-[#1B4332]/20 text-[#1B4332] hover:border-[#1B4332]/45"}`}>
                          <MapPin size={14} aria-hidden="true" /> {ZONA_TEXTO[z]}
                        </button>
                      );
                    })}
                  </div>
                  {form.zona === "valles" && (
                    <p className="mt-1.5 font-dm text-[11px] leading-snug text-[#7a4b0e]">
                      {TOURS_CON_CARGO_VALLES.map(t => `${t.nombreCorto} +${fmx(cargoVallesDe(t))}`).join(" · ")} de traslado
                      desde Ciudad Valles, por reserva (no por persona); se suma solo a su línea. Los demás tours pasan
                      por el cliente sin costo extra.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Notas</label>
                  <textarea value={form.notes} rows={3} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Preferencias, alergias, requerimientos especiales..."
                    className={`${inputCls} resize-none`} />
                  <p className="text-[10px] font-dm text-[#1B4332]/40 mt-1">
                    Esto SÍ lo ve el cliente: sale en su correo y en su cotización en PDF.
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
                {/* Número de personas del grupo (para el PDF y el email — evita sumar por tour) */}
                <div className="bg-[#FAFAF8]/60 border border-[#1B4332]/10 rounded-sm p-3">
                  <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">
                    Número de personas del grupo
                  </label>
                  <input type="number" min={1} max={40} value={numPersonas}
                    placeholder="Ej. 2"
                    onChange={e => setNumPersonas(e.target.value)}
                    className={`${inputCls} max-w-[140px]`} />
                  <p className="text-[10px] font-dm text-[#1B4332]/40 mt-1.5">
                    Cuántas personas son en total (el mismo grupo que va a todos los tours). Así la
                    cotización en PDF muestra el número correcto y no suma las personas de cada tour.
                  </p>
                </div>

                {/* Cargar un paquete ya armado */}
                <div className="bg-[#1B4332]/4 border border-[#1B4332]/12 rounded-sm p-3">
                  <p className="text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-2 flex items-center gap-1.5">
                    <Package className="w-3 h-3" />Armar desde un paquete
                  </p>
                  <div className="flex gap-1.5 flex-wrap">
                    {PAQUETES_PANEL.map(p => (
                      <button key={p.slug} type="button" onClick={() => { playClick(); cargarPaquetePanel(p.slug); }}
                        className="text-left border border-[#1B4332]/25 text-[#1B4332] px-2.5 py-1.5 rounded-sm hover:bg-[#1B4332]/8 transition-colors">
                        <span className="block text-xs font-dm font-medium">{p.nombre}</span>
                        <span className="block text-[10px] font-dm text-[#1B4332]/45">
                          {p.recorridos} recorridos · {p.duracion}
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] font-dm text-[#1B4332]/40 mt-2">
                    Pone los recorridos en días seguidos y las noches de hotel. Reemplaza lo que ya hayas capturado.
                    Después solo ajustas fechas y personas.
                  </p>
                </div>

                {/* Tours */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm">Tours del paquete</p>
                    <button onClick={addLine}
                      className="flex items-center gap-1 text-xs font-dm text-[#1B4332] border border-[#1B4332]/30 px-2 py-1 hover:bg-[#1B4332]/8 transition-colors rounded-sm">
                      <Plus className="w-3 h-3" />Agregar tour
                    </button>
                  </div>
                  <div className="space-y-2">
                    {lines.map((line, i) => (
                      <div key={i} className="border border-[#1B4332]/10 p-3 rounded-sm bg-white">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[9px] tracking-[2px] uppercase text-[#1B4332]/40 font-dm">Tour {i + 1}</span>
                          {lines.length > 1 && <button onClick={() => removeLine(i)} className="text-[#1B4332]/30 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>}
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
                                          <option key={v.nombre} value={v.nombre}>{v.nombre} ({v.capacidad}) — {fmx(v.precios[rutaIdx])}</option>
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
                                    Precio por vehículo — los ocupantes no cambian el precio. ¿Otro modelo? Agrega otra línea.
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
                                </div>
                                <div>
                                  <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Adultos</label>
                                  <input type="number" min={1} max={20} value={line.adults} onChange={e => updateLine(i, "adults", Number(e.target.value))} className={inputCls} />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                {/* Regla del 17 nov 2026 (`ninos.ts`): de 4 a 7 al 50 %, de 0 a 3
                                    gratis, de 8 en adelante adulto. El tramo de 6 a 10 solo se
                                    enseña si la cotización vieja lo trae, para bajarlo a 0. */}
                                {(line.childrenMid ?? 0) > 0 && (
                                  <div className="col-span-2">
                                    <label className="block text-[9px] tracking-[2px] uppercase text-[#8a6a1a] font-dm mb-1 truncate" title="Tarifa anterior al 17 nov 2026: 70 %">Niños 6–10 (tarifa anterior, 70 %)</label>
                                    <input type="number" min={0} max={12} value={line.childrenMid} onChange={e => updateLine(i, "childrenMid", Number(e.target.value))} className={inputCls} />
                                  </div>
                                )}
                                <div>
                                  <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1 truncate" title="4 a 7 años — 50 % del adulto">Niños 4–7 (50 %)</label>
                                  <input type="number" min={0} max={12} value={line.childrenSmall} onChange={e => updateLine(i, "childrenSmall", Number(e.target.value))} className={inputCls} />
                                </div>
                                <div>
                                  <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1 truncate" title="0 a 3 años — gratis, ocupan lugar">Bebés 0–3 (gratis)</label>
                                  <input type="number" min={0} max={12} value={line.infants ?? 0} onChange={e => updateLine(i, "infants", Number(e.target.value))} className={inputCls} />
                                </div>
                              </div>
                            </>
                          )}
                          {line.tourSlug && (
                            <EleccionLinea
                              line={line}
                              onChange={nueva => {
                                setLines(ls => ls.map((x, idx) => idx === i ? { ...nueva, subtotal: calcLine(nueva) } : x));
                                soltarPrecioEditado();
                              }}
                            />
                          )}
                          {line.tourSlug && (
                            <AddOnsLinea
                              line={line}
                              personas={Number(numPersonas) || (line.adults + (line.childrenMid ?? 0) + (line.childrenSmall ?? 0))}
                              onChange={nueva => {
                                setLines(ls => ls.map((x, idx) => idx === i ? { ...nueva, subtotal: calcLine(nueva) } : x));
                                soltarPrecioEditado();
                              }}
                            />
                          )}
                          {line.tourSlug && <TrasladoVallesLinea line={line} />}
                          {line.tourSlug && <p className="text-right text-xs font-dm text-[#52B788]">Subtotal: {fmx(calcLine(line))}</p>}
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
                    <button type="button" onClick={addPackage}
                      className="flex items-center gap-1 text-xs font-dm text-[#40916C] border border-[#40916C]/30 px-2 py-1 hover:bg-[#40916C]/8 transition-colors rounded-sm">
                      <Plus className="w-3 h-3" />Agregar habitación
                    </button>
                  </div>
                  {packages.length === 0 && (
                    <p className="text-[10px] font-dm text-[#1B4332]/30 border border-dashed border-[#1B4332]/15 rounded-sm py-4 text-center">
                      Sin hospedaje — solo tours
                    </p>
                  )}
                  <div className="space-y-2">
                    {packages.map((pkg, i) => (
                      <div key={i} className="border border-[#40916C]/25 p-3 rounded-sm bg-[#FFFFFF]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[9px] tracking-[2px] uppercase text-[#40916C]/70 font-dm flex items-center gap-1">
                            <BedDouble className="w-3 h-3" /> Habitación {i + 1}
                          </span>
                          <button type="button" onClick={() => setPackages(ps => ps.filter((_, idx) => idx !== i))}
                            className="text-[#1B4332]/30 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Hotel</label>
                            <input type="text" value={pkg.hotel} className={inputCls}
                              onChange={e => updatePkg(i, "hotel", e.target.value)} />
                          </div>
                          <SelectorHabitacion pkg={pkg} inputCls={inputCls}
                            onField={(campo, valor) => updatePkg(i, campo, valor)} />
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Noches</label>
                              <input type="number" min={1} max={30} value={pkg.noches} className={inputCls}
                                onChange={e => updatePkg(i, "noches", Number(e.target.value))} />
                            </div>
                            <div>
                              <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Hab.</label>
                              <input type="number" min={1} max={10} value={pkg.habitaciones} className={inputCls}
                                onChange={e => updatePkg(i, "habitaciones", Math.max(1, Number(e.target.value) || 1))} />
                            </div>
                            <div>
                              <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">$/noche</label>
                              <input type="number" min={0} value={pkg.precioPorNoche} className={inputCls}
                                onChange={e => updatePkg(i, "precioPorNoche", Math.max(0, Number(e.target.value) || 0))} />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Check-in</label>
                              <input type="date" value={pkg.checkin} className={inputCls}
                                onChange={e => updatePkg(i, "checkin", e.target.value)} />
                            </div>
                            <div>
                              <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Check-out</label>
                              <input type="date" value={pkg.checkout} className={inputCls}
                                onChange={e => updatePkg(i, "checkout", e.target.value)} />
                            </div>
                          </div>
                          <p className="text-[10px] font-dm text-[#1B4332]/40">
                            La salida se calcula sola con las noches. Si cambias la salida a mano, se recalculan las noches.
                          </p>
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
                  extras={extras}
                  personas={personasGrupo}
                  presets={presetsExtras}
                  verCostos={verCostos}
                  onChange={next => { setExtras(next); soltarPrecioEditado(); }}
                />

                {/* Running total */}
                {calcTotal > 0 && (
                  <div className="bg-[#FAFAF8]/70 border border-[#52B788]/20 rounded-sm px-4 py-3">
                    {(pkgsTotal > 0 || extrasTotal > 0) && (
                      <div className="mb-2 pb-2 border-b border-[#52B788]/15 space-y-1">
                        <div className="flex justify-between text-xs font-dm text-[#1B4332]/50"><span>Tours</span><span>{fmx(toursTotal)}</span></div>
                        {pkgsTotal > 0 && <div className="flex justify-between text-xs font-dm text-[#40916C]"><span>Hospedaje</span><span>{fmx(pkgsTotal)}</span></div>}
                        {extrasTotal > 0 && <div className="flex justify-between text-xs font-dm text-[#C4882A]"><span>Extras</span><span>{fmx(extrasTotal)}</span></div>}
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm">Total estimado</span>
                      <span className="font-cormorant text-[#52B788] text-xl">{fmx(calcTotal)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Step 3: Condiciones ── */}
            {step === 3 && (
              <div className="space-y-4">
                {/* Vigencia */}
                <div>
                  <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Vigencia de la cotización</label>
                  <select value={vigencia} onChange={e => setVigencia(e.target.value)} className={inputCls}>
                    <option value="48h">48 horas</option>
                    <option value="7dias">7 días</option>
                    <option value="15dias">15 días</option>
                    <option value="30dias">30 días</option>
                  </select>
                </div>

                {/* Fecha límite: nace al enviar; en una ya enviada se puede mover a mano */}
                {(() => {
                  const yaEnviada = isEditMode && (editTarget?.status === "enviada" || editTarget?.status === "expirada");
                  const alEnviar  = calcularVencimiento(new Date(), vigencia, lines[0]?.tourDate);
                  return (
                    <div>
                      <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Fecha límite para decidir</label>
                      {yaEnviada ? (
                        <>
                          <input type="date" value={venceEdit} min={hoyMX()} onChange={e => setVenceEdit(e.target.value)} className={inputCls} />
                          <p className="text-[11px] text-[#1B4332]/45 font-dm mt-1">
                            Un día antes sale el recordatorio. Si la mueves, se le vuelve a recordar
                            {editTarget?.status === "expirada" ? " y la cotización regresa a Enviada." : "."}
                          </p>
                        </>
                      ) : (
                        <p className="text-[12px] text-[#1B4332]/60 font-dm border border-[#1B4332]/10 bg-[#FAFAF8] px-3 py-2.5 rounded-sm">
                          Se pone sola al enviarla: <strong className="text-[#1B4332]">{fDateL(alEnviar)}</strong>
                          <span className="text-[#1B4332]/45"> (la vigencia, sin pasar de la víspera del tour).</span>
                        </p>
                      )}
                    </div>
                  );
                })()}

                {/* Precio editable */}
                <div className="border border-[#52B788]/30 bg-[#52B788]/6 px-4 py-3 rounded-sm">
                  {(pkgsTotal > 0 || extrasTotal > 0) && (
                    <div className="mb-2 pb-2 border-b border-[#52B788]/15 space-y-1">
                      <div className="flex justify-between text-xs font-dm text-[#1B4332]/50"><span>Tours</span><span>{fmx(toursTotal)}</span></div>
                      {pkgsTotal > 0 && <div className="flex justify-between text-xs font-dm text-[#40916C]"><span>Hospedaje</span><span>{fmx(pkgsTotal)}</span></div>}
                      {extrasTotal > 0 && <div className="flex justify-between text-xs font-dm text-[#C4882A]"><span>Extras</span><span>{fmx(extrasTotal)}</span></div>}
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">
                        Subtotal {priceOverride !== "" ? <span className="text-[#52B788]">(editado)</span> : "(calculado)"}
                      </p>
                      {editingPrice ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[#1B4332]/40 font-dm text-sm">$</span>
                          <input type="number" min={0} value={priceOverride}
                            onChange={e => setPriceOverride(e.target.value)}
                            placeholder={String(calcTotal)}
                            className="flex-1 border border-[#52B788]/50 bg-white text-[#52B788] font-cormorant text-xl px-2 py-1 focus:outline-none rounded-sm"
                            autoFocus />
                          <span className="text-[#1B4332]/40 font-dm text-sm">MXN</span>
                        </div>
                      ) : (
                        <p className="font-cormorant text-[#52B788] text-2xl">{fmx(baseTotal)}</p>
                      )}
                      {priceOverride !== "" && (
                        <button onClick={() => { setPriceOverride(""); setEditingPrice(false); }}
                          className="text-[10px] font-dm text-[#1B4332]/40 hover:text-[#1B4332] mt-1 underline">
                          Restaurar ({fmx(calcTotal)})
                        </button>
                      )}
                    </div>
                    <button onClick={() => { if (editingPrice) setEditingPrice(false); else { setEditingPrice(true); if (priceOverride === "") setPriceOverride(String(calcTotal)); } }}
                      className="flex items-center gap-1 border border-[#52B788]/40 text-[#52B788] px-2.5 py-1.5 text-xs font-dm hover:bg-[#52B788]/10 transition-colors rounded-sm">
                      {editingPrice ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                      {editingPrice ? "OK" : "Editar"}
                    </button>
                  </div>
                </div>

                {/* Descuento, con candado (ver `descuento.ts`) */}
                <DescuentoEditor
                  tipo={discountType}
                  valor={discountValue}
                  onCambio={(tipo, valor) => { setDiscountType(tipo); setDiscountValue(valor); }}
                  base={baseTotal}
                  guardado={descuentoGuardado}
                  historial={descuentoHistorial}
                  inputCls={inputCls}
                  cumple={{
                    codigo: codigoCumple,
                    lineas: lines,
                    cuando: "cuando la cotización se convierta en reserva",
                    onAplicar: (codigo, monto) => { setCodigoCumple(codigo); setDiscountType("fixed"); setDiscountValue(String(monto)); },
                    // Quitar el código quita también el descuento que puso.
                    onQuitar: () => { setCodigoCumple(""); setDiscountType("percent"); setDiscountValue(""); },
                  }}
                />

                {/* Total final */}
                {(discountAmt > 0 || baseTotal > 0) && (
                  <div className="border border-[#1B4332]/15 bg-[#1B4332] px-4 py-3 rounded-sm flex justify-between items-center">
                    <span className="text-[9px] tracking-[2px] uppercase text-white/50 font-dm">Total final</span>
                    <span className="font-cormorant text-[#52B788] text-2xl">{fmx(finalTotal)}</span>
                  </div>
                )}

                {/* Anticipo: por porcentaje o por monto */}
                <div className="border border-[#C9484A]/20 bg-[#C9484A]/5 px-4 py-3 rounded-sm">
                  <p className="text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-2">Anticipo para reservar</p>

                  <div className="flex gap-2 items-center">
                    <div className="flex border border-[#1B4332]/15 rounded-sm overflow-hidden">
                      <button type="button" onClick={() => setAnticipoTipo("percent")}
                        className={`px-3 py-2 text-xs font-dm transition-colors ${anticipoTipo === "percent" ? "bg-[#C9484A] text-white" : "bg-white text-[#1B4332]/60 hover:bg-[#FAFAF8]"}`}>%</button>
                      <button type="button" onClick={() => setAnticipoTipo("fixed")}
                        className={`px-3 py-2 text-xs font-dm transition-colors ${anticipoTipo === "fixed" ? "bg-[#C9484A] text-white" : "bg-white text-[#1B4332]/60 hover:bg-[#FAFAF8]"}`}>$</button>
                    </div>
                    <input type="number" min={0} value={anticipoValor}
                      onChange={e => setAnticipoValor(e.target.value)}
                      placeholder={anticipoTipo === "percent" ? "30" : String(Math.round(finalTotal * 0.3))}
                      className={`flex-1 ${inputCls}`} />
                    {anticipoValor !== "" && (
                      <button type="button" onClick={() => setAnticipoValor("")} className="text-[#1B4332]/30 hover:text-red-500">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Atajos: los tres anticipos que se usan de verdad. */}
                  <div className="flex gap-1.5 flex-wrap mt-2">
                    {[30, 50, 100].map(p => (
                      <button key={p} type="button"
                        onClick={() => { setAnticipoTipo("percent"); setAnticipoValor(String(p)); }}
                        className={`text-[10px] font-dm px-2 py-1 rounded border transition-colors ${
                          anticipoTipo === "percent" && anticipoValor === String(p)
                            ? "bg-[#C9484A] text-white border-[#C9484A]"
                            : "border-[#C9484A]/30 text-[#C9484A] hover:bg-[#C9484A]/10"
                        }`}>
                        {p === 100 ? "Pago completo" : `${p}%`} · {fmx(Math.round(finalTotal * (p / 100)))}
                      </button>
                    ))}
                  </div>

                  {finalTotal > 0 && (
                    <div className="mt-2.5 pt-2.5 border-t border-[#C9484A]/15 space-y-0.5">
                      <p className="flex justify-between text-xs font-dm text-[#1B4332]">
                        <span>Anticipo{anticipoValor === "" && " (30% por omisión)"}</span>
                        <span className="font-medium">{fmx(anticipoNum)} <span className="text-[#1B4332]/40">({anticipoPct}%)</span></span>
                      </p>
                      <p className="flex justify-between text-xs font-dm text-[#1B4332]/50">
                        <span>Saldo el día del tour</span><span>{fmx(saldoRestante)}</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            </fieldset>
            </div>{/* end scrollable */}

            {/* El aviso del editor, junto a sus botones (20 nov 2026): antes salía
                arriba de la página, detrás del editor, y no se veía. */}
            {msg && <Aviso texto={msg} onCerrar={cerrarAviso} className="mx-6 mb-3 mt-1" />}

            {/* Footer navigation */}
            <div className="px-6 pb-5 pt-3 border-t border-[#1B4332]/8 flex items-center justify-between gap-3">
              {step > 1 ? (
                <button onClick={() => setStep(s => (s - 1) as 1 | 2 | 3)}
                  className="flex items-center gap-1 text-xs font-dm text-[#1B4332]/50 hover:text-[#1B4332] px-3 py-2 border border-[#1B4332]/15 rounded-sm transition-colors">
                  <ChevronLeft className="w-3.5 h-3.5" />Atrás
                </button>
              ) : <div />}

              {step < 3 ? (
                <button onClick={() => setStep(s => (s + 1) as 1 | 2 | 3)}
                  disabled={step === 1 ? !step1Valid : !step2Valid}
                  className="flex items-center gap-1.5 bg-[#1B4332] hover:bg-[#2D5A45] text-white px-5 py-2 text-[11px] font-dm uppercase tracking-[1.5px] transition-colors disabled:opacity-40 rounded-sm">
                  Siguiente <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : avisoLectura ? (
                <button onClick={closeModal}
                  className="bg-[#1B4332] hover:bg-[#2D5A45] text-white px-6 py-2.5 text-[11px] tracking-[2px] uppercase font-dm transition-colors rounded-sm">
                  Cerrar
                </button>
              ) : (
                <button onClick={saveQuote}
                  disabled={saving || !form.customerName || !lines.every(lineaCompleta)}
                  className="bg-[#1B4332] hover:bg-[#2D5A45] text-white px-6 py-2.5 text-[11px] tracking-[2px] uppercase font-dm transition-colors disabled:opacity-40 rounded-sm">
                  {saving ? "Guardando..." : isEditMode ? "Actualizar cotización" : "Guardar cotización"}
                </button>
              )}
            </div>

          </div>
        </div>
        );
      })()}
    </div>
  );
}

/**
 * «Pagó en línea $1,860 · HP-M-…» (13 nov 2026): la cotización cuya liga se
 * pagó (la del correo o una de Cobros) se ve pagada en la lista, con la reserva
 * en la que quedó. El folio lleva a Reservas.
 */
function ChipPagoEnLinea({ monto, folio }: { monto?: number; folio: string | null }) {
  if (!monto || monto <= 0) return null;
  return (
    <p className="mt-1.5 flex flex-wrap items-center gap-1.5 font-dm text-[11px]">
      <span className="px-1.5 py-0.5 rounded bg-[#40916C]/12 text-[#1B4332] font-semibold">💳 Pagó en línea ${monto.toLocaleString("es-MX")}</span>
      {folio && (
        <a href={`/admin/reservas?folio=${encodeURIComponent(folio)}`} onClick={(e) => e.stopPropagation()}
          className="text-[#40916C] underline underline-offset-2 hover:text-[#1B4332]">{folio}</a>
      )}
    </p>
  );
}
