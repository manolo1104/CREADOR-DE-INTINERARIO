import type { Metadata } from "next";
import Link from "next/link";
import { TOURS_DB } from "@/lib/tours";
import { PAQUETES_DB } from "@/lib/paquetes";
import { waLink, WA_MESSAGES } from "@/lib/whatsapp";
import { SITE } from "@/lib/i18n/config";
import { buildBreadcrumbNode } from "@/lib/jsonld";

/**
 * Landing para quien ORGANIZA el viaje de otros: escuelas, empresas y agencias.
 *
 * Nace de dos compradoras reales del 11 sep 2026, las dos por teléfono y
 * WhatsApp y ninguna por el sitio: un grupo de 40-50 personas para 5-6 días en
 * abril que pedía «la orientación que nos proporcione», y una escuela que
 * necesitaba «enviar la propuesta a los papás» incluyendo dos hoteles,
 * alimentos, transporte «partiendo de la CDMX» y cortesías para los profesores.
 *
 * 🔴 Lo que esta página NO puede decir, por decisión de Manolo (11 sep):
 *   - ningún precio ni rango de grupo: las tarifas por número de personas están
 *     pendientes de que él las pase;
 *   - ningún porcentaje ni escalón de descuento: solo que existe y depende del
 *     número de personas;
 *   - ningún mínimo ni máximo de personas: no está definido;
 *   - ninguna cortesía prometida — la respuesta real del negocio fue «no
 *     ofrecemos cortesía como tal, les hacemos un descuento dependiendo del
 *     número de personas», y eso es lo único que se publica;
 *   - ninguna ciudad de origen salvo CDMX, que es la única confirmada;
 *   - ninguna reseña, calificación ni testimonio: no hay reseñas reales de
 *     grupos y el resto del sitio ya arrastra un problema con eso.
 *
 * Solo en español a propósito, como /tours-en-ciudad-valles y /desde/*: el
 * comprador es una escuela o una empresa mexicana. Declarar una gemela inglesa
 * que no existe manda a Google a un error.
 */

const URL = `${SITE}/grupos`;

