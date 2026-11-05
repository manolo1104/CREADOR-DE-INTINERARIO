// Reglas puras del envío y del estado de una cotización (lote 4 de la
// auditoría, 5 nov 2026): cuándo el cron la da por aceptada, cuándo un correo
// es solo una copia, qué guarda el servidor del `_meta` al editarla, cuándo el
// correo puede mandar a pagar a la web, qué hace la baja y cuándo una
// aceptada puede regresar a Enviada.
//
// Viven aparte de las rutas y del cron (que hablan con la base) para probarlas
// sin Prisma en `__tests__/cotizacionesEnvio.test.ts`. Sin dependencias de
// servidor: el panel también las usa.

import { conMeta, metaCotizacion } from "@/lib/quoteFollowUp";
import { anticipoDe, desgloseCotizacion, type MetaCotizacion as MetaPrecio } from "@/lib/admin/totalesCotizacion";
import { extrasCobrados, extrasDe, totalExtras } from "@/lib/admin/extras";

type Obj = Record<string, unknown>;

/** El `_meta: true` de una lista (`lineItems` o `packageItems`), o `{}`. */
function metaDeLista(lista: unknown): Obj {
  if (!Array.isArray(lista)) return {};
  const m = lista.find((l) => !!l && typeof l === "object" && (l as Obj)._meta === true);
  return (m as Obj | undefined) ?? {};
}

const texto = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

// ── Reservas vivas ──────────────────────────────────────────────────────────

/** Estados de una reserva que no son una venta: la cancelada y el borrador del bot. */
export const ESTADOS_RESERVA_MUERTA = ["cancelled", "borrador"] as const;

export function reservaViva(status: string | null | undefined): boolean {
  return !(ESTADOS_RESERVA_MUERTA as readonly string[]).includes(String(status ?? ""));
}

// ── El cron: ¿la reserva posterior es de ESTA cotización? ──────────────────

export interface ReservaCandidata {
  cotizacionId?:  string | null;
  /** Para leer `cotizacionOrigen` del `_meta` (las convertidas antes del 4 nov 2026). */
  lineItems?:     unknown;
  status:         string;
  customerEmail?: string | null;
  createdAt:      Date | string;
}

/** ¿La reserva salió de esta cotización? Por `cotizacionId` o, en las de antes, por `cotizacionOrigen`. */
export function esReservaDeCotizacion(
  b: Pick<ReservaCandidata, "cotizacionId" | "lineItems">,
  q: { id: string; quoteNumber: string },
): boolean {
  if (b.cotizacionId && b.cotizacionId === q.id) return true;
  return texto(metaDeLista(b.lineItems).cotizacionOrigen) === q.quoteNumber;
}

const correoNormal = (v: unknown) => String(v ?? "").trim().toLowerCase();

/**
 * Qué hace el cron de seguimiento con una cotización «enviada» cuando hay
 * reservas (regla de Manolo, lote 4, 5 nov 2026):
 *  · "aceptar": una reserva VIVA salió de ESTA cotización (su `cotizacionId`
 *    o su `cotizacionOrigen`). Pasa a «aceptada» con su `aceptadaEn`.
 *  · "pausar": el mismo correo —sin distinguir mayúsculas— tiene OTRA
 *    reserva viva hecha después de mandarla (`desde`). Solo se dejan de
 *    mandar sus correos: sigue Enviada, sin `aceptadaEn`, se puede convertir
 *    o cobrar y vence en su fecha.
 *  · null: nada que hacer.
 *
 * 🔴 Antes cualquier reserva posterior del mismo correo —cancelada, de otro
 * tour o la de la otra opción que sí eligió— la marcaba «aceptada»: el KPI
 * «Cotización → reserva» contaba 2 de 2 cuando el cliente eligió una, y la
 * cotización ya no se podía convertir ni cobrar. Y un correo con otras
 * mayúsculas no la encontraba y le seguía cobrando a quien ya pagó.
 */
export function reservaPosterior(
  q: { id: string; quoteNumber: string; customerEmail?: string | null },
  desde: Date,
  reservas: ReservaCandidata[],
): "aceptar" | "pausar" | null {
  const vivas = reservas.filter((b) => reservaViva(b.status));
  if (vivas.some((b) => esReservaDeCotizacion(b, q))) return "aceptar";
  const correo = correoNormal(q.customerEmail);
  if (!correo) return null;
  const t0 = Number.isNaN(desde.getTime()) ? 0 : desde.getTime();
  const otra = vivas.some((b) => correoNormal(b.customerEmail) === correo && new Date(b.createdAt).getTime() >= t0);
  return otra ? "pausar" : null;
}

