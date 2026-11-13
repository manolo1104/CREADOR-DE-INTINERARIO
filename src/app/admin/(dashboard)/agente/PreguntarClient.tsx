"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { playError } from "@/lib/admin/sfx";
import { inputCls } from "../leads/comun";

interface Turno { rol: "user" | "assistant"; texto: string; consultas?: string[]; costo?: number }
const EJEMPLOS = ["¿Qué salidas de diciembre van con menos de 3 personas?", "¿Quién tiene saldo pendiente esta semana?", "¿Cuántos leads están en Cotizado y cuál es el más viejo?"];

/** «Pregúntale al panel»: el agente consulta (solo lectura) y contesta. La plática vive solo en esta pantalla. */
export default function PreguntarClient() {
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [q, setQ] = useState("");
  const [pensando, setPensando] = useState(false);
  async function preguntar(texto: string) {
    const t = texto.trim();
    if (!t || pensando) return;
    const historial = turnos.map(x => ({ rol: x.rol, texto: x.texto }));
    setTurnos(ts => [...ts, { rol: "user", texto: t }]); setQ(""); setPensando(true);
    const r = await fetch("/api/admin/agente/preguntar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pregunta: t, historial }) }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setPensando(false);
    if (!r?.ok || !d?.ok) { playError(); setTurnos(ts => [...ts, { rol: "assistant", texto: `⚠️ ${d?.error || "No se pudo contestar"}` }]); return; }
    setTurnos(ts => [...ts, { rol: "assistant", texto: d.respuesta, consultas: d.consultas, costo: d.costoUsd }]);
  }
  return (
    <section className="panel-card p-4">
      <h2 className="font-cormorant text-[22px] text-[var(--panel-tinta)]">Pregúntale al panel</h2>
      <p className="text-[12.5px] font-dm text-[var(--panel-tinta-media)]">Consulta salidas, reservas, leads, cotizaciones y el scorecard. Solo lee: no cambia nada.</p>
      <div className="mt-3 space-y-3">
        {turnos.length === 0 && <div className="flex flex-wrap gap-2">{EJEMPLOS.map(e => <button key={e} type="button" onClick={() => void preguntar(e)} className="panel-foco rounded-full border border-[var(--panel-borde)] bg-white px-3 py-1.5 text-left text-[12.5px] font-dm text-[var(--panel-tinta-media)] hover:border-[var(--panel-acento)]">{e}</button>)}</div>}
        {turnos.map((t, i) => (
          <div key={i} className={t.rol === "user" ? "text-right" : ""}>
            <div className={`inline-block max-w-[92%] whitespace-pre-wrap rounded-[12px] px-3 py-2 text-left text-[13.5px] font-dm ${t.rol === "user" ? "bg-[var(--panel-acento)] text-white" : "bg-[var(--panel-fondo-velo)] text-[var(--panel-tinta)]"}`}>{t.texto}</div>
            {t.consultas && <p className="mt-0.5 text-[11px] font-dm text-[var(--panel-tinta-suave)]">Consultó: {t.consultas.join(" · ") || "nada"}{typeof t.costo === "number" ? ` · $${t.costo.toFixed(3)} USD` : ""}</p>}
          </div>
        ))}
        {pensando && <p className="text-[12.5px] font-dm text-[var(--panel-tinta-media)]">Consultando el panel…</p>}
      </div>
      <form className="mt-3 flex gap-2" onSubmit={e => { e.preventDefault(); void preguntar(q); }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Escribe tu pregunta" aria-label="Pregunta para el panel" className={inputCls} />
        <button type="submit" disabled={!q.trim() || pensando} aria-label="Preguntar" className="panel-foco inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--panel-acento)] text-white disabled:opacity-40"><Send className="h-4 w-4" aria-hidden="true" /></button>
      </form>
    </section>
  );
}
