// GA4 → panel (4 nov 2026). Solo servidor.
//
// Lee la API de datos de GA4 con el robot del panel (cuenta de servicio, rol
// Lector en la propiedad 545095004, dado de alta el 4 nov). Una sola llamada
// `batchRunReports` trae todo lo de un periodo; otra, la serie de 8 periodos.
//
// Comprobado el 4 nov contra el documento (7 oct – 3 nov): 6,121 sesiones ·
// 9,439 vistas · whatsapp_contact 98 · generate_lead 31 · begin_checkout 66
// personas · purchase 5 · view_item 379 personas. Si un día no cuadra, lo
// primero es revisar que nadie haya cambiado los nombres de los eventos.
//
// Caché en `Config`: 3 h si el rango toca los últimos 2 días (GA4 sigue
// procesando), 30 días si ya es pasado. Sin acceso no truena: devuelve el
// motivo para decirlo en pantalla.

import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { addDaysYMD, hoyMX } from "@/lib/dates";
import { auth, canalDe } from "@/lib/ga4Datos";
import type { CanalGA4 } from "@/lib/admin/analisisComun";

/** Los eventos que mide el panel. `click_whatsapp` (viaje CDMX) NO entra: el mismo clic ya sale como `whatsapp_contact`. */
export const EVENTOS_GA4 = ["whatsapp_contact", "generate_lead", "begin_checkout", "purchase", "view_item", "add_to_cart"] as const;
/** Lo que cuenta como «contacto» en la tasa del sitio (fórmula del documento). */
export const EVENTOS_CONTACTO = ["whatsapp_contact", "generate_lead", "purchase"] as const;

export type ResultadoGA4<T> = { ok: true; datos: T } | { ok: false; motivo: string };

export interface CanalFila { canal: CanalGA4; sesiones: number; contactos: number }
export interface PaginaGA4 { path: string; vistas: number; whatsapp: number; formularios: number }
export interface DetalleGA4 {
  sesiones: number;
  vistas: number;
  /** eventCount y personas (totalUsers) por evento. */
  eventos: Record<string, { n: number; personas: number }>;
  canales: CanalFila[];
  paginas: PaginaGA4[];
  leidoEn: string;
}
export interface TotalesGA4 {
  sesiones: number; organicas: number;
  whatsapp: number; formularios: number; compras: number;
  inicianPago: number; venTour: number;
}

type Rango = { desde: string; hasta: string };

const propiedad = () => (process.env.GA4_PROPERTY_ID ?? "").replace(/^properties\//, "").trim();

/** ¿Hay con qué conectarse? Devuelve el motivo si no. */
export function faltaConfiguracionGA4(): string | null {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) return "Falta la llave del robot de Google en el servidor (GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY).";
  if (!/^\d+$/.test(propiedad())) return "Falta GA4_PROPERTY_ID (el número de la propiedad: 545095004).";
  return null;
}

export function motivoDeError(e: unknown, servicio: "GA4" | "Search Console"): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/has not been used|is disabled|SERVICE_DISABLED|accessNotConfigured/i.test(msg)) return `La API de ${servicio} está apagada en Google Cloud (proyecto «My Project»).`;
  if (/permission|403|PERMISSION_DENIED|insufficient/i.test(msg)) return `El robot no tiene acceso a ${servicio}: agrégalo como lector (${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL}).`;
  return `${servicio} no contestó: ${msg.slice(0, 160)}`;
}

/** Caché en `Config`: lo pasado casi no cambia; lo reciente, sí. */
export async function conCache<T>(clave: string, rangos: Rango[], leer: () => Promise<T>): Promise<T & { leidoEn: string }> {
  const reciente = rangos.some(r => r.hasta >= addDaysYMD(hoyMX(), -2));
  const horas = reciente ? 3 : 24 * 30;
  const guardado = await prisma.config.findUnique({ where: { key: clave } }).catch(() => null);
  if (guardado) {
    try {
      const v = JSON.parse(guardado.value) as T & { leidoEn: string };
      if (Date.now() - new Date(v.leidoEn).getTime() < horas * 3_600_000) return v;
    } catch { /* se vuelve a leer */ }
  }
  const datos = { ...(await leer()), leidoEn: new Date().toISOString() };
  const value = JSON.stringify(datos);
  await prisma.config.upsert({ where: { key: clave }, update: { value }, create: { key: clave, value } }).catch(() => {});
  return datos;
}

