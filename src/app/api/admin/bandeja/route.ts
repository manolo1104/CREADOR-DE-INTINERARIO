import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/admin/sesion";
import { detalleConversacion, estadoConexion, listarConversaciones } from "@/lib/admin/bandejaDatos";

export const dynamic = "force-dynamic";

/**
 * GET ?chat=<id>&archivadas=1 — lo que la Bandeja vuelve a pedir cada pocos
 * segundos: la lista, el chat abierto y el estado de la conexión. El QR para
 * vincular el número solo lo ven Manolo y Martín.
 */
export async function GET(req: NextRequest) {
  const sesion = await sesionActual();
  const q = new URL(req.url).searchParams;
  const chat = q.get("chat");
  try {
    const [conversaciones, detalle, conexion] = await Promise.all([
      listarConversaciones({ archivadas: q.get("archivadas") === "1" }),
      chat ? detalleConversacion(chat) : Promise.resolve(null),
      estadoConexion(),
    ]);
    const veQr = sesion?.rol === "dueno" || sesion?.rol === "socio";
    return NextResponse.json({ ok: true, conversaciones, detalle, conexion: conexion ? { ...conexion, qr: veQr ? conexion.qr : null } : null });
  } catch (e) {
    console.error("admin/bandeja GET:", (e as Error)?.message);
    return NextResponse.json({ error: "No se pudo leer la Bandeja." }, { status: 500 });
  }
}

/** PUT { rapidas: string[] } — las respuestas rápidas de la Bandeja (las del manual de ventas). */
export async function PUT(req: NextRequest) {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol === "guia") return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  let body: { rapidas?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
  const rapidas = Array.isArray(body.rapidas) ? body.rapidas.map(x => String(x ?? "").trim().slice(0, 1000)).filter(Boolean).slice(0, 40) : [];
  const value = JSON.stringify(rapidas);
  await prisma.config.upsert({ where: { key: "bandeja:rapidas" }, update: { value }, create: { key: "bandeja:rapidas", value } });
  return NextResponse.json({ ok: true, rapidas });
}
