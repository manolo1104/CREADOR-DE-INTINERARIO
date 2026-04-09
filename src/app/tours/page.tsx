import { Metadata } from "next";
import { TOURS_DB } from "@/lib/tours";
import { TOUR_FAQS } from "@/lib/tourFaqs";
import { TourCalculadora } from "@/components/TourCalculadora";
import { GuideProfile } from "@/components/GuideProfile";
import { waLink, WA_MESSAGES } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Tours Huasteca Potosina — Recorridos Guiados con Todo Incluido",
  description:
    "Tours guiados por la Huasteca Potosina: Tamul, Edward James, Meco, Minas Viejas y más. Transporte, desayuno, entradas y guía certificado incluidos.",
};

const WA_SVG = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
    className="w-4 h-4 flex-shrink-0" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.532 5.86L.054 23.447a.75.75 0 0 0 .916.99l5.764-1.511A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.693 9.693 0 0 1-4.953-1.357l-.355-.211-3.68.965.981-3.585-.232-.369A9.712 9.712 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
  </svg>
);

const DIFICULTAD_STYLE: Record<string, string> = {
  alta:  "text-terracota border-terracota/50",
  media: "text-dorado border-dorado/50",
  baja:  "text-lima border-lima/50",
};

const BADGES = [
  { icon: "🏅", title: "Guías Certificados",          sub: "NOM-09 SECTUR" },
  { icon: "🚐", title: "Transporte Incluido",          sub: "Desde tu hotel" },
  { icon: "📸", title: "Fotos & Video",                sub: "Del recorrido completo" },
  { icon: "✅", title: "Todo Incluido",                sub: "Sin costos ocultos" },
  { icon: "💬", title: "Respuesta en < 1 hora",        sub: "Lun–Dom, todo el día" },
  { icon: "✅", title: "Confirmación inmediata",       sub: "Por WhatsApp al reservar" },
];

const TESTIMONIOS = [
  {
    nombre: "Sandra Morales",
    ciudad: "Ciudad de México",
    texto:
      "Increíble experiencia. El guía conocía cada rincón del Tamul y nos llevó a miradores que nunca hubiéramos encontrado solos. 100% lo recomiendo.",
    tour: "Expedición Tamul",
  },
  {
    nombre: "Carlos Reyes",
    ciudad: "Guadalajara",
    texto:
      "Todo fue exactamente como prometieron: transporte puntual, desayuno incluido, guía certificado. Sin sorpresas de último momento. ¡Ya vamos en el segundo tour!",
    tour: "Ruta Surrealista",
  },
  {
    nombre: "Valeria Guzmán",
    ciudad: "Monterrey",
    texto:
      "Las Minas Viejas me dejaron sin palabras. El agua turquesa, la selva… Respondieron mi WhatsApp en 20 minutos y todo estuvo organizado en el día.",
    tour: "Paraíso Escalonado",
  },
  {
    nombre: "Rodrigo Sánchez",
    ciudad: "Querétaro, QRO",
    texto:
      "El color del agua en Minas Viejas es irreal. Todo el tour perfectamente organizado, sin tiempos muertos. El precio incluye más de lo que esperaba.",
    tour: "Paraíso Escalonado",
  },
];

const COMO_FUNCIONA = [
  {
    num: "01",
    titulo: "Escríbenos por WhatsApp",
    detalle: "Cuéntanos cuántas personas son, qué fechas manejan y qué tours te interesan. Respondemos en menos de una hora.",
  },
  {
    num: "02",
    titulo: "Confirmamos y apartamos tu lugar",
    detalle: "Te enviamos los detalles del tour: punto de encuentro, hora de salida, lista de qué llevar y el link de pago.",
  },
  {
    num: "03",
    titulo: "Disfruta sin preocupaciones",
    detalle: "El día del tour solo preocúpate de llegar. Todo lo demás —transporte, entradas, desayuno, guía— ya está incluido.",
  },
];

