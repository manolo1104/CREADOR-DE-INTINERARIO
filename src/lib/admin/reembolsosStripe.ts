// Reembolsos y contracargos que avisa Stripe (lote 3 de la auditoría, 5 nov 2026).
//
// 🔴 Antes el webhook no escuchaba `charge.refunded` ni `charge.dispute.created`:
// Manolo devolvía dinero en el panel de Stripe (un viajero solo que no se juntó
// con ningún grupo, una cancelación con 48 h) y el cobro seguía vivo en el
// panel: el depósito, «Liquidado», Ventas y el corte contaban dinero que ya
// había salido. Ahora:
//  · reembolso COMPLETO de un pago con un único cobro de ese importe → el cobro
//    se anula solo («Reembolso en Stripe») y Manolo recibe el aviso;
//  · reembolso parcial, o un pago que no cuadra con un solo cobro → el cobro se
//    marca en su nota y Manolo recibe qué hacer (anular y registrar lo que se
//    quedó): un cobro se anula entero, así que eso lo decide una persona;
//  · contracargo → el cobro se marca (el banco todavía decide) y Manolo recibe
//    el plazo para responder en Stripe.
// Solo actúa sobre pagos que el panel conoce (una reserva o una liga suya).
// Para que Stripe mande estos avisos hay que suscribir esos dos eventos en el
// endpoint del webhook (panel de Stripe → Desarrolladores → Webhooks).

import type Stripe from "stripe";
import type { Movimiento } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hoyMX, ymdMX } from "@/lib/dates";
import { anularCobro } from "@/lib/admin/cobros";
import { registrarEnBitacora, pesos, type Actor } from "@/lib/admin/bitacora";
import { crearSeguimientoUnico } from "@/lib/admin/linksPago";
import { decidirReembolso, tituloContracargo, tituloReembolso, unicoCobroVivoDe } from "@/lib/admin/ligasReglas";

/** Quién firma en la bitácora lo que hace Stripe solo. */
const STRIPE: Actor = { usuario: "stripe", nombre: "Stripe", rol: "sistema" };

const idDe = (x: string | { id: string } | null | undefined): string | null => (typeof x === "string" ? x : x?.id ?? null);

/**
 * Los cobros (renglones) de un pago de Stripe y la reserva o liga a la que
 * pertenece. Primero por la referencia exacta (`stripeRef`, desde el 5 nov
 * 2026); si no, la reserva que se pagó en el sitio con ese PaymentIntent y sus
 * cobros de Stripe sin referencia (los de antes).
 */
async function pagoDelPanel(paymentIntentId: string) {
  let cobros: Movimiento[] = await prisma.movimiento.findMany({ where: { tipo: "cobro", stripeRef: paymentIntentId } });
  const liga = await prisma.linkPago.findFirst({ where: { stripePaymentIntentId: paymentIntentId } });
  let reservaId: string | null = cobros[0]?.reservaId ?? liga?.reservaId ?? null;
  if (!cobros.length && !liga) {
    const b = await prisma.tourBooking.findUnique({ where: { stripePaymentIntentId: paymentIntentId }, select: { id: true } });
    if (b) {
      reservaId = b.id;
      cobros = await prisma.movimiento.findMany({
        where: { tipo: "cobro", reservaId: b.id, metodoPago: "stripe", OR: [{ stripeRef: null }, { stripeRef: paymentIntentId }] },
      });
    }
  }
  const reserva = reservaId
    ? await prisma.tourBooking.findUnique({ where: { id: reservaId }, select: { id: true, confirmationNumber: true, customerName: true, oportunidadId: true } })
    : null;
  return { cobros, reserva, liga };
}

/** Deja una marca en la nota del cobro (una sola vez). */
async function marcarCobro(c: Movimiento, marca: string): Promise<void> {
  if ((c.nota ?? "").includes(marca)) return;
  await prisma.movimiento.update({ where: { id: c.id }, data: { nota: `${marca} ${c.nota ?? ""}`.trim().slice(0, 300) } });
}

