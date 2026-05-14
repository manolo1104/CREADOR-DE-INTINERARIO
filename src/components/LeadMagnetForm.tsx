"use client";

import { useState } from "react";
import { Download, Mail, CheckCircle, Loader2 } from "lucide-react";

export function LeadMagnetForm() {
  const [email, setEmail]   = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/guardar-email", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, fuente: "Guía PDF info-practica" }),
      });
      if (res.ok) setStatus("success");
      else        setStatus("error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center text-center py-8 gap-4">
        <CheckCircle className="w-12 h-12 text-verde-vivo" />
        <p className="font-cormorant text-crema text-2xl">¡Listo! Guía en camino</p>
        <p className="text-crema/55 font-dm text-sm max-w-sm">
          Revisa tu bandeja de entrada (y spam por si acaso). Si no la recibes en 10 minutos,
          escríbenos por WhatsApp y te la mandamos de inmediato.
        </p>
        <a
          href="https://wa.me/524891251458?text=Hola%2C%20me%20registr%C3%A9%20para%20la%20gu%C3%ADa%20PDF%20pero%20no%20la%20recibi"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] tracking-[2px] uppercase font-dm text-[#25D366] border border-[#25D366]/40 hover:border-[#25D366] hover:bg-[#25D366]/10 px-5 py-2 transition-all"
        >
          Recibir por WhatsApp →
        </a>
      </div>
    );
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-crema/30 pointer-events-none" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className="w-full bg-negro/50 border border-white/20 focus:border-verde-selva text-crema placeholder:text-crema/30 font-dm text-sm pl-9 pr-4 py-3 outline-none transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={status === "loading" || !email}
          className="flex items-center justify-center gap-2 bg-verde-selva hover:bg-verde-vivo text-crema px-6 py-3 text-[11px] tracking-[2px] uppercase font-dm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          {status === "loading" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Download className="w-4 h-4" />
              Descargar gratis
            </>
          )}
        </button>
      </form>
      {status === "error" && (
        <p className="mt-2 text-terracota font-dm text-xs">
          Error al enviar. Escríbenos por{" "}
          <a href="https://wa.me/524891251458" className="underline">WhatsApp</a> y te la mandamos.
        </p>
      )}
      <p className="mt-3 text-[10px] text-crema/25 font-dm">
        Sin spam. Solo recibirás la guía y ocasionalmente ofertas exclusivas de tours.
      </p>
    </div>
  );
}
