"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Moon, MapPin, Star, CreditCard } from "lucide-react";
import { TourCollage } from "@/components/TourCollage";
import { PatronDestinos } from "@/components/PatronDestinos";
import { PaqueteFormCta } from "@/components/PaqueteFormCta";
import { trackPackageInquiry } from "@/lib/analytics";
import { collagePaquete, precioVisible, type Paquete } from "@/lib/paquetes";
import { useLocale } from "@/lib/i18n/useLocale";
import { getPaquetesInteractivoUI } from "@/lib/i18n/paquetes.en";

export type { Paquete };



/**
 * `ancha` es la tarjeta que cierra la rejilla cuando los paquetes son impares.
 * Con cinco paquetes en dos columnas, el último se quedaba solo y dejaba media
 * fila vacía. Al ocupar el ancho completo, la foto pasa al lado y el contenido
 * a su derecha: la fila se ve terminada y no es una tarjeta estirada.
 */
function PaqueteCard({ p, ancha = false }: { p: Paquete; ancha?: boolean }) {
  const { locale, lp } = useLocale();
  const t = getPaquetesInteractivoUI(locale);
  // En la tarjeta ancha la foto va de pie y estrecha: con cuatro franjas cada
  // una queda en un sliver donde no se distingue el lugar. Se quedan dos.
  const fotos  = collagePaquete(p);
  const panels = (ancha ? fotos.slice(0, 2) : fotos).map((src) => ({ src }));

  return (
    <article
      /* Misma geometría que las tarjetas de /tours —esquinas redondeadas, mismo
         borde, mismo hover— pero con superficie de cristal en vez de negro
         plano: capa translúcida, desenfoque del fondo y un filo claro arriba,
         que es de donde se supone que viene la luz. */
      className={`relative rounded-xl border backdrop-blur-2xl transition-all duration-300 hover:border-verde-selva/60 ${
        ancha ? "flex flex-col lg:col-span-2 lg:grid lg:grid-cols-[minmax(0,40%)_1fr]" : "flex flex-col"
      } ${p.destacado ? "border-dorado/70" : "border-white/70"}`}
      /* Cristal CLARO, como el widget del clima del inicio: tinte muy
         transparente, desenfoque fuerte y un filo brillante arriba. Aquí el
         tinte es blanco y no negro, porque la franja es clara: el patrón de
         iconos se ve a través, desenfocado, que es justo el efecto. Con el
         fondo claro el texto pasa a oscuro; en crema no se leería nada. */
      style={{
        background: p.destacado
          ? "linear-gradient(180deg, rgba(255,255,255,.62), rgba(255,251,240,.44) 55%)"
          : "linear-gradient(180deg, rgba(255,255,255,.55), rgba(255,255,255,.38) 55%)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,.85), inset 0 -1px 0 rgba(255,255,255,.35), 0 22px 52px rgba(26,46,26,.18)",
      }}
    >
      {p.badge && (
        <div className="absolute top-3 right-3 z-20 rounded-full bg-dorado/90 backdrop-blur-sm text-negro text-[9px] font-dm font-bold tracking-[1.5px] uppercase px-3 py-1.5">
          {p.badge}
        </div>
      )}
      {/* Una foto por tour incluido, cortadas en diagonal: la misma pieza que
          usa /tours, así que el paquete se lee como la suma de sus tours. */}
      <div className={`relative flex-shrink-0 overflow-hidden ${
        ancha ? "h-48 rounded-t-xl lg:h-auto lg:rounded-l-xl lg:rounded-tr-none" : "h-48 rounded-t-xl"
      }`}>
        <TourCollage panels={panels} nombre={p.nombre} movil={2} />
        <div className="absolute inset-0 bg-gradient-to-t from-negro/85 via-negro/10 to-negro/35 pointer-events-none" />
        <span className="absolute bottom-3 left-3 z-10 rounded-full bg-negro/70 backdrop-blur-sm text-crema/85 text-[9px] font-dm tracking-[1px] px-2.5 py-1 flex items-center gap-1.5">
          <Moon className="w-3 h-3" aria-hidden="true" /> {p.duracion}
        </span>
      </div>

      <div className={`px-6 pt-5 pb-3 ${ancha ? "lg:col-start-2" : ""}`}>
        <h2 className="font-cormorant font-light text-negro leading-tight mb-1" style={{ fontSize: "clamp(20px,2.5vw,27px)" }}>
          {p.nombre}
        </h2>
        <p className="text-negro/70 font-dm text-xs mb-3">{p.subtitulo}</p>

        {/* Perfil chips — idea 1 */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {p.perfiles.map((chip) => (
            <span key={chip} className="rounded-full text-[9px] tracking-[0.5px] border border-verde-selva/40 bg-verde-selva/12 text-verde-selva px-2.5 py-1 font-dm font-medium">
              {chip}
            </span>
          ))}
        </div>

        {/* Precio y ahorro, sobre su propia placa de cristal: es el dato por el
            que la gente compara, y suelto entre listas se perdía.
            Se pinta `precioVisible(p)`, nunca `p.precio`: al lado de la
            etiqueta «por persona», `p.precio` —que es el total de la pareja—
            anunciaría el doble de lo que cuesta. */}
        <div
          className="rounded-xl border border-white/80 bg-white/45 backdrop-blur-md px-4 py-3 mb-4"
          style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,.14)" }}
        >
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-cormorant text-terracota" style={{ fontSize: "clamp(26px,3.5vw,36px)" }}>
              ${precioVisible(p).toLocaleString("es-MX")}
            </span>
            <span className="text-negro/65 font-dm text-[10px] ml-1">MXN {p.precioLabel}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 rounded-lg border border-dorado/60 bg-dorado/15 backdrop-blur-sm px-3 py-2 mb-5">
          <span className="w-1.5 h-1.5 bg-dorado rounded-full animate-pulse flex-shrink-0" />
          <p className="text-[10px] font-dm text-negro/80 font-medium">{p.urgencia}</p>
        </div>

        {p.tours.length > 0 && (
          <div className="mb-4">
            <p className="text-[9px] tracking-[2px] uppercase text-negro/60 font-dm mb-2 flex items-center gap-1.5">
              <MapPin className="w-3 h-3" /> {t.toursIncluidos}
            </p>
            <ul className="space-y-1.5">
              {p.tours.map((t) => (
                <li key={t} className="flex items-start gap-2 text-[11px] text-negro/80 font-dm">
                  <Star className="w-3 h-3 text-terracota flex-shrink-0 mt-0.5" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mb-5">
          <p className="text-[9px] tracking-[2px] uppercase text-negro/60 font-dm mb-2">{t.queIncluye}</p>
          <ul className="space-y-1.5">
            {p.incluye.map((item) => (
              <li key={item} className="flex items-start gap-2 text-[11px] text-negro/80 font-dm">
                <Check className="w-3 h-3 text-verde-selva flex-shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>

      </div>

      <div className={`px-6 pb-6 ${ancha ? "lg:col-start-2" : "mt-auto"}`}>
        <Link
          href={lp(`/paquetes/${p.slug}`)}
          className="flex items-center justify-center gap-2 w-full mb-3 py-3 rounded text-[10px] tracking-[2px] uppercase font-dm border border-verde-selva/60 text-verde-selva hover:border-verde-selva hover:bg-verde-selva/10 active:scale-[0.98] transition-[color,background-color,border-color,transform] duration-200 ease-out"
        >
          {t.verDiaPorDia}
        </Link>
        <PaqueteFormCta packageName={p.nombre} price={p.precio} destacado={p.destacado} slug={p.slug} />
        <p className="text-center text-[9px] text-negro/60 font-dm mt-3">
          {t.reservaFlexible}
        </p>
      </div>
    </article>
  );
}

// ── Main ─────────────────────────────────────────────────────────

export function PaquetesInteractivo({ paquetes }: { paquetes: Paquete[] }) {
  const { locale, lp } = useLocale();
  const t = getPaquetesInteractivoUI(locale);
  const [showSticky, setShowSticky] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);


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

  return (
    <>
      {/* ── GRID ──
          Única franja clara del sitio, por decisión de Manolo: el catálogo de
          paquetes se despega del resto y las tarjetas oscuras flotan encima.
          Los bordes llevan una línea para que el corte con las secciones
          oscuras de arriba y abajo se lea como intencionado. */}
      <section className="relative overflow-hidden py-16 border-y border-negro/10" ref={gridRef} style={{ background: "linear-gradient(180deg, #f6f1e2, #e9dfc6)" }}>
        {/* Iconos de lo que se visita, esparcidos detrás de las tarjetas. */}
        <PatronDestinos />
        <div className="relative max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-5">
          {paquetes.map((p, i) => (
            <PaqueteCard
              key={p.id}
              p={p}
              // Sólo el último, y sólo si se queda solo en su fila.
              ancha={paquetes.length % 2 === 1 && i === paquetes.length - 1}
            />
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
            {t.reservarLabel}
          </span>
          {/* Mandaba los tres paquetes a WhatsApp aunque el checkout en línea ya
              existe: era el único camino de esta página que no cerraba la venta
              sin que alguien contestara un chat. La ficha individual ya lo hacía
              bien (`PaqueteFormCta`), esta barra se había quedado atrás. */}
          {paquetes.map((p) => (
            <Link
              key={p.id}
              href={lp(`/reservar-paquete/${p.slug}`)}
              onClick={() => trackPackageInquiry(p.nombre, p.precio)}
              className={`flex-shrink-0 flex items-center gap-3 px-4 py-2 border transition-all duration-200 group ${
                p.destacado
                  ? "border-dorado/60 bg-dorado/10 hover:bg-dorado/20"
                  : "border-white/10 hover:border-white/25"
              }`}
            >
              <div className="min-w-0">
                <p className={`text-[9px] tracking-[1.5px] uppercase font-dm font-medium leading-none mb-0.5 ${p.destacado ? "text-dorado" : "text-crema/50"}`}>
                  {p.destacado ? "★ " : ""}{p.nombre.replace(/^Paquete |\s*Package$/g, "")}
                </p>
                <p className={`font-cormorant leading-none ${p.destacado ? "text-dorado" : "text-crema/70"}`} style={{ fontSize: "15px" }}>
                  {/* El mismo importe que la tarjeta (`precioVisible`) y su
                      etiqueta: con `p.precio` la barra decía $12.500 mientras
                      la tarjeta de arriba decía $6.250 por persona. */}
                  ${precioVisible(p).toLocaleString("es-MX")}
                  <span className="font-dm text-[8px] text-crema/25 ml-1">MXN {p.precioLabel}</span>
                </p>
              </div>
              <CreditCard
                className={`w-3.5 h-3.5 flex-shrink-0 group-hover:text-verde-vivo transition-colors ${p.destacado ? "text-dorado/50" : "text-crema/20"}`}
                aria-hidden="true"
              />
            </Link>
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
