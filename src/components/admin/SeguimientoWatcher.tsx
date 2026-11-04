"use client";

// El aviso dentro del panel de los seguimientos que ya tocan (3 nov 2026): cada
// minuto pregunta por los de quien tiene la sesión y, si hay uno nuevo, suena y
// sale un aviso con su ficha. Cada uno se avisa una vez por sesión del navegador.
import Link from "next/link";
import { useEffect, useState } from "react";
import { BellRing, X } from "lucide-react";
import { playNewBooking } from "@/lib/admin/sfx";

interface Aviso { id: string; titulo: string; vence: string; hora: string | null; oportunidadId: string | null; cliente: string | null }
const CLAVE = "seguimientos-avisados";
const leer = (): string[] => { try { return JSON.parse(sessionStorage.getItem(CLAVE) || "[]"); } catch { return []; } };
const guardar = (ids: string[]) => { try { sessionStorage.setItem(CLAVE, JSON.stringify(ids.slice(-200))); } catch { /* sin almacenamiento */ } };

export default function SeguimientoWatcher() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  useEffect(() => {
    let vivo = true;
    async function revisar() {
      if (document.hidden) return;
      try {
        const r = await fetch("/api/admin/tareas", { cache: "no-store" });
        if (!r.ok || !vivo) return;
        const { tareas } = (await r.json()) as { tareas: Aviso[] };
        const ya = leer();
        const nuevos = tareas.filter(t => !ya.includes(t.id));
        if (!nuevos.length) return;
        guardar([...ya, ...nuevos.map(t => t.id)]);
        setAvisos(a => [...a, ...nuevos].slice(-4));
        playNewBooking();
      } catch { /* sin red: al siguiente minuto */ }
    }
    const t0 = setTimeout(revisar, 4000);
    const t = setInterval(revisar, 60_000);
    return () => { vivo = false; clearTimeout(t0); clearInterval(t); };
  }, []);
  if (!avisos.length) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[70] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2" role="status" aria-live="polite">
      {avisos.map(a => (
        <div key={a.id} className="panel-card flex items-start gap-3 p-3 shadow-[var(--panel-sombra-lg)]">
          <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-[var(--panel-atencion)]" aria-hidden="true" />
          <div className="min-w-0 flex-1 text-[13px] font-dm">
            <p className="font-semibold text-[var(--panel-tinta)]">Seguimiento{a.hora ? ` · ${a.hora}` : ""}{a.cliente ? ` · ${a.cliente}` : ""}</p>
            <p className="text-[var(--panel-tinta-media)]">{a.titulo}</p>
            <Link href={a.oportunidadId ? `/admin/leads/${a.oportunidadId}` : "/admin/seguimientos"} onClick={() => setAvisos(x => x.filter(y => y.id !== a.id))}
              className="panel-foco mt-1 inline-block font-semibold text-[var(--panel-acento)] hover:underline">{a.oportunidadId ? "Abrir ficha" : "Ver seguimientos"}</Link>
          </div>
          <button type="button" aria-label="Cerrar aviso" onClick={() => setAvisos(x => x.filter(y => y.id !== a.id))} className="panel-foco rounded p-1 text-[var(--panel-tinta-suave)]"><X className="h-4 w-4" /></button>
        </div>
      ))}
    </div>
  );
}
