import type { Metadata } from "next";
import Link from "next/link";
import { TOURS_DB, tourDurTexto, etiquetaUnidad, fraseRecogida, partesRecogida, salidaCorta } from "@/lib/tours";
import { incluyeDesayuno, rangoPorPersona, recogenEnValles } from "@/lib/catalogoResumen";
import { waLink } from "@/lib/whatsapp";
import { SITE } from "@/lib/i18n/config";
import { buildBreadcrumbNode } from "@/lib/jsonld";

const URL = `${SITE}/tours-en-ciudad-valles`;

/**
 * Los recorridos que de verdad pasan por ti en Ciudad Valles sin costo extra.
 *
 * 🔴 Filtraba con `esPorPersona` y así entraban la Gruta de Xilo, el Amanecer
 * de Nubes, la Olla de la Luz, la Travesía del Café —los cuatro recogen SOLO
 * en Xilitla— y el buceo, que es en la laguna de Rioverde. Una página que
 * promete "pasamos por ti a tu hotel de Ciudad Valles" listaba cinco que no lo
 * hacen, y anunciaba "desde $900" cuando lo más barato desde Valles cuesta
 * más. Todo lo de abajo —precios, hora, desayuno— sale de esta lista.
 */
const TOURS_CV = recogenEnValles(TOURS_DB);
const CV_RANGO = rangoPorPersona(TOURS_CV);
const money = (n: number) => `$${n.toLocaleString("es-MX")}`;
/** La hora de salida si todos los de la lista la comparten ("entre 8:00 y 9:00 AM"); si no, null. */
const CV_HORA =
  new Set(TOURS_CV.map((t) => salidaCorta(t))).size === 1 && TOURS_CV[0]
    ? partesRecogida(TOURS_CV[0], false).hora
    : null;
const CV_DESAYUNO = TOURS_CV.filter(incluyeDesayuno);
/** Los que no recogen en Valles, para decir qué pasa con ellos en vez de callarlos. */
const OTROS = TOURS_DB.filter((t) => !TOURS_CV.includes(t));
const SOLO_XILITLA = OTROS.filter((t) => partesRecogida(t, false).valles);
const lista = (xs: string[]) => new Intl.ListFormat("es-MX", { type: "conjunction" }).format(xs);

