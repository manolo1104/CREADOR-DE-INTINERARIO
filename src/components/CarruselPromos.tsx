"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PROMOS_PAQUETES } from "@/lib/promosPaquetes";

/** Cada cartel se queda 5 segundos antes de pasar al siguiente. */
const CADA_MS = 5000;

/**
 * Los carteles de los paquetes, rotando solos en el inicio.
 *
 * El cartel ya trae dentro el nombre, el precio y lo que incluye, así que aquí
 * no se le pinta texto encima: sería repetirlo y taparlo. La pieza entera es
 * un enlace a la ficha del paquete.
 *
 * Tres cosas que no se ven pero importan:
 * · **Se detiene al pasar el ratón o al llegar con el teclado**, para que nadie
 *   pierda el cartel que estaba leyendo a mitad de la lectura.
 * · **Con "reducir movimiento" activado no rota**: se queda en el primero y se
 *   cambia con los puntos.
 * · **Todas las imágenes se montan a la vez** y sólo cambia la opacidad, así el
 *   cambio no parpadea esperando a que cargue la siguiente.
 *
 * 🔴 Montarlas no basta para que se DESCARGUEN. Las que no se ven están en
 * `opacity: 0`, y el navegador no gasta datos en bajar una imagen invisible
 * aunque esté dentro de la pantalla: se quedan en `loading="lazy"` sin pedirse
 * nunca. El carrusel rotaba a un cartel que todavía no existía y el hueco se
 * quedaba en negro — el de la Odisea, por ser el último, casi siempre.
 *
 * Por eso se lleva la cuenta de cuáles ya hacen falta: el primero (con
 * `priority`, que además es el LCP de la página) y **el siguiente**, que se pide
 * en cuanto se monta el actual. Así siempre hay uno listo con cinco segundos de
 * adelanto y no se bajan los cuatro carteles de golpe al abrir el inicio.
 */
