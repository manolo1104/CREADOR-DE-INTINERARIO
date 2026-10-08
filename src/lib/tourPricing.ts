// Cálculo de precios AUTORITATIVO en el servidor.
// El cliente nunca decide el monto a cobrar: aquí se recalcula desde TOURS_DB.

import { TOURS_DB, tourEnFecha, type Tour, type TourRuta, type TourVehiculo } from "./tours";
import { totalRecorrido, validatePromoCode, minimoPersonas, esViajeroSolo } from "./tourBooking";
import { descuentoPorPosicion } from "./carrito";

/**
 * Porcentajes de pago permitidos. 30 = "aparta tu lugar" (el resto se liquida
 * el día del tour), 100 = pago completo. Cualquier otro valor cae a 100.
 */
export const PCTS_TOUR = new Set([30, 100]);

/** Normaliza el porcentaje que llega del cliente. Nunca se confía en él. */
export function normalizarPct(pct: unknown): number {
  const n = Math.round(Number(pct));
  return PCTS_TOUR.has(n) ? n : 100;
}

export interface TourChargeInput {
  tourId?:        string;
  tourSlug?:      string;
  adults:         number;
  childrenMid:    number;
  childrenSmall:  number;
  promoCode?:     string;
  /** 30 (anticipo) o 100 (pago completo). Por defecto 100. */
  pct?:           number;
  /** Actividades opcionales. Del cliente SOLO se acepta el id y la cantidad. */
  addOns?:        { id: string; cantidad: number }[];
  /**
   * Fecha del recorrido (YYYY-MM-DD). Decide la promo de temporada baja: va
   * con los recorridos hasta el 29 oct, no con lo que se compre hasta esa fecha.
   */
  tourDate?:      string;
  /**
   * Cotizar POR ENCIMA del cupo del recorrido. Decisión de Manolo (7 oct 2026):
   * el tope existe para la venta en línea —un desconocido no puede apartar 20
   * lugares de una salida de 12—, pero en el panel un grupo grande SÍ se cotiza:
   * ahí hay alguien que ya acordó la logística y sabe si sale una segunda unidad.
   *
   * 🔴 Solo lo puede poner código de servidor detrás de sesión de administrador.
   * NUNCA se lee del cuerpo de una petición pública ni se le pasa al bot: con
   * esta bandera encendida, cualquiera podría pagar en línea una salida de 40
   * personas que no existe. Las rutas del sitio (`create-payment-intent`,
   * `carrito-payment-intent`, `guardar-carrito`) no la mandan nunca.
   */
  sinTopeDeCupo?: boolean;
}

export interface TourChargeResult {
  tour:          Tour;
  total:         number; // total completo de la reserva (MXN)
  charge:        number; // monto a cobrar AHORA (total, o el 30 % si es anticipo)
  saldo:         number; // lo que queda por pagar el día del tour
  pct:           number; // porcentaje efectivamente cobrado
  promoDiscount: number; // porcentaje de descuento aplicado
  /** Add-ons validados, ya con su precio de catálogo. Vacío si no hubo. */
  addOns:        { id: string; nombre: string; cantidad: number; precio: number; subtotal: number }[];
  addOnsTotal:   number;
  /** Va UNA persona y se cobró la tarifa de viajero solo (2 personas − $2). */
  viajeroSolo:   boolean;
}

function clampInt(n: unknown, min: number, max: number): number {
  const v = Math.floor(Number(n) || 0);
  if (Number.isNaN(v)) return min;
  return Math.max(min, Math.min(max, v));
}

/**
 * Valida la fecha del tour contra el calendario real. Hasta ahora el servidor
 * NO la miraba: se podía cobrar una reserva para una fecha pasada o para dentro
 * de dos años manipulando el sessionStorage. Vacía se acepta (los tours por
 * WhatsApp coordinan la fecha después).
 */
