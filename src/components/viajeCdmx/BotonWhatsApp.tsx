"use client";

import type { ReactNode } from "react";
import { medir } from "./medicion";

/** Un enlace a WhatsApp que se mide una sola vez (`data-wa-manual` lo saca del contador global). */
export function BotonWhatsApp({ href, boton, className, children }: { href: string; boton: string; className?: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" data-wa-manual="1" onClick={() => medir("click_whatsapp", { boton })} className={className}>
      {children}
    </a>
  );
}
