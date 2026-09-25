"use client";

import { useEffect, useState } from "react";
import { Lock, Loader2, Banknote, HandCoins } from "lucide-react";
import type { Finanzas } from "@/lib/admin/finanzas";
import { fmx, fDiaCorto, descargarCSV, BotonExportar } from "./ui";
import type { Permisos } from "./permisos";
import { hoyMX } from "./useFinanzas";

interface CorteCerrado {
  id: string; tipo: string; desde: string; hasta: string;
  cerradoPor: string; createdAt: string;
  resumen: {
    ventas: number; cobros: number; costos: number; gastos: number;
    utilidadBruta: number; utilidadOperativa: number; margen: number;
    efectivo: number; porCobrar: number; porPagar: number; reservas: number;
  };
}

/**
 * Un corte cerrado es una FOTO. Si mañana se captura un costo viejo, el corte
 * ya cerrado no cambia: eso es justo lo que lo hace servir para cuadrar con
 * alguien más.
 */
export default function VistaCortes({ datos, permisos, desde, hasta }: {
  datos: Finanzas; permisos: Permisos; desde: string; hasta: string;
}) {
  const [cortes, setCortes] = useState<CorteCerrado[]>([]);
  const [cerrando, setCerrando] = useState(false);
  const [msg, setMsg] = useState("");
  const [entregando, setEntregando] = useState<string | null>(null);
  const [bolsas, setBolsas] = useState(datos.efectivoEnManos);

  const desglose = datos.desgloseCobros;

  // Dar por recibido TODO el efectivo que trae una persona.
  async function entregar(persona: string, monto: number) {
    if (!confirm(`¿Confirmas que recibiste ${fmx(monto)} en efectivo de ${persona}?`)) return;
    setEntregando(persona);
    const r = await fetch("/api/admin/cobros", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ persona }),
    }).catch(() => null);
    setEntregando(null);
    if (!r?.ok) { setMsg("No se pudo registrar la entrega"); return; }
    const d = await r.json();
    setBolsas(d.enManos ?? []);
    setMsg(`Recibido: ${fmx(d.total ?? monto)} de ${persona}`);
  }

  async function cargar() {
    const r = await fetch("/api/admin/cortes");
    if (r.ok) setCortes(await r.json());
  }
  useEffect(() => { cargar(); }, []);
  // El efectivo en manos no depende del periodo, pero sí se vuelve a calcular
  // en cada consulta: si no se sincroniza, la lista se queda con la primera.
  useEffect(() => { setBolsas(datos.efectivoEnManos); }, [datos.efectivoEnManos]);

  async function cerrar(tipo: "diario" | "semanal" | "mensual") {
    setCerrando(true); setMsg("");
    const r = await fetch("/api/admin/cortes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo, fecha: desde }),
    });
    setCerrando(false);
    if (r.ok) { setMsg("Corte cerrado y guardado"); cargar(); }
    else setMsg((await r.json()).error ?? "No se pudo cerrar el corte");
  }

  return (
    <div className="space-y-5">
      <div className="panel-card p-5">
        <h3 className="font-cormorant text-[#1B4332] text-lg font-light mb-1">Cerrar el corte</h3>
        <p className="text-[10px] font-dm text-[#1B4332]/35 mb-3">
          Guarda las cifras del periodo tal como están hoy. Un corte cerrado ya no cambia
          aunque después se capture un costo viejo: para eso está el corte en vivo.
        </p>

        <div className="border border-[#1B4332]/10 rounded-sm p-4 bg-[#FAFAF8] mb-3">
          <p className="font-dm text-xs text-[#1B4332]/50 mb-2">
            Se guardaría esto, del {fDiaCorto(desde)} al {fDiaCorto(hasta)}:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-dm text-xs">
            <Dato label="Ventas"    valor={fmx(datos.er.ventasBrutas)} />
            <Dato label="Cobrado"   valor={fmx(datos.cobrado)} />
            <Dato label="Costos"    valor={fmx(datos.er.costosDirectosTotal)} />
            <Dato label="Gastos"    valor={fmx(datos.er.gastosGeneralesTotal)} />
            <Dato label="Utilidad"  valor={fmx(datos.er.utilidadOperativa)} acento />
            <Dato label="Efectivo"  valor={fmx(datos.flujo.flujoNeto)} />
            <Dato label="Por cobrar" valor={fmx(datos.porCobrar)} />
            <Dato label="Por pagar"  valor={fmx(datos.porPagarTotal)} />
          </div>
        </div>

        {permisos.cerrarCorte ? (
          <div className="flex flex-wrap items-center gap-2">
            {(["diario", "semanal", "mensual"] as const).map(t => (
              <button key={t} onClick={() => cerrar(t)} disabled={cerrando}
                className="flex items-center gap-1.5 bg-[#1B4332] hover:bg-[#2D5A45] text-white px-3 py-2 text-[10px] font-dm uppercase tracking-[1px] rounded-sm transition-colors disabled:opacity-40">
                {cerrando ? <Loader2 className="w-3 h-3 animate-spin" /> : <Lock className="w-3 h-3" />}
                Cerrar corte {t}
              </button>
            ))}
            {msg && <span className="font-dm text-xs text-[#52B788]">{msg}</span>}
          </div>
        ) : (
          <p className="text-[#1B4332]/35 font-dm text-xs">Tu cuenta no puede cerrar cortes.</p>
        )}
      </div>

      {/* ── Cómo entró el dinero ─────────────────────────────────────────
          Los renglones SIEMPRE suman el total cobrado: lo que no tiene
          renglón de cobro sale aparte como "sin desglose" en vez de
          repartirse a ojo entre los métodos. */}
      <div className="panel-card p-5">
        <h3 className="font-cormorant text-[#1B4332] text-lg font-light mb-1 flex items-center gap-2">
          <Banknote className="w-4 h-4 text-[#52B788]" />Cómo entró el dinero
        </h3>
        <p className="text-[10px] font-dm text-[#1B4332]/35 mb-3">
          De los {fmx(datos.cobrado)} cobrados en este periodo.
        </p>

        {desglose.lineas.length === 0 && desglose.sinDesglose === 0 ? (
          <p className="text-[#1B4332]/30 font-dm text-xs">No entró dinero en este periodo.</p>
        ) : (
          <table className="w-full font-dm text-xs panel-tabla">
            <tbody>
              {desglose.lineas.map(l => (
                <tr key={l.metodo} className="border-b border-[#1B4332]/6">
                  <td className="py-2 pr-2 text-[#1B4332]">{l.label}</td>
                  <td className="py-2 px-2 text-[#1B4332]/35 text-right whitespace-nowrap">
                    {l.cobros} cobro{l.cobros === 1 ? "" : "s"}
                  </td>
                  <td className="panel-cifra py-2 pl-2 text-right text-[#1B4332] font-medium">{fmx(l.monto)}</td>
                </tr>
              ))}
              {desglose.sinDesglose > 0 && (
                <tr className="border-b border-[#1B4332]/6">
                  <td className="py-2 pr-2 text-amber-700">
                    Sin desglose
                    <span className="block text-[10px] text-[#1B4332]/35">
                      {desglose.reservasSinDesglose} reserva{desglose.reservasSinDesglose === 1 ? "" : "s"} cobrada
                      {desglose.reservasSinDesglose === 1 ? "" : "s"} antes de registrar el método
                    </span>
                  </td>
                  <td />
                  <td className="panel-cifra py-2 pl-2 text-right text-amber-700 font-medium">{fmx(desglose.sinDesglose)}</td>
                </tr>
              )}
              <tr>
                <td className="py-2 pr-2 text-[#1B4332]/55 text-[10px] tracking-[1.5px] uppercase">Total</td>
                <td />
                <td className="panel-cifra py-2 pl-2 text-right text-[#52B788] font-medium">{fmx(desglose.total)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* ── Efectivo que alguien todavía trae encima ──────────────────────── */}
      <div className="panel-card p-5">
        <h3 className="font-cormorant text-[#1B4332] text-lg font-light mb-1 flex items-center gap-2">
          <HandCoins className="w-4 h-4 text-amber-600" />Efectivo sin entregar
        </h3>
        <p className="text-[10px] font-dm text-[#1B4332]/35 mb-3">
          No depende del periodo: el efectivo que alguien trae desde hace dos semanas
          sigue siendo efectivo que trae.
        </p>

        {bolsas.length === 0 ? (
          <p className="text-[#1B4332]/30 font-dm text-xs">Nadie trae efectivo pendiente de entregar.</p>
        ) : (
          <ul className="space-y-2">
            {bolsas.map(b => (
              <li key={b.persona} className="flex items-center gap-3 border-b border-[#1B4332]/6 pb-2 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="font-dm text-sm text-[#1B4332] truncate">{b.persona}</p>
                  <p className="text-[10px] font-dm text-[#1B4332]/35">
                    {b.cobros} cobro{b.cobros === 1 ? "" : "s"} · el más viejo del {fDiaCorto(b.desde)}
                  </p>
                </div>
                <span className="panel-cifra font-dm text-sm text-amber-700 font-medium">{fmx(b.monto)}</span>
                {permisos.entregaEfectivo && (
                  <button
                    onClick={() => entregar(b.persona, b.monto)}
                    disabled={entregando === b.persona}
                    className="panel-foco panel-pulsable min-h-[44px] px-3 border border-[#1B4332]/20 rounded-sm text-[10px] font-dm uppercase tracking-[1px] text-[#1B4332]/70 hover:border-[#1B4332]/50 disabled:opacity-40"
                  >
                    {entregando === b.persona ? "…" : "Ya lo recibí"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="panel-card p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="font-cormorant text-[#1B4332] text-lg font-light">Cortes cerrados</h3>
          {cortes.length > 0 && (
            <BotonExportar onClick={() => descargarCSV("cortes-cerrados", [
              ["Tipo","Desde","Hasta","Ventas","Cobros","Costos","Gastos","Utilidad","Margen %","Efectivo","Por cobrar","Por pagar","Cerrado por"],
              ...cortes.map(c => [c.tipo, c.desde, c.hasta, c.resumen.ventas, c.resumen.cobros, c.resumen.costos,
                c.resumen.gastos, c.resumen.utilidadOperativa, c.resumen.margen, c.resumen.efectivo,
                c.resumen.porCobrar, c.resumen.porPagar, c.cerradoPor]),
            ])} />
          )}
        </div>

        {cortes.length === 0 ? (
          <p className="text-[#1B4332]/30 font-dm text-xs">Todavía no se ha cerrado ningún corte.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full font-dm text-xs panel-tabla">
              <thead>
                <tr className="text-[#1B4332]/45 text-[9px] tracking-[1.5px] uppercase border-b border-[#1B4332]/10">
                  <th className="text-left  py-2 pr-2">Periodo</th>
                  <th className="text-left  py-2 px-2">Tipo</th>
                  <th className="text-right py-2 px-2">Ventas</th>
                  <th className="text-right py-2 px-2">Cobrado</th>
                  <th className="text-right py-2 px-2">Utilidad</th>
                  <th className="text-right py-2 px-2">Efectivo</th>
                  <th className="text-left  py-2 pl-2">Cerrado por</th>
                </tr>
              </thead>
              <tbody>
                {cortes.map(c => (
                  <tr key={c.id} className="border-b border-[#1B4332]/6">
                    <td className="py-2 pr-2 text-[#1B4332]">
                      {fDiaCorto(c.desde)}{c.desde !== c.hasta && ` — ${fDiaCorto(c.hasta)}`}
                    </td>
                    <td className="py-2 px-2 text-[#1B4332]/55">{c.tipo}</td>
                    <td className="panel-cifra py-2 px-2 text-right text-[#1B4332]">{fmx(c.resumen.ventas)}</td>
                    <td className="panel-cifra py-2 px-2 text-right text-[#52B788]">{fmx(c.resumen.cobros)}</td>
                    <td className="panel-cifra py-2 px-2 text-right text-[#1B4332] font-medium">
                      {fmx(c.resumen.utilidadOperativa)} · {c.resumen.margen}%
                    </td>
                    <td className="panel-cifra py-2 px-2 text-right text-[#1B4332]/60">{fmx(c.resumen.efectivo)}</td>
                    <td className="py-2 pl-2 text-[#1B4332]/45">
                      {c.cerradoPor}
                      <span className="text-[#1B4332]/30 ml-1">
                        {new Date(c.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}
                      </span>
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

function Dato({ label, valor, acento }: { label: string; valor: string; acento?: boolean }) {
  return (
    <div>
      <p className="text-[9px] tracking-[1.5px] uppercase text-[#1B4332]/40">{label}</p>
      <p className={`font-cormorant text-lg font-light ${acento ? "text-[#52B788]" : "text-[#1B4332]"}`}>{valor}</p>
    </div>
  );
}
