/**
 * Relación destino → tours.
 *
 * `relacion: "incluye"` (por defecto) = el tour VISITA ese destino. Sale del
 * campo `destinos` de cada tour en `tours.ts` — no se inventa.
 *
 * `relacion: "cerca"`  = el tour NO lo visita, pero opera en la misma zona y se
 * puede combinar. Sirve para no dejar sin producto a los 26 destinos que antes
 * caían en un CTA de solo-WhatsApp, sin mentirle al cliente sobre el itinerario.
 *
 * La distinción importa fuera del sitio: el bot de WhatsApp
 * (`src/scripts/export-bot-data.ts`) solo usa los "incluye" como tours que
 * visitan el lugar. Tras editar este archivo hay que regenerar su cerebro:
 *   npx tsx src/scripts/export-bot-data.ts
 */

export type TourRef = {
  nombre: string;
  slug: string;
  relacion?: "incluye" | "cerca";
};

const T = {
  tamul:      { nombre: "Expedición Tamul",  slug: "expedicion-tamul" },
  rappel:     { nombre: "Rappel en Tamul",   slug: "rappel-tamul" },
  rafting:    { nombre: "Rafting en el Tampaón", slug: "rafting-rio-tampaon" },
  surrealista:{ nombre: "Ruta Surrealista",  slug: "ruta-surrealista-edward-james" },
  rzr:        { nombre: "RZR por Xilitla",   slug: "rzr-xilitla" },
  meco:       { nombre: "Cascadas del Meco", slug: "cascadas-del-meco" },
  paraiso:    { nombre: "Paraíso Escalonado", slug: "paraiso-escalonado-minas-micos" },
  acuatica:   { nombre: "Ruta Acuática",     slug: "ruta-acuatica-puente-de-dios" },
  buceo:      { nombre: "Descubre el Buceo", slug: "buceo-media-luna" },
} as const;

/** Marca una referencia como "cerca" (el tour no visita el destino). */
const cerca = (t: { nombre: string; slug: string }): TourRef => ({ ...t, relacion: "cerca" });

export const DESTINO_EN_TOURS: Record<string, TourRef[]> = {
  // ── Aquismón ──────────────────────────────────────────────────────────────
  "cascada-de-tamul":               [T.tamul, T.rappel],
  "sotano-de-las-huahuas":          [T.tamul],
  "sotano-de-las-golondrinas":      [T.tamul],
  "rio-tampaon-rafting":            [T.rafting, T.rappel],
  "nacimiento-tambaque":            [cerca(T.tamul), cerca(T.rafting)],
  "cuevas-de-mantetzulel":          [cerca(T.tamul)],
  "aquismon-pueblo-magico":         [cerca(T.tamul), cerca(T.rafting)],

  // ── Xilitla ───────────────────────────────────────────────────────────────
  "las-pozas-jardin-surrealista":   [T.surrealista, cerca(T.rzr)],
  "xilitla-pueblo-magico":          [T.surrealista, T.rzr],
  "nacimiento-huichihuayan":        [T.surrealista, T.rzr],
  "la-trinidad-xilitla":            [T.rzr],
  "cascada-los-comales":            [cerca(T.surrealista), cerca(T.rzr)],
  "olla-de-la-luz":                 [cerca(T.rzr), cerca(T.surrealista)],
  "cueva-del-salitre":              [cerca(T.rzr), cerca(T.surrealista)],
  "museo-leonora-carrington-xilitla": [cerca(T.surrealista), cerca(T.rzr)],

  // ── Tamasopo ──────────────────────────────────────────────────────────────
  "puente-de-dios-tamasopo":        [T.acuatica],
  "cascadas-de-tamasopo":           [T.acuatica],
  "siete-cascadas-tamasopo":        [T.acuatica],
  "hacienda-los-gomez-tamasopo":    [T.acuatica],
  "cascada-el-aguacate":            [cerca(T.acuatica)],
  "cascada-el-trampolin-tamasopo":  [cerca(T.acuatica)],

  // ── El Naranjo ────────────────────────────────────────────────────────────
  "cascada-el-meco":                [T.meco],
  "cascada-el-salto":               [T.meco],
  "cascadas-minas-viejas":          [T.paraiso],

  // ── Ciudad Valles ─────────────────────────────────────────────────────────
  "cascadas-de-micos":              [T.paraiso],
  "balneario-taninul":              [cerca(T.paraiso), cerca(T.rafting)],

  // ── Rioverde ──────────────────────────────────────────────────────────────
  "laguna-media-luna":              [T.buceo],

  // ── Tamuín ────────────────────────────────────────────────────────────────
  "zona-arqueologica-tamtoc":               [cerca(T.rafting), cerca(T.paraiso)],
  "zona-arqueologica-tamohi-el-consuelo":   [cerca(T.rafting), cerca(T.paraiso)],

  // ── Axtla de Terrazas ─────────────────────────────────────────────────────
  "castillo-de-la-salud":           [T.surrealista],
  "rio-axtla-el-chalan":            [cerca(T.surrealista)],

  // ── Sur de la Huasteca (cerca de Xilitla) ─────────────────────────────────
  "voladores-tamaleton":            [cerca(T.surrealista)],
  "tancanhuitz":                    [cerca(T.surrealista)],
  "texquitote":                     [cerca(T.surrealista)],
  "san-martin-chalchicuautla":      [cerca(T.surrealista)],
  "templo-san-juan-bautista-coxcatlan":          [cerca(T.surrealista)],
  "cascada-rancho-el-zapote-poza-azul-coxcatlan":[cerca(T.surrealista)],
  "ruinas-de-el-jopoy-coxcatlan":                [cerca(T.surrealista)],

  // ── Planicie / norte (cerca de Ciudad Valles) ─────────────────────────────
  "san-vicente-tancuayalab":        [cerca(T.rafting)],
  "tanlajas":                       [cerca(T.rafting)],
  "laguna-de-los-suspiros":         [cerca(T.rafting)],
};

/** Tours que de verdad visitan el destino. */
export function toursQueIncluyen(slug: string): TourRef[] {
  return (DESTINO_EN_TOURS[slug] ?? []).filter((t) => t.relacion !== "cerca");
}

/** Tours de la misma zona que no visitan el destino pero se pueden combinar. */
export function toursCercaDe(slug: string): TourRef[] {
  return (DESTINO_EN_TOURS[slug] ?? []).filter((t) => t.relacion === "cerca");
}
