import Link from "next/link";
import { Metadata } from "next";
import Image from "next/image";
import { headers } from "next/headers";
import { DESTINOS_DB } from "@/lib/destinos";
import { TOURS_DB, partesRecogida, GRUPO_MAX, PROMO_TEMPORADA, promoVigente } from "@/lib/tours";
import { incluyeDesayuno, rangoPorPersona } from "@/lib/catalogoResumen";
import { PAQUETES_DB, precioVisible, getPaquete } from "@/lib/paquetes";
import { GOOGLE_RATING, GOOGLE_RESENAS, GOOGLE_PERFIL_URL } from "@/lib/resenas";
import { GUIAS } from "@/lib/guias";
import { TourCard } from "@/components/TourCard";
import { UrgencyWidget } from "@/components/UrgencyWidget";
import { HeroTypewriter } from "@/components/HeroTypewriter";
import { StatTile } from "@/components/StatTile";
import { MagneticButton } from "@/components/MagneticButton";
import { waLink, WA_MESSAGES } from "@/lib/whatsapp";
import { HeroStats } from "@/components/HeroStats";
import { HeroVideo } from "@/components/HeroVideo";
import { CarruselPromos } from "@/components/CarruselPromos";
import { ClimaHero } from "@/components/ClimaHero";
import { VisitantesEnVivo } from "@/components/VisitantesEnVivo";
import { FloatingLeaves } from "@/components/FloatingLeaves";
import { CountdownViaje } from "@/components/CountdownViaje";
import { GuiaMockup } from "@/components/GuiaMockup";
import { GuiaGratisForm } from "@/components/GuiaGratisForm";
import { BandaTemporada } from "@/components/BandaTemporada";
import { prisma } from "@/lib/prisma";
import { asLocale, localePath, buildAlternates, SITE } from "@/lib/i18n/config";
import { buildOrganizationJsonLd, buildTourOffer, ORG_REF } from "@/lib/jsonld";
import { localizeTour } from "@/lib/i18n/localize";
import { urlBlog } from "@/lib/blogDestinoMap";
import { TRASLADOS, tarifaTraslado } from "@/lib/traslados";
import {
  Droplet, Mountain, Landmark, Leaf, Camera, Thermometer,
  MessageCircle, Star, Award, CheckCircle2,
  Bus, Calendar, BedDouble,
  Quote,
} from "lucide-react";

const SITE_URL = SITE;

/**
 * Fin del viaje grupal de septiembre (19 sep 2026, hora de la Huasteca). El
 * aviso del inicio se apaga solo: si se queda escrito a mano, en octubre el
 * inicio sigue anunciando una salida que ya ocurrió.
 */
