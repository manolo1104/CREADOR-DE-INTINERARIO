/**
 * La fecha límite de una cotización y el flujo que cuelga de ella (oct 2026).
 *
 * El flujo, en cinco etapas:
 *   Borrador → Enviada (nace la fecha límite) → Por vencer (le queda un día o
 *   menos: toca recordar) → Aceptada (pagó o se convirtió en reserva)
 *   · o bien Vencida (pasó la fecha sin respuesta; se reactiva poniendo otra).
 *
 * «Por vencer» no se guarda: se calcula de la fecha límite. «Vencida» es el
 * estado `expirada` de siempre, que ahora también pone el cron solo.
 *
 * La fecha límite es un DÍA (`YYYY-MM-DD`, hora de México): la cotización vale
 * hasta que termina ese día. Un día y no un instante porque así se le dice al
 * cliente («vence el jueves 9») y así se edita en el panel.
 *
 * Vive en el `_meta` de `lineItems` (ver `quoteFollowUp.ts`), no en una columna:
 * el esquema de producción se aplica solo al arrancar y no se toca por esto.
 *
 * Sin dependencias de servidor: lo usan el panel, las rutas y el cron.
 */

import { addDaysYMD, diffDiasYMD, hoyMX, ymdMX } from "./dates";
import { nombreDePila, telefonoWhatsapp } from "./reviewRequest";

/** Las vigencias que se eligen en el paso 3 del panel. */
export const VIGENCIAS: Record<string, { dias: number; label: string }> = {
  "48h":    { dias: 2,  label: "48 horas" },
  "7dias":  { dias: 7,  label: "7 días" },
  "15dias": { dias: 15, label: "15 días" },
  "30dias": { dias: 30, label: "30 días" },
};

export const VIGENCIA_POR_DEFECTO = "7dias";

const esYMD = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** La vigencia elegida en el panel; vive en el `_meta` de `packageItems`. */
export function vigenciaDe(packageItems: unknown): string {
  const meta = Array.isArray(packageItems)
    ? packageItems.find((p) => !!p && typeof p === "object" && (p as { _meta?: boolean })._meta)
    : undefined;
  const v = (meta as { vigencia?: string } | undefined)?.vigencia;
  return v && VIGENCIAS[v] ? v : VIGENCIA_POR_DEFECTO;
}

/**
 * La fecha límite que nace al enviar: el día del envío más la vigencia, pero
 * nunca después de la víspera del tour (el día mismo ya no hay nada que
 * apartar). Si la víspera ya pasó, vence el mismo día en que se manda.
 */
export function calcularVencimiento(
  enviadaEl: Date | string,
  vigencia: string,
  tourDate?: string | null,
): string {
  const desde = ymdMX(enviadaEl);
  let vence = addDaysYMD(desde, (VIGENCIAS[vigencia] ?? VIGENCIAS[VIGENCIA_POR_DEFECTO]).dias);
  if (esYMD(tourDate)) {
    const vispera = addDaysYMD(tourDate, -1);
    if (vispera < vence) vence = vispera;
  }
  return vence < desde ? desde : vence;
}

/** Lo mínimo de una cotización que hace falta para saber su fecha límite. */
export interface CotizacionVence {
  status:        string;
  tourDate?:     string | null;
  lineItems?:    unknown;
  packageItems?: unknown;
  createdAt:     Date | string;
}

/** El `_meta` de `lineItems` (el mismo que escribe `conMeta` de `quoteFollowUp.ts`). */
function metaLineas(lineItems: unknown): { venceEl?: string; seqDesde?: string; recordadoWaAt?: string; avisoVenceAt?: string } {
  if (!Array.isArray(lineItems)) return {};
  return (lineItems.find((l) => !!l && typeof l === "object" && (l as { _meta?: boolean })._meta) as object) ?? {};
}

/**
 * La fecha límite de una cotización, o `null` si no aplica (borrador o
 * aceptada).
 *
 * Las que se mandaron antes de que existiera la fecha límite no la traen: se
 * deduce de cuándo se enviaron (`seqDesde`, o si no `createdAt`) más su
 * vigencia, con la misma regla que las nuevas.
 */
