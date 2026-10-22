"use client";

/**
 * El corte semanal con el socio.
 *
 * Arriba se elige la semana (lunes a domingo; por defecto la actual). Cada
 * tarjeta —una reserva en un tour y un día— llega palomeada y con los costos
 * que propone el Cotizador; se corrigen, se quita la que no entra y a la
 * derecha sale el estado de resultados con lo que le toca a cada socio. Las de
 * Ciudad Valles llegan marcadas: su traslado cuesta distinto y se revisa a mano.
 * "Guardar costos" guarda lo capturado sin hacer el corte (para no perderlo al
 * recargar); "Hacer corte" lo cierra; "Imprimir / PDF" saca la hoja.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, ArrowLeftRight, Bus, ChevronLeft, ChevronRight, HandCoins, Link2, Loader2, MapPin, Mountain, Percent, PieChart, PiggyBank, Plus, Printer, Save, Scissors, TrendingUp, Truck, Unlink, Wallet, X, type LucideIcon } from "lucide-react";
import { hoyMX, addDaysYMD } from "@/lib/dates";
import { CodigoTour } from "@/components/admin/CodigoTour";
import { colorDeTour, codigoDeTour } from "@/lib/admin/coloresTour";
import {
  lunesDe, etiquetaSemana, diaCorto, fmx, capturaDe, calcularCorte,
  cuentasDe, costosPorTarjeta, sugerirCostos, comisionDeCobro, RECEPTORES, SOCIO_COSTOS,
  type CobroSemana, type Receptor,
  SOCIO_HOTEL, CONCEPTO_HOSTING, HOSTING_PCT, VENDEDOR, REPARTO_RZR, repartir, type SalidaCorte, type Captura, type CapturaSalida, type CostoCorte, type ResumenCorte,
  type EstadoCorte, type CatalogoCostos, type CuentaCorte, type ReservaCorte,
} from "@/lib/admin/corteSemanal";
import { playClick, playSuccess, playError } from "@/lib/admin/sfx";

interface Guardado { captura: Captura; cobros: CobroSemana[]; resumen: ResumenCorte; guardadoPor: string; updatedAt: string; estado: EstadoCorte }
interface Semana { semana: string; hasta: string; salidas: SalidaCorte[]; catalogo: CatalogoCostos; guardado: Guardado | null }
interface FilaHistorial {
  semana: string; hasta: string; ventas: number; costos: number; utilidad: number;
  guardadoPor: string; updatedAt: string; estado: EstadoCorte;
  /** Las cifras como se guardaron: de aquí sale la parte de Manolo (la de Erick depende de los RZR). */
  resumen?: Partial<ResumenCorte>;
}

const BTN   = "inline-flex items-center justify-center gap-1.5 bg-[#1B4332] hover:bg-[#2D5A45] disabled:opacity-50 text-white px-3 py-2.5 text-[10px] font-dm uppercase tracking-[1px] rounded-sm panel-pulsable panel-foco";
const BTN_2 = "inline-flex items-center justify-center gap-1.5 border border-[#1B4332]/20 hover:border-[#1B4332]/45 bg-white text-[#1B4332] px-3 py-2.5 text-[10px] font-dm uppercase tracking-[1px] rounded-sm panel-pulsable panel-foco";
const INPUT = "border border-[#1B4332]/15 bg-white text-[#1B4332] text-xs font-dm px-2 py-1.5 rounded-sm focus:outline-none focus:border-[#1B4332]";

function fechaGuardado(iso: string): string {
  return new Date(iso).toLocaleString("es-MX", {
    day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Mexico_City",
  });
}

