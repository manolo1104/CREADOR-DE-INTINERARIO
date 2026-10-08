import type { Metadata } from "next";
import { Sora } from "next/font/google";

// Todo lo que se mueve en el funnel vive aquí. Sólo lo carga /curso.
import "./movimiento.css";

/**
 * La fuente de títulos del funnel (`font-sora`). Vivía en el layout raíz y se
 * precargaba en TODAS las páginas de tours, que no la usan (7 oct 2026): aquí
 * solo baja en /curso. JetBrains Mono se quedó en el raíz porque el panel
 * también la usa (ver app/layout.tsx).
 */
const sora = Sora({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

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
  return (
    <>
      {/* `--font-sora` va en :root y no en un <div> que envuelva la página: el
          aviso de cookies del curso (título en `font-sora`) lo pinta
          PublicShell FUERA de este layout, y sin la variable su título caería
          a la letra del cuerpo. dangerouslySetInnerHTML porque el valor lleva
          comillas: un <style>{css}</style> con comillas rompe la hidratación. */}
      <style dangerouslySetInnerHTML={{ __html: `:root{--font-sora:${sora.style.fontFamily}}` }} />
      {children}
    </>
  );
}
