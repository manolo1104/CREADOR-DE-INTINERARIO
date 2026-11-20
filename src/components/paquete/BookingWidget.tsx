"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Minus, Plus, ShieldCheck } from "lucide-react";
import { TourCalendar } from "@/components/booking/TourCalendar";
import { cotizarPedido, guardarPedido, pedidoInicial, type PedidoPaquete } from "@/lib/paqueteCarrito";
import { MAX_PERSONAS_PAQUETE } from "@/lib/paquetePricing";
import { trackTourEvent } from "@/lib/tourTracker";
import { trackBeginCheckout } from "@/lib/analytics";
import { waLink } from "@/lib/whatsapp";
import { conReferencia } from "@/lib/refWhatsapp";
import type { HabitacionFicha } from "@/lib/fichaPaquete";
import { textosFicha } from "@/lib/i18n/fichaPaqueteTextos";
import type { Locale } from "@/lib/i18n/config";

/** Lo que manda la tabla de precios o la barra del celular al cotizador. */
export const EVENTO_COTIZAR = "paquete:cotizar";
export const ID_COTIZADOR = "cotizador";

/**
 * El cotizador de la ficha (20 nov 2026). NO calcula precios propios: usa
 * `cotizarPedido` (`paqueteCarrito.ts`), la MISMA función que pinta el
 * checkout, que a su vez usa `computePaqueteCharge`, la que cobra el servidor.
 *
 * Dos salidas, cada una honesta con lo que hace:
 *  · «Reservar y pagar»: guarda el pedido con `guardarPedido` y abre el
 *    checkout de siempre (`/reservar/carrito?paquete=`) ya lleno. Aquí no se
 *    cobra ni se confirma nada.
 *  · «Enviar por WhatsApp»: el mensaje con todo lo elegido; es una SOLICITUD.
 */
