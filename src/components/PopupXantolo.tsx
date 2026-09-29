"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, ArrowRight, Check } from "lucide-react";
import { useLocale } from "@/lib/i18n/useLocale";

/**
 * El aviso de Xantolo: aparece a los 20 segundos de cada página y regala la
 * guía por correo.
 *
 * Diseño «la fecha manda» (variante 1b del boceto): horizontal, la foto del
 * sahumerio a la izquierda y, a la derecha, lo primero y más grande son las
 * TRES NOCHES. Quien ve esto no necesita que le expliquen qué es Xantolo:
 * necesita saber CUÁNDO es, porque de eso depende si le cuadra el viaje.
 *
 * Es una interrupción, así que se porta como tal:
 *
 *  · Se cierra con Esc, con el fondo, con la X y con «ahora no».
 *  · Cerrarlo NO lo apaga: vuelve a salir a los 20 s en cada recarga y en
 *    cada página nueva (decisión de Manolo, 28 sep 2026). Antes se callaba el
 *    resto de la visita con `sessionStorage`.
 *  · Si dejó su correo, no vuelve NUNCA —eso sí en `localStorage`—: ya tiene la
 *    guía y volver a pedírsela es la manera más rápida de perder a alguien.
 *  · No sale en el carrito, en la reserva ni en el pago: a quien está metiendo
 *    su tarjeta no se le interrumpe.
 *  · Caduca solo el 3 de noviembre. Nadie tiene que acordarse de quitarlo.
 *  · No sale si el aviso de cookies sigue en pantalla: dos capas encima del
 *    contenido a la vez es lo que hace que la gente cierre la pestaña.
 *  · No sale en el propio artículo de Xantolo —invitar a leer lo que ya estás
 *    leyendo— ni en el embudo del curso ni en el panel.
 *
 * Las fechas salen de lo que el sitio ya afirma en `destinoData.ts` y en
 * `destinos.ts`: del 31 de octubre al 2 de noviembre. No se inventó ninguna.
 */

/** Dio su correo: se calla para siempre. */
const CLAVE_ENVIADO = "hp_xantolo_2026_guia";
const SEGUNDOS = 20;
/** El día que deja de tener sentido. Se compara contra la fecha en México. */
const CADUCA = "2026-11-03";
/** 🔴 Sin prefijo de idioma: el blog sólo existe en español y `/en/blog/…` da 404. */
const SLUG_GUIA = "/blog/xantolo-en-la-huasteca-potosina-la-fiesta-de-muertos-guia";
const FOTO = "/imagenes/blog/xantolo-en-la-huasteca-potosina-la-fiesta-de-muertos-guia/hero.jpg";

/** Los dos colores del boceto. No son del tema del sitio a propósito: Xantolo
 *  es morado de altar y naranja de cempasúchil, y ese par no existe en la
 *  paleta verde de la Huasteca. Viven aquí y sólo aquí. */
const MORADO = "#2a1231";
const CEMPASUCHIL = "#f29422";
const CREMA = "#f4edd8";

/** Las tres noches. Si cambian, se cambian aquí y en `xantoloEmail.ts`. */
const NOCHES = [
  { dia: "31", mes: { es: "OCT", en: "OCT" } },
  { dia: "1", mes: { es: "NOV", en: "NOV" } },
  { dia: "2", mes: { es: "NOV", en: "NOV" } },
];

/**
 * El papel picado que cuelga del borde de arriba.
 *
 * Una tira, no una guirnalda de fiesta infantil: 22 px de alto y al 22 % de
 * opacidad. Es un mosaico CSS con una sola banderita dibujada, así que pesa
 * nada y se repite sola por ancha que sea la ventana.
 *
 * 🔴 La primera versión llevaba los calados en círculo —uno arriba y dos
 * abajo— y en el navegador se leía como una CARA: dos ojos y una boca, una
 * fila de calaveritas de dibujo animado. Tres rombos en HILERA, a la misma
 * altura, no forman cara y además es el calado real del papel picado.
 */
