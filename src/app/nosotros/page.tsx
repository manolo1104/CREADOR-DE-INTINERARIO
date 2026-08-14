import { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import Image from "next/image";
import {
  Award, Calendar, Globe, Stethoscope, Shield, Users,
  Heart, Leaf, Star, CheckCircle2, MapPin, TrendingUp, TreePine, Quote,
} from "lucide-react";
import { TOURS_DB } from "@/lib/tours";
import { localizeTour } from "@/lib/i18n/localize";
import { waLink, WA_MESSAGES } from "@/lib/whatsapp";
import { FloatingLeaves } from "@/components/FloatingLeaves";
import { NosotrosNumeros } from "@/components/NosotrosNumeros";
import { NosotrosTimeline } from "@/components/NosotrosTimeline";
import { asLocale, localePath, localeUrl, buildAlternates, SITE, type Locale } from "@/lib/i18n/config";
import { buildOrganizationJsonLd, ORG_REF } from "@/lib/jsonld";
import { getNosotros, type NosotrosContent } from "@/lib/i18n/nosotros.en";

const GOOGLE_REVIEWS_URL = "https://share.google/YS3dbxN4wrnHZ8lO9";

export function generateMetadata(): Metadata {
  const locale = asLocale(headers().get("x-locale"));
  const t = getNosotros(locale);
  return {
    title: t.metaTitle,
    description: t.metaDescription,
    openGraph: {
      title: t.ogTitle,
      description: t.ogDescription,
      url: localeUrl("/nosotros", locale),
      siteName: "Tours Huasteca Potosina",
      locale: locale === "en" ? "en_US" : "es_MX",
      type: "website",
    },
    twitter: { card: "summary_large_image", title: t.ogTitle, description: t.twitterDescription },
    alternates: buildAlternates("/nosotros", locale),
  };
}

/**
 * La ficha de la empresa vive ahora en `buildOrganizationJsonLd` y se comparte
 * con la home, que publicaba una versión distinta y más pobre. Aquí solo se le
 * pasa la descripción curada de esta página, que es más rica que la genérica.
 *
 * Del `sameAs` anterior se cayó una URL de BÚSQUEDA de TripAdvisor: buscar el
 * nombre no es tener perfil, y `sameAs` sirve justo para lo contrario —afirmar
 * "esta empresa es esta misma de allá". Si algún día hay ficha real, se agrega
 * en `jsonld.ts`.
 */
const orgSchema = (t: NosotrosContent, locale: Locale) =>
  buildOrganizationJsonLd(locale, t.orgDescription);

const personSchemas = (t: NosotrosContent) => [
  {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Manolo Covarrubias",
    jobTitle: t.personas[0].jobTitle,
    description: t.personas[0].description,
    birthPlace: { "@type": "Place", name: "Xilitla, San Luis Potosí, México" },
    nationality: "Mexican",
    alumniOf: { "@type": "EducationalOrganization", name: "Tecnológico de Monterrey" },
    image: `${SITE}/imagenes/guias/manolo-covarrubias-ceo.jpg`,
    url: `${SITE}/nosotros`,
    sameAs: [
      "https://www.instagram.com/manolocovaa/",
      "https://www.linkedin.com/in/manolo-covarrubias-121921236/",
    ],
    worksFor: ORG_REF,
    knowsAbout: ["Turismo en la Huasteca Potosina", "Estrategia de negocios", "Tour operación", "San Luis Potosí"],
  },
  {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Carlos Rodríguez",
    jobTitle: t.personas[1].jobTitle,
    description: t.personas[1].description,
    birthPlace: { "@type": "Place", name: "Tamuín, San Luis Potosí, México" },
    nationality: "Mexican",
    worksFor: ORG_REF,
    knowsAbout: ["Cascada de Tamul", "Sótano de las Golondrinas", "Cañón del Tampaón", "Huasteca Potosina", "Turismo de aventura"],
    hasCredential: { "@type": "EducationalOccupationalCredential", name: t.personas[1].credential, credentialCategory: t.personas[1].credentialCategory },
  },
  {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Miguel Ángel Hernández",
    jobTitle: t.personas[2].jobTitle,
    description: t.personas[2].description,
    birthPlace: { "@type": "Place", name: "Ciudad Valles, San Luis Potosí, México" },
    nationality: "Mexican",
    worksFor: ORG_REF,
    knowsAbout: ["Río Tampaón", "Rescate acuático", "Cascada de Tamul", "Sótano de las Huahuas", "Cañón del Tampaón"],
    hasCredential: { "@type": "EducationalOccupationalCredential", name: t.personas[2].credential, credentialCategory: t.personas[2].credentialCategory },
  },
  {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "José Laredo",
    jobTitle: t.personas[3].jobTitle,
    description: t.personas[3].description,
    birthPlace: { "@type": "Place", name: "Ciudad Valles, San Luis Potosí, México" },
    nationality: "Mexican",
    worksFor: ORG_REF,
    knowsAbout: ["Rappel", "Sótano de las Golondrinas", "Cañones de la Huasteca Potosina", "Turismo extremo", "Seguridad en aventura"],
    hasCredential: { "@type": "EducationalOccupationalCredential", name: t.personas[3].credential, credentialCategory: t.personas[3].credentialCategory },
  },
];



/** Lo que NO cambia con el idioma: nombre, foto y cifras. El resto sale del diccionario. */
const GUIAS_BASE = [
  { nombre: "Carlos Rodríguez",        foto: "/guides/guia-1.png", estrellas: "4.9", resenas: "492" },
  { nombre: "Miguel Ángel Hernández",  foto: "/guides/guia-2.png", estrellas: "5.0", resenas: "318" },
  { nombre: "José Laredo",             foto: "/guides/guia-3.png", estrellas: "4.9", resenas: "274" },
];
const guias = (t: NosotrosContent) => GUIAS_BASE.map((g, i) => ({ ...g, ...t.guias[i] }));

const TESTIMONIOS_GUIAS = [
  { texto: "Carlos nos explicó la historia del ejido mientras remábamos por el Tampaón. Me sé toda la historia de la Cascada de Tamul gracias a él. El tour vale el doble solo por eso.", nombre: "Diana L.", ciudad: "Guadalajara, Jal.", guia: "Carlos Rodríguez", foto: "/imagenes/reviews/reviewer-21.jpg" },
  { texto: "Miguel Ángel nos indicó exactamente dónde pararnos para capturar la cascada con la luz perfecta. Tiene un conocimiento del río que no se aprende en ningún libro.", nombre: "Roberto V.", ciudad: "Ciudad de México", guia: "Miguel Ángel", foto: "/imagenes/reviews/reviewer-13.jpg" },
  { texto: "Le dije a José que le tenía terror a las alturas. Me llevó al borde del Sótano paso a paso. Terminé sintiéndome la persona más valiente del mundo.", nombre: "Alejandra M.", ciudad: "Monterrey, N.L.", guia: "José Laredo", foto: "/imagenes/reviews/reviewer-10.jpg" },
];

/** Icono y foto por valor; el título, el texto y el alt salen del diccionario. */
const VALORES_BASE = [
  { Icon: Heart,      foto: "/imagenes/tours/tamul/hero.jpg" },
  { Icon: Shield,     foto: "/guides/guia-1.png" },
  { Icon: Leaf,       foto: "/imagenes/tours/tamul/gallery-3.jpg" },
  { Icon: Star,       foto: "/imagenes/tours/tamul/gallery-1.jpg" },
  { Icon: Users,      foto: "/imagenes/tours/tamul/gallery-4.jpg" },
  { Icon: TrendingUp, foto: "/imagenes/tours/tamul/gallery-5.jpg" },
];
const valores = (t: NosotrosContent) => VALORES_BASE.map((v, i) => ({ ...v, ...t.valores[i] }));

/** Año y destino del enlace por hito; el texto sale del diccionario. */
const HISTORIA_BASE: { año: string; href: string | null }[] = [
  { año: "2010", href: null },
  { año: "2012", href: null },
  { año: "2014", href: "/tours/expedicion-tamul" },
  { año: "2015", href: "/tours/ruta-surrealista-edward-james" },
  { año: "2016", href: null },
  { año: "2017", href: null },
  { año: "2018", href: "/tours/expedicion-tamul" },
  { año: "2019", href: null },
  { año: "2020", href: null },
  { año: "2021", href: "/tours/expedicion-tamul" },
  { año: "2022", href: "/sustentabilidad-y-conservacion" },
  { año: "2023", href: null },
  { año: "2024", href: "/sustentabilidad-y-conservacion" },
  { año: "2025", href: "/recomendar" },
];
const historia = (t: NosotrosContent, lp: (p: string) => string) =>
  HISTORIA_BASE.map((h, i) => ({
    año: h.año,
    hito: t.historia[i].hito,
    // Los enlaces a /recomendar y /sustentabilidad son solo-ES; en inglés se
    // omiten para no sacar al visitante del idioma a media línea del tiempo.
    cta: h.href && t.historia[i].ctaLabel && !/recomendar|sustentabilidad/.test(h.href)
      ? { label: t.historia[i].ctaLabel!, href: lp(h.href) }
      : null,
  }));

const CERT_ICONS = [Award, Stethoscope, Globe, Shield, CheckCircle2, Calendar];
const certificaciones = (t: NosotrosContent) =>
  CERT_ICONS.map((Icon, i) => ({ Icon, ...t.certificaciones[i] }));

const WA_SVG = (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.532 5.86L.054 23.447a.75.75 0 0 0 .916.99l5.764-1.511A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.693 9.693 0 0 1-4.953-1.357l-.355-.211-3.68.965.981-3.585-.232-.369A9.712 9.712 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/></svg>);

export default function NosotrosPage() {
  const locale = asLocale(headers().get("x-locale"));
  const t  = getNosotros(locale);
  const lp = (path: string) => localePath(path, locale);
  const WA = `https://wa.me/524891251458?text=${encodeURIComponent(t.waMsg)}`;

  return (
    <main id="main-content" className="min-h-screen bg-crema">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema(t, locale)) }} />
      {personSchemas(t).map((s) => (
        <script key={s.name} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }} />
      ))}

      {/* HERO */}
      <section className="relative bg-verde-profundo px-6 pt-36 pb-28 text-center overflow-hidden min-h-[60vh] flex items-center justify-center">
        <Image src="/imagenes/guias/equipo-guias.jpg" alt="Equipo de guías certificados de Tours Huasteca Potosina" fill className="object-cover object-center" priority quality={85} />
        <div className="absolute inset-0 bg-gradient-to-t from-negro/80 via-negro/50 to-negro/40" />
        <div className="relative z-10 max-w-3xl mx-auto">
          <p className="reveal-fade text-[10px] tracking-[4px] uppercase text-verde-vivo mb-4 font-dm">{t.heroEyebrow}</p>
          <h1 className="reveal-up font-cormorant font-light text-crema mb-6 leading-tight" style={{ fontSize: "clamp(36px,6vw,68px)" }}>
            {t.heroH1a}<em className="shimmer-gold block">{t.heroH1b}</em>
          </h1>
          <p className="reveal-fade text-crema/65 font-dm text-sm leading-relaxed max-w-xl mx-auto">
            {t.heroIntro}
          </p>
        </div>
      </section>

      {/* NÚMEROS */}
      <section className="bg-white border-b border-negro/8 py-12 px-6">
        <NosotrosNumeros />
      </section>

      {/* FUNDADOR & CEO */}
      <section className="bg-white border-b border-negro/8 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-[10px] tracking-[4px] uppercase text-verde-selva mb-10 font-dm text-center">
            {t.fundadorEyebrow}
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-12 items-start">
            {/* Foto */}
            <div className="flex flex-col items-center lg:items-start gap-5">
              <div className="relative w-56 h-56 lg:w-72 lg:h-72 overflow-hidden rounded-sm border-2 border-verde-selva/20 flex-shrink-0">
                <Image
                  src="/imagenes/guias/manolo-covarrubias-ceo.jpg"
                  alt="Manolo Covarrubias — Fundador & CEO de Tours Huasteca Potosina"
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 1024px) 224px, 288px"
                />
              </div>

              {/* Redes sociales */}
              <div className="flex gap-3">
                <a
                  href="https://www.linkedin.com/in/manolo-covarrubias-121921236/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 border border-negro/15 hover:border-verde-selva/60 hover:text-verde-selva text-negro/50 px-4 py-2 text-[10px] tracking-[1.5px] uppercase font-dm transition-all"
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  LinkedIn
                </a>
                <a
                  href="https://www.instagram.com/manolocovaa/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 border border-negro/15 hover:border-verde-selva/60 hover:text-verde-selva text-negro/50 px-4 py-2 text-[10px] tracking-[1.5px] uppercase font-dm transition-all"
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
                  </svg>
                  Instagram
                </a>
              </div>
            </div>

            {/* Contenido */}
            <div>
              <h2 className="reveal-up font-cormorant font-light text-verde-profundo mb-1" style={{ fontSize: "clamp(32px,4.5vw,52px)" }}>
                {t.fundadorNombre}
              </h2>
              <p className="text-[11px] tracking-[3px] uppercase text-verde-selva font-dm mb-6">
                {t.fundadorRol}
              </p>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-8">
                {t.fundadorBadges.map((label) => (
                  <span key={label} className="border border-negro/15 bg-crema/60 px-3 py-1.5 text-[10px] font-dm text-negro/60 tracking-wide">
                    {label}
                  </span>
                ))}
              </div>

              <div className="space-y-4 text-negro/65 font-dm text-sm leading-relaxed mb-8">
                <p>
                  {t.fundadorP1}
                </p>
                <p>
                  {t.fundadorP2}
                </p>
                <p>
                  {t.fundadorP3a}<strong className="text-negro/80">{t.fundadorP3bStrong}</strong>{t.fundadorP3b}
                </p>
              </div>

              {/* Cita */}
              <div className="border-l-2 border-dorado/50 pl-5 bg-dorado/5 py-4 pr-4">
                <Quote className="w-4 h-4 text-dorado/60 mb-2" aria-hidden="true" />
                <p className="text-negro/70 font-dm text-sm leading-relaxed italic mb-2">
                  &ldquo;{t.fundadorCita}&rdquo;
                </p>
                <p className="text-[10px] tracking-[1.5px] uppercase font-dm text-negro/35">
                  {t.fundadorCitaAutor}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HISTORIA */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div>
            <p className="reveal-fade text-[10px] tracking-[4px] uppercase text-verde-selva mb-4 font-dm">{t.historiaEyebrow}</p>
            <h2 className="reveal-up font-cormorant font-light text-verde-profundo mb-6" style={{ fontSize: "clamp(28px,4vw,44px)" }}>
              {t.historiaH2a}<em className="shimmer-gold">{t.historiaH2b}</em>
            </h2>
            <div className="space-y-4 text-negro/60 font-dm text-sm leading-relaxed">
              <p>
                {t.historiaP1}
              </p>
              <p>
                {t.historiaP2}
              </p>
              {/* Anécdota emotiva — momento fundacional */}
              <div className="border-l-2 border-dorado/40 pl-5 bg-dorado/5 py-4 pr-4 mt-2">
                <p className="text-negro/70 font-dm text-sm leading-relaxed italic mb-3">
                  &ldquo;{t.historiaCita}&rdquo;
                </p>
                <p className="text-[10px] tracking-[1.5px] uppercase font-dm text-negro/40">{t.historiaCitaAutor}</p>
              </div>
              <p>
                {t.historiaP3}
              </p>
            </div>
          </div>

          <NosotrosTimeline />
        </div>
      </section>

      {/* VALORES CON FOTOS */}
      <section className="bg-white border-y border-negro/8 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="reveal-fade text-[10px] tracking-[4px] uppercase text-verde-selva mb-3 font-dm text-center">{t.valoresEyebrow}</p>
          <h2 className="reveal-up font-cormorant font-light text-verde-profundo text-center mb-12" style={{ fontSize: "clamp(28px,4vw,46px)" }}>
            {t.valoresH2} <em className="shimmer-gold">{t.valoresH2Em}</em>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {valores(t).map((v) => (
              <div key={v.titulo} className="border border-negro/8 bg-crema/60 overflow-hidden hover:border-verde-selva/30 transition-colors group">
                <div className="relative aspect-[16/9] overflow-hidden">
                  <Image src={v.foto} alt={v.fotoAlt} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
                  <div className="absolute inset-0 bg-negro/30" />
                  <v.Icon className="absolute top-3 left-3 w-5 h-5 text-white/90" aria-hidden="true" />
                </div>
                <div className="p-5">
                  <h3 className="font-cormorant text-verde-profundo text-lg mb-2 leading-tight">{v.titulo}</h3>
                  <p className="text-negro/55 font-dm text-sm leading-relaxed">{v.texto}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* IMPACTO COMUNITARIO */}
      <section className="relative bg-verde-profundo py-20 px-6 overflow-hidden">
        <FloatingLeaves count={18} />
        <div className="relative z-10 max-w-5xl mx-auto">
          <p className="reveal-fade text-[10px] tracking-[4px] uppercase text-verde-vivo mb-3 font-dm text-center">{t.impactoEyebrow}</p>
          <h2 className="reveal-up font-cormorant font-light text-crema text-center mb-4" style={{ fontSize: "clamp(28px,4vw,46px)" }}>
            {t.impactoH2a}<em className="shimmer-gold">{t.impactoH2b}</em>
          </h2>
          <p className="text-crema/55 font-dm text-sm text-center mb-12 max-w-lg mx-auto leading-relaxed">
            {t.impactoIntro}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
            {[
              { num: "$30 MXN", label: t.impactoDatos[0], Icon: TreePine },
              { num: "3",       label: t.impactoDatos[1], Icon: Users },
              { num: "2.4 ha",  label: t.impactoDatos[2], Icon: Leaf },
              { num: "90%",     label: t.impactoDatos[3], Icon: Heart },
            ].map((d) => (
              <div key={d.label} className="border border-white/10 bg-negro/20 p-6 text-center">
                <d.Icon className="w-6 h-6 text-verde-vivo mx-auto mb-3" aria-hidden="true" />
                <p className="font-cormorant text-dorado font-light leading-none mb-2" style={{ fontSize: "clamp(28px,3.5vw,38px)" }}>{d.num}</p>
                <p className="text-crema/50 font-dm text-[11px] leading-snug">{d.label}</p>
              </div>
            ))}
          </div>
          <div className="border border-dorado/20 bg-dorado/8 p-6 max-w-2xl mx-auto text-center">
            <p className="text-dorado font-dm text-sm font-medium mb-2">{t.impactoDestacado}</p>
            <p className="text-crema/55 font-dm text-xs leading-relaxed">{t.impactoTexto}</p>
            {locale === "es" && (
              <Link href="/sustentabilidad-y-conservacion" className="inline-block mt-4 text-[10px] tracking-[2px] uppercase font-dm text-dorado border border-dorado/40 hover:bg-dorado/10 px-5 py-2 transition-all">
                {t.impactoCta}
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* EQUIPO */}
      <section className="relative py-20 px-6 bg-negro overflow-hidden">
        <FloatingLeaves count={16} />
        <div className="relative z-10 max-w-5xl mx-auto">
          <p className="reveal-fade text-[10px] tracking-[4px] uppercase text-verde-vivo mb-3 font-dm text-center">{t.equipoEyebrow}</p>
          <h2 className="reveal-up font-cormorant font-light text-crema text-center mb-12" style={{ fontSize: "clamp(28px,4vw,46px)" }}>
            {t.equipoH2a} <em className="shimmer-gold">{t.equipoH2b}</em>
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {guias(t).map((g) => (
              <div key={g.nombre} className="border border-white/10 bg-negro/60 overflow-hidden">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image src={g.foto} alt={g.nombre} fill className="object-cover object-top" loading="lazy" sizes="(max-width: 1024px) 100vw, 33vw" />
                  <div className="absolute inset-0 bg-gradient-to-t from-negro/80 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="font-cormorant text-crema text-xl leading-none mb-0.5">{g.nombre}</p>
                    <p className="text-[9px] tracking-[1.5px] uppercase text-verde-vivo font-dm">{g.rol}</p>
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  <p className="text-crema/60 font-dm text-sm leading-relaxed">{g.historia}</p>
                  <div className="border-l-2 border-dorado/40 pl-4 bg-dorado/5 py-3 pr-3">
                    <Quote className="w-4 h-4 text-dorado/50 mb-1.5" />
                    <p className="text-crema/75 font-dm text-xs leading-relaxed italic">{g.cita}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-dorado text-xs tracking-tight">★★★★★</span>
                      <span className="text-[10px] text-crema/40 font-dm">{t.guiasEstrellas(g.estrellas, g.resenas)}</span>
                    </div>
                    <span className="text-[9px] tracking-[1px] uppercase font-dm text-verde-selva/70 border border-verde-selva/20 px-2 py-1">{g.badge}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIOS CON NOMBRE DE GUÍA */}
      <section className="py-20 px-6 bg-crema border-y border-negro/8">
        <div className="max-w-5xl mx-auto">
          <p className="reveal-fade text-[10px] tracking-[4px] uppercase text-verde-selva mb-3 font-dm text-center">{t.testimoniosEyebrow}</p>
          <h2 className="reveal-up font-cormorant font-light text-verde-profundo text-center mb-12" style={{ fontSize: "clamp(28px,4vw,46px)" }}>
            {t.testimoniosH2a}<em className="shimmer-gold">{t.testimoniosH2b}</em>
            {t.resenasEnEspanol && (
              <span className="block font-dm text-[12px] text-negro/40 italic mt-2">{t.resenasEnEspanol}</span>
            )}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIOS_GUIAS.map((t) => (
              <div key={t.nombre} className="bg-white border border-negro/8 p-6">
                <div className="flex gap-0.5 mb-3">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-dorado text-dorado" />)}
                </div>
                <p className="text-negro/65 font-dm text-sm leading-relaxed italic mb-4">&ldquo;{t.texto}&rdquo;</p>
                <div className="flex items-center gap-3 border-t border-negro/8 pt-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={t.foto} alt={t.nombre} width={36} height={36} loading="lazy" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                  <div>
                    <p className="font-dm text-sm text-negro/80 font-medium leading-none">{t.nombre}</p>
                    <p className="text-[10px] text-negro/40 font-dm mt-0.5">{t.ciudad}</p>
                  </div>
                  <div className="ml-auto text-[9px] tracking-[1px] uppercase font-dm text-verde-selva/60 text-right leading-tight">
                    Menciona a<br /><span className="text-verde-selva">{t.guia}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center mt-6">
            <a href={GOOGLE_REVIEWS_URL} target="_blank" rel="noopener noreferrer" className="text-[10px] tracking-[2px] uppercase font-dm text-verde-selva hover:text-verde-vivo underline underline-offset-2 transition-colors">
              {t.verResenas}
            </a>
          </p>
        </div>
      </section>

      {/* CERTIFICACIONES */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="reveal-fade text-[10px] tracking-[4px] uppercase text-verde-selva mb-3 font-dm text-center">{t.garantiasEyebrow}</p>
          <h2 className="reveal-up font-cormorant font-light text-verde-profundo text-center mb-12" style={{ fontSize: "clamp(28px,4vw,46px)" }}>
            {t.garantiasH2Full}<em className="shimmer-gold">{t.garantiasH2b}</em>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {certificaciones(t).map((c) => (
              <div key={c.titulo} className="border border-dorado/15 bg-white p-5 flex gap-4 items-start">
                <c.Icon className="w-6 h-6 text-dorado/70 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <h3 className="font-cormorant text-verde-profundo text-base mb-1 leading-tight">{c.titulo}</h3>
                  <p className="text-[11px] text-negro/65 font-dm leading-relaxed">{c.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BADGES CLICKABLES */}
      <section className="bg-arena/40 border-y border-negro/8 py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-[10px] tracking-[3px] uppercase text-negro/40 font-dm text-center mb-2">Reconocimientos verificables</p>
          <p className="text-[9px] tracking-[1px] uppercase text-negro/25 font-dm text-center mb-8">{t.hazClicBadges}</p>
          <div className="flex flex-wrap items-center justify-center gap-8">
            <a href="https://www.tripadvisor.com.mx/Search?q=Tours+Huasteca+Potosina+Xilitla" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 opacity-75 hover:opacity-100 transition-opacity group" aria-label="Ver en TripAdvisor">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/tripadvisor.svg" alt="TripAdvisor Travellers Choice" loading="lazy" className="h-12 w-auto" />
              <span className="text-[9px] tracking-[1px] uppercase font-dm text-negro/65 group-hover:text-verde-selva transition-colors">Travellers Choice ↗</span>
            </a>
            <a href={GOOGLE_REVIEWS_URL} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 opacity-75 hover:opacity-100 transition-opacity group" aria-label="Ver 492 reseñas en Google Maps">
              <div className="flex items-center gap-2 bg-white border border-negro/10 rounded-lg px-4 py-2 shadow-sm group-hover:border-verde-selva/30 transition-colors">
                <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                <div>
                  <p className="text-[11px] font-dm text-negro/70 font-medium leading-none">{t.cuatroNueveEstrellas}</p>
                  <div className="flex gap-0.5 mt-1">{[1,2,3,4,5].map(i => (<svg key={i} className="w-2.5 h-2.5 text-dorado fill-current" viewBox="0 0 20 20" aria-hidden="true"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>))}</div>
                </div>
              </div>
              <span className="text-[9px] tracking-[1px] uppercase font-dm text-negro/65 group-hover:text-verde-selva transition-colors">{t.googleLink}</span>
            </a>
            <a href="https://www.gob.mx/sectur" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 opacity-75 hover:opacity-100 transition-opacity group" aria-label="Secretaría de Turismo de México">
              <div className="border-2 border-negro/20 group-hover:border-verde-selva/40 rounded-lg px-5 py-3 text-center transition-colors">
                <p className="text-[11px] font-dm text-negro/70 font-semibold tracking-wider uppercase">SECTUR</p>
                <p className="text-[9px] font-dm text-negro/40 mt-0.5">{t.nom09Titulo}</p>
              </div>
              <span className="text-[9px] tracking-[1px] uppercase font-dm text-negro/65 group-hover:text-verde-selva transition-colors">{t.guiasOficiales}</span>
            </a>
            <a href={GOOGLE_REVIEWS_URL} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 opacity-75 hover:opacity-100 transition-opacity group" aria-label="Negocio verificado en Google">
              <div className="bg-[#25D366]/10 border border-[#25D366]/30 group-hover:border-[#25D366]/60 rounded-lg px-4 py-2.5 flex items-center gap-2 transition-colors">
                <MapPin className="w-4 h-4 text-[#25D366]" />
                <span className="text-[11px] font-dm text-negro/70 font-medium">Negocio Verificado</span>
              </div>
              <span className="text-[9px] tracking-[1px] uppercase font-dm text-negro/65 group-hover:text-verde-selva transition-colors">Google Maps ↗</span>
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 text-center bg-crema">
        <div className="max-w-2xl mx-auto">
          <p className="reveal-fade text-[10px] tracking-[4px] uppercase text-verde-selva mb-4 font-dm">{t.hablemos}</p>
          <h2 className="reveal-up font-cormorant font-light text-verde-profundo mb-6" style={{ fontSize: "clamp(28px,4vw,48px)" }}>
            {t.ctaH2}
          </h2>
          <p className="text-negro/55 font-dm text-sm mb-10 leading-relaxed">
            {t.ctaTexto}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={WA} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white px-8 py-4 text-[11px] tracking-[2px] uppercase font-dm transition-colors duration-200">
              {WA_SVG} {t.hablarConEquipo}
            </a>
            <Link href={lp("/tours")} className="inline-flex items-center justify-center border border-negro/20 hover:border-verde-selva/40 text-negro/60 hover:text-verde-selva px-8 py-4 text-[11px] tracking-[2px] uppercase font-dm transition-all duration-200">
              {t.ctaTours}
            </Link>
          </div>
        </div>
      </section>

      {/* TOURS GRID */}
      <section className="relative bg-negro py-20 px-6 overflow-hidden">
        <FloatingLeaves count={14} />
        <div className="relative z-10 max-w-6xl mx-auto">
          <p className="reveal-fade text-[10px] tracking-[4px] uppercase text-verde-vivo mb-3 font-dm text-center">{t.disponiblesAhora}</p>
          <h2 className="reveal-up font-cormorant font-light text-crema text-center mb-12" style={{ fontSize: "clamp(28px,4vw,46px)" }}>{t.reservaConNosotros}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {TOURS_DB.map((base) => localizeTour(base, locale)).map((tour) => (
              <article key={tour.slug} className="group flex flex-col border border-white/10 hover:border-verde-vivo/50 bg-negro/60 transition-colors duration-300 overflow-hidden">
                <div className="relative aspect-[4/3] overflow-hidden">
                  {tour.imagen_hero && <Image src={tour.imagen_hero} alt={tour.nombre} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 20vw" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-negro/80 to-transparent" />
                  <span className="absolute top-2 left-2 bg-verde-vivo text-negro text-[8px] font-dm font-bold tracking-[1px] uppercase px-2 py-0.5">{tour.tipo}</span>
                </div>
                <div className="flex flex-col flex-1 p-4">
                  <h3 className="font-cormorant text-crema text-sm leading-snug mb-2 line-clamp-2">{tour.nombre}</h3>
                  <div className="mt-auto space-y-2">
                    <p className="font-cormorant text-dorado text-lg leading-none">
                      ${tour.precio.toLocaleString("es-MX")}
                      <span className="font-dm text-[9px] text-crema/40 ml-1">
                        {tour.precioUnidad === "vehiculo" ? t.mxnVehiculo : "MXN"}
                      </span>
                    </p>
                    <Link
                      // El carrito ya sabe armar los tours por vehículo (elige ruta y unidad
                      // dentro), así que el RZR deja de ser una excepción que salía del motor.
                      href={lp(`/reservar/carrito?agregar=${tour.slug}`)}
                      className="block text-center bg-verde-selva hover:bg-verde-vivo text-crema text-[9px] tracking-[2px] uppercase font-dm py-2.5 transition-colors">{t.ctaReservar}</Link>
                    <a
                      href={waLink(tour.precioUnidad === "vehiculo"
                        ? `Hola, me interesa el tour "${tour.nombre}". ¿Me ayudas a elegir ruta y vehículo?`
                        : WA_MESSAGES.tour(tour.nombre, 2, 0, tour.precio * 2))}
                      target="_blank" rel="noopener noreferrer" className="block text-center border border-[#25D366]/40 hover:border-[#25D366] text-[#25D366] text-[9px] tracking-[2px] uppercase font-dm py-2 transition-all">{t.ctaWhatsapp}</a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
