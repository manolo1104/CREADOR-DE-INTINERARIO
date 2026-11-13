"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ConfigAgente } from "@/lib/admin/agente/claude";
import { playError, playSuccess } from "@/lib/admin/sfx";
import { botonPrimario, botonSecundario, inputCls } from "../leads/comun";

/** Encender o apagar el agente y su tope mensual (solo Manolo). */
export default function AgenteClient({ inicial, puedeCambiar }: { inicial: ConfigAgente; puedeCambiar: boolean }) {
  const router = useRouter();
  const [tope, setTope] = useState(String(inicial.topeUsd));
  const [msj, setMsj] = useState<{ texto: string; error?: boolean } | null>(null);
  async function guardar(cambio: Partial<ConfigAgente>) {
    const r = await fetch("/api/admin/agente", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cambio) }).catch(() => null);
    const d = await r?.json().catch(() => null);
    if (!r?.ok) { playError(); setMsj({ texto: d?.error || "No se pudo guardar", error: true }); return; }
    playSuccess(); setMsj({ texto: "Guardado" }); router.refresh();
  }
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 text-[13px] font-dm">
      <span className={`font-semibold ${inicial.encendido ? "text-[var(--panel-bien)]" : "text-[var(--panel-problema)]"}`}>{inicial.encendido ? "Encendido" : "Apagado"}</span>
      {puedeCambiar ? (
        <>
          <button type="button" onClick={() => void guardar({ encendido: !inicial.encendido })} className={botonSecundario}>{inicial.encendido ? "Apagar" : "Encender"}</button>
          <form className="flex items-center gap-2" onSubmit={e => { e.preventDefault(); void guardar({ topeUsd: Number(tope) }); }}>
            <label className="text-[var(--panel-tinta-media)]" htmlFor="tope">Tope al mes (USD)</label>
            <input id="tope" inputMode="decimal" value={tope} onChange={e => setTope(e.target.value.replace(/[^\d.]/g, ""))} className={`${inputCls} w-24`} />
            <button type="submit" className={botonPrimario}>Guardar tope</button>
          </form>
        </>
      ) : <span className="text-[var(--panel-tinta-media)]">Solo Manolo lo enciende, lo apaga o cambia el tope.</span>}
      {msj && <span role="status" className={msj.error ? "text-[var(--panel-problema)]" : "text-[var(--panel-bien)]"}>{msj.texto}</span>}
    </div>
  );
}
