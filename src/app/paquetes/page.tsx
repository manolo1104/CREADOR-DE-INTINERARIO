import { Metadata } from "next";
import Image from "next/image";
import { Star, TreePine, UtensilsCrossed, MapPin } from "lucide-react";
import { PaquetesInteractivo } from "@/components/PaquetesInteractivo";
import { FloatingLeaves } from "@/components/FloatingLeaves";
import { PAQUETES_DB, RESENAS_PAQUETES, FAQS_PAQUETES } from "@/lib/paquetes";

const SITE = "https://www.huasteca-potosina.com";

export const metadata: Metadata = {
  title: "Paquetes Todo Incluido — Tours + Hotel Paraíso Encantado Xilitla | Huasteca Potosina",
  description:
    "Paquetes que combinan nuestros tours guiados con hospedaje en Hotel Paraíso Encantado Xilitla. Todo incluido: transporte local, desayunos, entradas y guías certificados.",
  openGraph: {
    title: "Paquetes Todo Incluido — Huasteca Potosina",
    description: "Tours + Hotel Paraíso Encantado Xilitla. 3, 4 o 5 días todo coordinado.",
    url: `${SITE}/paquetes`,
    siteName: "Tours Huasteca Potosina",
    locale: "es_MX",
    type: "website",
    images: [{ url: `${SITE}/og-image.jpg`, width: 1200, height: 630, alt: "Paquetes Huasteca Potosina" }],
  },
};

