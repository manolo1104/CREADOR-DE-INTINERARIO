"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { trackTourEvent } from "@/lib/tourTracker";
import type { Locale } from "@/lib/i18n/config";

/**
 * El apartado de los lugares del carrito, del lado del navegador (el servidor:
 * `lib/apartados.ts`). Con los recorridos que ya tienen fecha y gente, le pide
 * al servidor que los aparte 15 minutos; si cambian la fecha, la gente o los
 * renglones, lo vuelve a pedir con el MISMO id, y si el carrito se queda sin
 * nada que apartar, lo suelta.
 *
 * 🔴 El reloj solo existe si el servidor confirmó el apartado. Hasta el 4 oct
 * el carrito tenía uno de adorno y se quitó por engañoso: aquí, sin respuesta
 * buena del servidor, no se pinta nada. Y al llegar a cero NO se vuelve a
 * apartar solo: lo decide el cliente («Volver a apartar»).
 *
 * Vive en `useCarritoCheckout`, así que lo tienen el checkout de hoy y el v2.
 * La cuenta de cada segundo la lleva `ApartadoAviso`: aquí solo está CUÁNDO
 * vence, para no repintar el carrito entero cada segundo.
 */

export type EstadoApartado = "inactivo" | "apartando" | "apartado" | "vencido" | "sinLugar" | "error";

/** Un recorrido que se quiere apartar. */
export interface LineaParaApartar {
  slug:     string;
  fecha:    string;
  personas: number;
}

/** Dónde vive el id: la pestaña, igual que el id de la visita (`hp_sid`). */
export const APARTADO_ID_KEY = "hp_apartado_id";
/** Avisa que el id cambió: el calendario deja de contar como ajenos los lugares propios. */
export const APARTADO_EVENTO = "hp:apartado";

/** Lo que se espera tras el último cambio: el «+» de personas se pulsa en ráfagas. */
const ESPERA_MS = 700;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Copia en memoria, por si el navegador no deja escribir en sessionStorage. */
let idEnMemoria: string | null = null;

/** El id del apartado de esta pestaña, o null. */
export function leerApartadoId(): string | null {
  let guardado: string | null = null;
  try {
    guardado = window.sessionStorage.getItem(APARTADO_ID_KEY);
  } catch {
    // Sin sessionStorage (navegación privada estricta): queda la copia en memoria.
  }
  const id = guardado ?? idEnMemoria;
  return id && UUID.test(id) ? id : null;
}

function recordarApartadoId(id: string | null): void {
  idEnMemoria = id;
  try {
    if (id) window.sessionStorage.setItem(APARTADO_ID_KEY, id);
    else window.sessionStorage.removeItem(APARTADO_ID_KEY);
  } catch {
    // Ver `leerApartadoId`.
  }
  window.dispatchEvent(new Event(APARTADO_EVENTO));
}

/** Suelta un apartado en el servidor sin esperar respuesta (`keepalive`: sobrevive a salir de la página). */
function soltar(id: string): void {
  void fetch(`/api/tours/apartar?id=${encodeURIComponent(id)}`, { method: "DELETE", keepalive: true }).catch(() => {});
}

/**
 * Olvida el apartado SIN soltarlo. Lo llama el pago al terminar: los lugares
 * ya son una reserva y el servidor suelta el apartado DESPUÉS de crearla
 * (`send-confirmation`, el webhook). Soltarlo desde aquí podía abrir un
 * instante en el que no contaran ni el apartado ni la reserva.
 */
export function olvidarApartado(): void {
  recordarApartadoId(null);
}

/** El id del apartado de esta pestaña, al día. Lo usa el calendario para no contarse a sí mismo. */
export function useApartadoId(): string {
  const [id, setId] = useState("");
  useEffect(() => {
    const leer = () => setId(leerApartadoId() ?? "");
    leer();
    window.addEventListener(APARTADO_EVENTO, leer);
    return () => window.removeEventListener(APARTADO_EVENTO, leer);
  }, []);
  return id;
}

