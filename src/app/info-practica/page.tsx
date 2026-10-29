import Link from "next/link";
import { TarjetaViajeCdmx } from "@/components/viajeCdmx/TarjetaViajeCdmx";
import { waLink } from "@/lib/whatsapp";
import Image from "next/image";
import { Metadata } from "next";
import { headers } from "next/headers";
import { FAQAccordion } from "@/components/FAQAccordion";
import type { FAQCategory } from "@/components/FAQAccordion";
import { ClimaWidget } from "@/components/ClimaWidget";
import type { LucideIcon } from "lucide-react";
import {
  Bus, Plane, Car, Bike,
  Calendar, BedDouble, DollarSign, CreditCard,
  Backpack, Shield, AlertTriangle, Waves, Hospital,
  HelpCircle, Lightbulb, MapPin, Map, Download, Route,
  CheckCircle2, XCircle, RefreshCw,
  Footprints, Shirt, FlaskConical, ClipboardList, Smartphone, Phone,
  Hotel, UtensilsCrossed, Star, ExternalLink,
} from "lucide-react";

import { asLocale, localePath, localeUrl, buildAlternates, SITE } from "@/lib/i18n/config";
import { getInfoPractica, type InfoPracticaContent } from "@/lib/i18n/infoPractica.en";
import { getDict } from "@/lib/i18n/messages";
import { buildBreadcrumbJsonLd } from "@/lib/jsonld";
import { IndiceInfoPractica } from "@/components/IndiceInfoPractica";
import { TOURS_DB, recogidaDeTour, partesRecogida } from "@/lib/tours";
import { localizeTour } from "@/lib/i18n/localize";
import { horaEnLista } from "@/lib/recogidaTexto";

/**
 * Title y H1 españoles, reescritos por CTR (sep 2026).
 *
 * El title anterior medía 75 caracteres y Google corta en ~60, así que en el
 * buscador se leía "Info Práctica — Cómo Llegar, Cuándo ir y Dónde Qued…".
 * La página tiene 16.910 impresiones en posición 7,95 —la segunda del sitio—
 * y solo entraba el 0,70 %. Su gemela inglesa mide 64 caracteres y hace
 * 4,69 %. Este mide 55 y abre con lo que la gente teclea de verdad: "huasteca
 * potosina como llegar" (2.666 impresiones), "clima en la huasteca potosina"
 * (1.763) y el hospedaje, que es lo que se vende.
 *
 * El H1 decía "Guía Práctica de Viaje": ni la marca ni la región aparecían.
 *
 * Las cadenas viven en `src/lib/i18n/infoPractica.en.ts`, como el resto.
 */

export function generateMetadata(): Metadata {
  const locale = asLocale(headers().get("x-locale"));
  const t = getInfoPractica(locale);
  return {
    title: t.metaTitle,
    description: t.metaDescription,
    openGraph: {
      title: t.ogTitle,
      description: t.ogDescription,
      url: localeUrl("/info-practica", locale),
      siteName: "Tours Huasteca Potosina",
      locale: locale === "en" ? "en_US" : "es_MX",
      type: "website",
    },
    twitter: { card: "summary_large_image", title: t.twitterTitle, description: t.twitterDescription },
    alternates: buildAlternates("/info-practica", locale),
  };
}

/* ── Lenguaje visual compartido con el inicio, /blog y los artículos ──────── */
const H2 = "font-cormorant font-light leading-[1.1] text-verde-profundo";
const H2_SIZE = { fontSize: "clamp(30px,3.6vw,44px)" };
const PARRAFO = "font-dm text-[15px] leading-relaxed text-negro/70 sm:text-base";
const ENLACE = "text-verde-selva underline decoration-verde-selva/30 underline-offset-4 transition-colors hover:text-terracota";
const PILDORA_DORADA =
  "inline-flex min-h-[48px] items-center justify-center rounded-full bg-dorado px-6 font-dm text-[15px] font-medium text-negro transition-[background-color,transform] duration-200 ease-out hover:bg-lima active:scale-[0.98]";
const PILDORA_LINEA =
  "inline-flex min-h-[44px] items-center justify-center rounded-full border border-verde-selva px-5 font-dm text-sm font-medium text-verde-selva transition-colors hover:bg-verde-selva/10";
