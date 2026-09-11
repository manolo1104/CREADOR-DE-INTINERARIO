import type { Metadata } from "next";
import Link from "next/link";
import { TOURS_DB, tourDurTexto } from "@/lib/tours";
import { PAQUETES_DB } from "@/lib/paquetes";
import { DESTINOS_DB } from "@/lib/destinos";
import { waLink } from "@/lib/whatsapp";
import { SITE } from "@/lib/i18n/config";
import { buildBreadcrumbNode } from "@/lib/jsonld";

/**
 * Landing comercial de Xilitla. Existía la de Ciudad Valles —donde operan los
 * competidores— y no la de Xilitla, que es donde está la empresa y el hotel.
 *
 * 🔴 ATACA SOLO EL RACIMO COMERCIAL, medido el 11 sep 2026 sobre las 1.000
 * consultas del export: 13 consultas, 425 impresiones y 15 clics, todas
 * enterradas entre el puesto 12 y el 22.
 *   paquetes a xilitla 67 · xilitla paquetes 54 · paquetes a xilitla san luis
 *   potosi 44 · xilitla san luis potosi paquetes 44 · viaje a xilitla todo
 *   incluido 32 · xilitla tours 31 · hoteles en xilitla 20 · xilitla hoteles 16
 * Solo el racimo de «paquetes» son 209 impresiones con UN clic.
 *
 * 🔴 NO compite con lo informacional, que ya está bien cubierto y rankeando
 * entre el puesto 4 y el 9: «xilitla como llegar» (493 impr), «las pozas de
 * xilitla» (171), el clima, la seguridad, la historia. Hay 39 páginas del sitio
 * rankeando por Xilitla. Esta las ENLAZA en vez de repetirlas: si respondiera
 * «cómo llegar» le quitaría el puesto 7,15 al artículo que ya lo gana.
 *
 * El molde es `/tours-en-ciudad-valles`, que está probado: 1.111 impresiones y
 * 2,25 % de CTR en el puesto 9,37, más del doble de la media del sitio.
 *
 * Solo en español, igual que su gemela de Ciudad Valles.
 */

const URL = `${SITE}/tours-en-xilitla`;

