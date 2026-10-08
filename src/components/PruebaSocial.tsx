import Image from "next/image";
import Link from "next/link";
import { Star, Quote } from "lucide-react";
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
 *  2. Las citas de `resenasReales.ts`, que **nace vacío**: mientras no haya
 *     ninguna copiada del perfil, no se pinta ni una. Nada inventado.
 *  3. Un muro de fotos de las galerías REALES de los recorridos — no de
 *     `/imagenes/reviews/`, que son 35 archivos de archivo con los que firmaban
 *     las reseñas falsas (y donde una misma cara firmaba con dos nombres).
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
  const hayCitas = RESENAS_REALES.length > 0;

  return (
    <section
      aria-label={t("Lo que dicen los viajeros", "What travelers say")}
      className="border-y border-negro/10 bg-white px-6 py-24"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <p className="reveal-fade mb-4 font-dm text-[10px] uppercase tracking-[4px] text-verde-selva">
            {t("Lo que dicen los viajeros", "What travelers say")}
          </p>
          <h2
            className="reveal-up font-cormorant font-light text-verde-profundo"
            style={{ fontSize: "clamp(32px,4.5vw,48px)" }}
          >
            {en
              ? <>{GOOGLE_RESENAS} reviews · <em className="shimmer-gold">{GOOGLE_RATING} stars</em></>
              : <>{GOOGLE_RESENAS} reseñas · <em className="shimmer-gold">{GOOGLE_RATING} estrellas</em></>}
          </h2>
          <div className="star-group mt-3 flex justify-center gap-1" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <Star key={i} className="star-icon h-5 w-5 fill-dorado text-dorado" />
            ))}
          </div>
          <p className="mx-auto mt-4 max-w-xl font-dm text-sm text-negro/50">
            {t(
              "La calificación y el número son los del perfil de Google de la operadora. Puedes leerlas todas ahí.",
              "The rating and the count come straight from the operator's Google profile. You can read them all there.",
            )}
          </p>
        </div>

        {/* ── Las citas, solo si existen de verdad ── */}
        {hayCitas && (
          <ul className="mb-12 grid gap-6 md:grid-cols-3">
            {RESENAS_REALES.slice(0, 6).map((r) => (
              <li key={`${r.autor}-${r.fecha}`} className="flex flex-col border border-negro/10 p-6 shadow-sm">
                <Quote className="mb-3 h-6 w-6 text-dorado/40" aria-hidden="true" />
                <blockquote className="mb-5 font-dm text-sm italic leading-relaxed text-negro/70">
                  &ldquo;{r.texto}&rdquo;
                </blockquote>
                <div className="mt-auto flex items-center gap-3">
                  {/* Sin foto de archivo: la inicial. Nadie firma con la cara
                      de otro, que es como nacieron las reseñas falsas. */}
                  <span
                    aria-hidden="true"
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-verde-selva/10 font-cormorant text-base text-verde-selva"
                  >
                    {r.autor.trim().charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <p className="font-dm text-sm font-medium text-negro/80">{r.autor}</p>
                    <p className="font-dm text-[11px] text-negro/40">
                      {"★".repeat(Math.max(1, Math.min(5, r.estrellas)))} · {r.fecha}
                      {r.recorrido ? ` · ${r.recorrido}` : ""}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* ── El muro de fotos: las galerías reales de los recorridos ── */}
        {fotos.length > 0 && (
          <>
            <p className="mb-5 text-center font-dm text-[10px] uppercase tracking-[3px] text-negro/35">
              {t("Fotos de nuestros recorridos", "Photos from our tours")}
            </p>
            <ul className="mb-10 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {fotos.map((f) => (
                <li key={f.src}>
                  {/* Las fichas son estáticas (SSG), así que el prefetch de
                      estos enlaces sale barato. */}
                  <Link
                    href={lp(`/tours/${f.slug}`)}
                    className="group relative block aspect-square overflow-hidden rounded-lg bg-negro/5"
                  >
                    <Image
                      src={f.src}
                      alt={f.alt}
                      fill
                      sizes="(max-width: 639px) 50vw, 25vw"
                      loading="lazy"
                      style={f.pos ? { objectPosition: f.pos } : undefined}
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                    />
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-negro/80 to-transparent px-2.5 pb-2 pt-6 font-dm text-[10px] text-crema/90">
                      {f.tour}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        <p className="text-center">
          <a
            href={GOOGLE_PERFIL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-verde-selva/40 px-8 font-dm text-sm uppercase tracking-[2px] text-verde-selva transition-colors duration-200 hover:border-verde-selva hover:bg-verde-selva/10"
          >
            <Star className="h-4 w-4 fill-dorado text-dorado" aria-hidden="true" />
            {t(`Ver las ${GOOGLE_RESENAS} reseñas en Google`, `Read all ${GOOGLE_RESENAS} reviews on Google`)}
          </a>
        </p>
      </div>
    </section>
  );
}
