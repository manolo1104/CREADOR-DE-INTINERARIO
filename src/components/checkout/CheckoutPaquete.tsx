"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Elements } from "@stripe/react-stripe-js";
import {
  ChevronLeft, AlertCircle, ArrowRight, BedDouble, CalendarDays, Check, Lock, Moon, Star, Users,
} from "lucide-react";
import { getPaquete, habitacionesDePaquete, PAQUETES_DB, TRASLADOS_TEXTO } from "@/lib/paquetes";
import { localizePaquete, getLocalizedFaqs } from "@/lib/i18n/paquetes.en";
import { HABITACIONES_HOTEL } from "@/lib/habitaciones";
import { MAX_PERSONAS_PAQUETE } from "@/lib/paquetePricing";
import { minBookingDate, formatMXN } from "@/lib/tourBooking";
import { MSI_DESDE } from "@/lib/stripeMsi";
import { GOOGLE_RATING } from "@/lib/resenas";
import { getBooking } from "@/lib/i18n/booking";
import { useLocale } from "@/lib/i18n/useLocale";
import { stripePromise, APARIENCIA_STRIPE } from "@/lib/stripeCliente";
import { trackTourEvent, sessionId, ga4ClientId } from "@/lib/tourTracker";
import { validarContacto, type CampoContacto, type ErroresContacto } from "@/lib/checkout/validarContacto";
import { leerExtras } from "@/lib/carritoExtras";
import { cotizarPedido, guardarPedido, leerPedido, olvidarPedido, pedidoInicial, type PedidoPaquete } from "@/lib/paqueteCarrito";
import { TourCalendar } from "@/components/booking/TourCalendar";
import { ReservasRecientes } from "@/components/booking/ReservasRecientes";
import { PagoCarrito } from "@/components/carrito/PagoCarrito";
import { RescatePopup } from "@/components/carrito/RescatePopup";
import type { Cobro } from "@/components/carrito/carritoComun";
import { PasoAcordeon, type EstadoPaso } from "./PasoAcordeon";
import { BarraPago } from "./BarraPago";
import { ConfianzaJuntoAlBoton } from "./ConfianzaJuntoAlBoton";
import { EncabezadoCerrado } from "./EncabezadoCerrado";
import { QuePasaDespues } from "./QuePasaDespues";
import { BOTON_CONTADOR, BOTON_PRINCIPAL, ETIQUETA_GRUPO, TARJETA, claseCampo } from "./estilos";

/** ¿Es de vista a la montaña (Jungla)? Lo sabe el catálogo del hotel, como en el servidor. */
const vistaMontana = (id: string | undefined) => !!HABITACIONES_HOTEL.find((h) => h.id === id)?.vistaMontana;

const FORM_PAGO = "pago-paquete";

/** Las dudas que frenan a quien ya va a pagar un paquete (de las mismas FAQ de su ficha). */
const DUDAS_AL_PAGAR = /pareja|couple|elegir mi habitaci|choose my room|incluye el traslado|include getting|niños|children|cambiar la fecha|change the dates/i;

/** Lo que pasa después de pagar un paquete. Solo lo que el equipo ya hace. */
function queSigue(en: boolean, saldo: string | null): string[] {
  return en
    ? [
        "Your confirmation arrives right away, by email.",
        "We message you on WhatsApp to confirm the schedule of each tour.",
        saldo ? `You pay the balance (${saldo}) when you arrive.` : "Everything is paid: you just show up.",
      ]
    : [
        "Te llega tu confirmación al instante, por correo.",
        "Te escribimos por WhatsApp para confirmarte los horarios de cada recorrido.",
        saldo ? `Al llegar pagas el resto (${saldo}).` : "Ya está todo pagado: solo llegas.",
      ];
}

