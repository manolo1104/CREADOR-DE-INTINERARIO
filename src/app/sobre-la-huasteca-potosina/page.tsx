import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { MapPin, Thermometer, Calendar, Globe, Mountain, Droplet } from "lucide-react";

export const metadata: Metadata = {
  title: "Sobre la Huasteca Potosina — Historia, Cultura y Geografía",
  description:
    "Todo lo que necesitas saber sobre la Huasteca Potosina: geografía, clima, cultura Teenek, gastronomía, historia y los mejores momentos para visitar.",
};

const DATOS = [
  { Icon: MapPin,       label: "Ubicación",    valor: "San Luis Potosí, México" },
  { Icon: Mountain,     label: "Altitud",       valor: "50 – 2,000 msnm" },
  { Icon: Thermometer,  label: "Temperatura",   valor: "22 – 34°C promedio" },
  { Icon: Calendar,     label: "Mejor época",   valor: "Nov – Mayo" },
  { Icon: Globe,        label: "Idiomas",        valor: "Español · Teenek (Huasteco)" },
  { Icon: Droplet,      label: "Ríos",           valor: "Tampaón, Axtla, Gallinas, Moctezuma" },
];

const DESTINOS_ICONO = [
  { nombre: "Cascada de Tamul",           desc: "La cascada más alta de la región, 105 metros sobre el Río Tampaón.",    img: "/imagenes/cascada-de-tamul/hero.jpg" },
  { nombre: "Las Pozas de Edward James",  desc: "Jardín surrealista único en el mundo construido en la selva de Xilitla.", img: "/imagenes/las-pozas-jardin-surrealista/hero.webp" },
  { nombre: "Sótano de las Golondrinas",  desc: "El abismo aéreo más profundo del mundo. Hogar de miles de vencejos.",    img: "/imagenes/sotano-de-las-golondrinas/hero.jpg" },
  { nombre: "Cascadas de Micos",          desc: "7 cascadas escalonadas en un paraje de selva tropical exuberante.",      img: "/imagenes/cascadas-de-micos/hero.webp" },
];

const SECCIONES = [
  {
    titulo: "Geografía y naturaleza",
    texto: `La Huasteca Potosina ocupa la franja nororiental del estado de San Luis Potosí,
    donde la Sierra Madre Oriental desciende abruptamente hacia la llanura costera. Este desnivel
    geográfico crea uno de los paisajes más dramáticos de México: ríos que corren turquesas sobre
    lecho de roca caliza, cañones profundos tallados por millones de años de erosión, y selvas
    tropicales que albergan cientos de especies endémicas.

    El sistema kárstico de la región produce fenómenos únicos: sótanos verticales que cortan la
    tierra por cientos de metros, manantiales de agua cristalina que emergen de la roca, y cuevas
    con formaciones geológicas milenarias. La biodiversidad es extraordinaria — más de 3,000 especies
    de plantas y cientos de aves registradas en un territorio relativamente pequeño.`,
  },
  {
    titulo: "Historia y cultura Teenek",
    texto: `La Huasteca ha sido habitada por más de 3,000 años. La cultura Teenek (también llamada
    Huasteca) desarrolló aquí una de las civilizaciones mesoamericanas más sofisticadas, con
    arquitectura monumental visible en la zona arqueológica de Tamtoc, considerada uno de los
    centros ceremoniales más importantes del México prehispánico.

    Los Teenek resistieron la conquista española más que muchos otros pueblos, y su cultura
    permanece viva hoy: el huapango huasteco está declarado Patrimonio Cultural Inmaterial por
    la UNESCO, y las artesanías bordadas a mano conservan diseños que datan de siglos antes
    de la colonización. La gastronomía local — el zacahuil, los bocoles, las enchiladas huastecas
    — es igualmente antigua e incomparable.`,
  },
  {
    titulo: "Gastronomía",
    texto: `La cocina huasteca es una de las más distintivas de México. El zacahuil es su pieza
    maestra: un tamal gigante de hasta 3 metros de largo cocido en hoyo de tierra durante toda
    la noche de los sábados. Los bocoles son tortillas gruesas de masa con frijol negro integrado,
    fritas en comal. Las enchiladas huastecas llevan cecina de res y queso fresco local.

    El café de altura cultivado en las faldas de la sierra de Xilitla es excepcional — orgánico,
    de sombra, con notas de chocolate y frutos rojos. El aguardiente de caña artesanal de la
    región, conocido como "charanda potosina", acompaña las fiestas patronales de cada comunidad.`,
  },
];

