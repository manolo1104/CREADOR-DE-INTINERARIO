import { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, AlertTriangle, XCircle, CloudRain, RefreshCw, MessageCircle } from "lucide-react";
import { CONTACTO } from "@/lib/contacto";
import { waLink } from "@/lib/whatsapp";

const SITE = "https://www.huasteca-potosina.com";

export const metadata: Metadata = {
  title: "Política de cancelación y clima — Tours Huasteca Potosina",
  description:
    "Cancelación gratuita hasta 48 h antes con reembolso completo. Qué pasa si cancelas tarde, si no te presentas, si llueve o si el paraje cierra. Reglas claras, por escrito.",
  alternates: { canonical: `${SITE}/politica-de-cancelacion` },
  openGraph: {
    title: "Política de cancelación y clima — Tours Huasteca Potosina",
    description: "Cancelación gratuita hasta 48 h antes. Si llueve, reprogramamos sin costo.",
    url: `${SITE}/politica-de-cancelacion`,
    type: "website",
  },
};

const FAQS = [
  {
    q: "¿Puedo cancelar mi tour y recuperar mi dinero?",
    a: "Sí. Si cancelas con 48 horas o más de anticipación, te devolvemos el 100 % de lo que hayas pagado, incluido el anticipo del 30 %. Sin preguntas y sin trámites.",
  },
  {
    q: "¿Qué pasa si cancelo con menos de 48 horas?",
    a: "Entre 48 y 24 horas antes de la salida se retiene el 50 % de lo pagado, porque a esa altura ya reservamos guía, transporte y entradas. Con menos de 24 horas no hay reembolso, pero puedes reagendar una vez sin costo adicional dentro de los siguientes 12 meses.",
  },
  {
    q: "¿Qué pasa si no me presento el día del tour?",
    a: "Si no te presentas y no nos avisaste, no hay reembolso ni reagendamiento. Un mensaje de WhatsApp antes de la hora de salida siempre te deja en mejor posición que el silencio.",
  },
  {
    q: "¿Qué pasa si llueve?",
    a: "Operamos con lluvia ligera: la Huasteca es selva y las cascadas lucen más espectaculares con agua. Si hay tormenta eléctrica, alerta meteorológica o el río no está en condiciones seguras, nosotros cancelamos y eliges entre reembolso del 100 % o reagendar sin costo. Nunca sacamos un grupo con el río crecido.",
  },
  {
    q: "¿Qué pasa si el paraje está cerrado?",
    a: "Algunos destinos los administran ejidos o cooperativas locales y pueden cerrar por su cuenta, o Protección Civil puede restringir el acceso. Si eso ocurre te avisamos en cuanto lo sabemos y aplica lo mismo que en una cancelación nuestra: reembolso del 100 % o reagendamiento sin costo, a tu elección. También podemos proponerte un destino alternativo del mismo nivel; si lo aceptas, no hay ningún cargo extra.",
  },
  {
    q: "¿Cómo cancelo?",
    a: `Por WhatsApp al ${CONTACTO.telefonoDisplay} o por correo a ${CONTACTO.email}, con el nombre de quien reservó y la fecha del tour. Cuenta la hora en que nos escribes, no la hora en que respondemos.`,
  },
  {
    q: "¿Cuánto tarda el reembolso?",
    a: "Si pagaste con tarjeta, el reembolso sale por la misma vía y suele reflejarse en tu estado de cuenta entre 5 y 10 días hábiles, según tu banco. Si pagaste por transferencia, te lo depositamos a la cuenta que nos indiques.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

const ESCALA = [
  {
    Icon: CheckCircle2,
    color: "text-lima border-lima/40 bg-lima/8",
    titulo: "48 h o más antes",
    sub: "Reembolso del 100 %",
    detalle: "Se te devuelve todo lo pagado, incluido el anticipo. Sin preguntas.",
  },
  {
    Icon: AlertTriangle,
    color: "text-dorado border-dorado/40 bg-dorado/8",
    titulo: "Entre 48 y 24 h antes",
    sub: "Se retiene el 50 %",
    detalle: "A esa altura ya están comprometidos guía, transporte y entradas.",
  },
  {
    Icon: RefreshCw,
    color: "text-agua border-agua/40 bg-agua/8",
    titulo: "Menos de 24 h antes",
    sub: "Sin reembolso · Reagendas 1 vez gratis",
    detalle: "Conservas el valor de tu reserva para otra fecha dentro de 12 meses.",
  },
  {
    Icon: XCircle,
    color: "text-terracota border-terracota/40 bg-terracota/8",
    titulo: "No presentarse",
    sub: "Sin reembolso",
    detalle: "Si nos avisas antes de la hora de salida, entras en el caso anterior.",
  },
];

export default function PoliticaCancelacionPage() {
  return (
    <main className="min-h-screen bg-crema pt-28 pb-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <div className="max-w-3xl mx-auto px-6">
        <p className="text-[10px] tracking-[3px] uppercase font-dm text-verde-selva mb-3">Política</p>
        <h1 className="font-cormorant font-light text-verde-profundo mb-4" style={{ fontSize: "clamp(32px,6vw,54px)" }}>
          Cancelación y <em className="text-dorado">clima</em>
        </h1>
        <p className="font-dm text-negro/60 text-base leading-relaxed mb-4">
          Reservar un viaje con meses de anticipación da nervios. Estas son las reglas completas,
          por escrito, para que sepas exactamente qué pasa en cada caso antes de pagar.
        </p>
        <p className="font-dm text-negro/40 text-xs mb-12">
          Aplica a todos los tours de un día reservados en este sitio. Los paquetes con hospedaje
          tienen condiciones propias de hotel que te confirmamos al reservar.
        </p>

        <h2 className="font-cormorant font-light text-verde-profundo text-3xl mb-6">Si cancelas tú</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-14">
          {ESCALA.map(({ Icon, color, titulo, sub, detalle }) => (
            <div key={titulo} className={`border p-5 ${color}`}>
              <Icon className="w-5 h-5 mb-3" aria-hidden="true" />
              <p className="font-dm text-sm font-medium text-negro/80 mb-1">{titulo}</p>
              <p className="font-cormorant text-lg text-verde-profundo leading-tight mb-2">{sub}</p>
              <p className="font-dm text-xs text-negro/55 leading-relaxed">{detalle}</p>
            </div>
          ))}
        </div>

        <h2 className="font-cormorant font-light text-verde-profundo text-3xl mb-4">Si cancelamos nosotros</h2>
        <div className="border border-verde-selva/30 bg-verde-selva/5 p-6 mb-14">
          <CloudRain className="w-5 h-5 text-verde-selva mb-4" aria-hidden="true" />
          <p className="font-dm text-sm text-negro/70 leading-relaxed mb-4">
            Cancelamos por tormenta eléctrica, alerta meteorológica, río en condiciones no seguras,
            cierre del paraje por parte del ejido o de Protección Civil, o cualquier causa operativa
            nuestra. En todos esos casos <strong className="text-verde-profundo">tú eliges</strong>:
          </p>
          <ul className="space-y-2 mb-4">
            {[
              "Reembolso del 100 % de lo pagado.",
              "Reagendar para otra fecha sin ningún costo adicional.",
              "Cambiar a un destino alternativo del mismo nivel, sin cargo extra.",
            ].map((t) => (
              <li key={t} className="font-dm text-sm text-negro/65 flex items-start gap-2">
                <span className="text-verde-vivo mt-0.5" aria-hidden="true">→</span>
                {t}
              </li>
            ))}
          </ul>
          <p className="font-dm text-xs text-negro/50 leading-relaxed">
            La decisión de salir o no la toma el guía responsable la mañana del tour, con la
            información del río y del clima en mano. Tu seguridad va antes que la venta: nunca
            sacamos un grupo con el río crecido.
          </p>
        </div>

        <h2 className="font-cormorant font-light text-verde-profundo text-3xl mb-6">Preguntas sobre la política</h2>
        <div className="space-y-5 mb-14">
          {FAQS.map((f) => (
            <div key={f.q} className="border-b border-negro/10 pb-5">
              <h3 className="font-dm text-sm font-medium text-verde-profundo mb-2">{f.q}</h3>
              <p className="font-dm text-sm text-negro/60 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>

        <div className="border border-negro/10 bg-white p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5 justify-between">
          <div>
            <p className="font-cormorant text-xl text-verde-profundo mb-1">¿Tu caso no está aquí?</p>
            <p className="font-dm text-xs text-negro/55">Escríbenos y lo resolvemos como personas.</p>
          </div>
          <a
            href={waLink("Hola, tengo una duda sobre la política de cancelación de un tour.")}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 inline-flex items-center gap-2 bg-verde-selva text-crema px-6 py-3 text-[10px] tracking-[2px] uppercase font-dm hover:bg-verde-vivo transition-colors"
          >
            <MessageCircle className="w-4 h-4" aria-hidden="true" />
            Escríbenos
          </a>
        </div>

        <p className="font-dm text-xs text-negro/40 mt-8">
          Ver también:{" "}
          <Link href="/terminos" className="underline underline-offset-2 hover:text-negro/70">Términos y condiciones</Link>
          {" · "}
          <Link href="/preguntas-frecuentes" className="underline underline-offset-2 hover:text-negro/70">Preguntas frecuentes</Link>
          {" · "}
          <Link href="/info-practica" className="underline underline-offset-2 hover:text-negro/70">Info práctica</Link>
        </p>
      </div>
    </main>
  );
}
