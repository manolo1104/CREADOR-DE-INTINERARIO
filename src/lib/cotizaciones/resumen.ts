// El resumen de una cotización para WhatsApp, y lo que contestan las rutas del
// bot que cotizan (`/api/bot/quote`, `/paquete` y `/lead`).
//
// Es lo PRIMERO que lee el cliente: el bot lo pega tal cual antes de cualquier
// dato de pago (agent.js lo antepone a su respuesta). Se arma aquí y no en el
// modelo por lo mismo que antes se armaba en cada ruta: pedido por prompt, el
// bot se saltaba el desglose y soltaba la CLABE sin decir qué se apartaba. Pero
// había TRES resúmenes, uno por ruta, con tres reglas de saldo («con tarjeta»,
// «el día del primer recorrido», nada) y una «vigencia de 48 horas» sin fecha.
// Ahora sale uno solo, de la MISMA cuenta que se guardó en el panel.
//
// Corto a propósito: se lee en un teléfono. El desglose completo (renglones,
// descuento, términos) va en el correo y en el PDF del mismo folio.
//
// 🔴 Sin datos bancarios: los manda el bot con `whatsapp-bot/payment.js`, la
// única fuente. El sitio tenía otras dos (variables BANK_* y un «BBVA» fijo en
// /api/bot/paquete) y no coincidían con la cuenta que de verdad se usa.

import type { TourQuote } from "@prisma/client";
import {
  TOURS_DB, claveIncluye, fmtHora12, incluyeDeTour, partesRecogida, recogidaDeTour, type Tour,
} from "@/lib/tours";
import { getPaquete, type Paquete } from "@/lib/paquetes";
import { localizeTour } from "@/lib/i18n/localize";
import { localizePaquete } from "@/lib/i18n/paquetes.en";
import { fraseRecogidaCorreo, lineasCancelacion, pasamosPorEl } from "@/lib/recogidaCorreo";
import { incluyeDesayuno } from "@/lib/catalogoResumen";
import { desgloseCotizacion } from "@/lib/admin/totalesCotizacion";
import { VIGENCIAS, calcularVencimiento, fechaLimite, vigenciaDe } from "@/lib/vencimientoCotizacion";
import { addDaysYMD, hoyMX } from "@/lib/dates";
import { BOT } from "@/lib/admin/bitacora";
import {
  CORTE_MANANA_MIN, calcularCotizacionBotConCupo, guardarCotizacionBot, metaDeCotizacion, minutosDelDiaMX,
  pagoDeCotizacionAnterior, reemplazarCotizacion,
} from "./armar";
import { enviarCotizacionPorCorreo, marcarEnviadaPorWhatsapp } from "./enviar";
import type {
  ClienteCotizacionBot, CotizacionBotInput, CotizacionCalculada, ErrorPrecio, HospedajeCotizacionBot,
  HospedajePrecio, ItemBotCrudo, LineaPrecio, LocaleBot, PaquetePrecio, PaqueteCotizacionBot,
  ResultadoEnvio, ResultadoReemplazo,
} from "./tipos";

/** El slug reservado de los conceptos escritos a mano (`SLUG_PERSONALIZADO` del panel). */
const SLUG_PERSONALIZADO = "__personalizado";

const HOTEL = "Hotel Paraíso Encantado";

// ── Utilidades ──────────────────────────────────────────────────────────────

const texto = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);

const esYMD = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** Pesos sin centavos: «$3,985». */
const mx = (n: number) => `$${Math.round(Number(n) || 0).toLocaleString("es-MX")}`;

const mayuscula = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/**
 * La primera letra en minúscula para meterlo en una lista («…, guía
 * certificado NOM-09 SECTUR, …»), salvo que la palabra vaya toda en
 * mayúsculas (una sigla: «PADI», «RZR»).
 */
const minuscula = (s: string) =>
  s.length > 1 && s.charAt(1) === s.charAt(1).toLowerCase() ? s.charAt(0).toLowerCase() + s.slice(1) : s;

