import type { Metadata } from "next";

// Flujo de reserva de paquetes: transaccional, fuera del índice (ver
// reservar-tour/layout.tsx). Tampoco está en el sitemap.
export const metadata: Metadata = {
  // El título propio es para la pestaña, igual que en `reservar-tour` y en el
  // carrito: sin él, la pantalla de pago heredaba el título genérico de la home
  // y quien reserva con varias pestañas abiertas no distinguía cuál era la suya.
  title: "Reservar tu paquete — Tours Huasteca Potosina",
  robots: { index: false, follow: true },
};

export default function ReservarPaqueteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
