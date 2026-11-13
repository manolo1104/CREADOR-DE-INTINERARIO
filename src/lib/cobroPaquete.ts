// El cobro de un PAQUETE desde el checkout del carrito (13 nov 2026, auditoría:
// «pasa los paquetes al mismo checkout que los tours: fecha, habitación y
// anticipo con Stripe»).
//
// Es la parte de `api/paquetes/create-payment-intent` que toca a los paquetes
// del CATÁLOGO (los de evento —Xantolo— ya pasaron y no entran aquí), con la
// MISMA metadata: la reserva la arma `registrarReservaPaquete` (pantalla y
// webhook) leyendo esas llaves, así que el panel, el correo y el corte quedan
// idénticos a los de un paquete comprado en la página vieja.
//
// El anticipo es el de los tours: 30 % o todo (decisión de Manolo, 13 nov 2026).

import { getPaquete, habitacionesDePaquete, type Paquete } from "@/lib/paquetes";
import { HABITACIONES_HOTEL } from "@/lib/habitaciones";
import { computePaqueteCharge, MAX_PERSONAS_PAQUETE, parseEleccion, type PaqueteChargeResult } from "@/lib/paquetePricing";
import { fechaTourValida } from "@/lib/tourPricing";
import { MSI_DESDE } from "@/lib/stripeMsi";
import { ANTICIPO_PCT } from "@/lib/carrito";

/** Lo que manda el navegador. Son referencias: el importe lo calcula el servidor. */
export interface PedidoPaqueteEntrada {
  slug?: unknown;
  fecha?: unknown;
  adultos?: unknown;
  childrenMid?: unknown;
  childrenSmall?: unknown;
  habitacionId?: unknown;
  nocheExtra?: unknown;
  elegidos?: unknown;
}

export type PedidoPaqueteValido = {
  ok: true;
  paquete: Paquete;
  fecha: string;
  elegidos: string[];
  habitacionNombre: string;
  cobro: PaqueteChargeResult;
  /** 30 o 100. */
  pct: number;
  /** Lo que se cobra hoy. */
  cobrar: number;
  saldo: number;
};

export type PedidoPaqueteResultado = PedidoPaqueteValido | { ok: false; error: string; status: number };

/** «Pagar todo» solo vale desde el umbral de los meses sin intereses, como en el carrito de tours. */
export function pctDelPaqueteEnCarrito(total: number, pagarTodo: unknown): number {
  return pagarTodo === true && total >= MSI_DESDE ? 100 : ANTICIPO_PCT;
}

/**
 * Valida el pedido y lo tarifa. Pura (sin base): el cupo lo revisa quien llama
 * con `toursDePaquete` + `pedidosSinCupo`, como la ruta vieja.
 */
