"use client";

import { MapPin } from "lucide-react";
import { TOURS_DB, recogidaDeTour, cargoVallesDe } from "@/lib/tours";
import { localizeTour } from "@/lib/i18n/localize";
import type { ZonaHospedaje } from "@/lib/tourPricing";
import { useCarritoSlugs } from "@/components/carrito/useCarritoSlugs";
import { useLocale } from "@/lib/i18n/useLocale";

/**
 * La pregunta de dónde pasamos por el cliente, en el carrito y en el checkout.
 *
 * Pedido de Manolo (7 oct 2026): «dale más importancia y pregunta a dónde
 * pasamos por ti: tu hospedaje en Xilitla o Ciudad Valles». Antes era un
 * renglón más con el texto gris «¿Dónde te hospedas? (hotel y ciudad)» entre el
 * correo y el WhatsApp, y es justo el dato que el equipo necesita para la
 * logística del día: sin él hay que perseguir al cliente por WhatsApp.
 *
 * 🔴 La ayuda depende de lo que lleva el carrito, no se escribe fija: no todos
 * los recorridos recogen en los dos pueblos (`recogida` en tours.ts). La Gruta
 * de Xilo y el Edén pasan SOLO por Xilitla, y el RZR y el buceo no pasan por
 * nadie (nos vemos en la base o en el sitio). Prometer «Xilitla o Ciudad
 * Valles» a quien solo lleva la Gruta es prometer una recogida que no existe.
 *
 * Sigue siendo opcional: quien aún no reservó hotel no debe quedarse sin poder
 * pagar. Vacío, el equipo se lo pregunta por WhatsApp antes del tour.
 */
type Modo = "xilitla-o-valles" | "mixto" | "solo-xilitla" | "sin-recogida";

function modoDelCarrito(slugs: Set<string>): Modo {
  const tipos = Array.from(slugs)
    .map((s) => TOURS_DB.find((t) => t.slug === s))
    .filter((t): t is (typeof TOURS_DB)[number] => !!t)
    .map((t) => recogidaDeTour(t).tipo);
  // Sin tours todavía (el carrito aún no carga): la pregunta de siempre.
  if (!tipos.length) return "xilitla-o-valles";
  const enValles = tipos.includes("hospedaje");
  const soloXilitla = tipos.includes("hospedaje-xilitla");
  if (enValles && soloXilitla) return "mixto";
  if (enValles) return "xilitla-o-valles";
  if (soloXilitla) return "solo-xilitla";
  return "sin-recogida";
}

const TEXTOS = {
  es: {
    titulo: "¿A dónde pasamos por ti?",
    tituloSinRecogida: "¿Dónde te hospedas?",
    ayuda: {
      "xilitla-o-valles": "Tu hospedaje en Xilitla o Ciudad Valles.",
      mixto: "Tu hospedaje en Xilitla o Ciudad Valles. Algunos de tus recorridos recogen solo en Xilitla: lo ves en cada uno.",
      "solo-xilitla": "Tu hospedaje en Xilitla: tus recorridos recogen solo allá.",
      "sin-recogida": "Tus recorridos empiezan en el punto de encuentro; tu hospedaje nos sirve por si hay cambios.",
    } as Record<Modo, string>,
    placeholder: "Nombre del hotel y ciudad",
    vacio: "¿Aún no lo sabes? Déjalo vacío: te lo preguntamos por WhatsApp antes del tour.",
    zonaGrupo: "¿Dónde te hospedas?",
    incluido: "Traslado incluido",
    masTraslado: (m: string) => `+${m} de traslado`,
    soloEste: (tours: string, m: string, hayOtros: boolean) =>
      `Desde Ciudad Valles, ${tours} cobra ${m} de traslado (por reserva, no por persona).${hayOtros ? " Tus demás recorridos pasan por ti sin costo extra." : ""}`,
    eligeZona: "Elige Xilitla o Ciudad Valles para continuar.",
  },
  en: {
    titulo: "Where should we pick you up?",
    tituloSinRecogida: "Where are you staying?",
    ayuda: {
      "xilitla-o-valles": "Your lodging in Xilitla or Ciudad Valles.",
      mixto: "Your lodging in Xilitla or Ciudad Valles. Some of your tours pick up in Xilitla only — each one says so.",
      "solo-xilitla": "Your lodging in Xilitla: your tours pick up there only.",
      "sin-recogida": "Your tours start at the meeting point; your lodging helps us if plans change.",
    } as Record<Modo, string>,
    placeholder: "Hotel name and town",
    vacio: "Not sure yet? Leave it blank — we'll ask you on WhatsApp before the tour.",
    zonaGrupo: "Where are you staying?",
    incluido: "Transport included",
    masTraslado: (m: string) => `+${m} transport`,
    soloEste: (tours: string, m: string, hayOtros: boolean) =>
      `From Ciudad Valles, the ${tours} adds ${m} for transport (per booking, not per person).${hayOtros ? " Your other tours pick you up at no extra cost." : ""}`,
    eligeZona: "Choose Xilitla or Ciudad Valles to continue.",
  },
};

