import { NextRequest, NextResponse } from "next/server";
import { sesionActual } from "@/lib/admin/sesion";
import { registrarEnBitacora } from "@/lib/admin/bitacora";
import { guardarPuntoGoogle } from "@/lib/admin/satisfaccion";
import { hoyMX } from "@/lib/dates";

export const dynamic = "force-dynamic";

/**
 * Anota la calificación y el número de reseñas que se ven HOY en el perfil de
 * Google (a mano, decisión de Manolo del 21 oct 2026). Una lectura por día: la
 * segunda del mismo día reemplaza a la primera.
 */
export async function POST(req: NextRequest) {
  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { /* vacío */ }
  const rating = Math.round(Number(b.rating) * 10) / 10;
  const total = Math.round(Number(b.total));
  if (!(rating >= 1 && rating <= 5)) return NextResponse.json({ error: "La calificación va de 1.0 a 5.0 (ej. 4.7)." }, { status: 400 });
  if (!(Number.isInteger(total) && total >= 0 && total < 100_000)) return NextResponse.json({ error: "Escribe el número de reseñas (ej. 161)." }, { status: 400 });
  const sesion = await sesionActual();
  const historial = await guardarPuntoGoogle({ fecha: hoyMX(), rating, total, por: sesion?.nombre ?? "Admin" });
  await registrarEnBitacora({
    accion: "modificó", entidad: "panel", referencia: "Google",
    resumen: `Anotó la calificación de Google: ${rating} · ${total} reseñas`,
  });
  return NextResponse.json({ ok: true, historial });
}
