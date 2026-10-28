"use client";

import Link from "next/link";
import { Lock, ShoppingBag } from "lucide-react";
import { trackAddToCart } from "@/lib/analytics";
import { trackTourEvent } from "@/lib/tourTracker";
import { useCarritoSlugs } from "@/components/carrito/useCarritoSlugs";
import { useLocale } from "@/lib/i18n/useLocale";
import { getBooking } from "@/lib/i18n/booking";
import { ID_MODULO_RESERVA, abrirCalendario } from "@/lib/anclas";
import { useSeleccionFicha } from "@/lib/seleccionFicha";
import { WA_MESSAGES, waLink } from "@/lib/whatsapp";
import { marcarToqueHumano } from "@/lib/toqueHumano";
import { pctACobrar } from "@/lib/carrito";

interface Props {
  tourSlug: string;
  precio:   number;
  tourId?:  string;
  tourName?: string;
  /**
   * "vehiculo" = precio por vehículo; se reserva por WhatsApp (waHref) en vez
   * del flujo online. "grupo" = una sola tarifa por todos los que van, así que
   * la barra NO puede decir "por persona" debajo de la cifra.
   */
  precioUnidad?: "persona" | "vehiculo" | "grupo";
  waHref?:  string;
  /** De dónde sale la barra, para poder medir aparte la de tours y la de destinos. */
  source?:  "mobile_bar" | "destino_bar";
  /** La ficha trae módulo de reserva (fecha + personas): el botón baja a él en vez de saltar al carrito. */
  conModulo?: boolean;
  /**
   * El nombre del recorrido, a la vista. En la ficha del tour sobra (es la
   * página entera), pero en un DESTINO la barra vende un tour que no se llama
   * como la página —y en 23 destinos, uno que ni siquiera lo visita—: sin el
   * nombre, «Desde $1,450 · Agregar» en Sótano de las Golondrinas metía la
   * Expedición Tamul al carrito sin decirlo.
   */
  etiqueta?: string;
}