export function fechaTourValida(tourDate: unknown): boolean {
  if (!tourDate) return true;
  if (typeof tourDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(tourDate)) return false;

  const hoyMX = new Date().toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  const [y, m, d] = hoyMX.split("-").map(Number);
  const hoy   = new Date(y, m - 1, d);
  const tope  = new Date(y, m - 1 + 12, d); // un año vista, holgado

  const [ty, tm, td] = tourDate.split("-").map(Number);
  const fecha = new Date(ty, tm - 1, td);
  if (Number.isNaN(fecha.getTime())) return false;

  return fecha >= hoy && fecha <= tope;
}

/**
 * Recalcula el cargo real de una reserva de tour a partir del catálogo del
 * servidor. Devuelve null si el tour no existe o si se excede el cupo máximo.
 */
export function computeTourCharge(input: TourChargeInput): TourChargeResult | null {
  const delCatalogo = TOURS_DB.find((t) => t.id === input.tourId || t.slug === input.tourSlug);
  if (!delCatalogo) return null;
  // El precio de ESA fecha (promo de temporada baja solo hasta el 29 oct).
  const tour = tourEnFecha(delCatalogo, input.tourDate);

  // 🔴 El cupo se mira ANTES de recortar, y en TODOS los recorridos.
  //
  // Nació por el Jardín Escultórico, que no deja entrar a más de 7: el
  // `clampInt` de abajo recorta en silencio, así que una petición de 8 acababa
  // cobrada y registrada como 7 — y el día del recorrido se presentaban ocho en
  // la puerta de un Patrimonio Nacional que solo deja pasar a siete.
  //
  // 6 oct 2026: la guarda valía sólo para los de tarifa por grupo, y en los
  // demás pasaba lo mismo sin que nadie lo viera — Huasteca Instagrameable
  // pidiendo 9 lugares cobraba 6, que es su cupo, y el grupo chico es justo lo
  // que ese recorrido promete. Con la escalera por tamaño de grupo encima,
  // además, se llevaba el escalón más barato. Se rechaza en vez de recortar: el
  // sitio nunca manda más del cupo, así que esto sólo corta peticiones armadas
  // a mano.
  const pedidas = (Number(input.adults) || 0)
    + (Number(input.childrenMid) || 0)
    + (Number(input.childrenSmall) || 0);
  if (pedidas > tour.groupMax && !input.sinTopeDeCupo) return null;

  // Tours cobrados POR VEHÍCULO (ej. RZR) no se venden por el flujo por persona:
  // el precio depende de ruta + unidad y se cotiza por WhatsApp.
  if (tour.precioUnidad === "vehiculo") return null;

  // Con la bandera del panel el techo deja de ser el cupo del catálogo y pasa a
  // ser lo que se pidió; sin ella, todo sigue igual que siempre.
  const tope = input.sinTopeDeCupo ? Math.max(tour.groupMax, pedidas) : tour.groupMax;
  const adults        = clampInt(input.adults, 1, tope);
  const childrenMid   = clampInt(input.childrenMid, 0, tope);
  const childrenSmall = clampInt(input.childrenSmall, 0, tope);

  const personas = adults + childrenMid + childrenSmall;
  if (personas > tope) return null;

  // Mínimo del tour. Existía en los datos pero solo lo miraba el bot: por la web
  // se podía pagar un rafting para 2 cuando la balsa no sale con menos de 4, y
  // eso terminaba en una llamada para reprogramar o en un reembolso.
  // Desde el 1 oct 2026 los recorridos que salen desde 2 aceptan a UNA persona
  // con la tarifa de viajero solo (`minimoPersonas`, en tourBooking.ts).
  if (personas < minimoPersonas(tour)) return null;

  // Tours solo para adultos (ej. buceo Media Luna, edad mínima 10): el servidor
  // RECHAZA cualquier reserva con niños aunque la UI los oculte. Sin esta guarda
  // se podía pagar con descuento de niño manipulando el sessionStorage.
  if (tour.soloAdultos && childrenMid + childrenSmall > 0) return null;

  const promo = input.promoCode ? validatePromoCode(input.promoCode) : { valid: false, discount: 0 };
  const promoDiscount = promo.valid ? promo.discount : 0;

  // Tarifa por GRUPO (ej. el Edén en el Jardín) o precio por cabeza: lo decide
  // `totalRecorrido`, que es exactamente lo que pinta el carrito y el módulo de
  // la ficha. Una sola cuenta para lo que se enseña y lo que se cobra.
  const totalTour = totalRecorrido(tour, adults, childrenMid, childrenSmall, promoDiscount);

  // ── Add-ons ───────────────────────────────────────────────────────────────
  // El precio se lee SIEMPRE del catálogo del propio tour, nunca del cliente.
  // Un id que no exista en este tour se ignora en silencio en vez de cobrarse.
  const addOns: TourChargeResult["addOns"] = [];
  for (const pedido of input.addOns ?? []) {
    const cat = (tour.addOns ?? []).find((a) => a.id === pedido?.id);
    if (!cat) continue;
    // Nadie puede comprar el add-on para más gente de la que va en la reserva.
    const cantidad = clampInt(pedido?.cantidad, 0, personas);
    if (cantidad <= 0) continue;
    addOns.push({
      id:       cat.id,
      nombre:   cat.nombre,
      cantidad,
      precio:   cat.precio,
      subtotal: cat.precio * cantidad,
    });
  }
  const addOnsTotal = addOns.reduce((acc, a) => acc + a.subtotal, 0);

  // Los add-ons no llevan descuento de promo ni tarifa de niño: son precio fijo
  // por persona que lo toma.
  const total = totalTour + addOnsTotal;

  // Anticipo: se cobra ahora el 30 % y el saldo se liquida el día del tour.
  const pct    = normalizarPct(input.pct);
  const charge = pct === 100 ? total : Math.round((total * pct) / 100);

  return {
    tour, total, charge, saldo: total - charge, pct, promoDiscount, addOns, addOnsTotal,
    viajeroSolo: esViajeroSolo(tour, adults, childrenMid, childrenSmall),
  };
}

