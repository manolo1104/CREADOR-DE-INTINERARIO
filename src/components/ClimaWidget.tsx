"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Sun, Thermometer, CloudRain, ChevronRight, type LucideIcon } from "lucide-react";
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

/**
 * Las cifras del clima no se tocan; la recomendación de cada mes sigue las
 * ventanas de `temporada.ts` (7 oct 2026), con sus textos en infoPractica.en.ts:
 *   · ideal (nov–feb): agua clara y poca gente; ahí cae la mejor temporada.
 *   · buena (mar–abr): el turquesa más intenso, y la mayor afluencia.
 *   · caluroso (may–jun): calor; junio es de transición, primeras lluvias.
 *   · lluvia (jul–oct): cascadas a todo caudal, agua con sedimento.
 * 🔴 Antes octubre iba como «buena» («las temperaturas suben», el texto de
 * abril), junio como «lluvia» (la franja del río dice turquesa en junio) y
 * marzo como «ideal» (prometía poca gente en plena temporada de más gente).
 */
const CLIMA: { temp: string; lluvia: string; cascadas: string; rec: Rec }[] = [
  { temp: "18–26°C", lluvia: "Poca",     cascadas: "Excelente", rec: "ideal"    },
  { temp: "18–26°C", lluvia: "Poca",     cascadas: "Excelente", rec: "ideal"    },
  { temp: "22–30°C", lluvia: "Poca",     cascadas: "Excelente", rec: "buena"    },
  { temp: "26–36°C", lluvia: "Baja",     cascadas: "Muy buena", rec: "buena"    },
  { temp: "28–38°C", lluvia: "Moderada", cascadas: "Buena",     rec: "caluroso" },
  { temp: "26–34°C", lluvia: "Alta",     cascadas: "Variable",  rec: "caluroso" },
  { temp: "26–34°C", lluvia: "Alta",     cascadas: "Variable",  rec: "lluvia"   },
  { temp: "26–34°C", lluvia: "Alta",     cascadas: "Variable",  rec: "lluvia"   },
  { temp: "26–32°C", lluvia: "Alta",     cascadas: "Variable",  rec: "lluvia"   },
  { temp: "22–30°C", lluvia: "Bajando",  cascadas: "Buena",     rec: "lluvia"   },
  { temp: "18–28°C", lluvia: "Poca",     cascadas: "Muy buena", rec: "ideal"    },
  { temp: "16–24°C", lluvia: "Poca",     cascadas: "Muy buena", rec: "ideal"    },
];

/**
 * Lo que NO depende del idioma: icono, colores y a qué tour lleva cada enlace.
 *
 * ⚠️ Los `slug` estaban mal: apuntaban a `tour-tamul`, `tour-edward-james`,
 * `tour-meco`, `tour-minas-micos` y `tour-puente-dios`, que no existen en
 * `TOURS_DB` ni tienen redirect. Eran 404 también en español.
 */
const ESTILOS: Record<Rec, {
  Icon: LucideIcon;
  bordColor: string;
  labelColor: string;
  slugs: string[];
}> = {
  ideal: {
    Icon: Sparkles,
    bordColor: "border-verde-selva/50",
    labelColor:"text-verde-selva",
    // La Olla de la Luz y el Edén entran SOLO aquí porque es lo único que el
    // catálogo afirma de su temporada (`temporada_ideal` en destinos.ts: "época
    // seca, nov–may" y "Nov–Mar"). La Gruta de Xilo y el Amanecer de Nubes no
    // tienen temporada escrita en ningún sitio, y no se inventa una.
    slugs: ["expedicion-tamul", "ruta-surrealista-edward-james", "cascadas-del-meco", "olla-de-la-luz", "eden-en-el-jardin"],
  },
  buena: {
    Icon: Sun,
    bordColor: "border-dorado/60",
    labelColor:"text-dorado",
    slugs: ["ruta-surrealista-edward-james", "paraiso-escalonado-minas-micos", "ruta-acuatica-puente-de-dios"],
  },
  caluroso: {
    Icon: Thermometer,
    bordColor: "border-orange-500/50",
    labelColor:"text-orange-700",
    slugs: ["paraiso-escalonado-minas-micos", "ruta-acuatica-puente-de-dios"],
  },
  lluvia: {
    Icon: CloudRain,
    bordColor: "border-agua/60",
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
    <div className="mt-8 rounded-2xl bg-white p-6 sm:p-7">
      <p className="mb-1 font-dm text-[13px] font-medium text-dorado">{c.herramienta.replace(/^✦\s*/, "")}</p>
      <h3 className="font-cormorant text-2xl text-verde-profundo sm:text-3xl">{c.pregunta}</h3>
      <p className="mb-5 mt-1 font-dm text-sm text-negro/60">
        {c.instruccion}
      </p>

      {/* Selector de mes */}
      <div className="mb-6 flex flex-wrap gap-2">
        {Array.from({ length: 12 }, (_, i) => nombreMes(i, locale, true)).map((m, i) => (
          <button
            key={m}
            type="button"
            onClick={() => setMes(i === mes ? null : i)}
            aria-pressed={mes === i}
            className={`inline-flex min-h-[40px] items-center rounded-full border px-4 font-dm text-[13px] font-medium transition-colors duration-200 ${
              mes === i
                ? "border-verde-profundo bg-verde-profundo text-crema"
                : "border-negro/15 bg-white text-negro/70 hover:border-verde-selva hover:text-verde-profundo"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Recomendación */}
      {mes !== null && info && rec && (
        <div className={`space-y-4 rounded-2xl border bg-crema p-5 ${rec.bordColor}`}>
          <div className="flex items-start gap-3">
            <rec.Icon className={`mt-0.5 h-6 w-6 flex-shrink-0 ${rec.labelColor}`} strokeWidth={1.5} aria-hidden="true" />
            <div>
              <p className={`mb-1 font-dm text-[15px] font-medium ${rec.labelColor}`}>{rec.titulo}</p>
              <p className="font-dm text-[15px] leading-relaxed text-negro/70">{rec.texto}</p>
            </div>
          </div>

          <dl className="grid grid-cols-3 gap-3 border-t border-negro/10 pt-4">
            {[
              [c.temperatura, info.temp],
              [c.lluvia, c.lluviaValores[info.lluvia] ?? info.lluvia],
              [c.cascadas, c.cascadasValores[info.cascadas] ?? info.cascadas],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="font-dm text-[13px] text-negro/50">{k}</dt>
                <dd className="font-dm text-[15px] font-medium tabular-nums text-verde-profundo">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="border-t border-negro/10 pt-4">
            <p className="mb-1 font-dm text-[13px] text-negro/50">
              {c.recomendados(nombreMes(mes, locale, false))}
            </p>
            <ul>
              {/* Etiqueta y slug se casan por posición (el texto vive en
                  infoPractica.en.ts): una etiqueta sin su slug no se pinta,
                  en vez de enlazar a /tours/undefined. */}
              {rec.tours.map((label, i) => rec.slugs[i] && (
                <li key={label} className="border-t border-negro/10 first:border-t-0">
                  <Link
                    href={lp(`/tours/${rec.slugs[i]}`)}
                    prefetch={false}
                    className="group flex min-h-[44px] items-center justify-between gap-3 py-2"
                  >
                    <span className="font-dm text-[15px] text-verde-profundo transition-colors group-hover:text-verde-selva">
                      {label}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-verde-selva" strokeWidth={1.5} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {mes === null && (
        <p className="font-dm text-sm text-negro/50">
          {c.seleccionaMes}
        </p>
      )}
    </div>
  );
}
