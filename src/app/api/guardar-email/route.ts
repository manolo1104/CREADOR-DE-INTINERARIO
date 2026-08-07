import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { guardarLead, esEmailValido, normalizarFuente } from "@/lib/leads";

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { key: "guardar-email", limit: 5, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const { email, fuente } = await req.json();

    if (!esEmailValido(email)) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }

    const ok = await guardarLead(email, normalizarFuente(fuente));
    if (!ok) return NextResponse.json({ error: "Error al guardar" }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[guardar-email]", err);
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  }
}