/** `charge.refunded`: Stripe devolvió todo o parte de un pago. */
export async function manejarReembolso(cargo: Stripe.Charge): Promise<void> {
  const pi = idDe(cargo.payment_intent);
  if (!pi || !cargo.amount_refunded) return;
  const { cobros, reserva, liga } = await pagoDelPanel(pi);
  if (!reserva && !liga) return; // no es un pago del panel (otro producto de la cuenta)

  const montoCargo = Math.round(cargo.amount / 100);
  const reembolsado = Math.round(cargo.amount_refunded / 100);
  const lista = cobros.map(c => ({ id: c.id, monto: c.monto, anulado: c.anulado }));
  // Si un intento anterior ya lo anuló por ESTE reembolso, no se decide de nuevo
  // (el aviso sí se vuelve a intentar: pudo fallar justo después).
  const yaAnulado = cobros.find(c => c.anulado && (c.motivoAnulacion ?? "").includes(cargo.id));
  const d = yaAnulado ? { accion: "anular" as const, cobroId: yaAnulado.id } : decidirReembolso({ cobros: lista, cargo: montoCargo, reembolsado });

  if (d.accion === "anular" && !yaAnulado) {
    await anularCobro(d.cobroId, `Reembolso en Stripe (${hoyMX()}) · ${cargo.id}`, STRIPE.nombre, STRIPE);
  } else if (d.accion === "avisar") {
    // No se puede anular solo: se marca el cobro de ese pago, si es uno claro.
    const c = unicoCobroVivoDe(lista, montoCargo);
    const fila = c ? cobros.find(x => x.id === c.id) : null;
    if (fila) await marcarCobro(fila, `⚠️ Stripe devolvió ${pesos(reembolsado)} de este pago.`);
  }

  const titulo = tituloReembolso(d, { folio: reserva?.confirmationNumber ?? null, cliente: reserva?.customerName ?? liga?.cliente ?? null, cargo: montoCargo, reembolsado });
  if (titulo) {
    await crearSeguimientoUnico({
      titulo, clave: `reembolso:${cargo.id}:${cargo.amount_refunded}`, regla: "reembolso-stripe",
      oportunidadId: reserva?.oportunidadId ?? null, creadaPor: "Stripe",
    });
  }
  await registrarEnBitacora({
    accion: "modificó", entidad: "cobro", referencia: reserva?.confirmationNumber, actor: STRIPE,
    resumen: `Stripe devolvió ${pesos(reembolsado)} de un pago de ${pesos(montoCargo)}${reserva ? ` de la reserva ${reserva.confirmationNumber}` : ""}: ${
      d.accion === "anular" ? "su cobro se anuló solo" : d.accion === "nada" ? "su cobro ya estaba anulado" : "queda en seguimiento para Manolo"}`,
  });
}

/** `charge.dispute.created`: el cliente desconoció el pago en su banco. */
export async function manejarContracargo(disputa: Stripe.Dispute): Promise<void> {
  const pi = idDe(disputa.payment_intent);
  if (!pi) return;
  const { cobros, reserva, liga } = await pagoDelPanel(pi);
  if (!reserva && !liga) return;

  const monto = Math.round(disputa.amount / 100);
  const venceEl = disputa.evidence_details?.due_by ? ymdMX(new Date(disputa.evidence_details.due_by * 1000)) : null;
  // Se marca (no se anula): el banco todavía decide si el dinero vuelve.
  const lista = cobros.map(c => ({ id: c.id, monto: c.monto, anulado: c.anulado }));
  const c = unicoCobroVivoDe(lista, monto) ?? (lista.filter(x => !x.anulado).length === 1 ? lista.find(x => !x.anulado)! : null);
  const fila = c ? cobros.find(x => x.id === c.id) : null;
  if (fila) await marcarCobro(fila, `⚠️ Contracargo abierto en Stripe (${hoyMX()}).`);

  await crearSeguimientoUnico({
    titulo: tituloContracargo({ folio: reserva?.confirmationNumber ?? null, cliente: reserva?.customerName ?? liga?.cliente ?? null, monto, venceEl }),
    clave: `contracargo:${disputa.id}`, regla: "contracargo-stripe",
    oportunidadId: reserva?.oportunidadId ?? null, creadaPor: "Stripe",
  });
  await registrarEnBitacora({
    accion: "modificó", entidad: "cobro", referencia: reserva?.confirmationNumber, actor: STRIPE,
    resumen: `Contracargo en Stripe por ${pesos(monto)}${reserva ? ` de la reserva ${reserva.confirmationNumber}` : ""}${venceEl ? `: responder antes del ${venceEl}` : ""}`,
  });
}
