import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";
import { DESTINOS_DB } from "@/lib/destinos";

const SITE_URL = "https://creador-de-intinerario-production.up.railway.app";

export const metadata: Metadata = {
  title: "Huasteca Potosina — Turismo, Cascadas & Aventura | México",
  description:
    `Descubre la Huasteca Potosina: cascadas turquesas, jardines surrealistas, cañones imposibles. ${DESTINOS_DB.length} destinos únicos en San Luis Potosí, México.`,
};

const CATEGORIAS = [
  { emoji: "💧", label: "Cascadas & Pozas",  href: "/experiencias?tipo=cascadas" },
  { emoji: "🏔️", label: "Aventura Extrema",  href: "/experiencias?tipo=aventura" },
  { emoji: "🏛️", label: "Cultura & Arte",    href: "/experiencias?tipo=cultura" },
  { emoji: "🌿", label: "Ecoturismo",         href: "/experiencias?tipo=naturaleza" },
  { emoji: "📸", label: "Fotografía",         href: "/experiencias?tipo=fotografia" },
  { emoji: "♨️", label: "Bienestar",          href: "/experiencias?tipo=bienestar" },
];

const REGION_STATS = [
  { num: "105m",                          label: "La cascada más alta" },
  { num: "333m",                          label: "Sótano más profundo" },
  { num: `+${DESTINOS_DB.length}`,        label: "Destinos únicos" },
  { num: "Todo el año",                   label: "Temporada abierta" },
];

function getCardGradient(tipo: string) {
  if (tipo.includes("Aventura") || tipo.includes("Extrema"))
    return "from-terracota/30 via-terracota/10 to-verde-profundo";
  if (tipo.includes("Arqueología") || tipo.includes("Arte") || tipo.includes("Cultura"))
    return "from-dorado/25 via-dorado/8 to-verde-profundo";
  if (tipo.includes("Naturaleza") || tipo.includes("Bienestar"))
    return "from-agua/20 via-agua/8 to-verde-profundo";
  return "from-verde-selva/30 via-verde-selva/10 to-verde-profundo";
}

// ── JSON-LD schemas ─────────────────────────────────────────────────────────
const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Huasteca Potosina",
  url: SITE_URL,
  description: "Turismo en la Huasteca Potosina, San Luis Potosí, México",
  inLanguage: "es-MX",
};

const destinosSchema = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Destinos en la Huasteca Potosina",
  numberOfItems: DESTINOS_DB.length,
  itemListElement: DESTINOS_DB.map((d, i) => ({
    "@type": "ListItem",
    position: i + 1,
    item: {
      "@type": "TouristDestination",
      name: d.nombre,
      url: `${SITE_URL}/destinos/${d.slug}`,
      image: d.imagen_hero,
      description: d.descripcion,
    },
  })),
};

