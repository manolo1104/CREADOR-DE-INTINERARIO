"use client";

import { useState } from "react";
import Link from "next/link";

const MESES_CORTO = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const MESES_LARGO = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

type Rec = "ideal" | "buena" | "caluroso" | "lluvia";

const CLIMA: { temp: string; lluvia: string; cascadas: string; rec: Rec }[] = [
  { temp: "18–26°C", lluvia: "Poca",     cascadas: "Excelente", rec: "ideal"    },
  { temp: "18–26°C", lluvia: "Poca",     cascadas: "Excelente", rec: "ideal"    },
  { temp: "22–30°C", lluvia: "Poca",     cascadas: "Excelente", rec: "ideal"    },
  { temp: "26–36°C", lluvia: "Baja",     cascadas: "Muy buena", rec: "buena"    },
  { temp: "28–38°C", lluvia: "Moderada", cascadas: "Buena",     rec: "caluroso" },
  { temp: "26–34°C", lluvia: "Alta",     cascadas: "Variable",  rec: "lluvia"   },
  { temp: "26–34°C", lluvia: "Alta",     cascadas: "Variable",  rec: "lluvia"   },
  { temp: "26–34°C", lluvia: "Alta",     cascadas: "Variable",  rec: "lluvia"   },
  { temp: "26–32°C", lluvia: "Alta",     cascadas: "Variable",  rec: "lluvia"   },
  { temp: "22–30°C", lluvia: "Bajando",  cascadas: "Buena",     rec: "buena"    },
  { temp: "18–28°C", lluvia: "Poca",     cascadas: "Muy buena", rec: "ideal"    },
  { temp: "16–24°C", lluvia: "Poca",     cascadas: "Muy buena", rec: "ideal"    },
];

const RECOMENDACIONES: Record<Rec, {
  emoji: string;
  titulo: string;
  texto: string;
  bordColor: string;
  bgColor: string;
  labelColor: string;
  tours: { label: string; href: string }[];
}> = {
  ideal: {
    emoji: "🌟",
    titulo: "Temporada ideal — ¡Excelente elección!",
    texto: "Las cascadas están en su caudal óptimo con el agua turquesa característico de la Huasteca. Clima fresco (16–30°C) y agradable. Es temporada alta — reserva hospedaje y tours con anticipación.",
    bordColor: "border-verde-vivo/40",
    bgColor:   "bg-verde-selva/10",
    labelColor:"text-verde-vivo",
    tours: [
      { label: "Tour Tamul + Sótano de las Huahuas", href: "/tours/tour-tamul" },
      { label: "Tour Edward James (Las Pozas)",       href: "/tours/tour-edward-james" },
      { label: "Tour Cascada El Meco",               href: "/tours/tour-meco" },
    ],
  },
  buena: {
    emoji: "☀️",
    titulo: "Buena temporada — Bien para visitar",
    texto: "El agua conserva su color intenso. Las temperaturas suben — actívate temprano por las mañanas. Ideal para tours con sombra natural como Las Pozas o los ríos. Menos concurrencia que temporada alta.",
    bordColor: "border-dorado/40",
    bgColor:   "bg-dorado/8",
    labelColor:"text-dorado",
    tours: [
      { label: "Tour Edward James (Las Pozas)",       href: "/tours/tour-edward-james" },
      { label: "Tour Minas Viejas + Micos",           href: "/tours/tour-minas-micos" },
      { label: "Tour Puente de Dios + Tamasopo",      href: "/tours/tour-puente-dios" },
    ],
  },
  caluroso: {
    emoji: "🌡️",
    titulo: "Temporada calurosa — Prepárate bien",
    texto: "28–38°C en zonas bajas. Hidratación constante, actívate antes de las 10am. Las pozas se disfrutan mucho — el agua fresca es un alivio. Evita Tamtoc (sin sombra). Lleva sombrero y ropa UV.",
    bordColor: "border-orange-400/40",
    bgColor:   "bg-orange-500/8",
    labelColor:"text-orange-400",
    tours: [
      { label: "Tour Minas Viejas + Micos (pozas frescas)", href: "/tours/tour-minas-micos" },
      { label: "Tour Puente de Dios + Tamasopo",            href: "/tours/tour-puente-dios" },
    ],
  },
  lluvia: {
    emoji: "🌧️",
    titulo: "Temporada de lluvias — Consulta condiciones",
    texto: "Vegetación explosivamente verde y muy fotogénica. Algunos tours de río pueden suspenderse por corrientes altas (especialmente Tamul en septiembre). Menos turistas y precios más bajos. Consulta antes de reservar.",
    bordColor: "border-agua/40",
    bgColor:   "bg-agua/8",
    labelColor:"text-agua",
    tours: [
      { label: "Tour Edward James (Las Pozas — siempre operamos)", href: "/tours/tour-edward-james" },
      { label: "Tour Minas Viejas + Micos",                        href: "/tours/tour-minas-micos" },
    ],
  },
};

