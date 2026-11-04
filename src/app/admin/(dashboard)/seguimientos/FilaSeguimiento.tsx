"use client";

import Link from "next/link";
import { Check, Phone } from "lucide-react";
import type { TareaFila } from "@/lib/admin/crmDatos";
import { estadoFecha, etiquetaEtapa } from "@/lib/admin/crm";
import { COLOR_FECHA, fechaCorta } from "../leads/comun";

export type AccionSeguimiento = "hecha" | "reabrir" | "posponer";

/** Un seguimiento: hecho o pospuesto en un toque, con la ficha y el WhatsApp del cliente. Lo usan Leads y Seguimientos. */
export function FilaSeguimiento({ t, hoy, onCambiar, conResponsable }: {
  t: TareaFila; hoy: string; onCambiar: (t: TareaFila, a: AccionSeguimiento, dias?: number) => void; conResponsable?: boolean;
}) {
  const ef = estadoFecha(t.vence, hoy);
  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <button type="button" aria-label="Marcar hecho" onClick={() => onCambiar(t, "hecha")}
        className="panel-foco flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--panel-borde-fuerte)] text-[var(--panel-tinta-suave)] hover:border-[var(--panel-bien)] hover:text-[var(--panel-bien)]"><Check className="h-4 w-4" aria-hidden="true" /></button>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-dm font-medium text-[var(--panel-tinta)]">{t.titulo}</p>
        <p className="flex flex-wrap gap-x-3 text-[12px] font-dm text-[var(--panel-tinta-media)]">
          <span className={`capitalize ${COLOR_FECHA[ef]}`}>{ef === "vencido" ? "Venció " : ef === "hoy" ? "Hoy" : ""}{ef === "hoy" ? "" : fechaCorta(t.vence)}{t.hora ? ` ${t.hora}` : ""}</span>
          {conResponsable && <span>{t.responsable}</span>}
          {t.cliente && t.oportunidadId && <Link href={`/admin/leads/${t.oportunidadId}`} className="panel-foco font-medium text-[var(--panel-acento)] hover:underline">{t.cliente}{t.etapa ? ` · ${etiquetaEtapa(t.etapa)}` : ""}</Link>}
          {t.telefono && <a href={`https://wa.me/${t.telefono.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="panel-foco inline-flex items-center gap-1 text-[#1f7a4d] hover:underline"><Phone className="h-3 w-3" aria-hidden="true" />WhatsApp</a>}
        </p>
      </div>
      <div className="flex gap-1.5">
        <button type="button" onClick={() => onCambiar(t, "posponer", 1)} className="panel-foco min-h-[36px] rounded-[var(--panel-radio-sm)] border border-[var(--panel-borde)] bg-white px-2.5 text-[12px] font-dm text-[var(--panel-tinta-media)]">+1 día</button>
        <button type="button" onClick={() => onCambiar(t, "posponer", 3)} className="panel-foco min-h-[36px] rounded-[var(--panel-radio-sm)] border border-[var(--panel-borde)] bg-white px-2.5 text-[12px] font-dm text-[var(--panel-tinta-media)]">+3 días</button>
      </div>
    </li>
  );
}

/** Cambia un seguimiento en el servidor; devuelve el error o null. */
export async function cambiarSeguimiento(t: TareaFila, accion: AccionSeguimiento, dias?: number): Promise<{ error: string | null; vence?: string }> {
  const r = await fetch(`/api/admin/tareas/${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accion, dias }) }).catch(() => null);
  const d = await r?.json().catch(() => null);
  return r?.ok ? { error: null, vence: d?.vence } : { error: d?.error || "No se pudo guardar" };
}
