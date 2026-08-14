import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";
import { headers } from "next/headers";
import { FAQAccordion } from "@/components/FAQAccordion";
import { FloatingLeaves } from "@/components/FloatingLeaves";
import type { FAQCategory } from "@/components/FAQAccordion";
import { ClimaWidget } from "@/components/ClimaWidget";
import type { LucideIcon } from "lucide-react";
import {
  Bus, Plane, Car, Bike,
  Calendar, BedDouble, DollarSign, CreditCard,
  Backpack, Shield, AlertTriangle, Waves, Hospital,
  HelpCircle, Lightbulb, MapPin, Map, Download, Route,
  CheckCircle2, XCircle,
  Footprints, Shirt, FlaskConical, ClipboardList, Smartphone, Phone,
  Hotel, UtensilsCrossed, Star, ExternalLink,
} from "lucide-react";

import { asLocale, localePath, localeUrl, buildAlternates, SITE } from "@/lib/i18n/config";
import { getInfoPractica, type InfoPracticaContent } from "@/lib/i18n/infoPractica.en";
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
    <section id={id} className="py-16 border-b border-white/6">
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex items-center gap-3 mb-8">
          <Icon className="w-7 h-7 text-verde-selva flex-shrink-0" aria-hidden="true" />
          <h2
            className="reveal-up font-cormorant font-light text-crema"
            style={{ fontSize: "clamp(24px,3.5vw,40px)" }}
          >
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
  accent?: "verde" | "dorado" | "agua" | "terracota";
}) {
  const colors = {
    verde: "border-l-verde-vivo bg-verde-selva/8",
    dorado: "border-l-dorado bg-dorado/8",
    agua: "border-l-agua bg-agua/8",
    terracota: "border-l-terracota bg-terracota/8",
  };
  return (
    <div className={`border-l-2 ${colors[accent]} p-5`}>
      <h3 className="font-dm text-[11px] tracking-[2px] uppercase text-crema/60 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2 text-sm text-crema/65 font-dm">
          <span className="text-verde-vivo mt-0.5 flex-shrink-0">·</span>
          {item}
        </li>
      ))}
    </ul>
  );
}


/** El FAQ vive en `i18n/infoPractica.en.ts`, en los dos idiomas. */
const faqSchema = (t: InfoPracticaContent, locale: "es" | "en") => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  inLanguage: locale === "en" ? "en" : "es-MX",
  mainEntity: t.faq.flatMap((cat) =>
    cat.items.map((item) => ({
      "@type": "Question",
      name:           item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    }))
  ),
});

