/**
 * Atributos PRÁCTICOS de cada destino: los que deciden la visita y alimentan
 * los filtros de /destinos, las tarjetas y la ficha (20 nov 2026, auditoría de
 * la sección Destinos).
 *
 * 🔴 UNA sola escala de dificultad para todo el sitio. Antes la ficha de Tamul
 * decía «alta» y su tarjeta «DIFÍCIL»: dos escalas, ninguna con criterio. Ahora
 * el nivel vive AQUÍ, con su criterio publicado (`NIVELES`), y el campo viejo
 * `dificultad` de `destinos.ts` tiene que coincidir con él (lo revisa
 * `datosUnificados.test.ts`). Si cambias un nivel, cambia también `dificultad`.
 *
 * Los minutos desde Ciudad Valles salen del `como_llegar` de cada ficha
 * (`tiemposADestinos.ts`); aquí solo se ponen los que la ficha no dice como
 * cifra, y siempre como aproximados.
 */
import type { Destino } from "./destinos";
import { minutosDesdeValles } from "./tiemposADestinos";

export type Categoria =
  | "cascadas"
  | "pozas"
  | "cuevas-sotanos"
  | "aventura"
  | "arqueologia"
  | "pueblos-cultura"
  | "bosque"
  | "bienestar";

export const CATEGORIAS: { key: Categoria; es: string; en: string }[] = [
  { key: "cascadas", es: "Cascadas", en: "Waterfalls" },
  { key: "pozas", es: "Pozas para nadar", en: "Swimming holes" },
  { key: "cuevas-sotanos", es: "Cuevas y sótanos", en: "Caves & sinkholes" },
  { key: "aventura", es: "Ríos y aventura", en: "Rivers & adventure" },
  { key: "arqueologia", es: "Arqueología e historia", en: "Archaeology & history" },
  { key: "pueblos-cultura", es: "Pueblos, arte y cultura", en: "Towns, art & culture" },
  { key: "bosque", es: "Bosque y miradores", en: "Cloud forest & viewpoints" },
  { key: "bienestar", es: "Bienestar", en: "Wellness" },
];

/** 1 Fácil · 2 Moderado · 3 Exigente · 4 Muy exigente. */
export type Nivel = 1 | 2 | 3 | 4;

/** El criterio PUBLICADO de cada nivel (se enseña en /destinos y en cada ficha). */
export const NIVELES: Record<Nivel, { es: string; en: string; criterioEs: string; criterioEn: string; dificultad: "baja" | "media" | "alta" | "extrema" }> = {
  1: {
    es: "Fácil", en: "Easy", dificultad: "baja",
    criterioEs: "Menos de 15 min a pie, sin escalinatas largas. Apto para niños y adultos mayores.",
    criterioEn: "Under 15 min on foot, no long stairways. Fine for kids and older adults.",
  },
  2: {
    es: "Moderado", en: "Moderate", dificultad: "media",
    criterioEs: "Hasta 1 h de caminata o escalones, piso húmedo o resbaloso. Niños con supervisión.",
    criterioEn: "Up to 1 h of walking or steps, wet or slippery ground. Kids with supervision.",
  },
  3: {
    es: "Exigente", en: "Challenging", dificultad: "alta",
    criterioEs: "Remo, rápidos con guía, más de 300 escalones, subidas largas o nado con corriente. Pide buena condición física.",
    criterioEn: "Paddling, guided rapids, 300+ steps, long climbs or swimming in current. Requires good fitness.",
  },
  4: {
    es: "Muy exigente", en: "Very challenging", dificultad: "extrema",
    criterioEs: "Rappel, cañonismo o espeleología técnica. Solo con guía certificado y equipo.",
    criterioEn: "Rappelling, canyoning or technical caving. Only with a certified guide and gear.",
  },
};

/** ¿Se nada? «zonas» = solo en las zonas permitidas (hay tramos con corriente). */
export type Nado = "si" | "zonas" | "no";
/** ¿Con niños? «mayores» = mejor desde ~10 años (escalinatas, remo o caminata larga). */
export type ConNinos = "si" | "mayores" | "no";

export interface AtributosDestino {
  categorias: Categoria[];
  nivel: Nivel;
  nado: Nado;
  ninos: ConNinos;
  /** Solo cuando `como_llegar` no lo dice como cifra (ver tiemposADestinos). Siempre aproximado. */
  minValles?: number;
  /** Posición en «Los 10 imprescindibles» (1–10). */
  imprescindible?: number;
}

