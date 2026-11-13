import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import {
  decisionApiPanel, primeraPagina, rolDesdeToken, seccionesValidas, seccionRestringida, type RolAdmin, type SeccionAdmin,
} from "@/lib/admin/usuarios";
import { huellaDeSesionVigente } from "@/lib/admin/huellaClave";
import { COOKIE_MARCA_EQUIPO, MARCA_EQUIPO } from "@/lib/equipoInterno";

// El secreto NO tiene fallback: si falta la env var, fallamos cerrado (denegar acceso)
const rawSecret = process.env.ADMIN_JWT_SECRET;
const secret = rawSecret ? new TextEncoder().encode(rawSecret) : null;

// Rutas /api/admin que deben permanecer públicas (no requieren sesión)
const PUBLIC_ADMIN_API = ["/api/admin/login", "/api/admin/logout"];

// Las pestañas que ve quien viene en la cookie (las que le dio Manolo desde
// Inicio, firmadas dentro de la sesión), o null si no hay sesión válida. Una
// sesión de antes de esto no las trae: ve lo de su rol, sin Inicio si no es el
// dueño.
async function seccionesDeSesion(req: NextRequest): Promise<SeccionAdmin[] | null> {
  return (await sesionDeCookie(req))?.secciones ?? null;
}

async function sesionDeCookie(req: NextRequest): Promise<{ rol: RolAdmin; secciones: SeccionAdmin[] } | null> {
  if (!secret) return null; // sin secreto configurado → nadie pasa
  const token = req.cookies.get("admin_session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    // La sesión del guía con una contraseña anterior ya no entra (lote 8, 10 nov 2026).
    if (!(await huellaDeSesionVigente(payload, secret))) return null;
    const rol = rolDesdeToken(payload.rol);
    return { rol, secciones: seccionesValidas(rol, payload.secciones) };
  } catch {
    return null;
  }
}

// 🔴 El GUÍA (rol nuevo del rediseño, 3 nov 2026) solo usa unas cuantas APIs.
// Las de reservas, cotizaciones o clientes no están amarradas a una pestaña
// (varias las comparten), así que sin lista blanca un guía con sesión podía
// leer los datos de todos los clientes y cancelar reservas llamándolas a mano.
// Lote 8 (10 nov 2026): la lista blanca vale SIEMPRE; si Manolo le abre más
// pestañas, solo se le suman las APIs de esas pestañas (`APIS_POR_SECCION`).
// La regla completa vive en `decisionApiPanel` (usuarios.ts), con sus pruebas.

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Protección de las APIs de admin ───────────────────────────────────────
  // (van antes que las páginas: responden 401 JSON en vez de redirigir)
  if (pathname.startsWith("/api/admin") && !PUBLIC_ADMIN_API.includes(pathname)) {
    const decision = decisionApiPanel(pathname, await sesionDeCookie(req));
    if (decision === 401) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (decision === 403) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  // ── Protección de las páginas /admin ──────────────────────────────────────
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const secciones = await seccionesDeSesion(req);
    const primera = secciones ? primeraPagina(secciones) : null;
    if (!secciones || !primera) {
      const res = NextResponse.redirect(new URL("/admin/login", req.url));
      res.cookies.delete("admin_session");
      return res;
    }
    // Sesión buena, pero una pestaña que no le toca: a su primera pestaña (ya no
    // a Inicio, que es solo de Manolo).
    const seccion = seccionRestringida(pathname);
    if (seccion && !secciones.includes(seccion)) {
      return NextResponse.redirect(new URL(primera, req.url));
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
  // El layout del panel vuelve a revisar la pestaña con lo guardado HOY en la
  // base (la sesión puede traer pestañas de hace un rato): necesita la ruta.
  requestHeaders.set("x-pathname", pathname);
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  // Quien abre el panel es del equipo (lote 8, 10 nov 2026): la marca
  // `hp_interno` va también en cookie para que el servidor (/api/track, los
  // pagos) aplique el MISMO filtro que GA4 y Clarity en el navegador.
  if (pathname.startsWith("/admin") && req.cookies.get(MARCA_EQUIPO)?.value !== "1") {
    res.cookies.set(MARCA_EQUIPO, "1", COOKIE_MARCA_EQUIPO);
  }
  return res;
}

export const config = {
  matcher: [
    // Videos, fuentes y avif tampoco pasan por aquí (13 nov 2026): no tienen idioma
    // ni sesión, y el video del inicio se pide por rangos (206) varias veces.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|mp4|webm|mov|woff2?)).*)",
  ],
};
