"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Bus, Check, X } from "lucide-react";
import { useLocale } from "@/lib/i18n/useLocale";
import { trackTourEvent, sessionId } from "@/lib/tourTracker";
import { VIAJE_RUTA } from "@/lib/viajeCdmx/config";
import { VIAJE_RUTA_EN } from "@/lib/viajeCdmx/en";
import { pesos, pesosEn, rangoCorto, rangoCortoEn } from "@/lib/viajeCdmx/precio";

/**
 * El aviso del viaje CDMX–Xilitla (Manolo, 17 oct 2026: «un pop up del viaje
 * para que deje su correo y revisen la página con la info»).
 *
 * Pide SOLO el correo y manda al momento fechas, lugares, precio por cuarto y
 * qué incluye (`/api/viaje-cdmx/info`). Siempre ofrece también ir a la página.
 *
 * Se porta como el de Xantolo, que es el que ya aprobó Manolo:
 *  · Sale a los 25 s; se cierra con Esc, el fondo, la X o «ahora no».
 *  · Cerrado, no vuelve en esta visita (sessionStorage); con correo, nunca
 *    (localStorage).
 *  · No sale en el pago, el carrito, el panel, el curso, el recomendador, el
 *    comparador, las páginas del viaje ni las de Xantolo.
 *  · 🔴 UN popup a la vez: mientras el de Xantolo siga en juego (hasta el
 *    3 nov 2026, si no lo cerraron ni dejaron correo), este espera. Dos
 *    ventanas encima del contenido es la forma de que cierren la pestaña.
 *  · `?viaje=1` lo abre ya, para revisarlo.
 */
const CLAVE_ENVIADO = "hp_viaje_cdmx_correo";
const CLAVE_CERRADO = "hp_viaje_cdmx_cerrado";
const SEGUNDOS = 25;
const FOTO = "/imagenes/tours/tamul/cascada-de-tamul-arcoiris.jpg";

/** Las llaves del popup de Xantolo (`PopupXantolo.tsx`). Si cambian allá, cambian aquí. */
const XANTOLO_ENVIADO = "hp_xantolo_2026_guia";
const XANTOLO_CERRADO = "hp_xantolo_cerrado";
const XANTOLO_CADUCA = "2026-11-03";

interface Salida {
  fechaSalida: string;
  fechaRegreso: string;
  precioVigente: number;
  disponibles: number;
  estado: string;
}

type Estado = "forma" | "enviando" | "listo";

function leer(fn: () => string | null): string | null {
  try { return fn(); } catch { return null; }
}

