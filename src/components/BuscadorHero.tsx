"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ChevronDown, Minus, Plus, Search, Check, X, Users } from "lucide-react";
import { SelectorPersonas, CONTROL_BUSCADOR } from "@/components/buscador/SelectorPersonas";
import { CELDA_BUSCADOR, ETIQUETA_BUSCADOR, FILA_BUSCADOR, SEPARADOR_BUSCADOR } from "@/components/buscador/estilos";
import { useLocale } from "@/lib/i18n/useLocale";
import { buscadorUI } from "@/lib/i18n/buscador";
import { TourCalendar } from "@/components/booking/TourCalendar";
import type { EtiquetaTour } from "@/lib/etiquetasTour";
import type { TourCategoria } from "@/lib/tours";
import { anunciarIntencion, type FiltroQue } from "@/lib/intencionInicio";
import { trackTourEvent } from "@/lib/tourTracker";

/**
 * El buscador del hero: «¿Qué quieres ver? · ¿Cuándo? · ¿Cuántos? → Ver tours».
 *
 * 🔴 Por qué existe (7 oct 2026)
 *
 * En la primera pantalla del inicio no había NADA accionable: los dos botones
 * («Reservar tour» y «Ver los recorridos») caían debajo del pliegue, empujados
 * por un H1 de 130 px, un párrafo de cuatro líneas, las estrellas, los
 * visitantes en vivo, el clima de siete días, una píldora rotatoria y una fila
 * de estadísticas. Ninguna de las seis operadoras grandes del sector usa el
 * hero para poesía: lo usan para que el visitante declare su intención.
 *
 * 🔴 Los dos arreglos de la primera revisión de Manolo (7 oct, noche):
 *
 * 1. **El desplegable es nuestro, no el del sistema.** Antes era un `<select>`
 *    nativo transparente encima de un botón. Se ve distinto en cada aparato,
 *    no se puede dar estilo a sus grupos, y en el hero de un sitio con
 *    tipografía propia desentonaba.
 *
 * 2. **«¿Cuándo?» ES el calendario del recorrido, en vivo.** Antes era un
 *    `<input type="date">` nativo también transparente — y **no se podía
 *    seleccionar**: Chrome de escritorio no abre el selector de fecha al
 *    pulsar un campo con `opacity: 0`, solo al pulsar su iconito. Ahora usa
 *    `TourCalendar`, el mismo que el carrito y la ficha, con `slug`: consulta
 *    `/api/tours/disponibilidad` y pinta los días que de verdad quedan 🟢🟡🔴⚪.
 *
 * 🔴 Lo que sigue sin hacer, a propósito: **no consulta nada hasta que se elige
 * un recorrido concreto.** Sin `slug`, `TourCalendar` no llama a la red y se
 * comporta como un selector de fecha normal. El hero es LCP crítico y no puede
 * disparar quince consultas de cupo por abrirse.
 *
 * Nada de `framer-motion` (CLAUDE.md): solo transiciones de Tailwind.
 */

/** Un grupo del desplegable, armado en el servidor para no mandar TOURS_DB al cliente. */
export interface GrupoOpciones {
  grupo: string;
  opciones: {
    valor: string;
    etiqueta: string;
    /** La hora de salida del recorrido, para el calendario. Solo en los tours. */
    salida?: string | null;
  }[];
}

interface Props {
  grupos: GrupoOpciones[];
  /** Mínimo y máximo de personas del catálogo (`GRUPO_MIN` / `GRUPO_MAX`). */
  minPersonas: number;
  maxPersonas: number;
}

/** El `value` del desplegable a un filtro de la rejilla. */
function aFiltro(valor: string): FiltroQue {
  if (valor.startsWith("cat:"))  return { tipo: "categoria", id: valor.slice(4) as TourCategoria };
  if (valor.startsWith("tag:"))  return { tipo: "etiqueta",  id: valor.slice(4) as EtiquetaTour };
  if (valor.startsWith("tour:")) return { tipo: "tour",      slug: valor.slice(5) };
  return { tipo: "todos" };
}