// ── Tours cobrados POR VEHÍCULO (ej. RZR) ────────────────────────────────────

export interface VehiculoChargeInput {
  tourId?:   string;
  tourSlug?: string;
  ruta?:     string;
  vehiculo?: string;
  unidades?: number;
  /** 30 (anticipo) o 100 (pago completo). Por defecto 100. */
  pct?:      number;
}

export interface VehiculoChargeResult {
  tour:     Tour;
  ruta:     TourRuta;
  vehiculo: TourVehiculo;
  unidades: number;
  total:    number; // precio del vehículo × unidades (MXN)
  charge:   number; // monto a cobrar ahora (total, o el 30 % si es anticipo)
  saldo:    number; // lo que queda por pagar el día del tour
  pct:      number; // porcentaje efectivamente cobrado
}

/**
 * Recalcula el cargo de un tour por vehículo (RZR) desde la matriz flota×ruta
 * del catálogo del servidor. El precio depende de la ruta y de la unidad
 * elegida — el cliente nunca decide el monto. Devuelve null si algo no cuadra.
 */
export function computeVehiculoCharge(input: VehiculoChargeInput): VehiculoChargeResult | null {
  const tour = TOURS_DB.find((t) => t.id === input.tourId || t.slug === input.tourSlug);
  if (!tour || tour.precioUnidad !== "vehiculo" || !tour.rutas || !tour.flota) return null;

  const rutaIdx = tour.rutas.findIndex((r) => r.nombre === input.ruta);
  if (rutaIdx < 0) return null;

  const vehiculo = tour.flota.find((v) => v.nombre === input.vehiculo);
  if (!vehiculo) return null;

  const precio = vehiculo.precios[rutaIdx];
  if (!precio || precio <= 0) return null;

  const unidades = clampInt(input.unidades, 1, 10);
  const total = precio * unidades;

  const pct    = normalizarPct(input.pct);
  const charge = pct === 100 ? total : Math.round((total * pct) / 100);

  return {
    tour, ruta: tour.rutas[rutaIdx], vehiculo, unidades,
    total, charge, saldo: total - charge, pct,
  };
}

