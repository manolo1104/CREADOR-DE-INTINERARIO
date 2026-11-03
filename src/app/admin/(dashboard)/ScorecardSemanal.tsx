"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import type { DatosScorecard, RevisionSemanalDatos } from "@/lib/admin/scorecardDatos";
import { ETIQUETA_ESTADO_SALIDA } from "@/lib/admin/salidas";
import { colorDeTour } from "@/lib/admin/coloresTour";
import { addDaysYMD } from "@/lib/dates";
import { playClick, playSuccess, playError } from "@/lib/admin/sfx";
import { TarjetaKpi } from "@/components/admin/ui/TarjetaKpi";
import { ChipEstado, type TonoEstado } from "@/components/admin/ui/ChipEstado";
import { TONO_ESTADO_SALIDA } from "./salidas-dia/comun";

const fmx = (n: number) => `$${Math.round(n).toLocaleString("es-MX")}`;
const dia = (ymd: string) => new Date(`${ymd}T12:00:00`).toLocaleDateString("es-MX", { weekday: "short", day: "numeric" }).replace(".", "");
const input = "w-full rounded-[var(--panel-radio-sm)] border border-[var(--panel-borde)] bg-white px-3 py-2.5 text-[16px] font-dm text-[var(--panel-tinta)] panel-foco";

/**
 * El scorecard semanal (rediseño, 3 nov 2026): 8 KPI contra su meta, el
 * embudo, los pendientes de hoy y las salidas de la semana. Lo que el panel
 * aún no sabe solo (leads, respuesta, score) se captura en «Revisión del jueves».
 */