export function BookingWidget({
  slug, nombre, duracion, habitaciones, precioDesde, unidad, carritoHref, locale,
}: {
  slug: string;
  precioDesde: string;
  unidad: string;
  nombre: string;
  duracion: string;
  habitaciones: HabitacionFicha[];
  carritoHref: string;
  locale: Locale;
}) {
  const t = textosFicha(locale);
  const router = useRouter();
  const [pedido, setPedido] = useState<PedidoPaquete>(() => ({ ...pedidoInicial(slug), habitacionId: habitaciones[0]?.id ?? "" }));
  const [bebes, setBebes] = useState(0);
  const [quien, setQuien] = useState("");
  const [comentarios, setComentarios] = useState("");
  const empezado = useRef(false);
  const raiz = useRef<HTMLDivElement>(null);
  const en = locale === "en";
  const mxn = (n: number) => `$${n.toLocaleString(en ? "en-US" : "es-MX")}`;

  const hab = habitaciones.find((h) => h.id === pedido.habitacionId) ?? habitaciones[0];
  const personas = pedido.adultos + pedido.childrenSmall;
  const grande = personas > MAX_PERSONAS_PAQUETE;
  const cot = useMemo(() => (grande ? null : cotizarPedido(pedido, !!hab?.vistaMontana, false)), [pedido, hab, grande]);

  const empezar = () => {
    if (empezado.current) return;
    empezado.current = true;
    trackTourEvent("BOOKING_WIDGET_START", { slug });
  };
  const cambiar = (p: Partial<PedidoPaquete>) => { empezar(); setPedido((x) => ({ ...x, ...p })); };

  // La tabla de precios y la barra del celular mandan aquí («Cotizar 4 adultos»).
  useEffect(() => {
    const oir = (e: Event) => {
      const adultos = (e as CustomEvent<{ adultos?: number }>).detail?.adultos;
      if (adultos) cambiar({ adultos: Math.min(MAX_PERSONAS_PAQUETE, Math.max(2, adultos)) });
      const suave = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      raiz.current?.scrollIntoView({ behavior: suave ? "smooth" : "auto", block: "start" });
    };
    window.addEventListener(EVENTO_COTIZAR, oir);
    return () => window.removeEventListener(EVENTO_COTIZAR, oir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const contador = (campo: "adultos" | "childrenSmall" | "bebes", d: number) => {
    if (campo === "bebes") { empezar(); setBebes((b) => Math.max(0, Math.min(6, b + d))); return; }
    const min = campo === "adultos" ? 2 : 0;
    const nuevo = Math.max(min, Math.min(MAX_PERSONAS_PAQUETE, pedido[campo] + d));
    if (nuevo === pedido[campo]) return;
    cambiar({ [campo]: nuevo } as Partial<PedidoPaquete>);
    trackTourEvent("TRAVELER_COUNT_CHANGE", { slug, campo, valor: nuevo });
  };

  const fechaLegible = pedido.fecha
    ? new Date(`${pedido.fecha}T12:00:00`).toLocaleDateString(en ? "en-US" : "es-MX", { weekday: "short", day: "numeric", month: "long", year: "numeric" })
    : "";

  const reservar = () => {
    if (!cot) return;
    guardarPedido(pedido);
    trackTourEvent("BOOKING_SUBMISSION", { slug, total: cot.completo.total, personas, fecha: pedido.fecha || null, habitacion: pedido.habitacionId });
    trackBeginCheckout({
      renglones: [{ tourId: slug, tourName: nombre, total: cot.completo.total, cantidad: personas }],
      total: cot.completo.total,
      source: "paquete",
    });
    const q = new URLSearchParams({ paquete: slug });
    if (pedido.fecha) q.set("fecha", pedido.fecha);
    q.set("adultos", String(pedido.adultos));
    router.push(`${carritoHref}?${q.toString()}`);
  };

  const whatsapp = () => {
    const msg = t.cotWaPlantilla({
      nombre, fecha: fechaLegible, duracion,
      adultos: pedido.adultos, ninos: pedido.childrenSmall, bebes,
      habitacion: `${t.cotHabitaciones(cot?.completo.habitaciones ?? Math.ceil(personas / 4))} · ${hab?.nombre ?? ""}`,
      total: cot ? `${mxn(cot.completo.total)} MXN` : t.cotSolicitar,
      comentarios: comentarios.trim(), quien: quien.trim(),
    });
    const datos = { slug, personas, total: cot?.completo.total ?? null, fecha: pedido.fecha || null };
    trackTourEvent("WHATSAPP_CLICK", { ...datos, origen: "cotizador", boton: "cotizador-paquete", paquete: slug });
    trackTourEvent("WHATSAPP_PACKAGE_CLICK", datos);
    trackTourEvent("QUOTE_REQUEST", { ...datos, grande });
    window.open(conReferencia(waLink(msg)), "_blank", "noopener,noreferrer");
  };

  const Fila = ({ campo, titulo, nota, valor }: { campo: "adultos" | "childrenSmall" | "bebes"; titulo: string; nota: string; valor: number }) => (
    <div className="flex items-center justify-between gap-3 py-2">
      <div>
        <p className="font-dm text-sm text-crema">{titulo}</p>
        <p className="font-dm text-[11px] text-crema/50">{nota}</p>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => contador(campo, -1)} aria-label={`− ${titulo}`} className="tactil flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-crema hover:border-white/40 disabled:opacity-30">
          <Minus className="h-4 w-4" aria-hidden="true" />
        </button>
        <span className="w-6 text-center font-dm text-base text-crema" aria-live="polite">{valor}</span>
        <button type="button" onClick={() => contador(campo, 1)} aria-label={`+ ${titulo}`} className="tactil flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-crema hover:border-white/40">
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );

  return (
    <div ref={raiz} id={ID_COTIZADOR} className="scroll-mt-28 rounded-2xl border border-white/12 bg-verde-profundo/40 p-5 backdrop-blur-sm">
      <p className="font-dm text-[11px] uppercase tracking-[2px] text-crema/50">{t.desde}</p>
      <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
        <span className="whitespace-nowrap font-cormorant text-[38px] leading-none text-dorado">{precioDesde}</span>
        <span className="whitespace-nowrap font-dm text-[12px] text-crema/60">MXN {unidad}</span>
      </p>
      <h2 className="mt-4 border-t border-white/10 pt-4 font-cormorant text-[26px] font-light text-crema">{t.cotTitulo}</h2>

      {/* 1 · Fecha: el calendario real de disponibilidad del paquete */}
      <div className="mt-4 cal-oscuro" onClickCapture={empezar}>
        <p className="mb-2 font-dm text-[11px] uppercase tracking-[2px] text-crema/50">{t.cotFecha}</p>
        <TourCalendar
          value={pedido.fecha}
          onChange={(f) => cambiar({ fecha: f })}
          modo="compact"
          tema="oscuro"
          slug={slug}
          personas={personas}
          titulo={nombre}
          placeholder={t.cotFechaPendiente}
          permitirLimpiar
        />
      </div>

      {/* 2 · Viajeros */}
      <div className="mt-3 divide-y divide-white/10 border-y border-white/10">
        <Fila campo="adultos" titulo={t.cotAdultos} nota={t.cotAdultosNota} valor={pedido.adultos} />
        <Fila campo="childrenSmall" titulo={t.cotNinos} nota={t.cotNinosNota} valor={pedido.childrenSmall} />
        <Fila campo="bebes" titulo={t.cotBebes} nota={t.cotBebesNota} valor={bebes} />
      </div>

      {/* 3 · Habitación */}
      {habitaciones.length > 1 && (
        <label className="mt-4 block">
          <span className="mb-2 block font-dm text-[11px] uppercase tracking-[2px] text-crema/50">{t.cotHabitacion}</span>
          <select
            value={pedido.habitacionId}
            onChange={(e) => { cambiar({ habitacionId: e.target.value }); trackTourEvent("ROOM_SELECTION", { slug, habitacion: e.target.value }); }}
            className="min-h-[48px] w-full rounded-xl border border-white/20 bg-negro/60 px-3 font-dm text-[16px] text-crema"
          >
            {habitaciones.map((h) => (
              <option key={h.id} value={h.id}>{h.nombre} · {h.vista}</option>
            ))}
          </select>
        </label>
      )}

      <p className="mt-3 font-dm text-[12px] text-crema/55">{t.cotModalidad}: {t.cotModalidadTxt}</p>

      {/* 4 · Desglose */}
      {grande ? (
        <p className="mt-5 rounded-xl border border-dorado/40 bg-negro/40 p-4 font-dm text-sm text-crema/80">{t.cotGrande}</p>
      ) : cot ? (
        <div className="mt-5 rounded-xl bg-negro/50 p-4 font-dm text-[13px]">
          <p className="mb-2 text-[11px] uppercase tracking-[2px] text-crema/50">{t.cotDesglose}</p>
          <Renglon k={t.cotBase(t.cotHabitaciones(1))} v={mxn(cot.completo.base)} />
          {cot.completo.extraHotel > 0 && <Renglon k={t.cotExtraHotel} v={`+${mxn(cot.completo.extraHotel)}`} />}
          {cot.completo.extraTours > 0 && <Renglon k={t.cotExtraTours} v={`+${mxn(cot.completo.extraTours)}`} />}
          <div className="mt-2 flex items-baseline justify-between border-t border-white/10 pt-2">
            <span className="text-crema">{t.cotTotal}</span>
            <span className="whitespace-nowrap font-cormorant text-[30px] leading-none text-dorado">{mxn(cot.completo.total)}</span>
          </div>
          <p className="text-right text-[11px] text-crema/50">
            MXN · {t.cotHabitaciones(cot.completo.habitaciones)} · {t.cotPorPersona(mxn(Math.round(cot.completo.total / Math.max(1, personas))))}
          </p>
          <Renglon k={t.cotAnticipo} v={mxn(cot.hoy)} />
          <Renglon k={t.cotSaldo} v={mxn(cot.saldo)} />
        </div>
      ) : (
        <p className="mt-5 rounded-xl border border-white/15 p-4 font-dm text-sm text-crema/75">{t.cotSinPrecio}</p>
      )}

      {/* 5 · Datos opcionales para el mensaje */}
      <details className="group mt-4">
        <summary className="flex min-h-[40px] cursor-pointer list-none items-center font-dm text-[13px] text-agua [&::-webkit-details-marker]:hidden">
          {t.cotDatosMensaje}
        </summary>
        <div className="mt-2 grid gap-2">
        <input value={quien} onChange={(e) => setQuien(e.target.value)} placeholder={t.cotNombre} className="min-h-[48px] rounded-xl border border-white/15 bg-negro/50 px-3 font-dm text-[16px] text-crema placeholder:text-crema/40" />
        <textarea value={comentarios} onChange={(e) => setComentarios(e.target.value)} placeholder={t.cotComentarios} rows={2} className="rounded-xl border border-white/15 bg-negro/50 px-3 py-2 font-dm text-[16px] text-crema placeholder:text-crema/40" />
        </div>
      </details>

      {/* 6 · Acciones */}
      <div className="mt-4 grid gap-2">
        {cot && !grande && (
          <button type="button" onClick={reservar} className="tactil inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-dorado px-4 font-dm text-[12px] font-medium uppercase tracking-[1.5px] text-negro hover:bg-crema">
            {t.cotReservar} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        <button type="button" data-wa-manual="1" onClick={whatsapp} className="tactil inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-[#25D366]/50 px-4 font-dm text-[12px] uppercase tracking-[1.5px] text-crema hover:bg-[#25D366]/10">
          {grande || !cot ? t.cotSolicitar : t.cotWa}
        </button>
      </div>
      <p className="mt-3 flex items-center gap-1.5 font-dm text-[11px] text-crema/45">
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> {t.cotSeguro}
      </p>
    </div>
  );
}

function Renglon({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5">
      <span className="text-crema/65">{k}</span>
      <span className="whitespace-nowrap text-crema/90">{v}</span>
    </div>
  );
}

/** Botón de la tabla de precios: «Cotizar» esa fila en el cotizador. */
export function BotonCotizarFila({ adultos, etiqueta, slug }: { adultos: number; etiqueta: string; slug: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        trackTourEvent("PRICE_SELECTION", { slug, adultos });
        window.dispatchEvent(new CustomEvent(EVENTO_COTIZAR, { detail: { adultos } }));
      }}
      className="tactil inline-flex min-h-[36px] items-center rounded-lg border border-white/15 px-3 font-dm text-[12px] text-agua hover:border-agua"
    >
      {etiqueta}
    </button>
  );
}
