"use client";

import Image from "next/image";
import { Expand } from "lucide-react";
import { HABITACIONES_HOTEL, vistaHabitacion } from "@/lib/habitaciones";
import { formatMXN } from "@/lib/tourBooking";
import { precioHotelDesde } from "@/components/carrito/carritoComun";
import type { CarritoCheckout } from "@/components/carrito/useCarritoCheckout";

/** Hospedaje opcional en el Hotel Paraíso Encantado, dentro del carrito. */
export function HospedajeCarrito({ c }: { c: CarritoCheckout }) {
  const {
    locale, t, setCobro, conHotel, setConHotel, habs, setHabs, setGaleria, checkin,
    setCheckin, checkout, setCheckout, minDate, noches, huespedes, hotelQuote,
    totalHotel,
  } = c;
  return (
    <>
      {/* ── HOSPEDAJE OPCIONAL ─────────────────────────────────────────
          Apagado por defecto y dicho con todas sus letras: hospedarse con
          nosotros no es condición para reservar, y muchos ya vienen con
          hotel. (Ojo: NO es "pasamos por ti a cualquier hospedaje"; cómo
          llega cada quien depende del recorrido y lo dice la logística.) Ofrecerlo sin presionar es la diferencia entre
          un extra y una molestia.

          Pero estaba DEMASIADO apagado: era una casilla sin marcar, y las
          habitaciones —con su foto y su precio— solo aparecían si alguien
          adivinaba que había algo detrás. Las reservas que llevan hotel
          promedian $18,137 contra $7,669 las que no; esconder el mayor
          multiplicador del ticket detrás de un clic a ciegas era caro.
          Ahora la oferta se ve sin abrir nada, y "ya tengo hospedaje"
          sigue siendo un camino explícito, no una omisión. */}
      <section className="mt-8 border border-negro/10 bg-white p-5">
        <div>
          <p className="font-cormorant text-verde-profundo text-xl">
            {t.hospedajeTitulo}
          </p>
          <p className="font-dm text-[12px] text-negro/50 mt-0.5">
            {t.hospedajeSub}
          </p>
        </div>

        {!conHotel && (
          <div className="mt-4">
            {/* Tres habitaciones asomando: el precio y la foto son lo que
                convence, y estaban a un clic de distancia que nadie daba. */}
            <div className="grid grid-cols-3 gap-2">
              {HABITACIONES_HOTEL.slice(0, 3).map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => { setConHotel(true); setCobro(null); }}
                  className="group text-left border border-negro/10 hover:border-verde-selva overflow-hidden transition-colors"
                >
                  <span className="relative block h-20">
                    <Image src={h.imagen} alt={h.nombre} fill className="object-cover" sizes="(max-width: 640px) 33vw, 180px" />
                  </span>
                  <span className="block px-2 py-1.5 font-dm text-[11px] text-negro/60 truncate">{h.nombre}</span>
                </button>
              ))}
            </div>
            <p className="font-dm text-[12px] text-negro/55 mt-3">
              {t.hospedajeResumen(HABITACIONES_HOTEL.length, formatMXN(precioHotelDesde))}
            </p>
            <div className="mt-3">
              <button
                type="button"
                onClick={() => { setConHotel(true); setCobro(null); }}
                className="bg-verde-selva hover:bg-verde-vivo text-crema px-5 py-2.5 text-[11px] tracking-[2px] uppercase font-dm transition-colors"
              >
                {t.hospedajeVerHabitaciones}
              </button>
              <p className="font-dm text-[11px] text-negro/40 mt-2">{t.hospedajeSaltar}</p>
            </div>
          </div>
        )}

        {conHotel && (
          <div className="mt-5 space-y-4">
            {/* La salida. Al quitar la casilla había que dejar la puerta de
                vuelta a la vista: sin esto, quien abre por curiosidad se
                queda con un hotel que no pidió. */}
            <button
              type="button"
              onClick={() => { setConHotel(false); setCobro(null); }}
              className="font-dm text-[11px] text-negro/45 hover:text-verde-selva underline underline-offset-2 transition-colors"
            >
              ← {t.hospedajeYaTengo}
            </button>
            <div className="grid sm:grid-cols-2 gap-3">
              {HABITACIONES_HOTEL.map((h) => {
                const idx    = habs.findIndex((x) => x.habitacionId === h.id);
                const activa = idx >= 0;
                return (
                  <div key={h.id} className={`border overflow-hidden transition-colors ${activa ? "border-verde-selva" : "border-negro/12"}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setCobro(null);
                        setHabs((prev) =>
                          activa
                            ? prev.filter((x) => x.habitacionId !== h.id)
                            : [...prev, { habitacionId: h.id, huespedes: Math.min(2, h.maxHuespedes) }],
                        );
                      }}
                      className="w-full text-left"
                    >
                      <span className="relative block h-28">
                        <Image src={h.imagen} alt={h.nombre} fill className="object-cover" sizes="(max-width: 640px) 100vw, 300px" />
                        {activa && (
                          <span className="absolute inset-0 bg-verde-selva/25 flex items-center justify-center">
                            <span className="bg-verde-selva text-crema text-[9px] tracking-[2px] uppercase font-dm px-2 py-1">{t.elegida}</span>
                          </span>
                        )}
                        {h.vistaMontana && (
                          <span className="absolute top-2 left-2 bg-dorado text-negro text-[8px] tracking-[1px] uppercase font-dm px-1.5 py-0.5">
                            {t.vistaMontana}
                          </span>
                        )}
                      </span>
                      <span className="block px-3 pt-3">
                        <span className="block font-dm text-[13px] text-negro/85">{h.nombre}</span>
                        <span className="block font-dm text-[11px] text-negro/45 leading-snug mt-0.5">
                          {vistaHabitacion(h.vista, locale)} · {t.hastaPersonasDesde(h.maxHuespedes, formatMXN(h.tarifas[2] ?? h.tarifas[1]))}
                        </span>
                      </span>
                    </button>

                    {/* Cuánta gente duerme AQUÍ. Con cinco personas hacen
                        falta dos habitaciones, y el reparto lo decide el
                        cliente porque cambia el precio. */}
                    {activa && (
                      <div className="flex items-center justify-between px-3 py-2 border-t border-negro/8 mt-2">
                        <span className="font-dm text-[11px] text-negro/55">{t.duermenAqui}</span>
                        <span className="flex items-center gap-2">
                          <button type="button" aria-label={t.menosHuespedes(h.nombre)}
                            onClick={() => { setCobro(null); setHabs((prev) => prev.map((x) => x.habitacionId === h.id ? { ...x, huespedes: Math.max(1, x.huespedes - 1) } : x)); }}
                            className="w-7 h-7 border border-negro/20 text-negro/60 hover:border-verde-selva text-sm">−</button>
                          <span className="font-dm text-[12px] text-negro/80 w-4 text-center">{habs[idx].huespedes}</span>
                          <button type="button" aria-label={t.masHuespedes(h.nombre)}
                            onClick={() => { setCobro(null); setHabs((prev) => prev.map((x) => x.habitacionId === h.id ? { ...x, huespedes: Math.min(h.maxHuespedes, x.huespedes + 1) } : x)); }}
                            disabled={habs[idx].huespedes >= h.maxHuespedes}
                            className="w-7 h-7 border border-negro/20 text-negro/60 hover:border-verde-selva text-sm disabled:opacity-30">+</button>
                        </span>
                      </div>
                    )}

                    {/* Abre la galería a pantalla completa. Antes desplegaba
                      una lista de texto debajo: se apartan tres noches sin
                      haber visto bien el cuarto. */}
                    <button
                      type="button"
                      onClick={() => setGaleria(h.id)}
                      className="w-full flex items-center gap-1.5 px-3 py-2 border-t border-negro/8 font-dm text-[11px] text-verde-selva hover:bg-verde-selva/5 transition-colors text-left"
                    >
                      <Expand className="w-3 h-3" aria-hidden="true" />
                      {t.verFotosYDetalles}
                    </button>
                  </div>
                );
              })}
            </div>

            {habs.length === 0 && (
              <p className="font-dm text-[12px] text-terracota">{t.eligeAlMenosUna}</p>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-dm text-[11px] tracking-[1.5px] uppercase text-negro/45 mb-1.5">
                  {t.entrada}
                </label>
                <input
                  type="date" value={checkin} min={minDate}
                  onChange={(e) => { setCheckin(e.target.value); setCobro(null); }}
                  className="w-full border border-negro/15 bg-white px-3 py-2.5 font-dm text-sm text-negro focus:border-verde-selva outline-none"
                />
              </div>
              <div>
                <label className="block font-dm text-[11px] tracking-[1.5px] uppercase text-negro/45 mb-1.5">
                  {t.salida}
                </label>
                <input
                  type="date" value={checkout} min={checkin || minDate}
                  onChange={(e) => { setCheckout(e.target.value); setCobro(null); }}
                  className="w-full border border-negro/15 bg-white px-3 py-2.5 font-dm text-sm text-negro focus:border-verde-selva outline-none"
                />
              </div>
            </div>

            {/* El total de huéspedes ya no se pone aquí: sale de sumar lo
                que el cliente asignó a cada habitación. Con cinco personas
                eso obliga a elegir dos habitaciones, que es la verdad
                operativa: ninguna admite cinco. */}
            <p className="font-dm text-[12px] text-negro/55">
              {t.huespedesEnHabitaciones(huespedes, habs.length)}
            </p>

            {checkin && checkout && noches <= 0 && (
              <p className="font-dm text-[12px] text-terracota">
                {t.salidaDespuesDeEntrada}
              </p>
            )}

            {hotelQuote && !hotelQuote.ok && (
              <p className="font-dm text-[12px] text-terracota">{hotelQuote.error}</p>
            )}

            {hotelQuote?.ok && (
              <div className="border-t border-negro/8 pt-3 space-y-1">
                <p className="flex justify-between font-dm text-[13px] text-negro/70">
                  <span>{t.resumenNoches(noches, huespedes, hotelQuote.desglose?.length ?? 1)}</span>
                  <span className="whitespace-nowrap">
                    {/* El precio tachado hace visible el descuento. Antes
                        solo se veía el total ya rebajado, así que la
                        promoción no se notaba y no empujaba a nadie a
                        quedarse la tercera noche. */}
                    {(hotelQuote.nochesGratis ?? 0) > 0 && (
                      <span className="text-negro/35 line-through mr-2">{formatMXN(hotelQuote.totalSinPromo ?? 0)}</span>
                    )}
                    <strong>{formatMXN(totalHotel)} MXN</strong>
                  </span>
                </p>
                {(hotelQuote.nochesGratis ?? 0) > 0 && (
                  <p className="font-dm text-[12px] text-verde-selva bg-verde-selva/8 border border-verde-selva/25 px-2.5 py-1.5">
                    {t.nochesGratis(hotelQuote.nochesGratis ?? 0, formatMXN(hotelQuote.ahorro ?? 0))}
                  </p>
                )}
                {noches === 2 && (
                  <p className="font-dm text-[12px] text-dorado">
                    {t.terceraNocheGratisAviso}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </>
  );
}
