"use client";

import { useState, useMemo } from "react";
import { Plus, X, Save, Calculator, AlertTriangle, Users, Percent, Truck, Wallet } from "lucide-react";
import { TOURS_DB } from "@/lib/tours";
import { calcTourLine, esTourVehiculo, type LineItem } from "@/components/admin/ReservaModal";
import { playClick, playSuccess, playError } from "@/lib/admin/sfx";
import ExtrasEditor from "@/components/admin/ExtrasEditor";
import {
  type ExtraItem, type PresetExtra, normalizarPreset,
  totalExtras, costoExtras, calcExtraLine, costoExtraLine,
} from "@/lib/admin/extras";
import {
  type CostoTour, type ConceptoCosto, type TipoCosto,
  CONCEPTOS_PRESET, EMPTY_CONCEPTO, resumirCostos, costoDeLinea,
  calcularMargen, descuentoMaximo, TAMANOS_GRUPO,
} from "@/lib/admin/costos";
import {
  type TarifaProveedor, ESCALONES, costoProveedor, tarifaPorPersona,
  escalonAplicado, tarifasDeTour,
} from "@/lib/admin/proveedor";

const fmx  = (n: number) => `$${Math.round(n).toLocaleString("es-MX")}`;
const fmxL = (n: number) => `$${Math.round(n).toLocaleString("es-MX")} MXN`;

const inputCls =
  "w-full border border-[#1B4332]/15 text-[#1B4332] font-dm text-sm px-3 py-2.5 focus:outline-none focus:border-[#1B4332] rounded-sm placeholder:text-[#1B4332]/25 bg-white";

/** Una línea del simulador. Misma forma que una línea de cotización, más las
 *  personas a bordo de los recorridos por vehículo (que no van en el precio
 *  pero sí en el costo: la comida y las entradas se pagan por cabeza). */
interface SimLinea {
  tourSlug:   string;
  /** Solo con proveedor: cuál de sus dos versiones del recorrido se cotiza. */
  variante?:  string;
  adultos:    number;
  ninosMid:   number;
  ninosSmall: number;
  ruta?:      string;
  vehiculo?:  string;
  unidades?:  number;
  personasVehiculo?: number;
}

const LINEA_VACIA: SimLinea = { tourSlug: "", adultos: 4, ninosMid: 0, ninosSmall: 0 };

/** La línea tal como la entiende el catálogo, para cobrar EXACTAMENTE lo mismo
 *  que cobraría la cotización. Si el precio se recalculara aquí a mano, el
 *  simulador y la cotización dirían números distintos del mismo viaje. */
function aLineItem(l: SimLinea): LineItem {
  return {
    tourSlug: l.tourSlug, tourName: "", tourDate: "",
    adults: l.adultos, childrenMid: l.ninosMid, childrenSmall: l.ninosSmall,
    subtotal: 0, ruta: l.ruta, vehiculo: l.vehiculo, unidades: l.unidades,
  };
}

/** Cuánta gente va en esa línea (para repartir el costo por persona). */
function personasDe(l: SimLinea): number {
  if (esTourVehiculo(l.tourSlug)) return Math.max(1, l.personasVehiculo ?? 2);
  return Math.max(0, l.adultos) + Math.max(0, l.ninosMid) + Math.max(0, l.ninosSmall);
}

function Chip({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span className={`text-[10px] font-dm px-2 py-0.5 rounded-full whitespace-nowrap ${
      ok ? "bg-[#52B788]/15 text-[#2D5A45]" : "bg-[#C9484A]/12 text-[#C9484A] font-medium"
    }`}>{children}</span>
  );
}