/** «a, b y c» · «a, b and c». */
function enLista(xs: string[], en: boolean): string {
  if (xs.length <= 1) return xs.join("");
  return `${xs.slice(0, -1).join(", ")} ${en ? "and" : "y"} ${xs[xs.length - 1]}`;
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

/** Las piezas de una fecha civil, en el idioma del cliente. */
function partesFecha(ymd: string, en: boolean) {
  const d = new Date(`${ymd}T12:00:00Z`);
  const loc = en ? "en-US" : "es-MX";
  return {
    semana: d.toLocaleDateString(loc, { weekday: "long", timeZone: "UTC" }),
    mes:    d.toLocaleDateString(loc, { month: "long", timeZone: "UTC" }),
    dia:    Number(ymd.slice(8, 10)),
    anio:   ymd.slice(0, 4),
  };
}

/**
 * «martes 20 de octubre» · «Tuesday, October 20». El año solo si no es el de
 * hoy: una cotización de enero hecha en octubre no se presta a confusión, pero
 * sin el año sí.
 */
function fechaLarga(ymd: string, en: boolean, hoy: string): string {
  if (!esYMD(ymd)) return "";
  const p = partesFecha(ymd, en);
  const conAnio = p.anio !== hoy.slice(0, 4);
  return en
    ? `${p.semana}, ${p.mes} ${p.dia}${conAnio ? `, ${p.anio}` : ""}`
    : `${p.semana} ${p.dia} de ${p.mes}${conAnio ? ` de ${p.anio}` : ""}`;
}

/** «del jueves 15 al domingo 18 de octubre» · «Thursday, October 15 to Sunday, October 18». */
function rangoFechas(desde: string, hasta: string, en: boolean, hoy: string): string {
  if (!esYMD(desde) || !esYMD(hasta)) return fechaLarga(desde, en, hoy);
  if (en) return `${fechaLarga(desde, en, hoy)} to ${fechaLarga(hasta, en, hoy)}`;
  const a = partesFecha(desde, false);
  const mismoMes = desde.slice(0, 7) === hasta.slice(0, 7);
  return `del ${mismoMes ? `${a.semana} ${a.dia}` : fechaLarga(desde, false, hoy)} al ${fechaLarga(hasta, false, hoy)}`;
}

/** «10:00» → «10:00 AM»; lo que no se entienda, tal cual. */
function hora12(hhmm: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  return m ? fmtHora12(Number(m[1]) + Number(m[2]) / 60) : hhmm;
}

/** «2 adultos + 1 niño de 6 a 10 + 1 menor de 6»: los tramos se dicen, si no el total no cuadra. */
function textoPersonas(a: number, m: number, s: number, en: boolean): string {
  const partes: string[] = [];
  if (a > 0) partes.push(en ? plural(a, "adult", "adults") : plural(a, "adulto", "adultos"));
  if (m > 0) partes.push(en ? `${plural(m, "child", "children")} (6–10)` : `${plural(m, "niño", "niños")} de 6 a 10`);
  if (s > 0) partes.push(en ? `${plural(s, "child", "children")} under 6` : `${plural(s, "menor", "menores")} de 6`);
  return partes.join(" + ");
}

const tourDe = (slug: unknown): Tour | undefined =>
  typeof slug === "string" && slug && slug !== SLUG_PERSONALIZADO ? TOURS_DB.find((t) => t.slug === slug) : undefined;

const nombreCorto = (t: Tour, en: boolean) => (en ? localizeTour(t, "en").nombreCorto : t.nombreCorto);

// ── Lo que se va a decir, sin importar de dónde salió ───────────────────────

interface Recorrido {
  tour?:       Tour;
  /** El nombre guardado: se usa solo si el recorrido no está en el catálogo. */
  nombre:      string;
  fecha:       string;
  adultos:     number;
  ninosMid:    number;
  ninosSmall:  number;
  /** RZR: la gente que dijo (el precio es por unidad). */
  personas:    number;
  rzr?:        { ruta: string; vehiculo: string; unidades: number; capacidad?: string };
  /** RZR: la hora de inicio que eligió ("HH:MM"). */
  hora?:       string;
  /** Lo que se cobra por este recorrido. Solo en los sueltos de una cuenta recién hecha. */
  total?:      number;
  /** Precio de temporada por adulto y el de lista, si en ESA fecha aplica. */
  promo?:      { porAdulto: number; lista: number };
  viajeroSolo?: boolean;
  addOns?:     { nombre: string; cantidad: number }[];
}

interface Estancia {
  habitacion:   string;
  checkin:      string;
  checkout:     string;
  noches:       number;
  habitaciones: number;
  /** Solo las noches sueltas llevan precio propio; las del paquete van en el suyo. */
  subtotal?:    number;
}

interface PaqueteVista {
  paquete?:   Paquete;
  nombre:     string;
  fecha:      string;
  adultos:    number;
  ninosMid:   number;
  ninosSmall: number;
  total?:     number;
  conPromo:   boolean;
  hotel?:     Estancia;
  /** Sus recorridos, en orden. Los conceptos escritos a mano no se listan. */
  recorridos: Recorrido[];
}

interface Vista {
  folio:      string;
  recorridos: Recorrido[];
  paquete?:   PaqueteVista;
  hotel?:     Estancia;
  total:      number;
  anticipo:   number;
  saldo:      number;
  pct:        number;
  venceEl:    string | null;
  /** «48 h», «7 días»: la que se le prometió. */
  vigencia:   string;
  /** El folio que esta cotización dejó sin efecto (ya reemplazado). */
  reemplazaA?: string;
}

function recorridoDeLinea(l: LineaPrecio): Recorrido {
  const promo = l.promo?.aplica && l.porPersona && l.promo.precioLista && l.promo.precioLista > l.porPersona
    ? { porAdulto: l.porPersona, lista: l.promo.precioLista }
    : undefined;
  return {
    tour: tourDe(l.slug), nombre: l.nombre, fecha: l.tourDate,
    adultos: l.adultos, ninosMid: l.ninosMid, ninosSmall: l.ninosSmall, personas: l.personas,
    ...(l.cobro === "vehiculo" && l.ruta && l.vehiculo
      ? { rzr: { ruta: l.ruta, vehiculo: l.vehiculo, unidades: l.unidades ?? 1, capacidad: l.capacidadTexto } }
      : {}),
    ...(l.hora ? { hora: l.hora } : {}),
    total: l.total,
    ...(promo ? { promo } : {}),
    ...(l.viajeroSolo ? { viajeroSolo: true } : {}),
    ...(l.addOns?.length ? { addOns: l.addOns.map((a) => ({ nombre: a.nombre, cantidad: a.cantidad })) } : {}),
  };
}

/** Un renglón guardado (`lineItems`), del bot o del panel. */
function recorridoGuardado(g: Record<string, any>): Recorrido {
  const num = (v: unknown) => Math.max(0, Math.floor(Number(v) || 0));
  return {
    tour: tourDe(g.tourSlug), nombre: String(g.tourName ?? ""), fecha: String(g.tourDate ?? ""),
    adultos: num(g.adults), ninosMid: num(g.childrenMid), ninosSmall: num(g.childrenSmall),
    personas: num(g.adults) + num(g.childrenMid) + num(g.childrenSmall),
    ...(g.ruta && g.vehiculo ? { rzr: { ruta: String(g.ruta), vehiculo: String(g.vehiculo), unidades: Math.max(1, num(g.unidades)) } } : {}),
    ...(typeof g.hora === "string" && g.hora ? { hora: g.hora } : {}),
    ...(Array.isArray(g.addOns) && g.addOns.length
      ? { addOns: g.addOns.map((a: any) => ({ nombre: String(a?.nombre ?? a?.id ?? ""), cantidad: num(a?.cantidad) })) }
      : {}),
  };
}

const esConcepto = (g: Record<string, any>) => g.tourSlug === SLUG_PERSONALIZADO;

/** Las habitaciones guardadas (`packageItems` sin el `_meta`), juntas en una estancia. */
function estanciaDe(filas: Record<string, any>[], conPrecio: boolean): Estancia | undefined {
  if (!filas.length) return undefined;
  const f = filas[0];
  return {
    habitacion:   String(f.habitacion ?? ""),
    checkin:      String(f.checkin ?? ""),
    checkout:     String(f.checkout ?? ""),
    noches:       Math.max(0, Number(f.noches) || 0),
    habitaciones: filas.reduce((s, x) => s + Math.max(1, Number(x.habitaciones) || 1), 0),
    ...(conPrecio ? { subtotal: filas.reduce((s, x) => s + (Number(x.subtotal) || 0), 0) } : {}),
  };
}

function nombrePaquete(p: Paquete | undefined, nombre: string, en: boolean): string {
  const base = p ? (en ? localizePaquete(p, "en").nombre : p.nombre) : nombre;
  if (p?.evento) return base;
  if (en) return /package/i.test(base) ? base : `${base} package`;
  return /^paquete/i.test(base) ? base : `Paquete ${base}`;
}

/** De la cuenta recién hecha (`calcularCotizacionBot`): trae el precio de cada recorrido. */
function vistaDeCalculo(c: CotizacionCalculada, folio: string, venceEl: string | null, en: boolean): Vista {
  // Los recorridos guardados que NO están entre los sueltos son los del paquete.
  const pendientes = c.lineas.map((l) => `${l.slug}|${l.tourDate}`);
  const delPaquete: Recorrido[] = [];
  for (const g of c.guardar.lineItems as Record<string, any>[]) {
    const i = pendientes.indexOf(`${g.tourSlug}|${g.tourDate}`);
    if (i >= 0) { pendientes.splice(i, 1); continue; }
    if (!esConcepto(g)) delPaquete.push(recorridoGuardado(g));
  }

  let paquete: PaqueteVista | undefined;
  if (c.paquete) {
    const p: PaquetePrecio = c.paquete;
    const def = getPaquete(p.slug);
    paquete = {
      paquete: def, nombre: nombrePaquete(def, p.nombre, en), fecha: p.fecha,
      adultos: p.adultos, ninosMid: p.ninosMid, ninosSmall: p.ninosSmall,
      total: p.total, conPromo: !!p.promo?.aplica,
      ...(p.noches > 0 ? {
        hotel: { habitacion: p.habitacion ?? "", checkin: p.checkin, checkout: p.checkout, noches: p.noches, habitaciones: p.habitaciones },
      } : {}),
      recorridos: delPaquete,
    };
  }

  const h: HospedajePrecio | undefined = c.hospedaje;
  return {
    folio,
    recorridos: c.lineas.map(recorridoDeLinea),
    ...(paquete ? { paquete } : {}),
    ...(h ? { hotel: { habitacion: h.habitacion, checkin: h.checkin, checkout: h.checkout, noches: h.noches, habitaciones: h.habitaciones, subtotal: h.subtotal } } : {}),
    total: c.total, anticipo: c.anticipo, saldo: c.saldo, pct: c.pctAnticipo,
    venceEl,
    // Las del bot nacen todas con 48 h (`_meta.vigencia`), igual en los dos idiomas.
    vigencia: "48 h",
  };
}

/**
 * De una cotización ya guardada (del bot o del panel). No sabe cuánto vale
 * cada recorrido por separado —el panel guarda precios de lista y el total
 * puede llevar ajuste—, así que solo dice el total.
 */
function vistaDeCotizacion(q: TourQuote, venceEl: string | null, en: boolean): Vista {
  const meta = metaDeCotizacion(q.packageItems);
  const lineas = Array.isArray(q.lineItems)
    ? (q.lineItems as Record<string, any>[]).filter((l) => l && typeof l === "object" && !l._meta)
    : [];
  const filas = Array.isArray(q.packageItems)
    ? (q.packageItems as Record<string, any>[]).filter((p) => p && typeof p === "object" && p._meta !== true)
    : [];
  const slugPaquete = typeof meta.paqueteSlug === "string" ? meta.paqueteSlug : q.tourSlug;
  const def = slugPaquete ? getPaquete(slugPaquete) : undefined;
  const recorridos = lineas.filter((l) => !esConcepto(l)).map(recorridoGuardado);
  const d = desgloseCotizacion(0, q.totalAmount, meta);
  const vig = vigenciaDe(q.packageItems);
  const etiquetaVigencia = vig === "48h" ? "48 h" : (en ? VIGENCIAS[vig].label.replace("días", "days") : VIGENCIAS[vig].label);

  const base = {
    folio: q.quoteNumber,
    total: q.totalAmount, anticipo: d.anticipo, saldo: d.saldo, pct: d.anticipoPct,
    venceEl, vigencia: etiquetaVigencia,
  };
  if (def) {
    const grupo = lineas[0] ?? {};
    return {
      ...base,
      recorridos: [],
      paquete: {
        paquete: def, nombre: nombrePaquete(def, def.nombre, en), fecha: def.evento?.fecha ?? q.tourDate,
        adultos: Number(grupo.adults) || q.adults, ninosMid: Number(grupo.childrenMid) || 0, ninosSmall: Number(grupo.childrenSmall) || 0,
        conPromo: false,
        ...(filas.length ? { hotel: estanciaDe(filas, false) } : {}),
        recorridos,
      },
    };
  }
  return { ...base, recorridos, ...(filas.length ? { hotel: estanciaDe(filas, true) } : {}) };
}

// ── El texto ────────────────────────────────────────────────────────────────

function nombreRecorrido(r: Recorrido, en: boolean): string {
  if (!r.tour) return r.nombre;
  return nombreCorto(r.tour, en);
}

/** «Ruta Miradores · 2 × Defender (6 adultos c/u)»: en el RZR se cobra la unidad, no la persona. */
function detalleRzr(r: Recorrido, en: boolean): string {
  if (!r.rzr) return "";
  // Ruta, unidad y capacidad en su idioma: las del catálogo inglés en la misma
  // posición (se guardan con el nombre en español).
  const t = r.tour;
  const iRuta = t?.rutas?.findIndex((x) => x.nombre === r.rzr!.ruta) ?? -1;
  const iVeh = t?.flota?.findIndex((x) => x.nombre === r.rzr!.vehiculo) ?? -1;
  const loc = en && t ? localizeTour(t, "en") : undefined;
  const ruta = (iRuta >= 0 && loc?.rutas?.[iRuta]?.nombre) || r.rzr.ruta;
  const vehiculo = (iVeh >= 0 && loc?.flota?.[iVeh]?.nombre) || r.rzr.vehiculo;
  const capacidad = (iVeh >= 0 && (loc ?? t)?.flota?.[iVeh]?.capacidad) || r.rzr.capacidad;
  const u = r.rzr.unidades;
  const cap = capacidad ? ` (${capacidad}${u > 1 ? (en ? " each" : " c/u") : ""})` : "";
  return `${ruta} · ${u > 1 ? `${u} × ` : ""}${vehiculo}${cap}`;
}

function bloqueRecorrido(r: Recorrido, en: boolean, hoy: string): string[] {
  const fecha = fechaLarga(r.fecha, en, hoy) || (en ? "date to be confirmed" : "fecha por confirmar");
  const L = [`*${nombreRecorrido(r, en)}* · ${fecha}`];
  const precio = r.total !== undefined ? ` · ${mx(r.total)}` : "";
  if (r.rzr) {
    const inicio = r.hora ? ` · ${en ? "starts" : "arranca"} ${hora12(r.hora)}` : "";
    const gente = r.personas > 0 ? ` · ${en ? plural(r.personas, "person", "people") : plural(r.personas, "persona", "personas")}` : "";
    L.push(`${detalleRzr(r, en)}${gente}${inicio}${precio}`);
  } else if (r.viajeroSolo) {
    L.push(`${en ? "1 person (solo traveler rate)" : "1 persona (tarifa de viajero solo)"}${precio}`);
  } else {
    L.push(`${textoPersonas(r.adultos, r.ninosMid, r.ninosSmall, en)}${precio}`);
  }
  for (const a of r.addOns ?? []) L.push(`➕ ${a.nombre}${a.cantidad > 1 ? ` (×${a.cantidad})` : ""}`);
  if (r.promo) {
    L.push(en
      ? `🏷️ Low-season price: ${mx(r.promo.porAdulto)} per adult (instead of ${mx(r.promo.lista)}).`
      : `🏷️ Precio de temporada: ${mx(r.promo.porAdulto)} por adulto (en lugar de ${mx(r.promo.lista)}).`);
  }
  return L;
}

function lineaEstancia(h: Estancia, en: boolean, hoy: string, incluida: boolean): string[] {
  const hab = h.habitacion ? ` · ${h.habitacion}` : "";
  const cuartos = h.habitaciones > 1 ? (en ? `${h.habitaciones} rooms · ` : `${h.habitaciones} habitaciones · `) : "";
  const noches = en ? plural(h.noches, "night", "nights") : plural(h.noches, "noche", "noches");
  const fechas = rangoFechas(h.checkin, h.checkout, en, hoy);
  const precio = !incluida && h.subtotal !== undefined ? ` · ${mx(h.subtotal)}` : "";
  // Mayúscula solo si la fecha abre el renglón («Del jueves…», no «2 habitaciones · Del…»).
  return [`🏨 *${HOTEL}*${hab} · ${noches}`, `${cuartos}${cuartos ? fechas : mayuscula(fechas)}${precio}`];
}

function bloquePaquete(p: PaqueteVista, en: boolean, hoy: string): string[] {
  const personas = textoPersonas(p.adultos, p.ninosMid, p.ninosSmall, en);
  const sinHotel = !p.hotel;
  const fecha = sinHotel ? ` · ${fechaLarga(p.fecha, en, hoy)}` : "";
  const precio = p.total !== undefined ? ` · ${mx(p.total)}` : "";
  const L = [`*${p.nombre}*${fecha}`, `${personas}${precio}`];
  if (p.hotel) L.push(...lineaEstancia(p.hotel, en, hoy, true));
  for (const r of p.recorridos) {
    const extra = r.rzr ? ` (${detalleRzr(r, en)})` : "";
    L.push(`• ${mayuscula(fechaLarga(r.fecha, en, hoy))}: ${nombreRecorrido(r, en)}${extra}`);
  }
  if (p.conPromo) L.push(en ? "🏷️ Includes the low-season price." : "🏷️ Con el precio de temporada.");
  return L;
}

/**
 * Lo que va incluido, «sin prometer de más»: la lista DEL CATÁLOGO de cada
 * recorrido (`incluyeDeTour`, la misma del correo y de la ficha), recortada a
 * lo que se promete —lo de antes de la primera coma o raya es la promesa; lo
 * de después, detalle que ya está en el correo—. Con varios recorridos, lo que
 * TODOS traen va una vez y lo propio de cada uno aparte: decir «todos incluyen
 * desayuno» porque lo trae uno es justo el error que los correos ya evitaban
 * (el rafting lleva comida, el RZR ni desayuno ni traslado).
 */
function recortar(item: string): string {
  const i = item.search(/,\s|\s[—–-]\s|:\s|\s\(/);
  return (i > 0 ? item.slice(0, i) : item).trim()
    // «Comida incluida» dentro de un «Incluye: …» se lee dos veces.
    .replace(/\s+(incluid[ao]s?|included)$/i, "");
}

function incluyeDe(t: Tour, locale: LocaleBot, rutas: string[] = []): string[] {
  const loc = localizeTour(t, locale);
  // Lo que suma la ruta elegida del RZR (el kayak de la Ruta Nacimiento).
  const deRutas = rutas.reduce<string[]>((a, nombre) => {
    const i = t.rutas?.findIndex((x) => x.nombre === nombre) ?? -1;
    return i >= 0 ? a.concat(loc.rutas?.[i]?.incluye ?? t.rutas?.[i]?.incluye ?? []) : a;
  }, []);
  const out: string[] = [];
  for (const item of [...incluyeDeTour(loc, locale), ...deRutas]) {
    // En el RZR ya eligió ruta: «4 rutas a elegir» sobra.
    if (t.precioUnidad === "vehiculo" && /a elegir|to choose/i.test(item)) continue;
    const corto = recortar(item);
    if (corto && !out.some((x) => claveIncluye(x) === claveIncluye(corto))) out.push(corto);
  }
  return out;
}

function bloqueIncluye(v: Vista, locale: LocaleBot): string[] {
  const en = locale === "en";
  const grupos: { nombre: string; items: string[] }[] = [];
  const vistos: string[] = [];
  const ev = v.paquete?.paquete?.evento;
  // Un paquete de evento (Xantolo) se dice con SU lista: lleva la degustación
  // y la noche con guía, que no son de ningún recorrido del catálogo.
  if (ev && v.paquete?.paquete) {
    const p = en ? localizePaquete(v.paquete.paquete, "en") : v.paquete.paquete;
    grupos.push({ nombre: v.paquete.nombre, items: p.incluye.map(recortar).filter(Boolean) });
  }
  const recorridos = [...(ev ? [] : v.paquete?.recorridos ?? []), ...v.recorridos];
  for (const r of recorridos) {
    if (!r.tour || vistos.indexOf(r.tour.slug) >= 0) continue;
    vistos.push(r.tour.slug);
    const slug = r.tour.slug;
    const rutas = recorridos.filter((x) => x.tour?.slug === slug && x.rzr).map((x) => x.rzr!.ruta);
    grupos.push({ nombre: nombreCorto(r.tour, en), items: incluyeDe(r.tour, locale, rutas) });
  }
  const conItems = grupos.filter((g) => g.items.length);
  if (!conItems.length) return [];
  if (conItems.length === 1) {
    return [`✅ *${en ? "Includes" : "Incluye"}:* ${enLista(conItems[0].items.map(minuscula), en)}.`];
  }
  const esta = (xs: string[], x: string) => xs.some((y) => claveIncluye(y) === claveIncluye(x));
  const comunes = conItems[0].items.filter((x) => conItems.every((g) => esta(g.items, x)));
  const L: string[] = [];
  if (comunes.length) L.push(`✅ *${en ? "All of them include" : "Todos incluyen"}:* ${enLista(comunes.map(minuscula), en)}.`);
  for (const g of conItems) {
    const propios = g.items.filter((x) => !esta(comunes, x));
    if (!propios.length) continue;
    const verbo = comunes.length ? (en ? "also includes" : "también incluye") : (en ? "includes" : "incluye");
    L.push(`• *${g.nombre}* ${verbo}: ${enLista(propios.map(minuscula), en)}.`);
  }
  return L;
}

/** La recogida de un recorrido; el RZR, a la hora que eligió (de 9 am a 5 pm). */
function fraseRecogidaDe(t: Tour, hora: string | undefined, en: boolean): string {
  if (hora && recogidaDeTour(t).tipo === "base-xilitla") {
    const lugar = partesRecogida(t, en).lugar;
    return en
      ? `We meet at ${lugar} at ${hora12(hora)}, the time you chose. Transport to Xilitla isn't included.`
      : `Nos vemos en ${lugar} a las ${hora12(hora)}, la hora que elegiste. El transporte hasta Xilitla no está incluido.`;
  }
  // El tour del catálogo en español: `fraseRecogidaCorreo` revisa su «incluye»
  // con palabras en español para saber si la recogida está en duda.
  return fraseRecogidaCorreo(t, en);
}

/** La Noche de Xantolo sin hotel: pasa por él a su hospedaje, de noche. */
function fraseEvento(p: Paquete, en: boolean): string {
  const ev = p.evento!;
  const horario = ev.horario ?? "";
  if (en) {
    const rango = horario.replace(/^de\s+(.+?)\s+a\s+(.+)$/i, "$1–$2");
    return `We pick you up at your lodging${/xilitla/i.test(ev.recogida ?? "") ? " in Xilitla" : ""}${rango ? ` (${rango})` : ""}.`;
  }
  return `Pasamos por ti a ${ev.recogida ?? "tu hospedaje"}${horario ? ` (${horario})` : ""}.`;
}

/** Todos los recorridos de la cotización: los del paquete y los sueltos. */
const todos = (v: Vista) => [...(v.paquete?.recorridos ?? []), ...v.recorridos];

const llevaHotel = (v: Vista) => !!v.hotel || !!v.paquete?.hotel;

function bloqueRecogida(v: Vista, en: boolean): string[] {
  const filas: { nombre: string; frase: string; tour?: Tour }[] = [];
  const vistos: string[] = [];
  for (const r of todos(v)) {
    if (!r.tour) continue;
    const clave = `${r.tour.slug}|${r.hora ?? ""}`;
    if (vistos.indexOf(clave) >= 0) continue;
    vistos.push(clave);
    filas.push({ nombre: nombreCorto(r.tour, en), frase: fraseRecogidaDe(r.tour, r.hora, en), tour: r.tour });
  }
  const p = v.paquete?.paquete;
  if (p?.evento?.sinHotel) filas.push({ nombre: v.paquete!.nombre, frase: fraseEvento(p, en) });
  if (!filas.length) return [];
  if (filas.every((f) => f.frase === filas[0].frase)) {
    // Sin hotel nuestro y con recogida en su hospedaje, lo que más se pregunta.
    const todosPasan = filas.every((f) => (f.tour ? pasamosPorEl(f.tour) : true));
    const extra = !llevaHotel(v) && todosPasan
      ? (en ? " You don't need to stay with us." : " No necesitas hospedarte con nosotros.")
      : "";
    return [`📍 ${filas[0].frase}${extra}`];
  }
  return [en ? "📍 *Pick-up:*" : "📍 *Dónde y a qué hora:*", ...filas.map((f) => `• ${f.nombre}: ${f.frase}`)];
}

function bloqueCancelacion(v: Vista, locale: LocaleBot): string[] {
  const en = locale === "en";
  const c = lineasCancelacion(
    todos(v).map((r) => r.tour?.slug),
    locale,
    en ? "Free cancellation up to 48 h before, with a full refund" : "Cancelas gratis hasta 48 h antes, con reembolso completo",
  );
  return [...c.garantia.map((g) => `↩️ ${g}.`), ...c.detalle.map((d) => `↩️ ${d}`)];
}

/**
 * El saldo, como lo cobra el equipo: el día del tour en efectivo o
 * transferencia (el guía NO cobra con tarjeta, aunque los textos viejos lo
 * decían); con hotel, al hacer check-in.
 */
function lineasDinero(v: Vista, en: boolean): string[] {
  const fechas = todos(v).map((r) => r.fecha).filter(esYMD);
  const varios = fechas.some((f) => f !== fechas[0]);
  const cuando = llevaHotel(v)
    ? (en ? "is paid at hotel check-in" : "se paga al hacer check-in en el hotel")
    : en
      ? `is paid on the day of ${varios ? "the first tour" : "the tour"} in cash or by bank transfer`
      : `se paga el día ${varios ? "del primer recorrido" : "del tour"} en efectivo o transferencia`;
  const L = [`💰 *Total: ${mx(v.total)} MXN*`];
  if (v.saldo > 0) {
    L.push(en
      ? `You book it with *${mx(v.anticipo)}* (${v.pct}%). The rest, *${mx(v.saldo)}*, ${cuando}.`
      : `Apartas con *${mx(v.anticipo)}* (${v.pct} %). El resto, *${mx(v.saldo)}*, ${cuando}.`);
  } else {
    L.push(en ? `You book it with *${mx(v.anticipo)}* (the full amount).` : `Apartas con *${mx(v.anticipo)}* (el total).`);
  }
  return L;
}

/** «Vale 48 h: hasta el jueves 8 de octubre», o lo que de verdad aplique si el tour ya está encima. */
function lineaVigencia(v: Vista, en: boolean, hoy: string, despuesDeLas10 = false): string {
  if (!esYMD(v.venceEl)) return en ? `⏳ Valid for ${v.vigencia}.` : `⏳ Vale ${v.vigencia}.`;
  const primera = todos(v).map((r) => r.fecha).filter(esYMD).sort()[0] ?? v.paquete?.fecha ?? "";
  if (v.venceEl < hoy) {
    const cuando = fechaLarga(v.venceEl, en, hoy);
    return en ? `⏳ This quote expired on ${cuando}.` : `⏳ Esta cotización venció el ${cuando}.`;
  }
  if (v.venceEl === hoy) {
    // Para mañana el anticipo tiene que llegar antes de las 10 pm (regla del
    // equipo: es cuando se arma la logística de la mañana).
    if (primera === addDaysYMD(hoy, 1)) {
      // De 10 pm a medianoche ese plazo ya pasó: no se le promete al cliente.
      if (despuesDeLas10) {
        return en
          ? "⏳ The tour is tomorrow: once you pay, our team will confirm first thing in the morning whether there's space."
          : "⏳ El tour es mañana: en cuanto pagues, el equipo te confirma a primera hora si hay lugar.";
      }
      return en ? "⏳ The tour is tomorrow: book it today before 10 pm." : "⏳ El tour es mañana: apártalo hoy antes de las 10 pm.";
    }
    return en ? "⏳ Valid until today." : "⏳ Vale solo hoy.";
  }
  const fecha = fechaLarga(v.venceEl, en, hoy);
  // Topada en la víspera: decir «48 h» prometería más de lo que vale.
  if (esYMD(primera) && v.venceEl === addDaysYMD(primera, -1) && v.vigencia === "48 h" && v.venceEl < addDaysYMD(hoy, 2)) {
    return en ? `⏳ Valid until ${fecha}, the day before the tour.` : `⏳ Vale hasta el ${fecha}, la víspera del tour.`;
  }
  return en ? `⏳ Valid for ${v.vigencia}: until ${fecha}.` : `⏳ Vale ${v.vigencia}: hasta el ${fecha}.`;
}

/**
 * El aviso de que la anterior ya no vale, pegado al folio: es lo primero que
 * se lee, antes del precio nuevo. Sin él, el cliente tenía dos folios con dos
 * totales en el mismo chat y podía pagar el viejo.
 */
function lineaReemplazo(folioViejo: string, en: boolean): string {
  return en
    ? `♻️ This quote replaces ${folioViejo}, which is no longer valid.`
    : `♻️ Esta cotización reemplaza a la ${folioViejo}, que ya no es válida.`;
}

function armarTexto(v: Vista, locale: LocaleBot, hoy: string, despuesDeLas10 = false): string {
  const en = locale === "en";
  const L: string[] = [en ? `📋 *Your quote* · folio *${v.folio}*` : `📋 *Tu cotización* · folio *${v.folio}*`];
  if (v.reemplazaA) L.push(lineaReemplazo(v.reemplazaA, en));
  if (v.paquete) L.push("", ...bloquePaquete(v.paquete, en, hoy));
  for (const r of v.recorridos) L.push("", ...bloqueRecorrido(r, en, hoy));
  if (v.hotel) L.push("", ...lineaEstancia(v.hotel, en, hoy, false));

  const detalle = [...bloqueIncluye(v, locale), ...bloqueRecogida(v, en)];
  // El reclamo más caro en recepción: «¿no venía el desayuno?» el día de llegada.
  if (llevaHotel(v) && todos(v).some((r) => r.tour && incluyeDesayuno(r.tour))) {
    detalle.push(en
      ? "☕ Breakfast is included only on tour days (on the way, not at the hotel)."
      : "☕ El desayuno va incluido solo los días de recorrido (en ruta, no en el hotel).");
  }
  detalle.push(...bloqueCancelacion(v, locale));
  if (detalle.length) L.push("", ...detalle);

  L.push("", ...lineasDinero(v, en));
  L.push("", lineaVigencia(v, en, hoy, despuesDeLas10));
  L.push(en ? `🧾 Payment reference: *${v.folio}*` : `🧾 Concepto de tu pago: *${v.folio}*`);
  return L.join("\n");
}

export interface OpcionesResumen {
  /** Por omisión, el de la cotización guardada o español. */
  locale?:  LocaleBot;
  /** Obligatorio con una cuenta (`CotizacionCalculada`): ella no lo sabe. */
  folio?:   string;
  /** La fecha límite que quedó guardada al mandarla (YYYY-MM-DD). */
  venceEl?: string | null;
  /** Para probar con otro «hoy». */
  hoy?:     string;
  /** Para probar con otra hora: minutos del día en México. */
  minutosMX?: number;
  /**
   * El folio que esta cotización YA reemplazó (`reemplazarCotizacion` dijo
   * ok): agrega «♻️ Esta cotización reemplaza a la …». Solo si de verdad se
   * reemplazó: decirlo de una que sigue viva sería mentirle al cliente.
   */
  reemplazaA?: string;
}

const esCotizacionGuardada = (x: TourQuote | CotizacionCalculada): x is TourQuote =>
  typeof (x as TourQuote).quoteNumber === "string";

/**
 * El resumen para WhatsApp, en español o en inglés:
 *  · el folio;
 *  · cada recorrido con su fecha larga y la gente por tramos (y su precio, si
 *    viene de la cuenta recién hecha); el hotel con noches y habitación;
 *  · qué incluye (del catálogo) y dónde y a qué hora pasan por él;
 *  · el total, «apartas con $X (30 %)» y cuándo y cómo se paga el resto;
 *  · hasta cuándo vale y el folio como concepto del pago.
 *
 * Con una cotización guardada (`TourQuote`) se dice el total y no el precio
 * de cada recorrido: el panel guarda precios de lista y el total puede llevar
 * descuento o ajuste.
 */
export function resumenWhatsAppCotizacion(fuente: TourQuote | CotizacionCalculada, opciones: OpcionesResumen = {}): string {
  const hoy = opciones.hoy ?? hoyMX();
  const tarde = (opciones.minutosMX ?? minutosDelDiaMX()) >= CORTE_MANANA_MIN;
  const reemplazaA = texto(opciones.reemplazaA, 60).toUpperCase();
  const conReemplazo = (v: Vista): Vista => (reemplazaA ? { ...v, reemplazaA } : v);
  if (esCotizacionGuardada(fuente)) {
    const meta = metaDeCotizacion(fuente.packageItems);
    const locale: LocaleBot = (opciones.locale ?? meta.locale) === "en" ? "en" : "es";
    const venceEl = opciones.venceEl !== undefined ? opciones.venceEl : fechaLimite(fuente);
    return armarTexto(conReemplazo(vistaDeCotizacion(fuente, venceEl, locale === "en")), locale, hoy, tarde);
  }
  const locale: LocaleBot = opciones.locale === "en" ? "en" : "es";
  return armarTexto(conReemplazo(vistaDeCalculo(fuente, opciones.folio ?? "", opciones.venceEl ?? null, locale === "en")), locale, hoy, tarde);
}

// ── Del pedido del bot a la cuenta ──────────────────────────────────────────
//
// El bot desplegado no se actualiza a la vez que el sitio: estas funciones
// aceptan el pedido de antes (adults, childrenMid, customerPhone…) y el nuevo
// (adultos, waChatId, telefono, zonaHospedaje, locale, notasInternas).

const esObjeto = (v: unknown): v is Record<string, any> => !!v && typeof v === "object" && !Array.isArray(v);

/** Entero > 0, o undefined: «no lo dijo» no es lo mismo que cero. */
function enteroOpcional(v: unknown): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function booleano(v: unknown): boolean | undefined {
  if (v === true || v === "true") return true;
  if (v === false || v === "false") return false;
  return undefined;
}

/**
 * Cliente, idioma, zona, notas y reemplazo: lo que manda el bot en TODA ruta
 * que cotiza.
 *
 * `reemplazaA` (el folio de la cotización anterior, que pone el código del
 * bot) y `aparte` (es una opción más para comparar: no se reemplaza nada) son
 * del bot de oct 2026. Sin ellos todo sigue como antes.
 */
export function comunesDelBot(
  body: Record<string, any>,
): Pick<CotizacionBotInput, "cliente" | "locale" | "zonaHospedaje" | "notasInternas" | "notasCliente" | "reemplazaA" | "aparte"> {
  const reemplazaA = texto(body.reemplazaA, 60).toUpperCase();
  const aparte = booleano(body.aparte) === true;
  // Dos cotizaciones vivas del mismo cliente A PROPÓSITO: que quien la abra en
  // el panel sepa que la otra no es un error. Va primero para que el tope de
  // las notas no la corte.
  const notasInternas = [
    aparte && reemplazaA ? `Opción aparte para comparar: la ${reemplazaA} sigue vigente.` : "",
    texto(body.notasInternas, 1500),
  ].filter(Boolean).join("\n");
  const cliente: ClienteCotizacionBot = {
    nombre:   texto(body.customerName ?? body.nombre, 120),
    ...(texto(body.customerEmail ?? body.correo, 160) ? { correo: texto(body.customerEmail ?? body.correo, 160) } : {}),
    // El teléfono REAL (el bot nuevo lo manda aparte); el bot de antes solo
    // mandaba `customerPhone`. Uno de un chat @lid lo descarta `telefonoReal`.
    ...(texto(body.telefono ?? body.customerPhone, 40) ? { telefono: texto(body.telefono ?? body.customerPhone, 40) } : {}),
    ...(texto(body.waChatId, 120) ? { waChatId: texto(body.waChatId, 120) } : {}),
  };
  const locale = body.locale === "en" ? "en" : body.locale === "es" ? "es" : undefined;
  return {
    cliente,
    ...(locale ? { locale } : {}),
    ...(texto(body.zonaHospedaje, 80) ? { zonaHospedaje: texto(body.zonaHospedaje, 80) } : {}),
    ...(notasInternas ? { notasInternas } : {}),
    // `notes` / `notas` son las peticiones del cliente: SÍ salen en su
    // cotización (columna `notes`). Lo del equipo va en `notasInternas`.
    ...(texto(body.notes ?? body.notas, 1000) ? { notasCliente: texto(body.notes ?? body.notas, 1000) } : {}),
    ...(reemplazaA ? { reemplazaA } : {}),
    ...(aparte ? { aparte } : {}),
  };
}

/** Los recorridos tal como los manda el bot (`ItemBot`), también con los nombres de antes. */
export function itemsDelBot(v: unknown): ItemBotCrudo[] {
  if (!Array.isArray(v)) return [];
  return v.filter(esObjeto).map((i) => ({
    ...(typeof i.tipo === "string" ? { tipo: i.tipo } : {}),
    slug:       i.slug ?? i.tourSlug,
    tourDate:   i.tourDate ?? i.fecha,
    adultos:    i.adultos ?? i.adults,
    ninosMid:   i.ninosMid ?? i.childrenMid,
    ninosSmall: i.ninosSmall ?? i.childrenSmall,
    ...(Array.isArray(i.addOns) ? { addOns: i.addOns } : {}),
    ruta:       i.ruta,
    vehiculo:   i.vehiculo,
    unidades:   i.unidades,
    personas:   i.personas,
    hora:       i.hora,
  }));
}

/** El grupo más grande de los recorridos: cuánta gente duerme si no lo dijo. */
export function grupoDeItems(items: ItemBotCrudo[]): number {
  return items.reduce((max, i) => {
    const gente = (enteroOpcional(i.adultos) ?? 0) + (enteroOpcional(i.ninosMid) ?? 0) + (enteroOpcional(i.ninosSmall) ?? 0);
    return Math.max(max, gente, enteroOpcional(i.personas) ?? 0);
  }, 0);
}

/**
 * Las noches de hotel, SOLO si el cliente dijo que sí («interesado»). Si el
 * bot no manda la bandera pero sí el cuarto o la fecha, se entiende que sí:
 * el modelo a veces la omite y el cliente se quedaba sin su hotel.
 */
export function hospedajeDelBot(v: unknown, huespedesPorOmision = 0): HospedajeCotizacionBot | undefined {
  if (!esObjeto(v)) return undefined;
  const interesado = booleano(v.interesado);
  if (interesado === false) return undefined;
  if (interesado !== true && !texto(v.habitacion) && !texto(v.checkin)) return undefined;
  return {
    habitacion: texto(v.habitacion, 80),
    checkin:    texto(v.checkin, 10),
    ...(texto(v.checkout, 10) ? { checkout: texto(v.checkout, 10) } : {}),
    ...(enteroOpcional(v.noches) ? { noches: enteroOpcional(v.noches) } : {}),
    ...(enteroOpcional(v.habitaciones) ? { habitaciones: enteroOpcional(v.habitaciones) } : {}),
    huespedes:  enteroOpcional(v.huespedes) ?? huespedesPorOmision,
  };
}

/**
 * Un paquete del catálogo o de evento. `fecha` es el día 1 del paquete (el de
 * antes la mandaba como `checkin`); con `nocheExtra` el check-in es la víspera.
 * Sin adultos dichos, los de `personas` menos los niños; sin nada, la pareja.
 */
export function paqueteDelBot(v: unknown): PaqueteCotizacionBot | undefined {
  if (!esObjeto(v)) return undefined;
  const slug = texto(v.slug ?? v.paqueteSlug, 80);
  if (!slug) return undefined;
  const ninosMid = enteroOpcional(v.ninosMid);
  const ninosSmall = enteroOpcional(v.ninosSmall);
  const porPersonas = enteroOpcional(v.personas) !== undefined
    ? Math.max(0, enteroOpcional(v.personas)! - (ninosMid ?? 0) - (ninosSmall ?? 0))
    : undefined;
  const vistaMontana = booleano(v.vistaMontana);
  const nocheExtra = booleano(v.nocheExtra);
  return {
    slug,
    fecha:   texto(v.fecha ?? v.checkin ?? v.tourDate, 10),
    adultos: enteroOpcional(v.adultos) ?? porPersonas ?? 2,
    ...(ninosMid ? { ninosMid } : {}),
    ...(ninosSmall ? { ninosSmall } : {}),
    ...(vistaMontana !== undefined ? { vistaMontana } : {}),
    ...(nocheExtra !== undefined ? { nocheExtra } : {}),
    ...(Array.isArray(v.eleccion) ? { eleccion: v.eleccion.map((x: unknown) => texto(x, 80)).filter(Boolean) } : {}),
    ...(Array.isArray(v.reparto) ? { reparto: v.reparto.map((x: unknown) => Number(x)) } : {}),
    ...(texto(v.habitacion, 80) ? { habitacion: texto(v.habitacion, 80) } : {}),
  };
}

// ── Lo que contestan las rutas que cotizan ──────────────────────────────────

/** Los motivos en una sola frase, para el `error` de un 400. */
export function motivosDe(errores: ErrorPrecio[]): string {
  return errores.map((e) => e.motivo).filter(Boolean).join(" ");
}

/** Todos los avisos de la cuenta (fecha, edad, cuarto…), sin repetir. */
function avisosDe(c: CotizacionCalculada): string[] {
  const todosLosAvisos = [
    ...c.lineas.reduce<string[]>((a, l) => a.concat(l.avisos ?? []), []),
    ...(c.paquete?.avisos ?? []),
    ...(c.hospedaje?.avisos ?? []),
  ];
  return todosLosAvisos.filter((x, i) => todosLosAvisos.indexOf(x) === i);
}

/**
 * Link para pagar con tarjeta en la web, SOLO cuando la web vende exactamente
 * lo cotizado: un recorrido por persona, o un paquete solo. El cliente vuelve a
 * capturar sus datos ahí (el link por folio es la fase siguiente, con Stripe).
 * Con varios recorridos, hotel o RZR no hay página que lo cobre igual: null.
 */
function linkDePago(c: CotizacionCalculada, en: boolean): string | null {
  const base = (process.env.APP_URL || "https://www.huasteca-potosina.com").replace(/\/$/, "") + (en ? "/en" : "");
  if (c.paquete && !c.lineas.length && !c.hospedaje) return `${base}/reservar-paquete/${c.paquete.slug}`;
  if (!c.paquete && !c.hospedaje && c.lineas.length === 1 && c.lineas[0].cobro !== "vehiculo") {
    return `${base}/reservar-tour/${c.lineas[0].slug}`;
  }
  return null;
}

export interface RespuestaCotizacionBot {
  folio:          string;
  total:          number;
  anticipo:       number;
  saldo:          number;
  pctAnticipo:    number;
  moneda:         "MXN";
  /** Fecha límite (YYYY-MM-DD, hora de México). */
  venceEl:        string;
  vigencia:       "48h";
  /** Para pegar TAL CUAL como primer mensaje. Sin datos bancarios. */
  resumenWhatsApp: string;
  /** ¿Le llegó un correo AL CLIENTE? (sin su correo, la copia va solo al equipo). */
  emailEnviado:   boolean;
  linkPago:       string | null;
  tourName:       string;
  tourDate:       string;
  personas:       number | null;
  recorridos:     LineaPrecio[];
  hospedaje?:     HospedajePrecio;
  paquete?:       PaquetePrecio;
  /** Lo que hay que decir o confirmar (para mañana, edad, cuarto…). No impidió cotizar. */
  avisos?:        string[];
  /**
   * Solo si el bot mandó `reemplazaA`: qué pasó con la anterior. Con `ok:
   * true` ya no vale y `resumenWhatsApp` lo dice; con `ok: false` sigue como
   * estaba (el `motivo` dice por qué) y la nueva igual quedó.
   */
  reemplazo?:     ResultadoReemplazo;
  instruccion:    string;
}

export type ResultadoRuta =
  | { status: 200; body: RespuestaCotizacionBot }
  | { status: 400 | 500; body: { error: string; errores?: ErrorPrecio[] } }
  /** La que se iba a reemplazar ya está pagada: NO nació otra (ver `pagoDeCotizacionAnterior`). */
  | { status: 409; body: { error: string; pagoEnCurso: true; folio: string; reservaFolio: string | null } };

/**
 * Lo que hacen /api/bot/quote, /paquete y /lead, igual que el panel:
 *
 *  0. Si el bot manda `reemplazaA` (y no `aparte`) y ESA cotización ya está
 *     pagada (reserva, aceptada, o el cliente ya reservó después), 409 con
 *     `pagoEnCurso` y NO nace otra: un cambio después de pagar lo ve el
 *     equipo. 🔴 Antes nacía y se mandaba por correo, con otro anticipo.
 *  1. La cuenta SIN guardar. Si algo de lo pedido no se puede (cupo, mínimo,
 *     solo adultos, fecha, ruta), 400 con el motivo y NO nace un folio: una
 *     cotización a la que le falta un recorrido le llegaría al cliente por
 *     correo como si fuera lo que pidió.
 *  2. La guarda como «borrador» (`guardarCotizacionBot`, folio COT-).
 *  3. La manda por correo como el botón del panel: al cliente con copia al
 *     equipo o, sin correo del cliente, al equipo. Ahí nacen la fecha límite
 *     (48 h) y el seguimiento. Si el correo falla, se anota como enviada por
 *     WhatsApp —que es por donde la recibe—, para que no se quede en «Sin enviar».
 *  4. Si el bot mandó `reemplazaA` (y no `aparte`), da por reemplazada la
 *     anterior (`reemplazarCotizacion`). Va DESPUÉS de guardar y mandar la
 *     nueva: si algo falla antes, la vieja sigue valiendo y el cliente nunca
 *     se queda sin una cotización que pagar.
 *  5. Contesta lo que el bot necesita, con el resumen ya escrito (y la línea
 *     ♻️ si de verdad se reemplazó).
 *
 * Nunca lanza: los errores de la base salen como 500 con su mensaje.
 */
export async function cotizarParaBot(input: CotizacionBotInput, etiqueta = "bot/cotizar"): Promise<ResultadoRuta> {
  const folioAnterior = texto(input.reemplazaA, 60).toUpperCase();
  if (folioAnterior && input.aparte !== true) {
    const pago = await pagoDeCotizacionAnterior(folioAnterior, input.cliente);
    if (pago) {
      console.warn(`⚠️ ${etiqueta}: no se creó otra cotización; ${pago.motivo}`);
      return {
        status: 409,
        body: { error: pago.motivo, pagoEnCurso: true, folio: pago.folio, reservaFolio: pago.reservaFolio },
      };
    }
  }

  let previa: CotizacionCalculada;
  try {
    previa = await calcularCotizacionBotConCupo(input);
  } catch (e: unknown) {
    console.error(`❌ ${etiqueta} cuenta:`, e instanceof Error ? e.message : e);
    return { status: 500, body: { error: "No se pudo calcular la cotización." } };
  }
  if (previa.errores.length) {
    return { status: 400, body: { error: motivosDe(previa.errores), errores: previa.errores } };
  }
  if (previa.vacia) {
    return { status: 400, body: { error: "No hay nada que cotizar: manda al menos un recorrido, un paquete o las noches de hotel.", errores: [] } };
  }

  let guardada: Awaited<ReturnType<typeof guardarCotizacionBot>>;
  try {
    guardada = await guardarCotizacionBot(input, BOT);
  } catch (e: unknown) {
    console.error(`❌ ${etiqueta} guardar:`, e instanceof Error ? e.message : e);
    return { status: 500, body: { error: "No se pudo crear la cotización." } };
  }
  const { quote, calc } = guardada;
  if (!quote) {
    return { status: 400, body: { error: motivosDe(calc.errores) || "No se pudo crear la cotización.", errores: calc.errores } };
  }

  let envio: ResultadoEnvio = await enviarCotizacionPorCorreo(quote.id, BOT);
  if (!envio.ok && !envio.emailEnviado) {
    console.error(`❌ ${etiqueta} correo ${quote.quoteNumber}:`, envio.error);
    const porWhatsapp = await marcarEnviadaPorWhatsapp(quote.id, undefined, BOT);
    if (porWhatsapp.ok) envio = porWhatsapp;
    else console.error(`❌ ${etiqueta} anotar envío ${quote.quoteNumber}:`, porWhatsapp.error);
  }

  const reemplazo = await reemplazoDe(input, quote, etiqueta);

  const locale: LocaleBot = input.locale === "en" ? "en" : "es";
  // Si ni anotar el envío se pudo, la que le corresponde por la regla de las
  // 48 h: es la que el panel le calculará al mandarla.
  const venceEl = envio.venceEl ?? calcularVencimiento(new Date(), "48h", quote.tourDate || null);
  const avisos = avisosDe(calc);
  const instruccion = [
    "Manda `resumenWhatsApp` TAL CUAL como primer mensaje, antes de cualquier dato de pago.",
    reemplazo?.ok
      ? `Ya dice que reemplaza a la ${reemplazo.folio}: esa ya no vale; desde ahora habla solo de la ${quote.quoteNumber}.`
      : "",
  ].filter(Boolean).join(" ");
  return {
    status: 200,
    body: {
      folio:           quote.quoteNumber,
      total:           calc.total,
      anticipo:        calc.anticipo,
      saldo:           calc.saldo,
      pctAnticipo:     calc.pctAnticipo,
      moneda:          "MXN",
      venceEl,
      vigencia:        "48h",
      resumenWhatsApp: resumenWhatsAppCotizacion(calc, {
        locale, folio: quote.quoteNumber, venceEl,
        ...(reemplazo?.ok ? { reemplazaA: reemplazo.folio } : {}),
      }),
      emailEnviado:    envio.emailEnviado,
      linkPago:        linkDePago(calc, locale === "en"),
      tourName:        quote.tourName,
      tourDate:        quote.tourDate,
      personas:        calc.numPersonas,
      recorridos:      calc.lineas,
      ...(calc.hospedaje ? { hospedaje: calc.hospedaje } : {}),
      ...(calc.paquete ? { paquete: calc.paquete } : {}),
      ...(avisos.length ? { avisos } : {}),
      ...(reemplazo ? { reemplazo } : {}),
      instruccion,
    },
  };
}

/**
 * Qué pasa con la cotización anterior, o undefined si el bot no mandó
 * `reemplazaA`. Con `aparte: true` no se toca nada: el cliente pidió dos
 * opciones para comparar y las dos siguen valiendo. Nunca lanza.
 */
async function reemplazoDe(input: CotizacionBotInput, nueva: TourQuote, etiqueta: string): Promise<ResultadoReemplazo | undefined> {
  const folio = texto(input.reemplazaA, 60).toUpperCase();
  if (!folio) return undefined;
  if (input.aparte === true) {
    return { folio, ok: false, motivo: `Se cotizó aparte (opción para comparar): la ${folio} sigue vigente.` };
  }
  const r = await reemplazarCotizacion(folio, nueva);
  if (!r.ok) console.warn(`⚠️ ${etiqueta} no reemplazó ${folio} con ${nueva.quoteNumber}: ${r.motivo}`);
  return r;
}
