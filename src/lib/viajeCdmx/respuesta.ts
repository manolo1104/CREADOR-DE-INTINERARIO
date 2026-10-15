import { NextResponse } from "next/server";
import { ErrorViaje } from "@/lib/viajeCdmx/cupo";
import { logger } from "@/lib/logger";

/** Un `ErrorViaje` sale con su código y su mensaje; lo demás, como 500 genérico y al registro. */
export function respuestaDeError(e: unknown, donde: string): NextResponse {
  if (e instanceof ErrorViaje) {
    return NextResponse.json({ error: e.message, codigo: e.codigo, ...e.extra }, { status: e.status });
  }
  logger.error(`viaje_cdmx_${donde}_fallo`, { reason: e instanceof Error ? e.message : String(e) });
  return NextResponse.json({ error: "Algo falló de nuestro lado. Intenta de nuevo o escríbenos por WhatsApp.", codigo: "error" }, { status: 500 });
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** 10 dígitos mexicanos, o internacional de 11 a 15. */
export function telefonoValido(t: unknown): boolean {
  const d = String(t ?? "").replace(/\D/g, "");
  return d.length === 10 || (d.length >= 11 && d.length <= 15);
}
