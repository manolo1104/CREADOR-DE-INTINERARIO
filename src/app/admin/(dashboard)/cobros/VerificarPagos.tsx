"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, CreditCard, Landmark } from "lucide-react";
import VerificarCobro from "@/components/admin/VerificarCobro";
import type { TransferenciaPorVerificar } from "@/lib/admin/cobros";

/**
 * «Verificar pagos», arriba de la pestaña Cobros (12 nov 2026).
 *
 * Manolo: «que Erick confirme los pagos, tanto de Stripe como de mi banco
 * Inbursa, desde el panel». Dos tarjetas:
 *  · Transferencias por verificar: las transferencias y depósitos de los
 *    últimos 60 días que nadie ha comprobado contra el banco. Cada una con
 *    «Verificar» (Banxico) y, para Manolo y Martín, «Lo vi en Inbursa».
 *  · Pagos con tarjeta (Stripe): lo que Stripe dice que se cobró en 30 días,
 *    con la reserva que le toca, y los depósitos al banco. Se carga al abrirla
 *    (no en cada visita a la pestaña: cada carga son tres llamadas a Stripe).
 *
 * Verificar no mueve dinero: el cobro ya contaba al registrarse.
 */

interface PagoStripe {
  id: string;
  fecha: string;
  monto: number;
  moneda: string;
  descripcion: string | null;
  anulado: boolean;
  donde: { tipo: "reserva" | "viaje" | "liga"; folio: string; cliente: string | null; id: string | null } | null;
}
interface ResumenStripe {
  sinLlave?: boolean;
  error?: string;
  pagos: PagoStripe[];
  depositos: { id: string; monto: number; moneda: string; llega: string; estado: string }[];
  saldo: { disponible: number; enCamino: number } | null;
}

const fmx = (n: number) => `$${n.toLocaleString("es-MX", { maximumFractionDigits: 2 })}`;
const dia = (s: string) =>
  new Date(s.length === 10 ? `${s}T12:00:00` : s).toLocaleDateString("es-MX", { day: "numeric", month: "short", timeZone: "America/Mexico_City" });
const ESTADO_DEPOSITO: Record<string, string> = {
  paid: "Depositado", pending: "Pendiente", in_transit: "En camino", canceled: "Cancelado", failed: "Falló",
};

