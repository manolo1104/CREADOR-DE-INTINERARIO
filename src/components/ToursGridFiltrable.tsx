"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { TourCard } from "@/components/TourCard";
import { type Tour } from "@/lib/tours";
import { chipsDeTours, porChipYTexto, porGrupo, minimoQuePiden, chipDeIntencion } from "@/lib/filtroTours";
import { useLocale } from "@/lib/i18n/useLocale";
import { buscadorUI } from "@/lib/i18n/buscador";
import {
  ANCLA_RECORRIDOS, EVENTO_INTENCION, fechaCorta, leerIntencion,
  type IntencionInicio,
} from "@/lib/intencionInicio";
import { waLink, WA_MESSAGES } from "@/lib/whatsapp";
import { trackTourEvent } from "@/lib/tourTracker";

/**
 * Los recorridos del catálogo COMPLETO en el inicio, con filtro de verdad.
 *
 * 🔴 Por qué existe (7 oct 2026)
 *
 * El inicio enseñaba 3 de los 15 recorridos (`HOME_TOUR_SLUGS`), y el primero
 * con precio aparecía en la posición 8, a cuatro pantallas de scroll: el 80 %
 * del catálogo era invisible desde la portada. Y las seis píldoras de categoría
 * que parecían filtrar apuntaban a `/experiencias?tipo=…`, una página que no lee
 * `searchParams`: las seis llevaban al mismo listado sin filtrar.
 *
 * Reglas que este componente respeta a propósito:
 *  · **El HTML del servidor trae los 15.** El filtro vive en `useState`, así que
 *    lo que ve Google (y quien entra sin JavaScript) es el catálogo entero.
 *  · **Las tarjetas no llevan calificación.** `4.7 · 161` son las reseñas del
 *    NEGOCIO (`lib/resenas.ts`): repetirlas por tarjeta se lee como la nota de
 *    ESE recorrido, y es justo lo que Google contrasta contra el perfil real.
 *    Se pintan una sola vez, en el bloque de confianza.
 *  · **Nada de cupo en vivo.** Serían 15 consultas en la segunda pantalla.
 *    Además casi todo sale diario, así que «próxima salida: mañana» ×15 es
 *    ruido, y «12 de 12 libres» anuncia que no va nadie.
 *  · **Imágenes siempre en diferido** (`cargaDiferida`): el póster del hero es
 *    el LCP y tiene que seguir siendo la única imagen precargada.
 */

interface Props {
  /** Los 15 recorridos, ya localizados y ordenados por ventas (`rankTour`). */
  tours: Tour[];
  /** A dónde manda «ver todos»: la página del catálogo. */
  hrefCatalogo: string;
}

type Chip = { id: string; label: string; n: number; test: (t: Tour) => boolean };

