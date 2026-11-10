// De qué página y de qué canal llegó un lead de WhatsApp (4 nov 2026). Puro.
//
// Lo arma la Bandeja con el código de referencia del mensaje («ref. K7Q2M»,
// `lib/refWhatsapp.ts`) y el clic que lo generó (`TrackEvent` WHATSAPP_CLICK).
// Se guarda en `Oportunidad.origenWeb` y alimenta «De la web a la reserva» en
// Embudo comercial y el cruce de Web y canales.

import { canalDeVisita, type CanalVisita } from "@/lib/refWhatsapp";
import { textoSinPrivados } from "@/lib/medicionPrivada";

export interface OrigenWeb {
  ref: string;
  /** La página donde tocó el botón de WhatsApp. */
  pagina: string | null;
  /** La primera página de su visita. */
  landing: string | null;
  fuente: string | null;
  medio: string | null;
  campana: string | null;
  referrer: string | null;
  canal: CanalVisita;
  tour: string | null;
  /** ISO, cuándo tocó el botón. */
  clicEn: string | null;
  /** false = el mensaje traía el código pero el clic no se encontró (bloqueador o fuera de plazo). */
  conClic: boolean;
}

const txt = (v: unknown, max = 120) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
/**
 * Una página sin el token de /checkin u /opina (lote 8, 10 nov 2026): el clic
 * guardado antes del arreglo puede traer la liga personal del cliente, y de
 * aquí pasaba al lead y a «De la web a la reserva».
 */
const pagina = (v: unknown) => { const t = txt(v); return t ? textoSinPrivados(t) : null; };

/** El origen a partir del clic (o solo el código, si el clic no apareció). */
export function origenWebDeClic(ref: string, clic: { path?: string | null; tourSlug?: string | null; createdAt?: Date | null; data?: unknown } | null): OrigenWeb {
  const d = (clic?.data && typeof clic.data === "object" ? clic.data : {}) as Record<string, unknown>;
  const o = { fuente: txt(d.fuente, 80), medio: txt(d.medio, 80), campana: txt(d.campana, 80), referrer: txt(d.referrerVisita, 120) };
  return {
    ref,
    pagina: pagina(clic?.path) ?? pagina(d.pagina),
    landing: pagina(d.landing),
    ...o,
    canal: clic ? canalDeVisita(o) : "otro",
    tour: txt(clic?.tourSlug, 80) ?? txt(d.tour, 80),
    clicEn: clic?.createdAt ? clic.createdAt.toISOString() : null,
    conClic: !!clic,
  };
}

/** Lo guardado en la base, limpio (o null si no es un origen). */
export function leerOrigenWeb(raw: unknown): OrigenWeb | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.ref !== "string") return null;
  return {
    ref: r.ref, pagina: pagina(r.pagina), landing: pagina(r.landing), fuente: txt(r.fuente), medio: txt(r.medio), campana: txt(r.campana),
    referrer: txt(r.referrer), canal: (txt(r.canal, 20) ?? "otro") as CanalVisita, tour: txt(r.tour), clicEn: txt(r.clicEn, 40), conClic: r.conClic === true,
  };
}
