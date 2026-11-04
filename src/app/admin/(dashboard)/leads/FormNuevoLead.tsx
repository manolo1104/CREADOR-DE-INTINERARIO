"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { ORIGENES_ELEGIBLES } from "@/lib/origenReserva";
import { PERFILES } from "@/lib/admin/crm";
import { colorDeTour } from "@/lib/admin/coloresTour";
import { playClick, playError, playSuccess } from "@/lib/admin/sfx";
import { botonPrimario, botonSecundario, canalCorto, etiquetaCls, inputCls, type TourOpcion } from "./comun";

/**
 * Capturar un lead en 20 segundos desde el celular (Fase 2): nombre y
 * teléfono bastan; con tour, fecha y personas entra ya como Calificado.
 */
export function FormNuevoLead({ tours, responsables, quien, onCerrar, onCreado }: {
  tours: TourOpcion[]; responsables: string[]; quien: string; onCerrar: () => void; onCreado: (texto: string) => void;
}) {
  const router = useRouter();
  const [f, setF] = useState({
    nombre: "", telefono: "", canal: "whatsapp", tours: [] as string[], fechaViaje: "", pax: "", perfil: "",
    quiereHospedaje: false, monto: "", responsable: quien, proximoPaso: "Mandar cotización", proximoPasoEn: "", nota: "",
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF(x => ({ ...x, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));
  const alternarTour = (slug: string) => setF(x => ({ ...x, tours: x.tours.includes(slug) ? x.tours.filter(t => t !== slug) : [...x.tours, slug] }));

  async function guardar(e: React.FormEvent) {
    e.preventDefault(); setGuardando(true); setError(null);
    try {
      const r = await fetch("/api/admin/leads", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, pax: f.pax || null, monto: f.monto || null, perfil: f.perfil || null, fechaViaje: f.fechaViaje || null, proximoPasoEn: f.proximoPasoEn || null }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.ok) { playError(); setError(d?.error || "No se pudo guardar"); return; }
      playSuccess();
      if (d.existente) { router.push(`/admin/leads/${d.id}`); return; }
      onCreado(`Lead de ${f.nombre} creado`);
      router.refresh();
    } catch { playError(); setError("No se pudo guardar"); }
    finally { setGuardando(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center sm:items-center sm:p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onCerrar} />
      <form onSubmit={guardar} role="dialog" aria-labelledby="nuevo-lead-titulo"
        className="relative flex max-h-full w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl sm:rounded-[var(--panel-radio)]">
        <div className="flex items-center justify-between border-b border-[var(--panel-borde)] px-5 py-4">
          <h2 id="nuevo-lead-titulo" className="font-cormorant text-2xl text-[var(--panel-tinta)]">Nuevo lead</h2>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="panel-foco rounded p-2 text-[var(--panel-tinta-media)]"><X className="h-5 w-5" /></button>
        </div>
        <div className="grid gap-3 overflow-y-auto px-5 py-4 sm:grid-cols-2">
          <label className={etiquetaCls}>Nombre *<input required value={f.nombre} onChange={set("nombre")} className={`${inputCls} mt-1 normal-case tracking-normal`} autoFocus /></label>
          <label className={etiquetaCls}>Teléfono (WhatsApp)<input type="tel" inputMode="tel" value={f.telefono} onChange={set("telefono")} placeholder="489 109 0388" className={`${inputCls} mt-1 normal-case tracking-normal`} /></label>
          <label className={etiquetaCls}>¿Por dónde llegó?
            <select value={f.canal} onChange={set("canal")} className={`${inputCls} mt-1 normal-case tracking-normal`}>
              {ORIGENES_ELEGIBLES.map(o => <option key={o} value={o}>{canalCorto(o)}</option>)}
            </select></label>
          <label className={etiquetaCls}>Responsable
            <select value={f.responsable} onChange={set("responsable")} className={`${inputCls} mt-1 normal-case tracking-normal`}>
              {responsables.map(r => <option key={r} value={r}>{r}</option>)}
            </select></label>
          <fieldset className="sm:col-span-2">
            <legend className={etiquetaCls}>Tours que le interesan</legend>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {tours.map(t => {
                const on = f.tours.includes(t.slug);
                return (
                  <button key={t.slug} type="button" aria-pressed={on} onClick={() => { playClick(); alternarTour(t.slug); }} title={t.nombre}
                    className={`panel-foco min-h-[36px] rounded-full border px-3 text-[12px] font-dm font-semibold ${on ? "text-white" : "bg-white"}`}
                    style={on ? { background: colorDeTour(t.slug), borderColor: colorDeTour(t.slug) } : { color: colorDeTour(t.slug), borderColor: colorDeTour(t.slug) + "66" }}>
                    {t.codigo}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <label className={etiquetaCls}>Fecha del viaje<input type="date" value={f.fechaViaje} onChange={set("fechaViaje")} className={`${inputCls} mt-1`} /></label>
          <label className={etiquetaCls}>Personas<input type="number" min={1} inputMode="numeric" value={f.pax} onChange={set("pax")} className={`${inputCls} mt-1`} /></label>
          <label className={etiquetaCls}>Perfil
            <select value={f.perfil} onChange={set("perfil")} className={`${inputCls} mt-1 normal-case tracking-normal`}>
              <option value="">—</option>{PERFILES.map(p => <option key={p.clave} value={p.clave}>{p.etiqueta}</option>)}
            </select></label>
          <label className={etiquetaCls}>Monto estimado ($)<input type="number" min={0} inputMode="numeric" value={f.monto} onChange={set("monto")} className={`${inputCls} mt-1`} /></label>
          <label className="flex min-h-[44px] items-center gap-2 text-[13px] font-dm text-[var(--panel-tinta)] sm:col-span-2">
            <input type="checkbox" checked={f.quiereHospedaje} onChange={set("quiereHospedaje")} className="h-5 w-5 accent-[var(--panel-acento)]" />Quiere hospedaje (Paraíso Encantado)</label>
          <label className={etiquetaCls}>Próximo paso<input value={f.proximoPaso} onChange={set("proximoPaso")} className={`${inputCls} mt-1 normal-case tracking-normal`} /></label>
          <label className={etiquetaCls}>¿Para cuándo?<input type="date" value={f.proximoPasoEn} onChange={set("proximoPasoEn")} className={`${inputCls} mt-1`} /></label>
          <label className={`${etiquetaCls} sm:col-span-2`}>Nota<textarea rows={2} value={f.nota} onChange={set("nota")} className={`${inputCls} mt-1 normal-case tracking-normal`} placeholder="Lo que pidió, de dónde viene, con quién viaja…" /></label>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-[var(--panel-borde)] px-5 py-3">
          {error && <p role="alert" className="mr-auto text-[12.5px] font-dm text-[var(--panel-problema)]">{error}</p>}
          <button type="button" onClick={onCerrar} className={botonSecundario}>Cancelar</button>
          <button type="submit" disabled={guardando || !f.nombre.trim()} className={botonPrimario}>{guardando ? "Guardando…" : "Guardar lead"}</button>
        </div>
      </form>
    </div>
  );
}
