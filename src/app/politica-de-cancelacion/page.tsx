import { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, AlertTriangle, XCircle, CloudRain, RefreshCw, MessageCircle } from "lucide-react";
import { CONTACTO } from "@/lib/contacto";
import { waLink } from "@/lib/whatsapp";
import { TOURS_DB } from "@/lib/tours";

const SITE = "https://www.huasteca-potosina.com";

/**
 * 🔴 Los recorridos que NO siguen esta política, sacados del catálogo
 * (`cancelacion` en `tours.ts`), nunca escritos a mano aquí.
 *
 * Hoy es uno: El Edén en el Jardín. La Fundación Las Pozas no reembolsa nunca,
 * y esta página —con su FAQPage, que es lo que citan Google y los asistentes de
 * IA— prometía "cancelación gratuita 48 h, reembolso del 100 %" a todos. Un
 * reembolso que el proveedor no devuelve lo paga la operadora de su bolsa. El
 * texto de la excepción es el MISMO `cancelacion.es` que enseñan la ficha y el
 * pago, así que no hay dos versiones que puedan separarse.
 */
const EXCEPCIONES = TOURS_DB.filter((t) => t.cancelacion);
const NOMBRES_EXCEPCION = EXCEPCIONES.map((t) => t.nombreCorto);

/** "A", "A y B", "A, B y C". */
const enLista = (nombres: string[]) =>
  nombres.length <= 1 ? nombres.join("") : `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;

/** " (salvo El Edén en el Jardín)" o nada, si algún día no queda ninguna excepción. */
const SALVO = NOMBRES_EXCEPCION.length ? ` (salvo ${enLista(NOMBRES_EXCEPCION)})` : "";

/**
 * La frase que remite a las condiciones propias, para las respuestas que
 * prometen reembolso.
 * 🔴 Tiene que entenderse SOLA: va al FAQPage, y un buscador o una IA cita la
 * respuesta sin la página alrededor. Decía "(abajo)", que ahí no apunta a nada
 * (y en la página el recuadro de la excepción está ARRIBA de las preguntas).
 */
const REMITE_EXCEPCION = NOMBRES_EXCEPCION.length
  ? ` Esto no aplica a ${enLista(NOMBRES_EXCEPCION)}, que ${NOMBRES_EXCEPCION.length > 1 ? "tienen" : "tiene"} sus propias condiciones de cancelación, descritas en esta misma página y en ${NOMBRES_EXCEPCION.length > 1 ? "sus fichas" : "su ficha"}.`
  : "";

export const metadata: Metadata = {
  title: "Política de cancelación y clima — Tours Huasteca Potosina",
  // Con la salvedad del Edén no cabía en 155: se acortó la segunda frase
  // ("no te presentas" → "no llegas", 154), no la salvedad (es justo lo que el
  // buscador tiene que enseñar). Una segunda excepción la pasaría del tope.
  description: `Cancelación gratis hasta 48 h antes con reembolso completo${SALVO}. Qué pasa si cancelas tarde, no llegas, llueve o cierra el paraje.`,
  alternates: { canonical: `${SITE}/politica-de-cancelacion` },
  openGraph: {
    title: "Política de cancelación y clima — Tours Huasteca Potosina",
    description: `Cancelación gratuita hasta 48 h antes${SALVO}. Operamos con lluvia ligera; si el río no es seguro, eliges entre reembolso del 100 % o cambiar la fecha.`,
    url: `${SITE}/politica-de-cancelacion`,
    type: "website",
    // Se compartía sin foto: el layout ya no le presta la suya a `twitter`
    // y esta página no tiene `opengraph-image`. Next rellena twitter:image con
    // esta. 1200×800 es la medida REAL del archivo (no 630).
    images: [{ url: `${SITE}/og-image.jpg`, width: 1200, height: 800, alt: "Tours Huasteca Potosina" }],
  },
};

const FAQS = [
  {
    q: "¿Puedo cancelar mi tour y recuperar mi dinero?",
    // "sea el anticipo o el pago completo" cubre los dos casos reales: el
    // anticipo del 30 % y quien decidió pagar el 100 % al reservar.
    a: `Sí. Si cancelas con 48 horas o más de anticipación, te devolvemos el 100 % de lo que hayas pagado, sea el anticipo o el pago completo. Sin preguntas y sin trámites.${REMITE_EXCEPCION}`,
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
    a: `Operamos con lluvia ligera: la Huasteca es selva y las cascadas lucen más espectaculares con agua. Si hay tormenta eléctrica, alerta meteorológica o el río no está en condiciones seguras, nosotros cancelamos y eliges entre reembolso del 100 % o reagendar sin costo. Nunca sacamos un grupo con el río crecido.${REMITE_EXCEPCION}`,
  },
  {
    // La garantía de caudal (29 sep 2026): el banner del río (BandaRio) la
    // promete en todo el sitio y enlaza aquí, así que esta respuesta es la
    // letra de esa promesa. "Antes de la salida" evita el reclamo posterior.
    q: "¿Y si el agua no está turquesa?",
    a: "En temporada de lluvias el río puede venir crecido y con sedimento aunque el tour opere con normalidad. Si el día de tu recorrido el agua no está en su tono turquesa, puedes reagendar una vez sin costo, para cualquier fecha dentro de los siguientes 12 meses; solo avísanos por WhatsApp antes de la hora de salida. Es nuestra garantía de caudal: preferimos que veas la Huasteca en su mejor momento.",
  },
  {
    q: "¿Qué pasa si el paraje está cerrado?",
    a: `Algunos destinos los administran ejidos o cooperativas locales y pueden cerrar por su cuenta, o Protección Civil puede restringir el acceso. Si eso ocurre te avisamos en cuanto lo sabemos y aplica lo mismo que en una cancelación nuestra: reembolso del 100 % o reagendamiento sin costo, a tu elección. También podemos proponerte un destino alternativo del mismo nivel; si lo aceptas, no hay ningún cargo extra.${REMITE_EXCEPCION}`,
  },
  {
    q: "¿Cómo cancelo?",
    a: `Por WhatsApp al ${CONTACTO.telefonoDisplay} o por correo a ${CONTACTO.email}, con el nombre de quien reservó y la fecha del tour. Cuenta la hora en que nos escribes, no la hora en que respondemos.`,
  },
  {
    q: "¿Cuánto tarda el reembolso?",
    a: "Si pagaste con tarjeta, el reembolso sale por la misma vía y suele reflejarse en tu estado de cuenta entre 5 y 10 días hábiles, según tu banco. Si pagaste por transferencia, te lo depositamos a la cuenta que nos indiques.",
  },
  // Una pregunta por excepción, con su texto del catálogo: va también al
  // FAQPage, que es donde un asistente de IA lee "¿tiene reembolso?".
  ...EXCEPCIONES.map((t) => ({
    q: `¿Aplica esta política a ${t.nombreCorto}?`,
    a: `No. ${t.cancelacion!.es}`,
  })),
];

// Llevaba las preguntas pero no las migas, que sí tienen sus dos hermanas
// legales: sin ellas esta página no declara dónde cuelga del sitio.
const faqSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      name: "Política de cancelación y clima",
      description:
        "Qué pasa si cancelas o si llueve: plazos de reembolso, reprogramación y el criterio de cancelación por clima.",
      url: `${SITE}/politica-de-cancelacion`,
      inLanguage: "es-MX",
      isPartOf: { "@type": "WebSite", name: "Tours Huasteca Potosina", url: SITE },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: SITE },
        { "@type": "ListItem", position: 2, name: "Política de cancelación", item: `${SITE}/politica-de-cancelacion` },
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

const ESCALA = [
  {
    Icon: CheckCircle2,
    color: "text-lima border-lima/40 bg-lima/8",
    titulo: "48 h o más antes",
    sub: "Reembolso del 100 %",
    // Igual que la FAQ: cubre el anticipo del 30 % y a quien pagó el 100 %.
    detalle: "Se te devuelve todo lo pagado, sea el anticipo o el pago completo. Sin preguntas.",
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
          Aplica a todos los tours de un día reservados en este sitio{SALVO}. Los paquetes con hospedaje
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

        {/* La garantía de caudal, a la vista: es la promesa del banner del río. */}
        <div className="border border-agua/40 bg-agua/5 p-6 mb-14">
          <h3 className="font-cormorant font-light text-verde-profundo text-2xl mb-3">Garantía de caudal</h3>
          <p className="font-dm text-sm text-negro/70 leading-relaxed">
            Si el día de tu tour el agua no está en su tono turquesa —aunque el recorrido opere
            con normalidad—, <strong className="text-verde-profundo">reagendas gratis</strong> una
            vez, para cualquier fecha dentro de los siguientes 12 meses. Solo avísanos por WhatsApp
            antes de la hora de salida.
          </p>
        </div>

        {/* La excepción, a la vista y no solo dentro de una respuesta: quien
            reserva el Edén tiene que leer ANTES de pagar que no hay reembolso. */}
        {EXCEPCIONES.map((t) => (
          <div key={t.slug} className="border border-terracota/40 bg-terracota/8 p-6 mb-14">
            <XCircle className="w-5 h-5 text-terracota mb-3" aria-hidden="true" />
            <h2 className="font-cormorant font-light text-verde-profundo text-2xl mb-3">
              Excepción: {t.nombreCorto}
            </h2>
            <p className="font-dm text-sm text-negro/70 leading-relaxed mb-3">{t.cancelacion!.es}</p>
            <Link href={`/tours/${t.slug}`} className="font-dm text-xs text-verde-selva underline underline-offset-2 hover:text-verde-vivo">
              Ver la experiencia
            </Link>
          </div>
        ))}

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