export function PreguntaRecogida({
  valor,
  cambiar,
  id = "pregunta-recogida",
  onBlur,
  zona,
  cambiarZona,
  errorZona = false,
}: {
  valor: string;
  cambiar: (v: string) => void;
  id?: string;
  onBlur?: () => void;
  /**
   * «¿Xilitla o Ciudad Valles?» (Manolo, 20 oct 2026). Solo aparece si un
   * recorrido del carrito cobra distinto desde Valles (`cargoValles`: hoy la
   * Ruta Surrealista, +$400 por reserva). Sin `cambiarZona` no se pinta.
   */
  zona?: "" | ZonaHospedaje;
  cambiarZona?: (z: ZonaHospedaje) => void;
  errorZona?: boolean;
}) {
  const { en, locale } = useLocale();
  const t = en ? TEXTOS.en : TEXTOS.es;
  const slugs = useCarritoSlugs();
  const modo = modoDelCarrito(slugs);
  const conCargo = Array.from(slugs)
    .map((s) => TOURS_DB.find((x) => x.slug === s))
    .filter((x): x is (typeof TOURS_DB)[number] => !!x && cargoVallesDe(x) > 0);
  const montoValles = conCargo.reduce((s, x) => s + cargoVallesDe(x), 0);
  const monto = `$${montoValles.toLocaleString(en ? "en-US" : "es-MX")}${en ? " MXN" : ""}`;
  // «la Ruta Surrealista» en español (con su artículo); «the Surrealist Route» lo pone la frase en inglés.
  const nombresCargo = conCargo
    .map((x) => (en ? "" : x.articulo ? `${x.articulo} ` : "") + localizeTour(x, locale).nombreCorto)
    .join(en ? " and " : " y ");
  // Otros recorridos que SÍ pasan por él a Valles sin costo (no el RZR ni los de solo Xilitla).
  const hayOtros = Array.from(slugs).some((s) => {
    const x = TOURS_DB.find((y) => y.slug === s);
    return !!x && cargoVallesDe(x) === 0 && recogidaDeTour(x).tipo === "hospedaje";
  });
  const pideZona = !!cambiarZona && conCargo.length > 0;

  return (
    <div className="border border-verde-selva/30 bg-verde-selva/5 p-4">
      <label htmlFor={id} className="flex items-center gap-2 font-cormorant text-[22px] leading-tight text-verde-profundo">
        <MapPin className="h-5 w-5 flex-shrink-0 text-verde-selva" aria-hidden="true" />
        {modo === "sin-recogida" ? t.tituloSinRecogida : t.titulo}
      </label>
      <p id={`${id}-ayuda`} className="mt-1.5 font-dm text-[13px] leading-snug text-negro/70">
        {t.ayuda[modo]}
      </p>
      {pideZona && (
        <div data-pregunta-zona className="mt-3">
          <p id={`${id}-zona`} className="font-dm text-[12px] font-medium text-negro/80 mb-1.5">{t.zonaGrupo}</p>
          <div role="radiogroup" aria-labelledby={`${id}-zona`} className="grid grid-cols-2 gap-2">
            {([
              { z: "xilitla" as const, titulo: "Xilitla",       sub: t.incluido },
              { z: "valles"  as const, titulo: "Ciudad Valles", sub: t.masTraslado(monto) },
            ]).map(({ z, titulo, sub }) => {
              const activo = zona === z;
              return (
                <button
                  key={z}
                  type="button"
                  role="radio"
                  aria-checked={activo}
                  onClick={() => cambiarZona!(z)}
                  className={`border px-3 py-3 text-left transition-colors ${
                    activo
                      ? "border-verde-selva bg-verde-selva text-white"
                      : errorZona
                        ? "border-terracota bg-white text-negro hover:border-verde-selva"
                        : "border-negro/20 bg-white text-negro hover:border-verde-selva"
                  }`}
                >
                  <span className="block font-dm text-[15px] font-medium leading-tight">{titulo}</span>
                  <span className={`block font-dm text-[12px] leading-snug mt-0.5 ${activo ? "text-white/85" : "text-negro/60"}`}>{sub}</span>
                </button>
              );
            })}
          </div>
          {errorZona && !zona ? (
            <p role="alert" className="mt-2 font-dm text-[12px] text-terracota">{t.eligeZona}</p>
          ) : (
            <p className="mt-2 font-dm text-[12px] leading-snug text-negro/55">
              {t.soloEste(nombresCargo, monto, hayOtros)}
            </p>
          )}
        </div>
      )}
      {/* 16 px y no 14: con menos, Safari del iPhone hace zoom a toda la página
          al tocar el campo y el cliente pierde de vista el resto del carrito. */}
      <input
        id={id}
        value={valor}
        onChange={(e) => cambiar(e.target.value)}
        onBlur={onBlur}
        placeholder={t.placeholder}
        autoComplete="off"
        aria-describedby={`${id}-ayuda ${id}-vacio`}
        className="mt-3 w-full border border-negro/20 bg-white px-3 py-3 font-dm text-base text-negro placeholder:text-negro/40 outline-none focus:border-verde-selva"
      />
      <p id={`${id}-vacio`} className="mt-2 font-dm text-[12px] leading-snug text-negro/55">
        {t.vacio}
      </p>
    </div>
  );
}
