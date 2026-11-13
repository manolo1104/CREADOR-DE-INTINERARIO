"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { playError, playSuccess } from "@/lib/admin/sfx";
import { botonPrimario, botonSecundario } from "../leads/comun";

interface H { id: string; tipo: string; titulo: string; evidencia: string; frecuencia: string | null; impacto: string | null; solucion: string; responsable: string | null; estado: string }
const TIPO: Record<string, string> = { repetitiva: "Tarea repetitiva", error: "Error", incidencia: "Incidencia" };

/** El reporte de oportunidades de los jueves: cada hallazgo se vuelve tarea o se descarta (solo Manolo). */
export default function ReporteClient({ semana, semanaActual, hallazgos, puedeCambiar }: { semana: string | null; semanaActual: string; hallazgos: H[]; puedeCambiar: boolean }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [msj, setMsj] = useState<{ texto: string; error?: boolean } | null>(null);
  async function llamar(metodo: "POST" | "PATCH", cuerpo: object, que: string, ok: string) {
    if (ocupado) return;
    setOcupado(que); setMsj(null);
    const r = await fetch("/api/admin/agente/reporte", { method: metodo, headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setOcupado(null);
    if (!r?.ok) { playError(); setMsj({ texto: d?.error || "No se pudo", error: true }); return; }
    playSuccess(); setMsj({ texto: ok }); router.refresh();
  }
  return (
    <section className="panel-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-cormorant text-[22px] text-[var(--panel-tinta)]">Reporte de los jueves</h2>
        {puedeCambiar && <button type="button" disabled={!!ocupado} onClick={() => void llamar("POST", { semana: semanaActual }, "generar", "Reporte listo")} className={botonSecundario}>{ocupado === "generar" ? "Armando el reporte…" : semana === semanaActual ? "Volver a armarlo" : "Armar el de esta semana"}</button>}
      </div>
      <p className="text-[12.5px] font-dm text-[var(--panel-tinta-media)]">Sale solo cada jueves a las 7:00. {semana ? `Semana del ${semana}.` : "Todavía no hay ninguno."}</p>
      {msj && <p role="status" className={`mt-1 text-[12.5px] font-dm ${msj.error ? "text-[var(--panel-problema)]" : "text-[var(--panel-bien)]"}`}>{msj.texto}</p>}
      <ul className="mt-3 space-y-3">
        {hallazgos.map(h => (
          <li key={h.id} className={`rounded-[var(--panel-radio-sm)] border border-[var(--panel-borde)] p-3 text-[13px] font-dm ${h.estado === "descartado" ? "opacity-50" : ""}`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--panel-tinta-suave)]">{TIPO[h.tipo] ?? h.tipo}{h.frecuencia ? ` · ${h.frecuencia}` : ""}{h.estado !== "nuevo" ? ` · ${h.estado === "aceptado" ? "es tarea" : "descartado"}` : ""}</p>
            <p className="mt-0.5 text-[14.5px] font-semibold text-[var(--panel-tinta)]">{h.titulo}</p>
            <p className="mt-1 text-[var(--panel-tinta-media)]"><span className="font-medium text-[var(--panel-tinta)]">Evidencia:</span> {h.evidencia}</p>
            {h.impacto && <p className="text-[var(--panel-tinta-media)]"><span className="font-medium text-[var(--panel-tinta)]">Impacto:</span> {h.impacto}</p>}
            <p className="text-[var(--panel-tinta-media)]"><span className="font-medium text-[var(--panel-tinta)]">Propuesta:</span> {h.solucion}{h.responsable ? ` (${h.responsable})` : ""}</p>
            {puedeCambiar && h.estado === "nuevo" && (
              <div className="mt-2 flex gap-2">
                <button type="button" disabled={!!ocupado} onClick={() => void llamar("PATCH", { id: h.id, accion: "aceptar" }, h.id, "Hecho: quedó como seguimiento")} className={`${botonPrimario} min-h-[36px]`}>Volverlo tarea</button>
                <button type="button" disabled={!!ocupado} onClick={() => void llamar("PATCH", { id: h.id, accion: "descartar" }, h.id, "Descartado")} className={`${botonSecundario} min-h-[36px]`}>Descartar</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
