"use client";

import Link from "next/link";

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

/** Parse "Nov–Mar" or "Ene–Abr" or "Todo el año" into [startIdx, endIdx] */
function parseTemporada(temporada: string): number[] {
  if (!temporada || temporada.toLowerCase().includes("todo")) {
    return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  }
  const parts = temporada.replace(/\s/g, "").split("–");
  if (parts.length < 2) {
    const idx = MESES.findIndex(m => temporada.startsWith(m));
    return idx >= 0 ? [idx] : [];
  }
  const [fromStr, toStr] = parts;
  const from = MESES.findIndex(m => fromStr.startsWith(m));
  const to   = MESES.findIndex(m => toStr.startsWith(m));
  if (from < 0 || to < 0) return [];

  const indices: number[] = [];
  if (from <= to) {
    for (let i = from; i <= to; i++) indices.push(i);
  } else {
    // wraps year: Nov–Mar
    for (let i = from; i < 12; i++) indices.push(i);
    for (let i = 0; i <= to; i++)   indices.push(i);
  }
  return indices;
}

interface Props {
  temporada: string;
  destinoNombre: string;
  tourHref?: string;
}

export function MejorEpocaWidget({ temporada, destinoNombre, tourHref }: Props) {
  const currentMonth = new Date().getMonth(); // 0-11
  const optimalMonths = parseTemporada(temporada);
  const isCurrentOptimal = optimalMonths.includes(currentMonth);
  const currentMonthName = MESES[currentMonth];

  // Find next optimal month if not currently optimal
  const nextOptimal = !isCurrentOptimal
    ? MESES[optimalMonths.find(i => i > currentMonth) ?? optimalMonths[0]]
    : null;

  return (
    <div className="border border-verde-vivo/20 bg-verde-selva/8 p-5">
      <p className="text-[9px] tracking-[2px] uppercase text-verde-vivo font-dm mb-4 flex items-center gap-1.5">
        🌤️ Mejor época para visitar
      </p>

      {/* 12-month grid */}
      <div className="grid grid-cols-12 gap-0.5 mb-3">
        {MESES.map((mes, i) => {
          const isOptimal  = optimalMonths.includes(i);
          const isCurrent  = i === currentMonth;
          return (
            <div key={mes} className="flex flex-col items-center gap-0.5">
              <div
                className={`w-full h-4 transition-colors rounded-sm ${
                  isOptimal && isCurrent
                    ? "bg-verde-vivo ring-2 ring-white/60 ring-offset-1 ring-offset-transparent"
                    : isOptimal
                      ? "bg-verde-selva/80"
                      : isCurrent
                        ? "bg-dorado/50 ring-1 ring-dorado/60"
                        : "bg-crema/10"
                }`}
                title={mes}
              />
              <span className={`text-[7px] font-dm leading-none ${
                isCurrent ? "text-crema font-bold" : isOptimal ? "text-verde-vivo/70" : "text-crema/25"
              }`}>
                {mes.slice(0, 1)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[9px] font-dm text-crema/50 mb-3">
        <span className="flex items-center gap-1"><span className="w-3 h-2 bg-verde-selva/80 rounded-sm inline-block" /> Temporada óptima</span>
        <span className="flex items-center gap-1"><span className="w-3 h-2 bg-crema/10 rounded-sm inline-block" /> Fuera de temporada</span>
        <span className="flex items-center gap-1"><span className="w-3 h-2 bg-dorado/50 rounded-sm inline-block" /> Hoy</span>
      </div>

      {/* CTA contextual */}
      {isCurrentOptimal ? (
        <div className="bg-verde-vivo/10 border border-verde-vivo/30 px-3 py-2 flex items-center justify-between gap-3">
          <p className="text-xs font-dm text-verde-vivo font-medium">
            ✦ {currentMonthName} es temporada alta — condiciones ideales ahora mismo
          </p>
          {tourHref && (
            <Link href={tourHref} className="text-[9px] tracking-[2px] uppercase font-dm text-verde-vivo border border-verde-vivo/50 hover:bg-verde-vivo/10 px-3 py-1.5 transition-all flex-shrink-0">
              Ver tour →
            </Link>
          )}
        </div>
      ) : nextOptimal ? (
        <p className="text-[10px] font-dm text-crema/45">
          {/* El espacio explícito importa: sin él el texto plano queda
              "Enereservar con anticipación", que es lo que leen los lectores
              de pantalla y los bots de IA aunque en pantalla se vea separado. */}
          Próxima temporada óptima: <span className="text-dorado">{nextOptimal}</span>{" "}
          {tourHref && (
            <Link href={tourHref} className="ml-2 text-verde-vivo underline underline-offset-2 hover:text-lima transition-colors">
              reservar con anticipación →
            </Link>
          )}
        </p>
      ) : null}
    </div>
  );
}
