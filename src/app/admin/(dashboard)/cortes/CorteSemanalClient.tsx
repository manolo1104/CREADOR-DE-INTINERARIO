"use client";

/**
 * El corte semanal con el socio.
 *
 * Arriba se elige la semana (lunes a domingo; por defecto la actual). Cada
 * salida —un tour en un día, con todas sus reservas— llega palomeada y con los
 * costos que propone el Cotizador; se corrigen, se quita la que no entra y a la
 * derecha sale el estado de resultados con lo que le toca a cada socio.
 * "Guardar corte" deja la semana en el historial; "Imprimir / PDF" saca la hoja.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Loader2, Plus, Printer, Save, Wallet, X } from "lucide-react";
import CobroModal from "@/components/admin/CobroModal";
import { hoyMX, addDaysYMD } from "@/lib/dates";
import {
  lunesDe, etiquetaSemana, diaCorto, fmx, capturaDe, calcularCorte, repartir,
  SOCIO_HOTEL, type SalidaCorte, type ReservaCorte, type Captura, type CapturaSalida, type CostoCorte, type ResumenCorte,
} from "@/lib/admin/corteSemanal";
import { playClick, playSuccess, playError } from "@/lib/admin/sfx";

interface Guardado { captura: Captura; resumen: ResumenCorte; guardadoPor: string; updatedAt: string }
interface Semana { semana: string; hasta: string; salidas: SalidaCorte[]; guardado: Guardado | null }
interface FilaHistorial {
  semana: string; hasta: string; ventas: number; costos: number; utilidad: number;
  guardadoPor: string; updatedAt: string;
}

const BTN   = "inline-flex items-center justify-center gap-1.5 bg-[#1B4332] hover:bg-[#2D5A45] disabled:opacity-50 text-white px-3 py-2.5 text-[10px] font-dm uppercase tracking-[1px] rounded-sm panel-pulsable panel-foco";
const BTN_2 = "inline-flex items-center justify-center gap-1.5 border border-[#1B4332]/20 hover:border-[#1B4332]/45 bg-white text-[#1B4332] px-3 py-2.5 text-[10px] font-dm uppercase tracking-[1px] rounded-sm panel-pulsable panel-foco";
const INPUT = "border border-[#1B4332]/15 bg-white text-[#1B4332] text-xs font-dm px-2 py-1.5 rounded-sm focus:outline-none focus:border-[#1B4332]";

function fechaGuardado(iso: string): string {
  return new Date(iso).toLocaleString("es-MX", {
    day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Mexico_City",
  });
}

export default function CorteSemanalClient({ quien = "Admin" }: { quien?: string }) {
  const hoyLunes = lunesDe(hoyMX());
  const [semana, setSemana]       = useState(hoyLunes);
  const [datos, setDatos]         = useState<Semana | null>(null);
  const [captura, setCaptura]     = useState<Captura>({});
  const [sucio, setSucio]         = useState(false);
  const [cargando, setCargando]   = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [historial, setHistorial] = useState<FilaHistorial[]>([]);
  // La reserva a la que se le está registrando un cobro desde el corte.
  const [cobrando, setCobrando]   = useState<ReservaCorte | null>(null);
  const [recarga, setRecarga]     = useState(0);
  const semanaCargada = useRef<string | null>(null);

  const cargarHistorial = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/cortes?lista=1");
      const d = await r.json();
      if (r.ok) setHistorial(d.cortes ?? []);
    } catch { /* el historial es secundario: si falla, el corte sigue */ }
  }, []);

  useEffect(() => { cargarHistorial(); }, [cargarHistorial]);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    setError(null);
    fetch(`/api/admin/cortes?semana=${semana}`)
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "No se pudo cargar la semana");
        return d as Semana;
      })
      .then(d => {
        if (!vigente) return;
        setDatos(d);
        // Si solo se recargó la misma semana (entró un cobro), los costos que
        // se estaban capturando se quedan como estaban.
        if (semanaCargada.current !== d.semana) {
          semanaCargada.current = d.semana;
          setCaptura(d.guardado?.captura ?? {});
          setSucio(false);
        }
      })
      .catch(e => vigente && setError(e.message))
      .finally(() => vigente && setCargando(false));
    return () => { vigente = false; };
  }, [semana, recarga]);

  // Cerrar la pestaña con costos sin guardar se pierde lo capturado.
  useEffect(() => {
    if (!sucio) return;
    const avisar = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [sucio]);

  function irA(lunes: string) {
    if (lunes === semana) return;
    if (sucio && !confirm("Tienes cambios sin guardar en esta semana. ¿Salir sin guardarlos?")) return;
    playClick();
    setSemana(lunes);
  }

  const resumen = useMemo(
    () => (datos ? calcularCorte(datos.salidas, captura) : null),
    [datos, captura],
  );

  // Se guardó, y después entró un cobro o se canceló una reserva.
  const cambioDesdeGuardado = !!(datos?.guardado && resumen && !sucio && (
    resumen.ventas !== datos.guardado.resumen.ventas ||
    resumen.costos !== datos.guardado.resumen.costos ||
    resumen.salidas.length !== datos.guardado.resumen.salidas.length
  ));

  function editar(s: SalidaCorte, cambio: (c: CapturaSalida) => CapturaSalida) {
    setCaptura(prev => ({ ...prev, [s.clave]: cambio(capturaDe(s, prev)) }));
    setSucio(true);
  }

  async function guardar() {
    if (!datos) return;
    playClick();
    setGuardando(true);
    try {
      const r = await fetch("/api/admin/cortes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ semana: datos.semana, captura }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "No se pudo guardar el corte");
      setDatos({ ...datos, guardado: d.guardado });
      setCaptura(d.guardado.captura);
      setSucio(false);
      playSuccess();
      cargarHistorial();
    } catch (e: any) {
      playError();
      alert(e.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <h1 className="font-cormorant text-[#1B4332] text-2xl font-light mb-1">Corte semanal</h1>
      <p className="text-[#1B4332]/50 font-dm text-sm mb-6">
        Lo que dejaron los tours operados de lunes a domingo (por fecha del tour, no
        de la reserva) y cuánto le toca a cada socio.
      </p>

      {/* Semana */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="panel-card flex items-center">
          <button onClick={() => irA(addDaysYMD(semana, -7))} aria-label="Semana anterior"
            className="p-2.5 text-[#1B4332]/60 hover:text-[#1B4332] panel-foco">
            <ChevronLeft size={16} />
          </button>
          <span className="px-1 font-dm text-sm text-[#1B4332] min-w-[190px] text-center">
            Semana del {etiquetaSemana(semana)}
          </span>
          <button onClick={() => irA(addDaysYMD(semana, 7))} aria-label="Semana siguiente"
            className="p-2.5 text-[#1B4332]/60 hover:text-[#1B4332] panel-foco">
            <ChevronRight size={16} />
          </button>
        </div>
        {semana !== hoyLunes && (
          <button onClick={() => irA(hoyLunes)} className={BTN_2}>Esta semana</button>
        )}
        {datos && !cargando && <Estado sucio={sucio} guardado={datos.guardado} />}
      </div>

      {cambioDesdeGuardado && (
        <div className="flex items-start gap-2 mb-4 px-3 py-2.5 rounded-sm bg-[#a86814]/10 text-[#7a4b0e] font-dm text-xs">
          <AlertTriangle size={14} className="mt-px shrink-0" />
          <span>
            Los números cambiaron desde que se guardó (entró un cobro, cambió una reserva o hay una
            salida nueva). Revisa y vuelve a guardar para actualizar el corte.
          </span>
        </div>
      )}

      {error ? (
        <p className="panel-card p-6 font-dm text-sm text-[#b8413f]">{error}</p>
      ) : !datos || !resumen ? (
        <div className="flex items-center gap-2 text-[#1B4332]/50 font-dm text-sm py-10">
          <Loader2 size={16} className="animate-spin" /> Cargando la semana…
        </div>
      ) : (
        <div className={`grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] items-start transition-opacity ${cargando ? "opacity-50 pointer-events-none" : ""}`}>
          <section className="space-y-3 min-w-0">
            <p className="panel-eyebrow">
              Tours que se operan esta semana · {datos.salidas.length}
            </p>
            {datos.salidas.length === 0 ? (
              <p className="panel-card p-6 text-center font-dm text-sm text-[#1B4332]/45">
                No se operó ningún tour esta semana.
              </p>
            ) : (
              datos.salidas.map(s => (
                <TarjetaSalida key={s.clave} s={s} c={capturaDe(s, captura)}
                  onCambio={cambio => editar(s, cambio)}
                  onCobrar={r => { playClick(); setCobrando(r); }} />
              ))
            )}
          </section>

          <aside className="lg:sticky lg:top-6 space-y-3">
            <Resultados r={resumen} />
            <div className="grid grid-cols-2 gap-2">
              <button onClick={guardar} disabled={guardando || cargando} className={BTN}>
                {guardando ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Guardar corte
              </button>
              <button onClick={() => { playClick(); imprimir(datos, resumen, sucio); }} className={BTN_2}>
                <Printer size={13} /> Imprimir / PDF
              </button>
            </div>
          </aside>
        </div>
      )}

      <Historial filas={historial} actual={semana} onAbrir={irA} />

      {cobrando && (
        <CobroModal
          reserva={{ id: cobrando.id, confirmationNumber: cobrando.folio, customerName: cobrando.cliente, ...cobrando.cobrable }}
          quien={quien}
          onClose={() => setCobrando(null)}
          onGuardado={cobrado => {
            // La ventana se queda abierta con su saldo al día; el corte se
            // vuelve a pedir para que lo cobrado salga ya repartido.
            setCobrando(c => (c ? { ...c, cobrable: { ...c.cobrable, depositoPagado: cobrado } } : c));
            setRecarga(n => n + 1);
          }}
        />
      )}
    </div>
  );
}

// ── Piezas ──────────────────────────────────────────────────────────────────

function Estado({ sucio, guardado }: { sucio: boolean; guardado: Guardado | null }) {
  const [texto, tono] = sucio
    ? ["Cambios sin guardar", "bg-[#a86814]/10 text-[#7a4b0e]"]
    : guardado
      ? [`Guardado ${fechaGuardado(guardado.updatedAt)} por ${guardado.guardadoPor}`, "bg-[#2b845c]/10 text-[#1f6646]"]
      : ["Sin guardar", "bg-[#1B4332]/6 text-[#1B4332]/60"];
  return <span className={`font-dm text-[11px] px-2 py-1 rounded-sm ${tono}`}>{texto}</span>;
}

function TarjetaSalida({ s, c, onCambio, onCobrar }: {
  s: SalidaCorte; c: CapturaSalida;
  onCambio: (cambio: (c: CapturaSalida) => CapturaSalida) => void;
  onCobrar: (r: ReservaCorte) => void;
}) {
  const costos   = c.costos.reduce((t, x) => t + (x.monto || 0), 0);
  const utilidad = s.ventas - s.hospedaje - costos;

  const cambiarCosto = (i: number, parte: Partial<CostoCorte>) =>
    onCambio(x => ({ ...x, costos: x.costos.map((k, j) => (j === i ? { ...k, ...parte } : k)) }));
  const quitarCosto  = (i: number) =>
    onCambio(x => ({ ...x, costos: x.costos.filter((_, j) => j !== i) }));
  const agregarCosto = () =>
    onCambio(x => ({ ...x, costos: [...x.costos, { concepto: "", monto: 0 }] }));

  return (
    <div className={`panel-card overflow-hidden transition-opacity ${c.incluida ? "" : "opacity-55"}`}>
      <label className="flex items-start gap-3 px-4 py-3 bg-[#FAFAF8] border-b border-[#1B4332]/8 cursor-pointer">
        <input type="checkbox" checked={c.incluida}
          onChange={e => { const v = e.target.checked; onCambio(x => ({ ...x, incluida: v })); }}
          className="mt-0.5 w-4 h-4 accent-[#1B4332] shrink-0" />
        <span className="flex-1 min-w-0">
          <span className="block font-dm text-sm text-[#1B4332] font-medium leading-snug">{s.tour}</span>
          <span className="block font-dm text-[11px] text-[#1B4332]/55">
            {diaCorto(s.fecha)} · {s.reservas.length} reserva{s.reservas.length === 1 ? "" : "s"} · {s.personas} persona{s.personas === 1 ? "" : "s"}
          </span>
        </span>
        <span className="text-right shrink-0">
          <span className="block panel-cifra font-dm text-sm text-[#1B4332]">{fmx(s.ventas)}</span>
          <span className="block font-dm text-[9px] text-[#1B4332]/45 uppercase tracking-[0.12em]">cobrado</span>
        </span>
      </label>

      {c.incluida && (
        <>
          <div className="p-4 grid gap-5 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <div className="min-w-0">
              <p className="panel-eyebrow mb-2">Reservas</p>
              <ul className="space-y-1.5">
                {s.reservas.map(r => (
                  <li key={r.id} className="font-dm text-xs">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-[10px] text-[#1B4332]/40 shrink-0">{r.folio}</span>
                      <span className="flex-1 min-w-0 truncate text-[#1B4332]/75">
                        {r.cliente} · {r.personas} p.
                      </span>
                      <span className="panel-cifra text-[#1B4332] shrink-0">{fmx(r.cobrado)}</span>
                    </div>
                    {(r.tours > 1 || r.hospedaje > 0) && (
                      <p className="text-right text-[10px] text-[#1B4332]/50">
                        {r.tours > 1 && <>de {fmx(r.cobradoReserva)} cobrados en la reserva ({r.tours} tours)</>}
                        {r.tours > 1 && r.hospedaje > 0 && " · "}
                        {r.hospedaje > 0 && <>incluye {fmx(r.hospedaje)} de hotel</>}
                      </p>
                    )}
                    {r.pendiente > 0 && (
                      <p className="flex items-center justify-end gap-2 text-[10px] text-[#a86814] mt-0.5">
                        falta {fmx(r.pendiente)}{r.tours > 1 ? " en la reserva" : ""}
                        <button onClick={() => onCobrar(r)}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm border border-[#1B4332]/20 text-[#1B4332] hover:border-[#1B4332]/50 panel-pulsable panel-foco">
                          <Wallet size={11} /> Registrar cobro
                        </button>
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className="min-w-0">
              <p className="panel-eyebrow mb-2">Costos</p>
              {c.costos.length === 0 && (
                <p className="font-dm text-[11px] text-[#1B4332]/45 mb-2">
                  El Cotizador no tiene costos para este tour. Agrégalos aquí.
                </p>
              )}
              <div className="space-y-1.5">
                {c.costos.map((x, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <input value={x.concepto} placeholder="Concepto" aria-label="Concepto"
                      onChange={e => cambiarCosto(i, { concepto: e.target.value })}
                      className={`${INPUT} flex-1 min-w-0`} />
                    <div className="relative w-24 shrink-0">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#1B4332]/40 text-xs font-dm">$</span>
                      <input inputMode="numeric" value={x.monto ? String(x.monto) : ""} placeholder="0" aria-label="Monto"
                        onChange={e => cambiarCosto(i, { monto: Number(e.target.value.replace(/\D/g, "")) || 0 })}
                        className={`${INPUT} w-full pl-5 text-right panel-cifra`} />
                    </div>
                    <button onClick={() => quitarCosto(i)} aria-label="Quitar concepto"
                      className="p-1.5 text-[#1B4332]/35 hover:text-[#b8413f] panel-foco">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={agregarCosto}
                className="mt-2 inline-flex items-center gap-1 font-dm text-[11px] text-[#1B4332]/65 hover:text-[#1B4332] panel-foco">
                <Plus size={13} /> Agregar concepto
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-baseline justify-end gap-x-5 gap-y-1 px-4 py-2.5 border-t border-[#1B4332]/8 font-dm text-xs">
            {s.hospedaje > 0 && (
              <span className="text-[#1B4332]/55">
                Hotel ({SOCIO_HOTEL}) <span className="panel-cifra text-[#1B4332]">{fmx(s.hospedaje)}</span>
              </span>
            )}
            <span className="text-[#1B4332]/55">
              Costos <span className="panel-cifra text-[#1B4332]">{fmx(costos)}</span>
            </span>
            <span className="text-[#1B4332]/55">
              Utilidad{" "}
              <span className={`panel-cifra font-medium ${utilidad < 0 ? "text-[#b8413f]" : "text-[#2b845c]"}`}>
                {fmx(utilidad)}
              </span>
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function Resultados({ r }: { r: ResumenCorte }) {
  return (
    <div className="panel-card p-5 font-dm">
      <p className="panel-eyebrow mb-3">Estado de resultados</p>

      <div className="flex items-baseline justify-between py-1">
        <span className="text-sm text-[#1B4332]">
          Ventas <span className="text-[11px] text-[#1B4332]/45">(dinero cobrado)</span>
        </span>
        <span className="panel-cifra text-sm text-[#1B4332]">{fmx(r.ventas)}</span>
      </div>
      {r.hospedaje > 0 && (
        <div className="flex items-baseline justify-between py-1">
          <span className="text-sm text-[#1B4332]">
            − Hotel <span className="text-[11px] text-[#1B4332]/45">(lo paga {SOCIO_HOTEL})</span>
          </span>
          <span className="panel-cifra text-sm text-[#1B4332]">{fmx(r.hospedaje)}</span>
        </div>
      )}
      <div className="flex items-baseline justify-between py-1">
        <span className="text-sm text-[#1B4332]">− Costos</span>
        <span className="panel-cifra text-sm text-[#1B4332]">{fmx(r.costos)}</span>
      </div>

      <div className="border-t border-[#1B4332]/15 mt-2 pt-2 flex items-baseline justify-between">
        <span className="text-sm text-[#1B4332] font-medium">= Utilidad</span>
        <span className={`panel-cifra font-cormorant text-3xl leading-none ${r.utilidad < 0 ? "text-[#b8413f]" : "text-[#1B4332]"}`}>
          {fmx(r.utilidad)}
        </span>
      </div>
      {r.ventas > 0 && (
        <p className="text-right text-[11px] text-[#1B4332]/45 mt-1">{r.margen} % de las ventas</p>
      )}

      <div className="mt-4 pt-3 border-t border-dashed border-[#1B4332]/20 space-y-1.5">
        <p className="panel-eyebrow mb-1">Por socio</p>
        {r.socios.map(s => (
          <div key={s.nombre}>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-[#1B4332]">
                {s.nombre} <span className="text-[11px] text-[#1B4332]/45">{s.pct} %</span>
              </span>
              <span className={`panel-cifra text-base font-medium ${s.monto < 0 ? "text-[#b8413f]" : "text-[#1B4332]"}`}>
                {fmx(s.monto)}
              </span>
            </div>
            {s.hotel > 0 && (
              <p className="text-right text-[11px] text-[#1B4332]/55">
                + {fmx(s.hotel)} del hotel, para pagarlo
              </p>
            )}
          </div>
        ))}
      </div>

      <p className="mt-3 text-[11px] text-[#1B4332]/45">
        {r.salidas.length} salida{r.salidas.length === 1 ? "" : "s"} en el corte
      </p>
    </div>
  );
}

function Historial({ filas, actual, onAbrir }: {
  filas: FilaHistorial[]; actual: string; onAbrir: (lunes: string) => void;
}) {
  if (filas.length === 0) return null;
  return (
    <section className="mt-10">
      <p className="panel-eyebrow mb-2">Cortes guardados</p>
      <div className="sm:panel-card sm:overflow-hidden">
        <table className="panel-tabla panel-tabla-movil w-full font-dm text-xs text-[#1B4332]">
          <thead>
            <tr>
              <th className="text-left">Semana</th>
              <th className="text-right">Ventas</th>
              <th className="text-right">Costos</th>
              <th className="text-right">Utilidad</th>
              <th className="text-right">Por socio</th>
              <th className="text-left">Guardado</th>
            </tr>
          </thead>
          <tbody>
            {filas.map(f => (
              <tr key={f.semana} onClick={() => onAbrir(f.semana)}
                className={`cursor-pointer ${f.semana === actual ? "bg-[#1B4332]/[0.04]" : ""}`}>
                <td>
                  <button onClick={e => { e.stopPropagation(); onAbrir(f.semana); }}
                    className="font-medium hover:underline panel-foco text-left">
                    {etiquetaSemana(f.semana)}
                  </button>
                </td>
                <td data-etiqueta="Ventas" className="text-right panel-cifra">{fmx(f.ventas)}</td>
                <td data-etiqueta="Costos" className="text-right panel-cifra">{fmx(f.costos)}</td>
                <td data-etiqueta="Utilidad" className={`text-right panel-cifra font-medium ${f.utilidad < 0 ? "text-[#b8413f]" : ""}`}>
                  {fmx(f.utilidad)}
                </td>
                <td data-etiqueta="Por socio" className="text-right panel-cifra">{fmx(repartir(f.utilidad)[0].monto)}</td>
                <td data-etiqueta="Guardado" className="text-[#1B4332]/55">
                  {f.guardadoPor} · {fechaGuardado(f.updatedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ── La hoja para imprimir / guardar como PDF ────────────────────────────────

const esc = (t: string) =>
  t.replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch] as string));

function imprimir(d: Semana, r: ResumenCorte, sucio: boolean) {
  const win = window.open("", "_blank");
  if (!win) {
    alert("El navegador bloqueó la ventana. Permite ventanas emergentes para imprimir.");
    return;
  }
  const estado = d.guardado && !sucio
    ? `Guardado por ${esc(d.guardado.guardadoPor)} · ${esc(fechaGuardado(d.guardado.updatedAt))}`
    : "Vista previa · sin guardar";

  const conHotel = r.hospedaje > 0;
  const filas = r.salidas.map(s => `
    <tr>
      <td>${esc(diaCorto(s.fecha))}</td>
      <td>${esc(s.tour)}</td>
      <td class="n">${s.personas}</td>
      <td class="n">${fmx(s.ventas)}</td>
      ${conHotel ? `<td class="n">${fmx(s.hospedaje)}</td>` : ""}
      <td class="n">${fmx(s.costos)}</td>
      <td class="n${s.utilidad < 0 ? " neg" : ""}">${fmx(s.utilidad)}</td>
    </tr>`).join("");

  const desglose = r.salidas.filter(s => s.detalleCostos.length > 0).map(s => `
    <div class="bloque">
      <h3>${esc(s.tour)} <span>· ${esc(diaCorto(s.fecha))}</span></h3>
      ${s.detalleCostos.map(c => `<div class="linea"><span>${esc(c.concepto || "Sin concepto")}</span><span>${fmx(c.monto)}</span></div>`).join("")}
      <div class="linea total"><span>Total</span><span>${fmx(s.costos)}</span></div>
    </div>`).join("");

  win.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"/>
<title>Corte semanal ${esc(etiquetaSemana(d.semana))}</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet">
<style>
@page{size:A4 portrait;margin:14mm;}
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
body{margin:0;padding:24px;font-family:'DM Sans',system-ui,sans-serif;color:#16362a;font-size:12px;}
@media print{body{padding:0;}}
h1{font-family:'Cormorant Garamond',Georgia,serif;font-weight:500;font-size:28px;margin:0;}
h2{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:rgba(22,54,42,.55);font-weight:500;margin:22px 0 8px;}
h3{font-size:12px;font-weight:500;margin:0 0 4px;} h3 span{font-weight:400;color:rgba(22,54,42,.55);}
.sub{color:rgba(22,54,42,.6);margin-top:4px;}
.cajas{display:flex;gap:16px;margin-top:18px;}
.er{flex:1;border:1px solid rgba(27,67,50,.15);border-radius:8px;padding:14px 16px;}
.fila{display:flex;justify-content:space-between;padding:3px 0;font-variant-numeric:tabular-nums;}
.fila.util{border-top:1px solid rgba(27,67,50,.2);margin-top:6px;padding-top:8px;font-weight:500;font-size:15px;}
.fila.socio{font-size:13px;}
table{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums;}
th{font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:rgba(22,54,42,.6);font-weight:500;text-align:left;padding:6px 8px;border-bottom:1px solid rgba(27,67,50,.2);}
td{padding:6px 8px;border-bottom:1px solid rgba(27,67,50,.08);}
.n{text-align:right;} th.n{text-align:right;} .neg{color:#b8413f;}
tfoot td{font-weight:500;border-top:1px solid rgba(27,67,50,.2);border-bottom:0;}
.desglose{columns:2;column-gap:24px;}
.bloque{break-inside:avoid;margin-bottom:12px;}
.linea{display:flex;justify-content:space-between;padding:2px 0;color:rgba(22,54,42,.8);font-variant-numeric:tabular-nums;}
.linea.total{border-top:1px dashed rgba(27,67,50,.25);margin-top:2px;color:#16362a;font-weight:500;}
.pie{margin-top:28px;color:rgba(22,54,42,.45);font-size:10px;}
</style></head><body>
<h1>Corte semanal</h1>
<div class="sub">Huasteca Potosina Tours · Semana del ${esc(etiquetaSemana(d.semana))} · ${estado}</div>

<div class="cajas">
  <div class="er">
    <h2 style="margin-top:0">Estado de resultados</h2>
    <div class="fila"><span>Ventas (dinero cobrado)</span><span>${fmx(r.ventas)}</span></div>
    ${r.hospedaje > 0 ? `<div class="fila"><span>− Hotel (lo paga ${esc(SOCIO_HOTEL)})</span><span>${fmx(r.hospedaje)}</span></div>` : ""}
    <div class="fila"><span>− Costos</span><span>${fmx(r.costos)}</span></div>
    <div class="fila util"><span>= Utilidad${r.ventas > 0 ? ` <small style="font-weight:400;color:rgba(22,54,42,.55)">(${r.margen} %)</small>` : ""}</span><span>${fmx(r.utilidad)}</span></div>
  </div>
  <div class="er">
    <h2 style="margin-top:0">Por socio</h2>
    ${r.socios.map(s => `<div class="fila socio"><span>${esc(s.nombre)} · ${s.pct} %</span><span><b>${fmx(s.monto)}</b></span></div>${s.hotel > 0 ? `<div class="fila" style="color:rgba(22,54,42,.6);font-size:11px"><span></span><span>+ ${fmx(s.hotel)} del hotel, para pagarlo</span></div>` : ""}`).join("")}
  </div>
</div>

<h2>Salidas · ${r.salidas.length}</h2>
${r.salidas.length ? `<table>
  <thead><tr><th>Día</th><th>Tour</th><th class="n">Personas</th><th class="n">Cobrado</th>${conHotel ? `<th class="n">Hotel</th>` : ""}<th class="n">Costos</th><th class="n">Utilidad</th></tr></thead>
  <tbody>${filas}</tbody>
  <tfoot><tr><td colspan="3">Total</td><td class="n">${fmx(r.ventas)}</td>${conHotel ? `<td class="n">${fmx(r.hospedaje)}</td>` : ""}<td class="n">${fmx(r.costos)}</td><td class="n">${fmx(r.utilidad)}</td></tr></tfoot>
</table>` : `<p class="sub">No hubo salidas en el corte.</p>`}

${desglose ? `<h2>Desglose de costos</h2><div class="desglose">${desglose}</div>` : ""}

<div class="pie">Impreso el ${esc(new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" }))}</div>
</body></html>`);
  win.document.close();
  // Un respiro para que carguen las fuentes antes del diálogo de impresión.
  setTimeout(() => win.print(), 800);
}
