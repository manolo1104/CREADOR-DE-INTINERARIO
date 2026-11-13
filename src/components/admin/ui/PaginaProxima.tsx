import { EncabezadoPagina } from "./EncabezadoPagina";
import { EstadoVacio } from "./EstadoVacio";

/**
 * Una sección del rediseño que todavía no llega (3 nov 2026): dice qué va a
 * tener, en qué fase, y lleva a lo que hoy resuelve eso. Está en el menú desde
 * ya para que los permisos por persona existan antes que la pantalla.
 */
export function PaginaProxima({ titulo, subtitulo, fase, queTendra, mientras }: {
  titulo: string;
  subtitulo: string;
  fase: string;
  queTendra: string[];
  mientras?: { href: string; etiqueta: string };
}) {
  return (
    <div className="mx-auto max-w-5xl p-4 pb-12 sm:p-6 md:p-8">
      <EncabezadoPagina titulo={titulo} subtitulo={subtitulo} nueva />
      <EstadoVacio
        titulo={`Llega en la ${fase}`}
        texto={`Aquí va a estar: ${queTendra.join(" · ")}.`}
        accion={mientras}
      />
    </div>
  );
}
