// Qué pestañas ve cada persona del panel: lo decide Manolo desde Inicio
// (20 oct 2026) y se guarda en `Config`, una sola fila con todos.
//
// Solo servidor (lee la base). El middleware no puede: las pestañas viajan
// dentro de la sesión (`createToken`), y la sesión se vuelve a firmar en cada
// cambio de página (`/api/admin/sesion`) para que lo que Manolo cambie valga
// desde el siguiente clic de esa persona, sin esperar a que vuelva a entrar.

import { prisma } from "@/lib/prisma";
import { seccionesValidas, usuariosAdmin, type SeccionAdmin, type UsuarioAdmin } from "./usuarios";

const CLAVE = "panel:permisos";

/** Lo guardado, tal cual: `usuario → pestañas`. Vacío si nadie ha decidido nada. */
async function leer(): Promise<Record<string, unknown>> {
  try {
    const fila = await prisma.config.findUnique({ where: { key: CLAVE } });
    const v = JSON.parse(fila?.value || "{}");
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

/** Las pestañas que ve esa persona hoy (lo guardado o, si no hay, lo de su rol). */
export async function seccionesDe(usuario: Pick<UsuarioAdmin, "user" | "rol">): Promise<SeccionAdmin[]> {
  const guardado = await leer();
  return seccionesValidas(usuario.rol, guardado[usuario.user]);
}

/** Todas las personas con lo que ve cada una (para la tabla de Inicio). */
export async function permisosDeTodos(): Promise<{ user: string; nombre: string; rol: UsuarioAdmin["rol"]; secciones: SeccionAdmin[] }[]> {
  const guardado = await leer();
  return usuariosAdmin().map(u => ({ user: u.user, nombre: u.nombre, rol: u.rol, secciones: seccionesValidas(u.rol, guardado[u.user]) }));
}

/** Cambia lo que ve UNA persona. El dueño no se toca: siempre lo ve todo. */
export async function guardarSeccionesDe(user: string, secciones: unknown): Promise<SeccionAdmin[]> {
  const usuario = usuariosAdmin().find(u => u.user === user);
  if (!usuario) throw new Error("Esa persona no existe");
  if (usuario.rol === "dueno") throw new Error("El dueño ve todo siempre");
  const limpias = seccionesValidas(usuario.rol, Array.isArray(secciones) ? secciones : []);
  if (limpias.length === 0) throw new Error("Necesita ver al menos una pestaña");
  const guardado = await leer();
  guardado[user] = limpias;
  const value = JSON.stringify(guardado);
  await prisma.config.upsert({ where: { key: CLAVE }, update: { value }, create: { key: CLAVE, value } });
  return limpias;
}
