"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { SERVICIOS_PROVEEDOR, etiquetaServicio, type PrecioProveedor } from "@/lib/admin/rutas";
import { EncabezadoPagina } from "@/components/admin/ui/EncabezadoPagina";
import { EstadoVacio } from "@/components/admin/ui/EstadoVacio";
import { playError, playSuccess } from "@/lib/admin/sfx";
import { botonPrimario, botonSecundario, etiquetaCls, fmx, inputCls } from "../leads/comun";

interface Prov { id?: string; nombre: string; servicio: string; contacto: string; telefono: string; correo: string; precios: PrecioProveedor[]; tours: string[]; notas: string; activo: boolean }
const VACIO: Prov = { nombre: "", servicio: "otro", contacto: "", telefono: "", correo: "", precios: [], tours: [], notas: "", activo: true };

export default function ProveedoresClient({ inicial, tours }: { inicial: (Prov & { id: string })[]; tours: { slug: string; nombre: string }[] }) {
  const router = useRouter();
  const [editando, setEditando] = useState<Prov | null>(null);
  const [verBajas, setVerBajas] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [msj, setMsj] = useState<{ texto: string; error?: boolean } | null>(null);
  const nombreTour = (s: string) => tours.find(t => t.slug === s)?.nombre ?? s;

  async function guardar(p: Prov) {
    if (guardando) return;
    setGuardando(true); setMsj(null);
    const r = await fetch(p.id ? `/api/admin/proveedores/${p.id}` : "/api/admin/proveedores", { method: p.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) }).catch(() => null);
    const j = await r?.json().catch(() => null);
    setGuardando(false);
    if (!r?.ok) { playError(); setMsj({ texto: j?.error || "No se pudo guardar", error: true }); return; }
    playSuccess(); setEditando(null); setMsj({ texto: p.id ? (p.activo ? "Proveedor guardado" : "Proveedor dado de baja") : "Proveedor agregado" }); router.refresh();
  }

  const visibles = inicial.filter(p => verBajas || p.activo);
  return (
    <div className="mx-auto max-w-4xl p-4 pb-12 sm:p-6 md:p-8">
      <EncabezadoPagina titulo="Proveedores" nueva subtitulo={`${inicial.filter(p => p.activo).length} activos · se asignan a cada tour en «Rutas y protocolos»`}
        acciones={<button type="button" onClick={() => setEditando({ ...VACIO })} className={botonPrimario}><Plus className="h-4 w-4" aria-hidden="true" />Nuevo proveedor</button>} />
      {msj && <p role="status" className={`mb-3 text-[13px] font-dm ${msj.error ? "text-[var(--panel-problema)]" : "text-[var(--panel-bien)]"}`}>{msj.texto}</p>}
      {editando && <Formulario p={editando} tours={tours} guardando={guardando} onGuardar={guardar} onCancelar={() => setEditando(null)} />}
      {visibles.length === 0 && !editando ? (
        <EstadoVacio titulo="Sin proveedores todavía" texto="Canoas, desayunos, hospedaje, transporte… con su contacto y el precio pactado por temporada." />
      ) : (
        <ul className="space-y-2">
          {visibles.map(p => (
            <li key={p.id} className={`panel-card p-4 ${p.activo ? "" : "opacity-60"}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[15px] font-dm font-semibold text-[var(--panel-tinta)]">{p.nombre} <span className="text-[12px] font-normal text-[var(--panel-tinta-media)]">· {etiquetaServicio(p.servicio)}{p.activo ? "" : " · de baja"}</span></p>
                  <p className="text-[12.5px] font-dm text-[var(--panel-tinta-media)]">{[p.contacto, p.telefono, p.correo].filter(Boolean).join(" · ") || "Sin contacto"}</p>
                </div>
                <div className="flex gap-1.5">
                  {p.telefono && <a href={`https://wa.me/${p.telefono.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className={`${botonSecundario} min-h-[36px] px-3`}><Phone className="h-4 w-4" aria-hidden="true" />WhatsApp</a>}
                  <button type="button" onClick={() => setEditando({ ...p })} className={`${botonSecundario} min-h-[36px] px-3`}><Pencil className="h-4 w-4" aria-hidden="true" />Editar</button>
                </div>
              </div>
              {p.precios.length > 0 && <ul className="mt-2 text-[12.5px] font-dm text-[var(--panel-tinta)]">{p.precios.map((x, i) => <li key={i}>{x.temporada}: {x.concepto} {fmx(x.precio)}{x.porPersona ? " por persona" : ""}</li>)}</ul>}
              {p.tours.length > 0 && <p className="mt-1 text-[12px] font-dm text-[var(--panel-tinta-media)]">Tours: {p.tours.map(nombreTour).join(", ")}</p>}
            </li>
          ))}
        </ul>
      )}
      {inicial.some(p => !p.activo) && <button type="button" onClick={() => setVerBajas(v => !v)} className="panel-foco mt-3 text-[12.5px] font-dm text-[var(--panel-tinta-media)] hover:underline">{verBajas ? "Ocultar" : "Ver"} los dados de baja</button>}
    </div>
  );
}

