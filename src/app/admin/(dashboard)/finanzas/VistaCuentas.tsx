"use client";

import { AlertTriangle, Check } from "lucide-react";
import type { Finanzas } from "@/lib/admin/finanzas";
import { fmx, fDiaCorto, Etiqueta, TONO_PAGO, descargarCSV, BotonExportar } from "./ui";
import type { Permisos } from "./FinanzasClient";
import { hoyMX } from "./useFinanzas";

/** Lo que te deben y lo que debes, en la misma pantalla. */
export default function VistaCuentas({ datos, recargar, permisos }: {
  datos: Finanzas; recargar: () => void; permisos: Permisos;
}) {
  const porCobrar = datos.reservas.filter(r => r.saldo > 0)
    .sort((a, b) => (b.diasVencido - a.diasVencido) || (b.saldo - a.saldo));
  const vencidas = porCobrar.filter(r => r.estadoPago === "vencido");

  async function marcarPagado(id: string) {
    await fetch("/api/admin/movimientos", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, accion: "pagar", fechaPago: hoyMX() }),
    });
    recargar();
  }

  return (
    <div className="space-y-5">
      {/* ── Por cobrar ──────────────────────────────────────────────────── */}
      <div className="bg-white border border-[#1B4332]/10 rounded-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <h3 className="font-cormorant text-[#1B4332] text-lg font-light">Cuentas por cobrar</h3>
          <BotonExportar onClick={() => descargarCSV(`por-cobrar-${datos.desde}`, [
            ["Cliente","Folio","Tour","Fecha tour","Total","Pagado","Saldo","Estado","Días vencido"],
            ...porCobrar.map(r => [r.cliente, r.folio, r.tour, r.fechaTour, r.venta, r.cobrado, r.saldo, r.estadoPago, r.diasVencido]),
          ])} />
        </div>
        <p className="text-[10px] font-dm text-[#1B4332]/35 mb-3">
          Dinero vendido que todavía no entra. Total: <strong className="text-[#1B4332]/70">{fmx(datos.porCobrar)}</strong>
        </p>

        {vencidas.length > 0 && (
          <div className="flex items-start gap-2 bg-[#C9484A]/8 border border-[#C9484A]/25 rounded-sm p-3 mb-3">
            <AlertTriangle className="w-4 h-4 text-[#C9484A] shrink-0 mt-0.5" />
            <p className="font-dm text-xs text-[#A33638]">
              <strong>{vencidas.length} cuenta{vencidas.length === 1 ? "" : "s"} vencida{vencidas.length === 1 ? "" : "s"}</strong>{" "}
              por {fmx(vencidas.reduce((s, r) => s + r.saldo, 0))}. El tour ya pasó y siguen debiendo.
            </p>
          </div>
        )}

        {porCobrar.length === 0 ? (
          <p className="text-[#52B788] font-dm text-xs py-2">Todo cobrado en este periodo.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full font-dm text-xs">
              <thead>
                <tr className="text-[#1B4332]/45 text-[9px] tracking-[1.5px] uppercase border-b border-[#1B4332]/10">
                  <th className="text-left  py-2 pr-2">Cliente</th>
                  <th className="text-left  py-2 px-2">Folio</th>
                  <th className="text-left  py-2 px-2">Tour</th>
                  <th className="text-right py-2 px-2">Total</th>
                  <th className="text-right py-2 px-2">Pagado</th>
                  <th className="text-right py-2 px-2">Saldo</th>
                  <th className="text-left  py-2 pl-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {porCobrar.map(r => (
                  <tr key={r.id} className="border-b border-[#1B4332]/6">
                    <td className="py-2 pr-2 text-[#1B4332]">
                      {r.cliente}
                      {r.telefono && <a href={`https://wa.me/${r.telefono.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                        className="ml-1.5 text-[#52B788] hover:underline text-[10px]">WhatsApp</a>}
                    </td>
                    <td className="py-2 px-2 font-mono text-[10px] text-[#1B4332]/70">{r.folio}</td>
                    <td className="py-2 px-2 text-[#1B4332]/55 max-w-[150px] truncate">
                      {r.tour}<span className="text-[#1B4332]/35"> · {fDiaCorto(r.fechaTour)}</span>
                    </td>
                    <td className="py-2 px-2 text-right text-[#1B4332]/70">{fmx(r.venta)}</td>
                    <td className="py-2 px-2 text-right text-[#52B788]">{fmx(r.cobrado)}</td>
                    <td className="py-2 px-2 text-right text-[#1B4332] font-medium">{fmx(r.saldo)}</td>
                    <td className="py-2 pl-2">
                      <Etiqueta texto={r.estadoPago === "vencido" ? `vencido ${r.diasVencido}d` : r.estadoPago}
                                tono={TONO_PAGO[r.estadoPago] ?? "gris"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Por pagar ───────────────────────────────────────────────────── */}
      <div className="bg-white border border-[#1B4332]/10 rounded-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <h3 className="font-cormorant text-[#1B4332] text-lg font-light">Cuentas por pagar</h3>
          <BotonExportar onClick={() => descargarCSV(`por-pagar-${datos.desde}`, [
            ["Proveedor","Concepto","Categoría","Reserva","Fecha","Importe"],
            ...datos.porPagar.map(c => [c.proveedor, c.concepto, c.categoria, c.folio, c.fecha, c.monto]),
          ])} />
        </div>
        <p className="text-[10px] font-dm text-[#1B4332]/35 mb-3">
          Lo que la empresa debe, de cualquier fecha. Total: <strong className="text-[#C9484A]">{fmx(datos.porPagarTotal)}</strong>
        </p>

        {datos.porPagar.length === 0 ? (
          <p className="text-[#52B788] font-dm text-xs py-2">No debes nada registrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full font-dm text-xs">
              <thead>
                <tr className="text-[#1B4332]/45 text-[9px] tracking-[1.5px] uppercase border-b border-[#1B4332]/10">
                  <th className="text-left  py-2 pr-2">Proveedor</th>
                  <th className="text-left  py-2 px-2">Concepto</th>
                  <th className="text-left  py-2 px-2">Reserva</th>
                  <th className="text-left  py-2 px-2">Fecha</th>
                  <th className="text-right py-2 px-2">Importe</th>
                  <th className="text-right py-2 pl-2"></th>
                </tr>
              </thead>
              <tbody>
                {datos.porPagar.map(c => (
                  <tr key={c.id} className="border-b border-[#1B4332]/6">
                    <td className="py-2 pr-2 text-[#1B4332]">{c.proveedor}</td>
                    <td className="py-2 px-2 text-[#1B4332]/60">
                      {c.concepto}<span className="text-[#1B4332]/35 ml-1.5">{c.categoria}</span>
                    </td>
                    <td className="py-2 px-2 font-mono text-[10px] text-[#1B4332]/55">{c.folio || "—"}</td>
                    <td className="py-2 px-2 text-[#1B4332]/55">
                      {fDiaCorto(c.fecha)}{c.vencePronto && <span className="ml-1"><Etiqueta texto="pronto" tono="naranja" /></span>}
                    </td>
                    <td className="py-2 px-2 text-right text-[#C9484A] font-medium">{fmx(c.monto)}</td>
                    <td className="py-2 pl-2 text-right">
                      {permisos.anular && (
                        <button onClick={() => marcarPagado(c.id)} title="Marcar como pagado"
                          className="inline-flex items-center gap-1 text-[10px] font-dm text-[#52B788] hover:underline">
                          <Check className="w-3 h-3" />pagado
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
