/**
 * Los bloques de la ficha de destino que piden la auditoría de Destinos
 * (20 nov 2026): respuesta rápida, costos desglosados, por tu cuenta vs con
 * tour, cómo llegar, qué esperar, nivel físico, seguridad, temporadas,
 * servicios, turismo responsable, cerca de aquí y fuentes.
 *
 * Todos son de servidor. Lo escrito a mano vive en `destinosGuia.ts` (solo los
 * destinos más buscados, solo español); lo demás sale de los datos que ya
 * tiene cada ficha (`destinos.ts`, `destinosAtributos.ts`, el catálogo de
 * tours), así que también se pinta en los 40 destinos restantes y en inglés.
 */
import Link from "next/link";
import Image from "next/image";
import {
  Ticket, Clock, Car, BarChart2, Waves, Baby, MapPin, ExternalLink, ShieldAlert,
  Footprints, CalendarRange, Store, Leaf, BookOpen, MessageCircle, Check, Navigation,
} from "lucide-react";
import type { Destino } from "@/lib/destinos";
import { DESTINOS_DB } from "@/lib/destinos";
import type { GuiaDestino } from "@/lib/destinosGuia";
import { fechaLarga } from "@/lib/destinosGuia";
import {
  atributosDe, kmEnLineaRecta, minutosValles, nadoTexto, ninosTexto, nivelTexto, NIVELES,
  type AtributosDestino,
} from "@/lib/destinosAtributos";
import { duracionTexto } from "@/lib/tiemposADestinos";
import type { Tour } from "@/lib/tours";
import { localePath, type Locale } from "@/lib/i18n/config";
import { localizeDestino } from "@/lib/i18n/localize";
import { waLink } from "@/lib/whatsapp";
import { TrackedLink } from "@/components/TrackedLink";

const H2 = "font-cormorant text-crema text-2xl md:text-3xl mb-5";
const ROTULO = "text-[10px] tracking-[2px] uppercase font-dm text-crema/45";

function Seccion({ id, children, className = "" }: { id?: string; children: React.ReactNode; className?: string }) {
  return (
    <section id={id} className={`max-w-4xl mx-auto px-6 pb-14 scroll-mt-24 ${className}`}>
      {children}
    </section>
  );
}

/* ── Migas de pan visibles ──────────────────────────────────────────────── */

export function MigasDestino({ destino, locale }: { destino: Destino; locale: Locale }) {
  const en = locale === "en";
  const zonaHref = `${localePath("/destinos", locale)}?municipio=${encodeURIComponent(destino.zona)}#lista`;
  return (
    <nav aria-label={en ? "Breadcrumb" : "Migas de pan"} className="texto-sobre-foto mb-5">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[10px] tracking-[2px] uppercase font-dm text-crema/70">
        <li><Link href={localePath("/", locale)} className="inline-flex min-h-[44px] items-center hover:text-lima transition-colors">{en ? "Home" : "Inicio"}</Link></li>
        <li aria-hidden="true" className="text-crema/40">›</li>
        <li><Link href={localePath("/destinos", locale)} className="inline-flex min-h-[44px] items-center text-verde-vivo hover:text-lima transition-colors">{en ? "Destinations" : "Destinos"}</Link></li>
        <li aria-hidden="true" className="text-crema/40">›</li>
        <li><Link href={zonaHref} className="inline-flex min-h-[44px] items-center hover:text-lima transition-colors">{destino.zona}</Link></li>
        <li aria-hidden="true" className="text-crema/40">›</li>
        <li aria-current="page" className="text-crema/90 normal-case tracking-normal text-xs">{destino.nombre}</li>
      </ol>
    </nav>
  );
}

/* ── Respuesta rápida + datos clave ─────────────────────────────────────── */

function costoCorto(destino: Destino, guia: GuiaDestino | undefined): string {
  return guia?.porTuCuenta.costo ?? destino.precio_entrada;
}

