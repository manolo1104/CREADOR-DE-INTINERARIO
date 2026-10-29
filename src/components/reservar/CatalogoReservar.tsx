"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Clock, Search, X } from "lucide-react";
import { TourCalendar } from "@/components/booking/TourCalendar";
import { SelectorPersonas } from "@/components/buscador/SelectorPersonas";
import { CELDA_BUSCADOR, ETIQUETA_BUSCADOR, FILA_BUSCADOR, SEPARADOR_BUSCADOR } from "@/components/buscador/estilos";
import { DESTINOS_DB } from "@/lib/destinos";
import { etiquetaUnidad, recogidaDeTour, salidaCorta, tourCollage, tourDurTexto, tourEnFecha, type Tour } from "@/lib/tours";
import { formatMXN, totalRecorrido } from "@/lib/tourBooking";
import { chipDeIntencion, chipsDeTours, porChipYTexto } from "@/lib/filtroTours";
import { fechaCorta, leerIntencion, EVENTO_INTENCION } from "@/lib/intencionInicio";
import { toursQueIncluyen } from "@/lib/tourMapping";
import { useLocale } from "@/lib/i18n/useLocale";
import { buscadorUI } from "@/lib/i18n/buscador";
import { getBooking } from "@/lib/i18n/booking";
import { trackTourEvent } from "@/lib/tourTracker";

/**
 * /reservar como lo hacen los que más venden en línea (GetYourGuide, Viator,
 * Civitatis), 29 oct 2026, Manolo: «quiero que /reservar tenga la misma lógica
 * de escoger la experiencia que las empresas más grandes y con más reservas».
 *
 * Esa lógica, en tres piezas y en este orden:
 *
 * 1. **Buscador arriba** (qué · cuándo · cuántos). «¿Qué quieres ver?» abre la
 *    hoja con lugares y recorridos; elegir uno ahí SE QUEDA EN EL CAMPO y la
 *    lista de abajo se reduce a los recorridos que visitan ese lugar (o a ese
 *    recorrido). El botón dorado baja a la lista.
 *
 *    🔴 Hasta el 29 oct elegir en la hoja abría la ficha del tour en el acto
 *    (pedido del 28 oct). Manolo lo revirtió ese mismo día: «cuando se elige
 *    el lugar o recorrido manda directo a la página… quiero que el cliente
 *    pueda acabar de poner lugar, fecha y personas y que cuando dé en ver
 *    recorridos se muestren ahí mismo en reservar». La ficha sigue siendo el
 *    destino de la TARJETA, no de la hoja.
 * 2. **Píldoras de categoría** en una fila que se desliza (las mismas de
 *    `filtroTours.ts` que usa el inicio, para que los conteos no se
 *    desincronicen) y un orden: más reservados, precio, duración.
 * 3. **Tarjetas de producto**, todas iguales, foto · nombre · duración ·
 *    dificultad · qué se visita · «desde $» · total para el grupo · política de
 *    cancelación. LA TARJETA ENTERA es un enlace a la ficha, que es donde se
 *    elige la fecha y se paga. Nada de carrito desde aquí: el 28 oct se vio que
 *    el carrito sin fecha pierde 6 de 7.
 *
 * Lo que NO lleva, a propósito:
 *  · Calificación por tarjeta: `4.7 · 161` es del NEGOCIO (`resenas.ts`) y
 *    repetida se lee como la nota de ese recorrido. Va una vez, en el hero.
 *  · Botón de WhatsApp por tarjeta: los grandes no lo tienen; la ficha sí.
 *  · El filtro de grupo NO esconde recorridos: con las 2 personas por omisión
 *    el rafting (mín. 5) desaparecía sin explicación. Ahora se ve, con su
 *    «mínimo 5 personas» escrito.
 */
