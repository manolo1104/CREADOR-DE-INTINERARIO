// Solo servidor: lee y escribe la base (la tabla `Config`).
import { createHash, randomUUID } from "crypto";
import { prisma } from "./prisma";

/**
 * Los APARTADOS: los lugares que un carrito tiene tomados mientras su dueño
 * termina de pagar (Manolo, 7 oct 2026: «que aparte los lugares por 15
 * minutos»).
 *
 * Hasta el 4 oct el carrito enseñaba un reloj de 15 minutos que no apartaba
 * nada, y se quitó por engañoso. Este sí aparta: mientras corre, `cupoTour`
 * suma esos lugares como si fueran reservas, así que el calendario de los
 * demás los ve ocupados y su cobro no los vende. Quien valida y decide si se
 * aparta es `lib/apartados.ts`; esto solo guarda, lee y suelta.
 *
 * Cada apartado es UNA fila de `Config` (`apartado:<id>`): el esquema no
 * admite migraciones y esa tabla ya es el almacén de las fechas cerradas. El
 * valor es JSON: `{ v: 1, vence, lineas: [{ slug, fecha, personas }], ip }`.
 *
 * No importa `cupoTour` a propósito: `cupoTour` lee de aquí y al revés sería
 * un ciclo.
 *
 * 🔴 Todo va entre try/catch. Si la base falla, se porta como si no hubiera
 * apartados: un apartado es una cortesía con el cliente y jamás puede tumbar
 * un cobro.
 */

/** Lo que dura un apartado desde la última vez que se guardó o se renovó. */
export const APARTADO_MINUTOS = 15;
const APARTADO_MS = APARTADO_MINUTOS * 60_000;

const PREFIJO = "apartado:";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Un recorrido apartado: cuántas personas, en qué salida. */
export interface LineaApartada {
  slug:     string;
  fecha:    string;
  personas: number;
}

export interface Apartado {
  id:     string;
  /** Cuándo deja de contar (ms, reloj del servidor). */
  vence:  number;
  lineas: LineaApartada[];
  /** Huella corta de la IP (ver `huellaIp`), nunca la IP misma. */
  ip:     string;
}

/** ¿Tiene forma de id de apartado? Los inventa el servidor (`nuevoIdApartado`). */
export function esIdApartado(v: unknown): v is string {
  return typeof v === "string" && UUID.test(v);
}

export function nuevoIdApartado(): string {
  return randomUUID();
}

/**
 * La huella de una IP: los primeros 16 caracteres de su SHA-256. Alcanza para
 * contar cuántos apartados lleva la misma conexión sin guardar la dirección.
 */
export function huellaIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

function clave(id: string): string {
  return `${PREFIJO}${id}`;
}

/** Lo que guarda una fila. Lo que no se entienda no aparta nada. */
function leerFila(key: string, value: string): Apartado | null {
  try {
    const v = JSON.parse(value);
    if (v?.v !== 1 || typeof v.vence !== "number" || !Array.isArray(v.lineas)) return null;
    const lineas = (v.lineas as unknown[]).filter((l): l is LineaApartada => {
      const x = l as Partial<LineaApartada> | null;
      return !!x && typeof x.slug === "string" && typeof x.fecha === "string" && FECHA.test(x.fecha)
        && Number.isInteger(x.personas) && (x.personas as number) > 0;
    });
    return { id: key.slice(PREFIJO.length), vence: v.vence, lineas, ip: typeof v.ip === "string" ? v.ip : "" };
  } catch {
    return null;
  }
}

/**
 * Los apartados que siguen corriendo, menos `excluir`: el del propio cliente,
 * que no debe quitarle lugar a sí mismo. Si la base falla, ninguno.
 */
export async function apartadosVigentes(excluir?: string): Promise<Apartado[]> {
  try {
    const filas = await prisma.config.findMany({ where: { key: { startsWith: PREFIJO } } });
    const ahora = Date.now();
    return filas
      .map((f) => leerFila(f.key, f.value))
      .filter((a): a is Apartado => !!a && a.vence > ahora && a.id !== excluir);
  } catch (e) {
    console.error("apartados: no se pudieron leer; se cuentan como ninguno:", e instanceof Error ? e.message : e);
    return [];
  }
}

/**
 * Guarda (o reemplaza) un apartado con `APARTADO_MINUTOS` por delante y
 * devuelve cuándo vence. null si no se pudo: sin fila guardada no hay
 * apartado, y sin apartado el cliente no ve ningún reloj.
 */
export async function guardarApartado(id: string, lineas: LineaApartada[], ip: string): Promise<number | null> {
  const vence = Date.now() + APARTADO_MS;
  const value = JSON.stringify({ v: 1, vence, lineas, ip });
  try {
    await prisma.config.upsert({ where: { key: clave(id) }, update: { value }, create: { key: clave(id), value } });
    void limpiarVencidos();
    return vence;
  } catch (e) {
    console.error("apartados: no se pudo guardar:", e instanceof Error ? e.message : e);
    return null;
  }
}

/**
 * Le da `APARTADO_MINUTOS` más a un apartado que SIGUE corriendo, con los
 * renglones que se van a cobrar (pudieron cambiar un instante antes de pagar).
 * Uno vencido no se revive aquí: volver a apartar lo decide el cliente, y los
 * apartados nuevos solo nacen en `apartar()`, que cuida el tope por IP.
 * null si no había nada vivo que renovar.
 */
export async function renovarApartado(id: string, lineas: LineaApartada[]): Promise<number | null> {
  try {
    const fila = await prisma.config.findUnique({ where: { key: clave(id) } });
    const actual = fila ? leerFila(fila.key, fila.value) : null;
    if (!actual || actual.vence <= Date.now()) return null;
    const vence = Date.now() + APARTADO_MS;
    // `update` y no `upsert`: si lo soltaron entre las dos consultas, falla y
    // no lo resucita.
    await prisma.config.update({
      where: { key: clave(id) },
      data:  { value: JSON.stringify({ v: 1, vence, lineas, ip: actual.ip }) },
    });
    void limpiarVencidos();
    return vence;
  } catch (e) {
    console.error("apartados: no se pudo renovar:", e instanceof Error ? e.message : e);
    return null;
  }
}

/** Suelta un apartado: ya es reserva, o el carrito se quedó sin nada que apartar. */
export async function liberarApartado(id: string): Promise<void> {
  try {
    await prisma.config.deleteMany({ where: { key: clave(id) } });
    void limpiarVencidos();
  } catch (e) {
    console.error("apartados: no se pudo soltar (vencerá solo):", e instanceof Error ? e.message : e);
  }
}

/**
 * Borra en lote las filas viejas. Va en las escrituras, no en cada lectura: los
 * vencidos ya no cuentan aunque sigan ahí, esto es solo higiene.
 *
 * Por `updatedAt` y no leyendo `vence`: cada escritura pone `vence = ahora +
 * APARTADO_MINUTOS`, así que una fila sin tocar desde hace más que eso ya
 * venció, y se borra con UNA sentencia. Leer y después borrar por clave podía
 * llevarse un apartado renovado entre las dos consultas. El minuto de holgura
 * cubre la diferencia entre la hora de `vence` y la de `updatedAt`.
 */
async function limpiarVencidos(): Promise<void> {
  try {
    await prisma.config.deleteMany({
      where: { key: { startsWith: PREFIJO }, updatedAt: { lt: new Date(Date.now() - APARTADO_MS - 60_000) } },
    });
  } catch {
    // Higiene: si falla, los vencidos igual ya no cuentan.
  }
}