const PILDORA_WHATSAPP =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-[#25D366] px-5 font-dm text-sm font-medium text-[#128C4A] transition-colors hover:bg-[#25D366]/10";
const CAJA = "rounded-2xl bg-white p-6 sm:p-7";
const PIE_FOTO = "mt-2 font-dm text-[13px] text-negro/50";
const ETIQUETA = "font-dm text-[13px] font-medium text-dorado";

/** Las cadenas traen «✦» y «→» de la versión oscura; aquí no se pintan. */
const limpia = (s: string) => s.replace(/^✦\s*/, "").replace(/\s*→\s*$/, "");

type Acento = "verde" | "dorado" | "agua" | "terracota";
const PUNTO: Record<Acento, string> = {
  verde: "bg-verde-selva",
  dorado: "bg-dorado",
  agua: "bg-agua",
  terracota: "bg-terracota",
};
const BORDE: Record<Acento, string> = {
  verde: "border-verde-selva",
  dorado: "border-dorado",
  agua: "border-agua",
  terracota: "border-terracota",
};
const TEXTO: Record<Acento, string> = {
  verde: "text-verde-selva",
  dorado: "text-dorado",
  agua: "text-agua",
  terracota: "text-terracota",
};

function Section({
  id,
  Icon,
  title,
  children,
}: {
  id: string;
  Icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-[calc(var(--navbar-offset,64px)+72px)] border-t border-negro/10 py-16 sm:py-20"
    >
      <div className="mx-auto max-w-4xl px-6">
        <div className="mb-8 flex items-center gap-3">
          <Icon className="h-6 w-6 shrink-0 text-verde-selva" strokeWidth={1.5} aria-hidden="true" />
          <h2 className={H2} style={H2_SIZE}>
            {title}
          </h2>
        </div>
        {children}
      </div>
    </section>
  );
}

function InfoCard({
  title,
  children,
  accent = "verde",
}: {
  title: string;
  children: React.ReactNode;
  accent?: Acento;
}) {
  return (
    <div className={CAJA}>
      <h3 className="mb-3 flex items-center gap-2.5 font-dm text-[15px] font-medium text-verde-profundo">
        <span className={`h-2 w-2 shrink-0 rounded-full ${PUNTO[accent]}`} aria-hidden="true" />
        {title}
      </h3>
      {children}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className={`flex items-start gap-3 ${PARRAFO}`}>
          <span className="mt-[12px] h-px w-3 shrink-0 bg-verde-selva/60" aria-hidden="true" />
          {item}
        </li>
      ))}
    </ul>
  );
}


/**
 * El FAQ vive en `i18n/infoPractica.en.ts`, en los dos idiomas. Lo que se pinta
 * y lo que va al JSON-LD es la MISMA lista (`faqConExcepciones`): Google pide
 * que el marcado se vea en la página.
 */
const faqSchema = (faq: FAQCategory[], locale: "es" | "en") => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  inLanguage: locale === "en" ? "en" : "es-MX",
  mainEntity: faq.flatMap((cat) =>
    cat.items.map((item) => ({
      "@type": "Question",
      name:           item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    }))
  ),
});

/**
 * La FAQ del diccionario más una pregunta por cada recorrido con cancelación
 * propia, justo detrás de la de la política.
 *
 * 🔴 La política decía "48 h o más: reembolso completo" sin excepción, y va al
 * FAQPage: es lo que un buscador o un asistente de IA repite. El Edén en el
 * Jardín NO tiene reembolso (la Fundación Las Pozas no lo devuelve). La
 * respuesta es el `cancelacion` del catálogo tal cual —el mismo texto que la
 * ficha y el pago—, y el nombre sale de `localizeTour`, así que un recorrido
 * nuevo con la misma condición entra solo en los dos idiomas.
 */
function faqConExcepciones(t: InfoPracticaContent, locale: "es" | "en"): FAQCategory[] {
  const en = locale === "en";
  const excepciones = TOURS_DB.filter((tour) => tour.cancelacion).map((tour) => ({
    q: t.faqExcepcionPregunta(localizeTour(tour, locale).nombreCorto),
    a: en ? tour.cancelacion!.en : tour.cancelacion!.es,
  }));
  if (!excepciones.length) return t.faq;
  return t.faq.map((cat) => ({
    ...cat,
    items: cat.items.flatMap((item) =>
      item.q === t.faqPreguntaCancelacion ? [item, ...excepciones] : [item],
    ),
  }));
}

/**
 * Las secciones del índice. Viven aquí y no dentro del hero para que el orden
 * de los enlaces y el de las etiquetas traducidas no se separen nunca: antes
 * eran dos listas paralelas casadas por posición, y meter una sección en medio
 * corría todas las etiquetas una casilla.
 */
const IDS_SECCIONES = [
  "como-llegar", "cuando-viajar", "donde-quedarse", "hotel-paraiso", "mapa",
  "papan-huasteco", "presupuesto", "itinerarios", "que-llevar", "seguridad",
] as const;

/**
 * Cómo se pinta cada tramo de `t.cancelacion`, en el MISMO orden: de más a
 * menos favorable. Antes eran tres casillas fijas (`cancelacion[0..2]`) y faltaba
 * el tramo de 48 a 24 h, que /politica-de-cancelacion sí trae. Ahora se recorre
 * la lista: un tramo sin estilo aquí toma el último en vez de desaparecer.
 * El color va SOLO en el icono; el texto se queda oscuro por contraste.
 */
const ESTILO_CANCELACION: { color: string; Icon: LucideIcon }[] = [
  { color: "text-verde-selva", Icon: CheckCircle2 },
  { color: "text-dorado",      Icon: AlertTriangle },
  { color: "text-dorado",      Icon: RefreshCw },
  { color: "text-terracota",   Icon: XCircle },
];

