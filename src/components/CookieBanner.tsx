"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("hp_cookie_consent");
    if (!consent) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem("hp_cookie_consent", "accepted");
    setVisible(false);
  }

  function reject() {
    localStorage.setItem("hp_cookie_consent", "rejected");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-title"
      className="fixed bottom-0 left-0 right-0 z-[60] bg-verde-profundo border-t border-verde-selva/30 px-4 py-4 md:py-5 shadow-2xl"
    >
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1">
          <p id="cookie-title" className="text-crema font-dm text-sm font-medium mb-1">
            Usamos cookies
          </p>
          <p className="text-crema/60 font-dm text-xs leading-relaxed">
            Este sitio utiliza cookies propias para mejorar tu experiencia de navegación y analizar el tráfico.
            Consulta nuestro{" "}
            <Link href="/aviso-de-privacidad" className="text-lima underline hover:text-verde-vivo transition-colors">
              Aviso de Privacidad
            </Link>{" "}
            para más información.
          </p>
        </div>
        <div className="flex gap-3 flex-shrink-0">
          <button
            onClick={reject}
            className="px-5 py-2.5 text-[11px] tracking-[1.5px] uppercase font-dm text-crema/60 border border-crema/20 hover:border-crema/40 hover:text-crema transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-lima"
          >
            Rechazar
          </button>
          <button
            onClick={accept}
            className="px-5 py-2.5 text-[11px] tracking-[1.5px] uppercase font-dm bg-verde-selva text-crema hover:bg-verde-vivo transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-lima"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
