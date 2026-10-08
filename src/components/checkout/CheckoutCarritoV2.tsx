"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Elements } from "@stripe/react-stripe-js";
import { ChevronLeft, AlertCircle } from "lucide-react";
import { formatMXN } from "@/lib/tourBooking";
import { TOURS_DB, type Tour } from "@/lib/tours";
import { HABITACIONES_HOTEL } from "@/lib/habitaciones";
import { getBooking } from "@/lib/i18n/booking";
import { stripePromise, APARIENCIA_STRIPE } from "@/lib/stripeCliente";
import { trackTourEvent } from "@/lib/tourTracker";
import { validarCarrito } from "@/lib/carritoValidacion";
import { respuestasRapidas, cancelacionJuntoAlBoton, type RecorridoFechado } from "@/lib/checkoutRespuestas";
import { validarContacto, type CampoContacto, type ErroresContacto } from "@/lib/checkout/validarContacto";
import { GaleriaHabitacion } from "@/components/booking/GaleriaHabitacion";
import { RescatePopup } from "@/components/carrito/RescatePopup";
import { RenglonCarrito } from "@/components/carrito/RenglonCarrito";
import { AgregarRecorrido } from "@/components/carrito/AgregarRecorrido";
import { ResumenCarrito } from "@/components/carrito/ResumenCarrito";
import { PagoCarrito } from "@/components/carrito/PagoCarrito";
import { ApartadoAviso } from "@/components/carrito/ApartadoAviso";
import { nombreCorto } from "@/components/carrito/carritoComun";
import type { CarritoCheckout } from "@/components/carrito/useCarritoCheckout";
import { EncabezadoCerrado } from "./EncabezadoCerrado";
import { BandaFoto } from "./BandaFoto";
import { PasoAcordeon, type EstadoPaso } from "./PasoAcordeon";
import { RespuestasRapidas } from "./RespuestasRapidas";
import { LineaExtras } from "./LineaExtras";
import { DatosContacto } from "./DatosContacto";
import { BarraPago } from "./BarraPago";
import { ConfianzaJuntoAlBoton } from "./ConfianzaJuntoAlBoton";
import { QuePasaDespues } from "./QuePasaDespues";

const FORM_PAGO = "checkout-pago";

/**
 * El checkout del carrito, rediseñado (oct 2026). Misma lógica que el de antes
 * (`useCarritoCheckout`: precios, reglas, cobro), otra pantalla:
 *
 *   encabezado cerrado → foto del recorrido →
 *   ① Tu experiencia → ② Tus datos → ③ Pago   + barra fija con «hoy pagas»
 *
 * Por qué así (plan del 4 oct, `~/.claude/plans/enumerated-jumping-mountain.md`):
 * de 66 personas que eligieron fecha en 30 días, 13 llegaron al pago. La página
 * de antes medía ~4,000 px en celular, con hotel y traslado en medio y los
 * datos hasta abajo; casi nadie llegaba a teclear la tarjeta.
 */