// ── «Enviar por correo»: ¿envío de verdad o solo una copia? ────────────────

export type MotivoCopia = "reserva" | "aceptada" | "reemplazada";

export type ModoEnvio =
  /** La manda al cliente: queda Enviada, nace su fecha límite y arranca su seguimiento. */
  | { tipo: "envio" }
  /** Ya es reserva, ya la aceptó o la reemplazó otra: copia, sin tocar su estado ni su seguimiento. */
  | { tipo: "copia"; motivo: MotivoCopia; folio: string | null }
  /** No tiene correo del cliente: solo le llega al equipo y nada cambia. */
  | { tipo: "sin-correo" };

/**
 * Qué hace «Enviar por correo» con esta cotización (lote 4, 5 nov 2026).
 * `reservaFolio`: el folio de su reserva viva, si tiene (lo busca quien llama).
 *
 * 🔴 Reenviar una ya convertida la regresaba a Enviada y le volvía a arrancar
 * los correos de cobro a quien ya pagó; el panel la ofrecía para convertir
 * otra vez. Y sin correo del cliente se marcaba Enviada y subía el lead a
 * Cotizado aunque el correo solo le llegaba al equipo.
 */
export function modoDeEnvio(
  q: { status: string; customerEmail?: string | null; packageItems?: unknown },
  reservaFolio: string | null,
): ModoEnvio {
  const meta = metaDeLista(q.packageItems);
  if (reservaFolio) return { tipo: "copia", motivo: "reserva", folio: reservaFolio };
  if (q.status === "aceptada") return { tipo: "copia", motivo: "aceptada", folio: texto(meta.reservaFolio) };
  const reemplazadaPor = texto(meta.reemplazadaPor);
  if (reemplazadaPor) return { tipo: "copia", motivo: "reemplazada", folio: reemplazadaPor };
  if (!texto(q.customerEmail)) return { tipo: "sin-correo" };
  return { tipo: "envio" };
}

/** Lo que el panel le dice a quien pulsó «Enviar por correo», según lo que de verdad pasó. */
export function mensajeTrasEnviarCorreo(r: {
  emailEnviado: boolean;
  destinatario?: string | null;
  copia?: { motivo: MotivoCopia; folio: string | null } | null;
  soloEquipo?: boolean;
}): string {
  if (r.copia) {
    const a = r.emailEnviado && r.destinatario ? ` a ${r.destinatario}` : " solo al equipo (no tiene correo del cliente)";
    if (r.copia.motivo === "reemplazada") {
      return `✅ Copia enviada${a}. La cotización sigue como estaba${r.copia.folio ? `: la que vale es la ${r.copia.folio}` : ""}.`;
    }
    return `✅ Copia enviada${a}. Sigue Aceptada${r.copia.folio ? ` (ya es la reserva ${r.copia.folio})` : ""}: no se le mandan recordatorios.`;
  }
  if (r.soloEquipo || !r.emailEnviado) {
    return "⚠️ Esta cotización no tiene correo del cliente: la copia llegó solo al buzón del equipo. No cambió a Enviada; mándasela por WhatsApp.";
  }
  return `✅ Correo enviado a ${r.destinatario ?? "el cliente"} · quedó Enviada y arrancó su seguimiento`;
}

// ── El PATCH del panel: el `_meta` de seguimiento lo manda el servidor ─────

/** Las llaves del `_meta` de `lineItems` que solo escriben el servidor y el cron. */
export const LLAVES_META_SERVIDOR = [
  "seqDesde", "seqPaso", "seqUltimoAt", "seqEstado", "seqMasReciente",
  "recordadoWaAt", "avisoVenceAt", "locale", "venceEl",
] as const;

const esYMD = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