// `quien` ya no se usa aquí: el corte no registra cobros en el panel (eso vive
// en Reservas). Lo cobrado de la semana se escribe a mano en «La semana».
export default function CorteSemanalClient(_props: { quien?: string }) {
  const hoyLunes = lunesDe(hoyMX());
  const [semana, setSemana]       = useState(hoyLunes);
  const [datos, setDatos]         = useState<Semana | null>(null);
  const [captura, setCaptura]     = useState<Captura>({});
  const [sucio, setSucio]         = useState(false);
  const [cargando, setCargando]   = useState(true);
  const [error, setError]         = useState<string | null>(null);
  // Qué botón está guardando: los costos solos o el corte.
  const [guardando, setGuardando] = useState<null | "costos" | "corte">(null);
  const [historial, setHistorial] = useState<FilaHistorial[]>([]);
  // Lo cobrado de la semana, escrito a mano en «La semana» (arranca vacío).
  const [cobros, setCobros]       = useState<CobroSemana[]>([]);
  const [recarga, setRecarga]     = useState(0);
  // Las cuentas juntas cuyos costos se volvieron a calcular al juntarlas (para avisar).
  const [recalculadas, setRecalculadas] = useState<string[]>([]);
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
          setCobros(d.guardado?.cobros ?? []);
          setSucio(false);
          setRecalculadas([]);
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
    () => (datos ? calcularCorte(datos.salidas, captura, cobros) : null),
    [datos, captura, cobros],
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

  /**
   * `cerrar: false` guarda los costos y deja el corte pendiente (Manolo, 20 oct
   * 2026): antes la única forma de no perder lo capturado era hacer el corte.
   */
  async function guardar(cerrar: boolean) {
    if (!datos) return;
    playClick();
    setGuardando(cerrar ? "corte" : "costos");
    try {
      const r = await fetch("/api/admin/cortes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ semana: datos.semana, captura, cobros, cerrar }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || (cerrar ? "No se pudo hacer el corte" : "No se pudieron guardar los costos"));
      setDatos({ ...datos, guardado: d.guardado });
      setCaptura(d.guardado.captura);
      setCobros(d.guardado.cobros ?? []);
      setSucio(false);
      playSuccess();
      cargarHistorial();
    } catch (e: any) {
      playError();
      alert(e.message);
    } finally {
      setGuardando(null);
    }
  }

  const cerrado = datos?.guardado?.estado === "cerrado";
  const dias = useMemo(() => (datos ? porDia(datos.semana, datos.salidas) : []), [datos]);
  const cuentaDe = useMemo(() => {
    const m = new Map<string, CuentaCorte>();
    for (const cu of cuentasDe(datos?.salidas ?? [], captura)) for (const t of cu.tarjetas) m.set(t.clave, cu);
    return m;
  }, [datos, captura]);
  const partes = useMemo(() => costosPorTarjeta(datos?.salidas ?? [], captura), [datos, captura]);

  function editarCobros(cambio: (prev: CobroSemana[]) => CobroSemana[]) {
    setCobros(cambio);
    setSucio(true);
  }

  // ⌘S / Ctrl+S guarda los costos desde donde se esté escribiendo (Manolo,
  // 20 oct 2026: «pon a la mano el botón de guardar costos»). Se registra en
  // cada render para que `guardar` vea la captura de ese momento.
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "s") return;
      e.preventDefault();
      if (!guardando && !cargando) guardar(false);
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  });

  /**
   * Junta dos tarjetas (y las cuentas en que ya iban) en una sola cuenta de
   * costos (Manolo, 20 oct 2026): dos reservas que fueron en la misma camioneta,
   * o los tours de un cliente con un solo traslado. La principal es la del
   * primer día: ahí se escriben los costos, que arrancan con lo que propone el
   * Cotizador para todas juntas (los fijos una sola vez).
   */
  function juntar(a: string, b: string) {
    if (!datos) return;
    const ca = cuentaDe.get(a), cb = cuentaDe.get(b);
    if (!ca || !cb || ca === cb) return;
    const tarjetas = datos.salidas
      .filter(x => ca.tarjetas.includes(x) || cb.tarjetas.includes(x))
      .sort((x, y) => x.fecha.localeCompare(y.fecha));
    playClick();
    const cabeza = tarjetas[0].clave;
    // Sin ventana de confirmación: si ya había costos escritos, la tarjeta lo
    // avisa, y «Separar» lo deshace.
    if (tarjetas.some(t => captura[t.clave])) setRecalculadas(prev => [...prev, cabeza]);
    setCaptura(prev => {
      const next = { ...prev };
      for (const t of tarjetas) next[t.clave] = { incluida: true, costos: [], cuenta: cabeza };
      next[cabeza] = { incluida: true, costos: sugerirCostos(tarjetas, datos.catalogo ?? {}), cuenta: cabeza };
      return next;
    });
    setSucio(true);
  }

  /** Con quién se puede juntar una cuenta: primero el mismo tour el mismo día. */
  function candidatosDe(cu: CuentaCorte): Candidato[] {
    const fuera = (datos?.salidas ?? []).filter(x => !cu.tarjetas.includes(x));
    const mismo = (x: SalidaCorte) => cu.tarjetas.some(t => t.tour === x.tour && t.fecha === x.fecha);
    const deCliente = (x: SalidaCorte) => x.reserva.cliente === cu.principal.reserva.cliente;
    return fuera
      .map(x => ({ s: x, mismo: mismo(x) }))
      .sort((p, q) => Number(q.mismo) - Number(p.mismo)
        || Number(deCliente(q.s)) - Number(deCliente(p.s))
        || p.s.fecha.localeCompare(q.s.fecha));
  }

  /** Deshace una cuenta junta: cada tarjeta vuelve a sus propios costos sugeridos. */
  function separar(cabeza: string) {
    playClick();
    setCaptura(prev => {
      const next = { ...prev };
      for (const [k, v] of Object.entries(prev)) if (v.cuenta === cabeza) delete next[k];
      return next;
    });
    setRecalculadas(prev => prev.filter(k => k !== cabeza));
    setSucio(true);
  }

  function irATarjeta(clave: string) {
    document.querySelector(`[data-clave="${CSS.escape(clave)}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <h1 className="font-cormorant text-[#1B4332] text-2xl font-light mb-1">Corte semanal</h1>
      <p className="text-[#1B4332]/50 font-dm text-sm mb-6">
        Lo que dejó cada tour de la semana y cuánto le toca a cada socio. Escribe los
        costos, junta los tours que fueron en la misma camioneta y guarda.
      </p>

      {/* Semana. Las flechas van sueltas y el texto tiene ancho FIJO: con el
          ancho del texto la flecha de «siguiente» se corría y Manolo acababa
          tocando «Esta semana» (20 oct 2026). Ese botón va hasta la derecha y
          siempre ocupa su lugar (invisible en la semana actual). */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex items-center gap-2">
          <button onClick={() => irA(addDaysYMD(semana, -7))} aria-label="Semana anterior"
            className="panel-card inline-flex h-10 w-10 shrink-0 items-center justify-center text-[#1B4332]/70 hover:text-[#1B4332] hover:border-[#1B4332]/30 panel-foco">
            <ChevronLeft size={18} />
          </button>
          <span className="panel-card inline-flex h-10 w-[15.5rem] shrink-0 items-center justify-center whitespace-nowrap px-3 font-dm text-sm text-[#1B4332]">
            Semana del {etiquetaSemana(semana)}
          </span>
          <button onClick={() => irA(addDaysYMD(semana, 7))} aria-label="Semana siguiente"
            className="panel-card inline-flex h-10 w-10 shrink-0 items-center justify-center text-[#1B4332]/70 hover:text-[#1B4332] hover:border-[#1B4332]/30 panel-foco">
            <ChevronRight size={18} />
          </button>
        </div>
        {datos && !cargando && <Estado sucio={sucio} guardado={datos.guardado} />}
        <button onClick={() => irA(hoyLunes)} aria-hidden={semana === hoyLunes} tabIndex={semana === hoyLunes ? -1 : 0}
          className={`${BTN_2} ml-auto ${semana === hoyLunes ? "invisible" : ""}`}>
          Ir a esta semana
        </button>
      </div>

      {cambioDesdeGuardado && (
        <div className="flex items-start gap-2 mb-4 px-3 py-2.5 rounded-sm bg-[#a86814]/10 text-[#7a4b0e] font-dm text-xs">
          <AlertTriangle size={14} className="mt-px shrink-0" />
          <span>
            Los números cambiaron desde que se guardó (entró un cobro, cambió una reserva o hay una
            reserva nueva). Revisa y {cerrado ? "vuelve a hacer el corte para actualizarlo" : "vuelve a guardar los costos"}.
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
              De lunes a domingo · {datos.salidas.length} tour{datos.salidas.length === 1 ? "" : "s"}
            </p>
            {datos.salidas.length === 0 ? (
              <p className="panel-card p-6 text-center font-dm text-sm text-[#1B4332]/45">
                No se operó ningún tour esta semana.
              </p>
            ) : (
              dias.map(g => (
                <GrupoDia key={g.fecha} fecha={g.fecha} salidas={g.salidas} partes={partes}>
                  {g.salidas.map(s => {
                    const cu = cuentaDe.get(s.clave);
                    if (!cu) return null;
                    // Los tours juntos se ven en UNA tarjeta, la de su principal;
                    // en el lugar de los demás queda solo un aviso de dónde están.
                    if (cu.tarjetas.length > 1 && cu.clave !== s.clave) {
                      return <AvisoJunta key={s.clave} s={s} cabeza={cu.principal} onIrA={irATarjeta} />;
                    }
                    return (
                      <TarjetaCuenta key={s.clave} cuenta={cu}
                        c={capturaDe(cu.principal, captura)}
                        candidatos={candidatosDe(cu)}
                        recalculada={recalculadas.includes(cu.clave)}
                        onCambio={cambio => editar(cu.principal, cambio)}
                        onJuntar={otra => juntar(cu.clave, otra)}
                        onSeparar={() => separar(cu.clave)} />
                    );
                  })}
                </GrupoDia>
              ))
            )}
          </section>

          <aside className="lg:sticky lg:top-6 space-y-3">
            <Resultados r={resumen} cobros={cobros} onCambio={editarCobros} />
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => guardar(true)} disabled={!!guardando || cargando} className={`${BTN} col-span-2`}>
                {guardando === "corte" ? <Loader2 size={13} className="animate-spin" /> : <Scissors size={13} />}
                {cerrado ? "Rehacer corte" : "Hacer corte"}
              </button>
              <button onClick={() => guardar(false)} disabled={!!guardando || cargando} className={BTN_2}
                title={cerrado ? "El corte ya está hecho: guardar los costos lo actualiza" : "Guarda los costos sin hacer el corte"}>
                {guardando === "costos" ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Guardar costos
              </button>
              <button onClick={() => { playClick(); imprimir(datos, resumen, sucio); }} className={BTN_2}>
                <Printer size={13} /> Imprimir / PDF
              </button>
            </div>
          </aside>
        </div>
      )}

      <Historial filas={historial} actual={semana} onAbrir={irA} />

      {/* A la mano, abajo a la derecha: guardar mientras se escribe en una
          tarjeta lejos de la columna de resultados. */}
      {datos && sucio && (
        <div className="fixed bottom-4 right-4 z-40 max-w-[calc(100vw-2rem)]">
          {sucio && (
            <div className="panel-card shadow-lg flex items-center gap-3 pl-3 pr-2 py-2 font-dm text-xs text-[#7a4b0e]">
              <span>Cambios sin guardar <span className="text-[#1B4332]/40">· ⌘S</span></span>
              <button onClick={() => guardar(false)} disabled={!!guardando || cargando} className={BTN}>
                {guardando === "costos" ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Guardar costos
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

// ── Piezas ──────────────────────────────────────────────────────────────────

/** «Lunes 19 de octubre». */
function diaLargo(ymd: string): string {
  const t = new Date(`${ymd}T12:00:00Z`).toLocaleDateString("es-MX", {
    weekday: "long", day: "numeric", month: "long", timeZone: "UTC",
  }).replace(",", "");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/**
 * Las tarjetas por día, de lunes a domingo (Manolo, 20 oct 2026: «en lugar de
 * por nombre, hazlo por fecha»). Van los siete días: un día sin tours también
 * dice algo. La API las manda en orden de día y, el mismo día, por cliente.
 */
function porDia(lunes: string, salidas: SalidaCorte[]): { fecha: string; salidas: SalidaCorte[] }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const fecha = addDaysYMD(lunes, i);
    return { fecha, salidas: salidas.filter(x => x.fecha === fecha) };
  });
}

/**
 * El día y, a la derecha, lo que costaron sus tours que entran al corte. Una
 * cuenta junta de varios días le carga a cada uno su parte.
 */
function GrupoDia({ fecha, salidas, partes, children }: {
  fecha: string; salidas: SalidaCorte[];
  partes: Record<string, { incluida: boolean; costos: number }>;
  children: ReactNode;
}) {
  if (salidas.length === 0) {
    return <p className="px-1 pt-2 font-dm text-xs text-[#1B4332]/40">{diaLargo(fecha)} · sin tours</p>;
  }
  // Las tarjetas son de costos: lo cobrado se escribe en «La semana».
  const costos = salidas.reduce((t, s) => t + (partes[s.clave]?.incluida ? partes[s.clave].costos : 0), 0);
  return (
    <div className="space-y-2 pt-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-1">
        <p className="font-cormorant text-[#1B4332] text-lg font-light leading-tight">{diaLargo(fecha)}</p>
        <p className="font-dm text-[11px] text-[#1B4332]/55">
          {salidas.length} tour{salidas.length === 1 ? "" : "s"} · costos <span className="panel-cifra text-[#1B4332]">{fmx(costos)}</span>
        </p>
      </div>
      {children}
    </div>
  );
}

function Estado({ sucio, guardado }: { sucio: boolean; guardado: Guardado | null }) {
  const [texto, tono] = sucio
    ? ["Cambios sin guardar", "bg-[#a86814]/10 text-[#7a4b0e]"]
    : guardado?.estado === "borrador"
      ? [`Costos guardados ${fechaGuardado(guardado.updatedAt)} por ${guardado.guardadoPor} · corte pendiente`, "bg-[#a86814]/10 text-[#7a4b0e]"]
      : guardado
        ? [`Corte hecho ${fechaGuardado(guardado.updatedAt)} por ${guardado.guardadoPor}`, "bg-[#2b845c]/10 text-[#1f6646]"]
        : ["Sin guardar", "bg-[#1B4332]/6 text-[#1B4332]/60"];
  return <span className={`font-dm text-[11px] px-2 py-1 rounded-sm ${tono}`}>{texto}</span>;
}

/** Un tour con el que se puede juntar una cuenta; `mismo`: mismo tour y mismo día. */
interface Candidato { s: SalidaCorte; mismo: boolean }

const BTN_MINI = "inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-[#1B4332]/20 text-[#1B4332] hover:border-[#1B4332]/50 font-dm text-[11px] panel-pulsable panel-foco";

const unicos = (xs: string[]) => xs.filter((x, i) => xs.indexOf(x) === i);

/**
 * Una cuenta de costos: un tour solo o varios que fueron juntos (Manolo, 20 oct
 * 2026: «que un niño sea capaz de entenderlo y juntar tours»). Arriba qué tour
 * es y quién; abajo sus costos. Lo cobrado NO va aquí: se escribe en «La
 * semana». Si alguien más hizo el mismo tour el mismo día, la tarjeta lo
 * pregunta sola.
 */
function TarjetaCuenta({ cuenta, c, candidatos, recalculada, onCambio, onJuntar, onSeparar }: {
  cuenta: CuentaCorte;
  /** La captura de la principal: la casilla y los costos de toda la cuenta. */
  c: CapturaSalida;
  candidatos: Candidato[];
  /** Se juntó encima de costos ya escritos: avisar que se volvieron a calcular. */
  recalculada: boolean;
  onCambio: (cambio: (c: CapturaSalida) => CapturaSalida) => void;
  onJuntar: (clave: string) => void;
  onSeparar: () => void;
}) {
  const [eligiendo, setEligiendo]       = useState(false);
  const [sinPregunta, setSinPregunta]   = useState(false);
  const ts       = cuenta.tarjetas;
  const junta    = ts.length > 1;
  const costos   = c.costos.reduce((t, x) => t + (x.monto || 0), 0);
  const deValles = ts.some(x => x.zona === "valles");
  // El grupo de cada reserva cuenta una vez aunque haga varios tours.
  const grupo: Record<string, number> = {};
  for (const t of ts) grupo[t.reserva.id] = Math.max(grupo[t.reserva.id] ?? 0, t.personas);
  const personas = Object.values(grupo).reduce((a, b) => a + b, 0);
  const pregunta = !sinPregunta ? candidatos.find(x => x.mismo) : undefined;

  const cambiarCosto = (i: number, parte: Partial<CostoCorte>) =>
    onCambio(x => ({ ...x, costos: x.costos.map((k, j) => (j === i ? { ...k, ...parte } : k)) }));
  const quitarCosto  = (i: number) =>
    onCambio(x => ({ ...x, costos: x.costos.filter((_, j) => j !== i) }));
  const agregarCosto = () =>
    onCambio(x => ({ ...x, costos: [...x.costos, { concepto: "", monto: 0 }] }));

  return (
    // La barra de color y el código de tres letras son los del Calendario (Manolo,
    // 20 oct 2026): el mismo tour se reconoce igual en las dos pantallas.
    <div data-clave={cuenta.clave} className={`panel-card overflow-hidden transition-opacity ${c.incluida ? "" : "opacity-55"}`}
      style={{ borderLeft: `3px solid ${colorDeTour(ts[0].slug)}` }}>
      {/* Qué tour es */}
      <div className="flex items-start gap-3 px-4 py-3 bg-[#FAFAF8] border-b border-[#1B4332]/8">
        <div className="flex-1 min-w-0">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {junta && <Link2 size={14} className="text-[#1B4332]/60 shrink-0" aria-hidden="true" />}
            {ts.filter((t, i, xs) => xs.findIndex(x => x.tour === t.tour) === i).map((t, k) => (
              <span key={t.clave} className="inline-flex items-baseline gap-1.5">
                {k > 0 && <span className="text-[#1B4332]/35">+</span>}
                <CodigoTour slug={t.slug} className="text-xs" />
                <span className="font-dm text-sm text-[#1B4332] font-medium leading-snug">{t.tour}</span>
              </span>
            ))}
            {deValles && !ts.some(t => t.cargoValles) && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-[#a86814]/10 text-[#7a4b0e] font-dm text-[10px]">
                <MapPin size={10} aria-hidden="true" /> Ciudad Valles
              </span>
            )}
            {!junta && <SalidaZona s={ts[0]} />}
          </p>
          {/* El día ya lo dice el encabezado del grupo: aquí va QUIÉN. */}
          <p className="font-dm text-[11px] text-[#1B4332]/55">
            {junta
              ? <>{unicos(ts.map(t => t.fecha).sort()).map(diaCorto).join(", ")} · {personas} persona{personas === 1 ? "" : "s"}</>
              : <><span className="text-[#1B4332]/80">{ts[0].reserva.cliente}</span> · {personas} persona{personas === 1 ? "" : "s"} · <span className="font-mono text-[10px] text-[#1B4332]/45">{ts[0].reserva.folio}</span></>}
          </p>
          {!junta && <PrecioYSaldo r={ts[0].reserva} />}
          {!junta && ts[0].rzr && <ParteErick s={ts[0]} />}
        </div>
        <label className="flex items-center gap-1.5 shrink-0 font-dm text-[11px] text-[#1B4332]/70 cursor-pointer"
          title="Si lo quitas, este tour no entra en el corte de la semana">
          <input type="checkbox" checked={c.incluida}
            onChange={e => { const v = e.target.checked; onCambio(x => ({ ...x, incluida: v })); }}
            className="w-4 h-4 accent-[#1B4332]" />
          Contar
        </label>
      </div>

      {c.incluida && (
        <>
          {/* Quién va junto */}
          {junta && (
            <div className="px-4 pt-3">
              <p className="font-dm text-[11px] text-[#1B4332]/60 mb-1.5">Van juntos, con una sola cuenta de costos:</p>
              <ul className="space-y-1">
                {ts.map(t => (
                  <li key={t.clave} className="font-dm text-xs text-[#1B4332]/80">
                    <p className="truncate"><CodigoTour slug={t.slug} className="text-[10px] mr-1" />{t.reserva.cliente} · {t.tour} · {diaCorto(t.fecha)} · {t.personas} p.</p>
                    <PrecioYSaldo r={t.reserva} />
                    {t.rzr && <ParteErick s={t} />}
                    {t.cargoValles && <p className="mt-0.5"><SalidaZona s={t} /></p>}
                  </li>
                ))}
              </ul>
              <button onClick={onSeparar} className={`${BTN_MINI} mt-2`}>
                <Unlink size={12} /> Separar
              </button>
            </div>
          )}

          {/* La pregunta que resuelve el caso común */}
          {pregunta && (
            <div className="mx-4 mt-3 flex flex-wrap items-center gap-2 px-3 py-2 rounded-sm bg-[#2b845c]/10 font-dm text-xs text-[#1f6646]">
              <Bus size={15} className="shrink-0" aria-hidden="true" />
              <span className="flex-1 min-w-[180px]">
                <b className="font-medium">{pregunta.s.reserva.cliente}</b> hizo este mismo tour este día. ¿Fueron juntos?
              </span>
              <button onClick={() => onJuntar(pregunta.s.clave)} className={BTN}>Sí, juntar</button>
              <button onClick={() => { playClick(); setSinPregunta(true); }} className={BTN_2}>No</button>
            </div>
          )}

          {/* Los costos */}
          <div className="p-4">
            <p className="panel-eyebrow mb-2">Costos <span className="normal-case tracking-normal text-[#1B4332]/45">· los paga {SOCIO_COSTOS}</span></p>
            {recalculada && (
              <p className="font-dm text-[11px] text-[#7a4b0e] mb-2">
                Al juntarlos, los costos se calcularon de nuevo para todos. Revisa si habías escrito alguno.
              </p>
            )}
            {deValles && (
              <p className="font-dm text-[11px] text-[#7a4b0e] mb-2">
                Viene de Ciudad Valles: revisa transporte y gasolina, que no son los de Xilitla.
              </p>
            )}
            {c.costos.length === 0 && (
              <p className="font-dm text-[11px] text-[#1B4332]/45 mb-2">
                Este tour no tiene costos guardados. Escríbelos aquí.
              </p>
            )}
            <div className="space-y-1.5">
              {c.costos.map((x, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <input value={x.concepto} placeholder="¿En qué se gastó?" aria-label="Concepto"
                    onChange={e => cambiarCosto(i, { concepto: e.target.value })}
                    className={`${INPUT} flex-1 min-w-0`} />
                  <div className="relative w-24 shrink-0">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#1B4332]/40 text-xs font-dm">$</span>
                    <input inputMode="numeric" value={x.monto ? String(x.monto) : ""} placeholder="0" aria-label="Monto"
                      onChange={e => cambiarCosto(i, { monto: Number(e.target.value.replace(/\D/g, "")) || 0 })}
                      className={`${INPUT} w-full pl-5 text-right panel-cifra`} />
                  </div>
                  <button onClick={() => quitarCosto(i)} aria-label="Quitar costo"
                    className="p-1.5 text-[#1B4332]/35 hover:text-[#b8413f] panel-foco">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={agregarCosto}
              className="mt-2 inline-flex items-center gap-1 font-dm text-[11px] text-[#1B4332]/65 hover:text-[#1B4332] panel-foco">
              <Plus size={13} /> Agregar costo
            </button>
          </div>

          {/* El total de costos y juntar con otro (lo cobrado va en «La semana») */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-[#1B4332]/8">
            <span className="font-dm text-sm text-[#1B4332]/60">
              {junta ? "Costos de la cuenta" : "Costos de este tour"} <span className="panel-cifra font-medium text-[#1B4332]">{fmx(costos)}</span>
            </span>
            <button onClick={() => { playClick(); setEligiendo(v => !v); }} aria-expanded={eligiendo} className={BTN_MINI}>
              <Link2 size={12} /> Juntar con otro tour
            </button>
          </div>

          {eligiendo && (
            <ElegirJunta candidatos={candidatos}
              onElegir={clave => { setEligiendo(false); onJuntar(clave); }}
              onCancelar={() => { playClick(); setEligiendo(false); }} />
          )}
        </>
      )}
    </div>
  );
}

/** La lista para juntar con cualquier otro tour de la semana; los del mismo día y tour, arriba. */
function ElegirJunta({ candidatos, onElegir, onCancelar }: {
  candidatos: Candidato[]; onElegir: (clave: string) => void; onCancelar: () => void;
}) {
  return (
    <div className="mx-4 mb-4 p-3 rounded-sm border border-[#1B4332]/15 bg-[#FAFAF8]">
      <p className="font-dm text-xs text-[#1B4332] mb-2">¿Con cuál tour compartió camioneta, guía o gasolina?</p>
      {candidatos.length === 0 ? (
        <p className="font-dm text-[11px] text-[#1B4332]/50">No hay otros tours esta semana.</p>
      ) : (
        <ul className="space-y-1">
          {candidatos.map(x => (
            <li key={x.s.clave}>
              <button onClick={() => onElegir(x.s.clave)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-sm border border-transparent hover:border-[#1B4332]/15 hover:bg-white text-left font-dm text-xs text-[#1B4332] panel-foco">
                <CodigoTour slug={x.s.slug} className="text-[10px] shrink-0" />
                <span className="flex-1 min-w-0 truncate">{x.s.tour} · {diaCorto(x.s.fecha)} · {x.s.reserva.cliente}</span>
                {x.mismo && (
                  <span className="shrink-0 px-1.5 py-0.5 rounded-sm bg-[#2b845c]/10 text-[#1f6646] text-[10px]">mismo tour y día</span>
                )}
                <span className="shrink-0 text-[#1B4332]/45">Juntar →</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <button onClick={onCancelar} className={`${BTN_MINI} mt-2`}>Cancelar</button>
    </div>
  );
}

/** En el lugar de un tour que va junto con otro: dónde quedaron sus costos. */
/**
 * Debajo del cliente: lo que se registró de este tour y si falta cobrar
 * (Manolo, 20 oct 2026). El saldo es de la reserva entera: con varios tours,
 * sale igual en cada uno de sus tours.
 */
function PrecioYSaldo({ r }: { r: ReservaCorte }) {
  return (
    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-dm text-[11px] text-[#1B4332]/60">
      <span>Tour registrado <b className="panel-cifra font-medium text-[#1B4332]/85">{fmx(r.precioTour)}</b></span>
      {r.totalReserva !== r.precioTour && (
        <span>· reserva <span className="panel-cifra">{fmx(r.totalReserva)}</span></span>
      )}
      {r.saldo > 0
        ? <span className="px-1.5 py-0.5 rounded-sm bg-[#C0392B]/10 text-[#9B2C1F] font-medium">Falta cobrar <span className="panel-cifra">{fmx(r.saldo)}</span></span>
        : <span className="px-1.5 py-0.5 rounded-sm bg-[#1B4332]/8 text-[#1B4332]/75">Pagada completa</span>}
    </p>
  );
}

/** En los RZR: lo cobrado por ese recorrido y el 10 % que le toca a Erick. */
function ParteErick({ s }: { s: SalidaCorte }) {
  const cobrado = Math.max(0, s.ventas - s.hospedaje);
  return (
    <p className="mt-0.5 font-dm text-[11px] text-[#1B4332]/60">
      Cobrado de este RZR <span className="panel-cifra">{fmx(cobrado)}</span> · {VENDEDOR} {REPARTO_RZR.pctVendedor} %:{" "}
      <b className="panel-cifra font-medium text-[#1B4332]/85">{fmx(Math.round((cobrado * REPARTO_RZR.pctVendedor) / 100))}</b>
    </p>
  );
}

/**
 * La Ruta Surrealista cuesta $400 más desde Ciudad Valles (Manolo, 20 oct
 * 2026): la tarjeta dice de dónde salió y si ese traslado se cobró. Si la
 * reserva no lo dice, enseña su hospedaje para decidirlo a ojo.
 */
function SalidaZona({ s }: { s: SalidaCorte }) {
  const z = s.cargoValles;
  if (!z) return null;
  const base = "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm font-dm text-[10px]";
  if (z.salida === "valles") {
    return (
      <span className={`${base} ${z.cobrado > 0 ? "bg-[#a86814]/10 text-[#7a4b0e]" : "bg-[#C0392B]/10 text-[#9B2C1F] font-medium"}`}>
        <MapPin size={10} aria-hidden="true" /> Salió de Ciudad Valles · {z.cobrado > 0 ? `traslado cobrado ${fmx(z.cobrado)}` : `no se cobró el traslado (${fmx(z.cargo)})`}
      </span>
    );
  }
  if (z.salida === "xilitla") {
    return (
      <span className={`${base} bg-[#1B4332]/8 text-[#1B4332]/75`}>
        <MapPin size={10} aria-hidden="true" /> Salió de Xilitla{z.cobrado > 0 ? ` · ojo: trae ${fmx(z.cobrado)} de traslado de Valles` : ""}
      </span>
    );
  }
  return (
    <span className={`${base} bg-[#C0392B]/10 text-[#9B2C1F]`}>
      <MapPin size={10} aria-hidden="true" /> ¿Xilitla o Valles? {z.hospedaje ? `Hospedaje: ${z.hospedaje}` : "No se anotó"}
    </span>
  );
}

