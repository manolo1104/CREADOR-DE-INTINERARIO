"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useLocale } from "@/lib/i18n/useLocale";
import { getDict } from "@/lib/i18n/messages";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();
  // El funnel del curso (/curso) tiene piel propia: negra y azul. Un aviso
  // verde encima se ve como si viniera de otro sitio, así que aquí el banner
  // se viste del embudo. Es lo único que /curso comparte con el resto.
  const enCurso = pathname?.startsWith("/curso") ?? false;
  const { locale } = useLocale();
  const t = getDict(locale).cookies;

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
      className={`fixed bottom-0 left-0 right-0 z-[60] border-t px-4 py-4 md:py-5 shadow-2xl ${enCurso ? "bg-tinta-2 border-linea-2" : "bg-verde-profundo border-verde-selva/30"}`}
    >
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1">
          <p id="cookie-title" className={`font-dm text-sm font-medium mb-1 ${enCurso ? "text-hielo" : "text-crema"}`}>
            {t.titulo}
          </p>
          <p className={`font-dm text-xs leading-relaxed ${enCurso ? "text-hielo/60" : "text-crema/60"}`}>
            {t.texto}
            <Link href="/aviso-de-privacidad" className="text-lima underline hover:text-verde-vivo transition-colors">
              {t.avisoPrivacidad}
            </Link>
            {t.textoCola}
          </p>
        </div>
        <div className="flex gap-3 flex-shrink-0">
          <button
            onClick={reject}
            className={`px-5 py-2.5 text-[11px] tracking-[1.5px] uppercase font-dm border transition-all focus:outline-none focus-visible:ring-2 ${enCurso ? "text-hielo/60 border-linea-2 hover:border-azul hover:text-hielo focus-visible:ring-azul" : "text-crema/60 border-crema/20 hover:border-crema/40 hover:text-crema focus-visible:ring-lima"}`}
          >
            {t.rechazar}
          </button>
          <button
            onClick={accept}
            className={`px-5 py-2.5 text-[11px] tracking-[1.5px] uppercase font-dm transition-colors focus:outline-none focus-visible:ring-2 ${enCurso ? "bg-azul text-tinta hover:bg-azul-vivo focus-visible:ring-azul" : "bg-verde-selva text-crema hover:bg-verde-vivo focus-visible:ring-lima"}`}
          >
            {t.aceptar}
          </button>
        </div>
      </div>
    </div>
  );
}
