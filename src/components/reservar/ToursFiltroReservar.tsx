"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { TarjetaTourReservar } from "@/components/reservar/TarjetaTourReservar";
import { TourCalendar } from "@/components/booking/TourCalendar";
import { SelectorPersonas } from "@/components/buscador/SelectorPersonas";
import { GRUPO_MIN, GRUPO_MAX, TOUR_CATEGORIAS, type Tour, type TourCategoria } from "@/lib/tours";
import type { EtiquetaTour } from "@/lib/etiquetasTour";
import { chipsDeTours, porChipYTexto, porGrupo, minimoQuePiden, chipDeIntencion, PREFIJO_TOUR } from "@/lib/filtroTours";
import { useLocale } from "@/lib/i18n/useLocale";
import { buscadorUI } from "@/lib/i18n/buscador";
import { anunciarIntencion, EVENTO_INTENCION, fechaCorta, leerIntencion, type IntencionInicio } from "@/lib/intencionInicio";
import { waLink, WA_MESSAGES } from "@/lib/whatsapp";
import { trackTourEvent } from "@/lib/tourTracker";

/**
 * El catálogo de `/reservar`, con el mismo filtro que el inicio.
 *
 * 🔴 Por qué existe (8 oct 2026)
 *
 * El buscador del hero ahora manda aquí: quien eligió «cascadas, el 20 de
 * noviembre, 4 personas» llegaba a un catálogo de quince tarjetas sin filtrar y
 * tenía que volver a buscar a ojo lo que acababa de pedir.
 *
 * La intención viaja en `sessionStorage` (`intencionInicio.ts`), así que
 * sobrevive al cambio de página: este componente la lee al montar y aplica la
 * píldora, el grupo y la fecha. No hay query string, y por tanto `/reservar`
 * sigue sirviendo el mismo HTML para todos — que es lo que la deja cacheable.
 *
 * Las píldoras y los filtros son los de `lib/filtroTours.ts`, los mismos del
 * inicio: copiados, los conteos de las dos páginas se desincronizarían en
 * cuanto alguien añadiera una etiqueta.
 *
 * ⚠️ Esta página va sobre verde oscuro, no sobre arena: las píldoras son las
 * mismas pero con los colores de aquí.
 */

interface Props {
  /** Los recorridos ya localizados y ordenados por ventas. */
  tours: Tour[];
  /** El slug del más reservado, para su sello. */
  masReservado?: string;
}