export const metadata: Metadata = {
  title: "Viajes de Grupo a la Huasteca Potosina — Escuelas",
  description:
    "Escuelas, empresas y agencias: armamos el itinerario, el hospedaje, los alimentos y el transporte desde CDMX. Cotización a la medida por WhatsApp.",
  keywords: [
    "viajes escolares huasteca potosina",
    "viaje de grupo huasteca potosina",
    "tours para grupos huasteca potosina",
    "viaje escolar xilitla",
    "agencia de viajes huasteca potosina",
    "viajes corporativos huasteca potosina",
  ],
  alternates: { canonical: URL },
  openGraph: {
    title: "Viajes de grupo a la Huasteca Potosina",
    description:
      "Escuelas, empresas y agencias: armamos el itinerario, el hospedaje, los alimentos y el transporte. Cotización a la medida.",
    url: URL,
    siteName: "Tours Huasteca Potosina",
    locale: "es_MX",
    type: "website",
    images: [
      {
        url: `${SITE}/imagenes/cascada-de-tamul/hero.jpg`,
        width: 1600,
        height: 960,
        alt: "Grupo navegando en canoa por el Cañón del Tampaón hacia la Cascada de Tamul",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Viajes de grupo a la Huasteca Potosina",
    description: "Escuelas, empresas y agencias: itinerario, hospedaje, alimentos y transporte a la medida.",
    images: [`${SITE}/imagenes/cascada-de-tamul/hero.jpg`],
  },
};

/**
 * Las preguntas salen de lo que preguntaron de verdad las dos organizadoras,
 * no de lo que uno supone que preguntan. El texto se reutiliza tal cual en el
 * FAQPage: lo que lee Google es exactamente lo que lee la persona.
 */
const FAQS_GRUPOS: { q: string; a: string }[] = [
  {
    q: "¿Cuántas personas piden para dar cortesías?",
    a: "No manejamos cortesías como tal. Lo que hacemos es un descuento que depende del número de personas del grupo: cuantos más vayan, mejor queda el precio por persona. Escríbenos con el número aproximado y te decimos exactamente cómo queda.",
  },
  {
    q: "Necesito una propuesta para enseñarla a los papás o a mi jefe. ¿Me la mandan?",
    a: "Sí. Te armamos una propuesta con el itinerario día por día, qué incluye cada día, el hospedaje, los alimentos y el transporte, con el precio desglosado por persona. Te llega por WhatsApp o por correo, lista para reenviar a quien tenga que autorizarla.",
  },
  {
    q: "No sé qué recorridos elegir. ¿Ustedes lo arman?",
    a: "Es justo lo que hacemos. Nos dices cuántos días tienen, con qué grupo viajan y qué les interesa, y proponemos el itinerario nosotros: qué destino cada día, en qué orden y con qué ritmo, para que no terminen manejando de más ni repitiendo lugares. Conocemos la región y vivimos aquí.",
  },
  {
    q: "¿Hay transporte desde la Ciudad de México?",
    a: "Sí, podemos incluir el transporte desde la Ciudad de México dentro de la propuesta. Si salen de otra ciudad, pregúntanos y lo revisamos caso por caso.",
  },
  {
    q: "¿Se puede para varios días?",
    a: `Sí. Nuestros viajes de varios días van de ${Math.min(...PAQUETES_DB.map((p) => p.dias))} a ${Math.max(
      ...PAQUETES_DB.map((p) => p.dias),
    )} días, y para un grupo el itinerario se arma a la medida: se puede alargar, acortar o cambiar el orden según sus fechas.`,
  },
  {
    q: "¿Dónde duerme un grupo grande?",
    a: "Tenemos hotel propio en Xilitla, el Paraíso Encantado, y trabajamos con hospedaje de la zona para los grupos que no caben en una sola propiedad. El hospedaje concreto se define en la propuesta, según cuántos sean y en qué fechas.",
  },
  {
    q: "¿Por qué no puedo reservar en línea como los demás tours?",
    a: "Porque cada grupo llega con una situación distinta: número de personas, edades, presupuesto, días disponibles, de dónde salen y qué necesitan incluir. Eso no se resuelve con un formulario. Nos escribes por WhatsApp, lo platicamos y te mandamos una propuesta hecha para tu caso.",
  },
  {
    q: "¿Los guías están certificados?",
    a: "Sí. Todos nuestros recorridos van con guía certificado NOM-09 y seguro de viajero incluido. Para grupos escolares eso no es un detalle: es el requisito que normalmente pide la escuela.",
  },
];

const COMO_FUNCIONA = [
  {
    n: "1",
    t: "Nos escribes por WhatsApp",
    d: "Con tres datos basta para empezar: las fechas aproximadas, cuántas personas son más o menos y de qué ciudad salen. Si ya sabes qué tipo de grupo es —escuela, empresa, familia grande— dilo también.",
  },
  {
    n: "2",
    t: "Te proponemos el itinerario",
    d: "Armamos el recorrido día por día según los días que tengan y el perfil del grupo, y te decimos qué entra en el precio: recorridos, hospedaje, alimentos, transporte y guías.",
  },
  {
    n: "3",
    t: "Lo ajustamos contigo",
    d: "Se cambia lo que haga falta: quitar un día, cambiar un destino, mover fechas, ajustar el hospedaje. La propuesta se rehace las veces que necesites antes de comprometer nada.",
  },
  {
    n: "4",
    t: "Confirmas y se aparta",
    d: "Cuando la propuesta está aprobada por quien tenga que aprobarla, se confirman fechas y lugares. Te decimos el anticipo y las formas de pago en ese momento.",
  },
];

/**
 * Cómo se anuncian los precios del catálogo de paquetes, leído de
 * `precioPorPersona` —el mismo campo que decide `precioVisible()`—.
 *
 * 🔴 Esta página decía «están calculados para dos personas»: desde el 12 sep
 * 2026 cuatro de los cinco paquetes se anuncian por persona y solo la Luna de
 * Miel se sigue vendiendo por pareja. La segunda mitad de la frase —que no son
 * tarifa de grupo— sigue siendo verdad y se queda.
 */
const PAQ_POR_PAREJA = PAQUETES_DB.filter((p) => !p.precioPorPersona);
const listaEs = (xs: string[]) =>
  new Intl.ListFormat("es-MX", { type: "conjunction" }).format(xs);
const COMO_SE_ANUNCIAN =
  PAQ_POR_PAREJA.length === 0
    ? "por persona"
    : PAQ_POR_PAREJA.length === PAQUETES_DB.length
      ? "por pareja"
      : `por persona —salvo ${listaEs(
          PAQ_POR_PAREJA.map((p) => p.nombre),
        )}, que se anuncia${PAQ_POR_PAREJA.length > 1 ? "n" : ""} por pareja—`;

export default function GruposPage() {
  const nTours = TOURS_DB.length;
  const diasMin = Math.min(...PAQUETES_DB.map((p) => p.dias));
  const diasMax = Math.max(...PAQUETES_DB.map((p) => p.dias));

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      buildBreadcrumbNode([{ name: "Viajes de grupo", path: "/grupos" }]),
      {
        "@type": "FAQPage",
        mainEntity: FAQS_GRUPOS.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
      // Sin `Offer` a propósito: no hay tarifa de grupo publicada. Declarar un
      // precio que no existe es peor que no declarar ninguno. Y sin
      // `aggregateRating`: no hay reseñas reales de grupos.
    ],
  };

  return (
    <main id="main-content" className="min-h-screen bg-negro">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      {/* ── HERO ── */}
      <section className="px-6 pt-36 pb-16 text-center">
        <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-4 font-dm">
          ✦ Escuelas · Empresas · Agencias de viajes
        </p>
        <h1
          className="font-cormorant font-light text-crema mb-5 leading-tight"
          style={{ fontSize: "clamp(34px,5.5vw,62px)" }}
        >
          Viajes de grupo a la <em className="shimmer-gold italic">Huasteca Potosina</em>
        </h1>
        <p className="text-crema/70 font-dm text-sm leading-relaxed max-w-2xl mx-auto mb-4">
          Si vienes organizando el viaje de otros, no empieces por armar un itinerario tú. Dinos las fechas, cuántos
          son y de dónde salen, y te proponemos el recorrido completo: qué destino cada día, dónde duermen, qué comen y
          cómo se mueven. Con guías certificados NOM-09 y seguro de viajero incluidos.
        </p>
        <p className="text-crema/50 font-dm text-xs leading-relaxed max-w-2xl mx-auto mb-8">
          Los grupos se cotizan, no se reservan en línea: cada uno llega con un número de personas, un presupuesto y
          unos días distintos, y eso se resuelve platicándolo. <strong className="text-crema/70">Hay descuento según
          el número de personas.</strong>
        </p>
        <a
          href={waLink(WA_MESSAGES.grupos)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#25D366] text-negro font-dm font-bold text-xs tracking-[1.5px] uppercase px-8 py-4 hover:brightness-110 transition-all"
        >
          Pedir cotización por WhatsApp
        </a>
      </section>

      {/* ── CÓMO FUNCIONA ── */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-cormorant font-light text-crema text-3xl mb-8">Cómo funciona</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {COMO_FUNCIONA.map((p) => (
              <div key={p.n} className="border border-white/10 p-6 flex flex-col">
                <p className="font-cormorant text-dorado text-3xl leading-none mb-3">{p.n}</p>
                <h3 className="font-dm font-medium text-crema text-sm mb-2">{p.t}</h3>
                <p className="font-dm text-xs text-crema/60 leading-relaxed">{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── QUÉ PUEDE INCLUIR ── */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-cormorant font-light text-crema text-3xl mb-3">Qué puede incluir la propuesta</h2>
          <p className="font-dm text-sm text-crema/55 leading-relaxed max-w-2xl mb-8">
            No todos los grupos necesitan lo mismo. Estos son los bloques que podemos armar; en tu propuesta entran
            los que pidas.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="border border-white/10 p-7">
              <h3 className="font-cormorant font-light text-crema text-2xl mb-3">Recorridos</h3>
              <p className="font-dm text-sm text-crema/65 leading-relaxed">
                Los {nTours} recorridos del catálogo y los 41 destinos de la región: cascadas, sótanos, rafting, rappel,
                el jardín surrealista de Edward James y los pueblos de la sierra. Se eligen según la edad y la condición
                física del grupo.
              </p>
            </div>
            <div className="border border-white/10 p-7">
              <h3 className="font-cormorant font-light text-crema text-2xl mb-3">Hospedaje y alimentos</h3>
              <p className="font-dm text-sm text-crema/65 leading-relaxed">
                Hotel propio en Xilitla —el Paraíso Encantado— y hospedaje de la zona cuando el grupo no cabe en una
                sola propiedad. Los alimentos se pueden incluir completos o solo los desayunos.
              </p>
            </div>
            <div className="border border-white/10 p-7">
              <h3 className="font-cormorant font-light text-crema text-2xl mb-3">Transporte</h3>
              <p className="font-dm text-sm text-crema/65 leading-relaxed">
                Traslados entre los destinos durante todo el viaje, y transporte desde la Ciudad de México si salen de
                ahí. Desde otras ciudades lo revisamos caso por caso.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── DE QUÉ SE COMPONE UN VIAJE ── */}
      <section className="px-6 pb-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-cormorant font-light text-crema text-3xl mb-4">De qué se compone un viaje</h2>
          <p className="font-dm text-sm text-crema/65 leading-relaxed mb-4">
            Para hacerte una idea de cómo se arman los días, puedes ver nuestros{" "}
            <Link
              href="/paquetes"
              className="text-verde-vivo hover:text-dorado transition-colors underline underline-offset-2"
            >
              viajes de {diasMin} a {diasMax} días con hotel en Xilitla
            </Link>{" "}
            y el{" "}
            <Link
              href="/tours"
              className="text-verde-vivo hover:text-dorado transition-colors underline underline-offset-2"
            >
              catálogo de {nTours} recorridos guiados
            </Link>
            . Sirven como referencia del tipo de itinerario que armamos y del ritmo de cada día.
          </p>
          <p className="font-dm text-sm text-crema/45 leading-relaxed">
            Los precios que verás ahí se anuncian {COMO_SE_ANUNCIAN} y no son la tarifa de un grupo. El precio de
            tu grupo sale en la cotización y depende del número de personas, los días y lo que decidas incluir.
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="px-6 pb-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-cormorant font-light text-crema text-3xl mb-8">Preguntas frecuentes</h2>
          <div className="space-y-6">
            {FAQS_GRUPOS.map((f) => (
              <div key={f.q} className="border-b border-white/10 pb-6">
                <h3 className="font-dm font-medium text-crema text-sm mb-2">{f.q}</h3>
                <p className="font-dm text-sm text-crema/65 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-6 pb-28 text-center">
        <h2 className="font-cormorant font-light text-crema text-3xl mb-4">Cuéntanos de tu grupo</h2>
        <p className="text-crema/60 font-dm text-sm mb-8 max-w-xl mx-auto">
          Con las fechas, el número aproximado de personas y la ciudad de salida ya podemos empezar a armarte la
          propuesta. Contestamos personalmente, no con un formulario.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <a
            href={waLink(WA_MESSAGES.grupos)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#25D366] text-negro font-dm font-bold text-xs tracking-[1.5px] uppercase px-8 py-4 hover:brightness-110 transition-all"
          >
            Pedir cotización por WhatsApp
          </a>
          <Link
            href="/nosotros"
            className="inline-flex items-center gap-2 border border-dorado/60 text-dorado font-dm font-bold text-xs tracking-[1.5px] uppercase px-8 py-4 hover:bg-dorado hover:text-negro transition-all"
          >
            Conoce quiénes somos
          </Link>
        </div>
      </section>
    </main>
  );
}
