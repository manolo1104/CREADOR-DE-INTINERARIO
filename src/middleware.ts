import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { puedeVer, rolDesdeToken, seccionRestringida, type RolAdmin } from "@/lib/admin/usuarios";

// El secreto NO tiene fallback: si falta la env var, fallamos cerrado (denegar acceso)
const rawSecret = process.env.ADMIN_JWT_SECRET;
const secret = rawSecret ? new TextEncoder().encode(rawSecret) : null;

// Rutas /api/admin que deben permanecer públicas (no requieren sesión)
const PUBLIC_ADMIN_API = ["/api/admin/login", "/api/admin/logout"];

// Devuelve el rol de quien viene en la cookie, o null si no hay sesión válida.
async function rolDeSesion(req: NextRequest): Promise<RolAdmin | null> {
  if (!secret) return null; // sin secreto configurado → nadie pasa
  const token = req.cookies.get("admin_session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return rolDesdeToken(payload.rol);
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Protección de las APIs de admin ───────────────────────────────────────
  // (van antes que las páginas: responden 401 JSON en vez de redirigir)
  if (pathname.startsWith("/api/admin") && !PUBLIC_ADMIN_API.includes(pathname)) {
    const rol = await rolDeSesion(req);
    if (!rol) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const seccion = seccionRestringida(pathname);
    if (seccion && !puedeVer(rol, seccion)) {
      return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
    }
  }

  // ── Protección de las páginas /admin ──────────────────────────────────────
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const rol = await rolDeSesion(req);
    if (!rol) {
      const res = NextResponse.redirect(new URL("/admin/login", req.url));
      res.cookies.delete("admin_session");
      return res;
    }
    // Sesión buena, pero sección que su rol no ve: de vuelta al inicio del panel.
    const seccion = seccionRestringida(pathname);
    if (seccion && !puedeVer(rol, seccion)) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
  }

  // (Aquí se imprimía «🌐 VISITÓ» por cada página: era 2/3 del log de Railway,
  // contaba también las precargas de enlaces y GA4/Clarity ya miden visitas.
  // Quitado el 30 sep 2026.)

  // ── Locale para el render (lo lee el root layout con headers()) ────────────
  // Español en la raíz; inglés bajo /en. Se inyecta como header de request.
  const locale = pathname === "/en" || pathname.startsWith("/en/") ? "en" : "es";
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-locale", locale);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)).*)",
  ],
};
