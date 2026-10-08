import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Hotel, UtensilsCrossed, Tag, CalendarCheck } from "lucide-react";
import { GOOGLE_RATING, GOOGLE_RESENAS, GOOGLE_PERFIL_URL } from "@/lib/resenas";
import { HOTEL_PROPIO, horarioRestaurante } from "@/lib/hotelPropio";
import { GUIAS } from "@/lib/guias";
import { ANTICIPO_PCT } from "@/lib/carrito";
import { GRUPO_MAX } from "@/lib/tours";
import { ReservaDirecto } from "@/components/ReservaDirecto";
import { localePath, type Locale } from "@/lib/i18n/config";

/**
 * «Por qué con nosotros»: UN solo bloque de confianza.
 *
 * 🔴 Por qué existe (7 oct 2026)
 *
 * El argumento estaba partido en cuatro paradas del inicio, cada una con medio
 * razonamiento: la banda negra de premios, la barra blanca de confianza justo
 * debajo, «Reserva directo» doscientas líneas más abajo y, al final de la
 * página, las certificaciones oficiales. El efecto de un bloque entero es muy
 * superior al de cuatro fragmentos dispersos.
 *
 * Y aquí se desarrolla por primera vez lo único que no se puede copiar: que el
 * hotel, el restaurante y los guías son nuestros. Eso estaba mencionado de
 * pasada en un párrafo del hero, sin una sola foto, mientras siete fotos reales
 * del restaurante llevaban meses en `public/` sin montarse en ninguna página.
 *
 * 🔴 Lo que este bloque NO dice, y por qué (ver `hotelPropio.ts`):
 *  · **Nada del precio de la noche** ($1,900 en una fuente contra $2,000 en la
 *    que cobra el checkout) ni de cuántos cuartos hay (9 contra 15).
 *  · **Nada de que la recogida sea ventaja del hotel**: pasamos gratis por
 *    cualquier hospedaje de Xilitla o de Valles.
 *  · **El desayuno de los tours es en El Taco Loco**, camino al recorrido, no
 *    en el hotel ni en El Papán.
 *  · **«+10,000 viajeros» no aparece.** Esa cifra está escrita a mano en trece
 *    sitios del repo y no tiene fuente. Aquí solo va lo verificable.
 *  · Las reseñas son del NEGOCIO y salen UNA vez, de `resenas.ts`.
 */

/** Las insignias que ya estaban en el inicio, reunidas. */
const INSIGNIAS = [
  { src: "/badges/sectur.png",            alt: "SECTUR — Secretaría de Turismo de México",  altEn: "SECTUR — Mexico Ministry of Tourism", w: 150, h: 56 },
  { src: "/badges/tripadvisor-full.png",  alt: "Tripadvisor",                               altEn: "Tripadvisor",                         w: 150, h: 56 },
  { src: "/badges/travellers-choice.svg", alt: "Travellers' Choice de Tripadvisor",         altEn: "Tripadvisor Travellers' Choice",      w: 110, h: 56 },
  { src: "/badges/viajemos-todos.png",    alt: "Viajemos Todos por México",                 altEn: "Viajemos Todos por México",           w: 150, h: 56 },
  { src: "/badges/top-rated-google.svg",  alt: "Mejor valorados en Google",                 altEn: "Top rated on Google",                 w: 110, h: 56 },
];

/**
 * Las fotos reales de la casa. Todas existen ya en `public/`; si algún día se
 * cambia una por otra mejor, es una línea. Si un archivo faltara, `next/image`
 * fallaría en el build —no en silencio—, que es lo que se quiere.
 */
const FOTOS_CASA = {
  hotel:       { src: "/imagenes/hotel-paraiso-encantado/hero.jpg",      alt: "Alberca y jardines del Hotel Paraíso Encantado, en Xilitla",     altEn: "Pool and gardens at Hotel Paraíso Encantado, in Xilitla" },
  habitacion:  { src: "/imagenes/hotel-paraiso-encantado/terraza.jpg",   alt: "Terraza del Hotel Paraíso Encantado sobre la sierra de Xilitla", altEn: "Hotel Paraíso Encantado terrace over the Xilitla sierra" },
  // 🔴 Fotos NUEVAS del 8 oct 2026, las que mandó Manolo. Van con nombre
  // propio y no sobrescribiendo `fogon.webp` / `platillos.jpg`: `next/image`
  // cachea por RUTA, así que reemplazar el archivo dejando la misma ruta sigue
  // sirviendo la foto vieja durante días.
  restaurante: { src: "/imagenes/papan-huasteco/fogon-de-lena.jpg",             alt: "El fogón de leña encendido en El Papán Huasteco",                           altEn: "The wood fire burning in the hearth at El Papán Huasteco" },
  platillos:   { src: "/imagenes/papan-huasteco/chilaquiles-con-arrachera.jpg", alt: "Chilaquiles con arrachera, frijoles y aguacate en El Papán Huasteco",       altEn: "Chilaquiles with arrachera, beans and avocado at El Papán Huasteco" },
};

