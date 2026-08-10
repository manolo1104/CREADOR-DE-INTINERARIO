import type { Metadata } from "next";

// Flujo de reserva (formulario, checkout y confirmación): sin contenido único
// que aporte a búsquedas. Fuera del índice para no diluir las páginas que sí
// posicionan. Tampoco está en el sitemap.
export const metadata: Metadata = {
  // El título propio es para la pestaña del navegador: sin él, el flujo de pago
  // heredaba el título genérico de la home y quien reservaba con varias
  // pestañas abiertas no distinguía cuál era su reserva.
  title: "Reservar tu tour — Tours Huasteca Potosina",
  robots: { index: false, follow: true },
};

export default function ReservarTourLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