const UI = {
  es: {
    placeholder: "Elige un lugar o recorrido",
    escribe: "Escribe un lugar o un recorrido…",
    lugares: "Lugares",
    recorridos: "Recorridos",
    sinResultados: "Nada se llama así. Prueba con otro nombre.",
    buscar: "Ver recorridos",
    ordenar: "Ordenar",
    orden: { recomendados: "Más reservados", precioAsc: "Precio: menor a mayor", precioDesc: "Precio: mayor a menor", duracion: "Duración" },
    masReservado: "El más reservado",
    garantia: "Garantía Huasteca",
    salidasDiarias: "Salidas diarias",
    visitas: "Visitas",
    desde: "desde",
    totalPara: (n: number) => (n === 1 ? "Total para 1 persona" : `Total para ${n} personas`),
    minimo: (n: number) => `Mínimo ${n} personas`,
    cancelacion: "Cancelación gratis hasta 48 h antes",
    sinReembolso: "Sin reembolso · cambio de fecha hasta 5 días antes",
    verFechas: "Ver fechas y reservar",
    apartas: "Apartas con el 30 %",
    horas: "h",
    visitan: (n: number, lugar: string) => (n === 1 ? `1 recorrido visita ${lugar}` : `${n} recorridos visitan ${lugar}`),
    quitar: "Ver todos",
  },
  en: {
    placeholder: "Pick a place or a tour",
    escribe: "Type a place or a tour…",
    lugares: "Places",
    recorridos: "Tours",
    sinResultados: "Nothing is called that. Try another name.",
    buscar: "See tours",
    ordenar: "Sort",
    orden: { recomendados: "Most booked", precioAsc: "Price: low to high", precioDesc: "Price: high to low", duracion: "Duration" },
    masReservado: "Most booked",
    garantia: "Huasteca Guarantee",
    salidasDiarias: "Daily departures",
    visitas: "Visits",
    desde: "from",
    totalPara: (n: number) => (n === 1 ? "Total for 1 person" : `Total for ${n} people`),
    minimo: (n: number) => `Minimum ${n} people`,
    cancelacion: "Free cancellation up to 48 h before",
    sinReembolso: "Non-refundable · date changes up to 5 days before",
    verFechas: "See dates & book",
    apartas: "Book with 30 % down",
    horas: "h",
    visitan: (n: number, lugar: string) => (n === 1 ? `1 tour visits ${lugar}` : `${n} tours visit ${lugar}`),
    quitar: "See all",
  },
};

type Orden = "recomendados" | "precioAsc" | "precioDesc" | "duracion";

/** Lo puesto en «¿Qué quieres ver?»: un lugar, un recorrido concreto, o nada. */
type Eleccion = { tipo: "lugar"; slug: string } | { tipo: "tour"; slug: string } | null;

