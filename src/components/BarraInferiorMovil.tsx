"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Lock, ShoppingBag } from "lucide-react";
import { useLocale } from "@/lib/i18n/useLocale";
import { getBooking } from "@/lib/i18n/booking";
import { trackCtaClick } from "@/lib/analytics";
import { trackTourEvent } from "@/lib/tourTracker";
import { waLink, WA_MESSAGES } from "@/lib/whatsapp";
import { formatMXN } from "@/lib/tourBooking";
import { rangoPorPersona } from "@/lib/catalogoResumen";
import { conReservarPropio, enPantallaDePago, hayBarraDeTour, sinFlotantes } from "@/lib/barrasFijas";
import { useResumenCarrito } from "@/components/carrito/useResumenCarrito";

/**
 * La ÚNICA barra fija de abajo, en TODOS los tamaños (7 oct 2026).
 *
 * En el inicio, /tours, el blog y los destinos sin tour se encimaban tres
 * cosas: la burbuja de WhatsApp, la píldora «Reservar tour» y la barra del
 * carrito, cada una decidiendo sola. Ahora es una barra con tres caras:
 *
 * - "reservar" (sin carrito): «Tours desde $X p/p · Reservar · WhatsApp».
 * - "carrito" (lleva algo): «Tu viaje: N recorridos · $total · Ver carrito ·
 *   WhatsApp», con la misma cuenta que la barra de escritorio
 *   (`useResumenCarrito`).
 * - "whatsapp": donde la página ya trae su propio «Reservar» (comparador,
 *   landings del paquete Xantolo), solo WhatsApp con un texto corto.
 *
 * Sale justo donde antes salían los flotantes (caras "reservar" y "whatsapp")
 * o la barra del carrito (cara "carrito"); las reglas son las de
 * `lib/barrasFijas.ts`. Nunca en pantallas de pago. /admin y /curso ni la
 * montan (PublicShell).
 *
 * 🔴 El 7 oct por la noche se le quitó el `lg:hidden` y se retiraron
 * `FloatingReservarButton` (la burbuja de WhatsApp y la píldora «Reservar
 * tour») y `carrito/CarritoBar` (la barra de escritorio). Eran tres cosas
 * flotando a la vez en escritorio —z-50, z-50 y z-45, con las dos píldoras
 * subiendo a `bottom-[158px]` cuando había carrito— y la petición de Manolo fue
 * una sola: precio + botón + ícono de WhatsApp. El «Pagas hoy» que daba
 * `CarritoBar` (el anticipo del 30 %) se conservó en la cara de carrito.
 *
 * 🔴 En las FICHAS DE TOUR y en los destinos con tour (`hayBarraDeTour`):
 *  · En el celular no sale: ahí manda `MobileBookingBar`, que reserva ESE tour.
 *  · En escritorio sale con la cara «whatsapp» únicamente. La ficha ya tiene su
 *    módulo de reserva fijo en la barra lateral (`lg:sticky`), así que un
 *    segundo «Reservar» abajo lo duplicaría — pero dejarla fuera del todo
 *    quitaría el único WhatsApp fijo que hay en esa página.
 *
 * En el inicio espera a que el hero salga de la pantalla: ahí ya está su
 * «Reservar tour» y la barra se lo tapaba.
 */

type Cara = "reservar" | "carrito" | "whatsapp";