/** Nombre descriptivo de una reserva por vehículo: "RZR — Ruta Nacimiento · Defender ×2". */
export function vehiculoBookingName(tour: Tour, rutaNombre: string, vehiculoNombre: string, unidades: number): string {
  const base = tour.nombreCorto;
  const uni  = unidades > 1 ? ` ×${unidades}` : "";
  return `${base} — ${rutaNombre} · ${vehiculoNombre}${uni}`;
}

// ── Tarifado de un carrito completo ──────────────────────────────────────────

export interface LineaCarrito {
  tourId: string; tourSlug: string; tourName: string; tourDate: string;
  adults: number; children: number; subtotal: number;
  /** Los tramos por separado: el correo dice "2 adultos · 1 niño · 1 menor". */
  childrenMid?: number; childrenSmall?: number;
  ruta?: string; vehiculo?: string; unidades?: number;
  eleccion?: string;
  /**
   * Actividades opcionales contratadas, ya con su precio de catálogo.
   *
   * 🔴 El bug que esto arregla: el add-on SÍ se cobraba —va dentro de
   * `charge.total`, o sea dentro de `subtotal`— pero no se copiaba aquí, así
   * que desaparecía del correo, de las notas del equipo y del panel. El cliente
   * veía $3,900 donde el tour para dos son $3,200 sin explicación, y el guía en
   * Xilitla nunca se enteraba de que habían pagado el Salto de las 7 Cascadas,
   * que necesita guía de rescate.
   */
  addOns?: { id: string; nombre: string; cantidad: number; precio: number; subtotal: number }[];
  /** Lo que costaba este renglón antes del descuento por varios recorridos. */
  subtotalSinDescuento?: number;
  /** Porcentaje descontado por ser el 2.º, 3.º… recorrido del carrito. */
  descuentoMultiple?: number;
  /**
   * Va UNA persona con la tarifa de viajero solo. Viaja con el renglón para que
   * el correo se lo explique al cliente y las notas le digan al equipo que hay
   * que sumarlo a un grupo armado para esa fecha.
   */
  viajeroSolo?: boolean;
}

export type TarifaCarrito =
  | {
      ok: true;
      lineItems: LineaCarrito[];
      total: number;
      /** Pesos ahorrados por llevar varios recorridos. 0 si va uno solo. */
      ahorroMultiple: number;
    }
  | {
      ok: false;
      error: string;
      /**
       * De qué renglón del carrito habla el error, para que la pantalla pueda
       * señalarlo en vez de dejar al cliente adivinar.
       *
       * 🔴 Por qué existe: `computeTourCharge` devuelve `null` por SIETE
       * motivos distintos (sin cupo, bajo el mínimo, niños en un recorrido de
       * adultos, por vehículo, slug inexistente…) y todos acababan en el mismo
       * 400 —«uno de los recorridos ya no está disponible con esos datos»— que
       * no nombraba ni el recorrido ni el motivo. Justo en el paso de pagar.
       */
      uid?: string;
      tourSlug?: string;
    };


/**
 * Tarifa los recorridos de un carrito, siempre en el servidor.
 *
 * Lo usan LOS DOS caminos: el que cobra (`carrito-payment-intent`) y el que
 * guarda la cotización por correo (`guardar-carrito`). Vive aquí justo para que
 * no puedan divergir: si el correo promete un precio y el pago calcula otro, el
 * cliente lo descubre en la peor pantalla posible.
 *
 * Regla que no se rompe: lo que manda el cliente son referencias (qué tour, qué
 * día, cuánta gente). El `total` que viaja en su localStorage jamás se cobra.
 */
