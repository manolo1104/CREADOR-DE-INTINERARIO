"use client";

import { useEffect, useState } from "react";

const CLAVE = "hp_checkout_v2";

/**
 * El checkout rediseñado para TODOS. Se enciende con `NEXT_PUBLIC_CHECKOUT_V2=1`
 * en Railway (va en el build: hay que volver a desplegar para que cuente).
 */
export const CHECKOUT_V2_PARA_TODOS = process.env.NEXT_PUBLIC_CHECKOUT_V2 === "1";

/**
 * ¿Se pinta el checkout rediseñado (oct 2026)?
 *
 * Mientras no esté encendido para todos, se ve solo en el navegador que abrió
 * cualquier página con `?checkout=v2` (y se apaga con `?checkout=v1`): así
 * Manolo lo revisa en el sitio real, con los precios y la base de verdad, sin
 * que ningún visitante lo vea. Se recuerda en `sessionStorage` porque el
 * carrito limpia su URL al cargar.
 *
 * `dependencia`: quien vive fuera de la página (el layout) pasa la ruta para
 * volver a leerlo al navegar.
 */
export function useCheckoutV2(dependencia?: unknown): boolean {
  const [v2, setV2] = useState(CHECKOUT_V2_PARA_TODOS);
  useEffect(() => {
    if (CHECKOUT_V2_PARA_TODOS) return;
    try {
      const pedido = new URLSearchParams(window.location.search).get("checkout");
      if (pedido === "v2") sessionStorage.setItem(CLAVE, "1");
      else if (pedido === "v1") sessionStorage.removeItem(CLAVE);
      setV2(sessionStorage.getItem(CLAVE) === "1");
    } catch {
      // Sin sessionStorage (navegación privada estricta) se queda el de hoy.
    }
  }, [dependencia]);
  return v2;
}
