"use client";

import { useState } from "react";
import { Download, Check } from "lucide-react";
import { trackTourEvent } from "@/lib/tourTracker";

/**
 * La Guía Definitiva, gratis a cambio del correo.
 *
 * Antes se vendía a $49 desde el inicio. Cobrar por el imán de leads es cobrar
 * por lo único que convierte a un visitante frío en alguien a quien puedes
 * escribirle: casi nadie paga, y los que no pagan se van sin dejar rastro. El
 * PDF ya existe en `public/`, así que regalarlo no cuesta nada y a cambio entra
 * un correo a la secuencia.
 */
export function GuiaGratisForm() {
  const [email, setEmail]   = useState("");
  const [estado, setEstado] = useState<"idle" | "enviando" | "listo" | "error">("idle");

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEstado("error");
      return;
    }
    setEstado("enviando");
    try {
      await fetch("/api/guardar-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), fuente: "Guía gratis (inicio)" }),
      });
    } catch {
      // El lead es nuestro problema, no del visitante: si falla el guardado, la
      // descarga se le entrega igual. Prometimos la guía a cambio del correo y
      // el correo ya lo dio.
    }
    trackTourEvent("LEAD_GUIA", { fuente: "inicio" });
    setEstado("listo");
    // La descarga arranca sola: un segundo clic más es un lugar donde perder
    // gente que ya cumplió su parte.
    window.location.href = "/guia-huasteca-potosina.pdf";
  }

  if (estado === "listo") {
    return (
      <div className="border border-verde-vivo/40 bg-verde-vivo/10 p-5">
        <p className="flex items-center gap-2 font-dm text-sm text-crema mb-1">
          <Check className="w-4 h-4 text-verde-vivo" aria-hidden="true" />
          Listo, tu descarga empezó.
        </p>
        <p className="font-dm text-[12px] text-crema/55">
          ¿No arrancó?{" "}
          <a href="/guia-huasteca-potosina.pdf" className="text-verde-vivo underline underline-offset-2">
            Descárgala aquí
          </a>
          . También te llegan por correo los itinerarios que armamos cada temporada.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (estado === "error") setEstado("idle"); }}
          placeholder="tu@correo.com"
          aria-label="Tu correo electrónico"
          className="flex-1 border border-crema/25 bg-negro/40 px-4 py-3.5 font-dm text-sm text-crema placeholder:text-crema/30 focus:border-verde-vivo outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={estado === "enviando"}
          className="flex items-center justify-center gap-2 bg-dorado hover:bg-lima text-negro px-7 py-3.5 text-[11px] tracking-[2px] uppercase font-dm font-medium transition-colors disabled:opacity-50"
        >
          <Download className="w-4 h-4" aria-hidden="true" />
          {estado === "enviando" ? "Un momento…" : "Descargar gratis"}
        </button>
      </div>
      {estado === "error" && (
        <p className="font-dm text-[12px] text-terracota">Escribe un correo válido para mandarte la guía.</p>
      )}
      <p className="font-dm text-[11px] text-crema/30">
        Sin costo y sin tarjeta. Te escribimos solo cuando tenemos algo que de verdad sirve para tu viaje.
      </p>
    </form>
  );
}
