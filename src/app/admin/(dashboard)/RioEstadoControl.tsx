"use client";
import { useEffect, useState } from "react";

type Estado = "auto" | "turquesa" | "caudal";

const OPCIONES: { valor: Estado; titulo: string; detalle: string }[] = [
  { valor: "auto",     titulo: "Automático", detalle: "Lo decide la temporada (jun–oct caudal, nov–may turquesa)" },
  { valor: "turquesa", titulo: "🟢 Turquesa", detalle: "El sitio anuncia agua turquesa" },
  { valor: "caudal",   titulo: "🟤 Caudal alto", detalle: "El sitio avisa caudal alto por lluvias" },
];

/**
 * El control de la banda "estado del río" del sitio público. Manolo elige el
 * semáforo (o lo deja en automático, que sigue la temporada) y una nota
 * opcional de una línea. Guarda en /api/admin/rio-estado y el sitio lo lee al
 * momento (la banda hace fetch en cada carga).
 */
export function RioEstadoControl() {
  const [estado, setEstado] = useState<Estado>("auto");
  const [nota, setNota] = useState("");
  const [temporada, setTemporada] = useState<"turquesa" | "caudal">("turquesa");
  const [msj, setMsj] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    fetch("/api/admin/rio-estado")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        if (d.estado) setEstado(d.estado);
        if (d.nota) setNota(d.nota);
        if (d.temporada) setTemporada(d.temporada);
      })
      .catch(() => {});
  }, []);

  async function guardar(nuevo: Estado, nuevaNota: string) {
    setGuardando(true);
    setMsj(null);
    try {
      const r = await fetch("/api/admin/rio-estado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevo, nota: nuevaNota }),
      });
      setMsj(r.ok ? "Guardado — el sitio ya lo muestra" : "No se pudo guardar");
    } catch {
      setMsj("No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  }

  const efectivo = estado === "auto" ? temporada : estado;

  return (
    <div className="panel-card px-4 py-3.5 mb-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <p className="panel-eyebrow">Estado del río en el sitio</p>
        <p className="text-[11px] font-dm text-[rgba(22,54,42,0.55)]">
          Ahora se anuncia: {efectivo === "turquesa" ? "🟢 turquesa" : "🟤 caudal alto"}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {OPCIONES.map((o) => (
          <button
            key={o.valor}
            type="button"
            title={o.detalle}
            disabled={guardando}
            onClick={() => { setEstado(o.valor); void guardar(o.valor, nota); }}
            className={`px-3 py-1.5 text-[12px] font-dm rounded border transition-colors ${
              estado === o.valor
                ? "border-[#16362a] bg-[#16362a] text-white"
                : "border-[rgba(22,54,42,0.25)] text-[rgba(22,54,42,0.75)] hover:border-[#16362a]"
            }`}
          >
            {o.titulo}
          </button>
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={nota}
          maxLength={140}
          placeholder="Nota opcional (ej. «Tamul navegable desde el sábado»)"
          onChange={(e) => setNota(e.target.value)}
          className="flex-1 min-w-[220px] px-2.5 py-1.5 text-[12px] font-dm border border-[rgba(22,54,42,0.25)] rounded"
        />
        <button
          type="button"
          disabled={guardando}
          onClick={() => void guardar(estado, nota)}
          className="px-3 py-1.5 text-[12px] font-dm rounded border border-[rgba(22,54,42,0.25)] text-[rgba(22,54,42,0.75)] hover:border-[#16362a]"
        >
          Guardar nota
        </button>
        {msj ? <span className="text-[11px] font-dm text-[rgba(22,54,42,0.6)]">{msj}</span> : null}
      </div>
    </div>
  );
}