export function RespuestaRapida({
  destino, guia, locale, waMensaje,
}: { destino: Destino; guia?: GuiaDestino; locale: Locale; waMensaje: string }) {
  const en = locale === "en";
  const atr = atributosDe(destino.slug);
  const min = minutosValles(destino);
  const usaGuia = !!guia && !en;
  const datos: { Icon: typeof Ticket; rotulo: string; valor: string }[] = [
    { Icon: Ticket, rotulo: en ? "On your own" : "Por tu cuenta", valor: usaGuia ? costoCorto(destino, guia) : destino.precio_entrada },
    ...(min != null ? [{ Icon: Car, rotulo: en ? "From Ciudad Valles" : "Desde Ciudad Valles", valor: `~${duracionTexto(min)}` }] : []),
    { Icon: Clock, rotulo: en ? "Time on site" : "Tiempo en el lugar", valor: en ? `About ${destino.duracion_hrs} h` : `Unas ${destino.duracion_hrs} h` },
    { Icon: BarChart2, rotulo: en ? "Effort level" : "Nivel físico", valor: nivelTexto(atr.nivel, en) },
    { Icon: Waves, rotulo: en ? "Swimming" : "Nado", valor: nadoTexto(atr.nado, en) },
    { Icon: Baby, rotulo: en ? "With kids" : "Con niños", valor: ninosTexto(atr.ninos, en) },
  ];
  return (
    <section aria-labelledby="respuesta-rapida" className="max-w-4xl mx-auto px-6 pt-10 pb-10">
      <h2 id="respuesta-rapida" className="sr-only">{en ? "Quick answer" : "Respuesta rápida"}</h2>
      {usaGuia && <p className="font-dm text-crema/85 text-base md:text-lg leading-relaxed mb-6">{guia!.respuestaRapida}</p>}
      <dl className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {datos.map(({ Icon, rotulo, valor }) => (
          <div key={rotulo} className="rounded-xl border border-white/10 bg-negro/40 p-3.5">
            <dt className={`${ROTULO} flex items-center gap-1.5 mb-1`}><Icon className="w-3 h-3 text-verde-vivo" aria-hidden="true" />{rotulo}</dt>
            <dd className="font-dm text-sm text-crema leading-snug">{valor}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <p className="font-dm text-[11px] text-crema/45">
          {usaGuia
            ? guia!.enCampo
              ? `Verificado en campo el ${fechaLarga(guia!.enCampo.fecha)} por ${guia!.enCampo.por}.`
              : <>Información revisada el {fechaLarga(guia!.revisado)} con fuentes públicas. <a href="#fuentes" className="underline underline-offset-2 hover:text-crema">Ver fuentes</a></>
            : null}
        </p>
        <a
          href={waLink(waMensaje)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[44px] items-center gap-1.5 font-dm text-[11px] text-crema/55 hover:text-lima transition-colors"
        >
          <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
          {en ? "Did something change? Tell us" : "¿Este dato cambió? Avísanos"}
        </a>
      </div>
    </section>
  );
}

/* ── Costos + por tu cuenta vs con tour ─────────────────────────────────── */

export interface TourComparable {
  tour: Tour;
  precioTexto: string;
  recogida?: string;
}

export function CostosYTour({
  destino, guia, locale, comparable, cercano,
}: {
  destino: Destino;
  guia?: GuiaDestino;
  locale: Locale;
  /** El tour que SÍ visita el destino. */
  comparable?: TourComparable;
  /** Si ninguno lo visita: el de la zona. */
  cercano?: TourComparable;
}) {
  const en = locale === "en";
  const usaGuia = !!guia && !en;
  const atr = atributosDe(destino.slug);
  const min = minutosValles(destino);
  const lineas = usaGuia
    ? guia!.costos
    : [{ concepto: en ? "Admission" : "Entrada", monto: destino.precio_entrada }];
  const porTuCuenta = usaGuia
    ? guia!.porTuCuenta
    : {
        costo: destino.precio_entrada,
        tiempo: min != null ? (en ? `~${duracionTexto(min)} each way from Ciudad Valles` : `~${duracionTexto(min)} de ida desde Ciudad Valles`) : (en ? "Depends on where you stay" : "Depende de dónde te hospedes"),
        logistica: en ? "You drive, park and pay each fee on site." : "Manejas tú, estacionas y pagas cada cuota en el lugar.",
      };
  const t = comparable?.tour;
  return (
    <Seccion id="costos" className="pt-2">
      <h2 className={H2}>{en ? `${destino.nombre}: what it costs on your own` : `${destino.nombre}: cuánto cuesta ir por tu cuenta`}</h2>
      <div className="rounded-2xl border border-white/10 overflow-hidden">
        <table className="w-full text-left font-dm text-sm">
          <caption className="sr-only">{en ? "Costs if you go on your own" : "Costos si vas por tu cuenta"}</caption>
          <thead className="bg-white/5">
            <tr>
              <th scope="col" className={`${ROTULO} px-4 py-3`}>{en ? "Item" : "Concepto"}</th>
              <th scope="col" className={`${ROTULO} px-4 py-3`}>{en ? "Cost" : "Costo"}</th>
            </tr>
          </thead>
          <tbody>
            {lineas.map((l) => (
              <tr key={l.concepto} className="border-t border-white/5 align-top">
                <th scope="row" className="px-4 py-3 font-normal text-crema/80">{l.concepto}</th>
                <td className="px-4 py-3 text-crema">
                  {l.monto}
                  {"nota" in l && l.nota ? <span className="block text-[11px] text-crema/45 mt-0.5">{l.nota}</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {usaGuia && guia!.pago && <p className="mt-3 font-dm text-xs text-dorado/90">{guia!.pago}</p>}
      {usaGuia && <p className="mt-2 font-dm text-[11px] text-crema/40">Precios por persona salvo que se indique. Revisados el {fechaLarga(guia!.revisado)}; las cooperativas los cambian sin aviso. <a href="#fuentes" className="underline underline-offset-2">Fuentes</a></p>}

      {(t || cercano) && (
        <div className="mt-10">
          <h3 className="font-cormorant text-crema text-2xl mb-4">{en ? "On your own or with a tour?" : "¿Por tu cuenta o con tour?"}</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-negro/40 p-5">
              <p className={`${ROTULO} mb-3`}>{en ? "On your own" : "Por tu cuenta"}</p>
              <ul className="space-y-2.5 font-dm text-sm text-crema/80">
                <li><span className="text-crema/45">{en ? "Cost: " : "Costo: "}</span>{porTuCuenta.costo}</li>
                <li><span className="text-crema/45">{en ? "Time: " : "Tiempo: "}</span>{porTuCuenta.tiempo}</li>
                <li><span className="text-crema/45">{en ? "Logistics: " : "Logística: "}</span>{porTuCuenta.logistica}</li>
              </ul>
              <p className="mt-4 font-dm text-[11px] text-crema/45">
                {en ? "Going on your own is perfectly doable: this page has everything you need." : "Ir por tu cuenta se puede: en esta página está todo lo que necesitas."}
              </p>
            </div>
            {t ? (
              <div className="rounded-2xl border border-verde-vivo/30 bg-verde-profundo/60 p-5 flex flex-col">
                <p className={`${ROTULO} mb-3 text-verde-vivo`}>{en ? `With ${t.nombreCorto || t.nombre}` : `Con ${t.nombreCorto || t.nombre}`}</p>
                <ul className="space-y-2.5 font-dm text-sm text-crema/85">
                  <li><span className="text-crema/45">{en ? "Price: " : "Precio: "}</span><span className="text-dorado">{comparable!.precioTexto}</span></li>
                  <li><span className="text-crema/45">{en ? "Duration: " : "Duración: "}</span>{en ? `${t.duracion_hrs} h, door to door` : `${t.duracion_hrs} h, de puerta a puerta`}</li>
                  {comparable!.recogida && <li><span className="text-crema/45">{en ? "Pickup: " : "Recogida: "}</span>{comparable!.recogida}</li>}
                </ul>
                <ul className="mt-3 space-y-1.5">
                  {t.incluye.slice(0, 5).map((i) => (
                    <li key={i} className="flex gap-2 font-dm text-xs text-crema/70"><Check className="w-3.5 h-3.5 text-verde-vivo flex-shrink-0 mt-px" aria-hidden="true" />{i}</li>
                  ))}
                </ul>
                <TrackedLink
                  href={localePath(`/tours/${t.slug}`, locale)}
                  event="DESTINO_TOUR_CLICK"
                  data={{ destino: destino.slug, tourSlug: t.slug, tour_name: t.nombre, amount: t.precio, source: "comparacion_destino" }}
                  className="rounded-xl mt-5 inline-flex w-full items-center justify-center gap-2 bg-lima text-negro px-5 py-3.5 text-[11px] tracking-[2px] uppercase font-dm hover:bg-verde-vivo hover:text-crema transition-colors"
                >
                  {en ? "See dates and book" : "Ver fechas y reservar"} →
                </TrackedLink>
              </div>
            ) : cercano ? (
              <div className="rounded-2xl border border-white/10 bg-negro/40 p-5 flex flex-col">
                <p className={`${ROTULO} mb-3`}>{en ? "Our tours" : "Nuestros tours"}</p>
                <p className="font-dm text-sm text-crema/80 leading-relaxed">
                  {en
                    ? `We don't run a tour to ${destino.nombre}. In the same area we run ${cercano.tour.nombre} (${cercano.precioTexto}), which you can combine on the same trip.`
                    : `No tenemos un tour que visite ${destino.nombre}. En la misma zona operamos ${cercano.tour.nombre} (${cercano.precioTexto}), que se combina en el mismo viaje.`}
                </p>
                <TrackedLink
                  href={localePath(`/tours/${cercano.tour.slug}`, locale)}
                  event="DESTINO_TOUR_CLICK"
                  data={{ destino: destino.slug, tourSlug: cercano.tour.slug, tour_name: cercano.tour.nombre, amount: cercano.tour.precio, source: "comparacion_destino_cerca" }}
                  className="rounded-xl mt-5 inline-flex w-full items-center justify-center gap-2 border border-verde-vivo/50 text-verde-vivo px-5 py-3 text-[11px] tracking-[2px] uppercase font-dm hover:bg-verde-vivo/10 transition-colors"
                >
                  {en ? "See that tour" : "Ver ese tour"} →
                </TrackedLink>
              </div>
            ) : null}
          </div>
          {atr.nivel >= 3 && t && (
            <p className="mt-3 font-dm text-[11px] text-crema/45">
              {en
                ? `Level ${nivelTexto(atr.nivel, true).toLowerCase()}: on the tour a certified guide sets the pace and handles safety gear.`
                : `Nivel ${nivelTexto(atr.nivel).toLowerCase()}: en el tour un guía certificado marca el ritmo y lleva el equipo de seguridad.`}
            </p>
          )}
        </div>
      )}
    </Seccion>
  );
}

/* ── Cómo llegar ─────────────────────────────────────────────────────────── */

export function ComoLlegar({
  destino, guia, locale, embedUrl, mapsUrl,
}: { destino: Destino; guia?: GuiaDestino; locale: Locale; embedUrl: string; mapsUrl: string }) {
  const en = locale === "en";
  const usaGuia = !!guia && !en;
  const punto = usaGuia ? guia!.puntoDeLlegada : undefined;
  const gps = punto ? `https://www.google.com/maps/search/?api=1&query=${punto.lat},${punto.lng}` : mapsUrl;
  return (
    <Seccion id="como-llegar">
      <h2 className={H2}>{en ? `How to get to ${destino.nombre}` : `Cómo llegar: ${destino.nombre}`}</h2>
      {usaGuia && guia!.rutas.length > 0 ? (
        <div className="rounded-2xl border border-white/10 overflow-hidden mb-5">
          <table className="w-full text-left font-dm text-sm">
            <caption className="sr-only">Tiempos de manejo</caption>
            <thead className="bg-white/5">
              <tr>
                <th scope="col" className={`${ROTULO} px-4 py-3`}>Desde</th>
                <th scope="col" className={`${ROTULO} px-4 py-3`}>En auto</th>
                <th scope="col" className={`${ROTULO} px-4 py-3 hidden sm:table-cell`}>Ruta</th>
              </tr>
            </thead>
            <tbody>
              {guia!.rutas.map((r) => (
                <tr key={r.desde} className="border-t border-white/5 align-top">
                  <th scope="row" className="px-4 py-3 font-normal text-crema/85">{r.desde}</th>
                  <td className="px-4 py-3 text-crema whitespace-nowrap">{r.tiempo}</td>
                  <td className="px-4 py-3 text-crema/60 text-xs hidden sm:table-cell">{r.detalle}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="font-dm text-sm text-crema/80 leading-relaxed mb-5 flex gap-2"><Car className="w-4 h-4 text-agua flex-shrink-0 mt-0.5" aria-hidden="true" />{destino.como_llegar}</p>
      )}
      {usaGuia && (
        <ul className="space-y-2.5 mb-6 font-dm text-sm text-crema/75">
          {punto && <li className="flex gap-2"><MapPin className="w-4 h-4 text-verde-vivo flex-shrink-0 mt-0.5" aria-hidden="true" /><span><span className="text-crema/45">Pon en el GPS: </span>{punto.nombre} ({punto.lat.toFixed(4)}, {punto.lng.toFixed(4)})</span></li>}
          {guia!.camino && <li className="flex gap-2"><Navigation className="w-4 h-4 text-verde-vivo flex-shrink-0 mt-0.5" aria-hidden="true" /><span><span className="text-crema/45">El camino: </span>{guia!.camino}</span></li>}
          {guia!.transportePublico && <li className="flex gap-2"><Car className="w-4 h-4 text-verde-vivo flex-shrink-0 mt-0.5" aria-hidden="true" /><span><span className="text-crema/45">Sin auto: </span>{guia!.transportePublico}</span></li>}
        </ul>
      )}
      <div className="rounded-2xl relative overflow-hidden border border-white/10" style={{ height: "280px" }}>
        <div className="absolute inset-0 bg-verde-profundo/30" />
        <iframe src={embedUrl} width="100%" height="280" style={{ border: 0, position: "relative", zIndex: 10 }} loading="lazy" title={`${en ? "Map" : "Mapa"}: ${destino.nombre}`} />
      </div>
      <a href={gps} target="_blank" rel="noopener noreferrer"
        className="inline-flex min-h-[44px] items-center gap-1.5 mt-1 text-[10px] tracking-[2px] uppercase font-dm text-verde-vivo hover:text-lima transition-colors">
        <ExternalLink className="w-3 h-3" aria-hidden="true" /> {en ? "Open in Google Maps" : "Abrir en Google Maps"}
      </a>
    </Seccion>
  );
}

/* ── Qué esperar, nivel físico y seguridad ───────────────────────────────── */

export function QueEsperarYSeguridad({ destino, guia, locale }: { destino: Destino; guia?: GuiaDestino; locale: Locale }) {
  const en = locale === "en";
  const usaGuia = !!guia && !en;
  const atr: AtributosDestino = atributosDe(destino.slug);
  const nivel = NIVELES[atr.nivel];
  const seguridad = usaGuia ? guia!.seguridad : destino.advertencias ? [destino.advertencias] : [];
  return (
    <>
      {usaGuia && guia!.pasoAPaso.length > 0 && (
        <Seccion id="que-esperar">
          <h2 className={H2}>Qué esperar, paso a paso</h2>
          <ol className="space-y-4">
            {guia!.pasoAPaso.map((p, i) => (
              <li key={p} className="flex gap-4">
                <span aria-hidden="true" className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-verde-vivo/40 font-dm text-xs text-verde-vivo">{i + 1}</span>
                <p className="font-dm text-sm text-crema/80 leading-relaxed pt-1">{p}</p>
              </li>
            ))}
          </ol>
        </Seccion>
      )}
      <Seccion id="nivel">
        <h2 className={H2}>{en ? "Effort level and safety" : "Nivel físico y seguridad"}</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-negro/40 p-5">
            <p className={`${ROTULO} mb-2 flex items-center gap-1.5`}><Footprints className="w-3 h-3 text-verde-vivo" aria-hidden="true" />{en ? "Level" : "Nivel"}</p>
            <p className="font-cormorant text-crema text-2xl">{en ? nivel.en : nivel.es} <span className="font-dm text-xs text-crema/40">({atr.nivel} {en ? "of" : "de"} 4)</span></p>
            <p className="font-dm text-sm text-crema/70 mt-1 leading-relaxed">{en ? nivel.criterioEn : nivel.criterioEs}</p>
            <ul className="mt-4 space-y-1.5 font-dm text-sm text-crema/75">
              <li>{ninosTexto(atr.ninos, en)}{usaGuia && guia!.edadMinima ? ` · ${guia!.edadMinima}` : ""}</li>
              <li>{nadoTexto(atr.nado, en)}{usaGuia && guia!.saberNadar ? ` · ${guia!.saberNadar}` : ""}</li>
              {usaGuia && guia!.accesibilidad && <li>{guia!.accesibilidad}</li>}
            </ul>
            <Link href={`${localePath("/destinos", locale)}#niveles`} className="inline-flex min-h-[44px] items-center font-dm text-[11px] text-crema/45 underline underline-offset-2 hover:text-crema">
              {en ? "How we rate the levels" : "Cómo medimos los niveles"}
            </Link>
          </div>
          {seguridad.length > 0 && (
            <div className="rounded-2xl border border-terracota/30 bg-terracota/10 p-5">
              <p className={`${ROTULO} mb-3 flex items-center gap-1.5 text-terracota`}><ShieldAlert className="w-3 h-3" aria-hidden="true" />{en ? "Safety" : "Seguridad"}</p>
              <ul className="space-y-2.5">
                {seguridad.map((s) => <li key={s} className="font-dm text-sm text-crema/80 leading-relaxed">{s}</li>)}
              </ul>
            </div>
          )}
        </div>
      </Seccion>
    </>
  );
}

/* ── Temporadas, servicios y turismo responsable ─────────────────────────── */

export function TemporadasServicios({ guia }: { guia: GuiaDestino }) {
  return (
    <>
      {guia.temporadas.length > 0 && (
        <Seccion id="temporadas">
          <h2 className={H2}><CalendarRange className="inline w-6 h-6 mr-2 -mt-1 text-verde-selva" aria-hidden="true" />Cómo está mes a mes</h2>
          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <table className="w-full text-left font-dm text-sm">
              <caption className="sr-only">El lugar según la temporada</caption>
              <thead className="bg-white/5">
                <tr>
                  <th scope="col" className={`${ROTULO} px-4 py-3`}>Meses</th>
                  <th scope="col" className={`${ROTULO} px-4 py-3`}>El agua</th>
                  <th scope="col" className={`${ROTULO} px-4 py-3 hidden sm:table-cell`}>Qué esperar</th>
                </tr>
              </thead>
              <tbody>
                {guia.temporadas.map((t) => (
                  <tr key={t.meses} className="border-t border-white/5 align-top">
                    <th scope="row" className="px-4 py-3 font-normal text-crema/85 whitespace-nowrap">{t.meses}</th>
                    <td className="px-4 py-3 text-crema">{t.agua}<span className="block sm:hidden text-xs text-crema/55 mt-1">{t.nota}</span></td>
                    <td className="px-4 py-3 text-crema/65 text-xs hidden sm:table-cell">{t.nota}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Seccion>
      )}
      {(guia.servicios.length > 0 || guia.responsable.length > 0) && (
        <Seccion id="servicios">
          <div className="grid gap-4 md:grid-cols-2">
            {guia.servicios.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-negro/40 p-5">
                <h2 className="font-cormorant text-crema text-2xl mb-3 flex items-center gap-2"><Store className="w-5 h-5 text-verde-selva" aria-hidden="true" />Servicios en el lugar</h2>
                <ul className="space-y-2">{guia.servicios.map((s) => <li key={s} className="font-dm text-sm text-crema/75 flex gap-2"><span className="text-verde-vivo" aria-hidden="true">·</span>{s}</li>)}</ul>
              </div>
            )}
            {guia.responsable.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-negro/40 p-5">
                <h2 className="font-cormorant text-crema text-2xl mb-3 flex items-center gap-2"><Leaf className="w-5 h-5 text-verde-selva" aria-hidden="true" />Turismo responsable</h2>
                <ul className="space-y-2">{guia.responsable.map((s) => <li key={s} className="font-dm text-sm text-crema/75 flex gap-2"><span className="text-verde-vivo" aria-hidden="true">·</span>{s}</li>)}</ul>
              </div>
            )}
          </div>
        </Seccion>
      )}
    </>
  );
}

/* ── Cerca de aquí ──────────────────────────────────────────────────────── */

export function CercaDeAqui({ destino, locale }: { destino: Destino; locale: Locale }) {
  const en = locale === "en";
  const cercanos = DESTINOS_DB
    .filter((d) => d.slug !== destino.slug)
    .map((d) => ({ d, km: kmEnLineaRecta(destino, d) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, 4);
  if (!cercanos.length) return null;
  return (
    <Seccion id="cerca">
      <h2 className={H2}>{en ? `Near ${destino.nombre}` : `Cerca de ${destino.nombre}`}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {cercanos.map(({ d, km }) => {
          const l = localizeDestino(d, locale);
          const atr = atributosDe(d.slug);
          const foto = d.imagen_hero || d.imagen_galeria[0];
          return (
            <Link key={d.slug} href={localePath(`/destinos/${d.slug}`, locale)}
              className="rounded-xl group flex items-center gap-4 border border-white/10 bg-negro/40 p-3 hover:border-verde-vivo/50 transition-colors">
              {foto ? (
                <span className="relative block h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl">
                  <Image src={foto} alt="" fill className="object-cover" sizes="64px" />
                </span>
              ) : <span className="h-16 w-16 flex-shrink-0 rounded-xl bg-verde-profundo" />}
              <span className="min-w-0">
                <span className="block font-dm text-sm text-crema group-hover:text-lima transition-colors leading-snug">{l.nombre}</span>
                <span className="block font-dm text-[11px] text-crema/50 mt-1">
                  {en ? `${Math.round(km)} km in a straight line` : `A ${Math.round(km)} km en línea recta`} · {nivelTexto(atr.nivel, en)}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
      <p className="mt-3 font-dm text-[11px] text-crema/40">
        {en ? "Distances in a straight line; by road it is usually 1.5–2× more." : "Distancias en línea recta; por carretera suele ser de 1.5 a 2 veces más."}
      </p>
    </Seccion>
  );
}

/* ── Fuentes y cómo verificamos ─────────────────────────────────────────── */

export function FuentesDestino({ guia }: { guia: GuiaDestino }) {
  return (
    <Seccion id="fuentes">
      <div className="rounded-2xl border border-white/10 bg-negro/30 p-5">
        <h2 className="font-cormorant text-crema text-xl mb-2 flex items-center gap-2"><BookOpen className="w-4 h-4 text-verde-selva" aria-hidden="true" />Fuentes y cómo verificamos</h2>
        <p className="font-dm text-xs text-crema/55 leading-relaxed mb-3">
          {guia.enCampo
            ? `Verificado en campo el ${fechaLarga(guia.enCampo.fecha)} por ${guia.enCampo.por}, guía de Huasteca Potosina Tours. `
            : `Revisamos estas fuentes el ${fechaLarga(guia.revisado)}; cuando nuestros guías detectan un cambio en el lugar, lo corregimos aquí. `}
          Si encuentras un dato distinto, avísanos por WhatsApp y lo corregimos.
        </p>
        <ul className="space-y-1.5">
          {guia.fuentes.map((f) => (
            <li key={`${f.nombre}-${f.fecha}`} className="font-dm text-xs text-crema/60">
              {f.url ? <a href={f.url} target="_blank" rel="noopener noreferrer nofollow" className="underline underline-offset-2 hover:text-crema">{f.nombre}</a> : f.nombre}
              <span className="text-crema/35"> · {fechaLarga(f.fecha)}</span>
            </li>
          ))}
        </ul>
      </div>
    </Seccion>
  );
}
