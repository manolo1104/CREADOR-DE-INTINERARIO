"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ChevronDown, Search, X } from "lucide-react";
import { TourCalendar } from "@/components/booking/TourCalendar";
import { SelectorPersonas } from "@/components/buscador/SelectorPersonas";
import { CELDA_BUSCADOR, ETIQUETA_BUSCADOR, FILA_BUSCADOR, SEPARADOR_BUSCADOR } from "@/components/buscador/estilos";
import { DESTINOS_DB } from "@/lib/destinos";
import { toursQueIncluyen } from "@/lib/tourMapping";
import { precioDeFecha, precioGrupo, tourDurTexto, type Tour } from "@/lib/tours";
import { totalRecorrido } from "@/lib/tourBooking";
import { pctACobrar } from "@/lib/carrito";
import { useLocale } from "@/lib/i18n/useLocale";
import { buscadorUI } from "@/lib/i18n/buscador";
import { leerIntencion, EVENTO_INTENCION, fechaCorta } from "@/lib/intencionInicio";
import { marcarToqueHumano } from "@/lib/toqueHumano";
import { trackTourEvent } from "@/lib/tourTracker";
import { trackAddToCart } from "@/lib/analytics";
import { waLink, WA_MESSAGES } from "@/lib/whatsapp";

/**
 * /reservar: SOLO la fila del buscador y, debajo, tu reserva (28 oct 2026,
 * Manolo: «deja solo el buscador; al hacer clic en ¿qué quieres ver? que se
 * despliegue un menú con los destinos, y si escriben "tamul" que salgan los
 * recorridos donde se menciona Tamul»).
 *
 * 1. ¿Qué quieres ver? → abre una hoja centrada (la misma del buscador del
 *    inicio) con un cuadro para escribir, los LUGARES y los RECORRIDOS. Al
 *    escribir se filtran los dos; un lugar elige el recorrido que lo visita.
 * 2. ¿Cuándo? y ¿Cuántos? en la misma fila (el calendario ya trae el cupo del
 *    recorrido elegido).
 * 3. Debajo, «Tu reserva»: total, anticipo del 30 % y «Continuar con la
 *    reserva», que abre el carrito con todo puesto.
 */
const UI = {
  es: {
    placeholder: "Elige un lugar o recorrido",
    escribe: "Escribe un lugar o un recorrido…",
    lugares: "Lugares",
    recorridos: "Recorridos",
    sinResultados: "Nada se llama así. Prueba con otro nombre.",
    continuar: "Continuar con la reserva",
    eligeLugar: "Elige un lugar",
    eligeFecha: "Elige una fecha",
    tuReserva: "Tu reserva",
    lugar: "Recorrido",
    fechaPersonas: "Fecha y personas",
    total: "Total",
    porVehiculo: "por vehículo",
    porGrupo: "por grupo",
    porPersona: "por persona",
    apartas: (pct: number, monto: string, resto: string) => `Apartas con el ${pct} % (${monto}). El resto (${resto}) lo pagas el día del tour.`,
    vehiculoNota: "La ruta y el vehículo los eliges en el siguiente paso.",
    cancelacion: "Cancelación gratis hasta 48 h antes · Pago seguro con tarjeta",
    ficha: "Ver la ficha completa",
    whatsapp: "Prefiero reservar por WhatsApp",
    pista: "Elige un lugar y una fecha: aquí verás tu total y el anticipo.",
    horas: "h",
  },
  en: {
    placeholder: "Pick a place or a tour",
    escribe: "Type a place or a tour…",
    lugares: "Places",
    recorridos: "Tours",
    sinResultados: "Nothing is called that. Try another name.",
    continuar: "Continue booking",
    eligeLugar: "Pick a place",
    eligeFecha: "Pick a date",
    tuReserva: "Your booking",
    lugar: "Tour",
    fechaPersonas: "Date & people",
    total: "Total",
    porVehiculo: "per vehicle",
    porGrupo: "per group",
    porPersona: "per person",
    apartas: (pct: number, monto: string, resto: string) => `You hold your spots with ${pct}% (${monto}). The rest (${resto}) is paid on the tour day.`,
    vehiculoNota: "You choose the route and the vehicle in the next step.",
    cancelacion: "Free cancellation up to 48 h before · Secure card payment",
    ficha: "See the full tour page",
    whatsapp: "I'd rather book on WhatsApp",
    pista: "Pick a place and a date: your total and deposit show up here.",
    horas: "h",
  },
};

