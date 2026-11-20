import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RIO_CONFIG_KEY, normalizarRioConfig, rioPorTemporada, type RioEstado } from "@/lib/rioEstado";

export const dynamic = "force-dynamic";

/**
 * El estado del río que pinta el bloque «El agua hoy» de las fichas de destinos
 * con agua (`EstadoRioFicha`, un fetch de cliente: así vive también en las
 * páginas estáticas). Hasta el 20 nov 2026 lo pintaba la franja de arriba de
 * todo el sitio (BandaRio), que Manolo quitó. Si el panel no ha
 * fijado nada —o la tabla `Config` todavía no existe en esta copia— responde
 * lo que dicta la temporada: la banda nunca depende de la base para salir.
 */
export async function GET() {
  let estado: RioEstado = rioPorTemporada();
  let nota: string | undefined;
  let fuente: "manual" | "temporada" = "temporada";
  // Cuándo lo fijó el panel (solo si lo fijó a mano): la ficha dice «actualizado el…».
  let actualizado: string | null = null;
  try {
    const fila = await prisma.config.findUnique({ where: { key: RIO_CONFIG_KEY } });
    if (fila) {
      const cfg = normalizarRioConfig(JSON.parse(fila.value));
      nota = cfg.nota;
      if (cfg.estado !== "auto") {
        estado = cfg.estado;
        fuente = "manual";
        actualizado = fila.updatedAt.toISOString();
      }
    }
  } catch {
    // Sin tabla o sin BD: se queda la temporada.
  }
  return NextResponse.json({ estado, nota: nota ?? null, fuente, actualizado });
}
