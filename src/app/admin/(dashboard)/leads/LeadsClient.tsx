"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus, Search, Phone } from "lucide-react";
import {
  DndContext, DragOverlay, KeyboardSensor, MouseSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import type { LeadTarjeta, TareaFila } from "@/lib/admin/crmDatos";
import { ETAPAS_PIPELINE, contarMotivos, estadoFecha, etiquetaEtapa, etiquetaMotivoPerdida, ordenTareas, type Etapa, type MotivoPerdida } from "@/lib/admin/crm";
import { addDaysYMD } from "@/lib/dates";
import { estiloEtapa } from "./etapas";
import { etiquetaVence } from "@/lib/vencimientoCotizacion";
import { COLOR_VENCE } from "./comun";
import { FilaSeguimiento, cambiarSeguimiento, editarSeguimiento, type AccionSeguimiento, type EdicionSeguimiento } from "../seguimientos/FilaSeguimiento";
import { ORIGENES_ELEGIBLES, mismoCanal } from "@/lib/origenReserva";
import { colorDeTour, codigoDeTour } from "@/lib/admin/coloresTour";
import { playClick, playError, playSuccess } from "@/lib/admin/sfx";
import { EncabezadoPagina } from "@/components/admin/ui/EncabezadoPagina";
import { EstadoVacio } from "@/components/admin/ui/EstadoVacio";
import { FormNuevoLead } from "./FormNuevoLead";
import { DialogoPerdido } from "./MotivoPerdida";
import { COLOR_FECHA, botonPrimario, canalCorto, fechaCorta, fechaCortaM, fmx, inputCls, type TourOpcion } from "./comun";

// Los filtros van a lo ancho de su texto (no `inputCls`, que estira a todo el renglón).
const filtroCls = "min-h-[44px] rounded-[var(--panel-radio-sm)] border border-[var(--panel-borde)] bg-white px-3 text-[16px] font-dm text-[var(--panel-tinta)] panel-foco sm:text-[14px]";

type Vista = "pipeline" | "perdido" | "operado";

/**
 * Leads (Fase 2): el pipeline de Nuevo a Confirmado. Las tarjetas se
 * arrastran entre columnas (o se mueven desde la ficha); soltar en «Perdido»
 * pide el motivo. Perdidos y Operados van en vistas aparte.
 */
export default function LeadsClient({ leads: iniciales, tareas = [], tours, responsables, quien, hoy }: {
  leads: LeadTarjeta[]; tareas?: TareaFila[]; tours: TourOpcion[]; responsables: string[]; quien: string; hoy: string;
}) {
  const router = useRouter();
  const [leads, setLeads] = useState(iniciales);
  const [vista, setVista] = useState<Vista>("pipeline");
  const [q, setQ] = useState("");
  const [canal, setCanal] = useState("");
  const [tour, setTour] = useState("");
  const [responsable, setResponsable] = useState("");
  const [nuevo, setNuevo] = useState(false);
  const [perdiendo, setPerdiendo] = useState<LeadTarjeta | null>(null);
  const [arrastrado, setArrastrado] = useState<LeadTarjeta | null>(null);
  const [msj, setMsj] = useState<{ texto: string; error?: boolean } | null>(null);
  const recienArrastrado = useRef(0);
  const sensores = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );
  // Si llegan datos nuevos del servidor (router.refresh), mandan ellos.
  const [base, setBase] = useState(iniciales);
  if (base !== iniciales) { setBase(iniciales); setLeads(iniciales); }

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    const digitos = t.replace(/\D/g, "");
    return leads.filter(l =>
      (!canal || mismoCanal(l.canal, canal)) && (!tour || l.tours.includes(tour)) && (!responsable || l.responsable === responsable) &&
      (!t || l.nombre.toLowerCase().includes(t) || (digitos.length >= 3 && (l.telefono ?? "").includes(digitos))));
  }, [leads, q, canal, tour, responsable]);
  const porEtapa = (e: string) => filtrados.filter(l => l.etapa === e);
  const mes = hoy.slice(0, 7);
  const motivosMes = contarMotivos(leads.filter(l => l.etapa === "perdido" && l.updatedAt.slice(0, 7) === mes).map(l => l.motivoPerdida));

  async function mover(l: LeadTarjeta, etapa: Etapa, motivo?: MotivoPerdida, detalle?: string) {
    const antes = leads;
    setLeads(ls => ls.map(x => x.id === l.id ? { ...x, etapa, motivoPerdida: motivo ? (detalle ? `${motivo}: ${detalle}` : motivo) : null, updatedAt: new Date().toISOString() } : x));
    const r = await fetch(`/api/admin/leads/${l.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accion: "etapa", etapa, motivo, motivoDetalle: detalle }) }).catch(() => null);
    const d = await r?.json().catch(() => null);
    if (!r?.ok) { playError(); setLeads(antes); setMsj({ texto: d?.error || "No se pudo mover", error: true }); return; }
    playSuccess(); setMsj({ texto: `${l.nombre} → ${etiquetaEtapa(etapa)}` });
    router.refresh();
  }

  function alSoltar(e: DragEndEvent) {
    setArrastrado(null);
    recienArrastrado.current = Date.now();
    const l = leads.find(x => x.id === e.active.id);
    const hacia = e.over?.id as string | undefined;
    if (!l || !hacia || hacia === l.etapa) return;
    if (hacia === "perdido") { setPerdiendo(l); return; }
    void mover(l, hacia as Etapa);
  }
  const alEmpezar = (e: DragStartEvent) => { playClick(); setArrastrado(leads.find(x => x.id === e.active.id) ?? null); };
  const evitarClicTrasArrastre = (ev: React.MouseEvent) => { if (Date.now() - recienArrastrado.current < 300) ev.preventDefault(); };

  // «Por cerrar» = lo mismo que cuenta el menú: abiertos que todavía no confirman.
  const porCerrar = leads.filter(l => (ETAPAS_PIPELINE as string[]).includes(l.etapa) && l.etapa !== "confirmado").length;
  const confirmados = leads.filter(l => l.etapa === "confirmado").length;

  return (
    <div className="mx-auto max-w-[1500px] p-4 pb-12 sm:p-6 md:p-8">
      <EncabezadoPagina titulo="Leads" nueva subtitulo={`${porCerrar} por cerrar · ${confirmados} confirmado${confirmados === 1 ? "" : "s"}`}
        acciones={<button type="button" onClick={() => { playClick(); setNuevo(true); }} className={botonPrimario}><Plus className="h-4 w-4" aria-hidden="true" />Nuevo lead</button>} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Vista" className="flex rounded-[var(--panel-radio-sm)] border border-[var(--panel-borde)] bg-white p-0.5">
          {([["pipeline", "Pipeline"], ["perdido", "Perdidos"], ["operado", "Operados"]] as const).map(([v, t]) => (
            <button key={v} role="tab" aria-selected={vista === v} type="button" onClick={() => { playClick(); setVista(v); }}
              className={`panel-foco min-h-[36px] rounded-[6px] px-3 text-[12.5px] font-dm font-medium ${vista === v ? "bg-[var(--panel-tinta)] text-white" : "text-[var(--panel-tinta-media)]"}`}>
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
          <DndContext sensors={sensores} onDragStart={alEmpezar} onDragEnd={alSoltar} onDragCancel={() => setArrastrado(null)}>
            <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:px-0">
              {ETAPAS_PIPELINE.map(e => (
                <Columna key={e} etapa={e} leads={porEtapa(e)} hoy={hoy} onClicTarjeta={evitarClicTrasArrastre} />
              ))}
              <ZonaPerdido activa={!!arrastrado} />
            </div>
            <DragOverlay>{arrastrado ? <Tarjeta l={arrastrado} hoy={hoy} flotando /> : null}</DragOverlay>
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
                <div key={m.clave} className="grid grid-cols-[170px_minmax(0,1fr)_32px] items-center gap-3 text-[13px] font-dm">
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

function Columna({ etapa, leads, hoy, onClicTarjeta }: { etapa: Etapa; leads: LeadTarjeta[]; hoy: string; onClicTarjeta: (e: React.MouseEvent) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: etapa });
  const total = leads.reduce((t, l) => t + (l.monto ?? 0), 0);
  return (
    <section ref={setNodeRef} aria-label={etiquetaEtapa(etapa)} style={{ borderTopColor: estiloEtapa(etapa).color, borderTopWidth: 3 }}
      className={`flex w-[272px] shrink-0 snap-start flex-col rounded-[var(--panel-radio)] border p-2 transition-colors ${isOver ? "border-[var(--panel-acento)] bg-[var(--panel-bien-fondo)]" : "border-[var(--panel-borde)] bg-[var(--panel-fondo-velo)]"}`}>
      <header className="flex items-baseline justify-between px-1.5 pb-2 pt-1">
        <h2 className="flex items-center gap-1.5 text-[13px] font-dm font-semibold" style={{ color: estiloEtapa(etapa).color }}><IconoEtapa etapa={etapa} />{etiquetaEtapa(etapa)} <span className="font-normal text-[var(--panel-tinta-suave)]">{leads.length}</span></h2>
        {total > 0 && <span className="panel-cifra text-[11.5px] font-dm text-[var(--panel-tinta-media)]">{fmx(total)}</span>}
      </header>
      <div className="flex min-h-[120px] flex-col gap-2">
        {leads.map(l => <TarjetaArrastrable key={l.id} l={l} hoy={hoy} onClic={onClicTarjeta} />)}
        {leads.length === 0 && <p className="px-2 py-6 text-center text-[12px] font-dm text-[var(--panel-tinta-suave)]">Suelta aquí</p>}
      </div>
    </section>
  );
}

function IconoEtapa({ etapa }: { etapa: string }) {
  const Icono = estiloEtapa(etapa).icono;
  return <Icono className="h-3.5 w-3.5" aria-hidden="true" />;
}

function ZonaPerdido({ activa }: { activa: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: "perdido" });
  return (
    <div ref={setNodeRef} aria-label="Marcar perdido"
      className={`flex w-[160px] shrink-0 items-center justify-center rounded-[var(--panel-radio)] border-2 border-dashed p-3 text-center text-[12.5px] font-dm transition-opacity ${activa ? "opacity-100" : "opacity-40"} ${isOver ? "border-[var(--panel-problema)] bg-[var(--panel-problema-fondo)] text-[var(--panel-problema)]" : "border-[var(--panel-borde-fuerte)] text-[var(--panel-tinta-media)]"}`}>
      Suelta aquí para marcar perdido
    </div>
  );
}

function TarjetaArrastrable({ l, hoy, onClic }: { l: LeadTarjeta; hoy: string; onClic: (e: React.MouseEvent) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: l.id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={`touch-manipulation ${isDragging ? "opacity-30" : ""}`}>
      <Tarjeta l={l} hoy={hoy} onClic={onClic} />
    </div>
  );
}

function Tarjeta({ l, hoy, onClic, flotando }: { l: LeadTarjeta; hoy: string; onClic?: (e: React.MouseEvent) => void; flotando?: boolean }) {
  const router = useRouter();
  const ef = estadoFecha(l.proximoPasoEn, hoy);
  // Toda la tarjeta abre la ficha (Manolo, 3 nov 2026), en cualquier etapa;
  // justo después de un arrastre no (onClic lo cancela).
  const abrir = (e: React.MouseEvent) => { onClic?.(e); if (!e.defaultPrevented && !flotando) router.push(`/admin/leads/${l.id}`); };
  return (
    <article onClick={abrir} className={`panel-card cursor-pointer p-3 hover:shadow-[var(--panel-sombra)] ${flotando ? "rotate-1 shadow-[var(--panel-sombra-lg)]" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <Link href={`/admin/leads/${l.id}`} onClick={e => { e.stopPropagation(); onClic?.(e); }} className="panel-foco min-w-0 truncate text-[14px] font-dm font-semibold text-[var(--panel-tinta)] hover:underline">{l.nombre}</Link>
        {l.monto ? <span className="panel-cifra shrink-0 text-[12.5px] font-dm text-[var(--panel-tinta)]">{fmx(l.monto)}</span> : null}
      </div>
      {l.tours.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {l.tours.map(t => <span key={t} className="rounded px-1.5 py-0.5 text-[10.5px] font-dm font-bold" style={{ color: colorDeTour(t), background: colorDeTour(t) + "1f" }}>{codigoDeTour(t)}</span>)}
        </div>
      )}
      <p className="mt-1.5 flex flex-wrap gap-x-2 text-[12px] font-dm text-[var(--panel-tinta-media)]">
        {l.fechaViaje && <span>{fechaCortaM(l.fechaViaje)}</span>}
        {l.pax ? <span>{l.pax} pax</span> : null}
        <span>{canalCorto(l.canal)}</span>
        {l.responsable && <span>· {l.responsable}</span>}
      </p>
      {/* Antes de Anticipo pagado no se mueve solo: sin pago registrado hay que revisarlo (¿no llegó o no se anotó el cobro?). */}
      {l.fechaViaje && l.fechaViaje < hoy && ["nuevo", "calificado", "cotizado", "seguimiento"].includes(l.etapa) && (
        <p className="mt-1.5 text-[12px] font-dm font-semibold text-[var(--panel-problema)]">Ya pasó la fecha del viaje: ¿se operó o se perdió?</p>
      )}
      {/* Con anticipo o ya confirmado manda la reserva: el estado de la cotización ya no dice nada. */}
      {l.estadoCotizacion && l.estadoCotizacion !== "aceptada" && !["anticipo", "confirmado", "operado"].includes(l.etapa) && (
        <p className={`mt-1.5 flex items-center gap-1 text-[12px] font-dm font-medium ${COLOR_VENCE[l.estadoCotizacion]}`}>
          <FileText className="h-3 w-3" aria-hidden="true" />
          {l.estadoCotizacion === "borrador" ? "Cotización sin enviar" : l.venceCotizacion ? `Cotización: ${etiquetaVence(l.venceCotizacion, hoy)}` : "Cotización enviada"}
        </p>
      )}
      {(l.proximoPaso || l.proximoPasoEn) && (
        <p className={`mt-1.5 text-[12px] font-dm ${COLOR_FECHA[ef]}`}>
          {ef === "vencido" ? "Vencido: " : ef === "hoy" ? "Hoy: " : "→ "}{l.proximoPaso ?? "Seguimiento"}{l.proximoPasoEn && ef !== "hoy" ? ` · ${fechaCorta(l.proximoPasoEn)}` : ""}
        </p>
      )}
      {l.telefono && (
        <a href={`https://wa.me/${l.telefono.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" onClick={e => { e.stopPropagation(); onClic?.(e); }}
          className="panel-foco mt-1 inline-flex items-center gap-1 text-[11.5px] font-dm text-[#1f7a4d] hover:underline"><Phone className="h-3 w-3" aria-hidden="true" />WhatsApp</a>
      )}
    </article>
  );
}

function ListaCerrados({ leads, vista }: { leads: LeadTarjeta[]; vista: "perdido" | "operado" }) {
  if (leads.length === 0) return <EstadoVacio titulo={vista === "perdido" ? "Sin leads perdidos" : "Sin leads operados"} texto="Aquí aparecen los de los últimos 4 meses." />;
  return (
    <div className="panel-card overflow-x-auto">
      <table className="panel-tabla w-full min-w-[640px] text-[13px] font-dm">
        <thead><tr><th className="px-4 py-2 text-left">Cliente</th><th className="px-2 py-2 text-left">Tours</th><th className="px-2 py-2 text-left">Viaje</th><th className="px-2 py-2 text-right">Monto</th><th className="px-4 py-2 text-left">{vista === "perdido" ? "Motivo" : "Canal"}</th></tr></thead>
        <tbody>
          {leads.map(l => (
            <tr key={l.id}>
              <td className="px-4 py-2"><Link href={`/admin/leads/${l.id}`} className="panel-foco font-medium hover:underline">{l.nombre}</Link></td>
              <td className="px-2 py-2">{l.tours.map(t => codigoDeTour(t)).join(" · ") || "—"}</td>
              <td className="px-2 py-2">{fechaCortaM(l.fechaViaje) || "—"}</td>
              <td className="panel-cifra px-2 py-2 text-right">{l.monto ? fmx(l.monto) : "—"}</td>
              <td className="px-4 py-2 text-[var(--panel-tinta-media)]">{vista === "perdido" ? etiquetaMotivoPerdida(l.motivoPerdida) : canalCorto(l.canal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
    setOcultas(o => [...o, t.id]);
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
        <div className="grid gap-3 lg:grid-cols-3">
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
