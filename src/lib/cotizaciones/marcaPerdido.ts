// La marca «Perdido» de una cotización (19 nov 2026, pedido de Manolo: «si
// marco uno como perdido, ponle marca a la cotización de que ya está
// perdido»).
//
// 🔴 No se guarda en la cotización: sale, al leerla, de la etapa de su lead
// (`TourQuote.oportunidadId` → `Oportunidad.etapa`). Así no hace falta columna
// nueva (Railway aplica el esquema al arrancar) y la marca se quita sola si el
// lead regresa: un pago tardío de su liga lo revive (`leadPorLigaDePago`), y
// también moverlo a mano. Un estado «perdida» guardado en la cotización habría
// que deshacerlo en cada uno de esos caminos, y su estado (Enviada, Vencida…)
// sigue contando igual en el KPI «Cotización → reserva».
//
// Qué cambia para la cotización de un lead Perdido (decisión de Manolo, 19 nov 2026):
//  · al cliente ya no le llegan los correos automáticos (+3/24/72 h y «vence mañana»);
//  · sale del resumen diario del equipo y de «Por vencer» (franja y campanita);
//  · su liga de pago SIGUE sirviendo mientras la cotización no venza: si paga,
//    el lead regresa solo. Vence en su fecha, como cualquier otra.
//
// Puro (sin base): lo usan la lista de Cotizaciones, su vista previa, la ficha
// del lead y los crons `secuencia-cotizaciones` y `resumen-cotizaciones`.

import { etiquetaMotivoPerdida } from "@/lib/admin/crm";

/** La etapa del lead que marca sus cotizaciones. */
export const ETAPA_PERDIDO = "perdido";

/** Lo que hace falta saber del lead de una cotización. */
export interface LeadDeCotizacion {
  etapa?:         string | null;
  motivoPerdida?: string | null;
}

/** La marca de una cotización cuyo lead está Perdido. */
export interface MarcaPerdido {
  /** Lo que dice el chip: «Perdido · Precio», o «Perdido» sin motivo. El motivo va recortado. */
  texto:  string;
  /** El motivo completo y legible («Otro: se casó»), o null. */
  motivo: string | null;
  /** Para el `title` del chip: el motivo completo y qué pasa con la cotización. */
  ayuda:  string;
}

/** Cuántas letras del motivo caben en el chip; el motivo completo va en `ayuda`. */
export const LARGO_MOTIVO_CHIP = 40;

/** Estados de la cotización a los que el seguimiento automático todavía les escribiría. */
const VIVAS = ["borrador", "enviada"];

const limpio = (t: string) => t.replace(/\s+/g, " ").trim();

function recortar(t: string, max: number): string {
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

/** ¿El lead está Perdido? Sin lead (las cotizaciones de antes del CRM), no. */
export function esLeadPerdido(lead: LeadDeCotizacion | null | undefined): boolean {
  return lead?.etapa === ETAPA_PERDIDO;
}

/**
 * La marca de una cotización según su lead, o null si el lead no está
 * Perdido. Decide SOLO la etapa: un `motivoPerdida` que quedó guardado en un
 * lead que ya regresó no marca nada. `estado` (el de la cotización) solo
 * cambia la explicación: a una vencida o aceptada ya no le iban a llegar correos.
 */
export function marcaPerdido(lead: LeadDeCotizacion | null | undefined, estado?: string | null): MarcaPerdido | null {
  if (!esLeadPerdido(lead)) return null;
  const motivo = limpio(etiquetaMotivoPerdida(lead?.motivoPerdida ?? null)) || null;
  const viva = !estado || VIVAS.includes(estado);
  return {
    texto:  motivo ? `Perdido · ${recortar(motivo, LARGO_MOTIVO_CHIP)}` : "Perdido",
    motivo,
    ayuda:  `Su lead está Perdido${motivo ? ` (${motivo})` : ""}.`
      + (viva
        ? " Ya no le llegan al cliente los correos automáticos de esta cotización, y no sale en «Por vencer» ni en el resumen del equipo. Su liga de pago sirve mientras la cotización no venza: si paga, el lead regresa solo."
        : ""),
  };
}

/** Los leads de unas cotizaciones, sin repetir: para buscar de una vez cuáles están perdidos. */
export function leadsDeCotizaciones(cotizaciones: ReadonlyArray<{ oportunidadId?: string | null }>): string[] {
  return Array.from(new Set(cotizaciones.map(q => q.oportunidadId).filter((x): x is string => !!x)));
}

/** ¿La cotización es de un lead Perdido? `perdidos`: los ids de los leads que están en Perdido. */
export function esCotizacionPerdida(q: { oportunidadId?: string | null }, perdidos: ReadonlySet<string>): boolean {
  return !!q.oportunidadId && perdidos.has(q.oportunidadId);
}
