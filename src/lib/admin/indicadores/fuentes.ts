// El estado de las fuentes que se revisan solas (lote 9, 10 nov 2026). Puro:
// lo usa «Metas → Fuentes» (`datos.ts`) y lo prueba Vitest.
//
// 🔴 Antes el pago en línea decía «Bien» SIEMPRE y la Bandeja solo miraba la
// palabra «conectado» que el puente dejó guardada, aunque el puente llevara
// días apagado. Aquí cada fuente se juzga con su última señal real: la hora
// del latido del puente, el último aviso de Stripe que llegó, las llaves con
// las que el servidor le cuenta las compras a GA4 y el correo propio de cada
// persona del equipo.

import { haceCuanto } from "@/lib/admin/bandeja";

/** «hace 3 h», «hace un momento». */
const hace = (d: Date, ahora: Date) => { const t = haceCuanto(d, ahora); return t === "ahora" ? "hace un momento" : `hace ${t}`; };

export interface EstadoFuente {
  nombre: string;
  /** Qué KPIs alimenta. */
  alimenta: string;
  estado: "ok" | "atencion" | "falla";
  detalle: string;
  /** Qué hacer si no está bien. */
  arreglo?: string;
}

/** Dónde anota el webhook de Stripe el último aviso que recibió (`Config`). */
export const CLAVE_ULTIMO_WEBHOOK_STRIPE = "stripe:ultimo-webhook";

/** El puente manda «conectado» cada 5 min: sin señal en 15 min, se cayó. */
export const MINUTOS_SIN_LATIDO = 15;

/** Bandeja de WhatsApp: el estado guardado Y la hora del último latido del puente. */
export function estadoPuente(
  conexion: { estado: string; en: string } | null,
  ultimoChat: Date | null,
  ahora: Date = new Date(),
): EstadoFuente {
  const base = { nombre: "Bandeja de WhatsApp", alimenta: "Leads, primer mensaje en 5 min, seguimiento" };
  const chat = ultimoChat ? ` · último mensaje de un cliente ${hace(ultimoChat, ahora)}` : " · sin mensajes";
  if (!conexion) return { ...base, estado: "falla", detalle: "El puente nunca se ha conectado.", arreglo: "Abre Bandeja y escanea el QR con el teléfono del negocio." };
  const latido = new Date(conexion.en);
  const minutos = Number.isNaN(latido.getTime()) ? Infinity : (ahora.getTime() - latido.getTime()) / 60_000;
  if (minutos > MINUTOS_SIN_LATIDO) {
    return {
      ...base, estado: "falla",
      detalle: `El puente no da señales desde hace ${Number.isFinite(minutos) ? hace(latido, ahora).replace(/^hace /, "") : "mucho"} (última vez: ${conexion.estado})${chat}`,
      arreglo: "Revisa en Railway que el servicio del puente de WhatsApp esté encendido; si pide QR, escanéalo en Bandeja.",
    };
  }
  if (conexion.estado !== "conectado") {
    return { ...base, estado: "falla", detalle: `Estado: ${conexion.estado}${chat}`, arreglo: "Abre Bandeja y escanea el QR con el teléfono del negocio." };
  }
  const horasChat = ultimoChat ? (ahora.getTime() - ultimoChat.getTime()) / 3_600_000 : null;
  return { ...base, estado: horasChat !== null && horasChat > 24 ? "atencion" : "ok", detalle: `Conectada · señal ${hace(latido, ahora)}${chat}` };
}

/** Una reserva web sin aviso de Stripe en esta ventana quiere decir que el webhook no llegó. */
export const TOLERANCIA_WEBHOOK_MS = 30 * 60_000;

/** Pago en línea: que exista el secreto del webhook y que los avisos de Stripe sigan llegando. */
export function estadoStripe(h: { secreto: boolean; ultimoWebhook: Date | null; ultimaReservaWeb: Date | null; ahora?: Date }): EstadoFuente {
  const ahora = h.ahora ?? new Date();
  const base = { nombre: "Pago en línea (Stripe)", alimenta: "Reservas pagadas en la web" };
  const web = h.ultimaReservaWeb ? `última reserva web ${hace(h.ultimaReservaWeb, ahora)}` : "aún no hay reservas web";
  if (!h.secreto) {
    return { ...base, estado: "falla", detalle: `Falta el secreto del webhook en el servidor · ${web}`, arreglo: "En Railway: STRIPE_WEBHOOK_SECRET (el whsec_… del webhook en Stripe)." };
  }
  if (!h.ultimoWebhook) {
    return {
      ...base, estado: "atencion",
      detalle: `El panel todavía no ha recibido ningún aviso de Stripe desde que empezó a anotarlos · ${web}`,
      arreglo: "Se pone en verde con el próximo pago en línea. Si ya hubo una venta web y sigue así, revisa el webhook en Stripe (Desarrolladores → Webhooks).",
    };
  }
  if (h.ultimaReservaWeb && h.ultimaReservaWeb.getTime() - h.ultimoWebhook.getTime() > TOLERANCIA_WEBHOOK_MS) {
    return {
      ...base, estado: "falla",
      detalle: `La última reserva web es de ${hace(h.ultimaReservaWeb, ahora)}, pero el último aviso de Stripe llegó ${hace(h.ultimoWebhook, ahora)}`,
      arreglo: "Revisa en Stripe (Desarrolladores → Webhooks) que el webhook esté activo y sin errores: sin él, un pago con la pestaña cerrada no se vuelve reserva.",
    };
  }
  return { ...base, estado: "ok", detalle: `Último aviso de Stripe ${hace(h.ultimoWebhook, ahora)} · ${web}` };
}

/** Las llaves con las que el servidor le cuenta a GA4 las compras (Measurement Protocol). */
export function faltanLlavesCompraGA4(env: Record<string, string | undefined>): string[] {
  return ["NEXT_PUBLIC_GA4_ID", "GA4_API_SECRET"].filter(k => !env[k]?.trim());
}

/** Correos propios del equipo: sin `ADMIN_EMAIL_<USUARIO>`, su resumen y sus recordatorios van al buzón común. */
export function estadoCorreos(env: Record<string, string | undefined>, usuarios: { user: string; nombre: string; rol: string }[]): EstadoFuente {
  const base = { nombre: "Correos del equipo", alimenta: "Resumen de las 7:30 y recordatorios de seguimiento" };
  const faltan = usuarios.filter(u => u.rol !== "guia" && !env[`ADMIN_EMAIL_${u.user.toUpperCase()}`]?.trim());
  if (!faltan.length) return { ...base, estado: "ok", detalle: "Cada persona tiene su correo propio." };
  return {
    ...base, estado: "atencion",
    detalle: `Sin correo propio: ${faltan.map(u => u.nombre).join(", ")}. Su resumen y sus recordatorios llegan al buzón del equipo, donde nadie los ve como suyos.`,
    arreglo: `En Railway: ${faltan.map(u => `ADMIN_EMAIL_${u.user.toUpperCase()}`).join(", ")} con el correo de cada quien.`,
  };
}
