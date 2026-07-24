import type { Metadata } from "next";

// Flujo de reserva (formulario, checkout y confirmación): sin contenido único
// que aporte a búsquedas. Fuera del índice para no diluir las páginas que sí
// posicionan. Tampoco está en el sitemap.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function ReservarTourLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
