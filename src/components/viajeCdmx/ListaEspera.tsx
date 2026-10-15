"use client";

import { useState } from "react";
import { sessionId } from "@/lib/tourTracker";
import { medir } from "./medicion";

/**
 * Anotarse para que avisemos: en una fecha agotada (si se libera un lugar) o
 * en «la siguiente que abra» (`salidaId` vacío). El aviso sale por correo, solo
 * y automático; el WhatsApp es opcional y lo usa el equipo para escribir a mano.
 */
export function ListaEspera({
  salidaId = "",
  titulo,
  explicacion,
  tono = "oscuro",
}: {
  salidaId?: string;
  titulo: string;
  explicacion: string;
  tono?: "oscuro" | "claro";
}) {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [personas, setPersonas] = useState(1);
  const [estado, setEstado] = useState<"" | "enviando" | "listo">("");
  const [error, setError] = useState("");

  const claro = tono === "claro";
  const campo = claro
    ? "w-full bg-white border border-verde-profundo/20 text-verde-profundo placeholder:text-verde-profundo/40 px-3 py-3 text-base font-dm focus:outline-none focus:border-verde-selva"
    : "w-full bg-negro/60 border border-white/15 text-crema placeholder:text-crema/35 px-3 py-3 text-base font-dm focus:outline-none focus:border-dorado";

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setEstado("enviando");
    try {
      const res = await fetch("/api/viaje-cdmx/lista-espera", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salidaId, nombre, email, whatsapp, personas, sid: sessionId() }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "No se pudo guardar. Intenta de nuevo.");
      medir("unirse_lista_espera", { salida: salidaId || "siguiente", personas });
      setEstado("listo");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
      setEstado("");
    }
  }

  if (estado === "listo") {
    return (
      <div className={claro ? "text-verde-profundo" : "text-crema"}>
        <p className="font-cormorant text-2xl mb-1">Listo, {nombre.split(" ")[0]}.</p>
        <p className={`text-sm font-dm ${claro ? "text-verde-profundo/70" : "text-crema/65"}`}>
          Te escribimos a <strong>{email}</strong> en cuanto haya lugar.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="space-y-3">
      <div>
        <p className={`font-cormorant text-2xl leading-tight ${claro ? "text-verde-profundo" : "text-crema"}`}>{titulo}</p>
        <p className={`text-sm font-dm mt-1 ${claro ? "text-verde-profundo/70" : "text-crema/60"}`}>{explicacion}</p>
      </div>
      <input className={campo} placeholder="Tu nombre" autoComplete="name" required minLength={2} value={nombre} onChange={(e) => setNombre(e.target.value)} />
      <input className={campo} placeholder="Tu correo" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <input className={campo} placeholder="WhatsApp (opcional)" type="tel" autoComplete="tel" inputMode="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
        <select aria-label="Cuántas personas" className={`${campo} w-auto`} value={personas} onChange={(e) => setPersonas(Number(e.target.value))}>
          {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>{n} {n === 1 ? "persona" : "personas"}</option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm font-dm text-terracota" role="alert">{error}</p>}
      <button
        type="submit"
        disabled={estado === "enviando"}
        className={`w-full min-h-[48px] px-6 text-[11px] tracking-[2px] uppercase font-dm transition-colors disabled:opacity-60 ${claro ? "bg-verde-profundo text-crema hover:bg-verde-selva" : "border border-dorado text-dorado hover:bg-dorado hover:text-negro"}`}
      >
        {estado === "enviando" ? "Guardando…" : "Avísame"}
      </button>
    </form>
  );
}
