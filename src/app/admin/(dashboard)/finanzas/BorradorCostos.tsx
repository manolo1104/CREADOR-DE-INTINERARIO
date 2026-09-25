"use client";

/**
 * Los costos de operar cada salida, en borrador.
 *
 * 🔴 El problema que resuelve: capturar el costo de un tour era empezar de cero
 * en un formulario vacío, uno por uno, y por eso casi nadie lo hacía — el panel
 * acababa diciendo que una salida costó $0 y el margen salía inflado. Pero el
 * Cotizador YA sabe lo que cuesta cada recorrido: el lanchero por salida, la
 * entrada por persona, la gasolina.
 *
 * Así que aquí cada salida llega con sus renglones ya escritos, calculados para
 * las personas que de verdad van: los fijos tal cual y los variables
 * multiplicados. Son un BORRADOR editable — el lanchero cobró $200 más ese día
 * y se corrige encima— y al guardarlos dejan de ser estimación.
 *
 * Cuando una salida ya tiene sus costos capturados, en vez del borrador se
 * enseña la comparación: cuánto costó de verdad contra lo que decía el
 * Cotizador, y si fue más o menos.
 */

import { useMemo, useState } from "react";
import { Check, Loader2, Plus, Calculator } from "lucide-react";
import type { Finanzas, ReservaFinanciera } from "@/lib/admin/finanzas";
import { categoriaDe } from "@/lib/admin/categorias";
import { fmx, fDiaCorto } from "./ui";
import { playClick, playSuccess, playError } from "@/lib/admin/sfx";

interface Linea {
  concepto: string;
  categoria: string;
  /** Cómo lo calculó el Cotizador, para que se entienda la cifra. */
  detalle: string;
  monto: string;
  /** Lo que proponía el catálogo, para saber si se editó. */
  previsto: number;
}

