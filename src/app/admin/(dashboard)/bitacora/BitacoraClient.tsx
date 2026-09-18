"use client";

import { useMemo, useState } from "react";
import { Search, ChevronDown, ChevronRight, Download } from "lucide-react";

interface Cambio { campo: string; antes: unknown; despues: unknown }

export interface Registro {
  id:         string;
  fecha:      string;
  usuario:    string;
  nombre:     string;
  rol:        string;
  accion:     string;
  entidad:    string;
  referencia: string | null;
  resumen:    string;
  detalle:    Cambio[] | null;
}

// Color por tipo de acción: lo destructivo salta a la vista sin leer.
const COLOR_ACCION: Record<string, string> = {
  "creó":            "bg-[#52B788]/12 text-[#1B6B45]",
  "modificó":        "bg-[#1a4e8a]/10 text-[#1a4e8a]",
  "eliminó":         "bg-[#C9484A]/12 text-[#A33638]",
  "envió":           "bg-[#7a3a6a]/10 text-[#7a3a6a]",
  "entró":           "bg-[#1B4332]/8  text-[#1B4332]/70",
  "intento fallido": "bg-[#C9484A]/18 text-[#A33638]",
};

const fFecha = (iso: string) =>
  new Date(iso).toLocaleString("es-MX", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "America/Mexico_City",
  });

const fDia = (iso: string) => {
  const d = new Date(iso).toLocaleDateString("es-MX", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    timeZone: "America/Mexico_City",
  });
  return d.charAt(0).toUpperCase() + d.slice(1);
};

const valor = (v: unknown) =>
  v === null || v === undefined || v === "" ? "(vacío)" : String(v);

