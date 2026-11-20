"use client";
import { codigoDeTour } from "@/lib/admin/coloresTour";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Users, CalendarDays, Wallet, Hotel, UtensilsCrossed, Tag, Languages, EyeOff, Phone, Mail, MailCheck, MailWarning, Check, Clock, FileText, BookOpen, StickyNote, Pencil, ChevronDown, ArrowRight, Plus, Banknote, Eye, Repeat2, Star, Trash2, type LucideIcon } from "lucide-react";
import type { FichaLead } from "@/lib/admin/crmDatos";
import { ETIQUETA_CANAL } from "@/lib/admin/analisisComun";
import { ETAPAS, PERFILES, estadoFecha, etapaSiguiente, etiquetaEtapa, etiquetaMotivoPerdida, normalizarEtapa, type Etapa, type MotivoPerdida } from "@/lib/admin/crm";
import { ORIGENES_ELEGIBLES } from "@/lib/origenReserva";
import { colorDeTour } from "@/lib/admin/coloresTour";
import { addDaysYMD, diffDiasYMD } from "@/lib/dates";
import { etiquetaVence } from "@/lib/vencimientoCotizacion";
import { playClick, playError, playSuccess } from "@/lib/admin/sfx";
import { marcaPerdido } from "@/lib/cotizaciones/marcaPerdido";
import { ChipPerdido } from "@/components/admin/CotizacionDetalle";
import { AvisoFlotante } from "@/components/admin/AvisoFlotante";
import {
  confirmacionPendiente, preguntaAntesDeMandar, sePuedeMandarConfirmacion, textoConfirmacion,
  type ConfirmacionDeReserva, type EstadoConfirmacion,
} from "@/lib/admin/confirmacionReserva";
import { avisosResena, conPeticionDelPanel, textoPeticion, type ResenaLead } from "@/lib/admin/resenaLead";
import { DialogoPerdido } from "../MotivoPerdida";
import { BadgesTour, BotonPedirResena, ChipEtapa, avisoAntesDeMover, estiloEtapa } from "../etapas";
import { EditorSeguimiento, type EdicionSeguimiento } from "../../seguimientos/FilaSeguimiento";
import { COLOR_FECHA, COLOR_VENCE, botonPrimario, botonSecundario, canalCorto, etiquetaCls, fechaCorta, fechaCortaM, fmx, inputCls, type TourOpcion } from "../comun";

const TZ = "America/Mexico_City";
const fHora = (iso: string) => new Date(iso).toLocaleString("es-MX", { timeZone: TZ, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).replace(/\./g, "");
const soloHora = (iso: string) => new Date(iso).toLocaleTimeString("es-MX", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const diaMX = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ });
const ANTICIPO = 0.3;

const ESTADO_COT: Record<string, { texto: string; color: string }> = {
  borrador: { texto: "Borrador", color: "#6B6F6C" }, enviada: { texto: "Enviada", color: "#A2650F" },
  aceptada: { texto: "Ya es reserva", color: "#1B4332" }, expirada: { texto: "Vencida", color: "#B42318" }, archivada: { texto: "Archivada", color: "#6B6F6C" },
};
/**
 * El estado de una reserva en su renglón, por el dinero que ya se ve ahí
 * (revisión del 20 nov 2026): una con anticipo decía «Pendiente de pago» en
 * ámbar justo abajo de un lead Confirmado. Cancelada y borrador, como son.
 */
function estadoReserva(status: string, cobrado: number, saldo: number): { texto: string; color: string } {
  if (status === "cancelled") return { texto: "Cancelada", color: "#B42318" };
  if (status === "borrador") return { texto: "Borrador", color: "#6B6F6C" };
  if (status !== "paid" && status !== "pending") return { texto: status, color: "#6B6F6C" };
  if (saldo <= 0) return { texto: "Pagada", color: "#1B4332" };
  if (cobrado > 0) return { texto: `Anticipo pagado · falta ${fmx(saldo)}`, color: "#A2650F" };
  // «Sin cobro registrado», como la tarjeta del tablero: en las reservas viejas
  // capturadas a mano pudo entrar dinero que nadie anotó (ver dinero.ts).
  return { texto: "Sin cobro registrado", color: "#A2650F" };
}

/** El renglón de la confirmación por correo de cada reserva: ámbar si falta, verde si ya salió, gris si no se sabe. */
const ESTILO_CONF: Partial<Record<EstadoConfirmacion, { cls: string; Icono: LucideIcon }>> = {
  falta:        { cls: "bg-[var(--panel-atencion-fondo)] text-[var(--panel-atencion)]", Icono: MailWarning },
  "sin-correo": { cls: "bg-[var(--panel-atencion-fondo)] text-[var(--panel-atencion)]", Icono: MailWarning },
  enviada:      { cls: "bg-[var(--panel-bien-fondo)] text-[var(--panel-bien)]", Icono: MailCheck },
  "sin-dato":   { cls: "bg-[var(--panel-fondo-velo)] text-[var(--panel-tinta-media)]", Icono: Mail },
};

/** El verde del WhatsApp del panel, con texto blanco que se lee (5.6:1). */
const botonWhatsapp = "panel-foco panel-pulsable inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[var(--panel-radio-sm)] bg-[#1f7a4d] px-4 text-[13px] font-dm font-semibold text-white";
const botonPeligro = "panel-foco panel-pulsable inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[var(--panel-radio-sm)] border border-[var(--panel-borde)] bg-white px-4 text-[13px] font-dm font-medium text-[var(--panel-problema)] hover:bg-[var(--panel-problema-fondo)] disabled:opacity-50";

/** Lo que viene del servidor y se puede editar en «Datos». Si cambia allá (p. ej. al editar la cotización), el formulario se pone al día. */
function datosDe(f: FichaLead) {
  return {
    nombre: f.contacto.nombre, telefono: f.contacto.telefono ?? "", correo: f.contacto.correo ?? "", idioma: f.contacto.idioma,
    canal: f.canal, tours: f.tours, fechaViaje: f.fechaViaje ?? "", pax: f.pax?.toString() ?? "", perfil: f.perfil ?? "",
    quiereHospedaje: !!f.quiereHospedaje, monto: f.monto?.toString() ?? "", responsable: f.responsable ?? "",
    proximoPaso: f.proximoPaso ?? "", proximoPasoEn: f.proximoPasoEn ?? "",
  };
}

/**
 * La ficha de un lead: etapa, datos, cotizaciones y reservaciones, seguimientos e historial por día.
 * 19 nov 2026: eliminar una cotización desde aquí, la marca «Perdido» en sus
 * cotizaciones, «Falta mandar la confirmación por correo» con su botón, y
 * «Pedir reseña por WhatsApp» cuando ya se operó.
 */