export const metadata: Metadata = {
  title: "Tours en Ciudad Valles, SLP — Salidas Diarias 2026",
  description:
    `Tours guiados con salida desde Ciudad Valles: Cascada de Tamul, rafting, Micos y Xilitla. Pasamos por ti a tu hotel, desde ${money(CV_RANGO.min)} MXN por persona.`,
  keywords: [
    "tours ciudad valles",
    "tours ciudad valles san luis potosi",
    "tours huasteca potosina desde ciudad valles",
    "agencia de tours ciudad valles",
    "que hacer en ciudad valles",
  ],
  alternates: { canonical: URL },
  openGraph: {
    title: "Tours en Ciudad Valles — Salidas Diarias",
    description:
      "La puerta de entrada a la Huasteca Potosina: tours guiados con pickup en tu hotel de Ciudad Valles.",
    url: URL,
    siteName: "Tours Huasteca Potosina",
    locale: "es_MX",
    type: "website",
    images: [{ url: `${SITE}/imagenes/cascadas-de-micos/hero.jpg`, width: 1600, height: 960, alt: "Cascadas de Micos, Ciudad Valles — Huasteca Potosina" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tours en Ciudad Valles — Salidas Diarias",
    description: "Tours guiados con pickup en tu hotel de Ciudad Valles.",
    images: [`${SITE}/imagenes/cascadas-de-micos/hero.jpg`],
  },
};

// FAQ local: texto plano reutilizado tal cual en el FAQPage JSON-LD. Sin datos inventados.
// Las cifras y las listas se leen de TOURS_CV: escritas a mano ya anunciaban
// "de $900 a $1,950" con recorridos que ni recogen en Valles.
const FAQS_CV: { q: string; a: string }[] = [
  {
    q: "¿Los tours pasan por mi hotel en Ciudad Valles?",
    a: `Sí, en los ${TOURS_CV.length} recorridos de esta página el transporte está incluido: pasamos por ti a tu hospedaje en Ciudad Valles (también en Xilitla)${CV_HORA ? `, todos los días ${CV_HORA}` : ", a la hora de salida de cada recorrido"}.${SOLO_XILITLA.length ? ` ${lista(SOLO_XILITLA.map((t) => t.nombreCorto))} recogen solo en hospedajes de Xilitla: desde Ciudad Valles se pueden hacer, pero el traslado tiene costo adicional que te cotizamos por WhatsApp.` : ""}`,
  },
  {
    q: "¿Por qué Ciudad Valles es la mejor base para la Huasteca?",
    a: "Porque es la puerta de entrada natural de la región: desde aquí, todos los destinos principales están a menos de 2 horas — la Cascada de Tamul, las cascadas de Micos, Tamasopo y el Puente de Dios, El Naranjo con Minas Viejas y El Meco, y Xilitla con Las Pozas. Además tiene la mayor oferta de hoteles, restaurantes y servicios.",
  },
  {
    q: "¿Cómo llego a Ciudad Valles?",
    a: "En autobús hay salidas nocturnas directas desde la Terminal del Norte de CDMX (~9–10 horas, llegas temprano y puedes tomar el tour ese mismo día). En auto son ~6.5 a 7 horas desde CDMX y ~6 desde Monterrey. En avión, el aeropuerto de Tampico queda a ~2.5 horas en auto.",
  },
  {
    q: "¿Cuánto cuesta un tour desde Ciudad Valles?",
    a: `Los ${TOURS_CV.length} tours de un día con recogida en Ciudad Valles van de ${money(CV_RANGO.min)} a ${money(CV_RANGO.max)} MXN por persona. Incluyen traslado desde tu hospedaje, guía certificado, equipo de seguridad, seguro de viaje y las fotos del recorrido${CV_DESAYUNO.length ? `; ${CV_DESAYUNO.length === TOURS_CV.length ? "todos" : `${CV_DESAYUNO.length} de ellos (${lista(CV_DESAYUNO.map((t) => t.nombreCorto))})`} llevan además desayuno regional` : ""}. Lo que incluye cada uno, con detalle, está en su ficha.`,
  },
  {
    q: "¿Puedo reservar para mañana?",
    a: "Sí, aceptamos reservas con 24 horas de anticipación (sujeto a disponibilidad). Escríbenos por WhatsApp y te confirmamos en menos de 1 hora.",
  },
];

export default function ToursCiudadVallesPage() {
  const toursCV = TOURS_CV;

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      // Mismas migas, ahora por el ayudante compartido de `lib/jsonld`.
      // Landing sólo en español: sin escalón de idioma.
      buildBreadcrumbNode([{ name: "Tours en Ciudad Valles", path: "/tours-en-ciudad-valles" }]),
      {
        "@type": "ItemList",
        name: "Tours con salida desde Ciudad Valles",
        numberOfItems: toursCV.length,
        itemListElement: toursCV.map((t, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: t.nombre,
          url: `${SITE}/tours/${t.slug}`,
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQS_CV.map((f) => ({
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
          ✦ Salidas diarias · Pickup en tu hotel · Guía certificado
        </p>
        <h1 className="font-cormorant font-light text-crema mb-5 leading-tight" style={{ fontSize: "clamp(34px,5.5vw,62px)" }}>
          Tours en <em className="shimmer-gold italic">Ciudad Valles</em>, San Luis Potosí
        </h1>
        <p className="text-crema/70 font-dm text-sm leading-relaxed max-w-2xl mx-auto mb-8">
          Ciudad Valles es la puerta de entrada a la Huasteca Potosina: desde aquí todos los destinos principales están
          a menos de 2 horas. Los {toursCV.length} recorridos de esta página pasan por ti a tu hotel todos los
          días{CV_HORA ? ` ${CV_HORA}` : ""} — tú solo preocúpate por estar listo
          {CV_DESAYUNO.length ? ` (en ${CV_DESAYUNO.length === toursCV.length ? "todos" : `${CV_DESAYUNO.length} de ellos`} hasta el desayuno va incluido)` : ""}.
        </p>
        <a
          href={waLink("Hola, estoy en Ciudad Valles y quiero información de los tours. ¿Qué tienen disponible?")}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#25D366] text-negro font-dm font-bold text-xs tracking-[1.5px] uppercase px-8 py-4 hover:brightness-110 transition-all"
        >
          Consultar disponibilidad
        </a>
      </section>

      {/* ── TOURS ── */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-cormorant font-light text-crema text-3xl mb-6">
            Tours con salida desde Ciudad Valles
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {toursCV.map((t) => (
              <Link
                key={t.slug}
                href={`/tours/${t.slug}`}
                className="border border-white/10 p-6 hover:border-dorado/50 transition-colors group flex flex-col"
              >
                <p className="text-[9px] tracking-[2px] uppercase text-verde-vivo font-dm mb-2">
                  {t.tipo} · {tourDurTexto(t, " h")}
                </p>
                <h3 className="font-cormorant text-crema text-xl leading-snug mb-3 group-hover:text-dorado transition-colors flex-1">
                  {t.nombre}
                </h3>
                <p className="font-dm text-sm">
                  <span className="font-cormorant text-dorado text-2xl">{money(t.precio)}</span>
                  {/* Decía "· todo incluido" en las siete: dos no llevan desayuno y el
                      rappel no incluye entradas. Lo que sí comparten es el traslado. */}
                  <span className="text-crema/40 text-xs"> MXN {etiquetaUnidad(t)}{partesRecogida(t, false).incluyeTraslado ? " · traslado incluido" : ""}</span>
                </p>
              </Link>
            ))}
          </div>
          {/* Los que no recogen en Valles no desaparecen: se dice cómo se
              llega a cada uno, con la frase del catálogo (`fraseRecogida`). */}
          {OTROS.length > 0 && (
            <div className="mt-8 border-t border-white/10 pt-6">
              <h3 className="font-dm text-[10px] tracking-[2px] uppercase text-crema/50 mb-3">
                Otros recorridos, que salen de Xilitla o del destino
              </h3>
              <ul className="space-y-2">
                {OTROS.map((t) => (
                  <li key={t.slug} className="font-dm text-xs text-crema/50 leading-relaxed">
                    <Link href={`/tours/${t.slug}`} className="text-verde-vivo hover:text-dorado transition-colors underline underline-offset-2">
                      {t.nombreCorto}
                    </Link>
                    : {fraseRecogida(t, false)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* ── CÓMO LLEGAR ── */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
          <div className="border border-white/10 p-7">
            <h3 className="font-cormorant font-light text-crema text-2xl mb-3">En autobús</h3>
            <p className="font-dm text-sm text-crema/65 leading-relaxed">
              Salidas nocturnas directas desde la Terminal del Norte de CDMX (~9–10 h). Llegas temprano a Ciudad Valles
              y puedes tomar el tour ese mismo día.
            </p>
          </div>
          <div className="border border-white/10 p-7">
            <h3 className="font-cormorant font-light text-crema text-2xl mb-3">En auto</h3>
            <p className="font-dm text-sm text-crema/65 leading-relaxed">
              ~6.5 a 7 horas desde CDMX y ~6 desde Monterrey. Recomendamos manejar de día por la sierra y usar Ciudad Valles
              como base.
            </p>
          </div>
          <div className="border border-white/10 p-7">
            <h3 className="font-cormorant font-light text-crema text-2xl mb-3">En avión</h3>
            <p className="font-dm text-sm text-crema/65 leading-relaxed">
              El aeropuerto más práctico es Tampico (~2.5 h en auto). También puedes volar a San Luis Potosí capital.
            </p>
          </div>
        </div>
        <p className="text-center mt-6">
          <Link
            href="/info-practica"
            className="text-verde-vivo hover:text-dorado transition-colors font-dm text-xs tracking-[1px] uppercase underline underline-offset-4"
          >
            Guía completa: cómo llegar, dónde dormir y dónde comer →
          </Link>
        </p>
      </section>

      {/* ── FAQ ── */}
      <section className="px-6 pb-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-cormorant font-light text-crema text-3xl mb-8">Preguntas frecuentes</h2>
          <div className="space-y-6">
            {FAQS_CV.map((f) => (
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
        <h2 className="font-cormorant font-light text-crema text-3xl mb-4">Reserva tu tour desde Ciudad Valles</h2>
        <p className="text-crema/60 font-dm text-sm mb-8 max-w-xl mx-auto">
          Somos guías locales certificados NOM-09 con transporte propio. Escríbenos y confirma tu lugar en menos de 1
          hora.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <a
            href={waLink("Hola, estoy en Ciudad Valles y quiero reservar un tour. ¿Tienen lugar?")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#25D366] text-negro font-dm font-bold text-xs tracking-[1.5px] uppercase px-8 py-4 hover:brightness-110 transition-all"
          >
            Reservar por WhatsApp
          </a>
          <Link
            href="/precios"
            className="inline-flex items-center gap-2 border border-dorado/60 text-dorado font-dm font-bold text-xs tracking-[1.5px] uppercase px-8 py-4 hover:bg-dorado hover:text-negro transition-all"
          >
            Ver precios completos
          </Link>
        </div>
      </section>
    </main>
  );
}
