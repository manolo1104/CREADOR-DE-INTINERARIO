"use client";

import { useEffect, useState } from "react";
import {
  CARRITO_EVENT,
  leerCarrito,
  resumirCarrito,
  pctACobrar,
  type CarritoItem,
} from "@/lib/carrito";
import { leerExtras } from "@/lib/carritoExtras";

/**
 * La cuenta del carrito que pinta la barra fija de abajo.
 *
 * 🔴 Vivía dentro de `carrito/CarritoBar.tsx`, que era la barra de escritorio.
 * El 7 oct 2026 esa barra y los botones flotantes se fundieron en una sola
 * (`BarraInferiorMovil`, ahora en todos los tamaños) y el archivo se borró, así
 * que el gancho necesitaba casa propia: tenerlo colgando del componente que
 * desapareció era la razón por la que no se podía borrar.
 *
 * El carrito vive en localStorage, que no existe en el servidor: hasta que no
 * monta (`montado`) no hay que pintar nada de él, o React se queja de
 * hidratación.
 */
export function useResumenCarrito() {
  const [items, setItems] = useState<CarritoItem[]>([]);
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setMontado(true);
    const sincronizar = () => setItems(leerCarrito());
    sincronizar();
    window.addEventListener(CARRITO_EVENT, sincronizar);
    // `storage` cubre el caso de dos pestañas abiertas del mismo sitio.
    window.addEventListener("storage", sincronizar);
    return () => {
      window.removeEventListener(CARRITO_EVENT, sincronizar);
      window.removeEventListener("storage", sincronizar);
    };
  }, []);

  // `pct` viene de `pctACobrar`: con un solo día y sin hotel es 100, y entonces
  // el texto no puede hablar de apartar — se está pagando el viaje completo.
  //
  // `resumirCarrito` solo conoce los recorridos, y el hospedaje también manda:
  // una noche de hotel devuelve el viaje al 30 %. Sin mirarlo, esta barra
  // anunciaba "Pagas hoy" el total completo a alguien que en el carrito veía
  // el 30 %, y son dos cifras distintas para la misma compra.
  // Los extras solo se leen ya montado y con algo dentro: en el servidor y en
  // la pasada de hidratación no hay carrito que resumir.
  const conHotel = montado && items.length > 0 ? leerExtras().conHotel : false;
  const resumen  = resumirCarrito(items);
  const total    = resumen.total;
  const pct      = pctACobrar(resumen.dias, conHotel);
  const anticipo = Math.round((total * pct) / 100);
  return { montado, items, total, pct, anticipo, conHotel };
}
