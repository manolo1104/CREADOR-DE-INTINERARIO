import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CONTACTO } from "@/lib/contacto";
import { TOURS_DB } from "@/lib/tours";
import { DESTINOS_DB } from "@/lib/destinos";
import { SITE } from "@/lib/i18n/config";
import { buildOrganizationNode, ORG_REF } from "@/lib/jsonld";

import { GRUPO_MAX } from "@/lib/tours";
/**
 * Sala de prensa, SOLO en inglés y sin equivalente en español.
 *
 * No es una página de marketing: es la herramienta del pitch. Cuando se le
 * escribe a un editor estadounidense, este enlace es lo que le ahorra el
 * trabajo de investigar — ángulos ya redactados, datos verificables y las
 * condiciones de uso de las fotos en una sola pantalla.
 *
 * La cuña es Edward James: un poeta inglés, mecenas de Dalí y Magritte, se
 * metió en la selva mexicana a construir un jardín surrealista de concreto.
 * Esa historia la publica una revista de arquitectura o diseño SIN que la
 * operadora exista; el papel de la empresa es ser quien vive ahí y puede dar
 * acceso, fotos y contexto.
 *
 * ⚠️ Todo dato de esta página tiene que ser verificable. Un periodista que
 * encuentra una cifra inflada no vuelve a abrir un correo de este remitente.
 */

const TITULO = "Press & Media — Tours Huasteca Potosina";
const DESCRIPCION =
  "Story angles, verified facts and photography from Xilitla and the Huasteca Potosina — including Las Pozas, Edward James's surrealist garden. For journalists and editors.";

export const metadata: Metadata = {
  title: TITULO,
  description: DESCRIPCION,
  alternates: { canonical: `${SITE}/en/press` },
  openGraph: {
    title: TITULO,
    description: DESCRIPCION,
    url: `${SITE}/en/press`,
    locale: "en_US",
    images: [{ url: `${SITE}/imagenes/las-pozas-jardin-surrealista/arcos.jpg` }],
  },
};

/** Los tres ángulos que se le ofrecen a un editor, ya pensados. */
const ANGULOS = [
  {
    kicker: "Architecture & design",
    titulo: "The English poet who poured a surrealist castle into the Mexican jungle",
    texto:
      "Edward James — British poet and the patron who bankrolled Salvador Dalí and René Magritte — spent decades building Las Pozas in the mountains above Xilitla: concrete colonnades, staircases that climb into the canopy and stop, stone flowers four meters across. He never lived in the structures. The site was an orchid plantation before it was a sculpture garden. It is open to the public today, and almost nothing has been written about it in English.",
  },
  {
    kicker: "Adventure travel",
    titulo: "Mexico's waterfall country, four hours past the last tour bus",
    texto:
      "A 344-foot waterfall, a river the color of glass, caves you swim into. The Huasteca Potosina has been a domestic Mexican destination for generations and is almost unknown to American travelers — the nearest airport, Tampico, is a short flight from Texas and two and a half hours from Xilitla by road.",
  },
  {
    kicker: "Responsible tourism",
    titulo: "What it looks like when the guides are from the town",
    texto:
      "Access to the region's best sites runs through ejidos — communal landholdings whose members decide who enters. Our guides were born here and grew up with the families who hold that access. It is a working example of tourism that is negotiated locally rather than imposed, and of the friction that comes with it.",
  },
];

/** Fotos que se pueden ceder. Ver la nota de derechos más abajo. */
const FOTOS = [
  { src: "/imagenes/las-pozas-jardin-surrealista/arcos.jpg", alt: "Concrete arches at Las Pozas, Edward James's surrealist garden in Xilitla" },
  { src: "/imagenes/las-pozas-jardin-surrealista/gallery-2.jpg", alt: "Surrealist concrete structures surrounded by jungle at Las Pozas" },
  { src: "/imagenes/tours/edward-james/gallery-1.jpg", alt: "A staircase at Las Pozas climbing into the tree canopy" },
  { src: "/imagenes/tours/ruta-surrealista-hero.webp", alt: "The surrealist garden of Las Pozas seen through tropical vegetation" },
];

const URL_PRENSA = `${SITE}/en/press`;