export default function BitacoraClient({
  registros, limite,
}: { registros: Registro[]; limite: number }) {
  const [busca,    setBusca]    = useState("");
  const [persona,  setPersona]  = useState("todas");
  const [tipo,     setTipo]     = useState("todo");
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());

  const personas = useMemo(() => {
    const m = new Map<string, string>();
    registros.forEach(r => m.set(r.usuario, r.nombre));
    return Array.from(m.entries());
  }, [registros]);

  const filtrados = useMemo(() => {
    const q = busca.toLowerCase();
    return registros.filter(r =>
      (persona === "todas" || r.usuario === persona) &&
      (tipo === "todo"     || r.entidad === tipo) &&
      (!q || [r.resumen, r.nombre, r.referencia, r.entidad, r.accion]
        .some(v => v?.toLowerCase().includes(q)))
    );
  }, [registros, busca, persona, tipo]);

  function alternar(id: string) {
    setAbiertos(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  // Descarga lo que se está viendo (con los filtros puestos), para guardarlo
  // o abrirlo en Excel el día que haga falta enseñárselo a alguien.
  function descargar() {
    const filas = [
      ["Fecha", "Persona", "Usuario", "Acción", "Qué", "Folio", "Detalle"],
      ...filtrados.map(r => [
        fFecha(r.fecha), r.nombre, r.usuario, r.accion, r.entidad,
        r.referencia ?? "", r.resumen,
      ]),
    ];
    const csv = filas
      .map(f => f.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `bitacora-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Agrupar por día, para leerlo como un diario y no como una lista infinita.
  const porDia = useMemo(() => {
    const grupos: { dia: string; items: Registro[] }[] = [];
    for (const r of filtrados) {
      const dia = fDia(r.fecha);
      const ultimo = grupos[grupos.length - 1];
      if (ultimo && ultimo.dia === dia) ultimo.items.push(r);
      else grupos.push({ dia, items: [r] });
    }
    return grupos;
  }, [filtrados]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-cormorant text-[#1B4332] text-2xl font-light">Bitácora</h1>
          <p className="text-[#1B4332]/50 font-dm text-sm mt-1">
            Quién hizo qué en el panel. Solo tú ves esta pestaña.
          </p>
        </div>
        <button onClick={descargar} disabled={filtrados.length === 0}
          className="flex items-center gap-2 border border-[#1B4332]/20 text-[#1B4332]/70 hover:text-[#1B4332] hover:border-[#1B4332]/40 px-4 py-2 text-xs font-dm uppercase tracking-[1px] transition-colors rounded-sm disabled:opacity-40">
          <Download className="w-3.5 h-3.5" />Descargar
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1B4332]/30" />
          <input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por folio, cliente o palabra..."
            className="w-full bg-white border border-[#1B4332]/15 text-[#1B4332] font-dm text-sm pl-9 pr-4 py-2.5 focus:outline-none focus:border-[#1B4332] placeholder:text-[#1B4332]/30 rounded-sm"
          />
        </div>
        <select value={persona} onChange={e => setPersona(e.target.value)}
          className="bg-white border border-[#1B4332]/15 text-[#1B4332] font-dm text-sm px-3 py-2.5 focus:outline-none focus:border-[#1B4332] rounded-sm">
          <option value="todas">Todas las personas</option>
          {personas.map(([u, n]) => <option key={u} value={u}>{n}</option>)}
        </select>
        <select value={tipo} onChange={e => setTipo(e.target.value)}
          className="bg-white border border-[#1B4332]/15 text-[#1B4332] font-dm text-sm px-3 py-2.5 focus:outline-none focus:border-[#1B4332] rounded-sm">
          <option value="todo">Todo</option>
          <option value="reserva">Reservas</option>
          <option value="cotización">Cotizaciones</option>
          <option value="precios">Precios</option>
          <option value="comprobante">Comprobantes</option>
          <option value="panel">Entradas al panel</option>
        </select>
      </div>

      <p className="text-[#1B4332]/40 font-dm text-xs mb-4">
        {filtrados.length} movimiento{filtrados.length === 1 ? "" : "s"}
        {filtrados.length !== registros.length && ` de ${registros.length}`}
        {registros.length >= limite && " · se muestran los más recientes"}
      </p>

      {filtrados.length === 0 && (
        <div className="bg-white border border-[#1B4332]/10 rounded-sm py-16 text-center">
          <p className="text-[#1B4332]/30 font-dm text-sm">
            Todavía no hay movimientos que mostrar.
          </p>
        </div>
      )}

      {porDia.map(({ dia, items }) => (
        <div key={dia} className="mb-5">
          <p className="text-[10px] tracking-[2px] uppercase text-[#1B4332]/40 font-dm mb-2">{dia}</p>
          <div className="bg-white border border-[#1B4332]/10 rounded-sm overflow-hidden">
            {items.map((r, i) => {
              const abierto = abiertos.has(r.id);
              const tieneDetalle = !!r.detalle?.length;
              return (
                <div key={r.id} className={i > 0 ? "border-t border-[#1B4332]/6" : ""}>
                  <div
                    onClick={() => tieneDetalle && alternar(r.id)}
                    className={`flex items-start gap-3 px-4 py-3 ${tieneDetalle ? "cursor-pointer hover:bg-[#FAFAF8]" : ""} transition-colors`}
                  >
                    <span className="text-[#1B4332]/35 font-dm text-xs w-14 flex-shrink-0 pt-0.5 tabular-nums">
                      {new Date(r.fecha).toLocaleTimeString("es-MX", {
                        hour: "2-digit", minute: "2-digit", timeZone: "America/Mexico_City",
                      })}
                    </span>
                    <span className={`text-[10px] font-dm px-2 py-0.5 rounded-sm flex-shrink-0 ${COLOR_ACCION[r.accion] ?? "bg-[#1B4332]/8 text-[#1B4332]/70"}`}>
                      {r.accion}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-dm text-sm text-[#1B4332]">
                        <span className="font-medium">{r.nombre}</span>
                        <span className="text-[#1B4332]/50"> · {r.entidad}</span>
                      </p>
                      <p className="font-dm text-xs text-[#1B4332]/60 mt-0.5 break-words">{r.resumen}</p>

                      {abierto && tieneDetalle && (
                        <div className="mt-2 border-l-2 border-[#1B4332]/10 pl-3 space-y-1">
                          {r.detalle!.map((c, j) => (
                            <p key={j} className="font-dm text-xs text-[#1B4332]/70">
                              <span className="text-[#1B4332]/45">{c.campo}:</span>{" "}
                              <span className="line-through text-[#1B4332]/40">{valor(c.antes)}</span>
                              {" → "}
                              <span className="text-[#1B4332] font-medium">{valor(c.despues)}</span>
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                    {tieneDetalle && (
                      abierto
                        ? <ChevronDown  className="w-4 h-4 text-[#1B4332]/30 flex-shrink-0 mt-0.5" />
                        : <ChevronRight className="w-4 h-4 text-[#1B4332]/30 flex-shrink-0 mt-0.5" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
