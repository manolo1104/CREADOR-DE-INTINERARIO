import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TOURS_LISTA } from "@/lib/tours";
import { sesionActual } from "@/lib/admin/sesion";
import { registrarEnBitacora } from "@/lib/admin/bitacora";
import { limpiarRuta } from "@/lib/admin/rutas";

export const dynamic = "force-dynamic";

/** PUT — la ficha de ruta y protocolo de un tour (Fase 1). La sección «Rutas» la cierra el middleware. */
export async function PUT(req: NextRequest, { params }: { params: { slug: string } }) {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol === "guia") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  const tour = TOURS_LISTA.find(t => t.slug === params.slug);
  if (!tour) return NextResponse.json({ error: "Ese tour no existe." }, { status: 404 });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
  const ids = (await prisma.proveedor.findMany({ select: { id: true } })).map(p => p.id);
  const r = limpiarRuta(body, ids);
  const data = { ...r, paradas: r.paradas as object[], actualizadoPor: sesion.nombre };
  await prisma.rutaTour.upsert({ where: { tourSlug: tour.slug }, create: { tourSlug: tour.slug, ...data }, update: data });
  await registrarEnBitacora({ accion: "modificó", entidad: "ruta", referencia: tour.slug, resumen: `Ruta y protocolo de ${tour.nombre}: ${r.paradas.length} paradas, ${r.proveedores.length} proveedores` });
  return NextResponse.json({ ok: true });
}
