import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    logger.error("itinerary_generate_error", { reason: "ANTHROPIC_API_KEY missing" });
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY no configurada." },
      { status: 503 }
    );
  }

  const startMs = Date.now();

  try {
    const body = await req.json();

    // Extraer metadata del prompt para logs (sin exponer contenido completo)
    const userMsg = body?.messages?.[0]?.content ?? "";
    const dias = userMsg.match(/(\d+)\s*d[íi]as?/i)?.[1] ?? null;
    const presupuesto = userMsg.match(/presupuesto[^:]*:\s*(\w+)/i)?.[1] ?? null;
    const viajero = userMsg.match(/viajero[^:]*:\s*([^\n]+)/i)?.[1]?.trim() ?? null;

    logger.info("itinerary_generate_start", {
      dias: dias ? parseInt(dias) : null,
      presupuesto,
      viajero,
      model: body?.model ?? null,
    });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      logger.error("itinerary_generate_error", {
        status: response.status,
        reason: data.error?.message ?? "Error de Anthropic",
        duration_ms: Date.now() - startMs,
      });
      return NextResponse.json(
        { error: data.error?.message ?? "Error de Anthropic" },
        { status: response.status }
      );
    }

    const tokens = data.usage ?? {};
    logger.info("itinerary_generate_success", {
      duration_ms: Date.now() - startMs,
      input_tokens: tokens.input_tokens ?? null,
      output_tokens: tokens.output_tokens ?? null,
      dias: dias ? parseInt(dias) : null,
      presupuesto,
    });

    return NextResponse.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    logger.error("itinerary_generate_exception", {
      reason: msg,
      duration_ms: Date.now() - startMs,
    });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
