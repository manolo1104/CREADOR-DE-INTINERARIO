"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Clock, TriangleAlert } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import type { ApartadoCarrito } from "./useApartado";

/**
 * El aviso del apartado de 15 minutos (`useApartado`), EN LÍNEA con la página.
 * Nada de otra barra fija: en el celular ya hay una sola abajo y la regla es no
 * encimar flotantes.
 *
 *   apartado  «Te apartamos tus lugares: 14:59» y qué pasa si no termina
 *   vencido   «Se liberaron tus lugares» + «Volver a apartar»
 *   sinLugar  lo que dijo el servidor, con los días que sí tienen lugar
 *   lo demás  nada: sin apartado confirmado por el servidor no hay reloj
 *
 * El lector de pantalla oye los CAMBIOS de estado, no cada segundo: lo que
 * anuncia es un párrafo aparte que solo cambia de texto al cambiar el estado.
 */

interface Textos {
  apartado:        string;
  seLiberan:       (minutos: number) => string;
  vencidoTitulo:   string;
  vencidoTexto:    (minutos: number) => string;
  volver:          string;
  apartando:       string;
  sinLugarTitulo:  string;
  cambiarFecha:    string;
  anuncioApartado: (minutos: number) => string;
  anuncioVencido:  string;
}

/**
 * Los textos viven aquí, junto a los estados que nombran: solo los usa este
 * aviso (igual que los del cupo en `TourCalendar`).
 */
const TEXTOS: Record<Locale, Textos> = {
  es: {
    apartado:        "Te apartamos tus lugares:",
    seLiberan:       (m) => `Si no terminas en ${m} minutos, se liberan para otros viajeros.`,
    vencidoTitulo:   "Se liberaron tus lugares",
    vencidoTexto:    (m) => `Pasaron los ${m} minutos. Si siguen libres, te los volvemos a apartar.`,
    volver:          "Volver a apartar",
    apartando:       "Apartando…",
    sinLugarTitulo:  "No pudimos apartar tus lugares",
    cambiarFecha:    "Cambiar la fecha",
    anuncioApartado: (m) => `Te apartamos tus lugares por ${m} minutos.`,
    anuncioVencido:  "Se liberaron tus lugares.",
  },
  en: {
    apartado:        "We're holding your spots:",
    seLiberan:       (m) => `If you don't finish within ${m} minutes, they're released to other travelers.`,
    vencidoTitulo:   "Your spots were released",
    vencidoTexto:    (m) => `The ${m} minutes ran out. If they're still free, we'll hold them for you again.`,
    volver:          "Hold them again",
    apartando:       "Holding…",
    sinLugarTitulo:  "We couldn't hold your spots",
    cambiarFecha:    "Change the date",
    anuncioApartado: (m) => `Your spots are held for ${m} minutes.`,
    anuncioVencido:  "Your spots were released.",
  },
};

/** 14:59: minutos y segundos. */
function mmss(segundos: number): string {
  return `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, "0")}`;
}

/**
 * Repinta el aviso justo cuando cambia el segundo de la cuenta, y solo al
 * aviso (el carrito entero no se repinta cada segundo). Un `setInterval` de
 * 1000 ms suelto se desfasa del segundo y a veces un número dura casi dos;
 * esto apunta siempre al siguiente cambio.
 */
function useCadaSegundo(vence: number | null): void {
  const [, setTic] = useState(0);
  useEffect(() => {
    if (vence === null) return;
    let t: ReturnType<typeof setTimeout>;
    const programar = () => {
      const resto = (vence - Date.now()) % 1000;
      t = setTimeout(() => {
        setTic((n) => n + 1);
        programar();
      }, (resto > 0 ? resto : 1000) + 10);
    };
    programar();
    return () => clearTimeout(t);
  }, [vence]);
}

