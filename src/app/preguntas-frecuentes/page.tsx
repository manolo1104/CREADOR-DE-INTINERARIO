import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/lib/i18n/config";
import { TOURS_DB } from "@/lib/tours";
import { PAQUETES_DB } from "@/lib/paquetes";
import { formatMXN } from "@/lib/tourBooking";

const URL = `${SITE}/preguntas-frecuentes`;

// Los precios se leen del catálogo (TOURS_DB), nunca se escriben a mano: esta
// página llegó a publicar $1,300 / $1,450 / $1,600 mientras el catálogo y
// /precios decían $1,400 / $1,550 / $1,700. Un cliente que comparaba dos
// páginas del mismo sitio encontraba la contradicción en un minuto.
const precioDe = (id: string) => formatMXN(TOURS_DB.find((t) => t.id === id)?.precio ?? 0);

const preciosPorPersona = TOURS_DB.filter((t) => t.precioUnidad !== "vehiculo").map((t) => t.precio);
const PRECIO_MIN = formatMXN(Math.min(...preciosPorPersona));
const PRECIO_MAX = formatMXN(Math.max(...preciosPorPersona));
// Del catálogo, no a mano: el rango de paquetes se quedaba viejo cada vez que
// cambiaba un precio.
const preciosPaquete = PAQUETES_DB.map((p) => p.precio);
const PAQ_MIN = formatMXN(Math.min(...preciosPaquete));
const PAQ_MAX = formatMXN(Math.max(...preciosPaquete));
const PAQ_DIAS_MIN = Math.min(...PAQUETES_DB.map((p) => p.dias));
const PAQ_DIAS_MAX = Math.max(...PAQUETES_DB.map((p) => p.dias));

