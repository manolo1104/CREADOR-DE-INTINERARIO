"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Elements } from "@stripe/react-stripe-js";
import { ChevronLeft, AlertCircle, BedDouble, CalendarDays } from "lucide-react";
import { getPaquete, habitacionesDePaquete, PAQUETES_DB } from "@/lib/paquetes";
import { localizePaquete } from "@/lib/i18n/paquetes.en";
import { HABITACIONES_HOTEL } from "@/lib/habitaciones";

/** ¿Es de vista a la montaña (Jungla)? Lo sabe el catálogo del hotel, como en el servidor. */
const vistaMontana = (id: string | undefined) => !!HABITACIONES_HOTEL.find((h) => h.id === id)?.vistaMontana;
import { MAX_PERSONAS_PAQUETE } from "@/lib/paquetePricing";
import { minBookingDate, formatMXN } from "@/lib/tourBooking";
import { MSI_DESDE } from "@/lib/stripeMsi";
import { getBooking } from "@/lib/i18n/booking";
import { useLocale } from "@/lib/i18n/useLocale";
import { stripePromise, APARIENCIA_STRIPE } from "@/lib/stripeCliente";
import { trackTourEvent, sessionId, ga4ClientId } from "@/lib/tourTracker";
import { validarContacto, type ErroresContacto } from "@/lib/checkout/validarContacto";
import { leerExtras } from "@/lib/carritoExtras";
import { cotizarPedido, guardarPedido, leerPedido, olvidarPedido, pedidoInicial, type PedidoPaquete } from "@/lib/paqueteCarrito";
import { TourCalendar } from "@/components/booking/TourCalendar";
import { PagoCarrito } from "@/components/carrito/PagoCarrito";
import type { Cobro } from "@/components/carrito/carritoComun";
import { PasoAcordeon, type EstadoPaso } from "./PasoAcordeon";
import { BarraPago } from "./BarraPago";
import { ConfianzaJuntoAlBoton } from "./ConfianzaJuntoAlBoton";

const FORM_PAGO = "pago-paquete";

/**
 * Un PAQUETE por el mismo checkout de los tours (13 nov 2026, auditoría:
 * «pasa los paquetes al mismo checkout que los tours: fecha, habitación y
 * anticipo con Stripe»). Vive en la misma página (`/reservar/carrito?paquete=…`),
 * con los mismos tres pasos, la misma barra fija, el mismo pago de Stripe y el
 * mismo cierre (`PagoCarrito` → `send-confirmation`). Cambia lo que se elige
 * en el paso ①: fecha con la disponibilidad de TODOS sus recorridos, cuántos
 * van, la habitación y la noche extra (apagada: ningún extra premarcado).
 * El anticipo es el de los tours: 30 % o todo (decisión de Manolo).
 */