/** Los tres enlaces de transporte (ADO, renta de auto, vuelos), en ese orden. */
const AFILIADOS_HREF = [
  "https://www.ado.com.mx/",
  "https://www.rentalcars.com/es/?affiliateCode=huasteca",
  "https://www.kayak.com.mx/flights",
];

const DESTINOS_MAPA = [
  "/destinos/cascada-de-tamul",
  "/destinos/las-pozas-jardin-surrealista",
  "/destinos/sotano-de-las-golondrinas",
  "/destinos/puente-de-dios-tamasopo",
];

export default function InfoPracticaPage() {
  const locale = asLocale(headers().get("x-locale"));
  const t  = getInfoPractica(locale);
  const lp = (path: string) => localePath(path, locale);
  const en = locale === "en";
  const faq = faqConExcepciones(t, locale);
  const nombreMenu = getDict(locale).nav.infoPractica;

  // Esta página publicaba su FAQPage sin una sola miga de pan, y es la SEGUNDA
  // del sitio por impresiones (16.910): Google sabía qué responde, no dónde
  // vive. El nombre del escalón es el MISMO que el del menú (`dict.nav
  // .infoPractica`) para que la ruta del resultado y el enlace de navegación se
  // llamen igual. Cuelga de la home, como en el menú y en el pie.
  const breadcrumbSchema = buildBreadcrumbJsonLd(
    [{ name: nombreMenu, path: "/info-practica" }],
    locale,
  );

  // Los recorridos que recogen SOLO en Xilitla (Gruta de Xilo, Amanecer de
  // Nubes, Olla de la Luz, el Edén, la Travesía del Café). Los tres planes de
  // abajo no los nombran; en vez de reescribirlos a mano, la lista sale del
  // catálogo con su hora y su frase de Ciudad Valles, y un recorrido nuevo
  // entra solo.
  // Los de hora concreta primero y el de horario por día (el Edén) al final,
  // en el mismo orden que `excepcionesSalida`.
  const toursXilitla = TOURS_DB
    .filter((tour) => recogidaDeTour(tour).tipo === "hospedaje-xilitla")
    .sort((a, b) => Number(!!recogidaDeTour(a).horaTexto) - Number(!!recogidaDeTour(b).horaTexto));
  const vallesXilitla = toursXilitla[0] ? partesRecogida(toursXilitla[0], en).valles : null;

  return (
    <main className="min-h-screen bg-crema">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(faq, locale)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      {/* Portada: texto a la izquierda y la foto a la derecha, en claro, como
          el inicio. El alto queda acotado para que el índice entre en la
          primera pantalla. */}
      <section className="px-6 pb-12 pt-[calc(var(--navbar-alto,64px)+20px)] sm:pb-16 sm:pt-[calc(var(--navbar-alto,64px)+36px)]">
        <div className="mx-auto max-w-6xl">
          <nav aria-label={en ? "Breadcrumb" : "Ruta"} className="mb-6 font-dm text-[13px] text-negro/50">
            <Link href={lp("/")} prefetch={false} className="transition-colors hover:text-verde-selva">{en ? "Home" : "Inicio"}</Link>
            <span className="mx-2">/</span>
            <span className="text-negro/70">{nombreMenu}</span>
          </nav>
          <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
            <div>
              <h1
                className="font-cormorant font-light leading-[1.05] text-verde-profundo"
                style={{ fontSize: "clamp(40px,5.4vw,68px)" }}
              >
                {t.heroH1a}<em className="text-dorado">{t.heroH1b}</em>
              </h1>
              <p className={`mt-5 max-w-[58ch] ${PARRAFO}`}>
                {t.heroIntro}
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href={lp("/reservar")} prefetch={false} className={PILDORA_DORADA}>
                  {limpia(t.ctaRecomendar)}
                </Link>
                <Link href={lp("/destinos")} prefetch={false} className={`${PILDORA_LINEA} min-h-[48px] px-6`}>
                  {t.ctaDestinos}
                </Link>
              </div>
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-negro/5">
              <Image
                src="/imagenes/cascada-de-tamul/vista-abajo.jpg"
                alt={en ? "Tamul waterfall over the turquoise Tampaón river, Huasteca Potosina" : "Cascada de Tamul sobre el río Tampaón turquesa, Huasteca Potosina"}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 560px"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* El índice acompaña toda la lectura, pegado bajo la barra. */}
      <IndiceInfoPractica
        secciones={IDS_SECCIONES.map((id, i) => ({ href: `#${id}`, label: t.navLabels[i] }))}
        etiqueta={t.tituloIndice}
      />

      {/* ── CÓMO LLEGAR ── */}
      <Section id="como-llegar" Icon={Bus} title={t.tituloComoLlegar}>
        <p className={`mb-8 ${PARRAFO}`}>
          <strong className="font-medium text-verde-profundo">{t.llegarIntroFuerte}</strong>{t.llegarIntro}
        </p>

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
          {t.llegarBloques.map((b, i) => (
            <InfoCard key={b.titulo} title={b.titulo} accent={(["agua","verde","dorado","agua"] as const)[i]}>
              <BulletList items={b.items} />
            </InfoCard>
          ))}
        </div>

        {/* El pie va DEBAJO de la foto: encima pedía un degradado oscuro. */}
        <figure className="mb-8">
          <div className="relative aspect-[21/9] overflow-hidden rounded-2xl bg-negro/5">
            <Image
              src="/imagenes/tours/tamul/gallery-3.jpg"
              alt={t.llegarFotoAlt}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 896px"
            />
          </div>
          <figcaption className={PIE_FOTO}>{t.llegarFotoPie}</figcaption>
        </figure>

        <div className="mb-6 flex gap-4 rounded-2xl border border-dorado/40 bg-dorado/10 p-5 sm:p-6">
          <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-dorado" strokeWidth={1.5} aria-hidden="true" />
          <div>
            <p className="mb-1 font-dm text-[15px] font-medium text-verde-profundo">{t.consejoViajero}</p>
            <p className={PARRAFO}>{t.llegarConsejo}</p>
          </div>
        </div>

        {/* Enlaces afiliados de transporte */}
        <div className={CAJA}>
          <p className="mb-2 font-dm text-[15px] font-medium text-verde-profundo">{t.reservaTransporte}</p>
          <ul className="divide-y divide-negro/10">
            {t.afiliados.map((a, i) => (
              <li key={a.nombre}>
                <a
                  href={AFILIADOS_HREF[i]}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="group flex min-h-[52px] items-center justify-between gap-4 py-3"
                >
                  <span>
                    <span className="block font-dm text-[15px] font-medium text-verde-profundo transition-colors group-hover:text-verde-selva">{a.nombre}</span>
                    <span className="block font-dm text-[13px] text-negro/55">{a.sub}</span>
                  </span>
                  <ExternalLink className="h-4 w-4 shrink-0 text-verde-selva" strokeWidth={1.5} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* El viaje de cada mes desde la CDMX (17 oct 2026): CTA donde se habla de viajes de varios días. */}
      <div className="mx-auto max-w-4xl px-6 pb-16">
        <TarjetaViajeCdmx origen={`info-practica${locale === "en" ? "-en" : ""}`} locale={locale === "en" ? "en" : "es"} titulo={locale === "en" ? "In Mexico City? The easiest way: our monthly trip with transport" : "¿Sales de la CDMX? La forma más fácil: el viaje del mes con transporte"} />
      </div>

      {/* ── CUÁNDO VIAJAR ── */}
      <Section id="cuando-viajar" Icon={Calendar} title={t.tituloCuandoViajar}>
        <p className={`mb-8 ${PARRAFO}`}>
          {t.cuandoIntro}
        </p>

        {/* Temporada seca y temporada verde, con el pie debajo de cada foto. */}
        <div className="mb-8 grid grid-cols-2 gap-4">
          {[
            { src: "/imagenes/tours/tamul/gallery-1.jpg", alt: t.fotoSecaAlt,  pie: t.fotoSecaPie },
            { src: "/imagenes/tours/tamul/gallery-5.jpg", alt: t.fotoVerdeAlt, pie: t.fotoVerdePie },
          ].map((f) => (
            <figure key={f.src}>
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-negro/5">
                <Image
                  src={f.src}
                  alt={f.alt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 440px"
                />
              </div>
              <figcaption className={PIE_FOTO}>{f.pie}</figcaption>
            </figure>
          ))}
        </div>

        <div className="mb-8 space-y-4">
          {t.temporadas.map((temp, i) => ({ ...temp, color: (["verde","dorado","agua"] as const)[i] })).map((temp, i) => (
            <div key={temp.meses}>
              <InfoCard title={`${temp.meses} · ${temp.etiqueta}`} accent={temp.color}>
                <BulletList items={temp.puntos} />
                {/* Enlace tras la temporada ideal */}
                {i === 0 && (
                  <p className="mt-4">
                    <Link href={lp("/tours")} prefetch={false} className={`font-dm text-sm ${ENLACE}`}>
                      {t.verToursTemporada}
                    </Link>
                  </p>
                )}
              </InfoCard>
            </div>
          ))}
        </div>

        {/* Tabla por mes */}
        <div className="overflow-x-auto rounded-2xl bg-white px-5 py-2 sm:px-7">
          <table className="w-full border-collapse font-dm text-sm">
            <thead>
              <tr className="border-b border-negro/15">
                {t.tablaCabeceras.map((c) => (
                  <th key={c} className="py-3 pr-4 text-left font-medium text-verde-profundo last:pr-0">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {t.tablaFilas.map((row) => (
                <tr key={row.mes} className="border-b border-negro/10 last:border-0">
                  <td className="py-3 pr-4 font-medium text-negro/80">{row.mes}</td>
                  <td className="py-3 pr-4 tabular-nums text-negro/70">{row.temp}</td>
                  <td className="py-3 pr-4 text-negro/70">{row.lluvia}</td>
                  <td className="py-3 text-negro/70">{row.cascadas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ClimaWidget />
      </Section>

      {/* ── DÓNDE QUEDARSE ── */}
      <Section id="donde-quedarse" Icon={BedDouble} title={t.tituloDondeQuedarse}>
        <p className={`mb-8 ${PARRAFO}`}>
          {t.quedarseIntro}
        </p>

        <div className="space-y-4">
          {/* 🔴 El orden importa y estaba al revés: Ciudad Valles abría la
              sección y nuestro hotel salía en segundo lugar. Desde el 8 oct
              2026 abre Xilitla, que es donde está el hotel; Valles se queda
              porque sigue siendo cierto que tiene la mejor logística para
              quien hace los recorridos del norte. */}
          <InfoCard title={t.xilitlaTitulo} accent="dorado">
            <p className={`mb-4 ${PARRAFO}`}>
              {t.xilitlaTexto1}
              <Link href={lp("/destinos/las-pozas-jardin-surrealista")} className={ENLACE}>
                {t.xilitlaLasPozas}
              </Link>
              {t.xilitlaTexto2}
            </p>

            {/* Recomendación destacada */}
            <div className="mb-5 rounded-2xl border border-dorado/40 bg-crema p-5">
              <p className={`mb-2 flex items-center gap-1.5 ${ETIQUETA}`}>
                <Star className="h-3.5 w-3.5 fill-dorado" aria-hidden="true" /> {t.recomendacionEquipo}
              </p>
              <p className="mb-1 font-cormorant text-2xl text-verde-profundo">
                {t.hotelNombre}
              </p>
              <p className={`mb-3 ${PARRAFO}`}>
                {t.hotelTexto}
              </p>
              <ul className="mb-4 space-y-1.5">
                {t.hotelItems.map((item) => (
                  <li key={item} className={`flex items-start gap-2 ${PARRAFO}`}>
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-dorado" strokeWidth={1.5} aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
              <a href={waLink(t.waHospedaje)} target="_blank" rel="noopener noreferrer" className={PILDORA_WHATSAPP}>
                {limpia(t.consultarDisponibilidad)}
              </a>
            </div>

            <p className="mb-2 font-dm text-[15px] font-medium text-verde-profundo">{t.otrasOpciones}</p>
            <BulletList items={t.xilitlaOtras} />

            <p className="mt-4">
              <Link href={waLink(t.waTarifaTour)} target="_blank" rel="noopener noreferrer" className={`font-dm text-sm ${ENLACE}`}>
                {t.xilitlaMicroCta}
              </Link>
            </p>
          </InfoCard>

          {/* Ciudad Valles */}
          <InfoCard title={t.vallesTitulo} accent="verde">
            <p className={`mb-3 ${PARRAFO}`}>
              {t.vallesTexto}
            </p>
            <BulletList items={t.vallesItems} />
            {/* 🔴 Aquí había dos enlaces `sponsored` a Airbnb y a Booking para
                buscar hospedaje en Ciudad Valles. Los quitó Manolo el 8 oct
                2026: la guía del negocio que tiene hotel propio estaba
                mandando a buscar cama con la competencia. */}
          </InfoCard>

          {/* Tamasopo */}
          <InfoCard title={t.tamasopoTitulo} accent="agua">
            <p className={`mb-3 ${PARRAFO}`}>
              {t.tamasopoTexto}
            </p>
            <BulletList items={t.tamasopoItems} />
          </InfoCard>
        </div>
      </Section>

      {/* ── HOTEL PARAÍSO ENCANTADO ── */}
      <Section id="hotel-paraiso" Icon={Hotel} title={t.tituloHotelParaiso}>
        <p className={`mb-8 ${PARRAFO}`}>
          {t.paraisoIntroA}
          {/* SEO-10 (19 oct 2026): el nombre enlaza al sitio del hotel, dentro
              del texto y sin nofollow. Los botones de abajo no cambian
              (WhatsApp y Google Maps). */}
          <a href={t.paraisoUrl} className={`font-medium ${ENLACE}`}>
            {t.hotelNombre}
          </a>
          {t.paraisoIntroB}
        </p>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Galería */}
          <div className="grid grid-cols-2 gap-3">
            <div className="relative col-span-2 aspect-[4/3] overflow-hidden rounded-2xl bg-negro/5">
              <Image
                src="/imagenes/hotel-paraiso-encantado/hero.jpg"
                alt={t.paraisoFotoHeroAlt}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-negro/5">
              <Image
                src="/imagenes/hotel-paraiso-encantado/habitacion.jpg"
                alt={t.paraisoFotoHabAlt}
                fill
                className="object-cover"
                sizes="25vw"
              />
            </div>
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-negro/5">
              <Image
                src="/imagenes/hotel-paraiso-encantado/terraza.jpg"
                alt={t.paraisoFotoTerrazaAlt}
                fill
                className="object-cover"
                sizes="25vw"
              />
            </div>
          </div>

          {/* Información */}
          <div className="space-y-4">
            {/* Cuatro estrellas, como dice el texto de al lado ("Boutique 4
                estrellas"): pintaba cinco, que se lee como una calificación de
                5/5 que nadie ha dado. */}
            <div className="flex items-center gap-1">
              {[1,2,3,4].map((i) => (
                <Star key={i} className="h-4 w-4 fill-dorado text-dorado" aria-hidden="true" />
              ))}
              <span className="ml-2 font-dm text-sm text-negro/60">{t.boutique4}</span>
            </div>

            <InfoCard title={t.porQueHospedarte} accent="dorado">
              <BulletList items={t.paraisoPorQue} />
            </InfoCard>

            <InfoCard title={t.reservasTitulo} accent="verde">
              <p className={`mb-4 ${PARRAFO}`}>
                {t.reservasTexto}
              </p>
              <a href={waLink(t.waHospedaje)} target="_blank" rel="noopener noreferrer" className={PILDORA_WHATSAPP}>
                {limpia(t.consultarDisponibilidad)}
              </a>
            </InfoCard>

            <a
              href="https://share.google/YS3dbxN4wrnHZ8lO9"
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1.5 font-dm text-sm ${ENLACE}`}
            >
              <MapPin className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              {limpia(t.verEnGoogleMaps)}
            </a>
          </div>
        </div>
      </Section>

      {/* ── MAPA INTERACTIVO ── */}
      <Section id="mapa" Icon={Map} title={t.tituloMapa}>
        <p className={`mb-6 ${PARRAFO}`}>
          {t.mapaIntroA}
          <Link href={lp("/destinos/xilitla-pueblo-magico")} className={ENLACE}>
            {t.mapaXilitla}
          </Link>
          {t.mapaIntroB}
          <strong className="font-medium text-verde-profundo">Ciudad Valles</strong>{t.mapaIntroC}
          {DESTINOS_MAPA.map((href, i) => (
            <span key={href}>
              <Link href={lp(href)} className={ENLACE}>{t.mapaPuntos[i]}</Link>
              {i < 3 ? ", " : "."}
            </span>
          ))}
        </p>

        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-negro/5">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d458726.1!2d-99.01!3d21.95!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1ses-419!2smx!4v1"
            width="100%"
            height="100%"
            style={{ border: 0, position: "absolute", inset: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title={t.mapaTitle}
          />
        </div>

        <ul className="mt-6 grid grid-cols-1 gap-x-8 sm:grid-cols-2">
          {DESTINOS_MAPA.map((href, i) => ({ href, ...t.mapaDestinos[i] })).map((d) => (
            <li key={d.href} className="border-t border-negro/15">
              <Link
                href={lp(d.href)}
                prefetch={false}
                className="group flex min-h-[56px] items-center justify-between gap-4 py-3"
              >
                <span className="font-dm text-[15px] font-medium text-verde-profundo transition-colors group-hover:text-verde-selva">
                  {d.label}
                </span>
                <span className="shrink-0 font-dm text-[13px] text-negro/50">{d.dist}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      {/* ── RESTAURANTE PAPÁN HUASTECO ── */}
      <Section id="papan-huasteco" Icon={UtensilsCrossed} title={t.tituloPapan}>
        <p className={`mb-8 ${PARRAFO}`}>
          {t.papanIntroA}
          <strong className="font-medium text-verde-profundo">{t.papanNombre}</strong>{t.papanIntroB}
        </p>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="space-y-4">
            <InfoCard title={t.papanNoPerderte} accent="terracota">
              <BulletList items={t.papanPlatillos} />
            </InfoCard>

            <InfoCard title={t.papanRazones} accent="dorado">
              <BulletList items={t.papanRazonesItems} />
            </InfoCard>
          </div>

          {/* Galería */}
          <div className="grid grid-cols-2 gap-3">
            <div className="relative col-span-2 aspect-[4/3] overflow-hidden rounded-2xl bg-negro/5">
              <Image
                src="/imagenes/papan-huasteco/hero.webp"
                alt={t.papanFotoHeroAlt}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-negro/5">
              <Image
                src="/imagenes/papan-huasteco/chilaquiles-con-arrachera.jpg"
                alt={t.papanFotoPlatillosAlt}
                fill
                className="object-cover"
                sizes="25vw"
              />
            </div>
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-negro/5">
              <Image
                src="/imagenes/papan-huasteco/fogon-de-lena.jpg"
                alt={t.papanFotoFogonAlt}
                fill
                className="object-cover"
                sizes="25vw"
              />
            </div>
          </div>
        </div>
      </Section>

      {/* ── PRESUPUESTO ── */}
      <Section id="presupuesto" Icon={DollarSign} title={t.tituloPresupuesto}>
        <p className={`mb-8 ${PARRAFO}`}>
          {t.presupuestoIntro}
        </p>

        {/* Tres niveles en columnas con su línea de color, sin cajas. */}
        <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-3">
          {t.niveles.map((n, i) => ({ ...n, acento: (["verde", "dorado", "agua"] as const)[i] })).map((p) => (
            <div key={p.nivel} className={`border-t-2 pt-5 ${BORDE[p.acento]}`}>
              <h3 className="font-cormorant text-2xl text-verde-profundo">{p.nivel}</h3>
              <p className="mb-4 mt-1 font-dm text-[15px] font-medium tabular-nums text-dorado">{p.rango} {t.porDia}</p>
              <BulletList items={p.incluye} />
            </div>
          ))}
        </div>

        <InfoCard title={t.pagosTitulo} accent="dorado">
          <BulletList items={t.pagosItems} />
        </InfoCard>
      </Section>

      {/* ── ITINERARIOS SUGERIDOS ── */}
      <Section id="itinerarios" Icon={Route} title={t.tituloItinerarios}>
        <p className={`mb-8 ${PARRAFO}`}>
          {t.itinerariosIntro}
        </p>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* El destino de cada CTA no depende del idioma; el texto sí. El plan
              de 5 días apunta al recomendador IA, que es solo-ES: en inglés se
              manda al catálogo de tours en vez de cruzar de idioma. El plan de
              en medio lleva el botón lleno: es el que más se vende. */}
          {t.planes.map((plan, i) => {
            const acento = (["verde", "dorado", "agua"] as const)[i];
            const href = [
              lp("/tours/expedicion-tamul"),
              en ? lp("/tours") : "/recomendar",
              lp("/tours"),
            ][i];
            return (
              <div key={plan.dias} className={`flex flex-col border-t-2 pt-5 ${BORDE[acento]}`}>
                <p className={`font-dm text-[13px] font-medium ${TEXTO[acento]}`}>{plan.etiqueta}</p>
                <h3 className="mt-1 font-cormorant text-2xl text-verde-profundo">{plan.dias}</h3>
                <p className="mb-5 font-dm text-[13px] text-negro/55">{plan.sub}</p>
                <ol className="space-y-3">
                  {plan.pasos.map((d) => (
                    <li key={d.dia} className="flex gap-3">
                      <span className={`w-12 shrink-0 pt-0.5 font-dm text-[13px] font-medium ${TEXTO[acento]}`}>{d.dia}</span>
                      <span className="font-dm text-[14px] leading-relaxed text-negro/70">{d.lugar}</span>
                    </li>
                  ))}
                </ol>
                <Link
                  href={href}
                  prefetch={false}
                  className={`mt-6 w-full ${i === 1 ? PILDORA_DORADA : PILDORA_LINEA}`}
                >
                  {limpia(plan.cta)}
                </Link>
              </div>
            );
          })}
        </div>

        {toursXilitla.length > 0 && (
          <div className={`mt-8 ${CAJA}`}>
            <h3 className="mb-1.5 font-dm text-[15px] font-medium text-verde-profundo">{t.xilitlaExtraTitulo}</h3>
            <p className={`mb-4 ${PARRAFO}`}>{t.xilitlaExtraIntro}</p>
            <ul className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
              {toursXilitla.map((tour) => (
                <li key={tour.slug} className="flex items-baseline justify-between gap-3 border-t border-negro/10 py-2.5">
                  <Link href={lp(`/tours/${tour.slug}`)} prefetch={false} className={`font-dm text-[15px] ${ENLACE}`}>
                    {localizeTour(tour, locale).nombreCorto}
                  </Link>
                  <span className="text-right font-dm text-[13px] text-negro/55">{horaEnLista(tour, en)}</span>
                </li>
              ))}
            </ul>
            {vallesXilitla && (
              <p className="mt-3 font-dm text-[13px] text-negro/55">{vallesXilitla}</p>
            )}
          </div>
        )}

        {/* El recomendador IA es solo-ES: el pie se omite en inglés. */}
        {!en && (
          <p className={`mt-6 ${PARRAFO}`}>
            {t.itinerariosPie}
            <Link href="/recomendar" prefetch={false} className={ENLACE}>
              {limpia(t.itinerariosPieLink)}
            </Link>
          </p>
        )}
      </Section>

      {/* ── QUÉ LLEVAR ── */}
      <Section id="que-llevar" Icon={Backpack} title={t.tituloQueLlevar}>
        <figure className="mb-8">
          <div className="relative aspect-[21/9] overflow-hidden rounded-2xl bg-negro/5">
            <Image
              src="/imagenes/tours/tamul/gallery-4.jpg"
              alt={t.llevarFotoAlt}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 896px"
            />
          </div>
          <figcaption className={PIE_FOTO}>
            {t.llevarFotoPieA}
            <Link href={lp("/destinos/cascada-de-tamul")} className={ENLACE}>
              {t.llevarFotoPieLink}
            </Link>
          </figcaption>
        </figure>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {t.llevarCategorias.map((cat) => (
            <InfoCard key={cat.titulo} title={cat.titulo} accent="verde">
              <BulletList items={cat.items} />
            </InfoCard>
          ))}
        </div>
      </Section>

      {/* ── SEGURIDAD ── */}
      <Section id="seguridad" Icon={Shield} title={t.tituloSeguridad}>
        <div className="space-y-4">
          <InfoCard title={t.emergenciasTitulo} accent="terracota">
            <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
              {t.emergencias.map((e) => (
                <div key={e.label} className="flex items-baseline justify-between gap-4 border-t border-negro/10 py-2.5">
                  <dt className="font-dm text-[14px] text-negro/60">{e.label}</dt>
                  <dd className="font-dm text-[15px] font-medium tabular-nums text-verde-profundo">{e.num}</dd>
                </div>
              ))}
            </dl>
          </InfoCard>

          {t.seguridadBloques.map((b, i) => (
            <InfoCard key={b.titulo} title={b.titulo} accent={(["dorado","agua","verde"] as const)[i]}>
              <BulletList items={b.items} />
            </InfoCard>
          ))}
        </div>
      </Section>

      {/* ── PREGUNTAS FRECUENTES ── */}
      <section className="border-t border-negro/10 py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-6">
          <div className="mb-4 flex items-center gap-3">
            <HelpCircle className="h-6 w-6 shrink-0 text-verde-selva" strokeWidth={1.5} aria-hidden="true" />
            <h2 className={H2} style={H2_SIZE}>
              {t.faqTitulo}
            </h2>
          </div>
          <p className={`mb-10 ${PARRAFO}`}>
            {t.faqIntro}
          </p>

          {/* Política de cancelación, de más a menos favorable */}
          <div className="mb-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {t.cancelacion.map((tramo, i) => ({
              ...ESTILO_CANCELACION[Math.min(i, ESTILO_CANCELACION.length - 1)],
              ...tramo,
            })).map((p) => (
              <div key={p.titulo} className="rounded-2xl bg-white p-5">
                {/* El color va en el icono; el texto, oscuro: "No-show / sin
                    reembolso" en terracota daba 2.94 de contraste. */}
                <p.Icon className={`mb-3 h-5 w-5 ${p.color}`} strokeWidth={1.5} aria-hidden="true" />
                <p className="mb-1 font-dm text-[15px] font-medium text-verde-profundo">{p.titulo}</p>
                <p className="font-dm text-[13px] leading-relaxed text-negro/60">{p.sub}</p>
              </div>
            ))}
          </div>

          <FAQAccordion categorias={faq} />
        </div>
      </section>

      {/* ── GUÍA EN PDF ── */}
      {/* La guía es un PDF en español: la sección se oculta en inglés en vez de
          ofrecer algo que el visitante no va a poder leer.
          🔴 GRATIS a cambio del correo (28 sep 2026), como en la portada y en
          /guia, que es donde se deja el correo y arranca la descarga. */}
      {!en && (
      <section className="border-t border-negro/10 py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-6">
          <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-[1.2fr_1fr]">
            <div>
              <p className={`mb-3 flex items-center gap-1.5 ${ETIQUETA}`}>
                <Download className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                {limpia(t.guiaEyebrow)}
              </p>
              <h2 className={`mb-4 ${H2}`} style={H2_SIZE}>
                {t.guiaH2a}
                <em className="text-dorado">{t.guiaH2b}</em>
              </h2>
              <p className={`mb-5 ${PARRAFO}`}>
                {t.guiaTexto}
              </p>
              <ul className="space-y-2">
                {t.guiaItems.map((item) => (
                  <li key={item} className={`flex items-start gap-2.5 ${PARRAFO}`}>
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-verde-selva" strokeWidth={1.5} aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className={`${CAJA} text-center`}>
              <p className="font-cormorant text-4xl font-light text-dorado">{t.guiaPrecio}</p>
              <p className="mb-5 mt-1 font-dm text-[13px] text-negro/55">
                {t.guiaCondicion}
              </p>
              <Link href="/guia" prefetch={false} className={`${PILDORA_DORADA} w-full`}>
                {limpia(t.guiaCta)}
              </Link>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* ── CIERRE ── el único bloque oscuro de la página */}
      <section aria-label={limpia(t.ctaRecomendar)} className="px-6 pb-20 pt-6">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl bg-verde-profundo px-6 py-12 sm:px-12 sm:py-16 lg:px-16">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-16">
              <div className="max-w-2xl">
                <h2
                  className="font-cormorant font-light leading-[1.08] text-crema"
                  style={{ fontSize: "clamp(32px,4vw,52px)" }}
                >
                  {t.ctaH2a}<em className="text-dorado">{t.ctaH2b}</em>
                </h2>
                <p className="mt-4 max-w-[55ch] font-dm text-[15px] leading-relaxed text-crema/70 sm:text-base">
                  {t.ctaTexto}
                </p>
              </div>
              {/* Los dos idiomas al motor: el recomendador (solo-ES) se llevaba el
                  CTA principal de una página de alta intención y lo usaron 4
                  personas en 14 días. */}
              <div className="flex flex-wrap gap-3 lg:flex-col lg:items-end">
                <Link href={lp("/reservar")} prefetch={false} className={`${PILDORA_DORADA} min-h-[52px] px-8`}>
                  {limpia(t.ctaRecomendar)}
                </Link>
                <Link
                  href={lp("/destinos")}
                  prefetch={false}
                  className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-crema/40 px-8 font-dm text-[15px] font-medium text-crema transition-colors hover:bg-crema/10"
                >
                  {t.ctaDestinos}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
