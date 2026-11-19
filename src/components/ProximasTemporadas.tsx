/* ProximasTemporadas — las fechas que se llenan, en el inicio (Server Component) */
import type { CSSProperties } from "react";
import { Droplets } from "lucide-react";
import {
  proximasTemporadas, fechasDeTemporada, type TemaTemporada, type TemporadaVista,
} from "@/lib/temporadasProximas";
import { GRUPO_MAX } from "@/lib/tours";
import { waLink } from "@/lib/whatsapp";
import { IlustracionTemporada } from "@/components/temporadas/IlustracionTemporada";

/**
 * «Una pequeña sección donde se desglosen las temporadas que vienen, como
 * vacaciones de dic, Semana Santa, etc.» (Manolo, 12 nov 2026). Y el mismo
 * día: «dale un diseño atractivo… si se puede con diseño de esa temporada».
 *
 * Cada tarjeta lleva el color y la ilustración de SU fecha (papel picado
 * tricolor, nochebuenas, jacarandas, palma y agua turquesa, lluvia y cascada,
 * cempasúchil): ver `temporadas/IlustracionTemporada.tsx`. Los colores viven
 * en `TEMAS`, aquí abajo; el texto y las fechas, en `temporadasProximas.ts`.
 *
 * Va justo después de `BandaTemporada` (la de «la mejor temporada para venir»)
 * porque las dos responden lo mismo: ¿cuándo voy? Esta lo dice con fechas.
 * Las que ya pasaron no llegan hasta aquí; sin ninguna, no se pinta.
 *
 * En el teléfono es una fila que se desliza (cinco tarjetas apiladas eran más
 * de una pantalla para una sección «pequeña»); de `sm` para arriba, rejilla.
 * El clic de «Apartar por WhatsApp» lo cuenta `WhatsAppClickTracker` con
 * `data-seccion="proximas-temporadas"`.
 */

interface Tema {
  /** Fondo de toda la tarjeta. */
  fondo: string;
  /** Color del texto. */
  tinta: string;
  /** Texto secundario (nota, agua). */
  suave: string;
  /** Botón: fondo y letra. */
  boton: string;
  botonTinta: string;
  /** Las etiquetas de demanda, sobre la ilustración. */
  etiqueta: string;
}

const TEMAS: Record<TemaTemporada, Tema> = {
  revolucion:     { fondo: "#f4edd8", tinta: "#1a2e1a", suave: "rgba(26,46,26,.68)", boton: "#1f7a3a", botonTinta: "#ffffff", etiqueta: "rgba(255,255,255,.85)" },
  navidad:        { fondo: "linear-gradient(165deg,#1d3a27 0%,#0f2016 100%)", tinta: "#f4edd8", suave: "rgba(244,237,216,.72)", boton: "#d7263d", botonTinta: "#ffffff", etiqueta: "rgba(255,255,255,.14)" },
  constitucion:   { fondo: "linear-gradient(180deg,#eaf6f9 0%,#d5edf3 100%)", tinta: "#12323d", suave: "rgba(18,50,61,.7)", boton: "#1f6f8b", botonTinta: "#ffffff", etiqueta: "rgba(255,255,255,.8)" },
  juarez:         { fondo: "linear-gradient(170deg,#f4f0fa 0%,#e6dcf3 100%)", tinta: "#2c1f45", suave: "rgba(44,31,69,.7)", boton: "#6b4fa3", botonTinta: "#ffffff", etiqueta: "rgba(255,255,255,.8)" },
  "semana-santa": { fondo: "linear-gradient(180deg,#fff6df 0%,#d9f2ee 100%)", tinta: "#0f3b3a", suave: "rgba(15,59,58,.72)", boton: "#0f8a84", botonTinta: "#ffffff", etiqueta: "rgba(255,255,255,.8)" },
  verano:         { fondo: "linear-gradient(170deg,#1b4438 0%,#0f2a24 100%)", tinta: "#eef7f2", suave: "rgba(238,247,242,.72)", boton: "#8fbe3a", botonTinta: "#0e1710", etiqueta: "rgba(255,255,255,.14)" },
  xantolo:        { fondo: "linear-gradient(165deg,#3d1443 0%,#22081f 100%)", tinta: "#fbeee0", suave: "rgba(251,238,224,.74)", boton: "#f39a1d", botonTinta: "#22081f", etiqueta: "rgba(255,255,255,.14)" },
};

const AGUA = {
  caudal:   { es: "Cascadas a todo caudal",        en: "Waterfalls at full flow" },
  turquesa: { es: "Agua en su punto más turquesa", en: "Water at its most turquoise" },
  clara:    { es: "Agua clara",                    en: "Clear water" },
} as const;

