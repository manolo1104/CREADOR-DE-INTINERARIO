// Lo que hace falta para avanzar con un lead, en un vistazo (Manolo, 3 nov
// 2026: «nutre la información de los leads con info relevante como anticipo,
// si viene de Valles o Xilitla… para poder proceder con el lead desde esa
// misma pestaña»). Puro: lo arma el servidor con su cotización y su reserva
// más recientes, y lo prueban los tests.

import { fechaLimite, etapaDe, type Etapa as EtapaCotizacion } from "../vencimientoCotizacion";
import { grupoDe, grupoLargo, lineasDe, metaDe } from "./reserva";
import { extrasDe, etiquetaExtra } from "./extras";
import { descuentoDeMeta, textoDescuento } from "./descuento";
import { montoCobrado } from "./dinero";

export interface CotizacionCruda {
  id: string; quoteNumber: string; status: string; totalAmount: number; tourName: string; tourSlug: string; tourDate: string;
  adults: number; children: number; notes: string | null; lineItems: unknown; packageItems: unknown; extraItems: unknown; createdAt: Date | string;
}
export interface ReservaCruda {
  id: string; confirmationNumber: string; status: string; totalAmount: number; depositoPagado: number; stripePaymentIntentId: string | null;
  tourName: string; tourDate: string; adults: number; children: number; notes: string | null; lineItems: unknown; packageItems: unknown;
  extraItems: unknown; guia: string | null; idiomaTour: string | null; createdAt: Date | string;
}

export interface ResumenLead {
  /** De dónde salen las cifras: la reserva viva si hay, si no la cotización. */
  fuente: { tipo: "reserva" | "cotizacion"; id: string; folio: string } | null;
  total: number | null;
  anticipo: { acordado: number; esPorOmision: boolean; cobrado: number | null; falta: number | null } | null;
  saleDe: "Xilitla" | "Ciudad Valles" | null;
  fechaViaje: string | null;
  grupo: string | null;
  tours: string[];
  hospedaje: string[];
  extras: string[];
  descuento: string | null;
  notasInternas: string | null;
  cotizacion: { id: string; folio: string; status: string; vence: string | null; estado: EtapaCotizacion } | null;
  reserva: { id: string; folio: string; status: string; encuentro: string | null; guia: string | null; idiomaTour: string | null } | null;
}

const ANTICIPO_POR_OMISION = 0.3;
const fechaValida = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
const metaPaquetes = (packageItems: unknown): Record<string, any> =>
  (Array.isArray(packageItems) ? (packageItems as any[]).find(p => p && p._meta === true) : null) ?? {};
const zonaDe = (texto: unknown): "Xilitla" | "Ciudad Valles" | null =>
  typeof texto !== "string" ? null : /valles/i.test(texto) ? "Ciudad Valles" : /xilitla/i.test(texto) ? "Xilitla" : null;

/** «Paraíso Encantado · 2 noches · Suite» por cada renglón de hospedaje. */
function hospedajeDe(packageItems: unknown): string[] {
  if (!Array.isArray(packageItems)) return [];
  return (packageItems as any[]).filter(p => p && !p._meta && (p.hotel || p.habitacion)).map(p => {
    const noches = Number(p.noches) || 0;
    return [p.hotel || "Hospedaje", noches ? `${noches} noche${noches === 1 ? "" : "s"}` : null, p.habitacion || null].filter(Boolean).join(" · ");
  });
}

/** La cotización que manda: la más reciente que no esté archivada. */
export function cotizacionVigente<T extends CotizacionCruda>(cs: T[]): T | null {
  const vivas = cs.filter(c => c.status !== "archivada");
  return [...vivas].sort((a, b) => String(new Date(b.createdAt).toISOString()).localeCompare(new Date(a.createdAt).toISOString()))[0] ?? null;
}

export function resumenLead(cotizaciones: CotizacionCruda[], reservas: ReservaCruda[], hoy: string): ResumenLead {
  const q = cotizacionVigente(cotizaciones);
  const r = [...reservas].filter(x => x.status !== "cancelled")
    .sort((a, b) => new Date(b.createdAt).toISOString().localeCompare(new Date(a.createdAt).toISOString()))[0] ?? null;

  const qMeta = q ? metaPaquetes(q.packageItems) : {};
  const rMeta = r ? metaDe(r) : {};
  const base = r ?? q;
  const total = base ? base.totalAmount : null;

  let anticipo: ResumenLead["anticipo"] = null;
  if (total) {
    const pactado = r ? Number(rMeta.anticipoAcordado) || 0 : Number(qMeta.anticipo) || 0;
    const acordado = pactado > 0 ? Math.min(pactado, total) : Math.round(total * ANTICIPO_POR_OMISION);
    const cobrado = r ? montoCobrado({ depositoPagado: r.depositoPagado, stripePaymentIntentId: r.stripePaymentIntentId, totalAmount: r.totalAmount, createdAt: new Date(r.createdAt) }) : null;
    anticipo = { acordado, esPorOmision: pactado <= 0, cobrado, falta: cobrado === null ? null : Math.max(0, total - cobrado) };
  }

  const zona = zonaDe(rMeta.zonaHospedaje) ?? zonaDe(qMeta.zonaHospedaje)
    ?? (hospedajeDe(base?.packageItems).length ? "Xilitla" : null);
  const desc = descuentoDeMeta(r ? rMeta : qMeta);
  const interno = String(rMeta.notasInternas || qMeta.notasInternas || "").trim();

  return {
    fuente: r ? { tipo: "reserva", id: r.id, folio: r.confirmationNumber } : q ? { tipo: "cotizacion", id: q.id, folio: q.quoteNumber } : null,
    total,
    anticipo,
    saleDe: zona,
    fechaViaje: base ? fechaValida(base.tourDate) : null,
    grupo: base ? grupoLargo(grupoDe(base as never)) : null,
    tours: base ? Array.from(new Set(lineasDe(base as never).map(l => l.tourName).filter((t): t is string => !!t))) : [],
    hospedaje: hospedajeDe(base?.packageItems),
    extras: base ? extrasDe(base.extraItems).map(etiquetaExtra) : [],
    descuento: textoDescuento(desc),
    notasInternas: interno || null,
    cotizacion: q ? { id: q.id, folio: q.quoteNumber, status: q.status, vence: fechaLimite(q), estado: etapaDe(q, hoy) } : null,
    reserva: r ? {
      id: r.id, folio: r.confirmationNumber, status: r.status,
      encuentro: typeof rMeta.pickupLugar === "string" && rMeta.pickupLugar.trim() ? rMeta.pickupLugar.trim() : null,
      guia: r.guia, idiomaTour: r.idiomaTour,
    } : null,
  };
}
