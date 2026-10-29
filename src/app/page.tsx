import Link from "next/link";
import { BannerViaje } from "@/components/viajeCdmx/BannerViaje";
import { BloqueXantolo } from "@/components/BloqueXantolo";
import { Metadata } from "next";
import Image from "next/image";
import { headers } from "next/headers";
import { DESTINOS_DB } from "@/lib/destinos";
import { TOURS_DB, partesRecogida, GRUPO_MIN, GRUPO_MAX, TOUR_CATEGORIAS, rankTour, salidaCorta } from "@/lib/tours";
import { incluyeDesayuno, rangoPorPersona } from "@/lib/catalogoResumen";
import { PAQUETES_DB, precioVisible, getPaquete } from "@/lib/paquetes";
import { GOOGLE_RATING, GOOGLE_RESENAS, GOOGLE_PERFIL_URL } from "@/lib/resenas";
import { GUIAS } from "@/lib/guias";
import { BuscadorHero, type GrupoOpciones } from "@/components/BuscadorHero";
import { ToursGridFiltrable } from "@/components/ToursGridFiltrable";
import { BloqueConfianza } from "@/components/BloqueConfianza";
import { PruebaSocial } from "@/components/PruebaSocial";
import { MapaRegion } from "@/components/MapaRegion";
import { FaqInicio } from "@/components/FaqInicio";
import { ETIQUETAS, etiquetasDeTour } from "@/lib/etiquetasTour";
import { TAMANO_H1_HERO } from "@/lib/hero";
import { StatTile } from "@/components/StatTile";
import { MagneticButton } from "@/components/MagneticButton";
import { waLink, WA_MESSAGES } from "@/lib/whatsapp";
import { HeroVideo } from "@/components/HeroVideo";
import { CarruselPromos } from "@/components/CarruselPromos";
import { ClimaHero } from "@/components/ClimaHero";
import { BandaTemporada } from "@/components/BandaTemporada";
import { fechaInicioTexto } from "@/lib/temporada";
import { prisma } from "@/lib/prisma";
import { asLocale, localePath, buildAlternates, SITE } from "@/lib/i18n/config";
import { buildOrganizationJsonLd, buildTourOffer, ORG_REF } from "@/lib/jsonld";
import { localizeTour } from "@/lib/i18n/localize";
import { urlBlog } from "@/lib/blogDestinoMap";
import { articulosMasLeidos } from "@/lib/blogMasLeidos";
import { TRASLADOS, tarifaTraslado } from "@/lib/traslados";
import { enAuto, enAutobus } from "@/lib/tiemposDeViaje";
import { HOTEL_PROPIO } from "@/lib/hotelPropio";
import {
  MessageCircle, Star, CheckCircle2,
  Bus, Calendar, BedDouble,
} from "lucide-react";

const SITE_URL = SITE;

export function generateMetadata(): Metadata {
  const locale = asLocale(headers().get("x-locale"));
  // 🔴 El inicio compite por la REGIÓN («huasteca potosina», ~29 mil
  // impresiones al mes) y /tours por la consulta comercial («tours huasteca
  // potosina»). Si los dos títulos vuelven a empezar igual, Google alterna
  // entre ellos y ninguno sube: el de aquí arranca con la región, no con «Tours».
  const title = locale === "en"
    ? "Huasteca Potosina Tours — Mexico's Waterfall Country"
    : "Huasteca Potosina: Cascadas, Guía y Tours desde Xilitla";
  const nTours = TOURS_DB.length;
  const desde = `$${Math.min(...TOURS_DB.map((t) => t.precio)).toLocaleString("es-MX")}`;
  const description = locale === "en"
    ? `Guided tours from Xilitla, with our own hotel and restaurant. ${nTours} tours with NOM-09 guide and insurance, from ${desde} MXN. 30% deposit holds your spot. Free cancellation.`
    : `La Huasteca Potosina desde Xilitla: Tamul, Las Pozas, cascadas, cuándo ir y cómo llegar. ${nTours} tours con guía local desde ${desde}; apartas con el 30 %.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE}${localePath("/", locale)}`,
      siteName: "Tours Huasteca Potosina",
      locale: locale === "en" ? "en_US" : "es_MX",
      type: "website",
      // Sin `images`: la pone `opengraph-image.tsx` de cada raíz (española aquí,
      // inglesa en /en). Declararla aquí las anularía. Ver destinos/page.tsx.
    },
    alternates: buildAlternates("/", locale),
  };
}

export const dynamic = "force-dynamic";

/* Aquí vivía `getRandomPosts`: tres artículos AL AZAR, rotados cada día, como
   tres enlaces de texto al final. Desde el 29 oct 2026 el inicio enseña LOS MÁS
   LEÍDOS (`lib/blogMasLeidos.ts`): visitas reales cuando las hay, y el orden de
   Search Console mientras tanto. */

