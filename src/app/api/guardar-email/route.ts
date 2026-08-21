import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { guardarLead, registrarLead, esEmailValido, normalizarFuente } from "@/lib/leads";

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { key: "guardar-email", limit: 5, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const { email, fuente } = await req.json();

    if (!esEmailValido(email)) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }

    const fuenteTxt = normalizarFuente(fuente);
    const ok = await guardarLead(email, fuenteTxt);
    if (!ok) return NextResponse.json({ error: "Error al guardar" }, { status: 500 });

    // Este endpoint no manda ningún correo, así que la secuencia arranca desde
    // el paso 1. Antes el correo solo caía en la hoja de Google y nadie volvía
    // a escribirle nunca.
    await registrarLead(email, fuenteTxt, { tourPrincipal: "expedicion-tamul" });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[guardar-email]", err);
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  }
}
