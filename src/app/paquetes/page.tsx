import { Metadata } from "next";
import Image from "next/image";
import { Check, Moon, MapPin, Star } from "lucide-react";
import { PaqueteFormCta } from "@/components/PaqueteFormCta";

const SITE = "https://www.huasteca-potosina.com";

export const metadata: Metadata = {
  title: "Paquetes Todo Incluido — Tours + Hotel Paraíso Encantado Xilitla | Huasteca Potosina",
  description:
    "Paquetes que combinan nuestros tours guiados con hospedaje en Hotel Paraíso Encantado Xilitla. Todo incluido: transporte, desayunos, entradas y guías certificados.",
  openGraph: {
    title: "Paquetes Todo Incluido — Huasteca Potosina",
    description: "Tours + Hotel Paraíso Encantado Xilitla. Desde $3,200 MXN/persona.",
    url: `${SITE}/paquetes`,
    siteName: "Tours Huasteca Potosina",
    locale: "es_MX",
    type: "website",
    images: [{ url: `${SITE}/og-image.jpg`, width: 1200, height: 630, alt: "Paquetes Huasteca Potosina" }],
  },
};

// ── Data ────────────────────────────────────────────────────────────────────

interface Paquete {
  id:        string;
  nombre:    string;
  subtitulo: string;
  duracion:  string;
  precio:    number;
  precioLabel: string;
  badge?:    string;
  destacado?: boolean;
  imagen:    string;
  urgencia:  string;
  tours:     string[];
  incluye:   string[];
  valor:     { item: string; precio: string }[];
}

const PAQUETES: Paquete[] = [
  {
    id:          "esencial",
    nombre:      "Paquete Esencial",
    subtitulo:   "Tu primera noche en la Huasteca",
    duracion:    "2 días / 1 noche",
    precio:      5000,
    precioLabel: "por pareja",
    imagen:      "/imagenes/tours/ruta-surrealista-hero.webp",
    urgencia:    "Quedan 4 cupos para el siguiente fin de semana largo",
    tours:       ["Ruta Surrealista — Edward James, Manantiales & Selva (Día 1)"],
    incluye: [
      "1 noche en Hotel Paraíso Encantado Xilitla",
      "Desayuno incluido (Día 2)",
      "Tour Ruta Surrealista completo",
      "Transporte desde tu hotel al tour",
      "Guía certificado NOM-09 SECTUR",
      "Entradas a todas las atracciones",
    ],
    valor: [
      { item: "1 noche hotel (2 pax)",      precio: "$2,800" },
      { item: "Tour Ruta Surrealista",      precio: "$2,600" },
      { item: "Transporte privado",         precio: "$500"   },
      { item: "Entradas + guía",            precio: "$700"   },
    ],
  },
  {
    id:          "aventura",
    nombre:      "Paquete Aventura",
    subtitulo:   "El mejor dúo de la región",
    duracion:    "3 días / 2 noches",
    precio:      9000,
    precioLabel: "por pareja",
    badge:       "Más popular",
    destacado:   true,
    imagen:      "/imagenes/cascada-de-tamul/hero.jpg",
    urgencia:    "Alta demanda — solo 3 lugares disponibles",
    tours: [
      "Expedición Tamul — Sótano, Cañón & Cueva del Agua (Día 2)",
      "Cascadas del Meco — Turquesas, Mirador & El Gran Salto (Día 3)",
    ],
    incluye: [
      "2 noches en Hotel Paraíso Encantado Xilitla",
      "Desayunos ambos días",
      "Tour Expedición Tamul completo",
      "Tour Cascadas del Meco completo",
      "Transporte desde tu hotel a cada tour",
      "Guías certificados NOM-09 SECTUR",
      "Entradas a todas las atracciones",
    ],
    valor: [
      { item: "2 noches hotel (2 pax)",     precio: "$5,600" },
      { item: "Expedición Tamul",           precio: "$2,900" },
      { item: "Cascadas del Meco",          precio: "$3,200" },
      { item: "Transporte 2 días",          precio: "$800"   },
      { item: "Entradas + guías",           precio: "$900"   },
    ],
  },
  {
    id:          "completo",
    nombre:      "Paquete Completo Huasteca",
    subtitulo:   "La experiencia definitiva",
    duracion:    "4 días / 3 noches",
    precio:      12200,
    precioLabel: "por pareja",
    imagen:      "/imagenes/cascadas-minas-viejas/hero.jpg",
    urgencia:    "Cupos limitados — confirma tu fecha hoy",
    tours: [
      "Ruta Surrealista — Edward James (Día 1)",
      "Expedición Tamul — Sótano & Cascada (Día 2)",
      "Paraíso Escalonado o Ruta Acuática (Día 3)",
    ],
    incluye: [
      "3 noches en Hotel Paraíso Encantado Xilitla",
      "Desayunos los 3 días",
      "3 tours completos a elegir",
      "Transporte desde tu hotel a cada tour",
      "Guías certificados NOM-09 SECTUR",
      "Entradas a todas las atracciones",
      "Fotografías y video de cada recorrido",
    ],
    valor: [
      { item: "3 noches hotel (2 pax)",     precio: "$8,400" },
      { item: "3 tours completos",          precio: "$5,800" },
      { item: "Transporte 3 días",          precio: "$1,200" },
      { item: "Fotos + video profesional",  precio: "$1,600" },
      { item: "Entradas + guías",           precio: "$1,200" },
    ],
  },
];

