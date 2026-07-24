import type { Metadata } from "next";

// Página de entrega de la guía comprada: contenido de pago, nunca debe
// indexarse (ni aparecer en resultados como acceso gratuito al producto).
export const metadata: Metadata = {
  title: "Tu guía de la Huasteca Potosina",
  robots: { index: false, follow: false },
};

export default function DescargaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
