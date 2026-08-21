// Captura de correos. Todos los leads del sitio (recomendador, planificador,
// blog, destinos) terminan en la misma pestaña "Leads" de Google Sheets, con la
// fuente anotada para saber qué formulario está trayendo gente de verdad.

import { google } from "googleapis";
import { actividad, logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const SHEET_ID  = process.env.GOOGLE_SHEETS_ID!;
const SHEET_TAB = "Leads";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function esEmailValido(email: unknown): email is string {
  return typeof email === "string" && EMAIL_RE.test(email);
}

/** Normaliza la fuente que llega del cliente (nunca se confía en su largo). */
export function normalizarFuente(fuente: unknown, porDefecto = "Planificador IA"): string {
  return typeof fuente === "string" && fuente.trim()
    ? fuente.trim().slice(0, 40)
    : porDefecto;
}

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

/**
 * Guarda el lead en la hoja. Devuelve `false` si falla, para que quien llame
 * decida: normalmente conviene seguir y mandarle igual su contenido al usuario
 * antes que darle un error por un problema nuestro de Sheets.
 */
export async function guardarLead(email: string, fuente: string): Promise<boolean> {
  try {
    const sheets = await getSheetsClient();
    const fecha  = new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" });

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range:         `${SHEET_TAB}!A:C`,
      // RAW evita que un email tipo "=FORMULA()" se ejecute dentro de Sheets.
      valueInputOption: "RAW",
      requestBody: { values: [[email, fecha, fuente]] },
    });

    actividad("📩  NUEVO EMAIL", email, `fuente: ${fuente}`);
    return true;
  } catch (err) {
    logger.error("guardar_lead_failed", {
      fuente,
      reason: err instanceof Error ? err.message : "desconocido",
    });
    return false;
  }
}

/** Contexto de lo que la persona pidió, para que la secuencia hable de SU viaje. */
export interface ContextoLead {
  grupo?:          string | null;
  dias?:           string | null;
  origen?:         string | null;
  intereses?:      string[];
  tourPrincipal?:  string | null;  // slug
  tourSecundario?: string | null;  // slug
  paquete?:        string | null;  // slug
}

/**
 * Registra al lead en la base para poder escribirle después. La hoja de Google
 * sigue siendo la libreta de Manolo; esto es lo que hace posible la secuencia.
 *
 * Si ya existe (mismo correo y misma fuente) se actualiza su contexto SIN
 * reiniciar la secuencia: alguien que usa el recomendador tres veces no debe
 * recibir el primer correo tres veces.
 */
export async function registrarLead(
  email: string,
  fuente: string,
  ctx: ContextoLead = {},
  /**
   * Cuántos pasos de la secuencia se dan por enviados al registrarlo.
   *
   * El recomendador manda su propio paso 1 en el momento, así que arranca en 0.
   * Las capturas del blog y de los destinos también entregan algo al instante
   * —el itinerario de 3 días—, y ese correo ES su paso 1: sin esto recibirían
   * después un "Tu recomendación: …" que nadie pidió.
   */
  pasosYaEnviados = 0,
): Promise<{ id: string; esNuevo: boolean } | null> {
  try {
    const existente = await prisma.lead.findUnique({
      where: { email_fuente: { email, fuente } },
      select: { id: true },
    });

    const datos = {
      grupo:          ctx.grupo          ?? undefined,
      dias:           ctx.dias           ?? undefined,
      origen:         ctx.origen         ?? undefined,
      intereses:      ctx.intereses      ?? undefined,
      tourPrincipal:  ctx.tourPrincipal  ?? undefined,
      tourSecundario: ctx.tourSecundario ?? undefined,
      paquete:        ctx.paquete        ?? undefined,
    };

    if (existente) {
      await prisma.lead.update({ where: { id: existente.id }, data: datos });
      return { id: existente.id, esNuevo: false };
    }

    const creado = await prisma.lead.create({
      data: {
        email,
        fuente,
        ...datos,
        emailsSent:  pasosYaEnviados,
        lastEmailAt: pasosYaEnviados > 0 ? new Date() : undefined,
      },
      select: { id: true },
    });
    return { id: creado.id, esNuevo: true };
  } catch (err) {
    // Nunca debe tumbar la respuesta al usuario: si esto falla, el lead sigue
    // guardado en la hoja y solo se pierde la secuencia.
    logger.error("registrar_lead_failed", {
      fuente,
      reason: err instanceof Error ? err.message : "desconocido",
    });
    return null;
  }
}