export default function PaquetesPage() {
  return (
    <main id="main-content" className="min-h-screen bg-negro">

      {/* ── HERO ── */}
      <section className="relative px-6 pt-36 pb-28 overflow-hidden min-h-[520px] flex items-center">
        <Image
          src="/imagenes/cascada-de-tamul/hero.jpg"
          alt="Cascada de Tamul — Huasteca Potosina"
          fill
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-negro/70 via-negro/55 to-negro/85" />
        <div className="relative z-10 max-w-4xl mx-auto text-center w-full">
          <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-4 font-dm">
            ✦ Tours + Hospedaje · Todo Coordinado
          </p>
          <h1 className="reveal-up font-cormorant font-light text-crema mb-5 leading-tight" style={{ fontSize: "clamp(38px,6vw,70px)" }}>
            Paquetes
            <em className="shimmer-gold block italic"> Todo Incluido</em>
          </h1>
          <p className="reveal-up text-crema/75 font-dm text-sm leading-relaxed max-w-2xl mx-auto mb-8" style={{ animationDelay: "80ms" }}>
            Combinamos nuestros tours guiados con hospedaje en{" "}
            <strong className="text-crema">Hotel Paraíso Encantado Xilitla</strong>.
            Tú solo preocúpate por llegar — nosotros nos encargamos del resto.
          </p>
          <div className="inline-flex items-center gap-3 bg-negro/60 backdrop-blur-sm border border-white/15 px-5 py-3">
            <div>
              <div className="flex items-center gap-1 mb-0.5">
                {"★★★★★".split("").map((s, i) => (
                  <span key={i} className="text-dorado text-sm">{s}</span>
                ))}
              </div>
              <p className="text-[9px] font-dm text-crema/50 text-left">Google Reviews</p>
            </div>
            <div className="border-l border-white/15 pl-3">
              <p className="font-cormorant text-dorado text-2xl leading-none">4.9</p>
              <p className="text-[9px] font-dm text-crema/50">+320 reseñas</p>
            </div>
            <div className="border-l border-white/15 pl-3">
              <p className="font-cormorant text-dorado text-2xl leading-none">4.8</p>
              <p className="text-[9px] font-dm text-crema/50">Booking · 180 op.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── RESEÑAS ── */}
      <section className="relative border-b border-white/6 bg-negro/80 py-12 px-6 overflow-hidden">
        <FloatingLeaves count={12} />
        <div className="relative z-10 max-w-5xl mx-auto">
          <p className="text-[10px] tracking-[4px] uppercase text-crema/30 font-dm text-center mb-8">
            Lo que dicen quienes ya vivieron la experiencia
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {RESENAS_PAQUETES.map((r) => (
              <div key={r.nombre} className="border border-white/8 bg-negro/50 p-5">
                <div className="flex gap-0.5 mb-3">
                  {[...Array(r.estrellas)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-dorado text-dorado" />
                  ))}
                </div>
                <p className="font-dm text-xs text-crema/70 leading-relaxed italic mb-4">
                  &ldquo;{r.texto}&rdquo;
                </p>
                <div className="flex items-center gap-3">
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

      {/* ── NOTA ── */}
      <div className="border-b border-white/6 bg-dorado/8">
        <div className="max-w-5xl mx-auto px-6 py-3.5 text-center">
          <p className="text-[11px] text-dorado/80 font-dm">
            Reserva por WhatsApp y te confirmamos disponibilidad del hotel en menos de 1 hora. Sin pago anticipado.
          </p>
        </div>
      </div>

      {/* ── QUIZ + PAQUETES + STICKY BAR ── */}
      <PaquetesInteractivo paquetes={PAQUETES_DB} />

      {/* ── HOTEL INFO ── */}
      <section className="relative bg-verde-profundo/30 border-t border-white/6 py-16 px-6 overflow-hidden">
        <FloatingLeaves count={14} />
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-3 font-dm">El hotel de los paquetes</p>
          <h2 className="reveal-up font-cormorant font-light text-crema mb-4 leading-tight" style={{ fontSize: "clamp(26px,4vw,44px)" }}>
            Hotel Paraíso Encantado <em className="shimmer-gold">Xilitla</em>
          </h2>
          <p className="text-crema/55 font-dm text-sm leading-relaxed max-w-2xl mx-auto mb-10">
            Ubicado a minutos del Jardín Surrealista de Edward James en Xilitla, Pueblo Mágico.
            Habitaciones con vista a la selva, desayunos con platillos típicos y la mejor base
            para explorar la Huasteca Potosina.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {[
              { Icon: TreePine,        text: "Vista a la selva tropical" },
              { Icon: UtensilsCrossed, text: "Desayunos con platillos típicos" },
              { Icon: MapPin,          text: "5 min del Jardín de Edward James" },
            ].map(({ Icon, text }) => (
              <div key={text} className="border border-white/10 bg-negro/30 px-4 py-4 text-center">
                <Icon className="w-6 h-6 text-verde-vivo mx-auto mb-2" aria-hidden="true" />
                <p className="text-[11px] text-crema/60 font-dm">{text}</p>
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
      <section className="relative bg-verde-profundo/40 border-t border-white/6 py-16 px-6 text-center overflow-hidden">
        <FloatingLeaves count={14} />
        <div className="relative z-10">
          <h2 className="font-cormorant text-crema text-2xl mb-3">¿No encuentras el paquete ideal?</h2>
          <p className="text-crema/50 font-dm text-sm mb-8 max-w-md mx-auto">
            Armamos el itinerario exacto que necesitas. Escríbenos y en menos de 1 hora tienes tu propuesta.
          </p>
          <a
            href={`https://wa.me/524891251458?text=${encodeURIComponent("Hola, quisiera un paquete personalizado de tours + hotel en la Huasteca Potosina. ¿Me pueden ayudar?")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 bg-[#25D366] hover:bg-[#20ba59] text-white px-10 py-4 text-[11px] tracking-[2px] uppercase font-dm transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 flex-shrink-0" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.532 5.86L.054 23.447a.75.75 0 0 0 .916.99l5.764-1.511A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.693 9.693 0 0 1-4.953-1.357l-.355-.211-3.68.965.981-3.585-.232-.369A9.712 9.712 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/></svg>
            Armar paquete personalizado →
          </a>
        </div>
      </section>

    </main>
  );
}
