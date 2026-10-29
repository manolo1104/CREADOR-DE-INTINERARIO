import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Hotel, UtensilsCrossed, CalendarCheck } from "lucide-react";
import { HOTEL_PROPIO, horarioRestaurante } from "@/lib/hotelPropio";
import { GUIAS } from "@/lib/guias";
import { GRUPO_MAX } from "@/lib/tours";
import { localePath, type Locale } from "@/lib/i18n/config";

/**
 * «Por qué con nosotros»: UN solo bloque de confianza.
 *
 * 🔴 Por qué existe (7 oct 2026)
 *
 * El argumento estaba partido en cuatro paradas del inicio, cada una con medio
 * razonamiento: la banda negra de premios, la barra blanca de confianza justo
 * debajo, «Reserva directo» doscientas líneas más abajo y, al final de la
 * página, las certificaciones. El efecto de un bloque entero es muy
 * superior al de cuatro fragmentos dispersos.
 *
 * Y aquí se desarrolla por primera vez lo único que no se puede copiar: que el
 * hotel, el restaurante y los guías son nuestros.
 *
 * 🔴 Rediseño del 29 oct 2026 (lo que cambió y por qué):
 *  · **Fuera la ceja en mayúsculas y la rayita bajo el titular.** Las llevaba
 *    cada sección del inicio, y un sitio donde todas las secciones arrancan
 *    igual se lee como una plantilla. El titular va a la izquierda, como el
 *    texto, no centrado sobre una columna.
 *  · **Las cuatro fotos ya no son cuatro recuadros iguales**: la del hotel
 *    manda (ocupa la mitad) y las otras tres la acompañan. Son las mismas
 *    cuatro fotos reales de siempre.
 *  · **Las razones son cuatro, no cinco**: «Precio final» ya está en la línea
 *    de confianza del hero, repetirla a dos pantallas no suma.
 *  · **`ReservaDirecto` ya no se monta aquí**: sus cinco puntos (anticipo,
 *    pesos, WhatsApp, guías NOM-09, hotel propio) repetían los de esta misma
 *    lista con otras palabras. Sigue en las fichas, que es donde se decide.
 *  · **La calificación de Google sale de aquí**: vive en el hero y en el
 *    bloque de reseñas; aquí era la tercera vez en la misma página.
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
 */

/** Las insignias que ya estaban en el inicio, reunidas. */
const INSIGNIAS = [
  { src: "/badges/sectur.png",            alt: "SECTUR, Secretaría de Turismo de México",  altEn: "SECTUR, Mexico Ministry of Tourism", w: 150, h: 56 },
  { src: "/badges/tripadvisor-full.png",  alt: "Tripadvisor",                               altEn: "Tripadvisor",                         w: 150, h: 56 },
  { src: "/badges/travellers-choice.svg", alt: "Travellers' Choice de Tripadvisor",         altEn: "Tripadvisor Travellers' Choice",      w: 110, h: 56 },
  { src: "/badges/viajemos-todos.png",    alt: "Viajemos Todos por México",                 altEn: "Viajemos Todos por México",           w: 150, h: 56 },
  { src: "/badges/top-rated-google.svg",  alt: "Mejor valorados en Google",                 altEn: "Top rated on Google",                 w: 110, h: 56 },
];

