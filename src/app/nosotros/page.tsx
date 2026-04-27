import { Metadata } from "next";
import Link from "next/link";
import {
  Award, Calendar, Globe, Stethoscope, Shield, Users,
  Heart, Leaf, Star, CheckCircle2, MapPin, TrendingUp,
} from "lucide-react";

const SITE = "https://www.huasteca-potosina.com";
export const metadata: Metadata = {
  title: "Quiénes Somos — Guías Locales Certificados | Tours Huasteca Potosina",
  description: "Somos una empresa familiar de guías nacidos en la Huasteca Potosina. +8 años de experiencia, certificación NOM-09 SECTUR y el compromiso de mostrarte la región como ningún otro puede hacerlo.",
  openGraph: {
    title: "Quiénes Somos — Tours Huasteca Potosina",
    description: "Empresa familiar de guías locales certificados NOM-09 SECTUR. +8 años, 4.9 estrellas en Google, cero incidentes.",
    url: `${SITE}/nosotros`,
    siteName: "Tours Huasteca Potosina",
    locale: "es_MX",
    type: "website",
    images: [{ url: `${SITE}/og-image.jpg`, width: 1200, height: 630, alt: "Equipo Tours Huasteca Potosina" }],
  },
  twitter: { card: "summary_large_image", title: "Quiénes Somos — Tours Huasteca Potosina", description: "Guías locales certificados con +8 años de experiencia.", images: [`${SITE}/og-image.jpg`] },
};

const WA = "https://wa.me/524891251458?text=Hola%2C%20quisiera%20saber%20m%C3%A1s%20sobre%20el%20equipo.";

const NUMEROS = [
  { num: "+500",         label: "Viajeros guiados" },
  { num: "8+",           label: "Años de experiencia" },
  { num: "4.9 ★",        label: "Calificación Google" },
  { num: "0",            label: "Incidentes de seguridad" },
];

const VALORES = [
  {
    Icon: Heart,
    titulo: "Pasión local",
    texto: "Nacimos aquí. La Huasteca no es un trabajo para nosotros — es nuestra casa, nuestra familia y nuestro orgullo.",
  },
  {
    Icon: Shield,
    titulo: "Seguridad primero",
    texto: "Todos nuestros guías cuentan con certificación en primeros auxilios, rescate acuático y manejo de grupos en entornos naturales.",
  },
  {
    Icon: Leaf,
    titulo: "Turismo responsable",
    texto: "Operamos con aforos limitados, cero plásticos y donamos $30 MXN de cada tour al Fondo de Conservación Huasteca.",
  },
  {
    Icon: Star,
    titulo: "Experiencia auténtica",
    texto: "No seguimos guiones. Cada recorrido se adapta al ritmo y los intereses de tu grupo para vivir la Huasteca de verdad.",
  },
  {
    Icon: Users,
    titulo: "Grupos pequeños",
    texto: "Máximo 12 personas por grupo. Atención personalizada, acceso a rincones exclusivos y una experiencia que los autobuses turísticos nunca pueden ofrecer.",
  },
  {
    Icon: TrendingUp,
    titulo: "Mejora constante",
    texto: "Cada temporada actualizamos nuestros protocolos, rutas y equipamiento. Nuestros guías se capacitan continuamente con SECTUR y organizaciones ambientales.",
  },
];

const CERTIFICACIONES = [
  { Icon: Award,       titulo: "NOM-09 SECTUR",          sub: "Guías de turismo de aventura certificados por la Secretaría de Turismo de México" },
  { Icon: Stethoscope, titulo: "Primeros Auxilios",       sub: "Cruz Roja Mexicana — renovación anual obligatoria" },
  { Icon: Globe,       titulo: "Guías bilingües",         sub: "Español nativo · Inglés básico–intermedio en todos los recorridos" },
  { Icon: Shield,      titulo: "Seguro de viajero",       sub: "Responsabilidad civil y asistencia médica incluida en todos los tours" },
  { Icon: CheckCircle2,"titulo": "Rescate acuático",      sub: "Certificación especializada para tours en cascadas y ríos" },
  { Icon: Calendar,    titulo: "8+ años operando",        sub: "Cientos de grupos guiados con historial impecable de seguridad" },
];

