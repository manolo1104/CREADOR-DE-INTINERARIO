"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ShoppingBag } from "lucide-react";
import {
  CARRITO_EVENT,
  leerCarrito,
  resumirCarrito,
  type CarritoItem,
} from "@/lib/carrito";
import { formatMXN } from "@/lib/tourBooking";
import { hayBarraDeTour, enMotorDeReservas } from "@/lib/barrasFijas";

/**
 * Barra fija que recuerda al visitante que ya tiene recorridos apartados.
 *
 * Sin esto el carrito es invisible: quien agrega un tour y sigue navegando no
 * tiene ninguna señal de que lleva algo, y el segundo tour —que es justo el
 * dinero que este carrito viene a recoger— nunca se agrega.
 *
 * Se esconde dentro del propio carrito y del checkout, donde estorbaría y
 * repetiría información que ya está en pantalla.
 */
export function CarritoBar() {
  const pathname = usePathname();
  const [items, setItems] = useState<CarritoItem[]>([]);
  // El carrito vive en localStorage, que no existe en el servidor. Hasta que no
  // monta en el cliente no se pinta nada, o React se queja de hidratación.
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

  // Dentro del motor —carrito, checkout de tour y de paquete— esta barra sobra:
  // repite lo que ya está en pantalla y, en el checkout de un paquete, invita a
  // irse a otra compra justo antes de pagar.
  if (!montado || items.length === 0 || enMotorDeReservas(pathname)) return null;

  // En las fichas de tour manda `MobileBookingBar`, que vive en el mismo
  // `bottom-0`: las dos juntas se tapaban una a la otra, y ahí el acceso al
  // carrito lo lleva esa barra dentro.
  // Pero esa barra es `lg:hidden`, así que la regla tiene que ser responsiva:
  // si esto se escondiera del todo, en escritorio la ficha de tour se quedaría
  // sin ninguna señal de que hay un carrito empezado.
  const cede = hayBarraDeTour(pathname) ? "hidden lg:block" : "block";

  const { total, anticipo } = resumirCarrito(items);

  return (
    <div className={`${cede} fixed bottom-0 left-0 right-0 z-[45] border-t border-dorado/30 bg-negro/97 backdrop-blur-sm px-4 py-3`}>
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <ShoppingBag className="w-5 h-5 text-dorado flex-shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-dm text-[12px] text-crema/90 leading-tight truncate">
              {items.length} {items.length === 1 ? "recorrido" : "recorridos"} · {formatMXN(total)} MXN
            </p>
            <p className="font-dm text-[10px] text-crema/45 leading-tight">
              Apartas con {formatMXN(anticipo)}
            </p>
          </div>
        </div>
        <Link
          href="/reservar/carrito"
          className="flex-shrink-0 bg-dorado hover:bg-lima text-negro text-[10px] tracking-[2px] uppercase font-dm font-medium px-5 py-3 transition-colors"
        >
          Ver carrito
        </Link>
      </div>
    </div>
  );
}