export function ToursFiltroReservar({ tours, masReservado }: Props) {
  const { locale, en } = useLocale();
  const ui = buscadorUI(locale);

  const [chip, setChip] = useState("todos");
  const [texto, setTexto] = useState("");
  // Arranca vacía a propósito: el primer render —el del servidor— trae el
  // catálogo completo, que es lo que lee Google y quien entra sin JavaScript.
  const [intencion, setIntencion] = useState<IntencionInicio | null>(null);
  /** El portal de los dos selectores solo existe ya montado en el cliente. */
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  useEffect(() => {
    const aplicar = (i: IntencionInicio) => {
      setIntencion(i);
      setChip(chipDeIntencion(i));
    };
    const guardada = leerIntencion();
    if (guardada) aplicar(guardada);
    const oir = (e: Event) => aplicar((e as CustomEvent<IntencionInicio>).detail);
    window.addEventListener(EVENTO_INTENCION, oir);
    return () => window.removeEventListener(EVENTO_INTENCION, oir);
  }, []);

  const chips = useMemo(() => chipsDeTours(tours, en), [tours, en]);
  const personas = intencion?.personas ?? 0;
  const fecha = intencion?.fecha ?? "";

  const sinContarGrupo = useMemo(
    () => porChipYTexto(tours, chips, chip, texto),
    [tours, chips, chip, texto],
  );
  const filtrados = useMemo(() => porGrupo(sinContarGrupo, personas), [sinContarGrupo, personas]);
  const soloPorElGrupo = filtrados.length === 0 && sinContarGrupo.length > 0 && !!personas;
  const minimo = soloPorElGrupo ? minimoQuePiden(sinContarGrupo, personas) : 0;
  const hayFiltro = chip !== "todos" || !!texto.trim() || !!personas || !!fecha;

  function limpiar() {
    setChip("todos");
    setTexto("");
    setIntencion(null);
    anunciarIntencion({ que: { tipo: "todos" }, fecha: "", personas: 0 });
  }

  /**
   * Los dos campos de aquí escriben en la MISMA intención que el buscador del
   * hero (8 oct 2026, Manolo: «que se importen las fechas seleccionadas desde
   * el hero, también en ese selector y en el carrito»).
   *
   * Por eso no tienen estado propio: leen de `intencion` y la vuelven a
   * anunciar. Así da igual dónde se elija el día —arriba, en el inicio, o aquí—
   * que `BotonAgregarTour` lo encuentra y siembra el renglón del carrito con él.
   */
  /** La píldora de vuelta a un filtro, que es como viaja en la intención. */
  function queDeChip(id: string): IntencionInicio["que"] {
    if (id === "todos") return { tipo: "todos" };
    if (id.startsWith(PREFIJO_TOUR)) return { tipo: "tour", slug: id.slice(PREFIJO_TOUR.length) };
    // Las tres familias del catálogo; cualquier otra cosa es una etiqueta.
    return TOUR_CATEGORIAS.some((c) => c.id === id)
      ? { tipo: "categoria", id: id as TourCategoria }
      : { tipo: "etiqueta", id: id as EtiquetaTour };
  }

  function cambiar(parcial: Partial<IntencionInicio>) {
    const base: IntencionInicio = intencion ?? { que: { tipo: "todos" }, fecha: "", personas: 0 };
    const nueva = { ...base, ...parcial };
    setIntencion(nueva);
    anunciarIntencion(nueva);
  }

  return (
    <>
      <div className="mb-8">
        <label className="relative mx-auto mb-5 flex max-w-md items-center gap-2.5 border border-white/15 bg-negro/40 px-4 py-3 transition-colors focus-within:border-dorado">
          <Search className="h-4 w-4 shrink-0 text-crema/40" aria-hidden="true" />
          <input
            type="search"
            aria-label={ui.buscarLabel}
            placeholder={ui.buscar}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            /* `text-base`: con menos de 16 px el iPhone hace zoom al enfocar. */
            className="w-full bg-transparent font-dm text-base text-crema placeholder:text-crema/40 focus:outline-none"
          />
          {!!texto && (
            <button
              type="button"
              onClick={() => setTexto("")}
              aria-label={ui.limpiar}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-crema/40 transition-colors hover:text-dorado"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </label>

        {/* ── ¿Cuándo? y ¿Cuántos?, con el mismo gesto que en el hero ──
            Aquí NO hay vidrio: la página es verde oscuro, así que cada campo
            lleva su propia caja, como el buscador de texto de arriba. */}
        <div className="mx-auto mb-5 flex max-w-md flex-col gap-2.5 sm:flex-row">
          <div className="flex-1 border border-white/15 bg-negro/40 px-4 py-2.5 transition-colors focus-within:border-dorado">
            <span id="reservar-cuando" className="mb-0.5 block font-dm text-[10px] uppercase tracking-[2px] text-crema/55">
              {ui.cuando}
            </span>
            <TourCalendar
              value={fecha}
              onChange={(ymd) => cambiar({ fecha: ymd })}
              modo="compact"
              tema="oscuro"
              placeholder={ui.cuandoSinFecha}
              titulo={ui.cuando}
              permitirLimpiar
              /* Sin `slug`: aquí todavía no hay un recorrido elegido, así que no
                 se consulta disponibilidad de nada. */
              disparadorSinCaja
              hojaTema="oscura"
              hojaPosicion="centro"
              proximosDias={false}
            />
          </div>
          <div className="flex-1 border border-white/15 bg-negro/40 px-4 py-2.5 transition-colors focus-within:border-dorado">
            <span id="reservar-cuantos" className="mb-0.5 block font-dm text-[10px] uppercase tracking-[2px] text-crema/55">
              {ui.cuantos}
            </span>
            <SelectorPersonas
              personas={personas || 2}
              min={GRUPO_MIN}
              max={GRUPO_MAX}
              onChange={(n) => cambiar({ personas: n })}
              ui={ui}
              montado={montado}
              etiquetaId="reservar-cuantos"
            />
          </div>
        </div>

        <div className="-mx-6 overflow-x-auto px-6 scrollbar-none md:overflow-visible">
          <div className="mx-auto flex min-w-max justify-center gap-2.5 md:min-w-0 md:flex-wrap">
            {[{ id: "todos", label: ui.todos, n: tours.length }, ...chips].map((c) => {
              const activo = c.id === chip;
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={activo}
                  /* 🔴 La píldora escribe en la intención, no solo en su
                     estado local. Si no, elegir «Cascadas» y luego una fecha
                     devolvía la píldora a la anterior: el campo de fecha vuelve
                     a anunciar la intención completa, y ésta todavía llevaba el
                     `que` viejo. Una sola fuente para los tres campos. */
                  onClick={() => { setChip(c.id); cambiar({ que: queDeChip(c.id) }); trackTourEvent("FILTRO_RESERVAR", { chip: c.id }); }}
                  className={`inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap border px-5 font-dm text-xs uppercase tracking-[2px] transition-colors duration-200 ${
                    activo
                      ? "border-dorado bg-dorado text-negro"
                      : "border-white/15 text-crema/70 hover:border-dorado/50 hover:text-crema"
                  }`}
                >
                  {c.label}
                  <span className={`font-dm text-[10px] tabular-nums ${activo ? "text-negro/50" : "text-crema/35"}`}>
                    {c.n}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <p aria-live="polite" className="mt-5 text-center font-dm text-xs text-crema/50">
          {ui.resultados(filtrados.length)}
          {!!personas && <> · {ui.paraGrupo(personas)}</>}
          {!!fecha && <> · {ui.paraFecha(fechaCorta(fecha, en))}</>}
          {hayFiltro && (
            <>
              {" · "}
              <button
                type="button"
                onClick={limpiar}
                className="underline underline-offset-2 transition-colors hover:text-dorado"
              >
                {ui.limpiar}
              </button>
            </>
          )}
        </p>
      </div>

      {filtrados.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filtrados.map((tour, i) => (
            <TarjetaTourReservar
              key={tour.id}
              tour={tour}
              esTop={masReservado === tour.slug}
              delay={Math.min(i, 8) * 60}
            />
          ))}
        </div>
      ) : (
        <div className="border border-white/10 bg-negro/40 px-6 py-14 text-center">
          <p className="font-cormorant text-2xl font-light text-crema">
            {soloPorElGrupo ? ui.vacioPorGrupo(personas) : ui.vacio}
          </p>
          <p className="mx-auto mt-3 max-w-md font-dm text-sm text-crema/55">
            {soloPorElGrupo && minimo > 0
              ? ui.vacioPorGrupoAyuda(minimo, sinContarGrupo.length)
              : ui.vacioAyuda}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {soloPorElGrupo && (
              <button
                type="button"
                onClick={() => setIntencion((i) => (i ? { ...i, personas: 0 } : null))}
                className="min-h-[44px] bg-dorado px-6 font-dm text-xs uppercase tracking-[2px] text-negro transition-colors hover:bg-lima"
              >
                {ui.verlosIgual(sinContarGrupo.length)}
              </button>
            )}
            <button
              type="button"
              onClick={limpiar}
              className="min-h-[44px] border border-white/20 px-6 font-dm text-xs uppercase tracking-[2px] text-crema/80 transition-colors hover:border-dorado hover:text-dorado"
            >
              {ui.limpiar}
            </button>
            <a
              href={waLink(WA_MESSAGES.general)}
              target="_blank"
              rel="noopener noreferrer"
              data-wa-manual="1"
              onClick={() => trackTourEvent("WHATSAPP_CLICK", { context: "catalogo_reservar", boton: "sin_resultados" })}
              className="inline-flex min-h-[44px] items-center border border-[#25D366]/50 px-6 font-dm text-xs uppercase tracking-[2px] text-[#25D366] transition-colors hover:bg-[#25D366]/10"
            >
              WhatsApp
            </a>
          </div>
        </div>
      )}
    </>
  );
}
