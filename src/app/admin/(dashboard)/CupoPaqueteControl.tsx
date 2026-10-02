"use client";
import { useEffect, useState } from "react";

interface FilaCupo {
  slug: string;
  nombre: string;
  fecha: string;
  cupo: number;
  enLinea: number;
  manual: number;
  vendidos: number;
  libres: number;
}

/**
 * Los lugares de los paquetes de evento (Xantolo 2026: 8 lugares).
 *
 * Lo vendido EN EL SITIO se cuenta solo. Lo vendido por WhatsApp o en persona
 * no deja rastro con el slug del paquete, así que aquí se anota a mano con
 * − y +, por PAREJA (el paquete se vende por pareja; la base guarda personas).
 * Ese número resta lugares en la página y en el pago: si no se anota, el sitio
 * puede vender un cuarto que ya no existe.
 */
export function CupoPaqueteControl() {
  const [filas, setFilas] = useState<FilaCupo[] | null>(null);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [msj, setMsj] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/cupo-paquete")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setFilas(d?.paquetes ?? []))
      .catch(() => setFilas([]));
  }, []);

  async function cambiar(f: FilaCupo, delta: number) {
    const manual = Math.max(0, Math.min(f.cupo, f.manual + delta));
    if (manual === f.manual) return;
    setGuardando(f.slug);
    setMsj(null);
    try {
      const r = await fetch("/api/admin/cupo-paquete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: f.slug, manual }),
      });
      const d = r.ok ? await r.json() : null;
      if (d) {
        setFilas((prev) => (prev ?? []).map((x) => (x.slug === f.slug ? { ...x, ...d } : x)));
        setMsj("Guardado: el sitio ya lo descuenta");
      } else {
        setMsj("No se pudo guardar");
      }
    } catch {
      setMsj("No se pudo guardar");
    } finally {
      setGuardando(null);
    }
  }

  if (!filas || filas.length === 0) return null;

  return (
    <div className="panel-card px-4 py-3.5 mb-5">
      {filas.map((f) => (
        <div key={f.slug}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <p className="panel-eyebrow">Lugares · {f.nombre} ({f.fecha})</p>
            <p className="text-[12px] font-dm font-medium text-[#16362a]">
              Quedan {f.libres} de {f.cupo} lugares ({Math.floor(f.libres / 2)} parejas)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] font-dm text-[rgba(22,54,42,0.75)]">
            <span>Parejas vendidas en el sitio: <strong className="text-[#16362a]">{Math.floor(f.enLinea / 2)}</strong></span>
            <span className="flex items-center gap-2">
              Parejas vendidas por WhatsApp:
              <button
                type="button"
                aria-label="Una pareja menos vendida por WhatsApp"
                disabled={guardando === f.slug || f.manual <= 0}
                onClick={() => void cambiar(f, -2)}
                className="w-7 h-7 rounded border border-[rgba(22,54,42,0.25)] hover:border-[#16362a] disabled:opacity-40"
              >−</button>
              <strong className="w-5 text-center text-[#16362a]">{Math.floor(f.manual / 2)}</strong>
              <button
                type="button"
                aria-label="Una pareja más vendida por WhatsApp"
                disabled={guardando === f.slug || f.libres < 2}
                onClick={() => void cambiar(f, 2)}
                className="w-7 h-7 rounded border border-[rgba(22,54,42,0.25)] hover:border-[#16362a] disabled:opacity-40"
              >+</button>
            </span>
            {msj ? <span className="text-[11px] text-[rgba(22,54,42,0.6)]">{msj}</span> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
