"use client";

import { useRef, useEffect } from "react";

/**
 * Inclinación 3D al pasar el cursor, sin librería de animación.
 *
 * El efecto ya existía en `TourCard`, escrito a mano con variables CSS después
 * de sacarlo de framer-motion para no cargar el bundle del home y de /tours
 * (ver CLAUDE.md). Esto es ese mismo código, extraído para que el catálogo de
 * /reservar lo use en vez de tener una tercera copia.
 *
 * Dos cosas que suelen faltar en las versiones de librería y que aquí sí están:
 *  - Se apaga con `prefers-reduced-motion`. A quien le marea el movimiento, no
 *    se le mueve nada.
 *  - Se apaga al primer toque. En un móvil, el "hover" se queda pegado después
 *    de tocar y la tarjeta se queda torcida.
 *
 * `glow` añade un brillo suave que sigue al cursor. Es la idea buena del
 * componente que trajo Manolo, pero con un resplandor cálido en vez del círculo
 * blanco de 800 px en `mix-blend-mode: difference`, que sobre el fondo negro del
 * sitio invierte los colores y se ve como un error.
 */
export function Tilt({
  children,
  className,
  grados = 6,
  glow = false,
  animationDelay,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  /** Inclinación máxima en grados. */
  grados?: number;
  glow?: boolean;
  /** Retraso de la animación de entrada, para el efecto escalonado. */
  animationDelay?: string;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "style">) {
  const ref        = useRef<HTMLDivElement>(null);
  const esTactil   = useRef(false);
  const sinMovimiento = useRef(false);

  useEffect(() => {
    sinMovimiento.current =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (esTactil.current || sinMovimiento.current) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width  - 0.5;
    const y = (e.clientY - rect.top)  / rect.height - 0.5;
    el.style.setProperty("--rx", `${-y * grados}deg`);
    el.style.setProperty("--ry", `${x * grados}deg`);
    if (glow) {
      el.style.setProperty("--gx", `${(x + 0.5) * 100}%`);
      el.style.setProperty("--gy", `${(y + 0.5) * 100}%`);
      el.style.setProperty("--go", "1");
    }
  }

  function onMouseLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    if (glow) el.style.setProperty("--go", "0");
  }

  return (
    <div style={{ perspective: "1000px" }} className="h-full">
      <div
        ref={ref}
        className={className}
        style={{
          transform:  "rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))",
          transition: "transform 0.3s cubic-bezier(0.23,1,0.32,1), border-color 0.3s",
          willChange: "transform",
          animationDelay,
        }}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onTouchStart={() => { esTactil.current = true; }}
        {...props}
      >
        {glow && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-20 transition-opacity duration-300"
            style={{
              opacity: "var(--go,0)",
              background:
                "radial-gradient(380px circle at var(--gx,50%) var(--gy,50%), rgba(212,175,90,0.13), transparent 65%)",
            }}
          />
        )}
        {children}
      </div>
    </div>
  );
}
