import { ImageResponse } from "next/og";
import { DESTINOS_DB } from "@/lib/destinos";

export const runtime     = "nodejs";
export const alt         = "Experiencias en la Huasteca Potosina — Cascadas, Aventura y Cultura";
export const size        = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%", height: "100%", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "linear-gradient(145deg, #0e1e0e 0%, #1a3a0e 55%, #2a4a1a 100%)",
        padding: "60px",
      }}
    >
      <p style={{ color: "#4a8c1c", fontSize: "14px", letterSpacing: "5px", textTransform: "uppercase", margin: "0 0 20px", fontFamily: "sans-serif" }}>
        San Luis Potosí · México
      </p>

      <h1 style={{ color: "#f4edd8", fontSize: "62px", fontWeight: 300, textAlign: "center", margin: "0 0 10px", lineHeight: 1.1, fontFamily: "serif" }}>
        Experiencias
      </h1>
      <h2 style={{ color: "#c4882a", fontSize: "40px", fontWeight: 300, fontStyle: "italic", textAlign: "center", margin: "0 0 36px", fontFamily: "serif" }}>
        Huasteca Potosina
      </h2>

      <div style={{ width: "60px", height: "1px", background: "#c4882a", margin: "0 0 36px" }} />

      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center" }}>
        {["Cascadas turquesas", "Aventura extrema", "Arte & Cultura", "Naturaleza & Bienestar"].map((t) => (
          <span key={t} style={{
            border: "1px solid rgba(244,237,216,0.2)", color: "rgba(244,237,216,0.7)", fontSize: "14px",
            padding: "6px 18px", fontFamily: "sans-serif", letterSpacing: "1px",
          }}>{t}</span>
        ))}
      </div>

      <p style={{ color: "rgba(244,237,216,0.35)", fontSize: "13px", marginTop: "40px", letterSpacing: "2px", fontFamily: "sans-serif" }}>
        {DESTINOS_DB.length} DESTINOS · HUASTECA-POTOSINA.COM
      </p>
    </div>,
    { width: 1200, height: 630 },
  );
}
