import { google } from "googleapis";

const HUASTECA_TAB = "HUASTECA";

const HEADERS = [
  "Fecha", "Confirmación", "Cliente", "Teléfono", "Email",
  "Tour", "Fecha Tour", "Adultos", "Niños", "Total MXN",
  "Código Promo", "Descuento %", "Payment ID", "Notas",
];

let sheetsClient: ReturnType<typeof google.sheets> | null = null;

function loadCredentials() {
  const raw = process.env.GOOGLE_SHEETS_CREDENTIALS;
  if (!raw) return null;
  try { return JSON.parse(raw); } catch {}
  try { return JSON.parse(raw.replace(/\\n/g, "\n")); } catch {}
  return null;
}

async function getSheetsClient() {
  if (sheetsClient) return sheetsClient;
  const credentials = loadCredentials();
  const sheetId     = process.env.GOOGLE_SHEETS_ID || process.env.GOOGLE_SHEET_ID;
  if (!credentials || !sheetId) return null;
  try {
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    const authClient = await auth.getClient();
    sheetsClient = google.sheets({ version: "v4", auth: authClient as any });
    return sheetsClient;
  } catch (e: any) {
    console.error("❌ Sheets init:", e.message);
    return null;
  }
}

async function ensureHuastekaTab(client: ReturnType<typeof google.sheets>, spreadsheetId: string) {
  try {
    const meta = await client.spreadsheets.get({ spreadsheetId });
    const exists = meta.data.sheets?.some(
      (s) => s.properties?.title === HUASTECA_TAB
    );
    if (!exists) {
      await client.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: [{ addSheet: { properties: { title: HUASTECA_TAB } } }] },
      });
      // Escribir cabeceras
      await client.spreadsheets.values.update({
        spreadsheetId,
        range:            `${HUASTECA_TAB}!A1`,
        valueInputOption: "RAW",
        requestBody:      { values: [HEADERS] },
      });
    }
  } catch (e: any) {
    console.error("❌ ensureHuastekaTab:", e.message);
  }
}

export async function addTourToSheet(booking: {
  confirmationNumber:    string;
  customerName:          string;
  customerPhone?:        string | null;
  customerEmail:         string;
  tourName:              string;
  tourDate:              string;
  adults:                number;
  children:              number;
  totalAmount:           number;
  promoCode?:            string | null;
  promoDiscount?:        number;
  stripePaymentIntentId?: string | null;
  notes?:                string | null;
}) {
  const client      = await getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID || process.env.GOOGLE_SHEET_ID;
  if (!client || !spreadsheetId) {
    console.warn("⚠️ Sheets no disponible — booking no guardado en Sheets");
    return;
  }

  try {
    await ensureHuastekaTab(client, spreadsheetId);

    const ts = new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" });

    const row = [
      ts,
      booking.confirmationNumber,
      booking.customerName,
      booking.customerPhone  || "N/A",
      booking.customerEmail,
      booking.tourName,
      booking.tourDate,
      booking.adults,
      booking.children,
      `$${Number(booking.totalAmount).toLocaleString("es-MX")} MXN`,
      booking.promoCode      || "",
      booking.promoDiscount  ? `${booking.promoDiscount}%` : "",
      booking.stripePaymentIntentId || "N/A",
      booking.notes          || "",
    ];

    await client.spreadsheets.values.append({
      spreadsheetId,
      range:            `${HUASTECA_TAB}!A:N`,
      valueInputOption: "USER_ENTERED",
      requestBody:      { values: [row] },
    });

    console.log(`✅ Tour guardado en Sheets HUASTECA — ${booking.confirmationNumber}`);
  } catch (e: any) {
    console.error("❌ addTourToSheet:", e.message);
  }
}
