"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Moon, MapPin, Star } from "lucide-react";
import { PaqueteFormCta } from "@/components/PaqueteFormCta";
import type { Paquete } from "@/lib/paquetes";

export type { Paquete };

// ── Savings counter ──────────────────────────────────────────────

function SavingsCounter({ ahorro }: { ahorro: number }) {
  // Arranca en el ahorro real: sin JS (o antes de hidratar) nunca se ve "Ahorras $0".
  const [count, setCount] = useState(ahorro);
  const ref = useRef<HTMLSpanElement>(null);
  const animated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !animated.current) {
          animated.current = true;
          const start = performance.now();
          const dur = 900;
          const tick = (now: number) => {
            const t = Math.min((now - start) / dur, 1);
            const eased = 1 - (1 - t) ** 3;
            setCount(Math.round(eased * ahorro));
            if (t < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ahorro]);

  return (
    <span ref={ref}>
      <em className="shimmer-gold font-cormorant not-italic" style={{ fontSize: "13px" }}>
        ${count.toLocaleString("es-MX")}
      </em>
    </span>
  );
}

// ── Package card ─────────────────────────────────────────────────

function PaqueteCard({
  p,
  estado,
}: {
  p: Paquete;
  estado: "normal" | "destacado" | "atenuado";
}) {
  const totalValor = p.valor.reduce(
    (acc, v) => acc + parseInt(v.precio.replace(/[^0-9]/g, ""), 10),
    0
  );
  const ahorro = totalValor - p.precio;

  return (
    <article
      className={`relative flex flex-col border overflow-hidden transition-all duration-500 hover:border-verde-vivo/50 ${
        p.destacado ? "border-dorado/50 bg-verde-profundo" : "border-white/10 bg-negro/60"
      } ${
        estado === "destacado"
          ? "ring-2 ring-dorado/70 shadow-[0_0_36px_rgba(196,136,42,0.22)]"
          : estado === "atenuado"
          ? "opacity-40 scale-[0.98] pointer-events-none"
          : ""
      }`}
    >
      {p.badge && (
        <div className="absolute top-4 right-4 z-10 bg-dorado text-negro text-[9px] font-dm font-bold tracking-[1.5px] uppercase px-3 py-1.5">
          {p.badge}
        </div>
      )}
      {estado === "destacado" && (
        <div className="absolute top-4 left-4 z-10 bg-verde-selva text-crema text-[9px] font-dm font-bold tracking-[1.5px] uppercase px-3 py-1.5 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-lima animate-pulse" />
          Tu recomendado
        </div>
      )}

      <div className="relative h-44 overflow-hidden">
        <Image
          src={p.imagen}
          alt={p.nombre}
          fill
          className="object-cover"
          loading="lazy"
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-negro/80 to-transparent" />
        <div className="absolute bottom-3 left-4">
          <p className="text-[9px] tracking-[3px] uppercase text-verde-vivo font-dm flex items-center gap-1.5">
            <Moon className="w-3 h-3" /> {p.duracion}
          </p>
        </div>
      </div>

      <div className="px-6 pt-5 pb-3">
        <h2 className="font-cormorant font-light text-crema leading-tight mb-1" style={{ fontSize: "clamp(20px,2.5vw,27px)" }}>
          {p.nombre}
        </h2>
        <p className="text-crema/50 font-dm text-xs mb-3">{p.subtitulo}</p>

        {/* Perfil chips — idea 1 */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {p.perfiles.map((chip) => (
            <span key={chip} className="text-[9px] tracking-[0.5px] border border-verde-selva/25 text-verde-vivo/60 px-2 py-0.5 font-dm">
              {chip}
            </span>
          ))}
        </div>

        {/* Precio + ahorro animado — idea 2 */}
        <div className="mb-4">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-cormorant text-dorado" style={{ fontSize: "clamp(26px,3.5vw,36px)" }}>
              ${p.precio.toLocaleString("es-MX")}
            </span>
            <span className="text-crema/40 font-dm text-[10px] ml-1">MXN {p.precioLabel}</span>
          </div>
          {ahorro > 0 && (
            <p className="text-[10px] font-dm text-verde-vivo font-medium">
              ✓ Ahorras <SavingsCounter ahorro={ahorro} /> MXN vs. separado
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 bg-dorado/10 border border-dorado/25 px-3 py-2 mb-5">
          <span className="w-1.5 h-1.5 bg-dorado rounded-full animate-pulse flex-shrink-0" />
          <p className="text-[10px] font-dm text-dorado/90 font-medium">{p.urgencia}</p>
        </div>

        {p.tours.length > 0 && (
          <div className="mb-4">
            <p className="text-[9px] tracking-[2px] uppercase text-crema/35 font-dm mb-2 flex items-center gap-1.5">
              <MapPin className="w-3 h-3" /> Tours incluidos
            </p>
            <ul className="space-y-1.5">
              {p.tours.map((t) => (
                <li key={t} className="flex items-start gap-2 text-[11px] text-crema/65 font-dm">
                  <Star className="w-3 h-3 text-dorado/70 flex-shrink-0 mt-0.5" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mb-5">
          <p className="text-[9px] tracking-[2px] uppercase text-crema/35 font-dm mb-2">Qué incluye</p>
          <ul className="space-y-1.5">
            {p.incluye.map((item) => (
              <li key={item} className="flex items-start gap-2 text-[11px] text-crema/65 font-dm">
                <Check className="w-3 h-3 text-verde-vivo flex-shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <details className="mb-5 border border-white/10">
          <summary className="cursor-pointer px-3 py-2.5 text-[10px] tracking-[1px] uppercase font-dm text-crema/50 hover:text-crema transition-colors list-none flex items-center justify-between">
            Ver desglose de valor incluido
            <span className="text-verde-vivo text-base leading-none">+</span>
          </summary>
          <div className="border-t border-white/8 px-3 py-3 space-y-2">
            {p.valor.map((v) => (
              <div key={v.item} className="flex justify-between text-[11px] font-dm">
                <span className="text-crema/55">{v.item}</span>
                <span className="text-crema/80 font-medium">{v.precio} MXN</span>
              </div>
            ))}
            <div className="flex justify-between text-[11px] font-dm border-t border-white/8 pt-2 mt-1">
              <span className="text-crema/55">Valor total</span>
              <span className="text-crema/80 font-medium line-through">${totalValor.toLocaleString()} MXN</span>
            </div>
            <div className="flex justify-between text-[12px] font-dm font-medium">
              <span className="text-verde-vivo">Precio paquete</span>
              <span className="text-dorado">${p.precio.toLocaleString()} MXN</span>
            </div>
          </div>
        </details>
      </div>

      <div className="mt-auto px-6 pb-6">
        <Link
          href={`/paquetes/${p.slug}`}
          className="flex items-center justify-center gap-2 w-full mb-3 py-3 text-[10px] tracking-[2px] uppercase font-dm border border-verde-selva/40 text-verde-vivo hover:border-verde-vivo hover:bg-verde-selva/10 transition-colors"
        >
          Ver el paquete día por día →
        </Link>
        <PaqueteFormCta packageName={p.nombre} price={p.precio} destacado={p.destacado} slug={p.slug} />
        <p className="text-center text-[9px] text-crema/25 font-dm mt-3">
          Reserva por WhatsApp o con tarjeta · Cancelación flexible
        </p>
      </div>
    </article>
  );
}

// ── Quiz — idea 4 ─────────────────────────────────────────────────

const NOCHES_OPTS = ["2 noches", "3 noches", "4 noches"] as const;
const VIBE_OPTS   = ["Arte & naturaleza", "Aventura extrema", "Todo incluido"] as const;

function getRecomendado(noches: string | null, _vibe: string | null): string | null {
  if (!noches) return null;
  if (noches === "2 noches") return "aventura";
  if (noches === "3 noches") return "completo";
  if (noches === "4 noches") return "gran-huasteca";
  return null;
}

const NOMBRE_PAQUETE: Record<string, string> = {
  aventura: "Paquete Aventura",
  completo: "Paquete Completo Huasteca",
  "gran-huasteca": "Paquete Gran Huasteca",
};

// ── Main ─────────────────────────────────────────────────────────

export function PaquetesInteractivo({ paquetes }: { paquetes: Paquete[] }) {
  const [noches, setNoches] = useState<string | null>(null);
  const [vibe,   setVibe]   = useState<string | null>(null);
  const [showSticky, setShowSticky] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  const recomendado = getRecomendado(noches, vibe);
  const needsVibe   = false; // la recomendación depende solo de las noches

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        setShowSticky(!entry.isIntersecting && entry.boundingClientRect.bottom < 0);
      },
      { threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const getEstado = (id: string): "normal" | "destacado" | "atenuado" => {
    if (!recomendado) return "normal";
    return id === recomendado ? "destacado" : "atenuado";
  };

  return (
    <>
      {/* ── QUIZ ── idea 4 */}
      <section className="bg-verde-profundo/10 border-y border-white/6 py-10 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[9px] tracking-[4px] uppercase text-verde-vivo font-dm mb-2">
            ✦ Encuentra tu paquete ideal
          </p>
          <h2 className="font-cormorant font-light text-crema mb-8" style={{ fontSize: "clamp(20px,3vw,30px)" }}>
            Dos preguntas, <em className="shimmer-gold">un paquete perfecto</em>
          </h2>

          <div className="space-y-6">
            {/* Q1 */}
            <div>
              <p className="text-[10px] tracking-[2px] uppercase text-crema/50 font-dm mb-3">
                ¿Cuántas noches tienes disponibles?
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {NOCHES_OPTS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => { setNoches(noches === opt ? null : opt); setVibe(null); }}
                    className={`px-5 py-2.5 text-[11px] tracking-[1.5px] uppercase font-dm border transition-all duration-200 ${
                      noches === opt
                        ? "bg-dorado text-negro border-dorado"
                        : "border-white/20 text-crema/60 hover:border-dorado/50 hover:text-crema"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Q2 */}
            <div className={`transition-opacity duration-300 ${noches ? "opacity-100" : "opacity-30 pointer-events-none"}`}>
              <p className="text-[10px] tracking-[2px] uppercase text-crema/50 font-dm mb-3">
                ¿Qué tipo de experiencia buscas?
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {VIBE_OPTS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setVibe(vibe === opt ? null : opt)}
                    className={`px-5 py-2.5 text-[11px] tracking-[1.5px] uppercase font-dm border transition-all duration-200 ${
                      vibe === opt
                        ? "bg-verde-selva text-crema border-verde-selva"
                        : "border-white/20 text-crema/60 hover:border-verde-vivo/50 hover:text-crema"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Resultado */}
            {noches && (
              <div className="animate-fade-in">
                {needsVibe ? (
                  <p className="text-crema/40 font-dm text-sm">
                    ↑ Elige el tipo de experiencia para ver tu recomendación
                  </p>
                ) : recomendado ? (
                  <div className="border border-dorado/30 bg-dorado/8 px-6 py-4 max-w-sm mx-auto">
                    <p className="text-[9px] tracking-[2px] uppercase text-dorado/70 font-dm mb-1">Tu paquete ideal</p>
                    <p className="font-cormorant text-dorado text-xl font-light">{NOMBRE_PAQUETE[recomendado]}</p>
                    <p className="text-[10px] text-crema/40 font-dm mt-1">Mira el paquete destacado ↓</p>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── GRID ── */}
      <section className="max-w-6xl mx-auto px-6 py-16" ref={gridRef}>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {paquetes.map((p) => (
            <PaqueteCard key={p.id} p={p} estado={getEstado(p.id)} />
          ))}
        </div>
      </section>

      {/* ── STICKY BAR — idea 3 ── */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-negro/97 border-t border-white/10 backdrop-blur-md transition-all duration-300 ${
          showSticky ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
        }`}
        aria-hidden={!showSticky}
      >
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="flex-shrink-0 text-[9px] tracking-[2px] uppercase text-crema/25 font-dm hidden sm:block mr-1">
            Reservar:
          </span>
          {paquetes.map((p) => (
            <a
              key={p.id}
              href={`https://wa.me/524891251458?text=${encodeURIComponent(
                `Hola, me interesa el ${p.nombre} ($${p.precio.toLocaleString("es-MX")} MXN). ¿Tienen disponibilidad?`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex-shrink-0 flex items-center gap-3 px-4 py-2 border transition-all duration-200 group ${
                p.destacado
                  ? "border-dorado/60 bg-dorado/10 hover:bg-dorado/20"
                  : "border-white/10 hover:border-white/25"
              }`}
            >
              <div className="min-w-0">
                <p className={`text-[9px] tracking-[1.5px] uppercase font-dm font-medium leading-none mb-0.5 ${p.destacado ? "text-dorado" : "text-crema/50"}`}>
                  {p.destacado ? "★ " : ""}{p.nombre.replace("Paquete ", "")}
                </p>
                <p className={`font-cormorant leading-none ${p.destacado ? "text-dorado" : "text-crema/70"}`} style={{ fontSize: "15px" }}>
                  ${p.precio.toLocaleString("es-MX")}
                  <span className="font-dm text-[8px] text-crema/25 ml-1">MXN</span>
                </p>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
                className={`w-3.5 h-3.5 flex-shrink-0 group-hover:text-verde-vivo transition-colors ${p.destacado ? "text-dorado/50" : "text-crema/20"}`}
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.532 5.86L.054 23.447a.75.75 0 0 0 .916.99l5.764-1.511A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.693 9.693 0 0 1-4.953-1.357l-.355-.211-3.68.965.981-3.585-.232-.369A9.712 9.712 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
              </svg>
            </a>
          ))}
          <button
            onClick={() => gridRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="flex-shrink-0 ml-auto text-[9px] tracking-[1.5px] uppercase font-dm text-crema/25 hover:text-crema/55 transition-colors whitespace-nowrap px-2 py-2"
          >
            ↑ Ver paquetes
          </button>
        </div>
      </div>
    </>
  );
}
