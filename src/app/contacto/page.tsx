import { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { MessageCircle, Mail, MapPin, Clock, CreditCard, HelpCircle, BookOpen } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { CONTACTO } from "@/lib/contacto";
import { waLink } from "@/lib/whatsapp";
import { asLocale, localeUrl, buildAlternates, SITE } from "@/lib/i18n/config";
import { getContacto } from "@/lib/i18n/contacto.en";

// El copy vive en `contacto.en.ts`; los datos (correo, teléfono, Maps) siguen
// saliendo de `lib/contacto.ts`, que es la fuente única.

export function generateMetadata(): Metadata {
  const locale = asLocale(headers().get("x-locale"));
  const t = getContacto(locale);
  return {
    title: t.metaTitle,
    description: t.metaDescription,
    alternates: buildAlternates("/contacto", locale),
    openGraph: {
      title: t.ogTitle,
      description: t.ogDescription,
      url: localeUrl("/contacto", locale),
      siteName: "Tours Huasteca Potosina",
      locale: locale === "en" ? "en_US" : "es_MX",
      type: "website",
    },
  };
}

const ICONO_ATAJO: Record<string, LucideIcon> = {
  reservar: CreditCard,
  faq: HelpCircle,
  guia: BookOpen,
};

export default function ContactoPage() {
  const locale = asLocale(headers().get("x-locale"));
  const t = getContacto(locale);
  const url = localeUrl("/contacto", locale);

  const contactSchema = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: t.schemaName,
    url,
    inLanguage: locale === "en" ? "en-US" : "es-MX",
    mainEntity: {
      "@type": "TravelAgency",
      name: CONTACTO.nombreComercial,
      url: SITE,
      email: CONTACTO.email,
      telephone: CONTACTO.telefonoE164,
      areaServed: t.schemaAreaServed,
      hasMap: CONTACTO.mapsUrl,
      sameAs: [CONTACTO.facebook, CONTACTO.mapsUrl],
    },
  };

  const canales = [
    {
      Icon: MessageCircle,
      titulo: t.canalWhatsappTitulo,
      detalle: CONTACTO.telefonoDisplay,
      nota: t.canalWhatsappNota,
      href: waLink(t.canalWhatsappMensaje),
      cta: t.canalWhatsappCta,
      externo: true,
      destacado: true,
    },
    {
      Icon: Mail,
      titulo: t.canalCorreoTitulo,
      detalle: CONTACTO.email,
      nota: t.canalCorreoNota,
      href: `mailto:${CONTACTO.email}`,
      cta: t.canalCorreoCta,
      externo: false,
      destacado: false,
    },
    {
      Icon: MapPin,
      titulo: t.canalUbicacionTitulo,
      detalle: CONTACTO.ciudadBase,
      nota: t.canalUbicacionNota,
      href: CONTACTO.mapsUrl,
      cta: t.canalUbicacionCta,
      externo: true,
      destacado: false,
    },
  ];

  return (
    <main className="min-h-screen bg-crema pt-28 pb-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(contactSchema) }} />

      <div className="max-w-4xl mx-auto px-6">
        <p className="text-[10px] tracking-[3px] uppercase font-dm text-verde-selva mb-3">{t.eyebrow}</p>
        <h1 className="font-cormorant font-light text-verde-profundo mb-4" style={{ fontSize: "clamp(32px,6vw,54px)" }}>
          {t.h1a} <em className="text-dorado">{t.h1Enfasis}</em>
        </h1>
        <p className="font-dm text-negro/60 text-base leading-relaxed max-w-2xl mb-12">
          {t.intro}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-16">
          {canales.map(({ Icon, titulo, detalle, nota, href, cta, externo, destacado }) => (
            <div
              key={titulo}
              className={`border p-6 flex flex-col ${
                destacado ? "border-verde-selva/40 bg-verde-selva/5" : "border-negro/10 bg-white"
              }`}
            >
              <Icon className={`w-5 h-5 mb-4 ${destacado ? "text-verde-selva" : "text-negro/40"}`} aria-hidden="true" />
              <h2 className="font-dm text-[10px] tracking-[2px] uppercase text-negro/45 mb-2">{titulo}</h2>
              <p className="font-cormorant text-xl text-verde-profundo leading-tight mb-3 break-words">{detalle}</p>
              <p className="font-dm text-xs text-negro/55 leading-relaxed mb-6 flex-1">{nota}</p>
              <a
                href={href}
                {...(externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className={`text-center text-[10px] tracking-[2px] uppercase font-dm py-3 transition-colors ${
                  destacado
                    ? "bg-verde-selva text-crema hover:bg-verde-vivo"
                    : "border border-negro/20 text-negro/70 hover:border-negro/50 hover:text-negro"
                }`}
              >
                {cta}
              </a>
            </div>
          ))}
        </div>

        {CONTACTO.horario && (
          <div className="border border-negro/10 bg-white p-6 mb-16 flex items-start gap-4">
            <Clock className="w-5 h-5 text-negro/40 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h2 className="font-dm text-[10px] tracking-[2px] uppercase text-negro/45 mb-1">{t.horarioTitulo}</h2>
              <p className="font-dm text-sm text-negro/70">{CONTACTO.horario}</p>
            </div>
          </div>
        )}

        <h2 className="font-cormorant font-light text-verde-profundo text-3xl mb-6">{t.atajosTitulo}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-16">
          {t.atajos.map(({ icono, titulo, texto, href }) => {
            const Icon = ICONO_ATAJO[icono];
            return (
              <Link
                key={href}
                href={href}
                className="border border-negro/10 bg-white p-6 hover:border-verde-selva/50 transition-colors group"
              >
                <Icon className="w-5 h-5 text-negro/40 group-hover:text-verde-selva transition-colors mb-4" aria-hidden="true" />
                <h3 className="font-cormorant text-xl text-verde-profundo mb-2">{titulo}</h3>
                <p className="font-dm text-xs text-negro/55 leading-relaxed">{texto}</p>
              </Link>
            );
          })}
        </div>

        <div className="border-t border-negro/10 pt-8">
          <h2 className="font-dm text-[10px] tracking-[2px] uppercase text-negro/45 mb-3">{t.gruposTitulo}</h2>
          <p className="font-dm text-sm text-negro/60 leading-relaxed max-w-2xl">
            {t.gruposTextoA}{" "}
            <a href={`mailto:${CONTACTO.email}`} className="text-verde-selva underline underline-offset-2 hover:text-verde-vivo">
              {CONTACTO.email}
            </a>{" "}
            {t.gruposTextoB}
          </p>
          {CONTACTO.razonSocial && CONTACTO.rfc && (
            <p className="font-dm text-xs text-negro/45 leading-relaxed mt-4">
              {CONTACTO.razonSocial} · RFC {CONTACTO.rfc}
              {CONTACTO.direccion ? ` · ${CONTACTO.direccion}` : ""}
            </p>
          )}
          <p className="font-dm text-xs text-negro/45 mt-4">
            {t.privacidadPre}{" "}
            {/* El aviso legal solo existe en español; el inglés lo advierte con `privacidadNota`. */}
            <Link href="/aviso-de-privacidad" className="underline underline-offset-2 hover:text-negro/70">
              {t.privacidadLink}
            </Link>
            {t.privacidadNota ? ` ${t.privacidadNota}` : ""}.
          </p>
        </div>
      </div>
    </main>
  );
}
