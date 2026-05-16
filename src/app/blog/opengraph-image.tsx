import { ImageResponse } from "next/og";

export const runtime     = "nodejs";
export const alt         = "Blog Huasteca Potosina — Guías de Viaje, Rutas e Itinerarios 2026";
export const size        = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%", height: "100%", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "linear-gradient(150deg, #1a2e1a 0%, #1a3a0e 40%, #0e1e0e 100%)",
        padding: "60px",
      }}
    >
      <p style={{ color: "#4a8c1c", fontSize: "14px", letterSpacing: "5px", textTransform: "uppercase", margin: "0 0 20px", fontFamily: "sans-serif" }}>
        Guías escritas por expertos locales
      </p>

      <h1 style={{ color: "#f4edd8", fontSize: "62px", fontWeight: 300, textAlign: "center", margin: "0 0 10px", lineHeight: 1.1, fontFamily: "serif" }}>
        Blog Huasteca
      </h1>
      <h2 style={{ color: "#c4882a", fontSize: "44px", fontWeight: 300, fontStyle: "italic", textAlign: "center", margin: "0 0 36px", fontFamily: "serif" }}>
        Potosina 2026
      </h2>

      <div style={{ width: "60px", height: "1px", background: "#c4882a", margin: "0 0 36px" }} />

      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center" }}>
        {["Itinerarios día a día", "Mejores épocas", "Precios actualizados", "Consejos locales"].map((t) => (
          <span key={t} style={{
            border: "1px solid rgba(196,136,42,0.4)", color: "#c4882a", fontSize: "14px",
            padding: "6px 18px", fontFamily: "sans-serif", letterSpacing: "1px",
          }}>{t}</span>
        ))}
      </div>

      <p style={{ color: "rgba(244,237,216,0.35)", fontSize: "13px", marginTop: "40px", letterSpacing: "2px", fontFamily: "sans-serif" }}>
        HUASTECA-POTOSINA.COM
      </p>
    </div>,
    { width: 1200, height: 630 },
  );
}
