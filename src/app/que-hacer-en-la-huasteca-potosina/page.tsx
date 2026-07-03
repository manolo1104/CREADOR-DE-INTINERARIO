import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { waLink } from "@/lib/whatsapp";
import { SITE } from "@/lib/i18n/config";

const URL = `${SITE}/que-hacer-en-la-huasteca-potosina`;

export const metadata: Metadata = {
  title: "Qué Hacer en la Huasteca Potosina — 15 Imperdibles 2026",
  description:
    "Guía local de qué hacer en la Huasteca Potosina: Cascada de Tamul, Las Pozas de Xilitla, rafting, sótanos y cascadas turquesas. Con precios y cómo visitarlos.",
  keywords: [
    "qué hacer en la huasteca potosina",
    "lugares para visitar huasteca potosina",
    "atracciones huasteca potosina",
    "cascadas huasteca potosina",
    "huasteca potosina itinerario",
  ],
  alternates: { canonical: URL },
  openGraph: {
    title: "Qué Hacer en la Huasteca Potosina — 15 Imperdibles",
    description:
      "La guía de gente local: cascadas turquesas, jardín surrealista, rafting, sótanos gigantes y cultura huasteca.",
    url: URL,
    siteName: "Tours Huasteca Potosina",
    locale: "es_MX",
    type: "website",
    images: [{ url: `${SITE}/og-image.jpg`, width: 1200, height: 630, alt: "Qué hacer en la Huasteca Potosina" }],
  },
};

// Guía pilar: cada experiencia enlaza al tour o destino que ya existe en el sitio.
// Datos verificados con el contenido ya publicado (alturas, clases de rápidos, municipios).
type Experiencia = {
  titulo: string;
  descripcion: string;
  href: string;
  cta: string;
  imagen?: string;
};

