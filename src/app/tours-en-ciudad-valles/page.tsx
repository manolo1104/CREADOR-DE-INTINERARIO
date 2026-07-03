import type { Metadata } from "next";
import Link from "next/link";
import { TOURS_DB } from "@/lib/tours";
import { waLink } from "@/lib/whatsapp";
import { SITE } from "@/lib/i18n/config";

const URL = `${SITE}/tours-en-ciudad-valles`;

export const metadata: Metadata = {
  title: "Tours en Ciudad Valles, SLP — Salidas Diarias 2026",
  description:
    "Tours guiados con salida desde Ciudad Valles: Cascada de Tamul, rafting, Micos y Xilitla. Pasamos por ti a tu hotel — todo incluido desde $1,300 MXN.",
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
      "La puerta de entrada a la Huasteca Potosina: tours todo incluido con pickup en tu hotel de Ciudad Valles.",
    url: URL,
    siteName: "Tours Huasteca Potosina",
    locale: "es_MX",
    type: "website",
  },
};

// FAQ local: texto plano reutilizado tal cual en el FAQPage JSON-LD. Sin datos inventados.
const FAQS_CV: { q: string; a: string }[] = [
  {
    q: "¿Los tours pasan por mi hotel en Ciudad Valles?",
    a: "Sí. El transporte está incluido y pasamos por ti a tu hospedaje en Ciudad Valles (también damos servicio en Xilitla). Las salidas son todos los días entre 8:00 y 9:00 AM.",
  },
  {
    q: "¿Por qué Ciudad Valles es la mejor base para la Huasteca?",
    a: "Porque es la puerta de entrada natural de la región: desde aquí, todos los destinos principales están a menos de 2 horas — la Cascada de Tamul, las cascadas de Micos, Tamasopo y el Puente de Dios, El Naranjo con Minas Viejas y El Meco, y Xilitla con Las Pozas. Además tiene la mayor oferta de hoteles, restaurantes y servicios.",
  },
  {
    q: "¿Cómo llego a Ciudad Valles?",
    a: "En autobús hay salidas nocturnas directas desde la Terminal del Norte de CDMX (~9–10 horas, llegas temprano y puedes tomar el tour ese mismo día). En auto son ~9 horas desde CDMX y ~6 desde Monterrey. En avión, el aeropuerto de Tampico queda a ~2.5 horas en auto.",
  },
  {
    q: "¿Cuánto cuesta un tour desde Ciudad Valles?",
    a: "Los tours de un día van de $1,300 a $1,850 MXN por persona con todo incluido: transporte desde tu hotel, desayuno regional, entradas, guía certificado NOM-09, equipo de seguridad y fotos del recorrido.",
  },
  {
    q: "¿Puedo reservar para mañana?",
    a: "Sí, aceptamos reservas con 24 horas de anticipación (sujeto a disponibilidad). Escríbenos por WhatsApp y te confirmamos en menos de 1 hora.",
  },
];

export default function ToursCiudadVallesPage() {
  const money = (n: number) => `$${n.toLocaleString("es-MX")}`;
  // El RZR tiene base en Xilitla; los demás recorridos recogen en Ciudad Valles.
  const toursCV = TOURS_DB.filter((t) => t.precioUnidad !== "vehiculo");
  const rzr = TOURS_DB.find((t) => t.precioUnidad === "vehiculo");

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: SITE },
          { "@type": "ListItem", position: 2, name: "Tours en Ciudad Valles", item: URL },
        ],
      },
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
          ✦ Salidas diarias · Pickup en tu hotel · Todo incluido
        </p>
        <h1 className="font-cormorant font-light text-crema mb-5 leading-tight" style={{ fontSize: "clamp(34px,5.5vw,62px)" }}>
          Tours en <em className="shimmer-gold italic">Ciudad Valles</em>, San Luis Potosí
        </h1>
        <p className="text-crema/70 font-dm text-sm leading-relaxed max-w-2xl mx-auto mb-8">
          Ciudad Valles es la puerta de entrada a la Huasteca Potosina: desde aquí todos los destinos principales están
          a menos de 2 horas. Nuestros tours pasan por ti a tu hotel todos los días entre 8:00 y 9:00 AM — tú solo
          preocúpate por desayunar bien (aunque el desayuno también va incluido).
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
                  {t.tipo} · {t.duracion_hrs} h
                </p>
                <h3 className="font-cormorant text-crema text-xl leading-snug mb-3 group-hover:text-dorado transition-colors flex-1">
                  {t.nombre}
                </h3>
                <p className="font-dm text-sm">
                  <span className="font-cormorant text-dorado text-2xl">{money(t.precio)}</span>
                  <span className="text-crema/40 text-xs"> MXN por persona · todo incluido</span>
                </p>
              </Link>
            ))}
          </div>
          {rzr && (
            <p className="text-crema/45 font-dm text-xs mt-4">
              ¿Buscas el{" "}
              <Link href={`/tours/${rzr.slug}`} className="text-verde-vivo hover:text-dorado transition-colors underline underline-offset-2">
                Recorrido en RZR
              </Link>
              ? Ese sale desde nuestra base en Xilitla (a menos de 2 h de Ciudad Valles) — perfecto para combinarlo con
              Las Pozas el mismo día.
            </p>
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
              ~9 horas desde CDMX y ~6 desde Monterrey. Recomendamos manejar de día por la sierra y usar Ciudad Valles
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
