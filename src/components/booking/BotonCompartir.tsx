"use client";

import { useState } from "react";
import { Share2, Copy, Check } from "lucide-react";
import { trackTourEvent } from "@/lib/tourTracker";
import { useLocale } from "@/lib/i18n/useLocale";
import { getBooking } from "@/lib/i18n/booking";

/**
 * Compartir lo que se está armando.
 *
 * Casi ningún viaje lo decide una sola persona: la pareja, la familia o el
 * grupo de amigos quieren opinar antes de pagar, y hasta ahora la única forma
 * de consultarlo era una captura de pantalla. Compartir el enlace deja al que
 * decide ver el mismo carrito, con fechas y precios reales.
 *
 * Usa el menú nativo del sistema cuando existe —en un teléfono eso es WhatsApp
 * a un toque— y cae a copiar el enlace en escritorio.
 */
export function BotonCompartir({
  titulo,
  texto,
  obtenerUrl,
  origen,
  className = "",
}: {
  titulo: string;
  /** El resumen que acompaña al enlace. */
  texto: string;
  /**
   * Devuelve la URL a compartir. Es una función y puede ser asíncrona porque el
   * carrito tiene que guardarse en el servidor antes de tener enlace: lo que se
   * comparte vive en el navegador de quien comparte.
   */
  obtenerUrl: () => string | Promise<string | null>;
  origen: string;
  className?: string;
}) {
  const [estado, setEstado] = useState<"listo" | "trabajando" | "copiado" | "error">("listo");
  const t = getBooking(useLocale().locale).compartir;

  async function compartir() {
    setEstado("trabajando");
    try {
      const url = await obtenerUrl();
      if (!url) { setEstado("error"); setTimeout(() => setEstado("listo"), 3000); return; }

      trackTourEvent("COMPARTIR", { origen });

      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({ title: titulo, text: texto, url });
          setEstado("listo");
          return;
        } catch {
          // Canceló el menú de compartir: no es un error, se cae a copiar.
        }
      }
      await navigator.clipboard.writeText(`${texto}\n${url}`);
      setEstado("copiado");
      setTimeout(() => setEstado("listo"), 2600);
    } catch {
      setEstado("error");
      setTimeout(() => setEstado("listo"), 3000);
    }
  }

  const etiqueta =
    estado === "trabajando" ? t.trabajando :
    estado === "copiado"    ? t.copiado :
    estado === "error"      ? t.error :
    t.compartir;

  return (
    <button
      type="button"
      onClick={compartir}
      disabled={estado === "trabajando"}
      className={`flex items-center justify-center gap-2 font-dm text-[11px] tracking-[1.5px] uppercase transition-colors disabled:opacity-50 ${className}`}
    >
      {estado === "copiado" ? <Check className="w-3.5 h-3.5" aria-hidden="true" />
        : estado === "error" ? <Copy className="w-3.5 h-3.5" aria-hidden="true" />
        : <Share2 className="w-3.5 h-3.5" aria-hidden="true" />}
      {etiqueta}
    </button>
  );
}
