"use client";

import { useState } from "react";
import { AlertTriangle, ArrowRightLeft, BedDouble, Bell, ExternalLink, MessageCircle, Plus, UserPlus, X } from "lucide-react";
import CobroModal from "@/components/admin/CobroModal";
import type { DatosPanel, PasajeroPanel, SalidaPanel } from "@/lib/viajeCdmx/admin";
import { rangoCorto, rangoLargo } from "@/lib/viajeCdmx/precio";
import { LIDER_PERSONAS, VIAJE_NOMBRE, VIAJE_RUTA } from "@/lib/viajeCdmx/config";

const fmx = (n: number) => `$${Math.round(n ?? 0).toLocaleString("es-MX")}`;
const tinta = "text-[#16362a]";
const media = "text-[rgba(22,54,42,0.66)]";
const suave = "text-[rgba(22,54,42,0.51)]";
const campo = "w-full border border-[rgba(27,67,50,0.15)] text-[#16362a] text-sm font-dm px-3 py-2 rounded-[7px] focus:outline-none focus:border-[#1B4332] bg-white";
const botonPrimario = "inline-flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-dm rounded-[7px] bg-[#1B4332] text-white hover:bg-[#16362a] disabled:opacity-50 panel-pulsable panel-foco";
const botonSecundario = "inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-dm rounded-[7px] border border-[rgba(27,67,50,0.15)] text-[#16362a] bg-white hover:border-[rgba(27,67,50,0.35)] disabled:opacity-50 panel-pulsable panel-foco";

const ESTADO_PUBLICO: Record<string, string> = {
  preventa: "En preventa", disponible: "A la venta", ultimos: "Últimos lugares", agotado: "Agotada",
  proxima: "Todavía no abre", cerrada: "Ventas cerradas",
};

