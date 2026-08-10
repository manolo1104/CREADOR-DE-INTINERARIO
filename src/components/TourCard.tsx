"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { tourDurTexto, type Tour } from "@/lib/tours";
import { waLink, WA_MESSAGES } from "@/lib/whatsapp";
import { Star, Clock, Users } from "lucide-react";
import { trackWhatsapp } from "@/lib/analytics";

const dificultadConfig = {
  alta:  { label: "AVANZADO", labelEn: "ADVANCED", bg: "bg-orange-700",  dot: "bg-orange-400"  },
  media: { label: "MODERADO", labelEn: "MODERATE", bg: "bg-amber-600",   dot: "bg-amber-400"   },
  baja:  { label: "FÁCIL",    labelEn: "EASY",     bg: "bg-emerald-600", dot: "bg-emerald-400" },
} as const;

interface Props {
  tour: Tour;
  variant?: "compact" | "default";
}

export function TourCard({ tour: t, variant = "default" }: Props) {
  const pathname = usePathname();
  const en = pathname === "/en" || pathname.startsWith("/en/");
  const lp = (p: string) => (en ? `/en${p}` : p);
  const money = (n: number) => `$${n.toLocaleString(en ? "en-US" : "es-MX")}`;
  const dif = dificultadConfig[t.dificultad];
  const imageHeight = variant === "compact" ? "h-52 md:h-56" : "h-56 md:h-64";

  // Tilt 3D sin framer-motion: variables CSS (--rx/--ry) + transición para el "settle".
  const cardRef = useRef<HTMLElement>(null);
  const isTouchRef = useRef(false);
  const reducedRef = useRef(false);

  useEffect(() => {
    reducedRef.current =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (isTouchRef.current || reducedRef.current) return;
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty("--rx", `${-y * 6}deg`);
    el.style.setProperty("--ry", `${x * 6}deg`);
  };

  const handleMouseLeave = () => {
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };

  return (
    <div style={{ perspective: "1000px" }} className="h-full">
    <article
      ref={cardRef}
      className="group relative flex flex-col h-full rounded-xl overflow-hidden border border-white/10 bg-negro hover:border-verde-vivo/50 transition-colors duration-300 tour-card-shimmer"
      style={{
        transform: "rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))",
        transition: "transform 0.3s cubic-bezier(0.23,1,0.32,1), border-color 0.3s",
        willChange: "transform",
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchStart={() => { isTouchRef.current = true; }}
    >

      {/* Stretched link — covers entire card */}
      <Link
        href={lp(`/tours/${t.slug}`)}
        aria-label={`${en ? "View tour" : "Ver tour"}: ${t.nombre}`}
        className="absolute inset-0 z-0 rounded-xl"
      />

      {/* ── IMAGEN ── */}
      <div className={`relative ${imageHeight} overflow-hidden flex-shrink-0`}>
        {t.imagen_hero ? (
          <Image
            src={t.imagen_hero}
            alt={t.nombre}
            fill
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-verde-selva/40 via-verde-profundo to-negro" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-negro/90 via-negro/30 to-transparent" />

        {/* Badge tipo — top left */}
        <span className="absolute top-3 left-3 z-10 bg-verde-vivo text-negro text-[9px] font-dm font-bold tracking-[1.5px] uppercase px-2.5 py-1 rounded-full">
          {t.tipo}
        </span>

        {/* Badge dificultad — top right */}
        <span className={`absolute top-3 right-3 z-10 ${dif.bg} text-white text-[9px] font-dm font-bold tracking-[1.5px] uppercase px-2.5 py-1 rounded-full flex items-center gap-1`}>
          <span className={`w-1.5 h-1.5 rounded-full ${dif.dot}`} aria-hidden="true" />
          {en ? dif.labelEn : dif.label}
        </span>

        {/* Hover overlay with rotating arrow */}
        <div className="absolute inset-0 z-10 bg-gradient-to-br from-verde-selva/0 via-transparent to-dorado/15 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-end p-3 pointer-events-none">
          <span className="w-7 h-7 rounded-full border border-dorado/60 bg-negro/40 flex items-center justify-center group-hover:-rotate-45 transition-transform duration-300 text-dorado text-xs font-dm">
            →
          </span>
        </div>

        {/* Nombre + tagline sobre imagen */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 z-10">
          <h3 className="font-cormorant text-crema text-lg font-normal leading-tight uppercase tracking-wide">
            {t.nombre}
          </h3>
          <p className="text-crema/50 text-[10px] font-dm tracking-[1px] mt-0.5">
            {t.tagline}
          </p>
          {/* Sin reseñas no se enseña calificación: un tour nuevo mostraría
              "4.9 · (0 reseñas reales)", que se contradice a sí mismo. */}
          {t.reviewCount > 0 && (
            <p className="text-[10px] font-dm text-dorado/90 mt-1 flex items-center gap-1">
              <Star className="w-3 h-3 fill-dorado/90" aria-hidden="true" /> 4.9 · ({t.reviewCount} {en ? "real reviews" : "reseñas reales"})
            </p>
          )}
        </div>
      </div>

      {/* ── INFO ── */}
      <div className="flex flex-col flex-1 p-4 bg-negro/80">

        {/* Destinos incluidos */}
        <div className="mb-3">
          <p className="text-[9px] tracking-[2px] uppercase text-crema/30 font-dm mb-2">
            {en ? "Included visits" : "Visitas incluidas"}
          </p>
          <ul className="space-y-1">
            {t.destinos.slice(0, 3).map((d) => (
              <li key={d} className="flex items-start gap-1.5 text-[11px] text-crema/60 font-dm">
                <span className="text-verde-vivo flex-shrink-0 mt-0.5">→</span>
                {d}
              </li>
            ))}
            {t.destinos.length > 3 && (
              <li className="text-[11px] text-crema/35 font-dm pl-3.5">
                +{t.destinos.length - 3} {en ? "more…" : "más…"}
              </li>
            )}
          </ul>
        </div>

        <div className="border-t border-white/8 mb-3" />

        {/* Duración + grupo + salidas */}
        <div className="flex items-center gap-4 mb-3 text-[10px] text-crema/40 font-dm flex-wrap">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" aria-hidden="true" /> {tourDurTexto(t)}</span>
          <span className="flex items-center gap-1"><Users className="w-3 h-3" aria-hidden="true" /> {en ? "max." : "máx."} {t.groupMax}</span>
          <span className="text-verde-vivo/70 font-medium">✦ {en ? "Daily departures" : "Salidas diarias"}</span>
        </div>

        {/* Precio */}
        <div className="mb-4">
          <p className="text-[9px] tracking-[1.5px] uppercase text-crema/35 font-dm mb-0.5">
            {en ? "from" : "desde"}
          </p>
          <p className="font-cormorant text-dorado text-2xl font-normal leading-none">
            {money(t.precio)}
            <span className="font-dm text-[10px] text-crema/40 ml-1 font-normal">MXN / {en ? "person" : "persona"}</span>
          </p>
        </div>

        {/* Guía asignado */}
        {(() => {
          const guiaMap: Record<string, { foto: string; nombre: string; rating: string }> = {
            "tour-tamul":      { foto: "/guides/guia-2.png", nombre: "Miguel Ángel", rating: "5.0" },
            "tour-puente-dios":{ foto: "/guides/guia-2.png", nombre: "Miguel Ángel", rating: "5.0" },
            "tour-meco":       { foto: "/guides/guia-3.png", nombre: "José Laredo",  rating: "4.9" },
            "tour-minas-micos":{ foto: "/guides/guia-3.png", nombre: "José Laredo",  rating: "4.9" },
          };
          const g = guiaMap[t.id] ?? { foto: "/guides/guia-1.png", nombre: "Carlos Rodríguez", rating: "4.9" };
          return (
            <div className="flex items-center gap-2.5 border-t border-white/8 pt-3 mb-3">
              <div className="relative z-10 w-8 h-8 rounded-full overflow-hidden border border-dorado/50 flex-shrink-0">
                <Image src={g.foto} alt={g.nombre} width={32} height={32} className="w-full h-full object-cover object-top" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-dm text-crema/60">{en ? "Your guide:" : "Tu guía:"} <span className="text-crema/85 font-medium">{g.nombre}</span></p>
                <p className="text-[9px] text-dorado/70 font-dm">★ {g.rating} {en ? "certified" : "certificado"}</p>
              </div>
            </div>
          );
        })()}

        {/* CTA */}
        <div className="mt-auto flex flex-col gap-2">
          <span className="w-full block text-center bg-verde-selva group-hover:bg-verde-vivo text-crema text-[10px] tracking-[2px] uppercase font-dm font-medium py-3 transition-colors duration-200 rounded">
            {en ? "View full tour →" : "Ver tour completo →"}
          </span>
          <a
            href={waLink(en
              ? `Hi, I'm interested in the "${t.nombre}" tour. Could you share availability and prices?`
              : WA_MESSAGES.tour(t.nombre, 2, 0, t.precio * 2))}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackWhatsapp("tour_card", t.precio * 2)}
            className="relative z-10 w-full block text-center border border-[#25D366]/40 hover:border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10 text-[10px] tracking-[2px] uppercase font-dm py-2.5 transition-all duration-200 rounded"
          >
            {en ? "Ask on WhatsApp" : "Preguntar por WhatsApp"}
          </a>
          <p className="text-center text-[9px] text-crema/25 font-dm pt-1">
            {en ? "✓ Free cancellation up to 48h before" : "✓ Cancelación gratuita con 48h de anticipación"}
          </p>
        </div>
      </div>
    </article>
    </div>
  );
}
