import type { Metadata } from "next";

// Flujo de reserva de paquetes: transaccional, fuera del índice (ver
// reservar-tour/layout.tsx). Tampoco está en el sitemap.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function ReservarPaqueteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
