"use client";

import Link from "next/link";
import { CONFIRMA_SALIDA_DIAS } from "@/lib/tourBooking";
import { useComparador } from "./ComparadorShell";
import { TrackedLink } from "@/components/TrackedLink";
import { dinero, hrefReservarTour, personasDe, totalTourParaGrupo } from "@/lib/comparador";
import { comparadorUI } from "@/lib/i18n/comparador";
import { getBooking } from "@/lib/i18n/booking";
import { waLink } from "@/lib/whatsapp";
import { trackTourEvent } from "@/lib/tourTracker";
import { trackAddToCart } from "@/lib/analytics";

/**
 * El total de UN recorrido para el grupo puesto arriba, o por qué no se puede
 * dar. El número sale de `totalTourParaGrupo` → `totalRecorrido`, la misma
 * cuenta del carrito y del cobro.
 */
export function CeldaTotalTour({ indice }: { indice: number }) {
  const { tarifas, grupo, locale, nombres } = useComparador();
  const ui = comparadorUI(locale);
  const b = getBooking(locale).carrito;
  const t = tarifas[indice];
  if (!t) return null;
  const r = totalTourParaGrupo(t, grupo);

  if (r.ok) {
    return (
      <div>
        {/* `key` = el total: al cambiar, React monta el nodo de nuevo y el
            "price-bump" avisa que la cifra se movió. */}
        <p key={r.total} className="font-cormorant text-2xl md:text-3xl leading-none text-dorado tabular-nums motion-safe:animate-price-bump">
          {dinero(r.total)} <span className="font-dm text-[11px] text-crema/50 align-middle">MXN</span>
        </p>
        <p className="font-dm text-[11px] text-crema/55 mt-1.5">{r.porGrupo ? ui.total.porGrupo : ui.total.paraTuGrupo}</p>
        {r.viajeroSolo && (
          <p className="font-dm text-[11px] text-crema/60 leading-snug mt-1.5">
            <strong className="font-medium text-crema/80">{b.viajeroSoloTitulo}</strong> {b.viajeroSolo(CONFIRMA_SALIDA_DIAS)}
          </p>
        )}
      </div>
    );
  }

  const mensaje =
    r.motivo === "vehiculo" ? ui.total.vehiculo(dinero(r.desde))
    : r.motivo === "soloAdultos" ? b.soloMayores
    : r.motivo === "edadMinima" ? ui.total.edadMinima(r.edad)
    : r.motivo === "maximo" ? ui.total.maximo(r.maximo)
    : ui.total.minimo(r.minimo);

  // Menos del mínimo o más del máximo: se arma por WhatsApp, y el mensaje ya
  // dice cuántos son y qué recorrido quieren.
  const wa =
    r.motivo === "minimo" ? waLink(b.waGrupoMinimo(personasDe(grupo), nombres[indice]))
    : r.motivo === "maximo" ? waLink(ui.total.waGrande(personasDe(grupo), nombres[indice]))
    : null;

  return (
    <div>
      <p className="font-dm text-sm text-crema/70 leading-snug">{mensaje}</p>
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          data-wa-manual="1"
          onClick={() => trackTourEvent("WHATSAPP_CLICK", { context: "comparador", boton: r.motivo, tour: t.slug })}
          className="inline-flex items-center min-h-[44px] font-dm text-xs text-[#25D366] underline underline-offset-2"
        >
          {r.motivo === "minimo" ? `${b.vanMenos} ${ui.total.escribenos}` : ui.total.escribenos}
        </a>
      )}
    </div>
  );
}

/**
 * Los botones de la columna. "Reservar" solo cuando hay un total que el
 * carrito va a cobrar igual (o en el RZR, que se cotiza ahí mismo); si no,
 * queda la ficha, que explica el recorrido completo.
 */
export function CtaReservarTour({ indice, href }: { indice: number; href: string }) {
  const { tarifas, grupo, locale, nombres, ids } = useComparador();
  const ui = comparadorUI(locale);
  const t = tarifas[indice];
  if (!t) return null;
  const r = totalTourParaGrupo(t, grupo);
  const puede = r.ok || r.motivo === "vehiculo";
  const monto = r.ok ? r.total : t.precio;

  return (
    <div className="flex flex-col gap-2">
      {puede && (
        <Link
          href={hrefReservarTour(t, grupo, locale)}
          onClick={() => {
            // Mismo registro que el módulo de la ficha: entra al embudo como
            // "Inició reserva", con el comparador como fuente.
            trackTourEvent("CHECKOUT_STARTED", {
              tour: ids[indice],
              tour_name: nombres[indice],
              adults: grupo.adultos,
              children: grupo.ninosMid + grupo.ninosSmall,
              amount: monto,
              source: "comparador",
            });
            // Para GA4 es `add_to_cart`: el botón mete el recorrido al carrito
            // con el grupo puesto arriba. En el RZR no hay total para el grupo
            // (va por vehículo): una unidad al precio de arranque.
            trackAddToCart({
              tourId: ids[indice], tourName: nombres[indice], total: monto,
              cantidad: r.ok ? personasDe(grupo) : 1, source: "comparador",
            });
          }}
          className="inline-flex items-center justify-center w-full min-h-[44px] bg-dorado hover:bg-lima text-negro px-4 font-dm text-[11px] tracking-[2px] uppercase font-medium transition-colors"
        >
          {ui.cta.reservar}
        </Link>
      )}
      <TrackedLink
        href={href}
        event="COMPARAR_FICHA"
        data={{ tour: t.slug }}
        className="inline-flex items-center justify-center w-full min-h-[44px] border border-white/15 hover:border-dorado/50 text-crema/80 hover:text-crema px-4 font-dm text-[11px] tracking-[2px] uppercase transition-colors"
      >
        {ui.cta.verFicha}
      </TrackedLink>
    </div>
  );
}
