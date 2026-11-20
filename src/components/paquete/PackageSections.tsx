/**
 * Los módulos de presentación de la ficha de paquete (20 nov 2026). Todos son
 * de servidor: reciben la `FichaPaquete` ya armada y solo pintan. Lo interactivo
 * (galería, mapa, itinerario, cotizador, habitaciones) vive en su propio
 * componente cliente.
 */
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight, BedDouble, CalendarDays, Car, Check, Compass, Gauge, MapPin, Moon, Route, Star, X, Plane, Bus, Sparkles, ShieldAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { FichaPaquete } from "@/lib/fichaPaquete";
import type { TextosFicha } from "@/lib/i18n/fichaPaqueteTextos";
import type { Locale } from "@/lib/i18n/config";
import { formatoMXN } from "@/lib/i18n/paquetes.en";
import { AvatarResena } from "@/components/AvatarResena";
import { ResenaOriginal } from "@/components/ResenaOriginal";
import { TrackedLink } from "@/components/TrackedLink";
import { GOOGLE_PERFIL_URL, GOOGLE_RATING, GOOGLE_RESENAS } from "@/lib/resenas";
import { BotonCotizarFila } from "./BookingWidget";

export const H2 = "font-cormorant font-light leading-[1.05] text-crema";
export const TAM_H2 = { fontSize: "clamp(30px,4vw,48px)" };
export const EYEBROW = "font-dm text-[12px] uppercase tracking-[3px] text-agua";

export function Encabezado({ eyebrow, titulo, em, id }: { eyebrow: string; titulo: string; em: string; id: string }) {
  return (
    <>
      <p className={EYEBROW}>{eyebrow}</p>
      <h2 id={id} className={`${H2} mt-3`} style={TAM_H2}>
        {titulo} <em className="text-dorado">{em}</em>
      </h2>
    </>
  );
}

// ── 2 · Resumen ejecutivo ────────────────────────────────────────────────
export function PackageSummary({ f, resumen, t }: { f: FichaPaquete; resumen: string | null; t: TextosFicha }) {
  const atributos: { Icono: LucideIcon; k: string; v: string }[] = [
    { Icono: CalendarDays, k: t.dias, v: t.diasValor(f.dias) },
    { Icono: Moon, k: t.noches, v: t.nochesValor(f.noches) },
    ...(f.destinos ? [{ Icono: MapPin, k: t.destinos, v: t.destinosValor(f.destinos) }] : []),
    { Icono: Route, k: t.modalidad, v: t.modalidadValor },
    { Icono: BedDouble, k: t.hospedaje, v: f.hotel },
    ...(f.transporte ? [{ Icono: Car, k: t.transporte, v: f.transporte }] : []),
    { Icono: Compass, k: t.actividades, v: f.tiposActividad.map((x) => t.categoriasTour[x] ?? x).join(" · ") },
    { Icono: Gauge, k: t.nivel, v: t.nivelValor[f.dificultad] },
  ];
  return (
    <section aria-labelledby="h-resumen">
      <h2 id="h-resumen" className="sr-only">{t.resumenTitulo}</h2>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-y border-white/10 py-6 sm:grid-cols-4">
        {atributos.map(({ Icono, k, v }) => (
          <div key={k}>
            <dt className="flex items-center gap-1.5 font-dm text-[11px] uppercase tracking-[1.5px] text-crema/45">
              <Icono className="h-3.5 w-3.5 text-agua" aria-hidden="true" />{k}
            </dt>
            <dd className="mt-1 font-dm text-[14px] leading-snug text-crema/90">{v}</dd>
          </div>
        ))}
      </dl>
      {resumen && <p className="mt-6 font-cormorant text-[19px] font-light leading-relaxed text-crema/90 sm:text-[24px]">{resumen}</p>}
    </section>
  );
}

