import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BedDouble, Luggage, UtensilsCrossed, Waves } from "lucide-react";
import { partesRecogida, recogidaDeTour, type Tour } from "@/lib/tours";
import { PAQUETES_DB } from "@/lib/paquetes";
import { HOTEL_PROPIO as H, horarioRestaurante } from "@/lib/hotelPropio";
import { localePath, type Locale } from "@/lib/i18n/config";

/**
 * «Duerme a 400 m de Las Pozas»: el hotel y el restaurante que son nuestros,
 * en la ficha del recorrido (acción 6 de la auditoría externa, 7 oct 2026).
 *
 * Lo de «el hotel y el restaurante son nuestros» salía en la portada, en el
 * pie y en /info-practica, pero no en la ficha, que es donde la gente decide.
 * Aquí va con lo que sí es ventaja del hotel; lo que NO lo es (la recogida, el
 * desayuno, el precio) está explicado en `hotelPropio.ts`.
 *
 * Qué ficha lo lleva lo decide el catálogo:
 *  - Completo, en los que salen de Xilitla o paran en Las Pozas: para ellos
 *    dormir en Xilitla es lo práctico.
 *  - Corto, en los del lado de Ciudad Valles que van en algún paquete con
 *    hotel (Tamul, Meco, Micos, el rafting). «Duerme aquí para este tour» les
 *    dejaría el río a hora y media de carretera; el hotel les llega como lo
 *    venden los paquetes, combinado con Las Pozas.
 *  - Nada en los demás: el buceo es en Rioverde, y el rappel y Puente de Dios
 *    no van en ningún paquete. Un cuarto a dos horas del recorrido no ayuda a
 *    decidir.
 */

type TourBloque = Pick<Tour, "slug" | "recogida" | "destinos">;

/**
 * ¿Dormir en Xilitla le sirve a ESTE recorrido? Se lee de `recogida` y de los
 * destinos, no de una lista de slugs: el próximo tour de Xilitla lo hereda solo.
 *  - Recoge solo en Xilitla (`hospedaje-xilitla`) o nos vemos en la base de
 *    Xilitla (`base-xilitla`, el RZR).
 *  - Recoge en las dos ciudades pero para en Las Pozas: la Ruta Surrealista y
 *    Huasteca Instagrameable, que lo visita el primer día.
 */
function saleDeXilitla(t: TourBloque): boolean {
  const { tipo } = recogidaDeTour(t);
  if (tipo === "hospedaje-xilitla" || tipo === "base-xilitla") return true;
  return t.destinos.some((d) => /las pozas/i.test(d));
}

/** Cuántos paquetes del catálogo llevan el recorrido. Todos duermen en el hotel. */
function paquetesConTour(slug: string): number {
  return PAQUETES_DB.filter((p) => p.itinerario.some((d) => d.tourSlug === slug)).length;
}

/**
 * Pásale el tour de `TOURS_DB` (el español), no el localizado: los destinos se
 * buscan por su nombre en español («Las Pozas»).
 */
