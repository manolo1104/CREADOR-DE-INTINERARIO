import { NextRequest, NextResponse } from "next/server";
import { getPruebaSocial, PRUEBA_SOCIAL_VACIA, type PruebaSocial } from "@/lib/pruebaSocialReservas";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/prueba-social
 *   → { count30d: number, recientes: [{ nombre, recorrido, horas }] }
 *
 * Las reservas reales, anonimizadas, para el aviso del sitio. Ver
 * `lib/pruebaSocialReservas.ts` para las reglas (qué cuenta, qué no sale nunca).
 *
 * 🔴 Lo que NO contesta: cuántas personas van un día. Eso lo decide
 * `/api/tours/disponibilidad`, que a propósito devuelve solo el estado del día
 * y nunca el número, porque la ocupación de cada fecha es el volumen de ventas
 * del negocio. Aquí se mantiene esa frontera: esta ruta habla del pasado
 * (quién ya compró), no del inventario.
 *
 * Caché en memoria de 10 minutos: el aviso no necesita estar al segundo y así
 * una ficha popular no le pega a la base en cada visita.
 */
const TTL_MS = 10 * 60 * 1000;

let cache: { at: number; payload: PruebaSocial } | null = null;

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { key: "prueba-social", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  if (cache && Date.now() - cache.at < TTL_MS) {
    return NextResponse.json(cache.payload, { headers: { "Cache-Control": "no-store" } });
  }

  const payload = await getPruebaSocial();
  // Un resultado vacío (la base no contestó) NO se cachea: así el siguiente
  // visitante lo vuelve a intentar en vez de quedarse diez minutos sin aviso
  // por un tropiezo de un segundo.
  if (payload !== PRUEBA_SOCIAL_VACIA) cache = { at: Date.now(), payload };

  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}
