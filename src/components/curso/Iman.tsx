"use client";

import { useEffect } from "react";

/**
 * El botón principal se inclina hacia el cursor.
 *
 * Es decoración honesta: no informa nada, pero hace que el botón se sienta
 * vivo. Por eso está sólo en escritorio con ratón de verdad: en el celular el
 * efecto no existe y no vale la pena cargar nada por él.
 *
 * Sin librerías. Motion costaría 42 kB por esto, y aquí basta con escribir la
 * transformación directo sobre el elemento dentro de un requestAnimationFrame.
 *
 * Dos cosas que importan:
 * - Se escribe `transform` sobre el elemento, NO una variable en un padre:
 *   cambiar una variable heredable obliga a recalcular el estilo de todos sus
 *   hijos en cada cuadro.
 * - Nunca pasa por el estado de React: eso volvería a renderizar el árbol en
 *   cada movimiento del ratón y se cae a pedazos.
 */
export function Iman() {
  useEffect(() => {
    const fino = window.matchMedia("(hover: hover) and (pointer: fine)");
    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fino.matches || quieto.matches) return;

    const botones = Array.from(document.querySelectorAll<HTMLElement>(".iman"));
    if (!botones.length) return;

    const RADIO = 90;   // a partir de aquí el botón empieza a notar el cursor
    const FUERZA = 0.28; // qué tanto se deja llevar

    let raf = 0;
    let x = 0;
    let y = 0;

    const mover = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!raf) raf = requestAnimationFrame(cuadro);
    };

    const cuadro = () => {
      raf = 0;
      for (const b of botones) {
        const r = b.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.hypot(dx, dy);

        if (dist < r.width / 2 + RADIO) {
          b.dataset.cerca = "";
          b.style.transform = `translate(${dx * FUERZA}px, ${dy * FUERZA}px)`;
        } else if (b.dataset.cerca !== undefined) {
          delete b.dataset.cerca;   // al soltarlo vuelve con la curva larga
          b.style.transform = "";
        }
      }
    };

    window.addEventListener("pointermove", mover, { passive: true });
    return () => {
      window.removeEventListener("pointermove", mover);
      cancelAnimationFrame(raf);
      for (const b of botones) {
        delete b.dataset.cerca;
        b.style.transform = "";
      }
    };
  }, []);

  return null;
}
