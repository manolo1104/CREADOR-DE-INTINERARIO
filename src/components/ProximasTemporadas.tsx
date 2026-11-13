/* ProximasTemporadas — las fechas que se llenan, en el inicio (Server Component) */
import { Droplets } from "lucide-react";
import { proximasTemporadas, fechasDeTemporada, type TemporadaVista } from "@/lib/temporadasProximas";
import { GRUPO_MAX } from "@/lib/tours";
import { waLink } from "@/lib/whatsapp";

/**
 * «Una pequeña sección donde se desglosen las temporadas que vienen, como
 * vacaciones de dic, Semana Santa, etc.» (Manolo, 12 nov 2026).
 *
 * Va justo después de `BandaTemporada` (la de «la mejor temporada para venir»)
 * porque las dos responden lo mismo: ¿cuándo voy? Esta lo dice con fechas.
 *
 * Las fechas, las notas y la regla del agua viven en `temporadasProximas.ts`;
 * aquí solo se pintan. Las que ya pasaron no llegan hasta aquí, y si algún día
 * no queda ninguna, la sección no se pinta.
 *
 * Sin cajas, como las razones de «Por qué con nosotros»: una línea arriba de
 * cada temporada. En el teléfono es una fila que se desliza (cinco tarjetas
 * apiladas eran más de una pantalla para una sección «pequeña»); de `sm` para
 * arriba, rejilla.
 *
 * El clic de «Apartar por WhatsApp» lo cuenta `WhatsAppClickTracker` (escucha
 * todo el documento) con `data-seccion="proximas-temporadas"`.
 */

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

        <ol className="-mx-6 flex snap-x snap-mandatory scroll-px-6 gap-5 overflow-x-auto px-6 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-x-8 sm:gap-y-10 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-5 lg:gap-x-6">
          {temporadas.map((t) => (
            <li
              key={t.id}
              className="flex w-[78%] shrink-0 snap-start flex-col border-t border-negro/15 pt-5 sm:w-auto"
            >
              <div className="mb-3 flex flex-wrap gap-1.5">
                {t.enCurso && (
                  <span className="rounded-full bg-verde-selva px-2.5 py-0.5 font-dm text-[11px] font-medium text-white">
                    {en ? "Happening now" : "En curso"}
                  </span>
                )}
                <span
                  className={`rounded-full px-2.5 py-0.5 font-dm text-[11px] font-medium ${
                    t.afluencia === "muy-alta" ? "bg-terracota/10 text-terracota" : "bg-dorado/15 text-verde-profundo"
                  }`}
                >
                  {t.afluencia === "muy-alta"
                    ? (en ? "Busiest dates" : "Muy alta demanda")
                    : (en ? "High demand" : "Alta demanda")}
                </span>
              </div>

              <p className="font-cormorant text-[28px] leading-none text-verde-profundo">
                {fechasDeTemporada(t, loc)}
              </p>
              <h3 className="mt-2 font-dm text-[15px] font-medium text-verde-profundo">{t.nombre[loc]}</h3>
              <p className="mt-1.5 font-dm text-[13px] leading-relaxed text-negro/55">{t.nota[loc]}</p>
              <p className="mt-2 flex items-center gap-1.5 font-dm text-[12px] text-negro/50">
                <Droplets className="h-3.5 w-3.5 shrink-0 text-agua" strokeWidth={1.75} aria-hidden="true" />
                {AGUA[t.agua][loc]}
              </p>

              <a
                href={waLink(mensaje(t, en))}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={en ? `Book ${t.nombre.en} on WhatsApp` : `Apartar ${t.nombre.es} por WhatsApp`}
                className="mt-auto pt-4 font-dm text-sm text-verde-selva underline decoration-verde-selva/30 underline-offset-4 transition-colors hover:text-terracota"
              >
                {en ? "Book on WhatsApp →" : "Apartar por WhatsApp →"}
              </a>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
