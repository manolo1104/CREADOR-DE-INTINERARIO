/**
 * DestinoIcon — renderiza el icono Lucide correcto a partir del campo `icon`
 * de un destino o tour (string con el nombre del componente Lucide).
 *
 * Uso:
 *   <DestinoIcon name={destino.icon} className="w-6 h-6 text-verde-selva" />
 */

import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MapPin } from "lucide-react"; // fallback

interface Props {
  name: string;
  className?: string;
}

export function DestinoIcon({ name, className = "w-5 h-5" }: Props) {
  const Icon = (LucideIcons as unknown as Record<string, LucideIcon>)[name];
  const Comp = Icon ?? MapPin;
  return <Comp className={className} aria-hidden="true" />;
}
