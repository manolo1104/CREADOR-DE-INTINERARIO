import { NextResponse } from "next/server";
import { google } from "googleapis";

const SHEET_ID  = process.env.GOOGLE_SHEETS_ID!;
const SHEET_TAB = "Leads"; // nombre de la pestaña en tu Sheet

async function getSheetsClient() {
  // Railway puede guardar la key con \n literales o con saltos reales —
  // normalizamos a saltos reales en ambos casos.
  const rawKey = process.env.GOOGLE_PRIVATE_KEY ?? "";
  const key = rawKey.includes("\\n") ? rawKey.replace(/\\n/g, "\n") : rawKey;

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: key,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }

    const sheets = await getSheetsClient();
    const fecha  = new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" });

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range:         `${SHEET_TAB}!A:C`,
      valueInputOption: "USER_ENTERED",
      requestBody: {
        values: [[email, fecha, "Planificador IA"]],
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[guardar-email]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
