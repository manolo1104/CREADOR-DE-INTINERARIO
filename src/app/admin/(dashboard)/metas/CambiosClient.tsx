"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export interface CambioFila { id: string; fecha: string; frente: string; titulo: string; detalle: string | null; kpis: string[]; creadoPor: string }

const FRENTES: { clave: string; etiqueta: string }[] = [
  { clave: "demanda", etiqueta: "Demanda y canales" }, { clave: "comercial", etiqueta: "Comercial" },
  { clave: "operacion", etiqueta: "Operación" }, { clave: "producto", etiqueta: "Producto" },
  { clave: "precio", etiqueta: "Precio" }, { clave: "servicio", etiqueta: "Servicio" }, { clave: "datos", etiqueta: "Datos y medición" },
];
const inputCls = "panel-foco min-h-[40px] rounded-[var(--panel-radio-sm)] border border-[var(--panel-borde)] bg-white px-3 text-[16px] sm:text-[13px] font-dm text-[var(--panel-tinta)]";

/**
 * La bitácora de cambios (4 nov 2026): qué se cambió en el negocio y cuándo,
 * para leer las tendencias antes y después. Regla del plan: «cada cambio se
 * anota con su fecha; sin fecha no se puede saber qué movió el número».
 */
export function CambiosClient({ cambios, hoy, kpis }: { cambios: CambioFila[]; hoy: string; kpis: { clave: string; nombre: string; frente: string }[] }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [fecha, setFecha] = useState(hoy);
  const [frente, setFrente] = useState("demanda");
  const [titulo, setTitulo] = useState("");
  const [detalle, setDetalle] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const etiquetaFrente = (f: string) => FRENTES.find(x => x.clave === f)?.etiqueta ?? f;
  const nombreKpi = (k: string) => kpis.find(x => x.clave === k)?.nombre ?? k;

  async function guardar() {
    setGuardando(true); setError(null);
    const r = await fetch("/api/admin/cambios", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fecha, frente, titulo, detalle, kpis: sel }) });
    const j = await r.json().catch(() => ({}));
    setGuardando(false);
    if (!r.ok) { setError(j.error ?? "No se pudo guardar."); return; }
    setTitulo(""); setDetalle(""); setSel([]); setAbierto(false);
    router.refresh();
  }
  async function quitar(id: string) {
    if (!window.confirm("¿Quitar este cambio de la bitácora?")) return;
    await fetch(`/api/admin/cambios?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="px-4 pb-4">
      {!abierto ? (
        <button type="button" onClick={() => setAbierto(true)}
          className="panel-foco panel-pulsable mb-3 inline-flex min-h-[40px] items-center rounded-[var(--panel-radio-sm)] bg-[var(--panel-acento)] px-4 text-[13px] font-dm font-semibold text-white">
          + Anotar un cambio
        </button>
      ) : (
        <div className="mb-4 grid gap-2 rounded-[var(--panel-radio-sm)] border border-[var(--panel-borde)] p-3">
          <div className="flex flex-wrap gap-2">
            <label className="flex flex-col text-[11.5px] font-dm text-[var(--panel-tinta-media)]">Fecha en que quedó vivo
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className={inputCls} /></label>
            <label className="flex flex-col text-[11.5px] font-dm text-[var(--panel-tinta-media)]">Frente
              <select value={frente} onChange={e => setFrente(e.target.value)} className={inputCls}>
                {FRENTES.map(f => <option key={f.clave} value={f.clave}>{f.etiqueta}</option>)}
              </select></label>
          </div>
          <label className="flex flex-col text-[11.5px] font-dm text-[var(--panel-tinta-media)]">Qué cambió
            <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ej.: se publicó el pago con OXXO y SPEI" className={inputCls} /></label>
          <label className="flex flex-col text-[11.5px] font-dm text-[var(--panel-tinta-media)]">Detalle (opcional)
            <textarea value={detalle} onChange={e => setDetalle(e.target.value)} rows={2} className={`${inputCls} py-2`} /></label>
          <div>
            <p className="mb-1 text-[11.5px] font-dm text-[var(--panel-tinta-media)]">KPIs que debería mover</p>
            <div className="flex flex-wrap gap-1.5">
              {kpis.filter(k => k.frente === frente).map(k => {
                const on = sel.includes(k.clave);
                return (
                  <button key={k.clave} type="button" aria-pressed={on} onClick={() => setSel(s => on ? s.filter(x => x !== k.clave) : [...s, k.clave])}
                    className={`panel-foco rounded-full border px-2.5 py-1 text-[12px] font-dm ${on ? "border-[var(--panel-acento)] bg-[var(--panel-acento)] text-white" : "border-[var(--panel-borde)] text-[var(--panel-tinta-media)]"}`}>
                    {k.nombre}
                  </button>
                );
              })}
            </div>
          </div>
          {error && <p className="text-[12.5px] font-dm text-[var(--panel-problema)]">{error}</p>}
          <div className="flex gap-2">
            <button type="button" disabled={guardando} onClick={guardar}
              className="panel-foco panel-pulsable inline-flex min-h-[40px] items-center rounded-[var(--panel-radio-sm)] bg-[var(--panel-acento)] px-4 text-[13px] font-dm font-semibold text-white disabled:opacity-60">
              {guardando ? "Guardando…" : "Guardar"}
            </button>
            <button type="button" onClick={() => setAbierto(false)} className="panel-foco min-h-[40px] px-3 text-[13px] font-dm text-[var(--panel-tinta-media)]">Cancelar</button>
          </div>
        </div>
      )}
      <ul className="divide-y divide-[var(--panel-borde)]">
        {cambios.map(c => (
          <li key={c.id} className="flex items-start justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="text-[13px] font-dm text-[var(--panel-tinta)]"><span className="panel-cifra font-semibold">{c.fecha}</span> · {c.titulo}</p>
              <p className="text-[11.5px] font-dm text-[var(--panel-tinta-suave)]">
                {etiquetaFrente(c.frente)}{c.kpis.length ? ` · mueve: ${c.kpis.map(nombreKpi).join(", ")}` : ""} · anotó {c.creadoPor}
              </p>
              {c.detalle && <p className="mt-0.5 text-[12px] font-dm text-[var(--panel-tinta-media)]">{c.detalle}</p>}
            </div>
            <button type="button" onClick={() => quitar(c.id)} className="panel-foco shrink-0 text-[11.5px] font-dm text-[var(--panel-tinta-suave)] hover:text-[var(--panel-problema)]">Quitar</button>
          </li>
        ))}
        {!cambios.length && <li className="py-2 text-[12.5px] font-dm text-[var(--panel-tinta-media)]">Todavía no hay cambios anotados.</li>}
      </ul>
    </div>
  );
}