/**
 * La sala de prensa no publicaba dato estructurado alguno. Aquí importa más que
 * en ninguna otra página: el lector objetivo es un editor, y quien encuentra
 * esta página primero suele ser un asistente de IA al que le preguntan "¿quién
 * tiene fotos de Las Pozas con derechos claros?".
 *
 * Los `ImageObject` declaran licencia porque la página YA la declara en texto
 * ("free for editorial use, credit with a link, not for advertising"). El
 * schema solo repite, en un formato que la máquina lee, lo que el humano ve —
 * y Google muestra esos metadatos de licencia en los resultados de imágenes.
 */
const pressSchema = {
  "@context": "https://schema.org",
  "@graph": [
    buildOrganizationNode("en"),
    {
      "@type": "WebPage",
      "@id": URL_PRENSA,
      url: URL_PRENSA,
      name: TITULO,
      description: DESCRIPCION,
      inLanguage: "en",
      about: ORG_REF,
      publisher: ORG_REF,
      // El contacto de prensa: es lo que un editor necesita extraer de aquí.
      mainEntity: {
        "@type": "ContactPoint",
        contactType: "press",
        email: CONTACTO.email,
        telephone: CONTACTO.telefonoE164,
        availableLanguage: ["en", "es"],
        areaServed: "US",
      },
    },
    ...FOTOS.map((f) => ({
      "@type": "ImageObject",
      contentUrl: `${SITE}${f.src}`,
      caption: f.alt,
      creditText: CONTACTO.nombreComercial,
      copyrightNotice: `© ${CONTACTO.nombreComercial}`,
      creator: ORG_REF,
      // Las condiciones están escritas en la propia página, en inglés llano.
      license: URL_PRENSA,
      acquireLicensePage: URL_PRENSA,
    })),
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/en` },
        { "@type": "ListItem", position: 2, name: "Press & media", item: URL_PRENSA },
      ],
    },
  ],
};

export default function PressPage() {
  const nTours = TOURS_DB.length;
  const nDestinos = DESTINOS_DB.length;

  return (
    <main className="bg-crema">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pressSchema) }} />
      {/* ── Encabezado ── */}
      <section className="bg-verde-profundo px-6 py-20 md:py-24">
        <div className="max-w-4xl mx-auto">
          <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo font-dm mb-4">
            Press &amp; media
          </p>
          <h1 className="font-cormorant font-light text-crema leading-[1.05] mb-6" style={{ fontSize: "clamp(38px,7vw,68px)" }}>
            Everything you need to write about the Huasteca Potosina
          </h1>
          <p className="font-dm text-crema/65 text-base leading-relaxed max-w-2xl">
            We are a family of guides based in Xilitla, San Luis Potosí. We have
            worked this region since 2010. If you are reporting on it — the
            surrealist garden, the waterfalls, the communities that control
            access to both — this page is here to save you the research.
          </p>
          <p className="font-dm text-crema/45 text-sm mt-6">
            Press contact:{" "}
            <a href={`mailto:${CONTACTO.email}`} className="text-dorado hover:text-lima underline underline-offset-4 transition-colors">
              {CONTACTO.email}
            </a>
            {" · "}
            <a href={`tel:${CONTACTO.telefonoE164}`} className="text-dorado hover:text-lima underline underline-offset-4 transition-colors">
              {CONTACTO.telefonoDisplay}
            </a>
          </p>
        </div>
      </section>

      {/* ── Ángulos ── */}
      <section className="px-6 py-20 md:py-24 border-b border-negro/8">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-cormorant font-light text-verde-profundo mb-3" style={{ fontSize: "clamp(30px,4.5vw,46px)" }}>
            Three stories we can help you tell
          </h2>
          <p className="font-dm text-negro/55 text-sm leading-relaxed mb-12 max-w-2xl">
            Not press releases. These are the angles we think are genuinely
            worth a reader&apos;s time, and on all three we can arrange access,
            interviews and photography.
          </p>

          <div className="flex flex-col gap-10">
            {ANGULOS.map((a) => (
              <article key={a.titulo} className="border-l-2 border-dorado/50 pl-6 md:pl-8">
                <p className="text-[10px] tracking-[3px] uppercase text-verde-selva font-dm mb-2">{a.kicker}</p>
                <h3 className="font-cormorant font-light text-verde-profundo text-2xl md:text-3xl leading-tight mb-3">
                  {a.titulo}
                </h3>
                <p className="font-dm text-negro/65 text-sm leading-relaxed">{a.texto}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Datos ── */}
      <section className="bg-white px-6 py-20 md:py-24 border-b border-negro/8">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-cormorant font-light text-verde-profundo mb-3" style={{ fontSize: "clamp(30px,4.5vw,46px)" }}>
            Fast facts
          </h2>
          <p className="font-dm text-negro/55 text-sm leading-relaxed mb-10 max-w-2xl">
            Every number here is one we can document. If you need a source for
            any of them, ask and we will send it.
          </p>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-5">
            {[
              ["Where", "Xilitla and Ciudad Valles, San Luis Potosí, Mexico"],
              ["Nearest airport", "Tampico (TAM) — about 2.5 hours by road to Xilitla"],
              ["From Mexico City", "430 km (267 miles), about 6.5 to 7 hours by road"],
              ["Tallest waterfall", "Tamul — 344 feet (105 m), the tallest in San Luis Potosí"],
              ["Las Pozas", "Open Wednesday–Monday, 09:00–18:00. Closed Tuesdays. Entry $180 MXN"],
              ["Company founded", "Guiding since 2010; incorporated in 2019"],
              ["Guides", "NOM-09 SECTUR certified, born in the region"],
              ["Group size", `${GRUPO_MAX} people maximum — larger groups by arrangement with the team`],
              ["Catalogue", `${nTours} guided day tours across ${nDestinos} documented sites`],
              ["Recognition", "Arival Best Tour Operator, North America, 2023"],
              ["Reviews", "4.9 average across 492 Google reviews · 10,000+ travelers"],
            ].map(([k, v]) => (
              <div key={k} className="border-b border-negro/8 pb-4">
                <dt className="font-dm text-[10px] tracking-[2px] uppercase text-verde-selva mb-1.5">{k}</dt>
                <dd className="font-dm text-negro/70 text-sm leading-snug">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Imágenes ── */}
      <section className="px-6 py-20 md:py-24 border-b border-negro/8">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-cormorant font-light text-verde-profundo mb-3" style={{ fontSize: "clamp(30px,4.5vw,46px)" }}>
            Photography
          </h2>
          <p className="font-dm text-negro/65 text-sm leading-relaxed mb-8 max-w-2xl">
            Las Pozas is difficult to illustrate: very few images of it circulate
            with clear usage rights. We hold a library of the garden, the
            waterfalls and the region, and we will license it to you at no cost
            for editorial use.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
            {FOTOS.map((f) => (
              <div key={f.src} className="relative aspect-[4/3] overflow-hidden bg-arena/40">
                <Image src={f.src} alt={f.alt} fill sizes="(max-width:768px) 50vw, 25vw" className="object-cover" />
              </div>
            ))}
          </div>

          <div className="bg-white border border-negro/10 p-6 md:p-8">
            <h3 className="font-dm text-[11px] tracking-[2.5px] uppercase text-verde-selva mb-4">Terms, in plain language</h3>
            <ul className="flex flex-col gap-3 font-dm text-sm text-negro/65 leading-relaxed">
              <li><strong className="text-negro/85">Free for editorial use.</strong> Print or online, in any outlet.</li>
              <li><strong className="text-negro/85">Credit &ldquo;Tours Huasteca Potosina&rdquo; with a link</strong> to www.huasteca-potosina.com. That is the whole fee.</li>
              <li><strong className="text-negro/85">Not for advertising</strong> or resale without written permission.</li>
              <li><strong className="text-negro/85">Higher resolution on request.</strong> What is on this page is sized for the web; write to us and we will send originals.</li>
              <li><strong className="text-negro/85">Shooting on site?</strong> We can arrange access, a local guide and transport. Tell us your dates.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── Cierre ── */}
      <section className="bg-verde-profundo px-6 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-cormorant font-light text-crema mb-5" style={{ fontSize: "clamp(28px,4vw,44px)" }}>
            Working on something? Write to us.
          </h2>
          <p className="font-dm text-crema/60 text-sm leading-relaxed max-w-xl mx-auto mb-9">
            We answer press email the same day. We can put you on the phone with
            a guide who was born here, arrange access to sites that need
            community permission, and fact-check a draft before you file it.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <a
              href={`mailto:${CONTACTO.email}?subject=Press%20enquiry`}
              className="inline-block bg-dorado text-negro px-10 py-4 text-sm tracking-[2.5px] uppercase font-dm font-medium hover:bg-lima transition-colors"
            >
              Email the press desk
            </a>
            <Link
              href="/en/nosotros"
              className="inline-block border border-crema/25 text-crema/70 px-9 py-4 text-[11px] tracking-[2px] uppercase font-dm hover:border-crema/50 hover:text-crema transition-all"
            >
              About the company
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