export function BloqueCasaPropia({ tour, locale }: { tour: TourBloque; locale: Locale }) {
  const en = locale === "en";
  const hrefPaquetes = localePath("/paquetes", locale);
  // Espacios duros: «400 / m» o «Las / Pozas» partidos en dos renglones se leen mal.
  const metros = `${H.metrosALasPozas} m`;
  const lasPozas = "Las Pozas";

  if (!saleDeXilitla(tour)) {
    const n = paquetesConTour(tour.slug);
    if (n === 0) return null;
    return (
      <aside
        aria-label={en ? "This tour in a package with hotel" : "Este recorrido en paquete con hotel"}
        className="flex items-start gap-4 border border-white/10 bg-verde-profundo/30 p-5"
      >
        <BedDouble className="mt-0.5 h-5 w-5 flex-shrink-0 text-dorado" aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-dm text-sm text-crema/85">
            {en
              ? n === 1 ? "This tour also comes in a package with hotel." : `This tour also comes in ${n} packages with hotel.`
              : n === 1 ? "Este recorrido también va en un paquete con hotel." : `Este recorrido también va en ${n} paquetes con hotel.`}
          </p>
          <p className="mt-1 font-dm text-xs leading-relaxed text-crema/60">
            {en
              ? `You stay at our hotel in Xilitla, ${metros} from ${lasPozas}, with ${H.restaurante} inside.`
              : `Duermes en nuestro hotel de Xilitla, a ${metros} de ${lasPozas}, con ${H.restaurante} adentro.`}
          </p>
          {/* Sin precarga, como el pie: cada precarga es un render completo en
              el servidor y este enlace queda al final de la ficha. */}
          <Link
            href={hrefPaquetes}
            prefetch={false}
            className="mt-2 inline-flex items-center gap-1.5 py-1.5 font-dm text-[10px] uppercase tracking-[2px] text-dorado transition-colors duration-200 [@media(hover:hover)]:hover:text-lima"
          >
            {en ? "See the packages" : "Ver los paquetes"}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </aside>
    );
  }

  // Quien llega en el autobús de la mañana pregunta siempre lo mismo (Manolo,
  // 6 oct 2026). Lo de «ahí pasamos por ti» solo donde el recorrido de verdad
  // pasa por el hospedaje: en el RZR nos vemos en la base.
  const pasamosPorTi = partesRecogida(tour, en).incluyeTraslado;
  const puntos = [
    {
      Icon: UtensilsCrossed,
      texto: en
        ? `${H.restaurante}, our Huasteca-food restaurant, is inside the hotel: open ${horarioRestaurante(true)}.`
        : `${H.restaurante}, nuestro restaurante de cocina huasteca, está dentro del hotel: abre ${horarioRestaurante(false)}.`,
    },
    {
      Icon: Waves,
      texto: en ? "Outdoor pool for guests." : "Alberca al aire libre para los huéspedes.",
    },
    {
      Icon: Luggage,
      texto: en
        ? `Arriving on the morning bus? If your room is ready, it's yours when you arrive; if not, you leave your bags at reception${pasamosPorTi ? " and we pick you up there for the tour" : ""}.`
        : `¿Llegas en el autobús de la mañana? Si tu cuarto ya está libre, es tuyo al llegar; si no, dejas las maletas en recepción${pasamosPorTi ? " y ahí pasamos por ti para el tour" : ""}.`,
    },
  ];

  return (
    <section
      aria-labelledby="casa-propia"
      className="overflow-hidden border border-white/10 bg-verde-profundo/30 sm:grid sm:grid-cols-5"
    >
      {/* La alberca y los jardines: la foto enseña lo que la lista promete. En
          `sm` deja el 16:9 y se estira al alto del texto. */}
      <div className="relative aspect-[16/9] sm:col-span-2 sm:aspect-auto">
        <Image
          src="/imagenes/hotel-paraiso-encantado/hero.jpg"
          alt={en ? `Pool and gardens at ${H.nombre}, in Xilitla` : `Alberca y jardines del ${H.nombre}, en Xilitla`}
          fill
          loading="lazy"
          sizes="(min-width: 1024px) 254px, (min-width: 640px) 40vw, 100vw"
          className="object-cover"
        />
      </div>

      <div className="p-5 sm:col-span-3 sm:p-6">
        <p className="mb-2 font-dm text-[10px] uppercase tracking-[2px] text-dorado">
          {en ? "Our hotel in Xilitla" : "Nuestro hotel en Xilitla"}
        </p>
        <h2 id="casa-propia" className="font-cormorant text-2xl leading-tight text-crema">
          {en ? `Stay ${metros} from ${lasPozas}` : `Duerme a ${metros} de ${lasPozas}`}
        </h2>
        <p className="mt-2 font-dm text-sm leading-relaxed text-crema/65">
          {en
            ? `${H.nombre} is ours too: it's in ${H.zona}, a ${H.minutosCaminando}-minute walk from Edward James's garden.`
            : `El ${H.nombre} también es nuestro: está en ${H.zona}, a ${H.minutosCaminando} minutos caminando del jardín de Edward James.`}
        </p>

        <ul className="mt-4 space-y-2.5">
          {puntos.map(({ Icon, texto }) => (
            <li key={texto} className="flex items-start gap-3 font-dm text-sm leading-relaxed text-crema/75">
              <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-dorado" aria-hidden="true" />
              <span>{texto}</span>
            </li>
          ))}
        </ul>

        <Link
          href={hrefPaquetes}
          prefetch={false}
          className="mt-5 inline-flex items-center gap-2 border border-dorado/50 px-5 py-3 font-dm text-[10px] uppercase tracking-[2px] text-dorado transition-[background-color,border-color,transform] duration-200 ease-out [@media(hover:hover)]:hover:border-dorado [@media(hover:hover)]:hover:bg-dorado/10 active:scale-[0.97]"
        >
          {en ? "See packages with hotel" : "Ver paquetes con hotel"}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
