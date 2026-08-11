import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Clock, Users, Shield, Check, MapPin, CalendarCheck, CreditCard, Lock, Star } from "lucide-react";
import { TOURS_DB, tourDurTexto, type Tour } from "@/lib/tours";
import { formatMXN } from "@/lib/tourBooking";
import { getReservasStats, vale, type ReservasStats } from "@/lib/reservasStats";
import { waLink } from "@/lib/whatsapp";
import { GOOGLE_MAPS_REVIEWS_URL } from "@/lib/tourReviews";
import { PAQUETES_DB } from "@/lib/paquetes";

const SITE = "https://www.huasteca-potosina.com";

/** Las estadísticas se refrescan cada hora; el catálogo es estático. */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Reservar tour en la Huasteca Potosina — Aparta con el 30 %",
  description:
    "Aparta con el 30 % y cancela gratis hasta 48 h antes. Transporte desde tu hospedaje, guía NOM-09, entradas y seguro de viaje incluidos. Liquidas el día del tour.",
  alternates: { canonical: `${SITE}/reservar` },
  openGraph: {
    title: "Reservar tour en la Huasteca Potosina",
    description: "Aparta con el 30 %. Cancelación gratuita hasta 48 h antes.",
    url: `${SITE}/reservar`,
    images: [{ url: `${SITE}/imagenes/cascada-de-tamul/hero.jpg` }],
  },
};

const ANTICIPO = 0.3;

/** Orden del catálogo: primero lo que la gente reserva de verdad. */
function ordenarPorReservas(tours: Tour[], stats: ReservasStats | null): Tour[] {
  if (!stats) return tours;
  return [...tours].sort(
    (a, b) => (stats.porTour[b.slug] ?? 0) - (stats.porTour[a.slug] ?? 0),
  );
}