export function ToursGridFiltrable({ tours, hrefCatalogo }: Props) {
  const { locale, en } = useLocale();
  const ui = buscadorUI(locale);

  const [chip, setChip]   = useState("todos");
  const [texto, setTexto] = useState("");
  // La intención del buscador del hero. Arranca vacía a propósito: el primer
  // render (el del servidor) tiene que traer el catálogo completo.
  const [intencion, setIntencion] = useState<IntencionInicio | null>(null);

  useEffect(() => {
    const aplicar = (i: IntencionInicio) => {
      setIntencion(i);
      setChip(chipDeIntencion(i));
    };
    // Lo que declaró antes de recargar, si el navegador lo recuerda.
    const guardada = leerIntencion();
    if (guardada) aplicar(guardada);

    const oir = (e: Event) => aplicar((e as CustomEvent<IntencionInicio>).detail);
    window.addEventListener(EVENTO_INTENCION, oir);
    return () => window.removeEventListener(EVENTO_INTENCION, oir);
  }, []);

  // Las píldoras y los filtros viven en `lib/filtroTours.ts`: /reservar pinta
  // las mismas y, copiadas, los conteos de las dos páginas se desincronizarían.
  const chips = useMemo(() => chipsDeTours(tours, en), [tours, en]);

  const personas = intencion?.personas ?? 0;
  const fecha = intencion?.fecha ?? "";

  const sinContarGrupo = useMemo(
    () => porChipYTexto(tours, chips, chip, texto),
    [tours, chips, chip, texto],
  );
  const filtrados = useMemo(() => porGrupo(sinContarGrupo, personas), [sinContarGrupo, personas]);

  /**
   * 🔴 El caso que destapó la primera prueba: con las dos personas que trae el
   * buscador por omisión, la píldora «Actividades extremas» devolvía CERO —el
   * rafting sale desde 5 y el rappel desde 4— y la rejilla solo decía «ningún
   * recorrido cumple eso». Es verdad, pero no sirve de nada.
   */
  const soloPorElGrupo = filtrados.length === 0 && sinContarGrupo.length > 0 && !!personas;
  const minimo = soloPorElGrupo ? minimoQuePiden(sinContarGrupo, personas) : 0;

  const hayFiltro = chip !== "todos" || !!texto.trim() || !!personas || !!fecha;

  function limpiar() {
    setChip("todos");
    setTexto("");
    setIntencion(null);
  }

  function elegirChip(id: string) {
    setChip(id);
    trackTourEvent("FILTRO_INICIO", { chip: id });
    // Al cambiar de píldora el carril vuelve al principio: si no, el visitante
    // pulsa «Cascadas» y se queda mirando el hueco donde estaba la novena
    // tarjeta de la lista anterior.
    carrilRef.current?.scrollTo({ left: 0, behavior: "smooth" });
  }

  // ── El carril ──
  const carrilRef = useRef<HTMLDivElement>(null);
  const [puedeAtras, setPuedeAtras] = useState(false);
  const [puedeDelante, setPuedeDelante] = useState(true);

  /**
   * Qué flechas se encienden. Se calcula sobre el `scrollLeft` del PROPIO
   * carril, no con un observador de intersección: en el carrusel de las fotos
   * ese observador no disparaba aunque la pista sí se moviera (ver la memoria
   * del 28 sep). Y no es el scroll de la ventana: escucha solo a este carril.
   */
  const alDeslizar = useCallback(() => {
    const c = carrilRef.current;
    if (!c) return;
    setPuedeAtras(c.scrollLeft > 8);
    setPuedeDelante(c.scrollLeft + c.clientWidth < c.scrollWidth - 8);
  }, []);

  // Al cambiar el filtro cambia el ancho total: hay que recalcular las flechas.
  useEffect(alDeslizar, [alDeslizar, filtrados.length]);

  /**
   * Un paso de flecha.
   *
   * 🔴 Se mueve por MÚLTIPLOS EXACTOS del ancho de una tarjeta. Con
   * `snap-mandatory`, llevar el `scrollLeft` a una posición que no sea de
   * anclaje hace que el navegador lo revierta a 0 — eso costó una tarde con el
   * carrusel de las fotos.
   */
  function deslizar(dir: 1 | -1) {
    const c = carrilRef.current;
    if (!c) return;
    const tarjeta = c.firstElementChild as HTMLElement | null;
    if (!tarjeta) return;
    // El ancho de la tarjeta más el hueco que la separa de la siguiente.
    const paso = tarjeta.offsetWidth + 24;
    const cuantas = Math.max(1, Math.floor(c.clientWidth / paso));
    c.scrollBy({ left: dir * paso * cuantas, behavior: "smooth" });
  }

  return (
    <div id={ANCLA_RECORRIDOS} className="scroll-mt-24">
      {/* ── Controles ── */}
      <div className="mb-8">
        <label className="relative mx-auto mb-5 flex max-w-md items-center gap-2.5 border border-negro/15 bg-white px-4 py-3 transition-colors focus-within:border-verde-selva">
          <Search className="h-4 w-4 shrink-0 text-negro/35" aria-hidden="true" />
          <input
            type="search"
            aria-label={ui.buscarLabel}
            placeholder={ui.buscar}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            /* `text-base`: con menos de 16 px el iPhone hace zoom al enfocar. */
            className="w-full bg-transparent font-dm text-base text-negro placeholder:text-negro/35 focus:outline-none"
          />
          {!!texto && (
            <button
              type="button"
              onClick={() => setTexto("")}
              aria-label={ui.limpiar}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-negro/40 transition-colors hover:text-terracota"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </label>

        {/* En el teléfono las diez píldoras se arrastran de lado; de `md` para
            arriba se acomodan en varios renglones, porque en una sola fila la
            última quedaba cortada contra el borde de la pantalla. */}
        <div className="-mx-6 overflow-x-auto px-6 scrollbar-none md:overflow-visible">
          <div className="mx-auto flex min-w-max justify-center gap-2.5 md:min-w-0 md:flex-wrap">
            {[{ id: "todos", label: ui.todos, n: tours.length }, ...chips].map((c) => {
              const activo = c.id === chip;
              const n = c.n;
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => elegirChip(c.id)}
                  className={`inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap border px-5 font-dm text-xs uppercase tracking-[2px] transition-colors duration-200 ${
                    activo
                      ? "border-verde-selva bg-verde-selva text-crema"
                      : "border-negro/15 bg-white text-negro/60 hover:border-verde-vivo/60 hover:bg-verde-selva/5 hover:text-verde-selva"
                  }`}
                >
                  {c.label}
                  <span className={`font-dm text-[10px] tabular-nums ${activo ? "text-crema/60" : "text-negro/30"}`}>
                    {n}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* La línea de contexto: qué está mirando y por qué sobran o faltan. */}
        <p aria-live="polite" className="mt-5 text-center font-dm text-xs text-negro/50">
          {ui.resultados(filtrados.length)}
          {!!personas && <> · {ui.paraGrupo(personas)}</>}
          {!!fecha && <> · {ui.paraFecha(fechaCorta(fecha, en))}</>}
          {hayFiltro && (
            <>
              {" · "}
              <button
                type="button"
                onClick={limpiar}
                className="underline underline-offset-2 transition-colors hover:text-terracota"
              >
                {ui.limpiar}
              </button>
            </>
          )}
        </p>
      </div>

      {/* ── Las tarjetas, en UNA fila que se desliza ──
          🔴 Era una rejilla de tres columnas: con los quince recorridos eran
          cinco filas y había que bajar cuatro pantallas para ver el catálogo
          entero, que es justo lo que este bloque venía a arreglar. Ahora es un
          carril: una fila, se desliza con el dedo y el inicio no crece aunque
          el catálogo llegue a veinte.

          El deslizar NO lleva JavaScript: es `scroll-snap` del navegador, que
          va fuera del hilo principal y funciona aunque el JS tarde. El poco JS
          que hay es para las flechas, que son un extra de ratón. Es el mismo
          patrón que `TourCarrusel` usa dentro de cada tarjeta. */}
      {filtrados.length > 0 ? (
        <div className="relative">
          <div
            ref={carrilRef}
            onScroll={alDeslizar}
            /* `snap-start` y no `snap-center`: con tarjetas de distinto alto,
               centrar deja media tarjeta cortada en los dos bordes.
               `-mx-6 px-6` para que la primera y la última no queden pegadas al
               borde de la pantalla en el teléfono. */
            /* 🔴 `scroll-pl-6` además del `px-6`: con `snap-mandatory` el navegador
               ancla el borde de la tarjeta al borde del CARRIL, no al del
               relleno, así que al cargar se desplazaba 24 px solo y la primera
               tarjeta salía cortada por la izquierda (y la flecha de «atrás»
               aparecía encendida sin que nadie hubiera deslizado). */
            className="-mx-6 flex snap-x snap-mandatory scroll-pl-6 scroll-pr-6 gap-6 overflow-x-auto px-6 pb-4 scrollbar-none"
          >
            {filtrados.map((t) => (
              <div
                key={t.slug}
                /* El ancho de tarjeta: casi toda la pantalla en el teléfono —se
                   ve que hay otra detrás— y tres y pico en escritorio. */
                className="w-[82vw] max-w-[340px] flex-none snap-start sm:w-[46vw] lg:w-[31%] lg:max-w-none"
              >
                <TourCard tour={t} variant="compact" cargaDiferida />
              </div>
            ))}
          </div>

          {/* Las flechas: solo con ratón, y se apagan en los extremos. */}
          <button
            type="button"
            onClick={() => deslizar(-1)}
            disabled={!puedeAtras}
            aria-label={ui.anterior}
            className="absolute -left-5 top-[38%] z-10 hidden h-11 w-11 items-center justify-center rounded-full border border-negro/15 bg-white text-verde-profundo shadow-md transition-opacity hover:border-verde-selva disabled:pointer-events-none disabled:opacity-0 lg:flex"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => deslizar(1)}
            disabled={!puedeDelante}
            aria-label={ui.siguiente}
            className="absolute -right-5 top-[38%] z-10 hidden h-11 w-11 items-center justify-center rounded-full border border-negro/15 bg-white text-verde-profundo shadow-md transition-opacity hover:border-verde-selva disabled:pointer-events-none disabled:opacity-0 lg:flex"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>

          {/* Para quien no desliza: cuántas quedan a cada lado. */}
          <p className="mt-1 text-center font-dm text-[11px] text-negro/35 lg:hidden">
            {ui.desliza}
          </p>
        </div>
      ) : (
        <div className="border border-negro/10 bg-white px-6 py-14 text-center">
          <p className="font-cormorant text-2xl font-light text-verde-profundo">
            {soloPorElGrupo ? ui.vacioPorGrupo(personas) : ui.vacio}
          </p>
          <p className="mx-auto mt-3 max-w-md font-dm text-sm text-negro/55">
            {soloPorElGrupo && minimo > 0
              ? ui.vacioPorGrupoAyuda(minimo, sinContarGrupo.length)
              : ui.vacioAyuda}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {soloPorElGrupo ? (
              <button
                type="button"
                onClick={() => setIntencion((i) => (i ? { ...i, personas: 0 } : null))}
                className="min-h-[44px] bg-verde-selva px-6 font-dm text-xs uppercase tracking-[2px] text-crema transition-colors hover:bg-verde-vivo"
              >
                {ui.verlosIgual(sinContarGrupo.length)}
              </button>
            ) : null}
            <button
              type="button"
              onClick={limpiar}
              className="min-h-[44px] border border-verde-selva px-6 font-dm text-xs uppercase tracking-[2px] text-verde-selva transition-colors hover:bg-verde-selva/10"
            >
              {ui.limpiar}
            </button>
            <a
              href={waLink(WA_MESSAGES.general)}
              target="_blank"
              rel="noopener noreferrer"
              data-wa-manual="1"
              onClick={() => trackTourEvent("WHATSAPP_CLICK", { context: "rejilla_inicio", boton: "sin_resultados" })}
              className="inline-flex min-h-[44px] items-center border border-[#25D366] px-6 font-dm text-xs uppercase tracking-[2px] text-[#128C4A] transition-colors hover:bg-[#25D366]/10"
            >
              WhatsApp
            </a>
          </div>
        </div>
      )}

      <p className="mt-10 text-center">
        {/* `prefetch` normal: /tours es la página del catálogo y es la segunda
            más visitada del sitio, así que el prefetch se amortiza. */}
        <Link
          href={hrefCatalogo}
          className="font-dm text-xs uppercase tracking-[2px] text-verde-selva underline underline-offset-4 transition-colors hover:text-terracota"
        >
          {ui.verCatalogo}
        </Link>
      </p>
    </div>
  );
}