/**
 * Los `lineItems` que guarda el PATCH de una cotización (lote 4, 5 nov 2026):
 * los renglones que manda el navegador y, del `_meta`, lo que YA está
 * guardado. La fecha límite solo cambia si se movió a propósito
 * (`venceElNuevo`); entonces los recordatorios de la anterior ya no cuentan.
 *
 * 🔴 Antes el navegador mandaba SU copia del `_meta`. Si la cotización se
 * había mandado por correo sin recargar la página, la copia no lo traía:
 * guardar borraba la fecha límite y el seguimiento (y el cron la vencía con
 * la fecha de antes). Con la página abierta un rato, regresaba un paso o un
 * «vence mañana» ya enviados y el cron los repetía.
 */
export function lineItemsAlEditar(delNavegador: unknown, guardados: unknown, venceElNuevo?: string | null): unknown[] {
  const lineas = (Array.isArray(delNavegador) ? delNavegador : [])
    .filter((l) => !(!!l && typeof l === "object" && (l as Obj)._meta));
  const previo = metaDeLista(guardados);
  const cambia = esYMD(venceElNuevo) && venceElNuevo !== previo.venceEl;
  if (Object.keys(previo).length === 0 && !cambia) return lineas;
  const meta: Obj = { ...previo, _meta: true };
  if (cambia) {
    meta.venceEl = venceElNuevo;
    delete meta.recordadoWaAt;
    delete meta.avisoVenceAt;
  }
  return [meta, ...lineas];
}

// ── El botón de pagar en la web ─────────────────────────────────────────────

/** Concepto escrito a mano en el panel (ver `SLUG_PERSONALIZADO` en `ReservaModal`). */
const SLUG_PERSONALIZADO = "__personalizado";

export interface DatosPrecioWeb {
  lineItems?:    unknown;
  packageItems?: unknown;
  extraItems?:   unknown;
  totalAmount:   number;
}

/**
 * ¿Lo cotizado vale lo mismo que en la web? (lote 4, 5 nov 2026). Solo
 * entonces el correo puede mandar a pagar al carrito o a la página del
 * paquete: sin descuento, sin precio ajustado a mano, sin extras cobrados y
 * sin conceptos escritos a mano.
 *
 * 🔴 El carrito solo recibe los recorridos: con un 10 % de descuento el
 * cliente pagaba de más; con la comida aparte, de menos; y la reserva web
 * nacía sin la comida, sin el descuento y sin la cotización. Si no vale lo
 * mismo, el correo ofrece la liga de anticipo de ESA cotización o WhatsApp.
 *
 * Revisión del lote 4 (5 nov 2026), dos cosas que se le escaparon:
 *  · 🔴 el anticipo también es precio: la web aparta siempre con el 30 % (o
 *    el viaje completo). Con el 50 %, $4,000 o el pago completo, el correo
 *    pedía eso y el botón llevaba a pagar el 30 %;
 *  · 🔴 la cotización del BOT con el precio de la web (`precioWeb`, ver
 *    `precioWebDelBot`) sí cobra lo cotizado aunque sus renglones a precio de
 *    lista sumen otra cosa: un paquete perdía su botón a /reservar-paquete.
 */
export function cobraComoLaWeb(d: DatosPrecioWeb): boolean {
  const meta = metaDeLista(d.packageItems);
  const extras = extrasDe(d.extraItems);
  if (extrasCobrados(extras).length > 0) return false;
  if (anticipoDe(d.totalAmount, meta as MetaPrecio).anticipo !== anticipoDe(d.totalAmount, {}).anticipo) return false;
  // La armó el bot con el precio de la web y nadie le movió el total.
  if (typeof meta.precioWeb === "number" && meta.precioWeb > 0 && meta.precioWeb === d.totalAmount) return true;
  const lineas = (Array.isArray(d.lineItems) ? d.lineItems : [])
    .filter((l): l is Obj => !!l && typeof l === "object" && !(l as Obj)._meta);
  if (lineas.some((l) => l.tourSlug === SLUG_PERSONALIZADO)) return false;
  const hoteles = (Array.isArray(d.packageItems) ? d.packageItems : [])
    .filter((p): p is Obj => !!p && typeof p === "object" && !(p as Obj)._meta);
  const suma = lineas.reduce((s, l) => s + (Number(l.subtotal) || 0), 0)
    + hoteles.reduce((s, p) => s + (Number(p.subtotal) || 0), 0)
    + totalExtras(extras);
  const desglose = desgloseCotizacion(suma, d.totalAmount, meta as MetaPrecio);
  return desglose.descuento === 0 && desglose.ajuste === 0;
}

