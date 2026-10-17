import Image from "next/image";
import { ArrowRight, Bus } from "lucide-react";
import { TrackedLink } from "@/components/TrackedLink";
import { DIAS, HORA_REGRESO, NOCHES_TEXTO, PUNTO_SALIDA, VIAJE_RUTA, type Locale } from "@/lib/viajeCdmx/config";
import { NOCHES_TEXTO_EN, VIAJE_RUTA_EN } from "@/lib/viajeCdmx/en";

/**
 * El viaje CDMX–Xilitla en una tarjeta, para las páginas que ya traen a la
 * gente que lo compraría (16 oct 2026): /desde/cdmx, las fichas de Tamul y de
 * la Ruta Surrealista, los destinos del itinerario y los artículos del blog de
 * planeación. Es el enlace interno que le dice a Google que esta es LA página
 * del viaje desde la CDMX, y la salida a la venta de quien lee.
 *
 * Sin base de datos a propósito: varias de esas páginas son estáticas y se
 * arman en el build, donde una fecha o un precio se quedarían congelados una
 * hora. Las cifras vivas están en la página del viaje y en el bloque del inicio.
 * Solo en español: el viaje solo se vende así.
 */
export function TarjetaViajeCdmx({
  origen,
  titulo,
  texto,
  className = "",
  locale = "es",
}: {
  /** Para la medición: de qué página vino el clic. */
  origen: string;
  titulo?: string;
  texto?: string;
  className?: string;
  /** En inglés enlaza a /en/huasteca-potosina-from-mexico-city (16 oct 2026). */
  locale?: Locale;
}) {
  const en = locale === "en";
  return (
    <aside
      aria-label={en ? "Huasteca Potosina trip from Mexico City" : "Viaje a la Huasteca Potosina desde CDMX"}
      className={`not-prose relative overflow-hidden border border-dorado/30 bg-negro/60 flex flex-col sm:flex-row ${className}`}
    >
      <div className="relative h-36 sm:h-auto sm:w-44 shrink-0">
        <Image
          src="/imagenes/tours/tamul/cascada-de-tamul-arcoiris.jpg"
          alt={en ? "Tamul waterfall with a rainbow over the turquoise river" : "La cascada de Tamul con un arcoíris sobre el río turquesa"}
          fill
          className="object-cover object-[28%_50%]"
          sizes="(max-width: 640px) 100vw, 176px"
        />
      </div>
      <div className="p-5">
        <p className="font-dm text-[10px] uppercase tracking-[3px] text-verde-vivo inline-flex items-center gap-2">
          <Bus className="w-3.5 h-3.5" aria-hidden="true" /> {en ? "Small-group trip from Mexico City · monthly" : "Salida grupal desde CDMX · cada mes"}
        </p>
        <p className="mt-2 font-cormorant text-crema text-2xl leading-tight">{titulo ?? (en ? "In Mexico City? Join the monthly trip" : "¿Sales de la CDMX? Vente en el viaje del mes")}</p>
        <p className="mt-2 font-dm text-[13px] text-crema/70 leading-relaxed">
          {texto ?? (en
            ? `Leave the Angel of Independence on Friday at midnight and wake up in Xilitla: ${DIAS} days, ${NOCHES_TEXTO_EN} at our hotel, breakfasts, Las Pozas and Tamul waterfall with a guide. Back Monday at ${HORA_REGRESO}. All included.`
            : `Sales del ${PUNTO_SALIDA.nombre} el viernes a la medianoche y despiertas en Xilitla: ${DIAS} días, ${NOCHES_TEXTO} en nuestro hotel, desayunos, Las Pozas y la cascada de Tamul con guía. De vuelta el lunes a las ${HORA_REGRESO}. Todo incluido.`)}
        </p>
        <TrackedLink
          href={en ? VIAJE_RUTA_EN : VIAJE_RUTA}
          event="VIAJE_BANNER_CLICK"
          data={{ origen, boton: "tarjeta" }}
          className="group mt-4 inline-flex items-center gap-2 min-h-[44px] px-5 bg-dorado text-negro hover:bg-crema text-[11px] tracking-[2px] uppercase font-dm transition-colors"
        >
          {en ? "Huasteca trip from Mexico City" : "Viaje a la Huasteca desde CDMX"}
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </TrackedLink>
      </div>
    </aside>
  );
}

/**
 * En qué artículos del blog sale la tarjeta, y dónde (17 oct 2026: por lo que
 * DICE el artículo, no solo por su dirección, para que los nuevos que hable de
 * la CDMX o de viajes de varios días la traigan solos).
 *
 *  · Arriba: los que hablan de la CDMX o de cómo llegar (es la respuesta a lo
 *    que buscaron).
 *  · A mitad: los de planeación, paquetes, itinerarios o fines de semana, y las
 *    guías de los lugares del itinerario (en GA4, sep 2026: guía de lugar 4.5×,
 *    planeación 3× las vistas del resto).
 *  · Xantolo trae su propia salida a la venta y no se toca.
 */
export function tarjetaViajeEnBlog(slug: string, contenido = ""): "arriba" | "medio" | null {
  if (/xantolo/.test(slug)) return null;
  const texto = contenido.replace(/<[^>]+>/g, " ");
  if (/cdmx|como-llegar/.test(slug) || /\bCDMX\b|Ciudad de M[eé]xico|\bD\.?F\.?\b/i.test(texto)) return "arriba";
  if (/itinerario|cuanto-cuesta|presupuesto|guia-definitiva|mejor-epoca|mejor-temporada|en-octubre|las-pozas|boletos-las-pozas|tamul|huichihuayan|xilitla-en-pareja|hoteles-cerca-de-las-pozas|seguridad-xilitla/.test(slug)) return "medio";
  if (/paquetes?\b|fin de semana|varios d[ií]as|\b[2-7] d[ií]as\b|\b[1-6] noches?\b|itinerario/i.test(texto)) return "medio";
  return null;
}
