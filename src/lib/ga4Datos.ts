/**
 * Lo que vio GA4, por canal, para la pestaña Análisis (21 oct 2026).
 *
 * Lee la Data API con el mismo robot de Google que ya usa `leads.ts`
 * (`GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_PRIVATE_KEY`); hace falta que ese
 * correo esté como «Lector» en la propiedad de GA4 de Tours y que
 * `GA4_PROPERTY_ID` tenga el número de la propiedad (no el `G-…`).
 *
 * 🔴 Maps y SEO: un clic desde la ficha de Google Maps llega a GA4 como
 * «google / organic», igual que la búsqueda. Solo se separan si la liga del
 * sitio en el Perfil de Google lleva `utm_campaign=perfil-maps` (o si el
 * navegador manda `maps.google.com` de origen, que pasa pocas veces).
 *
 * Se guarda 12 h en `Config`: la Data API tarda y el panel no la necesita al
 * minuto. Sin acceso no truena: devuelve el motivo para decirlo en pantalla.
 */

import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import type { CanalGA4, DatosGA4, FilaCanal } from "@/lib/admin/analisisComun";

export { ETIQUETA_CANAL, type CanalGA4, type DatosGA4, type FilaCanal } from "@/lib/admin/analisisComun";

const HORAS_CACHE = 12;

/** A qué canal nuestro va un renglón de GA4. */
export function canalDe(grupo: string, fuente: string, campana: string): CanalGA4 {
  const f = fuente.toLowerCase();
  const c = campana.toLowerCase();
  if (c.includes("perfil-maps") || f.includes("maps.google") || f === "maps") return "maps";
  switch (grupo) {
    case "Organic Search": return "seo";
    case "Direct": return "directo";
    case "Organic Social":
    case "Paid Social": return "redes";
    case "Referral": return "referidos";
    case "Paid Search":
    case "Paid Shopping":
    case "Paid Other":
    case "Display":
    case "Cross-network":
    case "Paid Video": return "publicidad";
    case "Email": return "correo";
    default: return "otro";
  }
}

function auth() {
  const key = (process.env.GOOGLE_PRIVATE_KEY ?? "")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/-----BEGIN PRIVATE KEY-----\s*/g, "-----BEGIN PRIVATE KEY-----\n")
    .replace(/\s*-----END PRIVATE KEY-----/g, "\n-----END PRIVATE KEY-----");
  return new google.auth.GoogleAuth({
    credentials: { type: "service_account", client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL, private_key: key },
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
  });
}

export async function canalesGA4(dias: number): Promise<DatosGA4> {
  const propiedad = (process.env.GA4_PROPERTY_ID ?? "").replace(/^properties\//, "").trim();
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    return { ok: false, motivo: "Falta la llave del robot de Google en el servidor." };
  }
  if (!/^\d+$/.test(propiedad)) return { ok: false, motivo: "Falta GA4_PROPERTY_ID (el número de la propiedad de GA4)." };

  const clave = `ga4:canales:${dias}`;
  const guardado = await prisma.config.findUnique({ where: { key: clave } }).catch(() => null);
  if (guardado) {
    try {
      const v = JSON.parse(guardado.value) as { leidoEn: string; filas: FilaCanal[] };
      if (Date.now() - new Date(v.leidoEn).getTime() < HORAS_CACHE * 3_600_000) return { ok: true, dias, ...v };
    } catch { /* se vuelve a leer */ }
  }

  try {
    const api = google.analyticsdata({ version: "v1beta", auth: auth() });
    const res = await api.properties.runReport({
      property: `properties/${propiedad}`,
      requestBody: {
        dateRanges: [{ startDate: `${dias}daysAgo`, endDate: "today" }],
        dimensions: [{ name: "sessionDefaultChannelGroup" }, { name: "sessionSource" }, { name: "sessionCampaignName" }],
        metrics: [{ name: "sessions" }, { name: "ecommercePurchases" }, { name: "purchaseRevenue" }],
        limit: "1000",
      },
    });
    const suma: Record<string, FilaCanal> = {};
    for (const r of res.data.rows ?? []) {
      const [g, f, c] = (r.dimensionValues ?? []).map((d) => d.value ?? "");
      const [s, p, i] = (r.metricValues ?? []).map((m) => Number(m.value) || 0);
      const canal = canalDe(g, f, c);
      suma[canal] ??= { canal, sesiones: 0, compras: 0, ingresos: 0 };
      suma[canal].sesiones += s;
      suma[canal].compras += p;
      suma[canal].ingresos += Math.round(i);
    }
    const filas = Object.values(suma).sort((a, b) => b.sesiones - a.sesiones);
    const leidoEn = new Date().toISOString();
    const value = JSON.stringify({ leidoEn, filas });
    await prisma.config.upsert({ where: { key: clave }, update: { value }, create: { key: clave, value } }).catch(() => {});
    return { ok: true, filas, dias, leidoEn };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/permission|403|PERMISSION_DENIED/i.test(msg)) {
      return { ok: false, motivo: `El robot no tiene acceso a GA4: agrégalo como «Lector» en la propiedad (${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL}).` };
    }
    return { ok: false, motivo: `GA4 no contestó: ${msg.slice(0, 160)}` };
  }
}