export function MobileBookingBar({ tourSlug, precio, tourId, tourName, precioUnidad, waHref, source = "mobile_bar", conModulo = false, etiqueta }: Props) {
  const esVehiculo = precioUnidad === "vehiculo";
  const esGrupo    = precioUnidad === "grupo";
  const { locale, en, lp } = useLocale();
  const t = getBooking(locale).barra;
  const tf = getBooking(locale).ficha;
  // Lo que la persona ya eligió en el módulo de la ficha (fecha, personas,
  // total): el WhatsApp va con esos datos y el botón ya sabe si hay fecha.
  const sel = useSeleccionFicha(tourSlug);
  const waHrefFinal = sel && waHref && !esVehiculo
    ? waLink(WA_MESSAGES.tourConFecha(en ? "en" : "es", tourName ?? tourSlug, sel.fecha, sel.adultos, sel.ninos, sel.total))
    : waHref;
  const hrefConSeleccion = sel && sel.fecha
    ? lp(`/reservar/carrito?agregar=${tourSlug}&fecha=${sel.fecha}&adultos=${sel.adultos}&ninosMid=${sel.ninosMid}&ninosSmall=${sel.ninosSmall}`)
    : null;
  const hoy = sel ? Math.round((sel.total * pctACobrar()) / 100) : 0;
  const dinero = (n: number) => `$${n.toLocaleString(en ? "en-US" : "es-MX")}`;
  // Esta barra es la ÚNICA de abajo en las fichas de tour EN EL CELULAR:
  // `BarraInferiorMovil` se aparta aquí (ver `lib/barrasFijas.ts`) porque las
  // dos vivían en `bottom-0` y se tapaban. Así que si el visitante ya lleva
  // recorridos, el acceso al carrito tiene que estar aquí dentro o se pierde.
  const enCarrito = useCarritoSlugs();
  const yaEnCarrito = enCarrito.has(tourSlug);
  const llevaAlgo = enCarrito.size > 0;
  // «Agregar» mete el recorrido al carrito: en GA4 es `add_to_cart` (el
  // `begin_checkout` lo manda el carrito al abrirse). Aquí todavía no hay
  // personas elegidas, así que va UNA unidad al precio de la barra: la misma
  // cifra que lleva el evento interno.
  const track = () => {
    trackAddToCart({ tourId: tourId ?? tourSlug, tourName: tourName ?? tourSlug, total: precio, cantidad: 1, source });
    trackTourEvent("CHECKOUT_STARTED", { tour: tourId ?? tourSlug, tour_name: tourName ?? tourSlug, amount: precio, source });
  };
  const trackWa = () => {
    trackTourEvent("WHATSAPP_CLICK", { tour: tourId ?? tourSlug, tour_name: tourName ?? tourSlug, amount: sel?.total ?? precio, fecha: sel?.fecha || undefined, personas: sel ? sel.adultos + sel.ninos : undefined, context: source, boton: "barra_movil" });
  };
  const ctaClass = "flex items-center gap-2 bg-verde-selva hover:bg-verde-vivo text-crema px-5 py-3 text-[11px] tracking-[2px] uppercase font-dm transition-colors font-medium flex-shrink-0";

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-negro/95 backdrop-blur-sm px-4 py-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        {etiqueta && <p className="font-dm text-[12px] text-crema/80 leading-tight truncate mb-0.5">{etiqueta}</p>}
        <p className="text-[9px] tracking-[2px] uppercase text-crema/40 font-dm">{t.desde}</p>
        <p className="font-cormorant text-dorado text-xl leading-none">
          ${precio.toLocaleString(en ? "en-US" : "es-MX")}
          <span className="font-dm text-[10px] text-crema/40 ml-1 font-normal">
            {esVehiculo ? t.mxnVehiculo : esGrupo ? t.mxnGrupo : t.mxnPersona}
          </span>
        </p>
      </div>
      {waHref && (
        <a
          href={waHrefFinal}
          target="_blank"
          rel="noopener noreferrer"
          data-wa-manual="1"
          data-fecha={sel?.fecha || undefined}
          data-personas={sel ? sel.adultos + sel.ninos : undefined}
          onClick={trackWa}
          aria-label={t.preguntarWhatsapp}
          className="flex items-center justify-center w-11 h-11 bg-[#25D366] text-white flex-shrink-0 hover:brightness-110 transition-all"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </a>
      )}
      {/* El acceso al carrito, solo cuando lleva algo y este tour NO es el que
          lleva (si no, sería el mismo destino dos veces, uno al lado del otro). */}
      {llevaAlgo && !yaEnCarrito && (
        <Link
          href={lp("/reservar/carrito")}
          aria-label={t.verTuCarrito(enCarrito.size)}
          className="flex items-center justify-center gap-1.5 w-11 h-11 border border-dorado/50 text-dorado flex-shrink-0 hover:bg-dorado/10 transition-colors"
        >
          <ShoppingBag className="w-4 h-4" aria-hidden="true" />
          <span className="font-dm text-[11px] leading-none">{enCarrito.size}</span>
        </Link>
      )}
      {yaEnCarrito ? (
        <Link href={lp("/reservar/carrito")} className={ctaClass}>
          <ShoppingBag className="w-3.5 h-3.5" aria-hidden="true" />
          {t.enTuCarrito}
        </Link>
      ) : conModulo ? (
        /* Con módulo de reserva en la ficha, mandar al carrito era saltarse la
           pantalla donde la persona ya está convencida para preguntarle lo
           mismo en otra. Aquí se le baja al módulo y elige ahí; el carrito
           llega con fecha y personas puestas. */
        hrefConSeleccion && !sel?.sinLugar ? (
          /* Ya eligió fecha en el módulo: la barra reserva con esa selección,
             sin volver a bajar. */
          <Link
            href={hrefConSeleccion}
            onClick={() => {
              marcarToqueHumano();
              trackAddToCart({ tourId: tourId ?? tourSlug, tourName: tourName ?? tourSlug, total: sel!.total, cantidad: sel!.adultos + sel!.ninos, source });
              trackTourEvent("CHECKOUT_STARTED", { tour: tourId ?? tourSlug, tour_name: tourName ?? tourSlug, amount: sel!.total, adults: sel!.adultos, children: sel!.ninos, fecha: sel!.fecha, source });
            }}
            className={ctaClass}
          >
            {tf.reservarHoy(dinero(hoy))}
          </Link>
        ) : (
        <button
          type="button"
          onClick={() => {
            // Bajar al módulo NO es empezar la reserva: el `add_to_cart` lo
            // manda el botón del módulo cuando sí se va al carrito. Antes este
            // toque lo mandaba también y en celular cada reserva contaba doble.
            trackTourEvent("BARRA_A_MODULO", { tour: tourId ?? tourSlug, source });
            document.getElementById(ID_MODULO_RESERVA)?.scrollIntoView({ behavior: "smooth", block: "center" });
            // Y abre el calendario: bajar a un botón cerrado no servía de nada
            // (Clarity, 8–28 oct). Después del desplazamiento, para que la hoja
            // no se abra encima de la mitad del camino.
            window.setTimeout(() => abrirCalendario(tourSlug), 450);
          }}
          className={ctaClass}
        >
          <Lock className="w-3.5 h-3.5" aria-hidden="true" />
          {sel?.sinLugar ? tf.sinLugarEligeOtra : t.elegirFecha}
        </button>
        )
      ) : (
        <Link href={lp(`/reservar/carrito?agregar=${tourSlug}`)} onClick={track} className={ctaClass}>
          <Lock className="w-3.5 h-3.5" aria-hidden="true" />
          {t.agregar}
        </Link>
      )}
    </div>
  );
}
