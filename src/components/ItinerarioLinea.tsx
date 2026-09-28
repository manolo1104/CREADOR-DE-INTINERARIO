"use client";

import { useEffect, useRef } from "react";

/**
 * La línea del itinerario que se va llenando hacia abajo conforme el visitante
 * baja por "Tu día, hora por hora".
 *
 * 🔴 Por qué esto es un componente y no solo CSS
 *
 * El efecto está escrito en `globals.css` con `animation-timeline: view()`, que
 * es la forma buena: corre fuera del hilo principal y no pierde cuadros
 * mientras Next carga las fotos del itinerario. Pero **solo lo soportan Chrome
 * y Edge**. En Safari y Firefox la propiedad se ignora, la animación corre una
 * vez al cargar y la línea aparece LLENA desde el principio: el contenido se ve
 * bien, pero no hay efecto. Y tres de cada cuatro visitas de este sitio son
 * móviles, muchas de ellas iPhone.
 *
 * Así que aquí solo se hace lo que el CSS no puede: cuando el navegador NO
 * soporta scroll-driven, se calcula el mismo progreso a mano. Donde sí lo
 * soporta, este componente no toca nada y deja mandar al CSS.
 *
 * Detalles que importan:
 *  · Se escribe `transform` DIRECTO en el elemento, no una variable CSS en el
 *    padre: una variable heredable obliga a recalcular estilos en todos los
 *    hijos, y aquí hay nueve momentos con sus fotos.
 *  · `requestAnimationFrame` para no hacer trabajo por cada evento de scroll.
 *  · Con "reducir movimiento" la línea se deja llena y no se escucha nada.
 */
export function ItinerarioLinea({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const linea = ref.current;
    const lista = linea?.parentElement;
    if (!linea || !lista) return;

    // Donde hay scroll-driven, manda el CSS: ni un listener de más.
    if (typeof CSS !== "undefined" && CSS.supports?.("animation-timeline", "view()")) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      linea.style.transform = "scaleY(1)";
      return;
    }

    // Sin soporte, la regla de CSS deja la animación corrida y la línea llena.
    // Se apaga para tomar el control desde aquí.
    linea.style.animation = "none";

    // Los nueve momentos tienen el mismo problema: su animación sí trae
    // duración, así que sin scroll-driven aparecen los nueve de golpe al
    // cargar. Aquí se revelan uno por uno con IntersectionObserver, que sí
    // existe en todos los navegadores.
    // 🔴 Solo se esconde lo que todavía está por debajo de la pantalla. Un
    // momento que ya se ve al cargar se deja en paz: si se le pusiera opacidad
    // 0 y el observador no llegara a dispararse, ese texto quedaría invisible
    // para siempre. Escondiendo solo lo de abajo, lo peor que puede pasar es
    // que el efecto no corra — nunca que se pierda contenido.
    const momentos = Array.from(lista.querySelectorAll<HTMLElement>(".itinerario-momento")).filter(
      (li) => li.getBoundingClientRect().top > window.innerHeight * 0.9,
    );
    momentos.forEach((li) => {
      li.style.animation = "none";
      li.style.opacity = "0";
      li.style.transform = "translateY(14px)";
      li.style.transition = "opacity 500ms cubic-bezier(0.23, 1, 0.32, 1), transform 500ms cubic-bezier(0.23, 1, 0.32, 1)";
      const punto = li.querySelector<HTMLElement>(".itinerario-punto");
      if (punto) {
        punto.style.animation = "none";
        punto.style.transform = "scale(0.4)";
        punto.style.backgroundColor = "rgb(36 61 32)";
        punto.style.transition = "transform 450ms cubic-bezier(0.23, 1, 0.32, 1), background-color 450ms ease";
      }
    });

    // El texto se revela al entrar por abajo (pronto y seguro).
    const obsTexto = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (!e.isIntersecting) continue;
          const li = e.target as HTMLElement;
          li.style.opacity = "1";
          li.style.transform = "translateY(0)";
          obsTexto.unobserve(li); // una vez revelado, ya no se vigila
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.01 },
    );

    // El punto enciende más tarde, en el 60 % de la ventana, que es donde va
    // la punta del trazo: recortar el 40 % de abajo deja el borde del
    // observador justo en esa altura. Así la línea parece encenderlo al llegar.
    const obsPunto = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (!e.isIntersecting) continue;
          const punto = e.target as HTMLElement;
          punto.style.transform = "scale(1)";
          punto.style.backgroundColor = "rgb(90 158 42)";
          obsPunto.unobserve(punto);
        }
      },
      { rootMargin: "0px 0px -40% 0px", threshold: 0 },
    );

    momentos.forEach((li) => {
      obsTexto.observe(li);
      const punto = li.querySelector<HTMLElement>(".itinerario-punto");
      if (punto) obsPunto.observe(punto);
    });

    let pedido = 0;
    const pintar = () => {
      pedido = 0;
      const r = lista.getBoundingClientRect();
      // La misma referencia que declara el CSS: el trazo llega hasta el 60 % de
      // la altura de la ventana. Dicho de otro modo, la punta se queda quieta
      // ahí y el itinerario sube detrás. Si se midiera contra el recorrido
      // completo de la lista, la punta caería por debajo del borde y no se
      // vería avanzar nada.
      const referencia = window.innerHeight * 0.6;
      const p = Math.min(1, Math.max(0, (referencia - r.top) / r.height));
      linea.style.transform = `scaleY(${p})`;
    };

    const alScrollear = () => {
      if (pedido) return;
      pedido = requestAnimationFrame(pintar);
    };

    pintar();
    window.addEventListener("scroll", alScrollear, { passive: true });
    window.addEventListener("resize", alScrollear, { passive: true });
    return () => {
      if (pedido) cancelAnimationFrame(pedido);
      obsTexto.disconnect();
      obsPunto.disconnect();
      window.removeEventListener("scroll", alScrollear);
      window.removeEventListener("resize", alScrollear);
    };
  }, []);

  return <span ref={ref} aria-hidden="true" className={`itinerario-linea ${className}`} />;
}
