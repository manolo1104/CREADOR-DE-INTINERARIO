import { Metadata } from "next";
import { PlannerShell } from "@/components/planner/PlannerShell";

const SITE = "https://www.huasteca-potosina.com";

export const metadata: Metadata = {
  title: "Planea tu Viaje con IA — Itinerario Personalizado | Huasteca Potosina",
  description: "Diseña tu itinerario personalizado para la Huasteca Potosina con inteligencia artificial. Rutas reales, tiempos de traslado y precios 2026.",
  openGraph: {
    title: "Planea tu Viaje con IA — Huasteca Potosina",
    description: "Itinerario personalizado con IA: rutas reales, tiempos de traslado y precios 2026.",
    url: `${SITE}/planear`,
    siteName: "Tours Huasteca Potosina",
    locale: "es_MX",
    type: "website",
    images: [{ url: `${SITE}/og-image.jpg`, width: 1200, height: 630, alt: "Planificador de viajes Huasteca Potosina" }],
  },
  twitter: { card: "summary_large_image", title: "Planea tu Viaje con IA — Huasteca Potosina", description: "Itinerario personalizado en 2 minutos.", images: [`${SITE}/og-image.jpg`] },
};

export default function PlanearPage() {
  return <PlannerShell />;
}
