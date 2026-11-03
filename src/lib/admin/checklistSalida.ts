// El checklist antes de salir (prompt del rediseño, 3 nov 2026): base para
// todos los tours más lo propio de cada uno. Se guarda en `Salida.checklist`
// solo lo tocado (hecho, quién, cuándo) y lo agregado a mano; el texto base
// vive aquí para poder mejorarlo sin migrar nada.

export interface ItemChecklist {
  clave: string;
  texto: string;
  hecho: boolean;
  /** Quién lo marcó y cuándo (ISO). */
  por?: string;
  en?: string;
  /** Agregado a mano en esa salida (no viene de la base). */
  propio?: boolean;
}

export const CHECKLIST_BASE: { clave: string; texto: string }[] = [
  { clave: "vehiculo",         texto: "Vehículo listo: gasolina, llantas, limpio" },
  { clave: "equipo",           texto: "Equipo completo según el tour (chalecos, cascos, cuerdas, lámparas)" },
  { clave: "botiquin",         texto: "Botiquín y seguro a bordo" },
  { clave: "lista-guia",       texto: "Lista de pasajeros enviada al guía" },
  { clave: "proveedores",      texto: "Proveedores confirmados" },
  { clave: "confirmacion-24h", texto: "Confirmación de 24 h enviada a los clientes (punto de encuentro y qué llevar)" },
  { clave: "rio-clima",        texto: "Nivel del río y clima revisados" },
];

/** Lo propio de cada tour, además de la base. */
export const CHECKLIST_POR_TOUR: Record<string, { clave: string; texto: string }[]> = {
  "expedicion-tamul":             [{ clave: "canoas", texto: "Canoas apartadas con el lanchero" }, { clave: "desayunos", texto: "Desayunos pedidos" }],
  "rafting-rio-tampaon":          [{ clave: "balsas", texto: "Balsas y remos revisados" }, { clave: "comida", texto: "Comida pedida" }],
  "rappel-tamul":                 [{ clave: "cuerdas", texto: "Cuerdas y arneses revisados (fecha de revisión)" }],
  "ruta-surrealista-edward-james":[{ clave: "boletos", texto: "Boletos de Las Pozas (se pagan en taquilla)" }],
  "gruta-de-xilo":                [{ clave: "lamparas", texto: "Lámparas cargadas y de repuesto" }],
  "rzr-xilitla":                  [{ clave: "unidades", texto: "Unidades RZR con gasolina y revisadas" }],
};

const limpio = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/** Lo guardado, saneado: solo claves, hecho, quién, cuándo y texto de los propios. */
export function limpiarChecklist(raw: unknown): ItemChecklist[] {
  if (!Array.isArray(raw)) return [];
  const out: ItemChecklist[] = [];
  for (const it of raw) {
    if (!it || typeof it !== "object") continue;
    const i = it as Record<string, unknown>;
    const clave = limpio(i.clave, 60);
    if (!clave || out.some(x => x.clave === clave)) continue;
    out.push({
      clave,
      texto: limpio(i.texto, 160),
      hecho: i.hecho === true,
      por: i.por ? limpio(i.por, 60) : undefined,
      en: i.en ? limpio(i.en, 40) : undefined,
      propio: i.propio === true,
    });
  }
  return out.slice(0, 40);
}

/** El checklist completo de una salida: base + lo del tour + lo propio, con lo marcado. */
export function checklistDe(tourSlug: string, guardado: unknown): ItemChecklist[] {
  const marcado = limpiarChecklist(guardado);
  const base = [...CHECKLIST_BASE, ...(CHECKLIST_POR_TOUR[tourSlug] ?? [])];
  const items: ItemChecklist[] = base.map(b => {
    const m = marcado.find(x => x.clave === b.clave);
    return { clave: b.clave, texto: b.texto, hecho: m?.hecho ?? false, por: m?.por, en: m?.en };
  });
  for (const m of marcado) {
    if (m.propio && m.texto && !items.some(x => x.clave === m.clave)) items.push({ ...m, propio: true });
  }
  return items;
}

/** Lo que vale la pena guardar: lo marcado y lo propio (el texto base no). */
export function paraGuardar(items: ItemChecklist[]): ItemChecklist[] {
  return items
    .filter(i => i.hecho || i.propio)
    .map(i => i.propio ? i : { clave: i.clave, texto: "", hecho: i.hecho, por: i.por, en: i.en });
}

export function avanceChecklist(items: ItemChecklist[]): { hechos: number; total: number } {
  return { hechos: items.filter(i => i.hecho).length, total: items.length };
}