const EXPERIENCIAS: Experiencia[] = [
  {
    titulo: "Navega en canoa hasta la Cascada de Tamul",
    descripcion:
      "La postal más famosa de la Huasteca: remas río arriba por el Cañón del Tampaón, entre paredes de roca que se cierran sobre el río, hasta quedar frente a la cascada más alta de San Luis Potosí (105 m). En temporada seca el agua es de un turquesa irreal.",
    href: "/tours/expedicion-tamul",
    cta: "Ver la Expedición Tamul",
    imagen: "/imagenes/cascada-de-tamul/hero.jpg",
  },
  {
    titulo: "Piérdete en Las Pozas, el jardín surrealista de Edward James",
    descripcion:
      "Un excéntrico millonario inglés construyó en plena selva de Xilitla un jardín de esculturas y escaleras que no llevan a ningún lado. Es una de las obras surrealistas más grandes del mundo y el lugar más fotografiado de la región.",
    href: "/tours/ruta-surrealista-edward-james",
    cta: "Ver la Ruta Surrealista",
  },
  {
    titulo: "Haz rafting en los rápidos del Río Tampaón",
    descripcion:
      "Rápidos clase III sobre agua turquesa, rodeado de selva. No necesitas experiencia: el equipo y los guías certificados van contigo en todo momento. La descarga de adrenalina más grande de la Huasteca.",
    href: "/tours/rafting-rio-tampaon",
    cta: "Ver el tour de rafting",
  },
  {
    titulo: "Asómate al abismo del Sótano de las Golondrinas",
    descripcion:
      "Un tiro vertical de 376 metros de caída libre (512 m de profundidad total) en Aquismón. Al amanecer, miles de vencejos y pericos salen volando en espiral — uno de los espectáculos naturales más impresionantes de México.",
    href: "/destinos/sotano-de-las-golondrinas",
    cta: "Conocer el Sótano de las Golondrinas",
  },
  {
    titulo: "Salta las cascadas de Micos",
    descripcion:
      "Una escalera natural de siete cascadas turquesas donde puedes saltar de poza en poza con chaleco, casco y guía. Hay saltos para todos los niveles — y quien no quiere saltar, disfruta nadando.",
    href: "/tours/paraiso-escalonado-minas-micos",
    cta: "Ver el tour Paraíso Escalonado",
  },
  {
    titulo: "Nada en el Puente de Dios de Tamasopo",
    descripcion:
      "Una poza turquesa dentro de una cueva a la que entras nadando por un túnel de luz. El agua cristalina, las raíces colgantes y los rayos de sol crean uno de los rincones más mágicos de la Huasteca.",
    href: "/tours/ruta-acuatica-puente-de-dios",
    cta: "Ver la Ruta Acuática",
  },
  {
    titulo: "Haz rappel frente a la Cascada de Tamul",
    descripcion:
      "Desciende en cuerda con la caída de agua más alta de México de frente. Una perspectiva de Tamul que muy poca gente conoce, con equipo certificado y guías especializados en cañonismo.",
    href: "/tours/rappel-tamul",
    cta: "Ver el tour de rappel",
  },
  {
    titulo: "Maneja un RZR todoterreno por la selva de Xilitla",
    descripcion:
      "Al volante de tu propio vehículo off-road cruzas ríos, barro y selva húmeda hasta cascadas escondidas, miradores de la sierra o el pueblo indígena de La Trinidad. 4 rutas distintas, desde 2 horas.",
    href: "/tours/rzr-xilitla",
    cta: "Ver rutas y precios del RZR",
  },
  {
    titulo: "Fotografía las cascadas gemelas de Minas Viejas",
    descripcion:
      "Dos cortinas de agua turquesa de unos 50 metros que caen juntas en una poza perfecta para nadar. De los rincones más fotogénicos de El Naranjo y mucho menos concurrido que Tamul.",
    href: "/destinos/cascadas-minas-viejas",
    cta: "Conocer Minas Viejas",
  },
  {
    titulo: "Contempla El Meco desde su mirador",
    descripcion:
      "Una cascada de 35 metros en un cañón de paredes escalonadas que parece diseñado a mano. El mirador te deja verla completa — y el tour te lleva también al Gran Salto del río El Naranjo.",
    href: "/tours/cascadas-del-meco",
    cta: "Ver el tour Cascadas del Meco",
  },
  {
    titulo: "Refréscate en el nacimiento de Huichihuayán",
    descripcion:
      "Un manantial de agua azul cristalina que brota directo de la montaña, rodeado de árboles enormes. Ideal para un chapuzón tranquilo, lejos de las multitudes.",
    href: "/destinos/nacimiento-huichihuayan",
    cta: "Conocer Huichihuayán",
  },
  {
    titulo: "Viaja al pasado en la zona arqueológica de Tamtoc",
    descripcion:
      "El sitio arqueológico más importante de la cultura huasteca, a orillas del río Tampaón: plazas, monolitos y una historia de más de 2,000 años que casi nadie conoce.",
    href: "/destinos/zona-arqueologica-tamtoc",
    cta: "Conocer Tamtoc",
  },
  {
    titulo: "Recorre Xilitla, Pueblo Mágico entre neblina y café",
    descripcion:
      "Callejones empinados, neblina que sube de la selva, café de altura y el misticismo que enamoró a Edward James. Xilitla es la base perfecta para explorar el sur de la Huasteca.",
    href: "/destinos/xilitla-pueblo-magico",
    cta: "Conocer Xilitla",
  },
  {
    titulo: "Presencia el rito de los Voladores de Tamaletón",
    descripcion:
      "El ritual prehispánico más antiguo de la Huasteca: cinco danzantes vuelan girando desde un mástil de 30 metros en honor al sol, en una ceremonia viva reconocida como Patrimonio Cultural Inmaterial. Cultura huasteca en su forma más pura.",
    href: "/destinos/voladores-tamaleton",
    cta: "Conocer a los Voladores",
  },
  {
    titulo: "Prueba la gastronomía huasteca: zacahuil, enchiladas y café de olla",
    descripcion:
      "El zacahuil es un tamal gigante horneado en hoja de plátano que se comparte entre toda la mesa; se acompaña de enchiladas huastecas, cecina y café de la sierra. En nuestros tours el desayuno regional va incluido.",
    href: "/info-practica",
    cta: "Ver dónde comer en la guía práctica",
  },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: "¿Cuántos días necesito para conocer la Huasteca Potosina?",
    a: "Con 3 días cubres lo esencial (Cascada de Tamul, Las Pozas de Xilitla y un día de cascadas turquesas). Con 4 o 5 días recorres con calma e incluyes rafting, sótanos o el Puente de Dios. Menos de 3 días se siente apresurado porque las distancias entre destinos son de 1 a 2 horas.",
  },
  {
    q: "¿Qué es lo más imperdible si solo tengo un día?",
    a: "La Expedición Tamul: en un solo día navegas en canoa hasta la Cascada de Tamul, te asomas al Sótano de las Huahuas y nadas en el cenote de la Cueva del Agua. Es el tour más completo de la región.",
  },
  {
    q: "¿La Huasteca Potosina es para ir con niños?",
    a: "Sí. Hay actividades de dificultad baja muy aptas para familias: las cascadas de Micos, Minas Viejas, la Ruta Surrealista de Edward James y los balnearios de nacimientos. Los niños pagan con descuento en nuestros tours (70 % de 6 a 10 años, 50 % menores de 6).",
  },
  {
    q: "¿Cuánto cuesta hacer estas actividades?",
    a: "Los tours guiados de un día todo incluido van de $1,300 a $1,850 MXN por persona, con transporte, desayuno, entradas y guía certificado incluidos. En nuestra página de precios está la lista completa.",
  },
  {
    q: "¿Puedo visitar la Huasteca por mi cuenta, sin tour?",
    a: "Sí se puede, sobre todo si viajas en auto. Considera que varios accesos (como el embarcadero de Tamul o las lanchas del Tampaón) se contratan en sitio, las carreteras de la sierra requieren manejar de día y en temporada alta los cupos se agotan. Un tour resuelve transporte, entradas, seguridad y logística por un precio cerrado.",
  },
];

