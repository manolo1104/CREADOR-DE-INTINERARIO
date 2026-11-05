// La conciliación de las ligas de pago (lote 3 de la auditoría, 5 nov 2026).
//
// 🔴 Una liga solo pasaba a «pagada» por el webhook. Si el aviso no llegaba
// (un despliegue, la base caída, o el endpoint de la cuenta nueva sin
// `checkout.session.completed`), el dinero entraba a Stripe y el panel seguía
// pidiendo cobrarlo: la regla «liga sin pagar 24 h» le pedía a Erick
// recordárselo al cliente y, pasado el viaje, «Saldo vencido» se lo pedía a
// Manolo. La corre el cron de conciliar pagos (cada hora):
//  1. a cada liga activa (y a las apagadas en los últimos días: el cliente pudo
//     pagarla justo antes) se le pregunta a Stripe si se pagó; si sí, se
//     registra como lo haría el webhook;
//  2. una liga activa sin pagar cuyo objeto ya no existe (cotización borrada o
//     vencida, reserva cancelada o pagada) se apaga: es la red de seguridad de
//     los caminos que la apagan al momento.
// Sin llave de Stripe no hace nada; las pruebas usan un doble (`usarStripeDePrueba`).

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { accionDeConciliacion, tituloLigaDeOtraCuenta } from "./ligasReglas";
import { apagarLiga, crearSeguimientoUnico, hechosDeLigas, marcarLinkPagado, puertoStripe } from "./linksPago";

/** Las ligas activas de hasta estos días se revisan; las más viejas ya no se mandan. */
export const DIAS_LIGAS_ACTIVAS = 60;
/** Las apagadas en estos días también: se pudieron pagar en el último momento. */
export const DIAS_LIGAS_APAGADAS = 3;

export interface ResultadoConciliacionLigas {
  revisadas: number;
  /** Pagadas en Stripe sin registrar: se registraron ahora. */
  registradas: number;
  /** Activas que ya no tenían qué cobrar: se apagaron. */
  apagadas: number;
  /** Activas que Stripe no encuentra en la cuenta actual. */
  otraCuenta: number;
  errores: number;
  omitido?: string;
}

export async function conciliarLigas(ahora: Date = new Date(), { dry = false } = {}): Promise<ResultadoConciliacionLigas> {
  const r: ResultadoConciliacionLigas = { revisadas: 0, registradas: 0, apagadas: 0, otraCuenta: 0, errores: 0 };
  const puerto = puertoStripe();
  if (!puerto) return { ...r, omitido: "Sin llave de Stripe: no se revisaron las ligas." };

  const ligas = await prisma.linkPago.findMany({
    where: {
      OR: [
        { estado: "activo", createdAt: { gte: new Date(ahora.getTime() - DIAS_LIGAS_ACTIVAS * 86_400_000) } },
        { estado: "cancelado", updatedAt: { gte: new Date(ahora.getTime() - DIAS_LIGAS_APAGADAS * 86_400_000) } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  if (!ligas.length) return r;
  const hechos = await hechosDeLigas(ligas);

  for (const l of ligas) {
    r.revisadas++;
    try {
      const a = accionDeConciliacion(l, await puerto.sesionesPagadas(l.stripeLinkId), hechos.get(l.id));
      if (a.accion === "registrar") {
        if (!dry) {
          await marcarLinkPagado(l.stripeLinkId, a.sesion.id, Math.round(a.sesion.montoCentavos / 100), a.sesion.correo, a.sesion.paymentIntentId);
          logger.warn("liga_pagada_sin_aviso", { liga: l.id, sesion: a.sesion.id });
        }
        r.registradas++;
      } else if (a.accion === "apagar") {
        if (!dry && (await apagarLiga(l, a.motivo)) === "fallo") { r.errores++; continue; }
        r.apagadas++;
      } else if (a.accion === "otra-cuenta") {
        if (!dry) {
          await crearSeguimientoUnico({
            titulo: tituloLigaDeOtraCuenta({ titulo: l.titulo, cliente: l.cliente, monto: l.monto }),
            clave: `liga-otra-cuenta:${l.id}`, regla: "liga-otra-cuenta",
          });
        }
        r.otraCuenta++;
      }
    } catch (e) {
      r.errores++;
      logger.error("conciliar_liga_fallo", { liga: l.id, reason: e instanceof Error ? e.message : String(e) });
    }
  }
  return r;
}
