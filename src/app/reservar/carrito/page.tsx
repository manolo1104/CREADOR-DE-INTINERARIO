"use client";

import Link from "next/link";
import { Elements } from "@stripe/react-stripe-js";
import { ChevronLeft, Lock, MapPin, Clock, ShieldCheck, Star, Users, AlertCircle } from "lucide-react";
import { HABITACIONES_HOTEL } from "@/lib/habitaciones";
import { formatMXN } from "@/lib/tourBooking";
// La calificación y el perfil salen de resenas.ts: en las dos franjas de
// confianza de esta página quedaba un «4.9» escrito a mano, justo donde se paga.
import { GOOGLE_RATING, GOOGLE_PERFIL_URL as GOOGLE_MAPS_REVIEWS_URL } from "@/lib/resenas";
import { RescatePopup } from "@/components/carrito/RescatePopup";
import { GaleriaHabitacion } from "@/components/booking/GaleriaHabitacion";
import { BotonCompartir } from "@/components/booking/BotonCompartir";
import { stripePromise } from "@/lib/stripeCliente";
import { PagoCarrito } from "@/components/carrito/PagoCarrito";
import { useCarritoCheckout } from "@/components/carrito/useCarritoCheckout";
import { useCheckoutV2 } from "@/components/checkout/useCheckoutV2";
import { CheckoutCarritoV2 } from "@/components/checkout/CheckoutCarritoV2";
import { RenglonCarrito } from "@/components/carrito/RenglonCarrito";
import { HospedajeCarrito } from "@/components/carrito/HospedajeCarrito";
import { TrasladoCarrito } from "@/components/carrito/TrasladoCarrito";
import { AgregarRecorrido } from "@/components/carrito/AgregarRecorrido";
import { ResumenCarrito } from "@/components/carrito/ResumenCarrito";

/**
 * Las dudas que de verdad frenan el pago viven en `i18n/booking.ts`
 * (`carrito.faq`). Todas las respuestas salen de lo que el sitio ya afirma
 * (política de cancelación, fichas de tour): ahí no se inventa ninguna
 * condición nueva.
 */

// ── Página ───────────────────────────────────────────────────────────────────

