import Image from "next/image";
import { Flame, Flower2, Music } from "lucide-react";
import { TrackedLink } from "@/components/TrackedLink";
import { PatronXantolo } from "@/components/blog/PatronXantolo";
import { nochesXantoloALaVenta, paginasDeEventoALaVenta, precioVisible } from "@/lib/paquetes";
import { XAN_FLOR, XAN_MORADO } from "@/lib/xantoloEstilo";

/**
 * El paquete de Xantolo, debajo del viaje CDMX en el inicio y en /paquetes
 * (Manolo, 15 oct 2026), con su patrón de iconos de temporada de fondo.
 *
 * Mismo contenido que la franja que ya vivía en /paquetes —precio, noches y el
 * recorrido opcional salen del catálogo (`paquetes.ts`), nada escrito aquí— y
 * desaparece sola cuando ya no se vende (`eventoALaVenta`). Solo en español:
 * el paquete solo se vende así.
 */
const FOTO = "/imagenes/paquetes/xantolo-2026/comparsa-noche.jpg";

export function BloqueXantolo({ origen }: { origen: "inicio" | "paquetes" }) {
  const paginas = paginasDeEventoALaVenta();
  if (!paginas.length) return null;

  return (
    <>
      {paginas.map((p) => {
        const ev = p.evento!;
        const cuando = ev.sinHotel
          ? nochesXantoloALaVenta().map((n) => n.evento!.fechaTexto.replace(/ de \d{4}$/, "")).join(" o ")
          : `Solo el ${ev.fechaTexto.toLowerCase()}`;
        const precio = precioVisible(p);
        return (
          <section
            key={p.slug}
            aria-label={`${p.nombre}: ${cuando}`}
            className="relative overflow-hidden border-y"
            style={{ backgroundColor: XAN_MORADO, borderColor: `${XAN_FLOR}40` }}
          >
            <PatronXantolo cols={16} filas={6} intensidad={1.9} />
            {/* Un velo del lado del texto para que el patrón no le reste lectura. */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden md:block bg-[radial-gradient(ellipse_at_72%_50%,rgba(42,18,49,0.85)_0%,rgba(42,18,49,0.4)_50%,rgba(42,18,49,0)_80%)]" />
            <div className="relative max-w-6xl mx-auto grid md:grid-cols-[0.9fr_1.1fr] items-center gap-0 md:gap-10 md:px-6 md:py-12">
              <div className="relative aspect-[16/10] md:aspect-[4/3] overflow-hidden md:border" style={{ borderColor: `${XAN_FLOR}55` }}>
                <Image src={FOTO} alt="Comparsa de Xantolo con máscaras y trajes de colores en la noche" fill className="object-cover" sizes="(max-width: 768px) 100vw, 520px" loading="lazy" />
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[#2a1231] via-transparent to-transparent md:hidden" />
              </div>
              <div className="px-5 pb-10 pt-2 sm:px-8 md:p-0">
                <p className="font-dm text-[10px] uppercase tracking-[3px] inline-flex items-center gap-2" style={{ color: XAN_FLOR }}>
                  <Flower2 className="w-3.5 h-3.5" aria-hidden="true" /> Xantolo · {cuando}
                </p>
                <h2 className="mt-3 font-cormorant font-light leading-[1.05] text-crema" style={{ fontSize: "clamp(30px,4.5vw,46px)" }}>
                  {p.nombre}
                </h2>
                <p className="mt-3 font-dm text-[15px] leading-relaxed text-crema/75">
                  {p.subtitulo}.
                </p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {[
                    { Icon: Flame, t: "Altares y velas" },
                    { Icon: Music, t: "Huapango y comparsas" },
                    { Icon: Flower2, t: "Cempasúchil" },
                  ].map(({ Icon, t }) => (
                    <li key={t} className="inline-flex items-center gap-1.5 border px-2.5 py-1 font-dm text-[11px] text-crema/80" style={{ borderColor: `${XAN_FLOR}55` }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: XAN_FLOR }} aria-hidden="true" />{t}
                    </li>
                  ))}
                </ul>
                <p className="mt-5 font-dm text-crema">
                  <span className="font-cormorant text-3xl" style={{ color: XAN_FLOR }}>${precio.toLocaleString("es-MX")}</span>
                  <span className="text-xs text-crema/60"> {ev.sinHotel ? "por persona" : "la pareja"}</span>
                </p>
                {ev.sinHotel && ev.tourOpcional && (
                  <p className="mt-1 font-dm text-[13px] text-crema/60">
                    O ${(precio + ev.tourOpcional.precioPorPersona).toLocaleString("es-MX")} con la {ev.tourOpcional.nombre} ese mismo día.
                  </p>
                )}
                {!ev.sinHotel && (
                  <p className="mt-1 font-dm text-[13px] text-crema/60">Para parejas o familias: {ev.cupo} cuartos.</p>
                )}
                <TrackedLink
                  href={ev.pagina}
                  event="XANTOLO_BLOQUE_CLICK"
                  data={{ origen, paquete: p.slug }}
                  // Los colores de `xantoloEstilo.ts` (cempasúchil y tinta), escritos como clase: el enlace no recibe `style`.
                  className="mt-6 inline-flex items-center justify-center min-h-[48px] px-7 bg-[#f29422] text-[#1a0c1f] font-dm text-[11px] font-medium uppercase tracking-[2px] transition-[filter,transform] duration-200 hover:brightness-110 active:scale-[0.98]"
                >
                  {ev.sinHotel ? "Ver las noches" : "Ver el paquete"}
                </TrackedLink>
              </div>
            </div>
          </section>
        );
      })}
    </>
  );
}
