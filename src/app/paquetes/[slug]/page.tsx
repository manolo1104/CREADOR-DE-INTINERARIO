import { notFound } from "next/navigation";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft, Moon, Star, Check, X, MapPin, Camera, Bed, Mountain,
  Car, Plane, Bus, Sparkles, Clock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PAQUETES_DB, getPaquete, HABITACIONES, LOGISTICA, RESENAS_PAQUETES, RESENAS_POR_PAQUETE, FAQS_PAQUETES } from "@/lib/paquetes";
import { TOURS_DB } from "@/lib/tours";
import { PaqueteFormCta } from "@/components/PaqueteFormCta";
import { waLink } from "@/lib/whatsapp";

const SITE = "https://www.huasteca-potosina.com";

const LOGISTICA_ICONS: Record<string, LucideIcon> = { Car, Plane, Bus, Sparkles };

interface Props { params: { slug: string } }

export function generateStaticParams() {
  return PAQUETES_DB.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const p = getPaquete(params.slug);
  if (!p) return { title: "Paquete no encontrado — Huasteca Potosina" };
  return {
    title: `${p.nombre} — ${p.duracion} | Tours + Hotel Xilitla`,
    description: `${p.nombre}: ${p.subtitulo}. ${p.duracion} con tours guiados, hospedaje en Hotel Paraíso Encantado Xilitla, desayunos, transporte local y guías certificados. Itinerario día por día, logística y precios.`,
    alternates: { canonical: `${SITE}/paquetes/${p.slug}` },
    openGraph: {
      title: `${p.nombre} — Huasteca Potosina`,
      description: `${p.duracion} · ${p.subtitulo}`,
      url: `${SITE}/paquetes/${p.slug}`,
      images: [{ url: `${SITE}${p.imagen}` }],
    },
  };
}

