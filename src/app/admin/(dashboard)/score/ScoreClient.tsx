"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import {
  RUBRICA, ETIQUETA_BANDA, META_SCORE, bandaScore, calcularScore, limpiarCaptura, recomendacionesSugeridas, type CapturaRubrica,
} from "@/lib/admin/rubrica";
import { ChipEstado, type TonoEstado } from "@/components/admin/ui/ChipEstado";
import { playError, playSuccess } from "@/lib/admin/sfx";
import { botonPrimario, botonSecundario, etiquetaCls, inputCls } from "../leads/comun";

interface Inicial {
  rubrica: CapturaRubrica; revisadas: string; recomendaciones: string;
  /** Score capturado a mano en Inicio antes de que existiera la rúbrica. */
  scoreSinRubrica: number | null;
  guardadoPor: string | null; enviadoOperadorEn: string | null;
}

const TONO_BANDA: Record<string, TonoEstado> = { meta: "bien", cerca: "atencion", corregir: "problema" };
const celda = "w-16 rounded-[var(--panel-radio-sm)] border border-[var(--panel-borde)] bg-white px-2 py-2 text-center text-[16px] font-dm text-[var(--panel-tinta)] panel-foco disabled:bg-[var(--panel-fondo-velo)]";

export default function ScoreClient({ semana, inicial, puedeEditar, tendencia }: {
  semana: string; inicial: Inicial; puedeEditar: boolean; tendencia: { semana: string; score: number | null }[];
}) {
  const router = useRouter();
  // Se edita como texto (un campo vacío no es un cero) y se limpia al calcular.
  const [cap, setCap] = useState<Record<string, { aplican: string; cumplen: string }>>(() =>
    Object.fromEntries(RUBRICA.map(r => [r.clave, { aplican: inicial.rubrica[r.clave]?.aplican?.toString() ?? "", cumplen: inicial.rubrica[r.clave]?.cumplen?.toString() ?? "" }])));
  const [revisadas, setRevisadas] = useState(inicial.revisadas);
  const [recs, setRecs] = useState(inicial.recomendaciones);
  const [guardando, setGuardando] = useState<null | "guardar" | "mandar">(null);
  const [msj, setMsj] = useState<{ texto: string; error?: boolean } | null>(null);
  const [enviado, setEnviado] = useState(inicial.enviadoOperadorEn);

  const captura = useMemo(() => limpiarCaptura(Object.fromEntries(Object.entries(cap).filter(([, v]) => v.aplican !== "").map(([k, v]) => [k, { aplican: v.aplican, cumplen: v.cumplen || 0 }]))), [cap]);
  const r = useMemo(() => calcularScore(captura), [captura]);
  const score = r.score ?? inicial.scoreSinRubrica;
  const banda = bandaScore(score);
  const maxT = 100;

  const set = (clave: string, campo: "aplican" | "cumplen") => (e: React.ChangeEvent<HTMLInputElement>) =>
    setCap(c => ({ ...c, [clave]: { ...c[clave], [campo]: e.target.value.replace(/\D/g, "").slice(0, 4) } }));

  async function guardar(mandar: boolean) {
    if (guardando) return;
    if (mandar && !window.confirm("¿Guardar y mandarle a Erick su score con las recomendaciones?")) return;
    setGuardando(mandar ? "mandar" : "guardar"); setMsj(null);
    try {
      const res = await fetch("/api/admin/score", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ semana, rubrica: captura, revisadas, recomendaciones: recs, mandar }) });
      const d = await res.json().catch(() => null);
      if (!res.ok || !d?.ok) { playError(); setMsj({ texto: d?.error || "No se pudo guardar", error: true }); return; }
      playSuccess();
      if (d.enviado) setEnviado(d.enviadoOperadorEn);
      setMsj({ texto: d.enviado ? "Guardado y mandado a Erick" : "Guardado: el scorecard de Inicio ya usa este score" });
      router.refresh();
    } catch { playError(); setMsj({ texto: "No se pudo guardar", error: true }); }
    finally { setGuardando(null); }
  }

  return (
    <div className="space-y-5">
      {/* El número de la semana y la tendencia */}
      <section className="panel-card grid gap-4 p-4 sm:grid-cols-[auto_1fr] sm:items-center">
        <div>
          <p className={etiquetaCls}>Score de la semana</p>
          <p className="font-cormorant text-[56px] leading-none text-[var(--panel-tinta)]">{score ?? "—"}<span className="text-[20px] text-[var(--panel-tinta-suave)]"> / 100</span></p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {banda ? <ChipEstado tono={TONO_BANDA[banda]}>{ETIQUETA_BANDA[banda]}</ChipEstado> : <ChipEstado tono="neutro">Sin capturar</ChipEstado>}
            <span className="text-[12px] font-dm text-[var(--panel-tinta-media)]">meta {META_SCORE}{r.score === null && inicial.scoreSinRubrica !== null ? " · capturado a mano en Inicio" : ""}</span>
          </div>
        </div>
        <div aria-label="Tendencia de las últimas 8 semanas">
          <p className={etiquetaCls}>Últimas 8 semanas</p>
          <div className="mt-2 flex h-24 items-end gap-1.5">
            {tendencia.map(t => {
              const v = t.semana === semana ? score : t.score;
              const b = bandaScore(v);
              return (
                <div key={t.semana} className="flex flex-1 flex-col items-center gap-1" title={`${t.semana}: ${v ?? "sin revisión"}`}>
                  <span className="panel-cifra text-[10.5px] font-dm text-[var(--panel-tinta-media)]">{v ?? ""}</span>
                  <div className="w-full rounded-t-[4px]" style={{ height: `${v === null ? 3 : Math.max(6, (v / maxT) * 64)}px`, background: v === null ? "var(--panel-borde)" : b === "meta" ? "var(--panel-bien)" : b === "cerca" ? "var(--panel-atencion)" : "var(--panel-problema)", outline: t.semana === semana ? "2px solid var(--panel-tinta)" : undefined, outlineOffset: 1 }} />
                  <span className="text-[10px] font-dm text-[var(--panel-tinta-suave)]">{t.semana.slice(8)}/{t.semana.slice(5, 7)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* La rúbrica */}
      <section className="panel-card overflow-hidden">
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-4 pt-4">
          <h2 className="font-cormorant text-[22px] text-[var(--panel-tinta)]">Rúbrica</h2>
          <p className="text-[12px] font-dm text-[var(--panel-tinta-media)]">Por regla: en cuántos chats aplicó y cuántos la cumplieron. Vacío = no aplicó (se deja fuera y el total se reescala a 100).</p>
        </div>
        <div className="mt-2 overflow-x-auto">
          <table className="panel-tabla w-full min-w-[620px] text-[13px] font-dm">
            <thead><tr className="text-left text-[11px] uppercase tracking-[0.1em] text-[var(--panel-tinta-suave)]">
              <th className="px-4 py-2">Regla</th><th className="px-2 py-2 text-right">Pts</th><th className="px-2 py-2 text-center">Aplica en</th><th className="px-2 py-2 text-center">Cumplen</th><th className="px-4 py-2 text-right">Resultado</th>
            </tr></thead>
            <tbody>
              {r.reglas.map(x => (
                <tr key={x.clave} className="border-t border-[var(--panel-borde)] align-top">
                  <td className="px-4 py-2.5"><p className="font-medium text-[var(--panel-tinta)]">{x.texto}</p><p className="text-[11.5px] text-[var(--panel-tinta-suave)]">{x.aplica}</p></td>
                  <td className="panel-cifra px-2 py-2.5 text-right text-[var(--panel-tinta-media)]">{x.puntos}</td>
                  <td className="px-2 py-2 text-center"><input aria-label={`${x.texto}: chats donde aplica`} inputMode="numeric" value={cap[x.clave].aplican} onChange={set(x.clave, "aplican")} disabled={!puedeEditar} className={celda} placeholder="—" /></td>
                  <td className="px-2 py-2 text-center"><input aria-label={`${x.texto}: chats que la cumplen`} inputMode="numeric" value={cap[x.clave].cumplen} onChange={set(x.clave, "cumplen")} disabled={!puedeEditar || cap[x.clave].aplican === ""} className={celda} placeholder="—" /></td>
                  <td className={`panel-cifra px-4 py-2.5 text-right ${x.pct === null ? "text-[var(--panel-tinta-suave)]" : x.pct < 70 ? "text-[var(--panel-problema)]" : x.pct < 85 ? "text-[var(--panel-atencion)]" : "text-[var(--panel-bien)]"}`}>
                    {x.pct === null ? "No aplicó" : `${x.pct} % · ${(x.obtenidos ?? 0).toFixed(1)} pts`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="px-4 py-3 text-[11.5px] font-dm text-[var(--panel-tinta-suave)]">Los chats que atiende Manolo no cuentan para el operador. El mensaje automático de vencimiento no cuenta como seguimiento.</p>
      </section>

      {/* Notas y recomendaciones */}
      <section className="grid gap-4 lg:grid-cols-2">
        <label className={`${etiquetaCls} panel-card p-4`}>Conversaciones revisadas (una por renglón, con su nota)
          <textarea value={revisadas} onChange={e => setRevisadas(e.target.value)} disabled={!puedeEditar} rows={6} className={`${inputCls} mt-2 normal-case tracking-normal`} placeholder={"Ana (Tamul, 4 pax): cotizó en 10 min, faltó el siguiente paso\n…"} /></label>
        <div className="panel-card p-4">
          <div className="flex items-baseline justify-between gap-2">
            <span className={etiquetaCls}>Para la próxima semana</span>
            {puedeEditar && r.peores.length > 0 && <button type="button" onClick={() => setRecs(t => [t.trim(), ...recomendacionesSugeridas(r)].filter(Boolean).join("\n"))} className="panel-foco text-[12px] font-dm font-semibold text-[var(--panel-acento)] hover:underline">Proponer desde la rúbrica</button>}
          </div>
          <textarea aria-label="Recomendaciones para la próxima semana" value={recs} onChange={e => setRecs(e.target.value)} disabled={!puedeEditar} rows={6} className={`${inputCls} mt-2`} placeholder="Una por renglón: es lo que le llega al operador." />
        </div>
      </section>

      {puedeEditar ? (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => void guardar(false)} disabled={!!guardando} className={botonSecundario}>{guardando === "guardar" ? "Guardando…" : "Guardar"}</button>
          <button type="button" onClick={() => void guardar(true)} disabled={!!guardando || r.score === null} className={botonPrimario}><Send className="h-4 w-4" aria-hidden="true" />{guardando === "mandar" ? "Mandando…" : "Guardar y mandar a Erick"}</button>
          {msj && <p role="status" className={`text-[13px] font-dm ${msj.error ? "text-[var(--panel-problema)]" : "text-[var(--panel-bien)]"}`}>{msj.texto}</p>}
          {enviado && !msj && <p className="text-[12px] font-dm text-[var(--panel-tinta-media)]">Mandado a Erick el {new Date(enviado).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" })}</p>}
        </div>
      ) : (
        <p className="text-[12.5px] font-dm text-[var(--panel-tinta-media)]">Es tu score de la semana: lo capturan Manolo o Martín en la revisión de los jueves.{inicial.guardadoPor ? ` Última revisión: ${inicial.guardadoPor}.` : ""}</p>
      )}
    </div>
  );
}
