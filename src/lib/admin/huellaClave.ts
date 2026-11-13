// La huella de la contraseña dentro de la sesión del GUÍA (lote 8, 10 nov 2026).
//
// 🔴 La cuenta del guía es compartida: si alguien que ya no trabaja con
// nosotros se queda con una sesión abierta en su celular, cambiar la
// contraseña en Railway no lo sacaba: la sesión firmada valía sus 7 días.
// Ahora la sesión del guía lleva una huella de la contraseña configurada
// (HMAC con el secreto de las sesiones: no deja adivinar la contraseña) y al
// revisarla se compara con la de HOY. Contraseña nueva → huella distinta → la
// sesión vieja ya no entra. Solo el guía: Manolo, Martín y Erick no se tocan.
//
// Sirve en el middleware (Edge) y en el servidor: solo usa `jose`, que ya
// firma las sesiones en los dos lados.

import { CompactSign } from "jose";
import { rolDesdeToken, usuariosAdmin, type RolAdmin, type UsuarioAdmin } from "./usuarios";

/** Los roles cuya sesión lleva huella (por ahora, la cuenta compartida). */
export const ROLES_CON_HUELLA: readonly RolAdmin[] = ["guia"];

/** Lo que se configuró como contraseña (el hash si hay; si no, el texto). Vacío = sin contraseña. */
export function claveConfigurada(u: Pick<UsuarioAdmin, "envPassword" | "envPasswordHash">, env: Record<string, string | undefined> = process.env): string {
  return env[u.envPasswordHash] || env[u.envPassword] || "";
}

/** Huella corta de la contraseña: HMAC-SHA256 con el secreto de las sesiones. */
export async function huellaDeClave(secreto: Uint8Array, clave: string): Promise<string> {
  const jws = await new CompactSign(new TextEncoder().encode(`huella-clave|${clave}`))
    .setProtectedHeader({ alg: "HS256" })
    .sign(secreto);
  return jws.split(".")[2].slice(0, 22);
}

/**
 * ¿La sesión sigue valiendo? Para los roles sin huella, siempre. Para el
 * guía, solo si la huella de la sesión es la de la contraseña de hoy; una
 * sesión sin huella (de antes de esto) o sin contraseña configurada, no.
 */
export function sesionVigente(rol: RolAdmin, huellaSesion: unknown, huellaHoy: string | null): boolean {
  if (!ROLES_CON_HUELLA.includes(rol)) return true;
  return !!huellaHoy && typeof huellaSesion === "string" && huellaSesion === huellaHoy;
}

/** La huella que debe traer HOY la sesión de esa persona, o null si su rol no lleva (o no tiene contraseña). */
export async function huellaHoyDe(user: unknown, secreto: Uint8Array): Promise<string | null> {
  const u = usuariosAdmin().find(x => x.user === user);
  if (!u || !ROLES_CON_HUELLA.includes(u.rol)) return null;
  const clave = claveConfigurada(u);
  return clave ? huellaDeClave(secreto, clave) : null;
}

/** Lo que revisan el middleware y `sesionActual` con la sesión ya verificada. */
export async function huellaDeSesionVigente(payload: Record<string, unknown>, secreto: Uint8Array): Promise<boolean> {
  const rol = rolDesdeToken(payload.rol);
  if (!ROLES_CON_HUELLA.includes(rol)) return true;
  return sesionVigente(rol, payload.huella, await huellaHoyDe(payload.user, secreto));
}
