"use client";

import { useState } from "react";
import { Phone, MapPin, Send, Copy, Check } from "lucide-react";
import type { SalidaOperativa, RegistroSalida } from "@/lib/admin/salidasDia";
import { ETIQUETA_ESTADO_SALIDA, numerosDeSalida, simularMargen } from "@/lib/admin/salidas";
import { avanceChecklist, type ItemChecklist } from "@/lib/admin/checklistSalida";
import { colorDeTour } from "@/lib/admin/coloresTour";
import { ORIGEN_ETIQUETA } from "@/lib/origenReserva";
import { playClick, playSuccess, playError } from "@/lib/admin/sfx";
import { EncabezadoPagina } from "@/components/admin/ui/EncabezadoPagina";
import { ChipEstado } from "@/components/admin/ui/ChipEstado";
import { TONO_ESTADO_SALIDA, fechaLarga, fmx } from "../comun";

const ESTADOS: { clave: RegistroSalida["estado"]; etiqueta: string }[] = [
  { clave: "programada", etiqueta: "Programada" }, { clave: "confirmada", etiqueta: "Confirmada" },
  { clave: "operada", etiqueta: "Operada" }, { clave: "cancelada", etiqueta: "Cancelada" },
];
const PAGO = { pagado: { t: "Pagado", tono: "bien" }, ota: { t: "Pagado vía OTA", tono: "neutro" }, saldo: { t: "Saldo en sitio", tono: "atencion" } } as const;
const input = "w-full rounded-[var(--panel-radio-sm)] border border-[var(--panel-borde)] bg-white px-3 py-2.5 text-[16px] font-dm text-[var(--panel-tinta)] panel-foco";