export const metadata: Metadata = {
  title: "Tours y Paquetes en Xilitla, San Luis Potosí 2026",
  description:
    "Somos de Xilitla: tours guiados y paquetes con hotel en el Pueblo Mágico. Las Pozas, La Trinidad y la Huasteca a la puerta. Todo incluido, salidas diarias.",
  keywords: [
    "paquetes a xilitla",
    "xilitla paquetes",
    "tours xilitla",
    "viaje a xilitla todo incluido",
    "hoteles en xilitla",
    "paquetes a xilitla san luis potosi",
    "tours huasteca potosina desde xilitla",
  ],
  alternates: { canonical: URL },
  openGraph: {
    title: "Tours y paquetes en Xilitla, San Luis Potosí",
    description:
      "Operamos desde Xilitla, el Pueblo Mágico donde está Las Pozas de Edward James. Tours y paquetes con hotel propio.",
    url: URL,
    siteName: "Tours Huasteca Potosina",
    locale: "es_MX",
    type: "website",
    images: [
      {
        url: `${SITE}/imagenes/las-pozas-jardin-surrealista/hero.jpg`,
        width: 1600,
        height: 960,
        alt: "Arcos y escaleras de concreto del jardín surrealista de Las Pozas, entre la selva de Xilitla",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tours y paquetes en Xilitla, San Luis Potosí",
    description: "Operamos desde Xilitla: tours guiados y paquetes con hotel propio en el Pueblo Mágico.",
    images: [`${SITE}/imagenes/las-pozas-jardin-surrealista/hero.jpg`],
  },
};

/**
 * Responden al racimo comercial. Lo informacional se enlaza, no se contesta
 * aquí: esos artículos ya están entre el puesto 4 y el 9.
 */
const FAQS_XI: { q: string; a: string }[] = [
  {
    q: "¿Qué incluye un paquete a Xilitla?",
    a: "Las noches en nuestro hotel de Xilitla, los recorridos guiados de cada día con transporte, las entradas, el desayuno y el guía certificado NOM-09 con seguro de viajero. Los paquetes van de 3 a 6 días y el precio está calculado para dos personas; si son más, se ajusta.",
  },
  {
    q: "¿Por qué quedarse en Xilitla y no en Ciudad Valles?",
    a: "Porque Las Pozas de Edward James, La Trinidad y el bosque de niebla están aquí mismo, y porque Xilitla es Pueblo Mágico: se camina de noche, se cena bien y se amanece entre montaña. Ciudad Valles es más práctica para el norte de la región, pero es una ciudad de paso. Desde Xilitla también salimos a Tamul, Micos y los sótanos.",
  },
  {
    q: "¿Los tours salen desde Xilitla?",
    a: "Sí. Pasamos por ti a tu hospedaje en Xilitla entre las 8:00 y las 9:00 de la mañana, y también damos servicio en Ciudad Valles. El Recorrido en RZR tiene su base aquí en Xilitla.",
  },
  {
    q: "¿Tienen hotel propio en Xilitla?",
    a: "Sí, el Hotel Paraíso Encantado. Los paquetes incluyen las noches ahí, con vista a la sierra y desayuno. Para grupos grandes trabajamos además con hospedaje de la zona.",
  },
  {
    q: "¿Cuántos días necesito en Xilitla?",
    a: "Con dos días completos ves Las Pozas sin prisa y haces un recorrido a las cascadas. Con tres o cuatro entran Tamul, el bosque de niebla de La Trinidad y los sótanos sin repetir destino ni cambiar de hotel.",
  },
  {
    q: "¿Se puede reservar solo el tour, sin hotel?",
    a: "Sí. Los recorridos de un día se compran sueltos y se pagan completos al reservar. Los viajes de dos días o más se apartan con el 30 %.",
  },
];

export default function ToursEnXilitlaPage() {
  const money = (n: number) => `$${n.toLocaleString("es-MX")}`;
  const destinosXi = DESTINOS_DB.filter((d) => d.zona === "Xilitla");
  // Los paquetes salen todos de aquí: el hotel está en Xilitla.
  const paquetes = [...PAQUETES_DB].sort((a, b) => a.dias - b.dias);
  const rzr = TOURS_DB.find((t) => t.precioUnidad === "vehiculo");
  const diasMin = Math.min(...paquetes.map((p) => p.dias));
  const diasMax = Math.max(...paquetes.map((p) => p.dias));

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      buildBreadcrumbNode([{ name: "Tours en Xilitla", path: "/tours-en-xilitla" }]),
      {
        "@type": "ItemList",
        name: "Paquetes con hotel en Xilitla",
        numberOfItems: paquetes.length,
        itemListElement: paquetes.map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: p.nombre,
          url: `${SITE}/paquetes/${p.slug}`,
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQS_XI.map((f) => ({
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
      <section className="px-6 pt-36 pb-16 text-center">
        <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-4 font-dm">
          ✦ Pueblo Mágico · Hotel propio · Salidas diarias
        </p>
        <h1
          className="font-cormorant font-light text-crema mb-5 leading-tight"
          style={{ fontSize: "clamp(34px,5.5vw,62px)" }}
        >
          Tours y paquetes en <em className="shimmer-gold italic">Xilitla</em>, San Luis Potosí
        </h1>
        <p className="text-crema/70 font-dm text-sm leading-relaxed max-w-2xl mx-auto mb-8">
          Aquí vivimos. Xilitla no es nuestra parada: es la base desde la que operamos, con hotel y restaurante
          propios a diez minutos de Las Pozas de Edward James. Desde aquí salimos cada mañana a las cascadas, los
          sótanos y el bosque de niebla, y de aquí vuelves a dormir sin rehacer maletas.
        </p>
        <a
          href={waLink("Hola, quiero información de los paquetes con hotel en Xilitla. ¿Qué tienen disponible?")}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#25D366] text-negro font-dm font-bold text-xs tracking-[1.5px] uppercase px-8 py-4 hover:brightness-110 transition-all"
        >
          Consultar disponibilidad
        </a>
      </section>

      {/* ── PAQUETES ──
          El racimo de «paquetes a xilitla» son 209 impresiones con UN clic, todas
          en el puesto 12-14. Va primero porque es la consulta que trae a esta
          página, y con el precio visible, que es lo que el otro resultado no da. */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-cormorant font-light text-crema text-3xl mb-3">
            Paquetes con hotel en Xilitla
          </h2>
          <p className="font-dm text-sm text-crema/55 leading-relaxed max-w-2xl mb-8">
            De {diasMin} a {diasMax} días, todo incluido: las noches en el hotel, los recorridos de cada día con
            transporte y entradas, el desayuno y el guía. Los precios son para dos personas.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {paquetes.map((p) => (
              <Link
                key={p.slug}
                href={`/paquetes/${p.slug}`}
                className="border border-white/10 p-6 hover:border-dorado/50 transition-colors group flex flex-col"
              >
                <p className="text-[9px] tracking-[2px] uppercase text-verde-vivo font-dm mb-2">{p.duracion}</p>
                <h3 className="font-cormorant text-crema text-xl leading-snug mb-1 group-hover:text-dorado transition-colors">
                  {p.nombre}
                </h3>
                <p className="font-dm text-xs text-crema/50 leading-relaxed mb-3 flex-1">{p.subtitulo}</p>
                <p className="font-dm text-sm">
                  <span className="font-cormorant text-dorado text-2xl">{money(p.precio)}</span>
                  <span className="text-crema/40 text-xs"> MXN por pareja · todo incluido</span>
                </p>
              </Link>
            ))}
          </div>
          <p className="text-crema/45 font-dm text-xs mt-4">
            ¿Vienen en grupo grande, de escuela o de empresa? Eso se cotiza aparte:{" "}
            <Link
              href="/grupos"
              className="text-verde-vivo hover:text-dorado transition-colors underline underline-offset-2"
            >
              viajes de grupo y escolares
            </Link>
            .
          </p>
        </div>
      </section>

      {/* ── QUÉ HAY EN XILITLA ── */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-cormorant font-light text-crema text-3xl mb-3">
            Qué hay en Xilitla y sus alrededores
          </h2>
          <p className="font-dm text-sm text-crema/55 leading-relaxed max-w-2xl mb-8">
            {destinosXi.length} destinos dentro del municipio, todos a menos de una hora del pueblo.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {destinosXi.map((d) => (
              <Link
                key={d.slug}
                href={`/destinos/${d.slug}`}
                className="border border-white/10 p-5 hover:border-dorado/50 transition-colors group"
              >
                <p className="text-[9px] tracking-[2px] uppercase text-verde-vivo font-dm mb-2">{d.tipo}</p>
                <h3 className="font-cormorant text-crema text-lg leading-snug group-hover:text-dorado transition-colors">
                  {d.nombre}
                </h3>
                <p className="font-dm text-xs text-crema/40 mt-2">{d.duracion_hrs} h · {d.precio_entrada}</p>
              </Link>
            ))}
          </div>
          {rzr && (
            <p className="text-crema/45 font-dm text-xs mt-4">
              El{" "}
              <Link
                href={`/tours/${rzr.slug}`}
                className="text-verde-vivo hover:text-dorado transition-colors underline underline-offset-2"
              >
                Recorrido en RZR
              </Link>{" "}
              tiene su base aquí en Xilitla: {tourDurTexto(rzr, " h")} manejando tu propio todoterreno por la selva,
              y se cobra por vehículo, no por persona.
            </p>
          )}
        </div>
      </section>

      {/* ── POR QUÉ XILITLA ── */}
      <section className="px-6 pb-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-cormorant font-light text-crema text-3xl mb-5">Por qué dormir en Xilitla</h2>
          <p className="font-dm text-sm text-crema/65 leading-relaxed mb-4">
            Casi todas las agencias de la Huasteca operan desde Ciudad Valles, que es una ciudad de paso: buena para
            moverse al norte de la región, pero se duerme en una avenida. Xilitla es Pueblo Mágico, está metido en la
            sierra y es donde Edward James construyó su jardín surrealista. Se camina de noche, se cena bien y se
            amanece con niebla entre las montañas.
          </p>
          <p className="font-dm text-sm text-crema/65 leading-relaxed">
            Desde aquí también salimos a lo que está del otro lado —la Cascada de Tamul, las cascadas de Micos, los
            sótanos de Aquismón—, así que no hay que elegir entre dormir bonito y ver la región completa.
          </p>
          <p className="text-crema/45 font-dm text-xs mt-5">
            Si dudas entre las dos bases, lo comparamos con los tiempos reales de carretera en{" "}
            <Link
              href="/xilitla-o-ciudad-valles"
              className="text-verde-vivo hover:text-dorado transition-colors underline underline-offset-2"
            >
              ¿Xilitla o Ciudad Valles? Dónde hospedarte
            </Link>
            .
          </p>
        </div>
      </section>

      {/* ── PLANEAR EL VIAJE ──
          Lo informacional NO se contesta aquí: se enlaza. Esos artículos ya están
          entre el puesto 4 y el 9 y responderlo otra vez les quitaría fuerza. */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-cormorant font-light text-crema text-3xl mb-8">Para planear tu viaje a Xilitla</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { href: "/blog/como-llegar-a-xilitla-rutas-desde-cdmx-monterrey-y-slp", t: "Cómo llegar a Xilitla", d: "Rutas desde CDMX, Monterrey y San Luis Potosí, en autobús, auto y avión." },
              { href: "/blog/las-pozas-xilitla-las-pozas-de-edward-james-todo-lo-que-nece", t: "Las Pozas de Edward James", d: "Horarios, precio de entrada y cómo aprovechar la visita." },
              { href: "/blog/mejor-temporada-para-ir-el-clima-en-xilitla-cual-es-la-mejor-epoca-par", t: "Cuándo ir: clima y temporada", d: "Qué esperar del clima mes por mes y cuándo el agua está más azul." },
              { href: "/blog/xilitla-con-ninos-actividades-para-ninos-en-xilitla-viajando", t: "Xilitla con niños", d: "Qué sí aguantan los niños y qué conviene dejar para otro viaje." },
            ].map((a) => (
              <Link
                key={a.href}
                href={a.href}
                className="border border-white/10 p-5 hover:border-dorado/50 transition-colors group"
              >
                <h3 className="font-cormorant text-crema text-lg leading-snug mb-2 group-hover:text-dorado transition-colors">
                  {a.t}
                </h3>
                <p className="font-dm text-xs text-crema/50 leading-relaxed">{a.d}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="px-6 pb-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-cormorant font-light text-crema text-3xl mb-8">Preguntas frecuentes</h2>
          <div className="space-y-6">
            {FAQS_XI.map((f) => (
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
        <h2 className="font-cormorant font-light text-crema text-3xl mb-4">Tu viaje a Xilitla, resuelto</h2>
        <p className="text-crema/60 font-dm text-sm mb-8 max-w-xl mx-auto">
          Somos guías locales certificados NOM-09, con hotel y transporte propios en el pueblo. Escríbenos y te
          confirmamos disponibilidad en menos de una hora.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <a
            href={waLink("Hola, quiero reservar un viaje a Xilitla. ¿Qué fechas tienen disponibles?")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#25D366] text-negro font-dm font-bold text-xs tracking-[1.5px] uppercase px-8 py-4 hover:brightness-110 transition-all"
          >
            Reservar por WhatsApp
          </a>
          <Link
            href="/paquetes"
            className="inline-flex items-center gap-2 border border-dorado/60 text-dorado font-dm font-bold text-xs tracking-[1.5px] uppercase px-8 py-4 hover:bg-dorado hover:text-negro transition-all"
          >
            Ver todos los paquetes
          </Link>
        </div>
      </section>
    </main>
  );
}