export const ATRIBUTOS: Record<string, AtributosDestino> = {
  "las-pozas-jardin-surrealista": { categorias: ["pueblos-cultura", "cascadas"], nivel: 2, nado: "no", ninos: "si", imprescindible: 2 },
  "cascada-de-tamul": { categorias: ["cascadas", "aventura"], nivel: 3, nado: "zonas", ninos: "mayores", imprescindible: 1 },
  "sotano-de-las-golondrinas": { categorias: ["cuevas-sotanos"], nivel: 3, nado: "no", ninos: "mayores", imprescindible: 5 },
  "cascadas-de-micos": { categorias: ["cascadas", "aventura", "pozas"], nivel: 2, nado: "si", ninos: "si", imprescindible: 4 },
  "puente-de-dios-tamasopo": { categorias: ["pozas", "cuevas-sotanos"], nivel: 2, nado: "zonas", ninos: "mayores", imprescindible: 3 },
  "zona-arqueologica-tamtoc": { categorias: ["arqueologia"], nivel: 1, nado: "no", ninos: "si", imprescindible: 10 },
  "cascadas-de-tamasopo": { categorias: ["cascadas", "pozas"], nivel: 1, nado: "si", ninos: "si", imprescindible: 7 },
  "siete-cascadas-tamasopo": { categorias: ["cascadas", "pozas", "aventura"], nivel: 2, nado: "si", ninos: "mayores" },
  "hacienda-los-gomez-tamasopo": { categorias: ["pozas"], nivel: 1, nado: "si", ninos: "si" },
  "balneario-taninul": { categorias: ["bienestar", "pozas"], nivel: 1, nado: "si", ninos: "si" },
  "cascadas-minas-viejas": { categorias: ["cascadas", "pozas"], nivel: 2, nado: "zonas", ninos: "si", imprescindible: 6 },
  "laguna-media-luna": { categorias: ["pozas", "bienestar"], nivel: 1, nado: "si", ninos: "si", imprescindible: 8 },
  "cascada-el-aguacate": { categorias: ["cascadas"], nivel: 3, nado: "si", ninos: "mayores" },
  "cascada-el-salto": { categorias: ["cascadas", "pozas"], nivel: 1, nado: "si", ninos: "si" },
  "cascada-el-meco": { categorias: ["cascadas"], nivel: 1, nado: "zonas", ninos: "si" },
  "sotano-de-las-huahuas": { categorias: ["cuevas-sotanos"], nivel: 3, nado: "no", ninos: "mayores", imprescindible: 9 },
  "cuevas-de-mantetzulel": { categorias: ["cuevas-sotanos"], nivel: 2, nado: "no", ninos: "mayores" },
  "nacimiento-huichihuayan": { categorias: ["pozas"], nivel: 1, nado: "si", ninos: "si" },
  "nacimiento-tambaque": { categorias: ["pozas"], nivel: 1, nado: "si", ninos: "si" },
  "voladores-tamaleton": { categorias: ["pueblos-cultura"], nivel: 1, nado: "no", ninos: "si" },
  "rio-tampaon-rafting": { categorias: ["aventura"], nivel: 3, nado: "si", ninos: "no" },
  "xilitla-pueblo-magico": { categorias: ["pueblos-cultura"], nivel: 2, nado: "no", ninos: "si" },
  "aquismon-pueblo-magico": { categorias: ["pueblos-cultura"], nivel: 1, nado: "no", ninos: "si", minValles: 60 },
  "rio-axtla-el-chalan": { categorias: ["pozas"], nivel: 1, nado: "si", ninos: "si", minValles: 90 },
  "castillo-de-la-salud": { categorias: ["bienestar", "pueblos-cultura"], nivel: 1, nado: "no", ninos: "si", minValles: 90 },
  "cascada-los-comales": { categorias: ["cascadas", "pozas", "bienestar"], nivel: 2, nado: "si", ninos: "si", minValles: 90 },
  "cascada-el-trampolin-tamasopo": { categorias: ["pozas", "aventura"], nivel: 2, nado: "si", ninos: "mayores", minValles: 65 },
  "zona-arqueologica-tamohi-el-consuelo": { categorias: ["arqueologia"], nivel: 1, nado: "no", ninos: "si", minValles: 45 },
  "templo-san-juan-bautista-coxcatlan": { categorias: ["arqueologia", "pueblos-cultura"], nivel: 1, nado: "no", ninos: "si", minValles: 105 },
  "cascada-rancho-el-zapote-poza-azul-coxcatlan": { categorias: ["cascadas", "pozas"], nivel: 2, nado: "si", ninos: "si", minValles: 115 },
  "ruinas-de-el-jopoy-coxcatlan": { categorias: ["arqueologia"], nivel: 1, nado: "no", ninos: "si", minValles: 115 },
  "tancanhuitz": { categorias: ["pueblos-cultura"], nivel: 2, nado: "no", ninos: "si", minValles: 55 },
  "san-martin-chalchicuautla": { categorias: ["pueblos-cultura"], nivel: 1, nado: "no", ninos: "si", minValles: 105 },
  "san-vicente-tancuayalab": { categorias: ["pueblos-cultura"], nivel: 1, nado: "no", ninos: "si", minValles: 72 },
  "tanlajas": { categorias: ["pueblos-cultura"], nivel: 1, nado: "no", ninos: "si", minValles: 55 },
  "texquitote": { categorias: ["pueblos-cultura"], nivel: 1, nado: "no", ninos: "si", minValles: 165 },
  "laguna-de-los-suspiros": { categorias: ["bosque"], nivel: 1, nado: "no", ninos: "si", minValles: 90 },
  "la-trinidad-xilitla": { categorias: ["bosque"], nivel: 2, nado: "no", ninos: "si", minValles: 140 },
  "olla-de-la-luz": { categorias: ["bosque", "cuevas-sotanos"], nivel: 3, nado: "no", ninos: "mayores", minValles: 160 },
  "cueva-del-salitre": { categorias: ["cuevas-sotanos", "aventura"], nivel: 3, nado: "no", ninos: "mayores", minValles: 95 },
  "museo-leonora-carrington-xilitla": { categorias: ["pueblos-cultura"], nivel: 1, nado: "no", ninos: "si", minValles: 90 },
  "cueva-del-agua": { categorias: ["pozas", "cuevas-sotanos"], nivel: 3, nado: "si", ninos: "mayores" },
};

