"use client";

import { useState } from "react";
import { MOTIVOS_PERDIDA, type MotivoPerdida } from "@/lib/admin/crm";
import { botonSecundario, etiquetaCls, inputCls } from "./comun";

/** Marcar un lead como perdido: el motivo es obligatorio (prompt, 3 nov 2026). */
export function DialogoPerdido({ nombre, onCancelar, onConfirmar }: {
  nombre: string; onCancelar: () => void; onConfirmar: (motivo: MotivoPerdida, detalle: string) => void;
}) {
  const [motivo, setMotivo] = useState<MotivoPerdida | "">("");
  const [detalle, setDetalle] = useState("");
  const listo = !!motivo && (motivo !== "otro" || detalle.trim());
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onCancelar} />
      <div role="dialog" aria-labelledby="perdido-titulo" className="relative w-full max-w-md rounded-[var(--panel-radio)] bg-white p-5 shadow-2xl">
        <p className="panel-eyebrow">Marcar como perdido</p>
        <h3 id="perdido-titulo" className="mt-1 font-cormorant text-2xl text-[var(--panel-tinta)]">{nombre}</h3>
        <label className={`${etiquetaCls} mt-4`}>¿Por qué se perdió? *
          <select value={motivo} onChange={e => setMotivo(e.target.value as MotivoPerdida | "")} className={`${inputCls} mt-1 normal-case tracking-normal`} aria-invalid={!motivo}>
            <option value="">— Elige el motivo —</option>
            {MOTIVOS_PERDIDA.map(m => <option key={m.clave} value={m.clave}>{m.etiqueta}</option>)}
          </select></label>
        <label className={`${etiquetaCls} mt-3`}>Detalle {motivo === "otro" ? "*" : "(opcional)"}
          <input value={detalle} onChange={e => setDetalle(e.target.value)} maxLength={200} className={`${inputCls} mt-1 normal-case tracking-normal`} placeholder="Por ejemplo: le pareció caro el RZR" /></label>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancelar} className={botonSecundario}>Cancelar</button>
          <button type="button" disabled={!listo} onClick={() => motivo && onConfirmar(motivo, detalle.trim())}
            className="panel-foco panel-pulsable min-h-[44px] rounded-[var(--panel-radio-sm)] bg-[var(--panel-problema)] px-4 text-[13px] font-dm font-semibold text-white disabled:opacity-40">Marcar perdido</button>
        </div>
      </div>
    </div>
  );
}