export function CheckoutPaquete({ slug }: { slug: string }) {
  const { locale, en, lp } = useLocale();
  const t = getBooking(locale).carrito;
  const tc = getBooking(locale).checkout;
  const paqueteCat = getPaquete(slug);
  const paquete = paqueteCat && !paqueteCat.evento ? paqueteCat : null;
  const p = paquete ? localizePaquete(paquete, locale) : null;
  const habitaciones = useMemo(() => (paquete ? habitacionesDePaquete(paquete) : []), [paquete]);

  const [pedido, setPedido] = useState<PedidoPaquete>(() => pedidoInicial(slug));
  const [listo, setListo] = useState(false);
  const [paso, setPaso] = useState<1 | 2 | 3>(1);
  const [pagarTodo, setPagarTodo] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notas, setNotas] = useState("");
  const [errores, setErrores] = useState<ErroresContacto>({});
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [cobro, setCobro] = useState<Cobro | null>(null);
  const [previo, setPrevio] = useState<string | null>(null);

  // Al montar: lo de esta pestaña, o lo que trae la URL (`?fecha=&adultos=`).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const base = leerPedido(slug) ?? pedidoInicial(slug);
    const f = q.get("fecha");
    if (f && /^\d{4}-\d{2}-\d{2}$/.test(f)) base.fecha = f;
    const a = Number(q.get("adultos"));
    if (Number.isInteger(a) && a >= 2 && a <= MAX_PERSONAS_PAQUETE) base.adultos = a;
    if (base.fecha && base.fecha < minBookingDate()) base.fecha = "";
    if (!base.habitacionId && habitaciones.length === 1) base.habitacionId = habitaciones[0].id;
    setPedido(base);
    const ex = leerExtras();
    if (ex.name) setName(ex.name);
    if (ex.email) setEmail(ex.email);
    if (ex.phone) setPhone(ex.phone);
    setListo(true);
    trackTourEvent("BOOKING_PAGE_VIEW", { paquete: slug, carrito: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);
  useEffect(() => { if (listo) guardarPedido(pedido); }, [pedido, listo]);

  const habitacion = habitaciones.find((h) => h.id === pedido.habitacionId) ?? null;
  const cuenta = cotizarPedido(pedido, vistaMontana(habitacion?.id), pagarTodo);
  const personas = pedido.adultos + pedido.childrenMid + pedido.childrenSmall;
  const dinero = (n: number) => `$${n.toLocaleString(en ? "en-US" : "es-MX")}`;

  // Cualquier cambio invalida el cobro ya creado.
  const cambiar = (c: Partial<PedidoPaquete>) => { setPedido((x) => ({ ...x, ...c })); setCobro(null); if (paso === 3) setPaso(1); };

  if (!paquete || !p) {
    return (
      <main className="min-h-screen bg-crema pt-32 pb-20 px-6 text-center">
        <h1 className="font-cormorant text-verde-profundo text-3xl mb-4">{en ? "This package isn't available" : "Este paquete no está disponible"}</h1>
        <Link href={lp("/paquetes")} className="inline-block bg-verde-selva text-crema px-8 py-4 text-[11px] tracking-[2px] uppercase font-dm">{en ? "See packages" : "Ver paquetes"}</Link>
      </main>
    );
  }
  if (!listo) return <main className="min-h-screen bg-crema pt-32" />;

  const eleccion = paquete.eleccionTour;
  const faltaEleccion = !!eleccion && pedido.elegidos.length !== (eleccion.cuantos ?? 1);
  const faltaHabitacion = habitaciones.length > 1 && !pedido.habitacionId;

  function terminarExperiencia() {
    if (!pedido.fecha) { setError(en ? "Pick the start date of your trip." : "Elige la fecha de inicio de tu viaje."); document.getElementById("paso-1")?.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    if (faltaHabitacion) { setError(en ? "Pick your room." : "Elige tu habitación."); return; }
    if (faltaEleccion) { setError(en ? "Pick your tours from the list." : "Elige tus recorridos de la lista."); return; }
    if (!cuenta) { setError(en ? `For more than ${MAX_PERSONAS_PAQUETE} people, message us on WhatsApp.` : `Para más de ${MAX_PERSONAS_PAQUETE} personas escríbenos por WhatsApp.`); return; }
    setError("");
    setPaso(2);
    trackTourEvent("CHECKOUT_STARTED", { paquete: slug, amount: cuenta.completo.total, personas, fecha: pedido.fecha, source: "checkout_paquete" });
  }

  async function terminarDatos() {
    const e = validarContacto({ name, email, phone }, tc);
    setErrores(e);
    if (Object.keys(e).length) return;
    setCargando(true);
    setError("");
    try {
      const res = await fetch("/api/tours/carrito-payment-intent", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paquete: {
            slug, fecha: pedido.fecha, adultos: pedido.adultos, childrenMid: pedido.childrenMid, childrenSmall: pedido.childrenSmall,
            habitacionId: pedido.habitacionId || undefined, nocheExtra: pedido.nocheExtra, elegidos: pedido.elegidos,
          },
          customerName: name.trim(), customerEmail: email.trim(), customerPhone: phone.trim(), notas: notas.trim(),
          pagarTodo, locale, sid: sessionId(), gaClientId: ga4ClientId(), paymentIntentIdPrevio: previo,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || t.noSePudoIniciar); setCargando(false); return; }
      setPrevio(data.paymentIntentId ?? null);
      setCobro(data as Cobro);
      setPaso(3);
    } catch {
      setError(t.noSePudoConectar);
    }
    setCargando(false);
  }

  const estado = (n: 1 | 2 | 3): EstadoPaso => (n === paso ? "abierto" : n < paso ? "hecho" : "bloqueado");
  const fechaTexto = pedido.fecha ? new Date(`${pedido.fecha}T12:00:00`).toLocaleDateString(en ? "en-US" : "es-MX", { weekday: "short", day: "numeric", month: "short" }) : "";
  const accion = paso === 1
    ? { texto: tc.continuar, fn: terminarExperiencia }
    : paso === 2
      ? { texto: cargando ? tc.preparandoPago : tc.irAlPago, fn: () => { void terminarDatos(); } }
      : { texto: t.pagar(formatMXN(cuenta?.hoy ?? 0)).replace(/ MXN$/, ""), fn: () => (document.getElementById(FORM_PAGO) as HTMLFormElement | null)?.requestSubmit() };

  const Contador = ({ etiqueta, valor, set, min }: { etiqueta: string; valor: number; set: (n: number) => void; min: number }) => (
    <div className="flex items-center justify-between gap-3">
      <span className="font-dm text-[13px] text-negro/70">{etiqueta}</span>
      <span className="flex items-center gap-2">
        <button type="button" onClick={() => set(Math.max(min, valor - 1))} disabled={valor <= min} aria-label={`${etiqueta} −`} className="w-8 h-8 border border-negro/20 text-negro/70 disabled:opacity-30">−</button>
        <span className="w-6 text-center font-dm tabular-nums text-negro">{valor}</span>
        <button type="button" onClick={() => set(valor + 1)} disabled={personas >= MAX_PERSONAS_PAQUETE} aria-label={`${etiqueta} +`} className="w-8 h-8 border border-negro/20 text-negro/70 disabled:opacity-30">+</button>
      </span>
    </div>
  );

  const resumen = cuenta && (
    <div className="border border-negro/10 bg-white p-5 font-dm text-[13px] text-negro">
      <p className="text-[10px] tracking-[2px] uppercase text-negro/45 mb-2">{en ? "Your package" : "Tu paquete"}</p>
      <p className="font-cormorant text-verde-profundo text-lg leading-tight">{p.nombre}</p>
      <p className="text-negro/55 text-[12px] mt-1">{paquete.dias} {en ? "days" : "días"} / {cuenta.completo.nochesTotales} {en ? "nights" : "noches"} · {personas} {en ? (personas === 1 ? "person" : "people") : (personas === 1 ? "persona" : "personas")}{fechaTexto ? ` · ${fechaTexto}` : ""}</p>
      {habitacion && <p className="text-negro/55 text-[12px]">{habitacion.nombre}{pedido.nocheExtra ? (en ? " · extra night" : " · noche extra") : ""}</p>}
      <div className="mt-3 space-y-1 border-t border-negro/10 pt-3">
        <p className="flex justify-between"><span className="text-negro/60">{en ? "Trip total" : "Total del viaje"}</span><span>{dinero(cuenta.completo.total)} MXN</span></p>
        <p className="flex justify-between"><span className="text-negro/60">{t.pagasHoy(cuenta.pct)}</span><span className="font-cormorant text-dorado text-xl">{dinero(cuenta.hoy)} MXN</span></p>
        {cuenta.saldo > 0 && <p className="flex justify-between text-[12px] text-negro/50"><span>{en ? "Balance, on arrival" : "Resto, al llegar"}</span><span>{dinero(cuenta.saldo)} MXN</span></p>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-crema pb-28 lg:pb-16">
      <section className="relative bg-negro text-crema overflow-hidden">
        <div className="absolute inset-0">
          <Image src={paquete.imagen} alt={p.nombre} fill priority sizes="100vw" className="object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-t from-negro via-negro/55 to-negro/10" aria-hidden="true" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-20 sm:pt-28 pb-5 sm:pb-7">
          <h1 className="font-cormorant font-light text-[30px] sm:text-[40px] leading-[1.05]">{p.nombre}</h1>
          <p className="mt-2 font-dm text-[12px] text-crema/70">{paquete.dias} {en ? "days" : "días"} / {paquete.noches} {en ? "nights" : "noches"} · {en ? "hotel, tours and breakfast" : "hotel, recorridos y desayunos"} · {dinero(paquete.precio)} MXN {en ? "per couple" : "por pareja"}</p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-3">
        <Link href={lp(`/paquetes/${slug}`)} className="inline-flex items-center gap-1 font-dm text-[11px] tracking-[1.5px] uppercase text-negro/45 hover:text-verde-selva">
          <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />{en ? "Back to the package" : "Volver al paquete"}
        </Link>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 grid lg:grid-cols-[1fr_360px] gap-6 lg:gap-8 items-start min-w-0">
        <div className="min-w-0 space-y-3">
          {/* ── ① Tu paquete ── */}
          <PasoAcordeon id="paso-1" numero={1} titulo={en ? "Your package" : "Tu paquete"} estado={estado(1)}
            resumen={[fechaTexto, `${personas} ${en ? "people" : "personas"}`, habitacion?.nombre].filter(Boolean).join(" · ")}
            textoEditar={tc.editar} onEditar={() => setPaso(1)}>
            {error && paso === 1 && <p className="mb-3 border border-terracota/40 bg-terracota/8 px-3 py-2.5 font-dm text-[12px] text-terracota">{error}</p>}
            <div className="space-y-5">
              <div>
                <p className="flex items-center gap-2 mb-2 font-dm text-[11px] tracking-[1.5px] uppercase text-negro/45"><CalendarDays className="w-3.5 h-3.5" aria-hidden="true" />{en ? "Day 1 of your trip" : "Día 1 de tu viaje"}</p>
                {/* El mismo calendario de los tours, con la disponibilidad de TODOS
                    los recorridos del paquete (el peor día manda). */}
                <TourCalendar value={pedido.fecha} onChange={(f) => cambiar({ fecha: f })} modo="abierto" tema="claro" slug={slug} personas={personas} titulo={p.nombre} permitirLimpiar />
              </div>
              <div className="space-y-2.5 border-t border-negro/10 pt-4">
                <p className="font-dm text-[11px] tracking-[1.5px] uppercase text-negro/45">{en ? "How many of you?" : "¿Cuántos van?"}</p>
                <Contador etiqueta={t.adultos} valor={pedido.adultos} set={(n) => cambiar({ adultos: n })} min={2} />
                <Contador etiqueta={t.de6a10} valor={pedido.childrenMid} set={(n) => cambiar({ childrenMid: n })} min={0} />
                <Contador etiqueta={t.menoresDe6} valor={pedido.childrenSmall} set={(n) => cambiar({ childrenSmall: n })} min={0} />
                <p className="font-dm text-[11px] text-negro/45">{en ? "The price is for two people sharing a room; extra people are added automatically." : "El precio es por pareja; las personas extra se suman solas."}</p>
              </div>
              {habitaciones.length > 0 && (
                <div className="border-t border-negro/10 pt-4">
                  <p className="flex items-center gap-2 mb-2 font-dm text-[11px] tracking-[1.5px] uppercase text-negro/45"><BedDouble className="w-3.5 h-3.5" aria-hidden="true" />{en ? "Your room" : "Tu habitación"}</p>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {habitaciones.map((h) => {
                      const c = cotizarPedido({ ...pedido, habitacionId: h.id }, vistaMontana(h.id), false);
                      const dif = c && cuenta ? c.completo.total - cotizarPedido({ ...pedido, habitacionId: "" }, false, false)!.completo.total : 0;
                      const elegida = pedido.habitacionId === h.id;
                      return (
                        <button key={h.id} type="button" onClick={() => cambiar({ habitacionId: h.id })} aria-pressed={elegida}
                          className={`flex items-center gap-3 border p-2 text-left transition-colors ${elegida ? "border-verde-selva bg-verde-selva/8" : "border-negro/15 bg-white hover:border-verde-selva/50"}`}>
                          <span className="relative h-14 w-16 flex-shrink-0 overflow-hidden bg-negro/5">
                            <Image src={h.imagen} alt={h.nombre} fill sizes="64px" className="object-cover" />
                          </span>
                          <span className="min-w-0">
                            <span className="block font-dm text-[13px] text-negro">{h.nombre}</span>
                            <span className="block font-dm text-[11px] text-negro/50">{dif > 0 ? `+${dinero(dif)} MXN` : (en ? "Included" : "Incluida")}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {eleccion && (
                <div className="border-t border-negro/10 pt-4">
                  <p className="mb-2 font-dm text-[11px] tracking-[1.5px] uppercase text-negro/45">{en ? `Pick ${eleccion.cuantos ?? 1}` : `Elige ${eleccion.cuantos ?? 1}`}</p>
                  <div className="flex flex-wrap gap-2">
                    {eleccion.opciones.map((o) => {
                      const on = pedido.elegidos.includes(o.slug);
                      return (
                        <button key={o.slug} type="button" aria-pressed={on}
                          onClick={() => cambiar({ elegidos: on ? pedido.elegidos.filter((x) => x !== o.slug) : [...pedido.elegidos, o.slug].slice(-(eleccion.cuantos ?? 1)) })}
                          className={`border px-3 py-2 font-dm text-[12px] ${on ? "border-verde-selva bg-verde-selva text-crema" : "border-negro/20 bg-white text-negro/70"}`}>
                          {o.nombre ?? o.slug}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <label className="flex cursor-pointer items-start gap-2.5 border-t border-negro/10 pt-4">
                <input type="checkbox" checked={pedido.nocheExtra} onChange={(e) => cambiar({ nocheExtra: e.target.checked })} className="mt-0.5 h-4 w-4 accent-[#3a6b1a]" />
                <span className="font-dm text-[12px] text-negro/70 leading-relaxed">
                  <strong className="font-medium text-negro">{en ? "Arrive the night before" : "Llegar la víspera"}</strong><br />
                  {en ? "Day 1 is a tour day (pick-up 8:30–9:00 AM): with an extra night you check in the day before from 3 PM." : "El día 1 ya es de tour (salida 8:30–9:00 AM): con una noche extra entras el día anterior desde las 3 PM."}
                </span>
              </label>
            </div>
            <button type="button" onClick={terminarExperiencia} className="mt-5 w-full bg-verde-selva text-crema py-4 text-[12px] tracking-[2px] uppercase font-dm font-medium hover:bg-verde-vivo transition-colors">{tc.continuar}</button>
          </PasoAcordeon>

          {/* ── ② Tus datos ── */}
          <PasoAcordeon id="paso-2" numero={2} titulo={tc.pasoDatos} estado={estado(2)} resumen={[name, phone, email].filter(Boolean).join(" · ")} textoEditar={tc.editar} onEditar={() => setPaso(2)}>
            <div className="space-y-4">
              {([
                { k: "name" as const, etiqueta: tc.nombreLabel, valor: name, set: setName, tipo: "text", ac: "name" },
                { k: "phone" as const, etiqueta: tc.whatsappLabel, valor: phone, set: setPhone, tipo: "tel", ac: "tel" },
                { k: "email" as const, etiqueta: tc.correoLabel, valor: email, set: setEmail, tipo: "email", ac: "email" },
              ]).map((c) => (
                <label key={c.k} className="block">
                  <span className="block mb-1 font-dm text-[12px] text-negro/70">{c.etiqueta}</span>
                  <input value={c.valor} onChange={(e) => c.set(e.target.value)} type={c.tipo} autoComplete={c.ac}
                    className={`w-full border bg-white px-3 py-3 font-dm text-[16px] text-negro outline-none focus:border-verde-selva ${errores[c.k] ? "border-terracota" : "border-negro/20"}`} />
                  {errores[c.k] && <span className="mt-1 block font-dm text-[11px] text-terracota">{errores[c.k]}</span>}
                </label>
              ))}
              <label className="block">
                <span className="block mb-1 font-dm text-[12px] text-negro/70">{en ? "Anything we should know? (optional)" : "¿Algo que debamos saber? (opcional)"}</span>
                <textarea value={notas} onChange={(e) => setNotas(e.target.value.slice(0, 300))} rows={2} className="w-full border border-negro/20 bg-white px-3 py-2.5 font-dm text-[16px] text-negro outline-none focus:border-verde-selva" />
              </label>
              {cuenta && cuenta.completo.total >= MSI_DESDE && (
                <label className="flex cursor-pointer items-start gap-2.5 border border-verde-selva/30 bg-verde-selva/5 p-3.5">
                  <input type="checkbox" checked={pagarTodo} onChange={(e) => { setPagarTodo(e.target.checked); setCobro(null); }} className="mt-0.5 h-4 w-4 accent-[#3a6b1a]" />
                  <span className="font-dm text-[12px] leading-relaxed text-verde-profundo">
                    <strong className="font-medium">{t.pagarTodoTitulo(formatMXN(cuenta.completo.total))}</strong><br />
                    <span className="text-negro/55">{t.pagarTodoMsi}</span>
                  </span>
                </label>
              )}
            </div>
            {error && paso === 2 && <p className="mt-3 font-dm text-[12px] text-terracota">{error}</p>}
            <button type="button" onClick={() => { void terminarDatos(); }} disabled={cargando} className="mt-5 w-full bg-verde-selva text-crema py-4 text-[12px] tracking-[2px] uppercase font-dm font-medium hover:bg-verde-vivo transition-colors disabled:opacity-50">
              {cargando ? tc.preparandoPago : tc.irAlPago}
            </button>
          </PasoAcordeon>

          {/* ── ③ Pago ── */}
          <PasoAcordeon id="paso-3" numero={3} titulo={tc.pasoPago} estado={estado(3)} textoEditar={tc.editar}>
            {error && paso === 3 && <p className="mb-3 font-dm text-[12px] text-terracota">{error}</p>}
            {cobro && (
              <>
                <details className="lg:hidden mb-4 border border-negro/10">
                  <summary className="cursor-pointer list-none px-3 py-2.5 font-dm text-[12px] text-verde-selva">{tc.verDesglose} +</summary>
                  <div className="p-3">{resumen}</div>
                </details>
                <Elements stripe={stripePromise} options={{ clientSecret: cobro.clientSecret, locale, appearance: APARIENCIA_STRIPE }}>
                  <PagoCarrito formId={FORM_PAGO} cobro={cobro} datos={{ name, email, phone, pickup: "" }} onListo={() => olvidarPedido()} conservarCarrito />
                </Elements>
                <ConfianzaJuntoAlBoton resenas={t.resenasGoogle} cancelacion={null} pagoCifrado={tc.pagoCifrado} />
              </>
            )}
          </PasoAcordeon>
          {!cuenta && (
            <p className="flex items-start gap-2 font-dm text-[12px] text-terracota"><AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />{en ? `For more than ${MAX_PERSONAS_PAQUETE} people, message us on WhatsApp.` : `Para más de ${MAX_PERSONAS_PAQUETE} personas escríbenos por WhatsApp.`}</p>
          )}
        </div>

        <aside className="hidden lg:block min-w-0 lg:sticky lg:top-6 space-y-3">
          {resumen}
          <button type="button" onClick={accion.fn} disabled={cargando || (paso === 3 && !cobro)} className="w-full bg-verde-selva text-crema py-4 text-[12px] tracking-[2px] uppercase font-dm font-medium hover:bg-verde-vivo transition-colors disabled:opacity-50">
            {accion.texto}
          </button>
          <div className="border border-negro/10 bg-white px-5 pb-4 pt-1">
            <ConfianzaJuntoAlBoton resenas={t.resenasGoogle} cancelacion={null} pagoCifrado={tc.pagoCifrado} />
          </div>
        </aside>
      </div>

      <BarraPago
        etiquetaHoy={t.pagasHoy(cuenta?.pct ?? 30)}
        hoy={formatMXN(cuenta?.hoy ?? 0)}
        total={tc.barraTotal(formatMXN(cuenta?.completo.total ?? 0))}
        boton={accion.texto}
        onBoton={accion.fn}
        ocupado={cargando}
      />
    </div>
  );
}

/** Los slugs que el checkout de paquete acepta (catálogo, sin eventos). */
export const SLUGS_PAQUETE_CHECKOUT = new Set(PAQUETES_DB.filter((x) => !x.evento).map((x) => x.slug));
