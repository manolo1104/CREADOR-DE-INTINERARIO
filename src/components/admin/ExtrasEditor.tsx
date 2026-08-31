"use client";

import { Plus, X, Utensils, Lock } from "lucide-react";
import {
  type ExtraItem, type PresetExtra, EMPTY_EXTRA, EXTRAS_PRESET,
  calcExtraLine, costoExtraLine, normalizarExtra, recalcularExtra,
} from "@/lib/admin/extras";

const fmx = (n: number) => `$${n.toLocaleString("es-MX")} MXN`;

const inputCls =
  "w-full border border-[#1B4332]/15 text-[#1B4332] font-dm text-sm px-3 py-2.5 focus:outline-none focus:border-[#1B4332] rounded-sm placeholder:text-[#1B4332]/25 bg-white";

/**
 * El bloque de items sueltos —la comida, el transporte, el guía privado— que
 * comparten el modal de cotización y el de reserva. Uno solo para los dos: si
 * viviera duplicado, el día que cambie una etiqueta el cliente vería una cosa
 * en la cotización y otra en la confirmación de la misma venta.
 */
export default function ExtrasEditor({
  extras, onChange, personas = 0, presets = EXTRAS_PRESET,
  titulo = "Extras e items incluidos (opcional)",
}: {
  extras:   ExtraItem[];
  onChange: (next: ExtraItem[]) => void;
  /** Tamaño del grupo. Llena la cantidad de lo que se cobra por cabeza, para no
   *  teclear "4" cada vez ni arriesgar un "1" que cobre una sola comida. */
  personas?: number;
  /** Los conceptos con sus precios, tal como Manolo los dejó en el Cotizador. */
  presets?: PresetExtra[];
  titulo?:  string;
}) {
  /**
   * 🔴 Aquí NO se normaliza: `normalizarExtra` hace `.trim()` y se ejecutaba en
   * cada tecla, así que el espacio que acababas de escribir desaparecía antes
   * de poder escribir la siguiente palabra. "Traslado desde Río Verde" quedaba
   * guardado como "Traslado desdeRíoVerde".
   *
   * El texto se deja tal cual mientras se escribe y se limpia al guardar, que
   * es cuando de verdad importa.
   */
  function update(i: number, campo: keyof ExtraItem, valor: string | number | boolean) {
    onChange(extras.map((e, idx) => {
      if (idx !== i) return e;
      const up = { ...e, [campo]: valor } as ExtraItem;
      if (campo === "cantidad")       up.cantidad       = Math.max(1, Math.round(Number(valor)) || 1);
      if (campo === "precioUnitario") up.precioUnitario = Math.max(0, Math.round(Number(valor)) || 0);
      if (campo === "costoUnitario")  up.costoUnitario  = Math.max(0, Math.round(Number(valor)) || 0);
      return recalcularExtra(up);
    }));
  }
  function quitar(i: number) { onChange(extras.filter((_, idx) => idx !== i)); }
  function agregar()         { onChange([...extras, { ...EMPTY_EXTRA, cantidad: Math.max(1, personas) }]); }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm flex items-center gap-1.5">
          <Utensils className="w-3 h-3" />{titulo}
        </p>
        <button type="button" onClick={agregar}
          className="flex items-center gap-1 text-xs font-dm text-[#C4882A] border border-[#C4882A]/40 px-2 py-1 hover:bg-[#C4882A]/8 transition-colors rounded-sm">
          <Plus className="w-3 h-3" />Agregar item
        </button>
      </div>

      {extras.length === 0 && (
        <p className="text-[10px] font-dm text-[#1B4332]/30 border border-dashed border-[#1B4332]/15 rounded-sm py-4 text-center">
          Sin extras — comida, transporte o lo que vaya aparte del recorrido
        </p>
      )}

      <div className="space-y-2">
        {extras.map((ex, i) => {
          const cobro    = calcExtraLine(ex);
          const costo    = costoExtraLine(ex);
          const ganancia = cobro - costo;
          return (
            <div key={i} className="border border-[#C4882A]/30 p-3 rounded-sm bg-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] tracking-[2px] uppercase text-[#C4882A]/80 font-dm">Item {i + 1}</span>
                <button type="button" onClick={() => quitar(i)} className="text-[#1B4332]/30 hover:text-red-500">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2">
                {/* Atajos: llenan el concepto de un clic. El precio se escribe siempre a mano. */}
                <div className="flex gap-1.5 flex-wrap">
                  {presets.map(p => (
                    <button key={p.concepto} type="button"
                      onClick={() => onChange(extras.map((e, idx) => idx === i ? normalizarExtra({
                        ...e,
                        concepto: p.concepto,
                        detalle:  e.detalle || p.detalle,
                        // Los precios del Cotizador NO pisan lo que ya escribiste aquí.
                        precioUnitario: e.precioUnitario > 0 ? e.precioUnitario : p.precio,
                        costoUnitario:  e.costoUnitario  > 0 ? e.costoUnitario  : p.costo,
                        // 🔴 La cantidad la decide el preset, SIEMPRE. Antes solo la
                        // ponía cuando era por persona y en el otro caso dejaba la
                        // que traía el item —que nace con el tamaño del grupo—: un
                        // "Transporte por viaje" de $10,000 en un grupo de 14 se
                        // cotizaba en $140,000.
                        cantidad: p.porPersona ? (personas > 0 ? personas : e.cantidad) : 1,
                      }) : e))}
                      className={`text-[10px] font-dm px-2 py-1 rounded border transition-colors ${
                        ex.concepto === p.concepto
                          ? "bg-[#C4882A] text-white border-[#C4882A]"
                          : "border-[#C4882A]/30 text-[#C4882A] hover:bg-[#C4882A]/10"
                      }`}>
                      {p.concepto}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Concepto *</label>
                  <input type="text" value={ex.concepto} placeholder="Comida del día 2"
                    onChange={e => update(i, "concepto", e.target.value)} className={inputCls} />
                </div>

                <div>
                  <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Detalle (lo ve el cliente)</label>
                  <input type="text" value={ex.detalle} placeholder="Enchiladas huastecas y agua fresca"
                    onChange={e => update(i, "detalle", e.target.value)} className={inputCls} />
                </div>

                {/* Se cobra vs va incluido */}
                <div className="flex border border-[#1B4332]/15 rounded-sm overflow-hidden w-fit">
                  <button type="button" onClick={() => update(i, "incluido", false)}
                    className={`px-3 py-2 text-xs font-dm transition-colors ${
                      !ex.incluido ? "bg-[#C4882A] text-white" : "bg-white text-[#1B4332]/60 hover:bg-[#FAFAF8]"
                    }`}>Se cobra aparte</button>
                  <button type="button" onClick={() => update(i, "incluido", true)}
                    className={`px-3 py-2 text-xs font-dm transition-colors ${
                      ex.incluido ? "bg-[#40916C] text-white" : "bg-white text-[#1B4332]/60 hover:bg-[#FAFAF8]"
                    }`}>Va incluido</button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Cantidad</label>
                    <input type="number" min={1} max={99} value={ex.cantidad}
                      onChange={e => update(i, "cantidad", Number(e.target.value))} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1"
                      title="Lo que le cobras al cliente por unidad. Se guarda en ESTA cotización: cambiarlo aquí no toca las que ya mandaste.">
                      {ex.incluido ? "$/u (no se cobra)" : "$/unidad"}
                    </label>
                    <input type="number" min={0} value={ex.precioUnitario} disabled={ex.incluido}
                      onChange={e => update(i, "precioUnitario", Number(e.target.value))}
                      className={`${inputCls} ${ex.incluido ? "opacity-40" : ""}`} />
                  </div>
                  <div>
                    <label className="flex items-center gap-1 text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1"
                      title="Solo tú lo ves: no sale en la cotización, ni en el PDF, ni en el correo.">
                      <Lock className="w-2.5 h-2.5" />Te cuesta
                    </label>
                    <input type="number" min={0} value={ex.costoUnitario}
                      onChange={e => update(i, "costoUnitario", Number(e.target.value))} className={inputCls} />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 text-xs font-dm">
                  <span className="text-[#1B4332]/35">
                    {costo > 0 && (
                      ganancia >= 0
                        ? <>Te deja <span className={ganancia > 0 ? "text-[#40916C]" : "text-[#1B4332]/50"}>{fmx(ganancia)}</span></>
                        : <span className="text-[#C9484A]">Pierdes {fmx(Math.abs(ganancia))}</span>
                    )}
                  </span>
                  <span className={ex.incluido ? "text-[#40916C] font-medium" : "text-[#C4882A] font-medium"}>
                    {ex.incluido ? "Incluido · sin cargo" : `Subtotal: ${fmx(cobro)}`}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
