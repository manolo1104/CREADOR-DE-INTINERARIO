"use client";
import { useState } from "react";
import { Check, Loader2, Lock } from "lucide-react";
import { PESTANAS, SECCION_SOLO_DUENO, type RolAdmin, type SeccionAdmin } from "@/lib/admin/usuarios";
import { playClick, playError, playSuccess } from "@/lib/admin/sfx";

export interface PersonaPermisos { user: string; nombre: string; rol: RolAdmin; secciones: SeccionAdmin[] }

const ETIQUETA_ROL: Record<RolAdmin, string> = { dueno: "Dueño", socio: "Socio", operacion: "Operación" };
const GRUPOS = Array.from(new Set(PESTANAS.map(p => p.grupo)));

/**
 * «¿Quién ve qué?» (Manolo, 20 oct 2026): qué pestañas ve cada persona del
 * panel. Un toque prende o apaga una pestaña y se guarda al momento; esa
 * persona lo nota en su siguiente clic. Inicio no aparece: es solo de Manolo,
 * y desde aquí se decide lo de los demás.
 */
export function PermisosPanel({ personas: iniciales }: { personas: PersonaPermisos[] }) {
  const [personas, setPersonas] = useState(iniciales);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [msj, setMsj] = useState<{ user: string; texto: string; error?: boolean } | null>(null);

  async function alternar(p: PersonaPermisos, seccion: SeccionAdmin) {
    const ve = p.secciones.includes(seccion);
    const nuevas = ve ? p.secciones.filter(s => s !== seccion) : [...p.secciones, seccion];
    if (nuevas.length === 0) {
      playError();
      setMsj({ user: p.user, texto: "Necesita ver al menos una pestaña.", error: true });
      return;
    }
    playClick();
    const clave = `${p.user}|${seccion}`;
    setGuardando(clave);
    // Se ve el cambio al instante; si no se guarda, vuelve como estaba.
    setPersonas(xs => xs.map(x => (x.user === p.user ? { ...x, secciones: nuevas } : x)));
    try {
      const r = await fetch("/api/admin/permisos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: p.user, secciones: nuevas }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.error || "No se pudo guardar");
      setPersonas((d.personas as PersonaPermisos[]).filter(x => x.rol !== "dueno"));
      playSuccess();
      const nombre = PESTANAS.find(x => x.seccion === seccion)?.etiqueta ?? seccion;
      setMsj({ user: p.user, texto: ve ? `Ya no ve ${nombre}.` : `Ahora ve ${nombre}.` });
    } catch (e: any) {
      playError();
      setPersonas(xs => xs.map(x => (x.user === p.user ? p : x)));
      setMsj({ user: p.user, texto: e.message, error: true });
    } finally {
      setGuardando(null);
    }
  }

  return (
    <section className="panel-card p-5 mb-6">
      <p className="panel-eyebrow mb-1">¿Quién ve qué?</p>
      <p className="font-dm text-xs text-[#1B4332]/55 mb-4">
        Toca una pestaña para dársela o quitársela. Se guarda solo y lo nota en su siguiente clic.
        <span className="inline-flex items-center gap-1 ml-1"><Lock className="w-3 h-3" aria-hidden="true" /> Inicio solo lo ves tú.</span>
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {personas.map(p => (
          <div key={p.user} className="border border-[#1B4332]/10 rounded-sm p-4">
            <p className="font-dm text-sm text-[#1B4332] font-medium">
              {p.nombre} <span className="text-[11px] font-normal text-[#1B4332]/45">· {ETIQUETA_ROL[p.rol]}</span>
            </p>
            {GRUPOS.map(g => {
              const pestanas = PESTANAS.filter(x => x.grupo === g && x.seccion !== SECCION_SOLO_DUENO);
              return (
                <div key={g} className="mt-3">
                  <p className="font-dm text-[10px] uppercase tracking-[0.14em] text-[#1B4332]/40 mb-1.5">{g}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {pestanas.map(x => {
                      const ve = p.secciones.includes(x.seccion);
                      const ocupado = guardando === `${p.user}|${x.seccion}`;
                      return (
                        <button key={x.seccion} type="button" role="switch" aria-checked={ve}
                          onClick={() => alternar(p, x.seccion)} disabled={!!guardando}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-sm border font-dm text-xs transition-colors panel-pulsable panel-foco disabled:opacity-60 ${
                            ve ? "bg-[#1B4332] border-[#1B4332] text-white" : "bg-white border-[#1B4332]/20 text-[#1B4332]/55 hover:border-[#1B4332]/45"}`}>
                          {ocupado ? <Loader2 className="w-3 h-3 animate-spin" /> : ve ? <Check className="w-3 h-3" /> : null}
                          {x.etiqueta}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {msj?.user === p.user && (
              <p className={`mt-3 font-dm text-[11px] ${msj.error ? "text-[#b8413f]" : "text-[#2b845c]"}`}>{msj.texto}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
