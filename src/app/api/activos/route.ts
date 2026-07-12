import { NextRequest, NextResponse } from "next/server";
import { marcarActivo, contarActivos } from "@/lib/presence";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST { sid }: registra la sesión como activa (latido) y devuelve cuántos hay ahora.
export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { key: "activos", limit: 30, windowMs: 60_000 });
  if (limited) return limited;
  try {
    const { sid } = await req.json();
    if (typeof sid === "string") marcarActivo(sid);
  } catch {
    // body inválido: solo devolvemos el conteo
  }
  return NextResponse.json({ activos: contarActivos() });
}

// GET: solo consultar el conteo (para el indicador del hero).
export async function GET() {
  return NextResponse.json({ activos: contarActivos() });
}
