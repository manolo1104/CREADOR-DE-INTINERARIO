"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { TareaFila } from "@/lib/admin/crmDatos";
import { agruparTareas } from "@/lib/admin/crm";
import { REGLAS } from "@/lib/admin/automatizaciones";
import { FilaSeguimiento, cambiarSeguimiento, editarSeguimiento, type AccionSeguimiento, type EdicionSeguimiento } from "./FilaSeguimiento";
import { playClick, playError, playSuccess } from "@/lib/admin/sfx";
import { EncabezadoPagina } from "@/components/admin/ui/EncabezadoPagina";
import { EstadoVacio } from "@/components/admin/ui/EstadoVacio";
import { botonPrimario, botonSecundario, inputCls } from "../leads/comun";

/**
 * Seguimientos (Fase 2): lo vencido, lo de hoy y lo próximo, por responsable.
 * Hecho o pospuesto en un toque. Ningún lead se queda sin siguiente paso.
 */
export default function SeguimientosClient({ tareas: iniciales, responsables, quien, hoy }: { tareas: TareaFila[]; responsables: string[]; quien: string; hoy: string }) {
  const router = useRouter();
  const [tareas, setTareas] = useState(iniciales);
  const [base, setBase] = useState(iniciales);
  if (base !== iniciales) { setBase(iniciales); setTareas(iniciales); }
  const [filtro, setFiltro] = useState<string>(responsables.includes(quien) ? quien : "");
  const [nueva, setNueva] = useState({ titulo: "", responsable: quien || responsables[0] || "", vence: hoy, hora: "" });
  const [abierto, setAbierto] = useState(false);
  const [msj, setMsj] = useState<{ texto: string; error?: boolean } | null>(null);

  async function cambiar(t: TareaFila, accion: AccionSeguimiento, dias?: number) {
    playClick();
    const antes = tareas;
    setTareas(ts => ts.map(x => x.id === t.id ? { ...x, estado: accion === "hecha" ? "hecha" : accion === "reabrir" ? "pendiente" : x.estado } : x));
    const r = await cambiarSeguimiento(t, accion, dias);
    if (r.error) { playError(); setTareas(antes); setMsj({ texto: r.error, error: true }); return; }
    if (accion === "posponer" && r.vence) setTareas(ts => ts.map(x => x.id === t.id ? { ...x, vence: r.vence as string } : x));
    playSuccess(); router.refresh();
  }
  async function editar(t: TareaFila, e: EdicionSeguimiento) {
    const error = await editarSeguimiento(t.id, e);
    if (error) { playError(); setMsj({ texto: error, error: true }); return false; }
    playSuccess(); setMsj({ texto: e.responsable !== t.responsable ? `Seguimiento cambiado: ahora le toca a ${e.responsable}` : "Seguimiento cambiado" });
    setTareas(ts => ts.map(x => x.id === t.id ? { ...x, titulo: e.titulo, vence: e.vence, hora: e.hora || null, responsable: e.responsable } : x));
    router.refresh();
    return true;
  }
  const [creando, setCreando] = useState(false);
  async function crear(e: React.FormEvent) {
    e.preventDefault();
    if (creando) return; // un doble toque creaba dos
    setCreando(true);
    const r = await fetch("/api/admin/tareas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...nueva, hora: nueva.hora || null }) }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setCreando(false);
    if (!r?.ok) { playError(); setMsj({ texto: d?.error || "No se pudo crear", error: true }); return; }
    playSuccess(); setNueva(n => ({ ...n, titulo: "" })); setAbierto(false); setMsj({ texto: "Seguimiento creado" }); router.refresh();
  }

  const visibles = tareas.filter(t => !filtro || t.responsable === filtro);
  const grupos = agruparTareas(visibles, hoy);
  const vencidas = visibles.filter(t => t.estado !== "hecha" && t.vence < hoy).length;
  const deHoy = visibles.filter(t => t.estado !== "hecha" && t.vence === hoy).length;
  const hechasHoy = visibles.filter(t => t.estado === "hecha");

  return (
    <div className="mx-auto max-w-4xl p-4 pb-12 sm:p-6 md:p-8">
      <EncabezadoPagina titulo="Seguimientos" nueva subtitulo={`${vencidas} vencido${vencidas === 1 ? "" : "s"} · ${deHoy} para hoy`}
        acciones={<button type="button" onClick={() => { playClick(); setAbierto(a => !a); }} className={botonPrimario}><Plus className="h-4 w-4" aria-hidden="true" />Nuevo seguimiento</button>} />

      {abierto && (
        <form onSubmit={crear} className="panel-card mb-4 grid gap-2 p-4 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]">
          <input aria-label="Qué hay que hacer" required value={nueva.titulo} onChange={e => setNueva(n => ({ ...n, titulo: e.target.value }))} placeholder="Qué hay que hacer" className={inputCls} />
          <select aria-label="Responsable" value={nueva.responsable} onChange={e => setNueva(n => ({ ...n, responsable: e.target.value }))} className={inputCls}>{responsables.map(r => <option key={r} value={r}>{r}</option>)}</select>
          <input aria-label="Vence" type="date" value={nueva.vence} onChange={e => setNueva(n => ({ ...n, vence: e.target.value }))} className={inputCls} />
          <input aria-label="Hora" type="time" value={nueva.hora} onChange={e => setNueva(n => ({ ...n, hora: e.target.value }))} className={inputCls} />
          <button type="submit" disabled={creando} className={`${botonPrimario} disabled:opacity-50`}>{creando ? "Creando…" : "Crear"}</button>
          <p className="text-[11.5px] font-dm text-[var(--panel-tinta-suave)] sm:col-span-5">Para un cliente, créalo desde su ficha en Leads: así queda como su próximo paso.</p>
        </form>
      )}

      <div role="group" aria-label="Responsable" className="mb-4 flex flex-wrap gap-1.5">
        {["", ...responsables].map(r => (
          <button key={r || "todos"} type="button" aria-pressed={filtro === r} onClick={() => { playClick(); setFiltro(r); }}
            className={`panel-foco min-h-[36px] rounded-full border px-3 text-[12.5px] font-dm ${filtro === r ? "border-[var(--panel-tinta)] bg-[var(--panel-tinta)] text-white" : "border-[var(--panel-borde)] bg-white text-[var(--panel-tinta-media)]"}`}>
            {r || "Todos"}
          </button>
        ))}
      </div>
      <details className="mb-3 text-[12.5px] font-dm text-[var(--panel-tinta-media)]">
        <summary className="panel-foco cursor-pointer select-none">Qué seguimientos se crean solos</summary>
        <ul className="mt-2 space-y-1 pl-4">
          {REGLAS.map(r => <li key={r.clave} className="list-disc"><span className="font-medium text-[var(--panel-tinta)]">{r.etiqueta}:</span> {r.detalle}</li>)}
          <li className="list-disc">Cada mañana a las 7:30 llega por correo el resumen del día a cada quien.</li>
        </ul>
      </details>
      {msj && <p role="status" className={`mb-3 text-[13px] font-dm ${msj.error ? "text-[var(--panel-problema)]" : "text-[var(--panel-bien)]"}`}>{msj.texto}</p>}

      {grupos.length === 0 ? (
        <EstadoVacio titulo="Sin seguimientos pendientes" texto="Cuando un lead necesite un siguiente paso, créalo desde su ficha o aquí. Lo vencido sale en rojo." accion={{ href: "/admin/leads", etiqueta: "Ir a Leads" }} />
      ) : grupos.map(g => (
        <section key={g.responsable} className="mb-5">
          <h2 className="mb-2 font-cormorant text-[22px] text-[var(--panel-tinta)]">{g.responsable}</h2>
          {([["Vencidos", g.vencidas], ["Hoy", g.hoy], ["Próximos", g.proximas]] as const).filter(([, ts]) => ts.length > 0).map(([titulo, ts]) => (
            <div key={titulo} className="panel-card mb-3 overflow-hidden">
              <p className={`px-4 pt-3 text-[11px] font-dm font-semibold uppercase tracking-[0.12em] ${titulo === "Vencidos" ? "text-[var(--panel-problema)]" : "text-[var(--panel-tinta-suave)]"}`}>{titulo} · {ts.length}</p>
              <ul className="divide-y divide-[var(--panel-borde)]">
                {ts.map(t => <FilaSeguimiento key={t.id} t={t} hoy={hoy} onCambiar={cambiar} onEditar={editar} responsables={responsables} />)}
              </ul>
            </div>
          ))}
        </section>
      ))}

      {hechasHoy.length > 0 && (
        <details className="panel-card p-4">
          <summary className="cursor-pointer text-[13px] font-dm text-[var(--panel-tinta-media)]">Hechos en las últimas 24 h · {hechasHoy.length}</summary>
          <ul className="mt-2 divide-y divide-[var(--panel-borde)]">
            {hechasHoy.map(t => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2 text-[13px] font-dm">
                <span className="text-[var(--panel-tinta-suave)] line-through">{t.titulo}{t.cliente ? ` · ${t.cliente}` : ""}</span>
                <button type="button" onClick={() => cambiar(t, "reabrir")} className={botonSecundario}>Reabrir</button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
