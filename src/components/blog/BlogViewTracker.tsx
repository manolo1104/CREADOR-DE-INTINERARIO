"use client";

import { useEffect } from "react";
import { trackTourEvent } from "@/lib/tourTracker";

/**
 * Cuenta una lectura del artículo (`BLOG_VIEW`) para «Lo más leído» del inicio
 * (ver `lib/blogMasLeidos.ts`).
 *
 * Una por artículo y por sesión del navegador: recargar la página o volver
 * atrás no suma otra. Va por `trackTourEvent`, así que el evento llega también
 * a GA4 y a Clarity con el mismo nombre, y `/api/track` lo guarda con el
 * `path`, que es lo que se cuenta.
 */
export function BlogViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    try {
      const clave = `hp_blog_view_${slug}`;
      if (sessionStorage.getItem(clave)) return;
      sessionStorage.setItem(clave, "1");
    } catch {
      /* sin sessionStorage (modo privado estricto) se cuenta igual */
    }
    trackTourEvent("BLOG_VIEW", { slug });
  }, [slug]);
  return null;
}
