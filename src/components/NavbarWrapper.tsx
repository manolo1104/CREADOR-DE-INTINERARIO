"use client";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import Navbar from "@/components/nav/Navbar";
import { BarraInferiorMovil } from "@/components/BarraInferiorMovil";
import { SiteFooter } from "@/components/SiteFooter";
import { CookieBanner } from "@/components/CookieBanner";
import { PopupXantolo } from "@/components/PopupXantolo";
import { PresenceBeacon } from "@/components/PresenceBeacon";
import { enPantallaDePago } from "@/lib/barrasFijas";

function ScrollProgressBar() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // JS fallback for browsers without CSS scroll-driven animations (Safari, Firefox)
    if (CSS.supports("animation-timeline", "scroll()")) return;

    const bar = barRef.current;
    if (!bar) return;

    const update = () => {
      const scrolled = document.documentElement.scrollTop;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = `scaleX(${total > 0 ? scrolled / total : 0})`;
    };

    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => window.removeEventListener("scroll", update);
  }, []);

  return <div ref={barRef} className="scroll-progress-bar" aria-hidden="true" />;
}

export function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  // Durante el pago no se pone pie de página: cualquier enlace ahí es una
  // salida del embudo justo en el paso que menos conviene interrumpir.
  // `/reservar/carrito` entra aquí: es una pantalla de pago igual que las otras
  // dos, pero como cuelga de `/reservar` se quedaba fuera del patrón y pintaba
  // el pie completo —decenas de enlaces de salida— justo debajo del botón de
  // pagar. `/reservar` a secas es el catálogo y sí lleva pie.
  // La regla vive en `enPantallaDePago` (`lib/barrasFijas.ts`), la misma que
  // usa la barra del carrito: aquí estaba copiada sin el `/en/` y el checkout
  // en inglés pintaba el pie completo debajo del botón de pagar.
  const isCheckout = enPantallaDePago(pathname);
  // El funnel del curso (/curso) es un embudo autocontenido: sin navbar del
  // sitio, sin pie con decenas de ligas, sin botón flotante de reservar tours.
  // Cada elemento de ésos es una salida del embudo. Trae su propia barra,
  // su propio pie y su propio botón de WhatsApp.
  const isCurso = pathname.startsWith("/curso");
  if (isCurso) {
    return (
      <>
        {children}
        <CookieBanner />
      </>
    );
  }
  return (
    <>
      {!isAdmin && <ScrollProgressBar />}
      {!isAdmin && <PresenceBeacon />}
      {!isAdmin && <Navbar />}
      {children}
      {!isAdmin && !isCheckout && <SiteFooter />}
      {/* Justo después del pie: además de la barra fija trae el hueco que
          evita que tape el final de la página. En el celular sustituye a los
          dos de abajo, que quedaron solo para escritorio. */}
      {/* 🔴 Era UNA barra para celular más dos componentes solo de escritorio:
          `FloatingReservarButton` (la burbuja de WhatsApp y la píldora «Reservar
          tour», las dos a z-50) y `carrito/CarritoBar` (z-45). Tres cosas
          flotando a la vez, con las píldoras subiendo a `bottom-[158px]` cuando
          había algo en el carrito. Desde el 7 oct 2026 es una sola barra en
          todos los tamaños, con precio + botón + ícono de WhatsApp. */}
      {!isAdmin && <BarraInferiorMovil />}
      {!isAdmin && <CookieBanner />}
      {!isAdmin && <PopupXantolo />}
    </>
  );
}