// ── 3 · Lo mejor ─────────────────────────────────────────────────────────
export function PackageHighlights({ f, t }: { f: FichaPaquete; t: TextosFicha }) {
  if (!f.destacados.length) return null;
  return (
    <section aria-labelledby="h-mejor">
      <Encabezado eyebrow={t.mejorEyebrow} titulo={t.mejorTitulo} em={t.mejorTituloEm} id="h-mejor" />
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {f.destacados.map((d, k) => (
          <li key={d.slug} className={k === 0 ? "sm:col-span-2" : ""}>
            <Link href={d.href} className="group relative block overflow-hidden rounded-2xl">
              <div className={`relative ${k === 0 ? "aspect-[16/8]" : "aspect-[4/3]"}`}>
                <Image src={d.foto} alt={d.nombre} fill sizes={k === 0 ? "(max-width: 1024px) 100vw, 760px" : "(max-width: 640px) 100vw, 380px"} className="zoom-foto object-cover" />
                <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-negro/90 via-negro/25 to-transparent" />
              </div>
              <div className="texto-sobre-foto absolute inset-x-0 bottom-0 p-4 sm:p-5">
                <p className="font-dm text-[11px] uppercase tracking-[2px] text-agua">{t.diaN(d.dia)} · {d.zona}</p>
                <h3 className="mt-1 font-cormorant text-[26px] leading-tight text-crema">{d.nombre}</h3>
                <p className="mt-1 line-clamp-2 font-dm text-[13px] text-crema/80">{d.descripcion}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ── 7 · Incluye / no incluye ─────────────────────────────────────────────
export function InclusionsExclusions({ f, t }: { f: FichaPaquete; t: TextosFicha }) {
  return (
    <section aria-labelledby="h-incluye">
      <Encabezado eyebrow={t.incEyebrow} titulo={t.incTitulo} em={t.incTituloEm} id="h-incluye" />
      <div className="mt-8 grid gap-8 md:grid-cols-[1.4fr_1fr]">
        <div>
          <h3 className="flex items-center gap-2 font-dm text-[13px] uppercase tracking-[2px] text-crema/60"><Check className="h-4 w-4 text-lima" aria-hidden="true" />{t.incluye}</h3>
          <dl className="mt-4 space-y-4">
            {f.incluye.map((g) => (
              <div key={g.id} className="grid gap-1 sm:grid-cols-[140px_1fr]">
                <dt className="font-dm text-[12px] uppercase tracking-[1.5px] text-agua">{t.grupos[g.id] ?? g.id}</dt>
                <dd>
                  <ul className="space-y-1">
                    {g.items.map((x) => (
                      <li key={x} className="flex items-start gap-2 font-dm text-[14px] leading-snug text-crema/85">
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-lima" aria-hidden="true" />{x}
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <div>
          <h3 className="flex items-center gap-2 font-dm text-[13px] uppercase tracking-[2px] text-crema/60"><X className="h-4 w-4 text-terracota" aria-hidden="true" />{t.noIncluye}</h3>
          <ul className="mt-4 space-y-2">
            {f.noIncluye.map((x) => (
              <li key={x} className="flex items-start gap-2 font-dm text-[14px] leading-snug text-crema/65">
                <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-terracota/80" aria-hidden="true" />{x}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

// ── 8 · Precio por número de viajeros ───────────────────────────────────
export function PricingSection({ f, t, locale }: { f: FichaPaquete; t: TextosFicha; locale: Locale }) {
  const m = (n: number) => formatoMXN(n, locale);
  const primeras = f.precios.filter((r) => r.adultos <= 6);
  const resto = f.precios.filter((r) => r.adultos > 6);
  const Fila = ({ r }: { r: FichaPaquete["precios"][number] }) => (
    <tr className="border-t border-white/10">
      <th scope="row" className="py-3 pr-2 text-left font-dm text-[14px] font-normal text-crema">
        {t.filaAdultos(r.adultos)}
        <span className="block text-[11px] text-crema/45">{t.filaHab(r.habitaciones)}</span>
      </th>
      <td className="whitespace-nowrap py-3 pr-2 text-right font-cormorant text-[22px] text-dorado">{m(r.porPersona)}</td>
      <td className="hidden whitespace-nowrap py-3 pr-2 text-right font-dm text-[14px] text-crema/75 sm:table-cell">{m(r.total)}</td>
      <td className="py-3 text-right"><BotonCotizarFila adultos={r.adultos} etiqueta={t.usarFila} slug={f.slug} /></td>
    </tr>
  );
  return (
    <section aria-labelledby="h-precio">
      <Encabezado eyebrow={t.precioEyebrow} titulo={t.precioTitulo} em={t.precioTituloEm} id="h-precio" />
      <p className="mt-4 max-w-2xl font-dm text-[15px] leading-relaxed text-crema/70">{t.precioIntro(f.precioLabel)}</p>
      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-negro/40 px-4 sm:px-5">
        <table className="w-full">
          <thead>
            <tr className="font-dm text-[11px] uppercase tracking-[1.5px] text-crema/45">
              <th scope="col" className="py-3 text-left font-normal">{t.colViajeros}</th>
              <th scope="col" className="py-3 text-right font-normal">{t.colPorPersona}</th>
              <th scope="col" className="hidden py-3 text-right font-normal sm:table-cell">{t.colTotal}</th>
              <th scope="col" className="py-3"><span className="sr-only">{t.usarFila}</span></th>
            </tr>
          </thead>
          <tbody>{primeras.map((r) => <Fila key={r.adultos} r={r} />)}</tbody>
        </table>
        {resto.length > 0 && (
          <details className="group border-t border-white/10">
            <summary className="flex min-h-[48px] cursor-pointer list-none items-center font-dm text-[13px] text-agua [&::-webkit-details-marker]:hidden">{t.verMasFilas}</summary>
            <table className="w-full"><tbody>{resto.map((r) => <Fila key={r.adultos} r={r} />)}</tbody></table>
          </details>
        )}
      </div>
      <ul className="mt-4 space-y-1.5">
        {t.precioCondiciones.map((c) => (
          <li key={c} className="flex items-start gap-2 font-dm text-[13px] text-crema/60"><span className="text-agua">·</span>{c}</li>
        ))}
      </ul>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {[{ k: t.modCompartido, v: t.modCompartidoTxt }, { k: t.modPersonalizado, v: t.modPersonalizadoTxt }].map((x) => (
          <div key={x.k} className="rounded-2xl border border-white/10 p-4">
            <p className="font-cormorant text-[20px] text-crema">{x.k}</p>
            <p className="mt-1 font-dm text-[13px] leading-relaxed text-crema/65">{x.v}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── 10 · Información importante ─────────────────────────────────────────
const ICONOS_LOG: Record<string, LucideIcon> = { Car, Plane, Bus, Sparkles };

export function ImportantInformation({ f, t }: { f: FichaPaquete; t: TextosFicha }) {
  const bloques: { k: string; contenido: React.ReactNode }[] = [
    { k: t.infoNivel, contenido: <p>{t.nivelValor[f.dificultad]}. {t.infoNivelTxt[f.dificultad]}</p> },
    ...(f.edadMinima ? [{ k: t.infoEdad, contenido: <p>{t.infoEdadTxt(f.edadMinima)}</p> }] : []),
    { k: t.infoClima, contenido: <p>{t.infoClimaTxt}</p> },
    { k: t.infoCancelacion, contenido: <p>{t.infoCancelacionTxt}</p> },
    ...(f.requisitos.length ? [{ k: t.infoRequisitos, contenido: (
      <div className="space-y-2">
        {f.requisitos.map((g) => (
          <details key={g.tour} className="group rounded-xl border border-white/10 bg-negro/30">
            <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-crema/90 [&::-webkit-details-marker]:hidden">
              {g.tour}<span aria-hidden="true" className="text-agua transition-transform group-open:rotate-45">+</span>
            </summary>
            <ul className="space-y-1 border-t border-white/10 px-3 py-3">
              {g.items.map((x) => <li key={x} className="flex gap-2"><ShieldAlert className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-dorado" aria-hidden="true" />{x}</li>)}
            </ul>
          </details>
        ))}
      </div>
    ) }] : []),
    ...(f.queLlevar.general.length || f.queLlevar.porTour.length ? [{ k: t.infoLlevar, contenido: (
      <div className="space-y-2">
        {f.queLlevar.general.length > 0 && (
          <ul className="space-y-1">{f.queLlevar.general.map((x) => <li key={x} className="flex gap-2"><span className="text-agua">·</span>{x}</li>)}</ul>
        )}
        {f.queLlevar.porTour.map((g) => (
          <details key={g.tour} className="group rounded-xl border border-white/10 bg-negro/30">
            <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-crema/90 [&::-webkit-details-marker]:hidden">
              {g.tour}<span aria-hidden="true" className="text-agua transition-transform group-open:rotate-45">+</span>
            </summary>
            <ul className="space-y-1 border-t border-white/10 px-3 py-3">{g.items.map((x) => <li key={x} className="flex gap-2"><span className="text-agua">·</span>{x}</li>)}</ul>
          </details>
        ))}
      </div>
    ) }] : []),
  ];
  return (
    <section aria-labelledby="h-info">
      <Encabezado eyebrow={t.infoEyebrow} titulo={t.infoTitulo} em={t.infoTituloEm} id="h-info" />
      <div className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2">
        {bloques.map((b) => (
          <div key={b.k} className="border-t border-white/15 pt-4 font-dm text-[14px] leading-relaxed text-crema/70">
            <h3 className="mb-2 font-cormorant text-[22px] text-crema">{b.k}</h3>
            {b.contenido}
          </div>
        ))}
      </div>
      <div id="como-llegar" className="mt-8 scroll-mt-28 rounded-2xl border border-white/10 bg-negro/40 p-5">
        <h3 className="font-cormorant text-[24px] text-crema">{t.infoLlegar}</h3>
        <div className="mt-4 grid gap-5 md:grid-cols-3">
          {f.logistica.modos.map((mo) => {
            const Icono = ICONOS_LOG[mo.icon] ?? Car;
            return (
              <div key={mo.id}>
                <p className="flex items-center gap-2 font-dm text-sm text-crema"><Icono className="h-4 w-4 text-agua" aria-hidden="true" />{mo.titulo}</p>
                <ul className="mt-2 space-y-1.5">
                  {mo.puntos.map((pt) => <li key={pt} className="font-dm text-[13px] leading-relaxed text-crema/60">{pt}</li>)}
                </ul>
              </div>
            );
          })}
        </div>
        <p className="mt-4 font-dm text-[12px] text-crema/45">{f.logistica.nota}</p>
      </div>
    </section>
  );
}

// ── 11 · Opiniones ───────────────────────────────────────────────────────
export function ReviewsSection({ f, t, en }: { f: FichaPaquete; t: TextosFicha; en: boolean }) {
  if (!f.resenas.length) return null;
  return (
    <section aria-labelledby="h-resenas">
      <Encabezado eyebrow={t.resEyebrow} titulo={t.resTitulo} em={t.resTituloEm} id="h-resenas" />
      <p className="mt-4 flex items-center gap-2 font-dm text-sm text-crema/70">
        <Star className="h-4 w-4 fill-dorado text-dorado" aria-hidden="true" />{t.resFuente(String(GOOGLE_RATING), GOOGLE_RESENAS)}
      </p>
      <ul className="mt-6 grid gap-4 md:grid-cols-3">
        {f.resenas.map((r) => (
          <li key={r.autor}>
            <figure className="flex h-full flex-col rounded-2xl border border-white/10 bg-negro/40 p-5">
              <div className="flex gap-0.5" role="img" aria-label={en ? `${r.estrellas} out of 5 stars` : `${r.estrellas} de 5 estrellas`}>
                {Array.from({ length: r.estrellas }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-dorado text-dorado" aria-hidden="true" />)}
              </div>
              <blockquote className="mt-3 line-clamp-6 font-cormorant text-[19px] font-light italic leading-snug text-crema/90">&ldquo;{r.texto}&rdquo;</blockquote>
              <ResenaOriginal r={r} className="mt-2" />
              <figcaption className="mt-auto flex items-center gap-3 pt-5">
                <AvatarResena autor={r.autor} foto={r.foto} className="h-9 w-9 border border-white/15" />
                <span>
                  <span className="block font-dm text-sm text-crema">{r.autor}</span>
                  <span className="block font-dm text-[11px] text-crema/45">Google · {r.fecha}</span>
                </span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
      <p className="mt-4 font-dm text-[12px] text-crema/45">{t.resNota}</p>
      <a href={GOOGLE_PERFIL_URL} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-[44px] items-center gap-1.5 font-dm text-[13px] text-agua hover:text-crema">
        {t.resVerMas} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </a>
    </section>
  );
}

// ── 12 · Preguntas ───────────────────────────────────────────────────────
export function FAQSection({ faqs, t }: { faqs: { q: string; a: string }[]; t: TextosFicha }) {
  return (
    <section aria-labelledby="h-faq">
      <Encabezado eyebrow={t.faqEyebrow} titulo={t.faqTitulo} em={t.faqTituloEm} id="h-faq" />
      <div className="mt-8 space-y-3">
        {faqs.map((x) => (
          <details key={x.q} className="group rounded-xl border border-white/10 bg-negro/30 open:border-white/20">
            <summary className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-dm text-[15px] text-crema/90 hover:text-crema [&::-webkit-details-marker]:hidden">
              {x.q}
              <span aria-hidden="true" className="flex-shrink-0 text-xl leading-none text-agua transition-transform duration-200 group-open:rotate-45">+</span>
            </summary>
            <p className="border-t border-white/10 px-5 pb-5 pt-4 font-dm text-[14px] leading-relaxed text-crema/65">{x.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

// ── 13 · Relacionados ────────────────────────────────────────────────────
export function RelatedPackages({ f, t, locale }: { f: FichaPaquete; t: TextosFicha; locale: Locale }) {
  if (!f.relacionados.length) return null;
  return (
    <section aria-labelledby="h-rel" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
      <Encabezado eyebrow={t.relEyebrow} titulo={t.relTitulo} em={t.relTituloEm} id="h-rel" />
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {f.relacionados.map((r) => (
          <li key={r.id}>
            <TrackedLink href={r.href} event="RELATED_PACKAGE_CLICK" data={{ desde: f.slug, hacia: r.slug }} className="group block h-full overflow-hidden rounded-2xl border border-white/10 bg-verde-profundo/25 hover:border-white/25">
              <span className="relative block aspect-[4/3]">
                <Image src={r.foto} alt={r.fotoAlt} fill sizes="(max-width: 640px) 100vw, 280px" className="zoom-foto object-cover" />
              </span>
              <span className="block p-4">
                <span className="block font-dm text-[11px] uppercase tracking-[1.5px] text-agua">{r.duracion}</span>
                <span className="mt-1 block font-cormorant text-[24px] leading-tight text-crema">{r.nombre}</span>
                <span className="mt-1 block line-clamp-2 font-dm text-[13px] text-crema/60">{r.resumen}</span>
                {r.precio !== null && (
                  <span className="mt-3 block font-dm text-[12px] text-crema/55">
                    {t.desde} <span className="font-cormorant text-[22px] text-dorado">{formatoMXN(r.precio, locale)}</span> MXN {r.unidad}
                  </span>
                )}
              </span>
            </TrackedLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