export default function HomePage() {
  return (
    <main id="main-content" className="min-h-screen">
      {/* ── JSON-LD ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(destinosSchema) }}
      />

      {/* ── HERO ── */}
      <section
        aria-label="Bienvenida a la Huasteca Potosina"
        className="relative min-h-[90vh] flex flex-col items-center justify-center text-center px-6 py-32 overflow-hidden"
      >
        {/* Animated background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-verde-profundo/60 via-negro to-negro" />
          <div
            className="absolute rounded-full blur-3xl opacity-20"
            style={{
              width: "500px", height: "500px",
              background: "radial-gradient(circle, #3a6b1a, transparent)",
              top: "10%", left: "15%",
              animation: "floatSlow 18s ease-in-out infinite",
            }}
          />
          <div
            className="absolute rounded-full blur-3xl opacity-15"
            style={{
              width: "350px", height: "350px",
              background: "radial-gradient(circle, #c4882a, transparent)",
              bottom: "20%", right: "10%",
              animation: "floatSlow 24s ease-in-out infinite reverse",
            }}
          />
          <div
            className="absolute rounded-full blur-3xl opacity-10"
            style={{
              width: "250px", height: "250px",
              background: "radial-gradient(circle, #3a8aaa, transparent)",
              top: "40%", right: "30%",
              animation: "floatSlow 20s ease-in-out infinite 8s",
            }}
          />
        </div>

        <style>{`
          @keyframes floatSlow {
            0%, 100% { transform: translateY(0px) scale(1); }
            33%  { transform: translateY(-30px) scale(1.05); }
            66%  { transform: translateY(15px) scale(0.97); }
          }
        `}</style>

        <p className="text-[10px] tracking-[5px] uppercase text-verde-vivo mb-8 font-dm">
          ✦ San Luis Potosí · México ✦
        </p>

        <h1 className="font-cormorant font-light leading-[0.9] tracking-tight mb-8">
          <span className="block text-crema" style={{ fontSize: "clamp(64px,12vw,130px)" }}>
            La Huasteca
          </span>
          <span className="block text-dorado italic" style={{ fontSize: "clamp(64px,12vw,130px)" }}>
            Potosina
          </span>
        </h1>

        <p
          className="text-crema/60 max-w-xl mb-12 leading-relaxed font-dm"
          style={{ fontSize: "clamp(15px,1.8vw,18px)" }}
        >
          Cascadas turquesas, jardines surrealistas, cañones imposibles.
          La región más extraordinaria de México.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap gap-4 justify-center mb-16">
          <Link
            href="/destinos"
            className="border border-crema/40 text-crema px-10 py-4 text-sm tracking-[2px] uppercase font-dm hover:bg-crema/10 transition-all duration-300"
          >
            Explorar Destinos
          </Link>
          <Link
            href="/planear"
            className="bg-verde-selva text-crema px-10 py-4 text-sm tracking-[2px] uppercase font-dm hover:bg-verde-vivo transition-colors duration-300"
          >
            Planear mi Viaje IA
          </Link>
        </div>

        {/* Stats row */}
        <div className="flex gap-10 md:gap-16 flex-wrap justify-center border-t border-white/10 pt-10">
          {[
            { num: String(DESTINOS_DB.length), label: "Destinos Únicos" },
            { num: "Todo el año",              label: "Temporada" },
            { num: "Desde $60",                label: "MXN entrada" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <span
                className="font-cormorant font-light text-dorado block leading-none"
                style={{ fontSize: "clamp(28px,4vw,40px)" }}
              >
                {s.num}
              </span>
              <span className="text-[9px] tracking-[3px] uppercase text-crema/40 mt-2 block font-dm">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── CATEGORÍAS STRIP ── */}
      <section
        aria-label="Categorías de experiencias"
        className="bg-verde-profundo/50 border-y border-white/8 py-8 overflow-hidden"
      >
        <div className="overflow-x-auto scrollbar-none">
          <div className="flex gap-3 px-6 min-w-max mx-auto justify-center">
            {CATEGORIAS.map((cat) => (
              <Link
                key={cat.label}
                href={cat.href}
                className="flex items-center gap-2 border border-white/15 px-5 py-2.5 text-xs tracking-[2px] uppercase font-dm text-crema/60 hover:text-crema hover:border-verde-vivo/60 hover:bg-verde-selva/15 transition-all duration-200 whitespace-nowrap"
              >
                <span className="text-base" aria-hidden="true">{cat.emoji}</span>
                {cat.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── DESTINOS DESTACADOS ── */}
      <section
        aria-label="Descubre los destinos de la región"
        className="max-w-7xl mx-auto px-6 py-24"
      >
        <div className="text-center mb-16">
          <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-4 font-dm">
            Explora la región
          </p>
          <h2
            className="font-cormorant font-light text-crema"
            style={{ fontSize: "clamp(36px,5vw,56px)" }}
          >
            Descubre la <em className="text-dorado">Región</em>
          </h2>
          <p className="text-crema/45 mt-4 font-dm text-sm max-w-md mx-auto">
            {DESTINOS_DB.length} destinos que transformarán tu forma de ver México
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {DESTINOS_DB.map((d) => {
            const precioBase = d.precio_entrada.split(" ")[0];
            const esPago = precioBase.startsWith("$");
            return (
              <Link
                key={d.slug}
                href={`/destinos/${d.slug}`}
                className="group relative overflow-hidden border border-white/8 hover:border-verde-vivo/60 hover:scale-[1.02] transition-all duration-300 flex flex-col"
              >
                {/* Image or gradient thumbnail */}
                <div className="relative aspect-[4/3] overflow-hidden">
                  {d.imagen_hero ? (
                    <Image
                      src={d.imagen_hero}
                      alt={d.nombre}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                  ) : (
                    <div className={`absolute inset-0 bg-gradient-to-b ${getCardGradient(d.tipo)}`} />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-negro/80 via-negro/20 to-transparent" />
                  <span className="absolute bottom-3 left-3 text-3xl" aria-hidden="true">
                    {d.emoji}
                  </span>
                </div>

                {/* Card body */}
                <div className="flex flex-col flex-1 p-4 bg-negro/60">
                  <p className="text-[9px] tracking-[2px] uppercase text-verde-vivo mb-1 font-dm">{d.tipo}</p>
                  <h3 className="font-cormorant text-crema text-base leading-tight mb-1">{d.nombre}</h3>
                  <p className="text-crema/40 text-[10px] font-dm mb-3">{d.zona}</p>
                  <div className="flex items-center justify-between border-t border-white/10 pt-3 mt-auto">
                    <div>
                      <p className="text-[9px] tracking-[1px] uppercase text-crema/35 font-dm">Desde</p>
                      <p className="text-dorado text-sm font-dm font-medium">
                        {precioBase}
                        {esPago && (
                          <span className="text-[9px] text-crema/45 font-dm font-normal ml-1">MXN</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] tracking-[1px] uppercase text-crema/35 font-dm">Duración</p>
                      <p className="text-crema/70 text-sm font-dm">{d.duracion_hrs}h</p>
                    </div>
                  </div>
                </div>
                <div className="absolute inset-0 border border-verde-vivo/0 group-hover:border-verde-vivo/40 transition-all duration-300 pointer-events-none" />
              </Link>
            );
          })}
        </div>

        <div className="text-center mt-10">
          <Link
            href="/destinos"
            className="inline-block border border-verde-vivo/40 text-verde-vivo px-10 py-3.5 text-sm tracking-[2px] uppercase font-dm hover:bg-verde-selva/15 hover:border-verde-vivo transition-all duration-200"
          >
            Ver todos los destinos
          </Link>
        </div>
      </section>

      {/* ── POR QUÉ LA HUASTECA ── */}
      <section
        aria-label="Por qué visitar la Huasteca Potosina"
        className="bg-verde-profundo/30 border-y border-white/6 py-24 px-6"
      >
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: text */}
          <div>
            <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-4 font-dm">
              ¿Por qué la Huasteca?
            </p>
            <h2
              className="font-cormorant font-light text-crema mb-6"
              style={{ fontSize: "clamp(32px,4.5vw,52px)" }}
            >
              Una región que{" "}
              <em className="text-dorado">te cambia</em>
            </h2>
            <div className="space-y-4 text-crema/60 font-dm text-sm leading-relaxed">
              <p>
                La Huasteca Potosina es una de las regiones más biodiversas de México, donde la
                selva tropical coexiste con cañones kársticos, cascadas turquesas y tradiciones
                milenarias de la cultura Huasteca, reconocida por la UNESCO.
              </p>
              <p>
                Aquí el tiempo se mide diferente: por el vuelo circular de miles de vencejos
                al amanecer sobre el Sótano de las Golondrinas, por el color cambiante del agua
                del Tamul entre enero y octubre, por la luz que atraviesa el Puente de Dios solo
                entre las 11 y las 13 horas.
              </p>
              <p>
                No es solo un destino. Es una experiencia que redefine lo que significa la
                naturaleza en México.
              </p>
            </div>
            <div className="mt-8">
              <Link
                href="/experiencias"
                className="text-sm tracking-[2px] uppercase text-verde-vivo hover:text-lima transition-colors border-b border-verde-vivo/40 pb-0.5 font-dm"
              >
                Explorar experiencias →
              </Link>
            </div>
          </div>

          {/* Right: stats grid */}
          <div className="grid grid-cols-2 gap-4">
            {REGION_STATS.map((s) => (
              <div
                key={s.label}
                className="border border-white/10 bg-negro/40 p-6 text-center hover:border-dorado/30 transition-colors"
              >
                <div
                  className="font-cormorant font-light text-dorado leading-none mb-2"
                  style={{ fontSize: "clamp(32px,4vw,48px)" }}
                >
                  {s.num}
                </div>
                <div className="text-[10px] tracking-[2px] uppercase text-crema/40 font-dm">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLANIFICADOR IA ── */}
      <section aria-label="Planea tu viaje con IA" className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center border border-verde-profundo/80 bg-negro/60 p-12 md:p-16">
          <span className="inline-block text-[9px] tracking-[4px] uppercase text-verde-vivo border border-verde-selva/50 px-4 py-1.5 mb-6 font-dm">
            ✦ Tecnología IA
          </span>
          <h2
            className="font-cormorant font-light text-crema mb-6"
            style={{ fontSize: "clamp(28px,4vw,48px)" }}
          >
            Tu viaje perfecto,{" "}
            <em className="text-dorado">diseñado en 2 minutos</em>
          </h2>
          <p className="text-crema/55 font-dm text-sm leading-relaxed mb-8 max-w-xl mx-auto">
            Dinos cuántos días tienes, tu presupuesto y qué te emociona. La IA genera un itinerario
            personalizado con rutas reales, tiempos de traslado y precios 2026.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-3 justify-center mb-10">
            {[
              "🗓️ Itinerario día a día",
              "🗺️ Rutas reales",
              "💰 Precios actualizados 2026",
            ].map((pill) => (
              <span
                key={pill}
                className="border border-white/15 px-4 py-2 text-xs tracking-[1px] text-crema/60 font-dm"
              >
                {pill}
              </span>
            ))}
          </div>

          <Link
            href="/planear"
            className="inline-block bg-dorado text-negro px-12 py-4 text-sm tracking-[3px] uppercase font-dm font-medium hover:bg-lima transition-colors duration-300 mb-5"
          >
            Crear mi Itinerario Gratis →
          </Link>

          <p className="text-xs text-crema/30 tracking-wide font-dm">
            Sin registro · Gratis · PDF descargable
          </p>
        </div>
      </section>

      {/* ── INFO PRÁCTICA PREVIEW ── */}
      <section
        aria-label="Información práctica para tu viaje"
        className="bg-verde-profundo/20 border-y border-white/6 py-16 px-6"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2
              className="font-cormorant font-light text-crema"
              style={{ fontSize: "clamp(28px,4vw,44px)" }}
            >
              Antes de <em className="text-dorado">viajar</em>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: "🚌",
                title: "Cómo llegar",
                text: "Ciudad Valles es la puerta de entrada. Vuelos desde CDMX o autobús ADO directo en 8 horas.",
                href: "/info-practica#como-llegar",
              },
              {
                icon: "📅",
                title: "Mejor época",
                text: "Todo el año. Nov–Mayo ideal para cascadas. Jun–Oct lush verde, más lluvia, menos turismo.",
                href: "/info-practica#cuando-viajar",
              },
              {
                icon: "🏨",
                title: "Dónde quedarse",
                text: "Ciudad Valles como base. Opciones boutique en Xilitla y Tamasopo para inmersión total.",
                href: "/info-practica#donde-quedarse",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="border border-white/8 bg-negro/30 p-6 hover:border-verde-vivo/30 transition-colors group"
              >
                <div className="text-3xl mb-4" aria-hidden="true">{card.icon}</div>
                <h3 className="font-cormorant text-crema text-xl mb-3">{card.title}</h3>
                <p className="text-crema/50 text-sm font-dm leading-relaxed mb-5">{card.text}</p>
                <Link
                  href={card.href}
                  className="text-xs tracking-[2px] uppercase text-verde-vivo hover:text-lima transition-colors font-dm"
                >
                  Ver más →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-negro border-t border-white/8 py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            {/* Col 1: Logo + info */}
            <div>
              <div className="mb-4">
                <div className="font-cormorant text-crema text-2xl font-light tracking-[4px] uppercase">
                  HUASTECA
                </div>
                <div className="text-[9px] tracking-[3px] uppercase text-verde-vivo font-dm mt-0.5">
                  Potosina
                </div>
              </div>
              <p className="text-crema/40 text-xs font-dm leading-relaxed mb-4">
                La región más extraordinaria de México. Cascadas turquesas, jardines surrealistas,
                aventura sin límites.
              </p>
              <a
                href="https://wa.me/524441234567"
                className="text-xs text-verde-vivo hover:text-lima transition-colors font-dm"
              >
                WhatsApp: +52 (444) 123-4567
              </a>
            </div>

            {/* Col 2: Destinos */}
            <div>
              <h3 className="text-[10px] tracking-[3px] uppercase text-crema/40 font-dm mb-5">
                Destinos
              </h3>
              <ul className="space-y-3">
                {DESTINOS_DB.slice(0, 4).map((d) => (
                  <li key={d.slug}>
                    <Link
                      href={`/destinos/${d.slug}`}
                      className="text-crema/55 hover:text-crema text-sm font-dm transition-colors flex items-center gap-2"
                    >
                      <span className="text-verde-vivo text-xs" aria-hidden="true">→</span>
                      {d.nombre}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 3: Explora */}
            <div>
              <h3 className="text-[10px] tracking-[3px] uppercase text-crema/40 font-dm mb-5">
                Explora
              </h3>
              <ul className="space-y-3">
                {[
                  { label: "Experiencias",    href: "/experiencias" },
                  { label: "Info Práctica",   href: "/info-practica" },
                  { label: "Planear mi Viaje", href: "/planear" },
                ].map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-crema/55 hover:text-crema text-sm font-dm transition-colors flex items-center gap-2"
                    >
                      <span className="text-verde-vivo text-xs" aria-hidden="true">→</span>
                      {link.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <span className="text-crema/25 text-sm font-dm flex items-center gap-2 cursor-not-allowed">
                    <span className="text-crema/15 text-xs" aria-hidden="true">→</span>
                    Blog <span className="text-[9px] tracking-wide opacity-70">(próximamente)</span>
                  </span>
                </li>
              </ul>
            </div>

            {/* Col 4: Conecta */}
            <div>
              <h3 className="text-[10px] tracking-[3px] uppercase text-crema/40 font-dm mb-5">
                Conecta
              </h3>
              <div className="flex gap-4 mb-5">
                {[
                  { icon: "📸", label: "Instagram (próximamente)" },
                  { icon: "📘", label: "Facebook (próximamente)" },
                  { icon: "🎵", label: "TikTok (próximamente)" },
                ].map((social) => (
                  <span
                    key={social.label}
                    aria-label={social.label}
                    title="Próximamente"
                    className="w-10 h-10 border border-white/8 flex items-center justify-center text-lg opacity-35 cursor-not-allowed"
                  >
                    <span aria-hidden="true">{social.icon}</span>
                  </span>
                ))}
              </div>
              <a
                href="mailto:hola@huastecapotosina.mx"
                className="text-crema/50 hover:text-crema text-sm font-dm transition-colors"
              >
                hola@huastecapotosina.mx
              </a>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/8 pt-8 flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-crema/25 font-dm tracking-wide">
            <span>© 2026 Huasteca Potosina · Todos los derechos reservados</span>
            <span>San Luis Potosí, México</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
