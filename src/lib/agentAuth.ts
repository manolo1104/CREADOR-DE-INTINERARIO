import { NextRequest, NextResponse } from "next/server";

/**
 * Valida el token Bearer compartido con el bot de WhatsApp (AGENT_API_TOKEN).
 * Devuelve una NextResponse de error si la autenticación falla, o null si es válida.
 *
 * Uso en un route handler:
 *   const denied = checkAgentAuth(req);
 *   if (denied) return denied;
 */
export function checkAgentAuth(req: NextRequest): NextResponse | null {
  const expected = process.env.AGENT_API_TOKEN;

  // Fail-closed: si el servidor no tiene token configurado, no se permite el acceso.
  if (!expected) {
    return NextResponse.json(
      { error: "AGENT_API_TOKEN no configurado en el servidor." },
      { status: 503 }
    );
  }

  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

  if (!token || token !== expected) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  return null;
}