export default function CotizadorClient(
  { costosIniciales, preciosIniciales, tarifasIniciales }:
  { costosIniciales: CostoTour[]; preciosIniciales: PresetExtra[]; tarifasIniciales: TarifaProveedor[] },
) {
  /**
   * Con qué costos se calcula. No es un detalle de pantalla: son dos formas
   * distintas de que cueste un viaje.
   *  · "mios"      → lo que pago yo, separado en por persona y fijo por salida.
   *  · "proveedor" → una tarifa por cabeza, todo incluido, que baja con el grupo.
   */
  const [modo, setModo] = useState<"mios" | "proveedor">("mios");
  const [tab, setTab] = useState<"costos" | "proveedor" | "precios" | "simulador">("costos");
  const [msg, setMsg] = useState("");

  // Costos por recorrido, indexados por slug. Los recorridos sin fila todavía
  // arrancan vacíos: se ven en la lista con su aviso de "sin costos".
  const [costos, setCostos] = useState<Record<string, CostoTour>>(() => {
    const base: Record<string, CostoTour> = {};
    for (const t of TOURS_DB) base[t.slug] = { tourSlug: t.slug, conceptos: [], notas: "" };
    for (const c of costosIniciales) base[c.tourSlug] = c;
    return base;
  });
  const [guardando, setGuardando] = useState<string | null>(null);
  const [sucios,    setSucios]    = useState<Record<string, boolean>>({});
  const [abierto,   setAbierto]   = useState<string | null>(TOURS_DB[0]?.slug ?? null);

  // Precios de los extras (comida, transporte…): los edita Manolo aquí y de
  // aquí salen ya llenos en cada cotización y en cada reserva.
  const [precios,        setPrecios]        = useState<PresetExtra[]>(preciosIniciales);
  const [preciosSucios,  setPreciosSucios]  = useState(false);
  const [guardandoPrec,  setGuardandoPrec]  = useState(false);

  // Tarifas del proveedor de servicios (todo incluido, por persona, por escalón).
  const [tarifas,       setTarifas]       = useState<TarifaProveedor[]>(tarifasIniciales);
  const [tarifasSucias, setTarifasSucias] = useState(false);
  const [guardandoTar,  setGuardandoTar]  = useState(false);

  // Simulador
  const [lineas,    setLineas]    = useState<SimLinea[]>([{ ...LINEA_VACIA }]);
  const [extras,    setExtras]    = useState<ExtraItem[]>([]);
  const [descTipo,  setDescTipo]  = useState<"percent" | "fixed">("percent");
  const [descValor, setDescValor] = useState("");
  const [margenObj, setMargenObj] = useState("40");

  function flash(m: string) {
    setMsg(m);
    if (m.startsWith("✅")) playSuccess(); else if (m.startsWith("❌")) playError();
    setTimeout(() => setMsg(""), 5000);
  }

  // ── Costos ────────────────────────────────────────────────────────────────
  function editarConceptos(slug: string, conceptos: ConceptoCosto[]) {
    setCostos(c => ({ ...c, [slug]: { ...c[slug], conceptos } }));
    setSucios(s => ({ ...s, [slug]: true }));
  }
  function editarNotas(slug: string, notas: string) {
    setCostos(c => ({ ...c, [slug]: { ...c[slug], notas } }));
    setSucios(s => ({ ...s, [slug]: true }));
  }

  async function guardar(slug: string) {
    setGuardando(slug);
    const r = await fetch("/api/admin/costos", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(costos[slug]),
    }).catch(() => null);
    if (r?.ok) {
      setSucios(s => ({ ...s, [slug]: false }));
      flash("✅ Costos guardados");
    } else {
      flash("❌ No se pudieron guardar los costos");
    }
    setGuardando(null);
  }

  // ── Precios de los extras ─────────────────────────────────────────────────
  // 🔴 Sin normalizar mientras se escribe: recortar espacios en cada tecla
  // impedía escribir "Traslado desde Río Verde". Se limpia al guardar.
  function editarPrecio(i: number, campo: keyof PresetExtra, valor: string | number | boolean) {
    setPrecios(ps => ps.map((p, idx) => {
      if (idx !== i) return p;
      const up = { ...p, [campo]: valor } as PresetExtra;
      if (campo === "precio") up.precio = Math.max(0, Math.round(Number(valor)) || 0);
      if (campo === "costo")  up.costo  = Math.max(0, Math.round(Number(valor)) || 0);
      return up;
    }));
    setPreciosSucios(true);
  }

  async function guardarPrecios() {
    // Dos conceptos con el mismo nombre son la misma fila en la base: el
    // segundo se perdería en silencio al guardar. Mejor decirlo antes.
    const nombres = precios.map(p => p.concepto.trim().toLowerCase()).filter(Boolean);
    if (new Set(nombres).size !== nombres.length) {
      flash("❌ Hay dos conceptos con el mismo nombre: cámbiale el nombre a uno");
      return;
    }
    setGuardandoPrec(true);
    const r = await fetch("/api/admin/precios-extras", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ precios: precios.map(normalizarPreset) }),
    }).catch(() => null);
    if (r?.ok) {
      const d = await r.json().catch(() => null);
      if (d?.precios) setPrecios(d.precios);
      setPreciosSucios(false);
      flash("✅ Precios guardados — las cotizaciones nuevas ya los usan");
    } else {
      flash("❌ No se pudieron guardar los precios");
    }
    setGuardandoPrec(false);
  }

  // ── Tarifas del proveedor ─────────────────────────────────────────────────
  function editarTarifa(clave: string, personas: number, precio: number) {
    setTarifas(ts => ts.map(t => t.clave !== clave ? t : {
      ...t,
      tarifas: t.tarifas.map(e => e.personas === personas ? { ...e, precio: Math.max(0, Math.round(precio) || 0) } : e),
    }));
    setTarifasSucias(true);
  }

  async function guardarTarifas() {
    setGuardandoTar(true);
    const r = await fetch("/api/admin/tarifas-proveedor", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tarifas }),
    }).catch(() => null);
    if (r?.ok) { setTarifasSucias(false); flash("✅ Tarifas del proveedor guardadas"); }
    else       { flash("❌ No se pudieron guardar las tarifas"); }
    setGuardandoTar(false);
  }

  /** La tarifa que le toca a una línea: la del recorrido y, si tiene dos, la variante elegida. */
  function tarifaDeLinea(l: SimLinea): TarifaProveedor | undefined {
    const opciones = tarifasDeTour(tarifas, l.tourSlug);
    if (opciones.length === 0) return undefined;
    if (opciones.length === 1) return opciones[0];
    return opciones.find(o => o.variante === l.variante) ?? opciones[0];
  }

  // ── Simulador ─────────────────────────────────────────────────────────────
  const sim = useMemo(() => {
    const filas = lineas.filter(l => l.tourSlug).map(l => {
      const tour      = TOURS_DB.find(t => t.slug === l.tourSlug);
      const conceptos = costos[l.tourSlug]?.conceptos ?? [];
      const personas  = personasDe(l);
      const venta     = calcTourLine(aLineItem(l));

      if (modo === "proveedor") {
        const tarifa = tarifaDeLinea(l);
        return {
          linea: l, nombre: tour?.nombre ?? l.tourSlug, personas, venta,
          costo:     tarifa ? costoProveedor(tarifa.tarifas, personas) : 0,
          sinCostos: !tarifa,
          // Para poder decir en pantalla a qué precio por cabeza salió.
          porPersona: tarifa ? tarifaPorPersona(tarifa.tarifas, personas) : 0,
          escalon:    tarifa ? escalonAplicado(tarifa.tarifas, personas) : null,
          tarifaNombre: tarifa?.nombre ?? "",
        };
      }

      return {
        linea: l, nombre: tour?.nombre ?? l.tourSlug, personas, venta,
        costo: costoDeLinea(conceptos, personas),
        sinCostos: conceptos.length === 0,
        porPersona: 0, escalon: null as number | null, tarifaNombre: "",
      };
    });

    // La comida y el transporte también se cobran y también cuestan: dejarlos
    // fuera daba una ganancia que no era la del viaje que se va a vender.
    const ventaExtras = totalExtras(extras);
    const costoDeExtras = costoExtras(extras);
    const ventaBruta = filas.reduce((s, f) => s + f.venta, 0) + ventaExtras;
    const costoTotal = filas.reduce((s, f) => s + f.costo, 0) + costoDeExtras;
    const dv         = Number(descValor) || 0;
    const descuento  = descValor === "" ? 0
      : descTipo === "percent" ? Math.round(ventaBruta * (dv / 100)) : Math.min(dv, ventaBruta);
    const ventaNeta  = Math.max(0, ventaBruta - descuento);
    const margen     = calcularMargen(ventaNeta, costoTotal);

    // El grupo es el MISMO en todos los recorridos: el máximo por línea, nunca
    // la suma (sumar convertía a una pareja con 5 tours en 10 personas).
    const personasGrupo = filas.length ? Math.max(...filas.map(f => f.personas)) : 0;

    const objetivo = Math.max(0, Math.min(95, Number(margenObj) || 0));
    return {
      filas, ventaExtras, costoDeExtras,
      ventaBruta, costoTotal, descuento, ventaNeta, margen, personasGrupo,
      hastaCero:    descuentoMaximo(ventaBruta, costoTotal, 0),
      hastaObjetivo: descuentoMaximo(ventaBruta, costoTotal, objetivo),
      objetivo,
      faltanCostos: filas.some(f => f.sinCostos),
    };
  }, [lineas, costos, extras, descTipo, descValor, margenObj, modo, tarifas]);

  // "¿Y si fueran N personas?" — el mismo itinerario recalculado por tamaño de
  // grupo. Es la respuesta real a "¿cuánto puedo rebajar?": el costo fijo se
  // reparte entre más gente, así que el descuento que aguanta un grupo de 10 no
  // lo aguanta una pareja.
  const escenarios = useMemo(() => {
    const grupo = sim.personasGrupo;
    // El tamaño REAL del grupo siempre está en la tabla, aunque no sea uno de
    // los redondos: quien cotiza para 14 personas quiere ver el renglón de 14.
    const tamanos = Array.from(new Set([...TAMANOS_GRUPO, grupo].filter(n => n > 0))).sort((a, b) => a - b);

    return tamanos.map(n => {
      let venta = 0, costo = 0;
      for (const l of lineas.filter(x => x.tourSlug)) {
        const esVeh = esTourVehiculo(l.tourSlug);
        const linea: SimLinea = esVeh
          ? { ...l, personasVehiculo: n }
          : { ...l, adultos: n, ninosMid: 0, ninosSmall: 0 };
        venta += calcTourLine(aLineItem(linea));
        if (modo === "proveedor") {
          const tarifa = tarifaDeLinea(l);
          costo += tarifa ? costoProveedor(tarifa.tarifas, n) : 0;
        } else {
          costo += costoDeLinea(costos[l.tourSlug]?.conceptos ?? [], n);
        }
      }
      // Los extras también escalan, pero solo los que van por cabeza. Se
      // reconocen porque su cantidad es justo la del grupo (así nacen al
      // elegirlos); un cargo del viaje entero —el transporte— no se multiplica.
      for (const ex of extras) {
        const porCabeza = grupo > 0 && ex.cantidad === grupo;
        const escalado  = porCabeza ? { ...ex, cantidad: n } : ex;
        venta += calcExtraLine(escalado);
        costo += costoExtraLine(escalado);
      }
      const m  = calcularMargen(venta, costo);
      const dm = descuentoMaximo(venta, costo, 0);
      return {
        personas: n, venta, costo, ganancia: m.ganancia, margenPct: m.margenPct,
        gananciaPorPersona: n > 0 ? m.ganancia / n : 0,
        descuentoPorPersona: n > 0 ? dm.monto / n : 0,
        precioPorPersona: n > 0 ? venta / n : 0,
      };
    });
  }, [lineas, costos, extras, sim.personasGrupo, modo, tarifas]);

  const hayLineas = sim.filas.length > 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-cormorant text-[#1B4332] text-2xl font-light flex items-center gap-2">
            <Calculator className="w-5 h-5 text-[#52B788]" />Cotizador
          </h1>
          <p className="text-[#1B4332]/50 font-dm text-sm mt-1">
            Lo que te cuesta cada recorrido, y cuánto te queda después de un descuento.
          </p>
        </div>
      </div>

      {msg && (
        <div className={`animate-slide-up mb-4 text-sm font-dm px-4 py-2 rounded border ${
          msg.startsWith("✅") ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-700"
        }`}>{msg}</div>
      )}

      {/* Con qué costos se calcula */}
      <div className="bg-white border border-[#1B4332]/12 rounded-sm p-3 mb-4">
        <p className="text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-2">¿Con qué costos calculo?</p>
        <div className="flex gap-2 flex-wrap">
          {([
            { key: "mios", Icon: Wallet, label: "Mis costos",
              sub: "Lo que pagas tú: por persona + fijo por salida" },
            { key: "proveedor", Icon: Truck, label: "Un proveedor de servicios",
              sub: "Su tarifa por persona, todo incluido, según el grupo" },
          ] as const).map(m => {
            const activo = modo === m.key;
            return (
              <button key={m.key} type="button"
                onClick={() => {
                  playClick();
                  setModo(m.key);
                  // La pestaña de costos cambia de dueño: no dejar al usuario
                  // mirando una pantalla que ya no corresponde al modo.
                  if (tab === "costos" || tab === "proveedor") setTab(m.key === "mios" ? "costos" : "proveedor");
                }}
                className={`flex items-start gap-2 text-left px-3 py-2 rounded-sm border transition-colors ${
                  activo ? "bg-[#1B4332] text-white border-[#1B4332]" : "border-[#1B4332]/20 text-[#1B4332] hover:bg-[#1B4332]/6"
                }`}>
                <m.Icon className={`w-4 h-4 mt-0.5 shrink-0 ${activo ? "text-[#52B788]" : "text-[#1B4332]/40"}`} />
                <span>
                  <span className="block text-xs font-dm font-medium">{m.label}</span>
                  <span className={`block text-[10px] font-dm ${activo ? "text-white/55" : "text-[#1B4332]/45"}`}>{m.sub}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pestañas */}
      <div className="flex gap-1.5 mb-5">
        {(modo === "mios"
          ? [
              { key: "costos"    as const, label: "Mis costos"        },
              { key: "precios"   as const, label: "Precios de extras" },
              { key: "simulador" as const, label: "Simulador"         },
            ]
          : [
              { key: "proveedor" as const, label: "Tarifas del proveedor" },
              { key: "precios"   as const, label: "Precios de extras"     },
              { key: "simulador" as const, label: "Simulador"             },
            ]
        ).map(t => (
          <button key={t.key} onClick={() => { playClick(); setTab(t.key); }}
            className={`px-4 py-2 text-xs font-dm rounded-sm transition-colors ${
              tab === t.key ? "bg-[#1B4332] text-white" : "border border-[#1B4332]/15 text-[#1B4332]/60 hover:text-[#1B4332] hover:border-[#1B4332]/30"
            }`}>{t.label}</button>
        ))}
      </div>

      {/* ══ Mis costos ══════════════════════════════════════════════════════ */}
      {tab === "costos" && modo === "mios" && (
        <div className="space-y-2">
          <p className="text-[#1B4332]/50 font-dm text-xs mb-3 max-w-3xl">
            Anota lo que pagas por cada recorrido. Marca cada gasto como{" "}
            <strong className="text-[#1B4332]">por persona</strong> (entradas, comida: cada persona extra lo vuelve a pagar)
            o <strong className="text-[#1B4332]">fijo por salida</strong> (camioneta, guía: cuestan lo mismo con 2 que con 8).
            Esa diferencia es la que decide cuánto descuento aguanta cada grupo.
          </p>

          {TOURS_DB.map(t => {
            const c        = costos[t.slug];
            const resumen  = resumirCostos(c.conceptos);
            const abiertoT = abierto === t.slug;
            const sinDatos = c.conceptos.length === 0;
            // Referencia rápida: el margen con un grupo de 4, que es el típico.
            const ventaRef = calcTourLine(aLineItem({ ...LINEA_VACIA, tourSlug: t.slug, adultos: 4, unidades: 1, ruta: t.rutas?.[0]?.nombre, vehiculo: t.flota?.[0]?.nombre }));
            const costoRef = costoDeLinea(c.conceptos, 4);
            const margRef  = calcularMargen(ventaRef, costoRef);

            return (
              <div key={t.slug} className="bg-white border border-[#1B4332]/10 rounded-sm overflow-hidden">
                <button onClick={() => { playClick(); setAbierto(abiertoT ? null : t.slug); }}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[#FAFAF8] transition-colors">
                  <div className="min-w-0">
                    <p className="text-[#1B4332] font-dm text-sm font-medium truncate">{t.nombre.split(" — ")[0]}</p>
                    <p className="text-[#1B4332]/45 font-dm text-xs mt-0.5">
                      Precio de venta {fmxL(t.precio)} {t.precioUnidad === "vehiculo" ? "por vehículo" : "por persona"}
                      {!sinDatos && <> · te cuesta {fmx(resumen.porPersona)}/persona + {fmx(resumen.fijo)} por salida</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {sinDatos
                      ? <Chip ok={false}>Sin costos</Chip>
                      : <Chip ok={margRef.margenPct >= 30}>{margRef.margenPct}% con 4 personas</Chip>}
                    {sucios[t.slug] && <span className="text-[10px] font-dm text-[#C4882A]">Sin guardar</span>}
                  </div>
                </button>

                {abiertoT && (
                  <div className="border-t border-[#1B4332]/8 px-4 py-4 space-y-3">
                    {/* Atajos */}
                    <div className="flex gap-1.5 flex-wrap">
                      {CONCEPTOS_PRESET.map(p => (
                        <button key={p.concepto} type="button"
                          onClick={() => editarConceptos(t.slug, [...c.conceptos, { ...EMPTY_CONCEPTO, concepto: p.concepto, tipo: p.tipo }])}
                          className="text-[10px] font-dm px-2 py-1 rounded border border-[#1B4332]/20 text-[#1B4332]/70 hover:bg-[#1B4332]/8 transition-colors">
                          + {p.concepto}
                        </button>
                      ))}
                    </div>

                    {c.conceptos.length === 0 && (
                      <p className="text-[10px] font-dm text-[#1B4332]/30 border border-dashed border-[#1B4332]/15 rounded-sm py-4 text-center">
                        Sin costos capturados — mientras esté así, la ganancia de este recorrido se ve más alta de lo que es
                      </p>
                    )}

                    <div className="space-y-2">
                      {c.conceptos.map((con, i) => (
                        <div key={i} className="grid grid-cols-12 gap-2 items-center">
                          <input type="text" value={con.concepto} placeholder="Concepto"
                            onChange={e => editarConceptos(t.slug, c.conceptos.map((x, idx) => idx === i ? { ...x, concepto: e.target.value } : x))}
                            className={`${inputCls} col-span-5`} />
                          <div className="col-span-3 flex items-center gap-1">
                            <span className="text-[#1B4332]/40 font-dm text-sm">$</span>
                            <input type="number" min={0} value={con.monto}
                              onChange={e => editarConceptos(t.slug, c.conceptos.map((x, idx) => idx === i ? { ...x, monto: Math.max(0, Number(e.target.value) || 0) } : x))}
                              className={inputCls} />
                          </div>
                          <div className="col-span-3 flex border border-[#1B4332]/15 rounded-sm overflow-hidden">
                            {(["persona", "fijo"] as TipoCosto[]).map(tipo => (
                              <button key={tipo} type="button"
                                onClick={() => editarConceptos(t.slug, c.conceptos.map((x, idx) => idx === i ? { ...x, tipo } : x))}
                                className={`flex-1 px-2 py-2 text-[10px] font-dm transition-colors ${
                                  con.tipo === tipo ? "bg-[#1B4332] text-white" : "bg-white text-[#1B4332]/60 hover:bg-[#FAFAF8]"
                                }`}>
                                {tipo === "persona" ? "Por persona" : "Por salida"}
                              </button>
                            ))}
                          </div>
                          <button type="button" onClick={() => editarConceptos(t.slug, c.conceptos.filter((_, idx) => idx !== i))}
                            className="col-span-1 text-[#1B4332]/30 hover:text-red-500 flex justify-center">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <button type="button" onClick={() => editarConceptos(t.slug, [...c.conceptos, { ...EMPTY_CONCEPTO }])}
                      className="flex items-center gap-1 text-xs font-dm text-[#1B4332] border border-[#1B4332]/30 px-2 py-1 hover:bg-[#1B4332]/8 transition-colors rounded-sm">
                      <Plus className="w-3 h-3" />Otro concepto
                    </button>

                    <div>
                      <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Nota (proveedor, temporada…)</label>
                      <input type="text" value={c.notas} placeholder="Lanchero de Tanchachín, sube en Semana Santa"
                        onChange={e => editarNotas(t.slug, e.target.value)} className={inputCls} />
                    </div>

                    {/* Lo que sale de estos números */}
                    <div className="bg-[#FAFAF8] border border-[#1B4332]/8 rounded-sm p-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <p className="text-[9px] tracking-[2px] uppercase text-[#1B4332]/40 font-dm">Por persona</p>
                        <p className="font-cormorant text-[#1B4332] text-xl">{fmx(resumen.porPersona)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] tracking-[2px] uppercase text-[#1B4332]/40 font-dm">Fijo por salida</p>
                        <p className="font-cormorant text-[#1B4332] text-xl">{fmx(resumen.fijo)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] tracking-[2px] uppercase text-[#1B4332]/40 font-dm">Ganas con 4</p>
                        <p className={`font-cormorant text-xl ${margRef.ganancia >= 0 ? "text-[#52B788]" : "text-[#C9484A]"}`}>{fmx(margRef.ganancia)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] tracking-[2px] uppercase text-[#1B4332]/40 font-dm">Margen con 4</p>
                        <p className={`font-cormorant text-xl ${margRef.margenPct >= 30 ? "text-[#52B788]" : "text-[#C9484A]"}`}>{margRef.margenPct}%</p>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button onClick={() => { playClick(); guardar(t.slug); }} disabled={guardando === t.slug}
                        className="flex items-center gap-1.5 bg-[#1B4332] hover:bg-[#2D5A45] text-white px-4 py-2 text-[11px] font-dm uppercase tracking-[1.5px] transition-colors disabled:opacity-40 rounded-sm">
                        {guardando === t.slug ? <>Guardando…</> : <><Save className="w-3.5 h-3.5" />Guardar costos</>}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ══ Tarifas del proveedor ═══════════════════════════════════════════ */}
      {tab === "proveedor" && modo === "proveedor" && (
        <div>
          <p className="text-[#1B4332]/50 font-dm text-xs mb-4 max-w-4xl">
            Lo que te cobra el proveedor <strong className="text-[#1B4332]">por persona, todo incluido</strong> —
            transporte, guía, desayuno y entradas—. La tarifa baja conforme crece el grupo: un grupo de 5 paga la
            tarifa de 4, porque se toma el escalón que ya alcanzó, no el siguiente.
          </p>

          <div className="bg-white border border-[#1B4332]/10 rounded-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-dm border-collapse">
                <thead>
                  <tr className="bg-[#1B4332] text-white">
                    <th className="text-left px-3 py-2.5 text-[10px] tracking-[1.5px] uppercase font-dm sticky left-0 bg-[#1B4332] min-w-[200px]">
                      Recorrido
                    </th>
                    {ESCALONES.map(n => (
                      <th key={n} className="px-1 py-2.5 text-[11px] font-dm font-medium w-[74px]">{n}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tarifas.map(t => (
                    <tr key={t.clave} className="border-b border-[#1B4332]/8 last:border-0">
                      <td className="px-3 py-2 sticky left-0 bg-white">
                        <p className="text-[#1B4332] font-medium leading-tight">{t.nombre}</p>
                        {t.variante && (
                          <p className="text-[#1B4332]/40 text-[10px] mt-0.5">versión: {t.variante}</p>
                        )}
                      </td>
                      {ESCALONES.map(n => {
                        const e = t.tarifas.find(x => x.personas === n);
                        return (
                          <td key={n} className="px-1 py-1.5">
                            <input type="number" min={0} value={e?.precio ?? 0}
                              onChange={ev => editarTarifa(t.clave, n, Number(ev.target.value))}
                              className="w-full border border-[#1B4332]/15 text-[#1B4332] font-dm text-xs px-1.5 py-1.5 text-right focus:outline-none focus:border-[#1B4332] rounded-sm bg-white
                                         [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 mt-3">
            <p className="text-[10px] font-dm text-[#1B4332]/40 max-w-xl">
              El proveedor no cotiza los diez recorridos. Los que no están en esta tabla —el RZR, el rappel, el
              rafting, el buceo y la Travesía del Café— salen marcados en el simulador en vez de calcularse con
              una ganancia inventada.
            </p>
            <div className="flex items-center gap-3 shrink-0">
              {tarifasSucias && <span className="text-[10px] font-dm text-[#C4882A]">Sin guardar</span>}
              <button onClick={() => { playClick(); guardarTarifas(); }} disabled={guardandoTar}
                className="flex items-center gap-1.5 bg-[#1B4332] hover:bg-[#2D5A45] text-white px-4 py-2 text-[11px] font-dm uppercase tracking-[1.5px] transition-colors disabled:opacity-40 rounded-sm">
                {guardandoTar ? "Guardando…" : <><Save className="w-3.5 h-3.5" />Guardar tarifas</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Precios de extras ═══════════════════════════════════════════════ */}
      {tab === "precios" && (
        <div className="max-w-4xl">
          <p className="text-[#1B4332]/50 font-dm text-xs mb-4">
            Lo que cobras y lo que te cuesta la comida, el transporte y lo demás que va aparte del recorrido.
            Estos números llenan solos cada cotización nueva — dentro de la cotización los puedes pisar,
            y <strong className="text-[#1B4332]">cambiarlos aquí nunca toca una cotización que ya mandaste</strong>.
          </p>

          <div className="bg-white border border-[#1B4332]/10 rounded-sm overflow-hidden">
            <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2.5 bg-[#FAFAF8] border-b border-[#1B4332]/10 text-[9px] tracking-[1.5px] uppercase text-[#1B4332]/50 font-dm">
              <span className="col-span-3">Concepto</span>
              <span className="col-span-2">Detalle (lo ve el cliente)</span>
              <span className="col-span-2">Le cobras</span>
              <span className="col-span-2">Te cuesta</span>
              <span className="col-span-2">Se cobra</span>
              <span className="col-span-1" />
            </div>

            <div className="divide-y divide-[#1B4332]/6">
              {precios.map((pr, i) => {
                const deja = pr.precio - pr.costo;
                return (
                  <div key={i} className="grid grid-cols-12 gap-2 px-4 py-3 items-center">
                    <input type="text" value={pr.concepto} placeholder="Concepto"
                      onChange={e => editarPrecio(i, "concepto", e.target.value)}
                      className={`${inputCls} col-span-12 md:col-span-3`} />
                    <input type="text" value={pr.detalle} placeholder="Descripción corta"
                      onChange={e => editarPrecio(i, "detalle", e.target.value)}
                      className={`${inputCls} col-span-12 md:col-span-2`} />
                    <div className="col-span-6 md:col-span-2 flex items-center gap-1">
                      <span className="text-[#1B4332]/40 font-dm text-sm">$</span>
                      <input type="number" min={0} value={pr.precio}
                        onChange={e => editarPrecio(i, "precio", Number(e.target.value))} className={inputCls} />
                    </div>
                    <div className="col-span-6 md:col-span-2 flex items-center gap-1">
                      <span className="text-[#1B4332]/40 font-dm text-sm">$</span>
                      <input type="number" min={0} value={pr.costo}
                        onChange={e => editarPrecio(i, "costo", Number(e.target.value))} className={inputCls} />
                    </div>
                    <div className="col-span-10 md:col-span-2 flex border border-[#1B4332]/15 rounded-sm overflow-hidden">
                      <button type="button" onClick={() => editarPrecio(i, "porPersona", true)}
                        className={`flex-1 px-2 py-2 text-[10px] font-dm transition-colors ${
                          pr.porPersona ? "bg-[#1B4332] text-white" : "bg-white text-[#1B4332]/60 hover:bg-[#FAFAF8]"
                        }`}>Por persona</button>
                      <button type="button" onClick={() => editarPrecio(i, "porPersona", false)}
                        className={`flex-1 px-2 py-2 text-[10px] font-dm transition-colors ${
                          !pr.porPersona ? "bg-[#1B4332] text-white" : "bg-white text-[#1B4332]/60 hover:bg-[#FAFAF8]"
                        }`}>Por viaje</button>
                    </div>
                    <button type="button"
                      onClick={() => { setPrecios(ps => ps.filter((_, idx) => idx !== i)); setPreciosSucios(true); }}
                      className="col-span-2 md:col-span-1 text-[#1B4332]/30 hover:text-red-500 flex justify-end md:justify-center">
                      <X className="w-4 h-4" />
                    </button>
                    {pr.precio > 0 && pr.costo > 0 && (
                      <p className={`col-span-12 text-[10px] font-dm ${deja >= 0 ? "text-[#1B4332]/40" : "text-[#C9484A]"}`}>
                        {deja >= 0
                          ? `Te deja ${fmx(deja)} por ${pr.porPersona ? "persona" : "viaje"}`
                          : `Pierdes ${fmx(Math.abs(deja))} cada vez que lo vendes`}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 mt-3">
            <button type="button"
              onClick={() => { setPrecios(ps => [...ps, { concepto: "", detalle: "", precio: 0, costo: 0, porPersona: true }]); setPreciosSucios(true); }}
              className="flex items-center gap-1 text-xs font-dm text-[#1B4332] border border-[#1B4332]/30 px-2 py-1.5 hover:bg-[#1B4332]/8 transition-colors rounded-sm">
              <Plus className="w-3 h-3" />Agregar concepto
            </button>
            <div className="flex items-center gap-3">
              {preciosSucios && <span className="text-[10px] font-dm text-[#C4882A]">Sin guardar</span>}
              <button onClick={() => { playClick(); guardarPrecios(); }} disabled={guardandoPrec}
                className="flex items-center gap-1.5 bg-[#1B4332] hover:bg-[#2D5A45] text-white px-4 py-2 text-[11px] font-dm uppercase tracking-[1.5px] transition-colors disabled:opacity-40 rounded-sm">
                {guardandoPrec ? "Guardando…" : <><Save className="w-3.5 h-3.5" />Guardar precios</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Simulador ═══════════════════════════════════════════════════════ */}
      {tab === "simulador" && (
        <div className="grid lg:grid-cols-2 gap-5 items-start">

          {/* Armado del viaje */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm">Recorridos del viaje</p>
              <button onClick={() => { playClick(); setLineas(ls => [...ls, { ...LINEA_VACIA }]); }}
                className="flex items-center gap-1 text-xs font-dm text-[#1B4332] border border-[#1B4332]/30 px-2 py-1 hover:bg-[#1B4332]/8 transition-colors rounded-sm">
                <Plus className="w-3 h-3" />Agregar recorrido
              </button>
            </div>

            {lineas.map((l, i) => {
              const t     = TOURS_DB.find(x => x.slug === l.tourSlug);
              const esVeh = esTourVehiculo(l.tourSlug);
              const rutaIdx = t?.rutas ? Math.max(0, t.rutas.findIndex(r => r.nombre === l.ruta)) : 0;
              const up = (campo: keyof SimLinea, valor: string | number) =>
                setLineas(ls => ls.map((x, idx) => {
                  if (idx !== i) return x;
                  const nueva = { ...x, [campo]: valor } as SimLinea;
                  if (campo === "tourSlug") {
                    const nt = TOURS_DB.find(y => y.slug === valor);
                    if (nt?.precioUnidad === "vehiculo" && nt.rutas && nt.flota) {
                      nueva.ruta = nt.rutas[0].nombre;
                      nueva.vehiculo = nt.flota[0].nombre;
                      nueva.unidades = 1;
                      nueva.personasVehiculo = nueva.personasVehiculo ?? 4;
                    } else {
                      delete nueva.ruta; delete nueva.vehiculo; delete nueva.unidades;
                    }
                  }
                  return nueva;
                }));

              return (
                <div key={i} className="bg-white border border-[#1B4332]/10 rounded-sm p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] tracking-[2px] uppercase text-[#1B4332]/40 font-dm">Recorrido {i + 1}</span>
                    {lineas.length > 1 && (
                      <button onClick={() => setLineas(ls => ls.filter((_, idx) => idx !== i))}
                        className="text-[#1B4332]/30 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                    )}
                  </div>

                  <select value={l.tourSlug} onChange={e => up("tourSlug", e.target.value)} className={inputCls}>
                    <option value="">Seleccionar recorrido…</option>
                    {TOURS_DB.map(x => (
                      <option key={x.slug} value={x.slug}>
                        {x.nombre.split(" — ")[0]}{x.precioUnidad === "vehiculo" ? " (por vehículo)" : ""}
                      </option>
                    ))}
                  </select>

                  {/* Con proveedor: cuál de sus versiones y a qué tarifa sale */}
                  {modo === "proveedor" && l.tourSlug && (() => {
                    const opciones = tarifasDeTour(tarifas, l.tourSlug);
                    if (opciones.length === 0) {
                      return (
                        <p className="text-[11px] font-dm text-[#C9484A] bg-[#C9484A]/8 border border-[#C9484A]/25 rounded-sm px-2 py-1.5">
                          El proveedor no cotiza este recorrido. Se cuenta como costo $0, así que la ganancia que veas está inflada.
                        </p>
                      );
                    }
                    const elegida = opciones.find(o => o.variante === l.variante) ?? opciones[0];
                    const personas = personasDe(l);
                    return (
                      <div className="border border-[#1B4332]/15 bg-[#FAFAF8] rounded-sm p-2.5 space-y-1.5">
                        {opciones.length > 1 && (
                          <div>
                            <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">
                              Versión que cotiza el proveedor
                            </label>
                            <select value={elegida.variante} onChange={e => up("variante", e.target.value)} className={inputCls}>
                              {opciones.map(o => <option key={o.clave} value={o.variante}>{o.nombre}</option>)}
                            </select>
                          </div>
                        )}
                        <p className="text-[11px] font-dm text-[#1B4332]/60">
                          Te cobra <span className="text-[#1B4332] font-medium">{fmx(tarifaPorPersona(elegida.tarifas, personas))} por persona</span>
                          {" "}(escalón de {escalonAplicado(elegida.tarifas, personas)}) · {personas} personas ={" "}
                          <span className="text-[#C9484A] font-medium">{fmx(costoProveedor(elegida.tarifas, personas))}</span>
                        </p>
                      </div>
                    );
                  })()}

                  {esVeh && t ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Ruta</label>
                        <select value={l.ruta} onChange={e => up("ruta", e.target.value)} className={inputCls}>
                          {t.rutas!.map(r => <option key={r.nombre} value={r.nombre}>{r.nombre}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Vehículo</label>
                        <select value={l.vehiculo} onChange={e => up("vehiculo", e.target.value)} className={inputCls}>
                          {t.flota!.map(v => <option key={v.nombre} value={v.nombre}>{v.nombre} — {fmx(v.precios[rutaIdx])}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Unidades</label>
                        <input type="number" min={1} max={10} value={l.unidades ?? 1}
                          onChange={e => up("unidades", Math.max(1, Number(e.target.value) || 1))} className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1" title="No cambia el precio (se cobra por vehículo), pero sí lo que cuestan entradas y comida.">
                          Personas a bordo
                        </label>
                        <input type="number" min={1} max={40} value={l.personasVehiculo ?? 4}
                          onChange={e => up("personasVehiculo", Math.max(1, Number(e.target.value) || 1))} className={inputCls} />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">Adultos</label>
                        <input type="number" min={0} max={40} value={l.adultos}
                          onChange={e => up("adultos", Math.max(0, Number(e.target.value) || 0))} className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1 truncate" title="Pagan el 70%">Niños 6–10</label>
                        <input type="number" min={0} max={20} value={l.ninosMid}
                          onChange={e => up("ninosMid", Math.max(0, Number(e.target.value) || 0))} className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1 truncate" title="Pagan el 50%">Niños &lt;6</label>
                        <input type="number" min={0} max={20} value={l.ninosSmall}
                          onChange={e => up("ninosSmall", Math.max(0, Number(e.target.value) || 0))} className={inputCls} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Comida, transporte y lo demás que va aparte */}
            <div className="bg-white border border-[#1B4332]/10 rounded-sm p-3">
              <ExtrasEditor
                extras={extras}
                personas={sim.personasGrupo}
                presets={precios}
                onChange={setExtras}
                titulo="Comida, transporte y otros extras"
              />
            </div>

            {/* Descuento */}
            <div className="bg-white border border-[#1B4332]/10 rounded-sm p-3 space-y-3">
              <p className="text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm">Descuento que piensas dar</p>
              <div className="flex gap-2 items-center">
                <div className="flex border border-[#1B4332]/15 rounded-sm overflow-hidden">
                  <button onClick={() => setDescTipo("percent")}
                    className={`px-3 py-2 text-xs font-dm transition-colors ${descTipo === "percent" ? "bg-[#1B4332] text-white" : "bg-white text-[#1B4332]/60"}`}>%</button>
                  <button onClick={() => setDescTipo("fixed")}
                    className={`px-3 py-2 text-xs font-dm transition-colors ${descTipo === "fixed" ? "bg-[#1B4332] text-white" : "bg-white text-[#1B4332]/60"}`}>$</button>
                </div>
                <input type="number" min={0} value={descValor} onChange={e => setDescValor(e.target.value)}
                  placeholder={descTipo === "percent" ? "ej. 10" : "ej. 800"} className={inputCls} />
                {descValor !== "" && (
                  <button onClick={() => setDescValor("")} className="text-[#1B4332]/30 hover:text-red-500"><X className="w-4 h-4" /></button>
                )}
              </div>
              <div>
                <label className="block text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-1">
                  Margen que no quieres bajar
                </label>
                <div className="flex items-center gap-2">
                  <input type="number" min={0} max={95} value={margenObj} onChange={e => setMargenObj(e.target.value)}
                    className={`${inputCls} max-w-[100px]`} />
                  <Percent className="w-3.5 h-3.5 text-[#1B4332]/40" />
                </div>
              </div>
            </div>
          </div>

          {/* Resultado */}
          <div className="space-y-3 lg:sticky lg:top-4">
            {!hayLineas && (
              <div className="bg-white border border-dashed border-[#1B4332]/15 rounded-sm py-12 text-center">
                <p className="text-[#1B4332]/35 font-dm text-sm">Elige un recorrido para ver la ganancia</p>
              </div>
            )}

            {hayLineas && (
              <>
                {sim.faltanCostos && (
                  <div className="flex items-start gap-2 bg-[#C9484A]/8 border border-[#C9484A]/25 rounded-sm px-3 py-2.5">
                    <AlertTriangle className="w-4 h-4 text-[#C9484A] shrink-0 mt-0.5" />
                    <p className="text-[#C9484A] font-dm text-xs">
                      {modo === "proveedor"
                        ? <>Hay recorridos que el proveedor no cotiza. Lo que ves como ganancia está inflado: quítalos o cámbiate a <strong>Mis costos</strong>.</>
                        : <>Hay recorridos sin costos capturados. Lo que ves como ganancia está inflado: captúralos en <strong>Mis costos</strong>.</>}
                    </p>
                  </div>
                )}

                <div className="bg-[#1B4332] rounded-sm p-5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[9px] tracking-[2px] uppercase text-white/50 font-dm">Ganancia neta</span>
                    <span className={`font-cormorant text-3xl ${sim.margen.ganancia >= 0 ? "text-[#52B788]" : "text-[#F08080]"}`}>
                      {fmx(sim.margen.ganancia)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-[10px] font-dm text-white/40">Margen</span>
                    <span className={`font-dm text-sm ${sim.margen.margenPct >= sim.objetivo ? "text-[#52B788]" : "text-[#E8B04B]"}`}>
                      {sim.margen.margenPct}%
                    </span>
                  </div>
                  {sim.personasGrupo > 0 && (
                    <div className="flex items-baseline justify-between mt-1 pt-2 border-t border-white/10">
                      <span className="text-[10px] font-dm text-white/40 flex items-center gap-1">
                        <Users className="w-3 h-3" />Por persona ({sim.personasGrupo})
                      </span>
                      <span className="font-dm text-sm text-white/80">{fmx(sim.margen.ganancia / sim.personasGrupo)}</span>
                    </div>
                  )}
                </div>

                <div className="bg-white border border-[#1B4332]/10 rounded-sm p-4 space-y-1.5">
                  {sim.ventaExtras > 0 && (
                    <>
                      <div className="flex justify-between text-xs font-dm text-[#1B4332]/45">
                        <span>Recorridos</span><span>{fmxL(sim.ventaBruta - sim.ventaExtras)}</span>
                      </div>
                      <div className="flex justify-between text-xs font-dm text-[#C4882A]">
                        <span>Extras</span><span>{fmxL(sim.ventaExtras)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between text-sm font-dm text-[#1B4332]/70">
                    <span>Precio de lista</span><span>{fmxL(sim.ventaBruta)}</span>
                  </div>
                  {sim.descuento > 0 && (
                    <div className="flex justify-between text-sm font-dm text-[#C4882A]">
                      <span>Descuento</span><span>−{fmxL(sim.descuento)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-dm text-[#1B4332] font-medium pt-1.5 border-t border-[#1B4332]/8">
                    <span>Cobras</span><span>{fmxL(sim.ventaNeta)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-dm text-[#C9484A]">
                    <span>Te cuesta operarlo</span><span>−{fmxL(sim.costoTotal)}</span>
                  </div>
                  {sim.costoDeExtras > 0 && (
                    <p className="text-[10px] font-dm text-[#1B4332]/35">
                      De eso, {fmx(sim.costoDeExtras)} son los extras.
                    </p>
                  )}
                  <div className="flex justify-between text-sm font-dm font-medium pt-1.5 border-t border-[#1B4332]/8">
                    <span className="text-[#1B4332]">Ganancia neta</span>
                    <span className={sim.margen.ganancia >= 0 ? "text-[#52B788]" : "text-[#C9484A]"}>
                      {fmxL(sim.margen.ganancia)}
                    </span>
                  </div>
                </div>

                {/* Hasta dónde puede llegar el descuento */}
                <div className="bg-white border border-[#52B788]/30 rounded-sm p-4">
                  <p className="text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-2">Hasta dónde puedes rebajar</p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-dm text-[#1B4332]/60">Sin bajar del {sim.objetivo}% de margen</span>
                      <span className="font-dm text-sm text-[#1B4332] font-medium">
                        {fmx(sim.hastaObjetivo.monto)} <span className="text-[#1B4332]/40">({sim.hastaObjetivo.pct}%)</span>
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-dm text-[#1B4332]/60">Antes de dejar de ganar</span>
                      <span className="font-dm text-sm text-[#C9484A]">
                        {fmx(sim.hastaCero.monto)} <span className="opacity-60">({sim.hastaCero.pct}%)</span>
                      </span>
                    </div>
                    {sim.personasGrupo > 0 && (
                      <p className="text-[11px] font-dm text-[#1B4332]/45 pt-2 border-t border-[#1B4332]/8">
                        Son {fmx(sim.hastaObjetivo.monto / sim.personasGrupo)} por persona manteniendo tu margen, o hasta{" "}
                        {fmx(sim.hastaCero.monto / sim.personasGrupo)} por persona si te conformas con no perder.
                      </p>
                    )}
                  </div>
                </div>

                {/* Desglose por recorrido */}
                <div className="bg-white border border-[#1B4332]/10 rounded-sm overflow-hidden">
                  <table className="w-full text-xs font-dm">
                    <thead className="bg-[#FAFAF8]">
                      <tr className="text-[#1B4332]/50 text-[9px] tracking-[1.5px] uppercase border-b border-[#1B4332]/10">
                        <th className="py-2 px-3 text-left">Recorrido</th>
                        <th className="py-2 px-3 text-right">Cobras</th>
                        <th className="py-2 px-3 text-right">Cuesta</th>
                        <th className="py-2 px-3 text-right">Queda</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sim.filas.map((f, i) => (
                        <tr key={i} className="border-b border-[#1B4332]/6 last:border-0">
                          <td className="py-2 px-3 text-[#1B4332]/80">
                            {f.nombre.split(" — ")[0]}
                            {f.sinCostos && (
                              <span className="block text-[10px] text-[#C9484A]">
                                {modo === "proveedor" ? "no lo cotiza" : "sin costos"}
                              </span>
                            )}
                            {modo === "proveedor" && !f.sinCostos && (
                              <span className="block text-[10px] text-[#1B4332]/40">
                                {fmx(f.porPersona)}/persona · escalón {f.escalon}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right text-[#1B4332]/70">{fmx(f.venta)}</td>
                          <td className="py-2 px-3 text-right text-[#C9484A]/80">{fmx(f.costo)}</td>
                          <td className={`py-2 px-3 text-right font-medium ${f.venta - f.costo >= 0 ? "text-[#52B788]" : "text-[#C9484A]"}`}>
                            {fmx(f.venta - f.costo)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Escenarios por tamaño de grupo */}
                <div className="bg-white border border-[#1B4332]/10 rounded-sm overflow-hidden">
                  <div className="px-3 py-2.5 bg-[#FAFAF8] border-b border-[#1B4332]/10">
                    <p className="text-[9px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm">El mismo viaje, con más gente</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-dm">
                      <thead>
                        <tr className="text-[#1B4332]/50 text-[9px] tracking-[1.5px] uppercase border-b border-[#1B4332]/10">
                          <th className="py-2 px-3 text-left">Personas</th>
                          <th className="py-2 px-3 text-right">Cobras</th>
                          <th className="py-2 px-3 text-right">Te queda</th>
                          <th className="py-2 px-3 text-right">Margen</th>
                          <th className="py-2 px-3 text-right">Rebaja máx. p/persona</th>
                        </tr>
                      </thead>
                      <tbody>
                        {escenarios.map(e => (
                          <tr key={e.personas} className={`border-b border-[#1B4332]/6 last:border-0 ${
                            e.personas === sim.personasGrupo ? "bg-[#52B788]/8" : ""
                          }`}>
                            <td className="py-2 px-3 text-[#1B4332]/80">
                              {e.personas}
                              {e.personas === sim.personasGrupo && <span className="text-[#52B788] ml-1">←</span>}
                            </td>
                            <td className="py-2 px-3 text-right text-[#1B4332]/70">{fmx(e.venta)}</td>
                            <td className={`py-2 px-3 text-right font-medium ${e.ganancia >= 0 ? "text-[#52B788]" : "text-[#C9484A]"}`}>
                              {fmx(e.ganancia)}
                            </td>
                            <td className={`py-2 px-3 text-right ${e.margenPct >= sim.objetivo ? "text-[#52B788]" : "text-[#E8B04B]"}`}>
                              {e.margenPct}%
                            </td>
                            <td className="py-2 px-3 text-right text-[#1B4332]/60">{fmx(e.descuentoPorPersona)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="px-3 py-2 text-[10px] font-dm text-[#1B4332]/35 border-t border-[#1B4332]/8">
                    Todos como adultos, sin descuento. Los extras que van por cabeza se recalculan con el grupo;
                    los del viaje entero (transporte) no. Los recorridos por vehículo mantienen las unidades que
                    elegiste: el precio no cambia, el costo por persona sí.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
