import type { Metadata } from "next";
import Link from "next/link";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { confirmarPasaje, esPagoDelViaje } from "@/lib/viajeCdmx/confirmar";
import { registrarFichaOxxo } from "@/lib/viajeCdmx/apartar";
import { diaMX, pesos, rangoLargo } from "@/lib/viajeCdmx/precio";
import { VIAJE_RUTA } from "@/lib/viajeCdmx/config";

/**
 * A donde vuelve Stripe si el pago necesitó salir de la página (un banco que
 * pide su propia pantalla). Lo normal es que el apartado se confirme sin salir;
 * esto es la red. El estado se le pregunta a Stripe: la URL no decide nada.
 */
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tu lugar · Viaje CDMX–Xilitla", robots: { index: false, follow: false } };

type Vista =
  | { tipo: "pagado"; folio: string; fechas: string; personas: number; anticipo: number; saldo: number }
  | { tipo: "oxxo"; voucherUrl: string | null; vence: string; anticipo: number }
  | { tipo: "procesando" }
  | { tipo: "nada" };

async function estado(piId: string): Promise<Vista> {
  if (!/^pi_[A-Za-z0-9]+$/.test(piId)) return { tipo: "nada" };
  try {
    const pi = await stripe.paymentIntents.retrieve(piId);
    if (!esPagoDelViaje(pi)) return { tipo: "nada" };
    if (pi.status === "succeeded") {
      const r = await confirmarPasaje(pi, "pantalla");
      if (r.estado !== "creada" && r.estado !== "ya-existia") return { tipo: "procesando" };
      const s = r.reserva.salidaId ? await prisma.salidaGrupal.findUnique({ where: { id: r.reserva.salidaId } }) : null;
      const anticipo = Math.round((pi.amount_received || pi.amount) / 100);
      return {
        tipo: "pagado",
        folio: r.reserva.confirmationNumber,
        fechas: s ? rangoLargo(s.fechaSalida, s.fechaRegreso) : r.reserva.tourDate,
        personas: r.reserva.adults,
        anticipo,
        saldo: Math.max(0, r.reserva.totalAmount - anticipo),
      };
    }
    if (pi.status === "requires_action" && pi.next_action?.oxxo_display_details) {
      const f = await registrarFichaOxxo(pi);
      if (f.estado === "ficha") return { tipo: "oxxo", voucherUrl: f.voucherUrl, vence: f.vence.toISOString(), anticipo: f.apartado.anticipo };
    }
    if (pi.status === "processing") return { tipo: "procesando" };
  } catch (e) {
    logger.error("viaje_cdmx_confirmacion_fallo", { pi: piId, reason: e instanceof Error ? e.message : String(e) });
    return { tipo: "procesando" };
  }
  return { tipo: "nada" };
}

export default async function Confirmacion({ searchParams }: { searchParams: { payment_intent?: string } }) {
  const v = await estado(String(searchParams.payment_intent ?? ""));
  return (
    <main id="main-content" className="min-h-screen bg-negro px-4 pt-32 pb-20">
      <div className="max-w-lg mx-auto bg-crema text-verde-profundo p-6 sm:p-8">
        {v.tipo === "pagado" && (
          <>
            <p className="text-[10px] tracking-[3px] uppercase font-dm text-verde-selva mb-2">Listo</p>
            <h1 className="font-cormorant text-4xl leading-tight mb-4">Tu lugar está apartado</h1>
            <dl className="border border-verde-profundo/15 divide-y divide-verde-profundo/10 text-sm font-dm mb-4">
              <div className="flex justify-between px-4 py-3"><dt>Folio</dt><dd className="font-medium">{v.folio}</dd></div>
              <div className="flex justify-between px-4 py-3"><dt>Fechas</dt><dd>{v.fechas}</dd></div>
              <div className="flex justify-between px-4 py-3"><dt>Viajeros</dt><dd>{v.personas}</dd></div>
              <div className="flex justify-between px-4 py-3"><dt>Pagaste</dt><dd>{pesos(v.anticipo)}</dd></div>
              <div className="flex justify-between px-4 py-3"><dt>Resto</dt><dd>{pesos(v.saldo)}</dd></div>
            </dl>
            <p className="text-sm font-dm text-verde-profundo/70">Te mandamos la confirmación por correo.</p>
          </>
        )}
        {v.tipo === "oxxo" && (
          <>
            <h1 className="font-cormorant text-4xl leading-tight mb-3">Paga tu ficha en OXXO</h1>
            <p className="text-sm font-dm text-verde-profundo/75 mb-4">Tu lugar queda apartado mientras pagas {pesos(v.anticipo)} antes del {diaMX(v.vence)}.</p>
            {v.voucherUrl && <a href={v.voucherUrl} className="inline-flex items-center justify-center w-full min-h-[52px] bg-dorado text-negro text-[12px] tracking-[2px] uppercase font-dm">Ver mi ficha OXXO</a>}
          </>
        )}
        {v.tipo === "procesando" && (
          <>
            <h1 className="font-cormorant text-4xl leading-tight mb-3">Estamos confirmando tu pago</h1>
            <p className="text-sm font-dm text-verde-profundo/75">En unos minutos te llega la confirmación por correo.</p>
          </>
        )}
        {v.tipo === "nada" && (
          <>
            <h1 className="font-cormorant text-4xl leading-tight mb-3">No encontramos ese pago</h1>
            <p className="text-sm font-dm text-verde-profundo/75">Si ya pagaste, revisa tu correo o escríbenos por WhatsApp con tu nombre.</p>
          </>
        )}
        <Link href={VIAJE_RUTA} className="block text-center text-xs font-dm text-verde-selva underline underline-offset-4 mt-6">Volver al viaje</Link>
      </div>
    </main>
  );
}
