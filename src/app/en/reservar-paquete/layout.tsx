import type { Metadata } from "next";

// Gemelo en inglés de `reservar-paquete/layout.tsx`. Los layouts no cruzan de un
// árbol a otro, así que sin este archivo la versión en inglés del checkout de
// paquetes sería indexable y duplicaría la de español.
export const metadata: Metadata = {
  title: "Book your package — Huasteca Potosina Tours",
  robots: { index: false, follow: true },
};

export default function ReservarPaqueteLayoutEn({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
