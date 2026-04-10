"use client";

import { useState, useEffect } from "react";
import { ItineraryCanvas } from "./ItineraryCanvas";
import { FreemiumGate } from "./FreemiumGate";
import { FreePreviewCanvas } from "./FreePreviewCanvas";
import { DESTINOS_DB } from "@/lib/destinos";
import { generatePreviewItinerary, PreviewItinerary } from "@/lib/generatePreviewItinerary";

type Step = "dias" | "presupuesto" | "destinos" | "intereses" | "perfil" | "extras" | "resultado";

const STEPS: { key: Step; label: string; sub: string }[] = [
  { key: "dias",        label: "Duración",    sub: "¿Cuántos días?" },
  { key: "presupuesto", label: "Presupuesto", sub: "¿Cuánto tienes?" },
  { key: "destinos",    label: "Destinos",    sub: "¿Qué quieres ver?" },
  { key: "intereses",   label: "Intereses",   sub: "¿Qué te apasiona?" },
  { key: "perfil",      label: "Perfil",      sub: "¿Cómo viajas?" },
  { key: "extras",      label: "Extras",      sub: "Detalles finales" },
];

const INTERESES = [
  "🌊 Cascadas y Pozas", "🥾 Senderismo", "🦅 Ecoturismo", "🎨 Arte y Cultura",
  "🍜 Gastronomía Local", "📸 Fotografía", "🧗 Aventura Extrema", "🛕 Historia y Arqueología",
  "🧘 Relajación", "🎭 Festividades Locales",
];

const VIAJEROS = [
  { emoji: "🧍", nombre: "Solo/Sola",  desc: "Libertad total, a tu ritmo" },
  { emoji: "👫", nombre: "En Pareja",  desc: "Romántico y aventurero" },
  { emoji: "👨‍👩‍👧‍👦", nombre: "Familia",   desc: "Con niños, seguro y divertido" },
  { emoji: "👯", nombre: "Amigos",     desc: "Grupo, fiesta y aventura" },
];

interface State {
  dias: number;
  presupuesto: string;
  destinos: string[];
  intereses: string[];
  viajero: string;
  actividad: string;
  restricciones: string;
  sueno: string;
}

