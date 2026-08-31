// El desglose final de una cotización: qué se ajustó, qué se descontó, cuánto
// hay que dar para apartar y cuánto queda.
//
// 🔴 Dos agujeros que esto tapa, los dos del mismo tipo — números que el
// cliente ve y no cuadran:
//
//  1. El PDF DEDUCÍA el descuento restando (suma de líneas − total). Cuando el
//     precio se editaba a mano POR ARRIBA, esa resta daba negativo, la línea
//     desaparecía y el PDF quedaba con líneas que suman $28,200 y un Total de
//     $28,800: seiscientos pesos sin explicación, y el descuento del 10 % que
//     sí se había aplicado no se veía por ningún lado.
//
//  2. El correo de cotización no decía NI el anticipo NI el descuento. Solo
//     "Total Cotizado", así que le pedía al cliente el 100 % de golpe mientras
//     el sitio le pide el 30 %, y nunca se enteraba de que le habíamos hecho
//     un precio.
//
// Vive aquí y no en cada plantilla a propósito: el PDF y el correo salen de la
// MISMA cotización y tienen que decir lo mismo al peso.

export interface MetaCotizacion {
  priceOverride?: number | null;
  discountType?:  string | null;
  discountValue?: number | null;
  anticipo?:      number | null;
}

export interface DesgloseCotizacion {
  /** Lo que se le sumó o restó al precio de lista al editarlo a mano. */
  ajuste:      number;
  /** El descuento realmente aplicado, en pesos. */
  descuento:   number;
  /** Lo que hay que dar para apartar. */
  anticipo:    number;
  /** Lo que queda para el día del tour. */
  saldo:       number;
  /** El anticipo como porcentaje del total, para decirlo en palabras. */
  anticipoPct: number;
}

const entero = (v: unknown) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? n : 0;
};

/**
 * @param sumaLineas  Tours + hospedaje + extras, como se imprimen.
 * @param total       Lo que quedó guardado como `totalAmount`: manda siempre.
 * @param meta        El `_meta` de la cotización.
 *
 * Garantía: `sumaLineas + ajuste − descuento === total`. Siempre. Aunque los
 * datos guardados sean viejos o incoherentes, el papel cuadra.
 */
export function desgloseCotizacion(
  sumaLineas: number,
  total: number,
  meta: MetaCotizacion,
): DesgloseCotizacion {
  // El descuento real, tal como se capturó. Si la cotización es vieja y no lo
  // guardó, se deduce de la diferencia (que es lo que se hacía antes).
  const base = meta.priceOverride != null ? entero(meta.priceOverride) : sumaLineas;
  let descuento: number;
  if (meta.discountValue != null && entero(meta.discountValue) > 0) {
    descuento = meta.discountType === "fixed"
      ? entero(meta.discountValue)
      : Math.round(base * (entero(meta.discountValue) / 100));
  } else {
    descuento = Math.max(0, sumaLineas - total);
  }
  descuento = Math.max(0, Math.min(descuento, sumaLineas + Math.max(0, base - sumaLineas)));

  // Lo que falta para que las líneas impresas lleguen al total guardado.
  // Con una cotización normal da 0 y no se imprime ninguna línea de más.
  const ajuste = total - sumaLineas + descuento;

  const anticipo = Math.max(0, Math.min(entero(meta.anticipo ?? Math.round(total * 0.5)), total));
  return {
    ajuste,
    descuento,
    anticipo,
    saldo:       Math.max(0, total - anticipo),
    anticipoPct: total > 0 ? Math.round((anticipo / total) * 100) : 0,
  };
}
