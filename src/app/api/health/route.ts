import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Railway usa esta ruta como healthcheck (railway.json) y sirve también para un
// monitor externo tipo UptimeRobot.
//
// Antes solo comprobaba que tres variables de entorno no estuvieran vacías y
// SIEMPRE devolvía 200: durante la caída del 6 de agosto el sitio estuvo 11 h
// sin responder y este endpoint seguía diciendo "ok". Ahora toca la base de
// datos de verdad y devuelve 503 si no contesta, que es lo que hace que
// Railway reinicie y que un monitor externo pueda avisar.
//
// El umbral es holgado a propósito: la PRIMERA consulta tras un arranque en
// frío abre la conexión de Prisma y puede tardar ~3 s (medido), mientras que en
// caliente son ~120 ms. Con un límite corto, Railway reiniciaría contenedores
// sanos y un monitor externo mandaría falsas alarmas. Una BD realmente caída
// falla al instante (conexión rechazada), no a los 8 s.
const TIMEOUT_DB_MS = 8000;
const LATENCIA_LENTA_MS = 2000;

export async function GET() {
  const inicio = Date.now();

  let dbOk = false;
  let dbError: string | null = null;
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`sin respuesta en ${TIMEOUT_DB_MS} ms`)), TIMEOUT_DB_MS),
      ),
    ]);
    dbOk = true;
  } catch (e) {
    dbError = e instanceof Error ? e.message : "error desconocido";
  }

  const latencia = Date.now() - inicio;
  if (dbOk && latencia > LATENCIA_LENTA_MS) {
    logger.warn("health_db_lenta", { latency_ms: latencia });
  } else if (!dbOk) {
    logger.error("health_db_caida", { reason: dbError, latency_ms: latencia });
  }

  const cuerpo = {
    status:    dbOk ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    db:        dbOk ? "up" : "down",
    dbError,
    dbLatencyMs: latencia,
    // Configuración: no tumban el healthcheck, pero se ven de un vistazo.
    config: {
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      stripe:    !!process.env.STRIPE_SECRET_KEY,
      brevo:     !!process.env.BREVO_API_KEY,
      cron:      !!(process.env.CRON_SECRET || process.env.BLOG_AGENT_SECRET),
    },
  };

  return NextResponse.json(cuerpo, { status: dbOk ? 200 : 503 });
}