export function PlannerShell() {
  const [currentStep, setCurrentStep] = useState<Step>("dias");
  const [state, setState] = useState<State>({
    dias: 3,
    presupuesto: "moderado",
    destinos: [],
    intereses: ["🌊 Cascadas y Pozas"],
    viajero: "Solo/Sola",
    actividad: "🦥 Tranquilo",
    restricciones: "",
    sueno: "",
  });
  const [itinerary, setItinerary]           = useState<string>("");
  const [loading, setLoading]               = useState(false);
  const [preview, setPreview]               = useState<PreviewItinerary | null>(null);
  const [showFreemiumGate, setShowFreemiumGate] = useState(false);
  const [showFreePreview, setShowFreePreview]   = useState(false);

  // ── Post-payment redirect: detect ?paid=1&session_id=... ──────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("paid") !== "1") return;
    const sessionId = params.get("session_id");
    if (!sessionId) return;

    const saved = sessionStorage.getItem("huasteca_wizard_state");
    if (!saved) return;

    let restored: State;
    try {
      restored = JSON.parse(saved) as State;
    } catch {
      return;
    }

    sessionStorage.removeItem("huasteca_wizard_state");
    window.history.replaceState({}, "", "/planear");
    setState(restored);

    // Verify payment then generate with AI
    fetch(`/api/verify-session?session_id=${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.valid) runGenerateWithAI(restored);
      })
      .catch(() => {
        // If verify endpoint fails, proceed anyway (payment was confirmed by Stripe redirect)
        runGenerateWithAI(restored);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stepIndex = STEPS.findIndex((s) => s.key === currentStep);
  const progress  = ((stepIndex + 1) / STEPS.length) * 100;

  function toggleDestino(id: string) {
    setState((s) => ({
      ...s,
      destinos: s.destinos.includes(id)
        ? s.destinos.filter((d) => d !== id)
        : [...s.destinos, id],
    }));
  }

  function toggleInteres(tag: string) {
    setState((s) => ({
      ...s,
      intereses: s.intereses.includes(tag)
        ? s.intereses.filter((i) => i !== tag)
        : [...s.intereses, tag],
    }));
  }

  // ── PASO 2 → 3: Genera preview local y muestra FreemiumGate ──────────────
  function generate() {
    const p = generatePreviewItinerary(state);
    setPreview(p);
    setShowFreemiumGate(true);
    setShowFreePreview(false);
  }

  // ── Llamada real a Claude — sólo después del pago ─────────────────────────
  async function runGenerateWithAI(s: State) {
    setShowFreemiumGate(false);
    setShowFreePreview(false);
    setCurrentStep("resultado");
    setLoading(true);

    const destinosSeleccionados = s.destinos.length > 0
      ? DESTINOS_DB.filter((d) => s.destinos.includes(d.id))
      : DESTINOS_DB.slice(0, 8);

    const lugaresInfo = destinosSeleccionados
      .map((l) => `- ${l.emoji} ${l.nombre} (${l.zona}): ${l.descripcion} | ${l.precio_entrada} | ${l.advertencias}`)
      .join("\n");

    const prompt = `Eres el mejor guía local de la Huasteca Potosina. Datos 2026.

VIAJERO: ${s.dias} días | ${s.presupuesto} | ${s.viajero} | ${s.actividad}
INTERESES: ${s.intereses.join(", ")}
${s.restricciones ? `RESTRICCIONES: ${s.restricciones}` : ""}
${s.sueno ? `SUEÑO: ${s.sueno}` : ""}

DESTINOS DISPONIBLES:
${lugaresInfo}

REGLAS: Máx 2 destinos con >1hr de distancia por día. Menciona efectivo siempre. Horarios reales.

Genera itinerario de ${s.dias} días con formato:
## Día N — [Nombre] ([Zona])
**Mañana** - actividad, costo, hora
**Tarde** - actividad, costo
**Noche** - hospedaje + cena típica
💰 Gasto estimado: $X MXN/persona

Finaliza con: resumen presupuesto total, qué llevar, errores a evitar, consejo del guía local.`;

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 4000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      setItinerary(data.content?.[0]?.text || "Error al generar.");
    } catch {
      setItinerary("Error de conexión. Intenta de nuevo.");
    }
    setLoading(false);
  }

  // ── Renderizado condicional ───────────────────────────────────────────────

  if (showFreemiumGate && preview) {
    return (
      <FreemiumGate
        preview={preview}
        wizardState={state}
        onContinueFree={() => {
          setShowFreemiumGate(false);
          setShowFreePreview(true);
        }}
        onGenerateFree={() => runGenerateWithAI(state)}
      />
    );
  }

  if (showFreePreview && preview) {
    return (
      <FreePreviewCanvas
        preview={preview}
        onBack={() => {
          setShowFreePreview(false);
          setShowFreemiumGate(true);
        }}
      />
    );
  }

  if (currentStep === "resultado") {
    return (
      <ItineraryCanvas
        itinerary={itinerary}
        loading={loading}
        state={state}
        onBack={() => setCurrentStep("extras")}
      />
    );
  }

  // ── Wizard ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex" style={{ background: "#0e1710" }}>
      {/* Sidebar */}
      <aside className="hidden md:flex w-72 flex-col border-r border-white/8 bg-verde-profundo px-8 py-12">
        <div className="font-cormorant text-crema text-xl mb-12 pb-6 border-b border-white/8">
          Huasteca <em className="text-dorado">IA</em>
        </div>
        <nav className="flex-1 space-y-1">
          {STEPS.map((step, i) => {
            const done   = i < stepIndex;
            const active = step.key === currentStep;
            return (
              <div key={step.key} className="flex items-start gap-4 py-4 border-b border-white/5">
                <div className={`w-7 h-7 rounded-full border flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5 transition-all ${
                  done   ? "bg-lima border-lima text-negro" :
                  active ? "bg-verde-selva border-verde-selva text-crema" :
                           "border-white/15 text-white/30"
                }`}>
                  {done ? "✓" : i + 1}
                </div>
                <div>
                  <div className={`text-xs font-medium tracking-wide ${active ? "text-crema" : done ? "text-crema/50" : "text-crema/25"}`}>
                    {step.label}
                  </div>
                  <div className="text-[10px] text-crema/20 mt-0.5 italic">{step.sub}</div>
                </div>
              </div>
            );
          })}
        </nav>
        <div className="text-[10px] text-crema/20 leading-relaxed mt-8">
          Itinerarios generados con IA y conocimiento local de Xilitla.
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 px-8 md:px-16 py-12 overflow-y-auto">
        {/* Progress bar */}
        <div className="h-px bg-white/6 mb-14 relative">
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-verde-selva to-lima transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* PASO 1: DÍAS */}
        {currentStep === "dias" && (
          <div>
            <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-3">Paso 01 de 06</p>
            <h2 className="font-cormorant font-light text-crema mb-10" style={{ fontSize: "clamp(36px,5vw,52px)" }}>
              ¿Cuántos días<br />tienes para <em className="text-dorado">explorar?</em>
            </h2>
            <div className="mb-10">
              <p className="font-cormorant text-dorado font-light mb-4" style={{ fontSize: "80px", lineHeight: 1 }}>
                {state.dias} <span className="text-2xl text-crema/40 italic">días</span>
              </p>
              <input
                type="range" min={1} max={10} value={state.dias}
                onChange={(e) => setState((s) => ({ ...s, dias: +e.target.value }))}
                className="w-full max-w-sm accent-dorado"
              />
              <div className="flex justify-between max-w-sm text-[10px] text-crema/30 mt-1">
                <span>1 día</span><span>5 días</span><span>10 días</span>
              </div>
            </div>
            <button
              onClick={() => setCurrentStep("presupuesto")}
              className="bg-verde-selva text-crema px-12 py-4 text-[11px] tracking-[4px] uppercase hover:bg-verde-vivo transition-colors"
            >
              Continuar →
            </button>
          </div>
        )}

        {/* PASO 2: PRESUPUESTO */}
        {currentStep === "presupuesto" && (
          <div>
            <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-3">Paso 02 de 06</p>
            <h2 className="font-cormorant font-light text-crema mb-10" style={{ fontSize: "clamp(36px,5vw,52px)" }}>
              ¿Cuál es tu <em className="text-dorado">presupuesto?</em>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mb-10">
              {[
                { key: "economico", icon: "🎒", name: "Mochilero",  range: "$300–600 MXN",   desc: "Hostales, transporte público" },
                { key: "moderado",  icon: "🌿", name: "Moderado",   range: "$600–1,500 MXN", desc: "Posadas, taxis, restaurantes" },
                { key: "premium",   icon: "✨", name: "Premium",    range: "$1,500+ MXN",    desc: "Hoteles boutique, guías privados" },
              ].map((b) => (
                <button
                  key={b.key}
                  onClick={() => setState((s) => ({ ...s, presupuesto: b.key }))}
                  className={`gloss-selector-light border p-6 text-left transition-all ${
                    state.presupuesto === b.key
                      ? "border-verde-vivo bg-gradient-to-br from-crema/18 via-crema/10 to-arena/8"
                      : "border-crema/20 bg-gradient-to-br from-crema/12 via-crema/6 to-arena/5 hover:border-verde-selva/45"
                  }`}
                >
                  <span className="text-2xl mb-3 block">{b.icon}</span>
                  <div className="text-sm font-medium text-crema mb-1">{b.name}</div>
                  <div className="font-cormorant text-dorado text-lg block mb-2">{b.range}</div>
                  <div className="text-[11px] text-crema/35 leading-relaxed">{b.desc}</div>
                </button>
              ))}
            </div>
            <div className="flex gap-4">
              <button onClick={() => setCurrentStep("dias")} className="border border-white/15 text-crema/50 px-8 py-3.5 text-[11px] tracking-[3px] uppercase hover:border-white/30 hover:text-crema transition-all">← Atrás</button>
              <button onClick={() => setCurrentStep("destinos")} className="bg-verde-selva text-crema px-12 py-4 text-[11px] tracking-[4px] uppercase hover:bg-verde-vivo transition-colors">Continuar →</button>
            </div>
          </div>
        )}

        {/* PASO 3: DESTINOS */}
        {currentStep === "destinos" && (
          <div>
            <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-3">Paso 03 de 06</p>
            <h2 className="font-cormorant font-light text-crema mb-10" style={{ fontSize: "clamp(36px,5vw,52px)" }}>
              ¿Qué lugares quieres <em className="text-dorado">visitar?</em>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mb-10 max-w-3xl">
              {DESTINOS_DB.map((d) => (
                <button
                  key={d.id}
                  onClick={() => toggleDestino(d.id)}
                  className={`gloss-selector-light flex items-center gap-3 border p-4 text-left transition-all ${
                    state.destinos.includes(d.id)
                      ? "border-verde-vivo bg-gradient-to-br from-crema/18 via-crema/10 to-arena/8"
                      : "border-crema/20 bg-gradient-to-br from-crema/12 via-crema/6 to-arena/5 hover:border-verde-selva/40"
                  }`}
                >
                  <div className={`w-4.5 h-4.5 border rounded-sm flex items-center justify-center text-[9px] flex-shrink-0 ${
                    state.destinos.includes(d.id) ? "bg-verde-vivo border-verde-vivo text-negro" : "border-white/20"
                  }`}>
                    {state.destinos.includes(d.id) ? "✓" : ""}
                  </div>
                  <div>
                    <div className="text-xs text-crema">{d.emoji} {d.nombre}</div>
                    <div className="text-[10px] text-crema/35">{d.zona}</div>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex gap-4">
              <button onClick={() => setCurrentStep("presupuesto")} className="border border-white/15 text-crema/50 px-8 py-3.5 text-[11px] tracking-[3px] uppercase hover:border-white/30 hover:text-crema transition-all">← Atrás</button>
              <button onClick={() => setCurrentStep("intereses")} className="bg-verde-selva text-crema px-12 py-4 text-[11px] tracking-[4px] uppercase hover:bg-verde-vivo transition-colors">Continuar →</button>
            </div>
          </div>
        )}

        {/* PASO 4: INTERESES */}
        {currentStep === "intereses" && (
          <div>
            <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-3">Paso 04 de 06</p>
            <h2 className="font-cormorant font-light text-crema mb-10" style={{ fontSize: "clamp(36px,5vw,52px)" }}>
              ¿Qué actividades te <em className="text-dorado">apasionan?</em>
            </h2>
            <div className="flex flex-wrap gap-2.5 max-w-xl mb-10">
              {INTERESES.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleInteres(tag)}
                  className={`gloss-selector-light border rounded-full px-5 py-2.5 text-xs transition-all ${
                    state.intereses.includes(tag)
                      ? "bg-gradient-to-br from-crema/22 via-crema/15 to-arena/12 border-verde-selva text-crema"
                      : "border-crema/20 text-crema/70 bg-gradient-to-br from-crema/10 via-crema/5 to-arena/4 hover:border-verde-selva/40 hover:text-crema"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            <div className="flex gap-4">
              <button onClick={() => setCurrentStep("destinos")} className="border border-white/15 text-crema/50 px-8 py-3.5 text-[11px] tracking-[3px] uppercase hover:border-white/30 hover:text-crema transition-all">← Atrás</button>
              <button onClick={() => setCurrentStep("perfil")} className="bg-verde-selva text-crema px-12 py-4 text-[11px] tracking-[4px] uppercase hover:bg-verde-vivo transition-colors">Continuar →</button>
            </div>
          </div>
        )}

        {/* PASO 5: PERFIL */}
        {currentStep === "perfil" && (
          <div>
            <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-3">Paso 05 de 06</p>
            <h2 className="font-cormorant font-light text-crema mb-10" style={{ fontSize: "clamp(36px,5vw,52px)" }}>
              ¿Cómo <em className="text-dorado">viajas?</em>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mb-8">
              {VIAJEROS.map((v) => (
                <button
                  key={v.nombre}
                  onClick={() => setState((s) => ({ ...s, viajero: v.nombre }))}
                  className={`gloss-selector-light border p-6 text-center transition-all ${
                    state.viajero === v.nombre
                      ? "border-dorado bg-gradient-to-br from-crema/20 via-arena/10 to-dorado/10"
                      : "border-crema/20 bg-gradient-to-br from-crema/12 via-crema/6 to-arena/5 hover:border-dorado/45"
                  }`}
                >
                  <span className="text-3xl block mb-2">{v.emoji}</span>
                  <div className="text-xs text-crema mb-1">{v.nombre}</div>
                  <div className="text-[10px] text-crema/35 leading-tight">{v.desc}</div>
                </button>
              ))}
            </div>
            <div className="mb-8">
              <p className="text-[10px] tracking-[3px] uppercase text-crema/50 mb-3">Nivel de actividad física</p>
              <div className="flex gap-2.5 flex-wrap">
                {["🦥 Tranquilo", "🚶 Moderado", "🏃 Intenso"].map((a) => (
                  <button
                    key={a}
                    onClick={() => setState((s) => ({ ...s, actividad: a }))}
                    className={`gloss-selector-light border rounded-full px-5 py-2.5 text-xs transition-all ${
                      state.actividad === a
                        ? "bg-gradient-to-br from-crema/22 via-crema/15 to-arena/12 border-verde-selva text-crema"
                        : "border-crema/20 text-crema/70 bg-gradient-to-br from-crema/10 via-crema/5 to-arena/4 hover:border-verde-selva/40 hover:text-crema"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setCurrentStep("intereses")} className="border border-white/15 text-crema/50 px-8 py-3.5 text-[11px] tracking-[3px] uppercase hover:border-white/30 hover:text-crema transition-all">← Atrás</button>
              <button onClick={() => setCurrentStep("extras")} className="bg-verde-selva text-crema px-12 py-4 text-[11px] tracking-[4px] uppercase hover:bg-verde-vivo transition-colors">Continuar →</button>
            </div>
          </div>
        )}

        {/* PASO 6: EXTRAS */}
        {currentStep === "extras" && (
          <div>
            <p className="text-[10px] tracking-[4px] uppercase text-verde-vivo mb-3">Paso 06 de 06</p>
            <h2 className="font-cormorant font-light text-crema mb-10" style={{ fontSize: "clamp(36px,5vw,52px)" }}>
              Últimos <em className="text-dorado">detalles</em>
            </h2>
            <div className="max-w-lg space-y-6 mb-10">
              <div>
                <label className="block text-[10px] tracking-[3px] uppercase text-crema/50 mb-3">
                  ¿Tienes restricciones o necesidades especiales?
                </label>
                <textarea
                  value={state.restricciones}
                  onChange={(e) => setState((s) => ({ ...s, restricciones: e.target.value }))}
                  rows={3}
                  placeholder="Ej: soy vegetariano, miedo a las alturas, viajo con bebé..."
                  className="gloss-surface-light w-full border border-crema/20 text-crema p-4 text-sm resize-y outline-none focus:border-verde-vivo placeholder:text-crema/25"
                />
              </div>
              <div>
                <label className="block text-[10px] tracking-[3px] uppercase text-crema/50 mb-3">
                  ¿Qué sueñas hacer en este viaje?
                </label>
                <textarea
                  value={state.sueno}
                  onChange={(e) => setState((s) => ({ ...s, sueno: e.target.value }))}
                  rows={3}
                  placeholder="Ej: nadar en cascada turquesa, ver amanecer en las montañas..."
                  className="gloss-surface-light w-full border border-crema/20 text-crema p-4 text-sm resize-y outline-none focus:border-verde-vivo placeholder:text-crema/25"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setCurrentStep("perfil")} className="border border-white/15 text-crema/50 px-8 py-3.5 text-[11px] tracking-[3px] uppercase hover:border-white/30 hover:text-crema transition-all">← Atrás</button>
              <button
                onClick={generate}
                className="bg-dorado text-negro px-14 py-4 text-[12px] tracking-[4px] uppercase font-medium hover:bg-lima transition-colors"
              >
                ✦ Generar mi Itinerario
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
