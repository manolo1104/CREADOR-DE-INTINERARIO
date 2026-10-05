"use client";
import { useEffect, useState } from "react";

interface FilaCupo {
  slug: string;
  nombre: string;
  fecha: string;
  salidaMaxima: number;
  unidad: "habitacion" | "persona";
  cupo: number;
  enLinea: number;
  manual: number;
  manualPersonas: number;
  vendidos: number;
  libres: number;
  personasLibres: number;
}

/**
 * Los lugares de los eventos de Xantolo 2026:
 *  - el paquete con hotel: 4 cuartos, para parejas o familias (hasta 4 por
 *    cuarto), con tope de 12 personas en la salida de la noche;
 *  - la Noche de Xantolo sin hotel: 12 lugares el 31 de octubre y 12 el 1 de
 *    noviembre.
 *
 * Lo vendido EN EL SITIO se cuenta solo. Lo vendido por WhatsApp o en persona
 * no deja rastro con el slug del evento, así que aquí se anota a mano con − y +
 * (cuartos en el paquete, personas en la noche). Ese número resta lugares en la
 * página y en el pago: si no se anota, el sitio puede vender un cuarto o un
 * asiento que ya no existe.
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

  async function guardar(f: FilaCupo, manual: number, personas: number) {
    setGuardando(f.slug);
    setMsj(null);
    try {
      const r = await fetch("/api/admin/cupo-paquete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: f.slug, manual, personas }),
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

  /** Un cuarto más o menos vendido por fuera: de entrada, de una pareja. */
  function cambiarCuartos(f: FilaCupo, delta: number) {
    const manual = Math.max(0, Math.min(f.cupo, f.manual + delta));
    if (manual === f.manual) return;
    const personas = Math.max(manual * 2, Math.min(manual * 4, f.manualPersonas + delta * 2));
    void guardar(f, manual, personas);
  }

  /** Cuánta gente va en los cuartos vendidos por fuera (de 2 a 4 por cuarto). */
  function cambiarPersonas(f: FilaCupo, delta: number) {
    const personas = Math.max(f.manual * 2, Math.min(f.manual * 4, f.manualPersonas + delta));
    if (personas === f.manualPersonas) return;
    void guardar(f, f.manual, personas);
  }

  /** En la noche sin hotel se anota por persona. */
  function cambiarLugares(f: FilaCupo, delta: number) {
    const manual = Math.max(0, Math.min(f.cupo, f.manual + delta));
    if (manual === f.manual) return;
    void guardar(f, manual, manual);
  }

  if (!filas || filas.length === 0) return null;

  const boton = "w-7 h-7 rounded border border-[rgba(22,54,42,0.25)] hover:border-[#16362a] disabled:opacity-40";

  return (
    <div className="panel-card px-4 py-3.5 mb-5 space-y-4">
      {filas.map((f) => {
        const ocupado = guardando === f.slug;
        const esCuarto = f.unidad === "habitacion";
        return (
          <div key={f.slug}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <p className="panel-eyebrow">Lugares · {f.nombre} ({f.fecha})</p>
              <p className="text-[12px] font-dm font-medium text-[#16362a]">
                {esCuarto
                  ? `Quedan ${f.libres} de ${f.cupo} cuartos · caben ${f.personasLibres} personas más en la salida`
                  : `Quedan ${f.libres} de ${f.cupo} lugares`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] font-dm text-[rgba(22,54,42,0.75)]">
              <span>
                {esCuarto ? "Cuartos vendidos en el sitio" : "Lugares vendidos en el sitio"}:{" "}
                <strong className="text-[#16362a]">{f.enLinea}</strong>
              </span>
              {esCuarto ? (
                <>
                  <span className="flex items-center gap-2">
                    Cuartos vendidos por WhatsApp:
                    <button type="button" aria-label="Un cuarto menos vendido por WhatsApp"
                      disabled={ocupado || f.manual <= 0} onClick={() => cambiarCuartos(f, -1)} className={boton}>−</button>
                    <strong className="w-5 text-center text-[#16362a]">{f.manual}</strong>
                    <button type="button" aria-label="Un cuarto más vendido por WhatsApp"
                      disabled={ocupado || f.libres < 1 || f.personasLibres < 2} onClick={() => cambiarCuartos(f, 1)} className={boton}>+</button>
                  </span>
                  {f.manual > 0 && (
                    <span className="flex items-center gap-2">
                      Personas en esos cuartos:
                      <button type="button" aria-label="Una persona menos en los cuartos vendidos por WhatsApp"
                        disabled={ocupado || f.manualPersonas <= f.manual * 2} onClick={() => cambiarPersonas(f, -1)} className={boton}>−</button>
                      <strong className="w-5 text-center text-[#16362a]">{f.manualPersonas}</strong>
                      <button type="button" aria-label="Una persona más en los cuartos vendidos por WhatsApp"
                        disabled={ocupado || f.manualPersonas >= f.manual * 4 || f.personasLibres < 1} onClick={() => cambiarPersonas(f, 1)} className={boton}>+</button>
                    </span>
                  )}
                </>
              ) : (
                <span className="flex items-center gap-2">
                  Lugares vendidos por WhatsApp:
                  <button type="button" aria-label="Un lugar menos vendido por WhatsApp"
                    disabled={ocupado || f.manual <= 0} onClick={() => cambiarLugares(f, -1)} className={boton}>−</button>
                  <strong className="w-5 text-center text-[#16362a]">{f.manual}</strong>
                  <button type="button" aria-label="Un lugar más vendido por WhatsApp"
                    disabled={ocupado || f.libres < 1} onClick={() => cambiarLugares(f, 1)} className={boton}>+</button>
                </span>
              )}
            </div>
          </div>
        );
      })}
      {msj ? <p className="text-[11px] font-dm text-[rgba(22,54,42,0.6)]">{msj}</p> : null}
    </div>
  );
}