export function CarruselPromos({
  cargaDiferida = false,
}: {
  /**
   * Para cuando el carrusel vive lejos de la primera pantalla (el inicio, 7 oct
   * 2026): el primer cartel ya no lleva `priority` y nada se pide hasta que el
   * carrusel está cerca de verse. Con `priority` y el segundo en `eager`, React
   * precargaba los dos en el <head> y le quitaban ancho de banda al póster del
   * hero, que es el LCP del inicio. Sin la prop se comporta como siempre.
   */
  cargaDiferida?: boolean;
} = {}) {
  const promos = PROMOS_PAQUETES;
  const [i, setI] = useState(0);
  const [detenido, setDetenido] = useState(false);
  /**
   * ¿El carrusel ya está cerca de la pantalla? Sin `cargaDiferida` lo está
   * desde el principio (el comportamiento de siempre). Con ella, hasta que el
   * observador de abajo lo vea venir no se pide ni el segundo cartel ni rota.
   */
  const [cerca, setCerca] = useState(!cargaDiferida);
  const raiz = useRef<HTMLDivElement>(null);
  /** Índices que ya deben descargarse: el actual, los ya vistos y el siguiente. */
  const [pedidas, setPedidas] = useState<number[]>(() =>
    // Con carga diferida el segundo no nace pedido: en `eager` desde el
    // servidor, React lo precargaba aunque el carrusel quedara pantallas abajo.
    promos.length > 1 && !cargaDiferida ? [0, 1] : [0],
  );

  useEffect(() => {
    if (cerca) return;
    const el = raiz.current;
    if (!el) return;
    // 600 px de margen: el siguiente cartel llega con tiempo de sobra antes de
    // que la persona baje hasta aquí.
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        setCerca(true);
        io.disconnect();
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [cerca]);
  /**
   * Quién pidió el cambio. Es lo que decide cuánto tarda:
   * cuando lo pide una persona, el cartel cambia en 200 ms —esperar medio
   * segundo después de pulsar se siente lento—; cuando cambia solo, se toma
   * 600 ms y se ve como una transición y no como un parpadeo.
   */
  const [aMano, setAMano] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Lejos de la pantalla no rota: rotaría hacia carteles que aún no se piden.
    if (promos.length < 2 || detenido || !cerca) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const avanzar = () => {
      // Con la pestaña en segundo plano no se gasta un turno: quien vuelve
      // encuentra el cartel donde lo dejó y no tres más adelante.
      if (document.visibilityState !== "visible") return;
      setAMano(false);
      setI((n) => (n + 1) % promos.length);
    };
    timer.current = setInterval(avanzar, CADA_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [promos.length, detenido, cerca]);

  // Cada vez que se muestra uno, se pide el siguiente. Un efecto y no un
  // `setPedidas` dentro del temporizador, para que valga igual cuando el cambio
  // lo hace una persona con las flechas o con los puntos.
  useEffect(() => {
    if (!cerca) return;
    const siguiente = (i + 1) % promos.length;
    setPedidas((ps) => {
      if (ps.includes(i) && ps.includes(siguiente)) return ps;
      // Sin `Set`: el target de TypeScript del proyecto no baja su iterador.
      const nuevas = ps.slice();
      for (const n of [i, siguiente]) if (!nuevas.includes(n)) nuevas.push(n);
      return nuevas;
    });
  }, [i, promos.length, cerca]);

  if (promos.length === 0) return null;

  const activo = promos[i];
  const ir = (n: number) => {
    setAMano(true);
    setI((n + promos.length) % promos.length);
  };
  const botonCls =
    "flex h-10 w-10 items-center justify-center rounded-full border border-crema/25 text-crema/80 " +
    "transition-[background-color,border-color,transform] duration-200 ease-out " +
    "[@media(hover:hover)]:hover:border-crema/60 [@media(hover:hover)]:hover:bg-crema/10 " +
    "[@media(hover:hover)]:hover:text-crema active:scale-[0.92]";

  return (
    <div
      ref={raiz}
      className="mx-auto w-full max-w-none sm:max-w-[440px]"
      onMouseEnter={() => setDetenido(true)}
      onMouseLeave={() => setDetenido(false)}
      onFocusCapture={() => setDetenido(true)}
      onBlurCapture={() => setDetenido(false)}
    >
      <Link
        href={`/paquetes/${activo.slug}`}
        aria-label={activo.alt}
        className="group block overflow-hidden rounded-2xl border border-crema/15 bg-negro shadow-[0_24px_64px_rgba(0,0,0,.45)] transition-[transform,box-shadow,border-color] duration-300 ease-out [@media(hover:hover)]:hover:-translate-y-1.5 [@media(hover:hover)]:hover:border-crema/30 [@media(hover:hover)]:hover:shadow-[0_34px_80px_rgba(0,0,0,.55)] focus-visible:-translate-y-1.5 active:scale-[0.995]"
      >
        {/* La caja guarda la proporción del cartel (2:3) para que la sección no
            dé un salto mientras carga ni al cambiar de imagen. */}
        <div className="relative aspect-[1080/1560] w-full">
          {promos.map((promo, idx) => (
            <Image
              key={promo.imagen}
              src={promo.imagen}
              alt={idx === i ? promo.alt : ""}
              aria-hidden={idx !== i}
              fill
              sizes="(max-width: 640px) 100vw, 440px"
              className="object-cover"
              style={{
                opacity: idx === i ? 1 : 0,
                transitionProperty: "opacity",
                transitionDuration: aMano ? "200ms" : "600ms",
                transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
              }}
              priority={idx === 0 && !cargaDiferida}
              // Sin esto se quedan en "lazy" y no se descargan nunca: el
              // navegador no baja una imagen que está en opacidad 0. El
              // primero, con carga diferida, sí puede ir en "lazy": está a la
              // vista (opacidad 1) y baja solo al acercarse.
              loading={idx === 0 ? (cargaDiferida ? "lazy" : undefined) : pedidas.includes(idx) ? "eager" : "lazy"}
            />
          ))}
        </div>
      </Link>

      {promos.length > 1 && (
        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => ir(i - 1)}
            aria-label="Ver el cartel anterior"
            className={botonCls}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>

          <div className="flex items-center gap-2">
            {promos.map((promo, idx) => (
              <button
                key={promo.imagen}
                type="button"
                onClick={() => setI(idx)}
                aria-label={`Ver el cartel ${idx + 1} de ${promos.length}`}
                aria-current={idx === i}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === i ? "w-6 bg-lima" : "w-2 bg-crema/25 hover:bg-crema/50"
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => ir(i + 1)}
            aria-label="Ver el cartel siguiente"
            className={botonCls}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
