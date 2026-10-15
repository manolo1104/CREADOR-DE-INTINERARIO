import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import { join } from "path";

// La tarjeta para compartir y para los anuncios. 🔴 Sin precio ni lugares:
// Facebook guarda la imagen días, y una cifra vieja ahí sería urgencia falsa.
export const runtime = "nodejs";
export const alt = "Viaje a Xilitla desde CDMX: salida grupal cada mes";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const foto = await readFile(join(process.cwd(), "public/imagenes/tours/tamul/canoa-tamul-al-fondo.jpg"));
  const src = `data:image/jpeg;base64,${foto.toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#0e1710" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" width={760} height={630} style={{ position: "absolute", top: 0, left: 0, width: "760px", height: "630px", objectFit: "cover", objectPosition: "50% 50%" }} />
        <div style={{ position: "absolute", top: 0, left: "560px", width: "200px", height: "630px", display: "flex", background: "linear-gradient(90deg, rgba(14,23,16,0) 0%, rgba(14,23,16,1) 100%)" }} />
        <div style={{ position: "absolute", top: 0, right: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 56px 0 0", width: "500px", height: "630px" }}>
          <p style={{ color: "#4a8c1c", fontSize: 20, letterSpacing: 5, textTransform: "uppercase", margin: "0 0 18px", fontFamily: "sans-serif" }}>
            Salida grupal cada mes
          </p>
          <h1 style={{ color: "#f4edd8", fontSize: 64, fontWeight: 300, lineHeight: 1.02, margin: "0 0 12px", fontFamily: "serif" }}>
            Xilitla desde CDMX
          </h1>
          <h2 style={{ color: "#c4882a", fontSize: 36, fontStyle: "italic", fontWeight: 300, margin: "0 0 34px", fontFamily: "serif" }}>
            Todo incluido · 3 días
          </h2>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {["Transporte redondo", "2 noches de hotel", "3 desayunos", "Tamul y Las Pozas"].map((t) => (
              <span key={t} style={{ border: "1px solid rgba(244,237,216,0.35)", color: "rgba(244,237,216,0.9)", fontSize: 18, padding: "8px 18px", fontFamily: "sans-serif" }}>
                {t}
              </span>
            ))}
          </div>
          <p style={{ color: "rgba(244,237,216,0.55)", fontSize: 18, letterSpacing: 3, textTransform: "uppercase", margin: "40px 0 0", fontFamily: "sans-serif" }}>
            Tours Huasteca Potosina
          </p>
        </div>
      </div>
    ),
    { ...size },
  );
}