/**
 * Por qué `computeTourCharge` dijo que no. Solo para el MENSAJE de error: el
 * cobro nunca depende de esto.
 *
 * ⚠️ Repite a propósito las guardas de `computeTourCharge` en vez de que
 * aquélla devuelva un motivo, para no tocar la firma de la función por la que
 * pasa todo el dinero del sitio. Si se agrega o cambia una guarda allá arriba,
 * se agrega aquí: viven pegadas para que se vean juntas en el mismo diff.
 */
function motivoSinTarifa(raw: Record<string, unknown>): string | null {
  // Se busca igual que en `computeTourCharge` (línea ~98), por id o por slug.
  const tour = TOURS_DB.find((t) => t.id === raw.tourId || t.slug === raw.tourSlug);
  if (!tour) return null;
  const nombre = tour.nombreCorto || tour.nombre;
  const pedidas = (Number(raw.adults) || 0)
    + (Number(raw.childrenMid) || 0)
    + (Number(raw.childrenSmall) || 0);
  const ninos = (Number(raw.childrenMid) || 0) + (Number(raw.childrenSmall) || 0);

  if (pedidas > tour.groupMax) {
    return `${nombre} sale con grupos de hasta ${tour.groupMax} personas y el carrito pide ${pedidas}. Quita a alguien o escríbenos por WhatsApp.`;
  }
  const minimo = minimoPersonas(tour);
  if (pedidas < minimo) {
    return `${nombre} sale desde ${minimo} ${minimo === 1 ? "persona" : "personas"} y el carrito tiene ${pedidas}. Súbelo o escríbenos por WhatsApp.`;
  }
  if (tour.soloAdultos && ninos > 0) {
    return `${nombre} es solo para adultos: quita a los menores de ese recorrido.`;
  }
  if (tour.precioUnidad === "vehiculo") {
    return `${nombre} se cobra por vehículo y se reserva aparte.`;
  }
  return null;
}