export function validarPedidoPaquete(p: PedidoPaqueteEntrada, pagarTodo: unknown, hoyMasUno?: string): PedidoPaqueteResultado {
  const paquete = getPaquete(String(p.slug ?? ""));
  if (!paquete) return { ok: false, error: "Paquete inválido.", status: 400 };
  if (paquete.evento) return { ok: false, error: "Este paquete ya no está a la venta.", status: 410 };

  const fecha = String(p.fecha ?? "");
  if (!fecha || !fechaTourValida(fecha, { desdeManana: true }) || (hoyMasUno && fecha < hoyMasUno)) {
    return { ok: false, error: "Elige la fecha de inicio de tu viaje para continuar.", status: 400 };
  }

  const eleccion = paquete.eleccionTour;
  const elegidos = Array.from(new Set(parseEleccion(Array.isArray(p.elegidos) ? p.elegidos.join(",") : p.elegidos)))
    .filter((slug) => eleccion?.opciones.some((o) => o.slug === slug));
  if (eleccion && elegidos.length !== (eleccion.cuantos ?? 1)) {
    const n = eleccion.cuantos ?? 1;
    return { ok: false, error: `Elige ${n} recorrido${n > 1 ? "s" : ""} de la lista para continuar.`, status: 400 };
  }

  const habsDelPaquete = habitacionesDePaquete(paquete);
  const habitacion = HABITACIONES_HOTEL.find((h) => h.id === p.habitacionId && habsDelPaquete.some((x) => x.id === h.id));

  const base = {
    slug: paquete.slug,
    personas: p.adultos,
    childrenMid: p.childrenMid,
    childrenSmall: p.childrenSmall,
    vistaMontana: habitacion ? habitacion.vistaMontana : false,
    nocheExtra: p.nocheExtra === true,
    tourElegido: elegidos.join(","),
    fecha,
  };
  const completo = computePaqueteCharge({ ...base, pct: 100 });
  if (!completo) {
    return { ok: false, error: `Número de personas inválido. Para grupos de más de ${MAX_PERSONAS_PAQUETE} escríbenos por WhatsApp y lo cotizamos.`, status: 400 };
  }
  const pct = pctDelPaqueteEnCarrito(completo.total, pagarTodo);
  const cobro = pct === 100 ? completo : computePaqueteCharge({ ...base, pct })!;
  return {
    ok: true, paquete, fecha, elegidos,
    habitacionNombre: habitacion?.nombre ?? (cobro.vistaMontana ? "Jungla (vista a la montaña)" : "Vista a la selva"),
    cobro, pct, cobrar: cobro.charge, saldo: cobro.total - cobro.charge,
  };
}

/**
 * La metadata del cobro: las MISMAS llaves que escribe la página vieja de
 * paquetes para un paquete del catálogo (las lee `registrarReservaPaquete`).
 * `carrito: "paquete"` lo distingue de un carrito de tours (`"1"`), para que
 * ninguno de los dos reuse el cobro del otro.
 */
export function metadataPaquete(v: PedidoPaqueteValido, extra: {
  customerEmail: string; customerName: string; customerPhone: string; notas: string;
  locale: "es" | "en"; gaClientId: string; sid: string; equipo: Record<string, string>;
}): Record<string, string> {
  const { paquete, cobro, fecha, elegidos, habitacionNombre, pct } = v;
  return {
    customerEmail: extra.customerEmail,
    customerName:  extra.customerName,
    tourId:        paquete.slug,
    tourName:      `Paquete · ${paquete.nombre}`,
    tourSlug:      paquete.slug,
    tourDate:      fecha,
    adults:        String(cobro.adultos),
    children:      String(cobro.childrenMid + cobro.childrenSmall),
    childrenMid:   String(cobro.childrenMid),
    childrenSmall: String(cobro.childrenSmall),
    habitacion:    habitacionNombre,
    tourElegido:   elegidos.join(","),
    repartoHab:    "",
    nocheExtra:    cobro.nocheExtra ? "sí — entra la víspera, check-in 3 PM" : "no",
    nochesHotel:   String(cobro.nochesTotales),
    producto:      "paquete",
    paquetePct:    String(pct),
    totalCompleto: String(cobro.total),
    habitaciones:  String(cobro.habitaciones),
    extraHotel:    String(cobro.extraHotel),
    extraTours:    String(cobro.extraTours),
    extraEvento:   String(cobro.extraEvento),
    extraTraslado: String(cobro.extraTraslado),
    importeHotel:  String(cobro.importeHotel),
    customerPhone: extra.customerPhone.slice(0, 40),
    notasCliente:  extra.notas.slice(0, 300),
    notaEquipo:    "",
    conTour:       "no",
    recogida:      "",
    recogidaCliente: "",
    personas:      String(cobro.personas),
    source:        "huasteca-potosina.com",
    carrito:       "paquete",
    pctPagado:     String(pct),
    saldo:         String(cobro.total - cobro.charge),
    locale:        extra.locale,
    gaClientId:    extra.gaClientId.slice(0, 60),
    sid:           extra.sid.slice(0, 60),
    ...extra.equipo,
  };
}
