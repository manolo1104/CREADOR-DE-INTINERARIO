"use client";

import { useRef } from "react";

interface Props {
  children: React.ReactNode;
  className?: string;
}

// Efecto magnético sin framer-motion: movemos el hijo con transform + transición CSS
// (la transición da el "settle" tipo resorte al volver al centro).
export function MagneticButton({ children, className }: Props) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    const el = outer.current;
    const node = inner.current;
    if (!el || !node) return;
    if (typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) * 0.32;
    const dy = (e.clientY - cy) * 0.32;
    node.style.transform = `translate(${dx}px, ${dy}px)`;
  };

  const handleMouseLeave = () => {
    if (inner.current) inner.current.style.transform = "translate(0px, 0px)";
  };

  return (
    <div ref={outer} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} className={className}>
      <div
        ref={inner}
        style={{ transition: "transform 0.18s cubic-bezier(0.34,1.56,0.64,1)", willChange: "transform" }}
      >
        {children}
      </div>
    </div>
  );
}