/**
 * Las fotos reales de la casa. Todas existen ya en `public/`; si algún día se
 * cambia una por otra mejor, es una línea. Si un archivo faltara, `next/image`
 * fallaría en el build, no en silencio, que es lo que se quiere.
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
      Icon: CalendarCheck,
      titulo: t("Grupos chicos", "Small groups"),
      texto: t(
        `Máximo ${GRUPO_MAX} personas por salida. Si el río crece, se reagenda sin costo o se devuelve el dinero.`,
        `Up to ${GRUPO_MAX} people per departure. If the river rises we reschedule at no cost, or refund you.`,
      ),
    },
  ];

  const fotoCls = "relative overflow-hidden rounded-2xl bg-negro/5";
  const imgCls = "object-cover transition-transform duration-500 ease-smooth-out group-hover:scale-[1.03]";

  return (
    <section
      aria-label={t("Por qué reservar con nosotros", "Why book with us")}
      className="border-t border-negro/10 bg-crema px-6 py-20 sm:py-24"
    >
      <div className="mx-auto max-w-6xl">
        {/* ── Titular, a la izquierda y sin ceja ── */}
        <div className="reveal-up mb-12 max-w-2xl">
          <h2
            className="font-cormorant font-light leading-[1.08] text-verde-profundo"
            style={{ fontSize: "clamp(36px,4.6vw,58px)" }}
          >
            {en ? <>Why <em className="text-dorado">with us</em></> : <>Por qué <em className="text-dorado">con nosotros</em></>}
          </h2>
          <p className="mt-4 max-w-[60ch] font-dm text-[15px] leading-relaxed text-negro/60 sm:text-base">
            {t(
              "Somos de Xilitla. El hotel, el restaurante y los guías son nuestros, y eso es lo que ninguna plataforma de reventa puede copiar.",
              "We're from Xilitla. The hotel, the restaurant and the guides are ours, and that's the part no reselling platform can copy.",
            )}
          </p>
        </div>

        {/* ── Las fotos de la casa: una manda, tres acompañan ──
            Cuatro fotos REALES, en diferido: este bloque queda muy por debajo
            del póster del hero, que es el LCP y la única imagen que debe
            precargarse. En el teléfono: hotel y terraza a todo lo ancho, el
            fogón y el platillo a medias, sin ninguna celda huérfana. */}
        {/* 🔴 En `lg` las filas llevan alto FIJO (`lg:grid-rows-[280px_280px]`):
            las fotos van con `fill`, que no mide nada, y sin alto declarado la
            rejilla se quedaba en una tira de 20 px (visto en la primera captura
            del 29 oct). Abajo de `lg` cada foto se sostiene con su proporción. */}
        <div className="mb-14 grid grid-cols-2 gap-3 lg:grid-cols-[7fr_2.5fr_2.5fr] lg:grid-rows-[280px_280px] lg:gap-4">
          <div className={`group col-span-2 aspect-[16/10] lg:col-span-1 lg:row-span-2 lg:aspect-auto ${fotoCls}`}>
            <Image src={FOTOS_CASA.hotel.src} alt={en ? FOTOS_CASA.hotel.altEn : FOTOS_CASA.hotel.alt} fill sizes="(max-width: 1023px) 100vw, 58vw" loading="lazy" className={imgCls} />
          </div>
          <div className={`group col-span-2 aspect-[16/9] lg:aspect-auto ${fotoCls}`}>
            <Image src={FOTOS_CASA.habitacion.src} alt={en ? FOTOS_CASA.habitacion.altEn : FOTOS_CASA.habitacion.alt} fill sizes="(max-width: 1023px) 100vw, 42vw" loading="lazy" className={imgCls} />
          </div>
          <div className={`group aspect-[4/3] lg:aspect-auto ${fotoCls}`}>
            <Image src={FOTOS_CASA.restaurante.src} alt={en ? FOTOS_CASA.restaurante.altEn : FOTOS_CASA.restaurante.alt} fill sizes="(max-width: 1023px) 50vw, 21vw" loading="lazy" className={imgCls} />
          </div>
          <div className={`group aspect-[4/3] lg:aspect-auto ${fotoCls}`}>
            <Image src={FOTOS_CASA.platillos.src} alt={en ? FOTOS_CASA.platillos.altEn : FOTOS_CASA.platillos.alt} fill sizes="(max-width: 1023px) 50vw, 21vw" loading="lazy" className={imgCls} />
          </div>
        </div>

        {/* ── Las cuatro razones: una línea arriba de cada una, sin cajas ── */}
        <ul className="mb-16 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {razones.map((r) => (
            <li key={r.titulo} className="border-t border-negro/15 pt-5">
              <r.Icon className="mb-3 h-5 w-5 text-verde-selva" strokeWidth={1.75} aria-hidden="true" />
              <h3 className="font-dm text-[15px] font-medium text-verde-profundo">{r.titulo}</h3>
              <p className="mt-1.5 font-dm text-[13px] leading-relaxed text-negro/55">{r.texto}</p>
            </li>
          ))}
        </ul>

        {/* ── Alex y Ángel, con cara, nombre y lo que dicen ──
            Los retratos grandes (720×960) estaban solo en las fichas de los
            recorridos acuáticos; en el inicio se veían dos avatares de 48 px.
            Sin caja alrededor: el retrato y la cita se sostienen solos. */}
        <div className="mb-16 grid gap-8 sm:grid-cols-2 lg:gap-12">
          {GUIAS.map((g) => (
            <figure key={g.nombre} className="flex gap-5">
              <div className="relative h-36 w-28 shrink-0 overflow-hidden rounded-2xl bg-negro/5 sm:h-40 sm:w-32">
                <Image
                  src={g.foto}
                  alt={en ? g.fotoAlt.en : g.fotoAlt.es}
                  fill
                  sizes="128px"
                  loading="lazy"
                  className="object-cover"
                  style={{ objectPosition: g.fotoPos }}
                />
              </div>
              <div className="min-w-0 self-center">
                <blockquote className="font-cormorant text-xl italic leading-snug text-verde-profundo sm:text-2xl">
                  &ldquo;{en ? g.frase.en : g.frase.es}&rdquo;
                </blockquote>
                <figcaption className="mt-3 font-dm text-sm text-negro/70">
                  <span className="font-medium text-verde-profundo">{g.apodo ?? g.nombre.split(" ")[0]}</span>
                  {", "}
                  {t(`guía desde ${g.desde}`, `guiding since ${g.desde}`)}
                  <span className="block text-[12px] text-negro/45">
                    {g.origen}. {(en ? g.certificaciones.en : g.certificaciones.es)[0]}
                  </span>
                </figcaption>
              </div>
            </figure>
          ))}
        </div>

        {/* ── Las certificaciones, que vivían al final de la página ──
            Solo los logotipos: la credibilidad es la marca, no un rótulo debajo. */}
        <div className="border-t border-negro/10 pt-10">
          <div className="flex flex-wrap items-center justify-between gap-x-10 gap-y-6">
            <div className="flex flex-wrap items-center gap-x-10 gap-y-6">
              {INSIGNIAS.map((b) => (
                <Image
                  key={b.src}
                  src={b.src}
                  alt={en ? b.altEn : b.alt}
                  width={b.w}
                  height={b.h}
                  loading="lazy"
                  className="h-10 w-auto opacity-55 transition-opacity hover:opacity-100"
                />
              ))}
            </div>
            <Link
              href={lp("/nosotros")}
              prefetch={false}
              className="font-dm text-sm text-verde-selva underline decoration-verde-selva/30 underline-offset-4 transition-colors hover:text-terracota"
            >
              {t("Conoce al equipo", "Meet the team")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