/**
 * Lo que cobra la web por una cotización del BOT tal como la armó, o null si
 * ninguna página la cobra entera (revisión del lote 4, 5 nov 2026). El bot
 * saca el total con el mismo motor de la web (paquete, promo, Edén) pero
 * guarda los renglones a precio de lista y la diferencia como descuento o
 * precio editado; sin esta marca el correo la tomaba por un descuento a mano.
 * Un paquete con recorridos u hotel aparte no: su página cobra solo el paquete.
 */
export function precioWebDelBot(
  total: number,
  c: { paquete: boolean; recorridosAparte: number; hospedaje: boolean },
): number | null {
  if (c.paquete && (c.recorridosAparte > 0 || c.hospedaje)) return null;
  return total > 0 ? total : null;
}

// ── La baja de los correos ──────────────────────────────────────────────────

/**
 * Los `lineItems` de una cotización viva de quien se dio de baja de los
 * correos: se pausa su seguimiento y NADA más (lote 4, 5 nov 2026, regla de
 * Manolo). null si no hay que tocarla (ya terminó, no alcanzaba o ya estaba
 * pausada).
 *
 * 🔴 Antes pasaba a Vencida: el panel la enseñaba vencida, la ficha del lead
 * proponía «darle otra fecha» y el KPI la contaba perdida, aunque el cliente
 * solo pidió no recibir correos. Sigue Enviada y vence sola en su fecha.
 */
export function lineItemsTrasBaja(lineItems: unknown): unknown[] | null {
  const estado = metaCotizacion(lineItems).seqEstado;
  if (estado && estado !== "activo") return null;
  return conMeta(lineItems, { seqEstado: "pausada" });
}

// ── «Regresar a Enviada» y la cotización de solo lectura ───────────────────

/**
 * ¿Una «aceptada» puede regresar a Enviada? Solo la que NO es reserva y no
 * tiene un pago por liga (lote 4, 5 nov 2026): la que el cron de antes marcó
 * aceptada por la reserva de otra cotización del mismo correo. Con dinero o
 * con reserva, la puerta es la reserva, no la cotización.
 */
export function puedeRegresarAEnviada(
  q: { status: string },
  x: { reservaFolio: string | null; ligaPagada: boolean },
): { ok: true } | { ok: false; motivo: string } {
  if (q.status !== "aceptada") return { ok: false, motivo: "Solo una cotización Aceptada puede regresar a Enviada." };
  if (x.reservaFolio) {
    return { ok: false, motivo: `Esta cotización ya es la reserva ${x.reservaFolio}: no puede regresar a Enviada. Los cambios se hacen en la reserva.` };
  }
  if (x.ligaPagada) {
    return { ok: false, motivo: "El cliente ya pagó la liga de esta cotización: conviértela en reserva en vez de regresarla a Enviada." };
  }
  return { ok: true };
}

/**
 * El aviso de una cotización que ya no se edita (lote 4, 5 nov 2026): la
 * aceptada. null si se puede editar. 🔴 Antes «Editar» la reabría: el PATCH
 * le pasaba al lead fecha, tours y monto nuevos y la reserva —lo que se
 * opera— se quedaba con lo de antes.
 */
export function avisoSoloLectura(q: { status: string; packageItems?: unknown }, reservaFolio?: string | null): string | null {
  if (q.status !== "aceptada") return null;
  const folio = texto(reservaFolio) ?? texto(metaDeLista(q.packageItems).reservaFolio);
  return folio
    ? `Esta cotización ya es la reserva ${folio}: aquí solo se puede ver. Para cambiar algo, edita la reserva ${folio} en Reservas.`
    : "Esta cotización ya está aceptada: aquí solo se puede ver. Si el cliente pagó su liga, conviértela en reserva y haz ahí los cambios; si se marcó aceptada por error, usa «Regresar a Enviada».";
}

/** Lo que dice el panel al regresar una cotización a Enviada, según su fecha límite. */
export function mensajeTrasRegresar(venceEl: string | null, hoy: string): string {
  if (venceEl && venceEl < hoy) {
    return `✅ Regresó a Enviada. Su fecha límite (${venceEl}) ya pasó: dale otra fecha en Editar o se vencerá en la siguiente revisión.`;
  }
  return "✅ Regresó a Enviada: se puede convertir o cobrar. No se le reanudan los correos automáticos; si quieres, reenvíasela.";
}