export function fechaLimite(q: CotizacionVence): string | null {
  if (q.status !== "enviada" && q.status !== "expirada") return null;
  const meta = metaLineas(q.lineItems);
  if (esYMD(meta.venceEl)) return meta.venceEl;
  const desde = meta.seqDesde && !Number.isNaN(Date.parse(meta.seqDesde)) ? meta.seqDesde : q.createdAt;
  return calcularVencimiento(desde, vigenciaDe(q.packageItems), q.tourDate);
}

/** Días que le quedan (0 = vence hoy, negativo = ya venció). */
export function diasParaVencer(venceEl: string, hoy: string = hoyMX()): number {
  return diffDiasYMD(hoy, venceEl);
}

export type Etapa = "borrador" | "enviada" | "por-vencer" | "aceptada" | "vencida";

/** La etapa del flujo en la que está, contando «Por vencer». */
export function etapaDe(q: CotizacionVence, hoy: string = hoyMX()): Etapa {
  if (q.status === "aceptada") return "aceptada";
  if (q.status === "expirada") return "vencida";
  if (q.status !== "enviada") return "borrador";
  const vence = fechaLimite(q);
  if (!vence) return "enviada";
  const dias = diasParaVencer(vence, hoy);
  if (dias < 0) return "vencida";
  return dias <= 1 ? "por-vencer" : "enviada";
}

/** ¿Ya se le mandó el recordatorio por WhatsApp para la fecha límite que tiene hoy? */
export function recordadoPorWhatsapp(q: CotizacionVence): string | null {
  return metaLineas(q.lineItems).recordadoWaAt ?? null;
}

/** «hoy», «mañana» o «el jueves 9 de octubre», para el mensaje al cliente. */
export function cuandoVence(venceEl: string, locale: "es" | "en" = "es", hoy: string = hoyMX()): string {
  const dias = diasParaVencer(venceEl, hoy);
  if (dias === 0) return locale === "en" ? "today" : "hoy";
  if (dias === 1) return locale === "en" ? "tomorrow" : "mañana";
  const f = new Date(`${venceEl}T12:00:00`).toLocaleDateString(
    locale === "en" ? "en-US" : "es-MX",
    { weekday: "long", day: "numeric", month: "long" },
  );
  // «el viernes 9 de octubre», sin la coma que pone es-MX tras el día.
  return locale === "en" ? `on ${f}` : `el ${f.replace(",", "")}`;
}

/** Texto corto del panel: «vence hoy», «vence en 5 días», «venció hace 2 días». */
export function etiquetaVence(venceEl: string, hoy: string = hoyMX()): string {
  const dias = diasParaVencer(venceEl, hoy);
  if (dias < -1) return `venció hace ${-dias} días`;
  if (dias === -1) return "venció ayer";
  if (dias === 0) return "vence hoy";
  if (dias === 1) return "vence mañana";
  return `vence en ${dias} días`;
}

/** Lo que hace falta para escribir el recordatorio por WhatsApp. */
export interface DatosRecordatorio {
  customerName:   string;
  customerPhone?: string | null;
  quoteNumber:    string;
  tourName:       string;
  tourDate?:      string | null;
}

/**
 * El WhatsApp de «tu cotización vence…», ya escrito, o `null` sin teléfono.
 * Lo usan el panel (botón «Recordar») y el aviso diario al equipo.
 */
export function urlRecordatorio(q: DatosRecordatorio, venceEl: string, hoy: string = hoyMX()): string | null {
  const ph = telefonoWhatsapp(q.customerPhone);
  if (!ph) return null;
  const pila = nombreDePila(q.customerName);
  const tour = q.tourName.split("—")[0].trim();
  const fecha = esYMD(q.tourDate)
    ? ` para el ${new Date(`${q.tourDate}T12:00:00`).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" }).replace(",", "")}`
    : "";
  const texto = `Hola${pila ? ` ${pila}` : ""}, te escribimos de Tours Huasteca Potosina. Tu cotización *${q.quoteNumber}* de *${tour}*${fecha} vence ${cuandoVence(venceEl, "es", hoy)}. ¿Te la apartamos? Con el anticipo queda apartado tu lugar y el resto se paga el día del recorrido.`;
  return `https://wa.me/${ph}?text=${encodeURIComponent(texto)}`;
}