export default function SalidaDetalleClient({ inicial, quien, puedeAsignar, verDinero }: { inicial: SalidaOperativa; quien: string; puedeAsignar: boolean; verDinero: boolean }) {
  const s = inicial;
  const [registro, setRegistro] = useState<RegistroSalida>(s.registro);
  const [guardado, setGuardado] = useState<RegistroSalida>(s.registro);
  const [checklist, setChecklist] = useState<ItemChecklist[]>(s.checklist);
  const [nuevoItem, setNuevoItem] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [msj, setMsj] = useState<{ texto: string; error?: boolean; lista?: boolean } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const av = avanceChecklist(checklist);

  async function guardar(cambios: Record<string, unknown>) {
    setGuardando(true); setMsj(null);
    try {
      const r = await fetch("/api/admin/salidas-dia", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clave: s.clave, ...cambios }) });
      const d = await r.json().catch(() => null);
      if (!r.ok || !d?.ok) { playError(); setMsj({ texto: d?.error || "No se pudo guardar", error: true, lista: "marcar" in cambios || "agregar" in cambios }); return false; }
      // Marcar el checklist no toca lo que se está escribiendo en Operación.
      const deLista = "marcar" in cambios || "agregar" in cambios;
      if (!deLista) setRegistro(d.registro);
      setGuardado(d.registro); setChecklist(d.checklist); playSuccess(); setMsj({ texto: "Guardado", lista: deLista });
      return true;
    } catch { playError(); setMsj({ texto: "No se pudo guardar", error: true }); return false; }
    finally { setGuardando(false); }
  }
  // Un renglón a la vez (revisión del 4 nov 2026): mandar la lista entera
  // pisaba lo que otra persona marcó desde su celular. Si falla, se deshace.
  function marcar(clave: string) {
    const antes = checklist;
    const item = checklist.find(i => i.clave === clave);
    if (!item) return;
    setChecklist(checklist.map(i => i.clave === clave ? { ...i, hecho: !i.hecho } : i)); // optimista
    void guardar({ marcar: { clave, hecho: !item.hecho } }).then(ok => { if (!ok) setChecklist(antes); });
  }
  function agregarItem() {
    const texto = nuevoItem.trim();
    if (!texto) return;
    const antes = checklist;
    setChecklist([...checklist, { clave: `x-${Date.now().toString(36)}`, texto, hecho: false, propio: true }]); setNuevoItem("");
    void guardar({ agregar: texto }).then(ok => { if (!ok) { setChecklist(antes); setNuevoItem(texto); } });
  }
  // Solo lo que cambió respecto a lo guardado: no se pisa lo que otro guardó.
  function cambiosDeOperacion(): Record<string, unknown> {
    const c: Record<string, unknown> = {};
    for (const k of ["guia", "vehiculo", "estado", "tipo", "notas"] as const) if (registro[k] !== guardado[k]) c[k] = registro[k];
    return c;
  }

  // La lista para el guía, lista para pegar en WhatsApp.
  const listaTexto = [
    `${s.tourNombre} · ${fechaLarga(s.fecha)}`,
    `${s.personas} persona${s.personas === 1 ? "" : "s"}${s.cupo !== null ? ` de ${s.cupo}` : ""}${registro.guia ? ` · Guía: ${registro.guia}` : ""}`,
    "",
    ...s.pasajeros.map(p => `• ${p.cliente} · ${p.personas}p${p.idioma === "en" ? " · inglés" : ""}${p.hospedaje ? ` · ${p.hospedaje}` : ""}${p.telefono ? ` · ${p.telefono}` : ""}${p.pago === "saldo" ? ` · cobrar ${fmx(p.saldo)}` : ""}`),
    ...(s.protocolo ? ["", `Punto de encuentro: ${s.protocolo.lugar}${s.protocolo.hora ? ` ${s.protocolo.hora}` : ""}`] : []),
  ].join("\n");
  async function copiar() {
    try { await navigator.clipboard.writeText(listaTexto); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch { setMsj({ texto: "No se pudo copiar", error: true }); }
  }
  const n = numerosDeSalida(s.monto, s.personas, s.conceptos);
  const simulacion = s.precioPorPax > 0 ? simularMargen(s.precioPorPax, s.conceptos, 6) : [];

  return (
    <div className="mt-3">
      <EncabezadoPagina
        titulo={s.tourNombre}
        subtitulo={`${fechaLarga(s.fecha)} · ${s.personas}${s.cupo !== null ? ` / ${s.cupo}` : ""} personas · ${registro.tipo === "privada" ? "privada" : "compartida"}`}
        acciones={<ChipEstado tono={TONO_ESTADO_SALIDA[s.estadoPax]}>{ETIQUETA_ESTADO_SALIDA[s.estadoPax]}</ChipEstado>}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-5">
          {/* Pasajeros */}
          <section className="panel-card overflow-hidden">
            <h2 className="px-4 pt-4 font-cormorant text-[22px] text-[var(--panel-tinta)]">Pasajeros</h2>
            <div className="overflow-x-auto">
              <table className="panel-tabla w-full min-w-[560px] text-[13px] font-dm">
                <thead><tr><th className="px-4 py-2 text-left">Cliente</th><th className="px-2 py-2 text-right">Pax</th><th className="px-2 py-2 text-left">Canal</th><th className="px-2 py-2 text-left">Pago</th><th className="px-4 py-2 text-left">Notas</th></tr></thead>
                <tbody>
                  {s.pasajeros.map(p => (
                    <tr key={p.bookingId}>
                      <td className="px-4 py-2.5 align-top">
                        <p className="font-medium text-[var(--panel-tinta)]">{p.cliente}{p.idioma === "en" && <span className="ml-1 text-[10px] text-[#1a4e8a]">EN</span>}</p>
                        <p className="font-mono text-[10px] text-[var(--panel-tinta-suave)]">{p.folio}</p>
                        <p className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-[var(--panel-tinta-media)]">
                          {p.telefono ? <a href={`https://wa.me/${p.telefono.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#1f7a4d] hover:underline"><Phone className="h-3 w-3" aria-hidden="true" />{p.telefono}</a> : <span className="text-[var(--panel-atencion)]">Sin teléfono</span>}
                          <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" aria-hidden="true" />{p.hospedaje ?? <span className="text-[var(--panel-atencion)]">Sin hospedaje anotado</span>}</span>
                        </p>
                      </td>
                      <td className="panel-cifra px-2 py-2.5 text-right align-top">{p.personas}</td>
                      <td className="px-2 py-2.5 align-top text-[12px] text-[var(--panel-tinta-media)]">{ORIGEN_ETIQUETA[p.canal].split(" (")[0]}</td>
                      <td className="px-2 py-2.5 align-top"><ChipEstado tono={PAGO[p.pago].tono}>{PAGO[p.pago].t}{p.pago === "saldo" ? ` ${fmx(p.saldo)}` : ""}</ChipEstado></td>
                      <td className="px-4 py-2.5 align-top text-[12px] text-[var(--panel-tinta-media)]">{p.notas || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-[var(--panel-borde)] px-4 py-3">
              <a href={`https://wa.me/?text=${encodeURIComponent(listaTexto)}`} target="_blank" rel="noopener noreferrer"
                className="panel-foco panel-pulsable inline-flex min-h-[44px] items-center gap-2 rounded-[var(--panel-radio-sm)] bg-[var(--panel-acento)] px-4 text-[13px] font-dm font-semibold text-white">
                <Send className="h-4 w-4" aria-hidden="true" />Mandar la lista al guía
              </a>
              <button type="button" onClick={() => { playClick(); copiar(); }}
                className="panel-foco panel-pulsable inline-flex min-h-[44px] items-center gap-2 rounded-[var(--panel-radio-sm)] border border-[var(--panel-borde)] bg-white px-4 text-[13px] font-dm font-medium text-[var(--panel-tinta)]">
                {copiado ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}{copiado ? "Copiada" : "Copiar lista"}
              </button>
            </div>
          </section>

          {/* Checklist */}
          <section className="panel-card p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-cormorant text-[22px] text-[var(--panel-tinta)]">Antes de salir</h2>
              <span className="panel-cifra text-[12.5px] font-dm text-[var(--panel-tinta-media)]">{av.hechos} de {av.total}</span>
            </div>
            {msj?.lista && msj.error && <p role="alert" className="mt-1 text-[12px] font-dm text-[var(--panel-problema)]">{msj.texto}: se deshizo el cambio.</p>}
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--panel-fondo-velo)]" aria-hidden="true">
              <div className="h-full rounded-full bg-[var(--panel-bien)] transition-[width]" style={{ width: `${av.total ? (av.hechos / av.total) * 100 : 0}%` }} />
            </div>
            <ul className="mt-3 divide-y divide-[var(--panel-borde)]">
              {checklist.map(i => (
                <li key={i.clave}>
                  <label className="flex min-h-[44px] cursor-pointer items-center gap-3 py-2">
                    <input type="checkbox" checked={i.hecho} onChange={() => { playClick(); marcar(i.clave); }} disabled={guardando}
                      className="h-5 w-5 rounded border-[var(--panel-borde-fuerte)] accent-[var(--panel-acento)]" />
                    <span className={`flex-1 text-[13.5px] font-dm ${i.hecho ? "text-[var(--panel-tinta-suave)] line-through" : "text-[var(--panel-tinta)]"}`}>{i.texto}</span>
                    {i.hecho && i.por && <span className="text-[10.5px] font-dm text-[var(--panel-tinta-suave)]">{i.por}</span>}
                  </label>
                </li>
              ))}
            </ul>
            <form className="mt-3 flex gap-2" onSubmit={e => { e.preventDefault(); agregarItem(); }}>
              <input value={nuevoItem} onChange={e => setNuevoItem(e.target.value)} maxLength={160} placeholder="Agregar un punto solo para esta salida" className={input} aria-label="Nuevo punto del checklist" />
              <button type="submit" disabled={!nuevoItem.trim() || guardando} className="panel-foco panel-pulsable min-h-[44px] rounded-[var(--panel-radio-sm)] border border-[var(--panel-borde)] bg-white px-4 text-[13px] font-dm font-medium text-[var(--panel-tinta)] disabled:opacity-40">Agregar</button>
            </form>
          </section>

          {/* Protocolo */}
          <section className="panel-card p-4">
            <h2 className="font-cormorant text-[22px] text-[var(--panel-tinta)]">Protocolo de la ruta</h2>
            {s.protocolo ? (
              <dl className="mt-2 grid gap-x-6 gap-y-2 text-[13px] font-dm sm:grid-cols-2">
                <div><dt className="text-[11px] uppercase tracking-[0.12em] text-[var(--panel-tinta-suave)]">Punto de encuentro</dt><dd className="text-[var(--panel-tinta)]">{s.protocolo.lugar}{s.protocolo.hora ? `, ${s.protocolo.hora}` : ""}</dd></div>
                <div><dt className="text-[11px] uppercase tracking-[0.12em] text-[var(--panel-tinta-suave)]">Duración</dt><dd className="text-[var(--panel-tinta)]">{s.protocolo.duracion}</dd></div>
                <div className="sm:col-span-2"><dt className="text-[11px] uppercase tracking-[0.12em] text-[var(--panel-tinta-suave)]">Incluye</dt><dd className="text-[var(--panel-tinta)]">{s.protocolo.incluye.join(" · ") || "—"}</dd></div>
              </dl>
            ) : <p className="mt-2 text-[13px] font-dm text-[var(--panel-tinta-media)]">Salida a medida: el protocolo se acuerda con el cliente.</p>}
            <p className="mt-3 text-[12px] font-dm text-[var(--panel-tinta-suave)]">Paradas, guion del guía, plan B y proveedores llegan con «Rutas y protocolos».</p>
          </section>
        </div>

        <div className="space-y-5">
          {/* Operación */}
          <section className="panel-card p-4">
            <h2 className="font-cormorant text-[22px] text-[var(--panel-tinta)]">Operación</h2>
            <form className="mt-3 space-y-3" onSubmit={e => { e.preventDefault(); const c = cambiosDeOperacion(); if (!Object.keys(c).length) { setMsj({ texto: "Sin cambios" }); return; } void guardar(c); }}>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-[11px] font-dm uppercase tracking-[0.12em] text-[var(--panel-tinta-suave)]">Guía
                  <input value={registro.guia} disabled={!puedeAsignar} onChange={e => setRegistro(r => ({ ...r, guia: e.target.value }))} className={`${input} mt-1 normal-case tracking-normal`} placeholder="Quién sale" /></label>
                <label className="block text-[11px] font-dm uppercase tracking-[0.12em] text-[var(--panel-tinta-suave)]">Vehículo
                  <input value={registro.vehiculo} disabled={!puedeAsignar} onChange={e => setRegistro(r => ({ ...r, vehiculo: e.target.value }))} className={`${input} mt-1 normal-case tracking-normal`} placeholder="Camioneta, RZR…" /></label>
                <label className="block text-[11px] font-dm uppercase tracking-[0.12em] text-[var(--panel-tinta-suave)]">Estado
                  <select value={registro.estado} disabled={!puedeAsignar} onChange={e => setRegistro(r => ({ ...r, estado: e.target.value }))} className={`${input} mt-1 normal-case tracking-normal`}>
                    {ESTADOS.map(x => <option key={x.clave} value={x.clave}>{x.etiqueta}</option>)}
                  </select></label>
                <label className="block text-[11px] font-dm uppercase tracking-[0.12em] text-[var(--panel-tinta-suave)]">Tipo
                  <select value={registro.tipo} disabled={!puedeAsignar} onChange={e => setRegistro(r => ({ ...r, tipo: e.target.value }))} className={`${input} mt-1 normal-case tracking-normal`}>
                    <option value="fija">Compartida</option><option value="privada">Privada</option>
                  </select></label>
              </div>
              <label className="block text-[11px] font-dm uppercase tracking-[0.12em] text-[var(--panel-tinta-suave)]">Notas de la salida
                <textarea value={registro.notas} onChange={e => setRegistro(r => ({ ...r, notas: e.target.value }))} rows={3} className={`${input} mt-1 normal-case tracking-normal`} placeholder="Río, clima, pendientes…" /></label>
              <div className="flex items-center gap-3">
                <button type="submit" disabled={guardando} className="panel-foco panel-pulsable min-h-[44px] rounded-[var(--panel-radio-sm)] bg-[var(--panel-acento)] px-4 text-[13px] font-dm font-semibold text-white disabled:opacity-50">{guardando ? "Guardando…" : "Guardar"}</button>
                {msj && !msj.lista && <p role="status" className={`text-[12px] font-dm ${msj.error ? "text-[var(--panel-problema)]" : "text-[var(--panel-bien)]"}`}>{msj.texto}</p>}
              </div>
            </form>
          </section>

          {/* Números (solo quien ve el Cotizador) */}
          {verDinero && <section className="panel-card p-4">
            <h2 className="font-cormorant text-[22px] text-[var(--panel-tinta)]">Números de la salida</h2>
            {!n.conCostos && <p className="mt-1 text-[12px] font-dm text-[var(--panel-atencion)]">Faltan costos: captúralos en el Cotizador para ver el margen real.</p>}
            <dl className="mt-2 space-y-1.5 text-[13px] font-dm">
              <Fila k="Ingreso registrado" v={fmx(n.ingreso)} />
              <Fila k={`Costo fijo de la salida`} v={n.conCostos ? `− ${fmx(n.costoFijo)}` : "—"} />
              <Fila k={`Costo por persona × ${n.pax}`} v={n.conCostos ? `− ${fmx(n.costoPorPax * n.pax)}` : "—"} />
              <div className="flex justify-between border-t border-[var(--panel-borde)] pt-1.5 font-medium text-[var(--panel-tinta)]"><dt>Margen de contribución</dt><dd className="panel-cifra">{n.conCostos ? `${fmx(n.margen)} · ${n.margenPct} %` : "Faltan costos"}</dd></div>
              {n.conCostos && <Fila k="Parte de cada socio (50/50)" v={fmx(n.parteSocio)} />}
            </dl>
            <p className="mt-2 text-[11px] font-dm text-[var(--panel-tinta-suave)]">Antes de Stripe, Railway y hotel: esos se descuentan en el corte semanal.</p>
          </section>}

          {verDinero && simulacion.length > 0 && (
            <section className="panel-card p-4">
              <h2 className="font-cormorant text-[22px] text-[var(--panel-tinta)]">¿Y si fueran…?</h2>
              <p className="text-[12px] font-dm text-[var(--panel-tinta-media)]">A {fmx(s.precioPorPax)} por persona{n.conCostos ? "" : " (sin costos capturados: el margen es un techo)"}.</p>
              <table className="panel-tabla mt-2 w-full text-[12.5px] font-dm">
                <thead><tr><th className="py-1 text-left">Personas</th><th className="py-1 text-right">Ingreso</th><th className="py-1 text-right">Margen</th><th className="py-1 text-right">%</th></tr></thead>
                <tbody>
                  {simulacion.map(x => (
                    <tr key={x.pax} className={x.pax === s.personas ? "font-semibold text-[var(--panel-tinta)]" : ""}>
                      <td className="py-1">{x.pax}{x.pax === s.personas ? " · hoy" : ""}</td>
                      <td className="panel-cifra py-1 text-right">{fmx(x.ingreso)}</td>
                      <td className={`panel-cifra py-1 text-right ${x.margen < 0 ? "text-[var(--panel-problema)]" : ""}`}>{fmx(x.margen)}</td>
                      <td className={`panel-cifra py-1 text-right ${x.margenPct < 30 ? "text-[var(--panel-atencion)]" : "text-[var(--panel-bien)]"}`}>{x.margenPct} %</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>
      </div>
      <p className="mt-4 text-[11px] font-dm text-[var(--panel-tinta-suave)]" style={{ borderLeft: `3px solid ${colorDeTour(s.slug)}`, paddingLeft: 8 }}>{s.codigo} · {quien ? `Sesión de ${quien}` : ""}</p>
    </div>
  );
}

function Fila({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between text-[var(--panel-tinta-media)]"><dt>{k}</dt><dd className="panel-cifra text-[var(--panel-tinta)]">{v}</dd></div>;
}