/** Solo lo que `getBooking` no trae; lo demás sale de ahí, como en la MobileBookingBar. */
const TEXTO = {
  es: {
    toursDesde: "Tours desde",
    porPersona: "MXN p/p",
    // Con hotel en el carrito esta barra no conoce el precio del hospedaje:
    // se dice, en vez de enseñar un total que luego no cuadra (como CarritoBar).
    masHospedaje: "+ hospedaje",
    escribenos: "Escríbenos",
    porWhatsapp: " por WhatsApp",
    comparador: { arriba: "¿Dudas entre dos?", abajo: "Te ayudamos a elegir" },
    xantolo: { arriba: "Xantolo 2026", abajo: "Te armamos el viaje" },
    // La ficha de tour en escritorio: ahí el «Reservar» lo da el módulo de la
    // barra lateral, así que abajo solo queda la pregunta.
    ficha: { arriba: "¿Alguna duda del recorrido?", abajo: "Te contesta la gente que te guía" },
  },
  en: {
    toursDesde: "Tours from",
    porPersona: "MXN pp",
    masHospedaje: "+ lodging",
    escribenos: "Message us",
    porWhatsapp: " on WhatsApp",
    comparador: { arriba: "Torn between two?", abajo: "We'll help you choose" },
    xantolo: { arriba: "Xantolo 2026", abajo: "We'll plan your trip" },
    ficha: { arriba: "Any questions about this tour?", abajo: "The people who guide it answer" },
  },
} as const;

const WA_SVG = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 flex-shrink-0" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

// Los dos botones de texto comparten forma: 44 px de alto (el mínimo de un
// toque cómodo), letra de la MobileBookingBar y el "apretón" de 0.97 al tocar.
const BOTON =
  "flex h-11 flex-shrink-0 items-center justify-center gap-1.5 px-4 font-dm text-[10px] font-medium uppercase tracking-[1.5px] " +
  "transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.97]";
const ANTETITULO = "truncate font-dm text-[9px] uppercase leading-none tracking-[1.5px] text-crema/60";