/**
 * 🔴 El vidrio (8 oct 2026, «funde los selectores que se vea natural con el
 * efecto glassmorphist»).
 *
 * Antes cada campo era una caja con su propio borde y su propio fondo DENTRO de
 * otra caja con borde y fondo: cuatro rectángulos anidados sobre el video, que
 * es lo contrario de un vidrio. Ahora la superficie es UNA —la fila— y los
 * campos no tienen borde ni fondo propios: se separan con una línea de un píxel
 * y se encienden al pasar por encima o al recibir el foco.
 *
 * El `backdrop-blur` vive solo en la fila, una vez. Apilado en cuatro capas se
 * nota en el pintado de cada cuadro y en una pantalla de 120 Hz se ve.
 */
const CELDA = CELDA_BUSCADOR;
const ETIQUETA = ETIQUETA_BUSCADOR;
/** Sin borde ni fondo: el vidrio es la fila, no cada campo. Vive con el
    selector de personas, que lo comparte con `/reservar`. */
const CONTROL = CONTROL_BUSCADOR;

export function BuscadorHero({ grupos, minPersonas, maxPersonas }: Props) {
  const { locale, en, lp } = useLocale();
  const ui = buscadorUI(locale);

  const [valor, setValor] = useState("");
  const [fecha, setFecha] = useState("");
  const [personas, setPersonas] = useState(2);
  const [abierto, setAbierto] = useState(false);

  const cajaRef = useRef<HTMLDivElement>(null);
  const botonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [montado, setMontado] = useState(false);

  useEffect(() => setMontado(true), []);

  // Cerrar al pulsar fuera y con Escape. Sin esto, el panel se queda abierto
  // encima del resto del hero y tapa el botón de «Ver tours».
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      // El panel vive en un portal: no está dentro de `cajaRef`, hay que
      // preguntarle a él aparte o cualquier clic dentro de la lista la cerraría.
      if (panelRef.current?.contains(e.target as Node)) return;
      if (cajaRef.current && !cajaRef.current.contains(e.target as Node)) setAbierto(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAbierto(false);
        botonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  const todas = grupos.flatMap((g) => g.opciones);
  const elegida = todas.find((o) => o.valor === valor);
  const nombreElegido = elegida?.etiqueta ?? ui.queVerTodos;

  // Si eligió un recorrido concreto, el botón es un enlace de verdad a su ficha
  // (que es SSG, así que el prefetch sale barato). Si no, es un ancla a la
  // rejilla y el navegador hace el scroll.
  const esTour = valor.startsWith("tour:");
  const slug = esTour ? valor.slice(5) : "";
  /**
   * 🔴 A dónde lleva «Ver tours» (Manolo, 8 oct): al MOTOR, `/reservar`, no a
   * la rejilla del propio inicio. Quien ya declaró qué, cuándo y cuántos está
   * listo para elegir recorrido y pagar, y dejarlo en el inicio le pedía bajar
   * otra vez. `/reservar` lleva desde hoy el mismo filtro de píldoras, y la
   * intención llega sola por `sessionStorage`.
   * Si eligió un recorrido concreto, a su ficha: ahí está la foto, el
   * itinerario y el módulo de reserva.
   */
  /**
   * 🔴 La fecha y el número de personas VIAJAN con el enlace (8 oct 2026).
   * Antes no: el buscador los guardaba en `sessionStorage` por
   * `anunciarIntencion`, pero la ficha del tour no lee esa intención —solo la
   * rejilla de `/reservar`—, así que quien elegía «Tamul, 20 de noviembre, 4
   * personas» llegaba a la ficha con el calendario vacío y el contador en 2, y
   * tenía que elegirlo TODO otra vez delante del precio.
   *
   * Van en la query y no en `sessionStorage` porque la ficha es estática (SSG):
   * el HTML es el mismo para todos y el módulo de reserva, que es cliente, los
   * lee al montar. `/reservar` sigue con la intención por `sessionStorage`
   * porque ahí lo que viaja es un filtro, no una reserva.
   */
  const destino = esTour
    ? lp(`/tours/${slug}`) + `?${new URLSearchParams({
        ...(fecha ? { fecha } : {}),
        adultos: String(personas),
      })}`
    : lp("/reservar");

  function elegir(nuevo: string) {
    setValor(nuevo);
    setAbierto(false);
    botonRef.current?.focus();
    // La fecha elegida para OTRO recorrido no vale para éste: cada uno tiene su
    // propio calendario y sus propios días cerrados.
    const fechaNueva = nuevo !== valor ? "" : fecha;
    if (nuevo !== valor) setFecha("");
    /* 🔴 Se aplica EN EL ACTO (Manolo, 8 oct). Antes la elección no hacía nada
       hasta pulsar el botón dorado: quien elegía «Cuevas y sótanos» veía abajo
       los quince recorridos de siempre y no tenía forma de saber que su clic
       había contado. Ahora la rejilla de abajo responde sola y el botón queda
       para lo que de verdad es, ir al motor o a la ficha. */
    anunciarIntencion({ que: aFiltro(nuevo), fecha: fechaNueva, personas });
  }

  /* La fecha y el número de personas también viajan solos: son parte de la
     misma declaración y la rejilla los usa para la línea de contexto y para el
     precio del grupo. */
  function cambiarFecha(nueva: string) {
    setFecha(nueva);
    anunciarIntencion({ que: aFiltro(valor), fecha: nueva, personas });
  }

  function cambiarPersonas(n: number) {
    setPersonas(n);
    anunciarIntencion({ que: aFiltro(valor), fecha, personas: n });
  }

  function alBuscar() {
    anunciarIntencion({ que: aFiltro(valor), fecha, personas });
    trackTourEvent("BUSCADOR_HERO", {
      que: valor || "todos",
      conFecha: fecha ? "si" : "no",
      personas,
    });
  }

  const mover = (delta: number) =>
    cambiarPersonas(Math.min(maxPersonas, Math.max(minPersonas, personas + delta)));

  return (
    <div className="w-full max-w-3xl lg:max-w-5xl">
      <div className={FILA_BUSCADOR}>
        {/* ── ¿Qué quieres ver? ── nuestro desplegable, no el del sistema ── */}
        <div ref={cajaRef} className={`${CELDA} relative sm:flex-[1.25]`}>
          <span className={ETIQUETA} id="buscador-que">{ui.queVer}</span>
          <button
            ref={botonRef}
            type="button"
            onClick={() => setAbierto((v) => !v)}
            aria-haspopup="listbox"
            aria-expanded={abierto}
            aria-labelledby="buscador-que"
            className={CONTROL}
          >
            <Search className="h-4 w-4 shrink-0 text-dorado" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-left">{nombreElegido}</span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-crema/40 transition-transform duration-200 ${abierto ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>

          {/* 🔴 El panel es un MODAL CENTRADO en un portal, no un desplegable
              colgado del botón (Manolo, 8 oct: «la lista de los recorridos no se
              despliega completa»). Dos razones medidas:
               · El hero lleva `overflow-clip` —lo necesita para que el video se
                 quede pegado— y recortaba la lista por abajo.
               · Aun fuera del hero, debajo del botón solo quedaban 210 px de
                 ventana en una pantalla de 800, y la lista mide 1,134: colgada
                 del botón no cabe nunca. Centrada y en dos columnas sí.
              Es además el mismo gesto que el calendario de al lado, que también
              abre centrado. */}
          {abierto && montado && createPortal(
            <div className="fixed inset-0 z-[90]">
              <div
                className="absolute inset-0 bg-negro/70 backdrop-blur-sm"
                onClick={() => setAbierto(false)}
                aria-hidden="true"
              />
              <div
                ref={panelRef}
                role="listbox"
                aria-labelledby="buscador-que"
                className="absolute left-1/2 top-1/2 flex max-h-[82vh] w-[calc(100vw-1.5rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 animate-centrado flex-col overflow-hidden rounded-2xl border border-crema/20 bg-negro shadow-2xl"
              >
                <div className="flex items-center justify-between border-b border-crema/10 px-5 py-3.5">
                  <p className="font-cormorant text-lg text-crema">{ui.queVer}</p>
                  <button
                    type="button"
                    onClick={() => { setAbierto(false); botonRef.current?.focus(); }}
                    aria-label={ui.cerrar}
                    className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-crema/50 transition-colors hover:text-crema"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                <div className="overflow-y-auto py-2">
                  <Opcion
                    activa={valor === ""}
                    etiqueta={ui.queVerTodos}
                    onClick={() => elegir("")}
                  />
                  {/* Dos columnas de `sm` para arriba: en una sola, los veinticinco
                      renglones medían 1,134 px y no cabían en ninguna pantalla. */}
                  <div className="sm:grid sm:grid-cols-2 sm:gap-x-2">
                    {grupos.map((g) => (
                      <div key={g.grupo} className="break-inside-avoid">
                        <p className="px-4 pb-1 pt-3 font-dm text-[9px] uppercase tracking-[2px] text-verde-vivo/70">
                          {g.grupo}
                        </p>
                        {g.opciones.map((o) => (
                          <Opcion
                            key={o.valor}
                            activa={valor === o.valor}
                            etiqueta={o.etiqueta}
                            onClick={() => elegir(o.valor)}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )}
        </div>

        <div className={SEPARADOR_BUSCADOR} aria-hidden="true" />

        {/* ── ¿Cuándo? ── el calendario de VERDAD ──
            Con `slug` consulta la disponibilidad real del recorrido y pinta los
            días que quedan; sin él (categoría o nada elegido) no toca la red y
            es un selector de fecha normal. */}
        <div className={`${CELDA} sm:flex-[0.85]`}>
          <span className={ETIQUETA}>{ui.cuando}</span>
          <TourCalendar
            value={fecha}
            onChange={cambiarFecha}
            modo="compact"
            tema="oscuro"
            placeholder={ui.cuandoSinFecha}
            titulo={elegida ? `${ui.cuando} · ${elegida.etiqueta}` : ui.cuando}
            permitirLimpiar
            slug={esTour ? slug : undefined}
            personas={esTour ? personas : 0}
            salida={esTour ? elegida?.salida ?? null : null}
            /* Negro, centrado y sin la tira de atajo (Manolo, 8 oct): una hoja
               color crema saliendo del borde de abajo era un fogonazo blanco en
               mitad de un hero negro, y la tira de catorce días no cabía
               centrada sin recortar el mes. */
            disparadorSinCaja
            hojaTema="oscura"
            hojaPosicion="centro"
            proximosDias={false}
          />
        </div>

        <div className={SEPARADOR_BUSCADOR} aria-hidden="true" />

        {/* ── ¿Cuántos? ──
            🔴 Antes eran los botones −/+ metidos en la fila (Manolo, 8 oct:
            «agrega igual un selector con el mismo estilo»). Los tres campos
            tienen ahora el mismo gesto: se pulsa y abre una hoja centrada. En
            el teléfono además había dos blancos de 36 px pegados a 9 px uno del
            otro, que es la receta para tocar el que no era. */}
        <div className={`${CELDA} sm:flex-[1]`}>
          <span className={ETIQUETA} id="buscador-cuantos">{ui.cuantos}</span>
          <SelectorPersonas
            personas={personas}
            min={minPersonas}
            max={maxPersonas}
            onChange={cambiarPersonas}
            ui={ui}
            montado={montado}
            etiquetaId="buscador-cuantos"
          />
        </div>

        {/* ── Ver tours ──
            Dorado = «reservar» en todo el sitio. Es un enlace, no un botón:
            cuando apunta a la rejilla el ancla hace el scroll, y cuando apunta a
            una ficha se puede abrir en otra pestaña. */}
        <Link
          href={destino}
          onClick={alBuscar}
          className="flex min-h-[64px] items-center justify-center gap-2 bg-dorado px-7 font-dm text-[15px] font-medium uppercase tracking-[2px] text-negro transition-colors duration-200 hover:bg-terracota hover:text-crema sm:min-h-0 sm:min-w-[170px]"
        >
          {esTour ? ui.irAlTour : ui.verTours}
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}

/** Una fila del desplegable. */
function Opcion({ activa, etiqueta, onClick }: { activa: boolean; etiqueta: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={activa}
      onClick={onClick}
      className={`flex w-full min-h-[40px] items-center gap-2 px-4 py-2 text-left font-dm text-sm transition-colors ${
        activa ? "bg-dorado/15 text-dorado" : "text-crema/85 hover:bg-white/10 hover:text-crema"
      }`}
    >
      <Check className={`h-3.5 w-3.5 shrink-0 ${activa ? "opacity-100" : "opacity-0"}`} aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{etiqueta}</span>
    </button>
  );
}
