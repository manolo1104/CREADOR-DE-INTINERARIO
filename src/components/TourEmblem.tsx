import type { TourCategoria } from "@/lib/tours";

/**
 * El sello de cada tour: un emblema circular que dibuja EL LUGAR, no la marca.
 *
 * No hay generación de imágenes en este equipo (Higgsfield sin créditos, sin
 * clave de Gemini), y para una marca de 90 px sobre una foto un SVG es mejor
 * que un PNG de todas formas: escala sin pesar, hereda el color del tema y no
 * añade una petición de red.
 *
 * El disco es cristal de verdad: el `backdrop-blur` va en el div que envuelve
 * al SVG, porque un SVG no puede desenfocar lo que tiene detrás. Así el sello
 * toma el color de la foto sobre la que cae y no se ve pegado encima.
 *
 * El color lo pone la CATEGORÍA: de un vistazo se sabe si el tour es tranquilo,
 * mojado o de adrenalina.
 */

const TINTA: Record<TourCategoria, { aro: string; luz: string; masa: string; agua: string }> = {
  ecoturismo: { aro: "#8fbe3a", luz: "#f4edd8", masa: "#2f5a18", agua: "#7fb8c9" },
  aventura:   { aro: "#5cb6d6", luz: "#f4edd8", masa: "#17414f", agua: "#8fd4e8" },
  extremo:    { aro: "#d99a3c", luz: "#f4edd8", masa: "#6b3314", agua: "#e0b877" },
};

type Tinta = (typeof TINTA)[TourCategoria];

/** Cada escena vive en el círculo útil: centro (50,44), radio ~25. */
const ESCENAS: Record<string, { leyenda: string; dibujo: (c: Tinta) => React.ReactNode }> = {
  "expedicion-tamul": {
    leyenda: "Cascada de Tamul",
    dibujo: (c) => (
      <>
        {/* Paredes del cañón */}
        <path d="M18 66 V30 l8 -8 6 10 3 34 Z" fill={c.masa} />
        <path d="M82 66 V30 l-8 -8 -6 10 -3 34 Z" fill={c.masa} />
        <path d="M18 66 V30 l8 -8 6 10 3 34 Z" fill={c.luz} opacity=".07" />
        {/* La caída */}
        <path d="M40 22 h20 v26 q-10 7 -20 0 Z" fill={c.agua} opacity=".95" />
        <path d="M44 22 v27 M50 22 v28 M56 22 v27" stroke={c.luz} strokeWidth=".9" opacity=".5" />
        {/* Poza y espuma */}
        <path d="M32 52 q18 12 36 0 v14 H32 Z" fill={c.agua} opacity=".5" />
        <path d="M36 55 q14 8 28 0" stroke={c.luz} strokeWidth="1" fill="none" opacity=".55" />
        {/* Canoa */}
        <path d="M38 62 q12 6 24 0 q-12 4 -24 0 Z" fill={c.luz} />
        <path d="M44 61 v-6 M50 60 v-7 M56 61 v-6" stroke={c.luz} strokeWidth="1.2" opacity=".8" />
      </>
    ),
  },
  "cascadas-del-meco": {
    leyenda: "Cascadas del Meco",
    dibujo: (c) => (
      <>
        {/* Cornisa */}
        <path d="M20 28 q14 -7 30 -2 q16 -5 30 2 v5 H20 Z" fill={c.masa} />
        {/* Cortina en tres saltos */}
        <path d="M24 33 h52 v18 q0 8 -9 8 H33 q-9 0 -9 -8 Z" fill={c.agua} opacity=".92" />
        <path d="M34 33 v26 M50 33 v27 M66 33 v26" stroke={c.luz} strokeWidth=".9" opacity=".45" />
        <path d="M24 42 q26 6 52 0" stroke={c.luz} strokeWidth=".8" fill="none" opacity=".35" />
        {/* Poza */}
        <ellipse cx="50" cy="62" rx="26" ry="7" fill={c.agua} opacity=".55" />
        <path d="M30 62 q20 6 40 0" stroke={c.luz} strokeWidth="1.1" fill="none" opacity=".6" />
        <path d="M36 67 q14 4 28 0" stroke={c.luz} strokeWidth=".9" fill="none" opacity=".4" />
        {/* Selva a los lados */}
        <path d="M16 34 q6 -10 12 -2 q-6 -3 -12 2 Z M84 34 q-6 -10 -12 -2 q6 -3 12 2 Z" fill={c.aro} opacity=".8" />
      </>
    ),
  },
  "ruta-surrealista-edward-james": {
    leyenda: "Las Pozas de Xilitla",
    dibujo: (c) => (
      <>
        {/* Torre corta, con capitel de flor */}
        <path d="M27 66 V38 h11 v28 Z" fill={c.masa} />
        <path d="M25 38 h15 l-3 -5 H28 Z" fill={c.aro} opacity=".95" />
        <path d="M29 33 v-5 M32.5 31 v-7 M36 33 v-5" stroke={c.aro} strokeWidth="1.6" />
        <path d="M27 46 h11 M27 54 h11" stroke={c.luz} strokeWidth=".8" opacity=".35" />
        {/* Torre alta */}
        <path d="M62 66 V30 h10 v36 Z" fill={c.masa} />
        <path d="M59 30 h16 l-4 -6 h-8 Z" fill={c.aro} opacity=".95" />
        <path d="M63 24 v-6 M67 22 v-8 M71 24 v-6" stroke={c.aro} strokeWidth="1.6" />
        <path d="M62 40 h10 M62 50 h10 M62 60 h10" stroke={c.luz} strokeWidth=".8" opacity=".35" />
        {/* La escalera que no lleva a ningún lado */}
        <path d="M44 66 V54 h4 v-4 h4 v-4 h4 v-4 h3" stroke={c.luz} strokeWidth="1.9" fill="none" strokeLinejoin="round" />
        {/* Agua al pie */}
        <path d="M20 68 q30 8 60 0 v6 H20 Z" fill={c.agua} opacity=".5" />
        <path d="M26 70 q24 5 48 0" stroke={c.luz} strokeWidth=".9" fill="none" opacity=".5" />
      </>
    ),
  },
};

