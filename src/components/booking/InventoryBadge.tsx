"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackTourEvent } from "@/lib/tourTracker";

interface Props {
  tourId:   string;
  tourName: string;
  groupMax: number;
}

// Escasez REAL y verificable: los grupos son pequeños (máximo groupMax por salida).
// No inventa "lugares disponibles esta semana".
export function InventoryBadge({ tourId, tourName, groupMax }: Props) {
  const pathname = usePathname();
  const en = pathname === "/en" || pathname.startsWith("/en/");

  useEffect(() => {
    trackTourEvent("INVENTORY_BADGE_SHOWN", { tour: tourId, tour_name: tourName, group_max: groupMax });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourId]);

  return (
    <div className="flex items-center gap-2 px-3 py-2 text-[11px] font-dm font-medium bg-amber-500/12 border border-amber-500/25 text-amber-400">
      <span className="w-2 h-2 rounded-full flex-shrink-0 bg-amber-400" aria-hidden="true" />
      {en
        ? `Small group · max. ${groupMax} people per departure`
        : `Grupo pequeño · máximo ${groupMax} personas por salida`}
    </div>
  );
}
