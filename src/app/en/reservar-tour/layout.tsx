import type { Metadata } from "next";

// Gemelo en inglés de `reservar-tour/layout.tsx`: el flujo de pago y la pantalla
// de éxito quedan fuera del índice, igual que en español. Los layouts no cruzan
// de un árbol a otro, así que hay que declararlo aquí.
export const metadata: Metadata = {
  title: "Book your tour — Huasteca Potosina Tours",
  robots: { index: false, follow: true },
};

export default function ReservarTourLayoutEn({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
