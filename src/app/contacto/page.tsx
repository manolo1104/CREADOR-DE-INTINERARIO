import { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, Mail, MapPin, Clock, CreditCard, HelpCircle } from "lucide-react";
import { CONTACTO } from "@/lib/contacto";
import { waLink, WA_MESSAGES } from "@/lib/whatsapp";

const SITE = "https://www.huasteca-potosina.com";

export const metadata: Metadata = {
  title: "Contacto — Tours Huasteca Potosina | WhatsApp y correo",
  description:
    "Habla con nosotros por WhatsApp o correo para reservar tu tour en la Huasteca Potosina, cotizar un grupo o resolver dudas antes de viajar. Base de operaciones en Xilitla, San Luis Potosí.",
  alternates: { canonical: `${SITE}/contacto` },
  openGraph: {
    title: "Contacto — Tours Huasteca Potosina",
    description: "WhatsApp, correo y ubicación de nuestra base en Xilitla, San Luis Potosí.",
    url: `${SITE}/contacto`,
    type: "website",
  },
};

const contactSchema = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: "Contacto — Tours Huasteca Potosina",
  url: `${SITE}/contacto`,
  mainEntity: {
    "@type": "TravelAgency",
    name: CONTACTO.nombreComercial,
    url: SITE,
    email: CONTACTO.email,
    telephone: CONTACTO.telefonoE164,
    areaServed: "Huasteca Potosina, San Luis Potosí, México",
    hasMap: CONTACTO.mapsUrl,
    sameAs: [CONTACTO.facebook, CONTACTO.mapsUrl],
  },
};

const canales = [
  {
    Icon: MessageCircle,
    titulo: "WhatsApp",
    detalle: CONTACTO.telefonoDisplay,
    nota: "La vía más rápida. Aquí resolvemos disponibilidad, fechas y grupos.",
    href: waLink(WA_MESSAGES.general),
    cta: "Abrir WhatsApp",
    externo: true,
    destacado: true,
  },
  {
    Icon: Mail,
    titulo: "Correo",
    detalle: CONTACTO.email,
    nota: "Para cotizaciones de grupo, facturación y temas que necesitan archivos.",
    href: `mailto:${CONTACTO.email}`,
    cta: "Escribir correo",
    externo: false,
    destacado: false,
  },
  {
    Icon: MapPin,
    titulo: "Dónde estamos",
    detalle: CONTACTO.ciudadBase,
    nota: "Nuestra base de operaciones. Los tours recogen en Xilitla y en Ciudad Valles.",
    href: CONTACTO.mapsUrl,
    cta: "Ver en Google Maps",
    externo: true,
    destacado: false,
  },
];

const atajos = [
  { Icon: CreditCard, titulo: "Reservar un tour", texto: "Aparta tu lugar con el 30 % y liquida el día del tour.", href: "/reservar" },
  { Icon: HelpCircle, titulo: "Preguntas frecuentes", texto: "Precios, qué incluye, cómo llegar, mejor época y seguridad.", href: "/preguntas-frecuentes" },
  { Icon: Clock,      titulo: "Política de cancelación", texto: "Qué pasa si cambias de fecha, si no puedes ir o si llueve.", href: "/politica-de-cancelacion" },
];

export default function ContactoPage() {
  return (
    <main className="min-h-screen bg-crema pt-28 pb-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(contactSchema) }} />

      <div className="max-w-4xl mx-auto px-6">
        <p className="text-[10px] tracking-[3px] uppercase font-dm text-verde-selva mb-3">Contacto</p>
        <h1 className="font-cormorant font-light text-verde-profundo mb-4" style={{ fontSize: "clamp(32px,6vw,54px)" }}>
          Hablemos de <em className="text-dorado">tu viaje</em>
        </h1>
        <p className="font-dm text-negro/60 text-base leading-relaxed max-w-2xl mb-12">
          Somos una operadora local con base en la Huasteca Potosina. Escríbenos para reservar,
          cotizar un grupo o resolver cualquier duda antes de viajar — incluso si todavía no
          tienes fechas.
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
              <h2 className="font-dm text-[10px] tracking-[2px] uppercase text-negro/45 mb-1">Horario de atención</h2>
              <p className="font-dm text-sm text-negro/70">{CONTACTO.horario}</p>
            </div>
          </div>
        )}

        <h2 className="font-cormorant font-light text-verde-profundo text-3xl mb-6">Quizá esto te ahorre el mensaje</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-16">
          {atajos.map(({ Icon, titulo, texto, href }) => (
            <Link
              key={href}
              href={href}
              className="border border-negro/10 bg-white p-6 hover:border-verde-selva/50 transition-colors group"
            >
              <Icon className="w-5 h-5 text-negro/40 group-hover:text-verde-selva transition-colors mb-4" aria-hidden="true" />
              <h3 className="font-cormorant text-xl text-verde-profundo mb-2">{titulo}</h3>
              <p className="font-dm text-xs text-negro/55 leading-relaxed">{texto}</p>
            </Link>
          ))}
        </div>

        <div className="border-t border-negro/10 pt-8">
          <h2 className="font-dm text-[10px] tracking-[2px] uppercase text-negro/45 mb-3">Grupos y facturación</h2>
          <p className="font-dm text-sm text-negro/60 leading-relaxed max-w-2xl">
            Para grupos de más de 12 personas, salidas privadas, empresas o escuelas, escríbenos
            por WhatsApp o a{" "}
            <a href={`mailto:${CONTACTO.email}`} className="text-verde-selva underline underline-offset-2 hover:text-verde-vivo">
              {CONTACTO.email}
            </a>{" "}
            con las fechas y el número de personas, y te armamos una cotización.
          </p>
          {CONTACTO.razonSocial && CONTACTO.rfc && (
            <p className="font-dm text-xs text-negro/45 leading-relaxed mt-4">
              {CONTACTO.razonSocial} · RFC {CONTACTO.rfc}
              {CONTACTO.direccion ? ` · ${CONTACTO.direccion}` : ""}
            </p>
          )}
          <p className="font-dm text-xs text-negro/45 mt-4">
            Sobre el tratamiento de tus datos, consulta el{" "}
            <Link href="/aviso-de-privacidad" className="underline underline-offset-2 hover:text-negro/70">
              Aviso de Privacidad
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