function normaliza(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function ReservaEnTresPasos({ tours }: { tours: Tour[] }) {
  const { locale, en, lp } = useLocale();
  const t = en ? UI.en : UI.es;
  const ui = buscadorUI(locale);
  const dinero = (n: number) => `$${n.toLocaleString(en ? "en-US" : "es-MX")}`;

  const [slug, setSlug] = useState("");
  const [fecha, setFecha] = useState("");
  const [personas, setPersonas] = useState(2);
  const [texto, setTexto] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [montado, setMontado] = useState(false);
  const botonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resumenRef = useRef<HTMLElement>(null);

  // Lo que ya dijo en el buscador del inicio.
  useEffect(() => {
    setMontado(true);
    const aplicar = () => {
      const i = leerIntencion();
      if (!i) return;
      const que = i.que;
      if (que.tipo === "tour" && tours.some((x) => x.slug === que.slug)) setSlug(que.slug);
      if (i.fecha) setFecha(i.fecha);
      if (i.personas) setPersonas(i.personas);
    };
    aplicar();
    window.addEventListener(EVENTO_INTENCION, aplicar);
    return () => window.removeEventListener(EVENTO_INTENCION, aplicar);
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

  const tour = tours.find((x) => x.slug === slug) ?? null;
  type Lugar = { nombre: string; slug: string; tour: { nombre: string; slug: string } };
  const lugares = useMemo<Lugar[]>(
    () => DESTINOS_DB
      .map((d) => ({ nombre: d.nombre, slug: d.slug, tour: toursQueIncluyen(d.slug)[0] }))
      .filter((l): l is Lugar => !!l.tour && tours.some((x) => x.slug === l.tour!.slug)),
    [tours],
  );
  const q = normaliza(texto.trim());
  const lugaresVisibles = q ? lugares.filter((l) => normaliza(`${l.nombre} ${l.tour.nombre}`).includes(q)) : lugares;
  // Un recorrido «menciona» el lugar si va en su nombre, su frase o su lista de destinos.
  const toursVisibles = q
    ? tours.filter((x) => normaliza(`${x.nombre} ${x.nombreCorto} ${x.tagline} ${x.destinos.join(" ")}`).includes(q))
    : tours;

  const elegir = (s: string, origen: string, destino?: string) => {
    setSlug(s);
    const x = tours.find((y) => y.slug === s);
    if (x && (personas < x.groupMin || personas > x.groupMax)) setPersonas(Math.max(x.groupMin, Math.min(x.groupMax, personas)));
    trackTourEvent(destino ? "DESTINO_TOUR_CLICK" : "FILTRO_RESERVAR", { tour: s, destino, source: origen, texto: texto.trim() || undefined });
    setAbierto(false);
    setTexto("");
  };

  // ── Precio (la misma cuenta que la ficha y el carrito) ────────────────────
  const porVehiculo = tour?.precioUnidad === "vehiculo";
  const porGrupo = !!tour?.tarifaGrupo?.length;
  const total = !tour ? 0
    : porVehiculo ? tour.precio
    : porGrupo ? (precioGrupo(tour, personas) ?? 0)
    : totalRecorrido({
        precio: precioDeFecha(tour, fecha || null),
        precioLista: tour.precioLista ?? tour.precio,
        escalaPersona: tour.escalaPersona,
        groupMin: tour.groupMin,
        tarifaGrupo: tour.tarifaGrupo,
        precioUnidad: "persona",
      }, personas, 0, 0);
  const pct = pctACobrar();
  const hoy = Math.round((total * pct) / 100);
  const resto = total - hoy;
  const listo = !!tour && !!fecha;

  const hrefCarrito = tour
    ? lp(`/reservar/carrito?agregar=${tour.slug}${fecha ? `&fecha=${fecha}` : ""}${porVehiculo ? "" : `&adultos=${personas}&ninosMid=0&ninosSmall=0`}`)
    : "#";
  const hrefFicha = tour ? lp(`/tours/${tour.slug}${fecha ? `?fecha=${fecha}&adultos=${personas}` : `?adultos=${personas}`}`) : "#";
  const hrefWa = tour ? waLink(WA_MESSAGES.tourConFecha(en ? "en" : "es", tour.nombre, fecha, personas, 0, total)) : "#";
  const unidad = porVehiculo ? t.porVehiculo : porGrupo ? t.porGrupo : t.porPersona;

  const irAlCarrito = () => {
    if (!tour) return;
    marcarToqueHumano();
    trackAddToCart({ tourId: tour.id, tourName: tour.nombre, total, cantidad: personas, source: "widget" });
    trackTourEvent("CHECKOUT_STARTED", { tour: tour.id, tour_name: tour.nombre, adults: personas, children: 0, amount: total, fecha, source: "reservar_buscador" });
  };

  useEffect(() => {
    if (listo) window.setTimeout(() => resumenRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 250);
  }, [listo]);

  const Opcion = ({ etiqueta, detalle, activa, onClick }: { etiqueta: string; detalle?: string; activa?: boolean; onClick: () => void }) => (
    <button
      type="button"
      role="option"
      aria-selected={!!activa}
      onClick={onClick}
      className={`flex w-full items-baseline justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/[0.06] ${activa ? "text-dorado" : "text-crema/90"}`}
    >
      <span className="font-dm text-[15px]">{etiqueta}</span>
      {detalle && <span className="shrink-0 font-dm text-[10px] uppercase tracking-[1.5px] text-crema/40">{detalle}</span>}
    </button>
  );

  return (
    <div className="mx-auto max-w-5xl">
      {/* ── La fila ─────────────────────────────────────────────────────── */}
      <div className={FILA_BUSCADOR}>
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
            <span className={`min-w-0 flex-1 truncate text-left ${tour ? "text-crema" : "text-crema/50"}`}>{tour ? (tour.nombreCorto || tour.nombre) : t.placeholder}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-crema/40" aria-hidden="true" />
          </button>
        </div>

        <div className={SEPARADOR_BUSCADOR} aria-hidden="true" />

        <div className={`${CELDA_BUSCADOR} sm:flex-[0.85]`}>
          <span id="reservar-cuando" className={ETIQUETA_BUSCADOR}>{ui.cuando}</span>
          <TourCalendar
            value={fecha}
            onChange={(ymd) => { setFecha(ymd); if (ymd) trackTourEvent("DATE_SELECTED", { tour: tour?.id, fecha: ymd, reservar: true }); }}
            modo="compact"
            tema="oscuro"
            placeholder={ui.cuandoSinFecha}
            titulo={tour ? `${ui.cuando} · ${tour.nombreCorto || tour.nombre}` : ui.cuando}
            permitirLimpiar
            slug={tour && !porVehiculo ? tour.slug : undefined}
            personas={tour ? personas : 0}
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
            min={tour ? Math.max(1, tour.groupMin) : 1}
            max={tour ? tour.groupMax : 12}
            onChange={setPersonas}
            ui={ui}
            montado={montado}
            etiquetaId="reservar-cuantos"
          />
        </div>

        {listo ? (
          <Link
            href={hrefCarrito}
            onClick={irAlCarrito}
            className="flex min-h-[60px] items-center justify-center bg-dorado px-7 text-center font-dm text-[13px] font-medium uppercase tracking-[2px] text-negro transition-colors duration-200 hover:bg-lima sm:min-h-0 sm:min-w-[200px]"
          >
            {t.continuar}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => (tour ? document.getElementById("reservar-cuando")?.parentElement?.querySelector<HTMLButtonElement>("button")?.click() : setAbierto(true))}
            className="flex min-h-[60px] items-center justify-center bg-dorado/80 px-7 text-center font-dm text-[13px] font-medium uppercase tracking-[2px] text-negro transition-colors duration-200 hover:bg-dorado sm:min-h-0 sm:min-w-[200px]"
          >
            {tour ? t.eligeFecha : t.eligeLugar}
          </button>
        )}
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
              {lugaresVisibles.length === 0 && toursVisibles.length === 0 && (
                <p className="px-4 py-6 text-center font-dm text-[13px] text-crema/60">{t.sinResultados}</p>
              )}
              <div className="sm:grid sm:grid-cols-2 sm:gap-x-2">
                {lugaresVisibles.length > 0 && (
                  <div>
                    <p className="px-4 pb-1 pt-3 font-dm text-[9px] uppercase tracking-[2px] text-verde-vivo/70">{t.lugares}</p>
                    {lugaresVisibles.map((l) => (
                      <Opcion key={l.slug} etiqueta={l.nombre} detalle={l.tour.nombre} activa={slug === l.tour.slug} onClick={() => elegir(l.tour.slug, "hoja_lugares", l.slug)} />
                    ))}
                  </div>
                )}
                {toursVisibles.length > 0 && (
                  <div>
                    <p className="px-4 pb-1 pt-3 font-dm text-[9px] uppercase tracking-[2px] text-verde-vivo/70">{t.recorridos}</p>
                    {toursVisibles.map((x) => (
                      <Opcion
                        key={x.slug}
                        etiqueta={x.nombreCorto || x.nombre}
                        detalle={`${tourDurTexto(x, t.horas)} · ${dinero(x.precio)}`}
                        activa={slug === x.slug}
                        onClick={() => elegir(x.slug, "hoja_recorridos")}
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

      {/* ── Tu reserva ──────────────────────────────────────────────────── */}
      <section ref={resumenRef} className={`mt-5 scroll-mt-24 border p-5 sm:p-6 ${listo ? "border-dorado/50 bg-verde-profundo/40" : "border-white/10 bg-negro/30"}`} aria-live="polite">
        {listo && tour ? (
          <>
            <h2 className="font-cormorant text-[24px] font-light leading-tight text-crema sm:text-[28px]">{t.tuReserva}</h2>
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 font-dm text-[13px] text-crema/80">
              <dt className="text-crema/45">{t.lugar}</dt><dd>{tour.nombre}</dd>
              <dt className="text-crema/45">{t.fechaPersonas}</dt><dd>{fechaCorta(fecha, en)}{porVehiculo ? "" : ` · ${ui.personas(personas)}`}</dd>
              <dt className="text-crema/45">{t.total}</dt>
              <dd><span className="font-cormorant text-[26px] leading-none text-dorado">{dinero(total)} MXN</span>{unidad !== t.porPersona && <span className="ml-1 text-[11px] text-crema/45">{unidad}</span>}</dd>
            </dl>
            <p className="mt-3 font-dm text-[12px] leading-snug text-crema/70">{porVehiculo ? t.vehiculoNota : t.apartas(pct, dinero(hoy), dinero(resto))}</p>
            <Link href={hrefCarrito} onClick={irAlCarrito} className="mt-5 flex w-full items-center justify-center bg-dorado py-4 font-dm text-[12px] font-medium uppercase tracking-[2px] text-negro transition-colors hover:bg-lima">
              {t.continuar}
            </Link>
            <p className="mt-2 text-center font-dm text-[10px] text-crema/40">{t.cancelacion}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2 font-dm text-[11px] uppercase tracking-[1.5px]">
              <Link href={hrefFicha} className="text-crema/55 underline underline-offset-4 hover:text-crema">{t.ficha}</Link>
              <a href={hrefWa} target="_blank" rel="noopener noreferrer" data-seccion="reservar_buscador" data-fecha={fecha} data-personas={personas} className="text-[#25D366] underline underline-offset-4 hover:brightness-110">{t.whatsapp}</a>
            </div>
          </>
        ) : (
          <p className="text-center font-dm text-[13px] text-crema/50">
            {tour ? `${tour.nombreCorto || tour.nombre} · ${t.pista}` : t.pista}
          </p>
        )}
      </section>
    </div>
  );
}
