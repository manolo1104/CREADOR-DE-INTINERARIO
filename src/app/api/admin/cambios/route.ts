import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addDaysYMD } from "@/lib/dates";
import { registrarEnBitacora } from "@/lib/admin/bitacora";
import { sesionActual } from "@/lib/admin/sesion";
import { KPI } from "@/lib/admin/indicadores/catalogo";

export const dynamic = "force-dynamic";

const FRENTES = ["demanda", "comercial", "operacion", "producto", "precio", "servicio", "datos"];

/**
 * La bitácora de CAMBIOS del negocio (4 nov 2026): «el 11 nov se publicó
 * OXXO/SPEI». Regla del plan As Is / To Be: sin fecha no se sabe qué movió el
 * número. Solo quien ve Metas (cerrada en `RUTAS_RESTRINGIDAS`).
 *
 * POST { fecha, frente, titulo, detalle?, kpis?[] } — anota un cambio.
 */
export async function POST(req: NextRequest) {
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
  const fecha = String(b.fecha ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || addDaysYMD(fecha, 0) !== fecha) return NextResponse.json({ error: "Fecha no válida." }, { status: 400 });
  const frente = String(b.frente ?? "");
  if (!FRENTES.includes(frente)) return NextResponse.json({ error: "Elige el frente." }, { status: 400 });
  const titulo = String(b.titulo ?? "").trim().slice(0, 160);
  if (titulo.length < 3) return NextResponse.json({ error: "Escribe qué cambió." }, { status: 400 });
  const detalle = String(b.detalle ?? "").trim().slice(0, 1000) || null;
  const kpis = Array.isArray(b.kpis) ? b.kpis.filter((k): k is string => typeof k === "string" && !!KPI[k]).slice(0, 12) : [];
  const sesion = await sesionActual();
  const creadoPor = sesion?.nombre ?? "Desconocido";
  try {
    const c = await prisma.cambioMedido.create({ data: { fecha, frente, titulo, detalle, kpis, creadoPor } });
    await registrarEnBitacora({ accion: "creó", entidad: "panel", referencia: `Cambio ${fecha}`, resumen: `Anotó en la bitácora de cambios: «${titulo}» (${fecha})` });
    return NextResponse.json({ ok: true, cambio: c });
  } catch (e: any) {
    console.error("admin/cambios:", e?.message);
    return NextResponse.json({ error: "No se pudo guardar." }, { status: 500 });
  }
}

/** DELETE ?id= — quita un cambio anotado por error. */
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "Falta el id." }, { status: 400 });
  try {
    const c = await prisma.cambioMedido.delete({ where: { id } });
    await registrarEnBitacora({ accion: "eliminó", entidad: "panel", referencia: `Cambio ${c.fecha}`, resumen: `Quitó de la bitácora de cambios: «${c.titulo}» (${c.fecha})` });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se encontró." }, { status: 404 });
  }
}
