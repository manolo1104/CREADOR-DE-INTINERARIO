"use client";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import Navbar from "@/components/nav/Navbar";
import { FloatingReservarButton } from "@/components/FloatingReservarButton";
import { CarritoBar } from "@/components/carrito/CarritoBar";
import { SiteFooter } from "@/components/SiteFooter";
import { CookieBanner } from "@/components/CookieBanner";
import { PresenceBeacon } from "@/components/PresenceBeacon";

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
  const isCheckout = /^\/reservar-(tour|paquete)\/|^\/reservar\/carrito/.test(pathname);
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
      {!isAdmin && <FloatingReservarButton />}
      {!isAdmin && <CarritoBar />}
      {!isAdmin && <CookieBanner />}
    </>
  );
}
