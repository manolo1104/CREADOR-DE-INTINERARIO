"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ClipboardCheck, Copy, Loader2, Mail, MessageCircle, X } from "lucide-react";
import {
  COMO_NOS_CONOCIO, MOTIVOS, SIN_CHECKIN, TIPOS_GRUPO, etiqueta, textoCumple, type EstadoCheckin,
} from "@/lib/encuestas/opciones";
import { playError, playSuccess } from "@/lib/admin/sfx";

/**
 * El check-in previo al tour, en el panel (21 oct 2026). Tres piezas:
 * - `CheckinBoton`: el botón de la fila de Reservas y de la tarjeta del día en
 *   el Calendario. Su color dice el estado; al tocarlo abre las opciones.
 * - `CheckinSeccion`: la sección de la ficha de la reserva, con las respuestas.
 * El correo sale solo el día antes (cron); esto es para mandarlo a mano, sobre
 * todo por WhatsApp a quien no dejó correo.
 */

export interface ReservaCheckin {
  id: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
}

const fCorta = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Mexico_City" }) : "";

const correoValido = (e: string | null) => !!e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()) && !e.trim().endsWith(".invalid");
const telValido = (t: string | null) => (t ?? "").replace(/\D/g, "").length >= 10;

export const COLOR_ESTADO: Record<EstadoCheckin["estado"], string> = {
  "contestado": "text-[#2D6A4F]",
  "enviado":    "text-[#B7791F]",
  "sin-enviar": "text-[#1B4332]/35",
};

export function textoEstado(e: EstadoCheckin): string {
  if (e.estado === "contestado") return `Check-in contestado${e.contestadoEn ? ` · ${fCorta(e.contestadoEn)}` : ""}`;
  if (e.estado === "enviado") {
    const por = e.enviadoPor === "whatsapp" ? "por WhatsApp" : e.enviadoPor === "correo" ? "por correo" : e.enviadoPor === "correo+whatsapp" ? "por correo y WhatsApp" : "";
    return `Check-in enviado ${por}${e.enviadoEn ? ` · ${fCorta(e.enviadoEn)}` : ""} · sin contestar`;
  }
  return "Check-in sin enviar";
}

/** Las acciones (correo, WhatsApp, copiar liga) con su estado de carga y aviso. */
function useAcciones(r: ReservaCheckin, onEstado: (e: EstadoCheckin) => void) {
  const [cargando, setCargando] = useState<"" | "correo" | "whatsapp" | "liga">("");
  const [aviso, setAviso] = useState("");

  async function pedir(via: "correo" | "whatsapp" | "liga") {
    setAviso("");
    setCargando(via);
    // La ventana se abre YA, en el mismo clic: abrirla después del fetch la
    // bloquea Safari como ventana emergente.
    const ventana = via === "whatsapp" ? window.open("", "_blank") : null;
    try {
      const res = await fetch(`/api/admin/reservas/${r.id}/checkin`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ via }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        ventana?.close();
        setAviso(`❌ ${j.error || "No se pudo."}`);
        playError();
        return;
      }
      if (j.estado) onEstado(j.estado);
      if (via === "whatsapp" && j.waUrl) {
        if (ventana) ventana.location.href = j.waUrl; else window.location.href = j.waUrl;
        setAviso("✅ Se abrió WhatsApp con el mensaje listo. Solo dale enviar.");
      } else if (via === "correo") {
        setAviso(`✅ Check-in enviado a ${r.customerEmail}`);
      } else if (via === "liga" && j.link) {
        await navigator.clipboard.writeText(j.link).catch(() => {});
        setAviso(`✅ Liga copiada: ${j.link}`);
      }
      playSuccess();
    } catch {
      ventana?.close();
      setAviso("❌ Sin conexión. Intenta de nuevo.");
      playError();
    } finally {
      setCargando("");
    }
  }
  return { pedir, cargando, aviso };
}

