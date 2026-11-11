import { ROTULO_TRADUCCION, type ResenaParaPagina } from "@/lib/i18n/resenasReales.en";

/**
 * Debajo de una reseña real traducida: el rótulo «Translated from Spanish» y el
 * texto literal de Google, con `lang="es"`, a un toque («See original»), igual
 * que hace Google Maps.
 *
 * Por qué (10 nov 2026): en las páginas en inglés las reseñas salían en
 * español sin avisar ni marcar el idioma. La traducción va rotulada como tal y
 * el original nunca se esconde del todo: quien quiera leer lo que de verdad
 * escribió la persona, lo tiene ahí.
 *
 * Si la reseña no está traducida (en español, o una sin traducción) no pinta
 * nada. Sin JavaScript: `<details>` nativo, sirve en páginas de servidor.
 * Colores pensados para fondo oscuro (las fichas, /paquetes y el viaje CDMX).
 */
export function ResenaOriginal({ r, className = "" }: { r: ResenaParaPagina; className?: string }) {
  if (!r.traducida) return null;
  return (
    <div className={className}>
      <p className="font-dm text-[10px] text-crema/40">{ROTULO_TRADUCCION.traducida}</p>
      <details className="mt-1 font-dm text-[11px] text-crema/50">
        <summary className="cursor-pointer text-verde-vivo/80 transition-colors hover:text-lima">
          {ROTULO_TRADUCCION.verOriginal}
        </summary>
        <p lang="es" className="mt-2 leading-relaxed">{r.original}</p>
      </details>
    </div>
  );
}