/** «Cascada de Tamul (paseo en canoa)» → «Cascada de Tamul»: en la tarjeta solo cabe el nombre. */
function soloNombre(d: string) {
  return d.split(/\s[(—–]/)[0].trim();
}

/** Las paradas que son LUGARES: fuera el «traslado redondo» y el «punto de encuentro». */
function paradasConNombre(destinos: string[]) {
  return destinos.filter((d) => !/traslado|punto de encuentro|base en|meeting point|transfer/i.test(d)).map(soloNombre);
}

function normaliza(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function CatalogoReservar({ tours, masReservado }: { tours: Tour[]; masReservado: string | null }) {
  const { locale, en, lp } = useLocale();
  const t = en ? UI.en : UI.es;
  const ui = buscadorUI(locale);
  const tb = getBooking(locale).tarjeta;
  const dinero = (n: number) => `$${n.toLocaleString(en ? "en-US" : "es-MX")}`;

  const [fecha, setFecha] = useState("");
  const [personas, setPersonas] = useState(2);
  const [texto, setTexto] = useState("");
  const [chip, setChip] = useState("todos");
  const [eleccion, setEleccion] = useState<Eleccion>(null);
  const [orden, setOrden] = useState<Orden>("recomendados");
  const [abierto, setAbierto] = useState(false);
  const [montado, setMontado] = useState(false);
  const botonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);

  /** La ficha del tour con lo ya elegido: la ficha lee `?fecha=` y `?adultos=`. */
  const hrefFichaDe = (s: string, f: string, n: number) =>
    lp(`/tours/${s}${f ? `?fecha=${f}&adultos=${n || 2}` : `?adultos=${n || 2}`}`);

  // Lo que ya dijo en el buscador del inicio.
  useEffect(() => {
    setMontado(true);
    const aplicar = () => {
      const i = leerIntencion();
      if (!i) return;
      if (i.fecha) setFecha(i.fecha);
      if (i.personas) setPersonas(i.personas);
      const que = i.que;
      // Venía del inicio con un recorrido ya elegido: queda puesto en el campo
      // y la lista enseña solo ése. (Antes lo mandaba a la ficha sin preguntar.)
      if (que.tipo === "tour") {
        if (tours.some((x) => x.slug === que.slug)) setEleccion({ tipo: "tour", slug: que.slug });
        return;
      }
      setChip(chipDeIntencion(i));
    };
    aplicar();
    window.addEventListener(EVENTO_INTENCION, aplicar);
    return () => window.removeEventListener(EVENTO_INTENCION, aplicar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tours]);

  // La hoja: foco al cuadro, Escape cierra, sin scroll detrás.
  useEffect(() => {
    if (!abierto) return;
    inputRef.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setAbierto(false); botonRef.current?.focus(); } };
    window.addEventListener("keydown", esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", esc); document.body.style.overflow = prev; };
  }, [abierto]);

  // ── La hoja «¿Qué quieres ver?» ──
  /** Cada lugar con los recorridos del catálogo que de verdad lo visitan. */
  type Lugar = { nombre: string; slug: string; tours: Tour[] };
  const lugares = useMemo<Lugar[]>(
    () => DESTINOS_DB
      .map((d) => ({
        nombre: d.nombre,
        slug: d.slug,
        tours: toursQueIncluyen(d.slug).map((r) => tours.find((x) => x.slug === r.slug)).filter((x): x is Tour => !!x),
      }))
      .filter((l) => l.tours.length > 0),
    [tours],
  );
  const q = normaliza(texto.trim());
  const lugaresVisibles = q
    ? lugares.filter((l) => normaliza(`${l.nombre} ${l.tours.map((x) => x.nombre).join(" ")}`).includes(q))
    : lugares;
  const toursHoja = q
    ? tours.filter((x) => normaliza(`${x.nombre} ${x.nombreCorto} ${x.tagline} ${x.destinos.join(" ")}`).includes(q))
    : tours;

  // ── Lo elegido manda sobre la lista ──
  const lugarElegido = eleccion?.tipo === "lugar" ? lugares.find((l) => l.slug === eleccion.slug) : undefined;
  const tourElegido  = eleccion?.tipo === "tour"  ? tours.find((x) => x.slug === eleccion.slug)   : undefined;
  const nombreElegido = tourElegido ? (tourElegido.nombreCorto || tourElegido.nombre) : lugarElegido ? soloNombre(lugarElegido.nombre) : null;
  /** Los recorridos que caben en lo elegido, ANTES de las píldoras. */
  const base = useMemo<Tour[]>(() => {
    if (tourElegido) return [tourElegido];
    if (lugarElegido) return lugarElegido.tours;
    return tours;
  }, [tours, tourElegido, lugarElegido]);
  /* Con UN solo recorrido en juego (un recorrido elegido, o un lugar que solo
     visita uno), «¿Cuándo?» pasa a ser SU calendario: consulta el cupo real y
     pinta los días que quedan, igual que en el hero del inicio. */
  const unico = eleccion && base.length === 1 ? base[0] : undefined;

  const cerrarHoja = () => {
    setTexto("");
    if (abierto) { setAbierto(false); botonRef.current?.focus(); }
  };

  /** Elegir en la hoja (o quitar lo elegido): se queda en el campo y filtra la lista. No navega. */
  const elegirEnHoja = (nueva: Eleccion, origen: string) => {
    const cambia = nueva?.tipo !== eleccion?.tipo || nueva?.slug !== eleccion?.slug;
    trackTourEvent(nueva?.tipo === "lugar" ? "DESTINO_TOUR_CLICK" : "FILTRO_RESERVAR", {
      ...(nueva?.tipo === "lugar" ? { destino: nueva.slug } : { tour: nueva?.slug ?? "todos" }),
      source: origen, texto: texto.trim() || undefined, fecha: fecha || undefined, personas,
    });
    // La fecha validada con el calendario de OTRO recorrido no vale para éste;
    // una fecha «de cualquier recorrido» sí se conserva.
    if (cambia && unico) setFecha("");
    if (cambia) setChip("todos");
    setEleccion(nueva);
    cerrarHoja();
  };

  // ── Píldoras y orden ──
  // Se cuentan sobre lo elegido: con «Cascada de Tamul» puesto, «Extremas · 4»
  // mentiría cuando solo el rappel pasa por ahí. Las que quedan en cero no salen.
  const chips = useMemo(() => chipsDeTours(base, en), [base, en]);
  const filtrados = useMemo(() => {
    const lista = porChipYTexto(base, chips, chip, "");
    if (orden === "recomendados") return lista; // ya vienen ordenados por reservas
    return [...lista].sort((a, b) =>
      orden === "precioAsc" ? a.precio - b.precio
      : orden === "precioDesc" ? b.precio - a.precio
      : a.duracion_hrs - b.duracion_hrs);
  }, [base, chips, chip, orden]);

  const elegirChip = (id: string) => {
    setChip(id);
    trackTourEvent("FILTRO_RESERVAR", { chip: id, source: "pildoras_reservar", fecha: fecha || undefined, personas });
  };

  const bajarALaLista = () => {
    listaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    trackTourEvent("FILTRO_RESERVAR", {
      source: "boton_buscar", chip, fecha: fecha || undefined, personas,
      eleccion: eleccion ? `${eleccion.tipo}:${eleccion.slug}` : undefined,
      resultados: filtrados.length,
    });
  };

  const Opcion = ({ etiqueta, detalle, activa, onClick }: { etiqueta: string; detalle?: string; activa: boolean; onClick: () => void }) => (
    <button
      type="button"
      role="option"
      aria-selected={activa}
      onClick={onClick}
      className={`flex w-full min-h-[44px] items-center justify-between gap-3 px-4 py-2 text-left transition-colors ${
        activa ? "bg-dorado/15 text-dorado" : "text-crema/90 hover:bg-white/[0.06]"
      }`}
    >
      <span className="flex min-w-0 items-center gap-2">
        <Check className={`h-3.5 w-3.5 shrink-0 ${activa ? "opacity-100" : "opacity-0"}`} aria-hidden="true" />
        <span className="truncate font-dm text-[15px]">{etiqueta}</span>
      </span>
      {detalle && <span className="shrink-0 font-dm text-[10px] uppercase tracking-[1.5px] text-crema/40">{detalle}</span>}
    </button>
  );

  return (
    <div className="mx-auto max-w-6xl">
      {/* ── 1. El buscador ──────────────────────────────────────────────── */}
      <div className={`${FILA_BUSCADOR} mx-auto max-w-5xl`}>
        <div className={`${CELDA_BUSCADOR} sm:flex-[1.3]`}>
          <span className={ETIQUETA_BUSCADOR} id="reservar-que">{ui.queVer}</span>
          <button
            ref={botonRef}
            type="button"
            onClick={() => setAbierto(true)}
            aria-haspopup="listbox"
            aria-expanded={abierto}
            aria-labelledby="reservar-que"
            className="flex w-full min-h-[34px] items-center gap-2.5 bg-transparent font-dm text-base text-crema"
          >
            <Search className="h-4 w-4 shrink-0 text-dorado" aria-hidden="true" />
            <span className={`min-w-0 flex-1 truncate text-left ${nombreElegido ? "text-crema" : "text-crema/50"}`}>{nombreElegido ?? t.placeholder}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-crema/40" aria-hidden="true" />
          </button>
        </div>

        <div className={SEPARADOR_BUSCADOR} aria-hidden="true" />

        <div className={`${CELDA_BUSCADOR} sm:flex-[0.85]`}>
          <span id="reservar-cuando" className={ETIQUETA_BUSCADOR}>{ui.cuando}</span>
          <TourCalendar
            value={fecha}
            onChange={(ymd) => { setFecha(ymd); if (ymd) trackTourEvent("VER_DISPONIBILIDAD", { fecha: ymd, personas, buscadorReservar: true }); }}
            modo="compact"
            tema="oscuro"
            placeholder={ui.cuandoSinFecha}
            titulo={unico ? `${ui.cuando} · ${unico.nombreCorto || unico.nombre}` : ui.cuando}
            permitirLimpiar
            slug={unico?.slug}
            personas={unico ? personas : 0}
            salida={unico ? salidaCorta(unico, en) : null}
            disparadorSinCaja
            hojaTema="oscura"
            hojaPosicion="centro"
            proximosDias={false}
          />
        </div>

        <div className={SEPARADOR_BUSCADOR} aria-hidden="true" />

        <div className={`${CELDA_BUSCADOR} sm:flex-[0.8]`}>
          <span id="reservar-cuantos" className={ETIQUETA_BUSCADOR}>{ui.cuantos}</span>
          <SelectorPersonas
            personas={personas}
            min={1}
            max={12}
            onChange={setPersonas}
            ui={ui}
            montado={montado}
            etiquetaId="reservar-cuantos"
          />
        </div>

        <button
          type="button"
          onClick={bajarALaLista}
          className="flex min-h-[60px] items-center justify-center bg-dorado px-7 text-center font-dm text-[13px] font-medium uppercase tracking-[2px] text-negro transition-colors duration-200 hover:bg-lima sm:min-h-0 sm:min-w-[200px]"
        >
          {t.buscar}
        </button>
      </div>

      {/* ── La hoja «¿Qué quieres ver?» ─────────────────────────────────── */}
      {abierto && montado && createPortal(
        <div className="fixed inset-0 z-[90]">
          <div className="absolute inset-0 bg-negro/70 backdrop-blur-sm" onClick={() => setAbierto(false)} aria-hidden="true" />
          <div
            role="listbox"
            aria-labelledby="reservar-que"
            className="absolute left-1/2 top-1/2 flex max-h-[85vh] w-[calc(100vw-1.5rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 animate-centrado flex-col overflow-hidden rounded-2xl border border-crema/20 bg-negro shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-crema/10 px-4 py-3">
              <Search className="h-4 w-4 shrink-0 text-dorado" aria-hidden="true" />
              <input
                ref={inputRef}
                type="text"
                autoComplete="off"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder={t.escribe}
                aria-label={ui.buscarLabel}
                className="min-w-0 flex-1 bg-transparent font-dm text-base text-crema placeholder:text-crema/40 focus:outline-none"
              />
              <button type="button" onClick={() => { setAbierto(false); botonRef.current?.focus(); }} aria-label={ui.cerrar} className="-mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-crema/50 transition-colors hover:text-crema">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="overflow-y-auto py-2">
              {lugaresVisibles.length === 0 && toursHoja.length === 0 && (
                <p className="px-4 py-6 text-center font-dm text-[13px] text-crema/60">{t.sinResultados}</p>
              )}
              {!q && <Opcion etiqueta={ui.queVerTodos} activa={!eleccion} onClick={() => elegirEnHoja(null, "hoja_todos")} />}
              <div className="sm:grid sm:grid-cols-2 sm:gap-x-2">
                {lugaresVisibles.length > 0 && (
                  <div>
                    <p className="px-4 pb-1 pt-3 font-dm text-[9px] uppercase tracking-[2px] text-verde-vivo/70">{t.lugares}</p>
                    {lugaresVisibles.map((l) => (
                      <Opcion
                        key={l.slug}
                        etiqueta={l.nombre}
                        detalle={l.tours.length === 1 ? (l.tours[0].nombreCorto || l.tours[0].nombre) : ui.resultados(l.tours.length)}
                        activa={eleccion?.tipo === "lugar" && eleccion.slug === l.slug}
                        onClick={() => elegirEnHoja({ tipo: "lugar", slug: l.slug }, "hoja_lugares")}
                      />
                    ))}
                  </div>
                )}
                {toursHoja.length > 0 && (
                  <div>
                    <p className="px-4 pb-1 pt-3 font-dm text-[9px] uppercase tracking-[2px] text-verde-vivo/70">{t.recorridos}</p>
                    {toursHoja.map((x) => (
                      <Opcion
                        key={x.slug}
                        etiqueta={x.nombreCorto || x.nombre}
                        detalle={`${tourDurTexto(x, t.horas)} · ${dinero(x.precio)}`}
                        activa={eleccion?.tipo === "tour" && eleccion.slug === x.slug}
                        onClick={() => elegirEnHoja({ tipo: "tour", slug: x.slug }, "hoja_recorridos")}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* ── 2. Píldoras + orden ─────────────────────────────────────────── */}
      <div ref={listaRef} className="mt-8 scroll-mt-24 sm:mt-10">
        <div className="-mx-6 overflow-x-auto px-6 scrollbar-none">
          <div className="flex min-w-max gap-2">
            {[{ id: "todos", label: ui.todos, n: base.length }, ...chips].map((c) => {
              const activo = c.id === chip;
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => elegirChip(c.id)}
                  className={`inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-full border px-4 font-dm text-[12px] transition-colors duration-200 ${
                    activo
                      ? "border-dorado bg-dorado text-negro"
                      : "border-white/15 bg-white/[0.04] text-crema/75 hover:border-dorado/60 hover:text-crema"
                  }`}
                >
                  {c.label}
                  <span className={`text-[10px] tabular-nums ${activo ? "text-negro/60" : "text-crema/35"}`}>{c.n}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p aria-live="polite" className="font-dm text-[13px] text-crema/60">
            <strong className="font-medium text-crema">
              {lugarElegido ? t.visitan(filtrados.length, soloNombre(lugarElegido.nombre)) : ui.resultados(filtrados.length)}
            </strong>
            {" · "}{ui.paraGrupo(personas)}
            {!!fecha && <> · {ui.paraFecha(fechaCorta(fecha, en))}</>}
            {eleccion && (
              <>
                {" · "}
                <button type="button" onClick={() => elegirEnHoja(null, "quitar_eleccion")} className="underline decoration-crema/30 underline-offset-4 transition-colors hover:text-crema">
                  {t.quitar}
                </button>
              </>
            )}
          </p>
          <label className="flex items-center gap-2 font-dm text-[12px] text-crema/55">
            {t.ordenar}
            <select
              value={orden}
              onChange={(e) => { const o = e.target.value as Orden; setOrden(o); trackTourEvent("FILTRO_RESERVAR", { orden: o, source: "orden_reservar" }); }}
              className="rounded-md border border-white/15 bg-negro px-2 py-1.5 font-dm text-[12px] text-crema focus:border-dorado focus:outline-none"
            >
              {(Object.keys(t.orden) as Orden[]).map((o) => (
                <option key={o} value={o}>{t.orden[o]}</option>
              ))}
            </select>
          </label>
        </div>

        {/* ── 3. Las tarjetas ─────────────────────────────────────────────── */}
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((x, i) => {
            const porVehiculo = x.precioUnidad === "vehiculo";
            const enFecha = tourEnFecha(x, fecha || null);
            const nEnRango = personas >= x.groupMin && personas <= x.groupMax;
            const total = !porVehiculo && nEnRango ? totalRecorrido(enFecha, personas) : null;
            const foto = tourCollage(x)[0]?.src ?? x.imagen_hero;
            const n = Math.max(x.groupMin, Math.min(x.groupMax, personas));
            return (
              <Link
                key={x.slug}
                href={hrefFichaDe(x.slug, fecha, n)}
                onClick={() => trackTourEvent("FILTRO_RESERVAR", { tour: x.slug, source: "tarjeta_reservar", posicion: i + 1, chip, orden, fecha: fecha || undefined, personas: n })}
                /* En el teléfono la tarjeta es HORIZONTAL (foto a la izquierda, como la
                   lista de Viator o Booking): quince tarjetas verticales eran 9,000 px.
                   De `sm` para arriba es vertical, en rejilla de 2 y 3 columnas. */
                className="group flex flex-row overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] transition-colors hover:border-dorado/50 focus:outline-none focus-visible:border-dorado sm:flex-col"
              >
                <div className="relative w-[38%] shrink-0 self-stretch overflow-hidden sm:aspect-[3/2] sm:w-auto sm:self-auto">
                  <Image
                    src={foto}
                    alt={x.nombre}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    loading={i < 3 ? "eager" : "lazy"}
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-negro/70 via-transparent to-transparent" aria-hidden="true" />
                  <div className="absolute left-2 top-2 flex flex-col items-start gap-1 sm:left-3 sm:top-3 sm:flex-row sm:flex-wrap">
                    {x.slug === masReservado && (
                      <span className="rounded-full bg-dorado px-2 py-0.5 font-dm text-[8px] font-bold uppercase tracking-[1px] text-negro sm:px-2.5 sm:py-1 sm:text-[9px] sm:tracking-[1.5px]">{t.masReservado}</span>
                    )}
                    {x.garantiaHuasteca && (
                      <span className="rounded-full bg-negro/70 px-2 py-0.5 font-dm text-[8px] uppercase tracking-[1px] text-crema backdrop-blur sm:px-2.5 sm:py-1 sm:text-[9px] sm:tracking-[1.5px]">✦ {t.garantia}</span>
                    )}
                  </div>
                  <span className="absolute bottom-2 left-2 hidden rounded-full bg-negro/70 px-2.5 py-1 font-dm text-[10px] text-crema backdrop-blur sm:bottom-3 sm:left-3 sm:inline">
                    <Clock className="mr-1 inline h-3 w-3 -translate-y-px" aria-hidden="true" />{tourDurTexto(x, tb.unidadH)} · {tb.dificultad[x.dificultad] ?? x.dificultad}
                  </span>
                </div>

                <div className="flex min-w-0 flex-1 flex-col p-3.5 sm:p-5">
                  <p className="font-dm text-[9px] uppercase tracking-[2px] text-verde-vivo">{x.tipo}</p>
                  <h3 className="mt-0.5 font-cormorant text-[20px] font-light leading-tight text-crema sm:mt-1 sm:text-[22px]">{x.nombreCorto || x.nombre}</h3>
                  <p className="mt-1 font-dm text-[11px] text-crema/60 sm:hidden">
                    <Clock className="mr-1 inline h-3 w-3 -translate-y-px" aria-hidden="true" />{tourDurTexto(x, tb.unidadH)} · {tb.dificultad[x.dificultad] ?? x.dificultad}
                  </p>
                  <p className="mt-1.5 line-clamp-2 font-dm text-[12px] leading-snug text-crema/55">
                    {paradasConNombre(x.destinos).slice(0, 4).join(" · ")}
                  </p>
                  {!recogidaDeTour(x).horaTexto && (
                    <p className="mt-1.5 hidden font-dm text-[11px] text-verde-vivo/80 sm:mt-2 sm:block">✦ {t.salidasDiarias}</p>
                  )}

                  <div className="mt-3 flex flex-col items-start gap-2 border-t border-white/8 pt-3 sm:mt-auto sm:flex-row sm:items-end sm:justify-between sm:gap-3 sm:pt-4">
                    <div className="min-w-0">
                      <p className="font-dm text-[10px] uppercase tracking-[1.5px] text-crema/40">{t.desde}</p>
                      <p className="whitespace-nowrap font-cormorant text-[24px] font-light leading-none text-dorado sm:text-[28px]">
                        {formatMXN(enFecha.precio)}
                        <span className="ml-1 font-dm text-[10px] text-crema/45">MXN {etiquetaUnidad(x, en)}</span>
                      </p>
                      {total !== null ? (
                        <p className="mt-1 font-dm text-[12px] text-crema/80">{t.totalPara(personas)}: <strong className="font-medium text-crema">{formatMXN(total)}</strong></p>
                      ) : !porVehiculo && personas < x.groupMin ? (
                        <p className="mt-1 font-dm text-[12px] text-dorado/80">{t.minimo(x.groupMin)}</p>
                      ) : null}
                    </div>
                    <span className="hidden shrink-0 rounded-full bg-verde-selva px-4 py-2.5 font-dm text-[11px] font-medium uppercase tracking-[1.5px] text-crema transition-colors group-hover:bg-verde-vivo sm:inline-block">
                      {t.verFechas}
                    </span>
                    <span className="shrink-0 font-dm text-[11px] font-medium text-dorado sm:hidden" aria-hidden="true">{t.verFechas} →</span>
                  </div>
                  <p className="mt-2 hidden font-dm text-[10px] text-crema/40 sm:mt-3 sm:block">
                    {t.apartas} · {x.cancelacion ? t.sinReembolso : t.cancelacion}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        {filtrados.length === 0 && (
          <div className="mt-5 border border-white/10 px-6 py-12 text-center">
            <p className="font-cormorant text-2xl font-light text-crema">{ui.vacio}</p>
            <button type="button" onClick={() => { setEleccion(null); elegirChip("todos"); }} className="mt-5 min-h-[44px] border border-dorado px-6 font-dm text-xs uppercase tracking-[2px] text-dorado transition-colors hover:bg-dorado/10">
              {ui.limpiar}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