export function ScorecardSemanal({ datos }: { datos: DatosScorecard }) {
  const { semana, scorecard, pendientes, salidasSemana } = datos;
  const [revision, setRevision] = useState<RevisionSemanalDatos>(datos.revision);
  const [abierta, setAbierta] = useState(!datos.revision.guardadoPor);
  const [guardando, setGuardando] = useState(false);
  const [msj, setMsj] = useState<{ texto: string; error?: boolean } | null>(null);
  const maxN = Math.max(1, ...scorecard.embudo.map(p => p.n));

  async function guardar(e: React.FormEvent) {
    e.preventDefault(); setGuardando(true); setMsj(null);
    try {
      const r = await fetch("/api/admin/revision-semanal", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(revision) });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.ok) { playError(); setMsj({ texto: d?.error || "No se pudo guardar", error: true }); return; }
      playSuccess(); setMsj({ texto: "Guardado. Recarga para ver el scorecard con estos datos." });
      window.location.reload();
    } catch { playError(); setMsj({ texto: "No se pudo guardar", error: true }); }
    finally { setGuardando(false); }
  }
  const num = (k: keyof RevisionSemanalDatos) => (
    <input type="number" min={0} inputMode="numeric" value={revision[k] === null ? "" : String(revision[k])}
      onChange={e => setRevision(r => ({ ...r, [k]: e.target.value === "" ? null : Number(e.target.value) }))} className={`${input} mt-1`} />
  );

  return (
    <section aria-label="Scorecard semanal" className="mb-6">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="panel-eyebrow mb-1">Semana {semana.numero} · {semana.etiqueta}{semana.esActual ? " · esta semana" : ""}</p>
          <h2 className="font-cormorant text-[26px] font-medium leading-none text-[var(--panel-tinta)]">Scorecard semanal</h2>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/admin?semana=${addDaysYMD(semana.lunes, -7)}`} aria-label="Semana anterior" className="panel-foco inline-flex h-10 w-10 items-center justify-center rounded-[var(--panel-radio-sm)] border border-[var(--panel-borde)] bg-white"><ChevronLeft className="h-4 w-4" aria-hidden="true" /></Link>
          {!semana.esActual && <Link href="/admin" className="panel-foco text-[13px] font-dm font-medium text-[var(--panel-acento)] hover:underline">Esta semana</Link>}
          <Link href={`/admin?semana=${addDaysYMD(semana.lunes, 7)}`} aria-label="Semana siguiente" className="panel-foco inline-flex h-10 w-10 items-center justify-center rounded-[var(--panel-radio-sm)] border border-[var(--panel-borde)] bg-white"><ChevronRight className="h-4 w-4" aria-hidden="true" /></Link>
          <button type="button" onClick={() => { playClick(); setAbierta(a => !a); }} aria-expanded={abierta}
            className="panel-foco panel-pulsable inline-flex min-h-[40px] items-center rounded-[var(--panel-radio-sm)] bg-[var(--panel-acento)] px-4 text-[13px] font-dm font-semibold text-white">Revisión del jueves</button>
        </div>
      </div>

      {abierta && (
        <form onSubmit={guardar} className="panel-card mb-4 p-4">
          <p className="text-[13px] font-dm text-[var(--panel-tinta-media)]">Lo que el panel todavía no sabe solo (hasta que llegue la Bandeja de WhatsApp): escríbelo de tu revisión y el scorecard lo usa. Vacío = sin dato.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <label className="text-[11px] font-dm uppercase tracking-[0.12em] text-[var(--panel-tinta-suave)]">Leads nuevos{num("leadsNuevos")}</label>
            <label className="text-[11px] font-dm uppercase tracking-[0.12em] text-[var(--panel-tinta-suave)]">Con respuesta en 5 min{num("respuestas5min")}</label>
            <label className="text-[11px] font-dm uppercase tracking-[0.12em] text-[var(--panel-tinta-suave)]">Clientes cotizados <span className="normal-case tracking-normal">(panel: {datos.cotizadosDelPanel})</span>{num("leadsCotizados")}</label>
            <label className="text-[11px] font-dm uppercase tracking-[0.12em] text-[var(--panel-tinta-suave)]">Score WhatsApp (0–100){num("score")}</label>
            <label className="text-[11px] font-dm uppercase tracking-[0.12em] text-[var(--panel-tinta-suave)]">Reseñas nuevas <span className="normal-case tracking-normal">(Google: {datos.resenasGoogleSemana ?? "—"})</span>{num("resenasNuevas")}</label>
          </div>
          <label className="mt-3 block text-[11px] font-dm uppercase tracking-[0.12em] text-[var(--panel-tinta-suave)]">Notas y 3 acciones para la próxima semana
            <textarea rows={2} value={revision.notas} onChange={e => setRevision(r => ({ ...r, notas: e.target.value }))} className={`${input} mt-1 normal-case tracking-normal`} /></label>
          <div className="mt-3 flex items-center gap-3">
            <button type="submit" disabled={guardando} className="panel-foco panel-pulsable min-h-[44px] rounded-[var(--panel-radio-sm)] bg-[var(--panel-acento)] px-4 text-[13px] font-dm font-semibold text-white disabled:opacity-50">{guardando ? "Guardando…" : "Guardar revisión"}</button>
            {revision.guardadoPor && <span className="text-[12px] font-dm text-[var(--panel-tinta-suave)]">Última: {revision.guardadoPor}</span>}
            {msj && <p role="status" className={`text-[12px] font-dm ${msj.error ? "text-[var(--panel-problema)]" : "text-[var(--panel-bien)]"}`}>{msj.texto}</p>}
          </div>
        </form>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {scorecard.kpis.map(k => <TarjetaKpi key={k.clave} etiqueta={k.etiqueta} area={k.area} valor={k.valor} contexto={k.contexto} estado={k.estado} />)}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[3fr_2fr]">
        <div className="panel-card p-4">
          <div className="flex items-baseline justify-between"><h3 className="font-cormorant text-[22px] text-[var(--panel-tinta)]">Embudo de la semana</h3><Link href="/admin/cotizaciones" className="panel-foco text-[13px] font-dm font-medium text-[var(--panel-acento)] hover:underline">Cotizaciones</Link></div>
          <div className="mt-3 space-y-2">
            {scorecard.embudo.map(p => (
              <div key={p.etiqueta} className="grid grid-cols-[120px_minmax(0,1fr)_56px] items-center gap-3">
                <span className="text-[13px] font-dm text-[var(--panel-tinta)]">{p.etiqueta}</span>
                <div className="h-7 overflow-hidden rounded-md bg-[var(--panel-fondo-velo)]">
                  <div className="flex h-7 items-center rounded-md bg-[var(--panel-acento)] pl-2.5 text-[13px] font-dm font-semibold text-white" style={{ width: `${Math.max(p.n > 0 ? 8 : 0, (p.n / maxN) * 100)}%` }}>{p.n}</div>
                </div>
                <span className="panel-cifra text-right text-[12px] font-dm text-[var(--panel-tinta-media)]">{p.conversion === null ? "" : `${p.conversion} %`}</span>
              </div>
            ))}
          </div>
          {scorecard.mayorCaida ? (
            <p className="mt-3 flex gap-2 rounded-md bg-[var(--panel-atencion-fondo)] px-3 py-2.5 text-[13px] font-dm leading-snug text-[#4A3A12]"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--panel-atencion)]" aria-hidden="true" /><span>La mayor fuga está {scorecard.mayorCaida}.</span></p>
          ) : <p className="mt-3 text-[12.5px] font-dm text-[var(--panel-tinta-suave)]">Captura los leads de la semana para ver el embudo completo.</p>}
        </div>
        <div className="panel-card p-4">
          <h3 className="font-cormorant text-[22px] text-[var(--panel-tinta)]">Pendientes de hoy</h3>
          {pendientes.length === 0 ? <p className="mt-2 text-[13px] font-dm text-[var(--panel-tinta-media)]">Nada pendiente. Buen día para vender.</p> : (
            <ul className="mt-1">
              {pendientes.map((p, i) => (
                <li key={i}>
                  <Link href={p.href} className="panel-foco -mx-2 flex items-start gap-3 rounded-md px-2 py-2.5 hover:bg-[var(--panel-fondo-velo)]">
                    <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: p.tono === "problema" ? "var(--panel-problema)" : p.tono === "atencion" ? "var(--panel-atencion)" : "var(--panel-acento)" }} />
                    <span className="min-w-0"><span className="block text-[13.5px] font-dm font-semibold text-[var(--panel-tinta)]">{p.titulo}</span><span className="block text-[12.5px] font-dm text-[var(--panel-tinta-media)]">{p.detalle}</span></span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="panel-card mt-4 overflow-hidden">
        <div className="flex items-baseline justify-between px-4 pt-4"><h3 className="font-cormorant text-[22px] text-[var(--panel-tinta)]">Salidas de la semana</h3><span className="text-[12.5px] font-dm text-[var(--panel-tinta-media)]">{salidasSemana.length} salida{salidasSemana.length === 1 ? "" : "s"}</span></div>
        {salidasSemana.length === 0 ? <p className="px-4 pb-4 pt-2 text-[13px] font-dm text-[var(--panel-tinta-media)]">Sin salidas esta semana.</p> : (
          <div className="overflow-x-auto">
            <table className="panel-tabla w-full min-w-[640px] text-[13px] font-dm">
              <thead><tr><th className="px-4 py-2 text-left">Fecha</th><th className="px-2 py-2 text-left">Tour</th><th className="px-2 py-2 text-left">Clientes</th><th className="px-2 py-2 text-right">Pax</th><th className="px-2 py-2 text-right">Margen est.</th><th className="px-4 py-2 text-left">Estado</th></tr></thead>
              <tbody>
                {salidasSemana.map(s => (
                  <tr key={s.clave}>
                    <td className="whitespace-nowrap px-4 py-2 capitalize">{dia(s.fecha)}</td>
                    <td className="px-2 py-2"><Link href={`/admin/salidas-dia/${encodeURIComponent(s.clave)}`} className="panel-foco inline-block rounded px-1.5 py-0.5 text-[11px] font-bold hover:underline" style={{ color: colorDeTour(s.codigo === "OTR" ? "" : s.clave.split("|")[1]), background: colorDeTour(s.clave.split("|")[1]) + "1f" }}>{s.codigo}</Link></td>
                    <td className="max-w-[220px] truncate px-2 py-2 text-[var(--panel-tinta-media)]">{s.clientes.join(", ")}</td>
                    <td className="panel-cifra px-2 py-2 text-right">{s.personas}{s.cupo !== null ? `/${s.cupo}` : ""}</td>
                    <td className="panel-cifra px-2 py-2 text-right">{s.margen === null ? <span className="text-[var(--panel-tinta-suave)]">Faltan costos</span> : fmx(s.margen)}</td>
                    <td className="px-4 py-2"><ChipEstado tono={TONO_ESTADO_SALIDA[s.estadoPax] as TonoEstado}>{ETIQUETA_ESTADO_SALIDA[s.estadoPax]}</ChipEstado></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