export default function CarritoPage() {
  // Primero la bandera: lee `?checkout=v2` antes de que el carrito limpie la URL.
  const v2 = useCheckoutV2();
  // La lógica vive en `useCarritoCheckout`; aquí solo se pinta.
  const c = useCarritoCheckout();
  const {
    locale, lp, t, items, setItems, montado, hidratando, name, setName, email,
    setEmail, phone, setPhone, pickup, setPickup, cobro, conHotel, conTraslado,
    paxTraslado, habs, galeria, setGaleria, checkin, checkout, error, cargando,
    nombreRef, fallos, correoGuardar, setCorreoGuardar, guardando, guardado,
    errorGuardar, setErrorGuardar, noches, rutaTraslado, precioDelTraslado, resumen,
    dias, total, pctHoy, anticipo, lineasSalida, respuestaSalidas, todosCancelPropia,
    nombreCat, cancelacionDe, respuestaCancelar, cancelPropiaEnCarrito, waRescate,
    sinFechaItems, conFechaItems, guardarCotizacion, irAlRenglon, irAlPago,
  } = c;
  if (!montado || hidratando) return <main className="min-h-screen bg-crema pt-32" />;

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-crema pt-32 pb-20 px-6">
        <div className="max-w-lg mx-auto text-center">
          <h1 className="font-cormorant font-light text-verde-profundo text-3xl mb-4">{t.vacioTitulo}</h1>
          <p className="font-dm text-negro/55 text-sm mb-8">
            {t.vacioTexto}
          </p>
          <Link href={lp("/reservar")} className="inline-block bg-verde-selva text-crema px-8 py-4 text-[11px] tracking-[2px] uppercase font-dm hover:bg-verde-vivo transition-colors">
            {t.verRecorridos}
          </Link>
        </div>
      </main>
    );
  }


  // El checkout rediseñado (oct 2026), detrás de la bandera hasta que Manolo
  // lo apruebe para todos (ver `useCheckoutV2`).
  if (v2) return <CheckoutCarritoV2 c={c} />;

  return (
    // `pb-36` en móvil: la barra fija de abajo tapaba el final de las preguntas.
    <main className="min-h-screen bg-crema pt-24 pb-36 lg:pb-20">
      <div className="max-w-5xl mx-auto px-6 mb-8">
        <Link href={lp("/reservar")} className="inline-flex items-center gap-1.5 text-negro/50 hover:text-verde-selva text-xs font-dm tracking-[1px] uppercase transition-colors">
          <ChevronLeft className="w-3 h-3" />
          {t.seguirEligiendo}
        </Link>
      </div>

      {/* Dónde va y cuánto falta. Sin esto el carrito parecía un formulario sin
          fin: no había forma de saber si faltaban dos pantallas o diez. */}
      <div className="max-w-5xl mx-auto px-6 mb-8">
        <div className="flex items-center gap-2 sm:gap-3">
          {t.pasos.map((etiqueta, n) => {
            const paso    = cobro ? 3 : (name.trim() && email.trim() ? 2 : 1);
            const hecho   = n + 1 < paso;
            const actual  = n + 1 === paso;
            return (
              <div key={etiqueta} className="flex items-center gap-2 sm:gap-3">
                <div className={`flex items-center gap-2 ${actual ? "text-verde-selva" : hecho ? "text-verde-selva/70" : "text-negro/30"}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-dm font-medium ${
                    actual ? "bg-verde-selva text-white" : hecho ? "bg-verde-selva/20 text-verde-selva" : "border border-negro/20"
                  }`}>
                    {hecho ? "✓" : n + 1}
                  </span>
                  <span className="text-[11px] tracking-[1px] uppercase font-dm hidden sm:block">{etiqueta}</span>
                </div>
                {n < 2 && <div className={`h-px w-6 sm:w-10 ${hecho ? "bg-verde-selva/40" : "bg-negro/15"}`} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* `min-w-0` en el grid Y en sus hijos.
        Sin él, un hijo de grid tiene `min-width: auto` y se niega a encoger por
        debajo del ancho mínimo de su contenido: en un teléfono de 360 px la
        columna se quedaba en 373 y TODO el carrito salía cortado por la derecha
        —el título, los precios, los botones—. Se veía bien a 390 px, que es
        justo el tamaño con el que se probó. */}
      <div className="max-w-5xl mx-auto px-6 grid lg:grid-cols-[1fr_380px] gap-10 items-start min-w-0">

        {/* ── Renglones ── */}
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
          <h1 className="font-cormorant font-light text-verde-profundo text-3xl mb-1 min-w-0">{t.tuViaje}</h1>
          {/* Compartirlo con quien decide. El carrito vive en ESTE navegador,
            así que el enlace se genera guardándolo en el servidor. */}
          <BotonCompartir
            titulo={t.compartirTitulo}
            texto={t.compartirTexto(items.length, formatMXN(total))}
            origen="carrito"
            className="flex-shrink-0 border border-verde-selva/40 text-verde-selva px-3 py-2 hover:bg-verde-selva/8"
            obtenerUrl={async () => {
              const r = await fetch("/api/tours/compartir", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  items,
                  hospedaje: conHotel ? { habitaciones: habs, noches, checkin, checkout } : null,
                  traslado: conTraslado && rutaTraslado && precioDelTraslado !== null
                    ? { ciudad: rutaTraslado.slug, personas: paxTraslado } : null,
                }),
              });
              const d = await r.json().catch(() => null);
              return r.ok ? d?.url ?? null : null;
            }}
          />
        </div>
          <p className="font-dm text-negro/50 text-sm mb-4">
            {t.conteo(items.length, dias)}
          </p>

          {/* ── FRANJA DE CONFIANZA ────────────────────────────────────────
            La página del dinero era la ÚNICA sin una sola señal de confianza a
            la vista: la calificación, las credenciales y los testimonios viven
            al final del documento, después del formulario y del pago. En un
            teléfono eso son varias pantallas de scroll que casi nadie recorre,
            así que quien llegaba aquí desde Google decidía pagarle a un
            desconocido sin ver un solo motivo para hacerlo.

            Va compacta —una franja, no un bloque— justo por lo que decía el
            comentario de abajo: un módulo alto aquí empuja el resumen y el
            botón de pagar fuera de la pantalla. Las reseñas largas se quedan
            donde están. */}
          <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-negro/8 py-2.5">
            <a
              href={GOOGLE_MAPS_REVIEWS_URL}
              target="_blank" rel="noopener noreferrer"
              className="group inline-flex items-center gap-1.5"
            >
              <span className="flex gap-0.5" aria-hidden="true">
                {[...Array(5)].map((_, k) => <Star key={k} className="w-3 h-3 fill-dorado text-dorado" />)}
              </span>
              <span className="font-dm text-[12px] text-negro/70">
                <strong className="text-negro">{GOOGLE_RATING}</strong> · {t.resenasGoogle}
              </span>
            </a>
            {/* Si todo el carrito es sin reembolso (solo el Edén), no hay sello
                de cancelación que dar: su política va completa más abajo. */}
            {!todosCancelPropia && (
              <span className="inline-flex items-center gap-1.5 font-dm text-[12px] text-negro/55">
                <ShieldCheck className="w-3.5 h-3.5 text-verde-selva flex-shrink-0" aria-hidden="true" />
                {cancelPropiaEnCarrito.length
                  ? t.confianzaCancelasSalvo(cancelPropiaEnCarrito.map(nombreCat).join(", "))
                  : t.confianzaCancelas}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 font-dm text-[12px] text-negro/55">
              <Lock className="w-3.5 h-3.5 text-verde-selva flex-shrink-0" aria-hidden="true" />
              {t.confianzaPago(pctHoy)}
            </span>
          </div>

          <div className="space-y-3">
          {/* Dos grupos: primero lo que BLOQUEA el pago (recorridos sin
              fecha, que entran así al agregarlos desde el catálogo) y después
              el itinerario ordenado por día. Antes salían en el orden en que
              se agregaron, así que un viaje de cuatro días se leía descolocado
              y no había forma de ver qué faltaba. */}
          {error && (
            <p className="mb-4 border border-terracota/40 bg-terracota/8 px-3 py-2.5 font-dm text-[12px] text-terracota">
              {error}
            </p>
          )}

          {sinFechaItems.length > 0 && (
            <div className="mb-6">
              {/* Neutral mientras la persona todavía está armando su viaje. Los
                recorridos sin fecha se agrupan arriba porque son los que tiene
                que atender, pero recibirla con un encabezado en rojo antes de
                que toque nada la trata como si ya se hubiera equivocado. Se
                pone en rojo cuando intenta pagar y de verdad falta algo. */}
              <p className={`flex items-center gap-2 font-dm text-[11px] tracking-[1.5px] uppercase mb-2 transition-colors ${
                fallos.length > 0 ? "text-terracota" : "text-negro/40"
              }`}>
                <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                {sinFechaItems.length === 1 ? t.eligeElDia : t.eligeElDiaN(sinFechaItems.length)}
              </p>
              <div className="space-y-3">
                {sinFechaItems.map((i) => <RenglonCarrito key={i.uid} i={i} c={c} />)}
              </div>
            </div>
          )}

          {conFechaItems.length > 0 && (
            <div>
              {sinFechaItems.length > 0 && (
                <p className="font-dm text-[11px] tracking-[1.5px] uppercase text-negro/40 mb-2">
                  {t.tuItinerario}
                </p>
              )}
              <div className="space-y-3">
                {conFechaItems.map((i) => <RenglonCarrito key={i.uid} i={i} c={c} />)}
              </div>
            </div>
          )}
          </div>

          {/* Logística: la duda que más frena en el momento de pagar. Sale de
              los recorridos de ESTE carrito (`lineasSalida`): una frase si
              todos se recogen igual, una por recorrido si no. */}
          <div className="mt-6 border border-verde-selva/25 bg-verde-selva/5 p-5 space-y-3">
            <div className="flex items-start gap-2.5 font-dm text-[13px] text-negro/70">
              <MapPin className="w-4 h-4 text-verde-selva flex-shrink-0 mt-0.5" aria-hidden="true" />
              {lineasSalida.length > 1 ? (
                <div>
                  <p className="text-negro/85 font-medium">{t.recogidaCadaRecorrido}</p>
                  <ul className="mt-1.5 space-y-1.5">
                    {lineasSalida.map((l) => <li key={l}>{l}</li>)}
                  </ul>
                  <p className="mt-1.5">{t.noHaceFaltaHospedarte}</p>
                </div>
              ) : (
                <p>
                  {lineasSalida[0] && <strong className="font-medium text-negro/85">{lineasSalida[0]}</strong>}{" "}
                  {t.noHaceFaltaHospedarte}
                </p>
              )}
            </div>
            <p className="flex items-start gap-2.5 font-dm text-[13px] text-negro/70">
              <Clock className="w-4 h-4 text-verde-selva flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span>{t.horaExacta}</span>
            </p>
            <div className="flex items-start gap-2.5 font-dm text-[13px] text-negro/70">
              <ShieldCheck className="w-4 h-4 text-verde-selva flex-shrink-0 mt-0.5" aria-hidden="true" />
              {cancelPropiaEnCarrito.length === 0 ? (
                <span>{t.cancelacionGratuita}</span>
              ) : (
                <div className="space-y-1.5">
                  {cancelPropiaEnCarrito.map((x) => (
                    <p key={x.slug}>
                      <strong className="font-medium text-negro/85">{nombreCat(x)}:</strong> {cancelacionDe(x)}
                    </p>
                  ))}
                  {!todosCancelPropia && <p>{t.cancelacionResto}</p>}
                </div>
              )}
            </div>
          </div>

          <AgregarRecorrido c={c} />

          <HospedajeCarrito c={c} />

          <TrasladoCarrito c={c} />

        </div>

        {/* ── Resumen y pago ── */}
        <aside className="min-w-0 border border-negro/10 bg-white p-6 lg:sticky lg:top-24">
          {/* Mismo resumen que el checkout de un tour: qué se aparta, qué va
              incluido en cada recorrido, la logística y los números. */}
          <ResumenCarrito c={c} />

          {!cobro ? (
            <div className="pt-4 space-y-3">
              <input
                ref={nombreRef}
                value={name} onChange={(e) => setName(e.target.value)}
                placeholder={t.nombreCompleto}
                className="w-full border border-negro/15 bg-white px-3 py-3 font-dm text-sm text-negro placeholder:text-negro/40 focus:border-verde-selva outline-none"
              />
              <input
                value={email} onChange={(e) => setEmail(e.target.value)}
                type="email" placeholder={t.correoElectronico}
                className="w-full border border-negro/15 bg-white px-3 py-3 font-dm text-sm text-negro placeholder:text-negro/40 focus:border-verde-selva outline-none"
              />
              <input
                value={phone} onChange={(e) => setPhone(e.target.value)}
                type="tel" placeholder={t.whatsappOpcional}
                className="w-full border border-negro/15 bg-white px-3 py-3 font-dm text-sm text-negro placeholder:text-negro/40 focus:border-verde-selva outline-none"
              />
              <input
                value={pickup} onChange={(e) => setPickup(e.target.value)}
                placeholder={t.dondeTeHospedas}
                className="w-full border border-negro/15 bg-white px-3 py-3 font-dm text-sm text-negro placeholder:text-negro/40 focus:border-verde-selva outline-none"
              />
              {error && <p className="text-sm font-dm text-terracota">{error}</p>}

              {/* Resumen accionable. En escritorio esta columna es `sticky`, así
                que la persona está mirando AQUÍ cuando pulsa: dejar el aviso
                solo dentro del renglón —que puede estar fuera de pantalla— no
                sirve. Dice qué falta y lleva ahí. */}
              {fallos.length > 0 && (
                <div className="border border-terracota/40 bg-terracota/5 p-3">
                  <p className="flex items-start gap-1.5 font-dm text-[12px] text-terracota">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-px" aria-hidden="true" />
                    <span>
                      {fallos.length === 1
                        ? fallos[0].mensajeLargo
                        : t.faltanDatos(fallos.length, fallos[0].mensajeLargo)}
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() => irAlRenglon(fallos[0].uid)}
                    className="mt-2 font-dm text-[12px] text-verde-selva underline underline-offset-2 hover:text-verde-vivo transition-colors"
                  >
                    {t.llevameAhi}
                  </button>
                </div>
              )}

              <button
                onClick={irAlPago}
                disabled={cargando}
                className="w-full bg-verde-selva text-crema py-4 text-sm tracking-[2px] uppercase font-dm hover:bg-verde-vivo transition-colors disabled:opacity-40"
              >
                {cargando ? t.unMomento : t.continuarAlPago}
              </button>

              {/* La salida secundaria. Va DEBAJO del botón de pagar a propósito:
                arriba le canibaliza el clic al CTA principal.
                Existe porque hasta ahora quien se iba del carrito sin pagar no
                dejaba rastro, y la secuencia de tres recordatorios que ya está
                montada no tenía a quién escribirle. */}
              <div className="pt-4 border-t border-negro/10">
                {guardado ? (
                  <p className="font-dm text-[12px] text-verde-selva bg-verde-selva/8 border border-verde-selva/25 px-3 py-2.5">
                    {t.cotizacionEnviada}
                  </p>
                ) : (
                  <>
                    <p className="font-dm text-[12px] text-negro/55 mb-2">
                      {t.todaviaLoPiensas}
                    </p>
                    <div className="flex gap-2">
                      <input
                        value={correoGuardar || email}
                        onChange={(e) => { setCorreoGuardar(e.target.value); setErrorGuardar(""); }}
                        type="email"
                        placeholder={t.tuCorreoPlaceholder}
                        className="flex-1 min-w-0 border border-negro/15 bg-white px-3 py-2.5 font-dm text-[13px] text-negro placeholder:text-negro/35 focus:border-verde-selva outline-none"
                      />
                      <button
                        type="button"
                        onClick={guardarCotizacion}
                        disabled={guardando}
                        className="flex-shrink-0 border border-verde-selva text-verde-selva px-4 text-[11px] tracking-[1.5px] uppercase font-dm hover:bg-verde-selva/8 transition-colors disabled:opacity-40"
                      >
                        {guardando ? "…" : t.enviar}
                      </button>
                    </div>
                    {errorGuardar && <p className="font-dm text-[11px] text-terracota mt-1.5">{errorGuardar}</p>}
                    <p className="font-dm text-[11px] text-negro/35 mt-1.5">
                      {t.sinCompromiso}
                    </p>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="pt-4">
              <Elements stripe={stripePromise} options={{ clientSecret: cobro.clientSecret, locale }}>
                <PagoCarrito cobro={cobro} datos={{ name, email, phone, pickup, checkin, checkout }} onListo={() => setItems([])} />
              </Elements>
            </div>
          )}
        </aside>
      </div>

      {/* La prueba social y las preguntas van al FINAL, a lo ancho: arriba
          empujaban el resumen y el pago fuera de la pantalla justo cuando el
          cliente iba a decidir. Quedan en el orden en que hacen falta —primero
          "otros ya lo hicieron", luego las dudas concretas. */}
      <div className="max-w-5xl mx-auto px-6">

        {/* Prueba social a lo ancho, DESPUÉS del pago: solo la calificación
          real de Google y las credenciales. Los testimonios de `TOUR_REVIEWS`
          no van aquí: están escritos a mano, y en el checkout una reseña que
          no es de verdad resta confianza justo cuando se decide. */}
              <section className="mt-8 border border-negro/10 bg-white p-5">
                <a
                  href={GOOGLE_MAPS_REVIEWS_URL}
                  target="_blank" rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2.5 mb-4"
                >
                  <span className="flex gap-0.5" aria-hidden="true">
                    {[...Array(5)].map((_, k) => <Star key={k} className="w-3.5 h-3.5 fill-dorado text-dorado" />)}
                  </span>
                  <span className="font-dm text-[13px] text-negro/75">
                    <strong className="text-negro">{GOOGLE_RATING}</strong> · {t.resenasGoogle}
                  </span>
                  <span className="font-dm text-[11px] text-negro/40 group-hover:text-verde-selva transition-colors">{t.verlas}</span>
                </a>
                <p className="flex items-center gap-2 font-dm text-[12px] text-negro/50">
                  <Users className="w-3.5 h-3.5 text-verde-selva" aria-hidden="true" />
                  {t.credenciales}
                </p>
              </section>

          {/* ── PREGUNTAS DE ÚLTIMO MINUTO ─────────────────────────────────
            Las dudas que frenan el pago. Todas las respuestas salen de lo que
            el sitio ya dice en la política de cancelación y en las fichas. */}
        <section className="mt-14">
          <h2 className="font-cormorant text-verde-profundo text-xl mb-3">{t.antesDePagar}</h2>
          <div className="divide-y divide-negro/10 border-y border-negro/10">
            {t.faq.map((f) => (
              <details key={f.q} className="group py-3.5">
                <summary className="flex items-start justify-between gap-4 cursor-pointer list-none font-dm text-[13px] text-negro/80">
                  <span>{f.q}</span>
                  <span className="text-verde-selva text-lg leading-none flex-shrink-0 transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="font-dm text-[12px] text-negro/55 leading-relaxed mt-2 pr-6">
                  {f.clave === "salidas" ? respuestaSalidas : f.clave === "cancelar" ? respuestaCancelar(f.a) : f.a}
                </p>
              </details>
            ))}
          </div>
          <p className="font-dm text-[11px] text-negro/40 mt-3">
            {t.otraDuda}{" "}
            <a href={`https://wa.me/524891090388?text=${encodeURIComponent(t.waDudaAntesDePagar)}`}
               target="_blank" rel="noopener noreferrer"
               className="text-verde-selva underline underline-offset-2">{t.escribenosWhatsapp}</a>{t.antesDePagarCola}
          </p>
        </section>
      </div>

      {/* ── Barra fija de móvil ────────────────────────────────────────────
        En un teléfono el resumen y el botón viven al fondo de una página de casi
        cuatro mil píxeles: mientras el cliente ajusta fechas y personas no tiene
        a la vista ni lo que va a pagar ni por dónde seguir. Es el mismo patrón
        que las fichas de tour ya usan (`MobileBookingBar`).
        Desaparece al entrar al pago: ahí manda el formulario de la tarjeta. */}
      {!cobro && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-negro/10 bg-crema/95 backdrop-blur-sm px-4 py-3 flex items-center gap-3">
          <div className="min-w-0">
            <p className="font-dm text-[10px] tracking-[1.5px] uppercase text-negro/45 leading-none">{t.pagasHoy(pctHoy)}</p>
            <p className="font-cormorant text-dorado text-xl leading-tight">{formatMXN(anticipo)} MXN</p>
            {resumen.ahorroMultiple > 0 && (
              <p className="font-dm text-[10px] text-verde-selva leading-none mt-0.5 truncate">
                {t.ahorroMultiple(formatMXN(resumen.ahorroMultiple))}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              // Con los datos puestos, cobra. Si no, lleva al formulario en vez
              // de dejar el aviso de error a dos mil píxeles de distancia.
              if (name.trim() && email.trim()) { irAlPago(); return; }
              nombreRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
              setTimeout(() => nombreRef.current?.focus({ preventScroll: true }), 450);
            }}
            disabled={cargando}
            className="ml-auto flex-shrink-0 bg-verde-selva text-crema px-5 py-3.5 text-[11px] tracking-[2px] uppercase font-dm hover:bg-verde-vivo transition-colors disabled:opacity-40"
          >
            {cargando ? t.unMomento : t.continuar}
          </button>
        </div>
      )}

      {/* A los 3 minutos sin cerrar la reserva. Se apaga solo cuando el cliente
        ya está en la pantalla de pago.
        ⚠️ Vive aquí, en el árbol del carrito CON recorridos. Estuvo colgado del
        `return` del carrito vacío, donde su propia condición (`items.length > 0`)
        no podía cumplirse nunca: no se mostró una sola vez desde que se creó. */}
      <GaleriaHabitacion
        habitacion={HABITACIONES_HOTEL.find((h) => h.id === galeria) ?? null}
        abierta={!!galeria}
        onCerrar={() => setGaleria(null)}
      />

      <RescatePopup activo={items.length > 0 && !cobro} mensaje={waRescate} />
    </main>
  );
}