export default async function ReservarPage() {
  const stats  = await getReservasStats();
  const tours  = ordenarPorReservas(TOURS_DB, stats);
  const desde  = Math.min(...TOURS_DB.map((t) => t.precio));

  return (
    <main id="main-content" className="min-h-screen bg-negro">

      {/* ── ENCABEZADO ─────────────────────────────────────────────────── */}
      <section className="relative bg-verde-profundo px-6 pt-32 pb-12 text-center overflow-hidden">
        <div className="max-w-3xl mx-auto relative">
          <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo font-dm mb-4">
            Motor de reservas
          </p>
          <h1
            className="font-cormorant font-light text-crema mb-5"
            style={{ fontSize: "clamp(38px,6vw,68px)", lineHeight: 1.05 }}
          >
            Elige tu recorrido y aparta tu lugar
          </h1>
          <p className="text-crema/70 font-dm text-base leading-relaxed max-w-xl mx-auto">
            No pagas todo hoy: <strong className="text-crema">apartas con el 30 %</strong> y
            liquidas el día del tour. Si algo cambia,{" "}
            <strong className="text-crema">cancelas gratis hasta 48 h antes</strong>.
          </p>

          {/*
            Prueba social del encabezado: la CALIFICACIÓN, no el conteo de
            reservas. El histórico de la base arrancó hace poco, así que decía
            "30 reservas" debajo del "+10,000 viajeros" del home — un número
            chico y verdadero al lado de uno grande y también verdadero, que
            restaba en vez de sumar. La calificación de Google es la misma que
            ya se usa en el home y en /tours, y es verificable: el enlace lleva
            a las reseñas reales.
          */}
          <a
            href={GOOGLE_MAPS_REVIEWS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 group inline-flex items-center gap-2.5 border border-dorado/30 bg-dorado/10 px-4 py-2.5 hover:border-dorado/60 transition-colors"
          >
            <span className="flex gap-0.5" aria-hidden="true">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-dorado text-dorado" />
              ))}
            </span>
            <span className="font-dm text-[13px] text-crema/90">
              <strong className="text-crema">4.9</strong> · 492 reseñas en Google
            </span>
            <span className="font-dm text-[11px] text-crema/45 group-hover:text-crema/70 transition-colors hidden sm:inline">
              Verlas →
            </span>
          </a>
        </div>
      </section>

      {/* ── BARRA DE CONFIANZA ─────────────────────────────────────────── */}
      <section className="border-y border-white/8 bg-negro/60">
        <div className="max-w-6xl mx-auto px-6 py-5 grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-6">
          {[
            { Icon: CreditCard, t: "Apartas con el 30 %",     s: "El resto, el día del tour" },
            { Icon: Shield,     t: "Cancelación gratuita",     s: "Hasta 48 h antes, sin preguntas" },
            { Icon: Users,      t: "Grupos pequeños",          s: "Guías certificados NOM-09" },
            { Icon: MapPin,     t: "Pasamos por ti",           s: "En tu hospedaje de Xilitla o Cd. Valles" },
          ].map(({ Icon, t, s }) => (
            <div key={t} className="flex items-start gap-2.5">
              <Icon className="w-4 h-4 text-verde-vivo flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span className="leading-tight">
                <span className="block text-[12px] font-dm text-crema/90 font-medium">{t}</span>
                <span className="block text-[11px] font-dm text-crema/45">{s}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ──────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pt-14 pb-4">
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            { n: "1", t: "Elige tus recorridos", s: "Puedes juntar varios días en un solo carrito y pagarlos de una vez." },
            { n: "2", t: "Aparta con el 30 %", s: "Eliges fecha y personas. Pago seguro con tarjeta." },
            { n: "3", t: "Liquidas el día del tour", s: "En efectivo o tarjeta, al llegar." },
          ].map(({ n, t, s }) => (
            <div key={n} className="flex gap-3">
              <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 border border-verde-selva/40 bg-verde-profundo/40 font-cormorant text-dorado text-lg">
                {n}
              </span>
              <span>
                <span className="block font-dm text-[13px] text-crema/90 font-medium mb-0.5">{t}</span>
                <span className="block font-dm text-[12px] text-crema/50 leading-snug">{s}</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── CATÁLOGO ───────────────────────────────────────────────────── */}
      <section id="catalogo" className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex items-baseline justify-between flex-wrap gap-2 mb-8 border-b border-white/8 pb-4">
          <h2 className="font-cormorant font-light text-crema" style={{ fontSize: "clamp(24px,3.5vw,38px)" }}>
            Todos los recorridos
          </h2>
          <p className="text-[11px] font-dm text-crema/45">
            {TOURS_DB.length} recorridos · desde {formatMXN(desde)} MXN
            {stats && " · ordenados por los más reservados"}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {tours.map((tour, i) => {
            const porVehiculo = tour.precioUnidad === "vehiculo";
            const anticipo    = Math.round(tour.precio * ANTICIPO);
            const reservas    = stats?.porTour[tour.slug] ?? 0;
            const esTop       = stats?.masReservado === tour.slug;

            return (
              <article
                key={tour.id}
                className="stagger-reveal group relative flex flex-col border border-white/10 bg-negro/40 hover:border-verde-vivo/45 transition-colors duration-300 overflow-hidden"
                style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
              >
                {/* Imagen */}
                <div className="relative h-44 overflow-hidden flex-shrink-0">
                  <Image
                    src={tour.imagen_hero}
                    alt={tour.nombre}
                    fill
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-negro/90 via-negro/15 to-negro/25" />

                  {esTop && (
                    <span className="absolute top-3 left-3 bg-dorado text-negro text-[9px] font-dm font-bold tracking-[1px] uppercase px-2.5 py-1">
                      El más reservado
                    </span>
                  )}
                  <span className="absolute bottom-3 left-3 bg-negro/75 text-crema/85 text-[9px] font-dm tracking-[1px] px-2 py-1">
                    ⏱ {tourDurTexto(tour, " h")}
                  </span>
                  <span className="absolute bottom-3 right-3 bg-negro/75 text-crema/85 text-[9px] font-dm tracking-[1px] px-2 py-1">
                    máx. {tour.groupMax}
                  </span>
                </div>

                {/* Info */}
                <div className="flex flex-col flex-1 p-5">
                  <p className="text-[9px] tracking-[2px] uppercase text-verde-vivo font-dm mb-1.5">{tour.tipo}</p>
                  <h3 className="font-cormorant text-crema text-xl leading-tight mb-2">
                    {tour.nombre.split("—")[0].trim()}
                  </h3>

                  {/* Escasez REAL: la que declara el propio tour */}
                  {tour.urgencia && (
                    <p className="text-[11px] font-dm text-dorado/85 leading-snug mb-3">
                      ▸ {tour.urgencia}
                    </p>
                  )}

                  {/* La calificación del recorrido, que es lo que de verdad
                      empuja a reservar. El conteo de grupos que había aquí
                      salía del histórico corto de la base y en varios tours
                      daba números de un dígito. */}
                  {tour.reviewCount > 0 && (
                    <p className="flex items-center gap-1.5 text-[11px] font-dm text-dorado/90 mb-3">
                      <Star className="w-3 h-3 fill-dorado text-dorado" aria-hidden="true" />
                      <strong className="text-crema/85">4.9</strong>
                      <span className="text-crema/45">· {tour.reviewCount} reseñas</span>
                    </p>
                  )}

                  <div className="mt-auto pt-4 border-t border-white/8">
                    <p className="flex items-baseline gap-2 mb-0.5">
                      <span className="font-cormorant text-dorado text-3xl font-light leading-none">
                        {formatMXN(tour.precio)}
                      </span>
                      <span className="text-[10px] text-crema/40 font-dm">
                        MXN {porVehiculo ? "por vehículo" : "por persona"}
                      </span>
                    </p>
                    <p className="text-[11px] font-dm text-crema/55 mb-4">
                      Apartas con <strong className="text-crema/85">{formatMXN(anticipo)}</strong>
                    </p>

                    <div className="flex gap-2">
                      <Link
                        href={`/reservar-tour/${tour.slug}`}
                        className="flex-1 text-center bg-verde-selva hover:bg-verde-vivo text-crema text-[10px] tracking-[2px] uppercase font-dm font-medium py-3 transition-colors"
                      >
                        Reservar
                      </Link>
                      <Link
                        href={`/tours/${tour.slug}`}
                        className="px-3 flex items-center border border-white/15 hover:border-crema/40 text-crema/60 hover:text-crema text-[10px] tracking-[1.5px] uppercase font-dm transition-colors"
                      >
                        Detalles
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* ── PAQUETES ───────────────────────────────────────────────────── */}
      {/*
        La página se llamaba "motor de reservas" pero solo listaba los tours de
        un día: los paquetes de varios días —el producto de mayor ticket— no
        aparecían por ningún lado. Quien llegaba aquí buscando un viaje completo
        no encontraba nada y se iba.
      */}
      <section id="paquetes" className="max-w-6xl mx-auto px-6 pb-14">
        <div className="flex items-baseline justify-between flex-wrap gap-2 mb-8 border-b border-white/8 pb-4">
          <h2 className="font-cormorant font-light text-crema" style={{ fontSize: "clamp(24px,3.5vw,38px)" }}>
            Viajes de varios días
          </h2>
          <p className="text-[11px] font-dm text-crema/45">
            Con hospedaje, desayunos y traslados incluidos
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PAQUETES_DB.map((paq) => (
            <article
              key={paq.id}
              className="group relative flex flex-col border border-dorado/20 bg-negro/40 hover:border-dorado/50 transition-colors duration-300 overflow-hidden"
            >
              <div className="relative h-44 overflow-hidden flex-shrink-0">
                <Image
                  src={paq.imagen}
                  alt={paq.nombre}
                  fill
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-negro/90 via-negro/15 to-negro/25" />
                <span className="absolute bottom-3 left-3 bg-negro/75 text-crema/85 text-[9px] font-dm tracking-[1px] px-2 py-1">
                  {paq.dias} días · {paq.noches} noches
                </span>
              </div>

              <div className="flex flex-col flex-1 p-5">
                <p className="text-[9px] tracking-[2px] uppercase text-dorado font-dm mb-1.5">Paquete</p>
                <h3 className="font-cormorant text-crema text-xl leading-tight mb-2">
                  {paq.nombre.split("—")[0].trim()}
                </h3>
                <p className="text-[11px] font-dm text-crema/50 leading-snug mb-3 line-clamp-3">
                  {paq.subtitulo}
                </p>

                <div className="mt-auto pt-4 border-t border-white/8">
                  <p className="flex items-baseline gap-2 mb-0.5">
                    <span className="font-cormorant text-dorado text-3xl font-light leading-none">
                      {formatMXN(paq.precio)}
                    </span>
                    <span className="text-[10px] text-crema/40 font-dm">MXN {paq.precioLabel}</span>
                  </p>
                  <p className="text-[11px] font-dm text-crema/55 mb-4">
                    Apartas desde <strong className="text-crema/85">{formatMXN(Math.round(paq.precio * 0.1))}</strong>
                  </p>

                  <div className="flex gap-2">
                    <Link
                      href={`/reservar-paquete/${paq.slug}`}
                      className="flex-1 text-center bg-dorado hover:bg-lima text-negro text-[10px] tracking-[2px] uppercase font-dm font-medium py-3 transition-colors"
                    >
                      Reservar
                    </Link>
                    <Link
                      href={`/paquetes/${paq.slug}`}
                      className="px-3 flex items-center border border-white/15 hover:border-crema/40 text-crema/60 hover:text-crema text-[10px] tracking-[1.5px] uppercase font-dm transition-colors"
                    >
                      Detalles
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── REVERSIÓN DE RIESGO ────────────────────────────────────────── */}
      <section className="bg-verde-profundo/30 border-y border-white/8 py-14 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-cormorant font-light text-crema text-center mb-8" style={{ fontSize: "clamp(22px,3vw,34px)" }}>
            Reservar aquí no tiene riesgo
          </h2>
          <div className="grid sm:grid-cols-2 gap-x-10 gap-y-4">
            {[
              "Cancelación gratuita hasta 48 h antes del tour, sin preguntas y sin penalización.",
              "Hoy solo pagas el 30 %. El resto lo liquidas el día del recorrido.",
              "El precio que ves es el final: transporte, entradas, guía, equipo y seguro incluidos.",
              "Si el clima obliga a suspender, se reprograma o se devuelve el anticipo.",
              "Pago con tarjeta procesado por Stripe. Nosotros no guardamos tus datos bancarios.",
              "¿Dudas antes de pagar? Te contestamos por WhatsApp y reservas cuando quieras.",
            ].map((t) => (
              <p key={t} className="flex items-start gap-2.5 text-[13px] font-dm text-crema/70 leading-relaxed">
                <Check className="w-4 h-4 text-verde-vivo flex-shrink-0 mt-0.5" aria-hidden="true" />
                {t}
              </p>
            ))}
          </div>

          <div className="mt-10 text-center">
            <p className="inline-flex items-center gap-2 text-[11px] font-dm text-crema/40">
              <Lock className="w-3.5 h-3.5" aria-hidden="true" /> Pago seguro · Stripe
            </p>
          </div>
        </div>
      </section>

      {/* ── AYUDA ──────────────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-16 text-center">
        <CalendarCheck className="w-7 h-7 text-verde-vivo mx-auto mb-4" aria-hidden="true" />
        <h2 className="font-cormorant font-light text-crema mb-3" style={{ fontSize: "clamp(22px,3vw,32px)" }}>
          ¿No sabes cuál elegir?
        </h2>
        <p className="text-crema/55 font-dm text-sm mb-7 max-w-md mx-auto leading-relaxed">
          Dinos cuántos días tienes y con quién viajas, y te decimos qué recorrido te conviene.
          Sin compromiso.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/recomendar"
            className="bg-verde-selva hover:bg-verde-vivo text-crema px-8 py-3.5 text-[10px] tracking-[2.5px] uppercase font-dm transition-colors"
          >
            Ver mi tour ideal
          </Link>
          <a
            href={waLink("Hola, quiero reservar un recorrido en la Huasteca. ¿Me ayudan a elegir?")}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-white/20 hover:border-crema/50 text-crema/75 hover:text-crema px-8 py-3.5 text-[10px] tracking-[2.5px] uppercase font-dm transition-colors"
          >
            Preguntar por WhatsApp
          </a>
        </div>
      </section>
    </main>
  );
}
