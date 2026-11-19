import Link from "next/link";
import { waLink } from "@/lib/whatsapp";
import { cupoDeTour, disponibilidadDeTour } from "@/lib/cupoTour";
import type { Tour } from "@/lib/tours";
import {
  temporadaParaAviso,
  inicioDeConteo,
  fraseDemanda,
  fraseDemandaEn,
  textoFaltan,
  textoFaltanEn,
  fechasTemporada,
  fechasTemporadaEn,
  mensajeTemporada,
  mensajeTemporadaEn,
  mensajeDudas,
  mensajeDudasEn,
  mensajeCierre,
  mensajeCierreEn,
} from "@/lib/blogCtaWhatsapp";

/*
 * Los tres llamados a WhatsApp del artículo (19 nov 2026), en español y en
 * inglés. La lógica y los textos están en `lib/blogCtaWhatsapp.ts`; aquí solo
 * se lee la base y se pinta.
 *
 * Cada uno lleva `data-seccion`: el contador global de WhatsApp
 * (`WhatsAppClickTracker`) lo guarda con el clic, y así se sabe cuál de los
 * tres funciona. El enlace NO lleva `data-wa-manual`: lo mide ese contador, que
 * además le pega el código de referencia al mensaje.
 *
 * Formas del checkout (`components/checkout/estilos.ts`): tarjeta `rounded-2xl`,
 * botón `rounded-xl`. Verde de WhatsApp con texto NEGRO (9:1); con texto
 * blanco no llega a 2:1. El hover va más oscuro, nunca más claro.
 */

type Idioma = "es" | "en";

const T = {
  es: {
    ahora: "Temporada alta, ahora",
    cupo: (n: number) => `Cada salida es de máximo ${n} personas.`,
    apartar: "Apartar fecha por WhatsApp",
    fechasLibres: "Ver fechas libres",
    tourHref: (slug: string) => `/tours/${slug}`,
    dudasTitulo: (lugar: string) => `¿Tienes dudas para ir a ${lugar}?`,
    dudasTexto: "Pregúntanos por WhatsApp: fechas, cómo llegar, qué llevar y qué recorrido te conviene. Somos de Xilitla.",
    dudasBoton: "Preguntar por WhatsApp",
    cierreAntes: "¿Prefieres preguntar antes de reservar?",
    cierreBoton: "Escríbenos por WhatsApp",
  },
  en: {
    ahora: "High season, now",
    cupo: (n: number) => `Each departure takes ${n} people at most.`,
    apartar: "Hold my date on WhatsApp",
    fechasLibres: "See open dates",
    tourHref: (slug: string) => `/en/tours/${slug}`,
    dudasTitulo: (lugar: string) => `Questions about visiting ${lugar}?`,
    dudasTexto: "Ask us on WhatsApp: dates, how to get there, what to pack and which tour fits you. We're based in Xilitla.",
    dudasBoton: "Ask on WhatsApp",
    cierreAntes: "Rather ask before booking?",
    cierreBoton: "Message us on WhatsApp",
  },
} as const;

const BOTON_WA =
  "inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#25D366] px-6 font-dm text-[15px] font-medium text-negro " +
  "shadow-[0_10px_24px_-14px_rgba(18,140,60,0.8)] transition-[background-color,transform] duration-150 hover:bg-[#1ebe5b] active:scale-[0.99]";

const WA_SVG = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 flex-shrink-0" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

function BotonWhatsapp({ mensaje, children, className = "" }: { mensaje: string; children: React.ReactNode; className?: string }) {
  return (
    <a href={waLink(mensaje)} target="_blank" rel="noopener noreferrer" className={`${BOTON_WA} ${className}`}>
      {WA_SVG}
      {children}
    </a>
  );
}

/**
 * Arriba del artículo: la temporada alta que viene, cuánto falta y, si la hay,
 * la demanda REAL del recorrido del artículo en esas fechas. Si la siguiente
 * temporada está a más de 75 días, no sale.
 */
