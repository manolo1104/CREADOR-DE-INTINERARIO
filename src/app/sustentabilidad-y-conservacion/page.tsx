import { Metadata } from "next";
import Link from "next/link";
import { Leaf, Droplet, Users, TreePine, Heart, Shield, Sun, Recycle } from "lucide-react";

const SITE = "https://www.huasteca-potosina.com";
export const metadata: Metadata = {
  title: "Sustentabilidad y Conservación — Tours Huasteca Potosina",
  description: "Nuestro compromiso con la conservación de la Huasteca Potosina: turismo responsable, apoyo a comunidades locales y protección de ecosistemas únicos de México.",
  openGraph: {
    title: "Sustentabilidad y Conservación — Tours Huasteca Potosina",
    description: "Turismo responsable, cero plásticos, empleo local 100% y fondo de conservación activo en la Huasteca Potosina.",
    url: `${SITE}/sustentabilidad-y-conservacion`,
    siteName: "Tours Huasteca Potosina",
    locale: "es_MX",
    type: "website",
    images: [{ url: `${SITE}/og-image.jpg`, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", title: "Sustentabilidad — Tours Huasteca Potosina", description: "Turismo responsable y conservación de ecosistemas.", images: [`${SITE}/og-image.jpg`] },
};

const COMPROMISOS = [
  {
    Icon: TreePine,
    titulo: "Protección de ecosistemas",
    texto:
      "Operamos exclusivamente en senderos autorizados por SEMARNAT y ejidos locales. Nunca llevamos grupos a zonas de anidación activa ni áreas de recuperación ecológica.",
  },
  {
    Icon: Users,
    titulo: "Empleo local 100%",
    texto:
      "Todos nuestros guías, cocineros y transportistas son originarios de la región. El 90% de cada pago se queda en comunidades huastecas.",
  },
  {
    Icon: Droplet,
    titulo: "Cero plásticos de un solo uso",
    texto:
      "Desde 2022 eliminamos las botellas de plástico de todos nuestros tours. Cada viajero recibe una cantimplora reutilizable con su kit de bienvenida.",
  },
  {
    Icon: Recycle,
    titulo: "Residuos cero en campo",
    texto:
      "Seguimos la regla 'deja sin huella': todo lo que entra sale. Nuestros guías llevan bolsas de recolección y educamos a cada grupo sobre manejo de residuos.",
  },
  {
    Icon: Sun,
    titulo: "Límite de aforo",
    texto:
      "Ningún grupo nuestro supera 12 personas. Esto reduce el impacto por pisoteo, la contaminación sonora y el estrés en fauna silvestre.",
  },
  {
    Icon: Heart,
    titulo: "Donación por tour",
    texto:
      "$30 MXN de cada tour se destinan al Fondo de Conservación Huasteca, que financia reforestación con especies nativas y limpieza de ríos.",
  },
];

const ACCIONES = [
  { año: "2019", accion: "Primer tour sin plásticos de un solo uso en la Huasteca Potosina" },
  { año: "2021", accion: "Alianza con ejido Tamul para protección de zona de anidación de vencejos" },
  { año: "2022", accion: "Eliminación total de botellas plásticas — kit cantimplora incluido en todos los tours" },
  { año: "2023", accion: "Creación del Fondo de Conservación Huasteca con 3 ejidos socios" },
  { año: "2024", accion: "Reforestación de 2.4 hectáreas de galería riparia en el Río Tampaón" },
  { año: "2025", accion: "Certificación de guías en primeros auxilios para vida silvestre" },
];

export default function SustentabilidadPage() {
  return (
    <main id="main-content" className="min-h-screen bg-crema">

      {/* ── HERO ── */}
      <section className="relative bg-verde-profundo px-6 pt-36 pb-28 text-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(90,158,42,0.3),transparent_70%)] pointer-events-none" />
        <div className="relative z-10 max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 text-[10px] tracking-[4px] uppercase text-lima border border-lima/30 px-4 py-1.5 mb-6 font-dm">
            <Leaf className="w-3 h-3" /> Turismo Responsable
          </span>
          <h1 className="font-cormorant font-light text-crema mb-6 leading-tight" style={{ fontSize: "clamp(36px,6vw,70px)" }}>
            Sustentabilidad
            <em className="text-lima block italic"> y Conservación</em>
          </h1>
          <p className="text-crema/65 font-dm text-sm leading-relaxed max-w-2xl mx-auto">
            La Huasteca Potosina es uno de los ecosistemas más frágiles y extraordinarios de México.
            Nuestra responsabilidad es asegurarnos de que siga siendo así para las próximas generaciones.
          </p>
        </div>
      </section>

      {/* ── DECLARACIÓN ── */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <p className="text-[10px] tracking-[4px] uppercase text-verde-selva mb-4 font-dm">Nuestra filosofía</p>
        <h2 className="font-cormorant font-light text-verde-profundo mb-8" style={{ fontSize: "clamp(28px,4vw,48px)" }}>
          El turismo que <em className="text-dorado">protege</em>, no que destruye
        </h2>
        <div className="space-y-5 text-negro/65 font-dm text-sm leading-relaxed text-left max-w-2xl mx-auto">
          <p>
            Cada año la Huasteca Potosina recibe cientos de miles de visitantes. El turismo masivo
            sin regulación ha provocado erosión en senderos, contaminación de cuerpos de agua y
            perturbación de especies endémicas como los vencejos del Sótano de las Golondrinas.
          </p>
          <p>
            Nosotros elegimos un camino diferente: grupos pequeños, guías locales certificados,
            cero impacto ambiental y una parte de cada pago destinada directamente a la conservación
            de los ecosistemas que hacen única a esta región.
          </p>
          <p>
            Viajar con nosotros es votar por la Huasteca que queremos para el futuro.
          </p>
        </div>
      </section>

      {/* ── COMPROMISOS ── */}
      <section className="bg-white border-y border-negro/8 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-[10px] tracking-[4px] uppercase text-verde-selva mb-3 font-dm text-center">Lo que hacemos</p>
          <h2 className="font-cormorant font-light text-verde-profundo text-center mb-12" style={{ fontSize: "clamp(28px,4vw,46px)" }}>
            Nuestros <em className="text-dorado">compromisos</em>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {COMPROMISOS.map((c) => (
              <div key={c.titulo} className="border border-verde-selva/15 bg-crema/60 p-6 hover:border-verde-selva/40 transition-colors">
                <c.Icon className="w-7 h-7 text-verde-selva mb-4" aria-hidden="true" />
                <h3 className="font-cormorant text-verde-profundo text-lg mb-2 leading-tight">{c.titulo}</h3>
                <p className="text-negro/55 font-dm text-sm leading-relaxed">{c.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LÍNEA DE TIEMPO ── */}
      <section className="max-w-3xl mx-auto px-6 py-20">
        <p className="text-[10px] tracking-[4px] uppercase text-verde-selva mb-3 font-dm text-center">Historia</p>
        <h2 className="font-cormorant font-light text-verde-profundo text-center mb-12" style={{ fontSize: "clamp(28px,4vw,44px)" }}>
          Acciones <em className="text-dorado">concretas</em>
        </h2>
        <div className="relative">
          <div className="absolute left-14 top-0 bottom-0 w-px bg-verde-selva/20" />
          <div className="space-y-8">
            {ACCIONES.map((a) => (
              <div key={a.año} className="flex gap-6 items-start">
                <span className="w-12 text-right font-cormorant text-dorado text-lg font-light flex-shrink-0">{a.año}</span>
                <div className="w-3 h-3 rounded-full bg-verde-selva flex-shrink-0 mt-1.5 relative z-10" />
                <p className="text-negro/65 font-dm text-sm leading-relaxed">{a.accion}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FONDO DE CONSERVACIÓN ── */}
      <section className="bg-verde-profundo py-20 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <Shield className="w-10 h-10 text-lima mx-auto mb-6" aria-hidden="true" />
          <h2 className="font-cormorant font-light text-crema mb-4" style={{ fontSize: "clamp(28px,4vw,46px)" }}>
            Fondo de <em className="text-lima">Conservación Huasteca</em>
          </h2>
          <p className="text-crema/60 font-dm text-sm leading-relaxed mb-8">
            $30 MXN de cada tour se destinan automáticamente al fondo. En 2025 financiamos la
            reforestación de 2.4 hectáreas y la limpieza de 12 km del Río Tampaón junto con
            3 ejidos locales.
          </p>
          <Link
            href="/tours"
            className="inline-block bg-lima text-negro px-10 py-4 text-sm tracking-[2px] uppercase font-dm font-medium hover:bg-verde-vivo hover:text-crema transition-colors duration-300"
          >
            Reservar un tour →
          </Link>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 px-6 text-center bg-crema">
        <p className="text-negro/50 font-dm text-sm mb-4">¿Tienes preguntas sobre nuestras prácticas sustentables?</p>
        <a
          href="https://wa.me/524891251458?text=Hola%2C%20quisiera%20saber%20m%C3%A1s%20sobre%20sustentabilidad"
          target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white px-8 py-3.5 text-[11px] tracking-[2px] uppercase font-dm transition-colors"
        >
          Hablar con el equipo →
        </a>
      </section>

    </main>
  );
}
