import type { Metadata } from "next";
import Link from "next/link";
import { TOURS_DB, tourDurTexto } from "@/lib/tours";
import { PAQUETES_DB } from "@/lib/paquetes";
import { waLink } from "@/lib/whatsapp";
import { SITE } from "@/lib/i18n/config";

const URL = `${SITE}/precios`;

export const metadata: Metadata = {
  title: "Precios de Tours en la Huasteca Potosina 2026",
  description:
    "Lista completa de precios 2026: tours de un día todo incluido y paquetes con hotel desde $9,000 MXN por pareja. Sin costos ocultos y con descuento para niños.",
  keywords: [
    "precios tours huasteca potosina",
    "cuánto cuesta la huasteca potosina",
    "cuánto cuesta ir a la huasteca potosina",
    "tour cascada tamul precio",
    "paquetes huasteca potosina precios",
  ],
  alternates: { canonical: URL },
  openGraph: {
    title: "Precios de Tours en la Huasteca Potosina 2026",
    description:
      "Cuánto cuesta visitar la Huasteca Potosina: precios de todos los tours y paquetes, todo incluido y sin sorpresas.",
    url: URL,
    siteName: "Tours Huasteca Potosina",
    locale: "es_MX",
    type: "website",
    images: [{ url: `${SITE}/og-image.jpg`, width: 1200, height: 800, alt: "Precios de tours en la Huasteca Potosina" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Precios de Tours en la Huasteca Potosina 2026",
    description: "Precios de todos los tours y paquetes, todo incluido y sin sorpresas.",
    images: [`${SITE}/og-image.jpg`],
  },
};

const DIF_LABEL: Record<string, string> = { baja: "Fácil", media: "Moderado", alta: "Avanzado" };

// El rango se calcula del catálogo, no se escribe a mano: el texto decía
// "$1,300 a $1,850" mientras la tabla de esta misma página llegaba a $1,950
// (rafting) y bajaba a $900 (Travesía del Café).
const preciosPorPersona = TOURS_DB.filter((t) => t.precioUnidad !== "vehiculo").map((t) => t.precio);
const RANGO_MIN = `$${Math.min(...preciosPorPersona).toLocaleString("es-MX")}`;
const RANGO_MAX = `$${Math.max(...preciosPorPersona).toLocaleString("es-MX")}`;
// Derivado del catálogo: estos importes estaban escritos a mano en la respuesta
// de abajo y se quedaron viejos en cuanto cambió un paquete.
const preciosPaquete = PAQUETES_DB.map((p) => p.precio);
const PAQ_MIN = `$${Math.min(...preciosPaquete).toLocaleString("es-MX")}`;
const PAQ_MAX = `$${Math.max(...preciosPaquete).toLocaleString("es-MX")}`;
const RZR_DESDE = `$${(TOURS_DB.find((t) => t.id === "tour-rzr-xilitla")?.precio ?? 0).toLocaleString("es-MX")}`;

// Tours con formato privado: el dato ya vivía en el catálogo sin publicarse.
const PRIVADOS = TOURS_DB.filter((t) => t.privateAvailable && t.privateMinPrice);
const PRIVADO_MIN = `$${Math.min(...PRIVADOS.map((t) => t.privateMinPrice!)).toLocaleString("es-MX")}`;
const PRIVADO_MAX = `$${Math.max(...PRIVADOS.map((t) => t.privateMinPrice!)).toLocaleString("es-MX")}`;
const PRIVADOS_NOMBRES = `${PRIVADOS.length} de nuestros recorridos`;

// FAQ de precios: texto plano reutilizado tal cual en el FAQPage JSON-LD. Datos verificables, sin inventar.
const FAQS_PRECIOS: { q: string; a: string }[] = [
  {
    q: "¿Cuánto cuesta ir a la Huasteca Potosina?",
    a: `Depende de los días y del plan. Un tour guiado de un día todo incluido cuesta entre ${RANGO_MIN} y ${RANGO_MAX} MXN por persona (transporte, desayuno, entradas y guía certificado incluidos). Un viaje completo de 3 a 5 días con hotel y tours va de ${PAQ_MIN} a ${PAQ_MAX} MXN por pareja con nuestros paquetes. A eso súmale cómo llegues a la región (autobús desde CDMX ~$800–$1,100 por trayecto) y tus comidas y cenas libres.`,
  },
  {
    q: "¿Los precios de los tours son por persona?",
    a: `Sí, todos los tours de un día se cobran por persona, excepto el Recorrido en RZR por Xilitla, que se cobra por vehículo (desde ${RZR_DESDE} MXN por unidad, para 2 a 6 ocupantes según el modelo). Los paquetes con hotel se cotizan por pareja (2 personas).`,
  },
  {
    q: "¿Hay descuento para niños?",
    a: "Sí. Los niños de 6 a 10 años pagan alrededor del 70 % del precio de adulto y los menores de 6 años el 50 %. El descuento se aplica automáticamente al reservar en línea.",
  },
  {
    q: "¿Qué incluye el precio del tour?",
    a: "El precio que ves es el precio final: transporte desde tu hospedaje en la zona, desayuno regional, todas las entradas a parques y atracciones, guía certificado NOM-09 SECTUR, equipo de seguridad, fotos y video del recorrido y botiquín. No hay cargos sorpresa al llegar.",
  },
  {
    q: "¿Puedo pagar con tarjeta o tengo que pagar en efectivo?",
    a: "Puedes reservar y pagar en línea con tarjeta de crédito o débito de forma segura, o apartar por WhatsApp. Te recomendamos llevar algo de efectivo para souvenirs y antojos locales, porque en varios puntos de la sierra no hay cajeros.",
  },
  {
    q: "¿Cuánto cuesta un tour privado?",
    // Decía "casi todos" cuando son 5 de 10, y no daba precio pese a que
    // `privateMinPrice` ya existe en el catálogo para cada uno de esos 5.
    a: `${PRIVADOS_NOMBRES} se pueden hacer en formato privado para tu grupo, desde ${PRIVADO_MIN} MXN por el grupo completo (el más caro llega a ${PRIVADO_MAX}). El precio final depende del tour y del número de personas — escríbenos por WhatsApp y te cotizamos el mismo día.`,
  },
];

export default function PreciosPage() {
  // Solo tours por persona en la tabla principal; el RZR (por vehículo) se muestra aparte.
  const porPersona = TOURS_DB.filter((t) => t.precioUnidad !== "vehiculo");
  const porVehiculo = TOURS_DB.filter((t) => t.precioUnidad === "vehiculo");
  const precioMin = Math.min(...porPersona.map((t) => t.precio));
  const money = (n: number) => `$${n.toLocaleString("es-MX")}`;

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: SITE },
          { "@type": "ListItem", position: 2, name: "Precios", item: URL },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQS_PRECIOS.map((f) => ({
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
          ✦ Precios claros · Todo incluido · Sin sorpresas
        </p>
        <h1 className="font-cormorant font-light text-crema mb-5 leading-tight" style={{ fontSize: "clamp(36px,5.5vw,64px)" }}>
          Precios de Tours en la <em className="shimmer-gold italic">Huasteca Potosina</em>
        </h1>
        <p className="text-crema/70 font-dm text-sm leading-relaxed max-w-2xl mx-auto">
          Tours guiados de un día desde {money(precioMin)} MXN por persona y paquetes con hotel desde{" "}
          {money(Math.min(...PAQUETES_DB.map((p) => p.precio)))} MXN por pareja. El precio que ves incluye transporte,
          desayuno, entradas y guía certificado NOM-09 — sin costos ocultos al llegar.
        </p>
      </section>

      {/* ── TABLA DE TOURS ── */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-cormorant font-light text-crema text-3xl mb-6">Tours de un día (por persona)</h2>
          <div className="overflow-x-auto border border-white/10">
            <table className="w-full text-left font-dm text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-white/15 text-[10px] tracking-[2px] uppercase text-crema/50">
                  <th className="px-4 py-3 font-medium">Tour</th>
                  <th className="px-4 py-3 font-medium">Duración</th>
                  <th className="px-4 py-3 font-medium">Dificultad</th>
                  <th className="px-4 py-3 font-medium text-right">Precio por persona</th>
                </tr>
              </thead>
              <tbody>
                {porPersona.map((t) => (
                  <tr key={t.slug} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-4">
                      <Link href={`/tours/${t.slug}`} className="text-crema hover:text-dorado transition-colors">
                        {t.nombre}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-crema/60 whitespace-nowrap">{tourDurTexto(t, " h")} aprox.</td>
                    <td className="px-4 py-4 text-crema/60">{DIF_LABEL[t.dificultad]}</td>
                    <td className="px-4 py-4 text-right whitespace-nowrap">
                      {/* El precio es el enlace: quien llega a /precios ya está
                          comparando, y antes tenía que dar dos saltos más para
                          poder reservar. */}
                      <Link href={`/reservar/carrito?agregar=${t.slug}`} className="group/precio inline-block">
                        <span className="font-cormorant text-dorado text-xl group-hover/precio:text-lima transition-colors">{money(t.precio)}</span>
                        <span className="text-crema/40 text-xs"> MXN</span>
                        <span className="block text-[9px] tracking-[1.5px] uppercase font-dm text-crema/35 group-hover/precio:text-lima transition-colors">Reservar →</span>
                      </Link>
                    </td>
                  </tr>
                ))}
                {porVehiculo.map((t) => (
                  <tr key={t.slug} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-4">
                      <Link href={`/tours/${t.slug}`} className="text-crema hover:text-dorado transition-colors">
                        {t.nombre}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-crema/60 whitespace-nowrap">
                      {tourDurTexto(t, " h")}
                    </td>
                    <td className="px-4 py-4 text-crema/60">{DIF_LABEL[t.dificultad]}</td>
                    <td className="px-4 py-4 text-right whitespace-nowrap">
                      <Link href={`/reservar/carrito?agregar=${t.slug}`} className="group/precio inline-block">
                        <span className="text-crema/50 text-xs">desde </span>
                        <span className="font-cormorant text-dorado text-xl group-hover/precio:text-lima transition-colors">{money(t.precio)}</span>
                        <span className="text-crema/40 text-xs"> MXN por vehículo</span>
                        <span className="block text-[9px] tracking-[1.5px] uppercase font-dm text-crema/35 group-hover/precio:text-lima transition-colors">Reservar →</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-crema/45 font-dm text-xs mt-3">
            Niños de 6 a 10 años pagan ~70 % del precio de adulto; menores de 6 años, 50 %. Cancelación gratuita con 48 h
            de anticipación. Salidas todos los días del año entre 8:00 y 9:00 AM.
          </p>
        </div>
      </section>

      {/* ── PAQUETES ── */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-cormorant font-light text-crema text-3xl mb-2">¿Cuánto cuesta un viaje completo?</h2>
          <p className="text-crema/60 font-dm text-sm mb-8 max-w-2xl">
            Si vienes varios días, los paquetes combinan tours + hospedaje en el Hotel Paraíso Encantado de Xilitla, con
            todo coordinado. Precios por pareja (2 personas):
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {PAQUETES_DB.map((p) => (
              <Link
                key={p.slug}
                href={`/paquetes/${p.slug}`}
                className="border border-white/10 p-6 hover:border-dorado/50 transition-colors group"
              >
                <p className="text-[10px] tracking-[2px] uppercase text-verde-vivo font-dm mb-2">{p.duracion}</p>
                <h3 className="font-cormorant text-crema text-2xl mb-3 group-hover:text-dorado transition-colors">
                  {p.nombre}
                </h3>
                <p className="font-cormorant text-dorado text-3xl">
                  {money(p.precio)} <span className="font-dm text-crema/40 text-xs">MXN por pareja</span>
                </p>
              </Link>
            ))}
          </div>
          <p className="text-crema/45 font-dm text-xs mt-4">
            ¿Grupo, familia o más noches? Armamos cotizaciones a la medida desde 2 personas.{" "}
            <Link href="/paquetes" className="text-verde-vivo hover:text-dorado transition-colors underline underline-offset-2">
              Ver paquetes completos →
            </Link>
          </p>
        </div>
      </section>

      {/* ── QUÉ INCLUYE ── */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6">
          <div className="border border-verde-selva/30 bg-verde-profundo/30 p-7">
            <h2 className="font-cormorant font-light text-crema text-2xl mb-4">El precio siempre incluye</h2>
            <ul className="space-y-2 font-dm text-sm text-crema/75">
              <li>✓ Traslado redondo desde tu hospedaje en Xilitla o Ciudad Valles</li>
              <li>✓ Desayuno con platillos típicos de la región</li>
              <li>✓ Todas las entradas a parques y atracciones</li>
              <li>✓ Guía local certificado NOM-09 SECTUR</li>
              <li>✓ Equipo de seguridad (chaleco, casco según el tour)</li>
              <li>✓ Fotografías y video del recorrido</li>
              <li>✓ Botiquín de primeros auxilios</li>
            </ul>
          </div>
          <div className="border border-white/10 p-7">
            <h2 className="font-cormorant font-light text-crema text-2xl mb-4">No incluye</h2>
            <ul className="space-y-2 font-dm text-sm text-crema/60">
              <li>· Cómo llegar a la Huasteca (autobús o vuelo hasta Ciudad Valles / Xilitla)</li>
              <li>· Comidas y cenas fuera del desayuno</li>
              <li>· Propinas (opcionales, siempre agradecidas)</li>
              <li>· Souvenirs y gastos personales</li>
            </ul>
            <p className="font-dm text-xs text-crema/45 mt-4">
              ¿No sabes cómo llegar? Te lo explicamos paso a paso en la{" "}
              <Link href="/info-practica" className="text-verde-vivo hover:text-dorado transition-colors underline underline-offset-2">
                Guía práctica de viaje
              </Link>.
            </p>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="px-6 pb-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-cormorant font-light text-crema text-3xl mb-8">Preguntas frecuentes sobre precios</h2>
          <div className="space-y-6">
            {FAQS_PRECIOS.map((f) => (
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
        <h2 className="font-cormorant font-light text-crema text-3xl mb-4">¿Listo para conocer la Huasteca?</h2>
        <p className="text-crema/60 font-dm text-sm mb-8 max-w-xl mx-auto">
          Escríbenos por WhatsApp y te ayudamos a armar el plan perfecto para tus fechas y tu presupuesto — respondemos
          en menos de 1 hora.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <a
            href={waLink("Hola, vi la página de precios y quiero cotizar mi viaje a la Huasteca. ¿Me ayudan?")}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#25D366] text-negro font-dm font-bold text-xs tracking-[1.5px] uppercase px-8 py-4 hover:brightness-110 transition-all"
          >
            Cotizar por WhatsApp
          </a>
          <Link
            href="/tours"
            className="inline-flex items-center gap-2 border border-dorado/60 text-dorado font-dm font-bold text-xs tracking-[1.5px] uppercase px-8 py-4 hover:bg-dorado hover:text-negro transition-all"
          >
            Ver todos los tours
          </Link>
        </div>
      </section>
    </main>
  );
}