export function BarraInferiorMovil() {
  const pathname = usePathname();
  const { locale, en, lp } = useLocale();
  const t = getBooking(locale);
  const x = TEXTO[locale];
  const { montado, items, total, pct, anticipo, conHotel } = useResumenCarrito();
  const conCarrito = montado && items.length > 0;

  const esInicio = pathname === "/" || pathname === "/en";
  const [heroFuera, setHeroFuera] = useState(false);

  useEffect(() => {
    if (!esInicio) return;
    // El marcador lo pone app/page.tsx en la <section> del hero.
    const hero = document.querySelector("[data-hero-inicio]");
    // Sin marcador la barra sale desde el principio: mejor tapar un poco el
    // hero que dejar el inicio sin botón de reservar.
    if (!hero) {
      setHeroFuera(true);
      return () => setHeroFuera(false);
    }
    const io = new IntersectionObserver(([e]) => {
      setHeroFuera(!e.isIntersecting && e.boundingClientRect.top < 0);
    });
    io.observe(hero);
    return () => {
      io.disconnect();
      // Al volver al inicio arranca escondida hasta que el observador diga
      // dónde quedó el hero (y no aparece un instante encima de él).
      setHeroFuera(false);
    };
    // `pathname` también: de "/" a "/en" el hero es otro nodo.
  }, [esInicio, pathname]);

  // En una pantalla de pago no hay barra, en ningún tamaño: repetiría lo que ya
  // está en pantalla e invitaría a otra compra justo antes de pagar.
  const cedida = enPantallaDePago(pathname);
  // En la ficha de tour la barra existe SOLO en escritorio, y solo con
  // WhatsApp: en el celular manda `MobileBookingBar` (que reserva ese tour) y
  // en escritorio el módulo lateral ya trae el «Reservar».
  const soloEnEscritorio = !cedida && hayBarraDeTour(pathname);
  const cara: Cara | null = cedida
    ? null
    : soloEnEscritorio
      ? "whatsapp"
      : conCarrito
        ? "carrito"
        : sinFlotantes(pathname)
          ? null
          : conReservarPropio(pathname)
            ? "whatsapp"
            : "reservar";
  // El `lg:hidden` se fue: la barra vale en todos los tamaños. Lo único que
  // sigue siendo por tamaño es la ficha de tour.
  const porTamano = soloEnEscritorio ? "hidden lg:block" : "";
  const visible = cara !== null && (!esInicio || heroFuera);

  // Al esconderse sigue pintando la última cara mientras baja, en vez de
  // quedarse vacía a medio camino.
  const [ultima, setUltima] = useState<Cara>(cara ?? "reservar");
  useEffect(() => {
    if (cara) setUltima(cara);
  }, [cara]);
  const pinta = cara ?? ultima;

  // Entra en 300 ms y sale en 200 (lo que se va, rápido). Si se esconde porque
  // otra barra toma su lugar (ficha de tour, pago), se va sin animación: si no,
  // bajaría 200 ms por encima de la nueva. `invisible` va en la transición:
  // al salir cambia al final, así el deslizamiento se ve, y deja los botones
  // fuera del tabulador y del lector de pantalla.
  const estado = visible
    ? "visible translate-y-0 opacity-100 duration-300"
    : cedida
      ? "invisible translate-y-full opacity-0 duration-0"
      : "invisible translate-y-full opacity-0 duration-200";
  // Escondida no se precarga nada: la precarga de Next mira la geometría, no
  // la visibilidad, y la barra escondida queda pegada al borde de la pantalla.
  const prefetch = visible ? undefined : false;

  // En la guía y en el paquete de Xantolo el mensaje ya dice a qué viene.
  const esXantolo = /xantolo/.test(pathname);
  const waHref = waLink(esXantolo ? WA_MESSAGES.xantolo : WA_MESSAGES.flotante);
  const alWhatsApp = () => {
    trackCtaClick("barra_movil_whatsapp", waHref);
    // Igual que la burbuja de antes: sin esto TrackEvent no se entera (el
    // contador global ignora los enlaces con `data-wa-manual`).
    trackTourEvent("WHATSAPP_CLICK", { context: esXantolo ? "barra_movil_xantolo" : "barra_movil", pagina: pathname });
  };

  // Al motor de reservas, como la píldora de antes. En destinos con tour la
  // píldora llevaba al tour, pero ahí manda la MobileBookingBar y esta barra
  // no sale.
  const hrefReservar = lp("/reservar");
  const hrefCarrito = lp("/reservar/carrito");
  // El precio por persona más bajo, con la promo de hoy: el mismo `precio`
  // que pintan las tarjetas. Fuera el RZR (por vehículo) y el Edén (por grupo).
  const desde = rangoPorPersona().min;
  const dinero = (n: number) => `$${n.toLocaleString(en ? "en-US" : "es-MX")}`;
  // Las tres caras «solo WhatsApp»: Xantolo, la ficha de tour en escritorio y
  // el comparador. Sin la de la ficha, ahí salía el texto del comparador
  // («¿Dudas entre dos?») en una página donde no se compara nada.
  const otra = esXantolo ? x.xantolo : soloEnEscritorio ? x.ficha : x.comparador;

  const whatsappChico = (
    <a
      href={waHref}
      target="_blank"
      rel="noopener noreferrer"
      data-wa-manual="1"
      onClick={alWhatsApp}
      aria-label={t.barra.preguntarWhatsapp}
      // Contorno y no relleno: el dorado es la acción principal y WhatsApp la
      // de al lado. Verde sobre negro da 9:1; el blanco sobre el verde, 2:1.
      className="flex h-11 w-11 flex-shrink-0 items-center justify-center border border-[#25D366]/50 text-[#25D366] transition-[background-color,border-color,transform] duration-150 ease-out active:scale-[0.97] [@media(hover:hover)]:hover:border-[#25D366] [@media(hover:hover)]:hover:bg-[#25D366]/10"
    >
      {WA_SVG}
    </a>
  );

  return (
    <>
      {/* Hueco al final de la página para que la barra no tape el final del
          pie. Mide lo mismo que la barra: borde 1 + 12 arriba + 44 de botón +
          abajo 12 o el área segura del iPhone, la que sea mayor. */}
      {cara && (
        <div
          aria-hidden="true"
          className={`${porTamano} h-[calc(57px+max(0.75rem,env(safe-area-inset-bottom)))]`}
        />
      )}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t ${
          pinta === "carrito" ? "border-dorado/30" : "border-white/10"
        } bg-negro/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm transition-[transform,opacity,visibility] ease-smooth-out motion-reduce:transition-none ${porTamano} ${estado}`}
      >
        <div className="mx-auto flex max-w-3xl items-center gap-2.5">
          {pinta === "carrito" ? (
            <>
              <div className="min-w-0 flex-1">
                <p className={ANTETITULO}>
                  {/* «Tu viaje ·» solo donde cabe: a 360 px empujaba el
                      número de recorridos fuera de la barra. */}
                  <span className="hidden min-[375px]:inline">{t.carrito.tuViaje} · </span>
                  {t.barra.recorridos(items.length)}
                </p>
                <p className="mt-1.5 truncate font-cormorant text-xl leading-none text-dorado">
                  {formatMXN(total)}
                  <span className="ml-1 font-dm text-[10px] text-crema/60">{conHotel ? x.masHospedaje : "MXN"}</span>
                  {/* El «Pagas hoy» que daba la barra de escritorio. Desde
                      `sm` para arriba, donde cabe sin empujar el botón fuera
                      de la barra. Con hotel no se dice una cifra: esta barra
                      ve los recorridos pero no la cotización del hospedaje, y
                      daría un número menor que el del carrito. */}
                  {!conHotel && (
                    <span className="ml-2 hidden font-dm text-[10px] text-crema/45 sm:inline">
                      {t.barra.apartasCon(formatMXN(anticipo), pct)}
                    </span>
                  )}
                </p>
              </div>
              <Link
                href={hrefCarrito}
                prefetch={prefetch}
                onClick={() => trackCtaClick("barra_movil_carrito", hrefCarrito)}
                className={`${BOTON} bg-dorado text-negro [@media(hover:hover)]:hover:bg-lima`}
              >
                <ShoppingBag className="hidden h-3.5 w-3.5 min-[420px]:block" aria-hidden="true" />
                {t.barra.verCarrito}
              </Link>
              {whatsappChico}
            </>
          ) : pinta === "whatsapp" ? (
            <>
              <div className="min-w-0 flex-1">
                <p className={ANTETITULO}>{otra.arriba}</p>
                <p className="mt-1.5 truncate font-dm text-[13px] leading-tight text-crema/90">{otra.abajo}</p>
              </div>
              {/* Aquí WhatsApp es LA acción: relleno verde y texto negro (9:1). */}
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                data-wa-manual="1"
                onClick={alWhatsApp}
                className={`${BOTON} bg-[#25D366] text-negro [@media(hover:hover)]:hover:bg-[#1ebe5b]`}
              >
                {WA_SVG}
                {x.escribenos}
                <span className="sr-only">{x.porWhatsapp}</span>
              </a>
            </>
          ) : (
            <>
              <div className="min-w-0 flex-1">
                <p className={ANTETITULO}>{x.toursDesde}</p>
                <p className="mt-1.5 truncate font-cormorant text-xl leading-none text-dorado">
                  {dinero(desde)}
                  <span className="ml-1 font-dm text-[10px] text-crema/60">{x.porPersona}</span>
                </p>
              </div>
              <Link
                href={hrefReservar}
                prefetch={prefetch}
                aria-label={t.catalogo.reservarTourFlotante}
                onClick={() => trackCtaClick("barra_movil_reservar", hrefReservar)}
                className={`${BOTON} bg-dorado text-negro [@media(hover:hover)]:hover:bg-terracota [@media(hover:hover)]:hover:text-crema`}
              >
                <Lock className="hidden h-3.5 w-3.5 min-[360px]:block" aria-hidden="true" />
                {t.catalogo.reservar}
              </Link>
              {whatsappChico}
            </>
          )}
        </div>
      </div>
    </>
  );
}