export function TourEmblem({
  slug,
  categoria,
  size = 92,
  idSuffix = "",
  className = "",
}: {
  slug: string;
  categoria: TourCategoria;
  size?: number;
  idSuffix?: string;
  className?: string;
}) {
  const escena = ESCENAS[slug];
  if (!escena) return null;
  const c = TINTA[categoria];
  const id = `emblema-${slug}${idSuffix}`;

  return (
    <div
      className={`rounded-full backdrop-blur-md ${className}`}
      style={{
        width: size,
        height: size,
        // Cristal: una capa muy tenue del color de la categoría, el filo claro
        // arriba (de donde viene la luz) y una sombra interior que le da canto.
        background: `radial-gradient(120% 120% at 30% 15%, rgba(255,255,255,.16), rgba(14,23,16,.55) 60%)`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,.35), inset 0 0 0 1px ${c.aro}55, 0 8px 24px rgba(0,0,0,.45)`,
      }}
    >
      <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={escena.leyenda}>
        <clipPath id={`${id}-clip`}>
          <circle cx="50" cy="50" r="34" />
        </clipPath>
        <g clipPath={`url(#${id}-clip)`} opacity=".95">
          {escena.dibujo(c)}
        </g>

        {/* Aro interior: separa el dibujo del texto */}
        <circle cx="50" cy="50" r="34.5" fill="none" stroke={c.aro} strokeWidth=".8" opacity=".5" />

        {/* El nombre del lugar, curvado por fuera del dibujo */}
        <path id={id} d="M 9 50 A 41 41 0 0 0 91 50" fill="none" />
        <text
          fill={c.luz}
          fontSize="7"
          letterSpacing="1.7"
          fontFamily="var(--font-dm-sans), sans-serif"
          opacity=".95"
        >
          <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">
            {escena.leyenda.toUpperCase()}
          </textPath>
        </text>
      </svg>
    </div>
  );
}