function Acciones({ r, onEstado }: { r: ReservaCheckin; onEstado: (e: EstadoCheckin) => void }) {
  const { pedir, cargando, aviso } = useAcciones(r, onEstado);
  const hayTel = telValido(r.customerPhone);
  const hayCorreo = correoValido(r.customerEmail);
  const btn = "inline-flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-dm rounded-[7px] panel-pulsable panel-foco disabled:opacity-40 disabled:cursor-not-allowed";
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!hayTel || !!cargando} onClick={() => pedir("whatsapp")}
          title={hayTel ? "Abre WhatsApp con el mensaje y la liga" : "Esta reserva no tiene WhatsApp"}
          className={`${btn} bg-[#25D366] hover:bg-[#20ba59] text-white`}>
          {cargando === "whatsapp" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageCircle className="w-3.5 h-3.5" />}
          Por WhatsApp
        </button>
        <button type="button" disabled={!hayCorreo || !!cargando} onClick={() => pedir("correo")}
          title={hayCorreo ? `Lo manda a ${r.customerEmail}` : "Esta reserva no tiene correo"}
          className={`${btn} bg-[#1B4332] hover:bg-[#16362a] text-white`}>
          {cargando === "correo" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
          Por correo
        </button>
        <button type="button" disabled={!!cargando} onClick={() => pedir("liga")}
          className={`${btn} panel-card text-[#1B4332]`}>
          {cargando === "liga" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
          Copiar liga
        </button>
      </div>
      {!hayCorreo && !hayTel && (
        <p className="mt-2 text-[11px] font-dm text-[#1B4332]/55">Sin correo ni WhatsApp: copia la liga y mándala por donde tengas contacto.</p>
      )}
      {aviso && <p className="mt-2 text-[12px] font-dm text-[#1B4332] break-all">{aviso}</p>}
    </div>
  );
}

function Respuestas({ e }: { e: EstadoCheckin }) {
  const r = e.respuestas;
  if (!r) return null;
  const como = etiqueta(COMO_NOS_CONOCIO, r.comoNosConocio);
  const filas: [string, string][] = [
    ["Viene de", r.ciudadOrigen ?? ""],
    ["Viaja", etiqueta(TIPOS_GRUPO, r.tipoGrupo)],
    ["Nos conoció por", r.comoNosConocioOtro ? `${como} · ${r.comoNosConocioOtro}` : como],
    ["Primera vez en la Huasteca", r.primeraVez === null ? "" : r.primeraVez ? "Sí" : "No, ya había venido"],
    ["Motivo", etiqueta(MOTIVOS, r.motivo)],
    ["Cumpleaños", r.fechaNacimiento ? `${textoCumple(r.fechaNacimiento)}${r.aceptaPromos ? " · 🎁 aceptó el regalo" : " · no quiere promociones"}` : "No lo dio"],
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 mb-4">
      {filas.map(([k, v]) => (
        <div key={k}>
          <p className="text-[9px] tracking-[2px] uppercase text-[#1B4332]/40 font-dm mb-0.5">{k}</p>
          <p className="text-[#1B4332]/85 font-dm text-sm break-words">{v || "—"}</p>
        </div>
      ))}
    </div>
  );
}

function Satisfaccion({ e }: { e: EstadoCheckin }) {
  const s = e.satisfaccion;
  if (!s) return null;
  const mala = (s.calificacion ?? 5) <= 3;
  return (
    <div className={`mb-4 px-3 py-2 rounded-sm font-dm text-sm ${mala ? "bg-red-50 text-red-800" : "bg-[#2D6A4F]/10 text-[#1B4332]"}`}>
      <span className="font-medium">{"★".repeat(s.calificacion ?? 0)}{"☆".repeat(5 - (s.calificacion ?? 0))}</span>
      {s.recomendaria !== null && <span> · nos recomendaría {s.recomendaria}/10</span>}
      {s.comentario && <span className="block text-[13px] mt-1">«{s.comentario}»</span>}
    </div>
  );
}

