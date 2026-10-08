"use client";

import { useEffect, useState } from "react";

const CLAVE = "hp_checkout_v2";

/**
 * El checkout rediseñado está ENCENDIDO para todos desde el 8 oct 2026
 * («enciéndelo para todos», Manolo).
 *
 * 🔴 Se enciende en el código y NO con `NEXT_PUBLIC_CHECKOUT_V2=1` en Railway,
 * aunque esa era la idea original. Dos razones:
 *  1. Una variable `NEXT_PUBLIC_*` se hornea en el build: si alguien la guarda
 *     en Railway y no vuelve a desplegar, no pasa nada y parece que falló el
 *     código. Ya nos pasó con `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, que ni
 *     siquiera existe allá y vive de un respaldo escrito a mano.
 *  2. Encendido en el código, se enciende con el mismo `git push` que trae todo
 *     lo demás, y se revisa en el `git diff`.
 *
 * La variable se queda como FRENO DE MANO: `NEXT_PUBLIC_CHECKOUT_V2=0` en
 * Railway devuelve a todo el mundo al checkout viejo sin tocar el código, por
 * si algo sale mal un sábado.
 */
const APAGADO_DE_EMERGENCIA = process.env.NEXT_PUBLIC_CHECKOUT_V2 === "0";

/**
 * ¿Se pinta el checkout rediseñado (oct 2026)?
 *
 * Por omisión sí. `?checkout=v1` devuelve al viejo en ese navegador y
 * `?checkout=v2` vuelve al nuevo; se recuerda en `sessionStorage` porque el
 * carrito limpia su URL al cargar. Sirve para comparar los dos lado a lado
 * mientras el viejo siga en el repo (se borra una semana después de encender).
 *
 * `dependencia`: quien vive fuera de la página (el layout) pasa la ruta para
 * volver a leerlo al navegar.
 */
export function useCheckoutV2(dependencia?: unknown): boolean {
  const [v2, setV2] = useState(!APAGADO_DE_EMERGENCIA);
  useEffect(() => {
    if (APAGADO_DE_EMERGENCIA) return;
    try {
      const pedido = new URLSearchParams(window.location.search).get("checkout");
      if (pedido === "v1") sessionStorage.setItem(CLAVE, "0");
      else if (pedido === "v2") sessionStorage.removeItem(CLAVE);
      setV2(sessionStorage.getItem(CLAVE) !== "0");
    } catch {
      // Sin sessionStorage (navegación privada estricta) se queda el nuevo,
      // que es el de todos.
    }
  }, [dependencia]);
  return v2;
}
