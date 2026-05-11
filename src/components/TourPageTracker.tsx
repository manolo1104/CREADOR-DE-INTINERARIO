"use client";

import { useEffect } from "react";
import { trackViewTour } from "@/lib/analytics";

interface Props {
  tourId:   string;
  nombre:   string;
  precio:   number;
  tipo:     string;
}

export function TourPageTracker({ tourId, nombre, precio, tipo }: Props) {
  useEffect(() => {
    trackViewTour({ id: tourId, nombre, precio, tipo });
  }, [tourId, nombre, precio, tipo]);

  return null;
}
