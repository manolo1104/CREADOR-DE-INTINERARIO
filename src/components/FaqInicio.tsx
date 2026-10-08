import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { getFaq } from "@/lib/i18n/faq.en";
import { localePath, type Locale } from "@/lib/i18n/config";

/**
 * Las ocho dudas que frenan la compra, justo antes de decidir.
 *
 * 🔴 Por qué existe (7 oct 2026)
 *
 * `/preguntas-frecuentes` responde dieciséis preguntas muy bien —precios
 * desglosados, cómo llegar desde tres ciudades, seguridad, qué llevar, niños—,
 * y el inicio no tenía ni una. Quien dudaba a la altura del botón de reservar
 * tenía que salirse de la página a buscar la respuesta.
 *
 * ⚠️ **Esto NO da resultados enriquecidos en Google.** La auditoría externa
 * decía que con marcado `FAQPage` saldrían los desplegables en el buscador: eso
 * dejó de ser cierto. Google los restringió a sitios de gobierno y salud en
 * agosto de 2023 y los **retiró del todo el 7 de mayo de 2026**, para todos. El
 * marcado se pone igual porque sigue siendo Schema.org válido y porque ChatGPT
 * y Perplexity sí leen esto —el `robots.txt` ya los deja pasar—, pero el motivo
 * de fondo es de conversión: que la objeción se responda aquí.
 *
 * ⚠️ `<details>`/`<summary>` nativo y no `FAQAccordion.tsx`, que ya existe: ese
 * componente pide JavaScript para abrirse y recorta a `max-h-96`, y la respuesta
 * más larga de estas ocho pasa de 700 caracteres. El nativo abre sin hidratar y
 * no recorta nada.
 */

/**
 * Cuáles de las preguntas de `/preguntas-frecuentes` salen aquí, por posición.
 *
 * 🔴 Los índices NO coinciden entre idiomas: el inglés tiene una pregunta extra
 * («How do I get to the Huasteca Potosina from the United States?») metida en la
 * posición 2, así que de ahí en adelante todo corre un lugar. Por eso hay dos
 * listas y no un `slice`. El orden es el de la compra: cuánto cuesta → qué
 * incluye → cómo llego → cuándo vengo → ¿es seguro? → ¿con niños? → cómo
 * reservo → qué pasa si cancelo.
 */
const ELEGIDAS: Record<Locale, number[]> = {
  es: [0, 1, 2, 3, 4, 6, 10, 12],
  en: [0, 1, 3, 4, 5, 7, 11, 13],
};

/** Cuántas preguntas tiene cada idioma hoy. Si cambia, los índices mienten. */
const TOTAL_ESPERADO: Record<Locale, number> = { es: 16, en: 17 };

export function FaqInicio({ locale }: { locale: Locale }) {
  const en = locale === "en";
  const lp = (p: string) => localePath(p, locale);
  const t = (es: string, ingles: string) => (en ? ingles : es);
  const faq = getFaq(locale);

  // Si alguien añade o quita una pregunta en faq.en.ts, los índices de arriba
  // dejan de apuntar a lo que dicen y aquí saldría otra cosa en silencio.
  if (process.env.NODE_ENV !== "production" && faq.faqs.length !== TOTAL_ESPERADO[locale]) {
    console.warn(
      `[FaqInicio] ${locale} tiene ${faq.faqs.length} preguntas y se esperaban ${TOTAL_ESPERADO[locale]}: revisa ELEGIDAS en FaqInicio.tsx`,
    );
  }

  const elegidas = ELEGIDAS[locale].flatMap((i) => (faq.faqs[i] ? [faq.faqs[i]] : []));
  if (!elegidas.length) return null;

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: faq.inLanguage,
    mainEntity: elegidas.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <section
      aria-label={t("Preguntas frecuentes", "Frequently asked questions")}
      className="border-b border-negro/10 bg-crema px-6 py-24"
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <div className="mx-auto max-w-3xl">
        <div className="mb-10 text-center">
          <p className="reveal-fade mb-4 font-dm text-[10px] uppercase tracking-[4px] text-verde-selva">
            {t("Antes de decidir", "Before you decide")}
          </p>
          <h2
            className="reveal-up font-cormorant font-light text-verde-profundo"
            style={{ fontSize: "clamp(32px,4.5vw,48px)" }}
          >
            {en ? <>The usual <em className="shimmer-gold">questions</em></> : <>Las dudas <em className="shimmer-gold">de siempre</em></>}
          </h2>
          <div className="heading-underline" aria-hidden="true" />
        </div>

        <div className="divide-y divide-negro/10 border-y border-negro/10">
          {elegidas.map((f) => (
            /* `group` + `group-open:` hace girar la flecha sin una línea de JS. */
            <details key={f.q} className="group">
              <summary className="flex cursor-pointer list-none items-start gap-4 py-5 transition-colors hover:text-verde-selva [&::-webkit-details-marker]:hidden">
                <h3 className="flex-1 font-dm text-[15px] font-medium leading-snug text-verde-profundo">
                  {f.q}
                </h3>
                <ChevronDown
                  className="mt-0.5 h-5 w-5 shrink-0 text-verde-selva transition-transform duration-200 group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <p className="pb-6 pr-9 font-dm text-sm leading-relaxed text-negro/60">{f.a}</p>
            </details>
          ))}
        </div>

        <p className="mt-8 text-center font-dm text-sm text-negro/50">
          {t("¿Te queda otra duda? ", "Still something else? ")}
          <Link
            href={lp("/preguntas-frecuentes")}
            prefetch={false}
            className="text-verde-selva underline underline-offset-4 transition-colors hover:text-terracota"
          >
            {t(
              `Las ${faq.faqs.length} preguntas frecuentes →`,
              `All ${faq.faqs.length} frequently asked questions →`,
            )}
          </Link>
        </p>
      </div>
    </section>
  );
}