export async function AvisoTemporadaBlog({ titulo, tour, idioma = "es" }: { titulo: string; tour?: Tour; idioma?: Idioma }) {
  const t = temporadaParaAviso();
  if (!t) return null;
  const tx = T[idioma];
  const en = idioma === "en";
  const fechas = en ? fechasTemporadaEn(t) : fechasTemporada(t);
  const cupo = tour ? cupoDeTour(tour) : null;

  let demanda: string | null = null;
  if (tour && cupo !== null) {
    try {
      const estados = await disponibilidadDeTour(tour.slug, inicioDeConteo(t), t.hasta, 0);
      demanda = en ? fraseDemandaEn(estados, tour.nombreCorto) : fraseDemanda(estados, tour.nombreCorto);
    } catch {
      // Sin base no se dice nada de demanda; el resto del aviso es de calendario.
      demanda = null;
    }
  }
  const nombre = t.nombre[idioma];
  const mensaje = en
    ? mensajeTemporadaEn(titulo, nombre, fechas, tour?.nombreCorto)
    : mensajeTemporada(titulo, nombre.toLowerCase(), fechas, tour?.nombreCorto);

  return (
    <aside
      data-seccion="blog-temporada"
      aria-labelledby="aviso-temporada-titulo"
      className="mb-10 rounded-2xl border border-dorado/40 bg-white p-5 sm:p-6"
    >
      <p className="font-dm text-[13px] font-medium text-terracota">
        {t.enCurso ? tx.ahora : en ? textoFaltanEn(t.faltan) : textoFaltan(t.faltan)} · {nombre}, {fechas}
      </p>
      {/* Cifras «de línea»: las de Cormorant son de estilo antiguo y «21» o «5» se leían bailando. */}
      <p
        id="aviso-temporada-titulo"
        className="mt-2 font-cormorant text-[22px] leading-snug text-verde-profundo sm:text-2xl"
        style={{ fontVariantNumeric: "lining-nums", fontFeatureSettings: '"lnum" 1' }}
      >
        {t.nota[idioma]}
      </p>
      {(demanda || cupo !== null) && (
        <p className="mt-2 font-dm text-[14px] leading-relaxed text-negro/65">
          {demanda && <strong className="font-medium text-negro/80">{demanda} </strong>}
          {cupo !== null && tx.cupo(cupo)}
        </p>
      )}
      <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <BotonWhatsapp className="w-full sm:w-auto" mensaje={mensaje}>
          {tx.apartar}
        </BotonWhatsapp>
        {tour && (
          <Link
            href={tx.tourHref(tour.slug)}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-negro/15 bg-white px-5 font-dm text-sm font-medium text-verde-profundo transition-colors hover:border-verde-selva hover:text-verde-selva"
          >
            {tx.fechasLibres}
          </Link>
        )}
      </div>
    </aside>
  );
}

/** A mitad (o al final) del artículo, después de la ficha del lugar: para quien tiene dudas. */
export function PreguntaWhatsappBlog({ titulo, lugar, idioma = "es" }: { titulo: string; lugar: string; idioma?: Idioma }) {
  const tx = T[idioma];
  return (
    <aside data-seccion="blog-medio" className="not-prose my-10 rounded-2xl bg-verde-profundo/5 p-5 sm:p-6">
      <p className="font-cormorant text-[22px] leading-snug text-verde-profundo sm:text-2xl">{tx.dudasTitulo(lugar)}</p>
      <p className="mt-1.5 mb-4 max-w-[52ch] font-dm text-[14px] leading-relaxed text-negro/65">{tx.dudasTexto}</p>
      <BotonWhatsapp className="w-full sm:w-auto" mensaje={idioma === "en" ? mensajeDudasEn(titulo, lugar) : mensajeDudas(titulo, lugar)}>
        {tx.dudasBoton}
      </BotonWhatsapp>
    </aside>
  );
}

/** Dentro del cierre oscuro: la salida para quien prefiere preguntar antes de reservar. */
export function CierreWhatsappBlog({ titulo, tour, idioma = "es" }: { titulo: string; tour?: Tour; idioma?: Idioma }) {
  const tx = T[idioma];
  const mensaje = idioma === "en" ? mensajeCierreEn(titulo, tour?.nombreCorto) : mensajeCierre(titulo, tour?.nombreCorto);
  return (
    <div data-seccion="blog-cierre" className="mx-auto mt-5 max-w-md">
      <p className="mb-3 font-dm text-[13px] text-crema/60">{tx.cierreAntes}</p>
      <BotonWhatsapp mensaje={mensaje} className="w-full">
        {tx.cierreBoton}
      </BotonWhatsapp>
    </div>
  );
}
