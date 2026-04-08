import { NextResponse } from "next/server";
import { google } from "googleapis";

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

// DEBUG — eliminar después de verificar
export async function GET() {
  const rawKey = process.env.GOOGLE_PRIVATE_KEY ?? "";
  return Response.json({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    sheetId: process.env.GOOGLE_SHEETS_ID,
    keyStart: rawKey.slice(0, 60),
    keyEnd:   rawKey.slice(-40),
    hasLiteralN: rawKey.includes("\\n"),
    hasRealN:    rawKey.includes("\n"),
    length: rawKey.length,
  });
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
