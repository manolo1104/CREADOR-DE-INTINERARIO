"use client";

import { useState, useEffect } from "react";
import { X, MessageCircle } from "lucide-react";
import { trackTourEvent } from "@/lib/tourTracker";
import { useLocale } from "@/lib/i18n/useLocale";
import { getBooking } from "@/lib/i18n/booking";

/**
 * Aparece a los 3 minutos en el carrito si la reserva sigue sin cerrarse.
 *
 * Es el momento donde más gente se cae: ya eligió, ya vio el precio y se queda
 * mirando la pantalla. Casi siempre es una duda concreta —una fecha, si cabe
 * alguien más, cómo pagar sin tarjeta— que por WhatsApp se resuelve en dos
 * mensajes y sola no se resuelve nunca.
 *
 * Reglas para que no sea una molestia:
 *  - Solo si hay algo en el carrito. Sin carrito no hay nada que rescatar.
 *  - Desaparece en cuanto empieza a pagar.
 *  - Una vez por sesión: si lo cierra, no vuelve.
 */
export function RescatePopup({
  activo,
  mensaje,
  minutos = 3,
}: {
  /** Falso mientras no haya carrito, o cuando ya está en la pantalla de pago. */
  activo:  boolean;
  /** El mensaje de WhatsApp ya armado con el detalle del carrito. */
  mensaje: string;
  minutos?: number;
}) {
  const [visible, setVisible] = useState(false);
  const [cerrado, setCerrado] = useState(false);

  useEffect(() => {
    if (!activo || cerrado) return;
    const id = setTimeout(() => {
      setVisible(true);
      trackTourEvent("RESCATE_MOSTRADO", { minutos });
    }, minutos * 60 * 1000);
    return () => clearTimeout(id);
  }, [activo, cerrado, minutos]);

  const t = getBooking(useLocale().locale).rescate;

  // Si deja de estar activo (empezó a pagar, o vació el carrito), se va.
  useEffect(() => {
    if (!activo) setVisible(false);
  }, [activo]);

  if (!visible) return null;

  function cerrar() {
    setVisible(false);
    setCerrado(true);
    trackTourEvent("RESCATE_CERRADO", {});
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-[80] border border-negro/15 bg-white shadow-2xl animate-slide-up">
      <button
        onClick={cerrar}
        aria-label={t.cerrar}
        className="absolute top-2 right-2 text-negro/30 hover:text-negro/70 p-1 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="p-5 pr-9">
        <p className="font-cormorant text-verde-profundo text-lg leading-tight mb-1.5">
          {t.titulo}
        </p>
        <p className="font-dm text-[12px] text-negro/55 leading-snug mb-4">
          {t.texto}
        </p>
        <a
          href={mensaje}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackTourEvent("WHATSAPP_CLICK", { origen: "rescate_carrito" })}
          className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#20ba59] text-white py-3 text-[11px] tracking-[2px] uppercase font-dm transition-colors"
        >
          <MessageCircle className="w-4 h-4" aria-hidden="true" />
          {t.cta}
        </a>
        <button
          onClick={cerrar}
          className="w-full mt-2 font-dm text-[11px] text-negro/40 hover:text-negro/70 transition-colors"
        >
          {t.sigoRevisando}
        </button>
      </div>
    </div>
  );
}
