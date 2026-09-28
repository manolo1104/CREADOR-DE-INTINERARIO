/* BandaTemporada — el aviso de que arranca la mejor época (Server Component) */
import Link from "next/link";
import Image from "next/image";
import { ventanaMejorTemporada, MEJOR_TEMPORADA } from "@/lib/temporada";

/**
 * La banda del inicio que avisa que está por arrancar —o que ya arrancó— la
 * mejor temporada para venir a la Huasteca.
 *
 * 🔴 Por qué el titular dice «la mejor temporada para VENIR» y nunca «el agua
 * más turquesa»: el sitio ya afirma, en /destinos, en el boletín y en llms.txt,
 * que el agua se ve más turquesa entre marzo y mayo. Las dos cosas son ciertas
 * y no se pelean mientras se digan bien —en primavera el color es mejor pero
 * hay más gente; de octubre a diciembre el agua ya bajó clara y todavía no
 * llegan las multitudes—, pero si se mezclan, el inicio contradice al resto del
 * sitio. Es el mismo error que ya costó caro con Tamul y con las Huahuas.
 *
 * No lleva estado ni temporizador: el inicio es `force-dynamic`, así que la
 * cuenta sale del servidor y está fresca en cada visita. Y no lleva
 * `"use client"` porque no hace falta: es texto y una foto.
 *
 * Se borra sola. Fuera de la ventana (y de los 45 días previos) no devuelve
 * nada, así que nadie tiene que acordarse de quitarla en enero.
 */

/**
 * La foto se eligió por lo que DICE el texto, no por cuál es la más bonita:
 * el mensaje es «agua clara y poca gente», así que la toma es la aérea de
 * Minas Viejas —pozas turquesa, sin una sola persona— y no las del Meco, que
 * salen llenas de lanchas con chalecos naranjas. Una foto con multitud debajo
 * de un titular que promete calma se lee como una mentira.
 *
 * Además está encuadrada para esto: el lado izquierdo es roca y selva oscura,
 * que es exactamente donde cae el texto.
 */
const FOTO = "/imagenes/cascadas-minas-viejas/hero-new.jpg";
const FOTO_ALT_ES =
  "Vista aérea de las Cascadas de Minas Viejas: una caída triple sobre pozas de agua turquesa, sin nadie alrededor";
const FOTO_ALT_EN =
  "Aerial view of Minas Viejas Waterfalls: a triple drop over turquoise pools, with nobody around";

