"use client";

import { useState } from "react";
import { Map, CheckCircle, Loader2 } from "lucide-react";
import { trackTourEvent } from "@/lib/tourTracker";

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
        // El puente de trackTourEvent lo reenvía a GA4 como `generate_lead`.
        trackTourEvent("LEAD_BLOG", { fuente, tour: tourSlug });
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
      <div className="my-10 flex items-center gap-4 rounded-2xl border border-verde-selva/30 bg-white p-6">
        <CheckCircle className="w-8 h-8 text-verde-vivo flex-shrink-0" />
        <div>
          <p className="font-dm text-[15px] font-medium text-verde-profundo">¡Listo! Revisa tu correo.</p>
          <p className="mt-0.5 font-dm text-[13px] text-negro/60">
            Te enviamos el itinerario de 3 días a <strong className="text-negro/80">{email}</strong>.
            Si no aparece, revisa spam o pídelo por{" "}
            <a
              href="https://wa.me/524891090388?text=Hola%2C%20quiero%20el%20itinerario%20de%203%20d%C3%ADas%20en%20la%20Huasteca"
              className="text-verde-selva underline"
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
    <aside className="my-10 rounded-2xl border border-negro/10 bg-white p-6">
      <div className="flex items-start gap-3 mb-4">
        <Map className="mt-0.5 h-5 w-5 flex-shrink-0 text-verde-selva" aria-hidden="true" />
        <div>
          <p className="font-cormorant text-xl leading-snug text-verde-profundo">
            Itinerario de 3 días en la Huasteca, gratis
          </p>
          <p className="mt-1 font-dm text-[13px] leading-relaxed text-negro/60">
            El recorrido que le armamos a la mayoría de nuestros viajeros: qué ver
            cada día, a qué hora llegar a cada sitio y qué llevar. Te lo mandamos por correo.
          </p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (status === "error") setStatus("idle"); }}
          placeholder="tu@email.com"
          aria-label="Tu correo para recibir el itinerario"
          className="min-h-[48px] min-w-0 flex-1 rounded-full border border-negro/20 bg-crema/60 px-4 font-dm text-base text-negro placeholder:text-negro/40 outline-none transition-colors focus:border-verde-selva"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="inline-flex min-h-[48px] flex-shrink-0 items-center gap-1.5 rounded-full bg-verde-selva px-5 font-dm text-sm font-medium text-crema transition-colors hover:bg-verde-vivo disabled:opacity-50"
        >
          {status === "loading" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Enviármelo"}
        </button>
      </form>
      {status === "error" && (
        <p className="mt-2 font-dm text-[13px] text-terracota" role="alert">
          {error}{" "}
          <a
            href="https://wa.me/524891090388?text=Hola%2C%20quiero%20el%20itinerario%20de%203%20d%C3%ADas%20en%20la%20Huasteca"
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
