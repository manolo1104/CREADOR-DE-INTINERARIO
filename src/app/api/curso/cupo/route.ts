import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PRECIOS, inscripcionesAbiertas, precioVigente } from "@/lib/curso";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/curso/cupo — cupo y precio vigentes, leídos de la base (pagos
 * reales), para la barra de cupo y el precio dinámico de la landing.
 *
 * La cifra es REAL: cuenta `compro = true`. Nada de números inventados.
 */
export async function GET() {
  const ahora = new Date();

  // Si la base no responde (o la tabla aún no existe, antes del primer
  // despliegue), se cuenta 0 en vez de reventar con un 500. La página ya
  // degrada así: el contador simplemente no se dibuja. Un endpoint que
  // truena deja la barra de precio de la landing sin datos.
  const pagados = await prisma.cursoLead
    .count({ where: { compro: true } })
    .catch((e) => {
      console.error("[curso/cupo] sin base:", e instanceof Error ? e.message : e);
      return 0;
    });

  const pv = precioVigente(ahora, pagados);

  return NextResponse.json(
    {
      ocupados: pagados,
      total: PRECIOS.cupoTotal,
      precio: pv.precio,
      esFundador: pv.esFundador,
      limite: pv.limite.toISOString(),
      abierto: inscripcionesAbiertas(ahora, pagados),
    },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }
  );
}
