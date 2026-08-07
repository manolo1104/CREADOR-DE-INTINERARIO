"use client";

import Link from "next/link";
import { trackTourEvent } from "@/lib/tourTracker";

/**
 * Link que reporta su clic antes de navegar. Sirve para saber si un CTA
 * concreto funciona — por ejemplo, cuánta gente pasa de una página de destino
 * al tour que la incluye, que es el puente que hoy no existía.
 *
 * Se puede usar desde un server component: solo el link es cliente.
 */
export function TrackedLink({
  href,
  event,
  data,
  className,
  children,
}: {
  href: string;
  event: string;
  data?: Record<string, unknown>;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={className} onClick={() => trackTourEvent(event, data)}>
      {children}
    </Link>
  );
}
