import { prisma } from "@/lib/prisma";
import { sesionActual } from "./sesion";

export type AccionBitacora =
  | "creó" | "modificó" | "eliminó" | "envió" | "entró" | "intento fallido";

export interface Actor { usuario: string; nombre: string; rol: string }

// Lo que no hizo una persona desde el panel (checkout del sitio, bot, cron).
export const SISTEMA: Actor = { usuario: "sistema", nombre: "Sitio web", rol: "sistema" };

export interface Cambio { campo: string; antes: unknown; despues: unknown }

export interface EventoBitacora {
  accion:      AccionBitacora;
  entidad:     string;   // reserva | cotización | precios | comprobante | panel
  referencia?: string;   // folio visible (HP-…, COT-…)
  resumen:     string;   // el renglón que se lee en el panel
  detalle?:    Cambio[];
  actor?:      Actor;    // por defecto, quien tenga la sesión abierta
}

/**
 * Deja constancia de una acción del panel.
 *
 * Se llama SIN await a propósito en algunos sitios: la bitácora no debe
 * retrasar ni tumbar la operación real. Nunca lanza — si la base falla, el
 * error queda en el log del servidor y la reserva se guarda igual.
 */
export async function registrarEnBitacora(e: EventoBitacora): Promise<void> {
  try {
    const actor = e.actor ?? (await actorDeSesion());
    await prisma.bitacora.create({
      data: {
        usuario:    actor.usuario,
        nombre:     actor.nombre,
        rol:        actor.rol,
        accion:     e.accion,
        entidad:    e.entidad,
        referencia: e.referencia ?? null,
        resumen:    e.resumen,
        detalle:    e.detalle && e.detalle.length ? (e.detalle as any) : undefined,
      },
    });
  } catch (err: any) {
    console.error("bitácora (no se pudo registrar):", err?.message);
  }
}

async function actorDeSesion(): Promise<Actor> {
  const s = await sesionActual();
  if (!s) return { usuario: "desconocido", nombre: "Desconocido", rol: "?" };
  return { usuario: s.user, nombre: s.nombre, rol: s.rol };
}

// ── Comparar antes/después ──────────────────────────────────────────────────

// Nombre legible de cada campo. Lo que no esté aquí no se registra como cambio:
// así la bitácora no se llena de columnas internas (updatedAt, ids, JSON crudo).
export const ETIQUETAS_RESERVA: Record<string, string> = {
  tourName:           "tour",
  tourDate:           "fecha del tour",
  adults:             "adultos",
  children:           "niños",
  totalAmount:        "total",
  depositoPagado:     "anticipo pagado",
  promoCode:          "código promo",
  promoDiscount:      "descuento",
  customerName:       "nombre del cliente",
  customerEmail:      "correo",
  customerPhone:      "teléfono",
  notes:              "notas",
  status:             "estado",
  origen:             "origen",
  pagoProveedor:      "pago al proveedor",
  pagoProveedorMonto: "monto al proveedor",
  pagoProveedorNota:  "nota del proveedor",
};

export const ETIQUETAS_COTIZACION: Record<string, string> = {
  tourName:      "tour",
  tourDate:      "fecha del tour",
  adults:        "adultos",
  children:      "niños",
  totalAmount:   "total",
  customerName:  "nombre del cliente",
  customerEmail: "correo",
  customerPhone: "teléfono",
  notes:         "notas",
  status:        "estado",
};

export function camposCambiados(
  antes: Record<string, any> | null,
  despues: Record<string, any>,
  etiquetas: Record<string, string>,
): Cambio[] {
  if (!antes) return [];
  const cambios: Cambio[] = [];
  for (const [campo, etiqueta] of Object.entries(etiquetas)) {
    if (!(campo in despues)) continue;
    const a = normaliza(antes[campo]);
    const d = normaliza(despues[campo]);
    if (a !== d) cambios.push({ campo: etiqueta, antes: antes[campo] ?? null, despues: despues[campo] ?? null });
  }
  return cambios;
}

function normaliza(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

// Dinero en pesos, para los renglones del resumen.
export function pesos(n: number | null | undefined): string {
  return `$${Math.round(Number(n) || 0).toLocaleString("es-MX")}`;
}
