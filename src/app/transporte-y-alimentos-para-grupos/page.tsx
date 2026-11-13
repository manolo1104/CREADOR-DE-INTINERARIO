import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { Check, Plane, CalendarDays, Users } from "lucide-react";

import { asLocale, localePath, SITE, type Locale } from "@/lib/i18n/config";
import { fmtMoney } from "@/lib/i18n/format";
import {
  getServiciosGrupos, PRECIO_BANDEJA_HUASTECA, RUTA_SERVICIOS_EN, RUTA_SERVICIOS_EN_SIN_PREFIJO, RUTA_SERVICIOS_ES,
  type DatosServicios,
} from "@/lib/i18n/serviciosGrupos.en";
import { TRASLADOS, TRASLADO_MIN, etiquetaTramo, type RutaTraslado } from "@/lib/traslados";
import { HOTEL_PROPIO, horarioRestaurante } from "@/lib/hotelPropio";
import { GUIAS, nombresGuias, TODOS_NOM09, TODOS_DE_XILITLA } from "@/lib/guias";
import { buildBreadcrumbNode, ORG_ID } from "@/lib/jsonld";
import { waLink } from "@/lib/whatsapp";
import { TrasladoTabla } from "@/components/TrasladoTabla";
import {
  CAJA, CONTENEDOR, ENLACE, ETIQUETA, H1_SIZE, H2, H2_SIZE, PARRAFO, PILDORA_LINEA, PILDORA_WHATSAPP, SECCION,
} from "@/components/guias/estilos";

/**
 * /transporte-y-alimentos-para-grupos y /en/group-transport-and-meals
 * (12 nov 2026). Una plantilla para los dos idiomas: el idioma llega en
 * `x-locale`, como en /donde-hospedarse-en-la-huasteca-potosina. Slug distinto
 * por idioma, así que el hreflang se declara a mano.
 *
 * Qué vende y qué no: las piezas sueltas para grupos (camioneta, guía, comida
 * en El Papán). El viaje completo a la medida sigue en /grupos, y esta página
 * lo enlaza. Textos y lo que confirmó Manolo: `i18n/serviciosGrupos.en.ts`.
 *
 * 🔴 Fotos: solo REALES. `imagenes/guias/equipo-guias.jpg` (la del grupo de
 * rafting) lleva la estrella de Gemini en la esquina: no se usa aquí.
 */

const URL_ES = `${SITE}${RUTA_SERVICIOS_ES}`;
const URL_EN = `${SITE}${RUTA_SERVICIOS_EN}`;
const FOTO_OG = "/imagenes/papan-huasteco/fogon-de-lena.jpg";
const FOTOS_PAPAN = {
  fogon: "/imagenes/papan-huasteco/fogon-de-lena.jpg",
  chilaquiles: "/imagenes/papan-huasteco/chilaquiles-con-arrachera.jpg",
  platillos: "/imagenes/papan-huasteco/platillos.jpg",
} as const;

const idioma = (): Locale => asLocale(headers().get("x-locale"));

export function generateMetadata(): Metadata {
  const locale = idioma();
  const en = locale === "en";
  const t = getServiciosGrupos(locale);
  const url = en ? URL_EN : URL_ES;
  return {
    title: t.metaTitle,
    description: t.metaDescription,
    alternates: { canonical: url, languages: { "es-MX": URL_ES, en: URL_EN, "x-default": URL_ES } },
    openGraph: {
      title: t.ogTitle,
      description: t.metaDescription,
      url,
      siteName: en ? "Huasteca Potosina Tours" : "Tours Huasteca Potosina",
      locale: en ? "en_US" : "es_MX",
      type: "website",
      images: [{ url: `${SITE}${FOTO_OG}`, width: 1800, height: 1200, alt: t.fotosAlt.fogon }],
    },
    twitter: { card: "summary_large_image", title: t.metaTitle, description: t.metaDescription },
  };
}