export function useApartado(lineas: LineaParaApartar[], { activo, locale }: { activo: boolean; locale: Locale }) {
  const [estado, setEstado] = useState<EstadoApartado>("inactivo");
  /** Cuándo vence, ya en la hora de ESTE dispositivo (corregida con la del servidor). */
  const [vence, setVence] = useState<number | null>(null);
  const [minutos, setMinutos] = useState(15);
  /** Lo que dijo el servidor cuando algo no cabe, con los días que sí tienen lugar. */
  const [mensajes, setMensajes] = useState<string[]>([]);
  /** Qué recorrido y qué fecha no cupieron: para llevar al cliente a ese renglón. */
  const [sinCupo, setSinCupo] = useState<{ slug: string; fecha: string }[]>([]);
  /** Hay una petición en camino. */
  const [ocupado, setOcupado] = useState(false);
  /** El id vigente en esta pestaña ("" si no hay): lo manda el cobro (`carrito-payment-intent`). */
  const apartadoId = useApartadoId();

  const lineasRef = useRef(lineas);
  lineasRef.current = lineas;
  const enVueloRef = useRef(false);
  const otraVezRef = useRef(false);
  /** Ya salió la primera petición: de ahí en adelante se espera a que paren los cambios. */
  const yaPidioRef = useRef(false);
  /** Sube cuando el carrito se queda sin nada que apartar: lo que conteste el servidor después ya no manda. */
  const generacionRef = useRef(0);

  // La misma lista en cualquier orden: reordenar renglones no es un cambio.
  const firma = lineas.map((l) => `${l.slug}|${l.fecha}|${l.personas}`).sort().join(";");

  // Con su tipo escrito: se llama a sí misma (la petición que quedó en espera)
  // y sin él TypeScript no puede deducirlo.
  const pedir: () => Promise<void> = useCallback(async () => {
    // Una petición a la vez: si se cruzaran, el servidor podría quedarse con
    // los renglones viejos mientras la pantalla enseña los nuevos.
    if (enVueloRef.current) {
      otraVezRef.current = true;
      return;
    }
    if (!lineasRef.current.length) return;
    yaPidioRef.current = true;
    enVueloRef.current = true;
    setOcupado(true);
    setEstado((e) => (e === "inactivo" || e === "error" ? "apartando" : e));
    const generacion = generacionRef.current;
    try {
      const r = await fetch("/api/tours/apartar", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ id: leerApartadoId() ?? undefined, lineas: lineasRef.current, locale }),
      });
      const d = await r.json().catch(() => null);
      if (generacion !== generacionRef.current) {
        // El carrito se vació mientras tanto: lo que se haya apartado sobra.
        if (d?.ok === true && typeof d.id === "string") soltar(d.id);
        return;
      }
      if (r.ok && d?.ok === true && typeof d.id === "string" && typeof d.vence === "number") {
        recordarApartadoId(d.id);
        // `ahora` es la hora del servidor: si el teléfono va tres minutos
        // adelantado, la cuenta no puede enseñar 12 minutos donde quedan 15.
        setVence(d.vence - (typeof d.ahora === "number" ? d.ahora - Date.now() : 0));
        if (typeof d.minutos === "number") setMinutos(d.minutos);
        setMensajes([]);
        setSinCupo([]);
        setEstado("apartado");
      } else if (r.status === 409 && Array.isArray(d?.mensajes)) {
        // No cabe: el servidor no apartó nada (y soltó lo que hubiera).
        setVence(null);
        setMensajes(d.mensajes.filter((m: unknown): m is string => typeof m === "string"));
        setSinCupo(
          Array.isArray(d.sinCupo)
            ? d.sinCupo.map((s: { slug?: unknown; fecha?: unknown }) => ({ slug: String(s?.slug ?? ""), fecha: String(s?.fecha ?? "") }))
            : [],
        );
        setEstado("sinLugar");
      } else {
        // Sin apartado confirmado no hay reloj. El cobro vuelve a contar igual.
        setVence(null);
        setEstado("error");
      }
    } catch {
      if (generacion === generacionRef.current) {
        setVence(null);
        setEstado("error");
      }
    } finally {
      enVueloRef.current = false;
      setOcupado(false);
      if (otraVezRef.current) {
        otraVezRef.current = false;
        void pedir();
      }
    }
  }, [locale]);

  // Cada cambio de fecha, gente o renglones vuelve a apartar (con el mismo id),
  // un momento después del último toque. La primera vez, al terminar de cargar
  // el carrito, sale de inmediato: no hay ráfaga que esperar, y el aviso
  // aparece antes de que la persona empiece a tocar la lista que empuja.
  useEffect(() => {
    if (!activo) return;
    if (!firma) {
      // Nada que apartar (sin recorridos, o ninguno con fecha): se suelta lo que hubiera.
      generacionRef.current++;
      otraVezRef.current = false;
      const previo = leerApartadoId();
      if (previo) {
        soltar(previo);
        recordarApartadoId(null);
      }
      setVence(null);
      setMensajes([]);
      setSinCupo([]);
      setEstado("inactivo");
      return;
    }
    const t = setTimeout(() => { void pedir(); }, yaPidioRef.current ? ESPERA_MS : 0);
    return () => clearTimeout(t);
  }, [activo, firma, pedir]);

  // Vence a su hora aunque nadie mire el aviso. Con la pestaña en segundo plano
  // el navegador atrasa los `setTimeout` largos: al volver a ella se revisa.
  useEffect(() => {
    if (estado !== "apartado" || vence === null) return;
    const revisar = () => {
      if (Date.now() >= vence) setEstado((e) => (e === "apartado" ? "vencido" : e));
    };
    const t = setTimeout(revisar, Math.max(0, vence - Date.now()) + 50);
    const alVolver = () => { if (document.visibilityState === "visible") revisar(); };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearTimeout(t);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [estado, vence]);

  // La medición propia (`/api/track`): una vez por cambio de estado, nunca por segundo.
  const anteriorRef = useRef<EstadoApartado>("inactivo");
  useEffect(() => {
    const anterior = anteriorRef.current;
    anteriorRef.current = estado;
    if (estado === anterior) return;
    const ls = lineasRef.current;
    const datos = { tour: ls[0]?.slug, recorridos: ls.length, personas: Math.max(0, ...ls.map((l) => l.personas)) };
    if (estado === "apartado") trackTourEvent("APARTADO_CREADO", datos);
    else if (estado === "vencido") trackTourEvent("APARTADO_VENCIDO", datos);
    else if (estado === "sinLugar") {
      trackTourEvent("APARTADO_SIN_LUGAR", { ...datos, dias: sinCupo.map((s) => `${s.slug} ${s.fecha}`).join("; ") });
    }
  }, [estado, sinCupo]);

  /** «Volver a apartar»: lo pide el cliente, nunca el reloj. */
  const reapartar = useCallback(() => { void pedir(); }, [pedir]);

  /**
   * El cobro renovó el apartado (`carrito-payment-intent`): ya está en la
   * pantalla de pago y el reloj vuelve a empezar, con la hora del servidor.
   */
  const renovado = useCallback((venceServidor: number, ahoraServidor?: number) => {
    setVence(venceServidor - (typeof ahoraServidor === "number" ? ahoraServidor - Date.now() : 0));
    setMensajes([]);
    setSinCupo([]);
    setEstado("apartado");
  }, []);

  return { estado, vence, minutos, mensajes, sinCupo, ocupado, apartadoId, reapartar, renovado };
}

export type ApartadoCarrito = ReturnType<typeof useApartado>;
