"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageCircle } from "lucide-react";
import { Cifra } from "@/components/admin/Cifra";
import { playError, playSuccess } from "@/lib/admin/sfx";
import type { PuntoGoogle, ResumenSatisfaccion } from "@/lib/admin/satisfaccion";

const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)} %` : "—");
const fFecha = (ymd: string) => new Date(`${ymd}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
const fCuando = (iso: string) => new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", timeZone: "America/Mexico_City" });

/**
 * Lo de arriba de Reseñas (21 oct 2026): cómo vamos en Google (a mano), qué
 * dice la encuesta propia, cuántos vuelven y cuántos llegan recomendados. Y la
 * lista de respuestas, con las de 3 estrellas o menos en rojo para escribirles.
 */
export function Satisfaccion({ r }: { r: ResumenSatisfaccion }) {
  const router = useRouter();
  const [hist, setHist] = useState<PuntoGoogle[]>(r.google.historial);
  const [rating, setRating] = useState(r.google.actual ? String(r.google.actual.rating) : "");
  const [total, setTotal] = useState(r.google.actual ? String(r.google.actual.total) : "");
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState("");
  const actual = hist.at(-1) ?? null;
  const e = r.encuesta;

  async function guardarGoogle() {
    setGuardando(true); setAviso("");
    try {
      const res = await fetch("/api/admin/resenas/google", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: Number(rating.replace(",", ".")), total: Number(total) }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setAviso(`❌ ${j.error || "No se pudo guardar."}`); playError(); return; }
      setHist(j.historial); setAviso("✅ Guardado"); playSuccess();
      // El «+N en 30 días» lo calcula el servidor: se vuelve a pedir.
      router.refresh();
    } catch { setAviso("❌ Sin conexión."); playError(); }
    finally { setGuardando(false); }
  }

  const nuevas = (n: number | null, dias: number) => (n === null ? null : `${n >= 0 ? "+" : ""}${n} en ${dias} días`);

  return (
    <div className="mb-8">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <Cifra etiqueta="Google" tono={actual ? "acento" : "apagado"}
          valor={actual ? `${actual.rating.toFixed(1)} ★` : "—"}
          pie={actual ? `${actual.total} reseñas · ${nuevas(r.google.nuevas30, 30) ?? `anotado el ${fFecha(actual.fecha)}`}` : "Anótala abajo"} />
        <Cifra etiqueta={`Encuesta · ${r.dias} días`} tono={e.promedio === null ? "apagado" : e.promedio >= 4.5 ? "positivo" : e.promedio >= 4 ? "acento" : "alerta"}
          valor={e.promedio === null ? "—" : `${e.promedio.toFixed(1)} ★`}
          pie={`${e.contestadas} de ${e.enviadas} contestaron (${pct(e.contestadas, e.enviadas)})`} />
        <Cifra etiqueta="Nos recomendarían (NPS)" tono={e.nps === null ? "apagado" : e.nps >= 50 ? "positivo" : e.nps >= 0 ? "acento" : "alerta"}
          valor={e.nps === null ? "—" : `${e.nps > 0 ? "+" : ""}${e.nps}`}
          pie={e.conNps ? `${e.promotores} dan 9-10 · ${e.detractores} dan 0-6` : "Aún sin respuestas"} />
        <Cifra etiqueta="Clientes que vuelven" tono={r.vuelven.repiten ? "positivo" : "neutro"}
          valor={pct(r.vuelven.repiten, r.vuelven.clientes)}
          pie={`${r.vuelven.repiten} de ${r.vuelven.clientes} han reservado más de una vez`} />
        <Cifra etiqueta="Llegaron recomendados" tono={r.recomendacion.checkins ? "neutro" : "apagado"}
          valor={pct(r.recomendacion.porRecomendacion, r.recomendacion.checkins)}
          pie={`${r.recomendacion.porRecomendacion} de ${r.recomendacion.checkins} check-ins (${r.dias} días)`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5 items-start">
        <div className="panel-card overflow-hidden">
          <p className="panel-eyebrow px-5 pt-4 pb-2">Lo que contestaron en la encuesta</p>
          {r.respuestas.length === 0 ? (
            <p className="px-5 pb-6 pt-2 text-[13px] font-dm text-[rgba(22,54,42,0.5)]">
              Todavía nadie contesta. La encuesta sale sola el día siguiente del tour, en el mismo correo que pide la reseña de Google.
            </p>
          ) : (
            <ul>
              {r.respuestas.map((x) => {
                const mala = x.calificacion <= 3;
                const tel = (x.telefono ?? "").replace(/\D/g, "");
                return (
                  <li key={x.bookingId} className={`flex flex-wrap items-start gap-x-4 gap-y-1 border-t border-[#1B4332]/10 px-5 py-3 ${mala ? "bg-red-50" : ""}`}>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-dm text-[#16362a]">
                        <span className={mala ? "text-red-700" : "text-[#a86814]"} aria-label={`${x.calificacion} de 5`}>
                          {"★".repeat(x.calificacion)}<span className="text-[#1B4332]/20">{"★".repeat(5 - x.calificacion)}</span>
                        </span>{" "}
                        {x.nombre}
                        {x.recomendaria !== null && <span className="text-[12px] text-[rgba(22,54,42,0.55)]"> · recomendaría {x.recomendaria}/10</span>}
                      </p>
                      <p className="text-[12px] font-dm text-[rgba(22,54,42,0.55)]">{x.tour} · {fFecha(x.fechaTour)} · contestó el {fCuando(x.en)}</p>
                      {x.comentario && <p className="text-[13px] font-dm text-[#16362a] mt-1">«{x.comentario}»</p>}
                    </div>
                    {mala && tel.length >= 10 && (
                      <a href={`https://wa.me/${tel.length === 10 ? `52${tel}` : tel}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 bg-[#25D366] hover:bg-[#20ba59] text-white px-3 py-1.5 text-[12px] font-dm rounded-[7px] panel-pulsable panel-foco">
                        <MessageCircle className="w-3.5 h-3.5" /> Escribirle
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="panel-card p-5">
          <p className="panel-eyebrow mb-2">Anotar lo que dice Google</p>
          <p className="text-[12px] font-dm text-[rgba(22,54,42,0.6)] mb-3">
            Una vez por semana: abre tu perfil de Google y copia las estrellas y el número de reseñas.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[10px] tracking-[1.5px] uppercase font-dm text-[rgba(22,54,42,0.5)]">Estrellas
              <input inputMode="decimal" value={rating} onChange={(ev) => setRating(ev.target.value)} placeholder="4.7"
                className="mt-1 w-full border border-[#1B4332]/15 rounded-sm px-3 py-2 text-base font-dm text-[#16362a] normal-case tracking-normal" />
            </label>
            <label className="text-[10px] tracking-[1.5px] uppercase font-dm text-[rgba(22,54,42,0.5)]">Reseñas
              <input inputMode="numeric" value={total} onChange={(ev) => setTotal(ev.target.value)} placeholder="161"
                className="mt-1 w-full border border-[#1B4332]/15 rounded-sm px-3 py-2 text-base font-dm text-[#16362a] normal-case tracking-normal" />
            </label>
          </div>
          <button type="button" onClick={guardarGoogle} disabled={guardando || !rating || !total}
            className="mt-3 w-full inline-flex items-center justify-center gap-2 bg-[#1B4332] hover:bg-[#16362a] text-white px-3.5 py-2 text-[12px] font-dm rounded-[7px] panel-pulsable panel-foco disabled:opacity-40">
            {guardando && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Guardar lectura de hoy
          </button>
          {aviso && <p className="mt-2 text-[12px] font-dm text-[#16362a]">{aviso}</p>}
          {hist.length > 0 && (
            <table className="mt-4 w-full text-[12px] font-dm text-[#16362a]">
              <thead>
                <tr className="text-[10px] tracking-[1.5px] uppercase text-[rgba(22,54,42,0.45)]">
                  <th className="text-left font-normal pb-1">Fecha</th>
                  <th className="text-right font-normal pb-1">★</th>
                  <th className="text-right font-normal pb-1">Reseñas</th>
                  <th className="text-right font-normal pb-1">Nuevas</th>
                </tr>
              </thead>
              <tbody>
                {[...hist].reverse().slice(0, 10).map((p, i, arr) => {
                  const prev = arr[i + 1];
                  return (
                    <tr key={p.fecha} className="border-t border-[#1B4332]/10">
                      <td className="py-1">{fFecha(p.fecha)}</td>
                      <td className="py-1 text-right">{p.rating.toFixed(1)}</td>
                      <td className="py-1 text-right">{p.total}</td>
                      <td className="py-1 text-right text-[rgba(22,54,42,0.55)]">{prev ? `${p.total - prev.total >= 0 ? "+" : ""}${p.total - prev.total}` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
