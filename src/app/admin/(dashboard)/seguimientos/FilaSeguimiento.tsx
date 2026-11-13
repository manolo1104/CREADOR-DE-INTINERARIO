"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, Phone } from "lucide-react";
import type { TareaFila } from "@/lib/admin/crmDatos";
import { estadoFecha, etiquetaEtapa } from "@/lib/admin/crm";
import { COLOR_FECHA, botonPrimario, botonSecundario, fechaCortaM, inputCls } from "../leads/comun";

export type AccionSeguimiento = "hecha" | "reabrir" | "posponer";
export interface EdicionSeguimiento { titulo: string; vence: string; hora: string; responsable: string }

/**
 * Un seguimiento: hecho, pospuesto o editado en su lugar. Tocar la fila abre
 * la ficha del lead. Lo usan Leads y Seguimientos.
 */
export function FilaSeguimiento({ t, hoy, onCambiar, onEditar, responsables, conResponsable }: {
  t: TareaFila; hoy: string; onCambiar: (t: TareaFila, a: AccionSeguimiento, dias?: number) => void | Promise<void>;
  onEditar?: (t: TareaFila, e: EdicionSeguimiento) => Promise<boolean>; responsables?: string[]; conResponsable?: boolean;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  // Un toque a la vez: un doble toque en «+1 día» lo movía dos días.
  const [ocupada, setOcupada] = useState(false);
  const hacer = async (a: AccionSeguimiento, dias?: number) => {
    if (ocupada) return;
    setOcupada(true);
    try { await onCambiar(t, a, dias); } finally { setOcupada(false); }
  };
  const ef = estadoFecha(t.vence, hoy);
  // La fila abre lo suyo: la ficha del lead o, si es de una salida, esa salida.
  const ficha = t.oportunidadId ? `/admin/leads/${t.oportunidadId}` : t.salidaClave ? `/admin/salidas-dia/${encodeURIComponent(t.salidaClave)}` : null;
  if (editando && onEditar) {
    return (
      <li className="px-4 py-3">
        <EditorSeguimiento inicial={{ titulo: t.titulo, vence: t.vence, hora: t.hora ?? "", responsable: t.responsable }} responsables={responsables ?? [t.responsable]}
          onCancelar={() => setEditando(false)} onGuardar={async e => { if (await onEditar(t, e)) setEditando(false); }} />
      </li>
    );
  }
  // La fila entera abre la ficha; los botones y enlaces de adentro no.
  const abrir = (e: React.MouseEvent) => {
    if (!ficha || (e.target as HTMLElement).closest("button, a, input, select")) return;
    router.push(ficha);
  };
  return (
    <li onClick={abrir} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${ficha ? "cursor-pointer hover:bg-[var(--panel-fondo-velo)]" : ""}`}>
      <button type="button" aria-label="Marcar hecho" title="Marcar hecho" onClick={() => void hacer("hecha")} disabled={ocupada}
        className="panel-foco flex h-9 w-9 disabled:opacity-50 shrink-0 items-center justify-center rounded-full border border-[var(--panel-borde-fuerte)] text-[var(--panel-tinta-suave)] hover:border-[var(--panel-bien)] hover:text-[var(--panel-bien)]"><Check className="h-4 w-4" aria-hidden="true" /></button>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-dm font-medium text-[var(--panel-tinta)]">{t.titulo}{t.origen === "regla" && <span title="Lo creó una regla automática" className="ml-2 inline-block rounded-full bg-[var(--panel-fondo-velo)] px-2 py-0.5 align-middle text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--panel-tinta-media)]">Automático</span>}</p>
        <p className="flex flex-wrap gap-x-3 text-[12px] font-dm text-[var(--panel-tinta-media)]">
          <span className={`${COLOR_FECHA[ef]}`}>{ef === "vencido" ? "Venció " : ef === "hoy" ? "Hoy" : ""}{ef === "hoy" ? "" : fechaCortaM(t.vence)}{t.hora ? ` ${t.hora}` : ""}</span>
          {conResponsable && <span>{t.responsable}</span>}
          {t.cliente && ficha && <Link href={ficha} className="panel-foco font-medium text-[var(--panel-acento)] hover:underline">{t.cliente}{t.etapa ? ` · ${etiquetaEtapa(t.etapa)}` : ""}</Link>}
          {t.telefono && <a href={`https://wa.me/${t.telefono.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="panel-foco inline-flex items-center gap-1 text-[#1f7a4d] hover:underline"><Phone className="h-3 w-3" aria-hidden="true" />WhatsApp</a>}
        </p>
      </div>
      <div className="flex gap-1.5">
        {onEditar && <button type="button" onClick={() => setEditando(true)} aria-label="Editar seguimiento" title="Editar"
          className="panel-foco inline-flex min-h-[36px] items-center gap-1 rounded-[var(--panel-radio-sm)] border border-[var(--panel-borde)] bg-white px-2.5 text-[12px] font-dm text-[var(--panel-tinta-media)]"><Pencil className="h-3.5 w-3.5" aria-hidden="true" />Editar</button>}
        <button type="button" onClick={() => void hacer("posponer", 1)} disabled={ocupada} className="panel-foco disabled:opacity-50 min-h-[36px] rounded-[var(--panel-radio-sm)] border border-[var(--panel-borde)] bg-white px-2.5 text-[12px] font-dm text-[var(--panel-tinta-media)]">+1 día</button>
        <button type="button" onClick={() => void hacer("posponer", 3)} disabled={ocupada} className="panel-foco disabled:opacity-50 min-h-[36px] rounded-[var(--panel-radio-sm)] border border-[var(--panel-borde)] bg-white px-2.5 text-[12px] font-dm text-[var(--panel-tinta-media)]">+3 días</button>
      </div>
    </li>
  );
}

/** Editar un seguimiento en su lugar: qué, día, hora y responsable. */
export function EditorSeguimiento({ inicial, responsables, onGuardar, onCancelar, ocupado }: {
  inicial: EdicionSeguimiento; responsables: string[]; onGuardar: (e: EdicionSeguimiento) => void | Promise<void>; onCancelar: () => void; ocupado?: boolean;
}) {
  const [e, setE] = useState(inicial);
  const lista = responsables.includes(e.responsable) ? responsables : [e.responsable, ...responsables];
  return (
    <form className="space-y-2" onSubmit={ev => { ev.preventDefault(); void onGuardar(e); }}>
      <input aria-label="Qué hay que hacer" value={e.titulo} onChange={x => setE(v => ({ ...v, titulo: x.target.value }))} className={inputCls} autoFocus />
      <div className="grid grid-cols-3 gap-2">
        <input aria-label="Día" type="date" value={e.vence} onChange={x => setE(v => ({ ...v, vence: x.target.value }))} className={inputCls} />
        <input aria-label="Hora" type="time" value={e.hora} onChange={x => setE(v => ({ ...v, hora: x.target.value }))} className={inputCls} />
        <select aria-label="Responsable" value={e.responsable} onChange={x => setE(v => ({ ...v, responsable: x.target.value }))} className={inputCls}>{lista.map(r => <option key={r} value={r}>{r}</option>)}</select>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={!e.titulo.trim() || !e.vence || ocupado} className={botonPrimario}>Guardar cambios</button>
        <button type="button" onClick={onCancelar} className={botonSecundario}>Cancelar</button>
      </div>
    </form>
  );
}

/** Cambia un seguimiento en el servidor; devuelve el error o null. */
export async function cambiarSeguimiento(t: TareaFila, accion: AccionSeguimiento, dias?: number): Promise<{ error: string | null; vence?: string }> {
  const r = await fetch(`/api/admin/tareas/${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accion, dias }) }).catch(() => null);
  const d = await r?.json().catch(() => null);
  return r?.ok ? { error: null, vence: d?.vence } : { error: d?.error || "No se pudo guardar" };
}

/** Guarda la edición de un seguimiento; devuelve el error o null. */
export async function editarSeguimiento(id: string, e: EdicionSeguimiento): Promise<string | null> {
  const r = await fetch(`/api/admin/tareas/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accion: "editar", ...e, hora: e.hora || null }) }).catch(() => null);
  const d = await r?.json().catch(() => null);
  return r?.ok ? null : d?.error || "No se pudo guardar";
}
