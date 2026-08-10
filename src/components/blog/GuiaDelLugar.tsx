import Link from "next/link";
import { MapPin, ArrowRight } from "lucide-react";
import { destinoDeBlog } from "@/lib/blogDestinoMap";
import { DESTINOS_DB } from "@/lib/destinos";
import { toursQueIncluyen, toursCercaDe } from "@/lib/tourMapping";
import { TOURS_DB } from "@/lib/tours";

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
    <aside className="my-12 border border-lima/20 bg-verde-profundo/40 p-6 sm:p-8">
      <p className="text-[9px] tracking-[2px] uppercase font-dm text-lima/60 mb-4">
        {fichas.length > 1 ? "Las fichas de los dos lugares" : "Ficha práctica del lugar"}
      </p>

      <div className="flex flex-col gap-3 mb-6">
        {fichas.map((d) => (
          <Link
            key={d.slug}
            href={`/destinos/${d.slug}`}
            className="group flex items-center gap-3 text-crema hover:text-lima transition-colors"
          >
            <MapPin className="w-4 h-4 text-lima/70 flex-shrink-0" aria-hidden />
            <span className="font-cormorant text-xl font-light">{d.nombre}</span>
            <span className="text-crema/40 font-dm text-xs">
              {[d.precio_entrada, d.horario].filter(Boolean).join(" · ")}
            </span>
            <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden />
          </Link>
        ))}
      </div>

      {tours.length > 0 && (
        <>
          <p className="text-[9px] tracking-[2px] uppercase font-dm text-lima/60 mb-3">
            {visitan ? "Tours que van a este lugar" : "Tours que operan en la zona"}
          </p>
          <ul className="flex flex-col gap-2">
            {tours.map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/tours/${t.slug}`}
                  className="group flex items-baseline justify-between gap-4 border-b border-white/8 py-2 hover:border-lima/40 transition-colors"
                >
                  <span className="font-dm text-sm text-crema/80 group-hover:text-crema transition-colors">
                    {t.nombre}
                  </span>
                  <span className="font-dm text-sm text-lima whitespace-nowrap">
                    ${t.precio.toLocaleString("es-MX")}
                    <span className="text-crema/35 text-xs">
                      {t.precioUnidad === "vehiculo" ? " /vehículo" : " /persona"}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-crema/45 font-dm text-xs">
            Apartas con el 30 % y cancelas gratis hasta 48 h antes.
          </p>
        </>
      )}
    </aside>
  );
}