const PAPEL_PICADO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="22" viewBox="0 0 44 22">` +
      `<path fill="${CEMPASUCHIL}" fill-rule="evenodd" ` +
      // La bandera, con el borde de abajo festoneado en tres picos.
      `d="M4 0H40V13L34 19L28 13L22 19L16 13L10 19L4 13Z` +
      // Tres rombos calados en hilera: el de en medio, mayor.
      `M22 3.4L25 6.6L22 9.8L19 6.6Z` +
      `M12.5 4.6L14.6 6.6L12.5 8.6L10.4 6.6Z` +
      `M31.5 4.6L33.6 6.6L31.5 8.6L29.4 6.6Z"/>` +
      `</svg>`,
  );

function yaCaduco(): boolean {
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  return hoy >= CADUCA;
}

type Estado = "forma" | "enviando" | "listo";

export function PopupXantolo() {
  const pathname = usePathname() ?? "";
  const { locale } = useLocale();
  const en = locale === "en";
  const [montado, setMontado] = useState(false);
  const [visible, setVisible] = useState(false);
  const [estado, setEstado] = useState<Estado>("forma");
  const [correo, setCorreo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const enfocadoAntes = useRef<HTMLElement | null>(null);

  /** ¿Está en pantalla? Una página nueva no debe reiniciarlo si ya está abierto. */
  const abierto = useRef(false);

  // La ruta sin el prefijo de idioma: "/en/reservar-tour/x" → "/reservar-tour/x".
  const ruta = pathname.replace(/^\/en(?=\/|$)/, "") || "/";
  const fuera =
    ruta.startsWith("/curso") ||
    ruta.startsWith("/admin") ||
    ruta.startsWith("/reservar-tour") ||
    ruta.startsWith("/reservar-paquete") ||
    ruta.startsWith("/reservar/carrito") ||
    ruta.startsWith("/confirmacion") ||
    pathname.includes("xantolo");

  const cerrar = useCallback(() => {
    setVisible(false);
    // Se desmonta después de la salida, que es más corta que la entrada.
    window.setTimeout(() => {
      setMontado(false);
      abierto.current = false;
    }, 170);
    enfocadoAntes.current?.focus();
  }, []);

  useEffect(() => {
    if (fuera || abierto.current) return;

    /* Puerta trasera para revisarlo: `?xantolo=1` lo abre YA, sin los 20
       segundos y sin hacer caso de que ya se haya cerrado antes.
       Existe porque el comportamiento correcto de cara al visitante deja al
       dueño sin manera de volver a verlo, y vaciarle el almacenamiento del
       navegador no es una instrucción que se le pueda dar a nadie. */
    const forzado = new URLSearchParams(window.location.search).get("xantolo") === "1";

    if (!forzado && yaCaduco()) return;

    /* Sin almacenamiento no se sabe si ya dio su correo: mejor no salir que
       pedírselo cada 20 segundos a quien ya lo dio. */
    const dioCorreo = (): boolean => {
      try {
        return localStorage.getItem(CLAVE_ENVIADO) !== null;
      } catch {
        return true;
      }
    };
    /* El aviso de cookies se mira al DISPARAR, no al armar: en 20 s da tiempo
       de contestarlo, y dos capas encima del contenido a la vez es lo que hace
       cerrar la pestaña. */
    const cookiesPendientes = (): boolean => {
      try {
        return localStorage.getItem("hp_cookie_consent") === null;
      } catch {
        return true;
      }
    };
    if (!forzado && dioCorreo()) return;

    const t = window.setTimeout(() => {
      // Pudo dejar su correo en otra pestaña durante la espera.
      if (!forzado && (dioCorreo() || cookiesPendientes())) return;
      abierto.current = true;
      enfocadoAntes.current = document.activeElement as HTMLElement | null;
      setMontado(true);
      // Un cuadro de margen para que el estado inicial llegue a pintarse: sin
      // esto el navegador ve el estado final desde el principio y no hay
      // transición, sólo aparición de golpe.
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    }, forzado ? 0 : SEGUNDOS * 1000);
    return () => window.clearTimeout(t);
    /* `pathname` también arma el reloj: el aviso vive en el marco del sitio y
       no se vuelve a montar al pasar de una página a otra. Sin esto sólo
       saldría al recargar. */
  }, [fuera, pathname]);

  // Esc para cerrar y Tab que no se escapa del cuadro.
  useEffect(() => {
    if (!montado) return;
    const caja = panel.current;
    /* Se enfoca la X, no el campo de correo: en un celular enfocar un input
       levanta el teclado de golpe, y eso es una segunda interrupción encima
       de la primera. */
    caja?.querySelector<HTMLElement>("[data-cerrar]")?.focus();

    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cerrar();
        return;
      }
      if (e.key !== "Tab" || !caja) return;
      const focos = caja.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focos.length) return;
      const primero = focos[0];
      const ultimo = focos[focos.length - 1];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [montado, cerrar]);

  const enviar = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (estado === "enviando") return;
      setError(null);
      setEstado("enviando");
      try {
        const r = await fetch("/api/xantolo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: correo.trim(), fuente: "Popup Xantolo" }),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data?.error || "");
        /* Ya la tiene: este aviso no vuelve a salirle nunca. */
        try {
          localStorage.setItem(CLAVE_ENVIADO, "enviado");
        } catch {
          /* Sin almacenamiento sigue funcionando, sólo que podría repetirse. */
        }
        setEstado("listo");
      } catch (err) {
        setEstado("forma");
        setError(
          err instanceof Error && err.message
            ? err.message
            : en
              ? "We couldn't send it. Try again or read it here."
              : "No pudimos enviarlo. Intenta de nuevo o léela aquí mismo.",
        );
      }
    },
    [correo, estado, en],
  );

  if (!montado) return null;

  return (
    <div
      className={`fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center sm:p-6 transition-opacity duration-200 ease-out ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* El fondo cierra, pero no es un botón para el lector de pantalla: la X
          y «ahora no» ya hacen ese trabajo y sí se anuncian. */}
      <div
        className="absolute inset-0 backdrop-blur-[3px]"
        style={{ backgroundColor: "rgba(18,8,22,.72)" }}
        onClick={cerrar}
        aria-hidden="true"
      />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="xantolo-titulo"
        /* Nunca desde scale(0): nada aparece de la nada. Entra en 260 ms con la
           curva del resto del sitio y sale en 160, porque al cerrar el usuario
           ya decidió y esperar se siente lento. */
        className={`popup-xantolo relative z-10 w-full max-w-[800px] overflow-hidden rounded-2xl shadow-[0_28px_90px_rgba(0,0,0,0.55)] sm:grid sm:grid-cols-[42%_1fr] ${
          visible ? "popup-xantolo--visible" : ""
        }`}
        style={{ backgroundColor: MORADO, border: `1px solid ${CEMPASUCHIL}33` }}
      >
        <button
          type="button"
          data-cerrar
          onClick={cerrar}
          aria-label={en ? "Close" : "Cerrar"}
          className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-crema/70 transition-colors duration-200 hover:bg-black/75 hover:text-crema active:scale-95"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        {/* ── La foto ──────────────────────────────────────────────────────
            En celular es una franja arriba; en computadora, la columna
            izquierda completa. El degradado la funde con el morado del panel
            para que no se vea una costura entre foto y contenido. */}
        <div className="relative h-36 w-full sm:h-auto sm:min-h-[460px]">
          <Image
            src={FOTO}
            alt={
              en
                ? "Xantolo altar in the Huasteca Potosina: an arch of marigolds, lit candles and portraits of the departed"
                : "Altar de Xantolo en la Huasteca Potosina: arco de flores de cempasúchil, veladoras encendidas y retratos de los difuntos"
            }
            fill
            className="object-cover"
            style={{ objectPosition: "60% 50%" }}
            sizes="(min-width: 640px) 336px, 100vw"
          />
          <div
            className="absolute inset-0 sm:hidden"
            style={{
              backgroundImage: `linear-gradient(to top, ${MORADO} 0%, ${MORADO}cc 35%, rgba(42,18,49,0) 100%)`,
            }}
          />
          <div
            className="absolute inset-0 hidden sm:block"
            style={{
              backgroundImage: `linear-gradient(to right, rgba(42,18,49,0) 45%, ${MORADO}cc 80%, ${MORADO} 100%)`,
            }}
          />
        </div>

        {/* ── El contenido ────────────────────────────────────────────────── */}
        <div className="relative -mt-8 px-6 pb-7 sm:mt-0 sm:flex sm:flex-col sm:justify-center sm:px-9 sm:py-10">
          {/* El papel picado cuelga del borde de arriba del panel, no de la
              foto: en celular la foto ya ocupa esa franja. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 hidden h-[22px] opacity-[0.22] sm:block"
            style={{ backgroundImage: `url("${PAPEL_PICADO}")`, backgroundRepeat: "repeat-x" }}
          />

          {estado === "listo" ? (
            /* ── Ya está enviado ───────────────────────────────────────────
               🔴 Medido: el cuadro pasa de 540 a 348 px de alto al confirmar.
               No se fuerza a que midan igual —dejaría un hueco vacío enorme
               debajo del «va en camino»— y no molesta porque en celular el
               cuadro está anclado ABAJO: al encoger, el texto se queda donde
               estaban los ojos y lo que se mueve es el borde de arriba. En
               computadora la columna de la foto tiene suelo de 460 px, así
               que ahí el cuadro ni se inmuta. */
            <div className="relative">
              <div
                className="mb-5 flex h-11 w-11 items-center justify-center rounded-full"
                style={{ backgroundColor: `${CEMPASUCHIL}1f`, border: `1px solid ${CEMPASUCHIL}59` }}
              >
                <Check className="h-5 w-5" style={{ color: CEMPASUCHIL }} aria-hidden="true" />
              </div>
              <h2
                id="xantolo-titulo"
                className="mb-3 font-cormorant font-light leading-tight text-crema"
                style={{ fontSize: "clamp(26px,4.4vw,34px)" }}
              >
                {en ? "It's on its way" : "Va en camino"}
              </h2>
              <p className="mb-7 font-dm text-sm leading-relaxed text-crema/65">
                {en
                  ? "Check your inbox — the guide is there. If you don't see it, look in promotions or spam."
                  : "Revisa tu correo, ahí está la guía. Si no la ves, busca en promociones o en correo no deseado."}
              </p>
              <Link
                href={SLUG_GUIA}
                onClick={cerrar}
                className="inline-flex items-center gap-2 font-dm text-[11px] uppercase tracking-[1.6px] text-crema/70 transition-colors duration-200 hover:text-crema"
              >
                {en ? "Or read it right now" : "O léela ahora mismo"}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <div className="relative">
              <span
                className="mb-5 inline-block rounded-full px-3 py-1 font-dm text-[10px] uppercase tracking-[1.6px]"
                style={{
                  backgroundColor: `${CEMPASUCHIL}1f`,
                  border: `1px solid ${CEMPASUCHIL}59`,
                  color: CEMPASUCHIL,
                }}
              >
                {en ? "Free guide" : "Guía gratis"}
              </span>

              {/* ── La fecha, que es lo que manda ──────────────────────────
                  Tres noches, tres cifras. Cormorant en 300 y a 76 px: es lo
                  más grande del cuadro por mucho, porque «cuándo» es la única
                  pregunta que decide si alguien puede venir o no. */}
              <div className="mb-5 flex items-end gap-4 sm:gap-6">
                {NOCHES.map((n, i) => (
                  <div key={n.dia} className="flex items-end gap-4 sm:gap-6">
                    {i > 0 && (
                      <span
                        aria-hidden="true"
                        className="mb-3 block h-9 w-px"
                        style={{ backgroundColor: `${CEMPASUCHIL}40` }}
                      />
                    )}
                    <div>
                      {/* 🔴 `lining-nums` no es adorno: Cormorant Garamond
                          trae cifras de estilo ANTIGUO por defecto, y así el
                          «3» baja de la línea, el «1» queda a media altura y
                          las tres fechas se ven de tamaños distintos. Medido
                          en el navegador: el 3 se metía encima del «OCT». */}
                      <span
                        className="block font-cormorant font-light leading-[0.85]"
                        style={{
                          fontSize: "clamp(52px,9vw,76px)",
                          color: CEMPASUCHIL,
                          fontVariantNumeric: "lining-nums",
                          fontFeatureSettings: '"lnum" 1',
                        }}
                      >
                        {n.dia}
                      </span>
                      <span className="mt-1.5 block font-dm text-[10px] uppercase tracking-[2.4px] text-crema/45">
                        {n.mes[en ? "en" : "es"]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <h2
                id="xantolo-titulo"
                className="mb-3 font-cormorant font-light leading-tight text-crema"
                style={{ fontSize: "clamp(24px,4vw,30px)" }}
              >
                {en ? "Xantolo in the Huasteca" : "Xantolo en la Huasteca"}
              </h2>
              <p className="mb-6 font-dm text-sm leading-relaxed text-crema/65">
                {en
                  ? "Three nights of marigold arches, masked dancers and towns that never sleep. We wrote the guide: which towns, which night, and what not to miss."
                  : "Tres noches de arcos de cempasúchil, cuadrillas de danzantes y pueblos que no duermen. Escribimos la guía: qué pueblo, qué noche y qué no perderte."}
              </p>

              <form onSubmit={enviar} noValidate>
                <div className="flex flex-col gap-2.5 sm:flex-row">
                  <label htmlFor="xantolo-correo" className="sr-only">
                    {en ? "Your email" : "Tu correo"}
                  </label>
                  <input
                    id="xantolo-correo"
                    type="email"
                    required
                    autoComplete="email"
                    inputMode="email"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    placeholder={en ? "your@email.com" : "tu@correo.com"}
                    disabled={estado === "enviando"}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? "xantolo-error" : undefined}
                    className="min-w-0 flex-1 px-4 py-3 font-dm text-sm text-crema placeholder:text-crema/35 outline-none transition-colors duration-200 focus:border-crema/60 disabled:opacity-60"
                    style={{
                      backgroundColor: "rgba(244,237,216,.08)",
                      border: "1px solid rgba(244,237,216,.35)",
                      borderRadius: 10,
                      color: CREMA,
                    }}
                  />
                  <button
                    type="submit"
                    disabled={estado === "enviando"}
                    className="shrink-0 px-5 py-3 font-dm text-[11px] font-medium uppercase tracking-[1.6px] transition-opacity duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
                    style={{ backgroundColor: CEMPASUCHIL, color: MORADO, borderRadius: 10 }}
                  >
                    {estado === "enviando"
                      ? en
                        ? "Sending…"
                        : "Enviando…"
                      : en
                        ? "Send me the guide"
                        : "Recibir la guía"}
                  </button>
                </div>

                {error && (
                  <p
                    id="xantolo-error"
                    role="alert"
                    className="mt-2.5 font-dm text-xs leading-relaxed"
                    style={{ color: CEMPASUCHIL }}
                  >
                    {error}
                  </p>
                )}
              </form>

              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
                <Link
                  href={SLUG_GUIA}
                  onClick={cerrar}
                  className="inline-flex items-center gap-1.5 font-dm text-[11px] uppercase tracking-[1.6px] text-crema/55 transition-colors duration-200 hover:text-crema/90"
                >
                  {en ? "I'd rather read it now" : "Prefiero leerla ahora"}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
                <button
                  type="button"
                  onClick={cerrar}
                  className="font-dm text-[11px] uppercase tracking-[1.6px] text-crema/35 transition-colors duration-200 hover:text-crema/70"
                >
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
