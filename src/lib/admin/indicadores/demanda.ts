// Demanda y canales (pestaña «Web y canales», 4 nov 2026).
//
// GA4 es la fuente de la web (regla del documento: una fuente por KPI); el
// panel aporta las reservas web, los leads del CRM y, como CRUCE, sus propios
// clics a WhatsApp. Search Console da la demanda del mercado (cuánta gente
// busca), que sirve para leer la temporada alta con tasas.

import { prisma } from "@/lib/prisma";
import { addDaysYMD, ymdMX } from "@/lib/dates";
import { tipoFolio } from "@/lib/admin/folio";
import { esDelPanel } from "@/lib/admin/clicsWhatsapp";
import { ETIQUETA_CANAL, type CanalGA4 } from "@/lib/admin/analisisComun";
import { detalleGA4, serieGA4, type DetalleGA4, type ResultadoGA4, type TotalesGA4 } from "./ga4";
import { busquedaGoogle, type Busqueda } from "./searchConsole";
import { SECCIONES, seccionDePagina, type Seccion } from "./secciones";
import { finMX, inicioMX } from "./periodo";
import { NO_CUENTAN, enPeriodo, r1, serie, sinDato, tasa } from "./util";
import type { Periodo, PuntoSerie, ValorKpi } from "./tipos";

export interface DatosDemanda {
  ga4: ResultadoGA4<DetalleGA4>;
  serieGa4: ResultadoGA4<TotalesGA4[]>;
  /** Fecha de captura (MX) de cada reserva con folio web, sin canceladas. */
  reservasWeb: string[];
  leads: { ymd: string; canal: string }[];
  /** Clics a WhatsApp que guardó el propio sitio en el periodo (sin /admin). */
  clicsPanel: number;
  busquedas: { buscadoEl: string; fechaViaje: string | null; personas: number | null }[];
  sinLugar: number;
  gsc: ResultadoGA4<Busqueda> | null;
  gscAnterior: ResultadoGA4<Busqueda> | null;
}

export interface FilaSeccion { seccion: Seccion; etiqueta: string; vistas: number; whatsapp: number; formularios: number; porMil: number | null }

export interface DetalleDemanda {
  ga4Ok: boolean;
  ga4Motivo: string | null;
  leidoEn: string | null;
  canales: { canal: CanalGA4; etiqueta: string; sesiones: number; pct: number | null; contactos: number; tasa: number | null }[];
  secciones: FilaSeccion[];
  paginas: { path: string; vistas: number; whatsapp: number; formularios: number }[];
  embudo: { venTour: number; inicianPago: number; compras: number } | null;
  cruce: { comprasGa4: number | null; reservasWeb: number; whatsappGa4: number | null; clicsPanel: number; diferenciaPct: number | null };
  busquedas: { total: number; porMes: { mes: string; n: number }[]; personasProm: number | null; anticipacionMediana: number | null; sinLugar: number };
  gsc: { ok: true; actual: Busqueda; anterior: Busqueda | null } | { ok: false; motivo: string } | null;
}

export interface MedicionDemanda { valores: ValorKpi[]; series: Record<string, PuntoSerie[]>; detalle: DetalleDemanda }

