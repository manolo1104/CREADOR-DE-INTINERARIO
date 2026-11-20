import { Sparkles, UserCheck, FileText, MessagesSquare, BadgeCheck, Flag, XCircle, MessageCircle, type LucideIcon } from "lucide-react";
import { etiquetaEtapa, normalizarEtapa } from "@/lib/admin/crm";
import { codigoDeTour, colorDeTour, nombreDeTour } from "@/lib/admin/coloresTour";
import { preguntaAntesDePedir, type ResenaLead } from "@/lib/admin/resenaLead";
import { fechaCorta, fmx } from "./comun";

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
  confirmado:  { color: "#1B4332", fondo: "#D9EDE1", icono: BadgeCheck },
  operado:     { color: "#4F5B55", fondo: "#ECEFED", icono: Flag },
  perdido:     { color: "#B42318", fondo: "#FBE9E7", icono: XCircle },
};

/**
 * El estilo de una etapa. La clave vieja «anticipo» (Anticipo pagado, que se
 * unió a Confirmado el 19 nov 2026) se ve como Confirmado, también en los
 * renglones viejos del historial; antes caía en el estilo de Nuevo.
 */
export const estiloEtapa = (e: string) => ESTILO_ETAPA[normalizarEtapa(e)] ?? ESTILO_ETAPA.nuevo;

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

/**
 * Los tours como badges de color con su acrónimo (TAM, MEC, SUR…), el mismo de
 * todo el panel: se reconocen de un vistazo (Manolo, 4 nov 2026: «siempre badges
 * con colores y el acrónimo»). El nombre completo sale al pasar el cursor.
 */
export function BadgesTour({ slugs, nombres, vacio = "—", grande }: { slugs: string[]; nombres?: Record<string, string>; vacio?: string; grande?: boolean }) {
  const lista = Array.from(new Set(slugs.filter(Boolean)));
  if (!lista.length) return <span className="text-[12px] font-dm text-[var(--panel-tinta-suave)]">{vacio}</span>;
  return (
    <span className="inline-flex flex-wrap gap-1">
      {lista.map(t => (
        <span key={t} title={nombres?.[t] ?? nombreDeTour(t)} className={`rounded px-1.5 py-0.5 font-dm font-bold ${grande ? "text-[12.5px]" : "text-[10.5px]"}`} style={{ color: colorDeTour(t), background: colorDeTour(t) + "1f" }}>{codigoDeTour(t)}</span>
      ))}
    </span>
  );
}

const CERRADAS = ["operado", "perdido"];

/**
 * Lo que se pregunta antes de mover un lead a mano (para `window.confirm`), o
 * null si se mueve directo (19 nov 2026). Lo usan el tablero, la ficha y la
 * Bandeja, para que pregunten lo mismo:
 *  · a Operado con el viaje todavía por delante (hoy o después) o con saldo
 *    por cobrar: Operado es «ya viajó», y uno movido antes de tiempo puede
 *    regresar solo con un pago nuevo;
 *  · sacar de Operado o de Perdido (reabrirlo).
 * A Perdido no: su cuadro del motivo ya es la pregunta.
 */
export function avisoAntesDeMover(l: { nombre: string; etapa: string; ultimoDia?: string | null; saldo?: number | null }, hacia: string, hoy: string): string | null {
  if (hacia === l.etapa || hacia === "perdido") return null;
  if (hacia === "operado") {
    const partes: string[] = [];
    if (l.ultimoDia && l.ultimoDia >= hoy) partes.push(`El viaje de ${l.nombre} todavía no pasa (${l.ultimoDia === hoy ? "es hoy" : fechaCorta(l.ultimoDia)}).`);
    if ((l.saldo ?? 0) > 0) partes.push(`Todavía falta cobrarle ${fmx(l.saldo as number)}.`);
    return partes.length ? `${partes.join(" ")}\n\n¿Pasarlo a Operado de todos modos?` : null;
  }
  if (CERRADAS.includes(l.etapa)) return `${l.nombre} está en ${etiquetaEtapa(l.etapa)}. ¿Reabrirlo en ${etiquetaEtapa(hacia)}?`;
  return null;
}

/**
 * Anota en las reservas del viaje que se le pidió la reseña por WhatsApp, con
 * la ruta de siempre (la del botón de Reseñas). Devuelve si se anotó en todas.
 */
export async function anotarResenaPedida(reservaIds: string[]): Promise<boolean> {
  const oks = await Promise.all(reservaIds.map(id =>
    fetch(`/api/admin/reservas/${encodeURIComponent(id)}/resena-whatsapp`, { method: "POST", keepalive: true }).then(r => r.ok).catch(() => false)));
  return oks.length > 0 && oks.every(Boolean);
}

/**
 * «Pedir reseña por WhatsApp» (19 nov 2026, Manolo: «integra un acceso rápido
 * para mandar pedir reseña a wpp»). Es un enlace a wa.me con el mensaje listo,
 * no `window.open`: en el celular abre la app sin que el navegador lo bloquee.
 * Al tocarlo se anota la petición (`onPedida` recibe si se pudo anotar). Si ya
 * se pidió por WhatsApp, pregunta antes. 🔴 Un clic = un mensaje: nunca se
 * manda en lote. `antes` deja que la tarjeta lo cancele justo tras un arrastre.
 */
export function BotonPedirResena({ resena, className, texto = "Pedir reseña por WhatsApp", onPedida, antes }: {
  resena: ResenaLead; className: string; texto?: string; onPedida: (anotada: Promise<boolean>) => void; antes?: (e: React.MouseEvent) => void;
}) {
  if (!resena.waUrl) return null;
  return (
    <a href={resena.waUrl} target="_blank" rel="noopener noreferrer" className={className}
      title={`Abre WhatsApp con el mensaje listo (${resena.idioma === "en" ? "en inglés" : "en español"}): revísalo y mándalo`}
      onKeyDown={e => e.stopPropagation()}
      onClick={e => {
        e.stopPropagation();
        antes?.(e);
        if (e.defaultPrevented) return;
        const pregunta = preguntaAntesDePedir(resena);
        if (pregunta && !window.confirm(pregunta)) { e.preventDefault(); return; }
        onPedida(anotarResenaPedida(resena.reservaIds));
      }}>
      <MessageCircle className="h-4 w-4 shrink-0" aria-hidden="true" />{texto}
    </a>
  );
}
