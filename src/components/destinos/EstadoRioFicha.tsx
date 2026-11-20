"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { rioPorTemporada, type RioEstado } from "@/lib/rioEstado";
import { trackTourEvent } from "@/lib/tourTracker";

/**
 * «El agua hoy», dentro de la ficha de un destino con agua (20 nov 2026).
 *
 * Es la misma información que daba la franja de arriba de TODO el sitio
 * (BandaRio), que Manolo quitó: ahí estorbaba en páginas que no tienen nada que
 * ver con el río. En la ficha de una cascada o de una poza sí contesta la duda
 * que frena la visita —«¿el agua está turquesa o café?»— y por eso la auditoría
 * de Destinos lo pidió como bloque «Estado hoy».
 *
 * Arranca con el estado de la temporada (lo mismo que pintó el servidor) y lo
 * corrige con /api/rio-estado, que manda lo que fijó el panel. Si el panel lo
 * fijó a mano, dice cuándo; si no, dice que es el estado de la temporada. No se
 * garantiza el color del agua (Manolo, 19 nov 2026): se promete lo que sí
 * depende de nosotros, reembolso o reagendar si el río no deja operar.
 */
interface Dato {
  estado: RioEstado;
  nota: string | null;
  fuente: "manual" | "temporada";
  actualizado: string | null;
}

export function EstadoRioFicha({ en = false, destino }: { en?: boolean; destino: string }) {
  const [dato, setDato] = useState<Dato>(() => ({ estado: rioPorTemporada(), nota: null, fuente: "temporada", actualizado: null }));
  const [aviso, setAviso] = useState<"cerrado" | "abierto" | "enviando" | "listo">("cerrado");
  const [correo, setCorreo] = useState("");

  useEffect(() => {
    let vivo = true;
    fetch("/api/rio-estado")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!vivo || (d?.estado !== "turquesa" && d?.estado !== "caudal")) return;
        setDato({
          estado: d.estado,
          nota: d.nota ?? null,
          fuente: d.fuente === "manual" ? "manual" : "temporada",
          actualizado: typeof d.actualizado === "string" ? d.actualizado : null,
        });
      })
      .catch(() => {});
    return () => { vivo = false; };
  }, []);

  async function pedirAviso(e: React.FormEvent) {
    e.preventDefault();
    if (aviso === "enviando") return;
    setAviso("enviando");
    try {
      const r = await fetch("/api/guardar-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: correo.trim(), fuente: "Aviso agua turquesa" }),
      });
      if (!r.ok) throw new Error();
      trackTourEvent("LEAD_AGUA", { fuente: "Aviso agua turquesa", destino });
      setAviso("listo");
    } catch {
      setAviso("abierto");
    }
  }

  const turquesa = dato.estado === "turquesa";
  const fecha = dato.actualizado
    ? new Date(dato.actualizado).toLocaleDateString(en ? "en-US" : "es-MX", { day: "numeric", month: "long", timeZone: "America/Mexico_City" })
    : null;

  return (
    <div className={`rounded-2xl border p-5 ${turquesa ? "border-agua/30 bg-agua/10" : "border-terracota/30 bg-terracota/10"}`}>
      <p className="text-[10px] tracking-[2px] uppercase font-dm text-crema/50 mb-2">
        {en ? "Water today in the Huasteca" : "El agua hoy en la Huasteca"}
      </p>
      <p className="flex items-center gap-2 font-cormorant text-crema text-xl leading-snug">
        <span aria-hidden="true" className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${turquesa ? "bg-agua" : "bg-terracota"}`} />
        {en
          ? (turquesa ? "Turquoise water: rivers and pools are clear" : "High flow after rain: the water may look brown")
          : (turquesa ? "Agua turquesa: ríos y pozas están claros" : "Caudal alto por lluvias: el agua puede verse café")}
      </p>
      {dato.nota && <p className="mt-2 font-dm text-sm text-crema/75">{dato.nota}</p>}
      <p className="mt-2 font-dm text-[11px] text-crema/45 leading-relaxed">
        {dato.fuente === "manual" && fecha
          ? (en ? `Reported by our guides on ${fecha}.` : `Reporte de nuestros guías del ${fecha}.`)
          : (en ? "Seasonal status (Nov–Jun usually turquoise; Jul–Oct, rainy season)." : "Estado de la temporada (de nov a jun suele estar turquesa; de jul a oct es temporada de lluvias).")}
        {" "}
        <Link href={en ? "/en/politica-de-cancelacion" : "/politica-de-cancelacion"} prefetch={false} className="underline underline-offset-2 hover:text-crema transition-colors">
          {en ? "If the river stops the tour: refund or reschedule." : "Si el río no deja operar: reembolso o reagendas."}
        </Link>
      </p>

      {!turquesa && aviso !== "listo" && (
        aviso === "cerrado" ? (
          <button
            type="button"
            onClick={() => setAviso("abierto")}
            className="mt-3 min-h-[44px] font-dm text-sm text-dorado underline underline-offset-2 decoration-dorado/60 hover:text-crema transition-colors"
          >
            {en ? "Email me when it turns turquoise" : "Avísame por correo cuando esté turquesa"}
          </button>
        ) : (
          <form onSubmit={pedirAviso} className="mt-3 flex flex-wrap items-center gap-2">
            <label htmlFor={`correo-agua-${destino}`} className="sr-only">{en ? "Your email" : "Tu correo"}</label>
            <input
              id={`correo-agua-${destino}`}
              type="email"
              required
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder={en ? "you@email.com" : "tu@correo.com"}
              className="rounded-xl min-h-[44px] w-60 min-w-0 border border-crema/30 bg-transparent px-4 font-dm text-base text-crema placeholder:text-crema/40 focus:border-dorado focus:outline-none"
            />
            <button
              type="submit"
              disabled={aviso === "enviando"}
              className="rounded-xl min-h-[44px] border border-dorado/60 px-4 font-dm text-sm text-dorado hover:bg-dorado/10 transition-colors disabled:opacity-60"
            >
              {aviso === "enviando" ? (en ? "Sending…" : "Enviando…") : (en ? "Notify me" : "Avisarme")}
            </button>
          </form>
        )
      )}
      {aviso === "listo" && (
        <p role="status" className="mt-3 font-dm text-sm text-lima">
          {en ? "Done. We'll email you when the water turns turquoise." : "Listo: te escribimos cuando el agua se ponga turquesa."}
        </p>
      )}
    </div>
  );
}
