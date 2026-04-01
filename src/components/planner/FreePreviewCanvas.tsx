"use client";

import type { PreviewItinerary } from "@/lib/generatePreviewItinerary";

interface Props {
  preview: PreviewItinerary;
  onBack: () => void;
}

export function FreePreviewCanvas({ preview, onBack }: Props) {
  return (
    <div className="min-h-screen" style={{ background: "#0e1710" }}>

      {/* Hero */}
      <div className="bg-gradient-to-br from-verde-profundo via-verde-bosque to-[#1a3a10] px-10 py-16 text-center border-b border-verde-selva/20">
        <div className="inline-block border border-white/10 bg-white/5 text-crema/50 text-[10px] tracking-[4px] uppercase px-5 py-2 mb-6">
          Vista Previa Gratuita
        </div>
        <h1
          className="font-cormorant font-light text-crema mb-3"
          style={{ fontSize: "clamp(32px,5vw,54px)" }}
        >
          Tu borrador de itinerario
        </h1>
        <p className="text-crema/40 text-sm max-w-md mx-auto">
          Esta es una vista previa generada algorítmicamente. El itinerario completo con IA incluye horarios exactos, cómo llegar y consejos personalizados.
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="space-y-6 mb-12">
          {preview.dias.map((dia) => (
            <div key={dia.dia} className="border border-white/8 bg-white/2 p-6">
              <div className="flex items-center justify-between gap-4 mb-5">
                <h3 className="font-cormorant text-crema text-2xl">{dia.titulo}</h3>
                <span className="text-[10px] tracking-[2px] uppercase text-dorado border border-dorado/30 px-2 py-1 flex-shrink-0">
                  ~${dia.costoEstimadoMXN.toLocaleString()} MXN
                </span>
              </div>

              <div className="space-y-3 mb-5">
                {dia.destinos.map((d) => (
                  <div key={d.id} className="flex items-start gap-3 border-b border-white/5 pb-3 last:border-0 last:pb-0">
                    <span className="text-2xl mt-0.5">{d.emoji}</span>
                    <div>
                      <p className="text-sm text-crema font-medium">{d.nombre}</p>
                      <p className="text-[10px] text-crema/40 mt-0.5">{d.zona} · {d.duracion_hrs}h · {d.precio_entrada}</p>
                      <p className="text-xs text-crema/50 mt-1 leading-relaxed">{d.descripcion}</p>
                    </div>
                  </div>
                ))}
              </div>

              {dia.actividades.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {Array.from(new Set(dia.actividades)).map((a) => (
                    <span
                      key={a}
                      className="text-[9px] tracking-[1px] uppercase border border-verde-selva/30 text-verde-vivo bg-verde-selva/8 px-2.5 py-1"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              )}

              <div className="border-l-2 border-dorado/30 bg-dorado/5 pl-3 py-2">
                <p className="text-[9px] tracking-[2px] uppercase text-dorado/60 mb-0.5">Consejo del día</p>
                <p className="text-xs text-crema/60">{dia.nota}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Budget */}
        <div
          className={`border p-5 mb-10 flex items-center justify-between flex-wrap gap-4 ${
            preview.dentroDePresupuesto
              ? "border-verde-selva/30 bg-verde-selva/6"
              : "border-terracota/30 bg-terracota/6"
          }`}
        >
          <div>
            <p className="text-[10px] tracking-[2px] uppercase text-crema/40">Estimado total</p>
            <p className="font-cormorant text-crema text-2xl">${preview.totalEstimadoMXN.toLocaleString()} MXN</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] tracking-[2px] uppercase text-crema/40">Tu presupuesto</p>
            <p
              className="font-cormorant text-2xl"
              style={{ color: preview.dentroDePresupuesto ? "#a3d977" : "#e07a5f" }}
            >
              ${preview.presupuestoUsuario.toLocaleString()} MXN
            </p>
          </div>
        </div>

        {/* Upsell CTA */}
        <div className="border border-agua/30 bg-agua/6 p-6 text-center mb-8">
          <p className="font-cormorant text-crema text-xl mb-2">
            ¿Quieres el itinerario <em className="text-agua">completo con IA?</em>
          </p>
          <p className="text-crema/40 text-xs mb-5">
            Horarios exactos, cómo llegar, tips de insider y lista personalizada de qué llevar
          </p>
          <button
            onClick={onBack}
            className="bg-agua text-negro px-12 py-3.5 text-[11px] tracking-[4px] uppercase font-medium hover:opacity-90 transition-opacity"
          >
            Ver opciones — $99 MXN →
          </button>
        </div>

        <div className="text-center">
          <button
            onClick={onBack}
            className="text-crema/30 text-xs hover:text-crema/50 transition-colors"
          >
            ← Volver al planificador
          </button>
        </div>
      </div>
    </div>
  );
}