/** «San Luis Potosí, Tampico y la Ciudad de México»: las ciudades de `traslados.ts`. */
function ciudadesTexto(en: boolean): string {
  const nombres = TRASLADOS.map((r) =>
    r.slug === "cdmx" ? (en ? "Mexico City" : "la Ciudad de México") : r.ciudad,
  );
  if (nombres.length < 2) return nombres.join("");
  return `${nombres.slice(0, -1).join(", ")} ${en ? "and" : "y"} ${nombres[nombres.length - 1]}`;
}

/** El ejemplo de la FAQ: la ruta más barata y su primer tramo («desde Tampico, 1 a 4 personas: $5,000 MXN»). */
function ejemploTraslado(locale: Locale): string {
  const ruta = TRASLADOS.reduce<RutaTraslado>((min, r) => (r.tarifas[0].precio < min.tarifas[0].precio ? r : min), TRASLADOS[0]);
  const tramo = ruta.tarifas[0];
  const de = locale === "en" ? ruta.ciudadLargaEn : ruta.ciudadLarga;
  return `${de}, ${etiquetaTramo(tramo, locale)}: ${fmtMoney(tramo.precio, locale)}`;
}

export default function ServiciosGruposPage() {
  const locale = idioma();
  const en = locale === "en";
  const t = getServiciosGrupos(locale);
  const lp = (p: string) => localePath(p, locale);
  const url = en ? URL_EN : URL_ES;

  const datos: DatosServicios = {
    trasladoMin: fmtMoney(TRASLADO_MIN, locale),
    ciudades: ciudadesTexto(en),
    cupoMax: Math.max(...TRASLADOS.flatMap((r) => r.tarifas.map((x) => x.hasta ?? x.desde))),
    bandeja: fmtMoney(PRECIO_BANDEJA_HUASTECA, locale),
    restaurante: HOTEL_PROPIO.restaurante,
    hotel: HOTEL_PROPIO.nombre,
    metros: HOTEL_PROPIO.metrosALasPozas,
    horario: horarioRestaurante(en),
    guias: nombresGuias(en),
    deXilitla: TODOS_DE_XILITLA,
    nom09: TODOS_NOM09,
    ejemploTraslado: ejemploTraslado(locale),
  };
  const faqs = t.faq(datos);

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${url}#pagina`,
        url,
        name: t.h1,
        description: t.metaDescription,
        inLanguage: en ? "en" : "es-MX",
        about: { "@type": "Place", name: "Huasteca Potosina" },
      },
      {
        "@type": "Service",
        name: t.h1,
        serviceType: en ? "Private group transport, guides and meals" : "Transporte privado, guías y alimentos para grupos",
        provider: { "@id": ORG_ID },
        areaServed: { "@type": "Place", name: "Huasteca Potosina, San Luis Potosí, México" },
        url,
      },
      {
        "@type": "FAQPage",
        inLanguage: en ? "en" : "es-MX",
        mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      },
      buildBreadcrumbNode([{ name: t.breadcrumb, path: en ? RUTA_SERVICIOS_EN_SIN_PREFIJO : RUTA_SERVICIOS_ES }], locale),
    ],
  };

  const extrasTransporte = [
    { Icon: Plane, titulo: t.aeropuertoTitulo, texto: t.aeropuertoTexto(datos), cotiza: false },
    { Icon: CalendarDays, titulo: t.porDiaTitulo, texto: t.porDiaTexto, cotiza: true },
    { Icon: Users, titulo: t.masDeDoceTitulo, texto: t.masDeDoceTexto(datos), cotiza: true },
  ];

  const botonWhatsapp = (
    <a href={waLink(t.mensajeWhatsapp)} target="_blank" rel="noopener noreferrer" className={PILDORA_WHATSAPP}>
      {t.ctaWhatsapp}
    </a>
  );

  return (
    <main id="main-content" className="min-h-screen bg-crema" data-seccion="servicios-grupos">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      {/* ── PORTADA: qué ofrecemos, en la primera pantalla ── */}
      <section className="px-4 pb-10 pt-[calc(var(--navbar-alto,64px)+20px)] sm:px-6 sm:pb-14 sm:pt-[calc(var(--navbar-alto,64px)+36px)]">
        <div className="mx-auto max-w-4xl">
          <nav aria-label={en ? "Breadcrumb" : "Ruta"} className="mb-6 font-dm text-[13px] text-negro/50">
            <Link href={lp("/")} prefetch={false} className="transition-colors hover:text-verde-selva">{en ? "Home" : "Inicio"}</Link>
            <span className="mx-2">/</span>
            <span className="text-negro/70">{t.breadcrumb}</span>
          </nav>
          <p className={`mb-3 ${ETIQUETA}`}>{t.eyebrow}</p>
          <h1 className="font-cormorant font-light leading-[1.05] text-verde-profundo" style={H1_SIZE}>
            {t.h1}
          </h1>
          <div className="mt-6 rounded-2xl border border-dorado/40 bg-dorado/10 p-5 sm:p-6">
            <p className="mb-1.5 font-dm text-[15px] font-medium text-verde-profundo">{t.respuestaEtiqueta}</p>
            <p className={PARRAFO}>{t.respuesta(datos)}</p>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {botonWhatsapp}
            {t.indice.map((i) => (
              <a key={i.href} href={i.href} className="font-dm text-sm text-verde-selva underline decoration-verde-selva/30 underline-offset-4 hover:text-terracota">
                {i.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRANSPORTE PRIVADO ── las tarifas salen de traslados.ts */}
      <section id="transporte" className={`${SECCION} scroll-mt-24`}>
        <div className={CONTENEDOR}>
          <h2 className={`mb-3 ${H2}`} style={H2_SIZE}>{t.transporteH2}</h2>
          <p className={`mb-6 ${PARRAFO}`}>{t.transporteIntro}</p>
          <div className="grid gap-4 md:grid-cols-3">
            {TRASLADOS.map((ruta) => (
              <div key={ruta.slug} className={CAJA}>
                <TrasladoTabla ruta={ruta} claro locale={locale} />
              </div>
            ))}
          </div>
          <ul className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-3">
            {extrasTransporte.map((x) => (
              <li key={x.titulo} className="border-t border-negro/15 pt-4">
                <x.Icon className="mb-2.5 h-5 w-5 text-verde-selva" strokeWidth={1.75} aria-hidden="true" />
                <h3 className="font-dm text-[15px] font-medium text-verde-profundo">{x.titulo}</h3>
                <p className="mt-1.5 font-dm text-[13px] leading-relaxed text-negro/60">{x.texto}</p>
                {x.cotiza && <p className="mt-2 font-dm text-[12px] font-medium text-dorado">{t.porCotizacion}</p>}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── GUÍAS PRIVADOS ── nombres, origen y certificación de guias.ts */}
      <section id="guias" className={`${SECCION} scroll-mt-24`}>
        <div className={CONTENEDOR}>
          <h2 className={`mb-3 ${H2}`} style={H2_SIZE}>{t.guiasH2}</h2>
          <p className={`mb-6 max-w-[62ch] ${PARRAFO}`}>{t.guiasTexto(datos)}</p>
          {/* Los tres en una fila también en el teléfono: con ancho fijo el tercero caía solo abajo. */}
          <ul className="grid max-w-md grid-cols-3 gap-3 sm:gap-5">
            {GUIAS.map((g) => (
              <li key={g.nombre}>
                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-negro/5">
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
                <p className="mt-2 font-dm text-sm font-medium text-verde-profundo">{g.apodo ?? g.nombre.split(" ")[0]}</p>
              </li>
            ))}
          </ul>
          <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="font-dm text-[13px] font-medium text-dorado">{t.porCotizacion}</span>
            <Link href={lp("/nosotros")} prefetch={false} className={`font-dm text-sm ${ENLACE}`}>{t.guiasEnlace}</Link>
          </p>
        </div>
      </section>

      {/* ── DESAYUNOS, COMIDAS Y CENAS EN EL PAPÁN ── */}
      <section id="comida" className={`${SECCION} scroll-mt-24`}>
        <div className={CONTENEDOR}>
          <h2 className={`mb-3 ${H2}`} style={H2_SIZE}>{t.comidaH2}</h2>
          <p className={`mb-6 max-w-[62ch] ${PARRAFO}`}>{t.comidaIntro(datos)}</p>

          <div className="grid gap-4 md:grid-cols-2">
            <div className={CAJA}>
              <h3 className="font-dm text-[15px] font-medium text-verde-profundo">{t.bandejaTitulo}</h3>
              <p className="mt-2 flex items-baseline gap-2">
                <span className="font-cormorant text-4xl text-verde-selva">{datos.bandeja}</span>
                <span className="font-dm text-[13px] text-negro/55">{t.bandejaUnidad}</span>
              </p>
              <ul className="mt-4 space-y-2">
                {t.bandejaIncluye.map((x) => (
                  <li key={x} className="flex gap-2.5 font-dm text-[14px] leading-snug text-negro/70">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-verde-selva" strokeWidth={2} aria-hidden="true" />
                    {x}
                  </li>
                ))}
              </ul>
              <p className="mt-4 font-dm text-[12px] text-negro/50">{t.bandejaNota}</p>
            </div>
            <div className={CAJA}>
              <h3 className="font-dm text-[15px] font-medium text-verde-profundo">{t.comidasCenasTitulo}</h3>
              <p className="mt-2 font-dm text-[13px] font-medium text-dorado">{t.porCotizacion}</p>
              <p className={`mt-3 ${PARRAFO}`}>{t.comidasCenasTexto}</p>
              <div className="relative mt-5 aspect-[4/3] overflow-hidden rounded-xl bg-negro/5">
                <Image src={FOTOS_PAPAN.platillos} alt={t.fotosAlt.platillos} fill sizes="(max-width: 767px) 90vw, 420px" loading="lazy" className="object-cover" />
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-negro/5">
              <Image src={FOTOS_PAPAN.fogon} alt={t.fotosAlt.fogon} fill sizes="(max-width: 767px) 50vw, 440px" loading="lazy" className="object-cover" />
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-negro/5">
              <Image src={FOTOS_PAPAN.chilaquiles} alt={t.fotosAlt.chilaquiles} fill sizes="(max-width: 767px) 50vw, 440px" loading="lazy" className="object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* ── CÓMO COTIZAR ── */}
      <section id="cotizar" className={`${SECCION} scroll-mt-24`}>
        <div className={CONTENEDOR}>
          <h2 className={`mb-6 ${H2}`} style={H2_SIZE}>{t.cotizarH2}</h2>
          <ol className="grid gap-x-8 gap-y-6 sm:grid-cols-3">
            {t.pasos.map((p, i) => (
              <li key={p.t} className="border-t border-negro/15 pt-4">
                <p className="font-cormorant text-3xl leading-none text-dorado">{i + 1}</p>
                <h3 className="mt-2 font-dm text-[15px] font-medium text-verde-profundo">{p.t}</h3>
                <p className="mt-1.5 font-dm text-[13px] leading-relaxed text-negro/60">{p.d}</p>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {botonWhatsapp}
            <span className="font-dm text-sm text-negro/60">{t.gruposTexto}</span>
            <Link href={lp("/grupos")} prefetch={false} className={PILDORA_LINEA}>{t.gruposEnlace}</Link>
          </div>
        </div>
      </section>

      {/* ── FAQ ── lo mismo que va al FAQPage, a la vista */}
      <section className={`${SECCION} pb-20`}>
        <div className={CONTENEDOR}>
          <h2 className={`mb-6 ${H2}`} style={H2_SIZE}>{t.faqH2}</h2>
          <div className="space-y-3">
            {faqs.map((f) => (
              <details key={f.q} className="group rounded-2xl bg-white">
                <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-dm text-[15px] text-verde-profundo">
                  {f.q}
                  <span className="text-lg leading-none text-verde-selva transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className={`px-5 pb-5 ${PARRAFO}`}>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
