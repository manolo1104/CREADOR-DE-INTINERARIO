"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { TourCalendar } from "@/components/booking/TourCalendar";
import { totalRecorrido, aceptaViajeroSolo, esViajeroSolo, minBookingDate, CONFIRMA_SALIDA_DIAS } from "@/lib/tourBooking";
import { TOURS_DB, precioGrupo, precioPorCabeza, salidaCorta, recogidaDeTour, precioDeFecha, PROMO_TEMPORADA, promoVigente, fechaConPromo } from "@/lib/tours";
import { useLocale } from "@/lib/i18n/useLocale";
import { getBooking } from "@/lib/i18n/booking";
import { trackAddToCart, trackDateSelected, trackParticipants } from "@/lib/analytics";
import { trackTourEvent } from "@/lib/tourTracker";
import { pctACobrar } from "@/lib/carrito";
// El ancla del módulo vive en `lib/anclas.ts`, no aquí: la ficha del tour es un
// Server Component y una constante importada de este archivo "use client" le
// llegaba como objeto (`#[object Object]`). Ver la nota en ese archivo.
import { ID_MODULO_RESERVA, abrirCalendario } from "@/lib/anclas";
import { publicarSeleccion, guardarSeleccionSesion, leerSeleccionSesion, textoDiaBoton } from "@/lib/seleccionFicha";
import { marcarToqueHumano } from "@/lib/toqueHumano";
import { BOTON_CONTADOR_OSCURO } from "@/components/checkout/estilos";

/* Los − y + de los contadores (20 nov 2026, regla de Manolo para el checkout):
   la forma redonda del checkout en los colores oscuros de la ficha, compartida
   con el RZR (`BOTON_CONTADOR_OSCURO`, checkout/estilos.ts). */
const BOTON_CONTADOR_FICHA = BOTON_CONTADOR_OSCURO;

/**
 * Elegir fecha y personas SIN salir de la ficha del tour.
 *
 * Hasta ahora el sidebar era un enlace suelto a `/reservar/carrito?agregar=…`:
 * la persona leía la ficha, se convencía, pulsaba "Reservar" y aterrizaba en
 * otra pantalla para recién ahí decidir cuándo va y cuántos son. Cada salto de
 * página cuesta gente, y en el teléfono —tres de cada cuatro visitas— cuesta
 * más. GetYourGuide, Viator y Civitatis ponen fecha, personas y total en la
 * ficha del producto por esta razón.
 *
 * NO cambia dónde se decide: el carrito sigue dejando mover la fecha y las
 * personas —ahí es donde se ven los días juntos, que es lo que `carritoItems`
 * explica—. Lo único que cambia es que llegan ya puestas.
 *
 * Solo para recorridos por persona: el RZR y el café se cobran por vehículo y
 * tienen su propio formulario (`RzrBookingForm`).
 */