function AvisoJunta({ s, cabeza, onIrA }: { s: SalidaCorte; cabeza: SalidaCorte; onIrA: (clave: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 rounded-sm border border-dashed border-[#1B4332]/25 font-dm text-xs text-[#1B4332]/65">
      <Link2 size={13} className="shrink-0" aria-hidden="true" />
      <span className="flex-1 min-w-[180px]">
        <CodigoTour slug={s.slug} className="text-[10px] mr-1" />{s.tour} · {s.reserva.cliente}. Va junto con <b className="font-medium text-[#1B4332]">{cabeza.reserva.cliente}</b> ({diaCorto(cabeza.fecha)}): sus costos están en esa tarjeta.
      </span>
      <button onClick={() => onIrA(cabeza.clave)} className={BTN_MINI}>Ver</button>
    </div>
  );
}

/** Un renglón de «La semana»: texto, nota chica y cifra. */
function Renglon({ fila, texto, nota, valor, fuerte }: { fila: string; texto: string; nota?: string; valor: number; fuerte?: boolean }) {
  return (
    <div className={`${fila} py-0.5`}>
      <span className="text-sm">{texto}{nota && <span className="text-[11px] text-[#1B4332]/45"> ({nota})</span>}</span>
      <span className={`panel-cifra text-sm whitespace-nowrap shrink-0 ${fuerte ? "font-medium" : ""} ${valor < 0 ? "text-[#b8413f]" : ""}`}>{fmx(valor)}</span>
    </div>
  );
}

/**
 * «La semana»: el estado de resultados (Manolo, 20 oct 2026). Lo cobrado se
 * escribe AQUÍ, a mano y sin nada propuesto: debajo de cada socio, cuánto
 * recibió y de qué (texto libre, sin lista), y si es de RZR. Los tours van
 * 50/50 de la ganancia; el RZR, 10 % Erick y de lo que queda 20 % Manolo y 80 %
 * Martín (`REPARTO_RZR`). A Martín se le pasan los costos de tours, sus partes
 * y lo de Erick (él se lo paga), menos lo que ya tiene en la mano.
 */
function Resultados({ r, cobros, onCambio }: {
  r: ResumenCorte;
  cobros: CobroSemana[];
  onCambio: (cambio: (prev: CobroSemana[]) => CobroSemana[]) => void;
}) {
  const fila = "flex items-baseline justify-between gap-3";
  const liq  = r.liquidacion;
  const cambiar = (i: number, parte: Partial<CobroSemana>) =>
    onCambio(prev => prev.map((x, j) => (j === i ? { ...x, ...parte } : x)));
  const quitar  = (i: number) => onCambio(prev => prev.filter((_, j) => j !== i));
  const agregar = (q: Receptor) => { playClick(); onCambio(prev => [...prev, { monto: 0, recibio: q, concepto: "", stripe: false, rzr: false }]); };
  const hayRzr  = r.rzr.cobrado > 0 || r.rzr.registrado > 0;
  const [gManolo, gMartin] = repartir(r.tours.ganancia);
  // Lo de cada uno en la ganancia: Martín ya con los costos del RZR pagados de su 80 %.
  const parteManolo = gManolo + r.rzr.manolo;
  const parteMartin = gMartin + r.rzr.martin - r.rzr.costos;
  return (
    <div className="panel-card p-4 font-dm text-[#1B4332]">
      <p className="panel-eyebrow mb-1">La semana</p>

      {/* 1 · Lo cobrado: cada socio, cuánto recibió y de qué */}
      <Bloque icono={Wallet} titulo="Lo cobrado" color={C_COBRADO} total={r.ventas}>
          <div className="space-y-3">
            {RECEPTORES.map(q => {
              const suyos = cobros.map((c, i) => ({ c, i })).filter(x => x.c.recibio === q);
              return (
                <div key={q} className="pl-3 border-l-2 border-[#1B4332]/10">
                  <div className={fila}>
                    <span className="text-xs font-medium">{q} recibió</span>
                    <span className="panel-cifra text-xs font-medium">{fmx(r.recibido?.[q] ?? 0)}</span>
                  </div>
                  <div className="mt-1 space-y-1.5">
                    {suyos.map(({ c, i }) => (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center gap-1">
                          <div className="relative w-[5.5rem] shrink-0">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#1B4332]/40 text-xs">$</span>
                            <input inputMode="numeric" value={c.monto ? String(c.monto) : ""} placeholder="0" aria-label={`Cuánto recibió ${q}`}
                              onChange={e => cambiar(i, { monto: Number(e.target.value.replace(/\D/g, "")) || 0 })}
                              className={`${INPUT} w-full pl-5 text-right panel-cifra`} />
                          </div>
                          <input value={c.concepto} onChange={e => cambiar(i, { concepto: e.target.value })}
                            placeholder="¿De qué?" aria-label="¿De qué?" className={`${INPUT} flex-1 min-w-0`} />
                          <button onClick={() => quitar(i)} aria-label="Quitar cobro"
                            className="p-1 text-[#1B4332]/35 hover:text-[#b8413f] panel-foco shrink-0">
                            <X size={14} />
                          </button>
                        </div>
                        {/* Si entró por Stripe, Stripe ya se quedó su comisión; el RZR se reparte
                            aparte (10 % Erick, 20 % Manolo, 80 % Martín). Las dos en un renglón. */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-[#1B4332]/65">
                          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                            <input type="checkbox" checked={c.stripe}
                              onChange={e => { playClick(); cambiar(i, { stripe: e.target.checked }); }}
                              className="w-3.5 h-3.5 accent-[#1B4332]" />
                            Vino de Stripe
                          </label>
                          <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                            <input type="checkbox" checked={c.rzr}
                              onChange={e => { playClick(); cambiar(i, { rzr: e.target.checked }); }}
                              className="w-3.5 h-3.5 accent-[#1B4332]" />
                            Es de RZR
                          </label>
                          {c.stripe && c.monto > 0 && (
                            <span className="ml-auto panel-cifra text-[#7a4b0e]">comisión −{fmx(comisionDeCobro(c))}</span>
                          )}
                        </div>
                        {c.monto > 0 && !c.concepto.trim() && (
                          <p className="text-[10px] text-[#7a4b0e]">Falta decir de qué fue.</p>
                        )}
                      </div>
                    ))}
                  </div>
                  <button onClick={() => agregar(q)}
                    className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-[#1B4332]/65 hover:text-[#1B4332] panel-foco">
                    <Plus size={13} /> Agregar lo que recibió {q}
                  </button>
                </div>
              );
            })}
          </div>
        {r.rzr.registrado !== r.rzr.cobrado && (
          <p className="mt-2 flex gap-1.5 text-[11px] leading-snug text-[#7a4b0e]">
            <AlertTriangle size={13} className="shrink-0 mt-px" aria-hidden="true" />
            Las tarjetas de RZR registran {fmx(r.rzr.registrado)} cobrados y aquí marcaste {fmx(r.rzr.cobrado)} como «Es de RZR».
          </p>
        )}
      </Bloque>

      {/* 2 · Comisiones y hotel: lo que no se queda nadie de nosotros */}
      <Bloque icono={Percent} titulo="Comisiones y hotel" color={C_COMISION}>
        {r.comisionStripe > 0 && <Renglon fila={fila} texto="− Stripe" nota="3.6 % + IVA" valor={r.comisionStripe} />}
        {r.hosting > 0 && <Renglon fila={fila} texto={`− ${CONCEPTO_HOSTING}`} nota={`${+(HOSTING_PCT * 100).toFixed(1)} %, lo paga ${SOCIO_HOTEL}`} valor={r.hosting} />}
        {r.rzr.vendedor > 0 && <Renglon fila={fila} texto={`− ${VENDEDOR}`} nota={`${REPARTO_RZR.pctVendedor} % del RZR, se lo paga ${SOCIO_COSTOS}`} valor={r.rzr.vendedor} />}
        {r.hospedaje > 0 && <Renglon fila={fila} texto="− Hotel" nota={`lo paga ${SOCIO_HOTEL}`} valor={r.hospedaje} />}
        {r.comisionStripe + r.hosting + r.rzr.vendedor + r.hospedaje === 0 && (
          <p className="text-[11px] text-[#1B4332]/50">Nada esta semana.</p>
        )}
      </Bloque>
      <Total icono={PiggyBank} texto="Lo que queda real" nota="lo cobrado menos comisiones y hotel" valor={r.quedaReal} color={C_QUEDA} />

      {/* 3 · Costos operativos: todos los paga Martín */}
      <Bloque icono={Truck} titulo={`Costos operativos · los paga ${SOCIO_COSTOS}`} color={C_COSTOS}>
        <Renglon fila={fila} texto="− Tours" valor={r.tours.costos} />
        {hayRzr && <Renglon fila={fila} texto="− RZR" valor={r.rzr.costos} />}
        <div className={`border-t mt-1 pt-1 ${fila}`} style={{ borderColor: `${C_COSTOS}33` }}>
          <span className="text-sm font-medium">Costos totales</span>
          <span className="panel-cifra text-sm font-medium">{fmx(r.costos)}</span>
        </div>
      </Bloque>
      <Total icono={TrendingUp} texto="Ganancia" nota="lo que queda real menos costos" valor={r.utilidad} color={C_QUEDA} grande />

      {/* La ganancia, separada (Manolo, 20 oct 2026): los tours solos, con su
          50/50, y el RZR aparte, con su 10 % de Erick y su 20/80. */}
      <Bloque icono={Bus} titulo="Tours · sin RZR · 50/50" color={C_TOURS}>
        <Renglon fila={fila} texto="Cobrado de tours" valor={r.tours.ventas} />
        <Renglon fila={fila} texto="− Comisiones y hotel" nota="Stripe, Railway, hotel" valor={r.tours.comisionStripe + r.tours.hosting + r.hospedaje} />
        <Renglon fila={fila} texto="− Costos de tours" valor={r.tours.costos} />
        <div className={`border-t mt-1 pt-1.5 ${fila}`} style={{ borderColor: `${C_TOURS}40` }}>
          <span className="text-sm font-medium">= Ganancia de tours</span>
          <span className={`panel-cifra font-cormorant text-2xl leading-none ${r.tours.ganancia < 0 ? "text-[#b8413f]" : ""}`} style={r.tours.ganancia < 0 ? undefined : { color: C_TOURS }}>{fmx(r.tours.ganancia)}</span>
        </div>
        <Renglon fila={fila} texto="Manolo" nota="50 %" valor={gManolo} fuerte />
        <Renglon fila={fila} texto="Martín" nota="50 %" valor={gMartin} fuerte />
      </Bloque>

      {hayRzr && (
        <Bloque icono={Mountain} titulo={`RZR · ${REPARTO_RZR.pctVendedor} % ${VENDEDOR} · ${REPARTO_RZR.pctManolo}/${100 - REPARTO_RZR.pctManolo}`} color={C_RZR}>
          <Renglon fila={fila} texto="Cobrado de RZR" valor={r.rzr.cobrado} />
          <Renglon fila={fila} texto={`− ${VENDEDOR}`} nota={`${REPARTO_RZR.pctVendedor} % de lo cobrado`} valor={r.rzr.vendedor} />
          {r.rzr.comisionStripe + r.rzr.hosting > 0 && <Renglon fila={fila} texto="− Stripe y Railway" valor={r.rzr.comisionStripe + r.rzr.hosting} />}
          <div className={`border-t mt-1 pt-1 ${fila}`} style={{ borderColor: `${C_RZR}40` }}>
            <span className="text-sm font-medium">= Queda para repartir</span>
            <span className="panel-cifra text-sm font-medium">{fmx(r.rzr.queda)}</span>
          </div>
          <Renglon fila={fila} texto="Manolo" nota={`${REPARTO_RZR.pctManolo} %`} valor={r.rzr.manolo} fuerte />
          <Renglon fila={fila} texto="Martín" nota={`${100 - REPARTO_RZR.pctManolo} %`} valor={r.rzr.martin} fuerte />
          <Renglon fila={fila} texto="− Costos del RZR" nota={`los paga ${SOCIO_COSTOS} de su ${100 - REPARTO_RZR.pctManolo} %`} valor={r.rzr.costos} />
          <div className={`border-t mt-1 pt-1.5 ${fila}`} style={{ borderColor: `${C_RZR}40` }}>
            <span className="text-sm font-medium">= Ganancia del RZR</span>
            <span className={`panel-cifra font-cormorant text-2xl leading-none ${r.rzr.queda - r.rzr.costos < 0 ? "text-[#b8413f]" : ""}`} style={r.rzr.queda - r.rzr.costos < 0 ? undefined : { color: C_RZR }}>{fmx(r.rzr.queda - r.rzr.costos)}</span>
          </div>
          <p className="text-right text-[11px] text-[#1B4332]/55">
            A {SOCIO_COSTOS} le quedan {fmx(r.rzr.martin - r.rzr.costos)} ya pagados los costos.
          </p>
        </Bloque>
      )}

      {/* 4 · Lo de cada quien, sumando tours y RZR */}
      <Bloque icono={PieChart} titulo="Total de cada quien · tours + RZR" color={C_REPARTO}>
        {r.utilidad > 0 && parteManolo >= 0 && parteMartin >= 0 && (
          <div className="flex h-2 rounded-full overflow-hidden mb-2" aria-hidden="true">
            <div style={{ width: `${(parteManolo / r.utilidad) * 100}%`, backgroundColor: C_REPARTO }} />
            <div style={{ width: `${(parteMartin / r.utilidad) * 100}%`, backgroundColor: `${C_REPARTO}55` }} />
          </div>
        )}
        <Persona nombre="Manolo" color={C_REPARTO} valor={parteManolo} fila={fila}
          detalle={[`50 % de tours ${fmx(gManolo)}`, ...(hayRzr ? [`${REPARTO_RZR.pctManolo} % del RZR ${fmx(r.rzr.manolo)}`] : [])]}
          extra={r.hospedaje + r.hosting > 0
            ? `Además tiene ${fmx(r.hospedaje + r.hosting)} para pagar ${[r.hospedaje > 0 ? "el hotel" : "", r.hosting > 0 ? "Railway" : ""].filter(Boolean).join(" y ")}.`
            : undefined} />
        <Persona nombre="Martín" color={`${C_REPARTO}99`} valor={parteMartin} fila={fila}
          detalle={[`50 % de tours ${fmx(gMartin)}`, ...(hayRzr ? [`${100 - REPARTO_RZR.pctManolo} % del RZR ${fmx(r.rzr.martin)} − sus costos ${fmx(r.rzr.costos)}`] : [])]} />
      </Bloque>

      {/* 5 · Las cuentas con Martín */}
      {liq && (
        <Bloque icono={HandCoins} titulo={`Cuentas con ${SOCIO_COSTOS}`} color={C_CUENTAS}>
          <Renglon fila={fila} texto="Costos de tours que pagó" valor={liq.costosPagados} />
          <Renglon fila={fila} texto="+ Su 50 % de tours" valor={liq.ganancia} />
          {liq.rzr !== 0 && <Renglon fila={fila} texto={`+ Su ${100 - REPARTO_RZR.pctManolo} % del RZR`} nota="de ahí paga los costos del RZR" valor={liq.rzr} />}
          {/* Martín le paga a Erick (Manolo, 20 oct 2026): se le pasa con lo suyo. */}
          {liq.vendedor !== 0 && <Renglon fila={fila} texto={`+ Lo de ${VENDEDOR}, para pagárselo`} valor={liq.vendedor} />}
          <Renglon fila={fila} texto="− Lo que ya cobró él" valor={liq.cobro} />
          <div className="mt-2 px-3 py-2.5 rounded-md" style={{ backgroundColor: liq.pasa < 0 ? `${C_QUEDA}1a` : `${C_CUENTAS}14`, color: liq.pasa < 0 ? "#1f6646" : C_CUENTAS }}>
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <ArrowLeftRight size={14} aria-hidden="true" />
              {liq.pasa > 0 ? `${SOCIO_HOTEL} le pasa a ${SOCIO_COSTOS}` : liq.pasa < 0 ? `${SOCIO_COSTOS} le pasa a ${SOCIO_HOTEL}` : "Están a mano"}
            </p>
            {liq.pasa !== 0 && <p className="panel-cifra font-cormorant text-3xl leading-tight">{fmx(Math.abs(liq.pasa))}</p>}
          </div>
          {liq.vendedor !== 0 && (
            <p className="mt-2 text-[12px]" style={{ color: C_CUENTAS }}>
              Y {SOCIO_COSTOS} le paga a {VENDEDOR} <b className="panel-cifra">{fmx(liq.vendedor)}</b>.
            </p>
          )}
          {r.tours.costos > liq.costosPagados && (
            <p className="text-[11px] text-[#1B4332]/45">
              La comisión de Stripe ({fmx(r.tours.costos - liq.costosPagados)}) no la paga {SOCIO_COSTOS}: Stripe la descuenta antes de que te llegue.
            </p>
          )}
        </Bloque>
      )}

      <p className="mt-3 text-[11px] text-[#1B4332]/45">
        {r.tarjetas} tour{r.tarjetas === 1 ? "" : "s"} en el corte
        {r.salidas.length < r.tarjetas && <> · {r.salidas.filter(x => x.tarjetas > 1).reduce((t, x) => t + x.tarjetas, 0)} van juntos</>}
      </p>
    </div>
  );
}

/**
 * Los colores de «La semana» (Manolo, 20 oct 2026: «colores e iconos para que
 * sea más fácil de distinguir»). Salen de la paleta del panel: verde de lo que
 * entra y queda, ámbar de comisiones, rojo de costos, verde bosque de los
 * tours, ocre del RZR, azul del reparto y ciruela de las cuentas entre socios.
 */
const C_COBRADO  = "#1B4332";
const C_COMISION = "#a86814";
const C_QUEDA    = "#2b845c";
const C_COSTOS   = "#b8413f";
const C_REPARTO  = "#1a4e8a";
const C_TOURS    = "#2D6A4F";
const C_RZR      = "#8a6a1a";
const C_CUENTAS  = "#7a3a6a";

/** Un paso de «La semana»: su ícono y su color, para distinguirlo de un vistazo. */
function Bloque({ icono: Icono, titulo, color, total, children }: {
  icono: LucideIcon; titulo: string; color: string; total?: number; children: ReactNode;
}) {
  return (
    <section className="mt-3 rounded-md border p-3" style={{ borderColor: `${color}33`, backgroundColor: `${color}0a` }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${color}1f`, color }}>
          <Icono size={13} aria-hidden="true" />
        </span>
        <span className="flex-1 text-[10px] font-medium uppercase tracking-[1.5px]" style={{ color }}>{titulo}</span>
        {total !== undefined && <span className="panel-cifra text-sm font-medium" style={{ color }}>{fmx(total)}</span>}
      </div>
      {children}
    </section>
  );
}

/** El resultado entre dos pasos: «= Lo que queda real», «= Ganancia». */
function Total({ icono: Icono, texto, nota, valor, color, grande }: {
  icono: LucideIcon; texto: string; nota: string; valor: number; color: string; grande?: boolean;
}) {
  const tinta = valor < 0 ? C_COSTOS : color;
  return (
    <div className="mt-3 flex items-center gap-2 rounded-md px-3 py-2.5" style={{ backgroundColor: `${tinta}14`, color: tinta }}>
      <Icono size={grande ? 18 : 16} className="shrink-0" aria-hidden="true" />
      <div className="flex-1 min-w-0 leading-tight">
        <p className="text-sm font-medium">= {texto}</p>
        <p className="text-[10px] opacity-75">{nota}</p>
      </div>
      <span className={`panel-cifra font-cormorant leading-none ${grande ? "text-3xl" : "text-2xl"}`}>{fmx(valor)}</span>
    </div>
  );
}

/** Lo que le toca a un socio en el reparto, con de dónde sale. */
function Persona({ nombre, color, valor, fila, detalle, extra }: {
  nombre: string; color: string; valor: number; fila: string; detalle: string[]; extra?: string;
}) {
  return (
    <div className="py-1">
      <div className={fila}>
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
          {nombre}
        </span>
        <span className={`panel-cifra text-base font-medium ${valor < 0 ? "text-[#b8413f]" : ""}`}>{fmx(valor)}</span>
      </div>
      <p className="pl-4 text-[11px] text-[#1B4332]/55">{detalle.join(" · ")}</p>
      {extra && <p className="pl-4 text-[11px] text-[#1B4332]/55">{extra}</p>}
    </div>
  );
}

function Historial({ filas, actual, onAbrir }: {
  filas: FilaHistorial[]; actual: string; onAbrir: (lunes: string) => void;
}) {
  if (filas.length === 0) return null;
  return (
    <section className="mt-10">
      <p className="panel-eyebrow mb-2">Cortes y borradores</p>
      <div className="sm:panel-card sm:overflow-hidden">
        <table className="panel-tabla panel-tabla-movil w-full font-dm text-xs text-[#1B4332]">
          <thead>
            <tr>
              <th className="text-left">Semana</th>
              <th className="text-right">Ventas</th>
              <th className="text-right">Costos</th>
              <th className="text-right">Utilidad</th>
              <th className="text-right">Manolo</th>
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
                  {f.estado === "borrador" && (
                    <span className="ml-2 px-1.5 py-0.5 rounded-sm bg-[#a86814]/10 text-[#7a4b0e] text-[10px]">Borrador</span>
                  )}
                </td>
                <td data-etiqueta="Ventas" className="text-right panel-cifra">{fmx(f.ventas)}</td>
                <td data-etiqueta="Costos" className="text-right panel-cifra">{fmx(f.costos)}</td>
                <td data-etiqueta="Utilidad" className={`text-right panel-cifra font-medium ${f.utilidad < 0 ? "text-[#b8413f]" : ""}`}>
                  {fmx(f.utilidad)}
                </td>
                <td data-etiqueta="Manolo" className="text-right panel-cifra">{fmx(f.resumen?.socios?.find(x => x.nombre === SOCIO_HOTEL)?.monto ?? 0)}</td>
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

/** El código de tres letras de cada tour, en su color (como en el Calendario). */
const codigos = (slugs: string[] = []) =>
  slugs.map(sl => `<b style="color:${colorDeTour(sl)}">${esc(codigoDeTour(sl))}</b>`).join(" ");

function imprimir(d: Semana, r: ResumenCorte, sucio: boolean) {
  const win = window.open("", "_blank");
  if (!win) {
    alert("El navegador bloqueó la ventana. Permite ventanas emergentes para imprimir.");
    return;
  }
  const sello = d.guardado && !sucio
    ? `${d.guardado.estado === "borrador" ? "Borrador: costos guardados" : "Corte hecho"} por ${esc(d.guardado.guardadoPor)} · ${esc(fechaGuardado(d.guardado.updatedAt))}`
    : "Vista previa · sin guardar";

  const conHotel = r.hospedaje > 0;
  const filas = r.salidas.map(s => `
    <tr>
      <td>${esc((s.dias ?? [s.fecha]).map(diaCorto).join(", "))}</td>
      <td>${codigos(s.slugs)} ${esc(s.tour)}</td>
      <td>${esc(s.folio)} · ${esc(s.cliente)}${s.zona === "valles" ? " · Cd. Valles" : ""}</td>
      <td class="n">${s.personas}</td>
      ${conHotel ? `<td class="n">${fmx(s.hospedaje)}</td>` : ""}
      <td class="n">${fmx(s.costos)}</td>
    </tr>`).join("");

  const desglose = r.salidas.filter(s => s.detalleCostos.length > 0).map(s => `
    <div class="bloque">
      <h3>${codigos(s.slugs)} ${esc(s.tour)} <span>· ${esc((s.dias ?? [s.fecha]).map(diaCorto).join(", "))} · ${esc(s.cliente)} (${esc(s.folio)})</span></h3>
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
<div class="sub">Huasteca Potosina Tours · Semana del ${esc(etiquetaSemana(d.semana))} · ${sello}</div>

<div class="cajas">
  <div class="er">
    <h2 style="margin-top:0;color:${C_COBRADO}">1 · Lo cobrado</h2>
    <div class="fila socio"><span>Cobrado</span><span><b>${fmx(r.ventas)}</b></span></div>
    <h2 style="color:${C_COMISION}">2 · Comisiones y hotel</h2>
    ${r.comisionStripe > 0 ? `<div class="fila"><span>− Stripe (3.6 % + IVA)</span><span>${fmx(r.comisionStripe)}</span></div>` : ""}
    ${r.hosting > 0 ? `<div class="fila"><span>− ${esc(CONCEPTO_HOSTING)} (${+(HOSTING_PCT * 100).toFixed(1)} %)</span><span>${fmx(r.hosting)}</span></div>` : ""}
    ${r.rzr.vendedor > 0 ? `<div class="fila"><span>− ${esc(VENDEDOR)} (${REPARTO_RZR.pctVendedor} % del RZR)</span><span>${fmx(r.rzr.vendedor)}</span></div>` : ""}
    ${r.hospedaje > 0 ? `<div class="fila"><span>− Hotel (lo paga ${esc(SOCIO_HOTEL)})</span><span>${fmx(r.hospedaje)}</span></div>` : ""}
    <div class="fila util" style="color:${C_QUEDA}"><span>= Lo que queda real</span><span>${fmx(r.quedaReal)}</span></div>
    <h2 style="color:${C_COSTOS}">3 · Costos operativos (los paga ${esc(SOCIO_COSTOS)})</h2>
    <div class="fila"><span>− Tours</span><span>${fmx(r.tours.costos)}</span></div>
    ${r.rzr.cobrado > 0 || r.rzr.registrado > 0 ? `<div class="fila"><span>− RZR</span><span>${fmx(r.rzr.costos)}</span></div>` : ""}
    <div class="fila"><span>Costos totales</span><span>${fmx(r.costos)}</span></div>
    <div class="fila util" style="color:${C_QUEDA}"><span>= Ganancia</span><span>${fmx(r.utilidad)}</span></div>
    <h2 style="color:${C_TOURS}">Tours (sin RZR) · 50/50</h2>
    <div class="fila"><span>Cobrado de tours</span><span>${fmx(r.tours.ventas)}</span></div>
    <div class="fila"><span>− Comisiones y hotel</span><span>${fmx(r.tours.comisionStripe + r.tours.hosting + r.hospedaje)}</span></div>
    <div class="fila"><span>− Costos de tours</span><span>${fmx(r.tours.costos)}</span></div>
    <div class="fila util" style="color:${C_TOURS}"><span>= Ganancia de tours</span><span>${fmx(r.tours.ganancia)}</span></div>
    ${r.rzr.cobrado > 0 || r.rzr.registrado > 0 ? `<h2 style="color:${C_RZR}">RZR · ${REPARTO_RZR.pctVendedor} % ${esc(VENDEDOR)} · ${REPARTO_RZR.pctManolo}/${100 - REPARTO_RZR.pctManolo}</h2>
    <div class="fila"><span>Cobrado de RZR</span><span>${fmx(r.rzr.cobrado)}</span></div>
    <div class="fila"><span>− ${esc(VENDEDOR)} (${REPARTO_RZR.pctVendedor} %)</span><span>${fmx(r.rzr.vendedor)}</span></div>
    ${r.rzr.comisionStripe + r.rzr.hosting > 0 ? `<div class="fila"><span>− Stripe y Railway</span><span>${fmx(r.rzr.comisionStripe + r.rzr.hosting)}</span></div>` : ""}
    <div class="fila"><span>= Queda para repartir</span><span>${fmx(r.rzr.queda)}</span></div>
    <div class="fila"><span>Manolo ${REPARTO_RZR.pctManolo} % · Martín ${100 - REPARTO_RZR.pctManolo} %</span><span>${fmx(r.rzr.manolo)} · ${fmx(r.rzr.martin)}</span></div>
    <div class="fila"><span>− Costos del RZR (los paga ${esc(SOCIO_COSTOS)})</span><span>${fmx(r.rzr.costos)}</span></div>
    <div class="fila util" style="color:${C_RZR}"><span>= Ganancia del RZR</span><span>${fmx(r.rzr.queda - r.rzr.costos)}</span></div>` : ""}
  </div>
  <div class="er">
    <h2 style="margin-top:0;color:${C_REPARTO}">4 · Total de cada quien (tours + RZR)</h2>
    ${(() => {
      const [gM, gT] = repartir(r.tours.ganancia);
      const rzr = r.rzr.cobrado > 0 || r.rzr.registrado > 0;
      return `<div class="fila socio"><span>Manolo</span><span><b>${fmx(gM + r.rzr.manolo)}</b></span></div>
    <div class="fila" style="color:rgba(22,54,42,.6);font-size:11px"><span>50 % de tours ${fmx(gM)}${rzr ? ` · ${REPARTO_RZR.pctManolo} % del RZR ${fmx(r.rzr.manolo)}` : ""}</span><span></span></div>
    <div class="fila socio"><span>Martín</span><span><b>${fmx(gT + r.rzr.martin - r.rzr.costos)}</b></span></div>
    <div class="fila" style="color:rgba(22,54,42,.6);font-size:11px"><span>50 % de tours ${fmx(gT)}${rzr ? ` · ${100 - REPARTO_RZR.pctManolo} % del RZR ${fmx(r.rzr.martin)} − sus costos ${fmx(r.rzr.costos)}` : ""}</span><span></span></div>
    ${r.hospedaje + r.hosting > 0 ? `<div class="fila" style="color:rgba(22,54,42,.6);font-size:11px"><span>Manolo tiene además ${fmx(r.hospedaje + r.hosting)} para pagar ${[r.hospedaje > 0 ? "el hotel" : "", r.hosting > 0 ? "Railway" : ""].filter(Boolean).join(" y ")}</span><span></span></div>` : ""}`;
    })()}
    ${r.liquidacion ? `<h2 style="color:${C_CUENTAS}">5 · Cuentas con ${esc(SOCIO_COSTOS)}</h2>
    <div class="fila"><span>Costos de tours que pagó</span><span>${fmx(r.liquidacion.costosPagados)}</span></div>
    <div class="fila"><span>+ Su 50 % de tours</span><span>${fmx(r.liquidacion.ganancia)}</span></div>
    ${r.liquidacion.rzr !== 0 ? `<div class="fila"><span>+ Su ${100 - REPARTO_RZR.pctManolo} % del RZR</span><span>${fmx(r.liquidacion.rzr)}</span></div>` : ""}
    ${r.liquidacion.vendedor !== 0 ? `<div class="fila"><span>+ Lo de ${esc(VENDEDOR)}, para pagárselo</span><span>${fmx(r.liquidacion.vendedor)}</span></div>` : ""}
    <div class="fila"><span>− Lo que ya cobró él</span><span>${fmx(r.liquidacion.cobro)}</span></div>
    <div class="fila util" style="color:${C_CUENTAS}"><span>${r.liquidacion.pasa > 0 ? `${esc(SOCIO_HOTEL)} le pasa a ${esc(SOCIO_COSTOS)}` : r.liquidacion.pasa < 0 ? `${esc(SOCIO_COSTOS)} le pasa a ${esc(SOCIO_HOTEL)}` : "Están a mano"}</span><span>${r.liquidacion.pasa !== 0 ? fmx(Math.abs(r.liquidacion.pasa)) : ""}</span></div>
    ${r.liquidacion.vendedor !== 0 ? `<div class="fila"><span>Y ${esc(SOCIO_COSTOS)} le paga a ${esc(VENDEDOR)}</span><span>${fmx(r.liquidacion.vendedor)}</span></div>` : ""}` : ""}
  </div>
</div>

<h2>Cobrado por socio</h2>
<div class="cajas" style="margin-top:0">
  ${RECEPTORES.map(q => `<div class="er">
    <div class="fila socio"><span><b>${esc(q)}</b></span><span><b>${fmx(r.recibido?.[q] ?? 0)}</b></span></div>
    ${(r.cobrosDetalle ?? []).filter(c => c.recibio === q).map(c => `<div class="fila" style="font-size:11px;color:rgba(22,54,42,.75)"><span>${esc(c.deQue)}${c.rzr ? ` <small style="color:rgba(22,54,42,.5)">(RZR)</small>` : ""}${c.comision > 0 ? ` <small style="color:rgba(22,54,42,.5)">(Stripe, −${fmx(c.comision)})</small>` : ""}</span><span>${fmx(c.monto)}</span></div>`).join("") || `<div class="fila" style="font-size:11px;color:rgba(22,54,42,.5)"><span>No cobró nada esta semana</span><span></span></div>`}
  </div>`).join("")}
</div>

<h2>Cuentas de costos · ${r.salidas.length}${r.tarjetas > r.salidas.length ? ` (${r.tarjetas} tours)` : ""}</h2>
${r.salidas.length ? `<table>
  <thead><tr><th>Día</th><th>Tour</th><th>Reserva</th><th class="n">Personas</th>${conHotel ? `<th class="n">Hotel</th>` : ""}<th class="n">Costos</th></tr></thead>
  <tbody>${filas}</tbody>
  <tfoot><tr><td colspan="4">Total</td>${conHotel ? `<td class="n">${fmx(r.hospedaje)}</td>` : ""}<td class="n">${fmx(r.costos)}</td></tr></tfoot>
</table>` : `<p class="sub">No hubo reservas en el corte.</p>`}

${desglose ? `<h2>Desglose de costos</h2><div class="desglose">${desglose}</div>` : ""}

<div class="pie">Impreso el ${esc(new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" }))}</div>
</body></html>`);
  win.document.close();
  // Un respiro para que carguen las fuentes antes del diálogo de impresión.
  setTimeout(() => win.print(), 800);
}