export default function InfoPracticaPage() {
  const locale = asLocale(headers().get("x-locale"));
  const t  = getInfoPractica(locale);
  const lp = (path: string) => localePath(path, locale);
  const en = locale === "en";

  return (
    <main className="min-h-screen bg-negro">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema(t, locale)) }} />

      {/* Hero */}
      <section className="bg-gradient-to-b from-verde-profundo/80 via-verde-profundo/30 to-negro px-6 pt-32 pb-16 text-center">
        <p className="reveal-fade text-[10px] tracking-[4px] uppercase text-verde-vivo mb-4 font-dm">
          {t.heroEyebrow}
        </p>
        <h1
          className="reveal-up font-cormorant font-light text-crema mb-5"
          style={{ fontSize: "clamp(40px,7vw,76px)" }}
        >
          {t.heroH1a}<em className="shimmer-gold">{t.heroH1b}</em>
        </h1>
        <p className="reveal-fade text-crema/55 font-dm text-sm max-w-lg mx-auto leading-relaxed mb-8">
          {t.heroIntro}
        </p>

        {/* Quick nav */}
        <div className="flex flex-wrap gap-2 justify-center">
          {[
            "#como-llegar", "#cuando-viajar", "#donde-quedarse", "#hotel-paraiso", "#papan-huasteco",
            "#presupuesto", "#itinerarios", "#que-llevar", "#mapa", "#seguridad",
          ].map((href, i) => ({ href, label: t.navLabels[i] })).map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="border border-white/20 px-4 py-1.5 text-[10px] tracking-[2px] uppercase font-dm text-crema/60 hover:text-crema hover:border-verde-vivo/50 transition-all"
            >
              {link.label}
            </a>
          ))}
        </div>
      </section>

      {/* ── CÓMO LLEGAR ── */}
      <Section id="como-llegar" Icon={Bus} title={t.tituloComoLlegar}>
        <p className="text-crema/60 font-dm text-sm mb-8 leading-relaxed">
          <strong className="text-crema">{t.llegarIntroFuerte}</strong>{t.llegarIntro}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          {t.llegarBloques.map((b, i) => (
            <InfoCard key={b.titulo} title={b.titulo} accent={(["agua","verde","dorado","agua"] as const)[i]}>
              <BulletList items={b.items} />
            </InfoCard>
          ))}
        </div>

        {/* Imagen contextual */}
        <div className="relative aspect-[21/9] overflow-hidden mb-6">
          <Image
            src="/imagenes/tours/tamul/gallery-3.jpg"
            alt={t.llegarFotoAlt}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 896px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-negro/60 to-transparent" />
          <p className="absolute bottom-3 left-4 text-[10px] font-dm text-crema/50">
            {t.llegarFotoPie}
          </p>
        </div>

        <div className="bg-dorado/8 border border-dorado/25 p-5 mb-6">
          <p className="text-[10px] tracking-[2px] uppercase text-dorado font-dm mb-2 flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5" aria-hidden="true" /> {t.consejoViajero}
          </p>
          <p className="text-crema/70 text-sm font-dm">
            {t.llegarConsejo}
          </p>
        </div>

        {/* Links afiliados de transporte */}
        <div className="border border-white/8 bg-negro/30 p-5">
          <p className="text-[9px] tracking-[2px] uppercase text-crema/35 font-dm mb-4">{t.reservaTransporte}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <a
              href="https://www.ado.com.mx/"
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="flex items-center justify-between border border-white/10 hover:border-verde-vivo/40 px-4 py-3 group transition-all"
            >
              <div>
                <p className="text-xs font-dm font-medium text-crema/80 group-hover:text-crema">{t.afiliados[0].nombre}</p>
                <p className="text-[10px] font-dm text-crema/35">{t.afiliados[0].sub}</p>
              </div>
              <ExternalLink className="w-3 h-3 text-verde-vivo flex-shrink-0" />
            </a>
            <a
              href="https://www.rentalcars.com/es/?affiliateCode=huasteca"
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="flex items-center justify-between border border-white/10 hover:border-verde-vivo/40 px-4 py-3 group transition-all"
            >
              <div>
                <p className="text-xs font-dm font-medium text-crema/80 group-hover:text-crema">{t.afiliados[1].nombre}</p>
                <p className="text-[10px] font-dm text-crema/35">{t.afiliados[1].sub}</p>
              </div>
              <ExternalLink className="w-3 h-3 text-verde-vivo flex-shrink-0" />
            </a>
            <a
              href="https://www.kayak.com.mx/flights"
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="flex items-center justify-between border border-white/10 hover:border-verde-vivo/40 px-4 py-3 group transition-all"
            >
              <div>
                <p className="text-xs font-dm font-medium text-crema/80 group-hover:text-crema">{t.afiliados[2].nombre}</p>
                <p className="text-[10px] font-dm text-crema/35">{t.afiliados[2].sub}</p>
              </div>
              <ExternalLink className="w-3 h-3 text-verde-vivo flex-shrink-0" />
            </a>
          </div>
        </div>
      </Section>

      {/* ── CUÁNDO VIAJAR ── */}
      <Section id="cuando-viajar" Icon={Calendar} title={t.tituloCuandoViajar}>
        <p className="text-crema/60 font-dm text-sm mb-8">
          {t.cuandoIntro}
        </p>

        {/* Imágenes temporada seca vs verde */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="relative aspect-[4/3] overflow-hidden">
            <Image
              src="/imagenes/tours/tamul/gallery-1.jpg"
              alt={t.fotoSecaAlt}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, 440px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-negro/70 to-transparent" />
            <p className="absolute bottom-2 left-3 text-[10px] font-dm text-crema/80">{t.fotoSecaPie}</p>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden">
            <Image
              src="/imagenes/tours/tamul/gallery-5.jpg"
              alt={t.fotoVerdeAlt}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, 440px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-negro/70 to-transparent" />
            <p className="absolute bottom-2 left-3 text-[10px] font-dm text-crema/80">{t.fotoVerdePie}</p>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          {t.temporadas.map((temp, i) => ({ ...temp, color: (["verde","dorado","agua"] as const)[i] })).map((temp, i) => (
            <div key={temp.meses}>
              <InfoCard title={`${temp.meses} · ${temp.etiqueta}`} accent={temp.color}>
                <BulletList items={temp.puntos} />
              </InfoCard>
              {/* Micro-CTA tras temporada ideal */}
              {i === 0 && (
                <div className="mt-2 ml-4 flex items-center gap-2">
                  <span className="text-verde-vivo text-sm">→</span>
                  <Link
                    href={lp("/tours")}
                    className="text-xs font-dm text-verde-vivo hover:text-lima underline underline-offset-2 transition-colors"
                  >
                    {t.verToursTemporada}
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Month table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-dm border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 pr-4 text-crema/40 tracking-[1px] uppercase font-normal w-24">{t.tablaCabeceras[0]}</th>
                <th className="text-left py-2 pr-4 text-crema/40 tracking-[1px] uppercase font-normal">{t.tablaCabeceras[1]}</th>
                <th className="text-left py-2 pr-4 text-crema/40 tracking-[1px] uppercase font-normal">{t.tablaCabeceras[2]}</th>
                <th className="text-left py-2 text-crema/40 tracking-[1px] uppercase font-normal">{t.tablaCabeceras[3]}</th>
              </tr>
            </thead>
            <tbody>
              {t.tablaFilas.map((row) => (
                <tr key={row.mes} className="border-b border-white/6 hover:bg-verde-profundo/20 transition-colors">
                  <td className="py-2.5 pr-4 text-crema/70">{row.mes}</td>
                  <td className="py-2.5 pr-4 text-crema/60">{row.temp}</td>
                  <td className="py-2.5 pr-4 text-crema/60">{row.lluvia}</td>
                  <td className="py-2.5 text-crema/60">{row.cascadas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── WIDGET DE CLIMA ── (dentro del bloque Cuándo Viajar pero fuera del Section — mejor UX) */}
      <div className="max-w-4xl mx-auto px-6 -mt-8 mb-10">
        <ClimaWidget />
      </div>

      {/* ── DÓNDE QUEDARSE ── */}
      <Section id="donde-quedarse" Icon={BedDouble} title={t.tituloDondeQuedarse}>
        <p className="text-crema/60 font-dm text-sm mb-8">
          {t.quedarseIntro}
        </p>

        <div className="space-y-5">
          {/* Ciudad Valles */}
          <InfoCard title={t.vallesTitulo} accent="verde">
            <p className="text-crema/60 text-sm mb-3">
              {t.vallesTexto}
            </p>
            <BulletList
              items={t.vallesItems}
            />
            {/* Links afiliados */}
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href="https://www.airbnb.mx/s/Ciudad-Valles--San-Luis-Potos%C3%AD/homes"
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="flex items-center gap-1.5 text-[10px] font-dm text-verde-vivo border border-verde-vivo/30 hover:bg-verde-vivo/10 px-3 py-1.5 transition-all"
              >
                <ExternalLink className="w-3 h-3" /> {t.verEnAirbnb}
              </a>
              <a
                href="https://www.booking.com/searchresults.es.html?ss=Ciudad+Valles%2C+San+Luis+Potos%C3%AD"
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="flex items-center gap-1.5 text-[10px] font-dm text-verde-vivo border border-verde-vivo/30 hover:bg-verde-vivo/10 px-3 py-1.5 transition-all"
              >
                <ExternalLink className="w-3 h-3" /> {t.verEnBooking}
              </a>
            </div>
          </InfoCard>

          {/* Xilitla — con Hotel Paraíso Encantado destacado */}
          <InfoCard title={t.xilitlaTitulo} accent="dorado">
            <p className="text-crema/60 text-sm mb-4">
              {t.xilitlaTexto1}
              <Link href={lp("/destinos/las-pozas-jardin-surrealista")} className="text-dorado hover:text-lima underline underline-offset-2 transition-colors">
                {t.xilitlaLasPozas}
              </Link>
              {t.xilitlaTexto2}
            </p>

            {/* Recomendación destacada */}
            <div className="border border-dorado/40 bg-dorado/8 p-4 mb-4">
              <p className="text-[9px] tracking-[2px] uppercase text-dorado font-dm mb-2 flex items-center gap-1.5">
                <Star className="w-3 h-3 fill-dorado" aria-hidden="true" /> {t.recomendacionEquipo}
              </p>
              <p className="text-crema font-dm text-sm font-medium mb-1">
                {t.hotelNombre}
              </p>
              <p className="text-crema/65 font-dm text-xs leading-relaxed mb-3">
                {t.hotelTexto}
              </p>
              <ul className="space-y-1 mb-3">
                {t.hotelItems.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs text-crema/65 font-dm">
                    <span className="text-dorado mt-0.5 flex-shrink-0">✦</span>
                    {item}
                  </li>
                ))}
              </ul>
              <a
                href="https://wa.me/524891251458?text=Hola%2C%20me%20interesa%20hospedarme%20en%20el%20Hotel%20Para%C3%ADso%20Encantado%20Xilitla"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-[10px] tracking-[2px] uppercase font-dm text-dorado border border-dorado/50 hover:border-dorado hover:bg-dorado/10 px-4 py-1.5 transition-all"
              >
                {t.consultarDisponibilidad}
              </a>
            </div>

            <p className="text-[10px] tracking-[1px] uppercase text-crema/35 font-dm mb-2">{t.otrasOpciones}</p>
            <BulletList
              items={t.xilitlaOtras}
            />
          </InfoCard>

          {/* Micro-CTA Xilitla */}
          <div className="flex items-center gap-2 ml-4 -mt-2">
            <span className="text-dorado text-sm">→</span>
            <Link
              href="https://wa.me/524891251458?text=Hola%2C%20quiero%20reservar%20el%20Hotel%20Para%C3%ADso%20Encantado%20con%20tarifa%20especial%20de%20tour"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-dm text-dorado hover:text-lima underline underline-offset-2 transition-colors"
            >
              {t.xilitlaMicroCta}
            </Link>
          </div>

          {/* Tamasopo */}
          <InfoCard title={t.tamasopoTitulo} accent="agua">
            <p className="text-crema/60 text-sm mb-3">
              {t.tamasopoTexto}
            </p>
            <BulletList
              items={t.tamasopoItems}
            />
          </InfoCard>
        </div>
      </Section>

      {/* ── HOTEL PARAÍSO ENCANTADO ── */}
      <Section id="hotel-paraiso" Icon={Hotel} title={t.tituloHotelParaiso}>
        <p className="text-crema/60 font-dm text-sm mb-8 leading-relaxed">
          {t.paraisoIntroA}
          <strong className="text-crema">{t.hotelNombre}</strong>{t.paraisoIntroB}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Galería */}
          <div className="grid grid-cols-2 gap-2">
            <div className="relative aspect-[4/3] col-span-2 overflow-hidden rounded-lg">
              <Image
                src="/imagenes/hotel-paraiso-encantado/hero.jpg"
                alt={t.paraisoFotoHeroAlt}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <div className="relative aspect-square overflow-hidden rounded-lg">
              <Image
                src="/imagenes/hotel-paraiso-encantado/habitacion.jpg"
                alt={t.paraisoFotoHabAlt}
                fill
                className="object-cover"
                sizes="25vw"
              />
            </div>
            <div className="relative aspect-square overflow-hidden rounded-lg">
              <Image
                src="/imagenes/hotel-paraiso-encantado/terraza.jpg"
                alt={t.paraisoFotoTerrazaAlt}
                fill
                className="object-cover"
                sizes="25vw"
              />
            </div>
          </div>

          {/* Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-1 mb-2">
              {[1,2,3,4,5].map((i) => (
                <Star key={i} className="w-4 h-4 fill-dorado text-dorado" aria-hidden="true" />
              ))}
              <span className="text-crema/50 font-dm text-xs ml-2">{t.boutique4}</span>
            </div>

            <InfoCard title={t.porQueHospedarte} accent="dorado">
              <BulletList
                items={t.paraisoPorQue}
              />
            </InfoCard>

            <InfoCard title={t.reservasTitulo} accent="verde">
              <p className="text-crema/60 font-dm text-sm mb-3">
                {t.reservasTexto}
              </p>
              <a
                href="https://wa.me/524891251458?text=Hola%2C%20quisiera%20reservar%20habitaci%C3%B3n%20en%20el%20Hotel%20Para%C3%ADso%20Encantado%20Xilitla"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-[10px] tracking-[2px] uppercase font-dm text-[#25D366] border border-[#25D366]/40 hover:border-[#25D366] hover:bg-[#25D366]/10 px-4 py-2 transition-all rounded"
              >
                {t.consultarDisponibilidad}
              </a>
            </InfoCard>

            <a
              href="https://share.google/YS3dbxN4wrnHZ8lO9"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-[10px] tracking-[2px] uppercase font-dm text-verde-vivo hover:text-lima transition-colors"
            >
              {t.verEnGoogleMaps}
            </a>
          </div>
        </div>
      </Section>

      {/* ── MAPA INTERACTIVO ── */}
      <Section id="mapa" Icon={Map} title={t.tituloMapa}>
        <p className="text-crema/60 font-dm text-sm mb-6 leading-relaxed">
          {t.mapaIntroA}
          <Link href={lp("/destinos/xilitla-pueblo-magico")} className="text-verde-vivo hover:text-lima underline underline-offset-2 transition-colors">
            {t.mapaXilitla}
          </Link>
          {t.mapaIntroB}
          <strong className="text-crema">Ciudad Valles</strong>{t.mapaIntroC}
          {[
            "/destinos/cascada-de-tamul",
            "/destinos/las-pozas-jardin-surrealista",
            "/destinos/sotano-de-las-golondrinas",
            "/destinos/puente-de-dios-tamasopo",
          ].map((href, i) => (
            <span key={href}>
              <Link href={lp(href)} className="text-verde-vivo hover:text-lima underline underline-offset-2 transition-colors">{t.mapaPuntos[i]}</Link>
              {i < 3 ? ", " : "."}
            </span>
          ))}
        </p>

        <div className="relative w-full aspect-[16/9] overflow-hidden border border-white/10">
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

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            "/destinos/cascada-de-tamul",
            "/destinos/las-pozas-jardin-surrealista",
            "/destinos/sotano-de-las-golondrinas",
            "/destinos/puente-de-dios-tamasopo",
          ].map((href, i) => ({ href, ...t.mapaDestinos[i] })).map((d) => (
            <Link
              key={d.href}
              href={lp(d.href)}
              className="border border-white/8 hover:border-verde-vivo/40 bg-negro/30 p-3 group transition-all"
            >
              <p className="text-xs font-dm font-medium text-crema/75 group-hover:text-crema transition-colors leading-snug mb-1">
                {d.label}
              </p>
              <p className="text-[10px] font-dm text-crema/35">{d.dist}</p>
            </Link>
          ))}
        </div>
      </Section>

      {/* ── RESTAURANTE PAPÁN HUASTECO ── */}
      <Section id="papan-huasteco" Icon={UtensilsCrossed} title={t.tituloPapan}>
        <p className="text-crema/60 font-dm text-sm mb-8 leading-relaxed">
          {t.papanIntroA}
          <strong className="text-crema">{t.papanNombre}</strong>{t.papanIntroB}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Info */}
          <div className="space-y-4">
            <InfoCard title={t.papanNoPerderte} accent="terracota">
              <BulletList
                items={t.papanPlatillos}
              />
            </InfoCard>

            <InfoCard title={t.papanRazones} accent="dorado">
              <BulletList
                items={t.papanRazonesItems}
              />
            </InfoCard>
          </div>

          {/* Galería */}
          <div className="grid grid-cols-2 gap-2">
            <div className="relative aspect-[4/3] col-span-2 overflow-hidden rounded-lg">
              <Image
                src="/imagenes/papan-huasteco/hero.webp"
                alt={t.papanFotoHeroAlt}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
            <div className="relative aspect-square overflow-hidden rounded-lg">
              <Image
                src="/imagenes/papan-huasteco/platillos.jpg"
                alt={t.papanFotoPlatillosAlt}
                fill
                className="object-cover"
                sizes="25vw"
              />
            </div>
            <div className="relative aspect-square overflow-hidden rounded-lg">
              <Image
                src="/imagenes/papan-huasteco/fogon.webp"
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
        <p className="text-crema/60 font-dm text-sm mb-8">
          {t.presupuestoIntro}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {t.niveles.map((n, i) => ({
            ...n,
            color: (["border-lima/40 bg-lima/8", "border-dorado/40 bg-dorado/8", "border-agua/40 bg-agua/8"])[i],
            dot: (["bg-lima", "bg-dorado", "bg-agua"])[i],
          })).map((p) => (
            <div key={p.nivel} className={`border ${p.color} p-6`}>
              <span className={`inline-block w-3 h-3 rounded-full ${p.dot} mb-3`} aria-hidden="true" />
              <h3 className="font-cormorant text-crema text-xl mb-1">{p.nivel}</h3>
              <p className="text-dorado font-dm text-sm font-medium mb-4">{p.rango} {t.porDia}</p>
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
        <p className="text-crema/60 font-dm text-sm mb-8 leading-relaxed">
          {t.itinerariosIntro}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* El destino de cada CTA no depende del idioma; el texto sí. El plan
              de 5 días apunta al recomendador IA, que es solo-ES: en inglés se
              manda al catálogo de tours en vez de cruzar de idioma. */}
          {t.planes.map((plan, i) => {
            const estilo = [
              { caja: "border-verde-vivo/20 bg-verde-selva/5", dot: "bg-verde-vivo", texto: "text-verde-vivo",
                cta: "border border-verde-vivo/40 hover:bg-verde-vivo/10 text-verde-vivo" },
              { caja: "border-dorado/20 bg-dorado/5", dot: "bg-dorado", texto: "text-dorado",
                cta: "bg-dorado/20 hover:bg-dorado/30 text-dorado" },
              { caja: "border-agua/20 bg-agua/5", dot: "bg-agua", texto: "text-agua",
                cta: "border border-agua/40 hover:bg-agua/10 text-agua" },
            ][i];
            const href = [
              lp("/tours/expedicion-tamul"),
              en ? lp("/tours") : "/recomendar",
              lp("/tours"),
            ][i];
            return (
              <div key={plan.dias} className={`border ${estilo.caja} p-6`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full ${estilo.dot}`} />
                  <p className={`text-[9px] tracking-[2px] uppercase font-dm ${estilo.texto}`}>{plan.etiqueta}</p>
                </div>
                <h3 className="font-cormorant text-crema text-xl mb-0.5">{plan.dias}</h3>
                <p className="text-crema/40 font-dm text-[11px] mb-5">{plan.sub}</p>
                <ol className="space-y-3">
                  {plan.pasos.map((d) => (
                    <li key={d.dia} className="flex gap-3">
                      <span className={`text-[9px] tracking-[1px] uppercase font-dm font-bold flex-shrink-0 mt-0.5 w-10 ${estilo.texto}`}>{d.dia}</span>
                      <span className="text-crema/65 font-dm text-xs leading-relaxed">{d.lugar}</span>
                    </li>
                  ))}
                </ol>
                <Link
                  href={href}
                  className={`mt-5 block text-center text-[10px] tracking-[2px] uppercase font-dm py-2.5 transition-all ${estilo.cta}`}
                >
                  {plan.cta}
                </Link>
              </div>
            );
          })}
        </div>

        {/* El recomendador IA es solo-ES: el pie se omite en inglés. */}
        {!en && (
          <p className="mt-6 text-center text-crema/35 font-dm text-xs">
            {t.itinerariosPie}
            <Link href="/recomendar" className="text-verde-vivo hover:text-lima underline underline-offset-2 transition-colors">
              {t.itinerariosPieLink}
            </Link>
          </p>
        )}
      </Section>

      {/* ── QUÉ LLEVAR ── */}
      <Section id="que-llevar" Icon={Backpack} title={t.tituloQueLlevar}>
        {/* Imagen introductoria */}
        <div className="relative aspect-[21/9] overflow-hidden mb-8">
          <Image
            src="/imagenes/tours/tamul/gallery-4.jpg"
            alt={t.llevarFotoAlt}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 896px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-negro/70 to-transparent" />
          <p className="absolute bottom-3 left-4 text-[10px] font-dm text-crema/70">
            {t.llevarFotoPieA}
            <Link href={lp("/destinos/cascada-de-tamul")} className="text-verde-vivo hover:text-lima underline underline-offset-2 transition-colors">
              {t.llevarFotoPieLink}
            </Link>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {t.llevarCategorias.map((cat) => (
            <InfoCard key={cat.titulo} title={cat.titulo} accent="verde">
              <BulletList items={cat.items} />
            </InfoCard>
          ))}
        </div>
      </Section>

      {/* ── SEGURIDAD ── */}
      <Section id="seguridad" Icon={Shield} title={t.tituloSeguridad}>
        <div className="space-y-5">
          <InfoCard title={t.emergenciasTitulo} accent="terracota">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              {t.emergencias.map((e) => (
                <div key={e.label} className="flex items-center gap-3 py-2 border-b border-white/6">
                  <div>
                    <div className="text-[10px] uppercase tracking-[1px] text-crema/40 font-dm">{e.label}</div>
                    <div className="text-crema text-sm font-dm font-medium">{e.num}</div>
                  </div>
                </div>
              ))}
            </div>
          </InfoCard>

          {t.seguridadBloques.map((b, i) => (
            <InfoCard key={b.titulo} title={b.titulo} accent={(["dorado","agua","verde"] as const)[i]}>
              <BulletList items={b.items} />
            </InfoCard>
          ))}
        </div>
      </Section>

      {/* ── FAQ ── */}
      <section className="py-20 border-b border-white/6">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center gap-3 mb-4">
            <HelpCircle className="w-7 h-7 text-verde-selva flex-shrink-0" aria-hidden="true" />
            <h2
              className="font-cormorant font-light text-crema"
              style={{ fontSize: "clamp(24px,3.5vw,40px)" }}
            >
              {t.faqTitulo}
            </h2>
          </div>
          <p className="text-crema/45 font-dm text-sm mb-10 ml-10">
            {t.faqIntro}
          </p>

          {/* Política de cancelación destacada */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-12">
            {([
              { color: "text-lima border-lima/30 bg-lima/8",                 Icon: CheckCircle2,  ...t.cancelacion[0] },
              { color: "text-dorado border-dorado/30 bg-dorado/8",           Icon: AlertTriangle, ...t.cancelacion[1] },
              { color: "text-terracota border-terracota/30 bg-terracota/8",  Icon: XCircle,       ...t.cancelacion[2] },
            ] as { color: string; Icon: LucideIcon; titulo: string; sub: string }[]).map((p) => (
              <div key={p.titulo} className={`border ${p.color} p-4 rounded`}>
                <p.Icon className="w-5 h-5 mb-2" aria-hidden="true" />
                <p className="font-dm text-sm font-medium mb-1">{p.titulo}</p>
                <p className="text-[11px] font-dm opacity-75">{p.sub}</p>
              </div>
            ))}
          </div>

          <FAQAccordion categorias={t.faq} />
        </div>
      </section>

      {/* ── LEAD MAGNET PDF ── */}
      {/* La Guía Definitiva es un PDF en español: la sección se oculta en inglés
          en vez de vender un producto que el visitante no va a poder leer. */}
      {!en && (
      <section className="py-16 border-b border-white/6">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div>
              <p className="text-[10px] tracking-[3px] uppercase text-verde-vivo font-dm mb-3">
                {t.guiaEyebrow}
              </p>
              <h2
                className="reveal-up font-cormorant font-light text-crema mb-4"
                style={{ fontSize: "clamp(26px,3.5vw,42px)" }}
              >
                {t.guiaH2a}
                <em className="shimmer-gold">{t.guiaH2b}</em>
              </h2>
              <p className="text-crema/55 font-dm text-sm mb-6 leading-relaxed">
                {t.guiaTexto}
              </p>
              <ul className="space-y-2 mb-6">
                {t.guiaItems.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-crema/65 font-dm">
                    <span className="text-verde-vivo mt-0.5 flex-shrink-0">✦</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-negro/40 border border-white/10 p-6 text-center">
              <div className="flex items-baseline justify-center gap-3 mb-1">
                <span className="font-cormorant font-light text-crema/40 line-through text-lg">$199</span>
                <span className="font-cormorant font-light text-dorado text-3xl">$49 <span className="text-[11px] font-dm text-crema/40">MXN</span></span>
              </div>
              <p className="font-dm text-[11px] text-crema/40 mb-5">
                {t.guiaGarantia}
              </p>
              <Link href="/guia" className="block w-full text-center bg-dorado text-negro py-4 text-[11px] tracking-[2px] uppercase font-dm font-medium hover:bg-lima transition-colors duration-300">
                {t.guiaCta}
              </Link>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* CTA */}
      <section className="relative py-16 px-6 text-center bg-verde-profundo/20 border-t border-white/6 overflow-hidden">
        <FloatingLeaves count={14} />
        <div className="relative z-10">
        <h2
          className="reveal-up font-cormorant font-light text-crema mb-4"
          style={{ fontSize: "clamp(24px,3.5vw,40px)" }}
        >
          {t.ctaH2a}<em className="shimmer-gold">{t.ctaH2b}</em>
        </h2>
        <p className="text-crema/50 font-dm text-sm mb-8 max-w-md mx-auto">
          {t.ctaTexto}
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link
            href={lp("/destinos")}
            className="border border-crema/30 text-crema px-10 py-3.5 text-[11px] tracking-[3px] uppercase font-dm hover:bg-crema/10 transition-all"
          >
            {t.ctaDestinos}
          </Link>
          {/* El recomendador IA es solo-ES; en inglés el CTA lleva al motor de
              reservas, que sí está traducido. */}
          <Link
            href={en ? lp("/reservar") : "/recomendar"}
            className="bg-verde-selva text-crema px-10 py-3.5 text-[11px] tracking-[3px] uppercase font-dm hover:bg-verde-vivo transition-colors"
          >
            {t.ctaRecomendar}
          </Link>
        </div>
        </div>
      </section>
    </main>
  );
}
