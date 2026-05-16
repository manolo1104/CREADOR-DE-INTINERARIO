import { ImageResponse } from "next/og";

export const runtime     = "nodejs";
export const alt         = "Quiénes Somos — Guías Locales Certificados NOM-09 | Tours Huasteca Potosina";
export const size        = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%", height: "100%", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "linear-gradient(160deg, #0e1e0e 0%, #1a3a0e 50%, #2a4a1a 100%)",
        padding: "60px",
      }}
    >
      <p style={{ color: "#4a8c1c", fontSize: "14px", letterSpacing: "5px", textTransform: "uppercase", margin: "0 0 20px", fontFamily: "sans-serif" }}>
        Empresa familiar desde 2019
      </p>

      <h1 style={{ color: "#f4edd8", fontSize: "62px", fontWeight: 300, textAlign: "center", margin: "0 0 10px", lineHeight: 1.1, fontFamily: "serif" }}>
        Guías Locales
      </h1>
      <h2 style={{ color: "#c4882a", fontSize: "44px", fontWeight: 300, fontStyle: "italic", textAlign: "center", margin: "0 0 36px", fontFamily: "serif" }}>
        Certificados NOM-09
      </h2>

      <div style={{ width: "60px", height: "1px", background: "#c4882a", margin: "0 0 36px" }} />

      <div style={{ display: "flex", gap: "40px", justifyContent: "center" }}>
        {[["4.9★", "Google"], ["492", "Reseñas"], ["6+", "Años"], ["0", "Incidentes"]].map(([n, l]) => (
          <div key={l} style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ color: "#c4882a", fontSize: "32px", fontFamily: "serif", fontWeight: 300 }}>{n}</span>
            <span style={{ color: "rgba(244,237,216,0.5)", fontSize: "12px", letterSpacing: "2px", textTransform: "uppercase", fontFamily: "sans-serif" }}>{l}</span>
          </div>
        ))}
      </div>

      <p style={{ color: "rgba(244,237,216,0.4)", fontSize: "13px", marginTop: "36px", letterSpacing: "2px", fontFamily: "sans-serif" }}>
        TOURS HUASTECA POTOSINA · XILITLA, SAN LUIS POTOSÍ
      </p>
    </div>,
    { width: 1200, height: 630 },
  );
}
