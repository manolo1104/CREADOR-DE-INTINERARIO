"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { trackTourEvent } from "@/lib/tourTracker";

// Prueba social REAL y verificable (sin reservas inventadas ni timestamps falsos).
// Cada toast muestra un dato cierto de la operación: reseñas reales, premios,
// certificaciones y políticas. El orden se baraja por sesión (Fisher-Yates).
const PRUEBAS_ES: { texto: string; fuente: string }[] = [
  { texto: "4.9★ de promedio en reseñas verificadas de Google", fuente: "492 reseñas reales" },
  { texto: "Más de 10,000 viajeros han recorrido la Huasteca con nosotros", fuente: "Operando desde 2019" },
  { texto: "Guías locales certificados NOM-09 SECTUR", fuente: "Certificación oficial" },
  { texto: "Mejor Operador de Tours de Norteamérica", fuente: "Premio Arival 2023" },
  { texto: "Cancelación gratuita hasta 48 horas antes del tour", fuente: "Sin preguntas" },
  { texto: "Transporte, desayuno, entradas y guía: todo incluido", fuente: "Sin costos ocultos" },
  { texto: "Salidas todos los días del año", fuente: "Reserva con 24h de anticipación" },
  { texto: "Grupos pequeños de máximo 12 personas", fuente: "Atención personalizada" },
];

const PRUEBAS_EN: { texto: string; fuente: string }[] = [
  { texto: "4.9★ average across verified Google reviews", fuente: "492 real reviews" },
  { texto: "Over 10,000 travelers have explored the Huasteca with us", fuente: "Operating since 2019" },
  { texto: "Local guides certified NOM-09 SECTUR", fuente: "Official certification" },
  { texto: "Best Tour Operator in North America", fuente: "Arival 2023 Award" },
  { texto: "Free cancellation up to 48 hours before the tour", fuente: "No questions asked" },
  { texto: "Transport, breakfast, entrance fees and guide all included", fuente: "No hidden costs" },
  { texto: "Departures every day of the year", fuente: "Book 24h in advance" },
  { texto: "Small groups of max. 12 people", fuente: "Personalized attention" },
];

/**
 * Cuántas veces aparece el aviso en una visita, como mucho. Es el largo del
 * mazo: se ven las ocho pruebas una vez y se calla.
 */
const MAX_TOASTS = 8;

// Fisher-Yates: baraja los índices 0..n-1 para recorrer las pruebas
// en orden aleatorio sin repetir ninguna hasta agotar la lista.
function makeShuffledDeck(n: number): number[] {
  const deck = Array.from({ length: n }, (_, i) => i);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

interface Props {
  tourId:   string;
  tourName: string;
}

export function SocialProofToast({ tourId, tourName }: Props) {
  const pathname = usePathname();
  const en = pathname === "/en" || pathname.startsWith("/en/");
  const PRUEBAS = en ? PRUEBAS_EN : PRUEBAS_ES;
  const [visible,   setVisible]   = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [msgIndex,  setMsgIndex]  = useState(0);
  const deck       = useRef<number[]>([]);
  const hideTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mostrados  = useRef(0);

  const showToast = useCallback(() => {
    if (dismissed) return;
    // El ciclo no terminaba nunca: se reprogramaba solo cada ~90 s mientras la
    // pestaña siguiera viva. Una sola sesión con la página abierta cuatro días
    // emitió 1,840 avisos —el 65 % de TODA la telemetría del sitio en catorce
    // días— y a esa persona le apareció el mismo cartel doscientas veces.
    // Ocho pruebas es el mazo completo: después de verlo entero, insistir no
    // convence a nadie.
    if (mostrados.current >= MAX_TOASTS) return;
    mostrados.current += 1;
    // Toma el siguiente índice del mazo barajado; re-baraja al agotarse
    if (deck.current.length === 0) deck.current = makeShuffledDeck(PRUEBAS.length);
    const idx = deck.current.pop()!;
    setMsgIndex(idx);
    setVisible(true);

    const msg = PRUEBAS[idx % PRUEBAS.length];
    trackTourEvent("TOAST_SHOWN", { tour: tourId, message: msg.texto });

    hideTimer.current = setTimeout(() => {
      setVisible(false);
      nextTimer.current = setTimeout(() => {
        showToast();
      }, 55_000 + Math.random() * 65_000);
    }, 8_000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dismissed, tourId, en]);

  useEffect(() => {
    // First appearance: 5s after mount
    const firstTimer = setTimeout(() => showToast(), 5_000);
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

  const msg = PRUEBAS[msgIndex % PRUEBAS.length];

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
          {en ? "✦ Why travelers choose us" : "✦ Por qué reservar con nosotros"}
        </span>
        <button
          onClick={dismiss}
          aria-label={en ? "Close" : "Cerrar"}
          className="text-crema/30 hover:text-crema/70 transition-colors -mr-1"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="px-3 pb-3">
        <p className="font-dm text-xs text-crema/85 leading-snug">{msg.texto}</p>
        <p className="font-dm text-[10px] text-verde-vivo/50 mt-1">✓ {msg.fuente}</p>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-white/6">
        <div className="h-full bg-verde-vivo/60 animate-[shrink_8s_linear_forwards]" />
      </div>
    </div>
  );
}
