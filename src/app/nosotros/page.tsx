import { Metadata } from "next";
import Link from "next/link";
import { Award, Calendar, Globe, Stethoscope, Shield, Users, Compass } from "lucide-react";

export const metadata: Metadata = {
  title: "Quiénes Somos — Guías Certificados | Tours Huasteca Potosina",
  description:
    "Somos una familia de guías locales nacidos en la Huasteca Potosina. Certificados NOM-09 SECTUR, con más de 8 años llevando viajeros a los rincones más extraordinarios de la región.",
};

const WA_EQUIPO =
  "https://wa.me/524891251458?text=Hola%2C%20quisiera%20conocer%20m%C3%A1s%20sobre%20el%20equipo%20de%20gu%C3%ADas.";

const GUIAS = [
  {
    nombre:       "Equipo Huasteca Potosina",
    rol:          "Guías Certificados NOM-09 SECTUR",
    años:         8,
    especialidad: "Cascadas, aventura y naturaleza",
    bio:          "Somos una familia de guías locales nacidos en la Huasteca. Conocemos cada sendero, cada cascada y cada secreto de la región. Nuestro trabajo es que regreses con las mejores fotos de tu vida y ganas de volver.",
    idiomas:      ["Español", "Inglés"],
    certs:        ["NOM-09 SECTUR", "Primeros Auxilios", "Rescate Acuático"],
    foto:         "/images/equipo/hp-team.jpg",
  },
];

import type { LucideIcon } from "lucide-react";

const GARANTIAS: { Icon: LucideIcon; titulo: string; sub: string }[] = [
  { Icon: Award,       titulo: "Certificación NOM-09 SECTUR",      sub: "Guías oficialmente avalados por la Secretaría de Turismo" },
  { Icon: Calendar,    titulo: "+8 años de experiencia",            sub: "Cientos de grupos guiados con cero incidentes" },
  { Icon: Globe,       titulo: "Guías bilingües",                   sub: "Español nativo · Inglés básico–intermedio" },
  { Icon: Stethoscope, titulo: "Botiquín de primeros auxilios",     sub: "Equipados en cada recorrido" },
  { Icon: Shield,      titulo: "Seguro de responsabilidad civil",   sub: "Tu seguridad es nuestra prioridad" },
  { Icon: Users,       titulo: "Grupos pequeños",                   sub: "Máximo 12 personas para atención personalizada" },
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
    <main id="main-content" className="min-h-screen">

      {/* ── HERO ── */}
      <section className="relative bg-gradient-to-b from-verde-profundo/90 via-verde-profundo/40 to-negro px-6 pt-36 pb-24 text-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_40%,rgba(58,107,26,0.25),transparent_70%)] pointer-events-none" />
        <div className="relative z-10 max-w-3xl mx-auto">
          <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-4 font-dm">
            ✦ Nuestro equipo
          </p>
          <h1
            className="font-cormorant font-light text-crema mb-6 leading-tight"
            style={{ fontSize: "clamp(36px,6vw,68px)" }}
          >
            Una familia de guías
            <em className="text-dorado block italic"> nacidos en la Huasteca</em>
          </h1>
          <p className="text-crema/65 font-dm text-sm leading-relaxed max-w-xl mx-auto">
            Conocemos cada sendero, cada cascada y cada secreto de la región.
            Nuestro trabajo es que regreses con las mejores fotos de tu vida y ganas de volver.
          </p>
        </div>
      </section>

      {/* ── CARDS DEL EQUIPO ── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-10 font-dm text-center">
          El equipo
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {GUIAS.map((g) => (
            <article key={g.nombre} className="border border-white/10 bg-negro/50 p-6 flex flex-col items-center text-center">
              {/* Avatar placeholder circular */}
              <div className="w-24 h-24 rounded-full bg-verde-selva/40 border-2 border-verde-vivo/30 flex items-center justify-center mb-5 overflow-hidden">
                <Compass className="w-10 h-10 text-verde-vivo/70" aria-hidden="true" />
              </div>

              {/* Badge años */}
              <span className="inline-block bg-dorado/15 border border-dorado/30 text-dorado text-[9px] font-dm tracking-[2px] uppercase px-3 py-1 rounded-full mb-4">
                {g.años}+ años de experiencia
              </span>

              <h2 className="font-cormorant text-dorado text-xl font-light mb-1 leading-tight">
                {g.nombre}
              </h2>
              <p className="text-[10px] tracking-[1.5px] uppercase text-verde-vivo font-dm mb-4">
                {g.rol}
              </p>
              <p className="text-crema/60 font-dm text-sm leading-relaxed mb-5">
                {g.bio}
              </p>

              {/* Idiomas */}
              <div className="flex gap-2 flex-wrap justify-center mb-4">
                {g.idiomas.map((idioma) => (
                  <span key={idioma} className="text-[10px] text-crema/50 font-dm border border-white/10 px-2.5 py-1 rounded-full">
                    {idioma}
                  </span>
                ))}
              </div>

              {/* Certificaciones */}
              <div className="flex gap-1.5 flex-wrap justify-center">
                {g.certs.map((cert) => (
                  <span key={cert} className="text-[9px] text-lima bg-lima/10 border border-lima/25 px-2 py-0.5 rounded font-dm">
                    ✓ {cert}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── CERTIFICACIONES & GARANTÍAS ── */}
      <section className="bg-verde-profundo/25 border-y border-dorado/15 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-3 font-dm text-center">
            Por qué confiar en nosotros
          </p>
          <h2
            className="font-cormorant font-light text-crema text-center mb-12"
            style={{ fontSize: "clamp(28px,4vw,46px)" }}
          >
            Certificaciones y <em className="text-dorado">garantías</em>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {GARANTIAS.map((g) => (
              <div key={g.titulo} className="border border-dorado/15 bg-negro/40 p-5">
                <g.Icon className="w-6 h-6 text-dorado/70 mb-3" aria-hidden="true" />
                <h3 className="font-cormorant text-crema text-base mb-1 leading-tight">{g.titulo}</h3>
                <p className="text-[11px] text-crema/45 font-dm leading-relaxed">{g.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-20 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-4 font-dm">
            Hablemos
          </p>
          <h2
            className="font-cormorant font-light text-crema mb-6"
            style={{ fontSize: "clamp(28px,4vw,48px)" }}
          >
            ¿Tienes preguntas para nuestro equipo?
          </h2>
          <p className="text-crema/55 font-dm text-sm mb-10 leading-relaxed">
            Respondemos en menos de una hora, todos los días. Sin bots, sin esperas.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={WA_EQUIPO}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba59] text-white px-8 py-4 text-[11px] tracking-[2px] uppercase font-dm transition-colors duration-200"
            >
              {WA_SVG}
              Hablar con el equipo →
            </a>
            <Link
              href="/tours"
              className="inline-flex items-center justify-center border border-white/20 hover:border-crema/40 text-crema/60 hover:text-crema px-8 py-4 text-[11px] tracking-[2px] uppercase font-dm transition-all duration-200"
            >
              Ver nuestros tours
            </Link>
          </div>
        </div>
      </section>

    </main>
  );
}
