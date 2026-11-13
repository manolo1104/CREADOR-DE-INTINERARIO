"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { useLocale } from "@/lib/i18n/useLocale";
import { getBooking } from "@/lib/i18n/booking";
import { ID_MODULO_RESERVA } from "@/lib/anclas";
import { textoDiaBoton, useSeleccionFicha } from "@/lib/seleccionFicha";
import { marcarToqueHumano } from "@/lib/toqueHumano";
import { trackTourEvent } from "@/lib/tourTracker";

/**
 * El botón del hero de la ficha (13 nov 2026). Sin elección: «Ver fechas
 * disponibles», que baja al módulo (ahí el calendario ya está abierto). Con
 * fecha elegida en el módulo —o guardada de esta misma pestaña—: «Reservar
 * sábado 14 · 2 personas · $3,100», que lleva al carrito con todo puesto.
 * Los recorridos por vehículo (RZR) no publican elección: siempre bajan.
 */
export function CtaHeroFicha({ slug, tourId, className }: { slug: string; tourId: string; className: string }) {
  const { locale, en, lp } = useLocale();
  const tf = getBooking(locale).ficha;
  const sel = useSeleccionFicha(slug);
  const dinero = (n: number) => `$${n.toLocaleString(en ? "en-US" : "es-MX")}`;

  if (sel?.fecha && !sel.sinLugar && sel.total > 0) {
    const personas = sel.adultos + sel.ninos;
    return (
      <Link
        href={lp(`/reservar/carrito?agregar=${slug}&fecha=${sel.fecha}&adultos=${sel.adultos}&ninosMid=${sel.ninosMid}&ninosSmall=${sel.ninosSmall}`)}
        onClick={() => {
          marcarToqueHumano();
          trackTourEvent("CHECKOUT_STARTED", { tour: tourId, amount: sel.total, fecha: sel.fecha, adults: sel.adultos, children: sel.ninos, source: "ficha_hero" });
        }}
        className={className}
      >
        {tf.reservarCon(textoDiaBoton(sel.fecha, en), personas, dinero(sel.total))}
      </Link>
    );
  }
  return (
    <a href={`#${ID_MODULO_RESERVA}`} className={className}>
      <Lock className="w-3.5 h-3.5" aria-hidden="true" />
      {en ? "See available dates" : "Ver fechas disponibles"}
    </a>
  );
}
