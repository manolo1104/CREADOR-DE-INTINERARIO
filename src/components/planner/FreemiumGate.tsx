"use client";

import { useState } from "react";
import type { PreviewItinerary, WizardInputs } from "@/lib/generatePreviewItinerary";

interface Props {
  preview: PreviewItinerary;
  wizardState: WizardInputs;
  onContinueFree: () => void;
}

const TABLE_ROWS = [
  { label: "Vista previa del itinerario",       free: true,  premium: true },
  { label: "Destinos por día",                  free: true,  premium: true },
  { label: "Costo estimado por día",            free: true,  premium: true },
  { label: "Itinerario generado por IA",        free: false, premium: true },
  { label: "Horarios exactos de apertura",      free: false, premium: true },
  { label: "Cómo llegar a cada destino",        free: false, premium: true },
  { label: "Tips de insider por destino",       free: false, premium: true },
  { label: 'El "momento mágico" de cada lugar', free: false, premium: true },
  { label: "Qué llevar (lista personalizada)",  free: false, premium: true },
  { label: "Descargable en PDF",                free: false, premium: true },
  { label: "Itinerario ajustado a tu perfil",   free: false, premium: true },
];

export function FreemiumGate({ preview, wizardState, onContinueFree }: Props) {
  const [email, setEmail]       = useState("");
  const [paying, setPaying]     = useState(false);
  const [payStatus, setPayStatus] = useState("");

  async function handlePay() {
    if (!email) {
      setPayStatus("⚠️ Ingresa tu correo electrónico");
      return;
    }
    setPaying(true);
    setPayStatus("Preparando pago...");

    if (typeof window !== "undefined") {
      sessionStorage.setItem("huasteca_wizard_state", JSON.stringify(wizardState));
    }

    try {
      const res = await fetch("/api/cobrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monto: 99,
          descripcion: `Itinerario IA — Huasteca Potosina ${wizardState.dias} días`,
          email_cliente: email,
          producto: "itinerario",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = data.url;
    } catch (err: unknown) {
      setPayStatus(`⚠️ ${err instanceof Error ? err.message : "Error al procesar pago"}`);
      setPaying(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: "#0e1710" }}>

      {/* ── A: HEADER ─────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-verde-profundo via-verde-bosque to-[#1a3a10] px-10 py-16 text-center border-b border-verde-selva/20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-radial from-verde-selva/10 to-transparent" />
        <div className="relative">
          <div className="inline-block border border-verde-selva/30 bg-verde-selva/15 text-lima text-[10px] tracking-[4px] uppercase px-5 py-2 mb-6">
            ✦ Tu Itinerario Está Casi Listo ✦
          </div>
          <h1
            className="font-cormorant font-light text-crema mb-3"
            style={{ fontSize: "clamp(32px,5vw,54px)" }}
          >
            Tu itinerario está <em className="text-dorado">casi listo</em>
          </h1>
          <p className="text-crema/50 text-sm max-w-md mx-auto">
            Basado en tus preferencias, esto es lo que te espera en la Huasteca
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">

        {/* ── B: PREVIEW GRATUITO ───────────────────────────────── */}
        <div className="mb-14">
          <p className="text-[10px] tracking-[3px] uppercase text-crema/40 mb-6">
            Vista previa gratuita · {preview.diasCubiertos} días · {preview.destinosUsados} destinos
          </p>

          <div className="space-y-4">
            {preview.dias.map((dia) => (
              <div key={dia.dia} className="border border-white/8 bg-white/2 p-6">

                {/* Day header */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h3 className="font-cormorant text-crema text-xl">{dia.titulo}</h3>
                  <span className="text-[10px] tracking-[2px] uppercase text-dorado border border-dorado/30 px-2 py-1 flex-shrink-0">
                    ~${dia.costoEstimadoMXN.toLocaleString()} MXN
                  </span>
                </div>

                {/* Destinos */}
                <div className="space-y-2 mb-4">
                  {dia.destinos.map((d) => (
                    <div key={d.id} className="flex items-center gap-3">
                      <span className="text-lg">{d.emoji}</span>
                      <div>
                        <span className="text-sm text-crema">{d.nombre}</span>
                        <span className="text-[10px] text-crema/40 ml-2">{d.zona}</span>
                        <span className="text-[10px] text-crema/30 ml-2">· {d.duracion_hrs}h</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Activity pills */}
                {dia.actividades.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-5">
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

                {/* Locked fields */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { label: "Horario exacto",  content: dia.destinos[0]?.horario ?? "08:00–18:00" },
                    { label: "Cómo llegar",     content: dia.destinos[0]?.como_llegar ?? "Desde Ciudad Valles..." },
                    { label: "Tip de insider",  content: dia.nota },
                  ].map((item) => (
                    <div key={item.label} className="relative overflow-hidden border border-white/6 bg-white/2 p-3 rounded">
                      <p className="text-[9px] tracking-[2px] uppercase text-crema/30 mb-1">{item.label}</p>
                      <p className="blur-sm select-none text-[11px] text-crema/60 leading-relaxed pointer-events-none">
                        {item.content}
                      </p>
                      <div className="absolute inset-0 flex items-center justify-center bg-negro/50">
                        <div className="flex items-center gap-1.5">
                          <svg className="w-3 h-3 text-crema/50" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span className="text-[9px] text-crema/50 tracking-wide">Disponible en versión premium</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Budget summary */}
          <div
            className={`mt-4 border p-4 flex items-center justify-between flex-wrap gap-4 ${
              preview.dentroDePresupuesto
                ? "border-verde-selva/30 bg-verde-selva/6"
                : "border-terracota/30 bg-terracota/6"
            }`}
          >
            <div>
              <p className="text-[10px] tracking-[2px] uppercase text-crema/40">Estimado total del viaje</p>
              <p className="font-cormorant text-crema text-2xl">
                ${preview.totalEstimadoMXN.toLocaleString()} MXN
              </p>
              <p className="text-[10px] text-crema/30 mt-0.5">Incluye entradas + comida + transporte estimado</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] tracking-[2px] uppercase text-crema/40">Tu presupuesto ({preview.diasCubiertos} días)</p>
              <p
                className="font-cormorant text-2xl"
                style={{ color: preview.dentroDePresupuesto ? "#a3d977" : "#e07a5f" }}
              >
                ${preview.presupuestoUsuario.toLocaleString()} MXN
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: preview.dentroDePresupuesto ? "#a3d977" : "#e07a5f" }}>
                {preview.dentroDePresupuesto ? "✓ Dentro del presupuesto" : "⚠ Presupuesto ajustado"}
              </p>
            </div>
          </div>
        </div>

        {/* ── C: TABLA COMPARATIVA ─────────────────────────────── */}
        <div className="mb-14">
          <p className="text-[10px] tracking-[3px] uppercase text-crema/40 mb-6">
            ¿Qué incluye cada versión?
          </p>

          {/* Desktop */}
          <div className="hidden sm:block overflow-hidden border border-white/8">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-white/8">
                  <th className="text-left py-4 px-5 w-1/2" />
                  <th className="py-4 px-5 text-[10px] tracking-[2px] uppercase text-crema/40 text-center">
                    Gratis
                  </th>
                  <th className="py-4 px-5 text-[10px] tracking-[2px] uppercase text-agua text-center bg-agua/6 border-l border-agua/20">
                    Premium ✦
                  </th>
                </tr>
              </thead>
              <tbody>
                {TABLE_ROWS.map((row) => (
                  <tr key={row.label} className="border-b border-white/4 last:border-0">
                    <td className="py-3 px-5 text-sm text-crema/70">{row.label}</td>
                    <td className="py-3 px-5 text-center">
                      {row.free
                        ? <span className="text-verde-vivo text-base">✓</span>
                        : <span className="text-crema/15 text-base">✗</span>
                      }
                    </td>
                    <td className="py-3 px-5 text-center bg-agua/4 border-l border-agua/15">
                      <span className="text-agua text-base">✓</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile stacked */}
          <div className="sm:hidden space-y-3">
            <div className="border border-white/8 bg-white/2 p-5">
              <p className="text-[10px] tracking-[3px] uppercase text-crema/40 mb-4">Gratis</p>
              {TABLE_ROWS.filter((r) => r.free).map((r) => (
                <div key={r.label} className="flex items-center gap-2.5 py-1.5">
                  <span className="text-verde-vivo text-sm">✓</span>
                  <span className="text-sm text-crema/70">{r.label}</span>
                </div>
              ))}
            </div>
            <div className="border border-agua/40 bg-agua/6 p-5">
              <p className="text-[10px] tracking-[3px] uppercase text-agua mb-4">Premium ✦</p>
              {TABLE_ROWS.map((r) => (
                <div key={r.label} className="flex items-center gap-2.5 py-1.5">
                  <span className="text-agua text-sm">✓</span>
                  <span className="text-sm text-crema/70">{r.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── D: CTA DE PAGO ────────────────────────────────────── */}
        <div className="border border-agua/30 bg-agua/6 p-8 text-center mb-8">
          <div
            className="font-cormorant text-crema mb-1"
            style={{ fontSize: "clamp(28px,4vw,44px)" }}
          >
            <em className="text-agua">$99 MXN</em>
            <span className="text-crema/35 text-xl ml-3">— un solo pago</span>
          </div>
          <p className="text-crema/40 text-xs mb-7">
            Itinerario completo generado por IA, personalizado para tu perfil y presupuesto
          </p>

          <input
            type="email"
            placeholder="Tu correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full max-w-sm mx-auto block bg-white/4 border border-white/10 text-crema px-4 py-3 text-sm outline-none focus:border-agua placeholder:text-crema/20 mb-4"
          />

          <button
            onClick={handlePay}
            disabled={paying}
            className="bg-agua text-negro px-14 py-4 text-[11px] tracking-[4px] uppercase font-medium hover:opacity-90 transition-opacity disabled:opacity-50 w-full max-w-sm"
          >
            {paying ? "Procesando..." : "Generar mi itinerario completo →"}
          </button>

          {payStatus && (
            <p className="mt-3 text-xs text-crema/60 border-l-2 border-agua pl-3 text-left max-w-sm mx-auto">
              {payStatus}
            </p>
          )}

          <p className="mt-5 text-[10px] text-crema/25 tracking-wide">
            Pago seguro · Sin suscripción · Listo en 30 segundos
          </p>
        </div>

        {/* ── E: OPCIÓN GRATUITA ────────────────────────────────── */}
        <div className="text-center">
          <button
            onClick={onContinueFree}
            className="text-crema/35 text-xs hover:text-crema/60 transition-colors underline underline-offset-4"
          >
            Continuar con la vista previa gratuita →
          </button>
        </div>
      </div>
    </div>
  );
}
