import Link from "next/link";
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
import { HeroTypewriter } from "@/components/HeroTypewriter";
import { StatTile } from "@/components/StatTile";
import { MagneticButton } from "@/components/MagneticButton";
import { ReservaDirecto } from "@/components/ReservaDirecto";
import { waLink, WA_MESSAGES } from "@/lib/whatsapp";
import { HeroVideo } from "@/components/HeroVideo";
import { CarruselPromos } from "@/components/CarruselPromos";
import { ClimaHero } from "@/components/ClimaHero";
import { VisitantesEnVivo } from "@/components/VisitantesEnVivo";
import { FloatingLeaves } from "@/components/FloatingLeaves";
import { BandaTemporada } from "@/components/BandaTemporada";
import { fechaInicioTexto } from "@/lib/temporada";
import { prisma } from "@/lib/prisma";
import { asLocale, localePath, buildAlternates, SITE } from "@/lib/i18n/config";
import { buildOrganizationJsonLd, buildTourOffer, ORG_REF } from "@/lib/jsonld";
import { localizeTour } from "@/lib/i18n/localize";
import { urlBlog } from "@/lib/blogDestinoMap";
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

async function getRandomPosts() {
  try {
    const all = await prisma.blogPost.findMany({
      where: { published: true },
      select: {
        slug: true, title: true, excerpt: true, coverImageUrl: true,
        coverImageAlt: true, tags: true, readingTime: true, publishedAt: true,
      },
    });
    const seed = Math.floor(Date.now() / 86_400_000);
    return all
      .map((p, i) => ({ p, sort: (seed * 2654435761 + i * 40503) % all.length }))
      .sort((a, b) => a.sort - b.sort)
      .slice(0, 3)
      .map((x) => x.p);
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const locale = asLocale(headers().get("x-locale"));
  const en = locale === "en";
  const lp = (p: string) => localePath(p, locale);
  // El blog solo existe en español: en EN no se hace fetch ni se muestra.
  const recentPosts = en ? [] : await getRandomPosts();
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
    .slice(0, 8);
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
        /* 🔴 `min-h-[100svh]` y no `90vh`, con el relleno de arriba más grande que la
           barra del río + el menú (109 px en el teléfono).
           El menú es `fixed` y el hero empieza en y=0, debajo de él. Con
           `justify-center`, cuando el contenido es más alto que el hueco
           disponible el sobrante se reparte por ARRIBA y por abajo: el relleno
           deja de ser un suelo. Al crecer el buscador —el calendario de verdad
           ocupa más que el campo de fecha que había— la ceja («✦ Tours Huasteca
           Potosina · San Luis Potosí ✦») se subió a y=96 y quedó TAPADA por el
           menú. Con la pantalla completa el sobrante desaparece y vuelve a
           caber. `svh` y no `vh`: en el teléfono `vh` cuenta la barra de
           direcciones que luego se esconde. */
        /* 🔴 En el TELÉFONO el contenido se ancla arriba (`justify-start`) con un
           relleno mayor que la barra del río + el menú, que son fijos y se
           pintan encima del hero. Con `justify-center` el relleno NO es un
           suelo: en cuanto el contenido pasa del hueco disponible, el sobrante
           se reparte por arriba y la ceja se mete debajo del menú — a 360 px
           quedaban 4 px de holgura. Anclado arriba, la holgura es fija y de
           paso el buscador sube. En `sm` para arriba sobra sitio y vuelve a ir
           centrado, que es como se diseñó.
           `svh` y no `vh`: en el teléfono `vh` cuenta la barra de direcciones
           que luego se esconde. */
        className="relative min-h-[100svh] flex flex-col items-center justify-start sm:justify-center text-center px-6 pt-[9.5rem] pb-14 sm:pt-32 bg-negro overflow-hidden supports-[overflow:clip]:overflow-clip"
      >
        {/* El video se queda FIJO a la pantalla mientras se baja por el hero.
            El hero mide casi dos pantallas en el teléfono (390×1514) y más de
            una en escritorio (1440×1347): estirado a todo el hero, el corte
            vertical perdía más de la mitad del ancho. Así siempre se ve el
            cuadro completo y el texto pasa por encima.
            `overflow-clip` y no `hidden`: `hidden` crea un contenedor de
            scroll y apaga el `sticky`. Safari < 16 no conoce `clip`, se queda
            con `hidden` y el video simplemente no se pega (se ve bien igual). */}
        <div className="absolute inset-0" aria-hidden="true">
          <div className="sticky top-0 h-lvh w-full overflow-hidden">
            <HeroVideo alt={en ? "Tamul Waterfall in the Huasteca Potosina" : "Cascada de Tamul en la Huasteca Potosina"} />
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-negro/60 via-negro/50 to-negro/85" />

        {/* 🔴 `lg:max-w-5xl`: el contenedor topaba en 768 px y era él, no el
            buscador, quien le quitaba el ancho. Con tres campos y el botón en
            una fila de 768, «Todos los recorridos» y «Cualquier día» salían
            cortados. El párrafo lleva su propio `max-w-xl`, así que ensanchar
            esto solo afecta al buscador y a la línea de confianza. */}
        <div className="relative z-10 flex w-full max-w-3xl flex-col items-center lg:max-w-5xl">
          {/* La etiqueta va FUERA del h1: el h1 tiene que leerse «La Huasteca
              Potosina» (la región, ver generateMetadata). «Tours Huasteca
              Potosina» es la consulta de /tours. */}
          {/* 🔴 `max-w-full` y menos espaciado en el teléfono: el contenedor es
              un flex centrado, así que cada hijo mide lo que mide su contenido.
              Con 5 px de `tracking` esta línea medía ~460 px y a 390 el hero la
              recortaba por los dos lados («…LUIS POTOSÍ ✦»). */}
          <p className="max-w-full text-[10px] tracking-[2px] sm:tracking-[5px] uppercase text-verde-vivo mb-5 font-dm font-normal drop-shadow-lg">
            ✦ {en ? "Huasteca Potosina Tours" : "Tours Huasteca Potosina"} · San Luis Potosí ✦
          </p>
          {/* 🔴 Medía clamp(64px,12vw,130px). Dos renglones de 130 px, más un
              párrafo de cuatro líneas, se comían la primera pantalla entera y
              los botones de reservar caían debajo del pliegue (medido a
              390×844, un iPhone en vertical). El tamaño vive en
              TAMANO_H1_HERO para que el renglón del typewriter no se vuelva a
              separar de este. */}
          <h1 className="font-cormorant font-light leading-[0.95] tracking-tight mb-5 drop-shadow-2xl">
            <span className="block text-white" style={{ fontSize: TAMANO_H1_HERO }}>
              {en ? "The Huasteca" : "La Huasteca"}
            </span>
            <HeroTypewriter />
          </h1>

          {/* 🔴 Eran cuatro líneas. El texto largo —lo que hay en la región, el
              foso del hotel y los guías, cómo llegar— se mudó al bloque «Por
              qué con nosotros», que es donde alguien que está leyendo quiere
              leerlo. Aquí queda UNA línea de posicionamiento: lo único que los
              seis competidores no pueden pegar en su sitio.
              El inglés conserva el nombre de la región, que un americano no ha
              oído en su vida; el detalle de los 344 pies y Las Pozas vive ahora
              en el bloque de más abajo. */}
          <p className="text-crema/85 max-w-xl mb-7 leading-snug font-dm drop-shadow" style={{ fontSize: "clamp(15px,1.8vw,18px)" }}>
            {/* «y salimos también de Ciudad Valles» lo pidió Manolo el 8 oct:
                sin eso la línea sugiere que hay que dormir en Xilitla, y la
                mitad de los recorridos recoge en Valles. Es además la ciudad de
                entrada de la región, por donde llega casi todo el mundo. */}
            {en
              ? "Local operator in Xilitla, Huasteca Potosina: the hotel, the restaurant and the guides are ours — and we run departures from Ciudad Valles too."
              : "Operadora local en Xilitla: el hotel, el restaurante y los guías son nuestros, y también salimos desde Ciudad Valles."}
          </p>

          {/* ── EL BUSCADOR ──
              Sustituye a los dos botones («Reservar tour» / «Ver los
              recorridos»), que caían debajo del pliegue. Ninguna de las seis
              operadoras grandes del sector usa el hero para poesía: lo usan
              para que el visitante declare su intención en los primeros
              segundos. No consulta disponibilidad (ver BuscadorHero.tsx). */}
          <BuscadorHero
            grupos={gruposDeBusqueda}
            minPersonas={GRUPO_MIN}
            maxPersonas={GRUPO_MAX}
          />

          {/* ── UNA sola línea de confianza ──
              Antes esto eran las estrellas con «Más de 10,000 viajeros» (una
              cifra sin fuente, escrita a mano en trece sitios) y, dos pantallas
              más abajo, una barra blanca que repetía lo mismo. Aquí va solo lo
              verificable: la calificación real de Google, la certificación, la
              cancelación con su excepción y el precio final. */}
          <p className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 font-dm text-[11px] leading-relaxed text-crema/75 drop-shadow sm:text-xs">
            <a
              href={GOOGLE_PERFIL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-crema"
            >
              <Star className="h-3.5 w-3.5 fill-dorado text-dorado" aria-hidden="true" />
              <span className="font-medium text-crema">{GOOGLE_RATING}</span>
              {en ? `· ${GOOGLE_RESENAS} Google reviews` : `· ${GOOGLE_RESENAS} reseñas de Google`}
            </a>
            <span aria-hidden="true" className="text-crema/30">·</span>
            <span>{en ? "NOM-09 certified guides" : "Guías certificados NOM-09"}</span>
            <span aria-hidden="true" className="text-crema/30">·</span>
            <span>{en ? `Free cancellation up to 48 h${salvoEn}` : `Cancelas gratis 48 h antes${salvoEs}`}</span>
            <span aria-hidden="true" className="text-crema/30">·</span>
            <span>{en ? "Final price" : "Precio final"}</span>
          </p>

          {/* Vive DEBAJO de los botones a propósito: monta después de cargar y,
              arriba, su píldora empujaba los dos botones de reserva hacia abajo
              justo cuando el dedo iba a tocarlos. Además reserva su propio alto
              (ver el componente), así que nada se mueve cuando aparece. */}
          {/* 🔴 `mt-7`: la píldora de «N personas explorando la Huasteca ahora»
              quedaba pegada a la línea de confianza de arriba y las dos se
              leían como un solo párrafo (Manolo, 8 oct). Es un dato de otra
              naturaleza —vivo, no una promesa— y necesita su propio aire. */}
          <div className="mt-7">
            <VisitantesEnVivo en={en} />
          </div>

          {/* 🔴 Aquí vivían tres cosas más que empujaban el buscador fuera del
              pliegue: el clima de siete días (bajó a «Antes de viajar», que es
              donde alguien lo busca), la píldora que rotaba cuatro frases cada
              3.8 s (`UrgencyWidget`, fuera: era ruido y una de sus frases
              repetía la cifra sin fuente de los 10,000 viajeros) y la fila de
              estadísticas (`HeroStats`, absorbida en la línea de confianza de
              arriba). */}
        </div>
      </section>

      {/* ── PANTALLA 2 · EL PRODUCTO ──────────────────────────────────────
          Sube aquí, pegado al hero: el primer recorrido con precio estaba en
          la posición 8, a cuatro pantallas de scroll, y salían 3 de los 15. */}
      <section aria-label={en ? "Discover the region's tours" : "Descubre los destinos de la región"} className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <p className="reveal-fade text-[10px] tracking-[4px] uppercase text-verde-selva mb-4 font-dm">{en ? "Explore the region" : "Explora la región"}</p>
          <h2 className="reveal-up font-cormorant font-light text-verde-profundo" style={{ fontSize: "clamp(36px,5vw,56px)" }}>
            {en ? <>Our <em className="shimmer-gold">Tours</em></> : <>Nuestros <em className="shimmer-gold">Tours</em></>}
          </h2>
          <div className="heading-underline" aria-hidden="true" />
          <p className="reveal-up reveal-d1 text-negro/45 mt-4 font-dm text-sm max-w-md mx-auto">
            {/* El precio vivía solo dentro de la insignia de cada tarjeta: un
                "$1,550" suelto en un <span> no se puede citar. El número sale
                de TOURS_DB (el mismo Math.min que usa la meta description), no
                escrito a mano.
                🔴 Decía "con transporte, desayuno y guía incluidos, desde
                $900": los de $900 no llevan desayuno y solo 5 de 14 lo llevan.
                Los dos conteos salen del catálogo (`catalogoResumen.ts`). */}
            {en
              ? `${TOURS_DB.length} guided tours from $${desdePersona.toLocaleString("es-MX")} MXN per person: ${nConTraslado} pick you up at your lodging and ${nConDesayuno} include breakfast.`
              : `${TOURS_DB.length} recorridos guiados desde $${desdePersona.toLocaleString("es-MX")} MXN por persona: ${nConTraslado} pasan por ti a tu hospedaje y ${nConDesayuno} incluyen desayuno.`}
          </p>

          {/* Los guías reales, al frente de la sección (Manolo, 29 sep 2026):
              caras y nombres antes que las tarjetas. Los retratos completos
              viven en las fichas de los tours acuáticos (src/lib/guias.ts). */}
          <div className="reveal-up reveal-d2 mt-7 flex items-center justify-center gap-3.5">
            <div className="flex -space-x-3 flex-shrink-0">
              {GUIAS.map((g) => (
                <Image
                  key={g.nombre}
                  src={g.fotoCara}
                  alt=""
                  width={96}
                  height={96}
                  className="h-12 w-12 rounded-full object-cover ring-2 ring-white shadow-sm"
                />
              ))}
            </div>
            <p className="font-dm text-sm text-negro/60 text-left max-w-[300px] sm:max-w-none">
              {en
                ? <>Guided by <span className="text-verde-profundo font-medium">Alex</span> and <span className="text-verde-profundo font-medium">Ángel</span>, NOM-09 certified guides from Xilitla</>
                : <>Te guían <span className="text-verde-profundo font-medium">Alex</span> y <span className="text-verde-profundo font-medium">Ángel</span>, guías certificados NOM-09, de Xilitla</>}
            </p>
          </div>
        </div>

        {/* El catálogo COMPLETO, con filtro de verdad. Antes salían tres
            recorridos elegidos a mano (`HOME_TOUR_SLUGS`) y el 80 % del
            catálogo no existía desde la portada. Sin `conLogo`: solo seis de
            los quince tienen logotipo y en una rejilla de quince la mitad
            salía con un rótulo enorme encima y la otra mitad sin nada. */}
        <div className="pt-4">
          <ToursGridFiltrable tours={toursOrdenados} hrefCatalogo={lp("/tours")} />
        </div>
      </section>
      {/* ── TEMPORADA ──────────────────────────────────────────────────────
          Va aquí y no pegada al hero a propósito: el hero y la banda de premios
          ya son dos franjas oscuras seguidas, y una tercera encima convertía la
          primera pantalla en un bloque. Entre la barra blanca de confianza y la
          tira de arena, la franja verde parte el ritmo en vez de sumarse a él.
          Sigue estando a un scroll corto, que es lo que pide un aviso con
          fecha. Se esconde sola fuera de temporada. */}
      <BandaTemporada en={en} hrefTours={lp("/tours")} />


      {/* ── PANTALLA 3 · POR QUÉ CON NOSOTROS ─────────────────────────────
          Un solo bloque. Antes eran cuatro paradas con medio argumento cada
          una: la banda de premios, la barra blanca de confianza, «Reserva
          directo» y, ochocientas líneas más abajo, las certificaciones. */}
      <BloqueConfianza locale={locale} />
      {/* ── QUÉ INCLUYE Y QUÉ NO (solo EN) ──────────────────────────────
          La jugada de mayor conversión del playbook americano: el viajero de
          EE. UU. está entrenado para buscar el costo oculto, y encontrarlo
          DECLARADO con precio desactiva la desconfianza de golpe. De paso
          convierte el traslado de "costo extra" en "producto disponible".
          Las tarifas salen de `traslados.ts` a propósito: es el único lugar
          donde se tocan, y un número escrito a mano aquí estaría mal por
          definición. */}
      {en && (
        <section aria-label="What's included and what isn't" className="bg-crema border-b border-negro/8 py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <p className="reveal-fade text-[10px] tracking-[4px] uppercase text-verde-selva mb-4 font-dm">No surprises</p>
            <h2 className="reveal-up font-cormorant font-light text-verde-profundo mb-10" style={{ fontSize: "clamp(32px,4.5vw,52px)" }}>
              What&apos;s included, and <em className="shimmer-gold">what isn&apos;t</em>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16">
              <div className="reveal-up">
                <h3 className="font-dm text-[11px] tracking-[2.5px] uppercase text-verde-selva mb-5 pb-3 border-b border-verde-selva/25">
                  In every tour
                </h3>
                <ul className="space-y-3.5 text-sm font-dm text-negro/65 leading-relaxed">
                  <li className="flex gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-verde-vivo flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <span><strong className="text-negro/85">Travel and adventure insurance</strong> — every traveler, already in the price.</span>
                  </li>
                  <li className="flex gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-verde-vivo flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <span><strong className="text-negro/85">A NOM-09 certified guide</strong> — Mexico&apos;s federal standard. Ours were born in these mountains.</span>
                  </li>
                  <li className="flex gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-verde-vivo flex-shrink-0 mt-0.5" aria-hidden="true" />
                    {/* Decía «transport from your hotel to each trailhead» en TODOS: al
                        RZR se llega a la base y al buceo por tu cuenta. El
                        conteo es el mismo de la franja de arriba. */}
                    <span><strong className="text-negro/85">Safety equipment</strong> wherever the activity calls for it, and a ride from your lodging on {nConTraslado} of the {TOURS_DB.length} tours.</span>
                  </li>
                  <li className="flex gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-verde-vivo flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <span><strong className="text-negro/85">Groups capped at {GRUPO_MAX}.</strong> We intend to keep it that way.</span>
                  </li>
                </ul>
              </div>

              <div className="reveal-up reveal-d1">
                <h3 className="font-dm text-[11px] tracking-[2.5px] uppercase text-terracota mb-5 pb-3 border-b border-terracota/25">
                  Not included — and here&apos;s the price
                </h3>
                <p className="text-sm font-dm text-negro/65 leading-relaxed mb-4">
                  <strong className="text-negro/85">Airport transfers.</strong> Private, round trip, priced per vehicle — not per person — for up to 12 passengers.
                </p>
                <ul className="space-y-2 mb-5">
                  {TRASLADOS.map((ruta) => {
                    const desde = tarifaTraslado(ruta, 1);
                    return (
                      <li key={ruta.slug} className="flex items-baseline justify-between gap-3 text-sm font-dm border-b border-negro/8 pb-2">
                        <span className="text-negro/70">From {ruta.ciudad}</span>
                        <span className="text-verde-profundo font-medium tabular-nums">
                          {desde ? `from $${desde.precio.toLocaleString("en-US")} MXN` : "on request"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <p className="text-sm font-dm text-negro/65 leading-relaxed">
                  <strong className="text-negro/85">Flights</strong>, any meals not listed on your itinerary{TOURS_DB.length > nConTraslado ? <>, and getting to the meeting point on the {TOURS_DB.length - nConTraslado} tours that don&apos;t pick you up</> : null}. That&apos;s the whole list.
                </p>
              </div>
            </div>

            <div className="mt-12 pt-8 border-t border-negro/10 flex flex-wrap gap-x-8 gap-y-3 text-[11px] tracking-[1.5px] uppercase font-dm text-negro/50">
              {/* Este renglón habla de "every tour", y un tour de un día sin
                  hotel se cobra entero (`pctACobrar`): el 30 % a secas mentía
                  justo en el producto más vendido. */}
              <span>30% deposit holds any tour · settle the rest on tour day</span>
              <span className="text-negro/15">|</span>
              <span>Free cancellation up to 48 h{salvoEn}</span>
              <span className="text-negro/15">|</span>
              <span>Apple&nbsp;Pay · Google&nbsp;Pay · Card</span>
              <span className="text-negro/15">|</span>
              <span>English-speaking guide on request, at no extra cost</span>
            </div>
          </div>
        </section>
      )}
      {/* ── PAQUETES TODO INCLUIDO ── */}
      {!en && (
        <section aria-label="Paquetes todo incluido: tours + hospedaje" className="border-y border-white/10 py-20 sm:py-24 px-4 sm:px-6"
          style={{ background: "linear-gradient(to bottom, #1a2e1a 0%, #0e1710 45%, #1a2e1a 100%)" }}>
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <p className="reveal-fade text-[10px] tracking-[4px] uppercase text-lima mb-4 font-dm">Tours + hospedaje · Todo coordinado</p>
              <h2 className="reveal-up font-cormorant font-light text-crema" style={{ fontSize: "clamp(36px,5vw,56px)" }}>
                Paquetes <em className="shimmer-gold">Todo Incluido</em>
              </h2>
              <div className="heading-underline" aria-hidden="true" />
              <p className="reveal-up reveal-d1 text-crema/65 mt-4 font-dm text-sm max-w-md mx-auto">
                {/* Duración y precio también en prosa: en las tarjetas viven
                    dentro de insignias sueltas y así no se pueden citar. Todo
                    sale de PAQUETES_DB (dias, precioLabel) y del ayudante
                    `precioVisible`. El rango se calcula sobre `precioVisible`,
                    NO sobre `p.precio`: con `p.precio` diría «de $9.800 a
                    $20.500» mientras las tarjetas de abajo enseñan de $6.250 a
                    $10.250, dos cifras que no cuadran en la misma página. */}
                Combinamos nuestros tours con hospedaje en el Hotel Paraíso Encantado Xilitla. Tú solo preocúpate por llegar.
                {" "}Los {PAQUETES_DB.length} paquetes van de {Math.min(...PAQUETES_DB.map((p) => p.dias))} a {Math.max(...PAQUETES_DB.map((p) => p.dias))} días
                {" "}y cuestan de ${Math.min(...PAQUETES_DB.map((p) => precioVisible(p))).toLocaleString("es-MX")} a ${Math.max(...PAQUETES_DB.map((p) => precioVisible(p))).toLocaleString("es-MX")} MXN {new Set(PAQUETES_DB.map((p) => p.precioLabel)).size === 1 ? PAQUETES_DB[0].precioLabel : "según el paquete"}.
                {" "}Apartas con el 30 % y liquidas el resto el día del tour.
              </p>
            </div>

            {/* El cartel del paquete que se está promoviendo. Va ANTES de la
                rejilla a propósito: es la oferta concreta, con su precio y lo
                que incluye, y la rejilla es el catálogo para quien no la quiera. */}
            <div className="mb-12 sm:mb-16">
              {/* Sin prioridad: está pantallas abajo y su `priority` le quitaba
                  ancho de banda al póster del hero (ver el componente). */}
              <CarruselPromos cargaDiferida />
            </div>

            {/* Aquí vivía una rejilla con los 5 paquetes repetidos. Se quitó
                el 24 sep 2026: el carrusel de arriba ya enseña la oferta con
                su precio y lo que incluye, y debajo salían otra vez los mismos
                cinco, más chicos y sin foto propia. El catálogo completo está a
                un clic, en el botón de abajo. */}

            <div className="text-center mt-10">
              <MagneticButton className="inline-block">
                <Link href="/paquetes" className="inline-block rounded-xl border border-crema/40 text-crema px-10 py-3.5 text-sm tracking-[2px] uppercase font-dm transition-[background-color,border-color,transform] duration-200 ease-out [@media(hover:hover)]:hover:bg-crema/10 [@media(hover:hover)]:hover:border-crema active:scale-[0.97]">
                  Ver los {PAQUETES_DB.length} paquetes con hotel incluido
                </Link>
              </MagneticButton>
              {/* /precios no estaba enlazada desde ninguna parte del inicio, y es
                  la página que responde la pregunta que trae a la gente. Sólo en
                  español: no existe /en/precios. */}
              <p className="mt-5">
                <Link href="/precios" className="text-xs tracking-[1.5px] uppercase font-dm text-crema/75 hover:text-lima underline underline-offset-4 decoration-crema/35 transition-colors">
                  Ver la lista de precios 2026 de tours y paquetes →
                </Link>
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ── PANTALLA 5 · PRUEBA SOCIAL ──────────────────────────────────
          Aquí vivían tres reseñas INVENTADAS debajo de un H2 con la cifra
          real («161 Reseñas · 4.7 estrellas»). Ahora solo sale lo que existe. */}
      <PruebaSocial locale={locale} fotos={fotosViajeros} />

      {/* ── PANTALLA 6 · EL MAPA ── */}
      <MapaRegion locale={locale} />
      {/* ── POR QUÉ LA HUASTECA ── */}
      <section aria-label={en ? "Why visit the Huasteca Potosina" : "Por qué visitar la Huasteca Potosina"} className="bg-white border-b border-negro/8 py-24 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <p className="reveal-fade text-[10px] tracking-[4px] uppercase text-verde-selva mb-4 font-dm">{en ? "Why here, and not Costa Rica" : "¿Por qué la Huasteca?"}</p>
            <h2 className="reveal-up font-cormorant font-light text-verde-profundo mb-6" style={{ fontSize: "clamp(32px,4.5vw,52px)" }}>
              {en ? <>Half the flight, <em className="shimmer-gold">a third of the bill</em></> : <>Una región que{" "}<em className="shimmer-gold">te cambia</em></>}
            </h2>
            <div className="reveal-up reveal-d1 space-y-4 text-negro/60 font-dm text-sm leading-relaxed">
              {en ? (
                <>
                  {/* 🔴 El tope del grupo sale de GRUPO_MAX (tours.ts): decía
                      «twelve» y el catálogo y /en/tours dicen 14. */}
                  {/* Copy escrito para el mercado americano: contra Costa Rica
                      no se gana con adjetivos, se gana con el precio real. Los
                      paquetes son POR PAREJA — ese es el dato que convierte. */}
                  {/* Misma frase citable que en español (paridad ES/EN), y
                      aquí pesa más todavía: un lector americano no ha oído el
                      nombre en su vida. Fuente: llmsTxt.ts (GEOGRAFIA). */}
                  <p>The Huasteca Potosina is a natural region in the northeast of the state of San Luis Potosí, Mexico: Ciudad Valles is its hub city and Xilitla — the Pueblo Mágico where we are based — sits about {enAuto("tampico", "xilitla", true)} from Tampico airport (TAM).</p>
                  {/* El párrafo de los guías NOM-09 y el del grupo máximo se
                      fueron al bloque «Why with us», que es el único sitio
                      donde se argumenta la confianza. Aquí quedan la geografía
                      (lo citable) y el precio contra Costa Rica (lo que
                      convierte en ese mercado). */}
                  <p>{paqueteIngles.dias} days, {paqueteIngles.noches} nights, the tours, the hotel and the insurance: <strong className="text-verde-profundo">${paqueteIngles.precio.toLocaleString("en-US")} MXN for two people</strong>. The price you see on our booking page is the price you pay. Tampico is a short hop from Texas, and from the airport it&apos;s {enAuto("tampico", "xilitla", true)} to Xilitla, in a private vehicle driven by us.</p>
                </>
              ) : (
                <>
                  {/* La consulta que más impresiones trae al inicio es
                      "huasteca potosina" a secas, y detrás de ella hay alguien
                      que todavía no sabe DÓNDE queda ni cómo se llega. Esta
                      frase es la única del inicio que se puede citar sola.
                      Todos sus datos salen de GEOGRAFIA y COMO_LLEGAR en
                      src/lib/llmsTxt.ts: noreste de San Luis Potosí, hub en
                      Ciudad Valles y base en Xilitla. 🔴 Las horas YA NO se
                      escriben aquí: salen de `tiemposDeViaje.ts`. Escritas a
                      mano, este párrafo decía 2.5 h desde Tampico y 5.5-6 h
                      desde CDMX mientras el mapa de arriba, en la MISMA
                      pantalla, decía 3.5 h y 7 h. */}
                  {/* 🔴 Eran CUATRO párrafos de texto corrido. Aquí abajo nadie
                      los lee: los datos fuertes (los 105 m del Tamul, los 478 m
                      del Sótano de las Huahuas, las horas de carretera) están
                      ahora en el mapa y en las fichas de al lado, que es donde
                      se ven de un vistazo. Queda el párrafo citable y el enlace
                      a la página que lo desarrolla.
                      Lo que se quitó, y por qué:
                       · El de la biodiversidad y la UNESCO: adjetivos que
                         cualquier competidor puede pegar igual.
                       · El de los vencejos del Sótano de las GOLONDRINAS: ese
                         sitio NO lo operamos (ver `temporada.ts`), así que el
                         inicio lo vendía sin poder venderlo.
                       · «No es solo un destino. Es una experiencia que redefine
                         lo que significa la naturaleza en México»: no dice nada
                         que alguien pueda comprobar. */}
                  <p>La Huasteca Potosina es una región natural del noreste del estado de San Luis Potosí, en México: su ciudad de entrada es Ciudad Valles y su Pueblo Mágico es Xilitla, donde tenemos nuestra base. Se llega en avión a Tampico (TAM), a unas {enAuto("tampico")} de Xilitla, o por carretera desde la Ciudad de México en {enAuto("cdmx")} de auto; en autobús, la salida nocturna desde la Terminal Central del Norte llega a Xilitla a la mañana siguiente.</p>
                </>
              )}
            </div>
            {!en && (
              <div className="mt-8">
                <Link href="/sobre-la-huasteca-potosina" className="text-sm tracking-[2px] uppercase text-verde-selva hover:text-verde-vivo transition-colors border-b border-verde-selva/40 pb-0.5 font-dm">
                  Conoce más sobre la región →
                </Link>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {REGION_STATS.map((s) => (
              <StatTile key={s.label} num={s.num} label={s.label} />
            ))}
          </div>
        </div>
      </section>

      {/* ── PANTALLA 7 · LAS DUDAS ── */}
      <FaqInicio locale={locale} />

      {/* ── PANTALLA 8 · LA ÚNICA CAPTURA DE CORREO (solo ES) ────────────
          Aquí estaba también la descarga de la guía PDF: dos formularios
          peleándose por el mismo correo. Se quitó (decisión de Manolo, 7 oct)
          y el recomendador se queda solo. La guía sigue en /guia. */}
      {!en && (
        <>
          <section aria-label="Planea tu viaje con IA" className="py-24 px-6 bg-crema">
            <div className="max-w-3xl mx-auto text-center border border-verde-selva/20 bg-white p-12 md:p-16 shadow-sm">
              <span className="reveal-fade inline-block text-[9px] tracking-[4px] uppercase text-verde-selva border border-verde-selva/40 px-4 py-1.5 mb-6 font-dm">✦ Tecnología IA</span>
              <h2 className="reveal-up font-cormorant font-light text-verde-profundo mb-6" style={{ fontSize: "clamp(28px,4vw,48px)" }}>
                Tu viaje perfecto,{" "}<em className="shimmer-gold">diseñado en 2 minutos</em>
              </h2>
              <p className="reveal-up reveal-d1 text-negro/55 font-dm text-sm leading-relaxed mb-8 max-w-xl mx-auto">
                Dinos de dónde vienes, cuántos días tienes y qué te emociona — y cuéntanos tu viaje con tus palabras. Te recomendamos tu tour ideal y, con 3 días o más, un plan completo con hospedaje.
              </p>
              <div className="flex flex-wrap gap-3 justify-center mb-10">
                {["Itinerario día a día", "Rutas reales", "Precios actualizados 2026"].map((pill) => (
                  <span key={pill} className="border border-negro/15 bg-crema px-4 py-2 text-xs tracking-[1px] text-negro/60 font-dm">{pill}</span>
                ))}
              </div>
              <MagneticButton className="inline-block mb-5">
                <Link href="/recomendar" className="inline-block bg-dorado text-white px-12 py-4 text-sm tracking-[3px] uppercase font-dm font-medium hover:bg-terracota transition-colors duration-300">
                  Descubrir mi Tour Ideal →
                </Link>
              </MagneticButton>
              <p className="text-xs text-negro/30 tracking-wide font-dm">Gratis · 2 minutos · Te lo enviamos por correo</p>
            </div>
          </section>
          <section aria-label="Información práctica para tu viaje" className="bg-white border-y border-negro/8 py-16 px-6">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="reveal-up font-cormorant font-light text-verde-profundo" style={{ fontSize: "clamp(28px,4vw,44px)" }}>
                  Antes de <em className="text-dorado">viajar</em>
                </h2>
                {/* El pronóstico de siete días bajó del hero hasta aquí: arriba
                    empujaba el buscador fuera del pliegue, y aquí está justo
                    donde alguien que planea el viaje lo busca. */}
                <div className="mt-6 flex justify-center">
                  <ClimaHero en={en} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { Icon: Bus,       title: "Cómo llegar",    text: `Ciudad Valles es la puerta de entrada: ${enAuto("cdmx", "valles")} en auto desde CDMX, o ${enAutobus("cdmx", "valles")} en autobús ADO.`, href: "/info-practica#como-llegar" },
                  // La misma regla de temporada.ts (7 oct 2026), con la fecha de su
                  // constante: decía «Nov–Mayo ideal… Jun–Oct lush verde», que
                  // callaba el agua con sedimento y no cuadraba con la banda.
                  { Icon: Calendar,  title: "Mejor época",    text: `Todo el año. Del ${fechaInicioTexto("es")} a mayo el agua baja clara; de julio a octubre, cascadas a todo caudal y agua con sedimento.`, href: "/info-practica#cuando-viajar" },
                  /* 🔴 Decía «Ciudad Valles como base», que es mandar a dormir a
                     otra ciudad desde la portada del negocio que tiene hotel en
                     Xilitla. Los datos salen de `hotelPropio.ts`, que es donde
                     viven los que son ciertos (la distancia a Las Pozas, el
                     restaurante y su horario), y el enlace va al bloque de la
                     guía que ya tiene fotos, WhatsApp y Google Maps. */
                  { Icon: BedDouble, title: "Dónde quedarse", text: `En Xilitla, a ${HOTEL_PROPIO.metrosALasPozas} m de Las Pozas: ${HOTEL_PROPIO.minutosCaminando} minutos a pie. El hotel es nuestro y tiene su propio restaurante de cocina huasteca.`, href: "/info-practica#hotel-paraiso" },
                ].map((card) => (
                  <div key={card.title} className="border border-negro/8 bg-crema/60 p-6 hover:border-verde-selva/30 transition-colors group">
                    <card.Icon className="w-7 h-7 text-verde-selva mb-4" aria-hidden="true" />
                    <h3 className="font-cormorant text-verde-profundo text-xl mb-3">{card.title}</h3>
                    <p className="text-negro/50 text-sm font-dm leading-relaxed mb-5">{card.text}</p>
                    <Link href={card.href} className="text-xs tracking-[2px] uppercase text-verde-selva hover:text-verde-vivo transition-colors font-dm">Ver más →</Link>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
      {/* ── CIERRE ─────────────────────────────────────────────────────────
          El inicio terminaba en información práctica y de ahí saltaba a los
          reconocimientos: quien llegaba hasta abajo —el que más leyó, o sea el
          más interesado— no tenía nada que pulsar. */}
      <section aria-label={en ? "Book your trip" : "Reserva tu viaje"} className="relative bg-verde-profundo py-20 px-6 overflow-hidden border-t border-white/10">
        <FloatingLeaves />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <p className="reveal-fade text-[10px] tracking-[4px] uppercase text-verde-vivo mb-4 font-dm">
            {en ? `Clear water from ${fechaInicioTexto("en")} through May` : "Cuando quieras"}
          </p>
          <h2 className="reveal-up font-cormorant font-light text-crema mb-5" style={{ fontSize: "clamp(30px,4.5vw,50px)" }}>
            {en ? <>Come before we&apos;re the reason <em className="shimmer-gold">it changed</em></> : <>Tu viaje a la Huasteca <em className="shimmer-gold">empieza aquí</em></>}
          </h2>
          {/* La urgencia en inglés va INVERTIDA a propósito: para el viajero
              americano informado "el próximo Tulum" es el destino arruinado, no
              la aspiración. Prometerlo sería prometerle justo lo que evita. La
              escasez honesta es la temporada seca, no un colapso inventado.
              La temporada sale de temporada.ts (7 oct 2026): decía «Dry season
              runs November through April: bluest water», otra regla que la del
              resto del sitio; el turquesa más intenso es de marzo a mayo. */}
          <p className="reveal-up reveal-d1 text-crema/60 font-dm text-sm leading-relaxed max-w-xl mx-auto mb-9">
            {en
              ? `We'd like to keep the rivers the way they are — that's why our groups stop at ${GRUPO_MAX} and we work with the communities we grew up in. From ${fechaInicioTexto("en")} through May the water runs clear; the turquoise peaks from March to May, which is also the busiest time. A 30% deposit holds any trip, with the balance due on tour day. Free cancellation up to 48 h before${salvoEn}.`
              : `Elige tus recorridos y súmale las noches que necesites: apartas con el 30 % y liquidas el resto el día del tour. Cancelas gratis hasta 48 h antes${salvoEs}.`}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <MagneticButton className="inline-block">
              <Link href={lp("/reservar")} className="inline-block bg-dorado text-negro px-12 py-4 text-sm tracking-[3px] uppercase font-dm font-medium hover:bg-lima transition-colors duration-300">
                {en ? "Book now" : "Reservar ahora"}
              </Link>
            </MagneticButton>
            <a
              href={waLink(en ? "Hi! I'd like to ask about your Huasteca Potosina tours." : WA_MESSAGES.general)}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 rounded-xl border border-[#25D366]/50 text-[#25D366] px-9 py-4 text-[11px] tracking-[2px] uppercase font-dm transition-[background-color,border-color,transform] duration-200 ease-out [@media(hover:hover)]:hover:border-[#25D366] [@media(hover:hover)]:hover:bg-[#25D366]/8 active:scale-[0.97]"
            >
              {en ? "Ask on WhatsApp" : "Preguntar por WhatsApp"}
            </a>
          </div>
          <p className="reveal-up reveal-d1 mt-7 text-[11px] tracking-[2px] uppercase font-dm text-crema/35">
            {/* 🔴 Terminaba con «+10,000 viajeros». Esa cifra está escrita a
                mano en trece sitios del repo y no tiene fuente: no sale del
                catálogo ni de las reservas. Aquí queda lo verificable. */}
            {GOOGLE_RATING} ★ · {GOOGLE_RESENAS} {en ? "Google reviews" : "reseñas Google"}
          </p>
        </div>
      </section>


      {/* ── EL BLOG, AL FINAL ───────────────────────────────────────────
          Estaba a mitad del inicio: una puerta de salida en el momento de
          mayor intención. Baja después del cierre. */}
      {/* ── BLOG PREVIEW (solo ES) ── */}
      {!en && recentPosts.length > 0 && (
        <section aria-label="Artículos recientes del blog" className="border-t border-negro/10 bg-arena/30 px-6 py-14">
          <div className="mx-auto max-w-4xl text-center">
            <p className="mb-5 font-dm text-[10px] uppercase tracking-[4px] text-verde-selva">
              Del blog
            </p>
            {/* 🔴 Eran tres tarjetas con portada a mitad del inicio: una puerta
                de salida justo en el momento de mayor intención, y tres <img>
                que React precargaba en el <head> compitiendo con el póster del
                hero. Ahora son tres enlaces de texto, después del cierre.
                `urlBlog` quita el sufijo de año: 18 de los 40 artículos lo
                arrastran y esa forma responde 308. Enlazar el slug crudo
                mandaba a la página con más clics del sitio a una redirección. */}
            <ul className="flex flex-col items-center gap-2.5">
              {recentPosts.map((post) => (
                <li key={post.slug}>
                  <Link
                    href={urlBlog(post.slug)}
                    prefetch={false}
                    className="font-dm text-sm text-negro/60 underline decoration-negro/20 underline-offset-4 transition-colors hover:text-verde-selva hover:decoration-verde-selva"
                  >
                    {post.title}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-7">
              <Link
                href="/blog"
                prefetch={false}
                className="font-dm text-xs uppercase tracking-[2px] text-verde-selva underline underline-offset-4 transition-colors hover:text-terracota"
              >
                Ver todos los artículos →
              </Link>
            </p>
          </div>
        </section>
      )}

      {/* El pie de página vive ahora en el shell (SiteFooter), para que lo
          tengan las 43 páginas y no solo la home. */}
    </main>
  );
}
