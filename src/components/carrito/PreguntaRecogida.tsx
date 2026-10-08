"use client";

import { MapPin } from "lucide-react";
import { TOURS_DB, recogidaDeTour } from "@/lib/tours";
import { useCarritoSlugs } from "@/components/carrito/useCarritoSlugs";
import { useLocale } from "@/lib/i18n/useLocale";

/**
 * La pregunta de dónde pasamos por el cliente, en el carrito y en el checkout.
 *
 * Pedido de Manolo (7 oct 2026): «dale más importancia y pregunta a dónde
 * pasamos por ti: tu hospedaje en Xilitla o Ciudad Valles». Antes era un
 * renglón más con el texto gris «¿Dónde te hospedas? (hotel y ciudad)» entre el
 * correo y el WhatsApp, y es justo el dato que el equipo necesita para la
 * logística del día: sin él hay que perseguir al cliente por WhatsApp.
 *
 * 🔴 La ayuda depende de lo que lleva el carrito, no se escribe fija: no todos
 * los recorridos recogen en los dos pueblos (`recogida` en tours.ts). La Gruta
 * de Xilo y el Edén pasan SOLO por Xilitla, y el RZR y el buceo no pasan por
 * nadie (nos vemos en la base o en el sitio). Prometer «Xilitla o Ciudad
 * Valles» a quien solo lleva la Gruta es prometer una recogida que no existe.
 *
 * Sigue siendo opcional: quien aún no reservó hotel no debe quedarse sin poder
 * pagar. Vacío, el equipo se lo pregunta por WhatsApp antes del tour.
 */
type Modo = "xilitla-o-valles" | "mixto" | "solo-xilitla" | "sin-recogida";

function modoDelCarrito(slugs: Set<string>): Modo {
  const tipos = Array.from(slugs)
    .map((s) => TOURS_DB.find((t) => t.slug === s))
    .filter((t): t is (typeof TOURS_DB)[number] => !!t)
    .map((t) => recogidaDeTour(t).tipo);
  // Sin tours todavía (el carrito aún no carga): la pregunta de siempre.
  if (!tipos.length) return "xilitla-o-valles";
  const enValles = tipos.includes("hospedaje");
  const soloXilitla = tipos.includes("hospedaje-xilitla");
  if (enValles && soloXilitla) return "mixto";
  if (enValles) return "xilitla-o-valles";
  if (soloXilitla) return "solo-xilitla";
  return "sin-recogida";
}

const TEXTOS = {
  es: {
    titulo: "¿A dónde pasamos por ti?",
    tituloSinRecogida: "¿Dónde te hospedas?",
    ayuda: {
      "xilitla-o-valles": "Tu hospedaje en Xilitla o Ciudad Valles.",
      mixto: "Tu hospedaje en Xilitla o Ciudad Valles. Algunos de tus recorridos recogen solo en Xilitla: lo ves en cada uno.",
      "solo-xilitla": "Tu hospedaje en Xilitla: tus recorridos recogen solo allá.",
      "sin-recogida": "Tus recorridos empiezan en el punto de encuentro; tu hospedaje nos sirve por si hay cambios.",
    } as Record<Modo, string>,
    placeholder: "Nombre del hotel y ciudad",
    vacio: "¿Aún no lo sabes? Déjalo vacío: te lo preguntamos por WhatsApp antes del tour.",
  },
  en: {
    titulo: "Where should we pick you up?",
    tituloSinRecogida: "Where are you staying?",
    ayuda: {
      "xilitla-o-valles": "Your lodging in Xilitla or Ciudad Valles.",
      mixto: "Your lodging in Xilitla or Ciudad Valles. Some of your tours pick up in Xilitla only — each one says so.",
      "solo-xilitla": "Your lodging in Xilitla: your tours pick up there only.",
      "sin-recogida": "Your tours start at the meeting point; your lodging helps us if plans change.",
    } as Record<Modo, string>,
    placeholder: "Hotel name and town",
    vacio: "Not sure yet? Leave it blank — we'll ask you on WhatsApp before the tour.",
  },
};

export function PreguntaRecogida({
  valor,
  cambiar,
  id = "pregunta-recogida",
  onBlur,
}: {
  valor: string;
  cambiar: (v: string) => void;
  id?: string;
  onBlur?: () => void;
}) {
  const { en } = useLocale();
  const t = en ? TEXTOS.en : TEXTOS.es;
  const modo = modoDelCarrito(useCarritoSlugs());

  return (
    <div className="border border-verde-selva/30 bg-verde-selva/5 p-4">
      <label htmlFor={id} className="flex items-center gap-2 font-cormorant text-[22px] leading-tight text-verde-profundo">
        <MapPin className="h-5 w-5 flex-shrink-0 text-verde-selva" aria-hidden="true" />
        {modo === "sin-recogida" ? t.tituloSinRecogida : t.titulo}
      </label>
      <p id={`${id}-ayuda`} className="mt-1.5 font-dm text-[13px] leading-snug text-negro/70">
        {t.ayuda[modo]}
      </p>
      {/* 16 px y no 14: con menos, Safari del iPhone hace zoom a toda la página
          al tocar el campo y el cliente pierde de vista el resto del carrito. */}
      <input
        id={id}
        value={valor}
        onChange={(e) => cambiar(e.target.value)}
        onBlur={onBlur}
        placeholder={t.placeholder}
        autoComplete="off"
        aria-describedby={`${id}-ayuda ${id}-vacio`}
        className="mt-3 w-full border border-negro/20 bg-white px-3 py-3 font-dm text-base text-negro placeholder:text-negro/40 outline-none focus:border-verde-selva"
      />
      <p id={`${id}-vacio`} className="mt-2 font-dm text-[12px] leading-snug text-negro/55">
        {t.vacio}
      </p>
    </div>
  );
}
