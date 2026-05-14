"use client";

import { useState } from "react";
import { Download, CheckCircle, Loader2 } from "lucide-react";

export function BlogNewsletterInline() {
  const [email, setEmail]   = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/lead-magnet", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email }),
      });
      setStatus(res.ok ? "success" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="my-10 p-6 border border-verde-vivo/30 bg-verde-selva/10 flex items-center gap-4">
        <CheckCircle className="w-8 h-8 text-verde-vivo flex-shrink-0" />
        <div>
          <p className="text-crema font-dm text-sm font-medium">¡Listo! Revisa tu correo.</p>
          <p className="text-crema/50 font-dm text-xs mt-0.5">
            Te enviamos la Guía Completa + checklist de equipaje. También por{" "}
            <a href="https://wa.me/524891251458?text=Hola%2C%20quiero%20la%20gu%C3%ADa%20PDF%20de%20la%20Huasteca" className="text-verde-vivo underline" target="_blank" rel="noopener noreferrer">WhatsApp →</a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <aside className="my-10 p-6 border border-lima/20 bg-forest">
      <div className="flex items-start gap-3 mb-4">
        <Download className="w-5 h-5 text-lima flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <p className="text-crema font-dm text-sm font-medium leading-snug">
            Descarga la Guía Completa de la Huasteca (PDF gratuito)
          </p>
          <p className="text-crema/50 font-dm text-xs leading-relaxed mt-1">
            Checklist de equipaje, presupuesto detallado, itinerarios 3-5-7 días y mapa de la región. Solo deja tu email.
          </p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          className="flex-1 bg-negro/40 border border-white/15 focus:border-lima/50 text-crema placeholder:text-crema/30 font-dm text-sm px-3 py-2 outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="flex items-center gap-1.5 bg-verde-selva hover:bg-verde-vivo text-crema px-4 py-2 text-[10px] tracking-[2px] uppercase font-dm transition-colors disabled:opacity-50 flex-shrink-0"
        >
          {status === "loading" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Enviar"}
        </button>
      </form>
      {status === "error" && (
        <p className="mt-2 text-terracota font-dm text-xs">
          Error al enviar.{" "}
          <a href="https://wa.me/524891251458" className="underline" target="_blank" rel="noopener noreferrer">Pídela por WhatsApp →</a>
        </p>
      )}
    </aside>
  );
}
