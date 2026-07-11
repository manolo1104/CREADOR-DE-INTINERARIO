import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { actividad } from "@/lib/logger";

// Bots, crawlers y escáneres: no son visitantes reales, no ensucian el feed.
function esBot(ua: string | null): boolean {
  if (!ua) return true;
  return /bot|crawl|spider|slurp|gptbot|chatgpt|headless|python-|curl|wget|scrapy|facebookexternalhit|whatsapp|preview|wp-admin|scan/i.test(ua);
}

// Origen legible de la visita (de dónde llegó).
function fuenteReferrer(ref: string | null): string {
  if (!ref) return "directo";
  try {
    const host = new URL(ref).hostname.replace(/^www\./, "");
    if (host.endsWith("huasteca-potosina.com")) return ""; // navegación interna
    if (host.includes("google"))    return "desde Google";
    if (host.includes("facebook") || host.includes("fb.")) return "desde Facebook";
    if (host.includes("instagram")) return "desde Instagram";
    if (host.includes("bing"))      return "desde Bing";
    if (host.includes("chatgpt") || host.includes("openai")) return "desde ChatGPT";
    return `desde ${host}`;
  } catch {
    return "";
  }
}

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
    TRACKED_PATHS.includes(pathname) ||
    pathname.startsWith("/destinos/") ||
    pathname.startsWith("/en/destinos/");
  if (isTracked && !esBot(req.headers.get("user-agent"))) {
    actividad("🌐  VISITÓ", pathname, fuenteReferrer(req.headers.get("referer")));
  }

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
