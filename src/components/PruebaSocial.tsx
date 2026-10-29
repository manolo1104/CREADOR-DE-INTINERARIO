import Image from "next/image";
import { AvatarResena } from "@/components/AvatarResena";
import Link from "next/link";
import { Star } from "lucide-react";
import { GOOGLE_RATING, GOOGLE_RESENAS, GOOGLE_PERFIL_URL } from "@/lib/resenas";
import { RESENAS_REALES } from "@/lib/resenasReales";
import { localePath, type Locale } from "@/lib/i18n/config";

/**
 * La prueba social del inicio, con lo que de verdad existe.
 *
 * 🔴 Por qué existe (7 oct 2026)
 *
 * Aquí había tres reseñas INVENTADAS con caras de banco de imágenes, debajo de
 * un H2 que decía «161 Reseñas · 4.7 estrellas»: la cifra real de Google dando
 * credibilidad a tres citas falsas. Es lo más riesgoso que tenía la página.
 *
 * Lo que queda son las tres cosas verificables:
 *  1. La calificación del negocio, de `resenas.ts`, con enlace al perfil REAL
 *     (el de la operadora; `CONTACTO.mapsUrl` abre el del hotel, otra marca).
 *  2. Las citas de `resenasReales.ts`: solo las copiadas del perfil. Nada
 *     inventado.
 *  3. Un muro de fotos de las galerías REALES de los recorridos, no de
 *     `/imagenes/reviews/`, que son 35 archivos de archivo con los que firmaban
 *     las reseñas falsas (y donde una misma cara firmaba con dos nombres).
 *
 * 🔴 Rediseño del 29 oct 2026:
 *  · Las citas ya no van en tres tarjetas iguales con un icono de comillas
 *    encima: son texto con una línea arriba, en dos o tres columnas, y cada
 *    cita se recorta a cuatro renglones (la primera medía nueve). Quien quiera
 *    leerla entera tiene el enlace al perfil, que es donde está completa.
 *  · El muro de fotos tiene ritmo: la primera manda (dos por dos) y las ocho
 *    restantes la acompañan. Son NUEVE fotos (eran ocho) para que la rejilla
 *    cierre sin celdas vacías: 4 + 8 = 12 en escritorio; en el teléfono la
 *    grande va a todo lo ancho y las ocho en dos columnas.
 *  · Titular a la izquierda, sin ceja ni rayita, como el resto del inicio.
 */

export interface FotoViajero {
  src: string;
  alt: string;
  tour: string;
  slug: string;
  /**
   * El encuadre de la foto (`object-position`), para las que vienen de la
   * PORTADA de la ficha en vez de la galería: el muro recorta en cuadrado y la
   * portada está encuadrada para un hero panorámico. Sin esto, la cascada de
   * Tamul se queda fuera del recorte.
   */
  pos?: string;
}

