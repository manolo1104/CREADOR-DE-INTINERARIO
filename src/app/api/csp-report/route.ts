import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * Los reportes de la política de contenido (CSP, 13 nov 2026). Mientras va en
 * «solo reporte» (ver next.config.mjs) esto dice qué BLOQUEARÍA: si aparece un
 * origen legítimo (Stripe, GA4, Clarity…), se agrega a la política antes de
 * aplicarla con CSP_APLICAR=1. Va a los logs de Railway, una línea por reporte,
 * sin la URL completa de la página (puede traer datos en la query).
 */
export async function POST(req: NextRequest) {
  const limitado = rateLimit(req, { key: "csp-report", limit: 30, windowMs: 60_000 });
  if (limitado) return new NextResponse(null, { status: 204 });
  try {
    const cuerpo = await req.json().catch(() => null);
    const r = (cuerpo?.["csp-report"] ?? cuerpo?.[0]?.body ?? cuerpo ?? {}) as Record<string, unknown>;
    const sinQuery = (u: unknown) => String(u ?? "").split("?")[0].slice(0, 200);
    logger.warn("csp_violacion", {
      directiva: String(r["violated-directive"] ?? r["effectiveDirective"] ?? r["effective-directive"] ?? "").slice(0, 80),
      bloqueado: sinQuery(r["blocked-uri"] ?? r["blockedURL"]),
      pagina: sinQuery(r["document-uri"] ?? r["documentURL"]),
    });
  } catch {
    /* un reporte roto no importa */
  }
  return new NextResponse(null, { status: 204 });
}
