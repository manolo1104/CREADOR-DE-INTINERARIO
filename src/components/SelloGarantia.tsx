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
 * 🔴 En el centro NO hay una palomita. La primera versión llevaba una, de
 * trazo grueso, y era lo más ruidoso del sello: la palomita es el icono de
 * «verificado», el mismo de un candado de pago o de una cuenta de red social.
 * Dice trámite, no emoción, y encima es lo primero que la vista descarta por
 * visto mil veces. En su lugar va una cascada de línea fina: es lo que estos
 * dos recorridos SON —Tamul y el Meco— y lo que la región es. Emociona sin
 * levantar la voz porque no anuncia nada; sólo está.
 *
 * El resto es lenguaje de sello de verdad: dos aros finos, el texto curvado en
 * la banda entre ellos, y dos rombos pequeños separando arriba de abajo. Todo
 * en trazo delgado: un sello se gana, no se grita.
 */
export function SelloGarantia({
  size = 68,
  idSuffix = "",
  className = "",
  variante = "sobre-foto",
}: {
  size?: number;
  idSuffix?: string;
  className?: string;
  /**
   * `sobre-foto`: cristal y sombra, para que se despegue de la imagen.
   * `plano`: sin sombra ni desenfoque, para cuando cae sobre un fondo liso —
   * ahí el cristal no tiene nada que desenfocar y sólo se ve como un pegote.
   */
  variante?: "sobre-foto" | "plano";
}) {
  const plano = variante === "plano";
  const arriba = `garantia-arr${idSuffix}`;
  const abajo = `garantia-aba${idSuffix}`;
  const ORO = "#c4882a";
  const CLARO = "#f4edd8";

  return (
    <div
      className={`rounded-full ${plano ? "" : "backdrop-blur-md"} ${className}`}
      style={{
        width: size,
        height: size,
        background: plano
          ? "transparent"
          : "radial-gradient(120% 120% at 30% 15%, rgba(255,255,255,.14), rgba(14,23,16,.58) 60%)",
        boxShadow: plano
          ? "none"
          : "inset 0 1px 0 rgba(255,255,255,.28), 0 8px 24px rgba(0,0,0,.45)",
      }}
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        role="img"
        aria-label="Garantía Huasteca"
      >
        {/* Los dos aros del sello. El de fuera marca el canto; el de dentro
            cierra la banda del texto y enmarca la cascada. */}
        <circle cx="50" cy="50" r="47" fill="none" stroke={ORO} strokeWidth=".9" opacity=".55" />
        <circle cx="50" cy="50" r="35" fill="none" stroke={ORO} strokeWidth=".6" opacity=".3" />

        {/* ── La cascada ────────────────────────────────────────────────
            Tres caídas y dos ondas. Nada más: a 62 px cualquier detalle de
            más se convierte en una mancha. */}
        <g
          fill="none"
          stroke={CLARO}
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity=".92"
        >
          <path d="M 44.6 32.5 C 44 41 43.6 49 43.6 56.5" />
          <path d="M 50 30.5 C 50 41 50 50 50 58.5" />
          <path d="M 55.4 32.5 C 56 41 56.4 49 56.4 56.5" />
        </g>
        <g fill="none" stroke={ORO} strokeWidth="1.3" strokeLinecap="round" opacity=".8">
          <path d="M 37.5 63.5 q 6.2 -3.2 12.5 0 t 12.5 0" />
          <path d="M 41.5 69 q 4.3 -2.4 8.5 0 t 8.5 0" />
        </g>

        {/* GARANTÍA arriba y HUASTECA abajo, las dos curvadas: con una recta y
            otra curva el sello se veía improvisado. */}
        <path id={arriba} d="M 11 50 A 39 39 0 0 1 89 50" fill="none" />
        <path id={abajo} d="M 12 50 A 38 38 0 0 0 88 50" fill="none" />
        <g fill={CLARO} fontFamily="var(--font-dm-sans), sans-serif" opacity=".95">
          <text fontSize="8" letterSpacing="2.2">
            <textPath href={`#${arriba}`} startOffset="50%" textAnchor="middle">
              GARANTÍA
            </textPath>
          </text>
          <text fontSize="8" letterSpacing="2.2">
            <textPath href={`#${abajo}`} startOffset="50%" textAnchor="middle">
              HUASTECA
            </textPath>
          </text>
        </g>

        {/* Los dos rombos que separan arriba de abajo. Es el detalle que hace
            que un círculo con letras se lea como un sello. */}
        <g fill={ORO} opacity=".7">
          <rect x="9" y="48.4" width="3.2" height="3.2" transform="rotate(45 10.6 50)" />
          <rect x="87.8" y="48.4" width="3.2" height="3.2" transform="rotate(45 89.4 50)" />
        </g>
      </svg>
    </div>
  );
}
