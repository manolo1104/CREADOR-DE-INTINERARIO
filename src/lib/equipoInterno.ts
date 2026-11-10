// Un solo filtro del equipo para TODA la medición (lote 8, 10 nov 2026).
//
// 🔴 Había tres reglas distintas: GA4 y Clarity miraban la marca `hp_interno`
// del navegador (localStorage), `/api/track` miraba si la página era /admin o
// si había sesión del panel abierta, y los eventos del servidor (llegó al
// pago) y la compra que el webhook manda a GA4 no miraban nada. Quien había
// cerrado sesión pero tenía la marca dejaba de contar en GA4 y seguía contando
// en el embudo propio; una compra de prueba del equipo entraba a GA4 por el
// servidor aunque el navegador no la mandara.
//
// Ahora la marca es UNA: `hp_interno = 1`, en localStorage y en cookie (el
// servidor no ve el localStorage). La pone abrir cualquier página del panel
// (middleware y el script de Analytics) y la lee todo lo que mide.
//
// Puro y sin módulos de Node: lo usa también el middleware (Edge).

export const MARCA_EQUIPO = "hp_interno";

/** La cookie de la marca: dos años, todo el sitio, legible por el script del navegador. */
export const COOKIE_MARCA_EQUIPO = {
  path: "/",
  maxAge: 60 * 60 * 24 * 730,
  sameSite: "lax" as const,
  httpOnly: false,
};

/** ¿Este valor de la marca dice «del equipo»? */
export function esMarcaDelEquipo(valor: string | null | undefined): boolean {
  return valor === "1";
}

/**
 * ¿La visita es del equipo? La marca, o estar en una página del panel (que de
 * todos modos la pone). Es la MISMA regla del script de Analytics (`GUARDA`).
 */
export function visitaDelEquipo(v: { marca?: string | null; ruta?: string | null }): boolean {
  return esMarcaDelEquipo(v.marca) || (v.ruta ?? "").startsWith("/admin");
}

/** Lo que se agrega a la metadata del pago en Stripe cuando paga alguien del equipo. */
export function metadataDelEquipo(delEquipo: boolean): { interno?: "1" } {
  return delEquipo ? { interno: "1" } : {};
}

/** ¿El pago lo hizo alguien del equipo? Su compra no se manda a GA4 desde el servidor. */
export function pagoDelEquipo(metadata: Record<string, unknown> | null | undefined): boolean {
  return metadata?.interno === "1";
}
