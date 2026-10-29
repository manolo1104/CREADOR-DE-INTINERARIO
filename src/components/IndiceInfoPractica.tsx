"use client";

import { useEffect, useRef, useState } from "react";

/**
 * El índice de /info-práctica, pegado bajo la barra mientras se lee.
 *
 * 🔴 Por qué existe: la página son diez secciones y más de dos mil palabras
 * —cómo llegar, cuándo viajar, dónde dormir, presupuesto, qué llevar…—. Los
 * enlaces vivían SOLO dentro del hero, así que a partir de la segunda pantalla
 * la única forma de ir de "Presupuesto" a "Qué llevar" era rodar hacia arriba
 * hasta el principio. Nadie lo hace: se va a Google y busca otra página.
 *
 * Marca cuál se está leyendo. En una página de consulta eso no es adorno: dice
 * dónde estás parado en un texto largo, que es la pregunta que uno se hace al
 * volver a la pestaña después de un rato.
 *
 * Mismo patrón visual que el subnav de /tours, a propósito: es la misma idea y
 * debe verse igual en todo el sitio.
 */
export function IndiceInfoPractica({
  secciones,
  etiqueta,
}: {
  secciones: { href: string; label: string }[];
  etiqueta: string;
}) {
  const [activa, setActiva] = useState<string>("");
  const pista = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const ids = secciones.map((s) => s.href.replace("#", ""));
    const nodos = ids
      .map((id) => document.getElementById(id))
      .filter((n): n is HTMLElement => !!n);
    if (!nodos.length) return;

    /**
     * Gana la última sección que ya empezó por encima de la línea de lectura
     * (la barra más el índice). Es una cuenta de diez rectángulos.
     *
     * 🔴 Aquí NO sirve un IntersectionObserver, aunque sea lo que uno usaría:
     * sólo avisa cuando algo CRUZA un umbral. Al pulsar un enlace del índice la
     * página salta varias secciones, los cruces pasan a mitad del viaje y
     * cuando se detiene ya nada vuelve a avisar: la marca se quedaba clavada en
     * una sección intermedia. Se probó, y se cambió por esto.
     *
     * El coste está acotado: se mide una vez por cuadro como mucho, y sólo se
     * vuelve a pintar si la sección CAMBIÓ.
     */
    const LINEA = 140;
    let pedido = 0;
    let ultima = "";
    const recalcular = () => {
      pedido = 0;
      let actual = nodos[0].id;
      for (const nodo of nodos) {
        if (nodo.getBoundingClientRect().top <= LINEA) actual = nodo.id;
      }
      if (actual !== ultima) {
        ultima = actual;
        setActiva(actual);
      }
    };
    const alMover = () => {
      if (pedido) return;
      pedido = requestAnimationFrame(recalcular);
    };

    recalcular();
    window.addEventListener("scroll", alMover, { passive: true });
    window.addEventListener("resize", alMover);
    return () => {
      if (pedido) cancelAnimationFrame(pedido);
      window.removeEventListener("scroll", alMover);
      window.removeEventListener("resize", alMover);
    };
  }, [secciones]);

  // En el teléfono el índice se desliza: la sección activa se trae a la vista
  // sola, o el usuario no ve nunca dónde está.
  //
  // 🔴 Se desplaza SOLO la pista, en horizontal (29 oct 2026). Antes era
  // `chip.scrollIntoView(...)`, y en un hijo de un `position: sticky` el
  // navegador además mueve la PÁGINA hasta donde el índice viviría en el
  // flujo, con el `scroll-behavior: smooth` de globals.css: cada cambio de
  // sección activa frenaba el scroll del lector a mitad de camino.
  useEffect(() => {
    const pistaEl = pista.current;
    if (!activa || !pistaEl) return;
    const chip = pistaEl.querySelector<HTMLElement>(`[data-id="${activa}"]`);
    if (!chip || pistaEl.scrollWidth <= pistaEl.clientWidth) return;
    const suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const left = chip.offsetLeft - (pistaEl.clientWidth - chip.offsetWidth) / 2;
    pistaEl.scrollTo({ left: Math.max(0, left), behavior: suave ? "smooth" : "auto" });
  }, [activa]);

  return (
    <nav
      aria-label={etiqueta}
      className="sticky sticky-subnav z-40 border-b border-negro/10 bg-crema/95 px-6 backdrop-blur-md"
      style={{ top: "var(--navbar-offset, 64px)" }}
    >
      <ul
        ref={pista}
        className="scrollbar-none mx-auto flex min-w-max items-center justify-start gap-2 overflow-x-auto py-3 sm:justify-center"
      >
        {secciones.map((s) => {
          const id = s.href.replace("#", "");
          const esActiva = id === activa;
          return (
            <li key={s.href}>
              <a
                href={s.href}
                data-id={id}
                aria-current={esActiva ? "true" : undefined}
                className={`inline-flex min-h-[40px] items-center whitespace-nowrap rounded-full border px-4 font-dm text-[13px] font-medium transition-[color,background-color,border-color,transform] duration-200 ease-out active:scale-[0.97] ${
                  esActiva
                    ? "border-verde-profundo bg-verde-profundo text-crema"
                    : "border-negro/15 bg-white text-negro/70 [@media(hover:hover)]:hover:border-verde-selva [@media(hover:hover)]:hover:text-verde-profundo"
                }`}
              >
                {s.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
