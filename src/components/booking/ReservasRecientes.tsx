"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BadgeCheck, X } from "lucide-react";
import { useLocale } from "@/lib/i18n/useLocale";
import { trackTourEvent } from "@/lib/tourTracker";
import { pedirEsquina, soltarEsquina } from "@/lib/avisoEsquina";
import type { ReservaReciente } from "@/lib/pruebaSocialReservas";

/**
 * «María G. reservó Cascada de Tamul · hace 3 días».
 *
 * Reservas REALES, anonimizadas, de `/api/prueba-social` (ver
 * `lib/pruebaSocialReservas.ts`). Es el primer aviso del sitio que dice que
 * alguien compró de verdad: todo lo que había antes eran hechos del negocio
 * (la calificación, el seguro, los grupos chicos), ciertos pero impersonales.
 *
 * 🔴 Las tres reglas que lo hacen honesto
 *
 * 1. **Con menos de tres nombres reales no aparece.** Dos avisos repitiéndose
 *    se leen como inventados, y el negocio tiene semanas de cuatro reservas.
 *    El gate está aquí y no en el servidor para que la ficha siga siendo
 *    estática.
 * 2. **La antigüedad se dice como es.** Si la reserva entró hace tres semanas,
 *    dice «hace 3 semanas». No hay un «hace 2 horas» de adorno.
 * 3. **Tres apariciones por sesión y se calla.** El antecedente está en
 *    `SocialProofToast.tsx`: su ciclo se reprogramaba solo y una sola sesión
 *    emitió 1,840 avisos —el 65 % de toda la telemetría de catorce días—.
 *
 * 🔴 Y nunca encima de donde se reserva (9 oct 2026, visto en el navegador a
 * 390 px). Dos veces aterrizó justo sobre lo único que importa de la pantalla:
 * primero sobre «Ver fechas disponibles», el botón del hero, y después sobre
 * el módulo de reserva, tapándole la línea de «Paso 1 de 3». Un aviso que tapa
 * el botón de reservar cuesta más de lo que suma, por bueno que sea el dato.
 * Por eso espera a media pantalla de scroll (`SCROLL_MINIMO`) y, donde se le
 * dice qué esquivar (`evitar`), espera además a no caer ENCIMA de eso. En la
 * ficha eso es el módulo de reserva: en el teléfono el aviso sale mientras lee
 * el itinerario y no mientras elige la fecha; en escritorio, donde el módulo
 * es una columna a la derecha, no estorba y el aviso sale igual.
 *
 * Y una de cortesía: comparte la esquina con `SocialProofToast` por el
 * semáforo de `lib/avisoEsquina.ts`. Sin él, en un teléfono las dos cajas se
 * pisan.
 */

/** Cuántas veces se enseña en una visita, como mucho. */
const MAX_AVISOS = 3;

const ESPERA_MS   = 7_000;  // desde que carga hasta el primero
const VISIBLE_MS  = 6_000;  // cuánto se queda en pantalla
const PAUSA_MS    = 7_000;  // hueco entre uno y el siguiente
const CERRADO_KEY = "hp_reservas_recientes_cerrado";

/** Cuánto hay que bajar para que el aviso deje de tapar el botón del hero. */
const SCROLL_MINIMO = () => window.innerHeight * 0.5;

/** El nombre con el que este componente pide la esquina. */
const QUIEN = "reservas-recientes";

/** «hace 5 h» · «hace 3 días» · «hace 2 semanas». */
export function haceCuanto(horas: number, en: boolean): string {
  if (horas < 24) {
    const h = Math.max(1, Math.round(horas));
    return en ? `${h} h ago` : `hace ${h} h`;
  }
  const dias = Math.round(horas / 24);
  if (dias < 14) {
    return en ? `${dias} day${dias > 1 ? "s" : ""} ago` : `hace ${dias} día${dias > 1 ? "s" : ""}`;
  }
  const semanas = Math.round(dias / 7);
  return en ? `${semanas} weeks ago` : `hace ${semanas} semanas`;
}

/**
 * ¿La caja del aviso se montaría ENCIMA de `selector`?
 *
 * 🔴 La primera versión preguntaba solo si el elemento estaba en pantalla, y
 * en escritorio eso apagaba el aviso para siempre: ahí el módulo de reserva es
 * una columna `sticky` que acompaña todo el scroll. Pero vive a la derecha y
 * el aviso sale abajo a la izquierda, así que nunca se tocan. Lo que importa
 * no es si se ve, es si se pisan.
 *
 * La caja todavía no existe cuando se pregunta, así que se calcula dónde
 * caería: `left-4`, `bottom-20` y, como mucho, el ancho y el alto de la más
 * grande que puede salir.
 */
const ANCHO_MAX = 320;  // sm:max-w-xs
const ALTO_MAX  = 96;   // dos renglones largos
const SEPARACION_ABAJO = 80; // bottom-20

