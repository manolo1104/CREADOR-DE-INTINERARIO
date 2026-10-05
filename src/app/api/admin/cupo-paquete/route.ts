import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PAQUETES_EVENTO, getPaquete } from "@/lib/paquetes";
import { lugaresDePaquete, claveCupoManual } from "@/lib/cupoPaquete";
import { escribirManual } from "@/lib/cupoEvento";
import { registrarEnBitacora } from "@/lib/admin/bitacora";

export const dynamic = "force-dynamic";

// La sesión la exige el middleware (todo /api/admin salvo login/logout).

/** El cupo de cada evento, con lo vendido por cada puerta. */
export async function GET() {
  const filas = await Promise.all(
    PAQUETES_EVENTO.map(async (p) => ({
      slug: p.slug, nombre: p.nombre, fecha: p.evento!.fechaTexto,
      salidaMaxima: p.evento!.salidaMaxima,
      ...(await lugaresDePaquete(p)),
    })),
  );
  return NextResponse.json({ paquetes: filas });
}

/**
 * Anota lo vendido por fuera del sitio (WhatsApp, en persona), en la unidad del
 * evento: `manual` son cuartos en el paquete con hotel y personas en la noche
 * sin hotel. En el de hotel, `personas` dice cuánta gente va en esos cuartos
 * (de 2 a 4 por cuarto): sin eso la salida de la noche se llenaría de más.
 */
export async function POST(req: NextRequest) {
  let body: { slug?: string; manual?: number; personas?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const paquete = getPaquete(String(body.slug || ""));
  const evento = paquete?.evento;
  if (!paquete || !evento) return NextResponse.json({ error: "Paquete sin cupo." }, { status: 400 });

  const unidades = Math.max(0, Math.min(evento.cupo, Math.floor(Number(body.manual) || 0)));
  const personas = evento.unidad === "persona"
    ? unidades
    : Math.max(unidades * 2, Math.min(unidades * evento.maxPorReserva, Math.floor(Number(body.personas) || 0)));

  await prisma.config.upsert({
    where:  { key: claveCupoManual(paquete.slug) },
    update: { value: escribirManual({ unidades, personas }) },
    create: { key: claveCupoManual(paquete.slug), value: escribirManual({ unidades, personas }) },
  });
  const cosa = evento.unidad === "habitacion"
    ? `${unidades} cuarto(s) con ${personas} persona(s)`
    : `${unidades} lugar(es)`;
  await registrarEnBitacora({
    accion: "modificó", entidad: "cupo", referencia: paquete.slug,
    resumen: `Cupo de «${paquete.nombre}» (${evento.fechaTexto}): ${cosa} vendidos por fuera del sitio`,
  });
  return NextResponse.json({ ok: true, ...(await lugaresDePaquete(paquete)) });
}
