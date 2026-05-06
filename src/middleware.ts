import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || "huasteca-tours-admin-secret-2026"
);

const TRACKED_PATHS = ["/", "/planear", "/destinos", "/experiencias", "/info-practica"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Protección /admin ─────────────────────────────────────────────────────
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const token = req.cookies.get("admin_session")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
    try {
      await jwtVerify(token, secret);
    } catch {
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