export default function ToursPage() {
  return (
    <main id="main-content" className="min-h-screen">

      {/* ── HERO ── */}
      <section className="bg-gradient-to-b from-verde-profundo/80 via-verde-profundo/30 to-negro px-6 pt-32 pb-20 text-center">
        <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-4 font-dm">
          Tours con todo incluido
        </p>
        <h1
          className="font-cormorant font-light text-crema mb-5"
          style={{ fontSize: "clamp(42px,7vw,80px)" }}
        >
          Recorridos <em className="text-dorado">Guiados</em>
        </h1>
        <p className="text-crema/55 font-dm text-sm max-w-lg mx-auto leading-relaxed mb-8">
          {TOURS_DB.length} tours diseñados para vivir la Huasteca sin preocupaciones.
          Transporte, desayuno, entradas y guía certificado incluidos en cada recorrido.
        </p>
        <a
          href={waLink(WA_MESSAGES.tourGeneral)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2.5 bg-[#25D366] hover:bg-[#20ba59] text-white px-8 py-3.5 text-[11px] tracking-[2px] uppercase font-dm transition-colors duration-200"
        >
          {WA_SVG}
          Reservar por WhatsApp
        </a>
      </section>

      <GuideProfile />

      {/* ── BADGES ── */}
      <section className="bg-verde-profundo/20 border-y border-white/6 py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-[10px] tracking-[4px] uppercase text-verde-vivo mb-8 font-dm">
            Por qué elegirnos
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-center">
            {BADGES.map((item) => (
              <div key={item.title} className="border border-white/8 bg-negro/30 p-4">
                <div className="text-2xl mb-2" aria-hidden="true">{item.icon}</div>
                <p className="font-cormorant text-crema text-sm mb-0.5 leading-tight">{item.title}</p>
                <p className="text-[9px] text-crema/40 font-dm tracking-wide">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TOURS GRID ── */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {TOURS_DB.map((tour) => (
            <article
              key={tour.id}
              className="border border-white/8 bg-negro/40 hover:border-verde-vivo/40 transition-all duration-300 flex flex-col"
            >
              {/* Card header */}
              <div className="p-7 border-b border-white/6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl" aria-hidden="true">{tour.emoji}</span>
                    <div>
                      <p className="text-[9px] tracking-[2px] uppercase text-verde-vivo font-dm mb-1">
                        {tour.tipo}
                      </p>
                      <span className={`text-[9px] tracking-[1px] uppercase border px-2 py-0.5 font-dm ${DIFICULTAD_STYLE[tour.dificultad]}`}>
                        {tour.dificultad}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[9px] tracking-[1px] uppercase text-crema/35 font-dm">desde</p>
                    <p className="font-cormorant text-dorado text-2xl font-light leading-none">
                      ${tour.precio.toLocaleString("es-MX")}
                    </p>
                    <p className="text-[9px] text-crema/35 font-dm mt-0.5">MXN por persona</p>
                    {tour.urgencia && (
                      <p className="text-[9px] text-dorado/80 bg-dorado/10 border border-dorado/20 px-2 py-1 mt-1.5 font-dm leading-tight">
                        {tour.urgencia}
                      </p>
                    )}
                  </div>
                </div>

                <h2 className="font-cormorant text-crema text-xl leading-tight mb-1">
                  {tour.nombre}
                </h2>
                <p className="text-[10px] tracking-[1px] uppercase text-dorado/70 font-dm mb-4">
                  {tour.tagline}
                </p>
                <p className="text-crema/60 text-sm font-dm leading-relaxed">
                  {tour.descripcion}
                </p>
              </div>

              {/* Destinos */}
              <div className="px-7 py-5 border-b border-white/6">
                <p className="text-[9px] tracking-[2px] uppercase text-crema/30 font-dm mb-3">
                  Destinos del recorrido
                </p>
                <ul className="space-y-1.5">
                  {tour.destinos.map((d) => (
                    <li key={d} className="flex items-start gap-2 text-xs text-crema/65 font-dm">
                      <span className="text-verde-vivo mt-0.5 flex-shrink-0">→</span>
                      {d}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Incluye */}
              <div className="px-7 py-5 border-b border-white/6">
                <p className="text-[9px] tracking-[2px] uppercase text-crema/30 font-dm mb-3">
                  Todo incluido
                </p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {tour.incluye.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs text-crema/65 font-dm">
                      <span className="text-dorado mt-0.5 flex-shrink-0">✦</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* FAQ */}
              {TOUR_FAQS[tour.id] && TOUR_FAQS[tour.id].length > 0 && (
                <div className="px-7 py-5 border-t border-white/6">
                  <p className="text-[9px] tracking-[2px] uppercase text-crema/30 font-dm mb-3">
                    Preguntas frecuentes
                  </p>
                  <div className="space-y-0">
                    {TOUR_FAQS[tour.id].map((faq, i) => (
                      <details
                        key={i}
                        className="border-b border-white/6 last:border-0 group"
                      >
                        <summary className="flex items-center justify-between gap-3 py-3 cursor-pointer list-none text-sm text-crema/70 font-dm hover:text-crema transition-colors">
                          {faq.q}
                          <span className="text-crema/30 group-open:rotate-45 transition-transform text-lg flex-shrink-0">+</span>
                        </summary>
                        <p className="text-xs text-crema/50 font-dm pb-3 leading-relaxed">
                          {faq.a}
                        </p>
                      </details>
                    ))}
                  </div>
                </div>
              )}

              {/* Cancelación + Calculadora */}
              <div className="px-7 py-5 border-t border-white/6">
                <p className="flex items-center gap-1.5 text-[10px] text-verde-vivo font-dm mb-3">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  Cancelación gratuita con 48h de anticipación
                </p>
                <TourCalculadora tourName={tour.nombre} precioBase={tour.precio} />
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ── */}
      <section className="bg-verde-profundo/20 border-y border-white/6 py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-[10px] tracking-[4px] uppercase text-verde-vivo mb-4 font-dm">
            Simple y sin complicaciones
          </p>
          <h2
            className="font-cormorant font-light text-crema text-center mb-14"
            style={{ fontSize: "clamp(28px,4vw,44px)" }}
          >
            Cómo <em className="text-dorado">funciona</em>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {COMO_FUNCIONA.map((step) => (
              <div key={step.num} className="text-center">
                <div
                  className="font-cormorant text-dorado/30 leading-none mb-4"
                  style={{ fontSize: "clamp(60px,8vw,80px)" }}
                >
                  {step.num}
                </div>
                <h3 className="font-cormorant text-crema text-xl mb-3">{step.titulo}</h3>
                <p className="text-crema/50 font-dm text-sm leading-relaxed">{step.detalle}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIOS ── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <p className="text-center text-[10px] tracking-[4px] uppercase text-verde-vivo mb-4 font-dm">
          Lo que dicen nuestros viajeros
        </p>
        <h2
          className="font-cormorant font-light text-crema text-center mb-14"
          style={{ fontSize: "clamp(28px,4vw,44px)" }}
        >
          Experiencias <em className="text-dorado">reales</em>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIOS.map((t) => (
            <div key={t.nombre} className="border border-white/8 bg-negro/30 p-6 flex flex-col">
              <p className="text-crema/70 font-dm text-sm leading-relaxed mb-6 flex-1">
                &ldquo;{t.texto}&rdquo;
              </p>
              <div>
                <p className="text-crema font-dm text-sm font-medium">{t.nombre}</p>
                <p className="text-crema/35 font-dm text-[10px] mt-0.5">{t.ciudad}</p>
                <p className="text-verde-vivo font-dm text-[10px] mt-1 tracking-wide">
                  ✓ {t.tour}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-20 px-6 text-center border-t border-white/6">
        <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-4 font-dm">
          ¿Tienes dudas?
        </p>
        <h2
          className="font-cormorant font-light text-crema mb-5"
          style={{ fontSize: "clamp(28px,4vw,48px)" }}
        >
          Escríbenos y te <em className="text-dorado">asesoramos</em>
        </h2>
        <p className="text-crema/50 font-dm text-sm max-w-md mx-auto mb-8">
          Nuestro equipo responde en menos de una hora. Te ayudamos a elegir el tour
          ideal según tus días, grupo y preferencias.
        </p>
        <a
          href={waLink(WA_MESSAGES.tourGeneral)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2.5 bg-[#25D366] hover:bg-[#20ba59] text-white px-10 py-4 text-[11px] tracking-[2px] uppercase font-dm transition-colors duration-200"
        >
          {WA_SVG}
          +52 489 125 1458
        </a>
        <p className="mt-4 text-[10px] text-crema/25 font-dm">
          ✓ Cancelación gratuita con 48h de anticipación · Sin cargos ocultos
        </p>
      </section>

    </main>
  );
}
