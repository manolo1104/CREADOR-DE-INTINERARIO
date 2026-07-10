import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { rateLimit } from "@/lib/rateLimit";
import { actividad } from "@/lib/logger";

const SHEET_ID  = process.env.GOOGLE_SHEETS_ID!;
const SHEET_TAB = "Leads"; // nombre de la pestaña en tu Sheet

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


export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { key: "guardar-email", limit: 5, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const { email, fuente } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }

    const fuenteTxt =
      typeof fuente === "string" && fuente.trim()
        ? fuente.trim().slice(0, 40)
        : "Planificador IA";

    const sheets = await getSheetsClient();
    const fecha  = new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" });

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range:         `${SHEET_TAB}!A:C`,
      valueInputOption: "RAW", // RAW evita que un email tipo "=FORMULA()" se ejecute en Sheets
      requestBody: {
        values: [[email, fecha, fuenteTxt]],
      },
    });

    actividad("📩  NUEVO EMAIL", email, `fuente: ${fuenteTxt}`);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[guardar-email]", err);
    return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
  }
}
