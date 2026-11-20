"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, FileText, Mail, Plus, Search, Phone } from "lucide-react";
import {
  DndContext, DragOverlay, KeyboardSensor, MouseSensor, TouchSensor, pointerWithin, rectIntersection, useDraggable, useDroppable, useSensor, useSensors,
  type CollisionDetection, type DragEndEvent, type DragStartEvent, type UniqueIdentifier,
} from "@dnd-kit/core";
import type { LeadTarjeta, TareaFila } from "@/lib/admin/crmDatos";
import {
  COLUMNAS_TABLERO, DIAS_TABLERO_CERRADOS, ETAPAS_POR_CERRAR, cerradoHaceMenosDe, contarMotivos, estadoFecha, etiquetaEtapa, etiquetaMotivoPerdida, ordenTareas,
  type Etapa, type MotivoPerdida,
} from "@/lib/admin/crm";
import { conPeticionDelPanel, textoPeticion, type ResenaLead } from "@/lib/admin/resenaLead";
import { diaCortoMX } from "@/lib/admin/confirmacionReserva";
import { addDaysYMD, diffDiasYMD, ymdMX } from "@/lib/dates";
import { BadgesTour, BotonPedirResena, avisoAntesDeMover, estiloEtapa } from "./etapas";
import { etiquetaVence } from "@/lib/vencimientoCotizacion";
import { FilaSeguimiento, cambiarSeguimiento, editarSeguimiento, type AccionSeguimiento, type EdicionSeguimiento } from "../seguimientos/FilaSeguimiento";
import { ORIGENES_ELEGIBLES, mismoCanal } from "@/lib/origenReserva";
import { playClick, playError, playSuccess } from "@/lib/admin/sfx";
import { EncabezadoPagina } from "@/components/admin/ui/EncabezadoPagina";
import { EstadoVacio } from "@/components/admin/ui/EstadoVacio";
import { FormNuevoLead } from "./FormNuevoLead";
import { DialogoPerdido } from "./MotivoPerdida";
import { COLOR_FECHA, COLOR_VENCE, botonPrimario, canalCorto, fechaCorta, fechaCortaM, fmx, inputCls, type TourOpcion } from "./comun";

// Los filtros van a lo ancho de su texto (no `inputCls`, que estira a todo el renglón).
const filtroCls = "min-h-[44px] rounded-[var(--panel-radio-sm)] border border-[var(--panel-borde)] bg-white px-3 text-[16px] font-dm text-[var(--panel-tinta)] panel-foco sm:text-[14px]";

type Vista = "pipeline" | "perdido" | "operado";
type PedirResena = (l: LeadTarjeta, r: ResenaLead, anotada: Promise<boolean>) => void;

/** Operado y Perdido: las cerradas. Su columna enseña solo lo de los últimos días. */
const CERRADAS: string[] = ["operado", "perdido"];
const esCerrada = (e: string) => CERRADAS.includes(e);
/** Cuántas tarjetas caben en una columna cerrada; las demás, en «Ver todos». */
const TOPE_CERRADOS = 20;
const SIN_RESENAS: Record<string, ResenaLead> = {};

/** El id de un destino del arrastre (la columna, su pastilla de arriba o la barra de abajo) → su etapa. */
function etapaDeDestino(id: UniqueIdentifier | undefined): Etapa | null {
  const e = String(id ?? "").replace(/^(atajo|barra):/, "");
  return (COLUMNAS_TABLERO as string[]).includes(e) ? (e as Etapa) : null;
}

// Manda lo que está bajo el dedo o el cursor: así sirven las pastillas y la
// barra de abajo, que son chicas. Si no hay nada ahí (el hueco entre dos
// columnas, o el teclado), la columna sobre la que más se encima la tarjeta.
const deteccion: CollisionDetection = args => {
  const bajo = pointerWithin(args);
  return bajo.length ? bajo : rectIntersection(args);
};

/**
 * «hoy», «ayer», «hace 5 días» (por día de México). El número y «días» van con
 * espacio que no se parte (20 nov 2026: en la tarjeta salía «hace 9» arriba y
 * «días» solo abajo).
 */
function haceDias(iso: string, hoy: string): string {
  const d = diffDiasYMD(ymdMX(iso), hoy);
  return d <= 0 ? "hoy" : d === 1 ? "ayer" : `hace ${d}\u00a0días`;
}

/**
 * Leads: el tablero de Nuevo a Perdido. Las tarjetas se arrastran entre
 * columnas (o se mueven desde la ficha); soltar en «Perdido» pide el motivo.
 * 19 nov 2026 (Manolo: «que las etapas aparezcan completas, falta operado y
 * perdido»): Operado y Perdido ya son columnas, con los que se cerraron en los
 * últimos 14 días; los de antes, en «Ver todos».
 */