/** «vie 20 nov» / «Fri, Nov 20». */
function diaCorto(ymd: string, en: boolean): string {
  return new Date(`${ymd}T12:00:00`).toLocaleDateString(en ? "en-US" : "es-MX", { weekday: "short", day: "numeric", month: "short" }).replace(/\./g, "");
}
function sumarDias(ymd: string, n: number): string {
  const d = new Date(`${ymd}T12:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Un PAQUETE por el mismo checkout de los tours (13 nov 2026, auditoría:
 * «pasa los paquetes al mismo checkout que los tours: fecha, habitación y
 * anticipo con Stripe»). Vive en la misma página (`/reservar/carrito?paquete=…`),
 * con los mismos tres pasos, la misma barra fija, el mismo pago de Stripe y el
 * mismo cierre (`PagoCarrito` → `send-confirmation`). Cambia lo que se elige
 * en el paso ①: fecha con la disponibilidad de TODOS sus recorridos, cuántos
 * van, la habitación y la noche extra (apagada: ningún extra premarcado).
 * El anticipo es el de los tours: 30 % o todo (decisión de Manolo).
 *
 * Lo que comparte con el checkout de tours para convertir igual (13 nov, 2.ª
 * vuelta, «agrega mejores prácticas de conversión»):
 * - encabezado CERRADO (sin el menú del sitio: siete salidas menos);
 * - la foto con fecha, personas y la calificación real de Google;
 * - el precio de cada opción ANTES de elegirla (habitación, noche extra);
 * - «Qué incluye» en el resumen, confianza y «qué pasa después» junto al botón;
 * - las dudas de pago plegadas, el rescate por WhatsApp en el paso ① y las
 *   reservas reales en el ②.
 * 🔴 Lo que NO dice, a propósito: ni «cancelación gratis» (los paquetes llevan
 * las condiciones del hotel, ver `faqsExtra`) ni un ahorro frente a comprar
 * suelto (la cuenta no está hecha).
 */
export function CheckoutPaquete({ slug }: { slug: string }) {
  const { locale, en, lp } = useLocale();
  const t = getBooking(locale).carrito;
  const tc = getBooking(locale).checkout;
  const paqueteCat = getPaquete(slug);
  const paquete = paqueteCat && !paqueteCat.evento ? paqueteCat : null;
  const p = paquete ? localizePaquete(paquete, locale) : null;
  const habitaciones = useMemo(() => (paquete ? habitacionesDePaquete(paquete) : []), [paquete]);
  const dudas = useMemo(
    () => getLocalizedFaqs(locale, TRASLADOS_TEXTO(locale)).filter((f) => DUDAS_AL_PAGAR.test(f.q)).slice(0, 5),
    [locale],
  );

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

  // Checkout cerrado: el menú del sitio se esconde mientras está en pantalla.
  useEffect(() => {
    document.documentElement.dataset.checkoutCerrado = "1";
    return () => { delete document.documentElement.dataset.checkoutCerrado; };
  }, []);

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

  // Al pasar de paso, la vista va al paso abierto (en el celular el de arriba ya plegado).
  useEffect(() => {
    if (paso > 1) document.getElementById(`paso-${paso}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [paso]);

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
        <Link href={lp("/paquetes")} className="inline-block rounded-xl bg-verde-selva text-crema px-8 py-4 text-[11px] tracking-[2px] uppercase font-dm">{en ? "See packages" : "Ver paquetes"}</Link>
      </main>
    );
  }
  if (!listo) return <main className="min-h-screen bg-crema" />;

  const eleccion = paquete.eleccionTour;
  const faltaEleccion = !!eleccion && pedido.elegidos.length !== (eleccion.cuantos ?? 1);
  const faltaHabitacion = habitaciones.length > 1 && !pedido.habitacionId;
  // Lo que suma la noche extra, dicho ANTES de marcarla.
  const conNoche = cotizarPedido({ ...pedido, nocheExtra: true }, vistaMontana(habitacion?.id), false);
  const sinNoche = cotizarPedido({ ...pedido, nocheExtra: false }, vistaMontana(habitacion?.id), false);
  const precioNoche = conNoche && sinNoche ? conNoche.completo.total - sinNoche.completo.total : 0;

  function terminarExperiencia() {
    if (!pedido.fecha) { setError(en ? "Pick the start date of your trip." : "Elige la fecha de inicio de tu viaje."); document.getElementById("paso-1")?.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    if (faltaHabitacion) { setError(en ? "Pick your room." : "Elige tu habitación."); return; }
    if (faltaEleccion) { setError(en ? "Pick your tours from the list." : "Elige tus recorridos de la lista."); return; }
    if (!cuenta) { setError(en ? `For more than ${MAX_PERSONAS_PAQUETE} people, message us on WhatsApp.` : `Para más de ${MAX_PERSONAS_PAQUETE} personas escríbenos por WhatsApp.`); return; }
    setError("");
    setPaso(2);
    trackTourEvent("CHECKOUT_STARTED", { paquete: slug, amount: cuenta.completo.total, personas, fecha: pedido.fecha, source: "checkout_paquete" });
  }

  function validarCampo(campo: CampoContacto) {
    const todos = validarContacto({ name, email, phone }, tc);
    setErrores((e) => ({ ...e, [campo]: todos[campo] }));
  }

  async function terminarDatos() {
    const e = validarContacto({ name, email, phone }, tc);
    setErrores(e);
    const primero = (["name", "phone", "email"] as const).find((k) => e[k]);
    if (primero) { document.getElementById(`paq-${primero}`)?.focus(); return; }
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
  const fechaTexto = pedido.fecha ? diaCorto(pedido.fecha, en) : "";
  const finTexto = pedido.fecha ? diaCorto(sumarDias(pedido.fecha, paquete.dias - 1), en) : "";
  const accion = paso === 1
    ? { texto: tc.continuar, fn: terminarExperiencia }
    : paso === 2
      ? { texto: cargando ? tc.preparandoPago : tc.irAlPago, fn: () => { void terminarDatos(); } }
      : { texto: t.pagar(formatMXN(cuenta?.hoy ?? 0)).replace(/ MXN$/, ""), fn: () => (document.getElementById(FORM_PAGO) as HTMLFormElement | null)?.requestSubmit() };
  const pasos = queSigue(en, cuenta && cuenta.saldo > 0 ? `${dinero(cuenta.saldo)} MXN` : null);
  const waRescate = en
    ? `Hi! I'm looking at the ${p.nombre} package${fechaTexto ? ` for ${fechaTexto}` : ""} (${personas} people) and I have a question.`
    : `¡Hola! Estoy viendo el paquete ${p.nombre}${fechaTexto ? ` para el ${fechaTexto}` : ""} (${personas} personas) y tengo una duda.`;

  const Contador = ({ etiqueta, nota, valor, set, min }: { etiqueta: string; nota?: string; valor: number; set: (n: number) => void; min: number }) => (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="font-dm text-[14px] text-negro/80">
        {etiqueta}
        {nota && <span className="block font-dm text-[11px] text-negro/45">{nota}</span>}
      </span>
      <span className="flex items-center gap-1 rounded-full bg-negro/[0.03] p-0.5">
        <button type="button" onClick={() => set(Math.max(min, valor - 1))} disabled={valor <= min} aria-label={`${etiqueta} −`} className={BOTON_CONTADOR}>−</button>
        <span className="w-7 text-center font-dm text-[15px] font-medium tabular-nums text-negro">{valor}</span>
        <button type="button" onClick={() => set(valor + 1)} disabled={personas >= MAX_PERSONAS_PAQUETE} aria-label={`${etiqueta} +`} className={BOTON_CONTADOR}>+</button>
      </span>
    </div>
  );

  const incluye = p.incluye ?? [];
  const resumen = cuenta && (
    <div className={`${TARJETA} p-5 sm:p-6 font-dm text-[13px] text-negro`}>
      <p className="text-[10px] tracking-[2px] uppercase text-negro/45 mb-3">{en ? "Your package" : "Tu paquete"}</p>
      <div className="flex gap-3">
        <span className="relative h-14 w-16 flex-shrink-0 overflow-hidden rounded-lg">
          <Image src={paquete.imagen} alt="" fill sizes="64px" className="object-cover" />
        </span>
        <div className="min-w-0">
          <p className="font-cormorant text-verde-profundo text-[19px] leading-tight">{p.nombre}</p>
          <p className="text-negro/55 text-[12px] mt-0.5">
            {paquete.dias} {en ? "days" : "días"} / {cuenta.completo.nochesTotales} {en ? "nights" : "noches"} · {personas} {en ? (personas === 1 ? "person" : "people") : (personas === 1 ? "persona" : "personas")}
          </p>
        </div>
      </div>
      <div className="mt-3 space-y-1 text-[12px] text-negro/65">
        <p className="flex items-center gap-2"><CalendarDays className="w-3.5 h-3.5 text-verde-selva flex-shrink-0" aria-hidden="true" />{fechaTexto ? `${fechaTexto} → ${finTexto}` : (en ? "Date not picked yet" : "Falta elegir la fecha")}</p>
        {habitacion && <p className="flex items-center gap-2"><BedDouble className="w-3.5 h-3.5 text-verde-selva flex-shrink-0" aria-hidden="true" />{habitacion.nombre}{pedido.nocheExtra ? (en ? " · extra night" : " · noche extra") : ""}</p>}
      </div>
      {incluye.length > 0 && (
        <div className="mt-4 border-t border-negro/[0.07] pt-4">
          <p className="text-[10px] tracking-[2px] uppercase text-negro/45 mb-2">{en ? "What's included" : "Lo que va incluido"}</p>
          <ul className="space-y-1">
            {incluye.slice(0, 5).map((x) => (
              <li key={x} className="flex items-start gap-1.5 text-[12px] leading-snug text-negro/60">
                <Check className="mt-0.5 h-3 w-3 flex-shrink-0 text-verde-selva" strokeWidth={3} aria-hidden="true" />{x}
              </li>
            ))}
          </ul>
          {incluye.length > 5 && (
            <details className="group mt-1">
              <summary className="cursor-pointer list-none text-[12px] text-verde-selva hover:text-verde-profundo">
                {en ? `${incluye.length - 5} more` : `${incluye.length - 5} más`} <span className="inline-block transition-transform group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <ul className="mt-1 space-y-1">
                {incluye.slice(5).map((x) => (
                  <li key={x} className="flex items-start gap-1.5 text-[12px] leading-snug text-negro/60">
                    <Check className="mt-0.5 h-3 w-3 flex-shrink-0 text-verde-selva" strokeWidth={3} aria-hidden="true" />{x}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
      <div className="mt-4 space-y-1.5 border-t border-negro/[0.07] pt-4">
        <p className="flex justify-between"><span className="text-negro/60">{en ? "Trip total" : "Total del viaje"}</span><strong className="font-medium text-negro/85">{dinero(cuenta.completo.total)} MXN</strong></p>
        <p className="flex items-baseline justify-between"><span className="text-negro/60">{t.pagasHoy(cuenta.pct)}</span><span className="font-cormorant text-dorado text-[26px] leading-none">{dinero(cuenta.hoy)} <span className="font-dm text-[11px] text-negro/40">MXN</span></span></p>
        {cuenta.saldo > 0 && <p className="flex justify-between text-[12px] text-negro/50"><span>{en ? "Balance, on arrival" : "Resto, al llegar"}</span><span>{dinero(cuenta.saldo)} MXN</span></p>}
      </div>
    </div>
  );

  const campos: { k: CampoContacto; etiqueta: string; ayuda?: string; valor: string; set: (v: string) => void; tipo: string; ac: string; im?: "tel" | "email"; ph?: string }[] = [
    { k: "name", etiqueta: tc.nombreLabel, valor: name, set: setName, tipo: "text", ac: "name" },
    { k: "phone", etiqueta: tc.whatsappLabel, ayuda: en ? "We'll confirm each tour's schedule here." : "Por aquí te confirmamos los horarios de cada recorrido.", valor: phone, set: setPhone, tipo: "tel", ac: "tel", im: "tel", ph: "+52 489 123 4567" },
    { k: "email", etiqueta: tc.correoLabel, ayuda: tc.correoAyuda, valor: email, set: setEmail, tipo: "email", ac: "email", im: "email" },
  ];

  return (
    <div className="min-h-screen bg-crema pb-28 lg:pb-16">
      <EncabezadoCerrado />
      <section className="relative bg-negro text-crema overflow-hidden">
        <div className="absolute inset-0">
          <Image src={paquete.imagen} alt={p.nombre} fill priority sizes="100vw" className="object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-t from-negro via-negro/55 to-negro/10" aria-hidden="true" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-5 sm:pb-7">
          <h1 className="font-cormorant font-light text-[30px] sm:text-[40px] leading-[1.05]">{p.nombre}</h1>
          <p className="mt-1 font-dm text-[13px] sm:text-[14px] text-crema/75">
            {paquete.dias} {en ? "days" : "días"} / {paquete.noches} {en ? "nights" : "noches"} · {en ? "hotel, tours and breakfast" : "hotel, recorridos y desayunos"}
          </p>
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-dm text-[12px] sm:text-[13px] text-crema/85">
            <span className="inline-flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5 text-lima" aria-hidden="true" />{fechaTexto ? `${fechaTexto} → ${finTexto}` : tc.sinFechaResumen}</span>
            <span className="inline-flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-lima" aria-hidden="true" />{personas} {en ? "people" : "personas"}</span>
            <span className="inline-flex items-center gap-1.5"><Star className="w-3.5 h-3.5 fill-dorado text-dorado" aria-hidden="true" /><strong className="font-medium">{GOOGLE_RATING}</strong> · {t.resenasGoogle}</span>
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4">
        <Link href={lp(`/paquetes/${slug}`)} className="inline-flex items-center gap-1.5 font-dm text-[11px] tracking-[1px] uppercase text-negro/50 hover:text-verde-selva transition-colors">
          <ChevronLeft className="w-3 h-3" aria-hidden="true" />{en ? "Back to the package" : "Volver al paquete"}
        </Link>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 grid lg:grid-cols-[1fr_360px] gap-6 lg:gap-8 items-start min-w-0">
        <div className="min-w-0 space-y-3">
          {/* ── ① Tu paquete ── */}
          <PasoAcordeon id="paso-1" numero={1} titulo={en ? "Your package" : "Tu paquete"} estado={estado(1)}
            resumen={[fechaTexto, `${personas} ${en ? "people" : "personas"}`, habitacion?.nombre].filter(Boolean).join(" · ")}
            textoEditar={tc.editar} onEditar={() => setPaso(1)}>
            {error && paso === 1 && <p className="mb-4 rounded-xl border border-terracota/40 bg-terracota/8 px-3.5 py-3 font-dm text-[12px] text-terracota">{error}</p>}
            <div className="space-y-6">
              <div>
                <p className={`flex items-center gap-2 mb-3 ${ETIQUETA_GRUPO}`}><CalendarDays className="w-3.5 h-3.5" aria-hidden="true" />{en ? "Day 1 of your trip" : "Día 1 de tu viaje"}</p>
                {/* El mismo calendario de los tours, con la disponibilidad de TODOS
                    los recorridos del paquete (el peor día manda). */}
                <TourCalendar value={pedido.fecha} onChange={(f) => cambiar({ fecha: f })} modo="abierto" tema="claro" slug={slug} personas={personas} titulo={p.nombre} permitirLimpiar />
                {pedido.fecha && (
                  <p className="mt-3 flex items-center gap-2 rounded-xl bg-verde-selva/[0.06] px-3.5 py-2.5 font-dm text-[13px] text-verde-profundo">
                    <Check className="w-4 h-4 flex-shrink-0 text-verde-selva" strokeWidth={2.5} aria-hidden="true" />
                    <span>{en ? "Your trip:" : "Tu viaje:"} <strong className="font-medium">{fechaTexto} → {finTexto}</strong> · {paquete.dias} {en ? "days" : "días"}</span>
                  </p>
                )}
              </div>
              <div className="border-t border-negro/[0.07] pt-5">
                <p className={`mb-2 ${ETIQUETA_GRUPO}`}>{en ? "How many of you?" : "¿Cuántos van?"}</p>
                <Contador etiqueta={t.adultos} valor={pedido.adultos} set={(n) => cambiar({ adultos: n })} min={2} />
                <Contador etiqueta={t.de6a10} valor={pedido.childrenMid} set={(n) => cambiar({ childrenMid: n })} min={0} />
                <Contador etiqueta={t.menoresDe6} valor={pedido.childrenSmall} set={(n) => cambiar({ childrenSmall: n })} min={0} />
                <p className="mt-2 font-dm text-[12px] text-negro/50">{en ? "The price is for two people sharing a room; extra people are added automatically." : "El precio es por pareja; las personas extra se suman solas."}</p>
              </div>
              {habitaciones.length > 0 && (
                <div className="border-t border-negro/[0.07] pt-5">
                  <p className={`flex items-center gap-2 mb-3 ${ETIQUETA_GRUPO}`}><BedDouble className="w-3.5 h-3.5" aria-hidden="true" />{en ? "Your room" : "Tu habitación"}</p>
                  <div className="grid sm:grid-cols-2 gap-2.5">
                    {habitaciones.map((h) => {
                      const c = cotizarPedido({ ...pedido, habitacionId: h.id }, vistaMontana(h.id), false);
                      const dif = c && cuenta ? c.completo.total - cotizarPedido({ ...pedido, habitacionId: "" }, false, false)!.completo.total : 0;
                      const elegida = pedido.habitacionId === h.id;
                      return (
                        <button key={h.id} type="button" onClick={() => cambiar({ habitacionId: h.id })} aria-pressed={elegida}
                          className={`relative flex items-center gap-3 rounded-xl border p-2 pr-3 text-left transition-[border-color,background-color,box-shadow] duration-150 ${
                            elegida ? "border-verde-selva bg-verde-selva/[0.06] shadow-[0_0_0_3px_rgba(58,107,26,0.1)]" : "border-negro/10 bg-white hover:border-verde-selva/50"
                          }`}>
                          <span className="relative h-16 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-negro/5">
                            <Image src={h.imagen} alt={h.nombre} fill sizes="80px" className="object-cover" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-dm text-[14px] font-medium text-negro">{h.nombre}</span>
                            <span className={`block font-dm text-[12px] ${dif > 0 ? "text-negro/60" : "text-verde-selva"}`}>{dif > 0 ? `+${dinero(dif)} MXN` : (en ? "Included" : "Incluida")}</span>
                          </span>
                          <span className={`grid h-5 w-5 flex-shrink-0 place-items-center rounded-full border transition-colors ${elegida ? "border-verde-selva bg-verde-selva text-crema" : "border-negro/20"}`} aria-hidden="true">
                            {elegida && <Check className="h-3 w-3" strokeWidth={3} />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {eleccion && (
                <div className="border-t border-negro/[0.07] pt-5">
                  <p className={`mb-3 ${ETIQUETA_GRUPO}`}>{en ? `Pick ${eleccion.cuantos ?? 1}` : `Elige ${eleccion.cuantos ?? 1}`}</p>
                  <div className="flex flex-wrap gap-2">
                    {eleccion.opciones.map((o) => {
                      const on = pedido.elegidos.includes(o.slug);
                      return (
                        <button key={o.slug} type="button" aria-pressed={on}
                          onClick={() => cambiar({ elegidos: on ? pedido.elegidos.filter((x) => x !== o.slug) : [...pedido.elegidos, o.slug].slice(-(eleccion.cuantos ?? 1)) })}
                          className={`min-h-[40px] rounded-full border px-4 font-dm text-[13px] transition-colors ${on ? "border-verde-selva bg-verde-selva text-crema" : "border-negro/15 bg-white text-negro/75 hover:border-verde-selva/60"}`}>
                          {o.nombre ?? o.slug}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* La noche extra con su precio a la vista: «¿cuánto me cuesta?» se
                  contesta antes de marcarla, no en el total. */}
              <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors ${pedido.nocheExtra ? "border-verde-selva bg-verde-selva/[0.05]" : "border-negro/10 bg-white hover:border-verde-selva/50"}`}>
                <input type="checkbox" checked={pedido.nocheExtra} onChange={(e) => cambiar({ nocheExtra: e.target.checked })} className="mt-1 h-4 w-4 flex-shrink-0 accent-[#3a6b1a]" />
                <span className="min-w-0 flex-1 font-dm text-[12px] text-negro/65 leading-relaxed">
                  <span className="flex items-baseline justify-between gap-3">
                    <strong className="flex items-center gap-1.5 text-[14px] font-medium text-negro"><Moon className="w-3.5 h-3.5 text-verde-selva" aria-hidden="true" />{en ? "Arrive the night before" : "Llegar la víspera"}</strong>
                    {precioNoche > 0 && <span className="flex-shrink-0 text-[13px] text-negro/70">+{dinero(precioNoche)} MXN</span>}
                  </span>
                  {en ? "Day 1 is a tour day (pick-up 8:30–9:00 AM): with an extra night you check in the day before from 3 PM." : "El día 1 ya es de tour (salida 8:30–9:00 AM): con una noche extra entras el día anterior desde las 3 PM."}
                </span>
              </label>
            </div>
            <button type="button" onClick={terminarExperiencia} className={`mt-6 ${BOTON_PRINCIPAL}`}>
              {tc.continuar}
              <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
            </button>
          </PasoAcordeon>

          {/* ── ② Tus datos ── */}
          <PasoAcordeon id="paso-2" numero={2} titulo={tc.pasoDatos} estado={estado(2)} resumen={[name, phone, email].filter(Boolean).join(" · ")} textoEditar={tc.editar} onEditar={() => setPaso(2)}>
            <div className="space-y-4">
              <p className="font-dm text-[13px] text-negro/60">{en ? "So we can send your confirmation and coordinate your trip." : "Para mandarte tu confirmación y coordinar tu viaje."}</p>
              {campos.map((c) => {
                const id = `paq-${c.k}`;
                const err = errores[c.k];
                return (
                  <div key={c.k}>
                    <label htmlFor={id} className="block mb-1.5 font-dm text-[12px] font-medium text-negro/80">{c.etiqueta}</label>
                    <input id={id} name={c.k} value={c.valor} onChange={(e) => c.set(e.target.value)} type={c.tipo} autoComplete={c.ac} inputMode={c.im} placeholder={c.ph}
                      onBlur={() => { if (c.valor.trim()) validarCampo(c.k); }}
                      autoCapitalize={c.tipo === "email" ? "none" : undefined} spellCheck={c.tipo === "email" ? false : undefined}
                      aria-invalid={!!err} aria-describedby={err ? `${id}-error` : c.ayuda ? `${id}-ayuda` : undefined}
                      className={claseCampo(!!err)} />
                    {err ? <p id={`${id}-error`} className="mt-1.5 font-dm text-[12px] text-terracota">{err}</p>
                      : c.ayuda ? <p id={`${id}-ayuda`} className="mt-1.5 font-dm text-[11px] text-negro/45">{c.ayuda}</p> : null}
                  </div>
                );
              })}
              <div>
                <label htmlFor="paq-notas" className="block mb-1.5 font-dm text-[12px] font-medium text-negro/80">{en ? "Anything we should know? (optional)" : "¿Algo que debamos saber? (opcional)"}</label>
                <textarea id="paq-notas" value={notas} onChange={(e) => setNotas(e.target.value.slice(0, 300))} rows={2} className={claseCampo()} />
              </div>
              {cuenta && cuenta.completo.total >= MSI_DESDE && (
                <label className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3.5 transition-colors ${pagarTodo ? "border-verde-selva bg-verde-selva/[0.06]" : "border-verde-selva/30 bg-verde-selva/[0.03]"}`}>
                  <input type="checkbox" checked={pagarTodo} onChange={(e) => { setPagarTodo(e.target.checked); setCobro(null); }} className="mt-0.5 h-4 w-4 flex-shrink-0 accent-[#3a6b1a]" />
                  <span className="font-dm text-[12px] leading-relaxed text-verde-profundo">
                    <strong className="font-medium">{t.pagarTodoTitulo(formatMXN(cuenta.completo.total))}</strong><br />
                    <span className="text-negro/55">{t.pagarTodoMsi}</span>
                  </span>
                </label>
              )}
            </div>
            {error && paso === 2 && <p className="mt-3 font-dm text-[12px] text-terracota">{error}</p>}
            <button type="button" onClick={() => { void terminarDatos(); }} disabled={cargando} className={`mt-6 ${BOTON_PRINCIPAL}`}>
              {cargando ? tc.preparandoPago : tc.irAlPago}
              {!cargando && <Lock className="w-3.5 h-3.5" aria-hidden="true" />}
            </button>
          </PasoAcordeon>

          {/* ── ③ Pago ── */}
          <PasoAcordeon id="paso-3" numero={3} titulo={tc.pasoPago} estado={estado(3)} textoEditar={tc.editar}>
            {error && paso === 3 && <p className="mb-3 font-dm text-[12px] text-terracota">{error}</p>}
            {cobro && (
              <>
                <details className="lg:hidden mb-4 rounded-xl border border-negro/10">
                  <summary className="cursor-pointer list-none px-3.5 py-3 font-dm text-[12px] text-verde-selva">{tc.verDesglose} +</summary>
                  <div className="px-2 pb-2">{resumen}</div>
                </details>
                <Elements stripe={stripePromise} options={{ clientSecret: cobro.clientSecret, locale, appearance: APARIENCIA_STRIPE }}>
                  <PagoCarrito formId={FORM_PAGO} cobro={cobro} datos={{ name, email, phone, pickup: "" }} onListo={() => olvidarPedido()} conservarCarrito />
                </Elements>
                <ConfianzaJuntoAlBoton resenas={t.resenasGoogle} cancelacion={null} pagoCifrado={tc.pagoCifrado} />
                <QuePasaDespues titulo={tc.queSigueTitulo} pasos={pasos} />
              </>
            )}
          </PasoAcordeon>
          {!cuenta && (
            <p className="flex items-start gap-2 font-dm text-[12px] text-terracota"><AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />{en ? `For more than ${MAX_PERSONAS_PAQUETE} people, message us on WhatsApp.` : `Para más de ${MAX_PERSONAS_PAQUETE} personas escríbenos por WhatsApp.`}</p>
          )}

          {/* Las dudas que más frenan el pago de un paquete, plegadas. */}
          {dudas.length > 0 && (
            <section className={`${TARJETA} mt-6 px-4 sm:px-6 py-5`}>
              <h2 className="font-cormorant text-verde-profundo text-[22px] mb-1">{t.antesDePagar}</h2>
              <div className="divide-y divide-negro/[0.07]">
                {dudas.map((f) => (
                  <details key={f.q} className="group py-3.5" onToggle={(e) => { if ((e.currentTarget as HTMLDetailsElement).open) trackTourEvent("RESPUESTA_ABIERTA", { id: f.q.slice(0, 40), paquete: slug }); }}>
                    <summary className="flex items-start justify-between gap-4 cursor-pointer list-none font-dm text-[13px] text-negro/80">
                      <span>{f.q}</span>
                      <span className="text-verde-selva text-lg leading-none flex-shrink-0 transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                    </summary>
                    <p className="font-dm text-[12px] text-negro/55 leading-relaxed mt-2 pr-6">{f.a}</p>
                  </details>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="hidden lg:block min-w-0 lg:sticky lg:top-6 space-y-3">
          {resumen}
          <button type="button" onClick={accion.fn} disabled={cargando || (paso === 3 && !cobro)} className={BOTON_PRINCIPAL}>
            {accion.texto}
            <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
          </button>
          <div className={`${TARJETA} px-5 sm:px-6 pb-5 pt-1`}>
            <ConfianzaJuntoAlBoton resenas={t.resenasGoogle} cancelacion={null} pagoCifrado={tc.pagoCifrado} />
            {paso < 3 && <QuePasaDespues titulo={tc.queSigueTitulo} pasos={pasos} />}
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
      {/* El rescate por WhatsApp mientras arma su viaje (como en tours); en el
          pago estorba. Las reservas reales, solo mientras escribe sus datos. */}
      <RescatePopup activo={paso === 1 && !email.trim()} mensaje={waRescate} />
      {paso === 2 && <ReservasRecientes />}
    </div>
  );
}

/** Los slugs que el checkout de paquete acepta (catálogo, sin eventos). */
export const SLUGS_PAQUETE_CHECKOUT = new Set(PAQUETES_DB.filter((x) => !x.evento).map((x) => x.slug));