const HISTORIA = [
  { año: "2016", hito: "Fundación como guías independientes en Ciudad Valles con 3 destinos y un vehículo." },
  { año: "2018", hito: "Certificación NOM-09 SECTUR. Primer tour privado a la Cascada de Tamul con acceso exclusivo al ejido." },
  { año: "2020", hito: "A pesar de la pandemia, mantuvimos operaciones mínimas para apoyar a las comunidades locales." },
  { año: "2021", hito: "Expansión a Xilitla y Las Pozas. Alianza con ejido Tamul para acceso exclusivo madrugada al Sótano de las Golondrinas." },
  { año: "2022", hito: "Eliminación total de plásticos de un solo uso. Lanzamiento del kit de bienvenida con cantimplora." },
  { año: "2023", hito: "492 reseñas verificadas en Google Maps. Calificación promedio de 4.9 estrellas." },
  { año: "2024", hito: "Creación del Fondo de Conservación Huasteca junto con 3 ejidos locales." },
  { año: "2025", hito: "Lanzamiento de la plataforma digital con planificador de viajes con inteligencia artificial." },
];

const WA_SVG = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
    className="w-4 h-4 flex-shrink-0" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.532 5.86L.054 23.447a.75.75 0 0 0 .916.99l5.764-1.511A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.693 9.693 0 0 1-4.953-1.357l-.355-.211-3.68.965.981-3.585-.232-.369A9.712 9.712 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
  </svg>
);