function Formulario({ p: inicial, tours, guardando, onGuardar, onCancelar }: { p: Prov; tours: { slug: string; nombre: string }[]; guardando: boolean; onGuardar: (p: Prov) => void; onCancelar: () => void }) {
  const [p, setP] = useState<Prov>(inicial);
  const set = (k: keyof Prov) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setP(x => ({ ...x, [k]: e.target.value }));
  const precio = (i: number, k: keyof PrecioProveedor, v: string | boolean) => setP(x => ({ ...x, precios: x.precios.map((y, j) => j === i ? { ...y, [k]: k === "precio" ? Number(String(v).replace(/[^\d]/g, "")) || 0 : v } : y) }));
  return (
    <form onSubmit={e => { e.preventDefault(); onGuardar(p); }} className="panel-card mb-4 space-y-3 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={etiquetaCls}>Nombre<input required value={p.nombre} onChange={set("nombre")} className={`${inputCls} mt-1 normal-case tracking-normal`} /></label>
        <label className={etiquetaCls}>Servicio<select value={p.servicio} onChange={set("servicio")} className={`${inputCls} mt-1 normal-case tracking-normal`}>{SERVICIOS_PROVEEDOR.map(s => <option key={s.clave} value={s.clave}>{s.etiqueta}</option>)}</select></label>
        <label className={etiquetaCls}>Contacto<input value={p.contacto} onChange={set("contacto")} placeholder="Con quién se habla" className={`${inputCls} mt-1 normal-case tracking-normal`} /></label>
        <label className={etiquetaCls}>Teléfono<input type="tel" value={p.telefono} onChange={set("telefono")} className={`${inputCls} mt-1 normal-case tracking-normal`} /></label>
        <label className={etiquetaCls}>Correo<input type="email" value={p.correo} onChange={set("correo")} className={`${inputCls} mt-1 normal-case tracking-normal`} /></label>
        <label className={etiquetaCls}>Notas<input value={p.notas} onChange={set("notas")} placeholder="Horario, cómo se le paga…" className={`${inputCls} mt-1 normal-case tracking-normal`} /></label>
      </div>
      <div>
        <p className={etiquetaCls}>Precio pactado por temporada</p>
        {p.precios.map((x, i) => (
          <div key={i} className="mt-1 grid grid-cols-[1fr_1fr_110px_auto] items-center gap-2">
            <input aria-label="Temporada" value={x.temporada} onChange={e => precio(i, "temporada", e.target.value)} placeholder="Alta (15 dic–6 ene)" className={inputCls} />
            <input aria-label="Concepto" value={x.concepto} onChange={e => precio(i, "concepto", e.target.value)} placeholder="Canoa, desayuno…" className={inputCls} />
            <input aria-label="Precio" inputMode="numeric" value={x.precio || ""} onChange={e => precio(i, "precio", e.target.value)} placeholder="$" className={inputCls} />
            <div className="flex items-center gap-1">
              <label className="flex items-center gap-1 text-[11.5px] font-dm text-[var(--panel-tinta-media)]"><input type="checkbox" checked={x.porPersona} onChange={e => precio(i, "porPersona", e.target.checked)} />por persona</label>
              <button type="button" aria-label="Quitar precio" onClick={() => setP(y => ({ ...y, precios: y.precios.filter((_, j) => j !== i) }))} className="panel-foco p-2 text-[var(--panel-problema)]"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
            </div>
          </div>
        ))}
        <button type="button" onClick={() => setP(x => ({ ...x, precios: [...x.precios, { temporada: "Todo el año", concepto: "", precio: 0, porPersona: true }] }))} className="panel-foco mt-1 text-[12.5px] font-dm font-semibold text-[var(--panel-acento)] hover:underline">+ Agregar precio</button>
      </div>
      <div>
        <p className={etiquetaCls}>Tours en los que participa</p>
        <div className="mt-1 flex flex-wrap gap-1.5">{tours.map(t => { const on = p.tours.includes(t.slug); return <button key={t.slug} type="button" aria-pressed={on} onClick={() => setP(x => ({ ...x, tours: on ? x.tours.filter(s => s !== t.slug) : [...x.tours, t.slug] }))} className={`panel-foco rounded-full border px-2.5 py-1 text-[12px] font-dm ${on ? "border-[var(--panel-acento)] bg-[var(--panel-acento)] text-white" : "border-[var(--panel-borde)] bg-white"}`}>{t.nombre}</button>; })}</div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={guardando} className={botonPrimario}>{guardando ? "Guardando…" : "Guardar"}</button>
        <button type="button" onClick={onCancelar} className={botonSecundario}>Cancelar</button>
        {p.id && <button type="button" onClick={() => onGuardar({ ...p, activo: !p.activo })} className="panel-foco ml-auto text-[12.5px] font-dm text-[var(--panel-problema)] hover:underline">{p.activo ? "Dar de baja" : "Reactivar"}</button>}
      </div>
    </form>
  );
}