export default function QueHacerPage() {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: SITE },
          { "@type": "ListItem", position: 2, name: "Qué hacer en la Huasteca Potosina", item: URL },
        ],
      },
      {
        "@type": "ItemList",
        name: "Qué hacer en la Huasteca Potosina",
        numberOfItems: EXPERIENCIAS.length,
        itemListElement: EXPERIENCIAS.map((e, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: e.titulo,
          url: `${SITE}${e.href}`,
        })),
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

  return (
    <main id="main-content" className="min-h-screen bg-negro">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      {/* ── HERO ── */}
      <section className="relative px-6 pt-36 pb-20 overflow-hidden">
        <Image
          src="/imagenes/cascada-de-tamul/hero.jpg"
          alt="Cascada de Tamul, la caída de agua más alta de San Luis Potosí"
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-negro/75 via-negro/60 to-negro" />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-4 font-dm">
            ✦ Guía escrita por gente local
          </p>
          <h1 className="font-cormorant font-light text-crema mb-5 leading-tight" style={{ fontSize: "clamp(34px,5.5vw,60px)" }}>
            Qué hacer en la <em className="shimmer-gold italic">Huasteca Potosina</em>
          </h1>
          <p className="text-crema/75 font-dm text-sm leading-relaxed max-w-2xl mx-auto">
            15 experiencias imperdibles según quienes nacimos aquí: cascadas turquesas, un jardín surrealista en medio
            de la selva, rafting, abismos de cientos de metros y la cultura huasteca viva. Todas con enlace directo para
            visitarlas.
          </p>
        </div>
      </section>

      {/* ── LISTA DE EXPERIENCIAS ── */}
      <section className="px-6 pb-20">
        <div className="max-w-3xl mx-auto space-y-10">
          {EXPERIENCIAS.map((e, i) => (
            <article key={e.titulo} className="border-b border-white/10 pb-10">
              <h2 className="font-cormorant font-light text-crema text-2xl md:text-3xl mb-3 leading-snug">
                <span className="text-dorado">{i + 1}.</span> {e.titulo}
              </h2>
              <p className="font-dm text-sm text-crema/70 leading-relaxed mb-4">{e.descripcion}</p>
              <Link
                href={e.href}
                className="inline-flex items-center gap-1.5 text-verde-vivo hover:text-dorado transition-colors font-dm text-xs tracking-[1px] uppercase"
              >
                {e.cta} →
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* ── CUÁNTOS DÍAS ── */}
      <section className="px-6 pb-20">
        <div className="max-w-3xl mx-auto border border-verde-selva/30 bg-verde-profundo/30 p-8">
          <h2 className="font-cormorant font-light text-crema text-3xl mb-4">¿Cómo organizar todo esto?</h2>
          <p className="font-dm text-sm text-crema/70 leading-relaxed mb-6">
            Las distancias entre destinos son de 1 a 2 horas por carreteras de sierra, así que la clave es agrupar por
            zona: Tamul y los sótanos un día, las cascadas turquesas otro, y Xilitla con Las Pozas otro. Nuestros
            paquetes de 3 a 5 días ya vienen armados así, con hotel y transporte resueltos — o escríbenos y armamos un
            plan a tu medida.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/paquetes"
              className="inline-flex items-center gap-2 border border-dorado/60 text-dorado font-dm font-bold text-xs tracking-[1.5px] uppercase px-6 py-3.5 hover:bg-dorado hover:text-negro transition-all"
            >
              Ver paquetes de 3 a 5 días
            </Link>
            <Link
              href="/precios"
              className="inline-flex items-center gap-2 border border-white/20 text-crema/80 font-dm font-bold text-xs tracking-[1.5px] uppercase px-6 py-3.5 hover:border-crema transition-all"
            >
              Ver todos los precios
            </Link>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="px-6 pb-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-cormorant font-light text-crema text-3xl mb-8">Preguntas frecuentes</h2>
          <div className="space-y-6">
            {FAQS.map((f) => (
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
        <h2 className="font-cormorant font-light text-crema text-3xl mb-4">¿Te ayudamos a armar tu viaje?</h2>
        <p className="text-crema/60 font-dm text-sm mb-8 max-w-xl mx-auto">
          Dinos tus fechas y cuántos vienen, y te proponemos el plan ideal — somos guías locales certificados y salimos
          todos los días del año.
        </p>
        <a
          href={waLink("Hola, leí la guía de qué hacer en la Huasteca y quiero armar mi viaje. ¿Me ayudan?")}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#25D366] text-negro font-dm font-bold text-xs tracking-[1.5px] uppercase px-8 py-4 hover:brightness-110 transition-all"
        >
          Planear por WhatsApp
        </a>
      </section>
    </main>
  );
}