/** «5214891234567» para wa.me, desde lo que haya tecleado la gente. */
function wa(tel: string | null | undefined, texto: string): string | null {
  const d = String(tel ?? "").replace(/\D/g, "");
  const n = d.length === 10 ? `52${d}` : d.length >= 11 ? d : "";
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(texto)}` : null;
}

async function post(url: string, body: unknown, method = "POST") {
  const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || "No se pudo."), { codigo: j.codigo });
  return j;
}

export default function SalidasClient({ inicial, puedeEditar, quien }: { inicial: DatosPanel; puedeEditar: boolean; quien: string }) {
  const [datos, setDatos] = useState(inicial);
  const [abierta, setAbierta] = useState<string | null>(inicial.salidas.find((s) => s.estado !== "cancelada" && s.fechaSalida >= new Date().toISOString().slice(0, 10))?.id ?? null);
  const [nueva, setNueva] = useState(false);
  const [aviso, setAviso] = useState("");

  async function recargar() {
    const r = await fetch("/api/admin/salidas", { cache: "no-store" });
    if (r.ok) setDatos(await r.json());
  }

  return (
    <div className="px-5 sm:px-7 py-6 max-w-[1100px] mx-auto font-dm">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className={`font-cormorant ${tinta} text-[28px] leading-none font-light mb-1`}>{VIAJE_NOMBRE}</h1>
          <p className={`${media} text-sm`}>Las salidas grupales de cada mes. Todo lo que se vende aquí gasta lugar en la camioneta, igual que en el sitio.</p>
        </div>
        <div className="flex gap-2">
          <a href={VIAJE_RUTA} target="_blank" rel="noopener noreferrer" className={botonSecundario}><ExternalLink className="w-3.5 h-3.5" /> Ver la página</a>
          {puedeEditar && <button onClick={() => setNueva((v) => !v)} className={botonPrimario}><Plus className="w-3.5 h-3.5" /> Nueva salida</button>}
        </div>
      </div>

      {aviso && <p className="panel-card px-4 py-3 mb-4 text-sm text-[#2b845c]" role="status">{aviso}</p>}

      {nueva && puedeEditar && (
        <div className="panel-card panel-card-alta p-5 mb-6">
          <h2 className={`font-cormorant ${tinta} text-lg font-light mb-4`}>Nueva salida</h2>
          <FormSalida
            valores={{ ...datos.omision, fechaSalida: "", precio: "", precioPreventa: "", estado: "borrador", hotelBloqueado: false, notas: "" }}
            onGuardar={async (v) => {
              await post("/api/admin/salidas", v);
              setNueva(false);
              setAviso("Salida creada. Queda en borrador hasta que la publiques.");
              await recargar();
            }}
          />
        </div>
      )}

      {datos.salidas.length === 0 && !nueva && (
        <p className={`panel-card p-5 text-sm ${media}`}>
          Todavía no hay salidas. {puedeEditar ? "Crea la primera con «Nueva salida»." : "Pídele a Manolo que cree la primera."}
        </p>
      )}

      <div className="space-y-3">
        {datos.salidas.map((s) => (
          <TarjetaSalida
            key={s.id}
            s={s}
            todas={datos.salidas}
            abierta={abierta === s.id}
            onAbrir={() => setAbierta(abierta === s.id ? null : s.id)}
            puedeEditar={puedeEditar}
            quien={quien}
            onCambio={async (msg) => { if (msg) setAviso(msg); await recargar(); }}
          />
        ))}
      </div>

      <Lideres lideres={datos.lideres} onCambio={recargar} />

      {datos.siguiente.length > 0 && (
        <div className="panel-card p-5 mt-6">
          <h2 className={`font-cormorant ${tinta} text-lg font-light mb-1`}>Esperan la siguiente fecha</h2>
          <p className={`text-xs ${suave} mb-3`}>Les llega un correo solo cuando abre una fecha con lugar.</p>
          <ListaDeEspera filas={datos.siguiente} onCambio={recargar} />
        </div>
      )}
    </div>
  );
}

// ── Una salida ──────────────────────────────────────────────────────────────

function TarjetaSalida({ s, todas, abierta, onAbrir, puedeEditar, quien, onCambio }: {
  s: SalidaPanel; todas: SalidaPanel[]; abierta: boolean; onAbrir: () => void; puedeEditar: boolean; quien: string;
  onCambio: (msg?: string) => Promise<void>;
}) {
  const [tab, setTab] = useState<"pasajeros" | "espera" | "editar">("pasajeros");
  const pct = (n: number) => `${Math.min(100, (n / Math.max(1, s.capacidad)) * 100)}%`;
  const bajoMinimo = s.estado === "publicada" && s.confirmados < s.minimo;
  const vivos = s.pasajeros.filter((p) => p.status !== "cancelled");

  return (
    <div className={`panel-card ${abierta ? "panel-card-alta" : ""}`}>
      <button onClick={onAbrir} className="w-full text-left p-4 sm:p-5 panel-foco rounded-[10px]">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className={`font-cormorant ${tinta} text-2xl leading-none`}>{rangoLargo(s.fechaSalida, s.fechaRegreso)}</p>
          <p className="text-[11px] uppercase tracking-[0.12em]">
            <span className={s.estado === "publicada" ? "text-[#2b845c]" : s.estado === "cancelada" ? "text-[#b8413f]" : suave}>{s.estado}</span>
            {s.estado === "publicada" && <span className={suave}> · {ESTADO_PUBLICO[s.estadoPublico]}</span>}
          </p>
        </div>
        <div className="mt-3 h-2.5 rounded-full bg-[rgba(27,67,50,0.08)] overflow-hidden flex" aria-hidden="true">
          <div className="h-full bg-[#2b845c]" style={{ width: pct(s.confirmados) }} />
          <div className="h-full bg-[#e0a84a]" style={{ width: pct(s.enPago) }} />
        </div>
        <div className={`mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs ${media}`}>
          <span><strong className={tinta}>{s.confirmados}</strong> de {s.capacidad} lugares</span>
          {s.enPago > 0 && <span className="text-[#a86814]">{s.enPago} pagando ahora</span>}
          <span>{s.libres} libres</span>
          <span className={bajoMinimo ? "text-[#b8413f]" : ""}>mínimo {s.minimo}</span>
          <span>{fmx(s.precioVigente)} hoy{s.precioPreventa && s.finPreventa ? ` · preventa hasta ${s.finPreventa}` : ""}</span>
          <span>corte {s.fechaCorte}</span>
          <span>cobrado {fmx(s.cobrado)} · por cobrar {fmx(s.porCobrar)}</span>
        </div>
        {!s.hotelBloqueado && s.estado !== "cancelada" && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-[#a86814]">
            <BedDouble className="w-3.5 h-3.5" /> Falta marcar que los cuartos de Paraíso están bloqueados en la hoja del hotel
          </p>
        )}
        {s.pasajeros.some((p) => p.sobrecupo && p.status !== "cancelled") && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-[#b8413f]"><AlertTriangle className="w-3.5 h-3.5" /> Hay un pago con SOBRECUPO: muévelo o sube el cupo</p>
        )}
      </button>

      {abierta && (
        <div className="border-t border-[rgba(27,67,50,0.10)] p-4 sm:p-5">
          <div className="flex flex-wrap gap-1.5 mb-4">
            {([
              ["pasajeros", `Pasajeros (${vivos.length})`],
              ["espera", `Lista de espera (${s.espera.length})`],
              ...(puedeEditar ? [["editar", "Editar salida"] as const] : []),
            ] as const).map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)}
                className={`px-3 py-1.5 text-[12px] rounded-[7px] border panel-pulsable panel-foco ${tab === id ? "bg-[#1B4332] text-white border-[#1B4332]" : `bg-white border-[rgba(27,67,50,0.15)] ${media}`}`}>
                {label}
              </button>
            ))}
          </div>

          {tab === "pasajeros" && <Pasajeros s={s} todas={todas} puedeEditar={puedeEditar} quien={quien} onCambio={onCambio} />}
          {tab === "espera" && (
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <button
                  className={botonSecundario}
                  disabled={!s.espera.length || s.libres <= 0}
                  onClick={async () => {
                    try {
                      const r = await post("/api/admin/salidas/acciones", { accion: "avisar-espera", salidaId: s.id });
                      await onCambio(`Aviso enviado por correo a ${r.avisados} persona(s).`);
                    } catch (e) { alertaSuave(e); }
                  }}
                >
                  <Bell className="w-3.5 h-3.5" /> Avisar a toda la lista por correo
                </button>
                <span className={`text-xs ${suave}`}>
                  {s.libres > 0 ? `Hay ${s.libres} libre(s). El sitio también avisa solo cada hora.` : "Sin lugares libres: no hay nada que avisar todavía."}
                </span>
              </div>
              <ListaDeEspera filas={s.espera} onCambio={() => onCambio()} textoWa={`Hola, se liberó un lugar en el ${VIAJE_NOMBRE} del ${rangoLargo(s.fechaSalida, s.fechaRegreso)}. ¿Lo quieres? Apártalo aquí: https://www.huasteca-potosina.com${VIAJE_RUTA}?fecha=${s.fechaSalida}`} />
            </div>
          )}
          {tab === "editar" && puedeEditar && (
            <FormSalida
              valores={{
                fechaSalida: s.fechaSalida, fechaRegreso: s.fechaRegreso, capacidad: s.capacidad, minimo: s.minimo,
                precio: s.precio, precioPreventa: s.precioPreventa ?? "", abreEl: s.abreEl, finPreventa: s.finPreventa ?? "",
                fechaCorte: s.fechaCorte, saldoDiasAntes: s.saldoDiasAntes, estado: s.estado, hotelBloqueado: s.hotelBloqueado, notas: s.notas ?? "",
              }}
              onGuardar={async (v) => {
                try {
                  await post(`/api/admin/salidas/${s.id}`, v, "PATCH");
                } catch (e) {
                  if ((e as { codigo?: string }).codigo === "cupo-bajo" && confirm(`${(e as Error).message}\n\n¿Bajar el cupo de todos modos?`)) {
                    await post(`/api/admin/salidas/${s.id}`, { ...v, forzar: true }, "PATCH");
                  } else throw e;
                }
                await onCambio("Salida guardada. El precio nuevo vale para lo que se aparte de aquí en adelante.");
              }}
              edicion
            />
          )}
        </div>
      )}
    </div>
  );
}