const RESENAS = [
  {
    nombre: "Claudia M.",
    ciudad: "CDMX",
    foto:   "/imagenes/reviews/reviewer-30.jpg",
    texto:  "El Paquete Aventura superó todas mis expectativas. La Expedición Tamul al amanecer es algo que nunca voy a olvidar — ver los pericos salir del sótano con mis propios ojos fue mágico. El hotel es perfecto, y los guías saben exactamente cuándo llegar a cada lugar para la mejor luz.",
    estrellas: 5,
    tour:   "Paquete Aventura",
    color:  "bg-verde-selva",
  },
  {
    nombre: "Roberto & Ana",
    ciudad: "Guadalajara",
    foto:   "/imagenes/reviews/reviewer-31.jpg",
    texto:  "Fuimos con el Paquete Esencial y fue el mejor viaje que hemos hecho en pareja. El Puente de Dios con la luz entrando por el arco... no se puede describir. El hotel Paraíso Encantado tiene un desayuno increíble. Definitivamente volvemos con el Paquete Completo.",
    estrellas: 5,
    tour:   "Paquete Esencial",
    color:  "bg-dorado",
  },
  {
    nombre: "La familia Herrera",
    ciudad: "Monterrey",
    foto:   "/imagenes/reviews/reviewer-32.jpg",
    texto:  "Viajamos con dos niños de 8 y 11 años. Todo estuvo perfectamente coordinado — los guías son pacientes, el ritmo fue ideal para los niños. Las Cascadas del Meco los dejó boquiabiertos. El hotel los trató como reyes. Ya estamos planeando el regreso.",
    estrellas: 5,
    tour:   "Paquete Esencial + extensión",
    color:  "bg-terracota",
  },
];

// ── Card ────────────────────────────────────────────────────────────────────