export function tarifarRecorridos(items: unknown[]): TarifaCarrito {
  const lineItems: LineaCarrito[] = [];
  let total = 0;

  for (const bruto of items) {
    const raw = bruto as Record<string, unknown>;
    const uid = typeof raw?.uid === "string" ? raw.uid : undefined;
    const slugRenglon = typeof raw?.tourSlug === "string" ? raw.tourSlug : undefined;
    if (!raw?.tourDate) {
      return { ok: false, error: "Falta la fecha de uno de los recorridos del carrito.", uid, tourSlug: slugRenglon };
    }
    if (!fechaTourValida(raw.tourDate)) {
      return { ok: false, error: "Una de las fechas no es válida. Revisa tu carrito.", uid, tourSlug: slugRenglon };
    }

    // Tours por vehículo (RZR, café): el precio sale de la matriz ruta×unidad.
    if (raw.ruta && raw.vehiculo) {
      // `pct: 100` porque aquí se pide el PRECIO COMPLETO del renglón; el
      // anticipo se aplica una sola vez sobre la suma, al final.
      const veh = computeVehiculoCharge({
        tourId:   raw.tourId as string,
        tourSlug: raw.tourSlug as string,
        ruta:     raw.ruta as string,
        vehiculo: raw.vehiculo as string,
        unidades: raw.unidades as number,
        pct:      100,
      });
      if (!veh) return { ok: false, error: "Ruta o vehículo inválido en el carrito.", uid, tourSlug: slugRenglon };
      lineItems.push({
        tourId:   veh.tour.id,
        tourSlug: veh.tour.slug,
        tourName: vehiculoBookingName(veh.tour, veh.ruta.nombre, veh.vehiculo.nombre, veh.unidades),
        tourDate: String(raw.tourDate),
        adults:   veh.unidades,
        children: 0,
        ruta:     veh.ruta.nombre,
        vehiculo: veh.vehiculo.nombre,
        unidades: veh.unidades,
        subtotal: veh.total,
      });
      total += veh.total;
      continue;
    }

    const charge = computeTourCharge({
      tourId:        raw.tourId as string,
      tourSlug:      raw.tourSlug as string,
      adults:        raw.adults as number,
      childrenMid:   raw.childrenMid as number,
      childrenSmall: raw.childrenSmall as number,
      promoCode:     raw.promoCode as string,
      pct:           100,
      addOns:        raw.addOns as { id: string; cantidad: number }[],
      tourDate:      String(raw.tourDate),
    });
    if (!charge) {
      return {
        ok: false,
        error: motivoSinTarifa(raw)
          ?? "Uno de los recorridos del carrito ya no está disponible con esos datos.",
        uid: typeof raw.uid === "string" ? raw.uid : undefined,
        tourSlug: typeof raw.tourSlug === "string" ? raw.tourSlug : undefined,
      };
    }

    // La elección se valida contra el catálogo, no se acepta a ciegas: viene del
    // localStorage del visitante, que cualquiera puede editar.
    const eleccionValida = charge.tour.eleccion?.opciones
      .find((o) => o.nombre === raw.eleccion || o.id === raw.eleccion)?.nombre;

    lineItems.push({
      tourId:   charge.tour.id,
      tourSlug: charge.tour.slug,
      tourName: charge.tour.nombre,
      tourDate: String(raw.tourDate),
      adults:   Number(raw.adults) || 1,
      children: (Number(raw.childrenMid) || 0) + (Number(raw.childrenSmall) || 0),
      childrenMid:   Number(raw.childrenMid) || 0,
      childrenSmall: Number(raw.childrenSmall) || 0,
      subtotal: charge.total,
      ...(eleccionValida ? { eleccion: eleccionValida } : {}),
      // Ya validados contra el catálogo por `computeTourCharge`: van con su
      // nombre y su precio real para que el correo y el panel los puedan pintar.
      ...(charge.addOns.length ? { addOns: charge.addOns } : {}),
      ...(charge.viajeroSolo ? { viajeroSolo: true } : {}),
    });
    total += charge.total;
  }

  // ── Descuento por varios recorridos ───────────────────────────────────────
  // Se aplica al final, sobre los renglones ya tarifados: el más caro completo,
  // el segundo −10 % y del tercero en adelante −15 %.
  //
  // No se acumula con un código promocional: un renglón que ya trae código se
  // queda como está. Sin esa guarda, un HUASTECA20 sobre el tercer recorrido
  // acabaría en 35 % de descuento sin que nadie lo hubiera decidido.
  let ahorroMultiple = 0;
  if (lineItems.length > 1) {
    const conPromo = items.some(
      (x) => typeof (x as Record<string, unknown>)?.promoCode === "string"
        && ((x as Record<string, unknown>).promoCode as string).trim() !== "",
    );
    if (!conPromo) {
      // 🔴 Los recorridos de tarifa por grupo quedan FUERA del descuento: su
      // costo es una tarifa fija que nos cobra un tercero (la Fundación Las
      // Pozas), no una salida propia donde el costo se reparte. El Edén como
      // tercer recorrido cobraría $2,958 sobre un costo de $2,675, y el
      // traslado lo dejaría en pérdida. Los demás renglones se numeran entre
      // ellos, así que nadie pierde descuento por esto.
      const descontables = lineItems.filter((l) => {
        const t = TOURS_DB.find((x) => x.slug === l.tourSlug || x.id === l.tourId);
        return !t?.tarifaGrupo?.length;
      });
      const orden = [...descontables].sort((a, b) => b.subtotal - a.subtotal);
      orden.forEach((linea, i) => {
        const pct = descuentoPorPosicion(i);
        if (pct === 0) return;
        const original = linea.subtotal;
        const rebaja   = Math.round(original * pct / 100);
        linea.subtotalSinDescuento = original;
        linea.descuentoMultiple    = pct;
        linea.subtotal             = original - rebaja;
        ahorroMultiple += rebaja;
      });
      total -= ahorroMultiple;
    }
  }

  return { ok: true, lineItems, total, ahorroMultiple };
}
