"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Search, X } from "lucide-react";
import { TourCalendar } from "@/components/booking/TourCalendar";
import { SelectorPersonas } from "@/components/buscador/SelectorPersonas";
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
 * /reservar en tres pasos (28 oct 2026, Manolo: «quedó horrible, hazlo mucho
 * más limpio y con una lógica de reserva fácil en 3 pasos»).
 *
 * 1. ¿Qué quieres ver?  → un lugar o un recorrido (la lista de lugares lleva
 *    al recorrido que lo visita; el buscador filtra la lista).
 * 2. ¿Cuándo y cuántos? → el calendario del recorrido elegido, con el cupo
 *    de cada día para ese grupo, y las personas.
 * 3. Tu reserva         → total, anticipo del 30 % y «Continuar con la
 *    reserva», que abre el carrito ya con todo puesto.
 *
 * Lo que venía del buscador del inicio (recorrido, fecha, personas) se
 * respeta: `leerIntencion()`. Antes esta página eran 15 tarjetas grandes con
 * dos botones cada una, 11 píldoras, una fila de búsqueda y 13,000 px en el
 * celular; en Clarity 8 de 8 búsquedas regresaban sin agregar nada.
 */
const UI = {
  es: {
    pasos: ["Lugar", "Fecha y personas", "Tu reserva"],
    p1: "¿Qué quieres ver?",
    p1Ayuda: "Toca un lugar o un recorrido.",
    lugares: "Por lugar",
    recorridos: "Recorridos",
    p2: "¿Cuándo van y cuántos son?",
    p2Antes: "Primero elige un lugar o recorrido.",
    p3: "Tu reserva",
    p3Antes: "Elige la fecha para ver el total.",
    porPersona: "por persona",
    porVehiculo: "por vehículo",
    porGrupo: "por grupo",
    total: "Total",
    apartas: (pct: number, monto: string, resto: string) => `Apartas con el ${pct} % (${monto}). El resto (${resto}) lo pagas el día del tour.`,
    cancelacion: "Cancelación gratis hasta 48 h antes · Pago seguro con tarjeta",
    continuar: "Continuar con la reserva",
    vehiculoNota: "La ruta y el vehículo los eliges en el siguiente paso.",
    ficha: "Ver la ficha completa",
    whatsapp: "Prefiero reservar por WhatsApp",
    cambiar: "Cambiar",
    sinResultados: "Ningún recorrido se llama así. Prueba con un lugar de la lista.",
    horas: "h",
  },
  en: {
    pasos: ["Place", "Date & people", "Your booking"],
    p1: "What do you want to see?",
    p1Ayuda: "Tap a place or a tour.",
    lugares: "By place",
    recorridos: "Tours",
    p2: "When are you going, and how many?",
    p2Antes: "Pick a place or a tour first.",
    p3: "Your booking",
    p3Antes: "Pick a date to see the total.",
    porPersona: "per person",
    porVehiculo: "per vehicle",
    porGrupo: "per group",
    total: "Total",
    apartas: (pct: number, monto: string, resto: string) => `You hold your spots with ${pct}% (${monto}). The rest (${resto}) is paid on the tour day.`,
    cancelacion: "Free cancellation up to 48 h before · Secure card payment",
    continuar: "Continue booking",
    vehiculoNota: "You choose the route and the vehicle in the next step.",
    ficha: "See the full tour page",
    whatsapp: "I'd rather book on WhatsApp",
    cambiar: "Change",
    sinResultados: "No tour is called that. Try a place from the list.",
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
  const [montado, setMontado] = useState(false);
  const paso2Ref = useRef<HTMLDivElement>(null);
  const paso3Ref = useRef<HTMLDivElement>(null);

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

  const tour = tours.find((x) => x.slug === slug) ?? null;
  const lugares = useMemo(
    () => DESTINOS_DB
      .map((d) => ({ nombre: d.nombre, slug: d.slug, tour: toursQueIncluyen(d.slug)[0] }))
      .filter((l) => l.tour && tours.some((x) => x.slug === l.tour!.slug)),
    [tours],
  );
  const q = normaliza(texto.trim());
  const visibles = q
    ? tours.filter((x) => normaliza(`${x.nombre} ${x.nombreCorto} ${x.tagline} ${x.destinos.join(" ")}`).includes(q))
    : tours;

  const elegir = (s: string, origen: string, destino?: string) => {
    setSlug(s);
    const x = tours.find((y) => y.slug === s);
    if (x && (personas < x.groupMin || personas > x.groupMax)) setPersonas(Math.max(x.groupMin, Math.min(x.groupMax, personas)));
    trackTourEvent(destino ? "DESTINO_TOUR_CLICK" : "FILTRO_RESERVAR", { tour: s, destino, source: origen });
    window.setTimeout(() => paso2Ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
  };

  // ── Precio del paso 3 (la misma cuenta que la ficha y el carrito) ──────────
  const porVehiculo = tour?.precioUnidad === "vehiculo";
  const porGrupo = !!tour?.tarifaGrupo?.length;
  const precioFecha = tour ? precioDeFecha(tour, fecha || null) : 0;
  const total = !tour ? 0
    : porVehiculo ? tour.precio
    : porGrupo ? (precioGrupo(tour, personas) ?? 0)
    : totalRecorrido({
        precio: precioFecha,
        precioLista: tour.precioLista ?? tour.precio,
        escalaPersona: tour.escalaPersona,
        groupMin: tour.groupMin,
        tarifaGrupo: tour.tarifaGrupo,
        precioUnidad: "persona",
      }, personas, 0, 0);
  const pct = pctACobrar();
  const hoy = Math.round((total * pct) / 100);
  const resto = total - hoy;

  const hrefCarrito = tour
    ? lp(`/reservar/carrito?agregar=${tour.slug}${fecha ? `&fecha=${fecha}` : ""}${porVehiculo ? "" : `&adultos=${personas}&ninosMid=0&ninosSmall=0`}`)
    : "#";
  const hrefFicha = tour ? lp(`/tours/${tour.slug}${fecha ? `?fecha=${fecha}&adultos=${personas}` : `?adultos=${personas}`}`) : "#";
  const hrefWa = tour ? waLink(WA_MESSAGES.tourConFecha(en ? "en" : "es", tour.nombre, fecha, personas, 0, total)) : "#";

  const pasoActual = !tour ? 1 : !fecha ? 2 : 3;
  const unidad = porVehiculo ? t.porVehiculo : porGrupo ? t.porGrupo : t.porPersona;

  const Cabecera = ({ n, titulo, listo, sub }: { n: number; titulo: string; listo?: string; sub?: string }) => (
    <div className="flex items-start gap-3">
      <span className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full font-dm text-[12px] font-medium ${
        pasoActual === n ? "bg-dorado text-negro" : pasoActual > n ? "bg-verde-vivo text-negro" : "border border-white/20 text-crema/50"
      }`}>{pasoActual > n ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : n}</span>
      <div className="min-w-0 flex-1">
        <h2 className="font-cormorant text-[24px] font-light leading-tight text-crema sm:text-[28px]">{titulo}</h2>
        {listo && <p className="mt-0.5 truncate font-dm text-[13px] text-verde-vivo">{listo}</p>}
        {!listo && sub && <p className="mt-0.5 font-dm text-[12px] text-crema/50">{sub}</p>}
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl">
      {/* Los tres pasos, de un vistazo. */}
      <ol className="mb-8 grid grid-cols-3 gap-2 font-dm text-[10px] uppercase tracking-[1.5px]">
        {t.pasos.map((p, i) => (
          <li key={p} className={`border-t-2 pt-2 ${pasoActual >= i + 1 ? "border-dorado text-crema" : "border-white/15 text-crema/40"}`}>
            {i + 1} · {p}
          </li>
        ))}
      </ol>

      {/* ── 1 · Lugar ─────────────────────────────────────────────────── */}
      <section className="border border-white/10 bg-negro/40 p-5 sm:p-6">
        <Cabecera n={1} titulo={t.p1} listo={tour ? tour.nombre : undefined} sub={t.p1Ayuda} />
        {tour ? (
          <button type="button" onClick={() => { setSlug(""); setFecha(""); }} className="mt-3 font-dm text-[11px] uppercase tracking-[1.5px] text-crema/50 underline underline-offset-4 hover:text-dorado">
            {t.cambiar}
          </button>
        ) : (
          <div className="mt-5 space-y-5">
            <label className="flex items-center gap-2.5 border border-white/15 bg-white/[0.04] px-3 py-2.5">
              <Search className="h-4 w-4 flex-shrink-0 text-dorado" aria-hidden="true" />
              <input
                type="search"
                aria-label={ui.buscarLabel}
                placeholder={ui.buscar}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                className="min-w-0 flex-1 bg-transparent font-dm text-base text-crema placeholder:text-crema/40 focus:outline-none"
              />
              {!!texto && (
                <button type="button" onClick={() => setTexto("")} aria-label={ui.limpiar} className="text-crema/40 hover:text-dorado">
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </label>

            {!q && (
              <div>
                <p className="mb-2 font-dm text-[10px] uppercase tracking-[2px] text-crema/45">{t.lugares}</p>
                <ul className="flex flex-wrap gap-2">
                  {lugares.map((l) => (
                    <li key={l.slug}>
                      <button
                        type="button"
                        onClick={() => elegir(l.tour!.slug, "lista_reservar", l.slug)}
                        className="min-h-[38px] border border-white/15 px-3 py-1.5 font-dm text-[12px] text-crema/85 transition-colors hover:border-dorado/60 hover:text-crema"
                      >
                        {l.nombre}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <p className="mb-2 font-dm text-[10px] uppercase tracking-[2px] text-crema/45">{t.recorridos}</p>
              {visibles.length === 0 ? (
                <p className="font-dm text-[13px] text-crema/60">{t.sinResultados}</p>
              ) : (
                <ul className="divide-y divide-white/8 border-y border-white/8">
                  {visibles.map((x) => (
                    <li key={x.slug}>
                      <button
                        type="button"
                        onClick={() => elegir(x.slug, "lista_recorridos")}
                        className="flex w-full items-center gap-3 py-2.5 text-left transition-colors hover:bg-white/[0.04]"
                      >
                        <span className="relative h-14 w-20 flex-shrink-0 overflow-hidden bg-negro">
                          <Image src={x.imagenTarjeta ?? x.imagen_hero} alt="" fill sizes="80px" className="object-cover" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-2 font-cormorant text-[18px] leading-tight text-crema sm:text-[19px]">{x.nombreCorto || x.nombre}</span>
                          <span className="line-clamp-1 font-dm text-[11px] text-crema/50">
                            {tourDurTexto(x, t.horas)} · {x.destinos.slice(0, 2).join(" · ")}
                          </span>
                        </span>
                        <span className="flex-shrink-0 text-right">
                          <span className="block font-cormorant text-[18px] leading-none text-dorado">{dinero(x.precio)}</span>
                          <span className="block font-dm text-[9px] uppercase tracking-[1px] text-crema/40">
                            {x.precioUnidad === "vehiculo" ? t.porVehiculo : x.tarifaGrupo?.length ? t.porGrupo : t.porPersona}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ── 2 · Fecha y personas ──────────────────────────────────────── */}
      <section ref={paso2Ref} className={`mt-4 scroll-mt-24 border border-white/10 bg-negro/40 p-5 sm:p-6 ${tour ? "" : "opacity-50"}`} aria-disabled={!tour}>
        <Cabecera n={2} titulo={t.p2} listo={tour && fecha ? `${fechaCorta(fecha, en)} · ${ui.personas(personas)}` : undefined} sub={tour ? undefined : t.p2Antes} />
        {tour && (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 font-dm text-[10px] uppercase tracking-[2px] text-crema/45">{ui.cuando}</p>
              <TourCalendar
                value={fecha}
                onChange={(ymd) => {
                  setFecha(ymd);
                  if (ymd) {
                    trackTourEvent("DATE_SELECTED", { tour: tour.id, fecha: ymd, reservar: true });
                    window.setTimeout(() => paso3Ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
                  }
                }}
                modo="compact"
                tema="oscuro"
                titulo={tour.nombre}
                permitirLimpiar
                slug={porVehiculo ? undefined : tour.slug}
                personas={personas}
                hojaTema="oscura"
                hojaPosicion="centro"
              />
            </div>
            {!porVehiculo && (
              <div>
                <p id="tres-pasos-cuantos" className="mb-1.5 font-dm text-[10px] uppercase tracking-[2px] text-crema/45">{ui.cuantos}</p>
                <div className="border border-white/15 bg-white/[0.04] px-3">
                  <SelectorPersonas
                    personas={personas}
                    min={Math.max(1, tour.groupMin)}
                    max={tour.groupMax}
                    onChange={setPersonas}
                    ui={ui}
                    montado={montado}
                    etiquetaId="tres-pasos-cuantos"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── 3 · Tu reserva ────────────────────────────────────────────── */}
      <section ref={paso3Ref} className={`mt-4 scroll-mt-24 border p-5 sm:p-6 ${tour && fecha ? "border-dorado/50 bg-verde-profundo/40" : "border-white/10 bg-negro/40 opacity-50"}`}>
        <Cabecera n={3} titulo={t.p3} sub={!tour ? t.p2Antes : !fecha ? t.p3Antes : undefined} />
        {tour && fecha && (
          <div className="mt-5">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 font-dm text-[13px] text-crema/80">
              <dt className="text-crema/45">{t.pasos[0]}</dt><dd>{tour.nombre}</dd>
              <dt className="text-crema/45">{t.pasos[1]}</dt><dd>{fechaCorta(fecha, en)}{porVehiculo ? "" : ` · ${ui.personas(personas)}`}</dd>
              <dt className="text-crema/45">{t.total}</dt>
              <dd><span className="font-cormorant text-[26px] leading-none text-dorado">{dinero(total)} MXN</span> <span className="text-[11px] text-crema/45">{unidad === t.porPersona ? "" : unidad}</span></dd>
            </dl>
            {porVehiculo ? (
              <p className="mt-3 font-dm text-[12px] text-crema/60">{t.vehiculoNota}</p>
            ) : (
              <p className="mt-3 font-dm text-[12px] leading-snug text-crema/70">{t.apartas(pct, dinero(hoy), dinero(resto))}</p>
            )}
            <Link
              href={hrefCarrito}
              onClick={() => {
                marcarToqueHumano();
                trackAddToCart({ tourId: tour.id, tourName: tour.nombre, total, cantidad: personas, source: "widget" });
                trackTourEvent("CHECKOUT_STARTED", { tour: tour.id, tour_name: tour.nombre, adults: personas, children: 0, amount: total, fecha, source: "reservar_3pasos" });
              }}
              className="mt-5 flex w-full items-center justify-center bg-dorado py-4 font-dm text-[12px] font-medium uppercase tracking-[2px] text-negro transition-colors hover:bg-lima"
            >
              {t.continuar}
            </Link>
            <p className="mt-2 text-center font-dm text-[10px] text-crema/40">{t.cancelacion}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2 font-dm text-[11px] uppercase tracking-[1.5px]">
              <Link href={hrefFicha} className="text-crema/55 underline underline-offset-4 hover:text-crema">{t.ficha}</Link>
              <a href={hrefWa} target="_blank" rel="noopener noreferrer" data-seccion="reservar_3pasos" data-fecha={fecha} data-personas={personas} className="text-[#25D366] underline underline-offset-4 hover:brightness-110">{t.whatsapp}</a>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
