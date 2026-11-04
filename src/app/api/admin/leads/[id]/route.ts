import { NextRequest, NextResponse } from "next/server";
import { sesionActual } from "@/lib/admin/sesion";
import { agregarNota, editarOportunidad, ErrorCrm, moverEtapa, vincularFolio } from "@/lib/admin/crmDatos";

export const dynamic = "force-dynamic";

/**
 * PATCH { accion: "editar" | "etapa" | "nota" | "vincular", … }
 *  editar   → los campos del lead y del contacto
 *  etapa    → { etapa, motivo?, motivoDetalle? } (perdido exige motivo)
 *  nota     → { texto }
 *  vincular → { folio } (COT-… o HP…)
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
  const quien = (await sesionActual())?.nombre ?? "Desconocido";
  try {
    switch (body.accion) {
      case "editar":   await editarOportunidad(params.id, body, quien); break;
      case "etapa":    await moverEtapa(params.id, body.etapa, { clave: body.motivo, detalle: body.motivoDetalle }, quien); break;
      case "nota":     await agregarNota(params.id, body.texto, quien); break;
      case "vincular": await vincularFolio(params.id, body.folio, quien); break;
      default: return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ErrorCrm) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("admin/leads PATCH:", (e as Error)?.message);
    return NextResponse.json({ error: "No se pudo guardar." }, { status: 500 });
  }
}