export default function SobreLaHuastecaPage() {
  return (
    <main id="main-content" className="min-h-screen bg-crema">

      {/* ── HERO ── */}
      <section className="relative min-h-[65vh] flex items-end overflow-hidden">
        <Image
          src="/imagenes/cascada-de-tamul/hero-mobile.jpg"
          alt="Huasteca Potosina — Cascada de Tamul"
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-negro/80 via-negro/30 to-transparent" />
        <div className="relative z-10 px-6 pb-16 max-w-4xl">
          <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-4 font-dm">
            ✦ San Luis Potosí · México
          </p>
          <h1 className="font-cormorant font-light text-crema leading-tight" style={{ fontSize: "clamp(40px,7vw,80px)" }}>
            La Huasteca
            <em className="text-dorado block italic"> Potosina</em>
          </h1>
          <p className="text-crema/70 font-dm text-sm mt-4 max-w-xl leading-relaxed">
            Una región donde la selva, las cascadas turquesas y una cultura milenaria conviven
            en uno de los paisajes más extraordinarios de México.
          </p>
        </div>
      </section>

      {/* ── DATOS RÁPIDOS ── */}
      <section className="bg-white border-b border-negro/8 py-10 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {DATOS.map((d) => (
            <div key={d.label} className="text-center p-4 border border-negro/8 bg-crema/50">
              <d.Icon className="w-5 h-5 text-verde-selva mx-auto mb-2" aria-hidden="true" />
              <p className="text-[9px] tracking-[2px] uppercase text-negro/40 font-dm mb-1">{d.label}</p>
              <p className="text-sm font-dm text-negro/75 font-medium leading-tight">{d.valor}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECCIONES EDITORIALES ── */}
      <section className="max-w-3xl mx-auto px-6 py-20 space-y-16">
        {SECCIONES.map((s) => (
          <div key={s.titulo}>
            <h2 className="font-cormorant font-light text-verde-profundo mb-6" style={{ fontSize: "clamp(26px,3.5vw,40px)" }}>
              {s.titulo}
            </h2>
            <div className="text-negro/60 font-dm text-sm leading-relaxed space-y-4">
              {s.texto.trim().split("\n\n").map((p, i) => (
                <p key={i}>{p.trim()}</p>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* ── DESTINOS ICÓNICOS ── */}
      <section className="bg-white border-y border-negro/8 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-[10px] tracking-[4px] uppercase text-verde-selva mb-3 font-dm text-center">Lugares imperdibles</p>
          <h2 className="font-cormorant font-light text-verde-profundo text-center mb-12" style={{ fontSize: "clamp(28px,4vw,46px)" }}>
            Destinos <em className="text-dorado">icónicos</em>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {DESTINOS_ICONO.map((d) => (
              <div key={d.nombre} className="group border border-negro/8 overflow-hidden hover:border-verde-selva/30 transition-colors">
                <div className="aspect-video overflow-hidden">
                  <img
                    src={d.img}
                    alt={d.nombre}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <div className="p-5">
                  <h3 className="font-cormorant text-verde-profundo text-lg mb-2">{d.nombre}</h3>
                  <p className="text-negro/55 font-dm text-sm leading-relaxed">{d.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link
              href="/destinos"
              className="inline-block border border-verde-selva/40 text-verde-selva px-10 py-3.5 text-sm tracking-[2px] uppercase font-dm hover:bg-verde-selva/10 transition-all"
            >
              Ver todos los destinos →
            </Link>
          </div>
        </div>
      </section>

      {/* ── CÓMO LLEGAR ── */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 className="font-cormorant font-light text-verde-profundo mb-6" style={{ fontSize: "clamp(26px,3.5vw,42px)" }}>
          ¿Cómo llegar a la <em className="text-dorado">Huasteca Potosina</em>?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 text-left">
          {[
            { medio: "Avión", detalle: "Vuelos a Ciudad Valles (CVM) o Tampico (TAM). Desde CVM son ~40 min a la zona." },
            { medio: "Autobús", detalle: "ADO y Ómnibus de México desde CDMX, Monterrey y SLP. Ciudad Valles en 8–10 h." },
            { medio: "Auto",   detalle: "Desde CDMX por la carretera 85D. ~6 h por autopista. Recomendamos llegar de día." },
          ].map((t) => (
            <div key={t.medio} className="border border-negro/8 bg-white p-5">
              <p className="font-cormorant text-dorado text-lg mb-2">{t.medio}</p>
              <p className="text-negro/55 font-dm text-sm leading-relaxed">{t.detalle}</p>
            </div>
          ))}
        </div>
        <Link
          href="/info-practica"
          className="inline-block border border-verde-selva/40 text-verde-selva px-10 py-3.5 text-sm tracking-[2px] uppercase font-dm hover:bg-verde-selva/10 transition-all"
        >
          Guía completa de información práctica →
        </Link>
      </section>

      {/* ── CTA TOURS ── */}
      <section className="bg-verde-profundo py-20 px-6 text-center">
        <p className="text-[10px] tracking-[4px] uppercase text-lima mb-4 font-dm">Listo para explorar</p>
        <h2 className="font-cormorant font-light text-crema mb-6" style={{ fontSize: "clamp(28px,4vw,48px)" }}>
          Empieza tu aventura en la <em className="text-dorado">Huasteca</em>
        </h2>
        <p className="text-crema/55 font-dm text-sm mb-8 max-w-md mx-auto leading-relaxed">
          Tours guiados con transporte, desayuno, guía certificado y todo el equipo incluido.
          Grupos máximo 12 personas.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link
            href="/tours"
            className="inline-block bg-dorado text-white px-10 py-4 text-sm tracking-[2px] uppercase font-dm hover:bg-terracota transition-colors"
          >
            Ver todos los tours
          </Link>
          <Link
            href="/planear"
            className="inline-block border border-crema/30 text-crema px-10 py-4 text-sm tracking-[2px] uppercase font-dm hover:bg-crema/10 transition-colors"
          >
            Planear mi viaje con IA
          </Link>
        </div>
      </section>

    </main>
  );
}
