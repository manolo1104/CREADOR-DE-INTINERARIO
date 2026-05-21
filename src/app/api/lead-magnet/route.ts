import { NextResponse } from "next/server";
import { sendBrevoEmail } from "@/lib/brevo";
import { google } from "googleapis";
import fs from "fs";
import path from "path";

const SHEET_ID  = process.env.GOOGLE_SHEETS_ID!;
const SHEET_TAB = "Leads";

async function getSheetsClient() {
  const rawKey = process.env.GOOGLE_PRIVATE_KEY ?? "";
  const key = rawKey
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/-----BEGIN PRIVATE KEY-----\s*/g, "-----BEGIN PRIVATE KEY-----\n")
    .replace(/\s*-----END PRIVATE KEY-----/g,   "\n-----END PRIVATE KEY-----");

  const auth = new google.auth.GoogleAuth({
    credentials: {
      type: "service_account",
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: key,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

function buildGuideHtml(email: string, name?: string): string {
  const greeting = name ? `Hola ${name},` : "Hola,";
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Tu Guía Completa — Huasteca Potosina</title>
<style>
  body { font-family: 'DM Sans', Arial, sans-serif; background:#f4edd8; margin:0; padding:0; color:#1a2e1a; }
  .wrap { max-width:620px; margin:0 auto; background:#fff; }
  .hero { background:#1a3a0e; padding:40px 32px 32px; text-align:center; }
  .hero h1 { color:#f4edd8; font-family:Georgia,serif; font-size:32px; font-weight:300; margin:0 0 8px; }
  .hero p  { color:rgba(244,237,216,0.65); font-size:14px; margin:0; }
  .section { padding:28px 32px; border-bottom:1px solid #e8e0cc; }
  .section h2 { font-family:Georgia,serif; font-size:22px; font-weight:300; color:#1a3a0e; margin:0 0 12px; }
  .item { display:flex; gap:12px; margin:10px 0; }
  .dot  { color:#4a8c1c; font-weight:bold; flex-shrink:0; margin-top:1px; }
  p,li  { font-size:14px; line-height:1.7; color:#444; margin:0; }
  .cta  { background:#3a6b1a; color:#fff; text-decoration:none; display:inline-block; padding:14px 32px; font-size:12px; letter-spacing:2px; text-transform:uppercase; margin:8px 0; }
  .footer { background:#1a3a0e; padding:24px 32px; text-align:center; color:rgba(244,237,216,0.5); font-size:12px; }
  table.budget { width:100%; border-collapse:collapse; }
  table.budget td { padding:8px 10px; border-bottom:1px solid #e8e0cc; font-size:13px; }
  table.budget tr:first-child td { background:#f4edd8; font-weight:600; font-size:11px; text-transform:uppercase; letter-spacing:1px; }
  .badge { display:inline-block; background:#f4edd8; border:1px solid #c8b882; color:#8a6f1e; font-size:11px; padding:4px 10px; margin:3px 2px; border-radius:20px; }
  .timeline-item { padding-left:20px; border-left:2px solid #4a8c1c; margin:10px 0; }
  .timeline-item span { color:#8a6f1e; font-size:12px; font-weight:600; display:block; margin-bottom:4px; }
</style>
</head>
<body>
<div class="wrap">

  <div class="hero">
    <p style="color:#4a8c1c;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin-bottom:12px;">✦ Huasteca Potosina · México ✦</p>
    <h1>Los 5 Mejores Días para Visitar la Huasteca en 2026</h1>
    <p>${greeting} Tu guía con itinerarios, precios y consejos locales.</p>
  </div>

  <div class="section">
    <h2>Cómo llegar</h2>
    <div class="item"><span class="dot">→</span><p><strong>En avión:</strong> Aeropuerto más cercano: San Luis Potosí (SLP) — 3.5h en coche. Alternativa: Tampico — 2h en coche.</p></div>
    <div class="item"><span class="dot">→</span><p><strong>En autobús:</strong> ADO GL desde CDMX Terminal Norte → Ciudad Valles: ~8 horas, $600–900 MXN.</p></div>
    <div class="item"><span class="dot">→</span><p><strong>En coche:</strong> Desde CDMX: 430 km por MEX-85/MEX-70 ≈ 5.5h. Desde Monterrey: 340 km ≈ 4h.</p></div>
    <div class="item"><span class="dot">💡</span><p>Si van en grupo de 4+, rentar auto en Valles sale más barato que taxis y da total libertad de horarios.</p></div>
  </div>

  <div class="section">
    <h2>Los 5 Mejores Días (2026)</h2>
    <div class="timeline-item"><span>Día 1 — Llegada y Xilitla</span><p>Las Pozas de Edward James al atardecer. Cena en el mercado local. Hotel boutique en el pueblo mágico.</p></div>
    <div class="timeline-item"><span>Día 2 — Cascada Tamul</span><p>El recorrido en canoa por el Río Gallinas. Mejor entre noviembre y marzo — agua turquesa garantizada.</p></div>
    <div class="timeline-item"><span>Día 3 — Sótano de las Golondrinas</span><p>Llegada a las 6 am para ver el vuelo de miles de vencejos. El espectáculo más impresionante de la región.</p></div>
    <div class="timeline-item"><span>Día 4 — Cascadas de Micos y Tamasopo</span><p>Tour de cascadas en un solo día. Llevar aqua shoes, la corriente es fuerte y vale la pena nadar.</p></div>
    <div class="timeline-item"><span>Día 5 — Puente de Dios y regreso</span><p>La luz perfecta entra entre 11 y 13 horas. Último baño y vuelta a casa con recuerdos para siempre.</p></div>
  </div>

  <div class="section">
    <h2>Presupuesto diario estimado</h2>
    <table class="budget">
      <tr><td>Nivel</td><td>Rango</td><td>Qué incluye</td></tr>
      <tr><td>Económico</td><td>$400–600 MXN</td><td>Hostal, mercado, combis</td></tr>
      <tr><td>Moderado</td><td>$800–1,500 MXN</td><td>Hotel 3★, restaurantes, tour</td></tr>
      <tr><td>Premium</td><td>$1,500+ MXN</td><td>Boutique, gourmet, tour privado</td></tr>
    </table>
    <p style="margin-top:12px;color:#666;"><strong>Importante:</strong> Llevar siempre efectivo — muchos destinos solo aceptan cash. Cajeros en Ciudad Valles (BBVA, Banamex, HSBC).</p>
  </div>

  <div class="section">
    <h2>Qué llevar — Checklist</h2>
    <span class="badge">Aqua shoes</span><span class="badge">Ropa dry-fit</span><span class="badge">Bloqueador biodegradable</span>
    <span class="badge">Repelente biodegradable</span><span class="badge">Powerbank</span><span class="badge">Funda impermeable cel</span>
    <span class="badge">Efectivo en pesos</span><span class="badge">Botiquín básico</span><span class="badge">Chamarra ligera (Sótano)</span>
    <span class="badge">Botella reutilizable</span><span class="badge">Toalla microfibra</span><span class="badge">Sandalias para hotel</span>
  </div>

  <div class="section" style="text-align:center;background:#f4edd8;">
    <h2 style="margin-bottom:8px;">¿Listo para reservar?</h2>
    <p style="margin-bottom:20px;color:#666;">Nuestro equipo responde en menos de 1 hora, todos los días.</p>
    <a href="https://www.huasteca-potosina.com/tours" class="cta">Ver todos los tours →</a>
    <br>
    <a href="https://wa.me/524891251458?text=Hola%2C%20recibi%20la%20guia%20PDF%20y%20quiero%20reservar%20un%20tour"
       style="display:inline-block;margin-top:12px;color:#25D366;font-size:13px;text-decoration:none;">
      💬 Preguntar por WhatsApp →
    </a>
  </div>

  <div class="footer">
    <p>Tours Huasteca Potosina · Xilitla, San Luis Potosí, México</p>
    <p style="margin-top:6px;"><a href="https://www.huasteca-potosina.com" style="color:#4a8c1c;">www.huasteca-potosina.com</a></p>
    <p style="margin-top:12px;font-size:11px;">Recibiste este email porque solicitaste nuestra guía en <a href="https://www.huasteca-potosina.com" style="color:#4a8c1c;">huasteca-potosina.com</a>.</p>
  </div>

</div>
</body>
</html>`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, name, fuente } = body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }

    // 1 — Guardar en Google Sheets (no-fatal)
    try {
      const sheets = await getSheetsClient();
      const fecha  = new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" });
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range:         `${SHEET_TAB}!A:D`,
        valueInputOption: "USER_ENTERED",
        requestBody:   { values: [[email, name || "", fecha, fuente || "Guía PDF"]] },
      });
    } catch (err) {
      console.warn("[lead-magnet] sheets write failed (non-fatal):", err);
    }

    // 2 — Enviar email via Brevo con PDF adjunto
    try {
      const pdfPath = path.join(process.cwd(), "public", "guia-huasteca-potosina.pdf");
      const pdfBase64 = fs.readFileSync(pdfPath).toString("base64");

      await sendBrevoEmail({
        to:          [{ email, name: name || undefined }],
        subject:     "Tu Guía de Viaje — Los 5 Mejores Días en la Huasteca Potosina 🌿",
        htmlContent: buildGuideHtml(email, name),
        attachments: [{ name: "Guia-Huasteca-Potosina.pdf", content: pdfBase64 }],
      });
    } catch (err: any) {
      console.error("[lead-magnet] Brevo error:", err.message);
      return NextResponse.json({ error: "Error al enviar email" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[lead-magnet]", err);
    return NextResponse.json({ error: "Error al procesar" }, { status: 500 });
  }
}
