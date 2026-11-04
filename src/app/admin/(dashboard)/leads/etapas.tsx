import { Sparkles, UserCheck, FileText, MessagesSquare, Wallet, BadgeCheck, Flag, XCircle, type LucideIcon } from "lucide-react";
import { etiquetaEtapa } from "@/lib/admin/crm";

/**
 * El color y el ícono de cada etapa (3 nov 2026, pedido de Manolo: «dale un
 * color e ícono a cada etapa»). Los usan la ficha, su historial y las
 * columnas de Leads, para que una etapa se reconozca igual en todos lados.
 */
export const ESTILO_ETAPA: Record<string, { color: string; fondo: string; icono: LucideIcon }> = {
  nuevo:       { color: "#3E6A9E", fondo: "#E8F0F9", icono: Sparkles },
  calificado:  { color: "#1E7A80", fondo: "#E2F3F3", icono: UserCheck },
  cotizado:    { color: "#A2650F", fondo: "#FBF0DC", icono: FileText },
  seguimiento: { color: "#6B4FA0", fondo: "#EFEAF8", icono: MessagesSquare },
  anticipo:    { color: "#2E7D4F", fondo: "#E3F3E8", icono: Wallet },
  confirmado:  { color: "#1B4332", fondo: "#D9EDE1", icono: BadgeCheck },
  operado:     { color: "#4F5B55", fondo: "#ECEFED", icono: Flag },
  perdido:     { color: "#B42318", fondo: "#FBE9E7", icono: XCircle },
};

export const estiloEtapa = (e: string) => ESTILO_ETAPA[e] ?? ESTILO_ETAPA.nuevo;

/** La etapa como chip: ícono, color y nombre. */
export function ChipEtapa({ etapa, texto, grande }: { etapa: string; texto?: string; grande?: boolean }) {
  const s = estiloEtapa(etapa);
  const Icono = s.icono;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-dm font-semibold ${grande ? "px-3 py-1.5 text-[13px]" : "px-2 py-0.5 text-[11.5px]"}`}
      style={{ color: s.color, background: s.fondo }}>
      <Icono className={grande ? "h-4 w-4" : "h-3.5 w-3.5"} aria-hidden="true" />{texto ?? etiquetaEtapa(etapa)}
    </span>
  );
}