export function BloqueConfianza({ locale }: { locale: Locale }) {
  const en = locale === "en";
  const lp = (p: string) => localePath(p, locale);
  const t = (es: string, ingles: string) => (en ? ingles : es);

  const razones = [
    {
      Icon: Hotel,
      titulo: t("El hotel es nuestro", "The hotel is ours"),
      /* 🔴 Decía solo dónde está y a cuántos metros. Son datos, y los datos no
         hacen que alguien se imagine ahí (Manolo, 8 oct). Ahora abre con lo que
         se ve desde el cuarto y cierra con el dato, que es el que sostiene la
         frase. Nada de precio por noche ni número de cuartos: ver hotelPropio.ts. */
      texto: t(
        `Duermes rodeado de montaña, con el pueblo abajo. ${HOTEL_PROPIO.nombre} está en ${HOTEL_PROPIO.zona}, a ${HOTEL_PROPIO.metrosALasPozas} m y ${HOTEL_PROPIO.minutosCaminando} minutos caminando del jardín de Edward James.`,
        `You sleep surrounded by mountains, with the town below. ${HOTEL_PROPIO.nombre} is in ${HOTEL_PROPIO.zona}, ${HOTEL_PROPIO.metrosALasPozas} m and a ${HOTEL_PROPIO.minutosCaminando}-minute walk from Edward James's garden.`,
      ),
    },
    {
      Icon: UtensilsCrossed,
      titulo: t("El restaurante es nuestro", "The restaurant is ours"),
      /* Comida huasteca de verdad y las tortillas a mano en comal de barro
         (Manolo, 8 oct). Son las dos fotos que hay montadas arriba —el fogón de
         leña y los platillos—, así que el texto dice lo que la foto enseña.
         ⚠️ El desayuno de los TOURS no es aquí: es en El Taco Loco, camino al
         recorrido (hotelPropio.ts). Por eso esta frase habla de cenar y comer
         en el hotel, nunca del desayuno del recorrido. */
      texto: t(
        `Comes comida huasteca de verdad, con tortillas hechas a mano en comal de barro. ${HOTEL_PROPIO.restaurante} está dentro del hotel y abre ${horarioRestaurante(false)}.`,
        `You eat real Huasteca cooking, with tortillas pressed by hand on a clay comal. ${HOTEL_PROPIO.restaurante} is inside the hotel, open ${horarioRestaurante(true)}.`,
      ),
    },
    {
      Icon: BadgeCheck,
      titulo: t("Los guías son nuestros", "The guides are ours"),
      texto: t(
        `Alex y Ángel son de Xilitla y llevan guiando desde ${Math.min(...GUIAS.map((g) => g.desde))}. Guías certificados NOM-09 por SECTUR, con seguro de viaje incluido.`,
        `Alex and Ángel are from Xilitla and have been guiding since ${Math.min(...GUIAS.map((g) => g.desde))}. NOM-09 SECTUR certified, travel insurance included.`,
      ),
    },
    {
      Icon: Tag,
      titulo: t("Precio final", "Final price"),
      // Sin repetir el anticipo: `ReservaDirecto`, que va dentro de este mismo
      // bloque unas líneas más abajo, ya lo dice con el número de `ANTICIPO_PCT`.
      texto: t(
        "Lo que ves es lo que pagas, en pesos y sin comisión de plataforma. Ningún cargo aparece al final.",
        "What you see is what you pay, in pesos, with no platform fee. Nothing shows up at the end.",
      ),
    },
    {
      Icon: CalendarCheck,
      titulo: t("Grupos chicos", "Small groups"),
      texto: t(
        `Máximo ${GRUPO_MAX} personas por salida. Si el río crece, se reagenda sin costo o se devuelve el dinero.`,
        `Up to ${GRUPO_MAX} people per departure. If the river rises we reschedule at no cost, or refund you.`,
      ),
    },
  ];

  return (
    <section
      aria-label={t("Por qué reservar con nosotros", "Why book with us")}
      className="border-y border-negro/10 bg-arena/30 px-6 py-24"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <p className="reveal-fade mb-4 font-dm text-[10px] uppercase tracking-[4px] text-verde-selva">
            {t("Operadora local, no intermediario", "Local operator, not a reseller")}
          </p>
          <h2
            className="reveal-up font-cormorant font-light text-verde-profundo"
            style={{ fontSize: "clamp(32px,4.5vw,52px)" }}
          >
            {en ? <>Why <em className="shimmer-gold">with us</em></> : <>Por qué <em className="shimmer-gold">con nosotros</em></>}
          </h2>
          <div className="heading-underline" aria-hidden="true" />
          {/* Aquí aterriza el párrafo que estaba en el hero, donde eran cuatro
              líneas sobre el buscador. */}
          <p className="reveal-up reveal-d1 mx-auto mt-5 max-w-2xl font-dm text-sm leading-relaxed text-negro/55">
            {t(
              "Somos de Xilitla. Te acuestas con la sierra enfrente, cenas lo que se cocina en el fogón de la casa y al día siguiente te lleva al río la misma gente. El hotel, el restaurante y los guías son nuestros, y también pasamos por ti en Ciudad Valles. Eso es lo que ninguna plataforma de reventa puede copiar.",
              "We're from Xilitla. You turn in with the sierra in front of you, you have dinner straight off the house hearth, and the next morning the same people take you to the river. The hotel, the restaurant and the guides are ours, and we'll pick you up in Ciudad Valles too. That's the part no reselling platform can copy.",
            )}
          </p>
        </div>

        {/* ── Las fotos de la casa ──
            Cuatro fotos REALES. Todas en diferido: este bloque queda muy por
            debajo del póster del hero, que es el LCP y la única imagen que debe
            precargarse. */}
        <div className="mb-14 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[FOTOS_CASA.hotel, FOTOS_CASA.habitacion, FOTOS_CASA.restaurante, FOTOS_CASA.platillos].map((f) => (
            <div key={f.src} className="relative aspect-[4/3] overflow-hidden rounded-lg bg-negro/5">
              <Image
                src={f.src}
                alt={en ? f.altEn : f.alt}
                fill
                sizes="(max-width: 1023px) 50vw, 25vw"
                loading="lazy"
                className="object-cover"
              />
            </div>
          ))}
        </div>

        {/* ── Las razones ── */}
        <ul className="mb-14 grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
          {razones.map((r) => (
            <li key={r.titulo} className="flex gap-3.5">
              <r.Icon className="mt-0.5 h-5 w-5 shrink-0 text-verde-selva" aria-hidden="true" />
              <div>
                <h3 className="font-dm text-sm font-medium text-verde-profundo">{r.titulo}</h3>
                <p className="mt-1 font-dm text-[13px] leading-relaxed text-negro/55">{r.texto}</p>
              </div>
            </li>
          ))}
        </ul>

        {/* ── Alex y Ángel, con cara, nombre y lo que dicen ──
            Los retratos grandes (720×960) estaban solo en las fichas de los
            recorridos acuáticos; en el inicio se veían dos avatares de 48 px. */}
        <div className="mb-14 grid gap-5 sm:grid-cols-2">
          {GUIAS.map((g) => (
            <figure key={g.nombre} className="flex gap-4 border border-negro/10 bg-white p-5">
              <div className="relative h-28 w-24 shrink-0 overflow-hidden rounded bg-negro/5">
                <Image
                  src={g.foto}
                  alt={en ? g.fotoAlt.en : g.fotoAlt.es}
                  fill
                  sizes="96px"
                  loading="lazy"
                  className="object-cover"
                  style={{ objectPosition: g.fotoPos }}
                />
              </div>
              <div className="min-w-0">
                <figcaption className="font-dm text-sm font-medium text-verde-profundo">
                  {g.apodo ?? g.nombre.split(" ")[0]}
                  <span className="ml-1.5 font-normal text-negro/40">
                    {t(`guía desde ${g.desde}`, `guiding since ${g.desde}`)}
                  </span>
                </figcaption>
                <p className="mt-0.5 font-dm text-[11px] text-negro/45">
                  {g.origen} · {(en ? g.certificaciones.en : g.certificaciones.es)[0]}
                </p>
                <blockquote className="mt-2 font-dm text-[13px] italic leading-relaxed text-negro/60">
                  &ldquo;{en ? g.frase.en : g.frase.es}&rdquo;
                </blockquote>
              </div>
            </figure>
          ))}
        </div>

        {/* ── Reserva directo ──
            El componente que ya existía, dentro del bloque en vez de solo a
            doscientas líneas de distancia. */}
        <div className="mb-12">
          <ReservaDirecto locale={locale} donde="inicio" />
        </div>

        {/* ── La calificación real, UNA vez en toda la página ── */}
        <p className="mb-9 text-center">
          <a
            href={GOOGLE_PERFIL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center gap-2 border border-verde-selva/40 px-7 font-dm text-xs uppercase tracking-[2px] text-verde-selva transition-colors hover:bg-verde-selva/10"
          >
            <span className="text-dorado" aria-hidden="true">★</span>
            <span className="font-medium">{GOOGLE_RATING}</span>
            {t(`en Google · ${GOOGLE_RESENAS} reseñas`, `on Google · ${GOOGLE_RESENAS} reviews`)}
          </a>
        </p>

        {/* ── Las certificaciones, que vivían al final de la página ── */}
        <div>
          <p className="reveal-fade mb-7 text-center font-dm text-[9px] uppercase tracking-[3px] text-negro/30">
            {t("Certificados y reconocidos por", "Certified and recognized by")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
            {INSIGNIAS.map((b) => (
              <Image
                key={b.src}
                src={b.src}
                alt={en ? b.altEn : b.alt}
                width={b.w}
                height={b.h}
                loading="lazy"
                className="h-11 w-auto opacity-60 transition-opacity hover:opacity-100"
              />
            ))}
          </div>
          <p className="mt-7 text-center">
            <Link
              href={lp("/nosotros")}
              prefetch={false}
              className="font-dm text-xs uppercase tracking-[2px] text-verde-selva underline underline-offset-4 transition-colors hover:text-terracota"
            >
              {t("Conoce al equipo →", "Meet the team →")}
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
