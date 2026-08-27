"use client";

import { useState } from "react";

/**
 * La baja se confirma con un clic, no automáticamente al abrir la página.
 *
 * Varios clientes de correo y antivirus PRE-CARGAN los enlaces para analizarlos:
 * si la baja ocurriera con solo abrir la URL, daría de baja a gente que nunca
 * pulsó nada. Por eso la página pide un clic — sigue siendo "de un clic" desde
 * el punto de vista de la persona.
 */
export function BajaForm({ token, email }: { token: string; email: string }) {
  const [estado, setEstado] = useState<"idle" | "enviando" | "listo" | "error">("idle");

  async function darDeBaja() {
    setEstado("enviando");
    try {
      const r = await fetch("/api/baja", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ t: token }),
      });
      setEstado(r.ok ? "listo" : "error");
    } catch {
      setEstado("error");
    }
  }

  if (estado === "listo") {
    return (
      <>
        <h1 className="font-cormorant font-light text-crema text-4xl mb-4">Listo, te sacamos de la lista</h1>
        <p className="font-dm text-sm text-crema/55 leading-relaxed mb-8">
          No volverás a recibir correos nuestros en <strong className="text-crema">{email}</strong>.
          Si tienes una reserva o una cotización en curso, esos correos sí te siguen llegando —
          son de tu compra, no publicidad.
        </p>
        <a href="/" className="font-dm text-[11px] tracking-[2px] uppercase text-dorado hover:text-lima transition-colors">
          Volver al inicio →
        </a>
      </>
    );
  }

  return (
    <>
      <h1 className="font-cormorant font-light text-crema text-4xl mb-4">
        ¿Dejamos de escribirte?
      </h1>
      <p className="font-dm text-sm text-crema/55 leading-relaxed mb-8">
        Vamos a dar de baja <strong className="text-crema">{email}</strong> de todos
        nuestros correos: itinerarios, consejos de temporada y avisos de artículos nuevos.
      </p>

      <button
        onClick={darDeBaja}
        disabled={estado === "enviando"}
        className="w-full bg-dorado hover:bg-lima text-negro px-8 py-4 text-[11px] tracking-[2px] uppercase font-dm font-medium transition-colors disabled:opacity-50"
      >
        {estado === "enviando" ? "Un momento…" : "Sí, darme de baja"}
      </button>

      {estado === "error" && (
        <p className="font-dm text-[12px] text-terracota mt-4">
          No se pudo procesar. Intenta de nuevo o respóndenos el correo con la palabra «baja».
        </p>
      )}

      <p className="font-dm text-[12px] text-crema/35 mt-8 leading-relaxed">
        ¿Solo querías menos correos? Respóndenos y te dejamos únicamente el resumen mensual.
      </p>
    </>
  );
}
