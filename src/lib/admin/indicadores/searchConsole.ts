// Search Console → panel (4 nov 2026). Solo servidor.
//
// La DEMANDA DEL MERCADO: cuánta gente busca en Google lo que vendemos
// (impresiones) y cuántos llegan (clics). Sirve para leer la temporada alta
// con tasas: si las impresiones suben 40 % y las sesiones 40 %, no mejoró la
// web, subió el mercado. El robot tiene permiso «Restringido» (solo lectura) en
// `sc-domain:huasteca-potosina.com` desde el 4 nov. Search Console publica con
// 2–3 días de retraso.

import { google } from "googleapis";
import { auth } from "@/lib/ga4Datos";
import { conCache, motivoDeError, type ResultadoGA4 } from "./ga4";

export interface Busqueda {
  impresiones: number;
  clics: number;
  /** 0–100 */
  ctr: number;
  posicion: number;
  consultas: { consulta: string; impresiones: number; clics: number; posicion: number }[];
  leidoEn: string;
}

const sitio = () => process.env.GSC_SITE || "sc-domain:huasteca-potosina.com";

export async function busquedaGoogle(desde: string, hasta: string): Promise<ResultadoGA4<Busqueda>> {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) return { ok: false, motivo: "Falta la llave del robot de Google en el servidor." };
  try {
    const datos = await conCache(`gsc:v1:${desde}:${hasta}`, [{ desde, hasta }], async () => {
      const sc = google.searchconsole({ version: "v1", auth: auth(["https://www.googleapis.com/auth/webmasters.readonly"]) });
      const [tot, q] = await Promise.all([
        sc.searchanalytics.query({ siteUrl: sitio(), requestBody: { startDate: desde, endDate: hasta } }),
        sc.searchanalytics.query({ siteUrl: sitio(), requestBody: { startDate: desde, endDate: hasta, dimensions: ["query"], rowLimit: 10 } }),
      ]);
      const t = tot.data.rows?.[0];
      return {
        impresiones: Math.round(t?.impressions ?? 0),
        clics: Math.round(t?.clicks ?? 0),
        ctr: Math.round((t?.ctr ?? 0) * 1000) / 10,
        posicion: Math.round((t?.position ?? 0) * 10) / 10,
        consultas: (q.data.rows ?? []).map(r => ({
          consulta: r.keys?.[0] ?? "", impresiones: Math.round(r.impressions ?? 0), clics: Math.round(r.clicks ?? 0), posicion: Math.round((r.position ?? 0) * 10) / 10,
        })),
      };
    });
    return { ok: true, datos };
  } catch (e) {
    return { ok: false, motivo: motivoDeError(e, "Search Console") };
  }
}
