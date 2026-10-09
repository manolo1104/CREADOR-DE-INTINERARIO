"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { TarjetaTourReservar } from "@/components/reservar/TarjetaTourReservar";
import { TourCalendar } from "@/components/booking/TourCalendar";
import { SelectorPersonas } from "@/components/buscador/SelectorPersonas";
import { CELDA_BUSCADOR, ETIQUETA_BUSCADOR, FILA_BUSCADOR, SEPARADOR_BUSCADOR } from "@/components/buscador/estilos";
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

/** El degradado que avisa de que la fila de píldoras sigue a la derecha. */
const BORDE_DIFUMINADO = "linear-gradient(to right, #000 0, #000 calc(100% - 48px), transparent 100%)";

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

  /**
   * El resultado de «Ver disponibilidad»: qué recorridos admiten a ESTE grupo
   * en ESTA fecha, según la base.
   *
   * 🔴 Esto NO es lo mismo que el filtro por tamaño de grupo que ya había. Ése
   * mira el catálogo —el rafting sale desde 5 personas— y contesta sin
   * preguntarle a nadie. Éste pregunta por los lugares que de verdad quedan ese
   * día, que es lo que el visitante quiere saber antes de elegir y lo único que
   * el catálogo no puede contestar solo.
   *
   * Se guarda junto a la fecha y el grupo con los que se consultó: en cuanto
   * cambia cualquiera de los dos, el resultado deja de valer y se descarta. Un
   * «8 con lugar» de otra fecha es peor que no decir nada.
   */
  const [cupo, setCupo] = useState<{ fecha: string; personas: number; conLugar: string[]; sinLugar: string[] } | null>(null);
  const [consultando, setConsultando] = useState(false);
  const cupoVigente = cupo && cupo.fecha === fecha && cupo.personas === personas ? cupo : null;

  useEffect(() => {
    if (cupo && (cupo.fecha !== fecha || cupo.personas !== personas)) setCupo(null);
  }, [fecha, personas, cupo]);

  async function verDisponibilidad() {
    if (!fecha) {
      // Sin fecha no hay nada que consultar. En vez de un botón apagado, el
      // foco va al campo que falta.
      document.getElementById("reservar-cuando")?.parentElement?.querySelector("button")?.click();
      return;
    }
    setConsultando(true);
    trackTourEvent("VER_DISPONIBILIDAD", { fecha, personas });
    try {
      const r = await fetch(`/api/tours/disponibilidad-del-dia?fecha=${fecha}&personas=${personas}`);
      const d = await r.json();
      if (Array.isArray(d?.conLugar)) {
        setCupo({ fecha, personas, conLugar: d.conLugar, sinLugar: d.sinLugar ?? [] });
      }
    } catch {
      // Falla en silencio: la rejilla se queda como estaba, con todo a la vista.
    } finally {
      setConsultando(false);
    }
  }

  const sinContarGrupo = useMemo(
    () => porChipYTexto(tours, chips, chip, texto),
    [tours, chips, chip, texto],
  );
  const porTamano = useMemo(() => porGrupo(sinContarGrupo, personas), [sinContarGrupo, personas]);
  /**
   * Tras consultar, solo los que tienen lugar. Los recorridos que no llevan
   * cupo por fecha (el RZR, que se cobra por vehículo) no vienen en ninguna de
   * las dos listas y se quedan: de ellos la consulta no dice nada, y
   * esconderlos sería afirmar lo que no se sabe.
   */
  const filtrados = useMemo(() => {
    if (!cupoVigente) return porTamano;
    const sin = new Set(cupoVigente.sinLugar);
    return porTamano.filter((t) => !sin.has(t.slug));
  }, [porTamano, cupoVigente]);
  /**
   * Cuántos quitó LA CONSULTA, no cuántos están llenos en total.
   *
   * 🔴 La primera versión decía los que la base reportó sin lugar —cinco— y de
   * la rejilla solo desaparecía uno: los otros cuatro ya estaban fuera porque
   * no salen con diez personas (la Gruta de Xilo sale con ocho). Un número que
   * no cuadra con lo que se ve en pantalla hace dudar de los dos.
   */
  const ocultosPorCupo = useMemo(() => {
    if (!cupoVigente) return 0;
    const sin = new Set(cupoVigente.sinLugar);
    return porTamano.filter((t) => sin.has(t.slug)).length;
  }, [porTamano, cupoVigente]);
  const soloPorElGrupo = porTamano.length === 0 && sinContarGrupo.length > 0 && !!personas;
  const minimo = soloPorElGrupo ? minimoQuePiden(sinContarGrupo, personas) : 0;
  const hayFiltro = chip !== "todos" || !!texto.trim() || !!personas || !!fecha;

  function limpiar() {
    setChip("todos");
    setTexto("");
    setIntencion(null);
    setCupo(null);
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
        {/* ── Buscar · ¿Cuándo? · ¿Cuántos? ──
            Una SOLA fila de vidrio, la misma del buscador del inicio
            (`components/buscador/estilos.ts`). Antes eran tres cajas con su
            propio borde, apiladas una encima de otra: el mismo gesto del hero
            pero con tres veces el ruido. */}
        <div className="mb-5 w-full">
          <div className={FILA_BUSCADOR}>
            {/* El rótulo es el CORTO, el mismo del hero: «Buscar un recorrido
                por nombre o lugar» partía en dos renglones y estiraba la fila
                entera. El largo sigue estando, de `aria-label`, que es donde
                hace falta. */}
            <label className={`${CELDA_BUSCADOR} sm:flex-[1.25]`}>
              <span className={ETIQUETA_BUSCADOR}>{ui.queVer}</span>
              <span className="flex items-center gap-2.5">
                <Search className="h-4 w-4 shrink-0 text-dorado" aria-hidden="true" />
                <input
                  type="search"
                  aria-label={ui.buscarLabel}
                  placeholder={ui.buscar}
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  /* `text-base`: con menos de 16 px el iPhone hace zoom al enfocar. */
                  className="min-w-0 flex-1 bg-transparent font-dm text-base text-crema placeholder:text-crema/40 focus:outline-none"
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
              </span>
            </label>

            <div className={SEPARADOR_BUSCADOR} aria-hidden="true" />

            <div className={`${CELDA_BUSCADOR} sm:flex-[0.85]`}>
              <span id="reservar-cuando" className={ETIQUETA_BUSCADOR}>{ui.cuando}</span>
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

            <div className={SEPARADOR_BUSCADOR} aria-hidden="true" />

            <div className={`${CELDA_BUSCADOR} sm:flex-[1]`}>
              <span id="reservar-cuantos" className={ETIQUETA_BUSCADOR}>{ui.cuantos}</span>
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

            {/* El botón que de verdad consulta. Dorado y con la misma caja que
                «Ver tours» del hero, porque es el mismo gesto: aquí terminas de
                decir lo que quieres. La diferencia es que éste va a la base y
                vuelve con los recorridos que SÍ tienen lugar ese día. */}
            <button
              type="button"
              onClick={verDisponibilidad}
              disabled={consultando}
              className="flex min-h-[60px] items-center justify-center gap-2 bg-dorado px-7 font-dm text-[13px] font-medium uppercase tracking-[2px] text-negro transition-colors duration-200 hover:bg-terracota hover:text-crema disabled:cursor-wait disabled:opacity-70 sm:min-h-0 sm:min-w-[190px]"
            >
              {consultando ? ui.comprobando : fecha ? ui.verDisponibilidad : ui.eligeFechaPrimero}
            </button>
          </div>
        </div>

        {/* 🔴 UNA fila, también en escritorio (9 oct 2026). Las once píldoras
            con `md:flex-wrap` caían en dos renglones centrados, y dos bandas de
            botones dorados y grises entre el buscador y las fotos eran el bloque
            más ruidoso de la página. En una sola fila que se desliza ocupan la
            mitad y se leen como lo que son: un filtro, no un menú. */}
        <div
          className="-mx-6 overflow-x-auto px-6 scrollbar-none"
          /* El degradado del borde derecho dice que hay más píldoras sin
             pintar una flecha ni robar espacio. Sin él, en escritorio la
             última se ve cortada y parece un fallo. */
          style={{ maskImage: BORDE_DIFUMINADO, WebkitMaskImage: BORDE_DIFUMINADO }}
        >
          <div className="flex min-w-max gap-2.5">
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
                  className={`inline-flex min-h-[40px] items-center gap-2 whitespace-nowrap border px-4 font-dm text-[11px] uppercase tracking-[2px] transition-colors duration-200 ${
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

        {/* Lo que contestó la base, con la fecha escrita entera: «8 recorridos
            con lugar el sábado 25 de octubre». Sin la fecha delante, un número
            suelto no se puede comprobar. */}
        {cupoVigente && (
          <p role="status" className="mt-5 text-center font-dm text-[13px] text-lima">
            {filtrados.length === 0
              ? <span className="text-dorado">{ui.sinLugarNinguno(fechaCorta(fecha, en))}</span>
              : <>
                  {ui.conLugar(filtrados.length, fechaCorta(fecha, en))}
                  {ocultosPorCupo > 0 && (
                    <span className="text-crema/45"> · {ui.sinLugarAlgunos(ocultosPorCupo)}</span>
                  )}
                </>}
            {" · "}
            <button
              type="button"
              onClick={() => setCupo(null)}
              className="underline underline-offset-2 text-crema/50 transition-colors hover:text-dorado"
            >
              {ui.verTodosIgual}
            </button>
          </p>
        )}

        {/* El renglón de siempre se calla mientras está el de disponibilidad:
            decían lo mismo con otras palabras, uno encima del otro. */}
        <p aria-live="polite" className={`mt-5 text-center font-dm text-xs text-crema/50 ${cupoVigente ? "sr-only" : ""}`}>
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
              // Lo que ya declaró en el buscador: la tarjeta enseña SU total,
              // no el precio por cabeza que hay que multiplicar.
              personas={personas}
              fecha={fecha}
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
