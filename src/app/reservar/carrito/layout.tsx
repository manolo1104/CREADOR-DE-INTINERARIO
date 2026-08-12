import type { Metadata } from "next";

// Mismo criterio que `reservar-tour/layout.tsx`: el carrito es pantalla de pago,
// no contenido que posicione. Estaba quedándose fuera de esa regla solo porque
// cuelga de `/reservar` (que sí está en el sitemap) en vez de tener árbol propio,
// así que era la ÚNICA pantalla de pago del sitio indexable.
//
// El título también es propio: la página es `"use client"` y no puede exportar
// metadata, así que sin este layout heredaba el título genérico de la home y en
// la pestaña del navegador no se distinguía de cualquier otra.
export const metadata: Metadata = {
  title: "Tu viaje — Tours Huasteca Potosina",
  robots: { index: false, follow: true },
};

export default function CarritoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