export const metadata: Metadata = {
  title: "Preguntas Frecuentes — Tours Huasteca Potosina 2026",
  description:
    "Todo lo que necesitas saber antes de visitar la Huasteca Potosina: cuánto cuesta, qué incluyen los tours, mejor época, cómo llegar desde CDMX, Monterrey o Guadalajara, seguridad, qué llevar y más.",
  keywords: [
    "preguntas frecuentes huasteca potosina",
    "cuánto cuesta huasteca potosina",
    "mejor época huasteca potosina",
    "cómo llegar a la huasteca potosina",
    "qué llevar a las cascadas",
    "huasteca potosina con familia",
  ],
  alternates: { canonical: URL },
  openGraph: {
    title: "Preguntas Frecuentes — Tours Huasteca Potosina",
    description:
      "Precios, qué incluyen los tours, mejor época, cómo llegar, seguridad y consejos para visitar la Huasteca Potosina.",
    url: URL,
    siteName: "Tours Huasteca Potosina",
    locale: "es_MX",
    type: "website",
    images: [{ url: `${SITE}/og-image.jpg`, width: 1200, height: 800, alt: "Preguntas frecuentes sobre la Huasteca Potosina" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Preguntas Frecuentes — Tours Huasteca Potosina",
    description: "Precios, mejor época, cómo llegar, seguridad y consejos para visitar la Huasteca Potosina.",
    images: [`${SITE}/og-image.jpg`],
  },
};

// ── FAQ: el texto de las respuestas es plano para poder reutilizarlo tal cual
//    en el JSON-LD (FAQPage) y en el render visible. Datos verificables, sin inventar.
const FAQS: { q: string; a: string }[] = [
  {
    q: "¿Cuánto cuesta un tour en la Huasteca Potosina?",
    a: `Nuestros tours guiados de un día cuestan entre ${PRECIO_MIN} y ${PRECIO_MAX} MXN por persona, según el recorrido, y son todo incluido. Los más populares: Ruta Surrealista (Edward James) ${precioDe("tour-edward-james")}, Expedición Tamul ${precioDe("tour-tamul")}, Cascadas del Meco ${precioDe("tour-meco")}. El Recorrido en RZR por Xilitla se cobra por vehículo, desde ${precioDe("tour-rzr-xilitla")} MXN por unidad. Si prefieres varios días con hospedaje, los paquetes van de ${PAQ_MIN} (${PAQ_DIAS_MIN} días) a ${PAQ_MAX} MXN (${PAQ_DIAS_MAX} días) por pareja.`,
  },
  {
    q: "¿Qué incluyen los tours?",
    a: "Según el tour: traslado redondo desde tu hospedaje en Xilitla o Ciudad Valles, desayuno con platillos típicos de la región, entradas a todos los parques y atracciones, guía certificado NOM-09 SECTUR, equipo de seguridad, fotografías y video del recorrido, y botiquín de primeros auxilios. El precio que ves es el precio final por persona, sin sorpresas.",
  },
  {
    q: "¿Cómo llegar a la Huasteca Potosina desde CDMX, Monterrey o Guadalajara?",
    a: "En auto: aproximadamente 9–10 horas desde Ciudad de México, 6 horas desde Monterrey y 9 horas desde Guadalajara, casi siempre con Ciudad Valles como destino. En autobús hay salidas nocturnas a Ciudad Valles desde la Terminal del Norte de CDMX (~9–10 h). En avión, el aeropuerto de Tampico es el más práctico (~2.5 h en auto a Ciudad Valles); también puedes volar a la ciudad de San Luis Potosí. Recomendamos manejar de día por la sierra.",
  },
  {
    q: "¿Cuál es la mejor época para visitar la Huasteca Potosina?",
    a: "Para ver el agua en su tono turquesa más intenso, la mejor temporada es la seca: aproximadamente de noviembre a junio, con su punto más claro entre marzo y mayo. Durante la temporada de lluvias (julio a octubre) el caudal de las cascadas aumenta y es muy fotogénico, pero el agua puede tornarse marrón y algunas actividades acuáticas se suspenden por seguridad. Salimos todos los días del año.",
  },
  {
    q: "¿Es seguro viajar a la Huasteca Potosina?",
    a: "Sí. Es uno de los destinos de naturaleza más visitados del centro-norte de México y recibe viajeros nacionales e internacionales todo el año. Para mayor tranquilidad recomendamos recorrer con guías certificados NOM-09, manejar de día por la sierra y seguir siempre las indicaciones de seguridad en ríos y cascadas. Nuestros grupos son pequeños (máximo 6 a 12 personas) y cada tour incluye equipo de seguridad y botiquín.",
  },
  {
    q: "¿Qué llevar a las cascadas de la Huasteca Potosina?",
    a: "Traje de baño, ropa ligera que se pueda mojar y ensuciar, calzado cerrado para agua o sandalias con sujeción, una muda de cambio, toalla, bloqueador biodegradable (para no dañar los ríos), gorra, repelente, efectivo (muchos sitios no tienen cajero) y una funda impermeable para el celular. Nosotros ponemos el equipo de seguridad y el transporte.",
  },
  {
    q: "¿Hay tours para niños o familias?",
    a: "Sí. Varios recorridos son de dificultad baja y muy aptos para ir en familia, como las Cascadas del Meco, el Paraíso Escalonado (Minas Viejas y Micos) y la Ruta Surrealista de Edward James. El precio es por persona con descuento para niños: alrededor del 70 % del precio adulto para edades de 6 a 10 años y 50 % para menores de 6 años.",
  },
  {
    q: "¿Se puede conocer la Huasteca Potosina en 3 días?",
    a: "Sí. Con 3 días bien organizados se cubre lo esencial: la Cascada de Tamul, Las Pozas de Edward James en Xilitla y un día de cascadas turquesa (Micos, Minas Viejas o el Puente de Dios en Tamasopo). Nuestro Paquete Aventura de 3 días / 2 noches está diseñado justo para eso. Con 4 o 5 días se recorre con más calma y se incluyen más destinos.",
  },
  {
    q: "¿Qué es el Sótano de las Golondrinas?",
    a: "Es un abismo vertical natural ubicado en Aquismón, San Luis Potosí, con aproximadamente 376 metros de caída libre y hasta 512 metros de profundidad total. Al amanecer miles de aves (vencejos y pericos) salen en espiral, y al atardecer regresan: un espectáculo natural único. Es uno de los tiros verticales más impresionantes del mundo.",
  },
  {
    q: "¿Qué es Las Pozas de Edward James (Xilitla)?",
    a: "Es un jardín escultórico surrealista en Xilitla, Pueblo Mágico, creado por el poeta y mecenas británico Edward James a mediados del siglo XX. Entre la selva y las cascadas hay decenas de estructuras de concreto con formas imposibles, escaleras que no llevan a ningún lado y columnas inacabadas. Es uno de los sitios más enigmáticos y fotografiados de México.",
  },
  // Las preguntas de dinero no estaban en esta página: no aparecía ni una sola
  // vez "cancelación", "reembolso", "pago", "tarjeta" o "factura". Son
  // exactamente las que frenan una compra a meses de distancia.
  {
    q: "¿Cómo reservo y cuánto tengo que pagar por adelantado?",
    a: "Reservas en línea desde la página del tour: eliges fecha y número de personas, y apartas con un anticipo del 30 %. El saldo lo liquidas el día del tour, en efectivo o con tarjeta. También puedes pagar el 100 % al reservar si prefieres llegar sin pendientes.",
  },
  {
    q: "¿Puedo pagar con tarjeta? ¿Es seguro?",
    a: "Sí. Los pagos con tarjeta se procesan con Stripe sobre conexión cifrada, la misma plataforma que usan miles de comercios en México. Nosotros nunca vemos ni guardamos los datos de tu tarjeta. También aceptamos transferencia; escríbenos por WhatsApp si la prefieres.",
  },
  {
    q: "¿Cuál es la política de cancelación?",
    a: "Cancelación gratuita con 48 horas o más de anticipación, con reembolso del 100 % incluido el anticipo. Entre 48 y 24 horas antes se retiene el 50 %. Con menos de 24 horas no hay reembolso, pero puedes reagendar una vez sin costo. Si cancelamos nosotros por clima, seguridad o cierre del paraje, eliges entre reembolso completo o reagendar sin costo.",
  },
  {
    q: "¿Qué pasa si llueve el día de mi tour?",
    a: "Operamos con lluvia ligera: la Huasteca es selva y las cascadas lucen más espectaculares con agua. Si hay tormenta eléctrica, alerta meteorológica o el río no está en condiciones seguras, cancelamos nosotros y eliges entre reembolso del 100 % o reagendar sin costo. Nunca sacamos un grupo con el río crecido.",
  },
  {
    q: "¿Hacen tours privados o para grupos grandes?",
    a: "Sí. Los tours regulares operan en grupos pequeños de 6 a 12 personas. Para salidas privadas, grupos de más de 12, empresas o escuelas, escríbenos por WhatsApp con tus fechas y el número de personas y te armamos una cotización a la medida.",
  },
  {
    q: "¿Los guías hablan inglés?",
    a: "Nuestros guías tienen inglés básico–intermedio, suficiente para explicar el recorrido y las indicaciones de seguridad. Si necesitas un guía completamente bilingüe, consúltanos con anticipación al reservar.",
  },
];

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Inicio", item: SITE },
    { "@type": "ListItem", position: 2, name: "Preguntas frecuentes", item: URL },
  ],
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  inLanguage: "es-MX",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function PreguntasFrecuentesPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <main id="main-content" className="min-h-screen bg-negro pt-28 pb-24">
        <div className="max-w-3xl mx-auto px-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-[9px] tracking-[3px] uppercase font-dm text-crema/30 mb-8">
            <Link href="/" className="hover:text-crema/60 transition-colors">Inicio</Link>
            <span>/</span>
            <span className="text-verde-vivo/70">Preguntas frecuentes</span>
          </nav>

          <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo font-dm mb-4">
            Antes de tu viaje
          </p>
          <h1 className="font-cormorant font-light text-crema leading-tight mb-6" style={{ fontSize: "clamp(34px,5vw,56px)" }}>
            Preguntas frecuentes sobre la Huasteca Potosina
          </h1>
          <p className="text-crema/60 font-dm text-base leading-relaxed mb-14 max-w-2xl">
            Precios, qué incluyen los tours, la mejor época, cómo llegar, seguridad y consejos
            prácticos. Si te queda alguna duda, escríbenos por WhatsApp y te respondemos en menos
            de una hora, todos los días.
          </p>

          {/* FAQ list */}
          <div className="divide-y divide-white/8 border-t border-white/8">
            {FAQS.map((f) => (
              <section key={f.q} className="py-8">
                <h2 className="font-cormorant text-crema text-xl md:text-2xl leading-snug mb-3">
                  {f.q}
                </h2>
                <p className="text-crema/65 font-dm text-sm md:text-[15px] leading-relaxed">
                  {f.a}
                </p>
              </section>
            ))}
          </div>

          {/* CTA + links internos estratégicos */}
          <div className="mt-16 border border-verde-vivo/20 bg-verde-selva/10 p-8 text-center">
            <h2 className="font-cormorant text-crema text-2xl mb-3">¿List@ para vivirlo?</h2>
            <p className="text-crema/55 font-dm text-sm mb-6 max-w-md mx-auto">
              Explora nuestros recorridos con todo incluido o deja que la IA te recomiende el ideal
              según los días que tengas y tu grupo.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/tours" className="bg-verde-selva hover:bg-verde-vivo text-crema px-6 py-3 text-[10px] tracking-[2px] uppercase font-dm transition-colors">
                Ver todos los tours
              </Link>
              <Link href="/paquetes" className="border border-dorado/40 hover:bg-dorado/10 text-dorado px-6 py-3 text-[10px] tracking-[2px] uppercase font-dm transition-colors">
                Paquetes con hospedaje
              </Link>
              <Link href="/recomendar" className="border border-white/15 hover:border-crema/40 text-crema/70 hover:text-crema px-6 py-3 text-[10px] tracking-[2px] uppercase font-dm transition-colors">
                Recomendador IA
              </Link>
            </div>
            <p className="mt-6 text-[11px] text-crema/40 font-dm">
              ¿Otra pregunta? WhatsApp{" "}
              <a href="https://wa.me/524891251458" target="_blank" rel="noopener noreferrer" className="text-verde-vivo hover:text-lima underline underline-offset-2">
                +52 489 125 1458
              </a>
            </p>
          </div>

          {/* Links a guías del blog (link strategy) */}
          <p className="mt-10 text-center text-[11px] text-crema/35 font-dm">
            ¿Quieres más detalle? Lee nuestras{" "}
            <Link href="/blog" className="text-verde-vivo/70 hover:text-lima underline underline-offset-2">
              guías de viaje de la Huasteca Potosina
            </Link>
            .
          </p>
        </div>
      </main>
    </>
  );
}