function mensaje(t: TemporadaVista, en: boolean): string {
  const fechas = fechasDeTemporada(t, en ? "en" : "es");
  return en
    ? `Hi! We'd like to visit the Huasteca Potosina during ${t.nombre.en} (${fechas}).\n\n` +
        "· Exact dates:\n· Number of people:\n· Tours we're interested in:"
    : `Hola, queremos ir a la Huasteca Potosina en ${t.nombre.es} (${fechas}).\n\n` +
        "· Fechas exactas:\n· Número de personas:\n· Tours que nos interesan:";
}

export function ProximasTemporadas({ en }: { en: boolean }) {
  const temporadas = proximasTemporadas(5);
  if (temporadas.length === 0) return null;
  const loc = en ? "en" : "es";

  return (
    <section
      aria-label={en ? "Upcoming holidays" : "Próximas temporadas"}
      data-seccion="proximas-temporadas"
      className="border-t border-negro/10 bg-white px-6 py-16 sm:py-20"
    >
      <div className="mx-auto max-w-6xl">
        <div className="reveal-up mb-10 max-w-2xl">
          <h2
            className="font-cormorant font-light leading-[1.08] text-verde-profundo"
            style={{ fontSize: "clamp(32px,4vw,48px)" }}
          >
            {en ? <>Upcoming <em className="text-dorado">holidays</em></> : <>Próximas <em className="text-dorado">temporadas</em></>}
          </h2>
          <p className="mt-3 max-w-[60ch] font-dm text-[15px] leading-relaxed text-negro/60">
            {en
              ? `The dates when most people travel to the Huasteca. If you're coming on one of them, book ahead: our groups are capped at ${GRUPO_MAX} people.`
              : `Las fechas en que más gente viaja a la Huasteca. Si vienes en alguna, aparta con tiempo: nuestros grupos son de máximo ${GRUPO_MAX} personas.`}
          </p>
        </div>

        <ol className="-mx-6 flex snap-x snap-mandatory scroll-px-6 gap-4 overflow-x-auto px-6 pb-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-5 lg:gap-4">
          {temporadas.map((t) => {
            const tema = TEMAS[t.tema];
            const estilo: CSSProperties = { background: tema.fondo, color: tema.tinta };
            return (
              <li
                key={t.id}
                style={estilo}
                className="group flex w-[80%] shrink-0 snap-start flex-col overflow-hidden rounded-3xl shadow-[0_1px_2px_rgba(14,23,16,.06),0_8px_24px_-12px_rgba(14,23,16,.25)] ring-1 ring-black/5 transition-transform duration-300 ease-out hover:-translate-y-1 sm:w-auto"
              >
                {/* La ilustración de la fecha, con las etiquetas encima. */}
                {/* 2:1 = la proporción del dibujo: se ve completo en cualquier ancho de tarjeta. */}
                <div className="relative aspect-[2/1] overflow-hidden">
                  <div className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-[1.04]">
                    <IlustracionTemporada tema={t.tema} />
                  </div>
                  <div className="absolute left-4 top-3 flex flex-wrap gap-1.5">
                    {t.enCurso && (
                      <span className="rounded-full bg-verde-selva px-2.5 py-0.5 font-dm text-[11px] font-medium text-white">
                        {en ? "Happening now" : "En curso"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-1 flex-col px-5 pb-5 pt-3">
                  <span
                    className="mb-2 self-start rounded-full px-2.5 py-0.5 font-dm text-[11px] font-medium backdrop-blur-sm"
                    style={{ background: tema.etiqueta, color: tema.tinta, boxShadow: `inset 0 0 0 1px ${tema.suave.replace(/[\d.]+\)$/, ".18)")}` }}
                  >
                    {t.afluencia === "muy-alta"
                      ? (en ? "● Busiest dates" : "● Muy alta demanda")
                      : (en ? "High demand" : "Alta demanda")}
                  </span>
                  <p className="font-cormorant text-[30px] leading-none">{fechasDeTemporada(t, loc)}</p>
                  <h3 className="mt-1.5 font-dm text-[15px] font-semibold leading-snug">{t.nombre[loc]}</h3>
                  <p className="mt-1.5 font-dm text-[13px] leading-relaxed" style={{ color: tema.suave }}>{t.nota[loc]}</p>
                  <p className="mt-2 flex items-center gap-1.5 font-dm text-[12px]" style={{ color: tema.suave }}>
                    <Droplets className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                    {AGUA[t.agua][loc]}
                  </p>

                  <div className="mt-auto pt-4">
                  <a
                    href={waLink(mensaje(t, en))}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={en ? `Book ${t.nombre.en} on WhatsApp` : `Apartar ${t.nombre.es} por WhatsApp`}
                    className="inline-flex min-h-[40px] items-center justify-center rounded-xl px-4 font-dm text-[13px] font-medium transition-[filter,transform] duration-200 hover:brightness-110 active:scale-[0.98]"
                    style={{ background: tema.boton, color: tema.botonTinta }}
                  >
                    {en ? "Book on WhatsApp" : "Apartar por WhatsApp"}
                  </a>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
