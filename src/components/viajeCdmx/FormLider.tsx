"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { sessionId } from "@/lib/tourTracker";
import { LIDER_PERSONAS, VIAJE_RUTA } from "@/lib/viajeCdmx/config";
import { medir } from "./medicion";

/** «Arma tu grupo y viaja gratis»: el líder deja sus datos y recibe su liga. */
export function FormLider() {
  const [d, setD] = useState({ nombre: "", email: "", whatsapp: "", personasEstimadas: LIDER_PERSONAS, notas: "" });
  const [estado, setEstado] = useState<"" | "enviando" | "listo">("");
  const [error, setError] = useState("");
  const [liga, setLiga] = useState("");
  const [copiado, setCopiado] = useState(false);
  const campo = "w-full bg-negro/60 border border-white/15 text-crema placeholder:text-crema/35 px-3 py-3 text-base font-dm focus:outline-none focus:border-dorado";

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setEstado("enviando");
    try {
      const r = await fetch("/api/viaje-cdmx/lider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...d, sid: sessionId() }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "No se pudo guardar.");
      medir("formulario_lider", { personas: d.personasEstimadas });
      setLiga(`${window.location.origin}${j.liga || `${VIAJE_RUTA}?lider=${j.codigo}`}`);
      setEstado("listo");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
      setEstado("");
    }
  }

  if (estado === "listo") {
    return (
      <div className="space-y-4" role="status">
        <p className="font-cormorant text-crema text-3xl">¡Listo, {d.nombre.split(" ")[0]}!</p>
        <p className="text-sm font-dm text-crema/70">
          Comparte esta liga con tu grupo. Cuando {LIDER_PERSONAS} personas aparten con ella, tú viajas gratis. También te la mandamos a <strong>{d.email}</strong> y te escribimos por WhatsApp.
        </p>
        <div className="flex items-stretch gap-2">
          <input readOnly value={liga} className={`${campo} text-sm`} onFocus={(e) => e.currentTarget.select()} aria-label="Tu liga para compartir" />
          <button
            type="button"
            onClick={() => { navigator.clipboard?.writeText(liga).then(() => setCopiado(true)).catch(() => {}); }}
            className="shrink-0 min-w-[48px] border border-dorado text-dorado inline-flex items-center justify-center"
            aria-label="Copiar liga"
          >
            {copiado ? <Check className="w-4 h-4" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="space-y-3">
      <input className={campo} placeholder="Tu nombre" autoComplete="name" required minLength={2} value={d.nombre} onChange={(e) => setD({ ...d, nombre: e.target.value })} />
      <input className={campo} placeholder="Tu correo" type="email" inputMode="email" autoComplete="email" required value={d.email} onChange={(e) => setD({ ...d, email: e.target.value })} />
      <input className={campo} placeholder="Tu WhatsApp a 10 dígitos" type="tel" inputMode="tel" autoComplete="tel" required value={d.whatsapp} onChange={(e) => setD({ ...d, whatsapp: e.target.value })} />
      <label className="block text-sm font-dm text-crema/70">
        ¿Cuántos creen que van?
        <select className={`${campo} mt-1`} value={d.personasEstimadas} onChange={(e) => setD({ ...d, personasEstimadas: Number(e.target.value) })}>
          {[4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map((n) => <option key={n} value={n}>{n} personas</option>)}
        </select>
      </label>
      <textarea className={`${campo} min-h-[88px]`} placeholder="¿Alguna fecha en mente o algo que debamos saber? (opcional)" value={d.notas} onChange={(e) => setD({ ...d, notas: e.target.value })} maxLength={500} />
      {error && <p className="text-sm font-dm text-terracota" role="alert">{error}</p>}
      <button type="submit" disabled={estado === "enviando"} className="w-full min-h-[52px] bg-dorado text-negro hover:bg-crema disabled:opacity-60 text-[12px] tracking-[2px] uppercase font-dm transition-colors">
        {estado === "enviando" ? "Enviando…" : "Quiero armar mi grupo"}
      </button>
    </form>
  );
}
