// Lo que le llega al navegador del GUÍA (lote 8, 10 nov 2026). Puro.
//
// Decisión de Manolo: el guía ve sus salidas de AYER a 7 días adelante y nunca
// dinero. 🔴 Antes la lista de Salidas del día dejaba ir a cualquier fecha (con
// las flechas o tecleando ?fecha=) y la ficha mandaba al navegador lo cobrado
// de cada reserva aunque la pantalla no lo pintara: bastaba abrir las
// herramientas del navegador para verlo. Aquí se quita ANTES de mandarlo.

import { addDaysYMD } from "@/lib/dates";
import { numerosDeSalida } from "./salidas";
import type { SalidaOperativa } from "./salidasDia";

/** Cuántos días hacia atrás y hacia adelante ve el guía. */
export const VENTANA_GUIA = { atras: 1, adelante: 7 } as const;

export function ventanaDelGuia(hoy: string): { desde: string; hasta: string } {
  return { desde: addDaysYMD(hoy, -VENTANA_GUIA.atras), hasta: addDaysYMD(hoy, VENTANA_GUIA.adelante) };
}

/** ¿El guía puede ver (o tocar) una salida de esta fecha? */
export function fechaVisibleAlGuia(fecha: string, hoy: string): boolean {
  const { desde, hasta } = ventanaDelGuia(hoy);
  return /^\d{4}-\d{2}-\d{2}$/.test(fecha) && fecha >= desde && fecha <= hasta;
}

/** La fecha que se le enseña: la pedida si cae en su ventana; si no, la orilla más cercana. */
export function fechaParaGuia(pedida: string, hoy: string): string {
  const { desde, hasta } = ventanaDelGuia(hoy);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(pedida)) return hoy;
  return pedida < desde ? desde : pedida > hasta ? hasta : pedida;
}

/**
 * La salida tal como se manda al navegador.
 *  - Sin dinero (quien no tiene el Cotizador, Erick incluido): sin costos,
 *    margen, precio de simulación ni ingreso de extras (lo de antes, 4 nov).
 *  - Guía, además: sin lo cobrado de la salida ni de cada reserva. Solo queda
 *    el saldo que se le cobra HOY en sitio, porque es quien lo recibe (si
 *    Manolo prefiere que tampoco lo vea, se quita aquí).
 */
export function salidaParaNavegador(s: SalidaOperativa, o: { verDinero: boolean; esGuia: boolean }): SalidaOperativa {
  if (o.verDinero && !o.esGuia) return s;
  const sinCostos: SalidaOperativa = {
    ...s, conceptos: [], precioPorPax: 0, ingresoExtras: 0, numeros: numerosDeSalida(0, s.personas, []),
  };
  if (!o.esGuia) return sinCostos;
  return {
    ...sinCostos,
    monto: 0,
    fuenteCostos: null,
    semanaCorte: null,
    pasajeros: s.pasajeros.map(p => ({ ...p, monto: 0, saldo: p.pago === "saldo" ? p.saldo : 0 })),
  };
}

/**
 * Una reserva para el guía en `GET /api/admin/reservas` (solo si Manolo le abre
 * una pestaña que la use): quién, qué tour y cuándo; nada de importes,
 * anticipos, cobros, correo ni teléfono.
 */
export function reservaParaGuia(b: {
  id: string; confirmationNumber: string; customerName: string; tourName: string; tourSlug: string;
  tourDate: string; adults: number; children: number; status: string; createdAt: Date | string;
}) {
  return {
    id: b.id, confirmationNumber: b.confirmationNumber, customerName: b.customerName, tourName: b.tourName,
    tourSlug: b.tourSlug, tourDate: b.tourDate, adults: b.adults, children: b.children, status: b.status, createdAt: b.createdAt,
  };
}