export default function NosotrosPage() {
  return (
    <main id="main-content" className="min-h-screen bg-crema">

      {/* ── HERO ── */}
      <section className="relative bg-verde-profundo px-6 pt-36 pb-28 text-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_40%,rgba(58,107,26,0.25),transparent_70%)] pointer-events-none" />
        <div className="relative z-10 max-w-3xl mx-auto">
          <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-4 font-dm">
            ✦ Quiénes somos
          </p>
          <h1 className="font-cormorant font-light text-crema mb-6 leading-tight" style={{ fontSize: "clamp(36px,6vw,68px)" }}>
            Una empresa familiar
            <em className="text-dorado block italic"> nacida en la Huasteca</em>
          </h1>
          <p className="text-crema/65 font-dm text-sm leading-relaxed max-w-xl mx-auto">
            No somos una agencia de escritorio. Somos guías locales que crecimos explorando cada
            sendero, cascada y comunidad de la región. Nuestra misión es que la conozcas como
            nosotros la conocemos.
          </p>
        </div>
      </section>

      {/* ── NÚMEROS ── */}
      <section className="bg-white border-b border-negro/8 py-12 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {NUMEROS.map((n) => (
            <div key={n.label} className="p-4">
              <div className="font-cormorant text-dorado font-light leading-none mb-2" style={{ fontSize: "clamp(36px,5vw,52px)" }}>
                {n.num}
              </div>
              <div className="text-[10px] tracking-[2px] uppercase text-negro/65 font-dm">{n.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── NUESTRA HISTORIA ── */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div>
            <p className="text-[10px] tracking-[4px] uppercase text-verde-selva mb-4 font-dm">Nuestra historia</p>
            <h2 className="font-cormorant font-light text-verde-profundo mb-6" style={{ fontSize: "clamp(28px,4vw,44px)" }}>
              De guías locales a <em className="text-dorado">referentes de la región</em>
            </h2>
            <div className="space-y-4 text-negro/60 font-dm text-sm leading-relaxed">
              <p>
                Todo empezó en 2016 con una camioneta, tres destinos y la certeza de que
                la Huasteca Potosina merecía ser conocida por el mundo. Éramos una familia
                de guías locales que habíamos crecido pescando en el Tampaón, escalando
                los bordes del Sótano y conociendo a los abuelos de cada comunidad.
              </p>
              <p>
                No teníamos oficina ni plataforma digital. Teníamos algo mejor: el conocimiento
                de la tierra y la confianza de los ejidos que nos permitían llevar visitantes
                a lugares donde los autobuses turísticos nunca llegan.
              </p>
              <p>
                Hoy, ocho años después, somos la operadora turística mejor calificada de la
                región en Google Maps, con 492 reseñas verificadas y una calificación de 4.9 estrellas.
                Pero seguimos siendo la misma familia que empezó con una camioneta.
              </p>
            </div>
          </div>

          {/* Línea de tiempo */}
          <div className="relative pl-8">
            <div className="absolute left-0 top-0 bottom-0 w-px bg-verde-selva/20" />
            <div className="space-y-6">
              {HISTORIA.map((h) => (
                <div key={h.año} className="relative">
                  <div className="absolute -left-10 w-3 h-3 rounded-full bg-verde-selva top-1" />
                  <span className="font-cormorant text-dorado text-base font-light block mb-1">{h.año}</span>
                  <p className="text-negro/60 font-dm text-sm leading-relaxed">{h.hito}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── VALORES ── */}
      <section className="bg-white border-y border-negro/8 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-[10px] tracking-[4px] uppercase text-verde-selva mb-3 font-dm text-center">Lo que nos define</p>
          <h2 className="font-cormorant font-light text-verde-profundo text-center mb-12" style={{ fontSize: "clamp(28px,4vw,46px)" }}>
            Nuestros <em className="text-dorado">valores</em>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {VALORES.map((v) => (
              <div key={v.titulo} className="border border-negro/8 bg-crema/60 p-6 hover:border-verde-selva/30 transition-colors">
                <v.Icon className="w-6 h-6 text-verde-selva mb-4" aria-hidden="true" />
                <h3 className="font-cormorant text-verde-profundo text-lg mb-2 leading-tight">{v.titulo}</h3>
                <p className="text-negro/55 font-dm text-sm leading-relaxed">{v.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CERTIFICACIONES ── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-[10px] tracking-[4px] uppercase text-verde-selva mb-3 font-dm text-center">Respaldo oficial</p>
          <h2 className="font-cormorant font-light text-verde-profundo text-center mb-12" style={{ fontSize: "clamp(28px,4vw,46px)" }}>
            Certificaciones y <em className="text-dorado">garantías</em>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CERTIFICACIONES.map((c) => (
              <div key={c.titulo} className="border border-dorado/15 bg-white p-5 flex gap-4 items-start">
                <c.Icon className="w-6 h-6 text-dorado/70 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <h3 className="font-cormorant text-verde-profundo text-base mb-1 leading-tight">{c.titulo}</h3>
                  <p className="text-[11px] text-negro/65 font-dm leading-relaxed">{c.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BADGES DE CONFIANZA ── */}
      <section className="bg-arena/40 border-y border-negro/8 py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-[10px] tracking-[3px] uppercase text-negro/40 font-dm text-center mb-8">Reconocimientos</p>
          <div className="flex flex-wrap items-center justify-center gap-8">
            <div className="flex flex-col items-center gap-2 opacity-75 hover:opacity-100 transition-opacity">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/tripadvisor.svg" alt="TripAdvisor Travellers Choice" className="h-12 w-auto" />
              <span className="text-[9px] tracking-[1px] uppercase font-dm text-negro/65">Travellers Choice</span>
            </div>
            <div className="flex flex-col items-center gap-2 opacity-75 hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-2 bg-white border border-negro/10 rounded-lg px-4 py-2 shadow-sm">
                <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <div>
                  <p className="text-[11px] font-dm text-negro/70 font-medium leading-none">Top Rated</p>
                  <div className="flex gap-0.5 mt-1">
                    {[1,2,3,4,5].map(i => (
                      <svg key={i} className="w-2.5 h-2.5 text-dorado fill-current" viewBox="0 0 20 20" aria-hidden="true">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                      </svg>
                    ))}
                  </div>
                </div>
              </div>
              <span className="text-[9px] tracking-[1px] uppercase font-dm text-negro/65">4.9 · 492 reseñas</span>
            </div>
            <div className="flex flex-col items-center gap-2 opacity-75 hover:opacity-100 transition-opacity">
              <div className="border-2 border-negro/20 rounded-lg px-5 py-3 text-center">
                <p className="text-[11px] font-dm text-negro/70 font-semibold tracking-wider uppercase">SECTUR</p>
                <p className="text-[9px] font-dm text-negro/40 mt-0.5">Certificado NOM-09</p>
              </div>
              <span className="text-[9px] tracking-[1px] uppercase font-dm text-negro/65">Guías oficiales</span>
            </div>
            <div className="flex flex-col items-center gap-2 opacity-75 hover:opacity-100 transition-opacity">
              <div className="bg-[#25D366]/10 border border-[#25D366]/30 rounded-lg px-4 py-2.5 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#25D366]" />
                <span className="text-[11px] font-dm text-negro/70 font-medium">Negocio Verificado</span>
              </div>
              <span className="text-[9px] tracking-[1px] uppercase font-dm text-negro/65">Google Maps</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-6 text-center bg-crema">
        <div className="max-w-2xl mx-auto">
          <p className="text-[10px] tracking-[4px] uppercase text-verde-selva mb-4 font-dm">Hablemos</p>
          <h2 className="font-cormorant font-light text-verde-profundo mb-6" style={{ fontSize: "clamp(28px,4vw,48px)" }}>
            ¿Preguntas para nuestro equipo?
          </h2>
          <p className="text-negro/55 font-dm text-sm mb-10 leading-relaxed">
            Respondemos en menos de una hora, todos los días. Sin bots, sin esperas.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={WA}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white px-8 py-4 text-[11px] tracking-[2px] uppercase font-dm transition-colors duration-200"
            >
              {WA_SVG}
              Hablar con el equipo →
            </a>
            <Link
              href="/tours"
              className="inline-flex items-center justify-center border border-negro/20 hover:border-verde-selva/40 text-negro/60 hover:text-verde-selva px-8 py-4 text-[11px] tracking-[2px] uppercase font-dm transition-all duration-200"
            >
              Ver nuestros tours
            </Link>
          </div>
        </div>
      </section>

    </main>
  );
}