export default function BorradorCostos({ datos, recargar }: {
  datos: Finanzas; recargar: () => void;
}) {
  // Primero las salidas sin costo capturado: son las que piden trabajo.
  const salidas = useMemo(
    () => [...datos.reservas].sort((a, b) => {
      const pend = (r: ReservaFinanciera) => (r.costoRegistrado > 0 ? 1 : 0);
      return pend(a) - pend(b) || (a.fechaTour < b.fechaTour ? -1 : 1);
    }),
    [datos.reservas],
  );

  if (salidas.length === 0) {
    return (
      <p className="text-[#1B4332]/30 font-dm text-xs">
        No hay salidas en este periodo.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-dm text-[#1B4332]/45 leading-relaxed">
        Cada salida llega con los costos que el Cotizador tiene para ese tour, ya
        calculados para las personas que van. Corrige lo que haga falta y guarda:
        mientras no se guarden, el corte los cuenta como <strong className="font-medium">estimados</strong>.
      </p>
      {salidas.map(r => <Salida key={r.id} r={r} recargar={recargar} />)}
    </div>
  );
}

function Salida({ r, recargar }: { r: ReservaFinanciera; recargar: () => void }) {
  const capturado = r.costoRegistrado > 0;
  return (
    <div className="border border-[#1B4332]/10 rounded-sm">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-4 py-2.5 bg-[#FAFAF8] border-b border-[#1B4332]/8">
        <span className="font-dm text-sm text-[#1B4332]">{r.tour || "Sin tour"}</span>
        <span className="font-dm text-[11px] text-[#1B4332]/45">
          {fDiaCorto(r.fechaTour)} · {r.pasajeros} persona{r.pasajeros === 1 ? "" : "s"} · {r.cliente}
        </span>
        <span className="font-mono text-[10px] text-[#1B4332]/35 ml-auto">{r.folio}</span>
      </div>
      <div className="p-4">
        {capturado ? <YaCapturada r={r} /> : <Borrador r={r} recargar={recargar} />}
      </div>
    </div>
  );
}

// ── Lo que ya se capturó, contra lo que decía el Cotizador ──────────────────

function YaCapturada({ r }: { r: ReservaFinanciera }) {
  const dif = r.costoRegistrado - r.costoCatalogo;
  const pct = r.costoCatalogo > 0 ? Math.round((dif / r.costoCatalogo) * 100) : 0;

  return (
    <>
      <ul className="space-y-1 mb-3">
        {r.movimientos.map(m => (
          <li key={m.id} className="flex items-baseline gap-2 font-dm text-xs">
            <span className="text-[#1B4332]/70 flex-1 truncate">{m.concepto}</span>
            <span className="panel-cifra text-[#1B4332]">{fmx(m.monto)}</span>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-baseline gap-2 border-t border-[#1B4332]/8 pt-2">
        <span className="font-dm text-xs text-[#1B4332]/55">Costó</span>
        <span className="panel-cifra font-dm text-sm text-[#1B4332] font-medium">{fmx(r.costoRegistrado)}</span>
        {r.costoCatalogo > 0 && (
          <span className={`font-dm text-[11px] px-1.5 py-0.5 rounded-sm ${
            dif > 0 ? "bg-[#C9484A]/10 text-[#A33638]"
            : dif < 0 ? "bg-[#52B788]/12 text-[#1B6B45]"
            : "bg-[#1B4332]/6 text-[#1B4332]/55"
          }`}>
            {dif === 0
              ? "justo lo previsto"
              : `${dif > 0 ? "más" : "menos"} de lo previsto · ${dif > 0 ? "+" : "−"}${fmx(Math.abs(dif))}${pct !== 0 ? ` (${dif > 0 ? "+" : "−"}${Math.abs(pct)}%)` : ""}`}
          </span>
        )}
        {r.costoCatalogo > 0 && (
          <span className="font-dm text-[11px] text-[#1B4332]/35 ml-auto">
            el Cotizador decía {fmx(r.costoCatalogo)}
          </span>
        )}
      </div>
    </>
  );
}

// ── El borrador editable ────────────────────────────────────────────────────

function Borrador({ r, recargar }: { r: ReservaFinanciera; recargar: () => void }) {
  const [lineas, setLineas] = useState<Linea[]>(() =>
    r.desgloseCatalogo.map(l => ({
      concepto:  l.concepto,
      categoria: l.categoria,
      detalle:   l.tipo === "persona" ? `${fmx(l.monto)} × ${r.pasajeros}` : "por salida",
      monto:     String(l.total),
      previsto:  l.total,
    })),
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const total = lineas.reduce((s, l) => s + (Math.round(Number(l.monto)) || 0), 0);
  const editado = lineas.some(l => (Math.round(Number(l.monto)) || 0) !== l.previsto);
  const dif = total - r.costoCatalogo;

  function cambiar(i: number, monto: string) {
    setLineas(ls => ls.map((l, j) => (j === i ? { ...l, monto } : l)));
  }

  function agregarLinea() {
    playClick();
    setLineas(ls => [...ls, { concepto: "", categoria: "otroDirecto", detalle: "a mano", monto: "", previsto: 0 }]);
  }

  async function guardar() {
    const utiles = lineas.filter(l => l.concepto.trim() && (Math.round(Number(l.monto)) || 0) > 0);
    if (utiles.length === 0) { playError(); setError("No hay nada que guardar"); return; }

    setGuardando(true); setError("");
    // Un movimiento por renglón: así el estado de resultados sigue diciendo en
    // qué se fue el dinero (guías, gasolina, entradas) y no una bolsa "costos".
    const fecha = /^\d{4}-\d{2}-\d{2}$/.test(r.fechaTour) ? r.fechaTour : r.fechaReserva;
    const fallos: string[] = [];
    for (const l of utiles) {
      const res = await fetch("/api/admin/movimientos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: "costo", categoria: l.categoria, concepto: l.concepto.trim(),
          monto: Math.round(Number(l.monto)), fecha, reservaId: r.id,
        }),
      }).catch(() => null);
      if (!res?.ok) fallos.push(l.concepto);
    }
    setGuardando(false);
    if (fallos.length) { playError(); setError(`No se guardó: ${fallos.join(", ")}`); }
    else { playSuccess(); }
    recargar();
  }

  if (lineas.length === 0) {
    return (
      <>
        <p className="font-dm text-xs text-[#1B4332]/45 mb-3">
          El Cotizador no tiene costos para este tour, así que no hay nada que
          proponer. Escríbelos a mano.
        </p>
        <button onClick={agregarLinea}
          className="panel-foco panel-pulsable flex items-center gap-1.5 min-h-[44px] px-3 border border-dashed border-[#1B4332]/25 rounded-sm text-xs font-dm text-[#1B4332]/65 hover:border-[#1B4332]/50">
          <Plus className="w-3.5 h-3.5" />Añadir un costo
        </button>
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-1.5 mb-2">
        <Calculator className="w-3.5 h-3.5 text-[#1a4e8a]/60" />
        <span className="font-dm text-[11px] text-[#1a4e8a]/70">
          Borrador del Cotizador · todavía no cuenta como capturado
        </span>
      </div>

      <ul className="space-y-1.5 mb-3">
        {lineas.map((l, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="flex-1 min-w-0">
              {l.previsto === 0 ? (
                <input
                  value={l.concepto}
                  onChange={e => setLineas(ls => ls.map((x, j) => (j === i ? { ...x, concepto: e.target.value } : x)))}
                  placeholder="Concepto"
                  className="panel-foco w-full min-h-[44px] border border-[#1B4332]/15 rounded-sm px-2 text-base font-dm text-[#1B4332] focus:outline-none focus:border-[#1B4332]"
                />
              ) : (
                <>
                  <span className="block font-dm text-xs text-[#1B4332]/75 truncate">{l.concepto}</span>
                  <span className="block font-dm text-[10px] text-[#1B4332]/35">
                    {l.detalle} · {categoriaDe(l.categoria).label.toLowerCase()}
                  </span>
                </>
              )}
            </span>
            <input
              value={l.monto}
              onChange={e => cambiar(i, e.target.value)}
              inputMode="numeric"
              className={`panel-foco w-28 min-h-[44px] border rounded-sm px-2 text-base font-dm text-right text-[#1B4332] focus:outline-none focus:border-[#1B4332] ${
                (Math.round(Number(l.monto)) || 0) !== l.previsto && l.previsto > 0
                  ? "border-[#1a4e8a]/45 bg-[#1a4e8a]/[0.04]"
                  : "border-[#1B4332]/15"
              }`}
            />
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-2 border-t border-[#1B4332]/8 pt-3">
        <button onClick={agregarLinea} title="Añadir un costo que no está en el Cotizador"
          className="panel-foco panel-pulsable w-11 h-11 grid place-items-center border border-[#1B4332]/15 rounded-sm text-[#1B4332]/55 hover:border-[#1B4332]/40">
          <Plus className="w-4 h-4" />
        </button>
        <span className="font-dm text-xs text-[#1B4332]/55">
          Suma <span className="panel-cifra text-[#1B4332] font-medium">{fmx(total)}</span>
          {editado && r.costoCatalogo > 0 && dif !== 0 && (
            <span className={dif > 0 ? "text-[#A33638] ml-1.5" : "text-[#1B6B45] ml-1.5"}>
              ({dif > 0 ? "+" : "−"}{fmx(Math.abs(dif))} {dif > 0 ? "más" : "menos"} de lo establecido)
            </span>
          )}
        </span>
        <button onClick={guardar} disabled={guardando}
          className="panel-foco panel-pulsable ml-auto min-h-[44px] px-4 flex items-center gap-1.5 bg-[#1B4332] text-white text-xs font-dm rounded-sm hover:bg-[#143728] disabled:opacity-50">
          {guardando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Guardar costos
        </button>
      </div>
      {error && <p className="font-dm text-xs text-[#C9484A] mt-2">{error}</p>}
    </>
  );
}
