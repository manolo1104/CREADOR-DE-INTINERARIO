"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, Archive, ArrowLeft, CalendarPlus, Check, CheckCheck, Clock, ExternalLink, FileText, Search, Send, Sparkles, UserCheck, UserX, Zap,
} from "lucide-react";
import type { ConversacionFila, DetalleConversacion, EstadoConexion } from "@/lib/admin/bandejaDatos";
import { ETAPAS_PIPELINE, etiquetaEtapa } from "@/lib/admin/crm";
import { haceCuanto } from "@/lib/admin/bandeja";
import { ChipEtapa } from "../leads/etapas";
import { botonPrimario, botonSecundario, canalCorto, fechaCortaM, fmx, inputCls, type TourOpcion } from "../leads/comun";
import { playClick, playError, playSuccess } from "@/lib/admin/sfx";

interface Datos { conversaciones: ConversacionFila[]; detalle: DetalleConversacion | null; conexion: EstadoConexion | null }

const CADA_MS = 4000;
const hora = (iso: string) => new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", timeZone: "America/Mexico_City" });
const dia = (iso: string) => new Date(iso).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Mexico_City" });
const manana = () => new Date(Date.now() + 86400000).toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });

export default function BandejaClient({ inicial, chatInicial, rapidas: rapidasIniciales, quien, tours }: {
  inicial: Datos; chatInicial: string | null; rapidas: string[]; quien: string; tours: TourOpcion[];
}) {
  const [convs, setConvs] = useState(inicial.conversaciones);
  const [detalle, setDetalle] = useState<DetalleConversacion | null>(inicial.detalle);
  const [conexion, setConexion] = useState(inicial.conexion);
  const [abierto, setAbierto] = useState<string | null>(chatInicial);
  const abiertoRef = useRef<string | null>(chatInicial);
  const [vista, setVista] = useState<"lista" | "chat" | "ficha">(chatInicial ? "chat" : "lista");
  const [filtro, setFiltro] = useState<"todas" | "sin-leer" | "no-clientes">("todas");
  const [q, setQ] = useState("");
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [msj, setMsj] = useState<{ texto: string; error?: boolean } | null>(null);
  const [rapidas, setRapidas] = useState(rapidasIniciales);
  const [verRapidas, setVerRapidas] = useState(false);
  const [editandoRapidas, setEditandoRapidas] = useState<string | null>(null);
  const [nota, setNota] = useState("");
  // Copiloto (Fase 4): la propuesta que se está usando y el rechazo con motivo.
  const [propuestaUsada, setPropuestaUsada] = useState<string | null>(null);
  const [pidiendo, setPidiendo] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState<string | null>(null);
  const [ahora, setAhora] = useState(() => new Date());
  const scrollRef = useRef<HTMLDivElement>(null);

  const cargar = useCallback(async () => {
    const id = abiertoRef.current;
    const r = await fetch(`/api/admin/bandeja${id ? `?chat=${encodeURIComponent(id)}` : ""}`, { cache: "no-store" }).catch(() => null);
    if (!r?.ok) return;
    const d = await r.json().catch(() => null);
    if (!d?.ok) return;
    setConvs(d.conversaciones); setConexion(d.conexion); setAhora(new Date());
    if (id && d.detalle?.id === abiertoRef.current) {
      setDetalle(d.detalle);
      // Lo que entra con el chat abierto y a la vista ya se leyó.
      const c = (d.conversaciones as ConversacionFila[]).find(x => x.id === id);
      if (c?.noLeidos && document.visibilityState === "visible") {
        setConvs(cs => cs.map(x => x.id === id ? { ...x, noLeidos: 0 } : x));
        void fetch(`/api/admin/bandeja/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accion: "leida" }) });
      }
    }
  }, []);
  // Se vuelve a pedir cada 4 s mientras la pestaña está a la vista.
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === "visible") void cargar(); }, CADA_MS);
    return () => clearInterval(t);
  }, [cargar]);

  // Al llegar un mensaje nuevo, al fondo (si ya se estaba abajo).
  const nMensajes = detalle?.mensajes.length ?? 0;
  useEffect(() => {
    const el = scrollRef.current;
    if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 240) el.scrollTop = el.scrollHeight;
  }, [nMensajes, abierto]);

  async function abrir(id: string) {
    playClick();
    abiertoRef.current = id; setAbierto(id); setVista("chat"); setMsj(null); setTexto(""); setPropuestaUsada(null); setMotivoRechazo(null);
    setDetalle(d => (d?.id === id ? d : null));
    window.history.replaceState(null, "", `/admin/bandeja?chat=${encodeURIComponent(id)}`);
    const c = convs.find(x => x.id === id);
    if (c?.noLeidos) {
      setConvs(cs => cs.map(x => x.id === id ? { ...x, noLeidos: 0 } : x));
      // Primero se marca leído y DESPUÉS se recarga: si no, la recarga trae el «sin leer» de antes.
      await fetch(`/api/admin/bandeja/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accion: "leida" }) }).catch(() => null);
    }
    await cargar();
    requestAnimationFrame(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; });
  }

  async function enviar() {
    const t = texto.trim();
    if (!t || !abierto || enviando) return;
    setEnviando(true); setMsj(null);
    const r = await fetch(`/api/admin/bandeja/${abierto}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texto: t, propuestaId: propuestaUsada }) }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setEnviando(false);
    if (!r?.ok || !d?.ok) { playError(); setMsj({ texto: d?.error || "No se pudo mandar", error: true }); return; }
    playSuccess(); setTexto(""); setPropuestaUsada(null);
    await cargar();
    requestAnimationFrame(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; });
  }

  async function sugerir() {
    if (!abierto || pidiendo) return;
    setPidiendo(true); setMsj(null);
    const r = await fetch(`/api/admin/bandeja/${abierto}/propuesta`, { method: "POST" }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setPidiendo(false);
    if (!r?.ok) { playError(); setMsj({ texto: d?.error || "El agente no pudo proponer", error: true }); return; }
    playSuccess();
    if (d.propuesta?.urgente) setMsj({ texto: "El agente ve una queja o emergencia: se le avisó a Manolo para que lo atienda una persona.", error: true });
    await cargar();
  }
  async function rechazar() {
    const p = detalle?.propuesta;
    if (!p || !abierto || !motivoRechazo?.trim()) return;
    const r = await fetch(`/api/admin/bandeja/${abierto}/propuesta`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ propuestaId: p.id, motivo: motivoRechazo }) }).catch(() => null);
    const d = await r?.json().catch(() => null);
    if (!r?.ok) { playError(); setMsj({ texto: d?.error || "No se pudo", error: true }); return; }
    playSuccess(); setMotivoRechazo(null); setMsj({ texto: "Propuesta rechazada: el motivo queda para mejorar las siguientes" });
    await cargar();
  }

  async function accion(accion: string, extra: Record<string, unknown> = {}) {
    if (!abierto) return;
    const r = await fetch(`/api/admin/bandeja/${abierto}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accion, ...extra }) }).catch(() => null);
    const d = await r?.json().catch(() => null);
    if (!r?.ok) { playError(); setMsj({ texto: d?.error || "No se pudo", error: true }); return; }
    playSuccess();
    setMsj({ texto: accion === "archivar" ? "Archivado: vuelve solo si escribe otra vez" : accion === "no-es-cliente" ? "Marcado como no cliente: sus mensajes ya no crean leads" : accion === "es-cliente" ? "Marcado como cliente" : "Listo" });
    if (accion === "archivar") { abiertoRef.current = null; setAbierto(null); setDetalle(null); setVista("lista"); window.history.replaceState(null, "", "/admin/bandeja"); }
    await cargar();
  }

  async function lead(cuerpo: Record<string, unknown>, ok: string) {
    if (!detalle?.lead) return false;
    const r = await fetch(`/api/admin/leads/${detalle.lead.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) }).catch(() => null);
    const d = await r?.json().catch(() => null);
    if (!r?.ok) { playError(); setMsj({ texto: d?.error || "No se pudo guardar", error: true }); return false; }
    playSuccess(); setMsj({ texto: ok }); await cargar(); return true;
  }
  async function seguimientoManana() {
    if (!detalle?.lead) return;
    const r = await fetch("/api/admin/tareas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ titulo: "Dar seguimiento por WhatsApp", oportunidadId: detalle.lead.id, vence: manana(), responsable: detalle.lead.responsable || quien }) }).catch(() => null);
    if (!r?.ok) { playError(); setMsj({ texto: "No se pudo agendar", error: true }); return; }
    playSuccess(); setMsj({ texto: `Seguimiento agendado para mañana (${detalle.lead.responsable || quien})` }); await cargar();
  }
  async function guardarRapidas(lista: string) {
    const nuevas = lista.split("\n").map(s => s.trim()).filter(Boolean).slice(0, 40);
    const r = await fetch("/api/admin/bandeja", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rapidas: nuevas }) }).catch(() => null);
    if (!r?.ok) { playError(); setMsj({ texto: "No se pudieron guardar las respuestas rápidas", error: true }); return; }
    playSuccess(); setRapidas(nuevas); setEditandoRapidas(null);
  }

  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase();
    const dig = t.replace(/\D/g, "");
    return convs
      .filter(c => filtro === "sin-leer" ? c.noLeidos > 0 && !c.noEsCliente : filtro === "no-clientes" ? c.noEsCliente : !c.noEsCliente)
      .filter(c => !t || (c.nombre ?? "").toLowerCase().includes(t) || (dig.length >= 3 && (c.telefono ?? "").includes(dig)))
      // Sin leer primero; luego lo más reciente.
      .sort((a, b) => Number(b.noLeidos > 0) - Number(a.noLeidos > 0) || (b.ultimoMensajeEn ?? "").localeCompare(a.ultimoMensajeEn ?? ""));
  }, [convs, filtro, q]);
  const sinLeer = convs.filter(c => c.noLeidos > 0 && !c.noEsCliente).length;
  const titulo = (c: { nombre: string | null; telefono: string | null }) => c.nombre || c.telefono || "Sin nombre";
  const l = detalle?.lead ?? null;
  const tourNombre = (s: string) => tours.find(t => t.slug === s)?.nombre ?? s;

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col md:h-dvh">
      <Conexion conexion={conexion} />
      <div className="grid min-h-0 flex-1 md:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_300px]">
        {/* Lista */}
        <section className={`${vista === "lista" ? "flex" : "hidden"} min-h-0 flex-col border-r border-[var(--panel-borde)] bg-white md:flex`} aria-label="Chats">
          <div className="space-y-2 border-b border-[var(--panel-borde)] p-3">
            <div className="flex items-baseline justify-between">
              <h1 className="font-cormorant text-[26px] text-[var(--panel-tinta)]">Bandeja</h1>
              <span className="text-[12px] font-dm text-[var(--panel-tinta-media)]">{sinLeer ? `${sinLeer} sin leer` : "Al día"}</span>
            </div>
            <label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--panel-tinta-suave)]" aria-hidden="true" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Nombre o teléfono" aria-label="Buscar chat" className={`${inputCls} pl-9`} /></label>
            <div className="flex gap-1.5 text-[12px] font-dm">
              {(["todas", "sin-leer", "no-clientes"] as const).map(f => (
                <button key={f} type="button" onClick={() => setFiltro(f)} aria-pressed={filtro === f}
                  className={`panel-foco rounded-full px-3 py-1.5 ${filtro === f ? "bg-[var(--panel-acento)] text-white" : "bg-[var(--panel-fondo-velo)] text-[var(--panel-tinta-media)]"}`}>
                  {f === "todas" ? "Clientes" : f === "sin-leer" ? `Sin leer${sinLeer ? ` (${sinLeer})` : ""}` : "No clientes"}
                </button>
              ))}
            </div>
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto">
            {visibles.length === 0 && <li className="p-6 text-center text-[13px] font-dm text-[var(--panel-tinta-media)]">{convs.length ? "Nada con ese filtro." : "Todavía no hay chats. Llegan solos en cuanto el número esté vinculado."}</li>}
            {visibles.map(c => {
              const esperando = c.ultimoDe === "cliente" && c.ultimoEntranteEn;
              const minutos = esperando ? (ahora.getTime() - new Date(c.ultimoEntranteEn!).getTime()) / 60000 : 0;
              return (
                <li key={c.id}>
                  <button type="button" onClick={() => void abrir(c.id)} aria-current={abierto === c.id ? "true" : undefined}
                    className={`panel-foco flex w-full gap-3 border-b border-[var(--panel-borde)] px-3 py-3 text-left hover:bg-[var(--panel-fondo-velo)] ${abierto === c.id ? "bg-[var(--panel-fondo-velo)]" : ""}`}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className={`truncate text-[14px] font-dm ${c.noLeidos ? "font-semibold" : "font-medium"} text-[var(--panel-tinta)]`}>{titulo(c)}</p>
                        <span className="shrink-0 text-[11px] font-dm text-[var(--panel-tinta-suave)]">{haceCuanto(c.ultimoMensajeEn, ahora)}</span>
                      </div>
                      <p className="truncate text-[12.5px] font-dm text-[var(--panel-tinta-media)]">{c.ultimoDe === "equipo" ? "Tú: " : ""}{c.ultimoTexto}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {c.lead && <ChipEtapa etapa={c.lead.etapa} />}
                        {esperando && minutos >= 1 && <span className={`text-[11px] font-dm font-semibold ${minutos > 5 ? "text-[var(--panel-problema)]" : "text-[var(--panel-atencion)]"}`}>Sin responder · {haceCuanto(c.ultimoEntranteEn, ahora)}</span>}
                      </div>
                    </div>
                    {c.noLeidos > 0 && <span className="mt-1 h-5 min-w-[20px] shrink-0 rounded-full bg-[#1f7a4d] px-1.5 text-center text-[11px] font-semibold leading-5 text-white" aria-label={`${c.noLeidos} sin leer`}>{c.noLeidos}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Conversación */}
        <section className={`${vista === "chat" ? "flex" : vista === "lista" ? "hidden md:flex" : "hidden xl:flex"} min-h-0 flex-col bg-[var(--panel-fondo)]`} aria-label="Conversación">
          {!abierto ? (
            <div className="m-auto max-w-xs p-6 text-center text-[13px] font-dm text-[var(--panel-tinta-media)]">Elige un chat de la lista. Lo que se conteste aquí sale desde el WhatsApp del negocio.</div>
          ) : !detalle ? (
            <div className="m-auto text-[13px] font-dm text-[var(--panel-tinta-media)]">Cargando…</div>
          ) : (
            <>
              <header className="flex items-center gap-2 border-b border-[var(--panel-borde)] bg-white px-3 py-2">
                <button type="button" onClick={() => setVista("lista")} aria-label="Volver a los chats" className="panel-foco inline-flex h-10 w-10 items-center justify-center rounded-full md:hidden"><ArrowLeft className="h-5 w-5" aria-hidden="true" /></button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-dm font-semibold text-[var(--panel-tinta)]">{titulo(detalle)}</p>
                  <p className="truncate text-[12px] font-dm text-[var(--panel-tinta-media)]">{detalle.telefono ?? "Teléfono por confirmar"}{detalle.noEsCliente ? " · no es cliente" : ""}</p>
                </div>
                <button type="button" onClick={() => setVista("ficha")} className={`${botonSecundario} min-h-[36px] px-3 xl:hidden`}>Lead</button>
                <button type="button" onClick={() => void accion("archivar")} title="Archivar" aria-label="Archivar chat" className="panel-foco inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--panel-tinta-media)] hover:bg-[var(--panel-fondo-velo)]"><Archive className="h-4 w-4" aria-hidden="true" /></button>
              </header>
              <div ref={scrollRef} className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 py-3 sm:px-6">
                {detalle.mensajes.map((m, i) => {
                  const nuevoDia = i === 0 || dia(detalle.mensajes[i - 1].fecha) !== dia(m.fecha);
                  const sale = m.direccion === "sale";
                  return (
                    <div key={m.id}>
                      {nuevoDia && <p className="my-3 text-center text-[11px] font-dm font-medium capitalize text-[var(--panel-tinta-suave)]">{dia(m.fecha)}</p>}
                      <div className={`flex ${sale ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] rounded-[12px] px-3 py-2 text-[14px] font-dm leading-snug shadow-sm sm:max-w-[70%] ${sale ? "rounded-br-[4px] bg-[#dcf3e3] text-[#13281d]" : "rounded-bl-[4px] bg-white text-[var(--panel-tinta)]"}`}>
                          {m.tipo !== "texto" && <p className="text-[12px] font-semibold text-[var(--panel-tinta-media)]">{({ imagen: "📷 Foto", audio: "🎤 Audio", video: "🎬 Video", documento: "📄 Documento", ubicacion: "📍 Ubicación", sticker: "Sticker" } as Record<string, string>)[m.tipo] ?? "Archivo"}{m.texto ? "" : " (ábrelo en el celular)"}</p>}
                          {m.texto && <p className="whitespace-pre-wrap break-words">{m.texto}</p>}
                          <p className="mt-0.5 flex items-center justify-end gap-1 text-[10.5px] text-[var(--panel-tinta-suave)]">
                            {sale && <span>{m.enviadoDesde === "app" ? "celular" : m.enviadoDesde === "panel" ? (m.enviadoPor ?? "panel") : m.enviadoDesde}</span>}
                            <span>{hora(m.fecha)}</span>
                            {sale && <Tic estado={m.estado} />}
                          </p>
                          {m.estado === "fallo" && (
                            <p className="mt-1 text-[11.5px] text-[var(--panel-problema)]">{m.error || "No salió."} <button type="button" onClick={() => void accion("reintentar", { mensajeId: m.id })} className="panel-foco font-semibold underline">Reintentar</button></p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-[var(--panel-borde)] bg-white p-2 sm:p-3">
                {msj && <p role="status" className={`mb-1.5 text-[12.5px] font-dm ${msj.error ? "text-[var(--panel-problema)]" : "text-[var(--panel-bien)]"}`}>{msj.texto}</p>}
                {detalle.propuesta && (
                  <div className="mb-2 rounded-[var(--panel-radio-sm)] border border-[#c9b8f0] bg-[#f6f2ff] p-2.5 text-[13px] font-dm">
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#5b3fa8]"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" />{detalle.propuesta.tipo === "confirmacion" ? "Confirmación de 48 h lista" : "Propuesta del agente"}</p>
                    <p className="mt-1 whitespace-pre-wrap text-[var(--panel-tinta)]">{detalle.propuesta.borrador}</p>
                    {(detalle.propuesta.razon || detalle.propuesta.faltaDato) && <p className="mt-1 text-[11.5px] text-[var(--panel-tinta-media)]">{detalle.propuesta.razon}{detalle.propuesta.faltaDato ? ` · Falta: ${detalle.propuesta.faltaDato}` : ""}</p>}
                    {motivoRechazo === null ? (
                      <div className="mt-2 flex gap-2">
                        <button type="button" onClick={() => { setTexto(detalle.propuesta!.borrador); setPropuestaUsada(detalle.propuesta!.id); }} className={`${botonPrimario} min-h-[36px]`}>Usar (puedes editarla)</button>
                        <button type="button" onClick={() => setMotivoRechazo("")} className={`${botonSecundario} min-h-[36px]`}>No sirve</button>
                      </div>
                    ) : (
                      <form className="mt-2 flex gap-2" onSubmit={e => { e.preventDefault(); void rechazar(); }}>
                        <input autoFocus value={motivoRechazo} onChange={e => setMotivoRechazo(e.target.value)} placeholder="¿Por qué no sirve? (precio mal, tono, falta algo…)" aria-label="Motivo del rechazo" className={`${inputCls} py-1.5`} />
                        <button type="submit" disabled={!motivoRechazo.trim()} className={`${botonSecundario} min-h-[36px]`}>Rechazar</button>
                      </form>
                    )}
                  </div>
                )}
                {verRapidas && (
                  <div className="mb-2 max-h-48 overflow-y-auto rounded-[var(--panel-radio-sm)] border border-[var(--panel-borde)] bg-white p-2">
                    {editandoRapidas !== null ? (
                      <div className="space-y-2">
                        <textarea value={editandoRapidas} onChange={e => setEditandoRapidas(e.target.value)} rows={5} className={inputCls} aria-label="Respuestas rápidas, una por renglón" placeholder="Una respuesta por renglón" />
                        <div className="flex gap-2"><button type="button" onClick={() => void guardarRapidas(editandoRapidas)} className={botonPrimario}>Guardar</button><button type="button" onClick={() => setEditandoRapidas(null)} className={botonSecundario}>Cancelar</button></div>
                      </div>
                    ) : (
                      <>
                        {rapidas.length === 0 && <p className="p-1 text-[12.5px] font-dm text-[var(--panel-tinta-media)]">Aún no hay respuestas rápidas. Agrega las del manual de ventas.</p>}
                        {rapidas.map((r, i) => <button key={i} type="button" onClick={() => { setTexto(t => (t ? `${t}\n${r}` : r)); setVerRapidas(false); }} className="panel-foco block w-full truncate rounded px-2 py-1.5 text-left text-[13px] font-dm hover:bg-[var(--panel-fondo-velo)]">{r}</button>)}
                        <button type="button" onClick={() => setEditandoRapidas(rapidas.join("\n"))} className="panel-foco mt-1 px-2 text-[12px] font-dm font-semibold text-[var(--panel-acento)] hover:underline">Editar respuestas rápidas</button>
                      </>
                    )}
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <button type="button" onClick={() => void sugerir()} disabled={pidiendo} aria-label="Sugerir respuesta con el agente" title="Sugerir respuesta (agente)" className="panel-foco inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#c9b8f0] text-[#5b3fa8] disabled:opacity-50">{pidiendo ? <Clock className="h-4 w-4 animate-pulse" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}</button>
                  <button type="button" onClick={() => setVerRapidas(v => !v)} aria-label="Respuestas rápidas" title="Respuestas rápidas" className="panel-foco inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--panel-borde)] text-[var(--panel-tinta-media)]"><Zap className="h-4 w-4" aria-hidden="true" /></button>
                  <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={1} aria-label="Escribe un mensaje" placeholder="Escribe un mensaje"
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void enviar(); } }}
                    className={`${inputCls} max-h-40 min-h-[44px] resize-none`} />
                  <button type="button" onClick={() => void enviar()} disabled={!texto.trim() || enviando} aria-label="Enviar" className="panel-foco inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--panel-acento)] text-white disabled:opacity-40"><Send className="h-4 w-4" aria-hidden="true" /></button>
                </div>
                <p className="mt-1 hidden text-[11px] font-dm text-[var(--panel-tinta-suave)] sm:block">Enter manda · Shift + Enter cambia de renglón · sale desde el WhatsApp del negocio</p>
              </div>
            </>
          )}
        </section>

        {/* El lead */}
        <aside className={`${vista === "ficha" ? "block" : "hidden"} min-h-0 overflow-y-auto border-l border-[var(--panel-borde)] bg-white p-4 xl:block`} aria-label="Lead">
          <button type="button" onClick={() => setVista("chat")} className="panel-foco mb-2 inline-flex items-center gap-1 text-[12.5px] font-dm text-[var(--panel-tinta-media)] xl:hidden"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Volver al chat</button>
          {!detalle ? <p className="text-[13px] font-dm text-[var(--panel-tinta-media)]">Aquí aparece el lead del chat abierto.</p> : detalle.noEsCliente ? (
            <div className="space-y-3 text-[13px] font-dm text-[var(--panel-tinta-media)]">
              <p>Este chat está marcado como <strong>no cliente</strong>: sus mensajes no crean leads.</p>
              <button type="button" onClick={() => void accion("es-cliente")} className={botonSecundario}><UserCheck className="h-4 w-4" aria-hidden="true" />Sí es cliente</button>
            </div>
          ) : !l ? (
            <div className="space-y-3 text-[13px] font-dm text-[var(--panel-tinta-media)]">
              <p>Sin lead todavía (nace con el primer mensaje del cliente).</p>
              <button type="button" onClick={() => void accion("es-cliente")} className={botonSecundario}>Crear lead</button>
              <button type="button" onClick={() => void accion("no-es-cliente")} className={botonSecundario}><UserX className="h-4 w-4" aria-hidden="true" />No es cliente</button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="font-cormorant text-[22px] leading-tight text-[var(--panel-tinta)]">{l.nombre}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2"><ChipEtapa etapa={l.etapa} /><span className="text-[12px] font-dm text-[var(--panel-tinta-media)]">{canalCorto(l.canal)}</span></div>
              </div>
              <label className="block text-[11px] font-dm uppercase tracking-[0.12em] text-[var(--panel-tinta-suave)]">Mover a
                <select value={ETAPAS_PIPELINE.includes(l.etapa as never) ? l.etapa : ""} onChange={e => void lead({ accion: "etapa", etapa: e.target.value }, `Ahora: ${etiquetaEtapa(e.target.value)}`)} className={`${inputCls} mt-1 normal-case tracking-normal`}>
                  {!ETAPAS_PIPELINE.includes(l.etapa as never) && <option value="">{etiquetaEtapa(l.etapa)}</option>}
                  {ETAPAS_PIPELINE.map(e => <option key={e} value={e}>{etiquetaEtapa(e)}</option>)}
                </select></label>
              <dl className="space-y-1 text-[13px] font-dm">
                <Dato k="Tours" v={l.tours.length ? l.tours.map(tourNombre).join(", ") : "—"} />
                <Dato k="Fecha" v={l.fechaViaje ? fechaCortaM(l.fechaViaje) ?? "—" : "—"} />
                <Dato k="Personas" v={l.pax ? String(l.pax) : "—"} />
                <Dato k="Monto" v={l.monto ? fmx(l.monto) : "—"} />
                <Dato k="Responsable" v={l.responsable ?? "—"} />
              </dl>
              {l.tareas.length > 0 && (
                <div><p className="text-[11px] font-dm uppercase tracking-[0.12em] text-[var(--panel-tinta-suave)]">Seguimientos</p>
                  <ul className="mt-1 space-y-1 text-[12.5px] font-dm text-[var(--panel-tinta)]">{l.tareas.map(t => <li key={t.id}>{fechaCortaM(t.vence)}{t.hora ? ` ${t.hora}` : ""} · {t.titulo}</li>)}</ul></div>
              )}
              <div className="grid gap-2">
                <Link href={`/admin/leads/${l.id}`} className={botonSecundario}><ExternalLink className="h-4 w-4" aria-hidden="true" />Abrir ficha</Link>
                <Link href={`/admin/cotizaciones?nueva=1&lead=${l.id}`} className={botonSecundario}><FileText className="h-4 w-4" aria-hidden="true" />Nueva cotización</Link>
                <button type="button" onClick={() => void seguimientoManana()} className={botonSecundario}><CalendarPlus className="h-4 w-4" aria-hidden="true" />Seguimiento mañana</button>
              </div>
              <form onSubmit={async e => { e.preventDefault(); if (nota.trim() && await lead({ accion: "nota", texto: nota }, "Nota guardada")) setNota(""); }} className="space-y-2">
                <textarea value={nota} onChange={e => setNota(e.target.value)} rows={2} placeholder="Nota rápida al lead" aria-label="Nota rápida al lead" className={inputCls} />
                <button type="submit" disabled={!nota.trim()} className={`${botonSecundario} w-full`}>Guardar nota</button>
              </form>
              <button type="button" onClick={() => { if (window.confirm("¿Marcar este chat como NO cliente? Sus mensajes ya no crearán leads.")) void accion("no-es-cliente"); }} className="panel-foco inline-flex items-center gap-1 text-[12px] font-dm text-[var(--panel-tinta-media)] hover:underline"><UserX className="h-3.5 w-3.5" aria-hidden="true" />No es cliente (proveedor, amigo…)</button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Dato({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-3"><dt className="text-[var(--panel-tinta-media)]">{k}</dt><dd className="text-right text-[var(--panel-tinta)]">{v}</dd></div>;
}

function Tic({ estado }: { estado: string }) {
  if (estado === "pendiente" || estado === "enviando") return <Clock className="h-3 w-3" aria-label="Enviando" />;
  if (estado === "fallo") return <AlertTriangle className="h-3 w-3 text-[var(--panel-problema)]" aria-label="No salió" />;
  if (estado === "leido") return <CheckCheck className="h-3.5 w-3.5 text-[#2b8ad8]" aria-label="Leído" />;
  if (estado === "entregado") return <CheckCheck className="h-3.5 w-3.5" aria-label="Entregado" />;
  return <Check className="h-3.5 w-3.5" aria-label="Enviado" />;
}

/** Arriba de la Bandeja: si el número no está vinculado, cómo vincularlo (el QR solo lo ven Manolo y Martín). */
function Conexion({ conexion }: { conexion: EstadoConexion | null }) {
  if (conexion?.estado === "conectado") {
    const viejo = Date.now() - new Date(conexion.en).getTime() > 10 * 60_000;
    return viejo ? <p className="bg-[var(--panel-atencion-fondo)] px-4 py-1.5 text-[12px] font-dm text-[var(--panel-atencion)]">El puente de WhatsApp no da señales desde hace {haceCuanto(conexion.en)}: revisa que esté encendido en Railway.</p> : null;
  }
  if (conexion?.estado === "qr") {
    return (
      <div className="flex flex-wrap items-center gap-4 border-b border-[var(--panel-borde)] bg-white px-4 py-3">
        {conexion.qr ? <img src={conexion.qr} alt="Código QR para vincular el WhatsApp del negocio" width={160} height={160} className="rounded bg-white" /> : null}
        <div className="max-w-md text-[13px] font-dm text-[var(--panel-tinta)]">
          <p className="font-semibold">Vincula el WhatsApp del negocio</p>
          <p className="text-[var(--panel-tinta-media)]">{conexion.qr ? "En el celular del negocio: WhatsApp → ⋮ → Dispositivos vinculados → Vincular un dispositivo, y escanea este código. El celular sigue funcionando igual." : "Hay un código para vincular el número: pídele a Manolo o a Martín que lo escaneen desde aquí."}</p>
        </div>
      </div>
    );
  }
  return (
    <p className="border-b border-[var(--panel-borde)] bg-[var(--panel-fondo-velo)] px-4 py-2 text-[12.5px] font-dm text-[var(--panel-tinta-media)]">
      {conexion?.estado === "desconectado" ? `WhatsApp desconectado${conexion.detalle ? ` (${conexion.detalle})` : ""}: el puente pedirá un código nuevo.` : conexion?.estado === "iniciando" ? "Conectando con WhatsApp…" : "La Bandeja todavía no está conectada al WhatsApp del negocio: falta encender el puente."}
    </p>
  );
}