export default function FichaLeadClient({ ficha: f, tours, responsables, hoy, quien = "", confirmaciones = [], resena = null, puedeBorrarCotizaciones = false, reservasDeCotizaciones = {} }: {
  ficha: FichaLead; tours: TourOpcion[]; responsables: string[]; hoy: string;
  /** Quién tiene la sesión: la reseña recién pedida dice quién la pidió, igual que al recargar. */
  quien?: string;
  /** La confirmación por correo de cada reserva (`confirmacionesDelLead`). */
  confirmaciones?: ConfirmacionDeReserva[];
  /** La reseña de Google, solo si está en Operado y ya viajó (`resenaDelLead`). */
  resena?: ResenaLead | null;
  /** Quien tiene la pestaña Cotizaciones puede eliminarlas (su API la exige). */
  puedeBorrarCotizaciones?: boolean;
  /** Cotización → folio de su reserva viva: esas no se eliminan. */
  reservasDeCotizaciones?: Record<string, string>;
}) {
  const router = useRouter();
  const [d, setD] = useState(() => datosDe(f));
  const firma = JSON.stringify(datosDe(f));
  const [firmaBase, setFirmaBase] = useState(firma);
  const [recienGuardado, setRecienGuardado] = useState(false);
  if (firma !== firmaBase) {
    // Lo que se está escribiendo en «Datos» no se pierde porque otra acción
    // (agendar, +1 día, enlazar) refresque la ficha (revisión del 4 nov 2026).
    const sucio = JSON.stringify(d) !== firmaBase;
    setFirmaBase(firma);
    if (!sucio || recienGuardado) { setD(datosDe(f)); setRecienGuardado(false); }
  }

  const [nota, setNota] = useState("");
  // El próximo seguimiento: por omisión a Erick (él atiende el WhatsApp) salvo que el lead tenga responsable.
  const porOmision = f.responsable && responsables.includes(f.responsable) ? f.responsable : responsables.find(r => r === "Erick") ?? responsables[0] ?? "";
  const [tarea, setTarea] = useState({ titulo: "", responsable: porOmision, vence: hoy, hora: "" });
  const siguiente = f.tareas.find(t => t.estado !== "hecha");
  const [folio, setFolio] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [msj, setMsj] = useState<{ texto: string; error?: boolean } | null>(null);
  // El aviso flota abajo, a la vista (20 nov 2026): arriba de la página no se
  // veía en el teléfono (el error de «Eliminar» quedaba 263 px fuera de la
  // pantalla). Se va solo a los 10 s, o a los 15 si fue un error.
  useEffect(() => {
    if (!msj) return;
    const reloj = setTimeout(() => setMsj(null), msj.error ? 15000 : 10000);
    return () => clearTimeout(reloj);
  }, [msj]);
  const [perdiendo, setPerdiendo] = useState(false);
  const [menuEtapa, setMenuEtapa] = useState(false);
  const [editandoTarea, setEditandoTarea] = useState<string | null>(null);
  // Las que el servidor dijo que ya son reserva al intentar eliminarlas (409).
  const [esReservaAhora, setEsReservaAhora] = useState<Record<string, string>>({});
  const confirmacionDe = new Map(confirmaciones.map(c => [c.reservaId, c]));
  // «Falta mandar la confirmación por correo» (19 nov 2026, Manolo: «que en el perfil del lead marque si hace falta»).
  const pendientesConf = confirmaciones.filter(c => confirmacionPendiente(c.estado));
  const [pestana, setPestana] = useState<"cotizaciones" | "reservas">(
    pendientesConf.length || (f.reservas.length && !f.cotizaciones.some(c => c.status === "borrador" || c.status === "enviada")) ? "reservas" : "cotizaciones");
  // La reseña se ve pedida en cuanto se toca el botón, como en el tablero: un
  // segundo toque ya pregunta antes de abrir WhatsApp otra vez. Al recargar manda lo del servidor.
  const [resenaPedidaEn, setResenaPedidaEn] = useState<string | null>(null);
  const resenaVista = resena && !resena.porWhatsapp && resenaPedidaEn ? conPeticionDelPanel(resena, resenaPedidaEn, quien) : resena;

  async function llamar(url: string, metodo: string, cuerpo: unknown, que: string, ok: string, fallo = "No se pudo guardar") {
    setOcupado(que); setMsj(null);
    try {
      const r = await fetch(url, { method: metodo, headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.ok) { playError(); setMsj({ texto: j?.error || fallo, error: true }); return false; }
      playSuccess(); setMsj({ texto: ok }); router.refresh(); return true;
    } catch { playError(); setMsj({ texto: fallo, error: true }); return false; }
    finally { setOcupado(null); }
  }
  const lead = (cuerpo: Record<string, unknown>, que: string, ok: string) => llamar(`/api/admin/leads/${f.id}`, "PATCH", cuerpo, que, ok);
  // Solo lo que cambió, y nunca el próximo paso (lo manda su seguimiento): antes
  // una ficha abierta de rato devolvía el próximo paso viejo al guardar.
  async function guardarDatos() {
    const base = datosDe(f) as Record<string, unknown>;
    const cambios: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(d)) {
      if (k === "proximoPaso" || k === "proximoPasoEn" || JSON.stringify(v) === JSON.stringify(base[k])) continue;
      cambios[k] = ["pax", "monto", "fechaViaje", "perfil"].includes(k) && v === "" ? null : v;
    }
    if (!Object.keys(cambios).length) { setMsj({ texto: "Sin cambios" }); return; }
    if (await lead({ accion: "editar", ...cambios }, "editar", "Datos guardados")) setRecienGuardado(true);
  }
  const set = (k: keyof typeof d) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setD(x => ({ ...x, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));

  function moverA(e: Etapa) {
    setMenuEtapa(false);
    if (e === f.etapa) return;
    playClick();
    if (e === "perdido") { setPerdiendo(true); return; }
    // A Operado antes del viaje o con saldo, o reabrirlo: se pregunta, igual que en el tablero (19 nov 2026).
    const aviso = avisoAntesDeMover({ nombre: f.contacto.nombre, etapa: f.etapa, ultimoDia: f.ultimoDia, saldo: f.saldo }, e, hoy);
    if (aviso && !window.confirm(aviso)) return;
    void lead({ accion: "etapa", etapa: e }, "etapa", `Ahora está en ${etiquetaEtapa(e)}`);
  }
  async function guardarTarea(id: string, e: EdicionSeguimiento) {
    if (await llamar(`/api/admin/tareas/${id}`, "PATCH", { accion: "editar", ...e, hora: e.hora || null }, "t", e.responsable ? `Seguimiento cambiado · ${e.responsable} recibirá el recordatorio` : "Seguimiento cambiado")) setEditandoTarea(null);
  }

  /**
   * Eliminar una cotización desde la ficha (19 nov 2026, Manolo: «no puedo
   * eliminar cotizaciones»): la misma ruta y el mismo aviso que en
   * Cotizaciones. Si el servidor no la borra, se enseña su motivo; la que ya
   * es una reserva viva no se elimina (se cancela la reserva con su motivo).
   */
  async function eliminarCotizacion(c: FichaLead["cotizaciones"][number]) {
    const conMarca = f.etapa === "perdido";
    // Ya entró dinero por su liga y todavía no es reserva: se avisa antes de borrarla.
    const pagada = c.pagadoPorLiga > 0 ? `\n\nOjo: ya entraron ${fmx(c.pagadoPorLiga)} por su liga de pago y todavía no es reserva. Si el cliente sí va, mejor conviértela a reserva.` : "";
    if (!window.confirm(`¿Eliminar la cotización ${c.folio}?\n\nSe borra y no se puede deshacer. Si el lead solo existía por ella, el lead también se quita. Si tiene una liga de pago sin pagar, se apaga.${conMarca ? "" : " Si el cliente no la quiso, mejor marca el lead como Perdido: la cotización se queda con la marca y cuenta en los números."}${pagada}`)) return;
    playClick();
    setOcupado(`borrar:${c.id}`); setMsj(null);
    try {
      const r = await fetch(`/api/admin/cotizaciones/${encodeURIComponent(c.id)}?hard=1`, { method: "DELETE" });
      const j: Record<string, unknown> = await r.json().catch(() => ({}));
      if (r.ok) {
        playSuccess();
        const ligas = Number(j.pagosSinReserva) > 0 ? ". Ojo: ya tenía un pago por liga sin reserva; Manolo tiene el seguimiento"
          : Number(j.ligasApagadas) > 0 ? ". Su liga de pago ya no se puede pagar" : "";
        if (j.lead === "borrado") {
          // El lead solo existía por ella y se fue con ella: la ficha ya no existe.
          setMsj({ texto: `Cotización ${c.folio} eliminada. El lead también se quitó porque no tenía nada más${ligas}.` });
          router.push("/admin/leads");
          return;
        }
        setMsj({ texto: `Cotización ${c.folio} eliminada${j.lead === "actualizado" ? " y anotada en el historial" : ""}${ligas}.` });
        router.refresh();
        return;
      }
      if (r.status === 404) { playSuccess(); setMsj({ texto: `La cotización ${c.folio} ya se había eliminado (otra pestaña o alguien más).` }); router.refresh(); return; }
      playError();
      if (r.status === 409) {
        if (typeof j.reservaFolio === "string") { const folioReserva = j.reservaFolio; setEsReservaAhora(m => ({ ...m, [c.id]: folioReserva })); }
        // Ya es una reserva (otra pestaña, el bot): la etapa, la cotización y sus Reservaciones se ponen al día sin recargar (20 nov 2026).
        router.refresh();
      }
      setMsj({ texto: typeof j.error === "string" && j.error ? j.error : "No se pudo eliminar la cotización", error: true });
    } catch {
      playError(); setMsj({ texto: "No se pudo eliminar: revisa tu conexión e intenta de nuevo", error: true });
    } finally { setOcupado(null); }
  }

  /**
   * «Mandar confirmación» (19 nov 2026): la ruta de siempre de Reservas. Si ya
   * se mandó, o no se sabe, se pregunta antes: le llega al cliente y al equipo
   * en copia.
   */
  async function mandarConfirmacion(c: ConfirmacionDeReserva) {
    if (!sePuedeMandarConfirmacion(c)) return;
    const pregunta = preguntaAntesDeMandar(c);
    if (pregunta && !window.confirm(pregunta)) return;
    playClick();
    await llamar(`/api/admin/reservas/${encodeURIComponent(c.reservaId)}/send-email`, "POST", {}, `conf:${c.reservaId}`,
      `Confirmación enviada por correo a ${c.correo}${c.idioma === "en" ? " (en inglés)" : ""}`,
      "No se mandó el correo de confirmación: revisa la conexión y vuelve a intentarlo");
  }

  /** «Pedir reseña por WhatsApp»: WhatsApp ya se abrió; cuando quede anotada, la ficha lo enseña. */
  function alPedirResena(anotada: Promise<boolean>) {
    playClick();
    setResenaPedidaEn(new Date().toISOString());
    setMsj({ texto: "Se abrió WhatsApp con el mensaje listo: revísalo y mándalo." });
    void anotada.then(ok => {
      if (ok) { router.refresh(); return; }
      playError();
      setResenaPedidaEn(null);
      setMsj({ texto: "Se abrió WhatsApp, pero no se pudo anotar que se le pidió la reseña. Vuelve a intentarlo.", error: true });
    });
  }

  const monto = Number(d.monto) || 0;
  const proxima = f.etapa === "perdido" ? null : etapaSiguiente(f.etapa);
  const etapasCamino = ETAPAS.filter(e => e.clave !== "perdido");
  const iActual = etapasCamino.findIndex(e => e.clave === f.etapa);
  const pendientes = f.tareas.filter(t => t.estado !== "hecha");
  const hechas = f.tareas.filter(t => t.estado === "hecha");
  const conLead = (ruta: string) => `${ruta}${ruta.includes("?") ? "&" : "?"}lead=${f.id}`;
  const verReservas = () => {
    playClick(); setPestana("reservas");
    document.getElementById("ventas-del-lead")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="mt-3">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-x-3 gap-y-3">
        <div className="min-w-0">
          <h1 className="font-cormorant text-[34px] font-medium leading-[1.1] text-[var(--panel-tinta)]">{f.contacto.nombre}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] font-dm text-[var(--panel-tinta-media)]">
            {f.contacto.telefono && <a href={`https://wa.me/${f.contacto.telefono.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="panel-foco inline-flex items-center gap-1 font-medium text-[#1f7a4d] hover:underline"><Phone className="h-3.5 w-3.5" aria-hidden="true" />{f.contacto.telefono}</a>}
            {f.contacto.correo && <a href={`mailto:${f.contacto.correo}`} className="panel-foco inline-flex items-center gap-1 hover:underline"><Mail className="h-3.5 w-3.5" aria-hidden="true" />{f.contacto.correo}</a>}
            <span>Capturado por {f.creadoPor ?? "—"} · {fHora(f.createdAt)}</span>
          </p>
          {/* De qué página y canal llegó (código de referencia del WhatsApp, 4 nov 2026). */}
          {f.origenWeb && (
            <p className="mt-1 text-[12.5px] font-dm text-[var(--panel-tinta-media)]">
              Llegó desde la web{f.origenWeb.pagina ? <> · tocó WhatsApp en <span className="font-medium text-[var(--panel-tinta)]">{f.origenWeb.pagina}</span></> : null}
              {f.origenWeb.conClic ? <> · visita por <span className="font-medium text-[var(--panel-tinta)]">{ETIQUETA_CANAL[f.origenWeb.canal] ?? f.origenWeb.canal}</span>{f.origenWeb.campana ? ` (${f.origenWeb.campana})` : ""}</> : " · sin el clic (bloqueador o código viejo)"}
              <span className="text-[var(--panel-tinta-suave)]"> · ref. {f.origenWeb.ref}</span>
            </p>
          )}
          {/* Pagó algo y no hay registro de su correo de confirmación: se ve sin abrir nada (lleva a sus reservas). */}
          {pendientesConf.length > 0 && (
            <button type="button" onClick={verReservas}
              className="panel-foco mt-2 inline-flex min-h-[44px] max-w-full items-center gap-1.5 rounded-full bg-[var(--panel-atencion-fondo)] px-3 text-left text-[12.5px] font-dm font-semibold text-[var(--panel-atencion)]">
              <MailWarning className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0">{pendientesConf.length > 1 ? `Faltan ${pendientesConf.length} confirmaciones por correo` : pendientesConf[0].estado === "sin-correo" ? "Falta la confirmación por correo: su reserva no tiene un correo que sirva" : "Falta mandar la confirmación por correo"}</span>
            </button>
          )}
        </div>

        {/* Etapa actual y los botones para moverla */}
        <div className="relative flex flex-wrap items-center gap-2">
          <ChipEtapa etapa={f.etapa} grande texto={f.etapa === "perdido" ? `Perdido · ${etiquetaMotivoPerdida(f.motivoPerdida) || "Sin motivo"}` : undefined} />
          {proxima && (
            <button type="button" onClick={() => moverA(proxima)} disabled={!!ocupado}
              className="panel-foco panel-pulsable inline-flex min-h-[44px] items-center gap-2 rounded-[var(--panel-radio-sm)] px-4 text-[13px] font-dm font-semibold text-white disabled:opacity-50"
              style={{ background: estiloEtapa(proxima).color }}>
              Pasar a {etiquetaEtapa(proxima)}<ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
          <button type="button" onClick={() => { playClick(); setMenuEtapa(m => !m); }} aria-expanded={menuEtapa} aria-haspopup="menu" disabled={!!ocupado} className={botonSecundario}>
            <Repeat2 className="h-4 w-4" aria-hidden="true" />Mover de etapa<ChevronDown className="h-4 w-4" aria-hidden="true" />
          </button>
          {menuEtapa && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenuEtapa(false)} aria-hidden="true" />
              <ul role="menu" className="absolute right-0 top-full z-40 mt-1 w-64 overflow-hidden rounded-[var(--panel-radio)] border border-[var(--panel-borde)] bg-white py-1 shadow-xl">
                {ETAPAS.map(e => {
                  const s = estiloEtapa(e.clave); const Icono = s.icono; const actual = e.clave === f.etapa;
                  return (
                    <li key={e.clave} role="none">
                      <button type="button" role="menuitem" onClick={() => moverA(e.clave)} disabled={actual}
                        className="panel-foco flex min-h-[44px] w-full items-center gap-3 px-3 text-left text-[13.5px] font-dm hover:bg-[var(--panel-fondo-velo)] disabled:cursor-default">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: s.fondo, color: s.color }}><Icono className="h-4 w-4" aria-hidden="true" /></span>
                        <span className="flex-1" style={{ color: actual ? s.color : "var(--panel-tinta)" }}>{e.etiqueta}</span>
                        {actual && <span className="text-[11px] text-[var(--panel-tinta-suave)]">aquí está</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        {siguiente ? (
          <p className={`order-last w-full text-[13px] font-dm ${COLOR_FECHA[estadoFecha(siguiente.vence, hoy)]}`}>
            Próximo seguimiento: <strong>{siguiente.titulo}</strong> · <span>{fechaCortaM(siguiente.vence)}</span>{siguiente.hora ? ` ${siguiente.hora}` : ""} · {siguiente.responsable}
          </p>
        ) : f.proximoPaso ? (
          <p className={`order-last w-full text-[13px] font-dm ${COLOR_FECHA[estadoFecha(f.proximoPasoEn, hoy)]}`}>
            Próximo paso: <strong>{f.proximoPaso}</strong>{f.proximoPasoEn ? <> · <span>{fechaCortaM(f.proximoPasoEn)}</span></> : ""} · agéndalo abajo para que llegue el recordatorio
          </p>
        ) : null}
      </header>

      {/* El camino de etapas con su color: lo hecho, lo actual y lo que falta. Un toque mueve. */}
      <nav aria-label="Etapas" className="-mx-4 mb-5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ol className="flex min-w-max items-center gap-1">
          {etapasCamino.map((e, i) => {
            const s = estiloEtapa(e.clave); const Icono = s.icono;
            const actual = f.etapa === e.clave; const pasada = iActual >= 0 && i < iActual;
            return (
              <li key={e.clave} className="flex items-center gap-1">
                <button type="button" onClick={() => moverA(e.clave)} disabled={!!ocupado} aria-current={actual ? "step" : undefined} title={`Mover a ${e.etiqueta}`}
                  className="panel-foco inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-dm font-semibold transition-colors"
                  style={actual ? { background: s.color, borderColor: s.color, color: "#fff" } : pasada ? { background: s.fondo, borderColor: s.fondo, color: s.color } : { background: "#fff", borderColor: "var(--panel-borde)", color: "var(--panel-tinta-suave)" }}>
                  {pasada ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Icono className="h-3.5 w-3.5" aria-hidden="true" />}{e.etiqueta}
                </button>
                {i < etapasCamino.length - 1 && <span aria-hidden="true" className="h-px w-3" style={{ background: pasada ? s.color : "var(--panel-borde)" }} />}
              </li>
            );
          })}
          {/* Ya en Perdido: no se toca, pero se ve sólido como el paso actual (antes salía deslavado por estar deshabilitado, 20 nov 2026). */}
          <li className="ml-2"><button type="button" onClick={() => moverA("perdido")} disabled={!!ocupado || f.etapa === "perdido"} aria-current={f.etapa === "perdido" ? "step" : undefined}
            className={`panel-foco inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-dm font-semibold ${f.etapa === "perdido" ? "cursor-default" : "disabled:opacity-60"}`}
            style={f.etapa === "perdido" ? { background: estiloEtapa("perdido").color, borderColor: estiloEtapa("perdido").color, color: "#fff" } : { borderColor: estiloEtapa("perdido").color, color: estiloEtapa("perdido").color, background: "#fff" }}>Perdido</button></li>
        </ol>
      </nav>
      {msj && <AvisoFlotante texto={msj.texto} tono={msj.error ? "error" : "bien"} onCerrar={() => setMsj(null)} />}

      <ResumenAvance f={f} hoy={hoy} conLead={conLead} confirmaciones={confirmaciones} resena={resenaVista} ocupado={ocupado}
        onMandarConfirmacion={c => void mandarConfirmacion(c)} onPedirResena={alPedirResena} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-5">
          {/* Cotizaciones y Reservaciones del lead, con sus botones directos */}
          <section id="ventas-del-lead" className="panel-card scroll-mt-20 overflow-hidden">
            <div role="tablist" aria-label="Ventas del lead" className="flex border-b border-[var(--panel-borde)]">
              {([["cotizaciones", "Cotizaciones", f.cotizaciones.length, FileText], ["reservas", "Reservaciones", f.reservas.length, BookOpen]] as const).map(([clave, etiqueta, n, Icono]) => (
                <button key={clave} type="button" role="tab" aria-selected={pestana === clave} onClick={() => { playClick(); setPestana(clave); }}
                  className={`panel-foco flex min-h-[48px] flex-1 items-center justify-center gap-2 border-b-2 text-[14px] font-dm font-semibold ${pestana === clave ? "border-[var(--panel-acento)] text-[var(--panel-tinta)]" : "border-transparent text-[var(--panel-tinta-suave)] hover:text-[var(--panel-tinta)]"}`}>
                  <Icono className="h-4 w-4" aria-hidden="true" />{etiqueta}<span className="rounded-full bg-[var(--panel-fondo-velo)] px-2 text-[12px]">{n}</span>
                  {clave === "reservas" && pendientesConf.length > 0 && <MailWarning className="h-4 w-4 text-[var(--panel-atencion)]" aria-label="Falta mandar una confirmación" />}
                </button>
              ))}
            </div>
            {pestana === "cotizaciones" ? (
              <div className="p-4">
                {f.cotizaciones.length === 0 && <p className="mb-3 text-[13px] font-dm text-[var(--panel-tinta-media)]">Este lead todavía no tiene cotización.</p>}
                <ul className="space-y-3">
                  {f.cotizaciones.map(c => {
                    const e = ESTADO_COT[c.status] ?? { texto: c.status, color: "#6B6F6C" };
                    // También la «aceptada» por una liga pagada que aún no tiene reserva (caso de Erick).
                    const convertible = c.status === "borrador" || c.status === "enviada" || (c.status === "aceptada" && c.pagadoPorLiga > 0);
                    // Lead Perdido (19 nov 2026): su marca sale de la etapa del lead, no se guarda en la cotización.
                    const perdido = c.status === "aceptada" ? null : marcaPerdido({ etapa: f.etapa, motivoPerdida: f.motivoPerdida }, c.status);
                    const reserva = reservasDeCotizaciones[c.id] ?? esReservaAhora[c.id] ?? null;
                    return (
                      <li key={c.id} className="rounded-[var(--panel-radio-sm)] border border-[var(--panel-borde)] p-3">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="flex flex-wrap items-center gap-2 text-[14px] font-dm font-semibold text-[var(--panel-tinta)]" title={c.tour || undefined}><BadgesTour slugs={c.tours} vacio="Sin tour" grande /></p>
                          <p className="panel-cifra text-[16px] font-dm font-semibold text-[var(--panel-tinta)]">{fmx(c.total)}</p>
                        </div>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-dm text-[var(--panel-tinta-media)]">
                          <span className="whitespace-nowrap font-mono">{c.folio}</span>
                          <span className="font-semibold" style={{ color: e.color }}>{e.texto}</span>
                          <ChipPerdido marca={perdido} />
                          {c.pagadoPorLiga > 0 && <span className="font-semibold text-[var(--panel-bien)]">Liga pagada {fmx(c.pagadoPorLiga)} · falta pasarla a reserva</span>}
                          {c.estadoVence === "borrador" && <span className={`font-semibold ${perdido ? "text-[var(--panel-tinta-suave)]" : COLOR_VENCE.borrador}`}>Sin enviar: vence al mandarla</span>}
                          {c.vence && c.estadoVence !== "aceptada" && <span className={`font-semibold ${perdido ? "text-[var(--panel-tinta-suave)]" : COLOR_VENCE[c.estadoVence]}`}>Vence {fechaCorta(c.vence)} · {etiquetaVence(c.vence, hoy)}</span>}
                          {c.fecha && <span>Viaje {fechaCortaM(c.fecha)}</span>}
                          <span>{c.personas} persona{c.personas === 1 ? "" : "s"}</span>
                          <span>Editada {fHora(c.editadaEn)}</span>
                        </p>
                        {/* En el celular no hay cursor: lo que pasa con la cotización de un lead Perdido se dice aquí. */}
                        {perdido && <p className="mt-1.5 text-[12px] font-dm text-[var(--panel-tinta-media)]">{perdido.ayuda}</p>}
                        <div className="mt-2.5 flex flex-wrap gap-2">
                          {/* Una aceptada se abre para ver: lo que se cambia es su reserva (lote 4, 5 nov 2026). */}
                          <Link href={conLead(`/admin/cotizaciones?editar=${c.id}`)} className={botonSecundario}><Pencil className="h-4 w-4" aria-hidden="true" />{c.status === "aceptada" ? "Ver cotización" : "Editar cotización"}</Link>
                          {convertible && <Link href={conLead(`/admin/cotizaciones?convertir=${c.id}`)} className={botonPrimario}><BookOpen className="h-4 w-4" aria-hidden="true" />Convertir a reserva</Link>}
                          {/* La que ya es una reserva viva no se elimina: se cancela la reserva con su motivo en Reservas. */}
                          {reserva
                            ? <Link href={`/admin/reservas?folio=${encodeURIComponent(reserva)}`} className={botonSecundario}><Eye className="h-4 w-4" aria-hidden="true" /><span>Ver su reserva <span className="whitespace-nowrap">{reserva}</span></span></Link>
                            : puedeBorrarCotizaciones && (
                              <button type="button" onClick={() => void eliminarCotizacion(c)} disabled={!!ocupado} className={botonPeligro}>
                                <Trash2 className="h-4 w-4" aria-hidden="true" />{ocupado === `borrar:${c.id}` ? "Eliminando…" : "Eliminar"}
                              </button>
                            )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <Link href={conLead("/admin/cotizaciones?nueva=1")} className={`${botonSecundario} mt-3`}><Plus className="h-4 w-4" aria-hidden="true" />Nueva cotización para {f.contacto.nombre.split(" ")[0]}</Link>
              </div>
            ) : (
              <div className="p-4">
                {f.reservas.length === 0 && <p className="text-[13px] font-dm text-[var(--panel-tinta-media)]">Todavía no hay reserva. Se crea con «Convertir a reserva» en su cotización.</p>}
                <ul className="space-y-3">
                  {f.reservas.map(r => {
                    const saldo = Math.max(0, r.total - r.cobrado);
                    const e = estadoReserva(r.status, r.cobrado, saldo);
                    const conf = confirmacionDe.get(r.id);
                    const textoConf = conf ? textoConfirmacion(conf) : "";
                    const estiloConf = conf ? ESTILO_CONF[conf.estado] : undefined;
                    const puedeMandar = !!conf && sePuedeMandarConfirmacion(conf);
                    // Un solo botón oscuro por reserva (20 nov 2026): la confirmación que falta; si no, el cobro.
                    const confPrimero = !!conf && puedeMandar && confirmacionPendiente(conf.estado);
                    return (
                      <li key={r.id} className="rounded-[var(--panel-radio-sm)] border border-[var(--panel-borde)] p-3">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <p className="flex flex-wrap items-center gap-2 text-[14px] font-dm font-semibold text-[var(--panel-tinta)]" title={r.tour || undefined}><BadgesTour slugs={r.tours} vacio="Sin tour" grande /></p>
                          <p className="panel-cifra text-[16px] font-dm font-semibold text-[var(--panel-tinta)]">{fmx(r.total)}</p>
                        </div>
                        <p className="mt-0.5 flex flex-wrap gap-x-3 text-[12px] font-dm text-[var(--panel-tinta-media)]">
                          <span className="whitespace-nowrap font-mono">{r.folio}</span>
                          <span className="font-semibold" style={{ color: e.color }}>{e.texto}</span>
                          {r.fecha && <span>{fechaCortaM(r.fecha)}</span>}
                          <span>{r.personas} persona{r.personas === 1 ? "" : "s"}</span>
                          <span>Entró por {canalCorto(r.origen)}</span>
                          {r.guia && <span>Guía {r.guia}</span>}
                        </p>
                        <div className="mt-2 grid grid-cols-3 gap-2 rounded-[var(--panel-radio-sm)] bg-[var(--panel-fondo-velo)] p-2 text-center text-[12px] font-dm">
                          <div><p className="text-[var(--panel-tinta-suave)]">Total</p><p className="panel-cifra font-semibold text-[var(--panel-tinta)]">{fmx(r.total)}</p></div>
                          <div><p className="text-[var(--panel-tinta-suave)]">Cobrado</p><p className="panel-cifra font-semibold text-[var(--panel-bien)]">{fmx(r.cobrado)}</p></div>
                          <div><p className="text-[var(--panel-tinta-suave)]">Falta</p><p className={`panel-cifra font-semibold ${saldo > 0 ? "text-[var(--panel-atencion)]" : "text-[var(--panel-tinta-suave)]"}`}>{saldo > 0 ? fmx(saldo) : "Liquidada"}</p></div>
                        </div>
                        {/* El correo de confirmación de ESTA reserva (19 nov 2026): falta, ya salió (cuándo y a quién) o no se sabe. */}
                        {conf && textoConf && estiloConf && (
                          <p className={`mt-2 flex items-start gap-1.5 rounded-[var(--panel-radio-sm)] px-2.5 py-1.5 text-[12.5px] font-dm font-semibold ${estiloConf.cls}`}>
                            <estiloConf.Icono className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span className="min-w-0 break-words">{textoConf}</span>
                          </p>
                        )}
                        <div className="mt-2.5 flex flex-wrap gap-2">
                          <Link href={`/admin/reservas?folio=${encodeURIComponent(r.folio)}`} className={botonSecundario}><Eye className="h-4 w-4" aria-hidden="true" />Ver reserva</Link>
                          {saldo > 0 && r.status !== "cancelled" && <Link href={`/admin/reservas?folio=${encodeURIComponent(r.folio)}&cobrar=1`} className={confPrimero ? botonSecundario : botonPrimario}><Banknote className="h-4 w-4" aria-hidden="true" />Registrar cobro</Link>}
                          {conf && puedeMandar && (
                            <button type="button" onClick={() => void mandarConfirmacion(conf)} disabled={!!ocupado} className={confPrimero ? botonPrimario : botonSecundario}>
                              <Mail className="h-4 w-4" aria-hidden="true" />{ocupado === `conf:${r.id}` ? "Mandando…" : conf.estado === "enviada" ? "Mandarla otra vez" : "Mandar confirmación"}
                            </button>
                          )}
                        </div>
                        {conf && puedeMandar && <p className="mt-1 break-words text-[11.5px] font-dm text-[var(--panel-tinta-suave)]">La confirmación sale a {conf.correo}{conf.idioma === "en" ? ", en inglés" : ""}, con el equipo en copia.</p>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </section>

          <form className="panel-card space-y-3 p-4" onSubmit={e => { e.preventDefault(); void guardarDatos(); }}>
            <h2 className="font-cormorant text-[22px] text-[var(--panel-tinta)]">Datos</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={etiquetaCls}>Nombre<input value={d.nombre} onChange={set("nombre")} className={`${inputCls} mt-1 normal-case tracking-normal`} /></label>
              <label className={etiquetaCls}>Teléfono<input type="tel" value={d.telefono} onChange={set("telefono")} className={`${inputCls} mt-1 normal-case tracking-normal`} /></label>
              <label className={etiquetaCls}>Correo<input type="email" value={d.correo} onChange={set("correo")} className={`${inputCls} mt-1 normal-case tracking-normal`} /></label>
              <label className={etiquetaCls}>Idioma<select value={d.idioma} onChange={set("idioma")} className={`${inputCls} mt-1 normal-case tracking-normal`}><option value="es">Español</option><option value="en">Inglés</option></select></label>
              <label className={etiquetaCls}>Canal<select value={d.canal} onChange={set("canal")} className={`${inputCls} mt-1 normal-case tracking-normal`}>{ORIGENES_ELEGIBLES.map(o => <option key={o} value={o}>{canalCorto(o)}</option>)}{!ORIGENES_ELEGIBLES.includes(d.canal as never) && <option value={d.canal}>{canalCorto(d.canal)}</option>}</select></label>
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
            {f.cotizaciones.length > 0 && <p className="text-[11.5px] font-dm text-[var(--panel-tinta-suave)]">Al editar su cotización, el monto, la fecha, las personas y los tours se ponen al día aquí solos.</p>}
            <button type="submit" disabled={!!ocupado} className={botonPrimario}>{ocupado === "editar" ? "Guardando…" : "Guardar datos"}</button>
          </form>
        </div>

        <div className="space-y-5">
          {/* Seguimientos: agendar, editar en su lugar, marcar hecho */}
          <section className="panel-card space-y-3 p-4">
            <h2 className="font-cormorant text-[22px] text-[var(--panel-tinta)]">Seguimientos</h2>
            <form className="rounded-[var(--panel-radio-sm)] bg-[var(--panel-atencion-fondo)] p-3" onSubmit={async e => { e.preventDefault(); if (await llamar("/api/admin/tareas", "POST", { ...tarea, hora: tarea.hora || null, oportunidadId: f.id }, "tarea", `Seguimiento agendado: a ${tarea.responsable} le llegará el recordatorio`)) setTarea(t => ({ ...t, titulo: "", hora: "" })); }}>
              <label className={etiquetaCls}>Agendar próximo seguimiento<input value={tarea.titulo} onChange={e => setTarea(t => ({ ...t, titulo: e.target.value }))} className={`${inputCls} mt-1 normal-case tracking-normal`} placeholder="Ej. preguntar si ya decidió la fecha" /></label>
              {/* Cada campo con el ancho que necesita para leerse completo (20 nov 2026: en tres
                  columnas iguales, a 1366 px se cortaba el año y la hora). Si no caben juntos,
                  bajan al siguiente renglón: el día y la hora arriba, el responsable abajo. */}
              <div className="mt-2 flex flex-wrap gap-2">
                <input aria-label="Día" type="date" value={tarea.vence} onChange={e => setTarea(t => ({ ...t, vence: e.target.value }))} className={`${inputCls} min-w-0 flex-[1.3_1_8.75rem]`} />
                <input aria-label="Hora" type="time" value={tarea.hora} onChange={e => setTarea(t => ({ ...t, hora: e.target.value }))} className={`${inputCls} min-w-0 flex-[1_1_8.5rem]`} />
                <select aria-label="Responsable" value={tarea.responsable} onChange={e => setTarea(t => ({ ...t, responsable: e.target.value }))} className={`${inputCls} min-w-0 flex-[1_1_7rem]`}>{responsables.map(r => <option key={r} value={r}>{r}</option>)}</select>
              </div>
              <button type="submit" disabled={!tarea.titulo.trim() || !!ocupado} className={`${botonPrimario} mt-2`}>Agendar y avisar</button>
              <p className="mt-1 text-[11.5px] font-dm text-[#4A3A12]">Le llega un correo a esa hora (sin hora, a primera hora del día) y un aviso en el panel.</p>
            </form>
            {pendientes.length > 0 && (
              <ul className="divide-y divide-[var(--panel-borde)]">
                {pendientes.map(t => {
                  const ef = estadoFecha(t.vence, hoy);
                  if (editandoTarea === t.id) {
                    return <li key={t.id} className="py-3"><EditorSeguimiento inicial={{ titulo: t.titulo, vence: t.vence, hora: t.hora ?? "", responsable: t.responsable }} responsables={responsables} ocupado={!!ocupado}
                      onCancelar={() => setEditandoTarea(null)} onGuardar={e => guardarTarea(t.id, e)} /></li>;
                  }
                  return (
                    <li key={t.id} className="flex items-center gap-2 py-2.5">
                      <button type="button" aria-label="Marcar hecho" title="Marcar hecho" disabled={!!ocupado}
                        onClick={() => void llamar(`/api/admin/tareas/${t.id}`, "PATCH", { accion: "hecha" }, "t", "Seguimiento hecho")}
                        className="panel-foco flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--panel-borde-fuerte)] text-[var(--panel-tinta-suave)] hover:border-[var(--panel-bien)] hover:text-[var(--panel-bien)]"><Check className="h-4 w-4" aria-hidden="true" /></button>
                      <span className="min-w-0 flex-1 text-[13.5px] font-dm text-[var(--panel-tinta)]">{t.titulo}
                        <span className="block text-[12px] text-[var(--panel-tinta-media)]"><span className={`${COLOR_FECHA[ef]}`}>{ef === "vencido" ? "Venció " : ef === "hoy" ? "Hoy " : ""}{ef === "hoy" ? "" : fechaCortaM(t.vence)}{t.hora ? ` ${t.hora}` : ""}</span> · {t.responsable}</span></span>
                      <button type="button" onClick={() => { playClick(); setEditandoTarea(t.id); }} aria-label={`Editar «${t.titulo}»`} title="Editar"
                        className="panel-foco inline-flex min-h-[36px] items-center gap-1 rounded-[var(--panel-radio-sm)] border border-[var(--panel-borde)] bg-white px-2.5 text-[12px] font-dm text-[var(--panel-tinta-media)]"><Pencil className="h-3.5 w-3.5" aria-hidden="true" />Editar</button>
                      <button type="button" onClick={() => void llamar(`/api/admin/tareas/${t.id}`, "PATCH", { accion: "posponer", dias: 1 }, "t", "Pospuesto un día")} disabled={!!ocupado}
                        className="panel-foco min-h-[36px] rounded-[var(--panel-radio-sm)] border border-[var(--panel-borde)] bg-white px-2.5 text-[12px] font-dm text-[var(--panel-tinta-media)]">+1 día</button>
                    </li>
                  );
                })}
              </ul>
            )}
            {hechas.length > 0 && (
              <details>
                <summary className="cursor-pointer text-[12.5px] font-dm text-[var(--panel-tinta-media)]">Hechos · {hechas.length}</summary>
                <ul className="mt-1 divide-y divide-[var(--panel-borde)]">
                  {hechas.map(t => (
                    <li key={t.id} className="flex items-center justify-between gap-2 py-2 text-[13px] font-dm">
                      <span className="text-[var(--panel-tinta-suave)] line-through">{t.titulo}</span>
                      <button type="button" onClick={() => void llamar(`/api/admin/tareas/${t.id}`, "PATCH", { accion: "reabrir" }, "t", "Reabierto")} className="panel-foco text-[12px] text-[var(--panel-acento)] hover:underline">Reabrir</button>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>

          <section className="panel-card space-y-4 p-4">
            <h2 className="font-cormorant text-[22px] text-[var(--panel-tinta)]">Más acciones</h2>
            {f.contacto.telefono && <a href={`https://wa.me/${f.contacto.telefono.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className={botonSecundario}><Phone className="h-4 w-4" aria-hidden="true" />Abrir WhatsApp</a>}
            <form onSubmit={async e => { e.preventDefault(); if (await lead({ accion: "nota", texto: nota }, "nota", "Nota agregada")) setNota(""); }}>
              <label className={etiquetaCls}>Nota<textarea rows={2} value={nota} onChange={e => setNota(e.target.value)} className={`${inputCls} mt-1 normal-case tracking-normal`} placeholder="Lo hablado por llamada, lo que pidió…" /></label>
              <button type="submit" disabled={!nota.trim() || !!ocupado} className={`${botonSecundario} mt-2`}>Agregar nota</button>
            </form>
            <form onSubmit={async e => { e.preventDefault(); if (await lead({ accion: "vincular", folio }, "vincular", `Se enlazó ${folio.toUpperCase()}`)) setFolio(""); }}>
              <label className={etiquetaCls}>Enlazar cotización o reserva<input value={folio} onChange={e => setFolio(e.target.value)} className={`${inputCls} mt-1 normal-case tracking-normal`} placeholder="COT-… o HP-M-…" /></label>
              <button type="submit" disabled={!folio.trim() || !!ocupado} className={`${botonSecundario} mt-2`}>Enlazar</button>
              <p className="mt-1 text-[11.5px] font-dm text-[var(--panel-tinta-suave)]">Con cotización pasa a Cotizado; con reserva y algo cobrado, a Confirmado; sin cobro, a En seguimiento.</p>
            </form>
            {f.otras.length > 0 && (
              <ul className="space-y-1 text-[13px] font-dm">
                {f.otras.map(o => <li key={o.id}><Link href={`/admin/leads/${o.id}`} className="panel-foco hover:underline">Otro lead de esta persona</Link> · {etiquetaEtapa(o.etapa)} · {fHora(o.createdAt)}</li>)}
              </ul>
            )}
          </section>
        </div>
      </div>

      <Historial f={f} hoy={hoy} />

      {perdiendo && (
        <DialogoPerdido nombre={f.contacto.nombre} onCancelar={() => setPerdiendo(false)}
          onConfirmar={(m: MotivoPerdida, det: string) => { setPerdiendo(false); void lead({ accion: "etapa", etapa: "perdido", motivo: m, motivoDetalle: det }, "etapa", "Marcado como perdido"); }} />
      )}
    </div>
  );
}

interface Evento { en: string; Icono: LucideIcon; color: string; fondo: string; titulo: React.ReactNode; detalle?: string; quien?: string | null }

/** Historial agrupado por día (Hoy, Ayer, fechas), con un color e ícono por tipo y por etapa. */
function Historial({ f, hoy }: { f: FichaLead; hoy: string }) {
  const nota = { color: "#4B5563", fondo: "#EEF0F2" };
  const seg = { color: "#8A5A00", fondo: "#FFF3D6" };
  const eventos: Evento[] = [
    // El historial guarda las etapas como fueron (la vieja «anticipo» se lee
    // Confirmado). Un paso que ya no cambia nada, como «Anticipo pagado →
    // Confirmado» de antes del 19 nov 2026, no se enseña.
    ...f.historial.filter(h => !(h.anterior && normalizarEtapa(h.anterior) === normalizarEtapa(h.nueva))).map(h => {
      const s = estiloEtapa(h.nueva);
      return {
        en: h.en, Icono: s.icono, color: s.color, fondo: s.fondo,
        titulo: h.anterior
          ? <span className="inline-flex flex-wrap items-center gap-1.5">Pasó de <ChipEtapa etapa={h.anterior} /> a <ChipEtapa etapa={h.nueva} /></span>
          : <span className="inline-flex flex-wrap items-center gap-1.5">Entró como <ChipEtapa etapa={h.nueva} /></span>,
        quien: h.por.startsWith("Regla:") ? `Automático · ${h.por.slice(7).trim()}` : h.por,
      };
    }),
    ...f.notas.map(n => ({ en: n.en, Icono: StickyNote, ...nota, titulo: "Nota", detalle: n.texto, quien: n.autor })),
    ...f.tareas.map(t => ({
      en: t.en, Icono: Clock, ...seg, titulo: `Seguimiento agendado: ${t.titulo}`,
      detalle: `Para ${fechaCorta(t.vence)}${t.hora ? ` a las ${t.hora}` : ""} · le toca a ${t.responsable}`, quien: t.creadaPor,
    })),
    ...f.tareas.filter(t => t.estado === "hecha" && t.hechaEn).map(t => ({
      en: t.hechaEn as string, Icono: Check, color: "#1B4332", fondo: "#D9EDE1", titulo: `Seguimiento hecho: ${t.titulo}`, quien: t.hechaPor,
    })),
    ...f.cotizaciones.map(c => ({
      en: c.en, Icono: FileText, ...estiloEtapa("cotizado"), titulo: `Cotización ${c.folio} · ${fmx(c.total)}`,
      detalle: [c.tours.map(codigoDeTour).join(" · "), c.fecha && fechaCorta(c.fecha), `${c.personas} persona${c.personas === 1 ? "" : "s"}`, (ESTADO_COT[c.status]?.texto ?? c.status)].filter(Boolean).join(" · "),
    })),
    ...f.reservas.map(r => ({
      en: r.en, Icono: BookOpen, ...estiloEtapa("confirmado"), titulo: `Reserva ${r.folio} · ${fmx(r.total)}`,
      detalle: [r.tours.map(codigoDeTour).join(" · "), r.fecha && fechaCorta(r.fecha), `cobrado ${fmx(r.cobrado)}`, `entró por ${canalCorto(r.origen)}`].filter(Boolean).join(" · "),
    })),
  ].sort((a, b) => b.en.localeCompare(a.en));

  const ayer = addDaysYMD(hoy, -1);
  const anio = hoy.slice(0, 4);
  const titulo = (dia: string) => {
    const largo = new Date(`${dia}T12:00:00`).toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", ...(dia.slice(0, 4) !== anio ? { year: "numeric" } : {}) });
    return dia === hoy ? `Hoy · ${largo}` : dia === ayer ? `Ayer · ${largo}` : largo[0].toUpperCase() + largo.slice(1);
  };
  const dias: { dia: string; evs: Evento[] }[] = [];
  for (const ev of eventos) {
    const dia = diaMX(ev.en);
    const g = dias[dias.length - 1];
    if (g?.dia === dia) g.evs.push(ev); else dias.push({ dia, evs: [ev] });
  }

  return (
    <section className="panel-card mt-5 p-4 sm:p-5">
      <h2 className="font-cormorant text-[24px] text-[var(--panel-tinta)]">Historial</h2>
      {dias.length === 0 && <p className="mt-2 text-[13px] font-dm text-[var(--panel-tinta-media)]">Todavía no hay movimientos.</p>}
      <div className="mt-3 space-y-6">
        {dias.map(g => (
          <div key={g.dia}>
            <h3 className="sticky top-0 z-10 -mx-1 mb-3 flex items-center gap-3 bg-white px-1 py-1">
              <span className={`rounded-full px-3 py-1 text-[12.5px] font-dm font-semibold ${g.dia === hoy ? "bg-[var(--panel-acento)] text-white" : "bg-[var(--panel-fondo-velo)] text-[var(--panel-tinta)]"}`}>{titulo(g.dia)}</span>
              <span className="h-px flex-1 bg-[var(--panel-borde)]" aria-hidden="true" />
              <span className="text-[11.5px] font-dm text-[var(--panel-tinta-suave)]">{g.evs.length} movimiento{g.evs.length === 1 ? "" : "s"}</span>
            </h3>
            <ol className="relative ml-4 space-y-4 border-l-2 border-[var(--panel-borde)] pl-6">
              {g.evs.map((ev, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[41px] top-0 flex h-8 w-8 items-center justify-center rounded-full ring-4 ring-white" style={{ background: ev.fondo, color: ev.color }}>
                    <ev.Icono className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="text-[13.5px] font-dm">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <div className="font-medium text-[var(--panel-tinta)]">{ev.titulo}</div>
                      <span className="panel-cifra text-[12px] text-[var(--panel-tinta-suave)]">{soloHora(ev.en)}</span>
                    </div>
                    {ev.detalle && <p className="mt-0.5 whitespace-pre-line text-[13px] text-[var(--panel-tinta-media)]">{ev.detalle}</p>}
                    {ev.quien && <p className="mt-0.5 text-[11.5px] text-[var(--panel-tinta-suave)]">{ev.quien}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}

/** El botón principal de «Para avanzar»: un enlace, mandar la confirmación o pedir la reseña. */
type Accion =
  | { tipo: "enlace"; href: string; texto: string; Icono: LucideIcon }
  | { tipo: "confirmacion"; conf: ConfirmacionDeReserva }
  | { tipo: "resena"; resena: ResenaLead };

/**
 * «Para avanzar»: lo que hace falta para seguir con el lead sin abrir nada más
 * (Manolo, 3 nov 2026): total, anticipo, de dónde sale, cuándo vence la
 * cotización, grupo, hospedaje, extras, punto de encuentro y notas internas.
 * Con el siguiente paso más probable como botón. Desde el 19 nov 2026, en este
 * orden: la confirmación por correo que falta, luego el cobro del saldo y, ya
 * operado, la reseña de Google por WhatsApp.
 */
function ResumenAvance({ f, hoy, conLead, confirmaciones, resena, ocupado, onMandarConfirmacion, onPedirResena }: {
  f: FichaLead; hoy: string; conLead: (ruta: string) => string; confirmaciones: ConfirmacionDeReserva[]; resena: ResenaLead | null; ocupado: string | null;
  onMandarConfirmacion: (c: ConfirmacionDeReserva) => void; onPedirResena: (anotada: Promise<boolean>) => void;
}) {
  const r = f.resumen;
  if (!r.fuente) {
    return (
      <section className="panel-card mb-5 flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-[13.5px] font-dm text-[var(--panel-tinta-media)]">Todavía sin cotización. En cuanto la hagas, aquí ves el total, el anticipo, de dónde sale y cuándo vence.</p>
        <Link href={conLead("/admin/cotizaciones?nueva=1")} className={botonPrimario}><Plus className="h-4 w-4" aria-hidden="true" />Hacer cotización</Link>
      </section>
    );
  }
  const a = r.anticipo;
  const c = r.cotizacion;
  const diasViaje = r.fechaViaje ? diffDiasYMD(hoy, r.fechaViaje) : null;
  const perdido = f.etapa === "perdido";
  // 1) La confirmación por correo: pagó algo y nadie se la ha mandado.
  const porConfirmar = perdido ? undefined : confirmaciones.find(x => x.estado === "falta" && sePuedeMandarConfirmacion(x));
  const sinCorreo = perdido ? undefined : confirmaciones.find(x => x.estado === "sin-correo");
  // 2) El saldo: el de la reserva que manda o, si esa ya está liquidada, el de otra reserva viva del lead.
  const otraConSaldo = f.reservas.find(x => x.status !== "cancelled" && x.total - x.cobrado > 0);
  const conSaldo = r.reserva && (a?.falta ?? 0) > 0 ? { folio: r.reserva.folio, cobrado: a?.cobrado ?? 0 }
    : otraConSaldo ? { folio: otraConSaldo.folio, cobrado: otraConSaldo.cobrado } : null;
  // 3) Ya operado y sin pedirla por WhatsApp: la reseña.
  const tocaResena = f.etapa === "operado" && !!resena?.waUrl && !resena.porWhatsapp;
  const accion: Accion | null = perdido ? null
    : porConfirmar ? { tipo: "confirmacion", conf: porConfirmar }
    : sinCorreo ? { tipo: "enlace", href: `/admin/reservas?folio=${encodeURIComponent(sinCorreo.folio)}`, texto: "Agregar su correo en la reserva", Icono: Mail }
    : conSaldo ? { tipo: "enlace", href: `/admin/reservas?folio=${encodeURIComponent(conSaldo.folio)}&cobrar=1`, texto: conSaldo.cobrado > 0 ? "Registrar el saldo" : "Registrar el anticipo", Icono: Banknote }
    : tocaResena && resena ? { tipo: "resena", resena }
    : r.reserva ? null
    : c?.estado === "borrador" ? { tipo: "enlace", href: conLead(`/admin/cotizaciones?editar=${c.id}`), texto: "Revisar y mandar la cotización", Icono: Pencil }
    : c?.estado === "vencida" ? { tipo: "enlace", href: conLead(`/admin/cotizaciones?editar=${c.id}`), texto: "Darle otra fecha a la cotización", Icono: Pencil }
    : c && (c.estado === "enviada" || c.estado === "por-vencer") ? { tipo: "enlace", href: conLead(`/admin/cotizaciones?convertir=${c.id}`), texto: "Ya pagó: convertir a reserva", Icono: BookOpen } : null;
  const marcaCot = c && c.status !== "aceptada" ? marcaPerdido({ etapa: f.etapa, motivoPerdida: f.motivoPerdida }, c.status) : null;
  const Dato = ({ Icono, titulo, children }: { Icono: LucideIcon; titulo: string; children: React.ReactNode }) => (
    <div className="flex min-w-0 gap-2.5">
      <Icono className="mt-0.5 h-4 w-4 shrink-0 text-[var(--panel-tinta-suave)]" aria-hidden="true" />
      <div className="min-w-0 text-[13px] font-dm">
        <p className="text-[10.5px] uppercase tracking-[0.12em] text-[var(--panel-tinta-suave)]">{titulo}</p>
        <div className="text-[var(--panel-tinta)]">{children}</div>
      </div>
    </div>
  );
  return (
    <section aria-label="Para avanzar" className="panel-card mb-5 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {/* El folio no se parte en su guion («HP-M-» arriba y el resto abajo, 20 nov 2026). */}
        <h2 className="font-cormorant text-[22px] text-[var(--panel-tinta)]">Para avanzar <span className="font-dm text-[12px] text-[var(--panel-tinta-suave)]">· según {r.fuente.tipo === "reserva" ? "la reserva" : "la cotización"} <span className="whitespace-nowrap">{r.fuente.folio}</span></span></h2>
        {accion?.tipo === "enlace" && <Link href={accion.href} className={botonPrimario}><accion.Icono className="h-4 w-4" aria-hidden="true" />{accion.texto}</Link>}
        {accion?.tipo === "confirmacion" && (
          <button type="button" onClick={() => onMandarConfirmacion(accion.conf)} disabled={!!ocupado} title={`Sale a ${accion.conf.correo}`} className={botonPrimario}>
            <Mail className="h-4 w-4" aria-hidden="true" />{ocupado === `conf:${accion.conf.reservaId}` ? "Mandando…" : "Mandar la confirmación por correo"}
          </button>
        )}
        {accion?.tipo === "resena" && <BotonPedirResena resena={accion.resena} onPedida={onPedirResena} className={botonWhatsapp} />}
      </div>
      <div className="grid gap-x-5 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
        <Dato Icono={Wallet} titulo="Total y anticipo">
          <p className="panel-cifra font-semibold">{r.total ? fmx(r.total) : "—"}</p>
          {a && <p className="text-[12.5px] text-[var(--panel-tinta-media)]">Anticipo {fmx(a.acordado)}{a.esPorOmision ? " (30 %)" : ""}</p>}
          {a && a.cobrado !== null && (
            <p className={`text-[12.5px] font-semibold ${a.falta === 0 ? "text-[var(--panel-bien)]" : a.cobrado >= a.acordado ? "text-[var(--panel-bien)]" : "text-[var(--panel-atencion)]"}`}>
              {a.falta === 0 ? "Liquidado" : `Cobrado ${fmx(a.cobrado)} · falta ${fmx(a.falta ?? 0)}`}
            </p>
          )}
          {a && a.cobrado === null && <p className="text-[12.5px] text-[var(--panel-atencion)]">Sin anticipo todavía</p>}
          {r.descuento && <p className="inline-flex items-center gap-1 text-[12px] text-[var(--panel-tinta-media)]"><Tag className="h-3 w-3" aria-hidden="true" />Descuento {r.descuento}</p>}
        </Dato>
        <Dato Icono={MapPin} titulo="Sale de">
          {r.saleDe ? <p className="font-semibold">{r.saleDe}</p> : <p className="text-[var(--panel-atencion)]">No se dijo</p>}
          {r.reserva?.encuentro && <p className="text-[12.5px] text-[var(--panel-tinta-media)]">Encuentro: {r.reserva.encuentro}</p>}
          {r.reserva && <p className="text-[12.5px] text-[var(--panel-tinta-media)]">{r.reserva.guia ? `Guía ${r.reserva.guia}` : "Sin guía asignado"}</p>}
        </Dato>
        <Dato Icono={CalendarDays} titulo="Viaje">
          <p className="font-semibold">{r.fechaViaje ? fechaCortaM(r.fechaViaje) : "Sin fecha"}{diasViaje !== null && diasViaje >= 0 ? <span className="font-normal text-[var(--panel-tinta-media)]"> · {diasViaje === 0 ? "hoy" : diasViaje === 1 ? "mañana" : `en ${diasViaje} días`}</span> : null}{diasViaje !== null && diasViaje < 0 ? <span className="font-normal text-[var(--panel-problema)]"> · ya pasó</span> : null}</p>
          {r.slugs.length > 0 && <p title={r.tours.join(" + ")}><BadgesTour slugs={r.slugs} /></p>}
          {r.grupo && <p className="inline-flex items-center gap-1 text-[12.5px] text-[var(--panel-tinta-media)]"><Users className="h-3 w-3" aria-hidden="true" />{r.grupo}</p>}
        </Dato>
        <Dato Icono={FileText} titulo="Cotización">
          {c ? (
            <>
              <p className="font-semibold"><span className="whitespace-nowrap font-mono text-[12px]">{c.folio}</span> · {ESTADO_COT[c.status]?.texto ?? c.status}</p>
              {marcaCot && <p className="mt-0.5"><ChipPerdido marca={marcaCot} /></p>}
              {c.estado === "borrador" && <p className={`text-[12.5px] font-semibold ${marcaCot ? "text-[var(--panel-tinta-suave)]" : COLOR_VENCE.borrador}`}>Sin enviar</p>}
              {c.vence && c.estado !== "aceptada" && <p className={`text-[12.5px] font-semibold ${marcaCot ? "text-[var(--panel-tinta-suave)]" : COLOR_VENCE[c.estado]}`}>Vence {fechaCorta(c.vence)} · {etiquetaVence(c.vence, hoy)}</p>}
            </>
          ) : <p className="text-[var(--panel-tinta-media)]">—</p>}
        </Dato>
        {r.hospedaje.length > 0 && <Dato Icono={Hotel} titulo="Hospedaje">{r.hospedaje.map(h => <p key={h}>{h}</p>)}</Dato>}
        {r.extras.length > 0 && <Dato Icono={UtensilsCrossed} titulo="Extras">{r.extras.map(x => <p key={x}>{x}</p>)}</Dato>}
        {r.reserva && <Dato Icono={Languages} titulo="Idioma del tour"><p>{r.reserva.idiomaTour === "en" ? "Inglés" : "Español"}</p></Dato>}
      </div>
      {f.etapa === "operado" && resena && <BloqueResena resena={resena} conBoton={accion?.tipo !== "resena"} onPedirResena={onPedirResena} />}
      {r.notasInternas && (
        <p className="mt-3 flex gap-2 rounded-[var(--panel-radio-sm)] bg-[var(--panel-atencion-fondo)] p-2.5 text-[13px] font-dm text-[#4A3A12]">
          <EyeOff className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span><strong>Notas internas:</strong> {r.notasInternas}</span>
        </p>
      )}
    </section>
  );
}

/**
 * La reseña de Google de un lead Operado (19 nov 2026, Manolo: «integra un
 * acceso rápido para mandar pedir reseña a wpp»): si ya se pidió (por
 * WhatsApp, con quién y cuándo; el correo automático, aparte), lo que conviene
 * saber antes y el botón. Si el botón ya está arriba como siguiente paso, aquí no se repite.
 */
function BloqueResena({ resena, conBoton, onPedirResena }: { resena: ResenaLead; conBoton: boolean; onPedirResena: (anotada: Promise<boolean>) => void }) {
  return (
    <div className="mt-4 rounded-[var(--panel-radio-sm)] border border-[var(--panel-borde)] p-3">
      <p className="flex items-center gap-1.5 text-[10.5px] font-dm uppercase tracking-[0.12em] text-[var(--panel-tinta-suave)]"><Star className="h-3.5 w-3.5" aria-hidden="true" />Reseña de Google</p>
      <div className="mt-1 space-y-1 text-[13px] font-dm">
        {resena.porWhatsapp
          ? <p className="flex items-start gap-1.5 font-semibold text-[var(--panel-bien)]"><Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span className="min-w-0">{textoPeticion(resena.porWhatsapp)}</span></p>
          : <p className="text-[var(--panel-tinta)]">{resena.waUrl ? "Todavía no se le pide por WhatsApp. Un toque abre WhatsApp con el mensaje listo; revísalo y mándalo." : "Todavía no se le pide, y no tiene un teléfono que sirva para WhatsApp."}</p>}
        {resena.porCorreo && <p className="text-[12.5px] text-[var(--panel-tinta-media)]">{textoPeticion(resena.porCorreo)}.</p>}
        {avisosResena(resena).map(t => <p key={t} className="text-[12.5px] font-semibold text-[var(--panel-atencion)]">{t}</p>)}
      </div>
      {conBoton && resena.waUrl && (
        <div className="mt-2">
          <BotonPedirResena resena={resena} onPedida={onPedirResena} texto={resena.porWhatsapp ? "Pedirla otra vez" : "Pedir reseña por WhatsApp"}
            className={resena.porWhatsapp ? botonSecundario : botonWhatsapp} />
        </div>
      )}
    </div>
  );
}