export function ApartadoAviso({ a, locale, className = "", anunciar = true, onCambiarFecha }: {
  a: ApartadoCarrito;
  locale: Locale;
  /** De la caja: dónde se ve (`lg:hidden`, `hidden lg:block`) y su margen. */
  className?: string;
  /**
   * Solo UNA copia por página habla: los checkouts pintan una para el celular y
   * otra en la columna del escritorio, y el lector de pantalla la oiría dos veces.
   */
  anunciar?: boolean;
  /** Lleva al renglón cuya fecha ya no tiene lugar. */
  onCambiarFecha?: () => void;
}) {
  const tx = TEXTOS[locale];
  const conReloj = a.estado === "apartado" && a.vence !== null;
  useCadaSegundo(conReloj ? a.vence : null);
  // Se calcula al pintar con la hora de ahora; el tic solo provoca el repintado.
  const restante = conReloj ? Math.max(0, Math.ceil((a.vence! - Date.now()) / 1000)) : 0;

  const anuncio =
    a.estado === "apartado" ? tx.anuncioApartado(a.minutos)
    : a.estado === "vencido" ? tx.anuncioVencido
    : a.estado === "sinLugar" ? `${tx.sinLugarTitulo}. ${a.mensajes.join(" ")}`
    : "";

  let caja: ReactNode = null;
  if (conReloj) {
    caja = (
      <div className="flex items-start gap-2.5 border border-verde-selva/25 bg-verde-selva/5 px-3 py-2.5">
        <Clock className="w-4 h-4 mt-px flex-shrink-0 text-verde-selva" aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-dm text-[13px] leading-snug text-negro/80">
            {tx.apartado}{" "}
            {/* Los dos últimos minutos, en terracota: es cuando sí hay que apurarse. */}
            <strong className={`font-semibold tabular-nums transition-colors duration-300 ${restante <= 120 ? "text-terracota" : "text-verde-selva"}`}>
              {mmss(restante)}
            </strong>
          </p>
          <p className="mt-0.5 font-dm text-[11px] leading-snug text-negro/60">{tx.seLiberan(a.minutos)}</p>
        </div>
      </div>
    );
  } else if (a.estado === "vencido") {
    caja = (
      <div className="flex items-start gap-2.5 border border-terracota/40 bg-terracota/5 px-3 py-2.5">
        <TriangleAlert className="w-4 h-4 mt-px flex-shrink-0 text-terracota" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-dm text-[13px] font-medium leading-snug text-terracota">{tx.vencidoTitulo}</p>
          <p className="mt-0.5 font-dm text-[11px] leading-snug text-negro/60">{tx.vencidoTexto(a.minutos)}</p>
          <button
            type="button"
            onClick={a.reapartar}
            disabled={a.ocupado}
            className="mt-2 min-h-[44px] px-4 border border-verde-selva font-dm text-[11px] tracking-[1.5px] uppercase text-verde-selva transition-[transform,background-color] duration-150 ease-out active:scale-[0.97] [@media(hover:hover)]:hover:bg-verde-selva/10 disabled:opacity-50 disabled:cursor-wait disabled:active:scale-100"
          >
            {a.ocupado ? tx.apartando : tx.volver}
          </button>
        </div>
      </div>
    );
  } else if (a.estado === "sinLugar" && a.mensajes.length > 0) {
    caja = (
      // Atenuado mientras se vuelve a pedir con la fecha nueva.
      <div className={`flex items-start gap-2.5 border border-terracota/40 bg-terracota/5 px-3 py-2.5 transition-opacity duration-200 ${a.ocupado ? "opacity-60" : ""}`}>
        <TriangleAlert className="w-4 h-4 mt-px flex-shrink-0 text-terracota" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-dm text-[13px] font-medium leading-snug text-terracota">{tx.sinLugarTitulo}</p>
          {a.mensajes.map((m) => (
            <p key={m} className="mt-1 font-dm text-[12px] leading-snug text-negro/75">{m}</p>
          ))}
          {onCambiarFecha && (
            <button
              type="button"
              onClick={onCambiarFecha}
              className="mt-1 py-1 font-dm text-[12px] text-verde-selva underline underline-offset-2 transition-colors [@media(hover:hover)]:hover:text-verde-vivo"
            >
              {tx.cambiarFecha}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Vacío no ocupa lugar, pero tiene que existir antes de hablar: un
          lector de pantalla solo anuncia regiones que ya estaban ahí. */}
      {anunciar && <p aria-live="polite" className="sr-only">{anuncio}</p>}
      {caja && (
        // Cada estado entra con un desliz corto (la clave lo vuelve a montar);
        // con movimiento reducido, sin animación.
        <div key={a.estado} className={`motion-safe:animate-slide-up ${className}`.trim()}>
          {caja}
        </div>
      )}
    </>
  );
}
