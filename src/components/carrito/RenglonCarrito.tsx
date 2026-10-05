"use client";

import Image from "next/image";
import { Trash2, AlertCircle } from "lucide-react";
import { personasDeItem, type CarritoItem } from "@/lib/carrito";
import { formatMXN, aceptaViajeroSolo, esViajeroSolo } from "@/lib/tourBooking";
import { TOURS_DB, incluyeDeTour } from "@/lib/tours";
import { localizeTour } from "@/lib/i18n/localize";
import { TourCalendar } from "@/components/booking/TourCalendar";
import { trackTourEvent } from "@/lib/tourTracker";
import { nombreCorto } from "@/components/carrito/carritoComun";
import type { CarritoCheckout } from "@/components/carrito/useCarritoCheckout";

/** Un recorrido del carrito: fecha, personas o vehículo, elección, extras y qué incluye. */
export function RenglonCarrito({ i, c }: { i: CarritoItem; c: CarritoCheckout }) {
  const {
    locale, t, items, renglonRefs, recienLlegado, enElPiso, fallos, resaltado, resumen,
    horaDe, quitar, cambiar, cambiarAddOn, cambiarVehiculo, cambiarPersonas,
  } = c;
  return (
    // La `key` (la pone la página) es `i.uid` a secas. Era `i.uid + i.tourDate`
    // para que React remontara el renglón al fecharlo y se disparara
    // `animate-slide-up`, pero con el calendario dentro ese remonte destruía la
    // hoja ABIERTA en el mismo instante en que se elegía el día. La animación
    // se sacrificó; el calendario no.
    <div
      ref={(el) => { renglonRefs.current[i.uid] = el; }}
      className={`animate-slide-up flex gap-3 sm:gap-4 border bg-white p-3 sm:p-4 transition-colors duration-500 ${
        resaltado === i.uid
          ? "border-terracota ring-2 ring-terracota/25"
          : recienLlegado === i.uid
            ? "border-verde-selva ring-2 ring-verde-selva/25"
            : "border-negro/10"
      }`}
    >
                  <div className="relative w-16 h-14 sm:w-24 sm:h-20 flex-shrink-0 overflow-hidden">
                    <Image src={i.tourImage} alt={i.tourName} fill className="object-cover" sizes="(max-width: 640px) 64px, 96px" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* Título, precio y papelera en la MISMA línea.
                      El precio vivía en una tercera columna del renglón y en un
                      teléfono no cabía: con la foto, el selector de fecha y los
                      contadores, la fila se pasaba del ancho de la tarjeta y el
                      precio y el bote de basura quedaban cortados contra el
                      borde de la pantalla. El importe es justo el dato que la
                      persona busca al revisar su carrito. */}
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-cormorant text-verde-profundo text-lg leading-tight min-w-0">
                        {nombreCorto(i.tourSlug, i.tourName, locale)}
                      </p>
                      <span className="flex items-center gap-2 flex-shrink-0">
                        {/* Cuando el carrito lleva varios recorridos, este
                          renglón puede venir rebajado. Se enseña el precio de
                          antes tachado: un descuento que no se ve no convence
                          a nadie de agregar el siguiente. */}
                        {resumen.descuentoPorItem[i.uid] ? (
                          <span className="flex flex-col items-end leading-none">
                            <span className="flex items-baseline gap-1.5">
                              <s className="font-dm text-[11px] text-negro/35">{formatMXN(i.total)}</s>
                              <span className="font-cormorant text-dorado text-lg sm:text-xl whitespace-nowrap">
                                {formatMXN(Math.round(i.total * (100 - resumen.descuentoPorItem[i.uid]) / 100))}
                              </span>
                            </span>
                            <span className="mt-1 font-dm text-[9px] tracking-[1px] uppercase text-verde-selva bg-verde-selva/10 px-1.5 py-0.5">
                              −{resumen.descuentoPorItem[i.uid]} %
                            </span>
                          </span>
                        ) : (
                          <span className="font-cormorant text-dorado text-lg sm:text-xl whitespace-nowrap">{formatMXN(i.total)}</span>
                        )}
                        <button
                          onClick={() => quitar(i.uid)}
                          aria-label={t.quitar(nombreCorto(i.tourSlug, i.tourName, locale))}
                          className="w-8 h-8 -mr-1.5 flex items-center justify-center text-negro/30 hover:text-terracota transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </span>
                    </div>

                    {/* La fecha se edita AQUÍ: los recorridos que se agregan desde
                        el catálogo llegan sin ella, y sin esto el carrito no se
                        podría pagar nunca. */}
                    <div className="mt-2 max-w-[280px]">
                      {/* El MISMO calendario del flujo de un tour, en modo
                        compacto: botón que abre una hoja. Aquí había un
                        `<input type="date">` del navegador —el widget más frío
                        que existe— mientras el otro flujo tenía atajos de los
                        próximos días y dos meses a la vista. Era la misma
                        decisión con dos experiencias distintas.
                        Los días que ya ocupa otro recorrido salen tachados:
                        cada tour se lleva el día completo, y antes eso se
                        descubría con un error DESPUÉS de elegir. */}
                      <TourCalendar
                        modo="compact"
                        value={i.tourDate}
                        onChange={(ymd) => {
                          cambiar(i.uid, { tourDate: ymd });
                          if (ymd) trackTourEvent("DATE_SELECTED", { fecha: ymd, tour: i.tourSlug, carrito: true });
                        }}
                        fechasBloqueadas={items.filter((x) => x.uid !== i.uid && x.tourDate).map((x) => x.tourDate)}
                        motivoBloqueo={(ymd) => {
                          const otro = items.find((x) => x.uid !== i.uid && x.tourDate === ymd);
                          return otro ? t.yaTienesEseDia(nombreCorto(otro.tourSlug, otro.tourName, locale)) : t.diaOcupado;
                        }}
                        titulo={t.fechaDe(nombreCorto(i.tourSlug, i.tourName, locale))}
                        placeholder={t.eligeLaFecha}
                        permitirLimpiar
                        salida={horaDe(i.tourSlug).salida}
                        horario={horaDe(i.tourSlug).horario}
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {i.unidades ? (
                        // Ruta, vehículo y unidades se eligen AQUÍ. Antes el
                        // RZR ni entraba al carrito: el botón del catálogo
                        // mandaba a la ficha y rompía el flujo a la mitad.
                        <span className="flex flex-wrap items-center gap-2">
                          <select
                            value={i.ruta}
                            onChange={(e) => cambiarVehiculo(i, { ruta: e.target.value })}
                            aria-label={t.rutaDe(nombreCorto(i.tourSlug, i.tourName, locale))}
                            className="border border-negro/15 bg-white px-2 py-1.5 font-dm text-[12px] text-negro"
                          >
                            {(TOURS_DB.find((t) => t.slug === i.tourSlug)?.rutas ?? []).map((r) => (
                              <option key={r.nombre} value={r.nombre}>{r.nombre}</option>
                            ))}
                          </select>
                          <select
                            value={i.vehiculo}
                            onChange={(e) => cambiarVehiculo(i, { vehiculo: e.target.value })}
                            aria-label={t.vehiculoDe(nombreCorto(i.tourSlug, i.tourName, locale))}
                            className="border border-negro/15 bg-white px-2 py-1.5 font-dm text-[12px] text-negro"
                          >
                            {(TOURS_DB.find((t) => t.slug === i.tourSlug)?.flota ?? []).map((v) => (
                              <option key={v.nombre} value={v.nombre}>{v.nombre}</option>
                            ))}
                          </select>
                          <span className="flex items-center gap-2">
                            <button type="button" aria-label={t.menosUnidades}
                              onClick={() => cambiarVehiculo(i, { unidades: Math.max(1, (i.unidades ?? 1) - 1) })}
                              className="w-7 h-7 border border-negro/20 text-negro/60 hover:border-verde-selva text-sm">−</button>
                            <span className="font-dm text-[12px] text-negro/70">{t.unidades(i.unidades ?? 1)}</span>
                            <button type="button" aria-label={t.masUnidades}
                              onClick={() => cambiarVehiculo(i, { unidades: (i.unidades ?? 1) + 1 })}
                              className="w-7 h-7 border border-negro/20 text-negro/60 hover:border-verde-selva text-sm">+</button>
                          </span>
                        </span>
                      ) : (
                        // Adultos y menores por separado. Antes solo se podían
                        // sumar adultos, así que una familia con dos niños
                        // pagaba cuatro boletos completos en el carrito y solo
                        // veía la tarifa de menor si entraba por la ficha del
                        // tour. Los tramos son los mismos de siempre:
                        // 6–10 años al 70 %, menores de 6 al 50 %.
                        <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                          {([
                            // `singular` porque con un solo acompañante se leía
                            // "1 adultos" y "1 niños 6–10".
                            { campo: "adults"        as const, etiqueta: t.adultos,    singular: t.adulto,     nota: "" },
                            { campo: "childrenMid"   as const, etiqueta: t.de6a10,     singular: t.de6a10,     nota: "70 %" },
                            { campo: "childrenSmall" as const, etiqueta: t.menoresDe6, singular: t.menorDe6,   nota: "50 %" },
                          ])
                            // El buceo en Media Luna es solo para adultos y el
                            // servidor rechaza la reserva con menores. Enseñar
                            // los contadores ahí sería dejar que el cliente
                            // arme su grupo, vea un precio y el pago le falle
                            // con un error genérico.
                            .filter(({ campo }) => campo === "adults" || !TOURS_DB.find((t) => t.slug === i.tourSlug)?.soloAdultos)
                            .map(({ campo, etiqueta, singular, nota }) => (
                            <span key={campo} className="flex items-center gap-1.5">
                              <button type="button" aria-label={t.menos(etiqueta, nombreCorto(i.tourSlug, i.tourName, locale))}
                                onClick={() => cambiarPersonas(i, campo, -1)}
                                className="w-8 h-8 border border-negro/20 text-negro/60 hover:border-verde-selva text-sm leading-none">−</button>
                              <span className="font-dm text-[11px] text-negro/65 whitespace-nowrap">
                                {i[campo] ?? 0} {(i[campo] ?? 0) === 1 ? singular : etiqueta}
                                {nota && <span className="text-negro/35"> ({nota})</span>}
                              </span>
                              <button type="button" aria-label={t.mas(etiqueta, nombreCorto(i.tourSlug, i.tourName, locale))}
                                onClick={() => cambiarPersonas(i, campo, 1)}
                                className="w-8 h-8 border border-negro/20 text-negro/60 hover:border-verde-selva text-sm leading-none">+</button>
                            </span>
                          ))}
                        </span>
                      )}
                    </div>

                    {TOURS_DB.find((t) => t.slug === i.tourSlug)?.soloAdultos && (
                      <p className="font-dm text-[11px] text-negro/40 mt-1">
                        {t.soloMayores}
                      </p>
                    )}

                    {/* Lo que le falta a ESTE recorrido, dentro de su tarjeta.
                      Solo después de intentar pagar: recibir el carrito lleno
                      de avisos en rojo antes de tocar nada es hostil. */}
                    {fallos.filter((f) => f.uid === i.uid).map((f) => (
                      <p key={f.campo} className="font-dm text-[11px] text-terracota mt-1.5 flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-px" aria-hidden="true" />
                        <span>{f.mensaje}</span>
                      </p>
                    ))}

                    {/* Elección obligatoria del recorrido (Ruta Acuática: el día
                      no da para las dos mitades).
                      ⚠️ El carrito PINTABA esta elección si ya venía puesta,
                      pero no tenía dónde elegirla y no la mandaba al servidor:
                      quien reservaba por aquí compraba un día prometido como
                      "lo decides al reservar" sin decidir nada, y al equipo le
                      llegaba la reserva sin saber a dónde llevarlo. */}
                    {(() => {
                      const base = TOURS_DB.find((x) => x.slug === i.tourSlug);
                      const tour = base ? localizeTour(base, locale) : undefined;
                      if (!tour?.eleccion) return null;
                      return (
                        <div className={`mt-2.5 border p-2.5 ${i.eleccion ? "border-negro/10" : "border-terracota/40 bg-terracota/5"}`}>
                          <p className="font-dm text-[11px] text-negro/70 mb-2">{tour.eleccion.titulo}</p>
                          <div className="space-y-1.5">
                            {tour.eleccion.opciones.map((o) => {
                              const activa = i.eleccion === o.nombre;
                              return (
                                <button
                                  key={o.id}
                                  type="button"
                                  onClick={() => cambiar(i.uid, { eleccion: o.nombre })}
                                  aria-pressed={activa}
                                  className={`w-full text-left border p-2 transition-colors ${
                                    activa ? "border-verde-selva bg-verde-selva/8" : "border-negro/15 hover:border-verde-selva/50"
                                  }`}
                                >
                                  <span className="flex items-start gap-2">
                                    <span className={`mt-0.5 w-3 h-3 flex-shrink-0 rounded-full border ${activa ? "border-verde-selva bg-verde-selva" : "border-negro/30"}`} aria-hidden="true" />
                                    <span className="min-w-0">
                                      <span className="block font-dm text-[12px] text-negro/80 leading-snug">{o.nombre}</span>
                                      {o.nota && <span className="block font-dm text-[11px] text-negro/45 leading-snug">{o.nota}</span>}
                                    </span>
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* El grupo no llega al mínimo del recorrido. Antes esto no
                      se decía en el carrito: el renglón se veía normal, con su
                      precio, y el error salía hasta el cobro, genérico y sin
                      señalar cuál era. La salida por WhatsApp existe porque el
                      equipo sí suma gente suelta a otro grupo. */}
                    {/* Viaja UNA persona en un recorrido que sale desde 2: se le
                      cobra la tarifa de viajero solo y se le dice por qué, junto
                      al precio, antes de pagar. */}
                    {(() => {
                      const tour = TOURS_DB.find((x) => x.slug === i.tourSlug);
                      if (!tour || i.unidades || !esViajeroSolo(tour, i.adults, i.childrenMid, i.childrenSmall)) return null;
                      return (
                        <div className="mt-2 border border-verde-selva/35 bg-verde-selva/5 p-2.5">
                          <p className="font-dm text-[11px] text-negro/70 leading-snug">
                            <strong>{t.viajeroSoloTitulo}</strong> {t.viajeroSolo}
                          </p>
                        </div>
                      );
                    })()}

                    {(() => {
                      const tour = TOURS_DB.find((x) => x.slug === i.tourSlug);
                      if (!tour || i.unidades || aceptaViajeroSolo(tour)) return null;
                      // Se enseña si el grupo no llega o si intentó bajar del mínimo.
                      if (personasDeItem(i) >= tour.groupMin && !enElPiso.has(i.uid)) return null;
                      return (
                        <div className="mt-2 border border-terracota/40 bg-terracota/5 p-2.5">
                          <p className="font-dm text-[11px] text-negro/70 leading-snug">
                            {t.saleAPartirDeIntro}<strong>{t.saleAPartirDe(tour.groupMin)}</strong>. {t.vanMenos}{" "}
                            <a
                              href={`https://wa.me/524891090388?text=${encodeURIComponent(
                                t.waGrupoMinimo(personasDeItem(i), nombreCorto(i.tourSlug, i.tourName, locale)),
                              )}`}
                              target="_blank" rel="noopener noreferrer"
                              data-wa-manual="1"
                              onClick={() => trackTourEvent("WHATSAPP_CLICK", { origen: "carrito_grupo_minimo", tour: i.tourSlug })}
                              className="text-verde-selva underline underline-offset-2"
                            >
                              {t.escribenosYLosSumamos}
                            </a>.
                          </p>
                        </div>
                      );
                    })()}


                    {/* Actividades opcionales del recorrido. Se agregan aquí
                      porque al meter un tour desde el catálogo nunca se pasa
                      por el paso 1, que es donde vivía la única forma de
                      contratarlas: el Salto de las 7 Cascadas quedaba invisible
                      para quien usaba el carrito. */}
                  {(() => {
                    const base = TOURS_DB.find((x) => x.slug === i.tourSlug);
                    const tour = base ? localizeTour(base, locale) : undefined;
                    const pax = personasDeItem(i);
                    return (tour?.addOns ?? []).map((a) => {
                      const puestos = i.addOns?.find((x) => x.id === a.id)?.cantidad ?? 0;
                      const activo  = puestos > 0;
                      return (
                        <div key={a.id} className={`mt-2 border p-2.5 ${activo ? "border-verde-selva/50 bg-verde-selva/5" : "border-negro/10"}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-dm text-[12px] text-negro/80">{a.nombre}</p>
                              <p className="font-dm text-[11px] text-negro/45 leading-snug">{a.descripcion}</p>
                              <p className="font-dm text-[11px] text-verde-selva mt-0.5">+{formatMXN(a.precio)} {t.porPersonaExtra}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => cambiarAddOn(i, a.id, activo ? 0 : pax)}
                              className={`flex-shrink-0 text-[9px] tracking-[1.5px] uppercase font-dm px-2.5 py-1.5 border transition-colors ${
                                activo ? "border-verde-selva bg-verde-selva text-crema" : "border-negro/25 text-negro/60 hover:border-verde-selva"
                              }`}
                            >
                              {activo ? t.quitarAddOn : t.agregarAddOn}
                            </button>
                          </div>
                          {activo && (
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-negro/8">
                              <span className="font-dm text-[11px] text-negro/55">{t.cuantosLoHacen}</span>
                              <span className="flex items-center gap-2">
                                <button type="button" aria-label={t.menosUnidades} onClick={() => cambiarAddOn(i, a.id, Math.max(0, puestos - 1))}
                                  className="w-7 h-7 border border-negro/20 text-negro/60 hover:border-verde-selva text-sm">−</button>
                                <span className="font-dm text-[12px] text-negro/70 w-4 text-center">{puestos}</span>
                                <button type="button" aria-label={t.masUnidades} onClick={() => cambiarAddOn(i, a.id, Math.min(pax, puestos + 1))}
                                  className="w-7 h-7 border border-negro/20 text-negro/60 hover:border-verde-selva text-sm">+</button>
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}

                  {/* Qué se visita y qué incluye, sin salir del carrito. Va
                        plegado para que la lista siga siendo escaneable: quien
                        lleva cuatro recorridos no quiere cuatro fichas abiertas. */}
                    {(() => {
                      const base = TOURS_DB.find((x) => x.slug === i.tourSlug);
                      const tour = base ? localizeTour(base, locale) : undefined;
                      if (!tour) return null;
                      return (
                        <details className="mt-2 group">
                          <summary className="cursor-pointer list-none font-dm text-[11px] text-verde-selva hover:text-verde-vivo transition-colors">
                            {t.queIncluyeYSeVisita}
                            <span className="ml-1 inline-block transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                          </summary>
                          <div className="mt-2.5 space-y-2.5 border-l-2 border-verde-selva/20 pl-3">
                            <p className="font-dm text-[12px] text-negro/55 leading-snug">{tour.descripcion}</p>
                            {tour.destinos?.length > 0 && (
                              <div>
                                <p className="font-dm text-[10px] tracking-[1.5px] uppercase text-negro/35 mb-1">{t.seVisita}</p>
                                {tour.destinos.map((d) => (
                                  <p key={d} className="font-dm text-[12px] text-negro/60 leading-snug">· {d}</p>
                                ))}
                              </div>
                            )}
                            <div>
                              <p className="font-dm text-[10px] tracking-[1.5px] uppercase text-negro/35 mb-1">{t.incluye}</p>
                              {incluyeDeTour(tour, locale).map((x) => (
                                <p key={x} className="font-dm text-[12px] text-negro/60 leading-snug">✓ {x}</p>
                              ))}
                            </div>
                            <p className="font-dm text-[11px] text-negro/40">
                              {t.duracionGrupo(tour.duracion_hrs, tour.groupMin, tour.groupMax)}
                            </p>
                          </div>
                        </details>
                      );
                    })()}
                  </div>
                </div>
  );
}