export function ClimaWidget() {
  const [mes, setMes] = useState<number | null>(null);

  const info = mes !== null ? CLIMA[mes] : null;
  const rec  = info ? RECOMENDACIONES[info.rec] : null;

  return (
    <div className="mt-8 bg-negro/40 border border-white/10 p-6">
      <p className="text-[10px] tracking-[3px] uppercase text-verde-vivo font-dm mb-2">
        ✦ Herramienta interactiva
      </p>
      <h3 className="font-cormorant text-crema text-xl mb-1">¿Cuándo vas tú?</h3>
      <p className="text-crema/45 font-dm text-xs mb-6">
        Selecciona tu mes de viaje y te decimos qué esperar y qué tour encaja mejor.
      </p>

      {/* Month selector */}
      <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 mb-6">
        {MESES_CORTO.map((m, i) => (
          <button
            key={m}
            onClick={() => setMes(i === mes ? null : i)}
            className={`py-2 text-[11px] font-dm font-medium tracking-[0.5px] transition-all ${
              mes === i
                ? "bg-verde-selva text-white"
                : "border border-white/15 text-crema/50 hover:border-verde-vivo/40 hover:text-crema"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Recommendation */}
      {mes !== null && info && rec && (
        <div className={`border ${rec.bordColor} ${rec.bgColor} p-5 space-y-4`}>
          <div className="flex items-start gap-3">
            <span className="text-2xl leading-none flex-shrink-0 mt-0.5">{rec.emoji}</span>
            <div>
              <p className={`font-dm text-sm font-medium ${rec.labelColor} mb-1`}>{rec.titulo}</p>
              <p className="text-crema/70 font-dm text-xs leading-relaxed">{rec.texto}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 border-t border-white/10 pt-4">
            <div className="text-center">
              <p className="text-[9px] tracking-[2px] uppercase text-crema/35 font-dm mb-1">Temperatura</p>
              <p className="text-crema/75 font-dm text-xs font-medium">{info.temp}</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] tracking-[2px] uppercase text-crema/35 font-dm mb-1">Lluvia</p>
              <p className="text-crema/75 font-dm text-xs font-medium">{info.lluvia}</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] tracking-[2px] uppercase text-crema/35 font-dm mb-1">Cascadas</p>
              <p className="text-crema/75 font-dm text-xs font-medium">{info.cascadas}</p>
            </div>
          </div>

          <div className="border-t border-white/10 pt-4">
            <p className="text-[9px] tracking-[2px] uppercase text-crema/35 font-dm mb-3">
              Tours recomendados para {MESES_LARGO[mes]}
            </p>
            <div className="space-y-2">
              {rec.tours.map((t) => (
                <Link
                  key={t.href}
                  href={t.href}
                  className="flex items-center justify-between group border border-white/10 hover:border-verde-vivo/40 px-4 py-2.5 transition-all"
                >
                  <span className="text-xs font-dm text-crema/70 group-hover:text-crema transition-colors">
                    {t.label}
                  </span>
                  <span className="text-verde-vivo text-xs">→</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {mes === null && (
        <p className="text-center text-crema/30 font-dm text-xs py-4">
          Selecciona un mes para ver la recomendación personalizada
        </p>
      )}
    </div>
  );
}