export function ReservaFichaTour({
  slug,
  precio,
  groupMin,
  groupMax,
  soloMayores,
  nombre,
  tourId,
  tarifaGrupo,
}: {
  slug: string;
  precio: number;
  groupMin: number;
  groupMax: number;
  /** Recorridos donde no entran menores (se ocultan los contadores de niños). */
  soloMayores: boolean;
  nombre: string;
  tourId: string;
  /**
   * Escalones de tarifa por GRUPO (ver `tours.ts`). Si viene, el módulo cobra
   * una sola cifra por todos: un contador de personas en vez de tres tramos de
   * edad, porque el proveedor cobra la experiencia completa y un niño no paga
   * el 70 % de nada.
   */
  tarifaGrupo?: number[];
}) {
  const { locale, lp } = useLocale();
  const t = getBooking(locale).carrito;
  const tf = getBooking(locale).ficha;

  const porGrupo = !!tarifaGrupo?.length;
  const [fecha, setFecha]           = useState("");
  // La hora y el precio de la fecha salen del catálogo por el slug.
  const tourCat = TOURS_DB.find((x) => x.slug === slug);
  // El precio de la FECHA elegida: la promo de temporada baja solo va con los
  // recorridos hasta el 29 oct (4 oct 2026). Sin fecha, el que se anuncia.
  const precioFecha = tourCat ? precioDeFecha(tourCat, fecha || null) : precio;
  const enPromo = !!tourCat && (PROMO_TEMPORADA.tours as ReadonlySet<string>).has(slug);
  // Eligió una fecha después de la promo mientras todavía se anuncia: se le
  // dice por qué el total no es el de arriba.
  const sinPromoEnFecha = enPromo && !!fecha && promoVigente() && !fechaConPromo(fecha);
  // Lo que la regla de viajero solo necesita saber de este recorrido. El módulo
  // solo vive en recorridos por persona o por grupo, nunca por vehículo.
  // 🔴 `precioLista` y `escalaPersona` van aquí dentro a propósito: sin ellos
  // `totalRecorrido` no ve la escalera y el módulo pintaría el precio plano
  // mientras el servidor cobra el del escalón.
  const reglaTour = {
    precio: precioFecha,
    precioLista: tourCat?.precioLista ?? tourCat?.precio ?? precio,
    escalaPersona: tourCat?.escalaPersona,
    groupMin,
    tarifaGrupo,
    precioUnidad: porGrupo ? "grupo" as const : "persona" as const,
  };
  // Con tarifa de grupo se respeta el mínimo real del recorrido —el Edén sale
  // con UNA persona—. Los que salen desde 2 bajan a UN adulto con la tarifa de
  // viajero solo (1 oct 2026); los de mínimo mayor (rappel, rafting) lo
  // conservan.
  const minAdultos = porGrupo
    ? Math.max(1, groupMin || 1)
    : aceptaViajeroSolo(reglaTour) ? 1 : Math.max(2, groupMin || 1);
  // Arranca en DOS aunque se pueda bajar a uno: así viaja casi todo el mundo y
  // así se leen los precios del resto del sitio.
  const [adultos, setAdultos]       = useState(porGrupo ? minAdultos : Math.max(2, groupMin || 1));
  // Niños de 4 a 7 (50 %) y bebés de 0 a 3 (gratis, ocupan lugar). Regla del
  // 17 nov 2026 en `ninos.ts`; el tramo viejo de 6 a 10 al 70 % ya no existe.
  const [ninosSmall, setNinosSmall] = useState(0);
  const [bebes, setBebes]           = useState(0);
  // La fecha elegida ya no tiene lugar para este grupo: lo dice el calendario.
  const [sinLugar, setSinLugar]     = useState(false);

  /**
   * Lo que trae el buscador del inicio: `?fecha=…&adultos=…`.
   *
   * 🔴 Va en un efecto y NO en el valor inicial de `useState` porque la ficha
   * es estática (SSG): el HTML que sirve el servidor no sabe nada de la query,
   * y arrancar el estado leyéndola rompería la hidratación.
   *
   * Se valida todo, porque una URL la escribe cualquiera: la fecha tiene que
   * ser de mañana en adelante (`minBookingDate`) y el grupo cabe entre el
   * mínimo del recorrido y su cupo. Después se limpia la barra con
   * `replaceState`, igual que hace el carrito: si no, compartir el enlace
   * arrastra la fecha de otro.
   */
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      const f = q.get("fecha");
      const a = q.get("adultos");
      if (!f && !a) {
        // Sin nada en la URL: lo que ya había elegido en esta pestaña (13 nov
        // 2026), para que recargar o volver no le borre la fecha.
        const previa = leerSeleccionSesion(slug);
        if (previa) {
          if (previa.fecha && previa.fecha >= minBookingDate()) setFecha(previa.fecha);
          if (previa.adultos >= minAdultos && previa.adultos + previa.ninosSmall + previa.bebes <= groupMax) {
            setAdultos(previa.adultos);
            if (!porGrupo && !soloMayores) { setNinosSmall(previa.ninosSmall); setBebes(previa.bebes); }
          }
        }
        return;
      }
      if (f && /^\d{4}-\d{2}-\d{2}$/.test(f) && f >= minBookingDate()) setFecha(f);
      const n = Number(a);
      if (Number.isInteger(n) && n >= minAdultos && n <= groupMax) setAdultos(n);
      q.delete("fecha");
      q.delete("adultos");
      const resto = q.toString();
      window.history.replaceState(null, "", window.location.pathname + (resto ? `?${resto}` : "") + window.location.hash);
    } catch {
      // Sin `window` o con una query rara, el módulo arranca como siempre.
    }
    // Solo al montar: después manda lo que elija la persona en pantalla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // `personas` = lugares que ocupan (cupo); `pagan` = sin bebés (mínimo y escalón).
  const personas = adultos + ninosSmall + bebes;
  const pagan = adultos + ninosSmall;
  const total = porGrupo
    ? (precioGrupo({ tarifaGrupo }, personas) ?? 0)
    // `totalRecorrido`: la misma cuenta que el carrito y el cobro, con la
    // tarifa de viajero solo cuando va una persona.
    : totalRecorrido(reglaTour, adultos, 0, ninosSmall);
  const viajaSolo = !porGrupo && esViajeroSolo(reglaTour, adultos, 0, ninosSmall);
  // ── Escalera por tamaño de grupo ──────────────────────────────────────────
  // `precioPorCabeza` ya decide si manda la promo de temporada o el escalón:
  // aquí no se vuelve a decidir nada, solo se pinta.
  // 🔴 Mientras la fecha lleve promo de temporada, la escalera NO corre
  // (`precioPorCabeza` la deja pasar de largo), así que tampoco se anuncia:
  // con la promo encima, "es el mejor precio por persona" sería falso — lo
  // será el escalón de 6, pero solo a partir del 30 de octubre.
  const llevaPromoFecha = precioFecha < (tourCat?.precioLista ?? precioFecha);
  const conEscalera = !porGrupo && !llevaPromoFecha && !!tourCat?.escalaPersona?.length;
  const porCabezaAhora = conEscalera ? precioPorCabeza(reglaTour, pagan) : 0;
  // El primer tamaño de grupo que todavía baja el precio, dentro del cupo
  // (los bebés ocupan lugar pero no cuentan para el escalón).
  const siguienteEscalon = (() => {
    if (!conEscalera) return null;
    for (let n = pagan + 1; n <= (groupMax ? groupMax - bebes : pagan); n++) {
      const p = precioPorCabeza(reglaTour, n);
      if (p < porCabezaAhora) return { personas: n, precio: p };
    }
    return null;
  })();
  // Lo que se paga HOY, con la misma cuenta que el carrito y que
  // `carrito-payment-intent` (redondeo incluido). El botón decía «Reservar
  // $2,900» y el cliente descubría en el carrito que hoy solo eran $870:
  // con fecha elegida, el monto que asusta tiene que ser el de hoy.
  const hoy   = Math.round((total * pctACobrar()) / 100);
  const resto = total - hoy;

  // Lo elegido, publicado para el WhatsApp del cuadro lateral y la barra del
  // celular (`lib/seleccionFicha.ts`): así escriben con fecha, personas y total.
  useEffect(() => {
    publicarSeleccion({ slug, fecha, adultos, ninosMid: 0, ninosSmall, bebes, ninos: ninosSmall + bebes, total, sinLugar });
  }, [slug, fecha, adultos, ninosSmall, bebes, total, sinLugar]);
  // Y se guarda en la pestaña, después de leer la anterior (el efecto de arriba
  // del montaje corre primero): recargar no la borra.
  const leida = useRef(false);
  useEffect(() => {
    if (!leida.current) { leida.current = true; return; }
    guardarSeleccionSesion({ slug, fecha, adultos, ninosSmall, bebes });
  }, [slug, fecha, adultos, ninosSmall, bebes]);

  // «Ver fechas disponibles» (arriba de la ficha) y «Reservar» (menú) son
  // anclas a este módulo; si todavía no hay fecha, además se abre el
  // calendario. Clarity: 21 de 24 personas nunca lo abrían porque esos
  // botones solo bajaban la página.
  useEffect(() => {
    const alClic = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.(`a[href$="#${ID_MODULO_RESERVA}"]`);
      if (!a || fecha) return;
      window.setTimeout(() => abrirCalendario(slug), 450);
    };
    document.addEventListener("click", alClic);
    return () => document.removeEventListener("click", alClic);
  }, [slug, fecha]);

  const dinero = (n: number) => `$${n.toLocaleString(locale === "en" ? "en-US" : "es-MX")}`;

  // La hora sale del catálogo (`tourCat`, arriba), no de una prop más: así la
  // ficha no tiene que acordarse de pasarla y no hay dos fuentes que puedan
  // discrepar. (`precioGrupo` ya trae `tours.ts` a este bundle.)
  const hora = tourCat ? salidaCorta(tourCat, locale === "en") : null;
  // El Edén trae el horario del JARDÍN (`horaTexto`), no una hora de salida:
  // va como "Horario:", no como "Salida:".
  const esHorario = !!tourCat && !!recogidaDeTour(tourCat).horaTexto;

  /** Un contador. Los tres se comportan igual salvo por su mínimo. */
  function Contador({
    etiqueta, valor, set, min,
  }: { etiqueta: string; valor: number; set: (n: number) => void; min: number }) {
    // El tope es del GRUPO, no de cada casilla: seis adultos y tres niños no
    // caben en una salida de máximo ocho por mucho que cada número sea legal.
    const hayHueco = personas < groupMax;
    return (
      <div className="flex items-center justify-between gap-3">
        <span className="font-dm text-[12px] text-crema/60">{etiqueta}</span>
        {/* `shrink-0`: en un teléfono angosto la etiqueta baja a dos renglones;
            los botones nunca se encogen. */}
        <span className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-label={t.menos(etiqueta, nombre)}
            onClick={() => set(Math.max(min, valor - 1))}
            disabled={valor <= min}
            className={BOTON_CONTADOR_FICHA}
          >−</button>
          <span className="font-dm text-[13px] text-crema/85 w-5 text-center tabular-nums">{valor}</span>
          <button
            type="button"
            aria-label={t.mas(etiqueta, nombre)}
            onClick={() => set(valor + 1)}
            disabled={!hayHueco}
            className={BOTON_CONTADOR_FICHA}
          >+</button>
        </span>
      </div>
    );
  }

  const BOTON_RESERVAR = "rounded-xl flex items-center justify-center gap-2 w-full mt-3 bg-verde-selva hover:bg-verde-vivo text-crema py-4 text-[11px] tracking-[2px] uppercase font-dm font-medium transition-colors";
  const href = lp(
    `/reservar/carrito?agregar=${slug}` +
    (fecha ? `&fecha=${fecha}` : "") +
    `&adultos=${adultos}&ninosSmall=${ninosSmall}&bebes=${bebes}`,
  );

  return (
    // El id lo usa la barra inferior del móvil para traer aquí a la persona.
    // En un teléfono la columna lateral se apila DESPUÉS de todo el contenido,
    // así que sin ese salto el módulo quedaba a veinte mil píxeles del hero:
    // existía, pero no para las tres de cada cuatro visitas que son móviles.
    <div id={ID_MODULO_RESERVA} className="rounded-2xl border border-white/10 bg-negro/60 p-5 space-y-4">
      <div>
        <p className="text-[9px] tracking-[2px] uppercase text-crema/35 font-dm mb-1.5">{tf.cuandoVas}</p>
        <TourCalendar
          value={fecha}
          onChange={(ymd) => {
            setFecha(ymd);
            trackDateSelected(nombre, ymd);
            trackTourEvent("DATE_SELECTED", { tour: tourId, ficha: true });
          }}
          // A la vista, con los lugares de cada día (13 nov 2026): antes había
          // que tocar «Ver fechas disponibles» para descubrir el calendario.
          modo="abierto"
          tema="oscuro"
          titulo={nombre}
          permitirLimpiar
          salida={esHorario ? null : hora}
          horario={esHorario ? hora : null}
          // Los lugares de cada día para ESTE grupo: si suben de 2 a 6 y la
          // fecha ya no alcanza, el calendario lo dice antes del carrito.
          slug={slug}
          personas={personas}
          onSinLugar={setSinLugar}
          // La hoja en vidrio esmerilado (8 oct 2026). Solo aquí: el carrito,
          // el RZR y el buscador del inicio no la piden y siguen igual.
          hojaVidrio
        />
      </div>

      <div className="space-y-2.5 border-t border-white/8 pt-4">
        <p className="text-[9px] tracking-[2px] uppercase text-crema/35 font-dm">{tf.cuantosVan}</p>
        <Contador etiqueta={porGrupo ? tf.personas : (soloMayores ? t.adultos : t.adultos8)} valor={adultos} set={(n) => { setAdultos(n); trackParticipants(nombre, n, ninosSmall + bebes); }} min={minAdultos} />
        {!porGrupo && !soloMayores && (
          <>
            <Contador etiqueta={`${t.ninos4a7} · 50 %`} valor={ninosSmall} set={setNinosSmall} min={0} />
            <Contador etiqueta={`${t.bebes} · ${t.gratis}`} valor={bebes} set={setBebes} min={0} />
          </>
        )}
        {personas >= groupMax && (
          <p className="font-dm text-[10px] text-dorado/80 leading-snug">
            {porGrupo ? tf.grupoTope(groupMax) : tf.grupoLleno(groupMax)}
          </p>
        )}
        {/* Junto a los contadores y antes del total: quien baja del mínimo del
            recorrido se entera AHÍ de que la salida depende de que se junte el
            grupo, y no al final, en el correo. Desde el 8 oct 2026 el precio ya
            es proporcional —antes se cobraban dos lugares— y lo único que hay
            que avisar es la condición. */}
        {viajaSolo && (
          <p role="status" className="font-dm text-[11px] text-crema/75 leading-snug border-l-2 border-verde-vivo/60 pl-2.5">
            <strong className="text-crema">{tf.viajeroSoloTitulo}</strong> {tf.viajeroSolo(CONFIRMA_SALIDA_DIAS)}
          </p>
        )}
      </div>

      <div className="border-t border-white/8 pt-4">
        {/* La tarifa es del grupo entero. Sin esta línea, "$3,320" junto a un
            contador de personas se lee como "cada uno" y el cliente cree que
            son tres veces más caro de lo que es. */}
        {porGrupo && (
          <p className="font-dm text-[10px] text-crema/40 mb-1.5">{tf.tarifaDelGrupo(groupMax)}</p>
        )}
        <p className="flex items-baseline justify-between">
          <span className="font-dm text-[12px] text-crema/55">{tf.total}</span>
          <span className="font-cormorant text-dorado text-2xl leading-none">{dinero(total)} MXN</span>
        </p>
        {/* El argumento de venta de una tarifa plana: entre más van, menos les
            toca. Con una sola persona no hay nada que dividir. */}
        {porGrupo && personas > 1 && total > 0 && (
          <p className="font-dm text-[11px] text-verde-vivo/80 mt-1">{tf.porCabeza(dinero(Math.round(total / personas)))}</p>
        )}
        {/* La escalera por tamaño de grupo: lo que paga cada quien AHORA y lo
            que pagaría con uno más. El gancho va solo mientras quede escalón
            por delante; cuando ya tiene el mejor, se le dice que lo tiene. */}
        {conEscalera && !viajaSolo && (
          <>
            <p className="font-dm text-[11px] text-crema/55 mt-1">{tf.cadaUno(dinero(porCabezaAhora))}</p>
            {siguienteEscalon ? (
              <p className="font-dm text-[11px] text-verde-vivo/80 mt-0.5">
                {tf.unoMasBaja(siguienteEscalon.personas, dinero(siguienteEscalon.precio))}
              </p>
            ) : (
              <p className="font-dm text-[11px] text-verde-vivo/80 mt-0.5">{tf.mejorPrecio}</p>
            )}
          </>
        )}
        {sinPromoEnFecha && (
          <p role="status" className="font-dm text-[11px] text-crema/60 mt-1.5 leading-snug">
            {tf.sinPromoEnFecha(PROMO_TEMPORADA.hastaTexto[locale === "en" ? "en" : "es"])}
          </p>
        )}
        {fecha && !sinLugar ? (
          <Link
            href={href}
            onClick={() => {
              marcarToqueHumano();
              // Para GA4 este botón AGREGA al carrito (que abre con fecha y
              // personas puestas): `add_to_cart`. El `begin_checkout` lo manda el
              // carrito al abrirse. El evento interno no cambia.
              trackAddToCart({ tourId, tourName: nombre, total, cantidad: personas, source: "widget" });
              trackTourEvent("CHECKOUT_STARTED", { tour: tourId, tour_name: nombre, adults: adultos, children: ninosSmall + bebes, amount: total, fecha, source: "ficha" });
            }}
            className={BOTON_RESERVAR}
          >
            {tf.reservarCon(textoDiaBoton(fecha, locale === "en"), personas, dinero(total))}
          </Link>
        ) : (
          /* Sin fecha, «Elegir fecha y reservar» mandaba al carrito SIN fecha y
             la persona se perdía ahí (Clarity, 11–28 oct: 7 de 7 que llegaron
             así no pasaron del paso 1). Ahora abre el calendario aquí mismo. Con
             fecha pero sin lugar, igual: que elija otra. */
          <button
            type="button"
            onClick={() => abrirCalendario(slug)}
            className={BOTON_RESERVAR}
          >
            {sinLugar ? tf.sinLugarEligeOtra : tf.continuar}
          </button>
        )}
        {!fecha && (
          <Link
            href={href}
            onClick={() => {
              marcarToqueHumano();
              trackAddToCart({ tourId, tourName: nombre, total, cantidad: personas, source: "widget" });
              trackTourEvent("CHECKOUT_STARTED", { tour: tourId, tour_name: nombre, adults: adultos, children: ninosSmall + bebes, amount: total, source: "ficha_sin_fecha" });
            }}
            className="block text-center font-dm text-[10px] text-crema/45 hover:text-crema/70 underline underline-offset-2 mt-2"
          >
            {tf.continuarSinFecha}
          </Link>
        )}
        {total > 0 && (
          <p className="font-dm text-[11px] text-crema/60 mt-2 text-center">
            {tf.restoElDia(pctACobrar(), dinero(resto))}
          </p>
        )}
        {/* Cuánto falta. Hasta ahora la ficha no lo decía: el botón «Reservar ·
            hoy pagas $X» con un candado se lee como «aquí se cobra», y quien no
            quiere dar la tarjeta todavía no lo toca. Paraíso lleva su barra «1
            Fechas · 2 Datos · 3 Pago» desde el primer paso por lo mismo. */}
        <p className="font-dm text-[10px] text-crema/35 mt-1 text-center">{tf.pasoUnoDeTres}</p>
      </div>
    </div>
  );
}