export default async function HomePage() {
  const locale = asLocale(headers().get("x-locale"));
  const en = locale === "en";
  const lp = (p: string) => localePath(p, locale);
  // El blog solo existe en español: en EN no se hace fetch ni se muestra.
  const masLeidos = en ? [] : await articulosMasLeidos(5);
  const tours = TOURS_DB.map((t) => localizeTour(t, locale));
  /* 🔴 Eran tres slugs elegidos a mano: el 80 % del catálogo no existía desde
     la portada. Ahora van los quince, ordenados por `rankTour` —el orden real
     de ventas del panel, no el alfabético— y se filtran en el cliente. */
  const toursOrdenados = [...tours].sort((a, b) => rankTour(a.slug) - rankTour(b.slug));

  /* Los del `ItemList` de datos estructurados. Son seis y no los quince a
     propósito: /tours ya publica el catálogo entero y es la página que compite
     por «tours huasteca potosina»; repetir ahí el mismo ItemList pone a las dos
     a pelearse por la misma consulta. */
  const toursDestacados = toursOrdenados.slice(0, 6);

  /* Las opciones del buscador del hero: las tres familias del catálogo, las
     etiquetas, y los quince recorridos agrupados por familia. Se arma aquí, en
     el servidor, para no mandar TOURS_DB entero al cliente solo por los nombres. */
  const gruposDeBusqueda: GrupoOpciones[] = [
    {
      grupo: en ? "By type" : "Por tipo",
      opciones: [
        ...TOUR_CATEGORIAS
          .filter((c) => tours.some((t) => t.categoria === c.id))
          .map((c) => ({ valor: `cat:${c.id}`, etiqueta: en ? c.labelEn : c.label })),
        ...ETIQUETAS
          .filter((e) => tours.some((t) => etiquetasDeTour(t).includes(e.id)))
          .map((e) => ({ valor: `tag:${e.id}`, etiqueta: en ? e.labelEn : e.label })),
      ],
    },
    ...TOUR_CATEGORIAS.map((c) => ({
      grupo: en ? c.labelEn : c.label,
      opciones: toursOrdenados
        .filter((t) => t.categoria === c.id)
        /* `salida` viaja con cada recorrido para que el calendario del hero
           diga la hora de ESE tour al elegir el día. Sin ella escribía la misma
           para todos, y la Gruta de Xilo sale a las 7 de la NOCHE. */
        .map((t) => ({ valor: `tour:${t.slug}`, etiqueta: t.nombreCorto, salida: salidaCorta(t, en) })),
    })).filter((g) => g.opciones.length > 0),
  ];

  /* El muro de fotos de la prueba social: las primeras de las galerías REALES
     de los recorridos. Nada de `/imagenes/reviews/`, que son de banco.

     🔴 8 oct 2026, Manolo: la loseta de «Expedición Tamul» salía con el sótano
     de las Huahuas visto desde el fondo —una foto oscura de un abismo— debajo de
     una etiqueta que promete una cascada. Para los recorridos de esta lista la
     loseta usa la PORTADA de su ficha, que es la foto por la que se entra.
     Es una lista y no la regla general porque las otras siete galerías sí
     empiezan con una foto que corresponde a su etiqueta. */
  /* El alt va escrito aquí y no se busca en la galería: `imagen_hero` es solo
     una ruta, sin texto, y las traducciones de `tours.en.ts` van POR POSICIÓN
     dentro de `gallery` —meter la portada ahí correría todas las demás. */
  const PORTADA_EN_EL_MURO: Record<string, { es: string; en: string }> = {
    "expedicion-tamul": {
      es: "Cascada de Tamul — la caída al fondo del cañón, sobre el agua turquesa del Tampaón",
      en: "Tamul Waterfall — the drop at the end of the canyon, above the turquoise Tampaón river",
    },
  };
  const fotosViajeros = toursOrdenados
    .flatMap((t) => {
      const portada = PORTADA_EN_EL_MURO[t.slug];
      if (portada && t.imagen_hero) {
        /* `posicionHero` viaja con ella: el muro recorta en cuadrado y la
           portada está encuadrada para un hero panorámico. */
        return [{
          src: t.imagen_hero,
          alt: en ? portada.en : portada.es,
          tour: t.nombreCorto,
          slug: t.slug,
          pos: t.posicionHero,
        }];
      }
      return t.gallery?.[0]
        ? [{ src: t.gallery[0].src, alt: t.gallery[0].alt, tour: t.nombreCorto, slug: t.slug }]
        : [];
    })
    .slice(0, 9);
  const desdePersona = rangoPorPersona().min;
  const nConTraslado = TOURS_DB.filter((t) => partesRecogida(t, false).incluyeTraslado).length;
  const nConDesayuno = TOURS_DB.filter(incluyeDesayuno).length;
  // Recorridos con política de cancelación propia (hoy el Edén: la Fundación
  // Las Pozas no reembolsa). Toda frase que diga «cancelas gratis» para el
  // catálogo entero los nombra; si no, promete un reembolso que no existe.
  const sinReembolso = tours.filter((t) => t.cancelacion).map((t) => t.nombreCorto);
  const salvoEs = sinReembolso.length ? ` (salvo ${sinReembolso.join(", ")})` : "";
  const salvoEn = sinReembolso.length ? ` (except ${sinReembolso.join(", ")})` : "";

  /* 🔴 Aquí vivían seis píldoras de categoría —Cascadas, Aventura, Cultura,
     Ecoturismo, Fotografía, Bienestar— que apuntaban a
     `/experiencias?tipo=cascadas`. Comprobado el 7 oct 2026: `/experiencias` NO
     lee ningún `searchParams`, así que las seis llevaban al mismo listado sin
     filtrar. Eran adorno, y su taxonomía no existe en el catálogo. Su trabajo
     lo hace ahora el filtro de verdad de `ToursGridFiltrable` (las tres
     familias de `TOUR_CATEGORIAS` más las etiquetas de `etiquetasTour.ts`). */

  const REGION_STATS = [
    { num: "105m",                   label: en ? "The tallest waterfall" : "La cascada más alta" },
    /* 🔴 Decía «333 m · Sótano más profundo». Esos 333 m son del Sótano de las
       Golondrinas, que NO operamos (Golondrinas y Huahuas son sitios distintos;
       ver la nota de `temporada.ts`). El nuestro es el Sótano de las Huahuas y
       mide 478 m — la misma cifra que ya corrigieron las fichas el 28 sep. */
    { num: "478m",                   label: en ? "Our sinkhole, Las Huahuas" : "Sótano de las Huahuas" },
    { num: `+${DESTINOS_DB.length}`, label: en ? "Unique destinations"   : "Destinos únicos" },
    { num: en ? "Year-round" : "Todo el año", label: en ? "Open season"  : "Temporada abierta" },
  ];

  const websiteSchema = {
    "@context": "https://schema.org", "@type": "WebSite",
    name: "Tours Huasteca Potosina", url: `${SITE_URL}${lp("/")}`,
    description: "Tourism in the Huasteca Potosina, San Luis Potosí, Mexico",
    inLanguage: en ? "en" : "es-MX",
    publisher: ORG_REF,
  };
  // La home publicaba su propia `TouristAgency`, distinta y más pobre que la de
  // /nosotros. Ahora las dos emiten LA MISMA entidad (`ORG_ID`), que es lo que
  // permite a Google y a los buscadores de IA saber que hablan del mismo negocio.
  const agencySchema = buildOrganizationJsonLd(locale);

  // El inicio enseñaba 3 tours y 3 paquetes con su precio a la vista y NINGUNO
  // existía para una máquina: solo emitía WebSite y la ficha de empresa. Estas
  // dos listas son exactamente lo que se ve en pantalla —los mismos 3 y 3,
  // leídos de TOURS_DB y PAQUETES_DB—, así que no pueden quedarse desfasadas.
  // Sin `aggregateRating` a propósito: el único que hay vive en el nodo de
  // empresa y no se copia a los elementos.
  const destacadosItemListSchema = {
    "@context": "https://schema.org", "@type": "ItemList",
    name: en ? "Featured Huasteca Potosina tours" : "Tours destacados de la Huasteca Potosina",
    url: `${SITE_URL}${lp("/")}`,
    inLanguage: en ? "en" : "es-MX",
    numberOfItems: toursDestacados.length,
    itemListElement: toursDestacados.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "TouristTrip",
        name: t.nombre,
        description: t.descripcion,
        url: `${SITE_URL}${lp(`/tours/${t.slug}`)}`,
        image: t.imagen_hero?.startsWith("http") ? t.imagen_hero : `${SITE_URL}${t.imagen_hero}`,
        provider: ORG_REF,
        // La MISMA oferta que /reservar, /precios y la ficha: unidad como dato
        // (`unitText`) y rango cuando lo hay. El ternario vehículo/persona que
        // estaba aquí habría declarado "por persona" al Edén, que es por grupo.
        offers: buildTourOffer(t, locale, `${SITE_URL}${lp(`/tours/${t.slug}`)}`),
      },
    })),
  };

  // Los paquetes solo se pintan en español (la sección va dentro de `!en`), así
  // que la lista tampoco se emite en inglés: declararía algo que no está.
  const paquetesItemListSchema = {
    "@context": "https://schema.org", "@type": "ItemList",
    name: "Paquetes todo incluido de la Huasteca Potosina",
    url: `${SITE_URL}/`,
    inLanguage: "es-MX",
    numberOfItems: PAQUETES_DB.length,
    itemListElement: PAQUETES_DB.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Product",
        name: p.nombre,
        description: `${p.subtitulo}. ${p.duracion} con tours y hospedaje incluidos.`,
        image: `${SITE_URL}${p.imagen}`,
        url: `${SITE_URL}/paquetes/${p.slug}`,
        brand: { "@type": "Brand", name: "Tours Huasteca Potosina" },
        offers: {
          // 🔴 EXACTAMENTE la misma forma que el `Offer` de /paquetes y de
          // /paquetes/[slug]: las tres páginas describen el MISMO `url` de
          // producto, así que si aquí el `price` fuera el total de la pareja
          // ($12,500) y allí el que se enseña ($6,250), Google vería dos
          // precios distintos para la misma oferta y se quedaría con el que
          // quisiera. El `price` es el importe que se ENSEÑA (`precioVisible`);
          // lo que cobra el motor no se pierde: `priceSpecification` dice a
          // cuánta gente corresponde ese importe y `eligibleQuantity` que la
          // reserva arranca en dos personas, que es justo lo que cobra el
          // checkout. Mismo patrón que /tours con el RZR, que va por vehículo.
          "@type": "Offer",
          price: precioVisible(p),
          priceCurrency: "MXN",
          availability: "https://schema.org/InStock",
          url: `${SITE_URL}/paquetes/${p.slug}`,
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: precioVisible(p),
            priceCurrency: "MXN",
            unitText: p.precioPorPersona ? "por persona" : "por pareja (2 personas)",
          },
          eligibleQuantity: {
            "@type": "QuantitativeValue",
            minValue: 2,
            unitText: "personas",
          },
          description: `$${precioVisible(p).toLocaleString("es-MX")} MXN ${p.precioLabel} · ${p.duracion}`,
        },
      },
    })),
  };

  // 🔴 La cifra citable del bloque en inglés («contra Costa Rica se gana con el
  // precio real») estaba escrita A MANO: decía «$16,500 MXN for two people» y
  // ningún paquete costaba eso. Ahora sale de PAQUETES_DB.
  // Va con `p.precio` a propósito: la frase dice «for two people», o sea el
  // total de la pareja, no `precioVisible`.
  // 28 sep 2026: buscaba "tu-huasteca", que ya no existe, y salía bien de
  // casualidad por el `?? PAQUETES_DB[0]`. Ahora se nombra el paquete: Inmersión
  // Huasteca (3 días / 2 noches, el de entrada). Días, noches y precio salen de
  // su ficha, así que la frase no se desfasa si cambian.
  const paqueteIngles = getPaquete("inmersion-huasteca") ?? PAQUETES_DB[0];

  /* 🔴 Aquí vivían TRES RESEÑAS INVENTADAS («Carlos M.» de Monterrey, «Ana
     González» de CDMX, «Sofía R.» de Guadalajara), con caras de banco de
     imágenes, debajo de un H2 que decía «161 Reseñas · 4.7 estrellas»: la cifra
     real de Google envolviendo citas falsas. Se fueron el 7 oct 2026. Lo que se
     pinta ahora sale de `lib/resenasReales.ts`, que nace VACÍO: hasta que
     Manolo copie las de su perfil, el inicio no muestra ninguna cita. */
  /* ══════════════════════════════════════════════════════════════════════
     🔴 REDISEÑO DEL INICIO (29 oct 2026). Qué cambió y por qué, en corto:
      · Una sola forma de arrancar sección: titular grande a la IZQUIERDA con
        una palabra en cursiva dorada, y un párrafo corto debajo. Fuera las
        cejas en mayúsculas (había 70 rótulos así en la portada), la rayita
        animada bajo cada titular y el brillo dorado que se movía en todos.
      · Un solo tema después del hero: todo claro (crema y blanco), y el único
        bloque oscuro es el cierre. Antes la página saltaba de claro a oscuro
        seis veces y se sentía como seis sitios pegados.
      · El hero va alineado a la izquierda y sin la palabra que se escribía
        sola: el H1 dice siempre «La Huasteca Potosina», que es la consulta por
        la que compite esta página (ver generateMetadata). La línea de
        confianza se quedó con lo que más pesa: la calificación real y la
        cancelación.
      · Fuera lo que repetía: «Reserva directo» (sus cinco puntos ya estaban en
        «Por qué con nosotros»), la calificación de Google en cuatro sitios
        (ahora en dos), las píldoras del recomendador y las hojas flotantes.
      · Esquinas: superficies y fotos en `rounded-2xl`, botones y píldoras
        redondos del todo. Antes convivían cuadrado, `rounded`, `rounded-xl`
        y `rounded-2xl` en la misma pantalla.
     El respaldo de la versión anterior es el commit 96ca2c3 (`git show
     96ca2c3:src/app/page.tsx`) y los componentes del mismo commit.
     ══════════════════════════════════════════════════════════════════════ */

  /* Las clases que comparten los titulares de sección, para que no se vuelvan
     a separar en seis variantes. */
  const H2 = "font-cormorant font-light leading-[1.08] text-verde-profundo";
  const H2_SIZE = { fontSize: "clamp(36px,4.6vw,58px)" };
  const LEAD = "mt-4 max-w-[60ch] font-dm text-[15px] leading-relaxed text-negro/60 sm:text-base";
  /* El botón principal: dorado = «reservar» en todo el sitio. */
  const BOTON_DORADO =
    "inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-dorado px-8 font-dm text-[15px] font-medium text-negro " +
    "transition-[background-color,transform] duration-200 ease-out hover:bg-lima active:scale-[0.98]";
  const ENLACE = "font-dm text-sm text-verde-selva underline decoration-verde-selva/30 underline-offset-4 transition-colors hover:text-terracota";

  return (
    <main id="main-content" className="min-h-screen bg-crema">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(agencySchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(destacadosItemListSchema) }} />
      {!en && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(paquetesItemListSchema) }} />
      )}

      {/* ── HERO ── */}
      <section
        aria-label={en ? "Welcome to the Huasteca Potosina" : "Bienvenida a la Huasteca Potosina"}
        /* Marcador para `BarraInferiorMovil`: en el celular la barra de abajo
           sale solo cuando este hero ya pasó, para no tapar su «Reservar tour». */
        data-hero-inicio=""
        /* 🔴 `min-h-[100svh]` y `svh`, no `vh`: en el teléfono `vh` cuenta la barra
           de direcciones que luego se esconde. El menú es `fixed` y se pinta encima,
           así que el relleno de arriba (`pt-[9.5rem]`) es mayor que la barra del
           río + el menú (109 px) para que nada se meta debajo.
           El contenido se ancla ABAJO (`justify-end`): el buscador queda pegado al
           borde inferior de la primera pantalla, que es donde el pulgar llega, y
           si el contenido fuera más alto que la pantalla la sección crece, no se
           reparte el sobrante por arriba. */
        className="relative flex min-h-[100svh] flex-col justify-end overflow-hidden bg-negro px-6 pb-14 pt-[9.5rem] supports-[overflow:clip]:overflow-clip sm:pb-20 sm:pt-32"
      >
        {/* El video se queda FIJO a la pantalla mientras se baja por el hero.
            `overflow-clip` y no `hidden`: `hidden` crea un contenedor de
            scroll y apaga el `sticky`. */}
        <div className="absolute inset-0" aria-hidden="true">
          <div className="sticky top-0 h-lvh w-full overflow-hidden">
            <HeroVideo alt={en ? "Tamul Waterfall in the Huasteca Potosina" : "Cascada de Tamul en la Huasteca Potosina"} />
          </div>
        </div>
        {/* Más oscuro abajo que arriba: el texto y el buscador viven en la
            mitad inferior y la cascada respira en la superior. */}
        <div className="absolute inset-0 bg-gradient-to-b from-negro/45 via-negro/35 to-negro/90" />

        <div className="relative z-10 mx-auto w-full max-w-6xl">
          {/* El h1 se lee «La Huasteca Potosina» (la región, ver generateMetadata).
              Antes la segunda palabra se escribía sola y rotaba entre cinco; ahora
              es fija: lo que Google y quien lee ven es lo mismo. El tamaño vive en
              TAMANO_H1_HERO. */}
          <h1
            className="max-w-4xl font-cormorant font-light leading-[0.95] tracking-tight text-white drop-shadow-2xl"
            style={{ fontSize: TAMANO_H1_HERO }}
          >
            {en ? "The Huasteca" : "La Huasteca"}
            <br />
            {/* `pb-[0.08em]`: la cursiva lleva una «P» alta y ninguna letra con cola,
                pero el `leading` de 0.95 recorta la cursiva por abajo en Safari. */}
            <em className="inline-block pb-[0.08em] text-dorado">Potosina</em>
          </h1>

          {/* UNA línea de posicionamiento: lo único que los seis competidores
              no pueden pegar en su sitio. «y también salimos desde Ciudad
              Valles» lo pidió Manolo el 8 oct: la mitad de los recorridos
              recoge en Valles. */}
          <p
            className="mt-5 max-w-xl font-dm leading-snug text-crema/85 drop-shadow"
            style={{ fontSize: "clamp(15px,1.8vw,18px)" }}
          >
            {en
              ? "Local operator in Xilitla: the hotel, the restaurant and the guides are ours, and we run departures from Ciudad Valles too."
              : "Operadora local en Xilitla: el hotel, el restaurante y los guías son nuestros, y también salimos desde Ciudad Valles."}
          </p>

          {/* ── EL BUSCADOR ──
              El visitante declara su intención en los primeros segundos. No
              consulta disponibilidad (ver BuscadorHero.tsx). */}
          <div className="mt-8 sm:mt-10">
            <BuscadorHero
              grupos={gruposDeBusqueda}
              minPersonas={GRUPO_MIN}
              maxPersonas={GRUPO_MAX}
            />
          </div>

          {/* ── La línea de confianza, con lo que más pesa ──
              La calificación real de Google y la cancelación con su excepción.
              «Guías NOM-09» y «precio final» viven dos pantallas abajo, en
              «Por qué con nosotros», que es donde se argumentan. */}
          <p className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-1.5 font-dm text-[12px] text-crema/75 drop-shadow sm:text-[13px]">
            <a
              href={GOOGLE_PERFIL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-crema"
            >
              <Star className="h-3.5 w-3.5 fill-dorado text-dorado" aria-hidden="true" />
              <span className="font-medium text-crema">{GOOGLE_RATING}</span>
              {en ? `${GOOGLE_RESENAS} Google reviews` : `${GOOGLE_RESENAS} reseñas en Google`}
            </a>
            <span>{en ? `Free cancellation up to 48 h${salvoEn}` : `Cancelas gratis 48 h antes${salvoEs}`}</span>
          </p>
        </div>
      </section>

      {/* ── EL VIAJE CDMX–XILITLA ── Justo debajo del hero (Manolo, 15 oct 2026).
          Solo en español: el viaje solo se vende así. */}
      {!en && <BannerViaje origen="inicio" />}
      {/* Y debajo, el paquete de Xantolo con su patrón de temporada; se va solo cuando deja de venderse. */}
      {!en && <BloqueXantolo origen="inicio" />}

      {/* ── PANTALLA 2 · EL PRODUCTO ──────────────────────────────────────
          Pegado al hero: el primer recorrido con precio estaba en la posición
          8, a cuatro pantallas de scroll, y salían 3 de los 15. */}
      <section aria-label={en ? "Discover the region's tours" : "Descubre los destinos de la región"} className="mx-auto max-w-7xl px-6 py-20 sm:py-24">
        <div className="reveal-up mb-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h2 className={H2} style={H2_SIZE}>
              {en ? <>Our <em className="text-dorado">tours</em></> : <>Nuestros <em className="text-dorado">tours</em></>}
            </h2>
            <p className={LEAD}>
              {/* El número sale de TOURS_DB (el mismo Math.min que usa la meta
                  description), no escrito a mano. Los dos conteos salen del
                  catálogo (`catalogoResumen.ts`). */}
              {en
                ? `${TOURS_DB.length} guided tours from $${desdePersona.toLocaleString("es-MX")} MXN per person: ${nConTraslado} pick you up at your lodging and ${nConDesayuno} include breakfast.`
                : `${TOURS_DB.length} recorridos guiados desde $${desdePersona.toLocaleString("es-MX")} MXN por persona: ${nConTraslado} pasan por ti a tu hospedaje y ${nConDesayuno} incluyen desayuno.`}
            </p>
          </div>

          {/* Los guías reales, al frente de la sección (Manolo, 29 sep 2026):
              caras y nombres antes que las tarjetas. */}
          <div className="flex items-center gap-3.5 lg:pb-1">
            <div className="flex flex-shrink-0 -space-x-3">
              {GUIAS.map((g) => (
                <Image
                  key={g.nombre}
                  src={g.fotoCara}
                  alt=""
                  width={96}
                  height={96}
                  className="h-12 w-12 rounded-full object-cover ring-2 ring-crema"
                />
              ))}
            </div>
            <p className="max-w-[300px] font-dm text-sm leading-snug text-negro/60">
              {en
                ? <>Guided by <span className="font-medium text-verde-profundo">Alex</span> and <span className="font-medium text-verde-profundo">Ángel</span>, NOM-09 certified guides from Xilitla</>
                : <>Te guían <span className="font-medium text-verde-profundo">Alex</span> y <span className="font-medium text-verde-profundo">Ángel</span>, guías certificados NOM-09, de Xilitla</>}
            </p>
          </div>
        </div>

        {/* El catálogo COMPLETO, con filtro de verdad. Sin `conLogo`: solo seis de
            los quince tienen logotipo y en una fila de quince la mitad salía con
            un rótulo enorme encima y la otra mitad sin nada. */}
        <ToursGridFiltrable tours={toursOrdenados} hrefCatalogo={lp("/tours")} />
      </section>

      {/* ── TEMPORADA ── Se esconde sola fuera de temporada. */}
      <BandaTemporada en={en} hrefTours={lp("/tours")} />

      {/* ── PANTALLA 3 · POR QUÉ CON NOSOTROS ── Un solo bloque. */}
      <BloqueConfianza locale={locale} />

      {/* ── QUÉ INCLUYE Y QUÉ NO (solo EN) ──────────────────────────────
          El viajero de EE. UU. está entrenado para buscar el costo oculto, y
          encontrarlo DECLARADO con precio desactiva la desconfianza de golpe.
          Las tarifas salen de `traslados.ts` a propósito. */}
      {en && (
        <section aria-label="What's included and what isn't" className="border-t border-negro/10 bg-white px-6 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="reveal-up mb-12 max-w-2xl">
              <h2 className={H2} style={H2_SIZE}>
                What&apos;s included, and <em className="text-dorado">what isn&apos;t</em>
              </h2>
              <p className={LEAD}>No surprises: the whole list, with the prices of what we don&apos;t include.</p>
            </div>

            <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:gap-16">
              <div className="reveal-up">
                <h3 className="mb-5 border-t border-negro/15 pt-5 font-dm text-[15px] font-medium text-verde-profundo">
                  In every tour
                </h3>
                <ul className="space-y-3.5 font-dm text-sm leading-relaxed text-negro/65">
                  <li className="flex gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-verde-vivo" aria-hidden="true" />
                    <span><strong className="text-negro/85">Travel and adventure insurance</strong> for every traveler, already in the price.</span>
                  </li>
                  <li className="flex gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-verde-vivo" aria-hidden="true" />
                    <span><strong className="text-negro/85">A NOM-09 certified guide</strong>, Mexico&apos;s federal standard. Ours were born in these mountains.</span>
                  </li>
                  <li className="flex gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-verde-vivo" aria-hidden="true" />
                    {/* Al RZR se llega a la base y al buceo por tu cuenta: el conteo
                        es el mismo de la sección de tours. */}
                    <span><strong className="text-negro/85">Safety equipment</strong> wherever the activity calls for it, and a ride from your lodging on {nConTraslado} of the {TOURS_DB.length} tours.</span>
                  </li>
                  <li className="flex gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-verde-vivo" aria-hidden="true" />
                    <span><strong className="text-negro/85">Groups capped at {GRUPO_MAX}.</strong> We intend to keep it that way.</span>
                  </li>
                </ul>
              </div>

              <div className="reveal-up reveal-d1">
                <h3 className="mb-5 border-t border-negro/15 pt-5 font-dm text-[15px] font-medium text-terracota">
                  Not included, and here&apos;s the price
                </h3>
                <p className="mb-4 font-dm text-sm leading-relaxed text-negro/65">
                  <strong className="text-negro/85">Airport transfers.</strong> Private, round trip, priced per vehicle (not per person) for up to 12 passengers.
                </p>
                <ul className="mb-5 space-y-2">
                  {TRASLADOS.map((ruta) => {
                    const desde = tarifaTraslado(ruta, 1);
                    return (
                      <li key={ruta.slug} className="flex items-baseline justify-between gap-3 border-t border-negro/8 pt-2 font-dm text-sm">
                        {/* Cada renglón dice que es un traslado privado y que se
                            cobra por vehículo: un buscador con IA lo citaba como
                            el precio del TOUR desde la CDMX (16 oct 2026). */}
                        <span className="text-negro/70">Private transfer, {ruta.ciudad} to Xilitla and back</span>
                        <span className="font-medium tabular-nums text-verde-profundo">
                          {desde ? `from $${desde.precio.toLocaleString("en-US")} MXN per vehicle` : "on request"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <p className="font-dm text-sm leading-relaxed text-negro/65">
                  <strong className="text-negro/85">Flights</strong>, any meals not listed on your itinerary{TOURS_DB.length > nConTraslado ? <>, and getting to the meeting point on the {TOURS_DB.length - nConTraslado} tours that don&apos;t pick you up</> : null}. That&apos;s the whole list.
                </p>
              </div>
            </div>

            <ul className="mt-12 flex flex-wrap gap-x-8 gap-y-2 border-t border-negro/10 pt-6 font-dm text-[13px] text-negro/55">
              {/* Un tour de un día sin hotel se cobra entero (`pctACobrar`): el
                  30 % a secas mentía justo en el producto más vendido. */}
              <li>30% deposit holds any tour, the rest on tour day</li>
              <li>Free cancellation up to 48 h{salvoEn}</li>
              <li>Apple&nbsp;Pay, Google&nbsp;Pay and card</li>
              <li>English-speaking guide on request, at no extra cost</li>
            </ul>
          </div>
        </section>
      )}

      {/* ── PAQUETES TODO INCLUIDO (solo ES) ──
          Texto a la izquierda y el cartel a la derecha. Fondo claro: antes era
          el segundo bloque negro de la página. El cartel es el mismo carrusel
          (`CarruselPromos`), con sus controles en tema claro. */}
      {!en && (
        <section aria-label="Paquetes todo incluido: tours + hospedaje" className="border-t border-negro/10 bg-arena/30 px-6 py-20 sm:py-24">
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-center lg:gap-20">
            <div className="reveal-up">
              <h2 className={H2} style={H2_SIZE}>
                Paquetes <em className="text-dorado">todo incluido</em>
              </h2>
              <p className={LEAD}>
                {/* Todo sale de PAQUETES_DB y de `precioVisible`, NO de `p.precio`:
                    con `p.precio` diría «de $9,800 a $20,500» mientras las tarjetas
                    enseñan de $6,250 a $10,250, dos cifras que no cuadran en la
                    misma página. */}
                Combinamos nuestros tours con hospedaje en el Hotel Paraíso Encantado Xilitla. Tú solo preocúpate por llegar.
              </p>
              <p className="mt-3 max-w-[60ch] font-dm text-[15px] leading-relaxed text-negro/60 sm:text-base">
                Los {PAQUETES_DB.length} paquetes van de {Math.min(...PAQUETES_DB.map((p) => p.dias))} a {Math.max(...PAQUETES_DB.map((p) => p.dias))} días
                {" "}y cuestan de ${Math.min(...PAQUETES_DB.map((p) => precioVisible(p))).toLocaleString("es-MX")} a ${Math.max(...PAQUETES_DB.map((p) => precioVisible(p))).toLocaleString("es-MX")} MXN {new Set(PAQUETES_DB.map((p) => p.precioLabel)).size === 1 ? PAQUETES_DB[0].precioLabel : "según el paquete"}.
                {" "}Apartas con el 30 % y liquidas el resto el día del tour.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
                <MagneticButton className="inline-block">
                  <Link href="/paquetes" className={BOTON_DORADO}>
                    Ver los {PAQUETES_DB.length} paquetes
                  </Link>
                </MagneticButton>
                {/* /precios es la página que responde la pregunta que trae a la
                    gente. Sólo en español: no existe /en/precios. */}
                <Link href="/precios" className={ENLACE}>
                  Lista de precios 2026 de tours y paquetes
                </Link>
              </div>
            </div>

            {/* Sin prioridad: está pantallas abajo y su `priority` le quitaba
                ancho de banda al póster del hero. */}
            <div className="reveal-up reveal-d1">
              <CarruselPromos cargaDiferida tema="claro" />
            </div>
          </div>
        </section>
      )}

      {/* ── PANTALLA 5 · PRUEBA SOCIAL ── Solo lo que existe de verdad. */}
      <PruebaSocial locale={locale} fotos={fotosViajeros} />

      {/* ── PANTALLA 6 · EL MAPA ── */}
      <MapaRegion locale={locale} />

      {/* ── POR QUÉ LA HUASTECA ──
          Párrafo citable arriba y la fila de cifras debajo, sin cajas. Antes
          eran cuatro tarjetas iguales a la derecha de un texto: el tercer
          «texto a un lado, cosa al otro» seguido en la página. */}
      <section aria-label={en ? "Why visit the Huasteca Potosina" : "Por qué visitar la Huasteca Potosina"} className="border-t border-negro/10 bg-white px-6 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="reveal-up max-w-2xl">
            <h2 className={H2} style={H2_SIZE}>
              {en ? <>Half the flight, <em className="text-dorado">a third of the bill</em></> : <>Una región que <em className="text-dorado">te cambia</em></>}
            </h2>
            <div className="mt-5 max-w-[65ch] space-y-4 font-dm text-[15px] leading-relaxed text-negro/60 sm:text-base">
              {en ? (
                <>
                  {/* Misma frase citable que en español (paridad ES/EN): un lector
                      americano no ha oído el nombre en su vida. Fuente: llmsTxt.ts. */}
                  <p>The Huasteca Potosina is a natural region in the northeast of the state of San Luis Potosí, Mexico: Ciudad Valles is its hub city and Xilitla, the Pueblo Mágico where we are based, sits about {enAuto("tampico", "xilitla", true)} from Tampico airport (TAM).</p>
                  {/* Contra Costa Rica no se gana con adjetivos, se gana con el precio
                      real. Los paquetes son POR PAREJA: ese es el dato que convierte.
                      Va con `p.precio` a propósito: la frase dice «for two people». */}
                  <p>{paqueteIngles.dias} days, {paqueteIngles.noches} nights, the tours, the hotel and the insurance: <strong className="text-verde-profundo">${paqueteIngles.precio.toLocaleString("en-US")} MXN for two people</strong>. The price you see on our booking page is the price you pay. Tampico is a short hop from Texas, and from the airport it&apos;s {enAuto("tampico", "xilitla", true)} to Xilitla, in a private vehicle driven by us.</p>
                </>
              ) : (
                /* La consulta que más impresiones trae al inicio es «huasteca
                   potosina» a secas, y detrás hay alguien que todavía no sabe DÓNDE
                   queda ni cómo se llega. Esta frase es la única del inicio que se
                   puede citar sola. Datos de GEOGRAFIA y COMO_LLEGAR en llmsTxt.ts;
                   las horas salen de `tiemposDeViaje.ts`, nunca escritas a mano. */
                <p>La Huasteca Potosina es una región natural del noreste del estado de San Luis Potosí, en México: su ciudad de entrada es Ciudad Valles y su Pueblo Mágico es Xilitla, donde tenemos nuestra base. Se llega en avión a Tampico (TAM), a unas {enAuto("tampico")} de Xilitla, o por carretera desde la Ciudad de México en {enAuto("cdmx")} de auto; en autobús, la salida nocturna desde la Terminal Central del Norte llega a Xilitla a la mañana siguiente.</p>
              )}
            </div>
            {!en && (
              <p className="mt-6">
                <Link href="/sobre-la-huasteca-potosina" className={ENLACE}>
                  Conoce más sobre la región
                </Link>
              </p>
            )}
          </div>

          <div className="mt-14 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
            {REGION_STATS.map((s) => (
              <StatTile key={s.label} num={s.num} label={s.label} />
            ))}
          </div>
        </div>
      </section>

      {/* ── PANTALLA 7 · LAS DUDAS ── */}
      <FaqInicio locale={locale} />

      {/* ── PANTALLA 8 · LA ÚNICA CAPTURA DE CORREO (solo ES) ────────────
          Una banda con el texto a la izquierda y el botón a la derecha. Fuera
          la etiqueta «✦ Tecnología IA» y las tres píldoras de adorno. La guía
          PDF sigue en /guia (decisión de Manolo, 7 oct). */}
      {!en && (
        <>
          <section aria-label="Planea tu viaje con IA" className="border-t border-negro/10 bg-crema px-6 py-20 sm:py-24">
            <div className="reveal-up mx-auto grid max-w-6xl gap-8 rounded-2xl border border-negro/10 bg-white px-7 py-10 sm:px-12 sm:py-14 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-16">
              <div>
                <h2 className={H2} style={{ fontSize: "clamp(32px,4vw,50px)" }}>
                  Tu viaje, <em className="text-dorado">diseñado en 2 minutos</em>
                </h2>
                <p className={LEAD}>
                  Dinos de dónde vienes, cuántos días tienes y qué te emociona. Te recomendamos tu tour ideal y, con 3 días o más, un plan completo con hospedaje.
                </p>
              </div>
              <div className="flex flex-col items-start gap-3 lg:items-end">
                <MagneticButton className="inline-block">
                  <Link href="/recomendar" className={BOTON_DORADO}>
                    Descubrir mi tour ideal
                  </Link>
                </MagneticButton>
                <p className="font-dm text-xs text-negro/45">Gratis. Te lo enviamos por correo.</p>
              </div>
            </div>
          </section>

          {/* ── ANTES DE VIAJAR ──
              El clima a la izquierda, los tres datos prácticos a la derecha en
              renglones. Antes eran tres tarjetas iguales en fila. */}
          <section aria-label="Información práctica para tu viaje" className="border-t border-negro/10 bg-white px-6 py-20 sm:py-24">
            <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-20">
              <div className="reveal-up">
                <h2 className={H2} style={H2_SIZE}>
                  Antes de <em className="text-dorado">viajar</em>
                </h2>
                <p className={LEAD}>
                  El clima de los próximos días en Xilitla y lo que conviene saber antes de salir de casa.
                </p>
                {/* El pronóstico de siete días vive aquí, donde alguien que planea
                    el viaje lo busca; en el hero empujaba el buscador fuera del
                    pliegue. `[&>div]:mx-0`: el widget se centra solo y aquí va
                    alineado con el texto. */}
                {/* El widget nació para el hero negro (vidrio oscuro): sobre blanco salía
                    como una caja gris. Aquí se le da el verde de la marca por debajo. */}
                <div className="mt-8 [&>div]:mx-0 [&>div]:mb-0 [&>div]:!bg-verde-profundo [&>div]:!border-verde-profundo">
                  <ClimaHero en={en} />
                </div>
              </div>
              <ul className="reveal-up reveal-d1">
                {[
                  { Icon: Bus,       title: "Cómo llegar",    text: `Ciudad Valles es la puerta de entrada: ${enAuto("cdmx", "valles")} en auto desde CDMX, o ${enAutobus("cdmx", "valles")} en autobús ADO.`, href: "/info-practica#como-llegar" },
                  // La misma regla de temporada.ts (7 oct 2026), con la fecha de su constante.
                  { Icon: Calendar,  title: "Mejor época",    text: `Todo el año. Del ${fechaInicioTexto("es")} a mayo el agua baja clara; de julio a octubre, cascadas a todo caudal y agua con sedimento.`, href: "/info-practica#cuando-viajar" },
                  /* Los datos salen de `hotelPropio.ts`, que es donde viven los que
                     son ciertos, y el enlace va al bloque de la guía que ya tiene
                     fotos, WhatsApp y Google Maps. */
                  { Icon: BedDouble, title: "Dónde quedarse", text: `En Xilitla, a ${HOTEL_PROPIO.metrosALasPozas} m de Las Pozas: ${HOTEL_PROPIO.minutosCaminando} minutos a pie. El hotel es nuestro y tiene su propio restaurante de cocina huasteca.`, href: "/info-practica#hotel-paraiso" },
                ].map((card) => (
                  <li key={card.title} className="flex gap-5 border-t border-negro/10 py-7 first:border-t-0 first:pt-0 lg:first:pt-2">
                    <card.Icon className="mt-1 h-6 w-6 flex-shrink-0 text-verde-selva" strokeWidth={1.75} aria-hidden="true" />
                    <div>
                      <h3 className="font-cormorant text-2xl text-verde-profundo">{card.title}</h3>
                      <p className="mt-2 font-dm text-[15px] leading-relaxed text-negro/60">{card.text}</p>
                      <Link href={card.href} className={`mt-3 inline-block ${ENLACE}`}>Ver más</Link>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </>
      )}

      {/* ── LO MÁS LEÍDO DEL BLOG (solo ES) ──
          Manolo, 29 oct 2026: «una sección de blogs que se muestren los más
          visitados». El primero manda, con su portada; los otros cuatro en
          renglones. Va ANTES del cierre a propósito: el blog es una puerta de
          salida, y el último bloque de la página sigue siendo el de reservar.
          Las portadas van con <img> y no con next/image: son URLs remotas que
          no están en `images.remotePatterns`, igual que en /blog. */}
      {!en && masLeidos.length > 0 && (() => {
        const [primero, ...otros] = masLeidos;
        return (
          <section aria-label="Lo más leído del blog" className="border-t border-negro/10 bg-crema px-6 py-20 sm:py-24">
            <div className="mx-auto max-w-6xl">
              <div className="reveal-up mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                <div className="max-w-2xl">
                  <h2 className={H2} style={H2_SIZE}>
                    Lo más leído <em className="text-dorado">del blog</em>
                  </h2>
                  <p className={LEAD}>
                    Las guías que más gente abre antes de venir: cuándo ir, cuánto cuesta y cómo llegar.
                  </p>
                </div>
                <Link href="/blog" prefetch={false} className={`shrink-0 ${ENLACE}`}>
                  Ver todos los artículos
                </Link>
              </div>

              <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-14">
                {/* El más leído, con portada */}
                <Link href={urlBlog(primero.slug)} prefetch={false} className="group block">
                  {primero.coverImageUrl && (
                    <div className="relative mb-5 aspect-[16/10] overflow-hidden rounded-2xl bg-negro/5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={primero.coverImageUrl}
                        alt={primero.coverImageAlt || primero.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 ease-smooth-out group-hover:scale-[1.03]"
                      />
                    </div>
                  )}
                  <h3 className="font-cormorant text-3xl font-light leading-[1.1] text-verde-profundo transition-colors group-hover:text-verde-selva sm:text-4xl">
                    {primero.title}
                  </h3>
                  <p className="mt-3 line-clamp-2 max-w-[60ch] font-dm text-[15px] leading-relaxed text-negro/60">
                    {primero.excerpt}
                  </p>
                  <p className="mt-3 font-dm text-[13px] text-negro/45">{primero.readingTime} min de lectura</p>
                </Link>

                {/* Los que siguen, en renglones */}
                <ol className="flex flex-col">
                  {otros.map((p) => (
                    <li key={p.slug} className="border-t border-negro/15 first:border-t-0 lg:first:border-t">
                      <Link href={urlBlog(p.slug)} prefetch={false} className="group flex gap-4 py-5 lg:py-6">
                        {p.coverImageUrl && (
                          <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-negro/5">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={p.coverImageUrl}
                              alt=""
                              loading="lazy"
                              className="h-full w-full object-cover transition-transform duration-500 ease-smooth-out group-hover:scale-[1.04]"
                            />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h3 className="font-cormorant text-xl font-normal leading-snug text-verde-profundo transition-colors group-hover:text-verde-selva sm:text-2xl">
                            {p.title}
                          </h3>
                          <p className="mt-1.5 font-dm text-[13px] text-negro/45">{p.readingTime} min de lectura</p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </section>
        );
      })()}

      {/* ── CIERRE ── El único bloque oscuro después del hero: quien llegó
          hasta abajo es el más interesado, y aquí tiene qué pulsar. */}
      <section aria-label={en ? "Book your trip" : "Reserva tu viaje"} className="bg-verde-profundo px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <h2
            className="reveal-up font-cormorant font-light leading-[1.05] text-crema"
            style={{ fontSize: "clamp(38px,5.5vw,68px)" }}
          >
            {en ? <>Come before we&apos;re the reason <em className="text-dorado">it changed</em></> : <>Tu viaje a la Huasteca <em className="text-dorado">empieza aquí</em></>}
          </h2>
          {/* La urgencia en inglés va INVERTIDA a propósito: para el viajero
              americano informado «el próximo Tulum» es el destino arruinado. La
              escasez honesta es la temporada seca (temporada.ts). */}
          <p className="reveal-up reveal-d1 mx-auto mt-6 max-w-xl font-dm text-[15px] leading-relaxed text-crema/65">
            {en
              ? `We'd like to keep the rivers the way they are, so our groups stop at ${GRUPO_MAX} and we work with the communities we grew up in. From ${fechaInicioTexto("en")} through May the water runs clear. A 30% deposit holds any trip, with the balance due on tour day. Free cancellation up to 48 h before${salvoEn}.`
              : `Elige tus recorridos y súmale las noches que necesites: apartas con el 30 % y liquidas el resto el día del tour. Cancelas gratis hasta 48 h antes${salvoEs}.`}
          </p>
          <div className="reveal-up reveal-d2 mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <MagneticButton className="inline-block">
              <Link href={lp("/reservar")} className={BOTON_DORADO}>
                {en ? "Book now" : "Reservar ahora"}
              </Link>
            </MagneticButton>
            <a
              href={waLink(en ? "Hi! I'd like to ask about your Huasteca Potosina tours." : WA_MESSAGES.general)}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-full border border-crema/30 px-8 font-dm text-[15px] font-medium text-crema transition-[background-color,border-color,transform] duration-200 ease-out [@media(hover:hover)]:hover:border-crema [@media(hover:hover)]:hover:bg-crema/10 active:scale-[0.98]"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              {en ? "Ask on WhatsApp" : "Preguntar por WhatsApp"}
            </a>
          </div>
        </div>
      </section>

      {/* El pie de página vive en el shell (SiteFooter), para que lo tengan las
          43 páginas y no solo la home. */}
    </main>
  );
}
