"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { TourCalendar } from "@/components/booking/TourCalendar";
import { calcTourTotal } from "@/lib/tourBooking";
import { useLocale } from "@/lib/i18n/useLocale";
import { getBooking } from "@/lib/i18n/booking";
import { trackBeginCheckout, trackDateSelected, trackParticipants } from "@/lib/analytics";
import { trackTourEvent } from "@/lib/tourTracker";

/**
 * Ancla del módulo. Vive aquí, exportada, para que `MobileBookingBar` no tenga
 * que adivinar la cadena: si un día cambia, cambia en un solo sitio.
 */
export const ID_MODULO_RESERVA = "reservar-este-tour";

/**
 * Elegir fecha y personas SIN salir de la ficha del tour.
 *
 * Hasta ahora el sidebar era un enlace suelto a `/reservar/carrito?agregar=…`:
 * la persona leía la ficha, se convencía, pulsaba "Reservar" y aterrizaba en
 * otra pantalla para recién ahí decidir cuándo va y cuántos son. Cada salto de
 * página cuesta gente, y en el teléfono —tres de cada cuatro visitas— cuesta
 * más. GetYourGuide, Viator y Civitatis ponen fecha, personas y total en la
 * ficha del producto por esta razón.
 *
 * NO cambia dónde se decide: el carrito sigue dejando mover la fecha y las
 * personas —ahí es donde se ven los días juntos, que es lo que `carritoItems`
 * explica—. Lo único que cambia es que llegan ya puestas.
 *
 * Solo para recorridos por persona: el RZR y el café se cobran por vehículo y
 * tienen su propio formulario (`RzrBookingForm`).
 */
export function ReservaFichaTour({
  slug,
  precio,
  groupMin,
  groupMax,
  soloMayores,
  nombre,
  tourId,
}: {
  slug: string;
  precio: number;
  groupMin: number;
  groupMax: number;
  /** Recorridos donde no entran menores (se ocultan los contadores de niños). */
  soloMayores: boolean;
  nombre: string;
  tourId: string;
}) {
  const { locale, lp } = useLocale();
  const t = getBooking(locale).carrito;
  const tf = getBooking(locale).ficha;

  const minAdultos = Math.max(2, groupMin || 1);
  const [fecha, setFecha]           = useState("");
  const [adultos, setAdultos]       = useState(minAdultos);
  const [ninosMid, setNinosMid]     = useState(0);
  const [ninosSmall, setNinosSmall] = useState(0);

  const personas = adultos + ninosMid + ninosSmall;
  const { total } = calcTourTotal(precio, adultos, ninosMid, ninosSmall, 0);

  const dinero = (n: number) => `$${n.toLocaleString(locale === "en" ? "en-US" : "es-MX")}`;

  /** Un contador. Los tres se comportan igual salvo por su mínimo. */
  function Contador({
    etiqueta, valor, set, min,
  }: { etiqueta: string; valor: number; set: (n: number) => void; min: number }) {
    // El tope es del GRUPO, no de cada casilla: seis adultos y tres niños no
    // caben en una salida de máximo ocho por mucho que cada número sea legal.
    const hayHueco = personas < groupMax;
    return (
      <div className="flex items-center justify-between gap-3">
        <span className="font-dm text-[12px] text-crema/60">{etiqueta}</span>
        <span className="flex items-center gap-2">
          <button
            type="button"
            aria-label={t.menos(etiqueta, nombre)}
            onClick={() => set(Math.max(min, valor - 1))}
            disabled={valor <= min}
            className="w-7 h-7 border border-crema/20 text-crema/70 hover:border-verde-vivo disabled:opacity-25 disabled:hover:border-crema/20 text-sm leading-none transition-colors"
          >−</button>
          <span className="font-dm text-[13px] text-crema/85 w-5 text-center tabular-nums">{valor}</span>
          <button
            type="button"
            aria-label={t.mas(etiqueta, nombre)}
            onClick={() => set(valor + 1)}
            disabled={!hayHueco}
            className="w-7 h-7 border border-crema/20 text-crema/70 hover:border-verde-vivo disabled:opacity-25 disabled:hover:border-crema/20 text-sm leading-none transition-colors"
          >+</button>
        </span>
      </div>
    );
  }

  const href = lp(
    `/reservar/carrito?agregar=${slug}` +
    (fecha ? `&fecha=${fecha}` : "") +
    `&adultos=${adultos}&ninosMid=${ninosMid}&ninosSmall=${ninosSmall}`,
  );

  return (
    // El id lo usa la barra inferior del móvil para traer aquí a la persona.
    // En un teléfono la columna lateral se apila DESPUÉS de todo el contenido,
    // así que sin ese salto el módulo quedaba a veinte mil píxeles del hero:
    // existía, pero no para las tres de cada cuatro visitas que son móviles.
    <div id={ID_MODULO_RESERVA} className="border border-white/10 bg-negro/60 p-5 space-y-4">
      <div>
        <p className="text-[9px] tracking-[2px] uppercase text-crema/35 font-dm mb-1.5">{tf.cuandoVas}</p>
        <TourCalendar
          value={fecha}
          onChange={(ymd) => {
            setFecha(ymd);
            trackDateSelected(nombre, ymd);
            trackTourEvent("DATE_SELECTED", { tour: tourId, ficha: true });
          }}
          modo="compact"
          tema="oscuro"
          titulo={nombre}
          permitirLimpiar
        />
      </div>

      <div className="space-y-2.5 border-t border-white/8 pt-4">
        <p className="text-[9px] tracking-[2px] uppercase text-crema/35 font-dm">{tf.cuantosVan}</p>
        <Contador etiqueta={t.adultos} valor={adultos} set={(n) => { setAdultos(n); trackParticipants(nombre, n, ninosMid + ninosSmall); }} min={minAdultos} />
        {!soloMayores && (
          <>
            <Contador etiqueta={t.de6a10}     valor={ninosMid}   set={setNinosMid}   min={0} />
            <Contador etiqueta={t.menoresDe6} valor={ninosSmall} set={setNinosSmall} min={0} />
          </>
        )}
        {personas >= groupMax && (
          <p className="font-dm text-[10px] text-dorado/80 leading-snug">{tf.grupoLleno(groupMax)}</p>
        )}
      </div>

      <div className="border-t border-white/8 pt-4">
        <p className="flex items-baseline justify-between">
          <span className="font-dm text-[12px] text-crema/55">{tf.total}</span>
          <span className="font-cormorant text-dorado text-2xl leading-none">{dinero(total)} MXN</span>
        </p>
        <Link
          href={href}
          onClick={() => {
            trackBeginCheckout({ tourId, tourName: nombre, price: total, source: "widget" });
            trackTourEvent("CHECKOUT_STARTED", { tour: tourId, tour_name: nombre, adults: adultos, children: ninosMid + ninosSmall, amount: total, source: "ficha" });
          }}
          className="flex items-center justify-center gap-2 w-full mt-3 bg-verde-selva hover:bg-verde-vivo text-crema py-4 text-[11px] tracking-[2px] uppercase font-dm font-medium transition-colors"
        >
          <Lock className="w-3.5 h-3.5" aria-hidden="true" />
          {fecha ? tf.reservar(dinero(total)) : tf.continuar}
        </Link>
        <p className="font-dm text-[10px] text-crema/35 mt-2 text-center">{tf.puedesCambiarlo}</p>
      </div>
    </div>
  );
}
