import { NextRequest, NextResponse } from "next/server";

// Rate limiter en memoria (suficiente para un único servidor Node en Railway).
// No es distribuido: si en el futuro hay varias instancias, migrar a Upstash/Redis.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

interface RateLimitOptions {
  key:      string; // identificador del endpoint
  limit:    number; // peticiones permitidas por ventana
  windowMs: number; // tamaño de la ventana en ms
}

/**
 * Devuelve una respuesta 429 si se excedió el límite, o null si está permitido.
 * Uso: `const limited = rateLimit(req, {...}); if (limited) return limited;`
 */
export function rateLimit(req: NextRequest, opts: RateLimitOptions): NextResponse | null {
  const id = `${opts.key}:${clientIp(req)}`;
  const now = Date.now();
  const bucket = buckets.get(id);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(id, { count: 1, resetAt: now + opts.windowMs });
    return null;
  }

  if (bucket.count >= opts.limit) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta de nuevo en un momento." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  bucket.count++;
  return null;
}

// Limpieza periódica para no acumular buckets vencidos en memoria.
if (typeof setInterval !== "undefined") {
  const timer = setInterval(() => {
    const now = Date.now();
    buckets.forEach((b, id) => {
      if (now > b.resetAt) buckets.delete(id);
    });
  }, 10 * 60_000);
  // No mantener vivo el proceso solo por este timer.
  (timer as { unref?: () => void }).unref?.();
}
