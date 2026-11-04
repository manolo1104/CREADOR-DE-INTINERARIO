// Rutas y protocolos + Proveedores (Fase 1, 4 nov 2026). Puro: limpia lo que
// llega del navegador antes de guardarlo. Lo usan las rutas de la API, la
// salida del día y las pruebas.
import { normalizarTelefono } from "./crm";

export interface Parada { hora: string; lugar: string; detalle: string }
export interface PrecioProveedor { temporada: string; concepto: string; precio: number; porPersona: boolean }

export const SERVICIOS_PROVEEDOR = [
  { clave: "canoas", etiqueta: "Canoas / lanchas" },
  { clave: "alimentos", etiqueta: "Alimentos" },
  { clave: "hospedaje", etiqueta: "Hospedaje" },
  { clave: "transporte", etiqueta: "Transporte" },
  { clave: "guia", etiqueta: "Guía" },
  { clave: "equipo", etiqueta: "Equipo" },
  { clave: "entradas", etiqueta: "Entradas" },
  { clave: "otro", etiqueta: "Otro" },
] as const;
export const etiquetaServicio = (s: string) => SERVICIOS_PROVEEDOR.find(x => x.clave === s)?.etiqueta ?? s;

const txt = (v: unknown, max: number) => { const t = String(v ?? "").trim().slice(0, max); return t || null; };

/** Paradas: hora HH:MM opcional, lugar obligatorio; máximo 30; en el orden en que llegan. */
export function limpiarParadas(raw: unknown): Parada[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 30).map(p => {
    const o = (p ?? {}) as Record<string, unknown>;
    const h = String(o.hora ?? "").trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
    return { hora: h ? `${h[1].padStart(2, "0")}:${h[2]}` : "", lugar: txt(o.lugar, 120) ?? "", detalle: txt(o.detalle, 400) ?? "" };
  }).filter(p => p.lugar);
}

export interface RutaGuardable {
  paradas: Parada[]; puntoEncuentro: string | null; guion: string | null; seguridad: string | null;
  planB: string | null; queLlevar: string | null; notas: string | null; proveedores: string[];
}

export function limpiarRuta(b: Record<string, unknown>, proveedoresValidos: string[]): RutaGuardable {
  return {
    paradas: limpiarParadas(b.paradas),
    puntoEncuentro: txt(b.puntoEncuentro, 200),
    guion: txt(b.guion, 8000),
    seguridad: txt(b.seguridad, 3000),
    planB: txt(b.planB, 3000),
    queLlevar: txt(b.queLlevar, 2000),
    notas: txt(b.notas, 2000),
    proveedores: Array.isArray(b.proveedores) ? Array.from(new Set(b.proveedores.map(String).filter(id => proveedoresValidos.includes(id)))).slice(0, 20) : [],
  };
}

/** Qué tan completa está la ficha de un tour (para la lista: lo que falta se ve). */
export function avanceRuta(r: Partial<RutaGuardable> | null): { hechos: number; total: number; falta: string[] } {
  const partes: [string, boolean][] = [
    ["paradas", !!r?.paradas?.length], ["punto de encuentro", !!r?.puntoEncuentro], ["guion", !!r?.guion],
    ["seguridad", !!r?.seguridad], ["plan B", !!r?.planB], ["qué llevar", !!r?.queLlevar], ["proveedores", !!r?.proveedores?.length],
  ];
  return { hechos: partes.filter(p => p[1]).length, total: partes.length, falta: partes.filter(p => !p[1]).map(p => p[0]) };
}

export function limpiarPrecios(raw: unknown): PrecioProveedor[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 30).map(p => {
    const o = (p ?? {}) as Record<string, unknown>;
    const n = Math.round(Number(o.precio));
    return { temporada: txt(o.temporada, 60) ?? "Todo el año", concepto: txt(o.concepto, 80) ?? "", precio: Number.isFinite(n) && n >= 0 && n <= 1_000_000 ? n : 0, porPersona: o.porPersona !== false };
  }).filter(p => p.concepto);
}

export interface ProveedorGuardable {
  nombre: string; servicio: string; contacto: string | null; telefono: string | null; correo: string | null;
  precios: PrecioProveedor[]; tours: string[]; notas: string | null; activo: boolean;
}

/** Valida un proveedor. Lanza Error con el mensaje para el panel si algo no sirve. */
export function limpiarProveedor(b: Record<string, unknown>, slugsValidos: string[]): ProveedorGuardable {
  const nombre = txt(b.nombre, 120);
  if (!nombre) throw new Error("Falta el nombre del proveedor.");
  const telCrudo = txt(b.telefono, 30);
  const telefono = telCrudo ? normalizarTelefono(telCrudo) : null;
  if (telCrudo && !telefono) throw new Error("Ese teléfono no parece válido (10 dígitos, o con +país).");
  const correo = txt(b.correo, 160)?.toLowerCase() ?? null;
  if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) throw new Error("Ese correo no parece válido.");
  const servicio = SERVICIOS_PROVEEDOR.some(s => s.clave === b.servicio) ? String(b.servicio) : "otro";
  return {
    nombre, servicio, contacto: txt(b.contacto, 120), telefono, correo,
    precios: limpiarPrecios(b.precios),
    tours: Array.isArray(b.tours) ? Array.from(new Set(b.tours.map(String).filter(s => slugsValidos.includes(s)))) : [],
    notas: txt(b.notas, 2000), activo: b.activo !== false,
  };
}