export default function VerificarPagos() {
  const [lista, setLista] = useState<TransferenciaPorVerificar[] | null>(null);
  const [puedeAMano, setPuedeAMano] = useState(false);
  const [error, setError] = useState("");
  const [stripeAbierto, setStripeAbierto] = useState(false);
  const [stripe, setStripe] = useState<ResumenStripe | null>(null);
  const [cargandoStripe, setCargandoStripe] = useState(false);

  const cargar = useCallback(() => {
    setError("");
    fetch("/api/admin/cobros/sin-verificar")
      .then(r => r.json())
      .then(d => {
        if (!Array.isArray(d?.lista)) throw new Error(d?.error || "No se pudo cargar");
        setLista(d.lista);
        setPuedeAMano(!!d.puedeVerificarAMano);
      })
      .catch(e => setError(e.message || "No se pudo cargar"));
  }, []);
  useEffect(cargar, [cargar]);

  function abrirStripe() {
    setStripeAbierto(v => !v);
    if (stripe || cargandoStripe) return;
    setCargandoStripe(true);
    fetch("/api/admin/stripe/resumen")
      .then(r => r.json())
      .then(setStripe)
      .catch(() => setStripe({ error: "Stripe no respondió", pagos: [], depositos: [], saldo: null }))
      .finally(() => setCargandoStripe(false));
  }

  const sinRegistrar = stripe?.pagos.filter(p => !p.donde).length ?? 0;

  return (
    <div className="panel-card panel-card-alta p-5 mb-6">
      <div className="flex items-start justify-between gap-3 mb-1">
        <h2 className="font-cormorant text-[#16362a] text-lg font-light">Verificar pagos</h2>
        <button type="button" onClick={cargar} title="Volver a cargar"
          className="panel-foco text-[#1B4332]/40 hover:text-[#1B4332] w-9 h-9 -m-2 grid place-items-center">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
      <p className="text-[rgba(22,54,42,0.66)] font-dm text-sm mb-4">
        Que el dinero de verdad llegó. Las transferencias se verifican con Banxico (clave de rastreo del comprobante); las de tarjeta las confirma Stripe solo.
      </p>

      {/* ── Transferencias ─────────────────────────────────────────────── */}
      <div className="mb-5">
        <p className="panel-eyebrow mb-2 flex items-center gap-1.5">
          <Landmark className="w-3.5 h-3.5" aria-hidden="true" />
          Transferencias y depósitos por verificar
          {lista && <span className="text-[#1B4332]/40">· {lista.length}</span>}
        </p>
        {error && <p className="text-xs font-dm text-red-700">{error}</p>}
        {!lista && !error && <p className="text-xs font-dm text-[#1B4332]/40">Cargando…</p>}
        {lista && lista.length === 0 && (
          <p className="text-xs font-dm text-[#1B4332]/50">✅ Todas las transferencias de los últimos 60 días están verificadas.</p>
        )}
        {lista && lista.length > 0 && (
          <ul className="divide-y divide-[#1B4332]/10 border-y border-[#1B4332]/10">
            {lista.map(t => (
              <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-xs font-dm">
                <span className="panel-cifra text-[#1B4332] font-medium w-20 shrink-0">{fmx(t.monto)}</span>
                <span className="text-[#1B4332]/70 flex-1 min-w-[180px]">
                  {t.cliente ?? "Sin cliente"}
                  {t.folio ? <span className="text-[#1B4332]/45"> · {t.folio}</span> : null}
                  <span className="block text-[#1B4332]/45">
                    {t.metodoLabel} · {dia(t.fecha)}{t.creadoPor ? ` · lo registró ${t.creadoPor}` : ""}{t.referencia ? ` · ref. ${t.referencia}` : ""}
                  </span>
                </span>
                {t.comprobantes.map(a => (
                  <a key={a.id} href={`/api/admin/evidencia/${a.id}`} target="_blank" rel="noopener noreferrer"
                     title={`Ver comprobante: ${a.nombreArchivo}`} className="text-[#52B788] hover:underline shrink-0">📎 comprobante</a>
                ))}
                <VerificarCobro
                  cobro={{ id: t.id, monto: t.monto, fecha: t.fecha, metodo: t.metodo, claveRastreo: t.claveRastreo, bancoEmisor: t.bancoEmisor }}
                  puedeAMano={puedeAMano}
                  onListo={() => setLista(l => (l ?? []).filter(x => x.id !== t.id))}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Stripe ─────────────────────────────────────────────────────── */}
      <button type="button" onClick={abrirStripe}
        className="panel-foco panel-eyebrow flex items-center gap-1.5 hover:text-[#1B4332]">
        <CreditCard className="w-3.5 h-3.5" aria-hidden="true" />
        Pagos con tarjeta (Stripe), últimos 30 días {stripeAbierto ? "▴" : "▾"}
      </button>
      {stripeAbierto && (
        <div className="mt-2">
          {cargandoStripe && <p className="text-xs font-dm text-[#1B4332]/40 flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" />Preguntando a Stripe…</p>}
          {stripe?.sinLlave && <p className="text-xs font-dm text-[#1B4332]/50">Este servidor no tiene la llave de Stripe (en producción sí).</p>}
          {stripe?.error && <p className="text-xs font-dm text-red-700">{stripe.error}</p>}
          {stripe && !stripe.sinLlave && !stripe.error && (
            <>
              {stripe.saldo && (
                <p className="text-xs font-dm text-[#1B4332]/70 mb-2">
                  En Stripe: <strong>{fmx(stripe.saldo.disponible)}</strong> disponible · <strong>{fmx(stripe.saldo.enCamino)}</strong> por liberar
                  {sinRegistrar > 0 && <span className="ml-2 text-red-700">· ⚠️ {sinRegistrar} pago{sinRegistrar > 1 ? "s" : ""} sin registrar en el panel</span>}
                </p>
              )}
              {stripe.pagos.length === 0 && <p className="text-xs font-dm text-[#1B4332]/50">No hubo pagos con tarjeta en 30 días.</p>}
              <ul className="divide-y divide-[#1B4332]/10 border-y border-[#1B4332]/10 mb-3">
                {stripe.pagos.map(p => (
                  <li key={p.id} className={`flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-xs font-dm ${p.anulado ? "opacity-50 line-through" : ""}`}>
                    <span className="panel-cifra text-[#1B4332] font-medium w-20 shrink-0">{fmx(p.monto)}</span>
                    <span className="text-[#1B4332]/70 flex-1 min-w-[180px]">
                      {p.donde ? <>{p.donde.cliente ?? "—"} <span className="text-[#1B4332]/45">· {p.donde.folio}</span></> : <span className="text-red-700">⚠️ Sin registrar en el panel{p.descripcion ? ` · ${p.descripcion}` : ""}</span>}
                      <span className="block text-[#1B4332]/45">{dia(p.fecha)} · {p.id.slice(0, 14)}…</span>
                    </span>
                    {p.donde && <span className="inline-flex items-center rounded-full bg-[#E8F5EE] px-2 py-0.5 text-[11px] text-[#1B4332] shrink-0">✓ Stripe</span>}
                  </li>
                ))}
              </ul>
              {stripe.depositos.length > 0 && (
                <>
                  <p className="panel-eyebrow mb-1.5">Depósitos de Stripe a tu banco</p>
                  <ul className="space-y-1">
                    {stripe.depositos.map(d => (
                      <li key={d.id} className="flex items-center gap-3 text-xs font-dm text-[#1B4332]/70">
                        <span className="panel-cifra text-[#1B4332] w-20 shrink-0">{fmx(d.monto)}</span>
                        <span>{ESTADO_DEPOSITO[d.estado] ?? d.estado} · {dia(d.llega)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
