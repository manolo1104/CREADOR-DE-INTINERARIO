import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { TarjetaViajeCdmx } from "@/components/viajeCdmx/TarjetaViajeCdmx";
import { DESTINOS_DB, type Destino } from "@/lib/destinos";
import DestinosClient, { type ItemDestino } from "./DestinosClient";
import RutasDias, { type Ruta } from "./RutasDias";
import { ArrowUpRight } from "lucide-react";
import { asLocale, localePath, buildAlternates, SITE, type Locale } from "@/lib/i18n/config";
import { localizeDestino, localizeTour } from "@/lib/i18n/localize";
import { buildBreadcrumbJsonLd } from "@/lib/jsonld";
import {
  ATRIBUTOS, CATEGORIAS, NIVELES, atributosDe, costoTarjeta, mesesDeTemporada, minutosValles, nivelTexto, type Nivel,
} from "@/lib/destinosAtributos";
import { duracionTexto } from "@/lib/tiemposADestinos";
import { toursQueIncluyen } from "@/lib/tourMapping";
import { TOURS_DB, etiquetaUnidad, esPorPersona, type Tour } from "@/lib/tours";
import { fmtNumber } from "@/lib/i18n/format";

export function generateMetadata(): Metadata {
  const locale = asLocale(headers().get("x-locale"));
  const n = DESTINOS_DB.length;
  // Título ≤ 60 y descripción 120–160 (10 nov 2026). Sin año en el título: el
  // índice no caduca. La auditoría del 20 nov pidió el año en el H1, no aquí.
  const title = locale === "en"
    ? `${n} Huasteca Potosina Destinations | Hours & Prices`
    : `${n} Destinos de la Huasteca Potosina | Horarios y Precios`;
  const description = locale === "en"
    ? `The ${n} destinations of the Huasteca Potosina with real 2026 prices, hours and how to get there: Tamul, Las Pozas, Puente de Dios, Micos and more.`
    : `Los ${n} destinos de la Huasteca Potosina con precios 2026, horarios y cómo llegar: Tamul, Las Pozas, Puente de Dios, Micos y más, con mapa y filtros.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE}${localePath("/destinos", locale)}`,
      siteName: "Tours Huasteca Potosina",
      locale: locale === "en" ? "en_US" : "es_MX",
      type: "website",
      // Sin `images` A PROPÓSITO: cada idioma toma su `opengraph-image.tsx`.
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${SITE}/og-image.jpg`],
    },
    alternates: buildAlternates("/destinos", locale),
  };
}

/** Por qué está cada imprescindible (una línea, escrita a mano). */
const POR_QUE: Record<string, { es: string; en: string }> = {
  "cascada-de-tamul": { es: "La cascada más alta de SLP, en canoa por el cañón.", en: "SLP's tallest waterfall, reached by canoe." },
  "las-pozas-jardin-surrealista": { es: "El jardín surrealista de Edward James en la selva.", en: "Edward James's surrealist garden in the jungle." },
  "puente-de-dios-tamasopo": { es: "Una cueva con poza turquesa bajo un arco de roca.", en: "A cave and turquoise pool under a rock arch." },
  "cascadas-de-micos": { es: "Siete saltos a 30 min de Ciudad Valles.", en: "Seven waterfall jumps 30 min from Ciudad Valles." },
  "sotano-de-las-golondrinas": { es: "Miles de aves salen en espiral de un abismo de 512 m.", en: "Thousands of birds spiral out of a 512 m pit." },
  "cascadas-minas-viejas": { es: "Dos caídas de 50 m sobre una poza azul.", en: "Twin 50 m falls over a blue pool." },
  "cascadas-de-tamasopo": { es: "Las pozas más cómodas para ir con niños.", en: "The easiest swimming holes for families." },
  "laguna-media-luna": { es: "Manantial tibio y cristalino para snorkel y buceo.", en: "A warm, crystal-clear spring for snorkeling and diving." },
  "sotano-de-las-huahuas": { es: "El otro gran sótano de aves, con menos gente.", en: "The other great bird pit, with fewer crowds." },
  "zona-arqueologica-tamtoc": { es: "La ciudad prehispánica más importante de la Huasteca.", en: "The Huasteca's most important ancient city." },
};

/** Rutas de 1, 2 y 3 días. Los lugares enlazan a su ficha; cada día, a su tour. */
const RUTAS: { dias: string; diasEn: string; jornadas: { titulo: string; tituloEn: string; lugares: string[]; tour: string }[] }[] = [
  {
    dias: "1 día", diasEn: "1 day",
    jornadas: [
      { titulo: "Desde Ciudad Valles", tituloEn: "From Ciudad Valles", lugares: ["cascada-de-tamul", "cueva-del-agua", "sotano-de-las-huahuas"], tour: "expedicion-tamul" },
    ],
  },
  {
    dias: "2 días", diasEn: "2 days",
    jornadas: [
      { titulo: "Día 1 · Tamul", tituloEn: "Day 1 · Tamul", lugares: ["cascada-de-tamul", "cueva-del-agua", "sotano-de-las-huahuas"], tour: "expedicion-tamul" },
      { titulo: "Día 2 · Xilitla", tituloEn: "Day 2 · Xilitla", lugares: ["las-pozas-jardin-surrealista", "nacimiento-huichihuayan", "castillo-de-la-salud"], tour: "ruta-surrealista-edward-james" },
    ],
  },
  {
    dias: "3 días", diasEn: "3 days",
    jornadas: [
      { titulo: "Día 1 · Tamul", tituloEn: "Day 1 · Tamul", lugares: ["cascada-de-tamul", "cueva-del-agua", "sotano-de-las-huahuas"], tour: "expedicion-tamul" },
      { titulo: "Día 2 · Xilitla", tituloEn: "Day 2 · Xilitla", lugares: ["las-pozas-jardin-surrealista", "nacimiento-huichihuayan", "castillo-de-la-salud"], tour: "ruta-surrealista-edward-james" },
      { titulo: "Día 3 · Tamasopo", tituloEn: "Day 3 · Tamasopo", lugares: ["puente-de-dios-tamasopo", "cascadas-de-tamasopo"], tour: "ruta-acuatica-puente-de-dios" },
    ],
  },
];

/** La barra de cada nivel, del verde al rojo (misma escala que las tarjetas). */
const NIVEL_BARRA: Record<Nivel, string> = { 1: "bg-emerald-500", 2: "bg-amber-500", 3: "bg-orange-600", 4: "bg-red-600" };

function precioTour(t: Tour, locale: Locale): string {
  const desde = !esPorPersona(t) || t.rutas?.length ? (locale === "en" ? "from " : "desde ") : "";
  return `${desde}$${fmtNumber(t.precio, locale)} MXN ${etiquetaUnidad(t, locale === "en")}`;
}

function faqsIndice(en: boolean): { pregunta: string; respuesta: string }[] {
  return en
    ? [
        { pregunta: "When is the best time to visit the Huasteca Potosina?", respuesta: "November to March: turquoise water, little rain and mild weather. From July to October it rains: rivers run brown and Civil Protection closes swimming spots when they rise. In April and May it is very hot and some waterfalls, like Tamul, can run almost dry." },
        { pregunta: "Should I stay in Ciudad Valles or Xilitla?", respuesta: "Ciudad Valles sits in the middle of almost everything (Micos 30 min, Tamul and Tamasopo about 1 h, El Naranjo about 1 h 45 min). Xilitla is the base for Las Pozas, Huichihuayán and the cloud forest. With three days or more, split your stay." },
        { pregunta: "How many days do I need?", respuesta: "Two full days cover the essentials (Tamul and Xilitla). With three or four you add Tamasopo and the El Naranjo waterfalls." },
        { pregunta: "How much cash should I bring?", respuesta: "Most sites are cash only and there are no ATMs in the mountains: withdraw in Ciudad Valles, Xilitla or Aquismón. Entry fees range from free to $200 MXN per person, plus life jacket, parking and, at Tamul, the canoe (about $2,000 MXN per boat)." },
        { pregunta: "Can I visit without a car?", respuesta: "Yes, but it takes time: buses link Ciudad Valles, Xilitla, Aquismón and El Naranjo, but most sites are reached by shared taxi or local van from the nearest town, without fixed schedules. Tours include transport." },
        { pregunta: "Is it safe?", respuesta: "The main risks are in the water: always wear a life jacket, don't swim at the foot of waterfalls and respect Civil Protection closures in the rainy season. Avoid driving mountain roads at night (curves and fog)." },
      ]
    : [
        { pregunta: "¿Cuál es la mejor época para visitar la Huasteca Potosina?", respuesta: "De noviembre a marzo: agua turquesa, poca lluvia y clima templado. De julio a octubre llueve: los ríos bajan cafés y Protección Civil cierra los parajes con agua cuando crecen. En abril y mayo hace mucho calor y algunas cascadas, como Tamul, pueden quedarse casi sin agua." },
        { pregunta: "¿Dónde hospedarse: Ciudad Valles o Xilitla?", respuesta: "Ciudad Valles queda en medio de casi todo (Micos a 30 min, Tamul y Tamasopo a cerca de 1 h, El Naranjo a 1 h 45 min). Xilitla es la base para Las Pozas, Huichihuayán y el bosque de niebla. Con tres días o más conviene dividir la estancia." },
        { pregunta: "¿Cuántos días se necesitan para la Huasteca Potosina?", respuesta: "Con dos días completos ves lo esencial (Tamul y Xilitla). Con tres o cuatro sumas Tamasopo y las cascadas de El Naranjo." },
        { pregunta: "¿Cuánto efectivo hay que llevar?", respuesta: "Casi todos los parajes cobran solo en efectivo y en la sierra no hay cajeros: retira en Ciudad Valles, Xilitla o Aquismón. Las entradas van de gratis a $200 por persona; aparte se pagan chaleco, estacionamiento y, en Tamul, la canoa (unos $2,000 por embarcación)." },
        { pregunta: "¿Se puede ir sin coche?", respuesta: "Sí, pero toma tiempo: hay autobuses entre Ciudad Valles, Xilitla, Aquismón y El Naranjo, pero a la mayoría de los parajes se llega en colectivo o taxi desde el pueblo más cercano, sin horarios fijos. Los tours incluyen el traslado." },
        { pregunta: "¿Es segura la Huasteca Potosina?", respuesta: "Los riesgos principales están en el agua: usa siempre chaleco, no nades al pie de las cascadas y respeta los cierres de Protección Civil en temporada de lluvias. Evita manejar de noche por la sierra (curvas y neblina)." },
      ];
}

export default function DestinosPage() {
  const locale = asLocale(headers().get("x-locale"));
  const en = locale === "en";
  const n = DESTINOS_DB.length;
  const loc = (d: Destino) => localizeDestino(d, locale);
  const porSlug = (slug: string) => DESTINOS_DB.find((d) => d.slug === slug)!;
  const tourDe = (slug: string) => {
    const t = TOURS_DB.find((x) => x.slug === slug);
    return t ? localizeTour(t, locale) : undefined;
  };

  // La lista LIGERA para el explorador (ver `ItemDestino`).
  const items: ItemDestino[] = DESTINOS_DB.map((base) => {
    const d = loc(base);
    const atr = atributosDe(base.slug);
    const min = minutosValles(base);
    const ref = toursQueIncluyen(base.slug)[0];
    const tour = ref ? tourDe(ref.slug) : undefined;
    return {
      slug: base.slug,
      href: localePath(`/destinos/${base.slug}`, locale),
      nombre: d.nombre,
      zona: d.zona,
      tipo: d.tipo,
      imagen: base.imagen_hero || base.imagen_galeria[0] || undefined,
      costo: costoTarjeta(d, en),
      gratis: base.precio_entrada_mxn === 0,
      minValles: min,
      tiempoValles: min != null ? `~${duracionTexto(min)}` : null,
      nivel: atr.nivel,
      nivelTexto: nivelTexto(atr.nivel, en),
      nado: atr.nado,
      ninos: atr.ninos,
      categorias: atr.categorias,
      imprescindible: atr.imprescindible,
      meses: mesesDeTemporada(base.temporada_ideal),
      lat: base.lat,
      lng: base.lng,
      tour: tour ? { nombre: (tour.nombreCorto || tour.nombre).split("—")[0].trim(), href: localePath(`/tours/${tour.slug}`, locale) } : undefined,
    };
  });

  const imprescindibles = Object.entries(ATRIBUTOS)
    .filter(([, a]) => a.imprescindible)
    .sort((a, b) => a[1].imprescindible! - b[1].imprescindible!)
    .map(([slug]) => porSlug(slug));

  // Mosaico: rango 1 (2×2), 3, 4, 5, 6, 7, 8, rango 2 (2×2), 9, 10.
  const porRango = (r: number) => imprescindibles[r - 1];
  const ordenMosaico = [1, 3, 4, 5, 6, 7, 8, 2, 9, 10]
    .filter((r) => porRango(r))
    .map((r) => ({ base: porRango(r), rango: r }));

  const heroFotos = ["cascada-de-tamul", "las-pozas-jardin-surrealista", "cascadas-de-micos"].map((slug) => {
    const base = porSlug(slug);
    return { src: base.imagen_hero, alt: loc(base).nombre, href: localePath(`/destinos/${slug}`, locale) };
  });

  const rutasCliente: Ruta[] = RUTAS.map((r) => ({
    dias: en ? r.diasEn : r.dias,
    jornadas: r.jornadas.map((j) => {
      const t = tourDe(j.tour);
      return {
        titulo: (en ? j.tituloEn : j.titulo).replace(/^D[ií]a \d+ · |^Day \d+ · /, ""),
        lugares: j.lugares.map((sl) => {
          const b = porSlug(sl);
          return { nombre: loc(b).nombre, href: localePath(`/destinos/${sl}`, locale), foto: b.imagen_hero || b.imagen_galeria[0] };
        }),
        tour: t ? { nombre: (t.nombreCorto || t.nombre).split("—")[0].trim(), href: localePath(`/tours/${t.slug}`, locale), precio: precioTour(t, locale) } : undefined,
      };
    }),
  }));

  const faqs = faqsIndice(en);

  // La Huasteca como destino turístico que INCLUYE cada atracción (auditoría:
  // jerarquía geográfica), además de la lista.
  const destinoSchema = {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    name: "Huasteca Potosina",
    url: `${SITE}${localePath("/destinos", locale)}`,
    inLanguage: en ? "en" : "es-MX",
    containedInPlace: { "@type": "State", name: "San Luis Potosí", containedInPlace: { "@type": "Country", name: "México" } },
    includesAttraction: DESTINOS_DB.map((base) => {
      const d = loc(base);
      return {
        "@type": "TouristAttraction",
        name: d.nombre,
        url: `${SITE}${localePath(`/destinos/${d.slug}`, locale)}`,
        address: { "@type": "PostalAddress", addressLocality: d.zona, addressRegion: "San Luis Potosí", addressCountry: "MX" },
      };
    }),
  };
  const destinosListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: en ? "Huasteca Potosina Destinations" : "Destinos Huasteca Potosina",
    url: `${SITE}${localePath("/destinos", locale)}`,
    inLanguage: en ? "en" : "es-MX",
    numberOfItems: n,
    itemListElement: DESTINOS_DB.map((base, i) => {
      const d = loc(base);
      return {
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "TouristAttraction",
          name: d.nombre,
          description: d.descripcion,
          url: `${SITE}${localePath(`/destinos/${d.slug}`, locale)}`,
          image: d.imagen_hero ? (d.imagen_hero.startsWith("http") ? d.imagen_hero : `${SITE}${d.imagen_hero}`) : undefined,
          address: { "@type": "PostalAddress", addressLocality: d.zona, addressRegion: "San Luis Potosí", addressCountry: "MX" },
        },
      };
    }),
  };
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: en ? "en" : "es-MX",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.pregunta, acceptedAnswer: { "@type": "Answer", text: f.respuesta } })),
  };
  // /destinos cuelga de la home: dos niveles.
  const breadcrumbSchema = buildBreadcrumbJsonLd(
    [{ name: en ? "Destinations" : "Destinos", path: "/destinos" }],
    locale,
  );

  const H2 = "font-cormorant font-light text-crema mb-3";
  const guias = en
    ? [
        { href: "/en/huasteca-potosina-waterfalls", t: "The Huasteca's waterfalls", d: "Which one fits your trip" },
        { href: "/en/que-hacer-en-la-huasteca-potosina", t: "Things to do", d: "Ideas by kind of trip" },
        { href: "/en/xilitla-o-ciudad-valles", t: "Xilitla or Ciudad Valles?", d: "Where to base yourself" },
        { href: "/en/where-to-stay-in-huasteca-potosina", t: "Where to stay", d: "By area and budget" },
        { href: "/en/info-practica", t: "Practical info", d: "Daily budget and itineraries" },
      ]
    : [
        { href: "/cascadas-de-la-huasteca-potosina", t: "Las cascadas de la Huasteca", d: "Cuál conviene según tu viaje" },
        { href: "/que-hacer-en-la-huasteca-potosina", t: "Qué hacer en la Huasteca", d: "Ideas por tipo de viaje" },
        { href: "/xilitla-o-ciudad-valles", t: "¿Xilitla o Ciudad Valles?", d: "Dónde conviene dormir" },
        { href: "/donde-hospedarse-en-la-huasteca-potosina", t: "Dónde hospedarse", d: "Por zona y presupuesto" },
        { href: "/info-practica", t: "Información práctica", d: "Presupuesto diario e itinerarios" },
      ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(destinoSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(destinosListSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <main className="min-h-screen">
        {/* ── HERO (pase de diseño, 20 nov 2026): dos columnas, texto a la
            izquierda y tres fotos reales a la derecha. El H1 lleva la
            respuesta de la auditoría en una segunda línea más chica. ── */}
        <section className="hero-bajo-menu pt-12 pb-14 md:pt-16">
          <div className="max-w-6xl mx-auto px-6 grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:items-center">
            <div>
              <h1 className="font-cormorant font-light text-crema leading-[1.05]" style={{ fontSize: "clamp(38px,5vw,64px)" }}>
                {en ? "Huasteca Potosina destinations" : "Destinos de la Huasteca Potosina"}
                <span className="mt-3 block font-dm text-base md:text-lg font-normal leading-snug text-crema/70">
                  {en ? `${n} places with prices, hours and how to get there (2026)` : `${n} lugares con precios, horarios y cómo llegar (2026)`}
                </span>
              </h1>
              <p className="mt-6 max-w-[52ch] font-dm text-sm md:text-base leading-relaxed text-crema/65">
                {en
                  ? "Base yourself in Ciudad Valles for the waterfalls and in Xilitla for Las Pozas. Two full days cover the essentials; November to March the water runs turquoise."
                  : "Duerme en Ciudad Valles para las cascadas y en Xilitla para Las Pozas. Con dos días completos ves lo esencial; de noviembre a marzo el agua está turquesa."}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#lista" className="tactil inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-lima px-6 font-dm text-sm font-medium text-negro hover:bg-verde-vivo hover:text-crema">
                  {en ? `Explore all ${n}` : `Explorar los ${n}`}
                </a>
                <a href="#rutas" className="tactil inline-flex min-h-[48px] items-center rounded-xl border border-white/20 px-6 font-dm text-sm text-crema/85 hover:border-lima/50 hover:text-lima">
                  {en ? "1 to 3 day routes" : "Rutas de 1 a 3 días"}
                </a>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 lg:grid-cols-2 lg:grid-rows-2 lg:h-[440px]">
              {heroFotos.map((f, k) => (
                <Link key={f.href} href={f.href}
                  className={`group relative block overflow-hidden rounded-2xl h-32 sm:h-44 lg:h-auto ${k === 0 ? "lg:row-span-2" : ""}`}>
                  <Image src={f.src} alt={f.alt} fill priority={k === 0} sizes="(max-width: 1024px) 33vw, 280px" className="zoom-foto object-cover" />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-negro/85 to-transparent px-3 pb-2.5 pt-8 font-dm text-xs text-crema/90">{f.alt}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── LOS 10 IMPRESCINDIBLES: mosaico con dos piezas grandes ──
            Orden pensado para la rejilla de 4 columnas: Tamul (2×2) arriba a
            la izquierda, Las Pozas (2×2) abajo a la derecha, y los otros 8 en
            los huecos. En el teléfono, 2 columnas con las grandes a lo ancho. */}
        <section id="imprescindibles" className="max-w-6xl mx-auto px-6 py-14 scroll-mt-24">
          <h2 className={H2} style={{ fontSize: "clamp(28px,3.5vw,42px)" }}>{en ? "The 10 must-sees" : "Los 10 imprescindibles"}</h2>
          <p className="font-dm text-sm text-crema/60 max-w-[60ch] mb-8">
            {en
              ? "What our travelers ask for most and what people search for most, with one of each kind: waterfalls, bird pits, swimming holes, art and archaeology."
              : "Lo que más piden nuestros viajeros y lo que más se busca, con uno de cada tipo: cascadas, sótanos de aves, pozas, arte y arqueología."}
          </p>
          <ol className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:auto-rows-[190px]">
            {ordenMosaico.map(({ base, rango }) => {
              const d = loc(base);
              const grande = rango <= 2;
              const foto = base.imagen_hero || base.imagen_galeria[0];
              return (
                <li key={base.slug} className={grande ? "col-span-2 lg:row-span-2" : ""}>
                  <Link href={localePath(`/destinos/${base.slug}`, locale)}
                    className={`group relative block h-full overflow-hidden rounded-2xl ${grande ? "min-h-[240px]" : "min-h-[170px]"}`}>
                    {foto && <Image src={foto} alt={d.nombre} fill sizes={grande ? "(max-width: 1024px) 100vw, 560px" : "(max-width: 1024px) 50vw, 280px"} className="zoom-foto object-cover" />}
                    <span className="absolute inset-0 bg-gradient-to-t from-negro/90 via-negro/30 to-transparent" />
                    <span className="absolute inset-x-0 bottom-0 p-4">
                      <span className={`block font-cormorant text-crema leading-tight ${grande ? "text-3xl" : "text-lg"}`}>
                        <span className="font-dm text-xs text-dorado mr-1.5 align-middle">{rango}</span>{d.nombre}
                      </span>
                      <span className={`mt-1 block font-dm text-crema/70 leading-snug ${grande ? "text-sm max-w-[40ch]" : "text-[11px]"}`}>
                        {(en ? POR_QUE[base.slug]?.en : POR_QUE[base.slug]?.es) ?? d.zona}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>

        {/* ── RUTAS DE 1, 2 O 3 DÍAS: selector de días + línea de tiempo ── */}
        <section id="rutas" className="border-y border-white/10 bg-verde-profundo/25 py-14 scroll-mt-24">
          <div className="max-w-6xl mx-auto px-6">
            <h2 className={H2} style={{ fontSize: "clamp(28px,3.5vw,42px)" }}>{en ? "If you have 1, 2 or 3 days" : "Si tienes 1, 2 o 3 días"}</h2>
            <p className="font-dm text-sm text-crema/60 max-w-[60ch] mb-7">
              {en ? "Routes that work. Each day can be done on your own or with the tour shown." : "Rutas que funcionan. Cada día se puede hacer por tu cuenta o con el tour indicado."}
            </p>
            <RutasDias rutas={rutasCliente} en={en} />
          </div>
        </section>

        {/* ── LOS N DESTINOS: FILTROS, LISTA Y MAPA ── */}
        <div className="pt-14">
          <div className="max-w-6xl mx-auto px-6 mb-6">
            <h2 className={H2} style={{ fontSize: "clamp(26px,3.5vw,40px)" }}>{en ? `All ${n} destinations` : `Los ${n} destinos`}</h2>
            <p className="font-dm text-sm text-crema/60 max-w-2xl">
              {en ? "Filter by type of place or by what matters to you, and switch to the map to see what's close." : "Filtra por tipo de lugar o por lo que te importa, y cambia al mapa para ver qué queda cerca."}
            </p>
          </div>
          <DestinosClient
            items={items}
            en={en}
            categorias={CATEGORIAS.map((c) => ({ key: c.key, label: en ? c.en : c.es }))}
          />
        </div>

        {/* ── CÓMO MEDIMOS EL NIVEL: una escala, no cuatro tarjetas ── */}
        <section id="niveles" className="max-w-6xl mx-auto px-6 pb-16 scroll-mt-24">
          <h2 className="font-cormorant text-crema text-2xl md:text-3xl mb-6">{en ? "How we rate effort levels" : "Cómo medimos el nivel físico"}</h2>
          <ol className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {([1, 2, 3, 4] as Nivel[]).map((nv) => (
              <li key={nv}>
                <span aria-hidden="true" className="mb-4 flex gap-1">
                  {[1, 2, 3, 4].map((k) => (
                    <span key={k} className={`h-1.5 flex-1 rounded-full ${k <= nv ? NIVEL_BARRA[nv] : "bg-white/10"}`} />
                  ))}
                </span>
                <p className="font-cormorant text-crema text-xl">{en ? NIVELES[nv].en : NIVELES[nv].es}</p>
                <p className="mt-1 font-dm text-xs leading-relaxed text-crema/60">{en ? NIVELES[nv].criterioEn : NIVELES[nv].criterioEs}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── PLANEA POR TEMA: lista de enlaces, no otra rejilla de tarjetas ── */}
        <section className="max-w-6xl mx-auto px-6 pb-16">
          <h2 className="font-cormorant text-crema text-2xl md:text-3xl mb-4">{en ? "Plan by topic" : "Planea por tema"}</h2>
          <ul className="grid gap-x-10 sm:grid-cols-2">
            {guias.map((g) => (
              <li key={g.href} className="border-b border-white/10">
                <Link href={g.href} className="group flex items-center justify-between gap-4 py-4">
                  <span>
                    <span className="block font-dm text-sm text-crema group-hover:text-lima">{g.t}</span>
                    <span className="block font-dm text-xs text-crema/50">{g.d}</span>
                  </span>
                  <ArrowUpRight className="h-4 w-4 flex-shrink-0 text-crema/40 group-hover:text-lima" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* El viaje de cada mes desde la CDMX: estaba arriba de todo; ahora
            después de la información (auditoría, 20 nov 2026). */}
        <div className="max-w-4xl mx-auto px-6 pb-14">
          <TarjetaViajeCdmx origen={`destinos${en ? "-en" : ""}`} locale={en ? "en" : "es"} />
        </div>

        {/* ── PREGUNTAS FRECUENTES DEL ÍNDICE ── */}
        <section id="preguntas" className="max-w-4xl mx-auto px-6 pb-16 scroll-mt-24">
          <h2 className="font-cormorant text-crema text-2xl md:text-3xl mb-5">{en ? "Planning questions" : "Preguntas para planear tu viaje"}</h2>
          <div className="space-y-3">
            {faqs.map((f) => (
              <details key={f.pregunta} className="rounded-xl border border-white/10 bg-negro/30 group">
                <summary className="px-5 py-4 cursor-pointer text-crema/85 font-dm text-sm hover:text-crema list-none flex items-center justify-between gap-3">
                  {f.pregunta}
                  <span className="text-verde-vivo flex-shrink-0 text-lg leading-none group-open:rotate-45 transition-transform" aria-hidden="true">+</span>
                </summary>
                <div className="px-5 pb-5 border-t border-white/10 pt-4">
                  <p className="text-crema/65 font-dm text-sm leading-relaxed">{f.respuesta}</p>
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* ── CIERRE ── */}
        <section className="bg-verde-profundo/30 border-t border-white/10 py-16 px-6 text-center">
          <h2 className="font-cormorant font-light text-crema mb-4" style={{ fontSize: "clamp(24px,3.5vw,40px)" }}>
            {en ? "Rather not organize it yourself?" : "¿Prefieres no organizarlo tú?"}
          </h2>
          <p className="text-crema/60 font-dm text-sm mb-8 max-w-md mx-auto">
            {en
              ? "Our tours include admission and a certified guide."
              : "Nuestros tours incluyen las entradas y un guía certificado."}
          </p>
          <Link
            href={localePath("/reservar", locale)}
            className="rounded-xl inline-block bg-dorado text-negro px-10 py-4 text-[11px] tracking-[3px] uppercase font-dm hover:bg-terracota hover:text-crema transition-colors font-medium"
          >
            {en ? "See tours and book →" : "Ver recorridos y reservar →"}
          </Link>
        </section>
      </main>
    </>
  );
}
