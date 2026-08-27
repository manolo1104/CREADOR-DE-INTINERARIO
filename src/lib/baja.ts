/**
 * Baja de un clic.
 *
 * Hasta ahora el pie decía «respóndenos "baja" y no te volvemos a escribir», o
 * sea que alguien tenía que leer el buzón y darla de baja a mano. Con cuatro
 * correos de secuencia se podía sostener; con un boletín mensual indefinido, no:
 * el que no encuentra cómo salirse marca spam, y eso no le pega solo a ese
 * correo — le pega a la reputación del dominio y hace que las confirmaciones de
 * reserva empiecen a caer en no deseados.
 *
 * El enlace se firma con HMAC y no lleva base de datos detrás: no hay tabla de
 * tokens que mantener ni que expirar, y un enlace de otro correo no sirve para
 * dar de baja a un tercero.
 */

import crypto from "crypto";

/**
 * La llave de firma. Cae a `ADMIN_JWT_SECRET`, que ya es obligatoria en
 * producción, para no añadir una variable de entorno más que se pueda olvidar.
 */
function secreto(): string {
  const s = process.env.BAJA_SECRET || process.env.ADMIN_JWT_SECRET;
  if (!s) throw new Error("Falta BAJA_SECRET o ADMIN_JWT_SECRET para firmar la baja");
  return s;
}

const b64url = (b: Buffer) => b.toString("base64url");

function firma(email: string): string {
  return b64url(crypto.createHmac("sha256", secreto()).update(email.toLowerCase()).digest()).slice(0, 24);
}

/** Token que identifica al suscriptor sin exponer una lista. */
export function tokenBaja(email: string): string {
  return `${b64url(Buffer.from(email.toLowerCase()))}.${firma(email)}`;
}

/** Devuelve el correo si el token es válido; `null` si viene manipulado. */
export function emailDeToken(token: string): string | null {
  const [datos, mac] = String(token ?? "").split(".");
  if (!datos || !mac) return null;
  let email: string;
  try {
    email = Buffer.from(datos, "base64url").toString("utf8");
  } catch {
    return null;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;

  // Comparación en tiempo constante: sin esto, el tiempo de respuesta filtra
  // cuántos caracteres del HMAC acertó quien lo está probando.
  const esperado = firma(email);
  const a = Buffer.from(mac);
  const b = Buffer.from(esperado);
  if (a.length !== b.length) return null;
  return crypto.timingSafeEqual(a, b) ? email : null;
}

/** El enlace completo que va en el pie de cada correo. */
export function linkBaja(email: string, base = "https://www.huasteca-potosina.com"): string {
  return `${base}/baja?t=${encodeURIComponent(tokenBaja(email))}`;
}