export function PopupViaje() {
  const pathname = usePathname() ?? "";
  const { locale } = useLocale();
  const en = locale === "en";
  const [montado, setMontado] = useState(false);
  const [visible, setVisible] = useState(false);
  const [estado, setEstado] = useState<Estado>("forma");
  const [correo, setCorreo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [salidas, setSalidas] = useState<Salida[]>([]);
  const panel = useRef<HTMLDivElement>(null);
  const enfocadoAntes = useRef<HTMLElement | null>(null);
  const abierto = useRef(false);

  const ruta = pathname.replace(/^\/en(?=\/|$)/, "") || "/";
  const fuera =
    ruta.startsWith("/curso") ||
    ruta.startsWith("/admin") ||
    ruta.startsWith("/reservar-tour") ||
    ruta.startsWith("/reservar-paquete") ||
    ruta.startsWith("/reservar/carrito") ||
    // La ficha de un tour: Clarity (11–28 oct 2026) vio gente elegir fecha y, a
    // los 20 s, irse al blog por este aviso. Ahí no se interrumpe la compra.
    /^\/tours\/[^/]+/.test(ruta) ||
    // El catálogo de reservas (29 oct 2026): en el teléfono esta ventana tapaba
    // las tarjetas enteras de /reservar, que es la página que vende.
    ruta === "/reservar" ||
    ruta.startsWith("/confirmacion") ||
    ruta.startsWith("/recomendar") ||
    ruta.startsWith("/comparar") ||
    ruta.startsWith("/viaje-cdmx-xilitla") ||
    ruta.startsWith("/huasteca-potosina-from-mexico-city") ||
    pathname.includes("xantolo");
  const paginaViaje = en ? VIAJE_RUTA_EN : VIAJE_RUTA;

  const cerrar = useCallback(() => {
    try { sessionStorage.setItem(CLAVE_CERRADO, "1"); } catch { /* que al menos se cierre esta vez */ }
    setVisible(false);
    window.setTimeout(() => { setMontado(false); abierto.current = false; }, 170);
    enfocadoAntes.current?.focus();
  }, []);

  useEffect(() => {
    if (fuera || abierto.current) return;
    const forzado = new URLSearchParams(window.location.search).get("viaje") === "1";
    const dioCorreo = () => leer(() => localStorage.getItem(CLAVE_ENVIADO)) !== null;
    const yaCerro = () => leer(() => sessionStorage.getItem(CLAVE_CERRADO)) !== null;
    const cookiesPendientes = () => leer(() => localStorage.getItem("hp_cookie_consent")) === null;
    // ¿El de Xantolo todavía puede salir? Entonces este espera su turno.
    const xantoloEnJuego = () => {
      const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
      if (hoy >= XANTOLO_CADUCA) return false;
      if (leer(() => localStorage.getItem(XANTOLO_ENVIADO)) !== null) return false;
      if (leer(() => sessionStorage.getItem(XANTOLO_CERRADO)) !== null) return false;
      return true;
    };
    if (!forzado && (dioCorreo() || yaCerro())) return;

    const t = window.setTimeout(() => {
      if (!forzado && (dioCorreo() || yaCerro() || cookiesPendientes() || xantoloEnJuego())) return;
      // Si hay otra ventana abierta (la de Xantolo, por ejemplo), no se encima.
      if (!forzado && document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      abierto.current = true;
      enfocadoAntes.current = document.activeElement as HTMLElement | null;
      setMontado(true);
      trackTourEvent("VIAJE_POPUP_VISTO", { ruta: pathname });
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
      fetch("/api/viaje-cdmx/salidas")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (Array.isArray(d?.salidas)) setSalidas(d.salidas); })
        .catch(() => {});
    }, forzado ? 0 : SEGUNDOS * 1000);
    return () => window.clearTimeout(t);
  }, [fuera, pathname]);

  // Esc para cerrar y Tab que no se escapa del cuadro.
  useEffect(() => {
    if (!montado) return;
    const caja = panel.current;
    caja?.querySelector<HTMLElement>("[data-cerrar]")?.focus();
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); cerrar(); return; }
      if (e.key !== "Tab" || !caja) return;
      const focos = caja.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled])');
      if (!focos.length) return;
      const primero = focos[0], ultimo = focos[focos.length - 1];
      if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
    };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [montado, cerrar]);

  const enviar = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (estado === "enviando") return;
    setError(null);
    setEstado("enviando");
    try {
      const r = await fetch("/api/viaje-cdmx/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: correo.trim(), locale, sid: sessionId(), origen: pathname }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.error || "");
      trackTourEvent("LEAD_VIAJE_CDMX", { fuente: "Popup viaje CDMX", ruta: pathname });
      try { localStorage.setItem(CLAVE_ENVIADO, "enviado"); } catch { /* podría repetirse, nada más */ }
      setEstado("listo");
    } catch (err) {
      setEstado("forma");
      setError(err instanceof Error && err.message ? err.message : en ? "We couldn't send it. Try again or see the trip here." : "No pudimos enviarlo. Intenta de nuevo o mira el viaje aquí.");
    }
  }, [correo, estado, en, locale, pathname]);

  if (!montado) return null;

  const abiertas = salidas.filter((s) => s.estado === "preventa" || s.estado === "disponible" || s.estado === "ultimos").slice(0, 2);
  const desde = abiertas.length ? Math.min(...abiertas.map((s) => s.precioVigente)) : null;
  const irAlViaje = (boton: string) => () => { trackTourEvent("VIAJE_BANNER_CLICK", { origen: "popup", boton }); cerrar(); };

  return (
    <div className={`fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center sm:p-6 transition-opacity duration-200 ease-out ${visible ? "opacity-100" : "opacity-0"}`}>
      <div className="absolute inset-0 bg-negro/75 backdrop-blur-[3px]" onClick={cerrar} aria-hidden="true" />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="viaje-popup-titulo"
        className={`relative z-10 w-full max-w-[780px] overflow-hidden rounded-2xl border border-dorado/30 bg-negro shadow-[0_28px_90px_rgba(0,0,0,0.55)] sm:grid sm:grid-cols-[42%_1fr] transition-transform duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${visible ? "translate-y-0" : "translate-y-3"}`}
      >
        <button
          type="button"
          data-cerrar
          onClick={cerrar}
          aria-label={en ? "Close" : "Cerrar"}
          className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-crema/70 transition-colors hover:bg-black/75 hover:text-crema"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="relative h-36 w-full sm:h-auto sm:min-h-[440px]">
          <Image
            src={FOTO}
            alt={en ? "Tamul waterfall with a rainbow over the turquoise river" : "La cascada de Tamul con un arcoíris sobre el río turquesa"}
            fill
            className="object-cover object-[25%_50%]"
            sizes="(min-width: 640px) 328px, 100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-negro via-negro/40 to-transparent sm:bg-gradient-to-r sm:from-transparent sm:via-transparent sm:to-negro" />
        </div>

        <div className="relative -mt-8 px-6 pb-7 sm:mt-0 sm:flex sm:flex-col sm:justify-center sm:px-8 sm:py-9">
          {estado === "listo" ? (
            <div>
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-full border border-dorado/50 bg-dorado/10">
                <Check className="h-5 w-5 text-dorado" aria-hidden="true" />
              </div>
              <h2 id="viaje-popup-titulo" className="mb-3 font-cormorant font-light leading-tight text-crema" style={{ fontSize: "clamp(26px,4.4vw,34px)" }}>
                {en ? "Check your inbox" : "Revisa tu correo"}
              </h2>
              <p className="mb-6 font-dm text-sm leading-relaxed text-crema/65">
                {en
                  ? "We sent you the dates, spots left, prices and what's included. If you don't see it, look in promotions or spam."
                  : "Te mandamos las fechas, los lugares, el precio y lo que incluye. Si no lo ves, busca en promociones o en correo no deseado."}
              </p>
              <Link href={`${paginaViaje}#fechas`} onClick={irAlViaje("listo")} className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 bg-dorado px-6 font-dm text-[11px] uppercase tracking-[2px] text-negro transition-colors hover:bg-crema">
                {en ? "See dates and book" : "Ver fechas y apartar"}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <div>
              <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-dorado/40 bg-dorado/10 px-3 py-1 font-dm text-[10px] uppercase tracking-[1.6px] text-dorado">
                <Bus className="h-3.5 w-3.5" aria-hidden="true" /> {en ? "Small-group trip from Mexico City" : "Salida grupal desde CDMX"}
              </span>
              <h2 id="viaje-popup-titulo" className="mb-2 font-cormorant font-light leading-[1.05] text-crema" style={{ fontSize: "clamp(28px,4.6vw,38px)" }}>
                {en ? <>The Huasteca Potosina, <em className="text-dorado">all included</em></> : <>La Huasteca Potosina, <em className="text-dorado">todo incluido</em></>}
              </h2>
              <p className="mb-4 font-dm text-[13px] leading-relaxed text-crema/70">
                {en
                  ? "Leave the Angel on Friday at midnight and be back Monday at 6 am. Tamul waterfall, Las Pozas and a night in Xilitla."
                  : "Sales del Ángel el viernes a la medianoche y regresas el lunes a las 6 am. La cascada de Tamul, Las Pozas y una noche en Xilitla."}
              </p>

              {abiertas.length > 0 && (
                <ul className="mb-4 flex flex-wrap gap-2">
                  {abiertas.map((s) => (
                    <li key={s.fechaSalida} className="border border-white/15 px-2.5 py-1.5 font-dm text-[11px] text-crema/85">
                      <strong className="font-medium text-crema">{en ? rangoCortoEn(s.fechaSalida, s.fechaRegreso) : rangoCorto(s.fechaSalida, s.fechaRegreso)}</strong>
                      <span className="text-crema/55"> · {en ? `${s.disponibles} left` : `quedan ${s.disponibles}`}</span>
                    </li>
                  ))}
                </ul>
              )}
              {desde != null && (
                <p className="mb-5 font-dm text-crema">
                  <span className="text-xs text-crema/55">{en ? "From " : "Desde "}</span>
                  <span className="font-cormorant text-3xl text-dorado">{en ? pesosEn(desde) : pesos(desde)}</span>
                  <span className="text-xs text-crema/55"> {en ? "per person" : "por persona"}</span>
                </p>
              )}

              <form onSubmit={enviar} className="flex flex-col gap-2.5 sm:flex-row">
                <label htmlFor="viaje-popup-correo" className="sr-only">{en ? "Your email" : "Tu correo"}</label>
                <input
                  id="viaje-popup-correo"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  placeholder={en ? "you@email.com" : "tu@correo.com"}
                  className="min-h-[48px] w-full flex-1 border border-white/20 bg-white/5 px-3 font-dm text-base text-crema placeholder:text-crema/35 focus:border-dorado focus:outline-none sm:text-sm"
                />
                <button
                  type="submit"
                  disabled={estado === "enviando"}
                  className="min-h-[48px] shrink-0 bg-dorado px-5 font-dm text-[11px] uppercase tracking-[1.8px] text-negro transition-colors hover:bg-crema disabled:opacity-60"
                >
                  {estado === "enviando" ? (en ? "Sending…" : "Enviando…") : en ? "Send me the details" : "Mándame la info"}
                </button>
              </form>
              {error && <p className="mt-2 font-dm text-xs text-terracota" role="alert">{error}</p>}
              <p className="mt-2 font-dm text-[11px] text-crema/40">
                {en ? "Dates, prices and what's included. Only about this trip." : "Fechas, precios y qué incluye. Solo de este viaje."}
              </p>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                <Link href={paginaViaje} onClick={irAlViaje("ver")} className="inline-flex items-center gap-1.5 font-dm text-[11px] uppercase tracking-[1.6px] text-dorado transition-colors hover:text-crema">
                  {en ? "See the trip now" : "Ver el viaje ahora"}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
                <button type="button" onClick={cerrar} className="font-dm text-[11px] text-crema/45 underline underline-offset-2 hover:text-crema/70">
                  {en ? "Not now" : "Ahora no"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
