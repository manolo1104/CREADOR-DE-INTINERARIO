import { ImageResponse } from "next/og";

export const runtime     = "nodejs";
export const alt         = "Info Práctica — Cómo Llegar, Cuándo ir y Dónde Quedarse | Huasteca Potosina";
export const size        = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%", height: "100%", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "linear-gradient(145deg, #1a2e1a 0%, #243a14 50%, #1a3a0e 100%)",
        padding: "60px",
      }}
    >
      <p style={{ color: "#4a8c1c", fontSize: "14px", letterSpacing: "5px", textTransform: "uppercase", margin: "0 0 20px", fontFamily: "sans-serif" }}>
        Todo lo que necesitas antes de viajar
      </p>

      <h1 style={{ color: "#f4edd8", fontSize: "60px", fontWeight: 300, textAlign: "center", margin: "0 0 10px", lineHeight: 1.1, fontFamily: "serif" }}>
        Guía Práctica
      </h1>
      <h2 style={{ color: "#c4882a", fontSize: "36px", fontWeight: 300, fontStyle: "italic", textAlign: "center", margin: "0 0 36px", fontFamily: "serif" }}>
        Huasteca Potosina 2026
      </h2>

      <div style={{ width: "60px", height: "1px", background: "#c4882a", margin: "0 0 36px" }} />

      <div style={{ display: "flex", gap: "32px", justifyContent: "center" }}>
        {[["✈", "Cómo llegar"], ["📅", "Cuándo ir"], ["🏨", "Hospedaje"], ["💰", "Presupuesto"]].map(([icon, label]) => (
          <div key={label} style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
            <span style={{ fontSize: "28px" }}>{icon}</span>
            <span style={{ color: "rgba(244,237,216,0.6)", fontSize: "13px", fontFamily: "sans-serif", letterSpacing: "1px" }}>{label}</span>
          </div>
        ))}
      </div>

      <p style={{ color: "rgba(244,237,216,0.35)", fontSize: "13px", marginTop: "44px", letterSpacing: "2px", fontFamily: "sans-serif" }}>
        TOURS HUASTECA POTOSINA · GUÍA GRATUITA
      </p>
    </div>,
    { width: 1200, height: 630 },
  );
}
