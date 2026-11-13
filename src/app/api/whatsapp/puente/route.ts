import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { confirmarEnvio, registrarEventos, tomarPendientes } from "@/lib/admin/bandejaDatos";
import type { EventoPuente } from "@/lib/admin/bandeja";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * El puente de WhatsApp (`whatsapp-bandeja/`, Fase 2.3, 4 nov 2026) habla con
 * el panel solo por aquí, con su propia llave: Bearer WHATSAPP_PUENTE_TOKEN.
 *  POST { eventos: [...] }   → mensajes que entran o salen, acks y estado de la conexión
 *  POST { confirmar: [...] } → resultado de cada envío { id, ok, waId?, error? }
 *  GET                       → lo que hay que mandar (se reclama: no se entrega dos veces)
 */
function autorizado(req: NextRequest): boolean {
  const llave = process.env.WHATSAPP_PUENTE_TOKEN || "";
  const dada = (req.headers.get("authorization") || "").replace(/^Bearer /, "");
  if (llave.length < 24 || dada.length !== llave.length) return false;
  return timingSafeEqual(Buffer.from(dada), Buffer.from(llave));
}

export async function GET(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, pendientes: await tomarPendientes() });
  } catch (e) {
    console.error("whatsapp/puente GET:", (e as Error)?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  let body: { eventos?: unknown; confirmar?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
  try {
    const eventos = Array.isArray(body.eventos) ? (body.eventos as EventoPuente[]).slice(0, 500) : [];
    const r = eventos.length ? await registrarEventos(eventos) : { guardados: 0, repetidos: 0, leads: 0 };
    const confirmar = Array.isArray(body.confirmar) ? (body.confirmar as { id?: unknown; ok?: unknown; waId?: unknown; error?: unknown }[]).slice(0, 100) : [];
    for (const c of confirmar) {
      if (typeof c?.id === "string") await confirmarEnvio(c.id, c.ok === true, typeof c.waId === "string" ? c.waId : null, typeof c.error === "string" ? c.error : null);
    }
    return NextResponse.json({ ok: true, ...r, confirmados: confirmar.length });
  } catch (e) {
    console.error("whatsapp/puente POST:", (e as Error)?.message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
