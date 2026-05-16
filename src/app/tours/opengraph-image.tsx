import { ImageResponse } from "next/og";

export const runtime     = "nodejs";
export const alt         = "Tours Guiados Huasteca Potosina — Transporte, Desayuno & Guía Certificado";
export const size        = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%", height: "100%", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "linear-gradient(135deg, #1a2e1a 0%, #2a4a1a 60%, #1a3a0e 100%)",
        padding: "60px",
      }}
    >
      {/* Top label */}
      <p style={{ color: "#4a8c1c", fontSize: "15px", letterSpacing: "5px", textTransform: "uppercase", margin: "0 0 24px", fontFamily: "sans-serif" }}>
        ✦ San Luis Potosí · México ✦
      </p>

      {/* Main title */}
      <h1 style={{ color: "#f4edd8", fontSize: "68px", fontWeight: 300, textAlign: "center", margin: "0 0 12px", lineHeight: 1.1, fontFamily: "serif" }}>
        Tours Huasteca
      </h1>
      <h2 style={{ color: "#c4882a", fontSize: "48px", fontWeight: 300, fontStyle: "italic", textAlign: "center", margin: "0 0 40px", fontFamily: "serif" }}>
        Potosina
      </h2>

      {/* Divider */}
      <div style={{ width: "80px", height: "1px", background: "#c4882a", margin: "0 0 40px" }} />

      {/* Pills */}
      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", justifyContent: "center" }}>
        {["Transporte incluido", "Desayuno típico", "Guías NOM-09", "Máx. 12 personas"].map((t) => (
          <span key={t} style={{
            border: "1px solid rgba(244,237,216,0.25)", color: "#f4edd8", fontSize: "14px",
            padding: "8px 20px", fontFamily: "sans-serif", letterSpacing: "1px",
          }}>{t}</span>
        ))}
      </div>

      {/* Stars */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "36px" }}>
        <span style={{ color: "#c4882a", fontSize: "20px" }}>★★★★★</span>
        <span style={{ color: "rgba(244,237,216,0.7)", fontSize: "15px", fontFamily: "sans-serif" }}>
          4.9 · 492 reseñas · Mejor Tour Operador Norteamérica
        </span>
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}