function chocaConElAviso(selector?: string): boolean {
  if (!selector) return false;
  const el = document.querySelector(selector);
  if (!el) return false;
  const r = el.getBoundingClientRect();
  const caja = {
    izq: 16,
    der: 16 + ANCHO_MAX,
    abajo: window.innerHeight - SEPARACION_ABAJO,
    arriba: window.innerHeight - SEPARACION_ABAJO - ALTO_MAX,
  };
  return r.left < caja.der && r.right > caja.izq && r.top < caja.abajo && r.bottom > caja.arriba;
}

function yaLoCerro(): boolean {
  try {
    return sessionStorage.getItem(CERRADO_KEY) === "1";
  } catch {
    return false;
  }
}

export function ReservasRecientes({ evitar }: {
  /**
   * Selector CSS de lo que el aviso no puede tapar (el módulo de reserva de la
   * ficha). Mientras la caja fuera a caer ENCIMA de ese elemento, no sale.
   */
  evitar?: string;
} = {}) {
  const { en } = useLocale();
  const [items, setItems] = useState<ReservaReciente[]>([]);
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(false);
  const [cerrado, setCerrado] = useState(false);
  const mostrados = useRef(0);
  /**
   * El único reloj pendiente. La cadena es estrictamente secuencial —esperar,
   * enseñar, ocultar, esperar— así que nunca hay dos a la vez; con una lista,
   * el reintento cada 2 s de la puerta de scroll la hacía crecer un hueco por
   * segundo mientras la persona siguiera arriba.
   */
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null);

  const programar = (fn: () => void, ms: number) => {
    if (reloj.current) clearTimeout(reloj.current);
    reloj.current = setTimeout(fn, ms);
  };

  const limpiar = () => {
    if (reloj.current) clearTimeout(reloj.current);
    reloj.current = null;
  };

  // Las reservas. Si son menos de tres, `items` se queda vacío y no se
  // programa nada: el componente no existe para el visitante.
  useEffect(() => {
    if (yaLoCerro()) {
      setCerrado(true);
      return;
    }
    let vivo = true;
    fetch("/api/prueba-social")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!vivo || !d || !Array.isArray(d.recientes) || d.recientes.length < 3) return;
        setItems(d.recientes as ReservaReciente[]);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  const mostrar = useCallback(() => {
    if (mostrados.current >= MAX_AVISOS) return;
    // Todavía en el hero, o con el módulo de reserva en pantalla: la caja
    // taparía el botón. Se vuelve a mirar en un momento; no gasta una de las
    // tres apariciones.
    if (window.scrollY < SCROLL_MINIMO() || chocaConElAviso(evitar)) {
      programar(mostrar, 2_000);
      return;
    }
    // La esquina puede estar ocupada por el otro aviso. No se espera: se
    // reintenta en el siguiente ciclo, cuando ya tenga otra reserva que contar.
    if (!pedirEsquina(QUIEN)) {
      programar(mostrar, PAUSA_MS);
      return;
    }
    mostrados.current += 1;
    setVisible(true);
    trackTourEvent("PRUEBA_SOCIAL_SHOWN", { n: mostrados.current });

    programar(() => {
      setVisible(false);
      soltarEsquina(QUIEN);
      programar(() => {
        setIdx((i) => i + 1);
        mostrar();
      }, PAUSA_MS);
    }, VISIBLE_MS);
  }, [evitar]);

  useEffect(() => {
    if (items.length < 3 || cerrado) return;
    programar(mostrar, ESPERA_MS);
    return () => {
      limpiar();
      soltarEsquina(QUIEN);
    };
  }, [items.length, cerrado, mostrar]);

  function cerrar() {
    setVisible(false);
    setCerrado(true);
    limpiar();
    soltarEsquina(QUIEN);
    try {
      sessionStorage.setItem(CERRADO_KEY, "1");
    } catch {
      // modo privado: se queda cerrado solo en esta página, que ya es suficiente
    }
    trackTourEvent("PRUEBA_SOCIAL_DISMISSED", { n: mostrados.current });
  }

  if (items.length < 3 || cerrado || !visible) return null;

  const r = items[idx % items.length];

  return (
    <div
      className="fixed bottom-20 left-4 z-50 flex max-w-[285px] items-start gap-2.5
                 border border-white/12 border-l-2 border-l-verde-vivo bg-negro/95
                 px-3 py-2.5 shadow-xl shadow-black/40 animate-slide-up sm:max-w-xs"
      role="status"
      aria-live="polite"
    >
      <BadgeCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-verde-vivo" aria-hidden="true" />
      <div className="min-w-0">
        <p className="font-dm text-xs leading-snug text-crema/85">
          <strong className="font-medium text-crema">{r.nombre}</strong>{" "}
          {en ? "booked" : "reservó"}{" "}
          <strong className="font-medium text-crema">{r.recorrido}</strong>
        </p>
        <p className="mt-1 font-dm text-[10px] text-verde-vivo/60">
          {haceCuanto(r.horas, en)} · {en ? "Verified booking" : "Reserva verificada"}
        </p>
      </div>
      <button
        onClick={cerrar}
        aria-label={en ? "Close" : "Cerrar"}
        className="-mr-1 flex-shrink-0 text-crema/30 transition-colors hover:text-crema/70"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
