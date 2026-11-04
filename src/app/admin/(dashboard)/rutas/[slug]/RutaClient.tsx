"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, ArrowUp } from "lucide-react";
import type { Parada } from "@/lib/admin/rutas";
import { playError, playSuccess } from "@/lib/admin/sfx";
import { botonPrimario, botonSecundario, etiquetaCls, inputCls } from "../../leads/comun";

interface Datos { paradas: Parada[]; puntoEncuentro: string; guion: string; seguridad: string; planB: string; queLlevar: string; notas: string; proveedores: string[] }

/** El editor de la ficha de un tour: paradas, encuentro, guion, seguridad, plan B, qué llevar y proveedores. */
export default function RutaClient({ slug, nombre, inicial, proveedores, encuentroCatalogo, actualizado }: {
  slug: string; nombre: string; inicial: Datos; encuentroCatalogo: string; actualizado: string | null;
  proveedores: { id: string; nombre: string; servicio: string; sugerido: boolean }[];
}) {
  const router = useRouter();
  const [d, setD] = useState<Datos>(inicial);
  const [guardando, setGuardando] = useState(false);
  const [msj, setMsj] = useState<{ texto: string; error?: boolean } | null>(null);
  const set = (k: keyof Datos) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setD(x => ({ ...x, [k]: e.target.value }));
  const parada = (i: number, k: keyof Parada, v: string) => setD(x => ({ ...x, paradas: x.paradas.map((p, j) => j === i ? { ...p, [k]: v } : p) }));
  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (guardando) return;
    setGuardando(true); setMsj(null);
    const r = await fetch(`/api/admin/rutas/${slug}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).catch(() => null);
    const j = await r?.json().catch(() => null);
    setGuardando(false);
    if (!r?.ok) { playError(); setMsj({ texto: j?.error || "No se pudo guardar", error: true }); return; }
    playSuccess(); setMsj({ texto: "Guardado: el guía ya lo ve en la salida" }); router.refresh();
  }
  const area = (k: keyof Datos, label: string, ph: string, filas = 4) => (
    <label className={etiquetaCls}>{label}<textarea value={d[k] as string} onChange={set(k)} rows={filas} placeholder={ph} className={`${inputCls} mt-1 normal-case tracking-normal`} /></label>
  );
  return (
    <form onSubmit={guardar} className="mt-3 space-y-5">
      <div>
        <h1 className="font-cormorant text-[30px] leading-tight text-[var(--panel-tinta)]">{nombre}</h1>
        <p className="text-[12.5px] font-dm text-[var(--panel-tinta-media)]">{actualizado ? `Última edición: ${actualizado}` : "Sin ficha todavía"} · los costos se capturan en el <Link href="/admin/cotizador" className="panel-foco font-semibold text-[var(--panel-acento)] hover:underline">Cotizador</Link></p>
      </div>

      <section className="panel-card space-y-3 p-4">
        <h2 className="font-cormorant text-[22px] text-[var(--panel-tinta)]">Paradas y horarios</h2>
        {d.paradas.length === 0 && <p className="text-[13px] font-dm text-[var(--panel-tinta-media)]">Sin paradas. Agrega la primera (por ejemplo «08:00 · Punto de encuentro»).</p>}
        {d.paradas.map((p, i) => (
          <div key={i} className="grid grid-cols-[72px_1fr_auto] gap-2 sm:grid-cols-[80px_1fr_1.4fr_auto]">
            <input aria-label={`Hora de la parada ${i + 1}`} type="time" value={p.hora} onChange={e => parada(i, "hora", e.target.value)} className={inputCls} />
            <input aria-label={`Lugar de la parada ${i + 1}`} value={p.lugar} onChange={e => parada(i, "lugar", e.target.value)} placeholder="Lugar" className={inputCls} />
            <input aria-label={`Detalle de la parada ${i + 1}`} value={p.detalle} onChange={e => parada(i, "detalle", e.target.value)} placeholder="Qué se hace, cuánto dura" className={`${inputCls} col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto`} />
            <div className="flex gap-1">
              {i > 0 && <button type="button" aria-label="Subir parada" onClick={() => setD(x => { const ps = [...x.paradas]; [ps[i - 1], ps[i]] = [ps[i], ps[i - 1]]; return { ...x, paradas: ps }; })} className="panel-foco inline-flex h-10 w-10 items-center justify-center rounded-[var(--panel-radio-sm)] border border-[var(--panel-borde)]"><ArrowUp className="h-4 w-4" aria-hidden="true" /></button>}
              <button type="button" aria-label="Quitar parada" onClick={() => setD(x => ({ ...x, paradas: x.paradas.filter((_, j) => j !== i) }))} className="panel-foco inline-flex h-10 w-10 items-center justify-center rounded-[var(--panel-radio-sm)] border border-[var(--panel-borde)] text-[var(--panel-problema)]"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
            </div>
          </div>
        ))}
        <button type="button" onClick={() => setD(x => ({ ...x, paradas: [...x.paradas, { hora: "", lugar: "", detalle: "" }] }))} className={botonSecundario}><Plus className="h-4 w-4" aria-hidden="true" />Agregar parada</button>
      </section>

      <section className="panel-card grid gap-3 p-4 sm:grid-cols-2">
        <label className={`${etiquetaCls} sm:col-span-2`}>Punto de encuentro<input value={d.puntoEncuentro} onChange={set("puntoEncuentro")} placeholder={encuentroCatalogo || "Dónde y a qué hora"} className={`${inputCls} mt-1 normal-case tracking-normal`} /></label>
        {area("seguridad", "Seguridad (uno por renglón)", "Chaleco puesto antes de subir a la canoa\nNo nadar en la poza grande con corriente…")}
        {area("planB", "Plan B", "Si el río viene crecido: …\nSi llueve: …")}
        {area("queLlevar", "Qué llevar (uno por renglón)", "Ropa que se pueda mojar\nBloqueador biodegradable…")}
        {area("notas", "Notas internas", "Lo que el equipo debe saber de este tour")}
        <div className="sm:col-span-2">{area("guion", "Guion del guía", "Lo que se cuenta en cada parada: historia, datos, chistes que funcionan…", 7)}</div>
      </section>

      <section className="panel-card p-4">
        <h2 className="font-cormorant text-[22px] text-[var(--panel-tinta)]">Proveedores</h2>
        {proveedores.length === 0 ? <p className="mt-1 text-[13px] font-dm text-[var(--panel-tinta-media)]">Aún no hay proveedores. Dalos de alta en <Link href="/admin/proveedores" className="panel-foco font-semibold text-[var(--panel-acento)] hover:underline">Proveedores</Link>.</p> : (
          <div className="mt-2 flex flex-wrap gap-2">
            {[...proveedores].sort((a, b) => Number(b.sugerido) - Number(a.sugerido)).map(p => {
              const on = d.proveedores.includes(p.id);
              return <button key={p.id} type="button" aria-pressed={on} onClick={() => setD(x => ({ ...x, proveedores: on ? x.proveedores.filter(y => y !== p.id) : [...x.proveedores, p.id] }))}
                className={`panel-foco rounded-full border px-3 py-1.5 text-[12.5px] font-dm ${on ? "border-[var(--panel-acento)] bg-[var(--panel-acento)] text-white" : "border-[var(--panel-borde)] bg-white text-[var(--panel-tinta)]"}`}>{p.nombre} · {p.servicio}{p.sugerido && !on ? " ★" : ""}</button>;
            })}
          </div>
        )}
      </section>

      <div className="sticky bottom-3 flex items-center gap-3">
        <button type="submit" disabled={guardando} className={botonPrimario}>{guardando ? "Guardando…" : "Guardar ficha"}</button>
        {msj && <p role="status" className={`text-[13px] font-dm ${msj.error ? "text-[var(--panel-problema)]" : "text-[var(--panel-bien)]"}`}>{msj.texto}</p>}
      </div>
    </form>
  );
}