const n = (ev: DetalleGA4["eventos"], nombre: string) => ev[nombre]?.n ?? 0;
const personas = (ev: DetalleGA4["eventos"], nombre: string) => ev[nombre]?.personas ?? 0;
const sinCanal = (c: string) => !c || c === "por_confirmar";
const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** Puro: todo lo de la pestaña a partir de los datos ya leídos. */
export function calcularDemanda(d: DatosDemanda, p: Periodo, periodos: Periodo[]): MedicionDemanda {
  const valores: ValorKpi[] = [];
  const motivo = d.ga4.ok ? null : d.ga4.motivo;

  // ── Secciones del sitio (contactos por 1,000 vistas) ──
  const porSeccion = new Map<Seccion, FilaSeccion>(SECCIONES.map(s => [s.clave, { seccion: s.clave, etiqueta: s.etiqueta, vistas: 0, whatsapp: 0, formularios: 0, porMil: null }]));
  if (d.ga4.ok) {
    for (const pg of d.ga4.datos.paginas) {
      const f = porSeccion.get(seccionDePagina(pg.path))!;
      f.vistas += pg.vistas; f.whatsapp += pg.whatsapp; f.formularios += pg.formularios;
    }
  }
  const secciones = Array.from(porSeccion.values())
    .map(f => ({ ...f, porMil: f.vistas > 0 ? r1((f.whatsapp / f.vistas) * 1000) : null }))
    .sort((a, b) => b.vistas - a.vistas);
  const seccion = (s: Seccion) => secciones.find(x => x.seccion === s)!;

  if (d.ga4.ok) {
    const g = d.ga4.datos;
    const contactos = n(g.eventos, "whatsapp_contact") + n(g.eventos, "generate_lead") + n(g.eventos, "purchase");
    valores.push({ clave: "sesiones", valor: g.sesiones, detalle: `${g.vistas.toLocaleString("es-MX")} vistas`, calidad: "exacto" });
    valores.push(tasa("tasa-contacto", contactos, g.sesiones, { unidadDetalle: "sesiones" }));
    for (const [clave, s] of [["contactos-mil-tours", "tours"], ["contactos-mil-blog", "blog"]] as const) {
      const f = seccion(s);
      valores.push(f.vistas > 0
        ? { clave, valor: f.porMil, detalle: `${f.whatsapp} contactos en ${f.vistas.toLocaleString("es-MX")} vistas`, calidad: "exacto",
            nota: f.vistas < 1000 ? "Menos de 1,000 vistas: el documento pide al menos 1,000 para juzgar." : undefined }
        : sinDato(clave, "Sin vistas en el periodo."));
    }
    valores.push(tasa("conversion-pago", n(g.eventos, "purchase"), personas(g.eventos, "begin_checkout"), { unidadDetalle: "personas que iniciaron el pago" }));
    const seo = g.canales.find(c => c.canal === "seo")?.sesiones ?? 0;
    valores.push(tasa("peso-organico", seo, g.sesiones, { unidadDetalle: "sesiones" }));
  } else {
    for (const clave of ["sesiones", "tasa-contacto", "contactos-mil-tours", "contactos-mil-blog", "conversion-pago", "peso-organico"]) valores.push(sinDato(clave, motivo!));
  }

  const webEn = (x: Periodo) => d.reservasWeb.filter(y => enPeriodo(y, x)).length;
  valores.push({ clave: "reservas-web", valor: webEn(p), calidad: "exacto", detalle: "folio creado por el pago en línea" });
  const leadsDe = (x: Periodo) => d.leads.filter(l => enPeriodo(l.ymd, x));
  const lp = leadsDe(p);
  valores.push(tasa("leads-canal", lp.filter(l => !sinCanal(l.canal)).length, lp.length, { unidadDetalle: "leads", sinDatoNota: "No entraron leads al CRM en el periodo." }));

  // ── Tendencias ──
  const series: Record<string, PuntoSerie[]> = {};
  if (d.serieGa4.ok) {
    const t = d.serieGa4.datos;
    const de = (f: (x: TotalesGA4) => number | null) => serie(periodos, (_, i) => (t[i] ? f(t[i]) : null));
    series["sesiones"] = de(x => x.sesiones);
    series["tasa-contacto"] = de(x => (x.sesiones ? r1(((x.whatsapp + x.formularios + x.compras) / x.sesiones) * 100) : null));
    series["conversion-pago"] = de(x => (x.inicianPago ? r1((x.compras / x.inicianPago) * 100) : null));
    series["peso-organico"] = de(x => (x.sesiones ? r1((x.organicas / x.sesiones) * 100) : null));
  }
  series["reservas-web"] = serie(periodos, x => webEn(x));
  series["leads-canal"] = serie(periodos, x => { const l = leadsDe(x); return l.length ? r1((l.filter(y => !sinCanal(y.canal)).length / l.length) * 100) : null; });

  // ── Detalle ──
  const g = d.ga4.ok ? d.ga4.datos : null;
  const totalSes = g?.sesiones ?? 0;
  const canales = (g?.canales ?? []).map(c => ({
    canal: c.canal, etiqueta: ETIQUETA_CANAL[c.canal] ?? c.canal, sesiones: c.sesiones,
    pct: totalSes ? r1((c.sesiones / totalSes) * 100) : null, contactos: c.contactos,
    tasa: c.sesiones ? r1((c.contactos / c.sesiones) * 100) : null,
  }));
  const paginas = (g?.paginas ?? []).filter(x => x.whatsapp + x.formularios > 0)
    .sort((a, b) => (b.whatsapp + b.formularios) - (a.whatsapp + a.formularios) || b.vistas - a.vistas).slice(0, 15);
  const whatsappGa4 = g ? n(g.eventos, "whatsapp_contact") : null;

  // Búsquedas del propio sitio: para qué mes buscan y con cuánta anticipación.
  const porMes = new Map<string, number>();
  const anticip: number[] = [];
  for (const b of d.busquedas) {
    if (!b.fechaViaje) continue;
    porMes.set(b.fechaViaje.slice(0, 7), (porMes.get(b.fechaViaje.slice(0, 7)) ?? 0) + 1);
    const dias = Math.round((Date.parse(`${b.fechaViaje}T12:00:00Z`) - Date.parse(`${b.buscadoEl}T12:00:00Z`)) / 86_400_000);
    if (dias >= 0 && dias < 400) anticip.push(dias);
  }
  anticip.sort((a, b) => a - b);
  const conPersonas = d.busquedas.filter(b => (b.personas ?? 0) > 0);

  return {
    valores, series,
    detalle: {
      ga4Ok: d.ga4.ok, ga4Motivo: motivo, leidoEn: g?.leidoEn ?? null,
      canales, secciones, paginas,
      embudo: g ? { venTour: personas(g.eventos, "view_item"), inicianPago: personas(g.eventos, "begin_checkout"), compras: n(g.eventos, "purchase") } : null,
      cruce: {
        comprasGa4: g ? n(g.eventos, "purchase") : null, reservasWeb: webEn(p), whatsappGa4, clicsPanel: d.clicsPanel,
        diferenciaPct: whatsappGa4 ? Math.round(((d.clicsPanel - whatsappGa4) / whatsappGa4) * 100) : null,
      },
      busquedas: {
        total: d.busquedas.length,
        porMes: Array.from(porMes.entries()).sort().map(([mes, k]) => ({ mes: `${MES[Number(mes.slice(5, 7)) - 1]} ${mes.slice(0, 4)}`, n: k })),
        personasProm: conPersonas.length ? r1(conPersonas.reduce((t, b) => t + (b.personas ?? 0), 0) / conPersonas.length) : null,
        anticipacionMediana: anticip.length ? anticip[Math.floor(anticip.length / 2)] : null,
        sinLugar: d.sinLugar,
      },
      gsc: !d.gsc ? null : d.gsc.ok ? { ok: true, actual: d.gsc.datos, anterior: d.gscAnterior?.ok ? d.gscAnterior.datos : null } : { ok: false, motivo: d.gsc.motivo },
    },
  };
}