type Fila = { dimensionValues?: { value?: string | null }[] | null; metricValues?: { value?: string | null }[] | null };
type Reporte = { dimensionHeaders?: { name?: string | null }[] | null; rows?: Fila[] | null; totals?: Fila[] | null };

/**
 * El total OFICIAL de GA4 (fila de totales), no la suma de renglones: al
 * desglosar por canal/fuente/campaña GA4 deja fuera algunas sesiones (4 nov:
 * 6,086 sumando renglones contra 6,121 del total, que es la cifra de la base).
 */
function totalDe(r: Reporte | undefined, rango?: string): number | null {
  const filas = r?.totals ?? [];
  const nombres = (r?.dimensionHeaders ?? []).map(h => h.name);
  const iRango = nombres.indexOf("dateRange");
  const fila = rango && iRango >= 0 ? filas.find(f => f.dimensionValues?.[iRango]?.value === rango) : filas[0];
  const v = fila?.metricValues?.[0]?.value;
  return v === undefined || v === null ? null : Number(v) || 0;
}
const filasDe = (r: Reporte | undefined) => (r?.rows ?? []).map(x => ({
  d: (x.dimensionValues ?? []).map(v => v.value ?? ""),
  m: (x.metricValues ?? []).map(v => Number(v.value) || 0),
}));
const enLista = (valores: readonly string[]) => ({ filter: { fieldName: "eventName", inListFilter: { values: [...valores] } } });

function cliente() {
  return google.analyticsdata({ version: "v1beta", auth: auth() });
}

/** Todo lo de un periodo en UNA llamada (5 informes). */
export async function detalleGA4(desde: string, hasta: string): Promise<ResultadoGA4<DetalleGA4>> {
  const falta = faltaConfiguracionGA4();
  if (falta) return { ok: false, motivo: falta };
  try {
    const datos = await conCache(`ga4:v2:det:${desde}:${hasta}`, [{ desde, hasta }], async () => {
      const dateRanges = [{ startDate: desde, endDate: hasta }];
      const canalDims = [{ name: "sessionDefaultChannelGroup" }, { name: "sessionSource" }, { name: "sessionCampaignName" }];
      const res = await cliente().properties.batchRunReports({
        property: `properties/${propiedad()}`,
        requestBody: { requests: [
          { dateRanges, dimensions: [{ name: "eventName" }], metrics: [{ name: "eventCount" }, { name: "totalUsers" }], dimensionFilter: enLista(EVENTOS_GA4) },
          { dateRanges, dimensions: canalDims, metrics: [{ name: "sessions" }], limit: "10000", metricAggregations: ["TOTAL"] },
          { dateRanges, dimensions: [...canalDims, { name: "eventName" }], metrics: [{ name: "eventCount" }], dimensionFilter: enLista(EVENTOS_CONTACTO), limit: "10000" },
          { dateRanges, dimensions: [{ name: "pagePath" }], metrics: [{ name: "screenPageViews" }], limit: "10000", metricAggregations: ["TOTAL"] },
          { dateRanges, dimensions: [{ name: "pagePath" }, { name: "eventName" }], metrics: [{ name: "eventCount" }], dimensionFilter: enLista(["whatsapp_contact", "generate_lead"]), limit: "10000" },
        ] },
      });
      const [ev, ses, conCanal, vistasPag, conPag] = res.data.reports ?? [];

      const eventos: DetalleGA4["eventos"] = {};
      for (const f of filasDe(ev)) eventos[f.d[0]] = { n: f.m[0], personas: f.m[1] };

      const canales = new Map<CanalGA4, CanalFila>();
      const fila = (c: CanalGA4) => { const x = canales.get(c) ?? { canal: c, sesiones: 0, contactos: 0 }; canales.set(c, x); return x; };
      for (const f of filasDe(ses)) fila(canalDe(f.d[0], f.d[1], f.d[2])).sesiones += f.m[0];
      for (const f of filasDe(conCanal)) fila(canalDe(f.d[0], f.d[1], f.d[2])).contactos += f.m[0];

      const paginas = new Map<string, PaginaGA4>();
      const pag = (p: string) => { const x = paginas.get(p) ?? { path: p, vistas: 0, whatsapp: 0, formularios: 0 }; paginas.set(p, x); return x; };
      for (const f of filasDe(vistasPag)) pag(f.d[0]).vistas += f.m[0];
      for (const f of filasDe(conPag)) {
        if (f.d[1] === "whatsapp_contact") pag(f.d[0]).whatsapp += f.m[0];
        else pag(f.d[0]).formularios += f.m[0];
      }
      const filasCanal = Array.from(canales.values()).sort((a, b) => b.sesiones - a.sesiones);
      const filasPag = Array.from(paginas.values()).sort((a, b) => b.vistas - a.vistas);
      return {
        sesiones: totalDe(ses) ?? filasCanal.reduce((t, c) => t + c.sesiones, 0),
        vistas: totalDe(vistasPag) ?? filasPag.reduce((t, p) => t + p.vistas, 0),
        eventos, canales: filasCanal, paginas: filasPag,
      };
    });
    return { ok: true, datos };
  } catch (e) {
    return { ok: false, motivo: motivoDeError(e, "GA4") };
  }
}

