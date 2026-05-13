"use client";

import { useEffect } from "react";
import { trackTourEvent } from "@/lib/tourTracker";

/** Pseudo-deterministic spots: changes weekly, consistent for same tourId+week */
function spotsThisWeek(tourId: string): number {
  const weekNum = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  const seed    = tourId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const hash    = ((seed * 2654435761 + weekNum * 1234567) >>> 0) % 1000;
  return (hash % 6) + 2; // 2–7 spots
}

interface Props {
  tourId:   string;
  tourName: string;
}

export function InventoryBadge({ tourId, tourName }: Props) {
  const spots = spotsThisWeek(tourId);
  const isLow = spots <= 3;

  useEffect(() => {
    trackTourEvent("INVENTORY_BADGE_SHOWN", { tour: tourId, tour_name: tourName, spots_left: spots });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourId]);

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 text-[11px] font-dm font-medium ${
        isLow
          ? "bg-red-500/12 border border-red-500/25 text-red-400"
          : "bg-amber-500/12 border border-amber-500/25 text-amber-400"
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full flex-shrink-0 ${
          isLow ? "bg-red-500 animate-pulse" : "bg-amber-400"
        }`}
        aria-hidden="true"
      />
      {isLow
        ? `Solo ${spots} lugares disponibles esta semana`
        : `${spots} cupos disponibles · Alta demanda`}
    </div>
  );
}
