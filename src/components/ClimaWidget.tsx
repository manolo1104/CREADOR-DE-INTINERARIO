"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "@/lib/i18n/useLocale";
import { getInfoPractica } from "@/lib/i18n/infoPractica.en";

/**
 * Los nombres de mes salen de `Intl`, no de tablas escritas a mano.
 *
 * Mismo criterio que en `TourCalendar`: dos listas paralelas por idioma es una
 * lista que se queda a medio traducir. Con mayúscula inicial, como el original.
 */
function nombreMes(i: number, locale: "es" | "en", corto: boolean): string {
  const f = new Date(2020, i, 1).toLocaleDateString(locale === "en" ? "en-US" : "es-MX", {
    month: corto ? "short" : "long",
  }).replace(".", "");
  return f.charAt(0).toUpperCase() + f.slice(1);
}

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

/**
 * Lo que NO depende del idioma: emoji, colores y a qué tour lleva cada enlace.
 *
 * ⚠️ Los `slug` estaban mal: apuntaban a `tour-tamul`, `tour-edward-james`,
 * `tour-meco`, `tour-minas-micos` y `tour-puente-dios`, que no existen en
 * `TOURS_DB` ni tienen redirect. Eran 404 también en español.
 */
const ESTILOS: Record<Rec, {
  emoji: string;
  bordColor: string;
  bgColor: string;
  labelColor: string;
  slugs: string[];
}> = {
  ideal: {
    emoji: "🌟",
    bordColor: "border-verde-vivo/40",
    bgColor:   "bg-verde-selva/10",
    labelColor:"text-verde-vivo",
    slugs: ["expedicion-tamul", "ruta-surrealista-edward-james", "cascadas-del-meco"],
  },
  buena: {
    emoji: "☀️",
    bordColor: "border-dorado/40",
    bgColor:   "bg-dorado/8",
    labelColor:"text-dorado",
    slugs: ["ruta-surrealista-edward-james", "paraiso-escalonado-minas-micos", "ruta-acuatica-puente-de-dios"],
  },
  caluroso: {
    emoji: "🌡️",
    bordColor: "border-orange-400/40",
    bgColor:   "bg-orange-500/8",
    labelColor:"text-orange-400",
    slugs: ["paraiso-escalonado-minas-micos", "ruta-acuatica-puente-de-dios"],
  },
  lluvia: {
    emoji: "🌧️",
    bordColor: "border-agua/40",
    bgColor:   "bg-agua/8",
    labelColor:"text-agua",
    slugs: ["ruta-surrealista-edward-james", "paraiso-escalonado-minas-micos"],
  },
};

export function ClimaWidget() {
  const { locale, lp } = useLocale();
  const c = getInfoPractica(locale).clima;
  const [mes, setMes] = useState<number | null>(null);

  const info = mes !== null ? CLIMA[mes] : null;
  const rec  = info ? { ...ESTILOS[info.rec], ...c.recomendaciones[info.rec] } : null;

  return (
    <div className="mt-8 bg-negro/40 border border-white/10 p-6">
      <p className="text-[10px] tracking-[3px] uppercase text-verde-vivo font-dm mb-2">
        {c.herramienta}
      </p>
      <h3 className="font-cormorant text-crema text-xl mb-1">{c.pregunta}</h3>
      <p className="text-crema/45 font-dm text-xs mb-6">
        {c.instruccion}
      </p>

      {/* Month selector */}
      <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 mb-6">
        {Array.from({ length: 12 }, (_, i) => nombreMes(i, locale, true)).map((m, i) => (
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
              <p className="text-[9px] tracking-[2px] uppercase text-crema/35 font-dm mb-1">{c.temperatura}</p>
              <p className="text-crema/75 font-dm text-xs font-medium">{info.temp}</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] tracking-[2px] uppercase text-crema/35 font-dm mb-1">{c.lluvia}</p>
              <p className="text-crema/75 font-dm text-xs font-medium">{c.lluviaValores[info.lluvia] ?? info.lluvia}</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] tracking-[2px] uppercase text-crema/35 font-dm mb-1">{c.cascadas}</p>
              <p className="text-crema/75 font-dm text-xs font-medium">{c.cascadasValores[info.cascadas] ?? info.cascadas}</p>
            </div>
          </div>

          <div className="border-t border-white/10 pt-4">
            <p className="text-[9px] tracking-[2px] uppercase text-crema/35 font-dm mb-3">
              {c.recomendados(nombreMes(mes, locale, false))}
            </p>
            <div className="space-y-2">
              {rec.tours.map((label, i) => (
                <Link
                  key={label}
                  href={lp(`/tours/${rec.slugs[i]}`)}
                  className="flex items-center justify-between group border border-white/10 hover:border-verde-vivo/40 px-4 py-2.5 transition-all"
                >
                  <span className="text-xs font-dm text-crema/70 group-hover:text-crema transition-colors">
                    {label}
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
          {c.seleccionaMes}
        </p>
      )}
    </div>
  );
}
