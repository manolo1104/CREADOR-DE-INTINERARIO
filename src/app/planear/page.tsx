import { Metadata } from "next";
import { PlannerShell } from "@/components/planner/PlannerShell";

const SITE = "https://www.huasteca-potosina.com";

// Fuera del índice mientras el generador siga apagado: /api/generate devuelve
// 503 ("El generador de itinerarios está temporalmente desactivado"), así que
// esta página promete un itinerario con IA que no puede entregar.
//
// Estaba en la peor combinación posible: bloqueada en robots.txt y aun así
// indexada (41 impresiones, posición 18,41). Bloqueada, Google no puede entrar
// a LEER un noindex, así que nunca la saca. Por eso se quitó el
// `Disallow: /planear` de robots.ts: ahora entra, lee esta orden y la retira
// del índice de verdad. `follow: true` para que siga los enlaces internos de
// la página hacia tours y paquetes, que sí queremos rastreados.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
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