/** La sección «Check-in» de la ficha de la reserva. Pide su estado al abrir. */
export function CheckinSeccion({ r, onEstado }: { r: ReservaCheckin; onEstado?: (e: EstadoCheckin) => void }) {
  const [e, setE] = useState<EstadoCheckin | null>(null);
  const [falla, setFalla] = useState(false);
  useEffect(() => {
    setFalla(false);
    fetch(`/api/admin/reservas/${r.id}/checkin`)
      .then(async (x) => {
        if (!x.ok) throw new Error(String(x.status));
        const estado: EstadoCheckin = (await x.json()).estado ?? SIN_CHECKIN;
        setE(estado);
        // Lo recién leído también pinta el botón de la lista (el cliente pudo
        // contestar después de que se cargó la página).
        onEstado?.(estado);
      })
      // Sin estado no se finge «sin enviar»: se dice que no se pudo leer.
      .catch(() => setFalla(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r.id]);
  const cambiar = (n: EstadoCheckin) => { setE(n); onEstado?.(n); };

  return (
    <section className="border-t border-[#1B4332]/10 pt-4">
      <h3 className="text-[10px] tracking-[2px] uppercase text-[#1B4332]/50 font-dm mb-3 flex items-center gap-1.5">
        <ClipboardCheck className={`w-3.5 h-3.5 ${e ? COLOR_ESTADO[e.estado] : ""}`} /> Check-in del cliente
      </h3>
      {!e ? (
        <p className="text-xs font-dm text-[#1B4332]/40">{falla ? "No pude leer el check-in. Cierra y vuelve a abrir la ficha." : "Cargando…"}</p>
      ) : (
        <>
          <p className={`text-xs font-dm mb-3 ${COLOR_ESTADO[e.estado]}`}>{textoEstado(e)}</p>
          <Respuestas e={e} />
          <Satisfaccion e={e} />
          {e.estado !== "contestado" && <Acciones r={r} onEstado={cambiar} />}
          {e.estado === "contestado" && (
            <details className="text-[11px] font-dm text-[#1B4332]/55">
              <summary className="cursor-pointer">Volver a mandarlo</summary>
              <div className="mt-2"><Acciones r={r} onEstado={cambiar} /></div>
            </details>
          )}
        </>
      )}
    </section>
  );
}

/**
 * El botón de la lista. `variante="icono"` para la fila de Reservas;
 * `"chip"` para la tarjeta del día en el Calendario.
 */
export function CheckinBoton({ r, estado, onEstado, variante = "icono" }: {
  r: ReservaCheckin;
  estado: EstadoCheckin | undefined;
  onEstado: (e: EstadoCheckin) => void;
  variante?: "icono" | "chip";
}) {
  const e = estado ?? SIN_CHECKIN;
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    const onKey = (ev: KeyboardEvent) => { if (ev.key === "Escape") { ev.stopPropagation(); setAbierto(false); } };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [abierto]);

  const abrir = (ev: React.MouseEvent) => { ev.stopPropagation(); setAbierto(true); };

  return (
    <>
      {variante === "icono" ? (
        <button type="button" onClick={abrir} title={textoEstado(e)} aria-label={textoEstado(e)}
          className={`${COLOR_ESTADO[e.estado]} hover:text-[#1B4332] transition-colors`}>
          <ClipboardCheck className="w-4 h-4" />
        </button>
      ) : (
        <button type="button" onClick={abrir} title={textoEstado(e)}
          className={`inline-flex items-center gap-1 text-[10px] font-dm px-2 py-0.5 rounded-full border transition-colors ${
            e.estado === "contestado" ? "border-[#2D6A4F]/30 bg-[#2D6A4F]/10 text-[#2D6A4F]"
            : e.estado === "enviado" ? "border-[#B7791F]/30 bg-[#B7791F]/10 text-[#8a5a12]"
            : "border-[#1B4332]/15 text-[#1B4332]/60 hover:border-[#1B4332]/40"}`}>
          <ClipboardCheck className="w-3 h-3" />
          {e.estado === "contestado" ? "Check-in ✓" : e.estado === "enviado" ? "Check-in enviado" : "Mandar check-in"}
        </button>
      )}

      {abierto && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 panel-seguro" onClick={(ev) => ev.stopPropagation()}>
          <div className="fixed inset-0 bg-black/45" onClick={() => setAbierto(false)} />
          <div className="relative panel-glass w-full max-w-lg rounded-[10px] p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="panel-eyebrow">Check-in previo al tour</p>
                <p className="font-cormorant text-[#1B4332] text-xl mt-0.5">{r.customerName}</p>
              </div>
              <button type="button" onClick={() => setAbierto(false)} className="text-[#1B4332]/40 hover:text-[#1B4332]" aria-label="Cerrar">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className={`text-xs font-dm mb-3 ${COLOR_ESTADO[e.estado]}`}>{textoEstado(e)}</p>
            <Respuestas e={e} />
            <p className="text-[11px] font-dm text-[#1B4332]/55 mb-3">
              El correo sale solo el día antes del tour. Usa esto para mandarlo a mano (sobre todo por WhatsApp a quien no dejó correo).
            </p>
            <Acciones r={r} onEstado={onEstado} />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