export function CheckoutCarritoV2({ c }: { c: CarritoCheckout }) {
  const {
    locale, t, items, name, setName, email, setEmail, phone, setPhone, pickup, setPickup,
    cobro, cargando, error, fallos, galeria, setGaleria, checkin, checkout, setItems,
    total, anticipo, saldo, pctHoy, waRescate, sinFechaItems, conFechaItems, correoGuardar,
    setCorreoGuardar, guardando, guardado, errorGuardar, setErrorGuardar, guardarCotizacion,
    guardarSilencioso, irAlRenglon, irAlPago, setFallos,
    pagarTodo, cambiarPagarTodo, puedePagarTodo, guiaIngles, setGuiaIngles,
  } = c;
  const tc = getBooking(locale).checkout;

  const [paso, setPaso] = useState<1 | 2 | 3>(1);
  const [erroresDatos, setErroresDatos] = useState<ErroresContacto>({});
  const [verCotizacion, setVerCotizacion] = useState(false);

  // El menú del sitio se esconde mientras este checkout está en pantalla.
  useEffect(() => {
    document.documentElement.dataset.checkoutCerrado = "1";
    return () => { delete document.documentElement.dataset.checkoutCerrado; };
  }, []);

  // Cualquier cambio en el viaje borra el cobro (`useCarritoCheckout`): si
  // estaba en el pago, vuelve a «Tus datos» para crearlo otra vez.
  useEffect(() => {
    if (paso === 3 && !cobro && !cargando) setPaso(2);
  }, [paso, cobro, cargando]);

  // El cobro llegó: se abre el pago.
  useEffect(() => {
    if (cobro && paso === 2) setPaso(3);
  }, [cobro, paso]);

  // Al cambiar de paso, la vista va al paso abierto (en celular, el de arriba
  // ya plegado deja todo más arriba de donde estaba el dedo).
  useEffect(() => {
    const id = `paso-${paso}`;
    const nodo = document.getElementById(id);
    if (paso > 1 && nodo) nodo.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [paso]);

  const recorridos: RecorridoFechado[] = useMemo(
    () => items
      .map((i) => ({ tour: TOURS_DB.find((x) => x.slug === i.tourSlug), fecha: i.tourDate }))
      .filter((r): r is { tour: Tour; fecha: string } => !!r.tour),
    [items],
  );
  // El TOTAL del viaje (no el anticipo) decide si «¿Cómo puedo pagar?» nombra
  // los meses: existen pagando completo, y sobre el 30 % no los da ningún banco.
  const respuestas = useMemo(() => respuestasRapidas(recorridos, locale, total), [recorridos, locale, total]);
  const cancelacion = useMemo(() => cancelacionJuntoAlBoton(recorridos, locale), [recorridos, locale]);

  /** ① → ②: el carrito tiene que estar completo (fechas, elecciones, mínimos). */
  function terminarExperiencia() {
    const problemas = validarCarrito(items, locale);
    setFallos(problemas);
    if (problemas.length) {
      irAlRenglon(problemas[0].uid);
      return;
    }
    trackTourEvent("CHECKOUT_STEP_EXPERIENCIA", { recorridos: items.length, amount: anticipo, total });
    setPaso(2);
  }

  /**
   * Del aviso del apartado al renglón que ya no tiene lugar. Primero se abre
   * el paso ①: plegado no pinta sus renglones y no habría adónde llevar la vista.
   */
  function cambiarFechaSinLugar() {
    setPaso(1);
    setTimeout(c.irAlSinLugar, 50);
  }

  function validarCampo(campo: CampoContacto) {
    const todos = validarContacto({ name, email, phone }, tc);
    setErroresDatos((e) => ({ ...e, [campo]: todos[campo] }));
  }

  /** ② → ③: datos válidos, se guarda el carrito en silencio y se crea el cobro. */
  async function terminarDatos() {
    const errores = validarContacto({ name, email, phone }, tc);
    setErroresDatos(errores);
    const primero = (["name", "phone", "email"] as const).find((k) => errores[k]);
    if (primero) {
      document.getElementById(`datos-${primero}`)?.focus();
      return;
    }
    trackTourEvent("CHECKOUT_STEP_DATOS", { recorridos: items.length, amount: anticipo, total });
    guardarSilencioso();
    await irAlPago();
  }

  // El botón de la barra fija hace lo mismo que el del paso abierto.
  const accionBarra = paso === 1
    ? { texto: tc.continuar, fn: terminarExperiencia }
    : paso === 2
      ? { texto: cargando ? tc.preparandoPago : tc.irAlPago, fn: () => { void terminarDatos(); } }
      : { texto: t.pagar(formatMXN(anticipo)).replace(/ MXN$/, ""), fn: () => (document.getElementById(FORM_PAGO) as HTMLFormElement | null)?.requestSubmit() };

  const estado = (n: 1 | 2 | 3): EstadoPaso => (n === paso ? "abierto" : n < paso ? "hecho" : "bloqueado");

  const resumenExperiencia = [
    ...conFechaItems.map((i) => `${nombreCorto(i.tourSlug, i.tourName, locale)} · ${i.tourDate.slice(8)}/${i.tourDate.slice(5, 7)}`),
    ...(sinFechaItems.length ? [tc.sinFechaResumen] : []),
  ].join(" · ");

  return (
    <div className="min-h-screen bg-crema pb-28 lg:pb-16">
      <EncabezadoCerrado />
      <BandaFoto items={items} locale={locale} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4">
        <Link href={c.lp("/reservar")} className="inline-flex items-center gap-1.5 text-negro/50 hover:text-verde-selva text-[11px] font-dm tracking-[1px] uppercase transition-colors">
          <ChevronLeft className="w-3 h-3" aria-hidden="true" />
          {t.seguirEligiendo}
        </Link>
        {/* El apartado de 15 minutos, arriba de los tres pasos: en el celular se
            ve en cualquiera de ellos. En escritorio va en el resumen de la
            derecha, que no se mueve. */}
        <ApartadoAviso a={c.apartado} locale={locale} className="lg:hidden mt-3" onCambiarFecha={cambiarFechaSinLugar} />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-4 grid lg:grid-cols-[1fr_360px] gap-6 lg:gap-8 items-start min-w-0">
        <div className="min-w-0 space-y-3">
          {/* ── ① Tu experiencia ─────────────────────────────────────────── */}
          <PasoAcordeon
            id="paso-1" numero={1} titulo={tc.pasoExperiencia} estado={estado(1)}
            resumen={resumenExperiencia} textoEditar={tc.editar} onEditar={() => setPaso(1)}
          >
            {error && (
              <p className="mb-3 border border-terracota/40 bg-terracota/8 px-3 py-2.5 font-dm text-[12px] text-terracota">{error}</p>
            )}
            <div className="space-y-3">
              {sinFechaItems.length > 0 && (
                <div>
                  <p className={`flex items-center gap-2 font-dm text-[11px] tracking-[1.5px] uppercase mb-2 ${fallos.length ? "text-terracota" : "text-negro/45"}`}>
                    <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                    {sinFechaItems.length === 1 ? t.eligeElDia : t.eligeElDiaN(sinFechaItems.length)}
                  </p>
                  <div className="space-y-3">
                    {sinFechaItems.map((i) => <RenglonCarrito key={i.uid} i={i} c={c} />)}
                  </div>
                </div>
              )}
              {conFechaItems.map((i) => <RenglonCarrito key={i.uid} i={i} c={c} />)}
            </div>

            {/* 🔴 «Agregar otro recorrido» subió por encima de las dudas y de
                los extras (Manolo, 8 oct). Donde estaba —debajo del FAQ— lo
                veía quien ya había bajado por todo, que es justo quien ya
                decidió. Y la mayoría hace 2 o 3 recorridos: es el renglón que
                más sube el ticket, no un pie de página. */}
            <AgregarRecorrido c={c} />
            <RespuestasRapidas titulo={tc.respuestasTitulo} respuestas={respuestas} />
            <LineaExtras c={c} />

            <button
              type="button"
              onClick={terminarExperiencia}
              className="mt-5 w-full bg-verde-selva text-crema py-4 text-[12px] tracking-[2px] uppercase font-dm font-medium hover:bg-verde-vivo transition-colors"
            >
              {tc.continuar}
            </button>

            {/* La salida secundaria, plegada: quien todavía lo piensa deja su
                correo y le llega la cotización (con los recordatorios). */}
            <div className="mt-3 text-center">
              {guardado ? (
                <p className="font-dm text-[12px] text-verde-selva">{t.cotizacionEnviada}</p>
              ) : !verCotizacion ? (
                <button type="button" onClick={() => setVerCotizacion(true)} className="font-dm text-[12px] text-negro/55 underline underline-offset-2 hover:text-verde-selva">
                  {tc.cotizacionLink}
                </button>
              ) : (
                <div className="text-left">
                  <div className="flex gap-2">
                    <input
                      value={correoGuardar || email}
                      onChange={(e) => { setCorreoGuardar(e.target.value); setErrorGuardar(""); }}
                      type="email" autoComplete="email" inputMode="email" aria-label={tc.correoLabel}
                      placeholder={t.tuCorreoPlaceholder}
                      className="flex-1 min-w-0 border border-negro/20 bg-white px-3 py-2.5 font-dm text-[14px] text-negro placeholder:text-negro/35 focus:border-verde-selva outline-none"
                    />
                    <button
                      type="button" onClick={guardarCotizacion} disabled={guardando}
                      className="flex-shrink-0 border border-verde-selva text-verde-selva px-4 text-[11px] tracking-[1.5px] uppercase font-dm hover:bg-verde-selva/8 transition-colors disabled:opacity-40"
                    >
                      {guardando ? "…" : t.enviar}
                    </button>
                  </div>
                  {errorGuardar && <p className="font-dm text-[11px] text-terracota mt-1.5">{errorGuardar}</p>}
                  <p className="font-dm text-[11px] text-negro/40 mt-1.5">{t.sinCompromiso}</p>
                </div>
              )}
            </div>
          </PasoAcordeon>

          {/* ── ② Tus datos ──────────────────────────────────────────────── */}
          <PasoAcordeon
            id="paso-2" numero={2} titulo={tc.pasoDatos} estado={estado(2)}
            resumen={[name, phone, email].filter(Boolean).join(" · ")}
            textoEditar={tc.editar} onEditar={() => setPaso(2)}
          >
            <DatosContacto
              m={tc}
              name={name} setName={setName} email={email} setEmail={setEmail}
              phone={phone} setPhone={setPhone} pickup={pickup} setPickup={setPickup}
              guiaIngles={guiaIngles} setGuiaIngles={setGuiaIngles}
              errores={erroresDatos} onSalirDe={validarCampo}
            />
            {/* 🔴 «Pagar completo» va AQUÍ y no en el paso ③: el importe se fija
                al crear el PaymentIntent, que es lo que pasa al pulsar el botón
                de abajo. Elegirlo después obligaría a rehacer el cobro.
                Solo aparece cuando el viaje llega al umbral de los meses sin
                intereses: debajo de eso no le sirve a nadie. */}
            {puedePagarTodo && (
              <div className="mt-5 border border-verde-selva/30 bg-verde-selva/5 p-3.5">
                <label className="flex cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={pagarTodo}
                    onChange={(e) => cambiarPagarTodo(e.target.checked)}
                    className="mt-0.5 h-4 w-4 flex-shrink-0 accent-[#3a6b1a]"
                  />
                  <span className="font-dm text-[12px] leading-relaxed text-verde-profundo">
                    <strong className="font-medium">{t.pagarTodoTitulo(formatMXN(total))}</strong>
                    <br />
                    <span className="text-negro/55">{t.pagarTodoMsi}</span>
                  </span>
                </label>
              </div>
            )}
            {error && <p className="mt-3 font-dm text-[12px] text-terracota">{error}</p>}
            <button
              type="button"
              onClick={() => { void terminarDatos(); }}
              disabled={cargando}
              className="mt-5 w-full bg-verde-selva text-crema py-4 text-[12px] tracking-[2px] uppercase font-dm font-medium hover:bg-verde-vivo transition-colors disabled:opacity-50"
            >
              {cargando ? tc.preparandoPago : tc.irAlPago}
            </button>
          </PasoAcordeon>

          {/* ── ③ Pago ───────────────────────────────────────────────────── */}
          <PasoAcordeon id="paso-3" numero={3} titulo={tc.pasoPago} estado={estado(3)} textoEditar={tc.editar}>
            {/* 🔴 El error se pintaba en los pasos ① y ② pero NO aquí. Un fallo
                del servidor al rehacer el cobro —cambiar la fecha ya en el paso
                de pagar vuelve a pedir el PaymentIntent— dejaba la pantalla
                muda: el efecto devuelve al paso ②, pero quien no mira hacia
                arriba solo ve que el botón no hizo nada. */}
            {error && !cobro && <p className="mb-3 font-dm text-[12px] text-terracota">{error}</p>}
            {cobro && (
              <>
                {/* En celular el resumen no tiene columna propia: va aquí,
                    plegado, para revisar el desglose antes de pagar. */}
                <details className="lg:hidden mb-4 border border-negro/10">
                  <summary className="cursor-pointer list-none px-3 py-2.5 font-dm text-[12px] text-verde-selva">{tc.verDesglose} +</summary>
                  <div className="px-3 pb-3"><ResumenCarrito c={c} /></div>
                </details>
                <Elements stripe={stripePromise} options={{ clientSecret: cobro.clientSecret, locale, appearance: APARIENCIA_STRIPE }}>
                  <PagoCarrito
                    formId={FORM_PAGO}
                    cobro={cobro}
                    datos={{ name, email, phone, pickup, checkin, checkout, guiaIngles }}
                    onListo={() => setItems([])}
                  />
                </Elements>
                <ConfianzaJuntoAlBoton resenas={t.resenasGoogle} cancelacion={cancelacion} pagoCifrado={tc.pagoCifrado} />
                <QuePasaDespues titulo={tc.queSigueTitulo} pasos={tc.queSigue(formatMXN(saldo))} />
              </>
            )}
          </PasoAcordeon>

          {/* Las dudas de siempre, al final y plegadas. La de cancelar ya va,
              con fecha exacta, en «Lo que más nos preguntan». */}
          <section className="pt-6">
            <h2 className="font-cormorant text-verde-profundo text-xl mb-2">{t.antesDePagar}</h2>
            <div className="divide-y divide-negro/10 border-y border-negro/10">
              {t.faq.filter((f) => f.clave !== "cancelar").map((f) => (
                <details key={f.q} className="group py-3.5">
                  <summary className="flex items-start justify-between gap-4 cursor-pointer list-none font-dm text-[13px] text-negro/80">
                    <span>{f.q}</span>
                    <span className="text-verde-selva text-lg leading-none flex-shrink-0 transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                  </summary>
                  <p className="font-dm text-[12px] text-negro/55 leading-relaxed mt-2 pr-6">
                    {f.clave === "salidas" ? c.respuestaSalidas : f.clave === "cancelar" ? c.respuestaCancelar(f.a) : f.a}
                  </p>
                </details>
              ))}
            </div>
          </section>
        </div>

        {/* ── Resumen (escritorio) ─────────────────────────────────────── */}
        {/* `ResumenReserva` ya trae su propia tarjeta: el aside no pone otra
            alrededor (tarjeta dentro de tarjeta). */}
        <aside className="hidden lg:block min-w-0 lg:sticky lg:top-6 space-y-3">
          {/* Calla: el de arriba ya habla (un lector de pantalla oiría dos). */}
          <ApartadoAviso a={c.apartado} locale={locale} anunciar={false} onCambiarFecha={cambiarFechaSinLugar} />
          <ResumenCarrito c={c} />
          <div className="border border-negro/10 bg-white px-5 pb-4 pt-1">
            <ConfianzaJuntoAlBoton resenas={t.resenasGoogle} cancelacion={cancelacion} pagoCifrado={tc.pagoCifrado} />
            {paso < 3 && <QuePasaDespues titulo={tc.queSigueTitulo} pasos={tc.queSigue(formatMXN(saldo))} />}
          </div>
        </aside>
      </div>

      <BarraPago
        etiquetaHoy={t.pagasHoy(pctHoy)}
        hoy={formatMXN(anticipo)}
        total={tc.barraTotal(formatMXN(total))}
        boton={accionBarra.texto}
        onBoton={accionBarra.fn}
        ocupado={cargando}
      />

      <GaleriaHabitacion
        habitacion={HABITACIONES_HOTEL.find((h) => h.id === galeria) ?? null}
        abierta={!!galeria}
        onCerrar={() => setGaleria(null)}
      />
      {/* El rescate por WhatsApp solo mientras arma su viaje y antes de dejar
          su correo: después ya tenemos cómo escribirle, y en el pago estorba. */}
      <RescatePopup activo={items.length > 0 && !cobro && paso === 1 && !email.trim()} mensaje={waRescate} />
    </div>
  );
}
