"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, Mail, Check, Clock, FileText, BookOpen, StickyNote, ArrowRight } from "lucide-react";
import type { FichaLead } from "@/lib/admin/crmDatos";
import { ETAPAS, PERFILES, estadoFecha, etiquetaEtapa, etiquetaMotivoPerdida, type Etapa, type MotivoPerdida } from "@/lib/admin/crm";
import { ORIGENES_ELEGIBLES, ORIGEN_ETIQUETA } from "@/lib/origenReserva";
import { colorDeTour } from "@/lib/admin/coloresTour";
import { playClick, playError, playSuccess } from "@/lib/admin/sfx";
import { ChipEstado } from "@/components/admin/ui/ChipEstado";
import { DialogoPerdido } from "../MotivoPerdida";
import { COLOR_FECHA, botonPrimario, botonSecundario, etiquetaCls, fechaCorta, fmx, inputCls, type TourOpcion } from "../comun";

const fHora = (iso: string) => new Date(iso).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).replace(/\./g, "");
const ANTICIPO = 0.3;

/** La ficha de un lead: etapas, datos, acciones e historial unificado. */
export default function FichaLeadClient({ ficha: f, tours, responsables, hoy }: { ficha: FichaLead; tours: TourOpcion[]; responsables: string[]; hoy: string }) {
  const router = useRouter();
  const [d, setD] = useState({
    nombre: f.contacto.nombre, telefono: f.contacto.telefono ?? "", correo: f.contacto.correo ?? "", idioma: f.contacto.idioma,
    canal: f.canal, tours: f.tours, fechaViaje: f.fechaViaje ?? "", pax: f.pax?.toString() ?? "", perfil: f.perfil ?? "",
    quiereHospedaje: !!f.quiereHospedaje, monto: f.monto?.toString() ?? "", responsable: f.responsable ?? "",
    proximoPaso: f.proximoPaso ?? "", proximoPasoEn: f.proximoPasoEn ?? "",
  });
  const [nota, setNota] = useState("");
  // El próximo seguimiento: por omisión a Erick (él atiende el WhatsApp) salvo que el lead tenga responsable.
  const porOmision = f.responsable && responsables.includes(f.responsable) ? f.responsable : responsables.find(r => r === "Erick") ?? responsables[0] ?? "";
  const [tarea, setTarea] = useState({ titulo: "", responsable: porOmision, vence: hoy, hora: "" });
  const siguiente = f.tareas.find(t => t.estado !== "hecha");
  const [folio, setFolio] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [msj, setMsj] = useState<{ texto: string; error?: boolean } | null>(null);
  const [perdiendo, setPerdiendo] = useState(false);

  async function llamar(url: string, metodo: string, cuerpo: unknown, que: string, ok: string) {
    setOcupado(que); setMsj(null);
    try {
      const r = await fetch(url, { method: metodo, headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.ok) { playError(); setMsj({ texto: j?.error || "No se pudo guardar", error: true }); return false; }
      playSuccess(); setMsj({ texto: ok }); router.refresh(); return true;
    } catch { playError(); setMsj({ texto: "No se pudo guardar", error: true }); return false; }
    finally { setOcupado(null); }
  }
  const lead = (cuerpo: Record<string, unknown>, que: string, ok: string) => llamar(`/api/admin/leads/${f.id}`, "PATCH", cuerpo, que, ok);
  const set = (k: keyof typeof d) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setD(x => ({ ...x, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));

  function moverA(e: Etapa) {
    if (e === f.etapa) return;
    playClick();
    if (e === "perdido") { setPerdiendo(true); return; }
    void lead({ accion: "etapa", etapa: e }, "etapa", `Ahora está en ${etiquetaEtapa(e)}`);
  }
  const monto = Number(d.monto) || 0;

  // Historial unificado: cambios de etapa, notas, tareas, cotizaciones y reservas.
  const eventos = [
    ...f.historial.map(h => ({ en: h.en, icono: ArrowRight, texto: h.anterior ? `${etiquetaEtapa(h.anterior)} → ${etiquetaEtapa(h.nueva)}` : `Entró como ${etiquetaEtapa(h.nueva)}`, quien: h.por })),
    ...f.notas.map(n => ({ en: n.en, icono: StickyNote, texto: n.texto, quien: n.autor })),
    ...f.tareas.map(t => ({ en: t.en, icono: Clock, texto: `Seguimiento: ${t.titulo} (vence ${fechaCorta(t.vence)})${t.estado === "hecha" ? " · hecho" : ""}`, quien: t.responsable })),
    ...f.cotizaciones.map(c => ({ en: c.en, icono: FileText, texto: `Cotización ${c.folio} · ${fmx(c.total)} · ${c.status}`, quien: "" })),
    ...f.reservas.map(r => ({ en: r.en, icono: BookOpen, texto: `Reserva ${r.folio} · ${fmx(r.total)} · cobrado ${fmx(r.cobrado)}`, quien: "" })),
  ].sort((a, b) => b.en.localeCompare(a.en));
  const etapaVisible = ETAPAS.filter(e => e.clave !== "perdido");

  return (
    <div className="mt-3">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div>
          <h1 className="font-cormorant text-[34px] font-medium leading-[1.1] text-[var(--panel-tinta)]">{f.contacto.nombre}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] font-dm text-[var(--panel-tinta-media)]">
            {f.contacto.telefono && <a href={`https://wa.me/${f.contacto.telefono.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="panel-foco inline-flex items-center gap-1 font-medium text-[#1f7a4d] hover:underline"><Phone className="h-3.5 w-3.5" aria-hidden="true" />{f.contacto.telefono}</a>}
            {f.contacto.correo && <a href={`mailto:${f.contacto.correo}`} className="panel-foco inline-flex items-center gap-1 hover:underline"><Mail className="h-3.5 w-3.5" aria-hidden="true" />{f.contacto.correo}</a>}
            <span>Capturado por {f.creadoPor ?? "—"} · {fHora(f.createdAt)}</span>
          </p>
        </div>
        {siguiente && (
          <p className={`order-last w-full text-[13px] font-dm ${COLOR_FECHA[estadoFecha(siguiente.vence, hoy)]}`}>
            Próximo seguimiento: <strong>{siguiente.titulo}</strong> · <span className="capitalize">{fechaCorta(siguiente.vence)}</span>{siguiente.hora ? ` ${siguiente.hora}` : ""} · {siguiente.responsable}
          </p>
        )}
        {f.etapa === "perdido"
          ? <ChipEstado tono="problema">Perdido · {etiquetaMotivoPerdida(f.motivoPerdida)}</ChipEstado>
          : <ChipEstado tono={f.etapa === "confirmado" || f.etapa === "operado" ? "bien" : "neutro"}>{etiquetaEtapa(f.etapa)}</ChipEstado>}
      </header>

      {/* Barra de etapas: un toque mueve; Perdido pide el motivo. */}
      <nav aria-label="Etapa" className="-mx-4 mb-5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ol className="flex min-w-max gap-1">
          {etapaVisible.map(e => {
            const actual = f.etapa === e.clave;
            return (
              <li key={e.clave}>
                <button type="button" onClick={() => moverA(e.clave)} disabled={!!ocupado} aria-current={actual ? "step" : undefined}
                  className={`panel-foco min-h-[40px] rounded-[var(--panel-radio-sm)] px-3 text-[12.5px] font-dm font-medium ${actual ? "bg-[var(--panel-acento)] text-white" : "border border-[var(--panel-borde)] bg-white text-[var(--panel-tinta-media)] hover:text-[var(--panel-tinta)]"}`}>
                  {e.etiqueta}
                </button>
              </li>
            );
          })}
          <li><button type="button" onClick={() => moverA("perdido")} disabled={!!ocupado || f.etapa === "perdido"}
            className="panel-foco min-h-[40px] rounded-[var(--panel-radio-sm)] border border-[var(--panel-problema)] bg-white px-3 text-[12.5px] font-dm font-medium text-[var(--panel-problema)] disabled:opacity-40">Perdido</button></li>
        </ol>
      </nav>
      {msj && <p role="status" className={`mb-3 text-[13px] font-dm ${msj.error ? "text-[var(--panel-problema)]" : "text-[var(--panel-bien)]"}`}>{msj.texto}</p>}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <form className="panel-card space-y-3 p-4" onSubmit={e => { e.preventDefault(); void lead({ accion: "editar", ...d, pax: d.pax || null, monto: d.monto || null, fechaViaje: d.fechaViaje || null, proximoPasoEn: d.proximoPasoEn || null, perfil: d.perfil || null }, "editar", "Datos guardados"); }}>
          <h2 className="font-cormorant text-[22px] text-[var(--panel-tinta)]">Datos</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={etiquetaCls}>Nombre<input value={d.nombre} onChange={set("nombre")} className={`${inputCls} mt-1 normal-case tracking-normal`} /></label>
            <label className={etiquetaCls}>Teléfono<input type="tel" value={d.telefono} onChange={set("telefono")} className={`${inputCls} mt-1 normal-case tracking-normal`} /></label>
            <label className={etiquetaCls}>Correo<input type="email" value={d.correo} onChange={set("correo")} className={`${inputCls} mt-1 normal-case tracking-normal`} /></label>
            <label className={etiquetaCls}>Idioma<select value={d.idioma} onChange={set("idioma")} className={`${inputCls} mt-1 normal-case tracking-normal`}><option value="es">Español</option><option value="en">Inglés</option></select></label>
            <label className={etiquetaCls}>Canal<select value={d.canal} onChange={set("canal")} className={`${inputCls} mt-1 normal-case tracking-normal`}>{ORIGENES_ELEGIBLES.map(o => <option key={o} value={o}>{ORIGEN_ETIQUETA[o].split(" (")[0]}</option>)}{!ORIGENES_ELEGIBLES.includes(d.canal as never) && <option value={d.canal}>{(ORIGEN_ETIQUETA[d.canal as keyof typeof ORIGEN_ETIQUETA] ?? d.canal).split(" (")[0]}</option>}</select></label>
            <label className={etiquetaCls}>Responsable<select value={d.responsable} onChange={set("responsable")} className={`${inputCls} mt-1 normal-case tracking-normal`}><option value="">—</option>{responsables.map(r => <option key={r} value={r}>{r}</option>)}</select></label>
          </div>
          <fieldset>
            <legend className={etiquetaCls}>Tours</legend>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {tours.map(t => {
                const on = d.tours.includes(t.slug);
                return <button key={t.slug} type="button" aria-pressed={on} title={t.nombre} onClick={() => setD(x => ({ ...x, tours: on ? x.tours.filter(s => s !== t.slug) : [...x.tours, t.slug] }))}
                  className={`panel-foco min-h-[36px] rounded-full border px-3 text-[12px] font-dm font-semibold ${on ? "text-white" : "bg-white"}`}
                  style={on ? { background: colorDeTour(t.slug), borderColor: colorDeTour(t.slug) } : { color: colorDeTour(t.slug), borderColor: colorDeTour(t.slug) + "66" }}>{t.codigo}</button>;
              })}
            </div>
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className={etiquetaCls}>Fecha del viaje<input type="date" value={d.fechaViaje} onChange={set("fechaViaje")} className={`${inputCls} mt-1`} /></label>
            <label className={etiquetaCls}>Personas<input type="number" min={1} value={d.pax} onChange={set("pax")} className={`${inputCls} mt-1`} /></label>
            <label className={etiquetaCls}>Perfil<select value={d.perfil} onChange={set("perfil")} className={`${inputCls} mt-1 normal-case tracking-normal`}><option value="">—</option>{PERFILES.map(p => <option key={p.clave} value={p.clave}>{p.etiqueta}</option>)}</select></label>
            <label className={etiquetaCls}>Monto ($)<input type="number" min={0} value={d.monto} onChange={set("monto")} className={`${inputCls} mt-1`} /></label>
            <div className={etiquetaCls}>Anticipo 30 %<p className="panel-cifra mt-1 py-2.5 text-[16px] normal-case tracking-normal text-[var(--panel-tinta)]">{monto ? fmx(Math.round(monto * ANTICIPO)) : "—"}</p></div>
            <label className="flex min-h-[44px] items-end gap-2 pb-2 text-[13px] font-dm text-[var(--panel-tinta)]"><input type="checkbox" checked={d.quiereHospedaje} onChange={set("quiereHospedaje")} className="h-5 w-5 accent-[var(--panel-acento)]" />Quiere hospedaje</label>
          </div>
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
            <label className={etiquetaCls}>Próximo paso<input value={d.proximoPaso} onChange={set("proximoPaso")} className={`${inputCls} mt-1 normal-case tracking-normal`} /></label>
            <label className={etiquetaCls}>Para<input type="date" value={d.proximoPasoEn} onChange={set("proximoPasoEn")} className={`${inputCls} mt-1`} /></label>
          </div>
          <button type="submit" disabled={!!ocupado} className={botonPrimario}>{ocupado === "editar" ? "Guardando…" : "Guardar datos"}</button>
        </form>

        <div className="space-y-5">
          <section className="panel-card space-y-4 p-4">
            <h2 className="font-cormorant text-[22px] text-[var(--panel-tinta)]">Acciones</h2>
            <form className="rounded-[var(--panel-radio-sm)] bg-[var(--panel-atencion-fondo)] p-3" onSubmit={async e => { e.preventDefault(); if (await llamar("/api/admin/tareas", "POST", { ...tarea, hora: tarea.hora || null, oportunidadId: f.id }, "tarea", `Seguimiento agendado: a ${tarea.responsable} le llegará el recordatorio`)) setTarea(t => ({ ...t, titulo: "", hora: "" })); }}>
              <label className={etiquetaCls}>Agendar próximo seguimiento<input value={tarea.titulo} onChange={e => setTarea(t => ({ ...t, titulo: e.target.value }))} className={`${inputCls} mt-1 normal-case tracking-normal`} placeholder="Ej. preguntar si ya decidió la fecha" /></label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <input aria-label="Día" type="date" value={tarea.vence} onChange={e => setTarea(t => ({ ...t, vence: e.target.value }))} className={inputCls} />
                <input aria-label="Hora" type="time" value={tarea.hora} onChange={e => setTarea(t => ({ ...t, hora: e.target.value }))} className={inputCls} />
                <select aria-label="Responsable" value={tarea.responsable} onChange={e => setTarea(t => ({ ...t, responsable: e.target.value }))} className={inputCls}>{responsables.map(r => <option key={r} value={r}>{r}</option>)}</select>
              </div>
              <button type="submit" disabled={!tarea.titulo.trim() || !!ocupado} className={`${botonPrimario} mt-2`}>Agendar y avisar</button>
              <p className="mt-1 text-[11.5px] font-dm text-[#4A3A12]">Le llega un correo a esa hora (sin hora, a primera hora del día) y un aviso en el panel.</p>
            </form>
            <div className="flex flex-wrap gap-2">
              {f.contacto.telefono && <a href={`https://wa.me/${f.contacto.telefono.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className={botonSecundario}><Phone className="h-4 w-4" aria-hidden="true" />Abrir WhatsApp</a>}
              <Link href="/admin/cotizaciones" className={botonSecundario}><FileText className="h-4 w-4" aria-hidden="true" />Nueva cotización</Link>
            </div>
            <form onSubmit={async e => { e.preventDefault(); if (await lead({ accion: "nota", texto: nota }, "nota", "Nota agregada")) setNota(""); }}>
              <label className={etiquetaCls}>Nota<textarea rows={2} value={nota} onChange={e => setNota(e.target.value)} className={`${inputCls} mt-1 normal-case tracking-normal`} placeholder="Lo hablado por llamada, lo que pidió…" /></label>
              <button type="submit" disabled={!nota.trim() || !!ocupado} className={`${botonSecundario} mt-2`}>Agregar nota</button>
            </form>
            <form onSubmit={async e => { e.preventDefault(); if (await lead({ accion: "vincular", folio }, "vincular", `Se enlazó ${folio.toUpperCase()}`)) setFolio(""); }}>
              <label className={etiquetaCls}>Enlazar cotización o reserva<input value={folio} onChange={e => setFolio(e.target.value)} className={`${inputCls} mt-1 normal-case tracking-normal`} placeholder="COT-… o HP-M-…" /></label>
              <button type="submit" disabled={!folio.trim() || !!ocupado} className={`${botonSecundario} mt-2`}>Enlazar</button>
              <p className="mt-1 text-[11.5px] font-dm text-[var(--panel-tinta-suave)]">Con cotización pasa a Cotizado; con reserva pagada, a Confirmado.</p>
            </form>
          </section>

          {f.tareas.length > 0 && (
            <section className="panel-card p-4">
              <h2 className="font-cormorant text-[22px] text-[var(--panel-tinta)]">Seguimientos</h2>
              <ul className="mt-2 divide-y divide-[var(--panel-borde)]">
                {f.tareas.map(t => {
                  const ef = estadoFecha(t.vence, hoy);
                  return (
                    <li key={t.id} className="flex items-center gap-2 py-2">
                      <button type="button" aria-label={t.estado === "hecha" ? "Reabrir" : "Marcar hecha"} disabled={!!ocupado}
                        onClick={() => void llamar(`/api/admin/tareas/${t.id}`, "PATCH", { accion: t.estado === "hecha" ? "reabrir" : "hecha" }, "t", "Listo")}
                        className={`panel-foco flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${t.estado === "hecha" ? "border-[var(--panel-bien)] bg-[var(--panel-bien)] text-white" : "border-[var(--panel-borde-fuerte)]"}`}><Check className="h-4 w-4" aria-hidden="true" /></button>
                      <span className={`flex-1 text-[13px] font-dm ${t.estado === "hecha" ? "text-[var(--panel-tinta-suave)] line-through" : "text-[var(--panel-tinta)]"}`}>{t.titulo}<span className="block text-[11.5px] text-[var(--panel-tinta-media)]">{t.responsable}</span></span>
                      {t.estado !== "hecha" && <span className={`text-[12px] font-dm capitalize ${COLOR_FECHA[ef]}`}>{ef === "vencido" ? "Vencida " : ""}{fechaCorta(t.vence)}{t.hora ? ` ${t.hora}` : ""}</span>}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {(f.cotizaciones.length > 0 || f.reservas.length > 0 || f.otras.length > 0) && (
            <section className="panel-card p-4 text-[13px] font-dm">
              <h2 className="font-cormorant text-[22px] text-[var(--panel-tinta)]">Enlazado</h2>
              <ul className="mt-2 space-y-1.5">
                {f.cotizaciones.map(c => <li key={c.id}><span className="font-mono text-[12px]">{c.folio}</span> · {c.tour} · {fmx(c.total)} · <span className="text-[var(--panel-tinta-media)]">{c.status}</span></li>)}
                {f.reservas.map(r => <li key={r.id}><span className="font-mono text-[12px]">{r.folio}</span> · {r.tour} · {fmx(r.total)} · <span className="text-[var(--panel-tinta-media)]">cobrado {fmx(r.cobrado)}</span></li>)}
                {f.otras.map(o => <li key={o.id}><Link href={`/admin/leads/${o.id}`} className="panel-foco hover:underline">Otro lead de esta persona</Link> · {etiquetaEtapa(o.etapa)} · {fHora(o.createdAt)}</li>)}
              </ul>
            </section>
          )}
        </div>
      </div>

      <section className="panel-card mt-5 p-4">
        <h2 className="font-cormorant text-[22px] text-[var(--panel-tinta)]">Historial</h2>
        <ol className="mt-3 space-y-3">
          {eventos.map((ev, i) => (
            <li key={i} className="flex gap-3">
              <ev.icono className="mt-0.5 h-4 w-4 shrink-0 text-[var(--panel-tinta-suave)]" aria-hidden="true" />
              <div className="min-w-0 text-[13px] font-dm">
                <p className="whitespace-pre-line text-[var(--panel-tinta)]">{ev.texto}</p>
                <p className="text-[11.5px] text-[var(--panel-tinta-suave)]">{fHora(ev.en)}{ev.quien ? ` · ${ev.quien}` : ""}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {perdiendo && (
        <DialogoPerdido nombre={f.contacto.nombre} onCancelar={() => setPerdiendo(false)}
          onConfirmar={(m: MotivoPerdida, det: string) => { setPerdiendo(false); void lead({ accion: "etapa", etapa: "perdido", motivo: m, motivoDetalle: det }, "etapa", "Marcado como perdido"); }} />
      )}
    </div>
  );
}
