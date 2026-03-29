import { NextRequest, NextResponse } from "next/server";

// Páginas que queremos trackear (excluye assets, _next, etc.)
const TRACKED_PATHS = ["/", "/planear", "/destinos", "/experiencias", "/info-practica"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isTracked =
    TRACKED_PATHS.includes(pathname) ||
    pathname.startsWith("/destinos/");

  if (isTracked) {
    const entry = {
      level: "info",
      event: "page_view",
      ts: new Date().toISOString(),
      path: pathname,
      referrer: req.headers.get("referer") ?? null,
      ua: req.headers.get("user-agent")?.slice(0, 80) ?? null,
      country: req.headers.get("x-vercel-ip-country") ?? req.headers.get("cf-ipcountry") ?? null,
    };
    console.log(JSON.stringify(entry));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)).*)",
  ],
};
