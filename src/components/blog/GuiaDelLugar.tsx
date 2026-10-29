import Link from "next/link";
import { MapPin, ArrowRight } from "lucide-react";
import { destinoDeBlog } from "@/lib/blogDestinoMap";
import { DESTINOS_DB } from "@/lib/destinos";
import { toursQueIncluyen, toursCercaDe } from "@/lib/tourMapping";
import { TOURS_DB, esPorPersona, type Tour } from "@/lib/tours";
import { ANTICIPO_PCT } from "@/lib/carrito";

/**
 * "$1,550 MXN" · "desde $2,990 MXN": con MXN siempre, y con "desde" cuando la
 * cifra es solo el primer escalón —por vehículo (cada ruta del RZR tiene su
 * precio) o por grupo (el Edén sube con cada persona)—. Mismo criterio que
 * `llevaDesde` en /destinos/[slug].
 */
function precioTour(t: Tour): string {
  const desde = !esPorPersona(t) || !!t.rutas?.length ? "desde " : "";
  return `${desde}$${t.precio.toLocaleString("es-MX")} MXN`;
}

/**
 * Puente del artículo hacia la ficha del lugar y hacia los tours que SÍ lo
 * visitan.
 *
 * El artículo de Tamul es el que Google posiciona, pero no enlazaba ni a
 * `/destinos/cascada-de-tamul` ni a los tours que van a Tamul: el tráfico
 * llegaba a la página que no vende y ahí se quedaba. Los tours salen de
 * `toursQueIncluyen()`, no de una heurística por palabras, para no ofrecer un
 * recorrido que no pasa por el lugar del que trata el artículo.
 */
export function GuiaDelLugar({ blogSlug }: { blogSlug: string }) {
  const info = destinoDeBlog(blogSlug);
  if (!info) return null;

  const fichas = (info.comparativa ?? [info.destino])
    .map((slug) => DESTINOS_DB.find((d) => d.slug === slug))
    .filter((d): d is (typeof DESTINOS_DB)[number] => Boolean(d));
  if (!fichas.length) return null;

  // Si ningún tour visita el lugar, se ofrecen los que operan en la zona; la
  // distinción "incluye" vs "cerca" ya existe en tourMapping y no se difumina.
  const incluyen = toursQueIncluyen(info.destino);
  const refs = incluyen.length ? incluyen : toursCercaDe(info.destino);
  const visitan = incluyen.length > 0;

  const tours = refs
    .map((r) => TOURS_DB.find((t) => t.slug === r.slug))
    .filter((t): t is (typeof TOURS_DB)[number] => Boolean(t))
    .slice(0, 3);

  return (
    <aside className="my-12 rounded-2xl border border-negro/10 bg-white p-6 sm:p-8">
      <p className="mb-4 font-dm text-sm font-medium text-verde-selva">
        {fichas.length > 1 ? "Las fichas de los dos lugares" : "Ficha práctica del lugar"}
      </p>

      <div className="flex flex-col gap-3 mb-6">
        {fichas.map((d) => (
          <Link
            key={d.slug}
            href={`/destinos/${d.slug}`}
            className="group flex flex-wrap items-center gap-x-3 gap-y-1 text-verde-profundo transition-colors hover:text-verde-selva"
          >
            <MapPin className="h-4 w-4 flex-shrink-0 text-verde-selva" aria-hidden />
            <span className="font-cormorant text-xl font-light">{d.nombre}</span>
            <span className="font-dm text-[13px] text-negro/50">
              {[d.precio_entrada, d.horario].filter(Boolean).join(" · ")}
            </span>
            <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden />
          </Link>
        ))}
      </div>

      {tours.length > 0 && (
        <>
          <p className="mb-1 mt-2 font-dm text-sm font-medium text-verde-selva">
            {visitan ? "Tours que van a este lugar" : "Tours que operan en la zona"}
          </p>
          <ul className="flex flex-col">
            {tours.map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/tours/${t.slug}`}
                  className="group flex items-baseline justify-between gap-4 border-t border-negro/10 py-3 transition-colors"
                >
                  <span className="font-dm text-[15px] text-verde-profundo transition-colors group-hover:text-verde-selva">
                    {t.nombre}
                  </span>
                  <span className="whitespace-nowrap font-dm text-sm font-medium text-dorado">
                    {precioTour(t)}
                    <span className="text-[12px] font-normal text-negro/45">
                      {t.precioUnidad === "vehiculo" ? " /vehículo" : t.precioUnidad === "grupo" ? " /grupo" : " /persona"}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {/* El 30 % es la regla real (`pctACobrar`, 29 sep 2026). La
              cancelación sí tiene excepción: el Edén no tiene reembolso
              (`cancelacion`), y la salvedad se dice abajo. */}
          <p className="mt-4 font-dm text-[13px] text-negro/55">
            Apartas con el {ANTICIPO_PCT} % al reservar y liquidas el resto el día del tour.
            {tours.some((t) => t.cancelacion)
              ? " Cada recorrido tiene su política de cancelación en su ficha."
              : " Cancelas gratis hasta 48 h antes."}
          </p>
        </>
      )}
    </aside>
  );
}
