"use client";
import { useState } from "react";
import { GRAVEDADES, TIPOS_INCIDENCIA, etiquetaGravedad, etiquetaTipo, type Incidencia } from "@/lib/admin/incidencias";
import { playError, playSuccess } from "@/lib/admin/sfx";

const input = "w-full rounded-[var(--panel-radio-sm)] border border-[var(--panel-borde)] bg-white px-3 py-2.5 text-[16px] font-dm text-[var(--panel-tinta)] panel-foco";

/**
 * Bitácora de incidencias de la salida (4 nov 2026). Plan As Is / To Be:
 * «Incidencias: no se registran → bitácora por salida, con causa y acción».
 * La puede anotar el guía desde su teléfono; quitarla es de Operación.
 */
export function IncidenciasSalida({ clave, inicial, puedeQuitar }: { clave: string; inicial: Incidencia[]; puedeQuitar: boolean }) {
  const [lista, setLista] = useState<Incidencia[]>(inicial);
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState<string>("");
  const [gravedad, setGravedad] = useState<string>("leve");
  const [causa, setCausa] = useState("");
  const [accion, setAccion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function enviar(cuerpo: Record<string, unknown>) {
    setGuardando(true); setError(null);
    const r = await fetch("/api/admin/salidas-dia", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clave, ...cuerpo }) }).catch(() => null);
    const d = await r?.json().catch(() => null);
    setGuardando(false);
    if (!r?.ok || !d?.ok) { playError(); setError(d?.error || "No se pudo guardar"); return false; }
    playSuccess(); setLista(d.incidencias ?? []);
    return true;
  }

  return (
    <section className="panel-card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-cormorant text-[22px] text-[var(--panel-tinta)]">Incidencias</h2>
        <span className="text-[12px] font-dm text-[var(--panel-tinta-suave)]">{lista.length ? `${lista.length} anotada${lista.length === 1 ? "" : "s"}` : "Ninguna"}</span>
      </div>
      <p className="mt-0.5 text-[12px] font-dm text-[var(--panel-tinta-media)]">Lo que salió mal: recogida tarde, proveedor, vehículo, clima, cliente… con qué se hizo. Sirve para que no se repita.</p>
      {lista.length > 0 && (
        <ul className="mt-3 divide-y divide-[var(--panel-borde)]">
          {lista.map(i => (
            <li key={i.id} className="py-2.5 text-[13px] font-dm">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-[var(--panel-tinta)]">{etiquetaTipo(i.tipo)} <span className="font-normal text-[var(--panel-tinta-suave)]">· {etiquetaGravedad(i.gravedad)}</span></p>
                {puedeQuitar && <button type="button" disabled={guardando} onClick={() => { if (window.confirm("¿Quitar esta incidencia?")) void enviar({ quitarIncidencia: i.id }); }} className="panel-foco text-[11.5px] text-[var(--panel-tinta-suave)] hover:text-[var(--panel-problema)]">Quitar</button>}
              </div>
              <p className="text-[var(--panel-tinta)]">{i.causa}</p>
              {i.accion && <p className="text-[var(--panel-tinta-media)]">→ {i.accion}</p>}
              <p className="text-[10.5px] text-[var(--panel-tinta-suave)]">{i.por}</p>
            </li>
          ))}
        </ul>
      )}
      {!abierto ? (
        <button type="button" onClick={() => setAbierto(true)} className="panel-foco panel-pulsable mt-3 min-h-[44px] rounded-[var(--panel-radio-sm)] border border-[var(--panel-borde)] bg-white px-4 text-[13px] font-dm font-medium text-[var(--panel-tinta)]">
          + Anotar incidencia
        </button>
      ) : (
        <form className="mt-3 space-y-2" onSubmit={async e => {
          e.preventDefault();
          if (await enviar({ incidencia: { tipo, gravedad, causa, accion } })) { setTipo(""); setGravedad("leve"); setCausa(""); setAccion(""); setAbierto(false); }
        }}>
          <select value={tipo} onChange={e => setTipo(e.target.value)} className={input} aria-label="Tipo de incidencia" required>
            <option value="">¿Qué tipo?</option>
            {TIPOS_INCIDENCIA.map(t => <option key={t.clave} value={t.clave}>{t.etiqueta}</option>)}
          </select>
          <div className="flex gap-1.5" role="radiogroup" aria-label="Gravedad">
            {GRAVEDADES.map(g => (
              <button key={g.clave} type="button" role="radio" aria-checked={gravedad === g.clave} onClick={() => setGravedad(g.clave)}
                className={`panel-foco min-h-[40px] flex-1 rounded-[var(--panel-radio-sm)] border text-[13px] font-dm ${gravedad === g.clave ? "border-[var(--panel-acento)] bg-[var(--panel-acento)] text-white" : "border-[var(--panel-borde)] bg-white text-[var(--panel-tinta-media)]"}`}>
                {g.etiqueta}
              </button>
            ))}
          </div>
          <textarea value={causa} onChange={e => setCausa(e.target.value)} rows={2} maxLength={600} placeholder="Qué pasó y por qué" className={input} aria-label="Qué pasó" required />
          <textarea value={accion} onChange={e => setAccion(e.target.value)} rows={2} maxLength={600} placeholder="Qué se hizo (o qué hay que cambiar)" className={input} aria-label="Acción" />
          {error && <p role="alert" className="text-[12.5px] font-dm text-[var(--panel-problema)]">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={guardando} className="panel-foco panel-pulsable min-h-[44px] rounded-[var(--panel-radio-sm)] bg-[var(--panel-acento)] px-4 text-[13px] font-dm font-semibold text-white disabled:opacity-60">{guardando ? "Guardando…" : "Guardar"}</button>
            <button type="button" onClick={() => setAbierto(false)} className="panel-foco min-h-[44px] px-3 text-[13px] font-dm text-[var(--panel-tinta-media)]">Cancelar</button>
          </div>
        </form>
      )}
    </section>
  );
}