const VIAJE_SEP_FIN_MS = new Date("2026-09-19T23:59:00-06:00").getTime();

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
  // En el inicio mostramos solo 3 tours destacados; el botón lleva al catálogo completo.
  const HOME_TOUR_SLUGS = ["expedicion-tamul", "cascadas-del-meco", "ruta-surrealista-edward-james"];
  const toursHome = HOME_TOUR_SLUGS.map((s) => tours.find((t) => t.slug === s)).filter(Boolean) as typeof tours;
  const desdePersona = rangoPorPersona().min;
  const nConTraslado = TOURS_DB.filter((t) => partesRecogida(t, false).incluyeTraslado).length;
  const nConDesayuno = TOURS_DB.filter(incluyeDesayuno).length;
  // Recorridos con política de cancelación propia (hoy el Edén: la Fundación
  // Las Pozas no reembolsa). Toda frase que diga «cancelas gratis» para el
  // catálogo entero los nombra; si no, promete un reembolso que no existe.
  const sinReembolso = tours.filter((t) => t.cancelacion).map((t) => t.nombreCorto);
  const salvoEs = sinReembolso.length ? ` (salvo ${sinReembolso.join(", ")})` : "";
  const salvoEn = sinReembolso.length ? ` (except ${sinReembolso.join(", ")})` : "";

  const CATEGORIAS = [
    { Icon: Droplet,     label: en ? "Waterfalls & Pools" : "Cascadas & Pozas",  href: lp("/experiencias?tipo=cascadas") },
    { Icon: Mountain,    label: en ? "Extreme Adventure"  : "Aventura Extrema",  href: lp("/experiencias?tipo=aventura") },
    { Icon: Landmark,    label: en ? "Culture & Art"      : "Cultura & Arte",    href: lp("/experiencias?tipo=cultura") },
    { Icon: Leaf,        label: en ? "Ecotourism"         : "Ecoturismo",        href: lp("/experiencias?tipo=naturaleza") },
    { Icon: Camera,      label: en ? "Photography"        : "Fotografía",        href: lp("/experiencias?tipo=fotografia") },
    { Icon: Thermometer, label: en ? "Wellness"           : "Bienestar",         href: lp("/experiencias?tipo=bienestar") },
  ];

  const REGION_STATS = [
    { num: "105m",                   label: en ? "The tallest waterfall" : "La cascada más alta" },
    { num: "333m",                   label: en ? "Deepest sinkhole"      : "Sótano más profundo" },
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
    numberOfItems: toursHome.length,
    itemListElement: toursHome.map((t, i) => ({
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

  const TESTIMONIOS = en
    ? [
        { img: "/imagenes/reviews/reviewer-turquoise-group.png", imgAlt: "Group of travelers in the turquoise waters of the Huasteca", foto: "/imagenes/reviews/reviewer-5.jpg", quote: "Incredible experience! The turquoise water is like nothing we'd ever seen. Our guide was outstanding — he knew every detail of the region and looked after us the whole time. We already booked to come back with more family!", nombre: "Carlos M.", meta: "Monterrey, N.L. · All Huasteca Tour · Mar 2026" },
        { img: "/imagenes/reviews/reviewer-familia-tamul.png", imgAlt: "Family in front of Tamul Waterfall", foto: "/imagenes/reviews/reviewer-29.jpg", quote: "We took our kids for the first time and it was absolutely magical. Tamul Waterfall exceeded all our expectations. Punctual transport, attentive guide, all-inclusive. The best thing we've done as a family.", nombre: "Ana González", meta: "Mexico City · Tamul Waterfall Tour · Feb 2026" },
        { img: "/imagenes/reviews/reviewer-tamul-grupo.jpg", imgAlt: "Group of friends in the Tamul Canyon", foto: "/imagenes/reviews/reviewer-3.jpg", quote: "We organized the trip for 8 friends and it was perfectly coordinated. From booking to the last moment of the tour, everything was flawless. The Tamul Canyon landscape is simply unreal. I'll definitely be back!", nombre: "Sofía R.", meta: "Guadalajara, Jal. · Tamul & Río Gallinas Tour · Jan 2026" },
      ]
    : [
        { img: "/imagenes/reviews/reviewer-turquoise-group.png", imgAlt: "Grupo de viajeros en las aguas turquesas de la Huasteca", foto: "/imagenes/reviews/reviewer-5.jpg", quote: "¡Increíble experiencia! El agua turquesa es algo que jamás habíamos visto. El guía fue extraordinario — conocía cada detalle de la región y nos cuidó en todo momento. ¡Ya reservamos para volver con más familia!", nombre: "Carlos M.", meta: "Monterrey, N.L. · Tour Todo Huasteca · Mar 2026" },
        { img: "/imagenes/reviews/reviewer-familia-tamul.png", imgAlt: "Familia frente a la Cascada Tamul", foto: "/imagenes/reviews/reviewer-29.jpg", quote: "Llevamos a nuestros hijos por primera vez y fue absolutamente mágico. La cascada Tamul superó todas nuestras expectativas. Transporte puntual, guía atento y todo incluido. Lo más recomendable que hemos hecho en familia.", nombre: "Ana González", meta: "Ciudad de México · Tour Cascada Tamul · Feb 2026" },
        { img: "/imagenes/reviews/reviewer-tamul-grupo.jpg", imgAlt: "Grupo de amigos en el Cañón del Tamul", foto: "/imagenes/reviews/reviewer-3.jpg", quote: "Organizamos el viaje para 8 amigos y fue perfectamente coordinado. Desde la reserva hasta el último momento del tour, todo impecable. El paisaje del Cañón del Tamul es simplemente irreal. ¡Vuelvo seguro!", nombre: "Sofía R.", meta: "Guadalajara, Jal. · Tour Tamul & Río Gallinas · Ene 2026" },
      ];

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
        className="relative min-h-[90vh] flex flex-col items-center justify-center text-center px-6 py-32 bg-negro overflow-hidden supports-[overflow:clip]:overflow-clip"
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

        <div className="relative z-10 flex flex-col items-center">
          {/* La etiqueta va FUERA del h1: el h1 tiene que leerse «La Huasteca
              Potosina» (la región, ver generateMetadata). «Tours Huasteca
              Potosina» es la consulta de /tours. */}
          <p className="text-[10px] tracking-[5px] uppercase text-verde-vivo mb-8 font-dm font-normal drop-shadow-lg">
            ✦ {en ? "Huasteca Potosina Tours" : "Tours Huasteca Potosina"} · San Luis Potosí ✦
          </p>
          <h1 className="font-cormorant font-light leading-[0.9] tracking-tight mb-8 drop-shadow-2xl">
            <span className="block text-white" style={{ fontSize: "clamp(64px,12vw,130px)" }}>
              {en ? "The Huasteca" : "La Huasteca"}
            </span>
            <HeroTypewriter />
          </h1>

          <p className="text-crema/80 max-w-xl mb-6 leading-relaxed font-dm drop-shadow" style={{ fontSize: "clamp(15px,1.8vw,18px)" }}>
            {/* Antes esta línea describía la REGIÓN ("cascadas turquesas,
                jardines surrealistas…"), no la empresa: cualquiera de los seis
                competidores podía pegarla igual. Ahora dice lo único que ellos
                no pueden copiar — que somos de Xilitla y el hotel y el
                restaurante son nuestros. Sin superlativos: Huasteca Sharet
                también tiene hospedaje propio, pero desde Ciudad Valles. */}
            {/* El inglés SÍ abre describiendo la región, al revés que el
                español: un mexicano ya sabe qué es la Huasteca, un americano no
                ha oído el nombre en su vida. Primero se le dice qué hay —con
                datos concretos que ningún competidor puede copiar: los 344 pies
                del Tamul y Las Pozas— y enseguida el foso (hotel y guías
                propios) y cómo llegar. No volver a quitarle la descripción. */}
            {en
              ? "Turquoise rivers, a 344-foot waterfall, and a surrealist castle an English poet built in the jungle. We're from Xilitla — the hotel, the restaurant and the guides are ours. Fly into Tampico and we'll pick you up. NOM-09 certified guides and travel insurance included."
              : "Somos de Xilitla y aquí tenemos nuestro hotel y nuestro restaurante. Duermes, comes y sales al tour desde el mismo lugar — y también te recogemos en Ciudad Valles. Guías certificados NOM-09 y seguro de viaje incluidos."}
          </p>

          <div className="flex items-center gap-2 mb-12">
            <div className="flex gap-0.5 star-group">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-dorado text-dorado drop-shadow star-icon" />
              ))}
            </div>
            <span className="font-dm text-crema/90 text-sm drop-shadow">
              {/* La calificación sale de resenas.ts en TODO el inicio: escrita a
                  mano, así nacieron los 4.9 que se quedaban en otras páginas. */}
              {en ? `${GOOGLE_RATING} · Over 10,000 happy travelers` : `${GOOGLE_RATING} · Más de 10,000 viajeros satisfechos`}
            </span>
          </div>

          <div className="flex flex-wrap gap-4 justify-center mb-10">
            <MagneticButton>
              {/* Dorado = "reservar" en todo el sitio (es el color del botón del
                  menú). Desde el 14 ago el motor existe en inglés, así que los
                  dos idiomas van al motor: mandar el inglés al catálogo era un
                  rodeo heredado de cuando /en/reservar era un 404. */}
              <Link
                href={lp("/reservar")}
                className="bg-dorado text-negro px-10 py-4 text-sm tracking-[2px] uppercase font-dm font-medium hover:bg-terracota hover:text-crema transition-colors duration-300 flex flex-col items-center gap-0.5"
              >
                <span>{en ? "Book a tour →" : "Reservar tour →"}</span>
                {/* Decía "Apartas con el 30 %" encima del botón que lleva al
                    motor, donde la mayoría reserva UN recorrido de un día —y
                    ésos se cobran completos (`pctACobrar`)—. La promesa del
                    30 % se movió a donde sí aplica (el cierre, que habla de
                    sumar noches); aquí queda la única garantía que es cierta
                    en los dos casos. Es un sello de 9 px: la excepción del
                    Edén (sin reembolso) la dicen su ficha y el pago. */}
                <span className="text-[9px] tracking-[1.5px] uppercase text-negro/55 font-normal">
                  {en ? "Free cancellation up to 48 h" : "Cancelas gratis 48 h antes"}
                </span>
              </Link>
            </MagneticButton>
            <MagneticButton>
              {/* El segundo botón del hero mandaba al recomendador en español:
                  en 14 días lo usaron 4 personas, mientras el catálogo llevó
                  150 sesiones al motor. El inglés ya iba a /tours desde antes;
                  ahora los dos van al mismo sitio y se acabó el ternario. */}
              <Link href={lp("/tours")} className="relative bg-verde-selva text-crema px-10 py-4 text-sm tracking-[2px] uppercase font-dm hover:bg-verde-vivo transition-colors duration-300 flex flex-col items-center gap-0.5">
                <span>{en ? "✦ See the tours →" : "✦ Ver los recorridos →"}</span>
                <span className="text-[9px] tracking-[1.5px] uppercase text-crema/60 font-normal">
                  {/* Decía "Todo incluido": el RZR no lleva traslado y al buceo
                      llegas por tu cuenta. Igual en la franja de confianza. */}
                  {en ? "Final price · Small groups" : "Precio final · Grupos pequeños"}
                </span>
              </Link>
            </MagneticButton>
          </div>

          {/* Vive DEBAJO de los botones a propósito: monta después de cargar y,
              arriba, su píldora empujaba los dos botones de reserva hacia abajo
              justo cuando el dedo iba a tocarlos. Además reserva su propio alto
              (ver el componente), así que nada se mueve cuando aparece. */}
          <VisitantesEnVivo en={en} />

          <ClimaHero en={en} />

          <div className="mb-10 bg-white/10 backdrop-blur-sm border border-white/20 px-5 py-2.5 rounded-full">
            <UrgencyWidget sinReembolso={sinReembolso} />
          </div>

          <HeroStats destinosCount={DESTINOS_DB.length} />
        </div>
      </section>

      {/* ── VIAJE EN GRUPO DE SEPTIEMBRE ───────────────────────────────────
          `/viaje-septiembre` sale en Google (368 impresiones, posición 9,9) y
          NINGUNA página pública la enlazaba: desde el sitio no había forma de
          llegar. Va pegada al hero —lo primero que aparece al bajar, un solo
          gesto en móvil— y se apaga sola al terminar el viaje. Las cifras son
          las de esa misma página: 16–19 de sep, 4 días / 3 noches, 3 recorridos,
          desde $7,900 por persona en ocupación doble y 16 lugares. */}
      {Date.now() < VIAJE_SEP_FIN_MS && (
        <section
          aria-label={en ? "Group trip from Mexico City, September 16–19" : "Viaje en grupo desde CDMX, 16 al 19 de septiembre"}
          className="bg-negro border-b border-dorado/25 px-6 py-4"
        >
          <Link href={lp("/viaje-septiembre")} className="group max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-center">
            <span className="bg-dorado text-negro text-[9px] font-dm font-bold tracking-[2px] uppercase px-2.5 py-1">
              {en ? "Scheduled departure" : "Salida programada"}
            </span>
            <span className="font-dm text-crema text-sm group-hover:text-dorado transition-colors">
              {en
                ? "Group trip to the Huasteca from Mexico City · September 16–19"
                : "Viaje en grupo a la Huasteca desde CDMX · 16-19 de septiembre"}
            </span>
            <span className="font-dm text-crema/45 text-xs">
              {en
                ? "4 days · 3 tours · from $7,900 MXN/person · 16 spots"
                : "4 días · 3 recorridos · desde $7,900 MXN/persona · 16 lugares"}
            </span>
            <span className="font-dm text-dorado text-[10px] tracking-[2px] uppercase">
              {en ? "See the trip →" : "Ver el viaje →"}
            </span>
          </Link>
        </section>
      )}

      {/* ── TEMPORADA BAJA ─────────────────────────────────────────────────
          La promo del 29 sep al 29 oct (Manolo): $100 menos por persona en 6
          recorridos. Mismo patrón que la franja del viaje: pegada al hero y se
          apaga sola al vencer (`promoVigente`, evaluada por petición porque el
          inicio es force-dynamic). El descuento real vive en TOURS_DB. */}
      {promoVigente() && (
        <section
          aria-label={en ? "Low season discount" : "Descuento de temporada baja"}
          className="bg-negro border-b border-dorado/25 px-6 py-4"
        >
          <Link href={lp("/tours")} className="group max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-center">
            <span className="bg-dorado text-negro text-[9px] font-dm font-bold tracking-[2px] uppercase px-2.5 py-1">
              {en ? "Low season" : "Temporada baja"}
            </span>
            <span className="font-dm text-crema text-sm group-hover:text-dorado transition-colors">
              {en
                ? `$${PROMO_TEMPORADA.monto} MXN off per person on ${PROMO_TEMPORADA.tours.size} tours`
                : `$${PROMO_TEMPORADA.monto} menos por persona en ${PROMO_TEMPORADA.tours.size} recorridos`}
            </span>
            <span className="font-dm text-crema/45 text-xs">
              {en
                ? `Valid through ${PROMO_TEMPORADA.hastaTexto.en} · packages included`
                : `Válido hasta el ${PROMO_TEMPORADA.hastaTexto.es} · paquetes incluidos`}
            </span>
            <span className="font-dm text-dorado text-[10px] tracking-[2px] uppercase">
              {en ? "See tours →" : "Ver los tours →"}
            </span>
          </Link>
        </section>
      )}

      {/* ── BADGES BANNER ── */}
      <section aria-label={en ? "Awards and recognition" : "Premios y reconocimientos"} className="bg-negro py-5 border-b border-white/8">
        <div className="max-w-5xl mx-auto px-6 flex flex-wrap items-center justify-center gap-8 md:gap-14">
          <img src="/badges/tripadvisor.svg" alt="TripAdvisor" loading="lazy" className="h-9 w-auto opacity-80 hover:opacity-100 transition-opacity" />
          <img src="/badges/travellers-choice.svg" alt="Travellers Choice TripAdvisor" loading="lazy" className="h-9 w-auto opacity-80 hover:opacity-100 transition-opacity" />
          <img src="/badges/top-rated-google.svg" alt="Top Rated Google Maps" loading="lazy" className="h-9 w-auto opacity-80 hover:opacity-100 transition-opacity" />
        </div>
      </section>

      {/* ── TRUST BAR ── */}
      <section aria-label={en ? "Trust and guarantees" : "Confianza y garantías"} className="bg-white border-y border-negro/8 py-5 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-center gap-6 md:gap-10">
          <div className="flex flex-wrap items-center gap-6 text-[10px] tracking-[1.5px] uppercase font-dm text-negro/50">
            <span className="flex items-center gap-1.5"><MessageCircle className="w-3.5 h-3.5" aria-hidden="true" /> {en ? "+10,000 travelers" : "+10,000 viajeros"}</span>
            <span className="text-negro/15 hidden sm:block">|</span>
            {/* 🔴 Iba a maps.app.goo.gl/SWGyih…, que abre la ficha de Hotel
                Paraíso Encantado (otra marca, otras reseñas). */}
            <a href={GOOGLE_PERFIL_URL} target="_blank" rel="noopener noreferrer" className="hover:text-negro/80 transition-colors flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-dorado" aria-hidden="true" />
              <span className="text-negro/70 font-medium">{GOOGLE_RATING}</span> · {en ? `${GOOGLE_RESENAS} Google reviews` : `${GOOGLE_RESENAS} reseñas Google`}
            </a>
            <span className="text-negro/15 hidden sm:block">|</span>
            <span className="flex items-center gap-1.5"><Award className="w-3.5 h-3.5" aria-hidden="true" /> {en ? "NOM-09 guides" : "Guías NOM-09"}</span>
            <span className="text-negro/15 hidden sm:block">|</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> {en ? "Final price" : "Precio final"}</span>
            <span className="text-negro/15 hidden sm:block">|</span>
            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" aria-hidden="true" /> {en ? "Daily departures" : "Salidas todos los días"}</span>
          </div>
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

      {/* ── CATEGORÍAS STRIP ── */}
      <section aria-label={en ? "Experience categories" : "Categorías de experiencias"} className="bg-arena/40 border-b border-negro/8 py-8 overflow-hidden">
        <div className="overflow-x-auto scrollbar-none">
          <div className="flex gap-3 px-6 min-w-max mx-auto justify-center">
            {CATEGORIAS.map(({ Icon, label, href }) => (
              <Link key={label} href={href} className="flex items-center gap-2 border border-negro/15 bg-white px-5 py-2.5 text-xs tracking-[2px] uppercase font-dm text-negro/60 hover:text-verde-selva hover:border-verde-vivo/60 hover:bg-verde-selva/5 transition-all duration-200 whitespace-nowrap">
                <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── TOURS ── */}
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

        {/* Más aire arriba y entre filas: el logotipo del tour sale por encima
            del borde de su tarjeta y sin esto se montaba sobre la de arriba. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-16 pt-10">
          {toursHome.map((t) => (
            <TourCard key={t.slug} tour={t} variant="compact" conLogo />
          ))}
        </div>

        <div className="text-center mt-10">
          <MagneticButton className="inline-block">
            <Link href={lp("/tours")} className="inline-block rounded-xl border border-verde-selva/40 text-verde-selva px-10 py-3.5 text-sm tracking-[2px] uppercase font-dm transition-[background-color,border-color,transform] duration-200 ease-out [@media(hover:hover)]:hover:bg-verde-selva/10 [@media(hover:hover)]:hover:border-verde-selva active:scale-[0.97]">
              {/* El ancla decía "Ver todos los tours": ni Google ni el lector
                  saben cuántos ni de qué. El número sale de TOURS_DB, así que
                  no puede quedarse viejo. */}
              {en ? `See the ${TOURS_DB.length} guided tours` : `Ver los ${TOURS_DB.length} tours guiados`}
            </Link>
          </MagneticButton>
        </div>
      </section>

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
              <CarruselPromos />
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

      {/* ── TESTIMONIOS ── */}
      <section aria-label={en ? "Traveler reviews" : "Reseñas de viajeros"} className="bg-white border-y border-negro/8 py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="reveal-fade text-[10px] tracking-[4px] uppercase text-verde-selva mb-4 font-dm">{en ? "What travelers say" : "Lo que dicen los viajeros"}</p>
            <h2 className="reveal-up font-cormorant font-light text-verde-profundo" style={{ fontSize: "clamp(32px,4.5vw,48px)" }}>
              {en ? <>{GOOGLE_RESENAS} Reviews · <em className="shimmer-gold">{GOOGLE_RATING} stars</em></> : <>{GOOGLE_RESENAS} Reseñas · <em className="shimmer-gold">{GOOGLE_RATING} estrellas</em></>}
            </h2>
            <div className="flex justify-center gap-1 mt-3 star-group">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-dorado text-dorado star-icon" aria-hidden="true" />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIOS.map((tt) => (
              <article key={tt.nombre} className="border border-negro/8 overflow-hidden hover:border-verde-selva/30 transition-colors rounded-xl shadow-sm testimonial-card">
                <div className="aspect-[4/3] overflow-hidden">
                  <img src={tt.img} alt={tt.imgAlt} className="w-full h-full object-cover" loading="lazy" />
                </div>
                <div className="p-6">
                  <Quote className="w-6 h-6 text-dorado/40 mb-3" aria-hidden="true" />
                  <p className="text-negro/70 font-dm text-sm leading-relaxed mb-5 italic">&ldquo;{tt.quote}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <img src={tt.foto} alt={tt.nombre} className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-negro/10" loading="lazy" />
                    <div>
                      <p className="font-dm text-negro/80 text-sm font-medium">{tt.nombre}</p>
                      <p className="font-dm text-negro/40 text-[11px]">{tt.meta}</p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="text-center mt-10">
            <a href={GOOGLE_PERFIL_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-verde-selva/40 text-verde-selva px-8 py-3 text-sm tracking-[2px] uppercase font-dm transition-[background-color,border-color,transform] duration-200 ease-out [@media(hover:hover)]:hover:bg-verde-selva/10 [@media(hover:hover)]:hover:border-verde-selva active:scale-[0.97]">
              <Star className="w-4 h-4 fill-dorado text-dorado" aria-hidden="true" />
              {en ? `Read all ${GOOGLE_RESENAS} reviews on Google` : `Ver las ${GOOGLE_RESENAS} reseñas en Google`}
            </a>
          </div>
        </div>
      </section>

      {/* ── BLOG PREVIEW (solo ES) ── */}
      {!en && recentPosts.length > 0 && (
        <section aria-label="Artículos recientes del blog" className="bg-arena/30 border-y border-negro/8 py-20 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <p className="reveal-fade text-[10px] tracking-[4px] uppercase text-verde-selva mb-4 font-dm">Del blog</p>
              <h2 className="reveal-up font-cormorant font-light text-verde-profundo" style={{ fontSize: "clamp(32px,4.5vw,48px)" }}>
                Guías & <em className="shimmer-gold">Rutas de Viaje</em>
              </h2>
              <div className="heading-underline" aria-hidden="true" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* urlBlog quita el sufijo de año: 18 de los 40 artículos lo
                  arrastran y esa forma responde 308. Enlazar el slug crudo
                  mandaba a la portada —la página con más clics del sitio— a
                  una redirección. */}
              {recentPosts.map((post) => (
                <Link key={post.slug} href={urlBlog(post.slug)} className="group">
                  <article className="bg-white border border-negro/8 overflow-hidden hover:border-verde-selva/30 transition-colors h-full flex flex-col rounded-xl shadow-sm">
                    {post.coverImageUrl && (
                      <div className="aspect-video overflow-hidden">
                        <img src={post.coverImageUrl} alt={post.coverImageAlt || post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      </div>
                    )}
                    <div className="p-6 flex flex-col flex-1">
                      {post.tags[0] && (<span className="text-[9px] tracking-[3px] uppercase text-verde-selva/70 font-dm mb-3">{post.tags[0]}</span>)}
                      <h3 className="font-cormorant text-verde-profundo text-xl mb-3 leading-snug group-hover:text-dorado transition-colors flex-1">{post.title}</h3>
                      {post.excerpt && (<p className="text-negro/50 font-dm text-xs leading-relaxed mb-4">{post.excerpt.slice(0, 110)}…</p>)}
                      <div className="flex items-center gap-3 text-[9px] tracking-[2px] uppercase font-dm text-negro/30 mt-auto">
                        <span>{post.readingTime} min lectura</span><span>·</span>
                        <span>{new Date(post.publishedAt).toLocaleDateString("es-MX", { month: "short", year: "numeric" })}</span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
            <div className="text-center mt-10">
              <Link href="/blog" className="inline-block rounded-xl border border-verde-selva/40 text-verde-selva px-10 py-3.5 text-sm tracking-[2px] uppercase font-dm transition-[background-color,border-color,transform] duration-200 ease-out [@media(hover:hover)]:hover:bg-verde-selva/10 [@media(hover:hover)]:hover:border-verde-selva active:scale-[0.97]">
                Ver todos los artículos
              </Link>
            </div>
          </div>
        </section>
      )}

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
                  <p>The Huasteca Potosina is a natural region in the northeast of the state of San Luis Potosí, Mexico: Ciudad Valles is its hub city and Xilitla — the Pueblo Mágico where we are based — sits about 2.5 hours from Tampico airport (TAM).</p>
                  <p>Tampico is a short hop from Texas, and from the airport it&apos;s two and a half hours to Xilitla — in a private vehicle, driven by us. You sleep in a Pueblo Mágico, in our own hotel, not on a resort strip.</p>
                  <p>Every guide holds NOM-09, Mexico&apos;s federal guiding certification, and travel insurance is in the price for every traveler on every tour. Groups stop at {GRUPO_MAX}. Fully bilingual guides are available — just ask when you book.</p>
                  <p>{paqueteIngles.dias} days, {paqueteIngles.noches} nights, the tours, the hotel and the insurance: <strong className="text-verde-profundo">${paqueteIngles.precio.toLocaleString("en-US")} MXN for two people</strong>. The price you see on our booking page is the price you pay.</p>
                </>
              ) : (
                <>
                  {/* La consulta que más impresiones trae al inicio es
                      "huasteca potosina" a secas, y detrás de ella hay alguien
                      que todavía no sabe DÓNDE queda ni cómo se llega. Esta
                      frase es la única del inicio que se puede citar sola.
                      Todos sus datos salen de GEOGRAFIA y COMO_LLEGAR en
                      src/lib/llmsTxt.ts: noreste de San Luis Potosí, hub en
                      Ciudad Valles, base en Xilitla, Tampico (TAM) a ~2.5 h y
                      CDMX a 5.5–6 h por 339 km de sierra. */}
                  <p>La Huasteca Potosina es una región natural del noreste del estado de San Luis Potosí, en México: su ciudad de entrada es Ciudad Valles y su Pueblo Mágico es Xilitla, donde tenemos nuestra base. Se llega en avión a Tampico (TAM), a unas 2.5 horas de Xilitla, o por carretera desde la Ciudad de México en 5.5 a 6 horas de auto —339 km de sierra—; en autobús, la salida nocturna desde la Terminal Central del Norte llega a Xilitla a la mañana siguiente.</p>
                  <p>La Huasteca Potosina es una de las regiones más biodiversas de México, donde la selva tropical coexiste con cañones kársticos, cascadas turquesas y tradiciones milenarias de la cultura Huasteca, reconocida por la UNESCO.</p>
                  <p>Aquí el tiempo se mide diferente: por el vuelo circular de miles de vencejos al amanecer sobre el Sótano de las Golondrinas, por el color cambiante del agua del Tamul entre enero y octubre, por la luz que atraviesa el Puente de Dios solo entre las 11 y las 13 horas.</p>
                  <p>No es solo un destino. Es una experiencia que redefine lo que significa la naturaleza en México.</p>
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
              <span>Fully bilingual guides on request</span>
            </div>
          </div>
        </section>
      )}

      {/* ── PLANIFICADOR IA + LEAD MAGNET + INFO PRÁCTICA (solo ES) ── */}
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

          <section aria-label="Guía Definitiva de la Huasteca Potosina" className="relative py-20 px-6 bg-verde-profundo overflow-hidden">
            <FloatingLeaves />
            <div className="relative z-10 max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
              <div className="text-center md:text-left">
                <span className="reveal-fade inline-block text-[9px] tracking-[4px] uppercase text-verde-vivo border border-verde-vivo/40 px-4 py-1.5 mb-6 font-dm">✦ Gratis · 2 minutos</span>
                <h2 className="reveal-up font-cormorant font-light text-crema mb-4" style={{ fontSize: "clamp(28px,4vw,46px)" }}>
                  Todo lo que necesitas para{" "}<em className="shimmer-gold">viajar solo por la Huasteca</em>
                </h2>
                <p className="reveal-up reveal-d1 text-crema/55 font-dm text-sm leading-relaxed mb-6 max-w-md mx-auto md:mx-0">
                  {/* Describe el PDF que SE ENTREGA (public/guia-huasteca-potosina.pdf:
                      13 páginas, UN itinerario de 5 días). Prometía «3 itinerarios
                      (3, 5 y 7 días)» y «8 destinos», que son de la guía de pago. Tampoco
                      «lo que cuesta cada parada»: las entradas del PDF no cuadran
                      con DESTINOS_DB (ver guia/page.tsx). */}
                  Cómo llegar, dónde quedarte, cuánto gastas al día si vas por tu cuenta, un itinerario de 5 días con la hora de mejor luz, checklist y los tips locales que no encontrarás en ningún blog. Edición 2026.
                </p>
                <div className="flex flex-wrap gap-4 justify-center md:justify-start mb-8 text-[10px] tracking-[2px] uppercase font-dm text-crema/40">
                  <span>✓ Itinerario de 5 días</span>
                  <span>✓ Horarios de luz</span>
                  <span>✓ Checklist</span>
                </div>
                {/* Gratis a cambio del correo. Cobrar $49 por el imán de
                    leads era cobrar por lo único que convierte a un visitante
                    frío en alguien a quien puedes escribirle: casi nadie
                    pagaba, y los que no pagaban se iban sin dejar rastro. */}
                <GuiaGratisForm />
              </div>
              <div className="relative z-10">
                <GuiaMockup />
              </div>
            </div>
          </section>

          <section aria-label="Información práctica para tu viaje" className="bg-white border-y border-negro/8 py-16 px-6">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="reveal-up font-cormorant font-light text-verde-profundo" style={{ fontSize: "clamp(28px,4vw,44px)" }}>
                  Antes de <em className="text-dorado">viajar</em>
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { Icon: Bus,       title: "Cómo llegar",    text: "Ciudad Valles es la puerta de entrada. Vuelos desde CDMX o autobús ADO directo en 8 horas.", href: "/info-practica#como-llegar" },
                  { Icon: Calendar,  title: "Mejor época",    text: "Todo el año. Nov–Mayo ideal para cascadas. Jun–Oct lush verde, más lluvia, menos turismo.", href: "/info-practica#cuando-viajar" },
                  { Icon: BedDouble, title: "Dónde quedarse", text: "Ciudad Valles como base. Opciones boutique en Xilitla y Tamasopo para inmersión total.", href: "/info-practica#donde-quedarse" },
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
            {en ? "November to April is dry season" : "Cuando quieras"}
          </p>
          <h2 className="reveal-up font-cormorant font-light text-crema mb-5" style={{ fontSize: "clamp(30px,4.5vw,50px)" }}>
            {en ? <>Come before we&apos;re the reason <em className="shimmer-gold">it changed</em></> : <>Tu viaje a la Huasteca <em className="shimmer-gold">empieza aquí</em></>}
          </h2>
          {/* La urgencia en inglés va INVERTIDA a propósito: para el viajero
              americano informado "el próximo Tulum" es el destino arruinado, no
              la aspiración. Prometerlo sería prometerle justo lo que evita. La
              escasez honesta es la temporada seca, no un colapso inventado. */}
          <p className="reveal-up reveal-d1 text-crema/60 font-dm text-sm leading-relaxed max-w-xl mx-auto mb-9">
            {en
              ? `We'd like to keep the rivers the way they are — that's why our groups stop at ${GRUPO_MAX} and we work with the communities we grew up in. Dry season runs November through April: bluest water, best hiking, and the dates that fill first. A 30% deposit holds any trip, with the balance due on tour day. Free cancellation up to 48 h before${salvoEn}.`
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
            {GOOGLE_RATING} ★ · {GOOGLE_RESENAS} {en ? "Google reviews" : "reseñas Google"} · +10,000 {en ? "travelers" : "viajeros"}
          </p>
        </div>
      </section>

      {/* ── BADGES DE CERTIFICACIÓN ── */}
      <section aria-label={en ? "Official certifications and recognition" : "Certificaciones y reconocimientos oficiales"} className="bg-white border-t border-negro/8 py-10 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="reveal-fade text-center text-[9px] tracking-[3px] uppercase text-negro/30 font-dm mb-8">{en ? "Certified and recognized by" : "Certificados y reconocidos por"}</p>
          <div className="flex flex-wrap items-center justify-center gap-10 md:gap-16">
            <img src="/badges/sectur.png" alt="SECTUR — Mexico Ministry of Tourism" loading="lazy" className="h-12 w-auto opacity-75 hover:opacity-100 transition-opacity" />
            <img src="/badges/tripadvisor-full.png" alt="Tripadvisor" loading="lazy" className="h-10 w-auto opacity-75 hover:opacity-100 transition-opacity" />
            <img src="/badges/viajemos-todos.png" alt="Viajemos Todos por México" loading="lazy" className="h-12 w-auto opacity-75 hover:opacity-100 transition-opacity" />
            <img src="/badges/travellers-choice.svg" alt="Travellers' Choice — TripAdvisor" loading="lazy" className="h-10 w-auto opacity-75 hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </section>

      {/* El pie de página vive ahora en el shell (SiteFooter), para que lo
          tengan las 43 páginas y no solo la home. */}
    </main>
  );
}