function alertaSuave(e: unknown) {
  // Sin `alert()`: se avisa en la consola y en el propio botón vía el error que regresa.
  console.warn(e);
  window.alert((e as Error)?.message || "No se pudo.");
}

// ── Pasajeros ───────────────────────────────────────────────────────────────

function Pasajeros({ s, todas, puedeEditar, quien, onCambio }: {
  s: SalidaPanel; todas: SalidaPanel[]; puedeEditar: boolean; quien: string; onCambio: (msg?: string) => Promise<void>;
}) {
  const [agregar, setAgregar] = useState(false);
  const [moviendo, setMoviendo] = useState<string | null>(null);
  const [destino, setDestino] = useState("");
  const [cobrando, setCobrando] = useState<PasajeroPanel | null>(null);
  const [error, setError] = useState("");
  const destinos = todas.filter((x) => x.id !== s.id && x.estado !== "cancelada" && x.fechaSalida >= new Date().toISOString().slice(0, 10));

  async function accion(body: Record<string, unknown>, msg: string) {
    setError("");
    try {
      await post("/api/admin/salidas/acciones", body);
      await onCambio(msg);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div>
      {error && <p className="text-sm text-[#b8413f] mb-3" role="alert">{error}</p>}
      {s.pasajeros.length === 0 ? (
        <p className={`text-sm ${suave} mb-3`}>Todavía nadie en esta salida.</p>
      ) : (
        <div className="overflow-x-auto -mx-1 mb-4">
          <table className="panel-tabla w-full text-sm min-w-[720px]">
            <thead><tr><th className="text-left">Pasajero</th><th>Pers.</th><th className="text-right">Total</th><th className="text-right">Pagado</th><th className="text-right">Saldo</th><th className="text-left">Origen</th><th /></tr></thead>
            <tbody>
              {s.pasajeros.map((p) => {
                const cancelado = p.status === "cancelled";
                const ligaWa = wa(p.telefono, `Hola ${p.nombre.split(" ")[0]}, te escribimos de Tours Huasteca por tu lugar en el ${VIAJE_NOMBRE} del ${rangoLargo(s.fechaSalida, s.fechaRegreso)} (folio ${p.folio}).`);
                return (
                  <tr key={p.id} className={cancelado ? "opacity-45" : ""}>
                    <td className="py-2 px-3">
                      <p className={tinta}>{p.nombre} {p.sobrecupo && !cancelado && <span className="text-[#b8413f] text-xs">· SOBRECUPO</span>}</p>
                      <p className={`text-[11px] ${suave}`}>{p.folio}{p.liderCodigo ? ` · líder ${p.liderCodigo}` : ""}{p.metodo ? ` · ${p.metodo}` : ""}{cancelado ? " · cancelada" : ""}</p>
                    </td>
                    <td className={`text-center panel-cifra ${tinta}`}>{p.personas}</td>
                    <td className={`text-right panel-cifra ${tinta}`}>{fmx(p.total)}</td>
                    <td className="text-right panel-cifra text-[#2b845c]">{fmx(p.pagado)}</td>
                    <td className={`text-right panel-cifra ${p.saldo > 0 ? "text-[#a86814]" : suave}`}>{fmx(p.saldo)}</td>
                    <td className={`text-[12px] ${media} px-3`}>{p.origen}</td>
                    <td className="py-2 px-2">
                      {!cancelado && (
                        <div className="flex flex-wrap justify-end gap-1">
                          {ligaWa && <a href={ligaWa} target="_blank" rel="noopener noreferrer" className={botonSecundario} title="WhatsApp"><MessageCircle className="w-3.5 h-3.5" /></a>}
                          {p.saldo > 0 && <button className={botonSecundario} onClick={() => setCobrando(p)}>Cobro</button>}
                          <button className={botonSecundario} onClick={() => { setMoviendo(moviendo === p.id ? null : p.id); setDestino(""); }}><ArrowRightLeft className="w-3.5 h-3.5" /> Mover</button>
                          <button
                            className={botonSecundario}
                            onClick={() => {
                              if (confirm(`¿Cancelar el lugar de ${p.nombre} (${p.personas} persona(s))? El reembolso, si toca, se hace a mano en Stripe.`)) {
                                accion({ accion: "cancelar", reservaId: p.id }, `Lugar de ${p.nombre} cancelado: ${p.personas} lugar(es) de vuelta.`);
                              }
                            }}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      {moviendo === p.id && (
                        <div className="flex items-center gap-2 mt-2 justify-end">
                          <select className={`${campo} w-auto`} value={destino} onChange={(e) => setDestino(e.target.value)}>
                            <option value="">¿A qué fecha?</option>
                            {destinos.map((d) => (
                              <option key={d.id} value={d.id} disabled={d.libres < p.personas}>
                                {rangoCorto(d.fechaSalida, d.fechaRegreso)} · {d.libres} libres
                              </option>
                            ))}
                          </select>
                          <button className={botonPrimario} disabled={!destino}
                            onClick={() => accion({ accion: "mover", reservaId: p.id, destinoId: destino }, `${p.nombre} movido de fecha.`).then(() => setMoviendo(null))}>
                            Mover
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {s.apartados.length > 0 && (
        <p className={`text-xs ${media} mb-3`}>
          Pagando en este momento: {s.apartados.map((a) => `${a.nombre} (${a.personas}${a.metodo === "oxxo" ? ", ficha OXXO" : ""})`).join(" · ")}
        </p>
      )}

      {s.estado !== "cancelada" && (
        agregar
          ? <AgregarPasajero s={s} puedeCortesia={puedeEditar} onListo={async (msg) => { setAgregar(false); await onCambio(msg); }} onCancelar={() => setAgregar(false)} />
          : <button className={botonSecundario} onClick={() => setAgregar(true)} disabled={s.libres <= 0}><UserPlus className="w-3.5 h-3.5" /> Agregar venta por WhatsApp</button>
      )}

      {cobrando && (
        <CobroModal
          reserva={{ id: cobrando.id, confirmationNumber: cobrando.folio, customerName: cobrando.nombre, totalAmount: cobrando.total, depositoPagado: cobrando.pagado, stripePaymentIntentId: cobrando.stripePaymentIntentId }}
          quien={quien}
          onClose={() => setCobrando(null)}
          onGuardado={async () => { setCobrando(null); await onCambio("Cobro registrado."); }}
        />
      )}
    </div>
  );
}

function AgregarPasajero({ s, puedeCortesia, onListo, onCancelar }: {
  s: SalidaPanel; puedeCortesia: boolean; onListo: (msg: string) => Promise<void>; onCancelar: () => void;
}) {
  const [d, setD] = useState({ nombre: "", telefono: "", email: "", personas: 1, precioUnitario: String(s.precioVigente), cortesia: false, liderCodigo: "", nota: "", origen: "whatsapp" });
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  return (
    <form
      className="panel-card p-4 space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(""); setEnviando(true);
        try {
          const r = await post("/api/admin/salidas/acciones", { accion: "agregar", salidaId: s.id, pasajero: { ...d, precioUnitario: Number(d.precioUnitario) } });
          await onListo(`Venta guardada (${r.folio}). Registra el anticipo con «Cobro».`);
        } catch (err) { setError((err as Error).message); } finally { setEnviando(false); }
      }}
    >
      <p className={`text-sm ${tinta} font-medium`}>Venta por fuera del sitio · quedan {s.libres}</p>
      <div className="grid sm:grid-cols-3 gap-2">
        <input className={campo} placeholder="Nombre" required value={d.nombre} onChange={(e) => setD({ ...d, nombre: e.target.value })} />
        <input className={campo} placeholder="WhatsApp" value={d.telefono} onChange={(e) => setD({ ...d, telefono: e.target.value })} />
        <input className={campo} placeholder="Correo (para su liga del saldo)" type="email" value={d.email} onChange={(e) => setD({ ...d, email: e.target.value })} />
      </div>
      <div className="grid sm:grid-cols-4 gap-2">
        <label className={`text-xs ${media}`}>Personas
          <input className={campo} type="number" min={1} max={s.libres} value={d.personas} onChange={(e) => setD({ ...d, personas: Number(e.target.value) })} />
        </label>
        <label className={`text-xs ${media}`}>Precio por persona
          <input className={campo} type="number" min={0} disabled={d.cortesia} value={d.precioUnitario} onChange={(e) => setD({ ...d, precioUnitario: e.target.value })} />
        </label>
        <label className={`text-xs ${media}`}>Código de líder
          <input className={campo} value={d.liderCodigo} onChange={(e) => setD({ ...d, liderCodigo: e.target.value.toUpperCase() })} />
        </label>
        <label className={`text-xs ${media}`}>Por dónde
          <select className={campo} value={d.origen} onChange={(e) => setD({ ...d, origen: e.target.value })}>
            <option value="whatsapp">WhatsApp</option><option value="telefono">Teléfono</option><option value="walkin">En persona</option>
          </select>
        </label>
      </div>
      {puedeCortesia && (
        <label className={`flex items-center gap-2 text-sm ${tinta}`}>
          <input type="checkbox" checked={d.cortesia} onChange={(e) => setD({ ...d, cortesia: e.target.checked })} />
          Lugar de cortesía (el del líder: {LIDER_PERSONAS} pagados = 1 gratis). Total $0.
        </label>
      )}
      <input className={campo} placeholder="Nota interna (opcional)" value={d.nota} onChange={(e) => setD({ ...d, nota: e.target.value })} />
      {error && <p className="text-sm text-[#b8413f]" role="alert">{error}</p>}
      <div className="flex gap-2">
        <button className={botonPrimario} disabled={enviando}>{enviando ? "Guardando…" : "Guardar venta"}</button>
        <button type="button" className={botonSecundario} onClick={onCancelar}>Cancelar</button>
      </div>
    </form>
  );
}

// ── Lista de espera ─────────────────────────────────────────────────────────

function ListaDeEspera({ filas, onCambio, textoWa }: {
  filas: DatosPanel["siguiente"]; onCambio: () => Promise<void> | void; textoWa?: string;
}) {
  if (!filas.length) return <p className={`text-sm ${suave}`}>Nadie en la lista.</p>;
  return (
    <ul className="divide-y divide-[rgba(27,67,50,0.07)] border border-[rgba(27,67,50,0.10)] rounded-[7px]">
      {filas.map((e) => {
        const liga = wa(e.whatsapp, textoWa ?? `Hola ${e.nombre.split(" ")[0]}, te escribimos de Tours Huasteca por el ${VIAJE_NOMBRE}: ya abrió una fecha nueva.`);
        return (
          <li key={e.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm">
            <span className="min-w-0 flex-1">
              <span className={`block ${tinta}`}>{e.nombre} · {e.personas} persona(s)</span>
              <span className={`block text-[11px] ${suave}`}>{e.email}{e.whatsapp ? ` · ${e.whatsapp}` : ""} · {e.estado === "avisado" ? `avisado ${e.avisadoEl?.slice(0, 10) ?? ""}` : "esperando"}</span>
            </span>
            {liga && <a href={liga} target="_blank" rel="noopener noreferrer" className={botonSecundario}><MessageCircle className="w-3.5 h-3.5" /> WhatsApp</a>}
            <button className={botonSecundario} onClick={async () => { await post("/api/admin/salidas/acciones", { accion: "espera-estado", id: e.id, estado: "aparto" }); await onCambio(); }}>Ya apartó</button>
            <button className={botonSecundario} onClick={async () => { await post("/api/admin/salidas/acciones", { accion: "espera-estado", id: e.id, estado: "baja" }); await onCambio(); }}>Quitar</button>
          </li>
        );
      })}
    </ul>
  );
}

// ── Líderes ─────────────────────────────────────────────────────────────────

function Lideres({ lideres, onCambio }: { lideres: DatosPanel["lideres"]; onCambio: () => Promise<void> }) {
  if (!lideres.length) return null;
  return (
    <div className="panel-card p-5 mt-6">
      <h2 className={`font-cormorant ${tinta} text-lg font-light mb-1`}>Líderes de grupo</h2>
      <p className={`text-xs ${suave} mb-3`}>Con {LIDER_PERSONAS} lugares pagados con su código, su lugar gratis se agrega desde la salida con «Agregar venta» → cortesía.</p>
      <ul className="divide-y divide-[rgba(27,67,50,0.07)] border border-[rgba(27,67,50,0.10)] rounded-[7px]">
        {lideres.filter((l) => l.estado !== "descartado").map((l) => {
          const liga = wa(l.whatsapp, `Hola ${l.nombre.split(" ")[0]}, te escribimos de Tours Huasteca por tu grupo para el ${VIAJE_NOMBRE}. Tu liga: https://www.huasteca-potosina.com${VIAJE_RUTA}?lider=${l.codigo}`);
          const listo = l.pagados >= l.meta;
          return (
            <li key={l.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm">
              <span className="min-w-0 flex-1">
                <span className={`block ${tinta}`}>{l.nombre} · <strong>{l.codigo}</strong></span>
                <span className={`block text-[11px] ${suave}`}>~{l.personasEstimadas} personas · {l.email} · {l.whatsapp}</span>
              </span>
              <span className={`panel-cifra text-sm ${listo ? "text-[#2b845c]" : media}`}>{l.pagados}/{l.meta} pagados{l.apartados ? ` · ${l.apartados} sin anticipo` : ""}{listo ? " · ¡ya viaja gratis!" : ""}</span>
              {liga && <a href={liga} target="_blank" rel="noopener noreferrer" className={botonSecundario}><MessageCircle className="w-3.5 h-3.5" /></a>}
              <select className={`${campo} w-auto`} value={l.estado} onChange={async (e) => { await post("/api/admin/salidas/acciones", { accion: "lider-estado", id: l.id, estado: e.target.value }); await onCambio(); }}>
                <option value="nuevo">Nuevo</option><option value="contactado">Contactado</option><option value="confirmado">Confirmado</option><option value="descartado">Descartado</option>
              </select>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── Formulario de salida ────────────────────────────────────────────────────

type Valores = Record<string, string | number | boolean | null | undefined>;

function FormSalida({ valores, onGuardar, edicion = false }: { valores: Valores; onGuardar: (v: Valores) => Promise<void>; edicion?: boolean }) {
  const [v, setV] = useState<Valores>(valores);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const set = (k: string, x: unknown) => setV((prev) => ({ ...prev, [k]: x as never }));
  const num = (k: string) => (v[k] === "" || v[k] == null ? "" : String(v[k]));

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(""); setEnviando(true);
        try {
          await onGuardar({
            ...v,
            capacidad: Number(v.capacidad), minimo: Number(v.minimo), precio: Number(v.precio),
            precioPreventa: v.precioPreventa === "" ? null : Number(v.precioPreventa),
            finPreventa: v.precioPreventa === "" ? null : v.finPreventa || null,
            saldoDiasAntes: Number(v.saldoDiasAntes),
          });
        } catch (err) { setError((err as Error).message); } finally { setEnviando(false); }
      }}
    >
      <div className="grid sm:grid-cols-4 gap-3">
        <Campo label="Sale el"><input className={campo} type="date" required value={String(v.fechaSalida ?? "")} onChange={(e) => set("fechaSalida", e.target.value)} /></Campo>
        <Campo label="Regresa el"><input className={campo} type="date" value={String(v.fechaRegreso ?? "")} onChange={(e) => set("fechaRegreso", e.target.value)} /></Campo>
        <Campo label="Cupo"><input className={campo} type="number" min={1} max={60} value={num("capacidad")} onChange={(e) => set("capacidad", e.target.value)} /></Campo>
        <Campo label="Mínimo para salir"><input className={campo} type="number" min={1} value={num("minimo")} onChange={(e) => set("minimo", e.target.value)} /></Campo>
      </div>
      <div className="grid sm:grid-cols-4 gap-3">
        <Campo label="Precio por persona"><input className={campo} type="number" min={100} required value={num("precio")} onChange={(e) => set("precio", e.target.value)} /></Campo>
        <Campo label="Precio de preventa"><input className={campo} type="number" min={0} placeholder="Sin preventa" value={num("precioPreventa")} onChange={(e) => set("precioPreventa", e.target.value)} /></Campo>
        <Campo label="Abre el"><input className={campo} type="date" value={String(v.abreEl ?? "")} onChange={(e) => set("abreEl", e.target.value)} /></Campo>
        <Campo label="Preventa hasta el"><input className={campo} type="date" disabled={v.precioPreventa === ""} value={String(v.finPreventa ?? "")} onChange={(e) => set("finPreventa", e.target.value)} /></Campo>
      </div>
      <div className="grid sm:grid-cols-4 gap-3">
        <Campo label="Corte (último día para apartar)"><input className={campo} type="date" value={String(v.fechaCorte ?? "")} onChange={(e) => set("fechaCorte", e.target.value)} /></Campo>
        <Campo label="Saldo: días antes de salir"><input className={campo} type="number" min={0} max={60} value={num("saldoDiasAntes")} onChange={(e) => set("saldoDiasAntes", e.target.value)} /></Campo>
        <Campo label="Estado">
          <select className={campo} value={String(v.estado ?? "borrador")} onChange={(e) => set("estado", e.target.value)}>
            <option value="borrador">Borrador (no se ve)</option><option value="publicada">Publicada</option><option value="cancelada">Cancelada</option>
          </select>
        </Campo>
        <label className={`flex items-end gap-2 text-sm ${tinta} pb-2`}>
          <input type="checkbox" checked={!!v.hotelBloqueado} onChange={(e) => set("hotelBloqueado", e.target.checked)} />
          Cuartos bloqueados en Paraíso
        </label>
      </div>
      <Campo label="Notas internas"><input className={campo} value={String(v.notas ?? "")} onChange={(e) => set("notas", e.target.value)} /></Campo>
      {!edicion && <p className={`text-xs ${suave}`}>Se propone corte 21 días antes y preventa de 3 semanas desde que abre. Escalona las fechas de apertura para que no acaben todas las preventas el mismo día.</p>}
      {error && <p className="text-sm text-[#b8413f]" role="alert">{error}</p>}
      <button className={botonPrimario} disabled={enviando}>{enviando ? "Guardando…" : edicion ? "Guardar cambios" : "Crear salida"}</button>
    </form>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className={`block text-xs ${media} space-y-1`}><span className="panel-eyebrow block">{label}</span>{children}</label>;
}