export function BandaTemporada({ en, hrefTours }: { en: boolean; hrefTours: string }) {
  const { estado, dias } = ventanaMejorTemporada();
  if (estado === "fuera") return null;

  const cuenta = estado === "cuenta-regresiva";
  const fecha = en ? "October 5" : "5 de octubre";

  return (
    <section
      aria-label={en ? "Best season to visit" : "Mejor temporada para visitar"}
      className="relative isolate overflow-hidden border-y border-white/10 bg-verde-profundo"
    >
      <Image
        src={FOTO}
        alt={en ? FOTO_ALT_EN : FOTO_ALT_ES}
        fill
        sizes="100vw"
        className="-z-10 object-cover object-[60%_center]"
      />

      {/* Dos velos, no uno. En teléfono el texto va ENCIMA de la foto, así que
          hace falta uno parejo; en escritorio el texto vive a la izquierda y el
          velo se abre hacia la derecha para dejar respirar la cascada.
          Se usan clases normales de Tailwind (`from/via/to` sin porcentajes):
          las paradas con porcentaje no se compilaron en este proyecto y el
          degradado se quedaba en nada. */}
      <div className="absolute inset-0 bg-negro/80 sm:hidden" aria-hidden="true" />
      <div
        className="absolute inset-0 hidden sm:block bg-gradient-to-r from-negro via-negro/85 to-negro/20"
        aria-hidden="true"
      />
      {/* Un tinte verde encima para que la foto pertenezca a la paleta del sitio
          y no parezca una postal pegada. */}
      <div className="absolute inset-0 bg-verde-profundo/45 mix-blend-multiply" aria-hidden="true" />

      <div className="relative z-10 mx-auto max-w-6xl px-6 py-14 sm:py-20">
        <div className="max-w-xl sm:max-w-2xl">
          {/* La fecha es el dato que todo lo demás explica, así que va primero
              y con la línea que la ancla. Es el único rótulo en mayúsculas de
              la sección: uno basta. */}
          <div className="reveal-fade mb-6 flex items-center gap-3">
            <span className="h-px w-8 flex-shrink-0 bg-dorado/70" aria-hidden="true" />
            <span className="font-dm text-[10px] uppercase tracking-[4px] text-dorado">
              {en ? `From ${fecha}` : `Desde el ${fecha}`}
            </span>
          </div>

          {/* En escritorio el número y el titular comparten línea de base: el
              número es el dato y el titular lo que significa. En teléfono se
              apilan, porque lado a lado el titular quedaba en columnas de tres
              palabras. */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:gap-7">
            {cuenta ? (
              <div className="reveal-up flex flex-shrink-0 items-baseline gap-2 sm:block">
                <span
                  className="shimmer-gold block font-cormorant font-light leading-[0.9] tabular-nums"
                  style={{ fontSize: "clamp(72px,12vw,132px)" }}
                >
                  {dias}
                </span>
                {/* Separada del número y un punto más clara: con `leading-[0.82]`
                    la etiqueta se le montaba a la cola del dígito y al 45 % de
                    opacidad casi no se leía. */}
                <span className="block font-dm text-[10px] uppercase tracking-[4px] text-crema/60 sm:mt-4 sm:text-center">
                  {dias === 1 ? (en ? "day" : "día") : en ? "days" : "días"}
                </span>
              </div>
            ) : (
              <div className="reveal-up mb-5 flex-shrink-0 sm:mb-0">
                <span className="inline-block border border-dorado/50 bg-dorado/10 px-4 py-2 font-dm text-[10px] uppercase tracking-[3px] text-dorado">
                  {en ? "Season is open" : "Ya arrancó"}
                </span>
              </div>
            )}

            <div className="min-w-0 pt-5 sm:pt-2">
              <h2
                className="reveal-up reveal-d1 mb-4 font-cormorant font-light leading-[1.08] text-crema"
                style={{ fontSize: "clamp(28px,4.2vw,46px)" }}
              >
                {cuenta
                  ? en
                    ? <>for the <em className="shimmer-gold not-italic">best season</em> to visit the Huasteca</>
                    : <>para que arranque <em className="shimmer-gold not-italic">la mejor temporada</em> de la Huasteca</>
                  : en
                    ? <>We are in the <em className="shimmer-gold not-italic">best season</em> to visit the Huasteca</>
                    : <>Estamos en <em className="shimmer-gold not-italic">la mejor temporada</em> de la Huasteca</>}
              </h2>

              {/* El matiz va dentro del párrafo, no escondido en una nota: lo
                  que cambia el 5 de octubre es que aflojan las lluvias, no que
                  aparezca el turquesa de primavera. */}
              <p className="reveal-up reveal-d2 mb-7 max-w-lg font-dm text-sm leading-relaxed text-crema/65">
                {en
                  ? "The rains ease off, the rivers run clear again and the spring crowds are still months away. It is the stretch of the year with the best mix of clear water and quiet trails, and Xantolo falls right inside it."
                  : "Aflojan las lluvias, los ríos vuelven a bajar claros y todavía faltan meses para las multitudes de primavera. Es el tramo del año con la mejor mezcla de agua clara y poca gente, y encima cae Xantolo dentro."}
              </p>

              <Link
                href={hrefTours}
                className="reveal-up reveal-d3 group inline-flex items-center gap-3 bg-dorado px-9 py-4 font-dm text-[11px] font-medium uppercase tracking-[3px] text-negro transition-colors duration-200 hover:bg-lima active:scale-[0.98]"
              >
                {en ? "See the tours" : "Ver los recorridos"}
                {/* La flecha se adelanta un pelo al pasar el cursor. Solo con
                    ratón: en táctil el hover se queda pegado al tocar. */}
                <span
                  aria-hidden="true"
                  className="transition-transform duration-200 ease-out motion-safe:[@media(hover:hover)_and_(pointer:fine)]:group-hover:translate-x-1"
                >
                  →
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* Para que nadie tenga que abrir temporada.ts sólo para saber de qué fecha
   hablamos si algún día hay que moverla. */
export const INICIO_MEJOR_TEMPORADA = `${MEJOR_TEMPORADA.inicioDia}/${MEJOR_TEMPORADA.inicioMes}`;
