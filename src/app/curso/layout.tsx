import type { Metadata } from "next";

/**
 * Layout del funnel del curso "Turismo con IA".
 *
 * noindex a propósito: el tráfico llega por WhatsApp, correo y redes con liga
 * directa. Esta página vende un curso B2B y no debe mezclarse en Google con
 * el sitio B2C de tours (ni aparecer cuando un viajero busca cascadas).
 */
export const metadata: Metadata = {
  title: "Turismo con IA: construye el sistema que opera tu negocio",
  description:
    "Curso en vivo de 4 semanas para agencias de viajes, guías, operadores y hoteles: sales con tu página publicada, un agente de IA en tu WhatsApp, automatizaciones y tu panel de control. Lo enseña Manolo, fundador de Huasteca Potosina Tours.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Turismo con IA: construye el sistema que opera tu negocio",
    description:
      "4 semanas, en vivo. Tu página, tu agente de WhatsApp, tus automatizaciones y tu panel. Con los resultados reales de Huasteca Potosina Tours.",
    locale: "es_MX",
  },
};

export default function CursoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
