"use client";

import { useState } from "react";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { Cifra } from "@/components/admin/Cifra";
import { DIMENSIONES, ETIQUETA_CANAL, MINIMO_CONFIABLE, type Analisis, type Dimension } from "@/lib/admin/analisisComun";

const fmx = (n: number) => `$${Math.round(n).toLocaleString("es-MX")}`;
const RANGOS = [
  { clave: "90", etiqueta: "90 días" },
  { clave: "365", etiqueta: "12 meses" },
  { clave: "todo", etiqueta: "Todo" },
];

const th = "text-left font-normal text-[10px] tracking-[1.5px] uppercase text-[rgba(22,54,42,0.5)] px-3 py-2 whitespace-nowrap";
const td = "px-3 py-2.5 align-top";

/**
 * La pestaña Análisis (21 oct 2026). Dos preguntas:
 * 1. ¿Qué segmento deja más margen y a cuál conviene atraer? (check-in × dinero)
 * 2. ¿De dónde llegan las ventas? («cómo nos conociste» y, al lado, GA4)
 */
export default function AnalisisClient({ datos: d, rango }: { datos: Analisis; rango: string }) {
  const [dim, setDim] = useState<Dimension>("tipoGrupo");
  const filas = d.segmentos[dim];
  const mejor = d.mejor[dim];
  const cobertura = d.reservas ? Math.round((d.conCheckin / d.reservas) * 100) : 0;
  const pctCanal = (k: string) => d.canales.find((c) => c.clave === k)?.pct ?? 0;
  const ga4Total = d.ga4.ok ? d.ga4.filas.reduce((s, f) => s + f.sesiones, 0) : 0;
  const ga4Compras = d.ga4.ok ? d.ga4.filas.reduce((s, f) => s + f.compras, 0) : 0;

  return (
    <div className="px-5 sm:px-7 py-6 max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <p className="panel-eyebrow mb-1.5">Análisis</p>
          <h1 className="font-cormorant text-[#16362a] text-[30px] leading-none font-light">Quién compra y de dónde llega</h1>
        </div>
        <div className="flex gap-1.5" role="group" aria-label="Periodo">
          {RANGOS.map((r) => (
            <Link key={r.clave} href={`/admin/analisis?rango=${r.clave}`}
              className={`px-3 py-1.5 text-[12px] font-dm rounded-[7px] panel-foco ${rango === r.clave ? "bg-[#1B4332] text-white" : "panel-card text-[#16362a] panel-pulsable"}`}>
              {r.etiqueta}
            </Link>
          ))}
        </div>
      </div>

      <div className={`panel-card px-4 py-3 mb-6 text-[13px] font-dm ${d.conCheckin ? "text-[#16362a]" : "text-[#7a4b0e]"}`}>
        <b className="font-medium">{d.conCheckin} de {d.reservas}</b> reservas del periodo tienen check-in ({cobertura} %).{" "}
        {d.conCheckin === 0
          ? "El check-in empezó el 21 de octubre de 2026: estas tablas se llenan conforme los clientes lo contesten."
          : "Todo lo de abajo sale solo de esas reservas; mientras más contesten, más confiable."}
      </div>

      {/* ── 1. Quién compra ── */}
      <section className="mb-10">
        <h2 className="font-cormorant text-[#16362a] text-[24px] font-light mb-1">¿Qué segmento deja más?</h2>
        <p className="text-[12px] font-dm text-[rgba(22,54,42,0.6)] mb-3 max-w-3xl">
          Margen estimado = lo vendido − hotel − extras − costos del Cotizador (antes de comisiones). Las reservas con un tour
          sin costos cargados no entran al margen. Con menos de {MINIMO_CONFIABLE} reservas el renglón sale en gris: es anécdota, no tendencia.
        </p>
        <div className="flex flex-wrap gap-1.5 mb-3" role="tablist" aria-label="Agrupar por">
          {DIMENSIONES.map((x) => (
            <button key={x.clave} type="button" role="tab" aria-selected={dim === x.clave} onClick={() => setDim(x.clave)}
              className={`px-3 py-1.5 text-[12px] font-dm rounded-full border panel-foco ${dim === x.clave ? "bg-[#1B4332] border-[#1B4332] text-white" : "border-[#1B4332]/15 text-[#16362a] hover:border-[#1B4332]/40"}`}>
              {x.etiqueta}
            </button>
          ))}
        </div>
        <div className="panel-card overflow-x-auto">
          {filas.length === 0 ? (
            <p className="px-5 py-8 text-center text-[13px] font-dm text-[rgba(22,54,42,0.5)]">Aún no hay respuestas para agrupar.</p>
          ) : (
            <table className="w-full text-[13px] font-dm text-[#16362a] min-w-[760px]">
              <thead className="border-b border-[#1B4332]/10">
                <tr>
                  <th className={th}>Segmento</th>
                  <th className={`${th} text-right`}>Reservas</th>
                  <th className={`${th} text-right`}>Ticket promedio</th>
                  <th className={`${th} text-right`}>Personas / reserva</th>
                  <th className={`${th} text-right`}>Margen estimado / reserva</th>
                  <th className={th}>Tour que más eligen</th>
                  <th className={th}>Llegan por</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.clave} className={`border-t border-[#1B4332]/8 ${f.pocos ? "text-[rgba(22,54,42,0.45)]" : ""}`}>
                    <td className={td}>
                      <span className="font-medium">{f.etiqueta}</span>
                      {mejor === f.clave && (
                        <span className="ml-2 inline-flex items-center gap-1 text-[10px] tracking-[1px] uppercase text-[#2b845c] border border-[#2b845c]/30 rounded-full px-1.5 py-0.5">
                          <Trophy className="w-3 h-3" aria-hidden="true" /> Deja más
                        </span>
                      )}
                      {f.pocos && <span className="block text-[10px]">menos de {MINIMO_CONFIABLE} reservas</span>}
                    </td>
                    <td className={`${td} text-right whitespace-nowrap`}>{f.reservas} <span className="text-[rgba(22,54,42,0.5)]">({f.pct} %)</span></td>
                    <td className={`${td} text-right`}>{fmx(f.ticket)}</td>
                    <td className={`${td} text-right`}>{f.personas.toLocaleString("es-MX")}</td>
                    <td className={`${td} text-right whitespace-nowrap`}>
                      {f.margen === null ? <span className="text-[rgba(22,54,42,0.45)]">sin costos</span> : <>{fmx(f.margen)} <span className="text-[rgba(22,54,42,0.5)]">({f.margenPct} %)</span></>}
                      {f.margen !== null && f.conCosto < f.reservas && <span className="block text-[10px] text-[rgba(22,54,42,0.45)]">de {f.conCosto} con costos</span>}
                    </td>
                    <td className={td}>{f.tourTop || "—"}</td>
                    <td className={td}>{f.canalTop || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* ── 2. De dónde llegan ── */}
      <section>
        <h2 className="font-cormorant text-[#16362a] text-[24px] font-light mb-1">¿De dónde llegan las ventas?</h2>
        <p className="text-[12px] font-dm text-[rgba(22,54,42,0.6)] mb-3 max-w-3xl">
          Lo que el cliente nos dijo en el check-in, de las {d.conCheckin} reservas que lo contestaron.
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <Cifra etiqueta="Buscando en Google (SEO)" tono={d.conCheckin ? "acento" : "apagado"} valor={`${pctCanal("google")} %`} pie="de las reservas con check-in" />
          <Cifra etiqueta="Google Maps" tono={d.conCheckin ? "acento" : "apagado"} valor={`${pctCanal("maps")} %`} pie="de las reservas con check-in" />
          <Cifra etiqueta="Recomendación" tono={d.conCheckin ? "acento" : "apagado"} valor={`${pctCanal("recomendacion")} %`} pie="de las reservas con check-in" />
          <Cifra etiqueta="Hotel Paraíso Encantado" tono={d.conCheckin ? "acento" : "apagado"} valor={`${pctCanal("paraiso")} %`} pie="de las reservas con check-in" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
          <div className="panel-card overflow-x-auto">
            <p className="panel-eyebrow px-4 pt-4 pb-1">Lo que dicen los clientes</p>
            <table className="w-full text-[13px] font-dm text-[#16362a] min-w-[520px]">
              <thead className="border-b border-[#1B4332]/10">
                <tr>
                  <th className={th}>Cómo nos conoció</th>
                  <th className={`${th} text-right`}>Reservas</th>
                  <th className={`${th} text-right`}>Ventas</th>
                  <th className={th}>Cómo reservaron</th>
                </tr>
              </thead>
              <tbody>
                {d.canales.map((c) => (
                  <tr key={c.clave} className={`border-t border-[#1B4332]/8 ${c.reservas === 0 ? "text-[rgba(22,54,42,0.4)]" : ""}`}>
                    <td className={`${td} font-medium`}>{c.etiqueta}</td>
                    <td className={`${td} text-right whitespace-nowrap`}>{c.reservas} <span className="text-[rgba(22,54,42,0.5)]">({c.pct} %)</span></td>
                    <td className={`${td} text-right whitespace-nowrap`}>{fmx(c.ventas)} <span className="text-[rgba(22,54,42,0.5)]">({c.pctVentas} %)</span></td>
                    <td className={`${td} text-[12px]`}>{c.porOrigen.map((o) => `${o.origen} ${o.reservas}`).join(" · ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="panel-card overflow-x-auto">
            <p className="panel-eyebrow px-4 pt-4 pb-1">Lo que vio GA4 en la web{d.ga4.ok ? ` · últimos ${d.ga4.dias} días` : ""}</p>
            {d.ga4.ok ? (
              <>
                <table className="w-full text-[13px] font-dm text-[#16362a] min-w-[480px]">
                  <thead className="border-b border-[#1B4332]/10">
                    <tr>
                      <th className={th}>Canal</th>
                      <th className={`${th} text-right`}>Visitas</th>
                      <th className={`${th} text-right`}>Compras en la web</th>
                      <th className={`${th} text-right`}>Ingresos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.ga4.filas.map((f) => (
                      <tr key={f.canal} className="border-t border-[#1B4332]/8">
                        <td className={`${td} font-medium`}>{ETIQUETA_CANAL[f.canal]}</td>
                        <td className={`${td} text-right whitespace-nowrap`}>{f.sesiones.toLocaleString("es-MX")} <span className="text-[rgba(22,54,42,0.5)]">({ga4Total ? Math.round((f.sesiones / ga4Total) * 100) : 0} %)</span></td>
                        <td className={`${td} text-right whitespace-nowrap`}>{f.compras} <span className="text-[rgba(22,54,42,0.5)]">({ga4Compras ? Math.round((f.compras / ga4Compras) * 100) : 0} %)</span></td>
                        <td className={`${td} text-right`}>{fmx(f.ingresos)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="px-4 py-3 text-[11px] font-dm text-[rgba(22,54,42,0.55)]">
                  GA4 solo ve la web: las ventas por WhatsApp no aparecen aquí, por eso no cuadra con la tabla de al lado.
                  Maps se separa de SEO solo si la liga del Perfil de Google lleva <code>utm_campaign=perfil-maps</code>.
                </p>
              </>
            ) : (
              <p className="px-4 py-6 text-[13px] font-dm text-[#7a4b0e]">GA4 todavía no está conectado: {d.ga4.motivo}</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
