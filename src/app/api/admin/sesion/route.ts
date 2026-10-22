import { NextRequest, NextResponse } from "next/server";
import { createToken, verifyToken } from "@/lib/admin/auth";
import { seccionesDe } from "@/lib/admin/permisos";
import { usuariosAdmin } from "@/lib/admin/usuarios";

export const dynamic = "force-dynamic";

/**
 * POST → vuelve a firmar la sesión con las pestañas que esa persona ve HOY.
 *
 * Lo llama el menú en cada cambio de página: si Manolo le quitó o le dio una
 * pestaña a alguien (desde Inicio), vale desde su siguiente clic, sin esperar a
 * que vuelva a entrar. La sesión conserva su vencimiento: refrescar las
 * pestañas no la alarga.
 */
export async function POST(req: NextRequest) {
  const token = req.cookies.get("admin_session")?.value;
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const payload = await verifyToken(token);
    const usuario = usuariosAdmin().find(u => u.user === payload.user);
    if (!usuario || typeof payload.exp !== "number") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const secciones = await seccionesDe(usuario);
    const nuevo = await createToken(usuario, secciones, payload.exp);
    const res = NextResponse.json({ secciones });
    res.cookies.set("admin_session", nuevo, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: Math.max(0, payload.exp - Math.floor(Date.now() / 1000)),
      path: "/",
    });
    return res;
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
}
