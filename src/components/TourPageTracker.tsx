"use client";

import { useEffect } from "react";
import { trackViewTour } from "@/lib/analytics";
import { trackTourEvent } from "@/lib/tourTracker";

interface Props {
  tourId:   string;
  nombre:   string;
  precio:   number;
  tipo:     string;
}

export function TourPageTracker({ tourId, nombre, precio, tipo }: Props) {
  useEffect(() => {
    // GA4
    trackViewTour({ id: tourId, nombre, precio, tipo });
    // Railway log
    trackTourEvent("TOUR_PAGE_VIEW", { tour: tourId, tour_name: nombre, precio, tipo });
  }, [tourId, nombre, precio, tipo]);

  return null;
}
