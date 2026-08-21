"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, X, Paperclip, Trash2, FileText, ImageIcon, Loader2 } from "lucide-react";
import { playClick, playSuccess, playError } from "@/lib/admin/sfx";

export interface Evidencia {
  id: string;
  bookingId: string;
  nombreArchivo: string;
  tipoMime: string;
  tamanoBytes: number;
  createdAt: string | Date;
}

/** Lo que esta celda necesita de la reserva (no toda la fila). */
export interface PagoProveedorState {
  id: string;
  pagoProveedor: boolean | null;
  pagoProveedorMonto: number;
  pagoProveedorFecha: string | Date | null;
  pagoProveedorNota: string | null;
}

const fmx = (n: number) => `$${n.toLocaleString("es-MX")}`;

/** `pagoProveedorFecha` llega como Date desde el servidor y como string tras un
 *  PATCH optimista; este formateador aguanta las dos. */
function fFecha(d: string | Date | null): string {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
}

const fPeso = (b: number) => (b < 1024 * 1024 ? `${Math.round(b / 1024)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);

export default function PagoProveedorCell({
  reserva,
  evidencias,
  onChange,
  onEvidencias,
  flash,
  compacto = false,
}: {
  reserva: PagoProveedorState;
  evidencias: Evidencia[];
  onChange: (id: string, patch: Partial<PagoProveedorState>) => void;
  onEvidencias: (bookingId: string, lista: Evidencia[]) => void;
  flash: (m: string) => void;
  compacto?: boolean;
}) {
  const [abierto,   setAbierto]   = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [subiendo,  setSubiendo]  = useState(false);
  const [montoDraft, setMontoDraft] = useState("");
  const [notaDraft,  setNotaDraft]  = useState("");
  const fileRef    = useRef<HTMLInputElement>(null);
  const anclaRef   = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  // El panel se posiciona FIJO respecto a la ventana, no absoluto dentro de la
  // celda: la tabla vive en un contenedor con scroll horizontal y una columna
  // pegada al borde, así que un panel absoluto se recortaba o quedaba debajo de
  // las filas siguientes. Fijo se escapa de todo eso.
  const ANCHO = 260;
  const ALTO_APROX = 330;
  useLayoutEffect(() => {
    if (!abierto || compacto) return;
    const calcular = () => {
      const r = anclaRef.current?.getBoundingClientRect();
      if (!r) return;
      const hayEspacioAbajo = window.innerHeight - r.bottom > ALTO_APROX;
      setPos({
        // Alineado a la derecha del ancla, sin salirse por ningún lado.
        left: Math.max(8, Math.min(r.right - ANCHO, window.innerWidth - ANCHO - 8)),
        top:  hayEspacioAbajo ? r.bottom + 4 : Math.max(8, r.top - ALTO_APROX - 4),
      });
    };
    calcular();
    window.addEventListener("scroll", calcular, true);
    window.addEventListener("resize", calcular);
    return () => {
      window.removeEventListener("scroll", calcular, true);
      window.removeEventListener("resize", calcular);
    };
  }, [abierto, compacto, evidencias.length]);

  // Cerrar con Escape, que es lo que espera cualquiera con un panel abierto.
  useEffect(() => {
    if (!abierto) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setAbierto(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [abierto]);

  const pagado    = reserva.pagoProveedor === true;
  const noPagado  = reserva.pagoProveedor === false;
  const monto     = reserva.pagoProveedorMonto ?? 0;
  const fecha     = fFecha(reserva.pagoProveedorFecha);

  async function patch(body: Record<string, unknown>, okMsg: string) {
    setGuardando(true);
    const r = await fetch(`/api/admin/reservas/${reserva.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    setGuardando(false);
    if (r?.ok) {
      onChange(reserva.id, body as Partial<PagoProveedorState>);
      flash(okMsg);
      return true;
    }
    flash("❌ No se pudo guardar el pago al proveedor");
    return false;
  }

  function marcarPagado() {
    playClick();
    setMontoDraft(monto > 0 ? String(monto) : "");
    setNotaDraft(reserva.pagoProveedorNota || "");
    setAbierto(true);
    // El clic ya deja constancia: se marca pagado con la fecha de hoy. El monto
    // y la evidencia se completan en el panel que se acaba de abrir.
    if (!pagado) {
      patch(
        { pagoProveedor: true, pagoProveedorFecha: new Date().toISOString() },
        "✅ Marcado como pagado al proveedor",
      );
    }
  }

  function marcarNoPagado() {
    playClick();
    setAbierto(false);
    // Se conserva el monto y la evidencia ya capturados: marcar "no pagado"
    // puede ser una corrección de dedo, y borrar el comprobante sería peor.
    patch({ pagoProveedor: false }, "✅ Marcado como pendiente de pagar al proveedor");
  }

  async function guardarDetalle() {
    const limpio = montoDraft.replace(/[^\d.]/g, "");
    const n = limpio === "" ? 0 : Math.round(Number(limpio));
    if (!Number.isFinite(n) || n < 0) { playError(); flash("❌ El monto no es un número válido"); return; }
    const ok = await patch(
      { pagoProveedorMonto: n, pagoProveedorNota: notaDraft.trim() || null },
      "✅ Pago al proveedor actualizado",
    );
    if (ok) setAbierto(false);
  }

  async function subirArchivo(file: File) {
    setSubiendo(true);
    const fd = new FormData();
    fd.append("archivo", file);
    const r = await fetch(`/api/admin/reservas/${reserva.id}/evidencia`, { method: "POST", body: fd }).catch(() => null);
    setSubiendo(false);
    if (fileRef.current) fileRef.current.value = "";
    if (!r?.ok) {
      const d = await r?.json().catch(() => null);
      playError();
      flash(`❌ ${d?.error || "No se pudo subir el archivo"}`);
      return;
    }
    const { evidencia } = await r.json();
    onEvidencias(reserva.id, [evidencia, ...evidencias]);
    playSuccess();
    flash("✅ Evidencia adjuntada");
  }

  async function borrarArchivo(ev: Evidencia) {
    if (!confirm(`¿Quitar "${ev.nombreArchivo}"? No se puede deshacer.`)) return;
    const r = await fetch(`/api/admin/evidencia/${ev.id}`, { method: "DELETE" }).catch(() => null);
    if (r?.ok) {
      onEvidencias(reserva.id, evidencias.filter(e => e.id !== ev.id));
      flash("✅ Evidencia eliminada");
    } else {
      flash("❌ No se pudo eliminar la evidencia");
    }
  }

  const btnBase = "w-7 h-7 grid place-items-center rounded-sm border transition-colors disabled:opacity-40";

  // El panel se define aquí y se monta abajo: en escritorio va por portal a
  // <body> para escapar de la tabla; en móvil se queda dentro de la tarjeta.
  const panel = abierto ? (
    <>
          <div className="fixed inset-0 z-40" onClick={() => setAbierto(false)} />
          <div
            className={`${compacto ? "relative mt-2" : "fixed"} z-50 bg-white border border-[#1B4332]/15 shadow-lg rounded-sm p-3 w-[260px]`}
            style={compacto ? undefined : { top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
          >
            <p className="text-[9px] tracking-[2px] uppercase text-[#1B4332]/40 font-dm mb-2">Pago al proveedor</p>

            <label className="block text-[10px] font-dm text-[#1B4332]/50 mb-1">Monto pagado (MXN)</label>
            <input
              value={montoDraft}
              onChange={e => setMontoDraft(e.target.value)}
              inputMode="numeric"
              placeholder="0"
              className="w-full border border-[#1B4332]/15 rounded-sm px-2 py-1.5 text-sm font-dm text-[#1B4332] focus:outline-none focus:border-[#1B4332] mb-2"
            />

            <label className="block text-[10px] font-dm text-[#1B4332]/50 mb-1">Nota (opcional)</label>
            <input
              value={notaDraft}
              onChange={e => setNotaDraft(e.target.value)}
              placeholder="Lanchero Tamul, transferencia…"
              className="w-full border border-[#1B4332]/15 rounded-sm px-2 py-1.5 text-xs font-dm text-[#1B4332] focus:outline-none focus:border-[#1B4332] mb-3"
            />

            <div className="border-t border-[#1B4332]/10 pt-2 mb-2">
              <p className="text-[9px] tracking-[2px] uppercase text-[#1B4332]/40 font-dm mb-1.5">Evidencia</p>

              {evidencias.length === 0 && (
                <p className="text-[10px] font-dm text-[#1B4332]/30 mb-2">Sin comprobante adjunto</p>
              )}

              <ul className="space-y-1 mb-2">
                {evidencias.map(ev => (
                  <li key={ev.id} className="flex items-center gap-1.5 text-[10px] font-dm">
                    {ev.tipoMime === "application/pdf"
                      ? <FileText className="w-3 h-3 shrink-0 text-red-600/70" />
                      : <ImageIcon className="w-3 h-3 shrink-0 text-[#52B788]" />}
                    <a
                      href={`/api/admin/evidencia/${ev.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`${ev.nombreArchivo} · ${fPeso(ev.tamanoBytes)}`}
                      className="flex-1 truncate text-[#1B4332]/70 hover:text-[#1B4332] hover:underline"
                    >
                      {ev.nombreArchivo}
                    </a>
                    <button type="button" onClick={() => borrarArchivo(ev)} title="Quitar"
                      className="text-[#1B4332]/30 hover:text-red-600 shrink-0">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </li>
                ))}
              </ul>

              <input
                ref={fileRef}
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif"
                onChange={e => { const f = e.target.files?.[0]; if (f) subirArchivo(f); }}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => { playClick(); fileRef.current?.click(); }}
                disabled={subiendo}
                className="flex items-center gap-1.5 w-full justify-center border border-dashed border-[#1B4332]/25 rounded-sm py-1.5 text-[10px] font-dm text-[#1B4332]/60 hover:border-[#1B4332]/50 hover:text-[#1B4332] transition-colors disabled:opacity-50"
              >
                {subiendo
                  ? <><Loader2 className="w-3 h-3 animate-spin" />Subiendo…</>
                  : <><Paperclip className="w-3 h-3" />Adjuntar PDF o captura</>}
              </button>
              <p className="text-[9px] font-dm text-[#1B4332]/30 mt-1 text-center">Máx. 5 MB</p>
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={() => setAbierto(false)}
                className="flex-1 border border-[#1B4332]/15 rounded-sm py-1.5 text-[10px] tracking-[1px] uppercase font-dm text-[#1B4332]/60 hover:bg-[#FAFAF8]">
                Cerrar
              </button>
              <button type="button" onClick={guardarDetalle} disabled={guardando}
                className="flex-1 bg-[#1B4332] text-white rounded-sm py-1.5 text-[10px] tracking-[1px] uppercase font-dm hover:bg-[#2D5A45] disabled:opacity-50">
                {guardando ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
    </>
  ) : null;

  return (
    <div ref={anclaRef} className={compacto ? "" : "relative"}>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={marcarNoPagado}
          disabled={guardando}
          title="Marcar: NO le he pagado al proveedor"
          aria-pressed={noPagado}
          className={`${btnBase} ${noPagado
            ? "bg-red-600 border-red-600 text-white"
            : "bg-white border-[#1B4332]/15 text-[#1B4332]/30 hover:border-red-400 hover:text-red-600"}`}
        >
          <X className="w-3.5 h-3.5" strokeWidth={3} />
        </button>

        <button
          type="button"
          onClick={marcarPagado}
          disabled={guardando}
          title="Marcar: ya le pagué al proveedor"
          aria-pressed={pagado}
          className={`${btnBase} ${pagado
            ? "bg-green-600 border-green-600 text-white"
            : "bg-white border-[#1B4332]/15 text-[#1B4332]/30 hover:border-green-500 hover:text-green-600"}`}
        >
          <Check className="w-3.5 h-3.5" strokeWidth={3} />
        </button>

        {evidencias.length > 0 && (
          <span title={`${evidencias.length} comprobante(s) adjunto(s)`}
            className="flex items-center gap-0.5 text-[#1B4332]/45 text-[10px] font-dm">
            <Paperclip className="w-3 h-3" />{evidencias.length}
          </span>
        )}
        {guardando && <Loader2 className="w-3 h-3 animate-spin text-[#1B4332]/30" />}
      </div>

      {/* Resumen bajo los botones: abre el detalle para editar monto y adjuntos */}
      <button
        type="button"
        onClick={() => {
          playClick();
          setMontoDraft(monto > 0 ? String(monto) : "");
          setNotaDraft(reserva.pagoProveedorNota || "");
          setAbierto(a => !a);
        }}
        title={
          monto > 0
            ? `${fmx(monto)} al proveedor · ${pagado ? `pagado${fecha ? ` el ${fecha}` : ""}` : noPagado ? "marcado como NO pagado" : "capturado pero sin marcar"}${reserva.pagoProveedorNota ? ` · ${reserva.pagoProveedorNota}` : ""}`
            : "Registrar el pago al proveedor"
        }
        className="mt-1 block text-left text-[10px] font-dm text-[#1B4332]/45 hover:text-[#1B4332] transition-colors"
      >
        {/* El monto se muestra SIEMPRE que exista, aunque no se haya marcado la
            palomita: si no, un importe ya capturado quedaba invisible y parecía
            que no se había registrado nada. El estado va por COLOR (verde
            pagado · rojo sin pagar · ámbar sin marcar) para que el texto quepa
            en la columna; el detalle completo está en el tooltip. */}
        {monto > 0
          ? <span className={pagado ? "text-green-700 font-medium" : noPagado ? "text-red-600 font-medium" : "text-amber-600 font-medium"}>
              {fmx(monto)}{pagado && fecha ? ` · ${fecha}` : ""}
            </span>
          : pagado   ? <span className="text-amber-600">Falta el monto</span>
          : noPagado ? <span className="text-red-600">Sin pagar</span>
          : <span>Registrar…</span>}
      </button>

      {compacto
        ? panel
        : montado && panel ? createPortal(panel, document.body) : null}
    </div>
  );
}
