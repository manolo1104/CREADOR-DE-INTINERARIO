import type { Metadata } from "next";

// El mismo criterio que `reservar/carrito/layout.tsx`, replicado bajo /en.
//
// ⚠️ Los layouts NO se heredan entre árboles: `/en/reservar/carrito` es una
// rama distinta de `/reservar/carrito`, así que sin este archivo la versión en
// inglés del carrito habría sido la única pantalla de pago del sitio indexable
// —y encima duplicando la de español a ojos de Google.
export const metadata: Metadata = {
  title: "Your trip — Huasteca Potosina Tours",
  robots: { index: false, follow: true },
};

export default function CarritoLayoutEn({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
