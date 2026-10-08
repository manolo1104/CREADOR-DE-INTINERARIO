"use client";
import { useEffect, useState, type ReactNode } from "react";

/**
 * El temporizador de la banda de temporada del inicio (`BandaTemporada`):
 * cuenta viva —días, horas, minutos y segundos— hasta la medianoche del
 * arranque en hora de México. Es la única pieza de la banda que vive en el
 * navegador; la foto, los velos y los textos siguen saliendo del servidor.
 *
 * Por qué está hecho así:
 *  · El primer cuadro pinta lo que calculó el servidor (`restanteInicial`) y
 *    el reloj del navegador corrige ya montado. Si el primer render leyera
 *    `Date.now()`, el HTML del servidor y el del navegador diferirían por un
 *    par de segundos y React tiraría el error de hidratación (#418/#425).
 *  · Cifras de caja alta y tabulares (`lining-nums tabular-nums`). Cormorant
 *    trae por omisión cifras de estilo antiguo, que bajan de la línea (el 3, el
 *    4, el 5, el 7 y el 9): con cuatro números juntos la fila se veía dispareja.
 *    Y sin cifras tabulares el número cambia de ancho cada segundo y empuja a
 *    los demás.
 *  · Con «menos movimiento» los segundos no se pintan (lo oculta el CSS desde el
 *    primer cuadro, sin esperar al JS) y el número cambia una vez por minuto.
 *  · Al llegar a cero pasa sola a «Ya arrancó», con su titular, sin recargar, y
 *    deja de programar tics (al desmontarse también cancela el pendiente). La
 *    línea de la promo se va con ella: la promo de temporada baja termina el 29
 *    a medianoche, el mismo instante en que arranca la temporada.
 *  · Cabe a 320 px: los números miden ~0.98 em cada par, y lo que manda en
 *    teléfono es la etiqueta más ancha («HORAS», ~48 px). Cuatro columnas de
 *    ~48 px más tres separadores de 25 px son ~255 px de los 272 que quedan.
 */

const SEG = 1_000;
const MIN = 60 * SEG;
const HORA = 60 * MIN;
const DIA = 24 * HORA;

/** Siempre dos cifras: «09» y «10» miden lo mismo y la fila no brinca. */
const dos = (n: number) => String(n).padStart(2, "0");

type Props = {
  /** Medianoche del arranque en hora de México, en ms (`inicioMejorTemporada`). */
  objetivo: number;
  /** Lo que faltaba cuando el servidor pintó la página, en ms (0 si ya arrancó). */
  restanteInicial: number;
  en: boolean;
  /** El titular mientras corre la cuenta… */
  titularCuenta: ReactNode;
  /** …y el de cuando ya arrancó. */
  titularDentro: ReactNode;
  /** La línea de la promo de temporada baja; desaparece al llegar a cero. */
  aviso?: ReactNode;
  /** Lo que no cambia: el párrafo y el botón. */
  children: ReactNode;
};

export function CuentaRegresivaTemporada({
  objetivo,
  restanteInicial,
  en,
  titularCuenta,
  titularDentro,
  aviso,
  children,
}: Props) {
  const [restante, setRestante] = useState(restanteInicial);

  useEffect(() => {
    // Si el servidor ya la dio por arrancada, no se discute: con el reloj del
    // navegador atrasado, la cuenta volvería a aparecer después de «Ya arrancó».
    if (restanteInicial <= 0) return;
    // Con «menos movimiento» solo se repinta cuando cambia el minuto.
    const paso = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? MIN : SEG;
    let id: number | undefined;
    const tick = () => {
      const r = Math.max(0, objetivo - Date.now());
      setRestante(r);
      // El siguiente tic cae justo cuando cambia lo que se ve, no cada 1000 ms
      // desde que montó: así los números cambian a la par del reloj y «Ya
      // arrancó» sale en el instante cero, no hasta un segundo después.
      if (r > 0) id = window.setTimeout(tick, (r % paso || paso) + 15);
    };
    tick();
    return () => window.clearTimeout(id);
  }, [objetivo, restanteInicial]);

  const arranco = restante <= 0;

  if (arranco) {
    return (
      <>
        <div className="reveal-up mb-6">
          <span className="inline-block border border-dorado/50 bg-dorado/10 px-4 py-2 font-dm text-[10px] uppercase tracking-[3px] text-dorado">
            {en ? "Season is open" : "Ya arrancó"}
          </span>
        </div>
        {titularDentro}
        {children}
      </>
    );
  }

  // Los segundos que faltan, redondeados hacia arriba: con medio segundo por
  // delante todavía dice «01», y el «00» no llega a verse porque en el cero ya
  // está «Ya arrancó».
  const total = Math.ceil(restante / SEG) * SEG;
  const dias = Math.floor(total / DIA);
  const horas = Math.floor((total % DIA) / HORA);
  const minutos = Math.floor((total % HORA) / MIN);
  const segundos = Math.floor((total % MIN) / SEG);

  const unidades = [
    { clave: "d", valor: dias, etiqueta: en ? (dias === 1 ? "day" : "days") : dias === 1 ? "día" : "días" },
    { clave: "h", valor: horas, etiqueta: en ? (horas === 1 ? "hour" : "hours") : horas === 1 ? "hora" : "horas" },
    { clave: "m", valor: minutos, etiqueta: "min" },
    { clave: "s", valor: segundos, etiqueta: en ? "sec" : "seg" },
  ];

  return (
    <>
      {/* El tamaño va en la fila y no en cada número para que el separador
          pueda medirse en `em` y caer justo a la altura de las cifras. */}
      <div
        role="timer"
        aria-label={en ? "Countdown" : "Cuenta regresiva"}
        className="reveal-up mb-7 flex items-start gap-3 sm:gap-5"
        style={{ fontSize: "clamp(44px,13.5vw,100px)" }}
      >
        {unidades.map((u, i) => (
          <div
            key={u.clave}
            className={
              u.clave === "s"
                ? "flex items-start gap-3 sm:gap-5 motion-reduce:hidden"
                : "flex items-start gap-3 sm:gap-5"
            }
          >
            {/* La misma línea dorada del rótulo de la fecha, ahora de pie: de la
                cabeza de las cifras a su base, sin tocar las etiquetas. */}
            {i > 0 ? (
              <span aria-hidden="true" className="mt-[0.13em] h-[0.64em] w-px flex-shrink-0 bg-dorado/30" />
            ) : null}
            <div className="flex flex-col items-center">
              <span className="shimmer-gold block font-cormorant font-light leading-[0.9] lining-nums tabular-nums">
                {dos(u.valor)}
              </span>
              {/* El margen negativo se come el espaciado que el `tracking` deja
                  después de la última letra: sin él, la etiqueta queda corrida
                  a la izquierda del número. */}
              <span className="mt-3 -mr-[3px] font-dm text-[10px] uppercase tracking-[3px] text-crema/60">
                {u.etiqueta}
              </span>
            </div>
          </div>
        ))}
      </div>
      {titularCuenta}
      {children}
      {aviso}
    </>
  );
}