export default function PaqueteDetallePage({ params }: Props) {
  const p = getPaquete(params.slug);
  if (!p) notFound();

  const totalValor = p.valor.reduce((acc, v) => acc + parseInt(v.precio.replace(/[^0-9]/g, ""), 10), 0);
  const ahorro = totalValor - p.precio;
  const waMsg = `Hola, me interesa el ${p.nombre} (${p.duracion}, $${p.precio.toLocaleString("es-MX")} MXN). ¿Tienen disponibilidad?`;
  const resenas = RESENAS_POR_PAQUETE[p.slug] ?? RESENAS_PAQUETES;

  return (
    <main className="min-h-screen bg-negro">

      {/* ── HERO ── */}
      <section className="relative min-h-[60vh] flex flex-col justify-end overflow-hidden">
        <Image src={p.imagen} alt={p.nombre} fill priority className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-negro via-negro/80 to-negro/30" />
        <div className="relative z-10 px-6 md:px-16 py-14 max-w-5xl mx-auto w-full">
          <Link href="/paquetes" className="inline-flex items-center gap-1.5 text-[10px] tracking-[3px] uppercase text-verde-vivo hover:text-lima transition-colors mb-6">
            <ArrowLeft className="w-3 h-3" /> Todos los paquetes
          </Link>
          {p.badge && (
            <span className="inline-block bg-dorado text-negro text-[9px] font-dm font-bold tracking-[1.5px] uppercase px-3 py-1.5 mb-4">{p.badge}</span>
          )}
          <h1 className="font-cormorant font-light text-crema mb-2 [text-shadow:0_2px_14px_rgba(0,0,0,0.65)]" style={{ fontSize: "clamp(34px,6vw,60px)" }}>{p.nombre}</h1>
          <p className="text-crema/85 font-dm text-sm mb-5 [text-shadow:0_1px_8px_rgba(0,0,0,0.6)]">{p.subtitulo}</p>

          {/* Precio + ahorro sobre tarjeta translúcida oscura — máximo contraste (WCAG AA) */}
          <div className="inline-flex flex-wrap items-center gap-x-5 gap-y-1.5 bg-negro/70 backdrop-blur-md border border-white/15 px-5 py-3.5 mb-6 rounded">
            <span className="flex items-center gap-1.5 text-[11px] tracking-[1px] uppercase text-crema/85 font-dm">
              <Moon className="w-3.5 h-3.5 text-verde-vivo" /> {p.duracion}
            </span>
            <span className="font-cormorant text-dorado leading-none" style={{ fontSize: "clamp(26px,3.5vw,36px)" }}>
              ${p.precio.toLocaleString("es-MX")} <span className="font-dm text-[11px] text-crema/65">MXN {p.precioLabel}</span>
            </span>
            {ahorro > 0 && (
              <span className="text-[11px] font-dm text-lima font-semibold">✓ Ahorras ${ahorro.toLocaleString("es-MX")} MXN vs. por separado</span>
            )}
          </div>

          <div>
            <a href={waLink(waMsg)} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 bg-[#25D366] hover:bg-[#20ba59] text-white px-8 py-3.5 text-[11px] tracking-[2px] uppercase font-dm transition-colors">
              Reservar por WhatsApp →
            </a>
          </div>
        </div>
      </section>

      {/* ── ITINERARIO DÍA POR DÍA ── */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo font-dm mb-2">El plan completo</p>
        <h2 className="font-cormorant font-light text-crema mb-10" style={{ fontSize: "clamp(24px,4vw,40px)" }}>Itinerario día por día</h2>

        <div className="space-y-10">
          {p.itinerario.map((d) => {
            const tour = d.tourSlug ? TOURS_DB.find((t) => t.slug === d.tourSlug) : undefined;
            const imgs = tour ? Array.from(new Set([tour.imagen_hero, ...tour.gallery.map((g) => g.src)])).slice(0, 3) : [];
            return (
              <div key={d.dia} className="grid md:grid-cols-[auto_1fr] gap-5 md:gap-8 border-b border-white/8 pb-10 last:border-0">
                {/* Marca de día */}
                <div className="flex md:flex-col items-center md:items-start gap-3 md:gap-1">
                  <div className="flex items-center justify-center w-14 h-14 border border-verde-selva/40 bg-verde-profundo/30">
                    <span className="font-cormorant text-dorado text-2xl leading-none">{d.dia}</span>
                  </div>
                  <span className="text-[9px] tracking-[2px] uppercase text-crema/40 font-dm">
                    {d.tipo === "llegada" ? "Llegada" : d.tipo === "salida" ? "Salida" : `Día ${d.dia}`}
                  </span>
                </div>

                {/* Contenido del día */}
                <div>
                  <h3 className="font-cormorant text-crema text-xl md:text-2xl mb-2">{d.titulo}</h3>
                  <p className="text-crema/65 font-dm text-sm leading-relaxed mb-3">{d.descripcion}</p>

                  {tour && (
                    <>
                      <p className="text-crema/55 font-dm text-sm leading-relaxed mb-4">{tour.descripcion}</p>

                      {imgs.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mb-4">
                          {imgs.map((src, i) => (
                            <div key={src} className="relative aspect-[4/3] overflow-hidden rounded">
                              <Image src={src} alt={`${tour.nombre} — foto ${i + 1}`} fill className="object-cover" sizes="(max-width: 768px) 33vw, 240px" />
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 mb-4">
                        {tour.incluye.slice(0, 6).map((inc) => (
                          <span key={inc} className="flex items-start gap-2 text-[12px] text-crema/60 font-dm">
                            <Check className="w-3 h-3 text-verde-vivo flex-shrink-0 mt-0.5" /> {inc}
                          </span>
                        ))}
                      </div>

                      <Link href={`/tours/${tour.slug}`} className="inline-flex items-center gap-1.5 text-[10px] tracking-[2px] uppercase text-verde-vivo hover:text-lima font-dm transition-colors">
                        <MapPin className="w-3 h-3" /> Ver el tour completo →
                      </Link>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── INCLUYE / NO INCLUYE ── */}
      <section className="bg-verde-profundo/20 border-y border-white/6 py-16 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10">
          <div>
            <h2 className="font-cormorant text-crema text-2xl mb-5 flex items-center gap-2"><Check className="w-5 h-5 text-verde-vivo" /> Qué incluye</h2>
            <ul className="space-y-2.5">
              {p.incluye.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-crema/70 font-dm">
                  <Check className="w-4 h-4 text-verde-vivo flex-shrink-0 mt-0.5" /> {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-cormorant text-crema text-2xl mb-5 flex items-center gap-2"><X className="w-5 h-5 text-terracota" /> No incluye</h2>
            <ul className="space-y-2.5">
              {p.noIncluye.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-crema/55 font-dm">
                  <X className="w-4 h-4 text-terracota/70 flex-shrink-0 mt-0.5" /> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── HOSPEDAJE ── */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo font-dm mb-2 flex items-center gap-1.5"><Bed className="w-3.5 h-3.5" /> Tu hospedaje</p>
        <h2 className="font-cormorant font-light text-crema mb-3" style={{ fontSize: "clamp(24px,4vw,40px)" }}>Hotel Paraíso Encantado, Xilitla</h2>
        <p className="text-crema/60 font-dm text-sm leading-relaxed max-w-2xl mb-8">
          A minutos del Jardín Surrealista de Edward James, rodeado de naturaleza y con desayunos de platillos típicos.
          Estas son las habitaciones disponibles para tu paquete:
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {HABITACIONES.map((h) => (
            <div key={h.id} className="border border-white/10 bg-negro/50 overflow-hidden flex flex-col">
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image src={h.imagen} alt={`Habitación ${h.nombre} — Hotel Paraíso Encantado`} fill className="object-cover" sizes="(max-width: 640px) 100vw, 25vw" />
                {h.suplemento ? (
                  <span className="absolute top-2 right-2 bg-dorado text-negro text-[9px] font-dm font-bold tracking-[1px] uppercase px-2 py-1 flex items-center gap-1">
                    <Mountain className="w-3 h-3" /> +${h.suplemento}/noche
                  </span>
                ) : (
                  <span className="absolute top-2 right-2 bg-verde-selva/90 text-crema text-[9px] font-dm tracking-[1px] uppercase px-2 py-1">Incluida</span>
                )}
              </div>
              <div className="p-4 flex flex-col flex-1">
                <h3 className="font-cormorant text-crema text-lg leading-tight">{h.nombre}</h3>
                <p className="text-[10px] tracking-[1px] uppercase text-verde-vivo/70 font-dm mb-2">Vista: {h.vista}</p>
                <p className="text-crema/55 font-dm text-xs leading-relaxed">{h.descripcion}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-crema/40 font-dm mt-4">
          Las habitaciones con vista a la selva están incluidas en el precio. La habitación <strong className="text-crema/70">Jungla</strong>, con vista a la montaña, tiene un suplemento de <strong className="text-dorado">$400 MXN por noche</strong>.
        </p>
      </section>

      {/* ── LOGÍSTICA — CÓMO LLEGAR ── */}
      <section className="bg-verde-profundo/20 border-y border-white/6 py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo font-dm mb-2 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Cómo llegar</p>
          <h2 className="font-cormorant font-light text-crema mb-3" style={{ fontSize: "clamp(24px,4vw,40px)" }}>Logística del viaje</h2>
          <p className="text-crema/55 font-dm text-sm leading-relaxed max-w-2xl mb-8">{LOGISTICA.nota}</p>

          <div className="grid sm:grid-cols-2 gap-5">
            {LOGISTICA.modos.map((m) => {
              const Icon = LOGISTICA_ICONS[m.icon] ?? MapPin;
              const destacado = m.id === "nosotros";
              return (
                <div key={m.id} className={`border p-5 ${destacado ? "border-dorado/40 bg-dorado/8" : "border-white/10 bg-negro/40"}`}>
                  <h3 className={`font-cormorant text-xl mb-3 flex items-center gap-2 ${destacado ? "text-dorado" : "text-crema"}`}>
                    <Icon className={`w-5 h-5 ${destacado ? "text-dorado" : "text-verde-vivo"}`} /> {m.titulo}
                  </h3>
                  <ul className="space-y-2">
                    {m.puntos.map((pt) => (
                      <li key={pt} className="flex items-start gap-2 text-sm text-crema/65 font-dm leading-relaxed">
                        <span className={`mt-1.5 w-1 h-1 rounded-full flex-shrink-0 ${destacado ? "bg-dorado" : "bg-verde-vivo"}`} /> {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <div className="mt-6 border-l-2 border-agua/50 bg-agua/8 p-4">
            <p className="text-[10px] tracking-[2px] uppercase text-agua mb-1.5 flex items-center gap-1.5"><Clock className="w-3 h-3" /> Ya en la zona</p>
            <p className="text-sm text-crema/70 font-dm leading-relaxed">{LOGISTICA.intra}</p>
          </div>
        </div>
      </section>

      {/* ── RESERVA (form + desglose de valor) ── */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div className="border border-white/10 bg-negro/50 p-6">
            <h2 className="font-cormorant text-crema text-2xl mb-1">Reserva tu {p.nombre}</h2>
            <p className="text-crema/50 font-dm text-xs mb-5">Sin pago anticipado · Confirmamos disponibilidad en &lt;1 hora</p>
            <PaqueteFormCta packageName={p.nombre} price={p.precio} destacado={p.destacado} />
          </div>
          <div className="border border-white/10 bg-negro/40 p-6">
            <p className="text-[9px] tracking-[2px] uppercase text-crema/35 font-dm mb-3">Lo que pagarías por separado</p>
            <div className="space-y-2 mb-3">
              {p.valor.map((v) => (
                <div key={v.item} className="flex justify-between text-[12px] font-dm">
                  <span className="text-crema/55">{v.item}</span>
                  <span className="text-crema/80 font-medium">{v.precio} MXN</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[12px] font-dm border-t border-white/8 pt-2">
              <span className="text-crema/55">Valor por separado</span>
              <span className="text-crema/80 font-medium line-through">${totalValor.toLocaleString("es-MX")} MXN</span>
            </div>
            <div className="flex justify-between text-sm font-dm font-medium mt-1">
              <span className="text-verde-vivo">Precio del paquete</span>
              <span className="text-dorado font-cormorant text-xl">${p.precio.toLocaleString("es-MX")} MXN</span>
            </div>
            {ahorro > 0 && <p className="text-[11px] text-verde-vivo font-dm mt-2">✓ Ahorras ${ahorro.toLocaleString("es-MX")} MXN</p>}
            <p className="text-[10px] text-crema/35 font-dm mt-4 flex items-center gap-1.5"><Camera className="w-3 h-3" /> Precio por pareja. Grupos y personas adicionales se cotizan aparte.</p>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF ── */}
      <section className="bg-negro/80 border-y border-white/6 py-14 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-[10px] tracking-[4px] uppercase text-crema/30 font-dm text-center mb-8">Lo que dicen quienes ya hicieron este paquete</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {resenas.map((r) => (
              <div key={r.nombre} className="border border-white/8 bg-negro/50 p-5">
                <div className="flex gap-0.5 mb-3">{[...Array(r.estrellas)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-dorado text-dorado" />)}</div>
                <p className="font-dm text-xs text-crema/70 leading-relaxed italic mb-4">&ldquo;{r.texto}&rdquo;</p>
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.foto} alt={r.nombre} className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-white/15" loading="lazy" />
                  <div>
                    <p className="font-dm text-xs text-crema/80 font-medium leading-none">{r.nombre}</p>
                    <p className="text-[9px] font-dm text-crema/35 mt-0.5">{r.ciudad} · {r.tour}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="font-cormorant text-crema text-2xl mb-8 text-center">Preguntas <em className="text-dorado">frecuentes</em></h2>
        <div className="space-y-4">
          {FAQS_PAQUETES.map((faq) => (
            <details key={faq.q} className="border border-white/10 bg-negro/40">
              <summary className="px-5 py-4 cursor-pointer text-crema/80 font-dm text-sm hover:text-crema transition-colors list-none flex items-center justify-between gap-3">
                {faq.q}
                <span className="text-verde-vivo flex-shrink-0 text-lg leading-none">+</span>
              </summary>
              <div className="px-5 pb-5 border-t border-white/8 pt-4">
                <p className="text-crema/55 font-dm text-sm leading-relaxed">{faq.a}</p>
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="bg-verde-profundo/40 border-t border-white/6 py-14 px-6 text-center">
        <h2 className="font-cormorant text-crema text-2xl mb-3">¿Listo para vivir la <em className="text-dorado">{p.nombre.replace("Paquete ", "")}</em>?</h2>
        <p className="text-crema/50 font-dm text-sm mb-7 max-w-md mx-auto">Escríbenos por WhatsApp con tus fechas y armamos todo. Respuesta en menos de 1 hora.</p>
        <a href={waLink(waMsg)} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2.5 bg-[#25D366] hover:bg-[#20ba59] text-white px-10 py-4 text-[11px] tracking-[2px] uppercase font-dm transition-colors">
          Reservar por WhatsApp →
        </a>
        <div className="mt-6">
          <Link href="/paquetes" className="inline-flex items-center gap-1.5 text-[10px] tracking-[2px] uppercase text-crema/40 hover:text-crema/70 font-dm transition-colors">
            <ArrowLeft className="w-3 h-3" /> Ver los otros paquetes
          </Link>
        </div>
      </section>

    </main>
  );
}
