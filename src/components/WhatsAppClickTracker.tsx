"use client";

import { useEffect } from "react";
import { trackTourEvent } from "@/lib/tourTracker";
import { TOURS_DB } from "@/lib/tours";

/**
 * Cuenta TODOS los clics a WhatsApp del sitio, desde un solo lugar.
 *
 * Antes se medían siete botones: los que alguien se acordó de instrumentar a
 * mano. El sitio tiene enlaces a WhatsApp en 37 archivos, así que la mayoría
 * de los clics no se contaban y el número que se miraba para decidir estaba
 * corto sin que nada avisara.
 *
 * En vez de tocar 37 archivos —y de que el siguiente enlace que alguien
 * agregue vuelva a quedar fuera— esto escucha los clics en `document` y
 * reconoce cualquier ancla que apunte a WhatsApp. Un enlace nuevo queda medido
 * el día que se escribe, sin que nadie se acuerde de nada.
 *
 * Los botones que YA se miden solos llevan `data-wa-manual="1"` y aquí se
 * ignoran: mandan su propio evento con más contexto (el monto del carrito, el
 * tour de la tarjeta) y contarlos dos veces inflaría la cifra.
 */

const SLUGS = new Set(TOURS_DB.map(t => t.slug));

/** El tour del que habla la página, si la URL lo dice. */
function tourDeLaRuta(path: string): string | undefined {
  const partes = path.split("/").filter(Boolean);
  return partes.find(p => SLUGS.has(p));
}

/** Lo que decía el botón, recortado: sirve para saber CUÁL de los botones se usa. */
function etiquetaDe(el: HTMLElement): string {
  const texto = (el.getAttribute("aria-label") || el.textContent || "")
    .replace(/\s+/g, " ")
    .trim();
  return texto.slice(0, 60);
}

export default function WhatsAppClickTracker() {
  useEffect(() => {
    function alHacerClic(e: MouseEvent) {
      const destino = e.target as HTMLElement | null;
      const enlace = destino?.closest?.(
        'a[href*="wa.me"], a[href*="api.whatsapp.com"], a[href^="whatsapp:"]',
      ) as HTMLAnchorElement | null;
      if (!enlace) return;

      // Ya lo cuenta su propio onClick, con más contexto del que hay aquí.
      if (enlace.dataset.waManual === "1") return;

      const path = window.location.pathname;
      trackTourEvent("WHATSAPP_CLICK", {
        origen:  "enlace",
        boton:   etiquetaDe(enlace),
        tour:    tourDeLaRuta(path),
        pagina:  path,
        // De qué parte de la página salió el clic, cuando la sección lo dice.
        seccion: enlace.closest("[data-seccion]")?.getAttribute("data-seccion") ?? undefined,
      });
    }

    // En fase de captura: si algún componente detiene la propagación del clic,
    // el evento ya se registró.
    document.addEventListener("click", alHacerClic, true);
    return () => document.removeEventListener("click", alHacerClic, true);
  }, []);

  return null;
}