/** Los totales de hasta 8 periodos, para las tendencias (una llamada, 4 informes). */
export async function serieGA4(rangos: Rango[]): Promise<ResultadoGA4<TotalesGA4[]>> {
  const falta = faltaConfiguracionGA4();
  if (falta) return { ok: false, motivo: falta };
  const usar = rangos.slice(-8);
  try {
    const { serie } = await conCache(`ga4:v2:serie:${usar.map(r => `${r.desde}_${r.hasta}`).join(",")}`, usar, async () => {
      // GA4 acepta hasta 4 rangos por informe: dos trozos de 4.
      const trozos: { rango: Rango; nombre: string }[][] = [];
      usar.forEach((r, i) => { (trozos[Math.floor(i / 4)] ??= []).push({ rango: r, nombre: `r${i}` }); });
      const requests = trozos.flatMap(t => {
        const dateRanges = t.map(x => ({ startDate: x.rango.desde, endDate: x.rango.hasta, name: x.nombre }));
        return [
          { dateRanges, dimensions: [{ name: "eventName" }], metrics: [{ name: "eventCount" }, { name: "totalUsers" }], dimensionFilter: enLista(EVENTOS_GA4) },
          { dateRanges, dimensions: [{ name: "sessionDefaultChannelGroup" }, { name: "sessionSource" }, { name: "sessionCampaignName" }], metrics: [{ name: "sessions" }], limit: "10000", metricAggregations: ["TOTAL"] },
        ];
      });
      const res = await cliente().properties.batchRunReports({ property: `properties/${propiedad()}`, requestBody: { requests } });
      const tot: TotalesGA4[] = usar.map(() => ({ sesiones: 0, organicas: 0, whatsapp: 0, formularios: 0, compras: 0, inicianPago: 0, venTour: 0 }));
      for (const rep of res.data.reports ?? []) {
        const nombres = (rep.dimensionHeaders ?? []).map(h => h.name);
        const iRango = nombres.indexOf("dateRange");
        const esEventos = nombres.includes("eventName");
        for (const f of filasDe(rep)) {
          const i = Number((iRango >= 0 ? f.d[iRango] : "r0").replace(/^r/, ""));
          const t = tot[i];
          if (!t) continue;
          if (esEventos) {
            const ev = f.d[0];
            if (ev === "whatsapp_contact") t.whatsapp += f.m[0];
            else if (ev === "generate_lead") t.formularios += f.m[0];
            else if (ev === "purchase") t.compras += f.m[0];
            else if (ev === "begin_checkout") t.inicianPago += f.m[1];
            else if (ev === "view_item") t.venTour += f.m[1];
          } else {
            t.sesiones += f.m[0];
            // Igual que el detalle: Maps (UTM perfil-maps) NO cuenta como orgánico.
            if (canalDe(f.d[0], f.d[1], f.d[2]) === "seo") t.organicas += f.m[0];
          }
        }
        // Las sesiones: el total oficial de cada rango, no la suma de renglones.
        if (!esEventos) usar.forEach((_, i) => { const oficial = totalDe(rep, `r${i}`); if (oficial !== null && tot[i]) tot[i].sesiones = oficial; });
      }
      return { serie: tot };
    });
    return { ok: true, datos: serie };
  } catch (e) {
    return { ok: false, motivo: motivoDeError(e, "GA4") };
  }
}
