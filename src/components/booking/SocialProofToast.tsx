"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X } from "lucide-react";
import { trackTourEvent } from "@/lib/tourTracker";

const POOL = [
  { grupo: "Una familia",           ciudad: "Monterrey",      tour: "Expedición Tamul" },
  { grupo: "Una pareja",            ciudad: "CDMX",           tour: "Ruta Surrealista" },
  { grupo: "Un grupo de amigos",    ciudad: "Guadalajara",    tour: "Cascadas del Meco" },
  { grupo: "Una familia con niños", ciudad: "Querétaro",      tour: "Paraíso Escalonado" },
  { grupo: "Una pareja",            ciudad: "San Luis Potosí","tour": "Ruta Acuática" },
  { grupo: "Un grupo de amigos",    ciudad: "Tampico",        tour: "Expedición Tamul" },
  { grupo: "Una familia",           ciudad: "Puebla",         tour: "Cascadas del Meco" },
  { grupo: "Una pareja",            ciudad: "León",           tour: "Ruta Surrealista" },
  { grupo: "Un grupo de amigos",    ciudad: "Tijuana",        tour: "Expedición Tamul" },
  { grupo: "Una familia",           ciudad: "Mérida",         tour: "Paraíso Escalonado" },
];

const TIEMPOS = [
  "hace 20 min", "hace 45 min", "hace 1 hora",
  "hace 2 horas", "hace 3 horas", "hace 4 horas",
];

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

interface Props {
  tourId:   string;
  tourName: string;
}

export function SocialProofToast({ tourId, tourName }: Props) {
  const [visible,   setVisible]   = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [msgIndex,  setMsgIndex]  = useState(0);
  const hideTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((idx: number) => {
    if (dismissed) return;
    setMsgIndex(idx);
    setVisible(true);

    const entry = pick(POOL, idx);
    const tiempo = pick(TIEMPOS, idx + 2);
    const message = `${entry.grupo} de ${entry.ciudad} reservó ${entry.tour} ${tiempo}`;
    trackTourEvent("TOAST_SHOWN", { tour: tourId, message });

    // Auto-hide after 8s
    hideTimer.current = setTimeout(() => {
      setVisible(false);
      // Schedule next appearance: 60–120s
      nextTimer.current = setTimeout(() => {
        showToast(idx + 1);
      }, 60_000 + Math.random() * 60_000);
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

  const entry  = pick(POOL,   msgIndex);
  const tiempo = pick(TIEMPOS, msgIndex + 2);

  return (
    <div
      className="fixed bottom-20 left-4 z-50 max-w-[280px] sm:max-w-xs
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
        <p className="font-dm text-xs text-crema/80 leading-snug">
          <span className="text-verde-vivo font-medium">{entry.grupo}</span>
          {" de "}<span className="text-dorado">{entry.ciudad}</span>
          {" acaba de reservar "}
          <span className="text-crema font-medium">{entry.tour}</span>
        </p>
        <p className="font-dm text-[10px] text-crema/35 mt-1">{tiempo}</p>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-white/6">
        <div className="h-full bg-verde-vivo/60 animate-[shrink_8s_linear_forwards]" />
      </div>
    </div>
  );
}
