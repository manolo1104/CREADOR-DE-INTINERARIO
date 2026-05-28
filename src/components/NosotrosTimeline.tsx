"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type HitoItem = {
  año: string;
  hito: string;
  cta: { label: string; href: string } | null;
};

const HISTORIA: HitoItem[] = [
  { año: "2010", hito: "Carlos Rodríguez, con 19 años, empieza a guiar informalmente a los primeros turistas que llegan a Tamuín preguntando por la Cascada de Tamul. Sin carretera asfaltada. Sin tarifa fija. Solo el conocimiento de cada vereda que nadie más tenía.", cta: null },
  { año: "2012", hito: "Miguel Ángel Hernández se une como guía acuático. Lleva años pescando en el Tampaón con su padre y conoce cada corriente, cada roca y cada momento del día donde la luz entra diferente al cañón.", cta: null },
  { año: "2014", hito: "José Laredo completa su primera bajada técnica al fondo del Sótano de las Golondrinas — uno de los primeros habitantes de la región en hacerlo con equipo certificado.", cta: { label: "El Sótano es parte de nuestro Tour Tamul →", href: "/tours/tour-tamul" } },
  { año: "2015", hito: "Los tres guías se conocen en una excursión espontánea a Las Pozas de Edward James. La química es inmediata: experiencia local, seguridad técnica, pasión genuina. Deciden que hay algo que construir juntos.", cta: { label: "Visita Las Pozas con nosotros →", href: "/tours/tour-edward-james" } },
  { año: "2016", hito: "Primera temporada operando como equipo informal. Una camioneta rentada, tres destinos y solo boca a boca. Sin publicidad, sin página web. El 80% de los clientes venían por recomendación de otros viajeros.", cta: null },
  { año: "2017", hito: "Primer curso de primeros auxilios y rescate en agua rápida con Cruz Roja Mexicana. Queríamos que cada familia que subiera a nuestra camioneta supiera que estaban en las mejores manos posibles. — Carlos", cta: null },
  { año: "2018", hito: "Primer tour privado con acceso nocturno al ejido de Tamul. Los ejidatarios — que conocen a Carlos desde niño — les abren la puerta antes del amanecer. Ese fue el origen del acceso exclusivo que ofrecemos hoy.", cta: { label: "Conoce el acceso exclusivo al Sótano →", href: "/tours/tour-tamul" } },
  { año: "2019", hito: "Fundación formal de Tours Huasteca Potosina. Primera camioneta propia, primera página en WhatsApp Business y primeras reservas en línea. Tres destinos se convierten en cinco.", cta: null },
  { año: "2020", hito: "Pandemia. Cero turistas. En vez de cerrar, usamos el tiempo para certificarnos con SECTUR, capacitar al equipo y apoyar a comunidades locales con distribución de despensas.", cta: null },
  { año: "2021", hito: "Certificación NOM-09 SECTUR completa del equipo. Expansión a Xilitla y Las Pozas. Alianza oficial con ejido Tamul para acceso exclusivo al amanecer al Sótano de las Huahuas.", cta: { label: "Este acceso exclusivo es parte de nuestro Tour Tamul →", href: "/tours/tour-tamul" } },
  { año: "2022", hito: "Eliminación total de plásticos de un solo uso. Lanzamiento del kit de bienvenida con cantimplora reutilizable incluida en todos los tours.", cta: { label: "Conoce nuestro compromiso ambiental →", href: "/sustentabilidad-y-conservacion" } },
  { año: "2023", hito: "492 reseñas verificadas en Google Maps con 4.9 estrellas de calificación. Primera temporada en que la demanda superó nuestra capacidad máxima.", cta: null },
  { año: "2024", hito: "Creación del Fondo de Conservación Huasteca con 3 ejidos socios. Reforestación de 2.4 hectáreas de galería riparia en el Río Tampaón.", cta: { label: "Conoce el impacto de tu reserva →", href: "/sustentabilidad-y-conservacion" } },
  { año: "2025", hito: "Lanzamiento de la plataforma digital con planificador de viajes con inteligencia artificial — el primero entre operadores turísticos de la región.", cta: { label: "Prueba el recomendador IA →", href: "/recomendar" } },
];

export function NosotrosTimeline() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(0);
  const [lineH, setLineH] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        HISTORIA.forEach((_, i) => {
          setTimeout(() => setRevealed(i + 1), i * 90);
        });
        // Grow the vertical line over the full duration
        setTimeout(() => setLineH(100), HISTORIA.length * 90 + 200);
      },
      { threshold: 0.08 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="relative pl-8">
      {/* Vertical line — grows as items reveal */}
      <div className="absolute left-0 top-0 bottom-0 w-px bg-verde-selva/15" />
      <div
        className="absolute left-0 top-0 w-px bg-verde-selva/60 transition-all duration-[2s] ease-out"
        style={{ height: `${lineH}%` }}
      />

      <div className="space-y-6">
        {HISTORIA.map((h, i) => (
          <div
            key={h.año}
            className="relative"
            style={{
              opacity: i < revealed ? 1 : 0,
              transform: i < revealed ? "translateY(0)" : "translateY(14px)",
              transition: `opacity 0.45s ease ${i * 30}ms, transform 0.45s cubic-bezier(0.23,1,0.32,1) ${i * 30}ms`,
            }}
          >
            {/* Dot */}
            <div
              className="absolute -left-10 w-3 h-3 rounded-full bg-verde-selva top-1"
              style={{
                transform: i < revealed ? "scale(1)" : "scale(0)",
                transition: `transform 0.3s cubic-bezier(0.34,1.56,0.64,1) ${i * 90 + 60}ms`,
              }}
            />
            <span className="font-cormorant text-dorado text-base font-light block mb-1">{h.año}</span>
            <p className="text-negro/60 font-dm text-sm leading-relaxed mb-1.5">{h.hito}</p>
            {h.cta && (
              <Link
                href={h.cta.href}
                className="inline-flex items-center gap-1 text-[10px] font-dm text-verde-selva hover:text-verde-vivo underline underline-offset-2 transition-colors"
              >
                <span className="text-verde-vivo">→</span> {h.cta.label}
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
