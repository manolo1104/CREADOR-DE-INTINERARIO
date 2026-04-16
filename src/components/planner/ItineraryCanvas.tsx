"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Loader2, Share2, Download } from "lucide-react";
import { extraerDestinosDelItinerario } from "@/lib/extraerDestinos";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const MapaItinerario = dynamic(() => import("./MapaItinerario"), {
  ssr: false,
  loading: () => (
    <div className="h-72 md:h-96 rounded-xl bg-white/4 flex items-center justify-center">
      <span className="text-crema/30 text-sm">Cargando mapa…</span>
    </div>
  ),
});

interface DayActivity {
  id: string;
  emoji: string;
  name: string;
  zone: string;
  time: string;
  cost: string;
}

interface ItineraryDay {
  day: number;
  title: string;
  activities: DayActivity[];
}

function SortableActivity({ activity }: { activity: DayActivity }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: activity.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 border p-3 bg-white/3 transition-all cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-50 border-verde-vivo/60 shadow-lg" : "border-white/8 hover:border-white/15"
      }`}
      {...attributes}
      {...listeners}
    >
      <span className="text-xl flex-shrink-0">{activity.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-crema font-medium truncate">{activity.name}</div>
        <div className="text-[10px] text-crema/40">{activity.zone} · {activity.time}</div>
      </div>
      <div className="text-[10px] text-dorado flex-shrink-0">{activity.cost}</div>
      <div className="text-crema/20 text-xs flex-shrink-0">⣿</div>
    </div>
  );
}

function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^## (.+)$/gm, '<h2 class="font-cormorant text-3xl text-crema mt-10 mb-4 pb-2 border-b border-white/10">$1</h2>')
    .replace(/^### (.+)$/gm, '<h3 class="font-cormorant text-xl text-dorado mt-6 mb-2">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-crema font-medium">$1</strong>')
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-2 border-verde-selva pl-4 py-2 bg-verde-selva/6 text-crema/70 italic my-4 text-sm">$1</blockquote>')
    .replace(/^- (.+)$/gm, '<li class="text-crema/70 text-sm mb-1.5 leading-relaxed">$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul class="pl-4 my-3">${m}</ul>`)
    .replace(/\n\n/g, '</p><p class="text-crema/70 text-sm leading-relaxed mb-3">')
    .replace(/^(?!<[h2h3ulblip])/gm, '<p class="text-crema/70 text-sm leading-relaxed mb-3">')
    .replace(/<p class[^>]+><\/p>/g, "");
}

interface Props {
  itinerary: string;
  loading: boolean;
  state: {
    dias: number;
    presupuesto: string;
    viajero: string;
  };
  onBack: () => void;
}

export function ItineraryCanvas({ itinerary, loading, state, onBack }: Props) {
  const [days, setDays] = useState<ItineraryDay[]>([]);
  const [activeDay, setActiveDay] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent, dayIndex: number) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      setDays((prev) => {
        const newDays = [...prev];
        const acts = newDays[dayIndex].activities;
        const oldIdx = acts.findIndex((a) => a.id === active.id);
        const newIdx = acts.findIndex((a) => a.id === over.id);
        newDays[dayIndex] = {
          ...newDays[dayIndex],
          activities: arrayMove(acts, oldIdx, newIdx),
        };
        return newDays;
      });
    },
    []
  );

  const presupuestoLabel = { economico: "Mochilero", moderado: "Moderado", premium: "Premium" }[state.presupuesto] ?? state.presupuesto;
  const destinosEnMapa = loading ? [] : extraerDestinosDelItinerario(itinerary);

  // Suppress unused variable warnings for DnD state that's wired up but not rendered yet
  void days;
  void activeDay;
  void setActiveDay;
  void handleDragEnd;
  void sensors;

  return (
    <div className="min-h-screen" style={{ background: "#0e1710" }}>
      {/* Hero */}
      <div className="bg-gradient-to-br from-verde-profundo via-verde-bosque to-[#1a3a10] px-10 py-16 text-center border-b border-verde-selva/20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-radial from-verde-selva/15 to-transparent" />
        <div className="relative">
          <div className="inline-block border border-verde-selva/30 bg-verde-selva/15 text-lima text-[10px] tracking-[4px] uppercase px-5 py-2 mb-6">
            ✦ Itinerario Personalizado ✦
          </div>
          <h1 className="font-cormorant font-light text-crema leading-tight mb-8"
              style={{ fontSize: "clamp(42px,7vw,72px)" }}>
            Tu Viaje a la<br /><em className="text-dorado">Huasteca</em>
          </h1>
          <div className="flex gap-10 justify-center flex-wrap">
            {[
              { val: state.dias, lbl: "Días" },
              { val: presupuestoLabel, lbl: "Presupuesto" },
              { val: state.viajero, lbl: "Perfil" },
            ].map((m) => (
              <div key={m.lbl} className="text-center">
                <span className="font-cormorant text-dorado font-light block leading-none"
                      style={{ fontSize: "32px" }}>
                  {m.val}
                </span>
                <span className="text-[9px] tracking-[3px] uppercase text-crema/40">{m.lbl}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-14">
        {loading ? (
          <div className="text-center py-24">
            <Loader2 className="w-12 h-12 mb-6 animate-spin text-verde-selva inline-block" />
            <p className="font-cormorant text-crema text-3xl mb-3">Diseñando tu aventura...</p>
            <p className="text-crema/40 text-sm">La IA está organizando tu itinerario perfecto</p>
          </div>
        ) : (
          <div
            className="prose-custom"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(itinerary) }}
          />
        )}

        {destinosEnMapa.length > 0 && (
          <div className="mt-10 mb-4">
            <p className="text-[10px] tracking-[3px] uppercase text-crema/40 font-dm mb-4">
              Ruta de tu itinerario
            </p>
            <MapaItinerario destinosDelDia={destinosEnMapa} />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-4 justify-center flex-wrap px-6 pb-16 border-t border-white/6 pt-8">
        <button
          onClick={onBack}
          className="border border-white/15 text-crema/60 px-8 py-3.5 text-[11px] tracking-[3px] uppercase hover:border-white/30 hover:text-crema transition-all"
        >
          ← Crear otro
        </button>
        <button
          onClick={() => {
            navigator.clipboard.writeText(itinerary).then(() => alert("Copiado al portapapeles")).catch(() => {});
          }}
          className="inline-flex items-center gap-2 border border-white/15 text-crema/60 px-8 py-3.5 text-[11px] tracking-[3px] uppercase hover:border-white/30 hover:text-crema transition-all"
        >
          <Share2 className="w-3.5 h-3.5" aria-hidden="true" />
          Compartir
        </button>
        {!loading && (
          <button
            onClick={() => {
              const blob = new Blob([itinerary], { type: "text/plain;charset=utf-8" });
              const url  = URL.createObjectURL(blob);
              const a    = document.createElement("a");
              a.href     = url;
              a.download = "itinerario-huasteca.txt";
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="inline-flex items-center gap-2 bg-dorado text-negro px-8 py-3.5 text-[11px] tracking-[3px] uppercase font-medium hover:bg-lima transition-colors"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            Descargar
          </button>
        )}
      </div>
    </div>
  );
}
