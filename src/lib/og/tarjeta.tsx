import { ImageResponse } from "next/og";

/**
 * Las tarjetas de Open Graph (la imagen que sale al pegar un enlace en WhatsApp,
 * Twitter o Slack), armadas desde un solo sitio.
 *
 * Antes cada ruta tenía su `opengraph-image.tsx` con las mismas ~50 líneas de
 * estilos copiadas. Al montar las versiones en inglés eso habrían sido siete
 * copias más, y siete sitios donde el dorado o el tipo de letra se van
 * separando poco a poco. Aquí viven la paleta y la retícula; cada ruta solo
 * pone su texto.
 *
 * Por qué hacía falta la versión inglesa: /en/nosotros y /en/info-practica no
 * tenían NINGUNA imagen —definían `openGraph` sin `images`, lo que anula el
 * respaldo del layout, y la tarjeta generada vive en el segmento español, que
 * no se hereda—, así que compartirlas daba un recuadro vacío. Y donde sí había
 * imagen, hablaba español: /en/tours anunciaba "Guías Locales Certificados".
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

// OJO: `export const runtime` NO se puede importar de aquí. Next lo lee del
// código fuente ANTES de ejecutarlo, así que tiene que ser un literal en cada
// archivo (`export const runtime = "nodejs"`). Con una constante importada el
// dev server funciona y el build revienta con "Provided runtime OG_RUNTIME is
// not supported" — que es exactamente lo que pasó al montar esto.

const CREMA = "#f4edd8";
const DORADO = "#c4882a";
const VERDE_VIVO = "#4a8c1c";

/** Los degradados que ya usaban las tarjetas españolas, con nombre. */
export const FONDOS = {
  tours: "linear-gradient(135deg, #1a2e1a 0%, #2a4a1a 60%, #1a3a0e 100%)",
  destinos: "linear-gradient(140deg, #0e1e0e 0%, #1a3a0e 60%, #2a4a1a 100%)",
  equipo: "linear-gradient(160deg, #0e1e0e 0%, #1a3a0e 50%, #2a4a1a 100%)",
  practica: "linear-gradient(145deg, #1a2e1a 0%, #243a14 50%, #1a3a0e 100%)",
} as const;

interface Pie {
  /** Línea final en versalitas, tenue. */
  texto: string;
}

interface TarjetaProps {
  /** Línea superior, en versalitas verdes. */
  eyebrow: string;
  /** Título en serif claro. */
  titulo: string;
  /** Segunda línea, en cursiva dorada. */
  subtitulo: string;
  fondo: string;
  /** Etiquetas con borde. Excluyente con `cifras` e `iconos`. */
  pills?: string[];
  /** Pares [cifra, etiqueta], como los del equipo. */
  cifras?: [string, string][];
  /** Pares [emoji, etiqueta]. */
  iconos?: [string, string][];
  /** Renglón de estrellas + texto de reseñas. */
  estrellas?: string;
  pie?: Pie;
}

export function tarjetaOG(p: TarjetaProps) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: p.fondo,
          padding: "60px",
        }}
      >
        <p style={{ color: VERDE_VIVO, fontSize: "14px", letterSpacing: "5px", textTransform: "uppercase", margin: "0 0 20px", fontFamily: "sans-serif" }}>
          {p.eyebrow}
        </p>

        <h1 style={{ color: CREMA, fontSize: "62px", fontWeight: 300, textAlign: "center", margin: "0 0 10px", lineHeight: 1.1, fontFamily: "serif" }}>
          {p.titulo}
        </h1>
        <h2 style={{ color: DORADO, fontSize: "40px", fontWeight: 300, fontStyle: "italic", textAlign: "center", margin: "0 0 36px", lineHeight: 1.15, fontFamily: "serif" }}>
          {p.subtitulo}
        </h2>

        <div style={{ width: "60px", height: "1px", background: DORADO, margin: "0 0 36px" }} />

        {p.pills && (
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center" }}>
            {p.pills.map((t) => (
              <span
                key={t}
                style={{
                  border: "1px solid rgba(244,237,216,0.25)",
                  color: "rgba(244,237,216,0.85)",
                  fontSize: "14px",
                  padding: "7px 18px",
                  fontFamily: "sans-serif",
                  letterSpacing: "1px",
                }}
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {p.cifras && (
          <div style={{ display: "flex", gap: "40px", justifyContent: "center" }}>
            {p.cifras.map(([n, l]) => (
              <div key={l} style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "center" }}>
                <span style={{ color: DORADO, fontSize: "32px", fontFamily: "serif", fontWeight: 300 }}>{n}</span>
                <span style={{ color: "rgba(244,237,216,0.5)", fontSize: "12px", letterSpacing: "2px", textTransform: "uppercase", fontFamily: "sans-serif" }}>{l}</span>
              </div>
            ))}
          </div>
        )}

        {p.iconos && (
          <div style={{ display: "flex", gap: "32px", justifyContent: "center" }}>
            {p.iconos.map(([icon, label]) => (
              <div key={label} style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
                <span style={{ fontSize: "28px" }}>{icon}</span>
                <span style={{ color: "rgba(244,237,216,0.6)", fontSize: "13px", fontFamily: "sans-serif", letterSpacing: "1px" }}>{label}</span>
              </div>
            ))}
          </div>
        )}

        {p.estrellas && (
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "34px" }}>
            {/* Cinco puntos dorados, DIBUJADOS, no escritos.
                La tarjeta de /tours lleva desde su estreno enseñando "★★★★★" como
                cinco cajas vacías en producción: la fuente con la que `next/og`
                rasteriza no trae ese carácter, y los dingbats tampoco entran por
                el respaldo de emojis. Lo que se dibuja siempre se ve. */}
            <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} style={{ width: "10px", height: "10px", borderRadius: "50%", background: DORADO }} />
              ))}
            </div>
            <span style={{ color: "rgba(244,237,216,0.7)", fontSize: "15px", fontFamily: "sans-serif" }}>{p.estrellas}</span>
          </div>
        )}

        {p.pie && (
          <p style={{ color: "rgba(244,237,216,0.35)", fontSize: "13px", marginTop: "40px", letterSpacing: "2px", fontFamily: "sans-serif" }}>
            {p.pie.texto}
          </p>
        )}
      </div>
    ),
    OG_SIZE,
  );
}
