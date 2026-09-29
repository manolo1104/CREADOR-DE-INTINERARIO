import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RIO_CONFIG_KEY, normalizarRioConfig, rioPorTemporada, type RioEstado } from "@/lib/rioEstado";

export const dynamic = "force-dynamic";

/**
 * El estado del río que pinta la banda pública (BandaRio, un fetch de cliente:
 * así la banda vive también en las páginas estáticas). Si el panel no ha
 * fijado nada —o la tabla `Config` todavía no existe en esta copia— responde
 * lo que dicta la temporada: la banda nunca depende de la base para salir.
 */
export async function GET() {
  let estado: RioEstado = rioPorTemporada();
  let nota: string | undefined;
  let fuente: "manual" | "temporada" = "temporada";
  try {
    const fila = await prisma.config.findUnique({ where: { key: RIO_CONFIG_KEY } });
    if (fila) {
      const cfg = normalizarRioConfig(JSON.parse(fila.value));
      nota = cfg.nota;
      if (cfg.estado !== "auto") {
        estado = cfg.estado;
        fuente = "manual";
      }
    }
  } catch {
    // Sin tabla o sin BD: se queda la temporada.
  }
  return NextResponse.json({ estado, nota: nota ?? null, fuente });
}
