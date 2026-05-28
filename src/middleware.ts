import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// El secreto NO tiene fallback: si falta la env var, fallamos cerrado (denegar acceso)
const rawSecret = process.env.ADMIN_JWT_SECRET;
const secret = rawSecret ? new TextEncoder().encode(rawSecret) : null;

const TRACKED_PATHS = ["/", "/planear", "/destinos", "/experiencias", "/info-practica"];

// Rutas /api/admin que deben permanecer públicas (no requieren sesión)
const PUBLIC_ADMIN_API = ["/api/admin/login", "/api/admin/logout"];

async function isValidSession(req: NextRequest): Promise<boolean> {
  if (!secret) return false; // sin secreto configurado → nadie pasa
  const token = req.cookies.get("admin_session")?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Protección de las APIs de admin ───────────────────────────────────────
  // (van antes que las páginas: responden 401 JSON en vez de redirigir)
  if (pathname.startsWith("/api/admin") && !PUBLIC_ADMIN_API.includes(pathname)) {
    if (!(await isValidSession(req))) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  // ── Protección de las páginas /admin ──────────────────────────────────────
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!(await isValidSession(req))) {
      const res = NextResponse.redirect(new URL("/admin/login", req.url));
      res.cookies.delete("admin_session");
      return res;
    }
  }

  // ── Analytics públicas ────────────────────────────────────────────────────
  const isTracked =
    TRACKED_PATHS.includes(pathname) || pathname.startsWith("/destinos/");
  if (isTracked) {
    console.log(JSON.stringify({
      level: "info", event: "page_view",
      ts: new Date().toISOString(), path: pathname,
      referrer: req.headers.get("referer") ?? null,
      ua: req.headers.get("user-agent")?.slice(0, 80) ?? null,
      country: req.headers.get("x-vercel-ip-country") ?? req.headers.get("cf-ipcountry") ?? null,
    }));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)).*)",
  ],
};
