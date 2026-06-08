"use client";

// ────────────────────────────────────────────────────────────────────────────
// Vigilante de nuevas reservas. Sondea el endpoint EXISTENTE (GET /api/admin/reservas)
// cada ~45s y, si aparece una reserva que no conocíamos, suena una campana y
// muestra un aviso. Solo lectura: NO modifica datos ni endpoints.
// ────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, X } from "lucide-react";
import { playNewBooking } from "@/lib/admin/sfx";

const POLL_MS = 45_000;

interface Toast { id: string; name: string; tour: string }

export default function NewBookingWatcher() {
  const router = useRouter();
  const known = useRef<Set<string> | null>(null); // null = aún sin línea base
  const [toasts, setToasts] = useState<Toast[]>([]);

  function dismiss(id: string) {
    setToasts(t => t.filter(x => x.id !== id));
  }

  useEffect(() => {
    let alive = true;

    async function check() {
      if (typeof document !== "undefined" && document.hidden) return;
      try {
        const r = await fetch("/api/admin/reservas", { cache: "no-store" });
        if (!r.ok || !alive) return;
        const data: any[] = await r.json();
        const ids = new Set<string>(data.map(b => String(b.id)));

        // Primera carga: solo guardamos la línea base, sin avisar.
        if (known.current === null) {
          known.current = ids;
          return;
        }

        const fresh = data.filter(b => !known.current!.has(String(b.id)));
        known.current = ids;

        if (fresh.length > 0) {
          playNewBooking();
          setToasts(prev => [
            ...fresh.map(b => ({
              id: String(b.id),
              name: b.customerName || "Cliente",
              tour: b.tourName || "Reserva nueva",
            })),
            ...prev,
          ].slice(0, 4));
        }
      } catch {
        /* silencioso: si falla la red, reintenta en el próximo ciclo */
      }
    }

    check(); // línea base inmediata
    const iv = setInterval(check, POLL_MS);
    const onVis = () => { if (!document.hidden) check(); };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      alive = false;
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // Auto-descartar cada toast a los 14s.
  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map(t => setTimeout(() => dismiss(t.id), 14_000));
    return () => timers.forEach(clearTimeout);
  }, [toasts]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2 max-w-[320px]">
      {toasts.map(t => (
        <div
          key={t.id}
          className="hp-toast-in flex items-start gap-3 bg-white border border-[#52B788]/40 shadow-lg rounded-md px-4 py-3"
          style={{ boxShadow: "0 10px 30px rgba(27,67,50,0.18)" }}
        >
          <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#1B4332] text-white">
            <Bell className="w-3.5 h-3.5 hp-bell-ring" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] tracking-[1.5px] uppercase text-[#52B788] font-semibold">Nueva reserva</p>
            <p className="text-sm text-[#1B4332] font-medium truncate">{t.name}</p>
            <p className="text-xs text-[#1B4332]/55 truncate">{t.tour}</p>
            <button
              onClick={() => { router.push("/admin/reservas"); router.refresh(); dismiss(t.id); }}
              className="mt-1 text-xs font-medium text-[#1B4332] underline underline-offset-2 hover:text-[#52B788] transition-colors"
            >
              Ver reserva →
            </button>
          </div>
          <button onClick={() => dismiss(t.id)} className="text-[#1B4332]/30 hover:text-[#1B4332] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}

      <style jsx global>{`
        @keyframes hpToastIn {
          from { opacity: 0; transform: translateX(24px) scale(0.96); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        .hp-toast-in { animation: hpToastIn 0.35s cubic-bezier(0.22, 1, 0.36, 1); }
        @keyframes hpBellRing {
          0%,100% { transform: rotate(0deg); }
          20% { transform: rotate(-18deg); }
          40% { transform: rotate(14deg); }
          60% { transform: rotate(-8deg); }
          80% { transform: rotate(4deg); }
        }
        .hp-bell-ring { animation: hpBellRing 0.9s ease-in-out 0.1s; transform-origin: 50% 0; }
      `}</style>
    </div>
  );
}