function PaqueteCard({ p }: { p: Paquete }) {
  const totalValor = p.valor.reduce((acc, v) => {
    const n = parseInt(v.precio.replace(/[^0-9]/g, ""), 10);
    return acc + n;
  }, 0);
  const ahorro = totalValor - p.precio;

  return (
    <article
      className={`relative flex flex-col border overflow-hidden transition-all duration-300 hover:border-verde-vivo/50 ${
        p.destacado ? "border-dorado/50 bg-verde-profundo" : "border-white/10 bg-negro/60"
      }`}
    >
      {p.badge && (
        <div className="absolute top-4 right-4 z-10 bg-dorado text-negro text-[9px] font-dm font-bold tracking-[1.5px] uppercase px-3 py-1.5">
          {p.badge}
        </div>
      )}

      {/* Imagen */}
      <div className="relative h-44 overflow-hidden">
        <Image
          src={p.imagen}
          alt={p.nombre}
          fill
          className="object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-negro/80 to-transparent" />
        <div className="absolute bottom-3 left-4">
          <p className="text-[9px] tracking-[3px] uppercase text-verde-vivo font-dm flex items-center gap-1.5">
            <Moon className="w-3 h-3" /> {p.duracion}
          </p>
        </div>
      </div>

      <div className="px-6 pt-5 pb-3">
        {/* Nombre */}
        <h2 className="font-cormorant font-light text-crema leading-tight mb-1" style={{ fontSize: "clamp(20px,2.5vw,27px)" }}>
          {p.nombre}
        </h2>
        <p className="text-crema/50 font-dm text-xs mb-5">{p.subtitulo}</p>

        {/* Precio + valor */}
        <div className="mb-4">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-cormorant text-dorado" style={{ fontSize: "clamp(26px,3.5vw,36px)" }}>
              ${p.precio.toLocaleString("es-MX")}
            </span>
            <span className="text-crema/40 font-dm text-[10px] ml-1">MXN {p.precioLabel}</span>
          </div>
          {ahorro > 0 && (
            <p className="text-[10px] font-dm text-verde-vivo font-medium">
              ✓ Ahorras ${ahorro.toLocaleString("es-MX")} MXN vs. contratar por separado
            </p>
          )}
        </div>

        {/* Urgencia */}
        <div className="flex items-center gap-1.5 bg-dorado/10 border border-dorado/25 px-3 py-2 mb-5">
          <span className="w-1.5 h-1.5 bg-dorado rounded-full animate-pulse flex-shrink-0" />
          <p className="text-[10px] font-dm text-dorado/90 font-medium">{p.urgencia}</p>
        </div>

        {/* Tours */}
        {p.tours.length > 0 && (
          <div className="mb-4">
            <p className="text-[9px] tracking-[2px] uppercase text-crema/35 font-dm mb-2 flex items-center gap-1.5">
              <MapPin className="w-3 h-3" /> Tours incluidos
            </p>
            <ul className="space-y-1.5">
              {p.tours.map((t) => (
                <li key={t} className="flex items-start gap-2 text-[11px] text-crema/65 font-dm">
                  <Star className="w-3 h-3 text-dorado/70 flex-shrink-0 mt-0.5" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Incluye */}
        <div className="mb-5">
          <p className="text-[9px] tracking-[2px] uppercase text-crema/35 font-dm mb-2">Qué incluye</p>
          <ul className="space-y-1.5">
            {p.incluye.map((item) => (
              <li key={item} className="flex items-start gap-2 text-[11px] text-crema/65 font-dm">
                <Check className="w-3 h-3 text-verde-vivo flex-shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Valor desglosado */}
        <details className="mb-5 border border-white/10">
          <summary className="cursor-pointer px-3 py-2.5 text-[10px] tracking-[1px] uppercase font-dm text-crema/50 hover:text-crema transition-colors list-none flex items-center justify-between">
            Ver desglose de valor incluido
            <span className="text-verde-vivo text-base leading-none">+</span>
          </summary>
          <div className="border-t border-white/8 px-3 py-3 space-y-2">
            {p.valor.map((v) => (
              <div key={v.item} className="flex justify-between text-[11px] font-dm">
                <span className="text-crema/55">{v.item}</span>
                <span className="text-crema/80 font-medium">{v.precio} MXN</span>
              </div>
            ))}
            <div className="flex justify-between text-[11px] font-dm border-t border-white/8 pt-2 mt-1">
              <span className="text-crema/55">Valor total</span>
              <span className="text-crema/80 font-medium line-through">${totalValor.toLocaleString()} MXN</span>
            </div>
            <div className="flex justify-between text-[12px] font-dm font-medium">
              <span className="text-verde-vivo">Precio paquete</span>
              <span className="text-dorado">${p.precio.toLocaleString()} MXN</span>
            </div>
          </div>
        </details>
      </div>

      {/* Mini-form CTA */}
      <div className="mt-auto px-6 pb-6">
        <PaqueteFormCta packageName={p.nombre} price={p.precio} destacado={p.destacado} />
        <p className="text-center text-[9px] text-crema/25 font-dm mt-3">
          Sin pago anticipado · Confirmas disponibilidad antes de reservar
        </p>
      </div>
    </article>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function PaquetesPage() {
  return (
    <main id="main-content" className="min-h-screen bg-negro">

      {/* ── HERO CON IMAGEN DE FONDO ── */}
      <section className="relative px-6 pt-36 pb-28 overflow-hidden min-h-[520px] flex items-center">
        <Image
          src="/imagenes/cascada-de-tamul/hero.jpg"
          alt="Cascada de Tamul — Huasteca Potosina"
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-negro/70 via-negro/55 to-negro/85" />

        <div className="relative z-10 max-w-4xl mx-auto text-center w-full">
          <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-4 font-dm">
            ✦ Tours + Hospedaje · Todo Coordinado
          </p>
          <h1 className="font-cormorant font-light text-crema mb-5 leading-tight" style={{ fontSize: "clamp(38px,6vw,70px)" }}>
            Paquetes
            <em className="text-dorado block italic"> Todo Incluido</em>
          </h1>
          <p className="text-crema/75 font-dm text-sm leading-relaxed max-w-2xl mx-auto mb-8">
            Combinamos nuestros tours guiados con hospedaje en{" "}
            <strong className="text-crema">Hotel Paraíso Encantado Xilitla</strong>.
            Tú solo preocúpate por llegar — nosotros nos encargamos del resto.
          </p>

          {/* Google Rating */}
          <div className="inline-flex items-center gap-3 bg-negro/60 backdrop-blur-sm border border-white/15 px-5 py-3">
            <div>
              <div className="flex items-center gap-1 mb-0.5">
                {"★★★★★".split("").map((s, i) => (
                  <span key={i} className="text-dorado text-sm">{s}</span>
                ))}
              </div>
              <p className="text-[9px] font-dm text-crema/50 text-left">Google Reviews</p>
            </div>
            <div className="border-l border-white/15 pl-3">
              <p className="font-cormorant text-dorado text-2xl leading-none">4.9</p>
              <p className="text-[9px] font-dm text-crema/50">+320 reseñas</p>
            </div>
            <div className="border-l border-white/15 pl-3">
              <p className="font-cormorant text-dorado text-2xl leading-none">4.8</p>
              <p className="text-[9px] font-dm text-crema/50">Booking · 180 op.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── RESEÑAS ── */}
      <section className="border-b border-white/6 bg-negro/80 py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-[10px] tracking-[4px] uppercase text-crema/30 font-dm text-center mb-8">
            Lo que dicen quienes ya vivieron la experiencia
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {RESENAS.map((r) => (
              <div key={r.nombre} className="border border-white/8 bg-negro/50 p-5">
                <div className="flex gap-0.5 mb-3">
                  {[...Array(r.estrellas)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-dorado text-dorado" />
                  ))}
                </div>
                <p className="font-dm text-xs text-crema/70 leading-relaxed italic mb-4">
                  &ldquo;{r.texto}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <img
                    src={r.foto}
                    alt={r.nombre}
                    className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-white/15"
                    loading="lazy"
                  />
                  <div>
                    <p className="font-dm text-xs text-crema/80 font-medium leading-none">{r.nombre}</p>
                    <p className="text-[9px] font-dm text-crema/35 mt-0.5">{r.ciudad} · {r.tour}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── NOTA INFORMATIVA ── */}
      <div className="border-b border-white/6 bg-dorado/8">
        <div className="max-w-5xl mx-auto px-6 py-3.5 text-center">
          <p className="text-[11px] text-dorado/80 font-dm">
            Reserva por WhatsApp y te confirmamos disponibilidad del hotel en menos de 1 hora. Sin pago anticipado.
          </p>
        </div>
      </div>

      {/* ── PAQUETES ── */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {PAQUETES.map((p) => (
            <PaqueteCard key={p.id} p={p} />
          ))}
        </div>
      </section>

      {/* ── HOTEL INFO ── */}
      <section className="bg-verde-profundo/30 border-t border-white/6 py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-3 font-dm">El hotel de los paquetes</p>
          <h2 className="font-cormorant font-light text-crema mb-4 leading-tight" style={{ fontSize: "clamp(26px,4vw,44px)" }}>
            Hotel Paraíso Encantado Xilitla
          </h2>
          <p className="text-crema/55 font-dm text-sm leading-relaxed max-w-2xl mx-auto mb-10">
            Ubicado a minutos del Jardín Surrealista de Edward James en Xilitla, Pueblo Mágico.
            Habitaciones con vista a la selva, desayunos con platillos típicos y la mejor base
            para explorar la Huasteca Potosina.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {[
              { icon: "🌿", text: "Vista a la selva tropical" },
              { icon: "🍳", text: "Desayunos con platillos típicos" },
              { icon: "📍", text: "5 min del Jardín de Edward James" },
            ].map(({ icon, text }) => (
              <div key={text} className="border border-white/10 bg-negro/30 px-4 py-4 text-center">
                <span className="text-2xl block mb-2">{icon}</span>
                <p className="text-[11px] text-crema/60 font-dm">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="font-cormorant text-crema text-2xl mb-8 text-center">Preguntas frecuentes</h2>
        <div className="space-y-4">
          {[
            { q: "¿Puedo reservar los tours sin el hotel?", a: "Sí. Todos nuestros tours están disponibles de forma individual en la sección /tours. Los paquetes son para quienes quieren combinar tour + hospedaje sin complicaciones." },
            { q: "¿Cómo confirman la disponibilidad del hotel?", a: "Al enviarnos tu consulta por WhatsApp, verificamos la disponibilidad de Paraíso Encantado Xilitla en tiempo real. Te respondemos en menos de 1 hora." },
            { q: "¿El precio incluye el traslado al hotel?", a: "El traslado incluido es del hotel al punto de inicio del tour y de regreso. El traslado hasta Xilitla no está incluido en el precio base." },
            { q: "¿Puedo personalizar los tours del paquete?", a: "Completamente. Escríbenos con tus fechas y preferencias y armamos el paquete ideal para tu grupo, incluyendo tours no listados aquí." },
          ].map((faq) => (
            <details key={faq.q} className="border border-white/10 bg-negro/40">
              <summary className="px-5 py-4 cursor-pointer text-crema/80 font-dm text-sm hover:text-crema transition-colors list-none flex items-center justify-between gap-3">
                {faq.q}
                <span className="text-verde-vivo flex-shrink-0 text-lg leading-none">+</span>
              </summary>
              <div className="px-5 pb-5 border-t border-white/8 pt-4">
                <p className="text-crema/55 font-dm text-sm leading-relaxed">{faq.a}</p>
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="bg-verde-profundo/40 border-t border-white/6 py-16 px-6 text-center">
        <h2 className="font-cormorant text-crema text-2xl mb-3">¿No encuentras el paquete ideal?</h2>
        <p className="text-crema/50 font-dm text-sm mb-8 max-w-md mx-auto">
          Armamos el itinerario exacto que necesitas. Escríbenos y en menos de 1 hora tienes tu propuesta.
        </p>
        <a
          href={`https://wa.me/524891251458?text=${encodeURIComponent("Hola, quisiera un paquete personalizado de tours + hotel en la Huasteca Potosina. ¿Me pueden ayudar?")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2.5 bg-[#25D366] hover:bg-[#20ba59] text-white px-10 py-4 text-[11px] tracking-[2px] uppercase font-dm transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.532 5.86L.054 23.447a.75.75 0 0 0 .916.99l5.764-1.511A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.693 9.693 0 0 1-4.953-1.357l-.355-.211-3.68.965.981-3.585-.232-.369A9.712 9.712 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/></svg>
          Armar paquete personalizado →
        </a>
      </section>

    </main>
  );
}