/** Los atributos de un destino. Revienta si falta: un destino nuevo sin atributos no debe pasar el build. */
export function atributosDe(slug: string): AtributosDestino {
  const a = ATRIBUTOS[slug];
  if (!a) throw new Error(`destinosAtributos: falta el destino "${slug}"`);
  return a;
}

/** Minutos aproximados desde Ciudad Valles: los de la ficha y, si no hay cifra, los de aquí. */
export function minutosValles(d: Pick<Destino, "slug" | "como_llegar">): number | null {
  return minutosDesdeValles(d) ?? ATRIBUTOS[d.slug]?.minValles ?? null;
}

/** «Fácil · Moderado…» en el idioma pedido. */
export function nivelTexto(nivel: Nivel, en = false): string {
  return en ? NIVELES[nivel].en : NIVELES[nivel].es;
}

export function nadoTexto(n: Nado, en = false): string {
  if (en) return n === "si" ? "Swimming allowed" : n === "zonas" ? "Swim in marked areas only" : "No swimming";
  return n === "si" ? "Se puede nadar" : n === "zonas" ? "Se nada solo en zonas permitidas" : "No se nada";
}

export function ninosTexto(n: ConNinos, en = false): string {
  if (en) return n === "si" ? "Good with kids" : n === "mayores" ? "Better for kids 10+" : "Not for kids";
  return n === "si" ? "Apto para niños" : n === "mayores" ? "Mejor con niños de 10+" : "No apto para niños";
}

/** Distancia en línea recta (km) entre dos puntos. Para «Cerca de aquí»: no es tiempo de manejo. */
export function kmEnLineaRecta(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/**
 * Los meses (0–11) de una `temporada_ideal` como «Nov–Feb» o «Todo el año».
 * Misma lectura que `MejorEpocaWidget`. Lo que no se pueda leer da [] (el
 * destino simplemente no sube en «Mejores este mes»).
 */
export function mesesDeTemporada(temporada: string): number[] {
  const t = (temporada ?? "").trim();
  if (!t) return [];
  if (/^todo/i.test(t)) return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const m = /^([A-Za-zÁá]{3})[A-Za-záé]*\s*[–-]\s*([A-Za-zÁá]{3})/.exec(t);
  if (!m) return [];
  const de = MESES_CORTOS.indexOf(m[1].toLowerCase());
  const a = MESES_CORTOS.indexOf(m[2].toLowerCase());
  if (de < 0 || a < 0) return [];
  const out: number[] = [];
  for (let i = de; ; i = (i + 1) % 12) {
    out.push(i);
    if (i === a) break;
  }
  return out;
}

/** Lo que cuesta, en corto, para la tarjeta del índice. */
const COSTO_TARJETA: Record<string, string> = {
  "cascada-de-tamul": "Canoa ~$2,000 (hasta 10)",
  "cueva-del-agua": "Va con la canoa a Tamul",
  "siete-cascadas-tamasopo": "Con guía y equipo",
  "hacienda-los-gomez-tamasopo": "Se confirma en el lugar",
  "olla-de-la-luz": "Guía de La Trinidad",
  "cuevas-de-mantetzulel": "$35 + guía por grupo",
  "laguna-media-luna": "$150 + chaleco",
  "zona-arqueologica-tamtoc": "$80 · domingo gratis",
  "la-trinidad-xilitla": "$100",
};

export function costoTarjeta(d: Pick<Destino, "slug" | "precio_entrada" | "precio_entrada_mxn">, en = false): string {
  if (!en && COSTO_TARJETA[d.slug]) return COSTO_TARJETA[d.slug];
  if (d.precio_entrada_mxn === 0) return en ? "Free" : "Gratis";
  const corto = d.precio_entrada.split(/\s\(|\s\+\s|\s·\s|;/)[0].trim();
  if (corto.length <= 30) return corto;
  if (d.precio_entrada_mxn) return `$${d.precio_entrada_mxn}`;
  return en ? "See costs" : "Ver costos";
}