export function PruebaSocial({ locale, fotos }: { locale: Locale; fotos: FotoViajero[] }) {
  const en = locale === "en";
  const lp = (p: string) => localePath(p, locale);
  const t = (es: string, ingles: string) => (en ? ingles : es);
  const citas = RESENAS_REALES.slice(0, 6);
  const hayCitas = citas.length > 0;
  // La grande y las que la acompañan. Con menos de nueve fotos el muro cae a
  // una rejilla simple para no dejar huecos.
  const [grande, ...resto] = fotos;
  const conGrande = fotos.length >= 9;

  return (
    <section
      aria-label={t("Lo que dicen los viajeros", "What travelers say")}
      className="border-t border-negro/10 bg-white px-6 py-20 sm:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <div className="reveal-up mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <h2
              className="font-cormorant font-light leading-[1.08] text-verde-profundo"
              style={{ fontSize: "clamp(36px,4.6vw,58px)" }}
            >
              {en
                ? <>{GOOGLE_RESENAS} reviews on Google, <em className="text-dorado">{GOOGLE_RATING} stars</em></>
                : <>{GOOGLE_RESENAS} reseñas en Google, <em className="text-dorado">{GOOGLE_RATING} estrellas</em></>}
            </h2>
            <p className="mt-4 max-w-[60ch] font-dm text-[15px] leading-relaxed text-negro/60 sm:text-base">
              {t(
                "La calificación y el número son los del perfil de Google de la operadora. Puedes leerlas todas ahí.",
                "The rating and the count come straight from the operator's Google profile. You can read them all there.",
              )}
            </p>
          </div>
          <a
            href={GOOGLE_PERFIL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[48px] shrink-0 items-center gap-2 self-start rounded-full border border-verde-selva/40 px-6 font-dm text-sm font-medium text-verde-selva transition-[background-color,border-color] duration-200 hover:border-verde-selva hover:bg-verde-selva/10 sm:self-auto"
          >
            <Star className="h-4 w-4 fill-dorado text-dorado" aria-hidden="true" />
            {t("Leer las reseñas en Google", "Read the reviews on Google")}
          </a>
        </div>

        {/* ── Las citas, solo si existen de verdad ── */}
        {hayCitas && (
          <ul className="mb-14 grid gap-x-10 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
            {citas.map((r) => (
              <li key={`${r.autor}-${r.fecha}`} className="flex flex-col border-t border-negro/15 pt-5">
                <p className="font-dm text-[12px] text-dorado" aria-label={t(`${r.estrellas} de 5 estrellas`, `${r.estrellas} out of 5 stars`)}>
                  {"★".repeat(Math.max(1, Math.min(5, r.estrellas)))}
                </p>
                <blockquote className="mt-3 line-clamp-4 font-dm text-[15px] leading-relaxed text-negro/75">
                  &ldquo;{r.texto}&rdquo;
                </blockquote>
                <div className="mt-4 flex items-center gap-3">
                  {/* La foto de perfil que el autor tiene en Google, o su
                      inicial. Nunca una foto de archivo: nadie firma con la cara
                      de otro, que es como nacieron las reseñas falsas. */}
                  <AvatarResena autor={r.autor} foto={r.foto} className="h-9 w-9" />
                  <div>
                    <p className="font-dm text-sm font-medium text-negro/80">{r.autor}</p>
                    <p className="font-dm text-[12px] text-negro/45">
                      {r.fecha}
                      {r.recorrido ? `, ${r.recorrido}` : ""}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* ── El muro de fotos: las galerías reales de los recorridos ── */}
        {fotos.length > 0 && (
          <ul className={`grid grid-cols-2 gap-2.5 sm:gap-3 ${conGrande ? "lg:grid-cols-4" : "sm:grid-cols-4"}`}>
            {(conGrande ? [grande, ...resto] : fotos).map((f, i) => {
              const esGrande = conGrande && i === 0;
              return (
                <li
                  key={f.src}
                  className={esGrande ? "col-span-2 lg:row-span-2" : ""}
                >
                  {/* Las fichas son estáticas (SSG), así que el prefetch de
                      estos enlaces sale barato. */}
                  <Link
                    href={lp(`/tours/${f.slug}`)}
                    className={`group relative block overflow-hidden rounded-2xl bg-negro/5 ${esGrande ? "aspect-[2/1] lg:aspect-auto lg:h-full" : "aspect-square"}`}
                  >
                    <Image
                      src={f.src}
                      alt={f.alt}
                      fill
                      sizes={esGrande ? "(max-width: 1023px) 100vw, 50vw" : "(max-width: 639px) 50vw, 25vw"}
                      loading="lazy"
                      style={f.pos ? { objectPosition: f.pos } : undefined}
                      className="object-cover transition-transform duration-500 ease-smooth-out group-hover:scale-[1.04]"
                    />
                    {/* El nombre del recorrido va como pie, no como etiqueta
                        encima de la foto: aparece al pasar el cursor y siempre
                        en el teléfono, donde no hay cursor. */}
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-negro/75 to-transparent px-3 pb-2.5 pt-8 font-dm text-[12px] text-crema/90 transition-opacity duration-200 lg:opacity-0 lg:group-hover:opacity-100">
                      {f.tour}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
