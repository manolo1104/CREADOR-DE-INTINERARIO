"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TourCalendar } from "@/components/booking/TourCalendar";
import { minBookingDate } from "@/lib/tourBooking";
import { TOURS_DB, salidaCorta, recogidaDeTour } from "@/lib/tours";
import { computeVehiculoCharge } from "@/lib/tourPricing";
import { agregarAlCarrito, pctACobrar } from "@/lib/carrito";
import { itemDesdeTour } from "@/lib/carritoItems";
import { useLocale } from "@/lib/i18n/useLocale";
import { getBooking } from "@/lib/i18n/booking";
import { trackAddToCart, trackDateSelected } from "@/lib/analytics";
import { trackTourEvent } from "@/lib/tourTracker";
import { ID_MODULO_RESERVA, abrirCalendario } from "@/lib/anclas";
import { marcarToqueHumano } from "@/lib/toqueHumano";

/**
 * Fecha, ruta, vehículo y unidades del RZR DENTRO de la ficha (10 nov 2026).
 * Es el hermano de `ReservaFichaTour` para los recorridos que se cobran por
 * vehículo.
 *
 * Por qué: hasta ahora el botón de la ficha del RZR mandaba al carrito SIN
 * nada (`/reservar/carrito?agregar=rzr-xilitla`): ahí entraba con la primera
 * ruta y el primer vehículo, y la persona tenía que descubrir que el precio
 * dependía de dos menús. En Clarity (29 oct–10 nov) el RZR fue el 2.º tour
 * más visto y las 3 personas que llegaron así al carrito se fueron moviendo
 * ruta y vehículo. Ahora deciden aquí, viendo el precio de cada combinación, y
 * el carrito abre con todo puesto.
 *
 * El renglón se escribe con `agregarAlCarrito` (como `BotonAgregarTour`) y no
 * por la URL: el carrito solo lee `fecha` y personas de la URL, no ruta ni
 * vehículo. El total es para pintar; el que se cobra lo recalcula el servidor
 * con `computeVehiculoCharge`, la misma función que se usa aquí.
 *
 * Selectores nativos y no tarjetas, a propósito: el módulo vive en el bloque
 * FIJO del sidebar, que tiene que caber en la pantalla de una laptop. Seis
 * vehículos en tarjetas lo hacían más alto que la ventana y el botón quedaba
 * fuera de alcance. Las fotos y la tabla completa ya están en la ficha.
 *
 * (Antes este archivo era un formulario de página completa con fondo blanco
 * que ya no usaba nadie.)
 */
