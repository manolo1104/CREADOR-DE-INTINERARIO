import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/admin/sesion";
import { registrarEnBitacora, pesos } from "@/lib/admin/bitacora";
import { calcFinanzas, resumirParaCorte, periodoDe, type Granularidad } from "@/lib/admin/finanzas";
import { hoyMX } from "@/lib/dates";
import { puedeHacer } from "@/lib/admin/usuarios";

export const dynamic = "force-dynamic";

const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/;

// GET → los cortes ya cerrados, del más reciente al más viejo.
export async function GET() {
  try {
    return NextResponse.json(
      await prisma.corteCerrado.findMany({ orderBy: { desde: "desc" }, take: 60 }),
    );
  } catch (e: any) {
    console.error("admin/cortes GET:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

/**
 * POST → cierra un corte: calcula el periodo y GUARDA la foto.
 * Si mañana alguien captura un costo viejo, esta foto no cambia: para eso está
 * el corte en vivo. Cerrar dos veces el mismo periodo lo reemplaza y queda en
 * la bitácora.
 */
export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const tipo = ["diario", "semanal", "mensual"].includes(b?.tipo) ? String(b.tipo) : "diario";
    const fecha = ES_FECHA.test(String(b?.fecha ?? "")) ? String(b.fecha) : hoyMX();

    const g: Granularidad = tipo === "semanal" ? "semana" : tipo === "mensual" ? "mes" : "dia";
    const { desde, hasta } = periodoDe(fecha, g);

    const sesion = await sesionActual();
    if (!sesion || !puedeHacer(sesion.rol, "cerrarCorte")) {
      return NextResponse.json({ error: "Tu cuenta no puede cerrar cortes" }, { status: 403 });
    }

    const finanzas = await calcFinanzas(desde, hasta, "tour");
    const resumen  = resumirParaCorte(finanzas);

    const corte = await prisma.corteCerrado.upsert({
      where:  { tipo_desde_hasta: { tipo, desde, hasta } },
      create: { tipo, desde, hasta, resumen: resumen as any, cerradoPor: sesion?.nombre ?? "?", nota: b?.nota ? String(b.nota).slice(0, 300) : null },
      update: { resumen: resumen as any, cerradoPor: sesion?.nombre ?? "?", nota: b?.nota ? String(b.nota).slice(0, 300) : null },
    });

    await registrarEnBitacora({
      accion:  "creó",
      entidad: "corte",
      resumen: `Corte ${tipo} ${desde}${desde === hasta ? "" : ` a ${hasta}`}: ventas ${pesos(resumen.ventas)}, utilidad ${pesos(resumen.utilidadOperativa)}`,
    });

    return NextResponse.json({ ok: true, corte });
  } catch (e: any) {
    console.error("admin/cortes POST:", e?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
