"use client";

import { useEffect } from "react";
import { trackTourEvent } from "@/lib/tourTracker";
import { TOURS_DB } from "@/lib/tours";
import { agregarRef, guardarOrigenVisita, marcarRef, nuevaRef } from "@/lib/refWhatsapp";

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
 *
 * En el panel (/admin) no hace nada (revisión del 20 nov 2026): ver `esPanel`.
 */

const SLUGS = new Set(TOURS_DB.map(t => t.slug));

/**
 * ¿Es una página del panel? Ahí los enlaces a WhatsApp los usa el EQUIPO para
 * escribirle a un cliente o a un proveedor («Pedir reseña por WhatsApp», la
 * confirmación de la salida, la cotización…), no un visitante. Montado en el
 * layout raíz, esto también corría ahí: le pegaba «(ref. 2MGXT)» al mensaje
 * que el equipo le manda al cliente y mandaba el clic como si fuera del sitio
 * (la marca del equipo, `hp_interno`, y /api/track ya lo tiraban: la cifra no
 * se inflaba, pero no tenía por qué salir).
 * En el panel: ni código, ni evento, ni origen de la visita (20 nov 2026).
 */
function esPanel(path: string): boolean {
  return path === "/admin" || path.startsWith("/admin/");
}

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
    // De dónde llegó la visita (UTM o el sitio de origen), una vez por sesión:
    // viaja con el clic a WhatsApp y de ahí al lead (`lib/refWhatsapp.ts`).
    // Abrir el panel no es una visita.
    if (!esPanel(window.location.pathname)) guardarOrigenVisita();

    function alHacerClic(e: MouseEvent) {
      // Se mira en cada clic y no solo al montar: el layout raíz no se vuelve a
      // montar cuando se navega sin recargar entre el panel y el sitio.
      if (esPanel(window.location.pathname)) return;
      const destino = e.target as HTMLElement | null;
      const enlace = destino?.closest?.(
        'a[href*="wa.me"], a[href*="api.whatsapp.com"], a[href^="whatsapp:"]',
      ) as HTMLAnchorElement | null;
      if (!enlace) return;

      // El código de referencia (4 nov 2026) va en TODOS los botones, también en
      // los que se miden solos: se cambia la liga antes de que el navegador la
      // abra (esto corre en captura, antes del onClick del botón) y el evento
      // del clic lo recoge con `refReciente()`.
      const ref = nuevaRef();
      const conRef = agregarRef(enlace.href, ref);
      if (conRef !== enlace.href) { enlace.href = conRef; marcarRef(ref); }

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
        // Lo que el botón sabe de la reserva (la ficha lo pone en el enlace).
        fecha:    enlace.dataset.fecha || undefined,
        personas: enlace.dataset.personas ? Number(enlace.dataset.personas) : undefined,
      });
    }

    // En fase de captura: si algún componente detiene la propagación del clic,
    // el evento ya se registró.
    document.addEventListener("click", alHacerClic, true);
    return () => document.removeEventListener("click", alHacerClic, true);
  }, []);

  return null;
}