export default function LeadsClient({ leads: iniciales, tareas = [], tours, responsables, quien, hoy, resenas: resenasIniciales = SIN_RESENAS }: {
  leads: LeadTarjeta[]; tareas?: TareaFila[]; tours: TourOpcion[]; responsables: string[]; quien: string; hoy: string;
  /** La reseña de Google de los Operado de su columna (`resenasDeLeads`). */
  resenas?: Record<string, ResenaLead>;
}) {
  const router = useRouter();
  const [leads, setLeads] = useState(iniciales);
  const [resenas, setResenas] = useState(resenasIniciales);
  const [vista, setVista] = useState<Vista>("pipeline");
  const [q, setQ] = useState("");
  const [canal, setCanal] = useState("");
  const [tour, setTour] = useState("");
  const [responsable, setResponsable] = useState("");
  const [nuevo, setNuevo] = useState(false);
  const [perdiendo, setPerdiendo] = useState<LeadTarjeta | null>(null);
  const [arrastrado, setArrastrado] = useState<LeadTarjeta | null>(null);
  const [msj, setMsj] = useState<{ texto: string; error?: boolean } | null>(null);
  const [ahora] = useState(() => new Date());
  const recienArrastrado = useRef(0);
  const sensores = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );
  // Si llegan datos nuevos del servidor (router.refresh), mandan ellos.
  const [base, setBase] = useState(iniciales);
  if (base !== iniciales) { setBase(iniciales); setLeads(iniciales); }
  const [baseResenas, setBaseResenas] = useState(resenasIniciales);
  if (baseResenas !== resenasIniciales) { setBaseResenas(resenasIniciales); setResenas(resenasIniciales); }

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    const digitos = t.replace(/\D/g, "");
    return leads.filter(l =>
      (!canal || mismoCanal(l.canal, canal)) && (!tour || l.tours.includes(tour)) && (!responsable || l.responsable === responsable) &&
      (!t || l.nombre.toLowerCase().includes(t) || (digitos.length >= 3 && (l.telefono ?? "").includes(digitos))));
  }, [leads, q, canal, tour, responsable]);
  const porEtapa = (e: string) => filtrados.filter(l => l.etapa === e);
  // Operado y Perdido: los cerrados en los últimos 14 días, el más reciente arriba.
  const enColumna = (e: string) => esCerrada(e)
    ? porEtapa(e).filter(l => cerradoHaceMenosDe(l.cerradoEn, ahora, DIAS_TABLERO_CERRADOS)).sort((a, b) => (b.cerradoEn ?? "").localeCompare(a.cerradoEn ?? ""))
    : porEtapa(e);
  const mes = hoy.slice(0, 7);
  // Por el día en que se perdió, en hora de México (antes `updatedAt`, que lo mueve cualquier cambio).
  const motivosMes = contarMotivos(leads.filter(l => l.etapa === "perdido" && ymdMX(l.cerradoEn ?? l.updatedAt).slice(0, 7) === mes).map(l => l.motivoPerdida));

  // Una tarjeta que todavía se está guardando no se vuelve a mover, y si falla
  // solo ELLA regresa a su lugar (antes el respaldo deshacía también otra
  // tarjeta movida bien mientras tanto).
  const guardando = useRef(new Set<string>());
  async function mover(l: LeadTarjeta, etapa: Etapa, motivo?: MotivoPerdida, detalle?: string) {
    if (guardando.current.has(l.id)) return;
    guardando.current.add(l.id);
    const previa = leads.find(x => x.id === l.id) ?? l;
    // Al cerrarlo entra a su columna (que enseña lo cerrado en los últimos días); al reabrirlo, deja de estar cerrado.
    const cerradoEn = esCerrada(etapa) ? new Date().toISOString() : null;
    setLeads(ls => ls.map(x => x.id === l.id ? { ...x, etapa, cerradoEn, motivoPerdida: motivo ? (detalle ? `${motivo}: ${detalle}` : motivo) : null, updatedAt: new Date().toISOString() } : x));
    const r = await fetch(`/api/admin/leads/${l.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accion: "etapa", etapa, motivo, motivoDetalle: detalle }) }).catch(() => null);
    const d = await r?.json().catch(() => null);
    guardando.current.delete(l.id);
    if (!r?.ok) { playError(); setLeads(ls => ls.map(x => x.id === l.id ? previa : x)); setMsj({ texto: d?.error || "No se pudo mover", error: true }); return; }
    playSuccess(); setMsj({ texto: `${l.nombre} → ${etiquetaEtapa(etapa)}` });
    router.refresh();
  }

  function alSoltar(e: DragEndEvent) {
    setArrastrado(null);
    recienArrastrado.current = Date.now();
    const l = leads.find(x => x.id === e.active.id);
    const hacia = etapaDeDestino(e.over?.id);
    if (!l || !hacia || hacia === l.etapa) return;
    if (hacia === "perdido") { setPerdiendo(l); return; }
    // A Operado antes del viaje o con saldo, o sacarlo de Operado o Perdido: se pregunta (19 nov 2026).
    const aviso = avisoAntesDeMover(l, hacia, hoy);
    if (aviso && !window.confirm(aviso)) return;
    void mover(l, hacia);
  }
  const alEmpezar = (e: DragStartEvent) => { playClick(); setArrastrado(leads.find(x => x.id === e.active.id) ?? null); };
  const evitarClicTrasArrastre = (ev: React.MouseEvent) => { if (Date.now() - recienArrastrado.current < 300) ev.preventDefault(); };

  // «Pedir reseña» de una tarjeta Operado: se ve pedida en el momento; si no se pudo anotar, vuelve el botón y se avisa.
  const alPedirResena: PedirResena = (l, r, anotada) => {
    playClick();
    setResenas(m => ({ ...m, [l.id]: conPeticionDelPanel(r, new Date().toISOString(), quien) }));
    void anotada.then(ok => {
      if (ok) { setMsj({ texto: `Se abrió WhatsApp con el mensaje para ${l.nombre}: revísalo y mándalo.` }); return; }
      playError();
      setResenas(m => ({ ...m, [l.id]: r }));
      setMsj({ texto: `Se abrió WhatsApp, pero no se pudo anotar que se le pidió la reseña a ${l.nombre}. Vuelve a intentarlo.`, error: true });
    });
  };

  // «Por cerrar» = lo mismo que cuenta el menú: todavía sin dinero (Nuevo a En seguimiento).
  const porCerrar = leads.filter(l => (ETAPAS_POR_CERRAR as string[]).includes(l.etapa)).length;
  const confirmados = leads.filter(l => l.etapa === "confirmado").length;
  const conteos = Object.fromEntries(COLUMNAS_TABLERO.map(e => [e, enColumna(e).length]));

  return (
    <div className="mx-auto max-w-[1500px] p-4 pb-12 sm:p-6 md:p-8">
      <EncabezadoPagina titulo="Leads" nueva subtitulo={`${porCerrar} por cerrar · ${confirmados} confirmado${confirmados === 1 ? "" : "s"}`}
        acciones={<button type="button" onClick={() => { playClick(); setNuevo(true); }} className={botonPrimario}><Plus className="h-4 w-4" aria-hidden="true" />Nuevo lead</button>} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Vista" className="flex rounded-[var(--panel-radio-sm)] border border-[var(--panel-borde)] bg-white p-0.5">
          {([["pipeline", "Pipeline"], ["perdido", "Perdidos"], ["operado", "Operados"]] as const).map(([v, t]) => (
            <button key={v} role="tab" aria-selected={vista === v} type="button" onClick={() => { playClick(); setVista(v); }}
              className={`panel-foco min-h-[44px] rounded-[6px] px-3 text-[12.5px] font-dm font-medium ${vista === v ? "bg-[var(--panel-tinta)] text-white" : "text-[var(--panel-tinta-media)]"}`}>
              {t}{v !== "pipeline" && ` (${leads.filter(l => l.etapa === v).length})`}
            </button>
          ))}
        </div>
        <label className="relative min-w-[200px] flex-1">
          <span className="sr-only">Buscar por nombre o teléfono</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--panel-tinta-suave)]" aria-hidden="true" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre o teléfono" className={`${inputCls} pl-9`} />
        </label>
        <select aria-label="Canal" value={canal} onChange={e => setCanal(e.target.value)} className={filtroCls}>
          <option value="">Todos los canales</option>{ORIGENES_ELEGIBLES.map(o => <option key={o} value={o}>{canalCorto(o)}</option>)}
        </select>
        <select aria-label="Tour" value={tour} onChange={e => setTour(e.target.value)} className={filtroCls}>
          <option value="">Todos los tours</option>{tours.map(t => <option key={t.slug} value={t.slug}>{t.codigo} · {t.nombre.split(" — ")[0]}</option>)}
        </select>
        <select aria-label="Responsable" value={responsable} onChange={e => setResponsable(e.target.value)} className={filtroCls}>
          <option value="">Todos</option>{responsables.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      {msj && <p role="status" className={`mb-3 text-[13px] font-dm ${msj.error ? "text-[var(--panel-problema)]" : "text-[var(--panel-bien)]"}`}>{msj.texto}</p>}

      {vista === "pipeline" ? (
        leads.length === 0 ? (
          <EstadoVacio titulo="Todavía no hay leads" texto="Cada persona que escribe por WhatsApp, llama o llega al hotel es un lead. Captúralo con «Nuevo lead»: con tour, fecha y personas entra ya como Calificado." />
        ) : (
          <DndContext sensors={sensores} collisionDetection={deteccion} onDragStart={alEmpezar} onDragEnd={alSoltar} onDragCancel={() => setArrastrado(null)}>
            <AtajosEtapas conteos={conteos} arrastrando={!!arrastrado} />
            <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0">
              {COLUMNAS_TABLERO.map(e => (
                <Columna key={e} etapa={e} leads={enColumna(e)} todos={porEtapa(e).length} hoy={hoy} resenas={resenas}
                  onClicTarjeta={evitarClicTrasArrastre} onPedirResena={alPedirResena} onVerTodos={() => { playClick(); setVista(e as Vista); }} />
              ))}
            </div>
            {arrastrado && <BarraRapida />}
            <DragOverlay>{arrastrado ? <Tarjeta l={arrastrado} hoy={hoy} resena={resenas[arrastrado.id]} flotando /> : null}</DragOverlay>
          </DndContext>
        )
      ) : (
        <ListaCerrados leads={filtrados.filter(l => l.etapa === vista)} vista={vista} />
      )}

      {vista === "pipeline" && (
        <SeguimientosUrgentes tareas={tareas.filter(t => !responsable || t.responsable === responsable)} hoy={hoy} responsables={responsables}
          onError={texto => setMsj({ texto, error: true })} />
      )}

      {vista === "pipeline" && (
        <section className="panel-card mt-5 p-4">
          <h2 className="font-cormorant text-[22px] text-[var(--panel-tinta)]">Motivos de pérdida del mes</h2>
          {motivosMes.length === 0 ? <p className="mt-1 text-[13px] font-dm text-[var(--panel-tinta-media)]">Ningún lead perdido este mes.</p> : (
            <div className="mt-3 space-y-2">
              {motivosMes.map(m => (
                <div key={m.clave} className="grid grid-cols-[minmax(0,170px)_minmax(0,1fr)_32px] items-center gap-3 text-[13px] font-dm">
                  <span>{m.etiqueta}</span>
                  <div className="h-5 overflow-hidden rounded bg-[var(--panel-fondo-velo)]"><div className="h-5 rounded bg-[var(--panel-problema)]" style={{ width: `${(m.n / motivosMes[0].n) * 100}%` }} /></div>
                  <span className="panel-cifra text-right">{m.n}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {nuevo && <FormNuevoLead tours={tours} responsables={responsables} quien={quien} onCerrar={() => setNuevo(false)} onCreado={t => { setNuevo(false); setMsj({ texto: t }); }} />}
      {perdiendo && (
        <DialogoPerdido nombre={perdiendo.nombre} onCancelar={() => setPerdiendo(null)}
          onConfirmar={(m, d) => { const l = perdiendo; setPerdiendo(null); void mover(l, "perdido", m, d); }} />
      )}
    </div>
  );
}

/**
 * Arriba del tablero, una pastilla por etapa con cuántos hay (19 nov 2026): con
 * siete columnas no se ven todas, y en el celular menos. Un toque lleva a la
 * columna; mientras se arrastra una tarjeta, soltarla en una pastilla la mueve
 * a esa etapa. Se acomodan en varios renglones: no tapan nada a ningún ancho.
 */
function AtajosEtapas({ conteos, arrastrando }: { conteos: Record<string, number>; arrastrando: boolean }) {
  return (
    <nav aria-label="Ir a una etapa" className="mb-3 flex flex-wrap gap-1.5">
      {COLUMNAS_TABLERO.map(e => <Atajo key={e} etapa={e} n={conteos[e] ?? 0} arrastrando={arrastrando} />)}
    </nav>
  );
}

function Atajo({ etapa, n, arrastrando }: { etapa: Etapa; n: number; arrastrando: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: `atajo:${etapa}` });
  const s = estiloEtapa(etapa);
  const Icono = s.icono;
  const ir = () => { playClick(); document.getElementById(`columna-${etapa}`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "start" }); };
  return (
    <button ref={setNodeRef} type="button" onClick={ir} title={arrastrando ? `Suelta aquí para pasarlo a ${etiquetaEtapa(etapa)}` : `Ir a ${etiquetaEtapa(etapa)}`}
      className={`panel-foco inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-dm font-semibold transition-colors ${arrastrando ? "border-dashed" : ""}`}
      style={{ color: s.color, background: isOver ? s.fondo : "#fff", borderColor: arrastrando || isOver ? s.color : "var(--panel-borde)" }}>
      <Icono className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{etiquetaEtapa(etapa)}<span className="panel-cifra font-normal text-[var(--panel-tinta-suave)]">{n}</span>
    </button>
  );
}

/**
 * Mientras se arrastra, abajo de la pantalla: Operado y Perdido, para soltar
 * sin cruzar las siete columnas (19 nov 2026). Solo aparece con una tarjeta
 * en la mano (nadie está leyendo en ese momento) y se quita al soltarla; la
 * tarjeta que se arrastra va por encima de ella. Sin arrastre no tapa nada.
 */
function BarraRapida() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--panel-borde)] bg-white shadow-[var(--panel-sombra-lg)]">
      <div className="mx-auto flex max-w-md gap-3 px-4 pt-3" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
        <DestinoRapido etapa="operado" />
        <DestinoRapido etapa="perdido" />
      </div>
    </div>
  );
}

function DestinoRapido({ etapa }: { etapa: Etapa }) {
  const { setNodeRef, isOver } = useDroppable({ id: `barra:${etapa}` });
  const s = estiloEtapa(etapa);
  const Icono = s.icono;
  return (
    <div ref={setNodeRef} className="flex min-h-[56px] min-w-0 flex-1 items-center justify-center gap-2 rounded-[var(--panel-radio)] border-2 border-dashed px-3 text-center text-[13px] font-dm font-semibold transition-colors"
      style={{ color: s.color, borderColor: s.color, background: isOver ? s.fondo : "#fff" }}>
      <Icono className="h-4 w-4 shrink-0" aria-hidden="true" /><span className="min-w-0">Soltar en {etiquetaEtapa(etapa)}</span>
    </div>
  );
}

function Columna({ etapa, leads, todos, hoy, resenas, onClicTarjeta, onPedirResena, onVerTodos }: {
  etapa: Etapa; leads: LeadTarjeta[]; todos: number; hoy: string; resenas: Record<string, ResenaLead>;
  onClicTarjeta: (e: React.MouseEvent) => void; onPedirResena: PedirResena; onVerTodos: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: etapa });
  const cerrada = esCerrada(etapa);
  const visibles = cerrada ? leads.slice(0, TOPE_CERRADOS) : leads;
  const total = visibles.reduce((t, l) => t + (l.monto ?? 0), 0);
  const s = estiloEtapa(etapa);
  return (
    <section id={`columna-${etapa}`} ref={setNodeRef} aria-label={etiquetaEtapa(etapa)} style={{ borderTopColor: s.color, borderTopWidth: 3 }}
      className={`flex ${cerrada ? "w-[252px]" : "w-[272px]"} shrink-0 snap-start scroll-ml-4 flex-col rounded-[var(--panel-radio)] border p-2 transition-colors sm:scroll-ml-0 ${isOver ? "border-[var(--panel-acento)] bg-[var(--panel-bien-fondo)]" : "border-[var(--panel-borde)] bg-[var(--panel-fondo-velo)]"}`}>
      <header className="px-1.5 pb-2 pt-1">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="flex min-w-0 items-center gap-1.5 text-[13px] font-dm font-semibold" style={{ color: s.color }}><IconoEtapa etapa={etapa} />{etiquetaEtapa(etapa)} <span className="font-normal text-[var(--panel-tinta-suave)]">{leads.length}</span></h2>
          {total > 0 && <span className="panel-cifra shrink-0 text-[11.5px] font-dm text-[var(--panel-tinta-media)]">{fmx(total)}</span>}
        </div>
        {cerrada && <p className="mt-0.5 text-[11.5px] font-dm text-[var(--panel-tinta-suave)]">Cerrados en los últimos {DIAS_TABLERO_CERRADOS} días</p>}
      </header>
      <div className="flex min-h-[120px] flex-col gap-2">
        {visibles.map(l => <TarjetaArrastrable key={l.id} l={l} hoy={hoy} resena={resenas[l.id]} onClic={onClicTarjeta} onPedirResena={onPedirResena} />)}
        {leads.length === 0 && <p className="px-2 py-6 text-center text-[12px] font-dm text-[var(--panel-tinta-suave)]">{cerrada ? `Nadie en los últimos ${DIAS_TABLERO_CERRADOS} días. Suelta aquí.` : "Suelta aquí"}</p>}
      </div>
      {cerrada && todos > 0 && (
        <button type="button" onClick={onVerTodos}
          className="panel-foco mt-2 inline-flex min-h-[44px] items-center justify-center rounded-[var(--panel-radio-sm)] px-2 text-center text-[12.5px] font-dm font-semibold text-[var(--panel-acento)] hover:underline">
          {leads.length > visibles.length ? `+${leads.length - visibles.length} más · ` : ""}Ver todos ({todos})
        </button>
      )}
    </section>
  );
}

function IconoEtapa({ etapa }: { etapa: string }) {
  const Icono = estiloEtapa(etapa).icono;
  return <Icono className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />;
}

function TarjetaArrastrable({ l, hoy, resena, onClic, onPedirResena }: { l: LeadTarjeta; hoy: string; resena?: ResenaLead; onClic: (e: React.MouseEvent) => void; onPedirResena: PedirResena }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: l.id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={`touch-manipulation ${isDragging ? "opacity-30" : ""}`}>
      <Tarjeta l={l} hoy={hoy} resena={resena} onClic={onClic} onPedirResena={onPedirResena} />
    </div>
  );
}

function Tarjeta({ l, hoy, resena, onClic, onPedirResena, flotando }: {
  l: LeadTarjeta; hoy: string; resena?: ResenaLead; onClic?: (e: React.MouseEvent) => void; onPedirResena?: PedirResena; flotando?: boolean;
}) {
  const router = useRouter();
  const ef = estadoFecha(l.proximoPasoEn, hoy);
  // Toda la tarjeta abre la ficha (Manolo, 3 nov 2026), en cualquier etapa;
  // justo después de un arrastre no (onClic lo cancela).
  const abrir = (e: React.MouseEvent) => { onClic?.(e); if (!e.defaultPrevented && !flotando) router.push(`/admin/leads/${l.id}`); };
  const finViaje = l.ultimoDia ?? l.fechaViaje;
  return (
    <article onClick={abrir} className={`panel-card cursor-pointer p-3 hover:shadow-[var(--panel-sombra)] ${flotando ? "rotate-1 shadow-[var(--panel-sombra-lg)]" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <Link href={`/admin/leads/${l.id}`} onClick={e => { e.stopPropagation(); onClic?.(e); }} className="panel-foco min-w-0 truncate text-[14px] font-dm font-semibold text-[var(--panel-tinta)] hover:underline">{l.nombre}</Link>
        {l.monto ? <span className="panel-cifra shrink-0 text-[12.5px] font-dm text-[var(--panel-tinta)]">{fmx(l.monto)}</span> : null}
      </div>
      {l.tours.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          <BadgesTour slugs={l.tours} />
        </div>
      )}
      <p className="mt-1.5 flex flex-wrap gap-x-2 text-[12px] font-dm text-[var(--panel-tinta-media)]">
        {l.fechaViaje && <span>{fechaCortaM(l.fechaViaje)}</span>}
        {l.pax ? <span>{l.pax} pax</span> : null}
        <span>{canalCorto(l.canal)}</span>
        {l.responsable && <span>· {l.responsable}</span>}
      </p>
      {/* Sin dinero no pasa sola a Operado: con el viaje ya pasado hay que revisarla (¿no llegó o no se anotó el cobro?). */}
      {finViaje && finViaje < hoy && (ETAPAS_POR_CERRAR as string[]).includes(l.etapa) && (
        <p className="mt-1.5 text-[12px] font-dm font-semibold text-[var(--panel-problema)]">Ya pasó la fecha del viaje: ¿se operó o se perdió?</p>
      )}
      {/* Ya confirmado (pagó algo), operado o perdido: el estado de la cotización ya no dice nada. */}
      {l.estadoCotizacion && l.estadoCotizacion !== "aceptada" && !["confirmado", "operado", "perdido"].includes(l.etapa) && (
        <p className={`mt-1.5 flex items-center gap-1 text-[12px] font-dm font-medium ${COLOR_VENCE[l.estadoCotizacion]}`}>
          <FileText className="h-3 w-3 shrink-0" aria-hidden="true" />
          {l.estadoCotizacion === "borrador" ? "Cotización sin enviar" : l.venceCotizacion ? `Cotización: ${etiquetaVence(l.venceCotizacion, hoy)}` : "Cotización enviada"}
        </p>
      )}
      {l.etapa === "confirmado" && <DineroConfirmado cobrado={l.cobrado} saldo={l.saldo} />}
      {l.etapa === "operado" && l.saldo > 0 && <p className="mt-1.5 text-[12px] font-dm font-semibold text-[var(--panel-problema)]">Falta cobrar {fmx(l.saldo)}</p>}
      {/* La cola («· hace 9 días», «· lun 16 de nov») no se parte: si no cabe, baja entera (20 nov 2026). */}
      {l.etapa === "perdido" && (
        <p className="mt-1.5 break-words text-[12px] font-dm text-[var(--panel-problema)]">
          <span className="font-semibold">{etiquetaMotivoPerdida(l.motivoPerdida) || "Sin motivo"}</span>
          {l.cerradoEn ? <>{" "}<span className="whitespace-nowrap">· {haceDias(l.cerradoEn, hoy)}</span></> : null}
        </p>
      )}
      {(l.proximoPaso || l.proximoPasoEn) && (
        <p className={`mt-1.5 text-[12px] font-dm ${COLOR_FECHA[ef]}`}>
          {ef === "vencido" ? "Vencido: " : ef === "hoy" ? "Hoy: " : "→ "}{l.proximoPaso ?? "Seguimiento"}
          {l.proximoPasoEn && ef !== "hoy" ? <>{" "}<span className="whitespace-nowrap">· {fechaCorta(l.proximoPasoEn)}</span></> : null}
        </p>
      )}
      {(l.telefono || (l.etapa === "operado" && resena)) && (
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          {l.telefono && (
            <a href={`https://wa.me/${l.telefono.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" onClick={e => { e.stopPropagation(); onClic?.(e); }}
              className="panel-foco inline-flex min-h-[44px] items-center gap-1 text-[11.5px] font-dm text-[#1f7a4d] hover:underline"><Phone className="h-3 w-3" aria-hidden="true" />WhatsApp</a>
          )}
          {l.etapa === "operado" && resena && <ResenaEnTarjeta l={l} r={resena} onClic={onClic} onPedir={onPedirResena} />}
        </div>
      )}
    </article>
  );
}

/**
 * Confirmado = ya pagó algo (19 nov 2026: «Anticipo pagado» se unió aquí). Lo
 * que falta se ve en la tarjeta para que no se quede sin cobrar. Sin reservas
 * ni dinero (20 nov 2026: la Familia Ledesma, que la migración dejó para
 * revisar a mano) ya no se queda en blanco: «Sin cobro registrado», discreto.
 */
function DineroConfirmado({ cobrado, saldo }: { cobrado: number; saldo: number }) {
  if (cobrado > 0 && saldo > 0) return <p className="mt-1.5 text-[12px] font-dm font-semibold text-[var(--panel-atencion)]">Anticipo {fmx(cobrado)} · falta {fmx(saldo)}</p>;
  if (cobrado > 0) return <p className="mt-1.5 flex items-center gap-1 text-[12px] font-dm font-semibold text-[var(--panel-bien)]"><Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />Pagado</p>;
  if (saldo > 0) return <p className="mt-1.5 text-[12px] font-dm font-semibold text-[var(--panel-problema)]">Sin cobro registrado · falta {fmx(saldo)}</p>;
  return <p className="mt-1.5 text-[12px] font-dm text-[var(--panel-tinta-media)]">Sin cobro registrado</p>;
}

/**
 * En la tarjeta Operado: «Pedir reseña» (abre WhatsApp con el mensaje listo) o
 * cuándo ya se pidió por WhatsApp. Si ya le llegó el correo de la reseña, se ve
 * junto al botón (revisión del 20 nov 2026); y si calificó bajo o ya se le
 * preguntó «¿cómo les fue?», el toque lo pregunta antes (`preguntaAntesDePedir`).
 */
function ResenaEnTarjeta({ l, r, onClic, onPedir }: { l: LeadTarjeta; r: ResenaLead; onClic?: (e: React.MouseEvent) => void; onPedir?: PedirResena }) {
  if (r.porWhatsapp) {
    return (
      <span title={textoPeticion(r.porWhatsapp)} className="inline-flex min-h-[44px] items-center gap-1 text-[11.5px] font-dm font-semibold text-[var(--panel-bien)]">
        <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />Reseña pedida · {diaCortoMX(r.porWhatsapp.en)}
      </span>
    );
  }
  const correo = r.porCorreo && (
    <span title={textoPeticion(r.porCorreo)} className="inline-flex items-center gap-1 text-[11.5px] font-dm text-[var(--panel-tinta-media)]">
      <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />Correo de reseña · {diaCortoMX(r.porCorreo.en)}
    </span>
  );
  if (!r.waUrl) return <>{correo}<span className="inline-flex min-h-[44px] items-center text-[11.5px] font-dm text-[var(--panel-tinta-suave)]">Sin teléfono para la reseña</span></>;
  return (
    <>
      <BotonPedirResena resena={r} texto="Pedir reseña" antes={onClic} onPedida={anotada => onPedir?.(l, r, anotada)}
        className="panel-foco panel-pulsable inline-flex min-h-[44px] items-center gap-1.5 rounded-[var(--panel-radio-sm)] bg-[#1f7a4d] px-3 text-[12.5px] font-dm font-semibold text-white" />
      {correo}
    </>
  );
}

/** Lo vendido de un Operado: lo cobrado más lo que falta de sus reservas vivas (lo mismo que dice su tarjeta); sin reservas, su monto. */
const vendidoDe = (l: LeadTarjeta) => (l.cobrado + l.saldo) || (l.monto ?? 0);

/**
 * «Ver todos» de Perdidos y Operados (revisión del 20 nov 2026). En el celular
 * y la tableta, una tarjeta por lead: la tabla de 720 px pedía deslizar de lado
 * dentro de la tarjeta para ver el motivo y la fecha. La tabla, de `lg` para
 * arriba: con el menú de la izquierda (desde `md`) antes no cabe.
 * El monto solo en Operados: lo vendido y, si falta, lo que falta cobrar (lo de
 * su tarjeta). En Perdidos no va: la tarjeta no trae el total de su cotización
 * y la columna salía en «—» casi en todos.
 */
function ListaCerrados({ leads, vista }: { leads: LeadTarjeta[]; vista: "perdido" | "operado" }) {
  if (leads.length === 0) return <EstadoVacio titulo={vista === "perdido" ? "Sin leads perdidos" : "Sin leads operados"} texto={`Aquí aparecen los de los últimos 4 meses, por el día en que se ${vista === "perdido" ? "perdieron" : "operaron"}.`} />;
  const perdidos = vista === "perdido";
  // El que se cerró más reciente, arriba.
  const orden = [...leads].sort((a, b) => (b.cerradoEn ?? "").localeCompare(a.cerradoEn ?? ""));
  const detalle = (l: LeadTarjeta) => perdidos ? (etiquetaMotivoPerdida(l.motivoPerdida) || "Sin motivo") : canalCorto(l.canal);
  const cerrado = perdidos ? "Se perdió" : "Se operó";
  return (
    <>
      <ul aria-label={perdidos ? "Leads perdidos" : "Leads operados"} className="panel-card divide-y divide-[var(--panel-borde)] overflow-hidden lg:hidden">
        {orden.map(l => {
          const vendido = perdidos ? 0 : vendidoDe(l);
          return (
            <li key={l.id}>
              {/* El contorno del foco va por dentro: la lista recorta lo que sale de sus esquinas. */}
              <Link href={`/admin/leads/${l.id}`} className="panel-foco block px-4 py-3 font-dm hover:bg-[var(--panel-fondo-velo)] focus-visible:-outline-offset-2">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 break-words text-[14px] font-semibold text-[var(--panel-tinta)]">{l.nombre}</span>
                  {vendido > 0 && <span className="panel-cifra shrink-0 text-[13px] font-semibold text-[var(--panel-tinta)]">{fmx(vendido)}</span>}
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-[var(--panel-tinta-media)]">
                  <BadgesTour slugs={l.tours} vacio="Sin tour" />
                  <span className="whitespace-nowrap">Viaje {l.fechaViaje ? fechaCorta(l.fechaViaje) : "sin fecha"}</span>
                </span>
                <span className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[12.5px]">
                  <span className="min-w-0 break-words text-[var(--panel-tinta)]">{detalle(l)}</span>
                  <span className="whitespace-nowrap text-[var(--panel-tinta-media)]">{cerrado} {l.cerradoEn ? fechaCorta(ymdMX(l.cerradoEn)) : "—"}</span>
                </span>
                {!perdidos && l.saldo > 0 && <span className="mt-1 block text-[12.5px] font-semibold text-[var(--panel-problema)]">Falta cobrar {fmx(l.saldo)}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="panel-card hidden overflow-x-auto lg:block">
        <table className="panel-tabla w-full min-w-[720px] text-[13px] font-dm">
          <thead><tr><th className="px-4 py-2 text-left">Cliente</th><th className="px-2 py-2 text-left">Tours</th><th className="px-2 py-2 text-left">Viaje</th>{!perdidos && <th className="px-2 py-2 text-right">Monto</th>}<th className="px-2 py-2 text-left">{perdidos ? "Motivo" : "Canal"}</th><th className="px-4 py-2 text-left">{cerrado}</th></tr></thead>
          <tbody>
            {orden.map(l => {
              const vendido = perdidos ? 0 : vendidoDe(l);
              return (
                <tr key={l.id}>
                  <td className="px-4 py-2"><Link href={`/admin/leads/${l.id}`} className="panel-foco font-medium hover:underline">{l.nombre}</Link></td>
                  <td className="px-2 py-2"><BadgesTour slugs={l.tours} /></td>
                  <td className="whitespace-nowrap px-2 py-2">{fechaCortaM(l.fechaViaje) || "—"}</td>
                  {!perdidos && (
                    <td className="panel-cifra whitespace-nowrap px-2 py-2 text-right">
                      {vendido > 0 ? fmx(vendido) : "—"}
                      {l.saldo > 0 && <span className="block text-[11.5px] font-semibold text-[var(--panel-problema)]">falta {fmx(l.saldo)}</span>}
                    </td>
                  )}
                  <td className="px-2 py-2 text-[var(--panel-tinta-media)]">{detalle(l)}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-[var(--panel-tinta-media)]">{l.cerradoEn ? fechaCortaM(ymdMX(l.cerradoEn)) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

/**
 * Debajo de las etapas, lo más urgente (Manolo, 3 nov 2026): seguimientos
 * vencidos, de hoy y de los próximos 7 días, con hecho y +1 día a la mano.
 */
function SeguimientosUrgentes({ tareas, hoy, responsables, onError }: { tareas: TareaFila[]; hoy: string; responsables: string[]; onError: (t: string) => void }) {
  const router = useRouter();
  const [ocultas, setOcultas] = useState<string[]>([]);
  const hasta = addDaysYMD(hoy, 7);
  const vivas = tareas.filter(t => !ocultas.includes(t.id) && t.vence <= hasta).sort(ordenTareas);
  const grupos = [
    { titulo: "Vencidos", ts: vivas.filter(t => t.vence < hoy), rojo: true },
    { titulo: "Hoy", ts: vivas.filter(t => t.vence === hoy), rojo: false },
    { titulo: "Próximos 7 días", ts: vivas.filter(t => t.vence > hoy), rojo: false },
  ].filter(g => g.ts.length);
  async function cambiar(t: TareaFila, accion: AccionSeguimiento, dias?: number) {
    playClick();
    // Solo «hecho» la quita; pospuesta sigue en la lista con su fecha nueva al refrescar.
    if (accion === "hecha") setOcultas(o => [...o, t.id]);
    const r = await cambiarSeguimiento(t, accion, dias);
    if (r.error) { playError(); setOcultas(o => o.filter(x => x !== t.id)); onError(r.error); return; }
    playSuccess(); router.refresh();
  }
  async function editar(t: TareaFila, e: EdicionSeguimiento) {
    const error = await editarSeguimiento(t.id, e);
    if (error) { playError(); onError(error); return false; }
    playSuccess(); router.refresh();
    return true;
  }
  return (
    <section className="mt-5" aria-label="Seguimientos urgentes">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="font-cormorant text-[24px] text-[var(--panel-tinta)]">Seguimientos · lo más urgente</h2>
        <Link href="/admin/seguimientos" className="panel-foco text-[13px] font-dm font-medium text-[var(--panel-acento)] hover:underline">Ver todos</Link>
      </div>
      {grupos.length === 0 ? (
        <p className="panel-card p-4 text-[13px] font-dm text-[var(--panel-tinta-media)]">Nada pendiente en los próximos 7 días. Agenda el siguiente paso desde la ficha de cada lead.</p>
      ) : (
        <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
          {grupos.map(g => (
            <div key={g.titulo} className="panel-card overflow-hidden">
              <p className={`px-4 pt-3 text-[11px] font-dm font-semibold uppercase tracking-[0.12em] ${g.rojo ? "text-[var(--panel-problema)]" : "text-[var(--panel-tinta-suave)]"}`}>{g.titulo} · {g.ts.length}</p>
              <ul className="divide-y divide-[var(--panel-borde)]">
                {g.ts.slice(0, 8).map(t => <FilaSeguimiento key={t.id} t={t} hoy={hoy} onCambiar={cambiar} onEditar={editar} responsables={responsables} conResponsable />)}
              </ul>
              {g.ts.length > 8 && <Link href="/admin/seguimientos" className="panel-foco block px-4 pb-3 text-[12.5px] font-dm text-[var(--panel-acento)] hover:underline">+{g.ts.length - 8} más</Link>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
