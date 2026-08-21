"use client";

import { useState } from "react";
import { Map, CheckCircle, Loader2 } from "lucide-react";

/**
 * Captura de correo a cambio del itinerario de 3 días.
 *
 * Vive en cada artículo del blog y en las páginas de destino — los dos tipos de
 * página que concentran el tráfico orgánico. Antes prometía una "Guía Completa
 * (PDF gratuito)" que ya no existía y posteaba a un endpoint desactivado: el
 * formulario fallaba siempre, en la página más visitada del sitio.
 */
export function BlogNewsletterInline({
  fuente = "Blog",
  tourSlug,
}: {
  fuente?: string;
  /**
   * El recorrido del que va a hablarle el seguimiento. Se manda desde las
   * páginas de destino —donde sí se sabe qué está leyendo la persona— para que
   * los tres correos siguientes hablen de SU cascada y no de una cualquiera.
   */
  tourSlug?: string;
}) {
  const [email, setEmail]   = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError]   = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/lead-magnet", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, fuente, tourSlug }),
      });
      if (res.ok) {
        setStatus("success");
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "No se pudo enviar.");
        setStatus("error");
      }
    } catch {
      setError("Error de conexión.");
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
            Te enviamos el itinerario de 3 días a <strong className="text-crema/70">{email}</strong>.
            Si no aparece, revisa spam o pídelo por{" "}
            <a
              href="https://wa.me/524891251458?text=Hola%2C%20quiero%20el%20itinerario%20de%203%20d%C3%ADas%20en%20la%20Huasteca"
              className="text-verde-vivo underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp →
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <aside className="my-10 p-6 border border-lima/20 bg-forest">
      <div className="flex items-start gap-3 mb-4">
        <Map className="w-5 h-5 text-lima flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <p className="text-crema font-dm text-sm font-medium leading-snug">
            Itinerario de 3 días en la Huasteca — gratis
          </p>
          <p className="text-crema/50 font-dm text-xs leading-relaxed mt-1">
            El recorrido que le armamos a la mayoría de nuestros viajeros: qué ver
            cada día, a qué hora llegar a cada sitio y qué llevar. Te lo mandamos por correo.
          </p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (status === "error") setStatus("idle"); }}
          placeholder="tu@email.com"
          aria-label="Tu correo para recibir el itinerario"
          className="flex-1 min-w-0 bg-negro/40 border border-white/15 focus:border-lima/50 text-crema placeholder:text-crema/30 font-dm text-sm px-3 py-2 outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="flex items-center gap-1.5 bg-verde-selva hover:bg-verde-vivo text-crema px-4 py-2 text-[10px] tracking-[2px] uppercase font-dm transition-colors disabled:opacity-50 flex-shrink-0"
        >
          {status === "loading" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Enviármelo"}
        </button>
      </form>
      {status === "error" && (
        <p className="mt-2 text-terracota font-dm text-xs" role="alert">
          {error}{" "}
          <a
            href="https://wa.me/524891251458?text=Hola%2C%20quiero%20el%20itinerario%20de%203%20d%C3%ADas%20en%20la%20Huasteca"
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Pídelo por WhatsApp →
          </a>
        </p>
      )}
    </aside>
  );
}
