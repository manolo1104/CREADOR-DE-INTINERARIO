"use client";

import { Fragment } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * El aviso de lo que acaba de pasar en el panel (20 nov 2026), compartido por
 * Cotizaciones y la ficha del lead: verde si salió bien, ámbar si hay que
 * revisar algo y rojo si no se pudo. Se cierra con su botón de 44 px (cabe el
 * dedo en el celular).
 *
 * Sin `tono`, lo dice el principio del texto (✅ / ⚠️ / ❌), como siempre en
 * Cotizaciones.
 */
export type TonoAviso = "bien" | "revisar" | "error";

const TONOS: Record<TonoAviso, string> = {
  bien:    "bg-green-50 border-green-200 text-green-800",
  revisar: "bg-amber-50 border-amber-300 text-amber-900",
  error:   "bg-red-50 border-red-200 text-red-700",
};

function tonoDelTexto(texto: string): TonoAviso {
  return texto.startsWith("✅") ? "bien" : texto.startsWith("⚠️") ? "revisar" : "error";
}

/** Los folios (HP-M-…, COT-…) no se parten en su guion: «HP-M-» arriba y el resto abajo no se lee. */
function conFoliosEnteros(texto: string) {
  return texto.split(/\b((?:HP|COT)(?:-[A-Z0-9]+)+)/g).map((parte, i) =>
    i % 2 ? <span key={i} className="whitespace-nowrap">{parte}</span> : <Fragment key={i}>{parte}</Fragment>,
  );
}

export function Aviso({ texto, onCerrar, tono, className = "" }: { texto: string; onCerrar: () => void; tono?: TonoAviso; className?: string }) {
  const t = tono ?? tonoDelTexto(texto);
  return (
    <div role={t === "error" ? "alert" : "status"} className={`flex items-start gap-1 rounded-md border pl-4 font-dm text-sm ${TONOS[t]} ${className}`}>
      <p className="min-w-0 flex-1 py-3 break-words">{conFoliosEnteros(texto)}</p>
      <button type="button" onClick={onCerrar} aria-label="Cerrar aviso" title="Cerrar"
        className="panel-foco inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md opacity-75 transition-opacity hover:opacity-100">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * El aviso flotando abajo, a la vista, aunque la página esté bajada. Va en el
 * `body`, como CobroModal: dentro de `main` (relative z-10) ningún z-index lo
 * subía sobre los avisos de seguimientos (z-70, hermanos de `main`), que en el
 * celular lo tapaban. Solo se pinta después de que algo pasó (nunca al cargar),
 * así que el servidor y el navegador dibujan lo mismo.
 */
export function AvisoFlotante({ texto, onCerrar, tono }: { texto: string; onCerrar: () => void; tono?: TonoAviso }) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-x-4 bottom-4 z-[75] mx-auto max-w-md md:bottom-6 md:left-[248px]">
      <Aviso texto={texto} onCerrar={onCerrar} tono={tono} className="shadow-lg motion-safe:animate-slide-up" />
    </div>,
    document.body,
  );
}
