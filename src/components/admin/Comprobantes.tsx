"use client";

import { useRef, useState } from "react";
import { Trash2, FileText, ImageIcon, Loader2, Camera } from "lucide-react";
import { playClick, playSuccess, playError } from "@/lib/admin/sfx";

export interface ArchivoComprobante {
  id: string;
  nombreArchivo: string;
  tipoMime: string;
  tamanoBytes?: number;
}

const fPeso = (b?: number) =>
  b === undefined ? "" : b < 1024 * 1024 ? `${Math.round(b / 1024)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;

/** Lo que acepta el servidor (`src/lib/admin/evidencia.ts`). */
const ACEPTA = "application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,.pdf,.jpg,.jpeg,.png,.webp,.heic,.heif";

const LADO_MAX = 1600;

/**
 * Encoge una foto antes de subirla.
 *
 * 🔴 Una captura de WhatsApp desde un teléfono moderno pesa entre 3 y 8 MB, y
 * el servidor rechaza a partir de 5. Sin esto, la mitad de los comprobantes
 * darían error justo cuando alguien está cobrando delante del cliente.
 *
 * Si el navegador no sabe decodificar el formato (un HEIC de iPhone en Chrome
 * de Android) se devuelve el archivo original y que decida el servidor: es
 * mejor un rechazo con motivo que un archivo corrupto.
 */
async function encoger(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const escala = Math.min(1, LADO_MAX / Math.max(bitmap.width, bitmap.height));
    // Ya es chica y ligera: no se recomprime (recomprimir un JPEG lo empeora).
    if (escala === 1 && file.size <= 1024 * 1024) return file;

    const lienzo = document.createElement("canvas");
    lienzo.width  = Math.round(bitmap.width * escala);
    lienzo.height = Math.round(bitmap.height * escala);
    const ctx = lienzo.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, lienzo.width, lienzo.height);

    const blob: Blob | null = await new Promise(res => lienzo.toBlob(res, "image/jpeg", 0.82));
    if (!blob || blob.size >= file.size) return file;
    const nombre = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], nombre, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

/**
 * Subir, ver y quitar comprobantes de una reserva.
 *
 * Reutiliza tal cual la infraestructura que ya existía para los pagos a
 * proveedor: `POST /api/admin/reservas/[id]/evidencia` valida tipo y tamaño, y
 * `/api/admin/evidencia/[id]` sirve y borra el archivo.
 */
export default function Comprobantes({
  reservaId, archivos, onCambio, flash, etiqueta = "Comprobante",
}: {
  reservaId: string;
  archivos: ArchivoComprobante[];
  onCambio: (lista: ArchivoComprobante[]) => void;
  flash: (m: string) => void;
  etiqueta?: string;
}) {
  const [subiendo, setSubiendo] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function subir(original: File) {
    setSubiendo(true);
    const file = await encoger(original);
    const fd = new FormData();
    fd.append("archivo", file);
    const r = await fetch(`/api/admin/reservas/${reservaId}/evidencia`, { method: "POST", body: fd }).catch(() => null);
    setSubiendo(false);
    if (fileRef.current) fileRef.current.value = "";
    if (!r?.ok) {
      const d = await r?.json().catch(() => null);
      playError();
      flash(`❌ ${d?.error || "No se pudo subir el archivo"}`);
      return;
    }
    const { evidencia } = await r.json();
    onCambio([evidencia, ...archivos]);
    playSuccess();
  }

  async function borrar(a: ArchivoComprobante) {
    if (!confirm(`¿Quitar "${a.nombreArchivo}"? No se puede deshacer.`)) return;
    const r = await fetch(`/api/admin/evidencia/${a.id}`, { method: "DELETE" }).catch(() => null);
    if (r?.ok) onCambio(archivos.filter(x => x.id !== a.id));
    else flash("❌ No se pudo quitar el archivo");
  }

  return (
    <div>
      {archivos.length > 0 && (
        <ul className="space-y-1 mb-2">
          {archivos.map(a => (
            <li key={a.id} className="flex items-center gap-2 text-xs font-dm">
              {a.tipoMime === "application/pdf"
                ? <FileText className="w-3.5 h-3.5 shrink-0 text-red-600/70" />
                : <ImageIcon className="w-3.5 h-3.5 shrink-0 text-[#52B788]" />}
              <a
                href={`/api/admin/evidencia/${a.id}`}
                target="_blank"
                rel="noopener noreferrer"
                title={`${a.nombreArchivo} ${fPeso(a.tamanoBytes)}`}
                className="flex-1 truncate text-[#1B4332]/75 hover:text-[#1B4332] hover:underline"
              >
                {a.nombreArchivo}
              </a>
              <button
                type="button" onClick={() => borrar(a)} title="Quitar"
                className="w-11 h-11 -my-3 grid place-items-center text-[#1B4332]/30 hover:text-red-600 shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={fileRef} type="file" accept={ACEPTA} capture={undefined}
        onChange={e => { const f = e.target.files?.[0]; if (f) subir(f); }}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => { playClick(); fileRef.current?.click(); }}
        disabled={subiendo}
        className="panel-foco flex items-center justify-center gap-2 w-full min-h-[44px] border border-dashed border-[#1B4332]/25 rounded-sm text-xs font-dm text-[#1B4332]/65 hover:border-[#1B4332]/50 hover:text-[#1B4332] transition-colors disabled:opacity-50"
      >
        {subiendo
          ? <><Loader2 className="w-4 h-4 animate-spin" />Subiendo…</>
          : <><Camera className="w-4 h-4" />{archivos.length ? "Añadir otro" : `Subir ${etiqueta.toLowerCase()}`}</>}
      </button>
      <p className="text-[10px] font-dm text-[#1B4332]/35 mt-1">
        Foto o PDF, hasta 5 MB. Las fotos se encogen solas.
      </p>
    </div>
  );
}
