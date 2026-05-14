"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X } from "lucide-react";
import { trackTourEvent } from "@/lib/tourTracker";

// 15 mensajes únicos — variedad de grupos, ciudades y tours
const MENSAJES: { texto: string; tiempo: string }[] = [
  { texto: "Una familia de Monterrey acaba de reservar la Expedición Tamul",          tiempo: "hace 8 min" },
  { texto: "Una pareja de CDMX reservó la Ruta Surrealista de Edward James",          tiempo: "hace 23 min" },
  { texto: "Un grupo de amigos de Guadalajara confirmó las Cascadas del Meco",        tiempo: "hace 41 min" },
  { texto: "Una familia con niños de Querétaro reservó el Paraíso Escalonado",        tiempo: "hace 1 hora" },
  { texto: "Una pareja de San Luis Potosí confirmó la Ruta Acuática",                 tiempo: "hace 1 h 20 min" },
  { texto: "3 amigos de Tampico reservaron la Expedición Tamul para este fin de semana", tiempo: "hace 2 horas" },
  { texto: "Una familia de Puebla eligió las Cascadas del Meco",                      tiempo: "hace 2 h 15 min" },
  { texto: "Una pareja de León completó su reserva de la Ruta Surrealista",           tiempo: "hace 2 h 40 min" },
  { texto: "4 amigos de Tijuana reservaron la Expedición Tamul para el sábado",       tiempo: "hace 3 horas" },
  { texto: "Una familia de Mérida reservó el Paraíso Escalonado con 2 niños",         tiempo: "hace 3 h 10 min" },
  { texto: "Una pareja de Monterrey confirmó el Puente de Dios y las Siete Cascadas", tiempo: "hace 3 h 45 min" },
  { texto: "Un grupo de 5 amigos de CDMX reservó la Expedición Tamul",                tiempo: "hace 4 horas" },
  { texto: "Una familia de Aguascalientes eligió las Cascadas de Minas Viejas",       tiempo: "hace 4 h 20 min" },
  { texto: "Una pareja de Guadalajara reservó la Ruta Acuática para su luna de miel", tiempo: "hace 5 horas" },
  { texto: "3 amigos de Morelia confirmaron la Ruta Surrealista de Edward James",     tiempo: "hace 5 h 30 min" },
];

interface Props {
  tourId:   string;
  tourName: string;
}

export function SocialProofToast({ tourId, tourName }: Props) {
  const [visible,   setVisible]   = useState(false);
  const [dismissed, setDismissed] = useState(false);
  // Start from a random index so each session sees a different first message
  const [msgIndex,  setMsgIndex]  = useState(() => Math.floor(Math.random() * MENSAJES.length));
  const hideTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((idx: number) => {
    if (dismissed) return;
    // Pick a truly random next index each appearance
    const nextIdx = Math.floor(Math.random() * MENSAJES.length);
    setMsgIndex(idx);
    setVisible(true);

    const msg = MENSAJES[idx % MENSAJES.length];
    trackTourEvent("TOAST_SHOWN", { tour: tourId, message: msg.texto });

    hideTimer.current = setTimeout(() => {
      setVisible(false);
      nextTimer.current = setTimeout(() => {
        showToast(nextIdx);
      }, 55_000 + Math.random() * 65_000);
    }, 8_000);
  }, [dismissed, tourId]);

  useEffect(() => {
    // First appearance: 5s after mount
    const firstTimer = setTimeout(() => showToast(0), 5_000);
    return () => {
      clearTimeout(firstTimer);
      if (hideTimer.current)  clearTimeout(hideTimer.current);
      if (nextTimer.current)  clearTimeout(nextTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismiss() {
    setVisible(false);
    setDismissed(true);
    if (hideTimer.current)  clearTimeout(hideTimer.current);
    if (nextTimer.current)  clearTimeout(nextTimer.current);
    trackTourEvent("TOAST_DISMISSED", { tour: tourId });
  }

  if (!visible || dismissed) return null;

  const msg = MENSAJES[msgIndex % MENSAJES.length];

  return (
    <div
      className="fixed bottom-20 left-4 z-50 max-w-[285px] sm:max-w-xs
                 bg-negro/95 border border-white/12 shadow-xl shadow-black/40
                 animate-slide-up"
      role="status"
      aria-live="polite"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
        <span className="text-[9px] tracking-[2px] uppercase font-dm text-verde-vivo/70">
          ✦ Reserva reciente
        </span>
        <button
          onClick={dismiss}
          aria-label="Cerrar"
          className="text-crema/30 hover:text-crema/70 transition-colors -mr-1"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="px-3 pb-3">
        <p className="font-dm text-xs text-crema/85 leading-snug">{msg.texto}</p>
        <p className="font-dm text-[10px] text-crema/35 mt-1">{msg.tiempo}</p>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-white/6">
        <div className="h-full bg-verde-vivo/60 animate-[shrink_8s_linear_forwards]" />
      </div>
    </div>
  );
}
