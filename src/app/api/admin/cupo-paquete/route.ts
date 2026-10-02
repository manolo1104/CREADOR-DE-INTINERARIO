import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PAQUETES_EVENTO, getPaquete } from "@/lib/paquetes";
import { lugaresDePaquete, claveCupoManual } from "@/lib/cupoPaquete";
import { registrarEnBitacora } from "@/lib/admin/bitacora";

export const dynamic = "force-dynamic";

// La sesión la exige el middleware (todo /api/admin salvo login/logout).

/** El cupo de cada paquete de evento, con lo vendido por cada puerta. */
export async function GET() {
  const filas = await Promise.all(
    PAQUETES_EVENTO.map(async (p) => ({
      slug: p.slug, nombre: p.nombre, fecha: p.evento!.fechaTexto,
      ...(await lugaresDePaquete(p)),
    })),
  );
  return NextResponse.json({ paquetes: filas });
}

/** Anota cuántas PERSONAS se vendieron por fuera del sitio (WhatsApp, en persona). */
export async function POST(req: NextRequest) {
  let body: { slug?: string; manual?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const paquete = getPaquete(String(body.slug || ""));
  if (!paquete?.evento) return NextResponse.json({ error: "Paquete sin cupo." }, { status: 400 });
  const manual = Math.max(0, Math.min(paquete.evento.cupo, Math.floor(Number(body.manual) || 0)));
  await prisma.config.upsert({
    where:  { key: claveCupoManual(paquete.slug) },
    update: { value: String(manual) },
    create: { key: claveCupoManual(paquete.slug), value: String(manual) },
  });
  await registrarEnBitacora({
    accion: "modificó", entidad: "cupo", referencia: paquete.slug,
    resumen: `Cupo de «${paquete.nombre}»: ${manual} lugar(es) vendidos por fuera del sitio`,
  });
  return NextResponse.json({ ok: true, ...(await lugaresDePaquete(paquete)) });
}