const minYMD = (a: string, b: string) => (a < b ? a : b);
const ymdDato = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

/** Lee todo (GA4, Search Console y la base) y calcula. */
export async function medirDemanda(p: Periodo, periodos: Periodo[], hoy: string): Promise<MedicionDemanda> {
  const span = { desde: periodos[0]?.desde ?? p.desde, hasta: p.hasta };
  // GA4 y Search Console no tienen el futuro; Search Console además publica con ~3 días de retraso.
  const hastaGa4 = minYMD(p.hasta, hoy);
  const hastaGsc = minYMD(p.hasta, addDaysYMD(hoy, -3));
  const dias = Math.round((Date.parse(`${hastaGsc}T12:00:00Z`) - Date.parse(`${p.desde}T12:00:00Z`)) / 86_400_000) + 1;
  const [ga4, serieGa4, reservas, leads, clics, busq, sinLugar, gsc, gscAnterior] = await Promise.all([
    detalleGA4(p.desde, hastaGa4),
    serieGA4(periodos.map(x => ({ desde: x.desde, hasta: minYMD(x.hasta, hoy) }))),
    prisma.tourBooking.findMany({
      where: { createdAt: { gte: inicioMX(span.desde), lte: finMX(span.hasta) }, status: { notIn: NO_CUENTAN } },
      select: { confirmationNumber: true, createdAt: true },
    }),
    prisma.oportunidad.findMany({ where: { createdAt: { gte: inicioMX(span.desde), lte: finMX(span.hasta) } }, select: { createdAt: true, canal: true } }).catch(() => []),
    prisma.trackEvent.findMany({ where: { event: "WHATSAPP_CLICK", createdAt: { gte: inicioMX(p.desde), lte: finMX(p.hasta) } }, select: { path: true, data: true }, take: 20000 }),
    prisma.trackEvent.findMany({ where: { event: { in: ["BUSCADOR_HERO", "VER_DISPONIBILIDAD"] }, createdAt: { gte: inicioMX(p.desde), lte: finMX(p.hasta) } }, select: { createdAt: true, data: true }, take: 20000 }),
    prisma.trackEvent.count({ where: { event: { in: ["APARTADO_SIN_LUGAR", "VIAJE_CDMX_SIN_LUGAR"] }, createdAt: { gte: inicioMX(p.desde), lte: finMX(p.hasta) } } }),
    dias > 0 ? busquedaGoogle(p.desde, hastaGsc) : Promise.resolve(null),
    dias > 0 ? busquedaGoogle(addDaysYMD(p.desde, -dias), addDaysYMD(p.desde, -1)) : Promise.resolve(null),
  ]);
  const datos: DatosDemanda = {
    ga4, serieGa4,
    reservasWeb: reservas.filter(b => tipoFolio(b.confirmationNumber) === "web").map(b => ymdMX(b.createdAt)),
    leads: leads.map(l => ({ ymd: ymdMX(l.createdAt), canal: l.canal })),
    clicsPanel: clics.filter(e => !esDelPanel(e.path || String((e.data as Record<string, unknown> | null)?.pagina ?? ""))).length,
    busquedas: busq.map(e => {
      const data = (e.data ?? {}) as Record<string, unknown>;
      return { buscadoEl: ymdMX(e.createdAt), fechaViaje: ymdDato(data.fecha), personas: Number(data.personas) || null };
    }),
    sinLugar, gsc, gscAnterior,
  };
  return calcularDemanda(datos, p, periodos);
}
