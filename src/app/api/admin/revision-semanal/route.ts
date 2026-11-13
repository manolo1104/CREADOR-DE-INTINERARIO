import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registrarEnBitacora } from "@/lib/admin/bitacora";
import { sesionActual } from "@/lib/admin/sesion";
import { lunesDe } from "@/lib/admin/corteSemanal";
import { addDaysYMD } from "@/lib/dates";

export const dynamic = "force-dynamic";

const CAMPOS = ["leadsNuevos", "respuestas5min", "leadsCotizados", "score", "resenasNuevas"] as const;

/** PATCH { semana, leadsNuevos?, respuestas5min?, leadsCotizados?, score?, resenasNuevas?, notas? } — la revisión del jueves. */
export async function PATCH(req: NextRequest) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
  const pedida = String(body.semana ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(pedida) || addDaysYMD(pedida, 0) !== pedida) return NextResponse.json({ error: "Semana no válida." }, { status: 400 });
  const semana = lunesDe(pedida);
  const data: Record<string, unknown> = {};
  for (const c of CAMPOS) {
    if (body[c] === undefined) continue;
    if (body[c] === null || body[c] === "") { data[c] = null; continue; }
    const n = Math.round(Number(body[c]));
    if (!Number.isFinite(n) || n < 0 || n > 100_000 || (c === "score" && n > 100)) return NextResponse.json({ error: `«${c}» no es un número válido.` }, { status: 400 });
    data[c] = n;
  }
  if (body.notas !== undefined) data.notas = String(body.notas ?? "").trim().slice(0, 2000) || null;
  const sesion = await sesionActual();
  data.guardadoPor = sesion?.nombre ?? "Desconocido";
  try {
    const r = await prisma.revisionSemanal.upsert({ where: { semana }, create: { semana, ...(data as any) }, update: data as any });
    await registrarEnBitacora({ accion: "modificó", entidad: "panel", referencia: `Revisión ${semana}`, resumen: `Revisión del jueves de la semana del ${semana}: ${Object.keys(data).filter(k => k !== "guardadoPor").join(", ")}` });
    return NextResponse.json({ ok: true, revision: r });
  } catch (e: any) {
    console.error("admin/revision-semanal:", e?.message);
    return NextResponse.json({ error: "No se pudo guardar." }, { status: 500 });
  }
}
