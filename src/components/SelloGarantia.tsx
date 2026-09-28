/**
 * El sello de la Garantía Huasteca.
 *
 * Sustituye a `TourEmblem`, que dibujaba EL LUGAR de cada tour (28 sep 2026).
 * Aquel existía para tres recorridos y no decía nada que la foto no dijera ya;
 * éste dice algo que la foto no puede decir: que este recorrido es de los que
 * la casa pone la mano al fuego.
 *
 * Va sólo en los tours marcados con `garantiaHuasteca` en el catálogo, no en
 * una lista de slugs suelta, para que encenderlo en otro sea una línea de datos
 * y no tocar tres archivos.
 *
 * Es el mismo cristal de `TourEmblem`: el `backdrop-blur` vive en el div que
 * envuelve al SVG, porque un SVG no puede desenfocar lo que tiene detrás. Así
 * el sello toma el color de la foto sobre la que cae y no se ve pegado encima.
 */
export function SelloGarantia({
  size = 68,
  idSuffix = "",
  className = "",
}: {
  size?: number;
  idSuffix?: string;
  className?: string;
}) {
  const id = `garantia${idSuffix}`;
  const ORO = "#c4882a";
  const CLARO = "#f4edd8";

  return (
    <div
      className={`rounded-full backdrop-blur-md ${className}`}
      style={{
        width: size,
        height: size,
        background:
          "radial-gradient(120% 120% at 30% 15%, rgba(255,255,255,.16), rgba(14,23,16,.62) 60%)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,.35), inset 0 0 0 1px rgba(196,136,42,.45), 0 8px 24px rgba(0,0,0,.45)",
      }}
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        role="img"
        aria-label="Garantía Huasteca"
      >
        {/* Aro interior: le da canto de sello y separa el texto del centro. */}
        <circle cx="50" cy="50" r="38" fill="none" stroke={ORO} strokeWidth=".8" opacity=".55" />

        {/* El nombre, curvado sobre el arco de arriba. */}
        <path id={id} d="M 16 54 A 34 34 0 0 1 84 54" fill="none" />
        <text
          fill={CLARO}
          fontSize="8.5"
          letterSpacing="1.4"
          fontFamily="var(--font-dm-sans), sans-serif"
          opacity=".95"
        >
          <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">
            GARANTÍA
          </textPath>
        </text>

        {/* La palomita: el gesto más corto para «esto responde». */}
        <path
          d="M 40 50.5 l 6.5 7 L 61 43"
          fill="none"
          stroke={ORO}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Y la marca abajo, en recto: curvarla también la dejaba ilegible a
            este tamaño. */}
        <text
          x="50"
          y="72"
          textAnchor="middle"
          fill={ORO}
          fontSize="8"
          letterSpacing="1.2"
          fontFamily="var(--font-dm-sans), sans-serif"
          opacity=".95"
        >
          HUASTECA
        </text>
      </svg>
    </div>
  );
}
