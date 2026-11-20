"use client";

import { trackTourEvent } from "@/lib/tourTracker";

/**
 * Un enlace (interno o a WhatsApp) que reporta su evento antes de irse.
 * Los de WhatsApp los cuenta además `WhatsAppClickTracker` como WHATSAPP_CLICK:
 * son dos eventos distintos (la intención y el canal), no uno doble.
 */
export function EnlaceMedido({
  href,
  event,
  data,
  className,
  externo = false,
  children,
}: {
  href: string;
  event: string;
  data?: Record<string, unknown>;
  className?: string;
  externo?: boolean;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className={className}
      onClick={() => trackTourEvent(event, data)}
      {...(externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
}
