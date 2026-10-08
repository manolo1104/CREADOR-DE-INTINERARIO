import { BadgeCheck, Banknote, Hotel, MessageCircle, Wallet, type LucideIcon } from "lucide-react";
import { ANTICIPO_PCT } from "@/lib/carrito";
import { HOTEL_PROPIO } from "@/lib/hotelPropio";
import type { Locale } from "@/lib/i18n/config";

/**
 * «Reserva directo con nosotros»: lo que cambia cuando la reserva es aquí
 * (acción 9 de la auditoría externa, 7 oct 2026). Va en las fichas de tour y
 * una vez en el inicio.
 *
 * Solo diferencias CIERTAS y nuestras. Nada de cómo cobran o tratan las
 * plataformas (Viator, GetYourGuide) ni «más barato»: ahí irá el MISMO precio
 * que aquí. Tampoco cifras de reseñas, que tienen su fuente en `resenas.ts`.
 *  - El anticipo sale de `ANTICIPO_PCT`, el mismo número que cobra el servidor.
 *  - Los metros a Las Pozas, de `hotelPropio.ts`.
 *
 * `guiasPropios`: en la ficha se apaga donde el `incluye` del recorrido no
 * trae un guía NOM-09. Ahí guía alguien con otra certificación (rafting,
 * rappel, el instructor PADI del buceo, el del RZR) o gente del lugar (el guía
 * del jardín en el Edén, la finca en el Café): prometer «guías propios NOM-09»
 * o «te contesta la gente que te guía» sería falso.
 */
type Punto = { Icon: LucideIcon; titulo: string; sub: string };

function puntosDe(en: boolean, guiasPropios: boolean): Punto[] {
  // Espacios duros: «30 / %», «400 / m» o «Las / Pozas» partidos en dos renglones se leen mal.
  const pct = en ? `${ANTICIPO_PCT}%` : `${ANTICIPO_PCT} %`;
  const metros = `${HOTEL_PROPIO.metrosALasPozas} m`;
  const lasPozas = "Las Pozas";
  const puntos: (Punto | null)[] = [
    {
      Icon: Wallet,
      titulo: en ? `Hold your spot with ${pct}` : `Apartas con el ${pct}`,
      sub: en ? "Pay the rest on the day of the tour." : "El resto lo pagas el día del tour.",
    },
    {
      Icon: Banknote,
      titulo: en ? "Pay us directly, in pesos" : "Pagas directo y en pesos",
      sub: en ? "No middlemen: by card or bank transfer." : "Sin intermediarios: con tarjeta o transferencia.",
    },
    {
      Icon: MessageCircle,
      titulo: en ? "WhatsApp the same team" : "WhatsApp con tu mismo equipo",
      sub: guiasPropios
        ? (en ? "The people who guide you answer." : "Te contesta la gente que te guía.")
        : (en ? "The people who run your tour answer." : "Te contesta la gente que organiza tu recorrido."),
    },
    guiasPropios
      ? {
          Icon: BadgeCheck,
          titulo: en ? "Our own NOM-09 guides" : "Guías propios NOM-09",
          sub: en ? "Certified by SECTUR, Mexico's tourism ministry." : "Certificados por la SECTUR.",
        }
      : null,
    {
      Icon: Hotel,
      titulo: en ? "Our own hotel and restaurant" : "Hotel y restaurante propios",
      sub: en ? `In Xilitla, ${metros} from ${lasPozas}.` : `En Xilitla, a ${metros} de ${lasPozas}.`,
    },
  ];
  return puntos.filter((p): p is Punto => p !== null);
}

export function ReservaDirecto({
  locale,
  donde,
  guiasPropios = true,
}: {
  locale: Locale;
  /** "ficha": columna de la ficha de tour, fondo oscuro. "inicio": banda a lo ancho, fondo claro. */
  donde: "ficha" | "inicio";
  guiasPropios?: boolean;
}) {
  const en = locale === "en";
  const puntos = puntosDe(en, guiasPropios);
  const titulo = en ? "Book direct with us" : "Reserva directo con nosotros";

  if (donde === "ficha") {
    return (
      <section aria-labelledby="reserva-directo">
        <h2 id="reserva-directo" className="mb-2 font-cormorant text-2xl text-crema">{titulo}</h2>
        <p className="mb-5 font-dm text-sm text-crema/55">
          {en
            ? "You deal with the people who take you, from booking to the tour itself."
            : "Tratas con quien te lleva, de la reserva al recorrido."}
        </p>
        <ul className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          {puntos.map(({ Icon, titulo: t, sub }) => (
            <li key={t} className="flex items-start gap-3">
              <Icon className="mt-0.5 h-5 w-5 flex-shrink-0 text-verde-vivo" aria-hidden="true" />
              <div>
                <p className="font-dm text-sm text-crema/85">{t}</p>
                <p className="mt-0.5 font-dm text-xs leading-relaxed text-crema/55">{sub}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section aria-labelledby="reserva-directo" className="border-t border-negro/10 bg-arena/30 px-6 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 text-center">
          <p className="reveal-fade mb-3 font-dm text-[10px] uppercase tracking-[4px] text-verde-selva">
            {en ? "No middlemen" : "Sin intermediarios"}
          </p>
          <h2
            id="reserva-directo"
            className="reveal-up font-cormorant font-light leading-tight text-verde-profundo"
            style={{ fontSize: "clamp(30px,4vw,44px)" }}
          >
            {titulo}
          </h2>
        </div>
        {/* En teléfono, renglones (icono a la izquierda); en escritorio, cinco
            columnas con el icono arriba. */}
        <ul className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-5">
          {puntos.map(({ Icon, titulo: t, sub }) => (
            <li key={t} className="flex items-start gap-3.5 lg:flex-col lg:items-center lg:gap-3 lg:text-center">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-verde-selva/10 text-verde-selva">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-dm text-sm font-medium text-negro/80">{t}</p>
                <p className="mt-1 font-dm text-xs leading-relaxed text-negro/60">{sub}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
