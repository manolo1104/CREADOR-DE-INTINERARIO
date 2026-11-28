/* CompararRappeles — los cuatro rappeles lado a lado (Server Component).
 *
 * 27 nov 2026 (Manolo: «haz la tabla comparativa»). Sale en la ficha de cada
 * rappel con el que estás viendo marcado. Los datos vienen de `lib/rappeles.ts`,
 * el mismo lugar del que lee el llms.txt, así que la página y lo que lee la IA
 * no pueden decir cosas distintas. Tabla en el mismo tono oscuro de la ficha
 * (nada de islas claras) y con desplazamiento horizontal en el teléfono.
 */
import Link from "next/link";
import { filasRappeles, textoComparaRappeles } from "@/lib/rappeles";
import { SITE, localePath, type Locale } from "@/lib/i18n/config";

export function CompararRappeles({ locale, actualId }: { locale: Locale; actualId: string }) {
  const en = locale === "en";
  const filas = filasRappeles(locale);
  if (filas.length < 2) return null;
  const money = (n: number) => `$${n.toLocaleString(en ? "en-US" : "es-MX")}`;

  // La lista para los buscadores: qué cuatro recorridos se están comparando.
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: en ? "Rappelling in the Huasteca Potosina: the 4 descents compared" : "Rappel en la Huasteca Potosina: los 4 descensos comparados",
    itemListElement: filas.map((f, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: f.local.nombreCorto,
      url: `${SITE}${localePath(`/tours/${f.local.slug}`, locale)}`,
    })),
  };

  return (
    <section aria-labelledby="comparar-rappeles">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
      <h2 id="comparar-rappeles" className="font-cormorant text-crema text-2xl mb-3">
        {en ? "Which rappel is right for you?" : "¿Cuál rappel te conviene?"}
      </h2>
      <p className="text-crema/70 font-dm text-sm leading-relaxed mb-5">{textoComparaRappeles(locale)}</p>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[560px] text-left font-dm text-[13px]">
          <caption className="sr-only">
            {en ? "The four rappels compared: the descent, length, price and group size" : "Los cuatro rappeles comparados: el descenso, la duración, el precio y el grupo"}
          </caption>
          <thead>
            <tr className="bg-white/[0.04] text-[10px] tracking-[1.5px] uppercase text-crema/50">
              <th scope="col" className="px-4 py-3 font-medium">{en ? "Rappel" : "Rappel"}</th>
              <th scope="col" className="px-4 py-3 font-medium">{en ? "The descent" : "El descenso"}</th>
              <th scope="col" className="px-4 py-3 font-medium whitespace-nowrap">{en ? "Length" : "Duración"}</th>
              <th scope="col" className="px-4 py-3 font-medium whitespace-nowrap">{en ? "Per person" : "Por persona"}</th>
              <th scope="col" className="px-4 py-3 font-medium whitespace-nowrap">{en ? "Group" : "Grupo"}</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => {
              const actual = f.tour.id === actualId;
              return (
                <tr key={f.tour.id} className={`border-t border-white/8 ${actual ? "bg-verde-selva/20" : ""}`}>
                  <th scope="row" className="px-4 py-3 font-normal">
                    {actual ? (
                      <span className="text-crema">
                        {f.local.nombreCorto}
                        <span className="ml-2 text-[10px] text-verde-vivo">{en ? "· this one" : "· este"}</span>
                      </span>
                    ) : (
                      <Link href={localePath(`/tours/${f.local.slug}`, locale)} className="text-crema underline decoration-white/25 underline-offset-2 hover:text-lima">
                        {f.local.nombreCorto}
                      </Link>
                    )}
                  </th>
                  <td className="px-4 py-3 text-crema/75">{f.dato}</td>
                  <td className="px-4 py-3 text-crema/75 whitespace-nowrap">{f.duracion}</td>
                  <td className="px-4 py-3 text-dorado whitespace-nowrap">{money(f.precio)} MXN</td>
                  <td className="px-4 py-3 text-crema/75 whitespace-nowrap">{f.grupo}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