export function RzrBookingForm({
  slug,
  nombre,
  tourId,
  rutasTexto,
  flotaTexto,
}: {
  slug: string;
  nombre: string;
  tourId: string;
  /**
   * Lo que se LEE de cada ruta y vehículo, ya traducido (`localizeTour`, en el
   * mismo orden que el catálogo). El VALOR sigue siendo el nombre en español:
   * es el que entienden el carrito y `computeVehiculoCharge`.
   */
  rutasTexto?: string[];
  flotaTexto?: { nombre: string; capacidad: string }[];
}) {
  const router = useRouter();
  const { locale, lp } = useLocale();
  const t = getBooking(locale).carrito;
  const tf = getBooking(locale).ficha;

  const tour = TOURS_DB.find((x) => x.slug === slug);
  const rutas = tour?.rutas ?? [];
  const flota = tour?.flota ?? [];

  const [fecha, setFecha]       = useState("");
  const [ruta, setRuta]         = useState(rutas[0]?.nombre ?? "");
  const [vehiculo, setVehiculo] = useState(flota[0]?.nombre ?? "");
  const [unidades, setUnidades] = useState(1);
  const [sinLugar, setSinLugar] = useState(false);

  // La fecha que trae el buscador del inicio (`?fecha=`), igual que el módulo
  // por persona (13 nov 2026): antes el RZR la ignoraba y había que elegirla
  // otra vez. Se valida y se limpia de la barra.
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      const f = q.get("fecha");
      if (!f) return;
      if (/^\d{4}-\d{2}-\d{2}$/.test(f) && f >= minBookingDate()) setFecha(f);
      q.delete("fecha");
      q.delete("adultos");
      const resto = q.toString();
      window.history.replaceState(null, "", window.location.pathname + (resto ? `?${resto}` : "") + window.location.hash);
    } catch { /* sin query, como siempre */ }
  }, []);

  // «Ver fechas disponibles» (arriba) y «Reservar» (menú) son anclas a este
  // módulo: sin fecha, además se abre el calendario. Igual que en
  // `ReservaFichaTour`.
  useEffect(() => {
    const alClic = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.(`a[href$="#${ID_MODULO_RESERVA}"]`);
      if (!a || fecha) return;
      window.setTimeout(() => abrirCalendario(slug), 450);
    };
    document.addEventListener("click", alClic);
    return () => document.removeEventListener("click", alClic);
  }, [slug, fecha]);

  if (!tour || !rutas.length || !flota.length) return null;

  const idxRuta = rutas.findIndex((r) => r.nombre === ruta);
  const cargo = computeVehiculoCharge({ tourSlug: slug, ruta, vehiculo, unidades, pct: 100 });
  const total = cargo?.total ?? 0;
  const hoy   = Math.round((total * pctACobrar()) / 100);
  const resto = total - hoy;

  const dinero = (n: number) => `$${n.toLocaleString(locale === "en" ? "en-US" : "es-MX")}`;
  const hora = salidaCorta(tour, locale === "en");
  const esHorario = !!recogidaDeTour(tour).horaTexto;

  function continuar() {
    if (!fecha || sinLugar || !cargo || !tour) return;
    marcarToqueHumano();
    // Los campos comunes salen de `itemDesdeTour` (una sola definición de cómo
    // nace un renglón); aquí solo se encima lo que la persona ya eligió.
    agregarAlCarrito(itemDesdeTour(tour, { tourDate: fecha, ruta, vehiculo, unidades, total }));
    trackAddToCart({ tourId, tourName: nombre, total, cantidad: unidades, source: "widget" });
    trackTourEvent("CHECKOUT_STARTED", { tour: tourId, tour_name: nombre, amount: total, fecha, ruta, vehiculo, unidades, source: "ficha_vehiculo" });
    router.push(lp("/reservar/carrito"));
  }

  const ETIQUETA = "text-[9px] tracking-[2px] uppercase text-crema/35 font-dm";
  const SELECT = "w-full border border-crema/20 bg-negro/80 px-3 py-2.5 font-dm text-[12px] text-crema/85 focus:border-verde-vivo focus:outline-none";
  const BOTON_RESERVAR = "flex items-center justify-center gap-2 w-full mt-3 bg-verde-selva hover:bg-verde-vivo text-crema py-4 text-[11px] tracking-[2px] uppercase font-dm font-medium transition-colors";

  return (
    <div id={ID_MODULO_RESERVA} className="border border-white/10 bg-negro/60 p-5 space-y-4">
      <div>
        <p className={`${ETIQUETA} mb-1.5`}>{tf.cuandoVas}</p>
        <TourCalendar
          value={fecha}
          onChange={(ymd) => {
            setFecha(ymd);
            if (ymd) {
              trackDateSelected(nombre, ymd);
              trackTourEvent("DATE_SELECTED", { tour: tourId, ficha: true });
            }
          }}
          // A la vista, como en los demás recorridos (13 nov 2026).
          modo="abierto"
          tema="oscuro"
          titulo={nombre}
          permitirLimpiar
          salida={esHorario ? null : hora}
          horario={esHorario ? hora : null}
          // Con slug el calendario pinta los días cerrados y lo abren «Ver
          // fechas disponibles» y la barra del celular. El RZR no lleva cupo
          // por fecha (`cupoDeTour` → null), así que el resto sale libre.
          slug={slug}
          personas={1}
          onSinLugar={setSinLugar}
          hojaVidrio
        />
      </div>

      <div className="space-y-3 border-t border-white/8 pt-4">
        <label className="block">
          <span className={`${ETIQUETA} block mb-1.5`}>{tf.queRuta}</span>
          <select value={ruta} onChange={(e) => setRuta(e.target.value)} className={SELECT}>
            {rutas.map((r, i) => (
              <option key={r.nombre} value={r.nombre}>{rutasTexto?.[i] ?? r.nombre} · {tf.horas(r.duracion_hrs)}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={`${ETIQUETA} block mb-1.5`}>{tf.queVehiculo}</span>
          {/* Cada vehículo con su precio EN LA RUTA ELEGIDA: es justo lo que
              la gente buscaba moviendo los menús del carrito. */}
          <select value={vehiculo} onChange={(e) => setVehiculo(e.target.value)} className={SELECT}>
            {flota.map((v, i) => (
              <option key={v.nombre} value={v.nombre}>
                {/* En inglés con «MXN»: «$1,600» a secas se lee en dólares. */}
                {flotaTexto?.[i]?.nombre ?? v.nombre} · {flotaTexto?.[i]?.capacidad ?? v.capacidad} · {dinero(v.precios[idxRuta] ?? 0)}{locale === "en" ? " MXN" : ""}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center justify-between gap-3">
          <span className="font-dm text-[12px] text-crema/60">{tf.cuantosVehiculos}</span>
          <span className="flex items-center gap-2">
            <button
              type="button"
              aria-label={t.menos(tf.cuantosVehiculos, nombre)}
              onClick={() => setUnidades((n) => Math.max(1, n - 1))}
              disabled={unidades <= 1}
              className="w-7 h-7 border border-crema/20 text-crema/70 hover:border-verde-vivo disabled:opacity-25 disabled:hover:border-crema/20 text-sm leading-none transition-colors"
            >−</button>
            <span className="font-dm text-[13px] text-crema/85 w-5 text-center tabular-nums">{unidades}</span>
            <button
              type="button"
              aria-label={t.mas(tf.cuantosVehiculos, nombre)}
              onClick={() => setUnidades((n) => Math.min(10, n + 1))}
              disabled={unidades >= 10}
              className="w-7 h-7 border border-crema/20 text-crema/70 hover:border-verde-vivo disabled:opacity-25 disabled:hover:border-crema/20 text-sm leading-none transition-colors"
            >+</button>
          </span>
        </div>
      </div>

      <div className="border-t border-white/8 pt-4">
        <p className="flex items-baseline justify-between">
          <span className="font-dm text-[12px] text-crema/55">{tf.total}</span>
          <span className="font-cormorant text-dorado text-2xl leading-none">{dinero(total)} MXN</span>
        </p>
        <p className="font-dm text-[10px] text-crema/40 mt-1">{tf.porVehiculo(unidades)}</p>
        {fecha && !sinLugar ? (
          <button type="button" onClick={continuar} className={BOTON_RESERVAR}>
            {tf.reservarHoy(dinero(hoy))}
          </button>
        ) : (
          <button type="button" onClick={() => abrirCalendario(slug)} className={BOTON_RESERVAR}>
            {sinLugar ? tf.sinLugarEligeOtra : tf.continuar}
          </button>
        )}
        {total > 0 && (
          <p className="font-dm text-[11px] text-crema/60 mt-2 text-center">
            {tf.restoElDia(pctACobrar(), dinero(resto))}
          </p>
        )}
        <p className="font-dm text-[10px] text-crema/35 mt-1 text-center">{tf.pasoUnoDeTres}</p>
      </div>
    </div>
  );
}
