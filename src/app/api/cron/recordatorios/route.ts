import { NextRequest, NextResponse } from "next/server";
import { vueltaDeAvisos } from "@/lib/admin/recordatoriosTimer";
import { operarViajesPasados } from "@/lib/admin/crmDatos";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/cron/recordatorios — respaldo del reloj interno (3 nov 2026).
 * Crea los seguimientos de las reglas, manda el resumen de las 7:30 y los
 * recordatorios que ya tocan. Bearer <CRON_SECRET o BLOG_AGENT_SECRET>.
 *
 * Lote 9 (10 nov 2026): también pasa a Operado los leads cuyo viaje ya pasó
 * (antes solo al abrir Leads o una ficha: sin que nadie entrara, el tablero y
 * la regla «¿Consulta nueva?» los veían abiertos) y da una vuelta del agente
 * de los chats (por si el reloj del servidor no corre). Cada paso falla solo:
 * si uno truena, los demás siguen y la respuesta dice cuál falló.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.BLOG_AGENT_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const fallos: string[] = [];
  const paso = async <T,>(nombre: string, f: () => Promise<T>): Promise<T | null> => {
    try { return await f(); } catch (e: any) { console.error(`cron/recordatorios (${nombre}):`, e?.message); fallos.push(nombre); return null; }
  };
  // Reglas automáticas + resumen de las 7:30 + recordatorios (Fase 3).
  const avisos = await paso("avisos", () => vueltaDeAvisos());
  // Viaje ya pasado → Operado (lote 9). No lanza: devuelve cuántos movió.
  const operados = await paso("operados", () => operarViajesPasados());
  // El agente de los chats (lote 9): respeta el tope y el apagado, y no corre
  // dos veces a la vez con el reloj del servidor.
  const agente = await paso("agente", () => import("@/lib/admin/agente/copiloto").then(m => m.vueltaAgente()));
  return NextResponse.json({ ok: fallos.length === 0, ...(avisos ?? {}), operados, agente, ...(fallos.length ? { fallos } : {}) }, { status: fallos.length ? 500 : 200 });
}
