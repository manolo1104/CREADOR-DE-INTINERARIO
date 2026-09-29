"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { RioEstado } from "@/lib/rioEstado";
import { trackTourEvent } from "@/lib/tourTracker";

/**
 * La franja delgada de "estado del río", pegada arriba del navbar (vive DENTRO
 * de su contenedor fijo, así se esconde junto con él al bajar). Contesta la
 * duda que en temporada baja frena la reserva —"¿el agua está turquesa o
 * marrón?"— y la remata con la garantía de caudal: si no está turquesa,
 * reagendas gratis. La garantía también está escrita en la política de
 * cancelación, a donde enlaza esta franja.
 *
 * El estado sale de /api/rio-estado (lo fija Manolo desde el panel; en "auto"
 * manda la temporada). Es un fetch de cliente para que la franja viva igual
 * en las páginas estáticas; hasta que responde, no se pinta nada.
 */
export function BandaRio() {
  const pathname = usePathname();
  const [dato, setDato] = useState<{ estado: RioEstado; nota: string | null } | null>(null);
  // El imán de temporada baja: con caudal alto, la banda ofrece avisar cuando
  // el agua vuelva a estar turquesa. Captura la intención de HOY y se cobra en
  // noviembre; el correo cae en la hoja de leads con fuente propia.
  const [aviso, setAviso] = useState<"cerrado" | "abierto" | "enviando" | "listo">("cerrado");
  const [correo, setCorreo] = useState("");

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
      trackTourEvent("LEAD_AGUA", { fuente: "Aviso agua turquesa" });
      setAviso("listo");
    } catch {
      setAviso("abierto");
    }
  }

  useEffect(() => {
    let vivo = true;
    fetch("/api/rio-estado")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (vivo && d?.estado) setDato(d); })
      .catch(() => {});
    return () => { vivo = false; };
  }, []);

  // En el pago y en el embudo del curso no se interrumpe; /admin ni la carga.
  if (/^\/(admin|curso)|^\/reservar-(tour|paquete)\/|^\/reservar\/carrito|^\/confirmacion/.test(pathname)) return null;
  if (!dato) return null;

  const en = pathname === "/en" || pathname.startsWith("/en/");
  const turquesa = dato.estado === "turquesa";
  const estadoTexto = en
    ? (turquesa ? "River today: turquoise water" : "River today: high flow after rain")
    : (turquesa ? "El río hoy: agua turquesa" : "El río hoy: caudal alto por lluvias");
  const garantia = en
    ? "Not turquoise? Reschedule free"
    : "¿No está turquesa? Reagendas gratis";

  return (
    <div className={`${turquesa ? "bg-verde-profundo" : "bg-negro"} border-b border-white/10`}>
      {/* flex-wrap: en un teléfono la garantía baja a su propio renglón en vez
          de desbordar la franja por la derecha. */}
      <p className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-1.5 px-4 py-1.5 text-center font-dm text-[11px] sm:text-xs leading-snug text-crema/85">
        <span aria-hidden="true" className={`inline-block h-2 w-2 rounded-full ${turquesa ? "bg-agua" : "bg-terracota"}`} />
        <span className="font-medium text-crema">{estadoTexto}</span>
        {dato.nota ? <span className="text-crema/70">— {dato.nota}</span> : null}
        <span aria-hidden="true" className="hidden text-crema/50 sm:inline">·</span>
        <Link href="/politica-de-cancelacion" className="underline underline-offset-2 decoration-crema/40 hover:text-crema transition-colors">
          {garantia}
        </Link>
        {!turquesa && aviso === "cerrado" ? (
          <>
            <span aria-hidden="true" className="hidden text-crema/50 sm:inline">·</span>
            <button
              type="button"
              onClick={() => setAviso("abierto")}
              className="underline underline-offset-2 decoration-dorado/60 text-dorado hover:text-crema transition-colors"
            >
              {en ? "Tell me when it turns turquoise" : "Avísame cuando esté turquesa"}
            </button>
          </>
        ) : null}
      </p>
      {!turquesa && (aviso === "abierto" || aviso === "enviando") ? (
        <form onSubmit={pedirAviso} className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 pb-2">
          <label htmlFor="correo-rio" className="sr-only">
            {en ? "Your email" : "Tu correo"}
          </label>
          <input
            id="correo-rio"
            type="email"
            required
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder={en ? "you@email.com" : "tu@correo.com"}
            className="w-52 border border-crema/30 bg-transparent px-2.5 py-1 font-dm text-[11px] text-crema placeholder:text-crema/40 focus:border-dorado focus:outline-none"
          />
          <button
            type="submit"
            disabled={aviso === "enviando"}
            className="border border-dorado/60 px-3 py-1 font-dm text-[11px] tracking-wide text-dorado transition-colors hover:bg-dorado/10 disabled:opacity-60"
          >
            {aviso === "enviando" ? (en ? "Sending…" : "Enviando…") : (en ? "Notify me" : "Avisarme")}
          </button>
        </form>
      ) : null}
      {!turquesa && aviso === "listo" ? (
        <p className="mx-auto max-w-7xl px-4 pb-2 text-center font-dm text-[11px] text-lima">
          {en ? "Done. We'll email you when the river turns turquoise." : "Listo: te escribimos cuando el río se ponga turquesa."}
        </p>
      ) : null}
    </div>
  );
}
