import { PaginaProxima } from "@/components/admin/ui/PaginaProxima";
export const metadata = { title: "Bandeja — Admin" };
export default function BandejaPage() {
  return (
    <PaginaProxima titulo="Bandeja" subtitulo="Las conversaciones de WhatsApp, dentro del panel" fase="Fase 2 (CRM y WhatsApp)"
      queTendra={["lista de chats con los sin leer primero", "la conversación", "la ficha del lead", "respuestas rápidas del manual de ventas", "cotización y link de anticipo sin salir del chat"]}
      mientras={{ href: "/admin/cotizaciones", etiqueta: "Mientras: Cotizaciones" }} />
  );
}
